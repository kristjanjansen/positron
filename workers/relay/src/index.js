/**
 * positron-ws — the TOKENLESS verbatim WS relay. ws.positron.studio
 *
 * elektron-jam does the same job but is token-gated, and a token pasted into a
 * public page is a published token — which is exactly why the looper's
 * cross-device rooms have been a deliberate gap. This worker closes it by
 * removing the secret rather than publishing one, and paying for that with
 * limits instead.
 *
 *   wss://ws.positron.studio/room/<name>/ws
 *   GET  https://ws.positron.studio/room/<name>/stats
 *
 * What it keeps from elektron-jam, because these are load-bearing:
 *   · VERBATIM. No parse, no storage, no envelope. Text or binary, relayed as
 *     received to EVERY socket in the room INCLUDING the sender — that echo is
 *     the loopback-through-server ordering point, not an accident.
 *   · NEVER RE-STAMP. Sender stamps live inside the payload. A relay's idea of
 *     "now" measured +/-50 ms of bias, which at a 2 s loop is 2.5 % of the
 *     circle and an audible flam.
 *   · ping -> pong via hibernation autoresponse, so an RTT probe never wakes
 *     the DO and measures pure network. Verified: a peer in the same room never
 *     sees the ping, because the runtime answers it and the DO stays asleep.
 *
 * What it adds, because there is no longer a token in front of it:
 *   · a 256 KiB message roof and a BYTES-PER-SECOND budget (fan-out is the cost)
 *   · at most MAX_SOCKETS in a room
 *   · a per-socket token bucket; a socket that keeps overrunning is closed
 *   · room names constrained, so the DO namespace cannot be sprayed with junk
 *
 * Residual risk, stated rather than hidden: nothing here caps how many DISTINCT
 * rooms one client can open, so a determined bot can still create rooms. That
 * needs an account-wide limiter DO or Cloudflare rate-limiting rules in front,
 * and is deliberately not pretended-to here.
 */

// A 4 KiB roof was inherited from elektron-jam, where it was right: jam relayed
// tiny latency probes. It is WRONG here. peer.mjs publishes a committed layer as
// ONE message carrying the material — every note row of every layer, ~98 bytes
// each. Measured: 2 layers x 16 notes is ~7 KB, 8 x 32 is ~52 KB. A 4 KiB roof
// passes the tiny live-note plane and silently eats the loop plane, which is the
// one thing cross-device looping needs.
//
// The real cost is not message size, it is FAN-OUT AMPLIFICATION: one message
// goes to every socket in the room, so N sockets multiply egress by N. So the
// budget is bytes-per-second, and the per-message cap only has to sit under the
// platform's 1 MiB WebSocket message limit with room to spare.
// 🔴 RAISED 2026-09-13, AND THE OLD NUMBERS WERE GUESSES DEFENDED AS LIMITS.
//
// They were picked before any of this had been run in anger, against a
// production this project does not have and a public it has never had. What
// they actually produced was a day of hand-serialising work — refusing to run
// a measurement because a demo was open, treating one relay as a thing to take
// turns on — and every one of those refusals was enforcing a number somebody
// made up rather than one anybody measured.
//
// What IS measured, and is why the old ceiling was visible at all: at both 120
// and 300 msg/s the relay delivered exactly 298 messages in three seconds —
// `MSG_BURST` 120 plus 3 s at 60/s — and THE SENDER WAS TOLD NOTHING. No
// error, no close, no backpressure. That property is worth keeping and it has
// nothing to do with the size of the number.
//
// So the numbers open up and the honesty stays. The real constraints are the
// platform's (a 1 MiB WebSocket message) and the device's (one Raspberry Pi,
// one JACK graph, and no cap here makes that two). When something actually
// breaks, the break will be a measurement, which is worth more than a guess
// that prevented it.
//
// ⚠️ A LIVE DURABLE OBJECT KEEPS ITS CODE. Deploying does not change a room
// that has a socket in it — the board holds `studio-1` awake — so these
// numbers arrive there when the object next restarts, and in a fresh room
// immediately. `/room/<name>/stats` reports what the OBJECT thinks, which is
// how to tell the two apart.
//
// ⚠️ `demo/wire/` reads these off `/stats` rather than assuming them, so it
// follows whatever they are — but its recorded 298-in-three-seconds belongs to
// the old values and is history now.
const MAX_BYTES = 1000 * 1024;            // per message — just under the platform's 1 MiB
const MAX_SOCKETS = 128;                  // was 16, which a handful of browser tabs could fill
const BYTES_PER_SEC = 8 * 1024 * 1024;    // per socket, steady
const BYTE_BURST = 16 * 1024 * 1024;
const MSG_PER_SEC = 1000;                 // was 60 — one knob turn is ~60/s on its own
const MSG_BURST = 2000;
const STRIKES = 50;                       // overruns tolerated before the socket is closed
// 🔴 A FULL ROOM IS A SILENT OUTAGE, AND A DEPLOY DOES NOT CLEAR IT. MEASURED
// 2026-09-12: `studio-1` sat at 16/16 and refused the box for hours — the board
// dialled every 30 s and logged `closed 1006`, which reads as a network fault
// on the board rather than a full room. Hibernated sockets are RESTORED across
// a restart (that is the point of hibernation), so redeploying the worker does
// not drop them: nothing outside the object can close a socket, so the object
// has to do it.
//
// ⚠️ Liveness cannot come from "did it send recently" alone — a page that is
// only LISTENING to audio sends nothing for minutes and is perfectly alive.
// `getWebSocketAutoResponseTimestamp` is the signal that survives hibernation:
// `wire.mjs` clients send 'ping' and the RUNTIME answers without waking this
// object, so the timestamp is maintained for free. In-memory message times
// cover the agents, which do not ping but do send constantly.
const IDLE_MS = 10 * 60 * 1000;           // silent this long, and only if the room is full

export class Relay {
  constructor(state) {
    this.state = state;
    // pure network RTT: answered by the runtime, no DO wake
    this.state.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair('ping', 'pong'),
    );
    /** in-memory only. Hibernation resets it, which is fine: a room that has
     *  been idle long enough to hibernate is not mid-abuse. */
    this.buckets = new WeakMap();
    /** last message time per socket, in memory only — lost on hibernation,
     *  which is why it is only ever the OPTIMISTIC half of a liveness check. */
    this.seen = new WeakMap();
    this.evicted = 0;
    this.relayed = 0;
    this.dropped = 0;
    this.closed = 0;
    this.wokeAt = Date.now();
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname.endsWith('/stats')) {
      // HIBERNATION IS KEPT ON PURPOSE (it is what makes an idle room free, and
      // setWebSocketAutoResponse only exists on the hibernatable API). The cost
      // is that these counters live in DO memory and reset on wake — so they are
      // reported as sinceWake rather than dressed up as lifetime totals.
      return json({
        sockets: this.state.getWebSockets().length,
        sinceWakeMs: Date.now() - this.wokeAt,
        relayedSinceWake: this.relayed,
        droppedSinceWake: this.dropped,
        closedForAbuseSinceWake: this.closed,
        evictedIdleSinceWake: this.evicted,
        // so a full room can be told from a busy one without guessing
        idleMs: this.state.getWebSockets().map((ws) => {
          const v = this.#idleMs(ws, Date.now());
          return v === Infinity ? 'never spoke' : v;
        }).sort((a, b) => (b === 'never spoke' ? 1 : a === 'never spoke' ? -1 : b - a)),
        limits: { maxBytes: MAX_BYTES, maxSockets: MAX_SOCKETS, bytesPerSec: BYTES_PER_SEC, msgPerSec: MSG_PER_SEC },
      });
    }

    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('expected websocket', { status: 426 });
    }
    if (this.state.getWebSockets().length >= MAX_SOCKETS) this.#reclaim();
    if (this.state.getWebSockets().length >= MAX_SOCKETS) {
      // refuse rather than accept-and-drop: a client that is told no can retry
      return new Response(`room full (${MAX_SOCKETS})`, { status: 503 });
    }

    const pair = new WebSocketPair();
    this.state.acceptWebSocket(pair[1]);
    // A socket that has just arrived and not yet spoken is alive, obviously —
    // without this it looks exactly like one whose owner left.
    this.seen.set(pair[1], Date.now());
    // 🔴 AND THE SAME FACT AGAIN, DURABLY. The in-memory line above is lost on
    // hibernation, and dating a restored socket from the object's WAKE instead
    // makes it permanently un-evictable: every restart resets its apparent age,
    // so a room full of dead sockets stays full forever — measured, that is
    // exactly what `studio-1` did. ONE write per connection, never per message.
    try { pair[1].serializeAttachment({ at: Date.now() }); } catch { /* nothing to lose */ }
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  /**
   * How long since this socket last gave any sign of life. The runtime's
   * ping/pong timestamp survives hibernation and costs nothing; the in-memory
   * message time does not survive but covers senders that never ping.
   */
  #idleMs(ws, now) {
    const auto = this.state.getWebSocketAutoResponseTimestamp(ws);
    let last = Math.max(auto ? auto.getTime() : 0, this.seen.get(ws) || 0);
    if (!last) {
      // Never pinged, nothing sent since this object woke. Fall back to WHEN IT
      // CONNECTED, which survives hibernation. A socket with no attachment at
      // all predates this code, so it has been sitting there at least since the
      // deploy — old by definition, and the only way the stuck rooms clear.
      let at = 0;
      try { at = ws.deserializeAttachment()?.at || 0; } catch { /* old socket */ }
      last = at;
    }
    return last ? now - last : Infinity;
  }

  /**
   * Close sockets that have been silent past IDLE_MS. Called ONLY when the room
   * is full — an idle socket in a room with space costs nothing and evicting it
   * would be a policy nobody asked for.
   */
  #reclaim() {
    const now = Date.now();
    for (const ws of this.state.getWebSockets()) {
      if (this.#idleMs(ws, now) < IDLE_MS) continue;
      try { ws.close(1001, 'idle'); } catch { /* already gone */ }
      this.evicted++;
    }
  }

  /**
   * TWO buckets, both refilled by elapsed time:
   *   bytes — the one that matters, because fan-out multiplies it by room size
   *   msgs  — so a flood of 10-byte messages still costs something
   * Either running dry drops the message; persistent overrun closes the socket.
   */
  #allow(ws, size) {
    const now = Date.now();
    let b = this.buckets.get(ws);
    if (!b) { b = { bytes: BYTE_BURST, msgs: MSG_BURST, last: now, strikes: 0 }; this.buckets.set(ws, b); }
    const dt = (now - b.last) / 1000;
    b.bytes = Math.min(BYTE_BURST, b.bytes + dt * BYTES_PER_SEC);
    b.msgs = Math.min(MSG_BURST, b.msgs + dt * MSG_PER_SEC);
    b.last = now;
    if (b.bytes < size || b.msgs < 1) {
      b.strikes++;
      return b.strikes < STRIKES ? false : 'close';
    }
    b.bytes -= size;
    b.msgs -= 1;
    b.strikes = 0;                          // a well-behaved socket forgets its past
    return true;
  }

  async webSocketMessage(ws, msg) {
    // ⚠️ Before any cap or bucket check — a socket that is being rate-limited is
    // very much alive, and marking liveness only on ACCEPTED messages would
    // make the busiest client look like the deadest one.
    this.seen.set(ws, Date.now());
    // A TRUE BYTE ROOF. `msg.byteLength` is undefined on a string, so the naive
    // `msg.byteLength > MAX_BYTES` never fires for text at all; and
    // `String.length` counts UTF-16 CODE UNITS, so 4000 units of emoji is 8000
    // UTF-8 bytes and slipped through a length check. Measured, not assumed.
    // UTF-8 bytes >= code units always, so the length test is a safe fast
    // reject before the encode.
    const size = typeof msg === 'string'
      ? (msg.length > MAX_BYTES ? msg.length : new TextEncoder().encode(msg).byteLength)
      : msg.byteLength;
    if (size > MAX_BYTES) { this.dropped++; return; }

    const verdict = this.#allow(ws, size);
    if (verdict === 'close') {
      this.closed++;
      try { ws.close(1008, 'rate limit'); } catch { /* already gone */ }
      return;
    }
    if (!verdict) { this.dropped++; return; }

    // VERBATIM, to everyone, sender included. Never parsed, never re-stamped.
    for (const s of this.state.getWebSockets()) {
      try { s.send(msg); } catch { /* peer vanished mid-send */ }
    }
    this.relayed++;
  }

  async webSocketClose() {}
  async webSocketError() {}
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
        relay: 'positron-ws',
        usage: 'wss://ws.positron.studio/room/<name>/ws',
        stats: 'GET /room/<name>/stats',
        tokenless: true,
        limits: { maxBytes: MAX_BYTES, maxSockets: MAX_SOCKETS, bytesPerSec: BYTES_PER_SEC, msgPerSec: MSG_PER_SEC },
      });
    }

    // constrained so the DO namespace cannot be sprayed with arbitrary junk
    const m = url.pathname.match(/^\/room\/([a-zA-Z0-9_-]{1,64})\/(ws|stats)$/);
    if (!m) return new Response('use /room/<name>/ws or /room/<name>/stats', { status: 404 });

    const id = env.ROOMS.idFromName(m[1]);
    return env.ROOMS.get(id).fetch(request);
  },
};
