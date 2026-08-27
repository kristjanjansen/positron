// proto/automation/server.mjs — static rig server for the CONTINUOUS-CONTROL
// demos, on :8888. Plain node ESM, no deps, no build step.
//
//   GET  /                  -> xy.html
//   GET  /<path>            static from proto/automation/
//   GET  /timeline/<path>   the repo's SHARED timeline library — aliased, never
//                           copied (same file proto/jam, proto/instrument and
//                           timeline/lab all import)
//   GET  /media/<path>      read-only alias onto proto/selfrec/artifacts, so
//                           automation.html can be pointed at a REAL media file
//                           (?media=/media/a1-concat.webm) instead of its
//                           generated one
//   GET  /time-local        {us} hrtime-anchored epoch µs
//   POST /result/<name>     write results/<name>.json
//
// Nothing here is ever on a measured path.

import http from 'node:http';
import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const REPO = join(ROOT, '..', '..');
const MEDIA = join(REPO, 'proto', 'selfrec', 'artifacts');
const PORT = +(process.env.PORT || 8888);

const anchorUs = Date.now() * 1000 - Number(process.hrtime.bigint() / 1000n);
const nowUs = () => anchorUs + Number(process.hrtime.bigint() / 1000n);

const MIME = {
  html: 'text/html', js: 'text/javascript', mjs: 'text/javascript', json: 'application/json',
  css: 'text/css', png: 'image/png', jsonl: 'application/x-ndjson', md: 'text/plain',
  webm: 'video/webm', mp4: 'video/mp4', wav: 'audio/wav',
};

async function body(req) {
  const cs = [];
  for await (const c of req) cs.push(c);
  return Buffer.concat(cs).toString('utf8');
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  try {
    if (p === '/time-local') {
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      return res.end(JSON.stringify({ us: nowUs() }));
    }
    if (req.method === 'POST' && (p.startsWith('/result/') || p.startsWith('/log/'))) {
      const isLog = p.startsWith('/log/');
      const name = p.slice(isLog ? 5 : 8);
      if (!/^[\w.-]{1,128}$/.test(name)) { res.writeHead(400); return res.end('bad name'); }
      const data = await body(req);
      const file = join(ROOT, 'results', name + (isLog ? '.jsonl' : '.json'));
      if (isLog) await appendFile(file, data.endsWith('\n') ? data : data + '\n');
      else await writeFile(file, data);
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end('{"ok":true}');
    }
    let rel = normalize(p === '/' ? '/xy.html' : p).replace(/^\/+/, '');
    if (rel.includes('..')) { res.writeHead(403); return res.end(); }
    const tries = rel.startsWith('timeline/') ? [join(REPO, rel)]
      : rel.startsWith('media/') ? [join(MEDIA, rel.slice(6))]
      : [join(ROOT, rel)];
    for (const file of tries) {
      try {
        const data = await readFile(file);
        res.writeHead(200, {
          'content-type': MIME[rel.split('.').pop()] || 'application/octet-stream',
          'cache-control': 'no-store', 'accept-ranges': 'bytes',
        });
        return res.end(data);
      } catch { /* next */ }
    }
    res.writeHead(404); res.end('not found: ' + rel);
  } catch (e) {
    res.writeHead(500); res.end(String(e && e.message));
  }
});
server.listen(PORT, '127.0.0.1', () => console.log(`automation rig :${PORT} root=${ROOT}`));
