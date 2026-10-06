// demo/shell/bay-test.mjs — the patch bay's arithmetic, with no browser, no
// socket and no instrument.
//
//   node demo/shell/bay-test.mjs
//
// The bay's whole job is to REFUSE things, and a validator is the one kind of
// code that passes a naive test suite by accident: write only valid patches and
// a function that returns `{ok: true}` unconditionally scores full marks.
//
// SO MOST OF THESE ARE NEGATIVE CONTROLS. Each one is a patch that must be
// refused, and each asserts the REASON as well as the refusal, because a
// validator that refuses everything for one reason is the same bug from the
// other side.
//
// 🔴 THE UNIVERSAL MEDIA SECTIONS (A TO K, 2026-10-04) WERE PROVED BY BREAKING
// `bay.mjs` ON A SCRATCH COPY, ONE FAULT AT A TIME, against 112 green:
//
//   sabotage                                        red
//   consent check removed (`if (false)`)            4 of 112
//   where always 'machine'                          5 of 112
//   transforms allowed on non-MIDI links            3 of 112
//   video on one network says 'round trip 12 ms'    2 of 112
//   audio on one network says 'board round trip 3 ms'  2 of 112
//
// ⚠️ THE FOURTH ROW WAS 1 OF 112 THE FIRST TIME, AND THAT IS WHY IT IS HERE.
// The check that no cell invents a number looked for bare digits, and `12`
// is in the plan as `12 byte header`. It compares number and unit now.

import { createBay, apply, delivers, printLink, parseLink, printPatch, parsePatch,
  classOf, checkTransforms, CLASSES, MEDIA, STALE_MS, OP_NAMES, OP_HELP,
  OP_SAYS, HEAVY, NODE_KINDS, WHERE, TRANSPORTS, chooseTransport,
  RELAY, READS, TRANSPORT_NAMES, MACHINE_ONLY } from './bay.mjs';
import { STALE_MS as REGISTRY_STALE_MS } from './graph-registry.mjs';
import { decode } from './midi-decode.mjs';

/**
 * 🔴 A REFUSAL IS TWO SENTENCES SINCE 2026-09-22, SO THE TWO HALVES ARE READ
 * SEPARATELY HERE. `checkTransforms` answers `''` or `{ why, fix }`: `why` is
 * the problem in words and `fix` is the thing a person can do. Every check
 * below that used to match one string matches `why`, and the claim behind it
 * did not move: a refusal still has to name the thing that is wrong.
 */
const why = (t) => checkTransforms(t).why || '';
const fix = (t) => checkTransforms(t).fix || '';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? ' · ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' · ' + detail : ''}`); }
};

// A desk that matches the real one, with the measured facts in it.
function desk({ accepts = ['note', 'cc', 'bend'] } = {}) {
  const b = createBay();
  b.addPort({ id: 'here:mk425c:out', label: 'MK-425C', dir: 'out', medium: 'midi',
    shape: { protocol: '1.0' }, emits: ['note', 'cc', 'bend'] });
  b.addPort({ id: 'here:circuit:in', label: 'Circuit', dir: 'in', medium: 'midi',
    shape: { protocol: '1.0' }, accepts, never: ['sysex'], deliver: (e) => heard.push(e) });
  b.addPort({ id: 'here:circuit:out', label: 'Circuit out', dir: 'out', medium: 'midi',
    shape: { protocol: '1.0' }, emits: ['note', 'cc', 'clock'] });
  b.addPort({ id: 'here:mk425c:in', label: 'MK-425C in', dir: 'in', medium: 'midi',
    shape: { protocol: '1.0' }, accepts: ['note', 'cc', 'bend', 'clock'] });
  b.addPort({ id: 'here:board:in', label: 'board', dir: 'in', medium: 'midi',
    shape: { protocol: '1.0' }, accepts: ['note', 'cc', 'bend'] });
  b.addPort({ id: 'here:ftpro:in', label: 'Fast Track Pro', dir: 'in', medium: 'audio',
    shape: { rate: 48000, channels: 2, frameMs: 20 }, accepts: [] });
  b.addPort({ id: 'here:circuit:audio', label: 'Circuit audio', dir: 'out', medium: 'audio',
    shape: { rate: 48000, channels: 2, frameMs: 20 }, emits: [] });
  return b;
}
let heard = [];
const ev = (bytes) => { const m = decode(bytes); return { cls: classOf(m), ch: m.ch, d1: m.d1, d2: m.d2 }; };

console.log('\n== the patch bay ==');

// ── what it allows ─────────────────────────────────────────────────────────

{
  const b = desk();
  const r = b.link('here:mk425c:out', 'here:circuit:in', [{ op: 'channel', to: 1 }]);
  ok('a keyboard may reach a synth', r.ok, r.why || r.id);
}

{
  // 1. The smallest useful patch on this desk, and every number in it is
  //    measured: the MK-425C's global channel is 2, the Circuit's first synth
  //    listens on 1, and the keyboard is a semitone flat.
  heard = [];
  const b = desk();
  b.link('here:mk425c:out', 'here:circuit:in', [{ op: 'channel', to: 1 }, { op: 'transpose', by: 1 }]);
  b.send('here:mk425c:out', ev([0x91, 47, 100]));      // lowest key, channel 2
  ok('a note arrives on channel 1, a semitone up',
    heard.length === 1 && heard[0].ch === 1 && heard[0].d1 === 48,
    heard.length ? `ch ${heard[0].ch}, note ${heard[0].d1}` : 'nothing arrived');
}

{
  // 2. NEGATIVE CONTROL for the one above. With no transforms the event must
  //    arrive UNCHANGED, or the test above would pass on a bay that rewrote
  //    every event to something plausible.
  heard = [];
  const b = desk();
  b.link('here:mk425c:out', 'here:circuit:in', []);
  b.send('here:mk425c:out', ev([0x91, 47, 100]));
  ok('and with no transforms nothing about it changes',
    heard.length === 1 && heard[0].ch === 2 && heard[0].d1 === 47,
    heard.length ? `ch ${heard[0].ch}, note ${heard[0].d1}` : 'nothing arrived');
}

{
  // 3. Fan out is free and needs no graph walk.
  heard = [];
  const b = desk();
  b.link('here:mk425c:out', 'here:circuit:in', []);
  b.link('here:mk425c:out', 'here:board:in', []);
  const n = b.send('here:mk425c:out', ev([0x91, 60, 100]));
  ok('one source reaches two destinations', n === 2, `${n} deliveries`);
}

// ── what it refuses, which is the point ────────────────────────────────────

{
  // 4. THE ONE THAT MATTERS ON THIS DESK. The Circuit has no factory reset and
  //    one byte inside a SysEx message overwrites a patch.
  const b = desk();
  b.addPort({ id: 'here:dump:out', label: 'dumper', dir: 'out', medium: 'midi',
    shape: { protocol: '1.0' }, emits: ['note', 'sysex'] });
  const r = b.link('here:dump:out', 'here:circuit:in', []);
  ok('a link that could carry SysEx to the Circuit is refused',
    !r.ok && /sysex/i.test(r.why), r.why);
}

{
  // 5. NEGATIVE CONTROL for 4. The same source is allowed once SysEx is dropped,
  //    or the refusal above would be a bay that simply refuses that port.
  const b = desk();
  b.addPort({ id: 'here:dump:out', label: 'dumper', dir: 'out', medium: 'midi',
    shape: { protocol: '1.0' }, emits: ['note', 'sysex'] });
  const r = b.link('here:dump:out', 'here:circuit:in', [{ op: 'drop', cls: 'sysex' }]);
  ok('and the same link is allowed once SysEx is dropped', r.ok, r.why);
}

{
  // 6. The guard is at the DESTINATION and is not only a connect time check: an
  //    event of a class the port never consented to must not be delivered even
  //    if a link somehow exists.
  heard = [];
  const b = desk({ accepts: ['note'] });
  b.link('here:mk425c:out', 'here:circuit:in', [{ op: 'only', cls: 'note' }]);
  b.send('here:mk425c:out', ev([0xb1, 74, 64]));       // a control change
  ok('a class the destination never accepted is not delivered',
    heard.length === 0, `${heard.length} arrived`);
}

{
  // 7. A cycle. Easy to build by accident the moment two boxes are involved,
  //    and it echoes forever at wire speed.
  const b = desk();
  b.addPort({ id: 'here:mk425c:thru', label: 'MK-425C thru', dir: 'out', medium: 'midi',
    shape: { protocol: '1.0' }, emits: ['note'] });
  b.link('here:mk425c:out', 'here:circuit:in', []);
  const r = b.link('here:circuit:out', 'here:mk425c:in', []);
  ok('a link that closes a loop is refused and says which way round',
    !r.ok && /loop/i.test(r.why), r.why);
}

{
  // 8. Mediums.
  const b = desk();
  const r = b.link('here:mk425c:out', 'here:ftpro:in', []);
  ok('a MIDI port cannot feed an audio port', !r.ok && /midi|audio/.test(r.why), r.why);
}

{
  // 9. A shape mismatch NAMES THE FIELD. "incompatible" is a refusal somebody
  //    has to debug; a number against a number is one they can fix.
  const b = desk();
  b.addPort({ id: 'here:board:out', label: 'board', dir: 'out', medium: 'audio',
    shape: { rate: 44100, channels: 2, frameMs: 20 }, emits: [] });
  const r = b.link('here:board:out', 'here:ftpro:in', []);
  ok('a shape mismatch names the field and both values',
    !r.ok && r.why.includes('rate') && r.why.includes('44100') && r.why.includes('48000'), r.why);
}

{
  // 10. NEGATIVE CONTROL for 9: the same two ports connect once the rate agrees.
  const b = desk();
  b.addPort({ id: 'here:board:out', label: 'board', dir: 'out', medium: 'audio',
    shape: { rate: 48000, channels: 2, frameMs: 20 }, emits: [] });
  const r = b.link('here:board:out', 'here:ftpro:in', []);
  ok('and the same pair connects once the rate agrees', r.ok, r.why);
}

{
  const b = desk();
  ok('a port that does not exist is named in the refusal',
    !b.link('here:nothing:out', 'here:circuit:in', []).ok
    && b.link('here:nothing:out', 'here:circuit:in', []).why.includes('here:nothing:out'),
    b.link('here:nothing:out', 'here:circuit:in', []).why);
}

{
  const b = desk();
  const r = b.link('here:circuit:in', 'here:circuit:in', []);
  ok('an input cannot be a source', !r.ok, r.why);
}

{
  // 11. Transforms that leave NO class at all would make a link that looks
  //     connected and carries nothing, which is this project's definition of a
  //     lie. `mk425c:out` emits note, cc and bend, so keeping only sysex keeps
  //     nothing. ⚠️ A DIFFERENT REFUSAL FROM 11c BELOW: here the SOURCE is left
  //     with nothing, there the DESTINATION takes none of what arrives.
  const b = desk();
  const r = b.link('here:mk425c:out', 'here:circuit:in', [{ op: 'only', cls: 'sysex' }]);
  ok('a link whose transforms leave no class at all is refused',
    !r.ok && /nothing/.test(r.why), r.why);
}

// ── transforms ─────────────────────────────────────────────────────────────

{
  // 12. Out of range is a DROP, not a clamp. A clamp turns the top of a
  //     keyboard into a pile of one note, which sounds like a stuck key.
  ok('a transpose off the end of the keyboard drops the note',
    apply([{ op: 'transpose', by: 12 }], { cls: 'note', ch: 1, d1: 120, d2: 64 }) === null,
    '120 + 12');
  ok('and one that fits does not',
    apply([{ op: 'transpose', by: 12 }], { cls: 'note', ch: 1, d1: 60, d2: 64 })?.d1 === 72, '60 + 12');
}

{
  // 13. A note off is a release and scaling its velocity makes a release that
  //     never reaches zero.
  const off = apply([{ op: 'velocity', scale: 0.5 }], { cls: 'note', ch: 1, d1: 60, d2: 0 });
  ok('a velocity curve leaves a note off alone', off.d2 === 0, `velocity ${off.d2}`);
}

{
  // 14. The `(channel, controller)` key, which the Circuit proves: CC 80 is
  //     macro knob 1 on channel 1 AND drum 4 pan on channel 10.
  const out = apply([{ op: 'cc', from: 1, to: 74, ch: 16 }], { cls: 'cc', ch: 2, d1: 1, d2: 64 });
  ok('a CC remap moves the controller and the channel together',
    out.d1 === 74 && out.ch === 16, `CC ${out.d1} on channel ${out.ch}`);
  const other = apply([{ op: 'cc', from: 1, to: 74, ch: 16 }], { cls: 'cc', ch: 2, d1: 7, d2: 64 });
  ok('and it leaves a different controller entirely alone',
    other.d1 === 7 && other.ch === 2, `CC ${other.d1} on channel ${other.ch}`);
}

// ── a transform that is not well formed ────────────────────────────────────
//
// 🔴 THESE ARE NOT HYPOTHETICAL. MEASURED 2026-09-21: asked to turn *"connect
// the keyboard to the circuit and transpose it up one semitone"* into a patch,
// Workers AI returned `{ op: 'transpose', to: 1 }`, which is valid against the
// JSON Schema it was generated under and is meaningless. `transpose` takes
// `by`, and `ev.d1 + undefined` is `NaN`, which is neither a throw nor a drop.

{
  const b = desk();
  const r = b.link('here:mk425c:out', 'here:circuit:in', [{ op: 'transpose', to: 1 }]);
  /* 🔴 `by` WAS THE WHOLE OF THIS CLAIM UNTIL 2026-09-22 AND IT IS A FIELD
     NAME. What a reader needs is the thing that is missing, said in words, and
     the object they could write instead. **The 1 was never wrong**, so the
     solution carries it over rather than inventing a number. */
  ok('a transform with its argument under the wrong key is refused, by name',
    !r.ok && r.why.includes('transpose')
    && r.why.includes('the number of semitones')
    && r.fix.includes('{"op":"transpose","by":1}'),
    `${r.why} / ${r.fix}`);
}

{
  // NEGATIVE CONTROL: the same transform, spelled right, connects.
  const b = desk();
  const r = b.link('here:mk425c:out', 'here:circuit:in', [{ op: 'transpose', by: 1 }]);
  ok('and the same transform spelled correctly is allowed', r.ok, r.why);
}

{
  ok('a class nobody has heard of is named in the refusal',
    why([{ op: 'only', cls: 'banana' }]).includes('banana'),
    why([{ op: 'only', cls: 'banana' }]));
  /* ⚠️ `to` IS A FIELD NAME AND MAY NOT BE MATCHED ON ANY MORE, which is the
     whole of the 2026-09-22 report. The claim is unchanged and is stronger
     read this way: the refusal has to say WHICH HALF of the remap did not
     arrive, in the words a person uses for it. */
  ok('a half given cc remap says which half is missing',
    why([{ op: 'cc', from: 1 }]).includes('the controller it goes to'),
    why([{ op: 'cc', from: 1 }]));
  ok('a number given as a string is refused rather than coerced',
    why([{ op: 'channel', to: '1' }]).includes('number'),
    why([{ op: 'channel', to: '1' }]));
  ok('and a well formed list says nothing at all',
    checkTransforms([{ op: 'channel', to: 1 }, { op: 'drop', cls: 'sysex' }]) === '',
    'empty string');
}

// ── the text form ──────────────────────────────────────────────────────────

{
  // 15. The text is a PROJECTION. If it can say something the graph cannot,
  //     there are two models and they will disagree.
  const line = 'here:mk425c:out -> here:circuit:in { channel 1, transpose +1, velocity 0.8 }';
  const back = printLink(parseLink(line));
  ok('a link round trips through its own text unchanged', back === line, back);
}

{
  const text = '# a comment\nhere:mk425c:out -> here:circuit:in { channel 1 }\n\nhere:circuit:out -> here:mk425c:in\n';
  const p = parsePatch(text);
  ok('a patch reads back as two links, comments and blanks ignored', p.length === 2, `${p.length} links`);
}

{
  let threw = '';
  try { parseLink('here:a:out ~~> here:b:in'); } catch (e) { threw = e.message; }
  ok('an unreadable line throws with the line in the message', threw.includes('~~>'), threw);
  threw = '';
  try { parseLink('a:b:out -> c:d:in { warp 3 }'); } catch (e) { threw = e.message; }
  ok('and an unknown transform lists the ones there are',
    threw.includes('warp') && threw.includes('transpose'), threw);
}

{
  const b = desk();
  const bad = b.load('here:mk425c:out -> here:circuit:in { channel 1 }\nhere:nope:out -> here:circuit:in');
  ok('loading a patch reports the line it refused and keeps the rest',
    bad.length === 1 && b.links().length === 1, `${bad.length} refused, ${b.links().length} made`);
}

// ── counters ───────────────────────────────────────────────────────────────

{
  // 16. TWO COUNTERS AT TWO ENDS. `link.sent` is what this side queued and
  //     `port.heard` is what the far side took. Reading one as the other is
  //     `createMidiLane`'s bug, which counted what a page QUEUED while every
  //     note was scheduled fifty six years out.
  heard = [];
  const b = desk();
  b.link('here:mk425c:out', 'here:circuit:in', [{ op: 'only', cls: 'note' }]);
  b.send('here:mk425c:out', ev([0x91, 60, 100]));
  b.send('here:mk425c:out', ev([0xb1, 74, 10]));         // dropped by `only`
  const l = b.links()[0];
  ok('the link counts what it sent and what it dropped, separately',
    l.sent === 1 && l.dropped === 1, `sent ${l.sent}, dropped ${l.dropped}`);
  ok('and the destination counts what it actually took',
    b.port('here:circuit:in').heard === 1, `heard ${b.port('here:circuit:in').heard}`);
}

{
  // 17. Stale is a third state and is a warning, never a refusal. "I cannot ssh
  //     to it" is never the same as "it is down".
  let t = 0;
  const b = createBay({ now: () => t });
  b.addPort({ id: 'far:k:out', label: 'far keys', dir: 'out', medium: 'midi', emits: ['note'] });
  b.addPort({ id: 'here:c:in', label: 'Circuit', dir: 'in', medium: 'midi', accepts: ['note'] });
  t = STALE_MS + 1;
  const r = b.link('far:k:out', 'here:c:in', []);
  ok('a stale port warns and still connects', r.ok && !!r.warn, r.warn || 'no warning');
}

// ── classes ────────────────────────────────────────────────────────────────

{
  ok('a note off is a note, not a class of its own',
    classOf(decode([0x80, 60, 0])) === 'note' && classOf(decode([0x90, 60, 0])) === 'note');
  ok('every class a port can name is in CLASSES',
    ['note', 'cc', 'bend', 'touch', 'program', 'clock', 'transport', 'sysex'].every((c) => CLASSES.includes(c)));
  // ⚠️ NEGATIVE CONTROL: a start used to be `clock`, so a port taking tempo was started too.
  ok('start, stop and continue are transport and the clock tick is clock',
    [0xFA, 0xFB, 0xFC].every((s) => classOf(decode([s])) === 'transport') && classOf(decode([0xF8])) === 'clock');
  ok('a drop of transport keeps the clock running',
    !checkTransforms([{ op: 'drop', cls: 'transport' }]) && !!checkTransforms([{ op: 'drop', cls: 'tempo' }]));
  /* ⚠️ EIGHT SINCE 2026-10-04 (plan-universal-routing §3), and the first three
     are asserted IN ORDER because a page may index them by position. */
  ok('the media are the eight the plan names, the first three where they were',
    MEDIA.join(',') === 'midi,audio,clock,value,video,program,file,state', MEDIA.join(','));
}

// ── the three transforms added 2026-09-21, and the two traps in them ────────
//
// 🔴 A KEYBOARD SPLIT COULD NOT BE SAID IN THIS VOCABULARY AT ALL until `range`
// existed. The owner asked for one in words and the model reached for `only`,
// which filters by CLASS, because that was the nearest thing to a filter.
{
  const lower = [{ op: 'range', lo: 0, hi: 59 }, { op: 'channel', to: 1 }];
  const upper = [{ op: 'range', lo: 60, hi: 127 }, { op: 'channel', to: 2 }];
  const note = (d1, d2 = 100) => ({ cls: 'note', ch: 2, d1, d2 });
  ok('a split sends a low note to one channel and not the other',
    apply(lower, note(48))?.ch === 1 && apply(upper, note(48)) === null,
    JSON.stringify(apply(lower, note(48))));
  ok('and a high note the other way, which is the half that makes it a split',
    apply(upper, note(72))?.ch === 2 && apply(lower, note(72)) === null,
    JSON.stringify(apply(upper, note(72))));

  // 🔴 THE TRAP: A NOTE OFF IS THE SAME NOTE NUMBER, so a note the filter let
  // through is always told to stop, and one it refused never started. A filter
  // keyed on anything that DIFFERS between the on and the off stops notes.
  ok('a note off follows its own note through the split, so nothing can hang',
    apply(lower, note(48, 0))?.d1 === 48 && apply(upper, note(48, 0)) === null,
    'the off goes where the on went');

  ok('a non-note passes a note range untouched, because a range is about pitch',
    apply(lower, { cls: 'cc', ch: 2, d1: 74, d2: 10 })?.d1 === 74,
    'cc survives');
}
{
  const hard = [{ op: 'vrange', lo: 64, hi: 127 }];
  const n = (d2) => ({ cls: 'note', ch: 1, d1: 60, d2 });
  ok('a velocity layer keeps a hard hit and drops a soft one',
    apply(hard, n(100))?.d2 === 100 && apply(hard, n(20)) === null,
    'layered');
  // 🔴 THE TRAP THAT WOULD HANG A SYNTH IN ANOTHER BUILDING: a note off carries
  // velocity 0, so a naive window drops every release and leaves the note that
  // a hard hit let through sounding forever.
  ok('NEGATIVE CONTROL: a note off passes a velocity window it could never enter',
    apply(hard, n(0))?.d2 === 0,
    'velocity 0 is a release and always passes');
}
{
  const fixed = [{ op: 'fixed', to: 96 }];
  const n = (d2) => ({ cls: 'note', ch: 1, d1: 60, d2 });
  ok('fixed gives every note one velocity, which is what this desk\'s drums do at 96',
    apply(fixed, n(12))?.d2 === 96 && apply(fixed, n(127))?.d2 === 96,
    'both 96');
  ok('NEGATIVE CONTROL: and it leaves a note off alone, or a release becomes a second note on',
    apply(fixed, n(0))?.d2 === 0,
    'the release stays 0');
}
{
  /* 🔴 THE NAME IS THE THING'S NAME AND NEVER ITS KEY SINCE 2026-09-22. This
     read `fixed takes "to"`, which names the key the validator compared. What
     a reader needs named is the loudness and the channel. */
  ok('a missing argument is refused by name',
    /fixed gives every note the same loudness/.test(why([{ op: 'fixed' }]))
    && /channel puts every message on one MIDI channel/.test(why([{ op: 'channel' }]))
    && fix([{ op: 'fixed' }]).includes('96')
    && fix([{ op: 'channel' }]).includes('1 to 16'),
    `${why([{ op: 'fixed' }])} / ${fix([{ op: 'fixed' }])}`);

  /**
   * 🔴 ONE BOUND IS A WHOLE INSTRUCTION, AND THIS ASSERT SAID THE OPPOSITE
   * UNTIL 2026-09-21. It read *`range` refuses a missing `hi`*, which made
   * *everything above middle C* unsayable: the only legal way to write it named
   * 127 as a decision when it is the end of the scale. Both bounds still work
   * and neither is required on its own.
   */
  ok('a range may be open at either end',
    checkTransforms([{ op: 'range', lo: 60 }]) === ''
    && checkTransforms([{ op: 'range', hi: 7 }]) === ''
    && checkTransforms([{ op: 'vrange', lo: 64 }]) === '',
    'nothing said about any of the three');

  const noteAt = (n) => ({ cls: 'note', ch: 1, d1: n, d2: 64 });
  ok('an open top keeps everything above the bound and an open bottom everything below',
    apply([{ op: 'range', lo: 60 }], noteAt(127)) !== null
    && apply([{ op: 'range', lo: 60 }], noteAt(59)) === null
    && apply([{ op: 'range', hi: 7 }], noteAt(0)) !== null
    && apply([{ op: 'range', hi: 7 }], noteAt(8)) === null);

  /* 🔴 NEGATIVE CONTROL, and it is the reason `oneOf` exists rather than two
     optional arguments. A range with NO bound passes every note, which is a
     filter that reads as working and does nothing at all. */
  ok('NEGATIVE CONTROL: a range with neither bound is refused rather than passing everything',
    /neither the lowest note nor the highest note was given/.test(why([{ op: 'range' }]))
    && /neither the softest hit nor the hardest hit was given/.test(why([{ op: 'vrange' }])),
    why([{ op: 'range' }]));

  /* 🔴 AND BEING GIVEN THE WRONG THING IS NOT BEING GIVEN NOTHING. One
     sentence covered both until 2026-09-22 and said `was given nothing` about
     `{"op":"range","to":7}`, which plainly has a number in it. That object is
     MEASURED rather than imagined: eleven runs of `llama-3.3-70b` out of
     eleven. */
  ok('NEGATIVE CONTROL: a range given something that is not a bound says so, not "nothing"',
    /nothing it was given is the lowest note or the highest note/.test(why([{ op: 'range', to: 7 }]))
    && why([{ op: 'range', to: 7 }]) !== why([{ op: 'range' }]),
    why([{ op: 'range', to: 7 }]));

  /* 🔴 AND THE TEXT FORM HAS TO SURVIVE THE ABSENT BOUND, which is the defect
     an open end would otherwise introduce quietly: `{ range, hi: 7 }` printed
     as `range 7` reads back as `{ range, lo: 7 }`, the same words meaning the
     opposite filter. */
  for (const t of [{ op: 'range', hi: 7 }, { op: 'range', lo: 60 },
                   { op: 'range', lo: 0, hi: 7 }, { op: 'vrange', hi: 63 }]) {
    const line = printLink({ from: 'a', to: 'b', transforms: [t] });
    const back = parseLink(line).transforms[0];
    ok(`a one-sided ${t.op} round trips through the text form`,
      JSON.stringify(back) === JSON.stringify(t), `${line} came back as ${JSON.stringify(back)}`);
  }

  /**
   * 🔴 TWO RANGES OPEN AT THE SAME END IS ALWAYS ONE RANGE WRITTEN WRONG, and
   * it is what a language model produces every time it is asked for a row of
   * buttons: eleven runs on 2026-09-21, always `{"op":"range","to":A}` then
   * `{"op":"range","to":B}`. Composed, the narrower bound wins and the other
   * transform is dead, so the link is well formed, allowed, and passes one note
   * of eight. The refusal carries the correction as JSON the person can read.
   */
  const two = checkTransforms([{ op: 'range', hi: 0 }, { op: 'range', hi: 7 }]);
  ok('two ranges open at the same end are refused, and the solution carries the right patch',
    /each name only the highest note/.test(two.why)
    && two.fix.includes('{"op":"range","lo":0,"hi":7}'),
    `${two.why} / ${two.fix}`);

  /**
   * 🔴 THE NEGATIVE CONTROL, AND IT IS THE HALF THAT STOPS THIS REFUSING REAL
   * WORK. Two ranges open at OPPOSITE ends are a perfectly ordinary way to
   * write a window, and a split is two ranges in two SEPARATE LINKS, which this
   * check must never see as one list.
   */
  ok('NEGATIVE CONTROL: two ranges closing opposite ends are a window and are allowed',
    checkTransforms([{ op: 'range', lo: 60 }, { op: 'range', hi: 72 }]) === ''
    && checkTransforms([{ op: 'range', lo: 0, hi: 59 }]) === ''
    && checkTransforms([{ op: 'range', lo: 60, hi: 127 }]) === '',
    'nothing said about a window, or about either closed range');

  ok('a window written as two one-sided ranges keeps only what is inside it',
    apply([{ op: 'range', lo: 60 }, { op: 'range', hi: 72 }], noteAt(64)) !== null
    && apply([{ op: 'range', lo: 60 }, { op: 'range', hi: 72 }], noteAt(59)) === null
    && apply([{ op: 'range', lo: 60 }, { op: 'range', hi: 72 }], noteAt(73)) === null);

  /* A range that can never pass anything is a silent link, not a tight filter. */
  ok('a low bound above the high one is refused rather than passing nothing',
    /nothing can ever pass/.test(why([{ op: 'range', lo: 60, hi: 7 }]))
    /* ⚠️ AND THE OFFER IS MADE TO A PERSON RATHER THAN TAKEN BY THE CODE. The
       file refuses to merge two bounds because one run of eleven produced them
       descending; showing the swapped object costs nothing and decides
       nothing. */
    && fix([{ op: 'range', lo: 60, hi: 7 }]).includes('{"op":"range","lo":7,"hi":60}'),
    `${why([{ op: 'range', lo: 60, hi: 7 }])} / ${fix([{ op: 'range', lo: 60, hi: 7 }])}`);

  /* An optional argument that is present is still typed, which it was not while
     the type check ran over the REQUIRED list only. */
  ok('an optional bound that is present is still checked for being a number',
    /the highest note came as "47" rather than as a number/
      .test(why([{ op: 'range', lo: 36, hi: '47' }])),
    why([{ op: 'range', lo: 36, hi: '47' }]));
}
{
  /**
   * 🔴 A TRANSFORM WITH NOTHING TO SAY ABOUT ITSELF IS A TRANSFORM NOBODY WILL
   * BE TOLD ABOUT. 2026-09-21: `range`, `vrange` and `fixed` were added here and
   * the operator table a language model reads was left listing the other six,
   * so the code accepted nine words and the model was offered six. It asked for
   * a filter with the only filter it had been shown, `only`, eight times in one
   * patch, and the page refused all eight. `workers/wish/src/wish-test.mjs`
   * generates that table from `OP_HELP` and asserts it is complete; this is the
   * half that stops a new op being declared with no sentence to generate FROM.
   */
  const mute = OP_HELP.filter((o) => typeof o.help !== 'string' || o.help.trim().length < 12);
  ok('every transform carries a sentence a reader outside this file can use',
    mute.length === 0 && OP_HELP.length === OP_NAMES.length,
    `${mute.map((o) => o.op).join(', ') || 'none'} silent, ${OP_HELP.length} of ${OP_NAMES.length}`);

  /* The signature is DERIVED from the argument list `checkTransforms` enforces,
     so the two cannot part company. `cls` is the one argument that is not a
     number and `scale` is the one that is not an integer. */
  const sig = Object.fromEntries(OP_HELP.map((o) => [o.op, o.sig]));
  ok('a signature names the arguments its own validator requires',
    sig.only === 'only cls=C' && sig.range === 'range lo=N hi=N'
    && sig.velocity === 'velocity scale=F' && sig.cc === 'cc from=N to=N ch=N',
    JSON.stringify(sig));

  /**
   * 🔴 THE EXAMPLE EVERY TRANSFORM CARRIES IS GRADED BY THE VALIDATOR IT IS AN
   * EXAMPLE OF. It is put in front of a language model on every call, and a
   * model copies an example rather than reading a sentence, which is measured
   * twice over in `workers/wish/src/wish.mjs`. So an example this code would
   * refuse is a defect being TAUGHT, and it would read as documentation.
   */
  const refused = OP_HELP
    .map((o) => [o.op, checkTransforms([{ op: o.op, ...o.eg }])])
    .filter(([, bad]) => bad !== '');
  ok('every transform example passes the validator it demonstrates',
    refused.length === 0, refused.map(([op, bad]) => `${op}: ${bad.why}`).join(' | '));

  /* And an example has to USE the op it names: `{"op":"range"}` with no
     arguments passes nothing and would still be a line in the table. */
  const thin = OP_HELP.filter((o) => o.need.some((a) => o.eg[a] === undefined));
  ok('NEGATIVE CONTROL: no example leaves out an argument its op requires',
    thin.length === 0, thin.map((o) => o.op).join(', '));

  /**
   * 🔴 NEGATIVE CONTROL: THE THING THE OWNER ACTUALLY SAW, TWICE, AND THE
   * SECOND REPORT IS WHAT THIS LINE NOW GRADES. It read
   * `/only takes "cls"/` until 2026-09-22, which passed happily on the
   * sentence *only takes "cls" and was given "to"* that was reported as
   * *"its not for humans, i do not know what to do"*. The claim behind it is
   * unchanged: the refusal has to name the thing that is missing. What
   * changed is that a KEY is not a name. The signature still carries `cls=`
   * because a language model is choosing keys and a visitor is not.
   */
  ok('NEGATIVE CONTROL: `only` given a channel number names what is missing without naming a key',
    /nothing it was given is a kind of message/.test(why([{ op: 'only', to: 1 }]))
    && fix([{ op: 'only', to: 1 }]) === `Name one of ${CLASSES.join(', ')}.`
    && sig.only.includes('cls='),
    `${why([{ op: 'only', to: 1 }])} / ${fix([{ op: 'only', to: 1 }])}`);
}

/**
 * 🔴 THE REFUSALS ARE READ BY A PERSON, AND UNTIL 2026-09-22 THEY WERE WRITTEN
 * IN FIELD NAMES. REPORTED against a real reply: *"only takes "cls" and was
 * given "to" - its not for humans, i do not know what to do"*, and in the next
 * breath *"can we have cooncrete problem -> soluton texts?"*. These four
 * checks are what stops that coming back, and they are graded over EVERY
 * refusal this module can produce rather than over the three that were
 * reported.
 */
{
  /* Every shape of bad patch there is, so the sweeps below are about the
     module rather than about whichever case somebody remembered. */
  const BAD = [
    [{ op: 'only', to: 1 }], [{ op: 'only' }], [{ op: 'only', cls: 'banana' }],
    [{ op: 'transpose', to: 1 }], [{ op: 'cc', to: 80 }], [{ op: 'cc', from: 1 }],
    [{ op: 'fixed' }], [{ op: 'channel', to: '1' }], [{ op: 'channel' }],
    [{ op: 'range' }], [{ op: 'range', to: 7 }], [{ op: 'range', lo: 60, hi: 7 }],
    [{ op: 'range', lo: 36, hi: '47' }], [{ op: 'vrange' }],
    [{ op: 'range', hi: 0 }, { op: 'range', hi: 7 }],
    [{ op: 'banana' }], [null], [{ op: 'velocity' }], [{ op: 'drop', to: 'sysex' }],
  ];
  const said = BAD.map((t) => ({ t, ...checkTransforms(t) }));

  ok('every refusal answers in two sentences, a problem and something to do about it',
    said.every((s) => s.why && s.fix && /\.$/.test(s.why.trim()) && /\.$/.test(s.fix.trim())),
    `${said.filter((s) => s.why && s.fix).length} of ${said.length} carry both`);

  /**
   * 🔴 NO FIELD NAME IN ANYTHING A VISITOR READS, WHICH IS THE REPORT ITSELF.
   * Every argument of every operator, hunted in both sentences. The JSON
   * objects a solution may offer are cut out first, because a key inside
   * `{"op":"transpose","by":1}` is DATA sitting beside the data it corrects,
   * and the defect was a key printed as English prose.
   * ⚠️ IT IS THE QUOTED FORM THAT IS HUNTED, AND THE FIRST WRITING OF THIS
   * LINE WENT RED ON TWO SENTENCES THAT ARE PERFECTLY FINE. It also matched a
   * bare word before ` is`, which catches *the controller it comes from is
   * missing*: `from` and `to` are ordinary English as well as keys, and the
   * reported defect was never a word, it was `only takes "cls"`. A check that
   * refuses the English is a check that would push the words back towards the
   * jargon.
   */
  const KEYS = [...new Set(OP_HELP.flatMap((o) => o.args))];
  const prose = (s) => `${s.why} ${s.fix}`.replace(/\{[^}]*\}/g, ' ');
  const leaks = said.filter((s) => KEYS.some((k) => prose(s).includes(`"${k}"`)));
  ok('NEGATIVE CONTROL: no refusal prints a field name as if it were a word',
    leaks.length === 0,
    leaks.length ? leaks.map((s) => prose(s)).join(' | ') : `${said.length} swept, ${KEYS.length} keys`);

  /* ⚠️ AND THE SWEEP IS PROVED BY BREAKING IT, or `no field name` is a claim
     about a regular expression. The sentence that was reported is put through
     the same test and has to be caught. */
  const OLD = { why: 'only takes "cls" and was given "to".', fix: 'Name one of note.' };
  ok('NEGATIVE CONTROL: and the sweep catches the sentence that was reported',
    KEYS.some((k) => prose(OLD).includes(`"${k}"`)), prose(OLD));

  /* ⚠️ AND THE TWO LINES MAY NOT RESTATE EACH OTHER, which is the failure mode
     of every problem-and-solution pair ever written. A solution that is the
     problem with `do not` in front of it is one line, not two. */
  const echo = said.filter((s) => s.why.toLowerCase().includes(s.fix.toLowerCase())
    || s.fix.toLowerCase().includes(s.why.toLowerCase()));
  ok('NEGATIVE CONTROL: no solution is its own problem said again',
    echo.length === 0, echo.map((s) => s.why).join(' | ') || `${said.length} pairs, none an echo`);

  /**
   * 🔴 AND THE THREE CASES STAY TELLABLE APART, WHICH IS WHAT THE OLD WORDING
   * BOUGHT AND THE NEW WORDING HAD TO KEEP. A key the operator does not have
   * is a SWAP, a key it has with a required one absent is an OMISSION, and an
   * empty object is neither: nothing arrived. Naming them alike is how
   * `cc takes "from" and was given "to"` once accused a correct argument of
   * being wrong.
   */
  const swap = why([{ op: 'cc', by: 1 }]);
  const gap = why([{ op: 'cc', to: 80 }]);
  const bare = why([{ op: 'cc' }]);
  ok('a swapped argument, an omission and an empty object are three different sentences',
    swap !== gap && gap !== bare && swap !== bare
    && /nothing it was given is/.test(swap)
    && /is missing/.test(gap)
    && /given nothing at all/.test(bare),
    [swap, gap, bare].join(' | '));

  /**
   * ⚠️ AND THE VOCABULARY IS GRADED WHOLE, the same guard `help` already has.
   * A transform added with no words beside it would fall back to *what it
   * needs*, which is the placeholder, and a placeholder in a refusal is the
   * defect above arriving again with nobody noticing.
   */
  const thin = OP_NAMES.filter((op) => {
    const s = OP_SAYS[op];
    if (!s || !s.does) return true;
    return OP_HELP.find((o) => o.op === op).args
      .some((a) => !s.part?.[a] || !s.ask?.[a]);
  });
  ok('every operator and every argument of it has words a visitor can read',
    thin.length === 0 && Object.keys(OP_SAYS).length === OP_NAMES.length,
    `${thin.join(', ') || 'none'} silent, ${Object.keys(OP_SAYS).length} of ${OP_NAMES.length}`);
}

// ── the universal media, plan-universal-routing §3 to §8, 2026-10-04 ───────
//
// 🔴 EVERYTHING BELOW IS ARITHMETIC ABOUT A DESCRIPTION. No session is opened,
// nothing is fetched, no transport code exists in `bay.mjs` to call. So a green
// here says the bay NAMES the right session, never that one would work.

const SHAPE = { rate: 48000, channels: 2, frameMs: 20 };
/** A small world with every distance in it, and the facts that decide them. */
function world() {
  const b = createBay();
  b.addNode({ id: 'studio-1:circuit', kind: 'device', label: 'Circuit', place: 'studio-1', net: 'studio-lan' });
  b.addNode({ id: 'studio-1:pi', kind: 'engine', label: 'board', place: 'studio-1', net: 'studio-lan' });
  b.addNode({ id: 'm1:page', kind: 'screen', label: 'the M1', place: 'm1', net: 'studio-lan' });
  b.addNode({ id: 'home:page', kind: 'screen', label: 'a page at home', place: 'home', net: 'home-lan' });
  b.addNode({ id: 'away:page', kind: 'screen', label: 'a page away', place: 'away', net: 'cafe' });
  b.addNode({ id: 'err:vikerraadio', kind: 'external', label: 'Vikerraadio', place: 'err' });
  b.addPort({ id: 'studio-1:circuit:audio', label: 'Circuit audio', dir: 'out', medium: 'audio', shape: SHAPE });
  b.addPort({ id: 'err:vikerraadio:audio', label: 'Vikerraadio audio', dir: 'out', medium: 'audio', shape: SHAPE });
  for (const [id, label] of [['studio-1:pi:audio', 'board in'], ['m1:page:audio', 'M1 audio'],
                             ['home:page:audio', 'home audio'], ['away:page:audio', 'away audio']]) {
    b.addPort({ id, label, dir: 'in', medium: 'audio', shape: SHAPE });
  }
  return b;
}

{
  // A. Every medium a port can declare, and one it cannot.
  const b = createBay();
  const took = MEDIA.filter((m, i) => {
    try { b.addPort({ id: `here:m${i}:out`, label: m, dir: 'out', medium: m }); return true; }
    catch { return false; }
  });
  ok('every one of the eight media is accepted by addPort', took.length === 8, took.join(', '));
  /* NEGATIVE CONTROL: or `accepted` would be true of a bay that checks nothing. */
  let threw = '';
  try { b.addPort({ id: 'here:smell:out', label: 'smell', dir: 'out', medium: 'smell' }); }
  catch (e) { threw = e.message; }
  ok('NEGATIVE CONTROL: a medium nobody declared is refused and the refusal lists the real ones',
    threw.includes('smell') && threw.includes('program') && threw.includes('state'), threw);
  ok('the heavy media are audio, video, file and state, and program is light',
    HEAVY.join(',') === 'audio,video,file,state' && !HEAVY.includes('program'), HEAVY.join(','));
}

{
  // B. The chooser is plan §5's table, cell by cell.
  const cells = [];
  for (const m of HEAVY) for (const w of WHERE) {
    const c = chooseTransport(m, w);
    cells.push(c && c.where === w && c.transport === TRANSPORTS[m][w].transport
      && typeof c.says === 'string' && c.says.length > 0);
  }
  ok('every heavy medium has a transport at every distance, from the table',
    cells.length === 16 && cells.every(Boolean), `${cells.filter(Boolean).length} of ${cells.length}`);
  ok('the cells that carry a number carry the plan\'s number',
    chooseTransport('audio', 'network').says === 'board round trip 4 ms'
    && chooseTransport('audio', 'internet-one').says.includes('p50 36 ms')
    && chooseTransport('audio', 'internet-one').says.includes('cap 1000 msg/s, 2000 burst')
    && chooseTransport('audio', 'internet-one').transport === 'relay',
    `${chooseTransport('audio', 'network').says} | ${chooseTransport('audio', 'internet-one').says}`);
  ok('and the cell the plan says is not measured says exactly "to measure"',
    chooseTransport('video', 'network').says === 'to measure', chooseTransport('video', 'network').says);
  ok('a second receiver over the internet is the many column',
    chooseTransport('audio', 'internet-one', 2).where === 'internet-many'
    && chooseTransport('video', 'internet-one', 2).transport === 'llhls');
  /* NEGATIVE CONTROL: or `null for light` would pass on a chooser that always
     answers null. Every light medium, by name. */
  const light = MEDIA.filter((m) => !HEAVY.includes(m));
  ok('NEGATIVE CONTROL: a light medium has no transport, because its link carries the bytes',
    light.join(',') === 'midi,clock,value,program'
    && light.every((m) => chooseTransport(m, 'internet-one') === null),
    light.map((m) => `${m}: ${JSON.stringify(chooseTransport(m, 'internet-one'))}`).join(', '));
  let t1 = '', t2 = '';
  try { chooseTransport('smell', 'machine'); } catch (e) { t1 = e.message; }
  try { chooseTransport('audio', 'moon'); } catch (e) { t2 = e.message; }
  ok('NEGATIVE CONTROL: an unknown medium or distance throws rather than reading as light',
    t1.includes('smell') && t2.includes('moon'), `${t1} | ${t2}`);

  /**
   * 🔴 NO CELL SAYS A NUMBER THE PLAN DOES NOT. Every number in every `says` is
   * looked for in `plans/plan-universal-routing.md` WITH ITS UNIT, so a
   * plausible figure typed into a cell nobody measured goes red here.
   * ⚠️ THE UNIT IS THE CHECK, AND THE FIRST WRITING OF THIS LOOKED FOR BARE
   * DIGITS AND MISSED THE SABOTAGE IT WAS WRITTEN FOR: `round trip 12 ms` passed
   * because the plan says `12 byte header`. The plan's bold is stripped first.
   */
  const { readFileSync } = await import('node:fs');
  const plan = readFileSync(new URL('../../plans/plan-universal-routing.md', import.meta.url), 'utf8')
    .replace(/\*\*/g, '');
  const NUM = /\d+(?:\.\d+)?(?: ?(?:ms|msg\/s|s|kbit\/s|KB\/s|%))?\b/g;
  const invented = [...Object.values(TRANSPORTS), READS].flatMap((row) => Object.values(row))
    .flatMap((c) => (c.says.match(NUM) || []).filter((n) => !plan.includes(n)).map((n) => `${n} in "${c.says}"`));
  ok('NEGATIVE CONTROL: no cell quotes a number the plan does not',
    invented.length === 0, invented.join(' | ') || 'every number found in the plan');
}

{
  // C. Where the two ends are, which picks the column.
  const b = world();
  const mach = b.link('studio-1:circuit:audio', 'studio-1:pi:audio');
  const net = b.link('studio-1:circuit:audio', 'm1:page:audio');
  const one = b.link('studio-1:circuit:audio', 'home:page:audio');
  const many = b.link('studio-1:circuit:audio', 'away:page:audio');
  ok('one machine is machine, and the transport is the machine\'s',
    mach.session?.where === 'machine' && mach.session.transport === 'webaudio', JSON.stringify(mach.session));
  ok('two machines on one network is network, a data channel at 4 ms',
    net.session?.where === 'network' && net.session.transport === 'datachannel', JSON.stringify(net.session));
  ok('the first receiver across the internet is internet-one, on the relay',
    one.session?.where === 'internet-one' && one.session.transport === 'relay', JSON.stringify(one.session));
  ok('and the second receiver of the same port is internet-many',
    many.session?.where === 'internet-many' && many.session.transport === 'moq', JSON.stringify(many.session));
  /* NEGATIVE CONTROL: the two local links before `one` did not make it many,
     because the column counts receivers across the internet. */
  ok('NEGATIVE CONTROL: links on the same machine and network do not count towards many',
    one.session.where === 'internet-one', `${b.links().length - 1} links existed before the fourth`);

  /* With no nodes at all, the place is the id's first segment and the network
     is unknown, and unknown is never read as the same network. */
  const bare = createBay();
  bare.addPort({ id: 'x:a:video', label: 'a', dir: 'out', medium: 'video', shape: { fps: 30 } });
  bare.addPort({ id: 'x:b:video', label: 'b', dir: 'in', medium: 'video', shape: { fps: 30 } });
  bare.addPort({ id: 'y:c:video', label: 'c', dir: 'in', medium: 'video', shape: { fps: 30 } });
  const near = bare.link('x:a:video', 'x:b:video');
  const far = bare.link('x:a:video', 'y:c:video');
  ok('NEGATIVE CONTROL: a port with no node takes its place from its id, and an unknown network is the internet',
    near.session?.where === 'machine' && far.session?.where === 'internet-one',
    `${near.session?.where}, ${far.session?.where}`);
}

{
  // D. The address is derived from the link, the way the Pi derives rooms.
  const b = world();
  const r = b.link('studio-1:circuit:audio', 'home:page:audio');
  ok('a session\'s address is the source\'s place, node and port',
    r.session?.address === 'studio-1-circuit-audio', r.session?.address);
  ok('and its shape is the source port\'s shape',
    JSON.stringify(r.session.shape) === JSON.stringify(SHAPE), JSON.stringify(r.session.shape));
  b.addNode({ id: 'rig:gpu', kind: 'engine', label: 'GPU', place: 'studio-1', net: 'studio-lan' });
  b.addPort({ id: 'rig:gpu:video', label: 'GPU video', dir: 'out', medium: 'video', shape: { w: 1280, h: 720 } });
  b.addPort({ id: 'home:page:video', label: 'home video', dir: 'in', medium: 'video', shape: { w: 1280, h: 720 } });
  const g = b.link('rig:gpu:video', 'home:page:video');
  /* NEGATIVE CONTROL: the PLACE is the node's, not the id's first segment, or
     the address above would pass on a bay that only splits strings. */
  ok('NEGATIVE CONTROL: the place in an address is the node\'s place, not the id\'s site',
    g.session?.address === 'studio-1-gpu-video', g.session?.address);
  const again = b.link('studio-1:circuit:audio', 'away:page:audio');
  ok('two links out of one port share one address, so the second joins the first',
    again.session?.address === r.session.address, `${again.session?.address}`);
}

{
  // E. Consent on the source, plan §6, and the reason is ERR's listener statistics.
  const b = world();
  const no = b.link('err:vikerraadio:audio', 'home:page:audio');
  ok('a link out of an external node with no consent is refused, naming whose server it is',
    !no.ok && no.why.includes('Vikerraadio') && /somebody else's server/.test(no.why)
    && /person who is going to listen/.test(no.fix), `${no.why} / ${no.fix}`);
  const loose = b.link('err:vikerraadio:audio', 'home:page:audio', [], { consent: 'yes' });
  ok('NEGATIVE CONTROL: a truthy string is not consent, only true is',
    !loose.ok, loose.why);
  const v = b.validate('err:vikerraadio:audio', 'home:page:audio', [], { consent: true });
  const yes = b.link('err:vikerraadio:audio', 'home:page:audio', [], { consent: true });
  ok('NEGATIVE CONTROL: with a person\'s consent the same link is made, with its session',
    yes.ok && yes.session?.address === 'err-vikerraadio-audio' && v.ok && v.session?.address === yes.session.address,
    yes.why || JSON.stringify(yes.session));
  ok('and the consent is not stored on the link',
    !('consent' in b.links().find((l) => l.id === yes.id)), 'no consent field');
  ok('a node of another kind needs no consent',
    b.link('studio-1:circuit:audio', 'home:page:audio').ok);
  ok('NEGATIVE CONTROL: an external node cannot be declared out of needing consent',
    b.addNode({ id: 'icecast:mount', kind: 'external', consent: false }).consent === true);

  /* A text patch never carries consent, so a load of the same line is refused
     unless the person loading it says so. */
  const fresh = world();
  const bad = fresh.load('err:vikerraadio:audio -> home:page:audio');
  const fresh2 = world();
  const good = fresh2.load('err:vikerraadio:audio -> home:page:audio', { consent: true });
  ok('a text patch out of an external node is refused on load, and allowed when a person loads it',
    bad.length === 1 && /somebody else's server/.test(bad[0].why) && good.length === 0,
    `${bad.length} refused, then ${good.length}`);
}

{
  // F. Transforms are MIDI operations.
  const b = world();
  const r = b.link('studio-1:circuit:audio', 'home:page:audio', [{ op: 'transpose', by: 1 }]);
  ok('transforms on an audio link are refused, naming the medium and the transform',
    !r.ok && r.why.includes('audio') && r.why.includes('transpose') && /MIDI/.test(r.why), `${r.why} / ${r.fix}`);
  b.addPort({ id: 'home:page:tilt', label: 'tilt', dir: 'out', medium: 'value', shape: { range: [0, 1] } });
  b.addPort({ id: 'studio-1:pi:cutoff', label: 'cutoff', dir: 'in', medium: 'value', shape: { range: [0, 1] } });
  const v = b.link('home:page:tilt', 'studio-1:pi:cutoff', [{ op: 'channel', to: 1 }]);
  ok('and on a value link too', !v.ok && v.why.includes('value'), v.why);
  /* NEGATIVE CONTROL: the same two links with no transforms are made, or the
     refusals above would be a bay that refuses those ports. The value link also
     proves a range is compared by value, since `[0, 1] !== [0, 1]`. */
  ok('NEGATIVE CONTROL: the same audio and value links with no transforms are made',
    b.link('studio-1:circuit:audio', 'home:page:audio').ok && b.link('home:page:tilt', 'studio-1:pi:cutoff').ok);
}

{
  // G. A light link carries its bytes, so it has no session.
  const b = world();
  b.addPort({ id: 'home:keys:out', label: 'keys', dir: 'out', medium: 'midi', emits: ['note'] });
  b.addPort({ id: 'studio-1:circuit:in', label: 'Circuit', dir: 'in', medium: 'midi', accepts: ['note'] });
  b.addPort({ id: 'm1:mirror:program', label: 'mirror', dir: 'out', medium: 'program', shape: { language: 'glsl' } });
  b.addPort({ id: 'studio-1:pi:program', label: 'GPU', dir: 'in', medium: 'program', shape: { language: 'glsl' } });
  const m = b.link('home:keys:out', 'studio-1:circuit:in');
  const p = b.link('m1:mirror:program', 'studio-1:pi:program');
  ok('a MIDI link across the internet has no session, on the answer or the stored link',
    m.ok && m.session === null && b.links().find((l) => l.id === m.id).session === null);
  ok('and neither does a program, which is one message',
    p.ok && p.session === null, JSON.stringify(p.session));
}

{
  // H. The text form of a heavy link is the same line, and the session comes back.
  const b = world();
  const r = b.link('studio-1:circuit:audio', 'home:page:audio');
  const line = b.text();
  const back = world();
  const refused = back.load(line);
  ok('a heavy link prints as a plain from -> to line with nothing about its session in it',
    line === 'studio-1:circuit:audio -> home:page:audio', line);
  ok('and read back into the same world it derives the same session',
    refused.length === 0 && JSON.stringify(back.links()[0].session) === JSON.stringify(r.session),
    JSON.stringify(back.links()[0]?.session));
  ok('and prints the same line again', back.text() === line, back.text());
}

{
  // I. A loop is an echo of ONE medium. Value out and audio back is a patch.
  const b = world();
  b.addPort({ id: 'home:page:tilt', label: 'tilt', dir: 'out', medium: 'value', shape: {} });
  b.addPort({ id: 'studio-1:pi:cutoff', label: 'cutoff', dir: 'in', medium: 'value', shape: {} });
  b.addPort({ id: 'studio-1:pi:out', label: 'board out', dir: 'out', medium: 'audio', shape: SHAPE });
  b.link('home:page:tilt', 'studio-1:pi:cutoff');
  const r = b.link('studio-1:pi:out', 'home:page:audio');
  ok('a phone that sends a value to an engine may hear its audio back', r.ok, r.why);
  /* NEGATIVE CONTROL: a loop in one medium is still a loop. */
  b.addPort({ id: 'studio-1:pi:level', label: 'level', dir: 'out', medium: 'value', shape: {} });
  b.addPort({ id: 'home:page:knob', label: 'knob', dir: 'in', medium: 'value', shape: {} });
  const loop = b.link('studio-1:pi:level', 'home:page:knob');
  ok('NEGATIVE CONTROL: a value loop between the same two nodes is still refused',
    !loop.ok && /loop/.test(loop.why), loop.why);
}

{
  // J. Nodes are optional, listed, and refuse what they cannot be.
  const b = world();
  ok('nodes are listed and found by id',
    b.nodes().length === 6 && b.node('studio-1:circuit')?.kind === 'device' && b.node('nope:x') === undefined,
    `${b.nodes().length} nodes`);
  ok('every kind in the plan is a kind here',
    NODE_KINDS.join(',') === 'device,engine,endpoint,store,external,screen,person');
  let k = '', i = '';
  try { b.addNode({ id: 'here:toaster', kind: 'toaster' }); } catch (e) { k = e.message; }
  try { b.addNode({ id: 'here:toaster:port', kind: 'device' }); } catch (e) { i = e.message; }
  ok('NEGATIVE CONTROL: an unknown kind and a three part id are both refused',
    k.includes('toaster') && k.includes('external') && i.includes('site:node'), `${k} | ${i}`);
}

{
  /* K. The new refusals are held to the old standard: two sentences, each
     ending, neither an echo of the other. */
  const b = world();
  b.addPort({ id: 'here:k:out', label: 'keys', dir: 'out', medium: 'midi', emits: ['note'] });
  const said = [
    b.link('err:vikerraadio:audio', 'home:page:audio'),
    b.link('studio-1:circuit:audio', 'home:page:audio', [{ op: 'channel', to: 1 }]),
  ];
  ok('NEGATIVE CONTROL: the consent and transform refusals are a problem and something to do, not one said twice',
    said.every((s) => !s.ok && /\.$/.test(s.why) && /\.$/.test(s.fix)
      && !s.why.toLowerCase().includes(s.fix.toLowerCase()) && !s.fix.toLowerCase().includes(s.why.toLowerCase())),
    said.map((s) => `${s.why} / ${s.fix}`).join(' | '));
}

{
  /* L. A store at either end rides the `file` row, plan §10 item 5. A sound
     into a store is a recording uploaded through ingest, at the store's
     address, and it stays one writer however many already listen. */
  const b = world();
  b.addNode({ id: 'r2:recordings', kind: 'store', label: 'recordings', place: 'cloudflare', net: 'cloudflare' });
  b.addPort({ id: 'r2:recordings:in', label: 'recordings', dir: 'in', medium: 'audio', address: 'ingest.positron.studio' });
  b.addPort({ id: 'r2:recordings:out', label: 'recordings', dir: 'out', medium: 'audio', address: 'archive.positron.studio' });
  b.link('studio-1:circuit:audio', 'home:page:audio');
  b.link('studio-1:circuit:audio', 'away:page:audio');
  const rec = b.link('studio-1:circuit:audio', 'r2:recordings:in');
  ok('a sound into a store is a recording through ingest, one writer, at the store’s address',
    rec.ok && rec.session?.transport === 'ingest' && rec.session.where === 'internet-one'
      && rec.session.address === 'ingest.positron.studio', JSON.stringify(rec.session || rec.why));
  const play = b.link('r2:recordings:out', 'home:page:audio');
  /* ⚠️ THIS SAID `read back through ingest` UNTIL 2026-10-06, and ingest is the
     WRITE path. One reader of one stored object is one https read (`READS`). */
  ok('and a sound out of a store to one reader is one https read of the object', play.ok && play.session?.transport === 'https'
    && play.session.address === 'archive.positron.studio', JSON.stringify(play.session || play.why));
  /* NEGATIVE CONTROL: the same sound to a page that is not a store keeps the
     audio row, or the store rule would be true of every link. */
  const page = b.link('studio-1:circuit:audio', 'm1:page:audio');
  ok('NEGATIVE CONTROL: a sound to a page that is not a store keeps the audio row',
    page.ok && page.session?.transport === 'datachannel', JSON.stringify(page.session || page.why));
}

// ── step 0 of plans/plan-routing-migration.md, 2026-10-06 ─────────────────
//
// 🔴 THE RELAY'S REAL CAP, ONE STALE WINDOW, A READ ROW, A PORT'S OWN
// TRANSPORTS, A LINK'S `via`, AND AN INPUT SOMEBODY HOLDS. Every one of them
// refuses something, so most of what follows is a refusal with its reason and
// the same case allowed beside it, which is what proves the refusal is the rule
// and not a link that never matched.

{
  /* M. The relay figure is the worker's, read from the worker's source, so
     the two cannot drift apart again without this going red. */
  const { readFileSync } = await import('node:fs');
  const relay = readFileSync(new URL('../../workers/relay/src/index.js', import.meta.url), 'utf8');
  const num = (k) => Number((new RegExp(`const ${k} = (\\d+)`).exec(relay) || [])[1]);
  ok('the relay figure in the table is the worker\'s own MSG_PER_SEC and MSG_BURST',
    RELAY.msgPerSec === num('MSG_PER_SEC') && RELAY.burst === num('MSG_BURST'),
    `bay ${RELAY.msgPerSec}/${RELAY.burst}, worker ${num('MSG_PER_SEC')}/${num('MSG_BURST')}`);
  /* NEGATIVE CONTROL: the old figure is nowhere in either table. */
  const stale = [...Object.values(TRANSPORTS), READS].flatMap((r) => Object.values(r)).filter((c) => /\b60 msg\/s|stay at 50/.test(c.says));
  ok('NEGATIVE CONTROL: no cell still says the old 60 msg/s', stale.length === 0, stale.map((c) => c.says).join(' | ') || 'none');
  ok('the bay and the registry go stale at the same moment', STALE_MS === REGISTRY_STALE_MS && STALE_MS === 15_000,
    `bay ${STALE_MS}, registry ${REGISTRY_STALE_MS}`);
}

{
  /* N. Reading a store: one reader is https, two over the internet are r2-hls,
     and a recording into the store is still ingest. */
  const b = world();
  b.addNode({ id: 'r2:recordings', kind: 'store', label: 'recordings', place: 'cloudflare', net: 'cloudflare' });
  b.addPort({ id: 'r2:recordings:out', label: 'recordings', dir: 'out', medium: 'audio', address: 'archive.positron.studio' });
  b.addPort({ id: 'r2:recordings:in', label: 'recordings', dir: 'in', medium: 'audio', address: 'ingest.positron.studio' });
  const one = b.link('r2:recordings:out', 'home:page:audio');
  const two = b.link('r2:recordings:out', 'away:page:audio');
  ok('one reader of a stored object over the internet is an https read', one.session?.transport === 'https'
    && one.session.where === 'internet-one', JSON.stringify(one.session || one.why));
  ok('and a second reader of the same object is R2 plus HLS', two.session?.transport === 'r2-hls'
    && two.session.where === 'internet-many', JSON.stringify(two.session || two.why));
  /* NEGATIVE CONTROL: the write path did not move with the read. */
  const rec = b.link('studio-1:circuit:audio', 'r2:recordings:in');
  ok('NEGATIVE CONTROL: a sound into the store is still an upload through ingest', rec.session?.transport === 'ingest',
    JSON.stringify(rec.session || rec.why));
  /* A recording is not a receiver: a listener after it is the first one. */
  const after = b.link('studio-1:circuit:audio', 'home:page:audio');
  ok('a link into a store does not count as a receiver of the sound', after.session?.where === 'internet-one'
    && after.session.transport === 'relay', JSON.stringify(after.session || after.why));
  ok('every transport the tables name is one via may ask for, https included',
    ['https', 'moq', 'relay-h264', 'whep'].every((x) => TRANSPORT_NAMES.includes(x))
    && MACHINE_ONLY.every((x) => TRANSPORT_NAMES.includes(x)), TRANSPORT_NAMES.join(', '));
}

/** The board's GPU and a WHIP-only input, the two shapes plan-stage-patchbay F1 named. */
function restricted() {
  const b = world();
  b.addNode({ id: 'studio-1:gpu', kind: 'engine', label: 'GPU', place: 'studio-1', net: 'studio-lan' });
  b.addNode({ id: 'cf:stage', kind: 'endpoint', label: 'stage input', place: 'cloudflare', net: 'cloudflare' });
  const V = { codec: 'h264' };
  b.addPort({ id: 'studio-1:gpu:video', label: 'GPU', dir: 'out', medium: 'video', shape: V, transports: ['relay-h264'] });
  b.addPort({ id: 'cf:stage:video', label: 'stage input', dir: 'out', medium: 'video', shape: V, transports: ['whep'] });
  b.addPort({ id: 'cf:open:video', label: 'open input', dir: 'out', medium: 'video', shape: V });
  for (const [id, label] of [['home:page:video', 'home screen'], ['away:page:video', 'away screen'], ['m1:page:video', 'M1 screen']]) {
    b.addPort({ id, label, dir: 'in', medium: 'video', shape: V });
  }
  return b;
}

{
  /* O. A port's own transports. */
  const b = restricted();
  const gpu = b.link('studio-1:gpu:video', 'home:page:video');
  ok('a port that only travels by relay-h264 gets the cell\'s second choice, not WHEP', gpu.ok
    && gpu.session?.transport === 'relay-h264' && gpu.session.where === 'internet-one', JSON.stringify(gpu.session || gpu.why));
  const first = b.link('cf:stage:video', 'home:page:video');
  const second = b.validate('cf:stage:video', 'away:page:video');
  ok('a WHIP-only input takes its first receiver over WHEP', first.ok && first.session?.transport === 'whep',
    JSON.stringify(first.session || first.why));
  ok('and its second is refused in words naming both lists, not handed LL-HLS', !second.ok
    && /only travels by whep/.test(second.why) && /llhls/.test(second.why) && /via/.test(second.fix || ''),
    `${second.why} / ${second.fix}`);
  /* NEGATIVE CONTROL: the same second receiver of a port with no restriction is LL-HLS. */
  b.link('cf:open:video', 'home:page:video');
  const open2 = b.link('cf:open:video', 'away:page:video');
  ok('NEGATIVE CONTROL: the same second receiver without a restriction is told LL-HLS',
    open2.ok && open2.session?.transport === 'llhls', JSON.stringify(open2.session || open2.why));
  /* A restriction on the source does not refuse the store's own leg. */
  const s = restricted();
  s.addNode({ id: 'r2:clips', kind: 'store', label: 'clips', place: 'cloudflare', net: 'cloudflare' });
  s.addPort({ id: 'r2:clips:in', label: 'clips', dir: 'in', medium: 'video', shape: V0(), address: 'ingest.positron.studio' });
  const rec = s.link('studio-1:gpu:video', 'r2:clips:in');
  ok('a recording of a restricted source is the store\'s leg and is not refused by the source\'s list',
    rec.ok && rec.session?.transport === 'ingest', JSON.stringify(rec.session || rec.why));
  let threw = '';
  try { createBay().addPort({ id: 'x:y:video', label: 'y', dir: 'out', medium: 'video', transports: ['carrier-pigeon'] }); }
  catch (e) { threw = e.message; }
  ok('NEGATIVE CONTROL: a port naming a transport nobody has throws where it is declared, listing the real ones',
    threw.includes('carrier-pigeon') && threw.includes('relay-h264'), threw);
}
function V0() { return { codec: 'h264' }; }

{
  /* P. A link's own via. */
  const b = restricted();
  const moq = b.link('cf:open:video', 'home:page:video', [], { via: 'moq' });
  ok('a link may ask for moq by name, and its session says it was asked for, quoting no number',
    moq.ok && moq.session?.transport === 'moq' && moq.session.via === 'moq'
      && /asked for on this link/.test(moq.session.says) && !/\d/.test(moq.session.says), JSON.stringify(moq.session || moq.why));
  const line = printLink(b.links().find((l) => l.id === moq.id));
  const back = parseLink(line);
  ok('and the line carries via, and reads back with it', line.endsWith(' via moq') && back.via === 'moq'
    && back.from === 'cf:open:video' && back.transforms.length === 0, line);
  const re = restricted();
  ok('and loading that line into a fresh bay makes the same session', re.load(line).length === 0
    && re.links()[0]?.session?.transport === 'moq', JSON.stringify(re.links()[0]?.session));
  const relay = b.link('studio-1:gpu:video', 'm1:page:video', [], { via: 'relay-h264' });
  ok('a via the port allows, at a distance whose cell lists it, keeps the cell\'s words', relay.ok
    && relay.session?.transport === 'relay-h264', JSON.stringify(relay.session || relay.why));
  const bad = b.validate('cf:open:video', 'away:page:video', [], { via: 'carrier-pigeon' });
  ok('NEGATIVE CONTROL: a via nobody has is refused and the refusal lists the real ones', !bad.ok
    && /carrier-pigeon/.test(bad.why) && /moq/.test(bad.fix), `${bad.why} / ${bad.fix}`);
  const local = b.validate('cf:open:video', 'away:page:video', [], { via: 'page' });
  ok('NEGATIVE CONTROL: a one machine transport across a wire is refused', !local.ok && /never leaves one machine/.test(local.why),
    local.why);
  const barred = b.validate('cf:stage:video', 'm1:page:video', [], { via: 'moq' });
  ok('NEGATIVE CONTROL: a via the port does not allow is refused, naming what it does allow', !barred.ok
    && /only travels by whep/.test(barred.why) && /whep/.test(barred.fix), `${barred.why} / ${barred.fix}`);
  const d = desk();
  const midi = d.validate('here:mk425c:out', 'here:circuit:in', [], { via: 'relay' });
  ok('NEGATIVE CONTROL: via on a MIDI link is refused, because the link carries its own bytes', !midi.ok
    && /travels inside the link itself/.test(midi.why), midi.why);
  let lineErr = '';
  try { parseLink('a:b:c -> d:e:f via'); } catch (e) { lineErr = e.message; }
  ok('NEGATIVE CONTROL: a line ending in a bare via is not read as a link', /cannot read/.test(lineErr), lineErr);
}

{
  /* Q. An input somebody holds, plan-routing-migration §3.6 and §5.2. */
  const b = createBay();
  b.addPort({ id: 'web-ab12:keys:out', label: 'keys at ab12', dir: 'out', medium: 'midi', emits: ['note'] });
  b.addPort({ id: 'web-cd34:keys:out', label: 'keys at cd34', dir: 'out', medium: 'midi', emits: ['note'] });
  b.addPort({ id: 'studio-1:synth:in', label: 'synth', dir: 'in', medium: 'midi', accepts: ['note'], heldBy: 'web-ab12' });
  b.addPort({ id: 'studio-1:free:in', label: 'free synth', dir: 'in', medium: 'midi', accepts: ['note'] });
  const other = b.validate('web-cd34:keys:out', 'studio-1:synth:in');
  ok('a link into an input held by another site is refused, naming the holder', !other.ok
    && /held by web-ab12/.test(other.why) && /web-ab12/.test(other.fix || '') && !other.fix.includes(other.why),
    `${other.why} / ${other.fix}`);
  const own = b.validate('web-ab12:keys:out', 'studio-1:synth:in');
  ok('and the holder\'s own site may link into it', own.ok, own.why);
  const asked = b.validate('web-cd34:keys:out', 'studio-1:synth:in', [], { site: 'web-ab12' });
  const notAsked = b.validate('web-ab12:keys:out', 'studio-1:synth:in', [], { site: 'web-cd34' });
  ok('the asker is the page that says who it is, not the source', asked.ok && !notAsked.ok,
    `${asked.why || 'allowed'} | ${notAsked.why}`);
  /* NEGATIVE CONTROL: an input nobody holds takes links from anybody. */
  const free = b.validate('web-cd34:keys:out', 'studio-1:free:in');
  ok('NEGATIVE CONTROL: an input nobody holds takes a link from any site', free.ok, free.why);
  const made = b.link('web-cd34:keys:out', 'studio-1:synth:in');
  ok('and link refuses what validate refused, with the same words', !made.ok && made.why === other.why, made.why);
}

console.log(`\n${pass}/${pass + fail} green${fail ? `  (${fail} FAILED)` : ''}\n`);
process.exit(fail ? 1 : 0);
