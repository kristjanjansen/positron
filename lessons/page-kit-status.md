# Page comments: kit-status

The full comments cut from the code under demo/ for kit-status, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="kit-status-1"></a>
## kit-status-1: demo/kit/status/index.html, inline script, line 21

````js
  /**
   * 🔴 kit/status, ONE PART OF `/kit/` ON A PAGE OF ITS OWN, 2026-10-06
   * (plans/plan-kit-split.md). Every block, holder and check below is copied
   * VERBATIM from `demo/kit/index.html`, in that file's order, so the newest
   * block is still the first. What changed is mechanical: `section()` lost its
   * first argument, the holders sit here rather than at the top of the
   * monolith, the measuring window and the tab row are gone, and every check
   * is behind `?selfcheck=1`.
   */
````

<a id="kit-status-2"></a>
## kit-status-2: demo/kit/status/index.html, inline script, line 39

````js
  // The four specimen badges, by state, so the geometry asserts at the bottom
  // can measure them. ⚠️ DECLARED HERE RATHER THAN BESIDE THE BLOCK: this
  // section moved to the top of the page and its `const` stayed behind, so the
  // build read it in its dead zone, `section()` swallowed the throw into
  // `failed`, and the page died much later on an empty map. A block that moves
  // takes what it needs with it.
  // ⚠️ DECLARED HERE, NOT INSIDE THE BLOCKS. A block that moved on this page
  // once left its `const` behind, the build read it in its dead zone,
  // `section()` swallowed the throw into `failed`, and the page died much
  // later with a message about a different line.
````

<a id="kit-status-3"></a>
## kit-status-3: demo/kit/status/index.html, inline script, line 50

````js
  // ⚠️ DECLARED WITH THE OTHERS, NOT INSIDE THE BLOCK. A block that moved to the
  // top of this page once left its `const` behind, the build read it in its dead
  // zone, `section()` swallowed the throw, and the page died much later on an
  // empty map with a message about a different line.
````

<a id="kit-status-4"></a>
## kit-status-4: demo/kit/status/index.html, inline script, line 56

````js
  // The three arrangements of the readout and the log, for the geometry checks
  // at the bottom. ⚠️ SAME REASON AS THE LINE ABOVE: the block that fills these
  // is the newest one and so it is the topmost one, and a `const` left where
  // the block used to be is read in its dead zone.
````

<a id="kit-status-5"></a>
## kit-status-5: demo/kit/status/index.html, inline script, line 72

````js
  /**
   * 🔴 NEWEST AT THE TOP, AND THE HEADING IS UPPERCASE. Asked 2026-09-19 for
   * `/stage/`, in one line with four other things: *"move video play / stop to
   * videopanel footer"*, *"make transportbar glueable to videopanel footer"*
   * and *"replace timeline-glued transport record button with start | stop text
   * labels (same w)"*.
   *
   * ⚠️ ONE BLOCK FOR TWO COMPONENTS, because they are one arrangement: a film's
   * transport belongs to the picture it drives, and the words are what that bar
   * says. Shown apart they would be specimens of nothing in particular.
   * 🔴 THE WAY OUT OF FULL SCREEN WAS THE SECOND HALF OF THIS BLOCK AND ITS
   * SPECIMEN IS GONE, 2026-09-20, asked for by quoting the page back: *"rm this
   * part AND THE WAY BACK OUT OF FULL SCREEN / a picture / not filling the
   * screen"*. The PIECE is still built, off screen, because two checks at the
   * foot of this file press it and read its geometry. Deleting it as well as
   * the specimen would have taken both with it while the page stayed green,
   * which is this project's rule about a control you switch off.
   * ⚠️ AND NOTHING HERE IS IN A `.pos-controls` ROW, for the reason the block
   * below gives: both harnesses press that row by position, so a new top block
   * with controls in it moves every other block's press.
   */
````

<a id="kit-status-6"></a>
## kit-status-6: demo/kit/status/index.html, inline script, line 93

````js
  /**
   * 🔴 NEWEST AT THE TOP, WHICH IS THE RULE. Somebody reading this page is
   * checking what the kit has, and what they do not know about is what arrived
   * since they last looked.
   * ⚠️ NOTHING HERE IS IN A `.pos-controls` ROW, for the reason the block below
   * gives: both harnesses press that row by position.
   */
````

<a id="kit-status-7"></a>
## kit-status-7: demo/kit/status/index.html, inline script, line 111

````js
      // A known stream, so the specimen shows real readings rather than a shape.
      // ⚠️ THE LAST TWO ARE FLOODS AND MUST NOT APPEAR. The checks at the foot
      // of this file read that back, which is what makes this a specimen rather
      // than a picture of one.
````

<a id="kit-status-8"></a>
## kit-status-8: demo/kit/status/index.html, inline script, line 121

````js
  /* ⚠️ THE WORDS ARE AN OPTION AND THERE IS A NAMED MAP FOR INSTRUMENTS ON A
     CABLE. `SAYS` is network language and suits a board answering over a relay;
     `WIRED` says `connected`, `connecting` and `not connected`, and five pages
     take it (`/circuit/`, `/twelve/`, `/shape/`, `/bay/`, `/evo/`). The
     specimens below keep `SAYS`, because what they demonstrate is the five
     STATES rather than one vocabulary, and because the width check at the
     bottom is calibrated on the default phrases. */
````

<a id="kit-status-9"></a>
## kit-status-9: demo/kit/status/index.html, inline script, line 139

````js
      // ⚠️ `can: [s]` IS WHAT MAKES THIS ROW EVENLY SPACED. Each of these will
      // only ever say its own word, so holding room for `coming online` put a
      // different amount of empty space after each one and the gaps read as
      // arbitrary. A badge that can really change says nothing here and keeps
      // the full reserve, which is what the width check below drives.
````

<a id="kit-status-10"></a>
## kit-status-10: demo/kit/status/index.html, inline script, line 168

````js
      /**
       * The same component with `mode: 'dot'`: the ring alone, with the words
       * CLIPPED rather than removed, so the accessible name is still the whole
       * sentence and a change is still announced. It is an inline box with no
       * margins, so it drops into a button, a readout key or a row of machines
       * without any of them knowing what it is.
       */
````

<a id="kit-status-11"></a>
## kit-status-11: demo/kit/status/index.html, inline script, line 204

````js
      // ⚠️ THE READOUT NEEDS A WIDTH OR ITS CELLS STACK. `.pos-readout` is a
      // flex row whose cells grow, so in a narrow box two cells sit on top of
      // each other and stop looking like a readout at all. It had `flex: 1 1
      // 100%` when it lived in a section of its own; inside a row of three
      // specimens it takes a basis instead.
````

<a id="kit-status-12"></a>
## kit-status-12: demo/kit/status/index.html, inline script, line 216

````js
      // ⚠️ `stack.titled`, NOT A HAND-ROLLED CAPTION. That is what this section
      // is demonstrating three times over: the heading and what it labels are
      // ONE block, and the component owns both distances.
````

<a id="kit-status-13"></a>
## kit-status-13: demo/kit/status/index.html, inline script, line 235

````js
      // ── joined ──────────────────────────────────────────────────────────
      // No `joined` flag: it is the default since 2026-09-28, and a flag
      // repeating a default is a flag that will be left behind when the default
      // moves. The opt-out is spelled out on the split specimen below.
````

<a id="kit-status-14"></a>
## kit-status-14: demo/kit/status/index.html, inline script, line 242

````js
      // A fixed time on every line, so this block draws the same picture on
      // every visit. `performance.now()` here would put the age of the page
      // into a specimen, which is a number that says nothing about the
      // component and changes every time anybody looks at it.
````

<a id="kit-status-15"></a>
## kit-status-15: demo/kit/status/index.html, inline script, line 248

````js
      // ⚠️ THE PAGE IS PART OF THE SPECIMEN, because "at the foot" is half of
      // what joined MEANS and because the gap under it is the thing the shell
      // declares: 44 px, the diagram's number, rather than the 22 px between
      // two ordinary rows. Without a `.pos-body` here there is nothing for that
      // distance to be measured from.
````

<a id="kit-status-16"></a>
## kit-status-16: demo/kit/status/index.html, inline script, line 256

````js
      // ── joined, with only one of the two ────────────────────────────────
      // `readout: null` on a real page, which is the `/typist/` case: the
      // document IS the readout and cells repeating it would be the same facts
      // twice. The surface is still one box, and there is no seam in it.
````

<a id="kit-status-17"></a>
## kit-status-17: demo/kit/status/index.html, inline script, line 264

````js
      // ── joined, with the log switched off ───────────────────────────────
      // 🔴 `showLog: false` ON A PAGE THAT HAS A READOUT, WHICH IS
      // `/videoradio/`'S SHAPE AND WAS GRADED NOWHERE UNTIL 2026-09-28. That
      // page is `gl: true` and rotates four ERR mounts, so it is the one page
      // this project may not run to find out, and the arrangement it gets was
      // changed on the day joined became the default. A glue of one block is
      // that block, unwrapped, so what comes back here is the READOUT itself
      // wearing `.pos-report`: one border, its own, and no wrapper to hide.
      // That last part is the whole reason the unwrap matters rather than being
      // tidy — `/videoradio/` hides `.pos-readout` by name for full screen, and
      // a wrapper round it would have stayed on screen as a band of its own two
      // edges, which is the `/typist/` defect arriving by a new road.
````

<a id="kit-status-18"></a>
## kit-status-18: demo/kit/status/index.html, inline script, line 281

````js
      // ⚠️ AND WITH NEITHER THERE IS NOTHING TO APPEND, which is the point:
      // `foot` comes back null rather than an empty box drawing its own two
      // borders as a 2 px band. Nothing goes in the page for this one.
````

<a id="kit-status-19"></a>
## kit-status-19: demo/kit/status/index.html, inline script, line 295

````js
      /**
       * 🔴 IN A STACK, BECAUSE A REAL PAGE IS ONE. The gaps this block measures
       * used to come from the components' own margins, and those came off on
       * 2026-09-17 so that a component cannot impose a gap on whoever places it.
       * A specimen assembled by hand in a box then had no gaps at all and its
       * own check said so, at `0.0 px above the page`. The fix is not to give
       * the margins back: it is for the specimen to be arranged the way the
       * thing it depicts is arranged.
       */
````

<a id="kit-status-20"></a>
## kit-status-20: demo/kit/status/index.html, inline script, line 308

````js
      /**
       * 🔴 THE CELLS THEMSELVES, FOLDED IN FROM A SECTION OF THEIR OWN. Asked
       * 2026-09-17: *"rm separate readout cells, merge with newer one"*. A
       * readout was shown twice on this page: once as half of a surface and once
       * as a row of cells two screens away, so a reader met the same component
       * twice and had to work out they were the same thing. Same defect as the
       * presence badge, in the other half of the page.
       */
````

<a id="kit-status-21"></a>
## kit-status-21: demo/kit/status/index.html, inline script, line 321

````js
        // ⚠️ THE UNIT GOES INSIDE THE VALUE, which is what shell.mjs does:
        // `.pos-v` is display:block, so a unit beside it as a SIBLING drops to a
        // line of its own with the value's whole line-height between them. The
        // sandbox existing to catch drift and then drifting itself is the joke
        // that writes itself.
````

<a id="kit-status-22"></a>
## kit-status-22: demo/kit/status/index.html, inline script, line 333

````js
      /**
       * 🔴 THE SHAPE, FOLDED IN HERE RATHER THAN GIVEN A SECTION, ASKED FOR
       * 2026-09-21 AS *"READOUT, FIXED COLUMNS - inegrate into readout docs"*.
       * It HAD a section of its own at the top of this page for about twenty
       * minutes, which is the same defect the block above records being fixed in
       * 2026-09-17: a reader met the readout twice and had to work out they were
       * the same component. The newest thing goes at the top of this page; a new
       * OPTION on an old component goes where that component already is.
       *
       * 🔴 AND IT IS WHY THE EVEN RULE EARNS ITS KEEP TWICE. The rule above was
       * demoted to EDITORIAL when the row became flex and the hole it described
       * stopped existing. `rows: 2` brings it back as structural: an even count
       * divides by two exactly, so a shape is always a full rectangle and never
       * a gap in the last row.
       */
````

<a id="kit-status-23"></a>
## kit-status-23: demo/kit/status/index.html, inline script, line 359

````js
      // ⚠️ THE SAME TEN CELLS AND THE SAME TEN VALUES IN BOTH, so the only thing
      // that can differ on screen is the arrangement. Two specimens differing in
      // their content would be demonstrating the content.
      // ⚠️ `joined: false` BECAUSE THESE TWO ARE READOUTS, NOT REPORTS. They are
      // appended as `.readoutEl`, and a joined report with no log is that
      // readout wearing `.pos-report`, which carries the page's 40 px foot gap.
      // Two specimens about the SHAPE of a row of cells would have arrived with
      // a gap above them that is a fact about where a report sits.
````

<a id="kit-status-24"></a>
## kit-status-24: demo/kit/status/index.html, inline script, line 377

````js
  // ── table ───────────────────────────────────────────────────────────────
  // 🔴 IT WAS NOT IN HERE, AND IT IS USED ON FOUR PAGES. REPORTED in those
  // words. A component the sandbox does not show is a component nobody can
  // check against another page's copy of it, which is the one thing this page
  // exists to make possible.
````

<a id="kit-status-25"></a>
## kit-status-25: demo/kit/status/index.html, inline script, line 391

````js
        /**
         * 🔴 A MIDDOT JOINING TWO FACTS IN ONE CELL IS TWO COLUMNS. Asked
         * 2026-09-17: *"make rule not to middot in tables. its a separate col"*.
         * This specimen read `14:42:24 · Rehearsal moved to Thursday`, which is
         * a time and a message glued together, and a table that does that gives
         * up everything a table is for: the times no longer line up with each
         * other, nothing can be right-aligned, and a long message pushes its own
         * timestamp off the screen.
         */
````

<a id="kit-status-26"></a>
## kit-status-26: demo/kit/status/index.html, inline script, line 414

````js
      // 🔴 THE NEGATIVE CONTROL, ON THE PAGE. The throw is this component's one
      // real rule, and a sandbox that only ever shows it working cannot tell you
      // it still refuses.
````

<a id="kit-status-27"></a>
## kit-status-27: demo/kit/status/index.html, inline script, line 426

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

<a id="kit-status-28"></a>
## kit-status-28: demo/kit/status/index.html, inline script, line 440

````js
  /**
   * 🔴 THE NEW BLOCK'S ONE CLAIM, AND IT IS A MEASUREMENT RATHER THAN A LOOK.
   * Two readouts with the SAME ten cells and the SAME ten values, so the only
   * thing that can differ between them is the arrangement. The flex row wraps
   * wherever the width lets it; the grid puts five in a row whatever happens,
   * which is the whole of what was asked for.
   * ⚠️ IT COMPARES ROW TOPS, NOT COLUMN COUNTS. A cell's column is not a thing
   * the DOM knows; how many distinct tops the ten cells have is, and it is the
   * same fact a reader sees.
   */
````

<a id="kit-status-29"></a>
## kit-status-29: demo/kit/status/index.html, inline script, line 455

````js
    // ⚠️ AND IT IS FULL WIDTH, WHICH IT WAS NOT. MEASURED 2026-09-21 with a
    // throwaway probe at 1280 px: 557.6 px inside a 660 px content box, short by
    // 102.4. `.kit-box` is a flex row, so a readout in it is a flex ITEM and
    // takes its content width rather than the line. This section already carries
    // `kit-wide`, which makes the box `display: block`, and that is the fix the
    // page had already found for the same component once.
````

<a id="kit-status-30"></a>
## kit-status-30: demo/kit/status/index.html, inline script, line 463

````js
    /**
     * ⚠️ `clientWidth` AND NOT A RECT MINUS PADDING, AND THE FIRST TRY WAS THE
     * SECOND. It read `rect.width - paddingLeft - paddingRight` and answered
     * `658.0 px of a 660.0 px content box`, so the assert went red by exactly
     * 2 px on a layout that was perfect: the box has a 1 px border each side and
     * the arithmetic forgot it. EVERY sibling in that box measured 658, which is
     * what said the layout was right and the ruler was wrong.
     * ⚠️ AND `clientWidth` ALONE WAS THE SECOND WRONG RULER, WHICH IS WORTH
     * WRITING DOWN BECAUSE IT SOUNDS LIKE THE RIGHT ONE. It is content PLUS
     * PADDING, with only the border and the scrollbar taken off, so it answered
     * 686 and the assert went red again by 28 px. The content box is
     * `clientWidth` minus the padding: 688 less 2 of border is 686, less 28 of
     * padding is 658, which is what every child in that box measures.
     * 🔴 THREE RULERS FOR ONE DISTANCE AND TWO OF THEM WERE WRONG. The thing
     * that told me the LAYOUT was fine both times was that every sibling
     * measured the same 658, which is a fact about the page rather than about
     * my arithmetic.
     */
````

<a id="kit-status-31"></a>
## kit-status-31: demo/kit/status/index.html, inline script, line 504

````js
  // 🔴 NOTHING IN THE LOG IS WHITE. Asked 2026-09-19 with a photograph of a
  // phone: *"do not color log items white, keep it gray or red or whatever you
  // hae in palette"*. The emphasis on a `hi` line is carried by weight plus ONE
  // step of ink now, so what is graded is that the step is real and that it
  // stops short of the page's brightest colour.
  // ⚠️ MEASURED AS INK, NEVER AS A RULE. shell.css already records what reading
  // a stylesheet instead of a computed style costs: a rule that is present and
  // inert reads exactly like one that works.
  // ⚠️ AND THE SPECIMEN IS NEVER SEEN. `color` resolves on a `display: none`
  // element, so it goes into the real log, is measured, and is gone inside one
  // task.
````

<a id="kit-status-32"></a>
## kit-status-32: demo/kit/status/index.html, inline script, line 530

````js
  // the readout specimen. An odd count leaves the last row short, and a
  // cell with nothing in it must be EMPTY with its unit HIDDEN: an empty value
  // beside a standing `%` reads as a number that went missing, and a pre-set 0
  // reads as a very confident measurement of nothing.
  // ⚠️ THIS COMMENT SAID "one em dash" UNTIL 2026-09-18, THREE MONTHS AFTER THE
  // PLACEHOLDER WAS REMOVED. The assert below was right the whole time: it asks
  // whether the UNIT is hidden and never what the cell draws, which is why it
  // stayed green while the sentence above it described a different page.
````

<a id="kit-status-33"></a>
## kit-status-33: demo/kit/status/index.html, inline script, line 548

````js
  // 🔴 THE NEGATIVE CONTROL FOR IT, and it is the reason the rule holds at
  // all: `mount()` REFUSES an odd count rather than trusting every page to
  // remember. A rule enforced by nothing is a rule that is already broken
  // somewhere. Called in a try, because passing is the throw.
````

<a id="kit-status-34"></a>
## kit-status-34: demo/kit/status/index.html, inline script, line 560

````js
  // 🔴 THE PRESENCE BADGE IS THE SAME WIDTH IN ALL FOUR STATES, which is
  // this project's standing rule about anything that redraws: a live sentence
  // under a picture reflowed between three and four lines and was reported as
  // "a horrible jump of content each time it updates". A badge whose word goes
  // from `online` to `coming online` would shove whatever sits to its right
  // every time a board answered.
  //
  // ⚠️ FOUR BADGES, NOT ONE PRESSED THROUGH FOUR STATES. The claim is identical
  // and this way nothing a visitor is looking at moves while it is graded,
  // which is the other rule: a check that mutates is the test.
````

<a id="kit-status-35"></a>
## kit-status-35: demo/kit/status/index.html, inline script, line 571

````js
    // 🔴 ONE BADGE, WALKED. This compared four badges side by side, which is a
    // different claim and a weaker one: what must never happen is a badge
    // changing width UNDER A READER as the thing it watches comes and goes.
    // Four fixed specimens now sit at their own widths on purpose, so comparing
    // them would measure the reserve rather than the guarantee.
````

<a id="kit-status-36"></a>
## kit-status-36: demo/kit/status/index.html, inline script, line 589

````js
    /**
     * 🔴 AND THE SAME GUARANTEE HAS TO SURVIVE THE BUSY WORDS, which is the
     * reason they are words on the badge rather than a mark beside it. A mark
     * that appears when somebody starts driving would change the badge's width
     * in a transport bar, and the reserve here is measured over every phrase
     * this badge can ever say, busy variants included. Sabotage: drop the busy
     * phrases out of the `widest` calculation in presence.mjs and this goes red
     * by about four characters.
     */
````

<a id="kit-status-37"></a>
## kit-status-37: demo/kit/status/index.html, inline script, line 613

````js
    /**
     * 🔴 THE WORD GREYS AND THE DOT DOES NOT, and both halves are the claim.
     * A grey dot would say nobody has looked, which is what `checking` and
     * `unknown` use it for, so a busy board would become indistinguishable from
     * one we know nothing about. Asserting only the word would let the dot drift
     * grey and nothing would catch it.
     */
````

<a id="kit-status-38"></a>
## kit-status-38: demo/kit/status/index.html, inline script, line 631

````js
  // 🔴 AND THE ANIMATION CANNOT MOVE ANYTHING EITHER, which is a separate
  // claim from the one above: the reserve fixes the four states against each
  // other, this fixes every frame of the breathing dot against itself. Read off
  // the KEYFRAMES rather than off two measurements a moment apart, because a
  // property that moves the layout for one frame in eighty is a defect two
  // rects would only catch by luck.
````

<a id="kit-status-39"></a>
## kit-status-39: demo/kit/status/index.html, inline script, line 656

````js
    /**
     * 🔴 THE TWO AXES, AS A CHECK. Colour says what is KNOWN and motion says
     * something is HAPPENING, so exactly two states move: `checking`, which is
     * this page asking, and `coming`, which is the instrument starting. The
     * three settled ones are still. Both moving states share one keyframe, and
     * that keyframe may touch nothing but opacity, or a breathing dot could
     * shove its neighbour once every eighty frames.
     */
````

<a id="kit-status-40"></a>
## kit-status-40: demo/kit/status/index.html, inline script, line 670

````js
  // the four states are told apart by the DOT, not by the word beside it.
  // Two states that differ only in their label are two states nobody reads,
  // which undoes the whole reason there are four. Measured ink: the ring's
  // colour, the fill's colour, the fill's opacity and whether it moves.
````

<a id="kit-status-41"></a>
## kit-status-41: demo/kit/status/index.html, inline script, line 687

````js
  // 🔴 A DOT WHOSE MEANING IS ONLY A COLOUR IS A DOT A SCREEN READER
  // CANNOT READ. `display: none` on the word is how that happens by accident,
  // so the embedded mode CLIPS it instead: still in the accessibility tree,
  // still in the live region, and out of the flow so it costs the host nothing.
````

<a id="kit-status-42"></a>
## kit-status-42: demo/kit/status/index.html, inline script, line 703

````js
  // 🔴 JOINED IS ONE SURFACE, AND IT TAKES TWO MEASUREMENTS TO SAY SO.
  // A border is the easiest thing in this arrangement to draw twice: the
  // readout and the log both carry `border: 1px solid var(--line)` of their
  // own on every other page, and the joined box has to take those off or the
  // log sits inside a double rule with a stray line under the readout.
  // ⚠️ THE SEAM CANNOT SEE THAT, WHICH IS WHY THE WIDTHS ARE READ TOO.
  // MEASURED by putting the defect back on purpose: with the inner borders
  // restored the seam still read **1.0 px** and only the widths moved, 0 and 0
  // to 1 and 1 — because a border is drawn INSIDE the box's own rectangle, so
  // two halves 1 px apart stay 1 px apart however thick their edges are. The
  // seam proves the gap is the mosaic's, the widths prove there is one edge.
````

<a id="kit-status-43"></a>
## kit-status-43: demo/kit/status/index.html, inline script, line 715

````js
  // ⚠️ AND THE SECOND HALF OF WHAT JOINED MEANS IS WHERE IT SITS: at the FOOT,
  // under the BIG gap rather than the small one between two ordinary rows.
  // There is ONE gap in this project, 40 px, and this surface takes it like
  // everything else. It is stated on `.pos-report` as well as on `.pos-body`'s
  // bottom margin because the surface sits outside the body, where the rhythm
  // on that element's children cannot reach it; the two collapse rather than
  // add.
````

<a id="kit-status-44"></a>
## kit-status-44: demo/kit/status/index.html, inline script, line 740

````js
  // and the opt-out is still two surfaces with the page between them. It stops
  // being the default on 2026-09-28 and it is still built, still on this page
  // and still graded, because an arrangement nothing on the site can be looked
  // at in is an arrangement that rots. The
  // readout is part of the flow above the body and takes the SMALL gap; the log
  // is the foot and takes the BIG one, which is the same gap a joined report
  // gets, so the two arrangements agree about where the page ends.
  // ⚠️ THE TWO GAPS COME FROM DIFFERENT RULES AND ONLY ONE OF THEM IS THE
  // READOUT'S. Above the page it is `.pos-readout`'s own bottom margin; below
  // the page it is `.pos-body`'s, which is why the stand-in in that block IS a
  // `.pos-body`. The log asks for nothing — a `.pos-log { margin-top: 22px }`
  // stood in shell.css and was inert, beaten by a `margin` shorthand later in
  // the same file, and this measurement is what found it.
````

<a id="kit-status-45"></a>
## kit-status-45: demo/kit/status/index.html, inline script, line 767

````js
  // 🔴 HALF A SURFACE IS NOT HALF A BOX. A page that declares no readout
  // and joins anyway must get one bordered box holding a log, with no seam and
  // no empty strip where the cells would have been. A `display: none` child
  // takes no `gap` in a flex column, so the log starts exactly one border
  // inside the box; anything else means the hidden row is still taking room.
````

<a id="kit-status-46"></a>
## kit-status-46: demo/kit/status/index.html, inline script, line 781

````js
  // 🔴 AND WITH THE LOG SWITCHED OFF, THE READOUT IS THE SURFACE, WITH NO
  // WRAPPER ROUND IT. A glue of one block is that block, so the element handed
  // back IS `readoutEl`, carrying `.pos-report` and its own single 1 px edge.
  // Two claims, because they fail separately: that there is no second box (the
  // doubled edge), and that hiding the readout leaves NOTHING on screen, which
  // is what `/videoradio/` does to it in full screen and is the case a wrapper
  // would have broken.
````

<a id="kit-status-47"></a>
## kit-status-47: demo/kit/status/index.html, inline script, line 806

````js
  // 🔴 AND WITH NEITHER HALF, NO BOX. This is the `/typist/` defect in the
  // joined arrangement: an empty container painting its own two borders as a
  // full-width band nobody wrote. `createReport` returns no surface at all, so
  // there is nothing for a page to append and nothing to paint.
````

<a id="kit-status-48"></a>
## kit-status-48: demo/kit/status/index.html, inline script, line 817

````js
  /**
   * 🔴 THE MIDI LOG, GRADED HERE BECAUSE THIS IS THE PAGE THAT CAN SEE ALL OF
   * IT AT ONCE. Seven messages went into the specimen and two of them are a
   * clock byte and an active sensing byte.
   */
````

<a id="kit-status-49"></a>
## kit-status-49: demo/kit/status/index.html, inline script, line 827

````js
    // ⚠️ THE NEGATIVE HALF. A component that listed everything would pass the
    // line above by counting differently, so this reads the rendered text.
````
