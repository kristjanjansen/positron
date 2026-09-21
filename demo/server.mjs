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
  // ⚠️ A FONT IS SERVED BY THIS TOO, and the deploy's static assets set the type
  // from the extension by themselves — so a missing entry here shows up ONLY on
  // the dev server and only as a browser being fussy, which is the shape of bug
  // that gets blamed on the page. (`.glb` is absent on purpose: the controller
  // models have always been served as octet-stream and browsers do not check.)
  '.woff2': 'font/woff2',
  /**
   * 🔴 MEDIA, ADDED 2026-09-18. `/stage/`'s film was served from here as
   * `application/octet-stream`, which is the bug the comment above predicts: the
   * deploy sets the type from the extension by itself, so a missing entry is
   * invisible until somebody develops against this server, and then it looks
   * like a browser being fussy about a page.
   * ⚠️ IT IS NOT CREDITED WITH A FIX. The stall that led here was a HIDDEN TAB
   * deferring media, not the content type, and the honest claim for this line is
   * the narrow one: serving an mp4 as a byte stream is wrong on its own terms.
   */
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg',
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
    /**
     * ── /_tap — what a plugged-in instrument sent, written where a session can
     * read it ──────────────────────────────────────────────────────────────
     *
     * 🔴 WHY THIS EXISTS. `/dump/` reads MIDI in a browser, and a browser is
     * somewhere a person is sitting rather than somewhere a session can look.
     * Getting four measurements off a real desk on 2026-09-20 meant driving a
     * second Chrome through an extension and reading its console back one
     * question at a time, which the person at the desk called ridiculous and
     * was right about: every reading cost a round trip, and a press that landed
     * between two of them was simply lost.
     *
     * ⚠️ IT IS THE DEV SERVER ONLY AND IT MUST STAY THAT WAY. There is no such
     * route in `workers/view/src/index.js`, deliberately, so a deployed
     * `/dump/` posts nowhere and a visitor's instrument is never written to
     * anybody's disk. That breaks this project's own LOCAL == DEPLOYED rule on
     * purpose, and the reason is that the rule exists so a page cannot work in
     * one place and fail in the other. **This is not a page feature.** It is a
     * wire between a desk and a session, and the page works identically with
     * nobody listening.
     *
     * ⚠️ APPEND, NEVER REPLACE. A capture is a recording of something that
     * happened once and cannot be repeated by asking again, which is exactly
     * the property that made the round trips expensive.
     */
    if (rel === '_tap' && req.method === 'POST') {
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
      res.writeHead(204, { 'access-control-allow-origin': '*' }).end();
      return;
    }
    if (rel === '_tap' && req.method === 'DELETE') {
      const { writeFileSync, mkdirSync } = await import('node:fs');
      const dir = new URL('../.tap/', import.meta.url);
      try { mkdirSync(dir, { recursive: true }); } catch { /* already there */ }
      writeFileSync(new URL('midi.jsonl', dir), '');
      res.writeHead(204, { 'access-control-allow-origin': '*' }).end();
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
      if (got !== port) console.error(`(port ${port} was busy, so this is on ${got})`);
      ok(s);
    });
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  /* 🔴 THE LINE A READER CLICKS HAS TO BE THE PORT IT GOT, NOT THE PORT IT
     ASKED FOR. MEASURED 2026-09-21: with 8890 already held, this printed
     `(port 8890 was busy, so this is on 8893)` on stderr and then
     `demo server http://127.0.0.1:8890/demo/` on stdout, so the two lines
     disagreed and the one that looks like the answer was the wrong one. The
     harnesses already read `server.address().port` back for exactly this
     reason, and the boot line was the one place still trusting the constant. */
  const s = await serve();
  console.log(`demo server  http://127.0.0.1:${s.address().port}/demo/`);
}
