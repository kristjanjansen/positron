// demo/shell/check.mjs
// Many of a set, and the box that says so.
//
// 🔴 THERE WAS NO CHECKBOX IN THIS KIT. Searched 2026-09-22 across
// `demo/shell/` and every page: zero. `choice.mjs` is a segmented row where
// exactly ONE option is armed, which is a radio, and the two questions are
// different questions. *Which one of these* and *which of these* cannot share a
// control, and a page that needs the second has until now hand-rolled it or
// gone without.
//
// 🔴 IT IS A REAL `<input type="checkbox">`, NOT A BUTTON WEARING
// `aria-pressed`, AND THE FOUR REASONS ARE WORTH WRITING DOWN BECAUSE THE OTHER
// ANSWER IS ALREADY IN THIS KIT AND IS CORRECT WHERE IT IS.
//   1. A screen reader announces a checkbox as `checkbox, checked` and a button
//      as `button, pressed`. *Pressed* is the wrong verb for *this one is in
//      the set*: it says something happened, when what is true is that
//      something IS.
//   2. The space key toggles a checkbox with no code at all, and a button has
//      to implement it. A control whose keyboard behaviour is the page's job is
//      a control whose keyboard behaviour will be missing on one page.
//   3. There is a third state. `indeterminate` is a real property of a
//      checkbox and it is what *some of the ones under this heading* looks
//      like; `aria-pressed` can spell it `mixed` and nothing draws it.
//   4. It is a form control, so `:checked`, `:disabled` and `required` are the
//      browser's job rather than a set of classes this file would have to keep
//      in step.
// ⚠️ `choice.mjs` STAYS BUTTONS, and that is not an inconsistency. A segmented
// row is one object with the chosen segment lit, the look is the whole reason
// it is segmented, and `aria-pressed` is the right announcement for an option
// somebody armed. The two components answer two questions and wear two shapes
// on purpose.
//
// 🔴 THE INPUT IS REAL AND THE BOX IS DRAWN BESIDE IT, WHICH IS ONE ELEMENT
// MORE THAN `appearance: none` WOULD COST. `appearance: none` on a checkbox
// leaves a replaced element whose pseudo elements are rendered by some engines
// and not by others, so the tick would be the kind of thing that looks right on
// this machine and wrong on somebody's phone, with nothing on the page saying
// which. A visually hidden input keeps every semantic above and hands the
// drawing to an ordinary `<span>`, where `::after` is not in question.
// ⚠️ HIDDEN, NOT `display: none`. A `display: none` input is not focusable and
// not submitted, so the keyboard path would be gone and nothing would say so.
// It is clipped to a pixel and stays in the tab order, which is the standard
// arrangement and is asserted on `/kit/`.
//
// ⚠️ THE WHOLE THING IS A `<label>`, so the word is part of the target. A 16 px
// box is under the 24 px anybody recommends for a finger, and the label is what
// makes the real target the height of a row rather than the size of the box.
//
// STYLING lives in `shell.css` beside `.pos-choice`, because a checkbox is a
// control and every control in this project is declared there. A component that
// only looks right next to one page's stylesheet is the `choice.mjs` bug, which
// shipped emitting two class names no stylesheet matched.

import { el } from './shell.mjs';

/**
 * One box and its word.
 *
 * @param {object} o
 * @param {string} o.label      the word beside the box
 * @param {boolean} [o.checked]
 * @param {boolean} [o.mixed]   the third state, for a heading over a set where
 *   some but not all are on. ⚠️ IT IS A PICTURE, NOT A VALUE: `get()` still
 *   answers true or false, because `indeterminate` is what the box LOOKS like
 *   and the checkbox underneath is still one of the two. Toggling clears it.
 * @param {boolean} [o.disabled]
 * @param {string} [o.title]    the browser's own tooltip
 * @param {(on:boolean)=>void} [o.onChange]
 * @returns {{el:HTMLElement, input:HTMLInputElement, get:()=>boolean,
 *   set:(on:boolean, quiet?:boolean)=>void, mixed:(v:boolean)=>void,
 *   disabled:(v:boolean)=>void}}
 */
export function createCheck({ label = '', checked = false, mixed = false,
                              disabled = false, title, onChange } = {}) {
  const wrap = el('label', 'pos-check');
  const input = el('input', 'pos-check-i', null, { type: 'checkbox' });
  input.checked = !!checked;
  input.indeterminate = !!mixed;
  input.disabled = !!disabled;
  const box = el('span', 'pos-check-b', null, { 'aria-hidden': 'true' });
  const word = el('span', 'pos-check-t', label);
  if (title) wrap.title = title;
  wrap.append(input, box, word);

  input.addEventListener('change', () => {
    // A press answers the question, so the third state is over. Leaving the box
    // half lit after somebody has said yes or no is the control arguing with
    // the person using it.
    input.indeterminate = false;
    onChange?.(input.checked);
  });

  return {
    el: wrap,
    input,
    get: () => input.checked,
    set(on, quiet = false) {
      const was = input.checked;
      input.checked = !!on;
      input.indeterminate = false;
      if (!quiet && input.checked !== was) onChange?.(input.checked);
    },
    mixed: (v) => { input.indeterminate = !!v; },
    disabled: (v) => { input.disabled = !!v; },
  };
}

/**
 * Several boxes under one name, across or down.
 *
 * 🔴 `role="group"` AND `aria-labelledby`, NOT A BARE ROW OF BOXES. A set of
 * checkboxes with a heading beside it is a heading only to somebody who can see
 * where it is; to a screen reader the boxes are five loose controls and the
 * word is a stray label. The group is what carries *these five belong to
 * `sends`*, and it costs one attribute.
 * ⚠️ NOT A `<fieldset>`. That is the other correct answer and it brings a
 * `<legend>` whose box model is its own long story on every engine, for a
 * grouping this already has.
 *
 * @param {object} o
 * @param {string} o.label
 * @param {Array<[string, any]>} o.options   [visible name, value]
 * @param {any[]} [o.value]                  the values that start on
 * @param {'row'|'column'} [o.orient]        across or down, default across
 * @param {(values:any[], last:{value:any, on:boolean})=>void} [o.onChange]
 * @param {(value:any, name:string, i:number)=>string} [o.title]  a tooltip per
 *   option, keyed on the option's own VALUE rather than on its position. A list
 *   keyed by position is a second table that agrees with the first until
 *   somebody reorders one of them.
 * @returns {{el:HTMLElement, get:()=>any[], set:(values:any[], quiet?:boolean)=>void,
 *   has:(v:any)=>boolean, boxes:object[], inputs:HTMLInputElement[],
 *   disabled:(v:boolean)=>void}}
 */
export function createCheckGroup({ label = '', options = [], value = [],
                                   orient = 'row', onChange, title } = {}) {
  const down = orient === 'column';
  const wrap = el('span', `pos-checks${down ? ' pos-checks-col' : ''}`);
  const name = el('span', 'pos-check-l', label);
  name.id = `checks-${Math.random().toString(36).slice(2, 9)}`;
  const set = el('span', 'pos-checks-set', null,
    { role: 'group', 'aria-labelledby': name.id });
  wrap.append(name, set);

  const on = new Set(value);
  // ⚠️ IN THE ORDER THE OPTIONS WERE DECLARED, never in the order they were
  // pressed. A page that logs what is on wants a line it can compare against
  // the last one, and a set iterated in insertion order gives a different
  // string for the same state depending on how somebody got there.
  // ⚠️ AND DECLARED ABOVE THE BOXES THAT CALL IT. A `const` shadows its whole
  // block from the top, and this project has already lost seven asserts to a
  // name read in its dead zone.
  const values = () => options.filter(([, v]) => on.has(v)).map(([, v]) => v);

  const boxes = options.map(([optName, optValue], i) => {
    const b = createCheck({
      label: optName,
      checked: on.has(optValue),
      title: title ? title(optValue, optName, i) : '',
      onChange: (yes) => {
        if (yes) on.add(optValue); else on.delete(optValue);
        onChange?.(values(), { value: optValue, on: yes });
      },
    });
    set.append(b.el);
    return b;
  });

  return {
    el: wrap,
    boxes,
    inputs: boxes.map((b) => b.input),
    get: values,
    has: (v) => on.has(v),
    set(next, quiet = false) {
      on.clear();
      for (const v of next || []) on.add(v);
      options.forEach(([, v], i) => boxes[i].set(on.has(v), true));
      if (!quiet) onChange?.(values(), { value: null, on: null });
    },
    disabled: (v) => boxes.forEach((b) => b.disabled(v)),
  };
}
