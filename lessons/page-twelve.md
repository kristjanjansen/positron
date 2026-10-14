# Page comments: twelve

The full comments cut from the code under demo/ for twelve, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="twelve-1"></a>
## twelve-1: demo/twelve/index.html, style, line 10

````css
  /* 🔴 THE ARRANGEMENT IS FROM SOMEBODY LOOKING AT THE MIXER, NOT FROM A
     MANUAL. Reported 2026-09-20: *"rec mute solo have to be on rihht on slider,
     aligned to bototm"*, and before it *"solo is most bottom"*. The first build
     stacked the three buttons UNDER the pan knob and above the fader, on the
     reasoning that a mixer strip reads downward. It does, and the buttons are
     not in that column: they sit beside the fader.
     ⚠️ A GUESS THAT LOOKS PLAUSIBLE IS THE EXPENSIVE KIND, because nobody
     re-checks it. Two corrections from a person in front of the hardware beat
     the reasoning outright, and a panel diagram is still being looked up to
     settle whether REC is above MUTE. */
````

<a id="twelve-2"></a>
## twelve-2: demo/twelve/index.html, style, line 20

````css
  /* 🔴 THE STRIPS ARE GLUED, WITH NO GAP AND ONE EDGE ROUND THE SET. Asked
     2026-09-21: *"when channels are next to each other, leave no gap, glue
     horizontally"*. Eight boxes with air between them are eight things; eight
     boxes sharing their edges are one mixer, which is what the object on the
     desk is. It is the same argument `choice.mjs` and `button-group.mjs` both
     make about a segmented row.
     ⚠️ THE SEAM IS ONE PIXEL, NOT TWO. Each strip drops its left border so
     adjacent borders do not stack, and only the outer corners are rounded. A
     doubled border down every seam is what "glued" looks like when nobody
     measured it.
     ⚠️ AND IT SCROLLS RATHER THAN SHRINKING: a strip narrow enough to fit a
     phone is one nobody can work. */
````

<a id="twelve-3"></a>
## twelve-3: demo/twelve/index.html, style, line 32

````css
  /* 🔴 THE ARRANGEMENT IS A KIT COMPONENT SINCE 2026-09-21 AND IS NOT IN THIS
     FILE ANY MORE. `demo/shell/panel-layout.mjs` and the `.panel-*` family in
     `shell.css` own the two children, which one scrolls, that they are one
     depth, and the border on the fixed one's facing edge. Asked as
     *"generalize the evoltion layout to reusable components / use from others.
     same patters"*; this page was one of the three hand-rolled copies.
     ✅ **THIS PAGE IS THE ONE THAT MADE TWO PIECES OF THE CONTRACT OPTIONAL.**
     It has NO outer card, so `cased: false` leaves `--panel-pad` at 0 and every
     rule resolves to the right thing with no second stylesheet; and its fixed
     column is on the RIGHT, which is why the side is an option and the border
     moves with it. `/evo/` has the mirror of both.
     ⚠️ **EVERY ELEMENT KEEPS ITS OWN `.rack-*` CLASS BESIDE THE SHARED ONE**,
     which is what made this conversion move no selector. Nineteen rules in this
     file name `.rack-row` or `.rack-lane`, FOUR of them inside a media query
     this project's harness cannot reach, and renaming them would have been the
     single largest risk in the extraction for no gain: what those rules say is
     about a Model 12 and belongs here.
     🔴 `--panel-gap: 0`, WHICH IS THE GLUE SAID ONCE. The shared rules put the
     token between the column and the strip, and this mixer is glued: *"when
     channels are next to each other, leave no gap, glue horizontally"* and
     *"the panels are glued together, no gap, same h"*. Setting the token is the
     honest way to say it, rather than overriding a margin the component set. */
````

<a id="twelve-4"></a>
## twelve-4: demo/twelve/index.html, style, line 54

````css
  /* 🔴 THE LANE IS GLUED TO THE CHANNELS AND IS THE SAME HEIGHT. Reported
     2026-09-21 with a screenshot: *"the panels are glued together, no gap, same
     h"*. It sat apart with `--ctl-gap` between and stood taller than the rack,
     so the mixer read as two machines beside each other rather than one.
     ⚠️ `align-items: stretch`, NOT `flex-end`. That is the component's now, on
     `.panel-wrap`, with the reasoning kept there: bottom alignment makes two
     children END together and says nothing about their heights. */
````

<a id="twelve-5"></a>
## twelve-5: demo/twelve/index.html, style, line 61

````css
  /* 🔴 THE INSTRUMENT WEARS ITS MODEL NAME AND NOT ITS MAKER'S, AND IT WEARS IT
     IN THE MASTER COLUMN. Asked 2026-09-21: *"Move model 12 to roght panel top
     right corner. No brand name"*.
     ⚠️ IT NARROWS *"replica names always in uppercase. add full name evolution
     mk-425c"* rather than contradicting it: that instruction is why this panel
     has a name at all, and the name is still uppercase and still set by the
     shared component. `/circuit/` and `/evo/` keep both halves.
     ⚠️ IT IS NOT THE PAGE'S TITLE REPEATED. The page's slug is `twelve` and a
     slug is not what is printed on a mixer. This is the artwork.
     ⚠️ AND IT IS NO LONGER A PLATE SPANNING THE WHOLE OBJECT. It used to sit
     above the cards, because a replica with no single case has nowhere else to
     put a name belonging to the whole instrument. One name belongs to one part,
     and on the real panel `TASCAM` is printed across the top of the screen
     operation section, which is the master column this plate now sits in.
     ⚠️ THE TEN PIXEL GAP WENT WITH IT. It tied a floating plate to the panel
     under it, and a plate inside the lane's own card needs nothing to say it
     belongs there. What spaces it from the function keys below is the lane's
     own `--ctl-gap`, which is what spaces every other row in that column. */
````

<a id="twelve-6"></a>
## twelve-6: demo/twelve/index.html, style, line 80

````css
  /* ⚠️ THE NAMEPLATE'S INK AND ITS THREE PLACEMENTS ARE ALL IN `shell.css`,
     which is what the panel extraction was for: three replicas whose
     nameplates were set three ways read as three pages rather than as one
     shelf of instruments. `.panel-plate-l` is the ink and
     `.panel-plate[data-place="end"]` is this page's placement, added the same
     day for the same request, because a plate with ONE line cannot use `ends`
     (which parks a lone child left) or `mid` (which centres it). */
````

<a id="twelve-7"></a>
## twelve-7: demo/twelve/index.html, style, line 87

````css
  /* ⚠️ THE FLEX GAP IS DEFENSIVE AND MEASURED INERT, kept rather than deleted
     for the reason `/evo/` keeps its pair: `.panel-wrap` declares no gap today,
     and a gap added tomorrow in another page's interest would unglue this
     mixer. */
````

<a id="twelve-8"></a>
## twelve-8: demo/twelve/index.html, style, line 92

````css
  /* ⚠️ THE ROOM FOR THE SCROLLBAR IS ON THE WRAPPER, NOT ON THE SCROLLER.
     Reported 2026-09-21: *"bottom uneven"*. It was 4 px of `padding-bottom`
     here and nowhere on the lane, so the two boxes ended 4 px apart and every
     fader in the rack sat higher than the FX fader beside it. **A reservation
     that only one of two equal things makes is a reservation that breaks
     them.** */
````

<a id="twelve-9"></a>
## twelve-9: demo/twelve/index.html, style, line 103

````css
  /* 🔴 THE LANE IS ONE SURFACE, NOT THREE BOXES AND A FOURTH ONE ROUND THE FX
     FADER. Asked 2026-09-21: *"right panels should have same bg as channel
     strips. no separte bg for fx slidr"*. The rows had no background at all and
     the FX fader had its own `.strip-one` box, so the master column read as a
     loose pile beside a solid rack.
     ⚠️ ONE BOX, ONE BORDER, SAME `--card` AS A CHANNEL. The FX fader is part of
     the master column on the panel and is not a separate machine, so it must
     not be drawn as one. */
````

<a id="twelve-10"></a>
## twelve-10: demo/twelve/index.html, style, line 111

````css
  /* ⚠️ THE LANE'S CARD AND ITS LEFT BORDER ARE THE COMPONENT'S NOW.
     `.panel-fixed` is the column that keeps its width, `.panel-fixed-r` puts
     the 1 px border on the edge FACING the scroller, and `.panel-case` paints
     the card. Asked 2026-09-21 as *"add left border to right panel"*, and the
     reasoning is kept on `.panel-fixed-r` because it is the general one: the
     channels SCROLL under this lane, so there is no fixed neighbour to stack
     with, and the border is what tells a reader where the scrolling stops.
     ⚠️ WHAT IS LEFT HERE IS WHAT A MODEL 12 SAYS. The lane centres its
     controls, spaces them by the control row's own gap, insets them by 14 px
     rather than the case's 20, and rounds only the outer edge, because the rack
     it ends is square on the side it meets. */
````

<a id="twelve-11"></a>
## twelve-11: demo/twelve/index.html, style, line 122

````css
  /* ⚠️ THREE DECLARATIONS THAT OVERRIDE `.panel-case`, EACH A FACT ABOUT THIS
     MIXER RATHER THAN A CORRECTION. The inset is 14 px and not the case's 20,
     because a lane of controls is not a case wall. Only the OUTER edge is
     round, because the rack this lane ends is square on the side it meets. And
     the row gap is the control row's own, so a knob and a button column in here
     sit on the same pitch as they do in a channel. */
````

<a id="twelve-12"></a>
## twelve-12: demo/twelve/index.html, style, line 132

````css
  /* 🔴 THE BUTTON ROWS SIT AT THE TOP AND THE FADER FALLS TO THE BOTTOM. Asked
     2026-09-21: *"align right panel buttons to top"*. The lane is as tall as
     the channel rack beside it, and without this the rows floated in the middle
     of it, which is what happens when a column has spare room and nothing
     claims it.
     ⚠️ IT IS A MARGIN ON THE FADER, NOT `justify-content: space-between`. The
     three rows must stay together at the top rather than spreading apart, and
     `space-between` would push them to the corners. `margin-top: auto` gives
     the spare room to exactly one element. */
````

<a id="twelve-13"></a>
## twelve-13: demo/twelve/index.html, style, line 142

````css
  /* 🔴 THE PLATE TAKES THE LANE'S INSET AND ADDS NONE OF ITS OWN. Asked
     2026-09-29: *"adjust nameplate to model name top padding is same as right
     padding"*, from a screenshot of a wide band of air over `MODEL 12` with a
     narrow gap to its right.
     🔴 **THE BOXES WERE ALREADY EQUAL AND THAT IS WHY IT HAD TO BE MEASURED AS
     INK.** MEASURED before changing anything, at 1280 px: the plate's border
     box sat **0.00 px off the lane's content box on BOTH edges**, so every
     number a stylesheet sets was already saying 14 and 14. What the reader was
     looking at is the LETTERS, and those were **34.84 px below the lane's top
     edge against 16.47 px inside its right edge**, 18.37 px apart. It is this
     file's own knob rule one screen up, arriving on a different control: the
     gap a stylesheet sets is between BOXES and the eye measures between INK.
     🔴 **AND THE 18.37 px IS ONE DECLARATION, WHICH IS WHY THIS IS A DELETION
     RATHER THAN A CORRECTION.** `shell.css:6556` is `.panel-case >
     .panel-plate { padding-block: var(--panel-pad) 0 }`, which is 20 px, and it
     is right for a case that insets by `--panel-pad`. This lane insets by 14
     and says so three declarations up, so the plate was carrying a second top
     inset from a token this lane does not use. A component does not own its
     outer air: the lane's own `padding: 14px` is the inset, read once and
     reaching both edges.
     ⚠️ **MEASURED AFTER: ink 14.84 px down against 16.47 px in, 1.63 px
     apart**, and that residue is a font fact rather than a layout one. It is
     the leading over the cap on one side against the trailing letter-spacing
     and the last glyph's side bearing on the other, and nothing in CSS today
     removes both. `text-box: trim-both cap alphabetic` would remove only the
     first and leave the two **2.47 px apart**, so trimming would be the worse
     of the two. The assert below requires the pair rather than printing it.
     ⚠️ **(0,2,0), A TIE WITH THE RULE IT BEATS, AND THIS SHEET IS THE LATER
     ONE.** Matching the component's weight is the smallest thing that can win;
     outrunning it is how the next fight starts one step higher.
     ⚠️ **AND THE HONEST HOME IS `shell.css`, WHICH WAS NOT MINE TO EDIT THIS
     RUN.** See the note beside the assert for the selector that would have gone
     there and what it would have reached. */
````

<a id="twelve-14"></a>
## twelve-14: demo/twelve/index.html, style, line 176

````css
  /* 🔴 A KNOB NEEDS MORE AIR ABOVE IT THAN A BUTTON DOES, because its top edge
     is a NUMBER rather than a border. Reported 2026-09-21 with a screenshot:
     *"more space on top of right knob"*, showing the jog's `64` sitting almost
     against the F4 button above it.
     ⚠️ **THE ROW GAP IS MEASURED BETWEEN BOXES AND THE EYE MEASURES BETWEEN
     INK.** A button's box has 8 px of padding inside its border before its
     glyph, so `--ctl-gap` between two buttons reads as far more than 8. Between
     a button and a bare number it reads as exactly 8, which is too close.
     Doubling it here restores what the eye was expecting. */
````

<a id="twelve-15"></a>
## twelve-15: demo/twelve/index.html, style, line 189

````css
  /* 🔴 THE WHOLE CHANNEL FALLS TO THE BOTTOM OF ITS STRIP, NOT JUST ITS FADER
     BLOCK. Asked 2026-09-29: *"twelwe: align channel item (pan, rec) to the
     bottom"*, from a screenshot of PAN and REC sitting high with a hole of bare
     strip under them.
     🔴 **THIS LINE USED TO NAME `.pos-crow` AND THE COMMENT OVER IT ARGUED
     FROM THE HARDWARE**, that a Model 12 puts knobs and REC at the top, the
     fader and its buttons in a lower block, and that the air between them is
     the gap the object has too. **The ask overrides that**, so the argument is
     recorded here as what this page used to claim rather than left standing as
     a defence of an arrangement nobody is looking at any more. What the panel
     does is unchanged and is written up in `plans/plan-panel-layouts.md`; what
     a screen strip does is now what was asked for.
     🔴 **AND IT IS A CHANGE OF WHICH CHILD ABSORBS THE SLACK, NOT A NEW
     ALIGNMENT.** MEASURED at 1280 px before: the strip's inner height is
     479.28 px against 415.28 px of content, so **64.00 px of slack**, all of it
     on `.pos-crow`'s own `margin-top: auto`, which is what put the hole between
     REC and the fader. The auto margin moves to the strip's FIRST child, so
     that slack becomes air ABOVE the PAN knob and PAN and REC come down onto
     the fader block. MEASURED after: **air above the knob 44.00 px, air between
     REC and the fader block 14.00 px**, which is the strip's own `gap` and
     nothing else.
     ⚠️ **AND THE SLACK READS 44.00 px AFTER RATHER THAN 64.00, WHICH IS THE
     OTHER ASK OF THE SAME DAY AND NOT A SECOND EFFECT OF THIS ONE.** The
     nameplate gave up 20 px of its own top padding higher up this block, the
     lane is 20 px shorter for it, and the strips are stretched to the lane's
     height. So 64.00 px is what this rule had to move on the morning it was
     written and 44.00 px is what it moves today. WHERE the air goes is the
     claim; how much of it there is belongs to whatever sets the lane's height.
     ⚠️ **NOTHING UNDER IT MOVES, WHICH IS THE PART TO CHECK RATHER THAN
     ASSUME.** The slack was already all above the fader block, so the block
     keeps its line with everything beside it: MEASURED, the channel fader and
     the lane's FX fader read top 465.19 and bottom 713.53 before both changes
     and top 445.19 and bottom 693.53 after them, **on the same line as each
     other on either side of it**. The FX fader keeps its own `margin-top: auto`
     one declaration up, because it is the master column rather than a channel
     and the ask names PAN and REC.
     ⚠️ **`:first-child`, NOT `.pos-knob`.** The claim is about the strip's
     first control absorbing the slack, and naming the knob would be a rule that
     a reordering silently turns into a dead one. This file has measured that
     shape already: a renamed class left `--fdr-lane-h` falling back and a lane
     was 29 px short with every line of it reading as correct.
     ⚠️ **AND THE PHONE BLOCK ZEROES THE SAME SELECTOR**, at the foot of this
     file, or the rule down there would go on naming a `.pos-crow` that no
     longer carries an auto margin. */
````

<a id="twelve-16"></a>
## twelve-16: demo/twelve/index.html, style, line 234

````css
  /* ⚠️ THE FX FADER KEEPS ITS PLACE AND LOSES ITS BOX. `.strip-one` paints a
     card and a border, which inside the lane is a box inside a box. */
````

<a id="twelve-17"></a>
## twelve-17: demo/twelve/index.html, style, line 239

````css
  /* 🔴 ONE FADER LENGTH FOR THE WHOLE PANEL, DECLARED ONCE, AND IT STOPPED
     BEING A BUTTON COUNT ON 2026-09-21. Asked 2026-09-21: *"fx slider same
     height"*, and it was written twice as `four surfaces and three steps`
     because four buttons stood beside every channel fader and the FX fader had
     to match them.
     🔴 **`Rm disabled controls` TOOK MAIN AND SUB OUT OF THAT COLUMN, AND A
     LENGTH DERIVED FROM WHAT IS LEFT WOULD BE 86 px.** Two surfaces and one
     step, on a mixer whose faders are all 60 mm and whose knobs are 46 px
     across. That is not a shorter fader, it is a different kind of control.
     ✅ **THE LENGTH WAS NEVER A FACT ABOUT THE BUTTONS. IT IS A FACT ABOUT THE
     PANEL**, which has ONE fader throw and prints it on eight channels, the FX
     fader and the two analogue outputs alike. So it is one declaration that two
     kinds of fader read, and they cannot drift.
     ⚠️ **THE EXPRESSION IS KEPT VERBATIM FROM WHEN IT MEANT FOUR BUTTONS, SO
     NOTHING MOVED**: 212 px before and 212 px after, MEASURED. What changed is
     what it claims. Re-deriving the same number from a different arithmetic
     would have read as a length that had been recalculated.
     ⚠️ AND MUTE AND SOLO NOW SIT AT THE FOOT OF THE FADER RATHER THAN SPANNING
     IT, which is where they are on the object. */
````

<a id="twelve-18"></a>
## twelve-18: demo/twelve/index.html, style, line 264

````css
  /* ⚠️ NO ROUNDED RIGHT EDGE ANY MORE: the lane is what ends the rack now, so
     the last strip is a middle one. */
````

<a id="twelve-19"></a>
## twelve-19: demo/twelve/index.html, style, line 271

````css
  /* 🔴 NOTHING IN A STRIP IS SELECTABLE. Asked 2026-09-21: *"make channel
     labels noseltable"*. A channel number is furniture, not text somebody
     copies, and a drag across a rack of eight selects every label in it. The
     project already has this rule for controls and keys; a strip is made
     entirely of controls, so it takes it whole.
     ⚠️ `-webkit-touch-callout` IS THE ONE THAT STOPS THE iOS LOUPE, and
     `user-select` alone does not. Photographed once on /keys/ and /mirror/. */
````

<a id="twelve-20"></a>
## twelve-20: demo/twelve/index.html, style, line 281

````css
    /* ⚠️ 41 px AT THE FOOT, NOT 14: room for the out of flow hand button, which
       is 22 of button plus 5 of air below the label. In the SHORTHAND rather
       than as a separate longhand, because a later shorthand resets a longhand
       and that is exactly how this went wrong once already. */
````

<a id="twelve-21"></a>
## twelve-21: demo/twelve/index.html, style, line 288

````css
  /* 🔴 THE BUTTONS ALIGN TO THE LANE'S BOTTOM, NOT THE FADER'S. `flex-end`
     alone lines them up with the bottom of the whole control, which is under
     its label, so they sat a label's height too low. The fader publishes
     `--fdr-foot` for exactly this, and the alignment is ASSERTED below against
     the real rects rather than trusted. */
````

<a id="twelve-22"></a>
## twelve-22: demo/twelve/index.html, style, line 294

````css
  /**
   * 🔴 THIS PAGE NO LONGER DOES ITS OWN ALIGNMENT ARITHMETIC. `shell.css`
   * publishes `--ctl-head`, `--ctl-foot` and `--ctl-step`, and every control
   * wears the same furniture, so `.pos-crow` is plain `flex-end` and the
   * lanes, the buttons and their labels land on one line by themselves.
   * ⚠️ WHAT IS LEFT HERE IS THE ONE THING ONLY THIS PAGE KNOWS: that the fader
   * spans THREE buttons. Three working surfaces plus two steps between them.
   */
````

<a id="twelve-23"></a>
## twelve-23: demo/twelve/index.html, style, line 302

````css
  /* ⚠️ THE SECOND COPY OF THE LENGTH IS GONE AND THE TWO LESSONS IT CARRIED
     ARE NOT. It was `.strip-one .pos-crow .pos-fdr`, and before that
     `.strip-body .pos-fdr`, which kept the old class name for one run after the
     row was renamed: `--fdr-lane-h` fell back to its 120 px default and the
     lane was 29 px short. **A dead selector reads as correct**, and it was
     caught in seconds only because the length is asserted rather than
     eyeballed. That is the fifth dead rule this project has measured and the
     first one caught by its own check.
     ⚠️ AND IT WAS ONCE `.pos-crow .pos-fdr`, matching **8 elements** and scoped
     by nothing but living in this page's `<style>` block, while declaring a
     length that is a claim about a Model 12. `.rack-unit` scopes it to this
     instrument, which is what both lessons were asking for.
     ⚠️ THE CHECK THAT REPLACED THE ONE THOSE LESSONS BOUGHT reads the lane's
     real height against `--rack-throw`, because `the lane starts level with the
     first button in the column` was an alignment that only existed while four
     buttons spanned the fader. */
````

<a id="twelve-24"></a>
## twelve-24: demo/twelve/index.html, style, line 318

````css
  /* ⚠️ NO COMPENSATION FOR THE INVISIBLE HAND, AND THERE WAS SOME FOR ONE RUN.
     A hand is a MODE of the fader: the lane shortens and the fader's bottom
     does not move, so a pad column beside it needs to know nothing about it. */
````

<a id="twelve-25"></a>
## twelve-25: demo/twelve/index.html, style, line 322

````css
  /* ⚠️ REC IS THE SAME WIDTH AS THE REST. On the hardware it is a wide button
     spanning the strip, and it was drawn that way for one run: *"rec can be
     same w as others"*. **The panel fact is unchanged and is recorded in
     `plans/plan-panel-layouts.md`**; what changed is that a screen strip does
     not have to reproduce a proportion to be right about an arrangement, and a
     row of controls that all share `--ctl-w` reads as an instrument rather than
     as four widths. Its POSITION, above the fader and outside the column, is
     the part that was actually wrong before and stays fixed. */
````

<a id="twelve-26"></a>
## twelve-26: demo/twelve/index.html, style, line 331

````css
  /* ── a phone ───────────────────────────────────────────────────────────
     🔴 LAST IN THE BLOCK, ON PURPOSE. A media query adds NO specificity, so a
     later plain rule of equal weight wins at every width including this one.
     This project has measured that going wrong: `.pos-pick`'s entire phone
     layout sat in a media query above the plain rule that overrode it and had
     NEVER run on a phone in its life. **Order, not weight.**

     🔴 AND A MIXER ON A PHONE IS A REDESIGN, NOT A REFLOW. Asked 2026-09-21:
     *"max 2 buttons side by side. knobs sepate row, single buttons centerd,
     slider / controls columns: flatten, controls on top. align all to
     bottom"*. A strip is 46 px of control and 300 mm of panel; at 390 px the
     eight of them are a horizontal scroll nobody can work, so the strip itself
     changes shape. */
````

<a id="twelve-27"></a>
## twelve-27: demo/twelve/index.html, style, line 345

````css
    /* 🔴 THE RACK STILL SCROLLS AND THE LANE STILL DOES NOT. Corrected
       2026-09-21: *"keep overflow channels and stikcu transport"*. The first
       attempt stacked everything into one column, which loses the thing that
       makes a mixer legible on a phone: eight strips you swipe through, with
       the transport always to hand. **A phone needs the strip to change shape,
       not the rack to stop being a rack.** So nothing here touches
       `.rack-wrap`, `.rack-row` or the lane's position.

       🔴 FLATTEN THE FADER AND ITS BUTTONS, CONTROLS ON TOP. `column-reverse`
       rather than reordering the DOM: the markup is fader then buttons because
       that is the reading order on a desk, and a phone wants the opposite
       without the page holding two ideas about which is which. */
````

<a id="twelve-28"></a>
## twelve-28: demo/twelve/index.html, style, line 357

````css
    /* 🔴 ONLY THE STRIP'S FADER BLOCK REVERSES. `column-reverse` was applied to
       the lane's rows too and reversed their CONTENTS: the fast forward arrow
       came out above rewind, and record below stop and play. A reversal that is
       right for one row's meaning is wrong for another's, and the lane's rows
       are already in panel order. */
````

<a id="twelve-29"></a>
## twelve-29: demo/twelve/index.html, style, line 365

````css
    /* 🔴 TWO ABREAST, AND A LONE ONE CENTRED. A grid rather than a wrapping
       flex, because only a grid can say "this last item spans both columns".
       An odd last child has no partner, so it takes the whole row and centres
       in it rather than sitting left with a hole beside it. */
````

<a id="twelve-30"></a>
## twelve-30: demo/twelve/index.html, style, line 369

````css
    /* ⚠️ A STRIP'S OWN BUTTONS STAY ONE COLUMN. Corrected 2026-09-21: *"buttons
       on single col only on mobile"*. Two abreast is a CEILING for the rows in
       the master lane, which hold four function keys and three transport
       buttons; a channel's MUTE, MAIN, SUB and SOLO are a vertical run at fixed
       heights on the fader scale, and folding them into a 2 by 2 block loses
       the one thing their order carries. */
````

<a id="twelve-31"></a>
## twelve-31: demo/twelve/index.html, style, line 377

````css
    /* 🔴 EVERY BUTTON IS ONE COLUMN. Said twice, the second time with a
       screenshot: *"butotns in 1 col only!"*. Two abreast was read out of *"max
       2 buttons side by side"* as a ceiling worth using, and it was not: a
       phone strip is one narrow column and a 2 by 2 block of function keys in
       it is a grid inside a column, which reads as neither.
       ⚠️ **NOTHING HERE OVERRIDES A COLUMN, IT JUST STOPS IMPOSING A GRID.**
       `.strip-btns` is already a flex column and the lane's rows become one
       above, so the fix is a deletion rather than a rule. */
````

<a id="twelve-32"></a>
## twelve-32: demo/twelve/index.html, style, line 390

````css
    /* 🔴 THE WHOLE STRIP SITS AT THE BOTTOM, NOT JUST ITS FADER. Reported
       2026-09-21 with a screenshot: *"align content to bottom"*, showing pan
       and REC at the top, a hole of empty strip, then the buttons and the
       fader. That hole is `margin-top: auto` on the fader block doing exactly
       what it says: pushing ONE element down and leaving everything above it
       where it was.
       ⚠️ ON A DESKTOP THAT IS RIGHT AND HERE IT IS NOT, which is why this is in
       the media query rather than a change to the rule above. A desk strip has
       knobs at the top and the fader in a lower block with air between them,
       because the panel does. A phone strip is one tall column with nothing to
       separate, so the air belongs above all of it. */
````

<a id="twelve-33"></a>
## twelve-33: demo/twelve/index.html, style, line 401

````css
    /* ⚠️ THE ZERO FOLLOWED THE AUTO MARGIN ONTO THE FIRST CHILD, 2026-09-29.
       It said `.pos-crow` for as long as the desk rule did, and leaving it
       there when the desk rule moved would have left a selector naming an
       element that no longer carries an auto margin: a rule that does nothing
       and reads as correct, which this project counts as its second most
       expensive kind of defect. The phone wants the air above ALL of it and
       `justify-content: flex-end` already says so, so the zero is what keeps
       one idea in one place rather than two saying the same thing. */
````

<a id="twelve-34"></a>
## twelve-34: demo/twelve/index.html, inline script, line 428

````js
  /**
   * 🔴 WHAT THIS PAGE IS. One channel of a TASCAM Model 12, on screen, moving
   * when the real one moves. Asked for 2026-09-20: *"make new rack demo with
   * out hw layouts. start with model 12 single strip (1)"*.
   *
   * 🔴 AND IT IS BUILT ON MEASUREMENTS RATHER THAN ON A MANUAL, WHICH IS THE
   * ONLY REASON IT CAN BE RIGHT. TASCAM publishes no note numbers and no
   * controller numbers for Mackie Control mode at any firmware revision. Every
   * number below was read off the wire through `/dump/` on 2026-09-20 from a
   * Model 12 on firmware 1.11, and written down in
   * `research/measured-devices-2026-09-20.md`.
   *
   * 🔴 THREE THINGS ABOUT THIS ONE CHANNEL ARE NOT WHAT A LAYOUT WOULD ASSUME,
   * and getting any of them wrong gives a control that looks live and is wrong:
   *   1. **PAN is RELATIVE, not absolute.** CC 16 sends a step and a direction,
   *      never a position, so a knob that takes the value as a position sits at
   *      4 and never moves again.
   *   2. **The fader is 7 bit wearing a 14 bit message.** Pitch bend with the
   *      low byte a COPY of the high byte, so it has 128 positions, not 16384.
   *   3. **REC sends no release and SOLO and MUTE do.** Two buttons on one
   *      mixer, both momentary in the protocol, disagreeing on the wire.
   */
````

<a id="twelve-35"></a>
## twelve-35: demo/twelve/index.html, inline script, line 451

````js
/**
 * 🔴 THE BIGGEST STEP THIS PAGE WILL TAKE FROM ONE MESSAGE.
 *
 * Reported 2026-09-20: *"and i am seeing ui moving on pan"*, then *"just pan
 * range seems wrong"*. So the direction and the binding are both right and the
 * SCALE is not, which narrows it to one number.
 *
 * 🔴 WHY IT IS NEEDED: `0x3F` AND `0x7F` ARE ALMOST CERTAINLY ACCELERATION, NOT
 * DISTANCE. In the 525 message capture they appeared **exactly 48 times each**,
 * a symmetry no hand produces by turning 63 detents. Taken literally, one of
 * them moves the knob half its range in a single message, which is precisely
 * the wrong range being reported.
 * ⚠️ **8 IS A GUESS AND IS MARKED AS ONE.** What would settle it: turn the pan
 * slowly through a known number of detents in front of `/dump/` and count the
 * messages. If one detent is `0x04`, then 32 detents end to end is 128 and the
 * raw magnitude is already right for slow turns, and only the fast values need
 * capping. **Until that is measured this is a reasonable cap, not a fact.**
 */
````

<a id="twelve-36"></a>
## twelve-36: demo/twelve/index.html, inline script, line 471

````js
/**
 * 🔴 HOW MANY SCREEN UNITS ONE RAW STEP IS WORTH, AND THE MEASUREMENT BEHIND IT
 * IS NOW DONE.
 *
 * MEASURED 2026-09-21, ten slow detents clockwise on channel 1's pan:
 * **ten messages, every one `0x42`.** Bit 6 set, magnitude 2, no variation at
 * all. **One detent is worth 2, always**, and there is no acceleration at
 * hand speed.
 *
 * ✅ **SO THIS NUMBER IS NO LONGER A FUDGE, IT IS A DESIGN CHOICE**, and the
 * two are worth telling apart. At 2 the raw magnitude passes straight through
 * and a full 0 to 127 sweep takes **64 detents**, which is nearly three turns
 * of a typical 24 detent encoder. At 2 units per detent it is 32 detents, a
 * little over one turn, which is what a pan knob should feel like.
 * ⚠️ **THE EARLIER 0.5 WAS FITTED TO A COMPLAINT AND HAPPENED TO BE THE SLOWEST
 * OF THE THREE.** It gave 1 unit per detent and 127 detents end to end, which
 * is why the knob felt like it never arrived.
 *
 * ⚠️ **AND `MAX_STEP` IS STILL EARNING ITS PLACE.** A slow turn sends 2 every
 * time, but the original 525 message capture held `0x3F` and `0x7F` forty eight
 * times each. Those are not 63 detents at hand speed, so they are what the
 * encoder sends when it is spun, and without a cap one of them jumps the knob
 * half its range. **Slow motion is measured, fast motion is still inferred.**
 */
````

<a id="twelve-37"></a>
## twelve-37: demo/twelve/index.html, inline script, line 501

````js
    /**
     * 🔴 NO READOUT, AND `null` RATHER THAN AN OMITTED FIELD so the shell knows
     * it was decided. Asked 2026-09-21: *"rm readouts from rack"*.
     * ⚠️ **THE CONTROLS ARE THE READOUT ON THIS PAGE.** A knob shows its value
     * above it, a fader shows its own, a pad is lit or it is not. Eight cells
     * repeating that in words were a second copy of what the strip already
     * says, and two of them (`last` and `dir`, the raw byte beside this page's
     * reading of it) existed to debug the pan. **That debugging is done**: one
     * detent is magnitude 2, measured over ten slow clicks.
     */
````

<a id="twelve-38"></a>
## twelve-38: demo/twelve/index.html, inline script, line 512

````js
    /**
     * 🔴 NO DECLARED CONTROL. The primary one is a presence button built below
     * and spliced into `.pos-controls`, which is where `demo/verify.mjs`
     * presses. A status control outside that row is a control no harness
     * drives, and every check behind it would go silent while the suite stayed
     * green.
     * ⚠️ **IT IS STILL CONTROL 0, WHICH IS THE ONE THAT TAKES `settleMs`.** The
     * row holds exactly one button, so nothing can get in front of it.
     * ⚠️ NO RESET BUTTON, AND THE PROBLEM IT ANSWERED HAS NOT GONE AWAY. A
     * relative encoder has no position to ask for, so turning the real pan
     * while this page is shut leaves the two disagreeing forever with nothing
     * here able to detect it. What makes its absence affordable is that a
     * reload does the same thing, and that the knob no longer EATS the
     * disagreement: the accumulator keeps its overshoot, so turning back
     * retraces rather than drifting further every time.
     */
````

<a id="twelve-39"></a>
## twelve-39: demo/twelve/index.html, inline script, line 532

````js
  /**
   * 🔴 THE MACKIE CONTROL MAP IS ARITHMETIC, NOT A TABLE, AND THAT IS WHY EIGHT
   * STRIPS COST ALMOST NOTHING. Channel 1 was measured end to end through
   * `/dump/`: PAN on CC 16, REC note 0, SOLO note 8, MUTE note 16, fader on
   * pitch bend channel 1. The protocol runs each of those in a block of eight,
   * and **SOLO on channel 2 was measured at note 9**, which is the second data
   * point that turns one number into a stride.
   * ⚠️ **SO SEVEN OF THESE EIGHT STRIPS ARE INFERRED FROM A STRIDE**, and that
   * is a weaker claim than channel 1, which was read byte by byte. It is a good
   * inference: one note number is a coincidence and two are a stride, and every
   * published Mackie map agrees. It is still an inference.
   */
````

<a id="twelve-40"></a>
## twelve-40: demo/twelve/index.html, inline script, line 546

````js
  /**
   * 🔴 EIGHT FADERS AND TEN INPUTS, WHICH IS NOT A CONTRADICTION. Channels 1 to
   * 6 are mono and 7/8 and 9/10 are stereo pairs sharing one fader, so the
   * mixer has eight strips and ten inputs. Read off the panel at 800 dpi:
   * `plans/plan-panel-layouts.md`.
   * ⚠️ THE LEGENDS DIFFER ON THE LAST TWO AND THE LAYOUT DOES NOT. Their gain
   * scale reads differently and their pan knob is printed BAL rather than PAN,
   * because panning a stereo pair is balancing it. Every control is in the same
   * place on all eight.
   */
````

<a id="twelve-41"></a>
## twelve-41: demo/twelve/index.html, inline script, line 558

````js
  /**
   * 🔴 TWO BUTTONS, AND MAIN AND SUB LEFT ON 2026-09-21. Asked: *"Rm disabled
   * controls"*. They had been drawn and switched off for a reason this file
   * argued at length: they are on the panel, TASCAM's own enabled-controls
   * diagram prints them white while MUTE and SOLO are blue, and leaving them
   * out puts MUTE next to SOLO, which is false about the panel.
   * ⚠️ **AN INSTRUCTION SUPERSEDES IT, AND THE PANEL FACT IS NOT LOST**: it is
   * read at 800 dpi in `plans/plan-panel-layouts.md`, which is where somebody
   * asking what is printed on a Model 12 should be looking anyway. What this
   * page draws now is what this page can move.
   * ⚠️ **AND THE COST IS TWO CHECKS, WHICH IS WHY IT IS WRITTEN DOWN.** The
   * pad count assert says two rather than four, and
   * *the lane starts level with the first button in the column* described an
   * alignment that only existed while four buttons spanned a fader.
   */
````

<a id="twelve-42"></a>
## twelve-42: demo/twelve/index.html, inline script, line 582

````js
      // ⚠️ EVERY STRIP SAYS `pan`, INCLUDING THE STEREO PAIRS. It said `bal` on
      // 7/8 and 9/10 for a while, because panning a stereo pair is balancing it
      // and the panel legend reads `PAN C BAL`. Corrected 2026-09-21 by
      // somebody looking at the mixer: *"7/8 and 9/10 still are pan"*. **The
      // knob is called PAN on all eight**, and the extra word on two of them is
      // a scale marking rather than a different name.
      // ⚠️ NO CONTROLLER NUMBER UNDER THE KNOB, and none under the faders
      // either. A mixer does not print CC numbers on its own panel. The number,
      // the channel and whether it was measured or inferred are all on the
      // hover, which is where somebody debugging a binding will look.
````

<a id="twelve-43"></a>
## twelve-43: demo/twelve/index.html, inline script, line 617

````js
      /**
       * ⚠️ NO INVISIBLE HAND HERE. It was on every fader for half an hour while
       * the component was being got right, and it came off on 2026-09-21: *"rm
       * invisble hand from rack"*. **This page mirrors a mixer**, and a mixer
       * has no button that makes its own faders move. The option stays on
       * `fader.mjs` and is shown in `/kit/`, which is where a control that
       * exists for testing belongs.
       */
````

<a id="twelve-44"></a>
## twelve-44: demo/twelve/index.html, inline script, line 633

````js
  /**
   * 🔴 THE TRANSPORT, AND THREE OF THE FIVE WERE MEASURED. Off the desk through
   * `/dump/`: STOP is note 93, PLAY 94, RECORD 95, each sending `7F` then `00`
   * cleanly. Mackie puts rewind and fast forward at 91 and 92 immediately
   * below, so those two are **inferred from the block**, exactly as seven of
   * the eight strips are.
   * ⚠️ **THE TRANSPORT RECORD BUTTON SENDS A RELEASE AND THE CHANNEL REC BUTTON
   * DOES NOT.** Two buttons on one mixer, both called record, disagreeing on
   * the wire. It costs nothing here because a press toggles and releases are
   * ignored, which is the rule that made REC need no special case either.
   */
````

<a id="twelve-45"></a>
## twelve-45: demo/twelve/index.html, inline script, line 644

````js
  /**
   * 🔴 THE MASTER COLUMN IN PANEL ORDER, WHICH IS THREE ROWS AND NOT ONE.
   * Described 2026-09-21: *"fns, jog and < >, then trans stop playpause rec"*,
   * and it matches the panel read at 800 dpi: the function keys, then MULTI JOG
   * with MENU and the two locate arrows, then the transport underneath.
   * ⚠️ **THE LOCATE ARROWS ARE NOT THE TRANSPORT.** They sit with the jog for
   * moving the playhead, which is why they were drawn in the wrong row until
   * somebody looked at the object.
   *
   * 🔴 GLYPHS, NOT WORDS, AND GEOMETRIC ONES RATHER THAN THE MEDIA CONTROL
   * BLOCK. Reported 2026-09-21: *"<< >> becoming emoji, do not"*. `⏪ ⏩ ⏹ ⏯ ⏺`
   * are U+23E9 to U+23FA, and every one of them **defaults to EMOJI
   * presentation**: macOS paints them full colour, at a different size and on a
   * different baseline from the mono face around them.
   * ⚠️ **A VARIATION SELECTOR WOULD BE THE OTHER FIX AND IS WORSE.** Appending
   * U+FE0E asks for text presentation and is honoured inconsistently, so it
   * would look right here and wrong on somebody else's machine. The geometric
   * shapes below have **no emoji form at all**, so there is nothing to ask for.
   * ⚠️ AND `▶` U+25B6 IS NOT SAFE EITHER, despite being geometric: it has an
   * emoji presentation. `►` U+25BA does not, which is why it is the one here.
   * ⚠️ THE FACE CARRIES THE GLYPH AND THERE IS NO BOTTOM LABEL, which is the
   * one case where a pad's face earns its text: a glyph is read at a glance,
   * and that is exactly what a face label is for.
   */
````

<a id="twelve-46"></a>
## twelve-46: demo/twelve/index.html, inline script, line 674

````js
  /**
   * 🔴 THREE FUNCTION KEYS, AND F1 LEFT ON 2026-09-21 WITH THE OTHER DISABLED
   * CONTROLS. Asked: *"Rm disabled controls"*. TASCAM's enabled-controls
   * diagram prints F1 white while F2, F3 and F4 are blue, because F1 is the way
   * OUT of DAW control mode, so it sends nothing this page could ever light.
   * ⚠️ The panel fact stands and lives in `plans/plan-panel-layouts.md`. What
   * is drawn here is what can move.
   * ✅ **AND THE THREE THAT ARE LEFT ARE MEASURED, ONE PRESS AT A TIME,
   * 2026-09-21.** F2 is note **86**, F3 is **46**, F4 is **47**.
   * 🔴 **THEY ARE NOT A CONTIGUOUS BLOCK, AND THAT IS THE INTERESTING PART.**
   * Everything else on this mixer runs in eights. **46 and 47 are Fader Bank
   * Left and Right in the Mackie map**, which is exactly what a desk with ten
   * inputs and eight Mackie strips needs, so TASCAM has put banking on two of
   * its function keys rather than inventing its own numbers.
   * ⚠️ AN EARLIER CAPTURE OF THIS ROW GAVE 82, 84 AND 85 from a different set of
   * buttons pressed as a group. **Those three are still unmapped** and are not
   * drawn, because binding by guess gives a control that looks live and lights
   * the wrong thing.
   */
````

<a id="twelve-47"></a>
## twelve-47: demo/twelve/index.html, inline script, line 697

````js
  /**
   * 🔴 THE PANEL IS A KIT COMPONENT, AND THIS MIXER IS THE CALLER THAT MADE THE
   * CASE OPTIONAL AND THE SIDE AN OPTION. `cased: false` because there is no
   * outer card here at all: the eight strips and the master lane each paint
   * their own, glued at the seams, so the box around them must add nothing.
   * `side: 'right'` puts the fixed column and its 1 px border on the mirror
   * side from `/evo/`'s.
   * ⚠️ `flow: false`, BECAUSE THE SCROLLER'S OWN CHILDREN ARE THE CONTENT.
   * `/evo/` needs a column inside its strip so that a row of controls can sit
   * above a keyboard and one of them can absorb the slack. Here the eight
   * channel strips ARE the strip's children and there is nothing to stack, so a
   * flow would be a box that exists to be measured.
   * ⚠️ AND THEREFORE NO ABSORBER, WHICH IS WHY THE COMPONENT REPORTS RATHER
   * THAN THROWS. This panel's slack is 25.00 px, MEASURED, and it becomes AIR
   * by `margin-top: auto` on each channel's `.pos-crow`: a claim about where a
   * fader block sits on a Model 12 panel rather than a slack policy that
   * happens to work. A component that refused a panel with no `.panel-grow`
   * would refuse two of its three callers.
   * ⚠️ **AND THE FOUR NAMES ARE THIS PAGE'S OWN, CARRIED BESIDE THE SHARED
   * ONES.** Nineteen rules in this file name `.rack-row` or `.rack-lane` and
   * four of them are inside a media query the harness cannot reach, so keeping
   * both classes is what made this conversion move no selector at all.
   */
````

<a id="twelve-48"></a>
## twelve-48: demo/twelve/index.html, inline script, line 722

````js
    /* ⚠️ `panel-case` ON THE FIXED COLUMN, WHICH IS THE ONE PLACE AN UNCASED
       PANEL STILL NEEDS A CARD. With no case around the instrument the lane
       would have no ground at all, so it is its own case: the class brings the
       `--card` ground and the 1 px border, and the three declarations this
       page makes on top of it are each a fact about a Model 12. See
       `.rack-lane`. */
````

<a id="twelve-49"></a>
## twelve-49: demo/twelve/index.html, inline script, line 731

````js
  /* ⚠️ NO `wrap` HERE ANY MORE. It was read for one thing, `unit.insertBefore(
     brands, wrap)`, and the nameplate is inside the master lane now. */
````

<a id="twelve-50"></a>
## twelve-50: demo/twelve/index.html, inline script, line 739

````js
  /**
   * 🔴 THE FX FADER IS THE MASTER AND IT IS ON CHANNEL 9. Measured: a full
   * sweep arrived as `E8 03 03` up to `E8 7F 7F`, and `E8` is pitch bend on
   * channel index 8. TASCAM's documentation says the FX fader acts as the DAW
   * master and the panel diagram prints it blue while SUB and MAIN are not.
   * ⚠️ IT HAS NO PAN AND NO BUTTONS, so it is a fader in a strip of its own
   * rather than a ninth channel.
   */
````

<a id="twelve-51"></a>
## twelve-51: demo/twelve/index.html, inline script, line 751

````js
  /**
   * 🔴 THE MASTER LANE DOES NOT SCROLL AND THE CHANNELS DO. Asked 2026-09-21:
   * *"add jog / transport / fx lane to the left. its sticky, rest of channels
   * are overflow scrolly"*, corrected to the right a moment later.
   * ⚠️ **IT IS A SIBLING OF THE SCROLLER, NOT `position: sticky` INSIDE IT.**
   * Sticky would work and would cost more: a sticky child needs a background
   * or the strips show through it, it needs a z-index against its own
   * neighbours, and it lands on top of the scrollbar. Two flex children, one
   * scrolling and one not, needs none of that.
   * ⚠️ AND THE ORDER MIRRORS THE PANEL: the jog and the transport sit above the
   * faders in the master column, not beside them.
   */
````

<a id="twelve-52"></a>
## twelve-52: demo/twelve/index.html, inline script, line 763

````js
  /**
   * 🔴 THE SUB AND MAIN FADERS LEFT ON 2026-09-21. Asked: *"Rm disabled
   * controls"*. They had stood beside the FX fader since *"add sub and main
   * sliders to right of fx but disabled"*, drawn and switched off because
   * TASCAM's enabled-controls diagram prints them WHITE while the FX fader is
   * blue: in DAW control mode the FX fader is the master and those two move the
   * analogue outputs only, so nothing of them ever reaches MIDI.
   * ⚠️ **THE ARGUMENT FOR KEEPING THEM WAS THAT THE FX FADER NOW SITS AT THE
   * EDGE OF THE PANEL, WHICH IS FALSE ABOUT THE MIXER.** That is still true and
   * an instruction supersedes it, exactly as it did for MAIN and SUB in the
   * channel column. The panel is read at 800 dpi in
   * `plans/plan-panel-layouts.md` and the drawing is not the record of it.
   * ⚠️ **AND IT COSTS ONE ASSERT**, *sub and main stand beside the FX fader,
   * disabled, ending on its line*, which had three claims in it: that there
   * were two of them, that both were off, and that all three faders ended on
   * one line. Nothing that assert measured survives its subjects, and the
   * every-fader-ends-on-one-line claim is still made by the check that compares
   * a channel fader against the FX fader.
   */
````

<a id="twelve-53"></a>
## twelve-53: demo/twelve/index.html, inline script, line 783

````js
  /* The component's fixed column, which on this page IS the master lane. The
     comment above the panel says why it is a sibling of the scroller rather
     than `position: sticky` inside it, and that reasoning is now on
     `.panel-fixed` in `shell.css` because both board pages reached it
     independently. */
````

<a id="twelve-54"></a>
## twelve-54: demo/twelve/index.html, inline script, line 790

````js
  /* ⚠️ ITS OWN CLASS, NOT `.pos-crow`. The phone rules turn every `.pos-crow`
     in this lane into a COLUMN, which is right for the jog above a transport
     and wrong for a row of faders: stacked, they stop being a row and the lane
     grows by its own height each time. It holds one fader today and keeps the
     class, because what the rule is about is the lane's shape rather than the
     count. */
````

<a id="twelve-55"></a>
## twelve-55: demo/twelve/index.html, inline script, line 800

````js
  /**
   * 🔴 `MODEL 12`, IN THE TOP RIGHT CORNER OF THE MASTER LANE, AND `TASCAM` IS
   * GONE. Asked 2026-09-21: *"Move model 12 to roght panel top right corner. No
   * brand name"*, and before that *"put model 12 to right panel, no tascam,
   * right aling"*.
   * ⚠️ **IT NARROWS THE MORNING'S INSTRUCTION RATHER THAN CONTRADICTING IT.**
   * *"replica names always in uppercase. add full name evolution mk-425c"* is
   * why this panel got a name at all, and the name is still uppercase and still
   * printed by the shared component. The MAKER is the half being dropped, on
   * this page only. `/circuit/` and `/evo/` keep both halves and nothing here
   * reaches them.
   * 🔴 **AND IT MOVED OUT OF THE PAGE'S FLOW INTO THE INSTRUMENT.** It used to
   * span the whole mixer above the boxes, which is where a replica with no case
   * has to put a plate that belongs to the WHOLE object. One name belongs to
   * one part, and the part is the master column: on the real panel `TASCAM` is
   * printed across the top of the screen operation section, in that column.
   * ⚠️ **SO THE ASSERT ABOUT SPANNING IS GONE AND ITS REPLACEMENT MEASURES A
   * CORNER.** The old one read both far edges and the drop against the page's
   * rhythm, which are claims about a plate that spans two boxes with air under
   * it. Inside a column the claim is that it is at the top and flush right.
   * ⚠️ AND EVERY RECT ON THIS PAGE MOVES UP BY THE NAMEPLATE AND ITS 10 px GAP,
   * which is the same 21.0 px the morning's change moved them DOWN, arriving
   * back. The lane gains the plate's own height instead.
   */
````

<a id="twelve-56"></a>
## twelve-56: demo/twelve/index.html, inline script, line 828

````js
  /**
   * 🔴 MULTI JOG IS CC 60 AND IT IS THE CLEANEST CONTROL ON THE MIXER.
   * MEASURED 2026-09-21: 20 messages, and **only two values ever**, `0x01` and
   * `0x41`. Twelve clockwise, eight counter clockwise, step size always 1, no
   * acceleration at all. That is a textbook Mackie jog wheel and CC 60 is
   * exactly where Mackie puts it.
   * 🔴 **AND IT MAKES THE PAN KNOB'S NUMBERS STRANGE, WHICH IS WORTH RECORDING
   * RATHER THAN EXPLAINING AWAY.** Pan sends magnitudes of 2, 4 and 63 on the
   * same mixer through the same protocol. Two relative encoders, one perfectly
   * clean and one not, so the 63 is far more likely to be ACCELERATION than 63
   * detents. `MAX_STEP` and `PAN_SCALE` are the fudges that stand in for a
   * measurement nobody has taken yet; this control needs neither.
   */
````

<a id="twelve-57"></a>
## twelve-57: demo/twelve/index.html, inline script, line 892

````js
  /**
   * 🔴 THE ACCUMULATOR IS NOT CLAMPED. THE DISPLAY IS.
   *
   * The other half of the same report: turning past the end and back did not
   * retrace. A clamped accumulator DISCARDS the steps taken past 0, so the way
   * back starts moving immediately while the real knob is still out at the far
   * left, and the two never meet again.
   * ⚠️ **A KNOB THAT LOSES YOUR OVERSHOOT IS WORSE THAN ONE THAT LAGS**, because
   * the error is permanent: every excursion past an end leaves the screen and
   * the desk further apart, and nothing on this page can detect it.
   * ⚠️ THE OVERSHOOT IS BOUNDED AT ONE RANGE EITHER SIDE. Unbounded, a spin
   * would need the same spin back before anything moved, which is a control
   * that appears dead. One range is enough to make an honest turn retrace and
   * short enough to recover from by hand.
   */
````

<a id="twelve-58"></a>
## twelve-58: demo/twelve/index.html, inline script, line 911

````js
  /**
   * ⚠️ IT WRITES NOTHING NOW AND IS KEPT ON PURPOSE. Every path that changes a
   * control calls it, so it is the one place a future readout, a counter or a
   * tap would hook into. Deleting it would mean finding all eleven call sites
   * again the first time this page needs to say something.
   */
````

<a id="twelve-59"></a>
## twelve-59: demo/twelve/index.html, inline script, line 929

````js
  /**
   * 🔴 EVERY MESSAGE GOES DOWN THE TAP AS WELL AS INTO THE STRIP. Added
   * 2026-09-21 after a capture came back empty: the desk had been worked in
   * front of THIS page, and only `/dump/` writes to `.tap/midi.jsonl`, so the
   * gestures were gone. **A page that binds hardware should also record it**,
   * or every measurement means going back to the dumper and doing the gesture
   * twice.
   * ⚠️ IT IS THE DEV SERVER ONLY and it is off under `?selfcheck=1`, both for
   * the reasons written on `/dump/`: there is no `/_tap` route in
   * `workers/view`, and a harness writing invented bytes into a capture file
   * makes every count in it a mixture.
   */
````

<a id="twelve-60"></a>
## twelve-60: demo/twelve/index.html, inline script, line 956

````js
  /**
   * 🔴 WHAT ARRIVED, BESIDE THE DESK IT MOVED. A kit module: three pages grew
   * one of these on the same day, and the rule about a clock byte being
   * counted rather than listed lives in there rather than in each of them.
   */
````

<a id="twelve-61"></a>
## twelve-61: demo/twelve/index.html, inline script, line 961

````js
  /* ⚠️ THE EMPTY LINE NAMED A BUTTON THAT NO LONGER EXISTS, AND A SCREENSHOT
     CAUGHT IT RATHER THAN THE SUITE. It read `press Listen, then move something
     on the desk` for as long as it took to replace `Listen` with the status
     button, which is this project's most repeated defect in its cheapest form:
     nothing type-checks a sentence, so a control's name in prose goes stale
     silently. It names the button by what it SAYS now, which is what somebody
     looking at the page has to find. */
````

<a id="twelve-62"></a>
## twelve-62: demo/twelve/index.html, inline script, line 971

````js
  /* 🔴 ON THE PATCHBAY ON A PRESS OF Join, NEVER ON LOAD (plans/plan-routing-migration.md
     step 5). The instruments plugged into this machine are announced as devices,
     keyed by their ports and never by their names, so `/patchbay/` can draw and
     link them. Join sits outside `.pos-controls` and asks for MIDI first
     when Listen has not. `/shell/midi-node.mjs` has the rest. */
````

<a id="twelve-63"></a>
## twelve-63: demo/twelve/index.html, inline script, line 980

````js
  /**
   * One message from the desk, routed by arithmetic.
   *
   * 🔴 NOTHING HERE LOOKS ANYTHING UP. A controller number, a note number and a
   * pitch bend channel each carry the strip index inside them, so eight strips
   * need no table and cannot drift out of step with each other. **A table is
   * what a stride looks like after somebody has typed it out wrong once.**
   * @param {number[]} b raw bytes
   */
````

<a id="twelve-64"></a>
## twelve-64: demo/twelve/index.html, inline script, line 993

````js
    /**
     * 🔴 A ROW FOR EVERY MESSAGE, BEFORE ANY OF THE ARITHMETIC BELOW. Asked
     * 2026-09-21: *"add midi event logs to circuit and rack demos"*.
     * 🔴 **AND IT MATTERS MORE ON THIS PAGE THAN ON ANY OTHER, BECAUSE THIS
     * DESK SENDS RELATIVE CLICKS.** A pan encoder's `0x44` is four counter
     * clockwise and reads as sixty eight if all you have is a number. The
     * panel above is an interpretation of these bytes; the column of hex is
     * the bytes. Seeing both is how the interpretation was checked in the
     * first place.
     * ⚠️ EVERYTHING GETS A ROW, INCLUDING WHAT THIS PAGE DROPS. The routing
     * below returns early on any channel but 1, so a log fed after it would be
     * silent about exactly the traffic somebody is hunting.
     */
````

<a id="twelve-65"></a>
## twelve-65: demo/twelve/index.html, inline script, line 1013

````js
      // ⚠️ THE HIGH BYTE IS THE VALUE. The low byte is a copy of it and carries
      // nothing, measured: 74 pitch bends, every one with both bytes equal.
````

<a id="twelve-66"></a>
## twelve-66: demo/twelve/index.html, inline script, line 1024

````js
    // ⚠️ THE JOG IS CHECKED BEFORE THE PAN BLOCK. CC 60 is nowhere near 16 to
    // 23, but putting it first keeps every relative control in one place.
````

<a id="twelve-67"></a>
## twelve-67: demo/twelve/index.html, inline script, line 1031

````js
      // 🔴 NO CAP AND NO SCALE. This one sends 1 per detent and means it, so a
      // correction here would be inventing a problem the control does not have.
````

<a id="twelve-68"></a>
## twelve-68: demo/twelve/index.html, inline script, line 1041

````js
      // 🔴 BIT 6 IS THE DIRECTION, THE LOW SIX BITS ARE THE STEP. A value of
      // 0x44 is not 68, it is four counter clockwise.
````

<a id="twelve-69"></a>
## twelve-69: demo/twelve/index.html, inline script, line 1057

````js
    /**
     * ⚠️ A PRESS TOGGLES AND A RELEASE IS IGNORED. Measured: MUTE and SOLO send
     * clean press and release pairs, REC sends only the press. In Mackie
     * Control the surface reports a press and the DAW decides what it means.
     * **This page is the DAW**, so it decides that a press toggles, and a rule
     * that ignores releases treats a button sending none identically.
     */
````

<a id="twelve-70"></a>
## twelve-70: demo/twelve/index.html, inline script, line 1113

````js
  /**
   * 🔴 `open()` EXPLICITLY ON EVERY PORT. `/dump/` shipped without this and read
   * a desk of four live instruments as an empty room: every port sat at
   * `connected/closed`, and there is no error, no rejected promise and no
   * console line to say so. The specification says assigning `onmidimessage`
   * opens the port, which is why the line is easy to leave out, and it is not
   * reliable across a reload with another client holding the device.
   */
````

<a id="twelve-71"></a>
## twelve-71: demo/twelve/index.html, inline script, line 1124

````js
      // ⚠️ EVERY PORT, NOT JUST THE MIXER. The strip only acts on messages it
      // recognises, and the tap should record whatever the desk sends so a
      // control nobody has mapped yet still leaves a trace.
      // (was: a /Model 12/ filter, which silently dropped everything else)
````

<a id="twelve-72"></a>
## twelve-72: demo/twelve/index.html, inline script, line 1139

````js
  /**
   * 🔴 THE BUTTON IS THE STATUS. Asked 2026-09-21: *"Convert liatwn to stayis
   * button"*, and before that *"replace listen to connected button on model"*.
   * `Listen` said what pressing would do and said nothing about whether
   * anything answered, so a visitor who pressed it and saw no movement could
   * not tell a silent mixer from an absent one. It logged a count and then went
   * on saying the same word forever.
   * ⚠️ **IT STAYS A PRESS.** A badge that opened MIDI on its own would be
   * opening it on a VISIT, which is the rule four pages here have paid for.
   * ⚠️ **AND THE WORDS ARE `WIRED`, NOT THIS PAGE'S OWN.** A Model 12 is on a
   * USB cable on this desk, so it is connected or it is not; `online` is a
   * network word and belongs to the board pages that reach a relay. The map is
   * in `presence.mjs` and five pages share it.
   */
````

<a id="twelve-73"></a>
## twelve-73: demo/twelve/index.html, inline script, line 1165

````js
      /* ⚠️ CONNECTED MEANS A PORT WITH THIS NAME ON IT, NOT THAT MIDI WAS
         GRANTED. Permission is a fact about the browser; presence is a fact
         about whether the mixer is plugged in, and reporting the first as the
         second is how a page says `connected` about an empty desk. */
````

<a id="twelve-74"></a>
## twelve-74: demo/twelve/index.html, inline script, line 1184

````js
  /**
   * 🔴 NO RESET BUTTON, AND THE PROBLEM IT ANSWERED HAS NOT GONE AWAY. Asked
   * 2026-09-21: *"can we remove reset button now?"*, and it can, but not
   * because anything was fixed.
   * ⚠️ **A RELATIVE ENCODER STILL HAS NO POSITION TO ASK FOR.** Turn the real
   * pan while this page is shut and the two disagree forever, with nothing here
   * able to detect it. That was true when the button was added and it is true
   * now.
   * ⚠️ WHAT MAKES IT AFFORDABLE IS THAT A RELOAD DOES THE SAME THING and costs
   * one gesture, and that the knob no longer EATS the disagreement: the
   * accumulator keeps its overshoot, so turning back retraces instead of
   * drifting further every time. The button was a cure for a bug as much as for
   * the protocol, and the bug is gone.
   */
````

<a id="twelve-75"></a>
## twelve-75: demo/twelve/index.html, inline script, line 1201

````js
  /**
   * 🔴 A KNOWN STREAM, TAKEN FROM THE REAL MEASUREMENT. These are bytes a Model
   * 12 actually sent, not bytes invented to make a check pass: the pan
   * histogram is the shape of the 525 message capture, and the fader values are
   * the duplicated-byte form that was photographed.
   * ⚠️ IT IS HOW THIS PAGE IS GRADED WITH NO DESK, which matters because the
   * desk is on somebody's table and the harness is not.
   */
````

<a id="twelve-76"></a>
## twelve-76: demo/twelve/index.html, inline script, line 1218

````js
    // 🔴 A SECOND STRIP, BECAUSE A STRIDE ASSERTED ON ONE CHANNEL IS NOT
    // ASSERTED AT ALL. Channel 2's SOLO is note 9 and its fader is pitch bend
    // on channel 2, both measured, and both are the arithmetic this page now
    // routes eight strips by.
````

<a id="twelve-77"></a>
## twelve-77: demo/twelve/index.html, inline script, line 1234

````js
    /**
     * 🔴 THE BUTTON IS THE STATUS, AND THE CHECK READS WHAT IT SAYS. Asked
     * 2026-09-21: *"Convert liatwn to stayis button"*. `Listen` went on saying
     * `Listen` whatever it found, so there was nothing on it to grade: the only
     * evidence of a press was two log lines.
     * ⚠️ **AND `state !== 'unknown'` IS THE HALF THAT CATCHES THE REAL TRAP.**
     * `unknown` is where the badge is BORN, and only a press moves it. So this
     * goes red if the button ever leaves `.pos-controls`, which is where
     * `demo/verify.mjs` presses and where a status control that nothing drives
     * would take every check behind it silent.
     * ⚠️ **IT READS THE RENDERED WORD, NOT THE STATE NAME.** The state is
     * `offline` and the word is `not connected`, and it is the word a visitor
     * has. A check on the state alone would stay green with `says: WIRED`
     * deleted and the badge back to network language.
     */
````

<a id="twelve-78"></a>
## twelve-78: demo/twelve/index.html, inline script, line 1250

````js
      /* 🔴 `pres.state()`, NOT `pres.state`. It is a FUNCTION on the presence
         api (`state: () => now`) and `createPresenceButton` hands it through a
         getter, so `pres.state` is the function itself. MEASURED on the first
         run of this check: `pres.state !== 'unknown'` is true of a function
         whatever the badge says, so the whole first clause passed vacuously and
         the detail line read `state () => now`. **A comparison against a
         function is a comparison that cannot fail**, which is the quietest way
         to write a green check that measures nothing. */
````

<a id="twelve-79"></a>
## twelve-79: demo/twelve/index.html, inline script, line 1266

````js
    // 🔴 THE THREE MEASURED FACTS, ASSERTED AS BEHAVIOUR RATHER THAN AS NUMBERS.
````

<a id="twelve-80"></a>
## twelve-80: demo/twelve/index.html, inline script, line 1270

````js
    // 🔴 AND THE NEGATIVE HALF: a page reading those bytes as positions would
    // leave the knob sitting on the last value it saw, which is 4.
    // 🔴 AND NO SINGLE MESSAGE MOVES IT MORE THAN THE CAP. The known stream
    // carries 0x3F and 0x7F, the two values suspected of being acceleration, so
    // this fails the moment somebody takes the cap out.
````

<a id="twelve-81"></a>
## twelve-81: demo/twelve/index.html, inline script, line 1278

````js
    /**
     * 🔴 TURNING PAST AN END AND BACK MUST RETRACE. This is the reported bug as
     * an assert: drive the knob hard into 0, keep driving, then return the same
     * distance. A clamped accumulator fails it, because the steps spent past
     * the end are gone and the way back starts from 0 immediately.
     */
````

<a id="twelve-82"></a>
## twelve-82: demo/twelve/index.html, inline script, line 1286

````js
      /**
       * ⚠️ 20 MESSAGES, NOT 40, AND THE NUMBER MATTERS. Each is magnitude 4
       * scaled to 8, so 20 is 160 units: comfortably past the 64 needed to
       * reach 0 from centre, and inside the one range of overshoot the
       * accumulator keeps. **40 was 320 units and hit the guard rail**, which
       * made this read red on a page where nothing was wrong. A test that
       * drives five times past an end is testing the clamp, not the retrace.
       */
````

<a id="twelve-83"></a>
## twelve-83: demo/twelve/index.html, inline script, line 1313

````js
    // 🔴 REC SENDS NO RELEASE AND THE OTHER TWO DO, MEASURED ON ONE MIXER.
    // One press each in the known stream, so all three are on.
````

<a id="twelve-84"></a>
## twelve-84: demo/twelve/index.html, inline script, line 1318

````js
    /**
     * 🔴 THE NEGATIVE HALF, AND IT IS THE REPORTED BUG: a second press and
     * release turns it off again. A page that acted on the RELEASE would fail
     * this, because the release would have already switched it off and the
     * second press would switch it back on.
     */
````

<a id="twelve-85"></a>
## twelve-85: demo/twelve/index.html, inline script, line 1329

````js
    // 🔴 FOUR, NOT THREE: the toggle check above presses mute a second time.
    // ⚠️ A COUNT IN AN ASSERT THAT A LATER CHECK FEEDS IS A COUNT THAT WILL GO
    // STALE, and this one did the moment the second press was added.
````

<a id="twelve-86"></a>
## twelve-86: demo/twelve/index.html, inline script, line 1334

````js
    /**
     * 🔴 THE STRIDE IS THE WHOLE CLAIM OF THIS PAGE NOW, so it is asserted
     * rather than left to the arithmetic looking right. Channel 2's SOLO is
     * note 9 and its fader is pitch bend on channel 2, both measured on the
     * desk, and both must land on strip 2 and on nothing else.
     * ⚠️ **AND THE NEGATIVE HALF IS THE POINT**: strip 1 must be untouched by
     * them. An off by one in the routing would light the right control on the
     * wrong channel, which looks perfectly normal until somebody with eight
     * faders notices the wrong one moving.
     */
````

<a id="twelve-87"></a>
## twelve-87: demo/twelve/index.html, inline script, line 1351

````js
    // 🔴 EIGHT STRIPS AND A MASTER, which is what the mixer has: six mono
    // channels and two stereo pairs share eight faders across ten inputs.
````

<a id="twelve-88"></a>
## twelve-88: demo/twelve/index.html, inline script, line 1353

````js
    /**
     * 🔴 THE JOG IS MEASURED AND THE PAN IS FUDGED, AND THE CHECK SAYS SO. Both
     * are relative encoders on one mixer. The jog sends 1 per detent, so it is
     * driven raw; the pan sends 2, 4 and 63, so it is capped and scaled by two
     * numbers fitted to a report rather than to a measurement.
     */
````

<a id="twelve-89"></a>
## twelve-89: demo/twelve/index.html, inline script, line 1369

````js
    // 🔴 THE MASTER IS THE SAME LENGTH AS A CHANNEL, measured rather than
    // trusted: both read the same expression, and an expression that is right
    // in two places and wrong in a third is what a copied pixel count looks
    // like a month later.
````

<a id="twelve-90"></a>
## twelve-90: demo/twelve/index.html, inline script, line 1384

````js
    // 🔴 GLUED AND EQUAL, BOTH MEASURED. A gap and a height difference are two
    // separate claims and a screenshot showed both wrong at once.
````

<a id="twelve-91"></a>
## twelve-91: demo/twelve/index.html, inline script, line 1387

````js
      /**
       * 🔴 `rackLane`, NOT `lane`. There is a `const lane` further down this
       * same block for the FADER's lane, and a `const` shadows its whole
       * enclosing scope from the top. Reading the outer `lane` above that
       * declaration is a temporal dead zone error, the check THREW, and
       * **seven asserts silently stopped running while the page read 22/22
       * green**.
       * ⚠️ THAT IS THE FAILURE THIS PROJECT NAMES MOST OFTEN: asserts do not
       * fail when they stop running, they simply are not there, and only the
       * COUNT says so. 29 to 22 is what caught it.
       */
````

<a id="twelve-92"></a>
## twelve-92: demo/twelve/index.html, inline script, line 1404

````js
      // 🔴 AND THE FADERS END ON ONE LINE, which is a different claim from the
      // boxes being equal: a padding either side of a seam can differ while
      // both boxes match, and that is exactly what was reported.
````

<a id="twelve-93"></a>
## twelve-93: demo/twelve/index.html, inline script, line 1414

````js
    /**
     * 🔴 THE PANEL PRINTS `MODEL 12` AND NOTHING ELSE, IN UPPERCASE. Asked
     * 2026-09-21: *"Move model 12 to roght panel top right corner. No brand
     * name"*, which narrows *"replica names always in uppercase"* rather than
     * cancelling it.
     * ⚠️ **IT READS WHAT THE BROWSER RENDERS, NOT WHAT THE PAGE TYPED.** The
     * name shouts for two reasons, the string and `text-transform`, and only
     * one of them is in the JavaScript. A check on the string alone would stay
     * green with the stylesheet rule deleted. `shown()` applies the transform
     * the way the browser applies it.
     * ⚠️ **AND THE COUNT IS PART OF THE CLAIM.** This assert used to demand
     * BOTH halves, on the reasoning that a replica carrying only its model is
     * an instrument nobody made. It now demands exactly ONE line, because a
     * `TASCAM` creeping back in is the thing that would be wrong, and a check
     * that only reads the model name would not notice it.
     */
````

<a id="twelve-94"></a>
## twelve-94: demo/twelve/index.html, inline script, line 1431

````js
      /* ⚠️ THE READER IS THE COMPONENT'S NOW, AND IT WAS COPIED INTO THREE PAGES
         BEFORE IT LIVED ANYWHERE. `nameplate.shown()` reads what the browser
         RENDERS rather than what is typed, which is the whole point of it: a
         page leaning on `text-transform` renders `NOVATION` from a source that
         says `novation`, and a check reading `textContent` grades the source
         and stays green either way. Two pages had the same seven lines. */
````

<a id="twelve-95"></a>
## twelve-95: demo/twelve/index.html, inline script, line 1442

````js
    /**
     * 🔴 AND IT IS IN THE MASTER LANE'S TOP RIGHT CORNER, WHICH IS A
     * MEASUREMENT. Asked for in those words, and the two halves of the corner
     * are two separate ways to be wrong: a plate that is flush right but
     * floating in the middle of the column, and a plate at the top that is
     * centred or left. Both are measured against the LANE's own box.
     * ⚠️ **FLUSH RIGHT IS AGAINST THE LANE'S PADDING, NOT ITS BORDER.** The lane
     * insets its contents by 14 px, so a plate at the lane's `right` would be
     * sitting ON the card's edge. The function key row below it is the honest
     * comparison, because whatever the inset is, both obey it.
     * ⚠️ **AND `TOP` IS AGAINST THAT ROW TOO.** The plate is the lane's first
     * child, so the only thing that can be above it is nothing, and the claim
     * worth grading is that the row which used to be first is now BELOW it.
     * 🔴 **THE OLD ASSERT MEASURED A PLATE SPANNING TWO BOXES WITH AIR UNDER
     * IT**, reading both far edges and the drop against `--pos-gap`. Nothing it
     * measured exists any more, so it is replaced rather than re-baselined.
     */
````

<a id="twelve-96"></a>
## twelve-96: demo/twelve/index.html, inline script, line 1459

````js
    /**
     * 🔴 **AND `fRow`'S RIGHT EDGE WAS THE WRONG YARDSTICK, FOUND 2026-09-22 BY
     * A KNOB GETTING TEN PER CENT WIDER.** This read `b.right` against the
     * function key row's, on the reasoning above that *"whatever the inset is,
     * both obey it"*. They do not. The plate reaches the inset by
     * `margin-left: auto`, which outranks the lane's `align-items: center`; the
     * row is simply CENTRED, so its right edge is the inset only while the row
     * happens to be the widest thing in the lane. One control grew by 4.6 px
     * and the row's right edge moved 2.3, on a page where nothing about the
     * nameplate had changed.
     * ✅ **SO IT MEASURES THE INSET ITSELF NOW**, which is what the paragraph
     * above says the claim is. The row is still read and still printed, because
     * a plate flush with an inset that the controls are nowhere near would be
     * true and useless, but it is a DETAIL rather than the test.
     */
````

<a id="twelve-97"></a>
## twelve-97: demo/twelve/index.html, inline script, line 1488

````js
    /**
     * 🔴 THE ASK OF 2026-09-29 IS A CLAIM ABOUT TWO RENDERED NUMBERS, SO IT IS
     * REQUIRED RATHER THAN PRINTED. *"adjust nameplate to model name top
     * padding is same as right padding"*. The assert above already PRINTED both
     * halves on every run and required only that the plate was not above the
     * lane, which is the weak half of the pair a reader was looking at.
     * 🔴 **AND IT IS ITS OWN ASSERT RATHER THAN A FOURTH CONDITION ON THAT ONE,
     * BECAUSE THE TWO HAVE DIFFERENT FIXES.** *The plate is in the corner* is
     * answered by a placement; *the two insets match* is answered by whose
     * padding it is. One boolean over both would name neither when it went red.
     * 🔴 **IT IS MEASURED AS INK, WHICH IS THE WHOLE REASON THE ASK EXISTED.**
     * The boxes agreed to 0.00 px on both edges while the letters were 18.37 px
     * apart, so a check over rects alone would have been green on the morning
     * this was reported. The baseline comes from the range's own top plus the
     * font's ascent, and the ink from `actualBoundingBox*`, so nothing here is
     * typed and nothing can disagree with the stylesheet later.
     * ⚠️ **THE INSTRUMENT IS CHECKED BEFORE IT IS BELIEVED.** `ctx.letterSpacing`
     * is what makes a canvas measure the string the DOM laid out, and an engine
     * that ignores it would hand back a width short by one space per character,
     * which would move the right edge by about 12 px and read as a layout fault.
     * So the measured advance has to agree with the laid out box to within a
     * pixel or this goes red rather than quietly grading the wrong string.
     * ⚠️ **2 px, AND THE CEILING IS THE SIDE BEARING'S OWN SIZE.** MEASURED
     * 2026-09-29 at 1280 px: 14.84 px down against 16.47 px in, **1.63 px
     * apart**, which is the leading over the cap on one side against the
     * trailing letter-spacing and the last glyph's bearing on the other. Both
     * are font facts and neither is reachable from a stylesheet, so the pair
     * cannot be closed further without typing a number that is right for one
     * face at one size.
     * 🔴 **AND THE HONEST HOME FOR THE FIX IS `shell.css`, WHICH WAS ANOTHER
     * AGENT'S THIS RUN.** The rule that puts 20 px over this plate is
     * `.panel-case > .panel-plate { padding-block: var(--panel-pad) 0 }`, and it
     * reads a token this lane does not use: the lane insets by 14. What belongs
     * there is the plate reading the case's OWN inset rather than the project
     * default, `padding-block: var(--plate-pad, var(--panel-pad)) 0`, with this
     * lane setting `--plate-pad: 0px` beside its `padding: 14px` so one
     * declaration carries both. That would reach `/tom/`, `/circuit/`, `/evo/`
     * and the instrument header as well as this page, and it would change
     * nothing on any of them, because every one of those cases DOES inset by
     * `--panel-pad`. The page-scoped rule above answers the ask today.
     */
````

<a id="twelve-98"></a>
## twelve-98: demo/twelve/index.html, inline script, line 1562

````js
    /**
     * 🔴 NOTHING ON THIS PANEL IS DISABLED, AND IT IS ASSERTED BECAUSE IT WAS
     * ASKED FOR. *"Rm disabled controls"*, 2026-09-21. Four things went: MAIN
     * and SUB in every channel column, F1, and the SUB and MAIN faders beside
     * the FX fader.
     * ⚠️ **IT IS A SWEEP OF THE PANEL RATHER THAN A LIST OF THE FOUR.** A check
     * naming what was removed passes forever and says nothing about the next
     * dead control somebody draws; a check that reads every `:disabled` under
     * the instrument fails the moment one appears.
     * ⚠️ **AND IT REPLACES AN ASSERT THAT MADE THE OPPOSITE CLAIM**, *sub and
     * main stand beside the FX fader, disabled, ending on its line*, which
     * measured that there were two of them, that both were off and that all
     * three faders ended on one line. The last of those three is still made,
     * by the check comparing a channel fader against the FX fader.
     */
````

<a id="twelve-99"></a>
## twelve-99: demo/twelve/index.html, inline script, line 1586

````js
    /* ⚠️ THREE PADS, NOT FIVE. REC sits above the fader block and MUTE and SOLO
       beside it; MAIN and SUB left on 2026-09-21 with the other disabled
       controls. The number is in the assert's own words so the two cannot
       disagree the way a count and a sentence usually do. */
````

<a id="twelve-100"></a>
## twelve-100: demo/twelve/index.html, inline script, line 1599

````js
    /**
     * 🔴 THE ALIGNMENT IS A MEASUREMENT, NOT A LOOK. A margin derived from a
     * component's internals is the shape of defect this project has measured
     * five times: it reads as correct in the source and is wrong on screen the
     * moment the component changes. Compare the real rects.
     * ⚠️ AND IT NAMES THE LANE, NOT THE FADER. Against `.pos-fdr` this assert
     * would pass while the bug was present, because the bug WAS alignment to
     * `.pos-fdr`.
     */
````

<a id="twelve-101"></a>
## twelve-101: demo/twelve/index.html, inline script, line 1608

````js
    // 🔴 THE FADER'S LAST CONTROL, WHICH IS THE HAND BUTTON WHEN THERE IS ONE.
    // A pad column beside a fader ends where the fader's CONTROLS end, and a
    // hand button joined under the lane is one of them.
````

<a id="twelve-102"></a>
## twelve-102: demo/twelve/index.html, inline script, line 1612

````js
    // 🔴 `.button`, NOT `.el`. The pad returns its WRAPPER as `el`, and since the
    // pads gained a bottom label that wrapper ends below the button. This
    // assert read the wrapper and reported the button 17 px low while the
    // button was exactly right, which is a check measuring the wrong object and
    // blaming the layout. The component exposes `button` for this.
````

<a id="twelve-103"></a>
## twelve-103: demo/twelve/index.html, inline script, line 1623

````js
      /**
       * 🔴 THE FADER IS THE LENGTH THE PANEL DECLARES, WHICH IS THE CHECK THAT
       * REPLACED `the lane starts level with the first button in the column`.
       * That one read the fader's top against MUTE's, and it was only ever true
       * because four buttons spanned the fader exactly. `Rm disabled controls`
       * took two of them, so the column is 86 px at the foot of a 212 px lane
       * and the old alignment describes nothing.
       * 🔴 **WHAT IT WAS ACTUALLY WORTH WAS CATCHING A DEAD SELECTOR**, and it
       * did: when the row was renamed and the rule kept the old class,
       * `--fdr-lane-h` fell back to its 120 px default and the lane was 29 px
       * short. This measures the same failure head on, and harder, because it
       * names the number instead of a second element that happened to move
       * with it.
       * ⚠️ **TWO SOURCES, NOT A COPY OF ONE.** `--rack-throw` is declared on
       * `.rack-unit` and the lane's height comes from `--fdr-lane-h` reading it
       * through `.rack-unit .pos-fdr`. A stale selector breaks the second path
       * and leaves the first intact, so the two can disagree, which is the only
       * thing that makes a comparison evidence.
       * 🔴 **AND THE TOKEN IS MEASURED THROUGH A BOX, NOT PARSED OUT OF
       * `getComputedStyle`.** MEASURED on the first run of this check:
       * `getPropertyValue('--rack-throw')` returns the `calc(...)` TEXT, because
       * an unregistered custom property has no computed type, so `parseFloat`
       * gave `NaN` and the assert went red on a page that was laying out
       * perfectly. A hidden, out of flow probe asks the browser to resolve the
       * same length the same way the fader does, and it is added and removed
       * inside one task so nothing is painted.
       */
````

<a id="twelve-104"></a>
## twelve-104: demo/twelve/index.html, inline script, line 1663

````js
      // 🔴 AND THE LABELS UNDER THEM LINE UP TOO, which is a second claim and
      // needs a second measurement: the controls can end together while their
      // labels do not, which is exactly what happened when the pads gained a
      // bottom label and the page was still lifting the column by hand.
````

<a id="twelve-105"></a>
## twelve-105: demo/twelve/index.html, inline script, line 1677

````js
    /**
     * 🔴 THE LOG IS GRADED. A pan click is the case this page exists to make:
     * `0x44` is four counter clockwise and reads as sixty eight to anybody
     * given only a number, so the hex has to be in the table beside the
     * reading, and an assert has to say it is there.
     */
````

<a id="twelve-106"></a>
## twelve-106: demo/twelve/index.html, inline script, line 1687

````js
    // ⚠️ THE HALF THAT MATTERS: the routing below returns early on any channel
    // but 1, so a log fed after it would be silent about the traffic somebody
    // opened it to find.
````
