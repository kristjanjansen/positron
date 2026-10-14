# Page comments: circuit

The full comments cut from the code under demo/ for circuit, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="circuit-1"></a>
## circuit-1: demo/circuit/index.html, style, line 12

````css
  /* 🔴 ONE GRID: three columns shared by both rows, which is the only way two
     rows can agree about a `max-content` track. See the note in the script.
     ⚠️ THE MIDDLE IS `max-content`, NOT `1fr`. `1fr` would stretch the button
     rows to whatever the page gives them and the pads would drift apart from
     the macros above them. */
````

<a id="circuit-2"></a>
## circuit-2: demo/circuit/index.html, style, line 17

````css
  /* 🔴 THE PANEL FILLS ITS CONTAINER AND ITS CONTROLS SIT IN THE MIDDLE.
     Asked 2026-09-21: *"make circlit box fill the container and center the
     controls"*. It was `inline-grid`, so the card shrank to its widest row and
     sat against the left edge with a field of empty page beside it.
     ⚠️ **`justify-content`, NOT `justify-items`.** The first centres the whole
     set of tracks inside a now-wider grid, which keeps the three columns in the
     arrangement the panel has. The second centres each column inside its own
     track, which would pull both side columns away from the pads and undo the
     centre line this page asserts. */
````

<a id="circuit-3"></a>
## circuit-3: demo/circuit/index.html, style, line 26

````css
  /* 🔴 THE PANEL SCROLLS SIDEWAYS ON A PHONE RATHER THAN SQUEEZING. Asked
     2026-09-21: *"make it overflow on mobile"*. A Circuit is eight pads across
     plus two columns of round buttons, and there is no width at which that
     becomes a phone: shrinking it turns 46 px pads into something nobody can
     hit, and wrapping it stops being a picture of a panel.
     ⚠️ **THE SCROLLER NEEDS `min-width: 0` OR IT DRAGS THE WHOLE PAGE
     SIDEWAYS.** Already measured on this project at 390 px: `overflow-x` cannot
     shrink a flex item below its content, and a row without it took 141 px of
     page overflow. The scrolling happens in this box or it happens in the
     document, and only one of those is a design. */
````

<a id="circuit-4"></a>
## circuit-4: demo/circuit/index.html, style, line 36

````css
  /* 🔴 AND THE SCROLL BOUNDARY IS ON THE WRONG SIDE OF THE CARD, WHICH IS
     MEASURED AND IS DELIBERATELY NOT FIXED HERE. Found 2026-09-21 while
     extracting `.panel-*` into the kit. At 390 px the card is 644 px wide
     inside a 358 px page column, so **its right edge runs 286.0 px past the
     right edge of the page** — and this page's own assert *the panel box starts
     and ends where the rest of the page does* cannot see it, because
     `demo/verify.mjs` runs at 756 px where the panel fits. Both the other two
     panel pages put the scroller INSIDE the card and measure 0.0 px at both
     edges at 390, 560, 756 and 1280.
     🔴 **IT IS NOT FIXED IN THIS CHANGE BECAUSE IT REVERSES AN INSTRUCTION AND
     CHANGES WHAT MOVES UNDER A FINGER.** *"make it overflow on mobile"* was
     answered with a card that overflows, and *"these corners to line up with
     the page content leftmost rightmost edges"* was answered with a card at
     page width; those two asks are in conflict below the panel's own width, and
     this code satisfies the second only above it. Moving the scroll inside the
     card satisfies both, and it means `NOVATION` and `CIRCUIT` stop sliding off
     while the controls scroll under them. That is worth a screenshot and a
     decision rather than riding along with a rename.
     ⚠️ **THE SCROLLER NEEDS `min-width: 0` OR IT DRAGS THE WHOLE PAGE
     SIDEWAYS.** Already measured on this project at 390 px: `overflow-x` cannot
     shrink a flex item below its content, and a row without it took 141 px of
     page overflow. MEASURED here at all four widths: the document does not drag
     sideways, so that half is right. */
````

<a id="circuit-5"></a>
## circuit-5: demo/circuit/index.html, style, line 60

````css
  /* 🔴 THE CARD IS NOT THE GRID, AND THAT SEPARATION IS THE WHOLE FIX.
     Photographed 2026-09-21 with `NOVATION` sitting about twice as far from the
     left edge as from the top: *"same top and left and rigtj paddings"*.
     **A centred grid cannot give its first column the card's own inset**,
     because `justify-content: center` splits the leftover width either side of
     the tracks and that leftover lands between the border and the first
     column. Nothing written on the brand could have fixed it.
     ✅ So the card is a flex column that fills its container, the printed names
     are a row that spans the CARD, and the controls are a grid inside it that
     centres. The names sit at the padding and the panel sits in the middle,
     which were never the same request.
     ⚠️ **AND THE NAMES ARE ARTWORK ON THE CASE RATHER THAN A ROW OF CONTROLS.**
     Having them in the control grid was what put them in a column in the first
     place, and it is also what made six cells need explicit placement. */
````

<a id="circuit-6"></a>
## circuit-6: demo/circuit/index.html, style, line 74

````css
  /* 🔴 THE CARD HUGS THE PANEL AND THE CARD IS WHAT CENTRES. MEASURED, which
     is why this reverses `make circlit box fill the container` from earlier the
     same evening: with the card full width and the panel centred inside it, the
     leftover width was split either side of the controls, so the inset a reader
     SEES on the left was **43 px against a 21 px foot** and it changed with the
     window. No padding can match a number that moves.
     ✅ Hugging makes all four insets one declaration: 20 px, everywhere, at
     every width. The panel still sits in the middle of the page, which was what
     `fill the container` was asking for; what it is no longer doing is
     stretching a border out to the edges with nothing against it.
     ⚠️ `min-width: max-content` STAYS and is what keeps the phone case working:
     below the panel's own width the card is wider than the container and the
     scroller takes it. */
````

<a id="circuit-7"></a>
## circuit-7: demo/circuit/index.html, style, line 87

````css
  /* 🔴 THE CARD'S EDGES ARE THE PAGE'S EDGES. Asked 2026-09-21 with two corner
     photographs: *"these corners to line up with the page content leftmost
     rightmost edges"*, which is the answer to a question three earlier rounds
     had been circling. The card is a block on this page like the log under it,
     and two blocks whose left edges disagree read as a mistake whatever either
     one is doing inside.
     ⚠️ **SO THE CONTROLS ARE CENTRED AND THE CARD IS NOT, AND THOSE ARE TWO
     DIFFERENT INSETS ON PURPOSE.** The printed names and the border sit at the
     card's own 20 px; the panel sits in the middle of whatever is left. A
     reader sees one inset for the box and one for the instrument, and asking
     them to be the same number is asking a centred thing not to centre. */
````

<a id="circuit-8"></a>
## circuit-8: demo/circuit/index.html, style, line 98

````css
  /* 🔴 THE ARRANGEMENT IS A KIT COMPONENT SINCE 2026-09-21: `.panel` and
     `.panel-case` in `shell.css`, from `demo/shell/panel-layout.mjs`. Asked as
     *"generalize the evoltion layout to reusable components / use from others.
     same patters"*; this page was one of the three hand-rolled copies, and it
     is the one with NO fixed column, which is what made that piece of the
     contract optional.
     ⚠️ **WHAT THE COMPONENT BRINGS IS THE FLEX COLUMN, THE `min-width: 0`, THE
     CARD AND THE 20 px INSET.** What stays here is everything a Circuit says:
     the `max-content` floor that makes the phone case work, the 22 px gap, and
     the deeper foot.
     ⚠️ `width: 100%` AND `min-width: max-content` BOTH STAY. `.panel` carries
     `min-width: 0`, which is right for a panel whose SCROLLER is inside it and
     wrong for this one, where the card itself is the thing that overflows. This
     is the page the extraction plan says should change that, in its own
     reviewable change, and it has not changed here. See the note on
     `.circ-scroll`. */
````

<a id="circuit-9"></a>
## circuit-9: demo/circuit/index.html, style, line 117

````css
    /* ⚠️ ONE NUMBER ON THREE SIDES, TAKEN FROM THE TOP AND REDUCED: *"use top
       one but reduce a bit"*. The foot keeps its own, because the bottom row of
       pads has no label under it to hold it off the edge. */
````

<a id="circuit-10"></a>
## circuit-10: demo/circuit/index.html, style, line 120

````css
    /* ⚠️ THE FOOT IS ITS OWN NUMBER AND IT IS THE LARGEST. Asked 2026-09-21:
       *"add more padding to bottom of circuit panel"*. The bottom row of pads
       carries no label under it, so the same inset that looks right beside a
       printed name looks tight under a pad. */
````

<a id="circuit-11"></a>
## circuit-11: demo/circuit/index.html, style, line 124

````css
    /* ⚠️ THE FOOT IS DEEPER THAN THE SIDES, ASKED FOR TWICE. The bottom row of
       pads carries no label under it, so the inset that looks right beside a
       printed name looks tight under a pad. */
````

<a id="circuit-12"></a>
## circuit-12: demo/circuit/index.html, style, line 127

````css
    /* ⚠️ THE CARD'S GROUND, BORDER AND RADIUS ARE `.panel-case`'s. What is
       left here is the one asymmetric number: 34 px at the foot against 20 on
       the other three sides. It stays a page rule with its reason rather than
       growing the shared token an asymmetric form, because the reason is
       instrument specific. */
````

<a id="circuit-13"></a>
## circuit-13: demo/circuit/index.html, style, line 132

````css
    /* 🔴 THE FOOT AND NOTHING ELSE. This was `padding: 20px 20px 34px`, and
       the 20 on top was a SECOND inset: since the card became `.panel-case`,
       the kit's `.panel-case > .panel-plate` gives the printed names the
       case's own `--panel-pad` above them, because a case is inset on its
       sides only and its children supply the block axis. MEASURED before:
       left 21, right 21, top 41, which is both of them stacked plus the
       border. The sides are `.panel-case`'s already. */
````

<a id="circuit-14"></a>
## circuit-14: demo/circuit/index.html, style, line 141

````css
  /* ⚠️ THE NAMEPLATE ROW'S RULE IS GONE AND IS NOT LOST. It was
     `display: flex; justify-content: space-between`, the same declaration
     `/twelve/` carried, and it is `.panel-plate[data-place="ends"]` now. */
````

<a id="circuit-15"></a>
## circuit-15: demo/circuit/index.html, style, line 144

````css
  /* 🔴 SENTENCE CASE ON EVERY LABEL AND EVERY BUTTON ON THIS PAGE. Asked
     2026-09-21: *"all sentence case labels and buttons"*. The kit uppercases a
     pad's legend, which is right on a page of readouts and section headings and
     wrong on a picture of a panel: a Circuit prints `Tap` and `Sessions` in
     mixed case, and eight shouted legends over eight shouted faces flattens the
     difference between a name and a Shift function.
     ⚠️ **THE TWO PRINTED NAMES ARE NOT LABELS AND KEEP THEIR CASE.** `NOVATION`
     and `CIRCUIT` are artwork on the case, asked for uppercase in their own
     right an hour earlier, and they are the one thing here a hand never
     presses. */
````

<a id="circuit-16"></a>
## circuit-16: demo/circuit/index.html, style, line 156

````css
    /* ⚠️ AIR. Asked 2026-09-21: *"tune whitespace between controls to add bit
       of air"*. Every gap on this page moved together in one edit, because the
       pad area's row pitch and the side column's row pitch are the same number
       twice and a page where they disagree is the 7.5 px drift again.
       ⚠️ `justify-content`, NOT `justify-items`: the first centres the whole
       set of tracks, the second would centre each column inside its own track
       and pull both side columns away from the pads. */
````

<a id="circuit-17"></a>
## circuit-17: demo/circuit/index.html, style, line 166

````css
    /* 🔴 ONE PITCH, DECLARED ONCE, INHERITED BY EVERY ROW AND COLUMN IN THE
       PANEL. It was three separate 14s: the pad grid's, the side column's and
       an 8 the top row inherited from `:root` without anybody noticing, which
       is what put the Shift buttons on a 54 px pitch over pads on a 60 px one.
       ⚠️ A SHARED MEASUREMENT IN THREE PLACES IS A MEASUREMENT THAT WILL
       DISAGREE, which this project has already paid for once as `--sld-col`. */
````

<a id="circuit-18"></a>
## circuit-18: demo/circuit/index.html, style, line 176

````css
  /* 🔴 THE TWO OUTER KNOBS CENTRE IN THEIR TRACK RATHER THAN FILLING IT, AND
     THAT IS WHAT KEEPS THEM OVER THEIR COLUMNS. The outer tracks are
     `var(--ctl-w)`, which is the PAD's width and the width the round buttons
     below centre in. A knob has been `--ctl-w * 1.1` since 2026-09-22, so a
     knob left to start at the track's edge overflowed 4.6 px to the right and
     landed 2.3 px off the column, which this page's own assert caught.
     ⚠️ THE TRACK IS NOT WIDENED TO FIT IT. Widening it would move the pads and
     both side columns to make room for a thing that is printed OVER them, and
     on the real panel the knob is simply a bigger object on the same centre
     line. Overflowing 2.3 px each way into a 22 px gap costs nothing. */
````

<a id="circuit-19"></a>
## circuit-19: demo/circuit/index.html, style, line 187

````css
  /* 🔴 EVERY CELL IS PLACED, BECAUSE TWO NEW CHILDREN JOINED THE AUTO FLOW AND
     SHIFTED ALL SIX. Adding the brand names moved the knob row into row 2 and
     the columns into rows 3 and 4, which took three alignment asserts red at
     once and reported a 336 px drift. **An implicit grid is a layout that any
     new child can reorder**, and this one now has six children that must sit in
     known places.
     ⚠️ THE ASSERTS ARE WHY THIS TOOK ONE RUN RATHER THAN A SCREENSHOT. */
````

<a id="circuit-20"></a>
## circuit-20: demo/circuit/index.html, style, line 194

````css
  /* ⚠️ THE FOUR INK DECLARATIONS ARE `.panel-plate-l`'s, and they were
     identical on all three replicas to the letter, which is the drift the
     extraction was for. `align-self: center` stays because it is placement
     inside THIS row rather than ink. */
````

<a id="circuit-21"></a>
## circuit-21: demo/circuit/index.html, style, line 199

````css
  /* ⚠️ BOTH UPPERCASE. The panel prints `novation` in lower case and the page
     asked for neither: *"uppercalse all"*, and again as a rule about every
     replica a day later: *"replica names always in uppercase"*. At 11 px in a
     mono face beside a row of uppercase control labels, a lower case word reads
     as a different kind of thing rather than as branding.
     ⚠️ THE TRANSFORM STAYS EVEN THOUGH BOTH NAMES ARE NOW TYPED UPPERCASE, and
     the check below reads what the browser RENDERS rather than what is typed,
     so neither half can quietly go missing and leave the other looking right. */
````

<a id="circuit-22"></a>
## circuit-22: demo/circuit/index.html, style, line 210

````css
  /* ⚠️ CLASSES, NOT `:first-of-type`. That pseudo class counts by TAG, and the
     first div in this grid is now a brand label, so neither column rule matched
     and both columns fell into the auto flow. It reported as a 336 px drift and
     as two different controls both sitting at x 608. */
````

<a id="circuit-23"></a>
## circuit-23: demo/circuit/index.html, style, line 217

````css
  /* 🔴 ONE MEASURED DEAD RULE DELETED HERE, WHICH WOULD HAVE BEEN THIS
     PROJECT'S SEVENTH. `.circ > .pos-knob { align-self: end }` matched **0
     elements**, MEASURED 2026-09-21: `.circ` has exactly two children, the
     nameplate row and `.circ-panel`, so no knob was ever a direct child of it.
     Its comment read *"the knob row sits on the bottom of its own row, level
     with each other"*, which is done by `.circ-panel { align-items: start }`
     plus the explicit grid areas below. It read as correct and did nothing.
     ⚠️ `.circ .pos-pad-bot` MATCHES 0 TOO AND IS NOT THE SAME THING: the
     `.pos-pad-top` half of that rule matches 60, so that half is forward
     looking rather than defective and stays. */
````

<a id="circuit-24"></a>
## circuit-24: demo/circuit/index.html, style, line 227

````css
  /* 🔴 THE TOP ROW USES THE BODY'S GAP, SO ITS ENDS SIT OVER THE COLUMNS.
     Asked 2026-09-21: *"center filter to right circle buttons"*. It carried
     `--ctl-gap` at 8 px while the body below it uses 14, so the volume knob and
     the filter drifted inward from the two columns they belong over by 6 px
     each. **The macro row and the button rows are already the same width**,
     eight controls and seven gaps either way, so matching the outer gap is all
     it takes. */
````

<a id="circuit-25"></a>
## circuit-25: demo/circuit/index.html, style, line 237

````css
  /* 🔴 ONE ROUND BUTTON TO A PAD ROW. The cell is a pad's height and the circle
     centres in it, so a 41 px button and a 46 px pad still share a centre line.
     The gap is the pad area's, not the side column's. */
````

<a id="circuit-26"></a>
## circuit-26: demo/circuit/index.html, style, line 241

````css
  /* 🔴 THESE CIRCLES ARE PAD SIZED, NOT 10 PER CENT SMALLER. Photographed
     2026-09-21 as ellipses: a 41 px round pad in a 46 px wrapper was being
     stretched across by the flex column's default `stretch`, so it came out
     wide and short. Centring it in an over-tall cell was the wrong repair as
     well, and left every one of them 7.5 px low, **measured five times over as
     exactly 7.5**.
     ⚠️ **AT PAD SIZE THERE IS NOTHING TO CENTRE AND NOTHING TO STRETCH.** One
     button to a row, the same diameter as the pads it runs beside, which is
     also what the panel has: the round buttons are not smaller than the pads on
     a Circuit. The 10 per cent is a kit default for round pads in general and
     is right where a circle sits among squares in one row. */
````

<a id="circuit-27"></a>
## circuit-27: demo/circuit/index.html, style, line 255

````css
  /* 🔴 AND THE SLOTS GO, BECAUSE NOTHING IN THIS COLUMN USES ONE ANY MORE. The
     legends came off the circles earlier and the reserved 15 px did not, so
     every cell was 61 px against a 46 px pad row: **five rows, 75 px of
     accumulated drift**, measured. Third time tonight a reserved slot has
     outlived the label it was reserved for. */
````

<a id="circuit-28"></a>
## circuit-28: demo/circuit/index.html, style, line 262

````css
  /* 🔴 THE PAD AREA HAS ITS OWN, LARGER GAP. Asked 2026-09-21: *"increase pads
     gap"*. It is set as a local `--ctl-gap` rather than as a `gap` on each
     piece, so the track row, the grid's columns and the grid's rows all move
     together and the across and down spacing cannot come apart again. */
````

<a id="circuit-29"></a>
## circuit-29: demo/circuit/index.html, style, line 269

````css
  /* 🔴 THE TRACK PADS GIVE UP THEIR LABEL SLOTS TOO. They carry their names on
     the FACE, so the reserved top slot is 15 px of air that made their row
     taller than a pad row, and every round button in the side columns came out
     half a slot low: **7.5 px, measured, which is exactly half of 15**.
     ⚠️ `createPadGrid` already collapses the slots for a grid where nothing is
     labelled. This row is a plain flex of pads and is outside that rule, which
     is the kind of gap a rule leaves when it is written for one container. */
````

<a id="circuit-30"></a>
## circuit-30: demo/circuit/index.html, style, line 277

````css
  /* 🔴 EIGHT COLUMNS, NOT EIGHT WIDTHS. Asked 2026-09-21: *"make top buttons
     line up"*, photographed with `Tempo` and `Swing` sitting between pad
     columns because each button had been sized to its own word.
     ⚠️ **BOTH ROWS THAT USE THIS CLASS ARE EIGHT THINGS WIDE**: the Shift row
     and the track row, and both sit over the pad grid, so one `repeat(8, …)`
     makes all three agree by construction rather than by three numbers that
     happen to match. On the panel these buttons really are pad width.
     ⚠️ **AND THE PRICE IS PAID IN LABELS, WHICH IS THE RIGHT PLACE.** A word
     that does not fit 46 px gets shortened by the author (`Session` is
     `Sess`), never ellipsised at the reader. */
````

<a id="circuit-31"></a>
## circuit-31: demo/circuit/index.html, style, line 291

````css
  /* 🔴 A GRID COLUMN IS NOT A WIDTH UNTIL THE CHILD IS TOLD. Photographed
     2026-09-21 with `Oct` `Oct` `Tempo` overlapping each other: a button sized
     to its own word is wider than a 46 px track, and a grid item wider than its
     column OVERFLOWS it rather than shrinking, so eight buttons ran into each
     other while the tracks underneath were perfectly even.
     ⚠️ **`min-width: 0` IS THE HALF THAT DOES THE WORK.** `width: 100%` alone
     loses to the content's own minimum, which is the same rule already written
     down here for a scrolling flex row. */
````

<a id="circuit-32"></a>
## circuit-32: demo/circuit/index.html, style, line 300

````css
  /* 🔴 SEVEN CHILDREN OVER EIGHT COLUMNS, WHICH IS WHY THE ROW WOULD NOT LINE
     UP. The two octave buttons live in one wrapper so they can share the
     `prt/oct` legend above them, so the row has SEVEN items for EIGHT tracks
     and every one after the pair was a column out. Nothing about the pair was
     wrong; the grid was told eight and handed seven. */
````

<a id="circuit-33"></a>
## circuit-33: demo/circuit/index.html, style, line 307

````css
  /* 🔴 THE MACROS ARE A ZIG ZAG, NOT A ROW. Odd numbers on the upper line, even
     numbers lower and offset right, so the eight interleave. Read off the panel
     at 800 dpi and confirmed from the rear photograph, where ten knob profiles
     stand above the edge: two with pointers at the ends and eight without.
     **A straight row of eight, or two aligned rows of four, is a different
     instrument.** The offset is half a column plus half a gap, which is what
     interleaving means. */
````

<a id="circuit-34"></a>
## circuit-34: demo/circuit/index.html, style, line 314

````css
  /* ⚠️ THE MACRO ROW SETS ITS OWN SPACING, AND IT IS THE ONLY ROW THAT DOES.
     Asked 2026-09-21 in two passes: *"reduce x padding around m knobs"*, then
     *"more spacy, extending a bit to leht and rigth and bottm more. other
     stays"*. A knob's box is wider than a pad's, so neither the panel's 14 px
     pitch nor the 2 px it was cut to is the right number here, and it is not
     derivable from either.
     ⚠️ **IT IS CENTRED IN ITS TRACK, SO THE GAP IS WHAT EXTENDS IT BOTH WAYS.**
     Seven gaps widening by 8 px puts 28 px more knob row either side of the pad
     area, which is the zig zag reaching past the pads the way the panel's does.
     ⚠️ **AND THE FOOT IS ITS OWN, NOT THE PANEL'S.** The row below has to clear
     the LOWER line of the zig zag, and that line hangs 26 px below the upper
     one, so the panel's shared 22 px reads tight under this one row and correct
     under every other. `other stays` is the instruction, and a margin here
     touches nothing else. */
````

<a id="circuit-35"></a>
## circuit-35: demo/circuit/index.html, style, line 328

````css
  /* ⚠️ AND NO FOOT OF ITS OWN. Asked 2026-09-21: *"reduce space between macro
     bs and lower stuff"*, which reverses the margin added a few minutes earlier
     for *"bottm more"*. The panel's own 22 px is the whole gap now. */
````

<a id="circuit-36"></a>
## circuit-36: demo/circuit/index.html, style, line 334

````css
  /* ⚠️ ONE KNOB SIZE EVERYWHERE. Asked 2026-09-21: *"single size knobs
     weverywhre"*. Filter and Master Volume really are larger pots on the panel
     and were drawn at 1.3, which put three diameters in one row and made the
     row read as three kinds of control rather than one kind at two jobs.
     **A panel reproduced at a tenth of its size cannot carry a panel's
     proportions**, which is the same reason `Pattern Octave` became
     `prt/oct`. The size difference is recorded in
     `plans/plan-panel-layouts.md` and is not drawn. */
````

<a id="circuit-37"></a>
## circuit-37: demo/circuit/index.html, style, line 352

````css
  /* 🔴 THE PADS INSIDE GIVE UP THEIR OWN TOP SLOTS, BECAUSE THE PAIR'S LEGEND
     IS ALREADY ONE. Reported 2026-09-21: *"bottomalign buttns"*, showing Scale
     and Shift sitting higher than the row between them. The pair was reserving
     the label height TWICE, once for the shared legend and once inside each
     pad, so it stood 15 px taller than a plain button; with `flex-end` on the
     row, every plain button dropped by that much and the side columns did not.
     ⚠️ **A SHARED LABEL REPLACES THE SLOTS IT SPANS, IT DOES NOT SIT ABOVE
     THEM.** The comment here previously said the opposite and was wrong: it was
     reasoning about a pair standing alone, not about one in a row. */
````

<a id="circuit-38"></a>
## circuit-38: demo/circuit/index.html, inline script, line 380

````js
  /**
   * 🔴 A NOVATION CIRCUIT ON SCREEN. Two sources and they are kept apart on
   * purpose, because they fail differently:
   *   - **WHAT IT SENDS** is measured, off this desk through `/dump/` on
   *     2026-09-20, and is in `research/measured-devices-2026-09-20.md`.
   *   - **WHERE THE CONTROLS ARE** is read, off Novation's own panel artwork at
   *     800 dpi, and is in `plans/plan-panel-layouts.md`.
   * ⚠️ **THE MODEL 12 PAGE LEARNED THIS THE EXPENSIVE WAY.** Its strip was laid
   * out from reasoning and corrected twice by somebody looking at the object,
   * because a CC number says what TRAVELS and says nothing about what a hand
   * TOUCHES. This page starts from the artwork instead.
   */
````

<a id="circuit-39"></a>
## circuit-39: demo/circuit/index.html, inline script, line 395

````js
  /**
   * 🔴 THE FILTER IS ALONE ON CHANNEL 16 AND EVERY MACRO IS ON CHANNEL 1.
   * Measured, and a layout binding the whole panel to one channel gets eight
   * knobs and silently loses the one the guide calls always active.
   * ⚠️ **IT WAS WRITTEN UP AS `NOT WHAT ANY MANUAL SAYS` AND THAT WAS WRONG.**
   * Corrected 2026-09-21 by reading Novation's Circuit Programmer's Reference
   * Guide v1.1, which gives a whole **Session Control** section addressed to
   * **MIDI channel 16** and puts the master filter in it as **CC 74**, with its
   * resonance on **CC 71**. `plans/plan-circuit-model12.md` §3.5 had already
   * tabulated that section out of the same document. So the measurement and the
   * documentation agree, which is a stronger position than either alone, and
   * the sentence claiming they disagreed was written without opening the one
   * document that covers it. The USER GUIDE does not say it; the PROGRAMMER'S
   * REFERENCE does, and those are two books.
   */
````

<a id="circuit-40"></a>
## circuit-40: demo/circuit/index.html, inline script, line 418

````js
    /* 🔴 NO DECLARED CONTROL. The primary one is a presence button built
       below and spliced into `.pos-controls`, which is where
       `demo/verify.mjs` presses. A status control outside that row is a
       control no harness drives, and every check behind it would go silent
       while the suite stayed green. */
````

<a id="circuit-41"></a>
## circuit-41: demo/circuit/index.html, inline script, line 427

````js
  /**
   * 🔴 THE KNOB ROW SPANS THE WHOLE PANEL AND THE SIDE COLUMNS START BELOW IT.
   * Reported 2026-09-21: *"scale is in the same height as oct etc buttons"*.
   * The first build made three columns of the whole panel, so `Scale` began
   * level with the macros and every button in both side columns sat one row too
   * high. On the object the macros run across the top and the two columns of
   * round buttons begin at the button row.
   * ⚠️ IT IS A STRUCTURAL FACT, NOT A MARGIN. Pushing the columns down by the
   * height of the knob row would be a number to keep in step with a row whose
   * height depends on the knobs in it.
   */
````

<a id="circuit-42"></a>
## circuit-42: demo/circuit/index.html, inline script, line 438

````js
  /**
   * 🔴 ONE GRID, SIX CELLS, AND THE ROWS ARE NOT WRAPPED. Two grids with the
   * same `max-content` column do NOT agree: each sizes its own track from its
   * own contents, so the knob row measured the macros and the row below it
   * measured the pads, and the filter sat 12 px left of the column it belongs
   * over while the volume knob was exact. **A shared column has to be one
   * grid.**
   * ⚠️ THIS WAS THE SECOND ATTEMPT. The first replaced two flex rows with two
   * grids, which made the intent clearer and changed the answer by 0 px.
   */
````

<a id="circuit-43"></a>
## circuit-43: demo/circuit/index.html, inline script, line 448

````js
  /**
   * ⚠️ THE INSTRUMENT WEARS ITS OWN NAMES, WHERE IT WEARS THEM. Asked
   * 2026-09-21: *"add title to instument: left: novation, right circuit"*. On
   * the panel `novation` is printed in the top left corner and `CIRCUIT` in the
   * top right, above the two outer knobs.
   * ⚠️ IT IS NOT THE PAGE'S TITLE REPEATED. The page is called `circuit` and
   * says so above; this is the artwork, which is why the maker's name is on it
   * and why the two sit at opposite ends rather than in the middle.
   */
````

<a id="circuit-44"></a>
## circuit-44: demo/circuit/index.html, inline script, line 457

````js
  /* 🔴 THIS PAGE WEARS THE PANEL'S CLASSES AND DOES NOT CALL ITS FACTORY, AND
     THAT IS THE EXTRACTION SAYING OUT LOUD WHERE IT STOPPED.
     `createPanelLayout` ALWAYS builds a scrolling region, because contract 1 is
     that a panel has exactly one and the page never scrolls, and it is the one
     part of the contract that is not optional. On this page the scroller is
     `.circ-scroll`, which is OUTSIDE the card, so calling the factory here
     would give the panel a second one.
     ✅ **SO THE CARD TAKES `.panel` AND `.panel-case` AND THE NAMEPLATE TAKES
     ITS COMPONENT, AND THE FACTORY ARRIVES WITH THE SCROLL BOUNDARY.** That is
     a visible behaviour change worth its own screenshot and its own review, and
     the measurement that motivates it is on `.circ-scroll` below.
     ⚠️ **A PAGE THAT USES HALF A COMPONENT HAS TO SAY WHICH HALF**, or the next
     reader assumes the conversion was forgotten rather than staged. */
````

<a id="circuit-45"></a>
## circuit-45: demo/circuit/index.html, inline script, line 473

````js
  /* ⚠️ TYPED UPPERCASE, NOT LEFT TO THE STYLESHEET. It read `novation` here and
     `NOVATION` on screen for a day, which is a source that does not say what
     the page says: the one reader who can be misled by that is the next person
     to grep for the word. The standing rule is `/kit/`'s, where `.kit-h` shouts
     a heading whatever is typed and the heading is typed shouting anyway.
     ⚠️ **`place: 'ends'` IS `/twelve/`'s PLACEMENT AND THIS PLATE SITS IN A
     DIFFERENT PARENT.** That one goes above the instrument and this one inside
     the card, and the component does not carry the difference: where a thing is
     appended is the caller's business. */
````

<a id="circuit-46"></a>
## circuit-46: demo/circuit/index.html, inline script, line 493

````js
  /* 🔴 ON THE PATCHBAY ON A PRESS OF Join, NEVER ON LOAD (plans/plan-routing-migration.md
     step 5). The Circuit plugged into this machine is announced as a device,
     keyed by its port and never by its name, so `/patchbay/` can draw it and
     link it. Join sits outside `.pos-controls` and asks for MIDI first when
     the presence button has not. `/shell/midi-node.mjs` has the rest. */
````

<a id="circuit-47"></a>
## circuit-47: demo/circuit/index.html, inline script, line 503

````js
  /**
   * ⚠️ MASTER VOLUME IS DRAWN AND BOUND TO NOTHING. It is a pot with a printed
   * pointer, alone at the far left under the logo, and **whether it transmits
   * has never been measured**. Drawing it live would be a control that looks
   * bound and is not; leaving it out would be a panel missing a knob.
   */
````

<a id="circuit-48"></a>
## circuit-48: demo/circuit/index.html, inline script, line 521

````js
      /**
       * ⚠️ NO CONTROLLER NUMBER UNDER THE KNOB. Asked 2026-09-21: *"rm ccs,
       * also from rack"*. A panel does not print the wire protocol on itself,
       * and a reader looking at an instrument wants to know which knob this is,
       * not which byte it sends.
       * ⚠️ **THE NUMBER IS NOT LOST, IT MOVED TO THE HOVER**, which is where
       * this page already puts the channel and whether the reading was measured
       * or inferred. Somebody debugging a binding is somebody who will point at
       * the control; somebody looking at the panel is not.
       */
````

<a id="circuit-49"></a>
## circuit-49: demo/circuit/index.html, inline script, line 553

````js
  /**
   * ⚠️ THE GREY LEGEND ABOVE A BUTTON IS WHAT SHIFT PLUS THAT BUTTON DOES,
   * confirmed twice from the guide's own glossary. It goes in the TOP label
   * slot, which is what that slot is for.
   * 🔴 **AND THE LAST PAIR DOES NOT RESOLVE.** The faces read `Save` and
   * `Session`, the legends above them read `Clear` and `Sessions`, and what
   * Shift plus Save actually does is not stated anywhere in the User Guide.
   * The artwork is reproduced and the meaning is left alone.
   */
````

<a id="circuit-50"></a>
## circuit-50: demo/circuit/index.html, inline script, line 562

````js
  /**
   * ⚠️ THE OCTAVE BUTTONS CARRY A TRIANGLE, WHICH IS WHAT THE PANEL PRINTS.
   * Asked 2026-09-21: *"butotn labels: oct+downwardstriangle etc"*. Two buttons
   * both reading `Oct` are two identical controls as far as a reader is
   * concerned, and the direction is the only thing telling them apart.
   * ⚠️ U+25BC AND U+25B2 HAVE NO EMOJI FORM, unlike the media control block.
   * That is now a standing rule in this kit after the transport glyphs and the
   * invisible hand both rendered in colour.
   */
````

<a id="circuit-51"></a>
## circuit-51: demo/circuit/index.html, inline script, line 580

````js
    /**
     * ⚠️ THE NAME IS ON THE BUTTON, NOT UNDER IT. Asked 2026-09-21: *"top
     * buttons: move label to buttons"*, and the panel agrees: these eight carry
     * their names printed on the face, while the grey Shift legends are the
     * things printed above them. **The top slot stays for the legend**, which
     * is what it was reserved for.
     * ⚠️ AND A FACE THAT DOES NOT FIT NOW CUTS, because `.pos-pad-face` gained
     * an ellipsis with this change. A cut face is the same signal a cut label
     * is: the word is too long for a pad.
     */
````

<a id="circuit-52"></a>
## circuit-52: demo/circuit/index.html, inline script, line 598

````js
  /**
   * 🔴 `PATTERN OCTAVE` IS CENTRED OVER THE PAIR, NOT OVER ONE BUTTON. Reported
   * 2026-09-21 with a screenshot: *"do not break prt/oct"*. It was in the first
   * Oct pad's own top slot, where it is two words in a 46 px box against
   * `white-space: nowrap`, so it ran out over its neighbour.
   * ⚠️ **A LEGEND THAT SPANS TWO CONTROLS IS NOT A LABEL ON EITHER OF THEM**,
   * and a pad's top slot cannot express that: the slot belongs to one pad by
   * construction. The two are wrapped instead, and the pads keep their empty
   * slots so they still line up with the six beside them.
   */
````

<a id="circuit-53"></a>
## circuit-53: demo/circuit/index.html, inline script, line 609

````js
  /**
   * ⚠️ `prt/oct`, NOT `Pattern Octave`. Asked 2026-09-21: *"do not break, use
   * prt/oct"*. The panel prints the words in full across a pair of buttons that
   * are 22 mm wide between them; on screen that pair is 100 px and the words
   * are 90 of it, which is a legend filling its own row rather than labelling
   * something. **A panel reproduced at a tenth of its size cannot carry a
   * panel's typography**, and the hover has room for the full words.
   */
````

<a id="circuit-54"></a>
## circuit-54: demo/circuit/index.html, inline script, line 623

````js
  /**
   * 🔴 SHIFT IS NOT IN THIS ROW, IT IS THE TOP OF THE RIGHT COLUMN. Reported
   * 2026-09-21: *"shift is in the same lane"*, and it was being **drawn
   * twice**: once here set apart with `margin-left: auto`, and again as the
   * first button of the right column.
   * ⚠️ THE PANEL RESEARCH SAYS BOTH THINGS AND THEY ARE NOT A CONTRADICTION. It
   * sits apart from the other seven AND it is level with them, because it
   * belongs to the column that runs down the right edge and that column starts
   * at this row. **Reading one sentence and not the other is how a control gets
   * built in two places.**
   */
````

<a id="circuit-55"></a>
## circuit-55: demo/circuit/index.html, inline script, line 638

````js
  /**
   * ⚠️ SHORT NAMES, BECAUSE THE ELLIPSIS SAID SO. `Sidechain` is 50 px at this
   * face and a pad is 46, so it cut. **A cut label is the signal that the word
   * is in the wrong place**, and the answer is a shorter word rather than a
   * wider pad: the full name is on the hover.
   */
````

<a id="circuit-56"></a>
## circuit-56: demo/circuit/index.html, inline script, line 648

````js
  /**
   * ⚠️ FULL SIZE, WITH THE NAME ON THE BUTTON. Asked 2026-09-21: *"second row
   * of buttons are full size. add on-button labels support, align to bototm"*.
   * These are the eight track selectors and they are the row a hand reaches for
   * most, so they are squares rather than the half height the function row uses.
   * ⚠️ A SQUARE HOLDS MORE THAN A HALF DOES, but not much more: the face is
   * still 46 px against a 9 px mono word, which is why these stayed short.
   */
````

<a id="circuit-57"></a>
## circuit-57: demo/circuit/index.html, inline script, line 662

````js
  /**
   * 🔴 THE TRACK ROW AND THE GRID ARE ONE BLOCK. Reported 2026-09-21 with a
   * screenshot: *"add same gap to grid, the one under the first row"*. The
   * stack between blocks is 14 px and the grid's own rows are 8, so the seam
   * between the selectors and the pads they select was almost twice every other
   * seam in the grid, and read as a divider nobody drew.
   * ⚠️ ON THE PANEL THEY REALLY ARE ONE THING: the track buttons are the top
   * row of the pad area, not a separate row above it.
   */
````

<a id="circuit-58"></a>
## circuit-58: demo/circuit/index.html, inline script, line 675

````js
  /**
   * 🔴 THIRTY TWO PADS, AND WHICH PAD IS WHICH NOTE IS NOT KNOWN. Measured:
   * drums arrive on **channel 10** as notes 60, 62 and 64, and synth 2 on
   * channel 2. **Three notes out of thirty two pads is not a map**, so a press
   * lights the pad only when its note has actually been seen, and the rest stay
   * dark rather than being bound by a guess.
   * ⚠️ THE COLOURS ARE THE FOUR TRACKS, which is what a Circuit's pads are lit
   * by. That is the surface `pad.mjs`'s header says colour means lane identity
   * on, and the reason is here: the hardware's pads really are coloured.
   */
````

<a id="circuit-59"></a>
## circuit-59: demo/circuit/index.html, inline script, line 694

````js
  /**
   * 🔴 A ROUND BUTTON CARRIES ITS NAME INSIDE IT. Asked 2026-09-21: *"circle
   * buttons: labels inside"*, and the panel agrees: these are printed on the
   * face, while the grey Shift legends stay above.
   * ⚠️ **SO THE NAME HAS TO FIT A CIRCLE, WHICH IS ABOUT FOUR CHARACTERS.** A
   * round pad is 10 per cent smaller than a square one and a circle wastes its
   * corners, so `Velocity` and `Patterns` cannot go on one. They are shortened
   * and the full word is on the hover, which is the same answer `Sidechain` got
   * an hour ago. **The ellipsis was the signal both times.**
   * Each row is: id, face, full name, legend above, round.
   */
````

<a id="circuit-60"></a>
## circuit-60: demo/circuit/index.html, inline script, line 718

````js
  /**
   * 🔴 THE FIVE ROUND BUTTONS IN EACH COLUMN LINE UP WITH THE FIVE PAD ROWS.
   * Asked 2026-09-21: *"circle buttons need to align vert with pads"*, and the
   * panel agrees: the columns run down the sides of the pad area, one button to
   * a row.
   * ⚠️ **A CIRCLE IS SMALLER THAN A PAD, SO IT CENTRES IN A PAD SIZED CELL**
   * rather than the column being packed tighter. Packing them would make five
   * buttons at 41 px plus gaps fall short of five pads at 46, and the two
   * columns would drift apart down the panel by 5 px a row.
   * ⚠️ AND THE FIRST BUTTON IN EACH COLUMN IS NOT ONE OF THE FIVE: `Scale` and
   * `Shift` belong to the function row above, which is why they are separated
   * by the stack's own 14 px rather than by the pad gap.
   */
````

<a id="circuit-61"></a>
## circuit-61: demo/circuit/index.html, inline script, line 738

````js
        /**
         * ⚠️ THE FACE FOR BOTH SHAPES. A round button with its name below it
         * read as a dot with a caption; the panel prints the word inside.
         * 🔴 **AND NO TOP LEGEND ON A CIRCLE.** Asked 2026-09-21: *"rm top
         * labels from circle buttons"*. `Expand`, `Fixed` and `Rate` are grey
         * Shift legends on the hardware, and above a round button each one is a
         * word wider than the thing it labels, in a column where the next
         * button's legend is directly under the last one's. The panel has
         * millimetres of clear panel to print into; this column has 8 px of gap.
         * ⚠️ **THE LEGENDS ARE NOT LOST.** They stay on the rectangular buttons,
         * where there is width for them, and every circle carries its own on
         * the hover. What Shift plus that button does is a fact about the
         * instrument, not a thing to drop because it will not fit.
         */
````

<a id="circuit-62"></a>
## circuit-62: demo/circuit/index.html, inline script, line 765

````js
  /**
   * 🔴 WHAT ARRIVED, BESIDE THE PANEL IT MOVED. The table is a kit module
   * because three pages grew one on the same day; the policy that a clock byte
   * is counted and never listed lives in there with it.
   */
````

<a id="circuit-63"></a>
## circuit-63: demo/circuit/index.html, inline script, line 781

````js
  /* MEASURED arriving on channel 10, and documented at DOC 3.2. It left
     with the sending half and had to come back: the LISTENER needs it to
     tell one drum track from another. */
````

<a id="circuit-64"></a>
## circuit-64: demo/circuit/index.html, inline script, line 792

````js
    /**
     * 🔴 EVERYTHING THAT IS NOT A FLOOD GETS A ROW, AND IT HAPPENS HERE, BEFORE
     * ANY OF THE ROUTING BELOW. Asked 2026-09-21: *"add midi event logs to
     * circuit and rack demos"*. Putting it after the routing would list only
     * what this panel already understands, which is the opposite of what a log
     * is for: the interesting message is the one the picture cannot place.
     * ⚠️ THE FLOOD TEST MOVED UP ONE LINE AND NOTHING ELSE MOVED. `isFlood` is
     * clock and active sensing, and Start is neither, so a Start still reaches
     * the branch under this and still resets the bar.
     */
````

<a id="circuit-65"></a>
## circuit-65: demo/circuit/index.html, inline script, line 810

````js
      // ⚠️ ABSOLUTE, UNLIKE THE MODEL 12'S PAN. Measured: a macro sweeps 0 to
      // 127 and reports a position, so it is set rather than accumulated.
````

<a id="circuit-66"></a>
## circuit-66: demo/circuit/index.html, inline script, line 820

````js
      /**
       * 🔴 A HIT LIGHTS **WHEN** IT LANDED, NOT **WHICH NOTE** IT WAS. Reported
       * 2026-09-21: *"i play drum beat on 1 5 9 13 but ui ticks lower left
       * pad"*, and that is exactly what the old line did: the column came from
       * the note's position in a discovery map, so one drum is always index 0
       * and four hits a bar all lit the same pad. **It was reporting the
       * instrument and looking like it was reporting the beat.**
       * ✅ The column comes off the CLOCK now. This Circuit sends 24 per
       * quarter note continuously, so six clocks is a sixteenth and sixteen of
       * those is a bar, laid across the bottom two rows: eight and eight.
       * ⚠️ **WHERE THE BAR STARTS IS ANCHORED ON THE FIRST HIT, BECAUSE A FREE
       * RUNNING CLOCK HAS NO ORIGIN.** Without a Start byte there is nothing
       * that says which tick is step one, so the first note heard becomes it.
       * That makes the SPACING right, which is the thing a reader is looking
       * at, and leaves the absolute step a guess. A Start resets it properly.
       * 🔴 **AND THE PATTERN ON SCREEN CANNOT BE THE PATTERN ON THE DEVICE.
       * THIS PROJECT'S OWN RESEARCH SAYS SO AND IT WAS NOT READ BEFORE THIS WAS
       * BUILT.** `plans/plan-device-layouts.md` §3.12: the Circuit documents
       * **no per pad MIDI address for any of the thirty two**, and the pad grid
       * is *a sequencer grid the device draws for itself*. What the instrument
       * documents sending is four drum notes and a clock, 📄 DOC §3.2.
       * ⚠️ So a bar's ORIGIN is not on the wire. Two things were reported as
       * mismatches and only one of them was a bug: the ROW was wrong and is
       * fixed, the STEP is anchored on the first hit heard because there is
       * nothing better, and it will sit at an arbitrary rotation against what
       * the hardware is lighting.
       * ⚠️ **ONE CHEAP MEASUREMENT WOULD CLOSE IT**: if this Circuit sends
       * `0xFA` Start when play is pressed, the line below anchors properly and
       * the two line up. Nobody has looked, and `/dump/` answers it in ten
       * seconds. The clock was measured running continuously whether anything
       * is playing or not, which is why Start cannot be assumed.
       */
````

<a id="circuit-67"></a>
## circuit-67: demo/circuit/index.html, inline script, line 852

````js
      /**
       * 🔴 A DRUM TRACK OWNS TWO ROWS, AND WHICH TWO COMES FROM THE NOTE.
       * Reported 2026-09-21: *"dr2 is not sown on rows 3-4"*, one report
       * after *"bassdrum is top 2 rows not bottom ones"*. Both are the same
       * fact arriving in halves: the grid shows TWO drum tracks at once,
       * sixteen steps each, Drum 1 on rows 1 and 2 and Drum 2 on rows 3
       * and 4.
       * ⚠️ **SO DRUM 3 AND DRUM 4 HAVE NOWHERE TO GO AND ARE NOT DRAWN.**
       * Four tracks at sixteen steps is sixty four pads and there are
       * thirty two. Lighting them somewhere would be this page inventing a
       * layout for the third time tonight, so a hit on either says so in
       * the log and lights nothing.
       */
````

<a id="circuit-68"></a>
## circuit-68: demo/circuit/index.html, inline script, line 885

````js
  /**
   * 🔴 ANYTHING THIS PAGE CANNOT PLACE IS SAID OUT LOUD, ONCE PER SHAPE.
   * Asked 2026-09-21: *"when i touch pads in circuit to set up grid can you
   * not get it?"*, which is a question about the WIRE and not about this
   * page, and the only honest way to answer it is to show what arrives.
   * ⚠️ **ONE LINE PER SHAPE, NOT PER MESSAGE.** A Circuit sends 24 clocks a
   * quarter note, and a log that printed every unrecognised byte would be a
   * log nobody can read within a second of pressing the button.
   */
````

<a id="circuit-69"></a>
## circuit-69: demo/circuit/index.html, inline script, line 923

````js
  /**
   * 🔴 THE BUTTON IS THE STATUS. Asked 2026-09-21: *"replace listen primary
   * buttons to somehign that uses online status"*. `Listen` said what
   * pressing would do and said nothing about whether anything answered, so a
   * visitor who pressed it and saw no movement could not tell a silent
   * Circuit from an absent one.
   * ⚠️ **IT STAYS A PRESS.** A badge that opened MIDI on its own would be
   * opening it on a VISIT, which is the rule four pages here have paid for.
   */
````

<a id="circuit-70"></a>
## circuit-70: demo/circuit/index.html, inline script, line 932

````js
  /* ⚠️ `says: WIRED`, NOT THIS PAGE'S OWN THREE WORDS. Asked 2026-09-21:
     *"Use connected connecting not connected on all hw demos when applicable"*.
     `online` and `offline` are network words and suit a board answering over a
     relay from another building; an instrument on a USB cable on this desk is
     connected or it is not. The map is one export in `presence.mjs` so that five
     pages cannot end up with five vocabularies that agree today. */
````

<a id="circuit-71"></a>
## circuit-71: demo/circuit/index.html, inline script, line 949

````js
      /* ⚠️ ONLINE MEANS A PORT WITH THIS NAME ON IT, NOT THAT MIDI WAS
         GRANTED. Permission is a fact about the browser; presence is a fact
         about whether the instrument is plugged in, and reporting the first
         as the second is how a page says `online` about an empty desk. */
````

<a id="circuit-72"></a>
## circuit-72: demo/circuit/index.html, inline script, line 972

````js
    /**
     * 🔴 MEASURED BEFORE ANY MESSAGE LANDS, WHICH IS THE ONLY MOMENT IT CAN BE.
     * Asked 2026-09-21: *"rm just leave room for midi table"*. The sentence
     * that used to fill this box was holding it open, so taking it away without
     * `reserve` would collapse the panel and then push it back down the instant
     * somebody pressed the button. This reads the EMPTY box, and the assert
     * below compares it against a row measured after eleven have arrived.
     */
````

<a id="circuit-73"></a>
## circuit-73: demo/circuit/index.html, inline script, line 981

````js
    /**
     * ⚠️ THE CAPTION ELEMENT, NOT `textContent`, AND THE FIRST BUILD OF THIS
     * ASSERT READ THE WRONG ONE. An empty table HIDES its heading rather than
     * removing it, so `textContent` on the box came back `"atchwhatbytesreading"`
     * and the check went red on a page where the height was right to a tenth of
     * a pixel. This is the third time in this project that a hidden element has
     * been read as an absent one.
     */
````

<a id="circuit-74"></a>
## circuit-74: demo/circuit/index.html, inline script, line 1003

````js
    /**
     * 🔴 THE FILTER IS ON CHANNEL 16 AND THE MACROS ARE ON 1, asserted because
     * it is the one binding on this instrument that a reasonable layout gets
     * wrong. A page listening on channel 1 alone would pass everything else.
     */
````

<a id="circuit-75"></a>
## circuit-75: demo/circuit/index.html, inline script, line 1015

````js
    // ⚠️ A MACRO IS ABSOLUTE. The Model 12's pan is relative on the same
    // protocol, so this is asserted rather than assumed.
````

<a id="circuit-76"></a>
## circuit-76: demo/circuit/index.html, inline script, line 1025

````js
    /**
     * 🔴 THE PANEL IS DRAWN WHOLE AND MOST OF IT IS BOUND TO NOTHING, which is
     * deliberate and is asserted so nobody quietly binds it by guess. Twenty
     * two buttons here have never sent a byte this page has seen.
     */
````

<a id="circuit-77"></a>
## circuit-77: demo/circuit/index.html, inline script, line 1030

````js
    /**
     * 🔴 THE PANEL IS DRAWN WHOLE AND MOST OF IT IS BOUND TO NOTHING, asserted
     * so nobody quietly wires it by guess later.
     * ⚠️ IT ASKS `hardwareMoves`, NOT THE HOVER TEXT. The first version matched
     * on the title string, which grades the sentence rather than the binding
     * and would pass for a control that was wired AND still described as
     * unwired. **A wording is not a fact about behaviour.**
     */
````

<a id="circuit-78"></a>
## circuit-78: demo/circuit/index.html, inline script, line 1038

````js
    /**
     * 🔴 THE PANEL IS DRAWN WHOLE AND MOST OF IT IS BOUND TO NOTHING, asserted
     * so nobody quietly wires it by guess later.
     * ⚠️ IT ASKS `presses`, NOT THE HOVER TEXT. Matching on the title string
     * grades the sentence rather than the binding, and would pass for a control
     * that was wired AND still described as unwired.
     * 🔴 **THIS LIST WAS SHORTER FOR ONE COMMIT AND IS WHOLE AGAIN.** The
     * sending half is at `archive/circuit-midi-out/`.
     */
````

<a id="circuit-79"></a>
## circuit-79: demo/circuit/index.html, inline script, line 1052

````js
    /**
     * 🔴 THE BUTTON ROW IS ONE LINE, ASSERTED. Two comments in this file have
     * now claimed it and one of them was wrong, which is exactly the case for
     * measuring instead: the octave pair carries a legend the others do not,
     * so it is the one thing in that row that can silently be a different
     * height.
     */
````

<a id="circuit-80"></a>
## circuit-80: demo/circuit/index.html, inline script, line 1073

````js
    // 🔴 ONE GAP THROUGH THE WHOLE PAD AREA, measured rather than looked at:
    // the seam under the track row and the seam between two grid rows.
````

<a id="circuit-81"></a>
## circuit-81: demo/circuit/index.html, inline script, line 1085

````js
    // 🔴 THE TWO OUTER KNOBS SIT OVER THE TWO COLUMNS, measured. The panel puts
    // Master Volume above the left edge and Filter above the right, and a 6 px
    // drift is the kind of thing that reads as wrong without reading as broken.
````

<a id="circuit-82"></a>
## circuit-82: demo/circuit/index.html, inline script, line 1097

````js
    // 🔴 EACH ROUND BUTTON SHARES A CENTRE LINE WITH ITS PAD ROW, measured.
    // A 41 px circle and a 46 px pad cannot be aligned by packing, only by
    // giving the circle a pad sized cell to centre in.
````

<a id="circuit-83"></a>
## circuit-83: demo/circuit/index.html, inline script, line 1110

````js
    // 🔴 THE PANEL SCROLLS AND THE PAGE DOES NOT, measured at whatever width
    // this is running at. The second half is the one that matters: a scrolling
    // row that forgot `min-width: 0` looks identical in a screenshot and takes
    // the document sideways instead.
````

<a id="circuit-84"></a>
## circuit-84: demo/circuit/index.html, inline script, line 1124

````js
    // 🔴 EVERY TOP BUTTON STANDS OVER ITS OWN PAD COLUMN, measured. This is the
    // check that was missing when the row was eight widths instead of eight
    // columns, and again when the buttons overflowed the columns: both were
    // reported from a photograph, and both are one subtraction.
````

<a id="circuit-85"></a>
## circuit-85: demo/circuit/index.html, inline script, line 1138

````js
    /**
     * 🔴 THE PRINTED NAMES ARE THE MAKER AND THE MODEL, IN UPPERCASE. Asked
     * 2026-09-21 as a rule about every hardware replica: *"replica names always
     * in uppercase"*.
     * ⚠️ **IT READS WHAT THE BROWSER RENDERS, NOT WHAT THE PAGE TYPED.** Two
     * things make a name shout here and only one of them is in the JavaScript,
     * so a check on the string alone would pass a page whose stylesheet had
     * lost `text-transform` and would have failed this page for the whole day
     * its source read `novation` while its screen read `NOVATION`. The
     * transform is applied below the way the browser applies it.
     * ⚠️ AND IT ASKS FOR BOTH HALVES OF THE NAME. A replica carrying only its
     * model is an instrument nobody made.
     */
````

<a id="circuit-86"></a>
## circuit-86: demo/circuit/index.html, inline script, line 1152

````js
      /* ⚠️ THE READER IS THE COMPONENT'S NOW. `nameplate.shown()` applies the
         transform the way the browser does, and it was the same seven lines in
         this file and in `/twelve/` before it lived anywhere. */
````

<a id="circuit-87"></a>
## circuit-87: demo/circuit/index.html, inline script, line 1161

````js
    /**
     * 🔴 THE PRESENCE BADGE'S STATE COLOUR, READ AS A COMPUTED VALUE, BECAUSE
     * THE RULE THAT SETS IT WAS DEAD FOR MONTHS AND THE SOURCE READ AS CORRECT.
     * Reported 2026-09-21 as *"chircuit checking should be gray"*. It was not:
     * the badge computed `rgb(230, 230, 230)`, which is `--fg`, in ALL FIVE
     * states, because `.pos-presence-btn .pos-pres { color: inherit }` is
     * (0,2,0) exactly like `.pos-pres[data-state="checking"]` and sits 750
     * lines later in `shell.css`, so it won on source order.
     * ⚠️ AND THE DOT IS `background: currentColor`, so the damage was not the
     * word alone: an ONLINE instrument had a WHITE dot rather than a green one,
     * on every page here that mounts a presence button.
     * 🔴 SO THIS IS ASSERTED AS INK RATHER THAN AS A SELECTOR. A grep for the
     * rule would have found it present and correct every day it was broken.
     * ⚠️ IT ALSO ASSERTS THE NEGATIVE HALF: that `online` is NOT the grey, so a
     * stylesheet that greyed every state would fail rather than pass the first
     * clause and look fixed.
     * ⚠️ The attribute is set and put straight back inside one task, so nothing
     * is painted and nobody watching the page sees a badge flicker. That is the
     * mutating-check rule: ask whether a person would see it happen.
     */
````

<a id="circuit-88"></a>
## circuit-88: demo/circuit/index.html, inline script, line 1211

````js
    // 🔴 THE PRINTED NAMES SIT THE SAME DISTANCE FROM THREE EDGES, measured
    // rather than read off the stylesheet, because the defect that bought this
    // was a padding that was right in the source and wrong on the screen: a
    // centred grid was adding its leftover width in front of the first column.
````

<a id="circuit-89"></a>
## circuit-89: demo/circuit/index.html, inline script, line 1226

````js
    // 🔴 THE FOOT IS THE SAME DEPTH AS THE SIDES, measured from the last thing
    // drawn rather than from the stylesheet. A padding is what the box
    // reserves; what a reader sees is the distance from the bottom PAD, and a
    // reserved label slot under a row nobody labelled sits between the two.
````

<a id="circuit-90"></a>
## circuit-90: demo/circuit/index.html, inline script, line 1233

````js
      /* ⚠️ AGAINST THE CARD'S OWN INSET, WHICH IS WHAT THE PRINTED NAME SITS
         AT, AND NOT AGAINST THE FIRST CONTROL. That comparison read **foot 21,
         side 43** and the 22 px between them was the leftover a centred panel
         splits either side of itself. It moves with the window, so it was never
         a number a padding could be set to. */
````

<a id="circuit-91"></a>
## circuit-91: demo/circuit/index.html, inline script, line 1241

````js
      /* ⚠️ DEEPER, AND BY HOW MUCH IS THE CLAIM. "About the same" was the
         earlier instruction and it changed; what has not changed is that the
         number must be measured from the last PAD rather than read off the
         stylesheet, because a reserved label slot sits between the two. */
````

<a id="circuit-92"></a>
## circuit-92: demo/circuit/index.html, inline script, line 1249

````js
      /* 🔴 AND THE CARD LINES UP WITH EVERY OTHER BLOCK ON THE PAGE. This is
         the claim the corner photographs were about, and it is one subtraction
         per edge. */
````

<a id="circuit-93"></a>
## circuit-93: demo/circuit/index.html, inline script, line 1258

````js
    /**
     * 🔴 THE LOG IS GRADED, BECAUSE A SURFACE NOTHING ASSERTS IS A SURFACE
     * THAT CAN GO BLANK WITHOUT THE SUITE MOVING. Eleven messages went in
     * above and two clock bytes did not.
     */
````

<a id="circuit-94"></a>
## circuit-94: demo/circuit/index.html, inline script, line 1266

````js
    // ⚠️ THE HALF THAT MATTERS: a message this panel has NO PLACE for still
    // gets a row. A log fed after the routing would be silent about exactly
    // the traffic somebody opened it to find.
````

<a id="circuit-95"></a>
## circuit-95: demo/circuit/index.html, inline script, line 1278

````js
    /**
     * 🔴 THE ROOM IS REAL AND IT IS MEASURED AGAINST A ROW RATHER THAN AGAINST A
     * NUMBER TYPED HERE. `--tbl-row-h` in `shell.css` is built out of the same
     * padding and line height `.pos-tbl-row` is, and two constants that are
     * meant to agree will disagree unless something compares them. A row exists
     * now, so it is the second source.
     * ⚠️ AND THE EMPTY BOX SAID NOTHING, which is the half that was asked for.
     * A reserved box with a caption in it is the sentence back again.
     */
````

<a id="circuit-96"></a>
## circuit-96: demo/circuit/index.html, inline script, line 184

````js
  /**
   * A Novation Circuit on screen. What it sends is measured (research/measured-devices-
   * 2026-09-20.md); where the controls are is read off the panel artwork at 800 dpi
   * (plans/plan-panel-layouts.md). A CC number says nothing about where a hand goes.
   * See lessons/page-circuit.md#circuit-38
   */
````
