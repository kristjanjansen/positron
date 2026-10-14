# Page comments: making

The full comments cut from the code under demo/ for making, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="making-1"></a>
## making-1: demo/making/index.html, style, line 10

````css
  /* The table is the page below the picture, so it gets the room the picture
     leaves rather than the component's default ceiling. `dvh` rather than `vh`
     because a phone's address bar comes and goes and `vh` measures the taller
     state, which puts the last rows under it. The floor keeps it a table rather
     than a slot on a short window. `--tbl-h` is the component's own knob rather
     than an override of its rule. */
````

<a id="making-2"></a>
## making-2: demo/making/index.html, style, line 17

````css
  /* 🔴 THE BOX IS 16:9 AND THE PICTURE FILLS IT, CROPPING. Asked for as *"make
     video win 16:9"*. The shell's default is `contain` and CLAUDE.md says why:
     iOS hands back portrait from a camera, where `cover` shows 32% of the frame
     and stretching squashes a face. That rule is about a SUBJECT SOMEBODY
     FRAMED at a shape the page does not control. These are finished pieces,
     and the arithmetic is the same one `/stage/` was given `fit: 'cover'` for:
     4:3 into 16:9 keeps 75%, and it was laying a flat field down both sides of
     every one of them.

     🔴 THE PICTURE TAKES THE FULL WIDTH. INSTRUCTED 2026-09-19: *"make wideo
     window full w"*, against a screenshot of the box sitting about two thirds
     of the way across a wide window.
     ⚠️ THE ARGUMENT IT OVERRULES IS KEPT, BECAUSE IT WAS MEASURED AND IT IS
     STILL TRUE. The panel used to be WIDTH-CAPPED so the table stayed on
     screen: `width: min(100%, calc(min(46vh, 380px) * 16 / 9))`, height
     leading and width following the ratio. A 16:9 box at this page's full
     width is 436 px tall, which MEASURED on an 872 px laptop put the first row
     of the list at y=866, below the fold, and the list is this page's control
     surface. That cost is real and is now paid on purpose: the picture is what
     was asked for, and the empty state says `press a recording below`, which
     points at something a short window now needs a scroll to reach.
     ✅ WHAT SURVIVES IS THE PART THAT MATTERS: the width is still ONE
     declaration, and the footer, the empty card and the video all take the
     picture's own width from it rather than each carrying a copy. */
````

<a id="making-3"></a>
## making-3: demo/making/index.html, style, line 44

````css
  /* 🔴 THE PICTURE BOX IS SQUARE AND A PICTURE FITS IT BY WIDTH OR BY HEIGHT.
     Asked 2026-09-19: *"image preview box square and fit it by w or h"*.
     ⚠️ IT IS THE SAME COMPONENT AS THE VIDEO ABOVE IT, NOT A SECOND BOX. The
     panel already takes an `aspect`, and `shell.css` already contains an `img`
     in its stage — so the square is `aspect: '1 / 1'` and the fit is the
     stylesheet's own `object-fit: contain`, which this page must NOT override
     the way it overrides the video's. `.pos-vp-stage > video` is the page's
     cover rule and it names `video` for exactly that reason.
     🔴 AND THIS ONE IS CAPPED WHERE THE VIDEO IS NOT. The video was made full
     width on instruction (*"make wideo window full w"*) and a 16:9 box at this
     page's width is 436 px tall. A SQUARE at that width is 1000 px tall on a
     laptop, which puts the whole list under the fold and the list is how you
     get to the next picture. The cap is the difference between the two shapes
     rather than a disagreement about the instruction.
     ⚠️ THE CORPUS RUNS 145x145 TO 3000x3000, which is why contain is right
     here and cover is right for the films: a film is composed to fill its own
     frame, and a recovered picture has whatever shape it was captured at. */
````

<a id="making-4"></a>
## making-4: demo/making/index.html, style, line 62

````css
  /* 🔴 THIS RULE SITS AFTER `.pos-vp`, AND IT HAS TO. Both are one class, so
     the one written later wins at every width — and when this block was above
     `.pos-vp { width: 100% }` the square rendered 775 px wide on a laptop and
     the list vanished under the fold, exactly what the cap exists to prevent.
     CLAUDE.md carries the same defect on `.pos-pick`, whose entire phone layout
     had never run in its life because a later plain rule beat it.
     ⚠️ THE FIX IS ORDER, NOT WEIGHT. Raising this to two classes to win an
     argument with a rule eight lines up is how `.pos-faux` ended up needing
     (0,2,0), and that one at least had somebody else's stylesheet to beat. */
````

<a id="making-5"></a>
## making-5: demo/making/index.html, style, line 72

````css
  /* 🔴 AN EMPTY PICTURE SAYS WHAT TO DO, AND `/stage/` BOUGHT THIS RULE: a
     blank box with a transport under it is the shape of a thing that could be
     played and cannot. Here it CAN be, the moment a row is pressed, so the box
     says that rather than sitting there. It goes on the first press and does
     not come back. */
````

<a id="making-6"></a>
## making-6: demo/making/index.html, style, line 77

````css
  /* ⚠️ NO `text-wrap: balance` HERE, AND IT WAS CONSIDERED AND MEASURED ON
     2026-09-23 RATHER THAN MISSED. `shell.css` carries the argument at
     `.pos-lr-say`: the property is for a centred SENTENCE that wraps, and
     these two do not. MEASURED at 390 px and at 320: `press a recording below`
     is 156.8 px and `press a picture below` is 140.3, both on one line in a
     286 px box, and this well is never narrower than the page. A declaration
     that reads as done and moves nothing is this project's second most
     expensive kind of defect, so it is a note instead of a rule. */
````

<a id="making-7"></a>
## making-7: demo/making/index.html, inline script, line 107

````js
  /**
   * The corpus, built by `demo/resources/build-mimproject.mjs` out of two
   * measured inputs.
   *
   * 🔴 IT IS NOT `corpus.json` AND THE TWO MUST NOT BE MERGED. Every row of
   * that one is a POINTER to something somebody else holds, and its rules
   * follow from that: never copy, never re-probe, write down what was observed
   * and when. Every row of this one points at a file WE hold, because
   * mimproject.org has been down long enough that two video sites were the last
   * copies anybody could reach. One file with both would put "never ask
   * somebody else's server" and "this server is ours" under one set of rules,
   * and the first would win by being written down.
   */
````

<a id="making-8"></a>
## making-8: demo/making/index.html, inline script, line 122

````js
  /**
   * The pictures, built by `demo/resources/build-mimproject-images.mjs`.
   *
   * 🔴 A THIRD CORPUS, AND IT IS A THIRD FOR THE REASON THE SECOND IS A
   * SECOND. These are files we hold, like the recordings, but they were
   * RECOVERED rather than pulled off a video site: every mimproject.org host
   * stopped resolving, so the Wayback Machine was the only copy left. A row
   * therefore carries where it was captured from and which archived page
   * showed it, which is not a question a recording's row can be asked.
   * ⚠️ THIRTY OF THEM ARE 145x145 THUMBNAILS whose originals were never
   * captured, and they carry `thumbnail: true` so the list can say so. A
   * thumbnail offered as a picture is the page making a claim the file cannot
   * meet.
   */
````

<a id="making-9"></a>
## making-9: demo/making/index.html, inline script, line 140

````js
    /**
     * ⚠️ NO COUNT IN THIS SENTENCE, AND IT HAD ONE FOR AN HOUR. It read
     * `Twenty-eight MIMproject videos` and went stale the first time a
     * recording was taken out, which was the same day. A figure typed into
     * prose is a second copy of something the corpus already knows, and
     * CLAUDE.md's own opening paragraph carries the scar of a count nobody
     * re-measured reading as a fact. The number is in the log line under the
     * list, counted off the rows actually drawn.
     */
````

<a id="making-10"></a>
## making-10: demo/making/index.html, inline script, line 151

````js
    /**
     * Six cells, and every one of them changes when a different row is
     * pressed. A readout cell showing a structural constant reads as a
     * measurement and teaches a reader to ignore the row.
     *
     * 🔴 `when` AND `uploaded` ARE TWO CELLS BECAUSE THEY ARE TWO FACTS, and
     * putting them side by side is the clearest thing this page can say. `when`
     * is the date of the WORK; `uploaded` is the day somebody got round to
     * putting it on a video site, which for most of these is years later. The
     * Karlsruhe clips are the extreme: made in 2008, uploaded in 2011.
     * ⚠️ FIVE ROWS HAVE NO `when` AT ALL and that cell is EMPTY for them, while
     * `uploaded` still reads. That is the honest pair: nothing states when they
     * happened, an upload date is not an answer to that question, and the
     * reader can see both of those at once.
     * ⚠️ `via` IS HERE RATHER THAN IN THE TABLE because it is the third half of
     * the same thought: which site the copy came off. It also keeps the count
     * even, which `mount()` insists on.
     */
````

<a id="making-11"></a>
## making-11: demo/making/index.html, inline script, line 169

````js
    /* 🔴 NO READOUT, AND THE TABLE IS WHY. Instructed 2026-09-19: *"rm when,
       uploaded, via, length, picture, size from making and add these to
       table"*. Every one of those six was a fact about ONE recording, shown
       above a list of twenty-six, so the row you were reading and the row the
       cells described were only the same row while you did not move. In a
       column they are true of every row at once and comparable down the list,
       which is what a table is for.
       ⚠️ `null` RATHER THAN AN OMITTED FIELD, so both harnesses read the opt
       out as deliberate rather than as somebody forgetting. */
````

<a id="making-12"></a>
## making-12: demo/making/index.html, inline script, line 179

````js
    /**
     * 🔴 `joined` WAS PASSED HERE AND IS GONE SINCE 2026-09-28, BECAUSE IT IS
     * THE DEFAULT NOW AND THIS PAGE NO LONGER HAS AN ARGUMENT OF ITS OWN TO
     * MAKE. Asked, verbatim: *"global: move all reading sections atop of the
     * logs and glue them"*, and `shell.mjs` answers it for every page.
     * ⚠️ THE ARGUMENT THAT USED TO LIVE HERE IS WORTH KEEPING AS HISTORY AND
     * NOT AS A REASON. The flag sent the readout to the foot because the split
     * arrangement put those cells between the paragraph and the picture, and
     * MEASURED on an 872 px laptop that pushed the first row of the list to
     * y=866, below the fold. The list is this page's control surface, and a
     * player on top of a table nobody can see without scrolling is a player on
     * top of nothing. The cells became columns, which spent the crowding half
     * of it, and the default has now spent the rest.
     */
````

<a id="making-13"></a>
## making-13: demo/making/index.html, inline script, line 200

````js
  // ── the picture ───────────────────────────────────────────────────────────
  //
  // ⚠️ `preload="none"` IS THE WHOLE VISITOR RULE IN ONE ATTRIBUTE. CLAUDE.md:
  // a visit must not open a file, make a sound, press a control or move the
  // picture. `/tapes/` paid for this twice — once by loading a tape on every
  // visit, once by asking archive.org for durations it already had written
  // down — and the third report was *"omg you still do not get it"*. Every
  // number this page shows before a press comes out of the corpus, so nothing
  // here asks the bucket for anything until somebody chooses a recording.
````

<a id="making-14"></a>
## making-14: demo/making/index.html, inline script, line 209

````js
  /* ── two corpora, two tabs ──────────────────────────────────────────────────
     🔴 ASKED FOR 2026-09-19: *"add a tab to making VIDEOS | IMAGES and make it
     browsable"*. This is `tabs.mjs`'s FIRST use in a shipped page. It has been
     in `/kit/` unused since it was written, because it was on `/items/` for one
     commit and came off: three names over one list and one form is furniture.
     Two names over two different corpora is the case it exists for.

     ⚠️ A HASH, NEVER A SUBPAGE, which is the component's own rule and matters
     more here than on most pages: a subpage is a NAVIGATION, and this page has
     a `<video>` in it. Pressing IMAGES while a recording plays must not throw
     the document away, and `#images` is still a real address that the back
     button answers.

     ⚠️ AND NEITHER TAB COSTS A VISITOR ANYTHING UNTIL A ROW IS PRESSED. Both
     tables are text out of a corpus on this origin. The `<video>` is
     `preload="none"` and the `<img>` has no `src` at all, so opening IMAGES
     loads no picture — the same rule the rest of this page already keeps, and
     the one `/tapes/` was reported for three times. */
````

<a id="making-15"></a>
## making-15: demo/making/index.html, inline script, line 237

````js
    /**
     * 🔴 NO PRESENCE DOT. `left: null` rather than letting the component put
     * its default one there, asked for on sight as *"no need for dot"*.
     *
     * ⚠️ AND THE FACT IT CARRIED IS NOT LOST, WHICH IS THE HALF THAT MATTERS.
     * Deleting a display without rehoming what it said is how a page quietly
     * stops reporting something. A file that will not load says so in the log,
     * by name, and that line is the better surface for it anyway: it appears
     * when something happened rather than sitting there being green.
     *
     * ⚠️ AND THE `set` CALLS WENT WITH IT rather than being left to
     * optional-chain into nothing. `panel.presence?.set('online')` against a
     * panel with no presence is three lines that read as live and do nothing,
     * which is this repo's named hazard in its smallest form.
     */
````

<a id="making-16"></a>
## making-16: demo/making/index.html, inline script, line 262

````js
  /**
   * 🔴 THE DECK IS A FOLLOWER AND THE ELEMENT IS THE MASTER. The element owns
   * position once it is playing, so a control that writes to the deck alone is
   * undone by the master's next tick, silently, within a few hundred
   * milliseconds. Same arrangement as `/crate/`.
   *
   * The range opens at one millisecond and is corrected the moment a recording
   * is chosen. A deck built with a real range before there is a file would be a
   * slider describing a recording that is not in the element.
   */
````

<a id="making-17"></a>
## making-17: demo/making/index.html, inline script, line 277

````js
      // The playhead moves at once and the picture catches up: setting
      // `currentTime` on a file coming off a bucket is a range request, and it
      // arrives when the network says so. The deck may snap back a frame when
      // the bytes land, which is the master re-anchoring rather than a fault.
````

<a id="making-18"></a>
## making-18: demo/making/index.html, inline script, line 296

````js
  /**
   * 🔴 THE SAME NUMBER, IN A UNIT THAT CAN HOLD IT. `MB()` is right for the
   * recordings, which run 2.9 MB to 148 MB. It is WRONG for the pictures: the
   * thirty surviving thumbnails are 3 KB to 30 KB, and every one of them read
   * `0.0 MB` — a cell showing a confident zero for a file that is really there.
   * CLAUDE.md puts it the other way round and means the same thing: a page that
   * pre-sets a counter to 0 is worse than an empty cell, because a zero reads
   * as a very confident measurement of nothing.
   * ⚠️ THE THRESHOLD IS WHERE THE FIRST FIGURE STOPS BEING A ZERO, not a round
   * number picked for looking tidy.
   */
````

<a id="making-19"></a>
## making-19: demo/making/index.html, inline script, line 309

````js
  /**
   * 🔴 THE FILE NAME IS THE COLUMN THAT GROWS, because it is what somebody
   * scanning this list is reading down. The date, the length and the size are
   * fixed tracks: they are all the same handful of characters wide, and a
   * column that can reflow is a column that moves its neighbours.
   *
   * ⚠️ NO LINK COLUMN. `table.mjs` can make a cell a link to a field, and a
   * link inside a row whose whole job is to be pressed is two different things
   * to press an inch apart. Where the recording came from is on the row's
   * hover, with the rest of what the corpus knows about it.
   */
````

<a id="making-20"></a>
## making-20: demo/making/index.html, inline script, line 324

````js
      // ⚠️ `picture`, `via` and `uploaded` CAME OFF THE READOUT on 2026-09-19
      // and they sit to the right of the file on purpose: `when` and `file`
      // are what somebody scans for, and these three are what they check once
      // they have found it.
      // ⚠️ `picture` ALIGNS LEFT, asked for 2026-09-19 as *"align picure to
      // left in table"*, and it is the odd one out among the right-aligned
      // four for a reason: `uploaded`, `length` and `size` are quantities that
      // line up on their last digit, and `480x272` is a SHAPE, which has no
      // last digit to line up on. Left puts every resolution's first figure in
      // one place, next to the left-aligned `via` beside it.
````

<a id="making-21"></a>
## making-21: demo/making/index.html, inline script, line 343

````js
    /**
     * 🔴 PRESSING A ROW PLAYS IT. That is the page.
     * ⚠️ A ROW WITH NO ADDRESS SAYS SO RATHER THAN DOING NOTHING. A control
     * that looks live and is inert is this repo's named hazard, and a corpus
     * row whose `file` never made it into the bucket would be exactly that.
     */
````

<a id="making-22"></a>
## making-22: demo/making/index.html, inline script, line 358

````js
  /* 🔴 AN `<img>` WITH NO `src`, AND THAT IS THE WHOLE VISITOR RULE AGAIN. The
     video beside it is `preload="none"`; an image element with no address is
     the same statement in the one attribute an image has. Opening this tab asks
     the bucket for nothing.
     ⚠️ `decoding="async"` so a 3000x3000 sleeve does not decode on the main
     thread while somebody is scrolling the list under it. */
````

<a id="making-23"></a>
## making-23: demo/making/index.html, inline script, line 365

````js
  /* 🔴 SQUARE, BY THE COMPONENT'S OWN `aspect`, NOT BY A BOX THIS PAGE DREW.
     `video-panel.mjs` gained `aspect` for `/stage/`'s 4:3 film and it is the
     same question here. Hand-rolling a second picture box would give this page
     two surfaces that have to be kept looking alike by hand, which is the drift
     `/kit/` exists to stop.
     ⚠️ NO PRESENCE DOT, for the reason the video panel has none: there is
     nothing on the far end of a picture to be online. */
````

<a id="making-24"></a>
## making-24: demo/making/index.html, inline script, line 380

````js
  /**
   * 🔴 THE FILE NAME GROWS AND EVERYTHING ELSE IS A FIXED TRACK, the same
   * arrangement as the recordings, because it is the same act: reading down a
   * list looking for one thing.
   *
   * ⚠️ `picture` ALIGNS LEFT HERE TOO. Asked for on the videos tab
   * (*"align picure to left in table"*) and it is the same column answering the
   * same question, so it gets the same answer: `3000x3000` is a SHAPE, with no
   * last digit for a right edge to line up.
   *
   * ⚠️ `site` IS FIRST BECAUSE FOUR SITES LIVED ON ONE DOMAIN and which one a
   * picture came off is the first thing that makes sense of it. The opera, the
   * portfolio and the project site are different bodies of work.
   *
   * ⚠️ AND `captured` IS NOT A DATE OF WORK. It is the day the Wayback Machine
   * took the copy we hold, which for the 2013 Drupal pictures is years after
   * the thing in them. `uploaded` is the month the file went into the site and
   * is empty wherever the path never said, which is most of the older ones.
   */
````

<a id="making-25"></a>
## making-25: demo/making/index.html, inline script, line 411

````js
    /**
     * 🔴 PRESSING A ROW SHOWS IT. That is this tab, exactly as pressing a row
     * plays a recording is the other one.
     * ⚠️ A ROW WITH NO ADDRESS SAYS SO rather than doing nothing, which is the
     * same guard the recordings have and for the same reason: a control that
     * looks live and is inert is this repo's named hazard.
     */
````

<a id="making-26"></a>
## making-26: demo/making/index.html, inline script, line 434

````js
    /* ⚠️ THE LOG SAYS WHAT IT IS AND WHERE IT CAME FROM, because a file name
       off a dead website is not self-explanatory and the row's hover is gone
       the moment the pointer moves. A thumbnail says it is one HERE as well as
       in its column: it is the fact most likely to disappoint somebody who has
       just pressed it. */
````

<a id="making-27"></a>
## making-27: demo/making/index.html, inline script, line 442

````js
  /**
   * 🔴 A PICTURE THAT WILL NOT LOAD SAYS SO. Same reasoning as the video's
   * error handler: without it the log says `showing …`, the element fails
   * silently, and the only symptom is a box that stays empty.
   */
````

<a id="making-28"></a>
## making-28: demo/making/index.html, inline script, line 457

````js
  /**
   * Show a recording, and optionally start it.
   *
   * ⚠️ THE RANGE COMES FROM THE CORPUS FIRST AND THE ELEMENT SECOND. The length
   * of every one of these was measured with ffprobe when the file was pulled
   * and written down, so the transport has somewhere to go before a single byte
   * has arrived. `loadedmetadata` then corrects it from the file itself, and
   * the check below asserts the two agree — which is the one claim this page
   * can make that the corpus cannot make about itself.
   */
````

<a id="making-29"></a>
## making-29: demo/making/index.html, inline script, line 477

````js
    /**
     * 🔴 `preload` IS LIFTED HERE AND NOWHERE ELSE, AND THAT IS THE WHOLE
     * ARRANGEMENT. It starts at `none` so a visit costs nothing; a press is
     * somebody asking for this recording, which is the moment loading stops
     * being something done TO them.
     * ⚠️ AND IT IS WHY THE FIRST BUILD OF THIS PAGE READ `file no answer`.
     * With `preload="none"` a `load()` resets the element and fetches NOTHING,
     * so `loadedmetadata` never fires, `video.duration` stays `NaN`, and the
     * check comparing the corpus against the file had nothing to compare
     * against. It looked like a bucket problem and was one attribute.
     */
````

<a id="making-30"></a>
## making-30: demo/making/index.html, inline script, line 505

````js
  /**
   * 🔴 A FILE THAT WILL NOT LOAD SAYS SO. Without this the page logs `playing
   * …`, the element fails silently, the deck keeps whatever range the corpus
   * gave it and the only symptom is a transport that never moves — a page
   * reporting an action it did not manage to take.
   */
````

<a id="making-31"></a>
## making-31: demo/making/index.html, inline script, line 537

````js
      // ⚠️ THE UPLOAD DATE IS ITS OWN COLUMN AND NEVER FILLS THE EMPTY `when`.
      // The corpus is explicit that most of these went up years after the
      // thing they show, and five rows state no date at all, so a row with an
      // empty `when` and a filled `uploaded` is the corpus being read
      // correctly rather than a gap to patch.
````

<a id="making-32"></a>
## making-32: demo/making/index.html, inline script, line 561

````js
    /**
     * 🔴 THE EDITORIAL CLAIM, ASSERTED RATHER THAN TRUSTED. Two of these
     * recordings were filmed and uploaded by Kanuti Gildi SAAL: the
     * productions are co-productions, the recordings are theirs. A corpus that
     * let "MIMproject" stand over the whole file because most of the file is
     * ours would be making a licence statement nobody checked.
     */
````

<a id="making-33"></a>
## making-33: demo/making/index.html, inline script, line 568

````js
    /**
     * ⚠️ THE FIRST VERSION OF THIS CHECK WAS BLIND AND A REAL DEFECT WALKED
     * PAST IT. It compared `theirs.length` against `counts.theirs`, and both
     * are derived from the same field, so when the opera interview silently
     * flipped to being credited to us the pair still agreed perfectly. Only the
     * DETAIL line moving from `2 of 28` to `1 of 26` gave it away, read by a
     * human. CLAUDE.md's rule exactly: a statistic that is constant by
     * construction over its subject is not a weak measurement, it is a blind
     * one.
     *
     * So this compares two fields that are maintained SEPARATELY: the note,
     * which is editorial prose written by hand, against `source`, which comes
     * from a lookup table. For them to agree by accident, the same mistake has
     * to be made twice in two places.
     */
````

<a id="making-34"></a>
## making-34: demo/making/index.html, inline script, line 593

````js
    /**
     * ⚠️ THE NEGATIVE CONTROL FOR THE LINE ABOVE. A check that only counts the
     * foreign rows would pass just as well on a corpus where every row was
     * marked foreign. This one asserts the other side of the same split.
     */
````

<a id="making-35"></a>
## making-35: demo/making/index.html, inline script, line 603

````js
    /**
     * 🔴 AN UNDATED ROW IS UNDATED, NOT QUIETLY BACKFILLED. Five rows carry
     * `precision: "none"` because nothing states when they happened. The trap
     * this guards is a later change that reaches for `uploaded` to fill the
     * gap, which would date five works to the day somebody got round to
     * uploading them and would look completely fine.
     */
````

<a id="making-36"></a>
## making-36: demo/making/index.html, inline script, line 617

````js
    /**
     * 🔴 THE PICTURE FILLS THE BOX RATHER THAN SITTING INSIDE IT, ASSERTED
     * BECAUSE THE FAILURE IS SILENT. This is one page-level rule overriding a
     * shell default, and CLAUDE.md records what that costs when the selector
     * stops matching: `/archive/radio/` swapped a component, one of three rules that
     * named the old class was updated, and the JavaScript and the comment
     * beside it both read as correct while the row snapped back. Reported three
     * times. A letterboxed picture would read as nothing at all.
     */
````

<a id="making-37"></a>
## making-37: demo/making/index.html, inline script, line 646

````js
        // 🔴 EMPTY WHERE THE PATH NEVER SAID. WordPress writes
        // `/uploads/2017/09/` and Drupal writes nothing, so an older picture
        // honestly has no upload month. Filling it from `capturedAt` would date
        // a 2013 photograph to 2013 by coincidence and to 2021 by accident.
````

<a id="making-38"></a>
## making-38: demo/making/index.html, inline script, line 669

````js
      /**
       * 🔴 NO SIZE CELL READS A CONFIDENT ZERO. Found by looking at the page:
       * a 41 KB rendition and every one of the thirty thumbnails printed
       * `0.0 MB`, because the recordings' formatter shows one decimal of a
       * megabyte and these files are three orders of magnitude smaller. Nothing
       * about that is visible in a count, in a total, or in any check that
       * compares the corpus against itself — the row was present, the number
       * was derived from the real byte count, and it said nothing.
       * ⚠️ THE CHECK IS ON THE RENDERED STRING, not on the formatter. Asserting
       * `SIZE(1000) === '1 KB'` would be testing the function against the same
       * arithmetic it implements, which CLAUDE.md records as the defect that
       * kept `csound.mjs` green for months with two real bugs in it.
       */
````

<a id="making-39"></a>
## making-39: demo/making/index.html, inline script, line 682

````js
      /**
       * 🔴 ONE TAB STOP FOR THE WHOLE LIST, NOT ONE PER ROW. `table.mjs` gained
       * a roving tabindex on 2026-09-19 (*"allow keyboard nav in tables"*), and
       * the thing worth asserting is the ROVING part rather than the arrows:
       * every row used to be `tabIndex = 0`, so tabbing past this table meant
       * sixty-three presses. That is invisible in a screenshot and invisible in
       * every other check, and it is free to read off the DOM.
       * ⚠️ AND THE NEGATIVE HALF IS THE POINT: not just "one row is 0" but
       * "every other row is -1". A table that left them all at 0 and added one
       * more would pass the first half.
       */
````

<a id="making-40"></a>
## making-40: demo/making/index.html, inline script, line 708

````js
      /**
       * 🔴 THE BOX IS SQUARE AND FITS BY WIDTH OR HEIGHT, ASSERTED BECAUSE
       * BOTH HALVES FAIL SILENTLY. This page overrides the shell's `contain`
       * with `cover` for the video one line away in its own stylesheet, and a
       * picture cropped instead of fitted looks like a composition choice
       * rather than a bug.
       * ⚠️ THIS COMMENT SAID WIDENING THAT RULE TO `.pos-vp-stage > *` WOULD
       * CROP EVERY RECOVERED PICTURE, AND THE SABOTAGE THAT WAS MEANT TO PROVE
       * IT REFUTED IT. `shell.css` has `.pos-vp-stage > img`, which is
       * (0,1,1); `> *` is (0,1,0) and LOSES. What that widening actually does
       * is break the VIDEO, because the page's own `> video` rule is gone and
       * `> *` loses to the shell's `> video` too — measured, and the video's
       * assert went red while this one stayed green and correct. The rule that
       * WOULD crop these is one naming `img`, which is the thing to watch.
       * ⚠️ AND THE RATIO IS READ OFF THE COMPUTED STYLE rather than off the
       * option that was passed. `aspect: '1 / 1'` is what we asked for;
       * `aspectRatio` is what the browser resolved, and a stylesheet rule
       * landing later would beat the inline one without either being wrong to
       * read.
       */
````

<a id="making-41"></a>
## making-41: demo/making/index.html, inline script, line 733

````js
      /**
       * 🔴 A THUMBNAIL SAYS IT IS ONE, AND THE NEGATIVE CONTROL IS THE HALF
       * THAT MAKES IT WORTH ANYTHING. A check that only counted the flagged
       * rows would pass on a corpus where every row was flagged. This asserts
       * BOTH that every flagged row really is small AND that no unflagged row
       * is, so the flag cannot drift away from the pixels it describes.
       */
````

<a id="making-42"></a>
## making-42: demo/making/index.html, inline script, line 748

````js
      /**
       * 🔴 WHAT IS GONE IS PART OF THE RECORD. 196 pictures are referenced by
       * an archived page and were never captured, and the bulk of them is the
       * opera production photography. A list that showed only what survived
       * would read as though that were everything there ever was, which is the
       * one thing an archive page must not say.
       */
````

<a id="making-43"></a>
## making-43: demo/making/index.html, inline script, line 768

````js
    /**
     * 🔴 THE BOUNDARY THIS PAGE CANNOT WORK WITHOUT, ASSERTED RATHER THAN
     * ASSUMED. Seeking inside a 250 MB recording is a Range request, and a
     * `<video>` on a page at another origin needs the CORS header too. Both
     * come from the station worker's `/media/` route; neither is visible in
     * anything the page draws, so without this the day one of them stops the
     * only symptom is a transport that will not scrub.
     */
````

<a id="making-44"></a>
## making-44: demo/making/index.html, inline script, line 780

````js
      /**
       * ⚠️ `access-control-allow-origin` IS NOT READABLE FROM JAVASCRIPT AND
       * THE FIRST BUILD OF THIS CHECK ASKED FOR IT. The browser consumes that
       * header; it is not in the safelist and not exposed, so
       * `headers.get(...)` answers `null` on a response that carried it. The
       * check read `allow-origin none` against a bucket that sends `*`, which
       * is a red assert about a page that is working.
       *
       * `res.type` is the readable form of the same fact. A cross-origin
       * response that the browser let through reads `cors`; one it refused
       * never resolves at all, and a same-origin one reads `basic`, which
       * would mean this page had stopped asking the bucket.
       */
````

<a id="making-45"></a>
## making-45: demo/making/index.html, inline script, line 805

````js
    /**
     * 🔴 THE NEGATIVE CONTROL, AND IT IS A SECOND RANGE RATHER THAN A MISSING
     * KEY. "It answered 206 with two bytes" proves nothing against a route that
     * hands back the first two bytes of the file whatever was asked for, which
     * is exactly what a naive implementation does. A SUFFIX range asks for the
     * LAST two bytes: a server computing real ranges says so in
     * `content-range`, and one that ignored the header cannot.
     *
     * ⚠️ IT WAS A 404 PROBE FIRST AND THAT COST A RED RUN. Fetching a key
     * nothing wrote does answer 404, and Chrome files `Failed to load resource`
     * in the console for it, which `demo/verify.mjs` counts — so the page was
     * 21/22 with its own negative control as the one failure. A check that has
     * to make the console look broken to prove something is the wrong check.
     *
     * ⚠️ `content-range` IS READABLE HERE ONLY BECAUSE THE WORKER EXPOSES IT.
     * It is not CORS-safelisted; `workers/station/worker.mjs` sends
     * `access-control-expose-headers: content-length, content-range,
     * accept-ranges`. Drop that and this goes red on a bucket that is serving
     * correctly, which is worth knowing before anybody edits those headers.
     */
````

<a id="making-46"></a>
## making-46: demo/making/index.html, inline script, line 840

````js
    /**
     * 🔴 THE ONE CLAIM THIS PAGE CAN MAKE THAT THE CORPUS CANNOT MAKE ABOUT
     * ITSELF. `durationMs` was measured with ffprobe on the file before it was
     * uploaded; this reads the length the BROWSER finds in the bytes the bucket
     * actually serves. A truncated upload, a swapped file or a mis-keyed row
     * all show up here and nowhere else.
     *
     * ⚠️ The tolerance is a second and a half, not zero: a container's declared
     * duration and a decoder's idea of it differ by the length of a frame or
     * two, and a check that demanded equality would be measuring the container
     * format rather than the file.
     */
````

<a id="making-47"></a>
## making-47: demo/making/index.html, inline script, line 866

````js
    /**
     * 🔴 A PICTURE CAME OUT, AND `readyState` CANNOT SAY THAT. CLAUDE.md
     * already records `/flipper/` reading 8/8 against a closed port because its
     * check was satisfied by `!!c.hls` — true the instant the constructor
     * returns — and records that the repair is not a better INSTANT, because
     * `readyState` is an instant too. `totalVideoFrames` counts what this
     * element has EVER decoded, and nothing resets it.
     *
     * ⚠️ IT IS WORTH ITS OWN CHECK BECAUSE THE FAILURE IS SILENT AND I HAVE
     * SEEN IT: a `<video>` sitting at `readyState 0`, `networkState 2`, no
     * error event, forever, while `fetch` on the same URL returns 206 in
     * 169 ms. Metadata parsing and decoding are two different claims.
     *
     * ⚠️ MUTED, AND PUT BACK WHERE IT WAS FOUND. A harness has no speakers, and
     * the play/pause drill that runs after this needs the transport parked at
     * zero and not running: a bar that is already going is PAUSED by the
     * drill's press, and it would read a playhead going nowhere on a page where
     * nothing is wrong.
     */
````

<a id="making-48"></a>
## making-48: demo/making/index.html, inline script, line 902

````js
    /**
     * 🔴 THE IMAGES TAB IS DRIVEN HERE BECAUSE NOTHING ELSE CAN REACH IT.
     * `demo/verify.mjs` works a page by clicking every button in
     * `.pos-controls`, and a tab is not in that row — it is a place you go, not
     * a setting. So without this the whole second half of the page would be
     * graded by the asserts that run on its DATA and by nothing that touches
     * its picture. CLAUDE.md records the same shape from the other side: a
     * control the harness cannot press is a check that never runs, and the
     * suite stays green either way because those asserts do not fail.
     */
````

<a id="making-49"></a>
## making-49: demo/making/index.html, inline script, line 915

````js
      /**
       * 🔴 THE BOX IS SQUARE IN LAID-OUT PIXELS, AND THIS CHECK CANNOT RUN
       * UNTIL THE TAB IS OPEN. A hidden tab panel has NO layout, so the first
       * build of this assert read `0.0x0.0 px` and went red on a page that was
       * drawing correctly. That is why it sits here, behind the gate, one line
       * after the tab is shown, rather than with the declared-value check
       * above: opening a tab is a mutation and a visitor does not get one.
       *
       * 🔴 AND IT IS A DIFFERENT CLAIM FROM THE ONE ABOVE, WHICH IS THE WHOLE
       * POINT. The computed `aspect-ratio` and `object-fit` were BOTH correct
       * while this box rendered 775 px wide and pushed the list under the fold,
       * because `.mk-square` sat above `.pos-vp { width: 100% }` in this page's
       * own stylesheet and lost on source order at every width. CLAUDE.md's
       * rule for a dead CSS rule is to read the COMPUTED value, and the value
       * that was wrong is a width.
       */
````

<a id="making-50"></a>
## making-50: demo/making/index.html, inline script, line 936

````js
      /**
       * 🔴 THE ARROWS MOVE THE KEYBOARD, AND THEY MOVE IT WITHOUT OPENING
       * ANYTHING. Both halves matter. `onPick` here fetches a picture off the
       * bucket, so an arrow that picked would spend a visitor's bandwidth on
       * every row they stepped past — the load-on-visit defect arriving through
       * the keyboard. This drives a real `ArrowDown` and asserts the focus
       * moved AND that nothing was opened.
       * ⚠️ BEHIND THE GATE BECAUSE IT MOVES FOCUS, which draws a ring on a row
       * a visitor did not choose.
       */
````

<a id="making-51"></a>
## making-51: demo/making/index.html, inline script, line 955

````js
      /**
       * 🔴 STEPPING KEEPS THE FOCUSED ROW INSIDE THE TABLE AND LEAVES THE PAGE
       * WHERE IT IS. Reported 2026-09-20: *"do not make keyboard focused item
       * move away from viewport of table when keep using keyboard"*.
       *
       * 🔴 THE PAGE HALF IS THE ONE THAT WAS BROKEN AND IS THE EASIEST TO
       * FORGET TO CHECK. `focus()` and `scrollIntoView()` both scroll EVERY
       * scrollable ancestor, the document included, so the old code moved the
       * whole page under the table on every press. Asserting only "the row is
       * visible" would pass on that, because scrolling the page is one of the
       * ways to make a row visible.
       *
       * ⚠️ IT WALKS THE WHOLE LIST RATHER THAN PRESSING ONCE. A single press
       * from row 0 moves nothing: the second row is already on screen. The
       * failure only shows up once the list has scrolled, which is why this
       * steps 62 times and checks after every one.
       */
````

<a id="making-52"></a>
## making-52: demo/making/index.html, inline script, line 992

````js
      /**
       * 🔴 AND THE ROW IS NOT FLUSH AGAINST THE EDGE, which is the difference
       * between "technically visible" and "navigable". `scrollIntoView({ block:
       * 'nearest' })` puts each new row exactly on the boundary, so somebody
       * stepping down always reads the bottom-most row with nothing under it.
       * ⚠️ THE ENDS ARE EXEMPT AND HAVE TO BE, because at row 0 and the last
       * row there is nowhere to put the margin. Checking a middle row is the
       * honest form of this claim.
       */
````

<a id="making-53"></a>
## making-53: demo/making/index.html, inline script, line 1011

````js
      /**
       * 🔴 A FULL SCREEN PANEL DROPS ITS OWN SHAPE, WHICH IS WHAT CENTRES THE
       * PICTURE. Asked as *"center fullscreen images"* and *"put back from
       * fullscreen to sceen corner"*, which are one cause: the stage kept
       * `aspect-ratio: 1 / 1` on a 16:9 screen, so the picture sat high and the
       * exit button, which is `position: absolute` INSIDE that stage, went up
       * there with it.
       * ⚠️ THE HOOK IS DRIVEN RATHER THAN THE API, and that is not a dodge.
       * `requestFullscreen` needs user activation the harness cannot always
       * give, and `video-panel.mjs` sets `data-full` from `syncFull()` on BOTH
       * routes precisely so the real API and the faux cover cannot diverge.
       * Asserting the hook asserts both.
       */
````

<a id="making-54"></a>
## making-54: demo/making/index.html, inline script, line 1027

````js
      /* 🔴 DELETED, NOT EMPTIED, WHICH IS THE BUG THIS CHECK FOUND IN
         `video-panel.mjs`. `[data-full]` matches an empty attribute, so
         `dataset.full = ''` left every fullscreen rule applying to a panel that
         had come back. The component deletes it now and so does this. */
````

<a id="making-55"></a>
## making-55: demo/making/index.html, inline script, line 1045

````js
      /**
       * ⚠️ `naturalWidth` AGAINST THE CORPUS IS THE CLAIM WORTH MAKING, and it
       * is the picture version of the length check above: the corpus says what
       * was measured off the bytes before they were uploaded, and this reads
       * what the browser found in the bytes the bucket actually served. A
       * truncated upload, a swapped file or a mis-keyed row shows up here and
       * nowhere else. `complete` alone would not: it is true for a failed load.
       */
````

<a id="making-56"></a>
## making-56: demo/making/index.html, inline script, line 1058

````js
      /**
       * 🔴 PUT THE PAGE BACK. The harness's play drill presses
       * `__demo.transport.el`'s own toggle, and that bar lives inside the
       * VIDEOS panel — which `tabs.go('images')` has just set `hidden`. A check
       * that leaves the page on another tab would break a drill that has
       * nothing to do with it, on a page where nothing is wrong.
       */
````

<a id="making-57"></a>
## making-57: demo/making/index.html, inline script, line 1074

````js
  /**
   * ⚠️ NO `transport` KEY HERE, AND THE FIRST BUILD HAD ONE. `transport-bar.mjs`
   * publishes `__demo.transport` ITSELF, and what it publishes is its `api` —
   * the object carrying `position`, `playing`, `range` and `el`, which is what
   * `demo/verify.mjs` reads. `createTransportBar` RETURNS a wrapper around that
   * api, so assigning the return value here replaced the published object with
   * one that has no `position`, and the harness read `pos undefined` and then
   * threw on `t0.pos.toFixed`. A page that re-publishes what a component
   * already published can only ever disagree with it.
   */
````
