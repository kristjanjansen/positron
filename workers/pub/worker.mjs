// positron-pub — the publisher for the Act 1 demos, alive exactly as long as
// somebody is watching.
//
//   wss://pub.positron.studio/watch    a viewer. First one in starts the
//                                      publish; last one out stops it.
//   GET  /status                       viewers + container + ffmpeg state
//   POST /start /stop                  manual override (debugging)
//   POST /log                          a device reports what it saw
//   GET  /logs[?format=text]           read those reports back
//   POST /logs/clear                   drop them
//
// WHY REFERENCE COUNTING AND NOT sleepAfter ALONE: the Container base class
// sleeps on REQUEST idleness, and ffmpeg publishing generates no incoming
// requests at all — so sleepAfter would happily kill a stream somebody is
// watching. The viewer count is the real signal; the alarm sweep renews
// activity while anyone is connected and stops the publish once nobody is.

import { Container, getContainer } from '@cloudflare/containers';

const SWEEP_MS = 30_000;   // alarm cadence
const WHIP_PER_HOUR = 20;  // browser publishes allowed per hour, DO-counted
const GRACE_TICKS = 2;     // ~60 s of nobody watching before we stop
const NAME = 'p1';
const LOG_KEEP = 400;          // ring buffer of device reports
const LOG_MAX_BODY = 2000;     // one report cannot flood the rest out

export class Pub extends Container {
  defaultPort = 8080;
  // A generous backstop only. The sweep below is what actually decides.
  sleepAfter = '10m';

  #idleTicks = 0;
  /** browser WHIP publishes: rate-limit stamps, and id -> resource URL */
  #whipHits = [];
  #whipRes = new Map();
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

    // ── a viewer ──────────────────────────────────────────────────────────
    if (url.pathname === '/watch') {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('expected websocket', { status: 426 });
      }
      const pair = new WebSocketPair();
      this.ctx.acceptWebSocket(pair[1]);           // hibernatable
      this.#idleTicks = 0;
      await this.#ensureAlarm();
      // FIRE AND FORGET. Awaiting the publish here delayed the 101 by the
      // container's cold start, so the viewer's own onopen did not fire until
      // ffmpeg was already running — a connection blocking on a video encoder.
      // The alarm sweep retries if this fails, so nothing is lost by not
      // waiting for it.
      if (this.viewers() === 1) this.#startPublish().catch(() => { /* sweep retries */ });
      try {
        pair[1].send(JSON.stringify({ t: 'hello', viewers: this.viewers() }));
      } catch { /* raced a close */ }
      return new Response(null, { status: 101, webSocket: pair[0] });
    }

    if (url.pathname === '/status') {
      let container = null;
      try {
        const r = await super.fetch(new Request('http://c/status'));
        container = await r.json();
      } catch (e) { container = { error: String(e).slice(0, 200) }; }
      return json({
        viewers: this.viewers(),
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
      if (this.viewers() === 0) await this.#stopPublish();

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
    if (url.pathname === '/whip' && request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'POST,DELETE,OPTIONS',
        'access-control-allow-headers': 'content-type',
      } });
    }

    return json({ error: 'use /watch /status /start /stop' }, 404);
  }

  viewers() { return this.ctx.getWebSockets().length; }

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
    const n = this.viewers();
    if (n > 0) {
      this.#idleTicks = 0;
      // touching the container both checks health and renews its activity
      // timeout, so sleepAfter cannot pull the stream out from under a viewer
      try {
        const r = await super.fetch(new Request('http://c/status'));
        const s = await r.json();
        // either leg dying under a live viewer gets restarted
        if (!s.publishing || !s.whip?.publishing) await this.#startPublish();
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

  async webSocketClose() {
    if (this.viewers() === 0) await this.#ensureAlarm();
  }
  async webSocketError() {}
  async webSocketMessage() {}
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
    return getContainer(env.PUB, NAME).fetch(request);
  },
};
