// Runs the key detector of /concepts/radio/040/ offline over a mono float32
// file and prints its readings as JSON.
//
//   node research/tools/tempo-key/our-key.mjs <in.f32> [--page path] [--opts '{"profiles":"kk"}'] > out.json
//
// The block between `// KEY CORE BEGIN` and `// KEY CORE END` is lifted out of
// the page's HTML and evaluated, so keyCreate, keyFrame and keyRead are the
// page's own lines. What is re-implemented is the AnalyserNode: every 0.1 s
// the last 32768 samples, Blackman window (alpha 0.16), FFT, magnitude over N,
// `20 log10`, smoothingTimeConstant 0, as getFloatFrequencyData defines it.
// A reading every 0.5 s of sound, as keyStart does. The page feeds the
// detector the levelled sound and this does not; the floor is relative to the
// loudest peak and every frame is normalised, so a gain cannot move it.
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const file = args[0];
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const PAGE = opt('--page', new URL('../../../demo/concepts/radio/040/index.html', import.meta.url).pathname);
const OPTS = JSON.parse(opt('--opts', '{}'));
const SR = 44100, N = 32768, HOP_S = 0.1, READ_S = 0.5;

const html = readFileSync(PAGE, 'utf8');
const a = html.indexOf('// KEY CORE BEGIN'), b = html.indexOf('// KEY CORE END');
if (a < 0 || b < 0) throw new Error('KEY CORE not found in ' + PAGE);
const K = new Function(`${html.slice(a, b)}\nreturn { keyCreate, keyFrame, keyRead, KEY_PROFILES };`)();
// Candidate profiles for --opts '{"profiles":"edma"}', added beside the page's
// two. edma, bgate and shaath as Essentia's key.cpp carries them (read
// 2026-10-12 through a summariser, not byte checked); albrecht as music21 carries
// Albrecht and Shanahan 2013.
Object.assign(K.KEY_PROFILES, {
  edma: { major: [1.00, 0.29, 0.50, 0.40, 0.60, 0.56, 0.32, 0.80, 0.31, 0.45, 0.42, 0.39],
    minor: [1.00, 0.31, 0.44, 0.58, 0.33, 0.49, 0.29, 0.78, 0.43, 0.29, 0.53, 0.32] },
  bgate: { major: [1.00, 0.00, 0.42, 0.00, 0.53, 0.37, 0.00, 0.77, 0.00, 0.38, 0.21, 0.30],
    minor: [1.00, 0.00, 0.36, 0.39, 0.00, 0.38, 0.00, 0.74, 0.27, 0.00, 0.42, 0.23] },
  shaath: { major: [6.6, 2.0, 3.5, 2.3, 4.6, 4.0, 2.5, 5.2, 2.4, 3.7, 2.3, 3.4],
    minor: [6.5, 2.7, 3.5, 5.4, 2.6, 3.5, 2.5, 5.2, 4.0, 2.7, 4.3, 3.2] },
  albrecht: { major: [0.238, 0.006, 0.111, 0.006, 0.137, 0.094, 0.016, 0.214, 0.009, 0.080, 0.008, 0.081],
    minor: [0.220, 0.006, 0.104, 0.123, 0.019, 0.103, 0.012, 0.214, 0.062, 0.022, 0.061, 0.052] },
});

const raw = readFileSync(file);
const x = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength >> 2);

// radix 2 FFT, in place
const re = new Float64Array(N), im = new Float64Array(N);
const win = new Float64Array(N);
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
const db = new Float32Array(N / 2);
const s = K.keyCreate(SR, N, OPTS);
const hop = Math.round(HOP_S * SR);
const out = [];
let sound = 0, nextRead = READ_S;
for (let end = hop; end <= x.length; end += hop) {
  for (let i = 0; i < N; i++) { const j = end - N + i; re[i] = j >= 0 ? x[j] * win[i] : 0; im[i] = 0; }
  fft();
  for (let k = 0; k < N / 2; k++) db[k] = 20 * Math.log10(Math.hypot(re[k], im[k]) / N);
  K.keyFrame(s, db, HOP_S);
  sound += HOP_S;
  if (sound >= nextRead - 1e-9) {
    nextRead += READ_S;
    const r = K.keyRead(s);
    if (r) out.push({ t: +(end / SR).toFixed(2), key: r.key, tonic: r.tonic, mode: r.mode, conf: +r.confidence.toFixed(3), also: r.also.map((k) => k.key) });
  }
}
process.stdout.write(JSON.stringify({ file, opts: OPTS, seconds: x.length / SR, readings: out }));
