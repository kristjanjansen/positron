// demo/shell/projector.mjs: a film projector, synthesised: frame-rate clatter, 50 Hz motor, noise bed.
//   const p = createProjector(ctx); p.node.connect(panner); p.start(); p.setGain(0.6); p.stop();
// Synthesised rather than sampled: no licence to vouch for and no loop seam. Per-frame jitter.
// why: lessons/kit-projector.md#header

/**
 * Eight machines at one frame rate (24 fps, sound film): only timbre varies, and the rate check
 * sweeps all eight. The clatter resonance runs 1,500 Hz (big cabinet) to 2,900 (portable).
 * why: lessons/kit-projector.md#voices
 */
export const VOICES = [
  { clatter: 1520, q: 0.75, bed: 640,  hum: 0.075, jitter: 0.028 },
  { clatter: 1740, q: 1.05, bed: 720,  hum: 0.065, jitter: 0.035 },
  { clatter: 1960, q: 0.90, bed: 800,  hum: 0.055, jitter: 0.031 },
  { clatter: 2150, q: 1.25, bed: 880,  hum: 0.050, jitter: 0.040 },
  { clatter: 2340, q: 1.10, bed: 960,  hum: 0.045, jitter: 0.033 },
  { clatter: 2520, q: 1.40, bed: 1040, hum: 0.040, jitter: 0.038 },
  { clatter: 2700, q: 1.15, bed: 1120, hum: 0.036, jitter: 0.030 },
  { clatter: 2900, q: 1.55, bed: 1200, hum: 0.032, jitter: 0.042 },
];

const FRAME_HZ = 24;              // sound film
const MAINS_HZ = 50;              // Estonia, and the film this plays under

/** One second of pink-ish noise, made once and reused as a looping buffer. */
function noiseBuffer(ctx) {
  const len = Math.floor(ctx.sampleRate);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const ch = buf.getChannelData(0);
  // A simple one-pole tilt on white noise. Not true pink, and it does not need
  // to be — it is a bed under a clatter, and the tilt is there so it does not
  // hiss like a broken tweeter.
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    last = 0.94 * last + 0.06 * w;
    ch[i] = last * 3.2;
  }
  return buf;
}

/** Where the booth wall starts taking the top off, in Hz. */
const MUFFLE_HZ = 1800;

export function createProjector(ctx, { frameHz = FRAME_HZ, mainsHz = MAINS_HZ, voice = 0,
  muffle = MUFFLE_HZ } = {}) {
  let V = VOICES[((voice % VOICES.length) + VOICES.length) % VOICES.length];
  const out = ctx.createGain();
  out.gain.value = 0;
  // One lowpass on the whole output, after every voice: the projector sounds behind a booth wall.
  // why: lessons/kit-projector.md#wall
  const wall = ctx.createBiquadFilter();
  wall.type = 'lowpass';
  wall.frequency.value = muffle;
  wall.Q.value = 0.7;
  const dull = ctx.createBiquadFilter();
  dull.type = 'highshelf';
  dull.frequency.value = 1400;
  dull.gain.value = -6;

  // ── the motor ──
  // Two partials, the second a few cents sharp of the octave so it beats like a belt-driven machine.
  // why: lessons/kit-projector.md#motor
  const hum = ctx.createGain();
  hum.gain.value = V.hum;
  for (const [mult, level] of [[1, 1], [2.01, 0.5], [3.02, 0.18]]) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = mainsHz * mult;
    const g = ctx.createGain();
    g.gain.value = level;
    o.connect(g).connect(hum);
    o.start();
  }
  const humLP = ctx.createBiquadFilter();
  humLP.type = 'lowpass'; humLP.frequency.value = 320;
  hum.connect(humLP).connect(out);
  // out -> shelf -> lowpass, and `node` is the last, so a caller cannot bypass the muffling.
  // why: lessons/kit-projector.md#chain-order
  out.connect(dull).connect(wall);

  // ── the transport bed ────────────────────────────────────────────────────
  const bedSrc = ctx.createBufferSource();
  bedSrc.buffer = noiseBuffer(ctx);
  bedSrc.loop = true;
  const bedBP = ctx.createBiquadFilter();
  bedBP.type = 'bandpass'; bedBP.frequency.value = V.bed; bedBP.Q.value = 0.6;
  const bedG = ctx.createGain();
  bedG.gain.value = 0.035;
  bedSrc.connect(bedBP).connect(bedG).connect(out);
  bedSrc.start();

  // ── the clatter ──
  // One filtered noise burst per frame, scheduled ahead on the audio clock, not a setInterval.
  // why: lessons/kit-projector.md#clatter
  const clatterBuf = noiseBuffer(ctx);
  let next = 0, timer = null, running = false;
  const LOOKAHEAD = 0.25, TICK_MS = 80;

  function one(at) {
    const src = ctx.createBufferSource();
    src.buffer = clatterBuf;
    // start somewhere random in the second of noise, so two clatters are never
    // the same sample twice — the cheapest possible variation
    const off = Math.random() * 0.9;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    // Timbre wobbles per frame as a fraction of the voice, so eight voices stay distinct.
    // why: lessons/kit-projector.md#wobble
    bp.frequency.value = V.clatter * (0.93 + Math.random() * 0.14);
    bp.Q.value = V.q;
    const g = ctx.createGain();
    // About 7 ms with a fast decay; anything longer rattles and the rate stops being audible.
    // why: lessons/kit-projector.md#click
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.9 + Math.random() * 0.25, at + 0.0012);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.028);
    src.connect(bp).connect(g).connect(out);
    src.start(at, off, 0.05);
    src.stop(at + 0.06);
  }

  function pump() {
    const until = ctx.currentTime + LOOKAHEAD;
    const period = 1 / frameHz;
    while (next < until) {
      one(next);
      next += period * (1 + (Math.random() * 2 - 1) * V.jitter);
    }
  }

  return {
    node: wall,
    /** Which machine this is. Set it when a film starts; it takes effect on the
     *  next clatter, which at 24 a second is inside a frame. */
    setVoice(i) {
      V = VOICES[((i % VOICES.length) + VOICES.length) % VOICES.length];
      const t = ctx.currentTime;
      bedBP.frequency.setTargetAtTime(V.bed, t, 0.05);
      hum.gain.setTargetAtTime(V.hum, t, 0.05);
    },
    voices: VOICES.length,
    start() {
      if (running) return;
      running = true;
      next = ctx.currentTime + 0.05;
      pump();
      timer = setInterval(pump, TICK_MS);
    },
    stop() {
      running = false;
      if (timer) { clearInterval(timer); timer = null; }
    },
    /**
     * Set the level with a short ramp. Call it once per start or stop with the ramp you want, not
     * per frame: a long ramp restarted every frame never arrives, and per-frame easing froze when hidden.
     * why: lessons/kit-projector.md#set-gain
     */
    setGain(v, secs = 0.03) {
      const t = ctx.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(out.gain.value, t);
      out.gain.linearRampToValueAtTime(Math.max(0, v), t + Math.max(0.001, secs));
    },
    dispose() {
      this.stop();
      try { bedSrc.stop(); } catch { /* already gone */ }
      try { out.disconnect(); } catch { /* already gone */ }
    },
  };
}
