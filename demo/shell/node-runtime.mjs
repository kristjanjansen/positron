// demo/shell/node-runtime.mjs: what makes a node on /connect/ run (plans/plan-connect-ui.md 2).
// A node holds a runtime while it holds a link; factories load by `import()` on first link.
// `make(o)` in rt-<type>.mjs returns, with no AudioContext and no fetch: face?, slot?, deliver?,
// start?(ctx, dest), audio? { out, in }, heard(), stop?(), close(). It gets { id, type, bay, log,
// send, wake, peerParam, peerSpec, level, reroute, upstream, downstream }.
// why: lessons/kit-node-runtime.md#header

import { addNodes } from './nodes.mjs';
import { routeAudio } from './audio-router.mjs';
import { patchOf } from './bay.mjs';

export const RUNTIMES = {
  keys: () => import('./rt-keys.mjs'),
  synth: () => import('./rt-synth.mjs'),
  speaker: () => import('./rt-speaker.mjs'),
  knob: () => import('./rt-knob.mjs'),
  scope: () => import('./rt-scope.mjs'),
  plaits: () => import('./rt-plaits.mjs'),
  midi: () => import('./rt-midi.mjs'),
  sequencer: () => import('./rt-sequencer.mjs'),
  drum: () => import('./rt-drum.mjs'),
  patch: () => import('./rt-patch.mjs'),
  typing: () => import('./rt-typing.mjs'),
  typewriter: () => import('./rt-typewriter.mjs'),
  'typewriter-samples': () => import('./rt-store.mjs'),
  'piano-samples': () => import('./rt-store.mjs'),
  'rhodes-samples': () => import('./rt-store.mjs'),
  recording: () => import('./rt-store.mjs'),
  pico: () => import('./rt-pico.mjs'),
  oled: () => import('./rt-oled.mjs'),
  collide: () => import('./rt-collide.mjs'),
  camera: () => import('./rt-camera.mjs'),
  screen: () => import('./rt-screen.mjs'),
  'shader-dither': () => import('./rt-shader-dither.mjs'),
  shader: () => import('./rt-shader.mjs'),
  writer: () => import('./rt-writer.mjs'),
  player: () => import('./rt-player.mjs'),
  grains: () => import('./rt-grains.mjs'),
  rec: () => import('./rt-rec.mjs'),
  sampler: () => import('./rt-sampler.mjs'),
};

// Every other catalogue type says why it does not run here yet, in words a
// person reads in the log. The test requires every NODES key in one of the two.
const why = (reason, names) => Object.fromEntries(names.map((n) => [n, reason]));
export const NOT_YET = {
  ...why('its control is a kit piece that is not bound to a runtime yet', ['fader', 'dial', 'pick', 'machines',
    'code', 'invert', 'scale', 'volume-knob']),
  ...why('its face is the room\'s chat, which joins a relay room; not on this page yet', ['chat', 'admin', 'notice', 'history-store']),
  paper: 'its sheet is the typing node\'s face here; a second sheet fed by a link is a later slice',
  ...why('the oscillator, filter, amp and lfo are one monolith in synth/patch-synth.mjs, to be split into module factories first',
    ['osc', 'filter', 'amp', 'lfo']),
  ...why('its engine is a group module shaped for its own pages, which needs an adapter first', ['fau',
    'player-video', 'level', 'patch-values', 'tempo', 'fx-click', 'fx-typewriter',
    'timeline', 'rec-text', 'mix-knob', 'display']),
  ...why('its engine is a kit piece that is not bound to a runtime yet', ['noise', 'tuner',
    'shader-landscape', 'wave']),
  ...why('its engine lives only inside one page and has to be lifted into demo/shell/ first', ['midi-state',
    'shader-dots', 'pixelate', 'key', 'fx', 'autoplay', 'bass', 'pad', 'mixer', 'xfade', 'blend-fader',
    'mix', 'rec-video', 'looper', 'store']),
  ...why('somebody else\'s server, opened only by a person\'s own press and never by a check, a later slice',
    ['station', 'newsreel', 'err-radio']),
  ...why('a page\'s own clock drives it (/radio/scenery/), with nothing to link it to here', ['drift']),
  ...why('a hop between sites, carried by a transport rather than run in this tab', ['shout', 'stream-live', 'stream-hls', 'moq-relay']),
};

// The types whose runtime shows a face, so a check can require one rather than
// accept a runtime that quietly drew nothing. A Pi node has one too (SITES).
export const FACED = ['keys', 'knob', 'scope', 'plaits', 'midi', 'sequencer', 'patch', 'typing', 'pico', 'oled', 'collide', 'camera', 'screen', 'shader', 'player', 'rec', 'grains'];

// A node on another site runs here as that site's face (presence and Join),
// keyed by site since its node is not a catalogue type.
export const SITES = {
  'pi-1': () => import('./rt-pi.mjs'),
};

/** The loader for a node's runtime, or null: its catalogue type first, then its site. */
export function loaderOf(id, typeOf) {
  const t = typeOf(id);
  if (t && Object.hasOwn(RUNTIMES, t)) return RUNTIMES[t];
  const site = id.split(':')[0];
  return Object.hasOwn(SITES, site) ? SITES[site] : null;
}

/** Why a node with no runtime does not run, for a type outside the catalogue too (the Pi). */
export function whyNot(type, nodeId = '') {
  if (type && NOT_YET[type]) return NOT_YET[type];
  if (/^pi-\d+:/.test(nodeId)) return 'it runs on the Raspberry Pi, which this page joins in a later slice (presence and Join)';
  return 'no runtime is written for it';
}

// Ports a runtime has that the catalogue does not name yet. Empty since synth's
// value-in moved into nodes.mjs; kept because /connect/ still reads it.
export const EXTRA_PORTS = {};

const nodeOf = (portId) => portId.split(':').slice(0, 2).join(':');

/**
 * Which runtimes to make and which to close. A node needs one while it holds
 * at least one link, and only if `runs(nodeId)` says it has one.
 * @returns {{ create: string[], close: string[] }} create in the order the links first name them
 */
export function plan(links, have, runs = () => true) {
  const linked = [];
  for (const l of links) for (const p of [l.from, l.to]) { const n = nodeOf(p); if (!linked.includes(n)) linked.push(n); }
  const has = new Set(have);
  return { create: linked.filter((n) => !has.has(n) && runs(n)), close: [...has].filter((n) => !linked.includes(n)) };
}

// The two transports that stay inside one tab (bay.mjs MACHINE_ONLY lists
// `indexeddb` and `jack` too, which are not wired by a page's router).
export const IN_TAB = { webaudio: 'audio', page: 'video' };

/** The heavy links to wire inside this tab: `{ from, to, transport, medium }`. Light links have no session and are the bay's. */
export function routes(links) {
  return links.filter((l) => Object.hasOwn(IN_TAB, l.session?.transport ?? ''))
    .map((l) => ({ from: l.from, to: l.to, transport: l.session.transport, medium: IN_TAB[l.session.transport] }));
}

/**
 * The parameters a knob could turn when the `knob` type box is linked to a
 * value-in that names them (decision D2), or null when this is not such a link.
 */
export function knobChoices(bay, from, to, site = 'web') {
  if (from !== `${site}:knob:value-out`) return null;
  const names = bay.port(to)?.shape?.names;
  return Array.isArray(names) && names.length ? [...names] : null;
}

/**
 * One knob instance for parameter `name` of the node `to` is on, added to the
 * bay if it is not there, and the pair to link. `knob-<name>` serves the first
 * of a type, `knob-<name>-<n>` its instance n (`synth-2`), so two synths never
 * share a knob (decision D6).
 */
export function knobFor(bay, to, name, site = 'web') {
  const n = to.split(':')[1].match(/-(\d+)$/)?.[1];
  const seg = `knob-${name}${n ? `-${n}` : ''}`;
  const id = `${site}:${seg}`;
  if (!bay.node(id)) {
    addNodes(bay, site, [{ name: 'knob', as: seg, label: name }], { ports: { [`${seg}:value-out`]: { label: `${name} knob value-out` } } });
  }
  return [`${id}:value-out`, to];
}

/**
 * The runtimes of one page's bay.
 * @param {object} o
 * @param {object} o.bay
 * @param {(nodeId: string) => (string | null)} o.typeOf  the catalogue name of a node
 * @param {(line: string, level?: string) => void} [o.log]
 * @param {() => void} [o.onChange]  after a sync made or closed a runtime, so the page redraws its faces
 * @param {{ sharedAudio, claim, release }} o.audio  demo/shell/audio.mjs, handed in so this file imports no browser module
 */
export function createRuntimes({ bay, typeOf, log = () => {}, onChange = () => {}, audio }) {
  const live = new Map();             // nodeId -> { type, rt, bound: [[port, prev]] }
  const told = new Set();
  let ctx = null, bus = null, tap = null, tapBuf = null;
  let queue = Promise.resolve();
  const owner = { stop() { for (const { rt } of live.values()) rt.stop?.(); } };

  const runs = (id) => !!loaderOf(id, typeOf);

  /** RMS of what reaches the speakers now, 0 before any sound. */
  function level() {
    if (!tap) return 0;
    tap.getFloatTimeDomainData(tapBuf);
    let s = 0;
    for (const v of tapBuf) s += v * v;
    return Math.sqrt(s / tapBuf.length);
  }

  // The travel the first runtime this knob reaches gives for a name, for a parameter synth-params.mjs does not know.
  function peerSpec(id, name) {
    for (const l of bay.links()) {
      if (nodeOf(l.from) !== id) continue;
      const s = live.get(nodeOf(l.to))?.rt.spec?.(name);
      if (s) return s;
    }
    return null;
  }
  function peerParam(id, name) {
    for (const l of bay.links()) {
      if (nodeOf(l.from) !== id) continue;
      const v = live.get(nodeOf(l.to))?.rt.param?.(name);
      if (v !== undefined) return v;
    }
    return undefined;
  }

  /** Start the sound: the page's one context, claimed once, every runtime started. On a press only. */
  function wake() {
    if (!ctx) {
      ctx = audio.sharedAudio({ sampleRate: 48000 });
      // One way out for every runtime, with a tap on it, so the level a check
      // reads is what reaches the speakers and not what a link claims.
      bus = ctx.createGain(); bus.connect(ctx.destination);
      tap = ctx.createAnalyser(); tap.fftSize = 2048; tapBuf = new Float32Array(tap.fftSize);
      const sink = ctx.createGain(); sink.gain.value = 0;
      bus.connect(tap); tap.connect(sink); sink.connect(ctx.destination);
      for (const { rt } of live.values()) rt.start?.(ctx, bus);
      route();
    } else audio.sharedAudio({ sampleRate: 48000 });
    audio.claim(owner);
    return ctx;
  }

  function route() {
    if (!ctx) return [];
    const end = (portId) => live.get(nodeOf(portId))?.rt.audio;
    const port = (portId) => portId.split(':')[2];
    // A runtime that brings another site's sound into this tab (the Pi's
    // playout, after Join) is an out like any engine's, whatever carried it.
    const bridged = bay.links().filter((l) => live.get(nodeOf(l.from))?.rt.bridge && bay.port(l.from)?.medium === 'audio');
    return routeAudio({
      edges: [...routes(bay.links()).filter((e) => e.medium === 'audio'), ...bridged],
      out: (p) => end(p)?.out?.(port(p)),
      input: (p) => end(p)?.in?.(port(p)),
      outs: [...live.values()].map(({ rt }) => rt.audio?.out?.('audio-out')),
    });
  }

  async function make(id, mod) {
    const type = typeOf(id);
    // A factory may be async (one that shares an engine module with another type).
    const rt = await mod.make({
      id, type, bay, log,
      send: (p, ev) => bay.send(`${id}:${p}`, ev),
      wake, level, peerParam: (name) => peerParam(id, name), peerSpec: (name) => peerSpec(id, name),
      reroute: () => route(),
      upstream: (p) => { const l = bay.links().find((x) => x.to === `${id}:${p}`); return l ? live.get(nodeOf(l.from))?.rt ?? null : null; },
      downstream: (p) => bay.links().filter((x) => x.from === `${id}:${p}`).map((x) => live.get(nodeOf(x.to))?.rt).filter(Boolean),
    });
    // The last link may have gone while it was being made.
    if (!plan(bay.links(), [], runs).create.includes(id)) { rt.close?.(); return; }
    const bound = [];
    for (const [p, fn] of Object.entries(rt.deliver || {})) {
      const port = bay.port(`${id}:${p}`);
      if (!port) continue;
      bound.push([port, port.deliver]);
      port.deliver = fn;
    }
    live.set(id, { type, rt, bound });
    if (ctx) rt.start?.(ctx, bus);
  }

  function close(id) {
    const e = live.get(id);
    if (!e) return;
    for (const [port, prev] of e.bound) { if (prev) port.deliver = prev; else delete port.deliver; }
    e.rt.close?.();
    live.delete(id);
  }

  // A `patch` transform (bay.mjs) is told to the runtime its link reaches, once per link and runtime,
  // so a runtime made after the link still switches.
  const patched = new Map();          // linkId -> the runtime it was told to
  function choosePatches() {
    const now = new Set();
    for (const l of bay.links()) {
      const name = patchOf(l.transforms);
      if (!name) continue;
      now.add(l.id);
      const rt = live.get(nodeOf(l.to))?.rt;
      if (!rt || patched.get(l.id) === rt) continue;
      patched.set(l.id, rt);
      if (rt.patch) rt.patch(name, l.to.split(':')[2]);
      else log(`${nodeOf(l.to)} runs here and cannot switch to ${name} yet`, 'warn');
    }
    for (const id of [...patched.keys()]) if (!now.has(id)) patched.delete(id);
  }

  async function step() {
    const p = plan(bay.links(), [...live.keys()], runs);
    for (const id of p.close) close(id);
    for (const l of bay.links()) for (const n of [nodeOf(l.from), nodeOf(l.to)]) {
      if (runs(n) || told.has(n)) continue;
      told.add(n);
      log(`${n} is drawn and does not run here yet: ${whyNot(typeOf(n), n)}`);
    }
    const mods = await Promise.all(p.create.map((id) => loaderOf(id, typeOf)().then((m) => [id, m])));
    // A link may have gone while the modules loaded.
    const still = new Set(plan(bay.links(), [], runs).create);
    for (const [id, m] of [...mods.filter(([, m]) => !m.after), ...mods.filter(([, m]) => m.after)]) {
      if (still.has(id) && !live.has(id)) await make(id, m);
    }
    route();
    choosePatches();
    if (p.close.length || p.create.length) onChange();
    if (!live.size && ctx) audio.release(owner);
  }

  /** Bring the runtimes in line with the links. Calls queue, so two quick changes cannot interleave. */
  function sync() {
    queue = queue.then(step).catch((e) => log(`a runtime failed: ${e.message}`, 'bad'));
    return queue;
  }

  return {
    sync, wake, route, level,
    idle: () => queue,
    get: (id) => live.get(id)?.rt ?? null,
    list: () => [...live].map(([id, { type, rt }]) => ({ id, type, rt })),
    context: () => ctx,
  };
}
