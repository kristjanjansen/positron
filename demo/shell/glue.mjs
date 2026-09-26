// demo/shell/glue.mjs — two or more blocks as ONE surface.
//
// 🔴 ASKED FOR 2026-09-18: *"do same treatment as for readout/logs for
// transport + timeline: can be separate or glued togehter"*. The readout and
// the log already had it (`mount({ joined: true })`), and the look they invented
// turned out not to be about readouts or logs at all: one border round the lot,
// a 1 px seam of `--line` between the parts, and the children giving up their
// own border and radius to the box. That is now `.pos-glue` in shell.css and
// this file is the way a page reaches it.
//
// ⚠️ SEPARATE IS STILL THE DEFAULT, on both pairs, and that is the point of the
// word "can" in the ask. Two blocks 22 px apart are two surfaces and the page
// stack already spaces them; gluing is a CLAIM that they are one object, which
// is true of a strip sitting on the transport bar that drives it and false of
// most other neighbours. A page that does not ask keeps what it has.
//
// ⚠️ WHY THIS IS NOT `createStack(host, 'pos-glue')`. A stack owns the AIR
// between blocks and a glue owns the absence of it: `.pos-stack`'s children
// carry `margin-top: var(--pos-gap)`, so an element that is both would space
// its parts by the page rhythm and then draw a seam in the middle of that gap.
// They are opposites wearing the same shape, and one function that did both
// would take a flag saying which.
//
// ⚠️ AND A GLUE OF ONE BLOCK IS THAT BLOCK, UNWRAPPED. A box drawn round a
// single child is a second border over the one the child already has, which is
// the doubled-edge defect `.pos-report` exists to avoid at the other end (a
// report holding only a log draws one border and no seam). A page building its
// blocks conditionally therefore cannot accidentally gain an edge.

import { el } from './shell.mjs';

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
  const box = el('div', 'pos-glue');
  box.append(...parts);
  return box;
}

/* ────────────────────────────────────────────────────────────────────────────
   ROWS: the same surface, built up one row at a time.

   🔴 ASKED FOR 2026-09-26 as the base of an instrument panel: *"base on generic
   \"glued containers/rows\" component that you also need to add to kit"*. It is
   in THIS file and not in a new one because `createGlue` above and this are the
   same surface with two interfaces, and two files defining one look is how a
   look drifts. `.pos-glue` is declared once in `shell.css` and both reach it.

   ⚠️ WHAT IS ACTUALLY NEW HERE, BECAUSE `createGlue` ALREADY GLUES. Three
   things, and none of them is the border:

     1. **A ROW IS A CONTAINER, AND IT PAINTS ITS OWN GROUND.** `createGlue`
        takes blocks that are already surfaces — a readout, a transport bar, a
        strip — and every one of them has a background of its own. A row holds
        loose CONTROLS, which do not. `.pos-glue` is `gap: 1px` over a `--line`
        ground, so a child with no background lets that colour through its whole
        area and the 1 px seam stops being a seam. That trap is recorded three
        times already, against `/wish/` and twice against `/pack/`, each time as
        a caller remembering to paint a ground in its own stylesheet. Here the
        container does it and there is nothing to remember.
     2. **ROWS ARRIVE AFTER THE SURFACE EXISTS.** `createGlue(...blocks)` is one
        call with everything in hand, which is right for a fixed pair. A panel's
        rows are built from a page's own parts and some of them are conditional.
     3. **A ROW CAN GO AWAY WITHOUT LEAVING A SEAM BEHIND.** A `display: none`
        child takes no `gap` in a flex column, which is what `.pos-report`
        already leans on for a report holding only a log.

   🔴 AND THE ROW IS A FLEX CONTAINER, WHICH IS NOT DECORATION: IT IS THE FIX
   FOR THIS PROJECT'S MEASURED DOUBLE-LINE DEFECT. A `<textarea>`, `<canvas>`,
   `<img>`, `<video>`, `<iframe>` or `<select>` is inline by default and sits on
   a TEXT BASELINE, so a BLOCK parent reserves descender space under it: on
   `/fau/` the field wrapper's bottom measured **557.5** against the textarea's
   **556.0**, both elements reading `0/0/0/0` for every border, and inside a glue
   that 1.5 px strip is painted in the seam colour and reads as a second line.
   It took four wrong answers, one of which deleted a real affordance on a guess.
   A flex container BLOCKIFIES its children, so a replaced element handed
   straight to `row()` cannot leave that strip at all.
   ⚠️ **IT REACHES ONE LEVEL ONLY, AND THAT IS SAID OUT LOUD RATHER THAN PAPERED
   OVER.** A caller that hands over a `<div>` with a canvas inside it is back in
   the block-parent case and the container cannot see it. A `.pos-rows-r canvas`
   rule would reach it and would also be a rule about somebody else's component,
   so what is here instead is the structural half plus this sentence.
   ⚠️ **AND THE SAME IS TRUE OF EVERY `.pos-glue > X` PATCH IN `shell.css`**,
   which is why all seven of them are written `> X` AND `> * > X`: `/radio/`
   glues a scope straight in and `/pack/` wraps it, and a direct-child selector
   fixed one page and left the other exactly as reported.

   ⚠️ NO `[hidden]` PATCH ON THE SURFACE AND ONE ON THE ROW. `.pos-glue[hidden]`
   already exists in `shell.css` for exactly this reason and covers the surface;
   the row sets `display: flex` of its own, so it needs its own, which is the
   fifth component in this project to need that patch.
   ──────────────────────────────────────────────────────────────────────────── */

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
 * @returns {{el: Element, row: Function, remove: Function, rows: Function,
 *            count: Function}}
 */
export function createGlueRows(o = {}) {
  const { cls = '', pad: padDefault = true, align: alignDefault = 'center' } = o;
  if (!ROW_ALIGN.includes(alignDefault)) {
    throw new Error(`createGlueRows: align is one of ${ROW_ALIGN.join(', ')}, not ${JSON.stringify(alignDefault)}`);
  }
  const root = el('div', cls ? `pos-glue pos-rows ${cls}` : 'pos-glue pos-rows');
  /**
   * 🔴 A SURFACE WITH NO ROWS DOES NOT PAINT ITS EDGES, AND IT IS `hidden`
   * RATHER THAN NOT APPENDED. `createGlue` above returns `null` for nothing,
   * which it can because it is handed everything at once; this one is appended
   * to a page before its first row exists, so the empty state has to be a state.
   * It is the same answer `table.mjs` gives with `blank()`: the container is
   * built, it is hidden, and the first row clears it with nothing for a caller
   * to remember. The defect it avoids is `/typist/`'s: an empty bordered box
   * renders as a horizontal rule nobody wrote.
   */
  root.hidden = true;
  const list = [];

  /**
   * Add a row, and put things in it.
   *
   * @param {Element|object|Array} [content] an element, anything with an `el`,
   *   or an array of either. `null` entries are SKIPPED, the same way
   *   `createStack().add` and `createGlue` skip them and for the same reason: a
   *   caller asks for a row's contents in one call and one of them is usually
   *   conditional, and an `if` around an append is how a control ends up
   *   somewhere else.
   * @param {object} [opt]
   * @param {boolean} [opt.pad]   `false` for a row whose content goes edge to
   *   edge, which is what a picture wants. The surface's own default otherwise.
   * @param {string} [opt.align]  one of ROW_ALIGN.
   * @param {string} [opt.cls]    extra classes for this row.
   * @param {Element} [opt.before] put this row in front of that one.
   * @returns {Element} the row.
   */
  function row(content, opt = {}) {
    const { pad = padDefault, align = alignDefault, cls: rcls = '', before = null } = opt;
    if (!ROW_ALIGN.includes(align)) {
      throw new Error(`createGlueRows.row: align is one of ${ROW_ALIGN.join(', ')}, not ${JSON.stringify(align)}`);
    }
    const r = el('div', rcls ? `pos-rows-r ${rcls}` : 'pos-rows-r');
    /* ⚠️ THE VALUE IS ALWAYS WRITTEN, never left empty to mean off. An attribute
       selector matches on PRESENCE, which is the defect `video-panel.mjs`
       shipped: `dataset.full = full ? mode : ''` kept every full-screen rule
       applying to a panel that had been full once. */
    r.dataset.align = align;
    if (!pad) r.dataset.pad = 'off';
    for (const c of (Array.isArray(content) ? content : [content])) {
      if (c) r.append(c.el || c);
    }
    const at = before && (before.el || before);
    root.insertBefore(r, at && at.parentNode === root ? at : null);
    const i = at && at.parentNode === root ? list.indexOf(at) : list.length;
    list.splice(i < 0 ? list.length : i, 0, r);
    root.hidden = false;
    return r;
  }

  /**
   * Take a row out.
   *
   * ⚠️ IT IS A NO-OP ON ANYTHING THAT IS NOT A ROW OF THIS SURFACE, rather than
   * a throw, for the reason `panel-layout.mjs`'s `unband` gives: a caller
   * swapping parts calls this on whatever it is holding and half of those have
   * already gone.
   * ⚠️ AND THE SURFACE GOES BACK TO HIDDEN WHEN THE LAST ONE LEAVES, because
   * the empty state is the same empty state whether it was never filled or has
   * been emptied.
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
