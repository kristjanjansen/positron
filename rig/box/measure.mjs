// rig/box/measure.mjs — what tells two sounds apart, on captured frames.
//
// Extracted so the patch stepper and the granulator grade themselves the same
// way. A second copy of a MEASUREMENT is worse than a second copy of a feature:
// two rigs that disagree about what "different" means cannot be compared, and
// the disagreement is invisible because both print numbers.
//
// ── what tells two instruments apart ─────────────────────────────────────────
// Two axes, because one can coincide. The ENVELOPE (how much of the peak is
// still there at the end) separates a struck sound from a held one; the
// SPECTRAL CENTROID separates a dull one from a bright one. Both are measured
// from the ONSET rather than from frame zero: the first frames of every capture
// here are still silence, because the note had to cross the internet to get
// there, and indexing a fixed frame compares pre-note silence against a note.
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
  // Four windows starting 50 ms after the onset — about 340 ms of the note's
  // body. One window right at the peak moved by half an octave between two
  // takes of the SAME patch, because an FM electric piano's brightness falls
  // fast; averaging four is steady to a few hundredths.
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
/**
 * How far apart two takes are, on both axes. `env` is the difference in how
 * much of the peak survives to the end; `oct` is the distance in octaves
 * between their brightness. Both have to move for a verdict of "a different
 * instrument", so a loudness wobble on its own cannot produce one.
 */
export const distance = (a, b) => ({
  env: Math.abs(a.ratio - b.ratio),
  oct: a.centroid > 0 && b.centroid > 0 ? Math.abs(Math.log2(a.centroid / b.centroid)) : 0,
});

const med = (xs) => { const s = [...xs].sort((x, y) => x - y); return s[s.length >> 1]; };

/**
 * ⚠️ ONE TAKE OF A STOCHASTIC INSTRUMENT IS NOT A MEASUREMENT.
 *
 * Pappus fires grains against a per-voice probability and a euclidean gate, so
 * two captures of the IDENTICAL setting differ — and by how much is not a
 * constant. `pappus-live.mjs` read 14, 16 and 16 of 17 across three consecutive
 * runs with DIFFERENT checks failing each time, and its own same-seed noise
 * floor moved between 0.045 and 0.126 envelope across those runs. Every
 * threshold in it was therefore being compared against a number that was itself
 * a die roll.
 *
 * The fix is not a wider threshold — that only makes the test unable to fail.
 * It is to measure the spread instead of assuming it: repeat each condition,
 * take the MEDIAN as the condition's value, and take the spread WITHIN a
 * condition as the floor that any between-condition difference has to clear.
 *
 * Returns the median take plus `spread`, the median distance from that median —
 * how far this instrument moves when nothing changed at all.
 */
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

/**
 * Is B different from A by more than either of them moves on its own?
 *
 * The floor is the LARGER of the two spreads, times a margin — comparing
 * against one condition's spread alone would call a difference real whenever
 * the quieter of the two happened to be steady. An axis with no spread
 * measured cannot vote, because a floor of zero makes everything significant.
 */
export function separated(a, b, margin = 2) {
  const d = distance(a, b);
  const axes = {};
  for (const k of ['env', 'oct']) {
    const floor = Math.max(a.spread?.[k] ?? 0, b.spread?.[k] ?? 0);
    axes[k] = { d: d[k], floor, clears: floor > 0 && d[k] > floor * margin };
  }
  return { ...axes, any: axes.env.clears || axes.oct.clears };
}
