// demo/shell/granular-worklet.js — a grain cloud, in the page.
//
// 🔴 NOTHING IMPORTS THIS TODAY (2026-09-14) AND IT IS NOT DEAD — READ THIS
// BEFORE DELETING IT.
//
// It was the LEFT PANE of `/grains/`, opposite a Raspberry Pi, under a line
// claiming "the same granulator in this page and on a Raspberry Pi". That claim
// was false: a reimplementation that sounds similar is not the same instrument.
// Both panes now load the SAME compiled `pappus.scsyndef` into real
// SuperCollider — wasm scsynth in the tab, the board's own sound server on the
// Pi — so a disagreement between them is finally about one instrument in two
// places (`demo/grains/engine.mjs`).
//
// ⚠️ WHAT IT STOPPED BEING IS HALF OF A COMPARISON. What it still IS, is the
// argument `research/supercollider-browser-2026-09.md` §5 makes and which
// nothing above touches: **6,659 bytes against 1,701,983**, no licence to
// carry, no ceiling to fit under, and every line of it readable. A page about
// WRITING a granulator — what a grain window is, why overlap is the parameter
// that matters, why a hard edge clicks twenty times a second — is a page this
// file is the subject of rather than the plumbing for. That page does not exist
// yet; this is what it would be built on.
//
// ⚠️ AND ITS FIRST PARAGRAPH IS NOW HISTORY, NOT A FINDING. The 2026-09-12
// measurement below was taken with `msos` at 0, where Pappus hands its input
// back verbatim with not one grain in it — so "no parameter changes the sound"
// was true of a passthrough and said nothing about the granulator. See
// `plan-twins.md` and `rig/box/norns/CHAIN.md`. Nothing was broken.
//
// 🔴 WHY THIS EXISTS. The granulator this project already has runs on a
// Raspberry Pi three hundred metres away, and on 2026-09-12 we measured that
// NO parameter sent to it changes the sound that comes back: `mrate` 0.5
// against 24 (a 48x change in grain rate) read rms 0.2636 against 0.2550, and
// the returned envelope never once dropped below a quarter of its own median at
// any setting — which is to say the sound is continuous and is therefore not a
// grain cloud. `params.set` demonstrably DOES reach the engine (`amp` 1.0
// against 0.05 read 0.2622 against 0.1149), so the wire is fine and the fault is
// somewhere in an engine that takes ~25 s to raise and can only be watched
// through a relay.
//
// A granulator does not need any of that. It is a ring buffer, a grain
// scheduler and a window function. Here every parameter change is audible in
// one render quantum, and — the part that matters more — **every grain can be
// REPORTED, because this is the code that starts it.** The board can only ever
// be guessed at from its output.
//
// ⚠️ GRAINS ARE SCHEDULED IN SAMPLES, NOT IN TIMERS. `currentFrame` is the
// only clock here and it does not drift, stall in a background tab, or get
// clamped to 1 Hz. A grain that should start 7.3 ms from now starts 350 samples
// from now.
//
// ⚠️ OVERLAP IS THE PARAMETER THAT MATTERS, and rate and size are how it is
// spelled. overlap = rate x size: below 1 there are audible gaps between
// grains (stuttering), 2-4 is a smooth cloud, above ~8 is mush. Two independent
// sliders means most of the rectangle you can drag to is one of the two bad
// zones. The worklet takes rate and size because that is what the arithmetic
// needs; a PAGE should expose density and texture and derive these. This is the
// same lesson as LESSONS #59 one level down: nine sliders do not describe nine
// choices, they describe one surface, most of which sounds the same.
//
// ⚠️ THE WINDOW IS A RAISED COSINE AND IS NOT OPTIONAL. A grain with a hard
// edge clicks, every time it fires, and at 20 grains a second that is 20 clicks
// a second — which is exactly the noise a broken granulator makes, so it must
// not be a way this one can sound.

const TWO_PI = Math.PI * 2;

class Granular extends AudioWorkletProcessor {
  constructor(opts) {
    super();
    const o = opts?.processorOptions || {};
    this.bufSec = Math.max(1, Math.min(120, o.bufferSeconds || 10));
    this.cap = Math.round(sampleRate * this.bufSec);
    this.ring = new Float32Array(this.cap);
    this.wr = 0;                 // write head, in samples
    this.filled = 0;             // how much of the ring has ever been written
    this.frozen = false;         // stop writing; keep playing what is held

    // ── the window, computed once ────────────────────────────────────────
    // A table rather than a cos() per sample per grain: at 24 grains a second
    // of 300 ms each that is 7 overlapping grains at all times, and the window
    // is the inner loop.
    this.WIN_N = 2048;
    this.win = new Float32Array(this.WIN_N);
    for (let i = 0; i < this.WIN_N; i++) this.win[i] = 0.5 - 0.5 * Math.cos(TWO_PI * i / (this.WIN_N - 1));

    // ── parameters ───────────────────────────────────────────────────────
    this.p = {
      rate: 12,          // grains per second
      sizeMs: 120,       // grain length
      scan: 0.5,         // where in the held seconds to read from, 0..1
      spray: 0.05,       // random offset around scan, as a fraction of the buffer
      pitch: 1,          // playback ratio per grain
      pitchSpread: 0,    // random ± in semitones
      pan: 0.8,          // how wide grains scatter across the field, 0..1
      level: 0.7,
      reverse: 0,        // fraction of grains that read backwards
      follow: 1,         // 1 = scan is relative to the write head (live), 0 = absolute
    };

    this.grains = [];          // live grains
    this.nextGrainAt = 0;      // in absolute frames
    this.events = [];          // grain starts, drained to the main thread
    this.lastPost = 0;
    this.lastPeaks = 0;
    this.started = 0;
    this.fired = 0;
    // 🔴 THE BUFFER'S OWN SHAPE, SENT UP FOR DRAWING. A grain's read position
    // as a number between 0 and 1 is not a place anybody can hear. Drawn ON the
    // waveform it came from it is: you see the scan sitting in the loud part,
    // the scatter reaching back into the quiet part before it, and a freeze
    // stopping the picture dead. The first scope plotted position against time
    // with no material behind it, and the verdict was that it did nothing for
    // the person playing — which was true.
    this.PEAKS = 320;
    this.peaks = new Float32Array(this.PEAKS);

    this.port.onmessage = (e) => {
      const d = e.data || {};
      if (d.cmd === 'set') {
        for (const k of Object.keys(this.p)) if (typeof d[k] === 'number') this.p[k] = d[k];
      } else if (d.cmd === 'freeze') {
        this.frozen = !!d.on;
      } else if (d.cmd === 'clear') {
        this.ring.fill(0); this.wr = 0; this.filled = 0; this.grains.length = 0;
      } else if (d.cmd === 'fill' && d.pcm) {
        // A whole buffer at once — for a page that granulates something it
        // already has rather than something arriving.
        const n = Math.min(d.pcm.length, this.cap);
        this.ring.set(d.pcm.subarray(0, n), 0);
        this.wr = n % this.cap; this.filled = Math.max(this.filled, n);
      }
    };
  }

  /** One grain, decided at the moment it starts — never re-read afterwards. */
  spawn(startFrame) {
    const p = this.p;
    const durFrames = Math.max(32, Math.round(sampleRate * p.sizeMs / 1000));
    // Where in the held audio this grain reads from. `follow` keeps it a fixed
    // distance BEHIND the write head, which is what makes a live granulator
    // sound like it is chewing the present rather than a fixed spot.
    const span = Math.max(1, this.filled);
    const jitter = (Math.random() * 2 - 1) * p.spray * span;
    let pos = p.follow
      ? this.wr - (1 - p.scan) * span + jitter
      : p.scan * span + jitter;
    pos = ((pos % this.cap) + this.cap) % this.cap;

    const semis = p.pitchSpread ? (Math.random() * 2 - 1) * p.pitchSpread : 0;
    const step = p.pitch * Math.pow(2, semis / 12) * (Math.random() < p.reverse ? -1 : 1);
    // Equal-power pan, so a grain does not get quieter as it moves off centre.
    const panPos = (Math.random() * 2 - 1) * p.pan;
    const a = (panPos + 1) * Math.PI / 4;

    const g = {
      start: startFrame, dur: durFrames, pos, step,
      gainL: Math.cos(a), gainR: Math.sin(a),
      level: p.level,
    };
    this.grains.push(g);
    this.fired++;
    // ⚠️ WHAT IS REPORTED IS WHAT WAS ACTUALLY STARTED — not what the
    // parameters would imply. A picture drawn from the parameters is a claim;
    // this is a measurement, and the scope draws the two differently.
    if (this.events.length < 512) {
      this.events.push({
        t: startFrame / sampleRate,
        dur: durFrames / sampleRate,
        // 0..1 through the held seconds, which is the axis a listener can hear
        pos: pos / this.cap,
        pan: panPos,
        step,
        level: p.level,
      });
    }
    return g;
  }

  process(inputs, outputs) {
    const inCh = inputs[0] && inputs[0][0];
    const out = outputs[0];
    const n = out[0].length;

    // ── record ───────────────────────────────────────────────────────────
    if (inCh && inCh.length && !this.frozen) {
      // Mono in: a granulator reads points, and two channels would double the
      // ring for a difference no grain can express.
      const in2 = inputs[0][1];
      for (let i = 0; i < n; i++) {
        this.ring[this.wr] = in2 ? (inCh[i] + in2[i]) * 0.5 : inCh[i];
        this.wr = (this.wr + 1) % this.cap;
      }
      this.filled = Math.min(this.cap, this.filled + n);
    }

    const L = out[0], R = out[1] || out[0];
    L.fill(0); if (R !== L) R.fill(0);

    // ── schedule ─────────────────────────────────────────────────────────
    // Every grain start inside this quantum, at its exact sample. Scheduling on
    // the quantum boundary instead would quantise every onset to 2.67 ms, which
    // at 24 grains a second is audible as a machine-gun regularity that is not
    // in the parameters.
    const q0 = currentFrame, q1 = currentFrame + n;
    if (this.nextGrainAt < q0) this.nextGrainAt = q0;
    const period = sampleRate / Math.max(0.05, this.p.rate);
    while (this.nextGrainAt < q1) {
      if (this.filled > 256) this.spawn(Math.round(this.nextGrainAt));
      this.nextGrainAt += period;
    }

    // ── play ─────────────────────────────────────────────────────────────
    for (let gi = 0; gi < this.grains.length; gi++) {
      const g = this.grains[gi];
      const from = Math.max(0, g.start - q0);
      for (let i = from; i < n; i++) {
        const age = q0 + i - g.start;
        if (age < 0) continue;
        if (age >= g.dur) { g.done = true; break; }
        const w = this.win[(age / g.dur * (this.WIN_N - 1)) | 0];
        // Linear interpolation: a granulator that reads at a non-integer step
        // and rounds is a granulator with quantisation noise on every grain.
        const rp = g.pos + age * g.step;
        const i0 = ((rp | 0) % this.cap + this.cap) % this.cap;
        const i1 = (i0 + 1) % this.cap;
        const fr = rp - Math.floor(rp);
        const s = (this.ring[i0] * (1 - fr) + this.ring[i1] * fr) * w * g.level;
        L[i] += s * g.gainL;
        if (R !== L) R[i] += s * g.gainR;
      }
    }
    if (this.grains.length) this.grains = this.grains.filter((g) => !g.done);

    // ── the buffer's shape ───────────────────────────────────────────────
    // 12 Hz and strided. A peak over the whole ring every quantum would be the
    // audio thread doing drawing; this is ~60k reads a second, a rounding error
    // beside the grains themselves.
    if (currentFrame - this.lastPeaks >= sampleRate / 12) {
      this.lastPeaks = currentFrame;
      const per = Math.max(1, Math.floor(this.cap / this.PEAKS));
      const stride = Math.max(1, Math.floor(per / 48));
      for (let b = 0; b < this.PEAKS; b++) {
        let mx = 0;
        const from = b * per, to = Math.min(this.cap, from + per);
        for (let i = from; i < to; i += stride) { const a = Math.abs(this.ring[i]); if (a > mx) mx = a; }
        this.peaks[b] = mx;
      }
      // A copy, because a Float32Array handed over is detached and the next
      // pass would write into nothing.
      this.port.postMessage({ peaks: Float32Array.from(this.peaks), write: this.wr / this.cap, filled: this.filled / this.cap });
    }

    // ── report ───────────────────────────────────────────────────────────
    // Batched at 20 Hz. One message per grain would be 24 postMessages a second
    // at a normal density and several hundred at a high one, which is a main
    // thread doing message plumbing instead of drawing.
    if (currentFrame - this.lastPost >= sampleRate / 20) {
      this.lastPost = currentFrame;
      this.port.postMessage({
        grains: this.events,
        stats: {
          ct: currentFrame / sampleRate,
          live: this.grains.length,
          fired: this.fired,
          heldSec: this.filled / sampleRate,
          frozen: this.frozen,
          // The number the page should actually be steering by.
          overlap: this.p.rate * (this.p.sizeMs / 1000),
        },
      });
      this.events = [];
    }
    return true;
  }
}

registerProcessor('granular', Granular);
