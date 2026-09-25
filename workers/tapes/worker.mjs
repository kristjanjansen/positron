// workers/tapes/worker.mjs: a read-through proxy for the recordings `/tapes/` plays.
//
//   GET /tape?id=<a corpus id>     the recording, with CORS headers on it
//   GET /                          one line saying what this is
//
// 🔴 WHY IT EXISTS, AND IT IS NOT A CONVENIENCE. Asked, verbatim: *"this
// recordin wil noot allow read its sound: make proxy"*. Every recording on
// `/tapes/` is on archive.org, which redirects a download to a storage node,
// and that node does not always send `access-control-allow-origin`. Without it
// `crossOrigin = 'anonymous'` is refused outright, so the page reopens the
// element WITHOUT the crossing: the tape plays and the audio graph is TAINTED,
// which means the analyser is allowed to run and is not allowed to return real
// numbers. The recording is audible and its sound cannot be read, so there is
// no waveform for that one. A same-origin hop is the only thing that fixes it,
// because "may I display this" and "may I read its samples" are different
// permissions and only the second one is missing.
//
// 🔴 IT IS GENERAL, NOT ONE FILE, AND THAT IS A DECISION RATHER THAN SCOPE
// CREEP. Which recording prompted the ask is NOT KNOWN: *"this recordin"*
// points at something that was on screen. Probing the twenty-three to find out
// which ones refuse is the exact thing the standing external-source rule
// forbids, so nothing here was measured against archive.org and nothing here
// may be. Any corpus row can be read through this, the page reaches for it only
// after a recording has actually refused, and no run of anything in this
// repository touches it. See `demo/tapes/index.html`'s `retryOpen`.
//
// 🔴 A PROXY DOES NOT REMOVE THE FETCH, IT MOVES IT FROM THE BROWSER TO HERE,
// SO IT HAS TO CACHE OR IT IS THE SAME LOAD ON SOMEBODY ELSE'S SERVER WITH AN
// EXTRA HOP. Three layers, each covering the one before's miss, which is the
// arrangement `workers/view/src/index.js` already uses for the archive images:
//
//   · the BROWSER, through `cache-control: public, max-age=2592000, immutable`
//   · this COLO, through `caches.default`, keyed on the upstream URL plus the
//     range asked for. ⚠️ `caches.default` IS PER COLO, so a listener in
//     another region misses it entirely, which is what the third layer is for.
//   · CLOUDFLARE, through `cf: { cacheEverything: true, cacheTtl: 2592000 }` on
//     the subrequest, so a colo miss still lands in Cloudflare's own cache
//     rather than on archive.org.
//
// THIRTY DAYS on all three. These are archival recordings of work finished in
// the 1960s and 70s, deposited years ago and never edited: a URL that answers
// today answers the same bytes next month, and the only thing a short TTL would
// buy is more requests to a public archive. ⚠️ THE CONSEQUENCE IS THE POINT:
// past the first listen, one recording costs archive.org one GET per range per
// colo per thirty days, whoever is listening and however many times.
//
// 🔴 AND IT IS NOT AN OPEN RELAY. An unbounded URL parameter would make this a
// bandwidth laundromat for whoever finds it, and the account's egress is the
// project's. `workers/shout/worker.mjs` refuses the same thing for the same
// reason. Two gates, and the FIRST is the load-bearing one:
//
//   1. THE CORPUS. The caller names an `id`, never a URL. The id has to be a
//      row in `corpus.json` that carries a `file`, and the answer is that row's
//      own URL. There is no shape of input that reaches a URL the corpus does
//      not already hold.
//   2. THE HOST. That URL's host has to be one of the four the corpus actually
//      uses. ⚠️ IT IS A SECOND TEST AND NOT A RESTATEMENT OF THE FIRST: the
//      corpus is a generated file that grows rows from new sources, and a row
//      pointing somewhere nobody weighed should not become proxyable by being
//      committed.
//
// ⚠️ AN `Origin` ALLOWLIST IS NOT SECURITY AND IS NOT DESCRIBED AS ONE HERE. A
// browser sets that header and a page cannot forge it, so it stops a stray tab
// on another site; anything that is not a browser sends whatever it likes. What
// it buys is that the accidents cannot happen. The corpus gate above is what
// bounds the damage, because it bounds the SET OF URLS rather than the callers.
//
// ⚠️ THE CORPUS IS READ OFF THE SITE RATHER THAN BUNDLED INTO THIS WORKER, so
// it cannot drift from the page. `demo/fake-tapes.mjs` reads its paths off the
// same file for the same reason, written down there as *"so it cannot drift
// from the page"*. A copy compiled in here would be right on the day it was
// deployed and quietly wrong after the next corpus rebuild.

/** The four hosts the 128 rows with a file actually live on, READ off
 *  `corpus.json` on 2026-09-25 rather than recalled. */
const HOSTS = new Set([
  'archive.org',
  'web.archive.org',
  'upload.wikimedia.org',
  'zenodo.org',
]);

/** Thirty days, in seconds. See the note above for why it is not thirty minutes. */
const TTL = 2592000;

/** How long a cached copy of `corpus.json` is trusted, in seconds. Short,
 *  because it is OUR file on OUR origin and the cost of asking is nothing. */
const CORPUS_TTL = 3600;

const CORPUS_DEFAULT = 'https://positron.studio/resources/corpus.json';

/**
 * Who may read the answer in a browser.
 *
 * ⚠️ THE LOOPBACK ENTRIES ARE FOR A DEVELOPMENT SERVER AND THEY COST NOTHING
 * HERE, because a page on `127.0.0.1` can only ever be one somebody is running
 * on their own machine. The harness never reaches this worker at all: pointed
 * at `demo/fake-tapes.mjs` the page disables the proxy outright.
 */
export const originOk = (o) => {
  if (!o) return null;
  if (o === 'https://positron.studio') return o;
  try {
    const u = new URL(o);
    if (u.protocol === 'http:' && (u.hostname === '127.0.0.1' || u.hostname === 'localhost')) return o;
    if (u.protocol === 'https:' && u.hostname.endsWith('.positron.studio')) return o;
  } catch { /* a header that is not a URL is not an origin */ }
  return null;
};

/**
 * ⚠️ `vary: origin` OR A CACHE HANDS ONE CALLER'S PERMISSION TO ANOTHER. The
 * echo is per caller, so the entry it is attached to has to say so.
 */
function cors(origin) {
  const h = { 'vary': 'origin' };
  if (origin) {
    h['access-control-allow-origin'] = origin;
    // 🔴 WITHOUT `expose-headers` A BROWSER SEES THE RESPONSE AND NOT ONE HEADER
    // OF IT, and a page that cannot read `content-length` or `content-range`
    // cannot draw a scrub bar for a recording. `workers/shout/worker.mjs`
    // carries the same line for the same reason.
    h['access-control-expose-headers'] =
      'content-length, content-range, content-type, accept-ranges';
  }
  return h;
}

const text = (body, status, origin, extra = {}) => new Response(body, {
  status,
  headers: { 'content-type': 'text/plain; charset=utf-8', ...cors(origin), ...extra },
});

/**
 * The corpus, through the cache.
 *
 * ⚠️ IT IS A SUBREQUEST TO OUR OWN ORIGIN AND IT IS CACHED TWICE, so the cost of
 * being drift-free is one conditional request an hour per colo rather than one
 * per listener.
 */
async function corpusRows(env, ctx) {
  const url = env?.CORPUS || CORPUS_DEFAULT;
  const r = await fetch(url, {
    cf: { cacheEverything: true, cacheTtl: CORPUS_TTL },
    headers: { 'user-agent': 'positron-tapes (https://positron.studio)' },
  });
  if (!r.ok) return null;
  const doc = await r.json();
  return Array.isArray(doc?.items) ? doc.items : null;
}

/**
 * Turn an id into the URL the corpus says that recording lives at, or a reason.
 *
 * 🔴 MATCHED WITH `===` ON THE WHOLE ID, NEVER ON A SUBSTRING. This repository's
 * standing rule, from three bugs in one day where `BUILD` matched inside
 * `REBUILD`, and the corpus is full of ids that contain each other: `Saharan
 * uni I` is a substring of `Saharan uni II`.
 */
export function resolveTape(rows, id) {
  const row = rows.find((it) => it.id === id);
  if (!row) return { why: 'no row in corpus.json has that id' };
  if (!row.file) return { why: 'that row is a reference and has no file to fetch' };
  let u;
  try { u = new URL(row.file); } catch { return { why: 'that row\'s file is not a URL' }; }
  if (u.protocol !== 'https:') return { why: 'that row\'s file is not https' };
  if (!HOSTS.has(u.hostname)) {
    // ⚠️ IT NAMES THE HOST RATHER THAN THE LIST. A list of accepted hosts in an
    // error body is a list of hosts to try.
    return { why: `${u.hostname} is not a host this proxy fetches from` };
  }
  return { url: u.toString(), title: row.title || '' };
}

/**
 * ⚠️ ONE NORMALISED RANGE IN THE CACHE KEY, NOT THE RAW HEADER. A media element
 * asks for a small set of ranges and writes them in more than one spelling, and
 * two spellings of one request must not be two entries and two fetches.
 */
export function rangeKey(header) {
  if (!header) return 'whole';
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim().toLowerCase());
  if (!m) return null;                       // anything else goes straight upstream, uncached
  return `${m[1] || '0'}-${m[2] || ''}`;
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const origin = originOk(req.headers.get('origin'));

    if (req.method === 'OPTIONS') {
      // A ranged GET from a media element does not preflight in any engine
      // measured here, and answering one costs nothing and removes a class of
      // failure that reads as a CORS bug in the page.
      return new Response(null, {
        status: 204,
        headers: {
          ...cors(origin),
          'access-control-allow-methods': 'GET, HEAD, OPTIONS',
          'access-control-allow-headers': 'range',
          'access-control-max-age': '86400',
        },
      });
    }

    if (url.pathname === '/' || url.pathname === '') {
      return text('positron-tapes: a cached, corpus-scoped read-through proxy for the '
        + 'recordings /tapes/ plays, so a page may READ their sound.\n'
        + 'GET /tape?id=<a corpus id>\n', 200, origin);
    }

    if (url.pathname !== '/tape') return text('no such route\n', 404, origin);
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      // ⚠️ HEAD AS WELL AS GET. A GET-only guard sends a HEAD to the 404, which
      // is the shape of bug that survives being tested.
      return text('GET or HEAD\n', 405, origin, { allow: 'GET, HEAD, OPTIONS' });
    }

    const id = url.searchParams.get('id');
    if (!id) return text('give it ?id=<a corpus id>\n', 400, origin);

    const rows = await corpusRows(env, ctx);
    if (!rows) return text('the corpus could not be read, so nothing can be resolved\n', 502, origin);

    const got = resolveTape(rows, id);
    if (got.why) return text(`${got.why}\n`, 404, origin);

    const rk = rangeKey(req.headers.get('range'));
    const cache = caches.default;
    // ⚠️ THE KEY IS NOT THE INCOMING REQUEST. A caller may spell the id with any
    // escaping and send any order of parameters, and all of those are one entry:
    // the upstream URL and the range decide the bytes, so they are the key.
    const key = rk === null ? null
      : new Request(`https://tape.invalid/${encodeURIComponent(got.url)}#${rk}`, { method: 'GET' });

    if (key) {
      const hit = await cache.match(key);
      if (hit) return dress(hit, origin, 'hit');
    }

    const up = await fetch(got.url, {
      method: 'GET',
      headers: {
        // Cloudflare's edge 1010-blocks generic user agents, so a
        // server-to-server fetch has to send a real one, and a public archive
        // deserves to be able to see who is asking.
        'user-agent': 'positron-tapes (https://positron.studio)',
        ...(req.headers.get('range') ? { range: req.headers.get('range') } : {}),
      },
      // The third layer. See the header.
      cf: { cacheEverything: true, cacheTtl: TTL },
    });

    // 🔴 NOT `!up.ok`. A RANGE REQUEST ANSWERS 206, which is not `ok` on some
    // readings and is exactly what a working seek looks like.
    if (up.status !== 200 && up.status !== 206) {
      // ⚠️ IT SAYS WHOSE REFUSAL IT IS. A bare status here reads as this worker
      // being broken, and the two have completely different fixes.
      return text(`the archive answered ${up.status} for ${got.title || id}\n`, 502, origin);
    }

    const body = new Response(up.body, {
      status: up.status,
      headers: {
        'content-type': up.headers.get('content-type') || 'application/octet-stream',
        ...(up.headers.get('content-length') ? { 'content-length': up.headers.get('content-length') } : {}),
        ...(up.headers.get('content-range') ? { 'content-range': up.headers.get('content-range') } : {}),
        'accept-ranges': up.headers.get('accept-ranges') || 'bytes',
        'cache-control': `public, max-age=${TTL}, immutable`,
      },
    });

    if (key) {
      // ⚠️ THE CACHE GETS A CLONE AND THE CALLER GETS THE STREAM, so the bytes
      // leave as they arrive rather than after the whole recording has been
      // read into this isolate.
      ctx.waitUntil(cache.put(key, body.clone()));
    }
    return dress(body, origin, key ? 'miss' : 'bypass');
  },
};

/**
 * ⚠️ A RESPONSE OUT OF THE CACHE API HAS IMMUTABLE HEADERS and `.set()` on one
 * throws a TypeError rather than failing quietly, so the CORS echo is put on a
 * rebuilt response rather than on the one that came back.
 */
function dress(res, origin, how) {
  const h = new Headers(res.headers);
  for (const [k, v] of Object.entries(cors(origin))) h.set(k, v);
  h.set('x-tape-cache', how);
  return new Response(res.body, { status: res.status, headers: h });
}
