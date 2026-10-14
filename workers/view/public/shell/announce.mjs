// demo/shell/announce.mjs: the one place a page says which nodes it has, to a
// room it is already in.
//
// A page's bay is `web:keys`, `web:synth`, plus whatever it draws of other
// sites (`pi-1:circuit`). What it announces is only its own half, under a site
// of this tab's own (`web-a1b`), in graph-registry.mjs's shape, so /connect/ and
// every other registry in the room can say "this is open somewhere right now".
//
// 🔴 IT NEVER OPENS A SOCKET. `announceOn(board, bay)` rides the board's own
// socket (`createBoard` in board.mjs), which a page opens on a person's press,
// and a page that joins with `createBayNode` already announces through
// `graphs: [...]`. A visit opens nothing (CLAUDE.md).
// ⚠️ UNDER `?selfcheck=` IT SAYS NOTHING unless `?relay=` points at a stand-in
// on this machine, so a check never puts a graph on the real relay.

import { randomSite, REANNOUNCE_MS } from './bay-node.mjs';
import { GRAPH_V, graphProblem } from './graph-registry.mjs';
import { RELAY_BASE, DEFAULT_RELAY } from './wire.mjs';

/** The port fields a reader can use. A function (`deliver`) or a counter never leaves the page. */
const PORT_FIELDS = ['label', 'dir', 'medium', 'shape', 'accepts', 'never', 'emits', 'transports', 'address'];
const plain = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const empty = (v) => v === undefined || (Array.isArray(v) && !v.length)
  || (v && typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length);

/**
 * A page's own nodes and ports as a graph in the registry's shape.
 * @param {object} bay      the page's bay (`createBay`)
 * @param {object} [o]
 * @param {string} [o.from]   the site the page builds its own nodes on, `web`
 * @param {string} [o.site]   the site it announces them as, one per tab
 * @param {string} [o.label]  what a reader calls this site, the page's name
 * @returns {{ graph: object, dropped: string[] }} `dropped` names what did not fit the shape
 */
export function pageGraph(bay, { from = 'web', site = randomSite(), label = 'a page' } = {}) {
  const mine = (id) => String(id).split(':')[0] === from;
  const as = (id) => `${site}:${String(id).split(':').slice(1).join(':')}`;
  const dropped = [];
  const nodes = bay.nodes().filter((n) => mine(n.id))
    .map((n) => ({ id: as(n.id), kind: n.kind, label: n.label ?? n.id.split(':')[1], place: site }));
  const ids = new Set(nodes.map((n) => n.id));
  const ports = [];
  for (const p of bay.ports().filter((q) => mine(q.id))) {
    const id = as(p.id);
    if (id.split(':').length !== 3 || !ids.has(id.split(':').slice(0, 2).join(':'))) { dropped.push(p.id); continue; }
    const out = { id };
    for (const k of PORT_FIELDS) if (!empty(p[k]) && typeof p[k] !== 'function') out[k] = plain(p[k]);
    ports.push(out);
  }
  const graph = { v: GRAPH_V, site, place: site, kind: 'browser', label, nodes, ports };
  const why = graphProblem(graph);
  if (why) throw new Error(`announce: ${why}`);
  return { graph, dropped };
}

/** May this run put a graph on the relay it is pointed at. */
export function mayAnnounce(search = typeof location !== 'undefined' ? location.search : '', relay = RELAY_BASE) {
  const check = ['1', '2'].includes(new URLSearchParams(search).get('selfcheck'));
  return !check || relay !== DEFAULT_RELAY;
}

/**
 * Announce a page's bay on a board's socket while it is open: once on every
 * open (a reconnect is a new `from`), then every `everyMs`. Read again each
 * time, so a node the page adds later is in the next one.
 * ⚠️ IT CANNOT HEAR `graph.ask`, because the board hands its messages to the
 * page; a listener hears this within `everyMs`, inside `STALE_MS`.
 * Stops when the board is closed.
 * @param {{ wire: { state: Function, stats: Function, send: Function }, close: Function }} board
 * @param {object} bay
 * @param {object} [o]  `pageGraph`'s options, plus `everyMs`, `pollMs`, `may`
 */
export function announceOn(board, bay, { everyMs = REANNOUNCE_MS, pollMs = 1000, may = mayAnnounce(), site = randomSite(), ...o } = {}) {
  const counts = { sent: 0, held: 0 };
  let lastFrom = null, lastAt = 0, timer = null;
  function tick() {
    const w = board?.wire;
    if (!w || w.state() !== 1) return;
    const from = w.stats().from;
    if (from === lastFrom && Date.now() - lastAt < everyMs) return;
    lastFrom = from; lastAt = Date.now();
    if (!may) { counts.held++; return; }
    const { graph } = pageGraph(bay, { ...o, site });
    if (w.send({ type: 'graph.announce', graph })?.sent) counts.sent++;
  }
  const stop = () => { clearInterval(timer); timer = null; };
  if (board && board.wire) {
    timer = setInterval(tick, pollMs);
    const close = board.close;
    board.close = (...a) => { stop(); return close?.apply(board, a); };
  }
  return { site, stop, tick, stats: () => ({ ...counts, ticking: timer !== null }) };
}
