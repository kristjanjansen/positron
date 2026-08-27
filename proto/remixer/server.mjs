// remixer server — static files + thin arhiiv.err.ee search proxy + report sink.
// Plain node ESM, no deps. Port 8891 (this agent's assigned port).
//
// Why a proxy at all (measured 2026-08-27): the arhiiv API's actual responses
// carry ACAO:*, but the OPTIONS preflight (forced by the JSON content type on
// POST /search) returns 204 WITHOUT ACAO → browsers block the POST. GETs
// (content/{type}/{slug}) are simple requests with ACAO:* → they go DIRECT
// from the page, as does all media on vod.err.ee. So this proxies exactly one
// endpoint: POST /api/v1/search.
//
// Respect rules: upstream calls spaced >= 1 s (serialized gate), tiny bodies,
// identifying User-Agent. Nothing is cached to disk; nothing media-shaped
// passes through here.

import http from 'node:http';
import https from 'node:https';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = 8891;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.css': 'text/css',
  '.jsonl': 'application/x-ndjson',
};

// --- upstream search, serialized + spaced >= 1 s ---------------------------
let lastUpstreamAt = 0;
let chain = Promise.resolve();

function gatedSearch(body) {
  const p = chain.then(async () => {
    const wait = Math.max(0, lastUpstreamAt + 1000 - Date.now());
    if (wait) await new Promise((r) => setTimeout(r, wait));
    lastUpstreamAt = Date.now();
    return upstreamSearch(body);
  });
  chain = p.catch(() => {});
  return p;
}

function upstreamSearch(body) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: 'arhiiv.err.ee',
        path: '/api/v1/search',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'User-Agent': 'elektron-remixer-proto/0.1',
        },
      },
      (res) => {
        let b = '';
        res.on('data', (c) => (b += c));
        res.on('end', () => resolve({ status: res.statusCode || 502, body: b }));
        res.on('error', reject);
      }
    );
    req.on('error', reject);
    req.setTimeout(20000, () => req.destroy(new Error('upstream timeout')));
    req.end(body);
  });
}

// --- server ----------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/api/search' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 1e4) req.destroy(); });
    req.on('end', async () => {
      try {
        JSON.parse(body); // must be JSON; fixed upstream path — not an open proxy
        const t0 = Date.now();
        const up = await gatedSearch(body);
        res.writeHead(up.status, { 'Content-Type': 'application/json', 'X-Upstream-Ms': String(Date.now() - t0) });
        res.end(up.body);
      } catch (e) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(e) }));
      }
    });
    return;
  }

  if (url.pathname === '/report' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 2e6) req.destroy(); });
    req.on('end', async () => {
      await writeFile(join(ROOT, 'autotest-report.json'), body).catch(() => {});
      console.log('[report]', body.slice(0, 400));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"ok":true}');
    });
    return;
  }

  let file = url.pathname === '/' ? '/index.html' : url.pathname;
  try {
    // /timeline/* is aliased to the repo's SHARED timeline library — the same
    // file timeline/lab measured and proto/jam, proto/selfrec and
    // proto/instrument import. Loaded, never copied.
    // /instrument/* is aliased READ-ONLY to proto/instrument — compose.html
    // nests that rig's KEPT PROOF SESSION (results/instr-session.jsonl) as one
    // span inside this arrangement. Loaded, never copied.
    const base = file.startsWith('/timeline/') || file.startsWith('/instrument/')
      ? join(ROOT, '..', '..') : ROOT;
    if (file.startsWith('/instrument/')) file = '/proto' + file;
    if (file.includes('..')) throw new Error('nope');
    const data = await readFile(join(base, file));
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});

server.listen(PORT, () => console.log(`remixer on http://localhost:${PORT}`));
