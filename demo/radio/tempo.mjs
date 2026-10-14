// The tempo detector of /radio/tempo/ and /radio/live/, also imported by research/tools/tempo-key/
// our-tempo.mjs. `createTempoDetector(ctx, { pull, playing, onReading })`, feed `det.in`: four band
// onsets, autocorrelation scored around 120 bpm, a phase grid from the low bands; method in the lesson.
// See lessons/page-radio.md#radio-53
export const HOP = 256;
export const WIN_S = 12, MIN_S = 4;
export const LO = 60, HI = 200, PRIOR = 120, PRIOR_OCT = 0.7, HALF_W = 0.5, STICK = 0.15;
export const EVERY_S = 0.5, KEEP = 5, AGREE = 8, CAND = 5;
export const FOLLOW_HZ = 10;
// The phase step's own log scale for each band's rises (the tempo's is 1e4).
export const PH_LOGK = 5e2;
// The confidence: the score's scale, and how clear a winner the best period
// has to be over the second (r2 at or under CONF_R0 costs nothing).
export const CONF_K = 0.17, CONF_R0 = 0.4, CONF_P = 0.25;
export const BANDS = [['lowpass', 150, 1], ['bandpass', 400, 1], ['bandpass', 1500, 0.8], ['highpass', 4000, 1]];
// The phase step (6): each band's weight in the beat envelope (the hats left
// out), the hat band's index and its weight half a beat later, how far back it
// looks, the width of a pulse and how fast an older beat counts for less.
export const PH_W = [1, 0.5, 0.25, 0], HAT = 3, HAT_BETA = 1, PH_SPAN_S = 6, PH_SIG_S = 0.012, PH_DECAY_S = 3;
// (b) and (c): how much more the hats must sit on the offbeat to count as
// offbeat hats, the band weights when they do not, how much a new phase must
// beat the carried grid by, and how far the carried grid may slide, in beats.
export const PH_RATIO = 1.5, PH_Y = [1, 1, 1, 1], PH_KEEP = 0.5, PH_SLIDE = 1 / 16;
// Under this confidence a page shows "no steady beat": readings at 0.5 or more are 92% within 4%
// of the reference tools, under it 54% (20% of readings). The click waits for it too (DRUM_FLOOR).
// See lessons/page-radio.md#radio-54
export const STEADY = 0.5;
export const steady = (ev) => Number.isFinite(ev?.v) && (ev?.confidence ?? 0) >= STEADY;

/** The detector's state with no WebAudio in it, for a page and for the
 *  offline tool alike. */
export function detState(sampleRate) {
  const rate = sampleRate / HOP, n = Math.round(WIN_S * rate);
  return { sr: sampleRate, rate, n, env: new Float32Array(n), bands: BANDS.map(() => new Float32Array(n)), w: 0, count: 0, newest: 0,
    prev: new Float32Array(BANDS.length), pprev: new Float32Array(BANDS.length), pbands: BANDS.map(() => new Float32Array(n)), since: 0, picks: [], est: null, conf: null, beatAt: null, marked: -Infinity, offHats: null,
    f: new Float64Array(2 * BANDS.length), h: 0, k: 1 - Math.exp(-2 * Math.PI * FOLLOW_HZ / sampleRate), onReading: null };
}

/** Feed `len` samples of each band's filtered sound, the first one at audio
 *  clock time `t0`. The follower, then a hop every HOP samples. */
export function detFeed(t, ch, len, t0) {
  const f = t.f, k = t.k, B = BANDS.length, sr = t.sr;
  for (let i = 0; i < len; i++) {
    for (let b = 0; b < B; b++) { const v = ch[b][i]; f[2 * b] += (v * v - f[2 * b]) * k; f[2 * b + 1] += (f[2 * b] - f[2 * b + 1]) * k; }
    if (++t.h === HOP) { t.h = 0; detHop(t, t0 + (i + 1) / sr); }
  }
}

/** The detector as a page uses it: four BiquadFilterNodes into a
 *  ScriptProcessor, pulled by `pull` (a processor nothing pulls never runs),
 *  reading only while `playing()`. */
export function createTempoDetector(ctx, { pull, playing = () => true, onReading = null }) {
  const sr = ctx.sampleRate;
  const t = detState(sr);
  t.onReading = onReading;
  t.in = ctx.createGain();
  const merge = ctx.createChannelMerger(BANDS.length);
  BANDS.forEach(([type, hz, q], i) => {
    const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = hz; b.Q.value = q;
    t.in.connect(b).connect(merge, 0, i);
  });
  t.proc = ctx.createScriptProcessor(1024, BANDS.length, 1);
  merge.connect(t.proc);
  t.proc.connect(pull);
  t.proc.onaudioprocess = (e) => {
    if (!playing()) return;
    const ch = BANDS.map((_, i) => e.inputBuffer.getChannelData(i));
    const len = ch[0].length;
    detFeed(t, ch, len, e.playbackTime - len / sr);
  };
  return t;
}

export function detHop(t, at) {
  let o = 0;
  for (let b = 0; b < BANDS.length; b++) {
    const l = Math.log1p(1e4 * t.f[2 * b + 1]), r = Math.max(0, l - t.prev[b]);
    t.bands[b][t.w] = r; o += r; t.prev[b] = l;
    const pl = Math.log1p(PH_LOGK * t.f[2 * b + 1]); t.pbands[b][t.w] = Math.max(0, pl - t.pprev[b]); t.pprev[b] = pl;
  }
  t.env[t.w] = o; t.w = (t.w + 1) % t.n; t.count++; t.newest = at;
  if (++t.since >= Math.round(EVERY_S * t.rate)) {
    t.since = 0;
    const ev = detEstimate(t);
    if (ev && t.onReading) t.onReading(ev);
  }
}

/** One reading from the last WIN_S seconds, or null when there is none yet. */
export function detEstimate(t) {
  const N = Math.min(t.count, t.n), rate = t.rate;
  if (N < MIN_S * rate) return null;
  const raw = new Float32Array(N), x = new Float32Array(N), cs = new Float64Array(N + 1);
  for (let i = 0; i < N; i++) { raw[i] = t.env[(t.w - N + i + t.n) % t.n]; cs[i + 1] = cs[i] + raw[i]; }
  const W = Math.round(rate * 0.5);
  let mean = 0;
  for (let i = 0; i < N; i++) {
    const a = Math.max(0, i - W), b = Math.min(N, i + W + 1);
    x[i] = Math.max(0, raw[i] - (cs[b] - cs[a]) / (b - a)); mean += x[i];
  }
  mean /= N;
  let e0 = 0;
  for (let i = 0; i < N; i++) { x[i] -= mean; e0 += x[i] * x[i]; }
  if (e0 < 1e-9) return null;      // silence has no tempo
  const lmin = Math.floor(60 * rate / HI), lmax = Math.ceil(60 * rate / LO);
  const A = new Float32Array(4 * lmax + 4);
  for (let L = 1; L < A.length && L < N; L++) {
    let s = 0;
    for (let i = 0; i < N - L; i++) s += x[i] * x[i + L];
    A[L] = (s / (N - L)) / (e0 / N);
  }
  const at = (l) => { const i = Math.floor(l), f = l - i; return (A[i] || 0) * (1 - f) + (A[i + 1] || 0) * f; };
  const S = new Float32Array(lmax + 2);
  for (let L = lmin; L <= lmax; L++) {
    const w = Math.exp(-0.5 * (Math.log2(60 * rate / L / PRIOR) / PRIOR_OCT) ** 2);
    S[L] = w * ((at(L) + at(2 * L) + at(4 * L)) / 3 + HALF_W * at(L / 2));
  }
  const peaks = [];
  for (let L = lmin + 1; L < lmax; L++) {
    if (!(S[L] > S[L - 1] && S[L] >= S[L + 1] && S[L] > 0)) continue;
    const den = S[L - 1] - 2 * S[L] + S[L + 1];
    const Lf = L + (den ? Math.max(-0.5, Math.min(0.5, 0.5 * (S[L - 1] - S[L + 1]) / den)) : 0);
    peaks.push({ bpm: 60 * rate / Lf, s: S[L] });
  }
  if (!peaks.length) return null;
  const near = (a, b) => b != null && Math.abs(a - b) / b < 0.03;
  const pick = (p) => p.s * (near(p.bpm, t.est) ? 1 + STICK : 1);
  peaks.sort((p, q) => pick(q) - pick(p));
  const chosen = peaks[0];
  t.picks.push(chosen.bpm);
  if (t.picks.length > AGREE) t.picks.shift();
  const last = t.picks.slice(-KEEP).sort((p, q) => p - q);
  t.est = last[last.length >> 1];
  const agree = t.picks.filter((b) => near(b, t.est)).length / t.picks.length;
  const byS = [...peaks].sort((p, q) => q.s - p.s), r2 = byS[1] ? byS[1].s / byS[0].s : 0;
  const conf = (1 - Math.exp(-Math.max(0, chosen.s) / CONF_K)) * (0.5 + 0.5 * agree) * Math.min(1, Math.max(0, (1 - r2) / (1 - CONF_R0))) ** CONF_P;
  t.conf = conf;
  const P = 60 / t.est * rate, span = Math.min(N, Math.round(PH_SPAN_S * rate));
  const sg = PH_SIG_S * rate, R = Math.ceil(2 * sg);
  const low = new Float32Array(span), hat = new Float32Array(span);
  for (let i = 0; i < span; i++) {
    const j = (t.w - span + i + t.n) % t.n;
    for (let b = 0; b < BANDS.length; b++) low[i] += PH_W[b] * t.pbands[b][j];
    hat[i] = t.pbands[HAT][j];
  }
  const pulse = (e, c) => { let s = 0; for (let d = -R; d <= R; d++) { const i = Math.round(c + d); if (i >= 0 && i < span) s += Math.exp(-0.5 * ((i - c) / sg) ** 2) * e[i]; } return s; };
  // A pulse train on envelope `e` at phase `ph`, `off` hops later, each beat
  // back counting less with age.
  const train = (e, ph, off) => { let s = 0; for (let j = 0; ; j++) { const c = span - 1 - ph - j * P; if (c < R) break; s += Math.exp(-(j * P / rate) / PH_DECAY_S) * pulse(e, c + off); } return s; };
  // (a) the low bands' own best grid, (b) which side of it the hats fall on.
  let phL = 0, sL = -Infinity;
  for (let ph = 0; ph < P; ph += 0.5) { const s = train(low, ph, 0); if (s > sL) { sL = s; phL = ph; } }
  const offHats = train(hat, phL, P / 2) > PH_RATIO * train(hat, phL, 0);
  const env = offHats ? low : new Float32Array(span);
  if (!offHats) for (let i = 0; i < span; i++) { const j = (t.w - span + i + t.n) % t.n; for (let b = 0; b < BANDS.length; b++) env[i] += PH_Y[b] * t.pbands[b][j]; }
  const score = (ph) => train(env, ph, 0) + (offHats ? HAT_BETA * train(hat, ph, P / 2) : 0);
  let bestPh = 0, bestSum = -Infinity;
  for (let ph = 0; ph < P; ph += 0.5) { const s = score(ph); if (s > bestSum) { bestSum = s; bestPh = ph; } }
  t.offHats = offHats;
  // (c) the last grid, carried forward and slid at most PH_SLIDE of a beat,
  // unless the new best beats it by more than PH_KEEP.
  if (PH_KEEP > 0 && t.beatAt != null) {
    const ph0 = ((((t.newest - t.beatAt) * rate) % P) + P) % P;
    let nb = ph0, ns = score(ph0);
    for (let d = -P * PH_SLIDE; d <= P * PH_SLIDE; d += 0.5) { const q = ((ph0 + d) % P + P) % P, s = score(q); if (s > ns) { ns = s; nb = q; } }
    if (bestSum < ns * (1 + PH_KEEP)) bestPh = nb;
  }
  t.beatAt = t.newest - bestPh / rate;
  // The beats on this grid that no reading has placed yet, at most two seconds
  // back, oldest first. Half a period of guard keeps a grid that shifted a
  // little from placing the same beat twice.
  const per = 60 / t.est, from = Math.max(t.marked + per / 2, t.newest - 2);
  const fresh = [];
  for (let b = t.beatAt; b > from; b -= per) fresh.unshift(+b.toFixed(3));
  if (fresh.length) t.marked = fresh[fresh.length - 1];
  const top = Math.max(...peaks.map((p) => p.s));
  const candidates = [...peaks].sort((p, q) => q.s - p.s).slice(0, CAND)
    .map((p) => ({ bpm: Math.round(p.bpm * 10) / 10, s: Math.round((p.s / top) * 100) / 100 }));
  return { of: 'param', name: 'bpm', v: Math.round(t.est * 10) / 10, confidence: Math.round(conf * 100) / 100,
    beatAt: t.beatAt, beats: fresh, candidates, offHats };
}
