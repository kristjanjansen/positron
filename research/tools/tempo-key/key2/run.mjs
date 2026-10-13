// Runs a key core (the page's, or cand-core.js) over cached spectra.
//   node run.mjs <name> [--page] [--opts json]  -> readings JSON on stdout
import { readFileSync } from 'node:fs';
const D = (process.env.KD2 ?? '/tmp/kd2') + '/';
export function loadCore(page) {
  let src;
  if (page) { const h = readFileSync('~/personal/positron/demo/radio/key/index.html', 'utf8'); src = h.slice(h.indexOf('// KEY CORE BEGIN'), h.indexOf('// KEY CORE END')); }
  else src = readFileSync(new URL('cand-core.js', import.meta.url), 'utf8');
  return new Function(`${src}\nreturn { keyCreate, keyFrame, keyRead };`)();
}
const cache = {};
export function spectra(name) {
  if (cache[name]) return cache[name];
  const raw = readFileSync(D + `spec-${name}.f32`);
  return (cache[name] = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength >> 2));
}
export function run(core, name, opts = {}, onRead) {
  const sp = spectra(name), KEEP = 3000, frames = sp.length / KEEP;
  const db = new Float32Array(16384).fill(-200);
  const s = core.keyCreate(44100, 32768, opts);
  const out = []; let sound = 0, next = 0.5;
  for (let f = 0; f < frames; f++) {
    db.set(sp.subarray(f * KEEP, (f + 1) * KEEP));
    core.keyFrame(s, db, 0.1);
    sound += 0.1;
    if (sound >= next - 1e-9) {
      next += 0.5;
      const r = core.keyRead(s);
      const t = +(((f + 1) * 4410) / 44100).toFixed(2);
      if (r) { out.push({ t, key: r.key, tonic: r.tonic, mode: r.mode, conf: +r.confidence.toFixed(3) }); onRead?.(t, r, s); }
    }
  }
  return out;
}
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const a = process.argv.slice(2), i = a.indexOf('--opts');
  const r = run(loadCore(a.includes('--page')), a[0], i >= 0 ? JSON.parse(a[i + 1]) : {});
  process.stdout.write(JSON.stringify({ readings: r }));
}
