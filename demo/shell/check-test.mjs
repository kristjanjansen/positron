// demo/shell/check-test.mjs: what the checkbox is, read off its source and shell.css, no browser.
// Focus, space key, the drawn box and layout are asserted on /kit/.
// why: lessons/kit-check.md#test-header

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(HERE, 'check.mjs'), 'utf8');
const css = fs.readFileSync(path.join(HERE, 'shell.css'), 'utf8');

/**
 * The module with its prose taken out, so a substring check cannot match the header's explanation.
 * why: lessons/kit-check.md#code
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

// `choice.mjs` is rightly buttons with `aria-pressed`; a checkbox must not drift into that shape.
// why: lessons/kit-check.md#test-aria-pressed
ok('NEGATIVE CONTROL: nothing in here is a button wearing aria-pressed',
  !code.includes('aria-pressed') && !/el\('button'/.test(code),
  'read off the code with the prose taken out, because the header explains the choice');

ok('the whole thing is a label, so the word is part of the target',
  /el\('label', 'pos-check'/.test(src));

// Clipped, never `display: none`, which is not focusable. Read from the stylesheet.
// why: lessons/kit-check.md#test-clipped
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

// ── every class this module emits is styled ──
// Two components shipped class names no stylesheet matched; one grep catches it.
// why: lessons/kit-check.md#test-classes
{
  const emitted = [...code.matchAll(/['`](pos-check[a-z-]*)/g)].map((m) => m[1]);
  const uniq = [...new Set(emitted)];
  const unstyled = uniq.filter((c) => !css.includes(`.${c}`));
  ok('every class this module emits has a rule in shell.css',
    uniq.length >= 6 && unstyled.length === 0,
    unstyled.length ? `NOT STYLED: ${unstyled.join(', ')}` : uniq.join(', '));
}

// ── the vertical radio ──
// It lives in `choice.mjs` with rules in shell.css: the same stylesheet check one component over.
// why: lessons/kit-check.md#test-vertical
{
  const has = css.includes('.pos-choice[data-orient="column"]');
  const turns = /\.pos-choice\[data-orient="column"\] \.pos-seg \{[^}]*flex-direction: column/.test(css);
  const joins = css.includes('.pos-choice[data-orient="column"] .pos-seg > * + * { margin-top: -1px; }');
  // The join and the corners both have to turn, or the column has doubled borders and stray curves.
  // why: lessons/kit-check.md#test-join
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
