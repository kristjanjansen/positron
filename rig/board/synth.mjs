// The board's own synth: demo/shell/rhodes.mjs imported, so board and browser are one instrument.
// 8 voices render at 41x realtime on an M1; `node bench.mjs` measures the Pi.
// why: lessons/rig-board-synth.md#synth-header
import { rhodesVoice, mixVoices } from '../../demo/shell/rhodes.mjs';
import { moogVoice, PATCHES } from '../../demo/shell/moog.mjs';

export const RATE = 48000;
export const FRAME = 960;                 // 20 ms -> 50 messages a second

// A struck piano has no sustain to release, but it does have a DAMPER: lifting
// the key stops the tine. Without this a held chord rings its full 1.6 s after
// release and the instrument feels like a music box rather than a keyboard.
const DAMP_SEC = 0.12;

export function createSynth({ maxVoices = 16 } = {}) {
  let voices = [];                        // {v, t0, note, rel}
  let n = 0;                              // samples rendered, the only clock

  const now = () => n / RATE;

  return {
    get voices() { return voices.length; },
    get seconds() { return now(); },

    noteOn(note, vel = 100) {
      const freq = 440 * Math.pow(2, (note - 69) / 12);
      // Retrigger damps the old one rather than stacking: two copies of one note
      // is 6 dB louder and reads as a stuck key.
      for (const x of voices) if (x.note === note && x.rel === undefined) x.rel = now();
      voices.push({ v: rhodesVoice(freq, vel), t0: now(), note, rel: undefined });
      // Steal the oldest, not the newest: dropping what was just played is the audible failure.
      // why: lessons/rig-board-synth.md#synth-steal
      if (voices.length > maxVoices) voices.shift();
    },

    noteOff(note) {
      for (const x of voices) if (x.note === note && x.rel === undefined) x.rel = now();
    },

    allOff() { for (const x of voices) if (x.rel === undefined) x.rel = now(); },

    /** Render `frames` samples into an Int16Array. Advances the clock. */
    render(frames = FRAME) {
      const out = new Int16Array(frames);
      for (let i = 0; i < frames; i++) {
        const t = (n + i) / RATE;
        let s = 0;
        for (const x of voices) {
          const dt = t - x.t0;
          if (dt < 0) continue;
          let a = x.v.sample(dt);
          if (x.rel !== undefined) a *= Math.exp(-(t - x.rel) / DAMP_SEC);
          s += a;
        }
        s = Math.tanh(s * 1.1);
        out[i] = Math.max(-32768, Math.min(32767, s * 32767));
      }
      n += frames;
      const t = now();
      voices = voices.filter((x) => !x.v.done(t - x.t0) && !(x.rel !== undefined && t - x.rel > DAMP_SEC * 6));
      return out;
    },

    // Render against elapsed time and catch up: setInterval drifts and the stream runs short.
    // why: lessons/rig-board-synth.md#synth-clock
    startRealtime(onFrame, { tickMs = 10 } = {}) {
      const t0 = performance.now();
      const timer = setInterval(() => {
        const want = Math.floor(((performance.now() - t0) / 1000) * RATE);
        let guard = 0;
        while (n + FRAME <= want && guard++ < 25) onFrame(this.render(FRAME));
        // After a suspend, do not emit the backlog at once: the relay's rate cap drops silently.
        // why: lessons/rig-board-synth.md#synth-guard
        if (guard >= 25) n = want;
      }, tickMs);
      return () => clearInterval(timer);
    },
  };
}

// Notes from aseqdump, which makes its own sequencer port (aconnect circuit aseqdump).
// `stdbuf -oL`: piped stdio block-buffers, delivering note events in late bursts.
// why: lessons/rig-board-synth.md#synth-alsa
export function alsaNotes(spawn, onNote, { port } = {}) {
  const args = ['-oL', 'aseqdump', ...(port ? ['-p', port] : [])];
  const p = spawn('stdbuf', args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let buf = '';
  p.stdout.on('data', (d) => {
    buf += d;
    const lines = buf.split('\n');
    buf = lines.pop();
    for (const line of lines) {
      let m = line.match(/Note on\s+\d+, note (\d+), velocity (\d+)/);
      if (m) { Number(m[2]) > 0 ? onNote('on', Number(m[1]), Number(m[2])) : onNote('off', Number(m[1])); continue; }
      m = line.match(/Note off\s+\d+, note (\d+)/);
      if (m) onNote('off', Number(m[1]));
    }
  });
  return p;
}


// A separate factory: this voice carries filter state and is stepped in order, unlike the Rhodes.
// why: lessons/rig-board-synth.md#synth-moog
export function createMoogSynth({ maxVoices = 8, patch = 'bass' } = {}) {
  let voices = [];
  let n = 0;
  let opts = { ...PATCHES[patch] ?? PATCHES.bass };
  const now = () => n / RATE;

  return {
    get voices() { return voices.length; },
    get patch() { return opts; },
    setPatch(name) { if (PATCHES[name]) opts = { ...PATCHES[name] }; return !!PATCHES[name]; },
    // The two controls that ARE the instrument, live. MIDI CC 74 and 71 by
    // convention, so a hardware knob maps to them without translation.
    set(k, value) {
      if (k === 'cutoff') opts.cutoff = 60 + 5000 * Math.pow(value / 127, 2);
      else if (k === 'resonance') opts.resonance = 0.98 * (value / 127);
      else if (k === 'envAmount') opts.envAmount = 4000 * (value / 127);
      else return false;
      return true;                    // takes effect on the NEXT note, like a real patch knob
    },
    noteOn(note, vel = 100) {
      const freq = 440 * Math.pow(2, (note - 69) / 12);
      for (const x of voices) if (x.note === note && !x.rel) { x.v.release(now() - x.t0); x.rel = true; }
      voices.push({ v: moogVoice(freq, vel, { rate: RATE, ...opts }), t0: now(), note, rel: false });
      if (voices.length > maxVoices) voices.shift();
    },
    noteOff(note) {
      for (const x of voices) if (x.note === note && !x.rel) { x.v.release(now() - x.t0); x.rel = true; }
    },
    allOff() { for (const x of voices) if (!x.rel) { x.v.release(now() - x.t0); x.rel = true; } },
    render(frames = FRAME) {
      const out = new Int16Array(frames);
      for (let i = 0; i < frames; i++) {
        let s = 0;
        for (const x of voices) s += x.v.sample();     // stateful: stepped in order
        s = Math.tanh(s * 0.9);
        out[i] = Math.max(-32768, Math.min(32767, s * 32767));
      }
      n += frames;
      const t = now();
      voices = voices.filter((x) => !x.v.done(t - x.t0));
      return out;
    },
    startRealtime(onFrame, { tickMs = 10 } = {}) {
      const t0 = performance.now();
      const timer = setInterval(() => {
        const want = Math.floor(((performance.now() - t0) / 1000) * RATE);
        let guard = 0;
        while (n + FRAME <= want && guard++ < 25) onFrame(this.render(FRAME));
        if (guard >= 25) n = want;
      }, tickMs);
      return () => clearInterval(timer);
    },
  };
}

export { PATCHES as MOOG_PATCHES };
