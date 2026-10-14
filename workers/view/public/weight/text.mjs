// Words turned into signed distance fields, so a word metres tall stays sharp up close.
// A canvas texture (xr-panel.mjs) goes to mush when magnified 10 to 20 times; single
// channel rounds corners at one field texel, so hairlines would need MSDF.
// See lessons/page-weight.md#weight-1

/**
 * Font aliases declared in the page's stylesheet, so swapping the face never touches code.
 * Two, because the optical size axis can only be pinned in @font-face, not via ctx.font.
 * See lessons/page-weight.md#weight-2
 */
export const DISPLAY = 'weight-display';
export const BODY = 'weight-text';

/** The heaviest this family goes. Quoted rather than assumed: 900 is not a
 *  weight every variable font has, and asking for one it lacks silently gets
 *  you the nearest it does have. */
export const DISPLAY_WEIGHT = 900;

/**
 * Rasterisation size over field size: 2 measures on a grid twice as fine and averages
 * down, a quarter of the pixels for half a texel of accuracy.
 * See lessons/page-weight.md#weight-3
 */
const SCALE = 2;

/**
 * How far the field reaches either side of an edge, in field texels. The shader's
 * antialiasing width must stay below this or the edge is clipped by the field's end.
 * See lessons/page-weight.md#weight-4
 */
export const SPREAD = 8;

const INF = 1e20;

/**
 * Felzenszwalb and Huttenlocher's exact squared-distance transform, one row at a
 * time. `f` is the cost, `d` the answer, `v`/`z` the parabola scratch.
 * See lessons/page-weight.md#weight-5
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
 * Break `text` into lines no wider than `maxPx`, measured in the drawing font.
 * A `\n` in the source is a hard break.
 * See lessons/page-weight.md#weight-6
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
 * @param {WebGL2RenderingContext} gl
 * @param {object} o
 * @param {string} o.text      what to draw; `\n` is a hard break
 * @param {number} [o.weight]  900 for the big words, 400 for the blocks
 * @param {number} [o.px]      the raster font size and the one quality knob: stroke
 *   width is about `px * strokeFraction / SCALE` texels, soft below about 3
 * @param {number} [o.cap]     cap height in metres; exactly one of `cap` or `line`
 * @param {number} [o.line]    baseline-to-baseline step in metres, for blocks
 * @param {number} [o.width]   wrap width in metres, not raster pixels
 * @param {number} [o.lh]      line height as a multiple of `px`
 * @param {boolean} [o.raw]    negative control: upload the coverage bitmap unchanged,
 *   same resolution and shader, so the sharpness gain is measured. Not on the wall.
 * @returns {{tex: WebGLTexture, w: number, h: number, aspect: number,
 *   lines: string[], strokeTexels: number, capPx: number}}
 * See lessons/page-weight.md#weight-7
 */
export function buildText(gl, { text, weight = DISPLAY_WEIGHT, px = 200, cap = 0, line = 0,
  width = 0, lh = 1.12, raw = false, family = '' }) {
  const cv = document.createElement('canvas');
  const g = cv.getContext('2d', { willReadFrequently: true });
  // Optical size follows the weight by default: heavy is always a word on a wall,
  // light always a sentence. `family` overrides it.
  // See lessons/page-weight.md#weight-8
  const fam = family || (weight >= 600 ? DISPLAY : BODY);
  const font = `${weight} ${px}px "${fam}", sans-serif`;
  g.font = font;

  // Metres per raster pixel, settled first. Words are sized by cap height and blocks by
  // baseline step; sizing by ink would set MÄLU (umlaut above caps) smaller than HELD.
  // See lessons/page-weight.md#weight-9
  const capPx = g.measureText('H').actualBoundingBoxAscent || px * 0.72;
  const mpp = cap ? cap / capPx : (line ? line / (px * lh) : 1 / px);
  const lines = wrapLines(g, text, width ? width / mpp : 0);

  // The ink box (actualBoundingBox*), not the font box, which carries a fifth of the
  // height in descender air. Measured per line and unioned.
  // See lessons/page-weight.md#weight-10
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

  // Setting width/height resets all canvas state including the font, and the size
  // comes from the measurement, so the font is set twice on purpose.
  // See lessons/page-weight.md#weight-11
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
    // Seed with the sub-pixel edge from coverage: about `0.5 - a` px from the centre,
    // squared for edt1d. A hard threshold pins edges to the raster grid and curves come
    // out ragged at 20x magnification (same trick as Mapbox tiny-sdf).
    // See lessons/page-weight.md#weight-12
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
  // The histogram tells a distance field from a picture of a word: coverage is nearly
  // binary, a field ramps across SPREAD texels each side of every edge. The page asserts it.
  // See lessons/page-weight.md#weight-13
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
      // `ink` is every texel the shader calls inside, not texels deep in a stroke: 96 px
      // body text strokes are only about 3.5 texels wide.
      // See lessons/page-weight.md#weight-14
      if (b > 128) ink++;
      if (b > 38 && b < 217) mid++;
    }
  }

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  // One byte per texel, so the default 4-byte row alignment would shear any row whose
  // width is not a multiple of four.
  // See lessons/page-weight.md#weight-15
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

  // Rough stroke width in field texels for the page to assert on: line height in texels
  // times the font's weight fraction. Reported, not used.
  // See lessons/page-weight.md#weight-16
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
 * Load the faces and prove the latin-ext subset arrived (Š Ž live there, Ä Ö Ü Õ in
 * latin); a missing subset falls back per glyph silently. Measures both against fallback.
 * @returns {{ok: boolean, latin: number, ext: number, detail: string}}
 * See lessons/page-weight.md#weight-17
 */
export async function ensureFont() {
  // `document.fonts.load` needs the characters: with the default sample it fetches
  // only the subset covering those letters and never requests latin-ext.
  // See lessons/page-weight.md#weight-18
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
  // Whether the face loaded is asked of the font set: the family is an alias no system
  // font has, so a match is the vendored file. A width threshold depends on the face.
  // See lessons/page-weight.md#weight-19
  const loaded = document.fonts.check(`${DISPLAY_WEIGHT} 100px "${DISPLAY}"`, 'S');
  // The width comparison answers the other question, whether the latin-ext subset
  // arrived, which check() cannot. A ratio of ratios, so face width does not matter.
  // See lessons/page-weight.md#weight-20
  const bothFiles = latin > 0 && Math.abs(ext - latin) < 0.04;
  const ok = loaded && bothFiles;
  const detail = `loaded ${loaded}; S ${latin.toFixed(3)}x fallback, Š ${ext.toFixed(3)}x`;
  return { ok, loaded, bothFiles, latin, ext, detail };
}
