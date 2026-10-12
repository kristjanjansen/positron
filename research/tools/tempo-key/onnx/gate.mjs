// model alone, with a confidence of its own: how regular the window's beats are (IBI coefficient of variation)
import { readFileSync, writeFileSync } from 'node:fs';
const TK = new URL('../tk/', import.meta.url).pathname;
const [src, cvMax, msps] = [process.argv[2], +process.argv[3], +process.argv[4]];
const r = JSON.parse(readFileSync(src));
for (const [name, x] of Object.entries(r.runs)) {
  let cv = 1;
  const rd = x.readings.map(({ beats, ...k }) => {
    if (beats) { const ibi = beats.slice(1).map((v, i) => v - beats[i]).sort((a, b) => a - b), m = ibi[ibi.length >> 1]; cv = Math.sqrt(ibi.reduce((s, v) => s + (v - m) ** 2, 0) / ibi.length) / m; }
    return { ...k, conf: cv < cvMax ? 1 : 0.3 };
  });
  writeFileSync(`${TK}btc-${name}.json`, JSON.stringify({ file: name, msPerSecond: msps, readings: rd }));
}
