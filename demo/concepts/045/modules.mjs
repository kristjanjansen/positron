// demo/concepts/045/modules.mjs: the mono WebAudio synth of /concepts/040/, as one
// fixed patch, with an XY pad as a node of its own that plays the filter.
//
// ⚠️ A COPY OF demo/concepts/040/modules.mjs, NOT AN IMPORT, ON PURPOSE. The two
// pages stay independent: 40 can change its steps, knobs or router without
// moving this page, and this one can drop what it does not use (the steps, the
// LFO, the freq, detune, cutoff and q knobs). If both settle, the shared half
// is the thing to lift, once, by one agent.
//
// A module is a node with ports. An audio link is a `connect()` made by
// `route()`, a MIDI link carries notes through `bay.send`, and a value link
// carries a knob turn or a pad move as `{ of: 'param', name, v }`, which the
// module's own `value-in` sets with `setTargetAtTime`. Nothing here draws.
//
// NOTHING OPENS ON IMPORT. The modules keep their parameters as plain state
// until `start(ctx)` is handed an AudioContext, which the page makes on the
// first key or play press.

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
const A = expo(0.003, 2), R = expo(0.02, 3);
const sText = (v) => (v >= 1 ? `${v.toFixed(2)} s` : `${Math.round(v * 1000)} ms`);

/**
 * The knob row. `owner` is the module whose `value-in` takes the name; `raw`
 * is what the dial shows (0 to 127 for an exponential one) and `value(raw)` is
 * what travels along the link. Cutoff and Q are not here: the pad plays them.
 */
export const KNOBS = [
  { name: 'wave', owner: 'osc', min: 0, max: 3, step: 1, raw: 2, value: (r) => WAVES[Math.round(r)], format: (r) => WAVES[Math.round(r)].replace('sawtooth', 'saw') },
  { name: 'attack', owner: 'amp', min: 0, max: 127, raw: 127 * A.from(0.005), value: (r) => A.to(r / 127), format: (r) => sText(A.to(r / 127)) },
  { name: 'release', owner: 'amp', min: 0, max: 127, raw: 127 * R.from(0.6), value: (r) => R.to(r / 127), format: (r) => sText(R.to(r / 127)) },
];

/** What each module's `value-in` takes, so the port can list it. */
const NAMES = {
  osc: ['freq', 'detune', 'wave'],
  filter: ['cutoff', 'q'],
  amp: ['attack', 'decay', 'sustain', 'release'],
};

/** The one patch. Keys to osc and amp, osc to filter to amp to speaker and
 *  scope, the pad to the filter, and a cable per knob. */
export const PATCH = [
  'web:tone:midi-out -> web:osc:midi-in',
  'web:tone:midi-out -> web:amp:midi-in',
  'web:osc:audio-out -> web:filter:audio-in',
  'web:filter:audio-out -> web:amp:audio-in',
  'web:amp:audio-out -> web:speaker:audio-in',
  'web:amp:audio-out -> web:scope:audio-in',
  'web:xy:value-out -> web:filter:value-in',
  ...KNOBS.map((k) => `web:knob-${k.name}:value-out -> web:${k.owner}:value-in`),
].join('\n');

/**
 * @param {object} o
 * @param {(line:string, level?:string)=>void} o.log
 */
export function createSynth({ log = () => {} } = {}) {
  const bay = createBay();
  // Parameters as plain state, so a knob turned or the pad moved before any
  // sound exists is already the sound the first press makes. The osc starts
  // on A2, the drone's note.
  const P = {
    osc: { freq: 110, detune: 0, wave: 'sawtooth' },
    filter: { cutoff: 600, q: 8 },
    amp: { attack: 0.005, decay: 0.35, sustain: 0.8, release: 0.6 },
  };
  let ctx = null;
  const N = {};                       // module -> { out, input(port) } once started
  const told = new Set();             // "module name" pairs already logged as unknown

  // ── what a module does with what arrives ────────────────────────────────
  const at = () => ctx.currentTime;
  const glide = (param, v, tc = 0.015) => { if (ctx) param.setTargetAtTime(v, at(), tc); };

  function setParam(mod, name, v) {
    if (!NAMES[mod].includes(name)) {
      const k = `${mod} ${name}`;
      if (!told.has(k)) { told.add(k); log(`${mod} has no ${name}, so it ignores it`); }
      return;
    }
    P[mod][name] = v;
    if (ctx) {
      if (mod === 'osc' && name === 'detune') glide(N.osc.osc.detune, v);
      if (mod === 'osc' && name === 'wave') N.osc.osc.type = v;
      // A pad sends at full pointer rate, so a short time constant keeps the
      // sweep under the hand without stepping.
      if (mod === 'filter' && name === 'cutoff') glide(N.filter.f.frequency, v, 0.01);
      if (mod === 'filter' && name === 'q') glide(N.filter.f.Q, v, 0.01);
    }
  }
  const deliverParam = (mod) => (e) => {
    if (e?.of !== 'param') { log(`${mod} takes parameters, and this was not one`, 'warn'); return; }
    setParam(mod, e.name, e.v);
  };

  // The osc is mono and plays the last key still held.
  const oscNotes = [];
  function oscNote(e) {
    const i = oscNotes.indexOf(e.d1);
    if (i >= 0) oscNotes.splice(i, 1);
    if (e.d2) oscNotes.push(e.d1);
    const n = oscNotes[oscNotes.length - 1];
    if (n !== undefined) { P.osc.freq = hz(n); if (ctx) glide(N.osc.osc.frequency, hz(n), 0.004); }
  }

  // The amp opens on the first key down and closes when the last one is up.
  const ampHeld = new Set();
  let releaseEnd = 0;
  function ampGate(e) {
    const was = ampHeld.size;
    if (e.d2) ampHeld.add(e.d1); else ampHeld.delete(e.d1);
    if (!ctx) return;
    const g = N.amp.vca.gain, t = at(), a = P.amp;
    if (!was && ampHeld.size) {
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(1, t + a.attack);
      g.setTargetAtTime(a.sustain, t + a.attack, a.decay / 3);
    } else if (was && !ampHeld.size) {
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
      g.setTargetAtTime(0, t, a.release / 4);
      releaseEnd = t + a.release * 1.5;
    }
  }

  // ── the bay ─────────────────────────────────────────────────────────────
  const NODES = [
    ['tone', 'person', 'test tone'],
    ['xy', 'person', 'xy pad'],
    ...KNOBS.map((k) => [`knob-${k.name}`, 'person', 'knob']),
    ['osc', 'engine', 'oscillator'], ['filter', 'engine', 'lowpass filter'],
    ['amp', 'engine', 'amp and envelope'],
    ['scope', 'screen', 'waveform'], ['speaker', 'screen', 'speakers'],
  ];
  for (const [n, kind, label] of NODES) bay.addNode({ id: `${S}:${n}`, kind, label, place: 'browser' });
  const param = (mod) => ({ id: id(mod, 'value-in'), dir: 'in', medium: 'value',
    shape: { of: 'param', names: NAMES[mod] }, deliver: deliverParam(mod) });
  const PORTS = [
    { id: id('tone', 'midi-out'), dir: 'out', medium: 'midi', emits: ['note'] },
    // No `names` on a knob or the pad: the bay's shape check wants names to be
    // equal, and a knob names one of a module's several. The module ignores and
    // logs a name it does not have.
    { id: id('xy', 'value-out'), dir: 'out', medium: 'value', shape: { of: 'param' } },
    ...KNOBS.map((k) => ({ id: id(`knob-${k.name}`, 'value-out'), dir: 'out', medium: 'value', shape: { of: 'param' } })),
    { id: id('osc', 'midi-in'), dir: 'in', medium: 'midi', accepts: ['note'], deliver: oscNote },
    param('osc'),
    { id: id('osc', 'audio-out'), dir: 'out', medium: 'audio' },
    { id: id('filter', 'audio-in'), dir: 'in', medium: 'audio' },
    param('filter'),
    { id: id('filter', 'audio-out'), dir: 'out', medium: 'audio' },
    { id: id('amp', 'audio-in'), dir: 'in', medium: 'audio' },
    { id: id('amp', 'midi-in'), dir: 'in', medium: 'midi', accepts: ['note'], deliver: ampGate },
    param('amp'),
    { id: id('amp', 'audio-out'), dir: 'out', medium: 'audio' },
    { id: id('scope', 'audio-in'), dir: 'in', medium: 'audio' },
    { id: id('speaker', 'audio-in'), dir: 'in', medium: 'audio' },
  ];
  // A port's label is its own `node:port`, which is what a refusal names.
  for (const p of PORTS) bay.addPort({ label: p.id.split(':').slice(1).join(':'), ...p });

  /**
   * Replace the whole patch with `text`. Returns the lines the bay refused,
   * each with its reason, or throws the parser's own sentence for a line it
   * cannot read at all.
   */
  function load(text) {
    const lines = parsePatch(text);
    for (const l of bay.links()) bay.unlink(l.id);
    const bad = [];
    for (const l of lines) {
      const r = bay.link(l.from, l.to, l.transforms, l.via ? { via: l.via } : {});
      if (!r.ok) bad.push({ line: `${l.from} -> ${l.to}`, why: r.why, fix: r.fix || '' });
    }
    route();
    return bad;
  }

  // ── the sound ───────────────────────────────────────────────────────────
  let master = null, pull = null;
  /** Build every module's WebAudio nodes on `ctx`. Called once, on a press. */
  function start(c) {
    if (ctx) return;
    ctx = c;
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    // A silent sink that keeps the scope's analyser pulled, so it reads
    // whatever is patched into it whether or not that reaches the speakers.
    pull = ctx.createGain(); pull.gain.value = 0; pull.connect(ctx.destination);

    const osc = ctx.createOscillator(), level = ctx.createGain();
    osc.type = P.osc.wave; osc.frequency.value = P.osc.freq; osc.detune.value = P.osc.detune;
    // Lower than 40's 0.22: a resonant peak on a saw lifts the level by up to
    // the pad's top Q in dB, and 18 dB is about eight times.
    level.gain.value = 0.14;
    osc.connect(level); osc.start();
    N.osc = { osc, out: level, input: () => null };

    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = P.filter.cutoff; f.Q.value = P.filter.q;
    N.filter = { f, out: f, input: () => f };

    const vca = ctx.createGain(); vca.gain.value = 0;
    N.amp = { vca, out: vca, input: () => vca };

    const an = ctx.createAnalyser(); an.fftSize = 2048;
    an.connect(pull);
    N.scope = { an, buf: new Float32Array(an.fftSize), out: null, input: () => an };
    N.speaker = { out: null, input: () => master };
    route();
  }

  /**
   * THE ROUTER, as on /concepts/040/. Reads `bay.links()` and connects exactly
   * what is held. Every out is disconnected first, so an unlinked edge goes
   * silent. Called after every link change.
   */
  function route() {
    if (!ctx) return;
    for (const m of Object.values(N)) if (m.out) { try { m.out.disconnect(); } catch { /* not connected */ } }
    for (const l of bay.links()) {
      if (bay.port(l.from)?.medium !== 'audio') continue;
      const src = N[nodeName(l.from)]?.out, dst = N[nodeName(l.to)]?.input(portName(l.to));
      if (src && dst) src.connect(dst);
    }
  }

  let on = false;
  /** Sound on or off at the speakers. Nothing else stops: the modules keep running. */
  function sound(v) {
    on = v;
    if (master) master.gain.setTargetAtTime(v ? 0.7 : 0, at(), 0.03);
  }

  /** Is a voice audible: sound on, and a key held or still releasing. */
  function sounding() {
    if (!ctx || !on) return false;
    return ampHeld.size > 0 || at() < releaseEnd;
  }

  /** The scope's latest samples, or null when nothing is patched into it. */
  function read() {
    const s = N.scope;
    if (!s || !bay.links().some((l) => l.to === id('scope', 'audio-in'))) return null;
    s.an.getFloatTimeDomainData(s.buf);
    return s.buf;
  }

  return {
    bay, P, load, start, route, sound, sounding, read, setParam,
    on: () => on, ctx: () => ctx, id,
  };
}
