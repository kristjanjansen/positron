// demo/shell/pointer-adapter.mjs: a continuous `pointer` kind adapter with a real
// `interpolate` (time-knotted Catmull-Rom), for `demo/draw/`. Hold errs 24.19 px mean,
// linear 0.679, Catmull-Rom 0.036. FIX-n marks: see the lesson. Plain ESM, browser+node.
// why: lessons/kit-pointer-adapter.md#header

export const PX_PER_STEP = 3;    // arc-length budget: one subdivision per ~3 px of chord
export const MAX_STEPS = 32;
export const MIN_STEPS = 2;

const lerp = (a, b, u) => a + (b - a) * u;

/** Zero-order hold — "the last attested sample". The honest baseline: no
 *  interpolation at all, which is what a discrete-kind adapter would give you. */
export function holdSample(a) {
  return { x: a.x, y: a.y, pressure: a.pressure, at: a.at, method: 'hold', tier: 0 };
}

/** Tier-1a: piecewise linear between two attested samples. Bounded by evidence
 *  on both sides — the cheapest honest reconstruction. */
export function lerpSample(a, b, u) {
  return {
    x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u),
    pressure: lerp(a.pressure ?? 0, b.pressure ?? 0, u),
    at: lerp(a.at, b.at, u), method: 'linear', tier: 1,
  };
}

/** Tier-1b: non-uniform (time-knotted) Catmull-Rom, expressed as a cubic
 *  Hermite with finite-difference tangents over the ACTUAL sample times
 *  (FIX-6). p0/p3 may be null at the ends — reflected phantoms are synthesized
 *  so the terminal segments exist and degrade to the chord slope (FIX-3). */
export function catmullSample(p0, p1, p2, p3, u) {
  const t1 = p1.at, t2 = p2.at;
  const h = t2 - t1;
  if (!(h > 0)) return lerpSample(p1, p2, u);          // duplicate stamps: degrade, don't NaN
  const P0 = p0 && p0.at < t1 ? p0 : { x: 2 * p1.x - p2.x, y: 2 * p1.y - p2.y, at: t1 - h };
  const P3 = p3 && p3.at > t2 ? p3 : { x: 2 * p2.x - p1.x, y: 2 * p2.y - p1.y, at: t2 + h };
  const d1 = t2 - P0.at, d2 = P3.at - t1;
  const m1x = (p2.x - P0.x) / d1, m1y = (p2.y - P0.y) / d1;
  const m2x = (P3.x - p1.x) / d2, m2y = (P3.y - p1.y) / d2;
  const u2 = u * u, u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u;
  const h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
  return {
    x: h00 * p1.x + h10 * h * m1x + h01 * p2.x + h11 * h * m2x,
    y: h00 * p1.y + h10 * h * m1y + h01 * p2.y + h11 * h * m2y,
    pressure: lerp(p1.pressure ?? 0, p2.pressure ?? 0, u),
    at: lerp(t1, t2, u), method: 'catmull-rom', tier: 1,
  };
}

// Bracketing is the library's `deck.bracket` / `deck.sampleAt`; own lanes use `createCursor`.
// why: lessons/kit-pointer-adapter.md#make-bracket

// Reconstruction is a derived lane (`deck.registerReconstructor`); only the pixel plan stays here.
// why: lessons/kit-pointer-adapter.md#make-flattener

/**
 * The positions to invent between two attested samples: one per ~3 px of chord, integer
 * steps (FIX-4), interior only so the evidence is not double-counted.
 * why: lessons/kit-pointer-adapter.md#px-budget-plan
 */
export function pxBudgetPlan({ a, b, aAt, bAt }) {
  const chord = Math.hypot(b.x - a.x, b.y - a.y);
  const steps = Math.max(MIN_STEPS, Math.min(MAX_STEPS, Math.ceil(chord / PX_PER_STEP)));
  const out = [];
  for (let s = 1; s < steps; s++) out.push(aAt + (bAt - aAt) * (s / steps));
  return out;
}

// ---------------------------------------------------------------------------
// The adapter itself.
// ---------------------------------------------------------------------------

/**
 * @param opts.mode   'catmull' | 'linear' | 'hold', the reconstruction the
 *                    adapter uses when the caller does not name one.
 * @param opts.onActuate(sample, rec), the attested fire (sparse).
 * The adapter holds no log; neighbours arrive in `interpolate`'s ctx and `info.next`.
 * why: lessons/kit-pointer-adapter.md#make-pointer-adapter
 */
export function makePointerAdapter({ mode = 'catmull', onActuate = null, source = 'pointer' } = {}) {
  const adapter = {
    mode,
    source,
    fires: 0,
    lastFire: null,
    reduceCalls: 0,
    interpCalls: 0,

    caps: {
      // --- what makes this kind different from the four discrete clients ---
      continuous: true,          // state is defined BETWEEN samples, not only at them
      interpolate: true,         // interpolate(a, b, u) is implemented and meaningful
      interpolators: ['hold', 'linear', 'catmull-rom'],
      neighbourhood: 1,          // v0.4: extra samples EACH SIDE of the bracketing
                                 // pair (0 = two-sample; 1 = one each side, which
                                 // is exactly what a Catmull-Rom needs)
      // --- plan-timeline §5b provenance ---
      tier: 1,                   // reconstruction spectrum: interpolation (bounded by evidence)
      method: 'catmull-rom',
      evidence: 'attested-endpoints',
      deviates: true,            // the RENDERER deviates from the log; the log stays faithful
      // --- transport capability declaration (plan-timeline C3) ---
      // `rate: true` needs its `rates` list: transport-bar builds speed buttons from them.
      // why: lessons/kit-pointer-adapter.md#rates
      seek: true, rate: true,
      rates: [0.25, 0.5, 1, 2],
      seekReduce: 'interpolated', // reduce(prefix <= t) returns the INTERPOLATED position,
                                  // not merely the last sample
      catchUp: 'reduce',          // a pointer never wants a burst of stale moves
      assertOnSeek: true,
      throttleMs: 100,            // the lineage's stored-lane rule
      swallowOriginal: false,
    },

    /** The wall lane fires SPARSE attested samples — the moments the log
     *  actually attests. Everything BETWEEN two fires is now a library read
     *  (`deck.sampleAt`), pulled at whatever cadence the client renders at. */
    actuate(payload, rec) {
      adapter.fires++;
      adapter.lastFire = payload;
      onActuate && onActuate(payload, rec);
    },

    /**
     * interpolate(a, b, u, ctx), ctx = {prev, next, pos, dtMs, prevs, nexts, ...}. A C1
     * spline needs the neighbourhood; with none it degrades to linear and says so in `method`.
     * why: lessons/kit-pointer-adapter.md#interpolate
     */
    interpolate(a, b, u, ctx) {
      adapter.interpCalls++;
      const m = (ctx && ctx.mode) || adapter.mode;
      if (m === 'hold') return holdSample(a);
      if (m === 'linear') return lerpSample(a, b, u);
      const prev = ctx && ctx.prev, next = ctx && ctx.next;
      if (prev === undefined && next === undefined) return lerpSample(a, b, u);
      return catmullSample(prev || null, a, b, next || null, u);
    },

    /**
     * reduce(prefix <= pos) for a continuous kind: interpolates between the samples
     * bracketing t; the right bracket comes from `info.next`, never from the prefix.
     * why: lessons/kit-pointer-adapter.md#reduce
     */
    reduce(payloads, pos, info) {
      adapter.reduceCalls++;
      if (!payloads.length) return null;
      const a = payloads[payloads.length - 1];
      const b = info && info.next && info.next.payload;
      if (!b) return holdSample(a);
      const h = b.at - a.at;
      if (!(h > 0)) return holdSample(a);
      const u = Math.min(1, Math.max(0, (pos - a.at) / h));
      return adapter.interpolate(a, b, u, {
        prev: payloads[payloads.length - 2],
        next: info.nexts && info.nexts[1] ? info.nexts[1].payload : undefined,
        pos, dtMs: h,
      });
    },

    /** Idempotent absolute assertion: put the pointer exactly there. */
    assertState(state) {
      if (!state) return;
      adapter.asserted = state;
      onActuate && onActuate(state, { origin: 'assert' });
    },
  };
  return adapter;
}

// ---------------------------------------------------------------------------
// Deviation — "how much did we invent", in pixels. §5b's evidence-vs-restored
// distinction made numeric: for every full-rate EVIDENCE sample, evaluate each
// reconstruction at that sample's own time and measure the euclidean error.
// ---------------------------------------------------------------------------

export function deviations(evidence, lane, deck, kind = 'pointer') {
  const out = {};
  if (lane.length < 2 || !evidence.length) return out;
  const t0 = lane[0].at, t1 = lane[lane.length - 1].at;
  const modes = ['hold', 'linear', 'catmull'];
  for (const m of modes) { out[m] = { n: 0, sum: 0, max: 0, mean: 0, p95: 0 }; }
  const errs = { hold: [], linear: [], catmull: [] };
  for (const e of evidence) {
    if (e.at < t0 || e.at > t1) continue;
    for (const m of modes) {
      // the LIBRARY's read: bracket + neighbourhood + interpolate, one call.
      // The policy is DECLARED here rather than inherited from the deck: this
      // measurement is "how far does the restoration deviate", so it must be
      // taken with restoration switched on whatever the UI is showing.
      const s = deck.sampleAt(kind, e.at, { mode: m, evidence: { restored: { maxTier: 1 } } });
      if (!s) continue;
      const d = Math.hypot(s.x - e.x, s.y - e.y);
      const o = out[m];
      o.n++; o.sum += d; if (d > o.max) o.max = d;
      errs[m].push(d);
    }
  }
  for (const m of modes) {
    const o = out[m];
    o.mean = o.n ? o.sum / o.n : 0;
    const s = errs[m].sort((a, b) => a - b);
    o.p95 = s.length ? s[Math.min(s.length - 1, Math.floor(s.length * 0.95))] : 0;
    delete o.sum;
  }
  return out;
}
