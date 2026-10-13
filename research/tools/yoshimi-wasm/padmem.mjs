import fs from 'node:fs'; import zlib from 'node:zlib'; import path from 'node:path';
const root = '../jy/banks'; const mib = [];
for (const b of fs.readdirSync(root)) { const d = path.join(root, b); if (!fs.statSync(d).isDirectory()) continue;
  for (const f of fs.readdirSync(d).filter((x) => x.endsWith('.xiz'))) {
    let raw = fs.readFileSync(path.join(d, f)); try { raw = zlib.gunzipSync(raw); } catch {}
    const x = raw.toString(); if (!/PADsynth_used" value="yes/.test(x)) continue;
    let tot = 0; // a patch can have several kit items with PAD enabled; count each SAMPLE_QUALITY block whose PAD is enabled (approximation: all blocks)
    for (const m of x.matchAll(/<SAMPLE_QUALITY>([\s\S]*?)<\/SAMPLE_QUALITY>/g)) {
      const g = (k) => +(m[1].match(new RegExp(`name="${k}" value="(\\d+)"`)) || [0, 0])[1];
      const ss = 1 << (g('samplesize') + 14); let so = g('samples_per_octave'); so = so === 5 ? 6 : so === 6 ? 12 : so;
      let n = g('octaves') + 1; if (so) n *= so; n = Math.min(n, 64);
      tot += n * ss * 4 / 1048576;
    }
    mib.push([tot, `${b}/${f}`]);
  } }
mib.sort((a, b) => a[0] - b[0]); const q = (p) => mib[Math.min(mib.length - 1, Math.floor(p * mib.length))][0].toFixed(1);
console.log(`PAD patches ${mib.length}: wavetable MiB p50 ${q(0.5)} p95 ${q(0.95)} max ${q(1)} (${mib.at(-1)[1]}); min ${mib[0][0].toFixed(1)}`);
