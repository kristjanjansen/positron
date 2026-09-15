// demo/shell/field.mjs — a labelled line of text you can type into.
//
// 🔴 THE SECOND COPY, WHICH IS WHEN IT BECOMES A COMPONENT. `wire` has carried
// the only text input in this project since it was written — label, dark box,
// mono face, `flex: 1 1 140px` — and `items` needs five of them. A second
// hand-rolled copy is exactly the drift `/kit/` exists to catch, and the kit's
// own note says a control that lives in one page and nowhere else is a
// component nobody has noticed yet. ⚠️ `wire` has NOT been moved onto this yet;
// until it is, there are two implementations and this header is the reason to
// finish the job rather than a record that it was done.
//
// ⚠️ IT WRAPS AND IT NEVER ELLIPSIZES. Same rule as `messages.mjs`: a phone is
// about 45 characters wide, and a control that hides its own content behind an
// ellipsis is in the wrong place rather than in need of a wider box. The field
// grows to the row and the row wraps.
//
// ⚠️ AND IT KEEPS THE iOS LOUPE. `shell.css` sets `-webkit-touch-callout: none`
// on controls because a long press on a piano key raised the magnifier over the
// keys — but a text field is the one control where selecting, magnifying and
// pasting are the POINT. Nothing here turns them off, and `.pos-field input` is
// deliberately outside the selectors that do.

import { el } from './shell.mjs';

/**
 * @param {object} o
 * @param {string} o.label        shown before the box, uppercased by CSS
 * @param {string} [o.value]      what it starts with
 * @param {string} [o.placeholder] shown when it is empty — say what a good
 *                                value looks like, never repeat the label
 * @param {string} [o.grow]       the flex basis: `wide` for a sentence,
 *                                omitted for a word
 * @param {string} [o.type]       'text' | 'url' | 'search' — the KEYBOARD a
 *                                phone raises, which is the only reason to
 *                                use anything but text
 * @param {(value:string)=>void} [o.onInput]
 * @returns {{el:HTMLElement, input:HTMLInputElement, value:()=>string,
 *            set:(v:string)=>void, disabled:(v:boolean)=>void}}
 */
export function createField({ label, value = '', placeholder = '', grow = '',
                              type = 'text', onInput } = {}) {
  const wrap = el('label', `pos-field${grow ? ` ${grow}` : ''}`);
  if (label) wrap.append(el('span', 'pos-field-l', label));
  const input = el('input', '', null, {
    type,
    // A field a browser silently rewrites is a field that does not round-trip.
    autocomplete: 'off', autocorrect: 'off', autocapitalize: 'off', spellcheck: 'false',
  });
  input.value = value;
  if (placeholder) input.placeholder = placeholder;
  if (onInput) input.addEventListener('input', () => onInput(input.value));
  wrap.append(input);

  return {
    el: wrap,
    input,
    value: () => input.value,
    set: (v) => { input.value = v ?? ''; },
    disabled: (v) => { input.disabled = !!v; },
  };
}
