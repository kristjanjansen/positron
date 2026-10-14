# Page comments: tom

The full comments cut from the code under demo/ for tom, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="tom-1"></a>
## tom-1: demo/tom/index.html, style, line 10

````css
  /* 🔴 THE PITCH, THE RULER HEIGHT AND THE LABEL COLUMN'S WIDTH LEFT THIS FILE
     ON 2026-09-22 AND ARE `--pg-gap`, `--pg-cell`, `--pg-ruler` AND `--pg-lab`
     IN `shell.css`. They were never about this page: they are what makes a
     label column line up with the steps beside it, which is true of every grid
     of pads there will ever be here. `step-grid.mjs` measures `--pg-cell` off
     the strip and writes it onto both halves, so the two cannot drift. */
````

<a id="tom-2"></a>
## tom-2: demo/tom/index.html, style, line 17

````css
  /* 🔴 I READ `no top padding on titles` BACKWARDS AND SPENT FOUR ROUNDS
     REMOVING PADDING THAT WAS NOT THERE. It meant the title HAS no padding and
     needs some. Every repeat after it said so again, in plainer words each
     time, and each time I took more off: the card's top padding, then the
     plate's own, then ten pixels from both columns. The last report was
     `STILL NO TITLE PADDING`, in capitals, which is the same sentence as the
     first one.
     ✅ SO THERE IS NO OVERRIDE HERE AT ALL NOW. The plate sits at
     `panel-layout.mjs`'s own inset, which is what `/evo/`, `/twelve/` and
     `/circuit/` get, and it is the answer to *"you have several instroments
     done by now. can you not reuse ui?"*: the component already had this right
     and every line I wrote was moving away from it.
     🔴 AND SINCE 2026-09-28 THERE IS NO PLATE RULE HERE AT ALL, BECAUSE THE
     PLATE IS NOT IN THE CASE ANY MORE. Asked as *"tom: apply instrument
     panel"*: `instrument-panel.mjs` puts the nameplate in a row of its own
     across the FOOT, which is what the sketch that bought that component draws,
     so the two rules that used to float it over the top right corner of the
     case are gone. They were `.tom { position: relative }` and
     `.tom > .panel-plate { position: absolute; top/right: var(--panel-pad) }`,
     written for *"move grid upwards"* when the plate sat in the flow at 31 px
     tall and pushed the first pad down to 62. A plate at the foot takes nothing
     off the top, so the thing those two rules bought is now free. */
````

<a id="tom-3"></a>
## tom-3: demo/tom/index.html, style, line 40

````css
  /* 🔴 THE GRID'S OWN RULES LEFT THIS FILE ON 2026-09-22 AND ARE IN
     `shell.css` UNDER `step-grid`. `/pack/` grew a second hand-rolled grid the
     day after this one shipped, which is `positron-ui`'s own definition of a
     component that has not been noticed yet, so the pads, the ruler, the label
     column and every one of the five edges asked off them are a component now.
     ⚠️ NOTHING ABOUT THE LOOK CHANGED AND NOTHING WAS SUMMARISED AWAY. Every
     report that took an edge off this grid travelled with the rules, because a
     condensed rule reads as an opinion and the next person to touch it will put
     the border back.
     WHAT IS STILL HERE is only what is about THIS page: the label column giving
     up the panel's divider, and the line under the instrument that says what
     was last heard. */
````

<a id="tom-4"></a>
## tom-4: demo/tom/index.html, style, line 53

````css
  /* ⚠️ THE LABEL COLUMN IS THE PANEL'S FIXED COLUMN, so it carries both the
     component's class and the panel's. The gap is the one the panel's flow
     would normally carry and this page does not use the flow.

     🔴 AND THE GUTTER AND THE DIVIDER COME BACK OFF HERE, WHICH THEY DID NOT
     FOR THREE DAYS. REPORTED 2026-09-25 AS *"you lost 2-digin numbers from tom
     demo"* with a crop of the gutter reading `5 5 5 5 5 5 5 5 6 6 6 6` down the
     last twelve rows, which is 52 to 63 with the second digit gone.
     🔴 IT IS A CLIP AND NOT A TRUNCATION, WHICH WAS MEASURED BEFORE ANYTHING
     WAS CHANGED, because the two look identical in a screenshot and have
     different fixes. `label: (r) => String(r)` and every `textContent` in the
     column was the whole number; what was wrong was the box. MEASURED at
     1280 px: `.pos-pg-labs` computed `padding-right: 16px` and
     `border-right-width: 1px` against `width: 22px` under `box-sizing:
     border-box`, so a label's border box was **6.00 px** and its CONTENT box
     **0.00 px**, against **12.04 px** of ink for `52`, `scrollWidth 18` in a
     `clientWidth 6`. One character is what fits in six pixels.
     🔴 THE CAUSE IS A RULE THAT LOST ON SOURCE ORDER, AND IT USED TO BE THIS
     LINE. Before 2026-09-22 this page carried `.tom-fixed { border-right: 0;
     padding-right: 0 }` with a comment reading *"NO DIVIDER"*. `2a8a450` moved
     it into the component as `.pos-pg-labs { border-right: 0; padding-right: 0 }`
     at `shell.css:2318`, and `.panel-fixed-l` at `shell.css:5636` sets both of
     them back. **Both are (0,1,0) and the panel's is 3,300 lines later, so the
     component's declarations have never once applied.** A page rule in this
     block is in a `<style>` after the `<link>`, which is how it won before the
     move and how it wins now.
     ⚠️ `--pg-lab` IS NOT THE NUMBER TO CHANGE. 22 px holds `63` with room: the
     label's own `padding: 0 6px 0 0` leaves 16 px for 12.04 px of ink, which is
     what the assert below reads. Widening the column to pay for a gutter the
     grid asked to have removed would put the divider back at 108 px of width.
     ✅ AND IT IS NO LONGER A PAGE RULE UNDER PROTEST, BECAUSE THE DURABLE
     REPAIR LANDED. This paragraph said the cure was still owed and named two
     lines in `shell.css`; the first of them was written. `.pos-pg-labs
     { border-inline: 0; padding-inline: 0 }` now sits at `shell.css:6407`,
     AFTER `.panel-fixed-l` at `shell.css:6378`, with the measurement beside it.
     MEASURED 2026-09-28 at 375 and at 1280: `.panel-fixed` computes
     `padding-left: 0px`, `padding-right: 0px` and no border on both. So the two
     declarations below now AGREE with the component instead of being the only
     thing holding the column open. They stay because a page rule in a `<style>`
     after the `<link>` is the tie that won here first, and two agreeing rules
     are cheaper than a reader working out which one is load bearing.

     🔴 AND THE COLUMN HANGS OUT OF THE CARD'S INSET SINCE 2026-09-28, ASKED FOR
     AS *"reduce left padding on tom's left numbers"*. NEITHER THE NUMBER NOR ITS
     COLUMN CARRIES ANY LEFT PADDING AND NEITHER EVER DID: `.pos-pg-lab` is
     `padding: 0 6px 0 0` and `.pos-pg-labs` is `padding-inline: 0`. The air a
     reader was pointing at belongs one box further out, which is why the first
     command was `node demo/ancestry.mjs tom '.pos-pg-lab' padding-left` and not
     an edit.
     🔴 THREE BOXES INSET THIS COLUMN'S LEFT EDGE AND ONLY ONE IS INSIDE THE
     OBJECT. `body` gives 16 and `.pos-glue` gives its 1 px border, which are the
     page's own margin and the object's own edge. The third is `.panel-case`'s
     `padding: 0 var(--panel-pad)` at 20 px, which no rule on this page touched.
     That is the whole of it, at both widths, identically.
     🔴 THE COMPARISON THAT SETTLES IT IS INSIDE ONE GLUED OBJECT, because that
     is what a reader is looking at. MEASURED from the object's own left edge,
     the same at 375 and at 1280: the transport bar puts its play button at 9,
     the log puts its first line of ink at 13, and this column's box sat at 21
     with `63` inking at 24.96 and `0` at 30.98. Three rows of one surface, and
     the gutter was the only one set in past 13. ⚠️ AND `0` IS THE READING, NOT
     `63`: the first ten rows are single digits, they are the ones sitting
     directly under the play button, and the column is right aligned, so what a
     reader compares against that button is 30.98.
     🔴 `--panel-pad` IS NOT THE THING TO LOWER, WHICH WAS CHECKED RATHER THAN
     ASSUMED. On this page that one token does three jobs: the card's left inset,
     the card's RIGHT inset, and `.panel-fixed`'s and `.panel-strip`'s
     `padding-block`, which is the air above the first row of pads and below the
     last. Lowering it answers one ask by moving three things, on the page whose
     own four-round scar is about a title's air.
     ⚠️ AND `--pg-lab` IS STILL NOT THE NUMBER TO CHANGE, for the reason two
     paragraphs up. Narrowing the column to buy two pixels spends the 3.96 px
     that the ink assert below reads as its entire headroom.
     ✅ SO THE COLUMN LEAVES THE CARD'S INSET RATHER THAN FIGHTING IT, AND THE
     ESCAPE IS DERIVED FROM THE TOKEN IT IS ESCAPING. A child never gets out of a
     parent's padding by declaring its own, and a typed `-12px` here would be a
     relationship between two boxes wearing a minus sign. `calc(var(--ctl-gap) -
     var(--panel-pad))` says it instead: the ruler keeps the kit's smallest
     published air from the card's border in place of the card's full inset.
     MEASURED after, both widths: the box lands at 9, which is the transport
     bar's own content inset to the pixel, `63` inks at 12.96 against the log's
     13, and `0` at 18.98. The assert below reads the box against the BAR rather
     than against a number, so if either token moves the two stop agreeing out
     loud.
     ⚠️ IT MOVES THIS COLUMN AND NOTHING ELSE. The nameplate left the case on the
     same day and the strip's right edge is still the card's 20, so the card is
     the width it was and only the ruler hangs out.
     ⚠️ AND THE FULL ESCAPE WAS LOOKED AT AND REFUSED. `calc(-1 *
     var(--panel-pad))` is the form this project sanctions for a part that must
     reach its own box's edge, and this one must not: it lands `63` at 4.96 from
     the object's edge, which photographs as a column about to be clipped, on the
     one page whose gutter has been clipped before. `-16` was looked at too and
     puts `63` at 8.96, inside the transport bar's own inset. */
````

<a id="tom-5"></a>
## tom-5: demo/tom/index.html, style, line 150

````css
  /* ⚠️ IT MOVES ON A PRESS AND NEVER ON A CLOCK, which is what makes a line of
     prose allowed here at all. It says which sample was last heard and why, and
     it is a fixed box either way so a longer name cannot move the grid under
     it. */
````

<a id="tom-6"></a>
## tom-6: demo/tom/index.html, inline script, line 176

````js
  /**
   * 🔴 THIS PAGE SENDS NOTHING AND ASKS NOBODY FOR ANYTHING, AND BOTH ARE
   * ASSERTED OVER COUNTERS RATHER THAN OVER A READING OF THE SOURCE. A grep for
   * `requestMIDIAccess` finds it absent on every day it is absent and says
   * nothing about the day somebody adds it behind a helper. The reason it
   * matters here is the same one `/pack/` writes down: a Circuit has no factory
   * reset, one byte separates `Replace Current Patch` from `Replace Patch`, and
   * the file this page opens is somebody's only backup of that flash. Nothing
   * on this page can reach an instrument.
   */
````

<a id="tom-7"></a>
## tom-7: demo/tom/index.html, inline script, line 195

````js
  // 🔴 THE PACK IS NOT IN THIS REPOSITORY ANY MORE, ON ANY ORIGIN. It moved to
  // the owner's private pack repository on 2026-09-24 (*"rm new pack, is in
  // separate repo"*), before this repository was prepared to go public, and the
  // blob it had been sitting on in history went with it.
  // 🔴 SO THE DEFAULT IS TO FETCH NOTHING, AND THE SECOND WAY IN IS AN EXPLICIT
  // `?pack=<url>`. This used to be an ORIGIN TEST: present on a checkout, absent
  // on the deploy, decided from `location.hostname` rather than by fetching,
  // because a build that discovered the file with a 404 took the deploy run red
  // on `no console errors` and a red that is expected is a red everybody skips.
  // That reasoning is intact and is exactly why the default is EMPTY rather than
  // a path that used to be there: with no `?pack=` this page asks nobody for
  // anything on any origin, and the reading checks below say they did not run
  // rather than going red.
  // ⚠️ AND EVERY ONE OF THOSE CHECKS IS STILL REACHABLE by anybody holding a
  // pack of their own:   /tom/?pack=/tmp/personal/mine.circuitpack
````

<a id="tom-8"></a>
## tom-8: demo/tom/index.html, inline script, line 213

````js
  /**
   * 🔴 SIXTY FOUR STEPS ACROSS AND EIGHT ROWS DOWN UNTIL A PACK LANDS, WHICH IS
   * ONE OF TWO READINGS OF THE ASK AND IS SAID OUT LOUD RATHER THAN CHOSEN IN
   * SILENCE. The request was *"a 8x64 grid with transport on top. have
   * circuitpack uploader on top (as many rows as there are samples)"*. Read as
   * ROWS by STEPS: 8 rows is what there is before a file is open, the
   * parenthesis says the rows become the samples once one is, and 64 is the
   * step count. The other reading, 8 steps and 64 rows, is not ruled out by the
   * words, and it is ruled out by the parenthesis only if `rows` means the
   * first number. `BACKLOG.md` carries both.
   * ⚠️ SWAPPING THEM IS `REST_ROWS` AND `STEPS` CHANGING PLACES AND NOTHING
   * ELSE. Nothing below counts either of them twice.
   *
   * 🔴 AND IT IS SIXTEEN STEPS SINCE 2026-09-21, SETTLED IN THREE WORDS:
   * *"tom: 16 col"*. That is a Circuit pattern's own length, which is the
   * instrument this grid's rows come out of, so the page and the machine now
   * count the same way. It also puts the whole pattern on a phone: sixty four
   * columns meant about ten of them were on screen at 390 px and the other
   * fifty four had to be dragged to.
   * ⚠️ THE RULER'S MARKS SURVIVE THE CHANGE, which is the thing that would
   * quietly have stopped meaning anything. A beat mark every 4 steps and a bar
   * mark every 16 describe 4 bars over 64 and ONE bar over 16, and both are
   * true statements about the grid rather than decoration that happens to land.
   */
````

<a id="tom-9"></a>
## tom-9: demo/tom/index.html, inline script, line 238

````js
  /**
   * 🔴 SIXTY FOUR ROWS AT REST SINCE 2026-09-21, ASKED FOR AS *"make 64 rows"*.
   * That is the Circuit's own sample slot count, so an empty grid is now the
   * shape of the instrument rather than a placeholder eight, and opening a pack
   * fills rows that were already there instead of growing the page by 56.
   * ⚠️ IT IS A TALL PAGE AND THAT IS THE TRADE. 64 rows is about 1,300 px, so
   * the transport scrolls off the top. A nested vertical scroller would push
   * the horizontal one below the fold and is the worse of the two.
   */
````

<a id="tom-10"></a>
## tom-10: demo/tom/index.html, inline script, line 248

````js
  /**
   * How long a step is, in milliseconds. 125 ms is a sixteenth note at 120
   * beats a minute, so the whole grid is eight seconds and four bars of four.
   * ⚠️ THERE IS NO TEMPO CONTROL AND THAT IS NOT AN OMISSION. The transport bar
   * renders a rate lattice off `caps.rates`, so the bar's own 0.5x / 1x / 2x IS
   * the tempo: 60, 120 and 240 beats a minute. A second control setting the
   * same quantity from a different direction is two numbers that can disagree.
   */
````

<a id="tom-11"></a>
## tom-11: demo/tom/index.html, inline script, line 265

````js
    /**
     * Four cells, all of which move, and none of which is a structural
     * constant. `rows` is not among them because the number of rows is the
     * thing you are looking at; a cell counting what is on screen teaches a
     * reader to read the cell instead of the page.
     * ⚠️ `on` IS SET AT LOAD AND THE OTHER THREE ARE NOT. A census of a grid
     * that is visibly empty is a real reading of zero. A counter of sounds that
     * have not happened is not, and `0` there would read as a very confident
     * measurement of nothing.
     */
````

<a id="tom-12"></a>
## tom-12: demo/tom/index.html, inline script, line 275

````js
    /* 🔴 NO READOUT AT ALL SINCE 2026-09-22: *"rm readout from tom"*. It held
       `on`, `step`, `voices` and `late`.
       ⚠️ **THE FACTS DO NOT GO WITH THE CELLS.** `late` is the only one that was
       a measurement rather than a restatement of what the grid already shows,
       and it is in the log, where a number that matters once is read once.
       ⚠️ AND IT IS `readout: null`, NOT AN OMITTED FIELD. `shell.mjs` reads
       `null` as `readoutOptOut`, which is how a page SAYS it has none rather
       than appearing to have forgotten: the harness then asserts *declares that
       it has no readout, on purpose* instead of going red. `/floor/` is one of
       the other pages that does this and carries the same note. */
````

<a id="tom-13"></a>
## tom-13: demo/tom/index.html, inline script, line 286

````js
    /**
     * 🔴 NO CONTROL ROW AT ALL, AND THE MISSING CONTROL IS `clear`. `verify.mjs`
     * presses every button in `.pos-controls` in order on every run, so a
     * control that empties the pattern is a control that empties the pattern
     * underneath this page's own reading checks, and the two race. The cells
     * are the controls here, the transport bar carries the transport, and a
     * reader who wants a cell off presses it again. If `clear` is wanted it
     * wants a way for the harness to press it safely first.
     */
````

<a id="tom-14"></a>
## tom-14: demo/tom/index.html, inline script, line 300

````js
  /**
   * 🔴 PURE, SO IT CAN BE GRADED WITHOUT A BROWSER OR A SOUND. Every bug a
   * grid like this has ever had lives in exactly this arithmetic: a step index
   * one past the end at the last millisecond, a negative position from a range
   * that does not start at zero, a floor that turns into a round.
   */
````

<a id="tom-15"></a>
## tom-15: demo/tom/index.html, inline script, line 312

````js
  /** `[{ name, wave, row }]`. `wave` is null on a resting row, and `row.ok` is
   *  false on a sample that would not read: both keep their place in the grid,
   *  because a reader that silently dropped one leaves a pack looking smaller
   *  than it is. */
````

<a id="tom-16"></a>
## tom-16: demo/tom/index.html, inline script, line 317

````js
  /**
   * 🔴 WHICH PADS ARE ON LIVES IN THE COMPONENT NOW AND NOWHERE ELSE. This page
   * kept its own `on`, its own `cells`, its own element lists and its own
   * roving tab stop until 2026-09-22, and all five moved into `step-grid.mjs`
   * with the drawing. Keeping a second copy here would be a shared measurement
   * in two files, which is the defect `--sld-col` exists to record: two numbers
   * that agree until one of them is edited.
   */
````

<a id="tom-17"></a>
## tom-17: demo/tom/index.html, inline script, line 338

````js
  // ⚠️ A FUNCTION DECLARATION RATHER THAN AN ARROW, so it is hoisted over the
  // grid it reads and this page's own checks can call it wherever they sit. A
  // `const` here would be read in its dead zone by anything above the grid,
  // which this project has already lost seven asserts to.
````

<a id="tom-18"></a>
## tom-18: demo/tom/index.html, inline script, line 345

````js
  /**
   * 🔴 THE TIMELINE'S OWN DECK, NOT A `setInterval`. Asked for as *"use
   * webauudito transport code we have"*. `createDeck` brings the worker tick
   * host, the lookahead, the rate lattice, the drift log and a seek that
   * re-folds state, and `transport-bar.mjs` is the one control that drives one.
   *
   * 🔴 AND `createAudioLane` IS DELIBERATELY NOT USED, WHICH NEEDS A REASON
   * BECAUSE IT IS THE WEB AUDIO HALF OF THAT SAME FILE. That lane commits an
   * event as a node started at an exact audio time, which is a thousand times
   * closer to the instant than a timer. It CANNOT LOOP, and that is read in
   * `timeline/transport.mjs`: a node's `onended` moves an event to `rendered`,
   * `cancelCommitted()` only resets `committed`, and the seek handler only
   * resets `passed`, so `rendered` is terminal and a second lap is silent. A
   * step grid loops or it is not a step grid.
   * ⚠️ THIS IS READ OFF THE SOURCE RATHER THAN MEASURED, and it is a claim
   * about that module rather than about this page. The bill for the timer lane
   * is in the `late` cell, which is the honest number and is this project's
   * own way of reporting it: `/lanes/` exists to show the difference.
   */
````

<a id="tom-19"></a>
## tom-19: demo/tom/index.html, inline script, line 369

````js
    /**
     * 🔴 NO RATE LATTICE, ASKED FOR 2026-09-21: *"rm rate, replace with - bpm
     * +"*. `caps.rates` is what the bar renders its 0.5x / 1x / 2x from, so
     * declaring none is how a page says it has no lattice; the bar then shows
     * nothing rather than a row of one.
     * ✅ AND THE QUANTITY DID NOT CHANGE, ONLY ITS UNITS. The page's own comment
     * used to argue that a second tempo control would be two numbers that can
     * disagree, and it was right: so the `- bpm +` below sets the SAME thing the
     * lattice set, the deck's rate, printed in the units a drum machine uses.
     * 120 bpm is rate 1 by construction, because a step is 125 ms.
     */
````

<a id="tom-20"></a>
## tom-20: demo/tom/index.html, inline script, line 384

````js
      // 🔴 AGAINST THE MILLISECOND THE SCORE ASKS FOR, not against the previous
      // step, which would only measure the timer against itself. Read on the
      // page's side of the boundary, which is the side that can be wrong.
````

<a id="tom-21"></a>
## tom-21: demo/tom/index.html, inline script, line 389

````js
    // ⚠️ COUNT ONLY. The rows a reducer is handed are not the items that were
    // scheduled, and assuming they are took a whole page down from inside a
    // seek once already.
````

<a id="tom-22"></a>
## tom-22: demo/tom/index.html, inline script, line 403

````js
    /**
     * 🔴 EVERY STEP IS ONE MILLISECOND OFF THE RANGE START, AND THAT IS WHY THE
     * FIRST COLUMN CAN BE HEARD. Reported twice: *"i can not hear 1st col
     * beat"*. `timeline/transport.mjs` re-arms an event with `ev.at > st.p0`,
     * STRICTLY greater, so an event scheduled at exactly `0` is never re-armed
     * after `deck.seek(0)`: on the first lap it fires, and on every lap after
     * the wrap it is silent while all fifteen others sound.
     * ⚠️ THE OFFSET IS ON THE SCORE, NOT ON THE COMPARISON. Changing the
     * strictness in `transport.mjs` would reach every deck in this project
     * including two offline render paths, to fix one page's zero. One
     * millisecond at 120 bpm is 0.008 of a step and is under any threshold
     * anybody can hear.
     * ⚠️ AND `stepAt()` IS UNTOUCHED, because it divides a POSITION by the step
     * length and the positions did not move: the score moved by 1 ms inside a
     * 125 ms step, so every event still lands in the step it names.
     */
````

<a id="tom-23"></a>
## tom-23: demo/tom/index.html, inline script, line 425

````js
  /** Bright while it runs, barely there while it is parked.
   *  ⚠️ THE ATTRIBUTE IS THE COMPONENT'S AND IS DELETED RATHER THAN SET EMPTY,
   *  because every rule about a running head is written `[data-live]` and an
   *  attribute selector matches on PRESENCE. `step-grid.mjs` owns that. */
````

<a id="tom-24"></a>
## tom-24: demo/tom/index.html, inline script, line 431

````js
  /**
   * 🔴 PERMANENT LOOP MODE. Asked for three times in one evening and the third
   * settles it: *"make it autoloop"*, then *"no autoloop"*, then *"permanend
   * loop mode"*. A sixteen step pattern repeating is what the instrument DOES,
   * so it is not a mode you put it in and there is no control for it.
   * 🔴 AND IT IS ONLY AUDIBLE BECAUSE OF THIS EVENING'S FIX.
   * `createAudioLane` left a step that had already sounded terminally
   * `rendered`, so lap two was silent: MEASURED on the audio thread as 4 heard
   * on lap one and 0 on lap two. Without that one condition in
   * `timeline/transport.mjs` this would be a playhead going round and round in
   * silence, which is a page that LOOKS like it is working.
   * ⚠️ A BACKWARD `seek`, THE SAME PATH THE TRANSPORT BAR'S OWN LOOP TAKES, so
   * a wrap here and a wrap there cannot behave differently.
   * ⚠️ AND IT WRAPS AT THE END OF THE LAST STEP RATHER THAN AT THE END OF TIME.
   * The score runs to `SPAN` and a step is `STEP_MS` long, so the sixteenth
   * step's own length is part of the bar: seeking at `SPAN` exactly would hold
   * that step one extra frame every lap and the pattern would drift against a
   * metronome.
   */
````

<a id="tom-25"></a>
## tom-25: demo/tom/index.html, inline script, line 450

````js
  /**
   * 🔴 IT DID NOT LOOP AND THE GUARD IS WHY. This read
   * `if (!deck.transport.playing) return;`, and the deck's END STOP pauses at
   * the top of the range, so by the time the position reaches `SPAN` the
   * transport is ALREADY stopped and the wrap returned early every lap.
   * MEASURED by driving the page: `204 406 608 810 1015 1218 1421 1623 1824
   * 2000 2000 2000 2000 2000 2000 2000`. It stops dead at the end and stays
   * there.
   * ⚠️ AND NOTHING IN THE SUITE SAW IT, because every check seeks rather than
   * waiting two seconds of wall time, and a seek never meets the end stop. The
   * only way to find this was to press play and watch, which is what the
   * owner did, four times, while I measured padding.
   * ✅ SO IT SEEKS AND STARTS AGAIN. `armed` is what tells a lap ending from a
   * person pressing pause: the transport reports not-playing for both, and the
   * difference is where the playhead is when it says so.
   */
````

<a id="tom-26"></a>
## tom-26: demo/tom/index.html, inline script, line 466

````js
  /**
   * 🔴 IT WRAPS BEFORE THE END STOP RATHER THAN AT IT, AND THAT IS THE WHOLE
   * FIX. Three attempts failed for one reason, found by driving the page rather
   * than reading it: the deck's END STOP pauses at the top of the range, and
   * the LAST `onPosition` call arrives BELOW the top. A wrap that waits for
   * `SPAN` is a wrap that is never called, and then the transport is stopped
   * and `onPosition` has stopped firing, so nothing is left to notice.
   * MEASURED three times, identically: `... 1623 1825 2000 2000 2000 2000`.
   * ⚠️ `WRAP_AT` IS ONE TICK'S WORTH OF SLACK, not a guess. The deck ticks at
   * `tickMs` 25 and reports positions at 60 Hz, so the last call before the
   * stop can be tens of milliseconds short of the top. Forty is comfortably
   * more than that and is 0.3 of one step at 120 bpm.
   * ⚠️ AND IT COSTS THE TAIL OF THE LAST STEP'S TIME, NOT ITS SOUND. The
   * sixteenth step fires at 1,875 ms and its sample is already playing; what is
   * cut is 40 ms of silence after it, which is what a drum machine does at the
   * end of a bar anyway.
   */
````

<a id="tom-27"></a>
## tom-27: demo/tom/index.html, inline script, line 491

````js
  // ── the way in ──────────────────────────────────────────────────────────
  //
  // 🔴 IT IS `open`, NOT `upload`, AND NOTHING LEAVES THE MACHINE. The file is
  // read into an `ArrayBuffer` in this tab and handed to the code below;
  // `drop.mjs` names no network API at all. The title is the reader's word for
  // the block and the button is the promise about what pressing it does.
````

<a id="tom-28"></a>
## tom-28: demo/tom/index.html, inline script, line 498

````js
    // ⚠️ `.syx` SINCE 2026-09-21, BECAUSE THE PAGE OPENS ONE NOW. A bulk sample
    // transfer is a `.syx` in the archive download and a `.circuitpack` that is
    // not a zip in eleven more, and a list that named neither was a way in the
    // page had stopped meaning.
````

<a id="tom-29"></a>
## tom-29: demo/tom/index.html, inline script, line 506

````js
    // ⚠️ NO RESTING LINE. The footer comes into existence when it has something
    // to say and goes away again, which is the component's own answer to an
    // empty box painting a line nobody wrote.
````

<a id="tom-30"></a>
## tom-30: demo/tom/index.html, inline script, line 516

````js
  /**
   * 🔴 PUBLISHED ON `__demo`, BECAUSE A DRAG CANNOT BE SYNTHESISED AND THE
   * BUTTON OPENS AN OPERATING SYSTEM DIALOG. Those are the only two ways in for
   * a person and neither is drivable, so without this the one path that matters
   * is reachable by nothing outside the page. It goes on `window.__demo` and
   * NOT on `mount()`'s return value: they are different objects, and the
   * wrapper is somewhere no harness looks.
   */
````

<a id="tom-31"></a>
## tom-31: demo/tom/index.html, inline script, line 525

````js
  /* ⚠️ THE WORST LATENESS, PUBLISHED FOR THE CHECK RATHER THAN READ OUT OF A
     CELL. It was a readout cell until 2026-09-22, and a check reading a cell is
     a check that breaks when the page stops printing it, which is exactly what
     happened. A getter, so it reports the value at the moment it is asked. */
````

<a id="tom-32"></a>
## tom-32: demo/tom/index.html, inline script, line 532

````js
  // ── the transport ───────────────────────────────────────────────────────
  //
  // 🔴 `scrub: false`: ONE POSITION SURFACE PER PAGE, AND THE GRID IS IT. The
  // ruler over the steps is a horizontal time axis carrying the content as well
  // as the position, which is exactly the argument that takes the slider off a
  // page with a strip. Two axes at different scales, stacked, is a
  // contradiction rather than a redundancy.
  // ⚠️ AND THE BAR KEEPS WHAT ONLY IT HAS: play, the clock, the rate lattice,
  // LOOP and the degraded badge. One press of LOOP at the start arms the window
  // and it closes at the end of the grid, which is how four bars repeat.
````

<a id="tom-33"></a>
## tom-33: demo/tom/index.html, inline script, line 542

````js
  /**
   * 🔴 `- bpm +`, WHICH IS THE RATE IN THE UNITS THIS INSTRUMENT USES. Asked
   * 2026-09-21: *"rm rate, replace with - bpm +"*.
   * ✅ IT SETS THE DECK'S RATE AND NOTHING ELSE, which is why the page's old
   * argument against a second tempo control still holds: there is still ONE
   * quantity. A step is 125 ms, so 120 bpm is rate 1 exactly, and the score is
   * never rescheduled.
   * ⚠️ AND IT IS `createStepper`, NOT THREE BUTTONS. The kit owns that shape,
   * including the middle slot and the square arrows, and hand rolling a control
   * that exists is this project's most repeated defect.
   * ⚠️ THE RANGE IS THE LATTICE IT REPLACES, WIDENED: 60 to 240 bpm is rate 0.5
   * to 2, the three values the lattice offered, and every step between them.
   */
````

<a id="tom-34"></a>
## tom-34: demo/tom/index.html, inline script, line 560

````js
  /**
   * ⚠️ THE MIDDLE IS A `pick` RATHER THAN A PLAIN READOUT, which is the shape
   * the component already has: the current value named, with the whole list
   * behind it. So `-` and `+` walk in fives and the cell jumps straight to a
   * tempo, and the cell's width comes from the widest member so the arrows do
   * not move as the number changes. A readout slot would have been a fourth
   * thing for that component to grow.
   */
````

<a id="tom-35"></a>
## tom-35: demo/tom/index.html, inline script, line 582

````js
    // ⚠️ `setRate` DOES NOT START PLAYBACK, which is the seam that module's own
    // header records: it used to double as `play()` and no longer does. So
    // changing the tempo while stopped leaves it stopped.
````

<a id="tom-36"></a>
## tom-36: demo/tom/index.html, inline script, line 591

````js
  /**
   * 🔴 NO LOOP, ASKED FOR AS *"rm loop for now"*. It was the bar's own LOOP
   * arming a window over the whole grid, which is a transport's idea of a loop
   * rather than a drum machine's: a sixteen step pattern repeating is what the
   * instrument DOES, not a mode you put it in, and the two readings were
   * competing on one button.
   * ⚠️ `for now` IS THE OWNER'S WORD AND IS KEPT. Nothing about the deck
   * changes, so turning it back on is `loop: true`.
   */
````

<a id="tom-37"></a>
## tom-37: demo/tom/index.html, inline script, line 600

````js
  /**
   * ⚠️ THE TEMPO GOES IN THE BAR'S RIGHT SLOT, WHERE THE RATE LATTICE SAT.
   * Asked 2026-09-21: *"bpm in on the transport, right slot"*. `right` is an
   * option `transport-bar.mjs` grew for it rather than this page querying
   * `.tbar-rates`, which would be a page reaching into a component's insides
   * and breaking silently the day it renames a class.
   * ⚠️ AND IT IS NOT IN `.pos-controls`, which this page declares empty on
   * purpose. Both harnesses press that row and nothing else, so a control
   * outside it is a control nothing presses: the checks below drive it by name,
   * which is the cost this session has now paid twice over.
   */
````

<a id="tom-38"></a>
## tom-38: demo/tom/index.html, inline script, line 611

````js
  /* 🔴 A DETACHED HOST, BECAUSE THE ROW THIS BAR BELONGS IN DOES NOT EXIST YET.
     `createTransportBar` appends itself to whatever it is handed, and the
     instrument panel is assembled below out of parts this file has already
     built. Handing it `d.el` and letting the panel's row take the node away
     would render the same and say something else, and a page whose source
     disagrees with its DOM is the shape this project keeps paying for. */
````

<a id="tom-39"></a>
## tom-39: demo/tom/index.html, inline script, line 620

````js
  /**
   * 🔴 THE SECOND PRESS STOPS RATHER THAN PAUSING. Asked 2026-09-21: *"replace
   * pause with stop. when i pess space 2 timess its plays, stops (resets to
   * first col and restarts)"*, then *"3 times"*, which names the whole cycle:
   * play, stop back to the first column, play from the top again.
   * ⚠️ A DRUM MACHINE HAS NO PAUSE, and that is the argument rather than a
   * preference. Resuming half way through a sixteen step bar is a thing a tape
   * does; an instrument that repeats a bar either runs or is at the top of it.
   * 🔴 IT HANGS OFF THE PRESS AND NOT OFF `onState`, BECAUSE THAT CALLBACK
   * FIRES ONCE AT LOAD AND NEVER ON PLAY. Measured today with this page's own
   * log, and it is what made three attempts at looping fail before that was
   * known. Anything here that needed to know *the transport just stopped* has
   * to read it rather than be told.
   * ⚠️ AND IT RUNS AFTER THE BAR'S OWN HANDLER, which is what the timeout is
   * for: a listener added later on the same element fires later, but the bar's
   * work is not necessarily finished when it returns. It asks the transport
   * what state it ended up in rather than assuming the press toggled it.
   * ⚠️ SPACE GETS THIS FOR FREE. The bar owns space as its play key on every
   * page here, so it presses this same button: one behaviour, not two.
   */
````

<a id="tom-40"></a>
## tom-40: demo/tom/index.html, inline script, line 640

````js
  // ⚠️ `bar.el`, NOT `bar.api.el`. `createTransportBar` returns a WRAPPER and
  // `api` is what it publishes; reaching through the wrong one threw on load
  // and the page died with `__demo` never published, which the probe saw as
  // every reading coming back `undefined`.
````

<a id="tom-41"></a>
## tom-41: demo/tom/index.html, inline script, line 644

````js
  /**
   * 🔴 BOTH WAYS IN, AND I ONLY WIRED ONE. Reported: *"i can not get the stop
   * working. when i press space white playing it does not reset"*, and the bar
   * is why: `transport-bar.mjs`'s key table calls `cmd.pause()` DIRECTLY rather
   * than pressing its own button, so a listener on the button never sees the
   * space bar at all.
   * 🔴 AND MY CHECK AGREED WITH THE BUG BECAUSE IT CLICKED. It drove the toggle
   * with `.click()`, which is the path that worked, and never pressed the key,
   * which is the path a person uses. `positron-verify`'s rule is to measure the
   * quantity in question; this measured one next to it.
   * ⚠️ ONE FUNCTION, TWO LISTENERS. The alternative was a second copy of the
   * rewind behind the key, and two copies of one decision is how they come to
   * disagree.
   * ⚠️ AND THE KEY LISTENER IS ADDED AFTER THE BAR'S, so it runs after the bar
   * has decided what the press meant, and it asks the transport what state it
   * ended in rather than assuming the press toggled it.
   */
````

<a id="tom-42"></a>
## tom-42: demo/tom/index.html, inline script, line 670

````js
  // ⚠️ THE PAGE NEVER RE-PUBLISHES `__demo.transport`. `createTransportBar`
  // returns a WRAPPER and `publish: true` has already written its internal
  // `api`; assigning the return value over the top hands the harness an object
  // with no `position` and `verify.mjs` dies inside its own drill while the
  // page looks perfect.
````

<a id="tom-43"></a>
## tom-43: demo/tom/index.html, inline script, line 676

````js
  // ── the grid ────────────────────────────────────────────────────────────
  //
  // 🔴 A FIXED COLUMN BESIDE ONE SCROLLER, WHICH IS `panel-layout.mjs`'S WHOLE
  // CONTRACT AND NOT THIS PAGE'S ARITHMETIC. The steps scroll inside their own
  // box or the PAGE drags sideways, and `overflow-x` cannot shrink a flex item
  // below its content, so it takes `min-width: 0` on the same element. That
  // pair was measured on this project once as 141 px of page overflow.
  // ⚠️ THE MEASUREMENT THAT BOUGHT IT IS DATED AND IS NOT A DESCRIPTION OF THIS
  // GRID TODAY. It was sixty four steps at about 1,150 px against a 390 px
  // phone; it has been sixteen steps since 2026-09-21 and they fit, which the
  // scroll assert below states at length. What the page promises is that when
  // they DO overflow the strip takes it, and that is true at any count.
  // ⚠️ `flow: false`: the scroller's own child is the content. The flow carries
  // `gap: var(--panel-gap)` at 16 px, and this grid's vertical rhythm is 2 px,
  // which has to match the name column beside it exactly.
````

<a id="tom-44"></a>
## tom-44: demo/tom/index.html, inline script, line 691

````js
  /* 🔴 THE CASE IS KEPT AND ITS EDGE IS NOT, WHICH IS THE WHOLE REASON THIS
     NESTS CLEANLY. `cased: true` is what supplies `--panel-pad: 20px`, so the
     label column and the steps keep the inset they have always had, from the
     component rather than from a number typed here. The BORDER and the radius
     come off by themselves: `.panel-case` reads `--edge` and `--r`, the glue
     sets both to 0 on its own children, and a custom property inherits, so the
     case goes flat inside a row without one `.pos-glue > .panel` patch. That is
     the rule `positron-compose` states as a prohibition: a new surface reads
     the three tokens or it is not a surface of this kit, and a patch that
     strips a border may not be written.
     ⚠️ THE PLATE IS NOT THE PANEL'S ANY MORE. It is the instrument panel's foot
     below, which is where the sketch that bought that component puts it. */
````

<a id="tom-45"></a>
## tom-45: demo/tom/index.html, inline script, line 706

````js
    /**
     * ⚠️ THE SCROLLER TAKES NO TAB STOP, WHICH IS A DEPARTURE FROM WHAT THE
     * COMPONENT OFFERS AND HAS A REASON. `transport-bar.mjs` binds the project's
     * one keyboard table on `window` and the arrows SEEK there, with a
     * `preventDefault` on them, so a focusable scroll container here would
     * answer an arrow by moving the playhead instead of scrolling, which is a
     * control that looks live and does something else. The ruler carries the
     * tab stop, where an arrow seeking is exactly right.
     */
````

<a id="tom-46"></a>
## tom-46: demo/tom/index.html, inline script, line 717

````js
  /**
   * 🔴 THE GRID IS A KIT COMPONENT SINCE 2026-09-22, ASKED FOR AS *"use a
   * standard pad grid component from tom, make it universal and add to kit"*.
   * ⚠️ IT IS `createStepGrid` AND NOT `createPadGrid`, because `pad.mjs`
   * already exports one of those and it is a different component: a grid of the
   * hardware PAD control, which `/circuit/` and `/evo/` both use for a keypad.
   * Two components answering to one name in one kit is the drift `/kit/` exists
   * to catch.
   * `/pack/` grew a second hand-rolled grid the day after this page shipped,
   * 16 steps by 6 slots against this one's 16 by 64, which is `positron-ui`'s
   * own definition of a component that has not been noticed yet.
   *
   * 🔴 WHAT WENT INTO `step-grid.mjs` IS EVERY DECISION, NOT JUST THE MARKUP.
   * Five separate edges were asked off this grid, each one reported on its own:
   * the playhead cursor, the highlight border, the pad hover, the focus ring
   * and the pads' own outline. All five are absences, and an absence is exactly
   * what a rewrite puts back, so the reports travelled with the rules rather
   * than being summarised into a line saying the grid has no borders.
   *
   * ⚠️ WHAT STAYS ON THIS PAGE IS THE SOUND AND THE TRANSPORT. The component
   * has no `AudioContext` in it and no deck: this page decides what a step
   * costs, which row can be heard, and where the playhead is. That is the same
   * split `looper.mjs` and `board.mjs` already use, and it is what lets
   * `/pack/`, which has no tempo to claim, use the same grid with no play
   * button at all.
   *
   * ⚠️ AND THIS PAGE ASKS FOR NO `rate`, SO `grid.clock` IS `null`. The
   * component can run its own clock for a page that has nothing else, and this
   * page has a real transport with a score behind it. Two heads would argue.
   */
````

<a id="tom-47"></a>
## tom-47: demo/tom/index.html, inline script, line 766

````js
    /**
     * ⚠️ A PRESS MAKES A SOUND AND A PAGE SETTING A CELL DOES NOT, which is
     * what `why` is for. Hearing what you just switched on is how a pattern
     * gets built, and hearing sixty four cells because a pack just landed is
     * not. `stroke` is a pad dragged across under a held pointer.
     */
````

<a id="tom-48"></a>
## tom-48: demo/tom/index.html, inline script, line 773

````js
      /* `draw` since 2026-09-22, when `stroke` was reported as this file's
         private word appearing in a readout a visitor reads. Both names are
         listed for one release rather than swapped, because a page that stops
         firing on a drag is silent rather than red. */
````

<a id="tom-49"></a>
## tom-49: demo/tom/index.html, inline script, line 783

````js
  /**
   * ⚠️ EMPTY AT REST AND RESERVED, NOT AN INSTRUCTION. A gutter carries what it
   * MEASURED and never what to press; what to press is the control's own label.
   * `min-height` keeps the room so the block below does not move when the first
   * sound names itself here, and the element paints no border, so an empty one
   * is space rather than a rule nobody wrote.
   */
````

<a id="tom-50"></a>
## tom-50: demo/tom/index.html, inline script, line 794

````js
  /**
   * 🔴 THE TRANSPORT, THE GRID AND THE NAMEPLATE ARE ONE OBJECT SINCE
   * 2026-09-28, ASKED FOR AS *"tom: apply instrument panel"*. They were three
   * blocks a page gap apart, and gluing them is a CLAIM that they are one
   * thing, which is exactly true here: the bar drives the grid, the grid is the
   * bar's own position surface, and the plate is what the two of them are
   * called. `createGlue`'s own header names a strip sitting on the transport
   * bar that drives it as the pair the look was invented for.
   *
   * 🔴 AND THE ORDER IS THE COMPONENT'S, NOT THIS PAGE'S. `addRow` and the
   * `rows` list both insert above the keyboard and the foot however late they
   * are called, so the plate cannot end up anywhere but the bottom. The
   * transport above the grid is the standing ask (*"a 8x64 grid with transport
   * on top"*) and it is the order these two rows are written in.
   *
   * ⚠️ `pad: false` ON BOTH ROWS, AND THAT IS NOT A LOOK, IT IS WHAT MAKES A
   * CHILD TAKE ITS ROW. `.pos-rows-r[data-pad="off"] > :only-child` is
   * `flex: 1 1 auto; min-width: 0`; a padded row's only child is `flex: 0 1
   * auto`, so the bar would have shrunk to the width of its own controls and
   * the tempo would have sat beside them instead of at the far end. Each part
   * then carries its own inset, which is how every other glued bar in this
   * repository already reads: the bar's 8 px and the case's 20.
   *
   * ⚠️ `full: true`, BECAUSE THIS INSTRUMENT IS NOT ITS OWN SIZE. `.pos-rows`
   * is `width: fit-content` by default, which is right for four knobs on a
   * pedal and wrong for a sixteen step grid whose pads are measured off the
   * width they are given. A surface sized by its content, holding content sized
   * by its surface, has nothing to settle on.
   *
   * 🔴 THE MAKER CAME OFF 2026-09-22, ASKED FOR AS *"rm positron from plai and
   * tom nameplates"*, and `place: 'end'` is what keeps the one line that is
   * left at the right-hand end. `ends` is `space-between`, which parks a lone
   * child on the LEFT, and `panel-layout.mjs` records `/twelve/` being reported
   * for exactly that. The plate has moved from the case's top right corner to
   * the foot, which is the panel's own arrangement, and nothing about which end
   * it sits at was asked to change.
   * ⚠️ TYPED UPPERCASE THOUGH THE RULE UPPERCASES IT ANYWAY, so the source
   * reads like the page. Same rule `/kit/` states about its own headings.
   */
````

<a id="tom-51"></a>
## tom-51: demo/tom/index.html, inline script, line 840

````js
  /**
   * 🔴 THE PLAY STATE COMES OFF THE TRANSPORT'S OWN LISTENER, AND MY FIRST TRY
   * WAS A DEAD OPTION. I passed `onState` to `createDeck`, which takes no such
   * option, so it was accepted, ignored and never called: the column stayed dim
   * forever and the source read as correct. That is this project's most
   * expensive shape, a guard that does nothing while looking like it does, and
   * the only reason it was caught is that the assert below reads the COMPUTED
   * colour in both states rather than trusting the attribute.
   * ⚠️ `deck.transport.onState` IS THE REAL HOOK and it hands back an
   * unsubscribe. A page that inferred playing from positions arriving would
   * call a paused deck playing for one more frame and a seeking one playing
   * forever, which is reading the event next to the state instead of the state.
   * 🔴 AND IT SUBSCRIBES HERE RATHER THAN BESIDE THE DECK, BECAUSE IT FIRES
   * IMMEDIATELY. Placed next to `createDeck` it ran while `rowsEl` and
   * `rulerEl` were still in their temporal dead zone, and the page said so:
   * `Cannot access 'rowsEl' before initialization`, twice, in its own log. A
   * `const` shadows its whole block from the top, which this project has
   * already paid for once when seven asserts went silent on it.
   */
````

<a id="tom-52"></a>
## tom-52: demo/tom/index.html, inline script, line 859

````js
  /**
   * 🔴 THE WRAP HAPPENS ON THE STATE CHANGE, NOT ON A POSITION, AND THAT WAS
   * THE SECOND THING WRONG WITH IT. `onPosition` STOPS FIRING once the deck
   * pauses, so a wrap hung off it could never see the end: the end stop pauses
   * at the top of the range and the last position callback arrives before it.
   * MEASURED by driving the page twice, both times `... 1824 2000 2000 2000`
   * and never a wrap.
   * ⚠️ A PAUSE AND THE END OF A LAP LOOK IDENTICAL FROM HERE, and the playhead
   * is what tells them apart: stopped within one step of the top is the end
   * stop, stopped anywhere else is somebody pressing pause. One STEP of slack
   * rather than one millisecond, because the pause lands wherever the tick
   * granularity puts it and `SPAN - 1` was too tight to catch it.
   */
````

<a id="tom-53"></a>
## tom-53: demo/tom/index.html, inline script, line 872

````js
  /**
   * 🔴 `onState` FIRES ONCE AT LOAD AND NEVER ON PLAY, WHICH IS WHY THREE
   * ATTEMPTS AT LOOPING FAILED. I hung an `armed` flag off it, so the flag was
   * false for the life of the page and the wrap returned early every lap.
   * TRACED with this page's own log, read back through `demo/read-log.mjs`:
   *     TRACE state playing=false pos=0 armed=false     (2.52 s, once)
   *     TRACE wrapAt pos=1876 armed=false               (every frame after)
   * Two traces, and between them they said the whole thing. Nothing about the
   * transport was wrong; my flag was never set.
   * ✅ AND THE FLAG WAS NEVER NEEDED. `onPosition` fires ONLY WHILE PLAYING, so
   * any call to `wrapAt` is already proof that it is playing. The simplest
   * thing that could work was there the whole time, behind a guard I added for
   * a case that cannot happen.
   * ⚠️ THE STATE LISTENER STAYS FOR THE ONE THING IT DOES DO: the parked column
   * is dim and the playing one is bright, and that is a paint rather than a
   * decision.
   */
````

<a id="tom-54"></a>
## tom-54: demo/tom/index.html, inline script, line 891

````js
  /**
   * Put the head on the step the position is in.
   *
   * 🔴 THE PICTURE IS THE COMPONENT'S AND THE ARITHMETIC IS THIS PAGE'S, which
   * is the whole split. `stepAt` divides a POSITION by a step length, and only
   * this page knows what a step is worth in milliseconds, because only this
   * page has a tempo to claim. `at()` moves nothing unless the step really
   * changed, so at 120 beats a minute it touches the DOM eight times a second
   * rather than sixty.
   */
````

<a id="tom-55"></a>
## tom-55: demo/tom/index.html, inline script, line 905

````js
  // ── pressing things ─────────────────────────────────────────────────────
  //
  // 🔴 THE STROKE, THE ROVING TAB STOP, THE RULER SEEK AND THE KEYBOARD ALL
  // LEFT THIS FILE ON 2026-09-22 and are in `step-grid.mjs`. Every one of them
  // is true of any grid of pads: hold and draw with one value for the whole
  // stroke, one tab stop rather than 1,024, an arrow that moves and must not
  // reach the transport, space prevented so the bar's own key still plays, and
  // a tap on the ruler that seeks while a swipe still scrolls.
  // ⚠️ WHAT STAYS IS WHAT THEY COST HERE, which is sound, and it arrives
  // through `onToggle` and `onSeek` where the component was built.
````

<a id="tom-56"></a>
## tom-56: demo/tom/index.html, inline script, line 918

````js
  /**
   * 🔴 ON A PRESS OR ON A STEP, AND NEVER ON A VISIT. Sixty four WAVs through an
   * `AudioContext` at load is the load-on-a-visit defect this project has paid
   * for three times. Nothing is decoded until the row it belongs to is about to
   * be heard, and the buffer is kept afterwards.
   * ⚠️ AND SOUND NEVER GATES THE WORK. `AudioContext.resume()` waits on a
   * gesture in a real browser and does NOT reject, so awaiting one is a hang
   * rather than an error. It is fired and left.
   */
````

<a id="tom-57"></a>
## tom-57: demo/tom/index.html, inline script, line 932

````js
        // 🔴 THE AUDIO COMES OUT OF `circuit-sample.mjs` AND NOT OUT OF
        // `decodeAudioData`. The browser's decoder is a promise, it accepts what
        // it feels like accepting, and it can say nothing about a file it
        // refuses beyond an `EncodingError`. `toMono` answers in words, and
        // because it is SYNCHRONOUS a check can grade a press rather than
        // racing a decode.
````

<a id="tom-58"></a>
## tom-58: demo/tom/index.html, inline script, line 940

````js
        // 🔴 AN EMPTY SLOT IS A ROW, AND `createBuffer(1, 0, rate)` THROWS. A
        // pack's 64 WAVs are all sound, so this case could not arise until a
        // bulk transfer opened: `Roland Classics.syx` is 48 filled slots and 16
        // empty, and an empty one must read as empty rather than as the page
        // saying `no sound here` about a DOMException.
````

<a id="tom-59"></a>
## tom-59: demo/tom/index.html, inline script, line 958

````js
        // ⚠️ THE FIRST SOUND IS THE ONLY ONE THAT CAN PAY THIS, because it is
        // the press that builds the context. Every other row is decoded here
        // and out of the firing path for good.
````

<a id="tom-60"></a>
## tom-60: demo/tom/index.html, inline script, line 969

````js
      // ⚠️ ON A PRESS AND NEVER ON A STEP. Eight lines of prose a second is the
      // live caption `grain-scope` was reported for, and a fixed box only stops
      // it moving the page: it does not make it readable.
````

<a id="tom-61"></a>
## tom-61: demo/tom/index.html, inline script, line 992

````js
    // ⚠️ `lit` IS A COLOUR AND NEVER A BOX, which is the component's own note:
    // hearing a row is not selecting it, and a filled box behind the number
    // stayed saying *this one is chosen* about a sound that had finished.
````

<a id="tom-62"></a>
## tom-62: demo/tom/index.html, inline script, line 1000

````js
  /**
   * 🔴 A PACK THAT ARRIVES STARTS THE TRANSPORT, ASKED FOR 2026-09-25 AS
   * *"autoplay when i upload saple pack"* and confirmed as a REQUEST rather
   * than a report that it already does this.
   * 🔴 AND IT IS INSIDE THE STANDING RULE RATHER THAN AN EXCEPTION TO IT. *"A
   * visit, a step and a scrub must open nothing"* is about a VISIT. This runs
   * only from `drop.mjs`'s `onOpen`, which fires after a person has dragged a
   * file onto the page or picked one out of the operating system's dialog, so
   * what starts here is a consequence of a gesture somebody made. **A visit
   * still opens nothing and still makes no sound**, and the assert that says so
   * runs before any of this and is unchanged.
   * 🔴 SO IT IS HERE AND NOT IN `openPack`, WHICH IS THE LOAD-BEARING HALF.
   * `openPack` is also called by the reading checks with `?pack=<url>`, by
   * `openZip` once per pack inside an archive, and by anything that reads bytes
   * from somewhere other than a person's hand. Starting a transport in there
   * would mean the page began playing because a HARNESS read a file, which is
   * the load-on-a-visit defect arriving through the back door, and it would
   * take the audition check red on its own `deck.playing() === false`.
   * ⚠️ ONLY WHERE SOMETHING OPENED. `openPack`, `openStream` and `openZip` all
   * answer `true` or `false`, so a file that was refused leaves the transport
   * where it was: there is nothing to play, and a page that started running
   * after saying *"holds no samples"* would be saying two things at once.
   * ⚠️ AND IT SEEKS TO 0 FIRST, so the first thing heard is the first step of
   * the pattern rather than wherever the playhead was left. That is the same
   * move `rewindIfStopped` already makes on the toggle.
   * ⚠️ WHAT PLAYS ON A GRID WITH NOTHING ON IT IS SILENCE, AND THAT IS THE
   * INTENDED READING OF THE ASK. The pattern survives a pack arriving and an
   * empty one stays empty, so this is the sequencer being put in motion rather
   * than a sound being triggered: a reader who then taps a cell hears it on the
   * next lap without having to find the play button first. `wrapAt` keeps it
   * looping. Nothing is asked of anybody's server and no sound is made until a
   * cell is on.
   */
````

<a id="tom-63"></a>
## tom-63: demo/tom/index.html, inline script, line 1047

````js
  /**
   * 🔴 THE SAMPLES COME OUT OF `circuit-sample.mjs` AND NOT OUT OF A LOOP ON
   * THIS PAGE. Asked for as *"use shared code to get samples"*. `samplesIn`
   * takes the entry list `readZip` returns rather than the bytes, so a page
   * wanting patches out of the same file does not unzip it twice, and it sorts
   * by the NUMBER in a name rather than by the name as text, because
   * `sample_10.wav` sorts before `sample_2.wav` and the pack's own index names
   * `Sample1` to `Sample64` against `sample_0.wav` to `sample_63.wav` in order.
   * ⚠️ A FILE THAT WILL NOT PARSE KEEPS ITS ROW, with `row.ok === false` and a
   * reason. A reader that silently dropped one leaves a pack looking smaller
   * than it is, which is a wrong answer wearing an empty one's clothes.
   */
````

<a id="tom-64"></a>
## tom-64: demo/tom/index.html, inline script, line 1059

````js
  /**
   * 🔴 ONE LINE READING BYTE 0, AND IT IS THE DIFFERENCE BETWEEN FOUR FILES IN
   * THE ARCHIVE DOWNLOAD OPENING AND FOUR FILES BEING REFUSED. `50 4b` is a zip
   * and `f0` is a bulk SysEx transfer, and this page used to hand both to
   * `readZip()` and report *"did not read as a pack"* about the second.
   * `research/dump-samples-2026-09-21.md` measured eleven `.circuitpack` files
   * in that download that are not zips, carrying 64 samples each.
   * ⚠️ AND THE THIRD ANSWER IS NOT A ZIP EITHER. One archive in that directory
   * is a Windows executable and another a Nintendo DS ROM, and a router with two
   * branches has to put them somewhere.
   */
````

<a id="tom-65"></a>
## tom-65: demo/tom/index.html, inline script, line 1070

````js
  /* The three openers are `sample-loader.mjs`'s since 2026-10-12, lifted out of
     this page word for word in what they say, so /drums/samples/ reads
     a dropped pack exactly as this page does. What stays here is what this page
     does with the samples: `setRows`. */
````

<a id="tom-66"></a>
## tom-66: demo/tom/index.html, inline script, line 1087

````js
  /**
   * A real download is a zip of packs rather than a pack. MEASURED on the
   * soundbank in `purchased/`: one archive holding 2 `.circuitpack`, 1
   * `.circuittrackspack`, 128 `.syx` and a spreadsheet. `unzip.mjs` reads a zip
   * inside a zip, which is how both of those were measured.
   * ⚠️ A `.circuittrackspack` IS FOR THE OTHER INSTRUMENT and is named rather
   * than opened.
   * ⚠️ AND A ZIP HOLDING ONE BIG `.syx` IS THE OTHER HALF OF THE SAME ASK.
   * `Roland_Classics.zip` and `drum_and_synth_samples.zip` each hold a single
   * 6,753,638 byte sample transfer and no pack at all, and this page used to
   * answer *"holds no Circuit pack"* about both. A loose 350 byte patch is not
   * one of these and is left alone.
   */
````

<a id="tom-67"></a>
## tom-67: demo/tom/index.html, inline script, line 1108

````js
  /**
   * 🔴 THE PATTERN SURVIVES THE PACK. A reader can tap eight rows of steps
   * before anything is open and then give them sounds, and throwing that away
   * because the row count changed would be the page discarding the only work
   * the reader has done. Rows that still exist keep their steps; rows that
   * arrive start empty.
   */
````

<a id="tom-68"></a>
## tom-68: demo/tom/index.html, inline script, line 1115

````js
  /**
   * 🔴 EVERY SAMPLE IS DECODED WHEN THE PACK OPENS, NOT WHEN A STEP FIRES.
   * Reported 2026-09-21 with the readout showing **22.6 ms late**: *"lot of
   * late. when i put pads in and then get samples, not good timing"*, and the
   * second half of that sentence is the diagnosis. `fire()` decoded a row's
   * WAV the first time that row sounded, so the FIRST hit of every sample paid
   * `toMono` plus a `createBuffer` plus a `copyToChannel` on the firing path,
   * inside the window the readout measures. A pattern with eight rows in it
   * paid it eight times, once each, exactly while somebody was listening to
   * whether the timing was any good.
   * ⚠️ IT IS ON THE OPEN, WHICH IS A PRESS, NOT ON A VISIT. Decoding 64 WAVs
   * because somebody loaded the page is the load-on-a-visit defect this project
   * has paid for three times. Opening a pack is a person asking for this.
   * ⚠️ AND IT DOES NOT MAKE THE CONTEXT. `AudioContext` is still built on the
   * first sound, so a visit still makes none and the page's own check still
   * asserts that.
   * ⚖️ THIS IS THE CHEAP HALF OF THE TIMING AND NOT ALL OF IT. The lane here is
   * TIMER fired rather than sample accurate, which is worth single digit
   * milliseconds and is a separate change: `createAudioLane` became usable only
   * this evening, when its loop defect was fixed.
   */
````

<a id="tom-69"></a>
## tom-69: demo/tom/index.html, inline script, line 1152

````js
    // 🔴 THE PATTERN SURVIVES THE PACK ARRIVING, and it is the component that
    // keeps it now: `setRows` carries every pad that still has a row. There is
    // an assert on exactly that, because somebody typing a pattern before
    // opening a file must not lose it.
````

<a id="tom-70"></a>
## tom-70: demo/tom/index.html, inline script, line 1160

````js
    // ⚠️ AFTER THE GRID, so the picture is on screen before the decoding
    // starts, and only if a context already exists: making one here would be
    // the page opening an audio device nobody asked it to.
````

<a id="tom-71"></a>
## tom-71: demo/tom/index.html, inline script, line 1195

````js
  /**
   * 🔴 THE HARNESS'S ONLY HANDLE, AND THE TRAP IS THAT THE TWO OBJECTS LOOK
   * ALIKE. `createTransportBar` publishes its internal `api` and RETURNS a
   * wrapper; a page that assigns the return value over the top hands
   * `verify.mjs` an object with no `position`, and the harness then dies inside
   * its own drill while the page looks perfect.
   */
````

<a id="tom-72"></a>
## tom-72: demo/tom/index.html, inline script, line 1207

````js
  /**
   * 🔴 THE COMPUTED VALUE, BECAUSE THE ELEMENT IS THERE EITHER WAY. This assert
   * read `!bar.el.querySelector('.tbar-scrub')` first and went red on a page
   * doing exactly what it promises: `transport-bar.mjs` appends its slider
   * UNCONDITIONALLY at line 540 and `scrub: false` sets `data-scrub="0"`, which
   * `shell.css` turns into `display: none`. Asking whether the node exists is
   * asking a question next to the one in question, which is the measurement
   * mistake this project has now made on three separate pages.
   */
````

<a id="tom-73"></a>
## tom-73: demo/tom/index.html, inline script, line 1226

````js
  /**
   * 🔴 THE ARRANGEMENT IS READ OFF THE DOM, NOT OFF THE CALL. `shape()` walks
   * the rendered children and reports each one's kind, which is the component's
   * own answer to the difference between what a module remembers and what a
   * browser draws, and this project has been caught believing the first one:
   * `/pack/`'s heading assert read a PROPERTY and passed every run while three
   * headings were on screen.
   * ⚠️ THE ORDER IS THE CLAIM. The transport is above the grid because that is
   * what was asked for, and the plate is at the foot because the panel puts it
   * there whatever order a caller writes.
   */
````

<a id="tom-74"></a>
## tom-74: demo/tom/index.html, inline script, line 1243

````js
  /**
   * 🔴 ONE EDGE PER OBJECT, MEASURED RATHER THAN READ. The grid still lives in a
   * `.panel-case`, which paints `border: var(--edge)` and `border-radius:
   * var(--r)` of its own; inside a glued row both tokens are 0 and a custom
   * property inherits, so the case goes flat with no page rule and no
   * `.pos-glue > .panel` patch anywhere. That inheritance is the whole reason
   * this nests, and a stylesheet change that broke it would leave a card drawn
   * inside a card with every line of both files reading as correct.
   * ⚠️ AND THE SURFACE STILL HAS ITS OWN, which is the half a single check
   * would miss: a border that has gone everywhere is not one border, it is
   * none.
   */
````

<a id="tom-75"></a>
## tom-75: demo/tom/index.html, inline script, line 1265

````js
  /**
   * 🔴 THREE ALIGNMENTS THAT LOOK LIKE ONE ARE THREE ASSERTS. `/twelve/` was
   * corrected by screenshot twelve times in one evening and the pattern is that
   * two of three line up while the third is 30 px out. The name column and the
   * steps are separate flex children of the panel, so nothing in the browser
   * makes them agree: they agree because both sides are built from one token.
   */
````

<a id="tom-76"></a>
## tom-76: demo/tom/index.html, inline script, line 1285

````js
  /**
   * 🔴 THE GUTTER'S LEFT INSET IS A CLAIM ABOUT THE ROW ABOVE IT, SO IT IS READ
   * AGAINST THAT ROW AND NEVER AGAINST A NUMBER. The column hangs out of the
   * card's inset by `calc(var(--ctl-gap) - var(--panel-pad))`, and what that
   * expression is FOR is landing it on the transport bar's own content inset.
   * Two tokens standing in for one distance is this project's most repeated
   * defect, and the published cure is to write the assert that requires them to
   * agree. If `--ctl-gap` moves, or the bar's 8 px does, this goes red rather
   * than the gutter quietly drifting back out.
   * ⚠️ THE BAR'S FIRST CONTROL, NOT THE BAR. `.tbar` is full width inside the
   * glue and its left edge is the object's; the inset being compared is where
   * its play button starts, which is the thing sitting directly above these
   * numbers on screen.
   * ⚠️ AND IT IS THE BOX, NOT THE INK. The ink assert below is what grades what
   * a reader can READ in this column; this one grades where the column sits,
   * and the two are separate because a column can be perfectly placed and still
   * clipped, which is exactly how 2026-09-25 happened.
   */
````

<a id="tom-77"></a>
## tom-77: demo/tom/index.html, inline script, line 1313

````js
  /**
   * 🔴 THE GUTTER'S NUMBERS ARE READ, AND NOTHING READ THEM UNTIL 2026-09-25.
   * Reported as *"you lost 2-digin numbers from tom demo"* against a screenshot
   * that ALSO showed the page fully green, which is this project's worst shape
   * arriving in its cheapest form: every row in the column existed, every one
   * was at the right height, every `textContent` was the whole number, and all
   * four of the asserts above were true while a reader could see `5` where `52`
   * belongs. The three alignment checks measure where a label IS and none of
   * them measures whether it can be READ.
   * 🔴 SO IT IS THE RENDERED BOX AGAINST THE INK, WHICH IS WHAT TELLS A CLIP
   * FROM A TRUNCATION. A `slice` shortens `textContent` and a narrow box does
   * not, so a check reading only the text would have been green on the defect
   * that was reported, and a check reading only the width would be green on the
   * other one. Both are read here: the text is compared with what the column
   * shows of it.
   * ⚠️ THE INK IS MEASURED IN THE LABEL'S OWN FONT rather than counted in
   * characters, because `tabular-nums` and the mono face are what make two
   * digits 12.04 px wide and a rule that counted characters would be a
   * different number on the next stylesheet.
   * ⚠️ AND THE `font` SHORTHAND DOES NOT SERIALISE HERE. `getComputedStyle`
   * returns `""` for it on an element carrying `font-variant-numeric`, MEASURED
   * on this page, so `ctx.font` is built from the longhands. A canvas font
   * string that fails to parse is IGNORED SILENTLY and measures the 10 px
   * default instead, which is `xy-pad.mjs`'s own recorded trap and would make
   * this assert pass on a clipped column.
   * ⚠️ EVERY ROW, NOT THE WIDEST ONE. 0 to 9 fit a box that cuts 52 in half, so
   * a check on one label grades whichever label it picked.
   */
````

<a id="tom-78"></a>
## tom-78: demo/tom/index.html, inline script, line 1362

````js
    /**
     * 🔴 AND THE RULE DOWN THE MIDDLE IS THE SAME REGRESSION'S OTHER HALF, SO
     * IT IS ITS OWN ASSERT. Asked for once as *"rm divider vert line next to
     * pads"*: the numbers and the pads are one grid rather than two panels, and
     * a line between them says otherwise. The padding and the border arrive
     * from the same losing rule, and they can be repaired one without the
     * other, so a single check would report the divider being back as a digit
     * problem or miss it entirely.
     */
````

<a id="tom-79"></a>
## tom-79: demo/tom/index.html, inline script, line 1378

````js
  /**
   * 🔴 THE STEPS SCROLL AND THE PAGE DOES NOT. `overflow-x` cannot shrink a flex
   * item below its content, so this is true only because the scroller also
   * carries `min-width: 0`, which is a pair `panel-layout.mjs` states as
   * contract 1 and which this project once measured as 141 px of page overflow
   * when half of it was missing.
   * ⚠️ AT WHATEVER WIDTH THE READER IS. `demo/verify.mjs` runs at 756 px with no
   * viewport override, so this assert alone says nothing about a phone. The
   * 390 px reading is in the report that shipped with the page.
   */
````

<a id="tom-80"></a>
## tom-80: demo/tom/index.html, inline script, line 1388

````js
  /**
   * 🔴 THIS ASSERT REQUIRED THE CONTENT TO OVERFLOW AND WENT RED WHEN IT
   * STOPPED. At sixty four steps the strip held about 1,150 px of content in
   * 522 and the check read `scrollWidth > clientWidth`; at sixteen it holds 522
   * in 522, and the assert failed on a layout that had just got BETTER.
   * ⚠️ IT WAS MEASURING THE CORPUS RATHER THAN THE PAGE. Whether the steps
   * happen to overflow today is a fact about the step count; what the page
   * promises is that when they DO overflow the strip takes it and the document
   * does not, and that promise is in the computed style and in `min-width`,
   * both of which are true at any count.
   * ⚠️ AND THE HALF THAT ALWAYS MATTERED IS UNCHANGED: the page must never drag
   * sideways. `overflow-x` cannot shrink a flex item below its content, so it
   * needs `min-width: 0` on the same element, and that pair was measured on
   * this project once as 141 px of page overflow.
   */
````

<a id="tom-81"></a>
## tom-81: demo/tom/index.html, inline script, line 1406

````js
    /**
   * 🔴 THE PATTERN WRAPS AND SOUNDS AGAIN, WHICH IS THE ONE THING THIS PAGE
   * COULD NOT DO UNTIL `timeline/transport.mjs` WAS FIXED THIS EVENING. A
   * committed node's `onended` set its status to `rendered`, nothing reset it,
   * and every step that had SOUNDED was silent on lap two. MEASURED on the
   * audio thread: 4 heard on lap one, 0 on lap two.
   * ⚠️ SO THIS ASSERT GRADES THAT FIX FROM THE PAGE SIDE, and it counts what
   * the lane ACTUATED rather than what the deck queued. A count on the wrong
   * side of that boundary is this project's standing lesson: `createMidiLane`'s
   * `scheduled()` read identically to delivery while every note was being
   * scheduled fifty six years out.
   * ⚠️ IT SEEKS RATHER THAN WAITING TWO SECONDS OF WALL TIME. A check that sat
   * through two real laps would be eight seconds of a harness run, and the wrap
   * it is grading is a backward seek either way.
   */
````

<a id="tom-82"></a>
## tom-82: demo/tom/index.html, inline script, line 1447

````js
  /**
   * 🔴 A STROKE PAINTS EVERY PAD IT CROSSES, AND ONE VALUE FOR THE WHOLE
   * STROKE. Asked for as *"when i hold pointer down enabling pads, i should be
   * able to draw otjher pads"*. The thing that can go wrong and look right is
   * the stroke TOGGLING each pad: dragging across a run of lit pads would erase
   * them while dragging across dark ones lights them, so one gesture does two
   * opposite things depending on what it crosses.
   * ⚠️ SO THE NEGATIVE HALF IS THE HALF THAT MATTERS: the stroke starts on a
   * pad that is already ON, and every pad it crosses must end up OFF, including
   * the ones that were already off.
   * ⚠️ AND IT RELEASES, because a stroke left armed paints on the next hover
   * with nothing held down, which is a page that changes under a moving mouse.
   */
````

<a id="tom-83"></a>
## tom-83: demo/tom/index.html, inline script, line 1481

````js
    // ⚠️ `grid.get` ANSWERS A BOOLEAN, which is what the component reports and
    // what this page's own `on` array used to report as a 0 or a 1. The digits
    // are what a reader wants to see in the detail line, so they are made here
    // rather than the comparison being loosened.
````

<a id="tom-84"></a>
## tom-84: demo/tom/index.html, inline script, line 1493

````js
  /**
   * 🔴 THE STOP IS DRIVEN BY THE KEY AND NOT BY A CLICK, BECAUSE THAT IS THE
   * DIFFERENCE THAT HID THE BUG. `transport-bar.mjs`'s key table calls
   * `cmd.pause()` directly rather than pressing its own button, so the stop
   * worked under `.click()` and did nothing under the space bar, and the check
   * that only clicked reported green while the owner could not stop the page.
   * ⚠️ A REAL `keydown` ON THE WINDOW, which is where the bar listens, rather
   * than calling the page's own handler. Calling the handler would grade the
   * handler; dispatching the key grades the wiring, and the wiring was what was
   * missing.
   */
````

<a id="tom-85"></a>
## tom-85: demo/tom/index.html, inline script, line 1521

````js
  /**
   * 🔴 THE FACE SAYS WHAT THE SECOND PRESS DOES, which is the whole of
   * *"replace pause icon with stop icon"* and is the half that can go quietly
   * wrong: the behaviour changed this evening and a `❚❚` over it would have
   * been a control describing a verb it does not perform.
   * ⚠️ READ OFF WHICH ICON IS COMPUTED ON SCREEN, not off a class. Since
   * 2026-10-12 the toggle holds one icon per state and `shell.css` shows one
   * from `data-state`, so the face is whichever svg is not `display: none`.
   * A class is the page's intent; the computed display is what a reader sees,
   * and the two part company the day a stylesheet rule loses to another one.
   */
````

<a id="tom-86"></a>
## tom-86: demo/tom/index.html, inline script, line 1556

````js
  /**
   * 🔴 ONE TAB STOP FOR THE WHOLE GRID, AND THE NEGATIVE HALF IS THE ONE THAT
   * MATTERS. `table.mjs` records sixty three presses to tab past a table; a
   * grid is 4,096. Asserting only that one cell is reachable would pass on a
   * grid where every cell is.
   */
````

<a id="tom-87"></a>
## tom-87: demo/tom/index.html, inline script, line 1571

````js
  /**
   * The arithmetic, graded at both edges and past both of them. A step index
   * one past the end at the last millisecond is the bug this kind of grid
   * always has.
   */
````

<a id="tom-88"></a>
## tom-88: demo/tom/index.html, inline script, line 1587

````js
    /**
     * 🔴 NEGATIVE CONTROL: A ROW WITH NO SAMPLE LIGHTS UP AND STAYS SILENT.
     * The whole page is a grid of lit squares, so "a cell is on" is the easiest
     * thing in the world to see and says nothing about whether anything was
     * heard. This is the assert that separates them, and it goes red the moment
     * `fire()` stops checking whether a row has a sample at all.
     */
````

<a id="tom-89"></a>
## tom-89: demo/tom/index.html, inline script, line 1605

````js
    /**
     * 🔴 NEGATIVE CONTROL: AN ARROW INSIDE THE GRID MOVES FOCUS AND NOT THE
     * PLAYHEAD. `transport-bar.mjs` binds one keyboard table on `window` and
     * the arrows seek two per cent of the piece; a grid that let the event
     * through would drag the transport on every press. With the
     * `stopPropagation` removed this goes red on the position, which is what
     * makes it a measurement rather than a decoration.
     */
````

<a id="tom-90"></a>
## tom-90: demo/tom/index.html, inline script, line 1626

````js
    /**
     * 🔴 THE ONE LINE THAT READS BYTE 0, GRADED WITH NO FILE AND NO CORPUS, SO
     * IT RUNS ON THE DEPLOY TOO. Until 2026-09-21 every one of these went to
     * `readZip()` and came back *"did not read as a pack"*, which is the right
     * answer for one of the three and a refusal of 336 samples for another.
     * ⚠️ THESE ARE REFUSALS BY DESIGN AND ALL THREE MUST LEAVE THE GRID ALONE.
     * A router that reset the rows on a file it could not read would throw away
     * whatever a reader had typed, which is the defect `setRows` exists to
     * avoid, arriving by a different road.
     */
````

<a id="tom-91"></a>
## tom-91: demo/tom/index.html, inline script, line 1656

````js
      // ⚠️ THE NEGATIVE CONTROL ON THE ROUTER. A router that answered `sysex`
      // to everything would pass the middle line above, so the zip and the
      // executable are asserted to take the other two branches by NAME.
````

<a id="tom-92"></a>
## tom-92: demo/tom/index.html, inline script, line 1669

````js
      /**
       * On a deploy the pack is not published and must not be, so what is left
       * to grade is the only claim that ever mattered out there: the page asked
       * nobody for anything and the way in is the same for everybody, with no
       * branch on where it is being served from.
       */
````

<a id="tom-93"></a>
## tom-93: demo/tom/index.html, inline script, line 1690

````js
      /**
       * 🔴 THE WORK A READER DID BEFORE THE FILE ARRIVED IS STILL THERE. The
       * cell switched on in the negative control above was on row 0 of an eight
       * row grid; the grid is 64 rows now and row 0 is `sample_0.wav`. This is
       * the one assert that could only pass if `setRows` copied the pattern
       * across, and it is free because the earlier check already put it there.
       */
````

<a id="tom-94"></a>
## tom-94: demo/tom/index.html, inline script, line 1711

````js
      /**
       * 🔴 A STEP PLAYS EXACTLY THE ROWS THAT ARE ON AT IT, AND THE SOUND IS THE
       * SAMPLE'S OWN LENGTH. A buffer of the wrong length is the failure that
       * looks right: something is heard, the counter goes up, and the page reads
       * as working while the decode is off.
       */
````

<a id="tom-95"></a>
## tom-95: demo/tom/index.html, inline script, line 1732

````js
        /**
         * 🔴 NEGATIVE CONTROL: A STEP WITH NOTHING ON IT STARTS NOTHING. Without
         * this the assert above would pass on a page that played every row at
         * every step, which is the loudest possible way to be wrong and the
         * hardest to tell from working.
         */
````

<a id="tom-96"></a>
## tom-96: demo/tom/index.html, inline script, line 1747

````js
      /**
       * Pressing a row's name hears that one sample. A grid of sixty four rows
       * named `sample_0.wav` to `sample_63.wav` cannot be worked without it, and
       * it is an audition rather than a transport move: nothing about the
       * playhead may change.
       */
````

<a id="tom-97"></a>
## tom-97: demo/tom/index.html, inline script, line 1764

````js
      /**
       * 🔴 THE BAND IS WHERE THE POSITION SAYS, AND THE EXPECTED VALUE IS
       * RE-DERIVED AT READ TIME RATHER THAN REMEMBERED FROM THE SEEK. A harness
       * that seeks in the middle of this would otherwise take it red on a page
       * doing exactly what it promises.
       */
````

<a id="tom-98"></a>
## tom-98: demo/tom/index.html, inline script, line 1771

````js
        /**
         * ⚠️ THIS MEASURED A BAND'S `translateX` UNTIL 2026-09-21 AND THERE IS
         * NO BAND. The cursor was replaced by lighting the pads themselves, so
         * the quantity to read is which COLUMN is lit, and the only honest way
         * to read that is off the computed style of a real cell: the rules are
         * generated `nth-child` selectors, so an attribute on the container is
         * the page's intent and the cell's background is the result.
         * 🔴 AND IT READS TWO CELLS, NOT ONE. A check that the right cell is lit
         * passes on a grid where EVERY cell is lit, which is the loudest way to
         * be wrong and the hardest to tell from working.
         */
````

<a id="tom-99"></a>
## tom-99: demo/tom/index.html, inline script, line 1786

````js
        /**
         * 🔴 THREE CLAIMS, AND THE FIRST TRY MEASURED A QUANTITY THAT CANNOT
         * MOVE. It compared `backgroundColor` across the two states and read
         * `field 35, parked 29, playing 229`: parked came out DARKER than the
         * field, because a parked playhead changes no colour at all. It lifts
         * what is there with `filter: brightness()`, which `getComputedStyle`
         * reports under `filter` and never under `backgroundColor`. That is
         * this project's measure-the-adjacent-quantity mistake again, and the
         * page was behaving exactly as asked while the check said otherwise.
         * ✅ SO: parked LIFTS AND REPLACES NOTHING, which is what keeps a bar
         * column's own field colour.
         * 🔴 AND SINCE 2026-09-22 NEITHER DOES THE RUNNING ONE. The same
         * complaint arrived about the playing head, *"its rms cell orginial
         * color ... preseve original button hue a bit"*, so it is an inset
         * wash layered OVER the pad's colour rather than a replacement. The
         * two states are told apart by the shadow now, and the negative half
         * is the one that matters: a PARKED head must not carry that wash or
         * waiting and running look the same.
         */
````

<a id="tom-100"></a>
## tom-100: demo/tom/index.html, inline script, line 1813

````js
        /**
         * 🔴 A TRANSITIONING PROPERTY READ IN THE SAME TASK IS ITS START, NOT
         * ITS TARGET. `shell.css` gives every pad `transition: filter
         * var(--pg-fall) ease-out`, so setting `data-now` and reading
         * `getComputedStyle().filter` in the same turn reports **brightness(1)**
         * on a pad that is on its way to 1.45. This check read it that way and
         * called a working playhead a broken one.
         * ⚠️ IT IS THE SAME FAULT `demo/shell/toggle.mjs` (then `switch.mjs`,
         * deleted 2026-09-23) FOUND THE SAME DAY IN A
         * DIFFERENT PROPERTY, where a knob measured 157.4 px before a press and
         * 157.4 px in the same task after it. **Anything with a transition on
         * it has to be read after the transition**, which is what `settle`
         * waits for.
         */
````

<a id="tom-101"></a>
## tom-101: demo/tom/index.html, inline script, line 1847

````js
          /* ⚠️ THE GRID'S OWN STEP, NOT A READOUT CELL. This read
             `readout.step`, which went with the readout on 2026-09-22, so the
             clause compared `undefined` against a number and took the whole
             assert red on a page whose playhead was working. A check reading a
             CELL is a check that breaks when the page stops printing it; the
             component knows where its head is. */
````

<a id="tom-102"></a>
## tom-102: demo/tom/index.html, inline script, line 1866

````js
      /**
       * 🔴 NEGATIVE CONTROL: A SAMPLE THAT WILL NOT READ KEEPS ITS ROW AND
       * CANNOT BE PLAYED. Every one of the 64 in this pack parses, so the only
       * way to grade the refusal path is to hand the real module a file that
       * cannot. `samplesIn` is asked for it rather than the row being faked
       * here, because a fake row grades this page's idea of a refusal and not
       * the module's.
       */
````

<a id="tom-103"></a>
## tom-103: demo/tom/index.html, inline script, line 1899

````js
      /**
       * 🔴 THE ONE LINK NOTHING ELSE HERE REACHES: THE SCHEDULER REALLY WALKING
       * THE GRID. Every check above drives `fireStep` by hand, which grades the
       * grid and the sound and says nothing at all about whether the deck ever
       * calls it. `verify.mjs`'s own drill grades that the position advances,
       * which is the other half of the same sentence and not this one.
       * ⚠️ IT IS THE ONLY CHECK ON THIS PAGE THAT COSTS WALL TIME, and 420 ms
       * is three steps: the fewest that can tell a scheduler firing repeatedly
       * from one that fired once on a seek. It is safe to run here because
       * `verify.mjs` waits for `__demo.ready` before it touches the transport,
       * so this window closes before the harness presses anything.
       * ⚠️ AND IT ASSERTS THE LATENESS IS A NUMBER RATHER THAN A BOUND. A
       * threshold on a timer lane under a loaded headless Chrome is a check
       * that goes red for reasons that are nothing to do with this page; the
       * value is in the detail, which is where a reader can act on it.
       */
````

<a id="tom-104"></a>
## tom-104: demo/tom/index.html, inline script, line 1922

````js
        /* ⚠️ THE PAGE'S OWN NUMBER, NOT A READOUT CELL. The readout went on
           2026-09-22 and this read `readout.late`, which is `undefined` and
           becomes `NaN` the moment it is a Number: the assert reported
           `worst NaN ms late` on a page that was measuring correctly. The value
           is published for the check instead, which is the same number one step
           earlier in its life. */
````

<a id="tom-105"></a>
## tom-105: demo/tom/index.html, inline script, line 1938

````js
      /**
       * 🔴 A REAL BULK TRANSFER, END TO END, WHEN THE ARCHIVE DOWNLOAD IS ON
       * THIS MACHINE. `Roland_Classics.zip` holds one 6,753,638 byte `.syx` and
       * no pack at all, so this page answered *"holds no Circuit pack"* about it
       * until today. It is the best single file to drive because it is the one
       * with EMPTY SLOTS in it: 48 filled and 16 empty, which is the case the
       * owner's 64 WAVs could never produce and the case that threw a
       * `DOMException` out of `createBuffer` before `fire()` learned to check.
       * ⚠️ IT IS UNDER `tmp/`, WHICH IS GITIGNORED, so this never runs on the
       * deploy or on a fresh clone and says so rather than going quiet.
       */
````

<a id="tom-106"></a>
## tom-106: demo/tom/index.html, inline script, line 1967

````js
          // 🔴 AND AN EMPTY SLOT IS SILENT RATHER THAN AN EXCEPTION. `fire()`
          // reported `no sound here (Failed to execute 'createBuffer')` on one
          // of these, which reads as a broken page rather than as an empty slot.
````

<a id="tom-107"></a>
## tom-107: demo/tom/index.html, inline script, line 1987

````js
    /**
     * 🔴 A PACK A PERSON HANDS THE PAGE STARTS THE TRANSPORT, AND A FILE THAT
     * IS REFUSED LEAVES IT ALONE. Both halves, because a page that started
     * playing whatever it was handed would pass the first on its own, and that
     * is the loudest way to be wrong here: the reader is told the file was
     * refused while the sequencer runs.
     * 🔴 IT GOES IN THROUGH `drop.open`, WHICH IS THE PATH A DRAG TAKES. The
     * component's own comment says that is what it is for, and it matters more
     * than usual here: the whole design claim is that the transport starts from
     * the GESTURE and not from `openPack`, so a check calling `openPack` would
     * grade the opposite of what was built. The reading checks above call
     * `openPack` directly and every one of them asserts the playhead did not
     * move, which is the same claim from the other side.
     * ⚠️ LAST, AND IT PUTS EVERYTHING BACK. `drop.opens` has to be 0 for the
     * check above it, the rows have to be the ones the run was reading, and the
     * deck has to be STOPPED at 0 or `verify.mjs`'s own play drill presses the
     * toggle and pauses what this started. The harness waits for `__demo.ready`
     * before it touches the transport, so this window closes first.
     * ⚠️ THE FIXTURE IS BUILT HERE RATHER THAN FETCHED, because the pack is not
     * in this repository and must not be, and a check that only runs where
     * somebody happens to have one is a check nobody runs. It is a STORED zip
     * of 64 tiny WAVs, which is the smallest thing `readZip` and `samplesIn`
     * will both accept, and it keeps the grid at 64 rows so nothing downstream
     * sees a different shape.
     * ⚠️ WHAT IT DOES NOT GRADE: any claim about a REAL pack's audio. This
     * fixture says a pack arriving by hand starts the transport and nothing
     * else, and the reading checks above are where a real pack is measured.
     */
````

<a id="tom-108"></a>
## tom-108: demo/tom/index.html, inline script, line 2057

````js
      /* ⚠️ THE NAME IS IN THE PATTERN. The router check above leaves
         `a truncated zip did not read as a pack` in that same line, so a test
         for the phrase alone would pass without this file ever arriving, which
         is this project's substring rule in its cheapest form. */
````
