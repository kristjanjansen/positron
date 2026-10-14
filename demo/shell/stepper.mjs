// demo/shell/stepper.mjs: back, a roll, forward. No emoji in a control: text in the row's mono face.
// The roll sits in the middle, a jump along the same axis, so the three are one target group.
// why: lessons/kit-stepper.md#header

import { el } from './shell.mjs';
import { createValueCell } from './picker.mjs';

/**
 * @param {object} o prev, next, random (omit for two arrows), what (for titles), cls,
 *   pick: { options: string[], at, onPick(i) } makes the middle a value to choose, replacing random
 * @returns {{el, buttons, disabled, show?, options?}}
 * why: lessons/kit-stepper.md#create-stepper
 */
export function createStepper({ prev, next, random, what = 'it', cls = '', pick = null }) {
  const wrap = el('span', `step pos-seg ${cls}`.trim());
  const mk = (label, title, fn, cls = '') => {
    const b = el('button', cls, label, { type: 'button', title });
    b.onclick = fn;
    wrap.append(b);
    return b;
  };
  // The arrows are square (.ico, 34x34), the word is not, so the group reads as one object.
  // why: lessons/kit-stepper.md#square-arrows
  const buttons = [mk('‹', `the ${what} before this one`, prev, 'ico')];
  /**
   * The middle holds nothing, random, or pick (createValueCell from picker.mjs, the same code).
   * CSS rounds by :first-child and :last-child, so the outer corners need no special case.
   * why: lessons/kit-stepper.md#middle-slot
   */
  let cell = null;
  if (pick) {
    cell = createValueCell({ what, onPick: pick.onPick });
    wrap.append(cell.el);
    if (Array.isArray(pick.options)) cell.options(pick.options, pick.at ?? 0);
  } else if (random) {
    // Spelled out, because "what does the middle one do" is a question a symbol
    // cannot answer, and it is the only one of the three that is not obvious.
    buttons.push(mk('random', `jump to any ${what}`, random));
  }
  buttons.push(mk('›', `the ${what} after this one`, next, 'ico'));
  return {
    el: wrap,
    buttons,
    ...(cell ? { show: cell.show, options: cell.options, select: cell.select } : {}),
    disabled: (v) => {
      buttons.forEach((b) => { b.disabled = v; });
      // A cell with one option has nowhere to go and stays disabled either way.
      if (cell) cell.select.disabled = !!v || cell.select.options.length < 2;
    },
  };
}
