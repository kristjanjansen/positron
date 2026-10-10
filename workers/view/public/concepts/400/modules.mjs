// demo/concepts/400/modules.mjs: a mono WebAudio synth whose modules are bay
// nodes, and the router that wires the WebAudio graph from the links the bay
// holds. plans/plan-synth-patch.md §1 to §4. Page-local on purpose: the owner
// decided it lives inside /concepts/400/ ("yes 40 this way"), not in the shell.
//
// A module is a node with ports. An audio link is a `connect()` made by
// `route()`, a MIDI link carries notes through `bay.send`, and a value link
// carries a knob turn as `{ of: 'param', name, v }`, which the module's own
// `value-in` sets with `setTargetAtTime`. Nothing here draws anything.
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

/** Exponential travel for a knob whose raw value runs 0 to 127. */
const expo = (lo, hi) => ({
  to: (raw) => lo * (hi / lo) ** (raw / 127),
  from: (v) => (127 * Math.log(v / lo)) / Math.log(hi / lo),
});
const F = expo(55, 880), C = expo(80, 8000), A = expo(0.003, 2), R = expo(0.02, 3), L = expo(0.05, 12);
const hzText = (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)} kHz` : `${Math.round(v)} Hz`);
const sText = (v) => (v >= 1 ? `${v.toFixed(2)} s` : `${Math.round(v * 1000)} ms`);

/**
 * The knob row. `owner` is the module whose `value-in` takes the name; `raw`
 * is what the dial shows (0 to 127 for an exponential one) and `value(raw)` is
 * what travels along the link.
 */
export const KNOBS = [
  { name: 'freq', owner: 'osc', min: 0, max: 127, raw: F.from(220), value: F.to, format: (r) => hzText(F.to(r)) },
  { name: 'wave', owner: 'osc', min: 0, max: 3, step: 1, raw: 2, value: (r) => WAVES[Math.round(r)], format: (r) => WAVES[Math.round(r)].replace('sawtooth', 'saw') },
  { name: 'cutoff', owner: 'filter', min: 0, max: 127, raw: C.from(1100), value: C.to, format: (r) => hzText(C.to(r)) },
  { name: 'q', owner: 'filter', min: 0.7, max: 15, raw: 5, value: (r) => r, format: (r) => r.toFixed(1) },
  { name: 'attack', owner: 'amp', min: 0, max: 127, raw: A.from(0.008), value: A.to, format: (r) => sText(A.to(r)) },
  { name: 'release', owner: 'amp', min: 0, max: 127, raw: R.from(0.45), value: R.to, format: (r) => sText(R.to(r)) },
  { name: 'rate', owner: 'lfo', min: 0, max: 127, raw: L.from(0.35), value: L.to, format: (r) => `${L.to(r).toFixed(2)} Hz` },
  { name: 'depth', owner: 'lfo', min: 0, max: 3000, step: 10, raw: 800, value: (r) => r, format: (r) => `${Math.round(r)} Hz` },
];
export const knobRaw = (name, v) => {
  const k = KNOBS.find((x) => x.name === name);
  if (name === 'wave') return WAVES.indexOf(v);
  if (name === 'freq') return F.from(v);
  if (name === 'cutoff') return C.from(v);
  if (name === 'attack') return A.from(v);
  if (name === 'release') return R.from(v);
  if (name === 'rate') return L.from(v);
  return k ? v : 0;
};

/** What each module's `value-in` takes, so the port can list it. */
const NAMES = {
  osc: ['freq', 'detune', 'wave'],
  filter: ['cutoff', 'q'],
  amp: ['attack', 'decay', 'sustain', 'release'],
  lfo: ['rate', 'depth'],
};

/**
 * The six steps of §4, each a patch text. Choosing one unlinks everything and
 * links what `parsePatch` reads from it. `knobs` is which dials the step
 * offers; `preset` is the sound the step starts from, so step 1 is a sine
 * however the page was left.
 */
const L1 = `web:osc:audio-out -> web:speaker:audio-in
web:osc:audio-out -> web:scope:audio-in`;
const L2 = L1;
const L4 = `web:osc:audio-out -> web:filter:audio-in
web:filter:audio-out -> web:speaker:audio-in
web:filter:audio-out -> web:scope:audio-in`;
const L5 = `web:tone:midi-out -> web:osc:midi-in
web:tone:midi-out -> web:amp:midi-in
web:osc:audio-out -> web:filter:audio-in
web:filter:audio-out -> web:amp:audio-in
web:amp:audio-out -> web:speaker:audio-in
web:amp:audio-out -> web:scope:audio-in`;
const L6 = `${L5}
web:lfo:audio-out -> web:filter:cutoff-in`;

// One node per knob, eurorack style (*"Per knob. Lets go eurorack :)"*): each
// knob a step offers is a box of its own, `web:knob-<name>`, with a cable into
// the module it moves.
const withKnobs = (patch, names) => [patch,
  ...names.map((k) => `web:knob-${k}:value-out -> web:${KNOBS.find((x) => x.name === k).owner}:value-in`)].join('\n');
const STEP_LIST = [
  { name: 'sine', patch: L1, knobs: [], preset: { wave: 'sine', freq: 220 } },
  { name: 'knob', patch: L2, knobs: ['freq'], preset: { wave: 'sine' } },
  { name: 'wave', patch: L2, knobs: ['freq', 'wave'], preset: { wave: 'sawtooth' } },
  { name: 'filter', patch: L4, knobs: ['freq', 'wave', 'cutoff', 'q'], preset: { wave: 'sawtooth' } },
  // No keyboard since 2026-10-10 (*"from 40 rm keys and detune"*): play is a
  // test tone, one held note out of web:tone into the osc and the amp.
  { name: 'amp', patch: L5, knobs: ['freq', 'wave', 'cutoff', 'q', 'attack', 'release'], preset: { wave: 'sawtooth' } },
  { name: 'lfo', patch: L6, knobs: ['freq', 'wave', 'cutoff', 'q', 'attack', 'release', 'rate', 'depth'], preset: { wave: 'sawtooth', cutoff: 1000, depth: 800 } },
];
export const STEPS = STEP_LIST.map((st) => ({ ...st, patch: withKnobs(st.patch, st.knobs) }));

/**
 * @param {object} o
 * @param {(line:string, level?:string)=>void} o.log
 * @param {(module:string, name:string, v:any)=>void} [o.onParam]  after a module took a parameter
 */
export function createSynth({ log = () => {}, onParam = () => {} } = {}) {
  const bay = createBay();
  // Parameters as plain state, so a knob turned before any sound exists is
  // already the sound the first press makes.
  const P = {
    osc: { freq: 220, detune: 0, wave: 'sine' },
    filter: { cutoff: 1100, q: 5 },
    amp: { attack: 0.008, decay: 0.35, sustain: 0.55, release: 0.45 },
    lfo: { rate: 0.35, depth: 800 },
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
      if (mod === 'osc' && name === 'freq' && !keyed()) glide(N.osc.osc.frequency, v);
      if (mod === 'osc' && name === 'detune') glide(N.osc.osc.detune, v);
      if (mod === 'osc' && name === 'wave') N.osc.osc.type = v;
      if (mod === 'filter' && name === 'cutoff') glide(N.filter.f.frequency, v, 0.02);
      if (mod === 'filter' && name === 'q') glide(N.filter.f.Q, v, 0.02);
      if (mod === 'lfo' && name === 'rate') glide(N.lfo.o.frequency, v, 0.05);
      if (mod === 'lfo' && name === 'depth') glide(N.lfo.g.gain, v, 0.05);
    }
    onParam(mod, name, v);
  }
  const deliverParam = (mod) => (e) => {
    if (e?.of !== 'param') { log(`${mod} takes parameters, and this was not one`, 'warn'); return; }
    setParam(mod, e.name, e.v);
  };

  // The osc is mono and plays the last key still held.
  const oscNotes = [];
  const keyed = () => bay.links().some((l) => l.to === id('osc', 'midi-in'));
  function oscNote(e) {
    const i = oscNotes.indexOf(e.d1);
    if (i >= 0) oscNotes.splice(i, 1);
    if (e.d2) oscNotes.push(e.d1);
    const n = oscNotes[oscNotes.length - 1];
    if (n !== undefined && ctx) glide(N.osc.osc.frequency, hz(n), 0.004);
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
    ...KNOBS.map((k) => [`knob-${k.name}`, 'person', 'knob']),
    ['osc', 'engine', 'oscillator'], ['filter', 'engine', 'lowpass filter'],
    ['amp', 'engine', 'amp and envelope'], ['lfo', 'engine', 'lfo'],
    ['scope', 'screen', 'waveform'], ['speaker', 'screen', 'speakers'],
  ];
  for (const [n, kind, label] of NODES) bay.addNode({ id: `${S}:${n}`, kind, label, place: 'browser' });
  const param = (mod) => ({ id: id(mod, 'value-in'), dir: 'in', medium: 'value',
    shape: { of: 'param', names: NAMES[mod] }, deliver: deliverParam(mod) });
  const PORTS = [
    { id: id('tone', 'midi-out'), dir: 'out', medium: 'midi', emits: ['note'] },
    // No `names` on a knob: the bay's shape check wants names to be equal, and
    // one knob names one of a module's several. The module ignores and logs a
    // name it does not have.
    ...KNOBS.map((k) => ({ id: id(`knob-${k.name}`, 'value-out'), dir: 'out', medium: 'value', shape: { of: 'param' } })),
    { id: id('osc', 'midi-in'), dir: 'in', medium: 'midi', accepts: ['note'], deliver: oscNote },
    param('osc'),
    { id: id('osc', 'audio-out'), dir: 'out', medium: 'audio' },
    { id: id('filter', 'audio-in'), dir: 'in', medium: 'audio' },
    // ⚠️ A NAMED EXCEPTION TO THE `<medium>-<dir>` RULE (plans/plan-site-names.md
    // §0), chosen in plans/plan-synth-patch.md §3 option A. A modulation input
    // is named for the parameter it moves, because that is the fact a reader
    // needs; its medium is still on the port. `audio-in-2` would say nothing
    // about which of the filter's two audio inputs is the signal.
    { id: id('filter', 'cutoff-in'), dir: 'in', medium: 'audio' },
    param('filter'),
    { id: id('filter', 'audio-out'), dir: 'out', medium: 'audio' },
    { id: id('amp', 'audio-in'), dir: 'in', medium: 'audio' },
    { id: id('amp', 'midi-in'), dir: 'in', medium: 'midi', accepts: ['note'], deliver: ampGate },
    param('amp'),
    { id: id('amp', 'audio-out'), dir: 'out', medium: 'audio' },
    param('lfo'),
    { id: id('lfo', 'audio-out'), dir: 'out', medium: 'audio' },
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
    panic();
    route();
    return bad;
  }

  function panic() {
    oscNotes.length = 0;
    ampHeld.clear();
    if (ctx) { const g = N.amp.vca.gain; g.cancelScheduledValues(at()); g.setTargetAtTime(0, at(), 0.01); }
  }

  // ── the sound ───────────────────────────────────────────────────────────
  let master = null, pull = null;
  /** Build every module's WebAudio nodes on `ctx`. Called once, on a press. */
  function start(c) {
    if (ctx) return;
    ctx = c;
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    // A silent sink that keeps every scope's analyser pulled, so a scope reads
    // whatever is patched into it whether or not that reaches the speakers.
    // /concepts/300/ had to learn this: an analyser nothing pulls reads silence.
    pull = ctx.createGain(); pull.gain.value = 0; pull.connect(ctx.destination);

    const osc = ctx.createOscillator(), level = ctx.createGain();
    osc.type = P.osc.wave; osc.frequency.value = P.osc.freq; osc.detune.value = P.osc.detune;
    level.gain.value = 0.22;
    osc.connect(level); osc.start();
    N.osc = { osc, out: level, input: () => null };

    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = P.filter.cutoff; f.Q.value = P.filter.q;
    N.filter = { f, out: f, input: (p) => (p === 'cutoff-in' ? f.frequency : f) };

    const vca = ctx.createGain(); vca.gain.value = 0;
    N.amp = { vca, out: vca, input: () => vca };

    const lo = ctx.createOscillator(), lg = ctx.createGain();
    lo.frequency.value = P.lfo.rate; lg.gain.value = P.lfo.depth;
    lo.connect(lg); lo.start();
    N.lfo = { o: lo, g: lg, out: lg, input: () => null };

    for (const s of ['scope']) {
      const an = ctx.createAnalyser(); an.fftSize = 2048;
      an.connect(pull);
      N[s] = { an, buf: new Float32Array(an.fftSize), out: null, input: () => an };
    }
    N.speaker = { out: null, input: () => master };
    route();
  }

  /**
   * THE ROUTER. Reads `bay.links()` and connects exactly what is held: a
   * module's audio out to the far module's input, which is a node or, for
   * `cutoff-in`, the filter's frequency AudioParam. Every out is disconnected
   * first, so an unlinked edge goes silent. Called after every link change.
   * As `route()` on /concepts/300/, lifted to every module.
   */
  function route() {
    if (!ctx) return;
    for (const m of Object.values(N)) if (m.out) { try { m.out.disconnect(); } catch { /* not connected */ } }
    for (const l of bay.links()) {
      if (bay.port(l.from)?.medium !== 'audio') continue;
      const src = N[nodeName(l.from)]?.out, dst = N[nodeName(l.to)]?.input(portName(l.to));
      if (src && dst) src.connect(dst);
    }
    // With no key on the osc, it plays the freq knob's pitch.
    if (!keyed()) N.osc.osc.frequency.setTargetAtTime(P.osc.freq, at(), 0.01);
  }

  let on = false;
  /** Sound on or off at the speakers. Nothing else stops: the modules keep running. */
  function sound(v) {
    on = v;
    if (master) master.gain.setTargetAtTime(v ? 0.7 : 0, at(), 0.03);
  }

  const has = (from, to) => bay.links().some((l) => l.from === from && l.to === to);
  /** Is a voice audible: sound on, and either no amp in the chain or a key held or releasing. */
  function sounding() {
    if (!ctx || !on) return false;
    const gated = has(id('tone', 'midi-out'), id('amp', 'midi-in')) && bay.links().some((l) => l.to === id('amp', 'audio-in'));
    return !gated || ampHeld.size > 0 || at() < releaseEnd;
  }

  /** A scope's latest samples, or null when nothing is patched into it. */
  function read(scope) {
    const s = N[scope];
    if (!s || !bay.links().some((l) => l.to === id(scope, 'audio-in'))) return null;
    s.an.getFloatTimeDomainData(s.buf);
    return s.buf;
  }

  return {
    bay, P, load, start, route, sound, sounding, read, panic, setParam,
    on: () => on, ctx: () => ctx, id,
  };
}
