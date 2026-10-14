// Transport vector, lookahead scheduler and audio lane; ESM, browser and node, no deps. No timers
// in the vector (position is math over {p0,t0,rate}); tick 25 ms, horizon 100 ms (timeline/lab).
// Adapters, continuous kinds, the evidence firewall (reads and actuation), and `when` brackets.
// why: lessons/timeline-transport.md#header

// A ClockSource is {domain, now()} in float ms. Wall is performance.timeOrigin + performance.now().
// why: lessons/timeline-transport.md#clocks

export function wallClock() {
  return { domain: 'wall', now: () => performance.timeOrigin + performance.now() };
}

// An AudioContext clock: now() is wall-equivalent ms from ctx.currentTime; reanchor() re-samples.
// why: lessons/timeline-transport.md#audio-clock
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

// State is exactly {p0, t0, rate}; rate 0 is paused. setRate(r) never starts playback; play(r?)
// does.
// .rate is the current rate (0 paused), .targetRate what play() resumes at.
// why: lessons/timeline-transport.md#transport

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
    // Slave to an external clock master without seek semantics: nothing re-fires, only committed
    // timers
    // re-arm. Corrections under toleranceMs are ignored. Returns the correction in ms.
    // why: lessons/timeline-transport.md#sync
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

// A TickHost is {start(onTick, tickMs), stop(), setTimer(delayMs, fn) -> cancel}; time only arrives
// through the clock and the host, which is what makes the virtual runtime possible.
// why: lessons/timeline-transport.md#tick-hosts

// Main-thread timers: 6.4 ms p95 in the foreground, clamped to 1 Hz in a hidden tab. Opt-in.
// why: lessons/timeline-transport.md#main-host
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

// rAF host: frame-quantized and dead in a hidden tab; measured, not recommended.
// why: lessons/timeline-transport.md#raf-host
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

// The default is the worker host (8.5 ms p95 hidden, against about 1 s main and 9.2 s rAF);
// main is opt-in for foreground precision. Outside a browser, the main-thread host.
// why: lessons/timeline-transport.md#default-host
export function defaultTickHost() {
  return typeof Worker === 'function' ? workerTickHost() : mainTickHost();
}
export function tickHostByKind(kind) {
  if (kind === 'main') return mainTickHost();
  if (kind === 'raf') return rafTickHost();
  if (kind === 'worker') return workerTickHost();
  return defaultTickHost();
}

// The cursor: the pair straddling pos, O(1) amortised playing forward, O(log n) on a seek.
// `comparisons` counts probes so prop-test can assert it is not O(n).
// why: lessons/timeline-transport.md#cursor

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
    // {i, u, pos, a, b, prev, next, prevs, nexts, aAt, bAt, dtMs} | null; u clamped to [0,1] at the
    // ends.
    // why: lessons/timeline-transport.md#bracket
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

// Evidence policy, canonical {mode, maxTier, label}: 'attested' (tier 0, no interpolation),
// {restored: {maxTier}} (1 interpolation, 2 inpainting, 3 generative) or 'all'. No boolean form.
// why: lessons/timeline-transport.md#evidence

export function normalizeEvidence(p, where = 'evidence') {
  if (p === undefined || p === null) return null;
  if (p === 'attested') return { mode: 'attested', maxTier: 0, label: 'attested' };
  if (p === 'all') return { mode: 'all', maxTier: Infinity, label: 'all' };
  if (typeof p === 'object' && p.restored) {
    const n = Number(p.restored.maxTier);
    if (!Number.isFinite(n) || n < 0)
      throw new Error(`${where}: {restored:{maxTier}} needs a finite tier >= 0, got ${JSON.stringify(p.restored.maxTier)}`);
    return { mode: 'restored', maxTier: n, label: `restored(tier<=${n})` };
  }
  throw new Error(`${where}: unknown policy ${JSON.stringify(p)} — use 'attested' | {restored:{maxTier:n}} | 'all'`);
}

// The position bracket: verbatim, edtf, earliest (the anchor), latest (null = open), innerFrom,
// innerTo (inverted is legal), rule (versioned, or 'hand'/'unknown'), kind (ignorance|vagueness),
// note. No confidence. A fresh frozen copy per call, never interned (sharing asserts simultaneity).
// why: lessons/timeline-transport.md#when

export const WHEN_KINDS = ['ignorance', 'vagueness'];
const RULE_RE = /^[A-Za-z0-9][A-Za-z0-9._/-]*@\d+$/;
const RULE_UNVERSIONED = ['hand', 'unknown'];

export function normalizeWhen(w, where = 'when') {
  if (w === undefined || w === null) return null;
  if (typeof w !== 'object' || Array.isArray(w))
    throw new Error(`${where}: expected an object {verbatim, edtf, earliest, latest, innerFrom, innerTo, rule, kind, note}, got ${JSON.stringify(w)}`);
  const num = (k, req) => {
    const v = w[k];
    if (v === undefined || v === null) {
      if (req) throw new Error(`${where}.${k} is required and must be a finite transport-ms number`);
      return null;
    }
    if (!Number.isFinite(Number(v))) throw new Error(`${where}.${k} must be a finite number (transport ms), got ${JSON.stringify(v)}`);
    return Number(v);
  };
  const earliest = num('earliest', true);
  const latest = num('latest', false);
  if (latest !== null && !(latest > earliest))
    throw new Error(`${where}: the bracket is CLOSED-OPEN, so latest (${latest}) must be > earliest (${earliest}). ` +
      `A zero-width bracket is a crisp position — OMIT \`when\` entirely (absence of \`when\` IS the crisp fast path, §8.1 rule 1), ` +
      `exactly as DarwinCore refuses zero for coordinateUncertaintyInMeters. Use latest:null for an OPEN end.`);
  const innerFrom = num('innerFrom', false), innerTo = num('innerTo', false);
  // CRM's four-date constraints minus P81a <= P81b, which is deliberately absent.
  // why: lessons/timeline-transport.md#crm
  for (const [k, v] of [['innerFrom', innerFrom], ['innerTo', innerTo]]) {
    if (v === null) continue;
    if (v < earliest) throw new Error(`${where}.${k} (${v}) precedes earliest (${earliest}) — CRM requires P82a <= P81a and P82a <= P81b`);
    if (latest !== null && v > latest) throw new Error(`${where}.${k} (${v}) exceeds latest (${latest}) — CRM requires P81a <= P82b and P81b <= P82b`);
  }
  const rule = w.rule;
  if (typeof rule !== 'string' || !rule.length)
    throw new Error(`${where}.rule is REQUIRED: the named, versioned rule that produced this bracket (DarwinCore's georeferenceProtocol). ` +
      `A bracket with no recorded rule is a number nobody can re-audit.`);
  if (!RULE_RE.test(rule) && !RULE_UNVERSIONED.includes(rule))
    throw new Error(`${where}.rule '${rule}' must be VERSIONED as '<name>@<int>' (e.g. 'err-july15-padding@1', 'wikidata-precision@1') ` +
      `so that when the heuristic changes the affected rows are one \`WHERE rule = …\` away. ` +
      `The only unversioned literals are ${RULE_UNVERSIONED.map((r) => `'${r}'`).join(' and ')}.`);
  const kind = w.kind;
  if (!WHEN_KINDS.includes(kind))
    throw new Error(`${where}.kind must be 'ignorance' (a fact of the matter exists and the catalogue lost it — narrowing is a repair) ` +
      `or 'vagueness' (no fact of the matter — narrowing is a falsification), got ${JSON.stringify(kind)}`);
  const str = (k) => (w[k] === undefined || w[k] === null ? null : String(w[k]));
  // A fresh object every call, never interned.
  // why: lessons/timeline-transport.md#fresh
  return Object.freeze({
    verbatim: str('verbatim'), edtf: str('edtf'),
    earliest, latest, innerFrom, innerTo,
    rule, kind, note: str('note'),
  });
}

// Certainty defaults to 'possible' rather than throwing: silence here only widens the net.
// why: lessons/timeline-transport.md#certainty
export function normalizeCertainty(c, where = 'certainty') {
  if (c === undefined || c === null) return { mode: 'possible', label: 'possible', implicit: true };
  if (c === 'possible') return { mode: 'possible', label: 'possible', implicit: false };
  if (c === 'necessary') return { mode: 'necessary', label: 'necessary', implicit: false };
  throw new Error(`${where}: unknown certainty ${JSON.stringify(c)} — use 'possible' (bracket overlaps the range) | 'necessary' (the range contains the row's certain extent)`);
}

// Lookahead loop, committed vs pending, per-kind catch-up, a drift log and the adapter registry:
// registerAdapter(kind, { caps, actuate(payload, rec, when), reduce(payloads, pos, info),
// assertState, interpolate, transport }) -> unregister. caps.catchUp: 'burst' | 'drop' | 'reduce'.
// why: lessons/timeline-transport.md#scheduler

export function createScheduler(transport, {
  tickMs = 25,
  horizonMs = 100,
  lateGraceMs = 150,   // late fires within grace are ordinary jitter, not a catch-up event
  hostKind,            // 'worker' | 'main' | 'raf', an explicit opt-in shorthand; why: lessons/timeline-transport.md#host-kind
  host = tickHostByKind(hostKind),   // SEAM 3: worker by default (lab VERDICT)
  driftLimit = 20000,  // retained drift rows when nobody drains (SEAM 6)
  evidence,            // E3: the deck-level evidence policy, explicitly chosen
} = {}) {
  const clock = transport.clock;
  const events = [];            // sorted by (at, seq); wrappers own status, log stays immutable
  const byKind = new Map();     // kind -> the SAME wrappers, sorted, one lane per kind (C1)
  const cursors = new Map();    // kind -> createCursor over that lane
  const degraded = new Map();   // kind -> {kind, count, reports[]}  (C6)
  const laneProv = new Map();   // kind -> {kind, attested, derived, tier, …}  (E1/E2)
  const lanePos = new Map();    // kind -> {kind, crisp, smeared, byRule, …}   (U1/U4)
  const seriesLanes = new Map();// kind -> Map(seriesKey -> rows[])            (U5)
  const reconstructors = new Map();  // name -> handle  (E's tier-1 seam)
  let derivedTotal = 0, smearedTotal = 0;
  let evPolicy = normalizeEvidence(evidence, 'createDeck({evidence})');  // null = never chosen
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
  // The fire-side firewall: lanes whose actuation the policy refuses. Per lane (lane purity), so
  // the
  // hot path is `gatedKinds.size !== 0`; recomputed only on a lane-tier or policy change.
  // why: lessons/timeline-transport.md#gated-kinds
  let gatedKinds = new Set();
  let gateGen = 0;
  let adapterGen = 0;
  const gateStats = { fires: 0, folds: 0, asserts: 0, silenced: 0, held: 0, reasserted: 0, byKind: new Map() };
  const gateLog = [];           // bounded transition log (policy changes only)
  const gateCbs = new Set();
  // The assert channel, separate from drift: an assert has no event.
  // why: lessons/timeline-transport.md#assert-log
  const assertLog = [];
  let assertTotal = 0, assertDropped = 0;

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
  /** first index of `lane` with at >= pos (window's left boundary) */
  function fromIdx(lane, pos) {
    let lo = 0, hi = lane.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (lane[m].at < pos) lo = m + 1; else hi = m; }
    return lo;
  }
  function provFor(kind) {
    let lp = laneProv.get(kind);
    if (!lp) laneProv.set(kind, lp = { kind, attested: 0, derived: 0, tier: 0, source: null, method: null, confN: 0, confSum: 0, confMin: null, confMax: null });
    return lp;
  }
  // The position ledger: counters only, medians at report time. `maxSpan` bounds how far back a
  // certainty query scans; 0 costs nothing.
  // why: lessons/timeline-transport.md#pos-for
  function posFor(kind) {
    let pp = lanePos.get(kind);
    if (!pp) lanePos.set(kind, pp = { kind, crisp: 0, smeared: 0, maxSpan: 0, maxFinite: 0, open: 0, withInner: 0, ignorance: 0, vagueness: 0, byRule: new Map() });
    return pp;
  }
  function notePosition(kind, w) {
    const pp = posFor(kind);
    if (!w) { pp.crisp++; return pp; }
    pp.smeared++; smearedTotal++;
    const span = w.latest === null ? Infinity : w.latest - w.earliest;
    if (span > pp.maxSpan) pp.maxSpan = span;              // scan bound (may be Infinity)
    if (w.latest === null) pp.open++;
    else if (span > pp.maxFinite) pp.maxFinite = span;     // reported width

    if (w.innerFrom !== null && w.innerTo !== null && w.innerFrom <= w.innerTo) pp.withInner++;
    pp[w.kind]++;
    let r = pp.byRule.get(w.rule);
    if (!r) pp.byRule.set(w.rule, r = { rule: w.rule, n: 0, sum: 0, max: 0, min: Infinity, open: 0, withInner: 0, ignorance: 0, vagueness: 0 });
    r.n++; r[w.kind]++;
    if (w.latest === null) r.open++;
    else { r.sum += span; if (span > r.max) r.max = span; if (span < r.min) r.min = span; }
    if (w.innerFrom !== null && w.innerTo !== null && w.innerFrom <= w.innerTo) r.withInner++;
    return pp;
  }
  /** how far back a certainty query must scan in this lane (0 = the crisp fast
   *  path: a lane with no `when` row is scanned exactly as it was in v0.5). */
  const laneMaxSpan = (kind) => { const pp = lanePos.get(kind); return pp ? pp.maxSpan : 0; };

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

  // Drift is a channel: subscribers and peekDrift() see every row; drainDrift() bounds memory, and
  // the buffer is capped at driftLimit with drops counted.
  // why: lessons/timeline-transport.md#log-drift
  function logDrift(rec) {
    driftLog.push(rec); driftTotal++;
    if (driftLog.length > driftLimit) driftDropped += driftLog.splice(0, driftLog.length - driftLimit).length;
    for (const cb of driftCbs) cb(rec);
  }

  // With caps.audio = {ctx, leadMs?}, actuate gets a `when` in AudioContext seconds:
  // ctx.currentTime - deltaMs/1000, with `earlyMs` headroom. Opt-in per adapter.
  // why: lessons/timeline-transport.md#audio-when
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
    // The first actuation door: committed one-shots and the overdub path arrive here directly.
    // why: lessons/timeline-transport.md#fire-gate
    if (gatedKinds.size !== 0 && gatedKinds.has(ev.kind)) return gateRefuse(ev, origin);
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
    // U2: the fire is MARKED, not suppressed. A consumer that must not act on a
    // bound reads `when` here and on the callback's public event; the row still
    // fires, exactly once, at the bracket's lower bound.
    if (ev.when) { rec.when = ev.when; rec.anchored = true; }
    const ad = adapters.get(ev.kind);
    const when = audioWhen(ad, rec);
    logDrift(rec);
    const t0 = clock.now();
    const pub = publicEv(ev);
    if (ad && typeof ad.actuate === 'function') ad.actuate(ev.payload, rec, when);
    for (const cb of fireCbs) cb(pub, rec);
    busyMs += clock.now() - t0;
  }
  // An attested row has no `provenance` key at all; a crisp row no `when` key. Neither implies the
  // other.
  // why: lessons/timeline-transport.md#public-ev
  const publicEv = (ev) => {
    const o = ev.prov
      ? { id: ev.id, at: ev.at, kind: ev.kind, payload: ev.payload, provenance: ev.prov }
      : { id: ev.id, at: ev.at, kind: ev.kind, payload: ev.payload };
    if (ev.when) o.when = ev.when;
    return o;
  };

  // The one place a row enters the log, so lane purity is enforced here: a lane is attested or
  // derived, never both, which makes the firewall O(1) and a restoration removable by dropping its
  // lane.
  // why: lessons/timeline-transport.md#schedule-event
  function scheduleEvent({ at, kind = 'default', id, payload, provenance, when }) {
    const lp = provFor(kind);
    // `at = when.earliest`, resolved once by the row's named rule: one-sided sound, so `ev.at <=
    // pos` means "possibly occurred by pos". Midpoints, inner bounds and per-kind policies were
    // rejected.
    // why: lessons/timeline-transport.md#firing-rule
    const w = normalizeWhen(when, `schedule({kind:'${kind}'}).when`);
    let atPos = at;
    if (w) {
      atPos = w.earliest;
      const moved = Number.isFinite(at) && at !== w.earliest;
      noteDegraded(kind, {
        wanted: 'a positioned fact', chose: 'anchored', degraded: true,
        reason: moved
          ? `positioned by rule '${w.rule}': at := when.earliest, the bracket's LOWER BOUND — and the supplied at was OVERRIDDEN. The row fires at a bound, not at an attested instant; the true position lies inside the bracket, and the transport's ordering is a "possibly by now", never a "definitely at".`
          : `positioned by rule '${w.rule}': at = when.earliest, the bracket's LOWER BOUND. The row fires at a bound, not at an attested instant; the true position lies inside the bracket, and the transport's ordering is a "possibly by now", never a "definitely at".`,
      });
    }
    at = atPos;
    let prov = null;
    if (provenance) {
      if (lp.attested)
        throw new Error(`lane purity: kind '${kind}' holds ${lp.attested} ATTESTED rows — a reconstructor APPENDS its own lane (§5b) and never writes into the master trace`);
      if (!provenance.source || !(Number(provenance.tier) >= 1))
        throw new Error(`provenance needs {source:'reconstructor-<name>', tier:1|2|3} — got ${JSON.stringify(provenance)}`);
      prov = Object.freeze({
        source: provenance.source,
        method: provenance.method ?? null,
        confidence: provenance.confidence === undefined ? null : provenance.confidence,
        tier: Number(provenance.tier),
        refs: Object.freeze([...(provenance.refs || [])]),
        from: provenance.from ?? null,
      });
    } else if (lp.derived) {
      throw new Error(`lane purity: kind '${kind}' is a DERIVED lane (${lp.source}); an attested row may not be appended to a restoration`);
    }
    const ev = { at, kind, id: id ?? `e${seq}`, seq: seq++, payload, prov, when: w, status: 'pending', fires: 0, cancel: null };
    events.splice(insertIdx(at, ev.seq), 0, ev);
    const lane = laneOf(kind);
    lane.splice(insertInto(lane, at, ev.seq), 0, ev);   // C1: the per-kind lane the cursor rides
    notePosition(kind, w);                              // U4: the position ledger
    // U5: keep any BUILT series sub-lane in sync (built lazily on first read, so
    // a lane whose adapter declares no caps.series never allocates one).
    const sm = seriesLanes.get(kind);
    if (sm) {
      const k = seriesKeyOf(kind, ev);
      let a = sm.get(k);
      if (!a) sm.set(k, a = []);
      a.splice(insertInto(a, at, ev.seq), 0, ev);
    }
    const tierBefore = lp.tier, derivedBefore = lp.derived;
    if (prov) {
      lp.derived++; derivedTotal++;
      lp.tier = Math.max(lp.tier, prov.tier);
      lp.source = prov.source; lp.method = prov.method;
      if (typeof prov.confidence === 'number') {
        lp.confN++; lp.confSum += prov.confidence;
        lp.confMin = lp.confMin === null ? prov.confidence : Math.min(lp.confMin, prov.confidence);
        lp.confMax = lp.confMax === null ? prov.confidence : Math.max(lp.confMax, prov.confidence);
      }
    } else lp.attested++;
    // Recompute the gate only when a lane becomes derived or its tier rises, before the overdub
    // fire.
    // why: lessons/timeline-transport.md#lane-tier
    if (prov && (derivedBefore === 0 || lp.tier !== tierBefore)) recomputeGate('lane-tier');
    if (running && transport.rate > 0 && at <= transport.position()) fire(ev, 'overdub');
    return ev.id;
  }

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
      if (s === 'fired' || s === 'passed' || s === 'dropped' || s === 'reduced' || s === 'gated') firstLive++; else break;
    }
    const gating = gatedKinds.size !== 0;   // G2: hoisted out of the row loop
    for (let i = firstLive; i < events.length; i++) {
      const ev = events[i];
      if (ev.at > horizonPos) break;
      if (ev.status !== 'pending') continue;
      // Refuse at scan so a gated lane never arms a timer.
      // why: lessons/timeline-transport.md#scan-gate
      if (gating && gatedKinds.has(ev.kind)) { gateRefuse(ev, 'scan'); continue; }
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

  // A reducer gets the complete ordered prefix (at <= pos), so assertState(reduce(prefix)) equals
  // the state after playing to t; info.from and info.since allow a forward fold. A continuous kind
  // also gets info.next and info.nexts, since its state at t depends on the successor.
  // why: lessons/timeline-transport.md#prefix
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
    // The second actuation door: a seek's assertState refuses an over-cap derived lane, as reads
    // do.
    // why: lessons/timeline-transport.md#reduce-gate
    if (gatedKinds.size !== 0 && gatedKinds.has(kind) && reason !== 'evidence-ungated')
      return gateRefuseFold(kind, pos, reason);
    const ad = adapters.get(kind), pol = policies.get(kind);
    const snap = snapshots.get(kind) || { pos: -Infinity, state: undefined };
    const prefix = prefixEvents(kind, pos).map(publicEv);
    const since = prefix.filter((e) => e.at > snap.pos);
    // Internal folds obey the deck policy and withhold the successor when restoration is forbidden.
    // why: lessons/timeline-transport.md#soft-evidence
    const ev = softEvidence(kind, 'reduce');
    const restrict = evRestrictsFold(kind, ev);
    const nexts = restrict ? [] : successorEvents(kind, pos, 1 + (((ad && ad.caps) || {}).neighbourhood || 0));
    const info = {
      kind, pos, reason, nowUs: Math.round(now * 1000),
      count: missed ? missed.length : prefix.length,
      missed: missed || [], prefix, since, from: { pos: snap.pos, state: snap.state },
      next: nexts[0] || null, nexts,          // C4
      evidence: ev, attestedOnly: restrict,   // E3
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

  // Per-call {evidence}, else the deck's explicit policy, else throw EVIDENCE_POLICY_REQUIRED,
  // unless
  // policyMatters() proves the answer identical under all three. `caps.tier` >= 1 is the trigger.
  // why: lessons/timeline-transport.md#forced-choice
  const EV_UNSET = { mode: 'all', maxTier: Infinity, label: 'all', implicit: true };
  const laneIsDerived = (k) => { const lp = laneProv.get(k); return !!(lp && lp.derived > 0); };
  const laneTier = (k) => { const lp = laneProv.get(k); return lp ? lp.tier : 0; };
  function adapterTier(kind) {
    const ad = adapters.get(kind), caps = (ad && ad.caps) || {};
    const t = Number(caps.tier);
    return Number.isFinite(t) && t >= 1 && (caps.continuous === true || typeof (ad || {}).interpolate === 'function') ? t : 0;
  }

  /** Can the answer to this read DIFFER between 'attested', restored(n) and
   *  'all'? Only then is the choice forced. */
  function policyMatters(kinds, op) {
    if (kinds === undefined) return derivedTotal > 0;
    const ks = Array.isArray(kinds) ? kinds : [kinds];
    for (const k of ks) {
      if (laneIsDerived(k)) return true;
      if ((op === 'sampleAt' || op === 'reduce') && adapterTier(k) >= 1) return true;
    }
    return false;
  }

  function resolveEvidence(kinds, op, opts) {
    if (opts && opts.evidence !== undefined) return normalizeEvidence(opts.evidence, `${op}({evidence})`);
    if (evPolicy) return evPolicy;
    if (!policyMatters(kinds, op)) return EV_UNSET;
    const e = new Error(
      `evidence policy required: ${op}(${JSON.stringify(kinds)}) can return RESTORED material and this deck has no explicit policy. ` +
      `Pass {evidence: 'attested' | {restored:{maxTier:n}} | 'all'} to this call, or choose once at createDeck({evidence}). ` +
      `(plan-timeline §5b: the API forces the choice — there is no default that silently mixes dreamed data into an archival query.)`);
    e.code = 'EVIDENCE_POLICY_REQUIRED'; e.op = op; e.kind = kinds;
    throw e;
  }

  // Internal folds record an unqualified policy in the ledger instead of throwing in a listener.
  // why: lessons/timeline-transport.md#soft
  function softEvidence(kind, op) {
    if (evPolicy) return evPolicy;
    if (policyMatters(kind, op))
      noteDegraded(kind, { wanted: 'an explicit evidence policy', chose: 'all', degraded: true,
        reason: `${op}('${kind}') folded tier-${adapterTier(kind) || laneTier(kind)} restoration with no policy set — pass evidence to createDeck(); an internal fold reports rather than throws` });
    return EV_UNSET;
  }

  /** A lane whose tier exceeds the cap is EXCLUDED, never quietly down-mixed. */
  function evExcludes(kind, ev, pos, op) {
    if (!laneIsDerived(kind)) return false;
    const t = laneTier(kind);
    if (t <= ev.maxTier) return false;
    const lp = laneProv.get(kind);
    noteDegraded(kind, { wanted: ev.label, chose: 'excluded', degraded: true, pos,
      reason: `lane '${kind}' is tier-${t} restoration from ${lp.source} (${lp.method}); '${ev.label}' allows tier <= ${ev.maxTier}, so the lane is EXCLUDED — a restoration is never down-mixed into a lower tier` });
    return true;
  }

  /** Does this policy forbid the fold from using its successor? (An interpolated
   *  reduce is tier-N restoration exactly as sampleAt is.) */
  function evRestrictsFold(kind, ev) {
    const t = adapterTier(kind);
    return t >= 1 && t > ev.maxTier;
  }

  // The fire-side firewall: is the caller willing for something invented to happen? Unconditional,
  // not an opt-in cap: it bites only after the client chose a policy, and costs one Set check.
  // The adapter decides only what the refusal sounds like (caps.absentState / silence()).
  // why: lessons/timeline-transport.md#fire-firewall
  function gateStatOf(kind) {
    let g = gateStats.byKind.get(kind);
    if (!g) {
      const lp = laneProv.get(kind);
      gateStats.byKind.set(kind, g = { kind, fires: 0, folds: 0, asserts: 0, tier: lp ? lp.tier : 0,
                                       source: lp ? lp.source : null, method: lp ? lp.method : null });
    }
    return g;
  }
  // Memoized per (lane, policy generation): building the sentence per row made refusing 37% dearer
  // than firing (8000 tier-3 rows: 3.7 ms vs 2.7 ms).
  // why: lessons/timeline-transport.md#gate-why
  const gateWhy = (kind, pol) => {
    const g = gateStatOf(kind);
    if (g.whyGen === gateGen && g.why) return g.why;
    const lp = laneProv.get(kind);
    g.whyGen = gateGen;
    return (g.why =
      `lane '${kind}' is tier-${lp ? lp.tier : '?'} restoration from ${lp ? lp.source : '?'} (${lp ? lp.method : '?'}); ` +
      `'${pol.label}' allows tier <= ${pol.maxTier}, so the row is NOT ACTUATED — a restoration is never performed under a policy that excludes it, ` +
      `exactly as window() excludes it from a read. The refusal is on this ledger and in gateAccounting(); it writes no drift row, because drift is ` +
      `the record of what reached a transducer and this did not (§5b / §8.8: the firewall is no longer read-side only).`);
  };
  /** The refused-fire report is likewise ONE object per (lane, policy gen):
   *  noteDegraded folds identical consecutive reports into `n`, so allocating a
   *  fresh record per row bought nothing but garbage. */
  function gateReport(kind, pol) {
    const g = gateStatOf(kind);
    if (g.repGen === gateGen && g.rep) return g.rep;
    g.repGen = gateGen;
    return (g.rep = { wanted: `actuation under '${pol.label}'`, chose: 'not-actuated', degraded: true, reason: gateWhy(kind, pol) });
  }
  // A refused row takes terminal status 'gated' (not fired, dropped or reduced); a backward seek
  // puts it back to 'pending'.
  // why: lessons/timeline-transport.md#gate-refuse
  function gateRefuse(ev, origin) {
    ev.cancel && ev.cancel(); ev.cancel = null;
    ev.status = 'gated';
    const pol = evPolicy || EV_UNSET;
    gateStats.fires++; gateStatOf(ev.kind).fires++;
    const rep = gateReport(ev.kind, pol);
    rep.pos = ev.at;
    noteDegraded(ev.kind, rep);
    if (gateCbs.size) {
      const rec = { gate: 'fire', kind: ev.kind, id: ev.id, at: ev.at, origin, policy: pol.label, tier: laneTier(ev.kind) };
      for (const cb of gateCbs) cb(rec);
    }
  }
  /** G1: the same refusal at actuation's other door. */
  function gateRefuseFold(kind, pos, reason) {
    const pol = evPolicy || EV_UNSET;
    gateStats.folds++; gateStatOf(kind).folds++;
    noteDegraded(kind, {
      wanted: `reduce+assertState under '${pol.label}'`, chose: 'not-asserted', degraded: true, pos,
      reason: `${gateWhy(kind, pol)} This was the ${reason} fold: assertState() is an ACTUATION (it is how a seek puts held state back), so it is refused for the same reason fire() is — otherwise the same lane answers null to reduceAt() and asserts a folded state through the seek path.`,
    });
    if (gateCbs.size) for (const cb of gateCbs) cb({ gate: 'fold', kind, pos, reason, policy: pol.label, tier: laneTier(kind) });
  }

  // Recompute the gated set only on a lane-set or policy change; `transitions` runs the mid-play
  // handlers.
  // why: lessons/timeline-transport.md#recompute-gate
  function recomputeGate(reason, { transitions = false } = {}) {
    const pol = evPolicy || EV_UNSET;
    const next = new Set();
    for (const [k, lp] of laneProv) if (lp.derived > 0 && lp.tier > pol.maxTier) next.add(k);
    const prev = gatedKinds;
    if (next.size === prev.size) {                 // cheap identity check
      let same = true;
      for (const k of next) if (!prev.has(k)) { same = false; break; }
      if (same && !transitions) return gatedKinds;
      if (same) { gatedKinds = next; return gatedKinds; }
    }
    gatedKinds = next; gateGen++;
    if (!transitions) return gatedKinds;
    const pos = transport.position();
    for (const k of next) if (!prev.has(k)) gateTighten(k, pol, pos, reason);
    for (const k of prev) if (!next.has(k)) gateLoosen(k, pol, pos, reason);
    return gatedKinds;
  }

  const noteGate = (rec) => {
    gateLog.push(rec);
    if (gateLog.length > 256) gateLog.shift();
    if (gateCbs.size) for (const cb of gateCbs) cb(rec);
    return rec;
  };

  // Tightened mid-play: the lane goes quiet via caps.absentState 'silence', or holds and says so.
  // why: lessons/timeline-transport.md#gate-tighten
  function gateTighten(kind, pol, pos, reason) {
    // cancel anything this lane already has committed, so the tighten is
    // immediate rather than one tick late (the one-shot would reach fire()'s
    // guard and be refused there, correctly, but a tick later).
    for (const ev of laneOf(kind)) {
      if (ev.status === 'committed') { ev.cancel && ev.cancel(); ev.cancel = null; ev.status = 'gated'; gateStats.fires++; gateStatOf(kind).fires++; }
      else if (ev.status === 'pending' && ev.at > pos) { /* left pending; scan() will refuse it */ }
    }
    const ad = adapters.get(kind), caps = (ad && ad.caps) || {};
    const lp = laneProv.get(kind);
    const base = { gate: 'tighten', kind, pos, policy: pol.label, tier: lp ? lp.tier : 0, source: lp ? lp.source : null, reason };
    if (ad && caps.absentState === 'silence' && typeof ad.silence === 'function') {
      const t = clock.now();
      ad.silence({ kind, pos, reason: 'evidence-gated', policy: pol.label, tier: base.tier, source: base.source });
      busyMs += clock.now() - t;
      gateStats.silenced++;
      return noteGate({ ...base, action: 'silenced' });
    }
    gateStats.held++;
    noteDegraded(kind, {
      wanted: `an evidence-only performance from this instant ('${pol.label}')`, chose: 'gated-but-held', degraded: true, pos,
      reason: `lane '${kind}' (tier ${base.tier}, ${base.source}) stops ACTUATING immediately, but it declares no caps.absentState 'silence'${ad ? " (or implements no silence())" : ' (no adapter registered)'}, so whatever it was already holding KEEPS RINGING under the tightened policy. The gate can refuse the future; it cannot un-play the past. Declare caps.absentState:'silence' + silence(info) to make the toggle audible at the instant it is thrown.`,
    });
    return noteGate({ ...base, action: 'held' });
  }

  // Loosened: rows ahead marked 'gated' go back to 'pending', and the lane is re-asserted at the
  // playhead;
  // a lane without reduce+assertState resumes at its next row, reported.
  // why: lessons/timeline-transport.md#gate-loosen
  function gateLoosen(kind, pol, pos, reason) {
    let rearmed = 0;
    for (const ev of laneOf(kind)) if (ev.status === 'gated' && ev.at > pos) { ev.status = 'pending'; rearmed++; }
    if (rearmed) firstLive = 0;                    // statuses moved; next scan re-advances
    const ad = adapters.get(kind);
    const lp = laneProv.get(kind);
    const base = { gate: 'loosen', kind, pos, policy: pol.label, tier: lp ? lp.tier : 0, source: lp ? lp.source : null, reason, rearmed };
    if (ad && typeof ad.reduce === 'function' && typeof ad.assertState === 'function') {
      applyReduce(kind, [], pos, clock.now(), 'evidence-ungated');
      gateStats.reasserted++;
      return noteGate({ ...base, action: 'reasserted' });
    }
    noteDegraded(kind, {
      wanted: 'catch up on the prefix it was refused', chose: 'resumes-from-next-row', degraded: true, pos,
      reason: `lane '${kind}' is actuable again under '${pol.label}', but it has no reduce()+assertState() pair, so there is nothing to re-assert: it resumes at its next row (${rearmed} row(s) ahead of the playhead re-armed) and everything it was refused stays unheard until a seek replays it. This is the same shape as nested.mjs's caps.loopState 'carry' refusal — a lane the transport cannot re-fold cannot be caught up, and saying so is the whole of the honesty.`,
    });
    return noteGate({ ...base, action: 'resumes' });
  }

  // deck.assertState: push known state without replaying a prefix. Moves the reduce snapshot;
  // writes
  // no drift row (an assert has no event) and does not seek. {verify: true} checks against reduce.
  // why: lessons/timeline-transport.md#assert-state
  function sameValue(a, b) {
    if (a === b) return true;
    if (typeof a === 'number' && typeof b === 'number') return Number.isNaN(a) && Number.isNaN(b);
    if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) if (!sameValue(a[i], b[i])) return false;
      return true;
    }
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    for (const k of ka) { if (!Object.prototype.hasOwnProperty.call(b, k)) return false; if (!sameValue(a[k], b[k])) return false; }
    return true;
  }

  function assertStateInto(kind, state, info = {}) {
    const nowUs = Math.round(clock.now() * 1000);
    const pos = info.pos !== undefined && Number.isFinite(Number(info.pos)) ? Number(info.pos) : transport.position();
    const reason = info.reason || 'assert';
    const snap = snapshots.get(kind) || { pos: -Infinity, state: undefined };
    const out = { kind, pos, reason, wanted: 'assert authoritative state', chose: 'asserted',
                  degraded: false, applied: false, verified: false, agreed: null, expected: undefined,
                  from: { pos: snap.pos, state: snap.state }, nowUs };
    const refuse = (chose, why) => {
      out.chose = chose; out.degraded = true; out.reason = why;
      noteDegraded(kind, { wanted: 'deck.assertState()', chose, degraded: true, pos, reason: why });
      return out;
    };
    const ad = adapters.get(kind);
    if (!ad) return refuse('no-adapter', `deck.assertState('${kind}'): no adapter registered for that kind, so there is nothing to assert INTO. The snapshot is left alone — writing one for a kind nobody actuates would make reduce()'s info.from lie about a boundary that never happened.`);
    if (gatedKinds.size !== 0 && gatedKinds.has(kind)) {
      const pol = evPolicy || EV_UNSET;
      gateStats.asserts++; gateStatOf(kind).asserts++;
      return refuse('gated', `${gateWhy(kind, pol)} deck.assertState() is the third and most direct way into the actuator, so it is refused with the other two — a client that could push a dreamed state in by hand would make the fire-side gate decorative.`);
    }
    if (typeof ad.assertState !== 'function')
      return refuse('no-assertState', `adapter '${kind}' implements no assertState(state, info) — §7.5: an adapter that wants seek (or an external sync, or a loop carry) to mean anything has to implement it. The snapshot is NOT moved, because moving it would make the next forward fold resume from a state nothing ever received.`);
    if (info.verify === true && typeof ad.reduce === 'function') {
      const ev2 = softEvidence(kind, 'assert');
      const restrict = evRestrictsFold(kind, ev2);
      const prefix = prefixEvents(kind, pos).map(publicEv);
      const nexts = restrict ? [] : successorEvents(kind, pos, 1 + (((ad.caps) || {}).neighbourhood || 0));
      const t0 = clock.now();
      out.expected = ad.reduce(prefix.map((e) => e.payload), pos, {
        kind, pos, reason: 'assert-verify', count: prefix.length, nowUs,
        missed: [], prefix, since: prefix.filter((e) => e.at > snap.pos), from: { pos: snap.pos, state: snap.state },
        next: nexts[0] || null, nexts, evidence: ev2, attestedOnly: restrict,
      });
      busyMs += clock.now() - t0;
      out.verified = true;
      out.agreed = sameValue(out.expected, state);
      if (!out.agreed) {
        out.degraded = true; out.chose = 'asserted-over';
        noteDegraded(kind, {
          wanted: 'agreement with reduce(<= pos)', chose: 'asserted-over', degraded: true, pos,
          reason: `deck.assertState('${kind}', …, {verify:true}) at ${pos}: the caller's authoritative state and the deck's own reduce(prefix <= pos) DISAGREE. The caller wins — that is what "authoritative" means, and it is the whole reason the entry point exists (an external clock master or a hardware surface knows things the log does not). But a disagreement is exactly the "silently wrong" shape this library keeps refusing to ship, so it is on the record with both values. If the log is right and the caller is wrong, the assertion has just diverged the deck from its own trace; if the caller is right, the trace is incomplete and should say so.`,
        });
      }
    }
    const full = { ...info, kind, pos, reason, nowUs, asserted: true, source: info.source ?? null,
                   from: { pos: snap.pos, state: snap.state }, count: 0, missed: [], prefix: [], since: [],
                   next: null, nexts: [], replayed: false, verified: out.verified, agreed: out.agreed };
    const t = clock.now();
    ad.assertState(state, full);
    busyMs += clock.now() - t;
    snapshots.set(kind, { pos, state });
    out.applied = true;
    assertTotal++;
    assertLog.push({ kind, pos, reason, nowUs, verified: out.verified, agreed: out.agreed, source: full.source });
    if (assertLog.length > 4096) assertDropped += assertLog.splice(0, assertLog.length - 4096).length;
    return out;
  }

  // Possibly in [a,b]: the bracket overlaps it. Necessarily: [a,b] contains the inner bracket, else
  // the outer one when wholly inside; otherwise undecidable, excluded and reported.
  // why: lessons/timeline-transport.md#cert-accepts
  function certAccepts(ev, from, to, cert, kind) {
    const w = ev.when;
    if (!w) return ev.at >= from && ev.at <= to;            // crisp row = a point
    if (cert.mode === 'possible')
      return w.earliest <= to && (w.latest === null || w.latest > from);
    // 'necessary'
    const hasInner = w.innerFrom !== null && w.innerTo !== null && w.innerFrom <= w.innerTo;
    if (hasInner) return from <= w.innerFrom && w.innerTo <= to;
    if (w.latest !== null && from <= w.earliest && w.latest <= to) return true;
    noteDegraded(kind, {
      wanted: "certainty:'necessary'", chose: 'unanswerable', degraded: true,
      reason: `rows positioned by rule '${w.rule}' carry no inner bracket (CRM P81 not instantiated, which is CORRECT when nothing is known) and their outer bracket is not contained in the query, so "certainly within this window" is UNDECIDABLE from what the row holds — the row is EXCLUDED rather than answered 'no'. Supply when.innerFrom/innerTo to make it answerable: four traditions converged on four points and every renderer surveyed keeps two, which loses this query permanently.`,
    });
    return false;
  }

  // bracket() is the raw pair, sampleAt() the interpolated value, both through the per-kind cursor.
  // why: lessons/timeline-transport.md#continuous-reads
  const payOf = (ev) => (ev ? ev.payload : undefined);

  // caps.series(payload, ev) -> key splits a lane into per-series sub-lanes with their own cursors
  // (a CC lane interleaves controllers); built lazily, nothing paid without the cap.
  // why: lessons/timeline-transport.md#series
  function seriesFn(kind) {
    const ad = adapters.get(kind), f = ad && ad.caps && ad.caps.series;
    return typeof f === 'function' ? f : null;
  }
  function seriesKeyOf(kind, ev) {
    const f = seriesFn(kind);
    if (!f) return null;
    const k = f(ev.payload, ev);
    return k === undefined || k === null ? '' : String(k);
  }
  function seriesMap(kind) {
    let m = seriesLanes.get(kind);
    if (m) return m;
    if (!seriesFn(kind)) return null;
    m = new Map();
    for (const ev of laneOf(kind)) {          // already sorted by (at, seq)
      const k = seriesKeyOf(kind, ev);
      let a = m.get(k);
      if (!a) m.set(k, a = []);
      a.push(ev);
    }
    seriesLanes.set(kind, m);
    return m;
  }
  // The rows for this read and the cursor key; a series lane read without naming one falls back,
  // reported.
  // why: lessons/timeline-transport.md#rows-for
  function rowsFor(kind, opts) {
    const lane = byKind.get(kind);
    const want = opts && opts.series;
    const m = seriesMap(kind);
    if (!m) {
      if (want !== undefined && want !== null)
        noteDegraded(kind, { wanted: `series=${JSON.stringify(want)}`, chose: 'whole-lane', degraded: true,
          reason: `kind '${kind}' declares no caps.series(payload), so it has exactly one series and {series} cannot select within it` });
      return { rows: lane, key: kind, series: null };
    }
    if (want === undefined || want === null) {
      noteDegraded(kind, { wanted: 'a bracket', chose: 'series-ambiguous', degraded: true,
        reason: `kind '${kind}' declares caps.series and holds ${m.size} series [${[...m.keys()].slice(0, 8).join(', ')}${m.size > 8 ? ', …' : ''}] — this read did not name one, so the straddling pair is taken over the MERGED lane and its two samples may belong to DIFFERENT series. Pass {series:'…'} (deck.seriesOf('${kind}') enumerates them).` });
      return { rows: lane, key: kind, series: null };
    }
    const k = String(want);
    const rows = m.get(k);
    if (!rows || !rows.length) {
      noteDegraded(kind, { wanted: `series=${JSON.stringify(want)}`, chose: 'empty', degraded: true,
        reason: `kind '${kind}' holds no rows for series '${k}' — known series are [${[...m.keys()].join(', ')}]` });
      return { rows: [], key: `${kind}\u0000${k}`, series: k };
    }
    return { rows, key: `${kind}\u0000${k}`, series: k };
  }

  function cursorForRows(cacheKey, rows) {
    let cur = cursors.get(cacheKey);
    if (!cur || cur.rows !== rows) cursors.set(cacheKey, cur = createCursor(rows));
    return cur;
  }
  function cursorFor(kind) { return cursorForRows(kind, laneOf(kind)); }

  function bracketAt(kind, pos, opts) {
    const lane = byKind.get(kind);
    if (!lane || !lane.length) return null;
    const ad = adapters.get(kind), caps = (ad && ad.caps) || {};
    const nbr = opts && opts.neighbourhood !== undefined ? opts.neighbourhood : (caps.neighbourhood || 0);
    const sel = rowsFor(kind, opts);
    if (!sel.rows || !sel.rows.length) return null;
    const br = cursorForRows(sel.key, sel.rows).bracket(pos, nbr);
    if (!br) return null;
    bracketCalls++;
    return {
      kind, series: sel.series, pos, i: br.i, u: br.u, aAt: br.aAt, bAt: br.bAt, dtMs: br.dtMs,
      a: payOf(br.a), b: payOf(br.b), prev: payOf(br.prev), next: payOf(br.next),
      prevs: br.prevs.map(payOf), nexts: br.nexts.map(payOf),
      ids: [br.a.id, br.b.id],
    };
  }

  function sampleAt(kind, pos, opts) {
    const ev = resolveEvidence(kind, 'sampleAt', opts);
    if (evExcludes(kind, ev, pos, 'sampleAt')) return null;
    const br = bracketAt(kind, pos, opts);
    if (!br) return null;
    const ad = adapters.get(kind), caps = (ad && ad.caps) || {};
    const can = !!(ad && typeof ad.interpolate === 'function' && caps.continuous !== false && caps.interpolate !== false);
    const tier = adapterTier(kind);
    if (can && tier >= 1 && tier > ev.maxTier) {
      // Interpolating is tier-1 restoration: under a policy forbidding it, the last attested sample
      // plus a report.
      // why: lessons/timeline-transport.md#attested-hold
      const report = { wanted: ev.label, chose: 'attested-hold', degraded: true, pos,
        reason: `interpolation is tier-${tier} restoration (§5b); '${ev.label}' allows tier <= ${ev.maxTier}, so sampleAt returns the last ATTESTED sample (id ${br.ids[0]} at ${br.aAt}) rather than inventing one at ${pos}` };
      noteDegraded(kind, report);
      return { ...br.a, evidence: { policy: ev.label, attested: true, interpolated: false, tier: 0, at: br.aAt, id: br.ids[0], report } };
    }
    if (!can) {
      // A discrete kind between events is a zero-order hold, reported.
      // why: lessons/timeline-transport.md#hold
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
    // Caller opts first, control fields after: payloads must not spread over control fields.
    // why: lessons/timeline-transport.md#ctx-order
    const out = ad.interpolate(br.a, br.b, br.u, {
      ...(opts || {}),
      kind, pos, u: br.u, i: br.i, prev: br.prev, next: br.next,
      prevs: br.prevs, nexts: br.nexts, aAt: br.aAt, bAt: br.bAt, dtMs: br.dtMs,
    });
    busyMs += clock.now() - t;
    return out;
  }

  // Ask and be told: {wanted, chose, degraded, reason}. `want`: interpolate, neighbourhood, rate,
  // or any boolean capability checked against caps.
  // why: lessons/timeline-transport.md#request
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
      } else if (k === 'evidence') {
        // E4: ask the firewall itself. What will this kind actually serve under
        // the policy I intend to use?
        const want = normalizeEvidence(v, "request({evidence})") || EV_UNSET;
        const lt = laneIsDerived(kind) ? laneTier(kind) : 0;
        const at2 = adapterTier(kind);
        if (lt > want.maxTier) {
          chose = 'excluded'; deg = true;
          reason = `lane '${kind}' is tier-${lt} restoration; '${want.label}' allows tier <= ${want.maxTier}`;
        } else if (at2 >= 1 && at2 > want.maxTier) {
          chose = 'attested-hold'; deg = true;
          reason = `kind '${kind}' answers between samples by tier-${at2} restoration; under '${want.label}' it can only hold the last attested sample`;
        } else if (want.maxTier >= 1 && lt === 0 && at2 === 0) {
          chose = 'attested'; deg = true;
          reason = `'${want.label}' asks for restoration, but kind '${kind}' has none to give (no derived lane, and its adapter declares no caps.tier)`;
        } else chose = want.label;
      } else if (k === 'actuate') {
        // Ask the fire-side gate before a performance: will this lane's rows happen?
        // why: lessons/timeline-transport.md#actuate-gate
        const pol = normalizeEvidence(want.evidence, "request({actuate})") || evPolicy || EV_UNSET;
        const lt = laneIsDerived(kind) ? laneTier(kind) : 0;
        if (v === false || v === undefined || v === null) chose = false;
        else if (lt > pol.maxTier) {
          chose = 'gated'; deg = true;
          reason = `lane '${kind}' is tier-${lt} restoration; under '${pol.label}' its rows are NOT ACTUATED — fire(), the seek fold's assertState(), and deck.assertState() all refuse it. This is the fire-side firewall, and it is what makes an evidence-only PERFORMANCE the library's job rather than the adapter's (§8.8).`;
        } else chose = true;
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

  // caps.followsTransport gets adapter.transport() on play, pause and rate; never on seek or sync.
  // why: lessons/timeline-transport.md#follow-transport
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

  // Two-phase seek (caps.slowSync + prepareSeek): the locate happens now, only rolling waits.
  // Non-blocking, fails open on timeout (laggards named), re-armed by a new locate, with a
  // disposition.
  // why: lessons/timeline-transport.md#two-phase
  const LOCATE_DISPOSITIONS = ['MustRoll', 'MustStop', 'RollIfAppropriate'];
  let seekGen = 0, barrier = null;
  const slowSyncClients = () => [...adapters].filter(([, ad]) => ad.caps && ad.caps.slowSync === true);
  const hasSlowSync = () => slowSyncClients().length > 0;

  function requestSeek(pos, opts = {}) {
    const disposition = opts.disposition === undefined ? 'RollIfAppropriate' : opts.disposition;
    if (!LOCATE_DISPOSITIONS.includes(disposition))
      throw new Error(`requestSeek({disposition}): expected one of ${LOCATE_DISPOSITIONS.join(' | ')} (Ardour's LocateTransportDisposition), got ${JSON.stringify(disposition)}`);
    const timeoutMs = opts.timeoutMs === undefined ? 200 : Number(opts.timeoutMs);
    const clients = slowSyncClients();
    const inflight = barrier && barrier.report.phase !== 'done' ? barrier : null;
    const wasRolling = inflight ? inflight.report.rolling : transport.rate !== 0;
    const resumeRate = inflight ? inflight.report.rate : transport.targetRate;
    const gen = ++seekGen;
    if (inflight) {                       // RE-ARMED by a locate mid-roll
      inflight.cancel && inflight.cancel();
      inflight.report.phase = 'done'; inflight.report.superseded = true;
      inflight.resolve(inflight.report);
    }
    const report = {
      gen, pos, disposition, reason: opts.reason || 'seek',
      rolling: wasRolling, rate: resumeRate, timeoutMs,
      clients: clients.map(([k]) => k), ready: [], timedOut: [],
      rolled: false, failedOpen: false, superseded: false, waitedMs: 0, phase: 'locate', why: null,
    };
    const t0 = clock.now();
    let resolve;
    const promise = new Promise((r) => { resolve = r; });
    const self = { report, promise, resolve, cancel: null };
    barrier = self;

    // Phase 1, the locate: unconditional and immediate.
    // why: lessons/timeline-transport.md#phase-1
    if (clients.length && transport.rate !== 0) transport.pause();
    transport.seek(pos);
    const shouldRoll = disposition === 'MustRoll' ? true : disposition === 'MustStop' ? false : wasRolling;

    function finish(why) {
      if (report.phase === 'done') return report;
      report.phase = 'done'; report.why = why;
      report.waitedMs = +(clock.now() - t0).toFixed(3);
      if (disposition === 'MustStop') { if (transport.rate !== 0) transport.pause(); report.rolled = false; }
      else if (shouldRoll) { if (transport.rate === 0) transport.play(resumeRate); report.rolled = true; }
      else report.rolled = transport.rate !== 0;
      resolve(report);
      return report;
    }
    if (!clients.length) return finish('no-slow-sync-clients'), self;

    // Phase 2, the barrier, armed before dispatch so a ready client cannot race the timer.
    // why: lessons/timeline-transport.md#phase-2
    let waiting = clients.length;
    const seen = new Set();
    const ready = (k) => {
      if (gen !== seekGen || report.phase === 'done' || seen.has(k)) return;
      seen.add(k); report.ready.push(k);
      if (--waiting === 0) { self.cancel && self.cancel(); finish('all-ready'); }
    };
    self.cancel = host.setTimer(timeoutMs, () => {
      if (gen !== seekGen || report.phase === 'done') return;
      for (const [k] of clients) {
        if (seen.has(k)) continue;
        report.timedOut.push(k);
        noteDegraded(k, { wanted: 'two-phase seek: ready before the roll', chose: 'fail-open', degraded: true, pos,
          reason: `adapter '${k}' declared caps.slowSync but did not report ready within ${timeoutMs} ms of the locate to ${pos}; the barrier FAILS OPEN — the transport rolls and the laggard catches up. A transport held hostage by one slow client is a worse failure than a client that is briefly behind.` });
      }
      report.failedOpen = report.timedOut.length > 0;
      finish('timeout');
    });
    for (const [k, ad] of clients) {
      if (typeof ad.prepareSeek !== 'function') {
        noteDegraded(k, { wanted: 'caps.slowSync', chose: 'ignored', degraded: true,
          reason: `adapter ${k} declares caps.slowSync but implements no prepareSeek(request, ready) — it is treated as instantly ready` });
        ready(k); continue;
      }
      let r;
      try {
        r = ad.prepareSeek({ ...report, kind: k, ready: () => ready(k) }, () => ready(k));
      } catch (e) {
        noteDegraded(k, { wanted: 'two-phase seek: prepareSeek()', chose: 'fail-open', degraded: true,
          reason: `adapter ${k} threw from prepareSeek(): ${e && e.message}` });
        ready(k); continue;
      }
      if (r === true) ready(k);
      else if (r && typeof r.then === 'function') r.then(() => ready(k), () => ready(k));
    }
    return self;
  }

  const unsubState = transport.onState((st) => {
    cancelCommitted();
    if (st.reason === 'seek') { reconcile(st.p0); assertAt(st.p0); }
    else if (st.reason === 'play' || st.reason === 'pause' || st.reason === 'rate') followTransport(st);
    if (running && transport.rate > 0) scan(clock.now()); // re-arm immediately, don't wait a tick
  });

  return {
    hostName: host.name,
    // Add {at, kind, id?, payload?, provenance?}; at or behind the playhead during playback it
    // fires now.
    // `provenance` marks a derived row, normally from a reconstructor.
    // why: lessons/timeline-transport.md#schedule
    schedule: scheduleEvent,
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
      if (caps.absentState === 'silence' && typeof adapter.silence !== 'function')
        noteDegraded(kind, { wanted: "caps.absentState 'silence'", chose: 'hold', degraded: true,
          reason: `adapter ${kind} declares caps.absentState 'silence' but implements no silence(info) — a quotation parked outside its span will HOLD whatever the cut left ringing` });
      if (caps.slowSync === true && typeof adapter.prepareSeek !== 'function')
        noteDegraded(kind, { wanted: 'caps.slowSync', chose: 'ignored', degraded: true,
          reason: `adapter ${kind} declares caps.slowSync but implements no prepareSeek(request, ready) — the two-phase seek barrier will treat it as instantly ready (U6)` });
      if (caps.series !== undefined && typeof caps.series !== 'function')
        noteDegraded(kind, { wanted: 'caps.series', chose: 'ignored', degraded: true,
          reason: `adapter ${kind} declares caps.series but it is not a function (payload, ev) => key — bracketing stays grouped by KIND, which is what silently interpolates between two different series (U5)` });
      // U5: a lane whose rows were scheduled BEFORE the adapter arrives has to
      // forget any sub-lane split it built under the old (or absent) caps.
      seriesLanes.delete(kind);
      // An adapter that interpolates with no declared tier is recorded, never assigned one.
      // why: lessons/timeline-transport.md#no-tier
      if (caps.continuous === true && typeof adapter.interpolate === 'function' && caps.tier === undefined)
        noteDegraded(kind, { wanted: 'an evidence classification', chose: 'unqualified', degraded: true,
          reason: `adapter ${kind} interpolates between samples but declares no caps.tier — its between-sample values are unqualified restoration and the evidence firewall cannot gate them (§5b: declare caps.tier 1|2|3)` });
      adapters.set(kind, adapter);
      policies.set(kind, catchUp);
      adapterGen++;
      return () => {
        if (adapters.get(kind) !== adapter) return;
        adapters.delete(kind); policies.delete(kind); snapshots.delete(kind); seriesLanes.delete(kind);
        adapterGen++;
      };
    },
    // Two-phase seek entry: returns {report, promise}; the locate has already happened.
    // why: lessons/timeline-transport.md#request-seek
    requestSeek,
    /** U6: the barrier in flight (or the last one). */
    seekBarrier() { return barrier ? { ...barrier.report, promise: barrier.promise } : null; },
    hasSlowSync,
    // Bumps on every registry change, since a nest registers on its parent after construction.
    // why: lessons/timeline-transport.md#adapter-gen
    adapterGen() { return adapterGen; },
    adapterCaps(kind) {
      if (kind !== undefined) { const a = adapters.get(kind); return a ? a.caps || {} : null; }
      const out = {};
      for (const [k, a] of adapters) out[k] = a.caps || {};
      return out;
    },
    // Read access to the whole registry, including later registrations.
    // why: lessons/timeline-transport.md#adapter
    adapter(kind) { return adapters.get(kind) || null; },
    // caps.absentState fan-out: 'silence' adapters go quiet, the default holds, a missing silence()
    // is reported. `info.kind` narrows. -> {kinds, silenced, held, missing}
    // why: lessons/timeline-transport.md#silence
    silence(info = {}) {
      const kinds = info.kind !== undefined
        ? (Array.isArray(info.kind) ? info.kind : [info.kind])
        : [...adapters.keys()];
      const out = { kinds, silenced: [], held: [], missing: [] };
      for (const k of kinds) {
        const ad = adapters.get(k);
        const caps = (ad && ad.caps) || {};
        if (!ad) { out.missing.push(k); continue; }
        if (caps.absentState !== 'silence') { out.held.push(k); continue; }
        if (typeof ad.silence !== 'function') {
          out.missing.push(k);
          noteDegraded(k, { wanted: "caps.absentState 'silence'", chose: 'hold', degraded: true,
            reason: `adapter ${k} declares caps.absentState 'silence' but implements no silence(info) — the lane HOLDS whatever the cut left ringing, which is the very thing the cap was declared to prevent` });
          continue;
        }
        const t = clock.now();
        ad.silence({ ...info, kind: k });
        busyMs += clock.now() - t;
        out.silenced.push(k);
      }
      return out;
    },
    /** Re-fold + re-assert reducible kinds at pos (seek does this for you). */
    assertAt,
    // Push authoritative state in without a prefix. info: {pos?, reason?, source?, verify?}.
    // why: lessons/timeline-transport.md#assert-into
    assertState: assertStateInto,
    /** G5: the assert channel (deliberately NOT the drift channel). */
    asserts(fromTotal = 0) {
      const skip = Math.max(0, fromTotal - (assertTotal - assertLog.length));
      return { total: assertTotal, retained: assertLog.length, dropped: assertDropped, rows: assertLog.slice(skip) };
    },
    // The reduce boundary {pos, state}, moved by assertState and read back as info.from.
    // why: lessons/timeline-transport.md#snapshot
    snapshotOf(kind) { const s = snapshots.get(kind); return s ? { pos: s.pos, state: s.state } : null; },
    // How much of what was about to happen was refused: evidenceAccounting's twin.
    // why: lessons/timeline-transport.md#gate-accounting
    gateAccounting(kind) {
      const pol = evPolicy || EV_UNSET;
      const ks = kind === undefined ? [...gateStats.byKind.keys()] : (Array.isArray(kind) ? kind : [kind]);
      const lanes = [];
      let fires = 0, folds = 0, asserts = 0;
      for (const k of ks) {
        const g = gateStats.byKind.get(k);
        if (!g) continue;
        fires += g.fires; folds += g.folds; asserts += g.asserts;
        lanes.push({ ...g, gated: gatedKinds.has(k) });
      }
      return {
        policy: pol.label, implicit: !evPolicy, gen: gateGen,
        gated: [...gatedKinds], gatedLanes: gatedKinds.size,
        refusedFires: fires, refusedFolds: folds, refusedAsserts: asserts,
        silenced: gateStats.silenced, held: gateStats.held, reasserted: gateStats.reasserted,
        lanes, transitions: gateLog.slice(),
      };
    },
    /** G3: the refusal as a live channel, for a UI that must SHOW the gate
     *  rather than discover it in a ledger afterwards. */
    onGate(cb) { gateCbs.add(cb); return () => gateCbs.delete(cb); },
    /** G1: is this lane's actuation currently refused? */
    isGated(kind) { return gatedKinds.has(kind); },
    // reduce(prefix <= pos) without asserting; the successor is withheld when restoration is
    // forbidden.
    // why: lessons/timeline-transport.md#reduce-at
    reduceAt(kind, pos, opts) {
      const ad = adapters.get(kind);
      if (!ad || typeof ad.reduce !== 'function') return null;
      const ev = resolveEvidence(kind, 'reduce', opts);
      if (evExcludes(kind, ev, pos, 'reduce')) return null;
      const restrict = evRestrictsFold(kind, ev);
      if (restrict) noteDegraded(kind, { wanted: ev.label, chose: 'attested-fold', degraded: true, pos,
        reason: `reduce('${kind}') under '${ev.label}' withholds info.next — the fold may use only the ATTESTED prefix, so an interpolating reducer degrades to its own hold` });
      const prefix = prefixEvents(kind, pos).map(publicEv);
      const snap = snapshots.get(kind) || { pos: -Infinity, state: undefined };
      const nexts = restrict ? [] : successorEvents(kind, pos, 1 + ((ad.caps || {}).neighbourhood || 0));
      return ad.reduce(prefix.map((e) => e.payload), pos, {
        kind, pos, reason: 'query', count: prefix.length, nowUs: Math.round(clock.now() * 1000),
        missed: [], prefix, since: prefix.filter((e) => e.at > snap.pos), from: { pos: snap.pos, state: snap.state },
        next: nexts[0] || null, nexts,          // C4
        evidence: ev, attestedOnly: restrict,   // E3
      });
    },
    // Ordered rows in [from, to] for a kind, kinds or all, filtered by evidence (lane tier) and,
    // independently, certainty (row.when): 'possible' overlaps, 'necessary' contains. A crisp row
    // is a point.
    // why: lessons/timeline-transport.md#window
    window(kind, from = -Infinity, to = Infinity, opts) {
      const ev = resolveEvidence(kind, 'window', opts);
      const cert = normalizeCertainty(opts && opts.certainty, 'window({certainty})');
      const kinds = kind === undefined ? [...byKind.keys()] : (Array.isArray(kind) ? kind : [kind]);
      const picked = [];
      for (const k of kinds) {
        if (evExcludes(k, ev, undefined, 'window')) continue;
        const lane = byKind.get(k);
        if (!lane) continue;
        // Scan from one maxSpan before `from`, since a bracket may start earlier; 0 for crisp
        // lanes.
        // why: lessons/timeline-transport.md#interval-index
        const span = laneMaxSpan(k);
        const start = span > 0 ? (span === Infinity ? 0 : fromIdx(lane, from - span)) : fromIdx(lane, from);
        const plain = span === 0 && cert.mode === 'possible';
        for (let i = start; i < lane.length && lane[i].at <= to; i++) {
          if (plain || certAccepts(lane[i], from, to, cert, k)) picked.push(lane[i]);
        }
      }
      if (kinds.length > 1) picked.sort((a, b) => a.at - b.at || a.seq - b.seq);
      return picked.map(publicEv);
    },
    // The position axis by rule (e.g. "43% by err-july15-padding@1"). Never multiplied with
    // evidence.
    // why: lessons/timeline-transport.md#position-accounting
    positionAccounting(kind) {
      const kinds = kind === undefined ? [...lanePos.keys()] : (Array.isArray(kind) ? kind : [kind]);
      const out = { crisp: 0, smeared: 0, total: 0, smearedFraction: 0, openEnded: 0, withInner: 0,
                    byRule: {}, byWhenKind: { ignorance: 0, vagueness: 0 },
                    medianSpanMs: null, maxSpanMs: 0, lanes: [] };
      const allSpans = [], spansByRule = new Map();
      for (const k of kinds) {
        const pp = lanePos.get(k);
        if (!pp) continue;
        out.crisp += pp.crisp; out.smeared += pp.smeared;
        out.openEnded += pp.open; out.withInner += pp.withInner;
        out.byWhenKind.ignorance += pp.ignorance; out.byWhenKind.vagueness += pp.vagueness;
        if (pp.maxFinite > out.maxSpanMs) out.maxSpanMs = pp.maxFinite;
        for (const [rule, r] of pp.byRule) {
          let acc = out.byRule[rule];
          if (!acc) acc = out.byRule[rule] = { rule, n: 0, fraction: 0, meanSpanMs: null, medianSpanMs: null,
                                               maxSpanMs: 0, minSpanMs: null, open: 0, withInner: 0,
                                               kinds: { ignorance: 0, vagueness: 0 }, lanes: [] };
          acc.n += r.n; acc.open += r.open; acc.withInner += r.withInner;
          acc.kinds.ignorance += r.ignorance; acc.kinds.vagueness += r.vagueness;
          if (r.max > acc.maxSpanMs) acc.maxSpanMs = r.max;
          if (r.min !== Infinity && (acc.minSpanMs === null || r.min < acc.minSpanMs)) acc.minSpanMs = r.min;
          if (!acc.lanes.includes(k)) acc.lanes.push(k);
          if (!spansByRule.has(rule)) spansByRule.set(rule, []);
        }
        // medians need the rows; this is a REPORTING call, so scan them here
        // rather than carry a parallel span array through every schedule().
        for (const evr of byKind.get(k) || []) {
          const w = evr.when;
          if (!w || w.latest === null) continue;
          const s = w.latest - w.earliest;
          allSpans.push(s);
          spansByRule.get(w.rule).push(s);
        }
        out.lanes.push({ kind: k, crisp: pp.crisp, smeared: pp.smeared, total: pp.crisp + pp.smeared,
                         smearedFraction: (pp.crisp + pp.smeared) ? pp.smeared / (pp.crisp + pp.smeared) : 0,
                         maxSpanMs: pp.maxFinite, openEnded: pp.open, withInner: pp.withInner,
                         rules: [...pp.byRule.keys()] });
      }
      const median = (xs) => { if (!xs.length) return null; const s = xs.slice().sort((a, b) => a - b); return s[s.length >> 1]; };
      out.total = out.crisp + out.smeared;
      out.smearedFraction = out.total ? out.smeared / out.total : 0;
      out.medianSpanMs = median(allSpans);
      for (const [rule, acc] of Object.entries(out.byRule)) {
        acc.fraction = out.total ? acc.n / out.total : 0;
        const xs = spansByRule.get(rule) || [];
        acc.medianSpanMs = median(xs);
        acc.meanSpanMs = xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
      }
      return out;
    },
    // The series keys a lane holds, or null with no caps.series.
    // why: lessons/timeline-transport.md#series-of
    seriesOf(kind) { const m = seriesMap(kind); return m ? [...m.keys()] : null; },
    /** C2: the raw straddling pair at pos, plus its neighbourhood.
     *  -> {prev, a, b, next, u, prevs, nexts, i, aAt, bAt, dtMs, ids} (payloads). */
    bracket(kind, pos, opts) {
      const ev = resolveEvidence(kind, 'bracket', opts);
      if (evExcludes(kind, ev, pos, 'bracket')) return null;
      return bracketAt(kind, pos, opts);
    },
    // The interpolated value at any position; under 'attested', the last attested sample and a
    // report.
    // why: lessons/timeline-transport.md#sample-at
    sampleAt,
    // The deck's evidence policy, or null if the client never chose.
    // why: lessons/timeline-transport.md#evidence-policy
    evidence() { return evPolicy ? { ...evPolicy } : null; },
    /** G4: a policy change is a STATE CHANGE, not a filter. Lanes that become
     *  gated are asked to go quiet; lanes that become ungated are re-asserted
     *  at the playhead. Both transitions are on gateAccounting()'s log. */
    setEvidence(p) {
      evPolicy = normalizeEvidence(p, 'setEvidence');
      recomputeGate('setEvidence', { transitions: true });
      return evPolicy && { ...evPolicy };
    },
    /** E1: the provenance rollup for a lane (or every lane). */
    provenanceOf(kind) {
      const one = (lp) => ({
        kind: lp.kind, attested: lp.attested, restored: lp.derived, total: lp.attested + lp.derived,
        tier: lp.derived ? lp.tier : 0, source: lp.source, method: lp.method,
        confidence: lp.confN ? { mean: +(lp.confSum / lp.confN).toFixed(4), min: lp.confMin, max: lp.confMax } : null,
      });
      if (kind !== undefined) { const lp = laneProv.get(kind); return lp ? one(lp) : null; }
      return [...laneProv.values()].map(one);
    },
    // How much of what you are about to look at was invented, per kind, kinds or deck.
    // why: lessons/timeline-transport.md#evidence-accounting
    evidenceAccounting(kind) {
      const kinds = kind === undefined ? [...laneProv.keys()] : (Array.isArray(kind) ? kind : [kind]);
      const out = { attested: 0, restored: 0, total: 0, inventedFraction: 0, byTier: {}, lanes: [] };
      for (const k of kinds) {
        const lp = laneProv.get(k);
        if (!lp) continue;
        out.attested += lp.attested; out.restored += lp.derived;
        if (lp.derived) out.byTier[lp.tier] = (out.byTier[lp.tier] || 0) + lp.derived;
        out.lanes.push(this.provenanceOf(k));
      }
      out.total = out.attested + out.restored;
      out.inventedFraction = out.total ? out.restored / out.total : 0;
      return out;
    },
    // registerReconstructor(name, { from, into, tier, method, plan, derive }) -> { run(), drop() }.
    // It reads an evidence lane and appends a derived lane; drop() leaves the master untouched.
    // Only tier 1 is implemented (the interpolator); tiers 2 and 3 must bring their own derive().
    // why: lessons/timeline-transport.md#reconstructor
    registerReconstructor(name, spec = {}) {
      if (!name || reconstructors.has(name)) throw new Error(`reconstructor '${name}': name required and must be unique`);
      const from = spec.from;
      if (!from) throw new Error(`reconstructor '${name}': from (the evidence lane it reads) is required`);
      const into = spec.into || `${from}~${name}`;
      if (into === from)
        throw new Error(`reconstructor '${name}': a reconstructor APPENDS a derived lane — it may never write into its own evidence lane '${from}' (§5b: the master trace is append-only and never rewritten)`);
      const tier = spec.tier === undefined ? 1 : Number(spec.tier);
      if (!(tier >= 1 && tier <= 3)) throw new Error(`reconstructor '${name}': tier must be 1 (interpolation) | 2 (inpainting) | 3 (generative infill)`);
      if (tier > 1 && typeof spec.derive !== 'function')
        throw new Error(`reconstructor '${name}': tier ${tier} must bring its own derive() — the library implements tier 1 only, BY DESIGN. Tiers 2 and 3 are the same SEAM, not the same code (§5b).`);
      if (!evPolicy)
        throw new Error(`reconstructor '${name}': this deck has no explicit evidence policy, and registering a reconstructor is exactly what makes a policy necessary. Set createDeck({evidence}) / deck.setEvidence() first (§5b: the API forces the choice).`);
      const srcAd = adapters.get(from);
      const srcCaps = (srcAd && srcAd.caps) || {};
      const method = spec.method || srcCaps.method || 'linear';
      const maxGap = spec.maxTrustedGapMs || 250;
      const hz = spec.hz || 60;
      const plan = spec.plan || (({ aAt, bAt }) => {
        const step = 1000 / hz, out = [];
        for (let t = aAt + step; t < bAt - 1e-9; t += step) out.push(t);
        return out;
      });
      // The default tier-1 derive is sampleAt with {evidence: 'all'}; every row it emits says so.
      // why: lessons/timeline-transport.md#default-derive
      const derive = spec.derive || ((pos) => sampleAt(from, pos, { ...(spec.opts || {}), evidence: 'all' }));
      const confidence = typeof spec.confidence === 'function' ? spec.confidence
        : spec.confidence !== undefined ? () => spec.confidence
        // tier-1 honesty curve: 1.0 at an attested endpoint, falling toward the
        // middle of the gap and falling faster the wider the gap is.
        : ({ u, dtMs }) => +Math.max(0, 1 - 2 * Math.min(u, 1 - u) * Math.min(1, dtMs / maxGap)).toFixed(4);
      if (!spec.adapter && !adapters.has(into)) {
        const canInterp = typeof (srcAd || {}).interpolate === 'function';
        this.registerAdapter(into, {
          caps: {
            ...srcCaps, tier, method, derived: true, source: `reconstructor-${name}`, from,
            continuous: canInterp ? srcCaps.continuous : false,
            catchUp: 'drop',          // a derived lane is a READ lane; never burst stale invention
            assertOnSeek: false, followsTransport: false,
          },
          actuate: spec.actuate || (() => {}),
          ...(canInterp ? { interpolate: (a, b, u, ctx) => srcAd.interpolate(a, b, u, ctx) } : {}),
        });
      } else if (spec.adapter) this.registerAdapter(into, spec.adapter);

      const handle = {
        name, from, into, tier, method,
        run(opts = {}) {
          if ((byKind.get(into) || []).length) handle.drop();
          const lane = byKind.get(from) || [];
          let emitted = 0, skipped = 0;
          for (let i = 0; i < lane.length - 1; i++) {
            const a = lane[i], b = lane[i + 1];
            const dtMs = b.at - a.at;
            if (!(dtMs > 0)) { skipped++; continue; }
            const ctx0 = { a: a.payload, b: b.payload, aAt: a.at, bAt: b.at, dtMs, i, ...opts };
            for (const pos of plan(ctx0) || []) {
              // INTERIOR ONLY. An endpoint is attested; emitting a derived row
              // on top of one would double-count the evidence and corrupt the
              // invented-fraction the UI displays.
              if (!(pos > a.at && pos < b.at)) { skipped++; continue; }
              const u = (pos - a.at) / dtMs;
              const payload = derive(pos, { ...ctx0, pos, u });
              if (!payload) { skipped++; continue; }
              scheduleEvent({
                at: pos, kind: into, id: `${into}-${emitted}`, payload,
                provenance: { source: `reconstructor-${name}`, method, tier, from,
                  confidence: confidence({ u, dtMs, i, pos }), refs: [a.id, b.id] },
              });
              emitted++;
            }
          }
          return { name, into, tier, method, emitted, skipped, from, evidence: (byKind.get(from) || []).length };
        },
        /** §5b's reversibility, and it is not a metaphor: dropping the lane is
         *  the whole of deleting the restoration. */
        drop() {
          const lane = byKind.get(into) || [];
          const n = lane.length;
          if (!n) return { dropped: 0 };
          for (let i = events.length - 1; i >= 0; i--) {
            if (events[i].kind !== into) continue;
            events[i].cancel && events[i].cancel();
            events.splice(i, 1);
          }
          byKind.delete(into); cursors.delete(into); snapshots.delete(into); laneProv.delete(into);
          const pp = lanePos.get(into);
          if (pp) { smearedTotal -= pp.smeared; lanePos.delete(into); }
          seriesLanes.delete(into);
          derivedTotal -= n;
          firstLive = 0;                       // indices moved; the next scan re-advances
          recomputeGate('reconstructor-drop'); // G2: the lane is gone, so is its gate
          return { dropped: n };
        },
        rows: (opts) => (byKind.get(into) || []).map(publicEv),
        stats: () => ({ name, from, into, tier, method, ...(laneProv.get(into) || { derived: 0 }) }),
      };
      reconstructors.set(name, handle);
      return handle;
    },
    reconstructors(name) {
      if (name !== undefined) return reconstructors.get(name) || null;
      return [...reconstructors.values()].map((r) => r.stats());
    },
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
      laneProv.clear(); derivedTotal = 0;      // E1: the provenance ledger is the log's
      lanePos.clear(); smearedTotal = 0;       // U4: and so is the position ledger
      seriesLanes.clear();                     // U5
      recomputeGate('clear');                  // G2: no lanes, no gate
    },
    /** SEAM 6: non-destructive drift reads. */
    onDrift(cb) { driftCbs.add(cb); return () => driftCbs.delete(cb); },
    peekDrift(fromTotal = 0) {
      const skip = Math.max(0, fromTotal - (driftTotal - driftLog.length));
      return driftLog.slice(skip);
    },
    driftStats() { return { total: driftTotal, retained: driftLog.length, dropped: driftDropped, limit: driftLimit }; },
    // Destructive drain of the drift channel, for bounded memory; observers use onDrift/peekDrift.
    // why: lessons/timeline-transport.md#drain-drift
    drainDrift() { return driftLog.splice(0); },
    stats() {
      const counts = { pending: 0, committed: 0, fired: 0, passed: 0, dropped: 0, reduced: 0, gated: 0 };
      for (const ev of events) counts[ev.status]++;
      // `attested` and `derived` split `total`; crisp and smeared split it again, never one score.
      // why: lessons/timeline-transport.md#counts
      return { counts, total: events.length, attested: events.length - derivedTotal, derived: derivedTotal,
               crisp: events.length - smearedTotal, smeared: smearedTotal,
               busyMs: +busyMs.toFixed(2), maxTickGapMs: +maxTickGapMs.toFixed(2) };
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

// The graveyard arm: one setTimeout per event and no cancel path, reproduced for measurement only.
// Do not ship.
// why: lessons/timeline-transport.md#fanout

export function createFanoutScheduler(transport) {
  const clock = transport.clock;
  const events = [];
  let seq = 0, armed = 0;
  const fireCbs = new Set();
  const driftLog = [];

  function fire(ev) {
    const firedT = clock.now();
    const intended = transport.timeAt(ev.at); // may be null (paused) or stale, which is the point; why: lessons/timeline-transport.md#corpse
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

// The position observable: a ~60 Hz {pos, nowUs} stream, separate from event callbacks.
// why: lessons/timeline-transport.md#observe

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

// createDeck({ items, adapters, range, onPosition, onDrift, ... }): transport, scheduler, registry,
// observable and drift with measured defaults. `range` may be absolute or 0-based; setRange moves
// it.
// why: lessons/timeline-transport.md#create-deck

export function createDeck({
  clock,                       // ClockSource, wall by default; why: lessons/timeline-transport.md#clock
  items = [],                  // [{at, kind, id?, payload}]
  adapters = {},               // kind -> adapter (SEAM 1)
  range,                       // [min, max] position window; default [0, lastAt + tailMs]
  tailMs = 0,
  tickHost = undefined,        // 'worker' (default) | 'main' | 'raf' | TickHost object
  tickMs = 25, horizonMs = 100, lateGraceMs = 150,
  onPosition, onDrift, driftFlushMs = 100, positionHz = 60,
  autoStart = true,
  evidence,                    // E3: 'attested' | {restored:{maxTier:n}} | 'all'
} = {}) {
  const host = tickHost && typeof tickHost === 'object' ? tickHost : tickHostByKind(tickHost);
  const transport = createTransport({ clock });
  const sched = createScheduler(transport, { tickMs, horizonMs, lateGraceMs, host, evidence });
  for (const [kind, ad] of Object.entries(adapters)) sched.registerAdapter(kind, ad);
  for (const it of items) sched.schedule(it);

  // `span` is mutated in place so `deck.range` stays one reference; `lastAt` feeds 'auto'.
  // An item may carry only `when`; its anchor is when.earliest.
  // why: lessons/timeline-transport.md#span
  const anchorOf = (i) => (i && i.when && Number.isFinite(Number(i.when.earliest)) ? Number(i.when.earliest) : i.at);
  let lastAt = items.length ? Math.max(...items.map(anchorOf)) : 0;
  const span = range && range.length === 2 ? [range[0], range[1]] : [0, lastAt + tailMs];
  let durationMs = span[1] - span[0];

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

  // Start at span[0] when position 0 is outside the range (a 1965 deck); clamping would pick
  // span[1]
  // for an all-negative range.
  // why: lessons/timeline-transport.md#start-inside
  if (transport.position() < span[0] || transport.position() > span[1]) {
    transport.seek(span[0]);
  }
  let rangeGen = 0;
  // The loop published on the deck by the transport bar, so a strip can draw it. A view, not a
  // mechanism.
  // why: lessons/timeline-transport.md#loop-view
  let loopView = null;
  return {
    transport, sched, items, adapters, range: span, hostName: host.name,
    /** getter, not a frozen number: setRange() can move it (v0.5). */
    get durationMs() { return durationMs; },
    /** `{a, b, state}` while a bar has a loop on this deck, else null.
     *  `state` is the bar's own three: 'armed' (one mark down, and on a live
     *  deck a window still filling) or 'on'. There is no 'off': off is null. */
    get loopView() { return loopView; },
    setLoopView(v) {
      loopView = v && v.a != null
        ? { a: v.a, b: v.b ?? null, state: v.state || 'armed', filling: !!v.filling }
        : null;
      return loopView;
    },
    // How many times the range has moved, so a positional reader can re-derive.
    // why: lessons/timeline-transport.md#range-gen
    rangeGen: () => rangeGen,
    // setRange([min, max] | 'auto'): `deck.range` keeps its identity, a playhead outside is moved
    // with a
    // real seek, and cursors are untouched. Returns the new range.
    // why: lessons/timeline-transport.md#set-range
    setRange(r) {
      const want = (r === undefined || r === 'auto') ? [span[0], lastAt + tailMs] : r;
      if (!Array.isArray(want) || want.length !== 2 || !Number.isFinite(want[0]) || !Number.isFinite(want[1]))
        throw new Error('setRange needs [min, max] numbers (or "auto")');
      if (!(want[1] > want[0])) throw new Error(`setRange needs max > min (got [${want[0]}, ${want[1]}])`);
      span[0] = want[0]; span[1] = want[1];
      durationMs = span[1] - span[0];
      rangeGen++;
      const p = transport.position(), q = clamp(p);
      if (q !== p) { transport.seek(q); flush(); }     // a real seek: state re-folds
      return span;
    },
    play(r) { transport.play(r); },
    pause() { transport.pause(); flush(); },
    setRate(r) { transport.setRate(r); },         // SEAM 2: does not start playback
    // seek(pos, {disposition, timeoutMs}), or any seek with a slowSync adapter, uses the two-phase
    // barrier.
    // why: lessons/timeline-transport.md#seek
    seek(p, opts) {
      const q = clamp(p);
      if (opts !== undefined || sched.hasSlowSync()) sched.requestSeek(q, opts || {});
      else transport.seek(q);
      flush();
      return q;
    },
    requestSeek: (p, opts) => sched.requestSeek(clamp(p), opts),
    seekBarrier: () => sched.seekBarrier(),
    /** slave the deck to an external clock master (SEAM: media-element master) */
    sync(p, opts) { return transport.sync(clamp(p), opts); },
    position: () => transport.position(),
    rate: () => transport.rate,
    targetRate: () => transport.targetRate,       // SEAM 2: what a paused UI shows
    playing: () => transport.playing,
    schedule(item) {
      const a = anchorOf(item);
      if (Number.isFinite(a) && a > lastAt) lastAt = a;   // feeds setRange('auto')
      return sched.schedule(item);
    },
    lastAt: () => lastAt,
    // every fire's {intendedUs, firedUs, deltaMs, origin}
    // why: lessons/timeline-transport.md#drift
    drift: () => (flush(), drift.slice()),
    fireCount: () => flush(),
    resetDrift() { sched.drainDrift(); drift = []; pendingRows = []; },
    reduceAt: (kind, pos, opts) => sched.reduceAt(kind, pos, opts),
    assertAt: (pos, kind) => sched.assertAt(pos, kind),
    // Push authoritative state in without replaying; no drift row; verification opt-in.
    // why: lessons/timeline-transport.md#deck-assert
    assertState: (kind, state, info) => sched.assertState(kind, state, info),
    asserts: (from) => sched.asserts(from),
    snapshotOf: (kind) => sched.snapshotOf(kind),
    // The fire-side firewall's accounting and its live channel.
    // why: lessons/timeline-transport.md#deck-gate
    gateAccounting: (kind) => sched.gateAccounting(kind),
    onGate: (cb) => sched.onGate(cb),
    isGated: (kind) => sched.isGated(kind),
    // Continuous reads (sampleAt, bracket, request); all take {evidence}.
    // why: lessons/timeline-transport.md#deck-sample
    sampleAt: (kind, pos, opts) => sched.sampleAt(kind, pos, opts),
    bracket: (kind, pos, opts) => sched.bracket(kind, pos, opts),
    window: (kind, from, to, opts) => sched.window(kind, from, to, opts),
    evidence: () => sched.evidence(),
    setEvidence: (p) => sched.setEvidence(p),
    provenanceOf: (kind) => sched.provenanceOf(kind),
    evidenceAccounting: (kind) => sched.evidenceAccounting(kind),
    // The position axis by rule; never multiplied with evidenceAccounting().
    // why: lessons/timeline-transport.md#deck-position
    positionAccounting: (kind) => sched.positionAccounting(kind),
    /** U5: the series keys a lane holds (null if the adapter declares none). */
    seriesOf: (kind) => sched.seriesOf(kind),
    registerReconstructor: (name, spec) => sched.registerReconstructor(name, spec),
    reconstructors: (name) => sched.reconstructors(name),
    request: (kind, want) => sched.request(kind, want),
    degradations: (kind) => sched.degradations(kind),
    eventsOf: (kind) => sched.eventsOf(kind),
    cursorStats: (kind) => sched.cursorStats(kind),
    caps: (kind) => sched.adapterCaps(kind),
    // Bumps on every registry change.
    // why: lessons/timeline-transport.md#deck-adapter-gen
    adapterGen: () => sched.adapterGen(),
    // The registry, including adapters registered after construction.
    // why: lessons/timeline-transport.md#deck-adapter
    adapter: (kind) => sched.adapter(kind),
    /** caps.absentState fan-out: go quiet where an adapter says how, hold where
     *  it does not, and report where the cap was declared but not implemented. */
    silence: (info) => sched.silence(info),
    audit: () => sched.audit(),
    stats: () => sched.stats(),
    dispose() { if (flushIv) clearInterval(flushIv); offDrift(); offPos(); sched.dispose(); },
  };
}

// Audio lane: a lookahead tick commits events in the horizon as start()ed nodes, held for cancel.
// One-sample impulses into `bus` by default; makeNode(ctx, audioT, ev) for any graph.
// why: lessons/timeline-transport.md#audio-lane

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
    // 'rendered' resets on a seek too, or events that sounded on lap one stay silent on lap two
    // (measured: 4 then 0). The other lanes already reset.
    // why: lessons/timeline-transport.md#rendered-reset
    if (st.reason === 'seek') {
      for (const ev of events) {
        if (ev.at > st.p0 && (ev.status === 'passed' || ev.status === 'rendered')) ev.status = 'pending';
      }
    }
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

// MIDI out schedules ahead via send(data, when) in performance.now()'s domain, converted by a delta
// from the transport clock (epoch ms would land notes decades out). Cancel clears the port and
// sends all-notes-off. Unverified on hardware.
// why: lessons/timeline-transport.md#midi-lane
export function createMidiLane(transport, output, {
  tickMs = 25,
  horizonMs = 100,
  host = null,
  channel = 0,
  velocity = 100,
  durationMs = 120,
} = {}) {
  const clock = transport.clock;
  const events = [];
  let seq = 0, running = false;
  const scheduledLog = [];
  const h = host || workerTickHost();
  const ch = channel & 0x0f;
  const NOTE_ON = 0x90 | ch, NOTE_OFF = 0x80 | ch, CC = 0xb0 | ch;

  /** transport clock ms -> the performance.now() domain send() speaks. */
  function toPerf(wallMs) { return performance.now() + (wallMs - clock.now()); }

  function commit(ev) {
    const wallT = transport.timeAt(ev.at);
    if (wallT === null || wallT === undefined || wallT < clock.now()) { ev.status = 'passed'; return; }
    const dur = ev.durMs ?? durationMs;
    const sendAt = toPerf(wallT);
    // on and off go out together, so a clear() between them cannot strand one
    output.send([NOTE_ON, ev.note, ev.vel ?? velocity], sendAt);
    output.send([NOTE_OFF, ev.note, 0], sendAt + dur);
    ev.status = 'committed';
    // BOTH domains are recorded: `intendedUs` to compare against other lanes,
    // `sentAtPerf` to compare against a MIDIMessageEvent.timeStamp coming back
    // off a loopback, which is the only way this lane can be measured at all.
    scheduledLog.push({ id: ev.id, at: ev.at, intendedUs: Math.round(wallT * 1000), sentAtPerf: sendAt });
  }

  function cancelCommitted() {
    let any = false;
    for (const ev of events) if (ev.status === 'committed') { ev.status = 'pending'; any = true; }
    if (!any) return;
    try { output.clear && output.clear(); } catch { /* port went away */ }
    try { output.send([CC, 123, 0]); } catch { /* ditto */ }
  }

  function tick() {
    if (!running || transport.rate <= 0) return;
    const pos = transport.position();
    const horizonPos = pos + horizonMs * transport.rate;
    for (const ev of events) {
      if (ev.status !== 'pending' || ev.at > horizonPos) continue;
      if (ev.at <= pos) { ev.status = 'passed'; continue; }  // never burst the past into a port
      commit(ev);
    }
  }

  const unsub = transport.onState((st) => {
    cancelCommitted();
    if (st.reason === 'seek') for (const ev of events) if (ev.at > st.p0 && ev.status === 'passed') ev.status = 'pending';
  });

  return {
    output,
    schedule({ at, note = 60, vel, durMs, id }) {
      const ev = { at, note, vel, durMs, id: id ?? `m${seq}`, seq: seq++, status: 'pending' };
      events.push(ev); events.sort((a, b) => a.at - b.at || a.seq - b.seq);
      return ev.id;
    },
    start() { running = true; h.start(tick, tickMs); },
    stop() { running = false; h.stop(); cancelCommitted(); },
    scheduled() { return scheduledLog.slice(); },
    stats() {
      const c = {};
      for (const ev of events) c[ev.status] = (c[ev.status] || 0) + 1;
      return c;
    },
    dispose() { this.stop(); unsub(); h.terminate && h.terminate(); },
  };
}

// A deterministic ClockSource and TickHost for CI: time moves only through advanceTo(), so the C2
// property test runs in node without flake.
// why: lessons/timeline-transport.md#virtual

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
