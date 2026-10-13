// demo/shell/graph-registry-test.mjs: what a board says it is, and what a page
// makes of hearing it, with no board, no socket and no browser.
//
//   node demo/shell/graph-registry-test.mjs
//
// Step 3 of `plans/plan-universal-routing.md`. `boardGraph` is the board's half
// and `createRegistry` is the page's half, and both are pure, so the whole round
// trip from the board's own state to a bay that refuses a bad link runs here.
//
// MOST OF THESE ARE NEGATIVE CONTROLS, for the reason `bay-test.mjs` gives: a
// validator that returns '' unconditionally passes every positive check, and a
// registry that keeps everything it hears passes every one too. 20 of the 46
// asserts below are named NEGATIVE CONTROL and each one has to see something
// refused, skipped or left out.
//
// 🔴 PROVED BY BREAKING `graph-registry.mjs` ON A SCRATCH COPY, ONE FAULT AT A
// TIME, against 46 green (2026-10-04):
//
//   sabotage                                        red
//   graphProblem skips the site check on nodes      1 of 46
//   ingest answers true for a repeat of one graph   1 of 46
//   an input's MIDI in has `never: []`              1 of 46
//   an input's ALSA client described again          1 of 46
//   the OLDEST announcement per site wins           2 of 46
//
// ⚠️ EVERY ROW IS RED BY ITS OWN NAMED ASSERT, and one is enough for the second
// row because it is the one a page's redraw hangs off: a registry that says
// *changed* every five seconds redraws `/graph/` on every beat and nobody sees
// why.

import { boardGraph, graphProblem, createRegistry, GRAPH_V, STALE_MS, BOARD_TRANSPORTS, withBoardTransports, SITE_KINDS, BOARD_SITE, boardPort, jackRows, JACK_ENDS } from './graph-registry.mjs';
import { createBay } from './bay.mjs';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? ' | ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' | ' + detail : ''}`); }
};

// The board on the desk: what `board.hello` sends for instruments, the
// HANDOFF's BOARD_INPUTS, and `addressable()` over the aconnect fixture.
const INSTRUMENTS = { synth: true, pappusFx: true, collide: true, zynaddsubfx: false };
const INPUTS = [{ name: 'circuit', channels: 2, midi: { port: 'Circuit', channels: [1, 2, 10] } }];
const ALSA = [
  { addr: '20:0', client: 'Circuit', port: 'Circuit MIDI 1', virtual: false },
  { addr: '24:0', client: 'MicroFreak', port: 'MicroFreak MIDI 1', virtual: false },
  { addr: '28:0', client: 'Digitakt', port: 'Digitakt MIDI 1', virtual: false },
  { addr: '32:0', client: 'Virtual Raw MIDI 1-0', port: 'VirMIDI 1-0', virtual: true },
  { addr: '33:0', client: 'Virtual Raw MIDI 1-1', port: 'VirMIDI 1-1', virtual: true },
];
const desk = (o = {}) => boardGraph({ room: 'studio-1', instruments: INSTRUMENTS, inputs: INPUTS,
  alsa: ALSA, frameMs: 20, ...o });
const port = (g, id) => g.ports.find((p) => p.id === id);
const node = (g, id) => g.nodes.find((n) => n.id === id);

console.log('\n== what a board says it is ==');

{
  const g = desk();
  ok('the graph is version 1, on site pi-1 and placed in the board\'s room', g.v === GRAPH_V && g.site === 'pi-1' && g.place === 'studio-1');
  ok('and a graph built from the desk is one graphProblem accepts', graphProblem(g) === '', graphProblem(g));
  ok('a synth the board can start is an engine node',
    node(g, 'pi-1:synth')?.kind === 'engine' && node(g, 'pi-1:collide')?.kind === 'engine');
  ok('with a MIDI in that takes notes',
    port(g, 'pi-1:collide:midi-in')?.dir === 'in' && port(g, 'pi-1:collide:midi-in')?.medium === 'midi'
    && port(g, 'pi-1:collide:midi-in').accepts.includes('note'));
  ok('and an audio out at the board\'s frame',
    port(g, 'pi-1:collide:audio-out')?.dir === 'out' && port(g, 'pi-1:collide:audio-out')?.medium === 'audio'
    && port(g, 'pi-1:collide:audio-out').shape.frameMs === 20 && port(g, 'pi-1:collide:audio-out').shape.rate === 48000);
  ok('NEGATIVE CONTROL: pappusFx is an insert, so it is not a node',
    !g.nodes.some((n) => /pappus/i.test(n.id)) && !g.ports.some((p) => /pappus/i.test(p.id)));
  ok('NEGATIVE CONTROL: a synth the board cannot start is not described',
    !node(g, 'pi-1:zynaddsubfx') && !g.ports.some((p) => p.id.startsWith('pi-1:zynaddsubfx:')));
  ok('the GPU takes a program and gives video',
    node(g, 'pi-1:gpu')?.kind === 'engine'
    && port(g, 'pi-1:gpu:program-in')?.dir === 'in' && port(g, 'pi-1:gpu:program-in')?.medium === 'program'
    && port(g, 'pi-1:gpu:video-out')?.dir === 'out' && port(g, 'pi-1:gpu:video-out')?.medium === 'video');
  const noGpu = desk({ gpu: false });
  ok('NEGATIVE CONTROL: a board with no video path has no GPU node and no GPU port',
    !node(noGpu, 'pi-1:gpu') && !noGpu.ports.some((p) => p.id.startsWith('pi-1:gpu:')));
}

{
  const g = desk();
  ok('a hardware input is a device with its audio out',
    node(g, 'pi-1:circuit')?.kind === 'device' && port(g, 'pi-1:circuit:audio-out')?.medium === 'audio'
    && port(g, 'pi-1:circuit:audio-out')?.dir === 'out');
  const inP = port(g, 'pi-1:circuit:midi-in');
  ok('and an input with MIDI gets a MIDI in carrying its channels',
    inP?.dir === 'in' && inP?.medium === 'midi' && JSON.stringify(inP.shape?.channels) === '[1,2,10]');
  ok('NEGATIVE CONTROL: that MIDI in never takes SysEx, which is the gate the Circuit lives behind',
    inP?.never.includes('sysex') && !inP.accepts.includes('sysex'), JSON.stringify(inP?.never));
  const noMidi = boardGraph({ room: 'studio-1', inputs: [{ name: 'mic', channels: 1, midi: null }] });
  ok('NEGATIVE CONTROL: an input with no MIDI has no MIDI in',
    port(noMidi, 'pi-1:mic:audio-out') && !port(noMidi, 'pi-1:mic:midi-in'));
}

{
  const g = desk();
  const circuits = g.nodes.filter((n) => /circuit/i.test(n.id));
  ok('NEGATIVE CONTROL: the Circuit, already an input, is not described a second time from ALSA',
    circuits.length === 1 && !node(g, 'pi-1:midi-circuit'), circuits.map((n) => n.id).join(', '));
  ok('the other ALSA devices are described, with a MIDI out and in each',
    port(g, 'pi-1:midi-microfreak:midi-out')?.medium === 'midi' && port(g, 'pi-1:midi-microfreak:midi-in')?.dir === 'in'
    && node(g, 'pi-1:midi-digitakt')?.kind === 'device');
  ok('NEGATIVE CONTROL: virtual ALSA clients are plumbing and are skipped',
    !g.nodes.some((n) => /virtual|virmidi/i.test(n.id + n.label)));
  const twice = boardGraph({ room: 'r', gpu: false, alsa: [{ client: 'Digitakt' }, { client: 'Digitakt' }] });
  ok('NEGATIVE CONTROL: a client with two ports is one node, not two',
    twice.nodes.length === 1 && twice.ports.length === 2 && graphProblem(twice) === '', `${twice.nodes.length} nodes`);
  ok('every port id is site:node:port', g.ports.every((p) => p.id.split(':').length === 3));
  ok('net is left out when unknown and carried when known',
    !('net' in g) && !g.nodes.some((n) => 'net' in n)
    && desk({ net: 'home' }).net === 'home' && desk({ net: 'home' }).nodes.every((n) => n.net === 'home'));
  ok('a board with nothing on it is still a graph that is accepted',
    graphProblem(boardGraph({ room: 'empty', gpu: false })) === '');
}

console.log('\n== what a graph has to be ==');

{
  const g = desk();
  const r1 = graphProblem({ ...g, v: 2 });
  ok('NEGATIVE CONTROL: a graph of another version is refused, and says which', /version 2/.test(r1), r1);
  const r2 = graphProblem({ ...g, ports: [...g.ports, { id: 'pi-1:loose', dir: 'out', medium: 'midi' }] });
  ok('NEGATIVE CONTROL: a port that is not site:node:port is refused, and named', /pi-1:loose/.test(r2), r2);
  const r3 = graphProblem({ ...g, nodes: [...g.nodes, { id: 'elsewhere:synth', kind: 'engine' }] });
  ok('NEGATIVE CONTROL: a node on another site is refused, and named', /elsewhere:synth/.test(r3), r3);
  const r4 = graphProblem({ ...g, ports: [...g.ports, { id: 'elsewhere:synth:in', dir: 'in', medium: 'midi' }] });
  ok('NEGATIVE CONTROL: a port on another site is refused too', /elsewhere:synth:in/.test(r4), r4);
  ok('NEGATIVE CONTROL: not an object, and no site, are each refused for their own reason',
    graphProblem(null) === 'not an object' && graphProblem({ ...g, site: '' }) === 'no site');
}

console.log('\n== what a page hears ==');

{
  let t = 1_000_000;
  const reg = createRegistry({ now: () => t });
  const g = desk();
  ok('the first hello changes what is known', reg.ingest({ type: 'board.hello', from: 'b1', graph: g }) === true);
  t += 5000;
  ok('NEGATIVE CONTROL: the same graph on the next beat changes nothing',
    reg.ingest({ type: 'board.alive', from: 'b1', graph: JSON.parse(JSON.stringify(g)) }) === false);
  ok('but it does date the board again', reg.graphs()[0].at === t);
  ok('a different graph on the same socket changes what is known',
    reg.ingest({ type: 'board.alive', from: 'b1', graph: desk({ gpu: false }) }) === true);
  ok('NEGATIVE CONTROL: a bad graph is ignored and leaves the good one in place',
    reg.ingest({ type: 'board.alive', from: 'b1', graph: { ...g, v: 9 } }) === false
    && reg.graphs().length === 1 && !reg.graphs()[0].graph.nodes.some((n) => n.id === 'pi-1:gpu'));
  ok('NEGATIVE CONTROL: a message of another type is not read even when it carries a graph',
    reg.ingest({ type: 'midi.send', from: 'b2', graph: g }) === false && reg.graphs().length === 1);
  ok('NEGATIVE CONTROL: a message with no sender is not read',
    reg.ingest({ type: 'board.hello', graph: g }) === false);
}

{
  let t = 0;
  const reg = createRegistry({ now: () => t });
  reg.ingest({ type: 'board.hello', from: 'b1', graph: desk() });
  t += STALE_MS;
  ok('a board heard exactly STALE_MS ago is not yet stale', reg.graphs()[0].stale === false);
  t += 1;
  ok('one millisecond later it is, and it is still listed',
    reg.graphs().length === 1 && reg.graphs()[0].stale === true);
  ok('and every node and port it brought is marked stale',
    reg.merged().nodes.every((n) => n.stale) && reg.merged().ports.every((p) => p.stale));
  reg.forget('b1');
  ok('forget takes it out', reg.graphs().length === 0);
}

{
  let t = 0;
  const reg = createRegistry({ now: () => t });
  reg.ingest({ type: 'board.hello', from: 'old-socket', graph: desk({ gpu: true }) });
  t += 1000;
  reg.ingest({ type: 'board.hello', from: 'new-socket', graph: desk({ gpu: false }) });
  const m = reg.merged();
  ok('two sockets for one site merge as one site', m.sites.length === 1 && m.sites[0].from === 'new-socket');
  ok('NEGATIVE CONTROL: the freshest wins, so the older socket\'s GPU is not drawn',
    !m.nodes.some((n) => n.id === 'pi-1:gpu'));
  ok('NEGATIVE CONTROL: and no node is drawn twice',
    new Set(m.nodes.map((n) => n.id)).size === m.nodes.length);
  reg.ingest({ type: 'graph.announce', from: 'page-1',
    graph: { v: 1, site: 'home', place: 'laptop', nodes: [{ id: 'home:page', kind: 'endpoint', label: 'page' }],
      ports: [{ id: 'home:page:audio', label: 'page', dir: 'in', medium: 'audio' },
              { id: 'home:page:keys', label: 'keys', dir: 'out', medium: 'midi', emits: ['note'] }] } });
  ok('a page announcing itself is a second site', reg.merged().sites.length === 2);
  ok('and its nodes carry its place', reg.merged().nodes.find((n) => n.id === 'home:page')?.place === 'laptop');
}

console.log('\n== into a bay ==');

{
  const reg = createRegistry();
  reg.ingest({ type: 'board.hello', from: 'b1', graph: desk({ net: 'studio' }) });
  reg.ingest({ type: 'graph.announce', from: 'page-1',
    graph: { v: 1, site: 'home', place: 'laptop', nodes: [{ id: 'home:page', kind: 'endpoint', label: 'page' }],
      ports: [{ id: 'home:page:audio', label: 'page', dir: 'in', medium: 'audio' },
              { id: 'home:page:keys', label: 'keys', dir: 'out', medium: 'midi', emits: ['note', 'cc'] }] } });
  const b = reg.fill(createBay());
  ok('fill gives a bay with every node heard', b.nodes().length === reg.merged().nodes.length, `${b.nodes().length} nodes`);
  const bad = b.validate('pi-1:collide:audio-out', 'pi-1:circuit:midi-in');
  ok('NEGATIVE CONTROL: audio into a MIDI in is refused, for the medium',
    !bad.ok && /audio/.test(bad.why) && /midi/.test(bad.why), bad.why);
  const good = b.link('pi-1:collide:audio-out', 'home:page:audio');
  // A board synth's sound lives in the board's MAIN room (2026-10-04), so the
  // session names that room, not a derivation of the port's id.
  ok('a valid audio link is made, and carries a session in the board\'s own room',
    good.ok && good.session && good.session.address === 'studio-1', JSON.stringify(good.session));
  ok('and the session knows the two ends are on different machines',
    /^internet/.test(good.session?.where || ''), good.session?.where);
  const keys = b.link('home:page:keys', 'pi-1:collide:midi-in');
  ok('a page\'s keys may reach a board synth, and a MIDI link has no session',
    keys.ok && keys.session === null, keys.why);
}

{
  // 2026-10-04, step 4: a session has to name the room the stream REALLY lives
  // in, or a page opening it joins an empty room. The board's inputs stream to
  // `<room>-<input>` and its video to `<room>-video`.
  const g = boardGraph({ room: 'studio-1', inputs: [{ name: 'circuit', midi: null }], gpu: true });
  const reg = createRegistry();
  reg.ingest({ type: 'board.alive', from: 'b', graph: g });
  reg.ingest({ type: 'graph.announce', from: 'p', graph: { v: 1, site: 'web', place: 'browser',
    nodes: [{ id: 'web:screen', kind: 'screen', label: 'screen', place: 'browser' }],
    ports: [{ id: 'web:screen:audio', label: 'screen', dir: 'in', medium: 'audio' },
            { id: 'web:screen:video', label: 'screen', dir: 'in', medium: 'video' }] } });
  const bay = reg.fill(createBay());
  const a = bay.link('pi-1:circuit:audio-out', 'web:screen:audio');
  const v = bay.link('pi-1:gpu:video-out', 'web:screen:video');
  ok('an input\'s stream is addressed to the room the board really uses', a.session?.address === 'studio-1-circuit', a.session?.address);
  ok('and the GPU\'s to its video room', v.session?.address === 'studio-1-video', v.session?.address);
  // NEGATIVE CONTROL: a port with no declared address still gets the derived one.
  const b2 = createBay();
  b2.addPort({ id: 'x:n:out', label: 'n', dir: 'out', medium: 'audio' });
  b2.addPort({ id: 'y:m:in', label: 'm', dir: 'in', medium: 'audio' });
  ok('a port that declares nothing is still addressed by derivation', b2.link('x:n:out', 'y:m:in').session?.address === 'x-n-out');
}

// ── plans/plan-routing-migration.md steps 0 and 1, 2026-10-06 ─────────────

{
  /* One socket may be two sites, and each is kept. */
  let t = 0;
  const reg = createRegistry({ now: () => t });
  const page = { v: 1, site: 'web-ab12', place: 'browser', nodes: [], ports: [{ id: 'web-ab12:keys:out', dir: 'out', medium: 'midi' }] };
  const store = { v: 1, site: 'r2', place: 'cloudflare', nodes: [], ports: [{ id: 'r2:recordings:in', dir: 'in', medium: 'audio' }] };
  reg.ingest({ type: 'graph.announce', from: 's1', graph: page });
  const second = reg.ingest({ type: 'graph.announce', from: 's1', graph: store });
  ok('one socket announcing two sites keeps both', second === true && reg.merged().sites.length === 2
    && reg.graphs().every((g) => g.from === 's1'), reg.merged().sites.map((x) => x.site).join(', '));
  /* NEGATIVE CONTROL: the same site again from that socket replaces, it does not add. */
  t = 5;
  const again = reg.ingest({ type: 'graph.announce', from: 's1', graph: { ...page, place: 'laptop' } });
  ok('NEGATIVE CONTROL: a second announce of one site from one socket replaces the first',
    again === true && reg.graphs().length === 2 && reg.graphs().find((g) => g.site === 'web-ab12').graph.place === 'laptop');
  ok('forget with a site takes only that site', reg.forget('s1', 'r2') === true && reg.graphs().length === 1
    && reg.graphs()[0].site === 'web-ab12');
  reg.ingest({ type: 'graph.announce', from: 's1', graph: store });
  ok('and forget with a socket alone takes every site it announced', reg.forget('s1') === true && reg.graphs().length === 0);
  /* NEGATIVE CONTROL: two sockets announcing one site still merge as one, freshest winning. */
  const two = createRegistry({ now: () => t });
  t = 10; two.ingest({ type: 'graph.announce', from: 'a', graph: page });
  t = 20; two.ingest({ type: 'graph.announce', from: 'b', graph: { ...page, place: 'phone' } });
  ok('NEGATIVE CONTROL: two sockets announcing one site are still one site, the freshest drawn',
    two.merged().sites.length === 1 && two.merged().sites[0].from === 'b');
}

{
  /* The board's streams travel the way its code sends them. */
  const g = boardGraph({ room: 'studio-1', instruments: { synth: true }, inputs: [{ name: 'circuit', midi: null }] });
  const tx = (id) => g.ports.find((p) => p.id === id)?.transports?.join(',');
  ok('the board declares relay or a data channel for its sound and relay H.264 for its picture',
    tx('pi-1:synth:audio-out') === 'relay,datachannel' && tx('pi-1:circuit:audio-out') === 'relay,datachannel'
      && tx('pi-1:gpu:video-out') === 'relay-h264', `${tx('pi-1:synth:audio-out')} | ${tx('pi-1:gpu:video-out')}`);
  ok('NEGATIVE CONTROL: a MIDI in and a program in declare no transport, because they carry their own bytes',
    !g.ports.some((p) => p.dir === 'in' && p.transports));
  /* A board that predates the field, as the Pi on the desk does until a push. */
  const old = { ...g, ports: g.ports.map(({ transports, ...p }) => p) };
  const reg = createRegistry();
  reg.ingest({ type: 'board.alive', from: 'b', graph: old });
  const heard = reg.merged().ports.find((p) => p.id === 'pi-1:gpu:video-out');
  ok('a board graph that says nothing about transports is given the board\'s own on ingest',
    heard?.transports?.join(',') === BOARD_TRANSPORTS.video.join(','), JSON.stringify(heard?.transports));
  /* NEGATIVE CONTROLS: a page's announce is not touched, and a board that says something keeps it. */
  const pageG = { v: 1, site: 'cam-1', place: 'browser', nodes: [], ports: [{ id: 'cam-1:cam:video', dir: 'out', medium: 'video' }] };
  reg.ingest({ type: 'graph.announce', from: 'p', graph: pageG });
  ok('NEGATIVE CONTROL: a page\'s own announce is never given the board\'s transports',
    !reg.merged().ports.find((p) => p.id === 'cam-1:cam:video')?.transports);
  const own = withBoardTransports({ ...old, ports: old.ports.map((p) => (p.medium === 'video' ? { ...p, transports: ['whep'] } : p)) });
  ok('NEGATIVE CONTROL: a board port that already names its transports keeps them',
    own.ports.find((p) => p.id === 'pi-1:gpu:video-out').transports.join(',') === 'whep');
  const b = reg.fill(createBay());
  b.addNode({ id: 'home:page', kind: 'screen', label: 'home', place: 'home' });
  b.addPort({ id: 'home:page:video', label: 'home', dir: 'in', medium: 'video', shape: { codec: 'h264' } });
  const v = b.link('pi-1:gpu:video-out', 'home:page:video');
  ok('so the bay gives the board\'s picture relay H.264, the way the page really opens it, and not WHEP',
    v.ok && v.session?.transport === 'relay-h264', JSON.stringify(v.session || v.why));
}

/* A site says what it is (plans/plan-site-names.md, 2026-10-09). `kind` and
   `label` are optional, the ids do not move, and an older board that sends
   neither is still read. */
{
  const g = boardGraph({ room: 'studio-1', instruments: { synth: true }, gpu: false });
  ok('a board graph says it is a board, named Raspberry Pi', g.kind === 'board' && g.label === 'Raspberry Pi', `${g.kind} ${g.label}`);
  ok('and its ids are site:node:port on pi-1, not on the room', g.site === 'pi-1' && g.ports.every((p) => p.id.startsWith('pi-1:')) && g.v === 1);
  ok('a board may be given another label', boardGraph({ room: 'r', gpu: false, label: 'pi in the hall' }).label === 'pi in the hall');
  ok('every listed kind passes', SITE_KINDS.every((k) => graphProblem({ v: 1, site: 's', kind: k, nodes: [], ports: [] }) === ''), SITE_KINDS.join(','));
  ok('a graph with no kind and no label still passes', graphProblem({ v: 1, site: 's', nodes: [], ports: [] }) === '');
  const typo = graphProblem({ v: 1, site: 's', kind: 'bord', nodes: [], ports: [] });
  ok('NEGATIVE CONTROL: a kind outside the list is refused, and the reason names it', /kind bord/.test(typo), typo);
  ok('NEGATIVE CONTROL: a kind of "you" is refused, because "you" is never sent',
    graphProblem({ v: 1, site: 's', kind: 'you', nodes: [], ports: [] }) !== '');
  ok('NEGATIVE CONTROL: a label that is not a string is refused',
    graphProblem({ v: 1, site: 's', label: 7, nodes: [], ports: [] }) !== '');

  const reg = createRegistry({ now: () => 0 });
  reg.ingest({ type: 'board.alive', from: 'pi', graph: g });
  const old = { ...g }; delete old.kind; delete old.label;
  reg.ingest({ type: 'graph.announce', from: 'tab', graph: { v: 1, site: 'web-ab12', place: 'browser', kind: 'browser', label: 'browser', nodes: [], ports: [] } });
  reg.ingest({ type: 'graph.announce', from: 'old', graph: { ...old, site: 'studio-2', nodes: [], ports: [] } });
  const bad = reg.ingest({ type: 'graph.announce', from: 'typo', graph: { v: 1, site: 'web-zz', kind: 'phone', nodes: [], ports: [] } });
  const sites = Object.fromEntries(reg.merged().sites.map((x) => [x.site, x]));
  ok('merged sites carry the board\'s kind and label', sites['pi-1']?.kind === 'board' && sites['pi-1']?.label === 'Raspberry Pi');
  ok('and a browser\'s', sites['web-ab12']?.kind === 'browser' && sites['web-ab12']?.label === 'browser');
  ok('NEGATIVE CONTROL: a site that said nothing gets no kind, so a reader falls back to place',
    sites['studio-2'] && sites['studio-2'].kind === undefined && sites['studio-2'].label === undefined);
  ok('NEGATIVE CONTROL: a graph with a bad kind is not heard at all', bad === false && !sites['web-zz']);
}

/* The Pi's site is `pi-1` and its port names are `<medium>-<dir>`, since
   2026-10-10 (plans/plan-site-names.md §0, §4c). The room stays `studio-1`, so
   every stream address is unchanged. Six of the eleven below are NEGATIVE
   CONTROLS, written so the bug each names would take it red. */
{
  const g = desk();
  const names = g.ports.map((p) => p.id.split(':')[2]);
  ok('every board port is named for its medium and direction',
    g.ports.every((p) => p.id.split(':')[2] === `${p.medium}-${p.dir}`), names.join(','));
  ok('boardPort names a port the board really announces', BOARD_SITE === 'pi-1'
    && g.ports.some((p) => p.id === boardPort('collide', 'midi-in')) && boardPort('gpu', 'video-out') === 'pi-1:gpu:video-out');
  ok('the addresses still name the room, so no stream moved',
    g.ports.find((p) => p.id === 'pi-1:collide:audio-out')?.address === 'studio-1'
    && g.ports.find((p) => p.id === 'pi-1:gpu:video-out')?.address === 'studio-1-video'
    && g.ports.find((p) => p.id === 'pi-1:circuit:audio-out')?.address === 'studio-1-circuit');
  const two = boardGraph({ room: 'studio-2', site: 'pi-2', instruments: { synth: true }, gpu: false });
  ok('a second board says pi-2 and still lives in its own room', two.site === 'pi-2' && two.place === 'studio-2'
    && two.ports.every((p) => p.id.startsWith('pi-2:')) && graphProblem(two) === '', graphProblem(two));
  ok('NEGATIVE CONTROL: no board id is left on the room', !JSON.stringify(g.ports.map((p) => p.id)).includes('studio-1:'));
  const rename = (from, to) => ({ ...g, ports: g.ports.map((p) => (p.id === from ? { ...p, id: to } : p)) });
  const old = rename('pi-1:collide:audio-out', 'pi-1:collide:audio');
  ok('NEGATIVE CONTROL: a board port with the old bare name is refused, and the reason names it',
    /pi-1:collide:audio is named audio/.test(graphProblem(old)), graphProblem(old));
  const backwards = rename('pi-1:collide:midi-in', 'pi-1:collide:midi-out');
  ok('NEGATIVE CONTROL: a name that says out on an in port is refused', /audio-out|midi-in/.test(graphProblem(backwards)), graphProblem(backwards));
  const wrongMedium = rename('pi-1:gpu:program-in', 'pi-1:gpu:video-in');
  ok('NEGATIVE CONTROL: a name that says the wrong medium is refused', graphProblem(wrongMedium) !== '', graphProblem(wrongMedium));
  ok('a numbered second port of one kind is allowed', graphProblem(rename('pi-1:gpu:program-in', 'pi-1:gpu:program-in-2')) === '');
  ok('NEGATIVE CONTROL: a browser graph with an old style name still passes, the rule is for boards only',
    graphProblem({ v: 1, site: 'web-ab12', kind: 'browser', nodes: [], ports: [{ id: 'web-ab12:keys:out', dir: 'out', medium: 'midi' }] }) === '');
  ok('NEGATIVE CONTROL: and so does one that says nothing about its kind',
    graphProblem({ v: 1, site: 'cf-store', nodes: [], ports: [{ id: 'cf-store:history:in', dir: 'in', medium: 'value' }] }) === '');
}

console.log('\n== the JACK ends, and one bay link as JACK rows (2026-10-11) ==');

{
  // 🔴 THE BAY HALF OF THE JACK ARM (plans/plan-nodes-revisited.md §3 item 3).
  // Twelve asserts, six of them NEGATIVE CONTROLS. Sabotaged 2026-10-11, one
  // fault at a time, against 95 green: `jackRows` pairing by index whatever the
  // counts takes 3 red; `boardGraph` defaulting `jack` on takes 4 (one of them
  // here, three older ones that count nodes and transports); `bay.mjs` dropping
  // its same-site test takes 1, the two-board control below.
  const plain = desk();
  ok('NEGATIVE CONTROL: a board graph without jack announces no JACK end and no granulator node',
    !plain.ports.some((p) => p.jack) && !node(plain, 'pi-1:pappus') && !node(plain, 'pi-1:capture'));
  const g = desk({ jack: true, inputs: [{ ...INPUTS[0], jack: true, take: 1 }] });
  ok('with jack, Collide keeps its id and relay address and names its two JACK ports',
    JSON.stringify(port(g, 'pi-1:collide:audio-out')?.jack) === JSON.stringify(JACK_ENDS.collide)
    && port(g, 'pi-1:collide:audio-out').address === 'studio-1' && port(g, 'pi-1:collide:audio-out').transports.includes('relay'));
  ok('the Circuit on JACK is its one taken channel', JSON.stringify(port(g, 'pi-1:circuit:audio-out')?.jack) === '["circuit:capture_1"]');
  ok('the granulator and the capture are nodes that travel by JACK only, and the graph is still legal',
    port(g, 'pi-1:pappus:audio-in')?.transports.join() === 'jack' && port(g, 'pi-1:capture:audio-in')?.dir === 'in'
    && graphProblem(g) === '', graphProblem(g));
  ok('NEGATIVE CONTROL: an input not on JACK names no JACK port',
    !port(desk({ jack: true }), 'pi-1:circuit:audio-out').jack);
  ok('two into two is one to one, two into one sums, one into two spreads',
    JSON.stringify(jackRows(['a:l', 'a:r'], ['b:1', 'b:2'])) .includes('"from":"a:r","to":"b:2"')
    && jackRows(['a:l', 'a:r'], ['cap:in']).rows.length === 2 && jackRows(['a:l', 'a:r'], ['cap:in']).rows.every((r) => r.to === 'cap:in')
    && jackRows(['c:1'], ['g:1', 'g:2']).rows.map((r) => r.to).join() === 'g:1,g:2');
  ok('NEGATIVE CONTROL: two into three is refused in words', jackRows(['a', 'b'], ['x', 'y', 'z']).ok === false
    && /2 channels into 3/.test(jackRows(['a', 'b'], ['x', 'y', 'z']).why));
  const bay = createBay();
  for (const n of g.nodes) bay.addNode(n);
  for (const p of g.ports) bay.addPort(p);
  const v = bay.validate('pi-1:circuit:audio-out', 'pi-1:pappus:audio-in');
  ok('the Circuit into the granulator is a jack session carrying the two rows it means',
    v.ok && v.session?.transport === 'jack' && v.session.rows.map((r) => `${r.from}>${r.to}`).join()
      === 'circuit:capture_1>SuperCollider:in_1,circuit:capture_1>SuperCollider:in_2', JSON.stringify(v.session ?? v.why));
  bay.addNode({ id: 'web-x:screen', kind: 'screen', label: 'screen', place: 'browser' });
  bay.addPort({ id: 'web-x:screen:audio-in', label: 'screen', dir: 'in', medium: 'audio', shape: {} });
  const out = bay.validate('pi-1:pappus:audio-out', 'web-x:screen:audio-in');
  ok('NEGATIVE CONTROL: the granulator straight to a page is refused, because JACK never leaves the board',
    !out.ok && /never leaves pi-1/.test(out.why), out.why);
  const yo = bay.validate('pi-1:collide:audio-out', 'web-x:screen:audio-in');
  ok('and Collide to a page still rides the relay, so no page that links it moved', yo.ok && yo.session.transport === 'relay', yo.session?.transport);
  const two = desk({ jack: true, site: 'pi-2', room: 'studio-2' });
  for (const n of two.nodes) bay.addNode(n);
  for (const p of two.ports) bay.addPort(p);
  const across = bay.validate('pi-2:collide:audio-out', 'pi-1:pappus:audio-in');
  ok('NEGATIVE CONTROL: Collide on a second board into this board\'s granulator is refused, two JACK servers share no row',
    !across.ok && /never leaves pi-1/.test(across.why), across.why || across.session?.transport);
  const asSource = bay.validate('pi-1:pappus:audio-in', 'pi-1:capture:audio-in');
  ok('NEGATIVE CONTROL: the granulator\'s input as a source is refused', !asSource.ok && /is an input/.test(asSource.why), asSource.why);
}

console.log('\n== the sampler on the board (2026-10-11) ==');

{
  // `pi-1:sampler`, the SuperCollider sampler of `rig/board/scsampler.mjs`.
  // Four asserts, two of them NEGATIVE CONTROLS.
  const g = desk({ jack: true, instruments: { ...INSTRUMENTS, sampler: true } });
  ok('the sampler announces midi-in, audio-out and file-in, and the graph is still legal',
    port(g, 'pi-1:sampler:midi-in')?.accepts.includes('program') && port(g, 'pi-1:sampler:audio-out')?.address === 'studio-1'
    && port(g, 'pi-1:sampler:file-in')?.medium === 'file' && graphProblem(g) === '', graphProblem(g));
  ok('its audio-out names its own two JACK ports, not the granulator\'s',
    JSON.stringify(port(g, 'pi-1:sampler:audio-out')?.jack) === '["possampler:out_1","possampler:out_2"]'
    && !JACK_ENDS.sampler.some((p) => p.startsWith('SuperCollider:')));
  ok('NEGATIVE CONTROL: no other engine grows a file-in', !port(g, 'pi-1:collide:file-in') && !port(g, 'pi-1:synth:file-in'));
  ok('NEGATIVE CONTROL: a board that cannot run the sampler announces none of it',
    !desk({ instruments: { ...INSTRUMENTS, sampler: false } }).ports.some((p) => p.id.startsWith('pi-1:sampler:')));
}

console.log(`\n${pass}/${pass + fail} green${fail ? `  (${fail} FAILED)` : ''}\n`);
process.exit(fail ? 1 : 0);
