// elektron-view: positron.studio's Worker.
//
// Static assets (public/, built by build.mjs) serve every page directly from
// the edge, and this Worker runs only for paths with no asset behind them:
// /robots.txt, /err-img, /icy/*, /report, /notes/<slug>, a few redirects and
// the 404. Every response it returns carries X-Robots-Tag (see `marked`).
//
// The ERR search proxy (/api/search, /api/item, /api/stats) and the `Gate`
// Durable Object behind it were removed on 2026-10-14: nothing outside
// archive/ called them. wrangler.jsonc carries the migration that deletes Gate.
//
// /err-img stays because https://positron.studio/floor/ reads ERR thumbnails
// as WebGL textures. MEASURED 2026-09-14 with an Origin header: both
// `arhiiv-images.err.ee` and the `arhiiv-img.err.ee` resizer answer 200 with NO
// `access-control-allow-origin`. A page can DISPLAY such an image; it cannot
// read its pixels, and `texImage2D` on one throws a SecurityError. So the floor
// needs them same-origin. The distinction is display versus READ, and it is
// invisible until something tries to read.

const UA = 'elektron-view/1.0 (+https://positron.studio; archive viewer prototype; contact kristjan.jansen@gmail.com)';

const json = (obj, status = 200, extra = {}) =>
  new Response(typeof obj === 'string' ? obj : JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...extra },
  });

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

    // Same-origin only. Our own pages are
    // same-origin so they always pass; a POST from anyone else's site carries
    // a foreign Origin and is refused. No CORS headers are ever sent, so no
    // third-party page can read a response even if it got one.
    const origin = request.headers.get('origin');
    if (origin && origin !== url.origin) {
      return json({ error: 'cross-origin use of this worker is not allowed' }, 403);
    }

    // ── GET /err-img — a thumbnail, same-origin, so WebGL can READ it ──────
    //
    // 🔴 THE ONLY REASON THIS EXISTS IS THE CORS DISTINCTION IN THE HEADER.
    // These images are already public and already fetched direct by `reel` and
    // `remixer`; nothing here is being unlocked. What changes is that the bytes
    // arrive same-origin, so a texture upload is allowed to read them.
    //
    // Not an open proxy: the upstream HOST is a constant, and the only thing a
    // caller controls is a path that must match the archive's own thumbnail
    // shape: a four-digit year folder and a plain filename. No `..`, no slashes beyond the one, no other extension.
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
      // somebody else's images, and nothing media-shaped is kept
      // here. Proxied and cached is not the same as held.
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

    // ── /frontpage, 2026-10-12 ─────────────────────────────────────────────
    // Asked three times for https://positron.studio/frontpage: the samples live
    // at /kit/frontpage/. 302, because a real /frontpage/ page may come.
    if (p === '/frontpage' || p === '/frontpage/') {
      return Response.redirect(`${url.origin}/kit/frontpage/${url.search}`, 302);
    }

    // ── /concepts/ is the front page, 2026-10-13 ──────────────────────────
    // *"when all is done, move concepts to frontpage"*: the concepts index is
    // demo/index.html at / now, and the old index address forwards there. The
    // index ONLY: a concept page's old /concepts/<group>/<number>/ address is a
    // 404 and stays one (positron-concepts: no old address forwarding), so this
    // matches the two exact paths and nothing under them. 302, as /frontpage.
    if (p === '/concepts' || p === '/concepts/') {
      return Response.redirect(`${url.origin}/${url.search}`, 302);
    }

    // ── /eccm/* moved out, 2026-09-27 ──────────────────────────────────────
    // The eccm demo lived under demo/eccm/ for two days and its URLs were
    // handed over from here; the project is its own repository now and the
    // site is https://eccm.positron.studio/ (plans went with it). Same path
    // there, query kept, 301 because nothing is coming back. Assets are tried
    // before the Worker, so this is reached only because the build no longer
    // writes public/eccm/.
    if (p === '/eccm' || p.startsWith('/eccm/')) {
      return Response.redirect(`https://eccm.positron.studio${p.slice(5) || '/'}${url.search}`, 301);
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
