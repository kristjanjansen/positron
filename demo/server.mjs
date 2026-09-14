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

/**
 * ⚠️ IF THE PORT IS TAKEN, TAKE THE NEXT ONE.
 *
 * A dev server left running on 8890 made every `node demo/verify.mjs` die with
 * an unhandled EADDRINUSE — three times in one session, each time reading as a
 * broken harness rather than as a port that was busy. The harness does not care
 * which port it gets; it only cares that it has one. Callers that need to know
 * read `server.address().port`, and `serve()` logs when it had to move.
 */
/** Pages the deploy copies in from outside demo/, by their served path. */
const EXTRA = new Map((await import('./manifest.mjs')).extraPages().map(([src, dst]) => [dst, src]));

export function serve(port = PORT) {
  const s = createServer(async (req, res) => {
    let rel = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^([/\\])+/, '');
    if (rel.includes('..')) { res.writeHead(400).end('no'); return; }
    // ── /err-img — the same route the deployed Worker serves ───────────────
    //
    // 🔴 LOCAL == DEPLOYED IS A RULE, NOT AN ASPIRATION, and this is where it
    // bit. `/floor/` asks its OWN ORIGIN for archive thumbnails because the
    // archive's image hosts send no `access-control-allow-origin` and a texture
    // upload may not read a cross-origin image. That route lives in
    // `workers/view/src/index.js` — so on the deploy the floor fills, and here
    // every request 404'd, every tile marked its picture dead, and the page drew
    // an empty rectangle while its checks all passed. A page that only works
    // deployed is a page nobody can develop.
    //
    // ⚠️ THE VALIDATION IS THE SAME SHAPE ON PURPOSE. If this one were looser,
    // a path that works here would be refused in production — which is the same
    // class of bug as the 404, wearing the opposite costume.
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

    if (rel === '') rel = 'demo/index.html';
    if (rel.endsWith('/')) rel = join(rel, 'index.html');
    // LOCAL == DEPLOYED. On the worker, demo/<x> is served at /<x>, so a page
    // asking for /shell/shell.css or /llhls/ must resolve here too — try the
    // repo root first, then inside demo/.
    //
    // Some pages are under neither root: the build copies them in from
    // elsewhere (the box's listener from rig/, the component sandbox). They
    // declare their own `src` in demo/manifest.mjs and BOTH ends read it, so
    // this rewrite and the build's copy list cannot disagree.
    //
    // ⚠️ Mapped rather than served out of workers/view/public/, which is BUILD
    // OUTPUT — serving that would test a copy and read green on a page the
    // build had not refreshed.
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
  });
  return new Promise((ok, bad) => {
    let tries = 0;
    s.on('error', (e) => {
      if (e.code !== 'EADDRINUSE' || ++tries > 20) { bad(e); return; }
      s.listen(port + tries, '127.0.0.1');
    });
    s.listen(port, '127.0.0.1', () => {
      const got = s.address().port;
      if (got !== port) console.error(`(port ${port} was busy — serving on ${got})`);
      ok(s);
    });
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await serve();
  console.log(`demo server  http://127.0.0.1:${PORT}/demo/`);
}
