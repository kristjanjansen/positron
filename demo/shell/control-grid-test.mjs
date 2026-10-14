// demo/shell/control-grid-test.mjs: `pitchFor` and the two refusals, without a browser.
// The grid itself needs a layout and is graded on /kit/ by its dial centres.
// why: lessons/kit-control-grid.md#test-header

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
   * The larger of the two, never the mean: a knob is about 46 px wide and 100 px tall,
   * and a mean of 73 would clip every label.
   * why: lessons/kit-control-grid.md#test-larger
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
   * Fixed pitch tracks, never `1fr`, which is square at one container width only.
   * why: lessons/kit-control-grid.md#test-fixed
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
