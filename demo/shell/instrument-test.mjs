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
import { plateSpec, MAKER, HEADER_SAYS, HEADER_STATES } from './instrument.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, 'instrument.mjs'), 'utf8');
/**
 * The same file with every comment taken out.
 *
 * 🔴 **TWO ASSERTS IN THIS FILE WERE GREEN WHILE MATCHING COMMENT TEXT, AND THE
 * MEASUREMENT IS 2026-09-22.** `it calls the two components that already exist`
 * tested `/createNameplate\(/` against the raw source, and `createNameplate` was
 * IMPORTED AND NEVER CALLED: the only occurrence was the worked example in this
 * module's own header. `the plate is prepended to the case` tested
 * `/panel\.el\.prepend\(plate\.el\)/`, and that line had not existed in the code
 * since `createPanelLayout` took a `plate` option; the only occurrence was
 * inside the comment explaining why it had been removed. Both matched, both
 * passed, and one of them was grading a prohibition against the sentence
 * describing it.
 * ⚠️ THE NEGATIVE CONTROL BELOW HAD ALREADY STRIPPED COMMENTS FOR EXACTLY THIS
 * REASON, which is what makes the other two an oversight rather than an
 * argument: the file knew, in one of its four checks.
 * ✅ **AN ABSENCE IS ASSERTED OVER `code` AND A PRESENCE OVER `code` TOO**, and
 * only a claim about the PROSE may read `src`.
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
  is('it calls the two components that already exist, in the code and not in a comment',
    /createPanelLayout\(/.test(code) && /createNameplate\(/.test(code)
    && /from '\.\/panel-layout\.mjs'/.test(code),
    'both imported from panel-layout.mjs and both called');

  is('NEGATIVE CONTROL: it builds no case and no plate of its own',
    !/panel-case|panel-plate|panel-strip/.test(code),
    'no panel class name appears outside a comment');

  /* The plate belongs to the CASE, above the fixed column and the strip both,
     or it scrolls away from the instrument it names. `/tom/` found that with a
     plate, and a header is the same claim one element out.
     🔴 THIS ASSERT USED TO READ `panel.el.prepend(plate.el)` AGAINST THE RAW
     SOURCE AND THAT LINE HAD NOT EXISTED FOR A DAY. See the note on `code`. */
  is('the header goes in by prepend, so nothing above the instrument can scroll away',
    /panel\.el\.prepend\(head\.head\)/.test(code)
    && /plate: head \? null : spec/.test(code),
    'prepend on the case, and the panel keeps placing the plate when there is no header');

  is('an instrument with no name is refused at build time',
    /if \(!name\)/.test(code) && /throw new Error\('an instrument needs a name/.test(code),
    'the plate is the only thing saying which one it is');
}

// ── the header ─────────────────────────────────────────────────────────────

{
  /**
   * 🔴 THE DECISION THE ASK FORCED, GRADED AS SOURCE BECAUSE IT IS A BRANCH AND
   * NOT A VALUE. A status control that only reports must not be a button, and
   * one that acts must be. `positron-ui` calls a control whose only honest
   * behaviour is to do nothing *"the shape of control this project calls a
   * lie"*, and the ask wanted one element doing both jobs.
   */
  is('the status control is a button only when a caller says what a press does',
    /press\s*\?\s*\n?\s*createPresenceButton\(/.test(code)
    && /:\s*createPresence\(\{[^}]*mode: 'badge'/.test(code),
    'press gives createPresenceButton, no press gives a createPresence badge');

  /* 🔴 GREEN AND GREY ARE `presence.mjs`'S, DECIDED ONCE. A second green dot in
     this file would be the hand-rolled control defect inside the kit itself. */
  is('the two states and their words are declared here and drawn by the kit’s badge',
    HEADER_STATES.length === 2 && HEADER_STATES.join() === 'online,offline'
    && HEADER_SAYS.online === 'enabled' && HEADER_SAYS.offline === 'disabled'
    && /from '\.\/presence\.mjs'/.test(code),
    `${HEADER_STATES.join(' and ')} reading ${HEADER_SAYS.online} and ${HEADER_SAYS.offline}`);

  /**
   * 🔴 THE PLATE IN A HEADER IS `end` AND NEVER `ends`, AND IT IS THE SAME
   * REASON `plateSpec` EXISTS AT ALL. `ends` is `space-between`, which needs a
   * box that spans something to put a gap in; a header's right cell is as wide
   * as its content, so `ends` would put the maker hard against the model.
   */
  is('a header’s plate takes the end placement whether it has one line or two',
    plateSpec(MAKER, 'PLAI', 'end').place === 'end'
    && plateSpec('', 'MODEL 12', 'end').place === 'end'
    && /plateSpec\(maker, name, 'end'\)/.test(code),
    'both the two line and the one line case are end in a header');

  /* ⚠️ THE CENTRE IS A GRID TRACK, NOT A FLEX CHILD, and the whole ask turns on
     it. This is the only half of that claim readable without a browser: the
     geometry is asserted on `/kit/` against the case's own box. */
  is('the header’s centre is a grid cell rather than anything balanced between neighbours',
    /panel-head-mid/.test(code) && !/space-between|justify-content/.test(code),
    'the cell is named here and the three tracks are declared in shell.css');

  /* 🔴 THE DEFAULT IS OFF, WHICH IS A DECISION ABOUT OTHER PEOPLE'S PAGES.
     `/muta/` and `/kit/` both assert the plate in the case's top inset, one of
     them by reading the case's first child. */
  is('NEGATIVE CONTROL: a case with no header is untouched, and nothing builds one by default',
    /header = false/.test(code) && /const head = header \? buildHeader/.test(code),
    'header defaults to false and buildHeader runs only when one is asked for');
}

console.log(`\n${ok} ok, ${bad} failed`);
if (bad) process.exit(1);
