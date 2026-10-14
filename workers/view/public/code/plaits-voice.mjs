// The Plaits voice /code/plaits/ plays: /muta/'s `muta-worklet.js` and `plaits.wasm`, bytes fetched
// on the main thread because a worklet cannot fetch. `warm()` fetches, `boot()` must run in a
// press; a note before the voice is up is dropped. Sound leaves via `out()`, `speakers()`, `scopeIn()`.
// See lessons/page-code.md#code-34

import { createWaveShape } from '/shell/synth-view.mjs';
// The vocabulary lives in a pure module the board imports too (rig/board/plaits.mjs).
import { P } from '/shell/plaits-params.mjs';
export { P, MODELS, PATCHES, MODEL_SHORT, KNOBS } from '/shell/plaits-params.mjs';

const PLAITS_URL = '/muta/vendor/plaits.wasm';
const WORKLET_URL = '/muta/muta-worklet.js';

/**
 * Keys into a voice: the notes held, a transpose (the pitch knob), and a first note that boots
 * the voice and plays once it is up if its key is still down.
 * @param {object} voice   createPlaitsVoice's
 * @param {object} [o]
 * @param {() => Promise<boolean>} [o.boot]  how a note before the voice is up starts it
 * See lessons/page-code.md#code-39
 */
export function createPlaitsKeys(voice, { boot = () => voice.boot() } = {}) {
  const held = new Set();        // keys down that have reached Plaits, by key note
  const playing = new Map();     // key note -> the note Plaits was handed
  let transpose = 0;
  function noteOn(n, vel) {
    held.add(n);
    if (!voice.ready()) {
      boot().then((ok) => { if (ok && held.has(n) && !playing.has(n)) noteOn(n, vel); });
      return;
    }
    const at = Math.max(0, Math.min(127, n + transpose));
    playing.set(n, at);
    voice.noteOn(at, vel);
  }
  function noteOff(n) {
    held.delete(n);
    if (playing.has(n)) { voice.noteOff(playing.get(n)); playing.delete(n); }
  }
  return { noteOn, noteOff, playing, setTranspose: (v) => { transpose = Math.round(v); }, transpose: () => transpose };
}

/**
 * @param {object} o
 * @param {Function} o.log       `(line, kind)`
 * @param {number} [o.voices]    how many voices the shim plays (1 to 8)
 * @param {Function} [o.onUp]    called once the voice is up, to connect it
 * @param {() => AudioContext} [o.context]  a context to play in (a page's shared one, at
 *   48 kHz); left out, `boot()` makes its own
 * See lessons/page-code.md#code-40
 */
export function createPlaitsVoice({ log = () => {}, voices = 6, onUp = () => {}, context = null } = {}) {
  let ctx = null, node = null, out = null, master = null, analyser = null, buf = null, freq = null;
  let ready = null, bytesP = null, level = 0, gain = 1;
  const queue = [];

  function send(m) {
    if (ready === true) node.port.postMessage(m);
    else if (m.t === 'param' || m.t === 'voices') queue.push(m);
  }
  /** Fetch the bytes, nothing else. Safe to call on intent. */
  const warm = () => (bytesP ||= fetch(PLAITS_URL).then((r) => {
    if (!r.ok) throw new Error(`${PLAITS_URL} answered ${r.status}`);
    return r.arrayBuffer();
  }).catch((e) => { bytesP = null; throw e; }));

  /** Call inside a press. Resolves true once the voice renders, false if it could not. */
  function boot() {
    if (ready) return Promise.resolve(ready);
    // Made here, synchronously inside the press. 48000 by name, because Plaits
    // is compiled for it (/muta/ says why).
    ctx = context ? context() : new AudioContext({ sampleRate: 48000, latencyHint: 'interactive' });
    ctx.resume();
    ready = (async () => {
      const t0 = performance.now();
      const [bytes] = await Promise.all([warm(), ctx.audioWorklet.addModule(WORKLET_URL)]);
      node = new AudioWorkletNode(ctx, 'plaits-voice', { outputChannelCount: [2] });
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
      out.gain.value = gain;
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

  /** The patch's level trim on Plaits' output. */
  function setGain(g) {
    gain = Number.isFinite(g) ? g : 1;
    if (out) out.gain.setTargetAtTime(gain, ctx.currentTime, 0.02);
  }
  /** A patch's engine, harmonics, decay, colour and level trim (timbre and morph are the page's knobs). */
  function loadPatch(p) {
    setGain(p.gain);
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
    warm, boot, send, loadPatch, setGain, features, scope,
    noteOn: (note, vel = 100) => send({ t: 'noteOn', note, holdMs: 0, level: vel / 127 }),
    noteOff: (note) => send({ t: 'noteOff', note }),
    allOff: () => send({ t: 'allOff' }),
    out: () => out, speakers: () => master, scopeIn: () => analyser,
    ready: () => ready === true, ctx: () => ctx, asked: () => !!bytesP, level: () => level,
  };
}
