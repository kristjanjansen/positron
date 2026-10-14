// demo/shell/symbol.mjs: a button whose glyph is centred on its ink, not its box.
// `place-items: center` centres the advance box, so ⛶ sat high and left. The offset is measured
// from the font via `measureText` and re-measured on `document.fonts.ready`.
// why: lessons/kit-symbol.md#header

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
 * Nudge an element's glyph onto the middle of its own box. It moves an inner span, never the
 * button, whose border and focus ring must stay put.
 * why: lessons/kit-symbol.md#centre-symbol
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
 * Change the glyph on a button `centreSymbol` owns, and re-centre: writing `textContent` would
 * drop the span (▶ and ❚❚ differ by several pixels). Falls back to `centreSymbol`.
 * why: lessons/kit-symbol.md#set-symbol
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

