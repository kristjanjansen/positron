# Page comments: weight

The full comments cut from the code under demo/ for weight, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="weight-1"></a>
## weight-1: demo/weight/text.mjs, module, line 1

````js
// demo/weight/text.mjs — words turned into distance fields, so a letter stays a
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
````

<a id="weight-2"></a>
## weight-2: demo/weight/text.mjs, module, line 70

````js
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
````

<a id="weight-3"></a>
## weight-3: demo/weight/text.mjs, module, line 93

````js
/**
 * How much bigger the rasterisation is than the field. 2 means the distance is
 * measured on a grid twice as fine and then averaged down, which is worth a
 * quarter of the pixels for half a texel of accuracy.
 */
````

<a id="weight-4"></a>
## weight-4: demo/weight/text.mjs, module, line 100

````js
/**
 * How far the field reaches either side of an edge, in FIELD texels. The
 * shader's antialiasing width has to be smaller than this or the edge is cut
 * off by the field's own end; 8 leaves room at every size this page uses.
 */
````

<a id="weight-5"></a>
## weight-5: demo/weight/text.mjs, module, line 109

````js
/**
 * Felzenszwalb & Huttenlocher's exact squared-distance transform, one row at a
 * time. `f` is the cost, `d` the answer, `v`/`z` the parabola scratch.
 */
````

<a id="weight-6"></a>
## weight-6: demo/weight/text.mjs, module, line 147

````js
/**
 * Break `text` into lines no wider than `maxPx`, measured in the font that will
 * draw them. ⚠️ A `\n` in the source is honoured as a hard break, because a
 * three-word line somebody chose beats a wrap somebody computed.
 */
````

<a id="weight-7"></a>
## weight-7: demo/weight/text.mjs, module, line 168

````js
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
````

<a id="weight-8"></a>
## weight-8: demo/weight/text.mjs, module, line 207

````js
  // ⚠️ THE OPTICAL SIZE FOLLOWS THE WEIGHT UNLESS SOMEBODY SAYS OTHERWISE. A
  // heavy setting on this page is always a word on a wall and a light one is
  // always a sentence, so the default needs no third field on every item — and
  // `family` is there for the day that stops being true.
````

<a id="weight-9"></a>
## weight-9: demo/weight/text.mjs, module, line 215

````js
  // 🔴 METRES PER RASTER PIXEL, SETTLED BEFORE ANYTHING IS MEASURED IN PIXELS,
  // so the caller never has to know what `px` is. A word is set by its CAP
  // HEIGHT and a block by its baseline step, because those are the two things a
  // person sizing type actually means — and sizing by the INK instead would set
  // `MÄLU`, whose umlaut climbs above the capitals, smaller than `HELD` at the
  // same declared size.
````

<a id="weight-10"></a>
## weight-10: demo/weight/text.mjs, module, line 225

````js
  // 🔴 THE INK BOX, NOT THE FONT BOX. `measureText().width` plus the font's own
  // ascent and descent describes a box with air in it — for a word in capitals
  // that air is the descender space, a fifth of the height, and it would put a
  // fifth of every quad's height into nothing. The `actualBoundingBox*` figures
  // are where the PIXELS are, which is what a quad should be the shape of.
  // ⚠️ They are measured per line and unioned; a line with no descender must not
  // shrink the box a line with one needs.
````

<a id="weight-11"></a>
## weight-11: demo/weight/text.mjs, module, line 254

````js
  // ⚠️ SETTING width/height RESETS EVERY CANVAS STATE, including the font that
  // was just measured with. Measuring before sizing is unavoidable — the size
  // comes from the measurement — so the font is set twice on purpose.
````

<a id="weight-12"></a>
## weight-12: demo/weight/text.mjs, module, line 296

````js
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
````

<a id="weight-13"></a>
## weight-13: demo/weight/text.mjs, module, line 327

````js
  // 🔴 THE SHAPE OF THE HISTOGRAM IS HOW YOU TELL A DISTANCE FIELD FROM A
  // PICTURE OF A WORD, and it is the only place that distinction is visible
  // without a GPU. A coverage bitmap is nearly binary — antialiasing puts a
  // thin rim of intermediate values round each letter and nothing else — while
  // a distance field ramps across `SPREAD` texels on BOTH sides of every edge,
  // so a large share of it sits between the two extremes. Counted here and
  // asserted by the page.
````

<a id="weight-14"></a>
## weight-14: demo/weight/text.mjs, module, line 350

````js
      // ⚠️ `ink` IS THE LETTERFORM — the texels the shader will call inside —
      // and NOT "texels deep inside a stroke". The first version asked for
      // texels more than six texels in, which no 96 px body text has at all:
      // its strokes are about three and a half texels wide, so the check read
      // every block of small type as an empty field. A threshold has to be a
      // property of the QUESTION, not of the fattest thing that will be asked.
````

<a id="weight-15"></a>
## weight-15: demo/weight/text.mjs, module, line 363

````js
  // ⚠️ ONE BYTE PER TEXEL, SO THE DEFAULT 4-BYTE ROW ALIGNMENT IS WRONG. Left
  // alone, every row whose width is not a multiple of four is read from the
  // wrong offset and the word comes out sheared — a defect that looks like a
  // layout bug and is a `pixelStorei` bug.
````

<a id="weight-16"></a>
## weight-16: demo/weight/text.mjs, module, line 382

````js
  // A rough stroke width in field texels, for the page to assert on: the ink
  // area over the ink perimeter is a stroke half-width, and this is the cheap
  // stand-in — the height of a line in texels times the font's own weight
  // fraction. Reported, not used.
````

<a id="weight-17"></a>
## weight-17: demo/weight/text.mjs, module, line 399

````js
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
````

<a id="weight-18"></a>
## weight-18: demo/weight/text.mjs, module, line 422

````js
  // ⚠️ `document.fonts.load` NEEDS THE CHARACTERS. Asked with the default
  // sample string it resolves having fetched only the subset covering those
  // letters, and the extended file is never requested at all.
````

<a id="weight-19"></a>
## weight-19: demo/weight/text.mjs, module, line 443

````js
  // 🔴 "DID THE FACE LOAD" IS ASKED OF THE FONT SET, NOT OF A WIDTH — and the
  // first version got this wrong in a way only a font swap exposed. It tested
  // `latin > 1.02`, i.e. "this face is at least 2% wider than the fallback",
  // which was a comfortable 1.564 for the first typeface tried and **1.032**
  // for the second. Nothing was broken; the proxy was. A face that happened to
  // set S at the fallback's width would have reported as missing while
  // rendering perfectly. `check()` is decisive here because the family is an
  // ALIAS — no system font is called `weight-display`, so a match can only be
  // the vendored file.
````

<a id="weight-20"></a>
## weight-20: demo/weight/text.mjs, module, line 453

````js
  // ⚠️ THE WIDTH COMPARISON STILL EARNS ITS PLACE, for the OTHER question.
  // `check()` cannot tell you that the latin-ext SUBSET arrived: it answers
  // about a family, and a family with one of its two files missing is still
  // "available". Two letters from two different files, measured against the
  // same fallback, is the only thing that separates them — and this half is a
  // RATIO OF RATIOS, so it does not care how wide the typeface is.
````

<a id="weight-21"></a>
## weight-21: demo/weight/index.html, style, line 10

````css
  /* 🔴 THE PAGE NEVER NAMES THE TYPEFACE. Everything downstream — the shader,
     the canvas, `text.mjs` — asks for `weight-display` and `weight-text`, and those
     two names are an ALIAS that the four rules below point at whichever font is
     vendored today. Swapping the face is then: drop two `.woff2` files in
     `vendor/`, change the two `src` lines and the licence beside them, and
     nothing else in the page or the module moves. Without the alias a font
     change is a rename across a stylesheet, a module constant, a build listing
     and every assert that quotes the name — which is the shape of rename this
     repo has a standing warning about.

     ⚠️ TWO ALIASES OFF ONE FILE, AND THE SECOND ONE IS INSURANCE. A family with
     an OPTICAL SIZE axis draws a word three metres tall differently from a
     sentence read at arm's length, and a canvas cannot set
     `font-variation-settings` through its `font` shorthand — so the axis has to
     be pinned HERE, in the @font-face descriptor, where the canvas reaches it
     by asking for the family by name. A face without the axis ignores the
     descriptor and both aliases come out the same, which is what happens today.

     🔴 AND IT ARRIVES IN TWO FILES, WHICH IS THE TRAP WORTH KNOWING ABOUT.
     Google splits this family by unicode range and Estonian falls across the
     split: Ä Ö Ü Õ are in `latin` (U+00xx) and Š Ž are in `latin-ext`
     (U+0160, U+017E). Ship one and the browser falls back PER GLYPH to a system
     face — one letter of one word in a different typeface, with no 404, no
     exception and no missing-glyph box. `text.mjs`'s `ensureFont()` measures
     that rather than trusting it. ⚠️ The ranges below are Google's own, copied
     from the stylesheet the files came from; shortening them would make the
     browser ask the wrong file for a letter.

     Gabarito, SIL Open Font License 1.1 — LICENSE-gabarito sits beside it.
     ⚠️ Gabarito has weights and NOTHING ELSE: no optical size, no width. So the
     two aliases above come out identical today, and that is the graceful
     nothing the design promised rather than a thing to go and delete — the next
     face may well have the axis, and the seam costs four rules. */
````

<a id="weight-22"></a>
## weight-22: demo/weight/index.html, style, line 78

````css
  /* 🔴 THE PICTURE NO LONGER OWNS ITS OWN BOX. It used to carry the 16:9, the
     border, the corner and the `.pos-full` rules; all four now belong to
     `.pos-vp-stage`, which this fills. A page keeping its own copy of a shape a
     component already draws is two stylesheets that can disagree about one
     picture, and the one that goes full is the panel rather than this. */
````

<a id="weight-23"></a>
## weight-23: demo/weight/index.html, style, line 87

````css
  /* 🔴 WHAT DREW THE PICTURE, IN THE FOOTER'S LEFT SLOT.
     ⚠️ THE SECOND COPY OF THESE THREE RULES IN THE PROJECT, and the first is
     `/mirror/`'s `.fact`, which puts the same fact in the same kind of cell.
     Two is not yet a component and three would be: if a third page wants a
     named value in a panel footer, this belongs in the kit rather than in a
     page. The key style is `.pos-k`'s, copied rather than invented, so a value
     named here is named the way every readout names one. */
````

<a id="weight-24"></a>
## weight-24: demo/weight/index.html, style, line 104

````css
  /* 🔴 THE WAY OUT OF A FILLED SCREEN IS NOT STYLED HERE ANY MORE. It was
     `.hd-out`, a badge reading `Esc to leave` that faded itself out after four
     and a half seconds. It is `.pos-fsx` in shell.css now, built by
     `createFullscreenExit`, and the reasons are in that module. */
````

<a id="weight-25"></a>
## weight-25: demo/weight/index.html, style, line 108

````css
  /* 🔴 A REAL TEXT FIELD, NOT A KEYBOARD DRAWN IN THE ROOM. Focusing one is the
     only thing that raises the device's OWN text entry, and a headset, a phone
     and a laptop all already have one that knows the wearer's languages, their
     dictation and their autocorrect. A keyboard modelled in the room would be a
     worse copy of a thing already in the box. ⚠️ It is NOT inside `.hd`'s
     `touch-action: none` by accident either: a field has to keep the ordinary
     tap-to-place-a-caret behaviour, so it sets its own. */
````

<a id="weight-26"></a>
## weight-26: demo/weight/index.html, style, line 119

````css
             /* ⚠️ `1.4` AND `resize: none`. A textarea's default line-height
                packs three lines too tight to read, and a drag handle in the
                corner would let the field be pulled over the picture it is
                editing. The height comes from `rows`, so the box is exactly
                three lines whatever the face measures. */
````

<a id="weight-27"></a>
## weight-27: demo/weight/index.html, style, line 126

````css
  /* 🔴 ONE BORDER, NOT TWO. `shell.css` gives everything a 1 px `--hi` outline
     on `:focus-visible`, and this field already carries a 1 px `--hi` border of
     its own, so opening it drew two concentric yellow rectangles two pixels
     apart. The outline exists to say WHICH element has the keyboard, and here
     nothing else can have it: the field is only on screen while it is being
     typed in. The border is the signal, so the outline is the duplicate and it
     is the one that goes.
     🔴 AND THE `:focus` HALF OF THIS SELECTOR WENT ON 2026-09-23, BECAUSE THE
     COMMENT UNDER IT ALREADY SAID IT SHOULD NOT BE THERE. It read
     `.hd-type:focus, .hd-type:focus-visible` under a note promising
     `:focus-visible` ONLY, which is a rule and its own contradiction one line
     apart. The site-wide sweep that day put every ring on the keyboard, and a
     page still suppressing on plain `:focus` is the page that stays behind. */
````

<a id="weight-28"></a>
## weight-28: demo/weight/index.html, inline script, line 155

````js
  // ── the room ──────────────────────────────────────────────────────────────
  // 15 m across. A word sits ON a wall plane or a little way out from it, and
  // ⚠️ NOTHING HERE BILLBOARDS: a word's facing is a property of the wall it
  // belongs to and never of where you are standing. That is the page.
````

<a id="weight-29"></a>
## weight-29: demo/weight/index.html, inline script, line 170

````js
  // ⚠️ `cap` IS THE CAP HEIGHT IN METRES, NOT THE QUAD HEIGHT. Sizing a quad by
  // its ink would set an accented word, whose diacritic climbs above the
  // capitals, smaller than a plain one at the same declared size, which is the
  // one thing a wall of words must not do. `line` does the same job for a
  // block: the distance from one baseline to the next.
  //   u    along the wall, in metres, from its middle
  //   y    the middle of the ink, in metres off the floor
  //   out  how far it stands off the wall, which is visible when you walk past
  //        the edge of one
````

<a id="weight-30"></a>
## weight-30: demo/weight/index.html, inline script, line 179

````js
  /**
   * 🔴 SIZE COMES FROM LENGTH AND FROM NOTHING ELSE. A cap height is never
   * authored per word here: it is `TALLEST` divided by the letter count, so the
   * shortest word in the room is always the biggest one in it. That is the
   * typographic argument of the page, and it is why the words can be RETYPED at
   * all. Type a shorter word over a longer one and it GROWS as you press
   * return, which is a thing a page of set type cannot do.
   *
   * ⚠️ AND IT IS NOT ASSERTED BY RE-DIVIDING THIS NUMBER. A check that
   * recomputed `TALLEST / length` would be comparing the rule with itself. The
   * one further down RENDERS every word head-on from one distance and measures
   * how tall its letters come out in pixels.
   */
````

<a id="weight-31"></a>
## weight-31: demo/weight/index.html, inline script, line 192

````js
  /**
   * 🔴 RAISED BY HALF ON 2026-09-19, AND IT IS THE ONLY NUMBER THAT SETS A
   * SIZE ON THIS PAGE. Instructed: *"make largest type 1.5x larger and
   * calculate others from there"*. It is written as the multiplication rather
   * than as 8.25 so that the instruction is still readable in the file, and it
   * is one constant rather than a table, so there is nothing here that can
   * disagree with anything else here.
   *
   * MEASURED afterwards, which is the half that matters, since a room 15 m
   * across has an edge a word can run off. The widest word on any wall is
   * `talk`, which now reaches 6.9 m of the 7.5 m half-wall and shared its wall
   * with `If` at 0.7 m of clear air between them. The tallest is `If` at 6.19 m
   * of capital, standing clear of the floor. The smallest of the five, at five
   * letters, is 1.98 m.
   */
````

<a id="weight-32"></a>
## weight-32: demo/weight/index.html, inline script, line 208

````js
  /**
   * How tall a capital stands: the shorter the word, the bigger it is drawn.
   *
   * ⚠️ MEASURED ON THE LONGEST LINE, NOT ON THE WHOLE STRING. Once a line break
   * survives, a two-line entry has two lengths and the total is neither: taking
   * the total would make `What is going` over `on?` smaller than `What is going
   * on?` on one line, which is backwards, since breaking a line makes it
   * NARROWER. The widest line is what has to fit, so it is what sets the size.
   */
````

<a id="weight-33"></a>
## weight-33: demo/weight/index.html, inline script, line 217

````js
  /**
   * 🔴 THE BIGGEST WORDS GET 1.5x AND THE SMALLEST 1.2x, AND THE REST ARE
   * INTERPOLATED. Asked 2026-09-16: *"largest type 2.5x larger, smallest 1.5,
   * calculate the rest."* 2.5 and 1.5 were measured and refused by the room on
   * the day, and 1.5 and 1.2 is what the walls took.
   *
   * `TALLEST / length` alone is a hyperbola, so the gap between a two-letter
   * word and a five-letter one is most of the range and everything longer is
   * already small. Multiplying the whole curve would have made the long entries
   * unreadable at the same rate; the ask is to STRETCH it, so a short word gets
   * more of the increase than a long one.
   *
   * ⚠️ IT IS ANCHORED ON THE AUTHORED WORDS, NOT ON THE LIVE SET. Anchoring on
   * whatever is currently on the walls would make one word's size depend on the
   * OTHER words, so retyping one would silently resize the rest: a room where
   * changing a word you are looking at changes four you are not. The five words
   * this room opens with are the design range, they are constants, and anything
   * typed longer than the longest of them simply gets the smallest scale.
   * 🔴 AND THE PARAGRAPH WAS LEAKING INTO THAT RANGE, WHICH MADE THE STRETCH
   * ALMOST INERT. FOUND 2026-09-19 while raising the size. `capRange` read
   * every row of `ITEMS`, and the last row is a block of prose 78 characters
   * long, so `hi` was 78 rather than 5: the five words sat in the first 4% of
   * the curve and came out within 1% of each other's multiplier. Every word on
   * the wall was effectively at `SCALE_BIG`, and `SCALE_SMALL` was a constant
   * nothing could reach. It reads only the rows that get a `cap`, which is what
   * the paragraph above it has always claimed, and the comment is the reason
   * the defect is nameable at all.
   * ⚠️ MEASURED BEFORE AND AFTER, because a stretch that starts working changes
   * every word that is not the largest: `talk` went to 2.68 m where a flat 1.5x
   * would have put it at 3.08 m and through the floor, and the five-letter
   * words to 1.98 m rather than 2.46 m. The largest is 1.5x either way, which
   * is what was asked for.
   * ⚠️ AND IT IS A `function`, NOT AN ARROW CONST, so it may read `ITEMS`,
   * which is declared below it. A `const` here would be a temporal dead zone at
   * module scope, which on this page means a blank room and no log line saying
   * why.
   */
````

<a id="weight-34"></a>
## weight-34: demo/weight/index.html, inline script, line 272

````js
  /**
   * 🔴 SENTENCE CASE, AND THE CAPITALS ARE THE VISITOR'S TO TYPE. The room used
   * to shout: every word was set in capitals, which is the page deciding on
   * somebody else's behalf how somebody else's words are said. Now that a word
   * can be typed over, the case belongs to whoever types it.
   *
   * ⚠️ THE WORDS WERE `KALEVIPOEG` AND THIS IS WHERE THEY WENT, written down so
   * nobody restores them thinking something was dropped by accident.
   * Kreutzwald's epic was the right content for a room of FIXED words: out of
   * copyright since 1952, and a reader in Tallinn has met all of it at school.
   * A room whose words are typed by the person standing in it has no content to
   * choose, and a sentence about walls is what four walls are for. The two font
   * files are still both shipped and still both checked: Estonian falls across
   * Google's unicode-range split, and `ensureFont()` measures an S against a Š
   * rather than trusting that some word on a wall happens to carry one.
   */
````

<a id="weight-35"></a>
## weight-35: demo/weight/index.html, inline script, line 298

````js
    // ⚠️ A BLOCK IS SET BY ITS BASELINE STEP AND NOT BY `capFor`. A paragraph
    // has no one length to be short, and the rule above is about words. This
    // one wraps itself: no newline, just 3.2 m of wall to fit into. A `\n` is
    // honoured as a hard break where somebody wants one.
    // ⚠️ IT SAID "YOUR OWN KEYBOARD OPENS" AND THAT IS NOT TRUE IN A HEADSET.
    // This block is the one instruction inside the room, so a runtime with no
    // way to show a keyboard during a session had this sentence on a wall in
    // front of somebody it was wrong about. What is true everywhere is the part
    // about the size, which is the page.
````

<a id="weight-36"></a>
## weight-36: demo/weight/index.html, inline script, line 313

````js
  // ⚠️ A REALLY SMALL AMOUNT, AND IT IS DELIBERATELY NOT ZERO. At 0.94 a word
  // in front of another shows a trace of it, which is what tells you the two
  // are at different depths when both are dead flat and facing the same way.
  // Below about 0.85 white on a dark room starts reading as grey rather than as
  // white-behind-white, and the weight goes out of the letters.
````

<a id="weight-37"></a>
## weight-37: demo/weight/index.html, inline script, line 321

````js
  /**
   * 🔴 THE MARK'S COLOUR LIVES HERE NOW, AND IT USED TO BE THE RAY'S.
   * It was `HELD_RGB` imported from `xr-ray.mjs` — the same yellow the pointer
   * went when it had hold of something — on the argument that a marked word
   * should be the ray's own meaning carried onto the thing it landed on. That
   * argument died on 2026-09-17, when the ray became grey everywhere and
   * `HELD_RGB` became WHITE: importing it would have painted a marked word the
   * same white as every unmarked one, so the one thing this page's trigger does
   * would have become invisible while every line of code still read as correct.
   * ⚠️ The page's own check is what would have caught it — it counts pixels of
   * the mark's colour against the ink's — which is why the number is worth
   * having in one place that a shader and a check both read.
   */
````

<a id="weight-38"></a>
## weight-38: demo/weight/index.html, inline script, line 334

````js
  /**
   * 🔴 GREY, NOT YELLOW, SINCE 2026-09-19: *"rm yellow color on hilite, just
   * make them subtly grayer"*. A yellow word was a second meaning on the one
   * channel this project reserves for how something LANDED, and on a wall of
   * white words it was the loudest thing in the room for a state that only means
   * "this is the one you are pointing at".
   * ⚠️ **DIMMER RATHER THAN DIFFERENT.** The ink is white; the mark is the same
   * white turned down. Nothing on this page has a hue now, which is what makes
   * a word being marked read as a state of that word rather than as a different
   * kind of word.
   * ⚠️ **AND THE NUMBER IS READ BY THE CHECK TOO.** The page counts pixels of
   * the mark against pixels of ink, so the value lives here once: a shader and a
   * check that each carried their own copy would agree until somebody changed
   * one.
   */
````

<a id="weight-39"></a>
## weight-39: demo/weight/index.html, inline script, line 351

````js
  /**
   * 🔴 THIS PAGE WAS `/held/` UNTIL 2026-09-19, AND EVERY QUOTE IN THIS FILE
   * THAT SAYS `held` IS ABOUT IT. Renamed on instruction, *"name the demo held,
   * rename old held to weight"*, so the name is free for a different demo. The
   * quotations were left exactly as they were said: rewording somebody's report
   * to match a later decision makes it stop being a quotation. This line is
   * here so that a reader meeting *"held demo: click in vr"* further down does
   * not go looking for it on whatever page carries that name now.
   * ⚠️ THE OLD URL IS NOT A DEAD LINK, which is what makes this different from
   * every other rename in this repo. `/held/` is being given to another demo
   * rather than retired, so a kept link opens something else and nothing tells
   * the reader they arrived at the wrong room.
   */
````

<a id="weight-40"></a>
## weight-40: demo/weight/index.html, inline script, line 366

````js
    // ⚠️ IT NAMES WHAT THE PAGE DOES NOW, AND IT USED TO NAME KREUTZWALD. The
    // words on these walls are the visitor's to type, so there is no longer a
    // source to credit. What has to be said instead is the rule that decides
    // how big a word comes out, because nothing on screen announces it.
    // ⚠️ IT DESCRIBED A READOUT THAT HAD BEEN DELETED, for two sessions, in a
    // sentence a visitor had no way to doubt. `nearest` and `magnified` were
    // both named here and neither is on the page. A description that has drifted
    // is worse than a missing one, and the repair is to re-read the whole
    // paragraph rather than to staple the new behaviour onto the end of it.
    // 🔴 ONE SENTENCE, 2026-09-19. It was five, which is the shape the old rule
    // allowed and nobody read: it explained the walk, the typing, the headset,
    // passthrough and the distance field, in that order, above a picture that
    // shows the first two the moment you drag it.
    // 🔴 AND IT IS THE INDEX'S OWN LINE, WORD FOR WORD, because this page has a
    // diagram now. A paragraph and a picture of the machinery are two
    // explanations of one thing and the paragraph is the weaker of them, so the
    // page says what it is once and lets the drawing at the bottom carry the
    // rest. Written twice in two files it would drift, so a visitor arriving
    // from the index must meet the same sentence rather than a second wording
    // of it.
````

<a id="weight-41"></a>
## weight-41: demo/weight/index.html, inline script, line 389

````js
    // ⚠️ FOUR CELLS, ALL OF WHICH MOVE. A count of the words was the obvious
    // fifth and it is a structural constant: a cell that cannot change teaches
    // a reader to stop looking at the row.
    // 🔴 NO READOUT. It carried `nearest`, `magnified`, `walked` and `fps`, and
    // all four are about the WALK rather than about the typography this page is
    // for. Standing in a room and reading what is on its walls is not a task
    // with numbers in it, and four cells of them above the picture were an
    // instrument panel bolted to a thing you look at. The frame rate is still
    // measured and still asserted, where it is graded rather than displayed.
````

<a id="weight-42"></a>
## weight-42: demo/weight/index.html, inline script, line 399

````js
    // 🔴 NO SHELL CONTROLS AT ALL NOW, AND BOTH THAT WERE HERE LEFT FOR A
    // REASON. `Run in VR` and `Run in AR` are a button group built below and
    // put back INSIDE this row, because the two of them share one question this
    // browser has to answer before either can be pressed and the group is what
    // owns a button being off with the reason shown for it.
    // 🔴 AND THE ⛶ WENT WHEN THE PANEL ARRIVED, 2026-09-19. The picture is a
    // video panel now, whose footer already carries a ⛶ in its right slot and
    // whose own way back out is in the picture. Two full-screen buttons on one
    // page is one control in two places, and the one that goes is the one
    // further from the thing it fills.
    // ⚠️ AN EMPTY ARRAY HIDES THE ROW, which is right for a page with nothing
    // in it and wrong here: the group is put in below, so the row is unhidden
    // at the same moment. See `d.controls`.
````

<a id="weight-43"></a>
## weight-43: demo/weight/index.html, inline script, line 418

````js
  // The field a word is retyped in. ⚠️ `autocapitalize` is OFF on purpose: the
  // case is the visitor's to choose, and a phone that capitalises the first
  // letter for them is making exactly the decision this page stopped making.
  // 🔴 A TEXTAREA OF THREE LINES, NOT ONE LINE OF INPUT. A wall takes a
  // sentence as readily as a word, and a single-line field says it does not:
  // what you can type is the shape of the box you type it in. Three lines is
  // enough to see a sentence whole without the field becoming the page.
````

<a id="weight-44"></a>
## weight-44: demo/weight/index.html, inline script, line 434

````js
  /**
   * 🔴 THE PICTURE IS A VIDEO PANEL NOW. Asked 2026-09-19: *"held: add
   * videofooter with fullscreen control and info what renders it"*. It answers
   * a question this page left open earlier the same day, when the way back from
   * full screen became a mode of the panel: whether a page covering the screen
   * with a bare canvas adopts the panel or keeps a button of its own. It adopts
   * the panel.
   *
   * ⚠️ `hover` IS THE DEFAULT AND IS RIGHT HERE. Full screen on this page is
   * for reading a room, and the footer would sit across the bottom wall of it.
   * The way back is a square in the bottom corner that comes up whenever a hand
   * moves, which is the piece this page mounted by hand last round and no
   * longer has to.
   * ⚠️ AND THE PANEL IS WHAT GOES FULL, not the canvas. The footer belongs to
   * the picture, so a page that filled only the canvas would leave its own way
   * out underneath the cover, which is the trap a phone was photographed in.
   */
````

<a id="weight-45"></a>
## weight-45: demo/weight/index.html, inline script, line 457

````js
    /**
     * 🔴 WHAT DREW THE PICTURE, WHERE A PRESENCE DOT WOULD OTHERWISE GO.
     * The default left slot is a badge saying whether the thing feeding the
     * picture is answering, and on this page nothing is feeding it from
     * anywhere: there is no board, no relay and no station, so that badge could
     * only ever read online. A control with one honest state is the shape this
     * project calls a lie, and `/mirror/` already refuses the same dot under
     * its near pane for the same reason.
     * ⚠️ SO THE SLOT CARRIES THE ONE FACT THIS PAGE HAS ABOUT ITS OWN PICTURE,
     * which it already knew and was writing to a log line that scrolls away.
     */
````

<a id="weight-46"></a>
## weight-46: demo/weight/index.html, inline script, line 477

````js
  // 🔴 `alpha: true`, AND IT IS NOT A DEFAULT BEING ACCEPTED. The compositor
  // puts the real room behind the page in passthrough and can only do that
  // through transparent pixels; with `alpha: false` there is nothing to clear to
  // zero and the room is REPLACED by black rather than composited under.
````

<a id="weight-47"></a>
## weight-47: demo/weight/index.html, inline script, line 491

````js
    /**
     * 🔴 NAME THE CHIP, NOT THE FIRST COMMA. Splitting
     * "ANGLE (Apple, ANGLE Metal Renderer: Apple M2 Pro, Unspecified Version)"
     * on its first comma leaves the word "Apple", which says nothing at all.
     * The part worth printing is what follows "Renderer:".
     * ⚠️ SECOND COPY OF THIS IN THE PROJECT, and `/mirror/` has the first. Both
     * pages put the same fact in the same kind of cell, and a third would make
     * it a kit module rather than a line to copy again.
     * ⚠️ THE FULL STRING STAYS ON `__demo.gl.renderer`, which is what the
     * harness compares its own answer against. The cell is for a reader.
     */
````

<a id="weight-48"></a>
## weight-48: demo/weight/index.html, inline script, line 521

````js
  /**
   * 🔴 THE ROOM MOVES, NOT YOU — one matrix, and both the window and the headset
   * go through it. The content is authored in room coordinates; this is
   * room -> the space the eye is reported in. `rotY(turn) * translate(-p)`
   * takes the point you are standing on to the origin and the way you are
   * facing to -Z, which is exactly what a headset's own space already means.
   *
   * ⚠️ IT IS A PURE FUNCTION OF THREE NUMBERS, DELIBERATELY. Walking and turning
   * are the two things on this page that can be wrong in a way no picture shows
   * — a stick that turns you the wrong way is still a room — and a pure function
   * can be graded with no browser, no GPU and no headset in the loop. `floor`
   * pays for that lesson in its own header.
   *
   * 🔴 `py` IS HERE BECAUSE LEAVING IT OUT COST AN HOUR AND LOOKED LIKE FOUR
   * OTHER BUGS. The window path passed no eye height, so the camera sat at
   * y = 0 — exactly ON the ground plane — and an infinite floor seen from
   * exactly its own height is a line at the horizon: the dotted floor rendered
   * ZERO pixels and read as a shader that had never been wired up, which is
   * what two rounds of shader edits were spent on. The words gave it away only
   * in hindsight: every one of them sat in the upper half of the frame, because
   * they were being looked at from the floor. ⚠️ In a headset it is 0 on
   * purpose — `local-floor` means the headset's own pose already carries how
   * tall you are, and adding it here would put you on somebody's shoulders.
   *
   * 🔴 AND THE SIGN HERE WAS WRONG, WITH AN ASSERT ON IT THAT PASSED. It read
   * `rotY(-turn)`, and the check beside it applied the matrix to the room's
   * axes and compared the answer to what that same wrong reasoning predicted —
   * CLAUDE.md's *"a test compared against a number derived from the SAME
   * formula catches a typo and can never catch a misreading"*, in four lines.
   * What caught it was `probe()` further down, which RENDERS the word from an
   * angle and looks for pixels: at 70° off the wall it found none at all,
   * because the camera was pointing the other way. The assert now names the
   * claim — the direction you face comes out as straight ahead — rather than
   * re-deriving the matrix.
   */
````

<a id="weight-49"></a>
## weight-49: demo/weight/index.html, inline script, line 566

````js
  /**
   * 🔴 THE OTHER DIRECTION, WHICH THE PAGE NEEDED THE MOMENT YOU COULD POINT AT
   * SOMETHING. A headset reports a hand where the HEADSET's space says it is;
   * the words live in room coordinates. `roomToEye` is `rotY(turn)` after a
   * translation, so coming back is the translation after `rotY(-turn)`, and the
   * rotation alone is what a DIRECTION needs.
   *
   * ⚠️ THIS WAS ALREADY BEING DONE INLINE AND IT WAS MIRRORED. The old line
   * read `pos[0] + head[12] * c + head[14] * s`, which is `rotY(+turn)`: correct
   * at a turn of zero and wrong by twice the angle after that. It only fed the
   * back-to-front sort and the floor's centre, so it never drew anything anybody
   * could point at, and nothing on the page could see it. The check below runs
   * it against `roomToEye` itself, which is graded by rendering rather than by
   * arithmetic.
   */
````

<a id="weight-50"></a>
## weight-50: demo/weight/index.html, inline script, line 590

````js
  // ── where you are ─────────────────────────────────────────────────────────
  // Room coordinates. `turn` is the facing the locomotion owns; on the window a
  // drag writes it directly, in a headset the neck owns the rest of the facing
  // and the stick only ever moves this in steps.
````

<a id="weight-51"></a>
## weight-51: demo/weight/index.html, inline script, line 595

````js
  // ⚠️ THE MIDDLE OF THE ROOM, NOT BACKED UP AGAINST A WALL. Five words on four
  // walls is a sparser room than the fourteen this page used to hold, and from
  // the old arrival spot two of them were behind you and one was too far to
  // read. From the middle every wall is a turn away.
````

<a id="weight-52"></a>
## weight-52: demo/weight/index.html, inline script, line 614

````js
    // 🔴 BEFORE `linkProgram`, NEVER AFTER. Called after the link it is a no-op
    // that reads like a fix — a Quest reported GL_INVALID_OPERATION on its first
    // frame and drew correctly anyway, because the linker happened to pick the
    // same slot. A page will render a right-looking picture with an error
    // pending, which is why `gl.getError()` is asserted below.
````

<a id="weight-53"></a>
## weight-53: demo/weight/index.html, inline script, line 638

````js
  // 🔴 THE EDGE IS RECONSTRUCTED, NOT INTERPOLATED, AND `fwidth` IS WHY IT COSTS
  // NOTHING. The stored value is a distance, so its screen-space gradient is
  // exactly how many texels one pixel covers — which is the correct softening
  // width at any magnification, on its own, with no distance uniform and no
  // level of detail to choose. ⚠️ Clamped at both ends: a quad seen edge-on has
  // a gradient that runs away, and an unclamped width there turns a word into a
  // grey smear rather than into the thin line it should be.
  // ⚠️ `uCol` IS NEW AND EVERY DRAW HAS TO SET IT. It was a literal white, and a
  // uniform nobody sets is zero — which is BLACK ink on a dark room, drawn
  // correctly and invisible. Both callers below set it, and `probe()` sets it
  // too: the probes read the RED channel to find ink, so a probe that left this
  // at its default would report every word on the page as blank.
````

<a id="weight-54"></a>
## weight-54: demo/weight/index.html, inline script, line 677

````js
  // ⚠️ THE DOTS ARE COMPUTED FROM WORLD POSITION, so the quad can be parked on
  // the viewer without the pattern sliding under them — which is the difference
  // between a floor and a treadmill, and the one thing a ground reference is
  // for.
````

<a id="weight-55"></a>
## weight-55: demo/weight/index.html, inline script, line 739

````js
  /**
   * 🔴 HOW BIG THE ROOM IS RIGHT NOW, AS ONE NUMBER. 1 on the page and in VR,
   * `AR_SCALE` in passthrough.
   *
   * Reported 2026-09-17: *"texts in xr seems to be behind to walls sometime"*.
   * This room is 15 m across with capitals up to 2.75 m tall, which is right
   * for a room the page invents and is wrong for the one you are standing in:
   * in passthrough the words are placed 7.5 m out, which is through the wall of
   * any ordinary room. Nothing occludes them — a Quest composites passthrough
   * without depth by default — so they are visible AND outside the room, which
   * is exactly what "behind the walls" looks like from inside one.
   *
   * ⚠️ IT IS A UNIFORM SCALE, SO THE TYPOGRAPHY IS UNTOUCHED. Every position
   * and every quad moves by one factor, so the relative sizes — which are the
   * whole argument of this page — are identical and the room is simply smaller.
   * ⚠️ AND IT SCALES ABOUT EYE HEIGHT, NOT ABOUT THE FLOOR. Scaling y about 0
   * would take words standing at 1.3 to 3.5 m down to knee height, so you would
   * be reading a room that had sunk. About `EYE_Y` they stay level with you.
   * ⚠️ NOTHING IS RE-RASTERISED. `buildText` works in the word's own units and
   * `place` is the only thing that knows about metres, so changing this is one
   * pass of arithmetic over the list rather than eleven glyph atlases.
   *
   * 🔴 THE NUMBER IS A GUESS UNTIL A HEADSET SAYS OTHERWISE, and it is one
   * constant so it can be moved in one place. 0.30 puts the walls at 2.25 m and
   * the tallest capital at 0.83 m — a room you can stand in the middle of and
   * still turn all the way round, which is what this page is. What it is NOT is
   * a measurement of YOUR room: `plane-detection` would answer that and this
   * page does not ask for it.
   */
````

<a id="weight-56"></a>
## weight-56: demo/weight/index.html, inline script, line 790

````js
  /**
   * Put the room at a size, in place.
   *
   * ⚠️ IT REPLACES THE OBJECTS IN `built`, so anything holding one has to be
   * caught up — the same hazard `retext` already documents about the mark and
   * the word being carried out of a session. Returns the factor it is at, so a
   * check and a log line read the same value rather than two.
   */
````

<a id="weight-57"></a>
## weight-57: demo/weight/index.html, inline script, line 819

````js
        // ⚠️ THE TEXELS A WORD GETS, AND IT WENT UP AFTER SOMEBODY ZOOMED IN.
        // 200 px of raster is 100 texels of field, which is plenty at arm's
        // length and visibly rippled when a capital fills the screen — nine
        // screen pixels per texel leaves nothing to hide a half-texel error in.
        // 320 costs about two and a half times the transform (measured in the
        // load line below) and a quarter of a megabyte across all eleven, which
        // is nothing, and it is the cheaper half of the repair: the other half
        // was giving the transform sub-pixel input at all.
````

<a id="weight-58"></a>
## weight-58: demo/weight/index.html, inline script, line 849

````js
    // ⚠️ FAINTER IN PASSTHROUGH, because there is already a floor there and the
    // dots are a hint about where the room's own ground is rather than the
    // ground itself.
````

<a id="weight-59"></a>
## weight-59: demo/weight/index.html, inline script, line 855

````js
    // 🔴 BACK TO FRONT, AND IT IS SORTED ONCE PER FRAME RATHER THAN ONCE PER
    // EYE. Translucent ink needs an order; taking that order from the head
    // rather than from each eye keeps the two views agreeing about which word is
    // in front, and 64 mm of separation cannot change the answer at these
    // distances anyway.
````

<a id="weight-60"></a>
## weight-60: demo/weight/index.html, inline script, line 861

````js
    // 🔴 AND THE MATRIX. This line was missing, and every check on this page
    // passed anyway: `probe()` sets `uVP` itself before it draws, so all fifteen
    // asserts rendered through a path that supplied the one uniform the real
    // frame loop never did. On screen the words were drawn with whatever matrix
    // the last probe had left behind — a letterform the size of the window — and
    // the suite said 15/15. That is CLAUDE.md's *a green suite can mean zero
    // coverage* with a new hat on, and the repair is not this line: it is the
    // check below that renders through `drawScene` instead of around it.
````

<a id="weight-61"></a>
## weight-61: demo/weight/index.html, inline script, line 877

````js
      // 🔴 THE WHOLE OF WHAT A TRIGGER PRESS DOES IN A HEADSET, IN ONE LINE. The
      // word you pulled the trigger on is repainted where it stands, so the
      // press has an answer you can see from inside the room. It used to have
      // one you could only see by being thrown out of the room.
````

<a id="weight-62"></a>
## weight-62: demo/weight/index.html, inline script, line 918

````js
    // 🔴 A SOFT WALL, NOT A HARD ONE. Nothing stops you leaving; the room is
    // just where the words are. But a viewer 400 m out is looking at nothing and
    // has no way of knowing which direction anything is, so the reach is capped
    // at three rooms and the readout keeps saying how far the nearest word is.
````

<a id="weight-63"></a>
## weight-63: demo/weight/index.html, inline script, line 927

````js
  // 🔴 A PAGE THAT WALKS ON `w` AND ALSO TAKES TYPING HAS TO ASK WHICH IS
  // HAPPENING. Without this guard, typing `walls` into the field would slide you
  // across the room and `preventDefault` would eat the letters as they were
  // pressed, so the field would look broken and the room would look haunted.
````

<a id="weight-64"></a>
## weight-64: demo/weight/index.html, inline script, line 635

````js
  /**
   * Where a ray lands, in room coordinates. Every word is a flat quad on a wall
   * whose normal is the wall's, so this is a plane crossing followed by two
   * comparisons against the quad's own half-extents.
   *
   * ⚠️ `r` AND `up` ARE HALF-VECTORS, not axes plus a size. They are what the
   * shader is handed, which is the point: the thing being pointed at and the
   * thing being drawn are described by the same three numbers, so a word cannot
   * be picked anywhere other than where it appears.
   */
````

<a id="weight-65"></a>
## weight-65: demo/weight/index.html, inline script, line 680

````js
  /**
   * 🔴 THE WORD THE TRIGGER HAS HOLD OF, AND IT IS WHAT REPLACED ENDING THE
   * SESSION. REPORTED from a real Quest in these words: **"held demo: click in
   * vr brought me back to browser."** The page was doing that on purpose. Where
   * a runtime refuses to put a text field inside the session there is no
   * keyboard to raise, and the old answer was to leave the session so the
   * keyboard could be raised over the window instead. Every step of that
   * reasoning is true and the result is the worst outcome available: the one
   * gesture the page advertises throws you out of the room.
   *
   * So the press now MARKS. The word goes the colour the pointer goes when it
   * has hold of something, it stays marked while you walk around and look at it
   * from the side, another press moves the mark, and the word you left marked
   * is the one the field opens on when YOU decide to leave. Nothing about the
   * way out changes: it is still any button under your thumb, held.
   *
   * ⚠️ IT IS NOT A WORSE KEYBOARD, IT IS A DIFFERENT DIVISION OF THE JOB. The
   * choosing is the part that needs the room and it happens in the room; the
   * typing is the part that needs a keyboard and it happens where there is one.
   * `plans/plan-vr-text-entry.md` prices the options for typing in the room itself.
   */
````

<a id="weight-66"></a>
## weight-66: demo/weight/index.html, inline script, line 711

````js
    // 🔴 NEWLINES SURVIVE. This was `replace(/\s+/g, ' ')`, which is every kind
    // of whitespace INCLUDING `\n`, so a line break typed into the field was
    // destroyed here and the wall drew one long line. `buildText` has honoured
    // `\n` as a hard break since it was written; nothing downstream needed
    // changing, the text simply never arrived with one in it.
    //
    // ⚠️ SPACES ARE STILL COLLAPSED, WITHIN A LINE. Two spaces between words is
    // a typing artefact and reads as a gap in a wall of type; a line break is a
    // decision. Blank lines at either end go, blank lines in the middle stay,
    // because somebody who typed one meant it.
````

<a id="weight-67"></a>
## weight-67: demo/weight/index.html, inline script, line 733

````js
    // ⚠️ `ITEMS` IS KEPT IN STEP, not left behind. A check on this page asks
    // that every word is a word and counts `built` against `ITEMS`, and a page
    // whose two lists have drifted is a page whose asserts are about the old
    // room.
````

<a id="weight-68"></a>
## weight-68: demo/weight/index.html, inline script, line 739

````js
    /**
     * 🔴 AN EDITED WORD GOES BACK TO WHITE. Instructed 2026-09-19: *"after edit
     * restore white"*. The mark says "this is the one you are pointing at, and
     * typing will replace it"; once the typing has happened that sentence is
     * spent, and a word left grey afterwards is a state nobody can see the end
     * of.
     * ⚠️ IT USED TO BE CARRIED ONTO THE NEW OBJECT (`marked = nb`), for a reason
     * that was right at the time and is worth keeping in view: `retext` replaces
     * the object in `built`, so a mark left pointing at the OLD one compares
     * unequal to everything drawn and the colour comes off a word nobody
     * unmarked. Clearing it outright has the same effect and states the
     * intention, where carrying it forward only to drop it later would not.
     * ⚠️ IN A HEADSET THIS FIRES ON THE FIRST KEYSTROKE, because the room's own
     * keyboard retexts per letter. That is the behaviour wanted: by then you are
     * typing, so the mark has done its job.
     */
````

<a id="weight-69"></a>
## weight-69: demo/weight/index.html, inline script, line 756

````js
    // ⚠️ AND SO IS THE ONE BEING CARRIED OUT OF THE SESSION. A word typed over
    // with the headset's own keyboard is retexted on every keystroke, so by the
    // time the session ends the object the trigger stored is several rebuilds
    // stale — and opening the field on it would put the text back to what it was
    // before the first letter, which reads as the typing having been thrown away.
````

<a id="weight-70"></a>
## weight-70: demo/weight/index.html, inline script, line 767

````js
  // ⚠️ WHAT IS ON THE WALLS, WHERE SOMETHING OUTSIDE THE PAGE CAN READ IT. The
  // asserts are taken once at load and the words can change at any time after
  // it, so a check that drives a real click has no other way to see whether the
  // wall actually changed or only the field did.
````

<a id="weight-71"></a>
## weight-71: demo/weight/index.html, inline script, line 778

````js
  /**
   * @param {boolean} [o.keepMark] leave the word lit while it is being typed.
   *
   * ⚠️ FALSE ON THE PAGE AND TRUE IN A SESSION, AND IT IS NOT A PREFERENCE. On
   * the page the field is on screen an inch under the word, so a lit word is
   * the same fact in two places and the wall is about to be overwritten letter
   * by letter anyway. Inside a headset the field is BEHIND YOUR FACE: focusing
   * it is what raises the runtime's own keyboard, but nothing about it can be
   * seen from in there. The lit word is then the only thing in the room saying
   * which word the keyboard is pointed at, which is the opposite of a duplicate.
   */
````

<a id="weight-72"></a>
## weight-72: demo/weight/index.html, inline script, line 803

````js
  /**
   * 🔴 THE WALL FOLLOWS THE KEYSTROKE. It used to rebuild only on Return, so
   * every letter you typed went into a box at the bottom of the screen while
   * the thing you were editing sat unchanged above it: you were writing blind
   * and finding out at the end. Since the size comes from the LENGTH, the
   * letter you are typing is the one changing how big the word will be, and
   * watching that happen is the page.
   *
   * ⚠️ REBUILT ON A FRAME, NOT ON THE EVENT. `retext` rasterises a new glyph
   * atlas and uploads a texture; doing that inside the keydown of somebody
   * typing quickly queues one upload per keystroke and the field goes sticky.
   * One rebuild per animation frame collapses a burst to what the eye can see
   * anyway, and a key pressed while one is pending still lands, because the
   * pending flag is cleared before the work rather than after it.
   */
````

<a id="weight-73"></a>
## weight-73: demo/weight/index.html, inline script, line 819

````js
  /**
   * 🔴 THE SESSION'S OWN rAF IN A HEADSET, AND THIS IS THE WHOLE OF THE BUG
   * REPORTED 2026-09-17: *"text input appears in vr/ar but 3d type does not
   * change nof after submit nor realtime"*.
   *
   * `window.requestAnimationFrame` DOES NOT FIRE while an immersive session is
   * running — this repo has that written down in `demo/videoradio/index.html`
   * and it is why every headset page here drives its picture from
   * `session.requestAnimationFrame`. The rebuild above was scheduled on the
   * WINDOW's, so inside a session the callback was queued and never ran: the
   * wall never changed.
   *
   * ⚠️ AND IT LATCHED, WHICH IS WHY THE SECOND HALF OF THE REPORT IS THE SAME
   * BUG. `liveWaiting` is set true before the callback and cleared inside it,
   * so the first keystroke in a session parked it true FOREVER and every later
   * keystroke returned at the first line. That is also why "after submit"
   * failed: Return does not rebuild anything, it closes the field — the text on
   * the wall is whatever the last `retext` put there, and in a session there
   * had never been one.
   *
   * ⚠️ THE COALESCING IS THE POINT AND IT SURVIVES. `retext` rasterises a glyph
   * atlas and uploads a texture; doing that inside the keydown of somebody
   * typing quickly queues one upload per keystroke and the field goes sticky.
   * One rebuild per drawn frame collapses a burst to what the eye can see —
   * whichever clock is drawing.
   */
````

<a id="weight-74"></a>
## weight-74: demo/weight/index.html, inline script, line 846

````js
    // ⚠️ ASK FOR THE METHOD, DO NOT ASSUME THE OBJECT HAS IT. The check block
    // at the bottom of this page stands a stub in for `xrSession` — it has an
    // `end` and nothing else — and an optional call on a missing method would
    // schedule NOTHING and latch `liveWaiting`, which is the bug this function
    // exists to fix, reintroduced by the thing grading it.
````

<a id="weight-75"></a>
## weight-75: demo/weight/index.html, inline script, line 872

````js
    // ⚠️ RETURN IS A NEWLINE NOW, AND ONLY MODIFIER-RETURN FINISHES. In a
    // one-line field Return could only ever have meant "done"; in a three-line
    // one it means what it means in every other textarea, and taking that away
    // would be a box shaped for three lines that refuses to hold two.
````

<a id="weight-76"></a>
## weight-76: demo/weight/index.html, inline script, line 887

````js
  // 🔴 THE PICTURE IS THE CANVAS, AND NOTHING ELSE IN THIS BOX IS THE PICTURE.
  // This used to read `if (e.target === typeEl) return`, which named the one
  // other child there was. A second arrived on 2026-09-19, the way out of full
  // screen, and it sits in the bottom corner ON the picture: a press on it
  // would have started a drag, captured the pointer, and on release been
  // counted as a tap that ray casts through the button and types over whatever
  // word is behind it. One gesture doing two things, and only one of them was
  // asked for. Naming the canvas rather than the exceptions means the next
  // thing mounted in here cannot reintroduce it.
````

<a id="weight-77"></a>
## weight-77: demo/weight/index.html, inline script, line 907

````js
  // ⚠️ A CLICK IS A DRAG THAT DID NOT GO ANYWHERE. The same pointer both looks
  // around and picks a word, so the only thing separating them is how far it
  // travelled: four pixels is under a hand tremor and over a tap's wobble.
````

<a id="weight-78"></a>
## weight-78: demo/weight/index.html, inline script, line 949

````js
    // ⚠️ `fps` IS STILL COUNTED AND NO LONGER DISPLAYED. The readout is gone and
    // `d.set` THROWS on a key `mount()` never declared, so leaving the call in
    // killed the render loop on its first frame: the picture froze, clicking a
    // word did nothing, and the only sign was one line in the log. `fps` is
    // read by the checks below, so the arithmetic stays.
````

<a id="weight-79"></a>
## weight-79: demo/weight/index.html, inline script, line 977

````js
  // 🔴 THE PAGE NO LONGER ASKS THIS BROWSER ITSELF, AND THE LINE IT USED TO
  // WRITE HAD A HOLE ONE CHARACTER WIDE. It was
  // `navigator.xr?.isSessionSupported(…).then(v => vrKnown = v, () => vrKnown =
  // false)`, and on a browser with no `navigator.xr` at all the optional chain
  // returns undefined, so NEITHER handler runs and the variable stays `null`
  // for the life of the page. The check below then read `null` as "the page
  // failed to ask" and reported FAIL to somebody holding an iPhone, which has
  // no WebXR and never will. Reported 2026-09-19: *"having no capability is not
  // fail, its default info"*.
  // ⚠️ `xr-caps.mjs` HAS A THIRD ANSWER FOR IT. `absent` means there was nothing
  // to ask, it lands in the same turn the probe is built rather than never, and
  // `answered()` counts it as an answer. Nothing here keeps a copy of the
  // states: `xrCaps()` is read where it is needed, so the page and the controls
  // cannot end up describing two different browsers.
````

<a id="weight-80"></a>
## weight-80: demo/weight/index.html, inline script, line 992

````js
  // Snap turn, latched: the stick has to come back to the middle before it can
  // turn you again. ⚠️ SNAP RATHER THAN SMOOTH, and it is the one comfort
  // decision on this page that is not a matter of taste — a continuously
  // rotating world is the best-known way to make somebody ill in a headset, and
  // a step has no rotation to be sick of.
````

<a id="weight-81"></a>
## weight-81: demo/weight/index.html, inline script, line 1001

````js
    // ⚠️ AXES 2 AND 3 ARE THE THUMBSTICK, 0 and 1 are the touchpad that these
    // controllers do not have — a page that reads 0/1 reads zeroes for ever on
    // hardware where the stick works perfectly.
````

<a id="weight-82"></a>
## weight-82: demo/weight/index.html, inline script, line 1012

````js
  // 🔴 THE HEADSET'S OWN KEYBOARD, NOT ONE MODELLED IN THE ROOM. A device with
  // text entry already has one that knows the wearer's languages, their
  // dictation and their autocorrect, and the only thing that raises it is a
  // focused text field. A keyboard modelled in the room would be a worse copy of
  // a thing already in the box.
  //
  // 🔴 AND THERE ARE TWO SEPARATE WAYS TO REACH IT, WHICH THIS PAGE HAD
  // CONFLATED INTO ONE. They are different features, they are granted by
  // different runtimes, and asking only the first is what made a trigger press
  // eject somebody from a headset.
  //
  //   · `dom-overlay` puts the page's OWN elements in front of somebody inside
  //     a session. It is asked for as an OPTIONAL feature so a runtime that
  //     refuses it still gets a working page.
  //   · `session.isSystemKeyboardSupported` is the runtime saying that focusing
  //     a field raises ITS keyboard, as system UI, over whatever the session is
  //     drawing. The field itself stays behind your face and is never seen.
  //
  // ⚠️ THE SECOND IS NOT A FALLBACK FOR THE FIRST, and the page does not choose
  // between them: where the keyboard is offered the word is marked AND the field
  // is focused, so a runtime that answers yes and then does nothing still leaves
  // a visible answer on the wall. Neither of these can be established from this
  // laptop — desktop Chrome reports `immersive-vr false` and never enters a
  // session at all — so both are published on `__demo.xr` for a headset run to
  // read back rather than asserted here.
````

<a id="weight-83"></a>
## weight-83: demo/weight/index.html, inline script, line 1038

````js
  /**
   * What a session says about the runtime's own keyboard: `true`, `false`, or
   * `'unknown'` where it does not carry the attribute at all.
   *
   * ⚠️ A NAMED FUNCTION SO IT CAN BE GRADED, and that is not tidiness. It was
   * two inline characters (`!!`), and the check written for it set the RESULT
   * by hand and then tested the branch: sabotaging the real decision left the
   * check green, because `'unknown'` is truthy and so is `true`. A check that
   * cannot see the thing it is about is the trap CLAUDE.md records twice, once
   * for a format and once for geometry. The claim is about the DECISION, so the
   * decision has to be reachable.
   */
````

<a id="weight-84"></a>
## weight-84: demo/weight/index.html, inline script, line 1068

````js
    // 🔴 IT MARKS. IT DOES NOT END THE SESSION. This line used to read
    // `xrSession?.end()`, on the argument that a trigger landing on a word and
    // producing no field is a control that looks live and is inert. The
    // argument is sound and the fix was the one thing worse than the problem:
    // from inside the headset it is indistinguishable from the page crashing.
    // A mark is visible, it is undone by marking something else, and it leaves
    // the wearer exactly where they were.
````

<a id="weight-85"></a>
## weight-85: demo/weight/index.html, inline script, line 1077

````js
    // ⚠️ MARKED FIRST, THEN THE KEYBOARD ASKED FOR — in that order, and the order
    // is the whole safety of it. Focusing a field is a request; a runtime that
    // claims the keyboard and does not raise one leaves a press with no answer,
    // which is the inert control this page is trying to stop being. Marking
    // first means the worst case is a lit word and a keyboard that did not come,
    // and the word is still there to type over on the way out.
````

<a id="weight-86"></a>
## weight-86: demo/weight/index.html, inline script, line 1089

````js
    // ⚠️ THE LOG LINE IS FOR AFTERWARDS, NOT FOR NOW. It is on the flat page,
    // behind your face; nothing said here can be read until the session ends.
    // The colour on the wall is the whole of what this press reports in the
    // room, which is why the press had to change the picture and not the log.
````

<a id="weight-87"></a>
## weight-87: demo/weight/index.html, inline script, line 1100

````js
    // 🔴 ONE GUARD FOR THREE CASES, AND NONE OF THEM IS A FAULT. `no` is a
    // laptop, `absent` is a phone, and both are ordinary facts about the
    // machine somebody is holding rather than something this page got wrong, so
    // the line carries no level at all: the log's plain ink is what information
    // looks like here, and `bad` is reserved for something that broke.
    // ⚠️ `asking` PASSES THROUGH ON PURPOSE. It only ever happens on a browser
    // that has `navigator.xr`, so `requestSession` below has something to be
    // called on, and refusing a press while an answer is in flight would be the
    // page guessing.
````

<a id="weight-88"></a>
## weight-88: demo/weight/index.html, inline script, line 1116

````js
      // ⚠️ NO AWAIT BEFORE requestSession — it needs a transient user activation
      // and awaiting anything first can spend it. The support answers were taken
      // at load for exactly this reason.
````

<a id="weight-89"></a>
## weight-89: demo/weight/index.html, inline script, line 1125

````js
      // 🔴 THE WAY OUT IS MOUNTED BEFORE ANYTHING ELSE IS TRIED, AND IT IS THE
      // FIRST LINE AFTER THE SESSION EXISTS ON PURPOSE. Everything below this
      // can throw: `makeXRCompatible`, the layer, the reference space. A throw
      // there is caught at the bottom of this function and logged, which reads
      // like a handled error and is not one, because the SESSION IS ALREADY
      // LIVE and the dead man's switch is registered at the end of the block
      // that just aborted. Somebody is then standing in a room with nothing
      // drawing and nothing to press. Mounted here, the hold is already running
      // on the session's own frame loop before any of that can happen.
      // ⚠️ AND THERE IS NO `update` TO CALL. `mountXRQuit` puts its own callback
      // on `session.requestAnimationFrame`, so the hold advances even if this
      // page's render loop never starts. That is the repair for the failure
      // CLAUDE.md records: `/blocks/` built the badge, drew it every frame and
      // never advanced it, so there was no way out of that page at all.
      // ⚠️ NO `onQuit` AND NO `session.end()`. The module ends the session
      // itself, and everything this page has to put away is already in the
      // `end` listener below, which runs whatever ends the session.
      // ⚠️ NO LABEL AND NO BUTTON PASSED. The defaults are the site's decision,
      // any button held three seconds, and a page that retypes them can
      // disagree with the module about how somebody leaves it.
````

<a id="weight-90"></a>
## weight-90: demo/weight/index.html, inline script, line 1149

````js
      // 🔴 THE BLEND MODE, NOT THE SESSION NAME. A session can be called
      // `immersive-ar` and still composite `opaque`, which arrives as a drawing
      // bug rather than as a session one.
````

<a id="weight-91"></a>
## weight-91: demo/weight/index.html, inline script, line 1154

````js
      // 🔴 THE ROOM SHRINKS TO FIT YOURS, AND THE TEST IS THE BLEND MODE.
      // *"texts in xr seems to be behind to walls sometime"* — see `AR_SCALE`.
      // ⚠️ NOT THE SESSION'S NAME. CLAUDE.md records that a session can be
      // called `immersive-ar` and still composite `opaque`, and then there is
      // no real room behind the page to be inside of: shrinking it on the name
      // would put a small room in a black void for no reason anybody could see.
````

<a id="weight-92"></a>
## weight-92: demo/weight/index.html, inline script, line 1166

````js
      // ⚠️ ASKED OF THE SESSION, NOT OF THE REQUEST. `optionalFeatures` says what
      // was wanted; `domOverlayState` says what was granted, and the two differ
      // on every runtime that does not implement it.
````

<a id="weight-93"></a>
## weight-93: demo/weight/index.html, inline script, line 1170

````js
      /**
       * 🔴 THREE ANSWERS, NOT TWO, AND `undefined` IS THE THIRD. It was `!!`,
       * on the reasoning that a runtime without the attribute would leave a
       * field focused that nothing answers. True, and it makes the page REFUSE
       * TO TRY on every runtime that has not shipped the attribute yet, which
       * is the larger failure: CLAUDE.md's rule is that a probe which could not
       * answer returns `unknown` and unknown NEVER BLOCKS, because "we did not
       * look" must not read as "it is missing".
       *
       * So `true` tries, `undefined` tries and says it is guessing, and only an
       * explicit `false` does not. The cost of trying and being wrong is a
       * focused field behind your face, which the marked word already covers;
       * the cost of not trying is no keyboard on a headset that had one.
       */
````

<a id="weight-94"></a>
## weight-94: demo/weight/index.html, inline script, line 1190

````js
      // ⚠️ THERE IS NOTHING TO READ IN THERE, so this line says what the sticks
      // do and lets the ring speak for itself. A log line is behind your face in
      // an immersive session; it is the one place an instruction cannot be read.
````

<a id="weight-95"></a>
## weight-95: demo/weight/index.html, inline script, line 1197

````js
      // 🔴 `overlay` IS THE ONE MEASUREMENT THAT SETTLES WHAT THIS PAGE SHOULD
      // DO, AND IT IS PUBLISHED SO A HARNESS CAN READ IT. Whether a runtime will
      // put a text field inside an immersive session is a fact about the runtime
      // that nothing on this laptop can answer: desktop Chrome reports
      // `immersive-vr false` and never enters. `demo/verify-quest.mjs weight` on a
      // real headset reads this object back and prints it.
      //
      // ⚠️ `presenting` AND `frames` ARE THE QUEST HARNESS'S OWN CONTRACT, not
      // decoration. Without them its compositor lane says "the page did not
      // present" and grades nothing, which is a lane reporting silence about a
      // session that ran.
````

<a id="weight-96"></a>
## weight-96: demo/weight/index.html, inline script, line 1218

````js
        // ⚠️ A REBUILD QUEUED ON THE SESSION'S OWN rAF NEVER RUNS ONCE THE
        // SESSION HAS GONE, and the flag it set would stay true for the rest of
        // the page's life — every later keystroke would return at the first
        // line of `liveRetext` and the wall would stop following the field. The
        // window loop restarts below, so the next keystroke schedules again.
````

<a id="weight-97"></a>
## weight-97: demo/weight/index.html, inline script, line 1224

````js
        // ⚠️ NO `xrQuit.reset()`. The way out belongs to the session, and the
        // next `enterXR` mounts a fresh one on a fresh session. Resetting an
        // object whose session has ended says nothing about the next one.
````

<a id="weight-98"></a>
## weight-98: demo/weight/index.html, inline script, line 1231

````js
        // The word you marked in the room, opened in the field the moment there
        // is a field to open. ⚠️ `openTyping` clears the mark, so the two cannot
        // disagree; the `markWord(null)` is for the case where the session ended
        // some other way and nothing was carried out.
````

<a id="weight-99"></a>
## weight-99: demo/weight/index.html, inline script, line 1238

````js
      // 🔴 A DEAD-MAN'S SWITCH, ARMED BEFORE THE FIRST FRAME IS ASKED FOR. If a
      // throw escapes the handler the render loop and the way out are both never
      // registered, and the wearer is standing in a black room with nothing to
      // press. This is the case it has to survive, so it cannot be inside it.
````

<a id="weight-100"></a>
## weight-100: demo/weight/index.html, inline script, line 1253

````js
  // 🔴 ONE WAY OUT: ANY BUTTON, HELD FOR THREE SECONDS. A TAP on any button
  // used to leave, which made every button a trap. You could not rest a thumb
  // anywhere, and the page never said which button had done it. The button was
  // never the fault, the tap was.
  // 🔴 AND THE RING IS IN FRONT OF YOU, NOT AT YOUR HAND. Instructed 2026-09-19:
  // *"Hold-to-quit: ui should not tied to controllers. it should be just front
  // of me"*. One ring, dead centre, 1.6 m out and about five degrees across,
  // drawn with the depth test off so a wall cannot hide the way out. It used to
  // be painted at every grip, which meant a session driven by tracked hands got
  // no badge at all, and this page gated the draw on having grips.
  // ⚠️ This page no longer advances it either. `mountXRQuit` drives the hold off
  // the session's own frame loop, so the only line left here is the draw.
  // ⚠️ The dead man's switch above is unchanged and is NOT this: it covers the
  // case where the page threw and there is nothing on screen to hold a ring
  // against. The hold still runs in that case; you hold blind rather than
  // watching an arc.
  //
  // 🔴 AND NOTHING DRAWS A CONTROLLER ANY MORE. 2026-09-17: *"rm controller
  // geometry/tablet on all (only if i am ask on specific demo so keep that code
  // ready to pop into scene)"*. `demo/shell/xr-controller.mjs` is untouched and
  // `xrControllers.want()` still fetches, reads and uploads the model, so the
  // hands come back with one line in the per-eye loop below.
````

<a id="weight-101"></a>
## weight-101: demo/weight/index.html, inline script, line 1285

````js
    // 🔴 baseLayer IS NULL UNTIL THE NEXT ANIMATION FRAME — `updateRenderState`
    // queues, it does not apply. Reading it one line after creating the session
    // throws, and the throw takes the render loop, the exit and the bail-out
    // with it. Read it here, where it exists.
````

<a id="weight-102"></a>
## weight-102: demo/weight/index.html, inline script, line 1299

````js
    // ⚠️ EACH HAND ONLY IF THE RUNTIME ANSWERED FOR IT THIS FRAME. MEASURED on a
    // Quest 3 while `xr-room.mjs` was written: two sources appeared and the LEFT
    // grip did not resolve while the right did, in the same frame. A page that
    // draws a hand wherever it last saw one leaves a shape in the air.
    // ⚠️ COLLECTED AND NOT READ, AND THAT IS ON PURPOSE. Nothing draws a hand
    // here (2026-09-17: *"rm controller geometry/tablet on all"*, with the code
    // kept ready to pop back in) and the way out stopped needing a grip on
    // 2026-09-19 when the ring became head locked. This is the one line the
    // hands come back through, which is why it is still gathered.
````

<a id="weight-103"></a>
## weight-103: demo/weight/index.html, inline script, line 1309

````js
    // ⚠️ `targetRaySpace` IS WHERE YOU ARE POINTING AND `gripSpace` IS WHERE YOU
    // ARE HOLDING. They differ by the angle a controller sits in a hand, which
    // is about 40° on this hardware: a pointer drawn from the grip lands
    // somewhere nobody aimed at.
````

<a id="weight-104"></a>
## weight-104: demo/weight/index.html, inline script, line 1348

````js
    // ⚠️ NO EYE HEIGHT IN A HEADSET: `local-floor` puts the floor at y = 0 and
    // the pose carries the rest.
````

<a id="weight-105"></a>
## weight-105: demo/weight/index.html, inline script, line 1362

````js
        // 🔴 gl.clear IGNORES THE VIEWPORT. Both eyes share one framebuffer, so
        // a clear on the second view wipes what the first drew — black. Only the
        // first eye clears colour; the second clears DEPTH inside a scissor, or
        // it tests against the first eye's depths.
````

<a id="weight-106"></a>
## weight-106: demo/weight/index.html, inline script, line 1378

````js
      // ⚠️ AFTER THE WORDS AND IN THE SAME PASS. The hands and the pointer are
      // in the room, not on the screen: drawn before, the words would be in
      // front of your own hand, and drawn in a second pass they would need the
      // depth buffer this one already has.
      // The hands would be drawn here, under `if (grips.length)`:
      // `xrControllers.draw(eyeVP, grips);` See the note by `xrControllers` for
      // why they are not.
      // ⚠️ THE RAY IS DRAWN PER EYE AND TURNED IN THE VERTEX SHADER. A ribbon
      // oriented on the processor picks one of the two eyes and is wrong for the
      // other, and the error reads as DEPTH rather than as a smear: a pointer
      // that looks fine and lands somewhere else.
````

<a id="weight-107"></a>
## weight-107: demo/weight/index.html, inline script, line 1396

````js
      // 🔴 THE RING IS LAST IN THE EYE, AND IT IS NOT IN THE `grips` GUARD ANY
      // MORE. It used to be painted at every grip matrix, so a session tracking
      // bare hands, which report no grip, had no way out to look at. It takes
      // this eye's own view matrix now and reads where you are, which way you
      // face and how big to be out of it, so the two eyes cannot disagree about
      // its depth. Last, because it is the one thing here drawn with the depth
      // test off and it puts the state back on the way out: anything after it
      // would be the first to find out whether that is true.
      // ⚠️ IT DRAWS NOTHING UNTIL SOMETHING IS HELD, so an idle frame pays for
      // one function call.
````

<a id="weight-108"></a>
## weight-108: demo/weight/index.html, inline script, line 1410

````js
  // 🔴 TWO BUTTONS, ONE GROUP, AND IT IS MOUNTED INSIDE `.pos-controls`. Both
  // harnesses press `.pos-controls button`, which is a descendant selector, so
  // a wrapper in that row keeps them exercised; a group anywhere else would
  // take them out of every run silently. Inserted BEFORE the ⛶ so the glyph
  // ⚠️ IT WAS INSERTED BEFORE THE ⛶ AND THERE IS NO ⛶ TO GO BEFORE. That
  // control left when the video panel arrived, so this group is the whole row
  // and appending is the same thing as inserting.
  // ⚠️ NO GROUP LABEL. `Run in VR` and `Run in AR` say what they are, and a
  // word in front of them would be a name for a pair a reader can already see.
````

<a id="weight-109"></a>
## weight-109: demo/weight/index.html, inline script, line 1426

````js
  // 🔴 UNHIDDEN, BECAUSE `mount()` HID IT. A page declaring no controls gets
  // `hidden` on that row, which is correct and is the shell's own repair for a
  // 14 px band of dead space under an empty row. This page declares none and
  // then puts one control in, so it says so here rather than leaving a group
  // laid out inside a row nobody can see.
````

<a id="weight-110"></a>
## weight-110: demo/weight/index.html, inline script, line 1433

````js
  // 🔴 SUBSCRIBED, NOT READ ONCE. `isSessionSupported` is a promise, so a
  // button read at load would be decided on `asking` every time on a headset.
  // `onXrCaps` fires at once with what is known and again on every change, so
  // the phone case is settled before the first frame and the headset case
  // settles when the browser answers.
  // ⚠️ AND A BUTTON THAT GOES OFF SAYS WHY, in the words `xr-caps.mjs` writes
  // for it. A grey control with no explanation reads as a page that is broken
  // rather than as a browser that cannot do the thing.
````

<a id="weight-111"></a>
## weight-111: demo/weight/index.html, inline script, line 1446

````js
  // 🔴 NO FULL-SCREEN WIRING LEFT ON THIS PAGE AT ALL, AND THAT IS THE POINT
  // OF ADOPTING THE PANEL. There were four pieces here yesterday: a shell
  // control that toggled, a `watch` that kept the class honest, a hand-mounted
  // way out, and a `sync` call in each place the class changed. The panel owns
  // every one of them, including the one that was reported from an iPhone as
  // *"I can not leave fullscreen on mobile"*, and this page is left with
  // `onFull`, which only says what happened in the log.
````

<a id="weight-112"></a>
## weight-112: demo/weight/index.html, inline script, line 1454

````js
  /**
   * 🔴 HOW IT WORKS, AND WHAT MAKES THIS ONE DIFFERENT FROM EVERY OTHER PICTURE
   * IN THIS PROJECT. Asked 2026-09-19: *"add how it works to held and blocks:
   * browser block and controllers"*. Every sibling page draws a path that
   * leaves the machine: a relay, a broadcaster, a Raspberry Pi in another
   * building. There is nothing of the kind here. The shader compiles on the
   * machine in front of you, the headset reports where your head is, the
   * controllers report where they point, and that is the whole of it.
   * ⚠️ `how` AND `atEnd` ARE THE THIRD ARGUMENT, not spec keys. Written inside
   * the spec they are two fields nothing reads, and the page ships with no
   * heading and its picture above the log with nothing able to say so.
   */
````

<a id="weight-113"></a>
## weight-113: demo/weight/index.html, inline script, line 1212

````js
  // 🔴 THE BROWSER IS INSIDE THE HEADSET AND THE CONTROLLERS ARE OUTSIDE IT.
  // Corrected 2026-09-19 against a screenshot: *"simplify. room does not go to
  // controllers"*, then *"browser is inside headset. controllers are
  // external"*. The first picture had `headset` and `controllers` as two boxes
  // in one column, and the declared return `room -> headset` put its arrowhead
  // on `controllers`, the box underneath, so a reader saw eye views being sent
  // to a hand. The router's defect is in `BACKLOG.md`; what is fixed here is
  // the model, which was wrong in a second way the screenshot did not show.
  // ⚠️ THE NESTING IS ONE LEVEL DEEP AND THAT IS THE MODULE'S LIMIT, not a
  // choice: `diagram.mjs` deletes a child's own `children`. So the page inside
  // the headset is ONE box and what it holds is in its note, which is the
  // simplification that was asked for in the same breath.
  // ⚠️ AND THERE IS NO LINK FROM THE PAGE BACK TO THE HEADSET. Being drawn
  // inside it IS the statement that the headset composites what it draws, and a
  // link from a box to the container around it is the one shape the router
  // refuses anyway.
````

<a id="weight-114"></a>
## weight-114: demo/weight/index.html, inline script, line 1231

````js
      // ⚠️ `set: true` ON THE CONTROLLERS, NOT AN ARROW. An undeclared gap
      // between two children is drawn as an arrow, and an arrow from where a
      // hand points to which buttons are down would claim one produces the
      // other. They are two things one machine reports, which is what a
      // bracket means.
      // ⚠️ AND A CONTAINER TAKES NO NOTE, so what this box used to say is on
      // its two children now, where a reader can point at the half they mean.
````

<a id="weight-115"></a>
## weight-115: demo/weight/index.html, inline script, line 1267

````js
  /**
   * Draw ONE thing, alone, at a chosen distance, and read the pixels back.
   * Everything below that makes a claim about how a word is drawn goes through
   * here rather than through the arithmetic that drew it — an assert that
   * projects the same corners the shader projects is comparing a formula with
   * itself.
   */
````

<a id="weight-116"></a>
## weight-116: demo/weight/index.html, inline script, line 1276

````js
    // 🔴 A PROBE MUST NOT DRAW ON THE PAGE. The first version rendered into the
    // visible canvas and resized it back afterwards, and the last probe — a
    // word from 0.9 m — was still on screen when anybody looked, because the
    // frame loop had not come round yet. A check that changes what the page
    // shows is a check that has to be undone, and the undoing is the bug.
````

<a id="weight-117"></a>
## weight-117: demo/weight/index.html, inline script, line 1314

````js
    // ⚠️ `rotY(face)`, the same way round as `roomToEye`. This line carried the
    // same inverted sign and it is the reason the 70° probe found no pixels at
    // all rather than a foreshortened word — a camera pointing away from its
    // subject and a subject that vanished are the same output.
````

<a id="weight-118"></a>
## weight-118: demo/weight/index.html, inline script, line 1326

````js
    // ⚠️ ALWAYS WHITE HERE, WHATEVER IS MARKED ON THE PAGE. Every probe below
    // finds ink by reading the RED channel, so a probe that inherited the mark's
    // colour would still read as ink and a probe that inherited the uniform's
    // zero default would read as a blank frame. One word drawn alone has nothing
    // to be distinguished FROM, so the mark has no meaning in here.
````

<a id="weight-119"></a>
## weight-119: demo/weight/index.html, inline script, line 1338

````js
    // ⚠️ THE INK'S HEIGHT IS COLLECTED HERE AND NOT DERIVED FROM THE QUAD. A
    // quad carries `SPREAD` texels of margin above and below the letterform, so
    // its height is a fact about the texture; what a reader sees is how tall the
    // LETTERS come out, which is the top and bottom of the lit pixels.
````

<a id="weight-120"></a>
## weight-120: demo/weight/index.html, inline script, line 1353

````js
    // 🔴 THE EDGE'S WIDTH IN PIXELS, WHICH IS THE WHOLE CLAIM. Walk every row
    // and collect runs of values that are neither ink nor ground; the median run
    // is how many pixels the transition takes. A field reconstructs it in about
    // one whatever the magnification; a picture of a word spreads it as wide as
    // it is blown up.
````

<a id="weight-121"></a>
## weight-121: demo/weight/index.html, inline script, line 1387

````js
    /**
     * 🔴 THE LOOP IS STILL RUNNING, AND NOTHING HERE ASKED THAT UNTIL NOW. A
     * readout was removed from this page and one `d.set` was left behind, which
     * THROWS on a key `mount()` never declared: the render loop died on its
     * first frame. The picture froze at frame one, clicking a word did nothing,
     * and this page reported **21/21 green** with a single line in the log.
     * Every other check here grades a still image, and a still image is exactly
     * what a dead loop produces.
     *
     * ⚠️ IT COUNTS ACROSS A WAIT rather than reading a total. `frames > 0` is
     * true of a page that drew once and stopped, which is the case.
     */
````

<a id="weight-122"></a>
## weight-122: demo/weight/index.html, inline script, line 1410

````js
    // 🔴 THE ONE THAT CATCHES A SILENT HALF-LOAD. Š and Ž live in a different
    // file from Ä Ö Ü Õ; if that file is missing the browser substitutes a
    // system face for those two letters alone, with nothing reported anywhere.
````

<a id="weight-123"></a>
## weight-123: demo/weight/index.html, inline script, line 1437

````js
    // 🔴 THE SIZING RULE, CHECKED ON THE PAIR THAT BREAKS IT, AND READ OFF THE
    // PICTURE. An accent makes the INK taller; if a quad were sized by its ink,
    // an accented word would come out SMALLER than a plain one at the same
    // declared height, which is the one thing a wall of words must not do.
    //
    // ⚠️ THE OLD VERSION COMPARED TWO `capPx` FIGURES AND THAT HALF WAS VACUOUS:
    // both words were rastered at the same `px` in the same family, so the two
    // numbers were the same number and the comparison could not fail. What is
    // asked now is what somebody looking at the wall would ask. Draw both from
    // one distance, find the band of rows the letter bodies occupy, and require
    // that band to be the SAME height while the accented word's total ink is
    // taller. `oo` and `oo` with two dots differ in nothing else, and the marks
    // sit clear of the letters with a blank row between, which is what makes the
    // band findable at all.
````

<a id="weight-124"></a>
## weight-124: demo/weight/index.html, inline script, line 1451

````js
    /**
     * 🔴 EVERYTHING FROM HERE THAT DRAWS OR TYPES IS BEHIND THE FLAG, AND THE
     * LINE BETWEEN THE TWO HALVES IS WHAT THE CHECK COSTS RATHER THAN WHAT IT
     * PROVES. What stays: the frame counter, the font report, the ink in each
     * box, the reach of every word, the matrices, the room scale, the pending
     * GL error. All of that is read off what this page is already holding.
     * What moves: every `probe`, which renders a word into an off-screen target
     * and reads the pixels back, every `shot`, which is a 640x360 readback of
     * the whole room and there is one PER WORD, and every `retext`, which types
     * over a word on the wall and puts it back. On arrival that is dozens of
     * GPU stalls and a wall whose words change, for somebody who came to read
     * them.
     */
````

<a id="weight-125"></a>
## weight-125: demo/weight/index.html, inline script, line 1497

````js
      // ⚠️ SORTED AS NUMBERS. The first version sorted the formatted strings and
      // reported whichever word came last in the alphabet as the widest — the
      // `every()` was right and the sentence under it was confidently wrong,
      // which is the worse half to get wrong because it is the half a reader
      // believes.
      // 🔴 TWO AXES, NOT ONE, AND THE SECOND WAS ADDED THE DAY THE TYPE GREW BY
      // HALF. This only ever measured how far a word reached ALONG its wall, so
      // a word that had grown DOWN into the floor was something the page could
      // not see. It is not hypothetical: a flat 1.5x over the whole curve puts
      // `talk` at 2.68 m of capital centred 1.5 m up, which is its foot 4 cm
      // underground, and this check as it stood called that green.
      //
      // ⚠️ THE FLOOR IS MEASURED AGAINST THE CAP BAND AND THE WALL AGAINST THE
      // QUAD, AND THE TWO ARE DIFFERENT ON PURPOSE. A quad carries `SPREAD`
      // texels of transparent margin all round, which is half a metre a side at
      // this size: reaching off the end of a wall with it is the conservative
      // direction to be wrong in, and standing on the floor with it is not,
      // because the margin is not the letters. `cap` is the ink's own height
      // and `item.y` its middle, so `y - cap/2` is where the letters stop.
      //
      // ⚠️ AND THERE IS NO NEIGHBOUR CHECK HERE, WHICH IS A DECISION RATHER
      // THAN AN OMISSION. Words on this page are allowed to overlap: `out`
      // stands one a little way off the wall in front of another and `INK_ALPHA`
      // exists so the one behind shows through. On the north wall the paragraph
      // and `talk` already cover each other at two depths, so a check that
      // refused two boxes in one place would be refusing the page.
````

<a id="weight-126"></a>
## weight-126: demo/weight/index.html, inline script, line 1538

````js
    // 🔴 THE PAGE'S OWN RULE, AND IT IS READ OFF THE PICTURE RATHER THAN OUT OF
    // THE ARITHMETIC THAT DREW IT. `capFor` divides one constant by a letter
    // count, so a check that divided the same constant by the same count would
    // be the rule agreeing with itself. This draws every word head-on from ONE
    // distance and counts how many pixels tall its letters come out: a shorter
    // word has to be bigger, and two words of a length have to match.
    //
    // ⚠️ EVERY WORD ON THIS WALL RUNS BASELINE TO ASCENDER and none of them has
    // a descender, so lit height is proportional to the size it was set at. A
    // word with a `g` in it would be taller for a reason that is not its length,
    // which is why the check reports the pixels rather than hiding them.
````

<a id="weight-127"></a>
## weight-127: demo/weight/index.html, inline script, line 1566

````js
    // 🔴 AND THE RULE HOLDS FOR A WORD THAT WAS NEVER IN THE SOURCE. Typing is
    // the one thing on this page that changes a size while somebody is looking,
    // so it is graded the same way: draw the word, type a shorter one over it,
    // draw again, and put the first one back.
````

<a id="weight-128"></a>
## weight-128: demo/weight/index.html, inline script, line 1582

````js
      /**
       * 🔴 A LINE BREAK SURVIVES BEING TYPED, AND IT MAKES THE WORD BIGGER.
       * `retext` used to run `replace(/\s+/g, ' ')` over what was typed, which
       * is every kind of whitespace INCLUDING a newline, so a break typed into
       * the field was destroyed before it reached the renderer and the wall drew
       * one long line. `buildText` has honoured `\n` as a hard break since it
       * was written; the text simply never arrived carrying one.
       *
       * ⚠️ AND THE SIZE IS TAKEN OFF THE LONGEST LINE. Breaking a line makes the
       * text NARROWER, so it must come out BIGGER, and measuring the whole
       * string would make it smaller instead. MEASURED through the real field:
       * `What is going / on?` sizes on the 11 characters of its first line
       * rather than on all 14. Both halves are graded, because the break
       * surviving with the wrong size is a fix that looks like it worked.
       */
````

<a id="weight-129"></a>
## weight-129: demo/weight/index.html, inline script, line 1609

````js
    // 🔴 THE WAY BACK OUT OF THE HEADSET'S SPACE, WHICH IS WHAT A POINTED HAND
    // ARRIVES IN. A runtime reports a controller where the HEADSET's own space
    // says it is, and the words are in room coordinates: get the sign wrong and
    // the ray lands mirrored through wherever you are standing, which at a turn
    // of zero is exactly right and at every other turn is wrong by twice the
    // angle. ⚠️ This is not two derivations agreeing, which is the trap this
    // page has already fallen into once: it runs the answer back through
    // `roomToEye`, and `roomToEye` is graded by rendering further down.
````

<a id="weight-130"></a>
## weight-130: demo/weight/index.html, inline script, line 1630

````js
    // 🔴 THE PURE FUNCTION, GRADED WITH NOTHING IN THE LOOP. Walking and turning
    // can be wrong in a way no picture shows.
````

<a id="weight-131"></a>
## weight-131: demo/weight/index.html, inline script, line 1633

````js
      // Two claims, both stated as what a person would say out loud: the spot
      // you are standing on is under the camera, and the way you are facing
      // comes out as straight ahead — which in an eye's own coordinates is
      // (0, 0, -1), whatever the turn happens to be.
````

<a id="weight-132"></a>
## weight-132: demo/weight/index.html, inline script, line 1639

````js
      // 🔴 THE SPOT YOU ARE STANDING ON IS EYE_Y BELOW THE CAMERA, NOT AT IT.
      // The first version of this check asked only that the spot land at the
      // origin, which is true of a camera lying on the floor — and that is
      // exactly the bug it then failed to catch for an hour.
````

<a id="weight-133"></a>
## weight-133: demo/weight/index.html, inline script, line 1676

````js
    // ── what only a GPU can answer ──────────────────────────────────────────
    // ⚠️ FOUND BY SIZE, NOT BY NAME. Every word here is the visitor's to type
    // over, so a check that looked one up by its spelling would be a check
    // about a word that may not be on the wall any more. `big` is whichever
    // word is set largest and `five` is one of the full-length ones.
````

<a id="weight-134"></a>
## weight-134: demo/weight/index.html, inline script, line 1684

````js
    // ⚠️ `big` AND `five` STAY OUT HERE because several of the gated blocks below
    // want them and a filter over six words costs nothing. The `probe` is what
    // costs, so that is what moves.
````

<a id="weight-135"></a>
## weight-135: demo/weight/index.html, inline script, line 1693

````js
    // 🔴 THE CHECK WANTS THE PICTURE TO GET WORSE. A billboard swung round is
    // exactly as wide as it was; a word fixed to its wall narrows. Asking for
    // SAMENESS here would pass both, which is `xr-ray.mjs`'s rule — a stretched
    // box and a real billboard score the same on a test that asks for sameness.
    //
    // ⚠️ AND THE FIRST VERSION MEASURED A CLIPPED WORD. `HELD` is 9.7 m across;
    // swung 70° at 6 m it runs off the side of the frame, so `maxX` was the
    // frame's edge and the "width" was the viewport's, not the word's. Every
    // probe below refuses to be believed unless the whole word is inside the
    // frame — CLAUDE.md's *check the instrument before believing the pattern*,
    // and it is one comparison rather than a cleverer statistic.
````

<a id="weight-136"></a>
## weight-136: demo/weight/index.html, inline script, line 1718

````js
    // 🔴 SHARPNESS, WITH THE CONTROL THAT MAKES IT MEAN SOMETHING. The same
    // word, same raster, same shader, same distance — one stored as a distance
    // and one as the picture it was rasterised from.
    // 🔴 FOUR MAGNIFICATIONS, AND IT USED TO BE FOUR DISTANCES. The claim is
    // about how far the stored distance can be BLOWN UP before the edge stops
    // being an edge, so the four points are authored as magnifications and the
    // distance that reaches each one is worked out from the texel size. Four
    // fixed distances quietly meant four different magnifications every time
    // the type changed size, which is a check that moves when a constant it
    // does not name moves.
    // ⚠️ IT WENT RED THE MOMENT THE TYPE GREW BY HALF, AND NOT BECAUSE THE
    // LETTERS GOT WORSE. 0.35 m from a 6.19 m capital is standing inside the
    // letterform: every sampled row came out all ink or all ground, the
    // collector found no transition anywhere, and `edge` read **0 px**, which
    // is CLAUDE.md's *a partial result that is too tidy is a broken collector*
    // wearing the face of a blurry letter. At the magnifications it has always
    // claimed, the picture on screen is the same picture it always was.
````

<a id="weight-137"></a>
## weight-137: demo/weight/index.html, inline script, line 1750

````js
    // 🔴 THE CONTROL, AND THE FIRST VERSION OF IT MEASURED THE WRONG THING.
    // It compared the EDGE WIDTH of the field against a plain picture of the
    // same word, expecting the picture's to be wide. MEASURED, at 38x
    // magnification: **both are 1 px**, and that is not a bug — the shader
    // thresholds with `fwidth`, which re-sharpens a blurred ramp just as
    // happily as it reconstructs a distance. Edge width is a quantity ADJACENT
    // to the claim, and an A/B where both arms score the same reads as "no
    // difference" when what actually happened is that nothing was asked.
    //
    // What the field is FOR is being right about the letterform at a resolution
    // where a picture is not, so that is the measurement: draw the word at full
    // resolution as the reference, then draw a field and a picture that each
    // hold the SAME small number of texels, and count how many pixels each one
    // gets wrong. ⚠️ Equal texels, not equal `px` — the field is half the
    // raster it came from, so `raw` at the same `px` would be handed four times
    // the bytes and the comparison would say nothing.
````

<a id="weight-138"></a>
## weight-138: demo/weight/index.html, inline script, line 1767

````js
      // ⚠️ A FIVE-LETTER WORD RATHER THAN THE BIGGEST ONE. `disagree` divides by
      // the reference's ink, so a two-letter word gives it a small denominator
      // and a noisy answer about a letterform there is not much of.
````

<a id="weight-139"></a>
## weight-139: demo/weight/index.html, inline script, line 1777

````js
          // ⚠️ THE INK'S OWN HEIGHT, NOT THE TEXTURE'S. The field carries SPREAD
          // texels of margin on each side, so a 22-texel texture is a SIX-texel
          // word — and quoting the padded number is how the last row below
          // would have read as a reasonable resolution instead of as rubble.
````

<a id="weight-140"></a>
## weight-140: demo/weight/index.html, inline script, line 1788

````js
      // 🔴 AND THE LAST ROW IS WHERE IT STOPS BEING TRUE, WHICH IS KEPT RATHER
      // THAN DROPPED. MEASURED: at 23 ink texels the field is 14% wrong against
      // a picture's 19%, at 12 it is 33% against 36%, and at SIX texels it is
      // 47% against 44% — the field LOSES, because there is no longer a
      // letterform for a distance to be the distance to. A technique that names
      // where it expires is worth more than one that reports only the sizes
      // where it wins.
````

<a id="weight-141"></a>
## weight-141: demo/weight/index.html, inline script, line 1803

````js
    // 🔴 THE CHECK THAT GOES THROUGH THE PAGE'S OWN DRAW, NOT AROUND IT. Every
    // probe above calls the shaders directly, which is right for grading ONE
    // word and is exactly how a missing `uVP` in `drawScene` survived fifteen
    // green asserts. This one runs the frame loop's own path into the same
    // off-screen target and asks whether the result looks like a room: a few
    // words and a floor, not a white wall and not an empty one.
````

<a id="weight-142"></a>
## weight-142: demo/weight/index.html, inline script, line 1830

````js
      // 🔴 THE POINTER AND THE PICTURE, ASKED THE SAME QUESTION IN THE SAME
      // FRAME. A pick worked out from a matrix can be mirrored, offset or a
      // half-frame out and still look like a reasonable answer in a log line;
      // the only thing that can catch it is the picture beside it. Every eighth
      // pixel of the frame just drawn is turned back into the ray under it, and
      // the claim is that WHEREVER THERE IS INK, THAT RAY LANDS ON A WORD.
      //
      // ⚠️ AND THE OTHER HALF STOPS A LAZY PASS. A pick that answered "yes, a
      // word" everywhere would satisfy the first half perfectly, so most of the
      // frame has to come back EMPTY: the words are a small part of a room.
      // ⚠️ `> 128` is the words and nothing else. The floor's dots are drawn at
      // 0.64 red through at most 0.62 of alpha, which cannot pass 104.
````

<a id="weight-143"></a>
## weight-143: demo/weight/index.html, inline script, line 1862

````js
      // 🔴 AND THERE IS A FLOOR UNDER YOU. Nothing else here can see it: the
      // words are white and the check above counts white, so a floor that
      // never drew would leave every other assert on this page green. The dots
      // are dim and sparse on purpose, so this counts anything above the
      // background in the BOTTOM THIRD of the frame, which is floor and
      // nothing else from where you arrive.
````

<a id="weight-144"></a>
## weight-144: demo/weight/index.html, inline script, line 1881

````js
    /**
     * 🔴 WHAT A TRIGGER PRESS NOW DOES, READ OFF THE PICTURE. A mark that is
     * "set" in a variable is not a mark: the whole point of it is that somebody
     * standing in the room can SEE which word the trigger took, and a check that
     * compared `marked === b` would be the assignment agreeing with itself.
     * This renders the room through `drawScene` — the frame loop's own path, not
     * around it — and counts pixels by colour.
     *
     * ⚠️ FOUND BY COLOUR, NOT BY POSITION. The mark's colour has zero blue in it
     * and white ink has all of it, so "which pixels changed" is one channel
     * compared against itself before and after, with nothing derived from where
     * the word was supposed to be.
     */
````

<a id="weight-145"></a>
## weight-145: demo/weight/index.html, inline script, line 1907

````js
        /**
         * ⚠️ `> 128` on red is the words and not the floor — the dots are 0.64
         * red through at most 0.62 of alpha, which cannot pass 104.
         * 🔴 AND THE MARK IS THE DIM ONES, NOT THE BLUELESS ONES. This read
         * `px[i * 4 + 2] < 64`, which is a test for YELLOW, and it went red the
         * moment the mark became grey: a grey pixel has as much blue as red, so
         * every marked word read as unmarked and the check reported that no word
         * had changed colour. The discriminator has to follow the colour it is
         * discriminating.
         * ⚠️ THE THRESHOLD IS DERIVED FROM THE TWO CONSTANTS, halfway between
         * the ink and the mark as they actually come out of the shader. A number
         * typed here would be a third copy of a value the page already holds
         * twice, and it would drift the next time either moves.
         */
````

<a id="weight-146"></a>
## weight-146: demo/weight/index.html, inline script, line 1944

````js
      /**
       * 🔴 IT COMPARES SHOTS RATHER THAN DEMANDING A ZERO, AND THAT IS FORCED BY
       * THE MARK BEING GREY. A yellow mark could be counted exactly, because
       * nothing else on the page had that hue; a dim grey one shares its band
       * with the ANTIALIASED EDGE of every white letter, so an unmarked room has
       * a few hundred pixels in it by construction. Requiring zero would be
       * requiring the type not to be antialiased.
       * ⚠️ SO THE CLAIM IS A CHANGE, IN BOTH DIRECTIONS: marking a word puts a
       * large number of pixels into the dim band, unmarking takes them out
       * again, and the total ink does not move because the word is still there.
       * The return half is the negative control: a page that marked everything
       * and never unmarked would pass the first half perfectly.
       */
````

<a id="weight-147"></a>
## weight-147: demo/weight/index.html, inline script, line 1971

````js
    /**
     * 🔴 THE BUG THIS PAGE WAS REPORTED FOR, AND BOTH HALVES OF THE BRANCH IT
     * SITS IN. Reported from a real Quest: *"held demo: click in vr brought me
     * back to browser."* The trigger handler is driven here with a pose the
     * runtime would have supplied, against a session object that counts being
     * ended, on both settings of `overlay`.
     *
     * ⚠️ THE RAY IS AN INPUT, NOT THE CLAIM. It is built from the wall's own
     * basis, which is where `aimAt` reads from too, and on its own that would be
     * two derivations agreeing. It is not asserted on: if the ray were wrong,
     * `aimAt` returns nothing, the handler returns early and the assert fails
     * loudly. Where a ray actually LANDS is graded above, off the picture, by
     * *pointing lands where the picture is*.
     *
     * ⚠️ AND THE WHOLE BLOCK IS SYNCHRONOUS ON PURPOSE. `xrSession` is a stub for
     * the length of it, and the window's frame loop stops asking for frames the
     * moment that is non-null — so an `await` in here would park the page on a
     * still image for the rest of the run.
     */
````

<a id="weight-148"></a>
## weight-148: demo/weight/index.html, inline script, line 2030

````js
      // 2b. 🔴 THE RUNTIME DOES NOT SAY, WHICH IS THE COMMON CASE AND WAS THE
      //     ONE THAT DID NOTHING. `isSystemKeyboardSupported` is a recent
      //     addition, so a headset that has not shipped it reports `undefined`
      //     and the page treated that as a no: it refused to try on exactly the
      //     runtimes most likely to be in somebody's hands. Unknown never
      //     blocks. It must behave like the yes above, not like the no.
````

<a id="weight-149"></a>
## weight-149: demo/weight/index.html, inline script, line 2047

````js
      // ⚠️ AND IT MUST NOT ALSO MARK. Two answers to one press is a word left
      // lit behind a field that is editing it, which is the same fact said twice
      // and the second one has no way to be cleared.
````

<a id="weight-150"></a>
## weight-150: demo/weight/index.html, inline script, line 2054

````js
      // 🔴 THE DECISION, NOT THE BRANCH. `keyboardVerdict` is what turns a
      // session's answer into what this page does, and a runtime that has not
      // shipped the attribute reports `undefined`. Treating that as a no is the
      // defect: the page refuses to try on exactly the headsets most likely to
      // be in somebody's hands. Graded here, at the source, because the branch
      // below passes for `true` and `'unknown'` alike.
````

<a id="weight-151"></a>
## weight-151: demo/weight/index.html, inline script, line 2073

````js
      /**
       * 🔴 THE WALL FOLLOWS THE KEYSTROKE *INSIDE A SESSION*, WHICH IS WHAT IT
       * DID NOT DO. Reported 2026-09-17: *"text input appears in vr/ar but 3d
       * type does not change nof after submit nor realtime"*. `liveRetext`
       * scheduled its rebuild on `window.requestAnimationFrame`, which does not
       * fire while an immersive session is running — so the callback was queued
       * and never ran, the flag it had set stayed true, and every later
       * keystroke returned at the first line.
       *
       * ⚠️ THE STUB COUNTS THE CALLS AND THEN RUNS THEM, so this grades BOTH
       * halves: that the work was handed to the session's clock rather than the
       * window's, and that the wall really changed when it ran. A check that
       * only counted the schedule would pass on a rebuild that threw.
       * ⚠️ AND IT IS A NEGATIVE CONTROL AS WELL: `winFrames` must stay at zero.
       * Scheduling on both clocks would look identical from the wall.
       */
````

<a id="weight-152"></a>
## weight-152: demo/weight/index.html, inline script, line 2139

````js
      // The second way to a keyboard, which is the one a Quest actually offers:
      // the runtime raises its own over the session when a field takes focus.
      // ⚠️ BOTH HALVES. The field is invisible in there, so an open field with no
      // lit word is a press that looks like it did nothing.
````

<a id="weight-153"></a>
## weight-153: demo/weight/index.html, inline script, line 2160

````js
    /**
     * 🔴 IN PASSTHROUGH THE ROOM FITS A ROOM. Reported 2026-09-17: *"texts in
     * xr seems to be behind to walls sometime"*. This room is 15 m across and
     * an ordinary one is four, so every word was standing outside the walls you
     * are actually looking at — and a Quest composites passthrough with no
     * depth, so they stayed visible out there, which is what "behind the walls"
     * looks like from inside.
     *
     * ⚠️ THREE THINGS, AND THE THIRD IS THE ONE THAT IS EASY TO GET WRONG. The
     * words have to come INSIDE; their sizes have to come with them, or the
     * room shrinks around type that does not and the words collide; and the
     * whole thing has to scale about EYE HEIGHT rather than about the floor, or
     * a room of words standing between 1.3 and 3.5 m sinks to knee height and
     * you end up reading your own feet.
     * ⚠️ A HEADSET IS STILL WHAT SAYS WHETHER 30% IS THE RIGHT NUMBER. What is
     * graded here is that the arithmetic does what it claims, in both
     * directions, and that going back leaves the page exactly as it was.
     */
````

<a id="weight-154"></a>
## weight-154: demo/weight/index.html, inline script, line 2182

````js
      // ⚠️ AGAINST WHAT IT WAS, NOT AGAINST `R`. A word sits along a wall and can
      // stand off it, so the furthest one is out at a CORNER — `hypot(u, R+out)`
      // — and `R * AR_SCALE` is a bound it was never inside at full size either.
      // Measuring the shrink against the room's own reach is the quantity in
      // question; the absolute ceiling beside it is what makes it fit a room.
````

<a id="weight-155"></a>
## weight-155: demo/weight/index.html, inline script, line 2208

````js
    /**
     * 🔴 THE WAY OUT OF A HEADSET, GRADED ON A LAPTOP, BECAUSE NOTHING HERE
     * GRADED IT AT ALL. Until now this page built the ring, drew it and said
     * nothing about it: a shader that would not compile would have been
     * invisible until somebody was wearing a headset and could not get out.
     * That is the worst thing on this page to leave unmeasured.
     *
     * ⚠️ NOT BEHIND `SELFCHECK`, and the rule is what decides it rather than
     * the cost. A visit runs everything gradable from what the page already
     * has, and stops at anything that opens a file, makes a sound, presses a
     * control or moves the picture. A shader compile and some arithmetic are
     * none of those, they draw nothing, and this page grades the module on
     * load because nothing else does any more.
     * ⚠️ IT SAID `/blocks/` ALREADY GRADED IT THE SAME WAY, AND THAT PAGE WAS
     * ARCHIVED 2026-09-24 (`archive/demos/blocks-index.html`). `/floor/` mounts
     * the same module but only INSIDE a session, so on load this is the only
     * one left and the check is no longer a second opinion.
     */
````

<a id="weight-156"></a>
## weight-156: demo/weight/index.html, inline script, line 2227

````js
      /**
       * 🔴 `session: null` IS WHAT THAT ARGUMENT IS FOR: it builds the badge
       * without driving it. Everything in there is lazy until the first draw,
       * so the object existing says nothing whatever about its shader, and
       * `prepare()` is the module answering for itself.
       * ⚠️ `driven` IS THE NEGATIVE CONTROL. A mount with no session must NOT
       * be advancing a hold, and a `true` here would mean this check had
       * quietly started a second way out on a page that already has one.
       * ⚠️ NO LABEL AND NO BUTTON PASSED, so this grades the SHIPPED defaults.
       * A check that names its own would pass whatever they became.
       * ⚠️ PROVED BY BREAKING IT, AND THE READING IS QUOTED BECAUSE A CHECK
       * NOBODY HAS SEEN FAIL IS A CHECK NOBODY SHOULD TRUST. Handed a context
       * whose `getShaderParameter` answers false, the compile throws, `why`
       * catches it, and this went red reading `it would not build: Error`. That
       * detail is thinner than it should be and the reason is worth knowing:
       * the sabotage lies about the STATUS of a shader that really compiled, so
       * the info log it is asked for afterwards is empty and the module has
       * nothing to quote. A shader that is genuinely wrong carries a message.
       * Put back, it reads what the passing line below says.
       */
````

<a id="weight-157"></a>
## weight-157: demo/weight/index.html, inline script, line 2259

````js
      /**
       * 🔴 AND THE GESTURE, THROUGH THE SHIPPED ARITHMETIC RATHER THAN A COPY
       * OF IT. `createQuitHold` is what `mountXRQuit` drives, with no DOM, no
       * graphics and no session in it, so this grades the thing that ships.
       * ⚠️ ONE FRAME WITH NOTHING DOWN FIRST. The press that opens a session is
       * still down on the first frames inside it, so the hold refuses to count
       * until it has seen a frame with nothing pressed.
       * ⚠️ AND IT IS FED IN FRAMES THE HOLD WILL BELIEVE. It takes at most
       * 0.1 s of any one frame, because a headset that stalled for a second
       * must not advance a deliberate press by a second, so a check cannot jump
       * half the hold in one call.
       * ⚠️ PROVED BY BREAKING IT. Feeding half the hold where the whole of it
       * should go took this red reading `Held the whole 3000 ms it read 50% and
       * fired 0 times`, which is exactly the sentence a hold that never
       * completed should produce, and it names the half that was wrong.
       */
````

<a id="weight-158"></a>
## weight-158: demo/weight/index.html, inline script, line 2296

````js
    // Both eyes share a framebuffer and a clear ignores the viewport; that is
    // only reachable in a headset, but a pending GL error is not.
    // ⚠️ AFTER THE RING, ON PURPOSE. The compile above is the newest thing on
    // this page to touch the graphics card, so it is the newest thing that
    // could leave an error pending, and this is what would say so.
````

<a id="weight-159"></a>
## weight-159: demo/weight/index.html, inline script, line 2304

````js
    // ⚠️ THE HEADSET HALF IS HUMAN-VERIFIED AND THE PAGE SAYS SO. `verify-gl`
    // cannot enter a session and cannot pull a trigger; `demo/verify-quest.mjs`
    // is what grades the two below on real hardware.
    //
    // 🔴 THE CLAIM IS THAT THE QUESTION WAS ANSWERED, AND `absent` IS AN
    // ANSWER. It used to be `vrKnown !== null && arKnown !== null` over a pair
    // of variables that a browser with no WebXR left at `null` for ever, so an
    // iPhone read `FAIL a headset was asked about, both ways` with
    // `immersive-vr null` under it. Nothing about that browser had failed and
    // nothing about this page had either.
    // ⚠️ AND THE DETAIL IS IN PLAIN WORDS. `null` printed to a visitor is a
    // page talking to itself, and so is the name of a session mode.
````

<a id="weight-160"></a>
## weight-160: demo/weight/index.html, inline script, line 2326

````js
    /**
     * 🔴 THE PICTURE REPORTS ITS OWN DAMAGE, AND NOTHING ELSE CAN SEE IT.
     * `createDiagram` collects every label it had to shorten, every note over
     * about forty words, every link it could not route and a title passed
     * alongside `how`. A page that never reads that list ships a cut name or a
     * missing arrow looking exactly like a picture that is fine, which is how
     * three real arrows went missing from another page for two sessions.
     */
````

<a id="weight-161"></a>
## weight-161: demo/weight/index.html, inline script, line 2338

````js
    /**
     * 🔴 AND IT IS LAST, UNDER THE STANDING HEADING. `how` and `atEnd` are the
     * THIRD argument to `createDiagram`, so writing them inside the spec gives
     * two keys nothing reads rather than an error: not the parser, not `cuts`,
     * not the suite. A page shipped with no heading and its picture above the
     * log for exactly that, and the heading itself is never typed on a page.
     */
````
