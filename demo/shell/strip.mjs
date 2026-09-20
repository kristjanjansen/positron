// demo/shell/strip.mjs — thin wrapper over timeline/strip.mjs.
//
// createStrip() is already THE strip (its own header records being hand-drawn
// five times before it existed, with none of the five agreeing). This file adds
// exactly three things and nothing else:
//   1. the three sanctioned sizes, so height is not a per-page decision
//   2. <positron-strip>, for disconnectedCallback teardown
//   3. the footer that says what is under the pointer, glued under the strip
//
// Any custom drawing goes through registerRenderer() from timeline/strip.mjs.
// Do not fork the strip.

import { createStrip } from '/timeline/strip.mjs';
import { el } from './shell.mjs';
import { createGlue } from './glue.mjs';

export const SIZES = { mini: 'strip-mini', default: 'strip', deep: 'strip-deep', auto: 'strip-auto' };

/**
 * A floor for an `auto` strip, in pixels, passed as `minHeight`.
 *
 * 🔴 ASKED FOR ON ONE PAGE AND DELIBERATELY NOT MADE A RULE. 2026-09-18:
 * *"Make archive timeline 3x higher"*, then *"Ita ok to have empty space in
 * timelime, def min height"*, then *"No rule just min height"*. `/stage/`'s
 * archive strip MEASURED 50 px with its one lane, so three times it is 150.
 * ⚠️ IT IS OPT-IN, AND THE MEASUREMENT IS WHY. Every `auto` strip in the
 * project was measured before deciding: kit 44, stage 50, draw 68, lanes 72,
 * instrument 100, click 104, loops 116. A blanket floor at 150 would have
 * reshaped all seven, and `/kit/`'s 44 px specimen is 44 px ON PURPOSE. A
 * default that changes six pages nobody asked about is not a default.
 */
export const STRIP_MIN_H = 150;

/**
 * The floor EVERY `auto` strip gets unless a page says otherwise.
 *
 * 🔴 DOUBLED FROM 44 ON 2026-09-20: *"timeline should be higher 2x even when no
 * lanes nu default"*, then *"i still do not see higher default h for
 * timeline"*, because the first attempt was made in the wrong place.
 * ⚠️ **IT CANNOT BE DONE IN CSS AND THAT WAS THE FIRST MISTAKE.** An `auto`
 * strip writes `canvas.style.height` from `S.contentH` on every layout, and an
 * INLINE STYLE BEATS EVERY STYLESHEET RULE. A `.strip-auto { height: 88px }`
 * was added, changed nothing, and read as correct in the source. That is this
 * project's fourth-dead-rule pattern exactly, and the repair is the same one
 * `video-panel.mjs` needed: go to where the value is COMPUTED, which is
 * `S.contentH = Math.max(y, opts.minHeight || 0)`.
 * ⚠️ IT IS A FLOOR RATHER THAN A HEIGHT, so it moves only the strips that were
 * under it. Measured before it went in: kit 44, stage 50, draw 68, lanes 72,
 * instrument 100, click 104, loops 116. Four move and three do not.
 * ⚠️ AND IT IS SEPARATE FROM `STRIP_MIN_H` ABOVE, which is 150, opt-in, and was
 * deliberately refused as a default because it would have reshaped seven pages
 * nobody asked about. That refusal stands. This is a different number answering
 * a different question, and it was asked for directly.
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

/* ── what you are pointing at, under the strip rather than over it ────────
   🔴 ASKED 2026-09-19 WITH A PHOTOGRAPH OF `/reel/` ON AN IPHONE: *"add feature
   to timeline: footer section, looks like glued that shows hovered info below
   timeline"*. What the photograph shows is the sticky tap tooltip covering the
   right half of the strip, four lines deep, one of them cut mid word, over the
   marks it is describing.

   The trade it removes is already written down twice in `timeline/strip.mjs`: a
   tooltip is drawn ON TOP of the thing it describes, so it gets two or three
   short lines and never a sentence, and a finger has no hover, so on touch it
   has to be STICKY, which means a finger that is still down covers the thing it
   is describing. A box UNDER the strip is the way out of that trade rather than
   a nicer tooltip.

   🔴 FIXED HEIGHT, NEVER `min-height`, AND THAT IS THE RULE IT LIVES UNDER. It
   is written on every hover change, so a box that grows a line as the finger
   moves pushes the whole page while somebody is reading it. That is the measured
   `grain-scope` defect and the reason `/floor/`'s caption is a fixed box too:
   reserve the tallest it can be, and clip. The height is declared once, in
   `shell.css`, from the line count this file hands it, so the two cannot
   disagree.

   ⚠️ AND IT SAYS SO WHEN NOTHING IS UNDER THE POINTER, rather than collapsing.
   An empty box that keeps its height is the readout's own rule, and a box that
   vanishes takes the page with it. */

/** How many lines it reserves. Two is the tooltip's own budget, and a strip
 *  whose lanes say more than that says it in the first two. */
export const STRIP_FOOTER_LINES = 2;

/** What it says with nothing under the pointer. A statement rather than an
 *  instruction: a gutter carries what it measured, never what to press. */
/**
 * 🔴 EMPTY, ASKED FOR 2026-09-20: *"rm 'nothing under the pointer'"*. It read
 * `nothing under the pointer`, which is a box explaining that it is a box. The
 * footer keeps its height whether it is saying four things or nothing, so the
 * reserved space already says a reading will appear here, and a sentence
 * repeating that is one more thing to read every time the pointer leaves.
 * ⚠️ IT IS THE SAME RULE AS A READOUT CELL, which renders `''` rather than a
 * placeholder, for the reason written there: a cell does not have to show that
 * it is a cell, because the key above it and the box around it already say so.
 * ⚠️ IT IS STILL AN EXPORTED CONSTANT rather than an inline `''`, because a
 * page that wants to say something in the empty state passes its own `empty`,
 * and `/kit/` asserts against this value.
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
   * ⚠️ IT TAKES THE STRIP'S OWN `hit`, not a string a page assembles. `describe`
   * already builds the lines, in the order the strip thinks matters, and a page
   * that re-wrote them would drift from the tooltip it replaces. A lane that
   * wants different words says so with `describeRow` or `describeHit`, which is
   * where that decision already lives.
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
 *
 * 🔴 A STRIP WITH A FOOTER DRAWS NO TOOLTIP, AND THAT IS THE DECISION. The two
 * would say the same thing twice, once next to the pointer and once under the
 * picture, and the ask was to stop drawing it over the marks it describes. A
 * caller that really wants both passes `tooltip: true` as well, and then the
 * footer carries the long half: it has the room for the title and the series,
 * while the tooltip stays inside its own two-or-three-line budget.
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
    // the page's own theme still wins, and a page that says nothing gets the
    // loop grey the waveform already uses
    theme: { loop: tok('--dim2', '#6a7280'), ...(opts.theme || {}) },
  });
  if (lanes.length) strip.setLanes(lanes);

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
