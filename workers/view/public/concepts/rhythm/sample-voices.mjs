// demo/concepts/rhythm/sample-voices.mjs: the four rows of /concepts/rhythm/020/,
// which play SAMPLES on the same one SuperCollider engine the synth drums run
// on. Asked 2026-10-12 (BACKLOG, "rhythm/020"): /concepts/rhythm/010/ with the
// voices playing samples, a default kit on R2, any pack or zip of WAVs dropped
// on the page replacing it.
//
// ONE DEFINITION, `drumsample`, WRITTEN AS BYTES BY `/shell/synthdef.mjs`
// (sclang-lite has no PlayBuf). The graph, as SuperCollider would say it:
//
//   { |out = 0, buf = 0, rate = 1, amp = 0.8, len = 1, gate = 1|
//       var play = PlayBuf.ar(1, buf, rate * BufRateScale.kr(buf), doneAction: 2);
//       var env  = EnvGen.ar(Env.new([0, 1, 1, 0], [0.002, len, 0.02]), doneAction: 2);
//       var cut  = EnvGen.ar(Env.asr(0.001, 1, 0.015), gate, doneAction: 2);
//       Out.ar(out, (play * env * cut * amp) ! 2)
//   }
//
// So a hit ends at the sample's end OR at `len` seconds, whichever comes
// first, and the closed hat closes the open hat's `gate` as on 000.
// Samples are mixed to mono (`toMono`, the mean of the channels) and handed to
// scsynth as 16 bit WAVs by `sonic.loadSample`, as sc-sampler.mjs does.
//
// THE KNOBS, PER ROW: pitch in semitones, -12 to +12 (the rate is 2^(st/12),
// so it is the sample played faster or slower, length and all, as a sampler
// does), and length, 0.03 to 2 s, the most of the sample a hit plays.

import { graph, RATE, OP } from '/shell/synthdef.mjs';
import { toMono } from '/shell/circuit-sample.mjs';
import { NOTE } from './voices.mjs';

/** The default kit: the four /concepts/rhythm/000/ drums, one hit each,
 *  rendered in this tab off each drum's own output pair (2026-10-12) and put
 *  on R2 under `rhythm/default-kit/`. */
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

/** Which loaded sample a row takes by default: the first whose name says so,
 *  else the row's own position among the first four. */
export function defaultPick(names, rowKey, rowIndex) {
  const want = { kick: /kick|bd|bass ?drum/i, snare: /snare|sd|clap/i, hho: /open|oh|hat|hh/i, hhc: /closed|ch|hat|hh/i }[rowKey];
  const taken = names.map((n) => n.toLowerCase());
  let i = -1;
  if (rowKey === 'hhc') i = taken.findIndex((n) => /closed/.test(n) || (/\bch\b|_ch|ch_/.test(n)));
  if (rowKey === 'hho') i = taken.findIndex((n) => /open/.test(n) || (/\boh\b|_oh|oh_/.test(n)));
  if (i < 0 && want && rowKey !== 'hho' && rowKey !== 'hhc') i = taken.findIndex((n) => want.test(n));
  if (i < 0 && (rowKey === 'hho' || rowKey === 'hhc')) i = taken.findIndex((n) => /hat|hh/.test(n));
  if (i < 0) i = Math.min(rowIndex, names.length - 1);
  return i;
}

/**
 * The four rows: `voices()`'s shape for `createDrumMachine`, each with the
 * `drumsample` definition, two knobs, and `args()` that names the row's
 * buffer (null while nothing is loaded, so a hit is skipped rather than
 * playing buffer 0).
 * @param {{ bufOf: (key: string) => number|null }} o
 */
export function sampleVoices({ bufOf }) {
  const def = drumSampleDef();
  // The last word is the knob's second line, kept to one line: `closed hat`
  // wrapped to two and made its knob taller than its neighbours.
  const ROWS = [['kick', 'kick', 'kick'], ['snare', 'snare', 'snare'], ['hho', 'open hat', 'open'], ['hhc', 'closed hat', 'closed']];
  return ROWS.map(([key, label, sub]) => ({
    key, label, name: 'drumsample', note: NOTE[key], def,
    params: [
      { name: `${key}-pitch`, control: 'rate', label: 'pitch', sub, value: 0, min: -12, max: 12, step: 1,
        unit: 'semitones', toArg: (st) => 2 ** (st / 12) },
      { name: `${key}-length`, control: 'len', label: 'length', sub, value: key === 'hhc' ? 0.1 : key === 'hho' ? 0.5 : 0.5,
        min: 0.03, max: 2, unit: 's', life: key === 'hho' },
    ],
    args: () => { const b = bufOf(key); return b == null ? null : ['buf', b]; },
  }));
}

/**
 * The samples on the engine: the default kit (fetched from R2 on the first
 * play), or whatever was dropped. `use(samples)` takes `sample-loader.mjs`'s
 * `{ name, wave }[]`, mixes each to mono and loads it into a fresh buffer.
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
