// Serves the OBS source page and test pattern on 127.0.0.1 from the M1's own checkout:
// OBS.app has no Local Network grant, so a LAN address renders black. /rev serves the git sha.
// why: lessons/rig-obs.md#obs-serve
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
