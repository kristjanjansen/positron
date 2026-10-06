// demo/fau/engine-node.mjs: a page that IS a synth, as an engine node /patchbay/ can draw and link.
//
// 🔴 STEP 5 OF `plans/plan-routing-migration.md` FOR THE TWO ENGINE PAGES, 2026-10-06.
// Its §2.1 rows: `/nola/` is *"an engine node with a midi in port; local only"* and
// `/fau/` is *"engine with program and midi in, audio out (univ §3 names it)"*. Both
// pages already play from every MIDI keyboard on the machine through `createMidi`.
// This module adds the half that was missing: the page says what it is to the room,
// so `/patchbay/` can draw the engine and the keyboards beside it, and a person
// there can say WHICH keyboard plays it.
//
// ⚠️ IT LIVES IN `demo/fau/` AND `/nola/` IMPORTS IT FROM HERE, which is a stopgap
// and not a design. Two copies of one join rule is the defect `bay-node.mjs` was
// written to end, so there is one copy; its home is `demo/shell/engine-node.mjs`,
// which the agent that wrote this was not allowed to create. Moving it is a
// `git mv` and two import lines.
//
// WHAT IT DECIDES:
//   1  NOTHING ON LOAD. Building it opens no socket and asks for no MIDI.
//      `join()` does both, and a page calls it from the Join press or from its
//      own check pass. A visit opens nothing.
//   2  THE ROOM AND THE SITE ARE `bay-node.mjs`'s: `?room=`, the run's own room
//      under the harness, `studio-1` for a person, and a site of this tab's own.
//   3  ONE GRAPH, ONE SITE: the engine node and this browser's MIDI devices
//      (`midi-graph.mjs`) on the same site, so a link from a keyboard here to the
//      engine here is a link between two of this page's own ports, and this page
//      is the one `bay-node.mjs` hands the `link.request` to.
//   4  LOCAL ONLY. The audio out says `transports: ['webaudio']`, so the bay
//      refuses to carry it off the machine in words. Nothing here sends a sound,
//      a note or a program anywhere: a request for that is refused in words.
//   5  OMNI UNTIL PATCHED. With no link open the engine plays every MIDI input,
//      which is what both pages did before this file existed and is still what a
//      visitor who never presses Join gets. Once a link is open the engine plays
//      ONLY the linked keyboards, and when the last one closes it goes back to
//      all of them. Every switch lets go of every note first, because a
//      keyboard that stops being heard mid-note would leave that note held.
//
// 🔴 THE BADGE COUNTS ON THE FAR SIDE. What it counts is MIDI messages that
// reached this engine through an open link, counted in the handler that hands
// them to the page's own note functions: the engine is the far side of that
// link. A press of Open only makes it `starting`.
// ⚠️ ITS STALL WINDOW IS NOT THE PICTURE'S TWO SECONDS. A keyboard rests between
// phrases; two seconds of nobody playing is not a stalled link. `MIDI_STALL_MS`
// is thirty seconds, which still turns a link to an unplugged keyboard grey.
//
// ⚠️ WHAT IS NOT MEASURED: whether a second `MIDIAccess` in one tab (the one
// `midi-graph.mjs` asks for at Join, beside the one `createMidi` asked for)
// delivers every message to both. Chrome's WebMIDI hands each access its own
// port objects; no device was plugged in when this was written, so the linked
// path has run only against the stand-in access in the page's check pass.

import { openWire } from '../shell/wire.mjs';
import { createBayNode, roomFor, randomSite } from '../shell/bay-node.mjs';
import { createMidiGraph } from '../shell/midi-graph.mjs';
import { createLinkBadge } from '../shell/link-badge.mjs';
import { graphProblem } from '../shell/graph-registry.mjs';

/** A keyboard rests between phrases, so a MIDI link is called stalled only after this. */
export const MIDI_STALL_MS = 30_000;
/** What the engine's MIDI in takes: what both pages' handlers act on. */
export const ENGINE_TAKES = ['note', 'cc', 'program'];

/**
 * The same five lines `createMidi` dispatches with (`demo/shell/midi.mjs`), for a
 * message that arrived on ONE linked port. ⚠️ A SECOND COPY OF A DISPATCH, which
 * that module warns against, kept because `createMidi` exports no decoder and says
 * nothing about which port a message came from. Velocity 0 is a note off.
 * @returns {string|null} what it was, or null for a kind the engine ignores
 */
export function dispatchMidi(data, ts, h) {
  const [st, a, b] = data;
  const kind = st & 0xf0, ch = st & 0x0f;
  if (kind === 0x90 && b > 0) { h.onDown?.(a, b, ch, ts); return 'note'; }
  if (kind === 0x80 || (kind === 0x90 && b === 0)) { h.onUp?.(a, ch, ts); return 'note'; }
  if (kind === 0xb0) { h.onControl?.(a, b, ch, ts); return 'cc'; }
  if (kind === 0xc0) { h.onProgram?.(a, ch, ts); return 'program'; }
  return null;
}

/**
 * @param {object} o
 * @param {string} o.slug        the page, `nola` or `fau`: the node's name and the site's prefix
 * @param {string} o.label       what a person reads on the patchbay
 * @param {boolean} [o.program]  whether the engine takes a `program` in (fau: its Faust text)
 * @param {object} o.handlers    `{ onDown, onUp, onControl, onProgram }`, the page's own,
 *                               the same ones it hands `createMidi`
 * @param {Function} [o.allOff]  let go of every note, called on every switch between omni and patched
 * @param {Function} [o.log]
 * @param {string} [o.search]    the query string, for a test
 * @param {Function} [o.badge]   `createLinkBadge`, replaceable for a test with no document
 * @param {Function} [o.request] `requestMIDIAccess`, replaceable for a test
 */
export function createEngineNode({
  slug, label, program = false, handlers = {}, allOff = () => {}, log = () => {},
  search, badge: makeBadge = createLinkBadge, request = null,
} = {}) {
  const room = roomFor({ slug, ...(search !== undefined ? { search } : {}) });
  const site = randomSite(slug);
  const P = {
    midi: `${site}:${slug}:midi`,
    audio: `${site}:${slug}:audio`,
    ...(program ? { program: `${site}:${slug}:program` } : {}),
  };
  const counts = { linked: 0, dropped: 0, asked: 0, refused: 0, midiAsked: 0, switches: 0 };
  const links = new Map();              // device out port id -> { port, fn, n }
  let wireFn = openWire;
  let midiStarted = false;

  /** The engine's own node and ports, which exist whether or not MIDI was ever asked for. */
  function engineGraph() {
    const nodes = [{ id: `${site}:${slug}`, kind: 'engine', label, place: site }];
    const ports = [
      { id: P.midi, label: `${label} keys`, dir: 'in', medium: 'midi', accepts: ENGINE_TAKES, never: ['sysex'] },
      { id: P.audio, label: `${label} sound`, dir: 'out', medium: 'audio', transports: ['webaudio'] },
    ];
    if (P.program) ports.push({ id: P.program, label: `${label} program`, dir: 'in', medium: 'program' });
    return { v: 1, site, place: site, nodes, ports };
  }

  const mg = createMidiGraph({
    site,
    announce: () => publish(),
    request: request ?? ((o) => { counts.midiAsked++; return globalThis.navigator.requestMIDIAccess(o); }),
  });

  /** The engine and every present MIDI device, as one graph on one site. */
  function graph() {
    const e = engineGraph();
    if (!midiStarted) return e;
    const m = mg.graph();
    return { ...e, nodes: [...e.nodes, ...m.nodes], ports: [...e.ports, ...m.ports] };
  }

  /* A linked port is listened to on whatever MIDIPort it is NOW, so a replug
     that hands the device a new object keeps the link delivering. */
  function rebind() {
    for (const [id, l] of links) {
      const port = mg.portOf(id);
      if (port === l.port) continue;
      l.port?.removeEventListener?.('midimessage', l.fn);
      l.port = port;
      if (port) {
        port.addEventListener?.('midimessage', l.fn);
        try { port.open?.()?.catch?.(() => {}); } catch { /* a port that will not open delivers nothing */ }
      }
    }
  }

  function publish() {
    rebind();
    node.setGraphs([graph()]);
  }

  const badge = makeBadge({ count: () => counts.linked, stallMs: MIDI_STALL_MS });

  function openLink(source) {
    if (links.has(source)) return { ok: true, why: 'already open' };
    const was = links.size;
    const l = { port: null, n: 0, fn: null };
    l.fn = (ev) => {
      const what = dispatchMidi(ev.data, ev.timeStamp, handlers);
      if (what) { counts.linked++; l.n++; } else counts.dropped++;
    };
    links.set(source, l);
    rebind();
    if (was === 0) { allOff(); counts.switches++; badge.start(); }
    log(`${source.split(':')[1]} plays ${label} now, and every other MIDI input is ignored until the link closes`);
    return { ok: true };
  }
  function closeLink(source) {
    const l = links.get(source);
    if (!l) return { ok: true, why: 'it was not open' };
    l.port?.removeEventListener?.('midimessage', l.fn);
    links.delete(source);
    if (links.size === 0) {
      allOff(); counts.switches++; badge.stop();
      log(`no link into ${label} is open, so every MIDI input plays it again`);
    }
    return { ok: true };
  }

  /** Another page asked for a link out of one of this page's own ports. */
  function onLinkRequest({ source, target, open }) {
    counts.asked++;
    const no = (why) => { counts.refused++; return { ok: false, why }; };
    if (source === P.audio) return no(`the sound of ${label} is heard in the tab that makes it, and nothing here carries it off this machine yet`);
    if (target !== P.midi) {
      return no(`a MIDI device on this machine is linked only to ${label} on this page, and nothing here sends it anywhere else`);
    }
    if (!open) return closeLink(source);
    if (!mg.present(source)) return no(`${source} is not plugged into this machine now`);
    return openLink(source);
  }

  const node = createBayNode({
    room, graphs: [engineGraph()], onLinkRequest, log,
    wire: (r, o) => wireFn(r, o),
  });

  /**
   * Join the room: ask for MIDI (unless `access` is handed over), announce, answer.
   * Call it from a press or from a check, never from a page's top level.
   * @param {object} [o]
   * @param {object} [o.access] a MIDIAccess already in hand, a stand-in for a check
   * @param {Function} [o.wire] `openWire`'s shape, an in-memory relay for a check
   */
  async function join({ access = null, wire = null } = {}) {
    if (wire) wireFn = wire;
    if (!midiStarted) {
      try {
        if (access) mg.attach(access); else await mg.start();
        midiStarted = true;
      } catch (e) {
        log(`MIDI was not opened for the patchbay (${e?.message || e}), so only ${label} itself is announced`, 'warn');
      }
    }
    node.setGraphs([graph()]);
    return node.join();
  }

  /** Leave the room and close every link, which hands the engine back to every input. */
  function leave() {
    for (const id of [...links.keys()]) closeLink(id);
    node.leave();
    // MIDI goes with the room, so the next Join asks again rather than reusing a stand-in.
    if (midiStarted) { mg.close(); midiStarted = false; }
  }

  return {
    room, site, ports: P, node, badge, graph, join, leave, onLinkRequest,
    /** Whether `createMidi`'s every-input path may play: true until a link is open. */
    omni: () => links.size === 0,
    joined: () => node.joined(),
    joining: () => node.joining(),
    links: () => [...links].map(([id, l]) => ({ id, n: l.n, listening: !!l.port })),
    counts: () => ({ ...counts }),
    problem: () => graphProblem(graph()),
    midiStarted: () => midiStarted,
    midiGraph: mg,
  };
}

/**
 * The Join press and the badge, as one inline group a page puts on its own panel.
 * ⚠️ NOT IN `.pos-controls`: the harness presses that row by position, and this
 * press joins a room. The check pass joins its own in-memory room explicitly.
 * 🔴 THE BADGE IS IN A WRAPPER, AND THE WRAPPER IS WHAT IS HIDDEN. `.pos-pres` is
 * `display: inline-flex`, which beats the browser's own `[hidden]`, and
 * `shell.css` has no `.pos-pres[hidden]` rule, so `link-badge.mjs` setting
 * `hidden` on it changed an attribute and left the badge drawn. A plain span has
 * no author `display`, so its `hidden` is the browser's and it works.
 */
export function createEngineUi(engine, { el, log = () => {} }) {
  const root = el('span', 'eng-bay');
  /* 🔴 ONE WORD, AND THE ROOM IN THE HOVER. `Join studio-1` wrapped to three
     lines on the keyboard's foot at 375 px, photographed, and a label never
     wraps. The log says the room the moment it is joined. */
  const btn = el('button', 'pos-sm', 'Join');
  btn.type = 'button';
  btn.title = `join ${engine.room} as ${engine.site}, so /patchbay/ can link a keyboard to it`;
  const wrap = el('span', 'eng-bay-badge');
  wrap.append(engine.badge.el);
  const sync = () => { wrap.hidden = engine.badge.state() === 'unknown'; };
  sync();
  const timer = setInterval(sync, 250);
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    await engine.join();
    log(`on the patchbay in ${engine.room} as ${engine.site}, and a keyboard linked to it there plays it alone`);
  });
  root.append(btn, wrap);
  return { el: root, button: btn, wrap, sync, stop: () => clearInterval(timer) };
}

/**
 * An in-memory relay with `openWire`'s shape, so a page's check pass can make the
 * round trip with no socket at all. The same shape `bay-node-test.mjs` grades with.
 */
export function memoryRelay() {
  const rooms = new Map();
  let n = 0;
  function open(room, { onOpen = () => {}, onMessage = () => {} } = {}) {
    const sock = { from: `m${++n}`, closed: false, onMessage };
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
  return { open, inRoom: (room) => rooms.get(room)?.size || 0 };
}

/**
 * A MIDIAccess with keyboards that are nobody's, for a check. `emit(i, bytes)`
 * is a key pressed on input `i`, delivered to every listener the way a browser does.
 */
export function standInAccess(names = ['Stand-in keys']) {
  const inputs = new Map();
  names.forEach((name, i) => {
    const ls = new Set();
    inputs.set(`stand-in-${i}`, {
      id: `stand-in-${i}`, name, manufacturer: 'positron', state: 'connected', type: 'input',
      addEventListener: (t, f) => { if (t === 'midimessage') ls.add(f); },
      removeEventListener: (t, f) => { if (t === 'midimessage') ls.delete(f); },
      open: () => Promise.resolve(),
      emit: (bytes) => { for (const f of [...ls]) f({ data: Uint8Array.from(bytes), timeStamp: globalThis.performance?.now?.() ?? 0 }); },
      listeners: () => ls.size,
    });
  });
  return {
    inputs, outputs: new Map(), sysexEnabled: false,
    addEventListener: () => {}, removeEventListener: () => {},
    emit: (i, bytes) => inputs.get(`stand-in-${i}`).emit(bytes),
    input: (i) => inputs.get(`stand-in-${i}`),
  };
}
