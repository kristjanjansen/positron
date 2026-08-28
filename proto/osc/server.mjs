// proto/osc/server.mjs — zero-dep static + signalling server for the OSC
// transport bench. Port 8893 (assigned). Modelled on proto/jam/server.mjs:
//   GET  /                   -> proto/osc/*
//   GET  /timeline/*         -> the LIBRARY, aliased, never copied
//   GET  /moq/*              -> proto/jam/moq/www/* (the built MoQ bundles)
//   GET  /time-local         -> {us} epoch-µs from an hrtime-anchored clock,
//                               so a mid-run NTP step cannot move the truth
//   GET/POST /msg/<box>      -> a long-poll mailbox for WebRTC signalling
//                               (never on a measured path)
//   POST /result/<name>      -> results/<name>.json
//   GET  /env.json           -> the tokens a page is allowed to see

import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../..');
const PORT = Number(process.env.PORT || 8893);

// hrtime-anchored epoch clock: Date.now() is sampled ONCE and advanced by a
// monotonic counter, so an NTP correction mid-run cannot move the truth the
// browsers calibrate against.
const T0_MS = Date.now(), T0_HR = process.hrtime.bigint();
const nowUs = () => Math.round(T0_MS * 1000 + Number(process.hrtime.bigint() - T0_HR) / 1000);

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.map': 'application/json' };

const boxes = new Map();          // box -> {msgs:[], waiters:[]}
const box = (n) => { let b = boxes.get(n); if (!b) boxes.set(n, b = { msgs: [], waiters: [] }); return b; };

const body = (req) => new Promise((res) => { let s = ''; req.on('data', (d) => { s += d; }); req.on('end', () => res(s)); });

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  const json = (o, code = 200) => { res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': '*' }); res.end(JSON.stringify(o)); };

  try {
    if (p === '/time-local') return json({ us: nowUs() });

    if (p === '/env.json') {
      let env = {};
      try {
        env = Object.fromEntries((await readFile(join(ROOT, '.env'), 'utf8')).split('\n')
          .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
          .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
      } catch {}
      return json({ OSC_TOKEN: env.OSC_TOKEN || null, JAM_TOKEN: env.JAM_TOKEN || null });
    }

    const mm = /^\/msg\/([\w-]+)$/.exec(p);
    if (mm) {
      const b = box(mm[1]);
      if (req.method === 'POST') {
        b.msgs.push(JSON.parse(await body(req)));
        while (b.waiters.length) b.waiters.shift()();
        return json({ ok: true });
      }
      const from = Number(url.searchParams.get('from') || 0);
      if (b.msgs.length > from) return json({ msgs: b.msgs.slice(from), next: b.msgs.length });
      await new Promise((r) => { const t = setTimeout(r, 8000); b.waiters.push(() => { clearTimeout(t); r(); }); });
      return json({ msgs: b.msgs.slice(from), next: b.msgs.length });
    }

    const rm = /^\/result\/([\w.-]+)$/.exec(p);
    if (rm && req.method === 'POST') {
      await mkdir(join(HERE, 'results'), { recursive: true });
      await writeFile(join(HERE, 'results', rm[1] + '.json'), await body(req));
      return json({ ok: true });
    }

    // ---- static ----------------------------------------------------------
    let file;
    if (p.startsWith('/timeline/')) file = join(ROOT, normalize(p).replace(/^(\.\.[/\\])+/, ''));
    else if (p.startsWith('/moq/')) file = join(ROOT, 'proto/jam/moq/www', normalize(p.slice(5)).replace(/^(\.\.[/\\])+/, ''));
    else file = join(HERE, normalize(p === '/' ? '/bench.html' : p).replace(/^(\.\.[/\\])+/, ''));
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(data);
  } catch (e) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found: ' + e.message);
  }
}).listen(PORT, '127.0.0.1', () => console.log(`osc bench server on http://127.0.0.1:${PORT}`));
