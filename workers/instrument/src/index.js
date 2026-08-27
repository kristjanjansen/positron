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
 *
 * SESSION STORAGE (second DO class, `Sessions`, EU-pinned) — see below and
 * DEPLOYED.md. Notes live as SQLite ROWS (plan-timeline C4: rows, never a JSON
 * blob), audio lives in R2 by reference, and either party can delete with
 * tombstone semantics (C6). The log is an explicit, consented POST from the
 * client — the worker still never sees a MIDI byte in transit.
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  // X-Chunk-Sha256 must be listed or the audio chunk POST fails its preflight
  // and the browser reports a bare "Failed to fetch" (found the hard way).
  'Access-Control-Allow-Headers': 'Authorization,Content-Type,X-Chunk-Sha256,X-Session-Token',
  'Access-Control-Max-Age': '86400',
};
const j = (status, obj) => new Response(JSON.stringify(obj), {
  status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...CORS },
});
const ID = /^[\w.-]{1,64}$/;

// ---- per-session CAPABILITY tokens -----------------------------------------
// 128 bits of randomness, minted by the Hub on `accept` and handed to exactly
// one party each. They are CAPABILITIES, not identities: whoever holds the
// string can act as that party. See DEPLOYED.md for what that does and does
// not defend against.
const hex128 = () => [...crypto.getRandomValues(new Uint8Array(16))]
  .map((b) => b.toString(16).padStart(2, '0')).join('');
function ctEq(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
const sessionsStub = (env) => {
  const ns = env.SESSIONS.jurisdiction('eu');
  return ns.get(ns.idFromName('log'));
};

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
    const sid = p.a.sid || null;
    this.patch(p.ws, p.a, { active: false, since: null });
    this.send(p.ws, { type: 'session', state: 'ended', reason, sid });
    if (h) this.send(h.ws, { type: 'session', state: 'ended', reason, player: p.a.pid, sid });
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
        // ONE session id, minted here and handed to BOTH parties on the accept
        // frame. It is what the player's event log and the owner's audio
        // recording agree on — and it is minted by the party that knows the
        // session exists, not guessed by either side.
        const sid = 's' + since.toString(36) + Math.random().toString(36).slice(2, 8);
        // TWO capability tokens, minted with the id and stored on the session
        // row BEFORE either party is told the id exists. Each party is handed
        // only its own — the player never sees ownerToken, the owner never sees
        // playerToken. Holding the id alone is no longer enough to delete.
        const playerToken = hex128(), ownerToken = hex128();
        try {
          await sessionsStub(this.env).fetch(new Request(
            `https://s/do/mint?id=${sid}&instrument=${encodeURIComponent(inst)}`,
            { method: 'POST', body: JSON.stringify({ playerToken, ownerToken, playerId: target.a.name }) }));
        } catch { /* mint failed: the session still works, it is just id-capability only */ }
        this.patch(target.ws, target.a, { active: true, since, sid });
        this.send(target.ws, { type: 'session', state: 'accepted', since, instrument: inst, sid, token: playerToken });
        this.send(ws, { type: 'session', state: 'accepted', since, player: target.a.pid, name: target.a.name, sid, instrument: inst, token: ownerToken });
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

/**
 * Sessions — the DURABLE SESSION LOG. One DO instance ('log'), EU-pinned.
 *
 * plan-timeline C4: the notes are SQLite ROWS, never a JSON blob. A row per
 * event is what makes `?from=&limit=` paging, ordering by `at`, and a
 * per-source monotonic-seq guard cost nothing — and it is what a later
 * megatimeline join needs. Heavy payload (audio) is BY REFERENCE: R2 under
 * `instrument/<sessionId>/audio/`, only the prefix in the row.
 *
 * plan-timeline C6: delete is a TOMBSTONE, not a hole. The session row stays
 * with {deletedBy, deletedAt}; the event rows are physically dropped; the R2
 * prefix is swept and a `deleted.marker` written there. A read of a deleted
 * session is 410 + the tombstone, and an append to it is REJECTED — a late
 * flush from a tab that did not hear about the delete cannot resurrect it.
 */
export class Sessions {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sql = state.storage.sql;
    state.blockConcurrencyWhile(async () => {
      this.sql.exec(`CREATE TABLE IF NOT EXISTS sessions(
        id TEXT PRIMARY KEY, instrument TEXT, playerId TEXT,
        startedAt INTEGER, endedAt INTEGER, noteCount INTEGER DEFAULT 0,
        audioPrefix TEXT, deletedBy TEXT, deletedAt INTEGER)`);
      this.sql.exec(`CREATE TABLE IF NOT EXISTS events(
        sessionId TEXT NOT NULL, seq INTEGER NOT NULL, at INTEGER NOT NULL,
        kind TEXT, source TEXT, raw BLOB, display TEXT, ref INTEGER, payload TEXT)`);
      this.sql.exec(`CREATE INDEX IF NOT EXISTS events_by_time ON events(sessionId, at)`);
      // two columns beyond the base shape, both nullable, both still ONE ROW
      // PER EVENT (the C4 rule is rows-not-a-session-blob, not four columns):
      //   ref     — the seq this row points at in ANOTHER source's lane. A
      //             host `midi-actuated` row refs the player's note seq, so
      //             (hostAt − playerAt) per note is queryable: the two lanes
      //             together ARE the drift channel, never averaged into one.
      //   payload — small JSON detail for marker rows (media-span phase +
      //             mediaRef). Never used for midi rows.
      const cols = this.sql.exec('PRAGMA table_info(events)').toArray().map((c) => c.name);
      if (!cols.includes('ref')) this.sql.exec('ALTER TABLE events ADD COLUMN ref INTEGER');
      if (!cols.includes('payload')) this.sql.exec('ALTER TABLE events ADD COLUMN payload TEXT');
      // three more nullable columns on `sessions`:
      //   playerToken / ownerToken — the per-session capabilities (see hex128)
      //   avPrefix                 — the A/V media lane, next to audioPrefix
      const sc = this.sql.exec('PRAGMA table_info(sessions)').toArray().map((c) => c.name);
      if (!sc.includes('playerToken')) this.sql.exec('ALTER TABLE sessions ADD COLUMN playerToken TEXT');
      if (!sc.includes('ownerToken')) this.sql.exec('ALTER TABLE sessions ADD COLUMN ownerToken TEXT');
      if (!sc.includes('avPrefix')) this.sql.exec('ALTER TABLE sessions ADD COLUMN avPrefix TEXT');
    });
  }

  // the capability check. NEVER returns the tokens themselves (meta() omits
  // them), and a session with no minted token falls back to INSTRUMENT_TOKEN.
  tokenOk(request, s, which) {
    const want = s && (which === 'player' ? s.playerToken : s.ownerToken);
    return !!want && ctEq(request.headers.get('x-session-token') || '', want);
  }

  row(id) { return this.sql.exec('SELECT * FROM sessions WHERE id=?', id).toArray()[0] || null; }
  ensure(id, instrument, playerId, startedAt) {
    const s = this.row(id);
    if (s) return s;
    this.sql.exec('INSERT INTO sessions(id,instrument,playerId,startedAt,noteCount) VALUES(?,?,?,?,0)',
      id, String(instrument || '').slice(0, 64) || null, String(playerId || '').slice(0, 64) || null, startedAt);
    return this.row(id);
  }
  recount(id) {
    const n = this.sql.exec("SELECT COUNT(*) AS n FROM events WHERE sessionId=? AND kind='midi'", id).toArray()[0].n;
    this.sql.exec('UPDATE sessions SET noteCount=? WHERE id=?', n, id);
    return n;
  }
  meta(s) {
    return {
      id: s.id, instrument: s.instrument, playerId: s.playerId,
      startedAt: s.startedAt, endedAt: s.endedAt, noteCount: s.noteCount,
      audioPrefix: s.audioPrefix || null, avPrefix: s.avPrefix || null,
      // tokens are never echoed back: they leave the worker exactly once, on
      // the accept frame, to the party they belong to.
      guarded: !!(s.playerToken || s.ownerToken),
      deletedBy: s.deletedBy || null, deletedAt: s.deletedAt || null,
      eventRows: this.sql.exec('SELECT COUNT(*) AS n FROM events WHERE sessionId=?', s.id).toArray()[0].n,
    };
  }
  gone(s) {
    return j(410, { deleted: true, tombstone: true, id: s.id, instrument: s.instrument,
      deletedBy: s.deletedBy, deletedAt: s.deletedAt, error: 'session deleted' });
  }
  // TWO media lanes under one session prefix: `audio/` (opus only, the v0 lane)
  // and `av/` (one webm carrying BOTH the instrument's audio and the panel the
  // player was watching). They are separate R2 prefixes and separate
  // `media-span` rows, so a consumer can tell an audio-only span from an A/V
  // one without opening a file.
  mediaPrefixOf(id, lane) { return `instrument/${id}/${lane}/`; }
  audioPrefixOf(id) { return this.mediaPrefixOf(id, 'audio'); }

  async purgeAudio(id) {
    const prefix = `instrument/${id}/`;
    let deleted = 0, cursor;
    do {
      const r = await this.env.ARCHIVE.list({ prefix, cursor, limit: 500 });
      const keys = r.objects.map((o) => o.key);
      if (keys.length) { await this.env.ARCHIVE.delete(keys); deleted += keys.length; }
      cursor = r.truncated ? r.cursor : null;
    } while (cursor);
    return deleted;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const op = url.pathname.replace('/do/', '');
    const id = url.searchParams.get('id') || '';
    const owner = request.headers.get('x-owner') === '1';
    const lane = url.searchParams.get('lane') === 'av' ? 'av' : 'audio';
    if (op !== 'list' && !ID.test(id)) return j(400, { error: 'bad session id' });

    // ---- POST /do/mint — the Hub, on accept, before either party has the id -
    if (op === 'mint') {
      const b = await request.json().catch(() => ({}));
      const s = this.ensure(id, url.searchParams.get('instrument'), b && b.playerId, Date.now() * 1000);
      if (s.deletedAt) return this.gone(s);
      // first mint wins — a re-accept never rotates a live session's tokens
      if (!s.playerToken && !s.ownerToken) {
        this.sql.exec('UPDATE sessions SET playerToken=?, ownerToken=? WHERE id=?',
          String(b.playerToken || '').slice(0, 64), String(b.ownerToken || '').slice(0, 64), id);
      }
      return j(200, { ok: true, id, guarded: true });
    }

    // ---- GET /sessions?instrument= ----------------------------------------
    if (op === 'list') {
      const inst = url.searchParams.get('instrument') || '';
      const rows = inst
        ? this.sql.exec('SELECT * FROM sessions WHERE instrument=? ORDER BY startedAt DESC LIMIT 200', inst).toArray()
        : this.sql.exec('SELECT * FROM sessions ORDER BY startedAt DESC LIMIT 200').toArray();
      return j(200, { count: rows.length, sessions: rows.map((s) => this.meta(s)) });
    }

    // ---- POST /session/<id>/events — batched append ------------------------
    if (op === 'events') {
      const b = await request.json().catch(() => null);
      if (!b || !Array.isArray(b.events)) return j(400, { error: 'expected {events:[...]}' });
      if (b.events.length > 2000) return j(413, { error: 'batch too large (max 2000)' });
      const existing = this.row(id);
      if (existing && existing.deletedAt) return this.gone(existing);   // no resurrection
      const first = b.events[0];
      const s = existing || this.ensure(id, b.instrument, b.playerId,
        first && Number.isFinite(first.at) ? Math.trunc(first.at) : Date.now() * 1000);
      if (!s.instrument && b.instrument) this.sql.exec('UPDATE sessions SET instrument=? WHERE id=?', String(b.instrument).slice(0, 64), id);
      if (!s.playerId && b.playerId) this.sql.exec('UPDATE sessions SET playerId=? WHERE id=?', String(b.playerId).slice(0, 64), id);

      // monotonic seq PER SOURCE. A retried batch is therefore idempotent (its
      // events are already <= max and get rejected individually), and an
      // out-of-order flush cannot interleave garbage into the log.
      const maxBySource = new Map();
      for (const r of this.sql.exec('SELECT source, MAX(seq) AS m FROM events WHERE sessionId=? GROUP BY source', id).toArray()) {
        maxBySource.set(r.source, r.m);
      }
      let appended = 0, rejected = 0;
      for (const e of b.events) {
        if (!e || typeof e !== 'object') { rejected++; continue; }
        const source = String(e.source || 'unknown').slice(0, 32);
        const prev = maxBySource.get(source);
        const seq = Number.isFinite(e.seq) ? Math.trunc(e.seq) : (prev === undefined ? 0 : prev + 1);
        if (prev !== undefined && seq <= prev) { rejected++; continue; }
        const raw = Array.isArray(e.raw) ? new Uint8Array(e.raw.slice(0, 16).map((x) => x & 0xff)) : null;
        const payload = e.payload === undefined || e.payload === null ? null : JSON.stringify(e.payload).slice(0, 2000);
        this.sql.exec('INSERT INTO events(sessionId,seq,at,kind,source,raw,display,ref,payload) VALUES(?,?,?,?,?,?,?,?,?)',
          id, seq, Number.isFinite(e.at) ? Math.trunc(e.at) : 0,
          String(e.kind || 'event').slice(0, 32), source, raw,
          e.display === undefined || e.display === null ? null : String(e.display).slice(0, 240),
          Number.isFinite(e.ref) ? Math.trunc(e.ref) : null, payload);
        maxBySource.set(source, seq);
        appended++;
      }
      const notes = this.recount(id);
      const total = this.sql.exec('SELECT COUNT(*) AS n FROM events WHERE sessionId=?', id).toArray()[0].n;
      return j(200, { ok: true, id, appended, rejected, total, noteCount: notes });
    }

    // ---- POST /session/<id>/end -------------------------------------------
    if (op === 'end') {
      const s = this.row(id);
      if (!s) return j(404, { error: 'no such session' });
      if (s.deletedAt) return this.gone(s);
      const b = await request.json().catch(() => ({}));
      const endedAt = Number.isFinite(b && b.endedAt) ? Math.trunc(b.endedAt) : Date.now() * 1000;
      this.sql.exec('UPDATE sessions SET endedAt=? WHERE id=?', endedAt, id);
      this.recount(id);
      return j(200, { ok: true, session: this.meta(this.row(id)) });
    }

    // ---- GET /session/<id>?from=&limit= -----------------------------------
    if (op === 'get') {
      const s = this.row(id);
      if (!s) return j(404, { error: 'no such session' });
      if (s.deletedAt) return this.gone(s);
      const from = Math.max(0, parseInt(url.searchParams.get('from') || '0', 10) || 0);
      const limit = Math.min(20000, Math.max(1, parseInt(url.searchParams.get('limit') || '5000', 10) || 5000));
      const rows = this.sql.exec(
        'SELECT seq,at,kind,source,raw,display,ref,payload FROM events WHERE sessionId=? ORDER BY at, seq LIMIT ? OFFSET ?',
        id, limit, from).toArray();
      const events = rows.map((r) => ({
        at: r.at, kind: r.kind, source: r.source, seq: r.seq,
        ...(r.raw ? { raw: [...new Uint8Array(r.raw)] } : {}),
        display: r.display,
        ...(r.ref === null || r.ref === undefined ? {} : { ref: r.ref }),
        ...(r.payload ? { payload: JSON.parse(r.payload) } : {}),
      }));
      const meta = this.meta(s);
      const lanes = this.sql.exec('SELECT source, kind, COUNT(*) AS n FROM events WHERE sessionId=? GROUP BY source, kind', id).toArray();
      return j(200, { session: meta, lanes, from, limit, count: events.length, total: meta.eventRows, events });
    }

    // ---- POST /session/<id>/delete {by} — TOMBSTONE (C6) -------------------
    if (op === 'delete') {
      const b = await request.json().catch(() => ({}));
      const by = b && b.by === 'owner' ? 'owner' : 'player';
      const s = this.row(id);
      if (!s) return j(404, { error: 'no such session' });
      // THE CAPABILITY CHECK. Owner-delete: this session's ownerToken, or
      // INSTRUMENT_TOKEN (which is a claim to own the hardware itself).
      // Player-delete: this session's playerToken. A session with no minted
      // token (created by a bare events POST rather than a hub accept) keeps
      // the v0 rule — the id is the capability — and says so via `guarded`.
      if (by === 'owner' && !owner && !this.tokenOk(request, s, 'owner')) {
        return j(403, { error: 'owner delete needs this session\'s ownerToken or INSTRUMENT_TOKEN' });
      }
      if (by === 'player' && s.playerToken && !this.tokenOk(request, s, 'player')) {
        return j(403, { error: 'player delete needs this session\'s playerToken' });
      }
      if (s.deletedAt) return j(200, { ok: true, already: true, id, deletedBy: s.deletedBy, deletedAt: s.deletedAt, eventsDropped: 0, audioObjectsPurged: 0 });
      const dropped = this.sql.exec('SELECT COUNT(*) AS n FROM events WHERE sessionId=?', id).toArray()[0].n;
      this.sql.exec('DELETE FROM events WHERE sessionId=?', id);
      const deletedAt = Date.now();
      this.sql.exec('UPDATE sessions SET deletedBy=?, deletedAt=?, noteCount=0 WHERE id=?', by, deletedAt, id);
      let purged = 0;
      if (s.audioPrefix || s.avPrefix) {
        purged = await this.purgeAudio(id);
        // the R2-side tombstone: a late chunk upload for a deleted session is
        // refused by the DO, and anything scanning the bucket sees the marker.
        await this.env.ARCHIVE.put(`instrument/${id}/deleted.marker`,
          JSON.stringify({ deletedAt, deletedBy: by, purgedObjects: purged }),
          { httpMetadata: { contentType: 'application/json' } });
      }
      return j(200, { ok: true, id, deletedBy: by, deletedAt, eventsDropped: dropped, audioObjectsPurged: purged });
    }

    // ---- media BY REFERENCE, two lanes: audio | av ------------------------
    // WRITES need the owner's capability: this session's ownerToken, or
    // INSTRUMENT_TOKEN. READS are ungated — the id is a share link, and a
    // tombstone beats every token.
    const mediaCol = lane === 'av' ? 'avPrefix' : 'audioPrefix';
    const mediaType = lane === 'av' ? 'video/webm' : 'audio/webm';
    const chunkKey = (seq) => `${this.mediaPrefixOf(id, lane)}chunk-${String(seq).padStart(5, '0')}.webm`;

    if (op === 'media-put' || op === 'media-manifest') {
      const s = this.row(id);
      if (s && s.deletedAt) return this.gone(s);
      if (!owner && !this.tokenOk(request, s, 'owner')) {
        return j(403, { error: 'media upload needs this session\'s ownerToken or INSTRUMENT_TOKEN' });
      }
      let key, extra = {};
      if (op === 'media-manifest') {
        const body = await request.text();
        if (body.length > 2 * 1024 * 1024) return j(413, { error: 'manifest too large' });
        try { JSON.parse(body); } catch { return j(400, { error: 'manifest not json' }); }
        key = `${this.mediaPrefixOf(id, lane)}manifest.json`;
        await this.env.ARCHIVE.put(key, body, { httpMetadata: { contentType: 'application/json' } });
      } else {
        const seq = parseInt(url.searchParams.get('seq') || '', 10);
        if (!Number.isInteger(seq) || seq < 0 || seq > 999999) return j(400, { error: 'bad seq' });
        const bytes = await request.arrayBuffer();
        if (!bytes.byteLength) return j(411, { error: 'empty chunk' });
        if (bytes.byteLength > 16 * 1024 * 1024) return j(413, { error: 'chunk too large' });
        key = chunkKey(seq);
        const sha256 = request.headers.get('x-chunk-sha256') || undefined;
        let obj;
        try {
          obj = await this.env.ARCHIVE.put(key, bytes, {
            httpMetadata: { contentType: mediaType }, ...(sha256 ? { sha256 } : {}),
          });
        } catch (e) { return j(400, { error: 'put failed: ' + (e && e.message || e) }); }
        extra = { size: obj.size, etag: obj.httpEtag };
      }
      if (!s) this.ensure(id, url.searchParams.get('instrument'), null, Date.now() * 1000);
      this.sql.exec(`UPDATE sessions SET ${mediaCol}=? WHERE id=?`, this.mediaPrefixOf(id, lane), id);
      return j(200, { ok: true, key, lane, ...extra, prefix: this.mediaPrefixOf(id, lane), audioPrefix: this.audioPrefixOf(id) });
    }

    // GET /session/<id>/{audio|av} — what is actually stored (the verify step)
    if (op === 'media-list') {
      const s = this.row(id);
      if (s && s.deletedAt) return this.gone(s);
      const prefix = this.mediaPrefixOf(id, lane);
      const objects = [];
      let cursor;
      do {
        const r = await this.env.ARCHIVE.list({ prefix, cursor, limit: 500 });
        for (const o of r.objects) objects.push({ key: o.key, size: o.size, etag: o.httpEtag, uploaded: o.uploaded });
        cursor = r.truncated ? r.cursor : null;
      } while (cursor);
      objects.sort((a, b) => a.key.localeCompare(b.key));
      return j(200, { prefix, lane, count: objects.length, bytes: objects.reduce((n, o) => n + o.size, 0), objects });
    }

    // GET /session/<id>/{audio|av}/<seq> — one chunk, streamed back
    if (op === 'media-get') {
      const s = this.row(id);
      if (s && s.deletedAt) return this.gone(s);
      const obj = await this.env.ARCHIVE.get(chunkKey(parseInt(url.searchParams.get('seq') || '', 10)));
      if (!obj) return j(404, { error: 'no such chunk' });
      return new Response(obj.body, {
        headers: { 'content-type': mediaType, 'content-length': String(obj.size), 'cache-control': 'no-store', ...CORS },
      });
    }

    return j(404, { error: 'no such session op' });
  }
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

    // ---- SESSION STORAGE ---------------------------------------------------
    // EU JURISDICTION: the session log is the only personal data this platform
    // keeps (someone's playing, someone's instrument audio), so its DO is
    // pinned to `.jurisdiction('eu')`. The signaling Hub is a separate class
    // and deliberately untouched — see DEPLOYED.md for the migration note.
    const sess = () => sessionsStub(env);
    const toDO = (op, id, extra, init) => {
      const u = new URL('https://s/do/' + op);
      if (id) u.searchParams.set('id', id);
      for (const [k, v] of Object.entries(extra || {})) if (v !== null && v !== undefined) u.searchParams.set(k, v);
      return sess().fetch(new Request(u, init));
    };
    const parts = p.split('/').filter(Boolean);

    if (request.method === 'GET' && parts.length === 1 && parts[0] === 'sessions') {
      const r = await toDO('list', null, { instrument: url.searchParams.get('instrument') }, { method: 'GET' });
      const body = await r.json();
      // proof, not a claim: the EU-pinned id differs from the unpinned one, so
      // the object really lives in the jurisdiction-restricted namespace.
      const eu = env.SESSIONS.jurisdiction('eu').idFromName('log').toString();
      const plain = env.SESSIONS.idFromName('log').toString();
      return j(200, { ...body, jurisdiction: 'eu', euPinned: eu !== plain, euId: eu, unpinnedId: plain });
    }

    if (parts[0] === 'session' && parts.length >= 2) {
      const sid = parts[1];
      if (!ID.test(sid)) return j(400, { error: 'bad session id' });
      const tail = parts.slice(2);
      const owner = authorized(request, url, env);
      // the per-session capability rides its own header, forwarded verbatim;
      // the DO does the constant-time compare against the stored row.
      const hdr = {
        'x-owner': owner ? '1' : '0',
        'x-session-token': (request.headers.get('x-session-token') || url.searchParams.get('st') || '').slice(0, 64),
      };

      // READS are ungated on purpose: the id is a share link, and a tombstone
      // beats any token. Writes are where the capabilities bite.
      if (request.method === 'GET' && tail.length === 0) {
        return toDO('get', sid, { from: url.searchParams.get('from'), limit: url.searchParams.get('limit') }, { method: 'GET' });
      }
      if (request.method === 'POST' && tail.length === 1 && (tail[0] === 'events' || tail[0] === 'end' || tail[0] === 'delete')) {
        // events/end stay tokenless: the two-lane `ref` join makes a forged
        // lane obvious and the id is scoped to one live session. `delete` is
        // the one that needs a capability, checked inside the DO.
        return toDO(tail[0], sid, null, { method: 'POST', body: await request.text(), headers: hdr });
      }
      const MEDIA = { audio: 'audio', av: 'av' };
      if (MEDIA[tail[0]]) {
        const lane = MEDIA[tail[0]];
        if (request.method === 'GET' && tail.length === 1) return toDO('media-list', sid, { lane }, { method: 'GET' });
        if (request.method === 'GET' && tail.length === 2 && /^\d{1,6}$/.test(tail[1])) {
          return toDO('media-get', sid, { lane, seq: tail[1] }, { method: 'GET' });
        }
        // media WRITES are the owner's: it is the owner's instrument's sound
        // and the owner's room on camera.
        if (request.method === 'POST' && tail.length === 2) {
          if (tail[1] === 'manifest') {
            return toDO('media-manifest', sid, { lane, instrument: url.searchParams.get('instrument') },
              { method: 'POST', body: await request.text(), headers: hdr });
          }
          if (/^\d{1,6}$/.test(tail[1])) {
            return toDO('media-put', sid, { lane, seq: tail[1], instrument: url.searchParams.get('instrument') },
              { method: 'POST', body: await request.arrayBuffer(), headers: { ...hdr, 'x-chunk-sha256': request.headers.get('x-chunk-sha256') || '' } });
          }
        }
      }
      return j(404, { error: 'session routes: GET /session/<id> · POST /session/<id>/{events,end,delete} · GET|POST /session/<id>/{audio,av}[/<seq>|/manifest]' });
    }

    return j(404, { error: 'routes: /time /instruments /instruments/{register,heartbeat,unlist} /ws /sessions /session/<id>[/events|/end|/delete|/audio|/av]' });
  },
};
