// positron-pub — the publisher for the Act 1 demos, alive exactly as long as
// somebody is watching.
//
//   wss://pub.positron.studio/watch    a viewer. First one in starts the
//                                      publish; last one out stops it.
//   GET  /status                       viewers + container + ffmpeg state
//   GET  /ice                          short lived TURN servers, 503 with no key
//   POST /start /stop                  manual override (debugging)
//   POST /log                          a device reports what it saw
//   GET  /logs[?format=text]           read those reports back
//   POST /logs/clear                   drop them
//   wss://pub.positron.studio/cam      a camera: MediaRecorder chunks in, the
//                                      LL-HLS input out, while nobody watches
//   GET  /cam                          who holds the input, 409 when busy
//   /stage/watch /stage/status         the same four routes on /stage/'s own
//   /stage/start /stop                 instance: the MIM film on WHIP, nothing else
//
// WHY REFERENCE COUNTING AND NOT sleepAfter ALONE: the Container base class
// sleeps on REQUEST idleness, and ffmpeg publishing generates no incoming
// requests at all — so sleepAfter would happily kill a stream somebody is
// watching. The viewer count is the real signal; the alarm sweep renews
// activity while anyone is connected and stops the publish once nobody is.

import { Container, getContainer } from '@cloudflare/containers';

const SWEEP_MS = 30_000;   // alarm cadence
const WHIP_PER_HOUR = 20;  // browser publishes allowed per hour, DO-counted
const ICE_PER_HOUR = 120;        // relay credentials minted per hour, overall
const ICE_PER_ADDRESS_HOUR = 20; // and per address, so one caller cannot spend the hour
const ICE_TTL_S = 4 * 3600;      // longer than a camera is left on; a credential cannot be refreshed mid-call here
const GRACE_TICKS = 2;     // ~60 s of nobody watching before we stop
const NAME = 'p1';
// /stage/'S OWN INSTANCE of the same class: the MIM film on its own WebRTC
// input (STAGE_WHIP_URL), WHIP only, no clocks, no RTMPS. Routed by the /stage
// prefix, so the test pattern instance above is untouched.
const STAGE = 'stage';
const STAGE_PATHS = new Set(['/watch', '/status', '/start', '/stop']);
const LOG_KEEP = 400;          // ring buffer of device reports
const LOG_MAX_BODY = 2000;     // one report cannot flood the rest out
const CAM_PER_HOUR = 20;       // camera sessions per hour, DO-counted like /whip
// 🔴 EVERY CAMERA SESSION IS A STREAM RECORDING. The LL-HLS input is RTMPS, and
// recording cannot be turned off there, so each session adds its length to the
// account's 1000 minute storage cap, which blocks new live streams when full.
const CAM_MAX_MS = 300_000;
const CAM_IDLE_MS = 5_000;     // no chunk this long and the DO ends the session
const CAM_TICK_MS = 5_000;     // the alarm's cadence while a camera is live

export class Pub extends Container {
  defaultPort = 8080;
  // A generous backstop only. The sweep below is what actually decides.
  sleepAfter = '10m';

  /**
   * 🔴 A WORKER VAR IS NOT IN THE CONTAINER'S ENVIRONMENT UNTIL IT IS PASSED.
   * `server.mjs` reads `process.env.PUB_SOURCE` and `process.env.PUB_BURN`,
   * and until 2026-09-30 nothing here forwarded either, so both were always
   * undefined in the container: the film and no clocks, whatever wrangler.jsonc
   * said. `PUB_W`/`PUB_H`/`PUB_FPS` never had this problem because they travel
   * in the /start body. `envVars` is read when the container STARTS, so a
   * change lands on the next cold start, not on a running publish.
   * ⚠️ ONLY WHAT IS SET. An absent var must stay absent, because
   * `PUB_SOURCE === undefined` is what selects the film, and `testsrc2`
   * or `''` is the test pattern.
   */
  constructor(ctx, env) {
    super(ctx, env);
    const pass = {};
    for (const k of ['PUB_SOURCE', 'PUB_BURN']) {
      if (typeof env[k] === 'string') pass[k] = env[k];
    }
    this.envVars = pass;
  }

  #idleTicks = 0;
  /**
   * 'stage' or 'main'. ⚠️ TOLD, THEN REMEMBERED: the alarm fires with no
   * request, and an object is not told its own name, so the entry worker stamps
   * every request with x-pub-role and the object keeps the last one it saw.
   */
  #role = null;
  async #getRole() {
    if (this.#role === null) {
      try { this.#role = (await this.ctx.storage.get('role')) || 'main'; } catch { this.#role = 'main'; }
    }
    return this.#role;
  }
  /** browser WHIP publishes: rate-limit stamps, and id -> resource URL */
  #whipHits = [];
  #whipRes = new Map();
  /** /ice mints: { at, who } stamps for the two rate limits */
  #iceHits = [];
  /** camera sessions: rate-limit stamps, and the live one's counters */
  #camHits = [];
  #cam = null;
  /** Ring buffer of device reports. Diagnostic; dies with the DO. */
  #log = [];
  #hydrated = false;

  /**
   * Read the ring back after an eviction, once.
   *
   * ⚠️ LAZY, NOT IN THE CONSTRUCTOR. A DO constructor cannot await, and doing
   * this in `blockConcurrencyWhile` would make every OTHER route on this
   * object — the WebSocket upgrade, /status, /start — wait on a storage read
   * they do not use. The log routes are the only ones that need it.
   */
  async #hydrate() {
    if (this.#hydrated) return;
    this.#hydrated = true;
    try { this.#log = (await this.ctx.storage.get('log')) || []; }
    catch { this.#log = []; }
  }

  /**
   * ⚠️ TRIMMED TO FIT, FROM THE FRONT. A DO storage value caps at 128 KiB and
   * LOG_KEEP x LOG_MAX_BODY is 800 KB in the worst case — so a busy device
   * could make every write throw, which would look exactly like the eviction
   * bug this replaced. Drop the OLDEST lines until it fits; the newest report
   * is the one somebody is waiting to read.
   */
  async #persist() {
    let out = this.#log;
    while (out.length > 1 && JSON.stringify(out).length > 100000) out = out.slice(Math.ceil(out.length / 8));
    this.#log = out;
    try { await this.ctx.storage.put('log', out); } catch { /* diagnostics are never load-bearing */ }
  }

  async fetch(request) {
    const url = new URL(request.url);
    const told = request.headers.get('x-pub-role') === STAGE ? STAGE : 'main';
    if ((await this.#getRole()) !== told) {
      this.#role = told;
      try { await this.ctx.storage.put('role', told); } catch { /* re-told on the next request */ }
    }

    // ── a viewer ──────────────────────────────────────────────────────────
    if (url.pathname === '/watch') {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('expected websocket', { status: 426 });
      }
      const pair = new WebSocketPair();
      // TAGGED, because a camera socket lives on this object too and must not
      // count as somebody watching (see `viewers()`).
      this.ctx.acceptWebSocket(pair[1], ['watch']);   // hibernatable
      this.#idleTicks = 0;
      await this.#ensureAlarm();
      // FIRE AND FORGET. Awaiting the publish here delayed the 101 by the
      // container's cold start, so the viewer's own onopen did not fire until
      // ffmpeg was already running — a connection blocking on a video encoder.
      // The alarm sweep retries if this fails, so nothing is lost by not
      // waiting for it.
      // 🔴 A VIEWER TAKES THE INPUT BACK FROM A CAMERA, the same priority /whip
      // has: the pages that watch the pattern have no other source, and a
      // camera page can say why it stopped. The camera is told, its leg is
      // ended, and only then does the pattern start on the same key.
      if (this.viewers() === 1) {
        const give = this.#camLive() ? this.#endCam('taken', 'somebody opened a page that plays the test pattern on this input, and viewers have priority') : Promise.resolve();
        give.then(() => this.#startPublish()).catch(() => { /* sweep retries */ });
      }
      try {
        pair[1].send(JSON.stringify({ t: 'hello', viewers: this.viewers() }));
      } catch { /* raced a close */ }
      return new Response(null, { status: 101, webSocket: pair[0] });
    }

    // ── a camera, onto the LL-HLS input while nobody is watching it ────────
    //
    // `/cam/` records its burned canvas with MediaRecorder and sends each chunk
    // here; this object POSTs them, in order, into the container's third leg,
    // which rewraps them to RTMPS on the SAME input and key the test pattern
    // uses. No second input and no second secret. plans/plan-cam-llhls.md.
    //
    // 🔴 REFUSED IN BAND, NOT WITH A STATUS. A browser cannot read the HTTP
    // status of a refused WebSocket upgrade, so a 409 there reaches the page as
    // a bare close with no reason. The socket is accepted, told
    // `{t:'busy', status: 409, error}` and closed with 4409, and the page can
    // say why in words. A plain GET answers the same question with a real 409.
    if (url.pathname === '/cam') {
      const busy = this.#camBusy();
      if (request.headers.get('Upgrade') !== 'websocket') {
        return json(busy ? { ...busy, status: 409 } : { free: true, viewers: 0 }, busy ? 409 : 200);
      }
      const pair = new WebSocketPair();
      const now = Date.now();
      this.#camHits = this.#camHits.filter((t) => now - t < 3600_000);
      const refuse = busy
        || (this.#camHits.length >= CAM_PER_HOUR ? { error: 'too many camera sessions this hour', limit: CAM_PER_HOUR, status: 429 } : null)
        || (!this.env.STREAM_KEY ? { error: 'no stream key on this worker', status: 503 } : null);
      if (refuse) {
        this.ctx.acceptWebSocket(pair[1], ['cam-refused']);
        pair[1].serializeAttachment({ role: 'refused' });
        try {
          pair[1].send(JSON.stringify({ t: 'busy', status: 409, ...refuse }));
          pair[1].close(refuse.status === 409 ? 4409 : 4000 + (refuse.status % 1000), String(refuse.error).slice(0, 120));
        } catch { /* gone */ }
        return new Response(null, { status: 101, webSocket: pair[0] });
      }
      this.#camHits.push(now);
      const sid = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
      this.ctx.acceptWebSocket(pair[1], ['cam']);
      pair[1].serializeAttachment({ role: 'cam', sid, at: now });
      this.#cam = { sid, at: now, lastAt: now, bytes: 0, chunks: 0, open: false, chain: Promise.resolve(), ws: pair[1] };
      await this.ctx.storage.setAlarm(now + CAM_TICK_MS);
      try { pair[1].send(JSON.stringify({ t: 'hello', sid, maxS: CAM_MAX_MS / 1000 })); } catch { /* raced */ }
      return new Response(null, { status: 101, webSocket: pair[0] });
    }

    if (url.pathname === '/status') {
      let container = null;
      try {
        const r = await super.fetch(new Request('http://c/status'));
        container = await r.json();
      } catch (e) { container = { error: String(e).slice(0, 200) }; }
      const c = this.#cam;
      return json({
        viewers: this.viewers(),
        cam: c ? { sid: c.sid, open: c.open, ageS: Math.round((Date.now() - c.at) / 1000), chunks: c.chunks, bytes: c.bytes, lastChunkAgoMs: Date.now() - c.lastAt } : null,
        idleTicks: this.#idleTicks,
        graceTicks: GRACE_TICKS,
        sweepMs: SWEEP_MS,
        container,
      });
    }

    // ── a device reporting what it actually saw ────────────────────────────
    // A phone cannot be attached to a debugger from here, and the numbers that
    // matter (buffer length, hole seeks) are only observable on the device. So
    // the page posts them and this holds a ring buffer. Diagnostic only: no
    // secrets, capped hard.
    //
    // 🔴 IT USED TO SAY "dropped when the DO goes away", AND THAT MADE THE
    // WHOLE ENDPOINT A TRAP. MEASURED 2026-09-12: a line POSTed at 02:07:46
    // read back immediately and was GONE by 02:08:32 — the DO had evicted and
    // an in-memory array went with it. CLAUDE.md advertises this URL as the way
    // to get a report off a phone or a headset, so the failure mode was: the
    // device ships correctly, the reader sees "(nothing reported)", and the
    // obvious conclusion is that the device never sent anything. Somebody then
    // debugs the device. The ring is persisted now.
    if (url.pathname === '/log' && request.method === 'POST') {
      const body = (await request.text()).slice(0, LOG_MAX_BODY);
      const ua = request.headers.get('user-agent') || '';
      const ip = request.headers.get('cf-connecting-ip') || '';
      const line = {
        at: new Date().toISOString(),
        // never store the address itself, only enough to group one device's
        // lines together across posts
        who: await shortHash(ip + ua),
        ios: /iPhone|iPad|iPod/.test(ua),
        body,
      };
      await this.#hydrate();
      this.#log.push(line);
      if (this.#log.length > LOG_KEEP) this.#log.splice(0, this.#log.length - LOG_KEEP);
      await this.#persist();
      return json({ ok: true, kept: this.#log.length });
    }

    if (url.pathname === '/logs') {
      await this.#hydrate();
      if (url.searchParams.get('format') === 'text') {
        const txt = this.#log
          .map((l) => `${l.at} ${l.ios ? 'iOS' : '   '} ${l.who} ${l.body}`)
          .join('\n');
        return new Response(txt || '(nothing reported)', {
          headers: { 'content-type': 'text/plain; charset=utf-8', 'access-control-allow-origin': '*' },
        });
      }
      return json({ lines: this.#log.length, log: this.#log });
    }

    if (url.pathname === '/logs/clear' && request.method === 'POST') {
      await this.#hydrate();
      const had = this.#log.length;
      this.#log = [];
      await this.ctx.storage.delete('log');
      this.#hydrated = true;          // emptied on purpose, do not re-read
      return json({ ok: true, cleared: had });
    }

    if (url.pathname === '/start' && request.method === 'POST') {
      // ?tracks=av|v|a — a manual override for the audio-lag experiment. The
      // question it answers: a video-only stream has no audio group, so if the
      // startup stutter vanishes there, the audio track is the cause.
      const tracks = url.searchParams.get('tracks');
      await this.#startPublish(tracks ? { tracks } : undefined);
      return json({ ok: true, viewers: this.viewers(), tracks: tracks || 'av' });
    }
    if (url.pathname === '/stop' && request.method === 'POST') {
      await this.#stopPublish();
      return json({ ok: true });
    }

    // ── relay addresses for a network that drops UDP ──────────────────────
    //
    // 🔴 WHY THIS EXISTS, MEASURED 2026-09-30 ON A PHONE HOTSPOT. Stream's
    // WHIP and WHEP answers are `a=ice-lite` with ONE candidate, UDP, and
    // nothing over TCP. A TCP candidate munged into a real answer at the same
    // address, and at 443, was applied by Chrome and ICE still failed, so
    // Stream does not speak ICE-TCP. On a network that drops outbound UDP the
    // handshake answers 201 and not one packet of media arrives.
    // Cloudflare Realtime TURN over TLS on 443 is the way round: the browser
    // reaches the relay over TCP and the relay reaches Stream over UDP from
    // inside Cloudflare, and that leg is not billed.
    //
    // The TURN KEY must never reach a page, because it mints credentials
    // without limit. It stays in two worker secrets and this route hands out
    // short lived ICE servers minted from it:
    //   TURN_KEY_ID          the key's id
    //   TURN_KEY_API_TOKEN   the key's bearer token
    // Absent, it answers 503 in words and a page carries on without a relay.
    //
    // ⚠️ RATE LIMITED LIKE /whip, IN THIS OBJECT, because a DO is the only place
    // two requests cannot both pass a check. Per address AND overall: a bare
    // overall cap lets one caller spend everybody's hour.
    if (url.pathname === '/ice' && (request.method === 'GET' || request.method === 'HEAD')) {
      const keyId = this.env.TURN_KEY_ID, token = this.env.TURN_KEY_API_TOKEN;
      if (!keyId || !token) {
        return json({ error: 'no TURN key on this worker, so there is no relay for networks that block UDP', iceServers: null }, 503);
      }
      const now = Date.now();
      const who = request.headers.get('cf-connecting-ip') || 'unknown';
      this.#iceHits = (this.#iceHits || []).filter((h) => now - h.at < 3600_000);
      if (this.#iceHits.length >= ICE_PER_HOUR
        || this.#iceHits.filter((h) => h.who === who).length >= ICE_PER_ADDRESS_HOUR) {
        return json({ error: 'too many relay requests this hour', limit: ICE_PER_ADDRESS_HOUR }, 429);
      }
      let up;
      try {
        up = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`, {
          method: 'POST',
          headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
          body: JSON.stringify({ ttl: ICE_TTL_S }),
        });
      } catch (e) {
        return json({ error: `turn upstream: ${e.message}`, iceServers: null }, 502);
      }
      if (!up.ok) return json({ error: `turn upstream ${up.status}`, iceServers: null }, 502);
      this.#iceHits.push({ at: now, who });
      const got = await up.json();
      // Port 53 is refused by browsers and only costs a gathering timeout,
      // which is Cloudflare's own advice. Nothing else is filtered: ICE picks.
      const iceServers = (got.iceServers || []).map((s) => ({
        ...s,
        urls: [].concat(s.urls).filter((u) => !/:53(\?|$)/.test(u)),
      })).filter((s) => s.urls.length);
      return new Response(JSON.stringify({ iceServers, ttl: ICE_TTL_S }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'access-control-allow-origin': '*',
          // A credential with a clock on it is never cached anywhere.
          'cache-control': 'no-store',
        },
      });
    }

    // ── a browser publishes, and never sees the key ───────────────────────
    //
    // WHY THIS EXISTS. A browser can publish WHIP perfectly well —
    // `rig/whep/publish.html` has done it from a canvas for months. What it
    // cannot do is HOLD THE CREDENTIAL: Cloudflare's WHIP publish URL carries
    // the stream key in its path, and a public page cannot keep a secret. That
    // is the ONLY reason the ffmpeg container was in this path at all.
    //
    // WHIP to Cloudflare is single-shot SDP with no trickle (measured, see
    // rig/whep/publish.html), so this is one POST of an offer and one answer.
    // Media then flows browser <-> Cloudflare directly over ICE/DTLS/SRTP and
    // NEVER crosses this worker. A worker cannot carry media and does not have
    // to; it carries thirty lines of signalling.
    if (url.pathname === '/whip' && request.method === 'POST') {
      const whip = this.env.WHIP_URL;
      if (!whip) return json({ error: 'no WHIP_URL configured' }, 503);

      // A tokenless publish proxy is an open door to our live input, so it gets
      // the same discipline `ingest` has: a small per-hour cap, counted here
      // because a DO is the only place two requests cannot both pass a check.
      const now = Date.now();
      this.#whipHits = (this.#whipHits || []).filter((t) => now - t < 3600_000);
      if (this.#whipHits.length >= WHIP_PER_HOUR) {
        return json({ error: 'too many publishes this hour', limit: WHIP_PER_HOUR }, 429);
      }

      // The container publishes to the SAME input. Two publishers is one
      // publisher and a fight, so hand the input over rather than race for it.
      //
      // 🔴 AND WHILE SOMEBODY IS WATCHING, THE CONTAINER KEEPS IT. Until
      // 2026-09-30 this line only handed the input over when nobody held
      // /watch, and with a viewer present it went on to POST anyway, which is
      // exactly the race the sentence above says not to run: a browser
      // publish (/cam/, /keep/, /stage/) and the container's own WHIP leg on
      // one input, and a /webrtc/ viewer's picture swapped for somebody's
      // camera mid-play. A 409 with the count says why in words, and the page
      // asking can say so rather than fight.
      // ⚠️ THE OTHER DIRECTION IS UNCHANGED ON PURPOSE: a viewer arriving while
      // a browser holds the input starts the container's leg as before, and the
      // browser publish loses the input. The container has priority because the
      // pages that watch it have no other source; a camera page can say so.
      if (this.viewers() > 0) {
        return json({
          error: 'input busy: the container is publishing to it for viewers',
          viewers: this.viewers(),
        }, 409);
      }
      await this.#stopPublish();

      const offer = await request.text();
      let up;
      try {
        up = await fetch(whip, {
          method: 'POST',
          headers: { 'content-type': 'application/sdp' },
          body: offer,
        });
      } catch (e) {
        return json({ error: `whip upstream: ${e.message}` }, 502);
      }
      if (!up.ok) return json({ error: `whip upstream ${up.status}`, detail: (await up.text()).slice(0, 200) }, 502);

      // THE `Location` IS ITSELF A CREDENTIAL on Cloudflare — it addresses this
      // session under the same secret path. Handing it back would leak exactly
      // what this endpoint exists to hide, so it is kept here behind an opaque
      // id and DELETE is proxied.
      const loc = up.headers.get('location');
      const id = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
      this.#whipRes = this.#whipRes || new Map();
      this.#whipRes.set(id, { url: loc ? new URL(loc, whip).toString() : null, at: now });
      this.#whipHits.push(now);
      for (const [k, v] of this.#whipRes) if (now - v.at > 6 * 3600_000) this.#whipRes.delete(k);

      return new Response(await up.text(), {
        status: 201,
        headers: {
          'content-type': 'application/sdp',
          'access-control-allow-origin': '*',
          'access-control-expose-headers': 'x-whip-id',
          'x-whip-id': id,
        },
      });
    }
    if (url.pathname.startsWith('/whip/') && request.method === 'DELETE') {
      const id = url.pathname.slice('/whip/'.length);
      const rec = this.#whipRes?.get(id);
      if (!rec) return json({ error: 'unknown publish' }, 404);
      this.#whipRes.delete(id);
      if (rec.url) { try { await fetch(rec.url, { method: 'DELETE' }); } catch { /* gone */ } }
      return json({ ok: true }, 200);
    }
    /**
     * 🔴 THE PREFLIGHT HAS TO COVER `/whip/<id>` AND NOT ONLY `/whip`, AND IT
     * DID NOT, SO THE SESSION TEARDOWN HAS NEVER WORKED FROM A BROWSER ON
     * ANOTHER ORIGIN. MEASURED 2026-09-25 from `http://127.0.0.1:8890`:
     *
     *   Access to fetch at 'https://pub.positron.studio/whip/67b6344…' has been
     *   blocked by CORS policy: Response to preflight request doesn't pass
     *   access control check: It does not have HTTP ok status.
     *
     * `DELETE` is not a simple method, so a cross-origin one preflights, and
     * the OPTIONS for the SESSION path fell through to the 404 below. The POST
     * that opens a session was fine, because its path is exactly `/whip`.
     * ⚠️ **IT SURVIVED BECAUSE THE PATH WAS NEVER DRIVEN.** `/stage/` defaulted
     * to an in-page loopback, so the real publish and its teardown only ran
     * behind a query parameter nobody's harness passed. Removing that default
     * on 2026-09-25 ran this line for the first time and it failed immediately.
     * **A route with no caller is a route with no evidence.**
     */
    if (url.pathname.startsWith('/whip') && request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'POST,DELETE,OPTIONS',
        'access-control-allow-headers': 'content-type',
        'access-control-max-age': '86400',
      } });
    }

    return json({ error: 'use /watch /status /start /stop' }, 404);
  }

  /**
   * 🔴 ONLY `watch` SOCKETS ARE VIEWERS. This was every socket the object
   * held, so a camera socket would have counted as somebody watching and
   * started both test pattern encodes (plans/plan-cam-llhls.md section 1).
   * ⚠️ WRITTEN AS "ALL BUT THE CAMERA ONES", not as `getWebSockets('watch')`,
   * because a viewer socket accepted before tags existed is restored untagged
   * after a deploy, and it is still somebody watching.
   */
  viewers() {
    return this.ctx.getWebSockets().length
      - this.ctx.getWebSockets('cam').length
      - this.ctx.getWebSockets('cam-refused').length;
  }

  /** Why a camera cannot have the input right now, or null. */
  #camBusy() {
    const n = this.viewers();
    if (n > 0) return { error: `the LL-HLS input is busy: ${n} ${n === 1 ? 'page is' : 'pages are'} watching the test pattern on it, and viewers have priority`, viewers: n };
    if (this.#camLive()) return { error: 'another camera already holds the LL-HLS input', viewers: 0 };
    return null;
  }

  #camLive() {
    return this.ctx.getWebSockets('cam').some((ws) => ws.readyState === 1 || ws.readyState === 0);
  }

  /** The live camera session, rebuilt from its socket after an eviction. */
  #camState() {
    if (this.#cam) return this.#cam;
    const ws = this.ctx.getWebSockets('cam')[0];
    if (!ws) return null;
    const a = ws.deserializeAttachment() || {};
    // After an eviction the counters are gone. The session is taken as open
    // and fresh, so the idle check starts again; the container's own watchdog
    // is the floor under that guess.
    this.#cam = { sid: a.sid, at: a.at || Date.now(), lastAt: Date.now(), bytes: 0, chunks: 0, open: true, chain: Promise.resolve(), ws };
    return this.#cam;
  }

  /**
   * End the camera session: tell the page why, close its socket, stop the
   * container's leg. Every one of the three stops arrives here.
   */
  async #endCam(t, why) {
    const c = this.#camState();
    this.#cam = null;
    for (const ws of this.ctx.getWebSockets('cam')) {
      try { ws.send(JSON.stringify({ t, why })); } catch { /* gone */ }
      try { ws.close(4000, String(why).slice(0, 120)); } catch { /* gone */ }
    }
    try {
      await super.fetch(new Request('http://c/cam/stop', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sid: c?.sid, why }),
      }));
    } catch { /* the container's watchdog is the floor */ }
  }

  /**
   * Source settings, tunable without a redeploy of the IMAGE.
   *
   */
  #size() {
    const n = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
    return {
      w: n(this.env.PUB_W, 1280), h: n(this.env.PUB_H, 720), fps: n(this.env.PUB_FPS, 30),
    };
  }

  async #ensureAlarm() {
    const at = await this.ctx.storage.getAlarm();
    if (at === null) await this.ctx.storage.setAlarm(Date.now() + SWEEP_MS);
  }

  async #startPublish(extra) {
    if ((await this.#getRole()) === STAGE) {
      // ONE LEG AND NO ENCODE: the pre-transcoded film copied onto WHIP.
      const url = this.env.STAGE_WHIP_URL;
      if (!url) return;
      try {
        await super.fetch(new Request('http://c/start-whip', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ url, source: 'film-copy', burn: false }),
        }));
      } catch { /* container still waking; the sweep retries */ }
      return;
    }
    const key = this.env.STREAM_KEY;
    const whip = this.env.WHIP_URL;
    // Both legs, same refcount. Cloudflare cannot serve WHEP from an RTMPS
    // input, so 06 and 07 need separate inputs fed the same pattern.
    if (key) {
      try {
        await super.fetch(new Request('http://c/start', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ key, ...this.#size(), ...(extra || {}) }),
        }));
      } catch { /* container still waking; the sweep retries */ }
    }
    if (whip) {
      try {
        await super.fetch(new Request('http://c/start-whip', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ url: whip, ...this.#size() }),
        }));
      } catch { /* same */ }
    }
  }

  async #stopPublish() {
    // /stop stops both legs
    try { await super.fetch(new Request('http://c/stop', { method: 'POST' })); }
    catch { /* already gone */ }
  }

  async alarm() {
    // The camera's two stops that need a clock: a socket that went quiet
    // without closing, and the length cap. Checked every CAM_TICK_MS while a
    // camera is live; the viewer sweep below runs on its own 30 s count.
    const c = this.#camLive() ? this.#camState() : null;
    if (c) {
      const now = Date.now();
      if (c.open && now - c.lastAt > CAM_IDLE_MS) await this.#endCam('stopped', `no video from the camera for ${Math.round((now - c.lastAt) / 1000)} s`);
      else if (now - c.at > CAM_MAX_MS) await this.#endCam('stopped', `a camera session is capped at ${CAM_MAX_MS / 60000} minutes, because every one is recorded on Stream`);
      else if (this.viewers() === 0) {
        await this.ctx.storage.setAlarm(now + CAM_TICK_MS);
        return;
      } else await this.#endCam('taken', 'somebody opened a page that plays the test pattern on this input, and viewers have priority');
    }
    const n = this.viewers();
    if (n > 0) {
      this.#idleTicks = 0;
      // touching the container both checks health and renews its activity
      // timeout, so sleepAfter cannot pull the stream out from under a viewer
      try {
        const r = await super.fetch(new Request('http://c/status'));
        const s = await r.json();
        // either leg dying under a live viewer gets restarted
        const down = (await this.#getRole()) === STAGE
          ? !s.whip?.publishing
          : !s.publishing || !s.whip?.publishing;
        if (down) await this.#startPublish();
      } catch { /* waking */ }
      await this.ctx.storage.setAlarm(Date.now() + SWEEP_MS);
      return;
    }

    this.#idleTicks++;
    if (this.#idleTicks < GRACE_TICKS) {
      // a page reload should not thrash the container
      await this.ctx.storage.setAlarm(Date.now() + SWEEP_MS);
      return;
    }
    await this.#stopPublish();
    await this.ctx.storage.deleteAlarm();
    this.#idleTicks = 0;
  }

  async webSocketClose(ws) {
    const a = ws.deserializeAttachment?.() || {};
    if (a.role === 'cam') {
      // The first stop: the page closed, or its tab died (1006). Only the
      // CURRENT session's close ends the leg, so a stale socket cannot stop a
      // newer camera.
      const c = this.#cam;
      if (!c || c.sid === a.sid) {
        this.#cam = null;
        try {
          await super.fetch(new Request('http://c/cam/stop', {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ sid: a.sid, why: 'the camera page closed its socket' }),
          }));
        } catch { /* the container's watchdog is the floor */ }
      }
      return;
    }
    if (a.role === 'refused') return;
    if (this.viewers() === 0) await this.#ensureAlarm();
  }
  async webSocketError(ws) { return this.webSocketClose(ws); }

  /**
   * A camera's messages. Text is control, binary is one MediaRecorder chunk.
   * 🔴 THE CHUNKS GO THROUGH ONE PROMISE CHAIN. A DO's input gate does not
   * cover a non-storage await, so two chunks a few ms apart would otherwise
   * race each other into ffmpeg's stdin out of order, and a WebM stream with
   * two clusters swapped is a broken stream.
   */
  async webSocketMessage(ws, msg) {
    const a = ws.deserializeAttachment?.() || {};
    if (a.role !== 'cam') return;
    const c = this.#camState();
    if (!c || c.sid !== a.sid) return;
    if (typeof msg === 'string') {
      let m = {};
      try { m = JSON.parse(msg); } catch { return; }
      if (m.t !== 'open' || c.open) return;
      // A viewer may have arrived between the upgrade and this message.
      if (this.viewers() > 0) return this.#endCam('busy', this.#camBusy()?.error || 'the input is busy');
      // Nobody is watching, so the pattern's two legs, which may still be up
      // inside the viewer grace, come down now. The container would stop the
      // RTMPS one itself before opening the key; this also frees the vCPU of
      // the WHIP encode nobody is receiving.
      await this.#stopPublish();
      try {
        const r = await super.fetch(new Request('http://c/cam/open', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ key: this.env.STREAM_KEY, fmt: m.fmt === 'mp4' ? 'mp4' : 'webm', sid: c.sid }),
        }));
        if (!r.ok) throw new Error(`container ${r.status}`);
      } catch (e) {
        return this.#endCam('stopped', `the publisher did not start: ${String(e.message || e).slice(0, 80)}`);
      }
      if (this.#cam !== c) return;          // ended while the container woke
      c.open = true;
      c.lastAt = Date.now();
      // ONLY NOW does the page start recording, so the first chunk, which
      // carries the WebM header, cannot arrive before ffmpeg exists.
      try { ws.send(JSON.stringify({ t: 'ready', sid: c.sid })); } catch { /* gone */ }
      return;
    }
    if (!c.open) return;
    c.lastAt = Date.now();
    c.chunks++;
    c.bytes += msg.byteLength ?? msg.size ?? 0;
    const sid = c.sid;
    c.chain = c.chain.then(async () => {
      if (this.#cam !== c) return;
      try {
        const r = await super.fetch(new Request(`http://c/cam/chunk?sid=${sid}`, { method: 'POST', body: msg }));
        if (r.status === 409 || r.status === 503) {
          const why = r.status === 503 ? 'Stream stopped taking the camera\'s bytes' : 'the publisher lost the camera session';
          await this.#endCam('stopped', why);
        }
      } catch { /* one lost chunk; the idle checks catch a dead leg */ }
    });
  }
}

// Group one device's lines without storing who it is: truncated SHA-256 of
// ip+ua. Enough to tell two phones apart in the log, not enough to identify
// either of them.
async function shortHash(v) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
  return [...new Uint8Array(d)].slice(0, 3).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const json = (o, status = 200) =>
  new Response(JSON.stringify(o), {
    status,
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/' || url.pathname === '') {
      return json({
        worker: 'positron-pub',
        watch: 'wss://pub.positron.studio/watch',
        status: 'GET /status',
        note: 'publishes while at least one viewer holds /watch',
      });
    }
    // /stage/<path> is the stage instance, and only its four routes.
    if (url.pathname.startsWith('/stage/')) {
      const path = url.pathname.slice('/stage'.length);
      if (!STAGE_PATHS.has(path)) return json({ error: 'use /stage/watch /stage/status /stage/start /stage/stop' }, 404);
      if (!env.STAGE_WHIP_URL) {
        return json({ error: 'the stage input is not provisioned: run src/provision-stage.sh' }, 503);
      }
      url.pathname = path;
      const req = new Request(url, request);
      req.headers.set('x-pub-role', STAGE);
      return getContainer(env.PUB, STAGE).fetch(req);
    }
    const req = new Request(request);
    req.headers.delete('x-pub-role');
    return getContainer(env.PUB, NAME).fetch(req);
  },
};
