// demo/shell/note-grid-test.mjs: the arithmetic of the note picture (`layout`, `place`), no browser.
//   node demo/shell/note-grid-test.mjs
// Drawing is graded on /pack/. The corpus half reads the owner's pack and skips without it.
// why: lessons/kit-note-grid.md#test-header

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { layout, place, noteName, startOf, lengthOf, stepFrom, footOf, FOOT, STEPS, ROW_H, NOTE_H }
  from './note-grid.mjs';

let pass = 0, fail = 0;
function ok(what, cond, detail = '') {
  if (cond) { pass++; console.log(`  ok   ${what}${detail ? `  · ${detail}` : ''}`); return; }
  fail++;
  console.log(`  FAIL ${what}${detail ? `  · ${detail}` : ''}`);
}

// ── names ──────────────────────────────────────────────────────────────────
// Middle C is C3, the Circuit's own numbering (Roland calls note 60 C4).
// why: lessons/kit-note-grid.md#test-names
ok('note 60 is C3, which is what the instrument this page is about calls it',
  noteName(60) === 'C3' && noteName(72) === 'C4' && noteName(48) === 'C2',
  `${noteName(48)} ${noteName(60)} ${noteName(72)}`);
ok('every accidental is named sharp, and the twelve wrap at C',
  noteName(61) === 'C#3' && noteName(71) === 'B3' && noteName(0) === 'C-2',
  `${noteName(61)} ${noteName(71)} ${noteName(0)}`);

// Negative control: a number above 127 cannot be a MIDI note and gets no name.
// why: lessons/kit-note-grid.md#test-over-127
ok('NEGATIVE CONTROL: a number that cannot be a MIDI note gets no name at all',
  noteName(128) === '' && noteName(132) === '' && noteName(-1) === ''
  && noteName(NaN) === '' && noteName(undefined) === '',
  `128 -> ${JSON.stringify(noteName(128))}, 132 -> ${JSON.stringify(noteName(132))}`);

// ── layout ─────────────────────────────────────────────────────────────────
{
  const ev = [
    { region: 4, step: 0, note: 60, velocity: 100 },
    { region: 0, step: 3, note: 72, velocity: 40 },
    { region: 4, step: 9, note: 48, velocity: 127 },
  ];
  const p = layout(ev);
  ok('only the patterns that hold something get a row, in order',
    p.rows.join() === '0,4' && p.regions === 2, p.rows.join());
  ok('the pitch scale is the range of everything handed in, not of one row',
    p.lo === 48 && p.hi === 72 && p.count === 3, `${p.lo} to ${p.hi}`);
  ok('nothing is above the MIDI range in ordinary data', p.over === 0, `${p.over}`);

  const l = layout([]);
  ok('an empty session lays out as nothing rather than as one empty row',
    l.rows.length === 0 && l.count === 0 && l.regions === 0 && l.lo === 0 && l.hi === 0,
    JSON.stringify(l));
  ok('rubbish in is nothing out rather than a throw',
    layout(null).count === 0 && layout(undefined).count === 0);
}

// ── place ──────────────────────────────────────────────────────────────────
{
  const ev = [
    { region: 0, step: 0, note: 48, velocity: 1 },
    { region: 0, step: 0, note: 72, velocity: 1 },
    { region: 3, step: 15, note: 60, velocity: 1 },
  ];
  const p = layout(ev);
  const lo = place(ev[0], p), hi = place(ev[1], p), other = place(ev[2], p);

  // A higher note sits higher; a canvas y axis counts down.
  // why: lessons/kit-note-grid.md#test-higher
  ok('a higher note sits higher in its row',
    hi.y < lo.y && hi.row === lo.row, `${hi.y} above ${lo.y}`);
  ok('the top of the range touches the top of the row and the bottom the bottom',
    hi.y === 0 && Math.abs(lo.y - (ROW_H - NOTE_H)) < 1e-9,
    `${hi.y} and ${lo.y} in a ${ROW_H} px row with ${NOTE_H} px notes`);
  ok('a later pattern is a lower row, by exactly one row height each',
    other.row === 1 && other.y >= ROW_H && other.y < 2 * ROW_H, `${other.row}, y ${other.y}`);
  ok('the step is carried through untouched, because x is not this function\'s business',
    other.step === 15 && lo.step === 0);

  // One pitch has no range to divide by (a drum pattern): centred, not dropped, not NaN.
  // why: lessons/kit-note-grid.md#test-one-pitch
  const flat = [{ region: 2, step: 1, note: 60, velocity: 64 }];
  const fp = place(flat[0], layout(flat));
  ok('a pattern whose notes are all one pitch is centred rather than divided by zero',
    Number.isFinite(fp.y) && Math.abs(fp.y - (ROW_H - NOTE_H) / 2) < 1e-9, `y ${fp.y}`);

  ok('an event from a pattern that has no row lands nowhere rather than at zero',
    place({ region: 9, step: 0, note: 60, velocity: 1 }, p) === null);
}

ok('a Circuit pattern is sixteen steps, read from the decoder rather than typed twice',
  STEPS === 16);

// ── the footer and the walk ─────────────────────────────────────────────
// The footer names the note in focus and the arrows move it: both pure halves graded here.
// why: lessons/kit-note-grid.md#test-footer-walk
ok('a start is counted as beat then step, which is what the column headings print',
  startOf(0) === '1.1' && startOf(5) === '2.2' && startOf(15) === '4.4' && startOf(-1) === '',
  `${startOf(0)} ${startOf(5)} ${startOf(15)}`);
ok('a length in steps is printed as steps, and a raw gate as a gate, never as steps',
  lengthOf({ length: 2 }) === '2 steps' && lengthOf({ length: 1 }) === '1 step'
  && lengthOf({ length: 13 / 6 }) === '2.17 steps' && lengthOf({ gate: 13 }) === 'gate 13'
  && lengthOf({}) === '',
  `${lengthOf({ length: 13 / 6 })}, ${lengthOf({ gate: 13 })}`);
{
  /* NEGATIVE CONTROL: the number above the MIDI range gets no name, and the
     footer says so in words rather than printing a name it does not have. */
  const f = footOf({ region: 3, step: 9, note: 130, velocity: 90, gate: 4 });
  ok('NEGATIVE CONTROL: a note number above 127 is `not MIDI` in the footer, with its number beside it',
    f.note === 'not MIDI' && f.number === '130' && f.pattern === '4' && f.start === '3.2',
    JSON.stringify(f));
  const widest = { note: 'not MIDI', number: '132', pattern: '16', start: '4.4',
    length: lengthOf({ length: 95 / 6 }), velocity: '127' };
  ok('every footer cell reserves the widest thing it can say',
    FOOT.every((c) => widest[c.key].length <= c.reserve) && FOOT.length % 2 === 0,
    FOOT.map((c) => `${c.key} ${widest[c.key].length}/${c.reserve}`).join(', '));
  ok('no note is an empty footer, every cell empty',
    Object.values(footOf(null)).every((v) => v === ''));
}
{
  const ev = [
    { region: 0, step: 4, note: 60 }, { region: 0, step: 4, note: 64 },
    { region: 0, step: 8, note: 62 }, { region: 2, step: 7, note: 50 },
    { region: 2, step: 9, note: 55 },
  ];
  const p = layout(ev);
  const go = (from, k) => stepFrom(ev, p, from, k);
  ok('with nothing in focus the walk starts at the first note of the first pattern',
    go(null, 'ArrowRight') === ev[0]);
  ok('right walks a chord low to high and then on in time; left comes back',
    go(ev[0], 'ArrowRight') === ev[1] && go(ev[1], 'ArrowRight') === ev[2]
    && go(ev[2], 'ArrowLeft') === ev[1]);
  ok('down lands on the nearest note in time in the next pattern, the higher one on a tie',
    go(ev[2], 'ArrowDown') === ev[4] && go(ev[0], 'ArrowDown') === ev[3]);
  ok('up from the top pattern and right from the last note go nowhere, rather than wrapping',
    go(ev[0], 'ArrowUp') === null && go(ev[2], 'ArrowRight') === null && go(ev[0], 'Home') === null
    && go(ev[0], 'End') === ev[2] && go(ev[0], 'a') === null);
}

// ── the owner's pack, where it is on this disk ─────────────────────────────
const here = path.dirname(fileURLToPath(import.meta.url));
const PACK = path.join(here, '..', '..', 'tmp', 'personal', 'New Pack.circuitpack');
let skipped = 0;

if (!fs.existsSync(PACK)) {
  skipped++;
  console.log('  skip the corpus half: tmp/personal/New Pack.circuitpack is not on this disk '
    + '(tmp/ is gitignored, so a fresh clone has no pack in it)');
} else {
  const { readZip } = await import('./unzip.mjs');
  const { notesIn } = await import('./circuit-session.mjs');
  const entries = readZip(new Uint8Array(fs.readFileSync(PACK)))
    .filter((e) => /\.circuitsession$/.test(e.name));

  let total = 0, over = 0, withNotes = 0, maxRows = 0;
  let lo = Infinity, hi = -Infinity;
  const first = [];
  for (const e of entries) {
    const events = notesIn(await e.read());
    const p = layout(events);
    if (!first.length && events.length) first.push(...events);
    total += p.count;
    over += p.over;
    if (p.count) { withNotes++; if (p.lo < lo) lo = p.lo; if (p.hi > hi) hi = p.hi; }
    if (p.regions > maxRows) maxRows = p.regions;
  }

  ok('the pack lays out as 29 sessions of 32 holding 5,095 events',
    entries.length === 32 && withNotes === 29 && total === 5095,
    `${withNotes} of ${entries.length} sessions, ${total} events`);

  /**
   * 105 events carry note numbers 128 to 132, asserted as an exact count so a decoder change
   * goes red. Masking bit 7 would invent notes 0 to 4.
   * why: lessons/kit-note-grid.md#test-105
   */
  ok('105 of the 5,095 carry a note number above the MIDI range, counted and not clamped',
    over === 105, `${over} above 127`);
  ok('everything else is inside it, so the picture is not full of holes',
    lo >= 0 && lo === 36 && hi === 132, `${lo} to ${hi}`);
  ok('no session needs more rows than a session has patterns',
    maxRows <= 16 && maxRows === 16, `${maxRows} rows at most`);

  /* Every event in the first session that holds any must land somewhere, or the
     picture is quietly dropping music. */
  const p0 = layout(first);
  const placed = first.map((e) => place(e, p0)).filter(Boolean);
  ok('every event in a real session is given a place, including the unreadable ones',
    placed.length === first.length && placed.every((x) => Number.isFinite(x.y)),
    `${placed.length} of ${first.length}`);
}

console.log(`\n${pass}/${pass + fail} green${fail ? `  (${fail} FAILED)` : ''}`
  + `${skipped ? `  ${skipped} skipped` : ''}\n`);
process.exit(fail ? 1 : 0);
