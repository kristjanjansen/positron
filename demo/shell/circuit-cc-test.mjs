// demo/shell/circuit-cc-test.mjs: the Circuit's control change table, checked against what this desk
// measured through /dump/ (research/measured-devices-2026-09-20.md), never the PDF it was parsed from.
// why: lessons/kit-circuit-cc.md#test-header
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
  // Measured here: 583 messages, a full sweep, every macro seen.
  // why: lessons/kit-circuit-cc.md#macros
  const macros = [80, 81, 82, 83, 84, 85, 86, 87]
    .map((cc, i) => param('1/2', cc)?.name === `macro knob ${i + 1} position`);
  ok('macro knobs 1 to 8 are CC 80 to 87 on the synth channels, as measured here',
    macros.every(Boolean), `${macros.filter(Boolean).length} of 8`);
}

{
  // Measured: the master filter answers on channel 16 only; the same CC means else on the synths.
  // why: lessons/kit-circuit-cc.md#master-filter
  const s16 = param('16', 74), s12 = param('1/2', 74);
  ok('CC 74 is the master filter on channel 16 and the synth filter on 1 and 2',
    s16?.sec === 'Master Filter' && s12?.sec === 'Filter' && s16.name !== s12.sec,
    `16: ${s16?.sec} / 1-2: ${s12?.sec}`);
}

{
  // CC 80 is macro knob 1 on the synths and drum 4 pan on channel 10: why the key is a pair.
  // why: lessons/kit-circuit-cc.md#cc80
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
  // A document claim, not a measurement: no drum control change was ever measured here.
  // why: lessons/kit-circuit-cc.md#drum-sections
  const secs = sections('10');
  ok('the 28 drum parameters sit under one section, and it is the table they came out of',
    secs.length === 1 && secs[0] === 'Drum Control'
      && onChannel('10').every((p) => p.sec === 'Drum Control'),
    secs.join(', '));
}

{
  // Negative control: neighbouring tables' message names must never appear as a section.
  // why: lessons/kit-circuit-cc.md#not-sections
  const NOT_SECTIONS = ['song select', 'song position pointer', 'start', 'stop',
    'continue', 'timing clock'];
  const leaked = CIRCUIT_CC.filter((p) => NOT_SECTIONS.includes(p.sec.toLowerCase()));
  ok('no section is a MIDI message name off a neighbouring table',
    leaked.length === 0,
    leaked.length ? leaked.map((p) => `${p.ch}: ${p.sec}`).join(', ') : `none of ${NOT_SECTIONS.length} checked`);

  // Sections are Title Case in the reference, message names lower case: a lower case section leaked.
  // why: lessons/kit-circuit-cc.md#lower-case
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
  // Clamped, not wrapped: 200 wrapping to 72 moves a parameter nobody asked for.
  // why: lessons/kit-circuit-cc.md#clamp
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
  // Nothing in this table can write flash: every row is a control change, status 0xB0 only.
  // why: lessons/kit-circuit-cc.md#no-flash
  ok('every parameter here is a control change and nothing else',
    CIRCUIT_CC.every((p) => (ccBytes(1, p.cc, 0)[0] & 0xf0) === 0xb0));
}

console.log(`\n${pass}/${pass + fail} green${fail ? `  (${fail} FAILED)` : ''}\n`);
process.exit(fail ? 1 : 0);
