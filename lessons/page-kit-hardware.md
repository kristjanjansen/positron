# Page comments: kit-hardware

The full comments cut from the code under demo/ for kit-hardware, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="kit-hardware-1"></a>
## kit-hardware-1: demo/kit/hardware/index.html, inline script, line 28

````js
  /**
   * 🔴 kit/hardware, ONE PART OF `/kit/` ON A PAGE OF ITS OWN, 2026-10-06
   * (plans/plan-kit-split.md). Every block, holder and check below is copied
   * VERBATIM from `demo/kit/index.html`, in that file's order, so the newest
   * block is still the first. What changed is mechanical: `section()` lost its
   * first argument, the holders sit here rather than at the top of the
   * monolith, the measuring window and the tab row are gone, and every check
   * is behind `?selfcheck=1`.
   * ⚠️ AND IT STARTS ON A PRESS, NOT ON A VISIT. In `/kit/` the board booted
   * when the HARDWARE tab was pressed, which counted as intent. On its own page
   * the visit is not a press, and an emulated RP2040 is a core running flat
   * out, so the page has one control, Start the board, and it is this page's
   * control 0 (plans/plan-kit-split.md section 9, the default taken).
   * 🔴 BUT THE SCREENS DRAW ON A VISIT, SINCE 2026-10-06. Reported the day the
   * page went live: *"screens empty"*. Every panel was black until Start,
   * which is the default above taken one step too far: what costs CPU is the
   * emulated core RUNNING, not the drawing. So a visit fetches the two files
   * (the 57 KB UF2 and the 7.8 KB `oled-ui.wasm`), draws every specimen screen
   * and every font from them, and puts one still frame of the router's boot
   * screen on its panel from half a second of emulation on this thread, once.
   * Start runs the board live. `hwLoad()` is the visit, `hwOpen()` the press.
   * 🔴 AND THERE IS NO START BUTTON SINCE THE SAME DAY: *"rm start the board
   * btton ?"*. The board boots on a visit, the way the HARDWARE tab booted it
   * on its press in `/kit/`, and pauses while the page is hidden. So the still
   * frame went too: the live board draws its own boot screen half a second in.
   */
````

<a id="kit-hardware-2"></a>
## kit-hardware-2: demo/kit/hardware/index.html, inline script, line 59

````js
  /**
   * 🔴 THE NEWEST BLOCKS, 2026-10-04, AND THE FIRST CALLS TO `section()`. Asked
   * as *"Can you make demo of hw kit in psoitron kit new tab?"* and then
   * *"Rename hardware to devices in kit and pico to hardware"*. The part is
   * HARDWARE and what is in it is the REAL thing: `rig/pico/firmware/`'s router,
   * the UF2 built in Docker by `build.sh pico`, copied byte for byte to
   * `demo/resources/pico/router-pico.uf2` and run in rp2040js, with the screen,
   * the four keys and the MIDI UART wired to the page.
   *
   * 🔴 NOTHING HERE RUNS ON A VISIT TO ANY OTHER PART. An emulated RP2040 is a
   * core running flat out, and *"a visit, a step and a scrub must open
   * nothing"*. The blocks build their controls on load, which is cheap and
   * synchronous (the measuring window holds no `await`); the UF2 is fetched
   * and the worker started only when the HARDWARE tab is pressed, and the board
   * pauses when another tab is, or when the page is hidden. The checks at the
   * foot of this file grade both halves: a visit fetched nothing, and opening
   * the tab drew the board's own screen.
   *
   * ⚠️ IT RUNS SLOWER THAN THE REAL BOARD AND SAYS SO. MEASURED 2026-10-04 in
   * Node: about 0.6 x real time flat out, because the router's main loop polls
   * and never sleeps, so every one of its 125 million cycles a second is
   * emulated. The readout shows the speed the board is getting and the speed
   * it could get. A key is held for as long in BOARD time as it was held here,
   * so a one second press on OK is a deny whatever the speed; see
   * `demo/shell/pico-worker.mjs`.
   *
   * ⚠️ NOTHING HERE IS IN A `.pos-controls` ROW, for the reason the blocks
   * below give: both harnesses press that row by position, so a new top block
   * with a control in it moves every other block's press. The keys are in the
   * box, and the checks press them on purpose.
   */
````

<a id="kit-hardware-3"></a>
## kit-hardware-3: demo/kit/hardware/index.html, inline script, line 91

````js
  /* ⚠️ THE PANEL'S INKS, `drawOled`, `oledScreen` AND `oledText` ARE
     `demo/shell/oled-view.mjs` NOW, moved verbatim, because SLIDES draws the
     same panel and two pages cannot share a page function. */
````

<a id="kit-hardware-4"></a>
## kit-hardware-4: demo/kit/hardware/index.html, inline script, line 94

````js
  /* ⚠️ DECLARED UP HERE WITH EVERY OTHER HOLDER, for the reason this page has
     written down six times: these are the topmost blocks, and a `let` left
     where a block used to be is read in its dead zone. */
````

<a id="kit-hardware-5"></a>
## kit-hardware-5: demo/kit/hardware/index.html, inline script, line 196

````js
    /* ⚠️ A PICKER AND NOT A SEGMENTED CHOICE. Six names side by side are 440 px
       and a phone's box is about 310, so the choice ran off the right edge at
       375 px; a picker is one name wide at any count. Stepping reboots, and
       that is the point: the font is a byte in flash, read once at power on. */
````

<a id="kit-hardware-6"></a>
## kit-hardware-6: demo/kit/hardware/index.html, inline script, line 228

````js
    // ⚠️ ON ITS OWN PAGE THE START PRESS IS THE ONLY WAY IN, so the board runs.
    // (In `/kit/` it could arrive paused: a reader may have left the tab
    // while the file was on its way.)
````

<a id="kit-hardware-7"></a>
## kit-hardware-7: demo/kit/hardware/index.html, inline script, line 251

````js
  // TWO BLOCKS, asked 2026-10-06 as *"KEY LABELS - aplit into without header
  // with headers both havw 2 orientations"*: each shows the row along the
  // bottom and the column down the right, once on a bare screen and once
  // under the scene header, which is where the column's top moves to.
````

<a id="kit-hardware-8"></a>
## kit-hardware-8: demo/kit/hardware/index.html, inline script, line 366

````js
      // Sized off the BOX as a two-across row, like every other OLED block on
      // this page, so the emulator's screen is the same scale as theirs
      // (asked 2026-10-05: *"same screen size as othters"*).
````

<a id="kit-hardware-9"></a>
## kit-hardware-9: demo/kit/hardware/index.html, inline script, line 386

````js
      /* 🔴 A KEY IS DOWN FOR AS LONG AS THE POINTER IS, NOT FOR A CLICK. The
         firmware reads the pin, so pressing is holding: OK held for a second
         is a deny and the screen fills a meter while you hold it. `click` fires
         only after the pointer is gone, so it could only ever be a tap. */
````

<a id="kit-hardware-10"></a>
## kit-hardware-10: demo/kit/hardware/index.html, inline script, line 396

````js
          // ⚠️ CAPTURE IS AN IMPROVEMENT, NOT A REQUIREMENT: it throws for a
          // pointer the browser never saw, and the press must not go with it.
````

<a id="kit-hardware-11"></a>
## kit-hardware-11: demo/kit/hardware/index.html, inline script, line 421

````js
      /* ⚠️ THE MODULE'S BUTTONS ARE A COLUMN BESIDE THE SCREEN, ^ v # * top to
         bottom, so the firmware can put its labels there: one byte of flash,
         read at power on, so a pick reboots the board like a font does. */
````

<a id="kit-hardware-12"></a>
## kit-hardware-12: demo/kit/hardware/index.html, inline script, line 471

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

<a id="kit-hardware-13"></a>
## kit-hardware-13: demo/kit/hardware/index.html, inline script, line 490

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

<a id="kit-hardware-14"></a>
## kit-hardware-14: demo/kit/hardware/index.html, inline script, line 524

````js
    // ── a visit ───────────────────────────────────────────────────────────
    // ⚠️ A VISIT BOOTS THE BOARD SINCE 2026-10-06 (*"rm start the board
    // btton ?"*): each file fetched once, the screens drawn, the board running.
````

<a id="kit-hardware-15"></a>
## kit-hardware-15: demo/kit/hardware/index.html, inline script, line 557

````js
    // ⚠️ THE NEGATIVE CONTROL. A reader that found what it was asked for
    // whatever the pixels said would pass the assert above perfectly.
````

<a id="kit-hardware-16"></a>
## kit-hardware-16: demo/kit/hardware/index.html, inline script, line 593

````js
    // ── the page's own board, through its own controls ────────────────────
    // ⚠️ THE VISIT BOOTED IT; a second `hwOpen()` on a board that is loading
    // or running does nothing, which this call also proves.
````

<a id="kit-hardware-17"></a>
## kit-hardware-17: demo/kit/hardware/index.html, inline script, line 667

````js
    // ⚠️ AND THE BOARD BACK TO SLEEP. In `/kit/` leaving the tab paused it;
    // on its own page what pauses it is the page being hidden, which a page
    // cannot do to itself, so the pause is driven through `hwClose()`, the
    // same function, and the `visibilitychange` listener that calls it is
    // read rather than run.
````
