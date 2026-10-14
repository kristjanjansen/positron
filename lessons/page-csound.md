# Page comments: csound

The full comments cut from the code under demo/ for csound, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="csound-1"></a>
## csound-1: demo/csound/click.mjs, module, line 1

````js
// demo/csound/click.mjs: the CLICK tab of /csound/, from the old /click/ page,
// which retired on 2026-10-05 with no redirect when *"merge click and und, no
// need for 'mobile screen' / theme"* made it this tab.
//
// WHAT CHANGED ON THE WAY IN, AND WHY:
//   1  🔴 THE PLAYER'S SCREEN IS GONE, AND THE THEME SWITCH WITH IT. The old
//      page opened on a copy of vClick's phone client (`client/main.qml` in
//      tarmoj/vclick): a gradient ground, a tempo line, a bar and a beat
//      numeral and three lamps that lit and faded over one beat, in two paints,
//      `subtle` (the default) and `original`. The owner called it the "mobile
//      screen" and said there was no need for it or for the theme. The bar,
//      the beat and the tempo it showed are this tab's readout cells, the cue
//      words are the `word` lane, and the two scores still light line by line.
//      No assert read the screen or the theme, so none went with them.
//   2  The checks moved from load into the page's one SELFCHECK pass
//      (`tab-page.mjs` rule 3), word for word, and the offline check now also
//      allows `/csound/`, where this module and its page are served from.
//   3  🔴 ITS BAR IS `publish: false`. SCORE owns the page's one published
//      transport; this one is listed in `bars` and drilled as page asserts.
//   4  `hide()` pauses the deck, so a click track does not run on in a tab
//      nobody is looking at.
//   5  It makes no sound, as the old page made none.
//
// ── THEIR SCORES, CARRIED RATHER THAN FETCHED ─────────────────────────────
//
// `server/test.sco` and `server/simple-4-4.sco` from tarmoj/vclick, GPL-3.0,
// (c) Tarmo Johannes, copied verbatim, tabs and comments included, because a
// score edited to suit the compiler would prove nothing about the compiler.
//
// ⚠️ EMBEDDED, NOT FETCHED, AND THAT IS THE POINT OF THE TAB. A click track
// that needs the network to tell it where the beat is has put the network
// back in the per-beat path. This tab makes NO request of any kind, no fetch
// and no socket, and the two scores are here so that stays true.
````

<a id="csound-2"></a>
## csound-2: demo/csound/click.mjs, module, line 192

````js
// 🔴 `bytes` REPLACED `rows`, AND IT IS THE WHOLE COMPARISON IN ONE CELL.
// `bytes` is what actually crosses the wire on this design, the score
// DOCUMENT, once, and it sits next to `pushed`, which is what vClick puts on
// the hall's wifi and which climbs for as long as the piece lasts. `late` is
// how far each flash landed from the moment the score asks for.
````

<a id="csound-3"></a>
## csound-3: demo/csound/click.mjs, module, line 202

````js
  // ── one deck, and it owns the clock ──────────────────────────────────────
  //
  // 🔴 THIS REPLACED A HAND-ROLLED `requestAnimationFrame` LOOP, AND THE LOOP
  // WAS THE DEFECT. MEASURED while building the old page: in a background tab
  // Chrome stops rAF outright, so the flashes arrived in clumps when the tab
  // was next painted, and `late` read 2487.2 ms of somebody else's throttling.
  // `createDeck` defaults to a WORKER tick host, which is the whole reason
  // that option exists.
  // ⚠️ It is still not a promise that this survives a locked phone. Their
  // client is a native app that keeps counting in a pocket; a page needs a
  // wake lock for that and this one has none.
````

<a id="csound-4"></a>
## csound-4: demo/csound/click.mjs, module, line 223

````js
  /** A bar statement expands into its own beats.
   *
   *  From THEIR orchestra (`server/metro_sendosc.orc`, instr 2), not guessed:
   *  p4 is how many beats the bar has, p5 is the note value as a fraction of a
   *  whole note, p6 the subdivision, p7 the bar number. Their metronome runs at
   *  `tempo/60 * p5/4`, so beat k sits 4/p5 score-beats after the one before.
   *
   *  ⚠️ A NEGATIVE BAR NUMBER IS NOT A BAR BEFORE THE START. It means "do not
   *  flash red on the first beat", for a bar built out of unequal groups.
   *  2+3+2/8 is written as three statements, one per group, and only the first
   *  gets the red. The FRACTIONAL part carries the beat number to start
   *  counting from, so -5.2 is bar 5 counting from beat 2. Reading it as a
   *  number would put four bars of the piece before bar 1.
   *  ⚠️ `lamp` is kept on each beat though the lamps are gone: it is which
   *  lamp vClick would light, and it is part of what their server sends.
   */
````

<a id="csound-5"></a>
## csound-5: demo/csound/click.mjs, module, line 276

````js
    // 🔴 THE SCORE BECOMES A DOCUMENT, AND THE DOCUMENT IS WHAT WOULD CROSS.
    // The Csound rows keep their p-fields verbatim, and one use places the
    // part once. It round-trips byte-identically, which is what makes `bytes`
    // an honest number rather than an estimate of one.
````

<a id="csound-6"></a>
## csound-6: demo/csound/click.mjs, module, line 325

````js
    // ⚠️ UTF-8 BYTES, not `String.length`, which counts UTF-16 code units, and
    // this repo has already paid for the difference once on the wire.
````

<a id="csound-7"></a>
## csound-7: demo/csound/click.mjs, module, line 328

````js
    // ⚠️ NOT 0. Nothing has been pushed because nothing has been played, and
    // a zero here would read as a measurement rather than as an empty cell.
````

<a id="csound-8"></a>
## csound-8: demo/csound/click.mjs, module, line 345

````js
      // 🔴 THE NUMBER THE TAB EXISTS TO REPORT. How late this flash was
      // against the millisecond the score asks for, not against the previous
      // flash, which would only measure the timer against itself.
````

<a id="csound-9"></a>
## csound-9: demo/csound/click.mjs, module, line 363

````js
    // ⚠️ COUNT ONLY. The rows a reducer is handed are not the items that were
    // scheduled, and reaching into their payload once took the whole page down
    // from inside a seek. Reduce over what the deck guarantees.
````

<a id="csound-10"></a>
## csound-10: demo/csound/click.mjs, module, line 372

````js
  // ── the operator's half, first in the tab ────────────────────────────────
  // ⚠️ FIRST, not last. These pick WHAT you are looking at, so they belong
  // above the thing rather than under it.
````

<a id="csound-11"></a>
## csound-11: demo/csound/click.mjs, module, line 392

````js
  // ⚠️ ONE POSITION SURFACE. The strip below seeks on press AND on drag, so the
  // bar's slider would be a second horizontal time axis at a different scale.
  // ⚠️ AND NOT PUBLISHED: SCORE's bar is the page's transport.
````

<a id="csound-12"></a>
## csound-12: demo/csound/click.mjs, module, line 441

````js
  /** Draw the document, and remember which line each row is on.
   *  ⚠️ Rebuilt only when the SCORE changes; the per-beat path just flips
   *  `data-state` on one element, because rewriting a block of text on every
   *  beat is a reflow on a clock. */
````

<a id="csound-13"></a>
## csound-13: demo/csound/click.mjs, module, line 499

````js
  /** Where in the piece a bar number starts.
   *
   *  🔴 THIS IS THE WHOLE ARGUMENT, IN ONE FUNCTION. Their server does it by
   *  rewriting the score text: find the line whose eighth field is the bar,
   *  replace a comment reading `;ADVANCE` with a skip statement, hunt backwards
   *  for the last tempo line and re-insert it with a patched time. Compiled,
   *  it is a search through a list and a `deck.seek()`, and the tempo needs no
   *  repair because the tempo is a map over the whole piece.
   */
````

<a id="csound-14"></a>
## csound-14: demo/csound/click.mjs, module, line 520

````js
  /**
   * 🔴 HOW IT WORKS, LAST IN THE TAB, ADDED 2026-10-05 on *"add how it works
   * diagrams to all tenchilogies"*. Its own picture rather than SCORE's,
   * because the two tabs differ in the two things a picture shows: this one's
   * score is carried in the page instead of typed, and it ends in the readout
   * rather than in sound. One machine, because the tab asks no server for
   * anything, which its last check already proves. Drawn on the first
   * showing, into a panel that has a width, under the tab's report.
   */
````

<a id="csound-15"></a>
## csound-15: demo/csound/click.mjs, module, line 583

````js
        // ⚠️ Counted on the DECK's side of the boundary, not on the page's: a
        // count of what we handed over is a count of our own intention.
````

<a id="csound-16"></a>
## csound-16: demo/csound/click.mjs, module, line 603

````js
      // 🔴 The claim about starting anywhere, checked rather than stated:
      // every bar the score names can be seeked to, and the fold says what has
      // sounded by then, which is what their `;ADVANCE` surgery is for.
````

<a id="csound-17"></a>
## csound-17: demo/csound/click.mjs, module, line 633

````js
      // The offline claim, asserted rather than assumed: plan-uuu-local P2.
      // The kit, the timeline, and this page's own directory, nothing else.
      // ⚠️ AND `/_log` IS LET THROUGH, BY NAME. It is the shell's local log
      // tap (`shell.mjs`, TAP_LOCAL): a POST to the dev server on 127.0.0.1
      // only, never made on the deploy. The old page asserted at load, before
      // the tap's first 250 ms flush, so it never saw one; this check runs in
      // the SELFCHECK pass, after it, and went red on exactly two of them.
````

<a id="csound-18"></a>
## csound-18: demo/csound/index.html, style, line 10

````css
  /* ── SCORE ─────────────────────────────────────────────────────────────
     🔴 THE SCORE BOX IS THE KIT'S CODE BOX SINCE 2026-09-30
     (`demo/shell/code-box.mjs`, `plans/plan-code-editor.md`), coloured as a
     Csound score. Its height is the score's own line count, handed over as
     `rows`, with the compile note's reserve under it. `--well` is the box's
     ground, read by the box and the note alike. */
````

<a id="csound-19"></a>
## csound-19: demo/csound/index.html, style, line 17

````css
  /* 🔴 EACH LINE IN THE COLOUR OF THE LANE THAT DRAWS IT. Asked 2026-09-30,
     *"can you mathc lane colors and code colors somehow"*: an `i` line is an
     event tick, a `t` line is the tempo curve, an `m` or `n` line is a part
     bar, and `code-lang.mjs` tags every coloured token with its line's kind.
     The inks are the strip's own, set from `INK` and `DERIVED` in score.mjs. */
````

<a id="csound-20"></a>
## csound-20: demo/csound/index.html, style, line 26

````css
  /* ── BOTH TABS: a compiled document, one record per line ──────────────
     Scrolled rather than padded, because a score has no fixed length, and a
     fixed height so a longer score moves nothing under it.
     TWO CHANNELS, TWO FACTS: the left border is which part a line belongs to,
     the text is whether it has played. Hue never means "played".
     ⚠️ NO `margin` HERE. The stack owns the rhythm between blocks. */
````

<a id="csound-21"></a>
## csound-21: demo/csound/index.html, style, line 45

````css
  /* ── CLICK ─────────────────────────────────────────────────────────────
     THEIRS AND OURS, SIDE BY SIDE: the score a composer typed and the
     document made out of it, lighting at the same moment. One column on a
     narrow screen, because two 11 px monospace columns at 400 px is a pair of
     ellipses rather than a comparison. */
````

<a id="csound-22"></a>
## csound-22: demo/csound/index.html, inline script, line 67

````js
  /*
   * 🔴 THE TYPED SCORE AND THE CLICK TRACK AS ONE PAGE, asked 2026-10-05:
   * *"merge click and und, no need for 'mobile screen' / theme"*. `/click/`
   * was its own page from 2026-09-14 and is gone with no redirect, the way the
   * 2026-10-04 regrouping retired pages.
   *
   *   SCORE  a Csound score you type, compiled when you stop, with sound
   *   CLICK  U:'s vClick scores, worked out once and played off the page's clock
   *
   * Both are Csound made seekable, which is why they share a page.
   * `demo/shell/tab-page.mjs` does the rest. SCORE owns the page's one
   * published transport bar; CLICK's is `publish: false` and in its `bars`.
   */
````

<a id="csound-23"></a>
## csound-23: demo/csound/score.mjs, module, line 1

````js
// demo/csound/score.mjs: the SCORE tab of /csound/, the page as it was until
// 2026-10-05, when *"merge click and und, no need for 'mobile screen' /
// theme"* made `/click/` its second tab (`./click.mjs`).
//
// WHAT CHANGED ON THE WAY IN, AND WHY:
//   1  The checks moved from load into the page's one SELFCHECK pass
//      (`tab-page.mjs` rule 3). They are the same checks, word for word, and
//      still all on data compiled in the page, plus the typing and the seek.
//   2  🔴 THE READOUT IS DRAWN NOW, AND TWO CELLS LEFT SO IT COULD BE. The old
//      page published six cells with `showReadout: false`, because `rows` and
//      `uses` repeat what the part and event lanes already say in their
//      gutters. A tab's report draws what it declares, so those two went and
//      the four the strip does not say stayed.
//   3  `hide()` pauses the deck, so leaving for CLICK stops the notes.
//
// A WRITTEN SCORE, MADE SEEKABLE: demo/notes/uuu-positron.md §3, on the
// container 04 introduces. vClick conducts an ensemble from a Csound score,
// and the format has two gaps that only appear when someone asks to start in
// the middle:
//
//   1  The tempo map is the INTEGRAL of 60/tempo, because Csound interpolates
//      tempo linearly in BEAT. The lane below draws bpm against time, and the
//      check compares the integral against the mean-tempo shortcut, which
//      looks fine and puts every later note early by a growing amount.
//   2  `m`/`n` is a repeat, and a repeat is a REFERENCE. It compiles to a use
//      in the document, not to four more lines of notes.
//
// THE DOCUMENT AND THE DECK ARE DIFFERENT THINGS, and this tab is where the
// difference bites. plan-timeline C10: the timeline is a TRACE format, never
// an AUTHORING one. A score is a program, the timeline is what a performance
// of it leaves behind. So the document keeps the repeat as ONE use, and the
// deck is built from the EXPANDED compile with every note at its real time.
//
// It has to be. Under a changing tempo "that passage again" is not the same
// passage in time: the second pass here spans 4.75 beats of a ramp and comes
// out 578 ms longer than the first. Playing it as a quotation at rate 1
// replays the FIRST pass's millisecond spacing, shifted, which is what this
// page did until it was measured against `compileCsound(expand: true)`, and
// the last note landed 578 ms early. A single `rate` on the quotation cannot
// fix that either: a scalar is a constant speed and the tempo is moving
// inside the span, so it would match the ends and drift through the middle.
//
// And the seek is the claim nothing else here makes: a score file cannot
// answer "what is in force at bar 9". It carries events, not state.
// `deck.reduceAt(kind, pos)` answers it at any position.
````

<a id="csound-24"></a>
## csound-24: demo/csound/score.mjs, module, line 81

````js
  // ── ink: the part is slate in the strip and in the document (since
  // 2026-09-30, it was yellow), and yellow is kept for a note that has
  // SOUNDED, with its dim twin for one that has not yet ─────────────────────
````

<a id="csound-25"></a>
## csound-25: demo/csound/score.mjs, module, line 113

````js
  /* 🔴 THE BAR'S PLAY IS THE SOUND'S GESTURE SINCE 2026-09-30. `command.play`
     runs inside the click (or the space bar), so the AudioContext is made and
     resumed in the gesture a browser asks for, and then the deck plays. The
     resume is NOT awaited: a context resumed outside a gesture neither
     resolves nor rejects, it waits, and awaiting it left the deck unbuilt
     while the page looked fine. The sound may be late; the timeline is not.
     ⚠️ THIS IS THE PAGE'S ONE PUBLISHED BAR. CLICK's is `publish: false`. */
````

<a id="csound-26"></a>
## csound-26: demo/csound/score.mjs, module, line 124

````js
      /* ⚠️ GRADED ON THE FIRST PRESS, INSIDE IT. Before 2026-09-30 a
         `Play with sound` button did this and the harness pressed it; that
         control is gone, so the claim is read where it now lives. */
````

<a id="csound-27"></a>
## csound-27: demo/csound/score.mjs, module, line 159

````js
      /* 🔴 SLATE, NOT YELLOW, SINCE 2026-09-30: *"make pat lane less yellow,
         use same color as csound score in other demo"*, which is CLICK's
         `words` lane, `#6f7d94`, already this tab's DERIVED. Yellow stays on
         what is lit NOW: a sounded note and the current line. */
````

<a id="csound-28"></a>
## csound-28: demo/csound/score.mjs, module, line 165

````js
        // Each use measured THROUGH THE TEMPO MAP, so a part that falls under
        // the ramp draws wider than the one that does not, which is the whole
        // point and used to be invisible, because both were drawn from the
        // same un-stretched material.
````

<a id="csound-29"></a>
## csound-29: demo/csound/score.mjs, module, line 201

````js
      // THE TEMPO, AND IT IS DERIVED. The map is a function; sampling it into
      // rows to draw it is deriving a picture, not observing one. So it takes
      // the slate 02 and 03 use for "shown, never measured" and the gutter says
      // so. The lane is REMOVED, not flattened, when the tempo does not vary:
      // a flat line is a constant dressed as a measurement.
````

<a id="csound-30"></a>
## csound-30: demo/csound/score.mjs, module, line 255

````js
  /**
   * 🔴 A WARMER VOICE SINCE 2026-09-30, AND THE ONSET IS STILL A CLICK'S.
   * Asked as *"make und nicer-sounding"*. It was one triangle, 8 ms up and gone
   * by 280 ms, straight into the speakers. Now two sawtooths 7 cents either
   * side of the note, through a lowpass that opens bright and closes over the
   * note, a decay of about a second, and a short room made in the page.
   * ⚠️ THE ATTACK STAYS 4 ms. This tab's claim is WHERE each note lands under
   * a changing tempo, and a soft attack would smear exactly the instant being
   * claimed, so everything warmer happens after the onset.
   * ⚠️ THE ROOM IS NOISE WITH A DECAY WRITTEN INTO A BUFFER, NO FETCH. An
   * impulse off a server would be a visit costing somebody a request.
   * ⚠️ QUIET ON PURPOSE: 0.09 a voice into a bus at 0.7 and a compressor at
   * -10 dB, because the repeat under the ramp overlaps notes and eight
   * sawtooths summed at the old 0.2 would clip.
   */
````

<a id="csound-31"></a>
## csound-31: demo/csound/score.mjs, module, line 320

````js
    // Asserted WHEN THE EVIDENCE ARRIVES, not at load: at load nothing has
    // sounded and the claim would be false, and waiting for it with a tolerant
    // "sounded > 0 || not started" is how 03 spent its life not looping.
````

<a id="csound-32"></a>
## csound-32: demo/csound/score.mjs, module, line 350

````js
  /**
   * CSOUND'S m/n INTO THE CONTAINER'S `uses`.
   *
   * A repeat spans mark to here and LANDS here, so the written material and the
   * replay never overlap in parent time, which matters, because rule 7g says
   * one deck has one position and two uses of it may not be present at the same
   * instant. So the score is partitioned: everything up to the repeat, then the
   * quoted span again, then whatever follows, each placed end to end.
   */
````

<a id="csound-33"></a>
## csound-33: demo/csound/score.mjs, module, line 385

````js
  /**
   * The textarea is editable, so a compile failure is a normal thing for a
   * human to cause and not a page fault. Keep the last good document, say what
   * was wrong, and let them fix the line.
   */
````

<a id="csound-34"></a>
## csound-34: demo/csound/score.mjs, module, line 424

````js
      // the part's hue, the same as its lane in the strip (slate since 2026-09-30)
````

<a id="csound-35"></a>
## csound-35: demo/csound/score.mjs, module, line 434

````js
    // ── THE TRACE. Every note the expanded compile produces, at the time the
    // tempo map puts it. A repeat under a ramp is genuinely different material
    // in time, which is why Csound expands it and why quoting the first pass at
    // rate 1 was wrong by 578 ms at the end.
    //
    // The join back to the document is the SOURCE LINE: an expanded note keeps
    // the line it was written on, so the second pass lights the same seven
    // lines the first one did. Expanding for playback is what preserves the
    // one-line repeat, not what breaks it.
````

<a id="csound-36"></a>
## csound-36: demo/csound/score.mjs, module, line 463

````js
    // THE BEND, against the shortcut. Seconds-per-beat is linear in beat, so
    // the true curve is the trapezoid of 60/tempo; averaging the tempo gives a
    // straight line. The difference is the error a mean-tempo compiler ships:
    // every note lands, slightly early, and nothing in the output shows it.
````

<a id="csound-37"></a>
## csound-37: demo/csound/score.mjs, module, line 498

````js
  // ── compiling what was typed, once the typing stops ─────────────────────
  // 🔴 THE KIT'S IDLE COMPILE SINCE 2026-09-30, the same module `/fau/` uses
  // (*"unify compilation in ui logic on this and fau"*). It waits `IDLE_MS`
  // after the last keystroke, never runs two at once, and breathes
  // `Compiling` in the box's bottom right corner, then leaves `Did not
  // compile` standing if the score is refused. The full reason is still this
  // tab's to print, in the warning line under the box.
  // ⚠️ NO `notNow`. A compile here pauses the deck and rebuilds it, which is
  // what it always did; there is no held note to take away.
````

<a id="csound-38"></a>
## csound-38: demo/csound/score.mjs, module, line 525

````js
  /**
   * 🔴 HOW IT WORKS, LAST IN THE TAB, ADDED 2026-10-05 on *"add how it works
   * diagrams to all tenchilogies"*. Read off this file: nothing here talks to
   * any server, so the picture has ONE machine, the Browser.
   * ⚠️ NO `speakers` BOX. It was drawn and MEASURED at 1280 px: the drawer gives
   * every top-level box the container's height, so a speaker beside a Browser
   * of four boxes was a 300 px empty slab. The output is in the AudioContext's
   * note instead. Drawn on the first showing, the way `/sync/`'s
   * AFTER tab does it, because a diagram laid out in a closed panel is laid out
   * for a width nobody has, and because by then the tab's report is already in
   * place above it. CLICK carries its own picture: it makes no sound and its
   * score is carried in the page, so the two tabs do not share one.
   */
````

<a id="csound-39"></a>
## csound-39: demo/csound/score.mjs, module, line 589

````js
      // THE INTEGRAL, and the number this project paid for. Tempo 120 -> 72
      // over 16 beats is the TRAPEZOID of seconds-per-beat (Csound
      // interpolates 60/tempo linearly in beat, verified against csound 6.18);
      // the mean-tempo shortcut is a straight line through the same endpoints.
      // Until 2026-09-09 this said "closed form" and meant a logarithmic
      // integral of a linearly-interpolated TEMPO, which was a third, also
      // wrong answer. See timeline/lab/csound-oracle.mjs.
````

<a id="csound-40"></a>
## csound-40: demo/csound/score.mjs, module, line 606

````js
      // THE GUARD FOR THE BUG THIS PAGE SHIPPED WITH. Every note has to be
      // scheduled where the tempo map puts it, not where the same material
      // landed on its first pass. Quoting the first pass at rate 1 satisfies
      // "the repeat is one use" and every structural check, and still plays the
      // second pass 578 ms early.
````

<a id="csound-41"></a>
## csound-41: demo/csound/score.mjs, module, line 651

````js
      // ── the idle compile, graded by typing into the real box ────────────
      // 🔴 BEFORE `ready` AND AWAITED, AND THAT IS NOT CAUTION. A compile
      // pauses the deck, and `demo/verify.mjs` presses the transport's play
      // after the page says it is ready and asserts the position moved. A
      // compile landing inside that drill would stop it and take the drill red
      // on a page doing what it should.
      // ⚠️ TWO EDITS CLOSER THAN `IDLE_MS`, then ONE compile, and the rows it
      // produced are the SECOND edit's: the count is what says the last text won.
````

<a id="csound-42"></a>
## csound-42: demo/csound/score.mjs, module, line 683

````js
        // 🔴 THE CODE BOX'S ONE INVARIANT, READ OFF THE RENDERED ELEMENTS: the
        // coloured layer holds exactly the textarea's text at its metrics, after
        // two typed edits and a set(). A statement letter on every note line.
````

<a id="csound-43"></a>
## csound-43: demo/csound/score.mjs, module, line 696

````js
      // A seek that lands inside the repeat: the position the score cannot
      // describe. 🔴 AND IT DOES NOT PUT THE PLAYHEAD BACK, which is why it
      // lives here, under SELFCHECK: the harness plays from here and
      // `notes actually sounded` needs a note in that half second.
````

<a id="csound-44"></a>
## csound-44: demo/csound/score.mjs, module, line 707

````js
        /* 🔴 JUST AHEAD OF A NOTE INSIDE THE REPEAT, NOT ON THE BARE MIDPOINT,
           SINCE 2026-09-30. 120 ms before the next note, and only where that
           note is still inside the repeat, so the claim below is unchanged. */
````
