// Caches the AnalyserNode's dB spectrum (as our-key.mjs computes it) every
// 0.1 s for bins 0..2999 (to 4.03 kHz), Float32, so candidates run in seconds.
import { readFileSync, writeFileSync } from 'node:fs';
const [file, dest] = process.argv.slice(2);
const SR = 44100, N = 32768, HOP = 4410, KEEP = 3000;
const raw = readFileSync(file);
const x = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength >> 2);
const re = new Float64Array(N), im = new Float64Array(N), win = new Float64Array(N);
for (let i = 0; i < N; i++) win[i] = 0.42 - 0.5 * Math.cos(2 * Math.PI * i / N) + 0.08 * Math.cos(4 * Math.PI * i / N);
const rev = new Uint32Array(N);
for (let i = 0, bits = Math.log2(N); i < N; i++) { let r = 0; for (let j = 0; j < bits; j++) r |= ((i >> j) & 1) << (bits - 1 - j); rev[i] = r; }
const cosT = new Float64Array(N / 2), sinT = new Float64Array(N / 2);
for (let i = 0; i < N / 2; i++) { cosT[i] = Math.cos(2 * Math.PI * i / N); sinT[i] = -Math.sin(2 * Math.PI * i / N); }
function fft() {
  for (let i = 0; i < N; i++) { const j = rev[i]; if (j > i) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
  for (let size = 2; size <= N; size <<= 1) {
    const half = size >> 1, step = N / size;
    for (let s = 0; s < N; s += size) for (let k = 0; k < half; k++) {
      const wr = cosT[k * step], wi = sinT[k * step], p = s + k, q = p + half;
      const tr = re[q] * wr - im[q] * wi, ti = re[q] * wi + im[q] * wr;
      re[q] = re[p] - tr; im[q] = im[p] - ti; re[p] += tr; im[p] += ti;
    }
  }
}
const frames = Math.floor(x.length / HOP);
const out = new Float32Array(frames * KEEP);
for (let f = 0; f < frames; f++) {
  const end = (f + 1) * HOP;
  for (let i = 0; i < N; i++) { const j = end - N + i; re[i] = j >= 0 ? x[j] * win[i] : 0; im[i] = 0; }
  fft();
  for (let k = 0; k < KEEP; k++) out[f * KEEP + k] = 20 * Math.log10(Math.hypot(re[k], im[k]) / N);
}
writeFileSync(dest, Buffer.from(out.buffer));
console.log(dest, frames);
