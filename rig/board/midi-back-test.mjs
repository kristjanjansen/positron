// rig/board/midi-back-test.mjs: the Circuit's macro knobs, read back and told
// to the room, graded with no board, no ALSA and no relay.
//
//   node rig/board/midi-back-test.mjs
//
// Negative controls are marked NEGATIVE: each is written so the bug it names
// would fail it. What is NOT graded here: that the Pi's raw MIDI input really
// carries the Circuit's hand turns (measured on the Mac through Web MIDI only,
// research/measured-devices-2026-09-20.md), and the real relay.

import { EventEmitter } from 'node:events';
import { constants as FS_C } from 'node:fs';
import { createMidiParser, backVerdict, createBackLimiter, BACK_CC, GAP_MS } from './midi-back.mjs';
import { createInputs, parseInputs } from './inputs.mjs';

let pass = 0, fail = 0;
const is = (name, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { pass++; console.log(`  ok   ${name}`); } else { fail++; console.log(`  FAIL ${name}\n       got  ${g}\n       want ${w}`); }
};

// ── the parser ──────────────────────────────────────────────────────────────
{
  const p = createMidiParser();
  is('a control change in one chunk', p.feed([0xB0, 80, 64]), [[0xB0, 80, 64]]);
  is('split across chunks, clock inside it', [p.feed([0xB0, 0xF8]), p.feed([81, 0xF8, 10])], [[], [[0xB0, 81, 10]]]);
  is('running status', p.feed([0xB0, 82, 1, 82, 2]), [[0xB0, 82, 1], [0xB0, 82, 2]]);
  is('NEGATIVE: a SysEx body is not read as control changes', p.feed([0xF0, 0x00, 0x20, 0x29, 0x50, 0x10, 0xF7]), []);
  is('and the stream after it reads again', p.feed([0xB0, 83, 5]), [[0xB0, 83, 5]]);
  is('a program change is two bytes', p.feed([0xC0, 7, 0xB0, 84, 9]), [[0xC0, 7], [0xB0, 84, 9]]);
  is('NEGATIVE: data with no status before it is dropped', createMidiParser().feed([80, 64, 0xB0, 80, 1]), [[0xB0, 80, 1]]);
}

// ── what a page is told ─────────────────────────────────────────────────────
{
  is('macro 1 on Synth 1', backVerdict([0xB0, 80, 64]), { ch: 1, cc: 80, v: 64 });
  is('macro 8 on Synth 2', backVerdict([0xB1, 87, 127]), { ch: 2, cc: 87, v: 127 });
  is('every macro and only the macros', BACK_CC, [80, 81, 82, 83, 84, 85, 86, 87]);
  is('NEGATIVE: CC 79 is not a macro', backVerdict([0xB0, 79, 1]), null);
  is('NEGATIVE: CC 88 is not a macro', backVerdict([0xB0, 88, 1]), null);
  is('NEGATIVE: the master filter on 16 is not told', backVerdict([0xBF, 74, 1]), null);
  is('NEGATIVE: a macro number on the drum channel is not told', backVerdict([0xB9, 80, 1]), null);
  is('NEGATIVE: a note is not told', backVerdict([0x90, 80, 100]), null);
}

// ── the limiter ─────────────────────────────────────────────────────────────
{
  let t = 0; const timers = [];
  const out = [];
  const lim = createBackLimiter({ emit: (e) => out.push(e), now: () => t,
    setTimer: (fn, ms) => { const h = { at: t + ms, fn }; timers.push(h); return h; },
    clearTimer: (h) => { const i = timers.indexOf(h); if (i >= 0) timers.splice(i, 1); } });
  const run = (ms) => { const until = t + ms; for (;;) { timers.sort((a, b) => a.at - b.at); if (!timers.length || timers[0].at > until) break; const h = timers.shift(); t = h.at; h.fn(); } t = until; };
  lim.push({ ch: 1, cc: 80, v: 0 });
  is('the first value goes at once', out, [{ ch: 1, cc: 80, v: 0 }]);
  // A hand sweep: 40 values in 40 ms.
  for (let i = 1; i <= 40; i++) { t += 1; lim.push({ ch: 1, cc: 80, v: i }); }
  is('a sweep inside one gap sends nothing more yet', out.length, 1);
  run(GAP_MS);
  is('and then the LAST value, not the first', out.at(-1), { ch: 1, cc: 80, v: 40 });
  is('two in all for forty one moves', out.length, 2);
  lim.push({ ch: 1, cc: 81, v: 5 });
  is('a second controller has its own gap', out.at(-1), { ch: 1, cc: 81, v: 5 });
  lim.push({ ch: 1, cc: 80, v: 99 });
  run(200);
  is('NEGATIVE: the value a hand stopped on is never dropped', out.filter((e) => e.cc === 80).at(-1).v, 99);
  is('the counts say how many were folded', lim.counts(), { in: 43, out: 4, folded: 39 });
}

// ── the board's own input, against a fake raw MIDI port ─────────────────────
{
  const cfg = parseInputs('{"circuit":{"device":"hw:CARD=Pro,DEV=0","channels":2,"take":1,"midi":{"port":"Circuit","channels":[1,2,10]}}}');
  let t = 0; const timers = [];
  const inbox = [], opens = [], writes = [];
  let readOpen = 0;
  const EAGAIN = () => { const e = new Error('EAGAIN'); e.code = 'EAGAIN'; return e; };
  const READ = FS_C.O_RDONLY | FS_C.O_NONBLOCK;
  const fs = {
    readlinkSync: () => 'card7',
    openSync: (pth, fl) => { opens.push(fl === READ ? 'read' : 'write'); if (fl === READ) { if (readOpen) { const e = new Error('EBUSY'); e.code = 'EBUSY'; throw e; } readOpen++; return 77; } return 42; },
    readSync: (fd, buf) => { if (fd !== 77) throw new Error('read on the wrong fd'); const c = inbox.shift(); if (!c) throw EAGAIN(); buf.set(c); return c.length; },
    writeSync: (fd, buf) => { writes.push([...buf]); return buf.length; },
    closeSync: (fd) => { if (fd === 77) readOpen--; },
  };
  const sock = [];
  class WS { constructor() { this.readyState = 1; this.sent = []; sock.push(this); } send(x) { this.sent.push(x); } close() { this.readyState = 3; } }
  const hw = createInputs({ inputs: cfg.inputs, room: 'r', relay: 'wss://x', frame: 3, rate: 48000, name: 'pi', id: 'pi',
    spawn: () => { const p = new EventEmitter(); p.stdout = new EventEmitter(); p.stderr = new EventEmitter(); p.kill = () => p.emit('exit'); return p; },
    WebSocket: WS, format: (m, e) => JSON.stringify({ ...m, ...e }), parse: (x) => ({ kind: 'json', msg: JSON.parse(x) }),
    randomId: () => 'x', now: () => t, fs, leaseMs: 60_000, beatMs: 5_000,
    setTimer: (fn, ms) => { const h = { at: t + ms, fn }; timers.push(h); return h; } });
  const run = (ms) => { const until = t + ms; for (;;) { timers.sort((a, b) => a.at - b.at); if (!timers.length || timers[0].at > until) break; const h = timers.shift(); t = h.at; h.fn(); } t = until; };
  const told = () => sock[0].sent.filter((x) => typeof x === 'string').map((x) => JSON.parse(x)).filter((m) => m.type === 'midi.cc');
  const c = hw.get('circuit'); c.connect();

  inbox.push(Uint8Array.from([0xB0, 80, 100]));
  run(100);
  is('NEGATIVE: nothing is read while nobody holds the lease', [opens.includes('read'), told().length], [false, 0]);

  c.handle({ type: 'input.want', id: 'w' });
  is('the lease opens the input, read only and non-blocking', opens.filter((o) => o === 'read').length, 1);
  run(100);
  is('a macro turned on the Circuit reaches the room', told().map(({ input, ch, cc, v }) => ({ input, ch, cc, v })), [{ input: 'circuit', ch: 1, cc: 80, v: 100 }]);
  // The Circuit's clock, a note from its own keys, the filter and a sweep.
  const sweep = [];
  for (let v = 0; v <= 127; v += 4) sweep.push(0xB0, 83, v);
  inbox.push(Uint8Array.from([0xF8, 0x90, 60, 90, 0xF8, 0xBF, 74, 3, ...sweep, 0xF8]));
  run(200);
  is('NEGATIVE: the clock, a note and the filter on 16 are not told', told().filter((m) => m.cc !== 80 && m.cc !== 83).length, 0);
  is('a sweep is told rate limited, ending on the value the hand stopped on', [told().filter((m) => m.cc === 83).length < 4, told().filter((m) => m.cc === 83).at(-1)?.v], [true, 124]);
  is('NEGATIVE: nothing that came in was written back to the instrument', writes, []);
  is('the status says the listener is open and how many it told', [c.status().midi.back.open, c.status().midi.back.sent], [true, told().length]);

  // A patch dump asked while the listener holds the input rides on its reads.
  const REQ = [0xF0, 0x00, 0x20, 0x29, 0x01, 0x60, 0x40, 0x00, 0xF7];
  c.handle({ type: 'midi.send', id: 'd', bytes: REQ });
  is('NEGATIVE: the question does not open the input a second time', opens.filter((o) => o === 'read').length, 1);
  const reply = [0xF0, 0x00, 0x20, 0x29, 0x01, 0x60, 0x00, 0x00, 0x00, ...Array(340).fill(0x10), 0xF7];
  inbox.push(Uint8Array.from([0xB0, 81, 7, ...reply.slice(0, 200)]), Uint8Array.from([0xF8, ...reply.slice(200)]));
  run(100);
  const patch = sock[0].sent.filter((x) => typeof x === 'string').map((x) => JSON.parse(x)).filter((m) => m.type === 'midi.patch');
  is('and the patch still comes back whole', [patch.length, patch[0]?.ok, patch[0]?.bytes?.length], [1, true, 350]);
  is('while a macro in the same chunk is told too', told().some((m) => m.cc === 81 && m.v === 7), true);

  t += 61_000; c.s.lastHeard = t; c.beat();
  is('when the lease runs out the input is closed', [readOpen, c.status().midi.back.open], [0, false]);
  inbox.push(Uint8Array.from([0xB0, 80, 1]));
  const before = told().length;
  run(100);
  is('NEGATIVE: and nothing more is told', told().length, before);
  hw.close();
}

{
  // NEGATIVE CONTROL: a busy input is said, not thrown, and the page still plays.
  const cfg = parseInputs('{"circuit":{"device":"hw:CARD=Pro,DEV=0","channels":2,"take":1,"midi":{"port":"Circuit","channels":[1]}}}');
  const lines = [];
  const fs = { readlinkSync: () => 'card7', openSync: (p, fl) => { if (fl === (FS_C.O_RDONLY | FS_C.O_NONBLOCK)) { const e = new Error('EBUSY'); e.code = 'EBUSY'; throw e; } return 42; },
    readSync: () => 0, writeSync: (fd, b) => b.length, closeSync: () => {} };
  class WS { constructor() { this.readyState = 1; this.sent = []; } send(x) { this.sent.push(x); } close() {} }
  const hw = createInputs({ inputs: cfg.inputs, room: 'r', relay: 'wss://x', frame: 3, rate: 48000, name: 'pi', id: 'pi',
    spawn: () => { const p = new EventEmitter(); p.stdout = new EventEmitter(); p.stderr = new EventEmitter(); p.kill = () => p.emit('exit'); return p; },
    WebSocket: WS, format: (m, e) => JSON.stringify({ ...m, ...e }), parse: (x) => ({ kind: 'json', msg: JSON.parse(x) }),
    randomId: () => 'x', now: () => 0, fs, setTimer: () => 0, log: (l) => lines.push(l) });
  const c = hw.get('circuit'); c.connect();
  let threw = false;
  try { c.handle({ type: 'input.want', id: 'w' }); c.handle({ type: 'input.want', id: 'w2' }); } catch { threw = true; }
  is('a busy input does not throw out of the handler', threw, false);
  is('and is logged once, not per renewal', lines.filter((l) => /macro knobs, EBUSY/.test(l)).length, 1);
  hw.close();
}

console.log(`\n${pass}/${pass + fail} green`);
process.exit(fail ? 1 : 0);
