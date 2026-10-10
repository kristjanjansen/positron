// demo/concepts/050/modules.mjs: the mono WebAudio synth of /concepts/045/, cut
// down to the chain a tutorial slide teaches in three steps: keys, oscillator,
// filter, scope, speakers.
//
// ⚠️ A COPY OF demo/concepts/045/modules.mjs, NOT AN IMPORT, ON PURPOSE, as 41
// is a copy of 40: the pages stay independent while each is still moving. What
// changed in the copy: the amp is folded into the oscillator (its `midi-in`
// gates its own level), so the bay is one chain and draws as one row in the
// slide's footer band; the knobs are not bay nodes, because four knob boxes in
// the first column would make that band four boxes tall; and the scope is a
// thru box, `audio-in` to `audio-out`, so adding it lengthens the chain rather
// than branching it.
//
// NOTHING OPENS ON IMPORT. Parameters are plain state until `start(ctx)` is
// handed an AudioContext, which the page makes on the first key press.

import { createBay, parsePatch } from '/shell/bay.mjs';

export const S = 'web';
const id = (node, port) => `${S}:${node}:${port}`;
const nodeName = (portId) => portId.split(':')[1];
const portName = (portId) => portId.split(':')[2];

export const WAVES = ['sine', 'triangle', 'sawtooth', 'square'];
export const hz = (n) => 440 * 2 ** ((n - 69) / 12);

/** Exponential travel between `lo` and `hi`, for a 0 to 1 position. */
export const expo = (lo, hi) => ({
  to: (u) => lo * (hi / lo) ** u,
  from: (v) => Math.log(v / lo) / Math.log(hi / lo),
});
const CUT = expo(80, 8000);

/**
 * The four knobs, two per box. `owner` is the module the knob sets, `raw` what
 * the dial shows and `value(raw)` what the module is given.
 */
export const KNOBS = [
  { name: 'wave', owner: 'osc', min: 0, max: 3, step: 1, raw: 2, value: (r) => WAVES[Math.round(r)], format: (r) => WAVES[Math.round(r)].replace('sawtooth', 'saw').replace('triangle', 'tri') },
  { name: 'detune', owner: 'osc', min: -100, max: 100, raw: 0, value: (r) => r, format: (r) => `${Math.round(r)} ct` },
  { name: 'cutoff', owner: 'filter', min: 0, max: 127, raw: 127 * CUT.from(900), value: (r) => CUT.to(r / 127), format: (r) => { const v = CUT.to(r / 127); return v >= 1000 ? `${(v / 1000).toFixed(1)} k` : `${Math.round(v)}`; } },
  { name: 'q', owner: 'filter', min: 0.7, max: 15, raw: 6, value: (r) => r, format: (r) => r.toFixed(1) },
];

/**
 * @param {object} o
 * @param {(line:string, level?:string)=>void} o.log
 */
export function createSynth({ log = () => {} } = {}) {
  const bay = createBay();
  const P = {
    osc: { freq: 110, detune: 0, wave: 'sawtooth', attack: 0.005, release: 0.4 },
    filter: { cutoff: 900, q: 6 },
  };
  let ctx = null;
  const N = {};
  const at = () => ctx.currentTime;
  const glide = (param, v, tc = 0.015) => { if (ctx) param.setTargetAtTime(v, at(), tc); };

  function setParam(mod, name, v) {
    P[mod][name] = v;
    if (!ctx) return;
    if (mod === 'osc' && name === 'detune') glide(N.osc.osc.detune, v);
    if (mod === 'osc' && name === 'wave') N.osc.osc.type = v;
    if (mod === 'filter' && name === 'cutoff') glide(N.filter.f.frequency, v, 0.01);
    if (mod === 'filter' && name === 'q') glide(N.filter.f.Q, v, 0.01);
  }

  // The osc is mono, plays the last key still held, and opens its own level on
  // the first key down and closes it when the last one is up.
  const notes = [];
  let releaseEnd = 0;
  function oscNote(e) {
    const was = notes.length;
    const i = notes.indexOf(e.d1);
    if (i >= 0) notes.splice(i, 1);
    if (e.d2) notes.push(e.d1);
    const n = notes[notes.length - 1];
    if (n !== undefined) { P.osc.freq = hz(n); if (ctx) glide(N.osc.osc.frequency, hz(n), 0.004); }
    if (!ctx) return;
    const g = N.osc.vca.gain, t = at();
    if (!was && notes.length) {
      g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(1, t + P.osc.attack);
    } else if (was && !notes.length) {
      g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
      g.setTargetAtTime(0, t, P.osc.release / 4);
      releaseEnd = t + P.osc.release * 1.5;
    }
  }

  // ── the bay ─────────────────────────────────────────────────────────────
  const NODES = [
    ['keys', 'person', 'keyboard'], ['osc', 'engine', 'oscillator'], ['filter', 'engine', 'lowpass filter'],
    ['scope', 'screen', 'waveform'], ['speaker', 'screen', 'speakers'],
  ];
  for (const [n, kind, label] of NODES) bay.addNode({ id: `${S}:${n}`, kind, label, place: 'browser' });
  const PORTS = [
    { id: id('keys', 'midi-out'), dir: 'out', medium: 'midi', emits: ['note'] },
    { id: id('osc', 'midi-in'), dir: 'in', medium: 'midi', accepts: ['note'], deliver: oscNote },
    { id: id('osc', 'audio-out'), dir: 'out', medium: 'audio' },
    { id: id('filter', 'audio-in'), dir: 'in', medium: 'audio' },
    { id: id('filter', 'audio-out'), dir: 'out', medium: 'audio' },
    { id: id('scope', 'audio-in'), dir: 'in', medium: 'audio' },
    { id: id('scope', 'audio-out'), dir: 'out', medium: 'audio' },
    { id: id('speaker', 'audio-in'), dir: 'in', medium: 'audio' },
  ];
  for (const p of PORTS) bay.addPort({ label: p.id.split(':').slice(1).join(':'), ...p });

  /** Replace the whole patch with `text`; returns the lines the bay refused. */
  function load(text) {
    const lines = parsePatch(text);
    for (const l of bay.links()) bay.unlink(l.id);
    const bad = [];
    for (const l of lines) {
      const r = bay.link(l.from, l.to, l.transforms, l.via ? { via: l.via } : {});
      if (!r.ok) bad.push({ line: `${l.from} -> ${l.to}`, why: r.why });
    }
    route();
    return bad;
  }

  // ── the sound ───────────────────────────────────────────────────────────
  let master = null;
  /** Build every module's WebAudio nodes on `ctx`. Called once, on a press. */
  function start(c) {
    if (ctx) return;
    ctx = c;
    master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination);
    const osc = ctx.createOscillator(), vca = ctx.createGain();
    osc.type = P.osc.wave; osc.frequency.value = P.osc.freq; osc.detune.value = P.osc.detune;
    vca.gain.value = 0;
    const level = ctx.createGain(); level.gain.value = 0.14;
    osc.connect(vca); vca.connect(level); osc.start();
    N.osc = { osc, vca, out: level, input: () => null };
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = P.filter.cutoff; f.Q.value = P.filter.q;
    N.filter = { f, out: f, input: () => f };
    // the scope is a thru: what goes in comes out, and an analyser reads it
    const thru = ctx.createGain(), an = ctx.createAnalyser();
    an.fftSize = 2048; thru.connect(an);
    N.scope = { an, buf: new Float32Array(an.fftSize), out: thru, input: () => thru };
    N.speaker = { out: null, input: () => master };
    route();
  }

  /** Connect exactly the audio links the bay holds; an unlinked out goes silent. */
  function route() {
    if (!ctx) return;
    for (const m of Object.values(N)) if (m.out) { try { m.out.disconnect(); } catch { /* not connected */ } }
    if (N.scope) N.scope.out.connect(N.scope.an);
    for (const l of bay.links()) {
      if (bay.port(l.from)?.medium !== 'audio') continue;
      const src = N[nodeName(l.from)]?.out, dst = N[nodeName(l.to)]?.input(portName(l.to));
      if (src && dst) src.connect(dst);
    }
  }

  /** Is a voice audible: a key held or still releasing. */
  const sounding = () => !!ctx && (notes.length > 0 || at() < releaseEnd);

  /** The scope's latest samples, or null when nothing is patched into it. */
  function read() {
    const s = N.scope;
    if (!s || !bay.links().some((l) => l.to === id('scope', 'audio-in'))) return null;
    s.an.getFloatTimeDomainData(s.buf);
    return s.buf;
  }

  return { bay, P, load, start, route, sounding, read, setParam, ctx: () => ctx, id };
}
