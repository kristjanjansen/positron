// demo/shell/panel-layout.mjs — A HARDWARE PANEL: a fixed column that does not
// scroll, a strip of controls that does, a nameplate, and a case around the lot.
//
//   const p = createPanelLayout({ side: 'left' });   // cased, column on the left
//   p.el                      the panel, to append to the page
//   p.fixed                   the column that stays put
//   p.strip                   the scroller
//   p.flow                    the column inside the scroller
//   p.grow(keysBox)           this child of the flow absorbs the slack
//   p.band(keysBox)           a block stacked under the strip, across the case
//   p.unband(keysBox)         take one back out, and renumber what is left
//   p.seam()                  a rule between two bands, edge to edge of the case
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
    cls = {}, strip: stripOpts = {}, plate: plateOpts = null,
    /**
     * 🔴 WHICH EDGE A `side` PLATE IS GLUED TO, AND IT IS A SEPARATE ARGUMENT
     * FROM `side` ON PURPOSE. `side` names the edge the FIXED COLUMN is on and
     * every caller has already decided it; deriving this from that one, say by
     * taking the opposite edge, would be this component guessing at a layout
     * question nobody asked it. Two facts, two arguments.
     * ⚠️ IT IS READ ONLY WHEN THE PLATE'S PLACEMENT IS `side`, so the seven
     * pages wearing a case today pass nothing and get exactly what they got.
     */
    plateSide = 'left',
  } = o;
  if (side !== null && side !== 'left' && side !== 'right') {
    throw new Error(`createPanelLayout: side is 'left', 'right' or null, not ${JSON.stringify(side)}`);
  }
  if (plateSide !== 'left' && plateSide !== 'right') {
    throw new Error(`createPanelLayout: plateSide is 'left' or 'right', not ${JSON.stringify(plateSide)}`);
  }

  const add = (base, extra) => (extra ? `${base} ${extra}` : base);
  const root = el('div', add(`panel${cased ? ' panel-case' : ''}`, cls.panel));

  /**
   * 🔴 THE PANEL PLACES ITS OWN NAMEPLATE SINCE 2026-09-22, AND EVERY PAGE THAT
   * PREPENDED ONE WAS PAYING FOR THE SPACING ITSELF. Reported against `/plai/`
   * as *"you failed afain on nameplate padding. after hrs work yesterday. why
   * not panel can have just nameplate support via nameplate component"*, and
   * the answer is that it can and now does.
   * 🔴 THE EVIDENCE WAS ONE LINE IN A PAGE: `demo/tom/index.html` carried
   * `.tom .panel-plate { padding: 16px 0 0 }`. `.panel-case` is
   * `padding: 0 var(--panel-pad)`, horizontal only, because `.panel-fixed` and
   * `.panel-strip` each supply their own `padding-block`. A plate prepended
   * from outside supplies none, so it sits on the top border, and the ONE page
   * that noticed fixed it in its own stylesheet. Every page after it inherited
   * the defect and not the fix.
   * ⚠️ **AND A WRAPPER DID NOT SOLVE IT, WHICH IS THE PART WORTH REMEMBERING.**
   * `instrument.mjs` was written the same day to stop five pages hand-rolling
   * this assembly, and it centralised the `prepend` while leaving the spacing
   * exactly where it was. **Centralising an assembly that does not own its own
   * layout moves the duplication rather than removing it.**
   * ⚠️ IT TAKES OPTIONS OR A BUILT PLATE. A caller with its own `createNameplate`
   * hands the object over; a caller with nothing hands over `{ lines, place }`
   * and never imports the component at all.
   */
  let plate = null;
  if (plateOpts) {
    plate = plateOpts.el && plateOpts.lines ? plateOpts : createNameplate(plateOpts);
    root.append(plate.el);
    /**
     * 🔴 A `side` PLATE TURNS THE CASE INTO TWO COLUMNS, AND IT DOES IT WITH AN
     * ATTRIBUTE RATHER THAN WITH A NEW ELEMENT. The case holds exactly two
     * children, the plate and the wrap or strip, so the arrangement is entirely
     * a stylesheet's business: no wrapper, no reparenting, and every page that
     * does not ask for this gets a DOM identical to yesterday's, which is the
     * property that makes this safe to land in shared kit before seven pages
     * are re-run.
     * ⚠️ IT IS WRITTEN FROM THE PLATE'S OWN `place` RATHER THAN FROM A SECOND
     * FLAG, so a caller cannot ask for a side column and a horizontal plate and
     * get a layout that means neither. One fact decides it.
     */
    if (plate.place === 'side') root.dataset.plateSide = plateSide;
  }

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

  /**
   * A band is a block stacked across the case, and a seam is the rule between
   * two of them.
   *
   * 🔴 ASKED FOR 2026-09-25: *"on each button group have horizontal panel
   * separator edge to edge"*, with a sketch of `/knobs/` drawing rules between
   * the rotaries, the keyboard and the footer. **EDGE TO EDGE IS THE WHOLE
   * DIFFICULTY AND IT DECIDES WHERE A SEAM MAY LIVE.**
   *
   * 🔴 **A SEAM IS A CHILD OF THE CASE. INSIDE THE SCROLLER IT IS NOT MERELY
   * HARD, IT IS IMPOSSIBLE, AND THAT WAS MEASURED RATHER THAN ARGUED.** A rule
   * put in `/knobs/`'s `.panel-flow` laid out at **992 px against a 686 px
   * case**, because the flow is `width: max-content` and holds a keyboard wider
   * than the panel, and 306 px of it sat behind `.panel-strip`'s
   * `overflow-x: auto`. Pulling it left with a negative margin made it wider
   * still and bought nothing: `scrollLeft` clamps at **0**, so inline-start
   * overflow inside a scroller is clipped and can never be reached. **A seam
   * between two rows of the flow is as wide as the widest row and scrolls with
   * it, which is not a separator, it is a line inside a picture.**
   *
   * ✅ **AS A CASE CHILD IT IS ONE NEGATIVE MARGIN AND NOTHING ELSE.** The
   * ancestor walk says why: `.panel-case` is `padding: 0 var(--panel-pad)`,
   * horizontal only, so between a case child and the case's inner edge there is
   * exactly ONE inset. MEASURED at 1280 px on the four cased pages, against
   * each case's own inner edges: `/shape/` **x297.0..983.0**, `/knobs/`
   * **x297.0..983.0**, `/evo/` **x297.0..983.0**, `/tom/` **x297.0..983.0**.
   * Two of those carry a side plate, one on each edge, and a rule 1 px tall.
   * ⚠️ **AND THAT IS `positron-ui`'S OWN RULE ABOUT THIS EXACT SHAPE**: *"when
   * you are writing a third override to escape a parent, you are in the wrong
   * container"*. The wrong container here is the scroller.
   *
   * 🔴 **THE NUMBERS BELOW ARE A ROW COUNT, WHICH IS NOT A MEASUREMENT.** A
   * case with a side plate is a GRID, and its plate has to span every band or
   * the rail stops under the first one. `grid-row: 1 / -1` cannot do it: with
   * no explicit rows the end line `-1` IS line 1, which this stylesheet already
   * records, so the plate spans one row and a full width seam is then pushed
   * past it by auto placement. MEASURED before the count existed: a four child
   * case laid out `1721.5px 70.5px 0px 0px 1px 70.5px`, six tracks for four
   * bands, with two empty ones the plate had blocked. With the count it is
   * `repeat(4, auto)`, the plate runs to the case's bottom on both pages, and
   * the seam crosses the rail.
   * ⚠️ **A CUSTOM PROPERTY, NEVER THE PROPERTY**, which is this file's standing
   * rule one line down from the one about heights. `--panel-row` and
   * `--panel-rows` are counts a stylesheet reads, so every rule about placement
   * stays in `shell.css` where it can be overridden and read.
   * ⚠️ **AND THEY ARE WRITTEN ONLY ON A GRID CASE.** A panel with no side plate
   * is a flex column, its bands stack by themselves, and an inline style nothing
   * reads on seven pages is a thing to explain later for no reason.
   */
  function layBands() {
    if (!root.dataset.plateSide) return 0;
    let n = 0;
    for (const kid of root.children) {
      if (plate && kid === plate.el) continue;
      kid.style.setProperty('--panel-row', String(++n));
    }
    root.style.setProperty('--panel-rows', String(n));
    return n;
  }

  /**
   * Stack a block across the case, under whatever is already there.
   *
   * ⚠️ IT APPENDS, AND THE SCROLLER IS THEREFORE ALWAYS THE FIRST BAND, because
   * `strip` is the one part of this component that is not optional and is built
   * before any caller can speak. A page that needs a band ABOVE it is one
   * argument away and nobody has asked for one.
   *
   * 🔴 THE CLASS IS APPLIED HERE RATHER THAN TYPED ON A PAGE, which is the
   * argument `grow()` already makes eight lines up and which this one needs
   * more: `.panel-band` carries the band's whole block inset, so a page that
   * forgot it would get a case with no vertical rhythm at all and nothing would
   * throw. **MEASURED on `/shape/` by the agent that tried to use this, nine
   * sections lifted out of the strip: ink from one section's last lane to the
   * next section's heading went from 40.0 px to 1.0 px, with the last band
   * 0.0 px off the case's inner bottom.** Fifty-two sliders in one unbroken
   * block with hairlines through it.
   * 🔴 AND THE CAUSE IS `/held/`'s LESSON A THIRD TIME: `.pos-stack` owns the
   * 40 px page rhythm as a margin on its own children, a block lifted out of a
   * stack stops being one of them, and `.panel-case` pads horizontally only, so
   * nothing replaced it. **A page with no siblings gets no rhythm, and a band
   * is exactly that.**
   */
  function band(block) {
    if (!block) return null;
    const e = block.el || block;
    e.classList.add('panel-band');
    root.append(e);
    layBands();
    return e;
  }

  /**
   * Take a band back out, and renumber what is left.
   *
   * 🔴 IT EXISTS BECAUSE THE ALTERNATIVE IS A PAGE SPLICING `case.children`,
   * AND THAT WOULD BREAK SILENTLY RATHER THAN VISIBLY. `band()` owns two things
   * a caller cannot see: the class that carries the inset, and the row numbers
   * a grid case is placed by. A page removing a band itself would leave
   * `--panel-rows` counting a child that has gone and `--panel-row` with a hole
   * in it, so the plate's rail would run past the end of the case and the band
   * after the hole would land in an empty track. Nothing throws and nothing
   * looks wrong until somebody opens the page, which is the `/blocks/` shape
   * this component already refuses once, for `grow`.
   * ⚠️ IT TAKES THE CLASS OFF AS WELL AS THE ELEMENT, so a block a page keeps
   * and puts back somewhere else does not carry a panel's inset with it into a
   * stack that already has its own.
   * ⚠️ AND IT IS A NO-OP ON ANYTHING THAT IS NOT A BAND OF THIS CASE, rather
   * than a throw, because a page swapping parts calls this on whatever it is
   * holding and half of those have already gone.
   */
  function unband(block) {
    if (!block) return null;
    const e = block.el || block;
    if (e.parentNode !== root || !e.classList.contains('panel-band')) return null;
    e.classList.remove('panel-band');
    e.style.removeProperty('--panel-row');
    e.remove();
    layBands();
    return e;
  }

  /** A rule between two bands, from one inner edge of the case to the other. */
  function seam() {
    const s = createPanelSeam();
    root.append(s);
    layBands();
    return s;
  }

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

  // The strip is band one, and the count has to exist before a caller adds a
  // second. On a panel with no side plate this returns 0 and writes nothing.
  layBands();

  return {
    el: root, wrap, fixed, strip, flow: flowEl, plate, cased, side,
    grow, band, unband, seam, check, cuts,
  };
}

/**
 * A rule across a panel, 1 px of `--line`.
 *
 * 🔴 IT IS ONLY EDGE TO EDGE AS A CHILD OF THE CASE, AND `createPanelLayout`'s
 * `seam()` IS HOW A PAGE GETS ONE THERE. Exported for a caller assembling a
 * case by hand, which `/kit/` does; everything about where it may live and what
 * was measured is beside `layBands` above.
 */
export function createPanelSeam() {
  return el('div', 'panel-seam');
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
/**
 * 🔴 `side`: THE PLATE TURNED ON ITS SIDE AND GLUED DOWN THE EDGE OF THE CASE,
 * ADDED 2026-09-25. Asked for on `/shape/`: *"wrap into isntrument box.
 * nameplate is \"shape\" vertical glued section"*. Every placement before it is
 * horizontal (`ends` on `/tom/`, `end` on `/twelve/` and in every header, `mid`
 * on `/evo/`), so this is a fourth placement rather than an option on one of
 * them, and it is built HERE so all seven pages wearing the case can have it
 * rather than one page rotating text in its own stylesheet.
 *
 * 🔴 AND IT DOES NOT UNDO *"rm nameplates"*. `instrument.mjs` records
 * `plate: false`, added 2026-09-22 on that ask, and the reason it gives is
 * specific and still true: **the status control already prints the
 * instrument's name in front of its state, so a plate BESIDE IT is the name
 * twice on one row.** That is an objection to a plate in the HEADER. A plate
 * turned ninety degrees and glued down the edge of the case is a different
 * object in a different place: it names the whole instrument the way the
 * silkscreen down the side of a real one does, it is nowhere near the status
 * control, and it cannot be the same fact twice because it is not on that row.
 * **Both decisions stand.** `plate: false` is still how a header gives its
 * plate up, and a page that wants the name on the case asks for this.
 *
 * ⚠️ `writing-mode`, NOT A `rotate`. A transform takes the element out of flow
 * and leaves a box the width of the text it used to be, so the column beside it
 * would be sized by a word lying down. `writing-mode` changes the box, so the
 * grid track is genuinely the height of the name and as narrow as its type.
 *
 * 🔴 `caps: false` KEEPS WHAT WAS TYPED, AND IT IS HERE BECAUSE THE ASK SAYS
 * `shape` IN LOWER CASE. `shell.css` uppercases every plate on a rule asked for
 * 2026-09-21 (*"replica names always in uppercase"*), which is about a shelf of
 * REPLICAS reading as one shelf: `/tom/`, `/twelve/`, `/circuit/` and `/evo/`
 * all name a machine somebody else made. `/shape/` is not a replica of
 * anything, the name asked for is the page's own slug, and `SHAPE` would be
 * this component answering a different question from the one it was asked.
 * ⚠️ IT IS A COMPONENT OPTION AND NOT A PAGE RULE, FOR THE REASON THIS FILE
 * ALREADY HAS IN WRITING one function up: `/tom/` fixed a plate in its own
 * stylesheet, *"every page after it inherited the defect and not the fix"*, and
 * it was reported again on `/plai/`. A page reaching into `.panel-plate-l` to
 * turn a transform off is that, exactly.
 * ⚠️ AND `shown()` BELOW ALREADY HANDLES IT, because it reads the COMPUTED
 * transform rather than assuming one. Nothing about the check changes.
 */
export function createNameplate(o = {}) {
  const { lines = [], place = 'ends', cls = '', caps = true } = o;
  if (place !== 'ends' && place !== 'mid' && place !== 'end' && place !== 'side') {
    throw new Error(`createNameplate: place is 'ends', 'mid', 'end' or 'side', not ${JSON.stringify(place)}`);
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
  /* ⚠️ A CLASS AND NOT AN ATTRIBUTE HERE, because this one only ever turns a
     transform OFF and there is nothing to match a value against. Everything
     said about `[data-place]` matching an empty attribute is about a property
     with three settings; this has two and the absence is the default. */
  if (!caps) root.classList.add('panel-plate-asis');
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
