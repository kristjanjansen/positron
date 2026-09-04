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
const MAX_BYTES = 256 * 1024;             // per message
const MAX_SOCKETS = 16;
const BYTES_PER_SEC = 512 * 1024;         // per socket, steady
const BYTE_BURST = 2 * 1024 * 1024;       // enough for a fat session in one go
const MSG_PER_SEC = 60;                   // a separate bucket, for tiny-message floods
const MSG_BURST = 120;
const STRIKES = 20;                       // overruns tolerated before the socket is closed

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
        limits: { maxBytes: MAX_BYTES, maxSockets: MAX_SOCKETS, bytesPerSec: BYTES_PER_SEC, msgPerSec: MSG_PER_SEC },
      });
    }

    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('expected websocket', { status: 426 });
    }
    if (this.state.getWebSockets().length >= MAX_SOCKETS) {
      // refuse rather than accept-and-drop: a client that is told no can retry
      return new Response(`room full (${MAX_SOCKETS})`, { status: 503 });
    }

    const pair = new WebSocketPair();
    this.state.acceptWebSocket(pair[1]);
    return new Response(null, { status: 101, webSocket: pair[0] });
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
