// node pappus-live.mjs --room studio-1 [--only S] [--instrument <src>] | --self-test.
// Grades by ear with shuffle tests over repeats (5 a condition, 7 for drift); refuses a live run by
// default (exit 2) since no instrument is left to wrap. One run at a time; never pipe into `tail`.
// why: lessons/rig-board-synth.md#pl-header
import { measure } from './measure.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
// `--quick` (two repeats, short waits) and `--only` print that they are partial, and refuse the
// statistical verdicts: two repeats cannot express p below 0.33.
// why: lessons/rig-board-synth.md#pl-quick
const QUICK = process.argv.includes('--quick');
const SELF = process.argv.includes('--self-test');
// The sections; the old `err` section's erase guard lives on in `pitch`, which records and locks
// too.
// why: lessons/rig-board-synth.md#pl-sections
const SECTIONS = ['seeds', 'drift', 'pitch'];
const only = arg('only', null);
const RUN = new Set(only ? only.split(',').map((s) => s.trim()) : SECTIONS);
for (const s of RUN) if (!SECTIONS.includes(s)) { console.error(`unknown section "${s}" — pick from ${SECTIONS.join(' | ')}`); process.exit(2); }
const ROOM = arg('room', 'studio-1');
const INSTRUMENT = arg('instrument', null);
if (!SELF && !INSTRUMENT) {
  console.log('\nREFUSED: the granulator wraps only a JACK instrument (board.mjs `inst.jack`), and this board has none');
  console.log('since Yoshimi left on 2026-10-13 (archive/yoshimi/README.md). The sampler and the Circuit are on JACK');
  console.log('but are not the instrument slot, so fx.pappus would refuse and nothing here could be graded.');
  console.log('Name one with --instrument <source> on a board that has it, or run --self-test. Nothing was sent.\n');
  process.exit(2);
}
/** Repeats a condition. See "why five" above; `--takes` is for experiments, not for making a run pass. */
const TAKES = Math.max(1, Number(arg('takes', QUICK ? 2 : 5)));
const TAKES_DRIFT = QUICK ? TAKES : Math.max(TAKES, 7);
const APPS = QUICK ? 2 : 5;      // applications of a seed, the unit for the seed checks; why: lessons/rig-board-synth.md#pl-apps
const PER_APP = QUICK ? 1 : 2;   // captures inside one application, averaged into it

// The statistics: pure, so --self-test can prove the guards fire.
// why: lessons/rig-board-synth.md#pl-stats

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

// Two axes so loudness alone cannot pass as a different sound; each look must clear 2.5%.
// why: lessons/rig-board-synth.md#pl-axes
const AXES = {
  env: { name: 'envelope', of: (t) => t.ratio, show: (v) => v.toFixed(3), unit: '' },
  oct: { name: 'brightness', of: (t) => (t.centroid > 0 ? Math.log2(t.centroid) : null), show: (v) => v.toFixed(2), unit: ' oct' },
};
const AXIS_KEYS = Object.keys(AXES);
const ALPHA = 0.05;
const PER_AXIS = ALPHA / AXIS_KEYS.length;
// Below two wobbles a run cannot see an effect, so it abstains rather than claiming sameness.
// `spread` is a median pairwise distance: 0.954 standard deviations.
// why: lessons/rig-board-synth.md#pl-resolves
const RESOLVES = 2;
const SPREAD_TO_SD = 0.954;
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

// Every split of n into `na` and the rest: exact while countable, a fixed-seed sample beyond it.
// why: lessons/rig-board-synth.md#pl-cap
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

// A rank-sum statistic, not a difference of medians (which ties and leaves zero power at n = 5).
// why: lessons/rig-board-synth.md#pl-shuffle
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
  // Exact enumeration includes the real split; a sample does not, hence +1.
  // why: lessons/rig-board-synth.md#pl-plus-one
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

// A condition is several repeats: a middle and a spread; `unit` names what was repeated.
// why: lessons/rig-board-synth.md#pl-condition
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
    // The spread is the median pairwise distance between repeats, not distance from the middle one.
    // why: lessons/rig-board-synth.md#pl-spread
    c.spread[k] = xs.length > 1 ? median(pairwise(xs)) : null;
  }
  return c;
}

// Is B a different sound from A, by more than re-splitting their own repeats gets?
// why: lessons/rig-board-synth.md#pl-compare
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
    // The wobble these two conditions showed on this axis, and whether the
    // difference between them is big enough that this many repeats had a real
    // chance of finding it.
    r.sigma = Math.max(A.spread?.[k] ?? 0, B.spread?.[k] ?? 0) / SPREAD_TO_SD;
    r.couldSee = r.sigma > 0 && r.d >= RESOLVES * r.sigma;
    out[k] = r;
  }
  out.any = AXIS_KEYS.some((k) => out[k].clears);
  out.decidable = AXIS_KEYS.some((k) => out[k].decidable);
  out.couldSee = AXIS_KEYS.some((k) => out[k].couldSee);
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

// The self-test breaks the guards on purpose, no relay or board, and re-derives the repeat count.
// why: lessons/rig-board-synth.md#pl-self-test
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
  // The effect goes on one axis, as in reality; shifting both flatters power (75% against 53%).
  // why: lessons/rig-board-synth.md#pl-power
  const power = (n, shift, trials, both = false) => {
    let hit = 0;
    for (let i = 0; i < trials; i++) {
      const b = both ? { shiftEnv: shift, shiftOct: shift } : { shiftOct: shift };
      if (compare(condition('a', fake(n)), condition('b', fake(n, b))).any) hit++;
    }
    return hit / trials;
  };

  console.log('\n== pappus-live statistics, with nothing attached ==\n');

  // 1. The number that picked the repeat count, through the real code path.
  // why: lessons/rig-board-synth.md#pl-1
  const far = (n) => shuffleTest(Array.from({ length: n }, (_, i) => i), Array.from({ length: n }, (_, i) => 100 + i));
  const table = [3, 4, 5, 7].map((n) => ({ n, ...far(n) }));
  for (const r of table) console.log(`       ${r.n} repeats a side -> ${String(r.arrangements).padStart(5)} arrangements, smallest p ${r.floorP.toFixed(4)}`);
  t('three repeats a side cannot express a verdict at all', table[0].floorP > PER_AXIS, `smallest p ${table[0].floorP.toFixed(3)} against a bar of ${PER_AXIS}`);
  t('four cannot either', table[1].floorP > PER_AXIS, `smallest p ${table[1].floorP.toFixed(3)}`);
  t('five can, which is why five is the default', table[2].floorP <= PER_AXIS, `smallest p ${table[2].floorP.toFixed(4)}`);
  const mine = far(TAKES);
  t('the repeat count THIS run is configured for can decide something', QUICK || mine.floorP <= PER_AXIS,
    `--takes ${TAKES} -> ${mine.arrangements} arrangements, smallest p ${mine.floorP.toFixed(4)}${QUICK ? ' (quick: expected to refuse)' : ''}`);

  // 2. It can say no: two samples of one distribution mostly must not separate.
  // why: lessons/rig-board-synth.md#pl-2
  const TRIALS = 600;
  const alarm = power(5, 0, TRIALS, true);
  t('two samples of the same distribution stay together', alarm <= 0.06,
    `${(alarm * 100).toFixed(1)}% of ${TRIALS} trials called them different, against a bar of ${(ALPHA * 100).toFixed(0)}%`);

  // 3. It can say yes; these are the numbers the repeat count was chosen from.
  // why: lessons/rig-board-synth.md#pl-3
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

  // 5. The spread is not degenerate.
  // why: lessons/rig-board-synth.md#pl-5
  const three = condition('x', [1, 5, 6].map((v) => ({ peak: 0.1, ratio: v, centroid: 1000, n: 1 })));
  t('the spread of three repeats is the middle PAIR, not the nearest one', three.spread.env === 4,
    `gaps 4 · 1 · 5 -> ${three.spread.env} (the old estimator answered 1)`);

  // 6. Nothing arrived is a sentence, not a crash.
  // why: lessons/rig-board-synth.md#pl-6
  t('a condition with no captures reports nothing rather than throwing', condition('empty', []) === null && condition('empty', [{ n: 0 }]) === null);
  const noOct = condition('silent', Array.from({ length: 5 }, () => ({ peak: 0.001, ratio: 0.3, centroid: 0, n: 1 })));
  const halfCmp = compare(noOct, condition('b', fake(5)));
  t('an axis with nothing to measure abstains instead of voting', halfCmp.oct.usable === false && halfCmp.env.usable === true, halfCmp.oct.why);

  // 7. The resolution guard fires when it should and stays out of the way when it should.
  // why: lessons/rig-board-synth.md#pl-7
  const outcome = (cmp) => (!cmp.decidable ? 'undecidable' : cmp.any ? 'separated' : cmp.couldSee ? 'no effect' : 'cannot resolve');
  const outcomes = (n, shift, trials) => {
    const tally = {};
    for (let i = 0; i < trials; i++) {
      const o = outcome(compare(condition('a', fake(n)), condition('b', fake(n, { shiftOct: shift }))));
      tally[o] = (tally[o] ?? 0) + 1;
    }
    return tally;
  };
  const none = outcomes(5, 0, TRIALS), big = outcomes(5, 3, TRIALS);
  const pct = (t, k) => (t[k] ?? 0) / TRIALS;
  console.log(`       no effect at all -> ${JSON.stringify(none)}`);
  console.log(`       a 3 s.d. effect  -> ${JSON.stringify(big)}`);
  t('with nothing there to find, the run says it could not have found it', pct(none, 'cannot resolve') >= 0.85,
    `${(pct(none, 'cannot resolve') * 100).toFixed(0)}% of ${TRIALS} abstained rather than claiming "they sound the same"`);
  t('with a real effect there, it does NOT abstain', pct(big, 'cannot resolve') <= 0.15,
    `${(pct(big, 'cannot resolve') * 100).toFixed(0)}% of ${TRIALS} at 3 s.d. — the rest separated or reported a genuine negative`);
  // And the arithmetic, on numbers small enough to check by hand: two
  // conditions whose repeats sit 1.0 apart, moved 0.5 apart. 0.5 < 2 x (1/0.954).
  const rungs = (shift) => condition('x', [0, 1, 2, 3, 4].map((v) => ({ peak: 0.1, ratio: 0.4, centroid: 2 ** (10 + shift + v), n: 1 })));
  const near = compare(rungs(0), rungs(0.5)), far2 = compare(rungs(0), rungs(10));
  t('half a wobble apart is below what five repeats resolve', near.oct.couldSee === false,
    `${fmtAxis('oct', near.oct.d)} against a wobble of ${fmtAxis('oct', near.oct.sigma)}`);
  // And the other direction, or a guard stuck on reads like a working one.
  // why: lessons/rig-board-synth.md#pl-other-way
  t('five wobbles apart is well inside what five repeats resolve', far2.oct.couldSee === true,
    `${fmtAxis('oct', far2.oct.d)} against a wobble of ${fmtAxis('oct', far2.oct.sigma)}`);

  // 8. Every check says what it measured over how many repeats, checked on the output.
  // why: lessons/rig-board-synth.md#pl-8
  const shown = evidence(compare(condition('a', fake(5)), condition('b', fake(5, { shiftOct: 4 }))));
  console.log(`       a verdict reads:  ${shown}`);
  t('a verdict names both axes, the shuffle count and the repeats behind it',
    shown.includes('envelope') && shown.includes('brightness') && shown.includes('shuffles reached it') && shown.includes('over 5+5 captures'));

  console.log(`\n${good}/${good + bad} green${bad ? `  (${bad} FAILED)` : ''}\n`);
  return bad === 0;
}

if (SELF) process.exit(selfTest() ? 0 : 1);

// The live run; imported here so --self-test loads nothing that knows a relay.
// why: lessons/rig-board-synth.md#pl-live
const { format, parse, randomId, RELAY_BASE } = await import('../../demo/shell/wire.mjs');
const FROM = `pl-${randomId(6)}`;
let seq = 0, pass = 0, fail = 0, skipped = 0;
const ok = (n, c, d = '') => { c ? pass++ : fail++; console.log(`  ${c ? 'ok  ' : 'FAIL'} ${n}${d ? `  ${d}` : ''}`); };
// A check that cannot answer says so; counted apart.
// why: lessons/rig-board-synth.md#pl-cannot
const cannot = (n, why) => { skipped++; console.log(`  ----  ${n}  CANNOT DECIDE: ${why}`); };
/** A check with nothing to repeat: the board either answered or it did not. */
const okOnce = (n, c, d = '') => ok(n, c, `${d}${d ? ' · ' : ''}one answer from the board, nothing to repeat`);
/** A check whose verdict is a comparison of two distributions. */
const okStat = (n, cmp, extra = '') => {
  if (!cmp.decidable) return cannot(n, Number.isFinite(cmp.floorP)
    ? `${cmp.a.n}+${cmp.b.n} ${cmp.a.unit} can express no p-value below ${cmp.floorP.toFixed(2)}, and the bar is ${PER_AXIS}`
    : `neither axis could be measured on both sides — ${AXIS_KEYS.map((k) => cmp[k].why).filter(Boolean).join('; ')}`);
  // Not seen is not absent: if every axis differs by less than twice its wobble, abstain with the
  // numbers.
  // why: lessons/rig-board-synth.md#pl-not-seen
  if (!cmp.any && !cmp.couldSee) {
    const sizes = AXIS_KEYS.filter((k) => cmp[k].usable)
      .map((k) => `${AXES[k].name} ${fmtAxis(k, cmp[k].d)} against a wobble of ${fmtAxis(k, cmp[k].sigma)}`).join(' · ');
    return cannot(n, `the difference is smaller than ${cmp.a.n}+${cmp.b.n} ${cmp.a.unit} can resolve — ${sizes}`
      + ` · this count finds about twice the wobble half the time, so a real effect this size would have been missed as often as found`
      + `. How close it came: ${evidence(cmp)}`);
  }
  ok(n, cmp.any, `${extra}${extra ? ' · ' : ''}${evidence(cmp)}`);
};
const note = (s) => console.log(`       ${s}`);
const sayCondition = (c) => {
  note(`${c.label.padEnd(34)} peak ${c.peak.toFixed(4)}  tail/peak ${c.ratio.toFixed(3)}  centroid ${Math.round(c.centroid)} Hz`);
  note(`${' '.repeat(34)} over ${c.n} ${c.unit}; two of them sit ${fmtAxis('env', c.spread.env)} env / ${fmtAxis('oct', c.spread.oct)} apart`);
};

const ws = new WebSocket(`${arg('relay', RELAY_BASE)}/room/${ROOM}/ws`);
ws.binaryType = 'arraybuffer';
const send = (m) => { const id = randomId(); ws.send(format(m, { from: FROM, seq: seq++, id, by: 'tool' })); return id; };
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
    if (m) { clearInterval(iv); res(m); } else if (Date.now() - t0 > ms) { clearInterval(iv); rej(new Error(`no ${t} in ${ms} ms — is a board in "${ROOM}"?`)); }
  }, 25);
});
const answer = (id, type, ms = 20000) => reply(type, ms, (r) => r.re === id);
/** One named engine command, straight through the board. See board.mjs `params.set`. */
const set = async (cmd, ...args) => {
  const r = await answer(send({ type: 'params.set', cmd, args }), 'params.set');
  if (!r.ok) throw new Error(`${cmd}: ${r.reason}`);
};

// One capture: play a note, collect, measure from the onset (the first frames are still in
// transit).
// why: lessons/rig-board-synth.md#pl-once
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
  // No frames is a finding, not a crash.
  // why: lessons/rig-board-synth.md#pl-no-frames
  if (!c) {
    ok(`${label}: frames arrived at all`, false, `${n} captures, every one empty — nothing is streaming`);
    throw new Error(`no audio during "${label}" — the board stopped sending`);
  }
  sayCondition(c);
  return c;
}

// A roll re-arms the drift (board.mjs params.random), so turn it off after the roll, never before.
// `drift: true` is for the one section that wants it.
// why: lessons/rig-board-synth.md#pl-roll
async function roll(seed, { drift = false } = {}) {
  const r = await answer(send({ type: 'params.random', seed }), 'params.rolled');
  if (!drift) await answer(send({ type: 'params.drift', on: false }), 'params.drifted');
  return r;
}
// The drift's nudge count: proof it is not moving.
// why: lessons/rig-board-synth.md#pl-nudges
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
  // The insert wraps a JACK instrument and nothing else (see the header).
  console.log(`  raising ${INSTRUMENT} (a JACK chain took ~13 s for Yoshimi) ...`);
  const s = await answer(send({ type: 'audio.start', source: INSTRUMENT }), 'audio.started', 60000);
  okOnce('a JACK instrument is up for the insert to wrap', s.ok !== false, s.source ?? '');

  console.log('  switching pappus on (first time compiles 2,030 lines, ~40 s) ...');
  const fx = await answer(send({ type: 'fx.pappus', on: true }), 'fx.pappus', 90000);
  okOnce('pappus is inserted', fx.ok === true, fx.reason ?? `wrapping ${fx.instrument}`);
  if (!fx.ok) throw new Error(fx.reason);

  // Prime the buffer: it starts empty and an empty granulator is silent.
  // why: lessons/rig-board-synth.md#pl-prime
  console.log('  priming the grain buffer (it starts empty, and an empty granulator is silent) ...');
  for (const n of [48, 55, 60, 64, 67]) { send({ type: 'note.on', note: n, vel: 110 }); await wait(700); send({ type: 'note.off', note: n }); }
  await wait(1500);

  // Freeze what is not under test for every section: lock the buffer (the input keeps recording)
  // and
  // stop the drift (it moves the sound between conditions).
  // why: lessons/rig-board-synth.md#pl-freeze
  await set('mlock', 1); await set('nlock', 1);
  await set('msrc', 1); await set('nsrc', 1);
  await answer(send({ type: 'params.drift', on: false }), 'params.drifted');

  const SEED_A = 424242, SEED_B = 8675309;

  // ── the die ───────────────────────────────────────────────────────────────
  if (RUN.has('seeds')) {
    // Interleave A B A B, so slow movement cannot pass as the seed.
    // why: lessons/rig-board-synth.md#pl-interleave
    console.log(`  rolling ${APPS} applications of each seed, alternating (${PER_APP} captures each) ...`);
    const nudged0 = await nudges();
    const appsA = [], appsB = [];
    for (let i = 0; i < APPS; i++) { appsA.push(await application(SEED_A)); appsB.push(await application(SEED_B)); }
    // Count nudges on the box's side, as evidence about the engine.
    // why: lessons/rig-board-synth.md#pl-control
    const nudged1 = await nudges();
    ok('nothing moved on its own while the seeds were measured', nudged1 === nudged0,
      `${nudged1 - nudged0} nudges across ${APPS * 2} rolls and ${APPS * 2 * PER_APP} captures — a roll turns the drift back on, so this is the control for that`);

    const rA = appsA[0].roll;
    okOnce('a roll names its character and carries its seed back',
      rA.ok && rA.seed === SEED_A && typeof rA.character?.m === 'string' && rA.character.m !== rA.character.n,
      `${rA.character?.m}/${rA.character?.n} · seed ${rA.seed}`);

    // The same seed reproduces parameters, not sound (the grain scheduler's noise is unseeded), so
    // the
    // check is on the board's reported parameters across all applications.
    // why: lessons/rig-board-synth.md#pl-same-params
    const sameParams = appsA.every((a) => JSON.stringify(a.roll.m) === JSON.stringify(rA.m)
      && JSON.stringify(a.roll.n) === JSON.stringify(rA.n) && a.roll.character?.m === rA.character?.m);
    ok('the same seed reproduces the same parameters', sameParams,
      `${APPS} applications of ${SEED_A}, all identical · ${rA.character?.m}/${rA.character?.n} · rates ${rA.m?.rate}/${rA.n?.rate}`);

    const condA = condition(`seed ${SEED_A} (${rA.character?.m}/${rA.character?.n})`, appsA.map((a) => a.value), 'rolls');
    const condB = condition(`seed ${SEED_B} (${appsB[0].roll.character?.m}/${appsB[0].roll.character?.n})`, appsB.map((a) => a.value), 'rolls');
    if (!condA || !condB) { ok('the seed rolls were audible at all', false, 'every capture was empty'); throw new Error('no audio during the seed rolls'); }
    sayCondition(condA);
    sayCondition(condB);
    // The floor is ten pairs of one seed's applications, not one pair.
    // why: lessons/rig-board-synth.md#pl-floor
    note(`the same seed lands ${fmtAxis('env', condA.spread.env)} env / ${fmtAxis('oct', condA.spread.oct)} apart from itself, over ${(APPS * (APPS - 1)) / 2} pairs — THAT is the floor`);
    okStat('two different seeds sound further apart than two rolls of one seed', compare(condA, condB));
  }

  // ── the drift ─────────────────────────────────────────────────────────────
  // Nothing is sent between these two blocks. If they differ, the board moved the
  // sound on its own, which is the whole claim.
  if (RUN.has('drift')) {
    await answer(send({ type: 'params.drift', on: true }), 'params.drifted');
    await wait(1000);
    const d0 = await answer(send({ type: 'params.state' }), 'params.state');
    okOnce('the drift is running when it is asked for', d0.drift?.on === true, `${d0.drift?.nudges} nudges so far`);

    const m1 = await takes('drift, first look', TAKES_DRIFT);
    // Ninety seconds: half of `scan`'s 181 s cycle is the furthest it gets; 45 s moved it only as
    // much
    // as the wobble. Seven captures for this pair.
    // why: lessons/rig-board-synth.md#pl-ninety
    console.log(`  waiting ${QUICK ? 20 : 90} s with NOTHING sent ...`);
    await wait(QUICK ? 20000 : 90000);
    const m2 = await takes('drift, 90 s later, nothing sent', TAKES_DRIFT);
    const moved = compare(m1, m2);
    const d1 = await answer(send({ type: 'params.state' }), 'params.state');
    note(`scan walked ${d0.drift?.scan} -> ${d1.drift?.scan} · ${d1.drift.nudges - d0.drift.nudges} nudges in the gap`);
    okStat('the sound moves on its own, with nothing sent', moved);
    // A bound, not a comparison: it did not run away; the repeats make it a middle.
    // why: lessons/rig-board-synth.md#pl-bound
    if (moved.oct.d === null) cannot('...and it did not wander out of the character it was given', 'no brightness to measure on one side');
    else ok('...and it did not wander out of the character it was given', moved.oct.d < 2.5,
      `brightness moved ${fmtAxis('oct', moved.oct.d)} — a bound on the size, over ${m1.n}+${m2.n} captures, not a shuffle test`);
    await answer(send({ type: 'params.drift', on: false }), 'params.drifted');
    await wait(500);
  }

  // Does a key pitch the grains? Not through the chain (resonators and delays do not follow keys)
  // nor on speech: record one held note, lock, mute what cannot follow, sweep. Direction and order
  // only.
  // why: lessons/rig-board-synth.md#pl-pitch
  if (RUN.has('pitch')) {
    await answer(send({ type: 'params.drift', on: false }), 'params.drifted');
    // Roll first with a known seed, through roll() so the drift is off; nothing is inherited.
    // why: lessons/rig-board-synth.md#pl-roll-first
    await roll(SEED_B);

    // Set mbuflen before recording: it is the ring's live length, so a 6 s note fills a 4 s ring.
    // why: lessons/rig-board-synth.md#pl-geometry
    await set('mbuflen', 4);
    // A narrow window pins the read head, removing the scatter noise rather than averaging it.
    // why: lessons/rig-board-synth.md#pl-narrow
    await set('mscan', 0.5);
    await set('mwinstart', 0.45); await set('mwinend', 0.55);
    // Pin scanmode and contour: modes 3 and 4 move the read head, and contour shapes the spectrum.
    // why: lessons/rig-board-synth.md#pl-modes
    await set('mscanmode', 2);      // 2 POSITION, a static read head; why: lessons/rig-board-synth.md#pl-position
    await set('mcontour', 8);       // a mid envelope shape, fixed across runs
    await set('mtilt', 0); await set('ntilt', 0);   // baked in at record time, neutral; why: lessons/rig-board-synth.md#pl-tilt
    await set('msos', 0); await set('nsos', 0);     // do not freeze while recording

    // Record the note with `src` stated (1 OFF, 2 STEREO, 3 MONO L, 4 MONO R, no 0) rather than
    // inherited.
    // why: lessons/rig-board-synth.md#pl-record
    await set('mlock', 0); await set('nlock', 0);
    await set('msrc', 2); await set('nsrc', 2);     // 2 = STEREO
    await wait(800);
    send({ type: 'note.on', note: 60, vel: 110 });
    await wait(6000);
    send({ type: 'note.off', note: 60 });
    // Lock first, then off: `src 1` with lock 0 makes BufWr write silence over the live window.
    // why: lessons/rig-board-synth.md#pl-lock-first
    await set('mlock', 1); await set('nlock', 1);
    await set('msrc', 1); await set('nsrc', 1);

    // Mute what cannot follow a key: `oin1 1` with the other feeds at 0 is the documented dry path.
    // why: lessons/rig-board-synth.md#pl-mute
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
    // Several captures a rung; and one capture first proves there is a sound to measure the pitch
    // of.
    // why: lessons/rig-board-synth.md#pl-sound-first
    await set('pitches', 0, 0, 0, 0, 0, 0, 0, 0);
    await wait(700);
    const heard = await once({ play: false, hold: 2400, settle: 0 });
    let blocked = null;
    if (!(heard.peak > SILENCE)) {
      // When silent, probe why: the whole buffer (read geometry), then the live input (recording),
      // else
      // the mute block downstream.
      // why: lessons/rig-board-synth.md#pl-why-silent
      note('nothing came back from the recorded note — probing why, which costs ~6 s and only happens when it has already failed');
      await set('mwinstart', 0); await set('mwinend', 1);
      const wide = await once({ play: false, hold: 2400, settle: 0 });
      await set('mlock', 0); await set('nlock', 0);
      await set('msrc', 2); await set('nsrc', 2);
      const live = await once({ hold: 2400, settle: 250 });
      note(`probes: narrow window ${heard.peak.toFixed(4)} · whole buffer ${wide.peak.toFixed(4)} · live input ${live.peak.toFixed(4)}  (silence is under ${SILENCE})`);
      const st = await answer(send({ type: 'params.state' }), 'params.state');
      note(`the board's own state: rate ${st.roll?.m?.rate} · size ${st.roll?.m?.size} · scanmode ${st.roll?.m?.scanmode} · drift ${st.drift?.on ? 'ON — it should be off' : 'off'} · source ${st.source ? st.source.title : 'none'}`);
      blocked = wide.peak > SILENCE
        ? `the note WAS recorded but the narrow window missed it — whole buffer ${wide.peak.toFixed(4)} against ${heard.peak.toFixed(4)} through 45-55%. The read geometry is wrong, not the engine`
        : live.peak > SILENCE
          ? `the grain buffer came back EMPTY — the live input reads ${live.peak.toFixed(4)} through the same routing, so the signal path is fine and the six-second recording never landed`
          : `nothing reaches the output at all, buffer or live input — the fault is downstream of the grains, in the stages this section mutes, and is not about the material`;
    }
    if (blocked) {
      // With no sound, abstain on the pitch checks rather than fail them.
      // why: lessons/rig-board-synth.md#pl-abstain
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

      // Only the upward rungs are asserted: a broadband grain floor hides partials pitched down.
      // why: lessons/rig-board-synth.md#pl-up
      const up = ladder.slice(2);
      const steps = up.slice(1).map((c, i) => compare(up[i], c));
      note(`per step: ${steps.map((st) => `${fmtAxis('oct', st.oct.d)} (p ${st.oct.p == null ? '—' : st.oct.p.toFixed(3)})`).join(' · ')}`);
      // A fifth (about 0.29 oct) is smaller than a rung's wobble (about 0.38), so it is reported,
      // not asserted.
      // why: lessons/rig-board-synth.md#pl-fifth
      note(`a step of a fifth moves LESS than a rung wobbles on its own, so it is printed and never asserted — resolving it would need about 19 captures a rung, five minutes of this run for one line`);
      const ordered = up.every((c, i) => i === 0 || c.centroid > up[i - 1].centroid);
      ok('the rungs rise in order', ordered,
        `${up.map((c) => Math.round(c.centroid) + ' Hz').join(' -> ')} · middles of ${TAKES} captures each${ordered ? '' : ' — OUT OF ORDER'}`);
      const ends = compare(up[0], up[up.length - 1]);
      okStat('the top of the ladder is further from the bottom than a rung is from itself', ends,
        `${Math.round(up[0].centroid)} Hz -> ${Math.round(up[up.length - 1].centroid)} Hz`);
      // Brightness over-reads pitch (3.23 octaves for two of key), so there is no upper bound.
      // why: lessons/rig-board-synth.md#pl-brightness
      note(`${Math.log2(up[up.length - 1].centroid / up[0].centroid).toFixed(2)} octaves of brightness for the octave of key above zero — a proxy that over-reads, which is why only the direction is asserted`);

    }
  }

  // ── the frame rate, which is the tell for two sources at once ────────────
  ok('one clean source, not two', gaps < allFrames * 0.05,
    `${allFrames} frames, ${gaps} dropped at the relay · counted over the whole run, nothing to average`);

  // Hand the buffers back to the input.
  // why: lessons/rig-board-synth.md#pl-hand-back
  for (const [cmd, v] of [['mlock', 0], ['nlock', 0], ['msrc', 2], ['nsrc', 2]]) {
    send({ type: 'params.set', cmd, args: [v] });
  }
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
// A check that could not decide fails the run, unless the run was short on purpose.
// why: lessons/rig-board-synth.md#pl-exit
process.exit(fail || (skipped && !QUICK) ? 1 : 0);
