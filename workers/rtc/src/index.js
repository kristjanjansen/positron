/**
 * elektron-rtc — production signaling layer for many-to-many video (plan-m2m §3).
 *
 * Three jobs in one worker:
 *
 *   1. RtcRoom Durable Object (one per room name) — presence + track directory
 *      over hibernatable WebSockets. The DO's `left` broadcast IS the death
 *      detector: dead publishers emit NO track-level events (tiles freeze
 *      silently; SFU sessions 410 only at +31–47 s — measured, plan-m2m §5.4).
 *
 *   2. SFU proxy /cf/* — forwards to the Cloudflare Realtime SFU HTTPS API,
 *      adding the app secret server-side. The secret can mint sessions and pull
 *      any track in the app; it never reaches a browser.
 *
 *   3. Snapshot tiles /tile/{room}/{pid} — small JPEG stills for the wall tier
 *      (the big-grid participants who don't get live WebRTC pulls). Cache API
 *      primary + DO-latest fallback. Per-colo cache is fine for the prototype;
 *      production = R2 or KV.
 *
 * Routes:
 *   WS   /room/{name}/ws          token required   → RtcRoom DO
 *   ANY  /cf/{subpath}            token required   → rtc.live.cloudflare.com
 *   POST /tile/{room}/{pid}       token required   JPEG ≤ 64 KB
 *   GET  /tile/{room}/{pid}       open             cache-first, max-age=2
 *
 * Auth: ?token=… or Authorization: Bearer … must equal the ROOM_TOKEN secret.
 * Without it, anyone with the workers.dev URL could mint SFU sessions.
 *
 * Frame protocol (client → server / server → client): see RtcRoom below and
 * DEPLOYED.md. Design rules inherited from workers/cues (deployed, measured):
 *   - setWebSocketAutoResponse('ping'→'pong'): pings never wake the DO.
 *   - broadcast BEFORE storage.put: persistence-gating cost ~50 ms (measured).
 *   - ws.serializeAttachment for identity across hibernation.
 *   - rebuild-never-patch: reconnect = new join + new publish, no state repair.
 */

const SFU_BASE = 'https://rtc.live.cloudflare.com/v1/apps';
// Cloudflare's edge 1010-blocks generic/default UAs (measured, proto/m2m).
const SFU_UA = 'elektron-rtc-worker/1.0 (curl-compatible)';
const CF_SUBPATH_RE = /^[A-Za-z0-9/_-]{1,200}$/;
const ROOM_RE = /^[\w-]{1,64}$/;
const PID_RE = /^[\w.-]{1,64}$/;
const TILE_MAX_BYTES = 64 * 1024;
const TILE_CACHE_TTL_S = 6; // stored-copy lifetime at the colo
const TILE_CLIENT_TTL_S = 2; // what pollers may reuse without refetching
const ROLES = new Set(['performer', 'audience', 'operator']);
const TIERS = new Set(['wall', 'live', 'featured']);
const ROSTER_MAX = 500; // hard cap on stored roster entries per room
const CUE_BACKLOG_ON_JOIN = 200; // recent cues replayed to every joiner

// ---------------------------------------------------------------------------
// RtcRoom — one Durable Object instance per room name.
// ---------------------------------------------------------------------------
export class RtcRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    // Answer literal "ping" with "pong" WITHOUT waking a hibernated DO
    // (cues pattern, measured 32–38 ms RTT with zero wake cost).
    this.state.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair('ping', 'pong'),
    );
  }

  // --- roster persistence (survives DO restarts; broadcast-before-persist) --
  async roster() {
    return (await this.state.storage.get('roster')) || {};
  }
  // Storage writes never take the room down: broadcasts have already gone out
  // (the 50 ms lesson), so a failed put costs durability, not the live show.
  async putSafe(key, val) {
    try { await this.state.storage.put(key, val); }
    catch (e) { console.error(`storage.put(${key}) failed (room kept alive):`, e && e.message); }
  }
  async putRoster(r) {
    await this.putSafe('roster', r);
  }
  async putCuelog(log) {
    await this.putSafe('cuelog', log);
  }
  // Publish-permission window. Default = OPEN (no restriction): every measured
  // flow publishes without an operator grant; the window only closes when an
  // operator explicitly sets publish:false for a role/participant.
  async perm() {
    return (await this.state.storage.get('perm')) || { publish: {} };
  }

  async fetch(request) {
    const url = new URL(request.url);

    // Internal tile fallback store (worker-only paths, never routed raw).
    // Kept in the room's own storage so tiles survive colo-cache misses;
    // production should move this to R2/KV — a busy wall polling the DO
    // defeats hibernation and would eat the free-plan request budget.
    const tileM = url.pathname.match(/^\/tile-(put|get)\/([\w.-]{1,64})$/);
    if (tileM) {
      const [, op, pid] = tileM;
      if (op === 'put') {
        const buf = await request.arrayBuffer();
        await this.state.storage.put('tile:' + pid, { t: Date.now(), jpeg: buf });
        return new Response(null, { status: 204 });
      }
      const rec = await this.state.storage.get('tile:' + pid);
      if (!rec) return new Response('no tile', { status: 404 });
      return new Response(rec.jpeg, {
        status: 200,
        headers: {
          'Content-Type': 'image/jpeg',
          'X-Tile-Age-Ms': String(Date.now() - rec.t),
        },
      });
    }

    // Internal cue-log read (worker-only path; exposed as GET /room/{name}/cuelog,
    // token-authed at the worker layer). Returns every cue frame this room has
    // relayed, oldest first: [{ts, from, cue:{..., serverAt}}].
    if (url.pathname === '/cuelog') {
      const log = (await this.state.storage.get('cuelog')) || [];
      return new Response(JSON.stringify({ count: log.length, cues: log }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('expected websocket', { status: 426 });
    }
    const pair = new WebSocketPair();
    this.state.acceptWebSocket(pair[1]);
    // Identity is attached on `join`; until then the socket is a spectator.
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  async webSocketMessage(ws, raw) {
    let f;
    try { f = JSON.parse(raw); } catch { return; }
    const me = ws.deserializeAttachment?.() || null;

    // In-band latency probe (autoresponse covers the literal 'ping' string;
    // this covers JSON pings that want the DO wall clock).
    if (f.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong', t0: f.t0, t1: Date.now() }));
      return;
    }

    // -- join: {type:'join', participantId?, name?, role, opToken?} --------
    // Server assigns participantId when omitted. Reply: full roster snapshot
    // (the cue-backlog pattern) + recent cue backlog. Broadcast: joined.
    // Rejoining an existing participantId replaces the old entry (rebuild-
    // never-patch) and DETACHES the old socket so its close emits no 'left'.
    if (f.type === 'join') {
      let role = ROLES.has(f.role) ? f.role : 'audience';
      // 'operator' must be EARNED: the join frame must carry opToken matching
      // the OPERATOR_TOKEN worker secret, else the joiner is demoted to
      // audience (fail closed when the secret is unset).
      if (role === 'operator'
          && !(this.env && this.env.OPERATOR_TOKEN && f.opToken === this.env.OPERATOR_TOKEN)) {
        role = 'audience';
      }
      const id = (typeof f.participantId === 'string' && PID_RE.test(f.participantId))
        ? f.participantId
        : crypto.randomUUID().slice(0, 8);
      // Per-join generation tag: dropped() no-ops on any socket that is not
      // the participant's CURRENT one (the ghost-'left' rejoin bug).
      const gen = crypto.randomUUID();
      for (const s of this.state.getWebSockets()) {
        if (s === ws) continue;
        const a = s.deserializeAttachment?.();
        if (a && a.id === id && !a.stale) {
          s.serializeAttachment({ ...a, stale: true }); // must NOT trigger 'left'
          try { s.close(4001, 'replaced by rejoin'); } catch {}
        }
      }
      ws.serializeAttachment({ id, role, gen });
      const roster = await this.roster();
      // Roster bound: past the cap, evict the oldest entries whose socket is
      // gone (never a live one); if the room is genuinely full, reject.
      if (!roster[id] && Object.keys(roster).length >= ROSTER_MAX) {
        const live = new Set([id]);
        for (const s of this.state.getWebSockets()) {
          const a = s.deserializeAttachment?.();
          if (a && !a.stale) live.add(a.id);
        }
        const evictable = Object.values(roster)
          .filter((p) => !live.has(p.id))
          .sort((a, b) => a.joinedAt - b.joinedAt);
        for (const p of evictable) {
          if (Object.keys(roster).length < ROSTER_MAX) break;
          delete roster[p.id];
        }
        if (Object.keys(roster).length >= ROSTER_MAX) {
          ws.send(JSON.stringify({ type: 'error', of: 'join', error: 'room full' }));
          return;
        }
      }
      const participant = {
        id,
        name: typeof f.name === 'string' ? f.name.slice(0, 64) : id,
        role,
        tier: 'wall', // everyone starts on the snapshot wall; promote moves them
        sessionId: null,
        trackNames: [],
        joinedAt: Date.now(),
        gen,
      };
      roster[id] = participant;
      // Snapshot to the joiner FIRST, then delta to the room, then persist.
      ws.send(JSON.stringify({
        type: 'roster',
        self: { id, role },
        participants: Object.values(roster),
        perm: await this.perm(),
      }));
      // Cue parity: replay the recent cue backlog to the joiner (same shape as
      // the live broadcast, flagged backlog:true) so a reconnecting stage
      // catches up. Cancelled cues are excluded.
      const log = (await this.state.storage.get('cuelog')) || [];
      if (log.length) {
        const cancelled = new Set(log.filter((e) => e.kind === 'cancel').map((e) => e.id));
        for (const e of log.filter((e2) => e2.cue && !cancelled.has(e2.cue.id)).slice(-CUE_BACKLOG_ON_JOIN)) {
          try { ws.send(JSON.stringify({ type: 'cue', cue: e.cue, from: e.from, backlog: true })); } catch {}
        }
      }
      this.broadcast({ type: 'joined', participant }, ws);
      await this.putRoster(roster);
      return;
    }

    if (!me) return; // everything below requires a completed join

    // -- publish: {type:'publish', sessionId, trackNames:[...]} ------------
    // trackName convention: <participantId>/<mic|cam|screen> (plan-m2m §3).
    if (f.type === 'publish' && typeof f.sessionId === 'string' && Array.isArray(f.trackNames)) {
      // Enforce the operator's publish-permission window server-side: an
      // explicit per-participant grant wins, then per-role; absent both,
      // publishing is open (the pre-perm default every measured flow relies on).
      const permNow = (await this.perm()).publish || {};
      const allowed = permNow[me.id] != null ? permNow[me.id]
        : (permNow[me.role] != null ? permNow[me.role] : true);
      if (!allowed) {
        ws.send(JSON.stringify({ type: 'error', of: 'publish', error: `publishing closed for ${me.role}` }));
        return;
      }
      const trackNames = f.trackNames.filter((t) => typeof t === 'string').slice(0, 16);
      this.broadcast({
        type: 'published',
        participantId: me.id,
        sessionId: f.sessionId,
        trackNames,
      });
      const roster = await this.roster();
      if (roster[me.id]) {
        roster[me.id].sessionId = f.sessionId;
        roster[me.id].trackNames = trackNames;
        await this.putRoster(roster);
      }
      return;
    }

    // -- unpublish: {type:'unpublish', trackNames?} ------------------------
    if (f.type === 'unpublish') {
      const trackNames = Array.isArray(f.trackNames)
        ? f.trackNames.filter((t) => typeof t === 'string')
        : null; // null = everything
      this.broadcast({ type: 'unpublished', participantId: me.id, trackNames });
      const roster = await this.roster();
      if (roster[me.id]) {
        roster[me.id].trackNames = trackNames
          ? roster[me.id].trackNames.filter((t) => !trackNames.includes(t))
          : [];
        if (!trackNames) roster[me.id].sessionId = null;
        await this.putRoster(roster);
      }
      return;
    }

    // -- perm: {type:'perm', grant:{role?|participantId?, publish:bool}} ---
    // Operator-only publish-permission window (cue-drivable).
    if (f.type === 'perm' && me.role === 'operator' && f.grant && typeof f.grant.publish === 'boolean') {
      const grant = {
        publish: f.grant.publish,
        ...(typeof f.grant.role === 'string' ? { role: f.grant.role } : {}),
        ...(typeof f.grant.participantId === 'string' ? { participantId: f.grant.participantId } : {}),
      };
      this.broadcast({ type: 'perm', grant, by: me.id });
      const perm = await this.perm();
      if (grant.role) perm.publish[grant.role] = grant.publish;
      if (grant.participantId) perm.publish[grant.participantId] = grant.publish;
      if (!grant.role && !grant.participantId) perm.publish.audience = grant.publish;
      await this.putSafe('perm', perm);
      return;
    }

    // -- promote/demote: {type:'promote'|'demote', participantId, tier} ----
    // Tier changes wall→live→featured; forwarded to all so every client
    // re-evaluates what to pull (live) vs poll (wall snapshots). Operator only.
    if ((f.type === 'promote' || f.type === 'demote') && me.role === 'operator'
        && typeof f.participantId === 'string' && TIERS.has(f.tier)) {
      this.broadcast({ type: f.type, participantId: f.participantId, tier: f.tier, by: me.id });
      const roster = await this.roster();
      if (roster[f.participantId]) {
        roster[f.participantId].tier = f.tier;
        await this.putRoster(roster);
      }
      return;
    }

    // -- cue passthrough: {type:'cue', cue:{...}} --------------------------
    // Trivial relay so a cue can drive the participation layer without a
    // second socket; the full cue engine stays on workers/cues.
    if (f.type === 'cue' && f.cue) {
      const cue = { ...f.cue, serverAt: Date.now() };
      this.broadcast({ type: 'cue', cue, from: me.id });
      // Persist AFTER broadcasting (the 50 ms lesson): the cue-log is what makes
      // a recorded show replayable — VOD replay fetches /room/{name}/cuelog and
      // re-fires each cue at its `at` moment against the recording's wall clock.
      // The sender's own stamps inside `cue` (at/fireAt, sentAt, …) are stored
      // VERBATIM and are the only timing authority: the DO's Date.now() is
      // frozen during execution (~±70 ms apparent skew) and pub→DO→sub transit
      // is 27–38 ms, so `serverAt`/`doRecvTs` are debugging breadcrumbs only.
      const log = (await this.state.storage.get('cuelog')) || [];
      log.push({ from: me.id, cue, doRecvTs: cue.serverAt /* UNTRUSTED for timing */ });
      if (log.length > 1000) log.splice(0, log.length - 1000); // bound storage
      await this.putCuelog(log);
      return;
    }

    // -- cancel: {type:'cancel', id} ---------------------------------------
    // Unschedule a pending cue. Broadcast to everyone AND append a cancel
    // record to the cuelog so replay knows the cue must not fire.
    if (f.type === 'cancel' && typeof f.id === 'string') {
      this.broadcast({ type: 'cancel', id: f.id, from: me.id });
      const log = (await this.state.storage.get('cuelog')) || [];
      log.push({ kind: 'cancel', id: f.id, from: me.id, doRecvTs: Date.now() });
      if (log.length > 1000) log.splice(0, log.length - 1000); // bound storage
      await this.putCuelog(log);
      return;
    }
  }

  // The death signal. In the one-to-many world a closed socket kills the
  // broadcast (plans/plan.md §10); here it is the FEATURE: dead publishers emit no
  // track-level events and their SFU sessions 410 only at +31–47 s (measured,
  // plan-m2m §5.4) — this broadcast is what tells survivors to tracks/close.
  async webSocketClose(ws) { await this.dropped(ws); }
  async webSocketError(ws) { await this.dropped(ws); }

  async dropped(ws) {
    const me = ws.deserializeAttachment?.() || null;
    // A socket replaced by a rejoin (stale) is NOT the participant's current
    // socket: its close must not broadcast 'left' or touch the roster.
    if (!me || me.stale) return;
    // Broadcast IMMEDIATELY; persistence follows (the 50 ms lesson).
    this.broadcast({ type: 'left', participantId: me.id });
    const roster = await this.roster();
    // Belt and suspenders: only the generation that owns the roster entry may
    // delete it (pre-gen entries have no gen and keep the old behavior).
    if (roster[me.id] && (roster[me.id].gen == null || roster[me.id].gen === me.gen)) {
      delete roster[me.id];
      await this.putRoster(roster);
    }
  }

  broadcast(frame, skip) {
    const msg = JSON.stringify(frame);
    for (const s of this.state.getWebSockets()) {
      if (s === skip) continue;
      try { s.send(msg); } catch {}
    }
  }
}

// ---------------------------------------------------------------------------
// Worker: routing, auth, SFU proxy, tiles.
// ---------------------------------------------------------------------------

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
};

function withCors(resp) {
  const h = new Headers(resp.headers);
  for (const [k, v] of Object.entries(CORS)) h.set(k, v);
  return new Response(resp.body, { status: resp.status, headers: h });
}

function text(status, body) {
  return withCors(new Response(body, { status, headers: { 'Content-Type': 'text/plain' } }));
}

function authorized(request, url, env) {
  if (!env.ROOM_TOKEN) return false; // fail closed if the secret is missing
  const q = url.searchParams.get('token');
  const h = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const supplied = q || h;
  if (!supplied || supplied.length !== env.ROOM_TOKEN.length) return false;
  // Constant-time-ish compare; the token is random, not a password, so this
  // is hygiene rather than a hard requirement.
  let diff = 0;
  for (let i = 0; i < supplied.length; i++) {
    diff |= supplied.charCodeAt(i) ^ env.ROOM_TOKEN.charCodeAt(i);
  }
  return diff === 0;
}

function tileCacheKey(url, room, pid) {
  // Stable synthetic key on our own origin; querystring (token) excluded.
  return new Request(`${url.origin}/tile/${room}/${pid}`, { method: 'GET' });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // ---- room WebSocket --------------------------------------------------
    const roomM = pathname.match(/^\/room\/([\w-]{1,64})\/ws$/);
    if (roomM) {
      if (!authorized(request, url, env)) return text(403, 'bad or missing token');
      const id = env.ROOMS.idFromName(roomM[1]);
      return env.ROOMS.get(id).fetch(request);
    }

    // ---- room cue-log (VOD replay: re-fire recorded cues against T0) -----
    const cuelogM = pathname.match(/^\/room\/([\w-]{1,64})\/cuelog$/);
    if (cuelogM) {
      if (!authorized(request, url, env)) return text(403, 'bad or missing token');
      if (request.method !== 'GET') return text(405, 'method');
      const id = env.ROOMS.idFromName(cuelogM[1]);
      const resp = await env.ROOMS.get(id).fetch('https://do/cuelog');
      const h = new Headers(CORS);
      h.set('Content-Type', 'application/json');
      return new Response(resp.body, { status: resp.status, headers: h });
    }

    // ---- SFU proxy -------------------------------------------------------
    if (pathname.startsWith('/cf/')) {
      if (!authorized(request, url, env)) return text(403, 'bad or missing token');
      if (!['GET', 'POST', 'PUT'].includes(request.method)) return text(405, 'method');
      const sub = pathname.slice('/cf/'.length);
      if (!CF_SUBPATH_RE.test(sub)) return text(400, 'bad cf subpath');
      const target = `${SFU_BASE}/${env.CF_REALTIME_APP_ID}/${sub}`;
      const t0 = Date.now();
      const upstream = await fetch(target, {
        method: request.method,
        headers: {
          Authorization: `Bearer ${env.CF_REALTIME_APP_SECRET}`,
          'Content-Type': 'application/json',
          'User-Agent': SFU_UA, // default/generic UAs get 1010-blocked
        },
        body: ['POST', 'PUT'].includes(request.method) ? request.body : undefined,
      });
      const h = new Headers(CORS);
      h.set('Content-Type', upstream.headers.get('Content-Type') || 'application/json');
      h.set('X-Proxy-Ms', String(Date.now() - t0));
      return new Response(upstream.body, { status: upstream.status, headers: h });
    }

    // ---- snapshot tiles --------------------------------------------------
    const tileM = pathname.match(/^\/tile\/([\w-]{1,64})\/([\w.-]{1,64})$/);
    if (tileM) {
      const [, room, pid] = tileM;
      if (!ROOM_RE.test(room) || !PID_RE.test(pid)) return text(400, 'bad path');

      if (request.method === 'POST') {
        if (!authorized(request, url, env)) return text(403, 'bad or missing token');
        const buf = await request.arrayBuffer();
        if (buf.byteLength > TILE_MAX_BYTES) return text(413, 'tile too large (64 KB max)');
        if (buf.byteLength < 4 || new Uint8Array(buf)[0] !== 0xff || new Uint8Array(buf)[1] !== 0xd8) {
          return text(415, 'not a JPEG');
        }
        // Primary store: colo cache (fine for the prototype — viewers and
        // publishers of one show tend to share a colo; production = R2/KV).
        const cacheResp = new Response(buf, {
          headers: {
            'Content-Type': 'image/jpeg',
            'Cache-Control': `public, max-age=${TILE_CACHE_TTL_S}`,
            'X-Tile-Stored-At': String(Date.now()),
          },
        });
        ctx.waitUntil(caches.default.put(tileCacheKey(url, room, pid), cacheResp));
        // Fallback store: latest-per-participant in the room DO (survives
        // cache misses / other colos; trivial — one small put, no broadcast).
        ctx.waitUntil(
          env.ROOMS.get(env.ROOMS.idFromName(room))
            .fetch(`https://do/tile-put/${pid}`, { method: 'POST', body: buf }),
        );
        return withCors(new Response(JSON.stringify({ ok: true, bytes: buf.byteLength }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        }));
      }

      if (request.method === 'GET') {
        const hit = await caches.default.match(tileCacheKey(url, room, pid));
        if (hit) {
          const storedAt = Number(hit.headers.get('X-Tile-Stored-At') || 0);
          const h = new Headers(CORS);
          h.set('Content-Type', 'image/jpeg');
          h.set('Cache-Control', `public, max-age=${TILE_CLIENT_TTL_S}`);
          h.set('X-Tile-Source', 'cache');
          if (storedAt) h.set('X-Tile-Age-Ms', String(Date.now() - storedAt));
          return new Response(hit.body, { status: 200, headers: h });
        }
        const doResp = await env.ROOMS.get(env.ROOMS.idFromName(room))
          .fetch(`https://do/tile-get/${pid}`);
        if (doResp.status !== 200) return text(404, 'no tile');
        const h = new Headers(CORS);
        h.set('Content-Type', 'image/jpeg');
        h.set('Cache-Control', `public, max-age=${TILE_CLIENT_TTL_S}`);
        h.set('X-Tile-Source', 'do');
        const age = doResp.headers.get('X-Tile-Age-Ms');
        if (age) h.set('X-Tile-Age-Ms', age);
        return new Response(doResp.body, { status: 200, headers: h });
      }
      return text(405, 'method');
    }

    return text(404, 'elektron-rtc: /room/{name}/ws · /room/{name}/cuelog · /cf/* · /tile/{room}/{pid}');
  },
};
