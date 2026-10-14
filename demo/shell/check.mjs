// demo/shell/check.mjs: many of a set, and the box that says so. A real `<input type=checkbox>`
// (announced as checked, space key, indeterminate, form states), clipped not `display: none`, with
// the box drawn beside it; the whole thing is a `<label>`. Styles in shell.css by `.pos-choice`.
// why: lessons/kit-check.md#header

import { el } from './shell.mjs';

/**
 * One box and its word.
 * @param {object} o
 * @param {string} o.label      the word beside the box
 * @param {boolean} [o.checked]
 * @param {boolean} [o.mixed]   the third state; a picture, not a value: `get()` stays boolean.
 * @param {boolean} [o.disabled]
 * @param {string} [o.title]    the browser's own tooltip
 * @param {(on:boolean)=>void} [o.onChange]
 * @returns {{el:HTMLElement, input:HTMLInputElement, get:()=>boolean,
 *   set:(on:boolean, quiet?:boolean)=>void, mixed:(v:boolean)=>void,
 *   disabled:(v:boolean)=>void}}
 * why: lessons/kit-check.md#createcheck
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
 * Several boxes under one name, across or down: `role=group` with `aria-labelledby`.
 * NOT A `<fieldset>`: its `<legend>` brings a box model of its own on every engine.
 * @param {object} o
 * @param {string} o.label
 * @param {Array<[string, any]>} o.options   [visible name, value]
 * @param {any[]} [o.value]                  the values that start on
 * @param {'row'|'column'} [o.orient]        across or down, default across
 * @param {(values:any[], last:{value:any, on:boolean})=>void} [o.onChange]
 * @param {(value:any, name:string, i:number)=>string} [o.title]  a tooltip per option, by value
 * @returns {{el:HTMLElement, get:()=>any[], set:(values:any[], quiet?:boolean)=>void,
 *   has:(v:any)=>boolean, boxes:object[], inputs:HTMLInputElement[],
 *   disabled:(v:boolean)=>void}}
 * why: lessons/kit-check.md#createcheckgroup
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
  // In declared order, never pressed order, so the same state logs the same line.
  // Declared above the boxes that call it.
  // why: lessons/kit-check.md#values
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
