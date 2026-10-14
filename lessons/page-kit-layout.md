# Page comments: kit-layout

The full comments cut from the code under demo/ for kit-layout, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="kit-layout-1"></a>
## kit-layout-1: demo/kit/layout/index.html, inline script, line 27

````js
  /**
   * 🔴 kit/layout, ONE PART OF `/kit/` ON A PAGE OF ITS OWN, 2026-10-06
   * (plans/plan-kit-split.md). Every block, holder and check below is copied
   * VERBATIM from `demo/kit/index.html`, in that file's order, so the newest
   * block is still the first. What changed is mechanical: `section()` lost its
   * first argument, the holders sit here rather than at the top of the
   * monolith, the measuring window and the tab row are gone, and every check
   * is behind `?selfcheck=1`.
   */
````

<a id="kit-layout-2"></a>
## kit-layout-2: demo/kit/layout/index.html, inline script, line 41

````js
  // The layout specimens. ⚠️ DECLARED UP HERE, not beside the block that fills
  // them: this is the newest section and therefore the topmost one, and this
  // page has already been taken out once by a `const` left where a block used
  // to be and then read in its dead zone.
````

<a id="kit-layout-3"></a>
## kit-layout-3: demo/kit/layout/index.html, inline script, line 50

````js
  /**
   * 🔴 TAB PAGE, 2026-10-04. The owner regrouped twenty demos
   * into four tabbed pages that day (`/sync/`, `/time/`, `/wire/`,
   * `/capture/`, no redirects), and the pieces every one of them needs are
   * shared and were built once, before any page: `tab-page.mjs` and
   * `bar-drill.mjs`. `plans/plan-demo-structure.md` §5 step 1.
   * ⚠️ IT OPENS ON QUIET, SO BARS IS NOT BUILT UNTIL SOMEBODY OPENS IT. That is
   * the component's first claim, and a specimen that opened on BARS would
   * have nothing to show it with.
   * ⚠️ AND IT CARRIES ITS OWN NEGATIVE CONTROL: a bar whose clock never moves.
   * The drill must fail it on `play advances position` and on nothing else, or
   * a drill that passed everything would read exactly like this one.
   * ⚠️ `hash: false`, because this page owns its address and a specimen
   * writing `#bars` into it would be one component reaching outside its box.
   */
````

<a id="kit-layout-4"></a>
## kit-layout-4: demo/kit/layout/index.html, inline script, line 121

````js
          /* 🔴 THE NEGATIVE CONTROL. A wall clock that always answers 0: the
             deck accepts play, says it is playing, and its position never
             moves. Seeking still works, because a seek sets the position
             directly, so the drill must fail exactly one row. */
````

<a id="kit-layout-5"></a>
## kit-layout-5: demo/kit/layout/index.html, inline script, line 158

````js
  /**
   * 🔴 THE NEWEST COMPONENT GOES AT THE TOP OF THIS PAGE. Instructed
   * 2026-09-16: *"in kit move online stuff to topmost item (all new should land
   * top, make rule)"*.
   *
   * This page is read by somebody checking what the kit has, and what they do
   * not know about is what arrived since they last looked. Appending put the
   * newest thing behind every component they already knew, at the bottom of a
   * long scroll, which is the one place it cannot be found by accident. The
   * front page settled the same question the same way and for the same reason.
   *
   * ⚠️ A SECTION TITLE IS UPPERCASE, and `.kit-h` renders it so whatever is
   * typed. Type it uppercase anyway, so the source reads like the page.
   * ⚠️ AND MOVING A BLOCK MOVES EVERY BUTTON AFTER IT. `verify.mjs` presses by
   * position, so re-run `node demo/verify.mjs kit` and diff the assert count
   * after any reorder.
   */
````

<a id="kit-layout-6"></a>
## kit-layout-6: demo/kit/layout/index.html, inline script, line 183

````js
      // ⚠️ NO ARTICLE ON A SPECIMEN'S LABEL. Asked 2026-09-17 as `a block ->
      // block`. CLAUDE.md already carries this rule for diagram labels, where a
      // label is a NAME and names do not take articles: `a granulator` reads as
      // the start of a sentence somebody did not finish. A specimen in this
      // sandbox is the same kind of thing, and the article was doing the same
      // nothing.
````

<a id="kit-layout-7"></a>
## kit-layout-7: demo/kit/layout/index.html, inline script, line 197

````js
      // ⚠️ THE EMPTY CASE IS ITS OWN SPECIMEN, because what it has to show is
      // an ABSENCE: two blocks with one gap between them and a third element
      // between those two that costs nothing. Putting it in the stack above
      // would have made the row read as four blocks with a hole in it.
````

<a id="kit-layout-8"></a>
## kit-layout-8: demo/kit/layout/index.html, inline script, line 215

````js
      // ⚠️ `hash: false` HERE AND ONLY HERE. Every other caller wants the
      // address bar; a sandbox that writes `#air` while you scroll past six
      // other components is one component reaching outside its own box.
````

<a id="kit-layout-9"></a>
## kit-layout-9: demo/kit/layout/index.html, inline script, line 236

````js
  // ── cards ───────────────────────────────────────────────────────────────
  //
  // ⚠️ THE ROWS ARE THE REAL ONES. `DEMOS` is the same array the front page
  // renders from, so a card here cannot drift into describing pages that do not
  // exist or tags nobody uses — which is the whole reason this page exists.
  //
  // 🔴 AND THE DESCRIPTIONS ARE TRIMMED, WHICH IS A FINDING RATHER THAN A
  // CONVENIENCE. The index's `one` lines are written for a row the full width
  // of the page; a card is a third of that, so the same sentence runs to five
  // lines and the grid stretches every card in the row to match it. Cutting at
  // the first dash or comma gives the clause that names the thing and drops the
  // clause that qualifies it — which is what a card wants and, arguably, what
  // a row wants too.
````

<a id="kit-layout-10"></a>
## kit-layout-10: demo/kit/layout/index.html, inline script, line 299

````js
        // ⚠️ `/held/` UNTIL 2026-09-19, AND THE NAME NOW BELONGS TO A DIFFERENT
        // PAGE. A card is a LINK, so a stale one here does not 404, it opens
        // something else and says nothing about it. That is the one failure a
        // rename in this project has not produced before, because `/radio1965/`
        // and `/box/` both just died.
````

<a id="kit-layout-11"></a>
## kit-layout-11: demo/kit/layout/index.html, inline script, line 317

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

<a id="kit-layout-12"></a>
## kit-layout-12: demo/kit/layout/index.html, inline script, line 331

````js
  // 🔴 THE GAP IS THE STACK'S, AND A BLOCK CANNOT ARGUE WITH IT. The third
  // specimen carries `margin: 0 0 10px` in this page's own stylesheet, which
  // loads AFTER shell.css — the exact shape that put a keyboard flush against a
  // transport bar on `/keys/` and measured 0.0 px. A shorthand's implied
  // `margin-top: 0` is (0,1,0) and the stack's rule is (0,2,0), so it loses on
  // weight rather than on source order, which is the whole reason the rule is
  // written the way it is.
  // ⚠️ THE NUMBER IS READ OFF THE DOCUMENT, never typed here. A check that
  // types 40 grades this page against a figure it invented; `--pos-gap` is the
  // one place the project states it, so the check has to ask for it too.
````

<a id="kit-layout-13"></a>
## kit-layout-13: demo/kit/layout/index.html, inline script, line 358

````js
  // 🔴 AND A BLOCK WITH NOTHING IN IT TAKES NO GAP. This is the `/typist/`
  // band in a third costume: an empty container that draws nothing and still
  // spends a screenful of air, or paints its own two borders as a rule nobody
  // wrote. Two blocks with an unfilled one between them must sit ONE gap apart,
  // not two — and the unfilled one must be out of the layout entirely rather
  // than merely invisible, which is the difference the display value reports.
````

<a id="kit-layout-14"></a>
## kit-layout-14: demo/kit/layout/index.html, inline script, line 377

````js
  /**
   * 🔴 EVERY FOCUS RING IN THE SHELL IS 1 px AND EVERY ONE IS ON THE KEYBOARD.
   * Asked for 2026-09-23 as *"make focus styles appear only on keyb nav not
   * mouse and make it 1px. change everywhere"*, which is fourteen rules in one
   * stylesheet and exactly the shape a later edit puts back one rule at a time.
   *
   * 🔴 IT READS THE STYLESHEET RATHER THAN THE SCREEN, AND THAT IS THE ONLY
   * HONEST WAY TO GRADE IT HERE. `:focus-visible` is decided by the browser's
   * MODALITY: it matches after a Tab and not after a press, and a page cannot
   * make a trusted key event, so `el.focus()` from a check lands in whichever
   * modality the harness happens to be in. An assert built on that would be
   * green or red for a reason that has nothing to do with the rule. The rules
   * themselves are same-origin and free to read.
   *
   * ⚠️ AND THE SECOND HALF IS THE ONE THAT MATTERS MOST: no rule may paint on
   * plain `:focus`, because that is the selector that fires for a mouse. It is
   * asserted as an ABSENCE over every rule in the sheet, so a new control
   * cannot bring one back quietly.
   *
   * 🔴 IT READS `cssText`, NOT `style.outlineWidth`, AND THE FIRST VERSION READ
   * THE LONGHAND AND FOUND **0 rings across 644 rules**. Every one of these is
   * written `outline: 1px solid var(--hi)`, and a shorthand holding a `var()`
   * is a pending substitution: the CSSOM hands back an EMPTY STRING for every
   * longhand in it. So the check would have passed an empty set forever, which
   * is this project's own rule about a statistic whose denominator nobody
   * looked at. `rings.length >= 12` is the floor that makes an empty answer red
   * rather than green.
   */
````

<a id="kit-layout-15"></a>
## kit-layout-15: demo/kit/layout/index.html, inline script, line 408

````js
    /* A ring is an outline with a WIDTH in it. `outline: none` is a suppression
       and paints nothing, and reading it as a ring is how the second version of
       this check went red on `input:focus-visible`, which exists precisely to
       take the ring OFF a field and colour its border instead.
       ⚠️ AND THE LENGTH IS FOUND ANYWHERE IN THE DECLARATION, NOT AT THE FRONT
       OF IT. A shorthand with a `var()` in it survives verbatim, so the shipped
       rules read `outline: 1px solid var(--hi)`; one WITHOUT a var is
       canonicalised by the browser to `outline: red solid 3px`, and a check
       anchored on the width coming first found the fourteen real rules and
       missed a sabotage typed by hand. */
````

<a id="kit-layout-16"></a>
## kit-layout-16: demo/kit/layout/index.html, inline script, line 428

````js
    /**
     * 🔴 THREE CLAIMS ABOUT THE CASCADE, MEASURED AGAINST RENDERED BOXES, AND
     * ALL THREE ARE HERE BECAUSE A DEAD RULE READS AS CORRECT. This page is
     * where component drift is supposed to become visible, and each of these
     * names a defect that shipped while every assert on every page stayed
     * green.
     * ⚠️ THEY BUILD THEIR OWN SPECIMENS RATHER THAN READING THE PAGE'S,
     * because two of the three are combinations no specimen on this page wears:
     * the defects were reachable only from `/wish/` and `/tom/`, and a check
     * that can only run on the page that already has the bug is a check that
     * arrives after it.
     */
````

<a id="kit-layout-17"></a>
## kit-layout-17: demo/kit/layout/index.html, inline script, line 445

````js
      /* 🔴 A GLYPH BUTTON IS A SQUARE WHEREVER IT IS, AND THE RULE SAYING SO
         WAS SCOPED TO ONE ROW UNTIL 2026-09-25. MEASURED on `/wish/` before the
         widening: 45.83 px wide against 34.00 tall, with the attribute set
         correctly, because `.pos-controls button[data-glyph="1"]` could not
         reach a button in a table row.
         🔴 AND IT IS MEASURED ON THE BOX, NEVER ON THE ATTRIBUTE, which is the
         whole reason it went unnoticed: `/wish/`'s action column is 72 px, the
         wrong size fitted inside it, and nothing collided. An assert reading
         `dataset.glyph` would have passed throughout. */
````

<a id="kit-layout-18"></a>
## kit-layout-18: demo/kit/layout/index.html, inline script, line 470

````js
      /* 🔴 A STEP GRID'S LABEL COLUMN KEEPS ITS WIDTH ON A PANEL'S FIXED
         COLUMN, AND FOR THREE DAYS IT DID NOT. `.pos-pg-labs` declared
         `border-right: 0; padding-right: 0` three thousand lines above
         `.panel-fixed-l`, both at (0,1,0), so the panel won and the label
         column's CONTENT box computed to 0.00 px against `width: 22px` under
         `box-sizing: border-box`. MEASURED on `/tom/`: 64 of 64 labels clipped,
         a lone `0` being 6.02 px of ink and `63` being 12.04, which is exactly
         why 0 to 9 looked perfect.
         🔴 THIS PAGE COULD NOT HAVE CAUGHT IT AND THAT IS WHY THE SPECIMEN IS
         BUILT HERE. `createStepGrid`'s three specimens on this page hand it a
         bare `div` as `fixed`, so none of them wears `.panel-fixed-l`, and
         `/tom/` was the only page in the repository putting the two together:
         the one page with the defect was the only page that could grade it. */
````

<a id="kit-layout-19"></a>
## kit-layout-19: demo/kit/layout/index.html, inline script, line 508

````js
  /**
   * 🔴 THE TAB PAGE'S CHECK PASS, LAST BEFORE `d.ready()` AND NEVER AFTER IT.
   * The harness drills `__demo.transport` the moment `ready` is true and sends
   * its seek key at `window`, which every bar that is not in a closed tab
   * hears; a drill of this block's own bars running at the same moment would
   * have the harness's key land in the middle of its pause hold. So it runs
   * here, where nothing else is pressing anything. It costs about three
   * seconds of boot, measured in the report that came with it.
   */
````
