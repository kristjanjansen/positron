// demo/shell/panel-layout.mjs — A HARDWARE PANEL: a fixed column that does not
// scroll, a strip of controls that does, a nameplate, and a case around the lot.
//
//   const p = createPanelLayout({ side: 'left' });   // cased, column on the left
//   p.el                      the panel, to append to the page
//   p.fixed                   the column that stays put
//   p.strip                   the scroller
//   p.flow                    the column inside the scroller
//   p.grow(keysBox)           this child of the flow absorbs the slack
//   p.check()                 measure it, and report a flow with slack and no absorber
//   p.cuts                    what check() found, the way createDiagram reports a cut label
//
//   const plate = createNameplate({ lines: ['EVOLUTION', 'MK-425C'], place: 'mid' });
//
// 🔴 **THIS FILE IS `panel-layout.mjs` AND NOT `panel.mjs`, WHICH IS TAKEN, AND
// THE COLLISION IS NAMED HERE SO THE NEXT READER DOES NOT "TIDY" IT.**
// `demo/shell/panel.mjs` already exists and is something else entirely: a canvas
// with a footer of real numbers under it, for the XR room, and `createPanel({
// width, height, title, scale })` is called TWICE by `demo/mirror/index.html`.
// `demo/build.mjs` refuses a build when two sources collide on one destination,
// so that is the sort of collision that stops the site rather than degrading it.
// ⚠️ `hardware.mjs` is taken too (`createHardware`, the one gesture that buys
// audio and MIDI) and so is `xr-panel.mjs`. This name was what was left.
//
// 🔴 **AND THE CLASS PREFIX IS `.panel-`, NOT `.pan-`.** `/twelve/` draws
// `createKnob({ label: 'pan' })` on all eight channels, so a page carrying
// `.pan-strip` beside a control called PAN is a page where `grep -n pan` stops
// being a useful search.
//
// ── WHAT THIS OWNS AND WHAT A PAGE OWNS ─────────────────────────────────────
// This owns the ARRANGEMENT: which of the two children scrolls, which one keeps
// its width, that they are one depth, where the border between them goes, the
// two published measurements, and which child of the flow absorbs the slack.
//
// A page owns everything about its own instrument: what is IN the column, what
// the rows hold, the proportions of a real object, and what its labels say.
// ⚠️ **A COMPONENT THAT TRAVELS WITH ONE INSTRUMENT'S PROPORTIONS IS A COMPONENT
// WITH ONE CALLER**, so none of these came along: `/evo/`'s keypad padding and
// its eight keyboard overrides, `/circuit/`'s `repeat(8, var(--ctl-w))` and its
// 34 px foot, `/twelve/`'s `calc(4 * calc(var(--ctl-w) / 2) + 3 *
// var(--ctl-step))` and its whole phone block.
//
// ── THE CONTRACT ────────────────────────────────────────────────────────────
// The full nine points, with their measurements, are on `.panel` in
// `demo/shell/shell.css`. The three that a caller can get wrong from here:
//
//   1. **The fixed column is OPTIONAL and its side is an option.** `/evo/` has
//      it on the left, `/twelve/` on the right, `/circuit/` has none. Pass
//      `side: null` for none, and the panel is one scroller with no wrap.
//   2. **The case is OPTIONAL and defaults ON.** `/twelve/` has no outer card at
//      all: its eight channel strips and its master lane each paint their own,
//      glued at the seams. `cased: false` leaves `--panel-pad` at 0, and then
//      every other rule is already correct for it with no second stylesheet.
//   3. **Exactly one child of the flow absorbs the slack.** The fixed column
//      DRIVES the depth, so on any panel whose column is taller than its
//      strip's natural content there is slack and something has to take it.
//      MEASURED on `/evo/` by switching it off in the live page: the flow went
//      461.03 to 151 and the keyboard went **334.03 to 24**, which is 310.03 px
//      and 67 per cent of the flow's depth. That keyboard has no intrinsic
//      height on that page at all.
//
// 🔴 **A FLOW WITH SLACK AND NO ABSORBER IS REPORTED, NOT REFUSED.** `check()`
// pushes onto `cuts`. A report and not a throw, because `/twelve/`'s 25.00 px of
// trailing air is legitimate and a panel with no fixed column has no slack at
// all, so refusing the build would break two of the three callers.
// ⚠️ **AND `check()` IS A MEASUREMENT, SO IT CANNOT RUN AT BUILD TIME.** Heights
// do not exist until the browser has laid the panel out, and inside a closed tab
// panel every rect is zero, which is how a check that measures one thing passes
// while measuring nothing. The caller decides when, and `/kit/` calls it inside
// its own measuring window.
//
// ⚠️ **NOTHING HERE SETS A HEIGHT FROM JAVASCRIPT.** An inline style beats every
// stylesheet, which is this project's fourth measured dead rule
// (`stage.style.aspectRatio` against `.pos-vp[data-full] .pos-vp-stage`), and it
// would have to re-run on every resize. A component that varies a property per
// instance sets a custom property, never the property.
//
// ⚠️ **AND `.panel-cap` IS NOT `.pos-cap`.** That one is the house caption for a
// picture and brings `margin-top: 3px` with it, which is the tell: a printed
// label on a panel is positioned by the GROUP it names, and a caption that
// brings its own margin would move it. Named here as well as in the stylesheet
// because folding them together would move every printed name on three pages.
//
// ⚠️ **WHAT THIS DELIBERATELY DID NOT ABSORB, AND IT IS A REAL COMPONENT.**
// `/circuit/`'s `.circ-pair-lab`, `/evo/`'s `.evo-oct-lab` and `/evo/`'s
// `.evo-fn-pair` are three answers to ONE question, which is how a panel prints
// a name over MORE THAN ONE control. All three are absolutely positioned or
// margin corrected against `--ctl-head`, and all three have a different
// geometry: `min-height: 12px` with `margin-bottom: calc(var(--ctl-head) -
// 12px)`, `position: absolute; left: -20px; right: -20px`, and a left derived
// from `--i`. Merging three geometries needs a measurement of all three and
// nobody has made one. Recorded rather than guessed at.

const el = (tag, cls, txt) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt != null) e.textContent = txt;
  return e;
};

/**
 * A hardware panel.
 *
 * @param {object}  [o]
 * @param {boolean} [o.cased=true]   paint the card. `false` for a panel whose
 *                                   children paint their own, like `/twelve/`.
 * @param {?string} [o.side='left']  which side the fixed column is on, or
 *                                   `null` for a panel with no fixed column.
 * @param {boolean} [o.flow=true]    build a `.panel-flow` inside the scroller.
 *                                   `false` where the scroller's own children
 *                                   are the content, like `/twelve/`'s eight
 *                                   channel strips.
 * @param {Element} [o.grow]         the flow child that absorbs the slack. May
 *                                   also be set later with `grow()`, which is
 *                                   what a page building its children after the
 *                                   panel needs.
 * @param {object}  [o.cls]          per part extra class names, so a page can
 *                                   keep its own instrument classes beside the
 *                                   shared ones: `{ panel, wrap, fixed, strip,
 *                                   flow }`.
 * @param {object}  [o.strip]        attributes for the scroller:
 *                                   `{ tabindex, role, label }`.
 */
export function createPanelLayout(o = {}) {
  const {
    cased = true, side = 'left', flow: wantFlow = true, grow: growEl = null,
    cls = {}, strip: stripOpts = {},
  } = o;
  if (side !== null && side !== 'left' && side !== 'right') {
    throw new Error(`createPanelLayout: side is 'left', 'right' or null, not ${JSON.stringify(side)}`);
  }

  const add = (base, extra) => (extra ? `${base} ${extra}` : base);
  const root = el('div', add(`panel${cased ? ' panel-case' : ''}`, cls.panel));

  let wrap = null, fixed = null;
  // 🔴 THE SCROLLER IS BUILT WHATEVER ELSE IS TRUE, because contract 1 says a
  // panel has exactly one scrolling region and the page never scrolls. It is
  // the one part that is not optional.
  const strip = el('div', add(`panel-strip${side ? ` panel-strip-${side[0]}` : ''}`, cls.strip));
  // ⚠️ THE SCROLLER TAKES FOCUS AND SAYS WHICH WAY IT GOES, where the caller
  // asks. That is a second channel beside the fixed column's border, it costs no
  // pixels, and it is the only one a reader who cannot see the border gets.
  if (stripOpts.tabindex != null) strip.setAttribute('tabindex', String(stripOpts.tabindex));
  if (stripOpts.role) strip.setAttribute('role', stripOpts.role);
  if (stripOpts.label) strip.setAttribute('aria-label', stripOpts.label);

  if (side) {
    wrap = el('div', add('panel-wrap', cls.wrap));
    fixed = el('div', add(`panel-fixed panel-fixed-${side[0]}`, cls.fixed));
    // The column comes first in the DOM on the left and second on the right, so
    // reading order follows the picture rather than a flex `order` nobody can
    // see in the markup.
    wrap.append(...(side === 'left' ? [fixed, strip] : [strip, fixed]));
    root.append(wrap);
  } else {
    root.append(strip);
  }

  const flowEl = wantFlow ? el('div', add('panel-flow', cls.flow)) : null;
  if (flowEl) strip.append(flowEl);

  /** @type {string[]} what check() found, the way createDiagram reports a cut. */
  const cuts = [];
  /** The flow child that absorbs the slack. */
  let absorber = null;

  /**
   * Name the child that absorbs the slack. The class is applied HERE rather
   * than typed on a page, which is the whole reason this is an argument: a
   * required line a caller types is a line no browser check can see when it is
   * missing, and in the broken state nothing throws and nothing looks wrong
   * until somebody opens the page.
   */
  function grow(child) {
    if (!child) return absorber;
    // ⚠️ THE PREVIOUS ONE GIVES THE CLASS UP. Two growing children share the
    // slack between them, which is a different layout and not this contract, and
    // it would make `check()`'s "exactly one" reading pass while meaning nothing.
    if (absorber && absorber !== child) absorber.classList.remove('panel-grow');
    absorber = child;
    child.classList.add('panel-grow');
    return absorber;
  }
  if (growEl) grow(growEl);

  /**
   * Measure the panel and report what it cannot do anything about.
   *
   * 🔴 THE ONE CONDITION WORTH REPORTING IS A FLOW WITH A DEFINITE HEIGHT WHOSE
   * CHILDREN COME TO LESS THAN IT AND WHERE NO CHILD GROWS. That is the panel
   * drawing empty case, which is the defect `/evo/` was handed.
   * ⚠️ THE GAPS COUNT. The flow carries `gap: var(--panel-gap)`, so the content
   * is the children plus `n - 1` gaps, and a reading that forgot them would
   * report slack on a panel that has none.
   *
   * @returns {{flowH:number, kidsH:number, gap:number, slack:number,
   *            growing:Element[], cuts:string[], measured:boolean}}
   */
  function check() {
    cuts.length = 0;
    if (!flowEl) {
      return { flowH: 0, kidsH: 0, gap: 0, slack: 0, growing: [], cuts, measured: false };
    }
    const kids = [...flowEl.children];
    const growing = kids.filter((k) => k.classList.contains('panel-grow'));
    const gap = parseFloat(getComputedStyle(flowEl).rowGap) || 0;
    const flowH = flowEl.getBoundingClientRect().height;
    const kidsH = kids.reduce((s, k) => s + k.getBoundingClientRect().height, 0)
      + Math.max(0, kids.length - 1) * gap;
    const slack = flowH - kidsH;
    // ⚠️ A ZERO HEIGHT IS NOT A PANEL WITH NO SLACK, IT IS A PANEL NOBODY HAS
    // LAID OUT. Inside a closed tab panel every rect is zero and two zeros
    // compare equal, so a reading taken there would report "no slack" about a
    // panel it never saw. Say so instead.
    const measured = flowH > 0;
    if (!measured) {
      cuts.push('this panel has no laid out height, so nothing about it was measured');
    } else if (slack > 1 && growing.length === 0) {
      cuts.push(`${slack.toFixed(1)} px of the flow is empty and no child carries `
        + `.panel-grow, so the panel draws empty case under its own content`);
    } else if (growing.length > 1) {
      cuts.push(`${growing.length} children carry .panel-grow, and the contract is one`);
    }
    return { flowH, kidsH, gap, slack, growing, cuts, measured };
  }

  return { el: root, wrap, fixed, strip, flow: flowEl, cased, side, grow, check, cuts };
}

/**
 * The maker and the model, printed on the case.
 *
 * 🔴 EVERY PANEL HAS ONE. Its PLACEMENT is an option and its ink is not.
 *
 * @param {object}   o
 * @param {string[]} o.lines          what is printed, typed uppercase in the
 *                                    source even though the rule uppercases it
 *                                    anyway, so the source reads like the page.
 * @param {string}   [o.place='ends'] `'ends'` puts the maker at one end and the
 *                                    model at the other across whatever the
 *                                    plate spans. `'mid'` is a centred block at
 *                                    a fixed position, which is what a plate
 *                                    inside a SCROLLING flow needs. `'end'` is
 *                                    one line pushed to the right, which is
 *                                    what a plate inside a narrow COLUMN needs.
 * @param {string}   [o.cls]          an extra class, for a page's own rules.
 */
/**
 * 🔴 `'end'`, ADDED 2026-09-21 FOR `/twelve/`, AND IT IS A PLACEMENT RATHER
 * THAN A PAGE'S RULE. Asked: *"Move model 12 to roght panel top right corner.
 * No brand name"*. A plate carrying ONE line cannot use either of the other
 * two: `ends` is `space-between`, which parks a lone child on the LEFT, and
 * `mid` centres it. Neither is the corner that was asked for.
 * ⚠️ **AND IT IS THE THIRD PLACEMENT, NOT A THIRD STYLESHEET.** The alternative
 * was a `cls` and a rule in the page, which is how three replicas ended up
 * setting their nameplates three ways and why this component exists. A
 * placement is arrangement, and arrangement is what this file owns.
 */
export function createNameplate(o = {}) {
  const { lines = [], place = 'ends', cls = '' } = o;
  if (place !== 'ends' && place !== 'mid' && place !== 'end') {
    throw new Error(`createNameplate: place is 'ends', 'mid' or 'end', not ${JSON.stringify(place)}`);
  }
  // 🔴 REFUSED RATHER THAN DRAWN EMPTY. A plate with nothing on it is a
  // container with nothing in it painting its own edges, which is the shape this
  // project has already shipped twice as a horizontal rule nobody wrote.
  if (!lines.length) throw new Error('createNameplate: a nameplate with no lines is furniture');
  const root = document.createElement('div');
  root.className = cls ? `panel-plate ${cls}` : 'panel-plate';
  // ⚠️ THE VALUE IS ALWAYS WRITTEN, because the stylesheet matches
  // `[data-place="ends"]` rather than a bare `[data-place]`: an attribute
  // selector matches on PRESENCE, and an empty one would satisfy a bare test.
  root.dataset.place = place;
  const parts = lines.map((t) => {
    const e = el('div', 'panel-plate-l', t);
    root.append(e);
    return e;
  });

  /**
   * What the browser RENDERS, not what was typed.
   *
   * 🔴 THIS IS THE HALF THAT MAKES AN UPPERCASE CHECK WORTH ANYTHING, and it was
   * copied into three pages before it lived anywhere. `/circuit/` rendered
   * `NOVATION` correctly while its source typed `novation`, leaning entirely on
   * `text-transform`, and a check reading `textContent` graded the source and
   * stayed green either way. Reading the transform means neither half can go
   * missing and leave the other looking right.
   */
  function shown() {
    return parts.map((e) => {
      const t = (e.textContent || '').trim();
      return getComputedStyle(e).textTransform === 'uppercase' ? t.toUpperCase() : t;
    });
  }

  return { el: root, lines: parts, place, shown };
}
