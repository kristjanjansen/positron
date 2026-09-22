// demo/shell/pos-choice.mjs — one of these, and the others are not.
//
// 🔴 THE THIRD HAND-BUILT COPY OF THIS. `mirror` builds a labelled row of
// mutually exclusive buttons, `/keys/` builds one, and `/kit/` already carried a
// note saying so — that the sandbox existed to make exactly this kind of drift
// visible, and here it was. So it becomes a component.
//
// ⚠️ NO STATE WORD ON THE BUTTON. `/keys/` inherited a `::after` that appended
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
 * @param {(value:any, name:string, i:number)=>string} [o.title]  the browser's
 *   own tooltip for one option, or '' for none.
 *
 * 🔴 A NAMED OPTION, NEVER A THIRD ELEMENT OF `options`, AND THAT SLOT IS
 * ALREADY TAKEN. Asked for on `/wish/` 2026-09-22: a picker shows `70B` and
 * `Scout`, and what a reader wants on hover is the full model id and what a
 * press costs. The obvious shape is `[name, value, title]` and it would have
 * been a defect the moment it shipped: `/radio/`'s `STATIONS` are already
 * `['Klassika', 'klassikaraadio', 128]`, where the third element is a BITRATE,
 * so every station button on that page would have grown a tooltip reading
 * `128`. FOUND BY READING ALL ELEVEN CALL SITES BEFORE WRITING THIS, NOT AFTER.
 * ⚠️ AND IT IS A FUNCTION RATHER THAN A LIST, so the tooltip is keyed on the
 * option's own VALUE. A list keyed by position is a second table that agrees
 * with the first until somebody reorders one of them, which is this project's
 * most repeated defect in its cheapest form.
 * ⚠️ NO TITLE, NO ATTRIBUTE. Every existing caller passes nothing here and
 * therefore renders exactly as it did.
 * @param {'row'|'column'} [o.orient]  which way the options run, default across.
 *   The label goes above a standing group rather than beside it, because beside
 *   a column a label is one word floating against the first option and reads as
 *   that option's heading rather than the group's.
 * @returns {{el:HTMLElement, get:()=>number, value:()=>any, set:(i:number, quiet?:boolean)=>void,
 *            disabled:(v:boolean)=>void, buttons:HTMLButtonElement[]}}
 */
export function createChoice({ label, options, at = 0, onPick, title, orient = 'row' } = {}) {
  /**
   * 🔴 `at: -1` MEANS NOTHING IS CHOSEN YET, AND IT IS A REAL STATE. Added
   * 2026-09-17 for `/stage/`, where the control room asks the audience a
   * question: a question that arrives with an answer already given is a question
   * nobody was asked, and clamping -1 up to 0 was quietly answering it for them.
   * ⚠️ IT IS THE SAME ARGUMENT `presence.mjs` MAKES ABOUT `unknown`. A thing
   * nobody has answered is not the first option, the way a thing nobody has
   * asked about is not offline.
   */
  let chosen = at < 0 ? -1 : Math.max(0, Math.min(options.length - 1, at));

  const wrap = el('span', 'pos-choice');
  /**
   * 🔴 STANDING UP IS AN ATTRIBUTE AND NOT A SECOND COMPONENT. Asked for
   * 2026-09-22 as *"plus checboxes and radios (horiz and vert)"*. Everything
   * about this control except which way the segments run is the same standing
   * as lying, so a second module would have been the third hand-built copy of a
   * radio row, which is what this file exists because of.
   *
   * ⚠️ IT IS ONE ATTRIBUTE AND EVERY EXISTING CALLER IS BYTE IDENTICAL. `row`
   * writes nothing at all, so the eleven pages already using this render exactly
   * as they did. ⚠️ AND IT IS AN ATTRIBUTE RATHER THAN A CLASS ONLY BECAUSE THE
   * VALUE MATTERS: `[data-orient]` would match both, and `[data-orient="column"]`
   * matches one, which is the `[data-full]` lesson recorded in CLAUDE.md where
   * an attribute selector matching on PRESENCE kept a panel in its full screen
   * look for the rest of a page's life.
   *
   * 🔴 AND THE STYLESHEET HAS TO TURN THREE THINGS, NOT ONE. `.pos-seg` overlaps
   * its children on the LEFT and rounds the first child's left corners and the
   * last child's right, all of which are the wrong axis stacked: turning only
   * `flex-direction` leaves a doubled border on every join and two stray curves
   * in the middle of the column. `/kit/` measures all three.
   *
   * ⚠️ WHAT THIS DOES NOT CHANGE IS WHAT THE BUTTONS ARE. They are still
   * buttons wearing `aria-pressed` rather than `role="radio"`, which is a real
   * gap and is left alone deliberately: changing the role is a change to eleven
   * call sites and to what a screen reader announces on every page that has
   * one, and it is nothing to do with which way the row runs.
   */
  if (orient === 'column') wrap.dataset.orient = 'column';
  if (label) wrap.append(el('span', 'pos-choice-l', label));
  // ⚠️ `step` IS THE JOIN, and it is reused rather than reimplemented. The 1 px
  // border overlap, the outer-only corners and the raise-on-hover all live in
  // that one block; a second copy here is the drift this page exists to catch.
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
   * Mark one option as PRESSED BUT NOT YET ARRIVED, or `null` for none.
   *
   * 🔴 A CONTROL WHOSE EFFECT IS SECONDS AWAY LOOKS BROKEN WITHOUT THIS, and
   * `/radio/` is where it was reported: a speed button lights the moment it
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
   * ⚠️ IT SETS `data-busy`, WHICH IS THE SHELL'S OWN ATTRIBUTE, on purpose. Every
   * other button in this project says "working on it" with one sweep across its
   * face; this had its own opacity pulse for about an hour and was REPORTED as a
   * flicker. One idea, one picture — and reusing it means the reduced-motion
   * fallback, the `cursor: progress` and the colours all come along without a
   * second copy to drift. `shell.mjs` only ever sets `data-busy` on
   * `.pos-controls` buttons, so nothing collides.
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
