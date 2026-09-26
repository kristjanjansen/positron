# Design from the event picture: what a picture can set on the event page, and nothing else

Written 2026-09-26 in the background, on the ask of the same day, verbatim:
*"one idea is to actually change event body design based on the event image.
rest of eccm stays minimal, out of the way. gesutres has very good graphics
design for example as preview image. build design-from-image detection is quite
an effort i assume. plan in bg"*.

**The verdict.** Detection is cheap, and it is not the effort. A 64 px canvas
read and an edge test are about fifty lines and run in the edit form at upload,
so publishing and viewing cost nothing. The effort is in the guardrails, and
they are arithmetic: every derived pair is contrast-checked, and a picture that
gives nothing leaves the page plain and says so in the data. Of the ten event
pictures on disk, **two give a ground** (both files of the Gestures graphic, one
poster twice), **one gives an accent** (a blue stage photograph), **five give
something that fails a check**, and **four give nothing at all**. So the feature
is a ground under the head of the page for a poster with a flat ground, an
interaction accent for a picture with a real hue, and the plain page for the
rest, which will be most of them. What Gestures gives is the first of these:
its sage ground extends under the title and the facts, the disc's red is too
close to the ink to be an accent, and the page's prose stays ink on white.

**The marks.** MEASURED is a number from the throwaway script run today on the
files in `demo/eccm/` (decoded to BMP with `sips`, quantised in Node). READ is a
page fetched today, URL given once. INFERRED is concluded from two measured
things. GUESSED is reasoning only. MEMORY is a thing not read today, and §8 says
what would confirm it.

⚠️ **The brief said eleven pictures. The directory holds ten `ic_*` files, nine
thumbnails and one 900 px poster, and one logo JPEG.** The logo is the eleventh
row below, as a control, and is not an event picture.

## 1. What a picture gives, and how well

**The methods, in one line each.** Median cut (MMCQ, which color-thief's
classic version and the Android Palette API use, and Vibrant.js ports; the
name is MEMORY today, the six swatches are READ) splits a 5 bit histogram at
the median of the widest channel until it has n boxes. k-means clusters pixels
by distance and is what secondary sources say Spotify uses (not READ from
Spotify). Octree builds a tree of colour space and prunes it. Material You's
`material-color-utilities` (READ,
https://github.com/material-foundation/material-color-utilities) quantises with
*"Celebi, which runs Wu, then WSMeans"*, ranks the result with a *"score"*
component *"for suitability for theming"*, and derives everything from one seed
in HCT, *"hue, chroma, tone"*, *"based on CAM16 x L*"*. Its tone rule is the
whole reason it can promise contrast (READ, the library's `hct.ts`): *"A
difference of 40 in HCT tone guarantees a contrast ratio >= 3.0, and a
difference of 50 guarantees a contrast ratio >= 4.5."* That is the best known
production system and its shape is the one to copy: one seed, tones set by
rule, contrast by construction.

**MEASURED on the eleven files.** Top three colours by an 8 box median cut with
their share, mean relative luminance Y (WCAG linear), mean OKLCH chroma C (0 is
grey, 0.25 is a saturated red), the share of pixels over C 0.04, and whether the
outer two rows or columns on each edge are one colour (97 per cent within 12 of
8 bits of the edge's median).

| picture | px | top three (share) | Y | C | > 0.04 | flat edges | gives |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Gestures poster | 900 x 599 | #bcc4bc 75, #452921 23, #bcbcbb 2 | 0.41 | 0.019 | 16 % | all four, #bbc0ba | a ground |
| Gestures thumb | 300 x 199 | #bcc4bc 74, #492e26 24, #bdbcbb 2 | 0.41 | 0.018 | 16 % | all four, #bbc0ba | a ground |
| chatgpt (illustration) | 227 x 300 | #e2dfda 14, #132428 13, #d2b78f 13 | 0.41 | 0.026 | 25 % | none (12 to 54 %) | a tan, fails as text |
| Scrapyard (stage photo) | 300 x 200 | #040404 23, #04071c 19, #040e30 17 | 0.02 | 0.062 | 65 % | left and right, black | a blue accent |
| germination | 300 x 150 | #040404 28, #2a2b3f 25, #8d8f9c 25 | 0.09 | 0.029 | 24 % | none | nothing |
| improtest (drawing) | 300 x 205 | #fcfcfc 73, #3c3a3c 27 | 0.76 | 0.001 | 0 % | bottom, white | nothing |
| Morton Feldman (photo) | 300 x 199 | #2b2b2b 17, #707070 16, #989898 14 | 0.26 | 0.000 | 0 % | none | nothing |
| screenshot 08-31 (graphic) | 300 x 199 | #fcfcfc 76, #62372d 24 | 0.78 | 0.016 | 17 % | all four, white | a brown, near the ink |
| screenshot 09-04 (photo) | 300 x 198 | #040404 19, #170b08 15, #20150e 12 | 0.04 | 0.029 | 31 % | none | a brown, near the ink |
| U ansambel (photo) | 300 x 192 | #1c1c1c 25, #d2d2d2 25, #ededed 25 | 0.38 | 0.000 | 0 % | top, #eaeaea | nothing |
| the logo (control) | 381 x 199 | #fcfcfc 76, #383838 24 | 0.78 | 0.000 | 0 % | all four, white | nothing |

**Tone** is trivial to read and there is nothing to do with it here: three
pictures sit under Y 0.1 and three over 0.75, and the prose stays ink on white
whichever it is (§3). It is kept only as a fallback reason.

**Saturation** is the test that separates a graphic from a grey photograph, and
it has to be chroma, not HSV saturation. MEASURED: HSV saturation read Scrapyard
as 78 per cent saturated and the 09-04 photograph as 57, because near-black
pixels have a high HSV S from noise; OKLCH chroma reads them at 0.062 and 0.029.
Four of the ten event pictures are pure greyscale (C 0.000 or 0.001) and the
Gestures graphic itself averages 0.019, because 77 per cent of it is a
near-grey ground.

**A flat edge is what makes a band possible**, and it is rare: two of ten event
pictures have all four edges flat and a ground that is not the page's own white
(both Gestures files, #bbc0ba on every edge at 100 per cent within tolerance).
The 08-31 graphic is flat on white, which is the page already. Scrapyard is
flat black left and right only. A photograph is never flat on four sides.

**Median cut fails on exactly the picture that matters, MEASURED.** With 8 boxes
and again with 16, the cut kept splitting the 75 per cent ground and merged the
poster's red disc with its black type into one warm dark, #452921 at 23 per
cent. Thresholding directly separates them: the disc is **#552a21, 9 per cent,
oklch L 0.34 C 0.066 H 33**; the type is #331f18, 13 per cent, C 0.034; the
ground is #bbc0ba, 77 per cent, C 0.010 H 141, a pale sage. So the CMS should
not take a palette library's first colour as the seed: take the flat edge as
the ground, and the highest chroma mass over 1 per cent as the seed, which is
the Palette API's scoring in spirit (READ,
https://developer.android.com/develop/ui/views/graphics/palette-colors:
colours are *"scored against each profile based on saturation, luminance, and
population"*).

**What Gestures gives.** A ground, #bbc0ba, that carries the ink at **9.42 : 1**
and the muted ink at **4.03 : 1** (fails 4.5 for the 14 px labels, passes 3 : 1
as large text); lightened 20 per cent toward white it is #c9cdc8 and carries
the muted ink at 4.63. An accent it does not give: the disc red at #552a21 is
**1.44 : 1 against the ink**, a second black to the eye, and toned into the
window §4 defines it becomes #8b5b50, a dusty rose at 5.66 on white and 3.07
against ink, which is a colour the poster does not contain. The picture is
black and red on sage; the page can be sage under the head, and that is all.

## 2. Where it runs, three routes priced

**(a) In the browser, in the edit form, at upload. Recommended for the CMS.**
The picture field in `demo/eccm/edit.html` is a `<input type="file">` in a drop
zone. On `change`, `createImageBitmap(file)` onto a 64 px canvas,
`getImageData`, the edge test, the chroma test, the seed and the tones, and
the values land in hidden inputs beside the file: `theme_ground`,
`theme_accent`, `theme_reason`. They ride the same POST the CMS plan's §8
already uses for preview (*"Preview renders the real template from the form's
own POST body without saving"*), so the editor sees the band before saving, and
they are stored in D1 as three columns on `media` (or `event`, see §4). Cost:
about 80 lines in the form, two lines of schema, nothing at publish, nothing at
view, and the picture is a local `File`, so no origin question. The one known
wobble is READ from node-vibrant's README: *"Downsampling will cause
perceptible inconsistent results across browsers due to differences in canvas
implementations"*, which does not matter when the value is computed once,
shown, and stored. The 98 migrated events do not go through the form; the
migration script runs on this Mac, where the throwaway script from §1 already
does the job with `sips`, and writes the same three columns.

**(b) In the Worker at publish. Priced, not recommended.** The runtime has no
canvas and no image decoder (READ,
https://developers.cloudflare.com/workers/runtime-apis/web-standards/: the
list has Compression Streams and no canvas or image API). Two ways round it.
(b1) The Images binding shrinks the original to a 32 px PNG in the Worker,
`env.IMAGES.input(stream).transform({ width: 32 }).output({ format:
"image/png" })` (READ, https://developers.cloudflare.com/images/optimization/binding/),
and a small PNG reader decodes it: walk the chunks, join the IDATs, inflate
with `new DecompressionStream("deflate")` (READ, the same Web Standards page:
*"support the deflate, deflate-raw and gzip compression methods"*), undo the
five filters, read colour types 2 and 6. About 120 lines and a test; whether
Cloudflare's PNG output is 8 bit RGB or a palette is INFERRED and one call
settles it. Billed as one unique transformation per picture per month (READ:
*"each unique combination of source image and parameters is billed only once
per calendar month"*), against the 5,000 free the CMS plan already counts,
so 98 once and then a handful a month. `.info()` is free and gives only format,
size, width and height. (b2) Workers AI. No model returns colours;
`@cf/microsoft/resnet-50` returns labels at 0.23 neurons an image (READ,
https://developers.cloudflare.com/workers-ai/platform/pricing/: 228,055 per
million, 10,000 neurons a day free), and a vision LLM asked for a hex answers
with a guess. Refused for this: a measurement that cannot be repeated is not a
measurement. (b1) becomes worth its day only if pictures ever arrive by a route
that is not the form.

**(c) In the browser at view time. Recommended for the demo only.** The event
page's `<img>` is same-origin in the demo, so a 64 px canvas read of the loaded
picture is about fifty lines and needs no data. Its costs for a site: the
page paints plain and then changes when the picture decodes (colour only, so
nothing moves, but it is a visible change); the work repeats on every visit;
and the CMS serves pictures from a media hostname, which makes the canvas
tainted unless the bucket sends `Access-Control-Allow-Origin` and the `<img>`
carries `crossorigin`, which also splits the cache by request mode. color-thief
says the same in one line (READ, https://github.com/lokesh/color-thief:
images must be *"same-origin or CORS enabled"*). Spotify, for what it is
worth, does not do (c): its per-track colour arrives from a server endpoint
beside the lyrics (READ, https://inobtenio.com/en/posts/spotify-song-colors/:
*"the response also includes the background color they should have"*), which
is (a) or (b) with the values stored.

## 3. What may vary, what never does, and the list page

The rule is the owner's: the rest of eccm stays minimal and out of the way. So
colour enters the event page in exactly two forms, a ground and an interaction
accent, and never as ink, as a rule, or as a cue for hierarchy.

**May be set by the picture, on `<article class="event">` only:**

| token | set from | used by | when |
| --- | --- | --- | --- |
| `--ev-ground` | the flat edge colour, lightened toward white until the muted ink passes 4.5 | the head band: `.event-top`, full bleed, holding the crumb, title, facts, actions and the picture at its own size on its own ground | all four edges flat and the edge is not within 1.1 : 1 of white |
| `--ev-accent` | the seed hue and chroma at the tone in §4's window | what `--eccm-accent` does today and nothing more: the hovered underline, the focus ring | the seed's chroma is 0.04 or more and the toned value passes both checks |

Two mechanisms, and MEASURED each picture feeds at most one: Gestures has a
ground and no usable accent; Scrapyard an accent and no ground. A third
candidate, the picture's own column tinted while the head stays white, is the
first one drawn as a box on a page that has none (compose §4's ladder, and
*"unneccessary backgrounds"*, 2026-09-26), so the band is the whole frame's
width or nothing. A fourth, a tint on the kicker or the labels, is refused:
that is colour as hierarchy, and eccm-ui §2 is explicit that hierarchy is size
and space and never a colour. The primary button stays ink: an accent that
shows only on hover and focus is the accent that is out of the way.

**Never moves:** the face, the five sizes, the three leadings, the measure, the
spacing scale, `--eccm-ink` and `--eccm-ink-2` as the colour of every word, and
`--eccm-ground` under the prose. The reading column is ink on white on every
event, which is what keeps this a reading site with one coloured section
rather than a themed page.

**The list page: nothing.** The picture already carries its colours into the
list, ten of them at once. A hairline in the event's colour is a rule between
like rows (compose §4, Material's *"only the margin between items is
acceptable"*), and a tinted row is eccm.ee's own design that the demo removed
(MEASURED in eccm-ui §5: rows on a 5 per cent tint). The list's assert count
must not change.

**Where the line is.** Colour is a surface the ink sits on, or a change on
interaction. The moment a derived colour is read as meaning (this event is red,
that one is blue), it is a category badge again, and eccm.ee's six badge colours
are what the design plan §D dropped. The band is not a label; it is the poster's
paper reaching under the title.

**Argued against eccm-ui §2 and §3.** §2 forbids colour as hierarchy: the band
is under the whole head, not under one level of it, so it ranks nothing. §3
forbids anything drawn over a picture and anything painted under a row: the
picture keeps its own pixels and its own size, the band is behind and around
it, and the row rule is the list's, which is untouched. What §3 does lose is
the picture's edge, on the two pictures where the edge was the ground's colour
anyway. That is the point, and it is also the thing to look at before deciding
(§8).

## 4. Guardrails

**The formula, READ.** Relative luminance
(https://www.w3.org/WAI/GL/wiki/Relative_luminance): *"L = 0.2126 * R + 0.7152
* G + 0.0722 * B"*, each channel *"if RsRGB <= 0.03928 then R = RsRGB/12.92
else R = ((RsRGB+0.055)/1.055) ^ 2.4"* (the page notes 0.04045 is the IEC
value and the difference is nil at 8 bits). Contrast
(https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio): *"(L1 + 0.05) / (L2 +
0.05)"*. Thresholds: 1.4.3 *"at least 4.5:1"* for text, *"at least 3:1"* for
large text; 1.4.11 *"at least 3:1"* for non-text. One function, about twelve
lines, used in the form, in the migration script and in the page's asserts.

**The pairs, every one computed, MEASURED against the tokens on disk.**

| pair | must be | Gestures | Scrapyard |
| --- | --- | --- | --- |
| `--eccm-ink` on `--ev-ground` | 4.5 | 9.42 (10.82 after lightening) | no ground |
| `--eccm-ink-2` on `--ev-ground` | 4.5 | 4.03, so lightened 20 % to #c9cdc8, 4.63 | no ground |
| `--ev-ground` against white | 1.1 or more, else it is white and there is no band | 1.85 (1.61 after) | |
| `--ev-accent` on white | 4.5, it underlines text | 5.66 | 5.74 |
| `--ev-accent` against `--eccm-ink` | 3, or it is a second black | 3.07 | 3.03 |
| `--ev-accent` chroma | 0.04 or more, or it is a grey | 0.066 | 0.121 |

**The accent window, MEASURED.** Both accent checks together mean the accent's
luminance must sit in **[0.131, 0.183]**: at most 0.183 to read at 4.5 on
white, at least 0.131 to stand 3 : 1 from an ink of Y 0.0103. The site's own
`#b3400f` sits at 0.133, 5.74 and 3.03. So the derivation is one rule: keep
the seed's hue and chroma, clamp the chroma to the sRGB gamut, and set the
lightness at the first step from 0.40 up where Y enters the window, which was
OKLCH L 0.51 to 0.52 for all six seeds tried. The window is narrow, which is
why a seed is never used as it comes: five of the six seeds on disk fail one
side of it.

**When the picture gives nothing, the page is the plain page and the data says
why.** `theme_reason` holds one of `grey` (mean chroma under 0.02), `no flat
edge`, `edge is white`, `accent fails`, or `off`, and `theme_ground` and
`theme_accent` are null. An absence that is not written down looks like a
feature that never ran (CLAUDE.md, on the device logs), so the fallback is a
recorded decision. Nine of the eleven files here would record one.

**Never text over the picture.** The band is behind the head and the picture
sits inside it at its own size with the band's colour around it; no element
but the picture's own ancestors may intersect its rect, and the page asserts
that as it asserts nothing over a list picture today.

**The editor sees it and can turn it off.** The form (the CMS plan's §8 editing
surface, `demo/eccm/edit.html` today) shows the derived ground and accent as
two swatches with their four contrast numbers beside them, a checkbox *"Kasuta
pildi värve"* checked when the derivation passed, and two colour inputs for an
override that run through the same checks and refuse a failing value in words.
Off is stored as `theme_reason = 'off'` and survives a re-upload of the same
picture. Every value is a stored hex, reviewed once, and the CSS mixes nothing
but the band's white lightening, which only ever raises contrast for a dark
ink; `oklch(from ...)` could derive the tones in CSS, but then the check and
the value would live in different places, and the check is the feature.

**A registered property is the last net.** `@property --ev-ground { syntax:
"<color>"; inherits: true; initial-value: #ffffff }`, Baseline 2024 newly
available (READ, §6), so a malformed stored value falls back to the page's
white instead of an invalid computed value; and the band reads
`background: var(--ev-ground, transparent)` so it is nothing where nothing is
set. No dark scheme is promised (design plan §D) and every number here is
against white.

## 5. The experiment on the demo, in order of cost, not built

1. **Zero script, about 15 lines.** On `demo/eccm/event.html`, `style="--ev-ground:
   #c9cdc8"` on the article (the lightened Gestures ground from §4), the head
   band made full bleed by moving `.event-top` out of the frame into its own
   `.band` wrapper with a `.frame` inside (compose §1: a child never escapes
   an inset, it changes parent), `padding-block: var(--eccm-s-8)`, the band
   touching the nav's bottom rule so it reads as a section and not a box. Then
   look at 375 and 1280 (compose §0) before anything else is written. The
   owner's eye on this one shot decides whether §3's line is right.
2. **The view-time read, about 50 lines, behind `?derive=1`.** A 64 px canvas
   read of the loaded picture, the edge test, the chroma test, the tone rule,
   setting the two properties, and a `?pic=<file>` switch so each of the ten
   pictures can be seen on the same page. The comment *"No script on this
   page"* changes to say the script runs only under the flag.
3. **The asserts, about 60 lines, under `?selfcheck=1`** with the `window.__demo`
   shape `index.html` uses: every pair in §4's table passes for whatever
   picture is loaded, or no `--ev-*` is set and the readout carries the reason;
   `?pic=morton-feldman` sets nothing and reads `grey`; nothing but ancestors
   intersects the picture's rect; the prose column's computed background is
   white and its colour is the ink whatever the picture; nothing leaves the
   origin; and the list page's assert count is what it was, because it is
   untouched.
4. **Then the form**, §2(a), which is the CMS's session 2 and not the demo's.

Roughly 130 lines in all for the demo, half a day, and step 1 is an hour.

## 6. Prior art, one sentence each

- **Material You dynamic colour.** One seed from the wallpaper, a tonal
  palette per key colour, roles assigned by tone so contrast is guaranteed by
  the 40 and 50 tone rule (READ from the library and its `hct.ts`, URLs in §1;
  the two m3.material.io pages tried answered 404 and an empty body).
- **Android Palette API**, which Vibrant.js ports: six profiles, *"Light
  Vibrant, Vibrant, Dark Vibrant, Light Muted, Muted, Dark Muted"*, 16 colours
  by default, scored on saturation, luminance and population (READ, URL in §1).
- **Vibrant.js / node-vibrant**: the six swatches (READ, https://vibrant.dev/)
  and the canvas downsampling warning (READ, the README); its quantiser is
  MEMORY.
- **color-thief**: `getColor` and `getPalette`, `quality` 1 to 10, `colorCount`
  2 to 20, same-origin or CORS (READ, URL in §2); its current README describes
  OKLCH quantisation and swatches, and the MMCQ of the classic version is
  MEMORY.
- **Spotify**: the colour is served beside the lyrics from an internal
  endpoint, per track, not computed on the client (READ, URL in §2).
- **Apple Music**: the Now Playing screen washes its background from the
  artwork, MEMORY, nothing fetched today confirmed it.
- **The CSS that makes it cheap.** `color-mix()`: *"Widely available"*,
  *"since May 2023"* (READ,
  https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix).
  `light-dark()`: *"Baseline 2024 Newly available Since May 2024"* (READ,
  https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark).
  `@property`: *"Baseline 2024 Newly available Since July 2024"* (READ,
  https://developer.mozilla.org/en-US/docs/Web/CSS/@property). Relative colour
  syntax, `oklch(from var(--seed) 0.52 c h)`: the MDN guide showed no banner to
  the fetcher; caniuse lists full support from Chrome 131, Safari 18.0 and
  Firefox 133 at 92.29 per cent global (READ, https://caniuse.com/css-relative-colors),
  so newly available, not widely. Of these the plan uses `@property` and a
  `color-mix()` for the band; the tones are computed once in JavaScript and
  stored, for the reason in §4.

## 7. Cost and order

| session | lands | testable as |
| --- | --- | --- |
| **1**, half a day | §5 steps 1 to 3 on the demo event page | `http://127.0.0.1:8890/eccm/event.html?derive=1&pic=<file>` for each of the ten files, the readout naming the mechanism or the reason, the asserts green with their count reported against today's |
| **2**, half a day, inside the CMS's session 2 | §2(a) in the form, the three columns, the on and off switch, the override with refusal in words | an editor drops the Gestures poster and sees the sage band in preview with four numbers beside it, drops the Feldman photograph and sees the plain page with *grey* beside it |
| **3**, a quarter day, inside the migration | the script from §1 over the 98 originals, writing the three columns | a table of 98 rows: how many grounds, how many accents, how many of each reason |
| priced, not scheduled | §2(b1), the Worker decode, a day | only if a picture ever arrives by a route that is not the form |

## 8. What could not be settled, and what would settle it

| open | why | what settles it |
| --- | --- | --- |
| whether a sage band under the ruled nav reads as the page or as a box | nobody has looked; the owner's rule about backgrounds is about boxes | §5 step 1 at 375 and 1280, one hour |
| whether ECCM's editors want per-event colour at all | the ask is *"one idea"*; nobody at ECCM was asked | the walk-through in the CMS plan's session 5 |
| the flat-edge thresholds, 97 per cent within 12 of 8 bits, on two rows | GUESSED starting points that both Gestures files passed at 100 per cent; a heavily compressed upload may ring at its edges | the 98 originals, session 3 |
| the chroma floors, 0.02 for grey and 0.04 for a seed | GUESSED; they separate today's eleven files cleanly | the same 98 |
| Material's tone rule | READ from the library source, not from the design pages, which did not render | the m3.material.io colour pages on a day they render |
| Vibrant's quantiser, Apple Music's wash | MEMORY | node-vibrant's source; Apple's iOS 10 preview or the HIG |
| Cloudflare's PNG output colour type | INFERRED 8 bit RGB | one call to the binding, if (b1) is ever built |
| relative colour syntax's Baseline line | caniuse says Chrome 131, MDN's banner was not seen | the MDN reference page for `oklch()` |
| `demo/shot.mjs` on a page that is not a slug | it takes a slug today; the event page is a file | read `shot.mjs` before §5 step 1, or pass the URL if it takes one |
| the file count | the brief said eleven; disk holds ten `ic_*` and the logo | none; the table names all eleven files it measured |
