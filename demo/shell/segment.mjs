// demo/shell/segment.mjs: a seven segment display drawn in SVG, unlit bars still faintly there.
//   createSegment({ digits: 3 }).set(127)
// Too wide shows dashes and returns { over }; unmeasured shows blank; GLYPHS refuses the rest.
// why: lessons/kit-segment.md#header

import { el } from './shell.mjs';

/** The seven bars, named the way every datasheet names them: `a` across the
 *  top, then clockwise, with `g` across the middle. */
export const SEGMENTS = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

/**
 * Character to the bars it lights (a top, b c right, d bottom, e f left, g middle).
 * b and d are lowercase on purpose; segmentsFor tries both cases.
 * why: lessons/kit-segment.md#glyphs
 */
export const GLYPHS = {
  0: 'abcdef',
  1: 'bc',
  2: 'abdeg',
  3: 'abcdg',
  4: 'bcfg',
  5: 'acdfg',
  6: 'acdefg',
  7: 'abc',
  8: 'abcdefg',
  9: 'abcdfg',
  A: 'abcefg',
  b: 'cdefg',
  C: 'adef',
  d: 'bcdeg',
  E: 'adefg',
  F: 'aefg',
  H: 'bcefg',
  L: 'def',
  n: 'ceg',
  o: 'cdeg',
  P: 'abefg',
  r: 'eg',
  S: 'acdfg',
  t: 'defg',
  U: 'bcdef',
  u: 'cde',
  '-': 'g',
  _: 'd',
  ' ': '',
};

/** Everything the table can draw, for a page that wants to say so. */
export const DRAWABLE = Object.keys(GLYPHS).join('');

/** The one pair that draws identically. Asserted to be the only one. */
export const COLLISIONS = [['5', 'S']];

/** A cell with nothing in it, and what a field shows when a value will not fit. */
export const BLANK_CHAR = ' ';
export const OVER_CHAR = '-';

/**
 * The bars a character lights, or null if this display cannot draw it.
 * '' for a space is a correct answer, so callers compare against null.
 * why: lessons/kit-segment.md#segments-for
 */
export function segmentsFor(ch) {
  if (typeof ch !== 'string' || ch.length === 0) return null;
  if (Object.hasOwn(GLYPHS, ch)) return GLYPHS[ch];
  const up = ch.toUpperCase();
  if (Object.hasOwn(GLYPHS, up)) return GLYPHS[up];
  const low = ch.toLowerCase();
  if (Object.hasOwn(GLYPHS, low)) return GLYPHS[low];
  return null;
}

/**
 * THE GEOMETRY, IN ONE PLACE, IN THE UNITS OF THE `viewBox`.
 *
 * Nothing below types a coordinate: `bars()` derives all seven polygons from
 * these five numbers, so changing the bar thickness is changing `T`.
 *
 *   W        how wide one glyph is
 *   H        how tall one glyph is
 *   T        how thick a bar is
 *   J        the notch where two bars meet, so a corner reads as two parts
 *   DOT_W    the slot a decimal point sits in, to the right of its own glyph
 *   SPACE    the air between glyphs on a display with no decimal point
 */
export const GEO = { W: 12, H: 20, T: 2.6, J: 0.7, DOT_W: 5, SPACE: 3.4 };

/**
 * Rounded to 0.01, because these become a viewBox and 12 + 3.4 is not 15.4 in binary.
 * why: lessons/kit-segment.md#round2
 */
const round2 = (v) => Math.round(v * 100) / 100;

/** One glyph plus whatever sits to the right of it. */
export const advance = (dot) => round2(GEO.W + (dot ? GEO.DOT_W : GEO.SPACE));

/**
 * How wide the field is in viewBox units; the trailing dot slot is kept only on a decimal display.
 * why: lessons/kit-segment.md#field-w
 */
export const fieldW = (digits, dot) => round2(digits * advance(dot) - (dot ? 0 : GEO.SPACE));

/** Where a decimal point sits inside its own cell. */
const DOT_X = GEO.W + 2;
const DOT_Y = GEO.H - GEO.T / 2;
const DOT_R = GEO.T * 0.42;

/**
 * WHAT N CELLS SHOW FOR A GIVEN VALUE. This is the whole of the component's
 * arithmetic and it touches no DOM, which is why `segment-test.mjs` can grade
 * it with no browser at all. Every boundary this display has lives in here.
 *
 * @param {number|string|null|undefined} value
 * @param {{digits?:number, decimals?:number, dot?:boolean}} [opts]
 * @returns {{cells:{ch:string,dp:boolean,on:string}[], text:string, asked:string,
 *            blank:boolean, over:boolean, why:string}}
 *   `cells` is one entry per digit, left to right, each carrying the character,
 *   whether its decimal point is lit, and the bars to light.
 *   `text` is exactly what is on the field, leading blanks and all.
 *   `asked` is what the caller wanted, which is the half a display that has
 *   overflowed cannot show and must not lose.
 */
export function layout(value, opts = {}) {
  const digits = Math.max(1, Math.trunc(opts.digits ?? 3));
  const decimals = Math.max(0, Math.trunc(opts.decimals ?? 0));
  const dot = opts.dot ?? decimals > 0;

  const blankOut = () => ({
    cells: Array.from({ length: digits }, () => ({ ch: BLANK_CHAR, dp: false, on: '' })),
    text: BLANK_CHAR.repeat(digits),
    asked: '',
    blank: true,
    over: false,
    why: 'nothing to show',
  });
  const overOut = (asked, why) => ({
    cells: Array.from({ length: digits },
      () => ({ ch: OVER_CHAR, dp: false, on: GLYPHS[OVER_CHAR] })),
    text: OVER_CHAR.repeat(digits),
    asked,
    blank: false,
    over: true,
    why,
  });

  // '', null, undefined and NaN are blank, never 000.
  // why: lessons/kit-segment.md#blank
  if (value === undefined || value === null || value === '') return blankOut();
  if (typeof value === 'number' && Number.isNaN(value)) return blankOut();
  // An infinity is measured but fits no field, so it overflows rather than going blank.
  // why: lessons/kit-segment.md#infinity
  if (typeof value === 'number' && !Number.isFinite(value)) {
    return overOut(String(value), 'no field is wide enough');
  }

  const asked = typeof value === 'number' ? value.toFixed(decimals) : String(value).trim();
  if (asked === '') return blankOut();

  // A decimal point rides the cell before it and costs no cell, so 12.5 fits three digits.
  // why: lessons/kit-segment.md#decimal-point
  const cells = [];
  for (const ch of asked) {
    if (ch === '.' || ch === ',') {
      // A field built with no dot slot has nowhere to put one. Dropping it
      // silently would turn 1.5 into 15, so the field refuses and says why.
      if (!dot) return overOut(asked, 'no decimal point on this display');
      const last = cells[cells.length - 1];
      if (last && !last.dp) { last.dp = true; continue; }
      // A leading dot, or a second one in a row, gets a blank cell to sit on.
      cells.push({ ch: BLANK_CHAR, dp: true });
      continue;
    }
    cells.push({ ch, dp: false });
  }

  for (const c of cells) {
    const on = segmentsFor(c.ch);
    if (on === null) return overOut(asked, `no way to draw "${c.ch}"`);
    c.on = on;
  }

  if (cells.length > digits) return overOut(asked, `${cells.length} characters in ${digits} digits`);

  // Right aligned, because that is where a number's units belong, and padded
  // with BLANKS rather than zeros for the reason above.
  while (cells.length < digits) cells.unshift({ ch: BLANK_CHAR, dp: false, on: '' });

  const text = cells.map((c) => c.ch + (c.dp ? '.' : '')).join('');
  return { cells, text, asked, blank: false, over: false, why: 'fits' };
}

/**
 * The seven polygons of one glyph, derived from `GEO`.
 *
 * A horizontal bar is a chamfered hexagon centred on `cy`; a vertical one is
 * the same shape stood up. The mitres are what make a corner read as two parts
 * rather than one bent one, and `J` is the notch between them.
 */
function bars(thick) {
  const { W, H, J } = GEO;
  // Bar thickness is the one part of the glyph that is a look; it defaults to GEO.T.
  // why: lessons/kit-segment.md#thickness
  const T = thick ?? GEO.T;
  const h = T / 2;
  const mid = H / 2;
  const n = (v) => Number(v.toFixed(2));
  const hbar = (cy, x0, x1) => [
    [x0, cy], [x0 + h, cy - h], [x1 - h, cy - h], [x1, cy], [x1 - h, cy + h], [x0 + h, cy + h],
  ].map(([x, y]) => `${n(x)},${n(y)}`).join(' ');
  const vbar = (cx, y0, y1) => [
    [cx, y0], [cx + h, y0 + h], [cx + h, y1 - h], [cx, y1], [cx - h, y1 - h], [cx - h, y0 + h],
  ].map(([x, y]) => `${n(x)},${n(y)}`).join(' ');

  const left = h;
  const right = W - h;
  const x0 = h + J;
  const x1 = W - h - J;
  return {
    a: hbar(h, x0, x1),
    b: vbar(right, h + J, mid - J),
    c: vbar(right, mid + J, H - h - J),
    d: hbar(H - h, x0, x1),
    e: vbar(left, mid + J, H - h - J),
    f: vbar(left, h + J, mid - J),
    g: hbar(mid, x0, x1),
  };
}

// Backlit (light bars on a dark field) and reflective (dark bars on pale grey green) are the
// object being drawn, not the page theme, and each carries its own ghost. The backlit ink
// is nearly neutral on purpose: contrast 8.28:1.
// why: lessons/kit-segment.md#schemes
export const SCHEMES = {
  /** A lamp behind the glass. Light bars, dark field. */
  backlit: { ink: '#a8b2be', back: '#141820', ghost: 0.32 },
  /** No lamp. Dark bars on the pale grey green of undriven crystal. */
  reflective: { ink: '#1c2a1e', back: '#9fb094', ghost: 0.24 },
};

/**
 * The scheme a name asks for, or null; it refuses rather than falling back.
 * why: lessons/kit-segment.md#scheme-for
 */
export function schemeFor(name) {
  if (name == null) return null;
  return Object.hasOwn(SCHEMES, name) ? SCHEMES[name] : null;
}

/**
 * A segment display: a field of N digits, every unlit bar still faintly drawn.
 * @param {object} [o]
 * @param {number} [o.digits=3]     how many cells
 * @param {number} [o.decimals=0]   places drawn for a number; turns the dot on
 * @param {boolean} [o.dot]         reserve a decimal point slot per cell
 * @param {number|string} [o.value] what to show at birth; blank by default
 * @param {number} [o.size]         glyph height in px, as `--disp-h`
 * @param {string} [o.ink]          lit colour, as `--disp-ink`
 * @param {string} [o.back]         backlight, as `--disp-back`
 * @param {number} [o.thick]        bar weight in glyph units, against GEO.T's 2.6
 * @param {number} [o.ghost]        how visible an unlit bar is, as `--disp-ghost`
 * @param {'backlit'|'reflective'} [o.scheme='backlit']  ink, back and ghost override it
 * @param {boolean} [o.frame=true]  false drops the box, so two can share one
 * @param {string} [o.title]        the standing tooltip
 * @param {string} [o.cls]
 * @returns {{el:HTMLElement, svg:SVGElement, digits:number, decimals:number,
 *            dot:boolean,
 *            set:(v:any)=>ReturnType<typeof layout>,
 *            value:()=>any, text:()=>string, reading:()=>ReturnType<typeof layout>,
 *            lit:()=>number}}
 * why: lessons/kit-segment.md#create-segment
 */
export function createSegment({
  digits = 3, decimals = 0, dot, value = '', size, ink, back, ghost, scheme, thick,
  frame = true, title, cls = '',
} = {}) {
  const n = Math.max(1, Math.trunc(digits));
  const dec = Math.max(0, Math.trunc(decimals));
  const hasDot = dot ?? dec > 0;

  // `role="img"` and an `aria-label` kept in step, and deliberately NOT a live
  // region: a field that announced itself on every change would talk over a
  // page sixty times a second.
  const root = el('span', `pos-disp${frame ? '' : ' pos-disp-bare'} ${cls}`.trim(),
    '', { role: 'img' });

  // A component that varies a property per instance sets a CUSTOM property,
  // never the property, so a stylesheet can still reach it.
  if (size != null) root.style.setProperty('--disp-h', typeof size === 'number' ? `${size}px` : size);

  // The scheme first, then ink, back and ghost over it. An unknown scheme name throws.
  // why: lessons/kit-segment.md#scheme-overrides
  if (scheme != null) {
    const sc = schemeFor(scheme);
    if (!sc) {
      throw new Error(`createSegment: no scheme called ${JSON.stringify(scheme)}. `
        + `Known: ${Object.keys(SCHEMES).join(', ')}`);
    }
    root.style.setProperty('--disp-ink', sc.ink);
    root.style.setProperty('--disp-back', sc.back);
    root.style.setProperty('--disp-ghost', String(sc.ghost));
    root.dataset.scheme = scheme;
  }
  if (ink) root.style.setProperty('--disp-ink', ink);
  if (back) root.style.setProperty('--disp-back', back);
  if (ghost != null) root.style.setProperty('--disp-ghost', String(ghost));

  const B = bars(thick);
  const adv = advance(hasDot);
  const w = fieldW(n, hasDot);
  let inner = '';
  for (let i = 0; i < n; i++) {
    inner += `<g transform="translate(${Number((i * adv).toFixed(2))} 0)">`;
    for (const s of SEGMENTS) {
      inner += `<polygon class="pos-disp-p" data-seg="${s}" points="${B[s]}"/>`;
    }
    if (hasDot) {
      inner += `<circle class="pos-disp-p pos-disp-dot" data-seg="dp" cx="${DOT_X}"`
        + ` cy="${DOT_Y}" r="${Number(DOT_R.toFixed(2))}"/>`;
    }
    inner += '</g>';
  }
  // Both attributes AND the CSS height: the attributes are what a render with
  // no stylesheet gets, and `width: auto` in shell.css lets the height decide.
  root.innerHTML = `<svg class="pos-disp-svg" viewBox="0 0 ${Number(w.toFixed(2))} ${GEO.H}"`
    + ` width="${Number(w.toFixed(2))}" height="${GEO.H}" aria-hidden="true"`
    + ` focusable="false" preserveAspectRatio="xMidYMid meet">${inner}</svg>`;
  const svg = root.firstElementChild;

  // One lookup per cell, built once, so `set` only flips classes.
  const groups = [...svg.children].map((g) => {
    const map = new Map();
    for (const p of g.children) map.set(p.dataset.seg, p);
    return map;
  });

  let asked = value;
  let drawn = null;

  const set = (v) => {
    const r = layout(v, { digits: n, decimals: dec, dot: hasDot });
    asked = v;
    drawn = r;
    r.cells.forEach((c, i) => {
      const g = groups[i];
      for (const [s, node] of g) {
        node.classList.toggle('on', s === 'dp' ? c.dp : c.on.includes(s));
      }
    });
    // Classes rather than data attributes: `[data-x]` matches an EMPTY
    // attribute, so a field that had overflowed once would have kept the state
    // for the rest of the page's life.
    root.classList.toggle('over', r.over);
    root.classList.toggle('blank', r.blank);
    const spoken = r.blank ? 'nothing to show' : r.text.trim();
    root.setAttribute('aria-label', spoken);
    // A value that did not fit survives in the tooltip, over the caller's title; set() returns it too.
    // why: lessons/kit-segment.md#over-tooltip
    root.title = r.over ? `${r.asked} does not fit` : (title ?? spoken);
    return r;
  };
  set(value);

  return {
    el: root,
    svg,
    digits: n,
    decimals: dec,
    dot: hasDot,
    set,
    /** What was last asked for, which is not always what is drawn. */
    value: () => asked,
    /** What is drawn, leading blanks and all. */
    text: () => drawn.text,
    /** The whole of the last reading, including `over` and `why`. */
    reading: () => drawn,
    /**
     * How many parts are lit, READ OFF THE PICTURE rather than off `GLYPHS`.
     * That is the point of it: a check comparing this against the table is
     * comparing two independent sources, so the two can disagree.
     */
    lit: () => svg.querySelectorAll('.pos-disp-p.on').length,
  };
}
