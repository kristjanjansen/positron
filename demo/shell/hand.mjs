// demo/shell/hand.mjs — what a hand does to a slider, written as numbers.
//
// 🔴 NO DOM IN HERE, AND THAT IS THE WHOLE REASON IT IS A FILE. `plan()` turns
// a movement preset into a list of legs and `positionAt()` reads a position out
// of that list. Both are pure, so `hand-test.mjs` can sample a movement at any
// rate, in order, with no browser and no clock, which is the only way the claim
// this module makes can be graded at all.
//
// 🔴 AND THE CLAIM CANNOT BE GRADED THROUGH A SLIDER. MEASURED: sample the same
// movement through a `0..127 step 1` lane, which is exactly what `/knobs/` has,
// and every case collapses to a crest factor of 1.000. The hand, a sine and a
// triangle read alike. A quantised curve is a staircase, so a per sample derivative
// sees a flat run and then a jump, and every run is one sample long. The
// generator emits a real number in 0..1 and the slider rounds it; this file is
// graded on the number, never on the handle.
//
// The precedent is `looper.mjs`, which keeps `ringOrder`, `planVoice` and
// `headOf` pure for the same stated reason: every bug that module ever had
// lived in one of those three. Everything interesting about an invisible hand
// is a curve, and a curve is the thing a browser is worst at grading.
//
// ⚠️ `xr-hands.mjs` IS A DIFFERENT SUBJECT. That one is about a headset's
// tracked hands and is prefixed; this one is the user's own word for a slider
// that moves by itself. The two do not read as variants of each other.

/**
 * 🔴 A MOVEMENT IS TEN NUMBERS AND A NAME, WHICH IS WHAT MAKES A CUSTOM ONE
 * FREE. The parameters ARE the format: a movement nobody named is the same
 * object with no name, handed straight to the slider. A second preset costs one
 * row here, one glyph, one sentence and one index in `MOVE_TURN`.
 */
export const MOVES = [
  ['sweep', {
    // The speed profile of one reach. See `betaY` below for why these two
    // integers are the whole of "human feel".
    a: 3, b: 4,
    shape: 'beta',
    /**
     * 🔴 WAY SLOWER, ASKED FOR IN THOSE WORDS 2026-09-16. It was 2200 ms, which
     * is a hand demonstrating a slider rather than a hand playing one: at that
     * rate a filter sweep is a gesture you watch, and what this is for is a
     * sound that changes under you while you listen to it. 7000 ms is about a
     * breath and a half each way.
     * ⚠️ THE SHAPE IS UNAFFECTED AND SO IS ITS MEASUREMENT. Every number in
     * `hand-test.mjs` is a ratio or a fraction of a lap, and the test asserts
     * rate invariance across 24 to 120 Hz for the same reason: a slower lap is
     * the same curve read at a different speed.
     */
    lapMs: 7000,         // one end to the other
    span: [0, 1],        // as a share of the lane's travel
    settle: 0.15,        // the share of a lap spent correcting the overshoot
    turnMs: 130,         // held still at each end
    endJit: 0.030,       // how far an end wanders, as a share of travel
    timeJit: 0.120,      // how much a lap's duration wanders
    over: 0.022,         // overshoot, as a share of travel
    wobble: 0.050,       // speed micro-variation inside one reach
  }],
];

/**
 * 🔴 THE PRESETS THE BUTTON CYCLES, IN THE ORDER IT CYCLES THEM, AND IT IS A
 * SEPARATE LIST ON PURPOSE. Copied from `LOOP_TURN`, whose comment says the
 * same thing: a preset can exist, be graded, and not yet be on the button.
 * Today this has one member, so a press goes off, sweep, off, which is the on
 * and off that was asked for. With two members it is off, sweep, drift, off,
 * and that is one array edit rather than a new control.
 */
export const MOVE_TURN = [0];

/**
 * The face of the button for each movement.
 *
 * ⚠️ A GLYPH IS THE STATE, NOT THE NEXT PRESS, which is what `WAY_GLYPH`
 * already does for the loop.
 * 🔴 AND IT IS NOT `⇆`. That glyph already means "the loop plays there and
 * back" on `/radio/` and `/replay/`, and one picture meaning two things is one
 * picture: whichever a reader learns first is the one they will read.
 */
// ⇄, asked for 2026-09-16. `↝` was a squiggle nobody could name; two arrows
// pointing opposite ways is what a sweep back and forth IS, and it is the same
// family as the looper's own → ← ⇆ without being any of them.
export const MOVE_GLYPH = { sweep: '\u21c4' };
export const MOVE_SAYS = { sweep: 'moving by itself, back and forth. press to stop' };
export const MOVE_OFF = 'not moving by itself. press to let go of it';

/**
 * Everything except the shape switched off: no wander in the ends, no wander in
 * the tempo, no overshoot, no correction, no pause, no speed variation.
 *
 * It exists so the test can ask what a profile does ON ITS OWN. A metric that
 * needs the noise to see the shape is a metric that is reading the noise, and
 * that is one of the three negative controls `hand-test.mjs` runs.
 */
export const BARE = { settle: 0, turnMs: 0, endJit: 0, timeJit: 0, over: 0, wobble: 0 };

/** How many harmonics the speed wobble uses. See `warp`. */
export const HARMONICS = 2;

const DEFAULTS = {
  a: 3, b: 4, shape: 'beta', lapMs: 7000, span: [0, 1],
  settle: 0.15, turnMs: 130, endJit: 0.03, timeJit: 0.12, over: 0.022, wobble: 0.05,
};

/** Look a movement up by name. Returns the pair, or undefined. */
export const moveAt = (i) => MOVES[i];
export const moveNamed = (name) => MOVES.find(([n]) => n === name)?.[1];

/**
 * 🔴 THE COARSEST LANE THAT CAN SHOW A HAND, AND IT IS ARITHMETIC RATHER THAN
 * TASTE. The ends wander by `endJit` of the travel, so on a lane of N steps that
 * wander is `endJit * N` steps. Below one step it rounds away and every lap
 * turns at the same number, which is a staircase wearing a hand's clothes.
 * MEASURED at 8 steps: the ends still read as distinct and the crest factor
 * reads 1.000, so the page would look right and measure like a machine.
 */
export const minSteps = (preset = MOVES[0][1]) =>
  Math.ceil(1 / Math.max(1e-9, preset.endJit ?? DEFAULTS.endJit));

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

/**
 * mulberry32. Small, seeded and repeatable, which is what lets four seeds be a
 * measurement rather than an anecdote.
 */
export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function binom(n, k) {
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
}

/**
 * The position along one reach, as a share of it, for a speed profile of
 * `Beta(a, b)`: speed goes as `t^(a-1) (1-t)^(b-1)`, and this is its integral
 * normalised so `y(0) = 0` and `y(1) = 1`. For whole `a` and `b` that integral
 * is a polynomial, so there is nothing transcendental in the hot path:
 *
 *   1, 1   t                                a triangle wave. Constant speed
 *   3, 3   10t³ - 15t⁴ + 6t⁵                minimum jerk, the standard aimed reach
 *   3, 4   20t³ - 45t⁴ + 36t⁵ - 10t⁶        the hand
 *
 * 🔴 THE ONE NUMBER THAT MAKES IT A HAND RATHER THAN A MACHINE IS `a < b`.
 * Minimum jerk is symmetric: it accelerates exactly as gently as it decelerates
 * and its peak speed sits at 0.500. A real aimed movement is asymmetric because
 * the second half of it is under visual feedback and the first half is not.
 * Beta(3,4) puts peak speed at `(a-1)/(a+b-2)`, which is 0.400. Setting `b = a`
 * is the sabotage `hand-test.mjs` runs, and it is caught by exactly one check.
 */
export function betaY(a, b, t) {
  const x = clamp01(t);
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const n = a + b - 1;
  let s = 0;
  for (let j = a; j <= n; j++) s += binom(n, j) * Math.pow(x, j) * Math.pow(1 - x, n - j);
  return s;
}

/** A raised cosine. Only the test uses it, as the decoy the ask names. */
export const sineY = (t) => (1 - Math.cos(Math.PI * clamp01(t))) / 2;

export const shapeY = (shape, a, b, t) => (shape === 'sine' ? sineY(t) : betaY(a, b, t));

/**
 * Speed micro-variation, applied by WARPING TIME rather than by moving the
 * value.
 *
 * ⚠️ `sin(π m t)` IS EXACTLY ZERO AT BOTH ENDS for whole `m`, so this cannot
 * move an endpoint. Where a reach stops is `endJit`'s job and only `endJit`'s
 * job, which is what lets the test grade shape and variety separately instead
 * of having one number stand for both.
 * ⚠️ AND IT STAYS MONOTONE while `amp * π * HARMONICS < 1`. At 0.05 and two
 * harmonics that is 0.314, with a wide margin. A warp that goes backwards is a
 * handle that reverses in the middle of a reach, which reads as a glitch rather
 * than as a hand.
 */
export function warp(t, amp, phases) {
  if (!amp || !phases?.length) return clamp01(t);
  let s = 0;
  for (let m = 1; m <= phases.length; m++) {
    s += (Math.sin(Math.PI * m * t) * Math.cos(phases[m - 1])) / m;
  }
  return clamp01(t + amp * s);
}

/**
 * Turn a movement into a list of legs.
 *
 * 🔴 A LIST, NOT A CLOSURE OVER A CLOCK, FOR TWO REASONS. It is a VALUE, so the
 * test can sample it at 24 Hz and at 120 Hz and compare; and every leg says what
 * KIND it is, which is what makes the measurement possible to state honestly.
 * The first metric tried on this failed because it measured a whole lap at once
 * and so let a pause at the end make a triangle look like a hand.
 *
 * One lap is three legs:
 *
 *   reach   (1 - settle) of the lap   to the target, plus the overshoot
 *   settle  settle of the lap         Beta(3,3) back to the target
 *   turn    turnMs                    held still
 *
 * @param preset one row of `MOVES`, or the same ten numbers with no name
 * @param [o.lo] [o.hi]  the window in 0..1 the movement may use
 * @param [o.seed]  fixed for the test; advanced by the page when a plan runs out
 * @param [o.laps]  how many reaches
 * @param [o.from]  where to pick up, for a plan that follows another
 */
export function plan(preset = MOVES[0][1], { lo = 0, hi = 1, seed = 1, laps = 10, from = null } = {}) {
  const p = { ...DEFAULTS, ...preset };
  const rnd = rng(seed);
  const loEnd = lo + (hi - lo) * p.span[0];
  const hiEnd = lo + (hi - lo) * p.span[1];
  const travel = hiEnd - loEnd;

  // ⚠️ AN END IS INSET BY THE OVERSHOOT BEFORE IT WANDERS, so the furthest the
  // handle ever goes is the end of the lane and never past it. Clamping the
  // overshoot instead would flatten the very thing being measured, and flatten
  // it only on the laps that wandered least.
  const endAt = (top) => {
    const inset = (p.over + rnd() * p.endJit) * travel;
    return top ? hiEnd - inset : loEnd + inset;
  };

  let at = from == null ? endAt(false) : Math.max(loEnd, Math.min(hiEnd, from));
  let up = from == null ? true : at - loEnd < travel / 2;
  const legs = [];
  let t = 0;
  for (let k = 0; k < laps; k++) {
    const target = endAt(up);
    const lapMs = p.lapMs * (1 + p.timeJit * (rnd() * 2 - 1));
    const reachMs = lapMs * (1 - p.settle);
    const settleMs = lapMs * p.settle;
    const shoot = target + (up ? 1 : -1) * p.over * travel;
    const phases = [];
    for (let m = 0; m < HARMONICS; m++) phases.push(rnd() * Math.PI * 2);
    legs.push({ kind: 'reach', t0: t, ms: reachMs, from: at, to: shoot,
      a: p.a, b: p.b, shape: p.shape, wobble: p.wobble, phases });
    t += reachMs;
    if (settleMs > 0) {
      // ⚠️ SYMMETRIC ON PURPOSE. A corrective submovement is small, slow and
      // entirely under visual feedback, which is the one case minimum jerk
      // really does describe.
      legs.push({ kind: 'settle', t0: t, ms: settleMs, from: shoot, to: target,
        a: 3, b: 3, shape: 'beta', wobble: 0, phases: [] });
      t += settleMs;
    }
    if (p.turnMs > 0) {
      legs.push({ kind: 'turn', t0: t, ms: p.turnMs, from: target, to: target,
        a: p.a, b: p.b, shape: p.shape, wobble: 0, phases: [] });
      t += p.turnMs;
    }
    at = target;
    up = !up;
  }
  return { legs, totalMs: t, lo: loEnd, hi: hiEnd, seed, preset: p };
}

/**
 * Where the handle is at `tMs` into a plan, as a share of the lane, 0 to 1.
 *
 * ⚠️ A FUNCTION OF THE CLOCK, NEVER AN ACCUMULATION PER FRAME. A dropped frame
 * then costs a skipped sample and never a drifted phase, which is what lets the
 * same movement measure the same at 24 Hz and at 120 Hz.
 */
export function positionAt(pl, tMs) {
  const legs = pl?.legs;
  if (!legs?.length) return 0;
  if (!(tMs > 0)) return legs[0].from;
  if (tMs >= pl.totalMs) return legs[legs.length - 1].to;
  let i = 0, j = legs.length - 1;
  while (i < j) {
    const m = (i + j + 1) >> 1;
    if (legs[m].t0 <= tMs) i = m; else j = m - 1;
  }
  const g = legs[i];
  if (g.kind === 'turn') return g.to;
  const k = g.ms > 0 ? clamp01((tMs - g.t0) / g.ms) : 1;
  return g.from + (g.to - g.from) * shapeY(g.shape, g.a, g.b, warp(k, g.wobble, g.phases));
}
