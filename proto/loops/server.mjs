// proto/loops/server.mjs — static files for the two loop demos. Port 8890.
//
//   node proto/loops/server.mjs      ->  http://127.0.0.1:8890/proto/loops/
//
// Serves the REPO ROOT so `../../timeline/*.mjs` resolves from the page — the
// demos import the shipped library, never a copy.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, dirname, extname, resolve, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
export const PORT = 8890;

const MIME = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript',
               '.json': 'application/json', '.css': 'text/css', '.png': 'image/png' };

export function serve(port = PORT) {
  const s = createServer(async (req, res) => {
    const rel = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^([/\\])+/, '');
    if (rel.includes('..')) { res.writeHead(400).end(); return; }
    const file = join(ROOT, rel === '' ? 'proto/loops/index.html' : rel.endsWith('/') ? join(rel, 'index.html') : rel);
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(body);
    } catch { res.writeHead(404).end('nope'); }
  });
  return new Promise((r) => s.listen(port, '127.0.0.1', () => r(s)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await serve();
  console.log(`loops on http://127.0.0.1:${PORT}/proto/loops/`);
}
