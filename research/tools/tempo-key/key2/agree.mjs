import { NAMES6, LABEL, READERS, FE, marks, keyKind, MIREX } from './truth.mjs';
const all = NAMES6.flatMap((n) => marks(n).map((r) => ({ ...r, name: n })));
const pct = (a, b) => b ? Math.round(100 * a / b) + '%' : '-';
console.log('marks', all.length);
console.log('\n| recording | marks | 3 of 5 front ends agree | 4 of 5 | all 5 |');
console.log('| --- | --- | --- | --- | --- |');
for (const n of [...NAMES6, 'pooled']) {
  const r = n === 'pooled' ? all : all.filter((x) => x.name === n);
  console.log(`| ${LABEL[n] ?? 'pooled'} | ${r.length} | ${pct(r.filter((x) => x.votes >= 3).length, r.length)} | ${pct(r.filter((x) => x.votes >= 4).length, r.length)} | ${pct(r.filter((x) => x.votes >= 5).length, r.length)} |`);
}
// pairwise exact agreement between readers, pooled
const short = (r) => r;
console.log('\nPairwise exact agreement, pooled over ' + all.length + ' marks (row reader, column reader)\n');
console.log('| | ' + READERS.join(' | ') + ' |'); console.log('| --- '.repeat(READERS.length + 1) + '|');
for (const a of READERS) {
  const cells = READERS.map((b) => { if (a === b) return ''; let s = 0, n = 0; for (const x of all) if (x.reads[a] && x.reads[b]) { n++; if (keyKind(x.reads[a], x.reads[b]) === 'exact') s++; } return pct(s, n); });
  console.log(`| ${a} | ${cells.join(' | ')} |`);
}
// front end level, pooled: exact and MIREX against each other
const fes = Object.keys(FE);
console.log('\nFront end votes, pairwise exact (MIREX) where both vote\n');
console.log('| | ' + fes.join(' | ') + ' |'); console.log('| --- '.repeat(fes.length + 1) + '|');
const kk = (id) => { const [t, m] = id.split(' '); return { tonic: +t, mode: m }; };
for (const a of fes) {
  const cells = fes.map((b) => { if (a === b) return ''; let s = 0, m = 0, n = 0; for (const x of all) if (x.fe[a] && x.fe[b]) { n++; const q = keyKind(kk(x.fe[a]), kk(x.fe[b])); if (q === 'exact') s++; m += MIREX[q]; } return `${pct(s, n)} (${(m / n).toFixed(2)})`; });
  console.log(`| ${a} | ${cells.join(' | ')} |`);
}
// each reader against the truth made WITHOUT its own front end (3 of the other 4)
console.log('\nEach reader against a leave-its-front-end-out truth (3 of the other 4 front ends)\n');
console.log('| reader | marks | exact | fifth | relative | parallel | other | MIREX |'); console.log('| --- | --- | --- | --- | --- | --- | --- | --- |');
for (const r of READERS) {
  const f = Object.entries(FE).find(([, rs]) => rs.includes(r))[0];
  const k = { exact: 0, fifth: 0, relative: 0, parallel: 0, other: 0 }; let m = 0, n = 0;
  for (const x of all) {
    const c = {}; for (const [g, v] of Object.entries(x.fe)) if (g !== f && v) c[v] = (c[v] || 0) + 1;
    const top = Object.entries(c).sort((p, q) => q[1] - p[1])[0];
    if (!top || top[1] < 3 || !x.reads[r]) continue;
    const q = keyKind(x.reads[r], kk(top[0])); k[q]++; m += MIREX[q]; n++;
  }
  console.log(`| ${r} | ${n} | ${pct(k.exact, n)} | ${pct(k.fifth, n)} | ${pct(k.relative, n)} | ${pct(k.parallel, n)} | ${pct(k.other, n)} | ${(m / n).toFixed(2)} |`);
}
