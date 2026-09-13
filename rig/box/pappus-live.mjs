// rig/box/pappus-live.mjs — drive a box running Pappus and check that the die,
// the drift and the 1965 material move the SOUND.
//
//   node box.mjs --room studio-1              (on the board; it is the service)
//   node pappus-live.mjs --room studio-1      (from anywhere; about 7.5 minutes)
//   node pappus-live.mjs --self-test          (the statistics alone — no relay, no board)
//   node pappus-live.mjs --only pitch         (one section: seeds | drift | err | pitch)
//
// ⚠️ DO NOT PIPE THIS INTO `tail`. `cmd | tail` reports TAIL's exit status, so a
// failed run reads as a passing one; and node buffers a piped stdout until exit,
// so a seven-minute run looks hung for seven minutes. Read it straight, or
// `node pappus-live.mjs > run.txt; echo $?`.
//
// ⚠️ ONE AT A TIME. This drives the board's single instrument and single
// granulator, so two runs at once interleave: one switches the source while the
// other is mid-capture, and the second reads silence or somebody else's sound.
// Seen for real — a run died with "no audio" while another had just restarted
// hexter underneath it.
//
// The claim under test is not "OSC was sent". Nothing downstream of the socket
// answers: sclang takes a message for a command that does not exist, or a value
// out of range, and says nothing at all — so a roll that changed everything and
// a roll that changed nothing look identical from the sending end. That is the
// same shape as the patch stepper, and it is why this grades by ear.
//
// ⚠️ It includes the NEGATIVE CONTROLS, because a difference test that cannot
// fail is not a test:
//
//   * two applications of the SAME seed are what every seed verdict is measured
//     against — the floor is the instrument's own wobble, sampled, not a number
//     anybody typed;
//   * the drift must move the sound with NOTHING sent at all — and, separately,
//     it must STAY OFF when it has been told to, which is its own check now;
//   * the pitch sweep must prove there is a sound before measuring its pitch;
//   * `--self-test` runs the statistics against synthetic captures with no board
//     attached, and fails if the shuffle test can no longer say NO to two
//     samples of one distribution, or YES to two that are three wobbles apart.
//
// ── HOW THIS FILE GRADES, AND WHY IT IS NOT ONE TAKE ─────────────────────────
//
// ⚠️ THIS INSTRUMENT IS STOCHASTIC AND A SINGLE CAPTURE IS NOT A MEASUREMENT.
// Grains fire against a per-voice probability, a euclidean gate and a free-
// running `TRand` that nothing reseeds, so two captures of an IDENTICAL setting
// differ. Graded one capture a condition, this file read 14, 16 and 16 of 17
// across three consecutive runs with DIFFERENT checks failing each time, and its
// own noise floor moved between 0.045 and 0.126 envelope — so every threshold in
// it was being compared against a number that was itself a die roll.
//
// So: several captures a condition, and the verdict is a SHUFFLE TEST. The two
// conditions' captures are pooled and re-split every possible way, and the
// question asked is "how many of those splits land as far apart as the real one
// did?". That compares two DISTRIBUTIONS and it needs no threshold anybody
// typed. Printed beside it is the effect size — the median of every
// A-against-B difference — in the axis's own units, and the condition's own
// spread, which is how far two repeats of it sit apart when nothing changed.
//
// ⚠️ AND THE UNIT OF REPETITION IS WHATEVER GETS RE-ROLLED. For the seeds that
// is an APPLICATION of the seed, not a capture. Applying 424242 twice does not
// reproduce the same sound — the grain scheduler's noise is not seeded — so the
// floor for "two seeds differ" is how far apart two applications of ONE seed
// land, and estimating THAT from a single pair is the die roll all over again.
// Five applications of each seed give ten same-seed pairs, and the shuffle test
// takes its null from them. Repeating captures inside one application would
// have measured the wrong wobble and called it the floor.
//
// ── WHY FIVE, MEASURED RATHER THAN PICKED ────────────────────────────────────
//
// A shuffle test over two groups of n can only report p-values that are
// multiples of 1/C(2n,n), so the repeat count sets a FLOOR on what it is able to
// say at all. Two axes are looked at here (envelope and brightness), so a
// verdict at 5% needs 2.5% on one axis, and then:
//
//   repeats  arrangements  smallest p it can express   at 2 s.d.   at 3 s.d.
//      3           20               0.100              cannot decide
//      4           70               0.029              cannot decide
//      5          252               0.008                0.53        0.89
//      7        3,432               0.0006               0.79        0.99
//
// THREE CAPTURES CANNOT PRODUCE A VERDICT AT ALL: the smallest p-value twenty
// arrangements can express is 0.10, so a three-take run that says "different"
// is quoting a typed margin, not the data. FIVE is the smallest count that can
// decide, and it resolves an effect three times the instrument's own wobble
// nine times in ten. Those numbers are not from a textbook — `--self-test`
// re-measures them on every run with no board attached, at 600 trials, so the
// last column moves a point or two between runs.
//
// THE DRIFT PAIR GETS SEVEN, because it is the one claim here whose effect is
// about twice the wobble rather than three times it: 45 s of drift moved the
// sound 0.15 octaves while the granulator wobbles 0.15 on its own, and 90 s —
// half the 181 s scan cycle, which is as far as that parameter ever gets from
// where it started — is about twice that. At five repeats a 2 s.d. effect is a
// coin toss dressed as a check. The 90 s wait dominates that section, so the two
// extra captures cost 11 seconds.
//
// What five CANNOT do is resolve an effect the size of the wobble itself: that
// needs about 19 repeats a condition, which is 55 s per condition and 11 minutes
// of captures. Where a claim is that small it is REPORTED AND NOT ASSERTED, and
// says so in words — the per-step pitch rungs below are the case.
//
// ⚠️ WHAT THIS COSTS: about 7.5 minutes, against 4.5 at the three captures that
// could not decide anything. Seventy captures at ~3 s each is most of it, and
// the rest is two fixed waits (90 s for the drift, 25 s for the erase guard)
// that no repeat count touches. `--only <section>` is the lever when you are
// iterating on one claim; `--takes` is for experiments, NOT for making a red run
// green — lowering it does not weaken a verdict, it withdraws it.
//
// ── TWO STATE TRAPS THAT COST A WHOLE RUN, 2026-09-13 ────────────────────────
//
// Both are about a command doing something beyond its name, and both made
// checks fail for a reason that had nothing to do with what they were asking.
//
// 🔴 **A ROLL TURNS THE DRIFT BACK ON.** `params.random` ends with
// `startDrift()` in box.mjs, so `params.drift off` BEFORE a roll is undone by
// the roll. Ten rolls in the seed section re-armed it ten times, and the
// section's numbers say so: two applications of one seed 0.091 env apart, two
// DIFFERENT seeds 0.009 apart — the wobble ten times the effect, which is the
// signature of six parameters walking under a set of captures taken minutes
// apart. Every roll here goes through `roll()`, which puts it back off, and
// `nudges` is read off the BOX to prove it stayed off.
//
// 🔴 **`src 1` ERASES, AND `lock` IS WHAT HOLDS.** The engine writes
// `BufWr(cap·sosin + old·sosret)` where `sos = msos.max(mlock)` — so `src 1`
// with `lock` still 0 makes both terms zero and sweeps silence over the live
// window in real time. Freezing in the order `src` then `lock` therefore erases
// the head of whatever was just recorded, for as long as the second command
// takes to cross the relay. Lock first; `lock 1` alone already both holds the
// material and stops the input being mixed in. (`loadBuffers` uses the other
// order and is right to — it `snapread`s straight afterwards.)
//
// And `src` is **1 OFF, 2 STEREO, 3 MONO L, 4 MONO R, with no 0** — a value
// outside that table is silence rather than an error. See `rig/box/norns/CHAIN.md`.
//
// ⚠️ The statistics live here rather than in `measure.mjs` only because this
// change was scoped to one file. They belong next to `measure()`, and
// `summarise`/`separated` there are what they replace — nothing else imports
// those two.
import { measure } from './measure.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
/**
 * ⚠️ A SEVEN-MINUTE TEST IS A TEST NOBODY ITERATES ON, and it showed: eight
 * consecutive end-to-end runs went into fixing one assertion at a time, most of
 * them waiting on parts that had not changed. `--quick` cuts the two long waits
 * and drops to two repeats a condition; `--only` runs one section.
 *
 * BOTH PRINT THAT THEY ARE PARTIAL, and a shortened run REFUSES the statistical
 * verdicts rather than guessing at them — two repeats cannot express a p-value
 * below 0.33, so every shuffle test comes back "cannot decide". That is the
 * honest answer and it is the point: a shortened run that looks like a full one
 * is a number that will be quoted as one.
 */
const QUICK = process.argv.includes('--quick');
const SELF = process.argv.includes('--self-test');
const SECTIONS = ['seeds', 'drift', 'err', 'pitch'];
const only = arg('only', null);
const RUN = new Set(only ? only.split(',').map((s) => s.trim()) : SECTIONS);
for (const s of RUN) if (!SECTIONS.includes(s)) { console.error(`unknown section "${s}" — pick from ${SECTIONS.join(' | ')}`); process.exit(2); }
const ROOM = arg('room', 'studio-1');
/** Repeats a condition. See "why five" above; `--takes` is for experiments, not for making a run pass. */
const TAKES = Math.max(1, Number(arg('takes', QUICK ? 2 : 5)));
const TAKES_DRIFT = QUICK ? TAKES : Math.max(TAKES, 7);
const APPS = QUICK ? 2 : 5;      // applications of a seed — the unit for the seed checks
const PER_APP = QUICK ? 1 : 2;   // captures inside one application, averaged into it

// ══ the statistics ══════════════════════════════════════════════════════════
// Pure. No clock, no socket, no board — which is what makes `--self-test` able
// to prove that the guards below fire.

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  if (!s.length) return NaN;
  const h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
};
const pairwise = (xs) => { const d = []; for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++) d.push(Math.abs(xs[i] - xs[j])); return d; };
const choose = (n, k) => { let r = 1; for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1); return Math.round(r); };
/** Fixed seed on purpose: a p-value must not be a die roll on top of a die roll. */
const lcg = (seed) => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return (s + 0.5) / 4294967296; }; };

/**
 * The two axes, and they are two because one can coincide: a loudness wobble
 * alone must not be able to produce a verdict of "a different sound". Looking at
 * two is also why the bar is 2.5% rather than 5% — you get to look twice, so
 * each look has to be twice as convincing.
 */
const AXES = {
  env: { name: 'envelope', of: (t) => t.ratio, show: (v) => v.toFixed(3), unit: '' },
  oct: { name: 'brightness', of: (t) => (t.centroid > 0 ? Math.log2(t.centroid) : null), show: (v) => v.toFixed(2), unit: ' oct' },
};
const AXIS_KEYS = Object.keys(AXES);
const ALPHA = 0.05;
const PER_AXIS = ALPHA / AXIS_KEYS.length;
const fmtAxis = (k, v) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : `${AXES[k].show(v)}${AXES[k].unit}`);

/** Average ranks, so a tie cannot invent a difference. */
function ranksOf(pool) {
  const idx = [...pool.keys()].sort((a, b) => pool[a] - pool[b]);
  const r = new Array(pool.length);
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j + 1 < idx.length && pool[idx[j + 1]] === pool[idx[i]]) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) r[idx[k]] = avg;
    i = j + 1;
  }
  return r;
}

/**
 * Every way of splitting n things into a group of `na` and the rest. Exact while
 * that is countable; a FIXED-seed sample beyond it, so the answer is the same
 * every run.
 */
const CAP = 100000;
function eachArrangement(n, na, cb) {
  const total = choose(n, na);
  if (total <= CAP) {
    const cur = new Array(na);
    const walk = (start, depth) => {
      if (depth === na) return cb(cur);
      for (let i = start; i <= n - (na - depth); i++) { cur[depth] = i; walk(i + 1, depth + 1); }
    };
    walk(0, 0);
    return { visited: total, exact: true };
  }
  const rnd = lcg(20260913);
  const idx = [...Array(n).keys()];
  for (let t = 0; t < CAP; t++) {
    for (let i = n - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; const tmp = idx[i]; idx[i] = idx[j]; idx[j] = tmp; }
    cb(idx.slice(0, na));
  }
  return { visited: CAP, exact: false };
}

/**
 * ⚠️ THE STATISTIC IS A RANK SUM, NOT A DIFFERENCE OF MEDIANS, and that is not
 * a detail. Measured while choosing it: with |median(A) − median(B)| as the
 * statistic, swapping the smallest value of A with the smallest of B leaves BOTH
 * medians untouched, so a large share of arrangements tie with the real one and
 * five repeats a side can never express a p below 0.025 — the test reads 0.000
 * power at every effect size, which looks exactly like a broken engine. A rank
 * sum has no such tie, and it is the standard robust choice.
 */
function shuffleTest(xa, xb) {
  const pool = [...xa, ...xb], na = xa.length, n = pool.length;
  const r = ranksOf(pool);
  const centre = (na * (n + 1)) / 2;
  const obs = Math.abs(r.slice(0, na).reduce((a, b) => a + b, 0) - centre);
  let ge = 0;
  const { visited, exact } = eachArrangement(n, na, (idx) => {
    let s = 0;
    for (const i of idx) s += r[i];
    if (Math.abs(s - centre) >= obs - 1e-9) ge++;
  });
  // Exact enumeration already contains the real split, so `ge` is never 0.
  // A sample does not, hence the +1 — the conservative convention.
  const p = exact ? ge / visited : (ge + 1) / (visited + 1);
  const floorP = exact ? (na === n - na ? 2 : 1) / visited : 1 / (visited + 1);
  return { ge, arrangements: visited, exact, p, floorP };
}
/** The effect size: the middle of every A-against-B difference, in the axis's own units. */
const hodgesLehmann = (xa, xb) => {
  const d = [];
  for (const x of xa) for (const y of xb) d.push(x - y);
  return Math.abs(median(d));
};

/**
 * A CONDITION is several repeats of one setting: a middle and a spread, never a
 * single number. `unit` names what was repeated, because "over 5 captures" and
 * "over 5 rolls" are different claims and the output has to say which.
 */
function condition(label, repeats, unit = 'captures') {
  const good = (repeats || []).filter((t) => t && t.n > 0);
  if (!good.length) return null;
  const c = { label, unit, n: good.length, all: good, series: {}, mid: {}, spread: {} };
  c.peak = median(good.map((t) => t.peak));
  c.ratio = median(good.map((t) => t.ratio));
  c.centroid = median(good.map((t) => t.centroid));
  for (const k of AXIS_KEYS) {
    const xs = good.map(AXES[k].of).filter((v) => v !== null && Number.isFinite(v));
    c.series[k] = xs;
    c.mid[k] = xs.length ? median(xs) : null;
    // ⚠️ THE SPREAD IS HOW FAR APART TWO REPEATS SIT, NOT HOW FAR THEY SIT FROM
    // THE MIDDLE ONE. The second is what this file used to print, and with three
    // repeats it is degenerate: the middle repeat's distance from the middle is
    // exactly ZERO, so the median of three distances is the SMALLER of the other
    // two — a floor biased low, which makes everything look significant.
    c.spread[k] = xs.length > 1 ? median(pairwise(xs)) : null;
  }
  return c;
}

/** Is B a different sound from A — by more than re-splitting their own repeats gets? */
function compare(A, B) {
  const out = { a: A, b: B };
  for (const k of AXIS_KEYS) {
    const xa = A.series[k] ?? [], xb = B.series[k] ?? [];
    if (xa.length < 2 || xb.length < 2) {
      out[k] = { usable: false, decidable: false, clears: false, d: null, p: null, why: `too few ${A.unit} with a ${AXES[k].name} to measure` };
      continue;
    }
    const r = shuffleTest(xa, xb);
    r.usable = true;
    r.d = hodgesLehmann(xa, xb);
    r.decidable = r.floorP <= PER_AXIS;
    r.clears = r.decidable && r.p <= PER_AXIS;
    out[k] = r;
  }
  out.any = AXIS_KEYS.some((k) => out[k].clears);
  out.decidable = AXIS_KEYS.some((k) => out[k].decidable);
  out.floorP = Math.min(...AXIS_KEYS.map((k) => (out[k].usable ? out[k].floorP : Infinity)));
  return out;
}

/** What a check says it did: both axes, the shuffle count, and how many repeats. */
function evidence(cmp) {
  const parts = AXIS_KEYS.map((k) => {
    const r = cmp[k];
    if (!r.usable) return `${AXES[k].name} — ${r.why}`;
    return `${AXES[k].name} ${fmtAxis(k, r.d)} apart, ${r.ge} of ${r.arrangements} shuffles reached it (p ${r.p.toFixed(3)})`;
  });
  return `${parts.join(' · ')} · over ${cmp.a.n}+${cmp.b.n} ${cmp.a.unit}`;
}

// ══ the self-test: proof that these guards fire ═════════════════════════════
// ⚠️ A GREEN SUITE CAN MEAN ZERO COVERAGE, so this breaks the thing on purpose.
// It needs no relay, no board and no sound card, and it re-derives the repeat
// count in the header rather than trusting a comment.
function selfTest() {
  let good = 0, bad = 0;
  const t = (name, cond, detail = '') => { cond ? good++ : bad++; console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}${detail ? `  ${detail}` : ''}`); };
  const rnd = lcg(20260913);
  const gauss = () => Math.sqrt(-2 * Math.log(rnd())) * Math.cos(2 * Math.PI * rnd());
  /** Synthetic captures: a gaussian on each axis, so an effect can be dialled in s.d. */
  const fake = (n, { shiftEnv = 0, shiftOct = 0, sd = 0.1 } = {}) =>
    Array.from({ length: n }, () => ({
      peak: 0.1, n: 1,
      ratio: 0.4 + sd * (gauss() + shiftEnv),
      centroid: 2 ** (10 + sd * (gauss() + shiftOct)),
    }));
  /**
   * ⚠️ THE EFFECT IS PUT ON ONE AXIS, BECAUSE THAT IS THE REAL CASE. Shifting
   * both and asking "did either clear?" is two chances at the same effect, and
   * it reads 75% where the honest single-axis answer is 53% — a power figure
   * flattered by exactly the multiplicity the 2.5% bar exists to pay for. A key
   * change moves brightness, not envelope; the drift moves what it moves.
   */
  const power = (n, shift, trials, both = false) => {
    let hit = 0;
    for (let i = 0; i < trials; i++) {
      const b = both ? { shiftEnv: shift, shiftOct: shift } : { shiftOct: shift };
      if (compare(condition('a', fake(n)), condition('b', fake(n, b))).any) hit++;
    }
    return hit / trials;
  };

  console.log('\n== pappus-live statistics, with nothing attached ==\n');

  // 1. THE NUMBER THAT PICKED THE REPEAT COUNT, re-derived through the real code
  //    path rather than quoted from a comment.
  const far = (n) => shuffleTest(Array.from({ length: n }, (_, i) => i), Array.from({ length: n }, (_, i) => 100 + i));
  const table = [3, 4, 5, 7].map((n) => ({ n, ...far(n) }));
  for (const r of table) console.log(`       ${r.n} repeats a side -> ${String(r.arrangements).padStart(5)} arrangements, smallest p ${r.floorP.toFixed(4)}`);
  t('three repeats a side cannot express a verdict at all', table[0].floorP > PER_AXIS, `smallest p ${table[0].floorP.toFixed(3)} against a bar of ${PER_AXIS}`);
  t('four cannot either', table[1].floorP > PER_AXIS, `smallest p ${table[1].floorP.toFixed(3)}`);
  t('five can, which is why five is the default', table[2].floorP <= PER_AXIS, `smallest p ${table[2].floorP.toFixed(4)}`);
  const mine = far(TAKES);
  t('the repeat count THIS run is configured for can decide something', QUICK || mine.floorP <= PER_AXIS,
    `--takes ${TAKES} -> ${mine.arrangements} arrangements, smallest p ${mine.floorP.toFixed(4)}${QUICK ? ' (quick: expected to refuse)' : ''}`);

  // 2. IT CAN SAY NO. Two samples of ONE distribution must mostly not separate,
  //    and the rate has to sit under the bar — a test that never says no is not
  //    a test, and this is the arm that used to be a typed margin.
  const TRIALS = 600;
  const alarm = power(5, 0, TRIALS, true);
  t('two samples of the same distribution stay together', alarm <= 0.06,
    `${(alarm * 100).toFixed(1)}% of ${TRIALS} trials called them different, against a bar of ${(ALPHA * 100).toFixed(0)}%`);

  // 3. IT CAN SAY YES, and how loudly IS the resolution this file has. These are
  //    the numbers the repeat count was chosen from, re-measured every run.
  const p2 = power(5, 2, TRIALS), p3 = power(5, 3, TRIALS), p7 = power(7, 2, TRIALS);
  console.log(`       one axis, five repeats: ${(p2 * 100).toFixed(0)}% at 2 s.d. · ${(p3 * 100).toFixed(0)}% at 3 s.d.   |   seven repeats: ${(p7 * 100).toFixed(0)}% at 2 s.d.`);
  t('five repeats see an effect three times the wobble nine times in ten', p3 >= 0.8, `${(p3 * 100).toFixed(0)}% of ${TRIALS}`);
  t('five repeats see an effect twice the wobble only half the time', p2 > 0.35 && p2 < 0.7, `${(p2 * 100).toFixed(0)}% of ${TRIALS} — which is why the drift pair gets seven`);
  t('seven repeats see that same effect four times in five', p7 >= 0.7, `${(p7 * 100).toFixed(0)}% of ${TRIALS} at 2 s.d.`);

  // 4. SABOTAGE. Complete separation must land on the floor and identical
  //    numbers on the ceiling; if either drifts, the statistic is broken.
  t('two groups that do not overlap land on the smallest p there is', Math.abs(table[2].p - table[2].floorP) < 1e-9,
    `p ${table[2].p.toFixed(4)} of ${table[2].arrangements} arrangements`);
  const same = shuffleTest([1, 2, 3, 4, 5], [1, 2, 3, 4, 5]);
  t('two identical groups are as unremarkable as it gets', same.p === 1, `p ${same.p.toFixed(3)}`);

  // 5. THE SPREAD IS NOT DEGENERATE. The old estimator measured distance from
  //    the middle repeat, and the middle repeat's own distance is zero.
  const three = condition('x', [1, 5, 6].map((v) => ({ peak: 0.1, ratio: v, centroid: 1000, n: 1 })));
  t('the spread of three repeats is the middle PAIR, not the nearest one', three.spread.env === 4,
    `gaps 4 · 1 · 5 -> ${three.spread.env} (the old estimator answered 1)`);

  // 6. NOTHING ARRIVED IS A SENTENCE, NOT A CRASH.
  t('a condition with no captures reports nothing rather than throwing', condition('empty', []) === null && condition('empty', [{ n: 0 }]) === null);
  const noOct = condition('silent', Array.from({ length: 5 }, () => ({ peak: 0.001, ratio: 0.3, centroid: 0, n: 1 })));
  const halfCmp = compare(noOct, condition('b', fake(5)));
  t('an axis with nothing to measure abstains instead of voting', halfCmp.oct.usable === false && halfCmp.env.usable === true, halfCmp.oct.why);

  // 7. AND EVERY CHECK SAYS WHAT IT MEASURED OVER HOW MANY REPEATS — which is a
  //    claim about the OUTPUT, so it is checked on the output.
  const shown = evidence(compare(condition('a', fake(5)), condition('b', fake(5, { shiftOct: 4 }))));
  console.log(`       a verdict reads:  ${shown}`);
  t('a verdict names both axes, the shuffle count and the repeats behind it',
    shown.includes('envelope') && shown.includes('brightness') && shown.includes('shuffles reached it') && shown.includes('over 5+5 captures'));

  console.log(`\n${good}/${good + bad} green${bad ? `  (${bad} FAILED)` : ''}\n`);
  return bad === 0;
}

if (SELF) process.exit(selfTest() ? 0 : 1);

// ══ the live run ════════════════════════════════════════════════════════════
// Imported here rather than at the top so `--self-test` touches nothing that
// knows about a relay: "no board attached" should be true of the module graph
// too, not just of the run.
const { format, parse, randomId, RELAY_BASE } = await import('../../demo/shell/wire.mjs');
const FROM = `pl-${randomId(6)}`;
let seq = 0, pass = 0, fail = 0, skipped = 0;
const ok = (n, c, d = '') => { c ? pass++ : fail++; console.log(`  ${c ? 'ok  ' : 'FAIL'} ${n}${d ? `  ${d}` : ''}`); };
/** ⚠️ A CHECK THAT CANNOT ANSWER MUST SAY SO, not guess. Counted apart from both. */
const cannot = (n, why) => { skipped++; console.log(`  ----  ${n}  CANNOT DECIDE: ${why}`); };
/** A check with nothing to repeat: the box either answered or it did not. */
const okOnce = (n, c, d = '') => ok(n, c, `${d}${d ? ' · ' : ''}one answer from the box, nothing to repeat`);
/** A check whose verdict is a comparison of two distributions. */
const okStat = (n, cmp, extra = '') => {
  if (!cmp.decidable) return cannot(n, Number.isFinite(cmp.floorP)
    ? `${cmp.a.n}+${cmp.b.n} ${cmp.a.unit} can express no p-value below ${cmp.floorP.toFixed(2)}, and the bar is ${PER_AXIS}`
    : `neither axis could be measured on both sides — ${AXIS_KEYS.map((k) => cmp[k].why).filter(Boolean).join('; ')}`);
  ok(n, cmp.any, `${extra}${extra ? ' · ' : ''}${evidence(cmp)}`);
};
const note = (s) => console.log(`       ${s}`);
const sayCondition = (c) => {
  note(`${c.label.padEnd(34)} peak ${c.peak.toFixed(4)}  tail/peak ${c.ratio.toFixed(3)}  centroid ${Math.round(c.centroid)} Hz`);
  note(`${' '.repeat(34)} over ${c.n} ${c.unit}; two of them sit ${fmtAxis('env', c.spread.env)} env / ${fmtAxis('oct', c.spread.oct)} apart`);
};

const ws = new WebSocket(`${arg('relay', RELAY_BASE)}/room/${ROOM}/ws`);
ws.binaryType = 'arraybuffer';
const send = (m) => { const id = randomId(); ws.send(format(m, { from: FROM, seq: seq++, id })); return id; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let frames = [], replies = [], lastSeq = -1, gaps = 0, allFrames = 0;
ws.onmessage = (e) => {
  if (typeof e.data !== 'string') {
    const s = new DataView(e.data).getUint32(0, true);
    if (lastSeq >= 0 && s > lastSeq + 1) gaps += s - lastSeq - 1;
    lastSeq = s; allFrames++;
    frames.push(new Int16Array(e.data.slice(12)));
    return;
  }
  const { kind, msg } = parse(e.data);
  if (kind === 'json' && msg.from !== FROM) replies.push(msg);
};
const reply = (t, ms = 20000, pick = () => true) => new Promise((res, rej) => {
  const t0 = Date.now();
  const iv = setInterval(() => {
    const m = replies.find((r) => r.type === t && pick(r));
    if (m) { clearInterval(iv); res(m); } else if (Date.now() - t0 > ms) { clearInterval(iv); rej(new Error(`no ${t} in ${ms} ms — is a box in "${ROOM}"?`)); }
  }, 25);
});
const answer = (id, type, ms = 20000) => reply(type, ms, (r) => r.re === id);
/** One named engine command, straight through the box. See box.mjs `params.set`. */
const set = async (cmd, ...args) => {
  const r = await answer(send({ type: 'params.set', cmd, args }), 'params.set');
  if (!r.ok) throw new Error(`${cmd}: ${r.reason}`);
};

/**
 * One capture: play a note, collect what comes back, measure it.
 *
 * The granulator is not an instrument with an attack — it is a buffer being
 * read continuously — so the note is there to give the capture something with
 * a beginning. The measurement starts from the onset for the same reason the
 * patch test does: the first frames are still crossing the internet.
 */
async function once({ play = true, hold = 2600, settle = 250 } = {}) {
  frames = [];
  if (play) send({ type: 'note.on', note: 60, vel: 110 });
  await wait(hold);
  if (play) send({ type: 'note.off', note: 60 });
  if (settle) await wait(settle);
  return measure(frames);
}

/** n captures of one setting, summarised into a condition. */
async function takes(label, n = TAKES, opts = {}) {
  const got = [];
  for (let i = 0; i < n; i++) got.push(await once(opts));
  const c = condition(label, got, 'captures');
  // ⚠️ NO FRAMES IS A FINDING, NOT A CRASH. `condition` returns null when every
  // capture was empty — the stream stopped, the instrument died, the socket
  // dropped — and the next line then read `.peak` of null and took the whole
  // run down with a message about a property. "Nothing arrived" is a sentence
  // this file should be able to say.
  if (!c) {
    ok(`${label}: frames arrived at all`, false, `${n} captures, every one empty — nothing is streaming`);
    throw new Error(`no audio during "${label}" — the box stopped sending`);
  }
  sayCondition(c);
  return c;
}

/**
 * ⚠️ A ROLL TURNS THE DRIFT BACK ON, AND THE BOX IS RIGHT TO DO IT.
 *
 * `box.mjs`'s `params.random` ends with `pappus().startDrift()` — "movement is
 * on by default once there is something to move" — so **`params.drift off`
 * followed by a roll leaves the drift RUNNING**. Every roll in this file was
 * followed by captures taken on the belief that nothing was moving, and the
 * seed section re-armed it TEN TIMES. Measured consequence, 2026-09-13: two
 * applications of one seed landed 0.091 env / 0.18 oct apart while two
 * DIFFERENT seeds landed 0.009 / 0.04 apart — the wobble ten times the effect,
 * which is what continuous movement does to a set of captures taken minutes
 * apart. The order is what matters: off AFTER the roll, never before.
 *
 * `drift: true` is for the one section that wants it.
 */
async function roll(seed, { drift = false } = {}) {
  const r = await answer(send({ type: 'params.random', seed }), 'params.rolled');
  if (!drift) await answer(send({ type: 'params.drift', on: false }), 'params.drifted');
  return r;
}
/** How many nudges the drift has made — the way to prove it is not moving. */
const nudges = async () => (await answer(send({ type: 'params.state' }), 'params.state')).drift?.nudges ?? null;

/** One application of a seed, averaged over PER_APP captures. The seed checks repeat THIS. */
async function application(seed) {
  const rolled = await roll(seed);      // through roll(), so the drift goes back off
  await wait(1200);
  const got = [];
  for (let i = 0; i < PER_APP; i++) got.push(await once());
  const c = condition(`seed ${seed}`, got, 'captures');
  return { roll: rolled, value: c && { peak: c.peak, ratio: c.ratio, centroid: c.centroid, n: 1 } };
}

await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('relay would not open')); });
const partial = [QUICK && 'QUICK: short waits and two repeats — the shuffle tests will refuse to decide',
                 only && `ONLY ${[...RUN].join(', ')} — the rest was not run`].filter(Boolean);
console.log(`\n== pappus, live in "${ROOM}" ==\n`);
note(`${TAKES} captures a condition (${TAKES_DRIFT} for the drift), ${APPS} rolls a seed · a difference is a verdict only when fewer than 1 shuffle in ${Math.round(1 / PER_AXIS)} reaches it, on one of two axes`);
for (const p of partial) console.log(`   ⚠ ${p}`);
console.log('');

const SILENCE = 0.004;   // ≈ -48 dBFS: the line between "it sounds" and "it does not", not a tuned bound
const sounded = (c) => c.all.filter((t) => t.peak > SILENCE).length;

try {
  // ── raise the chain ───────────────────────────────────────────────────────
  // hexter is the feeder: an insert can only reach what is on the JACK graph,
  // and fluidsynth writes to a pipe.
  console.log('  raising hexter (a JACK chain takes ~13 s) ...');
  const s = await answer(send({ type: 'audio.start', source: 'hexter' }), 'audio.started', 60000);
  okOnce('a JACK instrument is up for the insert to wrap', s.ok !== false, s.source ?? '');

  console.log('  switching pappus on (first time compiles 2,030 lines, ~40 s) ...');
  const fx = await answer(send({ type: 'fx.pappus', on: true }), 'fx.pappus', 90000);
  okOnce('pappus is inserted', fx.ok === true, fx.reason ?? `wrapping ${fx.instrument}`);
  if (!fx.ok) throw new Error(fx.reason);

  // ⚠️ PRIME THE BUFFER. Pappus granulates a 60-second recording of its input,
  // and that recording starts EMPTY — so the first capture read `peak 0.0000,
  // centroid 0 Hz` and the "same seed twice" control failed on silence against
  // sound rather than on anything to do with the roll. Play into it first.
  console.log('  priming the grain buffer (it starts empty, and an empty granulator is silent) ...');
  for (const n of [48, 55, 60, 64, 67]) { send({ type: 'note.on', note: n, vel: 110 }); await wait(700); send({ type: 'note.off', note: n }); }
  await wait(1500);

  // ⚠️ FREEZE EVERYTHING THAT IS NOT UNDER TEST, HERE, FOR EVERY SECTION.
  //
  // The buffer, because the granulator records its input continuously: between
  // two repeats of one condition the material has MOVED ON, so a comparison was
  // measuring the recording rather than the setting. It failed exactly that way
  // — 0.12 octaves apart against a 0.06 floor. `lock` holds what is in there.
  //
  // The drift, because it moves the sound on its own: the repeats of one
  // condition span about fifteen seconds and the gap between conditions about
  // twenty, so with the drift running the between-condition difference is bigger
  // for a reason that has nothing to do with the thing under test. Measured, it
  // failed that way too — 0.20 octaves against a 0.09 floor. The drift has its
  // own section, which switches it back on and off again.
  await set('mlock', 1); await set('nlock', 1);
  await set('msrc', 1); await set('nsrc', 1);
  await answer(send({ type: 'params.drift', on: false }), 'params.drifted');

  const SEED_A = 424242, SEED_B = 8675309;

  // ── the die ───────────────────────────────────────────────────────────────
  if (RUN.has('seeds')) {
    // ⚠️ INTERLEAVED, A B A B A B. Five rolls of A and then five of B would put
    // every A capture before every B one, so anything that moves slowly over the
    // half-minute is indistinguishable from the seed. Alternating spends the
    // same time and removes it.
    console.log(`  rolling ${APPS} applications of each seed, alternating (${PER_APP} captures each) ...`);
    const nudged0 = await nudges();
    const appsA = [], appsB = [];
    for (let i = 0; i < APPS; i++) { appsA.push(await application(SEED_A)); appsB.push(await application(SEED_B)); }
    // ⚠️ THE CONTROL FOR THE ROLL RE-ARMING THE DRIFT, which is the defect this
    // whole section was measured through once. Counted on the BOX's side of the
    // wire, so it is evidence about the engine rather than about what we sent.
    const nudged1 = await nudges();
    ok('nothing moved on its own while the seeds were measured', nudged1 === nudged0,
      `${nudged1 - nudged0} nudges across ${APPS * 2} rolls and ${APPS * 2 * PER_APP} captures — a roll turns the drift back on, so this is the control for that`);

    const rA = appsA[0].roll;
    okOnce('a roll names its character and carries its seed back',
      rA.ok && rA.seed === SEED_A && typeof rA.character?.m === 'string' && rA.character.m !== rA.character.n,
      `${rA.character?.m}/${rA.character?.n} · seed ${rA.seed}`);

    // ⚠️ THE SAME SEED DOES NOT REPRODUCE THE SAME SOUND, AND ASSERTING THAT IT
    // DID WAS WRONG. Chased properly — drift off, buffer frozen, so parameters
    // and material are both held still — two applications of 424242 still landed
    // 0.37 octaves apart against a 0.02 floor. The cause is in the engine and is
    // not a defect: the grain scheduler draws from its own free-running noise
    // (`TRand`, and a per-voice `prnd`/`frnd` pair) which nothing reseeds, and
    // the grains read scattered positions in a sixty-second buffer. Two runs of
    // one setting therefore hear different material by design.
    //
    // So the reproducibility claim goes where it is TRUE and checkable: the seed
    // reproduces the PARAMETERS, asserted against the box's own report rather
    // than by ear — and now across all five applications, not two.
    const sameParams = appsA.every((a) => JSON.stringify(a.roll.m) === JSON.stringify(rA.m)
      && JSON.stringify(a.roll.n) === JSON.stringify(rA.n) && a.roll.character?.m === rA.character?.m);
    ok('the same seed reproduces the same parameters', sameParams,
      `${APPS} applications of ${SEED_A}, all identical · ${rA.character?.m}/${rA.character?.n} · rates ${rA.m?.rate}/${rA.n?.rate}`);

    const condA = condition(`seed ${SEED_A} (${rA.character?.m}/${rA.character?.n})`, appsA.map((a) => a.value), 'rolls');
    const condB = condition(`seed ${SEED_B} (${appsB[0].roll.character?.m}/${appsB[0].roll.character?.n})`, appsB.map((a) => a.value), 'rolls');
    if (!condA || !condB) { ok('the seed rolls were audible at all', false, 'every capture was empty'); throw new Error('no audio during the seed rolls'); }
    sayCondition(condA);
    sayCondition(condB);
    // ⚠️ THE FLOOR IS MEASURED, AND MEASURED MORE THAN ONCE. This spread is how
    // far apart two applications of ONE seed land — ten pairs of it, not the
    // single pair that used to be the whole floor and moved between 0.045 and
    // 0.126 from run to run.
    note(`the same seed lands ${fmtAxis('env', condA.spread.env)} env / ${fmtAxis('oct', condA.spread.oct)} apart from itself, over ${(APPS * (APPS - 1)) / 2} pairs — THAT is the floor`);
    okStat('two different seeds sound further apart than two rolls of one seed', compare(condA, condB));
  }

  // ── the drift ─────────────────────────────────────────────────────────────
  // Nothing is sent between these two blocks. If they differ, the box moved the
  // sound on its own, which is the whole claim.
  if (RUN.has('drift')) {
    await answer(send({ type: 'params.drift', on: true }), 'params.drifted');
    await wait(1000);
    const d0 = await answer(send({ type: 'params.state' }), 'params.state');
    okOnce('the drift is running when it is asked for', d0.drift?.on === true, `${d0.drift?.nudges} nudges so far`);

    const m1 = await takes('drift, first look', TAKES_DRIFT);
    // ⚠️ NINETY SECONDS, BECAUSE FORTY-FIVE IS NOT ENOUGH TO HEAR. The drift's
    // slowest parameter has a 181 s period (`scan`, the one that changes WHAT
    // you are hearing), so 45 s is a quarter cycle — measured, it moved the
    // sound 0.15 octaves while the granulator wobbles 0.15 on its own. Half a
    // cycle is both the shortest wait that asks the question properly and the
    // furthest that parameter ever gets from where it started; waiting longer
    // brings it back, so this effect cannot be made bigger, only measured more.
    // That is why this pair gets seven captures and everything else gets five.
    console.log(`  waiting ${QUICK ? 20 : 90} s with NOTHING sent ...`);
    await wait(QUICK ? 20000 : 90000);
    const m2 = await takes('drift, 90 s later, nothing sent', TAKES_DRIFT);
    const moved = compare(m1, m2);
    const d1 = await answer(send({ type: 'params.state' }), 'params.state');
    note(`scan walked ${d0.drift?.scan} -> ${d1.drift?.scan} · ${d1.drift.nudges - d0.drift.nudges} nudges in the gap`);
    okStat('the sound moves on its own, with nothing sent', moved);
    // A BOUND, NOT A COMPARISON, and it is labelled one: "it did not run away"
    // is a claim about SIZE, and no amount of repeating turns a size into a
    // significance. What the repeats buy here is that the number being bounded
    // is a middle rather than one capture.
    if (moved.oct.d === null) cannot('...and it did not wander out of the character it was given', 'no brightness to measure on one side');
    else ok('...and it did not wander out of the character it was given', moved.oct.d < 2.5,
      `brightness moved ${fmtAxis('oct', moved.oct.d)} — a bound on the size, over ${m1.n}+${m2.n} captures, not a shuffle test`);
    await answer(send({ type: 'params.drift', on: false }), 'params.drifted');
    await wait(500);
  }

  // ── 1965 ──────────────────────────────────────────────────────────────────
  if (RUN.has('err')) {
    const found = await answer(send({ type: 'source.search', limit: 100 }), 'source.found', 30000);
    okOnce('the box can reach ERR\'s 1965 audio archive', found.ok && found.total > 500,
      `${found.total} items, page of ${found.items.length}`);

    // ⚠️ THE REFERENCE IS TAKEN HERE, NOT REUSED FROM THE SEED SECTION MINUTES
    // AGO. It used to compare the 1965 takes against a seed-section condition
    // captured before the drift section ran — so "the material changed" was
    // being asked across a gap in which the drift had been switched on, left
    // running for two minutes, and the comparison could have been answering
    // about that instead. Same roll, same second, one difference: what is in
    // the buffer.
    await roll(SEED_A);
    await wait(1200);
    const synth = await takes(`the synth under seed ${SEED_A}`);

    const pick = found.items[7];
    const loaded = await answer(send({ type: 'source.load', slug: pick.slug, atSec: 120, dur: 60 }), 'source.loaded', 90000);
    okOnce('a minute of 1965 lands in the grain buffers', loaded.ok === true,
      loaded.ok ? `${loaded.date} · ${loaded.title} · ${loaded.tookMs} ms · ${loaded.buffers} buffers` : loaded.reason);
    if (!loaded.ok) throw new Error(loaded.reason);
    await wait(2000);

    // The SAME roll, so the only thing that changed is what is in the buffer.
    await roll(SEED_A);
    await wait(1200);
    const err = await takes(`1965 under seed ${SEED_A}`);
    // A DETECTION, NOT A COMPARISON: sound against no sound is categorical, so
    // it is counted rather than shuffled, and it says how many captures cleared.
    ok('...and it makes a sound', err.peak > SILENCE,
      `${sounded(err)} of ${err.n} captures above ${SILENCE} · middle peak ${err.peak.toFixed(4)} — a silence line, not a tuned threshold`);
    okStat('the same roll over 1965 sounds unlike the same roll over the synth', compare(synth, err));

    // ⚠️ THE REGRESSION GUARD FOR THE BUG THAT MADE ALL OF THIS UNREADABLE.
    // `src 1` zeroes the record gain but the write head keeps going, and with
    // nothing retaining the old sample it writes SILENCE over the whole live
    // window in one pass — one to twelve seconds. So a capture started right
    // after the load caught the material on its way out, and every reading of
    // this feature was right about the second it was taken and wrong about the
    // feature. A single capture cannot tell "loaded" from "loaded and already
    // being erased"; only a second one, later, can. `lock` is what holds it.
    //
    // Counted, not shuffled, for the same reason as above: the defect it guards
    // takes the peak to 0.0000 (measured: 0.1061 -> 0.0000), so the question is
    // whether there is a sound at all, not whether two sounds differ.
    console.log(`  waiting ${QUICK ? 8 : 25} s to see whether the material is still there ...`);
    await wait(QUICK ? 8000 : 25000);
    const still = await takes('1965, 25 s after loading');
    ok('the loaded minute is HELD, not erased under the write head',
      still.peak > SILENCE && sounded(still) === still.n,
      `${sounded(still)} of ${still.n} captures still above ${SILENCE} · middle peak ${still.peak.toFixed(4)} against ${err.peak.toFixed(4)} at the load`);
  }

  // ── does a key pitch the grains? ─────────────────────────────────────────
  //
  // ⚠️ THIS CANNOT BE ASKED OF 1965 THROUGH THE WHOLE CHAIN, and asking it that
  // way read FAILED for a day against an engine that was working. Two reasons,
  // both about measuring the quantity in question:
  //
  //   the CHAIN — 48 resonators tuned to a fixed chord, eight delay taps and a
  //   reverb sit between the grains and the capture, and not one of them follows
  //   a key. Through a resonator-heavy roll, pressing four octaves moved the
  //   measured brightness by -0.05 octaves per octave. Through a roll that goes
  //   straight out, the same four octaves moved it by 1.77.
  //
  //   the MATERIAL — a two-second spectral centroid of grains scattered over a
  //   minute of SPEECH is dominated by which words the grains landed on. The
  //   same sweep gave -1.92 octaves at -12 semitones (right) and +0.34 at -12
  //   on the next capture (nonsense). Speech has no pitch to measure.
  //
  // So this records ONE HELD NOTE into the buffer, locks it, mutes everything
  // that cannot follow a key, and sweeps. Measured that way the ladder is
  // monotonic and unambiguous: 251 · 335 · 473 · 878 · 1578 Hz.
  //
  // It asserts DIRECTION AND ORDER rather than exact ratios. Pitching a harmonic
  // series up moves a centroid by more than the pitch ratio as upper partials
  // come into the band, so "+12 semitones is exactly +1.00 octaves" is a claim
  // about the spectrum of the material, not about the engine.
  if (RUN.has('pitch')) {
    await answer(send({ type: 'source.clear' }), 'source.cleared');
    await answer(send({ type: 'params.drift', on: false }), 'params.drifted');
    // ⚠️ ROLL FIRST, and a KNOWN seed. This block inherits whatever the previous
    // checks left behind — a tilt that buries the recording, a contour, a window
    // — and it recorded 50x quieter in the suite than the same code did standing
    // alone, for exactly that reason. Every parameter the sweep depends on is
    // either rolled here or set below; nothing is inherited.
    //
    // ⚠️ AND THROUGH `roll()`, WHICH PUTS THE DRIFT BACK OFF. A bare
    // `params.random` re-arms it, so the `params.drift off` that used to sit on
    // the line ABOVE this one was undone by the line itself, and the whole
    // sweep ran with six parameters walking under it.
    await roll(SEED_B);

    // ── THE GEOMETRY GOES IN BEFORE THE RECORDING, NOT AFTER IT ─────────────
    //
    // ⚠️ THIS BLOCK USED TO RECORD INTO ONE BUFFER AND READ OUT OF ANOTHER.
    // `mbuflen` is not a read setting — `Engine_Pappus.sc:537` makes it the
    // LIVE LENGTH of the ring, "only the first mbuflen seconds of it are live",
    // so it governs where the write head goes as much as where the read head
    // looks. Setting it to 4 s AFTER a six-second note had been recorded into
    // whatever length the previous section left meant the window at 45–55%
    // pointed into a region the note might never have reached. Set first, the
    // six-second note wraps a four-second ring and fills it end to end, so
    // every position in it is the note and the window cannot miss.
    await set('mbuflen', 4);
    // ⚠️ A NARROW WINDOW, BECAUSE THE SCATTER IS THE NOISE. With the window open
    // across the whole four seconds, every grain reads a DIFFERENT slice of the
    // recorded note, so a rung's own spread came out at 0.09, 0.14, 0.38 and 0.41
    // octaves on four consecutive runs — swamping the 0.28-octave step being
    // measured, and no number of repeats fixes a variance this large. Pinning the
    // read head to a tenth of the buffer means every grain reads nearly the same
    // material and the only thing left varying is the pitch, which is the
    // quantity in question. Remove the noise; do not out-average it.
    await set('mscan', 0.5);
    await set('mwinstart', 0.45); await set('mwinend', 0.55);
    // ⚠️ AND PIN THE MODES, which the roll otherwise chooses. `scanmode` 3 and 4
    // are DELAY SYNC and DELAY FREE — the read head moves on its own — so a run
    // that happened to roll one read a rung spread of 0.83 octaves where a run
    // that rolled POSITION read 0.06. That is not noise in the instrument, it is
    // a different instrument, and leaving it to the die makes the whole check
    // pass or fail on the roll. `contour` is pinned for the same reason: it is
    // the grain envelope, and an envelope change is a spectrum change.
    await set('mscanmode', 2);      // 2 POSITION — a static read head
    await set('mcontour', 8);       // a mid envelope shape, fixed across runs
    await set('mtilt', 0); await set('ntilt', 0);   // baked in at RECORD time — neutral
    await set('msos', 0); await set('nsos', 0);     // do not freeze while recording

    // ── RECORD THE NOTE ────────────────────────────────────────────────────
    //
    // ⚠️ SAY WHAT RECORDING IS, RATHER THAN INHERIT IT. `src` is **1 OFF,
    // 2 STEREO, 3 MONO L, 4 MONO R, and there is no 0** (CHAIN.md; a value
    // outside the table is silence, not an error). `source.clear` above does
    // hand the buffers back — `mlock 0, msrc 2` — but this block's own comment
    // claims nothing is inherited, and these two were the only parameters it
    // was inheriting, which is the pair that decides whether anything is
    // recorded at all. Now it says so.
    await set('mlock', 0); await set('nlock', 0);
    await set('msrc', 2); await set('nsrc', 2);     // 2 = STEREO
    await wait(800);
    send({ type: 'note.on', note: 60, vel: 110 });
    await wait(6000);
    send({ type: 'note.off', note: 60 });
    // ⚠️ LOCK FIRST, THEN OFF, AND THE OTHER ORDER ERASES WHAT WAS JUST PLAYED.
    // From the engine's own arithmetic (Engine_Pappus.sc:489-508, quoted in
    // pappus.mjs): `sos = msos.max(mlock)`, `sosret = (sos*1.05).clip(0,1)`,
    // `sosin = ((1-sos)*4).clip(0,1) * run * (ssel > 1.5)`. With `src` 1 and
    // `lock` still 0, BOTH terms are zero and `BufWr` writes `0·new + 0·old` —
    // silence, sweeping the live window in real time. This block sent `msrc 1`
    // and then waited TWO RELAY ROUND TRIPS for `mlock 1` to land, erasing the
    // head of the recording it was about to measure. `lock 1` on its own
    // already does both jobs: `sosret` 1 holds the material and `sosin` 0 stops
    // the input being mixed in. ⚠️ `loadBuffers` uses the opposite order and is
    // right to — it `snapread`s the buffers immediately afterwards, so it has
    // something to restore from. This has nothing.
    await set('mlock', 1); await set('nlock', 1);
    await set('msrc', 1); await set('nsrc', 1);

    // ── MUTE EVERYTHING THAT CANNOT FOLLOW A KEY ───────────────────────────
    // `oin1 1` with `pin1/sin1/kin1` at 0 is the routing matrix's documented
    // dry path — granulator one straight to the output, no recompile (CHAIN.md).
    await set('pamp', ...Array(48).fill(0));
    await set('taplevels', ...Array(8).fill(0));
    for (const k of ['pwet', 'swet', 'rverb', 'noise', 'drive', 'crush',
                     'pin1', 'pin2', 'sin1', 'sin2', 'kin1', 'kin2']) await set(k, 0);
    await set('oin1', 1); await set('oin2', 0);
    await set('mrate', 12); await set('msize', 0.2); await set('mspray', 0); await set('mswarm', 0);
    await set('mswarmmode', 1); await set('mspraymode', 1);
    await set('melen', 1); await set('epattern', ...Array(16).fill(1));
    await set('gates', 1, 0, 0, 0, 0, 0, 0, 0);
    await set('gates2', 0, 0, 0, 0, 0, 0, 0, 0);
    await set('probs', 1, 1, 1, 1, 1, 1, 1, 1);
    await wait(1500);
    // Captures a rung, for the same reason everything above has them. With one
    // each it read -12:272 · -7:443 · 0:684 · +7:553 · +12:892 — a rung going
    // DOWN in the middle of a rise that is otherwise obvious, which failed the
    // whole check on one unlucky capture.
    // ── IS THERE A SOUND TO MEASURE THE PITCH OF? ──────────────────────────
    //
    // ⚠️ THE SWEEP USED TO ASSUME ITS OWN RECORDING WORKED, and on 2026-09-13
    // it did not: five rungs, twenty-five captures, `peak 0.0000` on every one,
    // reported as three failed claims about PITCH. Silence and a pitch that
    // will not move look identical in a centroid, so the run said "a higher key
    // does not pitch the grains up" about an engine nobody had shown was making
    // a sound. One capture before the sweep separates them, and the sweep is a
    // minute of captures that is pointless without it.
    await set('pitches', 0, 0, 0, 0, 0, 0, 0, 0);
    await wait(700);
    const heard = await once({ play: false, hold: 2400, settle: 0 });
    let blocked = null;
    if (!(heard.peak > SILENCE)) {
      // ⚠️ AND WHEN IT IS SILENT, MEASURE WHY — here, in this run, rather than
      // leaving the next session to guess between three causes with identical
      // output. Two probes, in order, each one ruling out a family:
      //
      //   the WHOLE buffer instead of a tenth of it — if that sounds, the note
      //   was recorded somewhere the narrow window was not looking, and the
      //   fault is the read geometry;
      //
      //   the LIVE INPUT, recording again — if that sounds, the signal path out
      //   of the granulator is fine and the buffer was simply empty, so the
      //   fault is the recording;
      //
      //   neither — the fault is downstream of the buffer, in the mute block
      //   above, and has nothing to do with the material at all.
      note('nothing came back from the recorded note — probing why, which costs ~6 s and only happens when it has already failed');
      await set('mwinstart', 0); await set('mwinend', 1);
      const wide = await once({ play: false, hold: 2400, settle: 0 });
      await set('mlock', 0); await set('nlock', 0);
      await set('msrc', 2); await set('nsrc', 2);
      const live = await once({ hold: 2400, settle: 250 });
      note(`probes: narrow window ${heard.peak.toFixed(4)} · whole buffer ${wide.peak.toFixed(4)} · live input ${live.peak.toFixed(4)}  (silence is under ${SILENCE})`);
      const st = await answer(send({ type: 'params.state' }), 'params.state');
      note(`the box's own state: rate ${st.roll?.m?.rate} · size ${st.roll?.m?.size} · scanmode ${st.roll?.m?.scanmode} · drift ${st.drift?.on ? 'ON — it should be off' : 'off'} · source ${st.source ? st.source.title : 'none'}`);
      blocked = wide.peak > SILENCE
        ? `the note WAS recorded but the narrow window missed it — whole buffer ${wide.peak.toFixed(4)} against ${heard.peak.toFixed(4)} through 45-55%. The read geometry is wrong, not the engine`
        : live.peak > SILENCE
          ? `the grain buffer came back EMPTY — the live input reads ${live.peak.toFixed(4)} through the same routing, so the signal path is fine and the six-second recording never landed`
          : `nothing reaches the output at all, buffer or live input — the fault is downstream of the grains, in the stages this section mutes, and is not about the material`;
    }
    if (blocked) {
      // ⚠️ ABSTAIN, DO NOT FAIL. Three checks about PITCH cannot be answered
      // when there is no sound, and answering them anyway is how a silent
      // granulator got reported as a granulator that will not follow a key.
      for (const n of ['every rung of the pitch ladder sounds',
                       'the rungs rise in order',
                       'the top of the ladder is further from the bottom than a rung is from itself']) cannot(n, blocked);
    } else {
      note(`the recorded note reads peak ${heard.peak.toFixed(4)} before the sweep — there is a sound to measure the pitch of`);
      const ladder = [];
      for (const st of [-12, -7, 0, 7, 12]) {
        await set('pitches', st, 0, 0, 0, 0, 0, 0, 0);
        await wait(700);
        const got = [];
        for (let i = 0; i < TAKES; i++) got.push(await once({ play: false, hold: 2400, settle: 0 }));
        const c = condition(`${st > 0 ? '+' : ''}${st} semitones`, got, 'captures');
        if (!c) { ok(`the ladder at ${st} semitones was audible at all`, false, `${TAKES} captures, every one empty`); throw new Error('no audio during the pitch ladder'); }
        ladder.push(c);
      }
      note(`pitch ladder  ${ladder.map((c) => `${c.label.split(' ')[0]}:${Math.round(c.centroid)}Hz`).join('  ')}   (middle of ${TAKES} captures each)`);
      note(`each rung's own spread  ${ladder.map((c) => fmtAxis('oct', c.spread.oct)).join('  ')}`);
      ok('every rung of the pitch ladder sounds', ladder.every((c) => c.peak > SILENCE),
        `${ladder.map((c) => `${sounded(c)}/${c.n}`).join(' ')} captures above ${SILENCE} · peaks ${ladder.map((c) => c.peak.toFixed(3)).join(' ')}`);

      // ⚠️ ONLY THE UPWARD RUNGS ARE ASSERTED, AND THE REASON IS THE MEASURE.
      // Over three runs the rungs at or below zero all landed between 225 and
      // 434 Hz in no reliable order — -12 read HIGHER than 0 in one of them —
      // while +7 and +12 were clean and far above every time. That is not the
      // engine being erratic downward: a grain clock at 12/s with a 0.2 s envelope
      // puts a broadband floor under everything, and when the pitched partials
      // move DOWN into it the centroid stops following them. Brightness can see a
      // grain pitched up and cannot see one pitched down.
      const up = ladder.slice(2);
      const steps = up.slice(1).map((c, i) => compare(up[i], c));
      note(`per step: ${steps.map((st) => `${fmtAxis('oct', st.oct.d)} (p ${st.oct.p == null ? '—' : st.oct.p.toFixed(3)})`).join(' · ')}`);
      // ⚠️ REPORTED AND NOT ASSERTED, WITH THE NUMBER THAT SAYS WHY. A rung's own
      // spread is about 0.38 octaves and one seven-semitone step moves about 0.29
      // — an effect SMALLER than the wobble, which needs about 19 captures a rung
      // to resolve, or five minutes of this run for one line of output. So this
      // instrument can see an octave of key and cannot see half of one, and
      // saying that is better than asserting it and going amber every third run.
      note(`a step of a fifth moves LESS than a rung wobbles on its own, so it is printed and never asserted — resolving it would need about 19 captures a rung, five minutes of this run for one line`);
      const ordered = up.every((c, i) => i === 0 || c.centroid > up[i - 1].centroid);
      ok('the rungs rise in order', ordered,
        `${up.map((c) => Math.round(c.centroid) + ' Hz').join(' -> ')} · middles of ${TAKES} captures each${ordered ? '' : ' — OUT OF ORDER'}`);
      const ends = compare(up[0], up[up.length - 1]);
      okStat('the top of the ladder is further from the bottom than a rung is from itself', ends,
        `${Math.round(up[0].centroid)} Hz -> ${Math.round(up[up.length - 1].centroid)} Hz`);
      // Brightness is a PROXY for pitch and it over-reads: pitching a harmonic
      // series up brings upper partials into the band, so the centroid climbs
      // faster than the pitch ratio — measured 3.23 octaves of brightness for the
      // two octaves of key the sweep once asked for. How much faster depends on
      // the spectrum of whatever was recorded, which is not a property of the
      // engine, so an upper bound would be asserting something nobody can predict.
      note(`${Math.log2(up[up.length - 1].centroid / up[0].centroid).toFixed(2)} octaves of brightness for the octave of key above zero — a proxy that over-reads, which is why only the direction is asserted`);

    }
  }

  // ── the frame rate, which is the tell for two sources at once ────────────
  ok('one clean source, not two', gaps < allFrames * 0.05,
    `${allFrames} frames, ${gaps} dropped at the relay · counted over the whole run, nothing to average`);

  send({ type: 'source.clear' });
  send({ type: 'note.panic' });
} catch (e) {
  fail++;
  console.log(`\n  FAIL ${e.message}`);
}

const checks = pass + fail + skipped;
console.log(`\n${pass}/${checks} green${fail ? `  (${fail} FAILED)` : ''}${skipped ? `  (${skipped} could not decide)` : ''}`);
for (const p of partial) console.log(`   ⚠ ${p}`);
console.log(partial.length ? '   ⚠ NOT A VERDICT\n' : '');
ws.close();
// A check that could not decide is a failure of the run, not of the engine —
// unless the run asked for it by being short.
process.exit(fail || (skipped && !QUICK) ? 1 : 0);
