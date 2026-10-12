// Runs the tempo detector of /concepts/radio/020/ and 030/ offline over a mono
// float32 file, and prints its readings as JSON.
//
//   node research/tools/tempo-key/our-tempo.mjs <in.f32> [--level agc030|static020|none] [--det module.mjs | --page page.html] [--set 'NAME=value;...'] > out.json
//
// SINCE 2026-10-12 THE DETECTOR IS A MODULE, demo/concepts/radio/tempo.mjs,
// and by default this imports that very file, so what is measured is what the
// pages run. `--det` points it at another copy of the module. `--page` keeps the
// old way for a page that still carries the detector inline (radio/030 as of
// 78667cbe, `git show 78667cbe:demo/concepts/radio/030/index.html`), which is
// how the "before" numbers are re-run.
//
// <in.f32> is raw little endian float32 mono at 44100 Hz, as made by
// `ffmpeg -i x -ac 1 -ar 44100 -f f32le x.f32` (the page's ScriptProcessor and
// analysers downmix stereo the same way, the mean of the two channels).
//
// FAITHFUL WHERE IT CAN BE: the code from `const HOP = 256;` up to the canvas
// section is lifted out of the page's HTML text and evaluated, so detHop and
// detEstimate are the page's own lines. What is re-implemented here, because it
// is WebAudio and not script: the four BiquadFilterNodes (Web Audio spec
// formulas, lowpass and highpass Q in dB, bandpass Q linear), the per sample
// follower (copied from onaudioprocess), and the level stage in front of it.
//   agc030    radio/030's live level: a gain read every 100 ms off a 4096 sample
//             RMS (slow 3 s and fast 0.3 s eases), glided with setTargetAtTime,
//             into a compressor at -3 dB, knee 3, ratio 20, attack 2 ms,
//             release 150 ms. The compressor is an approximation of Chrome's
//             DynamicsCompressorNode (no makeup gain, no look-ahead), which
//             changes the onset envelope by a constant at most.
//   static020 radio/020's per second block levelling with the tanh knee.
//   none      the decoded sound as it is.
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const file = args[0];
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const LEVEL = opt('--level', 'agc030');
const PAGE = opt('--page', null);
const DET = opt('--det', new URL('../../../demo/concepts/radio/tempo.mjs', import.meta.url).pathname);
const SR = 44100;

// --set 'HAT_BETA=0;PH_W=[1, 0.5, 0.25, 0]' rewrites the detector's own
// constants for a candidate, and refuses a name it cannot find, so a typo is
// not a run of the unchanged detector under a new label.
const setAll = (src) => {
  for (const pair of (opt('--set', '') || '').split(';').filter(Boolean)) {
    const [name, ...rest] = pair.split('='), val = rest.join('=');
    const re = new RegExp(`\\b${name} = (\\[[^\\]]*\\]|[^,;\\n]+)`);
    if (!re.test(src)) throw new Error(`--set: ${name} not found`);
    src = src.replace(re, `${name} = ${val}`);
  }
  return src;
};
const sent = [];
let D;
if (PAGE) {
  const html = readFileSync(PAGE, 'utf8');
  const a = html.indexOf('const HOP = 256;'), b = html.indexOf('// Canvas ink is read');
  if (a < 0 || b < 0) throw new Error('detector block not found in ' + PAGE);
  const block = setAll(html.slice(a, b));
  const bay = { send: (port, ev) => sent.push(ev) };
  const make = new Function('bay', 'ctx', 'playing', 'BPM_EV', `${block}\nreturn { detHop, detEstimate, setDet: (x) => { det = x; }, BANDS, HOP, FOLLOW_HZ, WIN_S, EVERY_S };`);
  D = make(bay, { sampleRate: SR }, true, 'bpm');
} else {
  // The module has no imports, so a rewritten copy loads from a data: URL.
  const src = setAll(readFileSync(DET, 'utf8'));
  const M = opt('--set', '') ? await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64')) : await import(DET);
  D = { BANDS: M.BANDS, HOP: M.HOP, FOLLOW_HZ: M.FOLLOW_HZ, WIN_S: M.WIN_S, EVERY_S: M.EVERY_S, M };
}

const raw = readFileSync(file);
const x = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength >> 2).slice();

// ── the level stage ─────────────────────────────────────────────────────
function levelAgc030(x) {
  const LEVEL_RMS = 10 ** (-16 / 20), LEVEL_MAX = 10 ** (36 / 20), LEVEL_FLOOR = 10 ** (-60 / 20);
  const READ = Math.round(0.1 * SR), N = 4096;
  const kSlow = 1 - Math.exp(-0.1 / 3), kFast = 1 - Math.exp(-0.1 / 0.3);
  let slow = 0, fast = 0, g = 1, cur = 1, target = 1, tau = 0.5;
  const y = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) {
    if (i % READ === 0 && i >= N) {
      let s = 0; for (let j = i - N; j < i; j++) s += x[j] * x[j];
      const ms = s / N;
      slow = slow ? slow + (ms - slow) * kSlow : ms;
      fast = fast ? fast + (ms - fast) * kFast : ms;
      const rms = Math.sqrt(Math.max(slow, fast));
      if (rms >= LEVEL_FLOOR) {
        const ng = Math.max(1, Math.min(LEVEL_MAX, LEVEL_RMS / rms));
        tau = ng < g ? 0.08 : 1.5 / 3; g = ng; target = ng;
      }
    }
    cur += (target - cur) * (1 - Math.exp(-1 / (tau * SR)));
    y[i] = x[i] * cur;
  }
  // compressor: threshold -3 dB, knee 3, ratio 20, attack 2 ms, release 150 ms
  const T = -3, K = 3, R = 20, at = Math.exp(-1 / (0.002 * SR)), rl = Math.exp(-1 / (0.15 * SR));
  let env = -120;
  const curve = (l) => {
    if (l < T - K / 2) return l;
    if (l > T + K / 2) return T + (l - T) / R;
    const q = l - T + K / 2; return l + (1 / R - 1) * q * q / (2 * K);
  };
  for (let i = 0; i < y.length; i++) {
    const l = 20 * Math.log10(Math.abs(y[i]) + 1e-12);
    env = l > env ? at * env + (1 - at) * l : rl * env + (1 - rl) * l;
    const gr = curve(env) - env;
    y[i] *= 10 ** (gr / 20);
  }
  return y;
}
function levelStatic020(x) {
  const LEVEL_RMS = 10 ** (-16 / 20), LEVEL_MAX_DB = 36, KNEE = 0.8, n = x.length, blk = SR, nb = Math.ceil(n / blk);
  const gdb = new Float32Array(nb);
  for (let k = 0; k < nb; k++) {
    let sum = 0, m = 0;
    for (let i = k * blk; i < Math.min(n, (k + 1) * blk); i += 2) { sum += x[i] * x[i]; m++; }
    const rms = Math.sqrt(sum / Math.max(1, m));
    gdb[k] = rms > 1e-6 ? Math.max(0, Math.min(LEVEL_MAX_DB, 20 * Math.log10(LEVEL_RMS / rms))) : 0;
  }
  const lo = gdb.map((g, k) => Math.min(g, gdb[k - 1] ?? g, gdb[k + 1] ?? g));
  const eased = lo.map((g, k) => ((lo[k - 1] ?? g) + g + (lo[k + 1] ?? g)) / 3);
  const room = 1 - KNEE, y = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const pos = i / blk - 0.5, k0 = Math.max(0, Math.min(nb - 1, Math.floor(pos))), k1 = Math.min(nb - 1, k0 + 1);
    const f = Math.max(0, Math.min(1, pos - k0));
    const g = 10 ** ((eased[k0] * (1 - f) + eased[k1] * f) / 20);
    const v = x[i] * g, av = Math.abs(v);
    y[i] = av <= KNEE ? v : Math.sign(v) * (KNEE + room * Math.tanh((av - KNEE) / room));
  }
  return y;
}
const y = LEVEL === 'agc030' ? levelAgc030(x) : LEVEL === 'static020' ? levelStatic020(x) : x;

// ── the four biquads, Web Audio spec ────────────────────────────────────
function biquad(type, f0, Q) {
  const w0 = 2 * Math.PI * f0 / SR, c = Math.cos(w0), s = Math.sin(w0);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'bandpass') {
    const al = s / (2 * Q);
    b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al;
  } else {
    const al = s / (2 * 10 ** (Q / 20));
    if (type === 'lowpass') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
    else { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
    a0 = 1 + al; a1 = -2 * c; a2 = 1 - al;
  }
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}
const bands = D.BANDS.map(([type, hz, q]) => {
  const k = biquad(type, hz, q), out = new Float32Array(y.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < y.length; i++) {
    const v = y[i], o = k.b0 * v + k.b1 * x1 + k.b2 * x2 - k.a1 * y1 - k.a2 * y2;
    x2 = x1; x1 = v; y2 = y1; y1 = o; out[i] = o;
  }
  return out;
});

// ── the detector, driven as onaudioprocess drives it ────────────────────
const Bn = D.BANDS.length, rate = SR / D.HOP, n = Math.round(D.WIN_S * rate);
const out = [];
const DUMP = !!opt('--dump', null), dumped = [];
let seen = 0;
const take = (t) => { while (seen < sent.length) { const ev = sent[seen++]; out.push({ t: +t.newest.toFixed(3), bpm: ev.v, conf: ev.confidence, beatAt: +ev.beatAt.toFixed(4), cand: ev.candidates.map((c) => c.bpm), ...(ev.offHats != null ? { offHats: ev.offHats } : {}) }); } };
const t0 = performance.now();
if (PAGE) {
  const t = { rate, n, env: new Float32Array(n), bands: D.BANDS.map(() => new Float32Array(n)), w: 0, count: 0, newest: 0,
    prev: new Float32Array(Bn), since: 0, picks: [], est: null, conf: null, beatAt: null, marked: -Infinity,
    f: new Float64Array(2 * Bn), h: 0, k: 1 - Math.exp(-2 * Math.PI * D.FOLLOW_HZ / SR) };
  D.setDet(t);
  const f = t.f, kk = t.k;
  for (let i = 0; i < y.length; i++) {
    for (let b = 0; b < Bn; b++) { const v = bands[b][i]; f[2 * b] += (v * v - f[2 * b]) * kk; f[2 * b + 1] += (f[2 * b] - f[2 * b + 1]) * kk; }
    if (++t.h === D.HOP) {
      t.h = 0; D.detHop((i + 1) / SR);
      if (DUMP) { const j = (t.w - 1 + t.n) % t.n; for (let b = 0; b < Bn; b++) dumped.push(t.bands[b][j]); }
      take(t);
    }
  }
} else {
  // Driven exactly as the page's ScriptProcessor drives it: 1024 samples a
  // block, through the module's own detFeed.
  const t = D.M.detState(SR);
  t.onReading = (ev) => sent.push(ev);
  const BLK = 1024;
  for (let s0 = 0; s0 + BLK <= y.length; s0 += BLK) {
    D.M.detFeed(t, bands.map((x) => x.subarray(s0, s0 + BLK)), BLK, s0 / SR);
    take(t);
  }
  if (DUMP) throw new Error('--dump needs --page');
}
const ms = performance.now() - t0;
// --dump <file>: every hop's four band rises (what detHop writes into t.bands),
// for folding against a reference's beats. Float32, band major.
if (opt('--dump', null)) {
  const { writeFileSync } = await import('node:fs');
  writeFileSync(opt('--dump'), Buffer.from(new Float32Array(dumped).buffer));
}
process.stdout.write(JSON.stringify({ file, det: PAGE || DET, level: LEVEL, set: opt('--set', ''), seconds: y.length / SR, msPerSecond: +(ms / (y.length / SR)).toFixed(2), readings: out }));
