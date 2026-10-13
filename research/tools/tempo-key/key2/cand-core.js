// A copy of radio/040's KEY CORE with candidate options. With no options it is
// the page's block, checked reading for reading against the page on all six.
const KEY_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const KEY_PROFILES = {
  kk: { major: [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88],
    minor: [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17] },
  temperley: { major: [0.748, 0.060, 0.488, 0.082, 0.670, 0.460, 0.096, 0.715, 0.104, 0.366, 0.057, 0.400],
    minor: [0.712, 0.084, 0.474, 0.618, 0.049, 0.460, 0.105, 0.747, 0.404, 0.067, 0.133, 0.330] },
  edma: { major: [1.00, 0.29, 0.50, 0.40, 0.60, 0.56, 0.32, 0.80, 0.31, 0.45, 0.42, 0.39],
    minor: [1.00, 0.31, 0.44, 0.58, 0.33, 0.49, 0.29, 0.78, 0.43, 0.29, 0.53, 0.32] },
  bgate: { major: [1.00, 0.00, 0.42, 0.00, 0.53, 0.37, 0.00, 0.77, 0.00, 0.38, 0.21, 0.30],
    minor: [1.00, 0.00, 0.36, 0.39, 0.00, 0.38, 0.00, 0.74, 0.27, 0.00, 0.42, 0.23] },
  shaath: { major: [6.6, 2.0, 3.5, 2.3, 4.6, 4.0, 2.5, 5.2, 2.4, 3.7, 2.3, 3.4],
    minor: [6.5, 2.7, 3.5, 5.4, 2.6, 3.5, 2.5, 5.2, 4.0, 2.7, 4.3, 3.2] },
  albrecht: { major: [0.238, 0.006, 0.111, 0.006, 0.137, 0.094, 0.016, 0.214, 0.009, 0.080, 0.008, 0.081],
    minor: [0.220, 0.006, 0.104, 0.123, 0.019, 0.103, 0.012, 0.214, 0.062, 0.022, 0.061, 0.052] },
};
function profileOf(name) {
  if (KEY_PROFILES[name]) return KEY_PROFILES[name];
  // 'a+b': the mean of two sets, each scaled to sum 1 per mode
  const parts = name.split('+').map((p) => KEY_PROFILES[p]);
  const out = { major: new Array(12).fill(0), minor: new Array(12).fill(0) };
  for (const p of parts) for (const m of ['major', 'minor']) { const s = p[m].reduce((a, b) => a + b, 0); for (let i = 0; i < 12; i++) out[m][i] += p[m][i] / s / parts.length; }
  return out;
}
const KEY_MIN_S = 3;
function keyCreate(sr, n, o = {}) {
  const s = { sr, n, lo: o.lo ?? 55, hi: o.hi ?? 2000, tau: o.tau ?? 30, floorDb: o.floorDb ?? 35,
    taper: o.taper ?? 1, taperLo: o.taperLo ?? o.taper ?? 1, taperHi: o.taperHi ?? o.taper ?? 1, profiles: profileOf(o.profiles ?? 'temperley'), harm: o.harm ?? 0.7, stick: o.stick ?? 0.05,
    minorBias: o.minorBias ?? 0, relBass: o.relBass ?? 0, bassHi: o.bassHi ?? 250, logc: o.logc ?? 0,
    kernel: o.kernel ?? 'tri', shortTau: o.shortTau ?? 0, thr: o.thr ?? 0.8, fast: o.fast ?? 8, short: new Float64Array(12), sim: 1, relNow: o.relNow ?? 0, sub: o.sub ?? 0, peakPow: o.peakPow ?? 1,
    acc: new Float64Array(12), bass: new Float64Array(12), now: new Float64Array(12), tRe: 0, tIm: 0, tuning: 0, heard: 0, last: null };
  s.k0 = Math.max(2, Math.floor(s.lo * n / sr) - 1);
  s.k1 = Math.min(n / 2 - 2, Math.ceil(s.hi * n / sr) + 1);
  return s;
}
function keyFrame(s, db, dt) {
  const { sr, n, k0, k1 } = s;
  let top = -Infinity;
  for (let k = k0; k <= k1; k++) if (db[k] > top) top = db[k];
  const frame = new Float64Array(12), bframe = new Float64Array(12);
  if (!(top > -100)) { keyDecay(s, frame, bframe, dt); return; }
  const floor = top - s.floorDb;
  let tRe = 0, tIm = 0;
  const peaks = [];
  for (let k = k0 + 1; k < k1; k++) {
    const a = db[k - 1], b = db[k], c = db[k + 1];
    if (!(b > a && b >= c && b > floor)) continue;
    const den = a - 2 * b + c;
    const o = 0.5 * (a - c) / den;
    const off = Number.isFinite(o) ? Math.max(-0.5, Math.min(0.5, o)) : 0;
    const f = (k + off) * sr / n;
    if (f < s.lo || f > s.hi) continue;
    const p = 69 + 12 * Math.log2(f / 440);
    let w = b - floor;
    if (s.peakPow !== 1) w = Math.pow(w, s.peakPow);
    const x = Math.min(Math.log2(f / s.lo) / s.taperLo, Math.log2(s.hi / f) / s.taperHi);
    if (x < 1) w *= 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, x));
    const dv = p - Math.round(p);
    tRe += w * Math.cos(2 * Math.PI * dv); tIm += w * Math.sin(2 * Math.PI * dv);
    peaks.push(p, w, f);
  }
  const g = Math.exp(-dt / 2);
  s.tRe = s.tRe * g + tRe; s.tIm = s.tIm * g + tIm;
  s.tuning = Math.atan2(s.tIm, s.tRe) / (2 * Math.PI);
  if (s.harm) for (let i = peaks.length - 3; i >= 0; i -= 3) {
    for (let j = 0; j < i; j += 3) {
      const dp = peaks[i] - peaks[j];
      if ((Math.abs(dp - 19.02) < 0.35 || Math.abs(dp - 27.86) < 0.35) && peaks[j + 1] >= peaks[i + 1]) { peaks[i + 1] *= 1 - s.harm; break; }
    }
  }
  for (let i = 0; i < peaks.length; i += 3) {
    const q = peaks[i] - s.tuning, r = Math.round(q), d = Math.abs(q - r);
    const near = s.kernel === 'cos2' ? Math.cos(Math.PI * d) ** 2 : 1 - 2 * d;
    const pc = ((r % 12) + 12) % 12;
    frame[pc] += peaks[i + 1] * near;
    if (s.sub) frame[(pc + 5) % 12] += s.sub * peaks[i + 1] * near;
    if (peaks[i + 2] < s.bassHi) bframe[pc] += peaks[i + 1] * near;
  }
  let sum = 0, bsum = 0;
  for (let i = 0; i < 12; i++) { sum += frame[i]; bsum += bframe[i]; }
  if (sum > 0) for (let i = 0; i < 12; i++) frame[i] /= sum;
  if (bsum > 0) for (let i = 0; i < 12; i++) bframe[i] /= bsum;
  keyDecay(s, frame, bframe, dt);
  if (sum > 0) s.heard += dt;
}
function keyDecay(s, frame, bframe, dt) {
  let tau = s.tau;
  if (s.shortTau) {
    // a short memory beside the long one; while the two disagree (correlation under
    // thr) the long memory forgets at `fast`, so a new song takes over sooner
    const q = Math.exp(-dt / s.shortTau);
    let ab = 0, aa = 0, bb = 0, ma = 0, mb = 0;
    for (let i = 0; i < 12; i++) { s.short[i] = s.short[i] * q + frame[i] * dt; ma += s.short[i] / 12; mb += s.acc[i] / 12; }
    for (let i = 0; i < 12; i++) { const a = s.short[i] - ma, b = s.acc[i] - mb; ab += a * b; aa += a * a; bb += b * b; }
    s.sim = aa > 0 && bb > 0 ? ab / Math.sqrt(aa * bb) : 1;
    if (s.sim < s.thr) tau = s.fast;
  }
  const g = Math.exp(-dt / tau), h = Math.exp(-dt / 0.5);
  for (let i = 0; i < 12; i++) { s.acc[i] = s.acc[i] * g + frame[i] * dt; s.bass[i] = s.bass[i] * g + bframe[i] * dt; s.now[i] = s.now[i] * h + frame[i] * (1 - h); }
}
function keyCorr(x, prof, rot) {
  let mx = 0, mp = 0;
  for (let i = 0; i < 12; i++) { mx += x[i]; mp += prof[i]; }
  mx /= 12; mp /= 12;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < 12; i++) {
    const a = x[(i + rot) % 12] - mx, b = prof[i] - mp;
    sxy += a * b; sxx += a * a; syy += b * b;
  }
  return sxx > 0 ? sxy / Math.sqrt(sxx * syy) : 0;
}
function keyRead(s) {
  if (s.heard < KEY_MIN_S) return null;
  let x = s.acc;
  if (s.logc) { let m = 0; for (const v of x) m = Math.max(m, v); x = Array.from(x, (v) => Math.log(1 + s.logc * v / (m || 1))); }
  const all = [];
  for (const mode of ['major', 'minor']) for (let t = 0; t < 12; t++) all.push({ tonic: t, mode, r: keyCorr(x, s.profiles[mode], t) + (mode === 'minor' ? s.minorBias : 0) });
  if (s.relBass) {
    // the bass's share of each candidate tonic, against the relative's
    let bs = 0; for (const v of s.bass) bs += v;
    if (bs > 0) for (const k of all) {
      const rel = k.mode === 'major' ? (k.tonic + 9) % 12 : (k.tonic + 3) % 12;
      k.r += s.relBass * (s.bass[k.tonic] - s.bass[rel]) / bs;
    }
  }
  all.sort((a, b) => b.r - a.r);
  if (s.last && s.stick) {
    const i = all.findIndex((k) => k.tonic === s.last.tonic && k.mode === s.last.mode);
    if (i > 0 && all[0].r - all[i].r < s.stick) all.unshift(...all.splice(i, 1));
  }
  const best = all[0], next = all[1];
  s.last = best;
  const conf = Math.max(0, Math.min(1, best.r)) * Math.max(0, Math.min(1, (best.r - next.r) / 0.1));
  const name = (k) => `${KEY_NAMES[k.tonic]} ${k.mode}`;
  return { key: name(best), tonic: best.tonic, mode: best.mode, r: best.r, confidence: conf,
    also: all.slice(1, 4).map((k) => ({ key: name(k), r: k.r })), tuning: s.tuning };
}
