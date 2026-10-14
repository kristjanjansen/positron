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
// A graph is `{ v: 1, site, place, net, kind, label, nodes: [...], ports: [...] }`
// with ids `site:node:port`, exactly what `bay.addNode` and `bay.addPort` take.
//
// `kind` and `label` say what a SITE is, since 2026-10-09 (plans/plan-site-names.md,
// finishing plan-patchbay.md §2.1). Both are optional and `v` stays 1: a board
// still running an older copy of this file sends neither, and a reader then
// falls back to guessing from `place`. Neither ever changes an id.
// ⚠️ "you" IS NEVER SENT. A row is "you" when its site equals the reader's own,
// so a label saying it would be wrong on every other screen.

export const GRAPH_V = 1;
/**
 * 🔴 THE PI'S SITE IS `pi-1`, NOT ITS ROOM, SINCE 2026-10-10
 * (plans/plan-site-names.md §0, §4b). Until then the site WAS the room, so every
 * id read `studio-1:...` and nothing in it said Raspberry Pi. The ROOM is still
 * `studio-1`: it is where the board's socket lives and every `address` below
 * still names it, so no stream moved. A second board is `pi-2`, set on the
 * board with `--site` or `BOARD_SITE` (`rig/board/board.mjs`).
 * ⚠️ A page names a Pi port through this constant, never by gluing the room
 * onto a port name: `${ROOM}:yoshimi:in` was how five pages did it, and that is
 * exactly the coupling the rename broke.
 */
export const BOARD_SITE = 'pi-1';
/** A port on the Pi, `pi-1:<node>:<medium>-<dir>`. */
export const boardPort = (node, name, site = BOARD_SITE) => `${site}:${node}:${name}`;

/** What a site may say it is. Absent is allowed; anything else is refused. */
export const SITE_KINDS = ['board', 'browser', 'store', 'node', 'mac', 'service'];
/** Three missed board beats. `bay.mjs` imports this one number since
 *  2026-10-06, so a port goes stale to the bay and to the registry together. */
export const STALE_MS = 15_000;

/**
 * 🔴 HOW THE BOARD'S STREAMS REALLY TRAVEL, AS `bay.mjs` PORT `transports`,
 * SINCE 2026-10-06 (plans/plan-routing-migration.md §3.2, stage plan F1 and
 * F2). The board's sound is relay PCM, or a data channel once a page goes
 * direct (`board.mjs` `goDirect`); its picture is relay H.264 decoded with
 * WebCodecs, never WHEP. Without this the bay chose WHEP for the board's video
 * from the table, and a page that dispatches on the session's transport would
 * have nothing to open it with.
 * ⚠️ THE PI ANNOUNCES WHAT ITS OWN COPY OF THIS FILE SAYS, and a change here
 * reaches it only by `rig/board/push.sh`. Until then a board graph arrives
 * without `transports`, so `withBoardTransports` fills them in on ingest, from
 * this one table, and a graph that already says something keeps what it says.
 */
export const BOARD_TRANSPORTS = { audio: ['relay', 'datachannel'], video: ['relay-h264'] };
export function withBoardTransports(g) {
  if (!g || !Array.isArray(g.ports)) return g;
  let changed = false;
  const ports = g.ports.map((p) => {
    if (p?.dir !== 'out' || p.transports || !BOARD_TRANSPORTS[p.medium]) return p;
    changed = true;
    return { ...p, transports: [...BOARD_TRANSPORTS[p.medium]] };
  });
  return changed ? { ...g, ports } : g;
}

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x';

/**
 * 🔴 THE JACK PORTS BEHIND A BOARD'S AUDIO PORTS, SINCE 2026-10-11
 * (plans/plan-nodes-revisited.md §3 item 3, the bay half). A bay port is a
 * SOUND and the transport is how it travels: `pi-1:yoshimi:audio-out` is
 * Yoshimi, and it reaches a page over the relay and reaches the granulator over
 * JACK. So the port keeps its id and its relay address, and gains a `jack` list
 * naming the JACK ports it is on the board's graph. Nothing was renamed, which
 * is the answer to §5 item 5 that breaks no page.
 * ⚠️ NAMED HERE ONCE, because the page that resolves a link and the board that
 * applies it have to agree on them, and this is the one file both import. The
 * board's own chain (`jacksynth.mjs`) names the same strings for the same ports.
 * ⚠️ AN INPUT ON JACK IS ITS ONE TAKEN CHANNEL. The Circuit is plugged into
 * input 1 of a stereo interface and input 2 carries only that input's noise
 * (`inputs.mjs` `takeChannel`), so `circuit` is `circuit:capture_1` and nothing
 * else.
 */
export const JACK_ENDS = {
  // `yoshimi: ['yoshimi:left', 'yoshimi:right']` until 2026-10-13, when Yoshimi
  // left the board (archive/yoshimi/README.md says how to bring it back).
  // The board's SuperCollider sampler (`rig/board/scsampler.mjs`), a scsynth of
  // its own whose JACK client is named so it is never taken for the
  // granulator's `SuperCollider`.
  sampler: ['possampler:out_1', 'possampler:out_2'],
  // The page programs' scsynth (`rig/board/scollide.mjs`, `ENGINES.own`), a
  // third server named so it is taken for neither of the two above.
  collide: ['poscollide:out_1', 'poscollide:out_2'],
  pappusIn: ['SuperCollider:in_1', 'SuperCollider:in_2'],
  pappusOut: ['SuperCollider:out_1', 'SuperCollider:out_2'],
  capture: ['posboard:input_1'],
};
/** The JACK port a hardware input lands on: `alsa_in -j <name>` registers `<name>:capture_N`. */
export const inputJack = (name, take = 1) => [`${name}:capture_${take}`];

/**
 * One bay link between two JACK lists, as JACK rows. Pure.
 *
 * 🔴 STEREO, DECIDED 2026-10-11 (the owner: *"Dunno stereo"*): ONE BAY LINK IS
 * ONE WIRE ON THE PICTURE AND RESOLVES TO AS MANY JACK ROWS AS THE TWO ENDS
 * NEED, by the one rule this board already measured honest:
 *   - the same count each side: channel to channel (Yoshimi into the granulator);
 *   - one input: every channel SUMS into it, which is how the capture has been
 *     mono-sum since 2026-09-13 (mono-left read 1661 Hz where the sum read 2029);
 *   - one output: it feeds every input (the Circuit, mono, into both of the
 *     granulator's inputs, so its right side is not starved);
 *   - anything else, two into three, has no honest pairing and is refused.
 * The rows ride on the session (`bay.mjs`), so a reader is told what one wire
 * means before it is made.
 */
export function jackRows(from, to) {
  const a = Array.isArray(from) ? from : [], b = Array.isArray(to) ? to : [];
  if (!a.length || !b.length) {
    return { ok: false, rows: [], why: `${!a.length ? 'the source' : 'the destination'} is not on the board's JACK graph` };
  }
  if (a.length === b.length) {
    return { ok: true, rows: a.map((f, i) => ({ from: f, to: b[i] })),
             says: a.length === 1 ? 'one channel' : `${a.length} channels, one to one` };
  }
  if (b.length === 1) return { ok: true, rows: a.map((f) => ({ from: f, to: b[0] })), says: `${a.length} channels summed into one` };
  if (a.length === 1) return { ok: true, rows: b.map((t) => ({ from: a[0], to: t })), says: `one channel into all ${b.length}` };
  return { ok: false, rows: [], why: `${a.length} channels into ${b.length} has no one way to pair them` };
}

/**
 * What a Raspberry Pi board is, as a graph. Everything here is something the
 * board already has a verb for; nothing is described that it cannot do.
 * @param {object} o
 * @param {string} o.room        the board's room, which is its place and the
 *   address of its streams. Not its site since 2026-10-10.
 * @param {string} [o.site]      the board's site, `BOARD_SITE` unless a second
 *   board says otherwise.
 * @param {string} [o.net]       the network it is on, if known
 * @param {object} [o.instruments]  `board.hello`'s own map: name -> available
 * @param {Array}  [o.inputs]    `[{ name, channels, midi: { port, channels } | null }]`
 * @param {Array}  [o.alsa]      `alsa.mjs` `addressable()` rows
 * @param {number} [o.frameMs]
 * @param {boolean} [o.gpu]      whether the GPU video path exists here (`video.mjs`
 *   `videoAvailable()`). The flag keeps its name; the NODE it announces is
 *   `shader` since 2026-10-14, see below.
 * @param {boolean} [o.camera]   whether the board has a camera it will send
 *   (`camera.mjs`: a key set AND `findCamera()` found one). Off by default.
 * @param {string} [o.label]     the human name a reader shows for this site.
 *   A fixed 'Raspberry Pi' rather than the board's hostname, because the
 *   hostname is `raspberrypi` on every fresh Pi OS (`board.mjs`, `NAME`).
 * @param {boolean} [o.jack]     the board has a JACK graph and announces its
 *   JACK ends: a `jack` list on Yoshimi's audio out and on every input that is
 *   on JACK (`i.jack`), and, where the granulator is installed, the granulator
 *   and the capture as nodes of their own. Off by default, so a page building a
 *   board graph to test against gets exactly the graph it always got.
 */
export function boardGraph({ room, site = BOARD_SITE, net = null, instruments = {}, inputs = [], alsa = [], frameMs = 20, gpu = true, camera = false, label = 'Raspberry Pi', jack = false }) {
  const place = room;
  // Port names are `<medium>-<dir>` (plans/plan-site-names.md §4c), so the id
  // says what a port carries and which way. `graphProblem` holds a board to it.
  const nodes = [], ports = [];
  const node = (n, kind, label) => { nodes.push({ id: `${site}:${n}`, kind, label, place, ...(net ? { net } : {}) }); };
  const port = (n, p, o) => { ports.push({ id: `${site}:${n}:${p}`, ...o }); };

  // The synths the board can start. `pappusFx` is an insert on another sound,
  // not a sound of its own, so it is not a node here.
  for (const [k, ok] of Object.entries(instruments)) {
    if (!ok || k === 'pappusFx' || k === 'collide') continue;
    const n = slug(k);
    node(n, 'engine', k);
    // A synth lives in the board's MAIN room: `audio.start` and `note.on` go
    // there, and its sound comes back down the same socket.
    port(n, 'midi-in', { label: k, dir: 'in', medium: 'midi', accepts: ['note', 'cc', 'bend', 'program'], never: [], address: room });
    const j = jack && JACK_ENDS[k] ? JACK_ENDS[k] : null;
    port(n, 'audio-out', { label: k, dir: 'out', medium: 'audio', shape: { rate: 48000, channels: 1, frameMs }, address: room,
      transports: [...BOARD_TRANSPORTS.audio, ...(j ? ['jack'] : [])], ...(j ? { jack: [...j] } : {}) });
    // The sampler plays recordings the board fetches itself (from R2, kept on
    // the SD card), so it is the one engine with a `file` end. Drawn as a fact:
    // the board does the fetch, nothing flows over this port from a page.
    if (k === 'sampler') port(n, 'file-in', { label: k, dir: 'in', medium: 'file', address: room });
  }
  // 🔴 THE GRANULATOR AND THE CAPTURE, AS JACK ENDS, SINCE 2026-10-11. Both
  // travel by JACK and nothing else, so a link from either to a page is refused
  // in words by the bay rather than opened. The capture is what the board's
  // main room HEARS: `posboard:input_1`, whose stream reaches pages as
  // whichever engine is running (`${site}:<engine>:audio-out`); it was Yoshimi's
  // until 2026-10-13 (plans/plan-nodes-revisited.md §3 item 3).
  // ⚠️ THE SHAPE SAYS THE RATE ONLY. The channel count of a JACK end is the
  // length of its `jack` list, and a relay stream's `channels: 1` beside a
  // granulator's two would refuse the link that is the whole point.
  if (jack && instruments.pappusFx) {
    node('pappus', 'engine', 'Granulator');
    port('pappus', 'audio-in', { label: 'Granulator', dir: 'in', medium: 'audio', shape: { rate: 48000 },
      transports: ['jack'], jack: [...JACK_ENDS.pappusIn] });
    port('pappus', 'audio-out', { label: 'Granulator', dir: 'out', medium: 'audio', shape: { rate: 48000 },
      transports: ['jack'], jack: [...JACK_ENDS.pappusOut] });
  }
  if (jack) {
    node('capture', 'endpoint', 'Pi capture');
    port('capture', 'audio-in', { label: 'Pi capture', dir: 'in', medium: 'audio', shape: { rate: 48000 },
      transports: ['jack'], jack: [...JACK_ENDS.capture] });
  }
  // 🔴 A NODE KEEPS ITS CATALOGUE NAME ON EVERY SITE, AND ONLY THE SITE PREFIX
  // CHANGES, SINCE 2026-10-14 (the owner: *"Perhaps shader is better than gpu?
  // Should also match web:shader?"*). So the board's nodes below are named and
  // ported as `demo/shell/nodes.mjs` NODES has them on `web`: `collide`,
  // `drums` (the catalogue's `drum` type, one node for the kit), `shader`,
  // `camera`. A port the Pi lacks is left out rather than faked.
  //
  // SUPERCOLLIDER, `scollide.mjs` (the page programs' scsynth, `poscollide`),
  // announced while `collideAvailable()` says scsynth, sclang, jackd and the
  // limiter are all there. It is ONE engine with two nodes over it, because two
  // pages play it two ways: /remote/collide/ sends notes (`note.on {node:
  // 'collide'}`) and parameters (`sc.set`), /drums/remote/ sends timed hits
  // (`sc.hit`). Both sounds come back on the board's main stream and leave the
  // engine on the same two JACK ports, so a JACK link from either node carries
  // whatever the engine is playing.
  if (instruments.collide) {
    const j = jack ? JACK_ENDS.collide : null;
    const sound = (n, l) => port(n, 'audio-out', { label: l, dir: 'out', medium: 'audio', shape: { rate: 48000, channels: 1, frameMs },
      address: room, transports: [...BOARD_TRANSPORTS.audio, ...(j ? ['jack'] : [])], ...(j ? { jack: [...j] } : {}) });
    node('collide', 'engine', 'SuperCollider');
    port('collide', 'midi-in', { label: 'SuperCollider', dir: 'in', medium: 'midi', accepts: ['note'], never: [], address: room });
    port('collide', 'value-in', { label: 'SuperCollider', dir: 'in', medium: 'value', shape: { of: 'param' }, address: room });
    sound('collide', 'SuperCollider');
    node('drums', 'engine', 'drums');
    port('drums', 'midi-in', { label: 'drums', dir: 'in', medium: 'midi', accepts: ['note'], never: [], address: room });
    sound('drums', 'drums');
  }
  // THE SHADER, `video.mjs`: `rig/vis/v3dpipe` renders the mirror shader on the
  // VideoCore GPU and the hardware encoder sends it as H.264. `gpu` until
  // 2026-10-14. `value-in` is `video.params` (the page's `segments` is the
  // board's `mirrors`), `program-in` is `video.shader`, compiled here as 310 es.
  // The picture leaves on `<room>-video` or on the main socket's direct `vid`
  // channel (`board.mjs` `videoDirect`, since 2026-10-13).
  if (gpu) {
    node('shader', 'engine', 'mirror shader');
    port('shader', 'value-in', { label: 'mirror shader', dir: 'in', medium: 'value', shape: { of: 'param', names: ['segments'] }, address: room });
    port('shader', 'program-in', { label: 'mirror shader', dir: 'in', medium: 'program', shape: { of: 'glsl' }, address: room });
    port('shader', 'video-out', { label: 'mirror shader', dir: 'out', medium: 'video', shape: { codec: 'h264' }, address: `${room}-video`,
      transports: [...BOARD_TRANSPORTS.video, 'datachannel'] });
  }
  // THE CAMERA, `camera.mjs`: a CSI or USB camera on the board, sent only to a
  // holder of the key, in `<room>-cam` (keyed by the relay) or on an input's
  // direct `cam` channel. The board says `camera` only when it holds a key AND
  // found a camera, so a board without one announces none.
  if (camera) {
    node('camera', 'device', 'camera');
    port('camera', 'video-out', { label: 'camera', dir: 'out', medium: 'video', shape: { codec: 'h264' }, address: `${room}-cam`,
      transports: [...BOARD_TRANSPORTS.video, 'datachannel'] });
  }
  // A hardware input is an instrument on the desk: its sound comes in through
  // the board's audio interface, and its MIDI goes out through the gate.
  const inputPorts = new Set();
  for (const i of inputs) {
    const n = slug(i.name);
    node(n, 'device', i.name);
    // The address is the room the board's input really streams into, which
    // `rig/board/inputs.mjs` names `<room>-<input>`.
    // An input on JACK (`BOARD_INPUTS` `via: "jack"`) is also its taken channel
    // on the board's graph, so it can be linked inside the Pi.
    const j = jack && i.jack ? inputJack(i.name, i.take ?? 1) : null;
    port(n, 'audio-out', { label: i.name, dir: 'out', medium: 'audio',
      shape: { rate: 48000, channels: 1, frameMs }, address: `${room}-${i.name}`,
      transports: [...BOARD_TRANSPORTS.audio, ...(j ? ['jack'] : [])], ...(j ? { jack: j } : {}) });
    if (i.midi) {
      inputPorts.add(String(i.midi.port).toLowerCase());
      port(n, 'midi-in', { label: i.name, dir: 'in', medium: 'midi', accepts: ['note', 'cc', 'program'], never: ['sysex'],
        shape: { channels: i.midi.channels }, address: `${room}-${i.name}` });
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
    port(n, 'midi-out', { label: a.client, dir: 'out', medium: 'midi', emits: ['note', 'cc', 'bend', 'clock'] });
    port(n, 'midi-in', { label: a.client, dir: 'in', medium: 'midi', accepts: ['note', 'cc', 'bend'], never: [] });
  }
  return { v: GRAPH_V, site, place, ...(net ? { net } : {}), kind: 'board', label, nodes, ports };
}

/**
 * 🔴 ONE ANNOUNCED BOARD NODE, DRAWN ON A PAGE'S OWN BAY, SINCE 2026-10-14.
 * A page that plays the Pi draws the Pi's node from `boardGraph()` rather than
 * typing it, so the node, its ports and their order are the ones the board
 * announces, and /connect/ and the live layer see the same thing the page draws.
 * Pure, and it imports nothing: it only calls the bay it is given.
 * @param {object} bay      the page's bay (`createBay`)
 * @param {object} g        a board graph, `boardGraph({...})` or one heard on the wire
 * @param {string} name     the node's name on the board, `collide`
 * @param {object} [o]
 * @param {string} [o.label]    the page's own label for the node, the board's when absent
 * @param {object} [o.deliver]  `{ '<port>': fn }`, what this page does with an event on that port
 * @param {object} [o.ports]    `{ '<port>': { ...fields } }` merged over the announced port, for
 *   what only the page knows (the parameter names of the program it loaded)
 * @param {string|null} [o.portLabel]  `'node:port'` (the default) labels each port `<node>:<port>`,
 *   as `nodes.mjs` `addNodes` does; null keeps the board's label
 * @param {boolean} [o.withPorts]  false adds the node alone, for a page whose
 *   picture order puts another node between it and its ports (`addBoardPorts`)
 * @returns the bay's node, or null when the graph has no such node
 */
export function addBoardNode(bay, g, name, { label, withPorts = true, ...o } = {}) {
  const n = g.nodes.find((x) => x.id === `${g.site}:${name}`);
  if (!n) return null;
  const node = bay.addNode({ ...n, ...(label ? { label } : {}) });
  if (withPorts) addBoardPorts(bay, g, name, o);
  return node;
}
/** The ports of one announced board node, as `addBoardNode` adds them. Answers the ids added. */
export function addBoardPorts(bay, g, name, { deliver = {}, ports = {}, portLabel = 'node:port' } = {}) {
  const id = `${g.site}:${name}`;
  return g.ports.filter((q) => q.id.split(':').slice(0, 2).join(':') === id).map((p) => {
    const pname = p.id.split(':')[2];
    return bay.addPort({ ...p, ...(portLabel ? { label: `${name}:${pname}` } : {}), ...(ports[pname] || {}),
      ...(deliver[pname] ? { deliver: deliver[pname] } : {}) }).id;
  });
}

/** Is this a graph this file can read. Answers a reason, or '' when it is. */
export function graphProblem(g) {
  if (!g || typeof g !== 'object') return 'not an object';
  if (g.v !== GRAPH_V) return `version ${g.v} is not ${GRAPH_V}`;
  if (typeof g.site !== 'string' || !g.site) return 'no site';
  if (g.kind !== undefined && !SITE_KINDS.includes(g.kind)) return `kind ${g.kind} is not one of ${SITE_KINDS.join(', ')}`;
  if (g.label !== undefined && typeof g.label !== 'string') return 'label is not a string';
  if (!Array.isArray(g.nodes) || !Array.isArray(g.ports)) return 'nodes and ports are lists';
  for (const n of g.nodes) if (typeof n?.id !== 'string' || n.id.split(':')[0] !== g.site) return `node ${n?.id} is not on site ${g.site}`;
  for (const p of g.ports) if (typeof p?.id !== 'string' || p.id.split(':').length !== 3 || p.id.split(':')[0] !== g.site) return `port ${p?.id} is not site:node:port on ${g.site}`;
  // A board's port name starts with its own medium and direction, so a name and
  // its fields cannot disagree (plans/plan-site-names.md §4c). ⚠️ BOARDS ONLY
  // for now: browser pages and the store still announce `keys:out` and
  // `history:in`, and holding them to it would refuse every one of them.
  if (g.kind === 'board') {
    for (const p of g.ports) {
      const want = `${p.medium}-${p.dir}`, name = p.id.split(':')[2];
      if (name !== want && !name.startsWith(`${want}-`)) return `port ${p.id} is named ${name}, and a ${p.medium} ${p.dir} on a board is named ${want}`;
    }
  }
  return '';
}

/**
 * What the pages hear. One announcement per socket AND SITE, newest wins, and
 * an announcement that has gone quiet for `staleMs` is still listed but marked,
 * because a board that stopped answering is a fact worth drawing.
 * 🔴 KEYED BY SOCKET AND SITE SINCE 2026-10-06 (plan-routing-migration §3.3,
 * stage plan F3). It was one graph per socket, so a page that is two sites (a
 * patchbay and the store it writes to, the stage and its fixed input) could
 * only ever be one of them: its second announce replaced its first in every
 * registry in the room.
 * ⚠️ `merged` STILL KEEPS THE FRESHEST PER SITE ACROSS SOCKETS, which is why
 * every page now takes a random site of its own (`bay-node.mjs`): two visitors
 * announcing one site still overwrite each other, by design, because one site
 * is one thing.
 */
export function createRegistry({ now = () => Date.now(), staleMs = STALE_MS } = {}) {
  const by = new Map();            // `${from} ${site}` -> { from, graph, at }

  /** Read one wire message. Answers true when it changed what is known. */
  function ingest(msg) {
    if (!msg || !msg.from) return false;
    const board = msg.type === 'board.hello' || msg.type === 'board.alive';
    let g = (board || msg.type === 'graph.announce') ? msg.graph : null;
    if (!g) return false;
    if (graphProblem(g)) return false;
    if (board) g = withBoardTransports(g);
    const key = `${msg.from} ${g.site}`;
    const was = by.get(key);
    const same = was && JSON.stringify(was.graph) === JSON.stringify(g);
    by.set(key, { from: msg.from, graph: g, at: now() });
    return !same;
  }
  /** Forget a socket, every site it announced, or one site of it when `site` is given. */
  function forget(from, site = null) {
    let gone = false;
    for (const [k, e] of by) if (e.from === from && (site == null || e.graph.site === site)) { by.delete(k); gone = true; }
    return gone;
  }
  const stale = (e) => now() - e.at > staleMs;
  function graphs() {
    return [...by.values()].map((e) => ({ from: e.from, site: e.graph.site, at: e.at, stale: stale(e), graph: e.graph }));
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
    // `kind` and `label` are passed through as the site said them, and are
    // undefined when it said nothing, so a reader can tell "no claim" apart.
    return { nodes, ports, sites: [...bySite.values()].map((g) => ({ site: g.site, stale: g.stale, from: g.from,
      kind: g.graph.kind, label: g.graph.label })) };
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
