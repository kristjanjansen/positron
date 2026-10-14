// demo/shell/instrument-test.mjs: the instrument case, without a browser. Grades the pure plate
// decision and that the module composes the existing components; the assembly is graded on /kit/.
// why: lessons/kit-instrument.md#test-header

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { plateSpec, MAKER, HEADER_SAYS, HEADER_STATES } from './instrument.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, 'instrument.mjs'), 'utf8');
/**
 * The same file with every comment taken out. Absences and presences are asserted over `code`;
 * only a claim about the prose may read `src`, since two asserts once passed on comment text.
 * why: lessons/kit-instrument.md#code
 */
const code = src.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '');

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
   * One line takes `end`, never `ends`, which parks a lone child on the left.
   * why: lessons/kit-instrument.md#t-one-line
   */
  const one = plateSpec('', 'MODEL 12');
  is('a nameplate with no maker is ONE line pushed right, never space-between',
    one.lines.length === 1 && one.lines[0] === 'MODEL 12' && one.place === 'end',
    `${JSON.stringify(one.lines)} at ${one.place}`);

  is('NEGATIVE CONTROL: a caller-chosen placement is honoured when there are two lines',
    plateSpec(MAKER, 'TOM', 'mid').place === 'mid'
    && plateSpec('', 'TOM', 'mid').place === 'end',
    'two lines keep mid, one line still goes to end');

  /**
   * NEGATIVE CONTROL against the rule above: `side` survives a single line (`/shape/`).
   * why: lessons/kit-instrument.md#t-side
   */
  const sideOne = plateSpec('', 'shape', 'side');
  is('a one line plate asked for down the side stays down the side',
    sideOne.place === 'side' && sideOne.lines.length === 1 && sideOne.lines[0] === 'shape',
    `${JSON.stringify(sideOne.lines)} at ${sideOne.place}`);
  is('NEGATIVE CONTROL: the exemption is for that placement and nothing else',
    plateSpec('', 'MODEL 12', 'ends').place === 'end'
    && plateSpec('', 'TOM', 'mid').place === 'end'
    && plateSpec(MAKER, 'shape', 'side').place === 'side',
    'ends and mid still fall back to end on one line, side does not');

  is('the maker is declared once here, so no page types it',
    MAKER === 'POSITRON' && /export const MAKER/.test(src),
    `MAKER is ${JSON.stringify(MAKER)}`);
}

// ── it composes rather than reimplements ───────────────────────────────────

{
  /**
   * Asserted as an absence: no second panel implementation, which would drift from panel-layout.mjs.
   * why: lessons/kit-instrument.md#t-composes
   */
  is('it calls the two components that already exist, in the code and not in a comment',
    /createPanelLayout\(/.test(code) && /createNameplate\(/.test(code)
    && /from '\.\/panel-layout\.mjs'/.test(code),
    'both imported from panel-layout.mjs and both called');

  is('NEGATIVE CONTROL: it builds no case and no plate of its own',
    !/panel-case|panel-plate|panel-strip/.test(code),
    'no panel class name appears outside a comment');

  // The header is above the instrument and outside anything that scrolls, and a case with no header
  // still places its own plate.
  // why: lessons/kit-instrument.md#t-header-placement
  // The bar may sit at either end, `head` by default; it is glued, never placed inside the case.
  // why: lessons/kit-instrument.md#t-either-end
  // The match allows a caller's own `parts` between the case and the bar.
  // why: lessons/kit-instrument.md#t-parts
  is('the bar is glued to the case at either end, and never placed inside it',
    /createGlue\(panel\.el,[^)]*head\.head\)/.test(code)
    && /createGlue\(head\.head, panel\.el[^)]*\)/.test(code)
    && /plate: barHasPlate \? null : spec/.test(code),
    'glued above or below, and the panel keeps placing the plate when the bar has none');

  // The default is the top, which keeps the move revertible.
  // why: lessons/kit-instrument.md#t-default-top
  is('NEGATIVE CONTROL: a bar with no placement asked for goes to the top',
    /header\.at === 'foot'/.test(code) && !/at = 'foot'/.test(code),
    'foot is opt in, so head is what a silent caller gets');

  // The seam is glue.mjs's; a `border-bottom` here would bring back the imitation.
  // why: lessons/kit-instrument.md#t-no-edge
  is('NEGATIVE CONTROL: the header draws no edge of its own',
    !/border-bottom/.test(code),
    'the seam between a header and its case is the glue’s');

  is('an instrument with no name is refused at build time',
    /if \(!name\)/.test(code) && /throw new Error\('an instrument needs a name/.test(code),
    'the plate is the only thing saying which one it is');
}

// ── the header ─────────────────────────────────────────────────────────────

{
  /**
   * Graded as source because it is a branch: a status that only reports is not a button, one that acts is.
   * why: lessons/kit-instrument.md#t-status-button
   */
  is('the status control is a button only when a caller says what a press does',
    /press\s*\?\s*\n?\s*createPresenceButton\(/.test(code)
    && /:\s*createPresence\(\{[^}]*mode: 'badge'/.test(code),
    'press gives createPresenceButton, no press gives a createPresence badge');

  // Green and grey are presence.mjs's, decided once.
  // why: lessons/kit-instrument.md#t-colours
  // The two states have two different words, declared here and drawn by the kit's badge.
  // why: lessons/kit-instrument.md#t-words
  is('the two states and their words are declared here and drawn by the kit’s badge',
    HEADER_STATES.length === 2 && HEADER_STATES.join() === 'online,offline'
    // The pair reads the same way round as the state; the two words differ and neither is the other's.
    // why: lessons/kit-instrument.md#t-word-pair
    && HEADER_SAYS.online === 'on' && HEADER_SAYS.offline === 'off'
    && HEADER_SAYS.online !== HEADER_SAYS.offline
    && /from '\.\/presence\.mjs'/.test(code),
    `${HEADER_STATES.join(' and ')} reading ${HEADER_SAYS.online} and ${HEADER_SAYS.offline}`);

  /**
   * A header's plate is `end`, never `ends`: its cell is as wide as its content.
   * why: lessons/kit-instrument.md#t-header-plate
   */
  is('a header’s plate takes the end placement whether it has one line or two',
    plateSpec(MAKER, 'PLAI', 'end').place === 'end'
    && plateSpec('', 'MODEL 12', 'end').place === 'end'
    && /plateSpec\(maker, name, 'end'\)/.test(code),
    'both the two line and the one line case are end in a header');

  // The centre is a grid track, not a flex child; the geometry is asserted on /kit/.
  // why: lessons/kit-instrument.md#t-grid-centre
  is('the header’s centre is a grid cell rather than anything balanced between neighbours',
    /panel-head-mid/.test(code) && !/space-between|justify-content/.test(code),
    'the cell is named here and the three tracks are declared in shell.css');

  // The default is off: /muta/ and /kit/ assert the plate in the case's top inset.
  // why: lessons/kit-instrument.md#t-default-off
  is('NEGATIVE CONTROL: a case with no header is untouched, and nothing builds one by default',
    /header = false/.test(code) && /const head = header \? buildHeader/.test(code),
    'header defaults to false and buildHeader runs only when one is asked for');
}

console.log(`\n${ok} ok, ${bad} failed`);
if (bad) process.exit(1);
