// rig/board/circuit-drums-test.mjs: the Circuit's drums into the board's drums, on fake bytes off the Circuit,
// through the Circuit input's own read (inputs.mjs `tap`) over a fake raw MIDI port. No board or instrument.
// node rig/board/circuit-drums-test.mjs  why: lessons/rig-board-circuit-drums.md#test

import { createCircuitDrumsService, createClockGrid, ROWS, VOICE_OF } from './circuit-drums.mjs';
import { createInputs, parseInputs } from './inputs.mjs';
import { graphOf } from './beat.mjs';
import { DRUM_MAPS } from '../../demo/shell/drum-maps.mjs';
import { NOTE } from '../../demo/drums/voices.mjs';
import { format, parse, randomId } from '../../demo/shell/wire.mjs';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? ' | ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' | ' + detail : ''}`); }
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const INPUTS = parseInputs(JSON.stringify({ circuit: { device: 'hw:CARD=Fake,DEV=0', channels: 2, midi: { port: 'Circuit', channels: [1, 2, 10] } } }));
const FACTS = { room: 'studio-1', instruments: { collide: true }, inputs: INPUTS.inputs, ports: [], gpu: false,
  midiPresent: () => true, drums: { circuit: DRUM_MAPS.circuit, drums: DRUM_MAPS.gm }, sequencer: true };

console.log('\n== the rows are the Circuit\'s four drums, as the drums page names them ==');
{
  ok('rows are GM kick, snare, closed hat, open hat', ROWS.join(',') === '36,38,42,46');
  ok('each row plays the voice demo/drums/voices.mjs gives that note', ROWS.every((n) => NOTE[VOICE_OF[n]] === n), JSON.stringify(VOICE_OF));
}

console.log('\n== the grid on the clock ==');
{
  const g = createClockGrid();
  const ticks = (k) => { let moved = 0; for (let i = 0; i < k; i++) if (g.tick()) moved++; return moved; };
  g.start();
  ok('Start puts the frame on step 0', g.view().step === 0 && g.view().playing === true && g.view().aligned === 'start');
  ok('the first tick after Start is still step 0', ticks(1) === 0 && g.view().step === 0);
  g.hit(0);
  ok('a kick on the tick lights row 0 at step 0', g.view().pattern[0][0] === '1');
  ok('6 more ticks move to step 1', ticks(6) === 1 && g.view().step === 1);
  ticks(3);
  ok('a hit in the second half of step 1 lands on step 2, not yet lit', g.hit(1) === 2 && g.view().pattern[1][2] === '0');
  ticks(3);
  ok('and is lit when step 2 is entered', g.view().step === 2 && g.view().pattern[1][2] === '1');
  ticks(6 * 14);
  ok('a whole bar later the frame is back on step 0 and the last bar\'s kick is gone from it',
    g.view().step === 0 && g.view().pattern[0][0] === '0', g.view().pattern[0]);
  ok('NEGATIVE CONTROL: the snare on step 2 stays until step 2 comes round', g.view().pattern[1][2] === '1');
  g.stop();
  ok('NEGATIVE CONTROL: after Stop ticks do not move the frame', ticks(30) === 0 && g.view().step === 0);
  g.hit(3);
  ok('a pad while stopped lights at the held step', g.view().pattern[3][0] === '1');
  g.cont();
  ok('Continue moves on from where it stopped', ticks(6) === 1 && g.view().step === 1);
  g.start();
  ok('a second Start clears the grid and starts at step 0', g.view().pattern.every((r) => !r.includes('1')) && g.view().step === 0);

  const f = createClockGrid();
  for (let i = 0; i < 40; i++) f.tick();
  ok('with no Start heard, ticks still move a frame', f.view().step === 6 && f.view().aligned === null);
  f.hit(2);
  ok('and the first hit becomes step 0', f.view().aligned === 'first hit' && f.view().step === 0 && f.view().pattern[2][0] === '1');
  ok('NEGATIVE CONTROL: a row outside the four is ignored', f.hit(4) === -1 && f.hit(-1) === -1);
}

/** The service on a fake read and a fake engine. */
function rig({ engine = true, facts = FACTS } = {}) {
  const hits = [], screens = [], logs = [];
  let tapFn = null, taps = 0, untaps = 0;
  const svc = createCircuitDrumsService({
    graph: () => graphOf(facts),
    tap: (fn) => { taps++; tapFn = fn; return () => { untaps++; tapFn = null; }; },
    hit: (name) => (engine ? (hits.push(name), { ok: true }) : { ok: false, why: 'the drums are not running on the Pi' }),
    screen: (s) => screens.push(s), log: (l) => logs.push(l),
  });
  let t = 0;
  const feed = (bytes, at = (t += 5)) => tapFn?.(Uint8Array.from(bytes), at);
  const answers = [];
  const ask = async (msg) => { let out = null; await svc.handle(msg, (type, body) => {
    format({ type, ...body }, { from: 'board-test', seq: answers.length });   // throws on an envelope field
    answers.push({ type, ...body }); out = { type, ...body }; }); return out; };
  return { svc, hits, screens, logs, feed, ask, counts: () => ({ taps, untaps, open: !!tapFn }) };
}

console.log('\n== the link and the Circuit\'s notes into the drums ==');
{
  const { svc, hits, screens, feed, ask, counts } = rig();
  ok('it answers the three cdrums verbs and nothing else', ['cdrums.link', 'cdrums.unlink', 'cdrums.status'].every((x) => svc.handles({ type: x }))
    && !svc.handles({ type: 'kbd.link' }) && !svc.handles({ type: 'midi.send' }));
  ok('nothing is read before a link is asked for', counts().taps === 0);
  const s = await ask({ type: 'cdrums.link', from: 'page-abc' });
  ok('the board holds pi-1:circuit:midi-out -> pi-1:drums:midi-in { drummap circuit }',
    s.ok && s.held && s.link === 'pi-1:circuit:midi-out -> pi-1:drums:midi-in { drummap circuit }' && s.reading, s.link || s.why);
  ok('making it opens the read once and draws an empty grid', counts().taps === 1 && screens.length === 1 && screens[0].step === 0);
  feed([0x99, 60, 96, 0x89, 60, 0]);
  feed([0x99, 62, 96, 0x99, 64, 96, 0x99, 65, 96]);
  ok('drums 1 to 4 on channel 10 play kick, snare, closed hat, open hat', hits.join(',') === 'kick,snare,hhc,hho', hits.join(','));
  ok('running status: 99 3c 60 3e 60 is two hits', (feed([0x99, 60, 96, 62, 96]), hits.slice(4).join(',') === 'kick,snare'), hits.join(','));
  hits.length = 0;
  feed([0x90, 60, 100, 0x91, 64, 100, 0x80, 60, 0]);
  ok('NEGATIVE CONTROL: synth 1 and synth 2 playing 60 and 64 play no drum', hits.length === 0, hits.join(','));
  feed([0x99, 66, 96, 0x99, 48, 96]);
  ok('NEGATIVE CONTROL: a channel 10 note outside the map plays nothing', hits.length === 0, hits.join(','));
  feed([0xB9, 8, 64, 0xC9, 3, 0xF0, 0x00, 0x20, 0x29, 0x01, 0x60, 0x40, 0xF7]);
  ok('NEGATIVE CONTROL: a drum CC, a program change and SysEx play nothing', hits.length === 0, hits.join(','));
  const st = await ask({ type: 'cdrums.status' });
  ok('the state counts what crossed and what was dropped at the link', st.counts.played === 6 && st.counts.dropped >= 5 && st.counts.notes >= 6,
    JSON.stringify(st.counts));
  ok('the read to hit time is kept', st.lat.n === 6, JSON.stringify(st.lat));
  ok('the grid shows rows lit, four rows of 16', st.grid.length === 4 && st.grid.every((r) => r.length === 16) && st.grid.some((r) => r.includes('1')), st.grid.join(' '));
}

console.log('\n== the clock moves the screen ==');
{
  const { screens, feed, ask } = rig();
  await ask({ type: 'cdrums.link' });
  feed([0xFA]);
  const tickMs = 60000 / (122 * 24);
  let at = 1000;
  for (let i = 0; i < 6 * 16; i++) feed([0xF8], (at += tickMs));
  const steps = screens.map((s) => s.step);
  ok('Start then a bar of ticks draws steps 0 to 15 in order', [...new Set(steps)].join(',') === Array.from({ length: 16 }, (_, i) => i).join(','),
    [...new Set(steps)].join(','));
  const st = await ask({ type: 'cdrums.status' });
  ok('the tempo is read off the ticks, 122 bpm', Math.abs(st.clock.bpm - 122) < 0.5, String(st.clock.bpm));
  ok('the grid says it was aligned by Start', st.clock.aligned === 'start' && st.clock.starts === 1);
  feed([0xF8, 0x99, 62, 96], (at += tickMs));
  const last = screens.at(-1);
  ok('a snare on step 0 of the next bar is on the screen', last.pattern[1][0] === '1' && last.step === 0, JSON.stringify(last));
  feed([0xFC]);
  const n = screens.length;
  for (let i = 0; i < 24; i++) feed([0xF8], (at += tickMs));
  ok('NEGATIVE CONTROL: after Stop the ticks redraw nothing', screens.length === n, `${screens.length - n} draws`);
}

console.log('\n== refusals, and letting go ==');
{
  const { feed, ask, counts, hits } = rig({ engine: false });
  await ask({ type: 'cdrums.link' });
  feed([0x99, 60, 96]);
  const st = await ask({ type: 'cdrums.status' });
  ok('with the drums not running, a hit is refused and counted with its reason', st.counts.refused === 1 && st.lastRefusal === 'the drums are not running on the Pi',
    JSON.stringify(st.counts));
  const again = await ask({ type: 'cdrums.link' });
  ok('a second link is the same link, the read opened once', again.already === true && counts().taps === 1);
  const off = await ask({ type: 'cdrums.unlink' });
  ok('unlink lets go of the read', off.held === false && counts().untaps === 1 && !counts().open);
  feed([0x99, 60, 96]);
  ok('NEGATIVE CONTROL: after unlink nothing plays', hits.length === 0);
  const noC = rig({ facts: { ...FACTS, inputs: new Map() } });
  const r = await noC.ask({ type: 'cdrums.link' });
  ok('NEGATIVE CONTROL: with no Circuit the link is refused, naming the port', r.ok === false && /pi-1:circuit:midi-out is not on this board/.test(r.why), r.why);
  const noSc = rig({ facts: { ...FACTS, instruments: {} } });
  const r2 = await noSc.ask({ type: 'cdrums.link' });
  ok('NEGATIVE CONTROL: with no SuperCollider the link is refused, naming the drums', r2.ok === false && /pi-1:drums:midi-in is not on this board/.test(r2.why), r2.why);
}

console.log('\n== through the Circuit input\'s own read (inputs.mjs tap) ==');
{
  const written = [], inbox = [];
  let reading = false, opens = 0;
  const fs = {
    readlinkSync: () => 'card9',
    openSync: (p, fl) => { if ((fl & 3) !== 0) return 9; if (reading) { const e = new Error('EBUSY'); e.code = 'EBUSY'; throw e; } reading = true; opens++; return 10; },
    closeSync: (fd) => { if (fd === 10) reading = false; },
    writeSync: (fd, buf) => { written.push([...buf]); return buf.length; },
    readSync: (fd, buf) => { const c = fd === 10 ? inbox.shift() : null; if (!c) { const e = new Error('EAGAIN'); e.code = 'EAGAIN'; throw e; } buf.set(c); return c.length; },
  };
  const all = createInputs({ inputs: INPUTS.inputs, room: 'studio-1', relay: 'ws://127.0.0.1:1', frame: 960, rate: 48000, name: 't', id: 't',
    spawn: () => { throw new Error('no spawn here'); }, WebSocket: class {}, format, parse, randomId, fs });
  const hits = [];
  const svc = createCircuitDrumsService({ graph: () => graphOf(FACTS), tap: (fn) => all.get('circuit').tap(fn),
    hit: (name) => { hits.push(name); return { ok: true }; } });
  const reply = () => {};
  ok('nothing holds the Circuit\'s input before the link', !reading && opens === 0);
  await svc.handle({ type: 'cdrums.link' }, reply);
  ok('the link opens the input for reading, once', reading && opens === 1);
  const t0 = performance.now();
  inbox.push(Uint8Array.from([0xF8, 0x99, 60, 96, 0xF8, 0xB0, 80, 64, 0x90, 60, 100]));
  await wait(40);
  ok('a kick read off the input plays one hit, the synth note and the macro play none', hits.join(',') === 'kick', hits.join(','));
  const st = svc.status();
  ok('the input is polled fast while read: the hit came within 40 ms', st.counts.played === 1 && performance.now() - t0 < 200, JSON.stringify(st.lat));
  ok('the input says it is read by the board', all.status().circuit.midi.back.taps === 1 && all.status().circuit.midi.back.tapped >= 11,
    JSON.stringify(all.status().circuit.midi.back));
  ok('NEGATIVE CONTROL: nothing at all was written to the Circuit', written.length === 0, JSON.stringify(written));
  ok('NEGATIVE CONTROL: no macro was queued for the room without a page\'s lease', all.status().circuit.midi.back.in === 0, JSON.stringify(all.status().circuit.midi.back));
  await svc.handle({ type: 'cdrums.unlink' }, reply);
  ok('unlink closes the input when no page holds a lease', !reading);
  all.close();
}

console.log(`\n${pass}/${pass + fail} green${fail ? `  (${fail} FAILED)` : ''}\n`);
process.exit(fail ? 1 : 0);
