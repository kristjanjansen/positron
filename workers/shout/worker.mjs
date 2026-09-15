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
 * 🔴 `radio` IS PLAIN HTTP ON PORT 8001, AND THAT IS WHY IT IS HERE.
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
   * 🔴 `radio` IS REMOVED, ON REQUEST, 2026-09-15. Same report as IDA: the
   * operator of the uuu.ee server found roughly 100 concurrent clients against
   * their limit, traced to positron.studio. Ours.
   *
   * ⚠️ THE LOAD WAS THE CHECKS, NOT THE VISITORS. Every `verify.mjs radio`
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
 * events API is fine on its own (`live.uuu.ee/radio/api/events` answers
 * with `allow-origin: *`), so only the audio needs carrying.
 *
 * 🔴 A PATTERN, NOT A PATH PARAMETER, and for the same reason `STATIONS` is an
 * allowlist. `/rec/?url=…` would make this an open proxy for anything on
 * eccm.ee; the names their hook writes are a slug of at most twenty characters
 * and a datestamp, so that is exactly what is accepted and nothing else. No
 * slashes, no dots beyond the one, no traversal to reason about.
 */
const REC_BASE = 'https://eccm.ee/radio/streams/';
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
  // ⚠️ `env` IS TAKEN NOW, FOR THE DURABLE OBJECT BINDING. It was omitted while
  // this worker had no state at all, and a handler that silently reads
  // `undefined.MOUNT` is a 500 on every listen with nothing in the log saying
  // which line.
  async fetch(req, env) {
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

    /**
     * `GET /tee/<id>` — what the tee is doing for one mount: how many listeners
     * it is serving and how many connections it is holding upstream. The second
     * number is the one that matters and it must be 1.
     */
    if (url.pathname.startsWith('/tee/')) {
      const who = url.pathname.slice(5).replace(/\.mp3$/, '');
      if (!STATIONS[who]) return new Response('no such station', { status: 404, headers: cors() });
      const room = env.MOUNT.get(env.MOUNT.idFromName(who));
      const r = await room.fetch('https://mount/stats');
      return new Response(r.body, { headers: cors({ 'content-type': 'application/json' }) });
    }

    const id = url.pathname.replace(/^\/+/, '').replace(/\.mp3$/, '');
    const upstream = STATIONS[id];
    if (!upstream) return new Response('no such station', { status: 404, headers: cors() });

    // `?bytes=N` closes the connection after N bytes. A radio stream never
    // ends, so without a bound every probe — the demo's, the harness's — has to
    // decide when to hang up, and a harness that forgets leaves a socket
    // holding the origin open for the length of the run.
    const bytes = Math.min(Number(url.searchParams.get('bytes')) || 0, 4 << 20);

    /**
     * 🔴 THROUGH THE TEE, WHICH IS ONE CONNECTION TO THE BROADCASTER FOR ALL OF
     * US. `idFromName(id)` is the whole mechanism: a Durable Object addressed
     * by name is the same object everywhere, so every listener on every machine
     * arrives at one place and that place holds one socket open. See `Mount`.
     *
     * ⚠️ A HEAD STILL GOES DIRECT. It is a health question, it wants the
     * origin's own answer, and it hangs up before a frame of audio is paid for;
     * putting it through the object would open a broadcast to answer a
     * question about whether there is one. The `/rec/` recordings are files and
     * were never in this path at all.
     * ⚠️ AND `?direct=1` IS DELIBERATELY NOT OFFERED. An escape hatch back to a
     * connection per client is the defect with a flag on it, and the one thing
     * this object exists to make impossible is that somebody re-enables it in a
     * hurry.
     */
    if (req.method !== 'HEAD') {
      const room = env.MOUNT.get(env.MOUNT.idFromName(id));
      const q = new URLSearchParams({ u: upstream });
      if (req.headers.get('icy-metadata') === '1') q.set('icy', '1');
      if (bytes) q.set('bytes', String(bytes));
      const r = await room.fetch(`https://mount/listen?${q}`);
      if (!r.ok) return new Response(`origin ${r.status}`, { status: 502, headers: cors() });
      const h = cors({ 'x-shout-station': id });
      for (const [k, v] of r.headers) h[k] = v;
      return new Response(r.body, { headers: h });
    }

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

/**
 * 🔴 ONE UPSTREAM CONNECTION PER MOUNT, FANNED OUT TO EVERY LISTENER.
 *
 * THIS IS THE FIX FOR THE THING ERR REPORTED. Until 2026-09-16 this relay was a
 * pass-through: every request did its own `fetch(upstream)` and handed the body
 * straight back, so **N browsers were N listeners at the broadcaster**, plus one
 * per harness tab and one per orphaned Chrome. On 2026-09-15 that reached about
 * a hundred concurrent clients against one operator's limit, and on 2026-09-16
 * ERR said the same traffic was corrupting their public listener statistics,
 * which is a fact about their funding rather than about their bandwidth.
 *
 * A Durable Object is addressed by NAME, and `idFromName(station)` gives every
 * mount exactly one object in the world. That object opens the origin once and
 * copies the bytes to everybody. Ten listeners, a hundred listeners and a
 * harness are one listener upstream.
 *
 * ⚠️ THE ICY METADATA IS STRIPPED AND RE-INSERTED PER SUBSCRIBER, AND THAT IS
 * NOT A FLOURISH. Icecast interleaves a metadata block every `icy-metaint`
 * bytes COUNTED FROM THE FIRST BYTE THE CLIENT RECEIVED. A tee hands a late
 * joiner bytes from the middle of the origin's stream, so its byte 0 is not the
 * origin's byte 0 and every block it expects lands in the wrong place: it would
 * read audio as a length byte and then delete that many bytes of sound. So the
 * object parses the blocks out once, keeps the title, and writes fresh blocks
 * into each subscriber's own stream at that subscriber's own offset. Every
 * listener gets a well-formed ICY stream that begins where they began.
 *
 * ⚠️ A LATE JOINER STARTS MID-FRAME AND THAT IS FINE. An MP3 decoder scans for
 * the next sync word, which is what `demo/shell/mp3-frames.mjs` already does and
 * what every media element does. The first few milliseconds are discarded.
 */
const METAINT = 16000;
/** How long the origin is held after the last listener leaves. A reload is two
 *  seconds of nobody; hanging up and dialling again on every one of those is
 *  more connections to the broadcaster, not fewer. */
const LINGER_MS = 20000;
/** A listener whose socket has stopped draining. Radio has no rewind, so the
 *  honest thing is to drop the listener rather than buffer the broadcast for
 *  them and let the queue grow without bound. */
const MAX_BEHIND = 512 * 1024;

export class Mount {
  constructor(state) {
    this.state = state;
    this.subs = new Set();
    this.reader = null;
    this.head = null;          // the origin's own headers, for every joiner
    this.title = '';
    this.startedAt = 0;
    this.served = 0;           // bytes copied out, across every listener
    this.pulled = 0;           // bytes taken from the origin, once
    this.peak = 0;             // most listeners at one time
    this.dropped = 0;
    this.linger = null;
  }

  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === '/stats') {
      return new Response(JSON.stringify({
        listeners: this.subs.size, peak: this.peak, upstream: !!this.reader,
        title: this.title, pulled: this.pulled, served: this.served,
        dropped: this.dropped,
        // 🔴 THE NUMBER THE WHOLE OBJECT EXISTS TO MAKE TRUE. One connection
        // upstream however many are downstream; anything but 1 here with
        // listeners on is the tee not working.
        upstreamConnections: this.reader ? 1 : 0,
        openFor: this.startedAt ? Date.now() - this.startedAt : 0,
      }), { headers: { 'content-type': 'application/json' } });
    }

    const origin = url.searchParams.get('u');
    const wantIcy = url.searchParams.get('icy') === '1';
    const cap = Math.min(Number(url.searchParams.get('bytes')) || 0, 4 << 20);
    if (!origin) return new Response('no origin', { status: 400 });

    const opened = await this.open(origin);
    if (!opened) return new Response('origin refused', { status: 502 });

    // ⚠️ EACH SUBSCRIBER COUNTS ITS OWN BYTES, because the metadata blocks are
    // written at ITS offset and not at the origin's. `sent` is why a listener
    // who joined a minute late still gets a block exactly 16000 bytes in.
    const sub = { ctrl: null, sent: 0, behind: 0, cap, icy: wantIcy, said: '' };
    const self = this;
    const body = new ReadableStream({
      start(ctrl) { sub.ctrl = ctrl; self.subs.add(sub); self.peak = Math.max(self.peak, self.subs.size); },
      cancel() { self.drop(sub); },
    });

    const h = new Headers(this.head);
    h.set('x-shout-listeners', String(this.subs.size));
    h.set('x-shout-tee', '1');
    if (wantIcy) h.set('icy-metaint', String(METAINT)); else h.delete('icy-metaint');
    if (this.title) h.set('x-shout-title', this.title);
    return new Response(body, { headers: h });
  }

  /** Open the origin, once. Safe to call on every subscribe. */
  async open(origin) {
    if (this.linger) { clearTimeout(this.linger); this.linger = null; }
    if (this.reader) return true;
    const up = await fetch(origin, {
      method: 'GET',
      headers: {
        // 🔴 ALWAYS ASKED FOR, WHATEVER THE CLIENT WANTED. There is one
        // upstream for everybody now, so it cannot be tailored to the first
        // caller: it is parsed out here and written back per subscriber. The
        // old pass-through forwarded the client's own preference, which was
        // correct exactly while each client had its own connection.
        'Icy-MetaData': '1',
        'user-agent': 'positron-shout/2 (+https://positron.studio)',
      },
      cf: { cacheEverything: false, cacheTtl: 0 },
    }).catch(() => null);
    if (!up || !up.ok || !up.body) return false;

    const keep = new Headers();
    const type = up.headers.get('content-type');
    if (type) keep.set('content-type', type);
    for (const k of ['icy-name', 'icy-description', 'icy-genre', 'icy-br', 'icy-url', 'icy-pub']) {
      const v = up.headers.get(k);
      if (v) keep.set(k, v);
    }
    this.head = keep;
    this.metaint = Number(up.headers.get('icy-metaint')) || 0;
    this.startedAt = Date.now();
    this.reader = up.body.getReader();
    this.pump();
    return true;
  }

  /**
   * Read the origin forever and copy to everyone.
   *
   * ⚠️ NOT AWAITED BY `fetch`. A pump that the request awaited would hold the
   * response open until the radio station ends, which it never does.
   */
  async pump() {
    const reader = this.reader;
    let toMeta = this.metaint;          // bytes of audio until the next block
    let need = 0;                       // bytes of a metadata block still owed
    let meta = [];
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        this.pulled += value.byteLength;
        let i = 0;
        while (i < value.byteLength) {
          if (need > 0) {
            const take = Math.min(need, value.byteLength - i);
            meta.push(value.subarray(i, i + take));
            i += take; need -= take;
            if (need === 0) this.readTitle(meta), meta = [];
            continue;
          }
          if (this.metaint && toMeta === 0) {
            // the length byte: blocks are 16 bytes each
            need = value[i] * 16;
            i += 1;
            toMeta = this.metaint;
            if (need === 0) meta = [];
            continue;
          }
          const room = this.metaint ? Math.min(toMeta, value.byteLength - i) : value.byteLength - i;
          this.send(value.subarray(i, i + room));
          i += room;
          if (this.metaint) toMeta -= room;
        }
      }
    } catch { /* the origin hung up; fall through and close */ }
    this.reader = null;
    for (const s of [...this.subs]) this.drop(s);
  }

  /** `StreamTitle='...'` out of one metadata block. */
  readTitle(parts) {
    let n = 0;
    for (const p of parts) n += p.byteLength;
    const buf = new Uint8Array(n);
    let o = 0;
    for (const p of parts) { buf.set(p, o); o += p.byteLength; }
    const s = new TextDecoder().decode(buf);
    const m = /StreamTitle='([^']*)'/.exec(s);
    // ⚠️ AN EMPTY TITLE IS A TITLE THAT WENT AWAY, so it is recorded rather
    // than ignored: a page that keeps showing the last song of the last
    // programme is worse than one showing nothing.
    if (m) this.title = m[1];
  }

  /** One chunk of clean audio, to every listener, with their own metadata. */
  send(chunk) {
    if (!chunk.byteLength) return;
    for (const sub of [...this.subs]) {
      try {
        let rest = chunk;
        while (rest.byteLength) {
          if (sub.icy) {
            const room = METAINT - (sub.sent % METAINT);
            const take = Math.min(room, rest.byteLength);
            sub.ctrl.enqueue(rest.subarray(0, take));
            sub.sent += take; this.served += take;
            rest = rest.subarray(take);
            if (sub.sent % METAINT === 0) sub.ctrl.enqueue(this.block(sub));
          } else {
            sub.ctrl.enqueue(rest);
            sub.sent += rest.byteLength; this.served += rest.byteLength;
            rest = rest.subarray(rest.byteLength);
          }
        }
        // ⚠️ `desiredSize` GOES NEGATIVE WHEN A SOCKET IS NOT DRAINING, and it
        // is the only backpressure signal there is here. Radio has no rewind,
        // so a listener this far behind is dropped rather than buffered for.
        if (sub.ctrl.desiredSize !== null && sub.ctrl.desiredSize < -MAX_BEHIND) {
          this.dropped++; this.drop(sub);
        }
        if (sub.cap && sub.sent >= sub.cap) this.drop(sub);
      } catch { this.drop(sub); }
    }
  }

  /** One ICY metadata block for this subscriber: the title when it changed,
   *  a single zero byte when it did not. */
  block(sub) {
    if (sub.said === this.title) return new Uint8Array([0]);
    sub.said = this.title;
    const body = new TextEncoder().encode(`StreamTitle='${this.title.replace(/'/g, '')}';`);
    const n = Math.ceil(body.byteLength / 16);
    const out = new Uint8Array(1 + n * 16);
    out[0] = n;
    out.set(body, 1);
    return out;
  }

  drop(sub) {
    if (!this.subs.delete(sub)) return;
    try { sub.ctrl.close(); } catch { /* already gone */ }
    // 🔴 THE LAST LISTENER LEAVING MUST EVENTUALLY CLOSE THE ORIGIN, or the tee
    // becomes a permanent listener nobody is hearing, which is WORSE than the
    // pass-through it replaced: one connection held for ever against N held
    // only while somebody was listening. The linger is because a page reload is
    // two seconds of nobody, and hanging up on every one of those is more
    // connections to the broadcaster rather than fewer.
    if (this.subs.size === 0 && this.reader && !this.linger) {
      this.linger = setTimeout(() => {
        this.linger = null;
        if (this.subs.size === 0 && this.reader) {
          try { this.reader.cancel(); } catch { /* already gone */ }
          this.reader = null;
          this.startedAt = 0;
        }
      }, LINGER_MS);
    }
  }
}
