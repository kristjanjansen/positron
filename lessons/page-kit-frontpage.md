# Page comments: kit-frontpage

The full comments cut from the code under demo/ for kit-frontpage, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="kit-frontpage-1"></a>
## kit-frontpage-1: demo/kit/frontpage/index.html, style, line 12

````css
  /* 🔴 EVERY FACE HERE IS SELF HOSTED, AND A VISIT ASKS NOBODY ELSE FOR ONE.
     JetBrains Mono and Geist are under /shell/vendor/ (workers/view/build.mjs
     lists them, with source and licence) and are declared in shell.css;
     Gabarito is read from /weight/'s own folder, so what is shown is the file
     that page ships rather than a copy of it. */
````

<a id="kit-frontpage-2"></a>
## kit-frontpage-2: demo/kit/frontpage/index.html, style, line 57

````css
  /* HERO: four lines, each with its own gap above it, the eyebrow closest to
     the headline it labels. Every face, size, weight, tracking and line height
     is set per pairing from the PAIRINGS data, so the label under it reads the
     same numbers the hero is drawn with. */
````

<a id="kit-frontpage-3"></a>
## kit-frontpage-3: demo/kit/frontpage/index.html, style, line 63

````css
  /* Balanced wrap on every headline, title, line and card text in the
     specimens, so a two line heading breaks into two similar lines instead of
     a long one and a word left alone. Asked 2026-10-12: *"use balanced wrap"*. */
````

<a id="kit-frontpage-4"></a>
## kit-frontpage-4: demo/kit/frontpage/index.html, style, line 72

````css
  /* 🔴 THE LIGHT VERSION IS NOT IN THE KIT. shell.css declares one dark theme
     and no light tokens, so this specimen re-declares the five it reads, as
     hand-picked values, on itself only. A light front page would need these
     decided at :root, which is a decision this sampler does not make. */
````

<a id="kit-frontpage-5"></a>
## kit-frontpage-5: demo/kit/frontpage/index.html, style, line 97

````css
  /* THE HERO, LARGE is `.pos-hero*` in shell.css since 2026-10-13, drawn by
     demo/shell/hero.mjs, because the front page opens with the same block. */
````

<a id="kit-frontpage-6"></a>
## kit-frontpage-6: demo/kit/frontpage/index.html, style, line 100

````css
  /* THE RULE, IN USE: JetBrains Mono for what NAMES, Geist for what is READ
     THROUGH. Since 2026-10-12 it is what the site does: `--mono` and `--sans`
     in shell.css are these two faces, so nothing here sets either and every
     kit component inside (the readout, the log, the slide's text) is drawn
     exactly as on its own page. */
````

<a id="kit-frontpage-7"></a>
## kit-frontpage-7: demo/kit/frontpage/index.html, style, line 106

````css
  /* 🔴 THE CLEAR GAP UNDER THE LAST REAL PIECE IS ITS OWN PADDING, NOT A
     LARGER MARGIN. The stack owns the margin between blocks and the page's
     check holds every pair of blocks to --pos-gap, so the extra --pos-gap
     sits inside this last block, which makes the air to the specimens below
     2 x --pos-gap with no divider (the kit draws none between blocks). */
````

<a id="kit-frontpage-8"></a>
## kit-frontpage-8: demo/kit/frontpage/index.html, inline script, line 153

````js
  /**
   * kit/frontpage, THE TYPE THE FRONT PAGE WILL BE SET IN, 2026-10-12. Asked:
   * *"add new kit card / page. name it fronpage. lets work on it. first do
   * typograpy sampler: all fonts we use at the momet in diffeetn sizes. we need
   * sans serif to match our brand mono. bring in something matchin it, not just
   * Inter"*, and the name confirmed as *"frontpage"*.
   * ⚠️ IT WAS A SAMPLER AND IS NOW THE RECORD OF A CHANGE. Six sans faces were
   * set here beside the brand mono, each by setting `--sans` on its own
   * specimen; the owner picked Geist, and on 2026-10-12 (*"A is fine.
   * Impelent font update everywhere"*) shell.css made `--mono` JetBrains Mono
   * and `--sans` Geist, and the other faces were deleted with their files
   * (plans/plan-fonts-minimal.md). THE RULE, IN USE is what every page does
   * now, and the specimens below it are what the choice was made from.
   * ⚠️ THE NUMBERS ARE MEASURED IN THIS BROWSER, on a canvas, after each face
   * has loaded: the top of an `x` and of an `H` at 100 px, and the width of
   * one sentence divided by its length. The OS/2 table values the face files
   * declare are written below as `TABLE` and the self-check requires the two to
   * agree, so a face that silently fell back cannot report a fallback's numbers.
   * ⚠️ A VISIT OPENS NOTHING ELSEWHERE. Every check is behind `?selfcheck=1`.
   */
````

<a id="kit-frontpage-9"></a>
## kit-frontpage-9: demo/kit/frontpage/index.html, inline script, line 185

````js
  /* 🔴 GEIST WON, AND THE OTHER FIVE LEFT WITH THEIR FILES, 2026-10-12.
     Six openly licensed sans faces were sampled here against JetBrains Mono's
     three traits (a tall x-height, rounds that lean rectangular, open
     apertures): Geist, Manrope, IBM Plex Sans, Schibsted Grotesk, Onest and
     Space Grotesk. The owner asked for the brand mono with Geist, and
     plans/plan-fonts-minimal.md deleted the other five (181,476 bytes).
     `table` is the face file's own OS/2 numbers, read with a WOFF parser on
     2026-10-12; `bytes` is 400 plus 600 off `ls -l`. */
````

<a id="kit-frontpage-10"></a>
## kit-frontpage-10: demo/kit/frontpage/index.html, inline script, line 222

````js
  // 🔴 THE SLIDE STEPS AS A SHARE OF A SLIDE'S HEIGHT, drawn here for a slide
  // 405 px tall (720 px wide), the half width player's size on a desk. Read off
  // SCALE in slide.mjs, never typed, so a change to the scale changes this.
````

<a id="kit-frontpage-11"></a>
## kit-frontpage-11: demo/kit/frontpage/index.html, inline script, line 251

````js
  /* ── 2026-10-12, second round: *"to test samples for mixing brand font and
     geist in different size and weights. slides, titles / subtitles"*, with a
     hero crop for the front page set in a plain light sans ── */
````

<a id="kit-frontpage-12"></a>
## kit-frontpage-12: demo/kit/frontpage/index.html, inline script, line 265

````js
  // HERO, the owner's four lines, is hero.mjs's, so the specimens below and
  // the front page cannot set different words.
  // 🔴 THE PAIRINGS ARE DATA, AND THE LABEL IS WRITTEN FROM THE SAME OBJECT
  // THE HERO IS DRAWN WITH, so a label cannot disagree with its specimen.
````

<a id="kit-frontpage-13"></a>
## kit-frontpage-13: demo/kit/frontpage/index.html, inline script, line 288

````js
      // The block itself is demo/shell/hero.mjs since 2026-10-13, the one the
      // front page opens with (*"move concepts to frontpage. use
      // http://127.0.0.1:8890/kit/frontpage/ on top THE HERO, LARGE"*): the
      // wordmark, the headline, the two lines and the working imaginary
      // patchbay, a desk picture and a phone picture. This page shows it alone.
````

<a id="kit-frontpage-14"></a>
## kit-frontpage-14: demo/kit/frontpage/index.html, inline script, line 296

````js
  // 🔴 THE RULE, IN USE, 2026-10-12: *"do make samples on top of real usage.
  // add sapce in between woth the rest. use my copy."* The rule the session
  // put to the owner, applied to real pieces of the site: hero C in the
  // owner's words, the concepts index's cards from list.mjs, a concept page's
  // header with a readout and a log, and the deck's own `connect` slide.
  // Nothing here is written for the sampler except the readout's numbers.
````

<a id="kit-frontpage-15"></a>
## kit-frontpage-15: demo/kit/frontpage/index.html, inline script, line 325

````js
      // Real rows by id, no number on a card since 2026-10-13 (*"rm numbers"*).
````

<a id="kit-frontpage-16"></a>
## kit-frontpage-16: demo/kit/frontpage/index.html, inline script, line 336

````js
      // The use case card is `held`, the one listed demo since away was
      // archived on 2026-10-13, so the rule still shows four real cards.
````

<a id="kit-frontpage-17"></a>
## kit-frontpage-17: demo/kit/frontpage/index.html, inline script, line 350

````js
      // 3. a concept page's header, its readout and its log, as clock/010
      // (Message lag) draws them; the numbers are typical of the relay's
      // p50 of about 36 ms (bay.mjs) and the log lines are that page's own
      // Message lag left the concepts on 2026-10-12 for /archive/clock-message-lag/,
      // so its card's words are written here as /archive/ shows them.
````

<a id="kit-frontpage-18"></a>
## kit-frontpage-18: demo/kit/frontpage/index.html, inline script, line 382

````js
  // 🔴 SHARP TEST, 2026-10-12: *"Add sharp test"*, then *"Visual sample i
  // mean"*. It put three ways to write a sharp on real keys: A, `#` in
  // JetBrains Mono; B, the Bravura sharp the keys drew then; C, the system's
  // `♯` with no Bravura. The owner said *"A is fine"*, the keys print `#`
  // since (keyboard.mjs NOTE_NAMES), and A is what is left here, drawn by the
  // keyboard itself with nothing swapped.
  // ⚠️ B AND C WENT, AND NOT FOR TIDINESS. B's face, Bravura, was deleted with
  // its file. C was told apart from the other faces by measuring it in front
  // of Bravura (a face with the sharp and no `#`), so with Bravura gone the
  // page could no longer say which face drew C's sharp, and a specimen whose
  // caption cannot be measured is one this page does not show.
````

<a id="kit-frontpage-19"></a>
## kit-frontpage-19: demo/kit/frontpage/index.html, inline script, line 410

````js
  /* WHICH FACE DREW THE SHARP, read rather than assumed: the label's own
     computed font stack is set on a canvas, which resolves fallback per glyph
     the way the page does, and the ink box of the sharp it draws is matched
     against the ink box each candidate face draws on its own. */
````

<a id="kit-frontpage-20"></a>
## kit-frontpage-20: demo/kit/frontpage/index.html, inline script, line 435

````js
      // a face that lacks the glyph falls through to whatever is behind it,
      // so it is put in front of two partners that draw `#` unlike each other
      // (the system serif and Geist): only a face that has the glyph measures
      // the same in front of both.
````

<a id="kit-frontpage-21"></a>
## kit-frontpage-21: demo/kit/frontpage/index.html, inline script, line 577

````js
  // MEASURED, Geist against the brand, as a table.
````

<a id="kit-frontpage-22"></a>
## kit-frontpage-22: demo/kit/frontpage/index.html, inline script, line 713

````js
    // 🔴 THE CHOICE IS RECORDED, AND THE NUMBERS IN IT ARE MEASURED HERE, so
    // the sentence cannot drift from the face the site loads.
````
