# demo/typist/paper.css: the comments that left the stylesheet

Every comment below was cut from `demo/typist/paper.css` on 2026-10-14 and is kept here verbatim. The stylesheet keeps a short version where one was worth keeping, and a pointer `/* why: lessons/css-paper.md#<anchor> */` to the section below. Line numbers are from before the cut.

<a id="tp"></a>

### paper.css `.tp` (line 9)

````css
/* ── the sheet ──────────────────────────────────────────────────────────
   White paper filling the stage and scrolling inside itself, so a long page
   rolls up the way paper leaves a carriage. It is a size container, so the
   type and the margins follow the sheet rather than the window, and a sheet
   in full screen gets the same proportions as one on the page. */
````

<a id="tp-col"></a>

### paper.css `.tp-col` (line 19)

````css
/* ── the line ───────────────────────────────────────────────────────────
   ONE BOX, TWO LAYERS PINNED TOGETHER, the way /typist/ does it. The
   <textarea> on top is invisible and takes every keystroke and every tap
   (so a phone opens its keyboard); the <pre> underneath draws the text and
   the cursor at the offsets the browser reports. Both carry `.tp-type` and
   NOTHING else sets a metric on either, or they drift apart by a character.
   The column is about 64 characters, a typewriter's line on a letter sheet
   at ten to the inch, and never wider than the sheet. */
````

<a id="tp-cur"></a>

### paper.css `.tp-cur` (line 38)

````css
/* ── the cursor ─────────────────────────────────────────────────────────
   A FILLED BAR 0.4 CHARACTER WIDE, filled whether or not the paper has
   focus (asked: *"typist: always filled cursor"*, *"but thinner"*). It
   takes no width in the flow (a zero width span with the bar drawn by its
   ::after), so the line in the <pre> stays exactly the line in the
   <textarea>. Drawn white over the sheet with `difference`, it reads black
   and turns what it covers white. Without focus it stays and does not
   blink. */
````
