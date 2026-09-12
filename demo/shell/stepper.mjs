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

/**
 * @param {object} o
 * @param {() => void} o.prev      step back
 * @param {() => void} o.next      step forward
 * @param {() => void} o.random    jump somewhere
 * @param {string} [o.what]        what is being stepped, for the titles
 * @param {string} [o.cls]         extra class on the wrapper
 * @returns {{el: HTMLElement, buttons: HTMLButtonElement[], disabled: (v:boolean)=>void}}
 */
export function createStepper({ prev, next, random, what = 'it', cls = '' }) {
  const wrap = el('span', `step ${cls}`.trim());
  const mk = (label, title, fn) => {
    const b = el('button', '', label, { type: 'button', title });
    b.onclick = fn;
    wrap.append(b);
    return b;
  };
  const buttons = [
    mk('‹', `the ${what} before this one`, prev),
    // Spelled out, because "what does the middle one do" is a question a symbol
    // cannot answer and this is the only one of the three that is not obvious.
    mk('random', `jump to any ${what}`, random),
    mk('›', `the ${what} after this one`, next),
  ];
  return {
    el: wrap,
    buttons,
    disabled: (v) => buttons.forEach((b) => { b.disabled = v; }),
  };
}
