// demo/shell/control-grid-test.mjs — the lattice arithmetic, without a browser.
//
// 🔴 WHAT THIS FILE CANNOT SEE, SAID AT THE TOP. `createControlGrid` measures a
// laid out cell, so the grid itself is graded on `/kit/`, where the check reads
// the DIAL CENTRES and compares the distance across against the distance down.
// That is the claim the component exists to make and it needs a layout.
// What is graded here is `pitchFor`, which is where the arithmetic lives, and
// the two refusals.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pitchFor } from './control-grid.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, 'control-grid.mjs'), 'utf8');

let ok = 0, bad = 0;
const is = (what, cond, detail) => {
  if (cond) { ok++; console.log(`  ok   ${what}${detail ? ` · ${detail}` : ''}`); }
  else { bad++; console.log(`  FAIL ${what} · ${detail}`); }
};

// ── the pitch ──────────────────────────────────────────────────────────────

{
  /**
   * 🔴 THE LARGER OF THE TWO, NEVER THE AVERAGE, AND THIS IS THE ONE DECISION
   * IN THE FILE. A knob is about 46 px of dial and about 100 px of dial plus
   * value plus label plus sub, so a mean of 73 would clip the label on every
   * cell while leaving the dial swimming. The lattice is as big as its biggest
   * cell needs and the square comes from the pitch being ONE number.
   */
  is('the pitch is the larger side, so nothing is clipped to make the square',
    pitchFor(46, 100) === 100 && pitchFor(120, 40) === 120,
    'a tall cell gives 100 and a wide one gives 120');

  is('NEGATIVE CONTROL: it is not the average, which would clip whichever is bigger',
    pitchFor(46, 100) !== (46 + 100) / 2,
    `100 rather than ${(46 + 100) / 2}`);

  is('a gap is added once, because it sits between two centres and not twice',
    pitchFor(46, 100, 10) === 110 && pitchFor(46, 100, 0) === 100,
    '100 plus a 10 px gap is 110');

  is('a square cell is already square and the pitch does not move it',
    pitchFor(64, 64) === 64,
    'equal sides give the same number back');

  is('nothing measurable yet answers 0 rather than NaN',
    pitchFor(undefined, undefined) === 0 && pitchFor(null, 0, null) === 0,
    'an unlaid out grid has no pitch, and NaN would poison a style');
}

// ── the refusals, which are both about a shape nobody decided ──────────────

{
  is('a grid with no column count is refused',
    /a control grid needs a column count/.test(src)
    && /Number\.isInteger\(cols\)/.test(src),
    'a grid that chose its own columns would change shape as the list grew');

  is('a grid with nothing in it is refused',
    /a control grid with nothing in it/.test(src),
    'a container painting its own edges, which this project has shipped twice');

  /**
   * 🔴 THE COLUMNS ARE A FIXED PITCH AND NEVER `1fr`, AND IT IS WORTH AN
   * ASSERT BECAUSE `1fr` LOOKS RIGHT. A fractional track stretches with its
   * container, so the lattice would be square at exactly one width and a
   * rectangle at every other, which is the defect this component exists to fix
   * arriving through the stylesheet instead.
   */
  is('the tracks are a fixed measured pitch, not a fraction of the container',
    /repeat\(\$\{cols\}, \$\{Math\.round\(pitch\)\}px\)/.test(src)
    && !/1fr/.test(src.replace(/\/\*[\s\S]*?\*\//g, '')),
    'no 1fr outside a comment');

  is('the pitch is written as a custom property, never as the property itself',
    /setProperty\('--cg-pitch'/.test(src),
    'so a page can still take it back');
}

console.log(`\n${ok} ok, ${bad} failed`);
if (bad) process.exit(1);
