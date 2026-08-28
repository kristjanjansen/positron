/**
 * elektron-osc — a verbatim WS relay for OSC-over-WebSocket, and the shape of
 * the recorder/ordering point an OSC timeline actually wants.
 *
 *   wss://elektron-osc.<acct>.workers.dev/room/<name>/ws?token=<OSC_TOKEN>
 *
 * Same skeleton as elektron-jam (hibernation WebSockets, verbatim relay, fail-
 * closed constant-time auth) with THREE differences, each of which is the
 * point of having a separate worker rather than reusing jam's:
 *
 *  1. THE FRAME IS AN OSC PACKET, NOT A 16-BYTE NOTE. jam's 4 KB roof is fine
 *     for a note; an OSC bundle of 8 messages with string arguments is bigger
 *     and a state assertion re-sending 200 levels is bigger still. The roof is
 *     64 KB — still a sanity roof, no longer a semantic one. (A WebSocket
 *     message is already framed, so we never need OSC's int32 length framing on
 *     this transport; that is why timeline/osc.mjs implements length framing
 *     for raw TCP and nothing at all here.)
 *
 *  2. IT COUNTS, AND IT WILL TELL YOU. `GET /room/<name>/stats` returns the
 *     room's relayed/dropped counters. A relay that cannot say how many packets
 *     it forwarded cannot be used to attribute loss, and attributing loss is
 *     the entire job in a transport comparison. Counting is O(1) per message
 *     and does not parse the payload.
 *
 *  3. IT NEVER PARSES AND NEVER RE-STAMPS. An OSC bundle's time tag is the
 *     SENDER's claim about when its contents happen. A relay that rewrote it
 *     would destroy the one field the timeline derives `at` from, and a relay
 *     that split a bundle would break atomicity at the only layer that cannot
 *     detect it. So the bundle crosses this worker as opaque bytes: ONE
 *     WebSocket message in, ONE WebSocket message out. That is also why this
 *     transport gets bundle integrity for free — see proto/osc/NOTES.md §3.
 */

const MAX_FRAME = 65536;

export class OscRoom {
  constructor(state) {
    this.state = state;
    // literal "ping" -> "pong" WITHOUT waking the DO: a pure network-RTT probe.
    this.state.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair('ping', 'pong'),
    );
    this.relayed = 0;
    this.dropped = 0;
    this.bytes = 0;
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname.endsWith('/stats')) {
      return Response.json({
        sockets: this.state.getWebSockets().length,
        relayed: this.relayed, dropped: this.dropped, bytes: this.bytes,
      });
    }
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('expected websocket', { status: 426 });
    }
    const pair = new WebSocketPair();
    this.state.acceptWebSocket(pair[1]);
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  /** Verbatim fan-out to EVERY socket, sender included — the loopback-through-
   *  server ordering point. One inbound message becomes exactly one outbound
   *  message per peer: a bundle is never split, so bundle integrity on this
   *  transport is a property of the code, not of the network. */
  async webSocketMessage(ws, msg) {
    const n = msg.byteLength !== undefined ? msg.byteLength : msg.length;
    if (n > MAX_FRAME) { this.dropped++; return; }
    this.relayed++; this.bytes += n;
    for (const s of this.state.getWebSockets()) {
      try { s.send(msg); } catch {}
    }
  }

  async webSocketClose() {}
  async webSocketError() {}
}

function authorized(request, url, env) {
  if (!env.OSC_TOKEN) return false;                 // fail CLOSED on a missing secret
  const q = url.searchParams.get('token');
  const h = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const supplied = q || h;
  if (!supplied || supplied.length !== env.OSC_TOKEN.length) return false;
  let diff = 0;
  for (let i = 0; i < supplied.length; i++) {
    diff |= supplied.charCodeAt(i) ^ env.OSC_TOKEN.charCodeAt(i);
  }
  return diff === 0;                                // constant time in the length
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const m = url.pathname.match(/^\/room\/([\w-]{1,64})\/(ws|stats)$/);
    if (!m) return new Response('use /room/<name>/ws?token=… or /room/<name>/stats?token=…', { status: 404 });
    if (!authorized(request, url, env)) return new Response('bad or missing token', { status: 403 });
    return env.ROOMS.get(env.ROOMS.idFromName(m[1])).fetch(request);
  },
};
