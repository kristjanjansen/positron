// What tells two sounds apart, shared by the patch stepper and the granulator so both grade alike.
// Two axes from the ONSET (captures start with silence): envelope (struck vs held) and centroid.
// why: lessons/rig-board-synth.md#measure-header
export const RATE = 48000;
const N = 4096;
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, half = len / 2;
    for (let i = 0; i < n; i += len) for (let k = 0; k < half; k++) {
      const c = Math.cos(ang * k), s = Math.sin(ang * k);
      const ur = re[i + k], ui = im[i + k];
      const vr = re[i + k + half] * c - im[i + k + half] * s;
      const vi = re[i + k + half] * s + im[i + k + half] * c;
      re[i + k] = ur + vr; im[i + k] = ui + vi;
      re[i + k + half] = ur - vr; im[i + k + half] = ui - vi;
    }
  }
}
export function measure(captured) {
  const per = captured.map((f) => { let s = 0; for (const v of f) s += (v / 32768) ** 2; return Math.sqrt(s / f.length); });
  const peak = Math.max(0, ...per);
  const onset = per.findIndex((r) => r > Math.max(0.002, peak * 0.2));
  const tail = per.slice(-6).reduce((a, b) => a + b, 0) / 6;
  const samples = [];
  for (const f of captured) for (let i = 0; i < f.length; i++) samples.push(f[i] / 32768);
  // Four windows from 50 ms after onset (about 340 ms): one window moved half an octave between
  // takes.
  // why: lessons/rig-board-synth.md#measure-windows
  const start = Math.max(0, (onset < 0 ? 0 : onset) * 960 + RATE * 0.05);
  const mag = new Float64Array(N / 2);
  let blocks = 0;
  for (let b = 0; b < 4; b++) {
    const at = start + b * N;
    if (at + N > samples.length) break;
    const re = new Float64Array(N), im = new Float64Array(N);
    for (let i = 0; i < N; i++) re[i] = samples[at + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / N));
    fft(re, im);
    for (let k = 1; k < N / 2; k++) mag[k] += Math.hypot(re[k], im[k]);
    blocks++;
  }
  let numer = 0, denom = 0;
  for (let k = 1; k < N / 2; k++) { numer += mag[k] * (k * RATE / N); denom += mag[k]; }
  return { peak, tail, ratio: peak > 0 ? tail / peak : 0, centroid: denom > 0 ? numer / denom : 0, onset, blocks, n: captured.length };
}
// `env` and `oct` must both move for "a different instrument"; loudness alone cannot.
// why: lessons/rig-board-synth.md#measure-distance
export const distance = (a, b) => ({
  env: Math.abs(a.ratio - b.ratio),
  oct: a.centroid > 0 && b.centroid > 0 ? Math.abs(Math.log2(a.centroid / b.centroid)) : 0,
});

const med = (xs) => { const s = [...xs].sort((x, y) => x - y); return s[s.length >> 1]; };

// One take of a stochastic instrument is not a measurement: repeat, take the median, and report
// `spread` (median distance from it) as the floor a difference must clear.
// why: lessons/rig-board-synth.md#measure-summarise
export function summarise(takes) {
  const good = takes.filter((t) => t && t.n > 0);
  if (!good.length) return null;
  const mid = {
    peak: med(good.map((t) => t.peak)),
    ratio: med(good.map((t) => t.ratio)),
    centroid: med(good.map((t) => t.centroid)),
    n: good.length,
  };
  const ds = good.map((t) => distance(t, mid));
  return {
    ...mid,
    takes: good.length,
    spread: { env: med(ds.map((d) => d.env)), oct: med(ds.map((d) => d.oct)) },
  };
}

// B differs from A when it clears the LARGER spread times `margin`; an axis with zero spread cannot
// vote.
// why: lessons/rig-board-synth.md#measure-separated
export function separated(a, b, margin = 2) {
  const d = distance(a, b);
  const axes = {};
  for (const k of ['env', 'oct']) {
    const floor = Math.max(a.spread?.[k] ?? 0, b.spread?.[k] ?? 0);
    axes[k] = { d: d[k], floor, clears: floor > 0 && d[k] > floor * margin };
  }
  return { ...axes, any: axes.env.clears || axes.oct.clears };
}
