// demo/shell/strip.mjs — thin wrapper over timeline/strip.mjs.
//
// createStrip() is already THE strip (its own header records being hand-drawn
// five times before it existed, with none of the five agreeing). This file adds
// exactly two things and nothing else:
//   1. the three sanctioned sizes, so height is not a per-page decision
//   2. <positron-strip>, for disconnectedCallback teardown
//
// Any custom drawing goes through registerRenderer() from timeline/strip.mjs.
// Do not fork the strip.

import { createStrip } from '/timeline/strip.mjs';
import { el } from './shell.mjs';

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

export function createStripView(host, deck, { size = 'default', lanes = [], ...opts } = {}) {
  const cls = SIZES[size] || SIZES.default;
  const canvas = el('canvas', `pos-strip ${cls}`);
  host.append(canvas);

  // gutter narrows with the sanctioned sizes; mini has no room for labels
  const strip = createStrip(canvas, deck, {
    gutter: size === 'mini' ? 0 : undefined,
    // 'auto' means the canvas takes exactly the height its lanes need, and
    // follows them when a lane is added or removed at runtime
    autoHeight: size === 'auto' || undefined,
    ...opts,
    // the page's own theme still wins, and a page that says nothing gets the
    // loop grey the waveform already uses
    theme: { loop: tok('--dim2', '#6a7280'), ...(opts.theme || {}) },
  });
  if (lanes.length) strip.setLanes(lanes);

  return {
    el: canvas,
    strip,
    destroy() {
      try { strip.dispose?.(); } catch { /* already gone */ }
      canvas.remove();
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
