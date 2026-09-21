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

import { createBay, apply, delivers, printLink, parseLink, printPatch, parsePatch,
  classOf, checkTransforms, CLASSES, MEDIA, STALE_MS, OP_NAMES, OP_HELP } from './bay.mjs';
import { decode } from './midi-decode.mjs';

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
  ok('a transform with its argument under the wrong key is refused, by name',
    !r.ok && r.why.includes('transpose') && r.why.includes('by'), r.why);
}

{
  // NEGATIVE CONTROL: the same transform, spelled right, connects.
  const b = desk();
  const r = b.link('here:mk425c:out', 'here:circuit:in', [{ op: 'transpose', by: 1 }]);
  ok('and the same transform spelled correctly is allowed', r.ok, r.why);
}

{
  ok('a class nobody has heard of is named in the refusal',
    checkTransforms([{ op: 'only', cls: 'banana' }]).includes('banana'),
    checkTransforms([{ op: 'only', cls: 'banana' }]));
  ok('a half given cc remap says which half is missing',
    checkTransforms([{ op: 'cc', from: 1 }]).includes('to'),
    checkTransforms([{ op: 'cc', from: 1 }]));
  ok('a number given as a string is refused rather than coerced',
    checkTransforms([{ op: 'channel', to: '1' }]).includes('number'),
    checkTransforms([{ op: 'channel', to: '1' }]));
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
    ['note', 'cc', 'bend', 'touch', 'program', 'clock', 'sysex'].every((c) => CLASSES.includes(c)));
  ok('the media are the three the plan names', MEDIA.join(',') === 'midi,audio,clock');
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
  ok('a missing argument is refused by name',
    /fixed takes "to"/.test(checkTransforms([{ op: 'fixed' }]))
    && /channel takes "to"/.test(checkTransforms([{ op: 'channel' }])),
    checkTransforms([{ op: 'fixed' }]));

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
    checkTransforms([{ op: 'range', lo: 60 }]));

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
    /range takes "lo" or "hi"/.test(checkTransforms([{ op: 'range' }]))
    && /vrange takes "lo" or "hi"/.test(checkTransforms([{ op: 'vrange' }])),
    checkTransforms([{ op: 'range' }]));

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
  ok('two ranges open at the same end are refused, and the message carries the right patch',
    /both open at the same end/.test(two) && two.includes('"lo": 0, "hi": 7'), two);

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
    checkTransforms([{ op: 'range', lo: 60 }, { op: 'range', hi: 72 }]));

  ok('a window written as two one-sided ranges keeps only what is inside it',
    apply([{ op: 'range', lo: 60 }, { op: 'range', hi: 72 }], noteAt(64)) !== null
    && apply([{ op: 'range', lo: 60 }, { op: 'range', hi: 72 }], noteAt(59)) === null
    && apply([{ op: 'range', lo: 60 }, { op: 'range', hi: 72 }], noteAt(73)) === null);

  /* A range that can never pass anything is a silent link, not a tight filter. */
  ok('a low bound above the high one is refused rather than passing nothing',
    /can never pass anything/.test(checkTransforms([{ op: 'range', lo: 60, hi: 7 }])),
    checkTransforms([{ op: 'range', lo: 60, hi: 7 }]));

  /* An optional argument that is present is still typed, which it was not while
     the type check ran over the REQUIRED list only. */
  ok('an optional bound that is present is still checked for being a number',
    /range needs "hi" to be a number/.test(checkTransforms([{ op: 'range', lo: 36, hi: '47' }])),
    checkTransforms([{ op: 'range', lo: 36, hi: '47' }]));
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
    .filter(([, why]) => why !== '');
  ok('every transform example passes the validator it demonstrates',
    refused.length === 0, refused.map(([op, why]) => `${op}: ${why}`).join(' | '));

  /* And an example has to USE the op it names: `{"op":"range"}` with no
     arguments passes nothing and would still be a line in the table. */
  const thin = OP_HELP.filter((o) => o.need.some((a) => o.eg[a] === undefined));
  ok('NEGATIVE CONTROL: no example leaves out an argument its op requires',
    thin.length === 0, thin.map((o) => o.op).join(', '));

  /* 🔴 NEGATIVE CONTROL: the thing the owner actually saw. `only` takes a
     class, so a channel number under `to` is refused BY NAME, and the name in
     the refusal is the word the prompt now puts next to it. */
  ok('NEGATIVE CONTROL: `only` given a channel number is refused naming the argument it wanted',
    /only takes "cls"/.test(checkTransforms([{ op: 'only', to: 1 }]))
    && sig.only.includes('cls='),
    checkTransforms([{ op: 'only', to: 1 }]));
}

console.log(`\n${pass}/${pass + fail} green${fail ? `  (${fail} FAILED)` : ''}\n`);
process.exit(fail ? 1 : 0);
