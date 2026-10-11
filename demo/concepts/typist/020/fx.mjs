// demo/concepts/typist/020/fx.mjs: the fx box of /concepts/typist/020/.
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

export function character(n) {
  n = Math.max(1, Math.floor(n) || 1);
  const r = mulberry32(Math.imul(n, 2654435761) ^ 0x7e57c0de);
  const at = (k) => { const v = (0.5 + n * ALPHA[k] + (r() - 0.5) * 0.06) % 1; return v < 0 ? v + 1 : v; };
  const lin = (a, b, u = r()) => a + (b - a) * u;
  const log = (a, b, u = r()) => a * (b / a) ** u;
  const rd = (x, k = 100) => Math.round(x * k) / k;
  const key = log(0.66, 1.75, at(0));
  // The filters move with the pitch: a sample played faster carries its body
  // higher, and a fixed low pass would take most of a fast machine away
  // (MEASURED: index 7 at rate 1.49 behind a 3.4 kHz low pass came out 20 dB
  // under the rest).
  const hp = log(40, 900, at(1)) * key;
  const lp = Math.max(hp * 4, log(3000, 12000, at(2)) * key);
  const peak = { f: Math.round(log(250, 4500, at(3))), g: rd(lin(1, 7, at(4)), 10), q: rd(lin(0.8, 2.5)) };
  const shelf = { f: Math.round(lin(120, 260)), g: rd(lin(-2, 7, at(5)), 10) };
  const ms = Math.round(log(30, 260, at(6)));
  const drive = r() < 0.5 ? 0 : rd(lin(1, 4), 10);
  const bits = r() < 0.2 ? Math.round(lin(5, 7)) : 0;
  const room = { ms, decay: rd((ms / 1000) * lin(0.15, 0.35), 1000), wet: rd(lin(0.06, 0.3)),
                 comb: r() < 0.4 ? rd(lin(0.9, 5), 10) : 0 };
  const level = rd(1 / (1 + 0.05 * Math.max(0, shelf.g) + 0.05 * peak.g + 0.06 * drive + (bits ? 0.1 : 0)));
  return { n, name: nameOf(n),
    rate: { key: rd(key), space: rd(key * lin(0.85, 1.12)), return: rd(key * lin(0.9, 1.1)),
            bell: rd(log(0.85, 1.3)), del: rd(key * lin(0.75, 0.85)) },
    hp: Math.round(hp), lp: Math.round(Math.min(lp, 16000)), shelf, peak, drive, bits, room, level };
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
  async function set(n) {
    if (cur && cur.n === n) return;
    const mine = ++asked;
    const k = await trim(n);
    if (mine !== asked) return;   // a newer index arrived while this one was being measured
    const t = c.currentTime, ch = character(n);
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
    cur = { n, p, fade, ch, trim: k };
  }
  let live = 0;
  const ready = set(at);
  return { input, output, set, ready, get index() { return cur?.n; }, get character() { return cur?.ch; }, get trim() { return cur?.trim; }, get live() { return live; } };
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
export async function render(buffer, n, kind = 'key', trim = 1) {
  const ch = character(n), rate = ch.rate[kind] ?? 1, sr = buffer.sampleRate;
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
 * strike, and given the gain that brings it to TARGET, within 0.5 to 4.
 * Cached per index, so a switch back costs nothing.
 */
export const TARGET = 0.025;
const trims = new Map();
export function trimFor(buffer, n) {
  if (!trims.has(n)) trims.set(n, render(buffer, n, 'key').then((r) => Math.min(4, Math.max(0.5, TARGET / (r.rms || TARGET)))));
  return trims.get(n);
}
