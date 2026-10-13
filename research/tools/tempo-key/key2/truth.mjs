// Soft truth from twelve readers in five front ends, per 5 s mark from 30 s.
import { readFileSync } from 'node:fs';
const T = (process.env.TK ?? '/tmp/tk') + '/';
const D = (process.env.KD2 ?? '/tmp/kd2') + '/';
export const NAMES6 = ['r2', 'r4', 'ida', 'ida1314', 'ida1354', 'ida1434'];
export const LABEL = { r2: 'Raadio 2', r4: 'Raadio 4', ida: 'Ida 10-11', ida1314: 'Ida 1314', ida1354: 'Ida 1354', ida1434: 'Ida 1434' };
const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const ALIAS = { Db: 'C#', 'D#': 'Eb', Gb: 'F#', 'G#': 'Ab', 'A#': 'Bb' };
export const tonicOf = (k) => NAMES.indexOf(ALIAS[k] ?? k);
export const FE = { hpcp: ['ess_edma', 'ess_bgate', 'ess_krumhansl', 'ess_temperley', 'ess_shaath'], cqt: ['lib_kk', 'lib_albrecht'],
  cnn: ['madmom_cnn'], deep: ['dc_kk', 'dc_albrecht'], notes: ['bp_temperley', 'bp_albrecht'] };
export const READERS = Object.values(FE).flat();
export function keyKind(o, t) {
  if (o.tonic === t.tonic && o.mode === t.mode) return 'exact';
  const d = (o.tonic - t.tonic + 12) % 12;
  if (o.mode === t.mode && (d === 7 || d === 5)) return 'fifth';
  if (o.mode !== t.mode && ((t.mode === 'major' && d === 9) || (t.mode === 'minor' && d === 3))) return 'relative';
  if (o.mode !== t.mode && d === 0) return 'parallel';
  return 'other';
}
export const MIREX = { exact: 1, fifth: 0.5, relative: 0.3, parallel: 0.2, other: 0 };
export function marks(name) {
  const a = JSON.parse(readFileSync(T + `ref-${name}.json`)).keys.windows;
  const b = JSON.parse(readFileSync(D + `ref2-${name}.json`)).windows;
  const W = { ess_edma: a.edma, ess_bgate: a.bgate, ess_krumhansl: a.krumhansl, ess_temperley: a.temperley, ess_shaath: a.shaath,
    lib_kk: a.librosa_kk, lib_albrecht: a.librosa_albrecht, ...b };
  const n = Math.min(...READERS.map((r) => W[r].length));
  const rows = [];
  for (let i = 0; i < n; i++) {
    const t = W.ess_edma[i][0];
    if (Math.abs(W.madmom_cnn[i][0] - t) > 1e-6) throw new Error('marks out of step');
    if (t < 30) continue;
    const reads = {};
    for (const r of READERS) { const [, k, m] = W[r][i]; reads[r] = k == null ? null : { tonic: tonicOf(k), mode: m }; }
    // each front end votes the key most of its readers name; a tie abstains
    const fe = {};
    for (const [f, rs] of Object.entries(FE)) {
      const c = {};
      for (const r of rs) if (reads[r]) { const id = `${reads[r].tonic} ${reads[r].mode}`; c[id] = (c[id] || 0) + 1; }
      const s = Object.entries(c).sort((x, y) => y[1] - x[1]);
      fe[f] = s.length && (s.length === 1 || s[0][1] > s[1][1]) ? s[0][0] : null;
    }
    const c = {};
    for (const v of Object.values(fe)) if (v) c[v] = (c[v] || 0) + 1;
    const top = Object.entries(c).sort((x, y) => y[1] - x[1])[0];
    const k = (id) => { const [tt, mm] = id.split(' '); return { tonic: +tt, mode: mm }; };
    rows.push({ t, reads, fe, truth3: top && top[1] >= 3 ? k(top[0]) : null, truth4: top && top[1] >= 4 ? k(top[0]) : null, votes: top?.[1] ?? 0, top: top ? k(top[0]) : null });
  }
  return rows;
}
export function score(readings, rows, which = 'truth3') {
  const k = { exact: 0, fifth: 0, relative: 0, parallel: 0, other: 0 }; let m = 0, n = 0;
  for (const x of rows) {
    if (!x[which]) continue;
    const o = readings.filter((r) => r.t <= x.t + 1e-6).pop();
    if (!o) continue;
    const q = keyKind(o, x[which]); k[q]++; m += MIREX[q]; n++;
  }
  return { n, mirex: n ? m / n : null, sum: m, k };
}
export function changes(readings) {
  const rr = readings.filter((x) => x.t >= 15); let c = 0;
  for (let i = 1; i < rr.length; i++) if (rr[i].key !== rr[i - 1].key) c++;
  return c / ((rr.length * 0.5) / 60);
}
