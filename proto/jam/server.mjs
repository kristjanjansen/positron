// proto/jam/server.mjs — jam rig server on :8893 (plain node ESM, no deps).
//
//   static files        GET  /<path>            (serves proto/jam/)
//   shared local clock  GET  /time-local        -> {us} epoch-µs, hrtime-anchored
//                       (both bench pages min-RTT-calibrate to THIS clock over
//                       loopback: same-host truth, offset error ≪1 ms)
//   tokens for pages    GET  /env.json          -> {ROOM_TOKEN, JAM_TOKEN, CUES_TOKEN}
//                       (localhost rig only; tokens come from repo .env)
//   mailbox signaling   POST /msg/<box>         body = one JSON message
//                       GET  /msg/<box>?after=N&wait=MS  -> {next, msgs}
//   result sink         POST /log/<name>        append body+\n to results/<name>.jsonl
//                       POST /result/<name>     write results/<name>.json
//
// The mailbox is coordination/signaling ONLY — never on a measured path.

import http from 'node:http';
import { readFile, appendFile, writeFile } from 'node:fs/promises';
import { join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = +(process.env.PORT || 8893);

// epoch-µs clock: wall anchor + monotonic hrtime (no NTP steps mid-run)
const anchorUs = Date.now() * 1000 - Number(process.hrtime.bigint() / 1000n);
const nowUs = () => anchorUs + Number(process.hrtime.bigint() / 1000n);

// tokens from repo .env (two levels up)
const env = {};
try {
  const txt = await readFile(join(ROOT, '..', '..', '.env'), 'utf8');
  for (const line of txt.split('\n')) {
    const m = line.match(/^(\w+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
} catch { /* no .env — token-needing arms will fail visibly */ }

const MIME = {
  html: 'text/html', js: 'text/javascript', mjs: 'text/javascript',
  json: 'application/json', css: 'text/css', png: 'image/png',
  jsonl: 'application/x-ndjson', md: 'text/plain',
};

// mailboxes: box -> {msgs: [], waiters: []}
const boxes = new Map();
function box(name) {
  if (!boxes.has(name)) boxes.set(name, { msgs: [], waiters: [] });
  return boxes.get(name);
}

async function body(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks).toString('utf8');
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  try {
    if (p === '/time-local') {
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(JSON.stringify({ us: nowUs() }));
      return;
    }
    if (p === '/env.json') {
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(JSON.stringify({
        ROOM_TOKEN: env.ROOM_TOKEN || '', JAM_TOKEN: env.JAM_TOKEN || '',
        CUES_TOKEN: env.CUES_TOKEN || '',
      }));
      return;
    }
    if (p.startsWith('/msg/')) {
      const name = p.slice(5);
      if (!/^[\w.-]{1,128}$/.test(name)) { res.writeHead(400); res.end('bad box'); return; }
      const b = box(name);
      if (req.method === 'POST') {
        const msg = JSON.parse(await body(req));
        b.msgs.push(msg);
        for (const w of b.waiters.splice(0)) w();
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: true, n: b.msgs.length }));
        return;
      }
      // GET long-poll
      const after = +(url.searchParams.get('after') || 0);
      const wait = Math.min(+(url.searchParams.get('wait') || 0), 25000);
      const reply = () => {
        res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
        res.end(JSON.stringify({ next: b.msgs.length, msgs: b.msgs.slice(after) }));
      };
      if (b.msgs.length > after || !wait) { reply(); return; }
      let done = false;
      const fire = () => { if (!done) { done = true; reply(); } };
      b.waiters.push(fire);
      setTimeout(fire, wait);
      return;
    }
    if (req.method === 'POST' && (p.startsWith('/log/') || p.startsWith('/result/'))) {
      const isLog = p.startsWith('/log/');
      const name = p.slice(isLog ? 5 : 8);
      if (!/^[\w.-]{1,128}$/.test(name)) { res.writeHead(400); res.end('bad name'); return; }
      const data = await body(req);
      const file = join(ROOT, 'results', name + (isLog ? '.jsonl' : '.json'));
      if (isLog) await appendFile(file, data.endsWith('\n') ? data : data + '\n');
      else await writeFile(file, data);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{"ok":true}');
      return;
    }
    // static (/timeline/* is aliased to the repo's shared timeline library so
    // the demo imports the SAME transport.mjs the lab measured — no copy)
    const rel = normalize(p === '/' ? '/harness/bench.html' : p).replace(/^\/+/, '');
    if (rel.includes('..')) { res.writeHead(403); res.end(); return; }
    const file = rel.startsWith('timeline/') ? join(ROOT, '..', '..', rel) : join(ROOT, rel);
    try {
      const data = await readFile(file);
      const ext = rel.split('.').pop();
      res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(data);
    } catch {
      res.writeHead(404); res.end('not found: ' + rel);
    }
  } catch (e) {
    res.writeHead(500); res.end(String(e && e.message));
  }
});
server.listen(PORT, '127.0.0.1', () => console.log(`jam server :${PORT} root=${ROOT}`));
