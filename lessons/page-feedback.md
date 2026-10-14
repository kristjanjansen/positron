# Page comments: feedback

The full comments cut from the code under demo/ for feedback, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="feedback-1"></a>
## feedback-1: demo/feedback/index.html, style, line 10

````css
  /* The table's own rows carry the columns; this is only the line under it that
     says what an agent should ask for.
     🔴 NO `margin`, AND THE FIRST VERSION HAD ONE. `margin: 0` here looks like
     tidiness and was a page overruling the shell: the rhythm rule and `.where`
     had the SAME specificity, so the page's stylesheet won on order and the gap
     between the table and this line became 0. MEASURED at 0, then at the full
     gap with this removed. `.pos-stack` outweighs a single class since
     2026-09-16, so the same mistake would now be silent rather than visible,
     which is a reason to keep this line rather than to delete it: a margin that
     does nothing is still a claim nobody should have to check. */
````

<a id="feedback-2"></a>
## feedback-2: demo/feedback/index.html, inline script, line 118

````js
  /**
   * 🔴 THE ROUND TRIP IS DRIVEN ONLY WHERE IT CANNOT REACH THE REAL ROOM, and
   * both halves assert so the count does not move between them.
   *
   * `DEMO_BASE=https://positron.studio node demo/verify.mjs` is a documented
   * command in CLAUDE.md, so a page that sends a note to prove itself would
   * write a real one every time somebody ran the suite against the deploy.
   * That is the FCM defect again. The branch is the SAME exact-match allowlist
   * the whole feature rests on: off the published site the chain is driven end
   * to end into a sandbox nobody reads, and on it nothing is written at all.
   */
````

<a id="feedback-3"></a>
## feedback-3: demo/feedback/index.html, inline script, line 148

````js
    /**
     * 🔴 THE ROUND TRIP IS A HARNESS'S, NOT A READER'S. It wakes the recorder,
     * opens a socket, sends a note and then polls the store until the row comes
     * back — so anybody who opened this page to read what people have written
     * was writing a row of their own into the list, on arrival, for as long as
     * they were not on the published site. A check that adds to the thing it is
     * checking is the shape CLAUDE.md names.
     * ⚠️ THE SECOND `load()` GOES WITH IT, because its only job is to show the
     * row the round trip just made. Without the write there is nothing new to
     * fetch, and asking again is a second request for an answer already in hand.
     */
````
