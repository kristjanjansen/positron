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
//
// v0.4 — CONTINUOUS KINDS are first-class. The first four clients were all
// discrete (a note fires, a tile appears, a cue lands); proto/paths brought the
// first kind whose state is defined BETWEEN samples and filed six seams
// (proto/paths/NOTES.md §3). All six are closed here:
//   C1. deck.sampleAt(kind, pos) — the interpolated value at ANY position,
//       O(1) amortised through a per-kind CURSOR (binary search on seek, linear
//       advance on play). Driving an interpolator from reduceAt() at 60 Hz would
//       reproduce demo10's per-frame-recompute-over-an-unbounded-array defect
//       inside the library; this is the read that does not.
//   C2. deck.bracket(kind, pos) -> {prev, a, b, next, u, …} for clients that
//       want the raw pair (and prevs/nexts for higher-order interpolators).
//   C3. interpolate(a, b, u, ctx) with ctx = {prev, next, pos, dtMs, …}. A
//       spline is NOT a function of two samples: the old 2-arg signature
//       silently forced every C1 interpolator to degrade to linear.
//       caps.neighbourhood = k asks for k extra samples EACH SIDE of the pair
//       (0 = two-sample, 1 = one each side = Catmull-Rom, …).
//   C4. info.next / info.nexts in reduce. PREFIX PURITY, SHARPENED: for a
//       DISCRETE kind the reducer is a pure function of the prefix (SEAM 5,
//       unchanged); for a CONTINUOUS kind the state at t is a function of the
//       prefix PLUS THE SUCCESSOR — the sample straddling t on the right, which
//       is by construction absent from the prefix. Without info.next an
//       interpolated reduce is not expressible at all.
//   C5. THE CAPS ARE ACTUALLY READ: continuous, interpolate, interpolators,
//       neighbourhood and followsTransport. An adapter declaring
//       caps.followsTransport gets adapter.transport({reason,playing,rate,…})
//       on play/pause/rate (never on seek — seek is reduce+assertState — and
//       never on sync — a correction must not cascade), which is the onState
//       reason-filter three clients had each rewritten by hand.
//   C6. DEGRADE HONESTLY, out loud: when a client asks for something the
//       adapter's caps refuse, deck.request(kind, want) answers in nested.mjs's
//       shape — {wanted, chose, degraded, reason} — and every implicit
//       degradation is recorded in deck.degradations(kind).
// NOT done, deliberately: the library does NOT own a render tick. Rendering
// cadence belongs to the client; observePosition() already serves anyone who
// wants a 60 Hz pull, and a library-owned rAF would be a second timer inside a
// library whose first law is that the vector has no timers.

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
// THE CURSOR (v0.4, C1). "The pair of samples straddling pos" is the one read a
// continuous kind makes constantly — once per rendered frame, per lane. Done by
// rescanning it is O(n) per frame over an unbounded array: demo10's defect. Done
// by a cursor it is O(1) amortised while playing forward (the index advances by
// ~1 per frame), O(log n) on a seek, and it degrades to a binary search rather
// than a walk on random access. The scheduler runs one of these per continuous
// kind; it is exported because a client's OWN un-logged lanes (ground truth, an
// analysis track) want exactly the same read and should not re-write it.
//
// `comparisons` counts every probe of a row's time — that is what makes
// "this is not O(n)" an assertion in prop-test rather than a claim.
// ---------------------------------------------------------------------------

export function createCursor(rows, { key = (r) => r.at, linearWindow = 4 } = {}) {
  let i = 0, comparisons = 0, searches = 0, advances = 0, hits = 0;
  const at = (k) => { comparisons++; return key(rows[k]); };

  /** largest k in [lo, hi] with at(k) <= pos; assumes at(lo) <= pos < at(hi) */
  function bsearch(pos, lo, hi) {
    while (lo < hi - 1) { const m = (lo + hi) >> 1; if (at(m) <= pos) lo = m; else hi = m; }
    return lo;
  }

  /** index j such that rows[j] is the left member of the bracketing pair.
   *  Two probes on a hit (the frame-after-frame case), one more per step of a
   *  short forward advance (playing), a binary search otherwise (a seek). */
  function locate(pos) {
    const n = rows.length;
    if (n < 2) return 0;
    if (i > n - 2) i = n - 2;
    if (pos >= at(i)) {
      if (pos <= at(i + 1)) { hits++; return i; }
      let j = i, steps = 0;
      while (j < n - 2 && steps++ < linearWindow) { j++; if (pos <= at(j + 1)) { advances++; return (i = j); } }
      if (j >= n - 2) { advances++; return (i = n - 2); }   // at or past the last pair
      searches++;
      return (i = Math.min(n - 2, bsearch(pos, j, n - 1)));
    }
    if (pos <= at(0)) return (i = 0);
    searches++;
    return (i = bsearch(pos, 0, i));
  }

  return {
    rows,
    reset() { i = 0; },
    stats: () => ({ comparisons, searches, advances, hits, i }),
    /** {i, u, pos, a, b, prev, next, prevs, nexts, aAt, bAt, dtMs} | null.
     *  u is clamped to [0,1]: before the first sample and after the last one the
     *  bracket degenerates to the terminal pair (u = 0 / u = 1), so a caller
     *  never has to special-case the ends. */
    bracket(pos, nbr = 0) {
      const n = rows.length;
      if (!n) return null;
      if (n === 1) {
        const t = key(rows[0]);
        return { i: 0, u: 0, pos, a: rows[0], b: rows[0], aAt: t, bAt: t, dtMs: 0,
                 prev: undefined, next: undefined, prevs: [], nexts: [] };
      }
      const j = locate(pos);
      const a = rows[j], b = rows[j + 1];
      const aAt = key(a), bAt = key(b), dt = bAt - aAt;
      const u = dt > 0 ? Math.min(1, Math.max(0, (pos - aAt) / dt)) : (pos >= bAt ? 1 : 0);
      const prevs = [], nexts = [];
      for (let m = 0; m < nbr; m++) {
        if (rows[j - 1 - m]) prevs.push(rows[j - 1 - m]);
        if (rows[j + 2 + m]) nexts.push(rows[j + 2 + m]);
      }
      return { i: j, u, pos, a, b, aAt, bAt, dtMs: dt, prev: prevs[0], next: nexts[0], prevs, nexts };
    },
  };
}

/** nearest rate in LOG space on a declared lattice (the caps.rates read; the
 *  same rule nested.mjs applies to composed rates). null lattice = anything. */
function nearestRate(wanted, allowed) {
  if (!wanted || !allowed || !allowed.length) return { chose: wanted, degraded: false, reason: null };
  if (allowed.some((r) => Math.abs(r - wanted) < 1e-9)) return { chose: wanted, degraded: false, reason: null };
  let best = allowed[0];
  const d = (r) => Math.abs(Math.log(r / wanted));
  for (const r of allowed) if (r > 0 && d(r) < d(best)) best = r;
  return { chose: best, degraded: true, reason: `caps.rates lattice [${allowed}] cannot express ${wanted}` };
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
//       caps,                       // {catchUp, audio, rates, continuous,
//                                   //  interpolate, interpolators, neighbourhood,
//                                   //  followsTransport, …} — declares behaviour
//       actuate(payload, rec, when),// called ONLY for this kind
//       reduce(payloads, pos, info),// catch-up + seek fold (whole prefix, SEAM 5;
//                                   //  + info.next/info.nexts, C4)
//       assertState(state, info),   // idempotent state assertion
//       interpolate(a, b, u, ctx),  // CONTINUOUS kinds only (C1/C3)
//       transport(state),           // caps.followsTransport only (C5)
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
  const byKind = new Map();     // kind -> the SAME wrappers, sorted, one lane per kind (C1)
  const cursors = new Map();    // kind -> createCursor over that lane
  const degraded = new Map();   // kind -> {kind, count, reports[]}  (C6)
  let seq = 0, gen = 0, firstLive = 0, running = false;
  let sampleCalls = 0, bracketCalls = 0;
  const policies = new Map();   // kind -> 'burst' | 'drop' | 'reduce' | {reduce(batch, info)}
  const adapters = new Map();   // kind -> {actuate, caps, reduce, assertState, interpolate, transport}
  const snapshots = new Map();  // kind -> {pos, state}  (SEAM 5: reduce's fromSnapshot)
  const fireCbs = new Set(), policyCbs = new Set(), driftCbs = new Set();
  const driftLog = [];
  let driftTotal = 0, driftDropped = 0;
  let busyMs = 0;               // accumulated scheduler+fire callback self-time
  let lastTickAt = null, maxTickGapMs = 0;

  function insertInto(arr, at, s) {
    let lo = 0, hi = arr.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      const e = arr[mid];
      if (e.at < at || (e.at === at && e.seq < s)) lo = mid + 1; else hi = mid;
    }
    return lo;
  }
  const insertIdx = (at, s) => insertInto(events, at, s);
  function laneOf(kind) {
    let l = byKind.get(kind);
    if (!l) byKind.set(kind, l = []);
    return l;
  }
  /** first index of `lane` with at > pos (the successor boundary) */
  function afterIdx(lane, pos) {
    let lo = 0, hi = lane.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (lane[m].at <= pos) lo = m + 1; else hi = m; }
    return lo;
  }

  /** C6: every honest degradation, recorded rather than swallowed. Consecutive
   *  identical reports are folded (a 60 Hz caller must not grow memory). */
  function noteDegraded(kind, rec) {
    let d = degraded.get(kind);
    if (!d) degraded.set(kind, d = { kind, count: 0, reports: [] });
    d.count++;
    const last = d.reports[d.reports.length - 1];
    if (last && last.wanted === rec.wanted && last.chose === rec.chose && last.reason === rec.reason) {
      last.n++; last.lastPos = rec.pos;
      return d;
    }
    d.reports.push({ ...rec, n: 1 });
    if (d.reports.length > 64) d.reports.shift();
    return d;
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
  //
  // C4 — THE GUARANTEE, SHARPENED. For a DISCRETE kind everything above holds
  // unchanged: the reducer is a pure function of the prefix. For a CONTINUOUS
  // kind it cannot be — the state at t is defined by the samples STRADDLING t,
  // and the right one has at > pos, so it is by construction absent from the
  // prefix. So the contract now reads:
  //     discrete kind    : state(t) = f(prefix(<= t))
  //     continuous kind  : state(t) = f(prefix(<= t), successor(s) of t)
  // and `info.next` (first event of this kind with at > pos) plus `info.nexts`
  // (1 + caps.neighbourhood of them) are supplied on every reduce call. They are
  // a bisect over a lane the scheduler already keeps sorted — the two lines
  // without which an interpolated reduce is inexpressible.
  function prefixEvents(kind, pos) {
    const lane = byKind.get(kind);
    if (!lane || !lane.length) return [];
    return lane.slice(0, afterIdx(lane, pos));
  }
  function successorEvents(kind, pos, k = 1) {
    const lane = byKind.get(kind);
    if (!lane || !lane.length || k <= 0) return [];
    const out = [];
    for (let j = afterIdx(lane, pos); j < lane.length && out.length < k; j++) out.push(publicEv(lane[j]));
    return out;
  }
  function applyReduce(kind, missed, pos, now, reason) {
    const ad = adapters.get(kind), pol = policies.get(kind);
    const snap = snapshots.get(kind) || { pos: -Infinity, state: undefined };
    const prefix = prefixEvents(kind, pos).map(publicEv);
    const since = prefix.filter((e) => e.at > snap.pos);
    const nexts = successorEvents(kind, pos, 1 + (((ad && ad.caps) || {}).neighbourhood || 0));
    const info = {
      kind, pos, reason, nowUs: Math.round(now * 1000),
      count: missed ? missed.length : prefix.length,
      missed: missed || [], prefix, since, from: { pos: snap.pos, state: snap.state },
      next: nexts[0] || null, nexts,          // C4
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

  // -------------------------------------------------------------------------
  // C1/C2/C3 — the CONTINUOUS reads. bracket() is the raw pair (plus its
  // neighbourhood); sampleAt() is the interpolated value, which is what a
  // renderer actually wants. Both go through the per-kind cursor: O(1) amortised
  // playing forward, O(log n) on a seek. Neither is a render tick — the client
  // calls them from whatever cadence it already runs (C-not-done).
  // -------------------------------------------------------------------------
  const payOf = (ev) => (ev ? ev.payload : undefined);

  function cursorFor(kind) {
    const lane = laneOf(kind);
    let cur = cursors.get(kind);
    if (!cur || cur.rows !== lane) cursors.set(kind, cur = createCursor(lane));
    return cur;
  }

  function bracketAt(kind, pos, opts) {
    const lane = byKind.get(kind);
    if (!lane || !lane.length) return null;
    const ad = adapters.get(kind), caps = (ad && ad.caps) || {};
    const nbr = opts && opts.neighbourhood !== undefined ? opts.neighbourhood : (caps.neighbourhood || 0);
    const br = cursorFor(kind).bracket(pos, nbr);
    if (!br) return null;
    bracketCalls++;
    return {
      kind, pos, i: br.i, u: br.u, aAt: br.aAt, bAt: br.bAt, dtMs: br.dtMs,
      a: payOf(br.a), b: payOf(br.b), prev: payOf(br.prev), next: payOf(br.next),
      prevs: br.prevs.map(payOf), nexts: br.nexts.map(payOf),
      ids: [br.a.id, br.b.id],
    };
  }

  function sampleAt(kind, pos, opts) {
    const br = bracketAt(kind, pos, opts);
    if (!br) return null;
    const ad = adapters.get(kind), caps = (ad && ad.caps) || {};
    const can = !!(ad && typeof ad.interpolate === 'function' && caps.continuous !== false && caps.interpolate !== false);
    if (!can) {
      // C6: a discrete kind sampled between two events is a zero-order HOLD —
      // the honest answer, and the degradation is reported, not implied.
      noteDegraded(kind, {
        wanted: 'sampleAt(interpolated)', chose: 'hold', degraded: true, pos,
        reason: !ad ? `no adapter registered for kind ${kind}`
          : typeof ad.interpolate !== 'function' ? `adapter ${kind} implements no interpolate()`
          : `adapter ${kind} caps refuse interpolation (continuous=${caps.continuous}, interpolate=${caps.interpolate})`,
      });
      return br.a === undefined ? null : br.a;
    }
    sampleCalls++;
    const t = clock.now();
    // NOTE the ordering: caller opts spread FIRST, control fields injected
    // AFTER. This is §2's law ("payloads must not spread over control fields")
    // applied to the ctx object — the same law logdeck was breaking.
    const out = ad.interpolate(br.a, br.b, br.u, {
      ...(opts || {}),
      kind, pos, u: br.u, i: br.i, prev: br.prev, next: br.next,
      prevs: br.prevs, nexts: br.nexts, aAt: br.aAt, bAt: br.bAt, dtMs: br.dtMs,
    });
    busyMs += clock.now() - t;
    return out;
  }

  /** C6 — ASK, and be told honestly. Mirrors nested.mjs's rate report shape:
   *  {wanted, chose, degraded, reason}. `want` keys understood specially:
   *  interpolate (true | method name), neighbourhood (number), rate (number,
   *  against caps.rates); anything else is treated as a boolean capability
   *  claim and checked against caps[key]. */
  function request(kind, want = {}) {
    const ad = adapters.get(kind), caps = (ad && ad.caps) || {};
    const per = {};
    let any = false;
    for (const [k, v] of Object.entries(want)) {
      let chose = v, deg = false, reason = null;
      if (!ad) { chose = null; deg = true; reason = `no adapter registered for kind ${kind}`; }
      else if (k === 'interpolate') {
        const can = typeof ad.interpolate === 'function' && caps.interpolate !== false && caps.continuous === true;
        if (v === false || v === undefined || v === null) chose = false;
        else if (!can) {
          chose = 'hold'; deg = true;
          reason = `kind ${kind} is discrete (caps.continuous !== true) — zero-order hold is all it can honestly give`;
        } else if (typeof v === 'string' && Array.isArray(caps.interpolators) && !caps.interpolators.includes(v)) {
          chose = caps.method || caps.interpolators[caps.interpolators.length - 1];
          deg = true; reason = `caps.interpolators [${caps.interpolators}] does not offer '${v}'`;
        } else chose = typeof v === 'string' ? v : (caps.method || true);
      } else if (k === 'neighbourhood') {
        const have = Number(caps.neighbourhood || 0);
        if (v > have) {
          chose = have; deg = true;
          reason = `caps.neighbourhood ${have} < ${v}: a C1 interpolator degrades to what ${have} samples each side can express`;
        }
      } else if (k === 'rate') {
        const r = nearestRate(v, Array.isArray(caps.rates) && caps.rates.length ? caps.rates : null);
        chose = r.chose; deg = r.degraded; reason = r.reason;
      } else if (v === true && caps[k] !== true) {
        chose = caps[k] === undefined ? false : caps[k];
        deg = true; reason = `adapter ${kind} does not declare caps.${k}`;
      }
      per[k] = { wanted: v, chose, degraded: deg, reason };
      if (deg) { any = true; noteDegraded(kind, { wanted: `${k}=${JSON.stringify(v)}`, chose, degraded: true, reason }); }
    }
    const keys = Object.keys(per);
    // one-key asks answer FLAT, in nested.mjs's exact shape
    return keys.length === 1
      ? { kind, degraded: any, ...per[keys[0]], per }
      : { kind, degraded: any, per };
  }

  /** C5 — caps.followsTransport. play/pause/rate are NOT seeks, so nothing
   *  re-asserts on them (correctly: nothing should re-fire) — but a media
   *  element still has to follow. Three clients had each written the same
   *  onState reason-filter by hand; it lives here now. 'seek' is excluded (it
   *  goes through reduce + assertState) and 'sync' is excluded on purpose: a
   *  servo correction must never cascade. */
  function followTransport(st) {
    if (!adapters.size) return;
    const base = {
      reason: st.reason, playing: transport.rate !== 0, rate: transport.rate,
      targetRate: transport.targetRate, pos: transport.position(), clockDomain: st.clockDomain,
    };
    for (const [kind, ad] of adapters) {
      if (!ad.caps || ad.caps.followsTransport !== true) continue;
      if (typeof ad.transport !== 'function') {
        noteDegraded(kind, { wanted: 'followsTransport', chose: 'ignored', degraded: true,
          reason: `adapter ${kind} declares caps.followsTransport but implements no transport(state)` });
        continue;
      }
      const t = clock.now();
      ad.transport({ ...base, kind });
      busyMs += clock.now() - t;
    }
  }

  const unsubState = transport.onState((st) => {
    cancelCommitted();
    if (st.reason === 'seek') { reconcile(st.p0); assertAt(st.p0); }
    else if (st.reason === 'play' || st.reason === 'pause' || st.reason === 'rate') followTransport(st);
    if (running && transport.rate > 0) scan(clock.now()); // re-arm immediately, don't wait a tick
  });

  return {
    hostName: host.name,
    /** Add an event {at, kind, id?, payload?}. During playback, an event at or
     *  behind the playhead fires immediately (overdub law, steal #11). */
    schedule({ at, kind = 'default', id, payload }) {
      const ev = { at, kind, id: id ?? `e${seq}`, seq: seq++, payload, status: 'pending', fires: 0, cancel: null };
      events.splice(insertIdx(at, ev.seq), 0, ev);
      const lane = laneOf(kind);
      lane.splice(insertInto(lane, at, ev.seq), 0, ev);   // C1: the per-kind lane the cursor rides
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
      // C5/C6: the caps are READ at registration, and a claim the adapter cannot
      // back is recorded now rather than discovered at 60 Hz.
      if (caps.continuous === true && typeof adapter.interpolate !== 'function')
        noteDegraded(kind, { wanted: 'caps.continuous', chose: 'hold', degraded: true,
          reason: `adapter ${kind} declares caps.continuous but implements no interpolate()` });
      if (caps.followsTransport === true && typeof adapter.transport !== 'function')
        noteDegraded(kind, { wanted: 'caps.followsTransport', chose: 'ignored', degraded: true,
          reason: `adapter ${kind} declares caps.followsTransport but implements no transport(state)` });
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
      const nexts = successorEvents(kind, pos, 1 + ((ad.caps || {}).neighbourhood || 0));
      return ad.reduce(prefix.map((e) => e.payload), pos, {
        kind, pos, reason: 'query', count: prefix.length, nowUs: Math.round(clock.now() * 1000),
        missed: [], prefix, since: prefix.filter((e) => e.at > snap.pos), from: { pos: snap.pos, state: snap.state },
        next: nexts[0] || null, nexts,          // C4
      });
    },
    /** C2: the raw straddling pair at pos, plus its neighbourhood.
     *  -> {prev, a, b, next, u, prevs, nexts, i, aAt, bAt, dtMs, ids} (payloads). */
    bracket: bracketAt,
    /** C1: the INTERPOLATED value at any position — O(1) amortised. */
    sampleAt,
    /** C6: ask for a capability; get {wanted, chose, degraded, reason}. */
    request,
    /** C6: what this deck has silently had to refuse, per kind. */
    degradations(kind) {
      if (kind !== undefined) return degraded.get(kind) || { kind, count: 0, reports: [] };
      return [...degraded.values()];
    },
    /** the ordered public events of ONE kind (the lane the cursor rides). */
    eventsOf(kind) { return (byKind.get(kind) || []).map(publicEv); },
    /** cursor + continuous-read counters, for harnesses proving O(1) */
    cursorStats(kind) {
      const c = cursors.get(kind);
      return { kind, sampleCalls, bracketCalls, cursor: c ? c.stats() : null };
    },
    setPolicy(kind, policy) { policies.set(kind, policy); },
    onFire(cb) { fireCbs.add(cb); return () => fireCbs.delete(cb); },
    onPolicy(cb) { policyCbs.add(cb); return () => policyCbs.delete(cb); },
    start() { running = true; lastTickAt = null; host.start(tick, tickMs); },
    stop() { running = false; host.stop(); cancelCommitted(); },
    clear() {
      cancelCommitted(); events.length = 0; firstLive = 0; snapshots.clear();
      for (const lane of byKind.values()) lane.length = 0;
      for (const c of cursors.values()) c.reset();
    },
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
    /** v0.4 CONTINUOUS KINDS — the interpolated value at any position (C1), the
     *  raw straddling pair (C2), honest capability negotiation (C6). */
    sampleAt: (kind, pos, opts) => sched.sampleAt(kind, pos, opts),
    bracket: (kind, pos, opts) => sched.bracket(kind, pos, opts),
    request: (kind, want) => sched.request(kind, want),
    degradations: (kind) => sched.degradations(kind),
    eventsOf: (kind) => sched.eventsOf(kind),
    cursorStats: (kind) => sched.cursorStats(kind),
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
