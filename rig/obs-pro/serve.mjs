// Serves the OBS source page and the test pattern to OBS's CEF.
//
// RUNS ON THE PRO, out of the Pro's own checkout of this repo, bound to
// 127.0.0.1. Two reasons it is local rather than fetched from the dev Mac:
//
//   · macOS Local Network Privacy is granted PER APP. A terminal process
//     inherits the grant; OBS.app and Chrome.app do not, so a browser source
//     pointed at 192.168.1.x renders ERR_ADDRESS_UNREACHABLE — a pure black
//     frame with nothing in any OBS log. 127.0.0.1 needs no grant.
//   · a standing test box must not stop working when a laptop sleeps.
//
// It serves demo/shell/pattern.mjs straight out of the working tree. That is a
// CHECKOUT, not a copy: `git` is the mechanism that makes drift visible, which
// is precisely what workers/pub's hand-maintained container copy lacks (it drew
// the pre-session-12 picture for a whole session and nothing said so). To keep
// that true this server refuses to start silently on an unknown revision — it
// prints the sha, and /rev serves it so a measurement can be attributed to a
// build the way BUILD attributes a device log.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT || 8899);
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const TYPES = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript' };

const git = (...a) => { try { return execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8' }).trim(); } catch { return ''; } };
const sha = git('rev-parse', '--short', 'HEAD') || 'unknown';
const dirty = git('status', '--porcelain') ? '-dirty' : '';
const REV = sha + dirty;

const ROUTES = {
  '/': 'rig/obs-pro/source.html',
  '/source.html': 'rig/obs-pro/source.html',
  '/pattern.mjs': 'demo/shell/pattern.mjs',      // the working tree's file, not a copy
};

createServer(async (req, res) => {
  const path = new URL(req.url, 'http://x').pathname;
  if (path === '/rev') {
    res.writeHead(200, { 'content-type': 'text/plain', 'cache-control': 'no-store' }).end(REV);
    return;
  }
  const rel = ROUTES[path];
  if (!rel) { res.writeHead(404).end('no'); return; }
  try {
    const body = await readFile(join(ROOT, rel));
    res.writeHead(200, {
      'content-type': TYPES[extname(rel)] || 'application/octet-stream',
      'cache-control': 'no-store',
      'x-positron-rev': REV,
    }).end(body);
  } catch (e) { res.writeHead(500).end(String(e)); }
}).listen(PORT, '127.0.0.1', () =>
  console.log(`obs-pro source  http://127.0.0.1:${PORT}/  rev ${REV}  (pattern.mjs from ${ROOT}demo/shell/)`));
