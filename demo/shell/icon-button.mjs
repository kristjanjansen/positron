// demo/shell/icon-button.mjs, a square button whose face is one icon.
//
// 🔴 ASKED 2026-10-10: *"Use transport icons on all our concepts. Keep them
// square. Kit iconbutton (group?)"*. The concept pages drew their play, stop
// and record as font glyphs (► ■ ●) and centred them with `symbol.mjs`, which
// measures each glyph's ink in whatever face arrived. An icon from `icons.mjs`
// is a drawn picture on a 24 unit grid in `currentColor`, so it has no advance
// and no baseline to correct and the box IS the picture: centring the svg
// centres the ink.
//
// ⚠️ THE SQUARE IS THE KIT'S SQUARE, NOT A NEW ONE. `data-glyph="1"` is what
// `shell.css` already makes 34 px, and `pos-sm` with it is `--ctl-sm`. No pixel
// here is a size of the button; the only numbers are the icon's own, 16 in the
// big square and 14 in the small one, the pair `/kit/icons/`'s IN A BUTTON
// block measured centred to the hundredth.
//
// ⚠️ THE NAME IS THE LABEL, ALWAYS. A picture is not a name, so `label` is
// required and becomes `aria-label` and `title`; the svg is aria-hidden. A
// missing label throws, and so does an unknown icon, BEFORE the face changes,
// so a bad swap leaves the old face standing rather than an empty square.
//
// 🔴 THE GROUP IS `createButtonGroup`, GIVEN AN `icon` PER BUTTON, AND NOT A
// SECOND GROUP COMPONENT. The join, the busy sweep, the disabled-with-a-reason
// rule and the harness contract all live there already, and the concept pages
// already build their transports with it. A `createIconButtonGroup` would be a
// second copy of all four. `setIcon` below is the one function both use, and
// it also re-faces a button somebody else built, which is how a transport
// bar's `extras` button wears an icon without the bar changing.

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
