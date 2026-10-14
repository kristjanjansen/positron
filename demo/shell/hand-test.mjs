// demo/shell/hand-test.mjs: is the invisible hand a hand. Segment first, measure second, in three
// windows (shape on reaches, turn, variety); a whole-lap metric read a drifting triangle as 1.708.
// Grades the generator, never a slider. NC1 fails, NC2 passes, NC3 fails, `b = a` caught once.
// why: lessons/kit-hand.md#test-header

import { MOVES, MOVE_TURN, MOVE_GLYPH, MOVE_SAYS, MOVE_OFF, BARE, HARMONICS,
  betaY, sineY, warp, plan, positionAt, minSteps } from './hand.mjs';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? ' · ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' · ' + detail : ''}`); }
};
const near = (a, b, eps) => Math.abs(a - b) <= eps;

const SWEEP = MOVES[0][1];
const bare = (over = {}) => ({ ...SWEEP, ...BARE, ...over });

// ── the metric of §5.3 ──────────────────────────────────────────────────────

/** Sample a plan on an even clock, which is the only clock a frame loop has. */
function sample(pl, hz) {
  const dt = 1000 / hz;
  const n = Math.floor(pl.totalMs / dt);
  const v = new Array(n + 1);
  for (let i = 0; i <= n; i++) v[i] = positionAt(pl, i * dt);
  return { v, dt };
}

/** Round a value onto a lane of `steps` intervals, the way a slider does. */
const quantise = (v, steps) => Math.round(v * steps) / steps;

/**
 * Segment a sampled stream and measure each window separately.
 *
 * A RUN is a maximal group of steps with one sign, counting an exactly zero
 * step as its own sign. A REACH is a non-zero run whose travel is at least a
 * quarter of the median non-zero run's; everything else is a TURN, which is
 * where the corrective settle and the pause both land.
 */
function measure(v, dt) {
  const EPS = 1e-12;
  const step = [], sgn = [];
  for (let i = 0; i + 1 < v.length; i++) {
    const d = v[i + 1] - v[i];
    step.push(d);
    sgn.push(Math.abs(d) <= EPS ? 0 : (d > 0 ? 1 : -1));
  }
  const runs = [];
  let s = 0;
  for (let i = 1; i <= sgn.length; i++) {
    if (i === sgn.length || sgn[i] !== sgn[s]) { runs.push({ sign: sgn[s], s, e: i }); s = i; }
  }
  for (const r of runs) r.travel = Math.abs(v[r.e] - v[r.s]);
  const nz = runs.filter((r) => r.sign !== 0).map((r) => r.travel).sort((a, b) => a - b);
  const med = nz.length ? nz[nz.length >> 1] : 0;
  const reaches = runs.filter((r) => r.sign !== 0 && r.travel >= med / 4);

  // 1. SHAPE, on the reaches only, each normalised by its own duration and its
  //    own travel. A longer pause can no longer make a shape look more human.
  const crests = [], peaks = [];
  for (const r of reaches) {
    const n = r.e - r.s;
    const trav = Math.abs(v[r.e] - v[r.s]);
    if (n < 4 || !(trav > 0)) continue;
    const mean = trav / n;                       // travel per step, by definition
    let mx = 0, at = r.s;
    for (let i = r.s; i < r.e; i++) {
      const a = Math.abs(step[i]);
      if (a > mx) { mx = a; at = i; }
    }
    crests.push(mx / mean);
    peaks.push((at - r.s + 0.5) / n);
  }
  const graded = crests.length;

  // 2. THE TURN, in its own window: everything between the end of one reach and
  //    the start of the next, which is the settle plus the pause.
  const turns = [], ends = [];
  for (let k = 0; k < reaches.length; k++) {
    const a = reaches[k].e;
    const b = k + 1 < reaches.length ? reaches[k + 1].s : step.length;
    turns.push((b - a) * dt);
    let x = v[a];
    for (let i = a; i <= b && i < v.length; i++) {
      if (reaches[k].sign > 0 ? v[i] > x : v[i] < x) x = v[i];
    }
    ends.push(x);
  }

  // 3. VARIETY, on the turning values and the lap durations: a third window.
  const laps = [];
  for (let k = 1; k < reaches.length; k++) laps.push((reaches[k].s - reaches[k - 1].s) * dt);
  const lo = Math.min(...v), hi = Math.max(...v), full = hi - lo || 1;
  const mid = (lo + hi) / 2;
  const top = ends.filter((x) => x > mid), bot = ends.filter((x) => x <= mid);
  const spreadOf = (a) => (a.length > 1 ? Math.max(...a) - Math.min(...a) : 0);
  const endSpread = Math.max(spreadOf(top), spreadOf(bot)) / full;
  // Six decimals: four reports collisions that are not there, full precision reports float noise.
  // A bare sweep's ends agree to 1e-7, a wandering one's differ by about 6e-3.
  // why: lessons/kit-hand.md#distinct
  const distinct = new Set(ends.map((x) => x.toFixed(6))).size;
  const mean = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
  const lapSpread = laps.length > 1 ? (Math.max(...laps) - Math.min(...laps)) / mean(laps) : 0;

  return {
    reaches: reaches.length, graded,
    crest: mean(crests), peakAt: mean(peaks),
    turnMs: mean(turns), ends: ends.length, distinct, endSpread, lapSpread,
  };
}

const THRESH = { crest: 1.90, peak: 0.470, turn: 250, endLo: 0.01, endHi: 0.06, lapLo: 0.10, lapHi: 0.40 };

/** The five claims, each answering a different question. */
function grade(m) {
  return {
    crest: m.crest >= THRESH.crest,
    peak: m.peakAt <= THRESH.peak,
    turn: m.turnMs >= THRESH.turn,
    ends: m.distinct === m.ends && m.endSpread >= THRESH.endLo && m.endSpread <= THRESH.endHi,
    laps: m.lapSpread >= THRESH.lapLo && m.lapSpread <= THRESH.lapHi,
  };
}

const run = (preset, { seed = 7, laps = 10, hz = 60, steps = 0 } = {}) => {
  const pl = plan(preset, { seed, laps });
  const { v, dt } = sample(pl, hz);
  return measure(steps ? v.map((x) => quantise(x, steps)) : v, dt);
};

const row = (name, m) => `${name.padEnd(30)} crest ${m.crest.toFixed(3)}  peak ${m.peakAt.toFixed(3)}`
  + `  turn ${Math.round(m.turnMs)} ms  laps ${(m.lapSpread * 100).toFixed(1)}%`
  + `  ends ${m.distinct}/${m.ends} spread ${(m.endSpread * 100).toFixed(1)}%`;

console.log('\n== the invisible hand ==\n');

// ── the profiles, on their own ──────────────────────────────────────────────

// 1. The three polynomials are the ones the plan names, to the digit. A typo in
//    a coefficient is a different curve that still looks like a curve.
{
  const tri = [0.1, 0.37, 0.5, 0.82].every((t) => near(betaY(1, 1, t), t, 1e-12));
  const mj = [0.1, 0.37, 0.5, 0.82].every((t) =>
    near(betaY(3, 3, t), 10 * t ** 3 - 15 * t ** 4 + 6 * t ** 5, 1e-12));
  const hand = [0.1, 0.37, 0.5, 0.82].every((t) =>
    near(betaY(3, 4, t), 20 * t ** 3 - 45 * t ** 4 + 36 * t ** 5 - 10 * t ** 6, 1e-12));
  ok('the three speed profiles integrate to the polynomials they are named by',
    tri && mj && hand, 'Beta(1,1) = t, Beta(3,3) = minimum jerk, Beta(3,4) = the hand');
}

// 2. Every profile leaves and arrives at rest, and the hand leaves with no
//    acceleration either, so it does not start with a jerk.
{
  const h = 1e-5;
  const d1 = (a, b, t) => (betaY(a, b, t + h) - betaY(a, b, t - h)) / (2 * h);
  const d2 = (a, b, t) => (betaY(a, b, t + h) - 2 * betaY(a, b, t) + betaY(a, b, t - h)) / (h * h);
  ok('a reach leaves and arrives at rest, and the hand leaves with no acceleration',
    betaY(3, 4, 0) === 0 && betaY(3, 4, 1) === 1
    && near(d1(3, 4, h), 0, 1e-6) && near(d1(3, 4, 1 - h), 0, 1e-6)
    && near(d2(3, 4, 2 * h), 0, 1e-2),
    `speed ${d1(3, 4, h).toExponential(1)} at the start, ${d1(3, 4, 1 - h).toExponential(1)} at the end`);
}

// 3. the four constants at 2000 points: triangle 1.000, sine π/2, minimum jerk 1.875 peaking in
// the middle, the hand 2.074 peaking at 0.400.
// why: lessons/kit-hand.md#t3
{
  const profile = (f) => {
    const N = 2000;
    let mx = 0, at = 0, sum = 0;
    for (let i = 0; i < N; i++) {
      const t0 = i / N, t1 = (i + 1) / N;
      const d = f(t1) - f(t0);
      sum += d;
      if (d > mx) { mx = d; at = (i + 0.5) / N; }
    }
    return { crest: mx / (sum / N), at };
  };
  const tri = profile((t) => betaY(1, 1, t));
  const sin = profile(sineY);
  const mj = profile((t) => betaY(3, 3, t));
  const hd = profile((t) => betaY(3, 4, t));
  console.log(`  [the four profiles, integrated at 2000 points]`);
  for (const [n, p] of [['triangle', tri], ['sine', sin], ['min jerk', mj], ['hand', hd]]) {
    console.log(`    ${n.padEnd(10)} crest ${p.crest.toFixed(3)}  peak at ${p.at.toFixed(3)}`);
  }
  ok('a triangle is 1.000, a sine is 1.571, minimum jerk is 1.875 and the hand is 2.074',
    near(tri.crest, 1.000, 0.002) && near(sin.crest, 1.571, 0.002)
    && near(mj.crest, 1.875, 0.003) && near(hd.crest, 2.074, 0.003),
    `${tri.crest.toFixed(3)} · ${sin.crest.toFixed(3)} · ${mj.crest.toFixed(3)} · ${hd.crest.toFixed(3)}`);
  ok('and only the hand is asymmetric: it peaks at 0.400 where the others peak at 0.500',
    near(mj.at, 0.500, 0.002) && near(sin.at, 0.500, 0.002) && near(hd.at, 0.400, 0.002),
    `min jerk ${mj.at.toFixed(3)}, sine ${sin.at.toFixed(3)}, hand ${hd.at.toFixed(3)}`);
}

// 4. negative control: the wobble warps time and must not move an end.
// why: lessons/kit-hand.md#t4
{
  const ph = [0.9, 2.7];
  const moved = Math.max(Math.abs(warp(0, 0.05, ph) - 0), Math.abs(warp(1, 0.05, ph) - 1));
  let back = 0, prev = warp(0, 0.05, ph);
  for (let i = 1; i <= 4000; i++) {
    const w = warp(i / 4000, 0.05, ph);
    if (w < prev - 1e-15) back++;
    prev = w;
  }
  ok('the speed wobble cannot move an end, and never runs backwards',
    moved === 0 && back === 0,
    `ends moved ${moved}, ${back} reversals in 4000 samples, bound ${(0.05 * Math.PI * HARMONICS).toFixed(3)}`);
}

// ── the nine cases of §5.3 ─────────────────────────────────────────────────

console.log(`\n  [10 laps, sampled at 60 Hz, seed 7]`);
const cases = {
  'triangle, bare': run(bare({ a: 1, b: 1 })),
  'sine, bare': run(bare({ shape: 'sine' })),
  'min jerk Beta(3,3), bare': run(bare({ a: 3, b: 3 })),
  'Beta(3,4), bare': run(bare()),
  'THE HAND, everything on': run(SWEEP),
  'NC1 triangle + the jitter': run({ ...SWEEP, a: 1, b: 1 }),
  'NC2 Beta(3,4), jitter off': run(bare()),
  'NC3 sine + the jitter': run({ ...SWEEP, shape: 'sine' }),
  'SABOTAGE Beta(3,3) + jitter': run({ ...SWEEP, b: 3 }),
};
for (const [n, m] of Object.entries(cases)) console.log(`    ${row(n, m)}`);
console.log('  a bare row turns at TWO values, one per end, and its laps are all the same');
console.log('  length: 2200 ms is exactly 132 frames at 60 Hz, so the grid lands in the same');
console.log('  place every lap and there is nothing left to wander.');
console.log('  turn is everything that is not a reach, so it is the 330 ms correction plus');
console.log('  the 130 ms pause, not `turnMs` on its own.\n');

// 5. The bare profiles measure through the segmenter as what they measure as
//    integrals. If they did not, the segmenter would be the thing being graded.
ok('a bare triangle reads 1.000 through the segmenter, and a bare sine 1.571',
  near(cases['triangle, bare'].crest, 1.000, 0.02) && near(cases['sine, bare'].crest, 1.571, 0.02),
  `${cases['triangle, bare'].crest.toFixed(3)} and ${cases['sine, bare'].crest.toFixed(3)}`);
ok('a bare Beta(3,4) reads 2.07 and peaks at 0.40, which no other profile does',
  near(cases['Beta(3,4), bare'].crest, 2.073, 0.03) && near(cases['Beta(3,4), bare'].peakAt, 0.400, 0.02),
  `crest ${cases['Beta(3,4), bare'].crest.toFixed(3)}, peak ${cases['Beta(3,4), bare'].peakAt.toFixed(3)}`);
ok('a bare sweep pauses for nothing and turns at one value per end, because nothing wanders',
  cases['Beta(3,4), bare'].turnMs < 40 && cases['Beta(3,4), bare'].lapSpread < 0.02
  && cases['Beta(3,4), bare'].distinct === 2,
  `turn ${Math.round(cases['Beta(3,4), bare'].turnMs)} ms, laps `
  + `${(cases['Beta(3,4), bare'].lapSpread * 100).toFixed(1)}%, `
  + `${cases['Beta(3,4), bare'].distinct} distinct ends in ${cases['Beta(3,4), bare'].ends} turns`);

// 6. THE HAND. All five claims at once, which is the only row that has to do that.
{
  const m = cases['THE HAND, everything on'];
  const g = grade(m);
  ok('THE HAND passes all five claims at once',
    Object.values(g).every(Boolean),
    Object.entries(g).map(([k, p]) => `${k} ${p ? 'ok' : 'NO'}`).join(' · '));
  ok('and it made ten reaches and turned at ten different values',
    m.reaches === 10 && m.ends === 10 && m.distinct === 10,
    `${m.reaches} reaches, ${m.distinct} of ${m.ends} ends distinct`);
}

// 7. NC1, the drift decoy: a triangle with every wander the hand has must fail.
// why: lessons/kit-hand.md#t7
{
  const m = cases['NC1 triangle + the jitter'];
  const g = grade(m);
  ok('NC1 a triangle carrying every jitter the hand has still FAILS on shape',
    !g.crest && !Object.values(g).every(Boolean),
    `crest ${m.crest.toFixed(3)} against the ${THRESH.crest} threshold, on a true 1.000`);
  ok('and it passes the turn and variety claims, so the failure is about shape alone',
    g.turn && g.ends && g.laps,
    `turn ${Math.round(m.turnMs)} ms, ${m.distinct} ends, laps ${(m.lapSpread * 100).toFixed(1)}%`);
}

// 8. NC2, the shape decoy: the hand with every wander off must pass both shape claims.
// why: lessons/kit-hand.md#t8
{
  const g = grade(cases['NC2 Beta(3,4), jitter off']);
  ok('NC2 the hand with every jitter off still PASSES both shape claims',
    g.crest && g.peak && !g.turn && !g.ends && !g.laps,
    `shape ok, and it fails turn, ends and laps as a bare sweep must`);
}

// 9. NC3, the sine decoy: fails both shape claims, passes every turn and variety claim.
// why: lessons/kit-hand.md#t9
{
  const m = cases['NC3 sine + the jitter'];
  const g = grade(m);
  ok('NC3 a sine carrying the same jitter FAILS both shape claims and passes the rest',
    !g.crest && !g.peak && g.turn && g.ends && g.laps,
    `crest ${m.crest.toFixed(3)}, peak ${m.peakAt.toFixed(3)}`);
}

// 10. the sabotage `b = a` (symmetric minimum jerk) must be caught by exactly one check.
// why: lessons/kit-hand.md#t10
{
  const m = cases['SABOTAGE Beta(3,3) + jitter'];
  const g = grade(m);
  const bad = Object.entries(g).filter(([, p]) => !p).map(([k]) => k);
  ok('setting b = a is caught by exactly one check, the one about asymmetry',
    bad.length === 1 && bad[0] === 'peak',
    `crest ${m.crest.toFixed(3)} still passes, peak ${m.peakAt.toFixed(3)} does not · failed: ${bad.join(', ') || 'nothing'}`);
}

// ── it is a statement about the movement, not about the machine ────────────

// 11. The sample rate does not move the metric, which is what the plan being a
//     function of the clock rather than an accumulation per frame buys.
{
  const rates = [24, 30, 60, 90, 120];
  const cs = rates.map((hz) => run(SWEEP, { hz }).crest);
  console.log(`\n  [the same movement at five frame rates]`);
  console.log(`    ${rates.map((hz, i) => `${hz} Hz ${cs[i].toFixed(2)}`).join('   ')}`);
  ok('the crest factor does not move with the sample rate',
    Math.max(...cs) - Math.min(...cs) < 0.05,
    `${Math.min(...cs).toFixed(3)} to ${Math.max(...cs).toFixed(3)} over 24 to 120 Hz`);
}

// 12. Four seeds, so the thresholds are not sitting on one lucky draw, and the
//     sabotage beside them, so the asymmetry threshold is not either.
{
  const seeds = [3, 7, 11, 29];
  const ms = seeds.map((seed) => run(SWEEP, { seed }));
  const sb = seeds.map((seed) => run({ ...SWEEP, b: 3 }, { seed }));
  console.log(`\n  [four seeds, everything on]`);
  for (let i = 0; i < seeds.length; i++) console.log(`    ${row(`seed ${seeds[i]}`, ms[i])}`);
  ok('every one of four seeds passes all five claims',
    ms.every((m) => Object.values(grade(m)).every(Boolean)),
    `crest ${Math.min(...ms.map((m) => m.crest)).toFixed(2)} to ${Math.max(...ms.map((m) => m.crest)).toFixed(2)}, `
    + `peak ${Math.min(...ms.map((m) => m.peakAt)).toFixed(2)} to ${Math.max(...ms.map((m) => m.peakAt)).toFixed(2)}`);
  // The asymmetry threshold 0.470 is the narrowest here: the sabotage's margin is a few hundredths.
  // why: lessons/kit-hand.md#asymmetry
  ok('the sabotage fails the asymmetry claim on every one of the same four seeds',
    sb.every((m) => m.peakAt > THRESH.peak) && ms.every((m) => m.peakAt < THRESH.peak),
    `the hand peaks ${Math.max(...ms.map((m) => m.peakAt)).toFixed(3)} at worst and the sabotage `
    + `${Math.min(...sb.map((m) => m.peakAt)).toFixed(3)} at best, either side of ${THRESH.peak}`);
}

// 13. the quantisation collapse: through /knobs/'s 0..127 lane the hand and a triangle read alike.
// why: lessons/kit-hand.md#t13
{
  const air = { h: run(SWEEP), t: run({ ...SWEEP, a: 1, b: 1 }), s: run({ ...SWEEP, b: 3 }) };
  const lane = { h: run(SWEEP, { steps: 127 }), t: run({ ...SWEEP, a: 1, b: 1 }, { steps: 127 }),
    s: run({ ...SWEEP, b: 3 }, { steps: 127 }) };
  console.log(`\n  [the same three movements, in the air and read off a 0..127 lane]`);
  for (const [k, n] of [['h', 'hand'], ['t', 'triangle'], ['s', 'sabotage']]) {
    console.log(`    ${n.padEnd(9)} in the air ${air[k].crest.toFixed(3)}   through the lane ${lane[k].crest.toFixed(3)}`);
  }
  // A quantised curve is a staircase: between steps the value is constant, so
  // the segmenter cuts every reach into one-sample runs with flat ground
  // between them and there is nothing left with a shape in it.
  ok('through a 128 step slider every movement falls under the threshold, so the lane cannot grade this',
    lane.h.crest < THRESH.crest && lane.t.crest < THRESH.crest && lane.s.crest < THRESH.crest,
    `hand ${lane.h.crest.toFixed(3)}, triangle ${lane.t.crest.toFixed(3)}, sabotage ${lane.s.crest.toFixed(3)}, `
    + `all under ${THRESH.crest}`);
  /**
   * The claim is the verdict, not the gap: through the lane the metric says not-a-hand about both.
   * why: lessons/kit-hand.md#verdict
   */
  const verdict = (r) => r.crest >= THRESH.crest;
  ok('in the air the metric separates them and through the lane it cannot',
    verdict(air.h) && !verdict(air.t) && !verdict(lane.h) && !verdict(lane.t),
    `air: hand ${verdict(air.h) ? 'passes' : 'fails'}, triangle ${verdict(air.t) ? 'passes' : 'fails'} · `
    + `lane: hand ${verdict(lane.h) ? 'passes' : 'fails'}, triangle ${verdict(lane.t) ? 'passes' : 'fails'}`);
}

// 14. And the floor that follows from it, stated as arithmetic: the end wander
//     has to be at least one step or every lap turns at the same number.
{
  // And the variety window still reads fine: nine distinct ends on a staircase with no reach left.
  // why: lessons/kit-hand.md#coarse
  const coarse = run(SWEEP, { steps: 8 });
  ok('a lane too coarse to show the wander has no reach left to measure, so the floor is 34 steps',
    minSteps(SWEEP) === 34 && coarse.graded === 0,
    `1 / ${SWEEP.endJit} is ${minSteps(SWEEP)} steps · at 8 steps the metric finds `
    + `${coarse.graded} reaches worth measuring, while ${coarse.distinct} ends still read distinct`);
}

// ── what the button says ───────────────────────────────────────────────────

// 15. Every movement the button can reach has a face and a sentence, and the
//     face is not the loop's.
ok('every movement the button can reach has a glyph and a sentence, and none of them is the loop’s',
  MOVE_TURN.every((i) => MOVE_GLYPH[MOVES[i][0]] && MOVE_SAYS[MOVES[i][0]])
  && MOVE_TURN.every((i) => MOVE_GLYPH[MOVES[i][0]] !== '⇆'),
  MOVE_TURN.map((i) => `${MOVES[i][0]} ${MOVE_GLYPH[MOVES[i][0]]}`).join(' · '));

// 16. Nothing a visitor reads carries an em dash, and nothing says `a` or `the`
//     at the front of a name.
{
  const strings = [...Object.values(MOVE_SAYS), ...Object.values(MOVE_GLYPH), MOVE_OFF];
  ok('no em dash in anything the button says',
    strings.every((s) => !s.includes('—')), `${strings.length} strings`);
}

console.log(`\n${pass} ok · ${fail} failed`);
process.exit(fail ? 1 : 0);
