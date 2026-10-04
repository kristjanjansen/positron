// demo/shell/wire-test.mjs: the envelope's names, and the migration between them, with no socket.
//
//   node demo/shell/wire-test.mjs
//
// `format()` and `parse()` are pure, so the shape every positron page sends is
// gradable here. What is graded is the decision of 2026-10-04: `at` ALWAYS
// means when the thing happens, so the envelope's send stamp is `sent`, and a
// payload may carry `at` again.
//
// THE TRAP THIS FILE EXISTS FOR. Old senders keep existing for a while: the Pi
// board until it is redeployed, the Pico until it is reflashed, a tab left
// open, rows already in `workers/store`. Each of them writes the send stamp as
// `at`. A new reader that took that `at` as an event time would schedule a
// send stamp on nobody's clock, MEASURED up to 159 ms off between machines, as
// if somebody had agreed it. `parse()` renames it to `sent` first.
//
// EIGHT OF THE 16 ARE NEGATIVE CONTROLS, marked `NEGATIVE CONTROL` and counted
// at the end. They are written so the bug they name fails them.
//
// SIX SABOTAGES, MEASURED 2026-10-04, each on a copy of `wire.mjs` in a scratch
// directory with this file beside it, 16/16 before every one:
//
//   W1  `format()` writing the stamp as `at` again            5 red
//   W2  `sent` left out of the envelope list, so no throw     1 red
//   W3  `parse()` not normalising at all                      3 red
//   W4  normalising sets `sent` and keeps the old `at`        2 red
//   W5  normalising on truthiness, so `at: 0` is missed       2 red
//   W6  normalising whenever `at` is there, `sent` or not     2 red
//
// WHAT IS NOT GRADED HERE: `openWire()`, which needs a WebSocket, a relay and a
// room. `/wire/` grades that against the real relay and reads `sent` back.

import { format, parse, normalise } from './wire.mjs';

let pass = 0, fail = 0, neg = 0;
const ok = (name, cond, detail = '') => {
  if (name.startsWith('NEGATIVE CONTROL')) neg++;
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? ', ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ', ' + detail : ''}`); }
};
const throws = (fn) => { try { fn(); return null; } catch (e) { return e.message; } };

console.log('\n== format(): what goes out ==');
{
  const o = JSON.parse(format({ type: 'cue' }, { from: 'f1', seq: 3, sent: 1_000 }));
  ok('the envelope is id, type, from, sent and seq', ['id', 'type', 'from', 'sent', 'seq'].every((k) => k in o)
    && o.from === 'f1' && o.seq === 3 && o.sent === 1_000, JSON.stringify(o));
  ok('NEGATIVE CONTROL: format() writes no envelope `at`', !('at' in o), JSON.stringify(o));

  const before = Date.now();
  const d = JSON.parse(format({ type: 'cue' }, { from: 'f1', seq: 0 }));
  ok('`sent` defaults to the sender\'s Date.now()', d.sent >= before && d.sent <= Date.now(), String(d.sent));

  // An event time on the payload: the reason the stamp moved out of the way.
  const e = JSON.parse(format({ type: 'light.set', at: 60_000 }, { from: 'f1', seq: 1, sent: 1_000 }));
  ok('a payload `at` no longer throws and arrives as written', e.at === 60_000 && e.sent === 1_000, JSON.stringify(e));

  const why = throws(() => format({ type: 'x', sent: 5 }, { from: 'f1', seq: 0 }));
  ok('NEGATIVE CONTROL: a payload `sent` throws, because the envelope would eat it', /"sent" is an envelope field/.test(why || ''), why || 'no throw');
  ok('NEGATIVE CONTROL: a payload `from` still throws', throws(() => format({ from: 'me' }, { from: 'f1', seq: 0 })) !== null);
  ok('NEGATIVE CONTROL: a payload `seq` still throws', throws(() => format({ seq: 9 }, { from: 'f1', seq: 0 })) !== null);
}

console.log('\n== parse(): an old sender, normalised ==');
{
  // What the Pi board's wire.mjs wrote until it is redeployed.
  const old = parse(JSON.stringify({ id: 'a', type: 'board.alive', from: 'pi', at: 1_759_000_000_000, seq: 7 }));
  ok('an old message\'s envelope `at` becomes `sent`', old.kind === 'json' && old.msg.sent === 1_759_000_000_000, JSON.stringify(old.msg));
  ok('NEGATIVE CONTROL: and its `at` is gone, so nothing reads it as an event time', !('at' in old.msg), JSON.stringify(old.msg));

  // The Pico has no calendar and stamps 0 (rig/pico/net/README.md). Zero is a
  // number, and a truthiness test would leave it as an event at the epoch.
  const pico = parse('{"id":"p","type":"graph.announce","from":"pico","at":0,"seq":0}').msg;
  ok('NEGATIVE CONTROL: an old stamp of 0 is normalised too, not skipped as falsy', pico.sent === 0 && !('at' in pico), JSON.stringify(pico));

  // An `at` that is not a number was never an envelope stamp, so it is left alone.
  const word = parse('{"type":"note","at":"foot"}').msg;
  ok('a non-numeric `at` is not taken for an old stamp', word.at === 'foot' && !('sent' in word), JSON.stringify(word));
}

console.log('\n== parse(): a new sender, left alone ==');
{
  const line = format({ type: 'light.set', at: 60_000 }, { from: 'f1', seq: 2, sent: 1_000 });
  const m = parse(line).msg;
  ok('NEGATIVE CONTROL: a new message keeps its event `at` beside its `sent`', m.at === 60_000 && m.sent === 1_000, JSON.stringify(m));
  const plain = parse(format({ type: 'cue' }, { from: 'f1', seq: 3, sent: 2_000 })).msg;
  ok('NEGATIVE CONTROL: a new message with no event time gains no `at`', !('at' in plain) && plain.sent === 2_000, JSON.stringify(plain));
  // `sent: 0` is still the new shape: `in`, not truthiness, decides it.
  const zero = normalise({ type: 'x', sent: 0, at: 60_000 });
  ok('a `sent` of 0 still marks the new shape, so `at` stays the event time', zero.sent === 0 && zero.at === 60_000, JSON.stringify(zero));
}

console.log('\n== parse(): the other kinds are untouched ==');
{
  const b = parse(new ArrayBuffer(12));
  ok('binary is binary, with its byte count', b.kind === 'binary' && b.msg === null && b.bytes === 12);
  const u = parse('not json {');
  ok('an unreadable frame is reported, not thrown', u.kind === 'unreadable' && u.msg === null);
}

console.log(`\n${pass} ok, ${fail} failed, ${neg} of them negative controls`);
process.exit(fail ? 1 : 0);
