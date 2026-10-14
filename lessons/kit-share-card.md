# Kit lessons: share-card.mjs

The long comments cut from `demo/shell/share-card.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-share-card.md#<anchor>`.

<a id="header"></a>

## share-card.mjs, file header

demo/shell/share-card.mjs: the site's share images as SVG strings written
with no DOM: the front page's hero type alone (the wordmark with its dot in
the accent, the headline on two lines with its full stop in the accent, the
line and the small line, all read from HERO in hero.mjs). The 1200 by 630
card is every page's og:image; the 1080 by 1350 portrait is for Instagram,
posted by hand and tagged on no page. Asked 2026-10-13: *"Build frontpage og
card and apply to all pages"*, *"What headless chrome?!!? See ../eccm etc"*,
then *"No patchbay. Do like frontpage. Do also ig image"*.

eccm's src/og/card.mjs and trip's og-card.ts are the model: text laid out
from the font's own advance widths (font-metrics.mjs), a greedy wrap with a
balance search, every colour a literal, and an FNV-1a hash over what the
card is so its URL changes when the picture does. Rasterised by resvg:
workers/view/og/render.mjs at build. It runs in a browser too, which is how
/kit/share/ shows the SVG beside the PNG made from it.

⚠️ THE NAME IS A HASH OF THE SVG ITSELF PLUS TEMPLATE_V. The SVG is the whole
input to the rasteriser, so it changes whenever anything visible does. What
it cannot see is the TTFs and resvg's own version: bump TEMPLATE_V when
either changes.

<a id="template-v"></a>

## share-card.mjs, `TEMPLATE_V`

bump on a change the SVG cannot show (a face, resvg): it is in every hash.
2 since 2026-10-13: the patchbay came off both cards (*"No patchbay. Do like
frontpage. Do also ig image"*).
3 the same evening: the wordmark larger and at the foot, the Instagram
headline on as many lines as make it biggest, the small line cut to its first
sentence (*"Make positron. studio larger and put to bottom. Wrap ig title"*,
*"Rm delivered as line"*).

<a id="type"></a>

## share-card.mjs, `TYPE`

🔴 THE HERO'S TYPE AND NOTHING ELSE, 2026-10-13. The first card set the hero
small over the imaginary patchbay and the owner said *"No patchbay. Do like
frontpage. Do also ig image"*. So a card is the front page's hero block alone:
the wordmark, the headline on two lines, the line and the small line, at the
front page's own sizes and gaps (shell.css .pos-hero* at the desk, where the
clamps sit at their maxima: 13, 56, 22, 16 px, gaps 18, 24, 18), scaled up
as one block until it fills the frame. bay-svg.mjs stays for a card that
wants a patch later.

<a id="mark"></a>

## share-card.mjs, `MARK`, the wordmark

🔴 THE WORDMARK AT THE FOOT, LARGER, 2026-10-13: *"Make positron. studio
larger and put to bottom"*, then at 2.5 times *"Toooooo big sitename"*. It is
1.5 times the hero's 13 px eye in the same units, so it scales with the card
and stays well under the headline's 56.
tracking 0.14 to 0.08 em: *"reduce sitename tracking a bit"*

<a id="no-small-line"></a>

## share-card.mjs, no small line on a card

🔴 NO SMALL LINE ON A CARD SINCE 2026-10-13: first cut to its first sentence
(*"Rm delivered as line"*), then gone (*"Rm poweee by stuff"*). HERO and the
front page keep the whole of it.

<a id="mark-colours"></a>

## share-card.mjs, the wordmark's colours

Lowercase, `positron` gray and `.studio` yellow: *"No uppercase. Yellow?"*,
*"Try gray and yellow"*, then *".studio in yellow. Go"*.

<a id="hero-card"></a>

## share-card.mjs, `heroCard` and `MARK_AIR`

The hero in a `w` by `h` frame with `pad` on every side: the headline, the
line and the small line from the top margin, the wordmark on the bottom
margin, at least MARK_AIR between them. `lines` is how many lines the
headline may take: [2] as the front page sets it, or several, and then every
break at a space is tried. The column measure and the break that let the
whole grow largest win, scaled by one factor so the front page's
proportions hold, and the type is left aligned on the pad.

<a id="hello"></a>

## share-card.mjs, `HELLO`

🔴 A SECOND INSTAGRAM POST, 2026-10-13: *"To ig add Hello. Is this thing on?
plus sitename"*. The owner's four lines as given, at the largest size the
width and height allow, and the wordmark on the bottom margin as on the
other cards.

<a id="ok-green"></a>

## share-card.mjs, `OK`, the question mark's green dot

🔴 AND THE QUESTION MARK'S OWN DOT IS GREEN: first a dot inside the o of
`on?` (*"Inside on's o add our green dot"*), then *"No inside o. Questionmark
is white but dot is green. Hello's dot is gray"*. The green is the status
dot's, `--ok` in shell.css, the one colour on the site that means "it
answered". The ? is drawn white, then drawn again in green clipped to the
band its dot sits in, so the dot is the glyph's own and not a circle
guessed on top of it.
*"Make green more showy"*: brighter than the status dot's #8fd6a8, and lit,
a blurred copy of itself under it.

<a id="dots"></a>

## share-card.mjs, `dots`

Each dot drawn again in its own colour, clipped to the band it sits in, so
the dot is the glyph's own: the ?'s dot in green (below 0.2 em over the
baseline) and every i's tittle in gray (above JetBrains Mono's 0.55 em
x-height). *"Hello, is thing on? 2 i dots gray, ? Dot green"*, 2026-10-13.

<a id="hello-size"></a>

## share-card.mjs, the hello card's size

three quarters of the largest that fits: *"Smaller title"*
