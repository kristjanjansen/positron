// positron-ws, the tokenless relay: wss://ws.positron.studio/room/<name>/ws and GET .../stats.
// Every message goes verbatim to every socket, sender included; never parsed, stored or re-stamped.
// No token, so limits instead: a message roof, byte and message buckets, MAX_SOCKETS, room names.
// why: lessons/workers-relay.md#header

// Budget is bytes per second: fan-out multiplies egress by room size. A looper layer is 7 to 52 KB.
// An overrun drops silently: the sender gets no error, no close and no backpressure.
// A live Durable Object keeps its code until it restarts; /stats reports what the object holds.
// why: lessons/workers-relay.md#limits
import { json, OPEN, keyMatches } from '../../_lib/http.mjs';

const MAX_BYTES = 1000 * 1024;            // per message, just under the platform's 1 MiB; why: lessons/workers-relay.md#max-bytes
const MAX_SOCKETS = 128;                  // a handful of browser tabs could fill 16; why: lessons/workers-relay.md#max-sockets
const BYTES_PER_SEC = 8 * 1024 * 1024;    // per socket, steady
const BYTE_BURST = 16 * 1024 * 1024;
const MSG_PER_SEC = 1000;                 // one knob turn is about 60/s on its own; why: lessons/workers-relay.md#msg-per-sec
const MSG_BURST = 2000;
const STRIKES = 50;                       // overruns tolerated before the socket is closed
// A full room refuses everyone and a redeploy does not clear it: only this object can close
// a socket. Liveness is the ping/pong time, which survives hibernation, or a message time.
// why: lessons/workers-relay.md#idle
const IDLE_MS = 10 * 60 * 1000;           // silent this long, and only if the room is full

// A room ending `-cam` is keyed, because the Pi starts its camera for whoever speaks there.
// The key comes in the first message (`cam.key`), never the URL or a header, which logs record.
// POST /room/<name>-cam/key answers 204 or 403; with no secret set nobody gets in.
// why: lessons/workers-relay.md#cam-room
const CAM_ROOM = /-cam$/;
const CAM_AUTH_MS = 10_000;               // a socket that has not proved the key by then is closed
// Wrong keys an address may try in an hour, counted in the room's storage so
// hibernation does not reset them. Per address only: a room-wide cap would let
// a stranger lock the Pi out.
const KEY_FAILS_PER_HOUR = 10;

/** 4 bytes of SHA-256 of the caller's address, for counting it without keeping it. */
async function addressTag(request) {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
  return [...new Uint8Array(d)].slice(0, 4).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export class Relay {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    /** per socket, in memory: `{ gated, ok }` once read, so a frame does not deserialize an attachment per receiver. Rebuilt from the attachment after hibernation. */
    this.cam = new WeakMap();
    // pure network RTT: answered by the runtime, no DO wake
    this.state.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair('ping', 'pong'),
    );
    /** in-memory only. Hibernation resets it, which is fine: a room that has
     *  been idle long enough to hibernate is not mid-abuse. */
    this.buckets = new WeakMap();
    // Last message time per socket, in memory only (lost on hibernation): the optimistic half of
    // liveness.
    // why: lessons/workers-relay.md#seen
    this.seen = new WeakMap();
    this.evicted = 0;
    this.relayed = 0;
    this.dropped = 0;
    this.closed = 0;
    this.wokeAt = Date.now();
    this.keyFails = null;      // [{ at, who }] for the past hour, read once from storage
  }

  async #fails(who) {
    if (!this.keyFails) this.keyFails = (await this.state.storage.get('keyFails')) || [];
    const now = Date.now();
    this.keyFails = this.keyFails.filter((f) => now - f.at < 3600_000);
    return this.keyFails.filter((f) => f.who === who).length;
  }

  async #failed(who) {
    await this.#fails(who);
    this.keyFails.push({ at: Date.now(), who });
    try { await this.state.storage.put('keyFails', this.keyFails); } catch { /* counted in memory */ }
  }

  async fetch(request) {
    const url = new URL(request.url);

    const name = url.pathname.split('/')[2] || '';
    if (url.pathname.endsWith('/key')) {
      // Only reached for a keyed room (the router refuses the rest).
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
      if (request.method !== 'POST') return new Response('POST the key', { status: 405, headers: CORS });
      const who = await addressTag(request);
      if (await this.#fails(who) >= KEY_FAILS_PER_HOUR) {
        return new Response('too many wrong keys from this address, try again within the hour', { status: 429, headers: CORS });
      }
      const body = (await request.text()).trim();
      const ok = await keyMatches(body, this.env?.PI_CAM_KEY);
      if (!ok) await this.#failed(who);
      return new Response(ok ? null : 'wrong key', { status: ok ? 204 : 403, headers: CORS });
    }
    // A keyed room says nothing about itself to somebody without the key.
    if (url.pathname.endsWith('/stats') && CAM_ROOM.test(name)) return new Response('keyed room', { status: 403, headers: CORS });

    if (url.pathname.endsWith('/stats')) {
      // Hibernation stays (an idle room is free), so these counters reset on wake: sinceWake.
      // why: lessons/workers-relay.md#since-wake
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
    // A socket that has just arrived and not yet spoken is alive.
    // why: lessons/workers-relay.md#arrived
    this.seen.set(pair[1], Date.now());
    // Durable connect time, one write per socket: dating from the object's wake makes a dead socket
    // un-evictable, and a full room stays full.
    // why: lessons/workers-relay.md#connected-at
    const gated = CAM_ROOM.test(url.pathname.split('/')[2] || '');
    const who = gated ? await addressTag(request) : '';
    try { pair[1].serializeAttachment(gated ? { at: Date.now(), gated: true, ok: false, who } : { at: Date.now() }); } catch { /* nothing to lose */ }
    if (gated) {
      this.cam.set(pair[1], { gated: true, ok: false });
      // Two ways out for a socket that never proves the key: a timer, which a hibernating
      // object drops (a silent socket was still open at 11 s), and a sweep on every join.
      // why: lessons/workers-relay.md#key-deadline
      const ws = pair[1];
      setTimeout(() => { if (!this.#camOf(ws).ok) { try { ws.close(4003, 'no key'); } catch { /* gone */ } } }, CAM_AUTH_MS);
      const now = Date.now();
      for (const s of this.state.getWebSockets()) {
        if (s === ws || this.#camOf(s).ok) continue;
        let at = 0;
        try { at = s.deserializeAttachment()?.at || 0; } catch { /* old */ }
        if (now - at > CAM_AUTH_MS) { try { s.close(4003, 'no key'); } catch { /* gone */ } }
      }
    }
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  // How long since this socket last gave a sign of life: the ping/pong time survives hibernation;
  // the in-memory message time covers senders that never ping.
  // why: lessons/workers-relay.md#idle-ms
  #idleMs(ws, now) {
    const auto = this.state.getWebSocketAutoResponseTimestamp(ws);
    let last = Math.max(auto ? auto.getTime() : 0, this.seen.get(ws) || 0);
    if (!last) {
      // Never pinged and silent since wake: use the connect time.
      // A socket with no attachment predates this code, so it counts as old.
      // why: lessons/workers-relay.md#no-attachment
      let at = 0;
      try { at = ws.deserializeAttachment()?.at || 0; } catch { /* old socket */ }
      last = at;
    }
    return last ? now - last : Infinity;
  }

  // Close sockets silent past IDLE_MS, only when the room is full.
  // why: lessons/workers-relay.md#reclaim
  #reclaim() {
    const now = Date.now();
    for (const ws of this.state.getWebSockets()) {
      if (this.#idleMs(ws, now) < IDLE_MS) continue;
      try { ws.close(1001, 'idle'); } catch { /* already gone */ }
      this.evicted++;
    }
  }

  // Two buckets refilled by elapsed time: bytes (fan-out multiplies it) and messages. Either
  // running
  // dry drops the message; persistent overrun closes the socket.
  // why: lessons/workers-relay.md#allow
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

  /** Is this socket in a keyed room, and has it proved the key. Old sockets with no attachment are ungated. */
  #camOf(ws) {
    let c = this.cam.get(ws);
    if (!c) {
      let a = null;
      try { a = ws.deserializeAttachment(); } catch { /* old socket */ }
      c = { gated: !!a?.gated, ok: !!a?.ok };
      this.cam.set(ws, c);
    }
    return c;
  }

  async webSocketMessage(ws, msg) {
    // Mark liveness before any cap or bucket check, or the busiest client looks like the deadest.
    // why: lessons/workers-relay.md#alive-first
    this.seen.set(ws, Date.now());
    // Count UTF-8 bytes: `byteLength` is undefined on a string, `String.length` counts UTF-16
    // units. The length test is a safe fast reject first: UTF-8 bytes are never fewer than units.
    // why: lessons/workers-relay.md#byte-roof
    const size = typeof msg === 'string'
      ? (msg.length > MAX_BYTES ? msg.length : new TextEncoder().encode(msg).byteLength)
      : msg.byteLength;
    if (size > MAX_BYTES) { this.dropped++; return; }

    // A keyed room: nothing from a socket that has not proved the key, except
    // the message that proves it.
    const me = this.#camOf(ws);
    if (me.gated && !me.ok) {
      let who = '';
      try { who = ws.deserializeAttachment()?.who || ''; } catch { /* old socket */ }
      if (await this.#fails(who) >= KEY_FAILS_PER_HOUR) {
        try { ws.close(4029, 'too many wrong keys'); } catch { /* gone */ }
        return;
      }
      let m = null;
      if (typeof msg === 'string' && msg.length < 2048) { try { m = JSON.parse(msg); } catch { /* not the key */ } }
      if (m?.type === 'cam.key' && await keyMatches(m.key, this.env?.PI_CAM_KEY)) {
        me.ok = true;
        try { ws.serializeAttachment({ ...(ws.deserializeAttachment() || {}), gated: true, ok: true }); } catch { /* memory still holds it */ }
        try { ws.send(JSON.stringify({ type: 'cam.key.ok' })); } catch { /* gone */ }
      } else {
        await this.#failed(who);
        try { ws.close(4003, 'wrong key'); } catch { /* gone */ }
      }
      return;
    }

    const verdict = this.#allow(ws, size);
    if (verdict === 'close') {
      this.closed++;
      try { ws.close(1008, 'rate limit'); } catch { /* already gone */ }
      return;
    }
    if (!verdict) { this.dropped++; return; }

    // Verbatim to everyone, sender included. In a keyed room only to sockets that proved the key,
    // and a binary frame is not echoed to its sender.
    // why: lessons/workers-relay.md#fan-out
    if (me.gated) {
      const binary = typeof msg !== 'string';
      for (const s of this.state.getWebSockets()) {
        if (binary && s === ws) continue;
        if (!this.#camOf(s).ok) continue;
        try { s.send(msg); } catch { /* peer vanished mid-send */ }
      }
      this.relayed++;
      return;
    }
    for (const s of this.state.getWebSockets()) {
      try { s.send(msg); } catch { /* peer vanished mid-send */ }
    }
    this.relayed++;
  }

  async webSocketClose() {}
  async webSocketError() {}
}

const CORS = { ...OPEN, 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type' };


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
    const m = url.pathname.match(/^\/room\/([a-zA-Z0-9_-]{1,64})\/(ws|stats|key)$/);
    if (!m) return new Response('use /room/<name>/ws or /room/<name>/stats', { status: 404 });
    if (m[2] === 'key' && !CAM_ROOM.test(m[1])) return new Response('only a keyed room has a key', { status: 404 });

    const id = env.ROOMS.idFromName(m[1]);
    return env.ROOMS.get(id).fetch(request);
  },
};
