// timeline/transport.mjs — transport vector + wall-lane lookahead scheduler +
// audio lane. Plain ESM, browser+node, no deps. Seeded by plan-timeline §1/§4
// and the graveyard laws in research/timeline-own-prior-art-2026-08.md §2:
//   - NO timers inside the vector; position(now) is pure math over {p0,t0,rate}.
//   - Lookahead loop + committed-vs-pending with cancel (never per-event
//     fan-out armed at play — that corpse is reproduced in
//     createFanoutScheduler below, for measurement only).
//   - Drift channel first-class: every fire logs {intendedT, firedT, deltaMs};
//     position observable is separate from event callbacks.
//   - Explicit catch-up policy per kind: 'burst' | 'drop' | {reduce}.
//   - The log is immutable; cursor/status state lives here, never on stored
//     payloads (statuses live on scheduler-private wrappers).
// Measured defaults (tick 25 ms / horizon 100 ms) validated by timeline/lab.
//
// v0.2 — the six API seams the first two clients (proto/jam, proto/selfrec)
// hit, all closed in-library (see proto/jam/NOTES.md C11 for the field report):
//   1. registerAdapter(kind, {actuate, caps, reduce, assertState}) + dispatch —
//      clients no longer filter onFire or wire setPolicy themselves.
//   2. setRate() no longer doubles as play(); .targetRate exposes the resume
//      rate so a PAUSED ui can display 0.5× instead of 0.00×.
//   3. createScheduler defaults to the WORKER tick host — the lab VERDICT —
//      with main/raf as explicit opt-ins (hostKind or an explicit host).
//   4. caps.audio = {ctx, leadMs} gives actuate() a third `when` argument
//      carrying the fire's instant in AudioContext seconds: sample-accurate
//      voices scheduled straight from the wall lane.
//   5. reduce() is handed the WHOLE ordered prefix (plus an explicit
//      {from:{pos,state}, since} pair), not one scan's missed events — correct
//      for non-commutative reducers.
//   6. onDrift()/peekDrift() read the drift channel non-destructively (HUD and
//      assert harness can coexist); drainDrift() stays for bounded memory.
//   +  transport.sync(pos) slaves the vector to an external clock master (a
//      media element) without seek semantics; createDeck() is the facade.

// ---------------------------------------------------------------------------
// Clocks. A ClockSource is {domain, now()} with now() in *milliseconds* float
// (µs resolution preserved in the fraction). Wall = epoch-anchored monotonic
// (steal #8: performance.timeOrigin + performance.now(), never Date.now()).
// ---------------------------------------------------------------------------

export function wallClock() {
  return { domain: 'wall', now: () => performance.timeOrigin + performance.now() };
}

/** Audio-domain clock over an AudioContext, with a wall<->audio anchor.
 *  now() returns wall-equivalent ms derived from ctx.currentTime, so a
 *  transport on this clock advances on the audio hardware clock.
 *  reanchor() re-samples the mapping (call sparingly; drift is the point). */
export function audioClock(ctx) {
  let anchor = sample();
  function sample() {
    // min-skew over a few tries: pair performance.now() with ctx.currentTime
    let best = null;
    for (let i = 0; i < 5; i++) {
      const w1 = performance.timeOrigin + performance.now();
      const a = ctx.currentTime;
      const w2 = performance.timeOrigin + performance.now();
      if (!best || w2 - w1 < best.spread) best = { wall: (w1 + w2) / 2, audio: a, spread: w2 - w1 };
    }
    return best;
  }
  return {
    domain: 'audio',
    now: () => anchor.wall + (ctx.currentTime - anchor.audio) * 1000,
    /** audio-context seconds for a wall-domain ms value (for node.start()) */
    audioTimeFor: (wallMs) => anchor.audio + (wallMs - anchor.wall) / 1000,
    reanchor: () => { anchor = sample(); return anchor; },
    anchor: () => anchor,
  };
}

// ---------------------------------------------------------------------------
// Transport vector. State is exactly {p0, t0, rate}; position is pure math.
// rate === 0 means paused; play() restores the last nonzero rate.
//
// SEAM 2 (client feedback C11.2): setRate() used to double as play() — there
// was no set-rate-while-paused and `lastRate` was private, so a paused UI could
// only ever display 0.00×. Now:
//   setRate(r)  sets the rate WITHOUT starting playback (paused stays paused);
//               setRate(0) is still an explicit pause.
//   play(r?)    is the only thing that starts motion (optionally at rate r).
//   .rate       current effective rate (0 while paused) — unchanged.
//   .targetRate the rate play() would resume at — what a paused UI displays.
// ---------------------------------------------------------------------------

export function createTransport({ clock = wallClock() } = {}) {
  let p0 = 0, t0 = clock.now(), rate = 0, lastRate = 1;
  const listeners = new Set();

  function position(now = clock.now()) { return p0 + (now - t0) * rate; }
  /** Clock time at which position reaches pos (null while paused). */
  function timeAt(pos) { return rate === 0 ? null : t0 + (pos - p0) / rate; }

  function emit(reason) {
    const ev = { type: 'statechange', reason, p0, t0, rate, targetRate: lastRate, clockDomain: clock.domain };
    for (const cb of [...listeners]) cb(ev);
  }
  function update(newRate, newPos, reason) {
    const now = clock.now();
    const pos = newPos !== undefined ? newPos : position(now);
    p0 = pos; t0 = now;
    if (newRate !== undefined) { rate = newRate; if (newRate !== 0) lastRate = newRate; }
    emit(reason);
  }

  return {
    clock,
    position, timeAt,
    get vector() { return { p0, t0, rate }; },
    get rate() { return rate; },
    /** the rate play() resumes at; === rate while playing (SEAM 2) */
    get targetRate() { return rate !== 0 ? rate : lastRate; },
    get playing() { return rate !== 0; },
    play(r) {
      if (r !== undefined) {
        if (!(r > 0)) throw new Error('play(rate) needs a positive rate');
        lastRate = r;
      }
      if (rate !== lastRate) update(lastRate, undefined, 'play');
    },
    pause() { if (rate !== 0) update(0, undefined, 'pause'); },
    seek(pos) { update(undefined, pos, 'seek'); },
    /** Slave the vector to an EXTERNAL clock master (a media element, a remote
     *  peer) — re-anchor {p0,t0} onto an observed position WITHOUT seek
     *  semantics: no status reconcile, no re-assert, nothing re-fires; only
     *  committed timers are re-armed against the new anchor. Corrections
     *  smaller than toleranceMs are ignored (don't churn the lookahead).
     *  Returns the correction actually applied, in ms. */
    sync(pos, { toleranceMs = 0 } = {}) {
      const now = clock.now();
      const d = pos - position(now);
      if (!(Math.abs(d) > toleranceMs)) return 0;
      p0 = pos; t0 = now;
      emit('sync');
      return d;
    },
    /** Set the rate. Does NOT start playback (SEAM 2); setRate(0) pauses. */
    setRate(r) {
      if (r < 0) throw new Error('negative rate unsupported in v0');
      if (r === 0) return this.pause();
      if (rate === 0) { lastRate = r; emit('rate'); return; }  // paused: arm it, stay paused
      update(r, undefined, 'rate');
    },
    /** Subscribe to state changes; returns unsubscribe (law: on() returns off). */
    onState(cb) { listeners.add(cb); return () => listeners.delete(cb); },
  };
}

// ---------------------------------------------------------------------------
// Tick hosts. A TickHost is {start(onTick, tickMs), stop(), setTimer(delayMs,
// fn) -> cancelFn}. The scheduler only ever talks to time through its clock
// and its host — which is what makes the virtual runtime (below) possible.
// ---------------------------------------------------------------------------

/** (a) main-thread setTimeout/setInterval host — tightest in the foreground
 *  (6.4 ms p95 measured) but dies to the 1 Hz clamp in a hidden tab; an
 *  explicit opt-in since v0.2 (SEAM 3). */
export function mainTickHost() {
  let iv = null;
  return {
    name: 'main',
    start(onTick, tickMs) { this.stop(); iv = setInterval(onTick, tickMs); },
    stop() { if (iv !== null) { clearInterval(iv); iv = null; } },
    setTimer(delayMs, fn) { const h = setTimeout(fn, Math.max(0, delayMs)); return () => clearTimeout(h); },
  };
}

/** (b) Web-Worker-hosted host: both the tick metronome AND precise one-shot
 *  timers run in a dedicated worker; the main thread is woken by postMessage
 *  (message tasks dodge background-tab timer throttling). Browser-only. */
export function workerTickHost() {
  const src = `
    let iv = null; const timers = new Map();
    onmessage = (e) => { const m = e.data;
      if (m.op === 'start') { clearInterval(iv); iv = setInterval(() => postMessage({ t: 'tick' }), m.tickMs); }
      else if (m.op === 'stop') { clearInterval(iv); iv = null; }
      else if (m.op === 'arm') { timers.set(m.id, setTimeout(() => { timers.delete(m.id); postMessage({ t: 'fire', id: m.id }); }, m.delay)); }
      else if (m.op === 'cancel') { clearTimeout(timers.get(m.id)); timers.delete(m.id); }
    };`;
  const worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
  let onTick = null, seq = 0;
  const cbs = new Map();
  worker.onmessage = (e) => {
    const m = e.data;
    if (m.t === 'tick') onTick && onTick();
    else if (m.t === 'fire') { const cb = cbs.get(m.id); cbs.delete(m.id); cb && cb(); }
  };
  return {
    name: 'worker',
    start(cb, tickMs) { onTick = cb; worker.postMessage({ op: 'start', tickMs }); },
    stop() { onTick = null; worker.postMessage({ op: 'stop' }); },
    setTimer(delayMs, fn) {
      const id = ++seq; cbs.set(id, fn);
      worker.postMessage({ op: 'arm', id, delay: Math.max(0, delayMs) });
      return () => { cbs.delete(id); worker.postMessage({ op: 'cancel', id }); };
    },
    terminate() { worker.terminate(); },
  };
}

/** (c) rAF-driven host — the anti-pattern for background tabs, measured
 *  anyway. Ticks on every frame; "timers" fire on the first frame past their
 *  deadline (frame-quantized, dies entirely when the tab is hidden). */
export function rafTickHost() {
  let running = false, onTick = null, seq = 0;
  const armed = new Map(); // id -> {due, fn}
  function loop() {
    if (!running) return;
    const now = performance.now();
    for (const [id, t] of armed) if (now >= t.due) { armed.delete(id); t.fn(); }
    onTick && onTick();
    requestAnimationFrame(loop);
  }
  return {
    name: 'raf',
    start(cb) { onTick = cb; if (!running) { running = true; requestAnimationFrame(loop); } },
    stop() { onTick = null; if (!armed.size) running = false; },
    setTimer(delayMs, fn) {
      const id = ++seq;
      armed.set(id, { due: performance.now() + Math.max(0, delayMs), fn });
      if (!running) { running = true; requestAnimationFrame(loop); }
      return () => armed.delete(id);
    },
  };
}

/** SEAM 3: the SHIPPING default host. The lab VERDICT is worker (the only host
 *  that survives a hidden tab: 8.5 ms p95 hidden vs main ~1 s, rAF 9.2 s), so
 *  the code default is worker wherever Worker exists, and main is an explicit
 *  opt-in (`host: mainTickHost()` or `hostKind: 'main'`) for foreground-
 *  critical precision (6.4 vs 15.3 ms p95, measured). Outside a browser there
 *  is no Worker — fall back to the main-thread host. */
export function defaultTickHost() {
  return typeof Worker === 'function' ? workerTickHost() : mainTickHost();
}
export function tickHostByKind(kind) {
  if (kind === 'main') return mainTickHost();
  if (kind === 'raf') return rafTickHost();
  if (kind === 'worker') return workerTickHost();
  return defaultTickHost();
}

// ---------------------------------------------------------------------------
// Wall-lane scheduler: lookahead loop, committed-vs-pending, per-kind catch-up
// policies, first-class drift log, ADAPTER REGISTRY. Port of the timed-messages
// crossing engine generalized per plan-timeline §1.
//
// SEAM 1 — adapter registry. Clients think in per-kind adapters; the library
// used to offer only unfiltered onFire + setPolicy, so every client re-wrote
// the same dispatch/filter/policy-wiring block. registerAdapter() now lives
// here:
//     sched.registerAdapter(kind, {
//       caps,                       // {catchUp, audio, rates, …} — declares behaviour
//       actuate(payload, rec, when),// called ONLY for this kind
//       reduce(payloads, pos, info),// catch-up + seek fold (whole prefix, SEAM 5)
//       assertState(state, info),   // idempotent state assertion
//     }) -> unregister
// caps.catchUp ('burst' | 'drop' | 'reduce') selects the per-kind policy, so a
// client never touches setPolicy either. onFire stays, for HUDs and harnesses
// that want every kind.
// ---------------------------------------------------------------------------

export function createScheduler(transport, {
  tickMs = 25,
  horizonMs = 100,
  lateGraceMs = 150,   // late fires within grace are ordinary jitter, not a catch-up event
  hostKind,            // 'worker' | 'main' | 'raf' — explicit opt-in shorthand
  host = tickHostByKind(hostKind),   // SEAM 3: worker by default (lab VERDICT)
  driftLimit = 20000,  // retained drift rows when nobody drains (SEAM 6)
} = {}) {
  const clock = transport.clock;
  const events = [];            // sorted by (at, seq); wrappers own status, log stays immutable
  let seq = 0, gen = 0, firstLive = 0, running = false;
  const policies = new Map();   // kind -> 'burst' | 'drop' | 'reduce' | {reduce(batch, info)}
  const adapters = new Map();   // kind -> {actuate, caps, reduce, assertState}
  const snapshots = new Map();  // kind -> {pos, state}  (SEAM 5: reduce's fromSnapshot)
  const fireCbs = new Set(), policyCbs = new Set(), driftCbs = new Set();
  const driftLog = [];
  let driftTotal = 0, driftDropped = 0;
  let busyMs = 0;               // accumulated scheduler+fire callback self-time
  let lastTickAt = null, maxTickGapMs = 0;

  function insertIdx(at, s) {
    let lo = 0, hi = events.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      const e = events[mid];
      if (e.at < at || (e.at === at && e.seq < s)) lo = mid + 1; else hi = mid;
    }
    return lo;
  }

  /** SEAM 6: drift is a CHANNEL, not a mailbox — subscribers see every row and
   *  peekDrift() is non-destructive, so a HUD and an assert harness can both
   *  observe the same fires. drainDrift() stays, for bounded memory; the
   *  retained buffer is also capped at driftLimit so a peek-only client cannot
   *  grow it without bound (drops are counted, never silent). */
  function logDrift(rec) {
    driftLog.push(rec); driftTotal++;
    if (driftLog.length > driftLimit) driftDropped += driftLog.splice(0, driftLog.length - driftLimit).length;
    for (const cb of driftCbs) cb(rec);
  }

  /** SEAM 4: wall -> audio bridge. The wall lane hands actuate() an instant;
   *  an adapter that declares caps.audio = {ctx, leadMs?} additionally gets a
   *  `when` object carrying that instant in AudioContext seconds, so a
   *  sample-accurate voice can be start()ed FROM THE WALL LANE. The conversion
   *  is free: the drift record already knows how early/late this fire is
   *  (deltaMs), and ctx.currentTime sampled at the same instant is the audio
   *  domain's "now" — so intended-in-audio = ctx.currentTime - deltaMs/1000.
   *  A negative delta (fired early, the normal lookahead case) leaves positive
   *  headroom: `when.earlyMs`. Opt-in per adapter; nothing else pays for it. */
  function audioWhen(ad, rec) {
    const cfg = ad && ad.caps && ad.caps.audio;
    if (!cfg || !cfg.ctx || rec.deltaMs === null) return null;
    const ctx = cfg.ctx, leadMs = cfg.leadMs || 0;
    const ctxTime = ctx.currentTime;
    const earlyMs = -rec.deltaMs;
    const audioTime = ctxTime + (earlyMs + leadMs) / 1000;
    rec.audioTime = +audioTime.toFixed(6);
    rec.earlyMs = +earlyMs.toFixed(3);
    return { ctx, ctxTime, audioTime, earlyMs: rec.earlyMs, leadMs, late: audioTime < ctxTime };
  }

  function fire(ev, origin) {
    const firedT = clock.now();
    const intended = transport.timeAt(ev.at);
    ev.status = 'fired'; ev.fires++; ev.cancel = null;
    const rec = {
      id: ev.id, kind: ev.kind, at: ev.at,
      intendedUs: intended === null ? null : Math.round(intended * 1000),
      firedUs: Math.round(firedT * 1000),
      deltaMs: intended === null ? null : +(firedT - intended).toFixed(3),
      origin, // 'commit' | 'tick-late' | 'burst' | 'overdub'
      tag: ev.payload && ev.payload.tag,
    };
    const ad = adapters.get(ev.kind);
    const when = audioWhen(ad, rec);
    logDrift(rec);
    const t0 = clock.now();
    const pub = publicEv(ev);
    if (ad && typeof ad.actuate === 'function') ad.actuate(ev.payload, rec, when);
    for (const cb of fireCbs) cb(pub, rec);
    busyMs += clock.now() - t0;
  }
  const publicEv = (ev) => ({ id: ev.id, at: ev.at, kind: ev.kind, payload: ev.payload });

  function cancelCommitted() {
    gen++;
    for (let i = firstLive; i < events.length; i++) {
      const ev = events[i];
      if (ev.status === 'committed') { ev.cancel && ev.cancel(); ev.cancel = null; ev.status = 'pending'; }
    }
  }

  /** Reconcile statuses with the playhead after an explicit seek:
   *  behind the playhead -> passed (fired stays fired); ahead -> pending
   *  (re-fire after a backward seek is correct replay, counted via .fires). */
  function reconcile(pos) {
    firstLive = 0;
    for (const ev of events) {
      if (ev.at <= pos) { if (ev.status !== 'fired') ev.status = 'passed'; }
      else if (ev.status !== 'pending') { ev.cancel && ev.cancel(); ev.cancel = null; ev.status = 'pending'; }
    }
    while (firstLive < events.length && events[firstLive].at <= pos) firstLive++;
  }

  function tick() {
    const t0 = clock.now();
    if (lastTickAt !== null) maxTickGapMs = Math.max(maxTickGapMs, t0 - lastTickAt);
    lastTickAt = t0;
    if (transport.rate > 0) scan(t0);
    busyMs += clock.now() - t0;
  }

  function scan(now) {
    const rate = transport.rate;
    const pos = transport.position(now);
    const horizonPos = pos + horizonMs * rate;
    const myGen = gen;
    const reduceBatches = new Map(); // kind -> events
    // advance firstLive past finalized prefix
    while (firstLive < events.length) {
      const s = events[firstLive].status;
      if (s === 'fired' || s === 'passed' || s === 'dropped' || s === 'reduced') firstLive++; else break;
    }
    for (let i = firstLive; i < events.length; i++) {
      const ev = events[i];
      if (ev.at > horizonPos) break;
      if (ev.status !== 'pending') continue;
      if (ev.at <= pos) {
        const lateMs = (pos - ev.at) / rate;
        if (lateMs <= lateGraceMs) { fire(ev, 'tick-late'); continue; }
        const pol = policies.get(ev.kind) || 'burst';
        const isReduce = (pol && typeof pol.reduce === 'function') ||
                         (pol === 'reduce' && adapters.has(ev.kind));
        if (pol === 'drop') { ev.status = 'dropped'; ev.cancel = null; }
        else if (isReduce) {
          ev.status = 'reduced';
          let b = reduceBatches.get(ev.kind);
          if (!b) reduceBatches.set(ev.kind, b = []);
          b.push(publicEv(ev));
        } else fire(ev, 'burst');
      } else {
        // commit: precise one-shot via the host; cancellable, generation-guarded
        const delay = transport.timeAt(ev.at) - now;
        ev.status = 'committed';
        ev.cancel = host.setTimer(delay, () => {
          if (ev.status === 'committed' && myGen === gen) fire(ev, 'commit');
        });
      }
    }
    for (const [kind, batch] of reduceBatches) applyReduce(kind, batch, pos, now, 'catch-up');
  }

  // -------------------------------------------------------------------------
  // SEAM 5 — the reduce policy's INPUT. It used to see only the events one scan
  // happened to miss, which is fine for a commutative fold (held notes) and
  // WRONG for a non-commutative one (a counter, a cue state machine): the
  // reducer cannot know what came before the window.
  //
  // GUARANTEE NOW: a reducer is always handed the COMPLETE ORDERED PREFIX of
  // its kind — every event with at <= pos in (at, seq) order — so `reduce` is a
  // pure function of the prefix and `assertState` is an absolute (idempotent)
  // assertion. That makes it exactly the C2 property in miniature:
  //     assertState(reduce(prefix(<=t)))  ===  state after play(0 -> t)
  // for ANY reducer, commutative or not. Reducers that prefer to fold forward
  // get the explicit alternative in the same call: info.from = {pos, state}
  // (the last reduce boundary and the state it returned) plus info.since (the
  // events in (from.pos, pos]) — so `fold(info.from.state, info.since)` is
  // equally available and equally correct. info.missed keeps the old one-scan
  // batch for diagnostics.
  //
  // The raw setPolicy(kind, {reduce}) escape hatch keeps its historical
  // signature reduce(missedBatch, info) — the enriched info carries prefix/
  // since/from — so existing lab arms are untouched.
  // -------------------------------------------------------------------------
  function prefixEvents(kind, pos) {
    const out = [];
    for (const ev of events) { if (ev.at > pos) break; if (ev.kind === kind) out.push(ev); }
    return out;
  }
  function applyReduce(kind, missed, pos, now, reason) {
    const ad = adapters.get(kind), pol = policies.get(kind);
    const snap = snapshots.get(kind) || { pos: -Infinity, state: undefined };
    const prefix = prefixEvents(kind, pos).map(publicEv);
    const since = prefix.filter((e) => e.at > snap.pos);
    const info = {
      kind, pos, reason, nowUs: Math.round(now * 1000),
      count: missed ? missed.length : prefix.length,
      missed: missed || [], prefix, since, from: { pos: snap.pos, state: snap.state },
    };
    const t = clock.now();
    if (ad && typeof ad.reduce === 'function') {
      const state = ad.reduce(prefix.map((e) => e.payload), pos, info);
      snapshots.set(kind, { pos, state });
      if (typeof ad.assertState === 'function') ad.assertState(state, info);
    } else if (pol && typeof pol.reduce === 'function') {
      const state = pol.reduce(info.missed, info);
      snapshots.set(kind, { pos, state: state === undefined ? snap.state : state });
    }
    busyMs += clock.now() - t;
    for (const cb of policyCbs) cb({ policy: 'reduce', kind, pos, count: info.count, reason, nowUs: info.nowUs });
  }

  /** Re-fold and re-assert a reducible kind at `pos` (what seek does). */
  function assertAt(pos, kind) {
    const kinds = kind ? [kind] : [...adapters.keys()];
    for (const k of kinds) {
      const ad = adapters.get(k);
      if (!ad || typeof ad.reduce !== 'function' || typeof ad.assertState !== 'function') continue;
      if (ad.caps && ad.caps.assertOnSeek === false && !kind) continue;
      applyReduce(k, [], pos, clock.now(), kind ? 'assert' : 'seek');
    }
  }

  const unsubState = transport.onState((st) => {
    cancelCommitted();
    if (st.reason === 'seek') { reconcile(st.p0); assertAt(st.p0); }
    if (running && transport.rate > 0) scan(clock.now()); // re-arm immediately, don't wait a tick
  });

  return {
    hostName: host.name,
    /** Add an event {at, kind, id?, payload?}. During playback, an event at or
     *  behind the playhead fires immediately (overdub law, steal #11). */
    schedule({ at, kind = 'default', id, payload }) {
      const ev = { at, kind, id: id ?? `e${seq}`, seq: seq++, payload, status: 'pending', fires: 0, cancel: null };
      events.splice(insertIdx(at, ev.seq), 0, ev);
      if (running && transport.rate > 0 && at <= transport.position()) fire(ev, 'overdub');
      return ev.id;
    },
    /** SEAM 1: register a per-kind adapter. Returns unregister. The library
     *  filters onFire for you and derives the catch-up policy from caps. */
    registerAdapter(kind, adapter) {
      if (!adapter || typeof adapter.actuate !== 'function') throw new Error(`adapter ${kind}: actuate() required`);
      const caps = adapter.caps || {};
      const catchUp = caps.catchUp || 'burst';
      if (catchUp === 'reduce' && typeof adapter.reduce !== 'function')
        throw new Error(`adapter ${kind}: caps.catchUp 'reduce' needs reduce()`);
      adapters.set(kind, adapter);
      policies.set(kind, catchUp);
      return () => {
        if (adapters.get(kind) !== adapter) return;
        adapters.delete(kind); policies.delete(kind); snapshots.delete(kind);
      };
    },
    adapterCaps(kind) {
      if (kind !== undefined) { const a = adapters.get(kind); return a ? a.caps || {} : null; }
      const out = {};
      for (const [k, a] of adapters) out[k] = a.caps || {};
      return out;
    },
    /** Re-fold + re-assert reducible kinds at pos (seek does this for you). */
    assertAt,
    /** reduce(prefix <= pos) for one kind, without asserting — the expected
     *  state a harness compares against (the C2 left-hand side). */
    reduceAt(kind, pos) {
      const ad = adapters.get(kind);
      if (!ad || typeof ad.reduce !== 'function') return null;
      const prefix = prefixEvents(kind, pos).map(publicEv);
      const snap = snapshots.get(kind) || { pos: -Infinity, state: undefined };
      return ad.reduce(prefix.map((e) => e.payload), pos, {
        kind, pos, reason: 'query', count: prefix.length, nowUs: Math.round(clock.now() * 1000),
        missed: [], prefix, since: prefix.filter((e) => e.at > snap.pos), from: { pos: snap.pos, state: snap.state },
      });
    },
    setPolicy(kind, policy) { policies.set(kind, policy); },
    onFire(cb) { fireCbs.add(cb); return () => fireCbs.delete(cb); },
    onPolicy(cb) { policyCbs.add(cb); return () => policyCbs.delete(cb); },
    start() { running = true; lastTickAt = null; host.start(tick, tickMs); },
    stop() { running = false; host.stop(); cancelCommitted(); },
    clear() { cancelCommitted(); events.length = 0; firstLive = 0; snapshots.clear(); },
    /** SEAM 6: non-destructive drift reads. */
    onDrift(cb) { driftCbs.add(cb); return () => driftCbs.delete(cb); },
    peekDrift(fromTotal = 0) {
      const skip = Math.max(0, fromTotal - (driftTotal - driftLog.length));
      return driftLog.slice(skip);
    },
    driftStats() { return { total: driftTotal, retained: driftLog.length, dropped: driftDropped, limit: driftLimit }; },
    /** Drain the drift channel (every fire's {intendedUs, firedUs, deltaMs}).
     *  Destructive by design — the bounded-memory path. Observers should use
     *  onDrift()/peekDrift() so draining does not blind them. */
    drainDrift() { return driftLog.splice(0); },
    stats() {
      const counts = { pending: 0, committed: 0, fired: 0, passed: 0, dropped: 0, reduced: 0 };
      for (const ev of events) counts[ev.status]++;
      return { counts, total: events.length, busyMs: +busyMs.toFixed(2), maxTickGapMs: +maxTickGapMs.toFixed(2) };
    },
    /** For asserts: fires-per-event table and armed-timer count. */
    audit() {
      return {
        armed: events.filter((e) => e.status === 'committed').length,
        fires: events.map((e) => ({ id: e.id, at: e.at, kind: e.kind, status: e.status, fires: e.fires })),
      };
    },
    dispose() { this.stop(); unsubState(); host.terminate && host.terminate(); },
  };
}

// ---------------------------------------------------------------------------
// (d) THE GRAVEYARD ARM — per-event setTimeout fan-out, reproduced faithfully
// for measurement (demo gen-3 / maria): play() arms one setTimeout per event;
// there is NO cancellation path, so pause/seek/rate leave orphan timers and
// clear() empties the model while armed timers keep ringing. DO NOT SHIP.
// ---------------------------------------------------------------------------

export function createFanoutScheduler(transport) {
  const clock = transport.clock;
  const events = [];
  let seq = 0, armed = 0;
  const fireCbs = new Set();
  const driftLog = [];

  function fire(ev) {
    const firedT = clock.now();
    const intended = transport.timeAt(ev.at); // may be null (paused) or stale — that's the corpse
    ev.fires++; ev.status = 'fired';
    driftLog.push({
      id: ev.id, kind: ev.kind, at: ev.at,
      intendedUs: intended === null ? null : Math.round(intended * 1000),
      firedUs: Math.round(firedT * 1000),
      deltaMs: intended === null ? null : +(firedT - intended).toFixed(3),
      origin: 'fanout', tag: ev.payload && ev.payload.tag,
    });
    for (const cb of fireCbs) cb({ id: ev.id, at: ev.at, kind: ev.kind, payload: ev.payload });
  }

  return {
    schedule({ at, kind = 'default', id, payload }) {
      const ev = { at, kind, id: id ?? `f${seq}`, seq: seq++, payload, status: 'pending', fires: 0 };
      events.push(ev);
      return ev.id;
    },
    onFire(cb) { fireCbs.add(cb); return () => fireCbs.delete(cb); },
    /** Arms EVERY future event with its own setTimeout, computed once. */
    play() {
      transport.play();
      const now = clock.now();
      const pos = transport.position(now);
      const rate = transport.rate;
      for (const ev of events) {
        if (ev.at <= pos) continue;
        armed++;
        setTimeout(() => { armed--; fire(ev); }, (ev.at - pos) / rate);
      }
    },
    // The documented failures, verbatim: vector moves, timers don't.
    pause() { transport.pause(); },
    seek(pos) { transport.seek(pos); },
    setRate(r) { transport.setRate(r); },
    clear() { events.length = 0; },      // model emptied; timers keep ringing
    drainDrift() { return driftLog.splice(0); },
    audit() { return { armed, fires: events.map((e) => ({ id: e.id, at: e.at, kind: e.kind, status: e.status, fires: e.fires })) }; },
    armedCount() { return armed; },
  };
}

// ---------------------------------------------------------------------------
// Position observable — the drift channel's second half (steal #6): a ~60 Hz
// {pos, nowUs} stream for visualizers, separate from event callbacks.
// ---------------------------------------------------------------------------

export function observePosition(transport, cb, { hz = 60, useRaf = typeof requestAnimationFrame === 'function' } = {}) {
  let live = true;
  if (useRaf) {
    const loop = () => {
      if (!live) return;
      cb({ pos: transport.position(), nowUs: Math.round(transport.clock.now() * 1000) });
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    return () => { live = false; };
  }
  const iv = setInterval(() => cb({ pos: transport.position(), nowUs: Math.round(transport.clock.now() * 1000) }), 1000 / hz);
  return () => { live = false; clearInterval(iv); };
}

// ---------------------------------------------------------------------------
// createDeck — the batteries-included facade the first client had to write by
// hand (proto/jam/jam-timeline.js). Transport + scheduler + adapter registry +
// position observable + accumulated drift, one object, with the measured
// defaults already applied. This is the whole of what a client needs:
//
//   const deck = createDeck({
//     items: [{at, kind, id, payload}, …],
//     adapters: { midi: {caps, actuate, reduce, assertState} },
//     range: [0, durationMs], onPosition, onDrift,
//   });
//   deck.play(); deck.setRate(0.5); deck.seek(t); deck.pause();
//
// `range` is the seekable window in the position domain (absolute wall ms is
// as legal as 0-based ms — replay-grid uses the former, jam the latter).
// ---------------------------------------------------------------------------

export function createDeck({
  clock,                       // ClockSource — default wall
  items = [],                  // [{at, kind, id?, payload}]
  adapters = {},               // kind -> adapter (SEAM 1)
  range,                       // [min, max] position window; default [0, lastAt + tailMs]
  tailMs = 0,
  tickHost = undefined,        // 'worker' (default) | 'main' | 'raf' | TickHost object
  tickMs = 25, horizonMs = 100, lateGraceMs = 150,
  onPosition, onDrift, driftFlushMs = 100, positionHz = 60,
  autoStart = true,
} = {}) {
  const host = tickHost && typeof tickHost === 'object' ? tickHost : tickHostByKind(tickHost);
  const transport = createTransport({ clock });
  const sched = createScheduler(transport, { tickMs, horizonMs, lateGraceMs, host });
  for (const [kind, ad] of Object.entries(adapters)) sched.registerAdapter(kind, ad);
  for (const it of items) sched.schedule(it);

  const lastAt = items.length ? Math.max(...items.map((i) => i.at)) : 0;
  const span = range && range.length === 2 ? [range[0], range[1]] : [0, lastAt + tailMs];
  const durationMs = span[1] - span[0];

  // SEAM 6 in action: the deck SUBSCRIBES to drift instead of draining it, so
  // a harness can still peek/drain the library's own buffer independently.
  let drift = [], pendingRows = [];
  const offDrift = sched.onDrift((rec) => { drift.push(rec); pendingRows.push(rec); });
  const flush = () => {
    if (!pendingRows.length) return drift.length;
    const rows = pendingRows; pendingRows = [];
    onDrift && onDrift(rows, drift);
    return drift.length;
  };
  const flushIv = driftFlushMs > 0 && onDrift ? setInterval(flush, driftFlushMs) : null;
  const offPos = onPosition
    ? observePosition(transport, (s) => onPosition(s.pos, durationMs, s), { hz: positionHz })
    : () => {};

  if (autoStart) sched.start();   // rate is 0 -> nothing fires until play()

  const clamp = (p) => Math.max(span[0], Math.min(span[1], p));
  return {
    transport, sched, items, adapters, durationMs, range: span, hostName: host.name,
    play(r) { transport.play(r); },
    pause() { transport.pause(); flush(); },
    setRate(r) { transport.setRate(r); },         // SEAM 2: does not start playback
    seek(p) { const q = clamp(p); transport.seek(q); flush(); return q; },
    /** slave the deck to an external clock master (SEAM: media-element master) */
    sync(p, opts) { return transport.sync(clamp(p), opts); },
    position: () => transport.position(),
    rate: () => transport.rate,
    targetRate: () => transport.targetRate,       // SEAM 2: what a paused UI shows
    playing: () => transport.playing,
    schedule(item) { return sched.schedule(item); },
    /** every fire's {intendedUs, firedUs, deltaMs, origin} — the drift channel */
    drift: () => (flush(), drift.slice()),
    fireCount: () => flush(),
    resetDrift() { sched.drainDrift(); drift = []; pendingRows = []; },
    reduceAt: (kind, pos) => sched.reduceAt(kind, pos),
    assertAt: (pos, kind) => sched.assertAt(pos, kind),
    caps: (kind) => sched.adapterCaps(kind),
    audit: () => sched.audit(),
    stats: () => sched.stats(),
    dispose() { if (flushIv) clearInterval(flushIv); offDrift(); offPos(); sched.dispose(); },
  };
}

// ---------------------------------------------------------------------------
// Audio lane — Chris Wilson lookahead over an AudioContext: a coarse tick
// (worker-hosted by preference) commits events inside the horizon as
// sample-accurately start()ed nodes; committed nodes are held for cancel
// (the cancellation path the oscillator-per-event corpse lacked).
// Emits one-sample impulses into `bus` (a GainNode) by default; pass
// makeNode(ctx, audioT, ev) to schedule arbitrary graphs.
// ---------------------------------------------------------------------------

export function createAudioLane(transport, ctx, {
  tickMs = 25,
  horizonMs = 100,
  host = null,          // defaults to workerTickHost in browser
  makeNode = null,
  clickGain = 1.0,
} = {}) {
  const clock = transport.clock; // wall clock; mapped to audio time via anchor
  const bus = ctx.createGain();
  bus.gain.value = 1;
  const events = [];
  let seq = 0, running = false;
  const scheduledLog = [];      // {id, at, intendedAudioT, intendedUs}
  let anchor = null;            // {wall, audio}
  const h = host || workerTickHost();

  // one-sample impulse buffer (threshold detection finds its exact sample)
  const impulse = ctx.createBuffer(1, 2, ctx.sampleRate);
  impulse.getChannelData(0)[0] = clickGain;

  function reanchor() {
    let best = null;
    for (let i = 0; i < 5; i++) {
      const w1 = clock.now();
      const a = ctx.currentTime;
      const w2 = clock.now();
      if (!best || w2 - w1 < best.spread) best = { wall: (w1 + w2) / 2, audio: a, spread: w2 - w1 };
    }
    anchor = best;
  }

  function audioTimeForWall(wallMs) { return anchor.audio + (wallMs - anchor.wall) / 1000; }

  function commit(ev) {
    const wallT = transport.timeAt(ev.at);
    const audioT = audioTimeForWall(wallT);
    if (audioT < ctx.currentTime) { ev.status = 'passed'; return; } // too late to render honestly
    let node;
    if (makeNode) node = makeNode(ctx, audioT, ev);
    else {
      node = ctx.createBufferSource();
      node.buffer = impulse;
      node.connect(bus);
      node.start(audioT);
    }
    ev.status = 'committed'; ev.node = node;
    ev.intendedAudioT = audioT;
    node.onended = () => { if (ev.status === 'committed') ev.status = 'rendered'; ev.node = null; };
    scheduledLog.push({ id: ev.id, at: ev.at, intendedAudioT: audioT, intendedUs: Math.round(wallT * 1000) });
  }

  function cancelCommitted() {
    for (const ev of events) {
      if (ev.status === 'committed' && ev.node) {
        try { ev.node.stop(); ev.node.disconnect(); } catch {}
        ev.node = null; ev.status = 'pending';
      }
    }
  }

  function tick() {
    if (!running || transport.rate <= 0) return;
    reanchor();
    const pos = transport.position();
    const horizonPos = pos + horizonMs * transport.rate;
    for (const ev of events) {
      if (ev.status !== 'pending' || ev.at > horizonPos) continue;
      if (ev.at <= pos) { ev.status = 'passed'; continue; } // audio lane never bursts the past
      commit(ev);
    }
  }

  const unsub = transport.onState((st) => {
    cancelCommitted();
    if (st.reason === 'seek') for (const ev of events) if (ev.at > st.p0 && ev.status === 'passed') ev.status = 'pending';
  });

  return {
    bus,
    schedule({ at, kind = 'click', id, payload }) {
      const ev = { at, kind, id: id ?? `a${seq}`, seq: seq++, payload, status: 'pending', node: null };
      events.push(ev); events.sort((a, b) => a.at - b.at || a.seq - b.seq);
      return ev.id;
    },
    start() { running = true; reanchor(); h.start(tick, tickMs); },
    stop() { running = false; h.stop(); cancelCommitted(); },
    scheduled() { return scheduledLog.slice(); },
    stats() {
      const counts = {};
      for (const ev of events) counts[ev.status] = (counts[ev.status] || 0) + 1;
      return counts;
    },
    anchorInfo: () => anchor,
    dispose() { this.stop(); unsub(); h.terminate && h.terminate(); },
  };
}

// ---------------------------------------------------------------------------
// Virtual runtime — a deterministic ClockSource + TickHost pair for CI. Time
// advances only through advanceTo(); due timers and ticks fire in exact time
// order with the clock set to their due moment. This is what makes the C2
// property test (`reduce(events<=t) === play(0->t)`) runnable in plain node
// with zero wall-clock flake.
// ---------------------------------------------------------------------------

export function createVirtualRuntime(startMs = 0) {
  let t = startMs, seq = 0;
  let tickCb = null, tickMs = 25, ticking = false, nextTick = Infinity;
  const timers = []; // {due, id, fn}

  const clock = { domain: 'virtual', now: () => t };
  const host = {
    name: 'virtual',
    start(cb, ms) { tickCb = cb; tickMs = ms; ticking = true; nextTick = t; },
    stop() { ticking = false; nextTick = Infinity; },
    setTimer(delayMs, fn) {
      const id = ++seq;
      timers.push({ due: t + Math.max(0, delayMs), id, fn });
      return () => { const i = timers.findIndex((x) => x.id === id); if (i >= 0) timers.splice(i, 1); };
    },
  };

  function advanceTo(target) {
    for (;;) {
      let bestTimer = -1;
      for (let i = 0; i < timers.length; i++) {
        if (timers[i].due > target) continue;
        if (bestTimer < 0 || timers[i].due < timers[bestTimer].due ||
            (timers[i].due === timers[bestTimer].due && timers[i].id < timers[bestTimer].id)) bestTimer = i;
      }
      const timerDue = bestTimer >= 0 ? timers[bestTimer].due : Infinity;
      const tickDue = ticking && nextTick <= target ? nextTick : Infinity;
      if (timerDue === Infinity && tickDue === Infinity) break;
      if (timerDue <= tickDue) {
        const timer = timers.splice(bestTimer, 1)[0];
        t = timer.due; timer.fn();
      } else {
        t = tickDue; nextTick = tickDue + tickMs;
        tickCb && tickCb();
      }
    }
    t = target;
  }

  return { clock, host, advanceTo, now: () => t };
}
