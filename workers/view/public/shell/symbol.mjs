// demo/shell/symbol.mjs — a button whose label is a picture, centred on its INK
// rather than on its box.
//
// 🔴 `place-items: center` CENTRES THE WRONG RECTANGLE, AND THAT IS WHY ⛶ SAT
// HIGH AND LEFT IN ITS SQUARE. A glyph in a button is laid out as text: it gets
// an ADVANCE WIDTH, which usually has more air on one side than the other, and
// a BASELINE, which sits wherever the font's ascent and descent put it. Centring
// the element centres that box. The ink inside it is centred only by luck, and
// U+26F6 SQUARE FOUR CORNERS is not lucky — it is drawn small and high in a box
// sized for a capital, so a 34 px square button shows it a couple of pixels up
// and to the left of where the eye expects. Reported by eye, on a zoom.
//
// ⚠️ THE FIX IS MEASURED, NOT TYPED. The obvious repair is `transform:
// translate(1px, 1px)` on the one button somebody complained about — a number
// with no source, right for one glyph in one font at one size, and silently
// wrong for the next. The offset here is computed from the font's own metrics
// through `measureText`, so it is correct for any glyph, any face and any size,
// and it becomes correct again by itself when a stylesheet changes.
//
// ⚠️ AND IT WAITS FOR THE FONT. Measured against a fallback face the numbers
// describe a glyph nobody will see, so every measurement re-runs on
// `document.fonts.ready` — the same event `/radio1965/` uses to re-share its
// label column.

/** One canvas for every measurement anyone ever asks for. */
let mctx = null;
const cache = new Map();

/**
 * How far a glyph's ink is from the centre of the box it is laid out in.
 *
 * @returns {{dx: number, dy: number} | null} pixels to move it by, or null when
 *   the browser cannot measure (no canvas, or a glyph with no ink at all).
 */
export function inkOffset(glyph, font) {
  const key = `${font}\u0000${glyph}`;
  if (cache.has(key)) return cache.get(key);
  if (!mctx) {
    try { mctx = document.createElement('canvas').getContext('2d'); }
    catch { return null; }
  }
  if (!mctx) return null;
  mctx.font = font;
  const m = mctx.measureText(glyph);
  const a = m.actualBoundingBoxAscent, de = m.actualBoundingBoxDescent;
  const l = m.actualBoundingBoxLeft, r = m.actualBoundingBoxRight;
  const A = m.fontBoundingBoxAscent, D = m.fontBoundingBoxDescent;
  // A glyph with no ink — a space, or a character this face does not have —
  // measures zero in every direction and there is nothing to centre.
  if (![a, de, l, r, A, D].every(Number.isFinite) || (a + de === 0 && l + r === 0)) {
    cache.set(key, null);
    return null;
  }
  // HORIZONTAL. The element centres the ADVANCE, whose middle is `width / 2`
  // from the text origin; the ink's middle is `(r - l) / 2` from it. Move by
  // the difference.
  const dx = m.width / 2 - (r - l) / 2;
  // VERTICAL. With `line-height: 1` the line box is the font's own ascent plus
  // descent, so its middle sits `(A - D) / 2` ABOVE the baseline; the ink's
  // middle sits `(a - de) / 2` above it. Positive moves down, which is the
  // direction a glyph drawn high in its box needs to go.
  const dy = ((a - de) - (A - D)) / 2;
  const out = { dx, dy };
  cache.set(key, out);
  return out;
}

/**
 * Nudge an element's glyph onto the middle of its own box.
 *
 * ⚠️ IT MOVES AN INNER SPAN, NEVER THE BUTTON. A transform on the button would
 * move its border and its focus ring with the ink, which is a control that
 * looks misaligned to fix a glyph that was.
 */
export function centreSymbol(host) {
  const glyph = (host.textContent || '').trim();
  if (!glyph) return null;
  let inner = host.querySelector(':scope > .pos-sym');
  if (!inner) {
    inner = document.createElement('span');
    inner.className = 'pos-sym';
    inner.textContent = glyph;
    host.textContent = '';
    host.append(inner);
  }
  const apply = () => {
    const cs = getComputedStyle(inner);
    const off = inkOffset(glyph, `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`);
    if (!off) return null;
    inner.style.transform = `translate(${off.dx.toFixed(2)}px, ${off.dy.toFixed(2)}px)`;
    return off;
  };
  const first = apply();
  // A late webfont changes every metric above, and `document.fonts` is the event
  // for it rather than a guess at how long loading takes.
  document.fonts?.ready?.then(apply).catch(() => {});
  return first;
}

/**
 * Change the glyph on a button that `centreSymbol` already owns, and re-centre.
 *
 * 🔴 IT EXISTS BECAUSE `host.textContent = ch` SILENTLY UNDOES THIS FILE.
 * `centreSymbol` puts the glyph in a `<span class="pos-sym">` and translates the
 * SPAN, so writing `textContent` on the button throws that span away: the new
 * glyph is laid out on its advance and its baseline again, which is the exact
 * misalignment this module was written to fix, and nothing anywhere reports it.
 * REPORTED as *"play button is always square"* on `/videoradio/`, whose play
 * control swaps `▶` for `❚❚` on every press.
 *
 * ⚠️ AND THE TWO GLYPHS ARE NOT THE SAME SHAPE, which is why re-centring is not
 * cosmetic here. `▶` is one code point drawn wide and low; `❚❚` is TWO
 * characters whose ink is narrow and tall. Centring measured for one of them is
 * wrong for the other by several pixels, in a 34 px box, in the one control a
 * visitor presses.
 *
 * ⚠️ IT FALLS BACK TO `centreSymbol` when the span is missing, so a caller does
 * not have to know whether the button was built by this module.
 */
export function setSymbol(host, glyph) {
  if (!host) return null;
  const inner = host.querySelector(':scope > .pos-sym');
  if (!inner) { host.textContent = glyph; return centreSymbol(host); }
  inner.textContent = glyph;
  inner.style.transform = '';
  const cs = getComputedStyle(inner);
  const off = inkOffset(glyph, `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`);
  if (off) inner.style.transform = `translate(${off.dx.toFixed(2)}px, ${off.dy.toFixed(2)}px)`;
  return off;
}

