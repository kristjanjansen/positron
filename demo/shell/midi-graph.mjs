// demo/shell/midi-graph.mjs: this browser's WebMIDI ports as bay device nodes
// with ids that survive a replug, a graph a page can announce, and links
// between local ports run through `route-core.mjs`.
//
// Step 3 of `plans/plan-routing-migration.md` §4, for the gap its §3.1 names:
// `/patchbay/` announces three ports of its own and none of the MIDI devices
// plugged into the machine it runs on, and eight of the eleven pages that
// should move are WebMIDI pages.
//
// 🔴 A PORT IS KEYED BY IDENTITY, NEVER BY NAME. CoreMIDI renames a held port
// `Circuit` to `Circuit 2` when it is replugged (plan-patchbay §2.3), so a
// name is a label that is allowed to change. Identity follows route-core §3,
// which is RaspiMIDIHub's `device_id.py` (plan-wish-dawless §12), in order:
//   1. a serial, refusing placeholders (a Digitone II ships `000000000001`);
//   2. the port path, which in a browser is the `MIDIPort.id` the browser
//      hands over, unless both sides carry real serials and they differ;
//   3. a soft match on manufacturer, direction and the name with its trailing
//      numbers taken off, ONLY when exactly one remembered port that is not
//      present meets exactly one new port. Two identical units are never
//      guessed between: the second one gets a node of its own, `circuit-2`.
// ⚠️ WebMIDI EXPOSES NO SERIAL. Step 1 reads `serialOf(port)`, which is
// `port.serial` when something put one there and nothing otherwise, so in an
// ordinary browser identity starts at step 2. It is kept so a page that knows
// more (a profile, WebUSB) can say so, and so the rule reads the same here as
// on the Pi and the Pico.
// ⚠️ WHETHER A BROWSER'S `MIDIPort.id` SURVIVES A REPLUG IS NOT MEASURED HERE.
// How each browser derives it was not checked; if it changes, step 3 is what
// keeps the id, and the test drives both cases.
//
// ⚠️ A VISIT OPENS NOTHING. Importing this file and calling `createMidiGraph`
// asks for nothing: MIDI access is requested by `start()`, which a page calls
// from a press, or handed over with `attach(access)` by a page that opened
// MIDI itself. An input gets a listener only while a link starts at it.
//
// ⚠️ IT DOES NOT JOIN A ROOM. It takes a plain `announce(graph)` callback, so
// a page wires it to whatever join helper it uses, and it never sends a graph
// that has not changed (a registry that hears *changed* every beat redraws on
// every beat). `announce()` with no argument sends it again, which is the
// answer to `graph.ask`.
//
// Directions, because the two layers count them from opposite ends:
//   WebMIDI input  (the device sends to us)  bay `site:node:out`, dir 'out',
//                                            route-core dir 'in'
//   WebMIDI output (we send to the device)   bay `site:node:in`,  dir 'in',
//                                            route-core dir 'out'

import { createCore } from './route-core.mjs';
import { KINDS } from './midi-kinds.mjs';

const GRAPH_V = 1;                       // graph-registry.mjs's GRAPH_V, a graph it can read

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'midi';

/**
 * A port name without the numbers a replug or a second unit puts on its end:
 * `Circuit 2`, `Circuit #2`, `Circuit (2)` and `Circuit MIDI 1` all lose them.
 * Taken off repeatedly, so `Circuit MIDI 1 2` is `Circuit MIDI` like its first
 * name was.
 */
export function stemOf(name) {
  let s = String(name || '').trim();
  for (;;) {
    const t = s.replace(/\s*(?:#\s*\d+|\(\s*\d+\s*\)|\d+)$/, '').trim();
    if (t === s || !t) return s;
    s = t;
  }
}

/** A serial that names nobody: empty, all zeros with an optional final 1, or one repeated character. */
export function placeholderSerial(s) {
  const v = String(s ?? '').trim();
  return !v || /^0+1?$/.test(v) || /^(.)\1+$/.test(v);
}

const realSerial = (s) => (placeholderSerial(s) ? null : String(s).trim());

/**
 * @param {object} o
 * @param {string} o.site              the site this tab announces as, `site` in `site:node:port`
 * @param {string} [o.place]           the machine, defaults to the site
 * @param {string} [o.net]
 * @param {Function} [o.announce]      `(graph) => void`, called when the graph changes
 * @param {Function} [o.request]       `(opts) => Promise<MIDIAccess>`; defaults to
 *                                     `navigator.requestMIDIAccess`, read only when `start` runs
 * @param {Function} [o.serialOf]      `(MIDIPort) => string|null`
 * @param {Function} [o.policyFor]     `(entry) => { policy?, rules? }` for a port we send to, a
 *                                     profile's gate (route-core §6); SysEx defaults to confirm
 * @param {Array}    [o.memory]        what `remembered()` answered last time, so ids last a reload
 * @param {Function} [o.onRemember]    `(entries) => void` when that memory changes; a page may
 *                                     keep it in localStorage, inside try/catch
 * @param {Function} [o.now]           ms, for route-core's `thin`
 */
export function createMidiGraph({
  site, place, net = null, announce = () => {}, request = null, serialOf = (p) => p?.serial ?? null,
  policyFor = () => ({}), memory = [], onRemember = () => {}, now = () => Date.now(),
} = {}) {
  if (!site || String(site).includes(':')) throw new Error('midi-graph: a site is a name with no colon in it');
  const core = createCore();
  const entries = [];                     // { slug, dir, serial, path, manufacturer, stem, name }
  const bound = new Map();                // port id -> the MIDIPort it is right now
  const listening = new Map();            // port id -> { port, fn }
  const coreLinks = new Map();            // link id -> { from, to }
  const counts = { in: 0, sent: 0, lost: 0, released: 0 };
  let access = null, sysex = false, lastSent = null, onState = null;

  const portId = (e) => `${site}:${e.slug}:${e.dir}`;
  const kindsFor = () => (sysex ? KINDS : KINDS.filter((k) => k !== 'sysex'));

  function addCorePort(e) {
    const id = portId(e);
    if (e.inCore) return;
    if (e.dir === 'out') core.addPort({ id, dir: 'in' });
    else {
      const prof = policyFor(e) || {};
      core.addPort({ id, dir: 'out', accepts: kindsFor(), policy: prof.policy, rules: prof.rules });
    }
    e.inCore = true;
  }

  for (const m of memory) {
    if (!m || !m.slug || (m.dir !== 'in' && m.dir !== 'out')) continue;
    entries.push({ slug: m.slug, dir: m.dir, serial: realSerial(m.serial), path: m.path ?? null,
      manufacturer: m.manufacturer || '', stem: m.stem ?? stemOf(m.name), name: m.name || m.slug });
  }

  const remembered = () => entries.map(({ slug: s, dir, serial, path, manufacturer, stem, name }) =>
    ({ slug: s, dir, serial, path, manufacturer, stem, name }));

  /**
   * A node slug for a new port: the node of its other half when exactly one is
   * waiting, else a fresh one. ⚠️ THE NAME PAIRS TWO HALVES SEEN AT ONE
   * MOMENT AND NEVER CARRIES AN ID ACROSS TIME. An input and an output called
   * `Circuit 2` by one manufacturer are one device now, which is what CoreMIDI
   * shows; two halves that could both be its partner are not chosen between.
   */
  function slugFor(e) {
    const other = e.dir === 'out' ? 'in' : 'out';
    const waiting = entries.filter((x) => x.dir === other && x.manufacturer === e.manufacturer && x.stem === e.stem
      && !entries.some((y) => y.dir === e.dir && y.slug === x.slug));
    const same = waiting.filter((x) => x.name === e.name);
    if (same.length === 1) return same[0].slug;
    if (!same.length && waiting.length === 1) return waiting[0].slug;
    const base = slug(e.stem || e.name);
    const taken = new Set(entries.map((x) => x.slug));
    if (!taken.has(base)) return base;
    for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
  }

  /** Match this browser's present ports to remembered entries, then make entries for the rest. */
  function resolve(present) {
    const claimed = new Set();
    const result = new Map();             // MIDIPort -> entry
    const un = [];
    // 1 and 2: serial, then path.
    for (const { port, dir } of present) {
      const serial = realSerial(serialOf(port));
      let e = serial && entries.find((x) => !claimed.has(x) && x.dir === dir && x.serial === serial
        && x.manufacturer === (port.manufacturer || ''));
      if (!e && port.id != null) {
        e = entries.find((x) => !claimed.has(x) && x.dir === dir && x.path === port.id
          && !(serial && x.serial && x.serial !== serial));
      }
      if (e) { claimed.add(e); result.set(port, e); } else un.push({ port, dir, serial });
    }
    // 3: the soft match, one remembered absent port to one new port, or nothing.
    const key = (dir, m, s) => `${dir}\u0000${m}\u0000${s}`;
    const groups = new Map();
    for (const u of un) {
      const k = key(u.dir, u.port.manufacturer || '', stemOf(u.port.name));
      groups.set(k, [...(groups.get(k) || []), u]);
    }
    const rest = [];
    for (const [k, us] of groups) {
      const cands = entries.filter((x) => !claimed.has(x) && key(x.dir, x.manufacturer, x.stem) === k
        && !(us[0].serial && x.serial && x.serial !== us[0].serial));
      if (us.length === 1 && cands.length === 1) { claimed.add(cands[0]); result.set(us[0].port, cands[0]); }
      else rest.push(...us);
    }
    // What nothing matched is a device seen for the first time.
    for (const { port, dir, serial } of rest) {
      const e = { dir, serial, path: port.id ?? null, manufacturer: port.manufacturer || '',
        stem: stemOf(port.name), name: port.name || '' };
      e.slug = slugFor(e);
      entries.push(e);
      claimed.add(e);
      result.set(port, e);
    }
    return result;
  }

  function scan() {
    if (!access) return;
    const present = [];
    for (const p of access.inputs?.values?.() ?? []) if (p.state !== 'disconnected') present.push({ port: p, dir: 'out' });
    for (const p of access.outputs?.values?.() ?? []) if (p.state !== 'disconnected') present.push({ port: p, dir: 'in' });
    const before = JSON.stringify(remembered());
    const map = resolve(present);
    bound.clear();
    for (const [port, e] of map) {
      // The path and the label follow the device; the id does not move.
      e.path = port.id ?? e.path;
      e.name = port.name || e.name;
      const s = realSerial(serialOf(port));
      if (s) e.serial = s;
      addCorePort(e);
      bound.set(portId(e), port);
    }
    if (JSON.stringify(remembered()) !== before) onRemember(remembered());
    rebind();
    send(false);
  }

  /** An input listens only while a link starts at it, and on whatever MIDIPort it is now. */
  function rebind() {
    const wanted = new Set([...coreLinks.values()].map((l) => l.from));
    for (const [id, l] of listening) {
      if (!wanted.has(id) || bound.get(id) !== l.port) {
        l.port.removeEventListener?.('midimessage', l.fn);
        listening.delete(id);
      }
    }
    for (const id of wanted) {
      const port = bound.get(id);
      if (!port || listening.has(id)) continue;
      const fn = (ev) => feed(id, ev.data, ev.timeStamp);
      port.addEventListener?.('midimessage', fn);
      // addEventListener does not open a port the way the onmidimessage setter
      // does, so it is opened here, and only here.
      try { port.open?.()?.catch?.(() => {}); } catch { /* a port that will not open delivers nothing */ }
      listening.set(id, { port, fn });
    }
  }

  function deliver(outs) {
    for (const o of outs) {
      const port = bound.get(o.port);
      if (!port || port.state === 'disconnected') { counts.lost++; continue; }
      try { port.send(o.bytes); counts.sent++; } catch { counts.lost++; }
    }
  }

  function feed(id, data, t) {
    counts.in++;
    deliver(core.input({ port: id, t: Number.isFinite(t) ? t : now(), bytes: [...data] }));
  }

  /** The graph as graph-registry.mjs reads it: present devices only. */
  function graph() {
    const nodes = [], ports = [], seen = new Set();
    const kinds = kindsFor();
    const live = entries.filter((e) => bound.has(portId(e)));
    for (const e of live) {
      if (!seen.has(e.slug)) {
        seen.add(e.slug);
        nodes.push({ id: `${site}:${e.slug}`, kind: 'device', label: stemOf(e.name) || e.slug, place: place ?? site, ...(net ? { net } : {}) });
      }
      if (e.dir === 'out') ports.push({ id: portId(e), label: e.name, dir: 'out', medium: 'midi', emits: kinds });
      else ports.push({ id: portId(e), label: e.name, dir: 'in', medium: 'midi', accepts: kinds, never: sysex ? [] : ['sysex'] });
    }
    return { v: GRAPH_V, site, place: place ?? site, ...(net ? { net } : {}), nodes, ports };
  }

  /** Send the graph when it changed, or always when `force`. */
  function send(force) {
    if (!access) return null;
    const g = graph();
    const s = JSON.stringify(g);
    if (!force && s === lastSent) return null;
    lastSent = s;
    announce(g);
    return g;
  }

  /** Use a MIDIAccess the page already has. */
  function attach(a) {
    if (access && onState) access.removeEventListener?.('statechange', onState);
    access = a;
    sysex = !!a?.sysexEnabled;
    onState = () => scan();
    access?.addEventListener?.('statechange', onState);
    // A remembered device that is not plugged in can still be linked, so a
    // saved link is made now and starts delivering when the device returns.
    for (const e of entries) addCorePort(e);
    scan();
    return api;
  }

  /** Ask for MIDI access. Call it from a press: a visit asks for nothing. */
  async function start({ sysex: wantSysex = false } = {}) {
    const ask = request ?? ((o) => globalThis.navigator.requestMIDIAccess(o));
    const a = await ask({ sysex: !!wantSysex });
    return attach(a);
  }

  /**
   * Link two local ports through route-core. `from` is a device's `:out`, `to` a
   * device's `:in`, `ops` route-core's. Answers `{ ok, id }` or `{ ok: false, reason }`
   * with one of route-core's REFUSALS.
   */
  function link(from, to, ops = [], { id = `${from}>${to}` } = {}) {
    const r = core.link({ id, from, to, ops });
    if (!r.ok) return r;
    coreLinks.set(id, { from, to });
    rebind();
    return { ok: true, id };
  }

  /** Remove a link and release what it left sounding: note offs, then CC 123. */
  function unlink(id) {
    if (!coreLinks.has(id)) return 0;
    const outs = core.unlink(id, now());
    coreLinks.delete(id);
    rebind();
    deliver(outs);
    counts.released += outs.length;
    return outs.length;
  }

  /** A person said yes to what is held at a port (a SysEx under `confirm`). */
  function confirm(id) { const outs = core.confirm(id, now()); deliver(outs); return outs.length; }

  /** Stop listening and release every link. MIDI access itself is the page's. */
  function close() {
    for (const id of [...coreLinks.keys()]) unlink(id);
    if (access && onState) access.removeEventListener?.('statechange', onState);
    for (const l of listening.values()) l.port.removeEventListener?.('midimessage', l.fn);
    listening.clear();
    access = null; onState = null; lastSent = null;
  }

  const api = {
    start, attach, graph, link, unlink, confirm, close, remembered,
    announce: () => send(true),
    deny: (id) => core.deny(id),
    held: (id) => core.held(id),
    links: () => [...coreLinks.entries()].map(([id, l]) => ({ id, ...l })),
    listening: () => [...listening.keys()],
    present: (id) => bound.has(id),
    portOf: (id) => bound.get(id) ?? null,
    counts: () => ({ ...counts }),
  };
  return api;
}
