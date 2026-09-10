// rig/box/synth.mjs — the box makes its own sound.
//
// The synth is `demo/shell/rhodes.mjs`, IMPORTED, not ported. That module was
// written as pure per-sample arithmetic for exactly this move: the same maths
// that runs in an AudioWorklet at /carry/ runs here in plain node, so the box
// and the browser cannot drift into two instruments that merely sound similar.
//
// Measured before it was written: 8 voices render at 41x realtime on an M1.
// A Cortex-A72 runs this kind of JS roughly 8-12x slower, which puts a Pi 4 at
// 3-4x realtime — about a third of one core, three cores spare. (The 8-12x is
// an ESTIMATE from the class of chip, not a measurement; `node bench.mjs` on
// the board settles it in ten seconds and that number replaces this sentence.)
//
// The consequence is the interesting part: with this file, a bare Pi is a
// complete instrument. No Circuit, no audio interface, no soundcard — notes
// arrive over the relay, sound leaves over the relay.
import { rhodesVoice, mixVoices } from '../../demo/shell/rhodes.mjs';

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
      // Oldest first, so a held pedal-chord loses its quietest rather than its
      // newest — dropping what was just played is the audible failure.
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

    /**
     * Realtime clock. A plain setInterval(20) DRIFTS — timers fire late, the
     * error accumulates, and the stream slowly runs short, which sounds like
     * dropouts and reads as network loss. So render against elapsed time and
     * catch up: the sample counter is the truth, the timer is only a nudge.
     */
    startRealtime(onFrame, { tickMs = 10 } = {}) {
      const t0 = performance.now();
      const timer = setInterval(() => {
        const want = Math.floor(((performance.now() - t0) / 1000) * RATE);
        let guard = 0;
        while (n + FRAME <= want && guard++ < 25) onFrame(this.render(FRAME));
        // guard: if the process was suspended (a lid closing, a long GC), do not
        // try to emit ten seconds of backlog at once — that would trip the
        // relay's 60 msg/s cap, which drops SILENTLY.
        if (guard >= 25) n = want;
      }, tickMs);
      return () => clearInterval(timer);
    },
  };
}

/**
 * Notes from ALSA, on the board. `aseqdump` creates its own sequencer port, so
 * the synth is patchable by the SAME patchbay as any hardware:
 *   aconnect circuit aseqdump
 *
 * ⚠️ `stdbuf -oL`. aseqdump writes text, and stdio BLOCK-buffers when its
 * output is a pipe rather than a terminal — 4 KiB of note events would arrive
 * in one burst seconds late. It would look like network latency and it would be
 * a libc default. Line buffering is not optional here.
 */
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
