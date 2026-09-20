// demo/shell/button-group.mjs: two or more buttons that each DO something,
// sharing one label and one row.
//
// 🔴 IT IS NOT A CHOICE, AND THE LINE BETWEEN THEM IS THE ARMED STATE, NOT THE
// JOIN. `choice.mjs` is a segmented control where exactly ONE option is armed
// and the others are the alternatives you did not pick. Here every button is an
// action, pressing one says nothing about the others, and pressing both in turn
// is the normal thing to do.
//
// 🔴 SO IT IS SEGMENTED TOO, AND THIS REVERSED ON 2026-09-19. It shipped with
// `gap: 8px` between the buttons on the argument that joining them would claim
// the page can only be in one of them. REPORTED on the first page to use it,
// with a screenshot: *"i do not see buttongroup vr xr"*. Both buttons were
// there, both were correctly switched off, and what was missing was the GROUP:
// two boxes with air between them are what two unrelated controls look like.
// `choice.mjs`'s own header had already settled this and the answer was not
// carried over: *"Gaps between the options make three choices look like three
// unrelated controls, and put the label further from what it labels than the
// options are from each other."*
//
// 🔴 AND THE "IT WILL READ AS A CHOICE WITH NOTHING CHOSEN" OBJECTION IS REAL,
// SO HERE IS WHAT ANSWERS IT, IN THREE CHANNELS A READER CAN SEE. It is not
// the join: `/stage/` proves a segmented row with nothing armed is a legal
// choice state, so the join alone cannot carry the difference.
//   1. NO `aria-pressed`, EVER. That attribute is the channel a choice arms,
//      both for a screen reader and for the `--hi` tint keyed on it in
//      shell.css, so a group that never writes it can never paint an armed
//      option and can never be announced as one. `/kit/` grades its absence.
//   2. THE BUTTONS ARE FULL SIZE. A choice's options are 11 px words in an
//      11 px pad, because they are values being compared; these keep the
//      control row's own 13 px and 18 px, because they are things you press.
//      On `/mirror/` a group sits in the same row as three choices and the two
//      are visibly different sizes of object. `/kit/` grades that too.
//   3. THE WORDS ARE VERBS. `Run in VR` is a thing to do; `2`, `8`, `24` are
//      values to pick between. That one is editorial and is on the caller.
//
// 🔴 AND IT EXISTS BECAUSE FOUR PAGES HAND-ROLLED THE SAME ROW. Asked
// 2026-09-19: *"global: make buttongroup component and convert all vr/ar
// buttons to it"*. `/weight/` calls them `vr` and `ar`, `/blocks/` says `enter`
// and `ar`, `/floor/` has `vr`, `/mirror/` has `xr` and `ar`. Three spellings
// for one control is the drift a component removes.
//
// 🔴 MOUNT IT INSIDE `.pos-controls`. `demo/verify.mjs` and
// `demo/verify-gl.mjs` both press `.pos-controls button`, which is a DESCENDANT
// selector, so a wrapper inside the row keeps every button pressable by the
// harnesses. A group that moves these buttons out of that row silently stops
// them being exercised, which is the failure `/mirror/` has already paid for
// once when a stepper moved into the knob row.
//
// ⚠️ THE GROUP OWNS DISABLED, AND THAT IS ITS SECOND JOB. Whether a headset
// session can be opened is a per-button fact that arrives late (see
// `xr-caps.mjs`), so the four pages need one way to say it rather than four:
// `enable(id, yes, reason)`. A disabled button with no reason is worse than an
// enabled one, so the reason is not optional.
//
// ⚠️ NO GLYPH HANDLING HERE. `mount()`'s own row detects a one-character label
// and squares the button up with `centreSymbol`, because a picture is drawn
// small and high in a box sized for a capital. A group is for named actions; a
// glyph control belongs in the shell's row where that already happens.

import { el } from './shell.mjs';

/**
 * @param {object} o
 * @param {string} [o.label]   shown before the row, uppercased by CSS
 * @param {Array<{id: string, label: string, aria?: string, title?: string,
 *                primary?: boolean, onPress?: (btn: HTMLButtonElement) => any}>} o.buttons
 * @param {(id: string, btn: HTMLButtonElement) => any} [o.onPress]  fires for any button
 * @returns {{el: HTMLElement, buttons: HTMLButtonElement[],
 *            button: (id: string) => HTMLButtonElement,
 *            enable: (id: string, yes: boolean, reason?: string) => void,
 *            enabled: (id: string) => boolean,
 *            enableAll: (yes: boolean, reason?: string) => void}}
 */
export function createButtonGroup({ label, buttons = [], onPress } = {}) {
  // A group with nothing in it is a label pointing at an empty row, which is
  // the kind of control that reads as a page that failed to render. Say so
  // here, where the author is, rather than drawing it.
  if (!buttons.length) throw new Error('a button group needs at least one button');

  const wrap = el('span', 'pos-bgroup');
  if (label) wrap.append(el('span', 'pos-bgroup-l', label));
  // ⚠️ `step pos-seg` IS THE JOIN, AND IT IS REUSED RATHER THAN REIMPLEMENTED.
  // The 1 px border overlap, the outer-only corners and the raise on hover all
  // live in that one block in shell.css, and `choice.mjs` and `stepper.mjs`
  // already wear it. A second copy here is the drift `/kit/` exists to catch,
  // and it is also how the two would come to disagree by a pixel.
  const row = el('span', 'step pos-seg pos-bgroup-row');
  wrap.append(row);

  const made = new Map();
  // Which ids are off, and why. Held rather than read back off the element,
  // because the busy treatment below borrows `disabled` for a second purpose
  // and the two must not be able to disagree.
  // ⚠️ DECLARED ABOVE THE LOOP THAT CLOSES OVER IT. A `const` left below the
  // block that reads it is this repo's most repeated defect, and a click
  // handler is exactly the reader that would find it years later.
  const off = new Set();

  const els = buttons.map((spec) => {
    // 🔴 A REPEATED ID IS REFUSED. `button(id)` and `enable(id, …)` would answer
    // about the first of two, so the second would be a control that cannot be
    // disabled and cannot be found, while every line of the page reads correct.
    if (made.has(spec.id)) throw new Error(`two buttons in one group share the id "${spec.id}"`);

    // ⚠️ NO `aria-pressed` HERE OR ANYWHERE BELOW. It is the choice's channel,
    // and it is what a screen reader announces as "pressed" and what shell.css
    // keys the armed tint on. A group of actions has nothing selected, so
    // writing it would be the one change that turns this into a choice.
    const b = el('button', spec.primary ? 'pos-pri' : '', spec.label, { type: 'button' });
    b.dataset.id = spec.id;
    if (spec.aria) b.setAttribute('aria-label', spec.aria);
    if (spec.title) b.title = spec.title;

    // The shell's control row does exactly this for a handler that returns a
    // promise: disabled so a second press cannot start a second run, and swept
    // by the one busy highlight this project has. A group button sitting beside
    // a shell button and behaving differently under a slow press is the drift
    // this component was built to stop, so it keeps the same contract.
    // ⚠️ NO SPINNER AND NO LABEL CHANGE, for the reason written in shell.mjs:
    // both resize the button and the row reflows under the pointer.
    b.addEventListener('click', async () => {
      if (b.disabled) return;
      let out;
      // The button's own handler, or the group's, and never both: a `??` here
      // would run the group's handler as well every time a button's returned
      // nothing, which is most of them.
      const fn = spec.onPress ? () => spec.onPress(b) : (onPress ? () => onPress(spec.id, b) : null);
      if (!fn) return;
      try { out = fn(); }
      catch (e) { console.warn(`button group: "${spec.id}" threw`, e); return; }
      if (!out || typeof out.then !== 'function') return;
      b.dataset.busy = '1';
      b.disabled = true;
      b.setAttribute('aria-busy', 'true');
      try { await out; }
      catch (e) { console.warn(`button group: "${spec.id}" threw`, e); }
      finally {
        delete b.dataset.busy;
        // ⚠️ IT GOES BACK TO WHAT THE CAPABILITY SAID, not to enabled. A press
        // that finishes must not re-open a control this browser cannot use.
        b.disabled = off.has(spec.id);
        b.removeAttribute('aria-busy');
      }
    });

    made.set(spec.id, b);
    row.append(b);
    return b;
  });

  const button = (id) => {
    const b = made.get(id);
    if (!b) throw new Error(`no button "${id}" in this group`);
    return b;
  };

  /**
   * Turn one button on or off, and say why when it goes off.
   *
   * 🔴 THE REASON IS REQUIRED ON THE WAY OFF. A grey control with no
   * explanation reads as a broken page rather than as a browser that cannot do
   * the thing, and this project already answers that question the same way for
   * the index: `caps.mjs` un-links a row WITH the reason in words. Refused here
   * rather than drawn, the way `mount()` refuses an odd readout.
   * ⚠️ THE LOOK IS NOT SET HERE EITHER. `button[disabled] { opacity: .4 }` is in
   * shell.css and is the one disabled appearance in the project.
   */
  function enable(id, yes, reason = '') {
    const b = button(id);
    if (!yes && !String(reason).trim()) {
      throw new Error(`"${id}" was disabled with no reason to show for it`);
    }
    if (yes) off.delete(id); else off.add(id);
    b.disabled = !yes;
    if (reason) b.title = reason;
    else b.removeAttribute('title');
  }

  return {
    el: wrap,
    buttons: els,
    button,
    enable,
    enabled: (id) => !button(id).disabled,
    enableAll: (yes, reason) => { for (const id of made.keys()) enable(id, yes, reason); },
  };
}
