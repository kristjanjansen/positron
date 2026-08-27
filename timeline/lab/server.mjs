// timeline/lab/server.mjs — static files + the truth clock, port 8896.
// /time-local: hrtime-anchored epoch-µs (the jam-harness method: pages
// min-RTT-calibrate against THIS over loopback; error well under 1 ms).
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, dirname, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const LAB = dirname(fileURLToPath(import.meta.url));
const ROOT = join(LAB, '..');            // serve timeline/ so ../transport.mjs resolves
const PORT = 8896;

const t0wall = Date.now() * 1000;        // µs
const t0hr = process.hrtime.bigint();    // ns
const nowUs = () => t0wall + Number(process.hrtime.bigint() - t0hr) / 1000;

const MIME = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.json': 'application/json' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname === '/time-local') {
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(JSON.stringify({ us: nowUs() }));
      return;
    }
    const rel = normalize(url.pathname).replace(/^([/\\])+/, '');
    if (rel.includes('..')) { res.writeHead(400); res.end(); return; }
    const file = join(ROOT, rel === '' ? 'lab/lab.html' : rel);
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  } catch (e) {
    res.writeHead(404); res.end(String(e.message));
  }
}).listen(PORT, '127.0.0.1', () => console.log(`tlab server on http://127.0.0.1:${PORT} (truth clock + static)`));
