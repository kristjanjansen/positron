// demo/concepts/synth/plaits-voice.mjs: the Plaits voice that /concepts/synth/110/
// and /concepts/synth/120/ both play, with its patches and its scope.
//
// THE VOICE IS /muta/'s, NOT A COPY: the same `muta-worklet.js` processor
// (`plai-voice`) and the same `plai.wasm`, Emilie Gillet's Plaits compiled
// unmodified. The bytes are fetched on the main thread and posted to the
// worklet, because a worklet cannot fetch (the worklet's header has why).
//
// NOTHING OPENS UNTIL ASKED. `warm()` fetches the bytes and is for intent (a
// pointer over a control); `boot()` makes the AudioContext and must be called
// inside a press. Settings sent before the voice is up wait for it; a note
// sent before it is up is dropped, so nothing sounds late on the first press.
//
// The page owns its bay. What it gets here is the sound as three nodes it
// connects by its own links: `out()` (Plaits' main jack), `speakers()` and
// `scopeIn()`.

import { createWaveShape } from '/shell/synth-view.mjs';

const PLAI_URL = '/muta/vendor/plai.wasm';
const WORKLET_URL = '/muta/muta-worklet.js';

/** The parameter ids, as muta-worklet.js and plai_shim.cc spell them. */
export const P = {
  engine: 0, note: 1, harmonics: 2, timbre: 3, morph: 4, decay: 5, lpgColour: 6,
  fmAmount: 11, timbreModAmount: 12, morphModAmount: 13,
};

/** The sixteen models in `plaits/dsp/voice.cc`'s order, as /muta/'s MODELS. */
export const MODELS = [
  'virtual analog', 'waveshaping', 'two operator FM', 'granular formant',
  'harmonic', 'wavetable', 'chord', 'speech',
  'swarm', 'filtered noise', 'particle noise', 'string',
  'modal', 'bass drum', 'snare drum', 'hi-hat',
];

// The patches, in the order worth hearing them, all sustained (asked
// 2026-10-12: *"no bell sounds please or drums. longer stuff"*, then *"rm saw
// swarm"*). `engine` is an index into MODELS, `decay` sets how long the gate
// takes to close after a note off.
export const PATCHES = [
  { name: 'Chord pad', engine: 6, harmonics: 0.45, timbre: 0.35, morph: 0.3, decay: 0.85, colour: 0.4 },
  { name: 'Wavetable drift', engine: 5, harmonics: 0.3, timbre: 0.3, morph: 0.55, decay: 0.85, colour: 0.6 },
  { name: 'Vowel choir', engine: 3, harmonics: 0.4, timbre: 0.45, morph: 0.5, decay: 0.85, colour: 0.5 },
  { name: 'Sung vowels', engine: 7, harmonics: 0.25, timbre: 0.5, morph: 0.35, decay: 0.85, colour: 0.5 },
  { name: 'Additive organ', engine: 4, harmonics: 0.35, timbre: 0.4, morph: 0.6, decay: 0.8, colour: 0.6 },
  { name: 'Long string', engine: 11, harmonics: 0.2, timbre: 0.45, morph: 0.92, decay: 0.9, colour: 0.5 },
  { name: 'Wind', engine: 9, harmonics: 0.35, timbre: 0.55, morph: 0.4, decay: 0.9, colour: 0.6 },
];

/**
 * @param {object} o
 * @param {Function} o.log       `(line, kind)`
 * @param {number} [o.voices]    how many voices the shim plays (1 to 8)
 * @param {Function} [o.onUp]    called once the voice is up, to connect it
 */
export function createPlaitsVoice({ log = () => {}, voices = 6, onUp = () => {} } = {}) {
  let ctx = null, node = null, out = null, master = null, analyser = null, buf = null, freq = null;
  let ready = null, bytesP = null, level = 0;
  const queue = [];

  function send(m) {
    if (ready === true) node.port.postMessage(m);
    else if (m.t === 'param' || m.t === 'voices') queue.push(m);
  }
  /** Fetch the bytes, nothing else. Safe to call on intent. */
  const warm = () => (bytesP ||= fetch(PLAI_URL).then((r) => {
    if (!r.ok) throw new Error(`${PLAI_URL} answered ${r.status}`);
    return r.arrayBuffer();
  }).catch((e) => { bytesP = null; throw e; }));

  /** Call inside a press. Resolves true once the voice renders, false if it could not. */
  function boot() {
    if (ready) return Promise.resolve(ready);
    // Made here, synchronously inside the press. 48000 by name, because Plaits
    // is compiled for it (/muta/ says why).
    ctx = new AudioContext({ sampleRate: 48000, latencyHint: 'interactive' });
    ctx.resume();
    ready = (async () => {
      const t0 = performance.now();
      const [bytes] = await Promise.all([warm(), ctx.audioWorklet.addModule(WORKLET_URL)]);
      node = new AudioWorkletNode(ctx, 'plai-voice', { outputChannelCount: [2] });
      node.onprocessorerror = () => log('the audio thread dropped the Plaits voice', 'bad');
      const up = new Promise((res, rej) => {
        const timer = setTimeout(() => rej(new Error('the worklet never answered')), 5000);
        node.port.onmessage = (e) => {
          const m = e.data;
          if (m?.t === 'ready') { clearTimeout(timer); res(m); }
          if (m?.t === 'fail') { clearTimeout(timer); rej(new Error(m.why)); }
        };
      });
      node.port.postMessage({ t: 'wasm', bytes, rate: ctx.sampleRate });
      const m = await up;
      // Channel 0 is Plaits' main jack, channel 1 its aux jack (worklet header).
      const split = ctx.createChannelSplitter(2);
      node.connect(split);
      out = ctx.createGain();
      split.connect(out, 0);
      master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
      analyser = ctx.createAnalyser(); analyser.fftSize = 2048;
      buf = new Float32Array(analyser.fftSize); freq = new Float32Array(analyser.frequencyBinCount);
      const pull = ctx.createGain(); pull.gain.value = 0; pull.connect(ctx.destination);
      analyser.connect(pull);
      node.port.postMessage({ t: 'voices', n: voices });
      ready = true;
      for (const q of queue.splice(0)) node.port.postMessage(q);
      onUp();
      log(`Plaits up in ${(performance.now() - t0).toFixed(0)} ms, ${m.engines} engines, ${Math.round(ctx.sampleRate)} Hz, ${voices} voices`, m.rateOk ? 'ok' : 'warn');
      requestAnimationFrame(frame);
      return true;
    })().catch((e) => { ready = null; log(`Plaits did not start: ${e.message || e}`, 'bad'); return false; });
    return ready;
  }

  /** A patch's engine, harmonics, decay and colour (timbre and morph are the page's knobs). */
  function loadPatch(p) {
    for (const [k, v] of [['engine', p.engine], ['harmonics', p.harmonics], ['decay', p.decay], ['lpgColour', p.colour]]) {
      send({ t: 'param', id: P[k], value: v });
    }
  }

  // ── the scope: full width, the trace scaled to the loudest recent window ──
  const WINDOW = 512, SPAN_MIN = 0.02, SPAN_FALL = 0.992;
  let span = 0.25;
  const scope = createWaveShape({ reason: null, colour: '--hi', height: 120, name: '' });
  function frame() {
    analyser.getFloatTimeDomainData(buf);
    let i0 = 0, hi = 0;
    for (let i = 1; i < buf.length - WINDOW; i++) if (buf[i - 1] < 0 && buf[i] >= 0) { i0 = i; break; }
    for (const v of buf) { const a = v < 0 ? -v : v; if (a > hi) hi = a; }
    level = hi;
    span = Math.max(hi / 0.9, span * SPAN_FALL, SPAN_MIN);
    scope.set({ points: Array.from(buf.subarray(i0, i0 + WINDOW), (v) => Math.max(-1, Math.min(1, v / span))), reason: '', name: '' });
    requestAnimationFrame(frame);
  }

  /** What the voice sounds like at the scope: RMS, zero crossings a sample, spectral centroid in Hz. */
  function features() {
    if (!analyser) return null;
    analyser.getFloatTimeDomainData(buf);
    let s = 0, z = 0;
    for (let i = 0; i < buf.length; i++) { s += buf[i] * buf[i]; if (i && (buf[i - 1] < 0) !== (buf[i] < 0)) z++; }
    analyser.getFloatFrequencyData(freq);
    let num = 0, den = 0;
    const hz = ctx.sampleRate / analyser.fftSize;
    for (let i = 1; i < freq.length; i++) { const m = 10 ** (freq[i] / 20); num += m * i * hz; den += m; }
    return { rms: Math.sqrt(s / buf.length), zcr: z / buf.length, centroid: den ? num / den : 0 };
  }

  return {
    warm, boot, send, loadPatch, features, scope,
    noteOn: (note, vel = 100) => send({ t: 'noteOn', note, holdMs: 0, level: vel / 127 }),
    noteOff: (note) => send({ t: 'noteOff', note }),
    allOff: () => send({ t: 'allOff' }),
    out: () => out, speakers: () => master, scopeIn: () => analyser,
    ready: () => ready === true, ctx: () => ctx, asked: () => !!bytesP, level: () => level,
  };
}
