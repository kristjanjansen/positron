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

import { boardGraph, graphProblem, createRegistry, GRAPH_V, STALE_MS, BOARD_TRANSPORTS, withBoardTransports, SITE_KINDS } from './graph-registry.mjs';
import { createBay } from './bay.mjs';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? ' | ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' | ' + detail : ''}`); }
};

// The board on the desk: what `board.hello` sends for instruments, the
// HANDOFF's BOARD_INPUTS, and `addressable()` over the aconnect fixture.
const INSTRUMENTS = { synth: true, pappusFx: true, yoshimi: true, zynaddsubfx: false };
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
  ok('the graph is version 1 on the board\'s room', g.v === GRAPH_V && g.site === 'studio-1' && g.place === 'studio-1');
  ok('and a graph built from the desk is one graphProblem accepts', graphProblem(g) === '', graphProblem(g));
  ok('a synth the board can start is an engine node',
    node(g, 'studio-1:synth')?.kind === 'engine' && node(g, 'studio-1:yoshimi')?.kind === 'engine');
  ok('with a MIDI in that takes notes',
    port(g, 'studio-1:yoshimi:in')?.dir === 'in' && port(g, 'studio-1:yoshimi:in')?.medium === 'midi'
    && port(g, 'studio-1:yoshimi:in').accepts.includes('note'));
  ok('and an audio out at the board\'s frame',
    port(g, 'studio-1:yoshimi:audio')?.dir === 'out' && port(g, 'studio-1:yoshimi:audio')?.medium === 'audio'
    && port(g, 'studio-1:yoshimi:audio').shape.frameMs === 20 && port(g, 'studio-1:yoshimi:audio').shape.rate === 48000);
  ok('NEGATIVE CONTROL: pappusFx is an insert, so it is not a node',
    !g.nodes.some((n) => /pappus/i.test(n.id)) && !g.ports.some((p) => /pappus/i.test(p.id)));
  ok('NEGATIVE CONTROL: a synth the board cannot start is not described',
    !node(g, 'studio-1:zynaddsubfx') && !g.ports.some((p) => p.id.startsWith('studio-1:zynaddsubfx:')));
  ok('the GPU takes a program and gives video',
    node(g, 'studio-1:gpu')?.kind === 'engine'
    && port(g, 'studio-1:gpu:program')?.dir === 'in' && port(g, 'studio-1:gpu:program')?.medium === 'program'
    && port(g, 'studio-1:gpu:video')?.dir === 'out' && port(g, 'studio-1:gpu:video')?.medium === 'video');
  const noGpu = desk({ gpu: false });
  ok('NEGATIVE CONTROL: a board with no video path has no GPU node and no GPU port',
    !node(noGpu, 'studio-1:gpu') && !noGpu.ports.some((p) => p.id.startsWith('studio-1:gpu:')));
}

{
  const g = desk();
  ok('a hardware input is a device with its audio out',
    node(g, 'studio-1:circuit')?.kind === 'device' && port(g, 'studio-1:circuit:audio')?.medium === 'audio'
    && port(g, 'studio-1:circuit:audio')?.dir === 'out');
  const inP = port(g, 'studio-1:circuit:in');
  ok('and an input with MIDI gets a MIDI in carrying its channels',
    inP?.dir === 'in' && inP?.medium === 'midi' && JSON.stringify(inP.shape?.channels) === '[1,2,10]');
  ok('NEGATIVE CONTROL: that MIDI in never takes SysEx, which is the gate the Circuit lives behind',
    inP?.never.includes('sysex') && !inP.accepts.includes('sysex'), JSON.stringify(inP?.never));
  const noMidi = boardGraph({ room: 'studio-1', inputs: [{ name: 'mic', channels: 1, midi: null }] });
  ok('NEGATIVE CONTROL: an input with no MIDI has no MIDI in',
    port(noMidi, 'studio-1:mic:audio') && !port(noMidi, 'studio-1:mic:in'));
}

{
  const g = desk();
  const circuits = g.nodes.filter((n) => /circuit/i.test(n.id));
  ok('NEGATIVE CONTROL: the Circuit, already an input, is not described a second time from ALSA',
    circuits.length === 1 && !node(g, 'studio-1:midi-circuit'), circuits.map((n) => n.id).join(', '));
  ok('the other ALSA devices are described, with a MIDI out and in each',
    port(g, 'studio-1:midi-microfreak:out')?.medium === 'midi' && port(g, 'studio-1:midi-microfreak:in')?.dir === 'in'
    && node(g, 'studio-1:midi-digitakt')?.kind === 'device');
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
  const r2 = graphProblem({ ...g, ports: [...g.ports, { id: 'studio-1:loose', dir: 'out', medium: 'midi' }] });
  ok('NEGATIVE CONTROL: a port that is not site:node:port is refused, and named', /studio-1:loose/.test(r2), r2);
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
    && reg.graphs().length === 1 && !reg.graphs()[0].graph.nodes.some((n) => n.id === 'studio-1:gpu'));
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
    !m.nodes.some((n) => n.id === 'studio-1:gpu'));
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
  const bad = b.validate('studio-1:yoshimi:audio', 'studio-1:circuit:in');
  ok('NEGATIVE CONTROL: audio into a MIDI in is refused, for the medium',
    !bad.ok && /audio/.test(bad.why) && /midi/.test(bad.why), bad.why);
  const good = b.link('studio-1:yoshimi:audio', 'home:page:audio');
  // A board synth's sound lives in the board's MAIN room (2026-10-04), so the
  // session names that room, not a derivation of the port's id.
  ok('a valid audio link is made, and carries a session in the board\'s own room',
    good.ok && good.session && good.session.address === 'studio-1', JSON.stringify(good.session));
  ok('and the session knows the two ends are on different machines',
    /^internet/.test(good.session?.where || ''), good.session?.where);
  const keys = b.link('home:page:keys', 'studio-1:yoshimi:in');
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
  const a = bay.link('studio-1:circuit:audio', 'web:screen:audio');
  const v = bay.link('studio-1:gpu:video', 'web:screen:video');
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
    tx('studio-1:synth:audio') === 'relay,datachannel' && tx('studio-1:circuit:audio') === 'relay,datachannel'
      && tx('studio-1:gpu:video') === 'relay-h264', `${tx('studio-1:synth:audio')} | ${tx('studio-1:gpu:video')}`);
  ok('NEGATIVE CONTROL: a MIDI in and a program in declare no transport, because they carry their own bytes',
    !g.ports.some((p) => p.dir === 'in' && p.transports));
  /* A board that predates the field, as the Pi on the desk does until a push. */
  const old = { ...g, ports: g.ports.map(({ transports, ...p }) => p) };
  const reg = createRegistry();
  reg.ingest({ type: 'board.alive', from: 'b', graph: old });
  const heard = reg.merged().ports.find((p) => p.id === 'studio-1:gpu:video');
  ok('a board graph that says nothing about transports is given the board\'s own on ingest',
    heard?.transports?.join(',') === BOARD_TRANSPORTS.video.join(','), JSON.stringify(heard?.transports));
  /* NEGATIVE CONTROLS: a page's announce is not touched, and a board that says something keeps it. */
  const pageG = { v: 1, site: 'cam-1', place: 'browser', nodes: [], ports: [{ id: 'cam-1:cam:video', dir: 'out', medium: 'video' }] };
  reg.ingest({ type: 'graph.announce', from: 'p', graph: pageG });
  ok('NEGATIVE CONTROL: a page\'s own announce is never given the board\'s transports',
    !reg.merged().ports.find((p) => p.id === 'cam-1:cam:video')?.transports);
  const own = withBoardTransports({ ...old, ports: old.ports.map((p) => (p.medium === 'video' ? { ...p, transports: ['whep'] } : p)) });
  ok('NEGATIVE CONTROL: a board port that already names its transports keeps them',
    own.ports.find((p) => p.id === 'studio-1:gpu:video').transports.join(',') === 'whep');
  const b = reg.fill(createBay());
  b.addNode({ id: 'home:page', kind: 'screen', label: 'home', place: 'home' });
  b.addPort({ id: 'home:page:video', label: 'home', dir: 'in', medium: 'video', shape: { codec: 'h264' } });
  const v = b.link('studio-1:gpu:video', 'home:page:video');
  ok('so the bay gives the board\'s picture relay H.264, the way the page really opens it, and not WHEP',
    v.ok && v.session?.transport === 'relay-h264', JSON.stringify(v.session || v.why));
}

/* A site says what it is (plans/plan-site-names.md, 2026-10-09). `kind` and
   `label` are optional, the ids do not move, and an older board that sends
   neither is still read. */
{
  const g = boardGraph({ room: 'studio-1', instruments: { synth: true }, gpu: false });
  ok('a board graph says it is a board, named Raspberry Pi', g.kind === 'board' && g.label === 'Raspberry Pi', `${g.kind} ${g.label}`);
  ok('and its ids are still site:node:port on the room', g.site === 'studio-1' && g.ports.every((p) => p.id.startsWith('studio-1:')) && g.v === 1);
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
  ok('merged sites carry the board\'s kind and label', sites['studio-1']?.kind === 'board' && sites['studio-1']?.label === 'Raspberry Pi');
  ok('and a browser\'s', sites['web-ab12']?.kind === 'browser' && sites['web-ab12']?.label === 'browser');
  ok('NEGATIVE CONTROL: a site that said nothing gets no kind, so a reader falls back to place',
    sites['studio-2'] && sites['studio-2'].kind === undefined && sites['studio-2'].label === undefined);
  ok('NEGATIVE CONTROL: a graph with a bad kind is not heard at all', bad === false && !sites['web-zz']);
}

console.log(`\n${pass}/${pass + fail} green${fail ? `  (${fail} FAILED)` : ''}\n`);
process.exit(fail ? 1 : 0);
