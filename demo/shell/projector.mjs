// demo/shell/projector.mjs — a film projector, made rather than sampled.
//
//   const p = createProjector(ctx);   // ctx: an AudioContext
//   p.node.connect(panner);           // it hands you one output node
//   p.start(); p.setGain(0.6); p.stop();
//
// 🔴 WHY THIS IS SYNTHESISED AND NOT A SAMPLE. The obvious move is to find a
// projector loop with a permissive licence and vendor it. Three reasons not to:
//
//  · **A licence read off a web page is not a licence anyone has verified.**
//    Vendoring somebody's audio means asserting terms on their behalf, in a
//    repo that already carries three vendored things and states each one's
//    licence file by name. A sound we made has no such question in it.
//  · **A loop is a LOOP.** A projector running for four minutes under a
//    newsreel is the one place a seam gets heard, and the fix for a seam is
//    always more sample, not better crossfading.
//  · **It is about forty lines.** A projector is a very legible object in
//    sound: a frame rate, a motor, and some noise. This repo writes its own
//    test pattern and its own synths for the same reason.
//
// WHAT A PROJECTOR ACTUALLY IS, which is what makes this short:
//
//  · **the frame rate** — a claw pulls each frame down and a shutter closes
//    over it, so the loudest thing is a CLATTER at the frame rate. 24 fps for
//    sound film, 18 for silent-era 16 mm. It is the rhythm you recognise.
//  · **the motor** — a hum at mains frequency and its harmonics. 50 Hz here,
//    because this is Estonian film and Estonian mains.
//  · **the transport** — sprockets and take-up, which is broadband noise with
//    no pitch, quiet and continuous under the other two.
//
// ⚠️ AND THE JITTER IS THE POINT — it is per-voice now, in VOICES above. A clatter exactly every 41.67 ms sounds like
// a synthesiser playing a hi-hat; a real mechanism is a few per cent out, every
// frame, and that is most of what "analogue" means to an ear. The jitter here
// is per-frame and small — enough to stop the ear locking on, not enough to
// sound broken.

/**
 * 🔴 EIGHT MACHINES, ONE FRAME RATE. No two projectors in a building sound the
 * same — the claw, the shutter and the gate wear differently and the box they
 * are bolted into resonates somewhere of its own — so a floor of films that all
 * sound identical reads as one recording played eight times.
 *
 * ⚠️ WHAT VARIES IS TIMBRE, NEVER THE RATE, AND THAT IS A DELIBERATE LIMIT. The
 * frame rate is the one thing a projector sound MEANS: 24 is sound film, which
 * is what these 1965 newsreels are. Varying it would make some of them silent-era
 * 16 mm, which is a claim about the material rather than about the machine — and
 * it would put the one assert worth having, that this runs at the film's rate,
 * out of reach for seven voices out of eight. Instead that check now sweeps all
 * eight, so a preset cannot quietly break the rhythm.
 *
 * The spread is the resonance of the box: 1,500 Hz reads as a big cabinet at the
 * back of a hall, 2,900 as a small portable on a table. Q says how boxy.
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

export function createProjector(ctx, { frameHz = FRAME_HZ, mainsHz = MAINS_HZ, voice = 0 } = {}) {
  let V = VOICES[((voice % VOICES.length) + VOICES.length) % VOICES.length];
  const out = ctx.createGain();
  out.gain.value = 0;

  // ── the motor ────────────────────────────────────────────────────────────
  // Two partials, the second slightly sharp of the octave. An exact octave
  // fuses into one tone and sounds like a test signal; a few cents out beats
  // slowly, which is what a machine with a belt on it does.
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

  // ── the clatter ──────────────────────────────────────────────────────────
  // One short filtered noise burst per frame, scheduled ahead on the AUDIO
  // clock rather than fired from a timer.
  //
  // 🔴 SCHEDULED, NOT TICKED. A `setInterval` at 41 ms would put every clatter
  // wherever the main thread happened to be — which on a page that is also
  // uploading video frames to a texture is nowhere in particular. The audio
  // clock does not care what the renderer is doing, and this repo has the rule
  // twice over: sound is allowed to be late, a timeline is not.
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
    // a little movement in the timbre, frame to frame: a claw does not hit the
    // same way twice
    // ⚠️ THE PER-FRAME WOBBLE IS A FRACTION OF THE VOICE, NOT A FIXED BAND. It
    // used to be `1900 + random * 900` — a spread wider than the gap between two
    // voices, so eight machines would have averaged out to one.
    bp.frequency.value = V.clatter * (0.93 + Math.random() * 0.14);
    bp.Q.value = V.q;
    const g = ctx.createGain();
    // ⚠️ A CLICK, NOT A BLIP. ~7 ms of attack-less burst with a fast decay is
    // the mechanism; anything longer turns into a rattle and the frame rate
    // stops being audible as a rate.
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
    node: out,
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
    /** Set the level, with a SHORT ramp, and expect to be called every frame.
     *
     *  🔴 THE LONG RAMP USED TO LIVE HERE AND IT WAS THE BUG. A caller that
     *  called this once per frame — which is the natural thing to do from a
     *  render loop — cancelled the previous ramp and started a fresh 1.2 s one
     *  sixty times a second, so the gain moved about a eightieth of the way and
     *  then restarted. It crawled up, never arrived, and crawled down: reported
     *  as "seems to lag and never stops", and that is exactly what it does.
         *  ⚠️ AND IT IS NO LONGER CALLED PER FRAME AT ALL. `floor` sets it ONCE
     *  when a film starts and once when it stops, with the ramp length it
     *  wants — so the fade finishes on the audio clock whether or not anything
     *  is drawing. The version that eased a frame at a time froze its gain the
     *  moment a tab was hidden and went on making a noise for ever.
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
