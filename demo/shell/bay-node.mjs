// demo/shell/bay-node.mjs: a page as a node on the patchbay, joined on a press.
//
// 🔴 STEP 1 OF `plans/plan-routing-migration.md`, 2026-10-06. Three pages joined
// a relay room, announced a graph, answered `graph.ask` and traded
// `link.request` for `link.state`, each with its own hand copy of the same
// thirty lines (`/patchbay/`, and `/partitur/`'s SCORE and WALL tabs). The copies
// disagreed about the one thing that matters most:
//
//   🔴 `/patchbay/` JOINED `studio-1` ON LOAD AND IGNORED `?room=`, so every
//   visit AND EVERY SUITE RUN put a `web` site on the owner's desk and asked the
//   Pi `graph.ask` (plan §3.4, the stage plan's F6). `/partitur/` had been fixed
//   for exactly this on 2026-10-05 and the patchbay had not. A rule in three
//   copies is a rule that holds in two of them.
//
// WHAT THIS MODULE DECIDES, SO NO PAGE HAS TO:
//   1  THE ROOM (`roomFor`). `?room=` when the page has one, which is what
//      `demo/verify.mjs` hands every run; under `?selfcheck=1` with no `?room=`
//      a private room of the run's own, never `studio-1`; a person gets
//      `studio-1`. A harness that forgets to pass a room still cannot reach the
//      owner's desk.
//   2  A SITE PER TAB (`randomSite`). `merged()` keeps the freshest graph per
//      site, so two visitors announcing one site overwrite each other in every
//      registry in the room. Harmless while every `web` graph was identical,
//      and wrong the moment a page announces its own MIDI devices (plan §3.1).
//   3  NOTHING ON LOAD. `createBayNode` opens no socket. `join()` does, and a
//      page calls it from a press or from its own check pass, never from its
//      top level (`tab-page.mjs` rule 1, CLAUDE.md: a visit opens nothing).
//   4  WHAT A NODE SAYS ONCE JOINED: every own graph on every open (a reconnect
//      is a new `from`, so it is a new announce), an answer to every
//      `graph.ask`, again every `REANNOUNCE_MS` so a page that joins late hears
//      it without asking, and a `link.state` for every `link.request` about one
//      of its own ports, refusing in words when the page has no handler.
//
// ⚠️ IT DOES NOT IMPORT `selfcheck.mjs`, ON PURPOSE. That module reads
// `location` at load, which node does not have, and this file is graded by
// `node demo/shell/bay-node-test.mjs` with a fake relay. The rule is the same
// one, read from the same query string: `selfcheck=1` or `selfcheck=2`.
// ⚠️ AND THE SOCKET IS INJECTED (`wire`), for the same test. A page leaves it.

import { openWire } from './wire.mjs';
import { createRegistry, STALE_MS } from './graph-registry.mjs';

/** The Raspberry Pi's address, the discovery bus and the scene bus at once (plan §3.4). */
export const STUDIO_ROOM = 'studio-1';
/** Under `STALE_MS` with room for one lost beat, so a joined page never reads as stale. */
export const REANNOUNCE_MS = 10_000;
/** How long a `link.request` waits for its `link.state` before it is called unanswered. */
export const REQUEST_MS = 8_000;
/** The relay's own rule for a room name (`workers/relay/src/index.js`). */
export const ROOM_RE = /^[a-zA-Z0-9_-]{1,64}$/;

const rand = (n) => Math.random().toString(36).slice(2, 2 + n).padEnd(n, '0');
const searchNow = () => (typeof location !== 'undefined' ? location.search : '');
const isSelfcheck = (search) => ['1', '2'].includes(new URLSearchParams(search).get('selfcheck'));

/* One private room per slug per page, so every tab of one page that asks lands
   in the same one: `/partitur/`'s SCORE and WALL meet there. */
const privateRooms = new Map();

/**
 * The room a page joins.
 * @param {object} [o]
 * @param {string} [o.slug]    the page's name, which a private room starts with
 * @param {string} [o.search]  the query string, `location.search` by default
 * @param {boolean} [o.selfcheck] read from `search` by default
 * @returns {string}
 * ⚠️ A `?room=` THE RELAY WOULD REFUSE IS IGNORED rather than passed on, because
 * an upgrade the relay refuses reads as a dead relay to a browser, which cannot
 * see the status of a refused WebSocket.
 */
export function roomFor({ slug = 'page', search = searchNow(), selfcheck = isSelfcheck(search) } = {}) {
  const asked = new URLSearchParams(search).get('room');
  if (asked && ROOM_RE.test(asked)) return asked;
  if (!selfcheck) return STUDIO_ROOM;
  if (!privateRooms.has(slug)) privateRooms.set(slug, `${slug}-test-${rand(6)}`);
  return privateRooms.get(slug);
}

/** `web-ab12`: a site of this tab's own, new on every load. */
export function randomSite(prefix = 'web') {
  return `${prefix}-${rand(4)}`;
}

/**
 * A page as a node: its graphs, its room, its registry, and the verbs.
 * @param {object} o
 * @param {string} o.room          from `roomFor`
 * @param {object[]} [o.graphs]    this page's own graphs, ANNOUNCED. One per site.
 * @param {object[]} [o.local]     graphs this page keeps to itself, in its own
 *                                 registry only, never sent to the room
 * @param {Function} [o.onLinkRequest] `({ source, target, open, from }) => { ok, why }`
 *                                 or a promise of it, for a port on one of this
 *                                 page's own sites. Absent, the answer is a refusal.
 * @param {Function} [o.onGraph]   `(msg)` when the registry changed
 * @param {Function} [o.onMessage] `(msg)` every other JSON message from another socket
 * @param {Function} [o.onJoin]    `(from)` on every open, a reconnect included
 * @param {Function} [o.log]       `(line, kind)`
 * @param {Function} [o.wire]      `openWire`, replaceable for a test
 * @param {number} [o.reannounceMs]
 */
export function createBayNode({
  room, graphs = [], local = [], onLinkRequest = null, onGraph = () => {}, onMessage = () => {},
  onJoin = () => {}, log = () => {}, wire: openSocket = openWire, reannounceMs = REANNOUNCE_MS,
  registry = createRegistry(),
} = {}) {
  if (!room || !ROOM_RE.test(room)) throw new Error(`bay-node: a room is ${ROOM_RE}, not ${JSON.stringify(room)}. Ask roomFor().`);
  let own = [...graphs], mineLocal = [...local];
  let socket = null, me = null, joining = null, timer = null;
  const pending = new Map();            // `${source} ${target}` -> resolve
  const counts = { announced: 0, asked: 0, answered: 0, requests: 0 };

  const sites = () => new Set([...own, ...mineLocal].map((g) => g.site));
  /** Is this port on one of this page's own sites. */
  const owns = (portId) => sites().has(String(portId || '').split(':')[0]);

  /** Put this page's own graphs in its own registry again, so they are never drawn stale. */
  function refresh() {
    for (const g of [...own, ...mineLocal]) registry.ingest({ type: 'graph.announce', from: 'self', graph: g });
  }
  refresh();

  function send(msg) {
    if (!socket || !me) return false;
    return !!socket.send(msg);
  }
  function announce() {
    if (!me) return 0;
    for (const g of own) { send({ type: 'graph.announce', graph: g }); counts.announced++; }
    refresh();
    return own.length;
  }
  function ask() {
    if (!me) return false;
    counts.asked++;
    return send({ type: 'graph.ask' });
  }

  async function answer(m) {
    let r;
    try {
      r = onLinkRequest ? await onLinkRequest({ source: m.source, target: m.target, open: !!m.open, from: m.from })
        : { ok: false, why: `nothing on this page opens ${m.source} when another page asks, because a person here opens it` };
    } catch (e) { r = { ok: false, why: String(e?.message || e) }; }
    counts.answered++;
    send({ type: 'link.state', source: m.source, target: m.target, open: !!m.open && !!r?.ok, why: r?.why || '', to: m.from });
  }

  function heard(got) {
    if (got.kind !== 'json' || !got.msg) return;
    const m = got.msg;
    if (m.from === me) return;
    if (m.type === 'graph.ask') { announce(); onMessage(m); return; }
    if (m.type === 'link.request') {
      // Only about one of this page's own ports. Another page's port is that
      // page's to answer, and two answers to one request is a race.
      if (owns(m.source)) answer(m);
      return;
    }
    if (m.type === 'link.state') {
      const key = `${m.source} ${m.target}`;
      const resolve = pending.get(key);
      if (resolve) { pending.delete(key); resolve(m); }
      onMessage(m);
      return;
    }
    if (registry.ingest(m)) { onGraph(m); return; }
    onMessage(m);
  }

  /** Join the room. Answers this socket's `from` once it is open. Calling it twice joins once. */
  function join() {
    if (joining) return joining;
    joining = new Promise((resolve) => {
      socket = openSocket(room, {
        onOpen: (from) => {
          me = from;
          announce();
          ask();
          onJoin(from);
          resolve(from);
        },
        onMessage: heard,
      });
    });
    // ⚠️ THE INTERVAL STARTS WITH THE JOIN AND STOPS WITH THE LEAVE, so an
    // unjoined page has no timer saying anything to anybody.
    clearInterval(timer);
    timer = setInterval(announce, reannounceMs);
    log(`joining ${room}`);
    return joining;
  }

  /** Leave the room. What other sockets said is forgotten, because nobody is listening for it now. */
  function leave() {
    clearInterval(timer);
    timer = null;
    try { socket?.close(); } catch { /* already gone */ }
    socket = null; me = null; joining = null;
    for (const resolve of pending.values()) resolve(null);
    pending.clear();
    for (const g of registry.graphs()) if (g.from !== 'self') registry.forget(g.from);
  }

  /**
   * Ask the page that owns `source` to open or close a link, and wait for its
   * `link.state`. Answers that message, or null when nobody answered in time.
   */
  function request(source, target, open = true, { timeoutMs = REQUEST_MS } = {}) {
    return new Promise((resolve) => {
      if (!me) { resolve(null); return; }
      const key = `${source} ${target}`;
      pending.get(key)?.(null);
      pending.set(key, resolve);
      counts.requests++;
      send({ type: 'link.request', source, target, open: !!open });
      setTimeout(() => { if (pending.get(key) === resolve) { pending.delete(key); resolve(null); } }, timeoutMs);
    });
  }

  /** Replace this page's own graphs and say so to the room. */
  function setGraphs(next = own, nextLocal = mineLocal) {
    const gone = [...own, ...mineLocal].map((g) => g.site).filter((s) => ![...next, ...nextLocal].some((g) => g.site === s));
    for (const s of gone) registry.forget('self', s);
    own = [...next]; mineLocal = [...nextLocal];
    refresh();
    announce();
  }

  return {
    room, registry, join, leave, send, announce, ask, request, setGraphs, refresh, owns,
    me: () => me,
    joined: () => !!me,
    joining: () => !!joining,
    sites: () => [...sites()],
    graphs: () => [...own],
    /** What it has said, and whether its clock is running, which only a join starts. */
    stats: () => ({ ...counts, ticking: timer !== null }),
    staleMs: STALE_MS,
  };
}
