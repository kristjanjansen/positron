// demo/shell/choice.mjs: one of these, and the others are not; a segmented row of exclusive buttons.
// No state word on a button: colour and `aria-pressed` already say which is chosen.
// why: lessons/kit-choice.md#header

import { el } from './shell.mjs';

/**
 * @param {object} o
 * @param {string} o.label            shown before the group, uppercased by CSS
 * @param {Array<[string, any]>} o.options  [visible name, value]
 * @param {number} [o.at]             index chosen at the start; -1 for none yet
 * @param {(value:any, name:string, i:number)=>void} [o.onPick]
 * @param {(value:any, name:string, i:number)=>string} [o.title]  tooltip for one option, keyed
 *   on its value, or '' for none. Not a third element of `options`: some callers use that slot.
 * @param {'row'|'column'} [o.orient]  which way the options run, default across; a column puts
 *   the label above.
 * @returns {{el:HTMLElement, get:()=>number, value:()=>any, set:(i:number, quiet?:boolean)=>void,
 *            disabled:(v:boolean)=>void, buttons:HTMLButtonElement[]}}
 * why: lessons/kit-choice.md#createchoice
 */
export function createChoice({ label, options, at = 0, onPick, title, orient = 'row' } = {}) {
  /**
   * `at: -1` means nothing is chosen yet, a real state: clamping it to 0 answers for the person.
   * why: lessons/kit-choice.md#at-none
   */
  let chosen = at < 0 ? -1 : Math.max(0, Math.min(options.length - 1, at));

  const wrap = el('span', 'pos-choice');
  /**
   * Standing up is `data-orient="column"`, not a second component; `row` writes nothing.
   * The stylesheet turns the overlap, the corners and the direction. Buttons stay `aria-pressed`,
   * not `role=radio`.
   * why: lessons/kit-choice.md#orient
   */
  if (orient === 'column') wrap.dataset.orient = 'column';
  if (label) wrap.append(el('span', 'pos-choice-l', label));
  // `step` is the join, reused rather than reimplemented.
  // why: lessons/kit-choice.md#join
  const seg = el('span', 'step pos-seg pos-choice-seg');
  wrap.append(seg);

  const buttons = options.map(([name, value], i) => {
    const b = el('button', '', name, { type: 'button', 'aria-pressed': String(i === chosen) });
    const tip = title ? title(value, name, i) : '';
    if (tip) b.title = tip;
    b.onclick = () => set(i);
    seg.append(b);
    return b;
  });

  function set(i, quiet = false) {
    chosen = Math.max(0, Math.min(options.length - 1, i));
    buttons.forEach((b, k) => b.setAttribute('aria-pressed', String(k === chosen)));
    if (!quiet) onPick?.(options[chosen][1], options[chosen][0], chosen);
  }

  /**
   * Mark one option as pressed but not yet arrived, or `null` for none, for an effect seconds away.
   * A channel separate from `aria-pressed`; it sets the shell's own `data-busy` sweep.
   * why: lessons/kit-choice.md#pending
   */
  function pending(i) {
    buttons.forEach((b, k) => {
      if (i != null && k === i) b.dataset.busy = '1';
      else delete b.dataset.busy;
    });
  }

  return {
    el: wrap, buttons,
    get: () => chosen,
    value: () => options[chosen][1],
    set,
    pending,
    disabled: (yes) => buttons.forEach((b) => { b.disabled = !!yes; }),
  };
}
