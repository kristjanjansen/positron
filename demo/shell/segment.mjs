// demo/shell/segment.mjs — a seven segment display, drawn from its parts.
//
//   createSegment({ digits: 3 }).set(127)
//
// Asked for 2026-09-21: *"do we have lcd font (made of parts/lines)? its 3
// digits"*. We did not. `/kit/` had 25 sections and none of them was a display,
// `/evo/`'s `.evo-lcd` is a monospace text box that reads as an LCD because of
// its two colours and nothing else, and the only font files in this repository
// are Gabarito for `/weight/`.
//
// 🔴 DRAWN, NOT A VENDORED FONT, AND THE GHOSTS ARE THE REASON. What makes a
// panel read as an LCD rather than as coloured text is that every UNLIT segment
// is still faintly there: you can see the `8` behind the `1`. Drawn, that is one
// opacity on the off set and nothing else. In a font it is a dimmed `8` stacked
// behind every digit and kept in register with it, at every size, forever.
// A drawn digit is also a fixed box BY CONSTRUCTION, which this project has a
// rule about (nothing that redraws live may change how much room it takes), and
// it avoids a licence question and a third file to deploy.
//
// 🔴 SVG RATHER THAN CSS, AND HERE IS THE ARGUMENT SO IT IS NOT RE-OPENED.
// A segment is a hexagon with mitred ends. In CSS each one is a `clip-path:
// polygon(...)` on a box, which is the same point list with the coordinate
// system taken away: every number becomes a percentage of a box sized somewhere
// else, so changing the bar thickness means re-deriving seven lists of
// percentages by hand. In SVG the thickness is `GEO.T`, typed once, and all
// seven polygons are generated from it by `bars()` below. The whole field then
// scales from ONE number, because a `viewBox` scales: a CSS build has to
// re-derive every length from a font size, and at small sizes the rounding
// shows up on a polygon's edge where it would not on a border.
// ⚠️ THE ONE THING SVG COSTS IS THAT A PAGE'S TYPE RULES CANNOT REACH IT.
// `font-size` and `letter-spacing` do nothing to a display. That is the feature:
// a readout must not change width because a page changed its type.
//
// 🔴 IT IS `.pos-disp`, NOT `.pos-seg`, AND THAT NAME WAS ALREADY TAKEN.
// `.pos-seg` is the SEGMENTED ROW join in shell.css, which carries
// `.pos-seg > * { border-radius: 0 }` and `.pos-seg > * + * { margin-left:
// -1px }`. A display called `.pos-seg` would have had its digits overlapped by
// one pixel each and its corners squared, by rules written for a row of
// buttons, with nothing in either file pointing at the other. Found before
// shipping by grepping the name.
//
// ── SEVEN SEGMENT, N DIGITS, AND NO LETTERS ON SPEC ────────────────────────
//
// The caller says how many digits. `/evo/` wants three. Fourteen segment is NOT
// built: letters in general need it, and a page that needs to spell something
// is the moment to build it rather than now. What IS here is the closed list of
// characters seven segments really draw, in `GLYPHS`, so a panel can say `ON`,
// `OFF`, `rEC`, `SEt`, `HI`, `LO` and the hex digits.
// ⚠️ ANYTHING OUTSIDE THAT LIST IS REFUSED, NEVER APPROXIMATED TO THE NEAREST
// SHAPE. A `K` drawn as an `H` is a display telling a reader something that is
// not so, which is worse than a display saying it cannot.
// ⚠️ `I` AND `O` ARE DELIBERATELY ABSENT. Seven segments draw them identically
// to `1` and `0`, so a field reading `10` would be unreadable as `IO`, and both
// turn up inside strings that look like numbers. `S` is kept even though it is
// identical to `5`, because `SEt` and `StoP` need it and nothing spells a
// number with an S in it. That collision is the only one in the table and
// `segment-test.mjs` asserts it is the only one.
//
// ── TWO THINGS THAT WERE OPEN, AND WHAT THEY WERE DECIDED TO ──────────────
//
// 🔴 1. A SECOND SMALLER FIELD IS TWO DISPLAYS, NOT AN OPTION ON ONE.
// The real MK-425C has a three digit field and a small two digit one in the
// same window. This component does NOT take a `sub:` option, and a page that
// wants that panel builds two displays and puts them in one box of its own
// (`/kit/` shows exactly that arrangement). The reason is that two fields are
// two independent values, so an option would have bought two `set` calls, two
// blank policies and two overflow policies inside one component, and the
// caller would still have had to say which one it was talking to. What a
// display IS is one field of N digits; how two of them sit on a panel is a
// LAYOUT claim, and this project already keeps those on the page.
// ✅ WHAT MAKES THAT WORKABLE IS `frame: false`, which drops the border and the
// backlight so two bare displays can share one window the page draws. Without
// it the decision would have been a refusal rather than a decision, because two
// framed boxes are not a panel.
//
// 🔴 2. A NUMBER TOO WIDE FOR THE FIELD SHOWS DASHES AND SAYS SO. It does NOT
// show the low digits. An odometer rolling `1234` into three digits shows
// `234`, which is a wrong number printed confidently, and the reader has no way
// to know. So every cell shows its middle bar, the field takes a `.over` class,
// the tooltip becomes the value that would not fit, and `set()` RETURNS
// `{ over: true, asked, why }` so the page can log it.
// ⚠️ DASHES AND BLANK ARE DIFFERENT ON PURPOSE, which is the whole reason the
// ghosts matter. `---` means *this value does not fit here*. A field with every
// segment off, ghosts showing, means *nothing has been measured yet*, which is
// this project's readout rule: nothing unmeasured prints as `0`, because a zero
// reads as a very confident measurement of nothing.
//
// ── WHAT IS NOT HERE, AND WHY ─────────────────────────────────────────────
//
// No lean. A real calculator's digits are skewed, and a skew changes the width
// of the box, which is the one thing this component guarantees.
// No `pad: '0'`. Nobody has asked for `007`, and a caller who wants it passes
// the string `'007'`, which the table draws as typed.
// No label option. A caption is furniture and belongs to the page around it;
// the control layout contract in shell.css is about controls, and this is a
// picture. Nothing here takes a pointer.
// No `destroy`. There is no timer, no listener and no socket in it.

import { el } from './shell.mjs';

/** The seven bars, named the way every datasheet names them: `a` across the
 *  top, then clockwise, with `g` across the middle. */
export const SEGMENTS = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

/**
 * Character to the bars it lights, as a string of segment letters.
 *
 *      aaa
 *     f   b
 *     f   b
 *      ggg
 *     e   c
 *     e   c
 *      ddd
 *
 * ⚠️ CASE IS LOAD-BEARING AND `segmentsFor` SMOOTHS IT OVER. Some of these
 * letters only exist in one case on seven segments: a capital `B` is an `8` and
 * a capital `D` is a `0`, so the table holds `b` and `d` lowercase. A caller
 * writing `'ON'` or `'B'` still gets the right shape, because `segmentsFor`
 * tries the character as given and then both cases of it.
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
 * The bars a character lights, or `null` if this display cannot draw it.
 *
 * ⚠️ IT RETURNS `''` FOR A SPACE, WHICH IS FALSY AND IS NOT AN ABSENCE. Every
 * caller compares against `null`, never on truthiness: a blank cell lights
 * nothing and that is a correct answer, while `K` has no answer at all.
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
 * ⚠️ ROUNDED, BECAUSE THESE NUMBERS BECOME A `viewBox` AND A `translate`.
 * `12 + 3.4` is not 15.4 in binary, so three of them less one gap came out as
 * 42.800000000000004 and the test comparing one digit's worth of width against
 * the difference between two fields read as a real failure. Two decimal places
 * is finer than a hundredth of a glyph and nothing here needs more.
 */
const round2 = (v) => Math.round(v * 100) / 100;

/** One glyph plus whatever sits to the right of it. */
export const advance = (dot) => round2(GEO.W + (dot ? GEO.DOT_W : GEO.SPACE));

/**
 * How wide the whole field is, in `viewBox` units.
 *
 * ⚠️ THE TRAILING SLOT IS KEPT ON A DECIMAL DISPLAY AND DROPPED OTHERWISE. A
 * dot after the last digit is a thing a display really shows (`125.`), so the
 * room for it has to be inside the picture. With no dots there is nothing to
 * reserve, and leaving the gap in would have laid the field 2 px left of the
 * centre of its own frame.
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

  // 🔴 NOTHING MEASURED IS BLANK, NEVER A ZERO. The readout rule, in the one
  // place a display could get it wrong: `''`, `null`, `undefined` and `NaN` are
  // four ways of saying we have not looked, and a field reading `000` is a very
  // confident measurement of nothing.
  if (value === undefined || value === null || value === '') return blankOut();
  if (typeof value === 'number' && Number.isNaN(value)) return blankOut();
  // ⚠️ AND AN INFINITY IS NOT THE SAME FACT. It is a measured value with no
  // room on any field, so it overflows rather than going blank.
  if (typeof value === 'number' && !Number.isFinite(value)) {
    return overOut(String(value), 'no field is wide enough');
  }

  const asked = typeof value === 'number' ? value.toFixed(decimals) : String(value).trim();
  if (asked === '') return blankOut();

  // 🔴 A DECIMAL POINT RIDES THE CELL BEFORE IT AND COSTS NO CELL, which is how
  // hardware does it and is why `12.5` fits a three digit field. Counting the
  // dot as a character is the obvious implementation and it would overflow a
  // reading that a real display shows without trouble.
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
  /* 🔴 THICKNESS IS A PARAMETER SINCE 2026-09-23, ASKED ON `/evo/` AS
     *"segmented should be skinnier numbers"*. Everything else in `GEO` is the
     GLYPH, which every display on the site shares so that two fields side by
     side are the same typeface; the bar's weight is the only part of it that is
     a look rather than a shape, and a panel mirror wants a lighter one than a
     meter does. It defaults to `GEO.T`, so every existing caller is untouched. */
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

/**
 * 🔴 TWO KINDS OF LIQUID CRYSTAL DISPLAY, AND THEY ARE NOT EACH OTHER'S THEME.
 * Asked 2026-09-21: *"have iption on segmentdisplay to inverse color:
 * green-grayish"*.
 *
 * A **backlit** display glows: a lamp behind the glass, so a lit bar is bright
 * and the field behind it is dark. That is the default here and it is what the
 * Circuit and the MK-425C have.
 *
 * A **reflective** one does not glow at all. It has no lamp, it borrows the
 * light in the room, and the crystal goes DARK where it is driven, so the
 * picture is inverted: near black bars on a pale grey green field. That is a
 * calculator, a multimeter, a Nokia, and almost every panel with a small
 * readout made before about 2005.
 *
 * ⚠️ THEY ARE A PROPERTY OF THE OBJECT BEING DRAWN, NOT OF THE PAGE'S THEME.
 * A page in a dark theme showing a reflective display is correct, because the
 * real instrument on the desk is pale in a dark room. So this is a caller's
 * choice about what it is a picture OF, and nothing here reads
 * `prefers-color-scheme`.
 *
 * ⚠️ AND THE UNLIT BARS MOVE WITH IT, WHICH IS THE HALF THAT IS EASY TO MISS.
 * On a backlit display an unlit bar is a bit of unlit glass and is nearly
 * invisible. On a reflective one it is the SAME pale field as the background
 * with only the faintest tint, and a reader sees it clearly, because the
 * contrast between driven and undriven crystal is low. Copying the backlit
 * ghost value across gives a reflective display that reads as a much cheaper
 * one, so each scheme carries its own.
 */
/* 🔴 AND THE BACKLIT ONE IS NEARLY NEUTRAL, WHICH IT WAS NOT UNTIL
   2026-09-21. Asked: *"reduce blue hue a lot in segm control"*. It was
   `#8fb6ff` on `#0d1830`, which is a **fully saturated** blue ink (HSL
   saturation 100 per cent) on a 57 per cent field, and at that strength the
   colour was the loudest thing about any panel carrying one.
   MEASURED, before and after: ink saturation **100 -> 14 per cent**, field
   **57 -> 23**, and the blue-minus-red spread **112 -> 22** on the ink and
   **35 -> 12** on the field. What did NOT move is the legibility: contrast
   **8.65:1 -> 8.28:1**, so the readout is as readable as it was.
   ⚠️ A TRACE OF BLUE IS KEPT ON PURPOSE. Taken to a true neutral this stops
   reading as a lamp behind glass and starts reading as an LED, and the two
   kinds of display are the distinction this whole table exists to draw. */
export const SCHEMES = {
  /** A lamp behind the glass. Light bars, dark field. */
  backlit: { ink: '#a8b2be', back: '#141820', ghost: 0.32 },
  /** No lamp. Dark bars on the pale grey green of undriven crystal. */
  reflective: { ink: '#1c2a1e', back: '#9fb094', ghost: 0.24 },
};

/** The scheme a name asks for, or null for a name nothing answers.
 *  ⚠️ IT REFUSES RATHER THAN FALLING BACK, for the reason the glyph table
 *  refuses a character it cannot draw: a display quietly showing the wrong
 *  colours is a display lying about which instrument it is. */
export function schemeFor(name) {
  if (name == null) return null;
  return Object.hasOwn(SCHEMES, name) ? SCHEMES[name] : null;
}

/**
 * A SEGMENT DISPLAY. A picture of a field of N digits, with every unlit bar
 * still faintly drawn.
 *
 * @param {object} [o]
 * @param {number} [o.digits=3]     how many cells
 * @param {number} [o.decimals=0]   places drawn for a number; turns the dot on
 * @param {boolean} [o.dot]         reserve a decimal point slot per cell
 * @param {number|string} [o.value] what to show at birth; blank by default
 * @param {number} [o.size]         glyph height in px, as `--disp-h`
 * @param {string} [o.ink]          lit colour, as `--disp-ink`
 * @param {string} [o.back]         backlight, as `--disp-back`
 * @param {number} [o.thick]        how heavy a bar is, in the glyph's own units
 *   against `GEO.T`'s 2.6. The GLYPH is shared by every display on the site so
 *   two fields read as one typeface; the bar's weight is the one part of it
 *   that is a look rather than a shape.
 * @param {number} [o.ghost]        how visible an unlit bar is, as `--disp-ghost`
 * @param {'backlit'|'reflective'} [o.scheme='backlit']  which kind of display
 *   this is a picture of. `reflective` is the inverted grey green one with no
 *   lamp behind it. `ink`, `back` and `ghost` each override whichever is chosen,
 *   so a caller can take a scheme and change one thing about it.
 * @param {boolean} [o.frame=true]  false drops the box, so two can share one
 * @param {string} [o.title]        the standing tooltip
 * @param {string} [o.cls]
 * @returns {{el:HTMLElement, svg:SVGElement, digits:number, decimals:number,
 *            dot:boolean,
 *            set:(v:any)=>ReturnType<typeof layout>,
 *            value:()=>any, text:()=>string, reading:()=>ReturnType<typeof layout>,
 *            lit:()=>number}}
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

  /* The scheme is written first and the three explicit options over the top of
     it, so `{ scheme: 'reflective', ink: '#000' }` means what it reads like.
     ⚠️ A NAME NOTHING ANSWERS IS A THROW RATHER THAN THE DEFAULT. Silently
     drawing a backlit display for `scheme: 'reflctive'` is the typo surviving
     as a design, which is this project's most repeated shape of defect. */
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
    // 🔴 THE TOOLTIP IS WHERE A VALUE THAT DID NOT FIT SURVIVES, and it beats
    // the caller's own title at that one moment, because what matters while a
    // field reads `---` is the number that is not on it. `set()` returns the
    // same fact, so a page can log it too.
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
