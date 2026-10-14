// demo/shell/icon-button.mjs: a square button whose face is one icon from icons.mjs. The square is
// the kit's (`data-glyph`, 34 px; `pos-sm`); icon 16 or 14. `label` is required, and a bad icon
// throws before the face changes. Groups are `createButtonGroup` with an `icon` per button.
// why: lessons/kit-icon-button.md#header

import { el } from './shell.mjs';
import { icon, hasIcon } from './icons.mjs';

/** The icon's size in each square. Facts about the picture, not the button. */
const ICON = 16, ICON_SM = 14;

/**
 * Put one icon on an existing button and name it, keeping it square.
 * @param {HTMLButtonElement} b
 * @param {string} name   one of `icons.mjs` NAMES
 * @param {string} label  what the button does, read aloud and shown on hover
 * @param {object} [o]
 * @param {boolean} [o.small]  the 26 px square; read off `pos-sm` when omitted
 */
export function setIcon(b, name, label, { small } = {}) {
  if (!hasIcon(name)) throw new Error(`icon button: no icon called "${name}" in the kit's Feather set`);
  if (!label || !String(label).trim()) throw new Error(`icon button: "${name}" needs a label, because a picture is not a name`);
  const sm = small ?? b.classList.contains('pos-sm');
  b.replaceChildren(icon(name, { size: sm ? ICON_SM : ICON }));
  b.classList.add('pos-icobtn');
  b.dataset.glyph = '1';
  b.dataset.icon = name;
  b.setAttribute('aria-label', label);
  b.title = label;
  return b;
}

/**
 * @param {object} o
 * @param {string} o.icon     one of `icons.mjs` NAMES
 * @param {string} o.label    the accessible name and the hover text
 * @param {(b: HTMLButtonElement) => any} [o.onPress]
 * @param {boolean} [o.small] the `pos-sm` square
 * @param {boolean} [o.pressed] a toggle: writes `aria-pressed`
 * @returns {{el: HTMLButtonElement, set: (name: string, label: string) => void,
 *            pressed: (v?: boolean) => boolean}}
 */
export function createIconButton({ icon: name, label, onPress, small = false, pressed } = {}) {
  const b = el('button', small ? 'pos-sm' : '', '', { type: 'button' });
  setIcon(b, name, label, { small });
  if (onPress) b.addEventListener('click', () => { if (!b.disabled) onPress(b); });
  if (pressed !== undefined) b.setAttribute('aria-pressed', String(!!pressed));
  return {
    el: b,
    set: (n, l) => { setIcon(b, n, l, { small }); },
    pressed: (v) => {
      if (v !== undefined) b.setAttribute('aria-pressed', String(!!v));
      return b.getAttribute('aria-pressed') === 'true';
    },
  };
}
