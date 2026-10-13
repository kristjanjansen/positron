// node cands.mjs '<json list of [id, opts]>' [--base '<opts>']
import { NAMES6, LABEL, marks, score, changes } from './truth.mjs';
import { loadCore, run } from './run.mjs';
const core = loadCore(false);
const list = JSON.parse(process.argv[2]);
const bi = process.argv.indexOf('--base'), base = bi > 0 ? JSON.parse(process.argv[bi + 1]) : {};
const M = Object.fromEntries(NAMES6.map((n) => [n, marks(n)]));
function evalOpts(o) {
  const per = {}; let sum = 0, n = 0, s4 = 0, n4 = 0, ex = 0, rel = 0, fif = 0, ch = 0;
  for (const nm of NAMES6) {
    const r = run(core, nm, o), a = score(r, M[nm]), b = score(r, M[nm], 'truth4');
    per[nm] = a.mirex; sum += a.sum; n += a.n; s4 += b.sum; n4 += b.n; ex += a.k.exact; rel += a.k.relative; fif += a.k.fifth;
    ch += changes(r) / NAMES6.length;
  }
  return { per, pooled: sum / n, p4: s4 / n4, exact: ex / n, rel: rel / n, fifth: fif / n, ch };
}
const b = evalOpts(base);
const f2 = (x) => x.toFixed(2);
console.log('| candidate | pooled MIREX | 4 of 5 truth | exact | fifth | relative | ' + NAMES6.map((n) => LABEL[n]).join(' | ') + ' | worst drop | changes/min | keep? |');
console.log('| --- '.repeat(NAMES6.length + 9) + '|');
const line = (id, x) => {
  const drops = NAMES6.map((n) => x.per[n] - b.per[n]), worst = Math.min(...drops);
  const keep = x.pooled > b.pooled + 1e-9 && worst >= -0.01 ? 'yes' : 'no';
  console.log(`| ${id} | ${f2(x.pooled)} | ${f2(x.p4)} | ${Math.round(100 * x.exact)}% | ${Math.round(100 * x.fifth)}% | ${Math.round(100 * x.rel)}% | ${NAMES6.map((n) => f2(x.per[n])).join(' | ')} | ${(100 * worst).toFixed(0)} | ${x.ch.toFixed(2)} | ${id === 'base' ? '' : keep} |`);
};
line('base', b);
for (const [id, o] of list) line(id, evalOpts({ ...base, ...o }));
