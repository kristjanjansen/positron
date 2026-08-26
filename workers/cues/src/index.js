/**
 * Cue relay for timed messages alongside a live stream.
 *
 * One Durable Object per room. Clients connect over WebSocket, publish cues,
 * and every connected client receives them. New joiners get the stored
 * backlog so late viewers can render history.
 *
 *   wss://<worker>/room/<name>/ws?token=<CUES_TOKEN>
 *
 * Auth: every WS upgrade requires ?token=… (or Authorization: Bearer …)
 * matching the CUES_TOKEN worker secret. Fails closed when the secret is
 * missing. Without it, anyone with the URL could inject cues into any room.
 *
 * Frames (JSON):
 *   client -> server
 *     {type:'cue',    cue:{id?, at, until?, data}}   schedule/revise
 *                     at must be a finite number; serialized cue <= 8 KB —
 *                     invalid cues get {type:'error'} back, nothing relayed
 *     {type:'cancel', id}                            unschedule
 *     {type:'ping',   t0}                            latency probe
 *   server -> client
 *     {type:'cues',   cues:[...]}                    backlog on join
 *     {type:'cue',    cue:{..., serverAt}}           broadcast; serverAt =
 *                                                    DO wall clock at relay,
 *                                                    for one-way lag measurement
 *     {type:'cancel', id}
 *     {type:'error',  of:'cue', error}               rejected frame (sender only)
 *     {type:'pong',   t0, t1}                        t1 = DO wall clock
 *
 * Uses the WebSocket hibernation API: an idle room costs nothing.
 */

const BACKLOG_LIMIT = 500;
const CUE_MAX_BYTES = 8 * 1024; // serialized cue size cap

export class CueRoom {
  constructor(state) {
    this.state = state;
    // Answer "ping" with "pong" WITHOUT waking a hibernated DO: zero wake
    // latency, zero duration billing. Clients measure pure network RTT.
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

    // Backlog for the new joiner.
    const cues = await this.cues();
    pair[1].send(JSON.stringify({ type: 'cues', cues }));

    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  async cues() {
    return (await this.state.storage.get('cues')) || [];
  }

  async webSocketMessage(ws, raw) {
    let f;
    try { f = JSON.parse(raw); } catch { return; }

    if (f.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong', t0: f.t0, t1: Date.now() }));
      return;
    }

    if (f.type === 'cue' && f.cue) {
      // Validate before relaying: a bad `at` would wedge every client's queue
      // sort, and an unbounded cue would bloat the backlog for every joiner.
      if (!Number.isFinite(f.cue.at)) {
        ws.send(JSON.stringify({ type: 'error', of: 'cue', error: 'cue.at must be a finite number' }));
        return;
      }
      const cue = { ...f.cue, serverAt: Date.now() };
      cue.id = cue.id ?? crypto.randomUUID();
      if (JSON.stringify(cue).length > CUE_MAX_BYTES) {
        ws.send(JSON.stringify({ type: 'error', of: 'cue', error: `cue exceeds ${CUE_MAX_BYTES} bytes` }));
        return;
      }
      // Broadcast FIRST: delivery latency must not be gated on persistence.
      // Measured: awaiting the storage.put before send cost ~50 ms p50.
      this.broadcast({ type: 'cue', cue });
      let cues = (await this.cues()).filter((c) => c.id !== cue.id);
      cues.push(cue);
      cues.sort((a, b) => a.at - b.at);
      if (cues.length > BACKLOG_LIMIT) cues = cues.slice(-BACKLOG_LIMIT);
      await this.putCues(cues);
      return;
    }

    if (f.type === 'cancel' && f.id) {
      await this.putCues((await this.cues()).filter((c) => c.id !== f.id));
      this.broadcast({ type: 'cancel', id: f.id });
    }
  }

  // Storage writes never take the room down: the broadcast has already gone
  // out, so a failed put costs backlog durability, not the live show.
  async putCues(cues) {
    try { await this.state.storage.put('cues', cues); }
    catch (e) { console.error('putCues failed (room kept alive):', e && e.message); }
  }

  broadcast(frame) {
    const msg = JSON.stringify(frame);
    for (const ws of this.state.getWebSockets()) {
      try { ws.send(msg); } catch {}
    }
  }

  async webSocketClose() {}
  async webSocketError() {}
}

// ?token=… or Authorization: Bearer … must equal the CUES_TOKEN secret
// (same shape as workers/rtc `authorized`; fails closed without the secret).
function authorized(request, url, env) {
  if (!env.CUES_TOKEN) return false;
  const q = url.searchParams.get('token');
  const h = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const supplied = q || h;
  if (!supplied || supplied.length !== env.CUES_TOKEN.length) return false;
  let diff = 0;
  for (let i = 0; i < supplied.length; i++) {
    diff |= supplied.charCodeAt(i) ^ env.CUES_TOKEN.charCodeAt(i);
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
