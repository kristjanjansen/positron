# Page comments: kit-timeline

The full comments cut from the code under demo/ for kit-timeline, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="kit-timeline-1"></a>
## kit-timeline-1: demo/kit/timeline/index.html, inline script, line 28

````js
  /**
   * 🔴 kit/timeline, ONE PART OF `/kit/` ON A PAGE OF ITS OWN, 2026-10-06
   * (plans/plan-kit-split.md). Every block, holder and check below is copied
   * VERBATIM from `demo/kit/index.html`, in that file's order, so the newest
   * block is still the first. What changed is mechanical: `section()` lost its
   * first argument, the holders sit here rather than at the top of the
   * monolith, the measuring window and the tab row are gone, and every check
   * is behind `?selfcheck=1`.
   */
````

<a id="kit-timeline-2"></a>
## kit-timeline-2: demo/kit/timeline/index.html, inline script, line 45

````js
  // The way out of full screen, and the strip that says what is under the
  // pointer. ⚠️ DECLARED UP HERE WITH EVERY OTHER HOLDER, for the reason the
  // comments above give: these two blocks are the newest and therefore the
  // topmost, and a `let` left where a block used to be is read in its dead zone
  // and swallowed by `section()` into `failed`.
  // The panel with a transport glued under it, held for the two checks that
  // measure it. ⚠️ DECLARED UP HERE WITH EVERY OTHER HOLDER, for the reason the
  // comments above give: this is the newest block and therefore the topmost,
  // and a `let` left where a block used to be is read in its dead zone.
  // The four shapes a transport bar takes, and the message it refuses one pair
  // with. ⚠️ DECLARED UP HERE WITH EVERY OTHER HOLDER, for the reason the lines
  // above give: a `let` left beside a block that moves is read in its dead zone.
````

<a id="kit-timeline-3"></a>
## kit-timeline-3: demo/kit/timeline/index.html, inline script, line 65

````js
  // The three panel specimens, for the checks at the foot of this file: one
  // with an absorber, one without as the negative control, and one at a phone's
  // width. ⚠️ DECLARED UP HERE WITH EVERY OTHER HOLDER, for the reason the
  // lines above give: this is the newest block and therefore the topmost one,
  // and a `let` left where a block used to be is read in its dead zone,
  // swallowed by `section()` into `failed`, and reported much later with a
  // message about a different line.
````

<a id="kit-timeline-4"></a>
## kit-timeline-4: demo/kit/timeline/index.html, inline script, line 73

````js
  /**
   * 🔴 NEWEST AT THE TOP: A LIVE RUN, 2026-10-12. Asked on
   * /concepts/clock/090/ as *"keep minimum separation between event bars? why
   * cursor aint moving? ... we need std behaviour here"*. A lane of 50 marks a
   * second, one in 37 late, that has been running for 20 s when the page
   * opens: the whole run is in view at a round span, the write head is the
   * cursor and walks across it, the view steps out only when the head reaches
   * the edge (*"lines move very nervously here"*, on clock/010, was a view
   * refitted every frame), and the marks are binned because they are closer
   * than their room. It stops by itself after a minute and the head stays.
   * ⚠️ NOTHING IS FETCHED AND NO TIMER WRITES ROWS. The rows are a function of
   * the strip's own write head, so a visit costs one canvas and nothing else.
   */
````

<a id="kit-timeline-5"></a>
## kit-timeline-5: demo/kit/timeline/index.html, inline script, line 117

````js
  /**
   * 🔴 THE SHAPES A TRANSPORT BAR TAKES, AND EVERY ONE OF THEM IS A RULE THAT
   * WAS PAID FOR. Asked 2026-09-21 as *"time: add transport examples"*, because
   * the most configurable component in the kit was demonstrated in exactly one
   * of its shapes on the page whose job is to make drift visible.
   *
   * ⚠️ FOUR VIEWS OF ONE DECK, NOT FOUR DECKS. Nothing on this page may move
   * unless a reader asked it to, and four decks would be four clocks running
   * behind a gallery. One idle deck with no adapters offers no rates, so the
   * bars draw no rate row and what is on show is the shape of the row itself.
   *
   * 🔴 AND EXACTLY ONE OF THEM PUBLISHES. `__demo.transport` is the only handle
   * a CDP check has, and every bar used to claim it unconditionally, so which
   * bar the harness graded was decided by SOURCE ORDER rather than by the page:
   * `/stage/` grew a second bar and the wrong one won by being further down the
   * file. This page now holds four, which makes it the worst case in the
   * repository, so the whole row claims the handle and every other specimen
   * passes `publish: false`. Asserted both ways, because a page where nothing
   * claimed it and a page where two did would look the same from the count.
   */
````

<a id="kit-timeline-6"></a>
## kit-timeline-6: demo/kit/timeline/index.html, inline script, line 137

````js
  /**
   * 🔴 THE NEWEST COMPONENT, AT THE TOP OF ITS GROUP, WHICH IS THIS PAGE'S OWN
   * RULE. Built 2026-09-21 after `/pack/` was asked twice for it: *"can we see
   * actual notes on timeline"*, then *"so can you show notes in timeline in
   * pack?"*.
   * 🔴 AND IT IS DELIBERATELY NOT `strip.mjs`, which is the component directly
   * below it and the reason this specimen sits here rather than anywhere else.
   * A strip draws marks against a DECK, in milliseconds, and its mark colour is
   * reserved for HOW A MARK LANDED. A Circuit pattern has no milliseconds in it
   * and the thing worth seeing is PITCH, which a strip has no axis for.
   */
````

<a id="kit-timeline-7"></a>
## kit-timeline-7: demo/kit/timeline/index.html, inline script, line 155

````js
      /* Two patterns a reader can check by eye: a rising line and a falling
         one, at alternate steps, so the axis is provable from the picture
         rather than only from the footer. Lengths in steps on one of them, so
         both footer forms are on the page: `2 steps` and a raw `gate 13`. */
````

<a id="kit-timeline-8"></a>
## kit-timeline-8: demo/kit/timeline/index.html, inline script, line 169

````js
      /* 🔴 THE AXIS IS ASSERTED RATHER THAN DESCRIBED, which is what this page
         is for: a specimen nothing grades is a picture of a component that may
         already have stopped working. A higher note must sit higher, and two
         patterns must be two rows. */
````

<a id="kit-timeline-9"></a>
## kit-timeline-9: demo/kit/timeline/index.html, inline script, line 175

````js
      // ⚠️ GATED HERE, 2026-10-06: it ran for every visitor of `/kit/`, and on
      // these pages every check is behind `?selfcheck=1`.
````

<a id="kit-timeline-10"></a>
## kit-timeline-10: demo/kit/timeline/index.html, inline script, line 193

````js
      // ⚠️ ONE DECK. See the note above: four would be four clocks.
````

<a id="kit-timeline-11"></a>
## kit-timeline-11: demo/kit/timeline/index.html, inline script, line 204

````js
      /**
       * 🔴 THE WHOLE ROW, AND IT IS THE ONE BAR ON THIS PAGE THAT PUBLISHES.
       * `publish` defaults to true, so this passes nothing, and that is the
       * point: shown in only one of its two states the option is a rule with no
       * specimen, which is the drift this page exists to catch and is exactly
       * what `CONTROL ROW` records about a primary button that is working.
       * ⚠️ AND IT GIVES THE HARNESS A DEFINED PLAYHEAD INSTEAD OF AN ACCIDENTAL
       * ONE. `__demo.transport` is the only handle a CDP check has; with four
       * other bars on the page the winner would otherwise be whichever was
       * built LAST, which is a fact about source order rather than a statement
       * about the page, and is how `/stage/` handed the suite the wrong bar.
       * `verify.mjs` will press this toggle and seek this deck, on a deck with
       * no adapters whose only job is to have a position.
       */
````

<a id="kit-timeline-12"></a>
## kit-timeline-12: demo/kit/timeline/index.html, inline script, line 221

````js
      /**
       * 🔴 ONE POSITION SURFACE PER PAGE. A page with a strip passes this,
       * because two horizontal time axes at different scales stacked is not a
       * redundancy, it is a contradiction: the strip already seeks on press AND
       * on drag, which the bar's slider never did.
       */
````

<a id="kit-timeline-13"></a>
## kit-timeline-13: demo/kit/timeline/index.html, inline script, line 230

````js
      /**
       * 🔴 A BAR WITH NO PLAY BUTTON AT ALL, AND WHAT IT CARRIES INSTEAD. Play,
       * pause and seek are all claims about a POSITION INSIDE A SOUND, and
       * `/knobs/` has none: a note sounds while a key is held, so there is
       * nothing to start or resume and a toggle whose only honest behaviour is
       * to do nothing is the shape of control this project calls a lie. What
       * such a bar keeps is the chip, and on both board pages that is the
       * presence badge, because the fact worth having about an instrument in
       * another building is whether it is answering.
       * ⚠️ IT DISARMS WHAT DEPENDED ON PLAYING rather than leaving it to read
       * false by luck: `api.playing` is forced false, the space bar stops being
       * a play key, the end stop never arms, and `api.toggles` says so in one
       * boolean that `demo/verify.mjs` reads before its play drill.
       */
````

<a id="kit-timeline-14"></a>
## kit-timeline-14: demo/kit/timeline/index.html, inline script, line 249

````js
      /**
       * 🔴 AND THE ONE PAIR IT REFUSES, SHOWN AS THE REFUSAL. A chip and a live
       * badge want the same position in the row, so asking for both is asking
       * the bar to draw two things in one place; it throws rather than picking.
       * A specimen showing a refusal is worth as much as one showing a shape,
       * which this page already does for a readout with an odd number of cells
       * and for a table with two growing columns.
       */
````

<a id="kit-timeline-15"></a>
## kit-timeline-15: demo/kit/timeline/index.html, inline script, line 279

````js
      // 🔴 HALF THE WIDTH THE BOX GIVES IT, asked 2026-09-20: *"make it half
      // w"*. `.kit-half` is `max-width: 50%` rather than a number of pixels,
      // because the box already owns this width and a figure typed here would
      // be a second opinion about it. MEASURED after the change: the seam, the
      // edges and the toggle's two states are all unmoved.
````

<a id="kit-timeline-16"></a>
## kit-timeline-16: demo/kit/timeline/index.html, inline script, line 294

````js
      /**
       * 🔴 A SECOND GLYPH BESIDE THE ⛶, WHICH IS WHAT THE RIGHT SLOT LOOKS LIKE
       * WITH TWO THINGS IN IT. `/stage/` puts the film's mute there. The
       * glyphs are `♫` U+266B and `⊘` U+2298, chosen by looking: the text style
       * speakers U+1F568 to U+1F56A are an empty tofu box in this font stack,
       * and U+1F507 and U+1F50A are emoji presentation, 21 px of colour beside
       * a ⛶ whose ink is 9.86 px of grey.
       * ⚠️ `setSymbol`, NEVER `textContent`. The centring lives in a span that
       * writing `textContent` throws away, which is the defect that module was
       * written for and is invisible until somebody looks closely at a button
       * whose glyph swaps.
       */
````

<a id="kit-timeline-17"></a>
## kit-timeline-17: demo/kit/timeline/index.html, inline script, line 324

````js
        /**
         * 🔴 `publish: false`, AND SINCE 2026-09-21 THAT REALLY IS A TIE BREAK
         * BETWEEN BARS. This comment used to say `/kit/` had no transport of
         * its own and never had one, which stopped being true the moment the
         * block above it landed: there are four bars on this page now and the
         * whole row is the one that claims `__demo.transport`. Whichever bar
         * claims it has to be a decision, because the alternative is source
         * order deciding, and this one is further down the file than that one.
         */
````

<a id="kit-timeline-18"></a>
## kit-timeline-18: demo/kit/timeline/index.html, inline script, line 335

````js
      // ⚠️ THE PANEL IS ALREADY IN THE BOX AND THE BAR IS APPENDED AFTER IT, so
      // this is the realistic order and the one the method is for: a page has
      // its picture on screen before it has built the bar that belongs to it.
````

<a id="kit-timeline-19"></a>
## kit-timeline-19: demo/kit/timeline/index.html, inline script, line 345

````js
      /**
       * 🔴 THE WAY BACK OUT OF FULL SCREEN, BUILT AND NEVER SHOWN. Reported
       * 2026-09-19 from an iPhone: *"I can not leave fullscreen on mobile"*,
       * asked for as *"make permanett squaer button with fullscreen icon on
       * bottom right when going to fullscreen in mobile. fade out it when no
       * activity"*, and its specimen was taken off this page on 2026-09-20.
       *
       * 🔴 IT IS KEPT BECAUSE TWO CHECKS PRESS IT. `/blocks/` shipped a way out
       * that was built, compiled and drawn every frame and never once updated,
       * so there was no way out of that page at all while every line of it read
       * correct. Reading that a control is wired is not the same claim as
       * pressing it, and a piece deleted with its specimen is a check that stops
       * running rather than one that fails.
       * ⚠️ OFF SCREEN AND LAID OUT, the same shape as the video panel's second
       * storey above and the faded probe at the foot of this file: the checks
       * read `getBoundingClientRect`, so `display: none` is not available and
       * `left: -9999px` is.
       * ⚠️ AND THE HOLDER TAKES NO INLINE `position` THE COVER WOULD HAVE TO
       * BEAT. `.pos-faux` is `position: fixed; inset: 0` from the stylesheet, a
       * fixed ancestor is not a containing block for a fixed child, and an
       * inline style on the host itself would have won against the class and
       * left the cover parked off the left edge of the screen.
       * ⚠️ NOTHING HERE SITS IN A `.pos-controls` ROW, ON PURPOSE. Both
       * harnesses press every button in that row, by position, so an invisible
       * button in one would be a press landing on nothing a visitor can see.
       * The way in is pressed by the checks at the bottom instead, which is also
       * the only way to prove the way out by pressing it.
       */
````

<a id="kit-timeline-20"></a>
## kit-timeline-20: demo/kit/timeline/index.html, inline script, line 376

````js
      // ⚠️ THE PIECE IS BUILT BEFORE THE HANDLER THAT READS IT. A `const`
      // declared under the closure that closes over it is this page's most
      // repeated defect, and it has already taken this file out once.
````

<a id="kit-timeline-21"></a>
## kit-timeline-21: demo/kit/timeline/index.html, inline script, line 382

````js
      // ⚠️ AN ORDINARY BUTTON, NOT A SHELL CONTROL, for the reason in the note
      // above. It is pressed from the checks rather than by the harness.
````

<a id="kit-timeline-22"></a>
## kit-timeline-22: demo/kit/timeline/index.html, inline script, line 398

````js
  /**
   * 🔴 ONE SECTION FOR ONE COMPONENT, MERGED 2026-09-20 on instruction: *"merge
   * STRIP VIEW + footer"*. They were `STRIP VIEW` and `STRIP FOOTER`, twenty
   * sections apart on the page, and the footer is an OPTION on the same call
   * rather than a second component. A reader meeting `createStripView` twice
   * has to work out that it is the same thing.
   *
   * The footer was asked for 2026-09-19 with a photograph of `/reel/` on an
   * iPhone: *"add feature to timeline: footer section, looks like glued that
   * shows hovered info below timeline"*. The photograph shows the sticky tap
   * tooltip covering the right half of the strip, four lines deep, over the
   * marks it is describing.
   *
   * ⚠️ THE STACK GOES INTO THE BOX BEFORE EITHER STRIP IS BUILT. `fit()`
   * measures the width it has been given, and a strip built into an element
   * that is not in the document yet measures nothing.
   */
````

<a id="kit-timeline-23"></a>
## kit-timeline-23: demo/kit/timeline/index.html, inline script, line 436

````js
        // ⚠️ A DECK NEEDS AN ADAPTER PER KIND, and without one the lane draws
        // NOTHING: a tall empty box, no error, no warning. That is what this
        // section was on its first attempt, and an empty component in a sandbox
        // is worse than an absent one, because it reads as the component being
        // broken.
````

<a id="kit-timeline-24"></a>
## kit-timeline-24: demo/kit/timeline/index.html, inline script, line 449

````js
      // ⚠️ NO SUBLABEL ON THE BARE ONE. `14 marks · 8 s` still ellipsized, the
      // gutter being narrower than fourteen characters at this width, and an
      // ellipsis means the content is in the wrong place rather than that the
      // box wants widening. A lane's own name is enough in a sandbox.
      // 'auto' takes exactly the height its lanes need. 'default' left a band
      // of empty canvas under a single lane.
````

<a id="kit-timeline-25"></a>
## kit-timeline-25: demo/kit/timeline/index.html, inline script, line 463

````js
        // 🔴 ONE LINE. Asked 2026-09-20 with a screenshot: *"1 line footer
        // here"*. The default is three, which is right on a page whose marks
        // carry a name, a time and a verdict; this specimen's marks carry a
        // number, so two of the three rows were reserved air under a single
        // sentence. **The specimen should show the component doing its job,
        // not its widest possible job.**
````

<a id="kit-timeline-26"></a>
## kit-timeline-26: demo/kit/timeline/index.html, inline script, line 476

````js
  /**
   * 🔴 NEWEST AT THE TOP, AND THE TWO PRESENCE BLOCKS ARE ONE. Asked 2026-09-17:
   * *"bring online offline up in kit and merge busy/test into it"*. They were
   * two sections because the busy words were built second, and that is a fact
   * about the order the work happened in rather than about the component: one
   * badge answers both questions, so a reader meeting it twice has to work out
   * that it is the same thing.
   *
   * ⚠️ A SECTION TITLE IS UPPERCASE, and `.kit-h` renders it so whatever is
   * typed. Type it uppercase anyway, so the source reads like the page.
   * ⚠️ AND MOVING A BLOCK MOVES EVERY BUTTON AFTER IT. `verify.mjs` presses by
   * position, so re-run `node demo/verify.mjs kit` and diff the assert count
   * after any reorder.
   */
````

<a id="kit-timeline-27"></a>
## kit-timeline-27: demo/kit/timeline/index.html, inline script, line 498

````js
      /**
       * 🔴 THE PICTURE IS THIS PROJECT'S OWN AND COMES FROM NOBODY'S SERVER.
       * `pattern.mjs` is drawn into a canvas here, so the specimen needs no
       * network, cannot 403, and looks the same on every run. CLAUDE.md's rule
       * about external sources has been broken twice; a gallery is the last
       * place to break it a third time.
       * ⚠️ ONE CANVAS PER PANEL AND ONE LOOP. A canvas cannot be in two places,
       * so the master is drawn once a frame and blitted, which is what `/stage/`
       * does with three of them.
       */
````

<a id="kit-timeline-28"></a>
## kit-timeline-28: demo/kit/timeline/index.html, inline script, line 512

````js
      /**
       * ⚠️ THREE ACROSS, NOT THREE DOWN. A panel is 16 by 9 and a page wide, so
       * three of them stacked is three screens of scrolling to compare things
       * that differ in one row of controls. Side by side they are compared at a
       * glance, which is what a gallery is for, and they wrap to one column on a
       * phone where the full width is what a panel actually gets.
       */
````

<a id="kit-timeline-29"></a>
## kit-timeline-29: demo/kit/timeline/index.html, inline script, line 531

````js
        /**
         * ⚠️ THE BADGE SAYS `LIVE` RATHER THAN SHOWING A LONE DOT. Asked
         * 2026-09-17: *"add LIVE to green bullet on footer"*. A coloured dot
         * with nothing beside it is a mark whose whole meaning is its hue, which
         * this project already has a rule about, and the panel's own default is
         * the dot mode because a footer usually holds several small things. Here
         * it holds one.
         */
````

<a id="kit-timeline-30"></a>
## kit-timeline-30: demo/kit/timeline/index.html, inline script, line 547

````js
      /**
       * 🔴 THE SECOND STOREY IS STILL GRADED AND IS NO LONGER SHOWN. The
       * specimen came off 2026-09-20 on instruction: *"rm a second storey under
       * the footer"*. It was asked for on 2026-09-19 with a photograph of
       * `/mirror/` filling an iPhone: *"extend videopanel footer in fullscreen
       * so it can have section below the footer bar (separaet with line). put
       * controlgroup there"*.
       *
       * 🔴 THE MECHANISM IS LIVE AND THIS IS THE ONLY THING THAT GRADES IT.
       * `/mirror/` calls `panel.under(knobRow)`, and in real element fullscreen
       * nothing outside the full subtree is on screen, so on a phone that row is
       * only reachable from inside the picture. Deleting the piece as well as the
       * specimen would take the check with it, which is this project's own rule
       * about a control you switch off. So it stays as an off-screen probe.
       * ⚠️ OFF SCREEN AND LAID OUT, the same shape as the way-out probe at the
       * foot of this file: the check reads `gridTemplateRows`, so `display:
       * none` is not available and `left: -9999px` is.
       * 🔴 IT IS THE SAME ELEMENT, MOVED. Two rows that can disagree about which
       * option is chosen would be a readout living in two files, so the check
       * grades that there is exactly ONE of them in the document.
       */
````

<a id="kit-timeline-31"></a>
## kit-timeline-31: demo/kit/timeline/index.html, inline script, line 578

````js
        // ⚠️ HANDED OVER AFTER IT IS ON THE PAGE, which is the realistic order
        // and the one that matters: the panel records where the element lives
        // at the moment it is given it, so an element with no parent yet has no
        // home to be put back to. The constructor's `under` option is for a page
        // that builds its controls before it builds its panel.
````

<a id="kit-timeline-32"></a>
## kit-timeline-32: demo/kit/timeline/index.html, inline script, line 602

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

<a id="kit-timeline-33"></a>
## kit-timeline-33: demo/kit/timeline/index.html, inline script, line 615

````js
  /**
   * 🔴 THE NOTE GRID'S FIVE CLAIMS, asked 2026-10-12 as *"its a mess. rm hover
   * intereacvtion. add footer to show note info. figure out left lane col.
   * column headers?"*. Each is a measurement, and the pointer ones dispatch the
   * events a real pointer would, at a real note's position.
   */
````

<a id="kit-timeline-34"></a>
## kit-timeline-34: demo/kit/timeline/index.html, inline script, line 687

````js
  /**
   * 🔴 THE NEWEST BLOCK'S TWO CLAIMS, AND BOTH ARE MEASUREMENTS RATHER THAN
   * LOOKS. A bar UNDER a panel and a bar GLUED to one are the same order of
   * elements: what differs is whether there is one edge round the pair or two
   * edges and a gap, which is three numbers.
   * ⚠️ IT IS THE SAME SHAPE AS THE STRIP'S CHECK BELOW, on purpose. Two
   * components reach `.pos-glue` and the rule that zeroes a child's border is
   * double-classed precisely because a component can otherwise win the
   * specificity fight, so both callers grade it the same way.
   */
````

<a id="kit-timeline-35"></a>
## kit-timeline-35: demo/kit/timeline/index.html, inline script, line 703

````js
    /**
     * 🔴 AND HALF THE WIDTH OF ITS BOX, MEASURED RATHER THAN READ OFF THE
     * STYLESHEET. Asked 2026-09-20 as *"make it half w"*, and a rule that is
     * present and inert reads exactly like one that works: this file already
     * records three dead CSS rules found only by computing a value, and
     * `.kit-half` sits on a child of a box whose `display` another class
     * decides.
     * ⚠️ AGAINST THE BOX'S OWN CONTENT WIDTH, NEVER A PIXEL COUNT TYPED HERE. A
     * figure would be a second opinion about a width the layout owns, and it
     * would have to be retyped every time the page's column changes.
     * ⚠️ AND THE NEGATIVE HALF IS IN IT: a specimen still taking the whole box
     * would satisfy every other clause in this check.
     */
````

<a id="kit-timeline-36"></a>
## kit-timeline-36: demo/kit/timeline/index.html, inline script, line 731

````js
    /**
     * 🔴 THE TWO WORDS ARE THE SAME WIDTH, MEASURED IN BOTH STATES RATHER THAN
     * ASSERTED FROM THE STYLESHEET. Asked as *"start | stop text labels (same
     * w)"*, and the reason is the project's standing one about a control that
     * resizes under the pointer that just pressed it.
     * ⚠️ **AND THE WIDTH ALONE WOULD PASS ON A BUTTON SHOWING NEITHER WORD.**
     * `visibility: hidden` on both is the same width as `visibility: hidden` on
     * one, so the check reads which span is visible in each state as well. That
     * is the half that would catch the `::before` glyph rule winning the
     * specificity fight and a word never appearing at all.
     * ⚠️ IT PRESSES THE TOGGLE AND WAITS FOR THE STATE TO LAND rather than
     * setting `data-state` by hand, which would grade the stylesheet against
     * itself and say nothing about the bar.
     */
````

<a id="kit-timeline-37"></a>
## kit-timeline-37: demo/kit/timeline/index.html, inline script, line 754

````js
    // ⚠️ THE MEASURING WINDOW SHUTS ACROSS THIS WAIT AND OPENS AGAIN AFTER IT.
    // Both widths are read with every part laid out, which is the only state
    // either of them is a real number in; what may not happen is a frame being
    // rendered with all parts open, and this loop is one of the two places
    // on the page that gives the browser the chance. See `measure()` above.
````

<a id="kit-timeline-38"></a>
## kit-timeline-38: demo/kit/timeline/index.html, inline script, line 775

````js
  /**
   * 🔴 A BAR WITH NO PLAY BUTTON HAS NO PLAY BUTTON, AND SAYS SO IN A BOOLEAN A
   * HARNESS CAN READ. Two independent sources, which is the whole check: the
   * DOM says whether `.tbar-toggle` was ever appended, and `api.toggles` says
   * what the page asked for, so the two can disagree. Without the boolean
   * `demo/verify.mjs` clicks `.tbar-toggle` and asserts the position advanced,
   * which takes a `toggle: false` page red for a reason that is not its fault.
   * ⚠️ AND THE COMPARISON IS AGAINST THE WHOLE ROW BESIDE IT, never against a
   * count typed here. A page that had lost its toggle everywhere would satisfy
   * "this one has none".
   */
````

<a id="kit-timeline-39"></a>
## kit-timeline-39: demo/kit/timeline/index.html, inline script, line 797

````js
    /**
     * 🔴 ONE POSITION SURFACE PER PAGE, WHICH IS WHAT `scrub: false` IS FOR.
     * ⚠️ AND IT IS NOT AN ELEMENT THAT GOES MISSING, WHICH IS WHAT THIS CHECK
     * FIRST ASSUMED AND WHY IT WENT RED ON A BAR THAT WAS RIGHT. The slider is
     * always built; `scrub: false` sets `data-scrub="0"` on the bar and
     * `shell.css` hides it from there. So the question is which rule won, and
     * the only thing that knows that is the COMPUTED style. A presence test
     * read `STILL HAS ONE` about a bar with no visible slider at all.
     * ⚠️ BOTH SIDES, because `data-scrub` is `seekable && wantScrub`: a deck
     * that could not be seeked would hide the slider on every bar here and a
     * one-sided check would have called that a success.
     */
````

<a id="kit-timeline-40"></a>
## kit-timeline-40: demo/kit/timeline/index.html, inline script, line 818

````js
    /**
     * 🔴 WHAT SUCH A BAR CARRIES INSTEAD, AND IT IS A BADGE RATHER THAN A WORD.
     * The chip's position held `LIVE` once: a word drawn because a page passed
     * `live: true` at BUILD time, so it said LIVE whether or not a byte had
     * arrived. On both board pages the chip is the presence badge, because the
     * fact worth having about an instrument in another building is whether it
     * is answering, which is a thing that can change.
     */
````

<a id="kit-timeline-41"></a>
## kit-timeline-41: demo/kit/timeline/index.html, inline script, line 833

````js
    /**
     * 🔴 NEGATIVE CONTROL: A CHIP AND A LIVE BADGE WANT THE SAME POSITION AND
     * THE BAR REFUSES RATHER THAN PICKING. A specimen showing a refusal is
     * worth as much as one showing a shape, and this page already does it for a
     * readout with an odd number of cells and a table with two growing columns.
     */
````

<a id="kit-timeline-42"></a>
## kit-timeline-42: demo/kit/timeline/index.html, inline script, line 844

````js
    /**
     * 🔴 EXACTLY ONE BAR ON THIS PAGE CLAIMS THE PAGE'S PLAYHEAD, AND THE COUNT
     * ALONE CANNOT SEE IT. `__demo.transport` is the only handle a CDP check
     * has; with four bars here, a page where NOTHING claimed it and a page
     * where two did would both read green, because the handle is not something
     * an assert count knows about. So both halves are graded: the handle is
     * filled, and it is filled by the bar this page chose rather than by
     * whichever was built last.
     * ⚠️ IDENTITY, NOT A SELECTOR. `document.querySelector('.tbar')` is the
     * first bar in DOM order, which is the same object only while a page has
     * one; `/stage/` has already paid for that confusion. This compares the
     * published object against the specimen itself.
     */
````

<a id="kit-timeline-43"></a>
## kit-timeline-43: demo/kit/timeline/index.html, inline script, line 857

````js
    /* ⚠️ NOT THE TAB PAGE BLOCK'S, 2026-10-04. That specimen builds its bars
       lazily, when its BARS tab is first opened, so whether they exist here
       depends on whether its check pass has run yet. They are publish: false
       and are graded there; this count is about the rest of the page. */
````

<a id="kit-timeline-44"></a>
## kit-timeline-44: demo/kit/timeline/index.html, inline script, line 863

````js
    /* FIVE since 2026-09-22: the STEP GRID block gained a standard transport
       when its hand-rolled `Play` button was reported. It passes
       `publish: false` like the other specimens, so the claim below is
       unchanged and only the count moved. SIX since 2026-10-05: TRANSPORT
       BAR ON A SLIDE, `publish: false` and drilled in the SLIDES checks.
       SEVEN since the same day: STEP GRID ON A SLIDE became `/tom/`'s
       instrument, whose bar is `publish: false` and graded in SLIDES.
       FOUR on `/kit/timeline/`, 2026-10-06: the STEP GRID's bar is on
       `/kit/devices/` and the two slide bars stay in `/kit/` with SLIDES, so
       the count is this page's four and the claim is unchanged. */
````

<a id="kit-timeline-45"></a>
## kit-timeline-45: demo/kit/timeline/index.html, inline script, line 881

````js
  // 🔴 GLUED, WHICH IS THE WORD THE ASK USED: *"footer section, looks like
  // glued that shows hovered info below timeline"*. So it is not enough that
  // the box is under the strip, it has to READ as the same surface, and that is
  // three measurements rather than a look: one border round the pair, nothing
  // between them but the 1 px seam `.pos-glue` shows through, and neither child
  // painting an edge of its own. `.pos-strip` and `.pos-glue.pos-glue > *` both
  // declare `border`, at (0,1,0) and (0,2,0), and which of them wins is the
  // specificity trap this stylesheet already records three times.
````

<a id="kit-timeline-46"></a>
## kit-timeline-46: demo/kit/timeline/index.html, inline script, line 889

````js
  /**
   * 🔴 THE LIVE RUN'S CLAIMS, EACH ONE A MEASUREMENT OF WHAT WAS DRAWN. Binned
   * marks never touch; the cursor is the write head and moves; zoomed in far
   * enough the same lane draws one mark per row; a bin under the pointer says
   * how many it holds and the worst of them; and a stopped run's head stands
   * still. The zoom one is the NEGATIVE CONTROL: a lane that binned at every
   * zoom would pass the first claim and fail this one.
   */
````

<a id="kit-timeline-47"></a>
## kit-timeline-47: demo/kit/timeline/index.html, inline script, line 977

````js
    /**
     * 🔴 THE PANEL'S DEFAULTS ARE THE COMPONENT'S WHOLE ARGUMENT, so they are
     * what is checked: a page that writes neither still gets something that says
     * whether its source is answering and something that fills the screen.
     * ⚠️ AND THE PICTURE IS READ BACK OUT OF THE PANEL'S OWN CANVAS. A canvas
     * that is blank and one that is painting look identical to every counter,
     * and `pattern.mjs` burns a clock into the frame precisely so a page can ask.
     */
````

<a id="kit-timeline-48"></a>
## kit-timeline-48: demo/kit/timeline/index.html, inline script, line 1011

````js
    /**
     * 🔴 THE FOOTER UNDER THE STRIP, WRITTEN AT IT AND MEASURED. Everything
     * below this line puts words in a box a visitor is looking at, moves a row
     * of buttons between two parents, or covers the screen, so it is behind
     * `?selfcheck=1` with the rest. The claim is the one the ask is about: it is
     * rewritten on every hover change, so it must not be able to change its own
     * height while somebody reads it.
     * ⚠️ IT IS FED THE STRIP'S OWN `hit` SHAPE, `{ detail: [...] }`, which is
     * what `describe()` hands `onHover`. A check that called some other entry
     * point would grade a path no pointer ever takes.
     */
````

<a id="kit-timeline-49"></a>
## kit-timeline-49: demo/kit/timeline/index.html, inline script, line 1023

````js
      /**
       * 🔴 THE CHECK BUILDS ITS OWN FOOTER RATHER THAN GRADING THE SPECIMEN.
       * The specimen was asked to be ONE line on 2026-09-20, *"1 line footer
       * here"*, and both checks below read the SECOND row: one asserts six
       * things are cut to `lines`, the other that a name too long for row 0
       * does not push row 1 out of a box that is still the same height. Against
       * a one line footer the second row is `undefined`, so the check did not
       * fail, it THREW, and took the whole page down with a TypeError about
       * `startsWith` that named no block.
       * ⚠️ **A CHECK MUST NOT DECIDE WHAT A SPECIMEN LOOKS LIKE.** That is this
       * project's rule about a check that mutates, arriving from the other
       * side: there a check destroyed the thing it graded, here it would have
       * dictated it. Three lines is what the BEHAVIOUR needs, so the check
       * makes three lines and puts them back.
       * ⚠️ IT IS APPENDED AND THEN REMOVED, because both asserts measure a
       * height and a detached element has none.
       */
````

<a id="kit-timeline-50"></a>
## kit-timeline-50: demo/kit/timeline/index.html, inline script, line 1059

````js
      // 🔴 A NAME TOO LONG ELLIPSISES RATHER THAN WRAPPING, and that is the
      // half a height check cannot see: a wrapped first line pushes the second
      // one out of a box that is still exactly as tall as it was. Photographed
      // on `/reel/`, where a title was cut mid word inside the tooltip.
      // ⚠️ LONG ENOUGH ON ANY SCREEN, not long enough on this one. The real
      // title that was photographed being cut is about seventy characters and
      // FITS a laptop's box, so a check built on it would have passed here and
      // failed nowhere while the defect it is about lives on a phone.
````

<a id="kit-timeline-51"></a>
## kit-timeline-51: demo/kit/timeline/index.html, inline script, line 1085

````js
    /**
     * 🔴 THE SECOND STOREY IS THE PAGE'S OWN ROW, MOVED, AND THERE IS ONE OF IT.
     * Asked 2026-09-19: *"extend videopanel footer in fullscreen so it can have
     * section below the footer bar (separaet with line). put controlgroup
     * there"*, and the thing that would quietly go wrong is a second copy, which
     * is two rows of buttons that can disagree about which option is chosen.
     * ⚠️ IT GOES FULL BY THE CLASS, NOT BY ASKING THE BROWSER. `.pos-full` is
     * what BOTH real paths set and what `isFull` reads, so this is the state
     * itself rather than a stand-in for it. Asking for real would put a cover
     * over the page in the middle of the checks that follow.
     */
````

<a id="kit-timeline-52"></a>
## kit-timeline-52: demo/kit/timeline/index.html, inline script, line 1116

````js
    /**
     * 🔴 THE WAY BACK OUT, AND IT IS LAST ON PURPOSE. Two of the three checks
     * below really cover the screen: the faux path puts `overflow: hidden` on
     * the document and lays a fixed cover over everything, which is a state no
     * geometry check above would be measuring a visitor's page in. So they run
     * after every other check has had its answer.
     *
     * 🔴 AND THE EXIT IS PROVED BY PRESSING IT. `/blocks/` had a way out that
     * was built, compiled and drawn every frame and never once updated, so
     * there was no way out at all while every line of it read correct. Reading
     * that a control is wired is not the same claim as pressing it.
     */
````

<a id="kit-timeline-53"></a>
## kit-timeline-53: demo/kit/timeline/index.html, inline script, line 1129

````js
      /**
       * 🔴 FADED MUST MEAN UNPRESSABLE, WHICH IS THE ONE THING `opacity: 0`
       * DOES NOT SAY. Without `pointer-events: none` the bottom right corner of
       * a picture exits full screen for somebody reaching past it, on a control
       * they cannot see. MEASURED HERE RATHER THAN READ OUT OF THE STYLESHEET,
       * because a rule that is present and inert reads exactly like one that
       * works.
       * ⚠️ PROVED BY BREAKING IT, 2026-09-19: with `pointer-events: none` taken
       * off the faded rule in shell.css this reads `up auto, faded auto at
       * opacity 0` and goes red, while everything else on the page stays green.
       * ⚠️ AND IT IS A THROWAWAY PIECE WITH A SHORT IDLE, off screen, rather
       * than the specimen. The shipped wait is EXIT_IDLE_MS, and a check that
       * sat still for that long mid-block would fall off the end of the
       * harness's collector, which stops 400 ms after the last assert.
       * `.pos-full` is what both real paths set and what `isFull` reads, so the
       * button is in the state it is graded in.
       */
````

<a id="kit-timeline-54"></a>
## kit-timeline-54: demo/kit/timeline/index.html, inline script, line 1174

````js
        /* 🔴 A THRESHOLD, BECAUSE `=== '1'` IS AN EXACT EQUALITY ON AN
           ANIMATING PROPERTY AND THAT IS A RACE THE CHECK WILL EVENTUALLY
           LOSE. MEASURED 2026-09-22, when a busier page put a 140 ms fade at
           **0.998744** after a 200 ms nap. The claim is that the way out is
           VISIBLE, and 0.998744 is visible; nothing here ever wanted the
           difference between that and 1. The faded state it has to be told
           apart from is 0, which no threshold near 1 can reach. */
````

<a id="kit-timeline-55"></a>
## kit-timeline-55: demo/kit/timeline/index.html, inline script, line 1183

````js
        /* 🔴 THE DETAIL COULD NOT NAME ITS OWN FAILING CLAUSE AND THE WORDS
           `inside the cover` WERE PRINTED WHETHER OR NOT IT WAS. Measured
           2026-09-22: this went red reporting a square button at the right
           inset, which is every clause it prints, so the fault was in one of
           the two it did not. Six clauses, six facts. */
````
