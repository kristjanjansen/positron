// proto/looper/peer.mjs — two loopers, two rooms, one loop.
//
// DOM-free and transport-agnostic. A transport is two functions:
//     { send(obj), onMessage(cb), close() }
// so the same protocol runs over a BroadcastChannel (two tabs), a WebSocket
// (a real hop), a WebRTC DataChannel, or an in-process pair with injected
// delay and loss (which is how it is measured).
//
// ---------------------------------------------------------------------------
// THE CLAIM THIS FILE EXISTS TO TEST (plans/plan-looper.md §1)
// ---------------------------------------------------------------------------
// A committed loop is a VALUE. So the network is used ONCE PER LAYER, not once
// per note, and how long delivery takes cannot change a single onset — it can
// only change which pass the layer starts on. That turns the hard problem of
// networked music (latency) into an easy one (scheduling), and leaves exactly
// one hard problem behind: **do the two peers agree what time it is.**
//
// Hence two planes with opposite requirements, and they are kept apart here:
//
//   LOOP PLANE   a committed layer, as a session envelope. Reliable, ordered,
//                latency-indifferent. ~1.7 kB per layer (measured).
//   LIVE PLANE   what you are playing right now, so the other person can play
//                along. Lowest latency; DROPPED BEATS LATE — the jam matrix
//                measured reliable modes stalling 200–412 ms on exactly the
//                sparse phrasing music is made of, while unreliable turns that
//                into ~2 % vanished notes at p95 2.5 ms.
//
// ---------------------------------------------------------------------------
// THE CLOCK, AND WHY IT IS NOT THE WORKER'S
// ---------------------------------------------------------------------------
// Peers must agree on the loop's ORIGIN. Disagree by δ and the loops flam by δ.
// This project has measured both available answers:
//
//   against a Worker /time endpoint : ±50 ms, and it is BIAS (edge/worker path
//                                     asymmetry), not jitter — C5's optimistic
//                                     ±25 ms was revised to this by measurement
//   peer-to-peer, min-RTT-of-N      : ±0.15 ms, drift 7 µs / 25 min
//
// At a 2 s loop, ±50 ms is 2.5 % of the circle — a constant, audible flam. So
// the skew is estimated PEER TO PEER and the relay is never asked what time it
// is. It stays the ordering point and the recorder feed, which is its job.
//
// The estimator is NTP's, with the one refinement that matters: keep the sample
// with the MINIMUM round trip, never an average. An average is dragged by every
// queued packet; the minimum is the sample that got through cleanly, and on a
// path where the two directions are asymmetric it is the only one that is not
// contaminated by the asymmetry.

/** Shared time domain: epoch ms, in doubles. Both peers' `performance.now()`
 *  origins differ, so a bare now() cannot be compared across a network;
 *  `timeOrigin + now()` can, up to system-clock skew, which is what the
 *  estimator below removes. (jam-core.js reached this first; same rule.) */
export const epochNow = () =>
  (typeof performance !== 'undefined' && performance.timeOrigin != null)
    ? performance.timeOrigin + performance.now()
    : Date.now();

export const PROTO = 'looper/1';

/**
 * @param {object} o
 * @param {string} o.id            this peer's id — the LOWEST id in the room is
 *                                 the time reference, so agreement needs no
 *                                 election and no negotiation
 * @param {object} o.transport     {send, onMessage, close}
 * @param {function} [o.now]       shared-domain clock source (default epochNow)
 */
export function createPeer({ id, transport, now = epochNow, onLayer = null, onLive = null,
                             onGrid = null, onPeer = null, pingEveryMs = 2000, pingBurst = 5 } = {}) {
  if (!id) throw new Error('createPeer needs an id');
  const peers = new Map();          // id -> {id, offsetMs, rttMs, samples, lastSeen}
  let offsetMs = 0;                 // add to local shared-time to reach the reference
  let grid = null;                  // {loopMs, origin, by}
  let seq = 0, pingTimer = null;
  const pending = new Map();        // seq -> t0
  const rxLayers = [];              // sessions received, in arrival order
  const log = [];                   // every protocol event, for measurement

  /** corrected shared time — what every stamp and every origin is expressed in */
  const sharedNow = () => now() + offsetMs;

  function send(obj) { transport.send({ ...obj, p: PROTO, from: id }); }

  // --- the skew estimator ---------------------------------------------------
  function ping() {
    for (let i = 0; i < pingBurst; i++) {
      const s = ++seq;
      pending.set(s, now());
      send({ type: 'ping', seq: s, t0: now() });
    }
  }

  /**
   * NTP's estimator. `offset` is how far the REMOTE clock is ahead of ours;
   * `rtt` is the round trip. Keep the minimum-RTT sample and nothing else.
   */
  function onPong(m) {
    const t0 = pending.get(m.seq);
    if (t0 == null) return;
    pending.delete(m.seq);
    const t2 = now();
    const rtt = t2 - t0;
    const offset = m.t1 - (t0 + t2) / 2;
    let p = peers.get(m.from);
    if (!p) { p = { id: m.from, offsetMs: 0, rttMs: Infinity, samples: 0, lastSeen: 0 }; peers.set(m.from, p); }
    p.samples++; p.lastSeen = now();
    if (rtt < p.rttMs) { p.rttMs = rtt; p.offsetMs = offset; }
    log.push({ type: 'skew', peer: m.from, rtt: +rtt.toFixed(3), offset: +offset.toFixed(3), kept: rtt <= p.rttMs });
    recomputeOffset();
  }

  /**
   * THE REFERENCE IS THE LOWEST ID IN THE ROOM. No election, no leader
   * heartbeat, no split brain — every peer computes the same answer from the
   * same set, which is the same trick the epoch grid uses on the origin: agree
   * by construction rather than by negotiation.
   */
  function recomputeOffset() {
    const ids = [id, ...peers.keys()].sort();
    const ref = ids[0];
    const next = ref === id ? 0 : (peers.get(ref) ? peers.get(ref).offsetMs : offsetMs);
    if (next !== offsetMs) {
      const was = offsetMs; offsetMs = next;
      log.push({ type: 'offset', from: +was.toFixed(3), to: +next.toFixed(3), ref });
    }
  }

  // --- the grid -------------------------------------------------------------
  /**
   * Announce the session grid. Whoever commits the first layer fixes it, and
   * `at` is epoch-anchored (`ceil(now/L)·L`) so a peer that has not heard the
   * announcement yet still computes the same boundaries the moment it does —
   * the origin is a property of the wall clock, not of either peer.
   */
  function setGrid(loopMs, origin = null) {
    const o = origin ?? Math.ceil(sharedNow() / loopMs) * loopMs;
    grid = { loopMs, origin: o, by: id };
    send({ type: 'grid', loopMs, origin: o });
    log.push({ type: 'grid-set', loopMs, origin: o });
    return grid;
  }

  function onGridMsg(m) {
    if (grid) {
      // FIRST ANNOUNCEMENT WINS, deterministically: ties break on peer id, so
      // two simultaneous commits do not leave the room split. The loser's loop
      // is re-projected onto the winner's length by the caller, which must SAY
      // SO — a silently re-timed recording is worse than a refused one.
      const mineFirst = grid.origin < m.origin || (grid.origin === m.origin && id < m.from);
      if (mineFirst) return;
      log.push({ type: 'grid-yield', to: m.from, was: grid, now: { loopMs: m.loopMs, origin: m.origin } });
    }
    grid = { loopMs: m.loopMs, origin: m.origin, by: m.from };
    onGrid && onGrid(grid);
  }

  // --- the two planes -------------------------------------------------------
  /** LOOP PLANE. One committed layer, as a value. Latency-indifferent. */
  function publishLayer(session, meta = {}) {
    const bytes = JSON.stringify(session).length;
    send({ type: 'layer', session, meta, sentAt: sharedNow(), bytes });
    log.push({ type: 'layer-sent', bytes, at: sharedNow() });
    return bytes;
  }

  /** LIVE PLANE. Fire and forget; a lost note is a note nobody hears once. */
  function publishLive(row) {
    send({ type: 'live', row: { type: row.type, note: row.note, vel: row.vel, at: row.at } });
  }

  function onMessage(m) {
    if (!m || m.p !== PROTO || m.from === id) return;
    let p = peers.get(m.from);
    if (!p) {
      p = { id: m.from, offsetMs: 0, rttMs: Infinity, samples: 0, lastSeen: now() };
      peers.set(m.from, p); onPeer && onPeer(p);
      recomputeOffset();
      send({ type: 'hello' });                       // so a late joiner is seen too
      ping();
    }
    p.lastSeen = now();
    switch (m.type) {
      case 'ping': send({ type: 'pong', seq: m.seq, t0: m.t0, t1: now() }); break;
      case 'pong': onPong(m); break;
      case 'grid': onGridMsg(m); break;
      case 'hello': break;
      case 'layer': {
        const arrivedAt = sharedNow();
        const rec = { from: m.from, session: m.session, meta: m.meta, bytes: m.bytes,
                      sentAt: m.sentAt, arrivedAt, deliveryMs: +(arrivedAt - m.sentAt).toFixed(3) };
        rxLayers.push(rec);
        log.push({ type: 'layer-recv', from: m.from, bytes: m.bytes, deliveryMs: rec.deliveryMs });
        onLayer && onLayer(rec);
        break;
      }
      case 'live': onLive && onLive(m.row, m.from); break;
      default: break;
    }
  }

  transport.onMessage(onMessage);
  send({ type: 'hello' });
  ping();
  if (pingEveryMs > 0 && typeof setInterval === 'function') pingTimer = setInterval(ping, pingEveryMs);

  return {
    id, log, rxLayers,
    now: sharedNow,
    /** the clock a looper should be built on: shared, skew-corrected */
    clock: { domain: 'shared-epoch', now: sharedNow },
    offsetMs: () => offsetMs,
    peers: () => [...peers.values()],
    grid: () => grid,
    setGrid, publishLayer, publishLive, ping,
    /**
     * WHERE A LATE LAYER STARTS. A quotation whose `at` has already gone by
     * cannot start in the past, so it starts on the next boundary of the grid —
     * which is the whole reason delivery latency is not a timing problem here.
     * Returns the boundary and how many passes were missed, so the UI can say
     * "started one pass late" instead of pretending it was instant.
     */
    entryFor(loopMs, origin, at = sharedNow()) {
      const k = Math.max(0, Math.ceil((at - origin) / loopMs));
      return { at: origin + k * loopMs, iteration: k, missedPasses: Math.max(0, k - 1) };
    },
    stats() {
      const ps = [...peers.values()];
      return {
        id, offsetMs, grid, peers: ps.length,
        minRttMs: ps.length ? Math.min(...ps.map((p) => p.rttMs)) : null,
        skewSamples: ps.reduce((a, p) => a + p.samples, 0),
        layersReceived: rxLayers.length,
        deliveryMs: rxLayers.map((r) => r.deliveryMs),
      };
    },
    dispose() { if (pingTimer) clearInterval(pingTimer); transport.close && transport.close(); },
  };
}

// ===========================================================================
// Transports
// ===========================================================================

/** Two tabs of one browser. Zero infrastructure, a real cross-context hop. */
export function broadcastTransport(name = 'positron-looper') {
  const ch = new BroadcastChannel(name);
  return {
    send(obj) { ch.postMessage(obj); },
    onMessage(cb) { ch.onmessage = (e) => cb(e.data); },
    close() { ch.close(); },
  };
}

/** A real network hop, over any WebSocket relay that echoes to the others. */
export function wsTransport(url) {
  const ws = new WebSocket(url);
  const queue = [];
  let cb = null;
  ws.onopen = () => { for (const m of queue.splice(0)) ws.send(m); };
  ws.onmessage = (e) => { if (cb) { try { cb(JSON.parse(e.data)); } catch {} } };
  return {
    send(obj) { const s = JSON.stringify(obj); if (ws.readyState === 1) ws.send(s); else queue.push(s); },
    onMessage(fn) { cb = fn; },
    close() { ws.close(); },
  };
}

/**
 * An in-process pair with injected delay, jitter, loss and CLOCK SKEW — the
 * only transport that can prove latency-indifference, because it is the only
 * one where the latency is a number the test chose.
 *
 * `schedule(delayMs, fn)` is supplied by the caller so the pair runs on a
 * virtual clock in the measurement and on real timers everywhere else.
 */
export function pairTransports({ schedule, delayMs = 0, jitterMs = 0, lossRate = 0, rng = null } = {}) {
  const sides = [[], []];           // callbacks per side
  const random = rng || (() => 0.5);
  let sent = 0, dropped = 0, delivered = 0;
  const mk = (me) => ({
    send(obj) {
      sent++;
      if (lossRate > 0 && random() < lossRate) { dropped++; return; }
      const d = delayMs + (jitterMs ? (random() * 2 - 1) * jitterMs : 0);
      const copy = JSON.parse(JSON.stringify(obj));      // a wire copy, always
      schedule(Math.max(0, d), () => { delivered++; for (const cb of sides[1 - me]) cb(copy); });
    },
    onMessage(cb) { sides[me].push(cb); },
    close() { sides[me].length = 0; },
  });
  return { a: mk(0), b: mk(1), stats: () => ({ sent, dropped, delivered }) };
}
