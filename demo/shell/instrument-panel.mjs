// demo/shell/instrument-panel.mjs — AN INSTRUMENT AS A STACK OF GLUED ROWS: a
// picture, some rows of controls, a keyboard, and a nameplate across the foot.
//
//   const p = createInstrumentPanel({
//     viz:   scope.el,                                  // the picture, edge to edge
//     rows:  [[cutoff, res, drive], [a, d, s, r]],      // rows of controls
//     keys:  kb.el,                                     // the keyboard
//     plate: { name: 'NOLA', patch: 'Rhodes Mk I' },    // the foot
//     // or plate: { name: 'FAU', status: power, patch: picker }: a switch after
//     // the name, and the patch selector at the far end with no label
//   });
//   p.el          the surface, to append to the page
//   p.addRow(…)   another row of controls, always above the keys and the plate
//   p.patch('Wurlitzer 200A')                           // rewrite the foot's right half
//   p.shape()     ['viz', 'controls', 'controls', 'keys', 'plate']
//
// 🔴 THE PATCH SELECTOR CARRIES NO LABEL AND SITS AT THE RIGHT END OF THE
// PLATE ROW, AND THE COMPONENT DOES BOTH SO NO PAGE HAS TO REMEMBER. Asked
// 2026-09-26: *"make rule for instumet panel that patch selector have no label
// and is in right"*. Before it, `/fau/` handed its picker in as `status`, so it
// sat beside the name at the START, wearing a `PATCH` caption, while a Compile
// button held the far end: the page had the option shape backwards and nothing
// refused it. Now `patch` is the only slot a selector goes in and it is the
// far end by construction; a picker handed in as `status` THROWS rather than
// landing at the start; and any `.pos-pick-l` caption the picker was built
// with is removed here, because the row already says what the control is: a
// plate reads `NAME   ‹ Organ ›`, and a word `PATCH` between them names what
// the reader is already reading. The `<select>` keeps its own `aria-label`
// (`choose a patch`), so the name a screen reader hears is untouched.
// `instrument-panel-test.mjs` grades the order and the strip with no browser;
// `/kit/` and `/fau/` grade the rendered offsets.
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
// headset. This one is the same instrument with no column and no scroller.
// 🔴 AND THE "FOR AN INSTRUMENT THAT FITS" CLAUSE HERE WAS WRONG, MEASURED AND
// CORRECTED 2026-09-28. It read that /knobs/ measured 992 px inside a 686 px
// case and keeps panel-layout. That 992 was a property of .panel-flow being
// width: max-content, not of the instrument. A glued surface is width:
// fit-content with max-width: 100%, so it stops at the room there is: the same
// keyboard is 646.0 px in a 688.0 px surface with 777.0 px of keys scrolling in
// its own row, and the widest white key is 49.0 px, which is --k-min, the
// component's own grid track floor and not a squash. /knobs/ wears this
// component now. The build enumerates demo/shell/ (workers/view/build.mjs), so
// nothing is registered.
//
// Surveyed across the seven instrument pages before it was written: a knob
// bank row, a keyboard at the bottom and a plate carrying two facts are each
// drawn on three or more pages; the picture row is drawn on none, because
// /muta/ and /fau/ both had to pass theirs as a glue part OUTSIDE the case to
// get edge to edge. That is what a picture row gives by construction.
//
// Worn by /fau/, /knobs/ and /tom/ as of 2026-09-28. What it would still break
// elsewhere: /evo/'s keyboard has no intrinsic height and lives on panel.grow;
// /twelve/ is uncased; /nola/'s footer belongs to the keyboard component.
// ⚠️ /tom/ KEEPS panel-layout INSIDE A ROW, which is the shape this file did
// not anticipate: 64 label rows beside 16 steps that have to scroll need a
// fixed column, and cased: true supplies the inset. The case gives up its own
// border and radius by itself, because .panel-case reads --edge and --r and
// .pos-glue.pos-glue > * sets both to 0 on the row. MEASURED there: the case
// draws 0px at radius 0px inside a surface drawing 1px at radius 4px, with no
// .pos-glue > .panel patch written. /kit/ had a GLUE block before, deleted 2026-09-18 as
// two grey boxes; every specimen here is an instrument somebody could play.
//
// A caller owns what is in a row, the picture, the keyboard and the plate's
// words. This owns the order, the seams, the ground and the two insets.

import { createGlueRows } from './glue.mjs';
import { createNameplate } from './panel-layout.mjs';
import { el } from './shell.mjs';

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

/** An element, or the element of a built control. A string or nothing is null. */
function elOf(v) {
  if (!v || typeof v === 'string') return null;
  if (v.nodeType === 1) return v;
  return v.el && v.el.nodeType === 1 ? v.el : null;
}

/** Is this a `createPicker` control? Read off its class, which is what renders. */
function isPicker(e) {
  return !!(e && e.classList && e.classList.contains('pos-pick'));
}

/**
 * Take a picker's caption off. `createPicker` appends `.pos-pick-l` when it is
 * given a `label`, and on a plate the caption names what the row already says.
 * ⚠️ REMOVED, NOT HIDDEN. A `display: none` caption would still be in the DOM
 * and `.pos-pick` is a flex row with a gap, so hiding is right too, but a
 * check that counts the picker's children would then have to know the rule.
 * Gone is gone, and the node test can see it without a stylesheet.
 */
function unlabel(ctl) {
  const found = ctl.querySelectorAll ? ctl.querySelectorAll('.pos-pick-l') : [];
  for (const l of found) l.remove();
  return found.length;
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
 * @param {object|false} [o.plate]   `{ name, patch, status }`, or a built
 *   nameplate, or `false` for a panel with no foot. `patch` is a string or a
 *   control; `status` is a control placed after the name.
 * @param {string} [o.cls]           extra classes for the surface.
 */
export function createInstrumentPanel(o = {}) {
  const { viz = null, rows: rowSpecs = [], keys = null, plate: plateSpec = null, cls = '', full = false } = o;

  const glue = createGlueRows({ cls: cls ? `pos-ipanel ${cls}` : 'pos-ipanel', full });
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
   *
   * 🔴 AND EITHER END MAY BE A CONTROL, SINCE 2026-09-26. `status` is a control
   * placed after the name, and `patch` may be a control instead of a string;
   * /fau/, /muta/, /knobs/ and /shape/ all put a switch and a picker on a foot
   * bar. The row is then two ends, justified: the name with its switch as ONE
   * start end and the patch at the end, so it still goes linear on a phone by
   * the rule `.pos-rows-r` carries. The text case is untouched: one plate
   * spanning its row, exactly as before.
   *
   * 🔴 AND A SELECTOR IS THE END, NEVER THE START, WITH NO CAPTION ON IT. The
   * header carries the ask. `status` is for a switch; a `.pos-pick` handed in
   * there is refused, and a `.pos-pick` handed in as `patch` loses its label.
   *
   * 🔴 **ON A PHONE THIS ROW CENTRES, AND IT IS THE ONLY CENTRED ROW IN THIS
   * COMPONENT.** Asked 2026-09-28: *"in instrument layout, on mobile the
   * nameplate goes below all othe section on its own section and it centered
   * hzontally"*. The first half was already true at every width, because
   * `ROW_KINDS` puts the plate last and `addRow` inserts before it; what is new
   * is the centring, and it lives in `shell.css` at the foot of the file, under
   * `.pos-ipanel-plate`, at 560 px and under.
   * ⚠️ **IT IS PHONE ONLY BECAUSE CENTRING IS NOT THIS KIT'S HABIT.** Every
   * other row in a panel is a start row or a justified one, and a new alignment
   * in a shared component reaches `fau`, `knobs`, `muta`, `shape`, `tom` and
   * `kit` at once. What earns it at 375 px is that the row has already gone
   * linear by then: MEASURED, `/muta/` drew its name on one line and its patch
   * picker on a second, both hard left against a 341 px row, which is a column
   * of two left-aligned fragments rather than a foot bar.
   * 🔴 **AND THE CONTROLS ON THE ROW GO WITH THE NAME.** `/muta/`'s `Test tone`
   * sits in `status`, so it is inside `.pos-ipanel-name` and centres as one
   * block with the name it belongs to rather than hanging off a centred word.
   * The patch selector keeps its own width and is already the full width of the
   * row at that size, measured, so it is centred by construction and loses
   * nothing. A centred row with a picker in it is not the same object as a
   * centred word, and this is which of the two it is.
   * ⚠️ **NO HARNESS HERE ENTERS THAT BLOCK.** `demo/verify.mjs` runs at 756 px,
   * so the six pages above pass every assert without it, and it is looked at
   * with `node demo/shot.mjs <slug> 375`. The stylesheet says what would make it
   * gradable and why that is not free.
   */
  let plate = null, plateRow = null, status = null, patchEnd = null, patchLine = null;
  if (plateSpec) {
    const built = !!(plateSpec.el && plateSpec.lines);
    status = built ? null : elOf(plateSpec.status);
    const patchCtl = built ? null : elOf(plateSpec.patch);
    const patchText = built || patchCtl ? null : plateSpec.patch;
    const caps = plateSpec.caps !== false;
    /* 🔴 A PATCH SELECTOR IN THE STATUS SLOT IS THE RULE BROKEN BY THE OPTION
       SHAPE, AND IT IS REFUSED HERE RATHER THAN DRAWN AT THE START. This is the
       arrangement `/fau/` shipped for a day: the picker beside the name and a
       button at the end. `createGlueRows` refuses a bad alignment the same way. */
    if (isPicker(status)) {
      throw new Error('createInstrumentPanel: a patch selector goes in `patch`, which is the far end of the plate row; `status` is the switch beside the name');
    }
    if (patchCtl && isPicker(patchCtl)) unlabel(patchCtl);
    if (built || (!status && !patchCtl)) {
      plate = built
        ? plateSpec
        : createNameplate({
          lines: [plateSpec.name, patchText].filter((t) => t != null && t !== ''),
          place: plateSpec.place || 'ends',
          caps,
        });
      patchLine = plate.lines.length > 1 ? plate.lines[plate.lines.length - 1] : null;
      if (patchLine) patchLine.classList.add('panel-plate-patch');
      plateRow = glue.row(plate.el, { cls: 'pos-ipanel-plate' });
    } else {
      plate = createNameplate({ lines: [plateSpec.name].filter((t) => t != null && t !== ''), place: 'ends', caps });
      const start = el('div', 'pos-ipanel-name');
      start.append(plate.el);
      if (status) start.append(status);
      if (patchCtl) {
        patchEnd = patchCtl;
      } else if (patchText != null && patchText !== '') {
        const tail = createNameplate({ lines: [patchText], place: 'ends', caps });
        patchLine = tail.lines[0];
        patchLine.classList.add('panel-plate-patch');
        patchEnd = tail.el;
      }
      plateRow = patchEnd
        ? glue.row([start, patchEnd], { align: 'between', cls: 'pos-ipanel-plate' })
        : glue.row([start], { align: 'start', cls: 'pos-ipanel-plate' });
    }
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
   * ⚠️ THE PATCH LINE IS MARKED `panel-plate-patch` AND PRINTS AS WRITTEN.
   * Asked 2026-09-26: *"patches are always sentence cased"*. The plate's
   * uppercase is about a maker and a model; a patch is the name somebody gave
   * a sound, so `shell.css` turns the transform off on this one line and the
   * text handed here is shown exactly as typed.
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
    if (patchEnd && !patchLine) {
      throw new Error('createInstrumentPanel.patch: this plate’s patch end is a control, so there is no text to rewrite');
    }
    if (!patchLine) {
      throw new Error('createInstrumentPanel.patch: this plate has no patch line, so there is no reserved box to write into');
    }
    patchLine.textContent = text;
    return text;
  }

  return {
    el: glue.el,
    glue,
    viz: vizRow,
    keys: keysRow,
    plate,
    plateRow,
    /** The foot's status control, or `null`. The element, as handed in. */
    status,
    /** The foot's end: the patch control, or the text patch's own plate, or `null`. */
    patchEnd,
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
