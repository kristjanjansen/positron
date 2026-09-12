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
