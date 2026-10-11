// demo/concepts/typist/paper.mjs: one sheet of paper, lifted out of
// /concepts/typist/000/ for /concepts/typist/040/, which shows several.
// 000, 010 and 020 still carry their own copy and are unchanged.
//
// ONE BOX, TWO LAYERS PINNED TOGETHER, the way /typist/ does it. The
// <textarea> on top is invisible and takes every keystroke and every tap (so a
// phone opens its keyboard); the <pre> underneath draws the text and a block
// cursor at the offsets the browser reports. Both carry `.tpp-type` and nothing
// else sets a metric on either, or they drift apart by a character.
//
// The sheet is a size container, so its type and its margins follow the sheet
// and not the window: one paper across a desk gets 000's 64 character column
// at up to 20 px, and one of six on a phone gets small type and narrow margins.
//
//   const p = createPaper({ label: 'paper 1', onInput: (e) => ... });
//   host.append(p.el);
//   p.type('a'); p.type('\n'); p.clear();

import { el } from '/shell/shell.mjs';

const CSS = `
  .tpp { position: relative; width: 100%; height: 100%; overflow-y: auto; overscroll-behavior: contain;
         container-type: inline-size; background: #fff; cursor: text;
         /* the margins of a typed page: more air above than at the sides */
         padding: clamp(12px, 7cqi, 72px) clamp(12px, 6cqi, 64px); }
  .tpp-col { position: relative; max-inline-size: 64ch; margin-inline: auto; min-block-size: 100%;
             font: 400 clamp(11px, 3.6cqi, 20px)/1.7 var(--brand); }
  .tpp-type { font: inherit; letter-spacing: 0; font-variant-ligatures: none; tab-size: 4;
              margin: 0; padding: 0; border: 0;
              white-space: pre-wrap; overflow-wrap: break-word; word-break: break-word; }
  .tpp-paper { color: #16161a; min-block-size: 100%; }
  .tpp-keys { position: absolute; inset: 0; width: 100%; height: 100%; display: block;
              resize: none; outline: 0; overflow: hidden; background: transparent;
              color: transparent; caret-color: transparent; -webkit-touch-callout: none; }
  .tpp-keys::selection { background: transparent; }
  /* A FILLED BAR 0.4 CHARACTER WIDE, taking no width in the flow, filled
     whether or not the paper has focus (asked: *\"typist: always filled cursor\"*,
     *\"but thinner\"*). White over the sheet with difference, so it reads black
     and turns what it covers white. Without focus it stays and does not blink. */
  .tpp-cur { position: relative; }
  .tpp-cur::after { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 0.4ch;
                    background: #fff; mix-blend-mode: difference;
                    animation: tpp-blink 1.06s steps(1) infinite; }
  .tpp:not(.on) .tpp-cur::after { animation: none; }
  @keyframes tpp-blink { 0%, 54% { opacity: 1 } 55%, 100% { opacity: 0 } }
  @media (prefers-reduced-motion: reduce) { .tpp-cur::after { animation: none; } }
  .tpp-sel { background: rgba(22, 22, 26, .16); }
`;
let styled = false;

const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

/**
 * @param {object} [o]
 * @param {string} [o.label]    the textarea's accessible name
 * @param {string} [o.text]     what is on the sheet at the start
 * @param {(e: InputEvent) => void} [o.onInput]  a person typed into it
 */
export function createPaper({ label = 'the paper', text = '', onInput = () => {} } = {}) {
  if (!styled) { document.head.append(Object.assign(document.createElement('style'), { textContent: CSS })); styled = true; }
  const sheet = el('div', 'tpp');
  const col = el('div', 'tpp-col');
  const paper = el('pre', 'tpp-type tpp-paper', null, { 'aria-hidden': 'true' });
  // `data-typing` tells verify.mjs to type into this element rather than click it.
  const keys = el('textarea', 'tpp-type tpp-keys', null, {
    spellcheck: 'false', autocomplete: 'off', autocorrect: 'off', autocapitalize: 'sentences',
    'aria-label': label, 'data-typing': 'paper',
  });
  col.append(paper, keys);
  sheet.append(col);

  /** The text, and the cursor or the highlight exactly where the textarea's offsets say. */
  function draw() {
    const t = keys.value;
    const a = keys.selectionStart, b = keys.selectionEnd;
    const mid = a === b ? '<span class="tpp-cur"></span>' : `<span class="tpp-sel">${esc(t.slice(a, b))}</span>`;
    // the zero width space gives a trailing newline a line of its own, as the textarea has
    paper.innerHTML = esc(t.slice(0, a)) + mid + esc(t.slice(b)) + '​';
    follow();
  }

  /** The carriage: keep the cursor's line in view, one line of air under it. */
  function follow() {
    const cur = paper.querySelector('.tpp-cur, .tpp-sel');
    if (!cur) return;
    const s = sheet.getBoundingClientRect(), c = cur.getBoundingClientRect();
    const line = parseFloat(getComputedStyle(col).lineHeight) || 20;
    if (c.bottom + line > s.bottom) sheet.scrollTop += c.bottom + line - s.bottom;
    else if (c.top - line < s.top) sheet.scrollTop -= s.top - (c.top - line);
  }

  const focused = () => document.activeElement === keys;

  keys.addEventListener('input', (e) => onInput(e));
  for (const ev of ['input', 'select', 'keyup', 'pointerup']) keys.addEventListener(ev, draw);
  document.addEventListener('selectionchange', () => { if (focused()) draw(); });
  keys.addEventListener('focus', () => { sheet.classList.add('on'); draw(); });
  keys.addEventListener('blur', () => sheet.classList.remove('on'));
  // A tap in the margins lands on the sheet, not the textarea: focus it, cursor at the end.
  sheet.addEventListener('click', (e) => {
    if (e.target === keys) return;
    keys.focus({ preventScroll: true });
    keys.setSelectionRange(keys.value.length, keys.value.length);
    draw();
  });

  keys.value = text;
  keys.setSelectionRange(text.length, text.length);
  draw();

  return {
    el: sheet, keys, draw, focused,
    get text() { return keys.value; },
    /** Type at the end of the sheet, as a machine does, and move the cursor there. */
    type(s) {
      keys.value += s;
      keys.setSelectionRange(keys.value.length, keys.value.length);
      draw();
    },
    /** A fresh sheet. */
    clear() { keys.value = ''; keys.setSelectionRange(0, 0); sheet.scrollTop = 0; draw(); },
    /** The column the cursor is in on its line, as a typewriter's carriage counts it. */
    column() { const a = keys.selectionStart; return a - (keys.value.lastIndexOf('\n', a - 1) + 1); },
  };
}
