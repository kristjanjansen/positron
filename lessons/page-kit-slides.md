# Page comments: kit-slides

The full comments cut from the code under demo/ for kit-slides, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="kit-slides-1"></a>
## kit-slides-1: demo/kit/slides/index.html, inline script, line 40

````js
  /**
   * 🔴 kit/slides, ONE PART OF `/kit/` ON A PAGE OF ITS OWN, 2026-10-06
   * (plans/plan-kit-split.md). Every block, holder and check below is copied
   * VERBATIM from `demo/kit/index.html`, in that file's order, so the newest
   * block is still the first. What changed is mechanical: `section()` lost its
   * first argument, the holders sit here rather than at the top of the
   * monolith, the measuring window and the tab row are gone, and every check
   * is behind `?selfcheck=1`.
   * ⚠️ THIS FILE IS `demo/kit/index.html`, MOVED WITH `git mv` SO ITS HISTORY
   * FOLLOWS IT (step 4 of the plan), and cut down to the SLIDES part.
   * ⚠️ AND IT STARTS ON A VISIT. In `/kit/` the part started when its tab was
   * pressed; on its own page the visit is the press, so `slidesOpen()` runs
   * once the blocks are built and `visibilitychange` pauses and resumes it
   * (plans/plan-kit-split.md section 9, the default taken). That includes the
   * one file it asks for, the router's screen code for the OLED slides.
   */
````

<a id="kit-slides-2"></a>
## kit-slides-2: demo/kit/slides/index.html, inline script, line 61

````js
  /* ⚠️ THE ROUTER'S STATE OBJECT, KEPT WHOLE FROM `/kit/`, because the OLED
     slides register their canvases in `hw.parts` and `hwPartsLoad` fills
     `hw.oled`, `hw.partsFetched` and `hw.partsFrom`. The board fields are
     unused on this page; the emulator is `/kit/hardware/`. */
````

<a id="kit-slides-3"></a>
## kit-slides-3: demo/kit/slides/index.html, inline script, line 85

````js
  /* 🔴 THE LINK SCREEN'S PAINT, WHICH THE OLED SLIDES DRAW WITH. In `/kit/` it
     was registered by the HARDWARE part's LINK block and the slides found it
     by name in `hw.parts`; that block is on `/kit/hardware/` now, so the same
     paint, copied verbatim from it, is registered here on a canvas nobody is
     shown, and the slides find it by the same name. */
````

<a id="kit-slides-4"></a>
## kit-slides-4: demo/kit/slides/index.html, inline script, line 106

````js
  /**
   * 🔴 SLIDES, THE NEWEST PART, 2026-10-05. Asked as *"let's focus on the kit
   * make a new tab there slides and methodically slide by slide you don't have
   * to be a slide player there it's player is maybe a first component but the
   * rest are just the slides"*, and then *"Also work on the actual components,
   * interactive elements on a page"*. `/slides/` is an archive and nothing
   * here imports it: `demo/shell/slide.mjs` renders one slide from plain data
   * and `createSlidePlayer` steps several in a video panel.
   * ⚠️ THE BLOCKS ARE IN READING ORDER, NOT NEWEST FIRST INSIDE THE PART, and
   * that is the one place this page does it: the part is a lesson that starts
   * at the largest type and walks down, then combines, then lays out, then
   * puts the kit's own controls on a slide. Every block is newer than every
   * block in every other part, so the newest-first rule is still true of the
   * PAGE: these are the first calls to `section()` in the file.
   * ⚠️ NOTHING RUNS UNTIL THE TAB IS OPENED. The video's canvas, the readout's
   * frame loop and the step grid's clock start in `slidesOpen()` and stop in
   * `slidesClose()`, which the tab row calls, the way HARDWARE boots its board.
   * Nothing in the part fetches anything but ONE file, the router's screen
   * code (`/resources/pico/oled-ui.wasm`) for the OLED slide, and that on the
   * tab press: the face is two files of this origin, every other picture is
   * drawn here, the samples are made here.
   * ⚠️ DECLARED HERE, before the first block, for the dead zone reason this
   * file gives four times over.
   */
````

<a id="kit-slides-5"></a>
## kit-slides-5: demo/kit/slides/index.html, inline script, line 165

````js
  /* THE MACHINES, for the diagram slide: box names only on the slide, and
     what each outer box is goes under it as slide text (`desc`). The relay's
     1 to 2 ms is PROGRESS.md:3472, the Durable Object hop measured +1.0, +1.6
     and +0.8 ms over three runs. */
````

<a id="kit-slides-6"></a>
## kit-slides-6: demo/kit/slides/index.html, inline script, line 185

````js
  // ── THE PLAYER ────────────────────────────────────────────────────────────
  // 🔴 THE FIRST BLOCK SINCE 2026-10-06, asked as *"rm from slides kit page.
  // Move player to top"* about the SYNTHS DECK block. The deck left this page
  // and its checks went with it to its own page, https://positron.studio/slides/synths/
  // (`demo/shell/deck-checks.mjs`), so the player is what this tab opens on.
  // 46 rows and 44 built: CLAUDE.md's count command over the manifest, run
  // 2026-10-05 for this block, printed `46 44`. Counted, never remembered.
  // 🔴 TWO SLIDES, asked 2026-10-05 as *"rm slide 3 from THE PLAYER and
  // replace slide 2 from something below"*: the transports table went, and the
  // 600/600 figure became the DIAGRAM slide from further down this tab, built a
  // second time from the same `slideDiagram(SLIDE_MACHINES)`. It can be: every
  // diagram takes its own `uid` for its arrow markers, so two on one page do not
  // share an id. It has nothing running, so the player's start and stop on a
  // step reach no loop; a slot that had one (a `{ start, stop }`) would run only
  // while its slide is the one shown, because `go()` stops the slide it leaves
  // and starts the one it shows.
````

<a id="kit-slides-7"></a>
## kit-slides-7: demo/kit/slides/index.html, inline script, line 223

````js
  // ── HALF WIDTH PLAYERS ────────────────────────────────────────────────────
  // 🔴 TWO PLAYERS SIDE BY SIDE, asked 2026-10-05: *"add 1/2 w slide palyer to
  // kit, scale accordingly. put 2 side by side"*. Nothing about a slide is
  // typed in px, so a player half as wide is the same slides at half the size:
  // every step is a share of ITS slide's height, and the inset and the rules
  // are too. The footer is the video panel's and stays at its px sizes, which
  // fit at half width (asserted). One column below 560 px of the block's own
  // width, the container query `/cam/` and `/flipper/` use, so a phone stacks
  // them; each player's keys stay on its own panel.
  // Every figure is sourced where it first appears above or below: the WHEP
  // and MoQ table PROGRESS.md:4712-4719, the clocks HANDOFF.md:133-135, the
  // refusals positron-streaming SKILL.md:228-230.
````

<a id="kit-slides-8"></a>
## kit-slides-8: demo/kit/slides/index.html, inline script, line 274

````js
  // ── NAMES FROM THE CODE IN THE WORDS ─────────────────────────────────────
  // 🔴 A NAME OUT OF A PROGRAM, IN BACKTICKS, 2026-10-06: *"var name is in
  // monospace inside text. add vars example to slides kit too"*, after *"in
  // the text use variable name with colorcoding"*. The slide's mono face
  // inside sans words, uncoloured until `hueVars(root, hueOf)` hands it a hue,
  // which the synths deck's slot does from the same book its knobs and code
  // box read. Here a book of one name, so `cutoff` is coloured and `process`,
  // which has no knob, is not. Below the players since 2026-10-06, asked as
  // *"Move player to top, move hilited word to dowwards"*.
````

<a id="kit-slides-9"></a>
## kit-slides-9: demo/kit/slides/index.html, inline script, line 298

````js
  // ── STEP 6 DOWN TO STEP 1 ─────────────────────────────────────────────────
  // One slide a step, the step alone, its three numbers in the caption from
  // `stepCaption`, which reads `SCALE`, so the words cannot disagree with the
  // type. The texts are real and sourced, each in the comment above it.
````

<a id="kit-slides-10"></a>
## kit-slides-10: demo/kit/slides/index.html, inline script, line 319

````js
  // ── THE SCALE ─────────────────────────────────────────────────────────────
  // All six on one slide. Stacked in one column they need 90.9 per cent of the
  // height in line boxes alone, against the 86 the inset leaves, so the two
  // biggest stand in the slot and the four below them in the words column:
  // a split whose slot holds slide text, which is a slot holding any element.
````

<a id="kit-slides-11"></a>
## kit-slides-11: demo/kit/slides/index.html, inline script, line 329

````js
    // ONE COLUMN, NO COLOUR, asked 2026-10-05: *"THE SCALE no col layout. just
    // all scales. no colors"*. It was a split with 6 and 5 in the slot.
````

<a id="kit-slides-12"></a>
## kit-slides-12: demo/kit/slides/index.html, inline script, line 334

````js
  // ── TITLE SLIDE ───────────────────────────────────────────────────────────
  // 🔴 THE OPENING OF A TALK, asked 2026-10-05 from the slides list as *"so
  // slide title"*. The talk's name at step 5, the speaker at step 3, the date
  // at step 2 (TITLE_STEPS in slide.mjs says why each), laid out `top`: the
  // name where every headline sits, who and when on the bottom edge. The
  // sample carries the name only since 2026-10-06, asked as *"rm Kristjan
  // Jansen 5 October 2026"*; `by` and `date` stay graded in slide-test.mjs.
````

<a id="kit-slides-13"></a>
## kit-slides-13: demo/kit/slides/index.html, inline script, line 347

````js
  // ── BIG NUMBER ────────────────────────────────────────────────────────────
  // 🔴 ONE FIGURE ALONE, asked 2026-10-05 from the slides list as *"big
  // number"*: step 6, centred, a short line under it at step 3. The figure is
  // PROGRESS.md:4712-4713, re-read for this block: the WHEP rig re-run the same
  // day as MoQ, n=17,501 over 300 s, *p50 67.0 / p95 76.9 / p99 84.1 ms*,
  // browser to Cloudflare to browser off burned pixels.
````

<a id="kit-slides-14"></a>
## kit-slides-14: demo/kit/slides/index.html, inline script, line 366

````js
    // LEFT, asked 2026-10-05: *"HEADLINE OVER TEXT align texts to left"*. A
    // sentence of evidence is read, not looked at, so it starts where the
    // headline starts rather than floating centred under it.
````

<a id="kit-slides-15"></a>
## kit-slides-15: demo/kit/slides/index.html, inline script, line 378

````js
  // ── TABLES WITH ROW LINES ─────────────────────────────────────────────────
  // Asked 2026-10-05: *"i do not see tables layout. horiz lines but try with
  // rounded corner outer border and not"*. HEADLINE OVER A TABLE above stays
  // the plain one; these two are the same component with `rows.frame`.
  // PROGRESS.md:4712-4719 again: WHEP vs MoQ, browser to Cloudflare to
  // browser off burned pixels, n=17,501 for WHEP over 300 s.
````

<a id="kit-slides-16"></a>
## kit-slides-16: demo/kit/slides/index.html, inline script, line 392

````js
  // ── LIVE LOGS ─────────────────────────────────────────────────────────────
  // Asked 2026-10-05: *"show 2col layout with live logs / live tabular logs"*.
  // Both are fed by this tab and nothing else: a timer asked to fire every
  // 250 ms reports how late it fired, and the frame loop reports this
  // screen's frames. Both start in `slidesOpen()` and stop in `slidesClose()`.
````

<a id="kit-slides-17"></a>
## kit-slides-17: demo/kit/slides/index.html, inline script, line 480

````js
  // ── LAYOUTS ───────────────────────────────────────────────────────────────
  // positron-streaming SKILL.md:228-230, a 13 point sweep of each 2 h window
  // on 2026-09-06.
````

<a id="kit-slides-18"></a>
## kit-slides-18: demo/kit/slides/index.html, inline script, line 504

````js
  /* 🔴 THE OLED, DRAWN BY THE FIRMWARE. The HARDWARE part draws every screen
     with `rig/pico/firmware/ui.c` compiled to WebAssembly. Since 2026-10-05
     (*"oled"*, the slides list's item 7) pressing SLIDES fetches that module
     too, the one request this tab makes, because a tab press is a person's
     press exactly as HARDWARE's is; a visit still fetches nothing. Until it
     arrives the slide shows a STAND-IN: the same 128x64 panel, the same two
     colours and `drawOled`, lettered in the firmware's default font from
     `oled-font.mjs`. The slide's canvas is registered as one more screen part,
     so the module's arrival redraws it with the LINK part's own paint and the
     stand-in is gone. */
````

<a id="kit-slides-19"></a>
## kit-slides-19: demo/kit/slides/index.html, inline script, line 547

````js
          // WHOLE NUMBERS ONLY. Asked 2026-10-05 with a screenshot:
          // *"do not scale screen this way. just 1x 2x etc"*. It used to grow to
          // fill the half slide and fall to a FRACTION on a phone, which is the
          // one thing `oledScreen` above exists to refuse. The largest whole
          // number that fits the column, 1x at least, never between.
````

<a id="kit-slides-20"></a>
## kit-slides-20: demo/kit/slides/index.html, inline script, line 558

````js
            // and in full screen as many whole times as fit (*"2x on
            // fullscreen?"*): still whole numbers, never a fraction
````

<a id="kit-slides-21"></a>
## kit-slides-21: demo/kit/slides/index.html, inline script, line 570

````js
  // ── SCREEN AND KEYS ON A SLIDE ────────────────────────────────────────────
  // 🔴 Asked 2026-10-06 as *"to the slides kit add example with hw screen on
  // left and 4 buttons vertcally grouped on the right (mix of our primary and
  // secodary buttons, shimmering on push)"*, rebuilt as a split on *"not good.
  // use columned layout ... buttons on top right, not grouped, vert gap,
  // separate, all secondary, additional desc"*, and then laid out `band` on
  // *"its better to use vertical sections here. top 2/3 is darker, centered
  // screen and buttons ton the right, below in lighter area title an desc"*.
  // So the well holds the router's screen at a whole scale with its four keys
  // to its right, four separate secondary buttons a gap apart, sized in slide
  // units so they shrink with it; the headline and the sentence are under it.
  // A press gives the button the one busy sweep every button here has, for
  // 0.9 s, and is bound to nothing.
````

<a id="kit-slides-22"></a>
## kit-slides-22: demo/kit/slides/index.html, inline script, line 678

````js
        // THE REAL INSTRUMENT PANEL, asked 2026-10-05: *"WAVEFORM ON A SLIDE use
        // actual instument panel"*. The wave view is the panel's picture, two
        // knobs its row, a nameplate its foot; the panel is px furniture, so it
        // is laid out at 360 logical px and scaled into the column like the
        // other kit controls here.
        // SCALED LIKE THE KNOBS AND FILLING ITS FIT BOX, asked with a crop of a
        // small panel adrift in its column: *"scale instrument as you do with
        // knobs. equal padding. uppercase proper instrument nameplate"*. The
        // panel takes the fit box's whole logical width, so the slot's own
        // inset is the air on every side and the plate's name and patch sit at
        // its two ends rather than run together.
````

<a id="kit-slides-23"></a>
## kit-slides-23: demo/kit/slides/index.html, inline script, line 697

````js
// no patch line: *"rm Two tones"*
````

<a id="kit-slides-24"></a>
## kit-slides-24: demo/kit/slides/index.html, inline script, line 726

````js
        // THE REAL VIDEO PANEL, footer and all, asked 2026-10-05: *"use actual
        // videopanel VIDEO ON A SLIDE"*. Its name on the left, and a play
        // glyph beside the panel's own full screen square on the right.
````

<a id="kit-slides-25"></a>
## kit-slides-25: demo/kit/slides/index.html, inline script, line 756

````js
  /* ⚠️ DECLARED HERE, ABOVE STEP GRID ON A SLIDE, because that slot is the first
     to call `slideCommand` while it is built, and a `const` read above its own
     line throws.
     🔴 A KEY FOR A BAR ON A SLIDE IS A KEY PRESSED INSIDE THAT SLIDE. The bar
     listens on `window` and hears a key from the body, which is right for a
     page's one transport and wrong for a specimen among thirty others: Space on
     this page would start it from anywhere. `data-own-keys` does not answer it,
     because that attribute silences a bar only while its panel is HIDDEN, and
     an open tab is not. So the bar is handed `command` (its documented seam for
     who owns position, `transport-bar.mjs`) and refuses play, pause and seek
     while a keydown is being dispatched whose target is outside the slide's
     frame. A click or a drag is not a keydown and goes straight through; a key
     aimed at the bar is inside the frame, and the bar's own rule already keeps
     it from every other bar. `transport-bar.mjs` is unchanged.
     ⚠️ `slideKeys.ev` IS READ BY ITS PHASE, NOT CLEARED. A window capture
     listener sees every keydown first; `eventPhase` is NONE once the dispatch is
     over, so a later click never inherits the last key. A microtask clear would
     run between listeners on a real key and lose it. */
````

<a id="kit-slides-26"></a>
## kit-slides-26: demo/kit/slides/index.html, inline script, line 793

````js
  /* STEP GRID ON A SLIDE, asked 2026-10-05 as *"STEP GRID ON A SLIDE - convert
     to col layout with tom instrument (no labels)"*. `/tom/`'s drum machine
     from the same kit parts `/tom/` uses (demo/tom/index.html, the bar at
     ~620, the grid at ~750, the instrument at ~836): a transport bar with the
     stop verb, glued over a step grid in a panel case, with the TOM plate at
     the foot's right end. On the darker side of a split, scaled like the
     waveform and FAU panels (`fitBox`, `.kit-sl-fill`).
     🔴 32 STEPS, NO TEMPO ARROWS, DRAWABLE, asked the same day as *"more lines
     on slide tom, 32?. no prev next. drawable"*. Two bars of four beats at four
     steps a beat. The arrows are gone from the bar's right slot, so the tempo
     is the clock's 120 and nothing on the slide changes it. The grid is the
     editable one: a press toggles a pad and a drag carries that press's value
     across the pads it crosses, which is `step-grid.mjs`'s own stroke, and
     Enter on a focused pad toggles it, the component's own key.
     ⚠️ THE STEPS SCROLL RATHER THAN SHRINK. A pad is never smaller than
     `PAD_DRAW` (above `PAD_MIN`), and the case's strip is already its own x
     scroller (`.panel-strip`), so 32 steps scroll inside the panel.
     🔴 NO LABELS, AND THE PLATE IS KEPT. No row names (no `fixed`, so no label
     column is built), no beat numbers (`ticks` off), no clock (`time: false`).
     The plate stays: it is the instrument's name, not a label on one of its
     controls. Glyphs stay too, because a play button with no glyph is a blank
     square.
     🔴 NO SAMPLES, NO AUDIO, NO FETCH. The grid plays its pattern on its own
     frame clock while the tab is open and stops when it closes; the bar's
     toggle stops and plays it.
     ⚠️ THE BAR'S KEYS ARE THE SLIDE'S, by `slideCommand`, for the reason the
     TRANSPORT BAR block gives: Space from the page must not start it. The
     grid listens on its own rows only, so a key from the body never reaches
     a pad. */
````

<a id="kit-slides-27"></a>
## kit-slides-27: demo/kit/slides/index.html, inline script, line 834

````js
          /* ⚠️ A PAD A FINGER CAN DRAW ON, NOT THE GRID'S FLOOR. MEASURED at
             `PAD_MIN`: 32 steps in the 378 logical px strip are 10 px pads, and at
             this slot's 0.67x to 0.75x that is about 7 screen px, which nobody
             can hit. 18 logical px is about 13 screen px, and the steps scroll
             inside the strip past the panel edge, as FAU's keys do. */
````

<a id="kit-slides-28"></a>
## kit-slides-28: demo/kit/slides/index.html, inline script, line 911

````js
  /* 🔴 THE TIME WORK ON A SLIDE, 2026-10-05. Asked as *"do 6 and 7"*, from a
     list whose sixth item was a timeline or strip view on a slide and whose
     seventh was a transport bar on a slide, left out before because a bar takes
     Space. Both are fed by this tab alone: a deck with its own marks, no
     network, playing only between `slidesOpen()` and `slidesClose()`. */
````

<a id="kit-slides-29"></a>
## kit-slides-29: demo/kit/slides/index.html, inline script, line 917

````js
  /* TIMELINE ON A SLIDE. HANDOFF.md:133-135, AHEAD on /sync/: a peer 137 ms
     fast over a 20 ms hop, offset found to 0.00 ms, beats fired a median 1.8 ms
     apart (worst 6.9). The strip under it is this tab's own: one beat every
     500 ms, handed on three ways, each mark coloured by how late it landed, in
     the one colour meaning `/time/`'s BEAT tab uses (`demo/time/beat.mjs`):
     grey not landed yet, green inside 5 ms, amber inside 20, red past it.
       deck   the deck's own scheduler, which looks 100 ms ahead (its drift)
       timer  a timer re-armed from the last one, so its lateness adds up
       frame  the deck's beat, drawn on the next frame after it fired
     🔴 SIZED OFF THE SLOT, NOT `fitBox`. The strip measures its own rect with
     `getBoundingClientRect`, which is the TRANSFORMED box, and draws in that
     many pixels; inside a scaled box its own `autoHeight` then writes a CSS
     height in visual pixels onto an element that is scaled again, and the
     lanes fill a 1/k share of their canvas. So the canvas is the slot's width,
     and the lanes split the slot's height between them, re-split whenever the
     slot changes size (full screen included). Its gutter and ruler type stay
     at the strip's own px size, which is the one thing that does not grow with
     the slide. */
````

<a id="kit-slides-30"></a>
## kit-slides-30: demo/kit/slides/index.html, inline script, line 1016

````js
  /* TRANSPORT BAR ON A SLIDE. The kit's bar on a deck of this tab's own,
     `publish: false`, scaled like the other px controls (`fitBox`, 560 logical
     px). No strip glued under it: a strip in a scaled box draws in the wrong
     pixels (the note above), so the bar keeps its own scrub as the one
     position surface. Its keys are the slide's, by `slideCommand` above. */
````

<a id="kit-slides-31"></a>
## kit-slides-31: demo/kit/slides/index.html, inline script, line 1044

````js
  /* FAU ON A SLIDE, asked 2026-10-05 as *"build fau into slide. overflow
     keyboard. col layout"*. `/fau/`'s instrument from the same kit parts: the
     code box holding a Faust program, its knobs, two octaves of keys and the
     FAU plate, on the darker side of a split, scaled like the waveform panel
     (`fitBox`, `.kit-sl-fill`).
     🔴 A PICTURE OF THE INSTRUMENT, NOT THE INSTRUMENT. No libfaust, no
     compile, no audio, on a visit or on the tab opening: a key lights under a
     press and the log says once where it plays. The caption links `/fau/`.
     🔴 THE KEYS OVERFLOW AND ARE NOT SHRUNK. 25 keys at `/fau/`'s 44 px a white
     are wider than the panel, and the keys row scrolls sideways inside it,
     which is what `.keys` does on every page (`overflow-x: auto`).
     ⚠️ `letters: false`, so the keyboard binds nothing on `window`: arrows,
     Space and the letter row stay the rest of the page's. */
````

<a id="kit-slides-32"></a>
## kit-slides-32: demo/kit/slides/index.html, inline script, line 1113

````js
  /* 🔴 THE PART RUNS WHILE THE PAGE IS SEEN. In `/kit/` the tab row called
     `slidesOpen()` and `slidesClose()`; here the visit opens it and the
     page being hidden closes it, and showing the page again reopens it. */
````

<a id="kit-slides-33"></a>
## kit-slides-33: demo/kit/slides/index.html, inline script, line 1122

````js
  /* ── what a machine can say about this page ─────────────────────────────
     🔴 EVERY CHECK ON THIS PAGE IS BEHIND `?selfcheck=1`, the page level ones
     included (CLAUDE.md: a self-check never runs for a visitor). The checks
     below are copied from `demo/kit/index.html` VERBATIM and keep that
     file's indent, so a diff against it reads clean; the one line taken out
     of each is a `settle()` or `measure()`, the measuring window a page with
     no closed tab has no use for. Their comments still name it.
     ⚠️ THEY RUN AFTER A FRAME, because `getBoundingClientRect` before the
     first paint answers about a page that has not been arranged yet. */
````

<a id="kit-slides-34"></a>
## kit-slides-34: demo/kit/slides/index.html, inline script, line 1136

````js
  /**
   * 🔴 A KEY FROM THE PAGE DOES NOT REACH THE SLIDES' BAR OR KEYS, BEFORE
   * `d.ready()` FOR THE TAB PAGE'S REASON: a key from the body reaches the
   * PUBLISHED bar as well, and after `ready` the harness is drilling it. So
   * the four keys go in pairs that undo each other on that bar (play then
   * pause, right then left), and the assert says it came back.
   * ⚠️ THE REFUSAL COUNT IS THE HALF THAT PROVES IT. A bar that never heard the
   * keys would also stand still; four refusals say it heard every one and the
   * gate said no.
   */
````

<a id="kit-slides-35"></a>
## kit-slides-35: demo/kit/slides/index.html, inline script, line 1161

````js
        // ⚠️ ON ITS OWN PAGE NOTHING PUBLISHES A BAR (the one that did is
        // `/kit/timeline/`'s TRANSPORT BAR), so the claim is that no slide
        // takes the page's playhead either.
````

<a id="kit-slides-36"></a>
## kit-slides-36: demo/kit/slides/index.html, inline script, line 1174

````js
  /**
   * 🔴 THE ROUTER FIRMWARE'S CHECKS, AFTER `d.ready()` AND NOT BEFORE IT. This
   * page becomes ready about 5.9 s after navigation against a harness that
   * waits about 7.4 s (see the keyboard looper's block), and booting a board
   * is half a second of emulation, twice. After `ready` the harness keeps
   * collecting while the count grows and tolerates 2 s of silence, so every
   * wait below is shorter than that and each step asserts as it lands.
   *
   * 🔴 THE FIRMWARE IS GRADED ON A BOARD OF ITS OWN, ON THIS THREAD, AND THE
   * PAGE'S WIRING ON THE PAGE'S OWN BOARD IN ITS WORKER. The first half is the
   * three claims the firmware makes (it boots to SCENE 1/2, a note goes
   * through, NEXT moves it an octave up to channel 2) and is the same reading
   * `rig/pico/sim/run-router.mjs` does: a phrase is on the panel only when
   * every pixel of its cells matches the firmware's own font. The second half
   * is that pressing the tab, the keys and the button on this page reaches it.
   * ⚠️ BOTH BEHIND `?selfcheck=1`. A visitor's board starts when they open the
   * tab and not before, and nothing here presses anything for them.
   */
````

<a id="kit-slides-37"></a>
## kit-slides-37: demo/kit/slides/index.html, inline script, line 1198

````js
  /**
   * 🔴 THE SLIDES PART'S CHECKS, AFTER `d.ready()` AND BEFORE THE ROUTER'S. They
   * open the SLIDES tab, which a closed tab gives no size, and wait for frames
   * and for a video to present some, so they go where the router's checks go:
   * after `ready`, each step asserting as it lands and no wait longer than the
   * harness's 2 s of tolerated silence. CHAINED in front of `hwChecks` rather
   * than beside it, because both open a tab and two checks pressing tabs at
   * once would each measure the other's part.
   * ⚠️ BEHIND `?selfcheck=1` like every check here: they press a slider, turn
   * a knob and step the player, and a visitor never sees any of it.
   */
````

<a id="kit-slides-38"></a>
## kit-slides-38: demo/kit/slides/index.html, inline script, line 1213

````js
    // ⚠️ THE VISIT OPENED THE PART ON THIS PAGE, so the screen code has been
    // asked for once already, by `slidesOpen()`, and never twice
````

<a id="kit-slides-39"></a>
## kit-slides-39: demo/kit/slides/index.html, inline script, line 1266

````js
      // the caption sits under the WORDS: on the inset's left edge, or in a
      // split with its slot on the left, on the words column's left edge
      // (asked 2026-10-05, *"no text going over to other column, wrap!"*)
````

<a id="kit-slides-40"></a>
## kit-slides-40: demo/kit/slides/index.html, inline script, line 1319

````js
      // no right layout since 2026-10-05, *"no right align needed"*
````

<a id="kit-slides-41"></a>
## kit-slides-41: demo/kit/slides/index.html, inline script, line 1345

````js
      // two slides since 2026-10-05: right to the second, Home back, space
      // forward again, and right at the end stays there
````

<a id="kit-slides-42"></a>
## kit-slides-42: demo/kit/slides/index.html, inline script, line 1366

````js
      // ── a tap steps it in full screen on a screen with no hover ─────────
      // `(hover: none)` cannot be emulated from inside the page, so the player
      // is told it is on one (`touchMode`), which is the code path a phone
      // takes; the media query itself is graded by `shot.mjs` at 375.
````

<a id="kit-slides-43"></a>
## kit-slides-43: demo/kit/slides/index.html, inline script, line 1395

````js
      // The rule, read off the stylesheet the slide links, because no harness
      // here can make `(hover: none)` match: both corners declared, the touch
      // one in a media block AFTER the plain rule of the same weight (a media
      // query adds no specificity, so order is what lets it win).
````

<a id="kit-slides-44"></a>
## kit-slides-44: demo/kit/slides/index.html, inline script, line 1435

````js
      // laid out `band` since 2026-10-06: the figure centred in the darker top
      // two thirds, its line on the lighter third under it, on the left inset
````

<a id="kit-slides-45"></a>
## kit-slides-45: demo/kit/slides/index.html, inline script, line 1535

````js
      // SCREEN AND KEYS, laid out `band`: in the darker top two thirds the
      // screen at a whole scale with four separate secondary keys a gap apart
      // to its right; the headline and the sentence on the lighter third under
      // them; a press sweeps the key busy and gives it back
````

<a id="kit-slides-46"></a>
## kit-slides-46: demo/kit/slides/index.html, inline script, line 1684

````js
        // 3 since HEADLINE OVER A TABLE and the rounded box were removed on the owner's word, 2026-10-05
````

<a id="kit-slides-47"></a>
## kit-slides-47: demo/kit/slides/index.html, inline script, line 1705

````js
      // ⚠️ SAMPLED UNTIL THE TABLE IS NOT MID APPEND, up to five frames,
      // 2026-10-06: the rule widths measured right (1 px each) while a read
      // taken during a row being added saw the last row 0.5 px off the foot
      // and a rule mid move, four runs running once new blocks moved this
      // check's moment against the log's ticks
````

<a id="kit-slides-48"></a>
## kit-slides-48: demo/kit/slides/index.html, inline script, line 1716

````js
        // ⚠️ 1 px, THE SAME AS THE FOOT TEST BELOW: the newest row sits up to a
        // half pixel past the foot by where the page puts this slide (a new
        // slide above it moved it 2026-10-06), and at 0.5 it dropped out, so
        // the row above it, rightly ruled, was read as the last and failed
````

<a id="kit-slides-49"></a>
## kit-slides-49: demo/kit/slides/index.html, inline script, line 1811

````js
        // ⚠️ THE TOP IS THE INK'S, NOT THE FONT BOX'S. A text rect starts at
        // the face's ascent, which is a fact about the font file: JetBrains
        // Mono's sits about 0.07 em higher than the system mono's, and the
        // switch on 2026-10-12 read that as 0.4 px of lost air on a label
        // whose letters had not moved. The ink top is placed in the rect by
        // the canvas's own measure of this face.
````

<a id="kit-slides-50"></a>
## kit-slides-50: demo/kit/slides/index.html, inline script, line 1878

````js
      // ⚠️ NO PUBLISHED BAR ON THIS PAGE, so what is graded is that the key
      // moves the slide's bar and the bar still does not claim the playhead.
````

<a id="kit-slides-51"></a>
## kit-slides-51: demo/kit/slides/index.html, inline script, line 2065

````js
      // ⚠️ NOT THE SHELL'S OWN LOG. On 127.0.0.1 every `d.log` line is POSTed
      // to the dev server's `/_log` (shell.mjs), which is the page talking to
      // the desk and not the tab opening anything; MEASURED as the one request
      // in the first run. Anything else counts.
      // ⚠️ AND ONE FILE IS ALLOWED, BY NAME, SINCE 2026-10-05: the router's
      // screen code for the OLED slide, asked for once on the tab press.
````

<a id="kit-slides-52"></a>
## kit-slides-52: demo/kit/slides/index.html, inline script, line 2074

````js
      // ⚠️ OVER THE WHOLE VISIT, not only the checks: the visit is what opens
      // the part here, so the one request was made before they began.
````

<a id="kit-slides-53"></a>
## kit-slides-53: demo/kit/slides/index.html, inline script, line 2077

````js
      // ⚠️ AND A FONT OF THIS ORIGIN'S IS NOT COUNTED HERE: on this page the
      // slides are the first thing set in the face and in the accidentals, so
      // a font file can arrive while the checks run, where in `/kit/` an
      // earlier part had already asked for it. The face is graded below.
      // ⚠️ NOR THE PAGE'S OWN ICON, since 2026-10-06: the shell links
      // `/favicon.ico` as a file now (the β+ brand mark), where it used to
      // draw an inline SVG that fetched nothing.
````

<a id="kit-slides-54"></a>
## kit-slides-54: demo/kit/slides/index.html, inline script, line 2089

````js
        // at most three face files: Latin 400 and 600, and the Greek 600 that
        // BRAND's β loaded until the logo moved to /brand/ on 2026-10-06
````

<a id="kit-slides-55"></a>
## kit-slides-55: demo/kit/slides/index.html, inline script, line 2098

````js
    // ⚠️ ON ITS OWN PAGE WHAT CLOSES THE PART IS THE PAGE BEING HIDDEN, which
    // a page cannot do to itself, so the close is `slidesClose()`, the call
    // the `visibilitychange` listener makes, and the listener is read.
````

<a id="kit-slides-56"></a>
## kit-slides-56: demo/kit/slides/index.html, inline script, line 2130

````js
  // NAMES FROM THE CODE: mono inside sans, the named one in its hue and the
  // other in the words' own ink. ⚠️ BOTH HALVES, because a rule that coloured
  // every `code` would pass the first and a rule that coloured none the second.
````
