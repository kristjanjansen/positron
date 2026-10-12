import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { join, extname } from 'node:path';
const ROOT = new URL('..', import.meta.url).pathname;
const T = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.wasm': 'application/wasm', '.onnx': 'application/octet-stream', '.f32': 'application/octet-stream', '.json': 'application/json' };
export function serve(isolate = true) {
  const s = createServer((req, res) => {
    const p = join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    let st; try { st = statSync(p); } catch { res.writeHead(404); return res.end(); }
    const h = { 'content-type': T[extname(p)] || 'application/octet-stream', 'content-length': st.size, 'cache-control': 'no-store' };
    if (isolate) { h['cross-origin-opener-policy'] = 'same-origin'; h['cross-origin-embedder-policy'] = 'require-corp'; h['cross-origin-resource-policy'] = 'same-origin'; }
    res.writeHead(200, h); createReadStream(p).pipe(res);
  });
  return new Promise((r) => s.listen(0, '127.0.0.1', () => r(s)));
}
