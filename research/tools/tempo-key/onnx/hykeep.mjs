// hybrid with memory: our tempo; the model's phase is adopted only when two windows in a row put it more than 1/8 beat from the carried grid
import { readFileSync, writeFileSync } from 'node:fs';
const TK = new URL('../tk/', import.meta.url).pathname;
const r = JSON.parse(readFileSync(process.argv[2]));
for (const [name, x] of Object.entries(r.runs)) {
  const K = +(process.argv[3] || 1); const wins = x.readings.filter((q) => q.beats).map((q) => ({ end: q.t, beats: q.beats })).filter((_, i) => i % K === 0);
  const our = JSON.parse(readFileSync(`${TK}final-${name}.json`));
  let grid = null, lastWin = null, strikes = 0;
  const out = our.readings.map((q) => {
    const per = 60 / q.bpm;
    const w = wins.filter((v) => v.end <= q.t + 1e-6).pop();
    if (!w || w.beats.length < 2) return q;
    const mb = w.beats[w.beats.length - 1];
    if (w !== lastWin) {
      lastWin = w;
      if (grid == null) grid = mb;
      else { const f = ((((mb - grid) / per) % 1) + 1) % 1; if (Math.min(f, 1 - f) > 1 / 8) { if (++strikes >= 2) { grid = mb; strikes = 0; } } else { grid = mb; strikes = 0; } }
    }
    const b = grid + Math.floor((q.t - grid) / per) * per;
    return { ...q, beatAt: b };
  });
  writeFileSync(`${TK}hyk-${name}.json`, JSON.stringify({ ...our, msPerSecond: our.msPerSecond + 276, readings: out }));
}
