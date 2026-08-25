/**
 * Cue relay for timed messages alongside a live stream.
 *
 * One Durable Object per room. Clients connect over WebSocket, publish cues,
 * and every connected client receives them. New joiners get the stored
 * backlog so late viewers can render history.
 *
 *   wss://<worker>/room/<name>/ws
 *
 * Frames (JSON):
 *   client -> server
 *     {type:'cue',    cue:{id?, at, until?, data}}   schedule/revise
 *     {type:'cancel', id}                            unschedule
 *     {type:'ping',   t0}                            latency probe
 *   server -> client
 *     {type:'cues',   cues:[...]}                    backlog on join
 *     {type:'cue',    cue:{..., serverAt}}           broadcast; serverAt =
 *                                                    DO wall clock at relay,
 *                                                    for one-way lag measurement
 *     {type:'cancel', id}
 *     {type:'pong',   t0, t1}                        t1 = DO wall clock
 *
 * Uses the WebSocket hibernation API: an idle room costs nothing.
 */

const BACKLOG_LIMIT = 500;

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

    if (f.type === 'cue' && f.cue && f.cue.at != null) {
      const cue = { ...f.cue, serverAt: Date.now() };
      cue.id = cue.id ?? crypto.randomUUID();
      // Broadcast FIRST: delivery latency must not be gated on persistence.
      // Measured: awaiting the storage.put before send cost ~50 ms p50.
      this.broadcast({ type: 'cue', cue });
      let cues = (await this.cues()).filter((c) => c.id !== cue.id);
      cues.push(cue);
      cues.sort((a, b) => a.at - b.at);
      if (cues.length > BACKLOG_LIMIT) cues = cues.slice(-BACKLOG_LIMIT);
      await this.state.storage.put('cues', cues);
      return;
    }

    if (f.type === 'cancel' && f.id) {
      await this.state.storage.put('cues', (await this.cues()).filter((c) => c.id !== f.id));
      this.broadcast({ type: 'cancel', id: f.id });
    }
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

export default {
  async fetch(request, env) {
    const m = new URL(request.url).pathname.match(/^\/room\/([\w-]{1,64})\/ws$/);
    if (!m) return new Response('use /room/<name>/ws', { status: 404 });
    const id = env.ROOMS.idFromName(m[1]);
    return env.ROOMS.get(id).fetch(request);
  },
};
