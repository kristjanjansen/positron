import { loadCore, run } from './run.mjs';
const core = loadCore(false);
const C = JSON.parse(process.argv[2]);
for (const [id, o] of C) {
  const res = [];
  for (const n of ['r2', 'r4', 'ida']) {
    const a = run(core, n, o); let ok = 0, tot = 0;
    for (const sh of [-3, 2, 5]) {
      const b = run(core, `${n}@${sh}`, o);
      for (const x of b) { if (x.t < 15) continue; const y = a.filter((r) => r.t <= x.t + 1e-6).pop(); if (!y) continue; tot++; if (y.mode === x.mode && (y.tonic + sh + 12) % 12 === x.tonic) ok++; }
    }
    res.push(Math.round(100 * ok / tot));
  }
  const t0 = process.hrtime.bigint(); run(core, 'ida1314', o); const us = Number(process.hrtime.bigint() - t0) / 1000 / 5997;
  console.log(`| ${id} | ${res.join(' / ')} | ${us.toFixed(0)} |`);
}
