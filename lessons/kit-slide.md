# Kit lessons: slide.mjs, slide-test.mjs

The long comments cut from `demo/shell/slide.mjs` and `demo/shell/slide-test.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-slide.md#<anchor>`.

<a id="header"></a>

## slide.mjs, file header, spec keys and marks

demo/shell/slide.mjs, ONE SLIDE, drawn from plain data, and a small player.

🔴 A SLIDE IS A KIT COMPONENT NOW, AND `/slides/` IS AN ARCHIVE. Asked
2026-10-05: *"keep slides as it was for an archive with font picker and
sample content etc let it be then let's focus on the kit make a new tab
there slides and methodically slide by slide"*. The engine in
`demo/slides/deck.mjs` stays where it is and nothing imports it from here;
what moved is the IDEA, rebuilt as one component that renders one slide and
knows nothing about a talk. plans/plan-slides.md section 13 has the record.

WHAT IT DRAWS. A 16:9 box sized off its container with container units, the
six step type scale (size, line height and tracking per step, declared ONCE
in `SCALE` below and written into the stylesheet as custom properties by
`scaleCss()`), and the parts a slide is made of:

  say        the headline, step 4 (3 in a split), top left, one sentence, no full stop
  sayStep    the headline a step or two down for a whole talk of them, 2026-10-07
             (*"iside slides use lesser text size"*, the positron deck)
  statement  the sentence is the slide, step 5, up to three lines
  big        one figure, step 6, with `under` at step 3 beneath it
  text       a paragraph, step 3 (or `textStep`)
  list       up to three lines, dimmed
  stack      [label, value, unit] rows, decimal points in one column
  rows       { head, body, align, frame }, a table padded into character
             columns; `frame` 'none' rules a line between rows across
             the full width, absent is plain lines
  lines      [[step, text], ...], each line at its own step, for specimens
  cap        the caption, step 1, bottom left, always
  mark       true puts the β+ at the foot of a title slide (2026-10-07)
  title      THE OPENING OF A TALK, step 5, with `by` at step 3 and `date`
             and `place` at step 2 under it, on the bottom edge (see
             TITLE_STEPS); a title slide carries nothing else
  slot       any element: a kit component, a picture, a diagram
  layout     'stack' (default), 'top', 'left', 'split', 'band' (no 'right',
             removed 2026-10-05: *"no right align needed"*). `band` is
             two rows, 2:1: the slot or the big figure centred in a darker
             well across the top two thirds, the words under it on the
             slide's own ground (2026-10-06: *"its better to use vertical
             sections here. top 2/3 is darker ... below in lighter area
             title an desc"*)
  side       for 'split', which side the slot is on: 'left' or 'right'
  cols       for 'split', the words column to the slot's: '1:1' (default)
             or '1:2', the words a third of the slide and the slot two
             thirds, the divide at exactly one third from the words' edge
             (2026-10-06, the synths deck: *"use 1:2 cols layout"*)
  bottom     for 'split', true sets the headline and the words together on
             the foot of their column (the same day: *"align text to
             bottom of slide"*)

Marks in any string: `*x*` paints x in `--hi`, `[x|tech]` paints x in the
hue `diagram.mjs` gives that technology (`[Cloudflare|cloudflare]`), at the
strength the diagram names a box in, so a word and a box can be joined by
colour. `` `x` `` is a name out of a program (`volume`, `process`), set in
the slide's monospace face inside sans text, 2026-10-06 (*"var name is in
monospace inside text"*). It is uncoloured until `hueVars(root, hueOf)`
gives it the hue `hueOf` answers for that name, which is how a slide's
words take the colour its knobs and its code box already wear (*"in the
text use variable name with colorcoding"*): one book, never a picked colour.

🔴 A SLIDE SET IS PLAIN DATA. Every key above is a string, a number or an
array of them, except `slot`, which may be a function `(host) => ctl` or a
plain `{ kind, ...options }` resolved through a `slots` map the caller
passes (`createSlide(spec, { slots })`). So a talk can be a JSON file of
specs plus one map from kind to builder, and the same specs render as static
slides or inside `createSlidePlayer`. What is missing for a set page is
written in plans/plan-slides.md section 13.

THE FACE IS JETBRAINS MONO, self-hosted under `shell/vendor/`, the same
files the site's `--mono` reads since 2026-10-12. One face, no picker; the
archive's picker went the same day.

🔴 KEYS BELONG TO THE PLAYER'S OWN PANEL, NEVER TO `window`. `/kit/` has
transport bars, a keyboard with a letter row and step grids, all of which
take arrows or space, and `deck.mjs` listened on `document`. The player
listens on its panel's root, which takes focus, and a key it handles is
stopped there so it never reaches a bar's `window` listener as well.

px COMPONENTS ON A SLIDE. A control sized in px is either laid out at a
fixed logical width and scaled into its slot (`fitBox`, the way a projector
scales a picture; pointer maths survives it because every kit control reads
its own `getBoundingClientRect`, which is the transformed box), or given a
size in the slide's own container units where the component already reads
its size from CSS (a wave view's `--wave-h`, a video panel's width).

<a id="scale"></a>

## slide.mjs, SCALE

── the scale, declared once ────────────────────────────────────────────────
🔴 ONE BASE, ONE RATIO, SIX STEPS, the scale `plans/plan-slides.md` section 3
settled and measured on `/slides/`. Size is a share of the slide's HEIGHT in
per cent (so `cqh`), line height is unitless and OPENS as the size drops, and
tracking is in em and CLOSES as the size grows. Every other number about type
in this file and in `slide.css` is derived from these.
 step 1  caption, box words under a diagram
 step 2  evidence with four rows
 step 3  evidence, a paragraph, a list
 step 4  the headline
 step 5  a statement
 step 6  one figure

<a id="tracking"></a>

## slide.mjs, SCALE tracking

⚠️ THE TRACKING CLOSED FURTHER ON THE LARGE STEPS, 2026-10-05, asked as
*"biit more negat tracking on large sizes"*: it was 0, -0.005, -0.01, -0.02,
-0.03 and -0.04 em, and it is the values above. Step 1 stays at 0, because
it is read as words; a mono face at display size reads loose without it.

<a id="lint-words"></a>

## slide.mjs, lintWords

🔴 WHAT A HEADLINE MAY NOT CARRY, from plans/plan-slides.md section 2: one
sentence, so no colon, semicolon, dash or middot buying a second clause, and
no full stop at the end. Returns the problems, empty when there are none.
A REPORT, not a throw, because the kit grades it and a page author should
see every problem at once rather than the first.

<a id="words-step"></a>

## slide.mjs, wordsStep

🔴 IN A SPLIT THE WORDS GO ONE STEP DOWN, AND IT IS A RULE IN CODE, NOT A
CHOICE PER SLIDE. Half a slide is 41 per cent of its width, which is 72.9
per cent of its height, and a mono advance is 0.6 em: step 4 holds 9
characters a line there, so `Latency is read off a burned clock` took four
lines and pushed its caption off the slide (MEASURED by the kit's spill
assert, four splits red). Step 3 holds 13 and step 2 holds 20. A `big`
figure and declared `lines` keep their step, because they name it.

<a id="frames"></a>

## slide.mjs, FRAMES

🔴 A TABLE'S FRAME, CHOSEN PER SLIDE. Asked 2026-10-05: *"i do not see
tables layout. horiz lines but try with rounded corner outer border and
not"*. Absent, a table is plain padded lines. `none` draws a 1 px `--line`
rule between rows (the header's included) and nothing outside them, across
the full width of the evidence. No vertical lines: a column is a character
position, and a rule between columns would say twice what the alignment
already says. ⚠️ `box`, a rounded outer edge, was removed the same evening:
*"tables full w. no roundex box"*.

<a id="title-steps"></a>

## slide.mjs, TITLE_STEPS

🔴 THE TITLE SLIDE'S STEPS, CHOSEN ONCE AND NOT PER TALK. Asked 2026-10-05
from the slides list as *"so slide title"*: the opening of a talk, its name,
who speaks and when.
 title  step 5, the statement step. A talk's name is one sentence read from
        the back of the room, and step 5 holds 13 characters a line (a mono
        advance is 0.6 em, 20.25 cqh of a 177.8 cqh wide slide less its
        inset), so a name of up to about 26 characters is two balanced
        lines. Step 6 is spent on one figure and holds 8 a line, which
        breaks any title into a column of words.
 by     step 3, the evidence step: read second, and still read at a glance.
 date and place  step 2, dimmed, the quietest words a talk opens with and
        the last thing anybody looks for.
The title sits top left where every headline sits; who and when sit on the
bottom edge, the `top` layout's own arrangement, so the air between them is
the slide's and no number places either.

<a id="tap-zone"></a>

## slide.mjs, tapZone

🔴 WHERE A TAP STEPS A PLAYER, from the x of the tap across the slide's
width: the left third is back (-1), the right third is forward (1), the
middle third is nothing (0), so a stray tap on a phone does not turn a page
and the middle stays free for the panel's own way out.

<a id="swipe"></a>

## slide.mjs, swipe and OWN_TAPS

A SWIPE STEPS A SLIDE, asked 2026-10-06 as *"add keyboard control to slides
in fullscreen and mobile support"*. A finger moved left goes forward and
moved right goes back, the way every phone turns a page, at any size and in
or out of full screen. It must travel `SWIPE_PX` and be clearly sideways
(`SWIPE_RATIO` times further across than down), so a vertical scroll of the
page past a deck never turns a slide. Returns -1, 0 or 1.
What on a slide is its own to press: a tap or a swipe that lands on one of
these is never a page turn.

<a id="fit-h"></a>

## slide.mjs, fitBox, h

`h`, a logical height to scale by when it is taller than the content, so
several boxes of different heights come out at ONE scale (2026-10-06,
*"2 and 3 use same size of fau"*): the shorter one is centred, not grown

<a id="fit-fill"></a>

## slide.mjs, fitBox, fill

`fill`: the box takes the slot's whole width at that scale (never less
than `w`), so what is around it is the slot's own inset on every side
and not a wide gap left and right (2026-10-06, *"make padding same from
top and left and right and bottom"*); its content reflows to the width

<a id="slide-diagram"></a>

## slide.mjs, slideDiagram

A diagram on a slide: BOX NAMES ONLY, and what each top level box is goes
under its column as slide text at step 1. The archive's rule, asked
2026-10-05: *"do not use diagram native descs below but use slides text and
postion"*. Every `sub` and link `label` is taken out before the diagram sees
the spec, and a top level node's `desc` is set under that box.
⚠️ 580 LOGICAL px, NOT 640, since the edges went thick (`slide.css` has the
arithmetic): the narrowest width that keeps a row of columns, so the box
padding and gaps come out larger against a name drawn one size down.
Returns a slot builder.

<a id="create-slide"></a>

## slide.mjs, createSlide

ONE SLIDE.

@param spec       see the top of this file
@param o.host     where to put it; omitted, the caller appends `el`
@param o.slots    { kind: (host, options) => ctl } for a `slot: { kind }`
@param o.full     a ⛶ on the slide that fills the screen with it
@returns { el, frame, spec, parts, ctl, start, stop, fullBtn, full(want), isFull() }

🔴 `full: true`, asked 2026-10-05 as *"add go to fullscreen button (active
when mouseover) on all kit slide samples"*. The ⛶ is the video panel's
(the same glyph, `ico` look and ink centring), shown while a pointer is on
the slide or the slide holds focus, and always on a screen with no hover,
where it is also the way back out. The FRAME goes full through
`fullscreen.mjs` (the real API, else the `position: fixed` cover), so the
slide inside it stays a size container and every step keeps its share of the
slide's height. Escape leaves on both paths: the real API takes it itself and
`watch` handles the cover. Then *"fill full bg but keep border"*: the whole
screen takes the slide's ground and the 16:9 box keeps its edge and corner.
 `frame` is the inline size container the slide is sized off; `el` is the
 slide. `ctl` is whatever the slot builder returned (its `start` and `stop`
 are called by `start()` and `stop()`, and by the player on show and hide).

<a id="cols-attr"></a>

## slide.mjs, createSlide, cols

⚠️ 1:1 WRITES NO ATTRIBUTE, so every split before this option is untouched

<a id="mark"></a>

## slide.mjs, createSlide, the mark

🔴 THE β+ AS CONTENT OF THE OPENING SLIDE, 2026-10-07, asked as *"put logo
to bottom left, respect slide paddings, make it bigger. onluy on
frontpage of slides! its like content"*. Last in the bottom block, so it
stands on the slide's own inset under who and when, at step 4 with the +
raised as on the logo. It was a corner glyph on every slide for an hour.

<a id="slide-log"></a>

## slide.mjs, createSlideLog

A LIVE TABULAR LOG for a slot: a header row and rows under it, padded into
character columns like a `rows` table and ruled like a `frame: 'none'` one.
Asked 2026-10-05: *"show 2col layout with live logs / live tabular logs"*.

🔴 A FIXED BOX, AND THE NEWEST ROW AT THE BOTTOM. The log takes the height
its slot gives it and never its content's, so nothing on the slide moves
while it fills (positron-ui: a live surface is a fixed box). A new row is
appended at the foot and the body is scrolled to it, so the oldest rows
leave the top; past `cap` rows the oldest are removed from the document too.
🔴 THE WIDTHS ARE DECLARED, NOT MEASURED, because a live log's widest value
has not arrived yet: a column sized to the rows so far would widen when a
longer one came and every column right of it would jump.

@param o.head    the column names, the header row
@param o.widths  characters per column; a column is never narrower than its name
@param o.align   'r' or 'l' per column, numbers right so their decimals line up
@param o.step    the type step, 1 or 2 (a slot is half a slide)
@param o.cap     rows kept in the document
@returns { el, add(cells), count(), rows(), clear() }

<a id="player"></a>

## slide.mjs, createSlidePlayer

A PLAYER: slides inside a `createVideoPanel`, previous and next in its left
slot, the count in the middle, the panel's own ⛶ on the right.

🔴 THE KEYS ARE THE PANEL'S. The panel root takes focus (a press anywhere on
it gives it), and keydown is heard on that root only: Right, Down, PageDown
and Space for next, Left, Up and PageUp for previous (a Logitech clicker
sends PageUp and PageDown), Home and End, `f` and F5 for full screen, Escape
to leave it. A key it uses is stopped there, so a transport bar's `window`
listener and a keyboard's letter row never hear it. A key aimed at a field,
a slider lane or a knob inside a slide is left to that control.

🔴 IN FULL SCREEN ON A PHONE A TAP STEPS IT, asked 2026-10-05 from the
slides list as item 11, *"touch: stepping a player in full screen on a
phone"*. Full screen hides the footer (`fullMode: 'hover'`) and a phone has
no keys, so there was no way to the next slide at all. A tap on the left
third goes back and on the right third goes forward (`tapZone`); the middle
does nothing. Chosen over keeping the footer in full screen (`'footer'`),
because the footer is a 54 px row taken out of a phone's landscape height,
which is already the short side of a 16:9 slide, and because the edges of
the screen are where every reader on a phone already turns a page. A tap on
a control inside a slide (a knob, a button, a link) is the control's.
⚠️ ONLY ON A SCREEN WITH NO HOVER AND ONLY WHILE FULL. On a desk the slide is
pressed to give the panel its keys and a press there must not turn a page.

@param specs        the slides, plain data
@param o.slots      as for `createSlide`
@param o.onStep     (index) after every move
@param o.title      { text, href }: a link in the count's slot instead of `N / M`
@param o.touch      () => true when this is a screen with no hover; the
                   default asks `(hover: none)`, and `touchMode(fn)` swaps it
@returns { el, panel, slides, go, at, count, next, prev, keys, taps, touchMode }

<a id="title-link"></a>

## slide.mjs, createSlidePlayer, title

🔴 THE TITLE TAKES THE COUNT'S SLOT, asked 2026-10-06: *"title is on footer
on 1/2 w it replaces page count and becomes link to slides/(slug) page"*, the
slug written in brackets here because a slash and a star open a comment.
A half width player on the front page names its deck where the `N / M`
would be, as a link to the deck's own page, which keeps the count. An `<a>`
so Enter and a click navigate; the player's keys leave Enter and space on a
link alone and still take the arrows (see `onKey`).

<a id="full-keys"></a>

## slide.mjs, createSlidePlayer, full screen keys

🔴 IN FULL SCREEN THE KEYS ARE THE WHOLE DOCUMENT'S, asked 2026-10-06 as
*"add keyboard control to slides in fullscreen"*. Entering full screen
hides the footer, and with it the ⛶ that was just pressed and held the
focus, so the focus fell back to the body and no arrow reached the panel.
So while this player fills the screen, a key heard anywhere in the
document is this player's (one player can be full at a time), and the
panel takes the focus as it goes full, so its own listener hears it first.

<a id="test-header"></a>

## slide-test.mjs, file header

demo/shell/slide-test.mjs, the slide component graded with no browser.

  node demo/shell/slide-test.mjs

What is pure in `slide.mjs` is graded here: the scale and the custom
properties written from it, a step's caption, the headline rule, the marks,
the padded table, the spec checker, and two claims about the source (the
player's keys are not window-wide, the face files exist and ship).

🔴 NEGATIVE CONTROLS, per positron-verify's convention for this directory:
22 of the checks below, named NEGATIVE, are written so that the bug they name fails them
(a scale that is too flat, a headline with each banned mark, a full stop
inside a number that must NOT be flagged, a hue typo, a bad layout, a split
with no side, the key detector pointed at a file known to listen on
`document`, a table frame nobody declared, a cell wider than its column, a
title slide carrying a headline, a speaker with no title, a date that is not
a day, and a tap in the middle or on a box with no width), because a checker that passes everything and one that refuses
everything both look green against valid input alone.

NOT GRADED HERE, and graded on `/kit/`'s SLIDES tab instead: anything that
needs a document. `createSlide`, `createSlidePlayer`, `createSlideLog`,
`fitBox` and `slideDiagram` are never called; the computed size, line height and
tracking of every step, the 16:9 box, the caption corner, the split sides,
spills, the components responding at slide scale and the player's keys are
all measured there.

<a id="test-split"></a>

## slide-test.mjs, a split's columns

a split's columns and where its words sit, 2026-10-06 (*"use 1:2 cols layout"*, *"align text to bottom of slide"*)

<a id="test-full-only"></a>

## slide-test.mjs, `FULL_ONLY`

⚠️ ONE DOCUMENT LISTENER IS ALLOWED SINCE 2026-10-06, AND ONLY IN FULL
SCREEN (*"add keyboard control to slides in fullscreen"*): entering full
screen hides the focused ⛶, so the focus falls to the body. It must open by
returning unless this player is full, which is when nothing else on the page
is on screen to want the keys.
