// demo/shell/strip.mjs: thin wrapper over timeline/strip.mjs, which is the strip. It adds the
// three sanctioned sizes, <positron-strip> for teardown, and the hover footer glued under it.
// Custom drawing goes through registerRenderer(); do not fork the strip.
// why: lessons/kit-strip.md#header

import { createStrip } from '/timeline/strip.mjs';
import { el } from './shell.mjs';
import { createGlue } from './glue.mjs';

export const SIZES = { mini: 'strip-mini', default: 'strip', deep: 'strip-deep', auto: 'strip-auto' };

/**
 * An opt-in floor for an `auto` strip, in pixels, passed as `minHeight` (/stage/'s archive).
 * Not a default: measured auto strips run 44 to 116 px and /kit/'s 44 px is deliberate.
 * why: lessons/kit-strip.md#strip-min-h
 */
export const STRIP_MIN_H = 150;

/**
 * The floor every `auto` strip gets unless a page says otherwise. It goes into `minHeight`
 * because an auto strip writes an inline `canvas.style.height`, which beats any CSS rule.
 * why: lessons/kit-strip.md#strip-auto-min
 */
export const STRIP_AUTO_MIN = 88;

/** One token, read once, with the library's own fallback if there is no
 *  stylesheet. `grain-scope.mjs` reads the same `--dim2` for the same marks,
 *  which is what makes a loop on the wave and a loop on the line one picture
 *  rather than two greys that happen to be close. */
function tok(name, fallback) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  } catch { return fallback; }
}

// ── what you are pointing at, under the strip rather than over it ────────
// A box under the strip, so a finger never covers the marks it is reading. Fixed height,
// never `min-height`, set in shell.css from this file's line count; it keeps its height empty.
// why: lessons/kit-strip.md#footer

/** How many lines it reserves. Two is the tooltip's own budget, and a strip
 *  whose lanes say more than that says it in the first two. */
export const STRIP_FOOTER_LINES = 2;

/**
 * What it says with nothing under the pointer: nothing, like an empty readout cell. Exported
 * because a page may pass its own `empty` and /kit/ asserts this value.
 * why: lessons/kit-strip.md#footer-empty
 */
export const STRIP_FOOTER_EMPTY = '';

/**
 * @param {object} [o]
 * @param {number} [o.lines]  how many to reserve and clip to
 * @param {string} [o.empty]  the first line when there is no hit
 * @returns {{el: Element, set: (hit: object|null) => void, lines: number,
 *            says: () => string[]}}
 */
export function createStripFooter({ lines = STRIP_FOOTER_LINES, empty = STRIP_FOOTER_EMPTY } = {}) {
  const n = Math.max(1, Math.round(lines));
  const box = el('div', 'pos-strip-foot');
  // One number, handed to the stylesheet rather than typed there as well. A
  // shared measurement in two files is a measurement that will disagree.
  box.style.setProperty('--sf-lines', String(n));
  const rows = [];
  for (let i = 0; i < n; i++) { const r = el('div'); box.append(r); rows.push(r); }

  /**
   * Takes the strip's own `hit`, whose lines `describe` already builds; a lane changes the
   * words with `describeRow` or `describeHit`.
   * why: lessons/kit-strip.md#footer-set
   */
  function set(hit) {
    const src = hit ? (hit.detail || hit.lines || String(hit.text || '').split('\n')) : [];
    const text = src.map((l) => (typeof l === 'string' ? l : String(l?.text ?? '')));
    for (let i = 0; i < rows.length; i++) {
      rows[i].textContent = i === 0 ? (text[0] ?? empty) : (text[i] ?? '');
    }
    box.dataset.on = text.length ? '1' : '';
  }
  set(null);

  return { el: box, set, lines: n, says: () => rows.map((r) => r.textContent) };
}

/**
 * @param {object} [o]
 * @param {boolean|object} [o.footer]  `true`, or the options `createStripFooter`
 *   takes. A footer is glued under the canvas so the two read as one surface.
 * A strip with a footer draws no tooltip unless the caller also passes `tooltip: true`.
 * why: lessons/kit-strip.md#create-strip-view
 */
export function createStripView(host, deck, { size = 'default', lanes = [], footer = false, ...opts } = {}) {
  const cls = SIZES[size] || SIZES.default;
  const canvas = el('canvas', `pos-strip ${cls}`);
  const foot = footer ? createStripFooter(footer === true ? {} : footer) : null;
  // ⚠️ `createGlue` OF ONE BLOCK IS THAT BLOCK, so a strip with no footer is
  // appended exactly as it always was and no page gains an edge.
  const surface = foot ? createGlue(canvas, foot.el) : canvas;
  host.append(surface);

  // The page's own hover handler still runs, and runs SECOND, so a page that
  // wants both a footer and its own readout gets both.
  const pageHover = opts.onHover;

  // gutter narrows with the sanctioned sizes; mini has no room for labels
  const strip = createStrip(canvas, deck, {
    gutter: size === 'mini' ? 0 : undefined,
    // 'auto' means the canvas takes exactly the height its lanes need, and
    // follows them when a lane is added or removed at runtime
    autoHeight: size === 'auto' || undefined,
    // ⚠️ BEFORE THE SPREAD, so a page that passes its own `minHeight` still
    // wins. `/stage/` passes STRIP_MIN_H and must keep it.
    minHeight: size === 'auto' ? STRIP_AUTO_MIN : undefined,
    ...opts,
    // ⚠️ AFTER THE SPREAD, NEVER BEFORE IT. `...opts` carries the caller's own
    // `tooltip` and `onHover`, so these two would be overwritten by the values
    // they are meant to replace.
    ...(foot ? {
      tooltip: opts.tooltip === true,
      onHover: (hit) => { foot.set(hit); if (pageHover) pageHover(hit); },
    } : {}),
    // The page's theme wins; otherwise the loop grey of the waveform, and a quietened lane dims
    // by the kit's `--ctl-off`.
    // why: lessons/kit-strip.md#theme
    theme: { loop: tok('--dim2', '#6a7280'), off: Number(tok('--ctl-off', '0.55')) || 0.55, ...(opts.theme || {}) },
  });
  if (lanes.length) strip.setLanes(lanes);
  // so a harness or a shot can reach the strip behind any canvas on a page
  canvas._strip = strip;

  return {
    el: canvas,
    /** The canvas, or the glued box holding it and the footer. What a page
     *  would move, hide or measure as one object. */
    surface,
    strip,
    /** The footer, or null. `footer.set(hit)` is already wired to the strip. */
    footer: foot,
    destroy() {
      try { strip.dispose?.(); } catch { /* already gone */ }
      surface.remove();
    },
  };
}

class PositronStrip extends HTMLElement {
  #view = null;
  set deck(d) {
    this.#view?.destroy();
    this.#view = d ? createStripView(this, d, {
      size: this.getAttribute('size') || 'default',
      lanes: this.#lanes,
    }) : null;
  }
  set lanes(l) { this.#lanes = l || []; if (this.#view) this.#view.strip.setLanes(this.#lanes); }
  get strip() { return this.#view?.strip ?? null; }
  disconnectedCallback() { this.#view?.destroy(); this.#view = null; }
  #lanes = [];
}
if (!customElements.get('positron-strip')) customElements.define('positron-strip', PositronStrip);
