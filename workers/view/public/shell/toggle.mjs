// demo/shell/toggle.mjs: a button that stays down (sustain, mute, arm), with `aria-pressed`, not
// role=switch. Vocabulary as check.mjs. Sizes: big 34 px for a page, small 26 px (34 minus the
// 8 px control gap) for a keyboard footer.
// why: lessons/kit-toggle.md#header

import { el } from './shell.mjs';

/** The sizes, so a caller that passes a wrong one is told rather than styled. */
export const SIZES = ['big', 'small'];

/**
 * @param {object} o
 * @param {string} o.label      the word on the button, uppercased by CSS
 * @param {boolean} [o.checked] does it start down
 * @param {'big'|'small'} [o.size] 34 px for a page, 26 px for a keyboard footer
 * @param {boolean} [o.disabled]
 * @param {string} [o.title]    the browser's own tooltip
 * @param {(on:boolean)=>void} [o.onChange]
 * @returns {{el:HTMLElement, button:HTMLButtonElement, get:()=>boolean,
 *   set:(on:boolean, quiet?:boolean)=>void, size:(s:string)=>void,
 *   disabled:(v:boolean)=>void}}
 */
export function createToggle({ label = '', checked = false, size = 'big',
                               disabled = false, title, onChange } = {}) {
  if (!SIZES.includes(size)) {
    throw new Error(`createToggle: size ${size} is not one of ${SIZES.join(', ')}`);
  }
  const button = el('button', 'pos-toggle', label, {
    type: 'button', 'aria-pressed': checked ? 'true' : 'false',
  });
  button.disabled = !!disabled;
  if (title) button.title = title;

  let on = !!checked;
  // The state lives in `aria-pressed` and is read back from it, so picture, announcement and
  // `get()` cannot disagree.
  // why: lessons/kit-toggle.md#aria-pressed-state
  const paint = () => button.setAttribute('aria-pressed', on ? 'true' : 'false');
  const sizeOf = (s) => {
    if (s === 'small') button.dataset.size = 'small';
    // Deleted rather than set empty: `[data-size]` matches an empty string.
    // why: lessons/kit-toggle.md#delete-size
    else delete button.dataset.size;
  };
  sizeOf(size);

  button.addEventListener('click', () => {
    on = !on;
    paint();
    onChange?.(on);
  });

  return {
    el: button,
    button,
    get: () => on,
    set(next, quiet = false) {
      const was = on;
      on = !!next;
      paint();
      if (!quiet && on !== was) onChange?.(on);
    },
    size(s) {
      if (!SIZES.includes(s)) {
        throw new Error(`createToggle: size ${s} is not one of ${SIZES.join(', ')}`);
      }
      sizeOf(s);
    },
    disabled: (v) => { button.disabled = !!v; },
  };
}
