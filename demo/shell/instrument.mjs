// demo/shell/instrument.mjs — a cased panel with the instrument's name on it.
//
// 🔴 THIS IS A COMPOSITION, NOT A LAYOUT ENGINE, AND THAT IS THE WHOLE POINT.
// `createPanelLayout` already owns the case, the fixed column and the one
// scrolling strip; `createNameplate` already owns the plate and its three
// placements. What did not exist was the sentence that joins them, and five
// pages had each written it themselves:
//
//   /tom/      createNameplate({ lines: ['POSITRON', 'TOM'], place: 'ends' })
//              panel.el.prepend(plate.el)
//   /circuit/  its own createNameplate call and its own placing
//   /evo/      the same again
//   /twelve/   createNameplate({ lines: ['MODEL 12'], place: 'end' })
//   /kit/      two more, in its PANEL specimen
//
// `positron-ui` names this exactly: a control that exists in one page and
// nowhere else is a component that has not been noticed yet. Here it was in
// five, which is not a special case, it is a component with five copies of its
// assembly instructions.
//
// ⚠️ NOTHING HERE REIMPLEMENTS EITHER PART. If a panel behaviour is wrong, it
// is wrong in `panel-layout.mjs` and it is wrong for every page at once, which
// is the property a second implementation would have destroyed.
//
// 🔴 AND THE PLATE GOES IN BY `prepend`, WHICH IS WHAT `/tom/` DISCOVERED AND
// THE OTHERS DID DIFFERENTLY. A nameplate is not a row inside the scroller: it
// belongs to the CASE, above the fixed column and the strip both, or it scrolls
// away from the instrument it names.

import { el } from './shell.mjs';
import { createPanelLayout, createNameplate } from './panel-layout.mjs';

/** What every instrument on this site is made by, so no page types it. */
export const MAKER = 'POSITRON';

/**
 * The plate's lines, and the placement they need.
 *
 * 🔴 PURE, AND SEPARATE, SO IT CAN BE GRADED WITH NO BROWSER. Everything else
 * in this file needs a `document`, and a rule that only a browser can check is
 * a rule that gets checked once. `node demo/shell/instrument-test.mjs` runs
 * this in a few milliseconds.
 * ⚠️ ONE LINE OR TWO, AND THE CALLER DOES NOT CHOOSE THE PLACEMENT FOR ONE.
 * A maker of `''` is how a page says *this thing carries no brand*, which is
 * what `/twelve/` means by `MODEL 12` alone, and `ends` is `space-between`,
 * which parks a lone child on the LEFT. `createNameplate` records that as the
 * reason `end` exists, so choosing it here rather than leaving it to a caller
 * is this function agreeing with that file.
 */
export function plateSpec(maker, name, place = 'ends') {
  const lines = maker ? [maker, name] : [name];
  return { lines, place: lines.length === 1 ? 'end' : place };
}

/**
 * A cased instrument panel with its name printed across the top.
 *
 * @param {object}  o
 * @param {string}  o.name            the model, printed at the right end
 * @param {string}  [o.maker=MAKER]   the maker, printed at the left end
 * @param {Element} [o.host]          append the case to this
 * @param {string}  [o.place='ends']  a `createNameplate` placement
 * @param {object}  [o.panel]         passed straight to `createPanelLayout`
 * @returns {{el, panel, plate, fixed, strip, flow, add, shown}}
 */
export function createInstrument(o = {}) {
  const { name, maker = MAKER, host, place = 'ends', panel: panelOpts = {} } = o;
  /**
   * 🔴 REFUSED WITHOUT A NAME, FOR THE REASON `knob.mjs` REFUSES WITHOUT A
   * LABEL: the plate is the only thing on a case that says which instrument
   * this is, and a case with an unnamed plate is furniture wearing a border.
   * ⚠️ IT THROWS AT BUILD TIME, IN FRONT OF THE AUTHOR, rather than rendering
   * an empty plate a visitor has to interpret. `createNameplate` already
   * refuses a plate with no lines at all and this is the same refusal one
   * argument earlier, where the caller can still see what they forgot.
   */
  if (!name) {
    throw new Error('an instrument needs a name: the plate is the only thing saying which one it is');
  }

  /* The lines and the placement are decided by `plateSpec`, which is pure and
     is graded without a browser. */
  const spec = plateSpec(maker, name, place);
  /**
   * 🔴 THE PANEL PLACES THE PLATE, THIS FILE DOES NOT. It did
   * `panel.el.prepend(plate.el)` for one day, which is exactly what the five
   * pages before it were doing, and it inherited exactly what they were paying
   * for: the case's padding is horizontal only, so a plate put in from outside
   * sat on the top border. `/tom/` had fixed that in its OWN stylesheet and
   * `/plai/` had no such rule, so this wrapper shipped the defect to a new page
   * on the day it was written to prevent it.
   * ⚠️ **CENTRALISING AN ASSEMBLY THAT DOES NOT OWN ITS OWN LAYOUT MOVES THE
   * DUPLICATION RATHER THAN REMOVING IT.** `createPanelLayout` takes a `plate`
   * now and owns the spacing, so no wrapper and no page can get it wrong.
   */
  const panel = createPanelLayout({ ...panelOpts, plate: spec });
  const plate = panel.plate;
  host?.append(panel.el);

  return {
    el: panel.el,
    panel,
    plate,
    // The three places a caller puts things, forwarded rather than wrapped, so
    // everything `panel-layout.mjs` documents about them stays true here.
    fixed: panel.fixed,
    strip: panel.strip,
    flow: panel.flow,
    /** Put blocks in the scrolling flow, in order. `null` is skipped. */
    add(...blocks) {
      const into = panel.flow || panel.strip;
      for (const b of blocks) if (b) into.append(b.el || b);
      return this;
    },
    /** What the plate RENDERS, uppercase transform included. See the plate. */
    shown: () => plate.shown(),
  };
}

export default createInstrument;
