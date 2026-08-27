// proto/jam/measure-core.js — the measurement kernel, extracted.
//
// Everything here was proven in the C7 play-a-synth rig (remote-synth.js +
// harness/run-synth.mjs) and is lifted verbatim in behaviour so host-check.js
// produces numbers on the same footing as the matrix. remote-synth.js is NOT
// modified (a sibling run owns it) — this module is the shared home going
// forward; the rig can import it when that run is done.
//
// Contents:
//   nowUs()            epoch µs from the page clock (single-page measurements
//                      need no server calibration: one clock, both stamps)
//   makeAcMap(ac)      AudioContext.currentTime -> epoch µs, EDGE-MEDIAN method
//   makeOnsetTap()     sample-accurate onset detector node wired to pull
//   makeMatcher()      onset<->note zip (order + adaptive-median + chord merge)
//   pdist()            p50/p95/p99 distribution
//   buildBin/parseBin  the 16-B MIDI wire frame (bench convention)
//   makeVoice(ac)      percussive instant-attack stand-in voice
//
// C7 method traps encoded here (do not "simplify" them away):
//  1. ct->epoch by rolling MIN is poisoned by render-ahead bursts (headless
//     prebuffers ~60 ms at context start) and maps onsets ~60 ms EARLY. Sample
//     the offset only at the instant currentTime STEPS and keep the rolling
//     MEDIAN. Bias ≈ +1 ms, stable to ±3 ms.
//  2. An onset that maps slightly BEFORE its note must not be discarded as
//     spurious: dropping it shifts the whole order-zip by one note forever
//     (the phantom +40 ms artifact). minLatUs may be negative.
//  3. Concealed/merged attacks (dense bursts through a codec) derail a strict
//     in-order zip permanently. Adaptive mode matches each onset to the pending
//     note whose apparent latency is nearest the rolling median — heals in one
//     onset, identical to strict order when nothing is lost.

export const nowUs = () => (performance.timeOrigin + performance.now()) * 1000;

export function makeAcMap(ac) {
  const edges = [];
  let lastCt = ac.currentTime;
  let offUs = nowUs() - ac.currentTime * 1e6;
  let stop = false;
  function loop() {
    if (stop) return;
    const ct = ac.currentTime;
    if (ct !== lastCt) {
      lastCt = ct;
      edges.push(nowUs() - ct * 1e6);
      if (edges.length > 400) edges.shift();
      if (edges.length >= 20) {
        const s = [...edges].sort((x, y) => x - y);
        offUs = s[Math.floor(s.length / 2)];
      }
    }
    setTimeout(loop, 1);
  }
  loop();
  return {
    ctUs: (ct) => ct * 1e6 + offUs,
    off: () => offUs,
    edges: () => edges.length,
    reseed: () => { edges.length = 0; },
    stop: () => { stop = true; },
  };
}

// onset tap: worklet -> zero gain -> destination (the graph must be PULLED or
// the worklet never runs). onOnset(epochUs, raw).
export function makeOnsetTap(ac, acMap, onOnset, opts = {}) {
  const node = new AudioWorkletNode(ac, 'onset-detector', {
    numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1],
    processorOptions: { onThr: opts.onThr ?? 0.05, offThr: opts.offThr ?? 0.015, silenceMs: opts.silenceMs ?? 5 },
  });
  const sink = ac.createGain(); sink.gain.value = 0;
  node.connect(sink).connect(ac.destination);
  const sinkFn = { fn: null };
  node.port.onmessage = (e) => {
    const us = acMap.ctUs(e.data.ct);
    if (onOnset) onOnset(us, e.data);
    if (sinkFn.fn) sinkFn.fn(us, e.data);
  };
  node.setSink = (fn) => { sinkFn.fn = fn; };
  return node;
}

export function makeMatcher({ minLatUs = -8000, maxLatUs = 2_000_000, chordUs = 10000, adaptive = true } = {}) {
  const pending = [];
  const out = new Map();
  let spurious = 0;
  const lats = [];
  const med = () => {
    if (lats.length < 8) return null;
    const s = [...lats].sort((x, y) => x - y);
    return s[s.length >> 1];
  };
  return {
    sent(seq, tUs) { pending.push({ seq, tUs }); },
    onset(us) {
      while (pending.length && us - pending[0].tUs > maxLatUs) { out.set(pending[0].seq, { status: 'unmatched' }); pending.shift(); }
      if (!pending.length || us - pending[0].tUs < minLatUs) { spurious++; return; }
      let idx = 0;
      const m = adaptive ? med() : null;
      if (m !== null) {
        let best = Infinity;
        for (let i = 0; i < pending.length; i++) {
          const lat = us - pending[i].tUs;
          if (lat < minLatUs) break;
          const dev = Math.abs(lat - m);
          if (dev < best) { best = dev; idx = i; }
        }
      }
      for (let i = 0; i < idx; i++) { const p = pending.shift(); out.set(p.seq, { status: 'unmatched' }); }
      const head = pending.shift();
      out.set(head.seq, { status: 'matched', onsetUs: us });
      lats.push(us - head.tUs);
      if (lats.length > 30) lats.shift();
      while (pending.length && pending[0].tUs - head.tUs < chordUs) { out.set(pending[0].seq, { status: 'merged', mergedInto: head.seq }); pending.shift(); }
    },
    flush() { for (const p of pending) out.set(p.seq, { status: 'unmatched' }); pending.length = 0; },
    get: (seq) => out.get(seq),
    spurious: () => spurious,
  };
}

export const pdist = (vals) => {
  if (!vals || !vals.length) return null;
  const s = [...vals].sort((x, y) => x - y);
  const pick = (p) => +s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))].toFixed(2);
  const mean = s.reduce((a, b) => a + b, 0) / s.length;
  return {
    n: s.length, p50: pick(50), p95: pick(95), p99: pick(99),
    min: +s[0].toFixed(2), max: +s[s.length - 1].toFixed(2),
    mean: +mean.toFixed(2),
    sd: +Math.sqrt(s.reduce((a, b) => a + (b - mean) ** 2, 0) / s.length).toFixed(2),
  };
};

export function buildBin(seq, note, vel, src, tUs) {
  const buf = new ArrayBuffer(16);
  const dv = new DataView(buf);
  dv.setUint8(0, 0x90); dv.setUint8(1, note); dv.setUint8(2, vel); dv.setUint8(3, src);
  dv.setUint32(4, seq, true); dv.setFloat64(8, tUs, true);
  return buf;
}
export function parseBin(buf) {
  const dv = new DataView(buf);
  return { status: dv.getUint8(0), note: dv.getUint8(1), vel: dv.getUint8(2), src: dv.getUint8(3), seq: dv.getUint32(4, true), tUs: dv.getFloat64(8, true) };
}

// Percussive instant-attack voice (square + click, velocity-scaled, ~25 ms).
// In the rig this was B's synth; in host-check it is the STAND-IN for real
// hardware when no MIDI instrument is connected. NO attack ramp — the onset is
// the first sample, so the detector sees the same edge a real synth's attack
// transient gives.
export function makeVoice(ac, out) {
  let noiseBuf = null;
  return function note(midiNote, vel = 100) {
    const t = ac.currentTime;
    const g = 0.5 * (vel / 127);
    const osc = ac.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 440 * Math.pow(2, (midiNote - 69) / 12);
    const og = ac.createGain();
    og.gain.setValueAtTime(g, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
    osc.connect(og).connect(out);
    osc.start(t); osc.stop(t + 0.025);
    if (!noiseBuf) {
      noiseBuf = ac.createBuffer(1, Math.round(ac.sampleRate * 0.01), ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const click = ac.createBufferSource(); click.buffer = noiseBuf;
    const cg = ac.createGain();
    cg.gain.setValueAtTime(0.6 * g, t);
    cg.gain.exponentialRampToValueAtTime(0.001, t + 0.004);
    click.connect(cg).connect(out);
    click.start(t); click.stop(t + 0.005);
    return t;
  };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
