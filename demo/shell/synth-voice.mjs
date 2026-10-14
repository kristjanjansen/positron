// demo/shell/synth-voice.mjs: one oscillator per held note, a short fade in and
// out, through a lowpass. Lifted 2026-10-14 from /synth/keyboard/'s inline sine
// (plans/plan-connect-ui.md slice 1, decision D5: lift one copy). With the
// defaults it is that sine: level 0.2 at full velocity, 10 ms in, 50 ms out,
// and a lowpass at 8 kHz that a sine under A4 never reaches.
//
// NOTHING OPENS HERE. Parameters are plain state until `start(ctx)` is handed
// an AudioContext; a note before that is dropped, and a knob turned before it
// is already the sound the first note makes.

import { hz, PARAM_NAMES } from './synth-params.mjs';

export const VOICE = { wave: 'sine', cutoff: 8000, q: 0.7, attack: 0.01, release: 0.05, level: 0.2 };

export function createVoice(opts = {}) {
  const P = { ...VOICE, ...opts };
  let ctx = null, filter = null, out = null;
  const voices = new Map();

  function start(c) {
    if (ctx) return;
    ctx = c;
    filter = ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = P.cutoff; filter.Q.value = P.q;
    out = ctx.createGain();
    filter.connect(out);
  }

  function noteOn(n, vel = 100) {
    if (!ctx || voices.has(n)) return false;
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
    o.type = P.wave;
    o.frequency.value = hz(n);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(P.level * (vel / 127), t + P.attack);
    o.connect(g).connect(filter);
    o.start();
    voices.set(n, { o, g });
    return true;
  }

  function noteOff(n) {
    const v = voices.get(n);
    if (!v) return false;
    const t = ctx.currentTime;
    v.g.gain.cancelScheduledValues(t);
    v.g.gain.setValueAtTime(v.g.gain.value, t);
    v.g.gain.linearRampToValueAtTime(0, t + P.release);
    v.o.stop(t + P.release + 0.01);
    voices.delete(n);
    return true;
  }

  /** Set a parameter; false for a name this voice does not have. */
  function set(name, v) {
    if (!PARAM_NAMES.includes(name)) return false;
    P[name] = v;
    if (!ctx) return true;
    const t = ctx.currentTime;
    if (name === 'cutoff') filter.frequency.setTargetAtTime(v, t, 0.02);
    if (name === 'q') filter.Q.setTargetAtTime(v, t, 0.02);
    if (name === 'wave') for (const { o } of voices.values()) o.type = v;
    return true;
  }

  function panic() { for (const n of [...voices.keys()]) noteOff(n); }

  function close() {
    panic();
    try { out?.disconnect(); } catch { /* not connected */ }
  }

  return {
    start, noteOn, noteOff, set, panic, close,
    get: (name) => P[name],
    out: () => out,
    filter: () => filter,
    held: () => voices.size,
  };
}
