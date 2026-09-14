// demo/shell/pos-choice.mjs — one of these, and the others are not.
//
// 🔴 THE THIRD HAND-BUILT COPY OF THIS. `mirror` builds a labelled row of
// mutually exclusive buttons, `/box/` builds one, and `/kit/` already carried a
// note saying so — that the sandbox existed to make exactly this kind of drift
// visible, and here it was. So it becomes a component.
//
// ⚠️ NO STATE WORD ON THE BUTTON. `/box/` inherited a `::after` that appended
// " on" or " off" to each option, from when the row was a single pappus toggle
// where that made sense. On a three-way pos-choice it renders `dry off`,
// `room on`, and — worst — `off on`. WHICH ONE IS CHOSEN IS ALREADY SAID BY
// COLOUR AND BY `aria-pressed`; saying it again in words is noise that is
// wrong half the time.
//
// ⚠️ AND IT IS ONE GROUP, NOT LOOSE BUTTONS. Gaps between the options make
// three choices look like three unrelated controls, and put the label further
// from what it labels than the options are from each other. Segmented, the same
// way `stepper.mjs` does it: overlap the borders by a pixel so a join is one
// line, round only the outer corners.

import { el } from './shell.mjs';

/**
 * @param {object} o
 * @param {string} o.label            shown before the group, uppercased by CSS
 * @param {Array<[string, any]>} o.options  [visible name, value]
 * @param {number} [o.at]             index chosen at the start
 * @param {(value:any, name:string, i:number)=>void} [o.onPick]
 * @returns {{el:HTMLElement, get:()=>number, value:()=>any, set:(i:number, quiet?:boolean)=>void,
 *            disabled:(v:boolean)=>void, buttons:HTMLButtonElement[]}}
 */
export function createChoice({ label, options, at = 0, onPick } = {}) {
  let chosen = Math.max(0, Math.min(options.length - 1, at));

  const wrap = el('span', 'pos-choice');
  if (label) wrap.append(el('span', 'pos-choice-l', label));
  // ⚠️ `step` IS THE JOIN, and it is reused rather than reimplemented. The 1 px
  // border overlap, the outer-only corners and the raise-on-hover all live in
  // that one block; a second copy here is the drift this page exists to catch.
  const seg = el('span', 'step pos-choice-seg');
  wrap.append(seg);

  const buttons = options.map(([name], i) => {
    const b = el('button', '', name, { type: 'button', 'aria-pressed': String(i === chosen) });
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
   * Mark one option as PRESSED BUT NOT YET ARRIVED, or `null` for none.
   *
   * 🔴 A CONTROL WHOSE EFFECT IS SECONDS AWAY LOOKS BROKEN WITHOUT THIS, and
   * `/radio1965/` is where it was reported: a speed button lights the moment it
   * is pressed and the sound takes about a second to get there — 600 ms of
   * already-scheduled audio plus the glide — so the first thing a listener does
   * is press it again. REPORTED as *"can we track when 0.5 etc happens and
   * animate the radiobutton until then?"*, which is the right instinct: the
   * wait is real and cannot be removed, so show the end of it.
   *
   * ⚠️ IT IS A SEPARATE CHANNEL FROM `aria-pressed`, deliberately. Chosen and
   * arrived are two different facts — the button IS the armed one throughout —
   * and collapsing them would make a pressed button appear unpressed while the
   * sound catches up, which is a worse lie than the one being fixed.
   *
   * ⚠️ THE ANIMATION MOVES OPACITY AND NOTHING ELSE (`shell.css`). CLAUDE.md:
   * nothing that redraws may change how much room it takes — a pulse on a
   * border width or a font weight would shuffle the row it sits in.
   */
  function pending(i) {
    buttons.forEach((b, k) => {
      if (i != null && k === i) b.dataset.pending = '1';
      else delete b.dataset.pending;
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
