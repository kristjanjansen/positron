// flipper server — static files + ICY now-playing proxy + autotest report sink.
// Plain node ESM, no deps. Port 8892 (this agent's assigned port).
// The HLS streams are CORS-open (ACAO: *) so no HLS proxying is needed;
// the only proxy duty is icecast.err.ee ICY metadata (no CORS on icecast).

import http from 'node:http';
import https from 'node:https';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = 8892;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.css': 'text/css',
};

// --- ICY now-playing -------------------------------------------------------
// Respectful: one short-lived connection per request, results cached 12 s,
// in-flight requests deduped. Reads exactly one metadata block then destroys.
const ALLOWED_MOUNTS = /^[a-z0-9-]+\.mp3$/;
const icyCache = new Map(); // mount -> { at, promise|value }

function fetchIcy(mount) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      { host: 'icecast.err.ee', path: '/' + mount, headers: { 'Icy-MetaData': '1', 'User-Agent': 'elektron-flipper-proto/0.1' } },
      (res) => {
        const metaint = parseInt(res.headers['icy-metaint'] || '0', 10);
        const name = res.headers['icy-name'] || mount;
        if (!metaint) { res.destroy(); return resolve({ mount, name, title: null, note: 'no icy-metaint' }); }
        let buf = Buffer.alloc(0);
        res.on('data', (c) => {
          buf = Buffer.concat([buf, c]);
          if (buf.length > metaint) {
            const len = buf[metaint] * 16;
            if (buf.length >= metaint + 1 + len) {
              const block = buf.subarray(metaint + 1, metaint + 1 + len).toString('utf8').replace(/\0+$/, '');
              const m = block.match(/StreamTitle='([^']*)'/);
              res.destroy();
              resolve({ mount, name, metaint, title: m ? m[1] : null });
            }
          }
          if (buf.length > metaint + 4200) { res.destroy(); resolve({ mount, name, title: null, note: 'metadata parse overrun' }); }
        });
        res.on('error', reject);
      }
    );
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(new Error('icy timeout')); });
  });
}

async function icyHandler(mount, res) {
  if (!ALLOWED_MOUNTS.test(mount)) { res.writeHead(400); return res.end('bad mount'); }
  const hit = icyCache.get(mount);
  if (hit && Date.now() - hit.at < 12000) {
    const value = await hit.promise;
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify(value));
  }
  const promise = fetchIcy(mount).catch((e) => ({ mount, error: String(e) }));
  icyCache.set(mount, { at: Date.now(), promise });
  const value = await promise;
  res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
}

// --- server ----------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname.startsWith('/icy/')) return icyHandler(url.pathname.slice(5), res);

  if (url.pathname === '/report' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 1e6) req.destroy(); });
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
    const data = await readFile(join(ROOT, file));
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('not found');
  }
});

server.listen(PORT, () => console.log(`flipper on http://localhost:${PORT}`));
