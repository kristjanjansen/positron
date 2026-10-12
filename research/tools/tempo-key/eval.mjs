// Scores our tempo and key readings against reference tools, per recording.
//
//   node research/tools/tempo-key/eval.mjs <dir> <name> [<name> ...] [--tempo <prefix>] [--key <prefix>] [--json]
//
// Reads, for each <name>, from <dir>:
//   <tempo>-<name>.json  our-tempo.mjs output (default prefix `our`)
//   <key>-<name>.json    our-key.mjs output (default prefix `key`, --key to change)
//   ref-<name>.json      ref.py output
//
// SOFT TRUTH, NOT TRUTH. Nobody has tapped or labelled these recordings. A
// tempo at time t is taken from each reference's beats in the 12 s before t
// (the page's window), as 60 / median inter beat interval, needing 6 beats;
// Percival's estimate on the same 12 s window is the fourth reader. The soft
// truth is the mean of the biggest group that agrees within 4%, and only when
// that group has two or more readers in it. A key at a 5 s mark is the key
// most readers name over the 30 s before it (essentia KeyExtractor with five
// profiles, librosa constant Q chroma with two), and only when at least four
// of seven agree AND both front ends are among them.
import { readFileSync, existsSync } from 'node:fs';

const args = process.argv.slice(2);
const flag = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const TPRE = flag('--tempo', 'our');
const KPRE = flag('--key', 'key');
const PHREF = flag('--phase', 'beat_this');   // whose beats the phase is graded against: beat_this or essentia
const JSON_OUT = args.includes('--json'); if (JSON_OUT) args.splice(args.indexOf('--json'), 1);
const [dir, ...names] = args;
const load = (f) => JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'));

const TOL = 0.04, WIN = 12, MIN_BEATS = 6;
const near = (a, b, tol = TOL) => Math.abs(a - b) / b <= tol;
function localBpm(beats, t) {
  const w = beats.filter((b) => b > t - WIN && b <= t);
  if (w.length < MIN_BEATS) return null;
  const ibi = w.slice(1).map((b, i) => b - w[i]).sort((p, q) => p - q);
  const m = ibi[ibi.length >> 1];
  const cv = Math.sqrt(ibi.reduce((s, v) => s + (v - m) ** 2, 0) / ibi.length) / m;
  // beat_this places beats on a 20 ms frame grid, so a median interval is
  // quantised (0.46 or 0.48 s, 130.4 or 125.0 bpm). A least squares line through
  // the beats against their beat number (a skipped beat counted as two) is not.
  const k = w.map((b) => Math.round((b - w[0]) / m));
  const n = w.length, mk = k.reduce((s, v) => s + v, 0) / n, mb = w.reduce((s, v) => s + v, 0) / n;
  let sxy = 0, sxx = 0; for (let i = 0; i < n; i++) { sxy += (k[i] - mk) * (w[i] - mb); sxx += (k[i] - mk) ** 2; }
  const per = sxx > 0 ? sxy / sxx : m;
  return { bpm: 60 / per, cv };
}
function cluster(vals) {
  let best = [];
  for (const a of vals) { const g = vals.filter((b) => near(b.v, a.v)); if (g.length > best.length) best = g; }
  return best.length >= 2 ? { v: best.reduce((s, x) => s + x.v, 0) / best.length, who: best.map((x) => x.k) } : null;
}
function kind(ours, truth) {
  const r = ours / truth;
  if (near(r, 1, TOL)) return 'exact';
  if (near(r, 2, TOL) || near(r, 0.5, TOL) || near(r, 3, TOL) || near(r, 1 / 3, TOL)) return 'octave';
  if (near(r, 1.5, TOL) || near(r, 2 / 3, TOL)) return 'three';
  return 'other';
}
const pct = (n, d) => (d ? `${Math.round(100 * n / d)}%` : '-');

function tempo(name) {
  const our = load(`${TPRE}-${name}.json`), ref = load(`ref-${name}.json`);
  const bt = ref.beat_this.beats || [], es = ref.essentia_rhythm.ticks, lb = ref.librosa.beats;
  const perc = ref.percival;
  const rows = [];
  for (const r of our.readings) {
    if (r.t < WIN) continue;      // the page's window is full from 12 s
    const v = [];
    const a = localBpm(bt, r.t), b = localBpm(es, r.t), c = localBpm(lb, r.t);
    if (a) v.push({ k: 'beat_this', v: a.bpm });
    if (b) v.push({ k: 'essentia', v: b.bpm });
    if (c) v.push({ k: 'librosa', v: c.bpm });
    const p = perc.filter(([e]) => e <= r.t + 1e-6).pop();
    if (p && p[0] > r.t - 2.01) v.push({ k: 'percival', v: p[1] });
    const steady = a && a.cv < 0.08;
    rows.push({ t: r.t, ours: r.bpm, conf: r.conf, beatAt: r.beatAt, refs: v, truth: cluster(v), steady });
  }
  const scored = rows.filter((x) => x.truth);
  const k = { exact: 0, octave: 0, three: 0, other: 0 };
  for (const x of scored) k[kind(x.ours, x.truth.v)]++;
  const conf5 = scored.filter((x) => x.conf >= 0.5), kc = { exact: 0, octave: 0, three: 0, other: 0 };
  for (const x of conf5) kc[kind(x.ours, x.truth.v)]++;
  // how often each pair of reference readers agree, where both read
  const pairs = {};
  for (const x of rows) for (let i = 0; i < x.refs.length; i++) for (let j = i + 1; j < x.refs.length; j++) {
    const key = `${x.refs[i].k}/${x.refs[j].k}`; pairs[key] ??= [0, 0]; pairs[key][1]++; if (near(x.refs[i].v, x.refs[j].v)) pairs[key][0]++;
  }
  // flips: consecutive readings more than 4% apart, per minute
  const rr = our.readings.filter((x) => x.t >= WIN);
  let flips = 0; for (let i = 1; i < rr.length; i++) if (!near(rr[i].bpm, rr[i - 1].bpm)) flips++;
  const minutes = (rr.length * 0.5) / 60;
  // grid jumps: consecutive readings at the same tempo whose beat grids sit a
  // quarter beat or more apart, which is the click jumping, per minute
  let jumps = 0;
  for (let i = 1; i < rr.length; i++) {
    if (!near(rr[i].bpm, rr[i - 1].bpm)) continue;
    const per = 60 / rr[i].bpm, f = (((rr[i].beatAt - rr[i - 1].beatAt) / per) % 1 + 1) % 1;
    if (Math.min(f, 1 - f) >= 0.25) jumps++;
  }
  // the reference's own flips, beat_this local tempo on the same grid
  let rflips = 0, prev = null; for (const x of rows) { const a = x.refs.find((q) => q.k === 'beat_this'); if (a && prev && !near(a.v, prev)) rflips++; if (a) prev = a.v; }
  // phase: our newest beat against the nearest reference beat, as a fraction of our period
  const phb = PHREF === 'essentia' ? es : bt;
  let on = 0, half = 0, nph = 0;
  for (const x of scored) {
    if (kind(x.ours, x.truth.v) !== 'exact' || !phb.length) continue;
    const per = 60 / x.ours; let d = Infinity;
    for (const b of phb) if (Math.abs(b - x.beatAt) < Math.abs(d)) d = b - x.beatAt;
    const f = Math.abs(d) / per; nph++;
    if (f < 1 / 8) on++; else if (f >= 3 / 8) half++;
  }
  // where beat_this hears no steady pulse: what our confidence says there
  const unsteady = rows.filter((x) => !x.steady);
  const confUnsteady = unsteady.length ? unsteady.filter((x) => x.conf >= 0.5).length / unsteady.length : null;
  return { name, readings: rows.length, scored: scored.length, k, conf5: conf5.length, kc, pairs,
    flipsPerMin: flips / minutes, jumpsPerMin: jumps / minutes, refFlipsPerMin: rflips / minutes, on, half, nph,
    unsteady: unsteady.length, confUnsteady, msPerSecond: our.msPerSecond,
    global: { essentia: ref.essentia_rhythm.bpm, degara: ref.essentia_degara.bpm, librosa: ref.librosa.tempo,
      beat_this: median(rows.map((x) => x.refs.find((q) => q.k === 'beat_this')?.v).filter(Boolean)),
      ours: median(our.readings.filter((x) => x.t >= WIN).map((x) => x.bpm)) } };
}
function median(a) { const s = [...a].sort((p, q) => p - q); return s.length ? s[s.length >> 1] : null; }

const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const ALIAS = { Db: 'C#', 'D#': 'Eb', Gb: 'F#', 'G#': 'Ab', 'A#': 'Bb' };
const tonicOf = (k) => NAMES.indexOf(ALIAS[k] ?? k);
function keyKind(o, t) {
  if (o.tonic === t.tonic && o.mode === t.mode) return 'exact';
  const d = (o.tonic - t.tonic + 12) % 12;
  if (o.mode === t.mode && (d === 7 || d === 5)) return 'fifth';
  if (o.mode !== t.mode && ((t.mode === 'major' && d === 9) || (t.mode === 'minor' && d === 3))) return 'relative';
  if (o.mode !== t.mode && d === 0) return 'parallel';
  return 'other';
}
const MIREX = { exact: 1, fifth: 0.5, relative: 0.3, parallel: 0.2, other: 0 };
function key(name) {
  const our = load(`${KPRE}-${name}.json`), ref = load(`ref-${name}.json`);
  const W = ref.keys.windows, readers = Object.keys(W);
  const ess = new Set(['edma', 'bgate', 'krumhansl', 'temperley', 'shaath']);
  const rows = [];
  for (let i = 0; i < W[readers[0]].length; i++) {
    const t = W[readers[0]][i][0];
    if (t < 30) continue;          // a full 30 s window, as the page's 30 s decay
    const votes = {};
    for (const r of readers) { const [, k, m] = W[r][i]; const id = `${tonicOf(k)} ${m}`; (votes[id] ??= []).push(r); }
    const [top, who] = Object.entries(votes).sort((a, b) => b[1].length - a[1].length)[0];
    const both = who.some((r) => ess.has(r)) && who.some((r) => !ess.has(r));
    const o = our.readings.filter((x) => x.t <= t + 1e-6).pop();
    const [tt, mm] = top.split(' ');
    // a second, independent soft truth: the two librosa readers (constant Q
    // chroma, not essentia's HPCP) agreeing with each other
    const [, lk, lm] = W.librosa_kk[i], [, ak, am] = W.librosa_albrecht[i];
    const lib = tonicOf(lk) === tonicOf(ak) && lm === am ? { tonic: tonicOf(lk), mode: lm } : null;
    rows.push({ t, ours: o, truth: who.length >= 4 && both ? { tonic: +tt, mode: mm, n: who.length } : null, lib, votes });
  }
  const scored = rows.filter((x) => x.truth && x.ours);
  const k = { exact: 0, fifth: 0, relative: 0, parallel: 0, other: 0 };
  let mirex = 0, late = 0;
  for (const x of scored) {
    const q = keyKind(x.ours, x.truth); k[q]++; mirex += MIREX[q];
    // right within the next 15 s: a reading that is late rather than wrong
    if (our.readings.some((r) => r.t >= x.t && r.t <= x.t + 15 && keyKind(r, x.truth) === 'exact')) late++;
  }
  const ls = rows.filter((x) => x.lib && x.ours);
  let lmirex = 0, lexact = 0; for (const x of ls) { const q = keyKind(x.ours, x.lib); lmirex += MIREX[q]; if (q === 'exact') lexact++; }
  const rr = our.readings.filter((x) => x.t >= 15);
  let changes = 0; for (let i = 1; i < rr.length; i++) if (rr[i].key !== rr[i - 1].key) changes++;
  const minutes = (rr.length * 0.5) / 60;
  return { name, marks: rows.length, scored: scored.length, k, mirex: scored.length ? mirex / scored.length : null, late,
    lib: { n: ls.length, exact: lexact, mirex: ls.length ? lmirex / ls.length : null },
    changesPerMin: changes / minutes, whole: ref.keys.whole,
    oursMost: Object.entries(our.readings.reduce((m, x) => ((m[x.key] = (m[x.key] || 0) + 1), m), {})).sort((a, b) => b[1] - a[1]).slice(0, 3) };
}

const T = names.map(tempo), Kk = names.map(key);
if (JSON_OUT) { process.stdout.write(JSON.stringify({ tempo: T, key: Kk })); process.exit(0); }
console.log('\nTEMPO, readings after 12 s, scored where two or more reference readers agree within 4%\n');
console.log('| recording | readings | soft truth | exact | octave | 3:2 | other | conf>=0.5 exact | flips/min ours | flips/min beat_this | on beat_this / half off | grid jumps/min | no steady pulse, conf>=0.5 | ms/s |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const x of T) console.log(`| ${x.name} | ${x.readings} | ${pct(x.scored, x.readings)} | ${pct(x.k.exact, x.scored)} | ${pct(x.k.octave, x.scored)} | ${pct(x.k.three, x.scored)} | ${pct(x.k.other, x.scored)} | ${pct(x.kc.exact, x.conf5)} of ${x.conf5} | ${x.flipsPerMin.toFixed(1)} | ${x.refFlipsPerMin.toFixed(1)} | ${pct(x.on, x.nph)} / ${pct(x.half, x.nph)} | ${x.jumpsPerMin.toFixed(1)} | ${x.unsteady} readings, ${x.confUnsteady == null ? '-' : Math.round(100 * x.confUnsteady) + '%'} | ${x.msPerSecond} |`);
console.log('\nGlobal tempo per tool\n');
console.log('| recording | ours (median) | essentia multifeature | essentia degara | beat_this (median of 12 s windows) | librosa |');
console.log('| --- | --- | --- | --- | --- | --- |');
for (const x of T) console.log(`| ${x.name} | ${x.global.ours?.toFixed(1)} | ${x.global.essentia.toFixed(1)} | ${x.global.degara.toFixed(1)} | ${x.global.beat_this?.toFixed(1)} | ${x.global.librosa.toFixed(1)} |`);
console.log('\nReference readers agreeing within 4% (pairs where both read)\n');
for (const x of T) console.log(`- ${x.name}: ` + Object.entries(x.pairs).map(([p, [a, n]]) => `${p} ${pct(a, n)} of ${n}`).join(', '));
console.log('\nKEY, 5 s marks after 30 s, scored where 4 of 7 readers agree and both front ends are among them\n');
console.log('| recording | marks | soft truth | exact | fifth | relative | parallel | other | MIREX | exact within 15 s | librosa pair: marks, exact, MIREX | changes/min | ours most |');
console.log("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
for (const x of Kk) console.log(`| ${x.name} | ${x.marks} | ${pct(x.scored, x.marks)} | ${pct(x.k.exact, x.scored)} | ${pct(x.k.fifth, x.scored)} | ${pct(x.k.relative, x.scored)} | ${pct(x.k.parallel, x.scored)} | ${pct(x.k.other, x.scored)} | ${x.mirex?.toFixed(2) ?? '-'} | ${pct(x.late, x.scored)} | ${x.lib.n}, ${pct(x.lib.exact, x.lib.n)}, ${x.lib.mirex?.toFixed(2) ?? '-'} | ${x.changesPerMin.toFixed(2)} | ${x.oursMost.map(([k, n]) => `${k} ${n}`).join(', ')} |`);
console.log('\nWhole file key per reader\n');
for (const x of Kk) console.log(`- ${x.name}: ` + Object.entries(x.whole).map(([p, [k, m]]) => `${p} ${k} ${m}`).join(', '));
