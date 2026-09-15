// demo/held/text.mjs — words turned into distance fields, so a letter stays a
// letter when you put your face against it.
//
// 🔴 WHY THIS IS NOT `texImage2D(canvas)`, WHICH IS THIS REPO'S ESTABLISHED
// IDIOM FOR TEXT IN 3-D. `xr-panel.mjs` and `xr-tablet.mjs` both draw to a
// canvas and upload it, and both are right to: a tablet is 0.20 m across and a
// panel hangs at arm's length, so the texture is never magnified much past the
// pixels it was drawn with. This page's whole subject is a word **three metres
// tall that you can walk up to and stand under**, where a canvas texture is
// being blown up ten or twenty times and every edge goes to mush. A signed
// distance field is the one storage where magnification costs nothing, because
// the edge is RECONSTRUCTED from a distance rather than interpolated between
// two pixels.
//
// ⚠️ AND IT IS SMALLER, WHICH IS THE SECOND REASON. A word held as coverage
// needs the resolution you will ever view it at; held as a distance it needs
// the resolution its STROKES need. `SCALE` below rasterises at twice the field
// and averages down, so the field is accurate to half a texel while costing a
// quarter of the pixels.
//
// ⚠️ WHAT IT CANNOT DO, NAMED RATHER THAN DISCOVERED. A single-channel field
// rounds off corners at about one texel of the field — that is what the
// multi-channel (MSDF) variant exists to fix, and it needs glyph OUTLINES,
// which means a font parser and a build step. At the sizes here one texel is a
// fraction of a stroke and nobody can see it. If this page ever wants hairline
// serifs or a corner you can put your eye on, that is the trigger to go to
// MSDF — not a gradual "it looks a bit soft".
//
// Everything below runs in the browser at load. There is no font conversion and
// no offline step: the text is shaped by the browser's own layout engine, which
// is also how accents, combining marks and any script the font carries come out
// right for free.
//
// ── what the three.js world already knows, and which half of it was taken ──
//
// `troika-three-text` is the established answer there, and it is worth reading
// before writing any of this. Four of its decisions and what happened to each:
//
//   ✔ **Antialias with standard derivatives.** Troika does; so does the shader
//     on this page. Arrived at separately, which is the useful kind of
//     agreement.
//   ✔ **Wrap against a width in WORLD units** (`maxWidth`), honouring explicit
//     newlines. Taken — `width` below is in metres, and a `\n` is a hard break.
//     The first version of this file wrapped against RASTER PIXELS, which is a
//     number nobody laying out a wall can hold in their head.
//   ✔ **Translucent text needs an order.** Troika's own note is that "if the
//     text renders before the content behind it, you may see antialiasing
//     pixels that appear too dark or light", and its fix is `renderOrder`. The
//     page sorts back to front every frame for exactly this.
//   ✘ **A per-GLYPH atlas, generated in a web worker.** NOT taken, and the
//     reason is the trade it makes: troika parses the font itself (with Typr)
//     and therefore has to do the layout itself. This file hands the layout to
//     the browser, which costs one texture per phrase instead of one per glyph
//     and buys kerning, accent placement and any script the font carries
//     without writing a line of it — **and .woff2**, which troika's own
//     documentation lists as unsupported. That is not troika being careless: a
//     font parser that reads woff2 has to carry a Brotli decoder. A page whose
//     words are written in its source pays nothing for the browser's engine; a
//     page whose words are TYPED pays everything for the rebuild.
//
// 🔴 SO THE EXPIRY IS NAMED, THE WAY `xr-glb.mjs` NAMES ITS OWN. Go to a glyph
// atlas when text has to CHANGE at runtime — anything typed, streamed, counted
// up, or translated on the fly — because this shape rebuilds a whole texture
// for a one-letter edit. Until then it is a worse architecture with a better
// result. ⚠️ And move the transform into a worker when it stops fitting in the
// load: MEASURED on this machine, eleven phrases take about 320 ms on the main
// thread, which is a blocked page, not a dropped frame — troika went to a
// worker for the same arithmetic.

/**
 * 🔴 THE TYPEFACE IS NEVER NAMED HERE, AND THAT IS THE POINT. These two are
 * ALIASES declared in the page's stylesheet; whichever font is vendored answers
 * to them. Changing the face is then two files in `vendor/`, two `src` lines
 * and a licence — and not a rename through a module, a build listing and every
 * assert that quoted the old name, which is the shape of rename CLAUDE.md warns
 * about twice.
 *
 * ⚠️ TWO OF THEM, because a family with an OPTICAL SIZE axis draws a word three
 * metres tall differently from a sentence read at arm's length — and a canvas
 * cannot set `font-variation-settings` through its `font` shorthand, so the
 * axis is pinned in the @font-face descriptor and reached by asking for the
 * family by name. A face with no such axis makes the two identical, which
 * costs nothing.
 */
export const DISPLAY = 'held-display';
export const BODY = 'held-text';

/** The heaviest this family goes. Quoted rather than assumed: 900 is not a
 *  weight every variable font has, and asking for one it lacks silently gets
 *  you the nearest it does have. */
export const DISPLAY_WEIGHT = 900;

/**
 * How much bigger the rasterisation is than the field. 2 means the distance is
 * measured on a grid twice as fine and then averaged down, which is worth a
 * quarter of the pixels for half a texel of accuracy.
 */
const SCALE = 2;

/**
 * How far the field reaches either side of an edge, in FIELD texels. The
 * shader's antialiasing width has to be smaller than this or the edge is cut
 * off by the field's own end; 8 leaves room at every size this page uses.
 */
export const SPREAD = 8;

const INF = 1e20;

/**
 * Felzenszwalb & Huttenlocher's exact squared-distance transform, one row at a
 * time. `f` is the cost, `d` the answer, `v`/`z` the parabola scratch.
 */
function edt1d(f, d, v, z, n) {
  let k = 0;
  v[0] = 0; z[0] = -INF; z[1] = INF;
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++; v[k] = q; z[k] = s; z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const dq = q - v[k];
    d[q] = dq * dq + f[v[k]];
  }
}

/** The 2-D transform: columns, then rows. `grid` is overwritten. */
function edt2d(grid, w, h, f, d, v, z) {
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = grid[y * w + x];
    edt1d(f, d, v, z, h);
    for (let y = 0; y < h; y++) grid[y * w + x] = d[y];
  }
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) f[x] = grid[row + x];
    edt1d(f, d, v, z, w);
    for (let x = 0; x < w; x++) grid[row + x] = d[x];
  }
}

/**
 * Break `text` into lines no wider than `maxPx`, measured in the font that will
 * draw them. ⚠️ A `\n` in the source is honoured as a hard break, because a
 * three-word line somebody chose beats a wrap somebody computed.
 */
function wrapLines(g, text, maxPx) {
  const out = [];
  for (const para of String(text).split('\n')) {
    const words = para.split(/\s+/).filter(Boolean);
    if (!words.length) { out.push(''); continue; }
    let line = words[0];
    for (let i = 1; i < words.length; i++) {
      const next = `${line} ${words[i]}`;
      if (maxPx && g.measureText(next).width > maxPx) { out.push(line); line = words[i]; }
      else line = next;
    }
    out.push(line);
  }
  return out;
}

/**
 * Rasterise `text` and return its signed distance field as an R8 texture.
 *
 * @param {WebGL2RenderingContext} gl
 * @param {object} o
 * @param {string} o.text      what to draw; `\n` is a hard break
 * @param {number} [o.weight]  900 for the big words, 400 for the blocks
 * @param {number} [o.px]      the RASTER font size. Everything else is derived
 *                             from it, so this is the one knob for quality:
 *                             the field's stroke width is roughly
 *                             `px * strokeFraction / SCALE` texels, and below
 *                             about 3 texels a stroke starts to soften.
 * @param {number} [o.cap]     the CAP HEIGHT in metres — what a word is set
 *                             at. Exactly one of `cap` or `line` is given.
 * @param {number} [o.line]    the baseline-to-baseline step in metres — what a
 *                             block of sentences is set at.
 * @param {number} [o.width]   wrap to this many METRES. ⚠️ Metres, not raster
 *                             pixels: `troika-three-text`'s `maxWidth` is in
 *                             world units for the same reason, and the first
 *                             version of this file asked for pixels, which is a
 *                             number nobody laying out a wall can hold in their
 *                             head.
 * @param {number} [o.lh]      line height as a multiple of `px`
 * @param {boolean} [o.raw]    🔴 THE NEGATIVE CONTROL, AND IT IS THE ONLY
 *                             REASON THIS PAGE'S SHARPNESS CLAIM MEANS
 *                             ANYTHING. With `raw` the coverage bitmap is
 *                             uploaded as it was rasterised — a plain picture
 *                             of the word, at exactly the same resolution, read
 *                             by exactly the same shader. Magnify both and the
 *                             difference between the two edges is the whole
 *                             argument for the transform above, measured
 *                             instead of asserted. Nothing on the wall uses it.
 * @returns {{tex: WebGLTexture, w: number, h: number, aspect: number,
 *            lines: string[], strokeTexels: number, capPx: number}}
 */
export function buildText(gl, { text, weight = DISPLAY_WEIGHT, px = 200, cap = 0, line = 0,
  width = 0, lh = 1.12, raw = false, family = '' }) {
  const cv = document.createElement('canvas');
  const g = cv.getContext('2d', { willReadFrequently: true });
  // ⚠️ THE OPTICAL SIZE FOLLOWS THE WEIGHT UNLESS SOMEBODY SAYS OTHERWISE. A
  // heavy setting on this page is always a word on a wall and a light one is
  // always a sentence, so the default needs no third field on every item — and
  // `family` is there for the day that stops being true.
  const fam = family || (weight >= 600 ? DISPLAY : BODY);
  const font = `${weight} ${px}px "${fam}", sans-serif`;
  g.font = font;

  // 🔴 METRES PER RASTER PIXEL, SETTLED BEFORE ANYTHING IS MEASURED IN PIXELS,
  // so the caller never has to know what `px` is. A word is set by its CAP
  // HEIGHT and a block by its baseline step, because those are the two things a
  // person sizing type actually means — and sizing by the INK instead would set
  // `MÄLU`, whose umlaut climbs above the capitals, smaller than `HELD` at the
  // same declared size.
  const capPx = g.measureText('H').actualBoundingBoxAscent || px * 0.72;
  const mpp = cap ? cap / capPx : (line ? line / (px * lh) : 1 / px);
  const lines = wrapLines(g, text, width ? width / mpp : 0);

  // 🔴 THE INK BOX, NOT THE FONT BOX. `measureText().width` plus the font's own
  // ascent and descent describes a box with air in it — for a word in capitals
  // that air is the descender space, a fifth of the height, and it would put a
  // fifth of every quad's height into nothing. The `actualBoundingBox*` figures
  // are where the PIXELS are, which is what a quad should be the shape of.
  // ⚠️ They are measured per line and unioned; a line with no descender must not
  // shrink the box a line with one needs.
  let left = INF, right = -INF, top = INF, bottom = -INF;
  const step = px * lh;
  const m = lines.map((s) => g.measureText(s || ' '));
  lines.forEach((s, i) => {
    const mm = m[i];
    const y = i * step;
    left = Math.min(left, -mm.actualBoundingBoxLeft);
    right = Math.max(right, mm.actualBoundingBoxRight);
    top = Math.min(top, y - mm.actualBoundingBoxAscent);
    bottom = Math.max(bottom, y + mm.actualBoundingBoxDescent);
  });
  // An empty measurement means the font never arrived; a zero-sized canvas
  // throws further down, and this says which of the two happened.
  if (!(right > left) || !(bottom > top)) {
    throw new Error(`nothing measurable in "${String(text).slice(0, 24)}" — is the font loaded?`);
  }

  const padPx = SPREAD * SCALE;
  const rw = Math.ceil((right - left) / SCALE + 2 * SPREAD) * SCALE;
  const rh = Math.ceil((bottom - top) / SCALE + 2 * SPREAD) * SCALE;
  cv.width = rw; cv.height = rh;

  // ⚠️ SETTING width/height RESETS EVERY CANVAS STATE, including the font that
  // was just measured with. Measuring before sizing is unavoidable — the size
  // comes from the measurement — so the font is set twice on purpose.
  g.font = font;
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  g.fillStyle = '#fff';
  g.clearRect(0, 0, rw, rh);
  lines.forEach((s, i) => { if (s) g.fillText(s, padPx - left, padPx - top + i * step); });

  const img = g.getImageData(0, 0, rw, rh).data;
  const n = rw * rh;

  if (raw) {
    // The coverage, untouched, at the raster's own resolution. Same upload path,
    // same filtering, same shader — so the only difference from the field below
    // is what is stored in the texel.
    const cov = new Uint8Array(n);
    for (let i = 0; i < n; i++) cov[i] = img[i * 4 + 3];
    const rtex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, rtex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, rw, rh, 0, gl.RED, gl.UNSIGNED_BYTE, cov);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.generateMipmap(gl.TEXTURE_2D);
    return {
      tex: rtex, w: rw, h: rh, aspect: rw / rh, lines, strokeTexels: px * 0.16,
      capPx, px, scale: 1, raw: true, mpp,
      wM: rw * mpp, hM: rh * mpp,
      stats: { ink: 0, mid: 0 },
    };
  }

  const outer = new Float64Array(n);
  const inner = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    // The alpha channel IS the coverage; the colour is white everywhere it is
    // not zero, so nothing else in the bitmap carries information.
    const a = img[i * 4 + 3] / 255;
    // 🔴 THE COVERAGE IS A SUB-PIXEL MEASUREMENT AND THE FIRST VERSION THREW IT
    // AWAY. It read `a >= 128 ? 0 : INF` — a hard threshold — which pins every
    // edge to the RASTER GRID: the true contour can be anywhere inside a pixel
    // and the field was told it is exactly at the centre. The error is under
    // half a raster pixel and invisible at ordinary sizes; at the magnification
    // this page exists for it is half a pixel times twenty, and a smooth curve
    // comes out visibly RAGGED. Reported as "why edge artefacts?" on a zoom
    // into the O of KÕIK, and it is not the distance field failing — it is the
    // distance field being given quantised input.
    //
    // An antialiased pixel with coverage `a` has its edge about `0.5 - a` pixels
    // away from the pixel's centre, so seeding the transform with THAT (squared,
    // because `edt1d` works in squared distances) recovers the position the
    // rasteriser already knew. Same trick as Mapbox's tiny-sdf, and the reason
    // it is worth having: it costs one multiply and buys a contour that is
    // smooth between samples rather than between pixels.
    if (a >= 1) { outer[i] = 0; inner[i] = INF; }
    else if (a <= 0) { outer[i] = INF; inner[i] = 0; }
    else {
      const o = Math.max(0, 0.5 - a), j = Math.max(0, a - 0.5);
      outer[i] = o * o; inner[i] = j * j;
    }
  }
  const mx = Math.max(rw, rh);
  const f = new Float64Array(mx), dd = new Float64Array(mx);
  const v = new Int32Array(mx), z = new Float64Array(mx + 1);
  edt2d(outer, rw, rh, f, dd, v, z);
  edt2d(inner, rw, rh, f, dd, v, z);

  const fw = rw / SCALE, fh = rh / SCALE;
  const field = new Uint8Array(fw * fh);
  // 🔴 THE SHAPE OF THE HISTOGRAM IS HOW YOU TELL A DISTANCE FIELD FROM A
  // PICTURE OF A WORD, and it is the only place that distinction is visible
  // without a GPU. A coverage bitmap is nearly binary — antialiasing puts a
  // thin rim of intermediate values round each letter and nothing else — while
  // a distance field ramps across `SPREAD` texels on BOTH sides of every edge,
  // so a large share of it sits between the two extremes. Counted here and
  // asserted by the page.
  let ink = 0, mid = 0;
  for (let y = 0; y < fh; y++) {
    for (let x = 0; x < fw; x++) {
      // Average the SCALE x SCALE block of raster distances, then convert the
      // result from raster pixels to field texels.
      let s = 0;
      for (let j = 0; j < SCALE; j++) {
        for (let i = 0; i < SCALE; i++) {
          const k = (y * SCALE + j) * rw + (x * SCALE + i);
          s += Math.sqrt(inner[k]) - Math.sqrt(outer[k]);   // positive INSIDE
        }
      }
      const dist = (s / (SCALE * SCALE)) / SCALE;
      const u = 0.5 + dist / (2 * SPREAD);
      const b = Math.max(0, Math.min(255, Math.round(u * 255)));
      field[y * fw + x] = b;
      // ⚠️ `ink` IS THE LETTERFORM — the texels the shader will call inside —
      // and NOT "texels deep inside a stroke". The first version asked for
      // texels more than six texels in, which no 96 px body text has at all:
      // its strokes are about three and a half texels wide, so the check read
      // every block of small type as an empty field. A threshold has to be a
      // property of the QUESTION, not of the fattest thing that will be asked.
      if (b > 128) ink++;
      if (b > 38 && b < 217) mid++;
    }
  }

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  // ⚠️ ONE BYTE PER TEXEL, SO THE DEFAULT 4-BYTE ROW ALIGNMENT IS WRONG. Left
  // alone, every row whose width is not a multiple of four is read from the
  // wrong offset and the word comes out sheared — a defect that looks like a
  // layout bug and is a `pixelStorei` bug.
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, fw, fh, 0, gl.RED, gl.UNSIGNED_BYTE, field);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  // Averaging distances is meaningful in a way averaging coverage is not, so an
  // SDF mipmaps honestly — a word seen edge-on across the room stays a word.
  gl.generateMipmap(gl.TEXTURE_2D);
  const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
  if (aniso) {
    gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT,
      Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
  }

  // A rough stroke width in field texels, for the page to assert on: the ink
  // area over the ink perimeter is a stroke half-width, and this is the cheap
  // stand-in — the height of a line in texels times the font's own weight
  // fraction. Reported, not used.
  const strokeTexels = (px / SCALE) * (weight >= 800 ? 0.16 : 0.075);

  return {
    tex, w: fw, h: fh, aspect: fw / fh, lines, strokeTexels, capPx,
    px, scale: SCALE, mpp,
    // The quad's size in metres, which is the only thing the page needs. One
    // field texel is SCALE raster pixels across, and `texelM` is what the
    // readout's magnification is measured against.
    wM: rw * mpp, hM: rh * mpp, texelM: mpp * SCALE,
    stats: { ink: ink / (fw * fh), mid: mid / (fw * fh) },
  };
}

/**
 * Load the faces and PROVE the second one arrived.
 *
 * 🔴 THE TRAP THIS EXISTS FOR, MEASURED RATHER THAN IMAGINED. Google serves
 * this family as several files split by unicode range, and **Estonian falls
 * across two of them**: Ä Ö Ü Õ are in `latin` (U+00xx) and Š Ž are in
 * `latin-ext` (U+0160, U+017E). Ship only the first and the browser falls back
 * PER GLYPH to some system face — so `ŠAHH` comes out with one letter in a
 * different typeface, at a different width, and **nothing anywhere reports
 * it**: no 404 the page sees, no exception, no missing-glyph box. On a canvas
 * being rasterised into a texture it is invisible until somebody looks at the
 * word.
 *
 * So this does not ask whether a font "is loaded". It measures a latin-ext
 * letter and a latin letter against the SAME letters in the fallback face: if
 * the extended subset arrived, both letters are stretched away from the
 * fallback by the same factor, and if it did not, the extended one sits exactly
 * on top of the fallback. That is a measurement on the far side of the thing
 * being claimed rather than a flag the loader sets.
 *
 * @returns {{ok: boolean, latin: number, ext: number, detail: string}}
 */
export async function ensureFont() {
  // ⚠️ `document.fonts.load` NEEDS THE CHARACTERS. Asked with the default
  // sample string it resolves having fetched only the subset covering those
  // letters, and the extended file is never requested at all.
  await Promise.all([
    document.fonts.load(`${DISPLAY_WEIGHT} 100px "${DISPLAY}"`, 'ABC'),
    document.fonts.load(`${DISPLAY_WEIGHT} 100px "${DISPLAY}"`, 'ŠŽ'),
    document.fonts.load(`400 100px "${BODY}"`, 'ABCŠŽ'),
    document.fonts.load(`400 100px "${BODY}"`, 'ŠŽ'),
  ]).catch(() => {});
  await document.fonts.ready;

  const g = document.createElement('canvas').getContext('2d');
  const ratio = (ch) => {
    g.font = `${DISPLAY_WEIGHT} 100px "${DISPLAY}", serif`;
    const a = g.measureText(ch).width;
    g.font = `${DISPLAY_WEIGHT} 100px serif`;
    const b = g.measureText(ch).width;
    return b > 0 ? a / b : 0;
  };
  const latin = ratio('S');
  const ext = ratio('Š');
  // 🔴 "DID THE FACE LOAD" IS ASKED OF THE FONT SET, NOT OF A WIDTH — and the
  // first version got this wrong in a way only a font swap exposed. It tested
  // `latin > 1.02`, i.e. "this face is at least 2% wider than the fallback",
  // which was a comfortable 1.564 for the first typeface tried and **1.032**
  // for the second. Nothing was broken; the proxy was. A face that happened to
  // set S at the fallback's width would have reported as missing while
  // rendering perfectly. `check()` is decisive here because the family is an
  // ALIAS — no system font is called `held-display`, so a match can only be
  // the vendored file.
  const loaded = document.fonts.check(`${DISPLAY_WEIGHT} 100px "${DISPLAY}"`, 'S');
  // ⚠️ THE WIDTH COMPARISON STILL EARNS ITS PLACE, for the OTHER question.
  // `check()` cannot tell you that the latin-ext SUBSET arrived: it answers
  // about a family, and a family with one of its two files missing is still
  // "available". Two letters from two different files, measured against the
  // same fallback, is the only thing that separates them — and this half is a
  // RATIO OF RATIOS, so it does not care how wide the typeface is.
  const bothFiles = latin > 0 && Math.abs(ext - latin) < 0.04;
  const ok = loaded && bothFiles;
  const detail = `loaded ${loaded}; S ${latin.toFixed(3)}x fallback, Š ${ext.toFixed(3)}x`;
  return { ok, loaded, bothFiles, latin, ext, detail };
}
