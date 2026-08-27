// proto/paths/pointer-adapter.js — the FIRST continuous-kind adapter for the
// timeline library: a `pointer` kind with a real `interpolate`.
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
// Bracketing cursor. A continuous kind needs "the pair straddling pos", which
// the library does not expose (see NOTES.md, THE INTERPOLATE SEAM). O(1)
// amortized while playing forward, O(log n) on a seek — never O(n) per frame.
// ---------------------------------------------------------------------------

export function makeBracket(lane) {
  let i = 0;
  return {
    reset() { i = 0; },
    /** -> {a, b, u, i} | null */
    at(pos) {
      const n = lane.length;
      if (n === 0) return null;
      if (n === 1) return { a: lane[0], b: lane[0], u: 0, i: 0 };
      if (pos <= lane[0].at) { i = 0; return { a: lane[0], b: lane[1], u: 0, i: 0 }; }
      if (pos >= lane[n - 1].at) { i = n - 2; return { a: lane[n - 2], b: lane[n - 1], u: 1, i: n - 2 }; }
      if (i > n - 2) i = n - 2;
      if (pos < lane[i].at || pos > lane[i + 1].at) {
        if (pos > lane[i + 1].at && pos <= (lane[i + 4] || lane[n - 1]).at) {
          while (i < n - 2 && pos > lane[i + 1].at) i++;       // forward play: linear advance
        } else {
          let lo = 0, hi = n - 1;                               // seek: binary search
          while (lo < hi - 1) { const m = (lo + hi) >> 1; if (lane[m].at <= pos) lo = m; else hi = m; }
          i = lo;
        }
      }
      const a = lane[i], b = lane[i + 1];
      const h = b.at - a.at;
      return { a, b, u: h > 0 ? Math.min(1, Math.max(0, (pos - a.at) / h)) : 0, i };
    },
  };
}

// ---------------------------------------------------------------------------
// Incrementally cached flattening (FIX-5). Segment k spans lane[k]..lane[k+1]
// and depends on lane[k-1 .. k+2]; appending lane[n-1] therefore invalidates
// only segments n-3 .. n-1. Nothing is ever recomputed per frame.
// ---------------------------------------------------------------------------

export function makeFlattener(lane, interp) {
  const segs = [];            // segs[k] = [{x,y}, …] for lane[k] -> lane[k+1]
  let flatCache = null, builtTo = -1;

  function build(k) {
    const a = lane[k], b = lane[k + 1];
    if (!a || !b) return [];
    const chord = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(MIN_STEPS, Math.min(MAX_STEPS, Math.ceil(chord / PX_PER_STEP))); // FIX-4
    const out = [];
    for (let s = 0; s <= steps; s++) out.push(interp(k, s / steps));   // integer stepping: u hits 1 exactly
    return out;
  }

  return {
    /** call after lane.push(sample) */
    appended() {
      const n = lane.length;
      for (let k = Math.max(0, n - 4); k <= n - 2; k++) segs[k] = build(k);
      segs.length = Math.max(0, n - 1);
      flatCache = null;
      builtTo = n - 2;
    },
    rebuildAll() {
      segs.length = 0;
      for (let k = 0; k <= lane.length - 2; k++) segs[k] = build(k);
      flatCache = null; builtTo = lane.length - 2;
    },
    /** flattened polyline over the whole lane; cached until the lane changes */
    flat() {
      if (flatCache) return flatCache;
      if (builtTo !== lane.length - 2) this.rebuildAll();
      const out = [];
      for (let k = 0; k < segs.length; k++) {
        const s = segs[k] || [];
        for (let j = k === 0 ? 0 : 1; j < s.length; j++) out.push(s[j]);
      }
      flatCache = out;
      return out;
    },
    segCount: () => segs.length,
    rebuilds: () => builtTo,
  };
}

// ---------------------------------------------------------------------------
// The adapter itself.
// ---------------------------------------------------------------------------

/**
 * @param opts.lane   array of stored samples {i, at(position ms), x, y, pressure}
 *                    — SET AFTER deck construction from deck.items (the library
 *                    owns the log; the adapter needs random access to it, which
 *                    is the workaround documented in NOTES.md).
 * @param opts.mode   'catmull' | 'linear' | 'hold' — the reconstruction the
 *                    adapter uses when the caller does not name one.
 * @param opts.onActuate(sample, rec) — the attested fire (sparse).
 */
export function makePointerAdapter({ lane = [], mode = 'catmull', onActuate = null, source = 'pointer' } = {}) {
  const adapter = {
    lane,
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
      neighbourhood: 2,          // samples of context each side that interpolate() wants
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

    /** The wall lane fires SPARSE attested samples. This is the only callback
     *  the library makes; everything between two fires is the client's job
     *  (see NOTES.md — THE INTERPOLATE SEAM). */
    actuate(payload, rec) {
      adapter.fires++;
      adapter.lastFire = payload;
      onActuate && onActuate(payload, rec);
    },

    /** THE seam under test. The library's contract is interpolate(a, b, u).
     *  A C¹ spline is NOT a function of two samples — it needs a neighbourhood
     *  — so with only (a, b, u) we degrade HONESTLY to linear and say so in the
     *  returned `method`. `ctx` is this client's extension: {mode, prev, next}. */
    interpolate(a, b, u, ctx) {
      adapter.interpCalls++;
      const m = (ctx && ctx.mode) || adapter.mode;
      if (m === 'hold') return holdSample(a);
      if (m === 'linear') return lerpSample(a, b, u);
      const prev = ctx && 'prev' in ctx ? ctx.prev : adapter.lane[a.i - 1];
      const next = ctx && 'next' in ctx ? ctx.next : adapter.lane[b.i + 1];
      if (prev === undefined && next === undefined && !adapter.lane.length) return lerpSample(a, b, u);
      return catmullSample(prev || null, a, b, next || null, u);
    },

    /** reduce(prefix <= pos) for a CONTINUOUS kind. The interpolated version:
     *  the state at t is the interpolation between the samples BRACKETING t,
     *  not merely the last one before it.
     *
     *  SEAM: `payloads` only ever contains events with at <= pos, so the RIGHT
     *  bracket is structurally absent from reduce()'s inputs. We recover it
     *  from the client-held lane by index — the workaround, reported. */
    reduce(payloads, pos) {
      adapter.reduceCalls++;
      if (!payloads.length) return null;
      const a = payloads[payloads.length - 1];
      const b = adapter.lane[a.i + 1];
      if (!b) return holdSample(a);
      const h = b.at - a.at;
      if (!(h > 0)) return holdSample(a);
      const u = Math.min(1, Math.max(0, (pos - a.at) / h));
      return adapter.interpolate(a, b, u);
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

export function deviations(evidence, lane, adapter) {
  const out = {};
  if (lane.length < 2 || !evidence.length) return out;
  const t0 = lane[0].at, t1 = lane[lane.length - 1].at;
  const modes = ['hold', 'linear', 'catmull'];
  for (const m of modes) { out[m] = { n: 0, sum: 0, max: 0, mean: 0, p95: 0 }; }
  const errs = { hold: [], linear: [], catmull: [] };
  const br = makeBracket(lane);
  for (const e of evidence) {
    if (e.at < t0 || e.at > t1) continue;
    const b = br.at(e.at);
    if (!b) continue;
    for (const m of modes) {
      const s = adapter.interpolate(b.a, b.b, b.u, { mode: m });
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
