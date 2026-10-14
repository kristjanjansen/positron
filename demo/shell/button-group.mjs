// demo/shell/button-group.mjs: two or more action buttons sharing one label and one joined row.
// Not a choice: no `aria-pressed`, full size buttons, verbs. Mount inside `.pos-controls` so the
// harnesses press it. It owns disabled (`enable(id, yes, reason)`); `icon` gives a square icon button.
// why: lessons/kit-button-group.md#header

import { el } from './shell.mjs';
import { setIcon as faceIcon } from './icon-button.mjs';

/**
 * @param {object} o
 * @param {string} [o.label]   shown before the row, uppercased by CSS
 * @param {Array<{id: string, label: string, aria?: string, title?: string, icon?: string,
 *                primary?: boolean, onPress?: (btn: HTMLButtonElement) => any}>} o.buttons
 *                `icon` makes it the kit's square icon button, named by `label`
 * @param {(id: string, btn: HTMLButtonElement) => any} [o.onPress]  fires for any button
 * @param {'row'|'column'} [o.orient]  which way the buttons run, default across;
 *                     `column` stacks them, the join and the corners turning with
 *                     them, the way `createChoice` stands up
 * @returns {{el: HTMLElement, buttons: HTMLButtonElement[],
 *            button: (id: string) => HTMLButtonElement,
 *            enable: (id: string, yes: boolean, reason?: string) => void,
 *            enabled: (id: string) => boolean,
 *            enableAll: (yes: boolean, reason?: string) => void,
 *            setIcon: (id: string, name: string, label: string) => void}}
 */
export function createButtonGroup({ label, buttons = [], onPress, orient = 'row' } = {}) {
  // A group with nothing in it is a label pointing at an empty row, which is
  // the kind of control that reads as a page that failed to render. Say so
  // here, where the author is, rather than drawing it.
  if (!buttons.length) throw new Error('a button group needs at least one button');

  const wrap = el('span', 'pos-bgroup');
  // a vertical group, for a slide
  // why: lessons/kit-button-group.md#orient
  if (orient === 'column') wrap.dataset.orient = 'column';
  if (label) wrap.append(el('span', 'pos-bgroup-l', label));
  // `step pos-seg` is the join from shell.css, reused as `choice.mjs` and `stepper.mjs` do.
  // why: lessons/kit-button-group.md#join
  const row = el('span', 'step pos-seg pos-bgroup-row');
  wrap.append(row);

  const made = new Map();
  // Which ids are off, and why, held here because busy borrows `disabled`.
  // Declared above the loop that closes over it.
  // why: lessons/kit-button-group.md#off
  const off = new Set();

  const els = buttons.map((spec) => {
    // A repeated id is refused: `button(id)` would only ever find the first.
    // why: lessons/kit-button-group.md#repeated-id
    if (made.has(spec.id)) throw new Error(`two buttons in one group share the id "${spec.id}"`);

    // No `aria-pressed` anywhere: it is the choice's channel and would paint an armed tint.
    // why: lessons/kit-button-group.md#no-aria-pressed
    const b = el('button', spec.primary ? 'pos-pri' : '', spec.icon ? '' : spec.label, { type: 'button' });
    b.dataset.id = spec.id;
    if (spec.aria) b.setAttribute('aria-label', spec.aria);
    if (spec.title) b.title = spec.title;
    if (spec.icon) faceIcon(b, spec.icon, spec.label);

    // Same contract as the shell's row for a promise: disabled while it runs, swept by the busy
    // highlight. No spinner and no label change, which would resize the button.
    // why: lessons/kit-button-group.md#busy
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
        // Back to what the capability said, not to enabled.
        // why: lessons/kit-button-group.md#after-busy
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
   * Turn one button on or off. The reason is required on the way off, or it reads as broken.
   * The look is `button[disabled]` in shell.css.
   * why: lessons/kit-button-group.md#enable
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
    setIcon: (id, name, label) => { faceIcon(button(id), name, label); },
  };
}
