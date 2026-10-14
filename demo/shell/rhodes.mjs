// demo/shell/rhodes.mjs: an FM electric piano (DX7 E.PIANO lineage) as pure per-sample math,
// no Web Audio nodes, so it ports to C as is. A fast high-ratio tine and a 1:1 body
// phase-modulate one carrier; velocity moves the tine index, not just the volume.
// why: lessons/kit-rhodes.md#header

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
