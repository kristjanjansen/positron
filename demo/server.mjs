// demo/server.mjs — static files for every demo. Port 8890.
//
//   node demo/server.mjs   ->  http://127.0.0.1:8890/demo/
//
// Serves the REPO ROOT so `/timeline/*.mjs` resolves from any page: the demos
// import the shipped library, never a copy. Exists only because a browser will
// not load ES modules from a file:// path.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, dirname, extname, resolve, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
export const PORT = 8890;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
};

export function serve(port = PORT) {
  const s = createServer(async (req, res) => {
    let rel = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^([/\\])+/, '');
    if (rel.includes('..')) { res.writeHead(400).end('no'); return; }
    if (rel === '') rel = 'demo/index.html';
    if (rel.endsWith('/')) rel = join(rel, 'index.html');
    // LOCAL == DEPLOYED. On the worker, demo/<x> is served at /<x>, so a page
    // asking for /shell/shell.css or /llhls/ must resolve here too — try the
    // repo root first, then inside demo/.
    let file = join(ROOT, rel);
    try {
      let body;
      try { body = await readFile(file); }
      catch { file = join(ROOT, 'demo', rel); body = await readFile(file); }
      res.writeHead(200, {
        'content-type': MIME[extname(file)] || 'application/octet-stream',
        'cache-control': 'no-store',
      });
      res.end(body);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain' }).end(`404 ${rel}`);
    }
  });
  return new Promise((ok) => s.listen(port, '127.0.0.1', () => ok(s)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await serve();
  console.log(`demo server  http://127.0.0.1:${PORT}/demo/`);
}
