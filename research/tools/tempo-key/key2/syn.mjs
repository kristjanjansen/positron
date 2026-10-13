import { readFileSync } from 'node:fs';
import { loadCore, run } from './run.mjs';
import { keyKind, MIREX } from './truth.mjs';
const core = loadCore(false), L = JSON.parse(readFileSync((process.env.KD2 ?? '/tmp/kd2') + '/syn/labels.json'));
for (const [id, o] of JSON.parse(process.argv[2])) {
  let fin = 0, avg = 0; const k = { exact: 0, fifth: 0, relative: 0, parallel: 0, other: 0 }; const byP = {};
  for (const x of L) {
    const r = run(core, 'syn-' + x.name, o), last = r[r.length - 1];
    const q = keyKind(last, x); k[q]++; fin += MIREX[q];
    const late = r.filter((y) => y.t >= 10); avg += late.reduce((s, y) => s + MIREX[keyKind(y, x)], 0) / late.length;
    const p = `${x.mode}${x.v}`; byP[p] = (byP[p] || 0) + MIREX[q] / 12;
  }
  console.log(`| ${id} | ${(fin / L.length).toFixed(2)} | ${(avg / L.length).toFixed(2)} | ${k.exact}/${k.fifth}/${k.relative}/${k.parallel}/${k.other} | ${Object.entries(byP).map(([p, v]) => p + ' ' + v.toFixed(2)).join(', ')} |`);
}
