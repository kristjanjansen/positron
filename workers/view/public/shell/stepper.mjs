// demo/shell/stepper.mjs — back, a roll of the dice, forward.
//
// 🔴 NO EMOJI IN A CONTROL. The box page used 🎲 for its patch roll and the
// mirror page was about to. An emoji is a COLOUR PICTURE at a size of its own:
// it ignores the row's font, sits off the baseline, renders differently on
// every platform and — reported from the page — is simply hard to see against a
// dark control. Everything else in this project's UI is text in one mono face,
// and a die is the one thing that was not.
//
// ⚠️ AND THE ROLL GOES IN THE MIDDLE, not on the end. Back and forward are one
// axis; a roll is a jump along that same axis, so it belongs between its two
// neighbours rather than tacked on after them. It also makes the three a single
// target group for a thumb or a hand-ray instead of two things and a stray.
//
// `‹` and `›` are text, not pictures: they take the row's font, its colour and
// its baseline, which is the whole complaint about the die.

import { el } from './shell.mjs';
import { createValueCell } from './picker.mjs';

/**
 * @param {object} o
 * @param {() => void} o.prev      step back
 * @param {() => void} o.next      step forward
 * @param {() => void} [o.random]  jump somewhere — omit it and the group is
 *                                 just the two arrows, corners still correct
 * @param {string} [o.what]        what is being stepped, for the titles
 * @param {string} [o.cls]         extra class on the wrapper
 * @param {object} [o.pick]        make the middle a VALUE you can choose from,
 *   the way a patch row does: `{ options: string[], at, onPick(i) }`. It
 *   replaces `random`, because the middle is one slot.
 * @returns {{el: HTMLElement, buttons: HTMLButtonElement[], disabled: (v:boolean)=>void,
 *            show?: (name:string, i:number)=>void, options?: (names:string[], at?:number)=>void}}
 */
export function createStepper({ prev, next, random, what = 'it', cls = '', pick = null }) {
  const wrap = el('span', `step pos-seg ${cls}`.trim());
  const mk = (label, title, fn, cls = '') => {
    const b = el('button', cls, label, { type: 'button', title });
    b.onclick = fn;
    wrap.append(b);
    return b;
  };
  // ⚠️ THE ARROWS ARE SQUARE, THE WORD IS NOT. An icon button whose width comes
  // from its glyph is a different width in every font — `.ico` fixes it to the
  // control's own height so `‹` and `›` are 34x34 and the group reads as one
  // object rather than as three things that happen to be adjacent.
  const buttons = [mk('‹', `the ${what} before this one`, prev, 'ico')];
  /**
   * 🔴 THE MIDDLE IS A SLOT, AND IT HOLDS ONE OF THREE THINGS. Asked 2026-09-17:
   * *"stepper: want middle pne selectable like synth patches"*.
   *
   *   nothing  two arrows, for a list of two where a jump means nothing
   *   random   a jump along the same axis, which is why it sits between them
   *   pick     the CURRENT one, named, with the whole list behind it
   *
   * `pick` is the patch row's middle, and it is the same code rather than a
   * copy: `createValueCell` was lifted out of `picker.mjs` for this. A second
   * implementation of a segmented middle is precisely the drift `/kit/` exists
   * to catch, and this project has already shipped three hand-built segmented
   * rows before anybody noticed.
   * ⚠️ CSS ROUNDS BY `:first-child`/`:last-child`, so whichever of the three the
   * middle is, the outer corners come out right with no special case.
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
