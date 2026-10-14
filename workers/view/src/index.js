// elektron-view, positron.studio's Worker. Assets are served by the edge first; this runs only for
// paths with no asset: /robots.txt, /err-img, /icy/*, /report, /notes/<slug>, redirects, the 404.
// /err-img exists because ERR thumbnails send no ACAO, so WebGL can display but not read them.
// why: lessons/workers-view.md#header

const UA = 'elektron-view/1.0 (+https://positron.studio; archive viewer prototype; contact kristjan.jansen@gmail.com)';

const json = (obj, status = 200, extra = {}) =>
  new Response(typeof obj === 'string' ? obj : JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...extra },
  });

// Not to be indexed. X-Robots-Tag rides on every response and is the only channel that removes an
// indexed URL. Assets skip this Worker, so public/_headers (build.mjs) must say the same.
// why: lessons/workers-view.md#noindex
const NOINDEX = 'noindex, nofollow';

// Rebuilds rather than mutates: cache and asset responses have immutable headers (`.set()` throws),
// and a 204 must not be given a body.
// why: lessons/workers-view.md#marked
function marked(res) {
  const bodyless = res.status === 204 || res.status === 304;
  const out = new Response(bodyless ? null : res.body, res);
  out.headers.set('x-robots-tag', NOINDEX);
  return out;
}

// One `User-agent` per group, never shared: Meta's parser binds directives to the nearest line
// only.
// Preview bots are allowed on purpose (link cards); to go dark, delete every group above `*`.
// why: lessons/workers-view.md#robots-groups
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

// Routes live here and the export below, so no route can return without the header.
// why: lessons/workers-view.md#routes
const routes = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const p = url.pathname;

    // GET /robots.txt from the Worker so no build allowlist can drop it; a public/robots.txt would
    // win
    // silently. HEAD as well as GET, since no asset answers HEAD for it.
    // why: lessons/workers-view.md#robots
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

    // Same-origin only; no CORS headers, so no other site can read a response.
    // why: lessons/workers-view.md#same-origin
    const origin = request.headers.get('origin');
    if (origin && origin !== url.origin) {
      return json({ error: 'cross-origin use of this worker is not allowed' }, 403);
    }

    // GET /err-img: an ERR thumbnail same-origin so WebGL can read it. Not an open proxy: constant
    // host,
    // path must be a four-digit year folder and a plain filename; size clamped to tiles.
    // why: lessons/workers-view.md#err-img
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

      // Keyed on file, width and height, not the request URL, so two spellings are one entry.
      // why: lessons/workers-view.md#cache-key
      const key = new Request(`${url.origin}/err-img?f=${encodeURIComponent(f)}&w=${w}&h=${h}`,
        { method: 'GET' });
      const cache = caches.default;
      const hit = await cache.match(key);
      if (hit) return hit;

      const upstream = `https://arhiiv-img.err.ee/enlarge?type=optimize`
        + `&width=${w}&height=${h}&file=${encodeURIComponent(f)}`;
      let r;
      try {
        // `caches.default` is per colo; `cf.cacheEverything` makes the subrequest cacheable too.
        // Browser, then colo, then Cloudflare: the archive is asked about once per picture.
        // why: lessons/workers-view.md#cache-everything
        r = await fetch(upstream, {
          headers: { 'user-agent': UA, accept: 'image/jpeg,image/*' },
          cf: { cacheEverything: true, cacheTtl: 31536000 },
        });
      } catch (e) {
        return json({ error: `thumbnail upstream unreachable: ${e.message}` }, 502);
      }
      if (!r.ok) return json({ error: `thumbnail upstream ${r.status}` }, r.status === 404 ? 404 : 502);

      // A thumbnail does not change, so cached a week in the browser. Proxied, not stored in the
      // repo.
      // why: lessons/workers-view.md#cache-hard
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

    // /icy/{mount}.mp3 deliberately not proxied: reading ICY metadata means pulling someone's radio
    // through here. A well-formed empty answer keeps the page quiet.
    // why: lessons/workers-view.md#icy
    if (p.startsWith('/icy/') && request.method === 'GET') {
      const mount = p.slice(5);
      if (!/^[a-z0-9-]{1,40}\.mp3$/.test(mount)) return json({ error: 'bad mount' }, 400);
      return json(
        { mount, title: null, note: 'icy metadata proxy not deployed — see workers/view/DEPLOYED.md' },
        200, { 'cache-control': 'public, max-age=300' },
      );
    }

    // The harnesses' report sink: accepted and dropped.
    // why: lessons/workers-view.md#report
    if (p === '/report' && request.method === 'POST') {
      return new Response(null, { status: 204 });
    }

    // GET /notes/<slug>, the readable form (the .md and index are assets). No dot in the class, so
    // it
    // cannot shadow `<slug>.md`. The note must exist first: no soft 404s.
    // why: lessons/workers-view.md#notes
    const note = p.match(/^\/notes\/([a-z0-9-]+)\/?$/);
    if (note && request.method === 'GET') {
      const md = await env.ASSETS.fetch(new URL(`/notes/${note[1]}.md`, url.origin));
      if (!md.ok) {
        return new Response('no such note', { status: 404, headers: { 'content-type': 'text/plain' } });
      }
      return env.ASSETS.fetch(new URL('/notes/index.html', url.origin));
    }

    // /frontpage: the samples live at /kit/frontpage/. 302, since a real page may come.
    // why: lessons/workers-view.md#frontpage
    if (p === '/frontpage' || p === '/frontpage/') {
      return Response.redirect(`${url.origin}/kit/frontpage/${url.search}`, 302);
    }

    // /concepts/ forwards to / (the front page). The two exact paths only: old concept addresses
    // stay 404.
    // why: lessons/workers-view.md#concepts
    if (p === '/concepts' || p === '/concepts/') {
      return Response.redirect(`${url.origin}/${url.search}`, 302);
    }

    // /eccm/* moved to https://eccm.positron.studio/, same path and query, 301.
    // why: lessons/workers-view.md#eccm
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
