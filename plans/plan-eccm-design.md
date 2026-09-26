# eccm.ee design: what it is today, the logo, and a small system of its own

Asked 2026-09-26, dictated, verbatim:

> *"In bg do eccm site design analysis. We need not to take it all and we
> actually should improve it, especially typography, anti-aliasing and similar
> stuff. Also look at the logo situation. Is it available on vector? Maybe
> convert into a vector. And what else is there? Have a kind of a separate small
> design system. When we do the demo, we share the zero with Positron, Positron
> just can host the demo of it. So what is the minimal kind of nice typography,
> dark on white approach and also details, and compare and contrast it with our
> Positron composer or composing skill. Maybe we can get more things right here.
> Think about the ECCM visual or UI skill to deliver good typography based, white
> space based UI for a website and write it into a plan."*

## The verdict

eccm.ee is Joomla 5's stock Cassiopeia template with a 1,231 byte `user.css`
on top, and nearly everything a visitor sees is a template default. It declares
`"Roboto", sans-serif` and serves no Roboto, so it renders in Helvetica on a Mac
and Arial on Windows, at 14.4 px with a 1.3 line height, in a 910 px column
that holds about 142 characters a line. The only two fonts it does load are
icon fonts, 170,243 bytes for four glyphs. There is nothing to keep except the
mark: the logo is a 381 by 199 JPEG exported from Photoshop in February 2023,
no vector exists anywhere on the site, and its own filename says a set of
variants does exist somewhere, so the way to a vector is one email, with a
redraw as the fallback because the mark is simple geometry. A minimal system
for the replacement is one self-hosted family in two weights, an 18 px body on
a 66 ch measure, near-black ink on white, one accent, and about 30 tokens; it
carries over eight of positron-compose's ten sections unchanged and needs a
typography layer that skill has never had. Positron hosts a demo of it under
`demo/eccm/` importing nothing from `shell/`.

| mark | means |
| --- | --- |
| **MEASURED** | read from a response saved from eccm.ee on 2026-09-26, or a computed style from a headless Chrome render of it that day |
| **READ** | quoted from a file in this repository or from a standard |
| **INFERRED** | concluded from two measured things and stated by neither |
| **GUESSED** | an estimate with only reasoning behind it, and it says so where it appears |

**How the scan was done. Five requests to eccm.ee, one at a time, none
retried, all with a Safari 17 desktop user agent.** Two of the five were
headless Chrome navigations of the front page (1280 by 900 at 1x, then 375 by
812 at 3x with mobile emulation). The first navigation pulled 66 responses,
the second pulled the HTML again and served every subresource from memory, so
the server answered about 71 responses in all. Every response is saved in the
session scratchpad under `eccm/` and nothing was fetched twice. Seven of the
twelve allowed requests were not used.

| # | what | answer |
| --- | --- | --- |
| 1 | `curl` `/index.php/et/` | 200, 68,390 bytes |
| 2 | Chrome `/index.php/et/` at 1280 | 200, 66 responses, 966 KB on the wire |
| 3 | Chrome `/index.php/et/` at 375, dpr 3 | 200, HTML only from the server |
| 4 | `curl` `/index.php/et/134-gestuurid-.../2026-09-30-19-00` | 200, 62,496 bytes |
| 5 | `curl` `/index.php/et/eccm/kontakt` | 200, 46,258 bytes |

---

## B. What the site looks like today, measured

**The typeface is whatever the machine has. MEASURED.** `user.css` sets
`--cassiopeia-font-family-body: "Roboto", sans-serif`. No `@font-face` for a
text font exists in any of the 14 stylesheets (466,645 bytes uncompressed, all
saved and grepped), and no font file other than two icon fonts crossed the
wire. Chrome's `CSS.getPlatformFontsForNode` reports **Helvetica** for the
descriptions, the nav and the venue, and **Helvetica-Bold** for the titles and
the day numerals. INFERRED: on Windows the same generic `sans-serif` resolves to
Arial. And the decision made it worse than the default: Cassiopeia's own
fallback is `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica
Neue", Arial, ...` (MEASURED in `template.min.css`), so leaving the variable
unset would have given SF on a Mac and Segoe UI on Windows. Naming Roboto and
not serving it threw the system stack away.

**Sizes and line heights, computed at 1280. MEASURED.**

| element | size | line height | weight | colour | note |
| --- | --- | --- | --- | --- | --- |
| `html` | 16 px | | | | |
| `body` | 14.4 px | 18.72 px (1.3) | 400 | #22262a | `user.css`: `0.9rem`, `1.3` |
| `h1` page title | 40 px | 48 px | 600 | #22262a | Helvetica has no 600, draws bold |
| `h2` event title (10) | 32 px | 38.4 px | 600 | #30638d | link colour |
| nav link (13) | 17.6 px | 26.4 px | 400 | #000 | |
| `h3` sidebar card head | 28 px | 33.6 px | 600 | #22262a | on a 3 per cent tint |
| event date `strong` | 16 px | 20.8 px | 700 | #22262a | |
| venue `.ic-place` | 14 px | 18.2 px | 400 | #22262a | |
| description `.ic-descshort` | **12 px** | 15.6 px | 400 | #22262a | the only prose on the page |
| `Üksikasjad` button | 14 px | 21 px | 400 | #353b41 | |
| category badge | 14.4 px | 16 px | 500 | black or white | six colours |
| date box day | 42 px | 42 px | 700 | #fff | over a photograph |
| date box month | 28 px | 28 px | 500, 2 px tracking | #fff | |
| date box year | 20 px | 24 px | 500, 2 px tracking | #fff | |
| calendar day cells | **10 px** | 20 px | 400 | #22262a | 29 cells |
| form inputs | 16 px | 24 px | 400 | | |

At 375 the headings shrink by Bootstrap's `calc(1.375rem + 1.5vw)` rule: `h1`
27.6 px, event `h2` 24.6 px, card head 23.05 px. Body, description and calendar
sizes do not change.

**Measure. MEASURED by canvas at the computed font, in characters a line.**

| block | 1280 | 375 |
| --- | --- | --- |
| content column `.container-component`, 14.4 px | 909.6 px, **142 cpl** | 317.4 px, 50 cpl |
| description `.ic-descshort`, 12 px | 664.7 px, **124 cpl** | 297.4 px, 56 cpl |
| event title column, 32 px bold | 462.8 px, 23 cpl | 291.5 px |
| sidebar card body, 14.4 px | 282 px, 44 cpl | |

INFERRED for the event page: it uses the same grid (the only stylesheet
difference is `leaflet.css` added and `tipTip.css` dropped), so its 5,555
character, 677 word, 43 paragraph description runs at about 142 characters a
line at 1280. Nothing on the site sets a reading width.

**Colours and contrast. MEASURED colours, ratios computed.**

| pair | ratio | verdict |
| --- | --- | --- |
| body #22262a on #fff | 15.23 | fine |
| event title #30638d on #fff | 6.37 | passes AA at any size |
| nav #000 on #fff | 21.00 | fine |
| nav hover and active **orange #ffa500 on #fff** | **1.97** | fails everything |
| button text #353b41 on #fff | 11.33 | fine |
| date box **white on #ddd** (the no-image fallback) | **1.36** | fails |
| date box white over a photograph | unmeasurable | depends on the picture |
| badge black on #adf0c5, #639ea8, #bdbdbd | 16.05 and lower | the mint passes, the grey is 1.84 against white as a shape |
| badge white on #377a4e, #6223a1, #a13d3d | 3.1 to 8 | the green fails for 14 px text |

The effective link colour #30638d comes from Joomla's shipped
`colors_alternative.min.css`, selected in the template options; `user.css`
declares `--cassiopeia-color-link: black`, which the template does not read for
links, so that line does nothing (MEASURED: computed link colour rgb(48,99,141)).
The orange comes from `--cassiopeia-color-hover: orange` and from a
`box-shadow: -5px 3px 5px rgba(255,165,0,1) inset` on `.container-nav`, which
is the orange rule under the header.

**Fonts loaded. MEASURED from `Content-Length`.**

| file | bytes | why |
| --- | --- | --- |
| `fa-solid-900.woff2` | 158,220 | the arrow in `Üksikasjad`, calendar arrows, the eye on the password field |
| `iCicons.ttf` | 12,023 | iCagenda's own icons, a TTF not a WOFF2 |
| text fonts | **0** | |

Font Awesome declares `font-display: block` three times; the iCicons sheet
carries `font-display:` with no value, so none. `template.min.css` has zero
`font-display`, zero `-webkit-font-smoothing`, zero `text-rendering`, zero
`hyphens`, zero `font-feature-settings` (grep counts on the saved file). There
is no rendering decision anywhere; whatever looks soft or thin is the platform
drawing Helvetica or Arial at 12 to 14.4 px in a dark grey, plus the logo
below. The text is not a thin weight: 400 and 700 only. So the anti-aliasing
complaint has two sources, INFERRED: small grey text in a fallback face, and a
JPEG logo that is upscaled 2x on every Retina screen and 1x soft everywhere.

**Layout widths and rhythm. MEASURED at 1280.** `.site-grid` is Cassiopeia's
`[full-start] minmax(0,1fr) [main-start] repeat(4, minmax(0, 19.875rem))
[main-end] minmax(0,1fr) [full-end]` with a 2em gap, a 1,320 px frame at most.
At 1280 the main column is 909.6 px at x 28.8 and the sidebar is 284 px at x
967.2, so the frame is 1,222.4 px with 28.8 px gutters. The header is **340 px
tall** (language flag at y 7.2, logo 381 by 199 at y 61.3, nav 67.6 px at y
272.5) and computes `position: sticky`, so a third of a 900 px window is pinned.
An event row is 909.6 by 340.3 px: a 224.9 by 146 px date box with a 300 px
thumbnail behind it, then content starting at x 270.7 with 5 px and 10 px
paddings, a `rgba(127,127,127,0.05)` tint, and 9.09 px between rows. The
spacing values in use are 5, 8, 9.09, 10, 14.4, 16 and 28.8 px, which is seven
values and not a scale.

**What is aligned to what. MEASURED.** Three left edges: the page title and the
logo at x 28.8, every event title at x 270.7, the sidebar at x 967.2. The
category badge floats right at x 877 beside a title that wraps under it; the
`Üksikasjad` button sits right at x 837 under text that sits left. Four of the
ten titles are typed in capitals in the data, and the longest is five lines of
32 px bold capitals beside a date box.

**The phone. MEASURED at 375 by 812.** The header is **324.9 px, 40 per cent
of the first screen**, because `user.css` sets the logo to `width: 11em` (352
px). The nav is 13 links in a row of which three are visible (`Avaleht`,
`ECCM`, `Tallinn 1965`); the rest run off the right edge with no hamburger,
because `user.css` positions the nav absolutely at `left: 10px` and gives
`.container-nav` a typed **`width: 3320px`**. That same line is why
`document.documentElement.scrollWidth` is **3,320 px at both widths**: 2,040 px
of sideways overflow at 1280 and 2,945 px at 375, on every page. The first
event title, 24.6 px bold capitals centred, is 350.4 px wide inside a 291.5 px
column and overflows its card by 59 px; it takes seven lines. The date box is
307 by 128 px. The description is 12 px on a phone.

**Template default or decision.** Decisions, all in `user.css` (MEASURED):
Roboto by name, 0.9rem body, 1.3 line height, headings at 600, primary #bbb,
hover orange, white header, the 3,320 px widths, the orange inset shadow, the
11em phone logo, and dropdown radii. Defaults: the grid, every heading size,
the focus style (`outline: 0` plus a `#010156` box shadow), the card chrome,
the `Login Form` card on every public page, the calendar module under every
page, Joomla's own `joomla-favicon.svg` as the site icon, a GIF flag as the
language switcher, `Powered by iCagenda` in the footer, six iCagenda category
colours, and on the contact page a `Faks:` label with nothing after it. The
event page's 43 paragraphs carry `dir="ltr"` on 35 of them, which is the
signature of a paste from Google Docs (INFERRED).

---

## C. The logo

**What is served. MEASURED.**

| file | format | pixels | bytes | where |
| --- | --- | --- | --- | --- |
| `https://eccm.ee/images/eccm_tallinn_logod_72dpi_no_tln.jpg` | JPEG, baseline, sRGB, no alpha, 72 dpi | 381 by 199 | 34,053 | the header of every page, at 1:1 on a desk and 352 px wide on a phone |
| `https://eccm.ee/images/tallinn_muusika_small.jpg` | JPEG | 120 by 118 | 12,427 | the sidebar: the `Tallinn muusikalinn` (UNESCO City of Music) mark, a third party's logo |
| `/media/templates/site/cassiopeia/images/joomla-favicon.svg` | SVG | | 610 on the wire | the tab icon, and it is Joomla's logo, not ECCM's |

**Provenance. MEASURED from the JPEG's XMP.** `Adobe Photoshop CC 2019
(Macintosh)`, created 2023-02-17 18:04, saved 18:07, history *"converted from
application/vnd.adobe.photoshop to image/jpeg"*, one document ancestor. So a
layered `.psd` existed on somebody's Mac in February 2023. INFERRED from the
filename: `eccm_tallinn_logod` is Estonian for *ECCM Tallinn logos*, plural,
and `no_tln` is the variant without the Tallinn mark, so the PSD holds both
marks as layers and was exported in at least two variants. Whether the PSD
contains vector layers or a placed raster cannot be known from here.

**Is there a vector on the site? No, as far as three pages show.** The front
page, one event page and the contact page were read in full. The only SVGs are
Joomla's two favicons, an inline passkey icon and iCagenda's add-to-calendar
icons. No `.pdf`, `.eps`, `.ai`, `.zip` or press page is linked from any of
them, and the contact page carries no designer credit. Pages not read
(`eccm`, `liikmed`, `residentuurid`, `ulysses`, `konkursid`, the EN tree) could
still hold one; the CMS scan read four of those through a markdown fetcher and
reported no PDF linked anywhere.

**The mark's geometry. MEASURED by eye on the 381 px raster and a 6x crop.**
Four condensed capitals `E C C M`, about 90 px tall at this size with strokes
of about 14 px, drawn as rectangles and semicircles: the E is three bars, each
C a rounded rectangle open on the right, the M two verticals with a V. Five
hairline horizontals, a music stave, run through the letters at the height of
the E's bars and continue to the right past the M by about 20 px. Under it,
two centred lines of condensed lowercase, `estonian centre of contemporary
music` then `eesti nüüdismuusika keskus`, at roughly 20 px and 18 px. The
capitals may be drawn rather than typed. The tagline is a condensed grotesque
with a double-storey a, an angled terminal on the t and a straight-tailed y;
candidates are Helvetica Condensed Bold, Roboto Condensed Bold, Nimbus Sans
Narrow or a Univers condensed weight, and **the face could not be determined**
from a raster whose x-height is about 12 px. The 6x crop shows JPEG ringing, a
grey halo one to two pixels wide around every stroke, so the file is not even
a clean bitmap.

**Three ways to a vector, in the order to try them.**

1. **Ask.** One email to ECCM, whose contact page names Taavi Kerikmäe,
   tegevjuht, +372 5162103, Herne 11A, Tallinn 10135 (MEASURED). Ask for: the
   original vector logo as **AI, EPS, PDF or SVG**, in black on transparent;
   the **name of the typeface** used for the tagline; **the designer's name**
   and whether the mark may be redrawn or adapted; the February 2023 Photoshop
   file if nothing else exists; and the official vector of the **Tallinn
   muusikalinn** mark, which Tallinn's city brand kit will have. A 72 dpi
   export named as a variant is not how a designer delivers a logo, so the
   odds that a vector exists are good (GUESSED).
2. **Trace.** `potrace` on the JPEG after a hard threshold (the ringing must be
   cut first, or every edge grows a fringe). The four capitals at 90 px trace
   into usable shapes with wobbly arcs on the two C's; the five stave lines are
   one pixel tall here and trace as broken worms; the tagline at 12 px x-height
   traces as unusable blobs. Verdict: tracing yields the `ECCM` letters only,
   and only with an hour of node cleanup in Inkscape. Not the route for the
   tagline.
3. **Redraw.** The capitals are exact geometry and can be rebuilt in any vector
   tool from proportions measured on the raster: cap height, stroke width,
   counter width, stave spacing, overshoot. Two hours. The tagline is then set
   again in a condensed face: if ECCM names the original and owns it, in that;
   otherwise in a free one, where Roboto Condensed Bold is the closest at a
   glance (INFERRED, unverified against the original), and the letterforms will
   differ a little. A redraw of somebody's mark needs their yes, so it is an
   interim for the demo and a proposal to them, not a replacement.

**Recommendation:** send the email today, redraw the mark for the demo while
waiting and label the SVG interim in its own `<desc>`, and retire the JPEG the
day a real vector arrives. The header SVG should be inline, `fill:
currentColor`, with the stave hairlines at a stroke that survives 1x rendering
(0.75 px at the served size renders as a soft grey line, so the redraw sets a
minimum of 1 px at the smallest size it is shown at).

---

## D. A small design system for eccm, separate from positron

Everything below is a `--eccm-*` token or a component name. None of it imports
`shell.css`, none of it uses a `.pos-*` class, and the dark ground, the glued
panel and the instrument metaphor do not exist here. Each item is marked
**decision** (argued for below) or **default** (a reasonable first value to be
looked at on a real page).

**Typeface. Decision, with the alternative priced.** One family, two weights,
self-hosted as WOFF2, subset to `latin` plus `latin-ext`. The subset matters:
õ ä ö ü live in Latin-1 (U+00F5, U+00E4, U+00F6, U+00FC) and **š and ž live in
Latin Extended-A (U+0161, U+017E)**, so a `latin` only subset drops two
Estonian letters and the browser draws them from a fallback face mid-word
(READ from the Unicode blocks; verify on the served `unicode-range`). The
candidates that are OFL licensed, cover both blocks, ship a variable weight
axis, and are hinted well enough to hold up in Windows ClearType at 16 to 18
px:

| family | fits because | costs |
| --- | --- | --- |
| **IBM Plex Sans** (recommended default) | a grotesque with a technical, slightly severe voice that sits next to a condensed black wordmark without competing; tabular figures; Plex Sans Condensed exists in the same family if the logo tagline is ever re-set; 400 and 600 both read as text weights | about 110 KB for two static weights latin plus latin-ext, or about 90 KB for one variable file (GUESSED from typical Plex subsets; measure the real files) |
| Inter | the safest screen face there is, excellent hinting, tabular figures | everywhere, so it says nothing about ECCM |
| Source Sans 3 | light, humanist, very legible small | reads as documentation |
| a serif for prose only, Literata or Source Serif 4 | 677 word event texts are read, not scanned, and a serif at 18 px on white is the calmest reading there is | a second family, another 60 to 80 KB, and a pairing to get right |
| the system stack `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` | zero bytes, zero layout shift, and it is what Cassiopeia would have given if `user.css` had said nothing | a different site on every machine, and no way to make the logo's condensed voice recur |

The recommendation is Plex Sans alone, 400 and 600, and the serif is the first
thing to try on the event page once it exists. Weight 600 rather than 700 for
headings, because 700 in a grotesque at 36 px on white is heavier than a
black-and-white identity needs (default). `font-display: swap` with a
`size-adjust`ed local fallback (`Arial` on Windows, `Helvetica Neue` on macOS)
so the swap does not reflow (decision: the current site's whole rendering is
the fallback, so the fallback must be tuned, not ignored).

**Type scale. Decision on having one, default on the ratio.** Base 1.125 rem
(18 px) and a 1.25 ratio, five steps, the top two fluid:

| token | rem | px at 16 | use |
| --- | --- | --- | --- |
| `--eccm-t-s` | 0.875 | 14 | meta labels, captions, footer; nothing smaller exists |
| `--eccm-t-m` | 1.125 | 18 | body, event descriptions, nav |
| `--eccm-t-l` | 1.4 | 22.4 | event title in a list, h3 |
| `--eccm-t-xl` | `clamp(1.55rem, 1.2rem + 1.5vw, 1.75rem)` | 24.8 to 28 | page title, h2 |
| `--eccm-t-2xl` | `clamp(1.85rem, 1.3rem + 2.5vw, 2.2rem)` | 29.6 to 35.2 | event page title, h1 |

No 12 px and no 10 px anywhere (the site has both today). Numerals in dates and
times are `font-variant-numeric: tabular-nums` so a column of dates aligns.

**Line height and measure. Decision.** `--eccm-lh-body: 1.5`, `--eccm-lh-head:
1.15`, `--eccm-lh-meta: 1.4`. Prose sits in `--eccm-measure: 66ch` (about 590 px
at 18 px Plex, INFERRED from an average advance near 0.5 em) and list rows in
`--eccm-measure-wide: 80ch`, because a row is scanned and a paragraph is read.
The frame is `min(100% - 2 * var(--eccm-gutter), 72rem)`; **no container
anywhere types a pixel width** (the 3,320 px in `user.css` is the reason this
is a rule and not a preference). Headings get `text-wrap: balance`, paragraphs
`text-wrap: pretty` where supported, and prose gets `hyphens: auto` under
`lang="et"` with `overflow-wrap: anywhere` as the floor for compound titles
like `GESTUURID/SITUATSIOONID:`.

**Spacing. Decision on the shape, default on the numbers.** Quarter-rem steps,
linear at the bottom and widening at the top, as every surveyed system does
(READ, positron-compose §1): `--eccm-s-1: 0.25rem`, `-2: 0.5rem`, `-3:
0.75rem`, `-4: 1rem`, `-6: 1.5rem`, `-8: 2rem`, `-12: 3rem`, `-16: 4rem`,
`-24: 6rem`. The gap between groups is at least two steps above the gap within
a group (READ, compose §1). `--eccm-gutter: 1rem` on a phone and
`--eccm-s-8` from 48 rem up. Vertical flow inside prose uses the owl,
`.eccm-prose > * + * { margin-block-start: var(--eccm-flow, 1em) }`, and
headings set `--eccm-flow` larger above themselves (READ, compose §1 on why the
Stack did not move to `gap`).

**Colour. Decision on the set, default on the accent.**

| token | value | contrast on ground | use |
| --- | --- | --- | --- |
| `--eccm-ground` | `#ffffff` | | the page |
| `--eccm-ink` | `#1a1a1a` | 17.40 | text, the logo |
| `--eccm-ink-2` | `#555555` | 7.46 | meta, captions, venue lines; AA for body, AAA at 18 px |
| `--eccm-rule` | `#d9d9d9` | 1.41 as a shape | one hairline between sections, never between like rows (READ, compose §4) |
| `--eccm-accent` | `#b3400f` (default) | 5.74 | link underline on hover, focus ring, the `today` marker; nothing else |

The accent is a burnt orange because the current site's one colour is orange
and 1.97:1; this one keeps the family and passes 4.5:1 as text. It is a
default: the alternative is no accent at all and ink for everything, which is
what the logo suggests. No grey text on any coloured ground (READ, compose §4);
the six iCagenda category colours do not carry over, a category is a word in
`--eccm-ink-2`. A dark scheme is not promised for the demo; if one is added it
is the same tokens redefined under `prefers-color-scheme: dark`, and the
contrast table is recomputed, not assumed.

**Links and focus. Decision.** Links are `--eccm-ink`, underlined,
`text-decoration-thickness: 1px`, `text-underline-offset: 0.15em`,
`text-decoration-color: var(--eccm-rule-strong, #999)`; on hover the underline
turns `--eccm-accent` and the text does not change colour. Colour is never the
only cue. `:focus-visible { outline: 2px solid var(--eccm-accent);
outline-offset: 2px }` and **no rule anywhere sets `outline: 0`** (the template
does, on `:focus`, seven times).

**Components, as a list, each one composition and not decoration.**

- **page**: header (logo SVG at `max-inline-size: 11rem` on a desk, `8rem` on
  a phone, so the header is under 25 per cent of a phone's first screen where
  it is 40 today), nav, main at the frame, footer. Nothing sticky.
- **nav**: a start row of text links, `flex-wrap: wrap`, one `gap`, the current
  page marked by an underline in ink (similarity is a promise, READ compose
  §4). Seven items wrap into two lines on a phone and need no hamburger; a
  language switch is the text `ET` `EN` at the row's end, not a flag GIF, and
  the row is the two-ends shape only when it really has two ends (READ, compose
  §6).
- **event list**: a `grid` on the list, `grid-template-columns: [date]
  max-content [body] minmax(0, 1fr)`, every row `display: grid;
  grid-template-columns: subgrid; grid-column: 1 / -1` so all titles start on
  one x whatever the longest date is (READ, compose §2's label and control
  rule). A row is: date and time as text in tabular figures in `--eccm-ink-2`,
  title at `--eccm-t-l` in sentence case with `text-transform: none` and the
  data cleaned of typed capitals, venue and category on one meta line, one
  sentence of description at body size. No date box, no photograph in the
  list by default (default: a 4 rem square thumbnail at the row's end is the
  one addition to try). Rows are separated by space, `--eccm-s-6`, and no
  rule; months are separated by a heading. On a phone the grid goes to one
  column and the row stays left aligned.
- **event page**: title at `--eccm-t-2xl`, a meta block as a `dl` in two
  columns above 40 rem (date, time, venue, address, tickets, price, category),
  the picture at measure width with `aspect-ratio` reserved and `object-fit:
  cover`, never wider than the prose unless a page asks for full bleed
  explicitly, a caption in `--eccm-ink-2`, the description in `.eccm-prose` at
  66 ch, then add-to-calendar as text links, then a map only when an address
  exists. Dates appear once.
- **article**: the event page minus the meta block and the calendar links.
- **footer**: address, phone, email as text, the Tallinn muusikalinn mark if
  its presence is a condition of funding (to ask), the language switch again,
  in `--eccm-t-s`.
- **newsletter form**: one labelled email field and one button on a single
  line above 30 rem, stacked below, visible label, error text in words, no
  placeholder as label.

**Images. Decision.** Two rendered sizes and `srcset`, `loading="lazy"` below
the fold, never upscaled (the list today draws 100 px thumbnails at 225 px
behind a date), and no image is fetched that the page does not show. Event
pictures are the venue's or the artist's and are shown as they are; the system
does not desaturate them.

**Phone rules. Decision.** 375 by 812 at 3x is the phone (READ, `demo/shot.mjs`).
Gutter 1 rem, zero sideways overflow asserted, body 18 px, tap targets 44 px,
header under a quarter of the first screen, every nav link reachable without a
scroll, every title wrapping inside its column.

---

## E. How positron hosts the demo

The owner's words, dictated: *"we share the zero with Positron, Positron just
can host the demo of it."* Read as: the eccm system shares nothing with
`shell.css`, and positron only serves a page that shows it.

**Where it would go. READ from `demo/manifest.mjs`, `LAYOUT.md` and
`workers/view/build.mjs`.** `LAYOUT.md` rule 1: a page a visitor opens is
`demo/<slug>/index.html` plus a manifest row. `build.mjs` line 532 copies a
`demo/<name>/` directory only when its row has `built: true`, one level deep,
web extensions only, so `.html`, `.css`, `.svg`, `.json` and `.woff2` are the
question: **`.woff2` is not in the `OK` set** and would have to be added by
name or the font served from elsewhere. `built: false` takes a row out of
`verify.mjs` (line 53 filters on it) and off the front page, and the manifest's
own comment on `kit` records that the flag once did both jobs at once. A third
state exists: `unlisted: true` with `built: true` deploys and grades a page and
keeps its card off the index, which is the shape `feedback` uses.

**The proposed shape.** `demo/eccm/` holding `index.html`, `eccm.css`,
`eccm-logo.svg`, `events.json` (a typed sample of a dozen real titles, dates
and venues from the scan; the page fetches nothing from eccm.ee) and the font
files; a row `{ name: 'eccm', built: true, unlisted: true, one: 'a reading site
for a contemporary music centre, in its own type system' }`. `index.html`
imports nothing from `demo/shell/`, and publishes a ten line `window.__demo` of
its own with a handful of asserts (zero overflow at 375, measure between 55 and
75 ch, no computed font size under 14 px, every link underlined) so `verify.mjs`
grades it and the assert count is not zero (READ, CLAUDE.md on green pages with
no coverage). The harness contract `__demo` must satisfy was not read for this
plan and is the first thing to check when building.

**The trade-off, in five lines.** Under `demo/` the page gets the dev server,
the deploy, `shot.mjs` and the harness for free and costs one directory and one
row. Under `workers/eccm/` as its own Worker with static assets it shares
nothing at all, can grow into the site the CMS plan describes and later sit on
`eccm.ee`, and costs a second wrangler project, a second deploy step and its
own screenshot and check tooling. The demo starts under `demo/` because the
question it answers is *does this typography hold up*, and the move to
`workers/` is the CMS plan's first session, not this one's. The one line that
must never appear in `demo/eccm/index.html` is `<link href="../shell/shell.css">`.

---

## F. Compare and contrast with positron-compose

| skill section | carries over to a white reading site | does not apply | the skill is missing |
| --- | --- | --- | --- |
| §0 look at 375 and 1280 before saying done; read the report's verb; a crop is not a cause | unchanged, and it is the first rule of the eccm skill | | a look at a reading page also needs a Windows render, which nothing here can take |
| §1 air belongs to the relationship; one number one place; a spacing scale; `gap` for uniform, owl for flow; group gap two steps up; start with too much | unchanged; the owl on prose is exactly the case it argues | the seven-name spacing story is positron's | vertical rhythm as line-height units (`lh`, `rlh`) for flow, so paragraph gaps are a multiple of the leading |
| §2 shared coordinate system; label and control grid via subgrid; measure ink not box; two centres; optical corrections; `text-box-trim`; tracking rules | unchanged; subgrid is the event list; `text-box-trim` is how a title sits flush on its top | the control contract tokens (`--ctl-head` and friends) | optical alignment of type: hanging punctuation (`hanging-punctuation`, Safari only), quotation marks outside the measure, and the first line of a heading against the left edge |
| §3 a thing is its own size; suggestion not prescription; `min-width: 0` | unchanged | the instrument-width argument | the reading-width container in `ch`, which is the one size a text page has |
| §4 count the grouping relationships; ladder space, tint, shadow, border; similarity is a promise; no grey on colour; closure | unchanged, and rows separated by space rather than lines is the event list | | contrast as a rule with numbers; the skill has one contrast rule and it is about hue, not ratio |
| §5 gluing, one edge per object, radius inherit, seams | the sentence *rows in a list are a set, arbitrary boxes are not* | almost all of it: gluing is an instrument-panel idea and a reading site has no joined surfaces | |
| §6 the phone: justify or go linear by the row's own width; container queries; a count is not a width; empty surface at phone scale; truncating labels | unchanged; the two-ends nav rule is used as written | | type on the phone: minimum body size, fluid scale bounds, and long compound words in Estonian titles |
| §7 empty paints nothing; nothing moves while somebody looks | unchanged; `Faks:` with no value is this rule | | image `aspect-ratio` reservation and font swap reflow (`size-adjust`) as the two ways a text page moves |
| §8 read the computed value; match weight never outrun it; custom property per instance; `@layer`; `:where`; logical properties; margin collapsing; `overflow: clip` | unchanged, and `@layer` from day one is cheaper on a new sheet than a retrofit | the `.pos-*` inventory and stylelint numbers | font loading in the cascade: `@font-face` with `unicode-range`, `font-display`, and preload of the one file above the fold |
| §9 fix the component, not the page | unchanged | | |
| §10 where each rule lives | the idea of the table | the rows | print: a `@media print` sheet that hides nav and forms and lets an events list print on one sheet; hyphenation for `et`; dark-on-white as the default the tokens are written for |

The honest summary: eight of ten sections are about relationships between
boxes and are true on any page; §5 is positron's alone; and the skill has no
typography layer at all because positron's pages carry a few labels and a lot
of controls. For eccm the ratio inverts, so the missing column above is the
eccm skill's first half.

---

## G. An eccm UI skill, outline

Rules a future `.claude/skills/eccm-ui/SKILL.md` would hold. Each carries one
measured or cited reason. Not written as a skill here.

1. **One family, two weights, self-hosted, `latin` plus `latin-ext`.** The site
   declares Roboto and serves none; Chrome drew Helvetica (MEASURED).
2. **Nothing under 14 px, body at 18 px.** Descriptions are 12 px and calendar
   days 10 px today (MEASURED).
3. **Prose measure 55 to 75 ch.** 142 characters a line at 1280 (MEASURED).
4. **Body line height 1.5, headings 1.15.** 1.3 in `user.css` at 14.4 px
   (MEASURED).
5. **Sentence case in the data and no `text-transform` on titles.** Four of ten
   titles are typed in capitals and the longest is seven lines at 375
   (MEASURED).
6. **Ink #1a1a1a and muted #555, every pair computed against white, hover
   included.** Orange hover at 1.97:1 (MEASURED).
7. **Links underlined; hover changes the underline, not the colour.** The
   current active-state colour is the one that fails (MEASURED).
8. **Dates are text with tabular figures, not a box over a photograph.** White
   on #ddd at 1.36:1 when the picture is missing (MEASURED).
9. **One left edge for the page title and the list titles.** 28.8 against
   270.7 px today (MEASURED).
10. **Header under a quarter of a phone's first screen, logo at most 8 rem
    there.** 325 of 812 px (MEASURED).
11. **No container types a pixel width; the frame is `min(100% - 2 * gutter,
    72rem)`.** `width: 3320px` is 2,945 px of overflow on a phone (MEASURED).
12. **The nav wraps as a cluster and every item is reachable without a
    sideways scroll.** 3 of 13 links visible at 375 (MEASURED).
13. **Icons are inline SVG.** 170,243 bytes of icon font for four glyphs and
    zero bytes of text font (MEASURED).
14. **Images: never upscaled, `aspect-ratio` reserved, lazy below the fold,
    two sizes.** 100 px thumbnails drawn at 225 px (MEASURED); nothing moves
    while somebody looks (READ, compose §7).
15. **`:focus-visible` outline in the accent, and `outline: 0` is forbidden.**
    The template zeroes it on `:focus` (MEASURED).
16. **A print sheet exists and an events list prints.** No `@media print` in
    any of the 14 sheets (MEASURED, grep).
17. **The language switch is text.** A `en_gb.gif` flag today, and a flag is a
    country (MEASURED).
18. **Empty values render nothing.** `Faks:` with no number on the contact page
    (MEASURED); compose §7 (READ).
19. **`@layer reset, base, layout, components, page, responsive` on line one.**
    Compose §8 calls it the single highest-value change and it is free on a
    new sheet (READ).
20. **The vector logo is the only logo, inline, `currentColor`, hairlines at
    1 px minimum.** The JPEG shows ringing at 6x and is upscaled on every Retina
    screen (MEASURED).
21. **`lang="et"` on the root and `hyphens: auto` on prose only, with
    `overflow-wrap: anywhere` as the floor.** A title overflowed its column by
    59 px at 375 (MEASURED); which engines hyphenate Estonian is to be measured
    (section H).
22. **Rows in a list are separated by space; a rule separates sections; a box
    separates nothing.** Compose §4's ladder (READ) and the six-colour badge
    row today.
23. **Look at 375 and 1280, then read the computed value.** Compose §0 and §8
    (READ); every number in this plan came from `getComputedStyle`, not from a
    rule.
24. **No visitor fetch the page did not ask for, no self-check for a visitor,
    no Google Fonts CDN.** CLAUDE.md's standing rules (READ), and the fonts are
    served from the same origin as the page.
25. **Tokens are `--eccm-*`, and `grep -r "pos-\|shell.css" demo/eccm/` prints
    nothing.** The zero the owner named.

---

## H. What could not be settled from outside, and what would settle it

| open | why it is open | what settles it |
| --- | --- | --- |
| whether a vector logo exists, and in what format | the site serves one JPEG exported from a PSD; the PSD's contents are unknown | one email to ECCM asking for AI, EPS, PDF or SVG and the PSD |
| the tagline typeface | 12 px x-height in a JPEG with ringing | the designer's answer, or the PSD's layer names |
| permission to redraw the mark | nobody was asked | the same email |
| whether ECCM already owns a typeface licence | print material was not seen | ask; it changes the family decision |
| whether the Tallinn muusikalinn mark must appear on every page | it sits in the sidebar with no caption | ask whether a funding agreement requires it |
| what the six category colours mean to ECCM | iCagenda assigns them per category | ask; the system proposes words instead |
| how the chosen family renders on Windows ClearType at 16 to 18 px | this desk is a Mac; the scan touched no Windows machine | one render on Windows Chrome and Edge with the real WOFF2 |
| whether Chrome, Safari and Firefox hyphenate `et` | dictionaries differ by engine and platform | a 20 line test page with a long Estonian paragraph in each engine |
| the real byte size of the Plex subset | not built | build the subset and read the file size |
| the `verify.mjs` contract a shell-less `__demo` must meet | `verify.mjs` was not read for this plan | read it before writing `demo/eccm/index.html` |
| whether `.woff2` may be added to `build.mjs`'s `OK` set | the set is an allowlist by design | one line and a build, or serve fonts from R2 |
| what the English tree and the archive pages look like | not rendered; budget | two more renders when the demo exists |
| the device split of real visitors | no analytics seen | ask; assume phones until told otherwise |

---

## I. Sources

**Requests to eccm.ee, five in total, none retried, all saved under the
session scratchpad `eccm/`:**

| # | URL | saved as |
| --- | --- | --- |
| 1 | `https://eccm.ee/index.php/et/` (curl) | `01-front.html`, `01-front.headers` |
| 2 | `https://eccm.ee/index.php/et/` (Chrome, 1280 by 900, dpr 1) and its 66 subresources | `front-1280.png`, `css/*` (14 sheets), `network.json`, `probe.json`, `eccm_tallinn_logod_72dpi_no_tln.jpg`, `tallinn_muusika_small.jpg`, `en_gb.gif` |
| 3 | `https://eccm.ee/index.php/et/` (Chrome, 375 by 812, dpr 3, mobile) | `front-375.png`, `front-375-viewport.png`, same `probe.json` |
| 4 | `https://eccm.ee/index.php/et/134-gestuurid-situatsioonid-ilma-partituurita-kuulamine-marianna-liik-artjom-astrov-maryn-liis-rueuetelmaa/2026-09-30-19-00` (curl) | `04-event.html` |
| 5 | `https://eccm.ee/index.php/et/eccm/kontakt` (curl) | `05-kontakt.html` |

Subresources of request 2 that this plan quotes by name:
`/media/templates/site/cassiopeia/css/template.min.css` (38,801 bytes on the
wire, 253,151 uncompressed), `/media/templates/site/cassiopeia/css/user.css`
(1,231), `/media/templates/site/cassiopeia/css/global/colors_alternative.min.css`
(151), `/media/system/css/joomla-fontawesome.min.css` (26,726),
`/components/com_icagenda/themes/packs/ic_rounded/css/ic_rounded_component.css`
(5,224), `/media/com_icagenda/css/icagenda-front.css` (6,568),
`/media/vendor/fontawesome-free/webfonts/fa-solid-900.woff2` (158,220),
`/media/com_icagenda/icicons/fonts/iCicons.ttf` (12,023),
`/images/eccm_tallinn_logod_72dpi_no_tln.jpg` (34,053),
`/images/tallinn_muusika_small.jpg` (12,427).

**Files in this repository read for this plan:**
`plans/plan-eccm-cms.md` (the verdict and section 1),
`.claude/skills/positron-compose/SKILL.md` (all 797 lines), `CLAUDE.md`
(conventions), `demo/shot.mjs`, `demo/manifest.mjs` (head, the `kit` and
`feedback` rows), `LAYOUT.md`, `workers/view/build.mjs` (lines 515 to 560),
`demo/verify.mjs` (line 53 only, by grep).

**Scripts written for this plan, in the scratchpad and not in the
repository:** `eccm/render.mjs`, the one Chrome session that made requests 2
and 3 and captured everything above.
