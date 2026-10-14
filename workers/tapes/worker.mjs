// GET /tape?id=<corpus id>: archive.org recordings same-origin with CORS, so a page can read
// samples. Cached 30 days in browser, colo and Cloudflare. Not an open relay: the id must be a
// corpus row with a file on one of HOSTS, and the corpus is read off the site so it cannot drift.
// why: lessons/workers-tapes.md#header

// The four hosts the 128 corpus rows with a file live on, read off corpus.json.
// why: lessons/workers-tapes.md#hosts
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

// Who may read the answer in a browser. Loopback is for a dev server; the harness never reaches
// here.
// why: lessons/workers-tapes.md#origin-ok
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

// `vary: origin`, or a cache hands one caller's permission to another.
// why: lessons/workers-tapes.md#vary
function cors(origin) {
  const h = { 'vary': 'origin' };
  if (origin) {
    h['access-control-allow-origin'] = origin;
    // Without expose-headers a page cannot read content-length or content-range for a scrub bar.
    // why: lessons/workers-tapes.md#expose
    h['access-control-expose-headers'] =
      'content-length, content-range, content-type, accept-ranges';
  }
  return h;
}

const text = (body, status, origin, extra = {}) => new Response(body, {
  status,
  headers: { 'content-type': 'text/plain; charset=utf-8', ...cors(origin), ...extra },
});

// A cached subrequest to our own origin: one conditional request an hour per colo.
// why: lessons/workers-tapes.md#corpus
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

// Whole-id `===`, never a substring: `Saharan uni I` is a substring of `Saharan uni II`.
// why: lessons/workers-tapes.md#resolve
export function resolveTape(rows, id) {
  const row = rows.find((it) => it.id === id);
  if (!row) return { why: 'no row in corpus.json has that id' };
  if (!row.file) return { why: 'that row is a reference and has no file to fetch' };
  let u;
  try { u = new URL(row.file); } catch { return { why: 'that row\'s file is not a URL' }; }
  if (u.protocol !== 'https:') return { why: 'that row\'s file is not https' };
  if (!HOSTS.has(u.hostname)) {
    // Name the host, not the list: accepted hosts in an error body are hosts to try.
    // why: lessons/workers-tapes.md#name-host
    return { why: `${u.hostname} is not a host this proxy fetches from` };
  }
  return { url: u.toString(), title: row.title || '' };
}

// One normalised range in the key, so two spellings of one request are one entry.
// why: lessons/workers-tapes.md#range-key
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
      // HEAD as well as GET, or a HEAD falls through to the 404.
      // why: lessons/workers-tapes.md#head
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
    // The key is the upstream URL and range, not the incoming request's spelling.
    // why: lessons/workers-tapes.md#cache-key
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

    // Not `!up.ok`: a range request answers 206.
    // why: lessons/workers-tapes.md#206
    if (up.status !== 200 && up.status !== 206) {
      // Say whose refusal it is; a bare status reads as this worker being broken.
      // why: lessons/workers-tapes.md#whose
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
      // The cache gets a clone and the caller the stream, so bytes leave as they arrive.
      // why: lessons/workers-tapes.md#clone
      ctx.waitUntil(cache.put(key, body.clone()));
    }
    return dress(body, origin, key ? 'miss' : 'bypass');
  },
};

// A cached response has immutable headers, so CORS goes on a rebuilt response.
// why: lessons/workers-tapes.md#dress
function dress(res, origin, how) {
  const h = new Headers(res.headers);
  for (const [k, v] of Object.entries(cors(origin))) h.set(k, v);
  h.set('x-tape-cache', how);
  return new Response(res.body, { status: res.status, headers: h });
}
