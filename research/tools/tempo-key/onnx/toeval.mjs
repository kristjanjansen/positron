// all4.json -> tk/btw-<name>.json (model alone, bt-window shape) and tk/hyb-<name>.json (our final tempo, model phase)
import { readFileSync, writeFileSync } from 'node:fs';
const TK = new URL('../tk/', import.meta.url).pathname;
const [src, msps] = [process.argv[2], +process.argv[3]];
const r = JSON.parse(readFileSync(src));
for (const [name, x] of Object.entries(r.runs)) {
  const rd = x.readings.map(({ beats, ...k }) => k);
  writeFileSync(`${TK}btw-${name}.json`, JSON.stringify({ file: name, seconds: x.seconds, msPerSecond: msps, readings: rd }));
  // windows: each window's beats, known from its end time (t of its first reading)
  const wins = x.readings.filter((q) => q.beats).map((q) => ({ end: q.t, beats: q.beats }));
  const our = JSON.parse(readFileSync(`${TK}final-${name}.json`));
  let used = 0;
  const hy = our.readings.map((q) => {
    const w = wins.filter((v) => v.end <= q.t + 1e-6).pop();
    if (!w || w.beats.length < 2) return q;
    const per = 60 / q.bpm; let b = w.beats[w.beats.length - 1];
    b += Math.floor((q.t - b) / per) * per;          // carry the model's last beat forward on OUR period to now
    used++; return { ...q, beatAt: b };
  });
  writeFileSync(`${TK}hyb-${name}.json`, JSON.stringify({ ...our, msPerSecond: our.msPerSecond + msps, readings: hy }));
  console.log(name, 'hybrid readings with a model phase', used, 'of', hy.length);
}
