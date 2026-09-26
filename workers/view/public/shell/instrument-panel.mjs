// demo/shell/instrument-panel.mjs — AN INSTRUMENT AS A STACK OF GLUED ROWS: a
// picture, some rows of controls, a keyboard, and a nameplate across the foot.
//
//   const p = createInstrumentPanel({
//     viz:   scope.el,                                  // the picture, edge to edge
//     rows:  [[cutoff, res, drive], [a, d, s, r]],      // rows of controls
//     keys:  kb.el,                                     // the keyboard
//     plate: { name: 'NOLA', patch: 'RHODES MK I' },    // the foot
//   });
//   p.el          the surface, to append to the page
//   p.addRow(…)   another row of controls, always above the keys and the plate
//   p.patch('WURLITZER 200A')                           // rewrite the foot's right half
//   p.shape()     ['viz', 'controls', 'controls', 'keys', 'plate']
//
// 🔴 ASKED FOR 2026-09-26, WITH A SKETCH, AND THE SKETCH IS THE CONTRACT:
// *"do a instrument panel coponent properly in kit. its our glued style"*.
//
//     -----------
//      viz? orsmth
//     -----------
//      ()()...
//     -----------
//      ()()()...
//     -----------
//      ...etc...
//     -----------
//      ||keys?||||
//     -----------
//       name patch
//     -----------
//
// ⚠️ **SO THE ORDER IS THE COMPONENT'S AND NOT THE CALLER'S.** `addRow` inserts
// ABOVE the keyboard and the plate however late it is called, because those two
// are the bottom of the object in the sketch and a panel that can be assembled
// wrong is a panel that will be. This is `panel-layout.mjs`'s `grow()` argument
// one component along: a required ordering a caller types is an ordering no
// browser check can see when it is missing.
//
// The fourth file here with "panel" in its name, and none of them collide:
// panel.mjs is a canvas with a footer for XR, panel-layout.mjs is a hardware
// panel with a fixed column and a scroller, xr-panel.mjs hangs one in a
// headset. This one is the same instrument with no column and no scroller,
// for an instrument that FITS; /knobs/ measured 992 px inside a 686 px case
// and keeps panel-layout. The build enumerates demo/shell/ (workers/view/
// build.mjs), so nothing is registered.
//
// Surveyed across the seven instrument pages before it was written: a knob
// bank row, a keyboard at the bottom and a plate carrying two facts are each
// drawn on three or more pages; the picture row is drawn on none, because
// /muta/ and /fau/ both had to pass theirs as a glue part OUTSIDE the case to
// get edge to edge. That is what a picture row gives by construction.
//
// Not applied to any page, and what it would break if it were: /evo/'s
// keyboard has no intrinsic height and lives on panel.grow; /knobs/ scrolls
// its whole strip as one; /twelve/ is uncased; /nola/'s footer belongs to the
// keyboard component. /kit/ had a GLUE block before, deleted 2026-09-18 as
// two grey boxes; every specimen here is an instrument somebody could play.
//
// A caller owns what is in a row, the picture, the keyboard and the plate's
// words. This owns the order, the seams, the ground and the two insets.

import { createGlueRows } from './glue.mjs';
import { createNameplate } from './panel-layout.mjs';

/** The row kinds, in the order the sketch draws them. `shape()` returns these. */
export const ROW_KINDS = ['viz', 'controls', 'keys', 'plate'];

/**
 * ⚠️ AN ELEMENT, OR AN ELEMENT WITH ITS ROW'S OPTIONS AROUND IT. One escape,
 * used by both `viz` and `keys`, rather than a `vizPad` and a `keysAlign` for
 * every part this component might grow. A caller writes `viz: canvas` or
 * `viz: { el: canvas, pad: true }`.
 */
function partOf(v) {
  if (!v) return null;
  if (v.nodeType === 1) return { el: v, opt: {} };
  const e = v.el;
  if (!e) return null;
  const { el: _drop, ...opt } = v;
  return { el: e, opt };
}

/**
 * An instrument panel.
 *
 * @param {object} [o]
 * @param {Element|object} [o.viz]   the picture. Edge to edge by default, which
 *   is `panel.mjs`'s own rule: a screen with a margin around its image reads as
 *   a photograph of a screen.
 * @param {Array[]} [o.rows]         rows of controls, top to bottom. Each entry
 *   is an array of controls, or an array of `[controls, options]`.
 * @param {Element|object} [o.keys]  the keyboard.
 * @param {object|false} [o.plate]   `{ name, patch }`, or a built nameplate, or
 *   `false` for a panel with no foot.
 * @param {string} [o.cls]           extra classes for the surface.
 */
export function createInstrumentPanel(o = {}) {
  const { viz = null, rows: rowSpecs = [], keys = null, plate: plateSpec = null, cls = '' } = o;

  const glue = createGlueRows({ cls: cls ? `pos-ipanel ${cls}` : 'pos-ipanel' });
  /** @type {{el: Element, kind: string}[]} the rows, in order, with their kind. */
  const kept = [];

  function put(content, kind, opt = {}) {
    const before = kind === 'controls' ? (keysRow || plateRow) : null;
    const r = glue.row(content, { ...opt, cls: `pos-ipanel-${kind}${opt.cls ? ` ${opt.cls}` : ''}`, before });
    /* ⚠️ THE KIND IS ON THE ELEMENT AS WELL AS IN THE LIST, so a check can read
       what is RENDERED rather than what this module remembers. Those are two
       different facts and this project has been caught believing the second
       one: `/pack/`'s assert read `head.hidden === true`, which is a property,
       and passed every run while the heading was on screen. */
    r.dataset.kind = kind;
    const at = before ? kept.findIndex((k) => k.el === before) : -1;
    kept.splice(at < 0 ? kept.length : at, 0, { el: r, kind });
    return r;
  }

  // 🔴 THE THREE PARTS THAT ANCHOR THE ORDER ARE BUILT FIRST, TOP AND BOTTOM,
  // so `put('controls')` always has something to insert in front of. The
  // picture is not one of them: nothing is ever inserted above it.
  const vizPart = partOf(viz);
  const vizRow = vizPart ? glue.row(vizPart.el, { pad: false, cls: 'pos-ipanel-viz', ...vizPart.opt }) : null;
  if (vizRow) { vizRow.dataset.kind = 'viz'; kept.push({ el: vizRow, kind: 'viz' }); }

  const keysPart = partOf(keys);
  let keysRow = null;
  if (keysPart) {
    keysRow = glue.row(keysPart.el, { align: 'start', cls: 'pos-ipanel-keys', ...keysPart.opt });
    keysRow.dataset.kind = 'keys';
    kept.push({ el: keysRow, kind: 'keys' });
  }

  /**
   * 🔴 THE FOOT IS A NAMEPLATE AND ITS TWO ENDS ARE THE NAME AND THE PATCH,
   * WHICH IS WHAT THE SKETCH DRAWS: *"where name is nameplate"*, with `name
   * patch` on one line. `place: 'ends'` is `justify-content: space-between` and
   * has meant exactly this since it was written, so nothing new is needed.
   * ⚠️ **AND THE PATCH IS THE RIGHT-HAND END ON PURPOSE.** It is the half that
   * CHANGES, and a right-aligned box grows leftward into air, so a longer patch
   * name moves nothing. The name is fixed and sits against the fixed edge.
   */
  let plate = null, plateRow = null;
  if (plateSpec) {
    plate = plateSpec.el && plateSpec.lines
      ? plateSpec
      : createNameplate({
        lines: [plateSpec.name, plateSpec.patch].filter((t) => t != null && t !== ''),
        place: plateSpec.place || 'ends',
        caps: plateSpec.caps !== false,
      });
    plateRow = glue.row(plate.el, { cls: 'pos-ipanel-plate' });
    plateRow.dataset.kind = 'plate';
    kept.push({ el: plateRow, kind: 'plate' });
  }

  // The control rows, in the order given, each above the keyboard and the foot.
  const controlRows = rowSpecs.filter(Boolean).map((spec) => {
    const [content, opt] = Array.isArray(spec) && Array.isArray(spec[0]) ? spec : [spec, {}];
    return put(content, 'controls', opt || {});
  });

  /**
   * Rewrite the foot's right-hand end.
   *
   * 🔴 IT THROWS ON A PANEL WHOSE PLATE HAS NO SECOND LINE, RATHER THAN GROWING
   * ONE. A line that arrives after the panel is on screen makes the foot taller
   * or wider while somebody is looking at it, which is the standing rule about
   * anything that changes its own size. A panel that will ever show a patch
   * name declares one at build time, even an empty-looking one, and then the
   * box is reserved. `createNameplate` refuses a plate with no lines at all for
   * the same family of reason: a container with nothing in it must not paint
   * its edges.
   */
  function patch(text) {
    if (!plate) throw new Error('createInstrumentPanel.patch: this panel has no plate');
    if (plate.lines.length < 2) {
      throw new Error('createInstrumentPanel.patch: this plate has no patch line, so there is no reserved box to write into');
    }
    plate.lines[plate.lines.length - 1].textContent = text;
    return text;
  }

  return {
    el: glue.el,
    glue,
    viz: vizRow,
    keys: keysRow,
    plate,
    plateRow,
    /** The control rows, in order. */
    controls: () => controlRows.slice(),
    /** Every row, in the order the page renders them, with its kind. */
    rows: () => kept.slice(),
    /**
     * The panel's shape, as row kinds top to bottom.
     *
     * ⚠️ IT IS READ OFF THE DOM RATHER THAN OFF THE LIST, for the reason `put`
     * gives: what a module remembers and what a browser renders are two facts,
     * and only the second one is the page.
     */
    shape: () => [...glue.el.children].map((r) => r.dataset.kind || '?'),
    /** Another row of controls, above the keyboard and the foot. */
    addRow: (content, opt) => {
      const r = put(content, 'controls', opt || {});
      controlRows.push(r);
      return r;
    },
    patch,
  };
}
