# Page comments: time

The full comments cut from the code under demo/ for time, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="time-1"></a>
## time-1: demo/time/index.html, inline script, line 36

````js
  /*
   * 🔴 FIVE OLD PAGES AS THE TABS OF ONE, decided by the owner 2026-10-04:
   * *"names ok, looper retires, no redrect, capture is fine"*. SCHEDULE was
   * `/transport/`, BEAT `/lanes/`, LOOPS `/loops/`, SCORE `/score/` and DATES
   * `/strip/` (`plans/plan-demo-structure.md` §3.2). Each tab is a module
   * beside this page; `createTabPage` builds a tab the first time it is
   * opened, gives it its own log, and runs its checks and its bar's drill.
   *
   * ⚠️ ONE PUBLISHED BAR, SCHEDULE'S, because it is the tab the page opens on
   * and the clock the other four are compared with. The other four build with
   * `publish: false` and are drilled as page asserts by `bar-drill.mjs`.
   * ⚠️ NOTHING SOUNDS OR OPENS ON LOAD OR ON A TAB'S BUILD. BEAT's sound card
   * and MIDI wait for the press in its own tab.
   */
````

<a id="time-2"></a>
## time-2: demo/time/index.html, inline script, line 61

````js
    // No `what` under the title: each tab says what it is in the box under the
    // tab row (`tab-page.mjs` rule 6), asked 2026-10-05 as *"rm top desriptions"*.
    // The manifest's `one` line still describes the page on the index.
````

<a id="time-3"></a>
## time-3: demo/time/how.mjs, module, line 1

````js
// demo/time/how.mjs: the "How it works" picture at the foot of each /time/ tab.
//
// Asked 2026-10-05: *"add how it works diagrams to all tenchilogies"*. The five
// tabs are five different mechanisms built on one deck, so each tab draws its
// own picture in its own panel, read off that tab's code.
//
// 🔴 DRAWN ON THE TAB'S FIRST SHOWING, NEVER AT BUILD. `createDiagram` measures
// its own words when it is made, and a picture made inside a closed panel is
// laid out for 320 px inside a panel twice that wide (`/kit/` paid for this
// with seven pictures at once). `tab-page.mjs` builds a tab into an open
// panel, but a tab's `show()` is also the moment its report has been added
// under its blocks, so drawing there puts the picture LAST in the tab, under
// the log, which is where `positron-diagram` says reference goes.
// ⚠️ `how: true` AND NOT `atEnd`. `atEnd` appends to `document.body`, which on
// a tabbed page is under every tab at once.
//
// ✅ THE CHECK IS ONE FUNCTION FOR ALL FIVE, so the five tabs grade their
// pictures the same four ways: drawn into this tab and last in it, laid out at
// the width it is shown at with measured type, nothing cut, and every box
// naming something the tab really runs (`facts`, each a live reading of the
// tab's own objects rather than a sentence about them).
````

<a id="time-4"></a>
## time-4: demo/time/score.mjs, module, line 1

````js
// demo/time/score.mjs: the SCORE tab of /time/, which was /score/.
//
// One file format for scores written in different languages; the line that is
// sounding lights up. The page's body moved here; the history of each decision
// is in git under `demo/score/index.html`. Its stylesheet (`.sc`) is in
// `demo/time/index.html`, because a page owns its own sheet.
//
// 🔴 THE FIVE SCORES ARE A CHOICE IN THIS TAB, NOT FIVE `.pos-controls`
// BUTTONS. The harness pressed all five on the old page and asserted nothing
// about the presses; here the check picks each one and asserts the score block
// held its twelve lines through all five, which is the thing the old page's own
// comment says the fixed height is for.
````

<a id="time-5"></a>
## time-5: demo/time/score.mjs, module, line 247

````js
  // 🔴 THE BAR AND THE STRIP ARE ONE SURFACE, and the score goes under them.
````

<a id="time-6"></a>
## time-6: demo/time/score.mjs, module, line 359

````js
  /**
   * HOW IT WORKS, read off this file, `timeline/csound.mjs` and
   * `timeline/score.mjs`: Csound text compiled into rows, a MIDI part written
   * as rows, both into one document, the document loaded into a nest of one
   * deck per part, and the deck's `actuate()` lighting the document's lines.
   */
````

<a id="time-7"></a>
## time-7: demo/time/score.mjs, module, line 406

````js
    // ⚠️ TWO FRAMES ON: a strip fitted before its panel has laid out fits its whole range into the width it had then, MEASURED on the first 1280 shot as 20 s drawn in about 160 px.
````

<a id="time-8"></a>
## time-8: demo/time/beat.mjs, module, line 1

````js
// demo/time/beat.mjs: the BEAT tab of /time/, which was /lanes/.
//
// One beat, sent several ways at once. Code has to wake up and do the work, so
// it lands within a millisecond or so; the sound card and the MIDI port are
// given the instant in advance and hit it themselves. The page's body moved
// here; the history of each decision is in git under `demo/lanes/index.html`.
//
// ⚠️ THE SOUND-CARD CHECK IS THIN AND COMES OVER AS IT IS. `audio schedule
// anchored` passes on ONE committed click, which says the lane started and not
// that it kept its promise. Strengthening it (more than one committed mark,
// and the ear's measurement asserted) is its own line in `BACKLOG.md`
// (`plans/plan-demo-structure.md` §3.2), and moving a page is not the moment.
//
// 🔴 THE HARDWARE BUTTON IS NOT IN `.pos-controls`. `createHardware` appends to
// the page's control row, which the harness presses by position across the
// whole document and which this page leaves empty and hidden. So its five nodes
// are moved into this tab's own row the moment they exist, and the check below
// presses the button itself, inside the open tab. Nothing makes a sound until
// somebody presses it.
````

<a id="time-9"></a>
## time-9: demo/time/beat.mjs, module, line 56

````js
  // ONE MEANING FOR COLOUR, ACROSS EVERY DEMO: a mark's colour says HOW IT
  // LANDED, never which lane it is in. Lane identity is the row, its label and
  // the swatch beside the label.
  //   grey        not played yet
  //   slate       played, and this lane cannot say how well
  //   green       played, inside what its way of firing promises
  //   amber/red   later than that
````

<a id="time-10"></a>
## time-10: demo/time/beat.mjs, module, line 123

````js
    // ONE TOOLTIP FOR ALL THE ROWS: this tab compares lanes at one instant.
````

<a id="time-11"></a>
## time-11: demo/time/beat.mjs, module, line 143

````js
  // 🔴 THE BAR AND THE STRIP ARE ONE SURFACE.
````

<a id="time-12"></a>
## time-12: demo/time/beat.mjs, module, line 247

````js
  /**
   * THE MIDI LOOPBACK. macOS's IAC bus returns everything sent to it.
   * ⚠️ `e.timeStamp` IS THE SEND STAMP, measured 0.000 ms five times of five, so
   * it pairs a note and must never be the number; `performance.now()` read in
   * the handler is, as an UPPER BOUND on delivery.
   */
````

<a id="time-13"></a>
## time-13: demo/time/beat.mjs, module, line 324

````js
  /**
   * HOW IT WORKS, read off this file and `timeline/transport.mjs`: one deck,
   * its own Worker-timed `code` lane, and two lanes that hand the same beats
   * over AHEAD of time to the AudioContext and to a MIDI port. The speakers
   * and the port are drawn inside the Browser, as `/fau/` and `/collide/` draw
   * their speakers, because a top level box with nothing in it beside a
   * machine is drawn as a tall empty slab.
   * ⚠️ THE MIDI HALF IS DRAWN AND NOT ALWAYS RUN. Headless Chrome has no MIDI
   * permission, so its fact below is the picker being in this tab and what it
   * said, not a note sent.
   */
````

<a id="time-14"></a>
## time-14: demo/time/beat.mjs, module, line 381

````js
    // ⚠️ TWO FRAMES ON: a strip fitted before its panel has laid out fits its whole range into the width it had then, MEASURED on the first 1280 shot as 20 s drawn in about 160 px.
````

<a id="time-15"></a>
## time-15: demo/time/beat.mjs, module, line 408

````js
      // ⚠️ THIN, AND SAID SO IN THE HEADER: one committed click passes it.
````

<a id="time-16"></a>
## time-16: demo/time/schedule.mjs, module, line 1

````js
// demo/time/schedule.mjs: the SCHEDULE tab of /time/, which was /transport/.
//
// Twenty events, one a second. Timers are set only a fraction of a second
// ahead and can still be cancelled, so pause really stops and dragging really
// skips. The whole of the old page, moved; its comments came with it where they
// are about this code, and the history of the page is in git under
// `demo/transport/index.html`.
//
// 🔴 THIS TAB'S BAR IS THE PAGE'S `__demo.transport`. Of the five bars on
// `/time/` it is the one the harness drills itself, because SCHEDULE is the
// tab the page opens on and the bar the other four exist to be compared with.
// Every other tab builds its bar with `publish: false` and lists it in `bars`.
// ⚠️ SO THIS TAB'S MEASUREMENTS ARRIVE AFTER `ready`, the way they always did:
// the harness presses play for 500 ms, the mark at 0 fires, and `report()`
// below asserts on that first row. Pressing play here inside the check pass
// would cost the page's boot a second for something the harness does anyway.
````

<a id="time-17"></a>
## time-17: demo/time/schedule.mjs, module, line 55

````js
  // LATE AGAINST WHAT? Each mark is judged against what its own way of firing
  // promises: a committed timer aims at the instant and lands within a few ms;
  // a mark the sweep caught was never given a timer and can be anywhere inside
  // the check interval. One absolute 5 ms scale painted the documented baseline
  // amber, and a scale whose normal reading is a warning has no warning left.
````

<a id="time-18"></a>
## time-18: demo/time/schedule.mjs, module, line 84

````js
      // 🔴 A LINE UNDER THE NAME FROM THE FIRST FRAME, which is what stops the
      // label block jumping 29 px up when the numbers arrive (reported
      // 2026-09-25, measured 51 then 22). The numbers replace it in place.
````

<a id="time-19"></a>
## time-19: demo/time/schedule.mjs, module, line 105

````js
  // 🔴 THE BAR AND THE STRIP ARE ONE SURFACE ("timeline demos: glue transport
  // and timelines", 2026-09-25). `createGlue` re-parents both out of `host`.
````

<a id="time-20"></a>
## time-20: demo/time/schedule.mjs, module, line 123

````js
    // On the FIRST row: the harness plays for 500 ms, which is one mark.
    // ⚠️ BEHIND THE GATE, which the old page did not have: these lines are
    // grading, and a visitor pressing play is not asking to be graded.
````

<a id="time-21"></a>
## time-21: demo/time/schedule.mjs, module, line 131

````js
    // 🔴 THE REPORTED JUMP, GRADED AGAINST THE PICTURE, two frames on because
    // `invalidate()` schedules a draw rather than making one.
````

<a id="time-22"></a>
## time-22: demo/time/schedule.mjs, module, line 170

````js
  /**
   * HOW IT WORKS, read off this file and `timeline/transport.mjs`: the bar
   * moves a deck, the deck's scheduler is woken by a Worker, arms a one-shot
   * for each event inside `HORIZON`, and the strip colours what came back.
   * Every number in it is one of the constants handed to `createDeck` above.
   */
````

<a id="time-23"></a>
## time-23: demo/time/schedule.mjs, module, line 215

````js
    // ⚠️ TWO FRAMES ON: a strip fitted before its panel has laid out fits its whole range into the width it had then, MEASURED on the first 1280 shot as 20 s drawn in about 160 px.
````

<a id="time-24"></a>
## time-24: demo/time/schedule.mjs, module, line 225

````js
      // 🔴 ONE BAR AND ONE STRIP, COUNTED FROM THE DOM RATHER THAN LOOKED AT.
      // `/stage/` carried a doubled bar through two reports because
      // `createTransportBar(parent, ...)` appends to the parent it is given.
````

<a id="time-25"></a>
## time-25: demo/time/loops.mjs, module, line 1

````js
// demo/time/loops.mjs: the LOOPS tab of /time/, which was /loops/.
//
// One two-second recording placed three times, the last of them looping twice
// in whichever direction the button shows. The page's body moved here; the
// history of each decision is in git under `demo/loops/index.html`.
//
// 🔴 THE DIRECTION CHOICE IS THIS TAB'S OWN, NOT A `.pos-controls` ONE. The
// harness pressed it by position on the old page, which is how the old page's
// count included one direction change. Here the check presses it, inside the
// open tab, and asserts what the press did.
// ⚠️ IT IS THREE WORDS NOW, NOT ONE ARROW THAT CYCLES. Reviewed 2026-10-05:
// a lone `→` under the strip said nothing to a visitor about what it turned or
// what the other faces were. A cycling glyph is right where it is glued to a
// LOOP button that already names its subject (`looper.mjs`); out here on its
// own it was a riddle, and `createChoice` shows all three directions at once.
// ⚠️ THE DRIFT CHECKS STILL RIDE THE FIRST PLAY. They need the parent's first
// mark to fire, and the bar drill `createTabPage` runs right after this tab's
// `check` presses play for 500 ms, which is that mark. So they land during the
// drill, as they landed during the harness's drill before.
````

<a id="time-26"></a>
## time-26: demo/time/loops.mjs, module, line 90

````js
  // A WRAP IS A COMMITTED ONE-SHOT, AND WITHOUT A HOST IT IS NOTHING. One host
  // for every rebuild, or each press of the button would start a worker.
````

<a id="time-27"></a>
## time-27: demo/time/loops.mjs, module, line 94

````js
  // 🔴 DECLARED BEFORE `buildNest`, which reads it: a `const` further down
  // would be read in its dead zone and throw.
````

<a id="time-28"></a>
## time-28: demo/time/loops.mjs, module, line 109

````js
      // PINGPONG IS TWO QUOTATIONS END TO END, so it has no wrap: its joint is a
      // presence exit and enter, both logged.
````

<a id="time-29"></a>
## time-29: demo/time/loops.mjs, module, line 150

````js
      // ONE SLICE PER PASS, so the loop reads as [ ][ ] rather than one bar.
      // `part` and `event` are Cubase's words: a part is placed, an event is
      // one occurrence inside it, and nothing is copied.
````

<a id="time-30"></a>
## time-30: demo/time/loops.mjs, module, line 218

````js
  // 🔴 THE BAR AND THE STRIP ARE ONE SURFACE, and the way button sits under
  // them in this tab's own row.
````

<a id="time-31"></a>
## time-31: demo/time/loops.mjs, module, line 273

````js
          // 🔴 WHERE IN THE RECORDING, BY THE EVENT'S IDENTITY, NOT BY `srcOf`.
          // `srcOf` runs a mirrored pass back through `mirror()`, the function
          // the mirrored copy was built with, so a copy that was never mirrored
          // still read as backwards and this check stayed green. MEASURED
          // 2026-10-04 by sabotaging `rewoundItems` to keep the forward
          // positions: 86/86. `payload.i` names which of the four events it is
          // whatever deck it sits in, so it is a second source.
````

<a id="time-32"></a>
## time-32: demo/time/loops.mjs, module, line 305

````js
  /**
   * HOW IT WORKS, read off this file and `timeline/nested.mjs`: a parent deck,
   * a nest quoting one child deck three times, and the mirrored second deck a
   * backwards pass quotes, because no quotation runs a child at a negative
   * rate. The Worker that commits the wrap is in the nest's note rather than a
   * box, so the chain stays one line a reader can follow.
   */
````

<a id="time-33"></a>
## time-33: demo/time/loops.mjs, module, line 348

````js
    // ⚠️ TWO FRAMES ON: a strip fitted before its panel has laid out fits its whole range into the width it had then, MEASURED on the first 1280 shot as 20 s drawn in about 160 px.
````

<a id="time-34"></a>
## time-34: demo/time/dates.mjs, module, line 1

````js
// demo/time/dates.mjs: the DATES tab of /time/, which was /strip/.
//
// Two thousand years on one line, where many of the dates are a bracket rather
// than a day. This was the SANDBOX for `timeline/strip.mjs`, and it still is:
// every thing the component can do is pointed at a fixture small enough to
// read. The history of each decision is in git under `demo/strip/index.html`.
//
// 🔴 ITS CHECKS USED TO RUN ON EVERY PRESS OF `Fit`, FOR A VISITOR TOO. They
// were cheap, and the one that moved the view was already gated, but a page
// that grades itself when a person presses a button is grading in front of
// them. `Fit` fits now, and the checks run from the page's one check pass.
// ⚠️ AND THE BAR IS GLUED TO THE STRIP, WHICH THE OLD PAGE WAS NOT. The other
// four tabs were glued on 2026-09-25 (*"timeline demos: glue transport and
// timelines"*) and this one was missed because it sat in another group. The
// bar passes `scrub: false` because the strip is its position surface, which
// is the claim gluing makes.
````

<a id="time-35"></a>
## time-35: demo/time/dates.mjs, module, line 35

````js
/** Four cells, all in calendar words (asked 2026-10-05 as *"fix time"*):
 *  the date under the playhead at the ruler's own precision, how much time is
 *  in view, the ruler's step, and how many of the dates are on screen. They
 *  were `year`, `grid`, `finest 0.004 ms` and `zoom left 7.0e13 ×`, and the
 *  last two measured the float behind the axis, which no visitor can use: at
 *  year 1100 the float allows a 256th of a millisecond, so the calendar runs
 *  out of meaning long before the number does. Those limits are still
 *  asserted, in `check`. */
````

<a id="time-36"></a>
## time-36: demo/time/dates.mjs, module, line 49

````js
  // SHAPED LIKE AN ARCHIVE: dates crowd towards the present and get vaguer
  // further back. Deterministic, so one load draws what the last one drew.
````

<a id="time-37"></a>
## time-37: demo/time/dates.mjs, module, line 73

````js
  // 🔴 OPEN ON A REAL DATE. Position 0 is 1970, where `ulpMs(0)` is the
  // smallest denormal and three of the four numbers measured the origin.
````

<a id="time-38"></a>
## time-38: demo/time/dates.mjs, module, line 88

````js
    // 🔴 FOLLOW OFF: following put the playhead at 28% and slid every dated
    // thing off the left edge before the first frame.
````

<a id="time-39"></a>
## time-39: demo/time/dates.mjs, module, line 93

````js
    // ...and ruled in real years, months and days, as a calendar is, rather
    // than in thousands of years counted from 1970 (`-1.0 ka`), which is
    // what the ms ladder printed here until 2026-10-05.
````

<a id="time-40"></a>
## time-40: demo/time/dates.mjs, module, line 101

````js
      // The mark becomes its character where the zoom has made room.
      // `gutterReserve` is the widest line each lane can show, so the gutter
      // is sized for `22 of 22` and does not narrow at `0 of 0`, which moved
      // the plot's left edge under a reader zooming in.
````

<a id="time-41"></a>
## time-41: demo/time/dates.mjs, module, line 137

````js
  // 🔴 THE PLOT CAN WIDEN AFTER THE FIT, AND THEN THE VIEW SHOWS MORE TIME THAN
  // WAS FITTED. MEASURED 2026-10-05 on the 1280 shot: fitted to 2000 years,
  // drawn as 4,862, every date in the left third, because the fit ran before
  // the panel had its final width. So a change of plot width with the view
  // otherwise untouched keeps the SPAN, not the scale. A zoom or a pan changes
  // the view and is left alone.
````

<a id="time-42"></a>
## time-42: demo/time/dates.mjs, module, line 170

````js
  /**
   * ZOOM ABOUT THE PLAYHEAD, NOT ABOUT THE MIDDLE OF THE PLOT. `zoomIn()` holds
   * the plot's centre still, which is the playhead only if nothing has moved
   * it by a pixel, and every pixel off is multiplied by each press after it.
   * MEASURED 2026-10-05: after 28 presses the view was 9 to 18 Feb 1100 with
   * the playhead on 1 Jan 1100, off the left edge. So the playhead's own x is
   * the anchor and stays where it is on screen; if it is already off screen it
   * is brought to the middle first, because zooming about a point nobody can
   * see is zooming away from it.
   */
````

<a id="time-43"></a>
## time-43: demo/time/dates.mjs, module, line 212

````js
  /**
   * HOW IT WORKS, read off this file and `timeline/strip.mjs`: dated rows, some
   * with a `when` bracket, on a deck whose positions are epoch milliseconds,
   * drawn by the strip in three lanes under a calendar ruler, and the zoom
   * buttons that move the strip's view about the playhead.
   */
````

<a id="time-44"></a>
## time-44: demo/time/dates.mjs, module, line 254

````js
    // ⚠️ TWO FRAMES ON: a strip fitted before its panel has laid out fits its whole range into the width it had then, MEASURED on the first 1280 shot as 20 s drawn in about 160 px.
````

<a id="time-45"></a>
## time-45: demo/time/dates.mjs, module, line 279

````js
      // THE STATISTIC IS READ OFF THE PICTURE: `aggregateStat` is what the
      // last frame actually drew, not a second computation beside it.
````

<a id="time-46"></a>
## time-46: demo/time/dates.mjs, module, line 286

````js
      // THE LEDGER BALANCES AT EVERY ZOOM: counted plus added-nothing is all.
````

<a id="time-47"></a>
## time-47: demo/time/dates.mjs, module, line 293

````js
      // THE RULER IS A CALENDAR: fitted, every label is a whole year on a
      // round step, the same writing the `date` cell uses. It read `-1.0 ka`
      // and `0.0 ka` beside a cell reading `1100` until 2026-10-05.
````
