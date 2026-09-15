// megatimeline server — static files + arhiiv.err.ee search proxy (remixer's
// preflight fix) + local JSONL caches + report sink. Plain node ESM, no deps.
// Port 8892 (this agent's assigned port).
//
// Why the search proxy exists (measured, see research/err-remixer-2026-08.md):
// the arhiiv API's responses carry ACAO:*, but the OPTIONS preflight forced by
// the JSON content type on POST /search returns 204 WITHOUT ACAO → browsers
// block the POST. So exactly one endpoint is proxied. Item content GETs would
// work direct from the page (simple request, ACAO:*), but they route through
// here too so the JSONL item cache absorbs revisits — politeness rule:
// item pages cached locally, census cached forever, ≤1 req/s upstream, ever.
//
// Thumbnails do NOT pass through here: the page loads them as plain DOM <img>
// straight from arhiiv-images.err.ee (native lazy loading). Nothing
// media-shaped is proxied or stored.

import http from 'node:http';
import https from 'node:https';
import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = 8892;
const SEARCH_CACHE_FILE = join(ROOT, 'search-cache.jsonl');
const ITEM_CACHE_FILE = join(ROOT, 'items-cache.jsonl');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.css': 'text/css',
};

// --- politeness stats (the autotest's proof) -------------------------------
const stats = {
  startedAt: new Date().toISOString(),
  upstreamSearch: 0, upstreamContent: 0,
  cacheHitSearch: 0, cacheHitItem: 0,
};

// --- JSONL caches, loaded at boot ------------------------------------------
function loadJsonl(file) {
  const map = new Map();
  if (!existsSync(file)) return map;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const { key, value } = JSON.parse(line);
      map.set(key, value);
    } catch { /* torn tail line — ignore */ }
  }
  return map;
}
const searchCache = loadJsonl(SEARCH_CACHE_FILE);
const itemCache = loadJsonl(ITEM_CACHE_FILE);
console.log(`caches: ${searchCache.size} search pages, ${itemCache.size} items`);

async function cachePut(file, map, key, value) {
  map.set(key, value);
  await appendFile(file, JSON.stringify({ key, value }) + '\n').catch((e) => console.error('cache write:', e));
}

// --- upstream, serialized + spaced >= 1 s over ALL archive API calls -------
let lastUpstreamAt = 0;
let chain = Promise.resolve();

function gated(fn) {
  const p = chain.then(async () => {
    const wait = Math.max(0, lastUpstreamAt + 1000 - Date.now());
    if (wait) await new Promise((r) => setTimeout(r, wait));
    lastUpstreamAt = Date.now();
    return fn();
  });
  chain = p.catch(() => {});
  return p;
}

function upstream(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: 'arhiiv.err.ee',
        headers: {
          'User-Agent': 'positron-megatimeline-proto/0.1',
          ...(body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {}),
        },
        ...options,
      },
      (res) => {
        let b = '';
        res.on('data', (c) => (b += c));
        res.on('end', () => resolve({ status: res.statusCode || 502, body: b }));
        res.on('error', reject);
      }
    );
    req.on('error', reject);
    req.setTimeout(25000, () => req.destroy(new Error('upstream timeout')));
    req.end(body);
  });
}

// --- server ----------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const json = (status, obj, extra = {}) => {
    res.writeHead(status, { 'Content-Type': 'application/json', ...extra });
    res.end(typeof obj === 'string' ? obj : JSON.stringify(obj));
  };

  // POST /api/search — proxied (broken upstream preflight) + JSONL-cached
  if (url.pathname === '/api/search' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 1e4) req.destroy(); });
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body); // must be JSON; fixed upstream path — not an open proxy
        const key = JSON.stringify(parsed.queryParams || parsed);
        if (searchCache.has(key)) {
          stats.cacheHitSearch++;
          return json(200, searchCache.get(key), { 'X-Cache': 'hit' });
        }
        const t0 = Date.now();
        const up = await gated(() => upstream({ path: '/api/v1/search', method: 'POST' }, body));
        if (up.status === 200) {
          stats.upstreamSearch++;
          await cachePut(SEARCH_CACHE_FILE, searchCache, key, up.body);
        }
        json(up.status, up.body, { 'X-Cache': 'miss', 'X-Upstream-Ms': String(Date.now() - t0) });
      } catch (e) {
        json(502, { error: String(e) });
      }
    });
    return;
  }

  // GET /api/item/{type}/{slug} — content record, JSONL-cached
  const m = url.pathname.match(/^\/api\/item\/(audio|video|photo)\/([a-z0-9-]+)$/);
  if (m && req.method === 'GET') {
    const [, type, slug] = m;
    const key = `${type}:${slug}`;
    if (itemCache.has(key)) {
      stats.cacheHitItem++;
      return json(200, itemCache.get(key), { 'X-Cache': 'hit' });
    }
    try {
      const t0 = Date.now();
      const up = await gated(() => upstream({ path: `/api/v1/content/${type}/${slug}`, method: 'GET' }));
      if (up.status === 200) {
        stats.upstreamContent++;
        await cachePut(ITEM_CACHE_FILE, itemCache, key, up.body);
      }
      json(up.status, up.body, { 'X-Cache': 'miss', 'X-Upstream-Ms': String(Date.now() - t0) });
    } catch (e) {
      json(502, { error: String(e) });
    }
    return;
  }

  if (url.pathname === '/api/stats') {
    return json(200, { ...stats, upstreamTotal: stats.upstreamSearch + stats.upstreamContent });
  }

  if (url.pathname === '/report' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 5e6) req.destroy(); });
    req.on('end', async () => {
      await writeFile(join(ROOT, 'autotest-report.json'), body).catch(() => {});
      console.log('[report]', body.slice(0, 300));
      json(200, { ok: true });
    });
    return;
  }

  // static. `/timeline/*` is served from the REPO ROOT so the page imports the
  // SHIPPED library (timeline/strip.mjs' aoristic()) rather than a copy — the
  // aggregate this surface draws and the one the strip draws must be the same
  // arithmetic, or "fixed in both" is a claim nobody can check.
  let file = url.pathname === '/' ? '/index.html' : url.pathname;
  file = normalize(file).replace(/^(\.\.[/\\])+/, '');
  const base = file.startsWith('/timeline/') ? join(ROOT, '../..') : ROOT;
  try {
    const data = await readFile(join(base, file));
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});

server.listen(PORT, () => console.log(`megatimeline on http://localhost:${PORT}`));
