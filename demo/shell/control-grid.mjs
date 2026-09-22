// demo/shell/control-grid.mjs — controls on a square lattice, any count by any.
//
// 🔴 THE ASK, 2026-09-22, WITH A CROP OF FOUR KNOBS: *"make component for know
// etc grid where centers of 2x2 knobs make square etc"*, and then *"it can be
// any x y count of elements, right?"*. Yes, and the arithmetic is the same
// whatever the counts are.
//
// 🔴 WHY A ROW OF KNOBS AND A COLUMN OF KNOBS DO NOT AGREE BY THEMSELVES. A
// control is a working surface and furniture: `--ctl-head` above it and
// `--ctl-foot` below, which `shell.css` declares and `positron-ui` calls the
// contract. So the distance between two dial centres ACROSS is the dial's width
// plus one gap, and the distance DOWN is the dial's height plus the value line
// plus the label plus the sub plus one gap. On `/plai/` that was 46 px across
// and about 100 down, so four knobs made a tall rectangle and were reported as
// one.
//
// ✅ **THE FIX IS TO WIDEN THE COLUMN PITCH TO MATCH THE ROW PITCH, NEVER TO
// SHRINK THE ROW.** Cutting the furniture is cutting the value readout or the
// label, and both are the only things naming what the control does. A knob
// narrow enough to make the square by shrinking is the one `positron-ui`
// already refuses: *"a pad narrow enough to fit a phone is one nobody can
// hit"*, one component along.
//
// ⚠️ **AND THE DIAL'S OFFSET INSIDE ITS CELL DOES NOT MATTER**, which is what
// makes this cheap. A dial sits high in its cell, under the value and above the
// label. It sits at the SAME height in every cell, so equal pitches put the
// centres on a square lattice whatever that offset is. Nothing here has to know
// where the dial is.
//
// 🔴 **THE PITCH IS MEASURED, NOT TYPED.** A row's height is whatever the
// labels come to, a sub that wraps changes it, and a caller who typed a number
// would be typing a guess that goes stale the first time a label grows. This
// reads the first cell back off the page and writes `--cg-pitch`, which is the
// same arrangement `step-grid.mjs` uses for `--pg-cell` and for the same
// reason: the token is written from script because no stylesheet can know it.
// ⚠️ A CUSTOM PROPERTY AND NEVER THE PROPERTY, so a page can still take it
// back. `video-panel.mjs` wrote `style.aspectRatio` from an option and left one
// page's picture square on a 16:9 screen.

import { el } from './shell.mjs';

let sheeted = false;

/** The one stylesheet, injected once, the way `wave-view.mjs` and `xy-pad.mjs` do. */
function ensureCss() {
  if (sheeted || document.getElementById('pos-cg-css')) { sheeted = true; return; }
  const s = el('style');
  s.id = 'pos-cg-css';
  s.textContent = `
.pos-cg { display: grid; justify-content: start; align-items: start; }
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
 * The pitch two centres should sit at, given a cell's natural size and a gap.
 *
 * 🔴 PURE AND EXPORTED SO IT CAN BE GRADED WITH NO BROWSER, which is the half
 * of this component that has arithmetic in it. Everything else needs a layout.
 * ⚠️ IT TAKES THE LARGER OF THE TWO AND NEVER THE AVERAGE. A square whose side
 * is the mean of a wide cell and a tall one fits neither: the tall content
 * overflows its cell and the wide content is clipped. The lattice is as big as
 * its biggest cell needs.
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
   * 🔴 REFUSED RATHER THAN GUESSED, FOR THE REASON `knob.mjs` REFUSES A KNOB
   * WITH NO LABEL. A grid that picked its own column count would pick a
   * different one as the list grew, so the shape would be a property of how
   * many controls a page happened to have rather than a decision anybody made.
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
   * Measure one cell and write the pitch both tracks use.
   *
   * ⚠️ **THE WIDEST AND THE TALLEST, NOT THE FIRST.** A row of knobs whose
   * labels are `FM` and `HARMONICS` has two different widths, and sizing the
   * lattice off cell zero would clip whichever cell is bigger than it. This
   * walks them.
   * ⚠️ AND IT RETURNS THE NUMBERS RATHER THAN LOGGING THEM, so a check can ask
   * what it decided instead of reading pixels back and hoping.
   */
  function size() {
    let w = 0, h = 0;
    for (const c of cells) {
      // The intrinsic size, with the pitch taken OFF, or the second call would
      // measure the width this function set on the first.
      c.style.width = 'auto';
      const r = c.getBoundingClientRect();
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
     * Where each cell's DIAL sits, which is what the request was about.
     * ⚠️ IT LOOKS FOR A DIAL AND FALLS BACK TO THE CELL, because this grid
     * takes any control and only a knob has one. A check on a grid of faders
     * gets the cell's own centre, which is the same claim one element out.
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
