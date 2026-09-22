// demo/shell/switch.mjs
// One thing, running or not, and the rounded rectangle that says which.
//
// 🔴 ASKED FOR 2026-09-22: *"add switch component (similar to checbox, rounded
// yellow ot lightgray rect (primary second))"*.
//
// 🔴 THE CHECKBOX LANDED THE SAME DAY, SO THE FIRST THING THIS FILE HAS TO EARN
// IS THE LINE BETWEEN THE TWO. `check.mjs` answers *which of these*: a box is a
// member of a set, the word beside it is a noun, and the boxes are read as a
// list with a heading over them. A switch answers *is this running*: there is
// one of it, the word beside it names the thing it governs, and flipping it IS
// the action rather than a mark somebody collects later.
// ⚠️ AND THE ARGUMENT IS THE ONE `check.mjs` ALREADY MADE AGAINST `choice.mjs`,
// ONE CONTROL ALONG. That header refuses `aria-pressed` because *pressed* says
// something HAPPENED where what is true is that something IS. This file refuses
// *checked* for the same shape of reason: checked says it is in the set, on
// says it is running, and a page turning a filter on is not adding a filter to
// a list.
//
// 🔴 IT IS A REAL `<input type="checkbox">` WEARING `role="switch"`, WHICH IS
// THE SAME FOUR REASONS AS `check.mjs` PLUS ONE ATTRIBUTE.
//   1. The space key toggles it with no code at all. A control whose keyboard
//      behaviour is the page's job is a control whose keyboard behaviour will
//      be missing on one page.
//   2. `:checked` and `:disabled` are the browser's job rather than a set of
//      classes this file would have to keep in step.
//   3. It is focusable and in the tab order without a `tabindex` to maintain.
//   4. `role="switch"` is the one thing the element does NOT carry on its own,
//      and it is one attribute. The role exists precisely so that a two state
//      control meaning *on* is not announced as one meaning *in the set*.
// ⚠️ **AND WHAT THAT ROLE SOUNDS LIKE WAS NOT MEASURED HERE.** No screen reader
// was run on this machine. What is asserted on `/kit/` is that the attribute is
// on the element that carries the state, which is the half a browser can be
// asked about. The other half needs a reader and a person listening to it.
//
// 🔴 THE KNOB IS A REAL `<span>` AND NOT AN `::after`, WHICH IS ONE ELEMENT
// MORE THAN `check.mjs` SPENDS ON ITS TICK. A pseudo element has no rect, and
// WHERE THE KNOB IS is the one fact about this control worth measuring: it is
// the whole difference between a switch that moved and a switch that changed
// colour. `/kit/` reads its left edge at both ends of the track. A tick is a
// picture and can stay a pseudo element; a position has to be an element.
//
// 🔴 THERE IS NO THIRD STATE, AND THAT IS A DECISION RATHER THAN AN OMISSION.
// `indeterminate` is `check.mjs`'s and it is *some of the ones under this
// heading*, which is a real answer about a SET. A switch half lit is a picture
// of a machine that is neither running nor stopped, and there is no such
// machine. The underlying input would still honour the property, so this
// component never sets it and no rule in `shell.css` draws it.
//
// 🔴 TWO WEIGHTS, AND THE SECOND ONE MAY NOT INVENT A SECOND YELLOW. `--hi` is
// this project's one colour for *the thing this control is about*, so a primary
// switch lights up in it and a secondary switch lights up in `--dim`, which is
// already in the stylesheet. Weight says how loudly the ON state announces
// itself; it says nothing about what the control does, and both weights share
// one OFF picture so a row of them reads as one family.
//
// ⚠️ NO GROUP CONSTRUCTOR, DELIBERATELY. `createCheckGroup` exists because a
// set of boxes under one heading is a real object that has to be announced as
// one, and it owns the values, the order and the group role. Several switches
// in a row are several independent things, each with its own word, so a wrapper
// round them would carry nothing. If a page ever wants *these four belong
// together*, that is a group of checkboxes and it is already built.
//
// STYLING lives in `shell.css` beside `.pos-check`, because a control in this
// project is declared there. A component that only looks right next to one
// page's stylesheet is the `choice.mjs` bug, which shipped emitting two class
// names no stylesheet matched.

import { el } from './shell.mjs';

/** The weights, so a caller and a check read the same list. */
export const WEIGHTS = ['primary', 'secondary'];

/**
 * One switch and its word.
 *
 * ⚠️ THE VOCABULARY IS `check.mjs`'s ON PURPOSE. `checked`, `get()`,
 * `set(on, quiet)`, `disabled(v)` and `onChange(on)` all mean here exactly what
 * they mean there, because they are the same ideas and a second name for one
 * idea is the drift `/kit/` exists to catch. The only new word is `weight`, and
 * it is new because the thing it names is new.
 *
 * @param {object} o
 * @param {string} o.label          the word beside the switch
 * @param {boolean} [o.checked]     does it start on
 * @param {'primary'|'secondary'} [o.weight]  how loud the ON state is.
 *   `primary` lights in `--hi`, which is the ink that means *the thing this
 *   control is about*; `secondary` lights in grey, for a switch that is on the
 *   page but is not what the page is about.
 * @param {boolean} [o.disabled]
 * @param {string} [o.title]        the browser's own tooltip
 * @param {(on:boolean)=>void} [o.onChange]
 * @returns {{el:HTMLElement, input:HTMLInputElement, knob:HTMLElement,
 *   track:HTMLElement, get:()=>boolean, set:(on:boolean, quiet?:boolean)=>void,
 *   weight:(w:string)=>void, disabled:(v:boolean)=>void}}
 */
export function createSwitch({ label = '', checked = false, weight = 'primary',
                               disabled = false, title, onChange } = {}) {
  if (!WEIGHTS.includes(weight)) {
    throw new Error(`createSwitch: weight ${weight} is not one of ${WEIGHTS.join(', ')}`);
  }
  const wrap = el('label', 'pos-switch');
  const input = el('input', 'pos-switch-i', null, { type: 'checkbox', role: 'switch' });
  input.checked = !!checked;
  input.disabled = !!disabled;
  const track = el('span', 'pos-switch-b', null, { 'aria-hidden': 'true' });
  const knob = el('span', 'pos-switch-k');
  track.append(knob);
  const word = el('span', 'pos-switch-t', label);
  if (title) wrap.title = title;
  wrap.append(input, track, word);

  // ⚠️ DELETED RATHER THAN SET EMPTY, WHICH IS THE HOUSE RULE AND IS WORTH
  // KEEPING EVEN WHERE THE SELECTOR HAPPENS TO BE SAFE. The rules match
  // `[data-weight="secondary"]` rather than `[data-weight]`, so an empty string
  // would not light the wrong picture. `video-panel.mjs` wrote `= ''` against
  // a presence selector and a panel that had been full once stayed full for the
  // rest of the page's life, so the habit is the thing being protected.
  const paint = (w) => {
    if (w === 'secondary') wrap.dataset.weight = 'secondary';
    else delete wrap.dataset.weight;
  };
  paint(weight);

  input.addEventListener('change', () => { onChange?.(input.checked); });

  return {
    el: wrap,
    input,
    track,
    knob,
    get: () => input.checked,
    set(on, quiet = false) {
      const was = input.checked;
      input.checked = !!on;
      if (!quiet && input.checked !== was) onChange?.(input.checked);
    },
    weight(w) {
      if (!WEIGHTS.includes(w)) {
        throw new Error(`createSwitch: weight ${w} is not one of ${WEIGHTS.join(', ')}`);
      }
      paint(w);
    },
    disabled: (v) => { input.disabled = !!v; },
  };
}
