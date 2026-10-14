// demo/shell/step-grid-test.mjs: the pad grid's arithmetic and its refusals, no browser
// (node demo/shell/step-grid-test.mjs). Nothing here draws a pad: /tom/ and /kit/ grade that.
// The refusal of a rate with no owner is the check that matters; the settled edges are read as CSS text.
// why: lessons/kit-step-grid.md#test-header

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  cellSize, stepAt, stepMsFor, rovingNext, marksAt,
  createStepGrid, PAD_MIN, PAD_GAP, RISE_MS, FALL_MS,
} from './step-grid.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(HERE, 'step-grid.mjs'), 'utf8');
const css = fs.readFileSync(path.join(HERE, 'shell.css'), 'utf8');

/**
 * The module with its comments taken out, so a search for a string does not find its explanation.
 * why: lessons/kit-step-grid.md#test-code
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

// The floor: 64 steps at a phone's 360 px is 3 px a pad before it, which looks like a failed build.
// why: lessons/kit-step-grid.md#test-cell-floor
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

// Clamped at both ends, or the head stops drawing past the last step.
// why: lessons/kit-step-grid.md#test-step-clamp
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

// It clamps and never wraps: wrapping reads as focus jumping.
// why: lessons/kit-step-grid.md#test-roving-clamp
ok('an arrow at an edge stays where it is rather than wrapping to the next row',
  rovingNext('ArrowRight', 0, 15, 8, 16).join() === '0,15'
  && rovingNext('ArrowLeft', 0, 0, 8, 16).join() === '0,0'
  && rovingNext('ArrowUp', 0, 5, 8, 16).join() === '0,5'
  && rovingNext('ArrowDown', 7, 5, 8, 16).join() === '7,5');

// Every other key comes back null and bubbles to the transport bar, or the space that plays is swallowed.
// why: lessons/kit-step-grid.md#test-roving-null
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
  // The marks hold at any step count: a beat every 4, a bar every 16.
  // why: lessons/kit-step-grid.md#test-marks
  ok('every fourth step is a beat and every sixteenth is a bar',
    beats === 16 && bars === 4 && over[0].beat && over[0].bar && !over[1].beat,
    `over 64 steps: ${beats} beats and ${bars} bars`);
  const short = Array.from({ length: 16 }, (_, s) => marksAt(s));
  ok('and over sixteen steps that is four beats and one bar, which is still true',
    short.filter((m) => m.beat).length === 4 && short.filter((m) => m.bar).length === 1);
}

// The refusal: a grid that plays claims a tempo, and nothing in a Circuit session names one. A rate arrives
// with an owner or not at all, checked before any DOM is touched.
// why: lessons/kit-step-grid.md#test-refusal
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

// The five settled edges, read off the stylesheet: each is an absence a rewrite would put back.
// why: lessons/kit-step-grid.md#test-settled-edges
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

  // the rule sits outside the step grid block, after `.panel-fixed`, so it wins on order
  ok('the label column has no divider down it',
    /\.pos-pg-labs \{[^}]*border-(right|inline): 0/.test(css.replace(/\/\*[\s\S]*?\*\//g, '')),
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

  // The step axis is numbered in beats: a number under each of 64 steps in a 26 px cell does not fit.
  // why: lessons/kit-step-grid.md#test-ruler-beats
  ok('the ruler numbers the beats, and only when a caller asks for numbers at all',
    /if \(!ticks\) return '';/.test(code)
    && /m\.beat && beat > 0 \? String\(Math\.floor\(s \/ beat\) \+ 1\)/.test(code),
    'ticks off is the empty string, ticks on is one number a beat');

  // Rise and fall are declared once here; the fall reaches shell.css as --pg-fall, not a second copy.
  // why: lessons/kit-step-grid.md#test-lamp
  ok('the fall is longer than the rise, and both numbers live only here',
    FALL_MS > RISE_MS && /setProperty\('--pg-fall'/.test(code)
    && /transition:box-shadow \$\{RISE_MS\}ms/.test(code)
    && /var\(--pg-fall, 320ms\)/.test(css) && !/box-shadow 320ms/.test(css),
    `${RISE_MS} ms up and ${FALL_MS} ms down, the fall published as --pg-fall`);

  // A step is 125 ms at 120 bpm with four to a beat, so 320 ms was 2.6 steps of tail.
  // why: lessons/kit-step-grid.md#test-fall-fraction
  ok('the fall is under a step and a half at the tempo the kit runs at',
    FALL_MS / stepMsFor(120, 4) < 1.6 && 320 / stepMsFor(120, 4) > 2.5,
    `${FALL_MS} ms is ${(FALL_MS / stepMsFor(120, 4)).toFixed(2)} steps of a `
    + `${stepMsFor(120, 4)} ms step, against ${(320 / stepMsFor(120, 4)).toFixed(2)} before`);

  const dash = String.fromCharCode(0x2014), middot = String.fromCharCode(0x00b7);
  ok('no em dash and no middot anywhere in the module, comments included',
    !src.includes(dash) && !src.includes(middot),
    `${src.split('\n').length} lines`);
}

console.log(`\n${pass} ok, ${fail} failed`);
process.exit(fail ? 1 : 0);
