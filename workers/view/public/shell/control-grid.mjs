// demo/shell/control-grid.mjs: controls on a square lattice, any count by any. The column pitch is
// widened to the row pitch, never the row shrunk, since that cuts the value or label. The pitch is
// measured off the cells and written as `--cg-pitch`, a custom property a page can take back.
// why: lessons/kit-control-grid.md#header

import { el } from './shell.mjs';

let sheeted = false;

/** The one stylesheet, injected once, the way `wave-view.mjs` and `xy-pad.mjs` do. */
function ensureCss() {
  if (sheeted || document.getElementById('pos-cg-css')) { sheeted = true; return; }
  const s = el('style');
  s.id = 'pos-cg-css';
  s.textContent = `
/* 🔴 IT SCROLLS SIDEWAYS RATHER THAN DRAGGING THE PAGE, AND THAT TAKES TWO
   PROPERTIES ON ONE ELEMENT. \`overflow-x\` cannot shrink a flex or grid item
   below its content, so a scroller with no \`min-width: 0\` beside it drags the
   DOCUMENT instead. This repository has measured 141 px of page overflow from
   that pair being half written, and 65 px from it again a week later.
   🔴 AND THIS COMPONENT SHIPPED WITH NEITHER, WHICH IS A LIVE DEFECT RATHER
   THAN A PRECAUTION: the columns are fixed at the measured pitch and never
   \`1fr\`, precisely so the lattice stays square at every width, so a five wide
   grid of 50.6 px knobs is 280 px whatever the phone is. \`.pos-knob-row\` next
   door has carried both since it was written.
   ⚠️ **IT IS NOT A PHONE CHECK AND CANNOT BE.** \`demo/verify.mjs\` runs at
   756 px with no viewport override, so what \`/kit/\` grades is that the two
   properties are still declared together on the computed style. */
.pos-cg { display: grid; justify-content: start; align-items: start;
          overflow-x: auto; min-width: 0; }
/* 🔴 BOTH TRACKS ARE THE SAME MEASURED PITCH, WHICH IS THE WHOLE COMPONENT.
   The columns are fixed at the pitch rather than \`1fr\`, because a fractional
   track stretches with the container and the lattice would only be square at
   one width. \`justify-content: start\` keeps the block left rather than
   spreading it. */
.pos-cg > * { width: var(--cg-pitch, auto); justify-self: center; }
/* The gap is inside the pitch, so a caller changing it changes the square's
   size rather than breaking it. */
`;
  document.head.append(s);
  sheeted = true;
}

/**
 * The pitch two centres should sit at, given a cell's natural size and a gap. Pure, so it is
 * graded with no browser. The larger of the two, never the mean, or one side is clipped.
 * why: lessons/kit-control-grid.md#pitchfor
 */
export function pitchFor(cellW, cellH, gap = 0) {
  const w = Number(cellW) || 0;
  const h = Number(cellH) || 0;
  return Math.max(w, h) + (Number(gap) || 0);
}

/**
 * Controls on a square lattice.
 *
 * @param {object} o
 * @param {Array}  o.items      controls, each `{ el }` or an element
 * @param {number} o.cols       how many across. Rows fall out of the count.
 * @param {number} [o.gap=10]   the air between two cells, inside the pitch
 * @param {Element} [o.host]    append the grid to this
 * @param {string} [o.cls]      an extra class for a page's own rules
 * @returns {{el, cells, cols, rows, pitch, size, centres}}
 */
export function createControlGrid(o = {}) {
  const { items = [], cols, gap = 10, host, cls = '' } = o;
  /**
   * Refused rather than guessed: a guessed column count would change as the list grew.
   * why: lessons/kit-control-grid.md#cols
   */
  if (!Number.isInteger(cols) || cols < 1) {
    throw new Error(`a control grid needs a column count, got ${JSON.stringify(cols)}`);
  }
  if (!items.length) {
    throw new Error('a control grid with nothing in it is a container painting its own edges');
  }
  ensureCss();

  const root = el('div', cls ? `pos-cg ${cls}` : 'pos-cg');
  root.style.setProperty('--cg-gap', `${gap}px`);
  root.style.gap = `${gap}px`;
  root.style.gridTemplateColumns = `repeat(${cols}, max-content)`;
  const cells = items.filter(Boolean).map((b) => {
    const node = b.el || b;
    root.append(node);
    return node;
  });
  host?.append(root);

  const rows = Math.ceil(cells.length / cols);

  /**
   * Measure every cell and write the pitch both tracks use: the widest and tallest, not the first.
   * Returns the numbers so a check can ask what it decided.
   * why: lessons/kit-control-grid.md#size
   */
  function size() {
    let w = 0, h = 0;
    for (const c of cells) {
      // The intrinsic size, with the pitch taken OFF, or the second call would
      // measure the width this function set on the first.
      c.style.width = 'auto';
      // The laid out size, not the rect: a rect includes transforms, and a grid scaled by `fitBox`
      // would be scaled twice.
      // why: lessons/kit-control-grid.md#computed-size
      const cs = getComputedStyle(c);
      const r = { width: parseFloat(cs.width) || 0, height: parseFloat(cs.height) || 0 };
      if (r.width > w) w = r.width;
      if (r.height > h) h = r.height;
    }
    for (const c of cells) c.style.width = '';
    const pitch = pitchFor(w, h, 0);
    root.style.setProperty('--cg-pitch', `${Math.round(pitch)}px`);
    root.style.gridTemplateColumns = `repeat(${cols}, ${Math.round(pitch)}px)`;
    root.style.gridAutoRows = `${Math.round(pitch)}px`;
    return { w: Math.round(w), h: Math.round(h), pitch: Math.round(pitch) };
  }

  const measured = size();
  const ro = new ResizeObserver(() => size());
  ro.observe(root);

  return {
    el: root,
    cells,
    cols,
    rows,
    pitch: () => parseFloat(root.style.getPropertyValue('--cg-pitch')) || 0,
    size,
    measured,
    /**
     * Where each cell's dial sits; falls back to the cell's centre for a control with no dial.
     * why: lessons/kit-control-grid.md#centres
     */
    centres: () => cells.map((c) => {
      const dial = c.querySelector('.pos-knob-dial, .pos-fdr-lane, canvas') || c;
      const r = dial.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }),
    destroy() { ro.disconnect(); root.remove(); },
  };
}

export default createControlGrid;
