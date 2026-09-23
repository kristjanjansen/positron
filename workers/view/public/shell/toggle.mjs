// demo/shell/toggle.mjs. A button that stays down, in two sizes.
//
// 🔴 IT REPLACES `switch.mjs`, ASKED FOR 2026-09-23: *"integrate sustain to
// footer, create toggle button, big and small, use small below keyboard, left
// from notes off. rm switch button from all uis / kit"*. Three pages drew a
// track-and-knob switch and one of them is the gallery.
//
// ⚠️ A SWITCH AND A TOGGLE BUTTON ARE THE SAME STATE AND A DIFFERENT CLAIM. A
// switch is a SETTING: it sits there saying what the world is like, and its
// knob slides. A toggle button is a CONTROL YOU ARE PRESSING: it goes down and
// stays down, which is what a sustain pedal, a mute and a record arm all are on
// every piece of hardware in this building. The instrument that prompted this
// has a footswitch, and a footswitch is a button.
//
// ⚠️ THE VOCABULARY IS `check.mjs`'s AND `switch.mjs`'s, DELIBERATELY UNCHANGED.
// `checked`, `get()`, `set(on, quiet)`, `disabled(v)` and `onChange(on)` all
// mean here exactly what they mean there, so the three pages being swept do not
// each learn a second word for one idea. The only new word is `size`, and it is
// new because the thing it names is new.
//
// 🔴 TWO SIZES, AND THE SMALL ONE EXISTS FOR THE KEYBOARD'S FOOTER. `big` is
// 34 px, which is what every control on a page is. `small` is 26 px, which is
// what `.kpad` already is, and `shell.css` argues that number: 34 minus 8, and
// 8 px is the gap between two controls, so the step down is a unit of spacing
// this layout already uses rather than a number invented here. A full height
// button in that row would read as the page's own controls moved under the
// keys, which is exactly what the pad was built to stop.
//
// ⚠️ `aria-pressed`, NOT `role="switch"`. That is the markup difference behind
// the claim above, and it is what a screen reader says out loud: *pressed* for
// a button that is down, *on* for a switch that is set. The two are read
// differently by people who cannot see which one you drew.

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
  /* ⚠️ THE STATE IS AN ATTRIBUTE WITH A VALUE, AND IT IS READ BACK FROM THE
     ATTRIBUTE RATHER THAN FROM A SECOND COPY. `aria-pressed` has to be correct
     for a screen reader anyway, so making it the one source means the picture,
     the announcement and `get()` cannot disagree. A boolean beside it would be
     that disagreement waiting to happen. */
  const paint = () => button.setAttribute('aria-pressed', on ? 'true' : 'false');
  const sizeOf = (s) => {
    if (s === 'small') button.dataset.size = 'small';
    // ⚠️ DELETED RATHER THAN SET EMPTY. `[data-size]` would match an empty
    // string, and this project has already shipped a panel that stayed full
    // screen for the rest of a page's life on exactly that.
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
