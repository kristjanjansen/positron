// node demo/fau/engine-node-test.mjs: the engine node `/nola/` and `/fau/` announce.
//
// No browser, no socket, no MIDI device: an in-memory relay (`memoryRelay`) and a
// stand-in MIDIAccess (`standInAccess`), the same ones the two pages' check passes
// use. What is NOT graded here: the Join button, the badge's drawing, and whether a
// real browser delivers one keyboard's messages to two MIDIAccess objects. The
// pages assert the first two; nothing here can answer the third.
//
// NEGATIVE CONTROLS, written so the bug they name fails them: 8, marked `NEG`.
//
// SABOTAGE, MEASURED 2026-10-06 on scratch copies of `engine-node.mjs`, each one
// alone against 30 checks: `omni` always true 29/30; no `allOff` on the first link
// 28/30; any target accepted 27/30; the sound not refused 29/30; velocity 0 read
// as a note on 28/30; a closed link keeping its listener 29/30; an absent keyboard
// opened 27/30; `transports` dropped from the audio out 29/30. None stayed green.

import { createEngineNode, memoryRelay, standInAccess, dispatchMidi, MIDI_STALL_MS, ENGINE_TAKES } from './engine-node.mjs';
import { createBayNode } from '../shell/bay-node.mjs';
import { createBay } from '../shell/bay.mjs';
import { graphProblem } from '../shell/graph-registry.mjs';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) pass++; else fail++;
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};
const until = async (f, ms = 2000) => { const t0 = Date.now(); while (!f() && Date.now() - t0 < ms) await new Promise((r) => setTimeout(r, 5)); return f(); };

/** A badge with no document: counts the starts and stops and reads the count it was given. */
function fakeBadge() {
  const made = [];
  const make = ({ count, stallMs }) => {
    const b = { count, stallMs, starts: 0, stops: 0, on: false,
      start() { b.starts++; b.on = true; return b; }, stop() { b.stops++; b.on = false; return b; },
      state: () => (b.on ? 'coming' : 'unknown'), el: null };
    made.push(b);
    return b;
  };
  return { make, made };
}

function build({ program = false, search = '?selfcheck=1' } = {}) {
  const played = [];
  const offs = { n: 0 };
  const fb = fakeBadge();
  let asked = 0;
  const e = createEngineNode({
    slug: program ? 'fau' : 'nola', label: program ? 'Faust' : 'Nola', program, search,
    handlers: {
      onDown: (n, v) => played.push(['down', n, v]), onUp: (n) => played.push(['up', n]),
      onControl: (c, v) => played.push(['cc', c, v]), onProgram: (p) => played.push(['pc', p]),
    },
    allOff: () => { offs.n++; }, badge: fb.make,
    request: () => { asked++; return Promise.reject(new Error('no MIDI in node')); },
  });
  return { e, played, offs, fb, asked: () => asked };
}

// ── what building it does, which is nothing ───────────────────────────────
{
  const { e, asked } = build();
  ok('building it joins nothing and asks for no MIDI', !e.joined() && !e.joining() && asked() === 0 && !e.midiStarted());
  ok('under the harness the room is the run’s own, never the studio’s', /^nola-test-/.test(e.room) && e.room !== 'studio-1', e.room);
  ok('a person gets the studio’s room', build({ search: '' }).e.room === 'studio-1');
  ok('and ?room= wins', build({ search: '?room=desk-7&selfcheck=1' }).e.room === 'desk-7');
  ok('the site is the page’s own and new per tab', /^nola-[a-z0-9]{4}$/.test(e.site) && e.site !== build().e.site, e.site);
  const g = e.graph();
  ok('the graph is one the registry reads', graphProblem(g) === '' && g.nodes.length === 1 && g.nodes[0].kind === 'engine', graphProblem(g));
  ok('nola is an engine with a midi in and an audio out that stays on this machine',
    g.ports.length === 2 && g.ports.some((p) => p.id === e.ports.midi && p.dir === 'in' && p.medium === 'midi')
    && g.ports.some((p) => p.id === e.ports.audio && p.dir === 'out' && p.medium === 'audio' && p.transports?.join() === 'webaudio'));
  const f = build({ program: true }).e;
  ok('fau has a program in as well', f.graph().ports.some((p) => p.id === f.ports.program && p.dir === 'in' && p.medium === 'program')
    && f.graph().ports.length === 3);
  ok('NEG nola has no program port', !e.graph().ports.some((p) => p.medium === 'program'));
}

// ── the dispatch is createMidi's ───────────────────────────────────────────
{
  const got = [];
  const h = { onDown: (n, v) => got.push(`d${n}/${v}`), onUp: (n) => got.push(`u${n}`), onControl: (c, v) => got.push(`c${c}/${v}`), onProgram: (p) => got.push(`p${p}`) };
  const kinds = [[0x90, 60, 100], [0x90, 60, 0], [0x80, 61, 40], [0xb1, 64, 127], [0xc1, 3], [0xe0, 0, 64], [0xf8]].map((b) => dispatchMidi(b, 0, h));
  ok('a note on, a note off sent as velocity 0, a note off, a controller and a program reach their handlers',
    got.join(' ') === 'd60/100 u60 u61 c64/127 p3', got.join(' '));
  ok('NEG velocity 0 is not a note on, and bend and clock reach nothing', !got.includes('d60/0') && kinds[5] === null && kinds[6] === null, kinds.join(','));
}

// ── the round trip, in memory ─────────────────────────────────────────────
{
  const relay = memoryRelay();
  const { e, played, offs, fb } = build();
  const access = standInAccess(['Stand-in keys', 'Stand-in pads']);
  await e.join({ access, wire: relay.open });
  await until(() => e.joined());
  const g = e.graph();
  const keysOut = g.ports.find((p) => p.dir === 'out' && p.medium === 'midi' && /keys/.test(p.label))?.id;
  const padsOut = g.ports.find((p) => p.dir === 'out' && p.medium === 'midi' && /pads/.test(p.label))?.id;
  ok('joined, the graph carries the engine and both stand-in keyboards on the one site',
    e.joined() && keysOut && padsOut && graphProblem(g) === '' && g.nodes.filter((n) => n.kind === 'device').length === 2, `${keysOut} ${padsOut}`);

  // The patchbay's view: every announced port into a bay, and the link it would make.
  const bay = createBay();
  for (const p of g.ports) bay.addPort({ shape: {}, ...p });
  const v = bay.validate(keysOut, e.ports.midi);
  ok('a patchbay reading this graph would allow keys into the engine', v.ok, v.why);

  const peer = createBayNode({ room: e.room, wire: relay.open, graphs: [] });
  await peer.join();
  const heard = await until(() => peer.registry.merged().sites.some((s) => s.site === e.site));
  ok('another page in the room hears the engine', heard);

  ok('before any link every input plays it', e.omni());
  const yes = await peer.request(keysOut, e.ports.midi, true);
  ok('a link from a keyboard here into the engine is opened by this page, and it says yes', yes?.open === true, JSON.stringify(yes));
  ok('and the engine stops playing every input, letting go of every note first, and the badge starts',
    !e.omni() && offs.n === 1 && fb.made[0].starts === 1);
  access.emit(0, [0x90, 64, 90]); access.emit(0, [0x80, 64, 0]);
  access.emit(1, [0x90, 70, 90]);
  ok('the linked keyboard plays the engine', played.map((x) => x.join(':')).join(' ') === 'down:64:90 up:64', played.map((x) => x.join(':')).join(' '));
  ok('NEG the keyboard that is not linked plays nothing here, and the count is only what arrived through the link',
    !played.some((x) => x[1] === 70) && e.counts().linked === 2 && fb.made[0].count() === 2, JSON.stringify(e.counts()));
  ok('the badge is called stalled only after a keyboard has rested half a minute', fb.made[0].stallMs === MIDI_STALL_MS && MIDI_STALL_MS >= 30_000);

  const audioOff = await peer.request(e.ports.audio, 'elsewhere:screen:audio', true);
  ok('NEG the sound is refused in words, it stays on this machine', audioOff?.open === false && /nothing here carries it off this machine/.test(audioOff.why), audioOff?.why);
  const away = await peer.request(padsOut, 'elsewhere:synth:in', true);
  ok('NEG a keyboard here linked to somewhere else is refused in words', away?.open === false && /nothing here sends it anywhere else/.test(away.why), away?.why);
  const ghost = await peer.request(`${e.site}:nobody:out`, e.ports.midi, true);
  ok('NEG a keyboard that is not plugged in is refused, not opened', ghost?.open === false && /not plugged into this machine/.test(ghost.why), ghost?.why);
  const notMine = await peer.request('someone-else:keys:out', e.ports.midi, true, { timeoutMs: 150 });
  ok('NEG a request about another site’s port is not this page’s to answer', notMine === null);

  const shut = await peer.request(keysOut, e.ports.midi, false);
  ok('closing the last link hands the engine back to every input, letting go of every note again',
    shut?.open === false && e.omni() && offs.n === 2 && fb.made[0].stops === 1, JSON.stringify(shut));
  const before = played.length;
  access.emit(0, [0x90, 65, 90]);
  ok('NEG and a closed link delivers nothing through this path', played.length === before && access.input(0).listeners() === 0);

  ok('every refusal was counted', e.counts().refused === 3, JSON.stringify(e.counts()));
  e.leave(); peer.leave();
  ok('leaving stops the re-announce clock', !e.node.stats().ticking && !e.joined());
  ok('ENGINE_TAKES is what both pages’ handlers act on', ENGINE_TAKES.join() === 'note,cc,program');
}

// ── a refused MIDI request still joins, with the engine alone ─────────────
{
  const relay = memoryRelay();
  const { e, asked } = build();
  await e.join({ wire: relay.open });
  await until(() => e.joined());
  ok('MIDI refused at Join still announces the engine, and only it', e.joined() && asked() === 1 && !e.midiStarted() && e.graph().ports.length === 2);
  e.leave();
}

console.log(`\n${pass}/${pass + fail} ok`);
process.exit(fail ? 1 : 0);
