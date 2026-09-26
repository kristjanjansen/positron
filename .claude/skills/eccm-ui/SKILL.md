---
name: eccm-ui
description: A white reading site set in type, for eccm.ee and hosted as a positron demo: whitespace as an element with a shape, the measure, leading and the space between things counted in it, a scale of few sizes with large contrast, plain pictures beside text, and the event list those rules make. Load before any change under demo/eccm/, before any page for eccm.ee, and before any claim about type on a white page.
---

# White is the material and type is the object

🔴 **THIS SKILL EXISTS BECAUSE THE FIRST CUT OF `/eccm/` WAS CORRECTED SEVEN
TIMES IN ONE SITTING, 2026-09-26, AND THE LAST TWO CORRECTIONS WERE ORDERS TO
WRITE IT:** *"look up priniples on whitespace any design with type"* and
*"and add to eccm skill"*. The five before them, verbatim and in order, are the
rules of §2 and §3. `plans/plan-eccm-design.md` §G outlined 25 rules for this
file and §F said what `positron-compose` lacks for a page of text: a typography
layer. This is that layer.

**The marks.** READ is a page fetched on 2026-09-26, its URL given once.
MEASURED is a number from `plans/plan-eccm-design.md` §B, taken off eccm.ee
that day, or from the demo's own comments and asserts. MEMORY is a book not
opened today, and §6 lists what would confirm each. The owner's words are
verbatim and dated.

## 0. When to load it, and what it leaves to positron-compose

Load before any change under `demo/eccm/`, before any page that is for eccm.ee
wherever it ends up hosted, and before any claim about type on a white page.
Load `positron-compose` beside it every time: this file is the type half and
that one is the composition half, and nothing is written twice. What is that
file's and only pointed at here:

| positron-compose | which this skill does not repeat |
| --- | --- |
| §0 | look at 375 and 1280 before saying done; read the report for its verb; a crop is not a cause |
| §1 | air belongs to the relationship; one number, one place; the shape of a spacing scale; `gap` for uniform, the owl for flow; the gap between groups two steps above the gap within; start with too much and remove |
| §2 | one grid on the container; subgrid; measure the ink, not the box |
| §3 | a thing is its own size; two things side by side are clearly equal or clearly different, never almost, which carries this page's own crop |
| §4 | the ladder of grouping, space before tint before shadow before border; similarity is a promise |
| §6 | the phone; a component asks its own box, never the window; a start row wraps as a cluster |
| §8 | read the computed value; `@layer` on line one; a custom property per instance |

§5 of that file, gluing, does not apply: a reading page has no joined surfaces.
What follows is what a page of text needs and a page of controls never did.

## 1. Whitespace

🔴 **WHITE SPACE IS AN ELEMENT WITH A SHAPE, NOT WHAT IS LEFT WHEN THE INK IS
PLACED.** Vignelli, *The Vignelli Canon*, the section titled White Space
(READ, the RIT PDF at
https://www.rit.edu/vignellicenter/sites/rit.edu.vignellicenter/files/documents/The%20Vignelli%20Canon.pdf):
*"I often say that in typography the white space is more important than the
black of the type."* and *"White space, non only separates the different parts
of the message but helps to position the message in the context of the page."*
Müller-Brockmann, *Grid Systems in Graphic Design*, p. 20 (READ, the text at
https://archive.org/stream/GridSystemsInGraphicDesignJosefMullerBrockmann/Grid%20systems%20in%20graphic%20design%20-%20Josef%20Muller-Brockmann_djvu.txt):
*"The new typography uses the background as an element of design which is on a
par with the other elements"*.
Ruder, *Typographie*, 1967 (READ as quoted at
https://www.artecontemporanea.com/product/16681/): *"The relationship between
the printed and the unprinted area must be one of tension, and this tension
comes about through contrasts."* Kenya Hara, *White* (READ as quoted at
https://www.thewonger.com/essays/white): *"Emptiness is this potential."* So a
gap is designed, named and sized the way a heading is.

⚠️ **MACRO AND MICRO ARE TWO BUDGETS, AND THIS PAGE SPENDS ONLY ONE.** Hochuli,
*Detail in Typography* (READ as quoted at
https://johndberry.com/2009/04/19/detail-in-typography/): macrotypography is
*"the size and position of the columns of type and the illustrations, with the
organization of the hierarchy of headings, subheadings and captions"*, and
detail typography is *"letters, letterspacing, words, wordspacing, lines and
linespacing, columns of text"*. Alexander White's names for the split, macro
and micro, active and passive, are MEMORY. The micro budget here is the face's
own. Hochuli again (READ,
https://type.today/en/journal/spaces): *"What applies to letterspaces also
applies to wordspaces: they too are a function of the counters of the
individual letters"*, and *"wordspaces may not be too large"*. Helvetica and
Arial ship theirs, so **no `letter-spacing` and no `word-spacing` anywhere on
this page**, which is Bringhurst 2.1.7, *"Don't letterspace the lower case
without a reason"* (READ, the rule titles at http://webtypography.net/toc/).

🔴 **THE MEASURE IS 45 TO 75 CHARACTERS A LINE, 66 IS THE IDEAL, AND IT IS SET
IN THE TYPE'S OWN UNIT.** Bringhurst 2.1.2, *"Choose a comfortable measure"*
(READ, http://webtypography.net/2.1.2): *"Anything from 45 to 75 characters is
widely regarded as satisfactory"*, the *"66-character line"* the ideal, and 40
to 50 for multiple columns. Tschichold, 1962 (READ as quoted at
https://artequalswork.com/posts/form-of-the-book/): *"The lines should contain
from eight to twelve words; more is a nuisance."* Butterick allows 45 to 90
(READ, https://practicaltypography.com/line-length.html) and says why longer
fails: *"As line length increases, your eye has to travel farther from the end
of one line to the beginning of the next."* WCAG 1.4.8 caps it at 80 (READ,
https://www.w3.org/WAI/WCAG21/Understanding/visual-presentation.html). eccm.ee
runs **142 characters a line at 1280** (MEASURED). Here `--eccm-measure` is
66 ch, `.prose` carries it, and the page asserts a summary at 45 to 75; in `ch`
so it holds whatever the reader does to the text size (Rutter, READ, same page).

🔴 **LEADING SUITS THE FACE, THE TEXT AND THE MEASURE, AND IT IS THE UNIT
EVERYTHING VERTICAL IS COUNTED IN.** Bringhurst 2.2.1 (READ,
http://webtypography.net/2.2.1): the leading is *"a basic rhythmical unit"*,
*"the distance from one baseline to the next"*. Butterick (READ,
https://practicaltypography.com/line-spacing.html): *"between 120% and 145% of
the point size"*, and *"fonts that run small will need less line spacing, and
vice versa"*. WCAG 1.4.12 requires that 1.5 times the size break nothing
(READ, https://www.w3.org/WAI/WCAG21/Understanding/text-spacing.html).
Tschichold (READ, artequalswork): *"Typesetting without leading is a torture for the
reader"* and *"Lines with more than twelve words require more leading"*.
Müller-Brockmann p. 34 (READ): *"Proper leading is one of the most important
factors in obtaining a harmonious and functional type area which is
aesthetically pleasing and will stand the test of time."* eccm.ee: **1.3 at
14.4 px** (MEASURED). Here `--eccm-lh-body` is 1.5, `--eccm-lh-meta` 1.4 for
the small lines and `--eccm-lh-head` 1.15, because a long measure wants more
and a large size wants less, which is the relationship all four state.

🔴 **VERTICAL SPACE IS ADDED AND REMOVED IN MULTIPLES OF THE LEADING.**
Bringhurst 2.2.2, *"Add and delete vertical space in measured intervals"*
(READ, http://webtypography.net/2.2.2): headings and other *"intrusions into
the text create syncopations and variations against the base rhythm of
regularly leaded lines"*. His sentence Rutter opens with (READ,
https://24ways.org/2006/compose-to-a-vertical-rhythm/): *"Space in typography
is like time in music. It is infinitely divisible, but a few proportional
intervals can be much more useful than a limitless choice of arbitrary
quantities."* Rutter's rule in that article: the space between paragraphs is
one line, and a heading of another size takes a line height and margins that
add up to whole lines. Butterick
(READ, https://practicaltypography.com/space-between-paragraphs.html and
https://practicaltypography.com/summary-of-key-rules.html): a space of 50 to
100 per cent of the body size *"will usually suffice"*, or a first-line indent,
and *"Don't use both."* Bringhurst 2.3.2 (READ, toc): after the first
paragraph, *"an indent of at least one en"*. Lupton asks for half a line, which
arrived as a search summary of *Thinking with Type* and is MEMORY.
⚠️ **THE LIST KEEPS A REM SCALE AND THE PROSE KEEPS THE LEADING.** The list's
rows are `--eccm-s-12` apart, 48 px, with `--eccm-s-2` and `--eccm-s-1` inside a
row: compose §1's scale of steps, three of them between groups, because a list
row is a group and not prose (and the owner asked for air). The event page's
prose is the owl, `.flow`, counted in `lh`: one line between paragraphs, two
above an `h2` and half a line after it, which is Rutter's rule and the
more-above-than-below of the next one. The first cut set 1 em there under a
comment claiming one leading, 18 px against a 27 px line; this file found it
and it is `1lh` since 2026-09-26. Whether the list should join the leading
grid is §6.

🔴 **THE GAP BETWEEN GROUPS IS VISIBLY LARGER THAN THE GAP WITHIN, AND THE
RATIO IS THE GROUPING. NOTHING ELSE IS.** Wertheimer's factor of proximity,
1923, taken through NN/g (READ,
https://www.nngroup.com/articles/gestalt-proximity/): *"Items close together
are likely to be perceived as part of the same group"* and *"Using varying
amounts of whitespace to either unite or separate elements is key to
communicating meaningful groupings."* Compose §1's house rule, two scale
steps: here 4 and 8 px inside a row against 48 px between rows, and the list
draws no line and paints no tint, which is compose §4's ladder stopping on its
first rung.
Butterick on which side of a heading the space goes (READ,
https://practicaltypography.com/space-above-and-below.html): *"headings relate
to the text that follows, not the text before. Thus you'll probably want the
space below to be smaller than the space above"*. A row's title is its first
line, so the space above it is the row gap and the space below it is one small
step, which is that rule with no extra declaration.

🔴 **MARGINS ARE PART OF THE PAGE, NOT AROUND IT, AND ON A SCROLLING PAGE THE
CANON REDUCES TO THE FRAME.** Tschichold, 1962 (READ, artequalswork):
*"Harmony between page size and the type area is achieved when both have the
same proportions"*, with *"Ideal margin proportions 2 : 3 : 4 : 6"* for inner,
top, outer and bottom on a 2 : 3 page. The Van de Graaf canon reaches the same
figures by construction, one ninth and two ninths of the page (READ,
https://en.wikipedia.org/wiki/Canons_of_page_construction). Bringhurst 1.2.5 (READ, the v3.0 PDF a search surfaced): *"Shape the page and
frame the textblock so that it honors and reveals every element, every
relationship between elements, and every logical nuance of the text."* His
sentence that *"The margins must lock the textblock to the page, lock facing
pages to each other, frame the textblock, and protect the textblock"* was
confirmed on a reader's notes (READ, https://mitchellkember.com/books/bringhurst);
which chapter 8 rule it sits under is MEMORY. Müller-Brockmann p. 39 (READ):
*"A well-proportioned margin can enhance the pleasure of reading enormously."*
Vignelli (READ, White Space): *"Tight margins establish a tension between text,
images and the edges of the page. Wider margins deflate the tension and bring
about a certain level of serenity to the page."* Butterick (READ,
https://practicaltypography.com/page-margins.html): *"web pages need big margins
too"*, sized from the measure. A scrolled page has no bottom, no facing page and no gutter, so what survives is
one decision: the frame is the window less two `--eccm-gutter`, capped at 72
rem, and the list inside it is capped at 60 rem and starts at the frame's
left. On a wide screen the air is on the right, a choice and not a remainder.

✅ **START WITH TOO MUCH AND REMOVE.** Refactoring UI (READ, the free chapter's
text at
https://archive.org/stream/RefactoringUIStartWithTooMuchWhiteSpace/Refactoring%20UI%20-%20Start%20with%20too%20much%20white%20space_djvu.txt):
*"It's a lot more obvious when you need to remove white space than it is when
you need to add it."* Compose §1 carries the whole passage. The owner's version,
2026-09-26: *"it sould be light, airy, good type stuff"*.

⚠️ **CLEARLY EQUAL OR CLEARLY DIFFERENT, NEVER ALMOST.** Compose §3 carries
this page's crop and the owner's words; one sentence belongs here: Bringhurst
3.1.1 asks for *"a modest set of distinct and related intervals"* (READ,
http://webtypography.net/3.1.1), the same rule about spacing as about type.

## 2. Type

🔴 **ONE FAMILY, AND IT IS THE FACE THE MACHINE HAS.** Instructed 2026-09-26:
*"use same font as eccm (thay they actyually serve, not roboto not prenent)"*.
eccm.ee declares Roboto and serves nothing, so it draws **Helvetica** on a Mac
and Arial on Windows (MEASURED through `CSS.getPlatformFontsForNode`). So the
body names Helvetica, then Arial, then the generic sans-serif, no file is
loaded, and the page asserts that `document.fonts` is empty. Vignelli (READ,
Typefaces, The Basic Ones): *"is not the type but what you do with it that
counts."* What it costs: Helvetica has no 600, so headings say 700; Arial has
never been looked at (§6).

🔴 **A SCALE OF FEW SIZES WITH LARGE CONTRAST BETWEEN THEM.** Bringhurst 3.1.1,
*"Don't compose without a scale"* (READ): *"limit yourself, at first, to a
modest set of distinct and related intervals"*. Vignelli (READ, Contrasting
Type Sizes): *"Our first rule is to stick to one or two type sizes at the
most"*, and (Type Size Relationships) *"We like to play off small type with
larger type - usually twice as big"*. Tim Brown (READ,
https://alistapart.com/article/more-meaningful-typography/): *"A modular scale,
like a musical scale, is a prearranged set of harmonious proportions"*, its
base chosen from the body text first. Butterick on headings (READ,
https://practicaltypography.com/headings.html): *"Limit yourself to three
levels of headings. Two is better."* The five tokens, `--eccm-t-s` through
`--eccm-t-2xl`, are one base and a 1.25 ratio with the top two fluid; the list
page uses four of them and no other size exists on it. An `h1` at
`--eccm-t-2xl` against a body at `--eccm-t-m` is Vignelli's twice; a title at
`--eccm-t-l` against the body is one step, clearly larger and never almost.

🔴 **BODY AT 18 PX, NOTHING UNDER 14, AND THE PAGE ASSERTS IT.** Butterick
(READ, https://practicaltypography.com/point-size.html): on the web the optimal
size is 15 to 25 pixels, because *"We typically read screens from further away
than we read printed material"*. eccm.ee: descriptions at **12 px**, calendar
days at **10 px** (MEASURED). `--eccm-t-s` is the floor, 14 px, for meta lines
and the footer, and the assert walks every text node.

🔴 **WEIGHT ONCE PER ROW AT MOST.** Instructed 2026-09-26: *"it sould be light,
airy, good type stuff"*. Vignelli (READ, Contrasting Type Sizes): *"Type
weights can be used to great advantage when dedicated to a specific function,
rather than be used for color purposes"*, and on raising size and weight to
make a message louder, *"That is exactly what I consider intellectual
vulgarity"*. Butterick (READ, summary): *"Use bold or italic as little as
possible, and not together."* In a row the title is the one bold line; the
date is ink at body weight, the meta line is `--eccm-ink-2` at `--eccm-t-s`,
and that is the whole hierarchy.

🔴 **NO UNDERLINE UNDER A BOLD TITLE.** Instructed 2026-09-26: *"this thin
underline under bold title is pathetic design"*. Butterick (READ,
https://practicaltypography.com/underlining.html): *"In a printed document,
don't underline. Ever. It's ugly and it makes text harder to read."*, a
typewriter's habit; and of web links, *"Are underlined links dead? Maybe not quite. Dying? For sure."* His
summary rule (READ): *"Never underline, except perhaps for web links."* So a
title link carries no line and gets one on hover and on focus, and every title
in the list is a link, so the cue is the list itself: similarity is a promise
(compose §4). A link inside prose keeps a line, thinner than the stroke and
offset below the baseline, in `--eccm-rule-strong`, and the page asserts both
halves.

🔴 **HIERARCHY IS SIZE AND SPACE, NEVER A RULE, A BOX, A TINT OR A COLOUR.**
Instructed 2026-09-26: *"have a critical look on whitespace, title type size,
unneccessary backgrounds"*. Butterick (READ, headings): *"The best way to
emphasize a heading is by putting space above and below, because it's both
subtle and effective."* Vignelli (READ): *"In a world where everybody screams,
silence is noticeable. White space provides the silence."* Lupton's version,
that each level is signalled by a cue that is *"spatial (indent, line spacing,
placement) or graphic (size, style, color)"*, arrived as a search summary of
*Thinking with Type* and is MEMORY. eccm.ee draws rows on a tint, a date box
over a photograph and six badge colours (MEASURED). Here a row paints nothing and nothing is drawn over a picture, asserted, and
the page's three rules separate sections, never rows (compose §4).

⚠️ **DATES ARE TEXT IN TABULAR FIGURES, ON ONE X.** Butterick (READ,
https://practicaltypography.com/alternate-figures.html): *"Tabular figures are
essential for one purpose: vertically aligned columns"*. eccm.ee sets the date
white in a box over the picture, **1.36 : 1 on the grey it falls back to**
(MEASURED). `.ev-when` sets `font-variant-numeric` to tabular so ten dates
down a list align. Helvetica and Arial carry lining figures only, so Bringhurst
3.2.1's text figures (READ, toc) are not a choice here.

⚠️ **SENTENCE CASE IN THE DATA, NO `text-transform`, AND CAPITALS ONLY IN THE
MARK.** Butterick (READ, summary): *"All caps are fine for less than one line
of text."* Bringhurst 2.1.6 (READ, toc): *"Letterspace all strings of capitals
and small caps, and all long strings of digits"*. Four of eccm.ee's ten titles
are typed in capitals and the longest runs **seven lines at 375** (MEASURED).

⚠️ **HEADINGS BALANCE, PROSE IS PRETTY, AND ESTONIAN HYPHENATES UNDER
`lang="et"` WITH A FLOOR.** Bringhurst 2.4.5 (READ, toc): *"Hyphenate according
to the conventions of the language"*. `text-wrap` balance on
headings and pretty on the body, `hyphens` on prose under the Estonian
language attribute only, and `overflow-wrap` anywhere on prose and on titles
as the floor, because `Gestuurid/situatsioonid:` has no break opportunity and
ran **52 px past the phone's column** (MEASURED). Ragged right throughout:
Bringhurst 2.1.3, *"Set ragged if ragged setting suits the text and page"*
(READ, toc), and WCAG 1.4.8, *"Text is not justified"* (READ).

⚠️ **COLOUR IS NEVER THE ONLY CUE, AND EVERY PAIR IS COMPUTED AGAINST WHITE.**
`--eccm-ink` on `--eccm-ground` is 17.40 : 1, `--eccm-ink-2` 7.46, the accent
5.74 as text; eccm.ee's hover orange is **1.97** (MEASURED). Hover changes an
underline's colour to `--eccm-accent` and never the text's; `:focus-visible`
is an outline in the accent, and nothing zeroes an outline.

## 3. Pictures beside text

🔴 **A PICTURE IS PLAIN. NOTHING IS DRAWN OVER IT AND NOTHING IS PAINTED UNDER
THE ROW.** Instructed 2026-09-26: *"i asked just to use event imaes, not
overlay anything"*. The page asserts no pseudo-element on a picture link, one
child in it, and a transparent ground on every row.

🔴 **DRAWN AT ITS OWN SIZE WHERE THE SOURCE ALLOWS, AND THE SIZE IS A TYPED
PIXEL BECAUSE IT IS AN OBJECT'S.** Instructed 2026-09-26, on a crop of a 146 px
picture beside 170 to 200 px of text: *"this really clearly shows that image
shouyld be bigger to avoid awkard a-bit-longer text. gestat 101,
just-a-bit-different sizes are nervous"*. eccm.ee's thumbnails are 300 on the
long side, so `--eccm-pic-w` is 300 px and eight of the ten draw at 1 : 1,
asserted within 5 per cent, and a typed pixel because it is an object's size
and not a relationship (compose §0's one test). The picture is the taller of the pair by a margin the eye cannot mistake
(compose §3), 200 px beside three or four lines of text.

🔴 **ONE SHAPE FOR EVERY PICTURE IN A LIST, AND THE ODD ONES ARE CROPPED, NEVER
STRETCHED, AND THE PAGE SAYS SO.** Ten boxes at 3 : 2 make ten titles start on
one x, which is the list's whole alignment (compose §2). Two sources are not
3 : 2, a 227 by 300 portrait and a 300 by 150 banner, and `object-fit` cover
enlarges each by about a third and crops it to the box; nothing is distorted,
the eight 3 : 2 pictures are not upscaled, and the assert names the two odd
shapes and their scale, 1.32 and 1.33, rather than hiding them. In the compact row the box is
a 6.5 rem square, so every picture is cropped to a square and none is
enlarged.

⚠️ **THE BOX IS RESERVED BEFORE THE PICTURE ARRIVES, AND NOTHING IS FETCHED
THAT THE PAGE DID NOT ASK FOR.** `width` and `height` on every `img` and an
`aspect-ratio` on the box, so nothing moves while somebody is looking (compose
§7); `loading` lazy below the fold; every picture served from this directory,
and the page asserts zero requests to any other origin.

⚠️ **THE PICTURE LINK IS SILENT AND THE TITLE LINK SPEAKS.** The picture's link
is `aria-hidden`, off the tab order, with an empty `alt`, because the title
beside it is the text, so one link per event reaches a keyboard.

## 4. The list and the page, in the tokens that exist

Every `--eccm-*` below is declared in `demo/eccm/eccm.css` today. The plan's
wide measure token for list rows was never built; do not name it.

- **The frame** is the window less two `--eccm-gutter` (1 rem on a phone,
  `--eccm-s-8` from 48 rem), capped at 72 rem, centred; the list inside it is
  capped at 60 rem and starts at the frame's left.
- **The head band** holds the mark at `--eccm-mark-w` (20 rem, 11 rem under
  40 rem) and the language switch at the other end, a row with exactly two
  ends on a surface that has a width (compose §6), aligned on the tagline's
  baseline because the mark's box is its ink and its bottom edge is that
  baseline (compose §2, measure the ink). The switch follows the menu's own
  rule: the current language is text with the ink line under it, the other a
  link with no line until hovered (instructed 2026-09-26: *"et en underlines
  do not match menu ones"*). `--eccm-s-6` above and below on a desk,
  `--eccm-s-4` on a phone.
- **The menu band** is ruled top and bottom in `--eccm-ink`, the mark's own ink
  (instructed 2026-09-26: *"use black on top menu borders to mach with
  logo"*), and the menu wraps as a cluster with `--eccm-s-6` between items and
  `--eccm-s-1` between lines; the current page is underlined in ink, and there
  is no hamburger.
- **`main`** has `--eccm-s-8` above and `--eccm-s-16` below (`--eccm-s-6`
  above on a phone); the `h1` at `--eccm-t-2xl` has `--eccm-s-8` under it.
- **A row** is two columns, `--eccm-pic-w` and the rest, `--eccm-s-6` apart,
  aligned at their tops. In the text column: the title at `--eccm-t-l` in 700,
  then `--eccm-s-2`, the date and time in tabular figures at body weight, then
  `--eccm-s-1`, the meta line at `--eccm-t-s` on `--eccm-lh-meta` in
  `--eccm-ink-2` with `--eccm-s-4` between its cells, then `--eccm-s-2`, one
  sentence of summary in `.prose` at `--eccm-measure`. Rows are `--eccm-s-12`
  apart and nothing else separates them.
- **The event page** is a crumb at `--eccm-t-s` in `--eccm-ink-2` with
  `--eccm-s-4` under it, the title and its one action as a row with exactly two
  ends, the facts as a two column list with the label in `--eccm-ink-2`,
  `--eccm-s-6` between the columns and `--eccm-s-2` between rows, no rule and
  no box, the picture at `--eccm-measure` with `--eccm-s-12` above and below
  and its shape reserved from its own pixels, a caption at `--eccm-t-s`, then
  the prose at the measure in `.flow`, and a credits list in the facts' shape.
- **The compact row** is the list's own decision, taken when `main` is under
  47 rem (a container query, compose §6): the picture a 6.5 rem square,
  `--eccm-s-4` to the text, the title at `--eccm-t-m`, rows `--eccm-s-6`
  apart. MEASURED at the harness's 756 px window: 40 characters beside a
  300 px picture, under the measure, which is where the threshold comes from.
- **The phone** is 375 by 812 at 3x (compose §0). The mark and the menu end
  under a quarter of 812 (MEASURED 238 px with the mark at 12 rem; asserted in
  the phone arrangement), where eccm.ee spends **325 px, 40 per cent**
  (MEASURED). No container types a pixel width; eccm.ee types **3,320** and
  drags every page **2,945 px sideways at 375** (MEASURED).
- **The footer** is ruled above in `--eccm-rule`, set at `--eccm-t-s` in
  `--eccm-ink-2`, with `--eccm-s-8` above and `--eccm-s-12` below.
- **Colour** is `--eccm-ink` on `--eccm-ground`; `--eccm-ink-2` for meta and
  the footer; `--eccm-rule` for the three rules; `--eccm-rule-strong` under a
  prose link; `--eccm-accent` for a hovered underline and a focus ring and for
  nothing else.

## 5. What was measured and which rule answers it

Every number is from `plans/plan-eccm-design.md` §B, taken off eccm.ee on
2026-09-26 at 1280 by 900 and 375 by 812, unless it says the first cut, which
is the demo as it was before the day's corrections.

| MEASURED | the rule |
| --- | --- |
| 142 characters a line at 1280, 124 in the descriptions | §1 the measure, `--eccm-measure` 66 ch, asserted 45 to 75 |
| descriptions 12 px, calendar days 10 px | §2 nothing under 14, `--eccm-t-s` the floor, asserted |
| line height 1.3 at 14.4 px | §1 leading, `--eccm-lh-body` 1.5 |
| seven spacing values, 5, 8, 9.09, 10, 14.4, 16, 28.8 px, no scale | §1 and compose §1, the nine `--eccm-s-*` steps and no other number |
| 9.09 px between rows, each on a 5 per cent tint | §1 groups, `--eccm-s-12` between rows and no ground, asserted |
| date in white over the photograph, 1.36 : 1 on the fallback grey | §2 dates as text in tabular figures; §3 nothing over a picture |
| Roboto declared, zero text fonts served, Helvetica drawn | §2 one family, the machine's, `document.fonts` empty, asserted |
| four of ten titles in capitals, seven lines at 375 | §2 sentence case in the data |
| header 340 px at 1280, 325 px of 812 on a phone | §4 the phone, under a quarter, asserted |
| a typed 3,320 px width, 2,945 px of sideways overflow at 375 | §4 no pixel width on a container, zero overflow asserted |
| hover orange 1.97 : 1 | §2 colour, every pair computed, the accent 5.74 |
| the first cut: a 146 px picture beside 170 to 200 px of text | §3 and compose §3, `--eccm-pic-w` 300 |
| the first cut: a 1 px underline under a 700 title | §2 no underline under a bold title, asserted |
| the first cut: a title 52 px past the phone's column | §2 `overflow-wrap` on titles |

## 6. What the sources disagree on or leave open, and what settles each

| open | the disagreement | what settles it |
| --- | --- | --- |
| the measure's ceiling | Bringhurst 75, WCAG 80, Butterick 90, all READ | nothing external; the page asserts the strictest, and a wider column is a decision to write down |
| the space between paragraphs | Butterick 50 to 100 per cent of the size; Rutter one full line; Lupton half a line (MEMORY); WCAG 1.4.12 requires 2 times the size to break nothing | settled for now on Rutter, `1lh` on disk since 2026-09-26, and the event page looked at both widths; Butterick's tighter space is the alternative if the prose reads loose |
| a rem scale or a leading grid | the sources count vertical space in lines; compose §1 counts it in scale steps; the list's rows are 48 px and the event page's picture margins 48 px, on a 27 px leading, and its prose is in `lh` | look at the event page; if headings, picture and paragraphs fight, set the vertical steps in `lh` and keep the rem steps for the inline axis |
| underlined links in prose | Butterick calls them dying; ask 5 removed them from titles only | the owner, per page; the title rule is settled and the prose rule is a default |
| the two odd-shaped pictures | cropped to 3 : 2 today, the assert naming them | ask whether a ragged list at each picture's own shape is preferred to ten boxes alike |
| Arial | the page has only ever been drawn in Helvetica on this desk | one render on Windows Chrome and Edge at 375 and 1280 |
| Estonian hyphenation | dictionaries differ by engine and platform (plan §H) | a 20 line test page with a long Estonian paragraph in each engine |
| Bringhurst chapter 8 | the v3.0 PDF fetched today has text for the contents and chapter 1 only; the chapter 8 rule numbers in circulation are MEMORY; 1.2.5 was read | the book, pp. 143 to 178 |
| "let the space do the work" | attributed to Butterick in the brief for this file; not found on practicaltypography.com today; not quoted here as his | a page of his that says it, or drop the attribution |
| Alexander White and Lupton | two sentences of each arrived as search summaries and were not read on a page; marked MEMORY above | the books, or a page that quotes them |
| Wertheimer 1923 | the original text reset three times; proximity and similarity are taken through NN/g and Wikipedia | https://psychclassics.yorku.ca/Wertheimer/Forms/forms.htm on a day it answers |
| a text face echoing the mark's condensed capitals | the mark is a condensed grotesque; the page is Helvetica by instruction; Vignelli says the type is not what counts | the designer's answer on the tagline face (plan §H), and the owner |

⚠️ **THIS FILE GOES STALE THE WAY EVERY STANDING FILE HERE DOES.** The tokens in
§4 are a copy of `eccm.css` and the numbers in §5 are a copy of the plan; both
are one `grep` and one `diff` from being checked, and a rule an agent is going
to build on is worth that command first (CLAUDE.md).
