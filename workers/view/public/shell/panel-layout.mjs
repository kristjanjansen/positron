// demo/shell/panel-layout.mjs: a hardware panel. A fixed column that does not scroll, a strip
// of controls that does, a nameplate, and a case around the lot. Not panel.mjs, which is the
// XR canvas panel; classes are .panel-, not .pan-. The full contract is on .panel in shell.css.
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
// Exactly one flow child absorbs the slack; check() reports rather than throws, and only
// after layout. Nothing here sets a height from JavaScript: a component sets a custom property.
// why: lessons/kit-panel-layout.md#header

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
     * Which edge a side plate is glued to, separate from side (the fixed column's edge).
     * Read only when the plate's place is side.
     * why: lessons/kit-panel-layout.md#plate-side
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
   * The panel places its own nameplate, so its spacing lives here and not in each page.
   * Takes options { lines, place } or a built createNameplate object.
   * why: lessons/kit-panel-layout.md#nameplate
   */
  let plate = null;
  if (plateOpts) {
    plate = plateOpts.el && plateOpts.lines ? plateOpts : createNameplate(plateOpts);
    root.append(plate.el);
    /**
     * A side plate turns the case into two columns by an attribute, no new element,
     * decided by the plate's own place.
     * why: lessons/kit-panel-layout.md#side-plate-grid
     */
    if (plate.place === 'side') root.dataset.plateSide = plateSide;
  }

  let wrap = null, fixed = null;
  // The scroller is always built: a panel has exactly one scrolling region.
  // why: lessons/kit-panel-layout.md#scroller
  const strip = el('div', add(`panel-strip${side ? ` panel-strip-${side[0]}` : ''}`, cls.strip));
  // The scroller takes focus and a role where asked, for a reader who cannot see the border.
  // why: lessons/kit-panel-layout.md#scroller-focus
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
   * A band is a block across the case and a seam the rule between two. A seam must be a case
   * child: inside the scroller it is as wide as the widest row and scrolls with it.
   * --panel-row and --panel-rows are written only on a grid (side plate) case.
   * why: lessons/kit-panel-layout.md#bands
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
   * Stack a block across the case, after the scroller. The class is applied here because
   * .panel-band carries the block inset; without it bands lose all vertical rhythm.
   * why: lessons/kit-panel-layout.md#band
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
   * Take a band back out, drop its class and renumber the rest, so the grid rows stay whole.
   * A no-op on anything that is not a band of this case.
   * why: lessons/kit-panel-layout.md#unband
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
   * Name the child that absorbs the slack. The class is applied here because a missing
   * class typed on a page breaks nothing visibly.
   * why: lessons/kit-panel-layout.md#grow
   */
  function grow(child) {
    if (!child) return absorber;
    // The previous absorber gives the class up: exactly one grows.
    // why: lessons/kit-panel-layout.md#grow-previous
    if (absorber && absorber !== child) absorber.classList.remove('panel-grow');
    absorber = child;
    child.classList.add('panel-grow');
    return absorber;
  }
  if (growEl) grow(growEl);

  /**
   * Measure the panel and report a flow with a definite height, slack, and no growing child.
   * The n - 1 gaps count as content.
   * @returns {{flowH:number, kidsH:number, gap:number, slack:number,
   *            growing:Element[], cuts:string[], measured:boolean}}
   * why: lessons/kit-panel-layout.md#check
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
    // A zero height is a panel nobody laid out (a closed tab), not one with no slack.
    // why: lessons/kit-panel-layout.md#check-unlaid
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
 * A rule across a panel, 1 px of --line, edge to edge only as a child of the case.
 * Exported for a case assembled by hand, as /kit/ does.
 * why: lessons/kit-panel-layout.md#panel-seam
 */
export function createPanelSeam() {
  return el('div', 'panel-seam');
}

/**
 * The maker and the model, printed on the case. Placement is an option, its ink is not.
 *
 * @param {object}   o
 * @param {string[]} o.lines          what is printed, typed uppercase in the source.
 * @param {string}   [o.place='ends'] 'ends' maker and model at either end, 'mid' a centred
 *                                    block for a scrolling flow, 'end' one line pushed right,
 *                                    'side' turned with writing-mode and glued down the case edge.
 * @param {string}   [o.cls]          an extra class, for a page's own rules.
 * @param {boolean}  [o.caps=true]    false keeps what was typed; no page passes it.
 * why: lessons/kit-panel-layout.md#create-nameplate
 */
export function createNameplate(o = {}) {
  const { lines = [], place = 'ends', cls = '', caps = true } = o;
  if (place !== 'ends' && place !== 'mid' && place !== 'end' && place !== 'side') {
    throw new Error(`createNameplate: place is 'ends', 'mid', 'end' or 'side', not ${JSON.stringify(place)}`);
  }
  // Refused rather than drawn empty: an empty plate is a container painting its own edges.
  // why: lessons/kit-panel-layout.md#no-lines
  if (!lines.length) throw new Error('createNameplate: a nameplate with no lines is furniture');
  const root = document.createElement('div');
  root.className = cls ? `panel-plate ${cls}` : 'panel-plate';
  // Always written: the stylesheet matches the value, and an empty attribute would match presence.
  // why: lessons/kit-panel-layout.md#place-written
  root.dataset.place = place;
  // A class rather than an attribute: it only turns the transform off.
  // why: lessons/kit-panel-layout.md#asis-class
  if (!caps) root.classList.add('panel-plate-asis');
  const parts = lines.map((t) => {
    const e = el('div', 'panel-plate-l', t);
    root.append(e);
    return e;
  });

  /**
   * What the browser renders, reading the computed transform, so an uppercase check
   * cannot pass on the source alone.
   * why: lessons/kit-panel-layout.md#shown
   */
  function shown() {
    return parts.map((e) => {
      const t = (e.textContent || '').trim();
      return getComputedStyle(e).textTransform === 'uppercase' ? t.toUpperCase() : t;
    });
  }

  return { el: root, lines: parts, place, shown };
}
