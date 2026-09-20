// demo/shell/midi-decode-test.mjs — the decoder's arithmetic, no browser.
//
// 🔴 IT GRADES THE DECODER AGAINST STREAMS WHOSE ANSWER IS KNOWN, WHICH IS THE
// ONLY KIND THAT CAN GRADE ANYTHING. Four real devices are plugged into this
// machine, and not one of them can test this file: what a device happens to
// send today is not a known answer, so pointing the page at a mixer proves the
// page runs and proves nothing about whether it reads correctly.
//
// ⚠️ FOUR OF THESE ARE NEGATIVE CONTROLS and they are the half that proves the
// instrument. A decoder that called everything relative would pass "it found a
// relative encoder". These require it to call an absolute one absolute, to
// refuse a verdict on too few samples, to leave a non-reply unparsed, and to
// leave an NRPN without an address incomplete.
//
//   node demo/shell/midi-decode-test.mjs

import {
  decode, isFlood, noteName, deviceInquiry, readInquiryReply, classifyBend,
  classifyEncoder, createNrpn,
} from './midi-decode.mjs';

let pass = 0, fail = 0;
const ok = (name, got, want) => {
  const good = JSON.stringify(got) === JSON.stringify(want);
  good ? pass++ : fail++;
  console.log(`${good ? '  ok  ' : 'FAIL  '}${name}${good ? '' : `\n        got  ${JSON.stringify(got)}\n        want ${JSON.stringify(want)}`}`);
};

console.log('\n-- channel messages');
ok('note on is a note on', decode([0x90, 60, 100]).kind, 'note on');
ok('NOTE ON AT VELOCITY 0 IS A NOTE OFF', decode([0x90, 60, 0]).kind, 'note off');
// 🔴 THIS ASSERT USED TO READ `.includes('velocity 0')` AND PASSED VACUOUSLY
// UNDER THE SABOTAGE, because a decoder that wrongly calls it a note ON also
// writes `velocity 0` in its reading. That is CLAUDE.md's substring rule inside
// a file written to catch exactly this. Assert the word that only the CORRECT
// branch produces.
ok('and the reading says off, not just velocity 0', decode([0x90, 60, 0]).reading.startsWith('C4 off'), true);
ok('a real note off is a note off', decode([0x80, 60, 64]).kind, 'note off');
ok('channel is 1-16 for a reader', decode([0x9f, 60, 100]).ch, 16);
ok('control change carries its number', decode([0xb0, 74, 90]).cc, 74);
ok('program change has no second byte', decode([0xc0, 5]).d2, null);

console.log('\n-- pitch bend, where the byte order is the trap');
ok('centre is 8192', decode([0xe0, 0x00, 0x40]).reading, '8192, centred');
ok('LSB FIRST, not MSB first', decode([0xe0, 0x7f, 0x00]).reading, '127, -8065');
ok('NEGATIVE CONTROL: big endian would read 16256', decode([0xe0, 0x7f, 0x00]).reading.includes('16256'), false);

console.log('\n-- floods, which must never reach the table');
ok('clock is a flood', isFlood(0xf8), true);
ok('active sensing is a flood', isFlood(0xfe), true);
ok('NEGATIVE CONTROL: a note is not a flood', isFlood(0x90), false);
ok('a clock byte carries NO channel', decode([0xf8]).ch, null);
ok('and no data bytes either', [decode([0xf8]).d1, decode([0xf8]).d2], [null, null]);
ok('start is named', decode([0xfa]).kind, 'start');

console.log('\n-- raw bytes survive the reading');
ok('bytes are kept verbatim', decode([0x90, 60, 100]).bytes, '90 3C 64');
ok('note 60 is C4', noteName(60), 'C4');

console.log('\n-- NRPN: four messages that mean one thing');
{
  const n = createNrpn();
  const feed = (cc, v) => n.feed(decode([0xb0, cc, v]));
  ok('address alone completes nothing', [feed(99, 1), feed(98, 40)], ['', '']);
  ok('data entry completes it', feed(6, 77), 'NRPN 168 = 77');
  ok('fine data entry is named separately', feed(38, 12), 'NRPN 168 fine = 12');
}
{
  const n = createNrpn();
  ok('RPN is told apart from NRPN',
    [n.feed(decode([0xb0, 101, 0])), n.feed(decode([0xb0, 100, 0])), n.feed(decode([0xb0, 6, 2]))],
    ['', '', 'RPN 0 = 2']);
}
{
  const n = createNrpn();
  ok('NEGATIVE CONTROL: data entry with no address completes nothing',
    n.feed(decode([0xb0, 6, 77])), '');
}

console.log('\n-- absolute against relative, the question the page exists for');
{
  // A Mackie Control V-Pot: 0x01 clockwise, 0x41 counter clockwise, forever.
  const clicks = [1, 1, 1, 1, 65, 65, 1, 1, 65, 1, 1, 65];
  ok('a relative encoder is called relative', classifyEncoder(clicks).verdict, 'relative');
  // A knob swept across its travel.
  const sweep = [0, 9, 18, 27, 36, 45, 54, 63, 72, 81, 90, 99, 108, 117, 127];
  ok('NEGATIVE CONTROL: an absolute knob is called absolute',
    classifyEncoder(sweep).verdict, 'absolute');
  ok('NEGATIVE CONTROL: four messages are not enough to say',
    classifyEncoder([1, 1, 65, 1]).verdict, 'unknown');
  ok('and it says how many it needs', classifyEncoder([1, 1, 65, 1]).why.includes('10 needed'), true);
  // 🔴 THE TRAP, AND IT WAS A REAL BUG. An absolute knob at the BOTTOM of its
  // range, nudged gently, puts every value inside the low cluster and produces
  // few distinct ones, which is what a relative encoder also looks like if you
  // only ask "are the values clustered". The first build of the classifier
  // called this relative. There is no way to tell them apart from one
  // direction, so the honest answer is that there is no answer yet.
  ok('NEGATIVE CONTROL: an absolute knob nudged only near zero is NOT relative',
    classifyEncoder([2, 3, 4, 5, 4, 3, 2, 3, 4, 5, 6]).verdict, 'unknown');
  ok('and it says which way to turn it', 
    classifyEncoder([2, 3, 4, 5, 4, 3, 2, 3, 4, 5, 6]).why.includes('other way'), true);
  ok('one direction of a REAL encoder is also unknown, for the same reason',
    classifyEncoder([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]).verdict, 'unknown');
}

console.log('\n-- a REAL encoder, measured, which the first classifier got wrong');
{
  /**
   * 🔴 THE EXACT HISTOGRAM OF A TASCAM MODEL 12 MULTI JOG, read through this
   * module on 2026-09-20 over 525 messages. It is here because the first build
   * of `classifyEncoder` called it `unknown`: the clusters were guessed as 1-15
   * and 65-79, and a real MCU encoder uses the whole of 0x01..0x3F and
   * 0x41..0x7F, so a fast turn sending 63 fell outside the window.
   * ⚠️ NOTE `0x3F` AND `0x7F` AT THE SAME COUNT. That symmetry is the signature.
   */
  const jog = [];
  for (const [v, n] of [[0x44, 189], [0x04, 172], [0x3F, 48], [0x7F, 48], [0x42, 35], [0x62 & 0x7f, 0]])
    for (let i = 0; i < n; i++) jog.push(v);
  for (let i = 0; i < 33; i++) jog.push(0x42);
  const got = classifyEncoder(jog);
  ok('a measured Model 12 jog is read as relative', got.verdict, 'relative');
  ok('and it names the step sizes it saw', got.why.includes('(2, 4, 63)'), true);
  ok('NEGATIVE CONTROL: a full 0..127 sweep is still absolute',
    classifyEncoder(Array.from({ length: 43 }, (_, i) => i * 3)).verdict, 'absolute');
  ok('NEGATIVE CONTROL: a measured Circuit macro is absolute',
    classifyEncoder([50, 52, 55, 58, 61, 64, 66, 68, 70, 72, 74, 76, 78]).verdict, 'absolute');
  ok('NEGATIVE CONTROL: clicks in one direction only stay unknown',
    classifyEncoder([1, 1, 1, 4, 4, 1, 1, 4, 1, 1, 4, 1]).verdict, 'unknown');
  // A magnitude of zero is not a click. A knob sweeping its travel passes
  // through 0 and 64 like any other value, and must not read as an encoder.
  ok('NEGATIVE CONTROL: a stream full of zero magnitudes is not an encoder',
    classifyEncoder([0, 64, 0, 64, 0, 64, 0, 64, 0, 64, 0, 64]).verdict !== 'relative', true);
}

console.log('\n-- seven bits wearing a fourteen bit message, both disguises MEASURED');
{
  // An Evolution MK-425C wheel: the low byte is always zero.
  const mk = [[0xe0, 0, 34], [0xe0, 0, 35], [0xe0, 0, 40], [0xe0, 0, 90], [0xe0, 0, 127]];
  // 🔴 A TASCAM Model 12 MCU fader: the low byte is a COPY of the high byte.
  // These are real bytes off the wire. The naive test asks whether the LSB
  // moves, and it moves on every one of these, so the naive test answers
  // FOURTEEN BIT about a control with 128 positions.
  const m12 = [[0xe0, 0x22, 0x22], [0xe0, 0x23, 0x23], [0xe0, 0x26, 0x26],
               [0xe0, 0x2a, 0x2a], [0xe0, 0x57, 0x57]];
  const real = [[0xe0, 0x01, 0x40], [0xe0, 0x7f, 0x40], [0xe0, 0x33, 0x41],
                [0xe0, 0x02, 0x20], [0xe0, 0x60, 0x11]];
  ok('a wheel with a zero low byte is seven bit', classifyBend(mk).bits, 7);
  ok('a fader that COPIES its high byte is also seven bit', classifyBend(m12).bits, 7);
  ok('and it says the copy carries nothing',
    classifyBend(m12).why.includes('copy of the high byte'), true);
  ok('NEGATIVE CONTROL: independent bytes really are fourteen bit',
    classifyBend(real).bits, 14);
  ok('NEGATIVE CONTROL: too few messages refuse a verdict', classifyBend(m12.slice(0, 2)).bits, 0);
}

console.log('\n-- device inquiry');
ok('the question is six bytes', deviceInquiry(), [0xf0, 0x7e, 0x7f, 0x06, 0x01, 0xf7]);
ok('a three byte maker is read as three',
  readInquiryReply([0xf0, 0x7e, 0x00, 0x06, 0x02, 0x00, 0x20, 0x29, 0x01, 0x00, 0x02, 0x00, 1, 2, 3, 4, 0xf7]),
  'Focusrite / Novation, family 1, model 2, version 1.2.3.4');
ok('a one byte maker is read as one',
  readInquiryReply([0xf0, 0x7e, 0x00, 0x06, 0x02, 0x43, 0x01, 0x00, 0x02, 0x00, 9, 9, 0, 0, 0xf7]),
  'Yamaha, family 1, model 2, version 9.9.0.0');
ok('an unknown maker prints its id rather than a guess',
  readInquiryReply([0xf0, 0x7e, 0x00, 0x06, 0x02, 0x55, 0, 0, 0, 0, 1, 0, 0, 0, 0xf7]).startsWith('maker 55'),
  true);
ok('NEGATIVE CONTROL: ordinary sysex is not an inquiry reply',
  readInquiryReply([0xf0, 0x00, 0x20, 0x29, 0x01, 0xf7]), '');
ok('a sysex message decodes as sysex', decode([0xf0, 0x00, 0x20, 0x29, 0xf7]).kind, 'sysex');

console.log(`\n${pass} pass, ${fail} fail\n`);
process.exit(fail ? 1 : 0);
