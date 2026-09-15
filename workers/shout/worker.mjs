// positron-shout — an Icecast/SHOUTcast stream, relayed through Cloudflare.
//
// WHY A RELAY AT ALL. The origin (Icecast 2.4.4 at icecast.err.ee) sends NO
// `access-control-allow-origin`, so a browser can put it in an <audio> element
// and nothing else: no fetch, no WebAudio graph, no reading `icy-metaint`, no
// measuring anything. `<audio src>` is a no-cors load — it plays and stays
// opaque. The relay's entire job is to hand the same bytes back with CORS on
// them, which is what turns a radio stream into something a page can measure.
//
// NOT AN OPEN PROXY. STATIONS is an allowlist; anything else is 404. An
// unbounded URL parameter here would make this worker a bandwidth laundromat
// for whoever finds it, and the account's egress is the project's.
//
// The body is passed through UNTOUCHED and UNBUFFERED: `new Response(up.body)`
// hands Cloudflare the upstream ReadableStream, so bytes leave as they arrive.
// Anything that reads the stream here (a TransformStream that inspects ICY
// metadata, say) would add a hop of latency to every byte for no gain — the
// metadata is already in the frames the client parses.

const ERR = 'https://icecast.err.ee';

/**
 * id -> the FULL upstream URL, allowlisted.
 *
 * ⚠️ THIS WAS `id -> path` AGAINST ONE `ORIGIN` CONSTANT, and that held exactly
 * as long as every station was ERR's. A single origin is a shared mutable
 * global of the same family as a fixed port: it is a property of the first
 * caller that gets silently imposed on the second. Full URLs cost one repeated
 * hostname and let a station live anywhere.
 *
 * 🔴 `radio1965` IS PLAIN HTTP ON PORT 8001, AND THAT IS WHY IT IS HERE.
 * Their Icecast sends no `access-control-allow-origin` AND terminates no TLS,
 * so an HTTPS page cannot play it at all — not "cannot measure it", cannot
 * play it: the browser refuses the mixed-content load before any CORS question
 * is asked. This relay is the only way that stream reaches a browser on
 * positron.studio. MEASURED DIRECT 2026-09-14: Icecast 2.4.4, `audio/mpeg`,
 * 128 kbit/s 44.1 kHz stereo, `icy-name: Radio 1965`, `icy-metaint: 16000`,
 * mean volume -20.4 dB against a synthesised-silence control at -91.0 dB.
 *
 * ⚠️ It is somebody else's stream on this account's egress, which is the thing
 * the allowlist above exists to bound. One named mount, added on purpose.
 */
const IDA = 'https://broadcast.idaidaida.net/listen';

const STATIONS = {
  /**
   * 🔴 `radio1965` IS REMOVED, ON REQUEST, 2026-09-15. Same report as IDA: the
   * operator of the uuu.ee server found roughly 100 concurrent clients against
   * their limit, traced to positron.studio. Ours.
   *
   * ⚠️ THE LOAD WAS THE CHECKS, NOT THE VISITORS. Every `verify.mjs radio1965`
   * and every `verify-gl.mjs videoradio` opens a live mount, and those were run
   * dozens of times in one evening. A relay entry is a standing claim on
   * somebody else's bandwidth and a harness that opens it is a claim made
   * automatically, over and over, by nobody in particular.
   *
   * ⚠️ DO NOT ADD IT BACK WITHOUT ASKING THEM. The recordings at `/rec/` are a
   * different host and a different shape of request (one file, not a held
   * connection) and are left alone.
   */
  // ERR's five public radio streams, 128 kbps MP3.
  vikerraadio: `${ERR}/vikerraadio.mp3`,
  raadio2: `${ERR}/raadio2.mp3`,
  klassikaraadio: `${ERR}/klassikaraadio.mp3`,
  raadio4: `${ERR}/raadio4.mp3`,
  raadiotallinn: `${ERR}/raadiotallinn.mp3`,
  /**
   * 🔴 IDA IS REMOVED, ON REQUEST FROM THE PEOPLE WHOSE SERVER IT IS.
   * 2026-09-15: their operator reported roughly 100 concurrent clients, their
   * limit, with the connections traced to positron.studio. That is us. These
   * two mounts had been moved to the FRONT of the station list an hour before,
   * which made them the default every visitor and every harness run opens, and
   * at 320 kbit/s they are 2.5 times the weight of any other mount here.
   *
   * ⚠️ DO NOT ADD THEM BACK WITHOUT ASKING THEM FIRST. The allowlist is the
   * only thing that bounds this, and a station in it is a standing claim on
   * somebody else's bandwidth. What made this expensive was not the relay, it
   * was defaulting to it: one line reordering an array put every page on their
   * server at once.
   */
};

// Everything a client needs to read about the stream, including the ICY fields
// that only exist on this protocol. Without expose-headers a browser sees the
// response but not one header of it.
const EXPOSE = [
  'icy-name', 'icy-description', 'icy-genre', 'icy-br', 'icy-url', 'icy-pub',
  'icy-metaint', 'content-type', 'x-shout-ttfb', 'x-shout-station',
  // ⚠️ THE RECORDINGS NEED THESE AND THE LIVE MOUNTS NEVER WILL. A stream has
  // no length and no position; a recording has both, and a page that cannot
  // read `content-length` or `content-range` cannot draw a scrub bar for one.
  'content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag',
  'x-shout-recording',
].join(',');

/**
 * Health answers, collapsed.
 *
 * ⚠️ PER ISOLATE, WHICH IS ENOUGH AND IS NOT A GUARANTEE. Workers isolates come
 * and go, so this does not bound the rate globally — what it does is collapse a
 * BURST, which is the shape the traffic actually had: a harness run and every
 * open tab asking within the same few seconds. A hard global bound would need a
 * Durable Object, and that is worth doing if this is not enough.
 */
/**
 * 🔴 THE SAME STATION'S PAST, WHICH DID NOT EXIST UNTIL THIS WEEK. Their server
 * now records a broadcast when the broadcaster asks it to: Icecast's on-connect
 * hook starts `ffmpeg -c copy` against the mount, on-disconnect stops it and
 * rsyncs the mp3 to eccm.ee, and a `streamrecording` event replaces the
 * `livestream` one with an https URL. So a live station finally has a past, and
 * it is an ordinary file with byte ranges.
 *
 * ⚠️ AND IT HAS THE SAME DEFECT AS THE MOUNT: MEASURED 2026-09-15, a recording
 * answers 200 and honours a Range with a 206, and sends NO
 * `access-control-allow-origin`. A page can put one in an <audio> element and
 * read nothing about it, which is the whole reason this worker exists. Their
 * events API is fine on its own (`live.uuu.ee/radio1965/api/events` answers
 * with `allow-origin: *`), so only the audio needs carrying.
 *
 * 🔴 A PATTERN, NOT A PATH PARAMETER, and for the same reason `STATIONS` is an
 * allowlist. `/rec/?url=…` would make this an open proxy for anything on
 * eccm.ee; the names their hook writes are a slug of at most twenty characters
 * and a datestamp, so that is exactly what is accepted and nothing else. No
 * slashes, no dots beyond the one, no traversal to reason about.
 */
const REC_BASE = 'https://eccm.ee/radio1965/streams/';
const REC_NAME = /^[a-z0-9-]{1,20}-\d{8}-\d{6}\.mp3$/;
// A recording never changes once it is written, which is the opposite of the
// streams above. It is worth caching at the edge and worth a client keeping.
const REC_CACHE = 'public, max-age=86400, immutable';

const HEALTH_TTL_MS = 20000;
const healthCache = new Map();

const cors = (h = {}) => ({
  'access-control-allow-origin': '*',
  'access-control-expose-headers': EXPOSE,
  'cache-control': 'no-store',
  ...h,
});

export default {
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors({
        'access-control-allow-methods': 'GET,HEAD,OPTIONS',
        'access-control-allow-headers': 'icy-metadata,range',
      }) });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return new Response('method not allowed', { status: 405, headers: cors() });
    }

    if (url.pathname === '/' || url.pathname === '/stations') {
      // The upstream HOST per station, not one `origin` — there is no longer a
      // single one, and reporting a stale constant is worse than reporting none.
      return Response.json({
        stations: Object.fromEntries(
          Object.entries(STATIONS).map(([k, v]) => [k, new URL(v).host])),
      }, { headers: cors() });
    }

    /**
     * 🔴 IS EACH STATION UP — ANSWERED WITH A 200 WHATEVER THE ANSWER IS.
     *
     * A page cannot ask this by fetching the mount, because a dead mount answers
     * 502 and **the browser logs that to the console**. There is no way to
     * suppress it from script, so a page that probes before it plays trips its
     * own "no console errors" check, and a visitor watching a phone sees a red
     * line about a station being down rather than the page handling it. The
     * question belongs here anyway: this is the thing that knows.
     *
     * ⚠️ CANCEL EVERY BODY. These are ENDLESS streams — a probe that reads the
     * status line and walks away leaves one socket per station open on the
     * origin for as long as the runtime keeps this invocation, which turns a
     * health check into a load generator against a volunteer's Icecast.
     *
     * ⚠️ IT SAID "NEVER CACHED" AND THAT WAS THE MISTAKE. The reasoning — a
     * cached answer about a live stream is wrong in the confident direction —
     * is true and was the wrong thing to optimise for. Twenty seconds of
     * staleness about a station that has been up for hours costs nothing; six
     * upstream connections per caller cost the broadcaster, and they stopped
     * answering. Freshness is a preference; their bandwidth is not ours.
     */
    if (url.pathname === '/health') {
      // 🔴 THIS FANS OUT TO EVERY MOUNT, AND THAT MADE IT A LOAD GENERATOR.
      // One innocuous-looking request opened SIX upstream connections, the page
      // polled it every 30 s per open tab, and every harness run called it —
      // forty runs in an afternoon. MEASURED afterwards: three ERR mounts began
      // answering this Worker **502 in 9 ms** while the same mounts served a
      // laptop 200, and nine milliseconds is too fast to have reached Estonia.
      // That is a refusal at the first hop, and it was earned.
      //
      // LESSONS #50 is this exact shape — *"the heavy request had no `fetch` in
      // it"* — and its rule applies: this is a public broadcaster, not a service
      // we pay for. So: answers are CACHED for `HEALTH_TTL_MS`, a caller may ask
      // about only the stations it needs, and a refusal is not answered with
      // another request.
      const only = (url.searchParams.get('only') || '')
        .split(',').map((x) => x.trim()).filter(Boolean);
      const wanted = Object.entries(STATIONS).filter(([k]) => !only.length || only.includes(k));
      const now = Date.now();
      const fresh = {};
      const toProbe = [];
      for (const [k, upstream] of wanted) {
        const c = healthCache.get(k);
        if (c && now - c.at < HEALTH_TTL_MS) fresh[k] = c.value;
        else toProbe.push([k, upstream]);
      }
      const probed = await Promise.all(toProbe.map(async ([k, upstream]) => {
        const t = Date.now();
        try {
          const up = await fetch(upstream, {
            method: 'GET',
            headers: { 'user-agent': 'positron-shout/1 (+https://positron.studio)' },
            cf: { cacheEverything: false, cacheTtl: 0 },
          });
          const live = up.ok && !!up.body;
          try { await up.body?.cancel(); } catch { /* already gone */ }
          return [k, { up: live, status: up.status, ms: Date.now() - t }];
        } catch (e) {
          // A throw here is the origin refusing or timing out, which is a
          // station that is down — reported as such, not as an error page.
          return [k, { up: false, status: 0, ms: Date.now() - t, why: String(e).slice(0, 80) }];
        }
      }));
      for (const [k, v] of probed) { healthCache.set(k, { at: Date.now(), value: v }); fresh[k] = v; }
      return Response.json(
        { stations: fresh, cached_for_ms: HEALTH_TTL_MS, probed_now: probed.length },
        { headers: cors({ 'cache-control': 'no-store' }) });
    }

    // ── a past broadcast, rather than the live one ──────────────────────
    if (url.pathname.startsWith('/rec/')) {
      const name = url.pathname.slice('/rec/'.length);
      if (!REC_NAME.test(name)) {
        return new Response('no such recording', { status: 404, headers: cors() });
      }
      // ⚠️ THE RANGE HEADER IS FORWARDED, AND THAT IS THE WHOLE POINT OF THIS
      // BRANCH BEING SEPARATE. Seeking in an hour of audio is a Range request;
      // swallowing it would turn every scrub into a fresh download from the
      // beginning, which on a phone is the difference between a transport bar
      // and a progress bar.
      const range = req.headers.get('range');
      const rt0 = Date.now();
      const up = await fetch(REC_BASE + name, {
        method: req.method === 'HEAD' ? 'HEAD' : 'GET',
        headers: {
          ...(range ? { range } : {}),
          'user-agent': 'positron-shout/1 (+https://positron.studio)',
        },
      });
      // 🔴 NOT `!up.ok`. A Range request answers 206, which is not `ok` on some
      // readings and is exactly what a working seek looks like. Guarding on
      // `ok` here would have made every scrub report the origin as broken.
      if (up.status >= 400) {
        return new Response(`origin ${up.status}`, { status: 502, headers: cors() });
      }
      const h = cors({
        'content-type': up.headers.get('content-type') || 'audio/mpeg',
        'cache-control': REC_CACHE,
        'x-shout-ttfb': String(Date.now() - rt0),
        'x-shout-recording': name,
      });
      for (const k of ['content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag']) {
        const v = up.headers.get(k);
        if (v) h[k] = v;
      }
      return new Response(req.method === 'HEAD' ? null : up.body, { status: up.status, headers: h });
    }

    const id = url.pathname.replace(/^\/+/, '').replace(/\.mp3$/, '');
    const upstream = STATIONS[id];
    if (!upstream) return new Response('no such station', { status: 404, headers: cors() });

    // `?bytes=N` closes the connection after N bytes. A radio stream never
    // ends, so without a bound every probe — the demo's, the harness's — has to
    // decide when to hang up, and a harness that forgets leaves a socket
    // holding the origin open for the length of the run.
    const bytes = Math.min(Number(url.searchParams.get('bytes')) || 0, 4 << 20);

    const t0 = Date.now();
    // ALWAYS GET UPSTREAM, even for a HEAD. Icecast 2.4.4 answers HEAD with
    // `400 Bad Request` — measured against every mount — so forwarding the
    // method verbatim made the relay report a healthy station as a 502, and
    // every uptime checker that HEADs a URL would have believed it. The relay
    // does the GET, keeps the headers, and cancels the body before a frame of
    // audio is paid for.
    const up = await fetch(upstream, {
      method: 'GET',
      headers: {
        // ICY metadata is opt-in and the client's choice, not ours: asking for
        // it when the client did not would splice 16-byte-aligned metadata
        // blocks into bytes the client is about to treat as pure MP3.
        ...(req.headers.get('icy-metadata') === '1' ? { 'Icy-MetaData': '1' } : {}),
        'user-agent': 'positron-shout/1 (+https://positron.studio)',
      },
      // The origin is Icecast: an infinite body, `Connection: Close`, HTTP/1.0.
      // No cache, ever — a cached radio stream is a contradiction.
      cf: { cacheEverything: false, cacheTtl: 0 },
    });
    const ttfb = Date.now() - t0;

    if (!up.ok || !up.body) {
      return new Response(`origin ${up.status}`, { status: 502, headers: cors() });
    }

    // 🔴 THE CONTENT-TYPE IS FORWARDED, NEVER INVENTED. It used to fall back to
    // `audio/mpeg`, which was harmless while every mount here was MP3 and is a
    // trap now that two of them are AAC: the page reads its frame scanner off
    // this header, and a scanner pointed at the wrong framing finds NOTHING
    // rather than finding rubbish. A default would turn a missing header into a
    // confident wrong answer, and the page handles an ABSENT one correctly by
    // looking at the bytes.
    const upType = up.headers.get('content-type');
    const headers = cors({
      ...(upType ? { 'content-type': upType } : {}),
      'x-shout-ttfb': String(ttfb),          // what the relay itself waited for
      'x-shout-station': id,
    });
    for (const k of ['icy-name', 'icy-description', 'icy-genre', 'icy-br', 'icy-url', 'icy-pub', 'icy-metaint']) {
      const v = up.headers.get(k);
      if (v) headers[k] = v;
    }
    if (req.method === 'HEAD') {
      up.body.cancel?.();          // hang up on the origin; nobody is listening
      return new Response(null, { headers });
    }

    return new Response(bytes ? cap(up.body, bytes) : up.body, { headers });
  },
};

/** Pass bytes through until `limit`, then close — the stream itself never will. */
function cap(body, limit) {
  let sent = 0;
  return body.pipeThrough(new TransformStream({
    transform(chunk, ctrl) {
      const room = limit - sent;
      if (room <= 0) { ctrl.terminate(); return; }
      if (chunk.byteLength <= room) { sent += chunk.byteLength; ctrl.enqueue(chunk); return; }
      ctrl.enqueue(chunk.subarray(0, room));
      sent = limit;
      ctrl.terminate();
    },
  }));
}
