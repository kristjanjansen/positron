// demo/fau/engine-node.mjs: a synth page as an engine node (midi in, audio out, program in for fau).
// Nothing on load: join() opens the socket and asks for MIDI. Omni until a link is open, then only
// linked keyboards; every switch calls allOff. Audio is webaudio only, MIDI_STALL_MS is 30 s.
// See lessons/page-fau.md#fau-2

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
 * The dispatch `createMidi` uses (demo/shell/midi.mjs), for a message on ONE linked port,
 * because createMidi exports no decoder. Velocity 0 is a note off.
 * @returns {string|null} what it was, or null for a kind the engine ignores
 * See lessons/page-fau.md#fau-3
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
 * The Join press and the badge, as one inline group. Not in `.pos-controls`, which the harness
 * presses by position. The badge sits in a plain span that is hidden, because `.pos-pres` is
 * inline-flex and that beats the browser's own `[hidden]`.
 * See lessons/page-fau.md#fau-4
 */
export function createEngineUi(engine, { el, log = () => {} }) {
  const root = el('span', 'eng-bay');
  /* One word, the room in the hover: a label never wraps at 375 px.
     See lessons/page-fau.md#fau-5 */
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
