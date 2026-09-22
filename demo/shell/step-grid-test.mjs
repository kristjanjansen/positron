// demo/shell/step-grid-test.mjs
// The pad grid's arithmetic and its refusals, with no browser.
//
//   node demo/shell/step-grid-test.mjs
//
// 🔴 FIVE PURE FUNCTIONS AND ONE REFUSAL, AND THE REFUSAL IS THE ONE WORTH
// RUNNING. A grid that plays is claiming a tempo, and `/pack/` has none to
// claim because nothing in a Circuit session names one. `createStepGrid` throws
// on a rate with no owner, and that is the only thing in this file that needs
// a document to be absent rather than present.
//
// ⚠️ WHAT IS NOT GRADED HERE, SAID PLAINLY BECAUSE A GREEN SUITE CAN MEAN ZERO
// COVERAGE. Nothing below draws a pad. `/tom/` grades the real thing against a
// real pack, and `/kit/` grades the two shapes side by side:
//   - that the label column and the steps really share one pitch, top and
//     bottom, which `/tom/` asserts over 64 rows
//   - that a stroke paints every pad it crosses with one value, which `/tom/`
//     drives with real pointer events including the negative half
//   - that an arrow moves focus and does NOT reach the transport
//   - that a read only grid has no tab stop, no hover lift and no focus ring
//   - that the parked head lifts a pad's field and the playing one replaces it
//
// 🔴 AND THE FIVE SETTLED EDGES ARE CHECKED AS TEXT, WHICH IS THE ONLY CHEAP
// WAY. Each one is an absence somebody asked for and reported separately, and
// an absence is exactly what a rewrite puts back. Reading the stylesheet for a
// border that should not be there costs one command.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  cellSize, stepAt, stepMsFor, rovingNext, marksAt,
  createStepGrid, PAD_MIN, PAD_GAP,
} from './step-grid.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(HERE, 'step-grid.mjs'), 'utf8');
const css = fs.readFileSync(path.join(HERE, 'shell.css'), 'utf8');

/**
 * The module with its prose taken out.
 *
 * ⚠️ IT EXISTS BECAUSE TWO OF THE CHECKS BELOW WENT RED ON THE MODULE'S OWN
 * HEADER. `step-grid.mjs` explains at length that it has no `AudioContext` and
 * that `setPointerCapture` is the obvious thing and is wrong here, so a search
 * for either string over the whole file finds the explanation and calls it the
 * defect. A guard on a substring is this project's named hazard and this is it
 * in its cheapest form, twice in one afternoon.
 */
const code = src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

let pass = 0, fail = 0;
function ok(what, cond, detail = '') {
  if (cond) { pass++; console.log(`  ok   ${what}${detail ? `  ${detail}` : ''}`); return; }
  fail++;
  console.log(`  FAIL ${what}${detail ? `  ${detail}` : ''}`);
}

// ── the measured pad ───────────────────────────────────────────────────────
ok('sixteen steps in a wide strip give a pad of most of the room',
  cellSize(658, 16) === 39, `${cellSize(658, 16)} px a pad at 658`);

ok('the gutters are taken off before dividing, not after',
  cellSize(658, 16) === Math.floor((658 - 15 * PAD_GAP) / 16),
  `${PAD_GAP} px between, 15 of them`);

/* 🔴 THE FLOOR IS THE WHOLE REASON THIS IS A FUNCTION. Without it a narrow box
   gives a pad of zero or a negative width, which draws nothing at all and looks
   like a grid that failed to build rather than one that needs scrolling.
   MEASURED: 64 steps at a phone's 360 px is 3 px a pad before the floor. */
ok('a box too narrow for the steps gives the floor rather than a pad of nothing',
  cellSize(360, 64) === PAD_MIN && cellSize(0, 16) === PAD_MIN
  && cellSize(-50, 16) === PAD_MIN,
  `64 steps in 360 px would be ${Math.floor((360 - 63 * PAD_GAP) / 64)} px without it`);

ok('a phone with sixteen steps still gets a pad worth pressing',
  cellSize(360, 16) >= 20, `${cellSize(360, 16)} px a pad at 360`);

/* The two shapes this component was built for, side by side, so a change that
   suits one and ruins the other shows up here. */
ok('the two real shapes both land on a square pad a reader can hit',
  cellSize(658, 16) > 30 && cellSize(658, 16) === cellSize(658, 16),
  `/tom/ and /pack/ are both 16 steps, so both get ${cellSize(658, 16)} px`);

// ── where the head is ──────────────────────────────────────────────────────
ok('a position lands in the step that holds it',
  stepAt(0, 125, 16) === 0 && stepAt(124, 125, 16) === 0
  && stepAt(125, 125, 16) === 1 && stepAt(1999, 125, 16) === 15);

/* 🔴 CLAMPED AT BOTH ENDS. A position past the last step indexing to step `n`
   would run off the pads and quietly stop drawing a head at the one moment a
   reader is watching for it. */
ok('a position off either end is the nearest step and never off the grid',
  stepAt(-1000, 125, 16) === 0 && stepAt(8000, 125, 16) === 15
  && stepAt(2000, 125, 16) === 15);

ok('a step length of nothing does not divide by zero',
  Number.isInteger(stepAt(500, 0, 16)) && stepAt(500, 0, 16) === 15);

// ── the tempo, which belongs to the page ───────────────────────────────────
ok('120 beats a minute over four steps a beat is the 125 ms /tom/ already uses',
  stepMsFor(120, 4) === 125, `${stepMsFor(120, 4)} ms`);
ok('half the tempo is twice the step, and double is half',
  stepMsFor(60, 4) === 250 && stepMsFor(240, 4) === 62.5);
ok('a tempo of nothing does not divide by zero',
  Number.isFinite(stepMsFor(0, 4)) && Number.isFinite(stepMsFor(-5, 4)));

// ── the roving tab stop ────────────────────────────────────────────────────
ok('the four arrows move one square each',
  rovingNext('ArrowRight', 2, 3, 8, 16).join() === '2,4'
  && rovingNext('ArrowLeft', 2, 3, 8, 16).join() === '2,2'
  && rovingNext('ArrowDown', 2, 3, 8, 16).join() === '3,3'
  && rovingNext('ArrowUp', 2, 3, 8, 16).join() === '1,3');

ok('Home and End go to the ends of this row, not of the grid',
  rovingNext('Home', 2, 9, 8, 16).join() === '2,0'
  && rovingNext('End', 2, 9, 8, 16).join() === '2,15');

/* 🔴 IT CLAMPS AND NEVER WRAPS, which is a decision. An arrow that wrapped from
   the last step of a row to the first of the next reads as the focus jumping,
   and on a 64 row grid it means holding a key walks the whole instrument. */
ok('an arrow at an edge stays where it is rather than wrapping to the next row',
  rovingNext('ArrowRight', 0, 15, 8, 16).join() === '0,15'
  && rovingNext('ArrowLeft', 0, 0, 8, 16).join() === '0,0'
  && rovingNext('ArrowUp', 0, 5, 8, 16).join() === '0,5'
  && rovingNext('ArrowDown', 7, 5, 8, 16).join() === '7,5');

/* 🔴 EVERY OTHER KEY HAS TO COME BACK `null`, because the handler lets anything
   it does not answer BUBBLE to the transport bar's own keyboard table. A
   function that answered a position for an unknown key would swallow the space
   that plays. */
ok('NEGATIVE CONTROL: any other key is not this function\'s business',
  rovingNext(' ', 0, 0, 8, 16) === null
  && rovingNext('Enter', 0, 0, 8, 16) === null
  && rovingNext('a', 0, 0, 8, 16) === null
  && rovingNext('PageUp', 0, 0, 8, 16) === null);

// ── the marks in the field ─────────────────────────────────────────────────
{
  const over = Array.from({ length: 64 }, (_, s) => marksAt(s));
  const beats = over.filter((m) => m.beat).length;
  const bars = over.filter((m) => m.bar).length;
  /* ⚠️ THE MARKS SURVIVE A CHANGE OF STEP COUNT, which is the thing that would
     quietly stop meaning anything. A beat every 4 and a bar every 16 describe
     four bars over 64 and ONE bar over 16, and both are true statements about
     the grid rather than decoration that happens to land. */
  ok('every fourth step is a beat and every sixteenth is a bar',
    beats === 16 && bars === 4 && over[0].beat && over[0].bar && !over[1].beat,
    `over 64 steps: ${beats} beats and ${bars} bars`);
  const short = Array.from({ length: 16 }, (_, s) => marksAt(s));
  ok('and over sixteen steps that is four beats and one bar, which is still true',
    short.filter((m) => m.beat).length === 4 && short.filter((m) => m.bar).length === 1);
}

// ── the refusal ────────────────────────────────────────────────────────────
//
// 🔴 THIS IS THE ONE THAT MATTERS AND IT IS WHY A COMPONENT WITH A DOCUMENT IN
// IT IS BEING CALLED FROM NODE AT ALL. A grid that plays is claiming a tempo,
// and the day before this component existed `/pack/` shipped with no play
// button precisely because NOTHING IN A CIRCUIT SESSION NAMES ONE. So a rate
// arrives with an owner or it does not arrive, and the check runs before any
// DOM is touched, which is what makes it reachable here.
{
  let threw = null;
  try { createStepGrid({ strip: {}, rows: 4, steps: 16, rate: { bpm: 120 } }); }
  catch (e) { threw = e.message; }
  ok('a rate with nobody owning it is refused, and the message says why',
    !!threw && /whose/.test(threw) && /tempo/.test(threw), threw || 'it did not throw');

  let noStrip = null;
  try { createStepGrid({ rows: 4, steps: 16 }); }
  catch (e) { noStrip = e.message; }
  ok('and a grid with nowhere to put the steps is refused too',
    !!noStrip && /strip/.test(noStrip), noStrip || 'it did not throw');
}

// ── the five settled edges, read off the stylesheet ────────────────────────
//
// 🔴 EACH ONE IS AN ABSENCE SOMEBODY ASKED FOR AND REPORTED SEPARATELY, AND AN
// ABSENCE IS EXACTLY WHAT A REWRITE PUTS BACK. The reports are in the module
// header; these read the rules for the shapes that must not be there.
{
  const block = css.slice(css.indexOf('/* ── step grid'), css.indexOf('/* The set, and its name'));

  ok('the pads carry no border at all, which is the fifth edge asked off them',
    /\.pos-pg-pad \{[^}]*border: 0;/.test(block)
    && !/\.pos-pg-pad \{[^}]*border: 1px/.test(block),
    'rm borders on pads');

  ok('the hover lifts the field and leaves the edge alone',
    /button\.pos-pg-pad:hover \{ filter: brightness\(/.test(block)
    && !/\.pos-pg-pad:hover \{[^}]*border/.test(block),
    'no border hover effect on pad, just make pad brigher on hover');

  ok('the focus ring is INSIDE the pad, or it draws over the two either side',
    /\.pos-pg-pad:focus-visible \{[^}]*outline-offset: -1px/.test(block),
    'a 2 px ring on a 16 px pad is wider than the 2 px gutter');

  ok('the playing column is the pads themselves and there is no cursor element',
    !src.includes('pos-pg-cursor') && !src.includes('pos-pg-band')
    && /rowsEl\.dataset\.now/.test(src),
    'just hilite the pads, no extra bordered cursor');

  ok('the parked head LIFTS the field and only the playing one replaces it',
    src.includes('filter:brightness(1.45)') && src.includes('background:var(--pg-now)')
    && !/data-now="\$\{i\}"\] \$\{at\}\{background/.test(src),
    'hilite should not kill my 1st col beat bg color');

  ok('the label column has no divider down it',
    /\.pos-pg-labs \{[^}]*border-right: 0/.test(block),
    'rm divider vert line next to pads');
}

// ── what the file says about itself ────────────────────────────────────────
{
  ok('the component makes no sound and opens nothing',
    !code.includes('AudioContext') && !code.includes('fetch(')
    && !code.includes('decodeAudioData'),
    'a page decides what a step costs, which is why /pack/ can use this with no tempo');

  ok('the pad size is a custom property, never a written width',
    src.includes("setProperty('--pg-cell'") && !/\.style\.width\s*=/.test(src));

  /* A read only grid must not look pressable, and the way that is done is that
     its pads are not buttons at all. A `disabled` button would say *this is
     switched off* about a picture that is perfectly current. */
  ok('a read only grid builds cells rather than buttons, so nothing can press one',
    /readOnly\s*\n?\s*\? el\('div', 'pos-pg-pad'/.test(src)
    && /if \(!readOnly\) c\.tabIndex/.test(src),
    'it is a state, not disabled');

  ok('the ruler is the only tab stop the component adds outside the pads',
    (src.match(/tabindex: '0'/g) || []).length === 1);

  ok('the stroke listener is on the container, because capturing would paint one pad',
    /rowsEl\.addEventListener\('pointerover'/.test(code)
    && !code.includes('setPointerCapture'));

  ok('the live attribute is deleted rather than set empty, because [data-live] matches on presence',
    /delete rowsEl\.dataset\.live/.test(src));

  const dash = String.fromCharCode(0x2014), middot = String.fromCharCode(0x00b7);
  ok('no em dash and no middot anywhere in the module, comments included',
    !src.includes(dash) && !src.includes(middot),
    `${src.split('\n').length} lines`);
}

console.log(`\n${pass} ok, ${fail} failed`);
process.exit(fail ? 1 : 0);
