// demo/shell/glue.mjs: two or more blocks as one surface, `.pos-glue` in shell.css: one border, a
// 1 px `--line` seam, children giving up their own edge. Separate is the default; not a stack,
// which owns the air between blocks. A glue of one block is that block, unwrapped.
// why: lessons/kit-glue.md#header

// This file imports nothing, because `shell.mjs` imports it; `div()` is all that was borrowed.
// why: lessons/kit-glue.md#no-imports
const div = (cls) => {
  const e = document.createElement('div');
  e.className = cls;
  return e;
};

/**
 * Glue blocks into one surface, in the order given.
 *
 * @param {...(Element|{el: Element}|null)} blocks the parts, top to bottom.
 *   `null` and `undefined` are SKIPPED, the same way `createStack().add` skips
 *   them and for the same reason: a page asks for its parts in one call and one
 *   of them is usually conditional, and an `if` around an append is how a block
 *   ends up somewhere else.
 * @returns {Element|null} the surface, the single block itself when only one
 *   survived, or `null` when none did — because a container with nothing in it
 *   must not paint its edges.
 */
export function createGlue(...blocks) {
  const parts = blocks.filter(Boolean).map((b) => b.el || b);
  if (!parts.length) return null;
  if (parts.length === 1) return parts[0];
  const box = div('pos-glue');
  box.append(...parts);
  return box;
}

// ── ROWS: the same surface, built up one row at a time ──
// A row paints its own ground, is a flex box, and hides without leaving a seam.
// Every `.pos-glue > X` patch in shell.css is also `> * > X`.
// why: lessons/kit-glue.md#rows

/** The alignments a row may take. A closed set, because `justify-content` has
 *  values that mean nothing in a row of controls and a typo in a string option
 *  is a layout that silently does not happen. */
export const ROW_ALIGN = ['start', 'center', 'end', 'between'];

/**
 * A glued surface whose rows are added one at a time.
 *
 * @param {object}   [o]
 * @param {string}   [o.cls]    extra classes, for a caller's own rules.
 * @param {boolean}  [o.pad=true]    the default inset for rows of this surface.
 * @param {string}   [o.align='center'] the default alignment for its rows.
 * @param {boolean}  [o.full=false]  take the width given rather than the content's.
 * @param {boolean}  [o.grid=false]  rows are subgrids on two shared columns, label and control.
 * @returns {{el: Element, row: Function, remove: Function, rows: Function,
 *            count: Function}}
 */
export function createGlueRows(o = {}) {
  const { cls = '', pad: padDefault = true, align: alignDefault = 'center', full = false, grid = false } = o;
  if (!ROW_ALIGN.includes(alignDefault)) {
    throw new Error(`createGlueRows: align is one of ${ROW_ALIGN.join(', ')}, not ${JSON.stringify(alignDefault)}`);
  }
  // `full`: the surface takes the width it is given. `grid`: every row is a subgrid on the
  // surface's label and control columns, so rows share one pair of lines.
  // why: lessons/kit-glue.md#full-grid
  const root = div(`pos-glue pos-rows${full ? ' pos-rows-full' : ''}${grid ? ' pos-rows-grid' : ''}${cls ? ` ${cls}` : ''}`);
  /**
   * A surface with no rows is `hidden`, not unappended, so it never renders as an empty rule;
   * the first row clears it.
   * why: lessons/kit-glue.md#empty
   */
  root.hidden = true;
  const list = [];

  /**
   * Add a row, and put things in it.
   * @param {Element|object|Array} [content] an element, anything with an `el`, or an array;
   *   `null` entries are skipped.
   * @param {object} [opt]
   * @param {boolean} [opt.pad]   `false` for a row edge to edge, as a picture wants.
   * @param {string} [opt.align]  one of ROW_ALIGN.
   * @param {string} [opt.cls]    extra classes for this row.
   * @param {Element} [opt.before] put this row in front of that one.
   * @returns {Element} the row.
   * why: lessons/kit-glue.md#row
   */
  function row(content, opt = {}) {
    const { pad = padDefault, align = alignDefault, cls: rcls = '', before = null } = opt;
    if (!ROW_ALIGN.includes(align)) {
      throw new Error(`createGlueRows.row: align is one of ${ROW_ALIGN.join(', ')}, not ${JSON.stringify(align)}`);
    }
    const parts = (Array.isArray(content) ? content : [content]).filter(Boolean);
    // A justified row has two ends: with three or more, each wrapped line justifies separately.
    // why: lessons/kit-glue.md#between
    if (align === 'between' && parts.length !== 2) {
      throw new Error(`createGlueRows.row: a justified row has two ends, not ${parts.length}`);
    }
    const r = div(rcls ? `pos-rows-r ${rcls}` : 'pos-rows-r');
    // The value is always written: an attribute selector matches on presence.
    // why: lessons/kit-glue.md#data-align
    r.dataset.align = align;
    if (!pad) r.dataset.pad = 'off';
    for (const c of parts) r.append(c.el || c);
    const at = before && (before.el || before);
    root.insertBefore(r, at && at.parentNode === root ? at : null);
    const i = at && at.parentNode === root ? list.indexOf(at) : list.length;
    list.splice(i < 0 ? list.length : i, 0, r);
    root.hidden = false;
    return r;
  }

  /**
   * Take a row out. A no-op on anything not a row of this surface; the last one out hides it.
   * why: lessons/kit-glue.md#remove
   */
  function remove(target) {
    const r = target && (target.el || target);
    if (!r || r.parentNode !== root) return null;
    const i = list.indexOf(r);
    if (i >= 0) list.splice(i, 1);
    r.remove();
    if (!list.length) root.hidden = true;
    return r;
  }

  return {
    el: root,
    row,
    remove,
    /** The rows, in order, as a copy. */
    rows: () => list.slice(),
    /** How many rows this surface holds, hidden ones included. */
    count: () => list.length,
  };
}
