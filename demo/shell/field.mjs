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
//
// 🔴 `rows` MAKES IT A TEXTAREA, AND THAT IS ONE COMPONENT RATHER THAN TWO.
// The feedback box beside every demo title needs four rows of prose, and the
// kit had no multi-line field at all. The two ways out were a private textarea
// inside that one module — which is precisely the "control that lives in one
// page and nowhere else" this file's own header calls a component nobody has
// noticed yet — or one more option here. A field is a labelled box you type
// into; how many lines it holds is a property of the box, not a second kind of
// thing.
//
// ⚠️ IT ALSO FLIPS THE BROWSER'S HELP, and that is the point of the option
// rather than an oversight. A one-line field here holds a VALUE that has to
// round-trip — a room name, a URL, an id — so autocorrect, autocapitalize and
// spellcheck are off, because a browser that silently rewrites the value breaks
// it. A four-line field holds PROSE written by a person, where sentence
// capitals and a spell checker are the whole reason those features exist.
//
// 🔴 `code: true` IS THE THIRD CASE, AND IT EXISTS BECAUSE THE SECOND ONE IS
// WRONG FOR IT. A box holding a PROGRAM is neither of the two above: it is many
// lines, and it still has to round-trip exactly. `/fau/` compiles what is in
// the box, so `autocapitalize: sentences` turning `os.osc` into `Os.osc` at the
// start of a line on a phone is a compile error the visitor did not type, and a
// spelling underline under every identifier is noise on the one thing they came
// to read. It takes the one-line field's attributes with the tall field's
// shape, and brings back the mono face that `rows` gave up when it became prose.

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
 * @param {number} [o.rows]       more than one makes it a textarea of that many
 *                                lines, and turns the browser's writing help ON
 * @param {boolean} [o.code]      with `rows`, the box holds a program: mono
 *                                face, and the writing help stays OFF
 * @param {(value:string)=>void} [o.onInput]
 * @returns {{el:HTMLElement, input:HTMLInputElement|HTMLTextAreaElement,
 *            value:()=>string, set:(v:string)=>void, disabled:(v:boolean)=>void}}
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
