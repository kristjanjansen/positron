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
const STATIONS = {
  // Estonian Centre of Contemporary Music's community station (uuu.ee).
  radio1965: 'http://live.uuu.ee:8001/radio1965',
  // ERR's five public radio streams, 128 kbps MP3.
  vikerraadio: `${ERR}/vikerraadio.mp3`,
  raadio2: `${ERR}/raadio2.mp3`,
  klassikaraadio: `${ERR}/klassikaraadio.mp3`,
  raadio4: `${ERR}/raadio4.mp3`,
  raadiotallinn: `${ERR}/raadiotallinn.mp3`,
};

// Everything a client needs to read about the stream, including the ICY fields
// that only exist on this protocol. Without expose-headers a browser sees the
// response but not one header of it.
const EXPOSE = [
  'icy-name', 'icy-description', 'icy-genre', 'icy-br', 'icy-url', 'icy-pub',
  'icy-metaint', 'content-type', 'x-shout-ttfb', 'x-shout-station',
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

    const headers = cors({
      'content-type': up.headers.get('content-type') || 'audio/mpeg',
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
