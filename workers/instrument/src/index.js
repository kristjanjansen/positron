/**
 * elektron-instrument — the REMOTE INSTRUMENT control plane.
 *
 * A synth owner ("host") registers a physical instrument and holds one WS open.
 * A player anywhere lists instruments and opens a WS to one of them; the two
 * sockets exchange WebRTC offer/answer/ICE and session lifecycle frames. Media
 * (MIDI up on a DataChannel, audio+panel-video back) NEVER touches this worker —
 * it is signaling + registry only, exactly like workers/rtc's RtcRoom but for
 * a 1:1 instrument instead of an n-way stage.
 *
 * ONE Durable Object instance ("hub") holds every instrument and every socket.
 * v0 scale is a handful of instruments, and one DO makes registry/online/busy
 * trivially consistent — no cross-DO fanout, no eventual-consistency window.
 * Hibernation API throughout: an idle hub costs nothing, and the socket
 * attachments (not in-memory maps) are the state, so a wake loses nothing.
 *
 * Online/busy are DERIVED from live sockets, never stored flags. That is the
 * `left` pattern from workers/rtc (DEPLOYED.md): the socket close IS the death
 * detector — 38-54 ms, versus the 31-47 SECOND SFU garbage collect. An owner
 * who closes the lid goes offline immediately and the player is told, so the
 * host page can fire all-notes-off.
 *
 * Routes (see DEPLOYED.md):
 *   GET  /time                       skew estimator, TOKENLESS (copied from
 *                                    workers/selfrec, same rate guard)
 *   GET  /instruments                public catalog + online/busy, TOKENLESS
 *   POST /instruments/register       host announces itself      INSTRUMENT_TOKEN
 *   POST /instruments/heartbeat      host liveness refresh      INSTRUMENT_TOKEN
 *   WS   /ws?instrument=&role=host   host signaling socket      INSTRUMENT_TOKEN
 *   WS   /ws?instrument=&role=player player signaling socket    tokenless (v0)
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization,Content-Type',
};
const j = (status, obj) => new Response(JSON.stringify(obj), {
  status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...CORS },
});
const ID = /^[\w.-]{1,64}$/;

export class Hub {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    // pure network RTT probe without waking the DO (cues/jam pattern)
    state.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  // ---- socket helpers: attachments ARE the state (hibernation-safe) --------
  peers(inst) {
    const out = [];
    for (const ws of this.state.getWebSockets(inst)) {
      let a = null;
      try { a = ws.deserializeAttachment(); } catch { /* torn */ }
      if (a) out.push({ ws, a });
    }
    return out;
  }
  host(inst) { return this.peers(inst).find((p) => p.a.role === 'host') || null; }
  activePlayer(inst) { return this.peers(inst).find((p) => p.a.role === 'player' && p.a.active) || null; }
  send(ws, obj) { try { ws.send(JSON.stringify(obj)); } catch { /* closing */ } }
  patch(ws, a, delta) { const n = { ...a, ...delta }; ws.serializeAttachment(n); return n; }

  async list() {
    const rows = await this.state.storage.list({ prefix: 'inst:' });
    const out = [];
    for (const [, v] of rows) {
      const h = this.host(v.id);
      const p = this.activePlayer(v.id);
      out.push({
        ...v,
        online: !!h,
        busy: !!p,
        player: p ? p.a.name : null,
        sessionSince: p ? p.a.since : null,
      });
    }
    out.sort((x, y) => (y.online - x.online) || x.name.localeCompare(y.name));
    return out;
  }

  // ---- session lifecycle ---------------------------------------------------
  endSession(inst, reason) {
    const h = this.host(inst);
    const p = this.activePlayer(inst);
    if (!p) return false;
    this.patch(p.ws, p.a, { active: false, since: null });
    this.send(p.ws, { type: 'session', state: 'ended', reason });
    if (h) this.send(h.ws, { type: 'session', state: 'ended', reason, player: p.a.pid });
    return true;
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/hub/list') return j(200, { instruments: await this.list() });

    if (url.pathname === '/hub/register') {
      const b = await request.json().catch(() => null);
      if (!b || !ID.test(b.id || '')) return j(400, { error: 'bad id' });
      const prev = (await this.state.storage.get('inst:' + b.id)) || {};
      const rec = {
        id: b.id,
        name: String(b.name || b.id).slice(0, 80),
        model: String(b.model || '').slice(0, 80),
        location: String(b.location || '').slice(0, 80),
        caps: Array.isArray(b.caps) ? b.caps.slice(0, 12).map((c) => String(c).slice(0, 40)) : [],
        registeredAt: prev.registeredAt || Date.now(),
        lastSeen: Date.now(),
      };
      await this.state.storage.put('inst:' + b.id, rec);
      return j(200, { ok: true, instrument: rec });
    }

    if (url.pathname === '/hub/unlist') {
      const b = await request.json().catch(() => null);
      if (!b || !ID.test(b.id || '')) return j(400, { error: 'bad id' });
      const h = this.host(b.id);
      if (h) { this.endSession(b.id, 'instrument unlisted'); try { h.ws.close(4002, 'unlisted'); } catch {} }
      await this.state.storage.delete('inst:' + b.id);
      return j(200, { ok: true, unlisted: b.id });
    }

    if (url.pathname === '/hub/heartbeat') {
      const b = await request.json().catch(() => null);
      const rec = b && ID.test(b.id || '') ? await this.state.storage.get('inst:' + b.id) : null;
      if (!rec) return j(404, { error: 'unknown instrument' });
      rec.lastSeen = Date.now();
      await this.state.storage.put('inst:' + rec.id, rec);
      return j(200, { ok: true, lastSeen: rec.lastSeen, online: !!this.host(rec.id) });
    }

    if (url.pathname === '/hub/ws') {
      if (request.headers.get('Upgrade') !== 'websocket') return new Response('expected websocket', { status: 426 });
      const inst = url.searchParams.get('instrument') || '';
      const role = url.searchParams.get('role') || '';
      if (!ID.test(inst)) return new Response('bad instrument', { status: 400 });
      if (role !== 'host' && role !== 'player') return new Response('bad role', { status: 400 });
      const rec = await this.state.storage.get('inst:' + inst);
      if (!rec) return new Response('unknown instrument — register first', { status: 404 });

      const pair = new WebSocketPair();
      const ws = pair[1];
      const pid = (url.searchParams.get('pid') || '').match(/^[\w.-]{1,32}$/)
        ? url.searchParams.get('pid')
        : Math.random().toString(36).slice(2, 10);
      const name = String(url.searchParams.get('name') || (role === 'host' ? 'owner' : 'player')).slice(0, 40);

      if (role === 'host') {
        // one host socket per instrument: a reconnect REPLACES the old one
        // (rtc's rejoin rule) and the replaced close must not end the new life
        const old = this.host(inst);
        if (old) { this.patch(old.ws, old.a, { replaced: true }); try { old.ws.close(4001, 'replaced'); } catch {} }
      }
      // tags: getWebSockets(inst) is the whole room; role tag for readability
      this.state.acceptWebSocket(ws, [inst, role]);
      ws.serializeAttachment({ inst, role, pid, name, active: false, since: null });

      const h = this.host(inst);
      const p = this.activePlayer(inst);
      this.send(ws, {
        type: 'hello', role, pid, instrument: rec,
        online: !!h, busy: !!p, serverNow: Date.now(),
      });
      if (role === 'host') {
        // an owner coming online is news for anyone watching the catalog; the
        // catalog is polled, so nothing to broadcast — but a waiting player on
        // this instrument's socket learns immediately
        for (const q of this.peers(inst)) if (q.a.role === 'player') this.send(q.ws, { type: 'instrument', online: true });
      }
      return new Response(null, { status: 101, webSocket: pair[0] });
    }

    return j(404, { error: 'no such hub route' });
  }

  async webSocketMessage(ws, raw) {
    if (typeof raw !== 'string' || raw.length > 65536) return;
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    let a;
    try { a = ws.deserializeAttachment(); } catch { return; }
    if (!a) return;
    const { inst, role } = a;
    const host = this.host(inst);
    const player = this.activePlayer(inst);

    switch (m.type) {
      case 'hb': {
        const rec = await this.state.storage.get('inst:' + inst);
        if (rec) { rec.lastSeen = Date.now(); await this.state.storage.put('inst:' + inst, rec); }
        this.send(ws, { type: 'hb', serverNow: Date.now(), online: !!host, busy: !!player });
        return;
      }

      case 'request': {
        if (role !== 'player') return;
        if (!host) return this.send(ws, { type: 'rejected', reason: 'offline' });
        if (player && player.a.pid !== a.pid) {
          // ONE player at a time. v0 rejects honestly rather than pretending to
          // queue: the player is told who has it and for how long.
          return this.send(ws, {
            type: 'rejected', reason: 'busy',
            heldBy: player.a.name, heldSince: player.a.since,
            waiting: this.peers(inst).filter((q) => q.a.role === 'player' && !q.a.active).length - 1,
          });
        }
        this.patch(ws, a, { name: String(m.name || a.name).slice(0, 40) });
        this.send(host.ws, { type: 'request', player: { pid: a.pid, name: m.name || a.name } });
        this.send(ws, { type: 'requested' });
        return;
      }

      case 'accept': {
        if (role !== 'host') return;
        const target = this.peers(inst).find((q) => q.a.role === 'player' && q.a.pid === m.player);
        if (!target) return this.send(ws, { type: 'error', of: 'accept', error: 'player gone' });
        if (player && player.a.pid !== m.player) return this.send(ws, { type: 'error', of: 'accept', error: 'busy' });
        const since = Date.now();
        this.patch(target.ws, target.a, { active: true, since });
        this.send(target.ws, { type: 'session', state: 'accepted', since, instrument: inst });
        this.send(ws, { type: 'session', state: 'accepted', since, player: target.a.pid, name: target.a.name });
        return;
      }

      case 'reject': {
        if (role !== 'host') return;
        const target = this.peers(inst).find((q) => q.a.role === 'player' && q.a.pid === m.player);
        if (target) this.send(target.ws, { type: 'rejected', reason: String(m.reason || 'declined').slice(0, 80) });
        return;
      }

      case 'end': {
        if (role === 'host' || (role === 'player' && a.active)) {
          this.endSession(inst, role === 'host' ? 'host ended' : 'player ended');
        }
        return;
      }

      case 'signal': {
        // offer / answer / ice, relayed VERBATIM between the two session peers.
        // The worker never parses SDP — same discipline as jam's relay.
        const to = role === 'host' ? player : host;
        if (!to) return this.send(ws, { type: 'error', of: 'signal', error: 'no peer' });
        if (role === 'player' && !a.active) return this.send(ws, { type: 'error', of: 'signal', error: 'no session' });
        this.send(to.ws, { type: 'signal', from: role, pid: a.pid, kind: m.kind, payload: m.payload });
        return;
      }

      default:
        this.send(ws, { type: 'error', error: 'unknown frame ' + String(m.type).slice(0, 32) });
    }
  }

  async close(ws) {
    let a = null;
    try { a = ws.deserializeAttachment(); } catch { /* torn */ }
    if (!a || a.replaced) return;                      // replaced socket: no ghost events
    // mark dead BEFORE deriving, so host()/activePlayer() can't see this socket
    try { ws.serializeAttachment({ ...a, role: 'dead' }); } catch {}
    if (a.role === 'host') {
      // owner vanished: end the session and say so. The player's page stops
      // sending; the host page (if it is merely reloading) fires all-notes-off
      // on its own beforeunload.
      const p = this.activePlayer(a.inst);
      if (p) {
        this.patch(p.ws, p.a, { active: false, since: null });
        this.send(p.ws, { type: 'session', state: 'ended', reason: 'host disconnected' });
      }
      for (const q of this.peers(a.inst)) if (q.a.role === 'player') this.send(q.ws, { type: 'instrument', online: false });
    } else if (a.role === 'player' && a.active) {
      const h = this.host(a.inst);
      // THE SAFETY EVENT: host must all-notes-off on this frame
      if (h) this.send(h.ws, { type: 'session', state: 'ended', reason: 'player disconnected', player: a.pid });
    }
  }
  async webSocketClose(ws) { await this.close(ws); }
  async webSocketError(ws) { await this.close(ws); }
}

// ---- token auth: constant-time, fails closed (jam/cues pattern) ------------
function authorized(request, url, env) {
  if (!env.INSTRUMENT_TOKEN) return false;
  const q = url.searchParams.get('token');
  const h = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const s = q || h;
  if (!s || s.length !== env.INSTRUMENT_TOKEN.length) return false;
  let diff = 0;
  for (let i = 0; i < s.length; i++) diff |= s.charCodeAt(i) ^ env.INSTRUMENT_TOKEN.charCodeAt(i);
  return diff === 0;
}

let timeHits = [];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const p = url.pathname;
    const hub = () => env.HUB.get(env.HUB.idFromName('hub'));

    // GET /time — skew estimator, TOKENLESS, rate-guarded (workers/selfrec)
    if (request.method === 'GET' && p === '/time') {
      const now = Date.now();
      timeHits = timeHits.filter((t) => now - t < 10000);
      if (timeHits.length >= 240) return j(429, { error: 'rate' });
      timeHits.push(now);
      return j(200, { now });
    }

    if (request.method === 'GET' && p === '/instruments') {
      return hub().fetch(new Request('https://hub/hub/list'));
    }

    const POSTS = { '/instruments/register': 'register', '/instruments/heartbeat': 'heartbeat', '/instruments/unlist': 'unlist' };
    if (request.method === 'POST' && POSTS[p]) {
      if (!authorized(request, url, env)) return j(403, { error: 'bad or missing token' });
      return hub().fetch(new Request('https://hub/hub/' + POSTS[p], { method: 'POST', body: await request.text() }));
    }

    if (p === '/ws') {
      if (url.searchParams.get('role') === 'host' && !authorized(request, url, env)) {
        return new Response('host socket needs INSTRUMENT_TOKEN', { status: 403 });
      }
      const u = new URL('https://hub/hub/ws');
      u.search = url.search;
      return hub().fetch(new Request(u, request));
    }

    return j(404, { error: 'routes: /time /instruments /instruments/register /instruments/heartbeat /instruments/unlist /ws' });
  },
};
