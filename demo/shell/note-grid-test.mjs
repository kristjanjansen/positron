// demo/shell/note-grid-test.mjs — the arithmetic of the note picture, no browser.
//   node demo/shell/note-grid-test.mjs
//
// 🔴 THE PURE HALF IS WHAT IS GRADED HERE AND THE DRAWING IS GRADED ON `/pack/`.
// `layout` and `place` decide which patterns get a row, what one pitch scale the
// whole picture uses and where an event lands in it; those are functions of
// their arguments and need no canvas. Whether any ink reaches the screen is a
// different claim and it is asserted against a real pack in the page, where a
// `clientWidth` of 0 can make a perfectly correct picture draw nothing.
//
// 🔴 AND IT IS GRADED AGAINST THE OWNER'S OWN PACK WHERE THAT FILE IS PRESENT,
// because numbers invented for a test agree with whatever the test expects.
// `tmp/` is gitignored, so the corpus half SKIPS on a fresh clone and says so
// rather than passing quietly.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { layout, place, noteName, STEPS, ROW_H, NOTE_H } from './note-grid.mjs';

let pass = 0, fail = 0;
function ok(what, cond, detail = '') {
  if (cond) { pass++; console.log(`  ok   ${what}${detail ? `  · ${detail}` : ''}`); return; }
  fail++;
  console.log(`  FAIL ${what}${detail ? `  · ${detail}` : ''}`);
}

// ── names ──────────────────────────────────────────────────────────────────
//
// ⚠️ MIDDLE C IS C3, WHICH IS THE CIRCUIT'S OWN NUMBERING AND NOT THE ONLY ONE
// IN USE. Roland would call note 60 C4. The instrument this page is about
// labels its drum pads, notes 60 to 65, as octave 3, so that is what is drawn.
ok('note 60 is C3, which is what the instrument this page is about calls it',
  noteName(60) === 'C3' && noteName(72) === 'C4' && noteName(48) === 'C2',
  `${noteName(48)} ${noteName(60)} ${noteName(72)}`);
ok('every accidental is named sharp, and the twelve wrap at C',
  noteName(61) === 'C#3' && noteName(71) === 'B3' && noteName(0) === 'C-2',
  `${noteName(61)} ${noteName(71)} ${noteName(0)}`);

/* 🔴 NEGATIVE CONTROL, AND IT IS THE ONE THIS COMPONENT EXISTS TO BE HONEST
   ABOUT. 105 of the 5,095 events in the owner's pack carry a note number above
   127, which cannot be a MIDI note. An empty string is what a reader should get
   for those, so the caption can say what it really is instead of printing a
   name for a number that has none. */
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

  /* 🔴 A HIGHER NOTE SITS HIGHER, which is the whole claim the picture makes
     and the one a y axis gets backwards for free: a canvas counts down. */
  ok('a higher note sits higher in its row',
    hi.y < lo.y && hi.row === lo.row, `${hi.y} above ${lo.y}`);
  ok('the top of the range touches the top of the row and the bottom the bottom',
    hi.y === 0 && Math.abs(lo.y - (ROW_H - NOTE_H)) < 1e-9,
    `${hi.y} and ${lo.y} in a ${ROW_H} px row with ${NOTE_H} px notes`);
  ok('a later pattern is a lower row, by exactly one row height each',
    other.row === 1 && other.y >= ROW_H && other.y < 2 * ROW_H, `${other.row}, y ${other.y}`);
  ok('the step is carried through untouched, because x is not this function\'s business',
    other.step === 15 && lo.step === 0);

  /* 🔴 A PATTERN WITH ONE PITCH IN IT HAS NO RANGE TO DIVIDE BY, and a drum
     pattern is exactly that. Centred, not dropped and not NaN. */
  const flat = [{ region: 2, step: 1, note: 60, velocity: 64 }];
  const fp = place(flat[0], layout(flat));
  ok('a pattern whose notes are all one pitch is centred rather than divided by zero',
    Number.isFinite(fp.y) && Math.abs(fp.y - (ROW_H - NOTE_H) / 2) < 1e-9, `y ${fp.y}`);

  ok('an event from a pattern that has no row lands nowhere rather than at zero',
    place({ region: 9, step: 0, note: 60, velocity: 1 }, p) === null);
}

ok('a Circuit pattern is sixteen steps, read from the decoder rather than typed twice',
  STEPS === 16);

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
   * 🔴 AND 105 OF THEM CANNOT BE NOTES, WHICH THIS COMPONENT FOUND BY TRYING TO
   * PUT EACH ONE SOMEWHERE. A count never had to. The values are 128 to 132,
   * clustered, with ordinary velocities and gates, and masking bit 7 would turn
   * them into notes 0 to 4, five octaves below anything else in the file.
   * ⚠️ IT IS ASSERTED AS A NUMBER rather than as *some*, so the day the decoder
   * is understood this goes red and somebody reads why.
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
