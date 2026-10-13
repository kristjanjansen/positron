// demo/typist/machines/fx.mjs: the fx box of /typist/machines/.
//
// Typewriter characters made from ONE Hermes Precisa 305 sample set, one per
// positive index, every one generated from its number by the same logic
// (asked: *"why handtuned? just universal logic?"*). A character is two
// halves, and they live where each can be done:
//   - `rate`, a playback rate per key type (letter, space, return, bell,
//     delete). Pitch and length belong to the sampler, because a buffer's rate
//     is set where it starts. The typewriter takes it from its own index input.
//   - everything else, a chain of filters, a body, a little drive and a short
//     room, built here as WebAudio nodes on the fx box.
// The box builds the chosen chain on a switch and ramps the old and the new
// output gains over FADE seconds, so a change in the middle of a strike does
// not click. The same `chain()` runs on an OfflineAudioContext, which is how
// the characters are measured against each other.

import { mulberry32 } from '/shell/seed.mjs';

export const FADE = 0.02;   // seconds, the crossfade between two characters

/** A seeded noise source, so an impulse is the same on every load and every render. */
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 31 - 1; };
}

/** A short room or body: decaying noise, plus a feedback comb's taps when `comb` ms is set. */
function impulse(c, { ms, decay, comb }, seed) {
  const sr = c.sampleRate, n = Math.max(1, Math.round(sr * ms / 1000));
  const b = c.createBuffer(1, n, sr), x = b.getChannelData(0), r = rng(seed);
  for (let i = 0; i < n; i++) x[i] = r() * Math.exp(-i / sr / decay) * 0.35;
  if (comb) {
    const step = Math.round(sr * comb / 1000);
    for (let k = 1, a = 0.7; k * step < n; k++, a *= 0.72) x[k * step] += a;
  }
  return b;
}

/** A drive (tanh) and an optional quantiser (`bits`), as one curve; null when neither. */
function curve({ drive, bits }) {
  if (!drive && !bits) return null;
  const N = 2048, k = new Float32Array(N), L = bits ? 2 ** (bits - 1) : 0;
  for (let i = 0; i < N; i++) {
    const x = (i / (N - 1)) * 2 - 1;
    let y = drive ? Math.tanh(drive * x) / Math.tanh(drive) : x;
    if (L) y = Math.round(y * L) / L;
    k[i] = y;
  }
  return k;
}

/**
 * One character's chain on any BaseAudioContext. Returns `{ input, output }`:
 * input -> highpass -> lowpass -> low shelf -> peak -> shaper -> dry + room -> level.
 */
export function chain(c, ch, seed = 1) {
  // Machine 0 is the recording as it is: no filter, no drive, no room.
  if (ch.n === 0 || ch.amt === 0) { const g = c.createGain(); return { input: g, output: g }; }
  const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = ch.hp; hp.Q.value = 0.7;
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = ch.lp; lp.Q.value = 0.7;
  const sh = c.createBiquadFilter(); sh.type = 'lowshelf'; sh.frequency.value = ch.shelf.f; sh.gain.value = ch.shelf.g;
  const pk = c.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = ch.peak.f; pk.gain.value = ch.peak.g; pk.Q.value = ch.peak.q;
  hp.connect(lp).connect(sh).connect(pk);
  let last = pk;
  const k = curve(ch);
  if (k) { const ws = c.createWaveShaper(); ws.curve = k; ws.oversample = 'none'; last.connect(ws); last = ws; }
  const level = c.createGain(); level.gain.value = ch.level;
  const dry = c.createGain(); dry.gain.value = 1 - ch.room.wet * 0.5;
  const wet = c.createGain(); wet.gain.value = ch.room.wet;
  const room = c.createConvolver(); room.normalize = false; room.buffer = impulse(c, ch.room, seed);
  last.connect(dry).connect(level);
  last.connect(room).connect(wet).connect(level);
  return { input: hp, output: level };
}

/**
 * The character for an index, 1 based, GENERATED from the index with no
 * special case, so the same index is always the same machine and every index
 * is a different one.
 * ⚠️ THE MAIN DIMENSIONS ARE A LOW DISCREPANCY SEQUENCE, NOT RANDOM DRAWS.
 * Seeded draws gave neighbours that sounded alike (2, 5 and 7 all keyed near
 * 1.2). Each main dimension k puts index n at frac(0.5 + n * a_k), a_k an
 * irrational step (the golden ratio for the pitch, square roots for the rest),
 * which spreads any run of consecutive indices evenly and never repeats
 * exactly; a seeded draw (mulberry32, `shell/seed.mjs`) only
 * jitters it and picks the minor things. Every range still sounds like a
 * typewriter, and the level comes down as the boosts and the drive go up, so
 * no index is broken or much louder than another.
 */
// pitch, highpass, lowpass, peak frequency, peak gain, shelf gain, room length
const ALPHA = [(Math.sqrt(5) - 1) / 2, Math.SQRT2 - 1, Math.sqrt(5) - 2, Math.sqrt(3) - 1,
               Math.sqrt(7) - 2, Math.sqrt(11) - 3, Math.sqrt(13) - 3];

// 🔴 MACHINE 0 IS THE ORIGINAL (asked 2026-10-11, *"machine 0 should be
// original (no paramter to fx)"*, *"or disabed / enabled signal you choose"*):
// the index stays the one signal, and 0 means the fx box passes the sound
// through untouched, every key at its recorded pitch. 1 and up are generated.
const ORIGINAL = { n: 0, name: 'Machine 0', amt: 0, rate: { key: 1, space: 1, return: 1, bell: 1, del: 1 }, level: 1, room: { ms: 0, wet: 0 } };

/**
 * 🔴 DISTINCT, 0 TO 1: HOW FAR A MACHINE IS FROM THE ORIGINAL (asked 2026-10-11,
 * *"2 and 8 sounds too extreme. make it more closer to original in general.
 * distictivness as sepaate knob"*). Every parameter is drawn as before for the
 * index, then blended toward the original by `amt`: pitch in log steps toward
 * 1, the filters toward wide open, shelf, peak, drive and room toward none,
 * the grit toward 16 bits. 0 is the original for every index, 1 the full
 * machine. DISTINCT is the default.
 */
export const DISTINCT = 0.35;

export function character(n, amt = DISTINCT) {
  n = Math.max(0, Math.floor(n) || 0);
  if (n === 0) return ORIGINAL;
  const full = machine(n);
  const a = Math.max(0, Math.min(1, Number(amt)));
  const rd = (x, k = 100) => Math.round(x * k) / k;
  const toward = (x, from) => from * (x / from) ** a;           // log blend
  const rate = {};
  for (const [k, v] of Object.entries(full.rate)) rate[k] = rd(v ** a);
  const shelf = { f: full.shelf.f, g: rd(full.shelf.g * a, 10) };
  const peak = { f: full.peak.f, g: rd(full.peak.g * a, 10), q: full.peak.q };
  const drive = rd(full.drive * a, 10);
  const bits = full.bits ? Math.round(16 - (16 - full.bits) * a) : 0;
  const room = { ...full.room, wet: rd(full.room.wet * a) };
  const level = rd(1 / (1 + 0.05 * Math.max(0, shelf.g) + 0.05 * peak.g + 0.06 * drive + (bits && bits < 12 ? 0.1 : 0)));
  return { ...full, amt: a, rate, hp: Math.round(toward(full.hp, 20)), lp: Math.round(Math.min(toward(full.lp, 20000), 20000)),
           shelf, peak, drive, bits: bits >= 16 ? 0 : bits, room, level };
}

/** The full machine for an index, before DISTINCT. */
function machine(n) {
  const r = mulberry32(Math.imul(n, 2654435761) ^ 0x7e57c0de);
  const at = (k) => { const v = (0.5 + n * ALPHA[k] + (r() - 0.5) * 0.06) % 1; return v < 0 ? v + 1 : v; };
  const lin = (a, b, u = r()) => a + (b - a) * u;
  const log = (a, b, u = r()) => a * (b / a) ** u;
  const rd = (x, k = 100) => Math.round(x * k) / k;
  // 🔴 NARROWER RANGES SINCE 2026-10-11, NOTHING METALLIC OR THIN. Asked:
  // *"2 is reall metally, do not like"*, *"4 is metally and htin too"*, *"do not
  // like those"*. At full distinctness 2 had a +5.9 dB peak at 3.7 kHz, Q 2,
  // with drive, and 4 played 1.74 times fast through a 3.4 ms comb. So: pitch
  // 0.8 to 1.15 (faster reads as thin and toy), the peak only in the body,
  // 150 to 1500 Hz, gentle and broad, no comb, no bit grit, a light drive on a
  // third of them, a low pass that only darkens, a small quiet room. Machines
  // differ in pitch, body, warmth and room.
  const key = log(0.8, 1.15, at(0));
  const hp = log(30, 220, at(1));
  const lp = log(5000, 16000, at(2));
  const peak = { f: Math.round(log(150, 1500, at(3))), g: rd(lin(0, 4, at(4)), 10), q: rd(lin(0.7, 1.2)) };
  const shelf = { f: Math.round(lin(120, 260)), g: rd(lin(-2, 5, at(5)), 10) };
  const ms = Math.round(log(30, 160, at(6)));
  const drive = r() < 0.33 ? rd(lin(1, 1.6), 10) : 0;
  const bits = 0;
  const room = { ms, decay: rd((ms / 1000) * lin(0.15, 0.3), 1000), wet: rd(lin(0.05, 0.2)), comb: 0 };
  const level = rd(1 / (1 + 0.05 * Math.max(0, shelf.g) + 0.05 * peak.g + 0.06 * drive + (bits ? 0.1 : 0)));
  return { n, name: nameOf(n),
    rate: { key: rd(key), space: rd(key * lin(0.9, 1.06)), return: rd(key * lin(0.92, 1.05)),
            bell: rd(log(0.9, 1.15)), del: rd(key * lin(0.8, 0.88)) },
    hp: Math.round(hp), lp: Math.round(lp), shelf, peak, drive, bits, room, level };
}

/** Every index is named by its number (asked: *"all machine n's"*). */
export const nameOf = (n) => `Machine ${n}`;

/**
 * The fx box on a live context. `set(n)` builds that index's chain, feeds it,
 * ramps its output up and the old one's down over FADE, and drops the old
 * chain once the ramp is over, so at most two chains work, and only for the
 * length of a fade. Any positive index is a machine.
 */
export function createFx(c, at = 1, trim = async () => 1) {
  const input = c.createGain(), output = c.createGain();
  let cur = null, asked = 0;
  async function set(n, amt = cur?.amt ?? DISTINCT) {
    if (cur && cur.n === n && cur.amt === amt) return;
    const mine = ++asked;
    const k = await trim(n, amt);
    if (mine !== asked) return;   // a newer index arrived while this one was being measured
    const t = c.currentTime, ch = character(n, amt);
    const p = chain(c, ch, n);
    const fade = c.createGain();
    fade.gain.setValueAtTime(0, t);
    fade.gain.linearRampToValueAtTime(k, t + FADE);
    p.output.connect(fade).connect(output);
    input.connect(p.input);
    const old = cur;
    if (old) {
      const g = old.fade.gain;
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(0, t + FADE);
      setTimeout(() => { try { input.disconnect(old.p.input); old.fade.disconnect(); } catch { /* gone */ } live--; }, FADE * 1000 * 4);
    }
    live++;
    cur = { n, amt, p, fade, ch, trim: k };
  }
  let live = 0;
  const ready = set(at);
  return { input, output, set, ready, get index() { return cur?.n; }, get amt() { return cur?.amt; }, get character() { return cur?.ch; }, get trim() { return cur?.trim; }, get live() { return live; } };
}

/** Peak, RMS and the spectral centroid of a rendered strike, Hann frames of 2048. */
export function stats(x, sr) {
  let peak = 0, sum = 0;
  for (const v of x) { peak = Math.max(peak, Math.abs(v)); sum += v * v; }
  const N = 2048, w = new Float32Array(N).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)));
  let num = 0, den = 0;
  const re = new Float64Array(N), im = new Float64Array(N);
  for (let s = 0; s + N <= x.length; s += N / 2) {
    for (let i = 0; i < N; i++) { re[i] = x[s + i] * w[i]; im[i] = 0; }
    fft(re, im);
    for (let b = 1; b < N / 2; b++) { const m = Math.hypot(re[b], im[b]); num += m * (b * sr / N); den += m; }
  }
  return { peak: +peak.toFixed(3), rms: +Math.sqrt(sum / x.length).toFixed(4),
           centroid: Math.round(den ? num / den : 0), ms: Math.round((x.length / sr) * 1000) };
}

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let b = n >> 1;
    for (; j & b; b >>= 1) j ^= b;
    j ^= b;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const a = (-2 * Math.PI) / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k], ui = im[i + k];
        const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + vr; im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}

/** Render one sample through one character, offline: the same chain, the same rate the sampler would use, times `trim`. */
export async function render(buffer, n, kind = 'key', trim = 1, amt = DISTINCT) {
  const ch = character(n, amt), rate = ch.rate[kind] ?? 1, sr = buffer.sampleRate;
  const len = Math.ceil((buffer.duration / rate + ch.room.ms / 1000 + 0.05) * sr);
  const c = new OfflineAudioContext(1, len, sr);
  const src = c.createBufferSource(); src.buffer = buffer; src.playbackRate.value = rate;
  const p = chain(c, ch, n);
  const g = c.createGain(); g.gain.value = trim;
  src.connect(p.input); p.output.connect(g).connect(c.destination);
  src.start();
  const out = await c.startRendering();
  return { n, name: ch.name, rate, ...stats(out.getChannelData(0), sr) };
}

/**
 * THE LOUDNESS TRIM. The ranges above make every machine sound like a
 * typewriter but not equally loud: MEASURED before this, one strike through
 * indexes 1 to 12 ranged from 0.0064 to 0.047 RMS, 17 dB, and the quiet ones
 * read as broken. So each index is measured once, offline, on a letter
 * strike, and given the gain that brings it to the original strike's loudness, within 0.5 to 4.
 * Cached per index, so a switch back costs nothing.
 */
// Every machine is trimmed to the loudness of the ORIGINAL strike, so
// stepping from Machine 0 to any other changes the sound and not the level.
const trims = new Map();
let originalRms = null;
export function trimFor(buffer, n, amt = DISTINCT) {
  if (n === 0 || amt === 0) return Promise.resolve(1);
  originalRms ??= render(buffer, 0, 'key').then((r) => r.rms || 0.025);
  const key = `${n} ${amt}`;
  if (!trims.has(key)) trims.set(key, Promise.all([originalRms, render(buffer, n, 'key', 1, amt)])
    .then(([t, r]) => Math.min(4, Math.max(0.5, t / (r.rms || t)))));
  return trims.get(key);
}
