// demo/shell/code-box.mjs: a code box with coloured syntax. It wraps `createField`: the person types
// into the real textarea, and a `<pre>` mirror behind it copies every metric off its computed style
// (inline, `aria-hidden`). `set()` fires no `input` event; a direct write needs `box.paint()`.
// why: lessons/kit-code-box.md#header

import { el } from './shell.mjs';
import { createField } from './field.mjs';
import { render, langOf } from './code-lang.mjs';

/** Every property that decides where a glyph lands. */
const METRICS = ['font-family', 'font-size', 'font-weight', 'font-style', 'font-stretch',
  'font-variant-ligatures', 'font-kerning', 'font-feature-settings', 'font-variation-settings',
  'line-height', 'letter-spacing', 'word-spacing', 'tab-size', 'text-indent', 'text-transform',
  'white-space', 'overflow-wrap', 'word-break', 'hyphens', 'box-sizing',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
  'text-rendering', '-webkit-font-smoothing'];

/**
 * @param {object} o
 * @param {string|object} o.language  'faust' | 'sclang' | 'csound-sco', or a table
 * @param {string} [o.value]
 * @param {number} [o.rows]    the box is this many lines tall, then it scrolls
 * @param {string} [o.label]   as createField: '' builds no caption
 * @param {string} [o.ariaLabel]  the name a screen reader hears; say what the program is
 * @param {(text: string) => void} [o.onInput]
 * @param {{hueOf: (n: string) => number|null, onChange?: (f: () => void) => void}} [o.hues]
 *   a book from `createHueBook()`, shared with the knob row
 */
export function createCodeBox({ language, value = '', rows = 12, label = '', ariaLabel = '',
                                onInput, hues = null } = {}) {
  const lang = langOf(language);
  if (!(rows > 1)) throw new Error('createCodeBox: rows has to be more than one, a code box is many lines');
  const field = createField({ label, rows, code: true, value, onInput });
  const ta = field.input;
  if (ariaLabel) ta.setAttribute('aria-label', ariaLabel);
  field.el.classList.add('pos-code');

  const scroll = el('div', 'pos-code-scroll');
  const ink = el('pre', 'pos-code-ink', null, { 'aria-hidden': 'true' });
  ta.replaceWith(scroll);
  scroll.append(ink, ta);

  let params = [], renders = 0, lastMs = 0;
  const active = new Set();
  const hueOf = (n) => (hues ? hues.hueOf(n) : null);

  // A box with no width yet (in a closed tab) is not measured; the ResizeObserver fires once laid out.
  // why: lessons/kit-code-box.md#laidout
  const laidOut = () => scroll.isConnected && scroll.clientWidth > 0;

  function copyMetrics() {
    if (!laidOut()) return;
    const cs = getComputedStyle(ta);
    for (const p of METRICS) ink.style.setProperty(p, cs.getPropertyValue(p));
    ink.style.borderColor = 'transparent';
    const px = (k) => parseFloat(cs.getPropertyValue(k)) || 0;
    const lh = px('line-height') || px('font-size') * 1.45;
    scroll.style.setProperty('--code-max', `${rows * lh + px('padding-top') + px('padding-bottom')
      + px('border-top-width') + px('border-bottom-width')
      + (scroll.offsetHeight - scroll.clientHeight)}px`);
  }

  function fit() {
    if (!laidOut()) return;
    // The pre keeps its old height while the textarea is measured, so the
    // scroller's content does not shrink under it and its scrollTop survives.
    ta.style.setProperty('--code-h', 'auto');
    const h = ta.scrollHeight + (ta.offsetHeight - ta.clientHeight);
    ta.style.setProperty('--code-h', `${h}px`);
    ink.style.height = `${h}px`;
  }

  function paint() {
    const t0 = performance.now();
    const r = render(ta.value, lang, { hueOf, active });
    // A textarea ending in a newline shows an empty last line and a pre drops
    // it, so the heights would disagree by a line. One space keeps it.
    const tail = ta.value === '' || ta.value.endsWith('\n') ? ' ' : '';
    ink.innerHTML = r.html + tail;
    params = r.params;
    renders++;
    fit();
    lastMs = performance.now() - t0;
  }

  const refit = () => { copyMetrics(); paint(); };
  ta.addEventListener('input', paint);
  new ResizeObserver(refit).observe(scroll);
  new MutationObserver(refit).observe(field.el, { attributes: true, attributeFilter: ['class', 'style'] });
  document.fonts?.ready.then(refit);
  hues?.onChange?.(paint);
  copyMetrics();
  paint();

  return {
    el: field.el,
    input: ta,
    ink,
    scroller: scroll,
    language: lang.name,
    value: () => ta.value,
    set(v) { ta.value = v ?? ''; paint(); },
    /** Repaint from the textarea, for a page that wrote `input.value` itself. */
    paint,
    refit,
    /** The parameters found by the last paint, `[{ name, from, to, kind }]`. */
    params: () => params.map(({ name, from, to, kind }) => ({ name, from, to, kind })),
    /** Raise one parameter's tint while its knob is held. */
    mark(name, on) {
      if (on) active.add(name); else active.delete(name);
      for (const s of ink.querySelectorAll('.pos-tk-p, .pos-tk-pvar')) {
        if (s.dataset.param !== name) continue;
        if (on) s.dataset.active = '1'; else delete s.dataset.active;
      }
    },
    disabled: field.disabled,
    stats: () => ({ renders, lastMs }),
  };
}
