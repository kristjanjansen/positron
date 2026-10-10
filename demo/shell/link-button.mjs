// demo/shell/link-button.mjs: a button that reads as a link.
//
//   const more = createLinkButton({ label: 'See details', onPress: () => open() });
//   head.append(title, more.el);
//
// Asked 2026-10-10: *"create linkbutton component, but it next to patchbay
// comppnent title See details"*. It is a real `<button>`, because what it does
// is an action on this page (open a panel), not a navigation, and a button is
// what a keyboard and a screen reader expect for that. It only LOOKS like a
// link: no face, no border, no box, the words underlined, so it can sit in a
// line of text beside a heading without becoming a second control row.
// ⚠️ STYLED IN `shell.css` (`button.pos-linkbtn`), beside the small button,
// like every other control; this file draws nothing of its own.
// ⚠️ `expanded` IS FOR A BUTTON THAT SHOWS AND HIDES SOMETHING: it sets
// `aria-expanded`, so a screen reader says whether the thing is open.

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
