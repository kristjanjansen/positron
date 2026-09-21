// demo/shell/segment-test.mjs — the segment display's arithmetic, with no
// browser and no picture at all.
//
//   node demo/shell/segment-test.mjs
//
// `GLYPHS`, `segmentsFor` and `layout` are pure, and they are where every
// decision this component makes lives: which bars a character lights, what a
// value too wide for the field does, and what a field shows when nothing has
// been measured. None of that needs a DOM.
//
// 🔴 A SEGMENT MAP IS THE SHAPE OF CODE THAT PASSES A NAIVE TEST BY ACCIDENT.
// A table returning "every bar on" for every character draws a field full of
// `8`s and satisfies any check that only asks whether something lit up. So the
// asserts below name the EXACT bars, and the ones marked NEGATIVE CONTROL are
// written so that a specific wrong implementation fails them:
//
//   NC1  an all-on table                  fails 2, 3, 5 and 7
//   NC2  blank treated as zero            fails 10 and 11
//   NC3  overflow printing the low digits fails 15
//
// All three were run before this file was committed and the counts are in the
// report.
//
// ⚠️ NO MIDDOT IN THE OUTPUT, unlike its older siblings in this directory. The
// separator rule in CLAUDE.md covers a log line, a middot is what the em dash
// sweep changed costume into, and a file born after the rule starts without it.

import { SEGMENTS, GLYPHS, DRAWABLE, COLLISIONS, BLANK_CHAR, OVER_CHAR,
  segmentsFor, layout, GEO, advance, fieldW } from './segment.mjs';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? `  (${detail})` : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? `  (${detail})` : ''}`); }
};
const sorted = (s) => [...s].sort().join('');
// The geometry is rounded to two places in the module, which is finer than a
// hundredth of a glyph. A subtraction of two rounded numbers is not, so a
// width comparison gets a tolerance rather than an equality.
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

console.log('\n== the segment display ==');

// ── the table ───────────────────────────────────────────────────────────────

// 1. Every glyph is made of the seven bars and nothing else, and no glyph names
//    the same bar twice. A typo in a mask is invisible on screen: a duplicated
//    letter draws correctly and a stray one draws nothing.
{
  const bad = Object.entries(GLYPHS).filter(([, m]) =>
    [...m].some((c) => !SEGMENTS.includes(c)) || new Set(m).size !== m.length);
  ok('every glyph is made of the seven bars, each named once',
    bad.length === 0, `${Object.keys(GLYPHS).length} characters, ${bad.length} malformed`);
}

// 2. NEGATIVE CONTROL, AND IT IS THE ONE THE WHOLE FILE IS SHAPED AROUND. A
//    table that answered "all on" would put seven bars behind a `1`.
ok('NEGATIVE CONTROL: a one lights exactly the two bars on its right',
  segmentsFor('1') === 'bc',
  `1 lights ${segmentsFor('1')}, which is ${segmentsFor('1').length} of ${SEGMENTS.length}`);

// 3. NEGATIVE CONTROL, the other half of it: something really does light all
//    seven, so 2 is not passing because the table is simply sparse.
ok('and an eight lights all seven',
  sorted(segmentsFor('8')) === sorted(SEGMENTS.join('')),
  `8 lights ${segmentsFor('8')}`);

// 4. The blank is the only character that lights nothing, and it IS in the
//    table. Padding a short value goes through it, so a missing blank would
//    throw on the commonest reading there is.
{
  const empty = Object.entries(GLYPHS).filter(([, m]) => m === '').map(([c]) => c);
  ok('a blank is in the table, lights nothing, and is the only one that does',
    empty.length === 1 && empty[0] === BLANK_CHAR, `${empty.length} empty glyph(s)`);
}

// 5. NEGATIVE CONTROL. Ten distinct digits. An all-on table collapses these to
//    one pattern, and so does a mask pasted twice.
{
  const masks = new Set('0123456789'.split('').map((c) => sorted(segmentsFor(c))));
  ok('NEGATIVE CONTROL: the ten digits are ten different patterns',
    masks.size === 10, `${masks.size} distinct of 10`);
}

// 6. And across the WHOLE table the only pair that draws identically is the one
//    the header documents. This is the check that catches a mask pasted into
//    the wrong row, which draws a perfectly good character of the wrong name.
{
  const byMask = new Map();
  for (const [ch, m] of Object.entries(GLYPHS)) {
    const k = sorted(m);
    byMask.set(k, [...(byMask.get(k) || []), ch]);
  }
  const clashes = [...byMask.values()].filter((v) => v.length > 1)
    .map((v) => v.sort().join(''));
  const want = COLLISIONS.map((p) => p.slice().sort().join('')).sort();
  ok('the only two characters that draw the same are the documented pair',
    clashes.sort().join(' ') === want.join(' '),
    clashes.length ? clashes.join(' ') : 'none');
}

// 7. NEGATIVE CONTROL. A character this display cannot draw has NO answer, and
//    it is not approximated to the nearest shape. An all-on table answers
//    everything, so this is where it fails hardest.
{
  const refused = [...'KWXVZQ'].filter((c) => segmentsFor(c) === null);
  ok('NEGATIVE CONTROL: a character seven bars cannot draw is refused, not approximated',
    refused.length === 6, `refused ${refused.join('')}`);
}

// 8. Case is smoothed over, because half the drawable letters only exist in one
//    case: a capital B is an 8 and a capital D is a 0, so the table holds them
//    lowercase and a caller may type either.
ok('a caller may type either case, and gets the shape that exists',
  segmentsFor('B') === GLYPHS.b && segmentsFor('O') === GLYPHS.o
  && segmentsFor('N') === GLYPHS.n && segmentsFor('h') === GLYPHS.H,
  'B, O, N and h all resolve');

// 9. The character a field falls back to on overflow has to be drawable, or an
//    overflow would show an EMPTY field, which is the one reading that means
//    something else entirely.
ok('the dash a full field falls back to is itself drawable',
  segmentsFor(OVER_CHAR) === 'g', `${OVER_CHAR} lights ${segmentsFor(OVER_CHAR)}`);

// ── nothing measured ────────────────────────────────────────────────────────

// 10. NEGATIVE CONTROL, AND IT IS THIS PROJECT'S READOUT RULE. Four ways of
//     saying we have not looked, and not one of them may print a digit.
{
  const cases = [['an empty string', ''], ['null', null], ['undefined', undefined],
    ['NaN', NaN]];
  const bad = cases.filter(([, v]) => {
    const r = layout(v, { digits: 3 });
    return !r.blank || r.over || /[0-9]/.test(r.text)
      || r.cells.some((c) => c.on !== '' || c.dp);
  });
  ok('NEGATIVE CONTROL: nothing measured is blank, and never a zero',
    bad.length === 0,
    `${cases.length} cases, all reading "${layout('', { digits: 3 }).text}"`);
}

// 11. NEGATIVE CONTROL, the half that makes 10 mean anything. A field CAN show
//     a real zero, so blank and zero are two different readings rather than one
//     implementation that cannot draw a 0 at all.
{
  const r = layout(0, { digits: 3 });
  ok('NEGATIVE CONTROL: but a measured zero is a zero, lit',
    !r.blank && r.text === '  0' && r.cells[2].on === GLYPHS[0]
    && r.cells[2].on.length === 6,
    `"${r.text}" with ${r.cells[2].on.length} bars on the last cell`);
}

// ── what fits, and where it sits ────────────────────────────────────────────

// 12. Right aligned, and the cells in front of it are BLANK rather than zeros.
{
  const r = layout(7, { digits: 3 });
  ok('a short number sits on the right, padded with blanks',
    r.text === '  7' && r.cells[0].ch === BLANK_CHAR && r.cells[1].ch === BLANK_CHAR,
    `"${r.text}"`);
}

// 13. Exactly full is not overflow. An off-by-one here reads as a display that
//     refuses its own widest value.
{
  const r = layout(999, { digits: 3 });
  ok('a value that exactly fills the field is not an overflow',
    !r.over && r.text === '999', `"${r.text}"`);
}

// 14. A minus spends a cell, which is all seven bars can do with one.
{
  const fits = layout(-42, { digits: 3 });
  const over = layout(-123, { digits: 3 });
  ok('a negative number spends a cell on its minus, and one too wide overflows',
    fits.text === '-42' && !fits.over && over.over,
    `-42 reads "${fits.text}", -123 reads "${over.text}"`);
}

// ── a value too wide ────────────────────────────────────────────────────────

// 15. NEGATIVE CONTROL, AND IT IS THE DEFECT THE DECISION WAS MADE AGAINST. An
//     odometer rolls 1234 into three digits as `234`, which is a wrong number
//     printed confidently. This asserts the dashes AND asserts that the wrong
//     answer is not what comes out.
{
  const r = layout(1234, { digits: 3 });
  ok('NEGATIVE CONTROL: too wide shows dashes, and never the low digits',
    r.over && r.text === '---' && r.text !== '234' && !r.blank,
    `1234 in 3 digits reads "${r.text}"`);
}

// 16. And the value survives, because a field that has overflowed is the one
//     field that cannot show you what it was asked for.
{
  const r = layout(1234, { digits: 3 });
  ok('an overflow keeps the value it could not show, and says why',
    r.asked === '1234' && /3 digits/.test(r.why), `${r.asked}, ${r.why}`);
}

// 17. Every cell of an overflowed field says the same thing, and none of them
//     is a digit. A field mixing dashes and digits reads as a number.
{
  const r = layout(99999, { digits: 4 });
  ok('every cell of an overflow is the same, and not one is a digit',
    new Set(r.cells.map((c) => c.ch)).size === 1 && !/[0-9]/.test(r.text)
    && r.cells.every((c) => c.on === GLYPHS[OVER_CHAR]), `"${r.text}"`);
}

// 18. An infinity is a MEASURED value with no room anywhere, and NaN is the
//     absence of a measurement. Two facts, two answers, which is the
//     distinction a single `Number.isFinite` guard would have collapsed.
{
  const inf = layout(Infinity, { digits: 3 });
  const nan = layout(NaN, { digits: 3 });
  ok('an infinity overflows and a NaN goes blank, which are not the same fact',
    inf.over && !inf.blank && nan.blank && !nan.over,
    `Infinity reads "${inf.text}", NaN reads "${nan.text}"`);
}

// 19. NEGATIVE CONTROL. A character outside the table is refused by the FIELD
//     as well as by the table, rather than drawn as the nearest shape or
//     silently dropped.
{
  const r = layout('K9', { digits: 3 });
  ok('NEGATIVE CONTROL: a field asked for a character it cannot draw refuses it',
    r.over && /K/.test(r.why), r.why);
}

// ── the decimal point ───────────────────────────────────────────────────────

// 20. NEGATIVE CONTROL, AND THE OBVIOUS IMPLEMENTATION FAILS IT. The dot rides
//     the cell before it and costs no cell, so 12.5 fits a three digit field
//     exactly as it does on real hardware. Counting the dot as a character
//     would overflow it.
{
  const r = layout(12.5, { digits: 3, decimals: 1 });
  ok('NEGATIVE CONTROL: a decimal point rides the cell before it and costs no cell',
    !r.over && r.text === '12.5' && r.cells.length === 3
    && r.cells[1].dp && !r.cells[0].dp && !r.cells[2].dp,
    `"${r.text}" in ${r.cells.length} cells, dot on cell ${r.cells.findIndex((c) => c.dp)}`);
}

// 21. And it still runs out of room, so 20 is not passing because the width
//     check was lost along with the cell count.
{
  const r = layout(1234.5, { digits: 3, decimals: 1 });
  ok('a decimal that really is too wide still overflows',
    r.over && r.asked === '1234.5', `"${r.text}", asked ${r.asked}`);
}

// 22. A field with no dot slot has nowhere to put one, so it REFUSES rather
//     than dropping it. Dropping it turns 1.5 into 15, which is the same class
//     of lie as printing the low digits.
{
  const r = layout(1.5, { digits: 3, decimals: 1, dot: false });
  ok('a field built with no decimal point refuses one rather than dropping it',
    r.over && /decimal point/.test(r.why) && r.text !== ' 15', r.why);
}

// 23. A leading dot gets a blank cell to sit on, rather than being thrown away
//     or landing on a cell that is not there.
{
  const r = layout('.5', { digits: 3, dot: true });
  ok('a leading dot gets a blank cell to sit on',
    !r.over && r.text === '  .5' && r.cells[1].dp && r.cells[1].ch === BLANK_CHAR,
    `"${r.text}"`);
}

// 24. `decimals` rounds, and the exact value is not lost: it is what `asked`
//     carries, which is what the tooltip and the page's log read.
{
  const r = layout(12.34, { digits: 3, decimals: 1 });
  ok('a rounded reading keeps the figure it was rounded from',
    r.text === '12.3' && r.asked === '12.3', `"${r.text}", asked ${r.asked}`);
}

// ── the geometry ────────────────────────────────────────────────────────────

// 25. The field's width is a function of how many digits there are and of
//     nothing else, which is what makes the box fixed while the value moves.
//     `layout` cannot reach these and `fieldW` takes no value, so the claim is
//     structural rather than a reading.
{
  const step = fieldW(4, false) - fieldW(3, false);
  ok('one more digit is one more advance, and a value cannot reach the width',
    near(step, advance(false)) && fieldW(1, false) === GEO.W,
    `3 digits ${fieldW(3, false)} units, 4 digits ${fieldW(4, false)}, step ${step}`);
}

// 26. A decimal display keeps the slot after its LAST digit, because `125.` is
//     a reading, and a plain one drops it so the field is not laid off centre
//     inside its own frame.
ok('a decimal field keeps its last dot slot and a plain one does not',
  near(fieldW(3, true), 3 * advance(true))
  && near(fieldW(3, false), 3 * advance(false) - GEO.SPACE),
  `with dots ${fieldW(3, true)} units, without ${fieldW(3, false)}`);

// ── what it says ───────────────────────────────────────────────────────────

// 27. Nothing a reader sees carries an em dash or a middot. Both rules are in
//     CLAUDE.md and both have been broken by a formatter rather than by an
//     author, which is why this is code and not a habit.
{
  const said = [...new Set([
    layout('', { digits: 3 }).why,
    layout(1234, { digits: 3 }).why,
    layout(Infinity, { digits: 3 }).why,
    layout('K', { digits: 3 }).why,
    layout(1.5, { digits: 3, dot: false }).why,
    layout(7, { digits: 3 }).why,
  ])];
  ok('nothing the display can say carries an em dash or a middot',
    said.every((s) => !s.includes('—') && !s.includes('·')),
    `${said.length} strings`);
}

// 28. And the drawable list is a string a page can print, with the blank in it
//     but nothing that would read as one.
ok('the drawable list is printable and holds every character in the table',
  DRAWABLE.length === Object.keys(GLYPHS).length && DRAWABLE.includes(OVER_CHAR)
  && DRAWABLE.includes(BLANK_CHAR),
  `${DRAWABLE.length} characters`);

console.log(`\n${pass} ok, ${fail} failed`);
process.exit(fail ? 1 : 0);
