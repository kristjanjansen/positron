// elektron-view — the public viewing surfaces of this repo on one URL.
//
// Static assets (public/, built by build.mjs) serve every page and every
// committed cache entry directly from the edge; this Worker only runs for the
// handful of paths below. Four pages ship: /proto/megatimeline/,
// /proto/remixer/, /proto/aikajana/, /proto/flipper/, plus a menu at /.
//
// ── the only reason this Worker exists: ONE proxied upstream, politely ──────
// arhiiv.err.ee's search is POST + JSON, so the browser forces an OPTIONS
// preflight, and the archive's OPTIONS answers 204 WITHOUT
// access-control-allow-origin (measured, research/err-archives-2026-08.md).
// So POST /api/v1/search cannot be called from a page and must be proxied.
// Everything else the pages need is already CORS-clear and goes DIRECT from
// the browser, untouched by us: content GETs (ACAO:*), vod.err.ee HLS,
// archive.org media, arhiiv-images thumbnails. Nothing media-shaped is ever
// proxied or stored here.
//
// ⚠️ CORRECTED 2026-09-14: "arhiiv-images thumbnails are CORS-clear" is true for
// an `<img>` and FALSE for a texture. MEASURED with an Origin header, both
// `arhiiv-images.err.ee` and the `arhiiv-img.err.ee` resizer answer 200 with NO
// `access-control-allow-origin` at all. A page can DISPLAY such an image; it
// cannot read its pixels, and `texImage2D` on one throws a SecurityError. So
// `/floor/` — a WebGL grid of archive thumbnails — needs them same-origin, which
// is the second proxied route below. The distinction is display versus READ,
// and it is invisible until something tries to read.
//
// This now runs on Cloudflare's network rather than one laptop, so the
// politeness that was a local `await sleep(1000)` has to become a real global
// gate. See the Gate Durable Object at the bottom, and DEPLOYED.md for the
// honest statement of what it does and does not guarantee.

const UPSTREAM = 'https://arhiiv.err.ee';
const UA = 'elektron-view/1.0 (+https://positron.studio; archive viewer prototype; contact kristjan.jansen@gmail.com)';

// The archive sends 2-day cache headers on its own responses. We honour them
// rather than inventing our own TTL.
const TTL_MS = 2 * 24 * 60 * 60 * 1000;

const MAX_BODY = 4000;          // search bodies are ~350 bytes; hard cap vs abuse
const SLUG_RE = /^[a-z0-9-]{1,120}$/;
const TYPE_RE = /^(audio|video|photo)$/;

// Isolate-local memo. Real, but per-isolate and lost on eviction — it is a
// nicety in front of the DO cache, never the guarantee.
const memo = new Map();
const MEMO_MAX = 60;

const json = (obj, status = 200, extra = {}) =>
  new Response(typeof obj === 'string' ? obj : JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...extra },
  });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// canonical query hash — MUST match build.mjs byte for byte, or committed
// cache entries silently stop being found and every query goes upstream.
const canon = (v) =>
  Array.isArray(v) ? v.map(canon)
    : v && typeof v === 'object'
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])]))
      : v;

async function queryHash(queryParams) {
  const bytes = new TextEncoder().encode(JSON.stringify(canon(queryParams)));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

function memoGet(k) {
  const hit = memo.get(k);
  if (!hit) return null;
  if (Date.now() - hit.at > TTL_MS) { memo.delete(k); return null; }
  return hit.body;
}
function memoPut(k, body) {
  memo.set(k, { at: Date.now(), body });
  if (memo.size > MEMO_MAX) memo.delete(memo.keys().next().value);
}

// ── the shared read path: memo → committed asset → DO cache → gated upstream ─
async function serveCached({ cacheKey, assetPath, upstreamReq, env, ctx, origin }) {
  const hit = memoGet(cacheKey);
  if (hit) return json(hit, 200, { 'x-positron-cache': 'memo', 'x-positron-upstream': '0' });

  // committed cache: shipped in the repo, exploded into public/cache/ at build
  // time. Permanent, global, free, and the reason a normal visit costs ERR
  // exactly nothing.
  const asset = await env.ASSETS.fetch(new URL(assetPath, origin));
  if (asset.ok) {
    const body = await asset.text();
    memoPut(cacheKey, body);
    return json(body, 200, { 'x-positron-cache': 'committed', 'x-positron-upstream': '0' });
  }

  const gate = env.GATE.get(env.GATE.idFromName('err'));

  // durable cache: anything this deployment has already fetched once, for
  // everyone, for 2 days. This is what stops N visitors becoming N calls.
  const cached = await gate.fetch(`https://gate/cache?k=${encodeURIComponent(cacheKey)}`);
  if (cached.status === 200) {
    const body = await cached.text();
    memoPut(cacheKey, body);
    return json(body, 200, { 'x-positron-cache': 'durable', 'x-positron-upstream': '0' });
  }

  // miss → ask the global gate for a slot
  const slotRes = await gate.fetch('https://gate/acquire', { method: 'POST' });
  const slot = await slotRes.json();
  if (!slot.ok) {
    return json(
      { error: 'upstream gated', reason: slot.reason, detail: slot.detail },
      503,
      { 'retry-after': String(Math.ceil((slot.waitMs ?? 2000) / 1000)), 'x-positron-cache': 'gated' },
    );
  }
  if (slot.waitMs > 0) await sleep(slot.waitMs);

  const t0 = Date.now();
  let up;
  try {
    up = await fetch(upstreamReq());
  } catch (e) {
    return json({ error: 'upstream unreachable', detail: String(e) }, 502);
  }
  const body = await up.text();
  if (up.status === 200) {
    memoPut(cacheKey, body);
    ctx.waitUntil(
      gate.fetch('https://gate/cache', {
        method: 'PUT',
        headers: { 'x-key': cacheKey },
        body,
      }).catch(() => {}),
    );
  }
  return json(body, up.status, {
    'x-positron-cache': 'miss',
    'x-positron-upstream': '1',
    'x-positron-gate-wait-ms': String(slot.waitMs),
    'x-upstream-ms': String(Date.now() - t0),
  });
}

// ── not ready to be found ───────────────────────────────────────────────────
//
// 🔴 positron.studio IS R&D AND MUST NOT BE INDEXED. Asked for 2026-09-16:
// "hide positron from Google ... no indexing. We are not ready."
//
// Three channels, and they do different jobs. The meta tag in each page is the
// weakest: it only covers HTML, and only HTML whose head carries it. robots.txt
// is the next: it stops a compliant crawler FETCHING, and does NOT stop one
// listing a URL it heard about elsewhere. `X-Robots-Tag` is the one that
// actually works, because it rides on EVERY response, HTML or not, and it is
// the only one of the three that removes a URL already in an index.
//
// ⚠️ THIS HEADER IS ONLY HALF THE SURFACE. Static assets are served by the edge
// BEFORE this Worker runs, so nothing here can reach them. `public/_headers`
// (written by build.mjs) is the other half, and the two must say the same thing.
const NOINDEX = 'noindex, nofollow';

/**
 * Every response this Worker returns, marked.
 *
 * ⚠️ A RESPONSE OUT OF THE CACHE API OR THE ASSET BINDING HAS IMMUTABLE
 * HEADERS, and `.set()` on one throws a TypeError rather than failing quietly.
 * Both kinds are returned from the routes below (`/err-img` serves a
 * `caches.default` hit, `/notes/<slug>` serves an `env.ASSETS` fetch), so this
 * rebuilds rather than mutating.
 * ⚠️ AND A BODY-LESS STATUS MUST NOT BE GIVEN A BODY: `/report` answers 204,
 * and `new Response(<body>, { status: 204 })` is a TypeError.
 */
function marked(res) {
  const bodyless = res.status === 204 || res.status === 304;
  const out = new Response(bodyless ? null : res.body, res);
  out.headers.set('x-robots-tag', NOINDEX);
  return out;
}

/**
 * 🔴 ONE `User-agent` PER GROUP. NEVER A SHARED ONE.
 *
 * The shared form (N `User-agent` lines above one `Allow`) is legal under
 * RFC 9309 and Meta's parser does not honour it: `facebookexternalhit` binds
 * directives to the NEAREST `User-agent` line only, so it fell through to
 * `* Disallow` and the Sharing Debugger reported a 403 while the edge had
 * served it 200 all afternoon. That is a synthetic code for "robots.txt
 * refuses me", and it sent the sibling project on an evening's tour of Bot
 * Fight Mode, Browser Integrity Check and AI Crawl Control before zone
 * analytics said the requests had never been blocked at all. Write this file
 * in the dumbest parser's dialect and the whole class of bug goes away.
 *
 * 🔴 AND ALLOWING THE PREVIEW BOTS IS A DELIBERATE CALL, NOT AN OVERSIGHT.
 * They build the card when somebody pastes a positron link into Slack,
 * Telegram, Discord or a chat. They do not build a search index, and the ask
 * was about search. A blanket `Disallow: /` takes those cards out everywhere,
 * silently, and the breakage is invisible from here. To go completely dark,
 * delete every group above `User-agent: *` and nothing else changes.
 */
const PREVIEW_BOTS = [
  'Twitterbot', 'Slackbot', 'Slack-ImgProxy', 'facebookexternalhit',
  'meta-externalfetcher', 'LinkedInBot', 'Discordbot', 'TelegramBot', 'WhatsApp',
];

const ROBOTS = `# positron.studio is R&D and is not ready to be found. Asked for 2026-09-16:
# "hide positron from Google, no indexing, we are not ready".
#
# THIS FILE IS THE POLITE HALF AND IT IS THE WEAKER HALF. robots.txt stops a
# compliant crawler FETCHING a page. It does not stop one LISTING a URL it
# heard about somewhere else, and a URL already in an index is only removed by
# a noindex the crawler is allowed to read. The gate that does the real work is
# the X-Robots-Tag header, which rides on every response from this site.
#
# The groups below are LINK PREVIEW bots, allowed on purpose: they render the
# card when somebody pastes a link into a chat, and they do not index. Delete
# them to go completely dark. One User-agent per group is not a style choice,
# it is what Meta's parser requires.

${PREVIEW_BOTS.map((b) => `User-agent: ${b}\nAllow: /\n`).join('\n')}
# Everybody else gets nothing, anywhere.
#
# Content-Signal is a machine-readable reservation of rights under Article 4 of
# EU Directive 2019/790. Cloudflare's free plan serves a default robots.txt that
# EXPLAINS these signals without expressing any preference, and it serves it
# only while a domain has no robots.txt of its own. This file replaces that
# default, so the preference is stated here rather than lost with it.
User-agent: *
Content-Signal: search=no, ai-input=no, ai-train=no
Disallow: /
`;

// 🔴 THE ROUTES LIVE HERE AND THE EXPORT IS BELOW THEM, so the header cannot be
// forgotten by a route that returns early. Adding one to `routes` is the only
// way to serve anything from this Worker, and there is exactly one way out.
const routes = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const p = url.pathname;

    // ── GET /robots.txt ────────────────────────────────────────────────────
    // Served from the Worker rather than committed into public/, so no build
    // allowlist and no asset route can drop it. Assets are tried first, so this
    // is reached only because build.mjs does not write a robots.txt; if one ever
    // appears in public/ it would win silently and this route would go dead.
    // ⚠️ HEAD AS WELL AS GET. Every other route here is GET-only and that is
    // fine, because the paths a crawler HEADs are static assets and the asset
    // server answers those itself. This one has no asset behind it, so a
    // GET-only guard sends a HEAD straight to the 404 below: `curl -sI` on it
    // read `404` while `curl -s` on the same URL read the file, which is the
    // shape of a bug that survives being tested.
    if (p === '/robots.txt' && (request.method === 'GET' || request.method === 'HEAD')) {
      return new Response(request.method === 'HEAD' ? null : ROBOTS, {
        headers: {
          'content-type': 'text/plain; charset=utf-8',
          // Short, because turning this off when the site IS ready should take
          // effect the same day rather than a week later. Meta caches robots
          // for about a day whatever we say here.
          'cache-control': 'public, max-age=3600',
        },
      });
    }

    // Not an open proxy, part 1: same-origin only. Our own pages are
    // same-origin so they always pass; a POST from anyone else's site carries
    // a foreign Origin and is refused. No CORS headers are ever sent, so no
    // third-party page can read a response even if it got one.
    const origin = request.headers.get('origin');
    if (origin && origin !== url.origin) {
      return json({ error: 'cross-origin use of this proxy is not allowed' }, 403);
    }

    // ── POST /api/search — the one genuinely proxied endpoint ──────────────
    if (p === '/api/search' && request.method === 'POST') {
      const raw = await request.text();
      if (raw.length > MAX_BODY) return json({ error: 'body too large' }, 413);

      let parsed;
      try { parsed = JSON.parse(raw); } catch { return json({ error: 'body must be JSON' }, 400); }

      // Not an open proxy, part 2: the path upstream is a constant, and the
      // body must look like the documented search query. Nothing a caller
      // sends can redirect this at another host, another path, or another verb.
      const qp = parsed && parsed.queryParams;
      if (!qp || typeof qp !== 'object' || Array.isArray(qp)) {
        return json({ error: 'expected {queryParams:{…}}' }, 400);
      }
      if (qp.type !== undefined && !(TYPE_RE.test(qp.type) || qp.type === 'all')) {
        return json({ error: 'bad type' }, 400);
      }
      const limit = Number(qp.limit ?? 20);
      if (!Number.isFinite(limit) || limit < 1 || limit > 500) return json({ error: 'bad limit' }, 400);

      const hash = await queryHash(qp);
      return serveCached({
        cacheKey: `search:${hash}`,
        assetPath: `/cache/search/${hash}.json`,
        origin: url.origin,
        env, ctx,
        upstreamReq: () => new Request(`${UPSTREAM}/api/v1/search`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'user-agent': UA, accept: 'application/json' },
          // re-serialise the VALIDATED object: whatever else was in the raw
          // body does not travel upstream
          body: JSON.stringify({ queryParams: qp }),
        }),
      });
    }

    // ── GET /api/item/{type}/{slug} — content record ───────────────────────
    // These are CORS-clear upstream and remixer fetches them direct; they route
    // through here for megatimeline only so the committed item cache applies.
    const m = p.match(/^\/api\/item\/([a-z]+)\/([^/]+)$/);
    if (m && request.method === 'GET') {
      const [, type, slug] = m;
      if (!TYPE_RE.test(type) || !SLUG_RE.test(slug)) return json({ error: 'bad item ref' }, 400);
      return serveCached({
        cacheKey: `item:${type}:${slug}`,
        assetPath: `/cache/item/${type}/${slug}.json`,
        origin: url.origin,
        env, ctx,
        upstreamReq: () => new Request(`${UPSTREAM}/api/v1/content/${type}/${slug}`, {
          headers: { 'user-agent': UA, accept: 'application/json' },
        }),
      });
    }

    // ── GET /err-img — a thumbnail, same-origin, so WebGL can READ it ──────
    //
    // 🔴 THE ONLY REASON THIS EXISTS IS THE CORS DISTINCTION IN THE HEADER.
    // These images are already public and already fetched direct by `reel` and
    // `remixer`; nothing here is being unlocked. What changes is that the bytes
    // arrive same-origin, so a texture upload is allowed to read them.
    //
    // Not an open proxy, same two parts as the search route: the upstream HOST
    // is a constant, and the only thing a caller controls is a path that must
    // match the archive's own thumbnail shape — a four-digit year folder and a
    // plain filename. No `..`, no slashes beyond the one, no other extension.
    // Size is clamped to a tile-sized range, because the point is a floor of
    // small pictures and an unbounded `width` is somebody else's bandwidth.
    if (p === '/err-img' && request.method === 'GET') {
      const f = url.searchParams.get('f') || '';
      if (!/^thumbnails\/\d{4}\/[A-Za-z0-9_.-]{1,160}\.jpg$/.test(f)) {
        return json({ error: 'bad thumbnail path' }, 400);
      }
      const clamp = (v, lo, hi, dflt) => {
        const n = Number(v);
        return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : dflt;
      };
      const w = clamp(url.searchParams.get('w'), 64, 512, 256);
      const h = clamp(url.searchParams.get('h'), 48, 384, 192);

      // ⚠️ A CACHE KEY THAT IS NOT THE REQUEST URL. The browser may send this
      // with any order of query parameters and any casing; the edge entry is
      // keyed on the three things that decide the bytes, so two spellings of
      // one picture are one entry rather than two upstream fetches.
      const key = new Request(`${url.origin}/err-img?f=${encodeURIComponent(f)}&w=${w}&h=${h}`,
        { method: 'GET' });
      const cache = caches.default;
      const hit = await cache.match(key);
      if (hit) return hit;

      const upstream = `https://arhiiv-img.err.ee/enlarge?type=optimize`
        + `&width=${w}&height=${h}&file=${encodeURIComponent(f)}`;
      let r;
      try {
        // ⚠️ `cf.cacheEverything` CACHES THE UPSTREAM FETCH, WHICH IS A DIFFERENT
        // CACHE FROM THE ONE ABOVE AND THAT IS THE POINT. `caches.default` is
        // per-COLO: a visitor in another region misses it and would go to the
        // archive. This makes the SUBREQUEST cacheable too, so a colo miss
        // still lands in Cloudflare's own cache rather than on somebody else's
        // server. Three layers, each covering the one before's miss:
        //   browser (cache-control below) → colo (caches.default) → CF (here)
        // and the archive is asked roughly once per picture, ever.
        r = await fetch(upstream, {
          headers: { 'user-agent': UA, accept: 'image/jpeg,image/*' },
          cf: { cacheEverything: true, cacheTtl: 31536000 },
        });
      } catch (e) {
        return json({ error: `thumbnail upstream unreachable: ${e.message}` }, 502);
      }
      if (!r.ok) return json({ error: `thumbnail upstream ${r.status}` }, r.status === 404 ? 404 : 502);

      // ⚠️ A THUMBNAIL OF A 1965 FILM DOES NOT CHANGE, so this is cached hard.
      // The BROWSER layer is the one that matters most for this page: a floor
      // re-asks for the same tiles every time you walk back over them, and a
      // week in the local cache means walking back costs nothing at all.
      // ⚠️ NOT stored in the repo, deliberately — 298 thumbnails is ~2 MB of
      // somebody else's images, and this file's own header says nothing
      // media-shaped is kept here. Proxied and cached is not the same as held.
      const out = new Response(r.body, {
        status: 200,
        headers: {
          'content-type': r.headers.get('content-type') || 'image/jpeg',
          'cache-control': 'public, max-age=604800, s-maxage=31536000, immutable',
          'x-content-type-options': 'nosniff',
        },
      });
      ctx.waitUntil(cache.put(key, out.clone()));
      return out;
    }

    // ── /icy/{mount}.mp3 — DELIBERATELY NOT PROXIED ────────────────────────
    // flipper's now-playing line wants icecast ICY metadata. Reading it means
    // opening the live MP3 stream and pulling audio bytes until a metadata
    // block arrives — i.e. running someone else's radio through this Worker to
    // scrape a song title. Not worth it. A well-formed empty answer keeps the
    // page's `catch {}` quiet and the console clean; the channel list, the
    // streams and the flipping all work without it.
    if (p.startsWith('/icy/') && request.method === 'GET') {
      const mount = p.slice(5);
      if (!/^[a-z0-9-]{1,40}\.mp3$/.test(mount)) return json({ error: 'bad mount' }, 400);
      return json(
        { mount, title: null, note: 'icy metadata proxy not deployed — see workers/view/DEPLOYED.md' },
        200, { 'cache-control': 'public, max-age=300' },
      );
    }

    // autotest report sink — the harnesses POST here. Accepted and dropped;
    // this deployment keeps nothing.
    if (p === '/report' && request.method === 'POST') {
      return new Response(null, { status: 204 });
    }

    // ── GET /api/stats — what the gate has actually done ───────────────────
    if (p === '/api/stats' && request.method === 'GET') {
      const gate = env.GATE.get(env.GATE.idFromName('err'));
      const s = await gate.fetch('https://gate/stats');
      return json(await s.text(), 200, { 'cache-control': 'no-store' });
    }

    // ── GET /notes/<slug> — a real path for a note ─────────────────────────
    // Assets are tried before this Worker runs, so `/notes/index.html` and
    // `/notes/<slug>.md` are already served and never reach here. What reaches
    // here is the READABLE form, which has no file behind it.
    //
    // The dot is not in the character class on purpose, so `<slug>.md` cannot
    // match this and shadow the asset it is named after.
    //
    // NO FALLBACK: the note must EXIST before the viewer is served. Serving the
    // viewer for any slug-shaped path gives a soft 404 — the reader sees "could
    // not load", while a crawler, a link checker and every automated caller see
    // 200 and success. A page that says it is broken is not the same as a site
    // that says so, and only one of them is true to anything but a human eye.
    const note = p.match(/^\/notes\/([a-z0-9-]+)\/?$/);
    if (note && request.method === 'GET') {
      const md = await env.ASSETS.fetch(new URL(`/notes/${note[1]}.md`, url.origin));
      if (!md.ok) {
        return new Response('no such note', { status: 404, headers: { 'content-type': 'text/plain' } });
      }
      return env.ASSETS.fetch(new URL('/notes/index.html', url.origin));
    }

    // Anything else that reached the Worker is a path with no static asset.
    return new Response('not found', { status: 404, headers: { 'content-type': 'text/plain' } });
  },
};

export default {
  async fetch(request, env, ctx) {
    return marked(await routes.fetch(request, env, ctx));
  },
};

// ────────────────────────────────────────────────────────────────────────────
// Gate — ONE Durable Object instance (idFromName('err')) in front of every
// upstream call this deployment makes.
//
// It is a real global gate, not a per-isolate approximation: every Worker
// isolate in every colo routes through this single object, and a Durable
// Object runs single-threaded, so the read-reserve-write below happens with no
// interleaving. The slot is reserved SYNCHRONOUSLY and the caller is told how
// long to wait before using it — the waiting happens in the Worker, not in
// here, so a queue costs DO time nothing and stays correctly spaced.
//
// Guarantees: upstream calls are spaced >= MIN_SPACING_MS apart globally, and
// there are at most DAY_CAP of them per UTC day, across all visitors.
// ────────────────────────────────────────────────────────────────────────────
const MIN_SPACING_MS = 1000;  // <= 1 request/second, globally
const MAX_WAIT_MS = 6000;     // deeper queue than this → 503 + Retry-After
const DAY_CAP = 400;          // hard ceiling per UTC day, all visitors together
const CACHE_ROWS = 150;       // durable response cache, oldest evicted
const CACHE_MAX_BYTES = 1_000_000;

export class Gate {
  constructor(state) {
    this.sql = state.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS cache (k TEXT PRIMARY KEY, at INTEGER, body TEXT)`);
  }

  get(k, dflt) {
    const row = this.sql.exec('SELECT v FROM meta WHERE k = ?', k).toArray()[0];
    return row ? JSON.parse(row.v) : dflt;
  }
  set(k, v) {
    this.sql.exec(
      'INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v',
      k, JSON.stringify(v),
    );
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/acquire') return this.acquire();

    if (url.pathname === '/cache') {
      if (request.method === 'PUT') {
        const key = request.headers.get('x-key') || '';
        const body = await request.text();
        if (key && body.length <= CACHE_MAX_BYTES) {
          this.sql.exec(
            'INSERT INTO cache (k, at, body) VALUES (?, ?, ?) ON CONFLICT(k) DO UPDATE SET at = excluded.at, body = excluded.body',
            key, Date.now(), body,
          );
          this.sql.exec(
            'DELETE FROM cache WHERE k IN (SELECT k FROM cache ORDER BY at DESC LIMIT -1 OFFSET ?)',
            CACHE_ROWS,
          );
        }
        return new Response(null, { status: 204 });
      }
      const key = url.searchParams.get('k') || '';
      const row = this.sql.exec('SELECT at, body FROM cache WHERE k = ?', key).toArray()[0];
      // honour the archive's 2-day freshness rather than serving forever
      if (!row || Date.now() - row.at > TTL_MS) return new Response(null, { status: 404 });
      return new Response(row.body, { status: 200 });
    }

    if (url.pathname === '/stats') {
      const rows = this.sql.exec('SELECT COUNT(*) AS n FROM cache').toArray()[0];
      return Response.json({
        spacingMs: MIN_SPACING_MS,
        dayCapUtc: DAY_CAP,
        day: this.get('day', null),
        upstreamToday: this.get('dayCount', 0),
        upstreamTotal: this.get('total', 0),
        refusedBusy: this.get('refusedBusy', 0),
        refusedCap: this.get('refusedCap', 0),
        durableCacheRows: rows ? rows.n : 0,
        nextSlotInMs: Math.max(0, this.get('lastAt', 0) + MIN_SPACING_MS - Date.now()),
      });
    }

    return new Response('not found', { status: 404 });
  }

  // Synchronous read-reserve-write. No `await` before the state is written, so
  // concurrent callers cannot both take the same slot.
  acquire() {
    const now = Date.now();
    const today = new Date(now).toISOString().slice(0, 10);

    if (this.get('day', null) !== today) {
      this.set('day', today);
      this.set('dayCount', 0);
    }
    const dayCount = this.get('dayCount', 0);
    if (dayCount >= DAY_CAP) {
      this.set('refusedCap', this.get('refusedCap', 0) + 1);
      return Response.json({ ok: false, reason: 'daily-cap', detail: `${DAY_CAP}/UTC day reached`, waitMs: 3600_000 });
    }

    const lastAt = this.get('lastAt', 0);
    const slotAt = Math.max(now, lastAt + MIN_SPACING_MS);
    const waitMs = slotAt - now;
    if (waitMs > MAX_WAIT_MS) {
      this.set('refusedBusy', this.get('refusedBusy', 0) + 1);
      return Response.json({ ok: false, reason: 'busy', detail: 'gate queue deeper than 6 s', waitMs });
    }

    this.set('lastAt', slotAt);
    this.set('dayCount', dayCount + 1);
    this.set('total', this.get('total', 0) + 1);
    return Response.json({ ok: true, waitMs, dayCount: dayCount + 1 });
  }
}
