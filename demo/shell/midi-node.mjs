// demo/dump/midi-node.mjs: a WebMIDI page as a node on the patchbay, joined on
// a press, with the links another page asks it to open.
//
// 🔴 STEP 5 OF `plans/plan-routing-migration.md`, 2026-10-06, for the four
// WebMIDI device pages: `/circuit/`, `/evo/`, `/twelve/` and `/dump/`. Each
// one already asks for MIDI on a press and listens to every input. What it
// lacked is a way for `/patchbay/` to see this machine's instruments and link
// them, which is plan §3.1's first gap, and `evo:out -> studio-1:circuit:in`
// is `plan-patchbay.md`'s own first demo.
//
// ⚠️ WHY THIS FILE LIVES IN `demo/dump/` AND NOT IN `demo/shell/`. It is
// shared by four pages and belongs in the kit, as `demo/shell/midi-node.mjs`.
// The agent that wrote it was allowed to edit these four page directories and
// nothing in `demo/shell/`, and four copies of one file is the defect CLAUDE.md
// names (*"anything shared is done once"*). Moving it is a `git mv` and four
// import lines; nothing in it depends on where it sits.
//
// WHAT IT DOES, AND WHAT IT LEAVES TO THE PAGE:
//   1  NOTHING ON LOAD. Building it opens no socket and asks for no MIDI.
//      `Join` is a press on its own row, which is NOT `.pos-controls`, so the
//      harness never presses it and no other control's press moves. The page's
//      own check pass grades it through `checkMidiNode`, against a relay that
//      lives in this file, so a run opens no socket to anybody.
//   2  THE ROOM AND THE SITE ARE `bay-node.mjs`'s: `?room=` when given, a
//      private room under the harness, `studio-1` for a person, and a site of
//      this tab's own, `web-<four>`.
//   3  THE DEVICES ARE `midi-graph.mjs`'s, keyed by identity and never by name,
//      announced with `place: 'browser'` because that is what `/patchbay/`
//      reads to send a link out of them back here as `link.request`.
//   4  THE LINKS IT OPENS WHEN ASKED, three kinds and nothing else:
//        local  a device out to a device in on this machine, run through
//               `route-core.mjs` by `midi-graph.mjs`;
//        board  a device out to a board's MIDI in, through `route-core.mjs`
//               with that port's own `accepts` and `never`, sent as the
//               board's `midi.send`, which its gate checks again on the Pi;
//        tap    a device out into `/dump/`'s own sink, counted here.
//      Anything else is refused in words: page to page MIDI over the relay has
//      no opener anywhere yet (plan §3.2).
//   5  A BADGE ONLY WHERE THE FAR SIDE IS COUNTED (`link-badge.mjs`). A board
//      link reads `midi.out` off the board's own `audio.status`; a tap counts
//      what reached this page. A local link has no badge, because the only
//      number there is what this page handed to the browser's `send()`, which
//      is the near side of the cable (CLAUDE.md: a count is only evidence on
//      the far side of the boundary).
//
// ⚠️ THE BOARD SOCKET IS `openers.mjs`'s `boardOn`, the shared one. No opener
// in that file takes a WebMIDI device as a source (`keys` draws its own
// keyboard), so the forwarding is here, and it is the next thing to lift.
// ⚠️ UNDER THE HARNESS A BOARD LINK OPENS ONLY AGAINST A STAND-IN: a `?relay=`
// on this machine (`wire.mjs` `relayOverride`), and `board.mjs` still refuses
// to send anything unless the run also says `board=1`.

import { createBayNode, roomFor, randomSite } from '/shell/bay-node.mjs';
import { createMidiGraph } from '/shell/midi-graph.mjs';
import { KINDS } from '/shell/midi-kinds.mjs';
import { createLinkBadge } from '/shell/link-badge.mjs';
import { createOpeners } from '/shell/openers.mjs';
import { createCore } from '/shell/route-core.mjs';
import { createBay } from '/shell/bay.mjs';
import { boardGraph } from '/shell/graph-registry.mjs';
import { createButtonGroup } from '/shell/button-group.mjs';
import { relayOverride } from '/shell/wire.mjs';
import { SELFCHECK } from '/shell/selfcheck.mjs';
import { el } from '/shell/shell.mjs';

/** Where this browser keeps the ids it gave its devices, so a reload keeps them. */
const MEMORY_KEY = 'positron.midi-graph.ids';
const STAND_IN = () => relayOverride(typeof location !== 'undefined' ? location.search : '');

function readMemory() {
  if (SELFCHECK) return [];
  try { const got = JSON.parse(localStorage.getItem(MEMORY_KEY) || '[]'); return Array.isArray(got) ? got : []; }
  catch { return []; }
}
function keepMemory(entries) {
  if (SELFCHECK) return;
  try { localStorage.setItem(MEMORY_KEY, JSON.stringify(entries.slice(0, 64))); } catch { /* full, off or private */ }
}

/**
 * @param {object} o
 * @param {string} o.slug            the page, which names its private room and its tap
 * @param {Function} [o.log]         `d.log`
 * @param {Function} [o.listen]      `async () => MIDIAccess|null`, the page's own press
 *                                   path, run by Join when the page has no access yet
 * @param {boolean} [o.tap]          announce a sink, `<site>:<slug>:in`, that any of
 *                                   this machine's MIDI outs may be linked into
 * @param {string} [o.room]          `roomFor({ slug })` by default
 * @param {string} [o.site]          `randomSite('web')` by default
 * @param {Function} [o.wire]        `openWire`, replaceable, for `checkMidiNode`
 * @param {boolean} [o.memory]       keep device ids in this browser (never under the harness)
 */
export function createMidiNode({ slug, log = () => {}, listen = null, tap = false, room = roomFor({ slug }),
  site = randomSite('web'), wire = undefined, memory = true } = {}) {
  const TAP = `${site}:${slug}:in`;
  const opened = new Map();                 // `${source} ${target}` -> handle
  const badges = el('span', 'mnode-badges');
  const openers = createOpeners({ log, host: el('div') });

  const tapGraph = () => (tap ? {
    nodes: [{ id: `${site}:${slug}`, kind: 'screen', label: slug, place: 'browser' }],
    ports: [{ id: TAP, label: slug, dir: 'in', medium: 'midi', accepts: [...KINDS], never: [] }],
  } : { nodes: [], ports: [] });
  /** This tab's one graph: its devices, and the tap when it has one. */
  function graph() {
    const g = mg.graph();
    const t = tapGraph();
    return { ...g, nodes: [...g.nodes, ...t.nodes], ports: [...g.ports, ...t.ports] };
  }

  const mg = createMidiGraph({
    site, place: 'browser',
    announce: () => node.setGraphs([graph()]),
    memory: memory ? readMemory() : [],
    onRemember: memory ? keepMemory : () => {},
  });

  const node = createBayNode({
    room, graphs: [graph()], wire,
    log,
    onLinkRequest: (m) => answer(m),
    onJoin: () => { group.enable('join', false, `on the patchbay in ${room}`); group.enable('leave', true); },
  });

  // ── the links ──────────────────────────────────────────────────────────

  function showBadge(h, line) {
    if (typeof h.count !== 'function') return;
    h.badge = createLinkBadge({ count: h.count }).start();
    const wrap = el('span', 'mnode-badge');
    wrap.title = line;
    wrap.append(h.badge.el);
    badges.append(wrap);
    h.badgeWrap = wrap;
  }

  /** A device out into this page's own sink. What arrives here is the far side. */
  function openTap(source) {
    const port = mg.portOf(source);
    if (!port) throw new Error(`${source} is not plugged in here`);
    let n = 0;
    const fn = () => { n++; };
    port.addEventListener?.('midimessage', fn);
    try { port.open?.()?.catch?.(() => {}); } catch { /* a port that will not open delivers nothing */ }
    return { kind: 'tap', count: () => n, close: () => port.removeEventListener?.('midimessage', fn) };
  }

  /**
   * A device out to a board's MIDI in. The board's own gate checks every
   * message again, and its `audio.status` says how many it wrote.
   */
  async function openBoard(source, to) {
    if (SELFCHECK && !STAND_IN()) {
      throw new Error('the harness opens no real stream, and this run has no stand-in board on this machine');
    }
    const port = mg.portOf(source);
    if (!port) throw new Error(`${source} is not plugged in here`);
    const core = createCore();
    core.addPort({ id: 'in', dir: 'in' });
    core.addPort({ id: 'out', dir: 'out', accepts: to.accepts?.length ? to.accepts : undefined,
      policy: Object.fromEntries((to.never || []).map((k) => [k, 'deny'])) });
    // ⚠️ ONTO THE INSTRUMENT'S OWN CHANNEL, as `openers.mjs`'s `keys` does: the
    // MK-425C plays on channel 2 and the board's gate takes only the channels
    // its port names, so a link that passed channels through would be a link
    // the Circuit refused note by note.
    const ops = [{ op: 'channel', to: (to.shape?.channels || [1])[0] }];
    const made = core.link({ id: 'L', from: 'in', to: 'out', ops });
    if (!made.ok) throw new Error(`the routing core refused the link: ${made.reason}`);
    let refused = null, far = null, sent = 0;
    const board = await openers.boardOn(to.address, {
      onMessage: (m) => {
        if (m.type !== 'midi.refused') return;
        if (refused === null) log(`${to.id} refused a message: ${m.why}`, 'warn');
        refused = m.why || 'no reason given';
      },
    });
    const fn = (ev) => {
      const t = Math.round(Number.isFinite(ev.timeStamp) ? ev.timeStamp : performance.now());
      for (const o of core.input({ port: 'in', t, bytes: [...ev.data] })) if (board.send({ type: 'midi.send', bytes: o.bytes })) sent++;
    };
    port.addEventListener?.('midimessage', fn);
    try { port.open?.()?.catch?.(() => {}); } catch { /* */ }
    const poll = async () => {
      const r = await board.ask({ type: 'audio.status' }, 'audio.started', 3000);
      if (Number.isFinite(r?.midi?.out)) far = r.midi.out;
    };
    poll();
    const timer = setInterval(poll, 1000);
    return {
      kind: 'board', board,
      count: () => far,
      sent: () => sent,
      refused: () => refused,
      poll,
      close: () => {
        clearInterval(timer);
        port.removeEventListener?.('midimessage', fn);
        // What the link left sounding is released on the board: note offs, then CC 123.
        for (const o of core.unlink('L', Math.round(performance.now()))) board.send({ type: 'midi.send', bytes: o.bytes });
        board.close();
      },
    };
  }

  function closeOne(key) {
    const h = opened.get(key);
    if (!h) return false;
    h.badge?.stop();
    h.badgeWrap?.remove();
    try { h.close(); } catch { /* already gone */ }
    opened.delete(key);
    log(`${key.replace(' ', ' -> ')} closed`);
    return true;
  }

  /** The answer to a `link.request` for one of this page's ports. */
  async function answer({ source, target, open }) {
    const key = `${source} ${target}`;
    if (!open) { closeOne(key); return { ok: true }; }
    if (opened.has(key)) return { ok: true, why: 'already open' };
    if (!mg.present(source)) return { ok: false, why: `${source} is not plugged in here` };
    let h;
    try {
      if (tap && target === TAP) h = openTap(source);
      else if (node.owns(target)) {
        const r = mg.link(source, target);
        if (!r.ok) return { ok: false, why: `the routing core refused the link: ${r.reason}` };
        h = { kind: 'local', close: () => mg.unlink(r.id) };
      } else {
        const to = node.registry.fill(createBay()).port(target);
        if (!to) return { ok: false, why: `${target} is not on this desk` };
        if (to.medium !== 'midi') return { ok: false, why: `${target} takes ${to.medium}, not MIDI` };
        if (!to.address) return { ok: false, why: `nothing opens MIDI from one page to another yet, so ${target} cannot be reached from here` };
        h = await openBoard(source, to);
      }
    } catch (e) { return { ok: false, why: String(e?.message || e) }; }
    opened.set(key, h);
    showBadge(h, `${source} -> ${target}`);
    log(`${source} -> ${target} opened, asked for by the patchbay`, 'ok');
    return { ok: true };
  }

  // ── the row ────────────────────────────────────────────────────────────

  async function join() {
    if (listen && !access) await listen();
    await node.join();
    log(`on the patchbay in ${room} as ${site}, with ${graph().nodes.length} things on it`, 'ok');
    return node.me();
  }
  function leave() {
    for (const k of [...opened.keys()]) closeOne(k);
    node.leave();
    group.enable('join', true);
    group.enable('leave', false, 'not on the patchbay');
    log(`left ${room}`);
  }
  const group = createButtonGroup({ label: 'patchbay', buttons: [
    { id: 'join', label: `Join ${room}`, onPress: () => join() },
    { id: 'leave', label: 'Leave', onPress: () => leave() },
  ] });
  group.enable('leave', false, 'not on the patchbay');
  // ⚠️ NOT `.pos-controls`. The harness presses that row by position, and this
  // press joins a room, which is `/patchbay/`'s own reason for the same choice.
  const row = el('div', 'mnode');
  row.append(group.el, badges);

  let access = null;
  /** Hand over the page's MIDIAccess once it has one. Announces when joined. */
  function attach(a) {
    if (!a || a === access) return api;
    access = a;
    mg.attach(a);
    node.setGraphs([graph()]);
    return api;
  }

  const api = {
    el: row, node, mg, room, site, tap: tap ? TAP : null,
    graph, attach, join, leave, answer,
    links: () => [...opened.entries()].map(([k, h]) => ({ key: k, kind: h.kind, says: h.badge?.says() ?? null })),
    opened: (key) => opened.get(key) ?? null,
    close: () => { for (const k of [...opened.keys()]) closeOne(k); },
  };
  return api;
}

// ── what `checkMidiNode` grades against, all of it in this file ────────────

/**
 * A relay in memory with `openWire`'s shape, `bay-node-test.mjs`'s own: every
 * message reaches every socket in the room, the sender included, as the real
 * relay echoes. Nothing leaves the tab.
 */
export function loopbackRelay() {
  const rooms = new Map();
  let n = 0;
  function open(room, { onOpen = () => {}, onMessage = () => {} } = {}) {
    const sock = { from: `loop-${++n}`, closed: false, onMessage };
    if (!rooms.has(room)) rooms.set(room, new Set());
    setTimeout(() => { if (!sock.closed) { rooms.get(room).add(sock); onOpen(sock.from); } }, 1);
    return {
      send(msg) {
        if (sock.closed) return null;
        const out = { ...msg, from: sock.from };
        for (const s of rooms.get(room)) setTimeout(() => !s.closed && s.onMessage({ kind: 'json', msg: out }), 1);
        return { sent: true };
      },
      close() { sock.closed = true; rooms.get(room)?.delete(sock); },
    };
  }
  return { open };
}

/**
 * A MIDIAccess with nobody's instrument behind it: `[{ name, manufacturer, input, output }]`.
 * An input has `fire(bytes)`; an output keeps what it was sent in `got`.
 */
export function fakeMidiAccess(devices) {
  const inputs = new Map(), outputs = new Map();
  let n = 0;
  for (const dev of devices) {
    if (dev.input) {
      const ls = new Set();
      const p = { id: `fake-in-${++n}`, name: dev.name, manufacturer: dev.manufacturer || '', state: 'connected', type: 'input',
        addEventListener: (t, f) => { if (t === 'midimessage') ls.add(f); },
        removeEventListener: (t, f) => { if (t === 'midimessage') ls.delete(f); },
        open: async () => p,
        fire: (bytes) => { const ev = { data: Uint8Array.from(bytes), timeStamp: performance.now() }; for (const f of [...ls]) f(ev); },
        listeners: () => ls.size };
      inputs.set(p.id, p);
    }
    if (dev.output) {
      const p = { id: `fake-out-${++n}`, name: dev.name, manufacturer: dev.manufacturer || '', state: 'connected', type: 'output',
        got: [], send: (b) => { p.got.push([...b]); }, open: async () => p };
      outputs.set(p.id, p);
    }
  }
  return { inputs, outputs, sysexEnabled: false, addEventListener() {}, removeEventListener() {} };
}

/** The board's graph as `demo/fake-board.mjs` announces it, typed from that file's own config. */
const STAND_IN_BOARD = () => boardGraph({ room: 'studio-1', gpu: false, frameMs: 20,
  inputs: [{ name: 'circuit', channels: 2, midi: { port: 'Circuit', channels: [1, 2, 10] } }] });

const until = async (ok, ms) => {
  const t0 = performance.now();
  while (!ok() && performance.now() - t0 < ms) await new Promise((r) => setTimeout(r, 40));
  return ok();
};

/**
 * The page's checks about being on the patchbay, written once for the four pages.
 * Called from a page's own `check`, which runs only under `?selfcheck=1`.
 * @param {object} o
 * @param {Function} o.assert  `d.assert`
 * @param {Function} o.log     `d.log`
 * @param {object}   o.page    the page's own `createMidiNode`
 * @param {string}   o.slug
 * @param {boolean} [o.tap]
 */
export async function checkMidiNode({ assert, log, page, slug, tap = false }) {
  // 🔴 THE PAGE'S OWN NODE, which reads state and opens nothing.
  assert('building the page joined no room, the patchbay waits for Join', !page.node.joined() && !page.node.joining(),
    page.node.joining() ? 'a socket is open' : 'no socket');
  assert('this tab is a site of its own, and a harness run is never in the studio’s room',
    /^web-[a-z0-9]{4}$/.test(page.site) && (!SELFCHECK || page.room !== 'studio-1'), `${page.site} in ${page.room}`);
  assert('Join is not in the row the harness presses', !page.el.closest('.pos-controls') && !page.el.querySelector('.pos-controls'));

  // 🔴 A SCRATCH NODE, built the same way, on a relay that lives in this file.
  // A stand-in patchbay hears it, asks for links and gets this page's answers.
  const loop = loopbackRelay();
  const access = fakeMidiAccess([
    { name: 'MK-425C', manufacturer: 'M-Audio', input: true },
    { name: 'Circuit', manufacturer: 'Focusrite A.E. Ltd', input: true, output: true },
  ]);
  const said = [];
  const scratch = createMidiNode({ slug, tap, room: 'loopback', wire: loop.open, memory: false, log: (line) => said.push(line) });
  scratch.attach(access);
  const bayPeer = createBayNode({ room: 'loopback', wire: loop.open });
  await scratch.join();
  await bayPeer.join();
  bayPeer.ask();
  const reg = () => bayPeer.registry.merged();
  await until(() => reg().ports.some((p) => p.id.startsWith(`${scratch.site}:`)), 1500);
  const heard = reg();
  const mine = heard.ports.filter((p) => p.id.startsWith(`${scratch.site}:`));
  const devs = heard.nodes.filter((n) => n.id.startsWith(`${scratch.site}:`) && n.kind === 'device');
  const evoOut = mine.find((p) => p.dir === 'out' && /mk-425c/.test(p.id))?.id;
  const circIn = mine.find((p) => p.dir === 'in' && /circuit/.test(p.id))?.id;
  assert('the patchbay hears this machine’s instruments as devices in a browser, so it asks this page to open them',
    devs.length === 2 && devs.every((n) => n.place === 'browser') && !!evoOut && !!circIn,
    `${devs.map((n) => n.label).join(', ')}, ports ${mine.map((p) => p.id.split(':').slice(1).join(':')).join(', ')}`);

  const ins = [...access.inputs.values()], outs = [...access.outputs.values()];
  const evo = ins.find((p) => p.name === 'MK-425C'), circOut = outs[0];

  // A local link, asked for through the room, carries a note and releases it.
  const r1 = await bayPeer.request(evoOut, circIn, true, { timeoutMs: 800 });
  evo.fire([0x90, 60, 100]);
  const carried = circOut.got.some((b) => b[0] === 0x90 && b[1] === 60);
  const r1off = await bayPeer.request(evoOut, circIn, false, { timeoutMs: 800 });
  const released = circOut.got.some((b) => (b[0] & 0xf0) === 0x80 || ((b[0] & 0xf0) === 0x90 && b[2] === 0))
    && circOut.got.some((b) => (b[0] & 0xf0) === 0xb0 && b[1] === 123);
  assert('a link between two instruments on this machine, asked for by the patchbay, carries a note and lets it go when closed',
    r1?.open === true && carried && r1off?.open === false && released,
    `${r1?.open ? 'opened' : `refused: ${r1?.why}`}, ${circOut.got.length} messages reached the output`);

  // NEGATIVE CONTROLS: a target nobody announced, and a port this page does not have.
  const r2 = await bayPeer.request(evoOut, 'studio-9:nothing:in', true, { timeoutMs: 800 });
  assert('a link to something not on the desk is refused in words', r2?.open === false && /not on this desk/.test(r2.why || ''), r2?.why);
  const r3 = await bayPeer.request('web-zzzz:other:out', circIn, true, { timeoutMs: 600 });
  assert('a request about a port this page does not have is left for its own page, not answered here', r3 === null,
    r3 ? JSON.stringify(r3) : 'unanswered');

  // 🔴 THE PLAN'S FIRST DEMO, `evo:out -> studio-1:circuit:in`. The board's
  // graph is the stand-in's own, as `fake-board.mjs` builds it; under a plain
  // harness run the link is refused, and with a stand-in on this machine
  // (`?relay=` local, and `board=1` so the board module may send) it is opened
  // for real and the board counts what it wrote.
  bayPeer.send({ type: 'board.hello', graph: STAND_IN_BOARD() });
  await until(() => !!scratch.node.registry.fill(createBay()).port('studio-1:circuit:in'), 600);
  const driving = new URLSearchParams(location.search).get('board') === '1';
  if (!STAND_IN()) {
    const r4 = await bayPeer.request(evoOut, 'studio-1:circuit:in', true, { timeoutMs: 1500 });
    assert('under the harness a link to the board’s Circuit is refused in words, because no stand-in board is on this machine',
      r4?.open === false && /no stand-in board/.test(r4.why || ''), r4?.why);
    log('the link to the board was graded as a refusal; a run with a stand-in board grades it for real '
      + '(node demo/fake-board.mjs, then DEMO_QUERY="relay=ws://127.0.0.1:8897&board=1")', 'dim');
  } else if (!driving) {
    log('a stand-in board is on this machine but board=1 is not set, so nothing would be sent to it; left for a run that sets it', 'dim');
  } else {
    // ⚠️ EVERY WAIT HERE IS UNDER 1.6 s AND ENDS IN AN ASSERT. `verify.mjs`
    // stops collecting after 2 s with no new assert, so a longer wait that
    // fails does not go red, it drops every assert after it while the run
    // stays green. MEASURED: a forwarding sabotaged to send nothing read
    // 77/77 with three asserts missing, when the waits here were 6 s.
    const r4 = await bayPeer.request(evoOut, 'studio-1:circuit:in', true, { timeoutMs: 1500 });
    const h = scratch.opened(`${evoOut} studio-1:circuit:in`);
    assert('the board\u2019s Circuit, asked for by the patchbay, is opened by this page on the stand-in board',
      r4?.open === true && !!h, r4?.open ? 'opened' : `refused: ${r4?.why}`);
    // ⚠️ THE BADGE TAKES ITS BASELINE HERE, BEFORE A NOTE IS PLAYED. Its first
    // finite reading is a baseline and never an arrival, so a badge that first
    // read the count after the notes landed would wait for a second batch.
    if (h) { await h.poll(); h.badge.poll(); }
    const before = h?.count();
    for (let i = 0; i < 4; i++) { evo.fire([0x90, 60 + i, 90]); evo.fire([0x80, 60 + i, 0]); }
    const grew = () => Number.isFinite(h?.count()) && h.count() > (before ?? 0) && h.badge.says() === 'receiving';
    const t0 = performance.now();
    while (h && !grew() && performance.now() - t0 < 1500) { await h.poll(); h.badge.poll(); await new Promise((r) => setTimeout(r, 60)); }
    assert('a link to the board\u2019s Circuit carries notes, counted by the board, and its badge says receiving',
      !!h && grew(), h ? `board wrote ${before} then ${h.count()}, this page sent ${h.sent()}, badge ${h.badge.says()}` : 'not open');
    // NEGATIVE CONTROL: the Circuit's port takes notes, controllers and
    // program changes, so a pitch bend stops at this page and the board's
    // count does not move.
    if (h) {
      await h.poll();
      const was = h.count(), sentWas = h.sent();
      for (let i = 0; i < 4; i++) evo.fire([0xe1, 0, 64 + i]);
      await new Promise((r) => setTimeout(r, 300));
      await h.poll();
      assert('a pitch bend the Circuit\u2019s port does not take stops here and the board writes nothing for it',
        h.sent() === sentWas && h.count() === was, `sent ${sentWas} then ${h.sent()}, board ${was} then ${h.count()}`);
    }
    await bayPeer.request(evoOut, 'studio-1:circuit:in', false, { timeoutMs: 1500 });
  }

  if (tap) {
    const r5 = await bayPeer.request(evoOut, scratch.tap, true, { timeoutMs: 800 });
    const h = scratch.opened(`${evoOut} ${scratch.tap}`);
    const quiet = scratch.opened(`${evoOut} ${scratch.tap}`)?.badge?.says();
    for (let i = 0; i < 3; i++) evo.fire([0xb0, 74, 20 * i]);
    await until(() => h?.badge?.says() === 'receiving', 1500);
    assert('a tap on an instrument counts what reaches this page, and its badge goes from starting to receiving',
      r5?.open === true && quiet === 'starting' && h?.count() === 3 && h.badge.says() === 'receiving',
      h ? `${quiet} then ${h.badge.says()}, ${h.count()} arrived` : r5?.why);
  }

  scratch.leave();
  bayPeer.leave();
  assert('leaving closes every link and stops listening to the instruments',
    !scratch.links().length && evo.listeners() === 0, `${scratch.links().length} open, ${evo.listeners()} listening`);
}
