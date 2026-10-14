// demo/shell/field.mjs: a labelled line of text you can type into. It wraps, never ellipsizes, and
// keeps the iOS loupe. `rows` makes a textarea for prose with the writing help on; `code: true`
// keeps it off for a program that must round-trip, in the mono face.
// why: lessons/kit-field.md#header

import { el } from './shell.mjs';

/**
 * @param {object} o
 * @param {string} o.label        shown before the box, uppercased by CSS
 * @param {string} [o.value]      what it starts with
 * @param {string} [o.placeholder] what a good value looks like, never the label again
 * @param {string} [o.grow]       the flex basis: `wide` for a sentence, omitted for a word
 * @param {string} [o.type]       'text' | 'url' | 'search', the keyboard a phone raises
 * @param {number} [o.rows]       more than one makes a textarea, writing help on
 * @param {boolean} [o.code]      with `rows`, a program: mono face, writing help off
 * @param {(value:string)=>void} [o.onInput]
 * @returns {{el:HTMLElement, input:HTMLInputElement|HTMLTextAreaElement,
 *            value:()=>string, set:(v:string)=>void, disabled:(v:boolean)=>void}}
 * why: lessons/kit-field.md#createfield
 */
export function createField({ label, value = '', placeholder = '', grow = '',
                              type = 'text', rows = 0, code = false, onInput } = {}) {
  const wrap = el('label', `pos-field${grow ? ` ${grow}` : ''}${rows > 1 ? ' tall' : ''}`
                          + `${rows > 1 && code ? ' code' : ''}`);
  if (label) wrap.append(el('span', 'pos-field-l', label));
  const input = rows > 1
    ? el('textarea', '', null, {
        rows: String(rows),
        // prose, so the browser's writing help is the point rather than a risk.
        // Unless it is a program, where every one of those is a rewrite
        autocomplete: 'off',
        autocorrect: code ? 'off' : 'on',
        autocapitalize: code ? 'off' : 'sentences',
        spellcheck: code ? 'false' : 'true',
      })
    : el('input', '', null, {
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
