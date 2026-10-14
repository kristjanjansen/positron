// node demo/server.mjs -> http://127.0.0.1:8890/demo/. Serves the repo root so /timeline/*.mjs
// resolves from any page; it exists because browsers will not load modules from file://.
// why: lessons/harness.md#server

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
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
  // the markdown notes /archive/ links to, as the deploy's _headers serves them
  '.md': 'text/plain; charset=utf-8',
  // Fonts too: the deploy types assets by extension itself, so a gap here shows only on the dev
  // server.
  // `.glb` is absent on purpose; browsers do not check it.
  // why: lessons/harness.md#font-types
  '.woff2': 'font/woff2',
  // Media types, since serving an mp4 as a byte stream is wrong on its own terms.
  // why: lessons/harness.md#media-types
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg',
};

// If the port is taken, take the next one; callers read `server.address().port`. Below: pages the
// deploy copies in from outside demo/, by their served path.
// why: lessons/harness.md#port
const EXTRA = new Map((await import('./manifest.mjs')).extraPages().map(([src, dst]) => [dst, src]));

// A browser sends a cross-site POST without asking first, so the Origin header
// is the only thing that keeps another website from writing into .tap/.
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;
const localOnly = (req, res) => {
  const o = req.headers.origin;
  if (o === undefined || LOCAL_ORIGIN.test(o)) return { 'access-control-allow-origin': o || '*' };
  res.writeHead(403, { 'content-type': 'text/plain' }).end('local origins only');
  return null;
};

export function serve(port = PORT) {
  const s = createServer((req, res) => handle(req, res).catch((e) => {
    // an async handler that throws would be an unhandled rejection, which ends the process
    if (!res.headersSent) res.writeHead(500, { 'content-type': 'text/plain' });
    res.end(`500 ${e.message}`);
  }));
  async function handle(req, res) {
    let rel;
    try { rel = decodeURIComponent(req.url.split('?')[0]); }
    catch { res.writeHead(400, { 'content-type': 'text/plain' }).end('malformed URL'); return; }
    rel = normalize(rel).replace(/^([/\\])+/, '');
    if (rel.includes('..')) { res.writeHead(400).end('no'); return; }
    // /err-img mirrors the deployed Worker's route with the same validation (local == deployed).
    // /_tap and /_log are dev-server only, never deployed: they append a page's MIDI capture or log
    // lines to a file per page so a session can read them; the page behaves the same without them.
    // why: lessons/harness.md#dev-routes
    if (rel === '_log' && req.method === 'POST') {
      const cors = localOnly(req, res);
      if (!cors) return;
      const chunks = [];
      let n = 0;
      for await (const c of req) {
        n += c.length;
        if (n > 4_000_000) { res.writeHead(413).end('too much'); return; }
        chunks.push(c);
      }
      const { appendFileSync, mkdirSync } = await import('node:fs');
      const dir = new URL('../.tap/', import.meta.url);
      try { mkdirSync(dir, { recursive: true }); } catch { /* already there */ }
      appendFileSync(new URL('log.jsonl', dir), Buffer.concat(chunks) + '\n');
      res.writeHead(204, cors).end();
      return;
    }

    if (rel === '_tap' && req.method === 'POST') {
      const cors = localOnly(req, res);
      if (!cors) return;
      const chunks = [];
      // A cap, because a keyboard can put 733 messages on the wire in eight
      // seconds and nothing here needs to accept an unbounded body.
      let n = 0;
      for await (const c of req) {
        n += c.length;
        if (n > 4_000_000) { res.writeHead(413).end('too much'); return; }
        chunks.push(c);
      }
      const { appendFileSync, mkdirSync } = await import('node:fs');
      const dir = new URL('../.tap/', import.meta.url);
      try { mkdirSync(dir, { recursive: true }); } catch { /* already there */ }
      appendFileSync(new URL('midi.jsonl', dir), Buffer.concat(chunks) + '\n');
      res.writeHead(204, cors).end();
      return;
    }
    if (rel === '_tap' && req.method === 'DELETE') {
      const cors = localOnly(req, res);
      if (!cors) return;
      const { writeFileSync, mkdirSync } = await import('node:fs');
      const dir = new URL('../.tap/', import.meta.url);
      try { mkdirSync(dir, { recursive: true }); } catch { /* already there */ }
      writeFileSync(new URL('midi.jsonl', dir), '');
      res.writeHead(204, cors).end();
      return;
    }
    if (rel === 'err-img') {
      const q = new URL(req.url, 'http://localhost').searchParams;
      const f = q.get('f') || '';
      if (!/^thumbnails\/\d{4}\/[A-Za-z0-9_.-]{1,160}\.jpg$/.test(f)) {
        res.writeHead(400).end('bad thumbnail path'); return;
      }
      const clamp = (v, lo, hi, dflt) => {
        const n = Number(v);
        return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : dflt;
      };
      const w = clamp(q.get('w'), 64, 512, 256);
      const h = clamp(q.get('h'), 48, 384, 192);
      try {
        const up = await fetch('https://arhiiv-img.err.ee/enlarge?type=optimize'
          + `&width=${w}&height=${h}&file=${encodeURIComponent(f)}`);
        if (!up.ok) { res.writeHead(up.status).end('upstream'); return; }
        const buf = Buffer.from(await up.arrayBuffer());
        res.writeHead(200, {
          'content-type': up.headers.get('content-type') || 'image/jpeg',
          'content-length': buf.length,
          'cache-control': 'public, max-age=604800',
        }).end(buf);
      } catch (e) { res.writeHead(502).end(String(e.message)); }
      return;
    }

    // /concepts/ forwards to the front page, as the deploy does; old concept addresses 404 on both.
    // why: lessons/harness.md#concepts
    if (rel === 'concepts' || rel === 'concepts/') {
      const q = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
      res.writeHead(302, { location: `/${q}` }).end();
      return;
    }
    if (rel === '') rel = 'demo/index.html';
    if (rel.endsWith('/')) rel = join(rel, 'index.html');
    // `/synth/keyboard` with no slash: a directory with a page in it gets the slash,
    // as the deployed site does, instead of a 404.
    else if (!extname(rel) && [ROOT, join(ROOT, 'demo')].some((r) => existsSync(join(r, rel, 'index.html')))) {
      const q = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
      res.writeHead(301, { location: `/${rel}/${q}` }).end();
      return;
    }
    // demo/<x> is served at /<x> as on the deploy: try the repo root, then demo/. Pages from
    // outside
    // demo/ use their manifest `src`, as the build does; never serve public/ (build output).
    // why: lessons/harness.md#local-deployed
    if (EXTRA.has(rel)) rel = EXTRA.get(rel);
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
  }
  return new Promise((ok, bad) => {
    let tries = 0;
    s.on('error', (e) => {
      if (e.code !== 'EADDRINUSE' || ++tries > 20) { bad(e); return; }
      s.listen(port + tries, '127.0.0.1');
    });
    s.listen(port, '127.0.0.1', () => {
      const got = s.address().port;
      if (got !== port) console.error(`(port ${port} was busy, so this is on ${got})`);
      ok(s);
    });
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // Print the port it got, not the one it asked for.
  // why: lessons/harness.md#boot-line
  const s = await serve();
  console.log(`demo server  http://127.0.0.1:${s.address().port}/demo/`);
}
