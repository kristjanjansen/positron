# Page comments: pack

The full comments cut from the code under demo/ for pack, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="pack-1"></a>
## pack-1: demo/pack/index.html, style, line 11

````css
  /* 🔴 HALF THE HEIGHT, ASKED FOR AS *"patched table 1/2 less high"*. The
     component's own default is 420 px and it is a custom property for exactly
     this, so a page sets the number rather than reaching into the component.
     MEASURED before the change: 453 px showing 13 rows of 64.
     ⚠️ AND IT IS A WHOLE NUMBER OF ROWS, WHICH THE FIRST TRY WAS NOT. At a
     round 210 px the box held 6.48 rows and the seventh was sliced through the
     middle of its letters, which photographs as a rendering fault rather than
     as a scroller. MEASURED: a row is 32.39 px, so six of them is 194.34 and
     the cut lands on a border. The scrollbar and the rows under the sticky
     heading are what say there is more. */
````

<a id="pack-2"></a>
## pack-2: demo/pack/index.html, style, line 22

````css
  /* 🔴 `.pk-line` STOOD HERE AND WENT WITH ITS LAST CALLER ON 2026-09-22. It
     styled the samples tab's totals sentence, which was removed that day, and a
     rule with nothing matching it is a rule that reads as correct forever. This
     project has measured four dead CSS rules and every one of them survived by
     looking like it was doing something. */
````

<a id="pack-3"></a>
## pack-3: demo/pack/index.html, style, line 27

````css
  /* ⚠️ EVERY GLUED PART PAINTS ITS OWN GROUND. `.pos-glue` is `gap: 1px` over a
     `--line` ground, so a child with no background lets that colour through its
     whole area and the 1 px seam stops being a seam. MEASURED on `/wish/` the
     same day; neither of the kit's existing glued pairs says it out loud. */
````

<a id="pack-4"></a>
## pack-4: demo/pack/index.html, style, line 31

````css
  /* ⚠️ THE PICTURE'S HOST PAINTS A GROUND TOO, AND IT WENT RED WITHOUT ONE.
     The component styles its own `.pos-scope` and paints nothing behind it, so
     the host had no background and the glue's line colour came straight through
     its whole area. Third part, same trap, measured the same day on `/wish/`.
     ⚠️ AND THE HOST IS THE ROW ITSELF SINCE 2026-09-29, not a `<div>` the page
     puts inside one. `createGlueRows` gives every row `background: var(--card)`
     already, so this declaration is a second statement of one colour rather than
     the only one, and it is kept because a part that paints its own ground is
     what this page has paid for three times. MEASURED after the change, with a
     sample open: the row computes `rgb(17, 21, 29)` and the surface behind it
     `rgb(31, 41, 55)`, which is `--card` on `--line`.
     🔴 AND THE GROUND IS ALL IT CARRIES NOW. It was `background` plus
     `padding: 10px 12px` until 2026-09-22, removed on a screenshot reading
     *"rm padding and its border around waveform canvas"*: an inset picture
     inside a glued part reads as a box drawn inside a box, and the seam is the
     only edge this surface is meant to have. The GROUND stays, because taking
     it would let the glue's line colour through the whole part, which is the
     trap the paragraph above records. */
````

<a id="pack-5"></a>
## pack-5: demo/pack/index.html, style, line 50

````css
  /* 🔴 `.pk-player` STOOD HERE AND WENT WITH THE SAMPLES TAB'S TRANSPORT ON
     2026-09-29, ASKED FOR AS *"pack: sample player: rm transport below
     waveform. rm border around waveform. use glued panel"*. It was the ground
     under `createTransportBar`, the bar is gone, and a rule with nothing left
     matching it reads as correct forever, which is exactly what the note at the
     top of this element already records about `.pk-line`.
     ⚠️ `.pk-bar` BELOW IS NOT IT AND IT STAYS. That one is the SESSIONS tab's
     own bar, over the sixteen step picture, and nothing in this ask is about
     that tab. */
````

<a id="pack-6"></a>
## pack-6: demo/pack/index.html, style, line 59

````css
  /* 🔴 WHAT SAYS A FILE WILL MAKE NO SOUND, NOW THAT THE GREYED PLAY BUTTON IS
     NOT THERE TO SAY IT. `playBtn.disabled = !mono.ok` was this page's only
     visible statement at rest that a 24 bit or a surround WAV had opened, drawn
     nothing and would make no sound, and FOUR asserts read that one button.
     MEASURED before the transport came out, against a locally served zip of
     four WAVs: with `Surround.wav` open the play button computed `disabled` and
     the picture's part computed `display: none`, so the only thing on screen
     about it was a dimmed control. The fact is a row of the glued panel now, in
     the slot the picture would have taken.
     ⚠️ THE TYPE IS `.pos-sub`'s AND THIS RULE ADDS NO NUMBERS OF ITS OWN. It
     drops the margin and sets the ink. A sub-line owns no outer margin inside a
     row that already supplies the inset, and `.pos-sub`'s `margin: 4px 0 0` on a
     flex item in a centred row reads as 20 px of air above the words against 16
     below. Same weight as `.pos-sub` and later in the cascade, which is the
     smallest thing that can win.
     ⚠️ AND THE INK IS `--bad` BECAUSE THE LOG ALREADY SAYS IT IN `--bad`.
     `playSample` logs a refusal with `'bad'`, so the line under the table and
     the line in the log are one fact in one colour rather than two. */
````

<a id="pack-7"></a>
## pack-7: demo/pack/index.html, style, line 82

````css
  /* 🔴 THE SIXTEEN STEP PICTURE OF THE PRESSED REGION. The pads carry the
     ground, and the host's padding is exactly the grid's own gap, so the outer
     margin and the inner gaps are one measurement and the block reads as a grid
     rather than as a grid inside a box. */
````

<a id="pack-8"></a>
## pack-8: demo/pack/index.html, style, line 99

````css
  /* ⚠️ SIX ROWS ARE ALWAYS DRAWN AND A PAD'S HEIGHT IS FLAT, so pressing a
     region cannot move what is under the block and an empty region reserves
     exactly the room a full one takes. `aspect-ratio` would have made the
     picture 600 px tall on a wide screen and a different height on a phone. */
````

<a id="pack-9"></a>
## pack-9: demo/pack/index.html, style, line 109

````css
  /* 🔴 VELOCITY IS THE FILL'S STRENGTH AND NEVER A SECOND COLOUR, which is
     `note-grid.mjs`'s rule and the project's: colour says how a mark LANDED and
     a note sitting in a file has not landed anywhere. `--pk-v` is the velocity
     out of 127, written per pad.
     ⚠️ IT STARTS AT 45 PER CENT RATHER THAN AT NOTHING. The pad carries its
     note's NAME in the page's darkest ink, so a fill that faded to the ground
     at velocity 1 would take the name with it, and an unreadable name is worse
     than a flat one. The ramp still spans the whole velocity range. */
````

<a id="pack-10"></a>
## pack-10: demo/pack/index.html, style, line 125

````css
  /* 🔴 ON A PHONE THE NAMES GO AND THE MARKS STAY, AND THE ALTERNATIVES WERE
     MEASURED BEFORE CHOOSING. MEASURED at 390 px: the block is 356 px wide with
     no page overflow, and a pad is 16 px, which holds `G2` and cuts `G#2` in
     half. Dropping the row names would have bought 3 px a column and taken the
     `slot` labels and the corner's `6 notes` / `no notes` / `not read` with
     them, which is the one distinction this picture exists to make; a sideways
     scroller would have put a second one inside a box that already has two.
     What a phone keeps is where every note is and how hard it was played, and
     what it loses is the pitch, which is in the pad's own hover.
     ⚠️ THIS BLOCK IS LAST IN THE STYLE ELEMENT AND THAT IS LOAD BEARING. A
     media query adds NO specificity, so a plain rule later in the file beats it
     at every width. `.pos-pick`'s entire phone layout sat above the plain rule
     that beat it and had never run in its life.
     ⚠️ AND `demo/verify.mjs` RUNS AT 756 px, so nothing in here is exercised by
     the harness. The 390 px numbers above were measured by hand in headless
     Chrome with the viewport overridden; the assert can only say the block is
     still last. */
````

<a id="pack-11"></a>
## pack-11: demo/pack/index.html, inline script, line 153

````js
  /* 🔴 `createNoteGrid` IS GONE FROM THIS PAGE AND `noteName` IS NOT. Asked
     2026-09-22: *"rm current notes visualization"*. That picture drew all
     sixteen patterns of a session at once, between the two tables, with no way
     to ask about one of them. `/kit/` still carries the specimen and
     `demo/shell/note-grid-test.mjs` still grades its arithmetic, so what went
     is a picture rather than a component.
     ⚠️ THE NAMING STAYS SHARED. `noteName` holds the decision that middle C is
     C3 here, because that is what the Circuit's own pads say, and a second
     copy of that would be a second answer. */
````

<a id="pack-12"></a>
## pack-12: demo/pack/index.html, inline script, line 185

````js
  /**
   * 🔴 THIS PAGE SENDS NOTHING. NOT ONE BYTE, AND IT IS ASSERTED OVER A COUNTER
   * RATHER THAN OVER A READING OF THE SOURCE. There is no Web MIDI here, no
   * output and no encoder: `circuit-patch.mjs` exports nothing that makes a
   * message and its own test asserts that absence. The reason is one byte.
   * `Replace Current Patch` and `Replace Patch` differ at offset 6 of a 350 byte
   * message, the second overwrites a patch in FLASH on an instrument with no
   * factory reset, and the owner's pack is the backup of that flash.
   * ⚠️ A grep for `requestMIDIAccess` finds it absent on every day it is absent
   * and says nothing about the day somebody adds it behind a helper. This wraps
   * the method and counts.
   */
````

<a id="pack-13"></a>
## pack-13: demo/pack/index.html, inline script, line 206

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
  // pack of their own:   /pack/?pack=/tmp/personal/mine.circuitpack
````

<a id="pack-14"></a>
## pack-14: demo/pack/index.html, inline script, line 226

````js
    // ⚠️ THE PAGE'S SENTENCE AND THE INDEX'S ARE ONE STRING, because a page with
    // a diagram carries the index's own line verbatim.
````

<a id="pack-15"></a>
## pack-15: demo/pack/index.html, inline script, line 229

````js
    /**
     * 🔴 NO READOUT, AND `null` RATHER THAN AN OMITTED FIELD. Instructed
     * 2026-09-21: *"rm patches 64 / sessions 32 / different 32 of 32 / filled
     * 84.6%"*, which was all four cells. `mount()` checks for the DECLARATION so
     * both harnesses read this as deliberate rather than as somebody forgetting,
     * and the shell hides the empty box as well as its contents, because a page
     * that opts out of a surface and keeps its box paints a 2 px band nobody
     * wrote.
     * ⚠️ AND WHAT IT SAID IS REHOMED, WHICH IS THE HALF THAT GETS FORGOTTEN.
     * `patches` and `sessions` lead the tab titles. `different` and `filled`
     * are in the `nearest` and `filled` columns of the sessions table and in
     * the readout under it, which is where they were always checkable.
     */
````

<a id="pack-16"></a>
## pack-16: demo/pack/index.html, inline script, line 243

````js
    /**
     * 🔴 NO CONTROLS EITHER, AND `open the pack here` WENT ON 2026-09-21 BECAUSE
     * IT WAS ASKED FOR: *"rm 'open pack here'"*. It read the repository's own
     * copy of the owner's pack, which is published nowhere, so the control did
     * something on this machine and answered a sentence everywhere else. The
     * page has ONE way in now and it is the same one for everybody.
     * ⚠️ A BACKGROUND AGENT DELETED THIS CONTROL ON ITS OWN AUTHORITY EARLIER
     * THE SAME DAY AND WAS REVERTED FOR IT. It is gone now because the owner
     * said so, not because that agent turned out to be right, and `BACKLOG.md`
     * records the difference.
     * ⚠️ AND `PACK` STAYS, FOR THE HARNESS ONLY. Every reading check on this
     * page needs a real pack, and the one on this machine is the only one that
     * is always there. It is read inside `SELFCHECK` and nowhere else, so a
     * visitor still opens nothing.
     */
````

<a id="pack-17"></a>
## pack-17: demo/pack/index.html, inline script, line 263

````js
  // ── the way in ───────────────────────────────────────────────────────────
  //
  // 🔴 IT IS AN AREA AND NOT ONLY A BUTTON, AND THAT WAS THE REPORTED DEFECT.
  // The first build put a button here and nothing else, because the component's
  // cover only exists while a drag is in flight, so the thing inviting the
  // gesture appeared after the gesture.
  // ⚠️ AND IT TAKES `.zip`, WHICH IS THE SHAPE A REAL DOWNLOAD ARRIVES IN.
  // MEASURED on the soundbank in `purchased/`: one zip holding 2 `.circuitpack`,
  // 1 `.circuittrackspack`, 128 `.syx`, an `.xlsx`, two `.txt` and 10 `.url`.
````

<a id="pack-18"></a>
## pack-18: demo/pack/index.html, inline script, line 274

````js
    // ⚠️ THE WORDS WERE ASKED FOR ONE AT A TIME, 2026-09-21: a title reading
    // *"upload file"*, a control reading *"[open file] or drag a file here"*,
    // and the list of extensions *"under a button"*. `drop.mjs` gained `title`
    // and `beside` for it and moved its hint below the button, so every caller
    // gets the same order rather than this page arranging its own.
    // 🔴 THE BUTTON STILL SAYS `open`, WHICH IS THE COMPONENT'S OWN RULE AND
    // SURVIVED A REVERT. Nothing leaves the machine, and a control called
    // *upload* invites somebody to build the thing `.gitignore` exists to
    // prevent. The title is the reader's word for the block; the button is the
    // promise about what pressing it does.
````

<a id="pack-19"></a>
## pack-19: demo/pack/index.html, inline script, line 287

````js
    // ⚠️ NO RESTING LINE, ASKED FOR AS *"rm nothing has been opened"*. The
    // footer comes into existence when it has something to say and goes away
    // again, which is `drop.mjs`'s own answer to an empty box painting a line.
````

<a id="pack-20"></a>
## pack-20: demo/pack/index.html, inline script, line 296

````js
  /**
   * 🔴 PUBLISHED ON `__demo`, BECAUSE A DRAG CANNOT BE SYNTHESISED AND THE
   * BUTTON OPENS AN OPERATING SYSTEM DIALOG. Those are the only two ways in for
   * a person, and neither is drivable, so without this the one path that matters
   * on this page is reachable by nothing outside it. `drop.open(files)` is the
   * same code a real drop runs.
   * ⚠️ AND IT GOES ON `window.__demo`, NOT ON `mount()`'s RETURN VALUE. They are
   * different objects: `mount` publishes its internal `api` and hands back a
   * wrapper. Setting it on the wrapper put it somewhere no harness looks, which
   * is the same trap `transport-bar.mjs` records about a page re-publishing
   * `__demo.transport`.
   */
````

<a id="pack-21"></a>
## pack-21: demo/pack/index.html, inline script, line 310

````js
  /**
   * 🔴 SIX PATCH BUTTONS STOOD HERE AND CAME OFF 2026-09-21, ASKED FOR AS
   * *"rm aciiiid ...twinds from pack"*, which names the first and the last of
   * them. They were `Aciiid Flamed Aggie Frosted Glass Smooth Pad Twins`, the
   * owner's own patches, published earlier the same day so that a visitor met
   * something other than an upload box and an empty page.
   * ⚠️ **THE SIX FILES ARE STILL PUBLISHED AND NOTHING POINTS AT THEM NOW.**
   * `/resources/patches/*.syx`, allowlisted in `workers/view/build.mjs`.
   * Taking them down was not asked for and they are somebody's work, so they
   * stay until somebody says otherwise rather than being swept as a tidy-up.
   * ⚠️ AND THREE ASSERTS WENT WITH THE ROW, which is the honest arithmetic:
   * *a published patch opens by name and lands in RAM*, *all six open*, and
   * *the six sit outside the control row*. The last of those was a second
   * reading of something this page already asserts on its own at *there is one
   * way in and no control row at all*, so that one is not a loss.
   */
````

<a id="pack-22"></a>
## pack-22: demo/pack/index.html, inline script, line 327

````js
  // ── the three lists ──────────────────────────────────────────────────────
  //
  // 🔴 TABS, AND THE COUNTS ARE IN THEIR TITLES. Asked as *"patches and sessions
  // are in separte tabs"* and *"add num of patches / sessions to tab title"*.
  // 🔴 SENTENCE CASE IN THE SOURCE SINCE SESSION 50 (2026-09-25), WHICH MADE
  // tab labels sentence case on every page and let `.pos-tabs-t` decide how
  // they render. It changed `label` here and left `one` and five asserts in
  // capitals, so `/pack/` read 29/31 on a page that was working: the asserts
  // compare `textContent`, which is the source string, never the rendered
  // case. All of it is one case now, 2026-10-05.
  // ⚠️ A TAB IS `#links`, NEVER A SUBPAGE: a subpage is a navigation, and the
  // sound stops, the service worker hands over and an installed web app flashes
  // white. `tabs.mjs` owns that and this page does not have to think about it.
````

<a id="pack-23"></a>
## pack-23: demo/pack/index.html, inline script, line 346

````js
  /**
   * 🔴 NOTHING BUT THE WAY IN UNTIL A FILE LANDS, REPORTED BY SCREENSHOT
   * 2026-09-21 AS *"no files, no tabs no content"*. Three tab names, three
   * column headings and a ten cell readout, all of them naming things that are
   * not there, is a page describing a file nobody has opened.
   * ⚠️ IT IS ONE ELEMENT RATHER THAN SIX. Hiding each table, each heading and
   * the readout separately is six things to keep in step and one of them will
   * be forgotten; the tabs component holds every one of them.
   * ⚠️ AND `hidden` WORKS HERE BECAUSE `.pos-tabs` SETS NO `display`. Three
   * other components on this page needed an explicit `[hidden] { display:
   * none }` to make the attribute mean anything, and the table heading needed
   * one TODAY. Checked rather than assumed, and the check reads the computed
   * style rather than the property.
   */
````

<a id="pack-24"></a>
## pack-24: demo/pack/index.html, inline script, line 364

````js
  /**
   * ⚠️ THE COUNT IS APPENDED TO THE LABEL RATHER THAN REPLACING IT, and a tab
   * with nothing in it keeps its bare word. A `0` next to a name reads as a very
   * confident measurement of nothing, which is the rule the readout already
   * states about a cell pre-set to zero.
   * 🔴 AND THE COUNT LEADS, ASKED FOR 2026-09-21 AS *"put counts on front of tab
   * titles"*. It read `PATCHES 64` and it reads `64 PATCHES` now. `BACKLOG.md`
   * had this open as the one detail a reverted agent changed that nobody had
   * actually decided, because the original ask said to add a count and never
   * said which end. This is the answer to that.
   */
````

<a id="pack-25"></a>
## pack-25: demo/pack/index.html, inline script, line 378

````js
      // ⚠️ ONE OF A THING LOSES THE `s`, ASKED FOR AS *"1 sessions <- lose s
      // when single"* and then *"same for patches / samples"*. `1 SESSIONS` is
      // a count arguing with its own noun.
````

<a id="pack-26"></a>
## pack-26: demo/pack/index.html, inline script, line 382

````js
      /**
       * 🔴 AND A TAB WITH NOTHING BEHIND IT IS SWITCHED OFF, asked for against a
       * screenshot of an empty SAMPLES tab holding a player and the words
       * `press a sample to open it here` with no samples in it. A tab is a
       * promise that there is something under it. It is the same rule as a
       * column heading over no rows and an empty box painting a line.
       * ⚠️ NOT BEFORE A FILE IS OPEN, THOUGH: with nothing open the whole tab
       * strip is away, and three greyed words would be a worse answer than no
       * words. This only runs once something has landed.
       */
````

<a id="pack-27"></a>
## pack-27: demo/pack/index.html, inline script, line 396

````js
  /**
   * 🔴 FIVE COLUMNS AND NOT EIGHT, AND THE SIXTH WAS CUT AFTER MEASURING.
   * MEASURED at 390 px with six: the row came out 598 px, so a phone had 240 px
   * of sideways drag. `kind` went rather than another for TWO reasons, and one
   * of them has since expired. The one that stands: this page is for what a
   * patch is MADE of, and a category is a label somebody typed rather than a
   * part of the sound. The one that is gone: it was the weakest column on the
   * evidence, because Novation published no label table for that byte, seven of
   * its fifteen values had been recovered by correlation, and **16 of 64 rows
   * here would have shown a bare number**. All fifteen are named now, read off
   * Novation's own editor, and this bank measures **0 of 64 unnamed**. The
   * column stays out on the first reason and on the 240 px above, and the
   * category is on every row's hover and in the picture's caption.
   * ⚠️ EVERY HEADING IS ONE SHORT WORD AND NEVER WRAPS. A wrapping heading is a
   * table reporting that its columns do not fit, in the one place a reader
   * cannot act on it.
   */
````

<a id="pack-28"></a>
## pack-28: demo/pack/index.html, inline script, line 427

````js
  /**
   * 🔴 `nearest` IS THE COLUMN THAT ANSWERS THE QUESTION THE OTHERS CANNOT, and
   * it exists because entropy was measured failing at it today. A stock
   * `Initial Session` is not blank: it has ordinary entropy and an ordinary
   * non-zero share, so every number this page had said it was somebody's work.
   * MEASURED on the owner's pack: the three stock slots sit **one byte** from
   * each other, and the closest pair among the other 29 is **415 bytes** apart.
   * ⚠️ AND IT IS SHOWN AS A NUMBER RATHER THAN CLASSIFIED, so there is no
   * threshold in this page to argue with. A reader seeing `1, 1, 1` against
   * `262` and up does not need to be told which ones are copies.
   */
````

<a id="pack-29"></a>
## pack-29: demo/pack/index.html, inline script, line 442

````js
      /**
       * 🔴 TEN READOUT CELLS BECAME COLUMNS ON 2026-09-21, ASKED FOR BY QUOTING
       * THE WHOLE READOUT AND SAYING *"put this to table"*, then *"...and rm
       * readout"*. It is the third time in one day the same correction has been
       * made on this page, after the sample player's sentence and the region
       * line, and the pattern is worth naming: **a readout answers *what is
       * this one* and a column answers *which of these is different***. With
       * 32 sessions in front of you the second question is the one worth a
       * surface, and the first is what the marked row already is.
       * ⚠️ `written` DID NOT GET A COLUMN, because it was `used` under another
       * name. Two columns of one number is the disagreement this project keeps
       * paying for, arriving by way of a rename.
       */
````

<a id="pack-30"></a>
## pack-30: demo/pack/index.html, inline script, line 471

````js
  /**
   * 🔴 THE LIST OPENS, ASKED FOR 2026-09-21 AS *"make session list clicable and
   * show data below what you extracted"*. The five columns in the list are what
   * a reader SCANS; these two tables are what the decoder actually got out of
   * the pressed file, and until today `circuit-session.mjs` read all of it and
   * the page showed a hover.
   * ⚠️ IT IS THE SAME ARRANGEMENT THE PATCHES TAB ALREADY HAS: a list, and one
   * detail panel under it for the pressed row. A press changes the words in a
   * panel that is already there rather than making one appear, because
   * `fill()` opens the first row the moment a pack is read, exactly as it does
   * for patches.
   * ⚖️ AND WHAT A FIELD MEANS IS STILL NOT GUESSED. `circuit-session.mjs`
   * decodes two things by name, the four byte head and the 32 byte name, and
   * both are corroborated against `index.json`. Everything else here is a
   * count, an offset or a byte total, which is what that module offers.
   */
````

<a id="pack-31"></a>
## pack-31: demo/pack/index.html, inline script, line 487

````js
  /**
   * 🔴 A READOUT AND NOT A TWO COLUMN TABLE, ASKED FOR 2026-09-21 AS *"convert
   * to readout"*. A `field` / `value` table is a readout with a heading over it
   * and one fact per row, which is the shape the kit already owns and does
   * better: cells side by side, `tabular-nums`, a reserved width so a changing
   * number cannot move its neighbours.
   * 🔴 TEN CELLS, BECAUSE `createReport` THROWS ON AN ODD COUNT and the facts
   * were eleven. The one that went is `name`, and it went UP rather than out:
   * it is in the line under this readout, where a 32 byte name has a whole line
   * to sit on instead of a cell with a reserved width.
   * ⚠️ AND EVERY CELL HERE CAN CHANGE. `head` is USER, DEMO or INIT, `marker`
   * is present or absent, and the eight numbers all move between sessions. A
   * cell showing a structural constant reads as a measurement and teaches a
   * reader to ignore the row.
   */
````

<a id="pack-32"></a>
## pack-32: demo/pack/index.html, inline script, line 502

````js
  /**
   * 🔴 A TEN CELL READOUT AND A LINE OF PROSE STOOD HERE UNTIL 2026-09-21.
   * The readout went on being asked for in one message, *"head USER / marker DC
   * BB / written 15,046B ... - put this to table"*, then *"...and rm readout"*,
   * and the line in another, quoted in full and ending *"rm"*. Both were the
   * SELECTED session's facts restated above the list they came out of.
   * ✅ **THE CELLS ARE COLUMNS NOW AND THE LINE IS GONE.** What replaces them is
   * the thing neither could ever be: a picture of the notes.
   * ⚠️ AND ONE FACT FROM THE LINE HAD NOWHERE TO GO, so it got a column of its
   * own on the regions table below: the region SIZE, which is what made
   * `1 of 76, 16 of 1,508, 32 of 720, 1 of 6,004` legible. It was in a hover.
   * 🔴 AND THE PICTURE MOVED OUT FROM BETWEEN THE TWO TABLES ON 2026-09-22,
   * ASKED FOR AS *"rm current notes visualization, restore session and region
   * tables as they where"*. The two lists are a master and a detail and had a
   * third thing wedged between them; the picture belongs under the row it is
   * about, which is a REGION, and that row is on the lower table.
   */
````

<a id="pack-33"></a>
## pack-33: demo/pack/index.html, inline script, line 519

````js
  /**
   * 🔴 THE FIFTY REGIONS, WHICH ARE THE DECODER'S WHOLE MODEL OF THE FILE. A
   * header, sixteen synth slots at 1,508 bytes, thirty two drum slots at 720 and
   * a 6,004 byte tail, at the same offsets in all 32 of the owner's sessions and
   * in all 64 of the two purchased packs.
   * ⚠️ `used` AND `pad` ARE THE PAIR THAT MATTERS AND NEITHER MEANS ANYTHING
   * ALONE. A session is four fifths erased flash, so a region's size says almost
   * nothing and the bytes before the erasure starts say what is in it. That is
   * the same denominator trap this project published once and corrected.
   */
````

<a id="pack-34"></a>
## pack-34: demo/pack/index.html, inline script, line 532

````js
      /* 🔴 THE STRIDE, WHICH WAS THE ONE FACT THE REMOVED LINE CARRIED THAT NO
         COLUMN HAD. `1 of 76, 16 of 1,508, 32 of 720, 1 of 6,004` is the
         decoder's whole model of the file, and it was readable only by hovering
         fifty rows one at a time. */
````

<a id="pack-35"></a>
## pack-35: demo/pack/index.html, inline script, line 542

````js
    /* 🔴 THE REGIONS LIST OPENS, ASKED FOR 2026-09-22: *"when clicked on region
       on regions table, make that line active"*. It had `note: 'hover'` and no
       `onPick` at all, so fifty rows were readable one at a time and pressable
       never. The sessions table above it has had one since yesterday, so this
       is the same arrangement one level down. */
````

<a id="pack-36"></a>
## pack-36: demo/pack/index.html, inline script, line 551

````js
  /**
   * 🔴 THE SIXTEEN STEPS OF THE PRESSED REGION, UNDER THE STANDARD TRANSPORT.
   * Asked 2026-09-22: *"below it use out transport + timeline glued together
   * with the note events, x being time. if there is no time info, use pad
   * grid?"*.
   *
   * 🔴 IT IS THE PAD GRID AND NOT `createStripView`, AND THAT IS THE QUESTION
   * MARK IN THE ASK BEING ANSWERED WITH A MEASUREMENT. A strip draws a
   * MILLISECOND axis and labels it in seconds, `timeline/strip.mjs` has no
   * option to label one in anything else, and `circuit-session.mjs` reads no
   * tempo, no beat and no millisecond out of a session: a note has a STEP and a
   * GATE and nothing that converts either into a second. So every mapping of
   * these sixteen steps onto a strip would have printed a time on the axis that
   * came from this page rather than from the file, which is the one thing this
   * project has paid for over and over.
   * ⚠️ AND `x` IS STILL TIME, AS FAR AS THE FILE CARRIES ANY: the sixteen
   * columns are the sixteen steps, in order, which is the only ordering of
   * events the file states.
   * ⚠️ THE GATE IS READ AND IS NOT DRAWN AS A WIDTH. Two reasons, and the
   * second is the one that decided it: the slots inside a step are independent
   * of the slots inside the next one, so a bar drawn from step 3 across four
   * steps would cover three other slots' own cells and claim they were empty.
   * The length is in the pad's hover, in steps, converted per encoding.
   *
   * 🔴 SIX ROWS, BECAUSE A STEP RECORD HOLDS SIX SLOTS. `STEP_SLOTS` is read
   * from the decoder rather than typed here, and the slot index is the bit
   * position in the step's own mask. It is a storage order and it is not a
   * pitch order, which is why the rows are named `slot` and not anything
   * musical: this page calls a region `region 3` for the same reason.
   */
````

<a id="pack-37"></a>
## pack-37: demo/pack/index.html, inline script, line 581

````js
  /**
   * Which row of the REGIONS table is open, and where the step head sits in it.
   * `-1` is the state the ask calls *"not selected region"*, and it is the state
   * a session opens in.
   * ⚠️ DECLARED HERE RATHER THAN WITH THE REST OF THE PAGE'S STATE, BECAUSE
   * `moveHead(0)` RUNS A FEW LINES BELOW. A `let` shadows its whole block from
   * the top, so reading one from a line above its declaration is a temporal
   * dead zone throw, and this project has already lost seven asserts to exactly
   * that, silently, with the page reading green on a smaller count.
   */
````

<a id="pack-38"></a>
## pack-38: demo/pack/index.html, inline script, line 612

````js
  /**
   * 🔴 THE TRANSPORT HAS NO PLAY BUTTON, AND THAT IS THE SAME MEASUREMENT AS
   * THE PARAGRAPH ABOVE RATHER THAN A SECOND DECISION. Play is a claim that
   * there is a rate at which this runs, and the file names none. A toggle whose
   * only honest behaviour is to do nothing is the shape of control this project
   * calls a lie, and `transport-bar.mjs` has carried `toggle: false` for
   * exactly this case since 2026-09-16.
   * ✅ WHAT IT CAN HONESTLY DO IS MOVE ONE STEP AT A TIME, which is `‹` and `›`,
   * the same pair `/reel/` and `/tapes/` carry. The head is a step index, the
   * clock says which step it is on, and neither is a time.
   * ⚠️ `publish: false`, FOR THE SAME REASON THE SAMPLES BAR PASSES IT: this
   * page has two bars and `__demo.transport` may name only one. Neither claims
   * it, because nothing on this page can advance a position until a file has
   * been opened and a row pressed, and `demo/verify.mjs`'s play drill would go
   * red on a page where nothing is wrong.
   */
````

<a id="pack-39"></a>
## pack-39: demo/pack/index.html, inline script, line 632

````js
    // 🔴 THE CLOCK NEVER PRINTS A TIME. `fmt` gets the whole line, so there is
    // no `0:00.000` and no total beside it: the deck's unit here is one step
    // and the readout says so in the same words the picture does.
````

<a id="pack-40"></a>
## pack-40: demo/pack/index.html, inline script, line 642

````js
  /* 🔴 TWO BLOCKS, NOT ONE, AND ALL FOUR PARTS WERE IN ONE GLUE UNTIL
     2026-09-22. Reported with a screenshot of the sessions list running
     straight into the regions heading, as *"have space betwen tables"*.
     ⚠️ **THE GAP WAS NOT MISSING, THERE WAS NOTHING FOR IT TO ACT ON.**
     `.pos-tabs-p > * + *` carries 22 px and the panel had exactly ONE child, so
     the rule was working perfectly against a list of one. `positron-ui` records
     the same shape on `/held/`, which shipped glued because `.pos-body` held a
     single `.pos-glue`. **Before hunting for a rule that lost, count the
     siblings.**
     ⚠️ AND IT IS A GLUE'S OWN RULE BEING KEPT RATHER THAN A LAYOUT PREFERENCE.
     `createGlue` is for parts that are ONE surface, and its whole point is that
     a reader can tell which control belongs to which picture. The regions
     table, the transport and the step grid are that: a list, the head that runs
     across it, and the picture the head runs across. The SESSIONS list is not.
     It is the thing you press to decide what the other three are about.
     ⚠️ THE ORDER INSIDE THE GLUE IS UNCHANGED. `/replay/`, `/reel/`, `/stage/`
     and `/held/` all put the bar ABOVE the thing it drives, and *"transport +
     timeline"* is that order written out. */
````

<a id="pack-41"></a>
## pack-41: demo/pack/index.html, inline script, line 667

````js
  /**
   * 🔴 THE SAMPLES TAB, ASKED FOR AS *"why there is no samples?"*. The plan
   * deferred them on the reasoning that drawing a waveform is a different page,
   * and that reasoning is spent the moment there are tabs: a tab is where a
   * third list goes.
   * ⚠️ NO COLUMN HERE IS CONSTANT. MEASURED across the pack's 64: every one is
   * 48 kHz, 16 bit and mono, so a rate or a channel column would be the same
   * value sixty four times, which teaches a reader to ignore the row. Length and
   * size both move.
   * 🔴 AND A SAMPLE SOUNDS ON A PRESS AND NEVER OTHERWISE. Decoding 64 WAVs into
   * an `AudioContext` on a visit is the load-on-a-visit defect this project has
   * paid for three times.
   */
````

<a id="pack-42"></a>
## pack-42: demo/pack/index.html, inline script, line 684

````js
      /**
       * 🔴 `frames` AND `rate` ARE HERE BECAUSE A SENTENCE UNDER THE PLAYER WAS
       * CARRYING THEM. Asked 2026-09-21, quoting it: *"`slot 55, 0.25 s, 12,143
       * frames at 48000 Hz, peak 0.86` - this goes to the table, rm from here"*.
       * Every one of those five facts is a CELL, and four of them already had a
       * column; the line was gluing them into prose, which is the middot rule
       * wearing different punctuation.
       * ⚠️ AND THEY WERE IN THE `hover` ALREADY, which is not the same thing: a
       * hover is one row at a time and answers *what is this one*, a column
       * answers *which of these is different*. The rate is the fact a bulk
       * transfer makes worth scanning, because a pack can mix them.
       */
````

<a id="pack-43"></a>
## pack-43: demo/pack/index.html, inline script, line 705

````js
  /**
   * 🔴 THE TOTALS LINE IS GONE FROM THE PAGE AND ITS TWO UNHOUSED FACTS ARE IN
   * THE LOG. Asked 2026-09-22 by quoting it whole: *"pack#samples 64 of 64
   * read, all 48 kHz 16 bit mono, 0.12 s to 2.00 s, 53.4 s in total -- rm"*. It
   * was six facts glued into one sentence above a table that already carries
   * four of them as columns: the rate is a column, the length is a column, the
   * shortest and the longest are that column sorted, and the depth and the
   * channel count are in every row's hover.
   * ✅ **THE TWO THAT HAD NO COLUMN ARE LOGGED**, which is the rule about
   * deleting a display without deleting what it said. `refused` is the number
   * that matters most here, because `summariseAll` counts a file that would not
   * parse rather than dropping it and a total over the ones that worked hides
   * the only thing worth seeing. The other is the total length, which is a fact
   * about the SET and can never be a column. The log is where a state change
   * belongs and opening a file is one.
   */
````

<a id="pack-44"></a>
## pack-44: demo/pack/index.html, inline script, line 722

````js
  /**
   * 🔴 THE TRANSPORT UNDER THE WAVEFORM IS GONE, ASKED FOR 2026-09-29 AS *"pack:
   * sample player: rm transport below waveform. rm border around waveform. use
   * glued panel"*. What stood here was `createTransportBar` on a follower deck,
   * with `play`, `pause` and `seek` in its `command` and a `Loop` toggle in its
   * `loopSlot`, and `.pk-player` was the ground under it.
   *
   * 🔴 THE PAGE IS STILL PLAYABLE AND ALWAYS WAS, WHICH IS WHY THIS IS A REMOVAL
   * AND NOT A LOSS. `onPick: (r) => openSample(r.i, true)` on the samples table
   * is a press on a ROW, and that press is what decodes a slot and starts a
   * voice. The bar's `play` called the same function one surface further down.
   *
   * 🔴 AND `Loop` DIED WITH IT, WHICH IS A CONTROL THAT WAS ASKED FOR BY NAME.
   * 2026-09-21: *"move sample player below table, add loop"*. NOTHING ON THIS
   * PAGE CAN LOOP A SAMPLE NOW, because looping is one boolean on the running
   * `AudioBufferSourceNode` and there is no control left to write it. That is the
   * ask being carried out rather than an oversight, and no replacement was
   * invented: whether it comes back is somebody's decision and not this file's.
   *
   * ⚠️ WHAT WENT WITH THE BAR, SO NOBODY LOOKS FOR IT LATER: the follower `deck`,
   * the `looping` flag, the `loopBtn` and `playBtn` handles, and `playSample`'s
   * `from` argument, whose only caller was the bar's `seek`. `createDeck` and
   * `createTransportBar` ARE STILL IMPORTED, because the SESSIONS tab's step bar
   * is built from both and this ask is not about that tab.
   *
   * ⚠️ AND THE PICTURE KEEPS ITS OWN HEAD. `wave.playhead()` is driven off
   * `AudioContext.currentTime` exactly as it was, so a playing sample still has a
   * line crossing it. What is gone is a second reading of that one position on a
   * slider, which is the rule about one position surface per page arriving from
   * the other direction.
   *
   * ⚠️ AND THE ARGUMENT FOR NOT USING `looper.mjs` HERE IS KEPT, because it is
   * about what a loop IS rather than about this control. That module owns a RING
   * fed by a tap on a live graph, it refuses anything under a quarter of a
   * second, and a sample is already a whole buffer sitting in memory: using it
   * would mean playing the sample into a tap and capturing it back in real time
   * to get something we are holding already. What it would really bring is its
   * five ways, `round back half chop pingpong`, which would be worth having on a
   * drum sample. That is a component change and nobody has asked for it.
   */
````

<a id="pack-45"></a>
## pack-45: demo/pack/index.html, inline script, line 763

````js
  /**
   * 🔴 THE WAVEFORM SITS UNDER THE LIST, ASKED FOR 2026-09-21 as *"add waveform
   * visualiser to pack"* and then *"its glued to top of transport"*. The
   * transport it was glued to the top of came out on 2026-09-29, so the surface
   * is two parts now, the list and the picture of the open sample, and a third
   * that is on screen only when there is no picture to draw.
   * ⚠️ IT DRAWS AND IT DOES NOT PLAY. This page owns the `AudioContext` and
   * already builds an `AudioBuffer` out of `toMono`, so the view is handed a
   * position and never a sound. Two audio paths in one page is the shape
   * `positron-ui` records three pages paying for.
   * ⚠️ AND IT IS NOT ON SCREEN UNTIL THERE IS SOMETHING TO DRAW. The component
   * hides itself until `set()`, which is the same rule as the drop footer and
   * the empty table heading: a container with nothing in it must not paint its
   * edges.
   */
````

<a id="pack-46"></a>
## pack-46: demo/pack/index.html, inline script, line 778

````js
  /**
   * 🔴 IT IS `grain-scope.mjs`, WHICH IS THIS SITE'S WAVEFORM, AND IT WAS
   * `wave-view.mjs`, WHICH WAS THIS PAGE'S. Asked 2026-09-21 as *"use standard
   * wave visualizer (what we had in radio wtc...)"* and then settled three
   * messages later as *"use same component in pack"*. `/archive/radio/`, `/tapes/` and
   * `/grains/` all draw with the scope; `wave-view` had exactly one caller,
   * which was this page, so "the standard one" was the one this page was not
   * using.
   * ⚠️ THE SCOPE DRAWS A HELD BUFFER AS WELL AS A LIVE ONE, which is what made
   * the swap possible rather than a rewrite: `buffer(peaks)` is its own comment's
   * *"the held sound itself, as peaks. This is what makes the rest legible"*,
   * and `/grains/` already inspects a fixed buffer through it.
   * ⚠️ AND NO `fullScale`, DELIBERATELY. That option locks the vertical scale so
   * a live stream stops heaving as loud passages scroll off; a sample sitting
   * still has nothing to scroll and its relative shape is the subject, which is
   * the same reasoning `/grains/` is given in that file.
   */
````

<a id="pack-47"></a>
## pack-47: demo/pack/index.html, inline script, line 795

````js
  /**
   * 🔴 `createGlueRows` AND NOT `createGlue`, ASKED FOR AS *"use glued panel"*.
   * `createGlue` takes every part in one call and is the pair it was written for;
   * the rows surface adds them one at a time and owns each row's inset and
   * alignment through `pad`, `align`, `full` and `grid`, which is what a panel
   * means on `/kit/`, `/knobs/`, `/muta/` and `/shape/`.
   * 🔴 NOT `createInstrumentPanel`, WHICH WAS PRICED AND REFUSED BEFORE ANY OF
   * THIS WAS WRITTEN. That one is this surface plus a picture row, control rows
   * and a nameplate at the foot. There is no instrument on this tab and no name
   * to put on a plate.
   * ⚠️ `full: true`, BECAUSE A TABLE IS A STRIP ACROSS THE PAGE RATHER THAN AN
   * OBJECT AT ITS OWN SIZE. `.pos-rows` is `width: fit-content`, which is right
   * for four knobs on a pedal and wrong for a six column list; `.pos-glue` on its
   * own is a block and was width auto. MEASURED before: the surface was 688 px in
   * a 688 px panel, so this is what keeps the tab the width it already had.
   * ⚠️ AND THE ROWS ARE `pad: false` EXCEPT THE WORDS. The list and the picture
   * go edge to edge, which is what a picture wants and what the table already got
   * inside the glue; a sentence needs the row's own `--rows-gap --rows-pad` so
   * its first glyph starts where every other ink on the page starts.
   */
````

<a id="pack-48"></a>
## pack-48: demo/pack/index.html, inline script, line 817

````js
  /**
   * 🔴 THE PICTURE'S HOST IS THE ROW ITSELF, CARRYING THIS PAGE'S OWN `.pk-wave`,
   * AND THE ALTERNATIVE WAS MEASURED RATHER THAN ARGUED ABOUT. `.pk-wave` was a
   * `<div>` inside the glue and the scope went inside that, which put the scope
   * TWO levels under the surface. `shell.css` zeroes a glued scope's margin with
   * `.pos-glue > .pos-scope, .pos-glue > * > .pos-scope`, and it says in its own
   * comment why the second half exists: `/archive/radio/` glues the scope straight in and
   * this page wrapped it. A row between them makes the scope THREE levels down,
   * where neither half of that selector reaches, and `.pos-scope` is
   * `margin: 22px 0 12px`. So keeping the wrapper would have put 22 px of `--card`
   * above the canvas and 12 below it, inside the glued part, which is the inset
   * removed from this exact page on 2026-09-22 (*"rm padding and its border
   * around waveform canvas"*) arriving again by a different road.
   * ✅ THE ROW IS THE HOST, SO THE SCOPE IS A DIRECT CHILD OF A DIRECT CHILD AND
   * THE KIT'S RULE REACHES IT WITH NOTHING WRITTEN HERE. `cls` puts `.pk-wave` on
   * the row, so the page rule that paints the picture's ground is unchanged and
   * still applies to the picture's host.
   * ⚠️ AND THE GROUND IS PAINTED TWICE ON PURPOSE. `.pos-rows-r` carries
   * `background: var(--card)` and so does `.pk-wave`, and this page has paid three
   * times for a glued part with no ground of its own: the glue is `gap: 1px` over
   * a `--line` ground, so a transparent part lets that colour through its whole
   * area and the seam stops being a seam. Two declarations of one colour is
   * cheaper than the fourth time.
   */
````

<a id="pack-49"></a>
## pack-49: demo/pack/index.html, inline script, line 843

````js
  /**
   * 🔴 THE REFUSAL LINE, WHICH IS WHERE `playBtn.disabled` WENT. The greyed play
   * button was the only thing on screen at rest saying that a file had opened and
   * would make no sound, and the transport it lived on is gone. This row says it
   * in words, in the slot the picture would have had, and the two are mutually
   * exclusive: for any open sample there is a picture or there is a sentence.
   * ⚠️ IT SAYS THE SHORT FACT AND NOT THE WHOLE REASON. The reason is long prose
   * out of `circuit-sample.mjs`, the kind that runs to two clauses and a colon,
   * and it is already in two places a reader can reach, the row's own hover and
   * the log. This page has been corrected three times for saying one fact on
   * three surfaces, and a third copy of a paragraph that can wrap to a different
   * number of lines per sample is also a box that changes its own height.
   * ⚠️ AND THE TWO WORDINGS ARE CONSTANTS, so an assert reads the string the page
   * shows rather than a second copy of it typed into a check.
   */
````

<a id="pack-50"></a>
## pack-50: demo/pack/index.html, inline script, line 862

````js
  /**
   * 🔴 THE PAGE HIDES ITS OWN PART, BECAUSE THE SCOPE DOES NOT HIDE ITSELF AND
   * SHOULD NOT. `/archive/radio/` draws a scrolling picture from `feed()` before any
   * peaks exist, so a component that vanished without a buffer would blank the
   * page it was built for. `wave-view` hid itself and this page relied on it;
   * with the swap the rule moves to where it is true, which is here.
   * ⚠️ AND IT IS `hidden` ON THE GLUED PART, not on the canvas, or the glue
   * keeps a 1 px seam round nothing.
   * 🔴 THE GLUED PART IS THE ROW SINCE 2026-09-29. This was `waveHost.hidden`
   * while the surface was `createGlue`, where the host WAS a child of the glue.
   * On `createGlueRows` the child of the glue is the row, and `.pos-rows-r` paints
   * `--card` and takes the surface's `gap: 1px` whatever is inside it, so a
   * hidden host in a shown row is the 1 px seam round nothing that the line above
   * warns about. `.pos-rows-r[hidden] { display: none }` is the kit's own answer
   * and it is why the switch is the row and nowhere else.
   */
````

<a id="pack-51"></a>
## pack-51: demo/pack/index.html, inline script, line 881

````js
  /**
   * 🔴 IS THIS PART BEING DRAWN, READ OFF THE SCREEN RATHER THAN OFF AN
   * ATTRIBUTE. `el.hidden` is a fact about an attribute and `display` is a fact
   * about what a reader can see, and this page is where the difference was paid
   * for: its own `an empty table draws no heading` assert read `head.hidden ===
   * true` and passed every run while three headings were on screen.
   * ⚠️ AND THE RECT IS A SECOND, WEAKER TEST THAT ONLY MEANS ANYTHING WITH THE
   * TAB OPEN. An inactive tab panel has no layout at all, so every rect inside it
   * reads zero while `getComputedStyle` goes on answering real values, which is
   * the half-true measurement this page's own glue check was caught making.
   * `away()` is the half that holds whatever tab is open; `onScreen()` is the
   * half that needs this tab to be the open one.
   */
````

<a id="pack-52"></a>
## pack-52: demo/pack/index.html, inline script, line 902

````js
    /* ⚠️ AGAINST THE FIELD, NOT AGAINST TRANSPARENT. This canvas paints its own
       background, so every pixel is opaque and an alpha test counts the whole
       box. `--card` is what an empty scope is, so anything else is a wave. */
````

<a id="pack-53"></a>
## pack-53: demo/pack/index.html, inline script, line 919

````js
  /* ⚠️ MODULE SCOPE SINCE 2026-09-21, and it was local to `showSession`. The
     sessions TABLE formats the same numbers now, so a helper that only one
     function could see was a second copy waiting to be typed. */
````

<a id="pack-54"></a>
## pack-54: demo/pack/index.html, inline script, line 923

````js
  /**
   * 🔴 THE SCOPE TAKES PEAKS, NOT SAMPLES, and that is the whole of the adapter
   * between a held `AudioBuffer` and a component built for a live ring. One
   * amplitude per column, taken as the largest magnitude in that column, which
   * is what a waveform is: `grain-scope` mirrors it around the centre itself.
   * ⚠️ 480 COLUMNS RATHER THAN ONE PER PIXEL. The picture is redrawn on resize
   * and on every frame while a sample plays, and rebuilding an envelope from
   * 72,000 frames at 60 Hz is work nobody asked for. 480 is finer than the
   * widest this box gets and is computed once per sample.
   */
````

<a id="pack-55"></a>
## pack-55: demo/pack/index.html, inline script, line 954

````js
  /**
   * 🔴 IT IS UNDER THE TABLE RATHER THAN LAST ON THE PAGE, WHICH IS A DOCUMENTED
   * EXCEPTION TO A STANDING RULE AND NOT AN OVERSIGHT. Instructed 2026-09-21:
   * *"patches: patched table 1/2 less high, diagram under it, reserver space
   * when no active one"*. `positron-diagram` says every diagram passes
   * `{ how: true, atEnd: true }` and sits last, because a diagram is REFERENCE
   * and putting one above the controls delays what a visitor came for.
   * ✅ **THE SMALLEST AMENDMENT THAT HONOURS THE ASK IS TO MOVE THE POSITION AND
   * NOTHING ELSE.** Same component, same standing `How it works` heading, no
   * title of its own, and `atEnd: false` so it lands where the selection is.
   * **This picture is not reference, it is the detail panel for the pressed
   * row**, and a detail panel two screens below the row it describes is not one.
   *
   * 🔴 AND IT IS DRAWN BEFORE ANYTHING IS OPENED, WHICH IS WHAT RESERVES THE
   * SPACE. Every box carries the reference's own default, built from the address
   * table rather than typed, so the picture has exactly the size it will have
   * once a patch is pressed and nothing below it moves. An empty box is shorter
   * than one with a sub, so leaving the subs blank would have reserved the wrong
   * height, which is the same shape of mistake as a `min-height` that never
   * applied.
   */
````

<a id="pack-56"></a>
## pack-56: demo/pack/index.html, inline script, line 977

````js
          /* 🔴 `fourteen` UNTIL 2026-09-22, AND IT WAS THE OTHER HALF OF THE
             SPLIT. `FIRST_WAVETABLE` is 14, which is the count of PLAIN
             waveforms and the INDEX the tables start at, and
             `OSC_WAVES.slice(14)` is 16 rows long. One constant, two meanings,
             and the note took the wrong one. MEASURED today: 30 total, 14
             plain, 16 tables. ⚠️ It reached this page, `BACKLOG.md` and a
             briefing before an agent building a waveform view measured it and
             sent it back. **A number in prose is checkable and was not
             checked.** */
````

<a id="pack-57"></a>
## pack-57: demo/pack/index.html, inline script, line 1010

````js
    // ⚠️ THESE THREE ARE `sound` LIKE EVERYTHING ELSE, AND THE FIRST DRAFT MADE
    // THEM `graphics` TO SET THEM APART. `TECH_HUE` is one colour per technology
    // across every diagram in this project, and `graphics` means anything that
    // draws, in six other pictures. Borrowing it to mean *not audio* here would
    // teach a reader a colour that is false everywhere else. One instrument, one
    // colour; what says the LFOs are not in the signal path is that their arrows
    // go to the matrix and not to the mixer.
````

<a id="pack-58"></a>
## pack-58: demo/pack/index.html, inline script, line 1052

````js
  /**
   * 🔴 THE PICTURE LIVES IN A HOST OF ITS OWN SO IT CAN BE PUT AWAY WHOLE.
   * `createDiagram` appends TWO things to whatever it is given, the standing
   * `How it works` heading and the figure, and hiding the figure alone would
   * leave a heading standing over nothing. One wrapper hides both.
   */
````

<a id="pack-59"></a>
## pack-59: demo/pack/index.html, inline script, line 641

````js
  /**
   * 🔴 NOTHING IS PAINTED AT REST, AND `defaultPatch()` IS STILL HERE FOR THE
   * CHECK RATHER THAN FOR THE PAGE. The picture used to be drawn on load
   * carrying the reference's own default, which reserved its room; the
   * instruction on 2026-09-21 was *"do not show diargam when no file"*, so
   * there is nothing to reserve room for until something is open.
   * ⚠️ THE DEFAULT IS STILL WORTH KEEPING because it is the only patch this
   * page can build without a file, and the check uses it to prove the picture
   * really is absent rather than merely empty.
   */
````

<a id="pack-60"></a>
## pack-60: demo/pack/index.html, inline script, line 676

````js
      // ⚠️ A `.syx` LONGER THAN ONE MESSAGE IS A BANK, and a bank is 64 Replace
      // Patch messages by the reference's own definition, which is the flash
      // writing one. Scanning it is how that gets said rather than refused.
      // 🔴 OR IT IS A BULK TRANSFER, WHICH IS WHAT THE BIG ONES IN THE ARCHIVE
      // DOWNLOAD ARE. `80S Drums_sampleset.syx` is 6,753,638 bytes with not one
      // patch message in it, and this page used to answer *"is 6753638 bytes and
      // a Circuit patch is 350"*, which is true and useless about a file
      // carrying 64 samples and 21 seconds of audio.
````

<a id="pack-61"></a>
## pack-61: demo/pack/index.html, inline script, line 703

````js
  /**
   * One loose `.circuitsession`, which is a thing that exists on its own.
   *
   * 🔴 ITS TWO PATCHES ARE PAYLOADS, NOT MESSAGES, which is the whole reason
   * `readPatchData` exists. A session carries them as bare 340 byte runs with no
   * command byte and no frame, so reading them through `readPatch` would mean
   * BUILDING a SysEx message round them, and building a message is the first
   * half of sending one. That function does not exist here and this path is why
   * it does not have to.
   * ⚠️ AND A SESSION IS THE ONE FILE ON THIS PAGE THAT CANNOT WRITE FLASH BY
   * ITSELF, because it is not a message at all. It still says nothing about what
   * Components would do with it.
   */
````

<a id="pack-62"></a>
## pack-62: demo/pack/index.html, inline script, line 730

````js
  /**
   * 🔴 THE WAVS OUT OF ANY ZIP, WHICH SINCE 2026-09-28 IS NOT ONLY A PACK.
   * Asked for as *"pack: make support of any wavs in zip and change desc
   * accrodingly"*. Nothing here decodes anything: `circuit-sample.mjs` already
   * had `readWave` and `summarise`, and this is the loop that hands them a zip
   * entry, which `openPack` had inline and `openZip` now needs as well. A second
   * copy of it would have been the shape this project keeps paying for.
   *
   * 🔴 AND A MAC RESOURCE FORK IS A `.wav` BY ITS NAME AND NOTHING AT ALL BY ITS
   * CONTENT, SO IT NEVER REACHES THE TABLE. A zip made on a Mac carries
   * `__MACOSX/._<name>` of a few hundred bytes beside every real file. Letting
   * those in would put a refused row next to every real sample saying the file
   * does not start `RIFF`, which is a table of alarms that are all the
   * archiver's own packaging. The `.syx` branch below already knew
   * about this shape and answers it by taking the BIGGEST rather than the first,
   * which works for one file and cannot work for sixty four.
   * ⚠️ IT IS A NAME TEST AND NOT A SIZE THRESHOLD. A fork is small, and so is a
   * short drum hit: `0.12 s` of 48 kHz mono is 11.5 kB and the pack holds
   * shorter. Only the name says which is which.
   * ⚠️ AND BOTH SPELLINGS ARE REFUSED, the directory and the `._` prefix, because
   * a fork that has been extracted and re-zipped keeps the second and loses the
   * first.
   *
   * ⚠️ THE ORDER IS THE ARCHIVE'S OWN, which is what `openPack` has always done
   * and is the only honest answer for a zip somebody made themselves.
   * `samplesIn()` in `circuit-sample.mjs` sorts by the trailing number instead,
   * because `sample_10.wav` has to follow `sample_2.wav` in a pack whose slots
   * ARE those numbers. In a bag of drum hits called `Kick 1.wav` and `Bass
   * 3.wav` that same sort is a reordering nobody asked for, so this page does
   * not use it.
   */
````

<a id="pack-63"></a>
## pack-63: demo/pack/index.html, inline script, line 774

````js
  /**
   * 🔴 A REAL DOWNLOAD IS A ZIP OF PACKS, NOT A PACK, AND THE FIRST BUILD
   * REFUSED IT. MEASURED on the soundbank in `purchased/`: 2 `.circuitpack`, 1
   * `.circuittrackspack`, 128 `.syx`, an `.xlsx`, two `.txt` and 10 `.url` in one
   * archive. `unzip.mjs` already reads a zip inside a zip, which is how both of
   * those packs were measured.
   * ⚠️ A `.circuittrackspack` IS FOR THE OTHER INSTRUMENT and is named rather
   * than opened. `research/circuit-soundbank-2026-09-21.md` §5 measured that.
   *
   * 🔴 AND A ZIP OF PLAIN WAVS IS A SAMPLE SET, WHICH THIS REFUSED UNTIL
   * 2026-09-28. It filtered for `.circuitpack`, `.circuittrackspack` and `.syx`,
   * and a bag of drum hits fell all the way through to *holds no Circuit pack
   * and no patches*, on a page whose third tab is samples and whose reader had
   * been reading WAVs out of packs since the day it was written. The reading side
   * needed nothing: this is a filter and a branch.
   * ⚠️ AND A ZIP HOLDING BOTH LOOSE PATCHES AND WAVS NOW SHOWS BOTH. `fill()`
   * always took three lists and the `.syx` branch was passing an empty one for
   * the third.
   */
````

<a id="pack-64"></a>
## pack-64: demo/pack/index.html, inline script, line 815

````js
      // 🔴 A ZIP HOLDING ONE BIG `.syx` AND NO PATCHES IS A BULK TRANSFER IN A
      // BAG, WHICH IS WHAT `Roland_Classics.zip` AND `drum_and_synth_samples.zip`
      // ARE. Handing a 6,753,638 byte file to `readPatch` printed one line about
      // a length and showed nothing.
      // ⚠️ THE BIGGEST ONE, NOT THE FIRST. Both of those zips were made on a Mac
      // and carry a `__MACOSX/._<name>.syx` resource fork of a few hundred bytes
      // beside the real file, which is a `.syx` by its name and nothing at all
      // by its content.
````

<a id="pack-65"></a>
## pack-65: demo/pack/index.html, inline script, line 832

````js
    // ⚠️ READ LAST, AND THAT IS ARITHMETIC RATHER THAN TIDINESS. Every branch
    // above returns without them, and `Roland_Classics.zip` carries 48 real
    // WAVs beside its bulk transfer, so reading them at the top of this function
    // would decode 5.7 MB of audio on the way to throwing it away.
````

<a id="pack-66"></a>
## pack-66: demo/pack/index.html, inline script, line 838

````js
      // ⚠️ NO EXTRA SENTENCE HERE. `fill()` logs how many of them read and how
      // many were refused, which is the one thing a bag of somebody else's WAVs
      // can be wrong about, and the footer carries the file's name the way it
      // does for every other way in.
````

<a id="pack-67"></a>
## pack-67: demo/pack/index.html, inline script, line 849

````js
  /**
   * 🔴 A FILE THAT IS NOT A ZIP IS NOT NECESSARILY HARMLESS, AND THIS PAGE USED
   * TO SAY `did not read as a pack` AND STOP. MEASURED 2026-09-21 on a file
   * called `on_the_run.circuitpack` from a public archive: it is **not a zip at
   * all**, it is a raw stream of **6,930 SysEx messages**, and 64 of those are
   * Circuit patch messages carrying **command byte `01`, `Replace Patch`, the
   * one that writes FLASH**, aimed at **every slot from 0 to 63**. The extension
   * says pack, Novation Components would refuse it, and the next thing anybody
   * reaches for is a SysEx tool, which is the one route with no safety rail.
   * **So the most dangerous shape a file can have was the one this page had
   * nothing to say about.**
   * ⚠️ READING ONE IS STILL FREE and the patches in it are shown, because
   * nothing here can send anything. What changes is that the page says out loud
   * what the file would do in a tool that can.
   */
````

<a id="pack-68"></a>
## pack-68: demo/pack/index.html, inline script, line 864

````js
  // ⚠️ AND THE SCANNING IS A KIT MODULE RATHER THAN A FUNCTION ON THIS PAGE.
  // It WAS a function on this page for about an hour, which made this the second
  // place in the repository that knew how to walk a sysex stream. `circuit-syx.mjs`
  // is 23 asserts with sabotages behind it, it answers `writesFlash` FIRST, and
  // it reads the session payloads too, which the page's own version could not.
````

<a id="pack-69"></a>
## pack-69: demo/pack/index.html, inline script, line 869

````js
  /**
   * 🔴 AND SINCE 2026-09-21 IT READS THE SAMPLES OUT OF ONE TOO, WHICH IS THE
   * half this page could not see. `sampleSetIn` splits the file on its stream
   * starts and ends BEFORE it unpacks anything, checks each stream against the
   * length it declares and the CRC32 it carries, and refuses one that fails.
   * MEASURED: eleven `.circuitpack` files in the archive download carry 64
   * samples each and this page called them `did not read as a pack`.
   * ⚠️ `sessions` STILL COMES FROM `survey()` AND IT IS NOT TRUSTWORTHY ON A
   * FILE WITH A SAMPLE TABLE IN IT. `sessionsIn()` concatenates every carrier in
   * the file before slicing at 53,248, so a two stream `.circuitpack` answers
   * 141 where the answer is 33, and a pure sample transfer answers 108 where the
   * answer is 0. That defect is in `circuit-syx.mjs` and is REPORTED rather than
   * repaired here. What this function does about it is refuse to pass the count
   * on when a sample stream is present, which is `sampleSetIn`'s `sampleStreams`
   * saying so rather than this page guessing.
   */
````

<a id="pack-70"></a>
## pack-70: demo/pack/index.html, inline script, line 900

````js
  /**
   * What a bulk transfer is, in the log, before anything is shown from it.
   * ⚠️ IT ALWAYS SAYS WHY A STREAM WAS REFUSED. A file whose checksum fails is
   * a file whose audio is wrong by at least one byte, and showing 64 rows of it
   * with a quiet note somewhere is how a decoder produces confident noise.
   */
````

<a id="pack-71"></a>
## pack-71: demo/pack/index.html, inline script, line 925

````js
  /**
   * ⚠️ IT ALWAYS SAYS SOMETHING, AND THE FIRST VERSION RETURNED EARLY WHEN THERE
   * WAS NOTHING TO WARN ABOUT. That left the PREVIOUS file's warning standing on
   * screen while a harmless file was open, which is a stale alarm: the worst
   * kind, because it is the one that teaches a reader to stop believing the
   * alarms. Caught by the negative control rather than by looking.
   */
````

<a id="pack-72"></a>
## pack-72: demo/pack/index.html, inline script, line 932

````js
  /**
   * 🔴 THE CONFIRMATION IS THE FILE'S NAME AND NOTHING ELSE SINCE 2026-09-21.
   * It used to read *"Novation Circuit Bank Part 1.circuitpack inside
   * Synth-Patches.com - Soundbank for Novation Circuit and Tracks.zip, 64
   * patches, 32 sessions, 0 samples, read in this tab and sent nowhere"*, and
   * the instruction was *"rm it"*. Every fact in it is now somewhere a reader
   * can act on: the three counts LEAD the tab titles, and *sent nowhere* is in
   * the picture's caption under every patch and asserted over a counter.
   * ⚠️ IT STILL SAYS SOMETHING, WHICH IS THE PART THAT CANNOT GO. This line is
   * where a refusal lands, and a note left holding the PREVIOUS file's words
   * while a new one is open is a stale alarm, which is the one failure that
   * teaches a reader to stop believing the alarms. The warnings below are
   * untouched.
   */
````

<a id="pack-73"></a>
## pack-73: demo/pack/index.html, inline script, line 957

````js
  /**
   * 🔴 BYTE 0 DECIDES WHICH READER, AND IT USED TO BE A `try` ROUND `readZip`.
   * `50 4b` is a zip and `f0` is a bulk SysEx transfer, and catching the zip
   * failure to find out was a refusal wearing a reader's clothes: it answered
   * `did not read as a pack` about a Windows executable and about a file
   * carrying 64 samples in exactly the same words.
   */
````

<a id="pack-74"></a>
## pack-74: demo/pack/index.html, inline script, line 967

````js
      // ⚠️ IT SAYS BOTH THINGS: that it is not a zip, and what it IS.
````

<a id="pack-75"></a>
## pack-75: demo/pack/index.html, inline script, line 973

````js
        // 🔴 AND A STREAM CARRIES SESSIONS AND SAMPLES TOO, WHICH THE PAGE'S OWN
        // SCANNER COULD NOT SEE. They travel seven bits to the byte in 300 byte
        // carriers, and the same three numbers that grade a pack grade one of
        // these.
````

<a id="pack-76"></a>
## pack-76: demo/pack/index.html, inline script, line 1015

````js
    // ⚠️ THE SESSION IS DECODED NOW RATHER THAN WEIGHED. `sessionStats` treats
    // the file as opaque bytes, which is what this page had, and
    // `circuit-session.mjs` was built, tested at 68 asserts and imported by
    // nothing, which is the pattern this repository complained about in the
    // morning and then committed in the afternoon.
````

<a id="pack-77"></a>
## pack-77: demo/pack/index.html, inline script, line 1026

````js
    // 🔴 A SAMPLE IS READ BY `circuit-sample.mjs` AND NOT BY A FUNCTION ON THIS
    // PAGE. It had one, `wavShape`, which walked the chunks correctly and knew
    // nothing about what was IN the audio, so the table could show a length and
    // a file size and that was all it could ever show. The module answers 57
    // asserts with seven sabotages behind it, refuses thirteen kinds of file by
    // name rather than throwing, and decodes to plain floats.
    // ⚠️ AND THE RAW BYTES ARE NOT KEPT. `readWave` copies the data chunk, so
    // holding the file as well would be a second 5.1 MB of the same audio.
````

<a id="pack-78"></a>
## pack-78: demo/pack/index.html, inline script, line 1040

````js
  /**
   * One session, weighed AND decoded. The name the file carries is preferred
   * over the one `index.json` carries, and they agree in 32 of 32 here, so the
   * fallback is for a stream that has no index at all.
   */
````

<a id="pack-79"></a>
## pack-79: demo/pack/index.html, inline script, line 1051

````js
      // ⚠️ THE `data` COPY IS DROPPED AND THE COUNTS ARE KEPT. `readSession`
      // hands back every region's leading bytes so `rebuild()` can put the file
      // back together, and thirty two sessions of those is memory this page has
      // no use for: the panel shows where a region is and how much of it is
      // written, which is four numbers.
      // 🔴 THE NOTE COUNT PER REGION, WHICH IS THE FIRST THING THIS PAGE HAS
      // EVER BEEN ABLE TO SAY ABOUT WHAT A REGION HOLDS. The owner asked *"where
      // is note data?"* against a line still reading `what they hold is not
      // known`, which was true in the morning and stopped being true at
      // 18:04.
````

<a id="pack-80"></a>
## pack-80: demo/pack/index.html, inline script, line 1079

````js
      // 🔴 THE EVENTS, NOT ONLY HOW MANY. This carried a COUNT until 2026-09-21
      // and a count is the one thing about music with no music in it. Asked
      // twice: *"can we see actual notes on timeline"*, then *"so can you show
      // notes in timeline in pack?"*.
````

<a id="pack-81"></a>
## pack-81: demo/pack/index.html, inline script, line 1101

````js
    /**
     * 🔴 THE REGIONS ARE NUMBERED AND NOT NAMED, CORRECTED 2026-09-21 AFTER
     * **"five synths??"**. They read `synth 1` through `synth 16` and a Circuit
     * has TWO synth parts, so the page was printing a name this project typed
     * itself as though it had been read off the file. What is measured is the
     * offset and the stride, so that is what a row says, and the `size` column
     * carries the four strides without claiming what any of them holds.
     * ⚠️ The two patches that ARE corroborated are `synth 1` and `synth 2` on
     * the list above, out of the TAIL region, which is the one place a patch
     * really was found.
     */
````

<a id="pack-82"></a>
## pack-82: demo/pack/index.html, inline script, line 1114

````js
      /* 🔴 `i` IS WHAT A PRESS AND A MARK BOTH READ, AND THE ROWS HAD NONE.
         `table.mjs` hands `onPick` the row OBJECT and the element, never an
         index, and `mark(is)` asks the object too, so a table whose rows carry
         no identity can be pressed and can never say which row was pressed.
         It did not matter while this list was hover-only; the first check
         written after it gained `onPick` went red on it. */
````

<a id="pack-83"></a>
## pack-83: demo/pack/index.html, inline script, line 1125

````js
      // ⚠️ EMPTY AND NOT `0` ON A REGION THAT CANNOT HOLD NOTES. A zero there
      // would read as a measurement of a region that was looked at and found
      // empty, and the thirty four that are not 1,508 bytes long were never
      // looked at for notes at all.
````

<a id="pack-84"></a>
## pack-84: demo/pack/index.html, inline script, line 1136

````js
    /* 🔴 A NEW SESSION OPENS WITH NO REGION PRESSED, which is the state the ask
       describes: *"when not selected region, show empty trans/timeline/padgrid"*.
       The block keeps its room either way, so nothing below it moves. */
````

<a id="pack-85"></a>
## pack-85: demo/pack/index.html, inline script, line 1145

````js
  /**
   * A note's length, in steps, which is the only unit the file states.
   *
   * 🔴 THE GATE BYTE MEANS TWO DIFFERENT THINGS AND HEADER BYTE 8 SAYS WHICH,
   * so a picture that drew the raw byte would draw a `0xFF` session's notes SIX
   * TIMES TOO LONG. MEASURED in `research/circuit-session-notes-2026-09-21.md`
   * and re-measured over this pack on 2026-09-22: the `0x07` encoding's gate
   * runs 0 to 15 and the `0xFF` encoding's runs 1 to 96, `ff = 6 x (07 + 1)`
   * holds on 31 of 31 events of one session served in both encodings, and a
   * full sixteen step gate is 96 in one reading and 15 in the other.
   * ⚖️ IT IS A READING RATHER THAN A SPECIFICATION. Nothing here was checked
   * against an instrument, and that is why the number is shown as `n step(s)`
   * on a hover rather than drawn as a length anybody would measure off the
   * picture.
   */
````

<a id="pack-86"></a>
## pack-86: demo/pack/index.html, inline script, line 1166

````js
  /**
   * The step picture, written from the pressed region. Six rows of sixteen,
   * always, so the block reserves the same room whatever it is showing.
   *
   * 🔴 THE THREE ANSWERS A REGION CAN GIVE ARE THREE DIFFERENT SENTENCES, and
   * the whole reason this function says anything at all is that two of them
   * would otherwise render identically. A region either holds note events, or
   * is one of the sixteen this decoder reads and holds none, or is one of the
   * thirty four it does not read for notes at all. An empty picture means the
   * second and the third equally well, and *"we did not look"* read as *"there
   * is nothing there"* is this project's most repeated wrong answer.
   * ⚠️ SO THE ROW'S OWN CELL ALREADY SEPARATES THEM, a number against a blank,
   * and the step grid's row names say it a second time in the one place a
   * reader is looking when the picture is empty.
   */
````

<a id="pack-87"></a>
## pack-87: demo/pack/index.html, inline script, line 1218

````js
      /* ⚠️ A NOTE NUMBER ABOVE 127 CANNOT BE A NOTE AND IS NOT CLAMPED. 105 of
         this pack's 5,095 events carry one; `noteName` answers '' for them and
         the pad shows the raw byte instead, so a hole in our own decoder is
         visible rather than folded into a chord nobody played. */
````

<a id="pack-88"></a>
## pack-88: demo/pack/index.html, inline script, line 1250

````js
  /**
   * How far each session is from its nearest neighbour in the same file, in
   * bytes. 🔴 THIS IS THE ONE MEASURE THAT SEPARATES A STOCK SESSION FROM WORK,
   * and nothing else on this page can: a template has ordinary entropy, an
   * ordinary non-zero share and a distinct fingerprint, because one byte of
   * difference is enough for all three.
   */
````

<a id="pack-89"></a>
## pack-89: demo/pack/index.html, inline script, line 1276

````js
      // ⚠️ A PATCH THAT WILL NOT READ IS REPORTED BY NAME, never skipped. A
      // reader that silently dropped one leaves a pack looking smaller than it
      // is, which is a wrong answer wearing an empty one's clothes.
      // ⚠️ A SESSION'S PATCHES ARE PAYLOADS, NOT MESSAGES. `f.data` is 340
      // bytes lifted out of a session and has no command byte around it;
      // `f.bytes` is a whole 350 byte `.syx`. Reading the first as the second
      // would need a SysEx frame built round it, and building a message is the
      // first half of sending one.
````

<a id="pack-90"></a>
## pack-90: demo/pack/index.html, inline script, line 1317

````js
      // ⚠️ EMPTY, NOT `absent`, WHEN NOTHING LOOKED. `magicOk === null` means the
      // file could not be partitioned at all, and a word there would read as a
      // measurement that came back negative.
````

<a id="pack-91"></a>
## pack-91: demo/pack/index.html, inline script, line 1336

````js
    /**
     * ⚠️ A SAMPLE THAT WOULD NOT PARSE KEEPS ITS ROW AND SAYS WHY, which is the
     * same rule the patch reader already follows: a reader that silently dropped
     * one leaves a pack looking smaller than it is, and that is a wrong answer
     * wearing an empty one's clothes.
     */
````

<a id="pack-92"></a>
## pack-92: demo/pack/index.html, inline script, line 1348

````js
      /**
       * 🔴 A HEADER THAT READ AND AUDIO THAT DID NOT ARE TWO DIFFERENT FACTS,
       * AND CONFLATING THEM THREW. MEASURED 2026-09-28 on `one-shots.zip`, an
       * ordinary bag of forty drum hits: they are **44.1 kHz, 24 bit, stereo**,
       * so `readWave` reads every header and `toMono` refuses every one of them,
       * because it decodes 16 bit mono and says so in words. `summarise` then
       * answers `ok: true` with `peak`, `sound`, `lead` and `trail` all `null`,
       * and this row builder called `r.peak.toFixed(2)` on it.
       * ⚠️ IT COULD NOT ARISE UNTIL TODAY, which is why it sat here. Every WAV
       * in a `.circuitpack` is 48 kHz 16 bit mono, 64 of 64, and the only other
       * way in was a bulk transfer, whose slots are the same. A zip of anybody's
       * samples is the first thing that brings another shape through the door.
       * ✅ SO THE MEASURED CELLS GO EMPTY AND THE HEADER CELLS STAY. `length`,
       * `frames` and `rate` are read off the header and are true; `peak` and
       * `sound` are read off the audio and were never taken. Nothing unmeasured
       * prints as a zero here, and the reason is on the row's own hover.
       */
````

<a id="pack-93"></a>
## pack-93: demo/pack/index.html, inline script, line 1379

````js
               // ⚠️ A SECOND LINE RATHER THAN A JOIN. A `title` really does break
               // on a newline, and the refusal is a second fact rather than a
               // clause bolted onto the first.
````

<a id="pack-94"></a>
## pack-94: demo/pack/index.html, inline script, line 1397

````js
    /**
     * 🔴 NO PICTURE UNTIL A FILE LANDS, ASKED FOR AS *"do not show diargam when
     * no file"*. This reverses the reservation asked for the day before, and
     * the two are genuinely in tension: a picture drawn at rest cannot move
     * later, and a picture drawn at rest is a picture of nothing.
     * 🔴 THE HOST IS UNHIDDEN BEFORE `showPatch` RATHER THAN AFTER, AND THAT
     * ORDER IS LOAD BEARING. `diagram.mjs`'s own header says a `display: none`
     * ancestor is exactly what makes `getComputedTextLength` answer 0, so a
     * render inside a hidden box lays every label out against a ruler reading
     * zero. `hidden` IS `display: none`.
     */
````

<a id="pack-95"></a>
## pack-95: demo/pack/index.html, inline script, line 1411

````js
    // ⚠️ AND THE FIRST SESSION OPENS TOO, so the panel under the list is filled
    // whenever anything is, and a press changes its words instead of adding a
    // block and moving everything under it.
````

<a id="pack-96"></a>
## pack-96: demo/pack/index.html, inline script, line 1416

````js
      // ⚠️ EVERY CELL BACK TO EMPTY RATHER THAN TO 0. Nothing unmeasured prints
      // as a zero here: a `0` in a readout reads as a very confident
      // measurement of nothing, and `setCell` hides the unit with it.
````

<a id="pack-97"></a>
## pack-97: demo/pack/index.html, inline script, line 1423

````js
  /**
   * 🔴 THE VERDICT BLOCK IS GONE, REMOVED 2026-09-21 AT THE OWNER'S WORD:
   * *"rm all 1 sessions differ from each other, and the emptiest is 84.7 per
   * cent filled, so this is somebody's work rather than a pack of blanks etc
   * texts"*. Every branch of it, not one sentence.
   * ✅ **THE EVIDENCE SURVIVES BECAUSE IT WAS NEVER IN THE SENTENCE.** The
   * `nearest` column carries the byte distance on every row and the readout
   * carries it again for the open one, and this page's own comment already said
   * that column is there so a reader never has to take a verdict's word for it.
   * What went is the CONCLUSION, not the measurement.
   * 🔴 **AND IT TOOK THREE ASSERTS AND TWO NEGATIVE CONTROLS WITH IT**, which
   * is a real loss and is written down rather than glossed: the blanks control,
   * the mostly copies middle ground and the `29 of real work` line all graded
   * that function. `positron-verify`'s rule is that a removed thing takes its
   * checks with it SILENTLY, so they are accounted for here.
   * ⚠️ One log line stays, and it is a count with no conclusion in it. The log
   * is where a state change belongs, and `3 sessions sit within 16 bytes of
   * another` is a measurement a reader can check against the column.
   */
````

<a id="pack-98"></a>
## pack-98: demo/pack/index.html, inline script, line 1452

````js
  /**
   * 🔴 ON A PRESS, AND NOTHING IS DECODED UNTIL ONE HAPPENS. Sixty four WAVs
   * through `decodeAudioData` on a visit is the load-on-a-visit defect three
   * times over.
   * ⚠️ AND SOUND NEVER GATES THE WORK. `AudioContext.resume()` waits on a
   * gesture in a real browser and does not reject, so awaiting one is a hang
   * rather than an error. It is fired and left.
   */
````

<a id="pack-99"></a>
## pack-99: demo/pack/index.html, inline script, line 1460

````js
  /**
   * 🔴 PRESSING A ROW OPENS A SAMPLE AND PLAYS IT, AND THE TWO ARE SEPARATE
   * VERBS. `/reel/` fetched a newsreel and a day's radio on every visit for a
   * first frame nobody had asked to see, and the repair there was exactly this
   * split: `select()` moves and opens nothing, `play()` is the only half that
   * costs anything. Here nothing leaves the machine either way, but the player
   * under the table needs a sample to be OPEN without one being in the air.
   */
````

<a id="pack-100"></a>
## pack-100: demo/pack/index.html, inline script, line 1474

````js
    /**
     * 🔴 THE SENTENCE THAT USED TO BE WRITTEN HERE IS GONE AND ITS FACTS ARE
     * COLUMNS. Asked 2026-09-21, quoting it: *"`slot 55, 0.25 s, 12,143 frames
     * at 48000 Hz, peak 0.86` - this goes to the table, rm from here"*. The
     * marked row above carries all five, and the one that could not be a column
     * is the refusal, which is the row's own hover and its blank cells.
     */
````

<a id="pack-101"></a>
## pack-101: demo/pack/index.html, inline script, line 1481

````js
    // ⚠️ THE PICTURE IS DRAWN FROM THE SAME FLOATS THE SOUND IS MADE OF, out of
    // `toMono`, so what is on screen and what comes out of the speaker cannot
    // be two readings of one file that disagree.
````

<a id="pack-102"></a>
## pack-102: demo/pack/index.html, inline script, line 1485

````js
    /**
     * 🔴 WHAT SAYS A FILE WILL MAKE NO SOUND, AND IT WAS `playBtn.disabled =
     * !mono.ok` UNTIL 2026-09-29. The play button was the only thing on screen at
     * rest that said so, and the transport it lived on came out today, so the
     * fact moved to a row of the panel rather than going quiet. There is a picture
     * or there is a sentence, never both and never neither.
     * 🔴 THE LINE THAT MOVED HERE FOLLOWS THE AUDIO, NOT THE HEADER, AND IT READ
     * `!r.ok` UNTIL 2026-09-28. Those were the same thing while every file that
     * could reach this page was 48 kHz 16 bit mono. They stopped being the same
     * thing the moment a zip of anybody's samples could be opened: MEASURED on
     * `one-shots.zip`, forty 24 bit stereo files whose headers all read, so every
     * row would have offered a live Play that logs a refusal and makes no sound.
     * That is the shape this project calls a control that lies.
     * ⚠️ AND IT IS TWO WORDINGS BECAUSE THEY ARE TWO FACTS. A file whose HEADER
     * would not read never got as far as its audio. A file whose header read and
     * whose audio this page will not mix down is a 24 bit, an eight bit or a
     * surround file, which is an ordinary thing to be handed rather than a fault
     * in it. The long reason for either is on the row's own hover.
     */
````

<a id="pack-103"></a>
## pack-103: demo/pack/index.html, inline script, line 1505

````js
      /* ⚠️ THE WORDS ARE CLEARED AS WELL AS PUT AWAY. A hidden row holding the
         last refusal is state left behind, which is the shape `video-panel.mjs`
         shipped when it wrote `dataset.full = ''` instead of deleting it. */
````

<a id="pack-104"></a>
## pack-104: demo/pack/index.html, inline script, line 1512

````js
      /* 🔴 `wave.source(w.name)` STOOD HERE AND CAME OFF 2026-09-22: *"rm
         sample name from corner of the canvas"*. The name is drawn INSIDE the
         canvas by `grain-scope.mjs`, and it was saying a third time what the
         marked row and the row's own `name` column already say an inch above
         it.
         ⚠️ THE COMPONENT IS UNTOUCHED, WHICH IS THE POINT. `/archive/radio/`,
         `/tapes/` and `/grains/` all draw with the same module and all three
         pass a name that is worth having: on a live station the corner is the
         only thing that says what the picture IS. A component option would have
         been a change reaching three pages to remove one line from a fourth.
         Not calling the setter is the whole fix. */
````

<a id="pack-105"></a>
## pack-105: demo/pack/index.html, inline script, line 1531

````js
    // ⚠️ THE PRESS STILL REACHES `playSample`, WHICH SAYS IN THE LOG WHY A FILE
    // THIS PAGE CANNOT DECODE MADE NO SOUND. A press is somebody asking, and
    // answering it with silence is worse than answering it with the reason.
````

<a id="pack-106"></a>
## pack-106: demo/pack/index.html, inline script, line 1537

````js
  /**
   * 🔴 THE AUDIO COMES OUT OF `circuit-sample.mjs` AND NOT OUT OF
   * `decodeAudioData`, WHICH IS THE HALF OF *"make/use sample decoder"* THAT IS
   * NOT THE TABLE. The browser's decoder is a promise, it accepts what it feels
   * like accepting, and it can say nothing about a file it refuses beyond an
   * `EncodingError`. `toMono` answers in words, and because it is SYNCHRONOUS
   * the page's own check can grade a press rather than racing a decode.
   * ⚠️ AND SOUND NEVER GATES THE WORK. `AudioContext.resume()` waits on a
   * gesture in a real browser and does not reject, so awaiting one is a hang
   * rather than an error. It is fired and left.
   */
````

<a id="pack-107"></a>
## pack-107: demo/pack/index.html, inline script, line 1548

````js
  /**
   * ⚠️ IT TOOK A `from` IN SECONDS UNTIL 2026-09-29 AND THE ONLY CALLER WAS THE
   * TRANSPORT'S `seek`. A buffer source has no seek, so the only honest answer to
   * a press on a slider was a new voice started at an offset. There is no slider
   * now, so the argument is gone rather than left standing with nothing passing
   * it, which is this project's dead-guard shape in its cheapest form.
   *
   * @param {number} i  which slot
   */
````

<a id="pack-108"></a>
## pack-108: demo/pack/index.html, inline script, line 1562

````js
    // 🔴 AN EMPTY SLOT IS A ROW AND `createBuffer(1, 0, rate)` THROWS. Every
    // sample in a `.circuitpack` is sound, so this could not arise until a bulk
    // transfer opened: `Roland Classics.syx` is 48 filled slots and 16 empty,
    // and an empty one has to read as empty rather than as `no sound here`
    // about a DOMException.
````

<a id="pack-109"></a>
## pack-109: demo/pack/index.html, inline script, line 1577

````js
      /* ⚠️ THE HANDLE IS KEPT BECAUSE A SECOND PRESS HAS TO SILENCE THE FIRST.
         It was also how the loop toggle reached a sound that was already running,
         and that control is gone; `stopSample` and this `onended` are the two
         callers left, and both need to know which voice is the current one. */
````

<a id="pack-110"></a>
## pack-110: demo/pack/index.html, inline script, line 1584

````js
        /* 🔴 THE HEAD GOES BACK TO THE TOP WHEN A ONE-SHOT ENDS, WHICH IT DID
           NOT UNTIL 2026-09-29 AND NOBODY REPORTED. This said `deck.pause()`,
           which put the transport's toggle back to Play and left the picture's
           line standing at the far right. `stopSample` below already carries the
           rule in writing, that a line left in a picture with nothing playing
           reads as a sound that is paused and nothing here can resume, and a
           natural end is the same fact as a stop. PHOTOGRAPHED at 1280 with the
           transport gone: a finished sample kept a hairline at the right edge
           and there was no longer a second control saying it had stopped. */
````

<a id="pack-111"></a>
## pack-111: demo/pack/index.html, inline script, line 1598

````js
      /**
       * 🔴 THE HEAD FOLLOWS THE CONTEXT CLOCK AND NOT A TIMER, and it stops
       * when the sound does. `AudioContext.currentTime` is the only clock that
       * agrees with what is being heard; a `setInterval` drifts against it and
       * a `requestAnimationFrame` loop that never stops is a phone's battery
       * spent drawing a still picture.
       */
````

<a id="pack-112"></a>
## pack-112: demo/pack/index.html, inline script, line 1606

````js
      /**
       * 🔴 ONE CLOCK FEEDS BOTH SURFACES. This used to move the waveform's head
       * alone; the transport bar's playhead now comes off the same function, by
       * pushing the position into the deck each frame the way `mediaMaster`
       * does for a media element. Two clocks started at the same instant would
       * be two readings of one sound, which is the thing this page already
       * refuses to do with its picture and its audio.
       */
````

<a id="pack-113"></a>
## pack-113: demo/pack/index.html, inline script, line 1614

````js
      /* ⚠️ THE SCOPE HAS NO `follow`, SO THE PAGE OWNS THE LOOP. `wave-view`
         took a function and ran its own frame loop; `grain-scope` is pushed a
         fraction. The clock is unchanged and is still the one that agrees with
         what is being heard, and it still stops when the sound does. */
````

<a id="pack-114"></a>
## pack-114: demo/pack/index.html, inline script, line 1637

````js
    // ⚠️ THE HEAD GOES BACK TO THE TOP RATHER THAN STANDING WHERE THE SOUND
    // STOPPED. A line left in the middle of a picture with nothing playing
    // reads as a sound that is paused, and nothing here can resume.
````

<a id="pack-115"></a>
## pack-115: demo/pack/index.html, inline script, line 1643

````js
  /* ⚠️ NOTHING LISTENS HERE, AND SINCE 2026-09-29 THERE IS NOTHING LEFT TO
     LISTEN TO. The samples tab's transport owned the only presses that reached
     `playSample` and `stopSample` other than a press on a row, and it is gone.
     A row is the one way in, through the table's own `onPick`. */
````

<a id="pack-116"></a>
## pack-116: demo/pack/index.html, inline script, line 1657

````js
  // 🔴 THE WAY IN IS ON SCREEN BEFORE ANY DRAG, which is the defect the first
  // build shipped: a component whose only visible part appeared mid-drag.
````

<a id="pack-117"></a>
## pack-117: demo/pack/index.html, inline script, line 1666

````js
    /**
     * 🔴 THE ORDER IS MEASURED OFF THE SCREEN AND NOT READ OFF THE SOURCE, which
     * is `positron-ui`'s rule after `/twelve/` was corrected by screenshot twelve
     * times in one evening. The ask was a title, then a button, then the
     * extensions UNDER it, and `append` order is not layout: a stylesheet can
     * reverse a column and the source still reads correctly.
     */
````

<a id="pack-118"></a>
## pack-118: demo/pack/index.html, inline script, line 1423

````js
    /**
     * 🔴 THE FOOTER IS NOT THERE WHEN IT HAS NOTHING TO SAY, and this is the
     * assert for *"rm nothing has been opened"* plus *"should be file uplaod
     * block footer, glued"* at once. A footer with a border and no words is an
     * empty box painting a line nobody wrote.
     */
````

<a id="pack-119"></a>
## pack-119: demo/pack/index.html, inline script, line 1429

````js
    /* 🔴 IT READS THE ROWS' COMPUTED `display` AND NOT THEIR RECTS, AND THE
       REASON IS THE TAB STRIP. With nothing open `tabs.el.hidden` is true, so
       every rect under it is zero whether a part is away or not and the old
       reading of `height === 0` could not fail. A row's own computed `display` is
       true either way. */
````

<a id="pack-120"></a>
## pack-120: demo/pack/index.html, inline script, line 1459

````js
    /**
     * 🔴 ONE WAY IN, AND THIS ASSERT REPLACES THE ONE THAT WENT WITH THE BUTTON.
     * `open the pack here` was removed on 2026-09-21 because it was asked for,
     * and a control that disappears takes its checks with it silently:
     * `positron-verify` records that those asserts do not fail, they stop
     * running, and the suite stays green either way. So the removal itself is
     * graded.
     */
````

<a id="pack-121"></a>
## pack-121: demo/pack/index.html, inline script, line 1478

````js
  /**
   * 🔴 THE PICTURE IS NOT THERE AT ALL BEFORE A FILE IS, AND THIS REPLACES THE
   * TWO RESERVATION ASSERTS THAT USED TO SIT HERE. They measured that the
   * picture had its full height at rest and did not move when a pack opened,
   * which was the right check for the behaviour asked for on 2026-09-20 and is
   * the wrong check for the behaviour asked for on 2026-09-21.
   * ⚠️ AND IT GRADES THE HEADING TOO. Hiding a figure and leaving `How it
   * works` standing over nothing is the failure that is easy to ship here,
   * because the heading is not the diagram's own element.
   */
````

<a id="pack-122"></a>
## pack-122: demo/pack/index.html, inline script, line 1502

````js
  /**
   * 🔴 THE PHONE LAYOUT IS THE ONE THING ON THIS PAGE THE HARNESS CANNOT SEE,
   * SO WHAT IS ASSERTED IS THE ONE THING THAT CAN BE. `demo/verify.mjs` runs at
   * 756 px and never enters a `max-width: 560px` block, and a media query adds
   * NO SPECIFICITY, so a plain rule written after it wins at every width. That
   * is not a theory: `.pos-pick`'s whole phone layout sat above the plain rule
   * that beat it and had never run once.
   * ⚠️ ORDERING IS NOT BEHAVIOUR, AND THIS ASSERT CLAIMS ONLY THE ORDERING.
   * What the block DOES was measured by hand at 390 px and is written beside
   * the rules themselves.
   */
````

<a id="pack-123"></a>
## pack-123: demo/pack/index.html, inline script, line 1530

````js
  /**
   * 🔴 THIS ASSERT PASSED EVERY RUN WHILE THE HEADINGS WERE ON SCREEN, AND A
   * SCREENSHOT IS WHAT CAUGHT IT. It read `head.hidden === true`, which is a
   * fact about an ATTRIBUTE, and `.pos-tbl-row` sets `display: grid`, which
   * beats the UA's `[hidden] { display: none }`. So `blank()` set the attribute,
   * changed nothing, and the check agreed with it.
   * ⚠️ SO IT READS THE COMPUTED STYLE NOW, WHICH IS THE ONLY THING THAT KNOWS
   * WHAT IS BEING DRAWN, and it covers all four tables rather than two.
   * `shell.css` gained `.pos-tbl-row[hidden]`, so this was a defect in every
   * empty table in the project and not only in these.
   */
````

<a id="pack-124"></a>
## pack-124: demo/pack/index.html, inline script, line 1552

````js
    // 🔴 AND THE WHOLE BLOCK IS AWAY, which is the request itself.
````

<a id="pack-125"></a>
## pack-125: demo/pack/index.html, inline script, line 1561

````js
    /**
     * 🔴 THE ONE LINE THAT READS BYTE 0, GRADED WITH NO FILE AND NO CORPUS, SO
     * IT RUNS ON THE DEPLOY TOO. This page caught the zip failure and asked the
     * SysEx scanner afterwards, which worked for the one file it was built
     * against and answered `did not read as a pack` about everything else in the
     * same words. `50 4b` is a zip, `f0` is a stream, and anything else is
     * neither: two archives in the download measured on 2026-09-21 are a Windows
     * executable and a Nintendo DS ROM.
     * ⚠️ ALL THREE ARE REFUSALS AND NONE OF THEM MAY OPEN ANYTHING, which is
     * what keeps the page's own `with no file open there are no tabs` assert
     * above true while this runs under it.
     */
````

<a id="pack-126"></a>
## pack-126: demo/pack/index.html, inline script, line 1597

````js
      /**
       * 🔴 AND THE THIRD BRANCH IS NOT TIDINESS, IT IS 134 ROWS OF NOISE THIS
       * PAGE USED TO ANNOUNCE. MEASURED 2026-09-21 on `Future_Kawaii.rar`, 56
       * MiB of compressed archive: catching the zip failure and scanning
       * anyway found **134 messages of exactly 350 bytes** in it, **43 distinct
       * six byte heads, and NOT ONE carrying the Circuit patch head
       * `f0 00 20 29 01 60`**. The page said *"134 of them Circuit patches"*
       * about compressed data, because `patchesIn()` identifies a patch by
       * LENGTH ALONE. That defect is in `circuit-syx.mjs` and is not repaired
       * here; what byte 0 does is refuse the file before the question is asked.
       */
````

<a id="pack-127"></a>
## pack-127: demo/pack/index.html, inline script, line 1622

````js
    /**
     * 🔴 A ZIP OF PLAIN WAVS, GRADED WITH NO FILE AND NO CORPUS, SO IT RUNS ON
     * THE DEPLOY TOO. Asked for 2026-09-28 as *"pack: make support of any wavs
     * in zip and change desc accrodingly"*. Until that day `openZip` filtered
     * for `.circuitpack`, `.circuittrackspack` and `.syx`, and a bag of drum
     * hits fell through every branch to *holds no Circuit pack and no patches*.
     * ⚠️ THE FIXTURE IS BUILT HERE RATHER THAN FETCHED, which is the only way
     * this can be a check at all: a zip in the repository is a file the deploy
     * would have to serve and a request this page must not make, and a zip in
     * `tmp/` is a check that runs on one machine. `storedZip` writes method 0,
     * which `unzip.mjs` reads and which needs no compressor.
     * 🔴 AND WRITING A ZIP IS NOT WRITING A MESSAGE. Everything else this page
     * refuses to build is a SysEx frame, because building one is the first half
     * of sending one and the thing at the other end has no factory reset. A zip
     * container reaches no instrument, and the bytes inside this one are two
     * sine bursts and a deliberate refusal.
     */
````

<a id="pack-128"></a>
## pack-128: demo/pack/index.html, inline script, line 1640

````js
      /**
       * PCM, at whatever shape the caller asks for. The default is 48 kHz 16 bit
       * mono, which is what every sample in a `.circuitpack` is, 64 of 64.
       * ⚠️ IT TAKES THE OTHER SHAPES TOO, because the whole point of opening
       * anybody's zip is that the files in it are not a Circuit's.
       */
````

<a id="pack-129"></a>
## pack-129: demo/pack/index.html, inline script, line 1709

````js
      // 🔴 THE FORK SITS BETWEEN THE TWO GOOD FILES ON PURPOSE. A filter that
      // missed it would show four rows in a different order, so the order is
      // part of what this grades rather than an accident of how it was built.
````

<a id="pack-130"></a>
## pack-130: demo/pack/index.html, inline script, line 1719

````js
        // 🔴 THE SHAPE A REAL BAG OF SAMPLES ARRIVES IN, AND IT IS NOT THE
        // CIRCUIT'S. MEASURED 2026-09-28 across the six zips in `tmp/packs/`
        // that hold WAVs: 901 files, in 18 distinct chunk layouts, of which only
        // 84 are a plain `fmt ` then `data`. So this is not a corner case
        // invented for a check, it is the corpus.
        // 🔴 AND THIS ROW WAS A REFUSAL FOR ONE MORNING. It read 24 bit stereo,
        // which `circuit-sample.mjs` could not decode until later the same day,
        // and the assert below graded that refusal. The module reads all 901 now,
        // so `Room.wav` is an ORDINARY ROW and the assert is the positive one.
````

<a id="pack-131"></a>
## pack-131: demo/pack/index.html, inline script, line 1729

````js
        // ⚠️ AND THE REFUSAL BRANCH IS STILL LIVE CODE, so it keeps a subject of
        // its own rather than losing its grading to the good news above. Six
        // channels are refused BY NAME and deliberately: a plain average is right
        // for a stereo pair and is a guess for a surround set, where a centre, a
        // surround pair and an LFE do not weigh the same.
````

<a id="pack-132"></a>
## pack-132: demo/pack/index.html, inline script, line 1742

````js
      /* ⚠️ `.pos-tbl-c` AND THE SCROLLER, NOT `children` AND NOT `el`. The
         heading IS a `.pos-tbl-row` and it comes first in the element, which
         this page has now paid for four times. */
````

<a id="pack-133"></a>
## pack-133: demo/pack/index.html, inline script, line 1782

````js
      /**
       * 🔴 A 24 BIT STEREO FILE IS AN ORDINARY ROW, AND THIS ASSERT SAID THE
       * OPPOSITE FOR ONE MORNING. It read that the header reads, the audio does
       * not, the measured cells are empty and the play button is off, which was
       * exactly true of `circuit-sample.mjs` until 24 bit and a documented
       * stereo mixdown landed in it the same day. The fixture did not change and
       * the answer did: `Room.wav` measures, draws and plays.
       * ⚠️ AND `peak` IS THE MIXDOWN'S, WHICH IS A DIFFERENT NUMBER FROM THE
       * LOUDEST CHANNEL'S. `MIX` is the mean, so a hard panned file reads below
       * its own loudest channel and that is a fact about the file rather than a
       * loss. MEASURED over the 150 real stereo files in `tmp/packs/`: the ratio
       * runs 0.46642 at worst, 0.99996 at the median and exactly 1 at best.
       */
````

<a id="pack-134"></a>
## pack-134: demo/pack/index.html, inline script, line 1799

````js
        /* 🔴 A PRESS ON THE ROW, WHICH IS WHAT SOUNDS A SAMPLE NOW. This read
           `playBtn.disabled` on both files until 2026-09-29 and the transport it
           read is gone, so the claim in the title is graded by the counter that
           only `playSample` increments and by what the panel puts on screen. */
````

<a id="pack-135"></a>
## pack-135: demo/pack/index.html, inline script, line 1821

````js
        /**
         * 🔴 AND THE BRANCH THE ASSERT ABOVE USED TO GRADE IS STILL LIVE CODE,
         * so it gets a subject that will not be decoded away next time the
         * module widens. Six channels are refused BY NAME, which is the whole
         * stance of that module: a refusal is a value a caller can show and
         * nothing throws.
         */
````

<a id="pack-136"></a>
## pack-136: demo/pack/index.html, inline script, line 1830

````js
        /* 🔴 THE PRESS IS MADE AND REFUSED, WHICH IS A STRONGER CLAIM THAN A
           DIMMED BUTTON EVER WAS. `playSample` returns before `played++` for a
           file it cannot mix down, so the counter says the press made no sound,
           and the panel's own row says so to a reader. */
````

<a id="pack-137"></a>
## pack-137: demo/pack/index.html, inline script, line 1857

````js
      /**
       * ⚠️ THIS BRANCH USED TO PRESS `open the pack here` AND READ WHAT IT SAID.
       * That control is gone, so what is left to grade is the only claim that
       * ever mattered on a deploy: the page asked nobody for anything and the
       * way in is the drop area, for everybody, with no branch on where it is
       * being served from.
       */
````

<a id="pack-138"></a>
## pack-138: demo/pack/index.html, inline script, line 1872

````js
      /**
       * 🔴 THE FOOTER ARRIVES WITH THE FILE AND SPANS THE BLOCK. `glued` is
       * three measurements, not a look: it is as wide as the block's inside, it
       * sits at the bottom of it, and there is no gap between the body above and
       * it. `positron-ui` records `/twelve/` being corrected by screenshot twelve
       * times in one evening because layout was reasoned about instead of
       * measured.
       */
````

<a id="pack-139"></a>
## pack-139: demo/pack/index.html, inline script, line 1894

````js
      /**
       * 🔴 THE SIX PUBLISHED PATCHES, DRIVEN. They are the only thing a visitor
       * to the deploy can open, so a broken one there is a page with nothing on
       * it, and that is exactly the state this check exists to notice. It
       * presses a button by NAME rather than by position, because this page has
       * no control row for a harness to sweep.
       * ⚠️ EVERY ONE MUST LAND IN RAM. `00` at offset 6 is `Replace Current
       * Patch`; `01` is `Replace Patch`, which writes flash on an instrument
       * with no factory reset. The extractor refused to write anything else and
       * this is the second reading of the same fact, off the deployed bytes.
       */
````

<a id="pack-140"></a>
## pack-140: demo/pack/index.html, inline script, line 1912

````js
      // ⚠️ THE COUNT LEADS, WHICH IS THE WHOLE OF THE CHANGE AND IS THE ONLY
      // PART OF IT A CHECK CAN SEE. It read `PATCHES 64` until 2026-09-21.
````

<a id="pack-141"></a>
## pack-141: demo/pack/index.html, inline script, line 1922

````js
      /**
       * 🔴 AND OPENING ONE BRINGS IT BACK, WITH REAL LAYOUT. The height is the
       * half that matters: `diagram.mjs` measures its own text with
       * `getComputedTextLength`, which answers 0 inside a `display: none`
       * ancestor, so a picture rendered while its host was hidden would come
       * back on screen laid out against a ruler reading zero.
       */
````

<a id="pack-142"></a>
## pack-142: demo/pack/index.html, inline script, line 1938

````js
      /**
       * 🔴 THE PANEL UNDER THE LIST, AND THE FIRST HALF IS THAT IT IS ALREADY
       * FILLED. A detail panel that appears on the first press pushes everything
       * under it down, which is the same reservation the picture on the patches
       * tab was asked for. `fill()` opens session 0 for exactly that reason.
       */
````

<a id="pack-143"></a>
## pack-143: demo/pack/index.html, inline script, line 1959

````js
        /* ⚠️ NO SLICE. `scroller()` is the body and the heading is not in it,
           which this project has now got wrong in both directions. */
````

<a id="pack-144"></a>
## pack-144: demo/pack/index.html, inline script, line 1975

````js
      /**
       * 🔴 THE NOTE DATA, ON THE PAGE. The owner read `What they hold is not
       * known` back at me with *"where is note data?"*, which was the right
       * question the moment the research landed. `notesIn` is graded in
       * `circuit-session-test.mjs` at 5,095 events against 0 in all 64 blanks;
       * what THIS asserts is that the page shows it, and shows it per region.
       * ⚠️ AND THE COLUMN IS EMPTY ON THE OTHER 34 RATHER THAN `0`. A zero would
       * read as a region that was looked at and found empty, and nothing looks
       * for notes outside the sixteen 1,508 byte regions.
       */
````

<a id="pack-145"></a>
## pack-145: demo/pack/index.html, inline script, line 1987

````js
        /* ⚠️ BY NAME, NOT BY INDEX. This read `children[3]` and a `size` column
           was inserted in front of it on 2026-09-21, which moved `notes` to 4.
           A positional read of a table is a check that breaks when a column is
           added, silently and in the wrong direction. */
````

<a id="pack-146"></a>
## pack-146: demo/pack/index.html, inline script, line 2002

````js
        /**
         * 🔴 THE NOTES ARE DRAWN, ONE REGION AT A TIME, WHICH IS WHAT WAS ASKED
         * FOR ON 2026-09-22. A count in a cell says how many; these assert that
         * each event is on its own step and in its own slot, that the block
         * reserves its room whether or not anything is pressed, and that the
         * three answers a region can give are three different answers.
         * ⚠️ THE SESSIONS TAB HAS TO BE OPEN OR EVERY RECT IN IT READS ZERO.
         * An inactive tab panel has no layout at all while `getComputedStyle`
         * goes on answering real colours, which is the half-true measurement
         * this page's seam check already records paying for.
         */
````

<a id="pack-147"></a>
## pack-147: demo/pack/index.html, inline script, line 2026

````js
        /* 🔴 PRESSED, NOT CALLED. The ask is *"when clicked on region on
           regions table, make that line active"*, so the check clicks the row
           a person would click. Calling `showRegion` directly would grade the
           function and say nothing about whether the list is wired to it, which
           is exactly how a table with no `i` on its rows passed review. */
````

<a id="pack-148"></a>
## pack-148: demo/pack/index.html, inline script, line 2043

````js
        /**
         * 🔴 THE THREE-WAY SPLIT, AND IT IS A NEGATIVE CONTROL AS WELL AS A
         * CHECK. A region holds notes, or is one of the sixteen this decoder
         * reads and holds none, or is one of the thirty four it never reads for
         * notes. The last two draw an identical picture, so if the words did not
         * differ the page would be saying *there is nothing there* about
         * regions it never looked at, which is this project's most repeated
         * wrong answer in its most expensive form.
         */
````

<a id="pack-149"></a>
## pack-149: demo/pack/index.html, inline script, line 2063

````js
        /**
         * 🔴 PRESENT AND EMPTY, WHICH IS THE ASK IN ITS OWN WORDS: *"when not
         * selected region, show empty trans/timeline/padgrid"*.
         * ⚠️ IT POINTS THE OPPOSITE WAY TO THIS PAGE'S OWN RULE FROM THE DAY
         * BEFORE, which is that a container with nothing in it must not paint
         * its edges. The newer instruction wins, and what makes it cost nothing
         * is that the picture is SIX FIXED ROWS: an empty one is the same height
         * as a full one, so the reserved block cannot move what is under it.
         */
````

<a id="pack-150"></a>
## pack-150: demo/pack/index.html, inline script, line 2074

````js
        /* 🔴 THREE PARTS SINCE 2026-09-22 AND THIS READ FOUR. The sessions list
           left the glue when *"have space betwen tables"* was reported, so it
           is a SIBLING of the glue now rather than its first child. The claim
           the assert carries is unchanged and is about the three parts that
           really are one surface. ⚠️ The list's own separation is the next
           clause, because a gap nobody grades is a gap that comes back: the
           two blocks are 22 px apart by `.pos-tabs-p > * + *`, and the
           harness runs wide enough to see it. */
````

<a id="pack-151"></a>
## pack-151: demo/pack/index.html, inline script, line 2098

````js
        /**
         * 🔴 NO PLAY BUTTON AND NO TIME ANYWHERE ON THAT BAR, WHICH IS THE
         * WHOLE REASON THE PICTURE IS NOT A STRIP. Nothing this decoder reads
         * carries a tempo, a beat or a millisecond, so a play button would be
         * claiming a rate the file does not name and the clock would be printing
         * a second that came from this page.
         */
````

<a id="pack-152"></a>
## pack-152: demo/pack/index.html, inline script, line 2131

````js
        /**
         * 🔴 A GATE BYTE MEANS TWO DIFFERENT THINGS AND THE RAW ONE WOULD HAVE
         * DRAWN A NOTE SIX TIMES TOO LONG. MEASURED here over the whole pack:
         * the raw field reaches 96, which is six sixteen step patterns, and the
         * length this page reports never leaves the sixteen steps a pattern
         * has. Both encodings are in this one file, so the conversion is
         * exercised rather than merely present.
         */
````

<a id="pack-153"></a>
## pack-153: demo/pack/index.html, inline script, line 2153

````js
        /* ⚠️ AND THE 105 THAT CANNOT BE NOTES ARE SAID RATHER THAN DRAWN AS
           MUSIC. MEASURED over the owner's pack: 105 of 5,095 events carry a
           note number above 127, which is impossible in MIDI. */
````

<a id="pack-154"></a>
## pack-154: demo/pack/index.html, inline script, line 2161

````js
        /**
         * 🔴 THE NEGATIVE CONTROL THE RESEARCH INSISTS ON: a decoder that found
         * notes in anything would pass every line above. The three stock
         * sessions in this very pack hold ZERO, and they are the same three that
         * distance from a template finds, which is a third independent road to
         * the same files.
         */
````

<a id="pack-155"></a>
## pack-155: demo/pack/index.html, inline script, line 2177

````js
      /**
       * 🔴 AND NO ROW CLAIMS TO BE A SYNTH, WHICH IS THE CORRECTION ITSELF.
       * The owner asked **"five synths??"** against rows reading `synth 1` to
       * `synth 5`, and a Circuit has TWO synth parts. An assert that only
       * checked the new words would go green again the moment somebody put the
       * old ones back, so this one checks the absence.
       */
````

<a id="pack-156"></a>
## pack-156: demo/pack/index.html, inline script, line 2190

````js
      /**
       * 🔴 THE REGIONS ARE THE DECODER'S MODEL RATHER THAN A READING OF THE FILE
       * LENGTH. Fifty regions covering 53,248 bytes with no gap and no overlap is
       * the claim `circuit-session.mjs` makes, and because the page now SHOWS it
       * the page can CHECK it: every region starts where the last one ended, and
       * each one's written bytes plus its erasure come to its own size.
       */
````

<a id="pack-157"></a>
## pack-157: demo/pack/index.html, inline script, line 2206

````js
      /**
       * 🔴 PRESSING A SECOND SESSION OPENS THAT ONE, and the negative control is
       * the point: a panel that showed the first session whatever was pressed
       * would pass any check that only counted rows.
       */
````

<a id="pack-158"></a>
## pack-158: demo/pack/index.html, inline script, line 2213

````js
      /* ⚠️ THE REGION TABLE IS WHAT PROVES IT NOW. The readout that used to
         answer this went on 2026-09-21 and the picture that answered it after
         that went on 2026-09-22, so the differential is the note counts down
         the lower list: two sessions that put their notes in different patterns
         cannot fill that column the same way, and a table that ignored the
         press would keep the first one's numbers. */
````

<a id="pack-159"></a>
## pack-159: demo/pack/index.html, inline script, line 2247

````js
      /**
       * ⚠️ THE PAGE NO LONGER CONCLUDES, SO THIS IS AN ASSERT ABOUT THE COLUMN
       * A READER LOOKS AT RATHER THAN ABOUT A SENTENCE. `29 of real work` was
       * the verdict's words; the same fact is 32 rows of which 3 read a
       * single-digit distance and 29 read 262 or more.
       */
````

<a id="pack-160"></a>
## pack-160: demo/pack/index.html, inline script, line 2259

````js
      /**
       * 🔴 THE LOOSE SESSION PATH, DRIVEN. It was advertised on the drop area
       * before it existed: the accept list named `.circuitsession` while the
       * handler called a function that was not there, so the page read green and
       * would have thrown the moment anybody dropped one. A capability a control
       * announces and cannot perform is this project's named hazard.
       */
````

<a id="pack-161"></a>
## pack-161: demo/pack/index.html, inline script, line 2297

````js
      /**
       * 🔴 THE SAMPLES, READ BY THE KIT MODULE AND NOT BY THIS PAGE. Every one
       * of the 64 parses, none is refused, and every column in that table moves.
       * The rate, the depth and the channel count are the same sixty four times,
       * which is why they are in the totals line and the hover rather than in
       * columns nobody would read twice.
       */
````

<a id="pack-162"></a>
## pack-162: demo/pack/index.html, inline script, line 2312

````js
      /**
       * 🔴 PRESSING ONE REALLY DECODES IT HERE, AND THIS CHECK COULD NOT BE
       * WRITTEN BEFORE TODAY. The old path handed the bytes to
       * `decodeAudioData`, which is a promise, so a check could press the row
       * and had nothing to read until a decoder somewhere else had finished.
       * `toMono` is synchronous, so what the press produced is on the page by
       * the time the next line runs.
       * ⚠️ AND IT COMPARES AGAINST THE FILE'S OWN HEADER RATHER THAN AGAINST A
       * NUMBER TYPED HERE, so a decoder that produced plausible audio of the
       * wrong length goes red.
       */
````

<a id="pack-163"></a>
## pack-163: demo/pack/index.html, inline script, line 2332

````js
      /**
       * 🔴 THE PICTURE IS UNDER THE TABLE AND THE TWO ARE ONE BOX, MEASURED OFF
       * REAL RECTS. It was three parts with a transport at the foot until
       * 2026-09-29 and it is two rows of a `createGlueRows` panel now, plus a
       * third that is away while there is a picture to draw. The numbers are the
       * same three claims: the picture's row starts where the list's row ends, the
       * seam between them is 1 px, and every row paints a ground of its own,
       * because a transparent part lets the glue's own colour through and the
       * seam stops being a seam.
       * ⚠️ AND IT ASKS THE ROW AND THE THING INSIDE IT SEPARATELY. The glue's
       * `--edge: 0` inherits to any depth, so the table and the canvas should both
       * compute 0 px of border while the surface computes 1; a part that drew its
       * own edge inside this box is the doubled line this page has reported three
       * times.
       */
````

<a id="pack-164"></a>
## pack-164: demo/pack/index.html, inline script, line 2348

````js
        /**
         * 🔴 THE TAB IS OPENED FIRST, AND THE FIRST RUN OF THIS CHECK MEASURED A
         * HIDDEN PANEL AND REPORTED A 0.0 px SEAM ON A LAYOUT THAT WAS PERFECT.
         * An inactive tab panel has no layout at all, so every rect in it reads
         * zero while `getComputedStyle` goes on answering real colours, which is
         * the worst possible mixture: half the assert is true and half of it is
         * measuring nothing. `table.mjs`'s own `cuts()` answers `measured:
         * false` for exactly this case and says so in its header.
         * ⚠️ IT SWITCHES BACK IN THE SAME BLOCK WITH NO `await` IN IT, so no
         * frame can be drawn between and nobody watching the page sees a tab
         * move. That is the same argument `/kit/` makes about its own measuring
         * window, and an `await` here would break it.
         */
````

<a id="pack-165"></a>
## pack-165: demo/pack/index.html, inline script, line 2363

````js
        // ⚠️ A SAMPLE IS OPENED FIRST, WITHOUT PLAYING ONE. The picture hides
        // itself until it has something to draw, so measuring the three parts
        // before anything is open measures two of them and a box that is not
        // there. `openSample(i, false)` is the half of the press that opens
        // rather than the half that sounds, which is the split this page made
        // for the player and is useful here for the same reason.
````

<a id="pack-166"></a>
## pack-166: demo/pack/index.html, inline script, line 2375

````js
        /* ⚠️ AND NOTHING INSIDE DRAWS A SECOND EDGE, which is the reported
           fault rather than an extra: *"rm double bordering"*. MEASURED at the
           time on `/archive/radio/`: a component's 1 px against the glue's 1 px in the
           same colour reads as one 2 px line. */
````

<a id="pack-167"></a>
## pack-167: demo/pack/index.html, inline script, line 2398

````js
        /**
         * 🔴 THE PICTURE IS ASKED FOR INK RATHER THAN FOR A COLUMN COUNT, which
         * is the check the component's own header demands: every number in
         * `facts()` would read the same if the fill colour were the field
         * colour, if the scale were zero or if `paint()` returned early.
         * `/archive/radio/` already records that a check a wave was drawn has to ask
         * the canvas.
         */
````

<a id="pack-168"></a>
## pack-168: demo/pack/index.html, inline script, line 2406

````js
        /**
         * ⚠️ AND AN INK SHARE ON ITS OWN IS NOT EVIDENCE, WHICH THE FIRST RUN
         * SHOWED BY ANSWERING 99.9 PER CENT. `ink()` counts pixels differing
         * from the one at the top left corner, so a canvas painted edge to edge
         * in a field colour while the corner stayed transparent would answer
         * almost 100 and mean nothing. The number that carries weight is the
         * DIFFERENCE between a picture with a sample in it and the same canvas
         * with none, which is why this clears it and puts it back.
         */
````

<a id="pack-169"></a>
## pack-169: demo/pack/index.html, inline script, line 2415

````js
        /**
         * ⚠️ AN INK SHARE ON ITS OWN IS NOT EVIDENCE, WHICH THE FIRST RUN
         * SHOWED BY ANSWERING 99.9 PER CENT. `ink()` counts pixels differing
         * from the one at the top left corner, so a canvas painted edge to edge
         * while its corner stayed clear would answer almost 100 and mean
         * nothing.
         * 🔴 AND CLEARING IT IS NOT THE DIFFERENTIAL EITHER, WHICH THE SECOND
         * RUN SHOWED: `clear()` hides the wrapper and leaves the BITMAP where it
         * was, so the same 63,264 pixels were counted before and after. That is
         * a real gap in the component rather than in this check, and it is
         * reported rather than worked around here.
         * ✅ SO THE DIFFERENTIAL IS TWO DIFFERENT SAMPLES. The shortest in the
         * pack is 5,999 frames and the longest is 95,947, and a picture that
         * followed nothing would draw them identically.
         */
````

<a id="pack-170"></a>
## pack-170: demo/pack/index.html, inline script, line 2430

````js
        /* ⚠️ THE FACTS MOVED OFF THE COMPONENT AND ONTO THE PIXELS. The scope
           is handed peaks and holds no opinion about frames or seconds, which
           `wave-view` did; what it can still answer is whether it is drawing
           MATERIAL or a scrolling stream, and the rest is the canvas itself. */
````

<a id="pack-171"></a>
## pack-171: demo/pack/index.html, inline script, line 2434

````js
        /* ⚠️ A FRAME IS WAITED FOR, AND WITHOUT IT THIS READ 0 LIT PIXELS ON A
           PERFECTLY GOOD PICTURE. `wave-view` painted inside `set()`, so a
           check could read the canvas on the next line; `grain-scope` paints on
           its own `requestAnimationFrame` loop, the way a component drawing a
           live stream has to. The difference is invisible in the source and
           takes the ink assert red. */
````

<a id="pack-172"></a>
## pack-172: demo/pack/index.html, inline script, line 2459

````js
      /**
       * 🔴 THREE ASSERTS STOOD HERE AND WENT WITH THE TRANSPORT ON 2026-09-29,
       * WHICH IS THE HONEST ARITHMETIC RATHER THAN A TIDY-UP. They were *the loop
       * toggle looks pressed as well as reading pressed, and fits the bar*, which
       * read a computed background colour through a press because a `loopSlot`
       * button had shipped with no pressed state at all; *pressing loop changes
       * the sound that is already playing, not only the next one*, which pressed
       * Loop WHILE a voice was running and read `voice.loop`; and *and the
       * transport really lets go of it, so a looping sample can be got out of*,
       * which pressed the bar's own toggle rather than calling `stopSample`.
       * 🔴 THE PAGE NO LONGER MAKES ANY OF THOSE CLAIMS, because there is no loop
       * and no transport to make them about. `positron-verify`'s rule is that a
       * removed thing takes its checks with it SILENTLY unless somebody accounts
       * for them, so they are named here rather than left to a count nobody
       * diffed.
       * ⚠️ WHAT IS KEPT IS THE PRESS THAT SOUNDS A SAMPLE, because every check
       * after this one reads the marked row and needs one open, and because a row
       * press is now the page's only way in.
       */
````

<a id="pack-173"></a>
## pack-173: demo/pack/index.html, inline script, line 2481

````js
      /**
       * 🔴 THE ROW IS WHAT SAYS WHICH SAMPLE IS OPEN NOW, and this assert used
       * to read a sentence under the player that no longer exists. The five
       * facts it carried are cells on the marked row, which is where they were
       * asked to go.
       * ⚠️ AND IT READ `playBtn.disabled === false` AS ITS LAST CLAUSE UNTIL
       * 2026-09-29, which was the page saying this file can be played. The panel
       * says it now, by drawing a picture and putting its refusal row away, and
       * the two are read off computed `display` rather than off `hidden`.
       */
````

<a id="pack-174"></a>
## pack-174: demo/pack/index.html, inline script, line 2492

````js
        /* ⚠️ `.on` IS WHAT `table.mark()` SETS, and reading the scroller rather
           than the table keeps the hidden heading out of it, which this project
           has now paid for four times. */
````

<a id="pack-175"></a>
## pack-175: demo/pack/index.html, inline script, line 2497

````js
        /* ⚠️ THE TITLE NAMED THE SENTENCE UNDER THE PLAYER UNTIL 2026-09-29, and
           the player has gone too, so it pointed two removals back. A title is
           read by whoever reads a suite run and has to stand on its own. */
````

<a id="pack-176"></a>
## pack-176: demo/pack/index.html, inline script, line 2512

````js
      /**
       * 🔴 THE NEGATIVE CONTROL, AND IT IS THE ONE THE AGENT THAT BUILT THE
       * MODULE ASKED FOR IN WORDS: a total taken over the files that worked
       * hides the only thing worth seeing. A page that dropped a bad sample
       * would show 63 rows and a tidy total and look perfect.
       * ⚠️ IT ALSO PROVES THE PRESS REFUSES. A row that cannot decode must not
       * increment the play counter, or the page reports having played something
       * that made no sound.
       * ⚠️ AND WHAT SAYS SO ON SCREEN IS THE PANEL'S OWN ROW SINCE 2026-09-29. It
       * was `playBtn.disabled === true` on a transport that no longer exists, and
       * this file is the other wording: its HEADER would not read, so it never
       * got as far as its audio.
       * 🔴 AND IT READS THE LOG NOW, BECAUSE THE LINE IT USED TO READ WAS
       * REMOVED ON 2026-09-22 AND THE REFUSAL COUNT MOVED THERE. A removed
       * display takes its checks with it SILENTLY unless somebody follows the
       * fact to its new home, which is this one being followed. `__demo.logs`
       * is the sanctioned surface: the harness reads that object and never the
       * page's own elements.
       */
````

<a id="pack-177"></a>
## pack-177: demo/pack/index.html, inline script, line 2550

````js
      // ⚠️ `scroller()` AND NOT `el`, AND THE FIRST TRY READ THE HEADING. The
      // heading is `.pos-tbl-row pos-tbl-head` and it is FIRST in the element,
      // so `el.querySelector('.pos-tbl-row')` returns a row with no title and
      // the assert went red on a page doing exactly what it promises. That is
      // this page's third assert measuring something next to the quantity in
      // question, and the other two are in `HANDOFF.md`.
````

<a id="pack-178"></a>
## pack-178: demo/pack/index.html, inline script, line 2559

````js
      /**
       * 🔴 THE FLASH WARNING, DRIVEN RATHER THAN READ. A file that would
       * overwrite every patch slot on the instrument is the one thing this page
       * exists to notice, and until today it was dismissed as `did not read as a
       * pack`. The stream is built here from the pack's own 64 patches with byte
       * 6 flipped to `01`, which is exactly the file measured in the wild.
       */
````

<a id="pack-179"></a>
## pack-179: demo/pack/index.html, inline script, line 2566

````js
      // ⚠️ SNAPSHOT FIRST, AND THE NEGATIVE CONTROL CAUGHT THAT THIS WAS
      // MISSING. `fill()` REPLACES `patches`, so building the safe stream out of
      // `patches` after loading the flash one built it out of the flash one and
      // the control went red reporting 64 of 64 writing flash. It was measuring
      // the page correctly and my check was reading a variable that had moved.
````

<a id="pack-180"></a>
## pack-180: demo/pack/index.html, inline script, line 2585

````js
      // ⚠️ THE NEGATIVE CONTROL. A page that shouted at every file would pass
      // the line above and be worthless. The same 64 messages with byte 6 left
      // alone are the portable single patch format and must raise nothing.
````

<a id="pack-181"></a>
## pack-181: demo/pack/index.html, inline script, line 2596

````js
      /**
       * 🔴 A REAL BULK TRANSFER, END TO END, WHEN THE ARCHIVE DOWNLOAD IS ON
       * THIS MACHINE. `Roland_Classics.zip` holds one 6,753,638 byte `.syx` and
       * no pack at all, and this page answered *"is 6753638 bytes and a Circuit
       * patch is 350"* about its contents until today. It is the file with EMPTY
       * SLOTS in it, 48 filled and 16 empty, which is the case the owner's 64
       * WAVs can never produce.
       * ⚠️ IT IS UNDER `tmp/`, WHICH IS GITIGNORED, so this never runs on the
       * deploy or on a fresh clone and says so rather than going quiet.
       */
````

<a id="pack-182"></a>
## pack-182: demo/pack/index.html, inline script, line 2623

````js
          // 🔴 THE CHECKSUM IS WHAT MAKES THAT AUDIO EXACT RATHER THAN
          // PLAUSIBLE, AND THE PAGE SAYS SO. One verified stream, and the
          // session count withheld because slicing this file blind gives 108
          // blocks that are zero fill and sliced PCM rather than sessions.
````

<a id="pack-183"></a>
## pack-183: demo/pack/index.html, inline script, line 2638

````js
          // 🔴 AND AN EMPTY SLOT IS SILENT RATHER THAN AN EXCEPTION.
          // `createBuffer(1, 0, rate)` throws, and `no sound here` about a
          // DOMException reads as a broken page rather than as an empty slot.
````

<a id="pack-184"></a>
## pack-184: demo/pack/index.html, inline script, line 2650

````js
            /* ⚠️ IT READ `deck.range[1] > 1` UNTIL 2026-09-29, which was the
               transport's clock having been given a real length. There is no
               transport, so what is read is the buffer the page really built,
               which is a fact about the audio rather than about a control. */
````
