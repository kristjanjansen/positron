// demo/shell/link-button.mjs: a real `<button>` (an action, not a navigation) that looks
// like a link. Styled in shell.css (`button.pos-linkbtn`); `expanded` sets aria-expanded.
//   const more = createLinkButton({ label: 'See details', onPress: () => open() });
// why: lessons/kit-link-button.md#header

import { el } from './shell.mjs';

/**
 * @param {object} o
 * @param {string} o.label         the words, sentence case
 * @param {Function} [o.onPress]   on a press
 * @param {boolean} [o.expanded]   set to make it a disclosure (aria-expanded)
 * @param {string} [o.title]
 */
export function createLinkButton({ label, onPress = () => {}, expanded, title } = {}) {
  if (!label) throw new Error('a link button needs words');
  const b = el('button', 'pos-linkbtn', label, { type: 'button' });
  if (title) b.title = title;
  if (expanded !== undefined) b.setAttribute('aria-expanded', String(!!expanded));
  b.addEventListener('click', () => onPress());
  return {
    el: b,
    /** New words, for a disclosure that says Hide once open. */
    label(t) { b.textContent = t; },
    expanded(v) { b.setAttribute('aria-expanded', String(!!v)); },
  };
}
