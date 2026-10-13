// demo/typist/sampler.mjs: the Hermes Precisa 305 sampler of
// /typist/typewriter/ and /typist/typewriters/, lifted for /typist/multi-typer/, where
// several typewriters share ONE set of decoded buffers. 010 and 020 still carry
// their own copy and are unchanged.
//
// Two halves, because 030 has one of the first and many of the second:
//   - `createSamples()`: the nine files from our R2 bucket, fetched and decoded
//     once into AudioBuffers on the first `load(ctx)`, which a page calls on a
//     press and never on a visit. Provenance in `typewriter/SOURCES.md`.
//   - `createVoice(ctx, samples, ...)`: one typewriter. One
//     AudioBufferSourceNode per key into the voice's own `out` gain, so a press
//     costs no fetch and no decode; the pitch per key type comes from a
//     character (`typewriters/fx.mjs`), read when a sample starts.

// R2, through the station worker's /media/ door, which answers CORS for any origin.
export const BASE = 'https://positron-station.kristjan-jansen.workers.dev/media/typewriter/hermes-precisa-305/';
export const FILES = ['key-1', 'key-2', 'key-3', 'key-4', 'key-5', 'space', 'bell-1', 'bell-2', 'return'];
export const STRIKES = ['key-1', 'key-2', 'key-3', 'key-4', 'key-5'];
// The space bar was recorded about 14 dB under a strike; lifted to sit with them.
export const LEVEL = { space: 2.4, 'bell-1': 0.55, 'bell-2': 0.55, return: 0.8 };
export const BELL_AT = 64 - 8;   // a typewriter rings eight characters before the margin

/** What a key type is called in a character's `rate` table. */
export const KIND = (name) => (name.startsWith('key') ? 'key' : name.startsWith('bell') ? 'bell' : name);

/** The shared sample set. `load(ctx)` once; every later call answers the same promise. */
export function createSamples({ base = BASE } = {}) {
  const buf = new Map();
  const stat = { decoded: 0, ms: 0, bytes: 0, at: 0 };
  let loading = null;
  function load(ctx) {
    if (loading) return loading;
    const t0 = performance.now();
    loading = Promise.all(FILES.map(async (f) => {
      const r = await fetch(base + f + '.mp3');
      if (!r.ok) throw new Error(`${f}.mp3 answered ${r.status}`);
      const ab = await r.arrayBuffer();
      stat.bytes += ab.byteLength;
      buf.set(f, await ctx.decodeAudioData(ab));
      stat.decoded++;
    })).then(() => { stat.ms = Math.round(performance.now() - t0); stat.at = performance.now(); });
    return loading;
  }
  return { buf, stat, load, get loading() { return loading; }, get ready() { return stat.decoded === FILES.length; } };
}

/**
 * One typewriter.
 * @param {BaseAudioContext} ctx
 * @param {ReturnType<typeof createSamples>} samples
 * @param {object} o
 * @param {AudioNode} o.out              where its strikes go, its `audio-out`
 * @param {() => {rate: object}} o.tuning the character whose `rate` table it plays at
 * @param {() => boolean} [o.muted]
 */
export function createVoice(ctx, samples, { out, tuning, muted = () => false }) {
  let lastStrike = -1, until = 0, started = 0;
  const jitter = (w) => 1 + (Math.random() * 2 - 1) * w;

  function play(name, { rate = 1, gain = 1, kind = KIND(name) } = {}) {
    const b = samples.buf.get(name);
    if (!b || muted()) return;
    rate *= tuning().rate[kind] ?? 1;
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    src.buffer = b;
    src.playbackRate.value = rate;
    g.gain.value = gain * (LEVEL[name] ?? 1);
    src.connect(g).connect(out);
    src.start();
    started++;
    until = Math.max(until, ctx.currentTime + b.duration / rate);
  }

  /** A letter: one of five strikes, never the same twice running, a little off in pitch and weight. */
  function strike(o = {}) {
    let i = Math.floor(Math.random() * STRIKES.length);
    if (i === lastStrike) i = (i + 1) % STRIKES.length;
    lastStrike = i;
    play(STRIKES[i], { rate: jitter(0.035), gain: jitter(0.12) * (o.gain || 1), kind: o.kind || 'key' });
  }

  /** What one input sounds like: `kind` is an InputEvent's inputType, `column` where the carriage is after it. */
  function sound(kind = '', data = '', column = 0) {
    if (kind === 'insertLineBreak' || kind === 'insertParagraph') return play('return');
    if (kind.startsWith('delete')) return strike({ kind: 'del', gain: 0.6 });   // no backspace was recorded: a strike, lower and softer
    if (kind.startsWith('insert')) {
      if (data === ' ') play('space');
      else strike();
      if (column % 64 === BELL_AT) play(Math.random() < 0.5 ? 'bell-1' : 'bell-2');
    }
  }

  return { play, strike, sound, get until() { return until; }, get started() { return started; } };
}
