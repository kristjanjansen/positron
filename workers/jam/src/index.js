/**
 * elektron-jam — minimal verbatim WS relay for the jamming latency experiments
 * (proto/jam). Deliberately tinier than elektron-cues: NO parse, NO storage,
 * NO envelope — every message (text OR binary ArrayBuffer) is relayed verbatim
 * to EVERY socket in the room, sender included (the loopback-through-server
 * ordering point, research/timeline-own-prior-art §1.5). Sender stamps live
 * inside the payload; the relay never re-stamps (§2 "never re-stamp").
 *
 *   wss://elektron-jam.<acct>.workers.dev/room/<name>/ws?token=<JAM_TOKEN>
 *
 * A literal "ping" gets "pong" via hibernation autoresponse (no DO wake) —
 * pure network RTT, same as cues. Auth fails closed (CUES_TOKEN pattern).
 */

export class JamRoom {
  constructor(state) {
    this.state = state;
    this.state.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair('ping', 'pong'),
    );
  }

  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('expected websocket', { status: 426 });
    }
    const pair = new WebSocketPair();
    this.state.acceptWebSocket(pair[1]);
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  async webSocketMessage(ws, msg) {
    if (msg.byteLength !== undefined && msg.byteLength > 4096) return; // sanity roof
    if (typeof msg === 'string' && msg.length > 4096) return;
    for (const s of this.state.getWebSockets()) {
      try { s.send(msg); } catch {}
    }
  }

  async webSocketClose() {}
  async webSocketError() {}
}

function authorized(request, url, env) {
  if (!env.JAM_TOKEN) return false;
  const q = url.searchParams.get('token');
  const h = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const supplied = q || h;
  if (!supplied || supplied.length !== env.JAM_TOKEN.length) return false;
  let diff = 0;
  for (let i = 0; i < supplied.length; i++) {
    diff |= supplied.charCodeAt(i) ^ env.JAM_TOKEN.charCodeAt(i);
  }
  return diff === 0;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const m = url.pathname.match(/^\/room\/([\w-]{1,64})\/ws$/);
    if (!m) return new Response('use /room/<name>/ws?token=…', { status: 404 });
    if (!authorized(request, url, env)) return new Response('bad or missing token', { status: 403 });
    const id = env.ROOMS.idFromName(m[1]);
    return env.ROOMS.get(id).fetch(request);
  },
};
