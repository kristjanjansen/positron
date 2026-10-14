# demo/shell/slide.css: the comments that left the stylesheet

Every comment below was cut from `demo/shell/slide.css` on 2026-10-14 and is kept here verbatim. The stylesheet keeps a short version where one was worth keeping, and a pointer `/* why: lessons/css-slide.md#<anchor> */` to the section below. Line numbers are from before the cut.

<a id="file-header"></a>

### slide.css `file header` (line 1)

````css
/* demo/shell/slide.css, the stylesheet of `slide.mjs`.

   🔴 A FILE OF ITS OWN AND NOT A BLOCK IN `shell.css`, AND A PAGE LINKS IT.
   `shell.css` is read by every page on the site and a slide is drawn by one
   (`/kit/`); two `@font-face` rules and forty slide rules there would be parsed
   by forty-five pages that never draw one. A component stylesheet beside its
   module is what `wave-view.mjs` does with an injected block, and this is too
   long to live in a string. `slide.mjs` adds the link itself when a page forgot
   it, so forgetting costs one late stylesheet and never an unstyled slide.

   THE SCALE IS NOT HERE. Its six steps (size, line height, tracking) are
   declared once, in `SCALE` in `slide.mjs`, and written onto `.sl` as custom
   properties by `scaleCss()`. Every rule below reads them. */
````

<a id="font-face-2"></a>

### slide.css `@font-face` (line 22)

````css
/* THE GREEK SUBSET AT 600, for the β of the logo (`/kit/logo/`), which the
   Latin file does not hold. Same package, same licence; its `unicode-range`
   is @fontsource's own, so the browser asks for it only when a Greek letter is
   laid out, and a page with none never fetches it. Declared AFTER the Latin
   face, because faces of one family are tried last declared first. */
````

<a id="sl-frame"></a>

### slide.css `.sl-frame` (line 31)

````css
/* ONE SLIDE, 16:9, SIZED OFF ITS CONTAINER. The frame is an inline size
   container, so the slide is as wide as whatever holds it and nine sixteenths
   as tall, and the slide is a SIZE container, so every step in `cqh` is a
   share of this slide's height and of nothing else: a slide in a kit column,
   on a phone and filling a projector is one slide at three scales. */
````

<a id="sl"></a>

### slide.css `.sl` (line 46)

````css
/* 🔴 THE SLIDE'S ONE UNIT, a hundredth of the height of a 16:9 slide this
     wide. On a 16:9 slide that is `1cqh`, which is what every step, inset and
     rule was written in. A slide that is TALLER than 16:9 (a narrow player,
     below) pins it to the width instead, so the type stays the size it is on a
     16:9 slide and the extra height goes to the slot. Substituted where it is
     used, so `cqh` resolves against the slide there. */
````

<a id="sl-player-pos-vp-stage"></a>

### slide.css `.sl-player .pos-vp-stage` (line 56)

````css
/* IN A PLAYER the panel's stage is the size container and the slide fills it,
   letterboxed: in the page the stage is 16:9 already, and full screen on a
   screen of another shape centres a 16:9 slide rather than stretching the type
   to the screen's shape. The stage draws the edge, so the slide gives up its
   own. (0,2,0) against `.sl` at (0,1,0). */
````

<a id="sl-player-data-full-pos-vp-stage"></a>

### slide.css `.sl-player[data-full] .pos-vp-stage` (line 69)

````css
/* 🔴 FULL SCREEN FILLS THE SCREEN WITH THE SLIDE'S GROUND AND KEEPS ITS EDGE.
   Asked 2026-10-05 with a 16:10 laptop full of black bands: *"fill full bg but
   keep border"*. The panel's own full stage is `#000` (0,2,0); a slide's is
   its card, and a split's darker half runs on to the screen edge on its side.
   The slide is centred, so its middle is the screen's middle and a hard stop at
   50 per cent meets the half inside the slide exactly. */
````

<a id="sl-player-focus"></a>

### slide.css `.sl-player:focus` (line 83)

````css
/* 🔴 THE SCREEN'S EDGE IS THE BORDER. Asked 2026-10-05, after a version that
   drew the slide's edge inset from the screen: *"what is this???? just all bg
   is slide bg and border is screens border"*. In full screen the slide's
   ground fills the screen and no edge is drawn; the 16:9 box only keeps the
   type and the caption where they are on every slide. */
````

<a id="sl-frame-pos-full"></a>

### slide.css `.sl-frame.pos-full` (line 91)

````css
/* ONE SLIDE FILLING THE SCREEN, `createSlide(spec, { full: true })`. The
   frame is what goes full, by the real API or the cover in `fullscreen.mjs`,
   both of which set `.pos-full`; a class, never `:fullscreen` (shell.css says
   why). It becomes a SIZE container so the slide letterboxes 16:9 in it and
   every step stays a share of the slide, not of the screen; the ground behind
   is the slide's own, and the slide keeps its edge. (0,2,0). */
````

<a id="sl-sl-full"></a>

### slide.css `.sl .sl-full` (line 110)

````css
/* THE ⛶, the video panel's square (`.pos-vp button.ico`), bottom right where
   the panel keeps its own. Hidden until a pointer is on the slide or the slide
   holds focus, and unpressable while hidden, so the corner of a slide is never
   a control nobody can see. On a screen with no hover it is always there,
   because a phone has no other way back out.
   🔴 AND ON A SCREEN WITH NO HOVER IT IS TOP RIGHT, asked 2026-10-05 from the
   slides list as item 11, *"the ⛶ sitting over long captions on a phone"*.
   Always visible there, bottom right, it sat on the caption's line, and on a
   phone's slide a caption is long enough to reach the corner. The top right
   is where a headline is shortest: it is balanced and starts on the left. */
````

<a id="sl-in"></a>

### slide.css `.sl-in` (line 133)

````css
/* THE INSET IS ON A BOX INSIDE THE SLIDE AND NEVER ON THE SLIDE, because a
   container's query units measure its CONTENT box. MEASURED on the archive:
   with the padding on the slide, a 9 per cent step came out at 7.7. */
````

<a id="sl-in-2"></a>

### slide.css `.sl-in` (line 139)

````css
/* ONE INSET, THE SAME ON ALL FOUR SIDES. Asked 2026-10-05 with a crop of a
     split's words column, more air at the sides than at the top: *"same w and
     h padding"*. It was 7 per cent of the height against 6 per cent of the
     width, which at 16:9 is 10.7 per cent of the height. One number in cqh
     now, and a split's gap is twice it, so the words stand the same distance
     off the divide as off the edges. */
````

<a id="sl-hue"></a>

### slide.css `.sl-hue` (line 165)

````css
/* A HUE JOINS A WORD TO A BOX. The diagram names a box in
   `tint(hue, TEXT_TINT, 'var(--fg)')`, 62 per cent into the ink; this is the
   same formula, so `Cloudflare` on a slide is the colour of the Cloudflare
   box. The hue is a custom property per span. */
````

<a id="sl-var"></a>

### slide.css `.sl-var` (line 170)

````css
/* A NAME OUT OF A PROGRAM, `` `volume` `` in a slide's words, 2026-10-06:
   *"var name is in monospace inside text"*. The slide's own mono face at the
   size, weight and ink of the words around it (a `<code>` would otherwise
   take the UA's smaller monospace size). Coloured only when `hueVars()` gave
   it a knob's hue, by the code box's own formula for that name
   (`.pos-tk-pvar[data-hue]` in shell.css), so the word, the code and the knob
   read one hue. */
````

<a id="sl-sl-text-sl-sl-cap-sl-sl-list-sl-sl-under"></a>

### slide.css `.sl .sl-text, .sl .sl-cap, .sl .sl-list, .sl .sl-under` (line 200)

````css
/* BODY TEXT IN THE SANS, 2026-10-06, *"use sans-serif for slide body text"*:
   a sentence is read, so it is set in the page's reading face; headlines,
   lines, numbers, tables and code keep the slide face. */
````

<a id="sl-sl-text-sl-sl-cap-sl-sl-list-sl-sl-under-2"></a>

### slide.css `.sl .sl-text, .sl .sl-cap, .sl .sl-list, .sl .sl-under` (line 203)

````css
/* AND EVERY OTHER LINE OF BODY, the same day, asked again on /kit/slides/ as
   *"Use sans for slides body"*: a caption, a list and the line under a big
   figure are read the same way a sentence is. A name in backticks inside any
   of them stays in the slide face (`.sl-var`). */
````

<a id="sl-data-layout-stack-sl-ev-has-sl-list-sl-text"></a>

### slide.css `.sl[data-layout="stack"] .sl-ev:has(> .sl-list, > .sl-text)` (line 208)

````css
/* WORDS UNDER A HEADLINE START WHERE THE HEADLINE STARTS. Asked 2026-10-05,
   twice: *"HEADLINE OVER TEXT align texts to left"*, then on the marks slide
   *"align left the same"*. A sentence or a list is read, so it goes on the
   headline's left edge; a number, a stack, a table or a picture is looked at
   and stays centred. */
````

<a id="sl-rows"></a>

### slide.css `.sl-rows` (line 225)

````css
/* MONO DOING WHAT ONLY MONO CAN: a table of lines padded with spaces, so a
   column is a character position. */
````

<a id="sl-2"></a>

### slide.css `.sl` (line 228)

````css
/* 🔴 ROW LINES, `rows.frame` 'none' or 'box'. A 1 px `--line` rule between
   rows and under the header, never between columns. The air inside a row is
   from the table's own step, in em: 0.3 above and below so a rule never
   touches a glyph, and 0.6 either side, which is one character of this face,
   so the padding sits on the same grid the columns do. Every row carries the
   same inset, so the character columns line up exactly as in a plain table.
   `box` adds the site's own edge and corner, read from the tokens. */
````

<a id="sl-3"></a>

### slide.css `.sl` (line 235)

````css
/* 🔴 ONE RULE WIDTH ON A SLIDE, A SHARE OF ITS HEIGHT, SO IT SCALES WITH THE
   SLIDE IN FULL SCREEN. Asked 2026-10-05: *"thicker table lines, same as
   other lines. when on fullsc scale all borders proportionally"*. The diagram's
   1.5 logical px edge prints at about 1.5 px on the kit's 386 px slide, so 0.4
   per cent of the slide's height is the same line; never under 1 px. */
````

<a id="sl-4"></a>

### slide.css `.sl` (line 241)

````css
/* SUBTLER, asked 2026-10-05 on the tabular log: *"subtler gradiend undert
     hable header and trans to bg color"*. It was a full fade over two lines,
     which read as a dark band under the header. One line now, from a third
     strength to full, so the top row is dimmed into the ground rather than
     dissolved. */
````

<a id="sl-log-body-sl-row-not-last-child"></a>

### slide.css `.sl-log-body > .sl-row:not(:last-child)` (line 250)

````css
/* A LOG'S RULE IS UNDER EACH ROW, NOT OVER IT. Over it, the first row in view
   after the oldest had scrolled away drew its rule straight under the
   header's, two lines together (*"rm doublw underline on LIVE TABULAR LOG ON
   A SLIDE"*). Under it, the newest row has none and the header's is alone. */
````

<a id="sl-rows-data-frame"></a>

### slide.css `.sl-rows[data-frame]` (line 255)

````css
/* FULL WIDTH, asked 2026-10-05: *"tables full w. no roundex box"*. A ruled
   table spans the evidence region edge to edge, so its rules do too. */
````

<a id="sl-log"></a>

### slide.css `.sl-log` (line 259)

````css
/* 🔴 A LIVE LOG IS A FIXED BOX. It takes the height of its slot and never of
   its rows, so a row arriving moves nothing on the slide; the body scrolls to
   its foot, so the newest row is at the bottom and the oldest leave the top.
   The header stays put and its rule is its own bottom edge, so the line under
   it does not depend on which row happens to be first in view. */
````

<a id="sl-slot-pos-log"></a>

### slide.css `.sl-slot > .pos-log` (line 274)

````css
/* THE SHELL'S OWN LOG AT SLIDE SCALE. `.pos-log` is px type in a bordered
   card with a 150 px ceiling; in a slot it is the slide's face at step 1, on
   the darker half with no box of its own, as tall as the slot and no taller.
   (0,2,0) against its (0,1,0) font shorthand. `addLine` scrolls it to its
   foot, which is what makes the oldest line leave the top. */
````

<a id="sl-slot-pos-log-2"></a>

### slide.css `.sl-slot > .pos-log` (line 285)

````css
/* NEWEST AT THE FOOT FROM THE FIRST LINE, not only once the box is full:
     with a few short lines the grid packed them at the top and the newest sat
     118.6 px above the foot (MEASURED, kit 328/329). Overflow then leaves by
     the top, which is the oldest line leaving. */
````

<a id="sl-slot-pos-log-3"></a>

### slide.css `.sl-slot > .pos-log` (line 290)

````css
/* NO HALF LINE AT THE TOP. Reported 2026-10-05 with a crop of a line cut
     through its middle: *"ugly cut / crrop"*. The slot is not a whole number
     of lines tall, so the oldest line in view is always partly clipped; it
     fades out over the top two lines instead of ending on a hard cut. */
````

<a id="sl-data-layout-top-sl-ev"></a>

### slide.css `.sl[data-layout="top"] .sl-ev` (line 304)

````css
/* ── LAYOUTS ─────────────────────────────────────────────────────────────────
   `stack`, the default: headline top left, evidence centred under it.
   `top`: headline on top, the words at the bottom, left aligned, the air
     between them.
   `left`: everything on the left edge, the evidence vertically centred.
   `split`: two columns, the slot on `data-side` and the words on the other,
     the caption across the foot. */
````

<a id="sl-data-layout-split-sl-in"></a>

### slide.css `.sl[data-layout="split"] .sl-in` (line 317)

````css
/* MORE AIR EITHER SIDE OF THE DIVIDE, asked 2026-10-05 with a crop of the
     log's ruled rows running almost into the words: *"more x padding around
     central divider"*. Twice the slide's one inset, so each column stands the
     inset off the middle, which is where the darker half ends. */
````

<a id="sl-data-layout-split-before"></a>

### slide.css `.sl[data-layout="split"]::before` (line 329)

````css
/* THE INTERACTIVE SIDE OF A SPLIT IS DARKER, EDGE TO EDGE. Asked
   2026-10-05: *"use darker bg on columned layout on the interactive side"*.
   The page's `--bg` under the slot's half, so the thing you work sits in a
   well and the words sit on the card. A pseudo element rather than a
   background on `.sl-slot`, because the slot sits inside the slide's inset and
   the darker half has to reach the slide's edges. The columns are equal and
   their gap is centred, so the half ends exactly at 50 per cent. */
````

<a id="sl-data-layout-split-data-cols-1-2-data-side-rig"></a>

### slide.css `.sl[data-layout="split"][data-cols="1:2"][data-side="right"] .sl-in` (line 343)

````css
/* `cols: '1:2'`, A THIRD FOR THE WORDS AND TWO FOR THE SLOT, asked 2026-10-06
   for the synths deck: *"use 1:2 cols layout"*. The DIVIDE is put at exactly
   one third of the slide from the words' edge, so the darker part is exactly
   two thirds and the full screen ground below can say where it ends. The grid
   is the content box C = W - 2 pad, so the words column is the third, less
   the inset on its outer edge and half the gap on the divide:
   (C + 2 pad) / 3 - 2 pad. A plain split writes no `data-cols` and keeps the
   two equal columns above. */
````

<a id="sl-data-layout-band-sl-in"></a>

### slide.css `.sl[data-layout="band"] .sl-in` (line 362)

````css
/* `band`: TWO ROWS, 2:1, asked 2026-10-06 with a screenshot of a split: *"its
   better to use vertical sections here. top 2/3 is darker, centered screen and
   buttons ton the right, below in lighter area title an desc"*, and *"use this
   vertical 2:1 layout also for big number example"*. The well (the slot or the
   big figure) takes two shares of the height and the words one, a gap of twice
   the inset between them, as a split's columns have. The darker ground runs
   edge to edge across the top, ending in the middle of that gap: the inset,
   two thirds of what is left, then half the gap, which is (2H - 2 pad) / 3. */
````

<a id="sl-fit-in-pos-rows-r-pos-ipanel-plate"></a>

### slide.css `.sl-fit-in .pos-rows-r.pos-ipanel-plate` (line 410)

````css
/* 🔴 A PANEL IN A FITTED BOX IS NEVER ON A PHONE. It is laid out at its own
   logical width and scaled, so `shell.css`'s viewport query that centres an
   instrument plate at 560 px and under, and moves the name after the
   controls, is answering a question about the window this box never asks.
   MEASURED 2026-10-06 at 375 px on the synths deck: the plate read
   `[Test tone] FAU`, centred, where the ask was FAU with Test tone at its right
   end. So the plate keeps its desk arrangement here at every width. */
````

<a id="sl-5"></a>

### slide.css `.sl` (line 422)

````css
/* 🔴 THICKER LINES ON A SLIDE, asked 2026-10-05 as *"make diagrams thinker
   borders in slides, adjust spacing accordinglu"*. The picture is laid out at
   a fixed logical width and scaled, so a width here is a share of the slide:
   a box edge and an arrow at 2 logical px against the page's 1 and 1.1. The
   hue stays on the edge, only the width moves.
   THE SPACING, WITHOUT TOUCHING `diagram.mjs`, whose padding and gaps are its
   own constants: the names go from 12 to 11 px here, which the diagram
   measures before it lays anything out, and `slideDiagram` lays the picture
   out at 580 logical px rather than 640 (the narrowest that keeps one row of
   columns, `COL_BREAK` is 560). Scaled back up by 640 over 580, a name prints
   at the size it had, while every edge, box padding, gap and arrow run is 10
   per cent larger than it was, and the edges about 2.2 times as thick.
   (0,4,0) against the kinds' (0,3,0). */
````

<a id="sl-pos-dg-pos-dg-n-pos-dg-box"></a>

### slide.css `.sl .pos-dg .pos-dg-n .pos-dg-box` (line 436)

````css
/* 1.5, down from 2 on 2026-10-05: *"make borders bit thinner of slide diagrams"*. */
````

<a id="a-sl-title"></a>

### slide.css `a.sl-title` (line 453)

````css
/* THE DECK'S TITLE IN THE COUNT'S SLOT (`createSlidePlayer({ title })`), a
   link to the deck's own page. Since 2026-10-06 (*"ceter. less emphasis. sans
   serif"*, with a screenshot): the page's sans at the count's size, in the
   count's dim, centred in its slot; the page's ink and an underline only
   under a pointer, the way a card title answers one. */
````

<a id="sl-player-pos-vp-foot-has-pos-vp-c-a-sl-title"></a>

### slide.css `.sl-player .pos-vp-foot:has(> .pos-vp-c > a.sl-title)` (line 461)

````css
/* AND CENTRED BETWEEN THE PAGER AND THE ⛶, NOT ON THE FOOTER, 2026-10-07: *"align
   see slides centered horz better pager and fullscreen bittpns"*. The footer's
   `1fr auto 1fr` centres the middle on the whole row, and the pager is two
   buttons wide against the ⛶'s one, so the link sat 16 px left of the gap's
   middle at 1280. `auto 1fr auto` gives the middle the gap itself. */
````

<a id="sl-mark"></a>

### slide.css `.sl-mark` (line 467)

````css
/* THE β+ AT THE FOOT OF A TITLE SLIDE (`mark: true`), 2026-10-07: content, in the
   slide's flow and inset, the + raised and smaller as on the logo. */
````

<a id="pos-decks"></a>

### slide.css `.pos-decks` (line 473)

````css
/* ── the decks on the front page (shell/decks.mjs) ──────────────────────────
   Two half width players a row, asking the row's OWN width and becoming one
   column below 560 px of it, as the kit's HALF WIDTH PLAYERS and `/cam/` do.
   The gap is the control gap twice, theirs too. */
````

<a id="pos-deck-ph"></a>

### slide.css `.pos-deck-ph` (line 480)

````css
/* 🔴 THE FRAME IS DRAWN BEFORE THE DECK, 2026-10-06, asked as *"slides "pop
   in" in frontpage. show the frame, lazyload ocntents"*. `groupHTML` in
   `manifest.mjs` writes one empty player box per deck into the page's own
   HTML, from the player's own classes (`pos-vp`, `pos-vp-stage` at 16:9,
   `pos-vp-foot`), so it is the same box by construction rather than by a
   typed height; the footer's one reserved line is a control's 34 px, the
   stepper's and the full screen button's. `mountDecks` builds the player when
   the frame nears the screen and puts it in the frame's place. */
````

<a id="sl-player-sl-aria-label-synths-in-code-sl-ev"></a>

### slide.css `.sl-player .sl[aria-label="synths in code"] .sl-ev` (line 489)

````css
/* THE SYNTHS DECK'S TITLE set solid, its two lines one block. The brand rules
   that shared this selector moved to `brand-slides.css` on 2026-10-06. */
````

<a id="sl-tone"></a>

### slide.css `.sl-tone` (line 492)

````css
/* THE SYNTHS DECK'S PLATE (slide-synth.mjs): the note beside FAU says what a
   press will cost, in the plate's own small dim type, and never wraps. */
````

<a id="sl-player-pos-full-focus-sl-player-pos-full-focu"></a>

### slide.css `.sl-player.pos-full:focus, .sl-player.pos-full:focus-visible, .sl-player[data-full]:focus, .sl-player[data-full]:focus-visible` (line 499)

````css
/* ── FULL SCREEN IS THE SLIDE AND NOTHING ELSE ─────────────────────────────
   Asked 2026-10-06 with two screenshots of a deck in full screen: *"rm pseudo
   app frame, paint all bg properly. where is border of screen?"* and *"what
   the f is going on"*. Three things were drawn on top of the slide:
   1. THE FOCUS RING. The player keeps keyboard focus so it hears its keys, and
      a key press makes that focus visible, so the yellow 1 px ring went round
      the whole screen (its top edge was the line under the menu bar). In full
      screen the screen's edge is the edge, so no ring.
   2. THE ⛶ LEAVE BUTTON in the corner, on a screen with a pointer. Esc and f
      leave, the browser says so itself, and on a screen with no hover (a phone)
      the button stays, because there it is the only way out.
   3. A `band` slide's darker top stopped at the slide when the screen is not
      16:9. It runs to the screen's top edge now, ending where the slide's own
      does: the screen's middle plus 0.1133 of the slide's height, which is
      (2h - 2 pad) / 3 - h / 2 with the inset at 8 per cent of h. In full screen
      the stage is the viewport, so h is min(100vh, 56.25vw). */
````

<a id="sl-player-data-full-pos-vp-stage-has-sl-data-lay"></a>

### slide.css `.sl-player[data-full] .pos-vp-stage:has(> .sl[data-layout="split"][data-cols="1:2"][data-side="right"]:not([hidden])), .sl-player.pos-full .pos-vp-stage:has(> .sl[data-layout="split"][data-cols="1:2"][data-side="right"]:not([hidden])), .sl-frame.pos-full:has(> .sl[data-layout="split"][data-cols="1:2"][data-side="right"])` (line 525)

````css
/* A 1:2 split's darker two thirds run on to the screen's edge on the slot's
   side, ending where the slide's own does: the slide is w = min(100vw,
   177.78vh) wide and centred, so its divide is the screen's middle less w / 6
   with the words on the left, and plus w / 6 with them on the right. After
   the plain split rules above, at their weight plus the attribute. */
````

<a id="sl-slot-sl-synth-slot"></a>

### slide.css `.sl-slot.sl-synth-slot` (line 545)

````css
/* THE SYNTH PANEL (slide-synth.mjs): one height on every slide, the code row
   taking what the scope, the knob row and the plate leave, so a knob row
   appearing shortens the code and nothing else moves (2026-10-06, *"keep
   same fau size!!! knobs condense code area"*). And the slot's inset again
   left and right of it (*"add x padding on fau area"*). */
````

<a id="sl-synth-code-pos-code"></a>

### slide.css `.sl-synth-code > .pos-code` (line 555)

````css
/* ⚠️ `height: 100%` AS WELL AS STRETCH, 2026-10-06: the row lays out
   sideways, so `flex` and `min-height` act on the width, and MEASURED on the
   LFO slide the box took its 20 lines' 418 px in a 292 px row and painted
   them over the knob row instead of scrolling */
````

<a id="sl-synth-ctls"></a>

### slide.css `.sl-synth-ctls` (line 561)

````css
/* THE KNOB ROW WITH A RADIO IN IT (slide-synth.mjs, slide 6's `wave`): the
   knobs' lattice, then each choice in a cell of its own with its name under it
   in the knobs' label type and its hue, the row no taller than a knob. */
````

<a id="sl-player"></a>

### slide.css `.sl-player` (line 572)

````css
/* 🔴 A SPLIT STACKS IN FULL SCREEN ON A PHONE: columns on a desk, rows on a
   phone held upright. Asked 2026-10-06 as *"On mobile use horiz layout for
   vertical cols in desktop"*, then *"In mobile change layout in fullscreen"*
   and *"Non when in nonfulkscreen"*: in the page the slide stays 16:9 with its
   columns; full screen on an upright phone it fills the screen in rows. Two
   columns in a 375 px slide put the FAU panel at a fifth of its size.
   Decided by the player's own width AND the window's, so a phone held sideways
   (wider than 560) keeps the 16:9 slide with its columns.
   - The split slide fills the screen, and `--sl-u` stays a share of a 16:9
     slide of the same width, so the type is the size it was in the page and
     the extra height is room for the slot. Other slides keep their 16:9 box.
   - The split is rows: the slot on top on the darker ground, which reaches the
     slide's edges through the slot's own bleed of one inset, the words under
     it one inset further down, the caption last. */
````
