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
// ── THIS FILE IS THE FOURTH THING IN THIS KIT WITH "PANEL" IN ITS NAME, AND
//    THAT IS NAMED HERE SO NOBODY "TIDIES" IT ──────────────────────────────────
//   `panel.mjs`         a canvas with a footer of numbers, for the XR room.
//   `panel-layout.mjs`  a HARDWARE PANEL: a fixed column that does not scroll,
//                       a strip that does, and a case around the lot.
//   `xr-panel.mjs`      a panel hung in an immersive session.
//   this file           the same instrument with NO fixed column and NO
//                       scroller, expressed as glued rows.
// The build ENUMERATES `demo/shell/`, so a new module here needs no registration
// anywhere; what it does refuse is an import with no deployed file, and it scans
// modules rather than only pages. `workers/view/build.mjs:432` and `:451`.
// ⚠️ **AND THAT PATH IS `workers/view/build.mjs`, NOT `demo/build.mjs`.**
// `panel-layout.mjs` names the second one a few lines into its own header and
// there is no such file, which is this project's most repeated defect in its
// cheapest form: a path in a comment that no longer resolves.
//
// 🔴 **AND IT DOES NOT REPLACE `panel-layout.mjs`. THE TWO ANSWER DIFFERENT
// QUESTIONS AND BOTH ANSWERS ARE RIGHT.** That one is for an instrument whose
// controls are WIDER THAN THE PAGE — `/knobs/`'s flow measured 992 px inside a
// 686 px case — so it has a scroller, and its own notes record that a seam
// inside that scroller is impossible rather than merely hard. This one is for
// an instrument that FITS, where there is nothing to scroll and every row can
// therefore run edge to edge. **Nothing here is applied to any page**, which is
// explicit in the ask, so the choice between them is still open on every page.
//
// 🔴 **AND THE SHAPE IN THE SKETCH IS NOT INVENTED. SURVEYED ACROSS THE SEVEN
// PAGES THAT DRAW AN INSTRUMENT, 2026-09-26.** Three of its four row kinds are
// already drawn on three or more pages each:
//
//   a bank of knobs on one row   `/knobs/` 2, `/evo/` 8 with a 4|4 hairline,
//                                `/circuit/` 8 macros, `/twelve/` 8 pans
//   a keyboard at the bottom     `/knobs/`, `/evo/`, `/nola/`, `/fau/`
//   a plate carrying two facts   `/evo/`, `/twelve/`, `/circuit/`, `/tom/`,
//                                `/nola/`, `/muta/`, `/fau/`
//   the plate-and-patch FOOTER   `/knobs/`, `/nola/`, `/muta/` twice, `/fau/`
//
// 🔴 **THE PICTURE ROW IS THE ONE THAT IS NOT DRAWN ANYWHERE, AND THE REASON IS
// THE REASON THIS COMPONENT EXISTS.** No page puts a picture in the case as its
// top row. `/muta/` and `/fau/` both pass theirs as `parts: [scope.el]`, a
// glued surface OUTSIDE the case, and `/fau/` records why in its own words: a
// block handed to `add()` sits inside the case's 20 px inset and the ask was
// **edge to edge**, asked twice, the second time because a fourth inset nobody
// had counted was `.panel-case`'s own. The ask that bought that move was
// *"glued instrument feel like waveforms on muta"*. **So two pages have already
// escaped a case to get what a glued row gives by construction**, and a picture
// row here is `pad: false` and nothing else.
//
// ⚠️ **WHAT IT WOULD BREAK IF IT WERE APPLIED, WHICH IS WHY IT IS NOT.**
// Recorded now, while it is known, rather than discovered by whoever converts a
// page first. `/evo/`'s keyboard has NO intrinsic height and lives entirely on
// `panel.grow`, measured at 334.03 px against 24 with the absorber off, and
// nothing here grows. `/knobs/` measured its keyboard at 992 px inside a 686 px
// case and scrolls the whole strip as one; glued rows would scroll the keys
// inside their own row instead, which is a behaviour change on a shipped page
// that `/knobs/` has already declined once. `/twelve/` is uncased and moves
// `.panel-case` onto its fixed COLUMN. `/circuit/` scrolls the case rather than
// a strip inside it. And `/nola/`'s footer is `keyboard.mjs`'s own `foot`,
// owned there for every page that imports a keyboard, so a panel carrying both
// a keyboard row and a plate row would offer that page two footers.
//
// 🔴 **AND `/kit/` HAS HAD A GLUE BLOCK BEFORE AND IT WAS DELETED ON
// INSTRUCTION, 2026-09-18:** *"i see no poiint in glue, it looks off and
// pointless in docs. just glue the 4 we have properly"*. It went with its two
// grey specimen boxes reading `a block` and `and another`, and the recorded
// reason is the one that governs every example built for this component: **it
// demonstrated the mechanism and none of the reason for it, which is what made
// it read as furniture.** So every specimen on that page is an instrument
// somebody could operate, with real controls in it, and not a picture of a
// seam.
//
// ⚠️ **WHAT A CALLER OWNS.** What is in a row, what the picture draws, which
// keyboard, and what the plate says. This owns the ORDER, the seams, the ground
// under each row, and the two insets. A component that travels with one
// instrument's proportions is a component with one caller, which is the line
// `panel-layout.mjs` already draws and the reason `/evo/`'s keypad padding and
// `/circuit/`'s eight-column track did not come along with it.

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
