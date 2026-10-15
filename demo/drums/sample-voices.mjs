// The rows of /drums/samples/, one per sample, on one `drumsample` definition written as bytes by
// `/shell/synthdef.mjs` (sclang-lite has no PlayBuf): a hit ends at the sample's end or `len`,
// whichever is first, and the closed hat gates the open one. Samples go in as mono 16 bit WAVs.
// See lessons/page-drums.md#drums-28

import { graph, RATE, OP } from '/shell/synthdef.mjs';
import { toMono } from '/shell/circuit-sample.mjs';

/**
 * The default kit: the four /drums/machine/ drums, one hit each, rendered off each drum's own
 * output pair and put on R2 under `rhythm/default-kit/`.
 * See lessons/page-drums.md#drums-29
 */
export const KIT_BASE = 'https://positron-station.kristjan-jansen.workers.dev/media/rhythm/default-kit/';
export const DEFAULT_KIT = ['kick.wav', 'snare.wav', 'open-hat.wav', 'closed-hat.wav'];

export function drumSampleDef() {
  const g = graph('drumsample');
  const k = g.value;
  const [out, buf, rate, amp, len, gate] = g.params([['out', 0], ['buf', 0], ['rate', 1], ['amp', 0.8], ['len', 1], ['gate', 1]]);
  const scale = g.block('BufRateScale', RATE.slow, [buf]);
  const r = g.block('BinaryOpUGen', RATE.slow, [rate, scale], 1, OP.mul);
  // PlayBuf: numChannels 1, bufnum, rate, trigger 1, startPos 0, loop 0, doneAction 2
  const play = g.block('PlayBuf', RATE.sample, [buf, r, k(1), k(0), k(0), k(2)], 1);
  // EnvGen inputs: gate, levelScale, levelBias, timeScale, doneAction, then the
  // envelope: init level, segments, release node, loop node, and per segment
  // level, time, shape (1 = linear), curve.
  const env = g.block('EnvGen', RATE.sample, [k(1), k(1), k(0), k(1), k(2),
    k(0), k(3), k(-99), k(-99), k(1), k(0.002), k(1), k(0), k(1), len, k(1), k(0), k(0), k(0.02), k(1), k(0)]);
  // Env.asr(0.001, 1, 0.015): held at 1 while the gate is 1, released on 0.
  const cut = g.block('EnvGen', RATE.sample, [gate, k(1), k(0), k(1), k(2),
    k(0), k(2), k(1), k(-99), k(1), k(0.001), k(1), k(0), k(0), k(0.015), k(1), k(0)]);
  const a = g.block('BinaryOpUGen', RATE.sample, [play, env], 1, OP.mul);
  const b = g.block('BinaryOpUGen', RATE.sample, [a, cut], 1, OP.mul);
  const c = g.block('BinaryOpUGen', RATE.sample, [b, amp], 1, OP.mul);
  g.block('Out', RATE.sample, [out, c, c], 0, 0);
  return g.bytes();
}

/** A mono 16 bit WAV of `samples` at `rate`, for `loadSample`. */
export function wavBytes(samples, rate) {
  const n = samples.length, buf = new ArrayBuffer(44 + n * 2), d = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) d.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); d.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 1, true);
  d.setUint32(24, rate, true); d.setUint32(28, rate * 2, true); d.setUint16(32, 2, true); d.setUint16(34, 16, true);
  w(36, 'data'); d.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) d.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767))), true);
  return buf;
}

/** The most rows a kit becomes: a Circuit pack's 64 sample slots, which is
 *  also how many rows /tom/ draws. A zip or a set of WAVs past it keeps its
 *  first 64, in the order they were read. */
export const MAX_ROWS = 64;

/**
 * What each row is called: the file's name without folder, `.wav` and the leading words every
 * name shares (`NOVHTG Hit - Drumstation - 808 Crash D1T1` reads `808 Crash D1T1`).
 * @param {string[]} files
 * @returns {string[]}
 * See lessons/page-drums.md#drums-30
 */
export function rowNames(files) {
  const bare = files.map((f) => String(f).split('/').pop().replace(/\.wav$/i, ''));
  if (bare.length < 2) return bare;
  const first = bare[0];
  const cuts = [];
  for (let i = 0; i < first.length; i++) {
    if (!bare.every((b) => b[i] === first[i])) break;
    // Only ever at a word's end, so a shared `Kick` is not cut to `ick`.
    if (/[\s_\-]/.test(first[i])) cuts.push(i + 1);
  }
  // The longest cut that still leaves every name a word, so `Tone 00` to
  // `Tone 63` stay as they are rather than becoming bare numbers.
  const cut = cuts.reverse().find((c) => bare.every((b) => /\p{L}/u.test(b.slice(c)))) ?? 0;
  return cut ? bare.map((b) => b.slice(cut).trim()) : bare;
}

/** How long a hit of a default kit row may ring, as the four rows had it before
 *  every sample became a row; anything else plays to its own end. */
const KIT_LEN = { kick: 0.5, snare: 0.5, 'open-hat': 0.5, 'closed-hat': 0.1 };

/**
 * `MAX_ROWS` sample rows in `voices()`'s shape. Labels are read live (`nameOf(r)`); a closed hat
 * chokes the open one by name; `args()` answers null with no buffer, so the hit is skipped.
 * @param {{ nameOf: (r: number) => string|null, fileOf: (r: number) => string|null,
 *   bufOf: (r: number) => number|null }} o
 * See lessons/page-drums.md#drums-31
 */
export function sampleRows({ nameOf, fileOf, bufOf }) {
  const def = drumSampleDef();
  return Array.from({ length: MAX_ROWS }, (_, r) => ({
    key: `s${r}`, name: 'drumsample', note: 36 + r, def,
    get label() { return nameOf(r) ?? `slot ${r + 1}`; },
    get title() { const f = fileOf(r), n = nameOf(r); return f ? `${r + 1} ${n ?? ''}, ${f}`.replace(' ,', ',') : `row ${r + 1}, nothing loaded`; },
    get opens() { return /open|\bo?hh?o\b|\boh\b/i.test(nameOf(r) ?? ''); },
    get closes() { return /closed|\bhhc\b|\bch\b/i.test(nameOf(r) ?? ''); },
    args: () => {
      const b = bufOf(r);
      if (b == null) return null;
      const f = String(fileOf(r) ?? '').replace(/\.wav$/i, '');
      return ['buf', b, 'rate', 1, 'len', KIT_LEN[f] ?? 10];
    },
  }));
}

/**
 * The samples on the engine: the default kit (fetched from R2 on the first
 * play), or whatever was dropped. `use(samples)` takes `sample-loader.mjs`'s
 * `{ name, wave }[]`, mixes each to mono and loads it into a fresh buffer.
 * See lessons/page-drums.md#drums-33
 */
export function createSampleBank({ log = () => {} } = {}) {
  let eng = null, nextBuf = 100;
  /** [{ name, buf, frames, rate, seconds }] in the order they arrived */
  let loaded = [];
  let pending = null;          // samples dropped before the engine was up
  const stat = { fetched: 0, bytes: 0, loads: 0 };

  async function load(samples) {
    const out = [];
    for (const s of samples) {
      const m = toMono(s.wave);
      if (!m.ok) { log(`${s.name}: ${m.why}`, 'warn'); continue; }
      const buf = nextBuf++;
      await eng.sonic.loadSample(buf, wavBytes(m.samples, m.rate));
      out.push({ name: s.name, buf, frames: m.frames, rate: m.rate, seconds: m.frames / m.rate });
      stat.loads++;
    }
    return out;
  }
  async function fetchDefault() {
    const { readWave } = await import('/shell/circuit-sample.mjs');
    const got = [];
    for (const f of DEFAULT_KIT) {
      const res = await fetch(KIT_BASE + f);
      if (!res.ok) throw new Error(`${f} answered ${res.status}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      stat.fetched++; stat.bytes += bytes.length;
      got.push({ name: f, wave: readWave(bytes) });
    }
    return got;
  }
  return {
    stat,
    loaded: () => loaded,
    /** The engine is up: load what was dropped, or the default kit. */
    async wake(e) {
      eng = e;
      const src = pending ?? await fetchDefault();
      const from = pending ? 'the dropped kit' : 'the default kit';
      pending = null;
      loaded = await load(src);
      log(`${from}: ${loaded.length} sample(s) on the engine`);
      return loaded;
    },
    /** A new kit. Before the engine is up it waits for it. */
    async use(samples) {
      if (!eng) { pending = samples; return null; }
      const got = await load(samples);
      if (got.length) loaded = got;
      return got;
    },
  };
}
