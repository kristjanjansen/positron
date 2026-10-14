// demo/synth/patch-synth.mjs: a mono WebAudio synth whose modules are bay
// nodes, and the router that wires the WebAudio graph from the links the bay
// holds. plans/plan-synth-patch.md §1 to §4. It was
// demo/concepts/synth/040/modules.mjs until 2026-10-13, when 040 was split into
// one page per module (*"can split https://positron.studio/concepts/synth/040/
// apart to different conecepts, do not dupe with existing ones (so only some
// last steps?). rm 040 later."*). It sits beside the pages that use it, as
// radio/tempo.mjs does. /synth/sound/ Sound design is its one page since
// 2026-10-13 (*"combine filter+envelope+lfo to single sound design concept"*),
// when the filter, envelope and LFO pages (050, 060, 070) became that one;
// module-page.mjs builds it.
//
// A module is a node with ports. An audio link is a `connect()` made by
// `route()`, a MIDI link carries notes through `bay.send`, and a value link
// carries a knob turn as `{ of: 'param', name, v }`, which the module's own
// `value-in` sets with `setTargetAtTime`. Nothing here draws anything.
//
// NOTHING OPENS ON IMPORT. The modules keep their parameters as plain state
// until `start(ctx)` is handed an AudioContext, which the page makes on the
// first key press.

import { createBay, parsePatch } from '/shell/bay.mjs';
import { addNodes } from '/shell/nodes.mjs';
import { routeAudio } from '/shell/audio-router.mjs';
import { WAVES, hz, expo, hzText, sText, PARAMS } from '/shell/synth-params.mjs';

export const S = 'web';
const id = (node, port) => `${S}:${node}:${port}`;
const nodeName = (portId) => portId.split(':')[1];
const portName = (portId) => portId.split(':')[2];

export { WAVES, hz };

const F = expo(55, 880), C = expo(80, 8000), A = expo(0.003, 2), D = expo(0.02, 3), R = expo(0.02, 3), L = expo(0.05, 12);
// The five the kit voice shares come from synth-params.mjs; this page's own
// starting dial positions and the module that owns each stay here.
const kit = (name, owner, raw) => {
  const { min, max, step, value, format } = PARAMS.find((p) => p.name === name);
  return { name, owner, min, max, ...(step === undefined ? {} : { step }), raw, value, format };
};

/**
 * Every knob a module has. `owner` is the module whose `value-in` takes the
 * name; `raw` is what the dial shows (0 to 127 for an exponential one) and
 * `value(raw)` is what travels along the link. A page offers some of them.
 */
export const KNOBS = [
  { name: 'freq', owner: 'osc', min: 0, max: 127, raw: F.from(220), value: F.to, format: (r) => hzText(F.to(r)) },
  kit('wave', 'osc', 2),
  kit('cutoff', 'filter', C.from(1100)),
  kit('q', 'filter', 5),
  kit('attack', 'amp', A.from(0.008)),
  { name: 'decay', owner: 'amp', min: 0, max: 127, raw: D.from(0.35), value: D.to, format: (r) => sText(D.to(r)) },
  { name: 'sustain', owner: 'amp', min: 0, max: 1, step: 0.01, raw: 0.55, value: (r) => r, format: (r) => `${Math.round(r * 100)}%` },
  kit('release', 'amp', R.from(0.45)),
  { name: 'rate', owner: 'lfo', min: 0, max: 127, raw: L.from(0.35), value: L.to, format: (r) => `${L.to(r).toFixed(2)} Hz` },
  // Depth is in octaves and travels as cents, because the LFO moves the
  // filter's detune rather than its frequency. A swing in Hz below a low
  // cutoff drove the frequency to 0 and the wave went flat for half of
  // every cycle (asked 2026-10-10, *"lfo just flattens osc"*).
  { name: 'depth', owner: 'lfo', min: 0, max: 4, step: 0.1, raw: 1.5, value: (r) => r * 1200, format: (r) => `${r.toFixed(1)} oct` },
];
export const knobRaw = (name, v) => {
  const k = KNOBS.find((x) => x.name === name);
  if (name === 'wave') return WAVES.indexOf(v);
  if (name === 'freq') return F.from(v);
  if (name === 'cutoff') return C.from(v);
  if (name === 'attack') return A.from(v);
  if (name === 'decay') return D.from(v);
  if (name === 'release') return R.from(v);
  if (name === 'rate') return L.from(v);
  if (name === 'depth') return v / 1200;
  return k ? v : 0;
};

/** What each module's `value-in` takes, so the port can list it. */
const NAMES = {
  osc: ['freq', 'detune', 'wave'],
  filter: ['cutoff', 'q'],
  amp: ['attack', 'decay', 'sustain', 'release'],
  lfo: ['rate', 'depth'],
};

// One node per knob, eurorack style (*"Per knob. Lets go eurorack :)"*): each
// knob a page offers is a box of its own, `web:knob-<name>`, with a cable into
// the module it moves.
export const withKnobs = (patch, names) => [patch,
  ...names.map((k) => `web:knob-${k}:value-out -> web:${KNOBS.find((x) => x.name === k).owner}:value-in`)].join('\n');

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
    lfo: { rate: 0.35, depth: 1800 },
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
  // With an amp taking the keys and the osc's sound, the amp shapes the note.
  // Without one, the osc opens and closes its own level on the keys, at once,
  // so a page with no envelope still plays notes rather than one held drone.
  const ampGated = () => bay.links().some((l) => l.to === id('amp', 'midi-in'))
    && bay.links().some((l) => l.to === id('amp', 'audio-in'));
  const OSC_LEVEL = 0.22;
  function oscGate() {
    if (!ctx) return;
    const open = ampGated() || !keyed() || oscNotes.length > 0;
    N.osc.out.gain.setTargetAtTime(open ? OSC_LEVEL : 0, at(), open ? 0.004 : 0.02);
  }
  function oscNote(e) {
    const i = oscNotes.indexOf(e.d1);
    if (i >= 0) oscNotes.splice(i, 1);
    if (e.d2) oscNotes.push(e.d1);
    const n = oscNotes[oscNotes.length - 1];
    if (n !== undefined && ctx) glide(N.osc.osc.frequency, hz(n), 0.004);
    oscGate();
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
  // The shapes are /shell/nodes.mjs's, among them `filter:cutoff-in`, the
  // named exception to `<medium>-<dir>` (plans/plan-synth-patch.md §3 option A).
  // A port's label is its own `node:port`, which is what a refusal names.
  const knobNodes = KNOBS.map((k) => `knob-${k.name}`);
  addNodes(bay, S, ['keys', ...knobNodes, 'osc', 'filter', 'amp', 'lfo', 'scope', 'speaker'], {
    portLabel: 'node:port',
    deliver: {
      'osc:midi-in': oscNote, 'amp:midi-in': ampGate,
      ...Object.fromEntries(['osc', 'filter', 'amp', 'lfo'].map((m) => [`${m}:value-in`, deliverParam(m)])),
    },
  });

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
    // /radio/blend/ had to learn this: an analyser nothing pulls reads silence.
    pull = ctx.createGain(); pull.gain.value = 0; pull.connect(ctx.destination);

    const osc = ctx.createOscillator(), level = ctx.createGain();
    osc.type = P.osc.wave; osc.frequency.value = P.osc.freq; osc.detune.value = P.osc.detune;
    level.gain.value = 0;
    osc.connect(level); osc.start();
    N.osc = { osc, out: level, input: () => null };

    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = P.filter.cutoff; f.Q.value = P.filter.q;
    N.filter = { f, out: f, input: (p) => (p === 'cutoff-in' ? f.detune : f) };

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
   * `cutoff-in`, the filter's detune AudioParam. Every out is disconnected
   * first, so an unlinked edge goes silent. Called after every link change.
   * The wiring is the kit's routeAudio (audio-router.mjs), lifted from here.
   */
  function route() {
    if (!ctx) return;
    routeAudio({
      edges: bay.links().filter((l) => bay.port(l.from)?.medium === 'audio'),
      out: (p) => N[nodeName(p)]?.out,
      input: (p) => N[nodeName(p)]?.input(portName(p)),
      outs: Object.values(N).map((m) => m.out),
    });
    // With no key on the osc, it plays the freq knob's pitch.
    if (!keyed()) N.osc.osc.frequency.setTargetAtTime(P.osc.freq, at(), 0.01);
    oscGate();
  }

  let on = false;
  /** Sound on or off at the speakers. Nothing else stops: the modules keep running. */
  function sound(v) {
    on = v;
    if (master) master.gain.setTargetAtTime(v ? 0.7 : 0, at(), 0.03);
  }

  /** Is a voice audible: sound on, and a key held or the amp still releasing. */
  function sounding() {
    if (!ctx || !on) return false;
    if (ampGated()) return ampHeld.size > 0 || at() < releaseEnd;
    return !keyed() || oscNotes.length > 0;
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
