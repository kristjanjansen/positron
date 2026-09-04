// positron-pub — the publisher for the Act 1 demos, alive exactly as long as
// somebody is watching.
//
//   wss://pub.positron.studio/watch    a viewer. First one in starts the
//                                      publish; last one out stops it.
//   GET  /status                       viewers + container + ffmpeg state
//   POST /start /stop                  manual override (debugging)
//
// WHY REFERENCE COUNTING AND NOT sleepAfter ALONE: the Container base class
// sleeps on REQUEST idleness, and ffmpeg publishing generates no incoming
// requests at all — so sleepAfter would happily kill a stream somebody is
// watching. The viewer count is the real signal; the alarm sweep renews
// activity while anyone is connected and stops the publish once nobody is.

import { Container, getContainer } from '@cloudflare/containers';

const SWEEP_MS = 30_000;   // alarm cadence
const GRACE_TICKS = 2;     // ~60 s of nobody watching before we stop
const NAME = 'p1';

export class Pub extends Container {
  defaultPort = 8080;
  // A generous backstop only. The sweep below is what actually decides.
  sleepAfter = '10m';

  #idleTicks = 0;

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
      // first viewer starts the publish
      if (this.viewers() === 1) await this.#startPublish();
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

    if (url.pathname === '/start' && request.method === 'POST') {
      await this.#startPublish();
      return json({ ok: true, viewers: this.viewers() });
    }
    if (url.pathname === '/stop' && request.method === 'POST') {
      await this.#stopPublish();
      return json({ ok: true });
    }

    return json({ error: 'use /watch /status /start /stop' }, 404);
  }

  viewers() { return this.ctx.getWebSockets().length; }

  async #ensureAlarm() {
    const at = await this.ctx.storage.getAlarm();
    if (at === null) await this.ctx.storage.setAlarm(Date.now() + SWEEP_MS);
  }

  async #startPublish() {
    const key = this.env.STREAM_KEY;
    if (!key) return;                              // secret not set: stay dark
    try {
      await super.fetch(new Request('http://c/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key }),
      }));
    } catch { /* container still waking; the sweep retries */ }
  }

  async #stopPublish() {
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
        if (!s.publishing) await this.#startPublish();   // crashed: restart
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
