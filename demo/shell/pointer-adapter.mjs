// demo/shell/pointer-adapter.mjs — the FIRST continuous-kind adapter for the
//
// 🔴 PROMOTED FROM proto/paths/, UNCHANGED BELOW THIS HEADER. It was finished
// and measured and had never been given a page: hold 24.19 px mean error
// against linear 0.679 and Catmull-Rom 0.036, and seek accuracy 0.042 px
// interpolated against 38.31 px held — about 900x. `demo/draw/` is the page.
//
// (was: the FIRST continuous-kind adapter for the timeline library — a
// `pointer` kind with a real `interpolate`.)
//
// Ported from ~/personal/time/public/demo10.html (four overlaid paths) and
// ~/personal/demo/pages/{draw,drag}.vue (150 ms throttle + Catmull-Rom), with
// every defect written up in research/timeline-own-prior-art-2026-08.md §6/§2
// deliberately NOT inherited. Each fix is marked FIX-n and cross-referenced in
// NOTES.md:
//
//   FIX-1  capture and decimation NEVER share a buffer (demo10's sampler did
//          `realTimePoints.length = 0` — decimation consumed its own ground
//          truth and invalidated the comparison). Two append-only lanes.
//   FIX-2  wall-clock decimation, not frame-count (`frameCount % 5` breaks on
//          120 Hz displays and throttled tabs).
//   FIX-3  phantom (reflected) endpoints, so the FIRST and LAST segments
//          survive (demo10 looped `i = 1 .. n-3` and silently dropped both).
//   FIX-4  pixel-budget subdivision with INTEGER steps, not `t += 0.2`
//          (fixed subdivision starves long segments, wastes work on short
//          ones, and float accumulation never lands exactly on u = 1).
//   FIX-5  incremental per-segment cache, not a per-frame recompute over an
//          unbounded array.
//   FIX-6  TIME-KNOTTED (non-uniform) Catmull-Rom. demo10's uniform form
//          assumes evenly spaced samples; a wall-clock-throttled pointer lane
//          is never evenly spaced, so uniform knots bend the curve toward
//          whichever sample happened to arrive late.
//
// Plain ESM, no deps, browser+node.

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

// ---------------------------------------------------------------------------
// [DELETED 2026-08-28] `makeBracket(lane)` — 27 lines of client-side bracketing
// cursor (binary search on seek, linear advance on play) that existed only
// because the library exposed no positional read but the O(n) `reduceAt`. It is
// now `deck.bracket(kind, pos)` / `deck.sampleAt(kind, pos)` in
// timeline/transport.mjs (v0.4 C1/C2), riding a cursor the scheduler keeps per
// kind. For a client's OWN un-logged lanes (here: the full-rate evidence lane,
// which is ground truth and deliberately not in the log) the same cursor is
// exported as `createCursor(rows)` — used, not re-written.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// [DELETED 2026-08-28, library v0.5] `makeFlattener(lane, interp)` — 44 lines of
// client-side incremental flattening cache. It existed because the
// reconstructions were computed ON THE FLY, per frame, into a private array the
// library knew nothing about; §5b's answer is that a reconstruction is not a
// rendering pass, it is a DERIVED LANE appended to the timeline with provenance.
// So the cache is now `deck.registerReconstructor(...).run()` (append once) plus
// `deck.window([evidence, derived], …, {evidence: policy})` (read back, in
// position order, honestly filtered). What survives of the flattener is the only
// part that was ever this client's business: WHERE to invent, in pixels.
// ---------------------------------------------------------------------------

/** §5b `plan`: the positions a reconstructor should invent between two attested
 *  samples. Arc-length budget with INTEGER steps (FIX-4) — fixed subdivision
 *  starves long segments and wastes work on short ones. INTERIOR ONLY: the
 *  endpoints are attested, and emitting a derived row on top of one would
 *  double-count the evidence in the firewall's invented-fraction. */
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
 * @param opts.mode   'catmull' | 'linear' | 'hold' — the reconstruction the
 *                    adapter uses when the caller does not name one.
 * @param opts.onActuate(sample, rec) — the attested fire (sparse).
 *
 * [DELETED 2026-08-28] `opts.lane` — the adapter used to hold its own reference
 * to the log, because `interpolate` was handed two samples and `reduce` was
 * handed a prefix that structurally cannot contain the right-hand bracket. That
 * second handle on the log defeated "the library owns the log". It is gone: the
 * neighbourhood arrives in `interpolate`'s ctx and the successor arrives as
 * `info.next` (v0.4 C3/C4). This adapter now knows nothing but the samples it
 * is given.
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
      seek: true, rate: true,
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

    /** The library's contract, v0.4: interpolate(a, b, u, ctx) with
     *  ctx = {prev, next, pos, dtMs, prevs, nexts, …}. A C¹ spline is NOT a
     *  function of two samples; the neighbourhood the adapter declared
     *  (caps.neighbourhood = 1) is now handed to it. With NO neighbourhood at
     *  all we still degrade honestly to linear and say so in `method`. */
    interpolate(a, b, u, ctx) {
      adapter.interpCalls++;
      const m = (ctx && ctx.mode) || adapter.mode;
      if (m === 'hold') return holdSample(a);
      if (m === 'linear') return lerpSample(a, b, u);
      const prev = ctx && ctx.prev, next = ctx && ctx.next;
      if (prev === undefined && next === undefined) return lerpSample(a, b, u);
      return catmullSample(prev || null, a, b, next || null, u);
    },

    /** reduce(prefix <= pos) for a CONTINUOUS kind. The interpolated version:
     *  the state at t is the interpolation between the samples BRACKETING t,
     *  not merely the last one before it.
     *
     *  `payloads` only ever contains events with at <= pos, so the RIGHT
     *  bracket is by construction absent from the prefix — which is why the
     *  library now supplies `info.next` (the successor) and `info.nexts` (1 +
     *  caps.neighbourhood of them). The adapter no longer holds the log. */
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
