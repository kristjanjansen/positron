# Page comments: muta

The full comments cut from the code under demo/ for muta, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="muta-1"></a>
## muta-1: demo/muta/index.html, style, line 11

````css
  /* 🔴 EACH INSTRUMENT IN ITS MAKER'S OWN COLOUR, asked for as *"use mi
     cyan/teal for the plaits"*. It comes off a photograph of the panel and is
     lightened for a dark ground, which `shell.css` records with the contrast it
     measured at.
     🔴 **AND IT IS THE ARC ONLY, NOT THE NEEDLE OR THE VALUE.** A knob's ring
     is the thing that says where it is set, so it is the one channel that can
     carry an identity without taking one away: `--hi` still means *the thing
     this control is about* on the rest of the site, and this page's own states,
     a knob moved by hardware and a knob switched off, keep the colours they
     have everywhere else because those rules come after this one in the file.
     ⚠️ **THIS USED TO BE TWO COLOURS AND IS NOW ONE.** The page carried a
     second case in `--mi-maroon-lit` and the argument written here was that a
     colour per instrument is a claim a page with TWO instruments from one maker
     can make and a page with one cannot. That page is gone, so the claim is
     weaker than it was: what is left is a replica drawn in the colour its panel
     is printed in, which is still a fact about the object rather than a
     decoration. */
````

<a id="muta-2"></a>
## muta-2: demo/muta/index.html, style, line 29

````css
  /* ⚠️ AND THE HAND'S GLYPH TAKES THE SAME COLOUR WHEN IT IS RUNNING, asked for
     as *"invisible hand color has to be brand color on knobs"*. `shell.css`
     lights it `--hi` because yellow means *the thing this control is about*,
     and while a hand is running the thing this control is about IS the hand.
     That argument is unchanged; on this page the instrument's own colour is
     what carries it, so the meaning travels and only the hue moves. */
````

<a id="muta-3"></a>
## muta-3: demo/muta/index.html, style, line 37

````css
  /* TWO GRIDS THAT READ AS ONE BLOCK, AND ONE CHILD OF THE PANEL'S ROW. The
     row puts `--ctl-gap` between its children, which is right between two
     controls and too little between two blocks that are each two rows deep.
     One container, one divider, and the row sees a single child.
     ⚠️ `min-width: 0` OR THE PAGE DRAGS SIDEWAYS INSTEAD OF THE ROW. It is the
     same guard `.pos-rows-r` carries and for the same reason: `overflow-x`
     cannot shrink a flex item below its content, and this container sits
     between the grids and the row.
     🔴 AIR ABOVE AND BELOW, SO THE BLOCK'S INK IS INSET THE SAME AMOUNT ON ALL
     FOUR SIDES. Asked for 2026-09-22: *"add space on top and bottom of knobs so
     their y padding matches with x padding"*.
     🔴 **AND THE BOXES WERE ALREADY EQUAL, WHICH IS WHY THIS NEEDS MEASURING
     RATHER THAN ARGUING ABOUT.** What a reader sees is not the rect: a grid
     cell is the lattice pitch, 84 px, and the dial in it is `--knob-w`,
     50.6 px, so there is about 17 px of empty cell either side of the ink and
     none above it.
     ⚠️ **AND THE NUMBER MOVED WHEN THE CASE DID.** It was 17 px inside a
     `.panel-case` whose padding is 20 px on all four sides. A glued row is not
     square: `--rows-pad` is 20 and `--rows-gap` is 16, so the block starts 4 px
     closer to the top than to the left before the empty half cell is counted at
     all. 21 is those 4 plus the 17, and it is typed because the pitch is
     measured at runtime and written onto the GRID, which is a child, and a
     custom property does not travel upward. The assert below reads the DIAL's
     own rect against the row's, because a reader sees ink and not boxes. */
````

<a id="muta-4"></a>
## muta-4: demo/muta/index.html, style, line 61

````css
  /* 🔴 AND IT SCROLLS RATHER THAN SQUEEZING, WHICH IS WHAT THE CASE USED TO DO
     FOR IT AND A GLUED ROW DOES NOT. PHOTOGRAPHED at 375 px on the first build
     of this panel: the two grids are flex items, a flex item's default is
     `flex-shrink: 1`, and there is no scroller above them any more, so the
     first grid was squeezed to about half its width and HARMONICS and MORPH
     were drawn with their labels cut mid-word to `HAR` and `M`. The page did
     not drag sideways, which is why nothing said so.
     ✅ **A CONTAINER THAT DOES NOT FIT SCROLLS AGAINST ITS OWN CONTENT. IT
     NEVER WRAPS AND IT NEVER SHRINKS**, which `positron-compose` §3 writes down
     and `.pos-tbl-row` and the pad grid both already do. `flex: 0 0 auto` on the
     two grids is the half that stops the squeeze and `overflow-x` is the half
     that gives the row somewhere to put what is left.
     ⚠️ AND A SCROLLING STRIP INSIDE A CASE IS THIS PANEL'S OWN CONTRACT rather
     than something new: the `.panel-flow` it used to sit in scrolled for
     exactly this reason, and the page has never dragged. */
````

<a id="muta-5"></a>
## muta-5: demo/muta/index.html, style, line 81

````css
  /* 🔴 THE TWO GRIDS SIT SIDE BY SIDE WITH A DIVIDER BETWEEN THEM, ASKED FOR
     2026-09-22 AGAINST A SCREENSHOT OF THEM STACKED: *"no. keep 2 x 2 group,
     then divider then 3 x 2 grouo"*.
     🔴 **AND THE DIVIDER IS A RULE HERE, WHICH REVERSES WHAT THIS FILE SAID.**
     Separation is spacing and an empty box is a line, and that was right for two
     groups in ONE row. It is wrong for two blocks that are each two rows deep: a
     gap between them reads as the gap between columns inside them, because at
     this pitch it IS one.
     🔴 **AND IT READS `--rows-gap` SINCE THE CASE WENT, WHICH IS THE SAME 16 px
     AND IS THE HALF THAT WOULD HAVE BROKEN SILENTLY.** It was `var(--panel-gap)`,
     declared by `.panel` in `shell.css`, and there is no `.panel` above this any
     more: an unresolved `var()` makes its declaration invalid, so the line would
     have lost its air at both ends and nothing would have said so. `--rows-gap`
     is at `:root`, is the glued row's own air, and is the same figure.
     ⚠️ `align-items: start`, or the shorter grid stretches and its knobs move
     off the lattice the taller one sets. */
````

<a id="muta-6"></a>
## muta-6: demo/muta/index.html, style, line 102

````css
  /* 🔴 THE KNOBS GROUP CENTRES, AND THE HALF THAT MAKES IT POSSIBLE IS THE
     PANEL TAKING THE PAGE'S WIDTH. Asked 2026-09-29: *"muta: full content w in
     deskop, center the knobs group. align test tone to right"*, which is three
     things in one line and the first of them is what buys the other two.
     🔴 **THIS BLOCK SAID THE CENTRING COULD NOT BE DONE UNTIL TODAY, AND IT WAS
     RIGHT ABOUT THE PANEL IT WAS MEASURING.** On a `width: fit-content` surface
     this row IS the widest row, so the panel was as wide as the row and the row
     had no free space in it: MEASURED at 1280, `.plai-knobs` read client 483
     against scroll 483, the same at 560, and a `justify-content: center` moved
     the first grid **0.0 px** at both. The panel is `full` now, so the row is
     the page's width and the 483 px group has 163 px of slack to sit in.
     🔴 **AND THE CLIP THAT BLOCK WARNED ABOUT IS REAL, WHICH IS WHY THE
     CENTRING IS CONFINED TO WHERE THERE IS ROOM.** MEASURED at 480 and 375,
     where `max-width: 100%` already had the panel at the window's width before
     today: the row's client is 406 and 301 against a scroll of 483 either way,
     so there is nothing to centre in and a centring declaration pushes the 2 by
     2 group off the LEFT edge by 38.5 and 91 px with `scrollLeft` clamped at 0.
     `positron-compose` §1: inline-start overflow inside `overflow-x: auto` is
     clipped for good, and this row is a scroller by design, made one after
     HARMONICS and MORPH were photographed cut to `HAR` and `M`. The rule is at
     the foot of this sheet, in a `min-width` block, with its threshold. */
````

<a id="muta-7"></a>
## muta-7: demo/muta/index.html, style, line 124

````css
  /* 🔴 THE `Test tone` BUTTON HAS BEEN IN THREE PLACES IN THREE DAYS AND IS IN
     THE PLATE'S `status` SLOT NOW. Asked 2026-09-25 as *"make a Test tone
     button in the right of plaits"* and answered by placing it in
     `.panel-head`'s first grid column, which took eight widths of measuring
     against a model picker that overflows its own track and two media queries;
     then, when the case went, a row of the panel on the panel's own inset; and
     now, asked 2026-09-28 as *"no online button, put a test tone on that spot"*,
     the slot beside the name that the on and off switch had.
     ✅ **AND EACH MOVE REMOVED PAGE CSS RATHER THAN ADDING IT.** Three
     placement rules and two media queries went with the header, the `align`
     option went with the row, and what is left is one declaration.
     🔴 **AND IT MOVED TWICE MORE ON 2026-09-29, ENDING LEFT OF THE PICKER.**
     *"nameplane is in separate section in bottom"* emptied the foot down to the
     name, which took the button out of the plate; then the sketch
     `MUTA      [test tone][<| patchname |>][ ]` put it back on the foot, on the
     far side of the name and ahead of the selector. It is the first child of
     `.muta-end`, the group that IS the plate's `patch` end.
     ⚠️ `flex: 0 0 auto` BECAUSE THE BUTTON IS THE FIXED MEMBER OF THAT GROUP.
     Without it the button is a flex item with the default `flex-shrink: 1`, so
     on a phone the words would squeeze instead of the selector giving way. It
     is the same declaration it carried in the plate, keeping the group honest
     rather than the cluster. */
````

<a id="muta-8"></a>
## muta-8: demo/muta/index.html, style, line 148

````css
  /* 🔴 THE BUTTON AND THE PICKER TRAVEL AS ONE GROUP AT THE FOOT'S FAR END,
     WHICH IS WHAT PUTS THE BUTTON LEFT OF THE SELECTOR. Asked 2026-09-29 with
     a sketch: `MUTA      [test tone][<| patchname |>][ ]`.
     ✅ **THE SELECTOR AND ITS DIE ARE ALREADY ONE THING AND NO RULE HERE SAYS
     SO.** `picker.mjs:204` appends the die INSIDE `.pos-pick`, and `shell.css`'s
     own phone block keeps it on the segment's line on purpose, written after the
     die dropped a whole row below the arrows on `/archive/radio/` and `/mirror/`. A
     rule here would be a second copy of one that already works, in a file that
     cannot see the first.
     🔴 **THE CELL IS SIZED TO THE LONGEST MODEL NAME AND NOT TO THE ROW.**
     Asked in the same line: *"on desktop patch selector has middle element with
     as maximum patchname (with maximum w and ...)"*. `MODELS`'s longest entry
     is `granular formant` at 16 characters, so `--pick-w: 16ch` is that name's
     own width and every shorter one leaves air inside a box that does not move
     when the model changes. The kit's 22ch would be four characters of slack
     and its 13ch below 620 px would truncate three of the sixteen.
     ⚠️ **THE ELLIPSIS IS THE KIT'S AND IS NOT WRITTEN HERE.** `.pos-pick-n`
     already carries `overflow: hidden; text-overflow: ellipsis`, so a name
     longer than the box gets `...` wherever the box came from. What this
     declaration decides is where the box stops, not what happens past it.
     ⚠️ **AND `--pick-w` IS SET ON `.pos-pick` RATHER THAN ON THE CELL**, which
     is where `shell.css` declares it and where its own comment says a shared
     measurement belongs. Setting it on the cell would put one number in two
     places across a file boundary. */
````

<a id="muta-9"></a>
## muta-9: demo/muta/index.html, style, line 175

````css
  /* 🔴 AND ON A PHONE IT TAKES THE WHOLE ROW. Asked 2026-09-28: *"test tone
     button takes full w on mobile (buttons prop?)"*.
     🔴 **THE PARENTHESIS IS A QUESTION AND THE ANSWER IS NO.**
     `createControlGrid` takes `items`, `cols`, `gap`, `host` and `cls`, and
     there is no `buttons` prop, on it or on `createInstrumentPanel`. The kit's
     existing spelling of *take the width you are given* is `full: true` on
     `createInstrumentPanel` and `createGlueRows`, plus `.pos-rows-full` and
     `.kbd-full`. This is PAGE SCOPED on purpose: the kit shape would be a
     `full` option on the plate's `status` slot, that slot reaches six
     instrument pages, and nothing has asked for it on the other five.
     🔴 **AND THE ASK WAS WITHDRAWN ON 2026-09-29, SO THE BUTTON NO LONGER
     TAKES THE LINE.** The sketch for the phone is
     `[test tone][<| patchname |>][ ]` on ONE line with the name centred
     underneath, so the three controls share a line and the SELECTOR is what
     takes the remaining space. The full width rule went with the arrangement it
     was written for; the paragraphs above are kept because they are why
     `.muta-tone` still carries `flex: 0 0 auto`.
     ✅ **AND THE NAMEPLATE IS STILL CENTRED ON A PHONE**, by the same block at
     the foot of `shell.css`, which also carries the `order: 1` that puts the
     `.pos-ipanel-name` cluster below the group. Both are the kit's and neither
     is re-stated here.
     🔴 **WHAT IS LEFT IS ONE RULE ABOUT THE SELECTOR, AND `flex-wrap: nowrap`
     IS THE HALF OF IT THAT WAS MEASURED RATHER THAN REASONED.** `shell.css`
     gives `.pos-pick` `width: 100%` at 560 and under, which would take the whole
     line and push the button off it, so the picker is returned to `width: auto`
     and made the flexible member with its floor lowered, because
     `.pos-pick-cell` is `white-space: nowrap` and a flex item's floor is its
     content.
     🔴 **AND THAT WAS NOT ENOUGH, BECAUSE A WRAPPING FLEX CONTAINER WRAPS
     INSTEAD OF SHRINKING.** `shell.css`'s phone block also sets
     `flex-wrap: wrap` on `.pos-pick`, for the label that this page does not
     have, so `min-width: 0` on the segment bought nothing: the container broke
     the line instead of spending the floor. MEASURED at 375 before this
     declaration: the segment sat at y586.8 and the die at **y624.8**, a whole
     row below the arrows it works with, which is the exact defect `/archive/radio/` and
     `/mirror/` were reported for. After it they read the same y.
     ⚠️ **AND IT IS LITERALLY THE ASK.** *"Patch selector and randomize button
     go togther and so not wrap"*.
     ⚠️ **AND NO HARNESS HERE CAN ENTER THIS BLOCK**, which is said out loud
     rather than left to be found. `demo/verify.mjs` runs at 756 px with no
     viewport override, so the check below that reads this button's position is
     a DESK measurement and says nothing about this layout. It is graded by
     `node demo/shot.mjs muta 375` and by nothing else, and `BACKLOG.md` carries
     that hole for all six pages that build a plate.
     ⚠️ **AND IT SITS AT THE FOOT OF THIS SHEET, AFTER THE RULE IT OVERRIDES.**
     A media query adds no specificity, so `.muta-tone` above at (0,1,0) would
     beat this one at (0,1,0) on source order at every width, which is the dead
     rule `.pos-pick`'s whole phone layout was for weeks. Order, not weight. */
````

<a id="muta-10"></a>
## muta-10: demo/muta/index.html, style, line 228

````css
  /* 🔴 THE KNOBS GROUP CENTRES WHERE THERE IS ROOM AND NOWHERE ELSE, AND THE
     THRESHOLD IS THIS SHEET'S EXISTING PHONE BREAKPOINT RATHER THAN A FIFTH
     NUMBER. The group is 483 px and the row spends `--rows-pad` at each end
     inside a panel that is now the page's width, so the row's client is the
     window less 42 px: MEASURED, 646 at 1280 and at the harness's 756, 486 at
     560, 406 at 480 and 301 at 375. The first width at which the group stops
     fitting is 525, so a floor of 561 clears it by 4 px and is a number the
     block above already uses.
     ⚠️ **`justify-content: safe center` IS THE PRIMITIVE AND IT IS NOT USED, ON
     PURPOSE.** `safe` falls back to `start` instead of overflowing, which is
     this rule written once with no threshold in it, and NOTHING in this
     repository uses it yet. This project verifies desktop Safari and the iPhone
     as well as the harness Chrome, and support on those two engines was NOT
     established here, so the query is what is written and the reason is
     recorded rather than the keyword being trusted.
     ⚠️ **AND A VIEWPORT QUERY IS A PROXY FOR THE ROW'S OWN WIDTH**, which
     `positron-compose` §6 refuses in general: a component asks its own box. It
     holds here because this panel is the page's own width on this page and on
     no other. `@container` is the form that would be true in general, and
     `.pos-rows` cannot carry one for the reason `shell.css` records under
     `.pos-ipanel-plate`: inline size containment takes a surface's contents out
     of its own sizing and a `fit-content` surface collapses.
     🔴 AND THE `Test tone` BUTTON GOES TO THE RIGHT, ASKED FOR IN THE SAME
     LINE, **WHICH TOOK TWO DECLARATIONS HERE UNTIL 2026-09-29 AND NOW TAKES
     NONE.** It was in the plate's `status` slot, INSIDE `.pos-ipanel-name`,
     which was the start end of a two ended foot: the cluster had to be told to
     take the free space and the button to park at the far end of it with an
     auto margin, because the far end of the ROW was the picker's and
     `instrument-panel.mjs` THROWS on a `.pos-pick` handed in as `status`.
     ✅ **THE GROUP AT THE FOOT'S FAR END IS WHAT REPLACED THEM.** `.muta-end`
     holds the button and the picker in that order and IS the plate's `patch`
     end, so the kit's own `align: 'between'` on the plate row puts the name at
     one edge and the pair at the other, with no margin and no threshold. Both
     declarations were deleted rather than moved.
     ⚠️ **AND WHAT IS LEFT IN THIS BLOCK IS ONLY THE KNOBS.** The paragraph
     that stood here about both halves sitting in a `min-width` block so neither
     could reach the phone went with the halves it was about. */
````

<a id="muta-11"></a>
## muta-11: demo/muta/index.html, inline script, line 271

````js
  // 🔴 THIS PAGE RUNS SOMEBODY ELSE'S FIRMWARE, UNMODIFIED, AND THAT IS THE
  // CLAIM IT EXISTS TO MAKE. `LESSONS.md` #81: `/grains/` said *"the same
  // granulator in this page and on a Raspberry Pi"* and it was false, because
  // the page ran a REIMPLEMENTATION and *"no amount of A/B can promote similar
  // to same"*. What is under this page is `plaits/dsp/voice.cc` compiled by
  // emscripten from a pinned commit, with no line of it rewritten. The build
  // stamps its own source digest into the wasm, so a second build of the same
  // sources on the board can be compared to this one by something other than
  // listening. That comparison has NOT been made yet and the page says so.
  //
  // 🔴 AND IT IS NOT A `ScriptProcessorNode`. `plans/plan-vcv-modules.md` §9.2
  // measured the only shipped browser build in this ecosystem, Cardinal's, and
  // it runs the whole engine in `createScriptProcessor(2048, …)` on the main
  // thread: 42.7 ms of buffer, competing with layout and paint, on a node the
  // Web Audio specification deprecated years ago. This is 128 frames on the
  // audio thread.
  //
  // ── EIGHT VOICES, AND THE POLYPHONY IS THE HOST'S ───────────────────────
  //
  // 🔴 PLAITS IN HARDWARE IS ONE MODULE WITH ONE VOICE IN IT. Rack gets chords
  // out of the same DSP by instantiating `plaits::Voice voice[16]` against ONE
  // `Patch`, and the shim does the same with eight. Nothing in `plaits/` was
  // changed to make that possible, which is the point: polyphony is an
  // arrangement of copies rather than an edit to somebody's firmware.
  //
  // 🔴 AND A STOLEN VOICE IS INVISIBLE FROM THE SPEAKERS. The note that went
  // away sounds exactly like a note that was never played, so the page prints
  // which voice took each note and says out loud when one was taken from
  // something still ringing.
````

<a id="muta-12"></a>
## muta-12: demo/muta/index.html, inline script, line 306

````js
  /* 🔴 THE PEDAL IS A KIT MODULE SINCE 2026-09-22, AND THIS PAGE IS WHERE IT
     WAS WRITTEN. It was page-local `keysDown` and `pedalHolds` here for one
     day; `/nola/` is the second page with a foot on it, and two copies of one
     function is what this repository has paid for twice already.
     ⚠️ AND THE MOVE FOUND A BUG THAT WAS LIVE HERE: a second note off for a
     note the foot was holding released it, and the lift released it again. */
````

<a id="muta-13"></a>
## muta-13: demo/muta/index.html, inline script, line 314

````js
  /* 🔴 THE KIT'S GLUED PANEL SINCE 2026-09-28, ASKED FOR AS *"apply instument
     panel"*. It was `createInstrument`, which is a CASE: a `.panel-case` with a
     scrolling flow, a fixed column it did not use, and a header bar across the
     top. `createInstrumentPanel` is the other shape, a stack of glued rows in
     the order the sketch draws them, and its own header names this page as one
     of the two that had to pass a picture in as a glue part OUTSIDE the case to
     get it edge to edge. The picture is a row now and is edge to edge by
     construction, which is the fourth half of the same ask.
     🔴 **AND THE `status` SLOT HOLDS THE `Test tone` BUTTON SINCE 2026-09-28,
     NOT A SWITCH.** Asked: *"muta: on by default, no online button, put a test
     tone on that spot"*. `createPresenceButton`, `HEADER_STATES` and
     `HEADER_SAYS` came in here for that switch and all three went with it; the
     slot takes any built control, which is what `/knobs/` already relies on.
     The words `on` and `off` were the only thing this page read out of
     `instrument.mjs` and nothing says them any more. */
````

<a id="muta-14"></a>
## muta-14: demo/muta/index.html, inline script, line 332

````js
  // ONE ARTEFACT, ONE SHIM, ONE PINNED COMMIT.
  //
  // 🔴 AND THERE WERE TWO UNTIL 2026-09-28, WHICH IS WHY THE STAMP STILL
  // MATTERS. This page also fetched `/muta/vendor/warp.wasm` and ran Warps in a
  // second worklet downstream of this one, asked out as *"arhive/rmwarps and rm
  // all routing code around it"*. The artefact is still in `vendor/` and its
  // shim is still in `build/`, because `build/build.sh` compiles both and
  // nothing here can run emscripten to check a change to it. Nothing fetches
  // either any more.
````

<a id="muta-15"></a>
## muta-15: demo/muta/index.html, inline script, line 343

````js
  // The sixteen models, in the order `plaits/dsp/voice.cc:38` registers them.
  // THE ORDER IS THE SOURCE'S, NOT A CHOICE MADE HERE: `plai_active_engine()`
  // returns the index the DSP is actually sounding, and a list in any other
  // order would label the wrong sound with a straight face.
````

<a id="muta-16"></a>
## muta-16: demo/muta/index.html, inline script, line 354

````js
  // The parameter ids, the third and last copy of this list. The other two are
  // demo/muta/build/plai_shim.cc and demo/muta/muta-worklet.js, and all three
  // spell the names out because a mismatch moves the wrong control instead of
  // throwing.
  // ⚠️ 7 (trigger) AND 9 (trigger_patched) ARE GONE and are not listed. A gate
  // belongs to one voice, so it is `plai_note_on` and `plai_set_drone` now.
````

<a id="muta-17"></a>
## muta-17: demo/muta/index.html, inline script, line 366

````js
  // HOW MANY VOICES THE SLIDER OFFERS. The wasm is the authority and reports
  // `plai_max_voices()`, but the control is built before anything is fetched,
  // so this number has to be typed once. The check below grades it against
  // what the wasm says rather than trusting that they agree.
````

<a id="muta-18"></a>
## muta-18: demo/muta/index.html, inline script, line 377

````js
  /* 🔴 ONE SENTENCE, AND IT CHANGED IN THE SAME EDIT THE EFFECT LEFT IN.
     It read *"Two of Emilie Gillet’s firmwares, an oscillator and an effect,
     compiled from their own C++ to WebAssembly and chained in one audio
     graph."*, which described a page with two cases on it. A description that
     has drifted is worse than a missing one, because a visitor believes it.
     ⚠️ AND `manifest.mjs`'s `one` LINE IS THE SAME STRING AND IS NOT THIS
     PAGE'S TO WRITE. It is reported rather than edited. */
````

<a id="muta-19"></a>
## muta-19: demo/muta/index.html, inline script, line 390

````js
    // THE WASM'S SIZE IS THE HEADLINE NUMBER OF THIS EXPERIMENT AND IS
    // DELIBERATELY NOT HERE: it is a constant, and a constant in a readout
    // teaches a reader to stop looking at the row. It is in the log, once,
    // beside the yardstick worth comparing it to.
````

<a id="muta-20"></a>
## muta-20: demo/muta/index.html, inline script, line 394

````js
    /**
     * 🔴 FOUR CELLS, ASKED FOR 2026-09-22 AS *"readout: 4 sections only, ones
     * make sense"*. It was eight.
     * ⚠️ **THE TEST WAS `positron-ui`'S OWN AND IT REMOVED THE FOUR FOR FOUR
     * DIFFERENT REASONS:** *every readout cell must be able to change, and a
     * cell showing a structural constant reads as a measurement and teaches the
     * reader to ignore the row*.
     * - `rate` is **48000 on every visit**, which is the constant that rule was
     *   written about. It is asserted and logged, which is where a fact that
     *   never moves belongs.
     * - `boot` moves once, at the start, and is never touched again. It is the
     *   page's headline number and it is in the log, where a reader can see it
     *   beside the thing it timed.
     * - `algorithm` printed a name a knob already showed, an inch away.
     * - `bands` was EMPTY except while the effect's vocoder was running, so
     *   most of the time it was a key over nothing.
     * ✅ **WHAT IS LEFT ALL FOUR MOVE WHILE YOU WATCH AND ALL FOUR ARE ABOUT
     *   WHAT THE INSTRUMENT IS DOING NOW**: what a render costs, what share of
     *   the budget that is, how loud it is, and how many voices are up.
     * ⚠️ AND FOUR IS EVEN, which `mount()` throws over, because an odd readout
     *   always has a weakest cell and being made to find it is the point.
     * 🔴 **`peak` IS THE OSCILLATOR'S OWN SINCE 2026-09-28, AND IT WAS THE
     *   EFFECT'S.** What comes out of the page is what comes out of the last
     *   thing in the chain, and the last thing in the chain is this oscillator
     *   now. The cell means the same and reads a different meter.
     */
````

<a id="muta-21"></a>
## muta-21: demo/muta/index.html, inline script, line 423

````js
    /**
     * 🔴 `Start audio` LEFT THIS ROW 2026-09-22: *"rm start audio, those
     * turnots enable it"*. Each case's header now carries a button that starts
     * and stops its own instrument, so a separate control would be a second way
     * to do one thing.
     * 🔴 **AND IT IS THE ROW THE HARNESS PRESSES, WHICH IS THE DANGEROUS HALF.**
     * `demo/verify.mjs` drives a page by clicking every button in
     * `.pos-controls`, and a header button is not in it. Deleting this without
     * replacing the press would leave the audio never started and **every
     * assert behind it silently not running**, which `positron-verify` records
     * happening twice in one day on `/mirror/` and `/blocks/`: ten asserts and
     * six, none of which failed, all of which disappeared.
     * ✅ **SO THE PAGE DRIVES THE HEADER BUTTON ITSELF, BEHIND `SELFCHECK`**,
     * the way `/mirror/` drives the headset buttons it can no longer reach. See
     * the boot block below.
     * ⚠️ AND `settleMs` ONLY EVER LANDS ON CONTROL 0, which was this button.
     * It is `Pluck` now, and the wait that used to cover a wasm fetch and two
     * handshakes has to cover them somewhere else.
     */
````

<a id="muta-22"></a>
## muta-22: demo/muta/index.html, inline script, line 442

````js
    /**
     * 🔴 NO CONTROL ROW AT ALL SINCE 2026-09-22: *"rm all top buttons,
     * automatically go for drone"*. It held Pluck, Chord, Next model, Drone and
     * Vocoder.
     * 🔴 **AND THE HALF OF THAT ASK THAT SAID `automatically go for drone` WAS
     * REVERSED 2026-09-25: *"no automatic drone. make a Test tone button in the
     * right of plaits"*.** The paragraph that used to stand here defended the
     * automatic drone at length, in these words: *"THE PAGE PLAYS ITSELF NOW"*,
     * and *"the first thing a visitor does produces a continuous sound they can
     * then take a knob to, which is what every knob on this panel is FOR"*.
     * That is the argument the owner overruled, and it is written down rather
     * than deleted because the next reader will ask why a page of rotaries has
     * a button on it.
     * 🔴 **THE ROW ITSELF STAYS EMPTY, AND THAT IS A DECISION.** `Test tone`
     * belongs to the instrument and rides with it: it was in the plate's
     * `status` slot from 2026-09-28, where *"put a test tone on that spot"*
     * put it, and since 2026-09-29 it is the far end of the picker row, because
     * *"nameplane is in separate section in bottom"* emptied the plate down to
     * the name. Putting it HERE instead would have made it control 0, which is
     * the ONE control `settleMs` lands on, and this page has already paid for
     * moving control 0 once. That argument is about this row and survives every
     * move the button has made.
     * 🔴 **SO THE HARNESS STILL PRESSES NOTHING AND THE PAGE STILL MAKES ITS
     * OWN GESTURES.** `demo/verify.mjs` drives a page by clicking everything in
     * `.pos-controls`; this page has none, so the one gesture it takes is a
     * pointer event the page dispatches at its own panel behind `SELFCHECK`,
     * which is what opens the audio for a visitor too.
     * ⚠️ `.pos-controls[hidden]` EXISTS FOR EXACTLY THIS, because an empty
     * control row left a 14 px band, which is the empty-box rule.
     */
````

<a id="muta-23"></a>
## muta-23: demo/muta/index.html, inline script, line 479

````js
  /* 🔴 WHAT THE VISIT DID, READ AT THE LAST LINE OF THE MODULE, WHICH IS THE
     ONLY MOMENT THAT QUESTION HAS AN ANSWER. `wasmFetches` counts asks for the
     firmware and `armedBy` names the thing that opened the sound device, and
     both are snapshotted below alongside `midiAsksOnLoad`, on that line's own
     reasoning: by the time the checks run a gesture has happened, so a reading
     taken there could not tell a visit apart from a press. This is *on by
     default* measured rather than described. */
````

<a id="muta-24"></a>
## muta-24: demo/muta/index.html, inline script, line 494

````js
  // ⚠️ DECLARED HERE, ABOVE EVERYTHING THAT CLOSES OVER THEM. `open()` and
  // `onWorklet()` both reach these, and `positron-ui` records a page where a
  // `const` declared later in the same block silently took seven asserts out
  // of a run through its temporal dead zone.
````

<a id="muta-25"></a>
## muta-25: demo/muta/index.html, inline script, line 501

````js
  // ── the controls ────────────────────────────────────────────────────────
  // Built before boot, because a page whose controls appear only after a press
  // is a page that looks broken until you press the one button it shows.
  //
````

<a id="muta-26"></a>
## muta-26: demo/muta/index.html, inline script, line 505

````js
  /**
   * 🔴 THE VOICE COUNT IS A STEPPED KNOB IN THE BOTTOM RIGHT SINCE 2026-09-22,
   * ASKED FOR AS *"move voices to knobs, bottom right, stepped knob"*. It was a
   * slider outside the case.
   * 🔴 **AND THE COMMENT THAT PUT IT OUTSIDE WAS ALREADY OUTVOTED ON THIS PAGE,
   * WHICH IS WHY THIS IS NOT A REVERSAL OF A LIVE ARGUMENT.** It read that the
   * voice count is not a panel control, that Plaits has one voice, and that
   * putting it on the case would have the case claiming a knob the instrument
   * does not have. Every word of that is true. **`decay` and `lpg_colour` are
   * not panel knobs either**: `plaits/ui.cc:70-84` binds them as the ALTERNATE
   * functions of MORPH and TIMBRE, reached by holding a button, and this page
   * gives both of them a knob of their own in the same case. The principle had
   * already been traded for usability twice before this ask arrived.
   * ⚠️ **WHAT KEEPS IT HONEST IS THE SECOND LABEL, NOT THE POSITION.** Row two
   * is where the controls the hardware does not give you a knob for live, and
   * every one of them says so underneath itself.
   * ⚠️ **AND IT TAKES NO INVISIBLE HAND.** `hand-drive.mjs` refuses a control
   * under about thirty steps, because the wander at each end would be less than
   * one step and it would draw a staircase. Eight voices is eight, so this is
   * the one knob here that asks for none rather than wearing a refused button.
   */
````

<a id="muta-27"></a>
## muta-27: demo/muta/index.html, inline script, line 527

````js
  /* 🔴 IT IS BUILT WITH NO `label`, AND THAT IS NEW ON 2026-09-29. It used to
     carry one and never show it: `createInstrumentPanel` strips a `.pos-pick-l`
     off whatever it puts in the plate's `patch` slot, so the caption was built
     and then removed, and the assert below read its absence as proof the picker
     was in that slot. The picker has left the plate, nothing strips anything
     now, and a `label` here would put a `MODEL` caption back on screen. The ask
     it would break is *"no label on patch selctor"*, 2026-09-28.
     ⚠️ `what` IS NOT THE CAPTION. It is the word the arrows and the die say in
     their own titles, *the model before this one*, and it is what a screen
     reader gets where a sighted reader gets the plate. */
````

<a id="muta-28"></a>
## muta-28: demo/muta/index.html, inline script, line 545

````js
  /* ⚠️ NO WRAPPER ROUND IT, AND THE WRAPPER WAS LOAD BEARING IN THE WRONG
     DIRECTION. It was a `.plai-pick` div holding the picker, handed to the old
     header's middle cell. A div round it would take the page's own width rules
     below off the control they are about, because they select `.pos-pick`
     itself. The picker goes in whole. */
````

<a id="muta-29"></a>
## muta-29: demo/muta/index.html, inline script, line 551

````js
  // ── the panel, arranged the way the panel is ────────────────────────────
  //
  // 🔴 READ OFF `plaits/ui.cc:70-84` IN THE PINNED SOURCE, NOT OFF A
  // PHOTOGRAPH. Every pot there is bound with a primary parameter and, for
  // three of them, a SECONDARY reached by holding a button:
  //
  //   FREQUENCY   transposition_, bipolar       no secondary
  //   HARMONICS   harmonics                     octave_
  //   TIMBRE      timbre                        lpg_colour
  //   MORPH       morph                         decay
  //   three attenuverters, each `2.0f, -1.0f`, which is -1 to +1 centred at 0
  //
  // 🔴 SO THE INSTRUMENT HAS FOUR BIG ROTARIES AND THIS PAGE HAS NINE, AND
  // THAT IS A CHOICE RATHER THAN A GAP. `decay` and `lpg_colour` have no knob
  // of their own out there: they are what TIMBRE and MORPH become while a
  // button is held. Folding them into a held gesture here would be faithful
  // and would hide two controls behind something a visitor has to discover, so
  // they are visible and their second label says where the hardware keeps
  // them. WHAT WAS REFUSED is the alternate mode, and the reason is that a
  // page nobody can work is worse than a page that differs from a panel.
  //
  // ⚠️ `octave_` AND `transposition_` ARE TWO FIELDS IN THE FIRMWARE AND ONE
  // HERE. `ui.cc` combines them into `patch.note` before the DSP sees either,
  // so one pitch control is the instrument. Splitting it into coarse and fine
  // would be copying the panel rather than the instrument.
  //
  // ⚠️ AND THE ATTENUVERTERS ARE IN THE PANEL'S ORDER, TIMBRE THEN FM THEN
  // MORPH, which `plaits/drivers/pots_adc.h` enumerates in exactly that order.
  // Putting FM first would have grouped it with the row it modulates, which is
  // a better argument about meaning and a worse one about fidelity, and
  // fidelity is what was asked for.
  //
  // ⚠️ NO MARGIN ARITHMETIC. Every column is one `createKnob`, every row is one
  // `createKnobBank`, and the only geometry this page writes is one widened
  // gap. `positron-ui` records `/twelve/` being corrected by screenshot twelve
  // times in one evening, every time for a page doing arithmetic about a
  // component's insides.
````

<a id="muta-30"></a>
## muta-30: demo/muta/index.html, inline script, line 589

````js
  /**
   * 🔴 EVERY KNOB ON THIS PAGE HAS AN INVISIBLE HAND, ASKED FOR 2026-09-22 AS
   * *"add inivisible hands to muta's"*. It is `hand: true` in these two helpers
   * rather than on fourteen call sites, so a knob added later gets one by
   * being a knob.
   * ✅ **AND IT COSTS NOBODY ANYTHING HERE, WHICH IS NOT TRUE EVERYWHERE.**
   * The ten minute ceiling in `hand-drive.mjs` was written for `/knobs/`, where
   * a hand puts fifty messages a second on a relay and into a Raspberry Pi in
   * another building. This page opens no socket and reaches no relay: a hand on
   * it moves a number across one thread boundary into an AudioWorklet on this
   * machine, and it is audible in the next render quantum, 2.67 ms away.
   * ⚠️ **A CONTROL TOO COARSE FOR ONE REFUSES ITSELF AND SAYS SO ON ITS OWN
   * BUTTON.** Every knob here is continuous, so every one qualifies; the voice
   * count does not and is not a knob in this bank.
   */
````

<a id="muta-31"></a>
## muta-31: demo/muta/index.html, inline script, line 610

````js
    /**
     * ⚠️ `o.onInput` WINS WHERE A CALLER GIVES ONE, AND THIS LINE USED TO PUT
     * THE HELPER'S AFTER THE SPREAD, so a caller's callback was silently
     * replaced. Every knob but one is a firmware parameter and wants the
     * default; the voice count is the host's own and has to be able to say so.
     */
````

<a id="muta-32"></a>
## muta-32: demo/muta/index.html, inline script, line 622

````js
  /**
   * 🔴 NO KNOB ON THIS PAGE CARRIES A SECOND LABEL SINCE 2026-09-22, ASKED FOR
   * AS *"rm muta sublabels"*. Fifteen of them went.
   * ⚠️ **THE HEIGHT ARGUMENT SURVIVES THE CHANGE AND THE OTHER ONE DOES NOT.**
   * `knob.mjs` appends a sub only when there is one, so a row mixing knobs with
   * and without would have columns of two different heights. None of them has
   * one now, so the rows still agree, which is what that rule was protecting.
   * 🔴 **WHAT IT COSTS IS NAMED RATHER THAN LEFT TO BE DISCOVERED: `TIMBRE` AND
   * `MORPH` EACH APPEAR TWICE ON THIS PAGE**, once as a big rotary and once as
   * an attenuverter, and the range underneath was what told them apart.
   * ✅ **THE MARKS DO MOST OF THAT JOB NOW.** The three attenuverters print `-`
   * and `+` at the ends of their travel and the four big rotaries print
   * nothing, which this page already asserts as both halves of one claim. So a
   * reader can still tell a bipolar knob from a unipolar one; what is gone is
   * the number that said BY HOW MUCH.
   * 🔴 **AND THE VOICE COUNT LOST THE LABEL THAT WAS CARRYING ITS HONESTY.** It
   * read `host, not panel`, and the note above it says in as many words that
   * what keeps a knob the hardware does not have inside this case is the second
   * label rather than the position. That claim now has nowhere on the panel to
   * live. It is recorded here, and the page's own prose is where it belongs if
   * anybody wants it back.
   */
````

<a id="muta-33"></a>
## muta-33: demo/muta/index.html, inline script, line 644

````js
  //
  // 🔴 AND THE THREE ATTENUVERTERS PRINT THE PANEL'S OWN MARKS, WHICH IS WHAT
  // `ends` IS FOR. `createKnob` takes either `true`, which prints `min` and
  // `max`, or a pair. The pair is right here for two reasons and the first is
  // this page's own settled rule: when meaning and fidelity disagree on a
  // panel here, fidelity wins, which is already written a few lines up about the
  // attenuverters' ORDER. Mutable print `-` and `+` beside these three pots and
  // nothing beside the four big ones.
  // ⚠️ THE SECOND REASON IS THAT `ends: true` WOULD SAY THE SAME THING TWICE.
  // These three already carry `-1 to 1` as their second label, so numbers in
  // the dial's gap would be the same two figures 12 px above themselves inside
  // one 46 px column, and the live value is printed above the dial as well.
  // `-` and `+` add the one thing neither of those carries: WHICH HALF OF THE
  // TRAVEL is negative, said by position rather than by text.
````

<a id="muta-34"></a>
## muta-34: demo/muta/index.html, inline script, line 659

````js
  /**
   * 🔴 TWO CONTROL GRIDS, NOT TWO KNOB BANKS, SINCE 2026-09-22. Asked four
   * times, latterly as *"where is knobs grid?"*, and it closes a circle:
   * `control-grid.mjs` was EXTRACTED FROM THIS PAGE. Its header quotes the ask
   * it was built for, *"make component for know etc grid where centers of 2x2
   * knobs make square etc"*, and records the measurement that prompted it,
   * **46 px across and about 100 down, so four knobs made a tall rectangle and
   * were reported as one**. The page it came from was the one page never
   * converted to it.
   * 🔴 **WHY TWO GRIDS AND NOT ONE.** A grid has ONE gap, and this panel has
   * two different ones on purpose: *"add more space around plai rotaties"* put
   * a wider gap between the module's own four rotaries and the ones this page
   * adds. A single five wide grid would have to give that up. Two grids keep
   * both asks, and the left one is literally the 2 by 2 the component was asked
   * for.
   * ⚠️ **THE LATTICE IS SQUARE AND THAT IS A REAL CHANGE TO WHAT YOU SEE.**
   * `pitchFor` is `max(width, height) + gap`, and a knob cell is far taller
   * than it is wide, so the columns open out to the row pitch. The knobs sit
   * further apart than they did, which is the whole point: centres on a square
   * lattice rather than a tall rectangle.
   */
````

<a id="muta-35"></a>
## muta-35: demo/muta/index.html, inline script, line 689

````js
  /**
   * 🔴 THE THREE ATTENUVERTERS PRINT THE PANEL'S OWN MARKS, WHICH IS WHAT
   * `ends` IS FOR, and the order is the PANEL's: `plaits/drivers/pots_adc.h`
   * enumerates them `TIMBRE_ATTENUVERTER, FM_ATTENUVERTER, MORPH_ATTENUVERTER`.
   * ⚠️ AND ROW TWO OF THIS GRID HOLDS THE THREE THE HARDWARE GIVES NO KNOB TO:
   * `decay` and `lpg_colour` are the alternate functions of MORPH and TIMBRE,
   * reached by holding a button, and the voice count is this page's own.
   */
````

<a id="muta-36"></a>
## muta-36: demo/muta/index.html, inline script, line 700

````js
      /**
       * 🔴 THE ATTENUVERTERS SAY `CV`, AND THE HARDWARE DOES NOT. Reported
       * 2026-09-22 against a screenshot: *"double timbre?"*, with `TIMBRE` on
       * a big rotary and `TIMBRE` on the attenuverter beside it.
       * ⚠️ **THE PANEL REALLY DOES PRINT BOTH THE SAME**, and it can: the
       * attenuverter is a different SIZE, sits under its own jack, and is one
       * of a row of three small knobs. A uniform grid has none of those
       * channels, so on a screen the two names are simply the same name twice.
       * ✅ `CV` IS WHAT THEY ATTENUATE and is the firmware's own idea:
       * `timbre_modulation_amount` scales the voltage arriving at the TIMBRE
       * jack. It is three characters, so the label still fits its cell.
       * ⚠️ AND IT COSTS THE REPLICA SOMETHING, WHICH IS WORTH SAYING RATHER
       * THAN HIDING: this is the page departing from the panel's own words. It
       * departs because the panel's other two channels are not available here,
       * not because the words were wrong.
       */
````

<a id="muta-37"></a>
## muta-37: demo/muta/index.html, inline script, line 733

````js
  // ── the case ────────────────────────────────────────────────────────────
  //
  // 🔴 `createInstrument`, WHICH IS THE COMPOSITION AND NOT A CASE THIS PAGE
  // DRAWS. It calls `createPanelLayout` and `createNameplate` and builds
  // neither itself, and five pages had written that assembly by hand before it
  // existed. The maker comes from `MAKER` in that module, so the word is typed
  // in one place on the site rather than on every panel.
  //
  // 🔴 `side: null`, WHICH IS A PANEL WITH NO FIXED COLUMN, AND `/circuit/`
  // IS THE OTHER ONE. A fixed column has to hold something that must stay put
  // while the rest scrolls, and nothing here qualifies: the two knob rows come
  // to 342 px, so at every width this page is read at there is nothing to
  // scroll. The one candidate was the model picker, and a `--pick-w` of 22ch
  // makes it about 250 px wide, which at 390 px would leave the rotaries about
  // 100 px of strip and force a sideways drag on a phone to reach the fourth
  // knob.
  //
  // ⚠️ THE VOICE SLIDER STAYS OUTSIDE THE CASE, WHICH IS THE SAME CLAIM ITS
  // OWN SECOND LABEL MAKES. Plaits is one module with one voice in it; eight
  // of them is this page's arrangement of copies. Putting that control on the
  // instrument's plate would have the case claiming a knob the instrument does
  // not have, which is the one thing a replica may not do.
````

<a id="muta-38"></a>
## muta-38: demo/muta/index.html, inline script, line 755

````js
  /* 🔴 NO MAKER, ASKED FOR 2026-09-22 AS *"rm positron from plai and tom
     nameplates"*. `plateSpec` turns an empty maker into ONE line at `end`
     rather than `ends`, because `ends` is `space-between` and parks a lone
     child on the left, which `/twelve/` was reported for. The page does not
     choose that placement and cannot get it wrong. */
````

<a id="muta-39"></a>
## muta-39: demo/muta/index.html, inline script, line 760

````js
  /**
   * 🔴 THE `Test tone` BUTTON, AND IT SITS WHERE THE ON AND OFF SWITCH USED TO.
   * Asked 2026-09-28: *"muta: on by default, no online button, put a test tone
   * on that spot"*. `status` is the slot after the name at the start end of the
   * plate row, and it was a `createPresenceButton` reading `on` and `off` from
   * 2026-09-22 (*"create instrumet header/glue ... left: online status button:
   * enabled disabled (green/gray)"*) until today.
   * 🔴 **THERE IS NOTHING LEFT TO SWITCH, WHICH IS WHY THE BUTTON IS GONE
   * RATHER THAN MOVED.** The instrument is on from the moment the page is: the
   * firmware is fetched and built on the visit and the sound device opens on
   * the first touch of the panel, so a control saying *this one is running* has
   * nothing to report and a control saying *turn it on* has nothing to do.
   * `plaitsOn`, `light()`, `togglePlaits()` and `idleIfEmpty()` all went with
   * it, because a flag that can only ever be true is a dead guard wearing a
   * name, and this project pays more for those than for anything else.
   * ⚠️ **IT IS A PLAIN `<button>` WITH `aria-pressed` RATHER THAN A KIT
   * COMPONENT, AND THAT IS THE KIT'S OWN ANSWER.** `check.mjs` records why a
   * checkbox is a checkbox: *pressed* is the wrong verb for *this one is in the
   * set*. Here the verb is right. This is a thing somebody armed, which is the
   * shape `choice.mjs` gives its segments, and one segment is not a segmented
   * row. A presence button was tried and refused: it reports a state and this
   * reports what a press did.
   * ⚠️ **AND IT IS LIVE FROM THE FIRST FRAME.** It used to be born `disabled`
   * because the oscillator was off, and a press that arrives before the
   * firmware has landed now queues behind the visit's own fetch rather than
   * being refused. A dead button in the one slot a visitor looks at would be
   * this page answering *on by default* with a control that is not.
   */
````

<a id="muta-40"></a>
## muta-40: demo/muta/index.html, inline script, line 793

````js
    /* 🔴 THE MAKER'S OWN TEAL, ASKED FOR AS *"use mi cyan/teal for the
       plaits"*. `--mi-teal` is `#3c8a8a`, MEASURED off a photograph of the
       panel at 116 px of it, and it is in `shell.css` beside the four others
       from the same two images.
       ⚠️ IT DOES NOT DISPLACE `--hi`, which still means *the thing this control
       is about* everywhere else on the site. A replica drawing somebody else's
       instrument in their colour is a different claim from a page highlighting
       its own control, and this trace is the first.
       ⚠️ AND IT IS THE LIGHTENED ONE. The panel's own `#3c8a8a` came off a
       WHITE box and contrasts at 4.27 against this ground; `--mi-teal-lit` is
       the same hue and saturation at 7.54. See `shell.css`. */
````

<a id="muta-41"></a>
## muta-41: demo/muta/index.html, inline script, line 809

````js
  /**
   * 🔴 THE INSTRUMENT IS THE KIT'S GLUED PANEL SINCE 2026-09-28, ASKED FOR AS
   * *"apply instument panel"*, *"no label on patch selctor"* and *"move
   * visualization to top of instrument"*. All three are one call, and two of
   * them are things the component does by construction rather than things this
   * page arranges.
   * 🔴 **THE PICTURE IS A ROW AND IT IS THE FIRST ONE.** It was a glue PART
   * outside the case, which is the arrangement `instrument-panel.mjs`'s own
   * header names this page for: *"the picture row is drawn on none, because
   * /muta/ and /fau/ both had to pass theirs as a glue part OUTSIDE the case to
   * get edge to edge"*. A `viz` row is edge to edge (`pad: false`) and nothing
   * is ever inserted above it, so *top of instrument* is not a rule this page
   * has to keep.
   * 🔴 **AND THE PATCH SELECTOR HAS NO CAPTION, WHICH WAS THE COMPONENT'S
   * DOING UNTIL 2026-09-29 AND IS THIS PAGE'S NOW.** While it sat in the
   * plate's `patch` slot the component removed its `.pos-pick-l` for the reason
   * `positron-ui` records: a plate reading `MUTA  ‹ virtual analog ›` already
   * says what the control is, and a word between them names what the reader is
   * reading. The picker has left that slot, so nothing strips anything, and the
   * control is BUILT with no `label` instead. The ask is the same one,
   * *"no label on patch selctor"*, 2026-09-28.
   * ⚠️ **AND THE ASSERT THAT GRADED IT HAD TO CHANGE ITS SUBJECT.** It read
   * the absence of a caption inside `panel.patchEnd` and took that as proof the
   * picker was in the stripping slot; `patchEnd` is null now, so a check written
   * that way would be vacuously green. What grades it is the foot assert, which
   * requires the foot to hold no control at all.
   * 🔴 **AND `full` TAKES THE PAGE'S WIDTH, ASKED FOR 2026-09-29 AS *"muta:
   * full content w in deskop"*. THIS PARAGRAPH SAID THE OPPOSITE UNTIL TODAY
   * AND THE ARGUMENT IT MADE IS STILL THE RIGHT ONE, WHICH IS WHY IT IS KEPT.**
   * It read: `.pos-rows` is `width: fit-content` and this page does not pass
   * `full`, so the panel is as wide as its widest row rather than running the
   * width of the readout the way the case did, which is `positron-compose` §3,
   * *an instrument is as wide as the instrument*, written down after four knobs
   * on a pedal floated in a 660 px band and the verdict was *"plainly awful"*.
   * ⚠️ **WHAT ANSWERS IT IS THE SECOND HALF OF THE SAME ASK.** A full width
   * panel with its controls parked hard left is exactly the band that verdict
   * was about; the knobs centre in the width and the `Test tone` button takes
   * the right of the plate row, so the band is a decision about where things
   * sit rather than a surface that ran out of content. Both rules are in this
   * page's own sheet, confined to the widths that have the room.
   * ⚠️ **AND THE PHONE IS NOT PAYING FOR IT.** MEASURED at 480 and 375 before
   * the flag: the panel was ALREADY the window's width less its 16 px page
   * inset, 448 and 343, because `.pos-rows` carries `max-width: 100%` and this
   * row is wider than the screen. Only 560 moves, by 3 px, from 525 to 528.
   */
````

<a id="muta-42"></a>
## muta-42: demo/muta/index.html, inline script, line 854

````js
  /**
   * 🔴 **THE FOOT IS THE NAMEPLATE ALONE SINCE 2026-09-29, AND THE NAME IS
   * `MUTA`.** Asked in these words: *"muta: rename plaits to muta and use
   * instument panel global behaviour whee nameplane is in separate section in
   * bottom"*.
   * 🔴 **BOTH HALVES ARE THE COMPONENT'S OWN BEHAVIOUR, WHICH IS THE POINT OF
   * THE ASK AND IS WHY NO PAGE CSS ARRANGES IT.** A `plate` carrying only a
   * `name` is built as ONE `.panel-plate` and given a row of its own, and
   * `ROW_KINDS` puts a plate last at every width, so *its own section at the
   * bottom* is what `createInstrumentPanel` draws when it is handed nothing
   * else. `/shape/` and `/tom/` are the two pages that already looked like
   * this. What this page was doing instead was the two-ended foot: the name
   * and the `Test tone` button as a `.pos-ipanel-name` cluster at the start,
   * the model picker at the far end, and a phone layout that wrapped the two
   * ends onto two lines.
   * 🔴 **AND THE SAME DAY'S NEXT ASK PUT THE CONTROLS BACK ON THAT FOOT, ON
   * THE OTHER SIDE OF THE NAME.** The sketch is
   * `MUTA      [test tone][<| patchname |>][ ]` at the desk and
   * `[test tone][<| patchname |>][ ]` over a centred `muta` on a phone. So the
   * foot is two ended again, and the difference from what it was this morning
   * is WHICH end each thing is on: the name is alone at the start, and the
   * button travels with the picker at the far end rather than sitting in
   * `status` beside the name. `.muta-end` is that pair.
   * ✅ **THE PHONE SKETCH IS THE COMPONENT'S OWN BEHAVIOUR AND NOTHING HERE
   * ARRANGES IT.** `shell.css`'s block at 560 and under centres the plate row
   * and carries `order: 1` on `.pos-ipanel-name`, which is what drops the name
   * BELOW the group and centres it. This page only has to make the group take
   * the whole line, which is one declaration.
   * ⚠️ **THE NAME LEANS LEFT AT THE DESK, WHICH IS THE SKETCH AND ALSO THE
   * DEFAULT.** A two ended plate row is `space-between`, so the name parks at
   * the start with no `place` passed at all.
  /* 🔴 THE FAR END IS A GROUP, NOT A CONTROL, AND THAT IS WHAT LETS THE BUTTON
     SIT LEFT OF THE PICKER. Asked 2026-09-29 with a sketch:
     `MUTA      [test tone][<| patchname |>][ ]`. The plate's `status` slot is
     the only other place a control may go and it is the wrong side of the name,
     so both controls travel together as the `patch` end.
     ⚠️ **A DIV IS NOT A PICKER AS FAR AS THE COMPONENT IS CONCERNED**, so
     `unlabel` does not run on it. Nothing is lost: the picker is built with no
     `label` at all, which is the same ask answered one step earlier. */
````

<a id="muta-43"></a>
## muta-43: demo/muta/index.html, inline script, line 897

````js
  /* 🔴 ON THE PATCHBAY AFTER A PRESS OF JOIN, AND NEVER ON A VISIT
     (`plans/plan-routing-migration.md` step 5, `engine-node.mjs`). The voices
     are an engine node with notes and controllers in and sound out, and this
     browser's MIDI devices come with it. The control and its badge sit on a
     line of their own under the panel, and NOT in the plate's `status` slot:
     the foot is the owner's sketch `MUTA      [test tone][<| patchname |>][ ]`
     after *"no online button"*, and the foot's own assert reads one child at
     the name end. The badge says whether a keyboard linked in from
     `/patchbay/` is arriving, the owner's *"visual indication"* rather than a
     patch view. */
````

<a id="muta-44"></a>
## muta-44: demo/muta/index.html, inline script, line 926

````js
  /**
   * 🔴 THE PICTURE IS THE INK AND NOTHING ELSE SINCE 2026-09-28, AND IT USED TO
   * BE THE INK AND THE SWITCH. This read `if (!plaitsOn || !anyInk(...))`, and
   * the paragraph here argued that the two are different tests: an instrument
   * switched on can be silent and a silent one can still be switched on, so
   * checking the ink alone would leave a picture up on a panel that says it is
   * off. Every word of that was true of a page with a switch on it.
   * ⚠️ **THERE IS NO SWITCH, SO THERE IS NO SECOND TEST.** Nothing on this page
   * can say *off* any more, and a flag that is true for the whole life of the
   * page is a guard that cannot fire. What is left is the honest half: a
   * picture shows what is sounding, and nothing sounding draws nothing.
   */
````

<a id="muta-45"></a>
## muta-45: demo/muta/index.html, inline script, line 946

````js
    /* 🔴 NO `colour` HERE, AND IT WAS `--hi` FOR THREE ROUNDS OF BEING ASKED TO
       CHANGE IT. The figure is BUILT with the instrument's colour and every
       repaint passed a second one, so the constructor was right and the paint
       path silently won. A caller that sets a property on every update owns
       that property, whatever the constructor says. Asked three times, and each
       time I changed the line that does not run. */
````

<a id="muta-46"></a>
## muta-46: demo/muta/index.html, inline script, line 360

````js
  /**
   * 🔴 A KEYBOARD PLAYS THE OSCILLATOR, AND THE PAGE IS SIMPLY LISTENING.
   * Asked 2026-09-25: *"rm midi on button. its should be listening. set up midi
   * listening / permission when i turn either on at start"*.
   * 🔴 **THIS REVERSES TWO EARLIER ASKS AND THIS COMMENT USED TO ARGUE FOR
   * THEM.** It recorded *"add webmidi support (online button midi off)"* and
   * *"add a button (online status one) to turn midi on and off. when on, listem
   * webmidi keyboard"* from 2026-09-22, and defended a separate switch on the
   * grounds that whether a keyboard is being listened to is a different fact
   * from whether an instrument is running. That reasoning is unchanged and the
   * decision went the other way: a keyboard nobody is listening to is one more
   * thing to switch on before anything happens, and the page now listens for as
   * long as an instrument is on.
   * ⚠️ **A VISIT STILL OPENS NOTHING, AND THAT IS THE LINE HELD HERE.**
   * `requestMIDIAccess` is a permission prompt, so it is asked from the press
   * that turns an instrument on and never from the page loading. Turning an
   * instrument on is a gesture somebody made; a visit is not, and nothing on
   * the load path reaches this.
   * ⚠️ **AND IT IS ASKED ONCE.** `ensureMidi` is idempotent, so turning both
   * instruments on, or turning one off and on again, is one prompt and not
   * four. The check block reads the count rather than trusting the flag.
   * ⚠️ **A KEY USED TO PLUCK, AND THE CAUSE WAS IN THE FIRMWARE SHIM RATHER
   * THAN ON THIS PAGE.** `plai_note_on(note, hold)` takes a hold in BLOCKS,
   * decided at the moment the key goes down, so the length of a note had to be
   * guessed before the player had finished playing it. `plai_note_off` was
   * added to `plai_shim.cc` on 2026-09-22 and the wasm rebuilt; a key now holds
   * the gate up for as long as it is down.
   */
````

<a id="muta-47"></a>
## muta-47: demo/muta/index.html, inline script, line 389

````js
  /* HOW MANY TIMES THE BROWSER WAS ASKED, AND WHEN. `midiAsks` counts the
     prompt rather than the flag, because a flag says what this page believes
     and the count says what a visitor was asked for. `midiAsksOnLoad` is that
     count read at the last line of the module, which is the whole of the visit,
     and it is the negative half of the assert below: it has to be zero. */
````

<a id="muta-48"></a>
## muta-48: demo/muta/index.html, inline script, line 395

````js
  /**
   * 🔴 WHO ASKED FOR THE TEST TONE, WHICH IS A DIFFERENT QUESTION FROM WHETHER
   * ONE IS RUNNING. `droning` is the state; this is the intent, and only an
   * explicit press moves it.
   * 🔴 **AND NOTHING BUT THE `Test tone` BUTTON SETS IT SINCE 2026-09-25.**
   * Turning PLAITS on used to, which is the *"rm all top buttons, automatically
   * go for drone"* arrangement of 2026-09-22, reversed by *"no automatic drone.
   * make a Test tone button in the right of plaits"*.
   */
````

<a id="muta-49"></a>
## muta-49: demo/muta/index.html, inline script, line 405

````js
  /* WHAT IS UNDER A FINGER, AND WHAT IS ONLY UNDER THE PEDAL. `pedal.mjs` owns
     both sets, the 63/64 threshold, the change filter and the panic; this page
     owns what letting go of a note means on its own graph, which here is one
     message to the worklet.
     ⚠️ THE DAMPER TIME IS IGNORED ON PURPOSE. `release` is handed one, and this
     instrument's release is the shim's own `plai_note_off` with a shape this
     page cannot set. `/nola/` is the page that spends it. */
````

<a id="muta-50"></a>
## muta-50: demo/muta/index.html, inline script, line 412

````js
  /* ⚠️ AND A DRONE HAS NOTHING TO LET GO OF, WHICH BELONGS HERE RATHER THAN AT
     `keyUp`. The key set the drone's pitch and the engine goes on running, so
     the release is swallowed while the bookkeeping stays correct: put the test
     at the call site instead and the pedal never learns the key came up, so the
     foot is holding a note nobody is playing the moment the drone stops. */
````

<a id="muta-51"></a>
## muta-51: demo/muta/index.html, inline script, line 422

````js
  /* 🔴 THE `Test tone` BUTTON IS BUILT ABOVE, BESIDE THE PLATE IT SITS ON, AND
     IT WAS BUILT HERE AND ADDED AS A ROW OF ITS OWN UNTIL 2026-09-28. The ask
     that moved it is *"put a test tone on that spot"*, the spot being the one
     the on and off switch had, so the control has to exist before
     `createInstrumentPanel` is called rather than being inserted after it.
     ⚠️ `toggleTone` IS A FUNCTION DECLARATION, so the listener up there reaches
     it however far above this line it is attached. */
````

<a id="muta-52"></a>
## muta-52: demo/muta/index.html, inline script, line 431

````js
  /**
   * 🔴 THE THREE MIDI HANDLERS ARE NAMED FUNCTIONS RATHER THAN LITERALS INSIDE
   * `createMidi`, SO THE PAGE'S OWN CHECKS CAN DRIVE THEM. A check that reached
   * past them and called `noteOn` would grade the synth and say nothing about
   * the keyboard, and this machine has no MIDI under a harness, so the real
   * callback is the only part of that path a check can ever reach.
   */
````

<a id="muta-53"></a>
## muta-53: demo/muta/index.html, inline script, line 438

````js
  /**
   * 🔴 A KEY TAKES THE TEST TONE DOWN AND PLAYS ITS OWN NOTE. Asked
   * 2026-09-25: *"when midi notes arrive, they turn off test tone and vice
   * versa"*.
   * 🔴 **AND THIS REVERSES WHAT IT DID, WHICH WAS ASKED FOR IN THE SAME
   * WORDS.** Until today a key STEERED a running drone: *"why can i not use
   * midi to control drone"*, 2026-09-22, retuning every unpatched voice through
   * `plai_set_param` id 1 and moving the pitch rotary with it. That mechanism
   * is still in the shim and is still what the pitch rotary uses. What changed
   * is who may reach it: the two sounds are exclusive now, so a key ends the
   * tone rather than bending it.
   * ⚠️ **THE OTHER HALF IS IN `toggleTone`**, which takes every held key down
   * before it starts. Exclusive both ways was the ask and one direction is not
   * half of it.
   */
````

<a id="muta-54"></a>
## muta-54: demo/muta/index.html, inline script, line 461

````js
    /* 🔴 THE PEDAL KEEPS THE NOTE, WHICH IS THE WHOLE OF WHAT A SUSTAIN
       PEDAL IS. `keyUp` returns false when the foot took it; when it returns
       true the note off has already gone out through `release` above. */
````

<a id="muta-55"></a>
## muta-55: demo/muta/index.html, inline script, line 466

````js
  /**
   * 🔴 CONTROLLER 64 IS THE SUSTAIN PEDAL AND IT IS THE ONLY CONTROLLER
   * THIS PAGE READS. Asked for 2026-09-22: *"how can i get long sustaned
   * notes, drony ones? i do have sustain pedal but"*. Half of a keyboard is
   * under the player's foot and none of it reached the instrument.
   * ⚠️ THE 63/64 THRESHOLD, THE CHANGE FILTER AND THE TWO SETS ARE ALL IN
   * `demo/shell/pedal.mjs` NOW, with `demo/shell/pedal-test.mjs` beside it:
   * twelve negative controls and seven sabotages, none of which needs a
   * browser. This stays a named function because a check on this page can
   * drive it and cannot drive a real pedal.
   */
````

<a id="muta-56"></a>
## muta-56: demo/muta/index.html, inline script, line 481

````js
  /**
   * 🔴 OPEN THE KEYBOARD, ONCE, FROM THE PRESS THAT TURNS AN INSTRUMENT ON.
   * Asked 2026-09-25: *"set up midi listening / permission when i turn either
   * on at start"*, when there were two instruments to turn on and both called
   * this. There is one now, so *either* is one press, and it is still
   * idempotent, which is what keeps the count below at 1 however many times it
   * is reached.
   * 🔴 **IT RUNS AT THE TOP OF `arm()`, AND THE ORDER IS LOAD BEARING TWICE
   * OVER.** A permission prompt has to be reachable from the gesture that
   * caused it, and `arm()` awaits `open()`, which runs this page's whole
   * check block as its last act: called after that await, the count this page
   * asserts on would still be zero while the assert read it. Neither reason is
   * cosmetic and they point the same way.
   * ⚠️ **AND THE GESTURE THAT CARRIES IT IS THE FIRST TOUCH OF THE PANEL SINCE
   * 2026-09-28**, because the switch that used to carry it is gone.
   * ⚠️ **`createMidi` IS SYNCHRONOUS AND ASKS ASYNCHRONOUSLY**, so `midi` is
   * assigned on this line and `midi.state()` answers `refused`, `unsupported`
   * or `connected` whenever the browser gets round to saying. Nothing here
   * awaits it, because the audio must not wait on a device most visitors do not
   * have.
   * ⚠️ **AND THERE IS NO WAY TO STOP LISTENING, WHICH IS THE ASK.** The switch
   * that used to do it is gone. `pedal.panic()` on an instrument going off is
   * what keeps a foot from carrying a note across.
   */
````

<a id="muta-57"></a>
## muta-57: demo/muta/index.html, inline script, line 513

````js
      /* ⚠️ HOW MANY INPUTS THERE ARE IS A LOG LINE AND NOT A STATE. A keyboard
         plugged in later is news; it is not a control flipping itself. The
         lamp this used to feed is gone with the switch it was on. */
````

<a id="muta-58"></a>
## muta-58: demo/muta/index.html, inline script, line 525

````js
  /**
   * 🔴 THE TEST TONE, WHICH IS THE DRONE WITH A BUTTON IN FRONT OF IT.
   * `trigger_patched` cleared is the whole difference between a note and a
   * tone in Plaits: with nothing patched into the trigger the lowpass gate is
   * bypassed and the engine simply runs, so this is the one sound here that
   * never ends and the one worth turning a rotary against.
   * ⚠️ **IT TAKES THE KEYS DOWN FIRST, WHICH IS THE `vice versa` HALF OF THE
   * ASK.** `startDrone` already forgets the pedal's bookkeeping; this is the
   * sound, and without it a key still ringing would be swallowed by the tone
   * and never release, which is the stuck note reported on 2026-09-22 as *"that
   * pluck never goes away"*.
   */
````

<a id="muta-59"></a>
## muta-59: demo/muta/index.html, inline script, line 537

````js
  /* ⚠️ `await arm()` IS THE WHOLE OF WHAT THIS PRESS HAS TO BUY SINCE
     2026-09-28, AND IT USED TO BE A GUARD. The line above it read
     `if (!plaitsOn) return`, which was right while a switch had to be pressed
     first; now the press that reaches this IS the gesture, and the pointer
     event that produced it has already started the arming through the panel's
     own capture listener, so this await is usually a promise that has already
     settled. */
````

<a id="muta-60"></a>
## muta-60: demo/muta/index.html, inline script, line 581

````js
  /**
   * One note, at the pitch the control is showing. `holdMs` of 0 sustains.
   *
   * 🔴 THE `if (!plaitsOn) return` THAT STOOD HERE IS GONE WITH THE SWITCH,
   * 2026-09-28, AND THAT IS A REAL LOSS OF A GUARD RATHER THAN A TIDY UP. It
   * was the answer to *"when plaits is off and warps in on from plaits - how it
   * can play at all?"*, 2026-09-25: two things could ask a switched off
   * oscillator to sound, a key and the tone button, and neither might. There is
   * no off any more, so the question has no subject and the guard could never
   * be false.
   * ⚠️ **WHAT STILL STOPS A NOTE BEFORE THE INSTRUMENT IS UP IS `send`**, which
   * posts nothing while there is no worklet node. A key cannot arrive before
   * then anyway: `ensureMidi` runs inside `arm()`, so the browser is not
   * listening to a keyboard until the first touch of the panel has opened the
   * audio.
   */
````

<a id="muta-61"></a>
## muta-61: demo/muta/index.html, inline script, line 604

````js
  /**
   * ⚠️ NOT ROUNDED TO A SEMITONE, AND THE ROUNDING IS WHAT WAS REMOVED. The
   * panel's FREQUENCY pot is continuous and `NoteToFrequency` takes a float, so
   * a knob reading 60.37 plays 60.37. Rounding it would leave the control
   * showing one number and the instrument playing another, which is the
   * smallest version of a control that lies. The chord adds whole semitones to
   * whatever this is, exactly as turning the knob on the module does.
   */
````

<a id="muta-62"></a>
## muta-62: demo/muta/index.html, inline script, line 616

````js
  /**
   * 🔴 THE HALF OF THE OLD `boot()` THAT TOUCHES NO SOUND DEVICE, SPLIT OUT
   * 2026-09-28 FOR *"muta: on by default"*. The instrument has to be READY the
   * moment the page is, and a browser will not hand out a running audio context
   * without a gesture anyway, so *on by default* cannot mean a context on load
   * and it cannot mean a noise on load. What it can mean, and what this is, is
   * that everything which is arithmetic over a file this repository ships has
   * already happened when a visitor arrives: the wasm is fetched and a second
   * instance of it is built for the cost bench. Nothing here can make a sound.
   * ✅ **THE SHAPE IS `/fau/`'S, BUILT THE SAME DAY FOR THE SAME ASK** (*"fau:
   * compile on loading so i can play"*): one function boots the firmware and
   * touches no context, and `arm()` below is the only thing in this file that
   * does touch one, with every caller of it a gesture.
   * ⚠️ **AND THE BYTES COME OFF THIS SITE, WHICH IS WHY A VISIT MAY SPEND
   * THEM.** `/muta/vendor/plai.wasm` is 200,710 bytes on this origin, a file
   * this repository ships. The standing rule a load-path fetch looks like it
   * breaks is about somebody else's server, and `/reel/` broke it by asking
   * arhiiv.err.ee for a newsreel on every visit. Nothing is asked of anybody
   * here, and the check below reads what the browser really loaded rather than
   * taking this paragraph's word for it.
   * ⚠️ **IDEMPOTENT AND SELF-HEALING.** A failed fetch clears the handle, so a
   * press after a bad network starts a second one rather than waiting for ever
   * on a promise that already rejected.
   */
````

<a id="muta-63"></a>
## muta-63: demo/muta/index.html, inline script, line 648

````js
      /* THE BENCH IS BUILT HERE AND IT IS NOT A SOUND. It is a second instance
         of the same module on the main thread, rendering into its own memory
         and connected to nothing, which is what makes the cost readings
         possible at all: `performance` is not exposed to an
         AudioWorkletGlobalScope. Building it on the visit is the difference
         between an instrument that is ready and one that is only downloaded. */
````

<a id="muta-64"></a>
## muta-64: demo/muta/index.html, inline script, line 666

````js
  // ── the sound device, which a gesture gets ──────────────────────────────
  // 🔴 THIS IS THE ONLY FUNCTION IN THIS FILE THAT TOUCHES AN AudioContext, AND
  // EVERY CALLER OF IT IS A GESTURE: a touch anywhere on the panel, the test
  // tone button, or a MIDI key, which cannot arrive before one of the other two
  // has opened the keyboard. A visit, a knob drag and a model change all open
  // nothing.
````

<a id="muta-65"></a>
## muta-65: demo/muta/index.html, inline script, line 676

````js
    // 48000 ASKED FOR BY NAME, because Plaits is compiled against
    // `kSampleRate = 48000` and its resource tables are built at that rate.
    // Rack answers the same problem with a sample rate converter on the
    // output; this page asks the browser instead and REPORTS WHAT IT GOT, so a
    // machine that hands back 44100 says so rather than playing flat in
    // silence about it.
````

<a id="muta-66"></a>
## muta-66: demo/muta/index.html, inline script, line 687

````js
    /* ⚠️ THE CELL WENT AND THE FACT DID NOT. A rate that is not 48000 is the
       one thing that stops the pitch being right, so it is said out loud rather
       than dropped with its cell. */
````

<a id="muta-67"></a>
## muta-67: demo/muta/index.html, inline script, line 695

````js
    // THE MAIN THREAD FETCHES, THE AUDIO THREAD COMPILES. There is no `fetch`
    // inside an AudioWorkletGlobalScope, so the bytes have to cross the port.
    //
    // 🔴 BYTES, NOT A COMPILED `WebAssembly.Module`. MEASURED 2026-09-22 in
    // headless Chrome 141: posting a Module to an AudioWorklet's port throws
    // nothing here and arrives nowhere. The page read `wasm not yet` on the
    // first render and then timed out, which looks exactly like a broken
    // instrument and is a dropped message. The worklet's header has the whole
    // account.
    //
    // ⚠️ AND THE FETCH IS THE VISIT'S SINCE 2026-09-28, WHICH IS WHY THIS IS AN
    // AWAIT ON A PROMISE RATHER THAN A `grab`. On an ordinary visit it has
    // settled long before a finger lands and this line costs nothing; on a
    // press made in the first fraction of a second it is the one wait a visitor
    // pays, and paying it once is the whole of what *on by default* buys.
````

<a id="muta-68"></a>
## muta-68: demo/muta/index.html, inline script, line 714

````js
    // A processor that throws is dropped by the audio thread for the rest of
    // the page's life, silently. Without this the symptom is an instrument
    // that simply does not sound, which is the least informative face a fault
    // can wear.
````

<a id="muta-69"></a>
## muta-69: demo/muta/index.html, inline script, line 721

````js
    /**
     * 🔴 THE OSCILLATOR'S MAIN JACK, AND ONLY THAT ONE. Plaits renders TWO
     * outputs, `out` and `aux`, and on the hardware they are two sockets; the
     * worklet puts `out` on channel 0 and `aux` on channel 1, so connecting the
     * node straight to the destination would put two different sounds in two
     * ears. The splitter takes channel 0, which is the jack a rack would patch.
     * 🔴 **AND THIS IS THE WHOLE GRAPH SINCE 2026-09-28, WHICH IS WHAT `rm all
     * routing code around it` MEANT.** There was a second worklet here running
     * Warps, a wet gain, a dry gain and a 20 ms crossfade between them, so that
     * the effect's own switch could put it in or out of the way: reported
     * 2026-09-22 as *"sound does not change when i turn warps on and off"*, and
     * MEASURED 2026-09-25 with an analyser on every leg, **0.2468 down the dry
     * road with the effect off and 0.1240 down the wet one with it on**. Both
     * roads are gone with the thing they went round, and what is left is the
     * one line that was always underneath them.
     * ⚠️ **THE SPLITTER IS NOT PART OF WHAT WENT.** It is not routing around
     * an effect, it is the module's two jacks being two jacks, and it is the
     * only reason this page can be connected to a destination at all.
     */
````

<a id="muta-70"></a>
## muta-70: demo/muta/index.html, inline script, line 748

````js
    // 🔴 THE THING WORTH TIMING IS THE FIRST SAMPLE, NOT THE HANDSHAKE.
    // "Instantiated" is a fact about the wasm; "rendered" is a fact about the
    // instrument, and the gap between them is a render quantum plus whatever
    // the audio thread was doing. The worklet announces the first one from
    // inside `process()`.
````

<a id="muta-71"></a>
## muta-71: demo/muta/index.html, inline script, line 761

````js
    /* 🔴 THE BOOT DOES NOT LIGHT ANYTHING, AND THERE IS NOTHING LEFT TO LIGHT.
       A line here set a lamp the moment the wasm answered, which was right
       while one switch started a pair of firmwares and wrong the moment they
       became separate: reported 2026-09-22 as *"plaits on still makes warps
       on"*, because pressing either one booted both and the handshake then lit
       both lamps behind the toggles' backs. The repair was that `light()` and
       nothing else wrote the lamp, and it read `plaitsOn`, because compiling a
       firmware is not the same fact as a person having switched it on.
       ⚠️ **BOTH THE LAMP AND THE FLAG WENT ON 2026-09-28**, and the lesson is
       kept because it is about a class of mistake rather than about that lamp:
       a machine getting ready and a person asking for something are two facts,
       and a single indicator that stands for both will be wrong about one of
       them. */
````

<a id="muta-72"></a>
## muta-72: demo/muta/index.html, inline script, line 777

````js
    // ⚠️ A FAILED BOOT STILL REPORTS. Letting this throw would take the whole
    // check block with it, and a page that stops before it grades itself is a
    // page whose one red line is a stack trace. The assert below says the same
    // thing with the numbers beside it.
````

<a id="muta-73"></a>
## muta-73: demo/muta/index.html, inline script, line 781

````js
    /* 🔴 AND THE CLOCK STARTS AT THE TOUCH, WHICH IS A DIFFERENT NUMBER FROM
       THE ONE THIS LINE PRINTED UNTIL 2026-09-28. It read `after the fetch
       began`, and the fetch is the visit's now, so this is what a finger buys
       rather than what a download costs. The download is timed separately in
       `warmUp` and both are in the log, because collapsing them would hide
       exactly the saving the split was made for. */
````

<a id="muta-74"></a>
## muta-74: demo/muta/index.html, inline script, line 798

````js
    // ⚠️ THE 210.1 MB IS A PUBLISHED ZIP, NOT A PAGE WEIGHT, AND
    // plans/plan-vcv-modules.md §9.3 marks it as unmeasured for exactly that
    // reason. It is quoted as what somebody downloads, which is what it is.
````

<a id="muta-75"></a>
## muta-75: demo/muta/index.html, inline script, line 807

````js
    // WHAT EIGHT VOICES COST IN MEMORY, read off the types in the shim rather
    // than estimated. The allocator buffer cannot be shared: `voice.cc:56`
    // frees it before every engine so that sixteen engines can share one
    // voice's RAM, which means two voices sharing one would be two live
    // engines writing the same bytes.
````

<a id="muta-76"></a>
## muta-76: demo/muta/index.html, inline script, line 819

````js
    /**
     * 🔴 EVERY KNOB IS PUSHED AT BOOT, AND NOTHING DID THIS UNTIL 2026-09-22.
     * The knobs were built with values and the DSP came up with its own
     * defaults, and the two only met when somebody turned something. **A
     * control showing one value while the DSP holds another is the smallest
     * version of a control that lies**, which this page already refuses about
     * the pitch knob in as many words.
     * 🔴 **AND IT IS WHY THE SCOPE WAS A MESH OF LINES.** The time base was
     * supposed to come from the note, which is parameter 1, but the page never
     * sent parameter 1: `scopeHz` stayed 0, the worklet fell back to MEASURING
     * the period, and a measured period on a stepped waveform wanders. Every
     * window was then a slightly different length, so the phosphor's ghosts
     * could never sit under the live trace. Reported three times, latterly as
     * *"i stills ee mesh of lines in 120hz"*.
     * ⚠️ THE LESSON IS THE FIX I MADE BEFORE THIS ONE. Locking the time base
     * to the note was correct and did nothing, because the number it locked to
     * never arrived. **A fix that cannot be observed to work is a fix nobody
     * checked**, and three rounds of tuning the fade were spent on a cause that
     * was one line away.
     */
````

<a id="muta-77"></a>
## muta-77: demo/muta/index.html, inline script, line 846

````js
    // ⚠️ THE BENCH IS ALREADY BUILT. `warmUp` made it on the visit, because it
    // is arithmetic over bytes rather than a device, and `bench = makeBench(…)`
    // stood on this line until 2026-09-28.
    // TWO PRICES, NOT ONE, because the readout cell can only show the setting
    // in front of you and the interesting fact is what the eighth voice costs.
````

<a id="muta-78"></a>
## muta-78: demo/muta/index.html, inline script, line 863

````js
    // ⚠️ A SILENCE CONTROL FIRST, AND IT IS THE HALF THAT MAKES THE NEXT
    // NUMBER MEAN ANYTHING. A page that only ever measures the loud case
    // passes "there was sound" with a broken gate wide open. 600 ms of a
    // running, untriggered voice is the reading that has to be near zero.
    // ⚠️ THE COUNTER, NOT THE VALUE. `last.peak` starts at 0, so reading it
    // before any meter has arrived records a very confident measurement of
    // nothing and the silence assert below would pass having measured no
    // audio at all.
````

<a id="muta-79"></a>
## muta-79: demo/muta/index.html, inline script, line 878

````js
    /**
     * 🔴 THE MEASURING PLAYS ONLY UNDER A HARNESS, AND IT PLAYED FOR EVERYBODY
     * UNTIL 2026-09-22. Reported twice, the second time as *"i still hear
     * opening chime. god..."*, and MEASURED rather than argued about: the
     * oscillator's peak after a press ran **0.113 decaying to 0.023, then 0.315
     * decaying to 0.027, then steady at 0.125**. Two decaying hits before the
     * drone settles, which is a pluck and a chord, both of them this block
     * measuring itself in front of a listener.
     * 🔴 **IT IS THE STANDING RULE, NOT A PREFERENCE**: a self-check never runs
     * for a visitor, on any page, and the two arguments that have been used to
     * make exceptions are both recorded as having shipped a defect. The
     * measurements are real and the asserts below need them; a person turning
     * an instrument on does not.
     * ⚠️ AND THE SILENCE CONTROL ABOVE STAYS OUTSIDE THE GATE, because it plays
     * nothing: it waits 600 ms and reads what an untriggered voice puts out,
     * which is the number the loud one is only meaningful against.
     */
````

<a id="muta-80"></a>
## muta-80: demo/muta/index.html, inline script, line 915

````js
  /**
   * FOUR NOTES AT ONCE, HELD, AND THE TWO THINGS THAT CAN ONLY BE MEASURED
   * WHILE THEY ARE.
   *
   * 🔴 THE GATES ARE NEVER RELEASED, which is what makes the second measurement
   * possible at all. A plucked voice frees itself when it falls quiet, so the
   * count of sounding voices drifts down through the window and
   * `renders / blocks` stops dividing for a reason that is not a fault. The
   * shim only frees a voice whose trigger has fallen, so four gates left up
   * hold four voices for the whole window.
   * ⚠️ HELD, NOT LOUD. `voice.cc:90` triggers the lowpass gate on a RISING EDGE
   * alone, so these four decay like any pluck while staying held. The peak
   * below is therefore a chord's peak and not a sustained one, and comparing it
   * with the single note above is fair for that reason.
   *
   * ⚠️ EVERYTHING BEFORE IT IS STOPPED FIRST. The single pluck above rings for
   * about a second at the default decay, so without this the chord is five
   * voices and the arithmetic below is graded against the wrong number.
   */
````

<a id="muta-81"></a>
## muta-81: demo/muta/index.html, inline script, line 946

````js
    // 🔴 A DELTA OF ZERO SATISFIES `renders === held * blocks` AND MEASURES
    // NOTHING. `positron-verify` calls this the count that is only evidence on
    // the far side of a boundary: both halves of the equation have to have
    // moved, and two different meter reports have to have arrived, before the
    // equality says anything at all.
````

<a id="muta-82"></a>
## muta-82: demo/muta/index.html, inline script, line 963

````js
  /**
   * WHAT N VOICES COST, AND WHERE THE NUMBER COMES FROM.
   *
   * 🔴 ON THE MAIN THREAD, BECAUSE AN AUDIOWORKLET HAS NO CLOCK. `performance`
   * is not exposed to an `AudioWorkletGlobalScope`, measured on this machine
   * before this function existed, so timing the real render inside the real
   * callback is not available. This is the SAME wasm and the SAME shim, a
   * second instance of it, rendering as fast as the machine will go.
   *
   * ⚠️ SO IT IS THE COST OF THE DSP, NOT THE COST OF THE AUDIO CALLBACK. It
   * excludes whatever the browser spends around `process()`, and it is a main
   * thread reading of work that really happens on another thread. Both of
   * those make it a floor rather than a load figure, and the page says so
   * rather than calling it latency.
   *
   * ⚠️ IT DRONES RATHER THAN RESTS. An untriggered voice still runs its engine,
   * but the lowpass gate is shut, and measuring the quiet case would price the
   * instrument at its cheapest moment. A FREE voice is worse than that: the
   * shim does not render one at all, so a bench that never played a note would
   * price eight voices at the cost of nothing.
   *
   * ⚠️ AND IT IS RE-MEASURED PER MODEL AND PER VOICE COUNT, WHICH IS WHY THE
   * CELL MOVES. The sixteen models are not one price: measured here, the
   * cheapest and the dearest are a factor of seven apart.
   */
````

<a id="muta-83"></a>
## muta-83: demo/muta/index.html, inline script, line 1004

````js
    // WARM UP FIRST, and it is not politeness. The first few hundred calls
    // are tiering up through the engine's compilers, and timing those measures
    // the compiler. It also lets the model actually change: the DSP runs the
    // request through a hysteresis quantizer before it swaps.
````

<a id="muta-84"></a>
## muta-84: demo/muta/index.html, inline script, line 1015

````js
  /**
   * DOES IT REALLY TAKE THE QUIETEST, OR ONLY THE OLDEST?
   *
   * 🔴 THE CHECK ON THE AUDIO THREAD CANNOT ANSWER THAT, AND SAYING SO IS THE
   * POINT OF THIS ONE. Three notes played 200 ms apart leave the OLDEST voice
   * and the QUIETEST voice as the same voice, because a plucked note only ever
   * gets quieter. An assert that passes there would pass just as happily
   * against an oldest-first rule, which is `positron-verify`'s A/B where both
   * arms share the bug: the answer comes back identical and reads as fine.
   *
   * ✅ SO THIS BUILDS THE CASE WHERE THE TWO RULES DISAGREE: an older voice
   * that is LOUDER than a newer one. Oldest-first would take the note still
   * sounding out from under a listener; quietest takes the one that has faded.
   *
   * 🔴 AND THE FIRST ATTEMPT AT IT WAS WRONG, WHICH IS WHY IT IS WRITTEN DOWN.
   * It held the older voice's gate up forever on the assumption that a held
   * gate sustains. IT DOES NOT. `voice.cc:90-97` fires `lpg_envelope_.Trigger()`
   * on the RISING EDGE alone, so Plaits' trigger is a one shot and a gate that
   * stays high only stops the voice re-arming. Both voices decayed together,
   * the newer one was louder by 0.0052, and the check went red against a shim
   * that was doing exactly the right thing. The drone is the real bypass: with
   * nothing patched into the trigger the lowpass gate is out of the way and the
   * engine simply runs.
   * ⚠️ A HELD GATE STILL KEEPS A VOICE **ACTIVE**, which is a different claim
   * and is the one the chord above rests on.
   *
   * ⚠️ ON THE BENCH RATHER THAN THE INSTRUMENT, because it needs half a second
   * of rendering with no gaps in it and it must not be audible. Same wasm,
   * same shim, a second instance of it.
   */
````

<a id="muta-85"></a>
## muta-85: demo/muta/index.html, inline script, line 1052

````js
    // ONE VOICE IS SOUNDING, SO THIS DRONES THAT ONE AND NOTHING ELSE. The next
    // note-on patches its own voice's trigger back in and leaves this one
    // alone, which is what makes an older-and-louder voice possible at all.
````

<a id="muta-86"></a>
## muta-86: demo/muta/index.html, inline script, line 1066

````js
  /**
   * ⚠️ THE CELL IS THE OSCILLATOR, AND IT WAS THE WHOLE CHAIN UNTIL
   * 2026-09-28. Two firmwares ran in one quantum and only their sum had to fit
   * it, so a `render` figure for one of them would have been a number that
   * could not go over budget however bad things got. There is one firmware now,
   * so the oscillator's own cost IS the number that has to fit, and
   * `manyVoiceMs` and `costPerQuantumMs` are the same reading rather than one
   * being the other less the effect's share.
   */
````

<a id="muta-87"></a>
## muta-87: demo/muta/index.html, inline script, line 1109

````js
      // 🔴 THE ONE THING A LISTENER CANNOT HEAR. A stolen voice stops making
      // the note it was making, which sounds exactly like a note that was
      // never played, so it is said in words the moment it happens.
````

<a id="muta-88"></a>
## muta-88: demo/muta/index.html, inline script, line 1133

````js
      /* ⚠️ THE `peak` CELL IS THIS METER SINCE 2026-09-28, AND IT WAS THE
         EFFECT'S. What comes out of the page is what comes out of the last
         thing in the chain, and this is the last thing in the chain now. The
         cell means what it always meant and reads a different meter. */
````

<a id="muta-89"></a>
## muta-89: demo/muta/index.html, inline script, line 1151

````js
  /**
   * 🔴 NO SWITCH AT ALL SINCE 2026-09-28, AND THIS IS THE THIRD TIME THIS BLOCK
   * HAS LOST ONE. Asked: *"muta: on by default, no online button, put a test
   * tone on that spot"*. It was two switches and two lamps while there was an
   * effect (*"initial plaits on does nto alter warps turnon. separately
   * controllable"*, 2026-09-22), one switch and one lamp after
   * *"arhive/rmwarps and rm all routing code around it"*, and none now.
   * ⚠️ **WHAT SURVIVES IS THE HALF THAT WAS NEVER ABOUT THE SWITCH.** A browser
   * will not make a sound before a gesture, so the audio context still opens on
   * one. What is gone is the idea that a PERSON has to say *on* first: the
   * gesture is whatever they were going to do anyway, and the firmware is
   * already in hand when they do it.
   * 🔴 **AND `plaitsOn` WENT WITH IT RATHER THAN BEING PINNED TRUE.** Nothing
   * can switch this instrument off, so a flag saying whether it is on has one
   * value for the life of the page, and every `if (!plaitsOn) return` reading
   * it is a branch nothing can take. This project's most expensive class of
   * defect is a guard that cannot fire, because it reads as safety and is
   * scenery. `light()` and `idleIfEmpty()` went the same way: one wrote a lamp
   * that no longer exists, the other suspended the context when the instrument
   * was off and there is no off.
   */
````

<a id="muta-90"></a>
## muta-90: demo/muta/index.html, inline script, line 1175

````js
  /**
   * 🔴 IT RETURNS AT ONCE WHEN THE CONTEXT IS ALREADY RUNNING, AND AWAITING
   * `arming` UNCONDITIONALLY WAS A DEADLOCK. `open()` runs this page's whole
   * check block as its last act, so anything called FROM that block which
   * awaited `arming` waited for a promise that could not settle until it
   * returned. The MIDI switch did exactly that: pressed inside the check, it
   * sat on `await booting` for ever and the assert read `still nothing` on a
   * control that was working.
   * ⚠️ AND THE GUARD IS THE CONTEXT'S OWN STATE rather than a flag, because
   * that is the thing being waited for.
   * 🔴 **AND IT NEEDED A SECOND GUARD ON 2026-09-28, WHICH IS THE SAME DEADLOCK
   * ARRIVING THROUGH THE DOOR THE FIRST ONE LEFT OPEN.** `ctx.state ===
   * 'running'` covers a press made while the context is up, and the check block
   * then SUSPENDED it: `idleIfEmpty` used to need BOTH instruments off, so with
   * the effect switched on it never ran, and the check that switched the
   * oscillator off and on again could not reach a suspended context. With one
   * instrument it suspended every time, so the press that turned it back on
   * found `state === 'suspended'`, fell through to the await, and waited for a
   * promise that cannot settle until the check block it is running inside
   * returns.
   * 🔴 **AND IT READ AS SILENCE RATHER THAN AS A HANG, WHICH IS WHY IT IS
   * WRITTEN DOWN.** MEASURED: **fourteen asserts went red at exactly 0.0000**,
   * every one of them about a sound, and the assert that did the switching
   * PASSED, because what it asserts is that nothing is sounding. A check that
   * breaks the page and then measures silence is the vacuous pass this project
   * keeps paying for.
   * ⚠️ **NEITHER SUSPENDER EXISTS ANY MORE AND BOTH GUARDS STAY**, which is a
   * decision rather than an oversight. The tone button presses `arm()` from
   * inside the check block on every run, so the first guard fires there every
   * time; and a tab in the background suspends a context on its own, which no
   * switch of this page's was ever needed for.
   * ✅ **THE SECOND GUARD IS `ready`, WHICH IS THE HANDSHAKE HAVING LANDED.**
   * Past that point `open()` has made the context, the node and the wasm, and
   * everything left in it is this page's own checks, so a resume is the whole
   * of what a press needs. Before it, awaiting `arming` is still right.
   * ⚠️ **AND THE MIDI ASK IS INSIDE IT SINCE 2026-09-28**, because the gesture
   * that used to carry it was the switch and there is no switch. A permission
   * prompt belongs to the gesture that caused it and `ensureMidi` is
   * idempotent, so the first touch of the panel asks once and nothing asks
   * again. It is called BEFORE the await for the same reason it was called
   * before the old `ensureAudio`: `open()` runs this page's whole check block
   * as its last act, and a prompt raised after that would be raised after the
   * check that counts it.
   */
````

<a id="muta-91"></a>
## muta-91: demo/muta/index.html, inline script, line 1228

````js
  /**
   * 🔴 THE TEST TONE IS A BUTTON A VISITOR FINDS, AND THIS SENTENCE SAID THE
   * OPPOSITE UNTIL 2026-09-25. It read *"the drone is a state the page enters,
   * not a button a visitor finds"*, which was true while turning PLAITS on
   * started one. *"no automatic drone. make a Test tone button in the right of
   * plaits"* moved it back onto a control, and `toggleTone` is the only thing
   * that sets the intent this function reads.
   * ⚠️ WHAT IS UNCHANGED IS THE MECHANISM. `trigger_patched` bypasses the
   * lowpass gate and lets the engine run, and it acts on whatever is already
   * sounding, so a note held first and droned second sustains.
   */
````

<a id="muta-92"></a>
## muta-92: demo/muta/index.html, inline script, line 901

````js
  /**
   * 🔴 ONE VOICE, NOT A CHORD, AND THAT IS WHY THE PLUCK WENT. Reported
   * 2026-09-22: *"wieh turing in plaits i get some pluck and then drone"*.
   * `drone` bypasses the lowpass gate so the engine simply runs, but a note
   * still has to arrive for a voice to be allocated, and `plai_note_on` is a
   * TRIGGER: four of them at once is four attacks, which is exactly the pluck
   * that was heard a moment before the sustain.
   * ✅ ONE note is one attack, and with the gate out of the way it opens into
   * the drone rather than being a chord that decays into one.
   * ⚠️ **A SILENT DRONE WOULD BE WORSE THAN A PLUCK**, which is why the note is
   * not simply dropped: with no voice allocated the engine has nothing to run
   * and turning an instrument on would do nothing audible, which is the shape
   * of control this project calls a lie.
   */
````

<a id="muta-93"></a>
## muta-93: demo/muta/index.html, inline script, line 917

````js
    /* 🔴 NOT UNLESS SOMEBODY ASKED FOR IT, AND THE REFUSAL LIVES HERE RATHER
       THAN AT THE CALLERS. Three callers reached this while the effect had a
       switch of its own, so a rule written at one of them was a rule the others
       missed, which is how a stopped drone came back three separate ways and was
       reported as *"i still hear drone wien midi on"*. One caller is left and
       the refusal stays where it is: a guard at the call site is a guard the
       next caller will not have.
       ⚠️ THE FLAG IT READS USED TO BE SET BY `togglePlaits` AS WELL, which is
       what made the page play itself. `toggleTone` is the only writer now.
       ⚠️ IT IS THE SAME SHAPE AS THE WAVE COLOUR: where several callers set a
       thing on every update, the thing has to own the rule, or the rule is
       written as many times as there are callers and one of them is always
       missed. */
````

<a id="muta-94"></a>
## muta-94: demo/muta/index.html, inline script, line 931

````js
    /* 🔴 AND THE `if (!plaitsOn) return` THAT STOOD HERE IS GONE WITH THE
       SWITCH, 2026-09-28, the same removal and the same loss as in `noteOn`
       above. It was the second of the two doors into the voice allocator, and
       there is nothing left to shut either of them against. */
````

<a id="muta-95"></a>
## muta-95: demo/muta/index.html, inline script, line 935

````js
    /* ⚠️ AND THE KEYBOARD'S BOOKKEEPING GOES WITH THEM. The shim silences every
       level patched voice when a drone starts, so notes this page still thinks
       are down no longer exist, and a pedal lifting later would send note offs
       for notes nobody is holding. */
````

<a id="muta-96"></a>
## muta-96: demo/muta/index.html, inline script, line 941

````js
    /* 🔴 NO NOTE. `plai_set_drone(1)` ALLOCATES ONE ITSELF when nothing is
       sounding, `if (!any) plai_note_on(base_note, 0)`, and then clears
       `trigger_patched` on every active voice. A note sent from here arrives
       AFTER that as a second, triggered one, which is the attack that was
       reported twice: *"i get some pluck and then drone"*, and again after the
       chord became a single note. Cutting the chord to one note made it one
       pluck instead of four and left the cause alone. */
````

<a id="muta-97"></a>
## muta-97: demo/muta/index.html, inline script, line 958

````js
  // ── the checks ──────────────────────────────────────────────────────────
  // Everything gradable from numbers already in hand runs for everybody, which
  // is the shell's rule. The two checks that PRESS something and change what
  // you hear are behind the gate.
````

<a id="muta-98"></a>
## muta-98: demo/muta/index.html, inline script, line 963

````js
    /* The patchbay, with the sound up, on a bus inside this tab and two fake
       MIDI devices, so nothing reaches a relay and the browser is asked for no
       MIDI port (`engine-node.mjs`). Behind the gate: it joins a room, and this
       block also runs for a visitor's first touch. */
````

<a id="muta-99"></a>
## muta-99: demo/muta/index.html, inline script, line 968

````js
    /* ⚠️ ONE ARTEFACT AGAIN. This read `both wasm modules` while a second
       firmware ran downstream, on the reasoning that an assert naming one of
       two would leave the other ungraded while reading as coverage. That is
       still right and there is one. */
````

<a id="muta-100"></a>
## muta-100: demo/muta/index.html, inline script, line 976

````js
    // AGAINST THIS REPOSITORY'S OWN YARDSTICK, which is the comparison
    // plan-vcv-modules.md §9.3 asks for. 1.70 MB is scsynth.wasm, measured
    // here on 2026-09-12.
````

<a id="muta-101"></a>
## muta-101: demo/muta/index.html, inline script, line 983

````js
    // ⚠️ A PROCESSOR NOBODY CALLS AND A PROCESSOR THAT RETURNS EARLY LOOK
    // IDENTICAL FROM THE SPEAKERS, and the second one is a bug in this file
    // while the first is a bug in the graph around it.
````

<a id="muta-102"></a>
## muta-102: demo/muta/index.html, inline script, line 996

````js
    /**
     * 🔴 *"ON BY DEFAULT"* MEASURED ON BOTH SIDES OF THE LINE THIS PAGE MAY NOT
     * CROSS, ASKED 2026-09-28 AS *"muta: on by default, no online button, put a
     * test tone on that spot"*. A visit may not open a sound device and may not
     * make a noise, so the only honest reading of *on* is that everything which
     * is arithmetic over a file this site ships has already happened when a
     * visitor arrives. This is the half that says the visit did it.
     * ⚠️ **BOTH HALVES, AND THE SECOND IS THE ONE THAT CAN FAIL.** That the
     * firmware was asked for is the claim; that no context and no worklet node
     * existed at the last line of the module is the claim's whole cost, and a
     * page that opened a device on load would satisfy the first and fail this.
     * ⚠️ **AND IT IS COUNTED AT THE LAST LINE OF THE MODULE RATHER THAN HERE**,
     * for the reason `midiAsksOnLoad` already carries: by the time a check block
     * runs, a gesture has happened, so a reading taken here could not tell a
     * visit apart from a press.
     */
````

<a id="muta-103"></a>
## muta-103: demo/muta/index.html, inline script, line 1020

````js
    /**
     * 🔴 AND THE OTHER HALF: THE DEVICE IS OPENED BY A TOUCH ON THE PANEL AND
     * COSTS NO SECOND FETCH. `armedBy` is set by the capture listener at the
     * foot of this module and by nothing else, so this is a fact about which
     * path ran rather than about which path exists.
     * ⚠️ **THE FETCH COUNT IS THE HALF THAT PROVES THE SPLIT WAS WORTH MAKING.**
     * If the touch had triggered the download, the page would look identical
     * from the outside and the whole saving would be imaginary: same context,
     * same node, same sound, and a visitor waiting for 196 KB with a finger on
     * a control. One fetch, made before any gesture, is the measurement.
     * ⚠️ AND IT IS `d.assert` RATHER THAN A LOG LINE BECAUSE THE PREVIOUS
     * ARRANGEMENT WAS NEVER GRADED: the page asked for the wasm inside `boot()`
     * and nothing anywhere said when.
     */
````

<a id="muta-104"></a>
## muta-104: demo/muta/index.html, inline script, line 1047

````js
    // ONE WORKLET CALL IS 128 FRAMES AND PLAITS' OWN BLOCK IS 12, so a quantum
    // is ten or eleven Render calls with the remainder carried. Rack's adapter
    // is the other shape: 128 calls of `process()` buffered into blocks of 12
    // through a ring buffer and a sample rate converter.
````

<a id="muta-105"></a>
## muta-105: demo/muta/index.html, inline script, line 1058

````js
    // ⚠️ A NUMBER TYPED ON THIS PAGE, GRADED AGAINST THE WASM THAT OWNS IT.
    // The control has to exist before anything is fetched, so its top end is a
    // constant here and `kMaxVoices` is a constant in the shim. This is the
    // one line that can notice them disagreeing.
````

<a id="muta-106"></a>
## muta-106: demo/muta/index.html, inline script, line 1062

````js
    /* 🔴 AND SINCE 2026-09-22 IT ALSO GRADES THE CONTROL, which the slider
       version did not: a knob that steps can land between two voices and read a
       number the DSP was never given. `step` is the component's, so what this
       reads is the rendered value after a move rather than the option. */
````

<a id="muta-107"></a>
## muta-107: demo/muta/index.html, inline script, line 1082

````js
    // THE STAMP IS THE WHOLE POINT OF THE EXERCISE AND IT IS NOT YET A PROOF.
    // It names the upstream commits and a digest over the exact source set,
    // so a native build of the same sources on the board can be compared to
    // this one by something other than two people agreeing it sounds right.
    // Nothing has been built on the board. This asserts the stamp is WELL
    // FORMED and says out loud that the comparison is unmade.
````

<a id="muta-108"></a>
## muta-108: demo/muta/index.html, inline script, line 1088

````js
    /* 🔴 AND A SECOND ASSERT WENT WITH THE SECOND FIRMWARE, WHICH IS A LOSS OF
       COVERAGE AND IS RECORDED RATHER THAN QUIETLY DROPPED. It read `one build
       script gives the two modules two different digests`, and what it graded
       is that `build.sh`'s parameterisation reaches the SHIM'S BYTES and the
       SOURCE LIST rather than only the part that compiles. With one artefact
       there is nothing to compare a digest against, so that mechanism is
       unguarded here now. `build.sh` still builds both. */
````

<a id="muta-109"></a>
## muta-109: demo/muta/index.html, inline script, line 1104

````js
    // ⚠️ AN UPPER BOUND AND A SHAPE, NOT JUST A LOWER ONE. "Greater than zero"
    // passes on a loop that was optimised away, and a voice count that costs
    // the same whatever it is set to would mean seven of the eight are not
    // being rendered at all. The ratio is the half that says the voices are
    // real.
````

<a id="muta-110"></a>
## muta-110: demo/muta/index.html, inline script, line 1118

````js
    // 🔴 THE STEALING RULE IS **THE QUIETEST VOICE**, AND THIS IS THE ONLY
    // CHECK THAT CAN TELL IT FROM AN OLDEST-FIRST RULE. A Plaits note is a
    // pluck through a lowpass gate that rings for about a second, so taking the
    // oldest cuts whichever note a listener is still holding on to while a
    // voice that faded three notes ago sits unused. WHAT WAS REFUSED is
    // oldest-first, same-pitch-first and refusing the note outright: the first
    // for that reason, the second because this instrument has no reason to
    // expect a repeated pitch, and the third because a note that does nothing
    // is the shape of control this project calls a lie.
````

<a id="muta-111"></a>
## muta-111: demo/muta/index.html, inline script, line 1136

````js
    // ⚠️ A LAYOUT CLAIM IS A MEASUREMENT, AND THREE ALIGNMENTS THAT LOOK LIKE
    // ONE ARE THREE ASSERTS. `positron-ui` records two of three lining up while
    // the third was 30 px out, and arithmetic in a comment being no evidence at
    // all.
    // 🔴 AND THEY GRADE THE DESKTOP PATH ONLY, WHICH IS A HOLE AND NOT A
    // FOOTNOTE. `demo/verify.mjs` runs at 756 px with no viewport override, so
    // nothing below 560 px is ever entered and NOTHING HERE HAS BEEN MEASURED
    // ON A PHONE. What is known is structural rather than measured: every knob
    // is `--ctl-w` wide, every gap is `--ctl-gap`, and `.pos-knob-row` carries
    // `overflow-x: auto` with `min-width: 0`, so a row too wide for the screen
    // scrolls inside itself instead of dragging the page. That is an argument
    // about the stylesheet and a browser is the only thing that can settle it.
````

<a id="muta-112"></a>
## muta-112: demo/muta/index.html, inline script, line 1151

````js
    // 🔴 THE THING THAT WAS ASKED FOR: the instrument's four rotaries in the
    // instrument's own two by two, FREQUENCY over TIMBRE and HARMONICS over
    // MORPH. Both columns AND the row order, because a block with its columns
    // right and its rows swapped is a different panel.
````

<a id="muta-113"></a>
## muta-113: demo/muta/index.html, inline script, line 1164

````js
    // 🔴 AND THE SEPARATION IS A GAP THAT IS REALLY WIDER, NOT A CLASS THAT
    // EXISTS. A dead CSS rule reads as correct, and this project has measured
    // four of them. This compares the gap between the two groups against the
    // gap between two neighbours in the same row, so a rule that never applied
    // takes it red.
````

<a id="muta-114"></a>
## muta-114: demo/muta/index.html, inline script, line 1169

````js
    /* 🔴 AND THE TWO GROUPS ARE SEPARATED BY A LINE THAT IS REALLY DRAWN, NOT A
       CLASS THAT EXISTS. A dead CSS rule reads as correct and this project has
       measured four of them. This reads the computed border on the first group
       and checks the second starts beyond it, so a rule that never matched
       takes it red.
       ⚠️ IT WAS A WIDENED GAP UNTIL 2026-09-22 and the change was asked for:
       *"keep 2 x 2 group, then divider then 3 x 2 grouo"*. A gap between two
       blocks that are each two rows deep reads as the gap between the columns
       INSIDE them, because at this pitch it is the same distance. */
````

<a id="muta-115"></a>
## muta-115: demo/muta/index.html, inline script, line 1192

````js
    // ⚠️ AND THE STACKED COMPONENTS STILL SHARE A LEFT EDGE. `/archive/radio/` had
    // exactly this go wrong when a `createChoice` row became a `createPicker`
    // one and the rules keyed on the old class stopped matching, and it was
    // reported three times before anybody measured it.
    // ⚠️ THE VOICE ROW LEFT THIS CLAIM WHEN THE CASE ARRIVED, AND THAT IS THE
    // ARRANGEMENT RATHER THAN A HOLE. It sits OUTSIDE the case on purpose, so
    // it starts where the case's border does and the controls inside start one
    // `--panel-pad` further in. Two different edges, and the assert below
    // grades the outer one.
````

<a id="muta-116"></a>
## muta-116: demo/muta/index.html, inline script, line 1201

````js
    /* 🔴 THIS CLAIMED THE MODEL PICKER STARTS ON THE ROTARIES' LINE UNTIL
       2026-09-22, AND THE PICKER MOVED INTO THE HEADER THAT DAY, where being
       centred on the case is the whole point of the cell it now sits in. The
       old claim is not re-baselined, it is REPLACED by the two claims that
       survive the move: the rotary rows still agree with each other, and the
       picker is centred on the CASE rather than on the space left over between
       a status light and a nameplate. */
````

<a id="muta-117"></a>
## muta-117: demo/muta/index.html, inline script, line 1208

````js
    /**
     * 🔴 THE DIAL CENTRES LAND ON A SQUARE LATTICE, WHICH IS THE WHOLE REASON
     * `control-grid.mjs` EXISTS AND WHY THIS PAGE NOW USES IT. That component
     * was extracted FROM this page after the four rotaries were reported as a
     * tall rectangle, measured at **46 px across and about 100 down**, and it
     * was never wired back in until *"where is knobs grid?"* was asked four
     * times.
     * ⚠️ **ACROSS AGAINST DOWN, ON THE GROUP THAT WAS REPORTED.** The claim is
     * not that the knobs are evenly spaced, which they were before; it is that
     * one step right and one step down are the SAME distance.
     */
````

<a id="muta-118"></a>
## muta-118: demo/muta/index.html, inline script, line 1229

````js
    /**
     * 🔴 THE PANEL'S SHAPE IS THE SKETCH'S, TOP TO BOTTOM, AND THE PICTURE IS
     * THE FIRST ROW. Asked 2026-09-28: *"move visualization to top of
     * instrument"*, and the answer is `createInstrumentPanel`'s own ordering
     * rather than anything this page arranges: `addRow` inserts above the
     * keyboard and the foot however late it is called, and nothing is ever
     * inserted above the picture.
     * ⚠️ **`shape()` READS THE DOM, NOT THE COMPONENT'S OWN LIST**, which is
     * its header's stated reason and is the whole value of asking: what a
     * module remembers and what a browser renders are two facts, and only the
     * second one is the page.
     * 🔴 **THREE ROWS SINCE 2026-09-28, AND IT WAS FOUR.** The `Test tone`
     * button was a `controls` row of its own and is a control on the plate now
     * (*"put a test tone on that spot"*), so the middle `controls` that used to
     * hold it is gone. What that row also bought was a check on the component's
     * INSERTION rule: it was added after the panel was built, so a component
     * that appended rather than inserting would have put it after the foot and
     * this assert would have said so. Nothing on this page is added late any
     * more, so that half is no longer graded here, and it is recorded rather
     * than quietly dropped. `/nola/` still adds rows late.
     */
````

<a id="muta-119"></a>
## muta-119: demo/muta/index.html, inline script, line 1256

````js
    /**
     * 🔴 THE PICTURE RUNS EDGE TO EDGE, WHICH IS WHY IT IS A `viz` ROW AND NOT
     * A PART OUTSIDE A CASE. `instrument-panel.mjs`'s own header names this page
     * as one of the two that had to pass a picture in as a glue part OUTSIDE
     * the case to get this, because a case insets everything in its flow. A
     * `viz` row is built `pad: false`, so the claim is the component's and this
     * is a check that the page did not undo it.
     * ⚠️ **AGAINST THE ROW, NOT AGAINST THE PAGE.** The surface is its own
     * width, so comparing the canvas to the window would measure the panel's
     * size rather than the picture's inset.
     */
````

<a id="muta-120"></a>
## muta-120: demo/muta/index.html, inline script, line 1276

````js
    /**
     * 🔴 THE FOOT HOLDS THE NAME AND THE `Test tone` BUTTON AT ONE END AND THE
     * PATCH SELECTOR AT THE OTHER, WITH NO CAPTION ON IT. Asked 2026-09-28 as
     * *"no label on patch selctor"* and, later the same day, *"put a test tone
     * on that spot"*, the spot being the `status` slot the on and off switch
     * had. The picker half is the component's rule since 2026-09-26: `patch` is
     * the only slot a selector goes in, it is the far end by construction, and
     * a `.pos-pick-l` on it is REMOVED from the DOM rather than hidden.
     * ⚠️ **THE PICKER IS STILL BUILT WITH `label: 'model'`, WHICH IS WHAT
     * MAKES THIS AN ASSERT RATHER THAN A RESTATEMENT.** With no label in the
     * source there would be nothing for the component to strip and nothing for
     * this to catch. As it is, a caption appearing here means the control has
     * left the slot that strips it.
     * ⚠️ AND THE CLAIM IT REPLACES WAS ABOUT A HEADER CELL BEING CENTRED ON
     * THE CASE (*"center patch selector (optically center to the
     * instrument)"*), measured on BOTH cases because `PLAI` and `WARP` are
     * different lengths. There is no header and there is no second case, and a
     * plate row is two ends rather than three cells, so the centring claim has
     * nothing left to be about.
     * ⚠️ **AND IT STOPPED NAMING THE BUTTON ON 2026-09-29.** This was called
     * `the foot carries the name and the test tone at one end`, which was a
     * true sentence about a shrink wrapped cluster and is a misleading one now
     * that *"align test tone to right"* has pushed the button to the far side
     * of that cluster. What this assert grades is the two ENDS and their
     * insets; where the button sits inside the start end is the next assert's,
     * and that is where the new claim went.
     */
````

<a id="muta-121"></a>
## muta-121: demo/muta/index.html, inline script, line 1326

````js
    /**
     * 🔴 AND THE `Test tone` BUTTON IS IN THE `status` SLOT, WHICH IS AFTER THE
     * NAME AND BEFORE THE PICKER. Asked 2026-09-28: *"no online button, put a
     * test tone on that spot"*. The spot is exactly where a
     * `createPresenceButton` reading `on` and `off` stood, which is where
     * `createInstrumentPanel` puts whatever it is handed as `status`, so this
     * is a check that the page passed it to that slot rather than any of the
     * other three it could have reached for.
     * 🔴 **THE CLAIM IT REPLACES WAS THAT THE BUTTON WAS A ROW OF ITS OWN**, on
     * its own inset, under the rotaries and above the foot, measured against
     * three rects. Before that it was a header cell placed by grid column, and
     * that version took eight widths of measuring and two media queries. Each
     * arrangement was the previous one's repair and each was asked for; this
     * one is the first with no arithmetic in it at all, because the component
     * owns where a `status` control goes.
     * ⚠️ **THE NEGATIVE HALF IS THE COUNT**, which survives all three
     * arrangements: one button on the page, so a rule or a call that made a
     * second one takes this red.
     * ⚠️ **AND `panel.status` IS READ RATHER THAN THE CLASS**, because the
     * question is which SLOT it landed in. A `.muta-tone` anywhere in the plate
     * row would satisfy a query and say nothing about that.
     * 🔴 **AND SINCE 2026-09-29 IT IS PUSHED TO THE RIGHT OF THAT SLOT, WHICH
     * IS THE THIRD THING IN ONE ASK**: *"align test tone to right"*. The far
     * end of the ROW was not available, because `instrument-panel.mjs` throws on
     * a `.pos-pick` in `status` and the far end has been the patch selector's
     * since 2026-09-26, so the right this can mean is the right of the free
     * space the full width opened up. MEASURED at 756 before and after: the
     * button spanned 112.0 to 220.4 px and now spans 313.5 to 422.0, which is
     * 201.5 px further right and the same 108.5 px wide.
     * ⚠️ **TWO TERMS, BECAUSE TWO THINGS COULD BE TRUE SEPARATELY.** The button
     * ending on its cluster's own right edge says the auto margin fired; the
     * gap to the picker being the row's own `--ctl-gap` says the cluster really
     * took the free space rather than shrink wrapping somewhere in the middle.
     * The gap is READ off the row rather than typed, because a number typed
     * here and a number in `shell.css` is this project's most repeated defect.
     * ⚠️ **AND IT GRADES THE DESK ONLY.** At 560 and under the group takes the
     * whole line and the name drops below it, so the arrangement this reads is
     * not the one a phone draws. `node demo/shot.mjs muta 375` is what looks at
     * that, and the order inside the group is the same at both.
     */
````

<a id="muta-122"></a>
## muta-122: demo/muta/index.html, inline script, line 1383

````js
    /**
     * 🔴 THE SELECTOR AND ITS DIE STAY ON ONE LINE, AND THE NAME BOX IS AS WIDE
     * AS THE LONGEST MODEL NAME. Asked 2026-09-29: *"Patch selector and
     * randomize button go togther and so not wrap"* and *"on desktop patch
     * selector has middle element with as maximum patchname (with maximum w and
     * ...)"*.
     * 🔴 **THE WIDTH IS GRADED AGAINST THE TEXT RATHER THAN AGAINST A NUMBER
     * TYPED HERE.** A `16ch` in this file and a `16ch` in the stylesheet is the
     * defect this project pays for most, so the check renders the longest entry
     * of `MODELS` into the cell, measures the name span, and requires the box to
     * hold it with no ellipsis. A cell sized to a SHORTER name fails by the
     * text being clipped, which is the thing a reader would actually see.
     * ⚠️ **AND THE MODEL IS PUT BACK**, because this runs on the page a visitor
     * is looking at and a check may not leave the instrument on a model nobody
     * chose.
     * ⚠️ **THE DIE IS FOUND BY CLASS RATHER THAN BY POSITION IN
     * `pick.buttons`**, because that array is `[back, fwd, die]` and an
     * arrangement that dropped the die would leave a two-entry array that reads
     * as healthy from a length test alone.
     * ⚠️ **AND THE ONE-LINE CLAIM IS TRUE AT EVERY WIDTH, WHICH IS WHY IT IS
     * NOT MARKED AS A DESK READING.** `shell.css`'s phone block keeps the die
     * beside the segment on purpose, written after it dropped a whole row below
     * the arrows on `/archive/radio/` and `/mirror/`.
     */
````

<a id="muta-123"></a>
## muta-123: demo/muta/index.html, inline script, line 1431

````js
    /**
     * 🔴 THE PANEL STARTS AND ENDS WHERE THE REST OF THE PAGE DOES, WHICH IS
     * TWO CLAIMS AGAIN AND WAS ONE UNTIL 2026-09-29. Asked in these words:
     * *"muta: full content w in deskop"*.
     * 🔴 **THE HALF THAT CAME BACK IS THE RIGHT EDGE, AND IT DID NOT COME BACK
     * BY ACCIDENT.** This assert read `is as wide as its widest row` and
     * required `bPanel.right < bRead.right`, because `.pos-rows` is
     * `width: fit-content` and the page passed no `full`. That was
     * `positron-compose` §3, *an instrument is as wide as the instrument*,
     * written after four knobs on a pedal floated in a 660 px band and the
     * verdict was *"plainly awful"*. The ask overrules it for this page and
     * answers the objection in the same line, because the knobs centre in the
     * width and the `Test tone` button takes the right of the plate row.
     * MEASURED at 1280 before and after: the panel spanned 296 to 821 against
     * the report's 296 to 984, and now spans 296 to 984.
     * ⚠️ **SO THE STRICT INEQUALITY HAD TO GO RATHER THAN BE WIDENED.** Left
     * standing it would be red on a page doing exactly what was asked, and
     * relaxed to `<=` it would pass a panel of any width at all.
     * ⚠️ **AND THE RULER IS `.pos-report`, WHICH MOVED UNDER THIS PAGE ON
     * 2026-09-28.** It was `.pos-readout`, and the readout became the top half
     * of a glued report that day, so its rect is one border INSIDE the thing a
     * visitor sees at that position: MEASURED, the readout at 35.0 against the
     * panel at 34.0, a delta of exactly 1.0 against a tolerance of 1, red on a
     * page where nothing was wrong. The repair is the one this page's own
     * comments have made twice already: **read the edge a visitor can see.**
     * ⚠️ THE THIRD TERM IS THE ONE THAT CATCHES A PANEL TOO WIDE FOR ITS
     * WINDOW, and it is now the only one that can: with both edges pinned to
     * the report, a panel that overflowed would take its ruler with it.
     * ⚠️ **AND THE GROUP'S OWN WIDTH IS PRINTED BESIDE THE PANEL'S**, because
     * the number the old claim protected is still the interesting one: a
     * 483 px group of rotaries in a 646 px row is the band the verdict above
     * was about, and the detail line is where a reader can see it is a
     * decision rather than a surface that ran out of content.
     */
````

<a id="muta-124"></a>
## muta-124: demo/muta/index.html, inline script, line 1484

````js
    /**
     * 🔴 THE SPACE THAT WAS ASKED FOR, MEASURED RATHER THAN DESCRIBED. Asked
     * 2026-09-22 as *"add more space around plai rotaties"* and then *"add
     * space on top and bottom of knobs so their y padding matches with x
     * padding"*, and it has been re-measured every time the box around the
     * rotaries changed: a case with a plate in its top inset, a case with a
     * header, a header that moved to the foot, and now a glued row.
     * 🔴 **AND IT MEASURES THE INK, WHICH IS THE PART EVERY EARLIER VERSION OF
     * THIS GOT WRONG.** The first one claimed all three insets were equal and
     * went red reading `32.0 px above, 21.0 px left, 21.0 px below`; it was
     * right and the claim was wrong. A rect reads the BOX, and a knob's box is
     * its grid cell: 84 px of lattice holding a 50.6 px dial, so the cell has
     * about 17 px of empty either side of the ink and none above it. Reading
     * the cell would call a block equal that a reader sees as lopsided.
     * `positron-compose` §2: **a reader sees ink, not boxes.**
     * ⚠️ THE ROW IS THE RULER FOR THE VERTICAL HALF because the row IS that
     * inset: `--rows-gap` down, and the 21 px in the stylesheet is what makes up
     * the difference.
     * 🔴 **AND THE HORIZONTAL HALF IS A DIFFERENT CLAIM SINCE 2026-09-29,
     * BECAUSE THE ONE IT REPLACES BECAME FALSE BY DESIGN.** This read `the row
     * insets the rotaries' ink equally on all three sides` and required the
     * first dial's LEFT gap to match its top and bottom, which held while the
     * row was as wide as the group: MEASURED at 1280 before the change, 36.7 px
     * left against 37.0 above and 37.0 below. The group centres in a full width
     * row now, so the left gap is 98.2 px and nothing is wrong. **Widening the
     * tolerance would have left a green assert measuring nothing**, so the claim
     * is replaced by the one that is true now and was asked for: *"center the
     * knobs group"*.
     * ⚠️ **LEFT AGAINST RIGHT, BOTH READ AS INK, AND NOT AS THE TWO GRIDS'
     * BOXES.** Same reason this assert has always had: a rect reads the box and
     * a knob's box is its grid cell. The two agree here because the lattice
     * leaves the same half cell at each end, MEASURED at 1280 as 81.5 px of box
     * against 98.2 px of ink on both sides, and agreeing is not a reason to
     * measure the wrong one.
     * ⚠️ **AND THE FOURTH TERM IS THE NEGATIVE HALF.** A centred flex row that
     * has overflowed puts its first item off the inline start with `scrollLeft`
     * clamped at 0, which is unreachable for good: at 375 the group would sit
     * 91 px off the left edge. That is what the `min-width` block in this
     * page's sheet is for, and this is the check that a scrolling row is not
     * also a centring one.
     * ⚠️ **NOTHING BELOW 561 px IS GRADED BY IT.** `demo/verify.mjs` runs at
     * 756 px, where the row has 163 px of slack, so this is a DESK measurement.
     * The widths where the centring is switched off are looked at with
     * `node demo/shot.mjs muta 375` and by nothing else.
     */
````

<a id="muta-125"></a>
## muta-125: demo/muta/index.html, inline script, line 1534

````js
    /* 🔴 THE DIAL ACROSS AND THE GRID DOWN, WHICH IS NOT AN INCONSISTENCY AND
       WENT RED ONCE FOR LOOKING LIKE ONE. A knob's cell has about 17 px of
       empty either side of the dial and NOTHING above it: what sits at the top
       of a cell is the value line, which is ink a reader sees. Measuring the
       dial's top instead read **54.0 px against 36.7 across**, because the
       dial's top is under `--ctl-head`, which is a reserved slot rather than an
       edge. The grid's own top IS the first value line. */
````

<a id="muta-126"></a>
## muta-126: demo/muta/index.html, inline script, line 1541

````js
    /* ⚠️ LEFT AGAINST RIGHT SINCE 2026-09-29, AND IT USED TO BE LEFT, TOP AND
       BOTTOM WITH NO RIGHT IN IT AT ALL. The note here read: the panel is as
       wide as its widest row and the rotaries ARE that row, so the right hand
       gap is whatever the wider row left over, which would be the quantity in
       question being next to the quantity measured. That was exactly right
       while the surface shrink wrapped. The row is the page's width now and
       the group is centred in it, so the right hand gap is the left hand one
       and comparing them is the whole claim. */
````

<a id="muta-127"></a>
## muta-127: demo/muta/index.html, inline script, line 1549

````js
    /* ⚠️ AND THE BOTTOM IS THE LAST ROW'S GRID RATHER THAN THE FIRST'S,
       because the two grids are two and three rows deep and only the taller one
       reaches the bottom of the block. `voices` is the last knob of that taller
       grid, so it is also the rightmost ink on the row. */
````

<a id="muta-128"></a>
## muta-128: demo/muta/index.html, inline script, line 1567

````js
    /**
     * 🔴 THE KEYBOARD IS OPENED BY A GESTURE AND NEVER BY A VISIT, WHICH IS THE
     * HALF THAT COSTS A VISITOR SOMETHING. `requestMIDIAccess` is a permission
     * prompt, so a page that asked on load would ask every visitor for a device
     * most of them do not have.
     * 🔴 **AND IT IS THE HALF OF *"on by default"* THAT DOES NOT MOVE TO THE
     * LOAD PATH, WHICH IS THE WHOLE REASON TO SAY SO OUT LOUD.** The firmware
     * went to the visit on 2026-09-28 and this deliberately did not go with it:
     * a wasm off this site is arithmetic over a file, and a permission prompt
     * is a thing asked of a person. The gesture that carries it used to be the
     * on and off switch and is now the first touch of the panel, which is
     * inside `arm()` for exactly this reason.
     * 🔴 **THIS REPLACES THE ASSERT THAT WENT WITH THE MIDI BUTTON**, which
     * read `midiBtn.el.tagName === 'BUTTON' && midiWas === false && !!midi` and
     * pressed that button here to get its answer. It was standing in for three
     * facts and two of them outlive the control: NOTHING is open before the
     * gesture, and something real is open after it. The third, that the lamp
     * followed the press rather than the port count, went with the lamp.
     * ⚠️ **THE NEGATIVE HALF IS THE ONE THAT CAN FAIL**, and it is the count
     * read at the last line of the module rather than a flag read here: by the
     * time this runs a gesture has happened, so a reading taken now could not
     * tell a visit apart from a touch.
     * ⚠️ **AND `midiAsks === 1` IS THE SECOND CLAIM, NOT A RESTATEMENT.**
     * `arm()` calls `ensureMidi` on every entry and the tone button presses
     * `arm()` twice inside the check block below, so a prompt per call would
     * climb. One is what idempotent means, measured rather than asserted about
     * the flag.
     */
````

<a id="muta-129"></a>
## muta-129: demo/muta/index.html, inline script, line 1602

````js
    /* 🔴 THE `nameplate sits on the same line as the first row of values` ASSERT
       WENT WITH THE ASK THAT BOUGHT IT, within the hour, superseded by *"just
       ajust knbos panels paddings to be same in top left bottom"*. The two
       cannot both hold: one wants 9 px of air above the knobs and the other
       wants 17. **What stopped being checked is that the plate lines up with
       anything**, and nothing does now, which is the arrangement every other
       panel here has. */
````

<a id="muta-130"></a>
## muta-130: demo/muta/index.html, inline script, line 1610

````js
    // 🔴 THE MARKS ARE ON EXACTLY THE THREE ATTENUVERTERS AND NOWHERE ELSE,
    // WHICH IS BOTH HALVES OF ONE CLAIM. `ends` costs no height, so a knob that
    // wrongly grew a pair would look right and a knob that wrongly lost one
    // would look right too; only the count says so. The negative half is the
    // half that catches a later `ends: true` sprayed across the bank.
````

<a id="muta-131"></a>
## muta-131: demo/muta/index.html, inline script, line 1628

````js
    /**
     * 🔴 THE PLATE ASSERT WENT WITH THE PLATE, 2026-09-22: *"rm nameplates"*.
     * It read `inst.shown()` and `inst.plate.place`, and with no plate those
     * are `null`, which is how it turned up: **`Cannot read properties of null
     * (reading 'shown')` in the page's own log**, thrown inside the check block
     * and taking everything after it with it.
     * ⚠️ **WHAT IT GRADED IS NOT LOST.** It claimed a one line plate is pushed
     * to the far end rather than parked left by `space-between`, which is a
     * `plateSpec` decision. `instrument-test.mjs` grades that decision with no
     * browser, and the header assert above grades the ABSENCE here, so a plate
     * coming back unnoticed is still a red run.
     * ⚠️ AND `shown()` EXISTS BECAUSE `createNameplate` LEANS ON
     * `text-transform`: a check on `textContent` grades the source and stays
     * green whichever case the page typed. That is worth keeping written down,
     * because the next caller with a plate will need it.
     */
````

<a id="muta-132"></a>
## muta-132: demo/muta/index.html, inline script, line 1645

````js
    // ⚠️ BEHIND THE GATE: these press nothing a visitor pressed, change the
    // sound and move the controls in front of them. What they grade is the
    // whole chain, because every number in them is the DSP's own answer rather
    // than what this page last sent.
````

<a id="muta-133"></a>
## muta-133: demo/muta/index.html, inline script, line 1315

````js
    /**
     * 🔴 EVERYTHING BELOW PRESSES A CONTROL, MAKES A SOUND OR MOVES A SWITCH IN
     * FRONT OF WHOEVER IS LOOKING, SO ALL OF IT IS BEHIND THE GATE. That is the
     * standing rule and this page gained three reasons to re-read it on
     * 2026-09-25: a `Test tone` button that sounds, a switch that has to be
     * turned off to prove a switched-off oscillator is silent, and pictures
     * that now have ink only while something is playing.
     * 🔴 **AND THREE OF THESE WERE UNGATED BEFORE TODAY, WHICH WAS A DEFECT
     * THIS PAGE ALREADY HAD.** The block that pressed the MIDI switch and
     * toggled the effect off and on ran for every visitor who turned an
     * instrument on. MEASURED 2026-09-25 with an analyser on every leg of the
     * graph, driving the page as a visitor with no `?selfcheck=1`: pressing
     * PLAITS ran this whole block, which switched the effect, pressed the tone
     * twice and took PLAITS off and on again, and the sound the visitor had
     * asked for stopped. The rule is not new and the reach of it was wrong.
     */
````

<a id="muta-134"></a>
## muta-134: demo/muta/index.html, inline script, line 1332

````js
      /**
       * 🔴 THESE FOUR MOVED BEHIND THE GATE ON 2026-09-25, AND THEY HAD BEEN
       * PRINTING `FAIL` INTO A VISITOR'S OWN LOG FOR AS LONG AS THE PLUCK HAS
       * BEEN GATED. Every one of them reads a number that only `open()`'s own
       * gated measuring block sets: `loud`, `chord` and `blockRule` are all
       * `null` on a visit, so the conditions were false and
       * `shell.mjs`'s `assert` logs a failing line where a person can read it.
       * MEASURED the same day, driving the page as a visitor with no
       * `?selfcheck=1`: **four FAIL lines**, all of them about a page that is
       * working perfectly.
       * ⚠️ **IT COSTS THE HARNESS NOTHING AND WAS CHECKED RATHER THAN ASSUMED**:
       * the gate is on for every run of `demo/verify.mjs`, so the per-page count
       * was unchanged at 49 across the move.
       * ⚠️ AND IT IS THE SAME RULE AS THE PICTURES BELOW. An assert whose
       * EVIDENCE only exists under the gate belongs under the gate; leaving it
       * outside does not grade a visitor's page, it accuses it.
       */
````

<a id="muta-135"></a>
## muta-135: demo/muta/index.html, inline script, line 1349

````js
      // ⚠️ BOTH HALVES, AND THE QUIET ONE IS THE HARDER CLAIM. A gate stuck open
      // passes "there was sound" every time.
````

<a id="muta-136"></a>
## muta-136: demo/muta/index.html, inline script, line 1356

````js
      /* 🔴 AND A SECOND PAIR OF HALVES WENT WITH THE EFFECT, WHICH IS A LOSS OF
         COVERAGE AND IS RECORDED RATHER THAN QUIETLY DROPPED. It read `the
         whole chain is silent when nothing is played and sounds when it is`,
         measured at the FAR END, and its argument was that the oscillator being
         right says nothing about what a listener gets: an effect that dropped
         every sample would have left the assert above perfectly green. The
         oscillator IS the far end now, so the two claims have collapsed into
         one and the one above is it. What nothing grades any more is the leg
         between the node and the destination, which is a splitter and a
         connect. */
````

<a id="muta-137"></a>
## muta-137: demo/muta/index.html, inline script, line 1366

````js
      // 🔴 THE INVARIANT THE WHOLE ARRANGEMENT RESTS ON, ASSERTED RATHER THAN
      // COMMENTED. `voice.cc` sets three envelope rates from the `kBlockSize`
      // CONSTANT rather than from the `size` argument it was handed (lines 135,
      // 207 and 213), so a Render call of any other length advances the audio at
      // one rate and the envelopes at another and the instrument becomes a
      // different instrument. Every voice therefore has to sit on the same block
      // boundary, and `plai_voice_renders()` is what makes that checkable: with
      // N voices sounding for a whole window it has to advance by exactly N
      // times `plai_blocks_rendered()`.
````

<a id="muta-138"></a>
## muta-138: demo/muta/index.html, inline script, line 1382

````js
      // ⚠️ FOUR VOICES, READ OFF THE DSP'S OWN COUNT RATHER THAN OFF WHAT THIS
      // PAGE SENT. A note that never crossed the port, or four notes that all
      // landed on one voice, both leave this at 1.
````

<a id="muta-139"></a>
## muta-139: demo/muta/index.html, inline script, line 1391

````js
      /**
       * 🔴 NOTHING SOUNDS UNTIL SOMETHING ASKS FOR IT, WHICH IS *"no automatic
       * drone"* MEASURED AT THE END OF THE CHAIN RATHER THAN AS A FLAG.
       * `droning` is what this page believes; the peak is what a listener gets,
       * and this page has already had those two disagree for three presses.
       * ⚠️ **THE ASSERT THIS REPLACES SWITCHED THE MIDI BUTTON ON AND CHECKED THE
       * SAME SILENCE**, because a listening keyboard was what used to suppress
       * the drone. The suppression is gone with the automatic drone and the
       * silence it was protecting is the same silence, so the claim survives its
       * cause.
       * 🔴 **AND A GESTURE IS MADE INSIDE IT, WHICH IS THE HALF THAT CAN FAIL.**
       * It pressed the EFFECT's switch first, because `toggleWarps` called
       * `startDrone` too; then the instrument's own switch, off and on, because
       * that was the one gesture that could bring a drone back behind the intent
       * flag. Both switches are gone and the shape of the check is not: since
       * 2026-09-28 the gesture that can start something is a TOUCH ON THE PANEL,
       * which is what opens the audio, and *"on by default"* is exactly the ask
       * that could make a page play itself. A check that only ever pressed
       * nothing would pass on one that did.
       * ⚠️ **THE SECOND TOUCH REACHES `arm()` AND NOT THE LISTENER**, which
       * removed itself on the first one. That is the path a second gesture
       * really takes, so it is the path worth driving.
       */
````

<a id="muta-140"></a>
## muta-140: demo/muta/index.html, inline script, line 1427

````js
      /**
       * 🔴 THE TEST TONE IS A REAL BUTTON AND IT IS PRESSED HERE. Asked
       * 2026-09-25: *"make a Test tone button in the right of plaits"*. A check
       * that called `startDrone` would grade the DSP and say nothing about the
       * control, which is the defect this page has recorded about reaching past
       * a control since it had one.
       * ⚠️ **AND THE PRESS IS DOING TWO JOBS SINCE 2026-09-28.** It is the only
       * gesture in this file that both opens the audio and makes a sound, so a
       * `toggleTone` that failed to `await arm()` would be caught here as a
       * silent first press rather than anywhere more obvious.
       * ⚠️ **BOTH HALVES, AND THE SECOND PRESS IS THE ONE THAT CAN FAIL.** A
       * button that starts a tone and cannot stop it looks identical while
       * somebody is pressing it the first time.
       */
````

<a id="muta-141"></a>
## muta-141: demo/muta/index.html, inline script, line 1445

````js
      /* 🔴 THE TWO PICTURES ARE READ WHILE THE TONE IS RUNNING, WHICH IS WHERE
         THEY MOVED TO 2026-09-25 AND WHY THEY ARE BEHIND THE GATE AT ALL. Ink
         is made by something sounding, and until today that was the automatic
         drone, which ran for everybody from the moment an instrument was
         switched on. With *"no automatic drone"* the only sound outside a
         press is the one this block makes, so a picture assert left in the
         ungated part would print `FAIL` into a visitor's own log about a page
         that is working. `scope.drawn()` is a fact about this instant, so it is
         captured here rather than read at the assert below. */
````

<a id="muta-142"></a>
## muta-142: demo/muta/index.html, inline script, line 1458

````js
      /* 🔴 AND THE TWO-PICTURE ASSERT WENT WITH THE SECOND PICTURE, WHICH IS
         THE LARGEST LOSS OF COVERAGE IN THIS EDIT AND IS RECORDED RATHER THAN
         QUIETLY DROPPED. It read `each instrument draws its own signal, and the
         effect's is not the oscillator's`, and its value was that it compared
         two buffers sample for sample: two pictures fed from ONE buffer would
         have satisfied *both scopes are drawn* and proved nothing, which is two
         witnesses who are one witness. With one picture there is no second
         witness to disagree with, and what is left is the single-picture claim
         below. */
````

<a id="muta-143"></a>
## muta-143: demo/muta/index.html, inline script, line 1476

````js
      /* 🔴 IT READS `drawnP` RATHER THAN CALLING `scope.drawn()` AGAIN, AND THE
         DIFFERENCE IS A RED RUN ON A WORKING PAGE. MEASURED 2026-09-25:
         switching PLAITS off repaints the scope empty, switching it back on
         does not repaint it, and with the automatic drone gone nothing feeds it
         again until something plays. So this assert, which had been green for a
         week, failed the moment the check below started switching an instrument
         off, reporting `7 zero crossings` in its own detail while claiming the
         picture was not drawn. `el.hidden` against `getComputedStyle` is this
         project's own version of the same lesson: a reading taken later is a
         reading of something else.
         ⚠️ AND THE COMMENT THAT USED TO STAND HERE WAS ABOUT A DIFFERENT ASSERT.
         It read *"a key plays the oscillator rather than being counted"*, which
         describes the keyboard checks further down rather than this picture. */
````

<a id="muta-144"></a>
## muta-144: demo/muta/index.html, inline script, line 1495

````js
      /* 🔴 `an oscillator that is switched off makes no sound, whichever way it
         is asked` WENT WITH THE SWITCH ON 2026-09-28, AND IT IS THE ONE REAL
         LOSS OF COVERAGE IN THAT EDIT. It was the answer to *"when plaits is off
         and warps in on from plaits - how it can play at all?"*, asked
         2026-09-25: it pressed the switch off, then asked the oscillator to
         sound BOTH ways in, through the tone button and through the real
         `keyDown`, and required 0.000000 out of it and a dead tone button.
         ⚠️ **IT IS REMOVED RATHER THAN REWRITTEN BECAUSE ITS SUBJECT IS GONE.**
         There is no off, so there is no state in which a source may be refused,
         and the two guards it graded (`if (!plaitsOn) return` in `noteOn` and in
         `startDrone`) are gone with it. Rewriting it against `plaitsOn === true`
         would be a check that cannot fail, which this project holds to be worse
         than no check at all.
         ⚠️ **WHAT IS NOT GRADED ANY MORE, IN WORDS**: that the two doors into
         the voice allocator can be shut. If this page ever grows a way to stop
         the instrument, that assert comes back with it and both doors go back
         under one test. */
````

<a id="muta-145"></a>
## muta-145: demo/muta/index.html, inline script, line 1521

````js
      /**
       * 🔴 SUSTAIN, WHICH IS THE WHOLE OF WHAT `plai_note_off` BOUGHT AND IS
       * THE THING THE OLD CODE COULD NOT DO. `noteOn(60, 0)` holds the gate up
       * until something takes it down; with the hold this page used to send,
       * 6 blocks, the gate fell after 1.5 ms and every key was a pluck however
       * long it was held. Reported as *"i want long midi notes, i got plunky
       * sound"*.
       * ⚠️ **IT MEASURES THE SOUND AND NOT THE MESSAGE.** `released` coming
       * back as 1 says the shim found a voice, which a broken gate would also
       * say. The peak 700 ms in is what says the note was still being made.
       * ⚠️ **AND THE NEGATIVE CONTROL IS A NOTE NOBODY IS HOLDING.** Without it
       * a `plai_note_off` that released everything it was handed would pass:
       * the number that matters is that 61 releases NOTHING while 60 releases
       * one, from the same function, a tenth of a second apart.
       */
````

<a id="muta-146"></a>
## muta-146: demo/muta/index.html, inline script, line 1546

````js
      /* 🔴 `afterRelease`, NOT `quiet`, AND THE RENAME COST A RUN. This was
         `const quiet` and the boot's own untriggered reading is also called
         `quiet`, one scope out. The moment the four boot asserts moved into
         this block on 2026-09-25 the first of them read the outer `quiet`
         ABOVE this declaration, which is its temporal dead zone, so the whole
         gated block threw at its first line. MEASURED: **49 page asserts became
         28 and the run stayed GREEN**, because an assert that never runs cannot
         fail. `positron-ui` records the identical failure costing seven asserts
         on another page, and only the COUNT said so either time. */
````

<a id="muta-147"></a>
## muta-147: demo/muta/index.html, inline script, line 1566

````js
      /* 🔴 AND THE SAME NOTE LET GO EARLY, MEASURED AT THE SAME AGE, WHICH IS
         THE CONTROL THIS CHECK SHIPPED WITHOUT AND NEEDED. Plaits drives its
         lowpass gate with a PING when only the trigger is patched, so a key
         held for 700 ms and a key tapped for 100 ms decayed along the same
         curve and read the same number. The first version of this assert passed
         on a build with no sustain in it at all, and the report that followed
         was *"midi support is really messed up"*. What says the key is being
         followed is the DIFFERENCE between holding it and letting it go.
         ⚠️ AND IT RUNS AFTER THE RELEASE CHECK, NOT BEFORE IT. Written first it
         opened with `allOff`, which killed the note the release check was about
         to release, and that check went red reporting 0 voices released on a
         build where the release works. */
````

<a id="muta-148"></a>
## muta-148: demo/muta/index.html, inline script, line 1586

````js
        /* ⚠️ TWICE, NOT THREE TIMES. `decay` sits at 0.5 and its tail is long, so
           the released note read anywhere from 0.07 to 0.17 at the same age
           across runs while the held one sat at 0.4653. A threshold of three
           was a number fitted to one afternoon's readings rather than to the
           claim, and it went red on a build where the sustain works. What is
           being asserted is that holding the key is audibly louder than letting
           it go, and twice is that. */
````

<a id="muta-149"></a>
## muta-149: demo/muta/index.html, inline script, line 1598

````js
      /**
       * 🔴 THE MODEL CHANGES UNDER A NOTE THAT IS ALREADY SOUNDING, WHICH IS
       * THE STATE A KEYBOARD PUTS THIS INSTRUMENT IN AND THE ONE NOTHING
       * GRADED. The model check above plucks, so it only ever asked whether a
       * model picked BEFORE a note is the model that sounds. Reported as *"when
       * i change patches while midi on sound does not change"*.
       * ⚠️ IT COMPARES THE SIGNAL AND NOT `plai_active_engine()`. That number is
       * the shim reading back what this page sent it, so it would agree with the
       * picker on a build where the engine never reached the DSP at all.
       */
````

<a id="muta-150"></a>
## muta-150: demo/muta/index.html, inline script, line 1613

````js
      /* ⚠️ 300 ms AND NOT 650: the worklet posts a picture every 8 quanta, which
         is about 21 ms, so this is fifteen pictures' worth. The number that
         matters is the harness's patience rather than the DSP's, and a check
         block quiet for longer than 1.2 s is cut off where it went quiet. */
````

<a id="muta-151"></a>
## muta-151: demo/muta/index.html, inline script, line 1617

````js
      /* ⚠️ 400 ms OF SETTLING, AND THE CONTROL BELOW GETS THE SAME. A note that
         has just started is still opening its gate, so two windows at different
         AGES differ for a reason that has nothing to do with the picker, and
         that drift is what this check has to beat. */
````

<a id="muta-152"></a>
## muta-152: demo/muta/index.html, inline script, line 1627

````js
      /* 🔴 AND THE SAME NOTE LEFT ALONE FOR THE SAME 300 ms, WHICH IS WHAT
         SEPARATES *the model changed* FROM *the note moved on*. A held note is
         not a still picture: its gate is closing and its engine is running, so
         two windows 300 ms apart differ whatever the picker did. Without this
         the check graded the passage of time. */
````

<a id="muta-153"></a>
## muta-153: demo/muta/index.html, inline script, line 1642

````js
      /* 🔴 SORTED, WHICH MAKES IT A COMPARISON OF TIMBRE RATHER THAN OF PHASE.
         Sample by sample, two windows of a RUNNING oscillator differ enormously
         from where in the cycle each one starts, so the first version of this
         read 0.64 for a real model change against 0.46 for the same model left
         alone, and could not separate them. Comparing the sorted amplitudes
         throws the phase away and keeps the distribution, which is what a saw
         and a band of noise actually differ in. */
````

<a id="muta-154"></a>
## muta-154: demo/muta/index.html, inline script, line 1661

````js
      /* ⚠️ AND IT PUTS THE MODEL BACK. Leaving it on filtered noise changed the
         levels the stealing check below grades on, and that check refuses to
         grade two readings closer than a factor of 1.2 apart, so it went red on
         its own guard rather than on the rule. A check that leaves state behind
         is a check that breaks the next one. */
````

<a id="muta-155"></a>
## muta-155: demo/muta/index.html, inline script, line 1674

````js
      /**
       * 🔴 THE SUSTAIN PEDAL, DRIVEN THROUGH THE REAL HANDLERS. This machine
       * has no MIDI under a harness, so `keyDown`, `keyUp` and `keyControl` are
       * the only part of that path a check can reach, and reaching past them to
       * `noteOn` would grade the synth and say nothing about the keyboard.
       * ⚠️ AND THE CONTROL IS THE SAME GESTURE WITH NO PEDAL UNDER IT. A note
       * released with the pedal up has to be gone at the same age, or what is
       * being measured is only that a note takes a while to die.
       */
````

<a id="muta-156"></a>
## muta-156: demo/muta/index.html, inline script, line 1692

````js
      /* ⚠️ NOT ASSERTED ON ITS OWN. `decay` sits at 0.5, so a released note is
         still at 0.25 six hundred milliseconds later: it is DECAYING, not gone,
         and an assert calling it gone went red on a build where everything
         worked. What carries meaning is the RATIO, and that is the assert
         below. */
````

<a id="muta-157"></a>
## muta-157: demo/muta/index.html, inline script, line 1698

````js
      /* ⚠️ THE CONTROL IS ASSERTED AGAINST THE HELD NOTE RATHER THAN AGAINST
         ZERO. `decay` sits at 0.5, so a released note is still a quarter of the
         way up six hundred milliseconds later: it is DECAYING, not gone, and an
         assert calling it gone went red on a build where everything worked.
         ⚠️ AND IT IS HERE RATHER THAN FOLDED INTO THE PEDAL ASSERT BELOW,
         because a check block quiet for longer than the harness's patience is
         cut off where it went quiet, and the pedal measurement is 2.7 s of
         measuring with nothing to say. Deleting this one line silently took six
         asserts out of the run. */
````

<a id="muta-158"></a>
## muta-158: demo/muta/index.html, inline script, line 1729

````js
      /**
       * 🔴 A KEY STILL RINGING WHEN THE DRONE STARTS DOES NOT BECOME A SECOND
       * DRONE. Reported as *"i get distorted pluck and then beneath it the
       * right drone sound. that pluck never goes away"*. `plai_set_drone(1)`
       * clears the trigger on everything sounding, which takes the lowpass gate
       * out of the circuit, so a keyboard note caught by it ran for ever at
       * that key's pitch with nothing left that could release it.
       * ⚠️ IT COMPARES AGAINST A DRONE STARTED WITH NOTHING SOUNDING, which is
       * the only reading that separates *the stuck note is gone* from *the
       * drone is quiet today*. One number on its own says neither.
       */
````

<a id="muta-159"></a>
## muta-159: demo/muta/index.html, inline script, line 1763

````js
      /**
       * 🔴 THE TWO SOUNDS ARE EXCLUSIVE, BOTH WAYS, WHICH IS THE WHOLE OF
       * *"when midi notes arrive, they turn off test tone and vice versa"*,
       * 2026-09-25.
       * 🔴 **AND IT REPLACES THE ASSERT THAT SAID THE OPPOSITE.** That one read
       * `a key sets the drone's pitch instead of playing it, and letting go
       * does not stop it`, bought by *"why can i not use midi to control
       * drone"* on 2026-09-22 and true until today. The mechanism it graded,
       * `plai_set_param` id 1 retuning every unpatched voice, is untouched and
       * is still what the pitch rotary drives. What was reversed is who may
       * reach it from a keyboard.
       * 🔴 **TWO ASSERTS AND NOT ONE, WHICH IS THE HARNESS'S PATIENCE AND NOT
       * A STYLE.** Written as a single check the two directions are 2.85 s of
       * measuring with nothing to say, and `verify.mjs` tolerates 2.0 s of
       * silence before it decides a page has finished. MEASURED 2026-09-25 on
       * the first build of this check: the run read **48/49 with the last four
       * asserts simply absent**, which is the silent truncation this page has
       * already paid for twice. Each direction is about 1.4 s and each ends in
       * an assert, so the count never stands still for a whole patience.
       * ⚠️ **AND THEY ARE TWO CLAIMS ANYWAY.** They are two lines in two
       * functions: `keyDown` stops the tone, `toggleTone` takes the keys down,
       * and one of them passing says nothing about the other.
       * ⚠️ **THE KEY DIRECTION IS MEASURED AS A NOTE THAT ENDS.** A tone that
       * kept running under a key would still read a peak, and so would a key
       * played over a tone; what separates them is that letting the key go
       * leaves silence, which is only true if the tone really went.
       */
````

<a id="muta-160"></a>
## muta-160: demo/muta/index.html, inline script, line 1790

````js
      /* ⚠️ THE TONE DOWN FIRST, because the check above leaves one running and
         a press on a running tone is the STOP half of this button. A check
         that leaves state behind is a check that breaks the next one, which
         this page already records about the model picker. */
````

<a id="muta-161"></a>
## muta-161: demo/muta/index.html, inline script, line 1811

````js
          /* ⚠️ HALF, NOT A QUARTER, AND THE NUMBER IS THE CLAIM RATHER THAN
             AN AFTERNOON'S READING. MEASURED 2026-09-25: the tone reads
             0.7066 and a released key 700 ms later reads 0.1985, and a
             quarter of the tone is 0.1767, so the first build of this went
             red on a page that was working. It is the mistake this check
             block already records one assert down, where *"a threshold of
             three was a number fitted to one afternoon's readings"*.
             `decay` is 0.5 and its tail is long, so a released note is
             DECAYING rather than gone. What is being asserted is that the
             ENDLESS sound went: a tone still running would read the whole
             0.7066 here, which is nowhere near half. */
````

<a id="muta-162"></a>
## muta-162: demo/muta/index.html, inline script, line 1850

````js
      /**
       * 🔴 A HELD CHORD MUST NOT DRIVE THE INSTRUMENT INTO ITS OWN CEILING.
       * Reported as *"its same distorty stuff"*, and a keyboard is the first
       * thing that has ever held three notes open at once here: every note this
       * page played before had a hold on it and was gone in 6 ms. `trim` is set
       * by the voice COUNT and never by what is sounding, which is deliberate
       * and is exactly why three sustained notes can reach further than any
       * pluck did.
       * ⚠️ IT READ THE END OF THE CHAIN WHILE THERE WAS A CHAIN, because that
       * is what a listener gets and the effect had a gain of its own. The
       * oscillator is the end of it now.
       */
````

<a id="muta-163"></a>
## muta-163: demo/muta/index.html, inline script, line 1874

````js
      /**
       * 🔴 ONE VOICE MEANS ONE NOTE, EVEN WHEN THREE KEYS ARE DOWN. Reported as
       * *"when voices is 1 i still hear chords ...when playing midi chord"*.
       * Nothing graded this: every stealing check on this page plays notes with
       * a HOLD on them, so each one had let go by the time the next arrived, and
       * a keyboard holds all three at once.
       * ⚠️ AND IT READS THE DSP'S COUNT AND THE DSP'S PITCH, not the page's. The
       * page knows what it sent; `plai_held` and `plai_voice_note` are what is
       * being rendered.
       */
````

<a id="muta-164"></a>
## muta-164: demo/muta/index.html, inline script, line 1897

````js
      // 🔴 THE STEALING RULE, GRADED AGAINST THE NUMBERS THE RULE SAW. The
      // worklet reads every voice's level in the line before it asks for the
      // note, so this compares the shim's choice against the levels at the
      // moment of the choice rather than against a meter up to 250 ms stale.
      // ⚠️ AND IT IS CHECKED AT TWO VOICES rather than at eight, because a
      // third note is the smallest thing that has to steal. Two hundred
      // milliseconds apart puts both of them far past the eight millisecond
      // window in which a voice's level is not yet a measurement.
````

<a id="muta-165"></a>
## muta-165: demo/muta/index.html, inline script, line 1919

````js
      // ⚠️ AND IT REFUSES TO GRADE ON TWO NUMBERS THAT ARE THE SAME. With a
      // `before` array of zeros, or of two equal readings, `indexOf(min)`
      // answers 0 and so does the shim, and the assert would pass having
      // compared nothing. The levels have to be far enough apart that the
      // choice between them was a real one.
````

<a id="muta-166"></a>
## muta-166: demo/muta/index.html, inline script, line 1938

````js
  /**
   * 🔴 ANY GESTURE ON THE PANEL OPENS THE SOUND DEVICE, WHICH IS WHAT *"on by
   * default"* MEANS ON A PAGE THAT MAY NOT PLAY ITSELF. Asked 2026-09-28:
   * *"muta: on by default, no online button, put a test tone on that spot"*.
   * A browser hands out no running AudioContext without a gesture, and this
   * project's standing rule is that a visit opens nothing and a sound happens
   * on a press, so the instrument cannot be audible by itself. What it can be,
   * and now is, is READY: the firmware arrived with the page, and the first
   * touch of the panel pays for the device before a finger reaches a control.
   * ✅ **THE SHAPE IS `/fau/`'S, LIFTED RATHER THAN INVENTED**, built there the
   * same day for *"fau: compile on loading so i can play"*.
   * ⚠️ **IT IS THE PANEL AND NOT THE DOCUMENT**, so scrolling or tapping
   * somewhere else on the page opens no sound device. Touching the instrument
   * is the gesture; reading the page is not.
   * ⚠️ **AND IT IS THE CAPTURE PHASE**, so it runs before a control's own
   * handler rather than after it. That does not make the gesture that arms it
   * instant, because the node still has to be built and that is an await; what
   * it makes instant is every gesture after a visitor has touched anything at
   * all, which includes the knobs, whose sound has to follow the hand.
   * ⚠️ **AND IT RECORDS WHAT ARMED IT.** `armedBy` is the evidence for the
   * assert below: a page that opened a device on the load path and a page that
   * opened one on a touch are indistinguishable from inside the check block,
   * because by then both have one open.
   */
````

<a id="muta-167"></a>
## muta-167: demo/muta/index.html, inline script, line 1972

````js
  /* ⚠️ THESE FOUR LINES HAVE BEEN WRONG THREE TIMES AND ARE REWRITTEN A FOURTH.
     They said `turn an instrument on at the top of its case and it plays`, then
     `from the switch under its case`, then `from the switch on its foot`, and
     the switch is now gone as well. A sentence a visitor reads is part of the
     page, and the last one was the most expensive kind of stale: it named a
     control that is not there. */
````

<a id="muta-168"></a>
## muta-168: demo/muta/index.html, inline script, line 1990

````js
  /* ── the firmware a visit gets ────────────────────────────────────────────
     🔴 ASKED 2026-09-28: *"muta: on by default"*. This is that, and it is the
     whole of it: one fetch of the 196 KB artefact this repository ships, off
     this origin, started here and never again.
     ⚠️ IT IS NOT AWAITED AND NOTHING WAITS FOR IT. The download is network and
     the page paints through it; what blocks is the main thread's own
     `WebAssembly.Module`, and that lands after the page is on screen.
     ⚠️ AND THE CATCH IS INSIDE `warmUp`, because a page whose only report of a
     failed download is an unhandled rejection is a page that looks like it is
     still coming. */
````

<a id="muta-169"></a>
## muta-169: demo/muta/index.html, inline script, line 2002

````js
  /* ⚠️ THE COUNTS BEFORE ANY GESTURE, READ AT THE LAST LINE OF THE VISIT, AND
     OUTSIDE THE GATE ON PURPOSE. Everything above this line is what a page load
     does, and what it has to have done is exactly one thing: ask this site for
     the firmware. Inside `ifSelfcheck` these would stay unset for a visitor and
     the asserts that read them would go red on a page where nothing is wrong,
     which is the shape this project calls a harness artefact. Reading a counter
     costs a visitor nothing. */
````

<a id="muta-170"></a>
## muta-170: demo/muta/index.html, inline script, line 2015

````js
  /**
   * 🔴 THE HARNESS CANNOT REACH THE PANEL, SO THE PAGE TOUCHES IT.
   * `demo/verify.mjs` clicks every button in `.pos-controls` and nothing else,
   * and this page has no such row. Without this line the audio would never open
   * under a harness and **every assert behind it would stop running rather than
   * fail**, which is the shape `positron-verify` records on `/mirror/` and
   * `/blocks/` in one day.
   * ⚠️ **IT DISPATCHES A REAL POINTER EVENT RATHER THAN CALLING `arm()`**, so
   * the path under test is the path a person takes. A check that reached past
   * the listener would pass on a page whose listener was attached to nothing,
   * which is exactly the defect this arrangement could introduce. It was a
   * `power.el.click()` until 2026-09-28, for the same reason, on the control
   * that has gone.
   */
````

<a id="muta-171"></a>
## muta-171: demo/muta/index.html, inline script, line 2036

````js
  /* ⚠️ HERE AND NOT AT THE END OF THE CHECKS, WHICH WAS TRIED AND REVERTED.
     `verify.mjs` waits 7.4 s for `__demo.ready` before it grades anything, so a
     page that only says it is ready when its DSP checks are FINISHED, twenty
     seconds in, fails that wait and is never graded at all. The signal means
     *this page is up*, and `verify.mjs`'s patience is what covers the rest. */
````
