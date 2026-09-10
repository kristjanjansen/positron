// demo/shell/rhodes.mjs — an FM electric piano, as pure per-sample arithmetic.
//
// NO Web Audio nodes, on purpose. This is a function from time to a sample, so
// the SAME math runs in a browser, in node, and in C on a microcontroller. A
// voice built out of oscillator nodes would be a browser-only instrument and
// would have to be rewritten to move, which is the thing that makes "port it to
// the box" a rewrite rather than a copy.
//
// The sound is the DX7 E.PIANO lineage rather than a sampled Rhodes: a Rhodes
// tine is a struck bar, and what your ear takes for one is a fast, inharmonic
// attack over a body that is nearly a sine. So:
//
//   · a TINE operator at a high ratio, decaying in tens of milliseconds — the
//     knock. This is what makes it read as an electric piano rather than an
//     organ, and it is almost all of the identity.
//   · a BODY operator at 1:1, decaying over a second — the woody swell.
//   · a carrier that both of them phase-modulate.
//
// Velocity moves the tine INDEX, not just the volume. That is the whole
// expressive character of the instrument: played hard it barks, played soft it
// is nearly a sine, and a synth that only changes loudness sounds like a volume
// pedal on an organ.

const TAU = Math.PI * 2;

/**
 * @param freq  Hz
 * @param vel   1..127
 * @returns {{ sample(t: number): number, done(t: number): boolean }} t in SECONDS from onset
 */
export function rhodesVoice(freq, vel = 100) {
  const v = Math.max(1, Math.min(127, vel)) / 127;
  // Harder playing = more tine, disproportionately. The exponent is what makes
  // the response feel like a hammer rather than a fader.
  const tineIdx = 3.2 * Math.pow(v, 1.7);
  const bodyIdx = 1.1 * v;
  const amp = 0.28 * (0.35 + 0.65 * v);
  // Higher notes ring shorter, as a struck bar does.
  const decay = 1.6 * Math.pow(220 / Math.max(freq, 55), 0.35);

  const wt = TAU * freq;
  return {
    sample(t) {
      const tine = Math.sin(wt * 14 * t) * Math.exp(-t * 46) * tineIdx;
      const body = Math.sin(wt * t) * Math.exp(-t * 5.5) * bodyIdx;
      const env = Math.exp(-t / decay) * (1 - Math.exp(-t * 420));   // no click at onset
      return Math.sin(wt * t + body + tine) * env * amp;
    },
    done(t) { return t > decay * 6; },
  };
}

/** Mix whatever is sounding. `voices` is [{v, t0}], t and t0 in seconds. */
export function mixVoices(voices, t) {
  let s = 0;
  for (const { v, t0 } of voices) { const dt = t - t0; if (dt >= 0) s += v.sample(dt); }
  // A soft clip rather than a hard one: eight voices of a struck instrument do
  // stack, and clipping a Rhodes is a real sound rather than a defect.
  return Math.tanh(s * 1.1);
}
