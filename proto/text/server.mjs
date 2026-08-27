// proto/text/server.mjs — static rig server for the TEXT PERFORMER, :8889.
// Plain node ESM, no deps, no build step.
//
//   GET /                  -> text.html
//   GET /<path>            static from proto/text/
//   GET /timeline/<path>   static from the repo's timeline/ — the SHARED library,
//                          loaded, never copied (same alias jam/instrument/paths use)
//   GET /time-local        {us} hrtime-anchored epoch µs
//
// Nothing here is ever on a measured path.

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const REPO = join(ROOT, '..', '..');
const PORT = +(process.env.PORT || 8889);

const anchorUs = Date.now() * 1000 - Number(process.hrtime.bigint() / 1000n);
const nowUs = () => anchorUs + Number(process.hrtime.bigint() / 1000n);

const MIME = {
  html: 'text/html', js: 'text/javascript', mjs: 'text/javascript', json: 'application/json',
  css: 'text/css', png: 'image/png', md: 'text/plain', jsonl: 'application/x-ndjson',
};

const server = http.createServer(async (req, res) => {
  const p = new URL(req.url, 'http://x').pathname;
  try {
    if (p === '/time-local') {
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      return res.end(JSON.stringify({ us: nowUs() }));
    }
    const rel = normalize(p === '/' ? '/text.html' : p).replace(/^\/+/, '');
    if (rel.includes('..')) { res.writeHead(403); return res.end(); }
    const file = rel.startsWith('timeline/') ? join(REPO, rel) : join(ROOT, rel);
    try {
      const data = await readFile(file);
      res.writeHead(200, {
        'content-type': MIME[rel.split('.').pop()] || 'application/octet-stream',
        'cache-control': 'no-store',
      });
      return res.end(data);
    } catch { /* fall through */ }
    res.writeHead(404); res.end('not found: ' + rel);
  } catch (e) {
    res.writeHead(500); res.end(String(e && e.message));
  }
});
server.listen(PORT, '127.0.0.1', () => console.log(`text rig :${PORT} root=${ROOT}`));
