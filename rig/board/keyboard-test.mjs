// rig/board/keyboard-test.mjs: the MK-425C into the Circuit by the board, on a fake keyboard stream and the
// Circuit input's own gate (inputs.mjs) over a fake raw MIDI port. No board, socket or instrument.
// node rig/board/keyboard-test.mjs  why: lessons/rig-board-keyboard.md#test

import { createKeyboardService, eventOfBytes, bytesOfEvent } from './keyboard.mjs';
import { createSequencerService } from './sequencer.mjs';
import { createInputs, parseInputs } from './inputs.mjs';
import { createMidiParser } from './midi-back.mjs';
import { aliveMsg, helloMsg } from './beat.mjs';
import { boardGraph } from '../../demo/shell/graph-registry.mjs';
import { DRUM_MAPS } from '../../demo/shell/drum-maps.mjs';
import { format, parse, randomId } from '../../demo/shell/wire.mjs';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? ' | ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' | ' + detail : ''}`); }
};
const hex = (rows) => rows.map((b) => b.map((x) => x.toString(16).toUpperCase().padStart(2, '0')).join(' ')).join(' | ');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** The Circuit's input from inputs.mjs over a fake raw port: every writeSync kept whole, as the far side sees it. */
function fakeCircuit() {
  const written = [];
  const fs = {
    readlinkSync: () => 'card9', openSync: () => 9, closeSync: () => {},
    writeSync: (fd, buf) => { written.push([...buf]); return buf.length; },
    readSync: () => { const e = new Error('EAGAIN'); e.code = 'EAGAIN'; throw e; },
  };
  const { inputs } = parseInputs(JSON.stringify({ circuit: { device: 'hw:CARD=Fake,DEV=0', channels: 2, midi: { port: 'Circuit', channels: [1, 2, 10] } } }));
  const all = createInputs({ inputs, room: 'studio-1', relay: 'ws://127.0.0.1:1', frame: 960, rate: 48000, name: 't', id: 't',
    spawn: () => { throw new Error('no spawn here'); }, WebSocket: class {}, format, parse, randomId, fs });
  const refusals = [];
  const midiSend = (bytes, refused) => all.get('circuit').handle({ type: 'midi.send', bytes },
    (type, body) => { if (type === 'midi.refused') { refusals.push(body?.why); refused(body?.why || 'refused'); } });
  return { written, midiSend, refusals, close: () => all.close() };
}

/** The keyboard as a stream the test plays: `play(bytes)` is one chunk read off the device. */
function fakeKeyboard() {
  const k = { present: true, opened: 0, closed: 0, h: null };
  k.open = (card, h) => { k.opened++; k.h = h; return { close: () => { k.closed++; k.h = null; } }; };
  k.play = (bytes) => k.h?.data(Uint8Array.from(bytes));
  k.unplug = (why = 'No such device') => { const h = k.h; k.h = null; k.present = false; h?.end(why); };
  return k;
}
/** Timers that fire only when the test says so. */
function fakeTimers() {
  const fns = new Set();
  return { setTimer: (fn) => { fns.add(fn); return fn; }, clearTimer: (fn) => fns.delete(fn), tick: () => { for (const f of fns) f(); } };
}

const GRAPH = (withKeys = true) => boardGraph({ room: 'studio-1', gpu: false, sequencer: true, drums: { circuit: DRUM_MAPS.circuit },
  inputs: [{ name: 'circuit', channels: 2, midi: { port: 'Circuit', channels: [1, 2, 10] } }],
  alsa: withKeys ? [{ client: 'MK-425C USB MIDI Keyboard' }] : [] });

function rig({ graph = GRAPH(), refresh = () => {} } = {}) {
  const c = fakeCircuit(), k = fakeKeyboard(), t = fakeTimers(), notes = [];
  let ms = 0;
  const svc = createKeyboardService({ graph: () => graph, refresh, midiSend: c.midiSend, open: k.open, present: () => k.present,
    onNote: (ev) => notes.push(ev), setTimer: t.setTimer, clearTimer: t.clearTimer, now: () => (ms += 0.25) });
  const answers = [];
  const ask = async (msg) => { let out = null; await svc.handle(msg, (type, body) => { answers.push({ type, ...body }); out = { type, ...body }; }); return out; };
  return { c, k, t, svc, ask, notes, answers };
}

console.log('\n== bytes to events and back ==');
{
  ok('a note on at velocity 0 is a note off', same(eventOfBytes([0x91, 60, 0]), { cls: 'note', ch: 2, d1: 60, d2: 0, off: true }));
  ok('a note off writes 8n nn 00', same(bytesOfEvent({ cls: 'note', ch: 1, d1: 60, d2: 64, off: true }), [0x80, 60, 0]));
  ok('NEGATIVE CONTROL: bend and touch are never written by this file', bytesOfEvent({ cls: 'bend', ch: 1, d1: 0, d2: 64 }) === null
    && bytesOfEvent({ cls: 'touch', ch: 1, d1: 9, d2: 9 }) === null);
}

console.log('\n== the link, and a key on the keyboard into the Circuit ==');
{
  const { c, k, svc, ask, notes } = rig();
  ok('nothing is opened and nothing written before a link is asked for', k.opened === 0 && c.written.length === 0);
  ok('it answers the three kbd verbs and nothing else', ['kbd.link', 'kbd.unlink', 'kbd.status'].every((x) => svc.handles({ type: x }))
    && !svc.handles({ type: 'midi.send' }) && !svc.handles({ type: 'seq.start' }));
  const bad = await ask({ type: 'kbd.link', channel: 10 });
  ok('NEGATIVE CONTROL: channel 10 is refused, the link is to synth 1 or 2', bad.ok === false && /1 or 2/.test(bad.why) && k.opened === 0, bad.why);
  const st = await ask({ type: 'kbd.link', channel: 1 });
  ok('kbd.link 1 holds pi-1:mk-425c -> pi-1:circuit { channel 1 } and opens the keyboard',
    st.ok && st.held && st.link === 'pi-1:mk-425c:midi-out -> pi-1:circuit:midi-in { channel 1 }' && st.reading && k.opened === 1, st.why || st.link);
  k.play([0x91, 47, 100]);
  ok('the lowest key on channel 2 writes exactly 90 2F 64 to the Circuit', same(c.written, [[0x90, 47, 100]]), hex(c.written));
  k.play([0x91, 47, 0]);
  ok('its release writes exactly 80 2F 00', same(c.written.at(-1), [0x80, 47, 0]), hex(c.written));
  c.written.length = 0;
  k.play([0x91, 60, 90, 62, 91]);
  ok('running status: two notes from one status byte, two writes', same(c.written, [[0x90, 60, 90], [0x90, 62, 91]]), hex(c.written));
  k.play([0x81, 60, 64]); k.play([0x81, 62, 64]);
  ok('a note on is told to the screen, a note off is not', notes.length === 3);
  c.written.length = 0;

  // SysEx from the keyboard, including the head of a Circuit Replace Patch, split over three reads with clock between.
  const replace = [0xF0, 0x00, 0x20, 0x29, 0x01, 0x60, 0x01, 0x00, ...Array(20).fill(0x11), 0xF7];
  k.play(replace.slice(0, 9)); k.play([0xF8, ...replace.slice(9, 20), 0xF8]); k.play(replace.slice(20));
  ok('NEGATIVE CONTROL: SysEx from the keyboard never reaches the Circuit writer, split across reads with clock inside',
    c.written.length === 0 && svc.status().counts.sysex === 1, hex(c.written) || 'nothing written');
  k.play([0xF0, 0x7E, 0x7F, 0x06, 0x01, 0xF7]);
  ok('NEGATIVE CONTROL: a Device Inquiry from the keyboard is not passed on either, though the gate would allow it', c.written.length === 0);
  k.play([0xF8, 0xFA, 0xF8, 0xFC]);
  ok('NEGATIVE CONTROL: clock, start and stop from the keyboard are dropped', c.written.length === 0 && svc.status().counts.realtime >= 6);
  k.play([0xE1, 0x00, 0x50]);
  ok('NEGATIVE CONTROL: pitch bend is dropped by the link, since the Circuit\'s midi-in does not accept bend', c.written.length === 0 && svc.status().counts.dropped === 1);
  k.play([0xB1, 74, 33]);
  ok('a synth control (CC 74, filter) goes on channel 1', same(c.written, [[0xB0, 74, 33]]), hex(c.written));
  k.play([0xB1, 1, 99]);
  ok('NEGATIVE CONTROL: the mod wheel (CC 1) is refused by the Circuit\'s gate and counted', c.written.length === 1 && svc.status().counts.refused === 1, svc.status().lastRefusal);
  k.play([0xC1, 5]);
  ok('a program change 0 to 63 on a synth channel passes, as the port and the gate both allow', same(c.written.at(-1), [0xC0, 5]), hex(c.written));
  k.play([0xC1, 70]);
  ok('NEGATIVE CONTROL: a program change above 63 is refused by the gate', same(c.written.at(-1), [0xC0, 5]) && svc.status().counts.refused === 2);
  k.play([0xF0, 0x01, 0x91, 64, 100]);
  ok('a note after an unclosed SysEx still plays: a status byte ends the SysEx', same(c.written.at(-1), [0x90, 64, 100]), hex([c.written.at(-1)]));
  c.written.length = 0;
  const two = await ask({ type: 'kbd.link', channel: 2 });
  ok('moving to synth 2 first ends the held note on channel 1', same(c.written[0], [0x80, 64, 0]) && two.link.endsWith('{ channel 2 }'), hex(c.written));
  k.play([0x91, 65, 80]);
  ok('then a key writes on channel 2', same(c.written.at(-1), [0x91, 65, 80]), hex(c.written));
  c.written.length = 0;
  const un = await ask({ type: 'kbd.unlink' });
  ok('kbd.unlink ends the held note, closes the keyboard and holds no link', same(c.written, [[0x81, 65, 0]]) && un.held === false && !un.reading && k.closed >= 1, hex(c.written));
  k.play([0x91, 66, 80]);
  ok('NEGATIVE CONTROL: after unlink a key reaches nothing', c.written.length === 1);
  ok('the latency key counts every note on forwarded', svc.status().lat.n >= 5, JSON.stringify(svc.status().lat));
  c.close(); svc.stop();
}

console.log('\n== a replug, and a board without the keyboard ==');
{
  const { c, k, t, svc, ask } = rig();
  await ask({ type: 'kbd.link', channel: 1 });
  k.play([0x91, 50, 100]);
  c.written.length = 0;
  k.unplug();
  ok('an unplug ends the note it held and stops reading', same(c.written, [[0x80, 50, 0]]) && !svc.status().reading, hex(c.written));
  t.tick();
  ok('while it is away nothing is opened', k.opened === 1 && /not plugged in/.test(svc.status().why || ''), svc.status().why);
  k.present = true; t.tick();
  ok('back in, it is opened again and the link was kept', k.opened === 2 && svc.status().reading && svc.status().held);
  k.play([0x91, 51, 100]);
  ok('and a key plays again', same(c.written.at(-1), [0x90, 51, 100]));
  ok('the beat says the link is held on channel 1 and read', same(svc.beat(), { held: true, target: 'circuit', channel: 1, reading: true, forwarded: svc.status().counts.forwarded }));
  const alive = aliveMsg({ name: 'b', id: 'b', upSec: 1, audio: null, voices: 0, frames: 0, insert: {}, kbd: svc.beat() });
  ok('board.alive carries it', alive.kbd?.held === true && alive.kbd?.channel === 1);
  const hello = helloMsg({ name: 'b', id: 'b', backend: 'x', ports: [], dry: false, since: 0, frameMs: 20, instruments: {}, graphFacts: { room: 'studio-1' }, kbd: svc.beat() });
  ok('board.hello carries it', hello.kbd?.held === true);
  c.close(); svc.stop();

  let refreshed = 0;
  const none = rig({ graph: GRAPH(false), refresh: () => { refreshed++; } });
  const r = await none.ask({ type: 'kbd.link', channel: 1 });
  ok('NEGATIVE CONTROL: with no keyboard on the board the link is refused naming the port, after listing the ports again',
    r.ok === false && /pi-1:mk-425c:midi-out is not on this board/.test(r.why) && refreshed === 1 && none.k.opened === 0, r.why);
  none.c.close(); none.svc.stop();
}

console.log('\n== one writer: the sequencer and the keyboard into one Circuit ==');
{
  const c = fakeCircuit(), k = fakeKeyboard(), t = fakeTimers();
  let clock = 1000;
  const timers = [];
  const seq = createSequencerService({ graph: () => GRAPH(), midiSend: c.midiSend, now: () => clock,
    setTimer: (fn, ms) => { timers.push({ at: clock + ms, fn }); return timers.at(-1); },
    clearTimer: (x) => { const i = timers.indexOf(x); if (i >= 0) timers.splice(i, 1); } });
  const svc = createKeyboardService({ graph: () => GRAPH(), midiSend: c.midiSend, open: k.open, present: () => true, setTimer: t.setTimer, clearTimer: t.clearTimer });
  await svc.handle({ type: 'kbd.link', channel: 1 }, () => {});
  const P = { v: 1, bpm: 120, steps: 16, rows: [{ voice: 'kick', steps: '1'.repeat(16) }, { voice: 'hhc', steps: '1'.repeat(16) }] };
  await seq.handle({ type: 'seq.start', pattern: P }, () => {});
  // Two bars of drums on 10 while the keyboard plays a chord per step on 1, the keyboard's reads landing between the timers.
  let keys = 0;
  for (let i = 0; i < 400 && clock < 5000; i++) {
    timers.sort((a, b) => a.at - b.at);
    const x = timers.shift();
    if (!x) break;
    clock = x.at; x.fn();
    k.play([0x91, 60, 100, 64, 100, 0x81, 60, 0]); k.play([0x91, 64, 0]); keys++;
  }
  await seq.handle({ type: 'seq.stop' }, () => {});
  const whole = c.written.every((b) => (b.length === 3 && b[0] >= 0x80 && b[0] < 0xF0 && b[1] < 0x80 && b[2] < 0x80) || (b.length === 2 && (b[0] & 0xF0) === 0xC0));
  const ch = (b) => (b[0] & 0x0F) + 1;
  const drums = c.written.filter((b) => ch(b) === 10).length, synth = c.written.filter((b) => ch(b) === 1).length;
  ok('every write is one whole message, status first: none split, none merged', whole && c.written.length > 100, `${c.written.length} writes`);
  const reparsed = createMidiParser().feed(c.written.flat());
  ok('the byte stream the Circuit reads parses back to exactly the writes, in order', same(reparsed, c.written));
  ok('both arrive: the drums on 10 and the keys on 1, four keyboard messages per read pair', drums > 50 && synth === keys * 4, `drums ${drums}, keys ${synth}`);
  ok('NEGATIVE CONTROL: nothing written is SysEx', !c.written.some((b) => b[0] === 0xF0));
  c.close(); svc.stop(); seq.stop();
}

console.log('\n== the answers survive the wire ==');
{
  const { answers, ask, svc, c } = rig();
  await ask({ type: 'kbd.link', channel: 2 }); await ask({ type: 'kbd.status' }); await ask({ type: 'kbd.unlink' });
  let why = '';
  try { for (const a of answers) format(a, { from: 'b', seq: 0 }); } catch (e) { why = e.message; }
  ok('NEGATIVE CONTROL: no payload field named like the envelope (from, sent, seq, by)', answers.length === 3 && !why, why || `${answers.length} answers`);
  c.close(); svc.stop();
}

console.log('\n== the keyboard into the board\'s own Plaits ==');
{
  const graph = boardGraph({ room: 'studio-1', gpu: false, instruments: { plaits: true },
    inputs: [{ name: 'circuit', channels: 2, midi: { port: 'Circuit', channels: [1, 2, 10] } }], alsa: [{ client: 'MK-425C USB MIDI Keyboard' }] });
  const c = fakeCircuit(), k = fakeKeyboard(), t = fakeTimers(), played = [];
  let up = true;
  const svc = createKeyboardService({ graph: () => graph, midiSend: c.midiSend, open: k.open, present: () => k.present,
    play: (ev) => (up ? (played.push([ev.d1, ev.off || !ev.d2 ? 0 : ev.d2]), { ok: true }) : { ok: false, why: 'Plaits is not running on the Pi' }),
    setTimer: t.setTimer, clearTimer: t.clearTimer, now: () => 0 });
  const ask = async (msg) => { let out = null; await svc.handle(msg, (type, body) => { out = { type, ...body }; }); return out; };
  const st = await ask({ type: 'kbd.link', target: 'plaits' });
  ok('kbd.link {target: plaits} holds pi-1:mk-425c -> pi-1:plaits with no channel transform', st.ok && st.target === 'plaits'
    && st.link === 'pi-1:mk-425c:midi-out -> pi-1:plaits:midi-in' && st.reading, st.why || st.link);
  k.play([0x91, 60, 100, 0x91, 60, 0]);
  ok('a key plays Plaits on and off, and nothing is written to the Circuit', same(played, [[60, 100], [60, 0]]) && c.written.length === 0, JSON.stringify(played));
  k.play([0xE1, 0x00, 0x50, 0xB1, 74, 33]);
  ok('NEGATIVE CONTROL: bend and CC are dropped at Plaits\' midi-in, which takes notes only', played.length === 2 && svc.status().counts.dropped === 2);
  k.play([0x91, 64, 90]);
  const moved = await ask({ type: 'kbd.link', channel: 1 });
  ok('moving to the Circuit releases the held key on Plaits first', moved.ok && same(played.at(-1), [64, 0]) && /circuit/.test(moved.link || ''), JSON.stringify(played));
  await ask({ type: 'kbd.link', target: 'plaits' });
  up = false;
  k.play([0x91, 65, 90]);
  ok('NEGATIVE CONTROL: with Plaits not started a key is counted refused with the reason', /not running/.test(svc.status().lastRefusal || ''), svc.status().lastRefusal);
  const bad = await ask({ type: 'kbd.link', target: 'speaker' });
  ok('NEGATIVE CONTROL: a target that is not circuit or plaits is refused in words', bad.ok === false && /circuit, plaits/.test(bad.why), bad.why);
  c.close(); svc.stop();
}

console.log(`\n${pass}/${pass + fail} green${fail ? `  (${fail} FAILED)` : ''}\n`);
process.exit(fail ? 1 : 0);
