# Page comments: kit-diagram

The full comments cut from the code under demo/ for kit-diagram, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="kit-diagram-1"></a>
## kit-diagram-1: demo/kit/diagram/index.html, inline script, line 17

````js
  /**
   * 🔴 kit/diagram, ONE PART OF `/kit/` ON A PAGE OF ITS OWN, 2026-10-06
   * (plans/plan-kit-split.md). Every block, holder and check below is copied
   * VERBATIM from `demo/kit/index.html`, in that file's order, so the newest
   * block is still the first. What changed is mechanical: `section()` lost its
   * first argument, the holders sit here rather than at the top of the
   * monolith, the measuring window and the tab row are gone, and every check
   * is behind `?selfcheck=1`.
   */
````

<a id="kit-diagram-2"></a>
## kit-diagram-2: demo/kit/diagram/index.html, inline script, line 34

````js
  // ── the flow diagram ────────────────────────────────────────────────────
  // 🔴 THE ONLY WAY TO KNOW THE WRAPPING IS RIGHT IS TO SEE FOUR AWKWARD ONES
  // SIDE BY SIDE. Every other component on this page can be judged from one
  // example; this one cannot, because what it does well or badly is decided by
  // strings nobody has typed yet. So the four cases below are the deliberately
  // difficult ones — a clean round trip, a label too long for its box, two
  // return paths that would sit on top of each other, and the whole thing at
  // the width of a phone.
  //
  // ⚠️ AND EACH ONE REPORTS WHAT IT HAD TO CUT. A drawer that quietly shortens
  // a label leaves the author believing the label fits: the picture looks
  // fine, and the missing half is only found by somebody reading the page on a
  // narrower screen. The line under each picture names every label that was
  // shortened and the width it had to fit — because a cut label is a label
  // that is too long, which is a thing to go and fix, not a feature.
  //
  // 🔴 AND THIS REPORT IS NOW THE ONLY PLACE A CUT SHOWS. The full string used
  // to sit in an svg `<title>`, i.e. in the browser's own tooltip, which is
  // gone: a tooltip drew the box's name ON TOP of the box while the line under
  // the picture was saying the same words, three channels for one fact. The
  // whole string is still in `aria-label` for a screen reader; nothing draws
  // it. So a cut that nobody reads here is a cut nobody reads at all.
  //
  // It also says whether the type was MEASURED or estimated. `getComputedText-
  // Length()` answers 0 inside a hidden ancestor, and every string then
  // "fits" — one line per box, no wrapping, no cuts. That failure reads as a
  // wrapping bug and is an attachment bug, so it gets its own word here rather
  // than being inferred from a picture that looks a bit too tidy.
  // Every diagram's own report, kept so the checks at the bottom can grade the
  // ones meant to fit against the one deliberately built not to.
````

<a id="kit-diagram-3"></a>
## kit-diagram-3: demo/kit/diagram/index.html, inline script, line 87

````js
    // 🔴 KEPT, BECAUSE `onRender` CANNOT ANSWER "WAS THIS ARROW DRAWN". It
    // reports sizes and cuts; whether a link reached the picture at all is a
    // question about the svg, and the one defect this page exists to catch here
    // is a link that is quietly not there.
````

<a id="kit-diagram-4"></a>
## kit-diagram-4: demo/kit/diagram/index.html, inline script, line 126

````js
        /**
         * 🔴 `PCM` IS THE PROJECT'S NAME FOR SOUND COMING BACK, AND A PICTURE
         * COMING BACK IS `H.264`. Settled 2026-09-19: *"h.264 - unify label and
         * longer desc on all diagrams where stream back pcm or mp4 video"*.
         * This specimen said `sound` on one half and `sound back` on the other,
         * which is two names for one journey, and the code sample above it is
         * what an author copies, so the wrong word here spreads.
         * ⚠️ AND THE RETURN CARRIES A NOTE, BECAUSE THAT IS THE OTHER HALF OF
         * THE CONVENTION: a label is WHAT TRAVELS and the note is what that
         * actually is. It says nothing that could be a measurement, because
         * this picture is a made-up studio and a number invented here would be
         * copied into a real page as though somebody had taken it.
         */
````

<a id="kit-diagram-5"></a>
## kit-diagram-5: demo/kit/diagram/index.html, inline script, line 168

````js
  // ── a box inside a box ──────────────────────────────────────────────────
  // 🔴 THE SAME SPEC AT BOTH WIDTHS, BECAUSE THE TWO ANSWER A LINK INTO A
  // BOX INSIDE A CONTAINER DIFFERENTLY — and that is the whole of what there
  // is to look at here. A container's own name is at the TOP of it with its
  // boxes under, so the ground between its edge and a box inside it is empty
  // SIDEWAYS and full DOWNWARDS. Left to right an arrow reaches the box it
  // names; stacked, the same arrow would cross the words `Raspberry Pi` on
  // the way in, so it stops at the machine.
````

<a id="kit-diagram-6"></a>
## kit-diagram-6: demo/kit/diagram/index.html, inline script, line 214

````js
  // ── two boxes in one machine, with an arrow between them ────────────────
  // 🔴 THE PICTURE THAT PROVES THE TIE GIVES WAY. A tie is a bracket with no
  // head, because a head would claim an order between the parts of one machine
  // that the drawing does not know. Where the author has DECLARED a link that
  // order IS known, so the arrow takes the tie's place rather than being drawn
  // on top of it: one line down that gap, never two. The gap between the two
  // boxes nothing was declared between still has its tie, which is what makes
  // this a picture of the rule rather than of a special case.
````

<a id="kit-diagram-7"></a>
## kit-diagram-7: demo/kit/diagram/index.html, inline script, line 258

````js
          // 🔴 A NOTE AND NO LABEL, WHICH IS WHAT THE COMPONENT ASKS FOR HERE.
          // A name in a sixteen pixel gap runs under both boxes; the arrow says
          // which way, and this says what.
````

<a id="kit-diagram-8"></a>
## kit-diagram-8: demo/kit/diagram/index.html, inline script, line 296

````js
  // ── the fork, which is the case that was not drawable at all ────────────
  // 🔴 THE SAME SPEC TWICE, AT BOTH WIDTHS, BECAUSE ONE OF THEM USED TO LIE.
  // Every other block on this page draws its case once; this one cannot, since
  // a branch was correct left to right and FALSE in one column — a forward
  // link was a straight vertical at its source's centre and routed around
  // nothing, so the second branch ran behind the box between its two ends and
  // came out underneath it with an arrowhead in the next one. A phone read a
  // path the page does not have, and the name that tells the two branches
  // apart was drawn at the midpoint, i.e. under that box. Seeing one width
  // could not have caught it, so the block shows both.
````

<a id="kit-diagram-9"></a>
## kit-diagram-9: demo/kit/diagram/index.html, inline script, line 315

````js
        // ⚠️ SHORT SUBS, MEASURED RATHER THAN PREFERRED. These were 17 to 19
        // characters and at 258 px the drawer reported ALL FOUR of them cut —
        // a picture shortening the names of the things it is about. The
        // shortening is the signal, not a width to tune around, so the words
        // went instead: nothing is cut anywhere from 258 px up.
````

<a id="kit-diagram-10"></a>
## kit-diagram-10: demo/kit/diagram/index.html, inline script, line 329

````js
          // ⚠️ `the same` RATHER THAN `the same sound`, MEASURED. A gutter is
          // sized by the widest name in it, so a longer one here would take
          // the width straight out of the boxes — and this block's subs were
          // already cut down once for exactly that. Eight characters is under
          // `the sound`, so the picture is the same size it was with two of
          // these five arrows unnamed.
````

<a id="kit-diagram-11"></a>
## kit-diagram-11: demo/kit/diagram/index.html, inline script, line 336

````js
          // 🔴 `PCM` ON BOTH HALVES, the settled name for sound coming back.
          // See the note on the first block in this page for why, and
          // `/grains/`, which is the real page this picture is a sketch of.
````

<a id="kit-diagram-12"></a>
## kit-diagram-12: demo/kit/diagram/index.html, inline script, line 369

````js
        // 🔴 THE SAME FOUR LINKS AS THE FIRST BLOCK, WHICH IS WHAT THE CAPTION
        // CLAIMS, so the labels and the note track it exactly.
````

<a id="kit-diagram-13"></a>
## kit-diagram-13: demo/kit/diagram/index.html, inline script, line 381

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

<a id="kit-diagram-14"></a>
## kit-diagram-14: demo/kit/diagram/index.html, inline script, line 395

````js
  // the diagram grades both directions. A cuts report that can only ever
  // say "nothing cut" is not a measurement of anything: the picture built out
  // of deliberately unwritable labels has to come back with cuts, and the one
  // written properly has to come back with none.
````

<a id="kit-diagram-15"></a>
## kit-diagram-15: demo/kit/diagram/index.html, inline script, line 410

````js
  // 🔴 A LINK ASKED FOR AND NOT DRAWN, WHICH IS THE ONE DEFECT A PICTURE
  // CANNOT SHOW YOU. An arrow between two boxes in one container used to be
  // thrown away: the diagram still looked complete, because the plain tie
  // between those boxes stood exactly where the arrow should have been, and
  // /station/ lost three real arrows that way without anybody noticing. So this
  // counts the lines rather than looking at them — three links declared must be
  // three arrows on the picture, and the ONE gap nothing was declared across
  // must still have its tie. Both numbers matter: three arrows and two ties
  // would mean the arrow had been drawn on top of the bracket it replaces.
````
