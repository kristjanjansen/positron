// demo/shell/moog.mjs — a subtractive voice, as pure per-sample arithmetic.
//
// Same rule as rhodes.mjs: no Web Audio nodes, so the same maths runs in a
// browser, in node on the box, and in C on a microcontroller. But where the
// Rhodes is a STRUCK sound a sampler can capture, this one cannot be sampled
// usefully — measured 2026-09-10, driving FluidSynth's GM "Synth Bass 1"
// across the whole CC 74 range moved the spectral centroid from 169 Hz to
// 154 Hz. Nothing happened. A sample freezes the filter, and on this
// instrument the filter IS the gesture.
//
// Architecture is the Minimoog's: oscillators -> resonant 4-pole lowpass, with
// an envelope on the filter as well as on the amplitude.

const TAU = Math.PI * 2;

/**
 * polyBLEP: subtract a small correction either side of the wrap so the
 * discontinuity is band-limited. A naive saw aliases hard and reads as "cheap
 * and harsh" — which is the same complaint the first Rhodes attempt earned, and
 * it is cheaper to fix here than to explain.
 */
function blep(t, dt) {
  if (t < dt) { const x = t / dt; return x + x - x * x - 1; }
  if (t > 1 - dt) { const x = (t - 1) / dt; return x * x + x + x + 1; }
  return 0;
}

export function moogVoice(freq, vel = 100, opt = {}) {
  const {
    rate = 48000,
    detune = 0.006,          // three oscillators, slightly apart: the width
    cutoff = 900,            // Hz, where the filter sits before the envelope
    resonance = 0.62,        // 0..1; near 1 it self-oscillates
    envAmount = 2400,        // Hz the filter envelope adds on top
    filterDecay = 0.35,      // s — the classic bass "thump" is a fast one
    ampDecay = 0.9,
    sustain = 0.35,
    pulse = false,           // square instead of saw
  } = opt;

  const v = Math.max(1, Math.min(127, vel)) / 127;
  // Velocity opens the filter as well as raising the level. On a real one that
  // is a patch decision, but it is the one everybody makes, because a synth
  // that only gets louder feels like a volume pedal.
  const envAmt = envAmount * (0.35 + 0.65 * v);
  const amp = 0.22 * (0.4 + 0.6 * v);

  const phases = [0, 0, 0];
  const dts = [freq, freq * (1 + detune), freq * (1 - detune)].map((f) => f / rate);
  let y1 = 0, y2 = 0, y3 = 0, y4 = 0;
  let n = 0, released = -1;

  const k = 4 * resonance;

  return {
    release(t) { if (released < 0) released = t; },
    sample() {
      const t = n / rate;

      // --- oscillators -----------------------------------------------------
      let osc = 0;
      for (let i = 0; i < 3; i++) {
        const dt = dts[i];
        phases[i] += dt;
        if (phases[i] >= 1) phases[i] -= 1;
        const p = phases[i];
        if (pulse) {
          let s = p < 0.5 ? 1 : -1;
          s -= blep(p, dt);
          s += blep((p + 0.5) % 1, dt);
          osc += s;
        } else {
          osc += (2 * p - 1) - blep(p, dt);
        }
      }
      osc /= 3;

      // --- envelopes -------------------------------------------------------
      const rel = released >= 0 ? Math.exp(-(t - released) / 0.08) : 1;
      const fEnv = Math.exp(-t / filterDecay);
      const aEnv = (sustain + (1 - sustain) * Math.exp(-t / ampDecay)) * rel
                 * (1 - Math.exp(-t * 300));            // no click at onset

      // --- the ladder ------------------------------------------------------
      // Four one-pole sections with feedback from the last into the first. The
      // feedback is soft-clipped, which is where the drive and the fatness at
      // high resonance come from; a linear version thins out exactly when you
      // want it to bark.
      let fc = cutoff + envAmt * fEnv;
      if (fc > rate * 0.45) fc = rate * 0.45;
      const g = 1 - Math.exp(-TAU * fc / rate);
      const inp = osc - k * Math.tanh(y4 * 0.9);
      y1 += g * (inp - y1);
      y2 += g * (y1 - y2);
      y3 += g * (y2 - y3);
      y4 += g * (y3 - y4);

      n++;
      return y4 * aEnv * amp * (1 + resonance);          // makeup: resonance eats level
    },
    done(t) { return released >= 0 && t - released > 0.5; },
  };
}

/** GM-ish names, so a client can ask for a sound rather than nine numbers. */
export const PATCHES = {
  bass:   { cutoff: 420,  resonance: 0.70, envAmount: 1800, filterDecay: 0.22, ampDecay: 0.7,  sustain: 0.25 },
  lead:   { cutoff: 1100, resonance: 0.55, envAmount: 2600, filterDecay: 0.9,  ampDecay: 8,    sustain: 0.85 },
  pad:    { cutoff: 700,  resonance: 0.30, envAmount: 900,  filterDecay: 2.5,  ampDecay: 12,   sustain: 0.9, detune: 0.012 },
  pluck:  { cutoff: 500,  resonance: 0.78, envAmount: 3400, filterDecay: 0.10, ampDecay: 0.35, sustain: 0.0 },
  squelch:{ cutoff: 300,  resonance: 0.92, envAmount: 3000, filterDecay: 0.16, ampDecay: 0.5,  sustain: 0.1, pulse: true },
};
