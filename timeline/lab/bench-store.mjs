// timeline/lab/bench-store.mjs — the store bench: rows x backend x (open, cold
// seek, warm advance, memory). Also owns the synthetic-log fixtures, so
// prop-store.mjs and the bench measure THE SAME BYTES.
//
//   node timeline/lab/bench-store.mjs [--rows 1000000] [--no-do] [--no-http]
//
// Fixtures live outside the repo (STORE_FIXTURES or $TMPDIR/elektron-store-fx)
// and are CACHED: a 1M-row log is ~58 MB and takes ~20 s to make once.
// MACHINE RULE: this file's HTTP server binds 8892 (mine), nothing else.

import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

import { memoryStore, jsonlStore, doStore, buildJsonlIndex, DEFAULT_PAGE_ROWS } from '../store.mjs';

export const FX = process.env.STORE_FIXTURES || path.join(os.tmpdir(), 'elektron-store-fx');
export const PORT = 8892;
export const DO_BASE = process.env.INSTRUMENT_BASE || 'https://elektron-instrument.kristjan-jansen.workers.dev';
export const DO_SESSION = process.env.INSTRUMENT_SESSION || 'smtc1hu37j5yeph';   // the KEPT proof session

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One synthetic row. Shape mirrors what every client of this library stores:
 *  a flat sorted row with an absolute stamp and a kind IN the row (§0). */
export function synthRow(i, at, rand) {
  const kinds = ['midi', 'pointer', 'cue'];
  return { at, kind: kinds[i % 3], seq: i, payload: { n: 36 + ((i * 7) % 60), v: 1 + ((i * 13) % 126) } };
}

/** Deterministic ascending trace. Same generator for every n, so a 10k log is a
 *  PREFIX of a 1M log in shape (not in values — the gaps differ by seed). */
export function genRows(n, seed = 7) {
  const rand = mulberry32(seed);
  const rows = new Array(n);
  let at = 0;
  for (let i = 0; i < n; i++) {
    at = +(at + 1 + rand() * 40).toFixed(3);     // ~21 ms mean gap -> 1M rows ~ 5.9 h
    rows[i] = synthRow(i, at, rand);
  }
  return rows;
}

/** Write + index a fixture ONCE. Returns {jsonl, idx, rows, bytes, indexBytes}. */
export async function ensureFixture(n, { pageRows = DEFAULT_PAGE_ROWS, seed = 7, force = false } = {}) {
  await fsp.mkdir(FX, { recursive: true });
  const stem = path.join(FX, `log-${n}-p${pageRows}`);
  const jsonl = `${stem}.jsonl`, idx = `${stem}.idx.json`;
  let have = false;
  try { const a = await fsp.stat(jsonl), b = await fsp.stat(idx); have = a.size > 0 && b.size > 0; } catch {}
  if (have && !force) {
    const index = JSON.parse(await fsp.readFile(idx, 'utf8'));
    return { jsonl, idx, rows: index.rows, bytes: index.bytes, indexBytes: (await fsp.stat(idx)).size, index, cached: true };
  }
  const rand = mulberry32(seed);
  const ws = fs.createWriteStream(jsonl);
  let at = 0, buf = '';
  for (let i = 0; i < n; i++) {
    at = +(at + 1 + rand() * 40).toFixed(3);
    buf += JSON.stringify(synthRow(i, at, rand)) + '\n';
    if (buf.length > 1 << 20) { if (!ws.write(buf)) await new Promise((r) => ws.once('drain', r)); buf = ''; }
  }
  if (buf) ws.write(buf);
  await new Promise((r) => ws.end(r));
  const built = await buildJsonlIndex(jsonl, { pageRows, out: idx });
  return { jsonl, idx, rows: built.index.rows, bytes: built.index.bytes, indexBytes: built.indexBytes, index: built.index, cached: false };
}

/** Range-capable static server on MY port (8892). R2/r2.dev serve 206 the same
 *  way, which is what makes the fs path and the http path one code path. */
export function serveFixtures(port = PORT, dir = FX) {
  const server = http.createServer(async (req, res) => {
    const file = path.join(dir, path.basename(new URL(req.url, 'http://x').pathname));
    let st;
    try { st = await fsp.stat(file); } catch { res.writeHead(404); return res.end('no'); }
    const range = req.headers.range;
    if (!range) {
      res.writeHead(200, { 'content-length': st.size, 'accept-ranges': 'bytes' });
      return fs.createReadStream(file).pipe(res);
    }
    const m = /bytes=(\d+)-(\d+)/.exec(range);
    const start = +m[1], end = Math.min(+m[2], st.size - 1);
    res.writeHead(206, {
      'content-range': `bytes ${start}-${end}/${st.size}`,
      'content-length': end - start + 1, 'accept-ranges': 'bytes',
    });
    fs.createReadStream(file, { start, end }).pipe(res);
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve({
    server, url: (f) => `http://127.0.0.1:${port}/${path.basename(f)}`,
    close: () => new Promise((r) => server.close(r)),
  })));
}

const heap = () => { global.gc && global.gc(); return process.memoryUsage().heapUsed; };
const ms = (t) => +t.toFixed(3);

/** open / cold seek / warm advance / memory, for one opened reader. */
async function measure(openFn, { seeds = 12, sweep = 4000, seed = 11 } = {}) {
  const rand = mulberry32(seed);
  const h0 = heap();
  const t0 = performance.now();
  const reader = await openFn();
  const openMs = performance.now() - t0;

  const lo = reader.at(0) ? reader.at(0).at : 0;
  const hiRow = reader.at(reader.count - 1);
  const hi = hiRow ? hiRow.at : 1;
  const span = hi - lo;

  // ---- COLD SEEK: a position whose page is NOT resident, ensure() then read.
  const coldT = [];
  let coldMisses = 0;
  const off = reader.onMiss(() => { coldMisses++; });
  for (let s = 0; s < seeds; s++) {
    const pos = lo + span * rand();
    const t = performance.now();
    await reader.ensure(pos, pos + span / 5000);
    reader.bracketAt(pos);
    coldT.push(performance.now() - t);
  }
  off();

  // ---- WARM ADVANCE: forward sweep inside ONE resident window (the play case)
  const start = lo + span * 0.5;
  await reader.ensure(start, start + span * 0.002);
  const c0 = reader.stats().cursor ? reader.stats().cursor.comparisons : 0;
  const step = (span * 0.002) / sweep;
  const t2 = performance.now();
  for (let k = 0; k < sweep; k++) reader.bracketAt(start + k * step);
  const warmMs = (performance.now() - t2) / sweep;
  const cs = reader.stats().cursor;
  const cmp = cs ? (cs.comparisons - c0) / sweep : null;

  const res = reader.resident();
  const h1 = heap();
  const stats = reader.stats();
  await reader.close();
  const p = (xs) => { const s = [...xs].sort((a, b) => a - b); return ms(s[Math.floor(s.length * 0.5)]); };
  return {
    openMs: ms(openMs), coldSeekMs: p(coldT), warmAdvanceUs: ms(warmMs * 1000),
    cmpPerCall: cmp === null ? null : +cmp.toFixed(2),
    heapMB: +((h1 - h0) / 1048576).toFixed(2),
    residentRows: res.rows + res.tailRows, ceilingRows: res.ceilingRows,
    totalRows: res.totalRows, misses: stats.misses, ghosts: stats.ghosts,
    requests: stats.requests, coldMisses,
  };
}

export async function runBench({
  sizes = [10_000, 100_000, 1_000_000], withDo = true, withHttp = true, pageRows = DEFAULT_PAGE_ROWS, log = () => {},
} = {}) {
  const out = [];
  let srv = null;
  if (withHttp) srv = await serveFixtures();
  try {
    for (const n of sizes) {
      log(`  fixture ${n}…`);
      const fx = await ensureFixture(n, { pageRows });
      out.push({ backend: 'memory', rows: n, note: 'array identity',
        ...(await measure(async () => memoryStore(genRows(n)).open())) });
      out.push({ backend: 'jsonl:fs', rows: n, note: `page ${pageRows}`,
        ...(await measure(async () => jsonlStore({ path: fx.jsonl, indexPath: fx.idx }).open())) });
      if (srv) out.push({ backend: 'jsonl:http', rows: n, note: 'Range 206',
        ...(await measure(async () => jsonlStore({ url: srv.url(fx.jsonl), indexUrl: srv.url(fx.idx) }).open(), { seeds: 8 })) });
      out[out.length - 1].indexBytes = fx.indexBytes;
      out[out.length - 2].indexBytes = fx.indexBytes;
    }
    if (withDo) {
      try {
        const m = await measure(async () => doStore({ base: DO_BASE, session: DO_SESSION }).open(), { seeds: 4, sweep: 500 });
        out.push({ backend: 'do:sqlite', rows: m.totalRows, note: `kept session ${DO_SESSION}`, ...m });
      } catch (e) { out.push({ backend: 'do:sqlite', rows: null, note: `UNREACHABLE: ${e.message}` }); }
    }
  } finally { if (srv) await srv.close(); }
  return out;
}

export function formatTable(rows) {
  const cols = [
    ['backend', 'backend'], ['rows', 'rows'], ['openMs', 'open ms'], ['coldSeekMs', 'cold seek ms'],
    ['warmAdvanceUs', 'warm adv µs'], ['cmpPerCall', 'cmp/call'], ['residentRows', 'resident rows'],
    ['ceilingRows', 'ceiling'], ['heapMB', 'heap MB'], ['requests', 'reqs'], ['note', 'note'],
  ];
  const fmt = (v) => (v === null || v === undefined ? '—' : typeof v === 'number' ? String(v) : String(v));
  const head = cols.map(([, h]) => h);
  const body = rows.map((r) => cols.map(([k]) => fmt(r[k] === Infinity ? '∞' : r[k])));
  const w = head.map((h, i) => Math.max(h.length, ...body.map((b) => b[i].length)));
  const line = (cells) => '| ' + cells.map((c, i) => c.padEnd(w[i])).join(' | ') + ' |';
  return [line(head), '|' + w.map((x) => '-'.repeat(x + 2)).join('|') + '|', ...body.map(line)].join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const a = process.argv.slice(2);
  const rows = a.includes('--rows') ? [+a[a.indexOf('--rows') + 1]] : [10_000, 100_000, 1_000_000];
  const res = await runBench({ sizes: rows, withDo: !a.includes('--no-do'), withHttp: !a.includes('--no-http'), log: (s) => console.error(s) });
  console.log(formatTable(res));
}
