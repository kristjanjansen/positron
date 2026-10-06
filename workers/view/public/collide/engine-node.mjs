// demo/collide/engine-node.mjs: a sound engine page as a node on the patchbay.
//
// Step 5 of `plans/plan-routing-migration.md` for an ENGINE page (§2.1: "an
// engine node with a `midi` in port; local only", and for `/collide/` "sclang
// as `program`"). The page stays what it was. What this adds is that, after a
// press of Join, `/patchbay/` can see it and link to it:
//
//   site:<slug>               an `engine` node, place `browser`
//   site:<slug>:midi    in    the notes the engine plays
//   site:<slug>:audio   out   its sound, which travels by `webaudio` only,
//                             because nothing in a browser sends a page's sound
//                             anywhere yet (plan §3.1, no browser PCM sender)
//   site:<slug>:program in    only where the page compiles a program (`collide`)
//   site:<device>:out / :in   this browser's MIDI devices, by `midi-graph.mjs`
//
// It is all one graph on one site, because the registry keeps one graph per
// socket and site and a second graph on the same site would replace the first.
//
// 🔴 A COPY, AND IT SAYS SO. `demo/muta/engine-node.mjs` is the same file
// byte for byte. A page agent may not write `demo/shell/`, so this is reported
// as a kit module waiting to be lifted (`demo/shell/engine-node.mjs`), and a
// lift is a `git mv` of one of the two and a delete of the other.
//
// WHAT A LINK REQUEST GETS, for a port this page owns:
//   device out -> this engine's midi   open: yes once the sound is up, and the
//                                      badge on the panel starts counting that
//                                      device's notes; before, a refusal that
//                                      says a touch starts the sound.
//                                      close: refused in words, because the
//                                      page plays every MIDI input it has and
//                                      `midi.mjs` cannot leave one out.
//   device out -> device in            a real link, run through route-core by
//                                      `midi-graph.mjs`; close releases notes.
//   this engine's audio -> anything    refused: the sound plays here only.
//
// ⚠️ A VISIT OPENS NOTHING. Nothing here runs until `join()`, which a person's
// press of Join calls, or a page's own check pass under `?selfcheck=1`.
// 🔴 AND UNDER `?selfcheck=1` THE ROOM IS A BUS INSIDE THIS TAB, NOT A SOCKET.
// The relay hop is graded by `bay-node-test.mjs` and by `/patchbay/`'s own
// round trip; what this page can get wrong is what it announces and how it
// answers, and an in-tab bus grades both with no socket to anybody's relay.
// The MIDI devices in that pass are two fakes handed to `join({ access })`, so
// the check asks the browser for nothing either.

import { el } from '/shell/shell.mjs';
import { SELFCHECK } from '/shell/selfcheck.mjs';
import { createBayNode, roomFor, randomSite, STUDIO_ROOM } from '/shell/bay-node.mjs';
import { graphProblem } from '/shell/graph-registry.mjs';
import { createMidiGraph } from '/shell/midi-graph.mjs';
import { createLinkBadge, LINK_SAYS } from '/shell/link-badge.mjs';

/**
 * How long a linked keyboard may be quiet before the badge says stalled. Notes
 * are sparse: somebody listening to a held chord is not a stalled link, so this
 * is far longer than the two seconds a picture gets.
 */
export const NOTE_QUIET_MS = 15_000;

/**
 * A room inside this tab, shaped like `openWire`: every message reaches every
 * socket, the sender's own included, as the relay does.
 */
export function createBus() {
  const subs = new Set();
  let n = 0;
  return (room, { onOpen = () => {}, onMessage = () => {} } = {}) => {
    const me = `bus-${++n}`;
    const sub = { onMessage };
    subs.add(sub);
    queueMicrotask(() => { if (subs.has(sub)) onOpen(me); });
    return {
      send(msg) {
        if (!subs.has(sub)) return null;
        const line = JSON.stringify({ ...msg, from: me });
        for (const s of subs) queueMicrotask(() => { if (subs.has(s)) s.onMessage({ kind: 'json', msg: JSON.parse(line) }); });
        return { line, sent: true };
      },
      close() { subs.delete(sub); },
    };
  };
}

/** The one bus every node in this tab rides under `?selfcheck=1`. */
const sharedBus = SELFCHECK ? createBus() : null;

/** Two MIDI devices that are nobody's, for a check: a keyboard and a synth. */
export function fakeMidi() {
  const port = (type, id, name) => Object.assign(new EventTarget(), {
    type, id, name, manufacturer: 'positron', state: 'connected', connection: 'closed',
    open: async () => {}, sent: [], send(bytes) { this.sent.push([...bytes]); },
  });
  const keys = port('input', 'check-keys-in', 'Check keys');
  const synth = port('output', 'check-synth-out', 'Check synth');
  const access = Object.assign(new EventTarget(), {
    inputs: new Map([[keys.id, keys]]), outputs: new Map([[synth.id, synth]]), sysexEnabled: false,
  });
  const play = (bytes) => keys.dispatchEvent(Object.assign(new Event('midimessage'), { data: new Uint8Array(bytes) }));
  return { access, keys, synth, play };
}

/**
 * @param {object} o
 * @param {string} o.slug          the page, which names its site, its node and its room
 * @param {string} o.label         what the patchbay calls the engine
 * @param {string[]} [o.accepts]   the MIDI kinds the engine plays
 * @param {?object} [o.program]    `{ language }` when the page compiles a program
 * @param {Function} o.playing     `() => bool`, the engine is up and makes sound
 * @param {Function} [o.log]       `(line, kind)`
 */
export function createEngineNode({ slug, label = slug, accepts = ['note'], program = null, playing = () => false, log = () => {} }) {
  const ROOM = roomFor({ slug });
  const SITE = randomSite(slug);
  const ENGINE = `${SITE}:${slug}`;
  const MIDI = `${ENGINE}:midi`, AUDIO = `${ENGINE}:audio`, PROGRAM = `${ENGINE}:program`;
  const MEMORY_KEY = `positron.${slug}.midi-ids`;

  const enginePorts = [
    { id: MIDI, label: `${label} notes`, dir: 'in', medium: 'midi', accepts, never: [] },
    { id: AUDIO, label: `${label} sound`, dir: 'out', medium: 'audio', shape: { channels: 2 }, transports: ['webaudio'] },
    ...(program ? [{ id: PROGRAM, label: `${label} program`, dir: 'in', medium: 'program', shape: { language: program.language } }] : []),
  ];

  function remembered() {
    if (SELFCHECK) return [];
    try { const got = JSON.parse(localStorage.getItem(MEMORY_KEY) || '[]'); return Array.isArray(got) ? got : []; } catch { return []; }
  }
  const midi = createMidiGraph({
    site: SITE, place: 'browser', memory: remembered(),
    onRemember: (m) => { if (SELFCHECK) return; try { localStorage.setItem(MEMORY_KEY, JSON.stringify(m)); } catch { /* full, off or private */ } },
    announce: () => publish(),
  });

  /** The page's one graph: the engine, then whatever MIDI devices this browser sees. */
  function graph() {
    const m = midi.graph();
    return { v: 1, site: SITE, place: 'browser',
      nodes: [{ id: ENGINE, kind: 'engine', label, place: 'browser' }, ...m.nodes],
      ports: [...enginePorts, ...m.ports] };
  }

  // ── the badge: notes counted where they arrive, which is here ──────────────
  const linked = new Map();   // device out id -> { port, fn, n }
  function listenTo(id) {
    const port = midi.portOf(id);
    const was = linked.get(id);
    if (was && was.port === port) return;
    if (was?.port) was.port.removeEventListener('midimessage', was.fn);
    const rec = { port, fn: null, n: was?.n ?? 0 };
    if (port) {
      rec.fn = (ev) => { const [st, , v] = ev.data || []; if ((st & 0xf0) === 0x90 && v > 0) rec.n++; };
      port.addEventListener('midimessage', rec.fn);
      try { port.open?.()?.catch?.(() => {}); } catch { /* a port that will not open counts nothing */ }
    }
    linked.set(id, rec);
  }
  /** Notes that reached this page from every linked device, or null while nothing is linked. */
  function heard() {
    if (!linked.size) return null;
    let n = 0;
    for (const id of [...linked.keys()]) { listenTo(id); n += linked.get(id).n; }
    return n;
  }
  /* 🔴 THE BADGE SITS IN A WRAPPER THIS FILE HIDES, BECAUSE `hidden` ON THE
     BADGE ITSELF DRAWS NOTHING AWAY. MEASURED 2026-10-06 by screenshot: the
     kit's badge read `NOT RECEIVING` on a visit with `el.hidden === true`,
     because the presence badge's own `display` beats the browser's `[hidden]`
     (positron-ui, the `[hidden]` and `display` section). A plain span has no
     display rule, so its `hidden` holds, and the checks read the computed
     display rather than the attribute. Reported for `link-badge.mjs`. */
  const badgeBox = el('span', 'pos-engine-badge');
  badgeBox.hidden = true;
  const shown = () => getComputedStyle(badgeBox).display !== 'none' && badgeBox.isConnected;
  const badge = createLinkBadge({ count: heard, stallMs: NOTE_QUIET_MS,
    onChange: (st) => { badgeBox.hidden = st === 'unknown'; } });
  badgeBox.append(badge.el);
  function unlisten() {
    for (const r of linked.values()) r.port?.removeEventListener('midimessage', r.fn);
    linked.clear();
  }

  // ── answering a link request ───────────────────────────────────────────────
  const isDeviceOut = (id) => id.startsWith(`${SITE}:`) && id.endsWith(':out') && !id.startsWith(`${ENGINE}:`);
  const isDeviceIn = (id) => id.startsWith(`${SITE}:`) && id.endsWith(':in') && !id.startsWith(`${ENGINE}:`);
  function onLinkRequest({ source, target, open }) {
    if (source === AUDIO) {
      return { ok: false, why: `the sound of ${label} plays on this machine's speakers, and nothing here sends it anywhere yet` };
    }
    if (isDeviceOut(source) && target === MIDI) {
      if (!open) return { ok: false, why: `every MIDI input on this machine plays ${label}, and leaving one out is not built` };
      if (!midi.present(source)) return { ok: false, why: `${source} is not plugged into this machine now` };
      if (!playing()) return { ok: false, why: `${label} makes no sound until somebody touches its instrument once, because a browser wants a gesture for sound` };
      listenTo(source);
      if (badge.state() === 'unknown') badge.start();
      log(`the patchbay linked ${source} into ${label}`, 'ok');
      return { ok: true, why: `every MIDI input on this machine plays ${label}` };
    }
    if (isDeviceOut(source) && isDeviceIn(target)) {
      const id = `${source}>${target}`;
      if (!open) { const released = midi.unlink(id); log(`unlinked ${source} from ${target}, ${released} messages to let notes go`); return { ok: true, why: '' }; }
      const r = midi.link(source, target, [], { id });
      if (!r.ok) return { ok: false, why: `route-core refused it: ${r.reason}` };
      log(`linked ${source} to ${target} on this machine`, 'ok');
      return { ok: true, why: '' };
    }
    return { ok: false, why: `${label} cannot open ${source} to ${target}` };
  }

  const node = createBayNode({
    room: ROOM, graphs: [graph()], onLinkRequest,
    wire: SELFCHECK ? sharedBus : undefined,
    log: (line, kind) => log(line, kind),
  });
  function publish() { node.setGraphs([graph()]); }

  // ── the control ────────────────────────────────────────────────────────────
  const button = el('button', 'pos-sm', 'Join the patchbay', { type: 'button' });
  button.title = `put ${label} and this browser's MIDI devices on the patchbay in ${ROOM}`;
  const root = el('span', 'pos-engine-node');
  root.append(button, ' ', badgeBox);

  let joined = null, joinedBy = null, asked = 0;
  /**
   * Join the room and put this browser's MIDI devices in the graph.
   * @param {object} [o]
   * @param {?object} [o.access] a MIDIAccess to use instead of asking the browser, for a check
   * @param {string} [o.by]      what joined it, for the check that nothing did on a visit
   */
  function join({ access = null, by = 'a press' } = {}) {
    if (joined) return joined;
    joinedBy = by;
    button.disabled = true;
    const midiReady = (async () => {
      try {
        if (access) midi.attach(access);
        else { asked++; await midi.start({ sysex: false }); }
      } catch (e) { log(`this browser did not give ${label} its MIDI ports: ${e?.message || e}`, 'warn'); }
    })();
    joined = node.join().then(async (from) => {
      await midiReady;
      publish();
      button.textContent = 'On the patchbay';
      log(`${label} is on the patchbay in ${ROOM === STUDIO_ROOM ? 'the studio' : ROOM}, as ${ENGINE}`, 'ok');
      return from;
    });
    return joined;
  }
  function leave() {
    node.leave();
    midi.close();
    unlisten();
    badge.stop();
    joined = null;
    button.disabled = false;
    button.textContent = 'Join the patchbay';
  }
  button.addEventListener('click', () => join());

  /**
   * The checks, for a page's own `?selfcheck=1` pass. `A` is `d.assert`. Needs
   * the engine up for its second half, so a page calls it once the sound is.
   */
  async function check(A) {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const until = async (ok, ms) => { const t0 = performance.now(); while (!ok() && performance.now() - t0 < ms) await sleep(25); return ok(); };
    A(`nothing joined the patchbay before this check, no badge is drawn, and the Join control is outside the row a harness presses`,
      joinedBy === null && !node.joining() && asked === 0 && !button.closest('.pos-controls') && !shown() && button.isConnected,
      `${joinedBy || 'nothing'} joined it, MIDI asked ${asked} times, badge ${shown() ? 'drawn' : 'not drawn'}`);
    A('the harness is in a room of its own, never the studio’s', ROOM !== STUDIO_ROOM, ROOM);

    const fake = fakeMidi();
    await join({ access: fake.access, by: 'the check' });
    // The patchbay's side of it: another node on the same in-tab bus, which asks.
    const peer = createBayNode({ room: ROOM, wire: sharedBus, graphs: [] });
    await peer.join();
    const KEYS = `${SITE}:check-keys:out`, SYNTH = `${SITE}:check-synth:in`;
    const want = [MIDI, AUDIO, ...(program ? [PROGRAM] : []), KEYS, SYNTH];
    const heardAll = await until(() => { const m = peer.registry.merged(); return want.every((id) => m.ports.some((p) => p.id === id && !p.stale)); }, 3000);
    const m = peer.registry.merged();
    const eng = m.nodes.find((n) => n.id === ENGINE);
    A(`once joined, the patchbay hears ${label} as an engine on its own site, notes in and sound out${program ? ' and a program in' : ''}, beside this browser’s MIDI devices`,
      heardAll && graphProblem(graph()) === '' && eng?.kind === 'engine' && eng?.place === 'browser'
        && m.ports.find((p) => p.id === AUDIO)?.transports?.join() === 'webaudio',
      `${want.length - want.filter((id) => !m.ports.some((p) => p.id === id)).length} of ${want.length} ports heard, `
      + `the node a${eng ? `n ${eng.kind} in the ${eng.place}` : 'bsent'}, graph ${graphProblem(graph()) || 'readable'}`);

    const toSpeakers = await peer.request(AUDIO, 'web-0000:screen:audio', true);
    A(`asked to send ${label}’s sound to another page, it refuses in words`,
      toSpeakers?.open === false && /speakers/.test(toSpeakers?.why || ''), toSpeakers?.why ?? 'no answer');

    // A link between two devices of this browser, through route-core.
    fake.play([0x90, 60, 100]);
    await sleep(30);
    const before = fake.synth.sent.length;
    const yes = await peer.request(KEYS, SYNTH, true);
    fake.play([0x90, 62, 100]);
    await sleep(30);
    const through = fake.synth.sent.slice(before);
    const no = await peer.request(KEYS, SYNTH, false);
    const released = fake.synth.sent.slice(before + through.length);
    A('a link between two MIDI devices of this browser carries a note across, which before the link went nowhere, and closing it lets the note go',
      before === 0 && yes?.open === true && through.length === 1 && through[0][0] === 0x90 && through[0][1] === 62
        && no?.open === false && released.some((b) => (b[0] & 0xf0) === 0x80 && b[1] === 62),
      `${before} before, ${JSON.stringify(through)} through, released ${JSON.stringify(released)}`);

    // Into the engine: refused while silent, open once it plays, and the badge counts.
    const wasPlaying = playing();
    const into = await peer.request(KEYS, MIDI, true);
    const badgeAt = badge.says(), hiddenAt = !shown();
    A(`linking a keyboard into ${label} opens once its sound is up, and the badge on the panel says starting before any note`,
      wasPlaying && into?.open === true && badgeAt === LINK_SAYS.coming && !hiddenAt,
      `${wasPlaying ? 'playing' : 'silent'}, ${into?.open ? 'open' : `refused: ${into?.why}`}, badge ${hiddenAt ? 'hidden' : badgeAt}`);
    fake.play([0x90, 64, 90]);
    fake.play([0x80, 64, 0]);
    badge.poll();
    A('a note from that keyboard turns it to receiving, counted where the note arrived',
      badge.says() === LINK_SAYS.online && heard() >= 1, `badge ${badge.says()}, ${heard()} notes`);
    const off = await peer.request(KEYS, MIDI, false);
    A('closing it is refused in words, because this page plays every MIDI input it has',
      off?.open === false && /every MIDI input/.test(off?.why || ''), off?.why ?? 'no answer');

    leave();
    peer.leave();
    A('leaving stops the clock, hides the badge and lets the Join control be pressed again',
      !node.stats().ticking && !shown() && !button.disabled, `ticking ${node.stats().ticking}, badge ${shown() ? 'drawn' : 'not drawn'}`);
  }

  return { el: root, button, badge, join, leave, check, graph, node, midi, room: ROOM, site: SITE,
    ports: { engine: ENGINE, midi: MIDI, audio: AUDIO, program: program ? PROGRAM : null }, joinedBy: () => joinedBy };
}
