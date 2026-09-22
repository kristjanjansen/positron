// demo/shell/switch-test.mjs
// What the switch IS, read off its own source and its own rules, no browser.
//
//   node demo/shell/switch-test.mjs
//
// 🔴 THIS COMPONENT HAS NO ARITHMETIC AT ALL, AND THAT IS WHY THE CHECKS ARE
// THE SHAPE THEY ARE. It is the same argument `check-test.mjs` makes: a slider
// has positions and a filter has a curve, and a switch has a semantic and a
// picture. Everything worth grading here is a claim about what element is used,
// what that element is announced as, and which colour the stylesheet paints it,
// and all three are claims about SOURCE. The rest is pixels and belongs on
// `/kit/`, where there is a document to measure.
//
// 🔴 THE COMMENTS ARE STRIPPED BEFORE ANY ABSENCE CHECK, AND THIS FILE SAYS SO
// BECAUSE THREE TEST FILES IN THIS REPOSITORY WERE FOUND ASSERTING AGAINST
// THEIR OWN PROSE. `switch.mjs` explains at length why it is not a button
// wearing `aria-pressed` and why it has no `indeterminate`, so a search for
// either string over the whole file finds the EXPLANATION and calls it the
// defect. A guard on a substring is this project's named hazard, and a header
// that argues against a thing is the cheapest way to trip it.
//
// ⚠️ WHAT IS NOT GRADED HERE. Nothing below opens a document and the
// constructor is never called. `/kit/` asserts all of this against the real
// thing:
//   - that the input is still in the tab order after being clipped
//   - that a press flips it and tells the page, which is the whole of *it acts*
//   - that the knob really moves from one end of the track to the other
//   - that the lit primary is the token this stylesheet calls `--hi`
//   - that a disabled one cannot be pressed
//
// ⚠️ AND ONE THING IS GRADED NOWHERE, WHICH IS SAID HERE RATHER THAN LEFT TO BE
// ASSUMED: what a screen reader actually announces for `role="switch"`. No
// reader was run on this machine. What is checked is that the role is on the
// element carrying the state, which is the half a machine can answer.
//
// ✅ PROVED BY BREAKING IT, 2026-09-22, ON COPIES OF THESE FILES IN A SCRATCH
// DIRECTORY. Four sabotages at once took exactly four of these red and left the
// other eleven alone: the switch role taken off the input, the secondary weight
// given `--hi` in the stylesheet, the knob's travel typed as `16px` instead of
// computed from the widths, and the `checked` option renamed to `on`. A check
// that has never been broken on purpose is a decoration.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(HERE, 'switch.mjs'), 'utf8');
const chk = fs.readFileSync(path.join(HERE, 'check.mjs'), 'utf8');
const css = fs.readFileSync(path.join(HERE, 'shell.css'), 'utf8');

/** The module with its prose taken out. See the header. */
const strip = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
const code = strip(src);

/** One rule's declarations, by its exact selector. */
function rule(selector) {
  const at = css.indexOf(`${selector} {`);
  if (at < 0) return null;
  return css.slice(at, css.indexOf('}', at)).replace(/\s+/g, ' ').trim();
}

let pass = 0, fail = 0;
function ok(what, cond, detail = '') {
  if (cond) { pass++; console.log(`  ok   ${what}${detail ? `  ${detail}` : ''}`); return; }
  fail++;
  console.log(`  FAIL ${what}${detail ? `  ${detail}` : ''}`);
}

// ── it is a checkbox wearing the switch role, which is the whole decision ──
ok('it builds a real input of type checkbox and puts the switch role on it',
  /type: 'checkbox', role: 'switch'/.test(code) && /el\('input'/.test(code));

/* 🔴 THE OTHER TWO ANSWERS ARE ALREADY IN THIS KIT AND BOTH ARE CORRECT WHERE
   THEY ARE. `choice.mjs` is buttons wearing `aria-pressed`, because a segmented
   row is one object with the armed segment lit. `button-group.mjs` refuses that
   attribute entirely so it can never be announced as a choice. A switch is
   neither, and the way it stays neither is by being an input. */
ok('NEGATIVE CONTROL: nothing in here is a button wearing aria-pressed',
  !code.includes('aria-pressed') && !/el\('button'/.test(code),
  'read off the code with the prose taken out, because the header explains the choice');

ok('the whole thing is a label, so the word is part of the target',
  /el\('label', 'pos-switch'/.test(code));

/* 🔴 CLIPPED, NEVER `display: none`. A `display: none` input is not focusable,
   so the keyboard path would be gone and nothing on the page would say so. The
   claim is about the stylesheet rather than the module, which is why it is read
   from there. */
{
  const decl = rule('.pos-switch-i');
  ok('the input is clipped to a pixel rather than removed from the page',
    !!decl && /clip-path/.test(decl) && /width: 1px/.test(decl) && !/display: *none/.test(decl),
    decl || 'NO RULE');
}

/* 🔴 NO THIRD STATE, IN EITHER FILE. `indeterminate` is a real property of the
   input underneath, so the only thing stopping a half lit switch appearing is
   that this component never sets it and no rule draws it. Both halves are
   checked, because either one alone would pass while the other shipped it. */
ok('NEGATIVE CONTROL: there is no third state in the module and none in the rules',
  !code.includes('indeterminate') && !css.includes('.pos-switch-i:indeterminate'),
  'a switch half on is a picture of a machine that is neither running nor stopped');

// ── the knob is an element, because its POSITION is the measurement ────────
//
// 🔴 A PSEUDO ELEMENT HAS NO RECT. The checkbox draws its tick with `::after`
// and is right to: a tick is a picture. Where the knob IS is the difference
// between a switch that moved and a switch that changed colour, and only an
// element can be asked.
ok('the knob is a real element rather than a pseudo element',
  code.includes("el('span', 'pos-switch-k')")
  && !!rule('.pos-switch-k') && !css.includes('.pos-switch-b::after'));

// ── the two weights, and the one yellow ───────────────────────────────────
ok('the weights are one exported list rather than two strings typed twice',
  /export const WEIGHTS = \['primary', 'secondary'\]/.test(code)
  && (code.match(/WEIGHTS\.includes/g) || []).length === 2,
  'checked at build and again on the setter, so neither way in draws nothing');

{
  const lit = rule('.pos-switch-i:checked + .pos-switch-b');
  const second = rule('.pos-switch[data-weight="secondary"] .pos-switch-i:checked + .pos-switch-b');
  /* 🔴 ONE COLOUR, ONE MEANING. `--hi` is *the thing this control is about*, so
     the primary lights in it and the secondary must not. The second half is the
     negative control and it is the one worth having: a check that only asked
     *is the primary yellow* would pass a stylesheet in which BOTH weights are. */
  ok('the primary lights in --hi and NEGATIVE CONTROL: the secondary does not',
    !!lit && !!second && lit.includes('var(--hi)')
    && !second.includes('var(--hi)') && second.includes('var(--dim)'),
    `primary: ${lit}    secondary: ${second}`);
}

/* ⚠️ DELETED, NEVER SET EMPTY. `video-panel.mjs` wrote `= ''` against a
   presence selector and a panel that had been full once stayed full for the
   rest of the page's life. The selector here is an exact value match so an
   empty string would be harmless, and the habit is what is being protected. */
ok('the weight attribute is deleted rather than set to an empty string',
  /delete wrap\.dataset\.weight/.test(code) && !/dataset\.weight = ''/.test(code));

// ── the vocabulary is the checkbox's, which is the drift check ────────────
//
// 🔴 A SECOND NAME FOR ONE IDEA IS THE DRIFT `/kit/` EXISTS TO CATCH, and two
// controls built a day apart are exactly where it starts. This reads both
// constructors' option lists and compares them, rather than asserting that a
// word appears here.
{
  const optsOf = (s, fn) => {
    const at = s.indexOf(`export function ${fn}({`);
    const head = s.slice(at + s.slice(at).indexOf('{', `export function ${fn}`.length),
      s.indexOf('} = {}', at));
    return head.replace(/^{/, '').split(',')
      .map((p) => p.split('=')[0].trim()).filter(Boolean);
  };
  const mine = optsOf(src, 'createSwitch');
  const theirs = optsOf(chk, 'createCheck');
  const novel = mine.filter((k) => !theirs.includes(k));
  ok('every option name is the checkbox\'s, except the one idea that is new',
    mine.includes('checked') && mine.includes('disabled') && mine.includes('onChange')
    && mine.includes('label') && mine.includes('title')
    && novel.length === 1 && novel[0] === 'weight',
    `${mine.join(' ')} against ${theirs.join(' ')}, new here: ${novel.join(' ') || 'nothing'}`);

  /* The reporting half of the same claim. `set(on, quiet)` skipping the
     callback when nothing changed is a behaviour a page relies on, and it is
     spelled the same way in both files. */
  ok('it reports its state the way the checkbox does, quiet flag included',
    /get: \(\) => input\.checked/.test(code)
    && /set\(on, quiet = false\)/.test(code)
    && /if \(!quiet && input\.checked !== was\)/.test(code)
    && /disabled: \(v\) =>/.test(code));
}

// ── every class this module emits is styled ───────────────────────────────
//
// 🔴 THE CHECK THAT WOULD HAVE CAUGHT `choice.mjs` AND THE SLIDER GROUP, BOTH
// OF WHICH SHIPPED EMITTING CLASS NAMES NO STYLESHEET MATCHED. Both read as
// unfinished components and both were one grep from being caught.
{
  const emitted = [...code.matchAll(/['`](pos-switch[a-z-]*)/g)].map((m) => m[1]);
  const uniq = [...new Set(emitted)];
  const unstyled = uniq.filter((c) => !css.includes(`.${c}`));
  ok('every class this module emits has a rule in shell.css',
    uniq.length >= 5 && unstyled.length === 0,
    unstyled.length ? `NOT STYLED: ${unstyled.join(', ')}` : uniq.join(', '));
}

/* ⚠️ THE TRAVEL IS COMPUTED FROM THE WIDTHS IT COMES FROM. A `16px` typed into
   the moved rule while the track and the knob are declared above it is a
   measurement in two places waiting to disagree, which `--sld-col` and
   `--ctl-gap` were both repaired for. */
{
  const moved = rule('.pos-switch-i:checked + .pos-switch-b .pos-switch-k');
  ok('NEGATIVE CONTROL: the knob\'s travel is arithmetic, not a second number',
    !!moved && /translateX\(calc\(/.test(moved) && !/translateX\(\d+px\)/.test(moved),
    moved || 'NO RULE');
}

/* Somebody who has asked for less movement gets the position and none of the
   travel. */
ok('the slide stands down for anybody who asked for less movement',
  /@media \(prefers-reduced-motion: reduce\) \{\s*\.pos-switch-k \{ transition: none; \}/.test(css));

// ── house style ───────────────────────────────────────────────────────────
{
  const dash = String.fromCharCode(0x2014), middot = String.fromCharCode(0x00b7);
  ok('no em dash and no middot anywhere in the module, comments included',
    !src.includes(dash) && !src.includes(middot),
    `${src.split('\n').length} lines`);
}

console.log(`\n${pass} ok, ${fail} failed`);
process.exit(fail ? 1 : 0);
