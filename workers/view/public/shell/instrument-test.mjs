// demo/shell/instrument-test.mjs — the instrument case, without a browser.
//
// 🔴 WHAT THIS FILE CAN AND CANNOT SEE, SAID AT THE TOP SO NOBODY READS IT AS
// COVERAGE IT DOES NOT HAVE. `createInstrument` needs a `document`, so the
// assembly itself is graded on `/kit/`. What is graded here is the part that
// decides WHAT GOES ON THE PLATE, which is pure, plus the one property the
// whole module exists for: that it composes the two components that already
// exist rather than reimplementing either.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { plateSpec, MAKER } from './instrument.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, 'instrument.mjs'), 'utf8');

let ok = 0, bad = 0;
const is = (what, cond, detail) => {
  if (cond) { ok++; console.log(`  ok   ${what}${detail ? ` · ${detail}` : ''}`); }
  else { bad++; console.log(`  FAIL ${what} · ${detail}`); }
};

// ── the plate's lines ──────────────────────────────────────────────────────

{
  const two = plateSpec(MAKER, 'PLAI');
  is('a maker and a name are two lines at the ends, which is the shape on the case',
    two.lines.length === 2 && two.lines[0] === MAKER && two.lines[1] === 'PLAI'
    && two.place === 'ends',
    `${JSON.stringify(two.lines)} at ${two.place}`);

  /**
   * 🔴 ONE LINE TAKES `end` AND NEVER `ends`, AND THIS IS THE WHOLE REASON THE
   * FUNCTION EXISTS. `ends` is `space-between`, which parks a lone child on the
   * LEFT. `panel-layout.mjs` records that `/twelve/` was reported for exactly
   * this and that `end` was added for it. A caller choosing the placement would
   * have to know that; this decides it.
   */
  const one = plateSpec('', 'MODEL 12');
  is('a nameplate with no maker is ONE line pushed right, never space-between',
    one.lines.length === 1 && one.lines[0] === 'MODEL 12' && one.place === 'end',
    `${JSON.stringify(one.lines)} at ${one.place}`);

  is('NEGATIVE CONTROL: a caller-chosen placement is honoured when there are two lines',
    plateSpec(MAKER, 'TOM', 'mid').place === 'mid'
    && plateSpec('', 'TOM', 'mid').place === 'end',
    'two lines keep mid, one line still goes to end');

  is('the maker is declared once here, so no page types it',
    MAKER === 'POSITRON' && /export const MAKER/.test(src),
    `MAKER is ${JSON.stringify(MAKER)}`);
}

// ── it composes rather than reimplements ───────────────────────────────────

{
  /**
   * 🔴 THE ONE PROPERTY THAT MAKES THIS MODULE WORTH HAVING, AND IT IS
   * ASSERTED AS AN ABSENCE. A second panel implementation would look correct,
   * pass every check on this page, and drift from `panel-layout.mjs` the first
   * time a panel behaviour changed. `positron-ui` records three pages that
   * ended up with three different radio rows exactly that way.
   */
  is('it calls the two components that already exist',
    /createPanelLayout\(/.test(src) && /createNameplate\(/.test(src)
    && /from '\.\/panel-layout\.mjs'/.test(src),
    'both imported from panel-layout.mjs and both called');

  is('NEGATIVE CONTROL: it builds no case and no plate of its own',
    !/panel-case|panel-plate|panel-strip/.test(src.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '')),
    'no panel class name appears outside a comment');

  /* The plate belongs to the CASE, above the fixed column and the strip both,
     or it scrolls away from the instrument it names. `/tom/` found that. */
  is('the plate is prepended to the case, not appended into the scroller',
    /panel\.el\.prepend\(plate\.el\)/.test(src),
    'prepend on the case');

  is('an instrument with no name is refused at build time',
    /if \(!name\)/.test(src) && /throw new Error\('an instrument needs a name/.test(src),
    'the plate is the only thing saying which one it is');
}

console.log(`\n${ok} ok, ${bad} failed`);
if (bad) process.exit(1);
