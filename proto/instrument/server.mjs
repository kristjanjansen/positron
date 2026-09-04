// proto/instrument/server.mjs — remote-instrument rig server on :8899.
// Plain node ESM, no deps, no build step (ThreatLocker: no bundler binaries).
//
//   GET  /                      -> play.html (the catalog is the front door)
//   GET  /<path>                static from proto/instrument/
//   GET  /jam/<path>            static from proto/jam/   — the onset worklet and
//                               friends are LOADED, not copied
//   GET  /timeline/<path>       static from the repo's timeline/ — the shared
//                               transport library, likewise loaded, not copied
//   GET  /time-local            {us} hrtime-anchored epoch µs — same-host truth
//                               clock, so the harness measures transport and not
//                               clock skew (the worker's /time is the real-world
//                               source and is what the pages use by default)
//   GET  /env.json              {INSTRUMENT_TOKEN, WORKER} from the repo .env
//   POST /log/<name>            append a line to results/<name>.jsonl
//   POST /result/<name>         write results/<name>.json
//
// Nothing here is ever on a measured path.

import http from 'node:http';
import { readFile, appendFile, writeFile } from 'node:fs/promises';
import { join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const JAM = join(ROOT, '..', 'jam');
const PORT = +(process.env.PORT || 8899);
const WORKER = process.env.WORKER || 'https://instrument.positron.studio';

const anchorUs = Date.now() * 1000 - Number(process.hrtime.bigint() / 1000n);
const nowUs = () => anchorUs + Number(process.hrtime.bigint() / 1000n);

const env = {};
try {
  const txt = await readFile(join(ROOT, '..', '..', '.env'), 'utf8');
  for (const line of txt.split('\n')) {
    const m = line.match(/^(\w+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
} catch { /* no .env — the host page will show a missing-token error */ }

const MIME = {
  html: 'text/html', js: 'text/javascript', mjs: 'text/javascript', json: 'application/json',
  css: 'text/css', png: 'image/png', jsonl: 'application/x-ndjson', md: 'text/plain',
};

async function body(req) {
  const cs = [];
  for await (const c of req) cs.push(c);
  return Buffer.concat(cs).toString('utf8');
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  try {
    if (p === '/time-local') {
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      return res.end(JSON.stringify({ us: nowUs() }));
    }
    if (p === '/env.json') {
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      return res.end(JSON.stringify({ INSTRUMENT_TOKEN: env.INSTRUMENT_TOKEN || '', WORKER }));
    }
    if (req.method === 'POST' && (p.startsWith('/log/') || p.startsWith('/result/'))) {
      const isLog = p.startsWith('/log/');
      const name = p.slice(isLog ? 5 : 8);
      if (!/^[\w.-]{1,128}$/.test(name)) { res.writeHead(400); return res.end('bad name'); }
      const data = await body(req);
      const file = join(ROOT, 'results', name + (isLog ? '.jsonl' : '.json'));
      if (isLog) await appendFile(file, data.endsWith('\n') ? data : data + '\n');
      else await writeFile(file, data);
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end('{"ok":true}');
    }
    // static — proto/instrument, plus proto/jam mounted read-only at /jam/
    let rel = normalize(p === '/' ? '/play.html' : p).replace(/^\/+/, '');
    if (rel.includes('..')) { res.writeHead(403); return res.end(); }
    // proto/instrument first, then proto/jam as a fallback — that is what lets
    // the sibling's host-check.html (which asks for a root-relative
    // /host-check.js) run unmodified on this port too, without either rig
    // knowing about the other.
    // /timeline/* is aliased to the repo's SHARED timeline library (never
    // copied) — the same file timeline/lab measured and proto/jam and
    // proto/selfrec import. jam's server does the same.
    const tries = rel.startsWith('timeline/') ? [join(ROOT, '..', '..', rel)]
      : rel.startsWith('jam/') ? [join(JAM, rel.slice(4))]
      : [join(ROOT, rel), join(JAM, rel)];
    for (const file of tries) {
      try {
        const data = await readFile(file);
        res.writeHead(200, { 'content-type': MIME[rel.split('.').pop()] || 'application/octet-stream', 'cache-control': 'no-store' });
        return res.end(data);
      } catch { /* next */ }
    }
    res.writeHead(404); res.end('not found: ' + rel);
  } catch (e) {
    res.writeHead(500); res.end(String(e && e.message));
  }
});
server.listen(PORT, '127.0.0.1', () => console.log(`instrument rig :${PORT} root=${ROOT} worker=${WORKER}`));
