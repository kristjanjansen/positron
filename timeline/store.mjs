// timeline/store.mjs — THE STORE LAYER. plan-timeline §3 promised the v0 library
// as "Event type + store (memory/DO/JSONL-R2 backends) + transport…"; the store
// half was never built, and the library's log is an in-memory array. Decades of
// ERR archive is not a JS array.
//
// WHAT MADE THIS TRACTABLE NOW (NOTES.md Checkpoint 7): since v0.4 the CURSOR is
// the ONLY positional reader in the library. `sampleAt`/`bracket` go through it,
// `prefixEvents` bisects a per-kind lane, and `createCursor(rows)` is exported.
// So a backend does not have to satisfy "the transport"; it has to satisfy ONE
// tiny structural contract:
//
//     rows.length            -> a number
//     rows[k]                -> a row whose key(row) is NON-DECREASING in k
//
// That is the whole interface. Everything below exists to serve those two lines
// out of something that is not resident in memory.
//
// ---------------------------------------------------------------------------
// THE ONE INTERFACE
// ---------------------------------------------------------------------------
//   const reader = await store.open(query);
//   reader.count                       rows currently addressable (indexed + tail)
//   reader.at(i)                       row i — SYNC, always returns something
//   reader.slice(from, to)             rows [from, to) — SYNC, ghosts flagged
//   reader.bracketAt(pos, nbr)         the straddling pair — SYNC, cursor-backed
//   reader.ensure(fromPos, toPos)      PREFETCH BY WINDOW — async, horizon-driven
//   reader.residentFor(fromPos, toPos) SYNC fast path: is that window resident?
//   reader.appendBatch(rows)           live growth under the playhead
//   reader.rows                        the cursor-shaped view (pass to createCursor)
//   reader.resident() / .stats() / .misses() / .onMiss(cb)
//   reader.close()
//
// SYNC-OR-ASYNC. `open()` is async (an index has to be read). Every read after
// that is SYNCHRONOUS, because a lookahead scheduler cannot await inside its
// tick — the tick is the thing that keeps the vector honest. The async half is
// pushed entirely into `ensure(fromPos, toPos)`, which the client drives from
// the SAME horizon the scheduler already computes:
//
//     pos + horizonMs * rate       (transport.mjs scan(), line ~536)
//
// so prefetch is not a new concept, it is the existing lookahead extended one
// level down the stack. A window that is resident costs a Map lookup.
//
// ---------------------------------------------------------------------------
// THE MISS POLICY — the honest decision, stated out loud
// ---------------------------------------------------------------------------
// A synchronous read into a non-resident page is the one genuinely new failure
// mode a store adds to this library. Three options were on the table:
//
//   (a) STALL THE LANE. Rejected. The library's first law is that the vector has
//       no timers and position(now) is pure math over {p0,t0,rate}. There is no
//       "stall" that is not a pause(), and a pause is a user-visible transport
//       state change (it emits 'pause', it runs followTransport, a HUD shows
//       0.00x). A STORE MUST NOT MOVE THE TRANSPORT BEHIND THE CLIENT'S BACK.
//       Available as `missPolicy:'stall'` — which reports the miss with
//       action:'stall' and lets the CLIENT call pause(). The store reports; the
//       client decides.
//
//   (b) SKIP WITH A REPORTED GAP. Rejected as the default. It breaks SEAM 5's
//       guarantee — the reducer is handed the COMPLETE ORDERED PREFIX — and it
//       breaks it INVISIBLY for exactly the reducers that care: a hole in the
//       prefix makes a non-commutative fold (a counter, a cue state machine)
//       silently wrong. Available as `missPolicy:'skip'`; slice() then omits the
//       ghosts and reports `gaps`, so a client that genuinely wants holes gets
//       them labelled.
//
//   (c) FIRE LATE WITH A DRIFT RECORD.  *** THE DEFAULT ***
//       Because it is not a new failure mode at all — it is the one the library
//       already models. Every fire logs {intendedUs, firedUs, deltaMs, origin};
//       a store miss is the same record with a larger delta and origin
//       'store-miss'. Reuse buys three things for free:
//         · a HUD that already draws drift draws store misses with no new code;
//         · `lateGraceMs` and the per-kind catch-up policy ('burst'|'drop'|
//           'reduce') ALREADY decide what a late batch means — the client's
//           declared policy, not the store's guess;
//         · the prefix stays COMPLETE. Only actuation is late. C2 still holds.
//
// THE GHOST ROW is the mechanism all three share. A miss cannot return undefined
// (the cursor would probe key(undefined) and throw) and must not return a stale
// key (the binary search would diverge). So it returns a GHOST: a synthetic row
// carrying a key INTERPOLATED INSIDE ITS PAGE'S KNOWN [firstAt, lastAt] bounds.
// Page bounds are monotone, so ghost keys are monotone across the whole log:
// the bisect still converges on the right page, and once that page lands the
// real row is served. A ghost is flagged `__ghost` on every path, is never
// handed to an actuator, and every one is counted.
//
// ---------------------------------------------------------------------------
// WINDOWING — bounded memory for an unbounded log
// ---------------------------------------------------------------------------
// Pages are ROW-INDEX ranges (default 4096 rows), never byte ranges, so at(i) is
// page arithmetic. The sidecar index holds one entry per page — {i0,n,off,len,
// firstAt,lastAt} — so a 1M-row log has 245 index entries, not 1M. Resident
// pages are an LRU of `maxPages` (default 8). CEILING = maxPages*pageRows rows
// + the live tail, and `resident()` reports it rather than claiming it.
//
// Plain ESM, no deps, browser + node (node-only paths are dynamic imports).

import { createCursor } from './transport.mjs';

export const DEFAULT_PAGE_ROWS = 4096;
export const DEFAULT_MAX_PAGES = 8;
export const MISS_POLICIES = ['late', 'skip', 'stall'];

const isGhost = (r) => !!(r && r.__ghost);
export { isGhost };

// ---------------------------------------------------------------------------
// LRU over page index -> rows[]
// ---------------------------------------------------------------------------
// PINNING is not an optimisation, it is a correctness requirement. A cold
// bisect probes O(log pageCount) pages and each probe kicks off a background
// repair load; without a pin those repairs land later and evict the very window
// ensure() just paid for, so an ensured read could still come back cold. The
// window the client asked for is pinned until the next ensure() replaces it.
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

// ---------------------------------------------------------------------------
// THE PAGED READER — one implementation, three sources.
//
// A `source` supplies:
//   {name, pageRows, total(), pageCount(), pageMeta(p) -> {i0,n,firstAt,lastAt},
//    loadPage(p) -> Promise<rows[]>, warm() -> Promise<void>, close()}
// ---------------------------------------------------------------------------
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
  const tail = [];                     // live appends — RESIDENT ALWAYS, never evicted
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
    // Repair in the background — but a COLD BISECT probes O(log pageCount)
    // pages and we are not going to fetch seventeen of them to answer one
    // synchronous read. Two concurrent repairs; the rest is ensure()'s job.
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

  // -------------------------------------------------------------------------
  // THE CURSOR VIEW. This is the whole point: a Proxy whose only job is to be
  // `{length, [k]}` so createCursor() — the library's one positional reader —
  // rides an unbounded log without knowing it.
  // -------------------------------------------------------------------------
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

  /** SYNC. The straddling pair at pos, plus {cold, ghosts} — the C6 law applied
   *  to residency: a cold read degrades, and says so, rather than lying. */
  function bracketAt(pos, nbr = 0) {
    const br = cur().bracket(pos, nbr);
    if (!br) return null;
    const ghosts = [br.a, br.b, ...br.prevs, ...br.nexts].filter(isGhost).length;
    return { ...br, cold: ghosts > 0, ghosts, page: pageOf(br.i) };
  }

  // -------------------------------------------------------------------------
  // PREFETCH BY WINDOW. Driven by the scheduler's own horizon:
  //     reader.ensure(pos, pos + horizonMs * rate)
  // Returns {fast, pages, loaded} — `fast:true` means it was already resident
  // and NOTHING was awaited (the common case at 40 Hz).
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // APPEND-LIVE. The live-show case: the log grows UNDER the playhead.
  //
  // Appends land in `tail`, which is (a) always resident, (b) never evicted, and
  // (c) addressed at indices >= indexed. Growing an array at the END cannot move
  // any index the cursor is holding, so THE CURSOR STAYS VALID BY CONSTRUCTION —
  // no invalidation, no reset, no re-seek. That is the whole guarantee.
  //
  // An out-of-order append (at < the tail's last at) WOULD move indices. The DO
  // already answers this: it rejects a non-monotonic seq per source, INDIVIDUALLY,
  // so a retried batch is idempotent instead of fatal. Same rule here — the row
  // is inserted in sorted position (the log must stay sorted or the cursor is
  // meaningless), and if that position sits at or before the cursor's index the
  // cursor is reset and the reset is REPORTED. Never silent.
  // -------------------------------------------------------------------------
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
    /** rows in the position domain the deck uses — for logdeck-style clients. */
    index() { return source.index ? source.index() : null; },
    meta() { return source.meta ? source.meta() : null; },
    close() { closed = true; pages.clear(); inflight.clear(); return source.close && source.close(); },
  };
}

// ---------------------------------------------------------------------------
// (1) memoryStore — BYTE-COMPATIBLE WITH TODAY'S ARRAY.
//
// Deliberately NOT the paged reader. The array IS the resident set; wrapping it
// in a Proxy would add a per-probe indirection to the exact read v0.4 measured
// at 3.67 comparisons/call, for nothing. `reader.rows` is the SAME array object
// (identity, not a copy), so a deck holding it and this reader are the same
// storage — which is what makes appendBatch visible to an already-running deck
// and what makes "nothing regresses" a fact rather than a hope.
// ---------------------------------------------------------------------------
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
    rows: arr,                                   // IDENTITY — the same array
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

// ---------------------------------------------------------------------------
// (2) jsonlStore — Range-fetched pages + an index sidecar. THE ARCHIVE CASE.
//
// This is proto/selfrec's manifest shape one level down: masters are truth, the
// sidecar is derived and regenerable (postshow.mjs's `derived/index.json` rule).
// Layout:
//     <name>.jsonl        one JSON row per line, sorted by key
//     <name>.idx.json     {v, key, rows, pageRows, bytes,
//                          pages:[{i0,n,off,len,firstAt,lastAt}], …}
// ONE index entry per PAGE, so the sidecar is O(rows/pageRows) — 245 entries for
// a 1M-row log, not 1M. Reads are HTTP Range (R2/r2.dev serve them) or a
// positional fs read; both hand back exactly `len` bytes of whole lines.
// ---------------------------------------------------------------------------

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

      // THE SIDECAR IS DERIVED, AND DERIVED DATA GOES STALE. Page offsets are
      // BYTE offsets: an index built before a C6 redaction compaction will Range
      // into the middle of a line and hand back garbage that parses. So the
      // index is bound to the log's byte length, and the binding is CHECKED —
      // at open for a path, and against the first 206's content-range for a URL.
      // (postshow.mjs's rule, one level down: masters are truth, derived is
      // regenerable — but only if you can tell that it needs regenerating.)
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

// ---------------------------------------------------------------------------
// (3) doStore — paged reads against the DEPLOYED elektron-instrument session API.
//
//     GET {base}/session/<id>?from=&limit=   -> {session, lanes, from, limit,
//                                                count, total, events[]}
// ordered by (at, seq); `from` is a ROW OFFSET, which is exactly the page
// addressing above with no translation at all. That is not luck: workers/
// instrument/src/index.js stores notes as SQLite ROWS (plan-timeline C4 — rows,
// NEVER one JSON value), and "rows + an offset + a limit" is the same shape a
// paged store wants. A session log kept as one 128 KiB JSON value could not
// serve a page at all.
//
// READ-ONLY. No writes, no new CF resources, no token needed for reads (the
// session API's reads are open; a token is only sent if you hand one in).
//
// PAGE BOUNDS. The API has no positional query, so firstAt/lastAt per page are
// PROBED with limit=1 at each page start — pageCount+1 tiny requests, cached for
// the reader's life. For a 392-row session at pageRows 4096 that is one probe.
// (What a decades-scale archive needs instead is in NOTES-store.md.)
// ---------------------------------------------------------------------------
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
        /** probe page boundaries — the positional index the API does not serve. */
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

// ---------------------------------------------------------------------------
// openStore — one entry point, so a client writes ONE line to change backend.
//   openStore({kind:'memory', rows})
//   openStore({kind:'jsonl', url|path})
//   openStore({kind:'do', base, session})
// ---------------------------------------------------------------------------
export function openStore(spec = {}) {
  const k = spec.kind || (spec.rows ? 'memory' : spec.session ? 'do' : 'jsonl');
  if (k === 'memory') return memoryStore(spec.rows || [], spec).open();
  if (k === 'jsonl') return jsonlStore(spec).open();
  if (k === 'do') return doStore(spec).open();
  throw new Error(`openStore: unknown kind ${k}`);
}

// ---------------------------------------------------------------------------
// storeLane — the shim that makes a reader look like ONE per-kind lane, which is
// what transport.mjs's byKind map holds. It filters by kind over the reader's
// index space, so `lane.length` / `lane[k]` still satisfy the cursor contract.
// Cheap only when the store is single-kind or the pages are resident; for a
// multi-kind archive the RIGHT answer is one reader per kind (one sidecar per
// lane) — see NOTES-store.md, "what ERR still needs".
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// driveStore — the horizon -> ensure() pump. This is the ONE line of glue a
// client (or, later, the scheduler) needs: prefetch the window the lookahead is
// about to walk into, from the same numbers the lookahead already has. It is NOT
// a timer inside the library's vector — it is the CLIENT's cadence, per the
// "the library does not own a render tick" law, and it is opt-in.
// ---------------------------------------------------------------------------
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
