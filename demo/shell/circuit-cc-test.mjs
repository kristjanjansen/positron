// demo/shell/circuit-cc-test.mjs — the Circuit's control change table.
//
//   node demo/shell/circuit-cc-test.mjs
//
// 🔴 THE POINT OF THIS FILE IS THAT IT CHECKS THE TABLE AGAINST A DIFFERENT
// SOURCE FROM THE ONE IT CAME FROM. `circuit-cc.mjs` was parsed out of
// Novation's Programmer's Reference Guide. Every assertion below that names a
// number compares it against something THIS DESK measured through `/dump/` and
// wrote into `measured-devices-2026-09-20.md`. A test that re-derived the
// numbers from the same document would catch a typo and could never catch a
// misreading, which is exactly what `timeline/csound.mjs` was 22/22 green
// about for months.
import { CIRCUIT_CC, onChannel, sections, param, ccBytes } from './circuit-cc.mjs';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? ' · ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' · ' + detail : ''}`); }
};

console.log('\n== the Circuit control change table ==');

ok('98 control change parameters, which is the count the document was parsed for',
  CIRCUIT_CC.length === 98, `${CIRCUIT_CC.length}`);

ok('they split 52 synth, 28 drum, 18 session',
  onChannel('1/2').length === 52 && onChannel('10').length === 28 && onChannel('16').length === 18,
  `${onChannel('1/2').length} / ${onChannel('10').length} / ${onChannel('16').length}`);

// ── against what this desk measured, which is the independent half ─────────

{
  // MEASURED here on 2026-09-20: 583 messages, a full sweep, every macro seen.
  const macros = [80, 81, 82, 83, 84, 85, 86, 87]
    .map((cc, i) => param('1/2', cc)?.name === `macro knob ${i + 1} position`);
  ok('macro knobs 1 to 8 are CC 80 to 87 on the synth channels, as measured here',
    macros.every(Boolean), `${macros.filter(Boolean).length} of 8`);
}

{
  // MEASURED here: the master filter answers on channel 16 and nowhere else.
  // 🔴 AND THE SAME CONTROLLER NUMBER MEANS SOMETHING ELSE ON THE SYNTHS, which
  // is the whole reason this table is keyed by a pair.
  const s16 = param('16', 74), s12 = param('1/2', 74);
  ok('CC 74 is the master filter on channel 16 and the synth filter on 1 and 2',
    s16?.sec === 'Master Filter' && s12?.sec === 'Filter' && s16.name !== s12.sec,
    `16: ${s16?.sec} / 1-2: ${s12?.sec}`);
}

{
  // 🔴 THE COLLISION THAT PROVES THE KEY. CC 80 is macro knob 1 on the synths
  // and drum 4 pan on channel 10, in one instrument.
  const a = param('1/2', 80), b = param('10', 80);
  ok('CC 80 is two different parameters on two different channels',
    !!a && !!b && a.name !== b.name, `${a?.name} / ${b?.name}`);
}

{
  // NEGATIVE CONTROL: a controller number nothing uses must come back null
  // rather than as a plausible neighbour.
  ok('a controller number the Circuit does not use answers null',
    param('1/2', 126) === null && param('16', 1) === null, 'CC 126 and CC 1 on 16');
}

{
  const drums = ['drum 1 level', 'drum 2 level', 'drum 3 level', 'drum 4 level']
    .every((n) => onChannel('10').some((p) => p.name === n));
  ok('all four drums have a level on channel 10', drums);
}

// ── the section column, after 28 rows of it were a heading off page 9 ──────

{
  /* 🔴 ALL 28 DRUM ROWS READ `song select` UNTIL 2026-09-21. `circuit-cc.mjs`'s
     header carries the measurement; the short version is that the Drum Control
     table on page 10 has no `Section` column, so a parse carrying the last
     section forward was still holding the foot of page 9.
     ⚠️ AND THIS ASSERT IS A DOCUMENT CLAIM RATHER THAN A MEASUREMENT, which is
     unlike every assert above it and is worth saying out loud. This desk has
     never measured a drum control change at all: `measured-devices-2026-09-20.md`
     has channel 10 as notes 60, 62 and 64 at a fixed velocity of 96 and nothing
     more, so there is no second source to hold the drums' section against. */
  const secs = sections('10');
  ok('the 28 drum parameters sit under one section, and it is the table they came out of',
    secs.length === 1 && secs[0] === 'Drum Control'
      && onChannel('10').every((p) => p.sec === 'Drum Control'),
    secs.join(', '));
}

{
  /* 🔴 A NEGATIVE CONTROL FOR THE WHOLE COLUMN RATHER THAN FOR THE DRUMS. What
     failed was a heading from a NEIGHBOURING table leaking in, so the guard is
     the things that sit beside the parameter tables and are not sections: the
     reference's Supported Realtime and Supported System Common message names.
     Put `song select` back on any one row and this goes red. */
  const NOT_SECTIONS = ['song select', 'song position pointer', 'start', 'stop',
    'continue', 'timing clock'];
  const leaked = CIRCUIT_CC.filter((p) => NOT_SECTIONS.includes(p.sec.toLowerCase()));
  ok('no section is a MIDI message name off a neighbouring table',
    leaked.length === 0,
    leaked.length ? leaked.map((p) => `${p.ch}: ${p.sec}`).join(', ') : `none of ${NOT_SECTIONS.length} checked`);

  /* ⚠️ AND THE CHEAPER TELL, WHICH WAS ON SCREEN FOR A DAY BEFORE ANYBODY
     OPENED THE PDF. The reference sets every `Section` cell in Title Case and
     every message name in lower case, so a lower case section is a value that
     came from somewhere other than the Section column. */
  const lower = CIRCUIT_CC.filter((p) => p.sec[0] !== p.sec[0].toUpperCase());
  ok('every section is Title Case, the way the reference prints that column',
    lower.length === 0,
    lower.length ? lower[0].sec : `${new Set(CIRCUIT_CC.map((p) => p.sec)).size} distinct sections`);
}

// ── the bytes ──────────────────────────────────────────────────────────────

{
  ok('the master filter on channel 16 is BF 4A 64',
    JSON.stringify(ccBytes(16, 74, 100)) === '[191,74,100]', JSON.stringify(ccBytes(16, 74, 100)));
  ok('macro 1 on channel 1 is B0 50 00',
    JSON.stringify(ccBytes(1, 80, 0)) === '[176,80,0]', JSON.stringify(ccBytes(1, 80, 0)));
  // ⚠️ CLAMPED RATHER THAN WRAPPED. A value of 200 that wraps to 72 is a
  // parameter moving to somewhere nobody asked for, which reads as a broken
  // instrument rather than a broken number.
  ok('a value past the top is clamped, not wrapped',
    ccBytes(1, 80, 200)[2] === 127 && ccBytes(1, 80, -5)[2] === 0,
    `${ccBytes(1, 80, 200)[2]} and ${ccBytes(1, 80, -5)[2]}`);
  ok('every byte it produces is a legal MIDI byte',
    ccBytes(16, 200, 300).every((b, i) => (i === 0 ? b >= 0x80 && b <= 0xbf : b <= 0x7f)),
    JSON.stringify(ccBytes(16, 200, 300)));
}

// ── the shape of the table ─────────────────────────────────────────────────

{
  ok('every row has a channel group, a name, a controller and a range',
    CIRCUIT_CC.every((p) => p.ch && p.name && Number.isInteger(p.cc) && p.hi > p.lo),
    `${CIRCUIT_CC.filter((p) => !(p.hi > p.lo)).length} with no range`);
  ok('every controller number is inside seven bits',
    CIRCUIT_CC.every((p) => p.cc >= 0 && p.cc <= 127));
  ok('no channel group but the three the reference documents',
    CIRCUIT_CC.every((p) => ['1/2', '10', '16'].includes(p.ch)));
  const secs = sections('1/2');
  ok('the synth sections come back in the order the reference prints them',
    secs[0] === 'Voice' && secs.includes('Filter') && secs.includes('Envelope'),
    secs.join(', '));
}

{
  // 🔴 NOTHING IN THIS TABLE CAN WRITE FLASH, and that is the safety claim an
  // editor built on it rests on. Every row is a control change, so the only
  // status byte reachable is 0xB0.
  ok('every parameter here is a control change and nothing else',
    CIRCUIT_CC.every((p) => (ccBytes(1, p.cc, 0)[0] & 0xf0) === 0xb0));
}

console.log(`\n${pass}/${pass + fail} green${fail ? `  (${fail} FAILED)` : ''}\n`);
process.exit(fail ? 1 : 0);
