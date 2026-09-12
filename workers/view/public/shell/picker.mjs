// demo/shell/picker.mjs — step through a list, or jump straight to one by name.
//
// ‹ | Brass 1 ▾ | ›    ⚅
//
// 🔴 WHY THIS EXISTS AND `stepper.mjs` WAS NOT ENOUGH. A stepper over a list of
// three is fine. Over `/box/`'s patch library it is not: Yoshimi alone reaches
// 878 instruments, and "press › eight hundred times" is not a way to choose
// anything. The name in the middle was already being drawn beside the stepper
// as dead text — it had the list's most useful property, which is that you can
// READ where you are, and none of its most useful behaviour, which is that you
// can GO somewhere.
//
// ⚠️ THE DROPDOWN IS A REAL `<select>`, AND IT IS INVISIBLE UNTIL PRESSED.
// A native select carries the platform's own chrome — a bevel on macOS, a full
// sheet on iOS, a hard-coded font — none of which belongs in a row of mono
// buttons. So the select is laid over the name cell at `opacity: 0` and the
// cell underneath is drawn by us. Pressing anywhere on it opens the platform's
// own list, which is the one part of a dropdown nobody should reimplement:
// it scrolls, it type-aheads, it keyboards, and on a phone it is a proper
// sheet. We draw the closed state; the platform draws the open one.
//
// ⚠️ FIXED WIDTH, BECAUSE A CONTROL THAT RESIZES IS A CONTROL THAT MOVES.
// Patch names here run from `Dig Rhodes` to `Vibraphone Soft 2`, and a cell
// that fits its text makes the two arrows and the die jump sideways every time
// you step — so the thing you are about to press again is not where it was.
// The cell is `--pick-w` wide and long names ellipsize.
//
// ⚠️ THE DIE IS OUTSIDE THE GROUP. `stepper.mjs` argues the opposite for its
// own `random`, and that argument still holds THERE: back/roll/forward are one
// axis and the roll is a jump along it. Here the middle slot is the readout, so
// a die wedged between the name and `›` would split the one thing you read. It
// sits after the group with a gap, which also says what it is — not another
// step, a different kind of move.
//
// 🔴 THE DIE IS DRAWN, NOT TYPED. `⚅` (U+2685) was the obvious answer to
// `stepper.mjs`'s ban on 🎲 — an ordinary glyph that takes the row's font,
// colour and baseline instead of being a colour picture at a size of its own.
// It rendered as TOFU: a last-resort box with the hex digits in it, because
// U+2685 is not in the mono face and was in no fallback the browser had.
// Photographed at 4x before it shipped.
//
// A font stack would only move the question to "which machine is this", which
// is the same class of bug as the emoji. Six pips of SVG take `currentColor`,
// are square by construction and look identical everywhere — so the glyph
// stops being something the platform gets a vote on.

import { el } from './shell.mjs';

/** Die face six: two columns of three pips. `currentColor`, so it wears the
 *  button's own colour including :disabled and :hover, with no extra rules. */
const DIE_SVG = `<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false">
  <rect x="1.5" y="1.5" width="13" height="13" rx="3" fill="none" stroke="currentColor" stroke-width="1.2"/>
  <g fill="currentColor">
    <circle cx="5.5" cy="4.6" r="1.15"/><circle cx="10.5" cy="4.6" r="1.15"/>
    <circle cx="5.5" cy="8" r="1.15"/><circle cx="10.5" cy="8" r="1.15"/>
    <circle cx="5.5" cy="11.4" r="1.15"/><circle cx="10.5" cy="11.4" r="1.15"/>
  </g>
</svg>`;

/**
 * @param {object} o
 * @param {string} [o.label]     shown before the group, uppercased by CSS
 * @param {string} [o.what]      what is being stepped, for the button titles
 * @param {() => void} o.prev
 * @param {() => void} o.next
 * @param {() => void} [o.random]        omit it and there is no die
 * @param {(i:number)=>void} [o.onPick]  chosen from the dropdown, by index
 * @param {string} [o.cls]
 * @returns {{el:HTMLElement, buttons:HTMLButtonElement[], select:HTMLSelectElement,
 *            show:(name:string, i?:number)=>void,
 *            options:(names:string[], at?:number)=>void,
 *            disabled:(v:boolean)=>void}}
 */
export function createPicker({ label, what = 'it', prev, next, random, onPick, cls = '' } = {}) {
  const wrap = el('span', `pos-pick ${cls}`.trim());
  if (label) wrap.append(el('span', 'pos-pick-l', label));

  // `step` is the join — the 1 px border overlap, the outer-only corners and
  // the hover raise all live in that one block. Third component to reuse it
  // rather than write a fourth copy of a segmented row.
  const seg = el('span', 'step pos-pick-seg');
  wrap.append(seg);

  const mk = (text, title, fn, k = '') => {
    const b = el('button', k, text, { type: 'button', title });
    b.onclick = fn;
    return b;
  };

  const back = mk('‹', `the ${what} before this one`, prev, 'ico');
  const fwd = mk('›', `the ${what} after this one`, next, 'ico');

  // The middle slot: our paint, the platform's list.
  const cell = el('span', 'pos-pick-cell');
  const name = el('span', 'pos-pick-n', '—');
  const caret = el('span', 'pos-pick-caret', '▾');
  const select = el('select', 'pos-pick-sel', '', { 'aria-label': `choose a ${what}` });
  select.onchange = () => onPick?.(select.selectedIndex);
  cell.append(name, caret, select);

  seg.append(back, cell, fwd);

  const buttons = [back, fwd];
  let die = null;
  if (random) {
    // Outside the segment, with a gap — see the header.
    die = mk('', `jump to any ${what}`, random, 'ico pos-pick-die');
    die.innerHTML = DIE_SVG;
    die.setAttribute('aria-label', `jump to any ${what}`);
    wrap.append(die);
    buttons.push(die);
  }

  return {
    el: wrap,
    buttons,
    select,
    /** Draw the current one. `i` keeps the invisible select in step with it. */
    show: (label_, i) => {
      name.textContent = label_ ?? '—';
      // ⚠️ THE TITLE IS THE WHOLE NAME. The cell ellipsizes at a fixed width, so
      // the only place a long name survives is the tooltip.
      cell.title = label_ ?? '';
      if (Number.isInteger(i) && i >= 0 && i < select.options.length) select.selectedIndex = i;
    },
    /** Replace the list. The board's library arrives over the wire, so this is
     *  called long after the control is on screen. */
    options: (names, at = 0) => {
      select.textContent = '';
      for (const n of names) select.append(el('option', '', n));
      if (names.length) select.selectedIndex = Math.max(0, Math.min(names.length - 1, at));
      // A list of one has nowhere to go; a list of none is not a list yet.
      const usable = names.length > 1;
      select.disabled = !usable;
      cell.dataset.flat = usable ? '' : '1';
    },
    disabled: (v) => {
      buttons.forEach((b) => { b.disabled = !!v; });
      select.disabled = !!v || select.options.length < 2;
    },
  };
}
