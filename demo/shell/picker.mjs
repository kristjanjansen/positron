// demo/shell/picker.mjs — step through a list, or jump straight to one by name.
//
// ‹ | Brass 1 | ›    ⚅
//
// 🔴 WHY THIS EXISTS AND `stepper.mjs` WAS NOT ENOUGH. A stepper over a list of
// three is fine. Over `/keys/`'s patch library it is not: Yoshimi alone reaches
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
// you step, so the thing you are about to press again is not where it was.
// `--pick-w` is the room RESERVED FOR THE NAME, and `shell.css` adds the cell's
// own padding and edges on top of it before setting a width. It said "the cell
// is `--pick-w` wide" until 2026-09-20, and that was the bug: the box was that
// wide, so the padding came out of the name's share and a 9 ch reservation
// showed six characters. Long names still ellipsize, past the cap below.
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
import { centreSymbol } from './symbol.mjs';

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
/**
 * 🔴 THE MIDDLE OF A SEGMENTED ROW, AS A THING YOU CAN CHOOSE FROM. Extracted
 * 2026-09-17 so `stepper.mjs` can have one too, asked for as *"stepper: want
 * middle pne selectable like synth patches"*. It was written here first, for
 * the patch row, and a second copy in the stepper is exactly the drift `/kit/`
 * exists to catch: this project already has three hand-built segmented rows in
 * its history and one of them is why `createChoice` exists.
 *
 * OUR PAINT, THE PLATFORM'S LIST. The visible half is a span we draw, so it
 * takes the row's font and its ellipsis; the working half is a real `<select>`
 * laid over it, so the list is the one the operating system already knows how
 * to show, including on a phone where a hand-built menu is a small disaster.
 */
export function createValueCell({ what = 'it', onPick } = {}) {
  const cell = el('span', 'pos-pick-cell');
  const name = el('span', 'pos-pick-n', '—');
  const select = el('select', 'pos-pick-sel', '', { 'aria-label': `choose a ${what}` });
  select.onchange = () => onPick?.(select.selectedIndex);
  cell.append(name, select);

  const show = (label_, i) => {
    name.textContent = label_ ?? '—';
    // ⚠️ THE TITLE IS THE WHOLE NAME. The cell ellipsizes at a fixed width, so
    // the only place a long name survives is the tooltip.
    cell.title = label_ ?? '';
    if (Number.isInteger(i) && i >= 0 && i < select.options.length) select.selectedIndex = i;
  };
  /**
   * 🔴 THE WIDTH COMES FROM THE WIDEST NAME IN THE LIST, NOT FROM A CONSTANT.
   * Asked 2026-09-17 with a picture of `‹ kaleidoscope ›`: *"w should be set on
   * widest member ("..." too wide ones)"*.
   *
   * The fixed width was already right about the thing that matters, and the
   * comment in shell.css says it: a cell that sizes to its CURRENT text moves
   * the arrows every time you step, so the control you are about to press again
   * is not where it was. What was wrong was the number. 13 ch and 22 ch were
   * guesses at a phone and a desktop, so a list of short names sat in a box half
   * empty and a list of long ones ellipsised inside a row with room to spare.
   * Reserving the widest MEMBER keeps the no-movement guarantee and spends
   * exactly the room the list needs.
   *
   * ⚠️ IT SETS THE CUSTOM PROPERTY, NOT `width`. The phone rule sets
   * `width: auto` on this cell, and an inline `width` would beat it and drag the
   * row off a small screen. Setting `--pick-w` lets the base rule use it and
   * lets the phone rule still win.
   * ⚠️ AND THE NUMBER IS CHARACTERS OF NAME, NOT PIXELS OF CONTROL. What the
   * cell does with it, including how much padding goes round it, is
   * `shell.css`'s to decide and is deliberately not known here: a padding
   * written in both files is a padding that will disagree with itself, which is
   * what `--sld-col` was created to stop.
   * ⚠️ AND IT IS CAPPED, which is what the ellipsis is for. A 60 character name
   * would make a control nothing else on the page could sit beside, so past the
   * cap the name is cut and the whole of it stays in the title.
   */
  const MAX_CH = 24;
  const MIN_CH = 8;
  const fitWidth = (names) => {
    const widest = names.reduce((n, s2) => Math.max(n, [...s2].length), 0);
    // One spare character, because a proportional fallback face is wider than
    // the mono one this is measured in.
    const ch = Math.min(MAX_CH, Math.max(MIN_CH, widest + 1));
    cell.style.setProperty('--pick-w', `${ch}ch`);
    return ch;
  };

  const options = (names, at = 0) => {
    fitWidth(names);
    select.textContent = '';
    for (const n of names) select.append(el('option', '', n));
    const i = names.length ? Math.max(0, Math.min(names.length - 1, at)) : -1;
    if (i >= 0) select.selectedIndex = i;
    /**
     * 🔴 AND IT DRAWS THE NAME IT JUST SELECTED. IT DID NOT, AND THE CONTROL
     * READ `—` FOREVER. PHOTOGRAPHED on `/mirror/`: a LOOK picker with ten
     * shaders in it, a shader running, and a long em dash where the name goes.
     * The list was handed over correctly, `selectedIndex` was set correctly, and
     * the VISIBLE half was never told, so the cell kept the placeholder it is
     * built with until somebody pressed an arrow.
     * ⚠️ IT IS NOT THE CALLER'S JOB TO CALL `show()` AFTERWARDS. Two pages did
     * and one did not, which is the definition of a thing that belongs in the
     * component.
     */
    name.textContent = i >= 0 ? names[i] : '—';
    cell.title = i >= 0 ? names[i] : '';
    // A list of one has nowhere to go; a list of none is not a list yet.
    const usable = names.length > 1;
    select.disabled = !usable;
    cell.dataset.flat = usable ? '' : '1';
  };
  return { el: cell, name, select, show, options };
}

export function createPicker({ label, what = 'it', prev, next, random, onPick, cls = '' } = {}) {
  const wrap = el('span', `pos-pick ${cls}`.trim());
  if (label) wrap.append(el('span', 'pos-pick-l', label));

  // `step` is the join — the 1 px border overlap, the outer-only corners and
  // the hover raise all live in that one block. Third component to reuse it
  // rather than write a fourth copy of a segmented row.
  const seg = el('span', 'step pos-seg pos-pick-seg');
  wrap.append(seg);

  const mk = (text, title, fn, k = '') => {
    const b = el('button', k, text, { type: 'button', title });
    b.onclick = fn;
    return b;
  };

  const back = mk('‹', `the ${what} before this one`, prev, 'ico');
  const fwd = mk('›', `the ${what} after this one`, next, 'ico');
  // ⚠️ THE SAME CENTRING THE SHELL'S GLYPH CONTROLS GET. `‹` and `›` sit above
  // the baseline and narrower than their own advance, so a grid that centres
  // the BOX leaves them high and off to one side — the same defect as ⛶, in a
  // control nobody had looked at closely. The die beside them is an `<svg>` and
  // needs no measuring, which is why `symbol.mjs` takes either kind.
  for (const b of [back, fwd]) centreSymbol(b);

  // The middle slot: our paint, the platform's list.
  const { el: cell, name, select, show: drawCell, options: fillCell } =
    createValueCell({ what, onPick });

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
    show: drawCell,
    /** Replace the list. The board's library arrives over the wire, so this is
     *  called long after the control is on screen. */
    options: fillCell,
    disabled: (v) => {
      buttons.forEach((b) => { b.disabled = !!v; });
      select.disabled = !!v || select.options.length < 2;
    },
  };
}
