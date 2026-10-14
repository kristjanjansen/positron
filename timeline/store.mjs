// A backend only has to be cursor-shaped: rows.length, and rows[k] with a non-decreasing key.
// open() is async, every later read sync; ensure(from, to) prefetches the scheduler's horizon.
// A miss fires late with a drift record (default; 'stall', 'skip' opt in), via flagged ghost rows.
// why: lessons/timeline-store.md#header

import { createCursor } from './transport.mjs';

export const DEFAULT_PAGE_ROWS = 4096;
export const DEFAULT_MAX_PAGES = 8;
export const MISS_POLICIES = ['late', 'skip', 'stall'];

const isGhost = (r) => !!(r && r.__ghost);
export { isGhost };

// LRU of page index to rows. The ensured window is pinned, or cold-bisect repairs evict it.
// why: lessons/timeline-store.md#lru
function lru(max) {
  const m = new Map();
  let pinned = new Set();
  return {
    get max() { return max; },
    size: () => m.size,
    keys: () => [...m.keys()],
    has: (k) => m.has(k),
    pin(keys) { pinned = new Set(keys); },
    pinned: () => [...pinned],
    get(k) {
      if (!m.has(k)) return undefined;
      const v = m.get(k); m.delete(k); m.set(k, v);   // touch
      return v;
    },
    peek: (k) => m.get(k),
    /** returns the evicted keys */
    set(k, v) {
      if (m.has(k)) m.delete(k);
      m.set(k, v);
      const out = [];
      while (m.size > max) {
        let victim;
        for (const kk of m.keys()) if (!pinned.has(kk)) { victim = kk; break; }
        if (victim === undefined) break;              // everything pinned: grow, and say so
        m.delete(victim); out.push(victim);
      }
      return out;
    },
    clear() { m.clear(); pinned = new Set(); },
    rows() { let n = 0; for (const v of m.values()) n += v.length; return n; },
  };
}

/** first index i in [0,n) with probe(i) > pos, by bisection. */
function upperBound(n, probe, pos) {
  let lo = 0, hi = n;
  while (lo < hi) { const m = (lo + hi) >> 1; if (probe(m) <= pos) lo = m + 1; else hi = m; }
  return lo;
}

// One paged reader, three sources. A source supplies {name, pageRows, total(), pageCount(),
// pageMeta(p), loadPage(p), warm(), close()}.
// why: lessons/timeline-store.md#paged-reader
function createPagedReader(source, {
  key = (r) => r.at,
  maxPages = DEFAULT_MAX_PAGES,
  missPolicy = 'late',
  onMiss = null,
  missLimit = 4096,
  maxRepairs = 2,
} = {}) {
  if (!MISS_POLICIES.includes(missPolicy)) throw new Error(`missPolicy must be one of ${MISS_POLICIES}`);
  const pageRows = source.pageRows;
  const pages = lru(maxPages);
  const inflight = new Map();          // p -> Promise
  const tail = [];                     // live appends, always resident, never evicted; why: lessons/timeline-store.md#tail
  const missCbs = new Set();
  const missLog = [];
  const st = {
    reads: 0, hits: 0, tailHits: 0, misses: 0, ghosts: 0,
    loads: 0, requests: 0, bytes: 0, evictions: 0,
    ensures: 0, ensureFast: 0, appends: 0, cursorResets: 0,
  };
  let indexed = source.total();
  let cursor = null;
  let closed = false;

  const count = () => indexed + tail.length;

  function noteMiss(i, p, pos) {
    st.misses++;
    const rec = {
      i, page: p, pos: pos === undefined ? null : pos,
      policy: missPolicy,
      action: missPolicy === 'late' ? 'fire-late' : missPolicy === 'skip' ? 'gap' : 'stall',
      origin: 'store-miss', source: source.name, atUs: Math.round(nowMs() * 1000),
    };
    missLog.push(rec);
    if (missLog.length > missLimit) missLog.splice(0, missLog.length - missLimit);
    for (const cb of missCbs) cb(rec);
    if (onMiss) onMiss(rec);
    return rec;
  }
  const nowMs = () => (typeof performance === 'object' && performance.now
    ? performance.timeOrigin + performance.now() : Date.now());

  /** the synthetic row a miss returns: monotone key inside the page's bounds. */
  function ghost(i, p) {
    st.ghosts++;
    const meta = source.pageMeta(p);
    let k;
    if (!meta) k = NaN;
    else if (meta.n <= 1) k = meta.firstAt;
    else {
      const j = i - meta.i0;
      k = meta.firstAt + (meta.lastAt - meta.firstAt) * (j / (meta.n - 1));
    }
    return { __ghost: true, __page: p, __i: i, at: k, kind: '__ghost', payload: null };
  }

  function pageOf(i) { return (i / pageRows) | 0; }

  function loadPage(p) {
    let f = inflight.get(p);
    if (f) return f;
    st.loads++;
    f = Promise.resolve(source.loadPage(p)).then((rows) => {
      inflight.delete(p);
      if (closed) return rows;
      st.requests += source.lastRequests || 1;
      st.bytes += source.lastBytes || 0;
      const evicted = pages.set(p, rows);
      st.evictions += evicted.length;
      return rows;
    }, (e) => { inflight.delete(p); throw e; });
    inflight.set(p, f);
    return f;
  }

  /** SYNC. Always returns a row (real or ghost). Never throws, never awaits. */
  function at(i) {
    st.reads++;
    if (i >= indexed) { st.tailHits++; return tail[i - indexed]; }
    if (i < 0) return undefined;
    const p = pageOf(i);
    const pg = pages.get(p);
    if (pg !== undefined) { st.hits++; return pg[i - p * pageRows]; }
    noteMiss(i, p);
    // At most two background repairs; the rest is ensure()'s job.
    // why: lessons/timeline-store.md#repairs
    if (inflight.size < maxRepairs) loadPage(p).catch(() => {});
    return ghost(i, p);
  }

  /** SYNC. [from, to). Ghosts included and flagged under 'late'/'stall';
   *  OMITTED under 'skip', where the return carries .gaps = [[i0,i1], …]. */
  function slice(from, to) {
    const out = [];
    const gaps = [];
    let run = null;
    for (let i = Math.max(0, from); i < Math.min(count(), to); i++) {
      const r = at(i);
      if (isGhost(r) && missPolicy === 'skip') {
        if (run && run[1] === i) run[1] = i + 1; else gaps.push(run = [i, i + 1]);
        continue;
      }
      out.push(r);
    }
    out.gaps = gaps;
    return out;
  }

  // The cursor view: a Proxy that is `{length, [k]}`, so createCursor rides an unbounded log.
  // why: lessons/timeline-store.md#rows-view
  const rows = new Proxy(Object.create(null), {
    get(t, k) {
      if (k === 'length') return count();
      if (typeof k === 'symbol') return t[k];
      const i = +k;
      return i === i ? at(i) : t[k];     // (i === i) is the NaN test
    },
    has(t, k) {
      if (k === 'length') return true;
      const i = +k;
      return i === i ? i >= 0 && i < count() : k in t;
    },
    getOwnPropertyDescriptor(t, k) {
      if (k === 'length') return { value: count(), writable: false, enumerable: false, configurable: true };
      const i = +k;
      if (i === i && i >= 0 && i < count()) return { value: at(i), writable: false, enumerable: true, configurable: true };
      return undefined;
    },
    ownKeys() { const n = count(), ks = []; for (let i = 0; i < n; i++) ks.push(String(i)); ks.push('length'); return ks; },
  });

  function cur() {
    if (!cursor) cursor = createCursor(rows, { key });
    return cursor;
  }

  // Sync straddling pair plus {cold, ghosts}: a cold read degrades and says so.
  // why: lessons/timeline-store.md#bracket-at
  function bracketAt(pos, nbr = 0) {
    const br = cur().bracket(pos, nbr);
    if (!br) return null;
    const ghosts = [br.a, br.b, ...br.prevs, ...br.nexts].filter(isGhost).length;
    return { ...br, cold: ghosts > 0, ghosts, page: pageOf(br.i) };
  }

  // Prefetch by window: reader.ensure(pos, pos + horizonMs * rate) -> {fast, pages, loaded};
  // `fast` means already resident, nothing awaited.
  // why: lessons/timeline-store.md#window
  function pagesForWindow(fromPos, toPos) {
    const n = source.pageCount();
    if (!n) return [];
    const meta = (p) => source.pageMeta(p);
    // first page whose lastAt >= fromPos
    let lo = upperBound(n, (p) => { const m = meta(p); return m ? m.lastAt : Infinity; }, fromPos);
    let hi = upperBound(n, (p) => { const m = meta(p); return m ? m.firstAt : Infinity; }, toPos);
    lo = Math.max(0, Math.min(n - 1, lo));
    hi = Math.max(lo, Math.min(n - 1, hi));
    const out = [];
    for (let p = lo; p <= hi && out.length < maxPages; p++) out.push(p);
    return out;
  }

  function residentFor(fromPos, toPos) {
    const want = pagesForWindow(fromPos, toPos);
    return want.length > 0 && want.every((p) => pages.has(p));
  }

  async function ensure(fromPos, toPos) {
    st.ensures++;
    if (!source.warmed) await source.warm();
    const want = pagesForWindow(fromPos, toPos);
    const clipped = pagesForWindow(fromPos, toPos).length < 1;
    pages.pin(want);                       // the window survives background repairs
    const missing = want.filter((p) => !pages.has(p));
    if (!missing.length) { st.ensureFast++; return { fast: true, pages: want, loaded: [], clipped }; }
    await Promise.all(missing.map(loadPage));
    pages.pin(want);
    // re-touch in window order so the LRU keeps the *window*, not the load order
    for (const p of want) pages.get(p);
    return { fast: false, pages: want, loaded: missing, clipped };
  }

  /** ensure by ROW INDEX (what a prefix/backfill read wants). */
  async function ensureIndex(fromI, toI) {
    if (!source.warmed) await source.warm();
    const want = [];
    for (let p = pageOf(Math.max(0, fromI)); p <= pageOf(Math.min(indexed - 1, toI)) && want.length < maxPages; p++) want.push(p);
    pages.pin(want);
    const missing = want.filter((p) => !pages.has(p));
    if (!missing.length) return { fast: true, pages: want, loaded: [] };
    await Promise.all(missing.map(loadPage));
    pages.pin(want);
    for (const p of want) pages.get(p);
    return { fast: false, pages: want, loaded: missing };
  }

  // Appends go to `tail` at indices past the indexed rows, so a cursor stays valid. An out-of-order
  // row is inserted in place, and a cursor at or past it is reset and the reset reported.
  // why: lessons/timeline-store.md#append
  function appendBatch(batch) {
    const res = { appended: 0, rejected: 0, reordered: 0, cursorReset: false, count: count() };
    if (!batch || !batch.length) return res;
    for (const r of batch) {
      const k = key(r);
      if (!Number.isFinite(k)) { res.rejected++; continue; }
      const lastTail = tail.length ? key(tail[tail.length - 1]) : -Infinity;
      if (k >= lastTail) { tail.push(r); res.appended++; continue; }
      // out of order inside the tail: insert sorted, report
      let lo = 0, hi = tail.length;
      while (lo < hi) { const m = (lo + hi) >> 1; if (key(tail[m]) <= k) lo = m + 1; else hi = m; }
      tail.splice(lo, 0, r);
      res.appended++; res.reordered++;
      const absIdx = indexed + lo;
      if (cursor && cursor.stats().i >= absIdx) { cursor.reset(); st.cursorResets++; res.cursorReset = true; }
    }
    st.appends += res.appended;
    res.count = count();
    return res;
  }

  return {
    kind: source.name,
    get count() { return count(); },
    get indexedCount() { return indexed; },
    get tailCount() { return tail.length; },
    get pageRows() { return pageRows; },
    get missPolicy() { return missPolicy; },
    rows,                                   // <- hand this to createCursor()
    cursor: cur,
    at, slice, bracketAt,
    ensure, ensureIndex, residentFor, pagesForWindow,
    appendBatch,
    onMiss(cb) { missCbs.add(cb); return () => missCbs.delete(cb); },
    misses(from = 0) { return missLog.slice(from); },
    /** the resident set + the ceiling, reported rather than claimed. */
    resident() {
      return {
        pages: pages.keys().sort((a, b) => a - b),
        pinned: pages.pinned().sort((a, b) => a - b),
        pageRows, maxPages,
        rows: pages.rows(), tailRows: tail.length,
        ceilingRows: maxPages * pageRows,
        totalRows: count(),
        residentFraction: +(pages.rows() / Math.max(1, indexed)).toFixed(6),
      };
    },
    stats() {
      return {
        ...st,
        hitRate: st.reads ? +(1 - st.misses / st.reads).toFixed(6) : 1,
        cursor: cursor ? cursor.stats() : null,
        cmpPerBracket: cursor && st.bracketCalls ? null : undefined,
      };
    },
    // rows in the position domain the deck uses
    // why: lessons/timeline-store.md#index
    index() { return source.index ? source.index() : null; },
    meta() { return source.meta ? source.meta() : null; },
    close() { closed = true; pages.clear(); inflight.clear(); return source.close && source.close(); },
  };
}

// memoryStore: the array itself, no paging (no Proxy on the hot read); `reader.rows` is the same
// array, so appends are visible to a running deck.
// why: lessons/timeline-store.md#memory
export function memoryStore(rows = [], { key = (r) => r.at } = {}) {
  return {
    kind: 'memory',
    async open() { return openMemoryReader(rows, key); },
  };
}

function openMemoryReader(arr, key) {
  let cursor = null;
  const st = { reads: 0, hits: 0, misses: 0, ghosts: 0, loads: 0, requests: 0, bytes: 0,
               evictions: 0, ensures: 0, ensureFast: 0, appends: 0, cursorResets: 0, tailHits: 0 };
  const cur = () => (cursor || (cursor = createCursor(arr, { key })));
  return {
    kind: 'memory',
    get count() { return arr.length; },
    get indexedCount() { return arr.length; },
    get tailCount() { return 0; },
    get pageRows() { return Infinity; },
    missPolicy: 'none',
    rows: arr,                                   // the same array, by identity; why: lessons/timeline-store.md#identity
    cursor: cur,
    at(i) { st.reads++; st.hits++; return arr[i]; },
    slice(from, to) { const s = arr.slice(from, to); s.gaps = []; return s; },
    bracketAt(pos, nbr = 0) {
      const br = cur().bracket(pos, nbr);
      return br && { ...br, cold: false, ghosts: 0, page: 0 };
    },
    async ensure() { st.ensures++; st.ensureFast++; return { fast: true, pages: [0], loaded: [], clipped: false }; },
    async ensureIndex() { return { fast: true, pages: [0], loaded: [] }; },
    residentFor() { return true; },
    pagesForWindow() { return [0]; },
    appendBatch(batch) {
      const res = { appended: 0, rejected: 0, reordered: 0, cursorReset: false, count: arr.length };
      for (const r of batch || []) {
        const k = key(r);
        if (!Number.isFinite(k)) { res.rejected++; continue; }
        const last = arr.length ? key(arr[arr.length - 1]) : -Infinity;
        if (k >= last) { arr.push(r); res.appended++; continue; }
        let lo = 0, hi = arr.length;
        while (lo < hi) { const m = (lo + hi) >> 1; if (key(arr[m]) <= k) lo = m + 1; else hi = m; }
        arr.splice(lo, 0, r); res.appended++; res.reordered++;
        if (cursor && cursor.stats().i >= lo) { cursor.reset(); st.cursorResets++; res.cursorReset = true; }
      }
      st.appends += res.appended; res.count = arr.length;
      return res;
    },
    onMiss() { return () => {}; },
    misses() { return []; },
    resident() {
      return { pages: [0], pageRows: Infinity, maxPages: 1, rows: arr.length, tailRows: 0,
               ceilingRows: Infinity, totalRows: arr.length, residentFraction: 1 };
    },
    stats() { return { ...st, hitRate: 1, cursor: cursor ? cursor.stats() : null }; },
    index() { return null; },
    meta() { return { rows: arr.length }; },
    close() { cursor = null; },
  };
}

// jsonlStore: <name>.jsonl sorted by key, plus a <name>.idx.json sidecar with one entry per page
// ({i0, n, off, len, firstAt, lastAt}); pages read by HTTP Range or a positional fs read.
// why: lessons/timeline-store.md#jsonl

/** Build the sidecar. Streams the file once; never holds it in memory. */
export async function buildJsonlIndex(path, { pageRows = DEFAULT_PAGE_ROWS, key = (r) => r.at, out } = {}) {
  const fs = await import('node:fs');
  const readline = await import('node:readline');
  const pages = [];
  let i = 0, off = 0, cur = null, bytes = 0;
  const rl = readline.createInterface({ input: fs.createReadStream(path), crlfDelay: Infinity });
  for await (const line of rl) {
    const len = Buffer.byteLength(line, 'utf8') + 1;      // + '\n'
    if (!line.length) { off += len; continue; }
    const k = key(JSON.parse(line));
    if (!cur || cur.n >= pageRows) { cur = { i0: i, n: 0, off, len: 0, firstAt: k, lastAt: k }; pages.push(cur); }
    cur.n++; cur.len += len; cur.lastAt = k;
    i++; off += len; bytes += len;
  }
  const idx = { v: 1, key: 'at', rows: i, pageRows, bytes, pageCount: pages.length, pages };
  const target = out || `${path.replace(/\.jsonl$/, '')}.idx.json`;
  await (await import('node:fs/promises')).writeFile(target, JSON.stringify(idx));
  return { index: idx, path: target, indexBytes: Buffer.byteLength(JSON.stringify(idx)) };
}

export function jsonlStore({
  url, path, indexUrl, indexPath, index,
  pageRows, maxPages = DEFAULT_MAX_PAGES, key = (r) => r.at,
  missPolicy = 'late', onMiss, fetchImpl,
} = {}) {
  if (!url && !path) throw new Error('jsonlStore needs {url} or {path}');
  return {
    kind: 'jsonl',
    async open() {
      let idx = index;
      if (!idx) {
        const iu = indexUrl || (url ? url.replace(/\.jsonl$/, '') + '.idx.json' : null);
        const ip = indexPath || (path ? path.replace(/\.jsonl$/, '') + '.idx.json' : null);
        if (iu && url) {
          const f = fetchImpl || fetch;
          const r = await f(iu);
          if (!r.ok) throw new Error(`jsonlStore: index ${iu} -> ${r.status}`);
          idx = await r.json();
        } else {
          idx = JSON.parse(await (await import('node:fs/promises')).readFile(ip, 'utf8'));
        }
      }
      const pr = pageRows || idx.pageRows || DEFAULT_PAGE_ROWS;
      if (pr !== idx.pageRows) throw new Error(`jsonlStore: pageRows ${pr} != index pageRows ${idx.pageRows}`);

      // The sidecar is bound to the log's byte length and checked (at open, or by the first 206),
      // since
      // stale byte offsets would read garbage that parses.
      // why: lessons/timeline-store.md#stale-sidecar
      let fh = null, sizeChecked = false;
      if (path) {
        const fsp2 = await import('node:fs/promises');
        const stat = await fsp2.stat(path);
        if (idx.bytes && stat.size !== idx.bytes)
          throw new Error(`jsonlStore: STALE INDEX — log is ${stat.size} B, sidecar was built over ${idx.bytes} B. Rebuild with buildJsonlIndex().`);
        sizeChecked = true;
        fh = await fsp2.open(path, 'r');
      }

      const parse = (text) => {
        const rows = [];
        let s = 0;
        for (;;) {
          const e = text.indexOf('\n', s);
          const line = e < 0 ? text.slice(s) : text.slice(s, e);
          if (line.length) rows.push(JSON.parse(line));
          if (e < 0) break;
          s = e + 1;
        }
        return rows;
      };

      const src = {
        name: 'jsonl',
        pageRows: pr,
        warmed: true,
        lastRequests: 0, lastBytes: 0,
        total: () => idx.rows,
        pageCount: () => idx.pages.length,
        pageMeta: (p) => idx.pages[p] || null,
        index: () => ({ rows: idx.rows, pageRows: pr, pageCount: idx.pages.length, bytes: idx.bytes }),
        meta: () => idx,
        async warm() {},
        async loadPage(p) {
          const m = idx.pages[p];
          if (!m) return [];
          let text;
          if (fh) {
            const buf = Buffer.allocUnsafe(m.len);
            await fh.read(buf, 0, m.len, m.off);
            text = buf.toString('utf8');
          } else {
            const f = fetchImpl || fetch;
            const r = await f(url, { headers: { Range: `bytes=${m.off}-${m.off + m.len - 1}` } });
            if (!(r.status === 206 || r.status === 200)) throw new Error(`jsonlStore: page ${p} -> ${r.status}`);
            if (!sizeChecked) {
              sizeChecked = true;
              const cr = /\/(\d+)\s*$/.exec(r.headers.get('content-range') || '');
              if (cr && idx.bytes && +cr[1] !== idx.bytes)
                throw new Error(`jsonlStore: STALE INDEX — log is ${cr[1]} B, sidecar was built over ${idx.bytes} B. Rebuild with buildJsonlIndex().`);
            }
            text = await r.text();
          }
          src.lastRequests = 1; src.lastBytes = m.len;
          return parse(text);
        },
        close() { return fh && fh.close(); },
      };
      return createPagedReader(src, { key, maxPages, missPolicy, onMiss });
    },
  };
}

// doStore: read-only pages from the instrument session API (GET {base}/session/<id>?from=&limit=,
// `from` a row offset). Page bounds are probed with limit=1 per page and cached.
// why: lessons/timeline-store.md#do-store
export function doStore({
  base, session, token,
  pageRows = 2000, maxPages = DEFAULT_MAX_PAGES,
  key = (r) => r.at, missPolicy = 'late', onMiss, fetchImpl,
} = {}) {
  if (!base || !session) throw new Error('doStore needs {base, session}');
  const f = (...a) => (fetchImpl || fetch)(...a);
  const headers = token ? { 'x-session-token': token } : undefined;
  const get = async (from, limit) => {
    const r = await f(`${base}/session/${session}?from=${from}&limit=${limit}`, { headers });
    if (!r.ok) throw new Error(`doStore: /session/${session}?from=${from} -> ${r.status}`);
    return r.json();
  };
  return {
    kind: 'do',
    async open() {
      const probe = await get(0, 1);
      const total = probe.total;
      const pageCount = Math.max(1, Math.ceil(total / pageRows));
      const bounds = new Array(pageCount).fill(null);
      let requests = 1, bytes = 0, warmed = false;

      const src = {
        name: 'do',
        pageRows,
        get warmed() { return warmed; },
        lastRequests: 1, lastBytes: 0,
        total: () => total,
        pageCount: () => pageCount,
        pageMeta: (p) => bounds[p],
        index: () => ({ rows: total, pageRows, pageCount, probes: requests }),
        meta: () => ({ session: probe.session, lanes: probe.lanes, total }),
        // probe page boundaries, which the API does not serve
        // why: lessons/timeline-store.md#warm
        async warm() {
          if (warmed) return;
          const firsts = await Promise.all(
            Array.from({ length: pageCount }, (_, p) => get(p * pageRows, 1).then((j) => { requests++; return j.events[0] ? key(j.events[0]) : 0; })));
          const lastJ = await get(Math.max(0, total - 1), 1); requests++;
          const lastAt = lastJ.events[0] ? key(lastJ.events[0]) : 0;
          for (let p = 0; p < pageCount; p++) {
            const i0 = p * pageRows;
            const n = Math.min(pageRows, total - i0);
            bounds[p] = { i0, n, firstAt: firsts[p], lastAt: p + 1 < pageCount ? firsts[p + 1] : lastAt };
          }
          warmed = true;
        },
        async loadPage(p) {
          const j = await get(p * pageRows, pageRows);
          requests++; bytes += JSON.stringify(j).length;
          src.lastRequests = 1; src.lastBytes = JSON.stringify(j.events).length;
          return j.events;
        },
        close() {},
      };
      await src.warm();
      const reader = createPagedReader(src, { key, maxPages, missPolicy, onMiss });
      reader.session = probe.session;
      reader.lanes = probe.lanes;
      return reader;
    },
  };
}

// openStore({ kind: 'memory' | 'jsonl' | 'do', ... }): one line to change backend.
// why: lessons/timeline-store.md#open-store
export function openStore(spec = {}) {
  const k = spec.kind || (spec.rows ? 'memory' : spec.session ? 'do' : 'jsonl');
  if (k === 'memory') return memoryStore(spec.rows || [], spec).open();
  if (k === 'jsonl') return jsonlStore(spec).open();
  if (k === 'do') return doStore(spec).open();
  throw new Error(`openStore: unknown kind ${k}`);
}

// One per-kind lane over a reader. Cheap single-kind or resident; a multi-kind archive wants one
// reader per kind.
// why: lessons/timeline-store.md#store-lane
export function storeLane(reader, kind) {
  if (!kind) return reader.rows;
  let map = null, mapCount = -1;
  const build = () => {
    if (mapCount === reader.count) return map;
    map = [];
    for (let i = 0; i < reader.count; i++) { const r = reader.at(i); if (r && r.kind === kind) map.push(i); }
    mapCount = reader.count;
    return map;
  };
  return new Proxy(Object.create(null), {
    get(t, k) {
      if (k === 'length') return build().length;
      if (typeof k === 'symbol') return t[k];
      const i = +k;
      return i === i ? reader.at(build()[i]) : t[k];
    },
  });
}

// The horizon-to-ensure() pump, on the client's cadence and opt-in.
// why: lessons/timeline-store.md#drive
export function driveStore(reader, transport, { horizonMs = 100, leadFactor = 8, everyMs = 250 } = {}) {
  let live = true, busy = false;
  const pump = async () => {
    if (!live || busy) return;
    const rate = transport.rate || transport.targetRate || 1;
    const pos = transport.position();
    const to = pos + horizonMs * rate * leadFactor;
    if (reader.residentFor(pos, to)) return;
    busy = true;
    try { await reader.ensure(pos, to); } catch { /* miss policy already reported it */ }
    finally { busy = false; }
  };
  const iv = setInterval(pump, everyMs);
  const off = transport.onState ? transport.onState(() => pump()) : () => {};
  pump();
  return () => { live = false; clearInterval(iv); off(); };
}
