// demo/shell/check-test.mjs
// What the checkbox IS, read off its own source, with no browser.
//
//   node demo/shell/check-test.mjs
//
// 🔴 THIS COMPONENT HAS ALMOST NO ARITHMETIC, AND THAT IS WHY THE CHECKS ARE
// THE SHAPE THEY ARE. A slider has positions and a filter has a curve; a
// checkbox has a semantic. Everything worth grading about it is a statement
// about what element it uses and what that element is announced as, which is a
// claim about the SOURCE, and the rest is a claim about pixels and belongs on
// `/kit/` where there is a document.
//
// ⚠️ WHAT IS NOT GRADED HERE. Nothing below opens a document and neither
// constructor is called. `/kit/` asserts all of this against the real thing:
//   - that the input is still in the tab order after being clipped
//   - that the space key toggles it, which is the browser's job and is the
//     whole reason it is a real input
//   - that the drawn box follows `:checked` and `:indeterminate`
//   - that a row wraps and a column stacks
//   - that the group is announced by its own name
//
// 🔴 AND ONE OF THESE IS A CHECK ABOUT ANOTHER FILE, DELIBERATELY. The
// stylesheet and the module are two halves of one control, and this project has
// shipped a component emitting class names NO stylesheet matched, twice, which
// is a bug that only ever happens to a control nobody else uses. Reading
// `shell.css` for the classes this file emits is one command and would have
// caught both.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(HERE, 'check.mjs'), 'utf8');
const css = fs.readFileSync(path.join(HERE, 'shell.css'), 'utf8');

/**
 * The module with its prose taken out.
 *
 * ⚠️ IT EXISTS BECAUSE THE FIRST VERSION OF THE CHECK BELOW WENT RED ON THIS
 * FILE'S OWN HEADER. `check.mjs` explains at length why it is not a button
 * wearing `aria-pressed`, so a search for that string over the whole file finds
 * the explanation and calls it the defect. A guard on a substring is this
 * project's named hazard and this is it in its cheapest form.
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

// ── it is a checkbox, which is the whole decision ──────────────────────────
ok('it builds a real input of type checkbox',
  /type: 'checkbox'/.test(src) && /el\('input'/.test(src));

/* 🔴 THE OTHER ANSWER IS ALREADY IN THIS KIT AND IS CORRECT WHERE IT IS.
   `choice.mjs` is buttons wearing `aria-pressed`, because a segmented row is
   one object with the armed segment lit. A checkbox announced as `button,
   pressed` says something HAPPENED where what is true is that something IS, so
   the two components wear two shapes on purpose and neither may drift into the
   other. */
ok('NEGATIVE CONTROL: nothing in here is a button wearing aria-pressed',
  !code.includes('aria-pressed') && !/el\('button'/.test(code),
  'read off the code with the prose taken out, because the header explains the choice');

ok('the whole thing is a label, so the word is part of the target',
  /el\('label', 'pos-check'/.test(src));

/* 🔴 CLIPPED, NEVER `display: none`. A `display: none` input is not focusable,
   so the keyboard path would be gone and nothing on the page would say so. The
   claim is about the stylesheet rather than the module, which is why it is read
   from there. */
{
  const rule = css.slice(css.indexOf('.pos-check-i {'));
  const decl = rule.slice(0, rule.indexOf('}'));
  ok('the input is clipped to a pixel rather than removed from the page',
    /clip-path/.test(decl) && /width: 1px/.test(decl) && !/display: *none/.test(decl),
    decl.replace(/\s+/g, ' ').trim());
}

ok('the third state is a real property rather than a class',
  src.includes('input.indeterminate') && !src.includes("'mixed'"));

/* A press answers the question, so the half lit box is over. A control that
   stayed half lit after somebody said yes is arguing with the person using
   it. */
ok('a press clears the third state',
  /input\.indeterminate = false;\s*\n\s*onChange/.test(src));

// ── the group ──────────────────────────────────────────────────────────────
ok('a set of boxes is a group with its own name attached to it',
  src.includes("role: 'group'") && src.includes("'aria-labelledby'"));

ok('NEGATIVE CONTROL: it is not a fieldset, and the file says why',
  !src.includes('fieldset') || src.includes('NOT A `<fieldset>`'));

ok('a group reports its values in the order the options were declared',
  /options\.filter\(\(\[, v\]\) => on\.has\(v\)\)/.test(src));

ok('a tooltip is keyed on the option\'s value, never on its position',
  /title\(optValue, optName, i\)/.test(src));

// ── the two orientations ───────────────────────────────────────────────────
ok('a group goes across or down, and the class says which',
  src.includes("orient === 'column'") && src.includes('pos-checks-col'));

// ── every class this module emits is styled ────────────────────────────────
//
// 🔴 THE CHECK THAT WOULD HAVE CAUGHT `choice.mjs` AND THE SLIDER GROUP, BOTH
// OF WHICH SHIPPED EMITTING CLASS NAMES NO STYLESHEET MATCHED. One of them drew
// three loose default buttons under a heading; the other fell into block layout
// with four lanes starting at four different x positions. Both read as
// unfinished components and both were one grep from being caught.
{
  const emitted = [...code.matchAll(/['`](pos-check[a-z-]*)/g)].map((m) => m[1]);
  const uniq = [...new Set(emitted)];
  const unstyled = uniq.filter((c) => !css.includes(`.${c}`));
  ok('every class this module emits has a rule in shell.css',
    uniq.length >= 6 && unstyled.length === 0,
    unstyled.length ? `NOT STYLED: ${unstyled.join(', ')}` : uniq.join(', '));
}

// ── the vertical radio, which is the other half of the same request ────────
//
// ⚠️ IT LIVES IN `choice.mjs` AND ITS RULES LIVE IN `shell.css`, so this is the
// same stylesheet check one component over. The module half is graded by the
// page, which is where a press can happen.
{
  const has = css.includes('.pos-choice[data-orient="column"]');
  const turns = /\.pos-choice\[data-orient="column"\] \.pos-seg \{[^}]*flex-direction: column/.test(css);
  const joins = css.includes('.pos-choice[data-orient="column"] .pos-seg > * + * { margin-top: -1px; }');
  /* 🔴 THE JOIN AND THE CORNERS BOTH HAVE TO TURN. `.pos-seg` overlaps its
     children on the LEFT and rounds the first child's left corners; stacked,
     that leaves a doubled border on every join and two stray curves in the
     middle of the column. Turning one without the other is the half fix that
     looks finished. */
  ok('a standing choice turns the join and the corners, not just the direction',
    has && turns && joins);
}

// ── house style ────────────────────────────────────────────────────────────
{
  const dash = String.fromCharCode(0x2014), middot = String.fromCharCode(0x00b7);
  ok('no em dash and no middot anywhere in the module, comments included',
    !src.includes(dash) && !src.includes(middot),
    `${src.split('\n').length} lines`);
}

console.log(`\n${pass} ok, ${fail} failed`);
process.exit(fail ? 1 : 0);
