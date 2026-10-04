// demo/shell/graph-registry.mjs — who is in the graph right now, from what they
// say about themselves.
//
// 🔴 STEP 3 OF `plans/plan-universal-routing.md`, ASKED 2026-10-04 (*"U iversal
// router demo?"*, then *"Yes"*). Until now `/graph/` drew a desk somebody typed.
// This is how it draws the desk that exists: every machine says what nodes and
// ports it has, in `bay.mjs`'s own shapes, and a page collects what it hears.
//
// ⚠️ PURE AND IMPORT FREE ON PURPOSE. The board imports it directly, and
// `rig/board/push.sh` ships only the `../../demo/shell/` files a board module
// names itself, never their imports.
//
// ON THE WIRE, and nothing new is invented for it:
//   - the board puts `graph` on `board.hello` and on every `board.alive`, so a
//     page that joins late hears it within one five second beat;
//   - a page sends `{ type: 'graph.announce', graph }` for its own nodes;
//   - `{ type: 'graph.ask' }` asks every page to announce again now.
// A graph is `{ v: 1, site, place, net, nodes: [...], ports: [...] }` with ids
// `site:node:port`, exactly what `bay.addNode` and `bay.addPort` take.

export const GRAPH_V = 1;
export const STALE_MS = 15_000;          // three missed board beats

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x';

/**
 * What a Raspberry Pi board is, as a graph. Everything here is something the
 * board already has a verb for; nothing is described that it cannot do.
 * @param {object} o
 * @param {string} o.room        the board's room, which is its site and its place
 * @param {string} [o.net]       the network it is on, if known
 * @param {object} [o.instruments]  `board.hello`'s own map: name -> available
 * @param {Array}  [o.inputs]    `[{ name, channels, midi: { port, channels } | null }]`
 * @param {Array}  [o.alsa]      `alsa.mjs` `addressable()` rows
 * @param {number} [o.frameMs]
 * @param {boolean} [o.gpu]      whether the GPU video path exists here
 */
export function boardGraph({ room, net = null, instruments = {}, inputs = [], alsa = [], frameMs = 20, gpu = true }) {
  const site = room, place = room;
  const nodes = [], ports = [];
  const node = (n, kind, label) => { nodes.push({ id: `${site}:${n}`, kind, label, place, ...(net ? { net } : {}) }); };
  const port = (n, p, o) => { ports.push({ id: `${site}:${n}:${p}`, ...o }); };

  // The synths the board can start. `pappusFx` is an insert on another sound,
  // not a sound of its own, so it is not a node here.
  for (const [k, ok] of Object.entries(instruments)) {
    if (!ok || k === 'pappusFx') continue;
    const n = slug(k);
    node(n, 'engine', k);
    port(n, 'in', { label: k, dir: 'in', medium: 'midi', accepts: ['note', 'cc', 'bend', 'program'], never: [] });
    port(n, 'audio', { label: k, dir: 'out', medium: 'audio', shape: { rate: 48000, channels: 1, frameMs } });
  }
  if (gpu) {
    node('gpu', 'engine', 'GPU');
    port('gpu', 'program', { label: 'GPU', dir: 'in', medium: 'program', shape: { language: 'glsl' } });
    port('gpu', 'video', { label: 'GPU', dir: 'out', medium: 'video', shape: { codec: 'h264' } });
  }
  // A hardware input is an instrument on the desk: its sound comes in through
  // the board's audio interface, and its MIDI goes out through the gate.
  const inputPorts = new Set();
  for (const i of inputs) {
    const n = slug(i.name);
    node(n, 'device', i.name);
    port(n, 'audio', { label: i.name, dir: 'out', medium: 'audio',
      shape: { rate: 48000, channels: 1, frameMs } });
    if (i.midi) {
      inputPorts.add(String(i.midi.port).toLowerCase());
      port(n, 'in', { label: i.name, dir: 'in', medium: 'midi', accepts: ['note', 'cc', 'program'], never: ['sysex'],
        shape: { channels: i.midi.channels } });
    }
  }
  // Every other MIDI device the board sees. A device already described as an
  // input above is not described twice.
  for (const a of alsa) {
    if (a.virtual) continue;
    if (inputPorts.has(String(a.client).toLowerCase())) continue;
    const n = `midi-${slug(a.client)}`;
    if (nodes.some((x) => x.id === `${site}:${n}`)) continue;
    node(n, 'device', a.client);
    port(n, 'out', { label: a.client, dir: 'out', medium: 'midi', emits: ['note', 'cc', 'bend', 'clock'] });
    port(n, 'in', { label: a.client, dir: 'in', medium: 'midi', accepts: ['note', 'cc', 'bend'], never: [] });
  }
  return { v: GRAPH_V, site, place, ...(net ? { net } : {}), nodes, ports };
}

/** Is this a graph this file can read. Answers a reason, or '' when it is. */
export function graphProblem(g) {
  if (!g || typeof g !== 'object') return 'not an object';
  if (g.v !== GRAPH_V) return `version ${g.v} is not ${GRAPH_V}`;
  if (typeof g.site !== 'string' || !g.site) return 'no site';
  if (!Array.isArray(g.nodes) || !Array.isArray(g.ports)) return 'nodes and ports are lists';
  for (const n of g.nodes) if (typeof n?.id !== 'string' || n.id.split(':')[0] !== g.site) return `node ${n?.id} is not on site ${g.site}`;
  for (const p of g.ports) if (typeof p?.id !== 'string' || p.id.split(':').length !== 3 || p.id.split(':')[0] !== g.site) return `port ${p?.id} is not site:node:port on ${g.site}`;
  return '';
}

/**
 * What the pages hear. One announcement per socket, newest wins, and an
 * announcement that has gone quiet for `staleMs` is still listed but marked,
 * because a board that stopped answering is a fact worth drawing.
 */
export function createRegistry({ now = () => Date.now(), staleMs = STALE_MS } = {}) {
  const by = new Map();            // from -> { graph, at }

  /** Read one wire message. Answers true when it changed what is known. */
  function ingest(msg) {
    if (!msg || !msg.from) return false;
    const g = (msg.type === 'board.hello' || msg.type === 'board.alive' || msg.type === 'graph.announce') ? msg.graph : null;
    if (!g) return false;
    if (graphProblem(g)) return false;
    const was = by.get(msg.from);
    const same = was && JSON.stringify(was.graph) === JSON.stringify(g);
    by.set(msg.from, { graph: g, at: now() });
    return !same;
  }
  const forget = (from) => by.delete(from);
  const stale = (e) => now() - e.at > staleMs;
  function graphs() {
    return [...by.entries()].map(([from, e]) => ({ from, site: e.graph.site, at: e.at, stale: stale(e), graph: e.graph }));
  }
  /** Every node and port heard, the freshest announcement per site winning. */
  function merged() {
    const bySite = new Map();
    for (const g of graphs()) {
      const prev = bySite.get(g.site);
      if (!prev || g.at > prev.at) bySite.set(g.site, g);
    }
    const nodes = [], ports = [];
    for (const g of bySite.values()) {
      for (const n of g.graph.nodes) nodes.push({ place: g.graph.place, ...(g.graph.net ? { net: g.graph.net } : {}), ...n, stale: g.stale });
      for (const p of g.graph.ports) ports.push({ ...p, stale: g.stale });
    }
    return { nodes, ports, sites: [...bySite.values()].map((g) => ({ site: g.site, stale: g.stale, from: g.from })) };
  }
  /** Put everything heard into a bay. A fresh bay per call is the caller's job. */
  function fill(bay) {
    const { nodes, ports } = merged();
    for (const n of nodes) bay.addNode({ id: n.id, kind: n.kind, label: n.label, place: n.place, net: n.net });
    for (const p of ports) bay.addPort({ ...p });
    return bay;
  }
  return { ingest, forget, graphs, merged, fill };
}
