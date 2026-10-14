# Page comments: reel

The full comments cut from the code under demo/ for reel, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="reel-1"></a>
## reel-1: demo/reel/build-fixture.mjs, module, line 1

````js
// demo/reel/build-fixture.mjs — the 1965 catalogue, from bytes we already have.
//
// NODE ONLY. Never shipped to a browser, never imported by the page.
//
// ZERO UPSTREAM REQUESTS. Every row comes from
// `proto/megatimeline/search-cache.jsonl`, which is committed — a search this
// project already ran and kept. ERR's search endpoint is browser-unreachable
// anyway (its preflight answers 204 with no ACAO), so a page could not do this
// live even if it were polite to try.
//
// WHAT IT WRITES, and what it deliberately does not: slug, title, series, lead,
// date, and the absolute position. NO MEDIA URLS, no segments, no bytes. A
// link's worth of metadata is what ERR publishes to be searched; the media
// stays on their origin and is fetched at play time, once, on a gesture.
//
//   node demo/reel/build-fixture.mjs
````

<a id="reel-2"></a>
## reel-2: demo/reel/build-fixture.mjs, module, line 37

````js
// KEEP WHAT WAS ALREADY FETCHED. Durations cost one upstream request each and
// six minutes of them; a rebuild that drops them because it was run with
// --no-fetch is a rebuild that punishes you for rebuilding.
````

<a id="reel-3"></a>
## reel-3: demo/reel/build-fixture.mjs, module, line 64

````js
    // MIDDAY, NOT MIDNIGHT. The catalogue records the DAY a film went out and
    // never the hour, so any time of day we choose is a convention. Midnight
    // pretends to be a real time and puts the clip against the day boundary;
    // midday says "somewhere in this day" by sitting in the middle of it, and
    // it leaves room either side for a clip drawn at its true length.
````

<a id="reel-4"></a>
## reel-4: demo/reel/build-fixture.mjs, module, line 75

````js
// ── how long each film runs ────────────────────────────────────────────────
//
// The catalogue does NOT publish a duration in this API — checked; there is no
// `Kestus` anywhere in the item response. What it does publish is a SHOT LIST
// with real millisecond `beginTime`/`endTime`, so the last shot's end is the
// best figure available without fetching media.
//
// It is a CLAIM, not a measurement, and the two are known to disagree: on one
// film the shot list runs 6,880 ms past the last frame. So the page redraws a
// clip at its measured length once it has been played, and until then this is
// what the catalogue says.
//
// One request per film, spaced. Skipped entirely with --no-fetch.
````

<a id="reel-5"></a>
## reel-5: demo/reel/index.html, style, line 13

````css
  /* EMPTY LOOKS EMPTY. A <video controls> with no source still draws a player —
     a dead play button and 0:00 — which reads as broken rather than as waiting.
     The box keeps its size so the line below never moves; only the furniture
     goes. */
````

<a id="reel-6"></a>
## reel-6: demo/reel/index.html, style, line 24

````css
  /* THE DESCRIPTION IS BOUNDED. ERR's leads run from one line to a dozen, and a
     block that grows with its contents pushes the line down the page by a
     different amount for every film. Five lines here, more where there is room,
     and the rest scrolls inside its own box — so the strip below never moves. */
````

<a id="reel-7"></a>
## reel-7: demo/reel/index.html, style, line 28

````css
  /* ONE COLUMN PER MEDIUM: the newsreel on the left, the radio on the right. No
     colour here — the line below carries the colour, and repeating it on a
     block of prose competes with the marks for the same meaning. This block is
     reference text, so it is quiet: dim, and set off from the picture above and
     the line below by its own margin. A day that has only one of the two still
     gets both columns, and the empty one says in words which half did not
     survive. */
````

<a id="reel-8"></a>
## reel-8: demo/reel/index.html, style, line 35

````css
  /* 🔴 THE GAP ABOVE IT IS THE SHELL'S, NOT A NUMBER TYPED HERE. Asked for
     2026-09-16 with a screenshot: *"add space on top of newsreel | radio"*. It
     carried `margin: 14px 0 4px`, so the two column headings sat tight under
     the line and the strip and the day below it read as one block.
     ⚠️ `margin-bottom`, NEVER the `margin` shorthand. The shorthand's implied
     `margin-top: 0` used to BEAT the rhythm on source order at the same
     specificity, which is exactly how this page lost the rhythm in the first
     place and how the transport bar lost it on every page in the project.
     `.pos-stack` closed that as a class in 2026-09-16 by outweighing a single
     class rather than out-sitting it, and the habit is still the right one. */
````

<a id="reel-9"></a>
## reel-9: demo/reel/index.html, style, line 47

````css
  /* TWO COLUMNS ON A PHONE TOO. Stacked, the second archive reads as a
     footnote to the first; side by side, the day is one thing with two halves,
     which is what the page is about. Estonian compounds are long and a narrow
     column cannot fit them, so words break rather than widening the column
     past its share — `anywhere` and not `break-word`, which leaves an
     over-long word to overflow when it is the only thing on the line.

     NOT `hyphens: auto`. The page declares lang="en" and the text is Estonian,
     so the browser hyphenated it with the wrong dictionary — `Gon-siori`,
     `he-lidefekt`, `arhitektuur-Tallinnas`. A hyphen is a claim about where a
     word divides; breaking without one claims nothing. The columns carry
     lang="et" so a reader's own software knows what language it is looking
     at, which is also the honest answer for a screen reader. */
````

<a id="reel-10"></a>
## reel-10: demo/reel/index.html, style, line 68

````css
  /* TWO FACTS, TWO BOXES. The date and the link used to be one string with a
     middot between them, and the separator was only ever there because they had
     been glued together first. A row with a gap in it says the same thing with
     nothing to read. */
````

<a id="reel-11"></a>
## reel-11: demo/reel/index.html, inline script, line 89

````js
  // THE LINE IS SHARED SINCE 2026-10-13: the deck, the two lanes, picking a
  // day, stepping, scrubbing and the press on a mark live in reel-line.mjs, so
  // /history/newsreels/ draws the same year. What plays, and every reach
  // for ERR, stays on this page.
````

<a id="reel-12"></a>
## reel-12: demo/reel/index.html, inline script, line 95

````js
  /**
   * 🔴 EVERY REACH FOR ERR GOES THROUGH HERE, AND IT IS COUNTED.
   *
   * Not for a readout: for a CHECK. This page's rule is that nothing is asked
   * of a public broadcaster until somebody asks to hear something, and the
   * honest way to grade a rule like that is to count the reaches rather than to
   * reason about which branch was taken. A pass-through cannot be forgotten the
   * way a counter written beside a call can, because a URL does not get to a
   * fetch or to a media element without coming through it.
   *
   * ⚠️ IT COUNTS THE MEDIA AS WELL AS THE API. A content GET is one reach;
   * handing the m3u8 to an element or to hls.js is another, and the second is
   * the one that holds a connection open and is counted as a listener.
   */
````

<a id="reel-13"></a>
## reel-13: demo/reel/index.html, inline script, line 112

````js
  // NATIVE HLS ONLY ON WEBKIT, gated on ManagedMediaSource.
  //
  // This page shipped without the gate and the newsreels were SILENT — reported
  // three times, and the first two "fixes" were aimed at muting, which was
  // never the cause. `canPlayType('application/vnd.apple.mpegurl')` answers
  // "maybe" in Chrome as well as Safari, so Chrome was handed the m3u8 and
  // half-played it: video decoded fine, and the SEPARATE AUDIO GROUP never
  // joined. Measured — 5,405 bytes of audio decoded against 1,127,532 of video
  // in the same 8.5 seconds, with the element unmuted at volume 1.
  //
  // CLAUDE.md says in as many words: grep for `canPlayType` before trusting any
  // HLS page. This page was the counterexample.
````

<a id="reel-14"></a>
## reel-14: demo/reel/index.html, inline script, line 129

````js
    // ONE SENTENCE. It was three, and the two that went said what the page
    // shows you anyway: that the year is a picture (it is on screen) and that
    // nothing is stored here (the log says it every time a film opens, and an
    // assert at the foot of this file grades it).
    // ⚠️ AND IT NAMES THE DIFFERENCE BETWEEN PICKING AND PLAYING, because that
    // is now the difference between a page that asks a public broadcaster for
    // something and one that does not. A sentence that said "press a mark to
    // play it" while ‹ and › quietly did something else would be the drift
    // CLAUDE.md's rule about a description and a control is written about.
````

<a id="reel-15"></a>
## reel-15: demo/reel/index.html, inline script, line 141

````js
    // PUBLISHED, NOT DRAWN. Every cell was already on the page: the count in
    // the lane's gutter, the date under the film's own title and again on the
    // axis the playhead stands on, the length in the line under the strip. A
    // second table saying the same things is a second place to keep in step and
    // one more thing between the reader and the year.
````

<a id="reel-16"></a>
## reel-16: demo/reel/index.html, inline script, line 148

````js
    // NO CONTROLS BESIDE THE PAGE. The line IS the control, and a button that
    // plays "the first film" is a second way to do the one thing the strip
    // already does.
    // ⚠️ ‹ AND › ARE NOT AN EXCEPTION TO THIS. They move the playhead and
    // change what is showing, which is a transport verb, so they are declared
    // on the bar rather than here. See `extras` below.
````

<a id="reel-17"></a>
## reel-17: demo/reel/index.html, inline script, line 158

````js
  // ── the year ──────────────────────────────────────────────────────────────
  // The deck and the line are reel-line.mjs's. A press on a mark plays it; a
  // scrub that comes to rest keeps going if something was going, and
  // otherwise only picks. See the header over `select` for why.
````

<a id="reel-18"></a>
## reel-18: demo/reel/index.html, inline script, line 168

````js
  // BOTH SLOTS EXIST FROM THE START, empty. A picture that appears out of
  // nowhere pushes the line down the page the moment you press a film — so the
  // thing you just aimed at moves while you are looking at it. The box is the
  // same size before and after; only its contents change.
````

<a id="reel-19"></a>
## reel-19: demo/reel/index.html, inline script, line 174

````js
  // ONE PLAYER, TWO SOURCES.
  //
  // 1965 handed picture and sound out separately — the newsreels were shot mute
  // and the radio is sound-only — and they have been apart ever since, in two
  // archives with two interfaces. On a line positioned by the day they went
  // out, putting them back together is one line of arithmetic: same date, play
  // both.
  //
  // So the audio element is HIDDEN and driven, never presented. The picture is
  // the player; it carries the controls, and the sound follows it. When a
  // broadcast has no film to go with it the picture stays black rather than
  // disappearing, because the transport is the picture and a page whose
  // controls vanish is a page that has broken.
````

<a id="reel-20"></a>
## reel-20: demo/reel/index.html, inline script, line 229

````js
  // 🔴 AND THE DAY WHOSE MEDIA IS ACTUALLY OPEN, WHICH IS A DIFFERENT FACT.
  // Picking is free and opening is not, so most of the time a day is picked
  // and nothing is open. `null` here means this page is holding no connection
  // to ERR, and every branch below asks it rather than guessing from
  // `film.paused`, which reads the same for "nothing loaded" and "stopped".
````

<a id="reel-21"></a>
## reel-21: demo/reel/index.html, inline script, line 236

````js
  // STEP THROUGH THE YEAR. 282 films at a week to a screen means the next one is
  // often off the edge, and hunting for it by dragging is not navigation. These
  // are transport verbs — they move the playhead and change what is showing —
  // so they belong on the bar rather than beside the page, which is what
  // `extras` exists for.
  // IS SOMETHING ACTUALLY SOUNDING? Not `film.paused`, which reads the same for
  // a stopped film and for an element that was never given one. `opened` is the
  // day whose media this page holds, and it is null far more often than not.
````

<a id="reel-22"></a>
## reel-22: demo/reel/index.html, inline script, line 245

````js
  /**
   * 🔴 STEPPING WHILE NOTHING IS PLAYING PICKS A DAY. IT DOES NOT FETCH.
   * Changed 2026-09-19, and see the header over `select` for why.
   *
   * The two readings of ‹ and › are both real and they belong to two different
   * people. Somebody watching a newsreel who presses › means the next one, and
   * gets it, playing. Somebody walking the year with nothing running means
   * "show me that day": the caption fills, the mark lights, the playhead moves,
   * and the play button starts it when they want it. The second reading costs a
   * public broadcaster nothing, and it is the one a check walking the controls
   * takes without knowing it.
   */
````

<a id="reel-23"></a>
## reel-23: demo/reel/index.html, inline script, line 262

````js
  /**
   * 🔴 THE LOOP PLAYS THE FILM, BECAUSE THE PAGE OWNS WHAT IS BEING PLAYED.
   * Asked for 2026-09-16: *"make loop work"*.
   *
   * What it did before: LOOP marked two positions on a deck of 1965 and wrapped
   * the PLAYHEAD between them while the newsreel ran straight on to its end.
   * The bar wraps by SEEKING, and with no `command` a seek goes to the deck,
   * which on this page is a year rather than the thing making the picture. So
   * the control lit, the marks were real, and nothing a visitor could see ever
   * came back. `/replay/` had the identical fault the same week, reported as
   * *"transport loops but video does not, time keeps increasing"*, and this is
   * the same repair: every verb drives the element and the deck follows.
   *
   * ⚠️ A POSITION HERE IS A MOMENT IN 1965, WHICH IS WHAT MAKES THE MAPPING
   * HONEST RATHER THAN CLEVER. A clip is drawn from the day it went out and is
   * as wide as it is long, so `position - current.at` IS how far into the film
   * the playhead has got. Press LOOP twenty seconds in and again thirty-five
   * seconds in and the loop is that passage of that newsreel, with the same
   * day's radio following it through the picture's own `seeked`.
   */
````

<a id="reel-24"></a>
## reel-24: demo/reel/index.html, inline script, line 282

````js
  // ⚠️ THE ARITHMETIC IS PURE AND THE STATE IS THE THIN WRAPPER ROUND IT, so
  // the check at the foot of this file can grade the mapping with nothing open
  // and nothing picked, which is how this page now opens.
````

<a id="reel-25"></a>
## reel-25: demo/reel/index.html, inline script, line 290

````js
      /**
       * 🔴 THE PLAY BUTTON OPENS THE DAY THAT IS PICKED, AND NOTHING IS PICKED
       * WHEN THE PAGE OPENS. The line said, for a year: *"Pressing play with
       * nothing chosen starts the first film, which is what this page has
       * always done"*, and that was written when the page had already fetched
       * that film on load anyway. It is the same claim in a different place:
       * the page reaching a broadcaster's server on behalf of somebody who has
       * not asked for anything in particular.
       *
       * ⚠️ SO THE YEAR RUNS AND THE LOG SAYS HOW TO PICK. The playhead really
       * does advance at one second of 1965 a second, which is about a pixel an
       * hour at a month to a screen, and a control that moves something nobody
       * can see needs words. This is the only honest thing left: there is
       * nothing to start.
       */
````

<a id="reel-26"></a>
## reel-26: demo/reel/index.html, inline script, line 305

````js
      /**
       * 🔴 AND SINCE 2026-09-30 A PRESS WITH NOTHING PICKED STARTS THE FIRST
       * MARK ON THE LINE, film or radio, whichever went out first. Asked:
       * *"when i press play, reel demo short start from first (whaterver
       * playing). no selection needed"*. The rule above is about a VISIT and
       * still holds: a load opens nothing. A person pressing play is a person
       * asking to listen, which is exactly when a broadcaster's server may be
       * reached.
       * ⚠️ THE HARNESS PRESSES THIS BUTTON (`verify.mjs`, the transport
       * toggle), SO UNDER `?selfcheck=1` IT PICKS AND DOES NOT OPEN. Otherwise
       * every run of the suite would hold an ERR stream from a headless Chrome.
       */
````

<a id="reel-27"></a>
## reel-27: demo/reel/index.html, inline script, line 319

````js
        // FIRST FROM WHERE THE PLAYHEAD STANDS, NOT FROM THE YEAR'S START
        // (reel-line.mjs says why).
````

<a id="reel-28"></a>
## reel-28: demo/reel/index.html, inline script, line 344

````js
      // 🔴 ONLY INSIDE THE FILM THAT IS PLAYING. A loop marked across days has
      // both ends on the line and neither of them in this newsreel, and writing
      // an eleven-day currentTime onto a two-minute element clamps to the end,
      // which is a loop that plays nothing at all. Out there the picture is left
      // alone and the playhead moves by itself, which is what it did before.
````

<a id="reel-29"></a>
## reel-29: demo/reel/index.html, inline script, line 357

````js
  // THE PICTURE IS THE MASTER AND THE YEAR FOLLOWS IT. The playhead used to
  // free-run at one second of 1965 per second of now from wherever the film was
  // opened, which agrees with the film until somebody uses the picture's own
  // controls: then the line says one thing, the film says another, and a mark
  // made off the line is made in the wrong place. `anchorMs` is a function
  // because the anchor is whichever clip is up. No rAF here: the L4 timeupdate
  // backstop drives it, exactly as on `/replay/`.
````

<a id="reel-30"></a>
## reel-30: demo/reel/index.html, inline script, line 370

````js
    // 🔴 NO CLOCK. A position on this deck is a DATE, so the bar read
    // `-2611440:00.000` over `525600:00.000`, which is correct arithmetic: zero
    // is 1970, 1965 is before it, and a year is 525600 minutes long. A clock is
    // simply the wrong instrument for an axis measured in days, and the axis
    // under the bar prints the date it is standing on.
````

<a id="reel-31"></a>
## reel-31: demo/reel/index.html, inline script, line 377

````js
    // ‹ AND ›, THE SAME PAIR `/tapes/` CARRIES. They move the playhead and
    // change what is showing, which is a transport verb rather than something
    // you do to the page, so they sit on the bar.
    // ⚠️ ONE PRESS IS ONE BROADCAST DAY, NOT ONE MARK. `step` walks `days`,
    // which folds both lanes onto the day they share: stepping through one lane
    // alone skips the weeks the other is the only witness to, and stepping
    // through both as a flat list hands you the same afternoon twice.
````

<a id="reel-32"></a>
## reel-32: demo/reel/index.html, inline script, line 388

````js
    // 🔴 NOTHING IS LOGGED ABOUT THE LOOP, ON INSTRUCTION 2026-09-16: *"rm all
    // loop messages."*. It said which seconds of which newsreel were being
    // looped, and said so in words when both marks were not inside the film
    // that is playing. The first is what the picture does in front of you; the
    // second is now unreachable by hand, because a press starts the transport
    // and both marks land inside the clip that is running.
````

<a id="reel-33"></a>
## reel-33: demo/reel/index.html, inline script, line 395

````js
  // THE LINE GOES ON THE PAGE AFTER THE BAR, which is the order the glue
  // below has always read its anchor in.
````

<a id="reel-34"></a>
## reel-34: demo/reel/index.html, inline script, line 397

````js
  /**
   * 🔴 WHAT YOU ARE POINTING AT GOES UNDER THE LINE, NOT OVER IT. Asked
   * 2026-09-19 with a photograph of this page on an iPhone: *"add feature to
   * timeline: footer section, looks like glued that shows hovered info below
   * timeline"*. The photograph is of this strip: the sticky tap tooltip over
   * the right half of it, four lines deep, one of them cut mid word, covering
   * the marks it was describing. A finger has no hover, so on a phone that
   * box has to stay up while the finger is down, which is precisely when it
   * is in the way.
   *
   * 🔴 THREE LINES, WHICH IS WHAT THE TOOLTIP CARRIED AND NOT MORE. The
   * footer covers nothing, so it could afford a fourth, and the line it would
   * get back is the one this page cut a session ago: `silent newsreel` or
   * `radio, with sound`. That stays cut, and for the reason that never had
   * anything to do with room. The lane it is drawn in is CALLED `newsreels`
   * or `radio`, in the gutter an inch to the left of the mark. What the
   * fourth line would cost is real: this box is a fixed height whether or not
   * anything is under the pointer, so a line nobody needs is a line of empty
   * box under the timeline for the whole visit.
   *
   * ⚠️ AND THE TOOLTIP IS GONE RATHER THAN KEPT ALONGSIDE. `createStripView`
   * turns it off for any strip with a footer unless a page asks for both, and
   * two surfaces saying the same three lines is the thing to avoid: one of
   * them would be the one covering the marks.
   */
````

<a id="reel-35"></a>
## reel-35: demo/reel/index.html, inline script, line 424

````js
  /**
   * 🔴 THE BAR, THE LINE AND WHAT YOU ARE POINTING AT ARE ONE SURFACE. Asked
   * 2026-09-19: *"glue reel transport to timeline"*, and then for the footer
   * *"looks like glued"*. The bar already passes `scrub: false` BECAUSE the
   * line below it is this page's position surface, so the two have been one
   * instrument all along with the page's 22 px rhythm drawn through the middle
   * of it.
   *
   * 🔴 IT IS `view.surface`, NEVER `view.el`. The canvas and the footer are
   * glued into one box by `createStripView` itself, and `surface` is that box;
   * gluing the canvas would tear it out of its own pair and leave the footer in
   * a box with nothing else in it. ⚠️ THE NESTING DOES NOT DOUBLE THE EDGE:
   * `.pos-glue.pos-glue > *` weighs (0,2,0) against `.pos-glue`'s own (0,1,0),
   * so the inner box gives up its border and radius to the outer one exactly as
   * the canvas and the bar do, and what is left of it is the 1 px seam between
   * the line and the footer. Read from `shell.css` rather than assumed.
   * ⚠️ AND IT IS THE RIGHT LINE WITH NO FOOTER TOO: `surface` is the bare
   * canvas when a strip has none, so this call does not have to know.
   *
   * ⚠️ THE ANCHOR IS READ BEFORE THE GLUE. `createGlue` re-parents its blocks,
   * so a node captured after the call can be detached and `insertBefore` throws
   * on it. `null` is append, which is what a pair at the end of the page wants.
   */
````

<a id="reel-36"></a>
## reel-36: demo/reel/index.html, inline script, line 454

````js
  /**
   * 🔴 PICKING A DAY COSTS NOTHING. OPENING ONE COSTS ERR, SO ONLY SOMEBODY
   * ASKING TO HEAR IT OPENS ONE. Split 2026-09-19.
   *
   * What this page did before: it opened a newsreel AND that day's radio on
   * LOAD, before anybody pressed anything, and every step and every landing did
   * the same whether or not anything was playing. So a visit was two content
   * GETs and a stream held open, and a run of the suite was that again for
   * every button it pressed, on a page whose own sentence is that it streams
   * from ERR.
   *
   * CLAUDE.md is exact about the damage, and it is not load: a few dozen
   * headless browsers holding a broadcaster's mounts are counted as listeners
   * who never leave, and those figures are what it reports to its board and its
   * funders. It cannot be undone by stopping, only by not adding to it.
   *
   * So the two halves are separated. `select` moves the playhead, frames the
   * view, fills the caption and colours the mark, and opens NOTHING. `play` is
   * the half that reaches for ERR, and the only things that call it are a press
   * on a mark, a press of the play button on a day already picked, and a step
   * or a scrub landing while something is already playing, which is somebody
   * watching who has asked for the next one.
   *
   * ⚠️ IT IS THE SAME RULE FOR EVERYBODY, and there is no harness branch in
   * here. A page that behaves one way for a check and another way for a visitor
   * is a page nothing grades.
   */
````

<a id="reel-37"></a>
## reel-37: demo/reel/index.html, inline script, line 493

````js
  /**
   * SHUT WHAT IS OPEN. A picture left standing under another day's caption is
   * the page disagreeing with itself.
   *
   * ⚠️ `empty` IS FALSE WHEN A NEW SOURCE IS ABOUT TO GO INTO THE SAME ELEMENT,
   * AND THAT IS NOT TIDINESS. `film.load()` re-runs the media load algorithm,
   * where WebKit re-applies the behaviour restrictions a user gesture lifted.
   * This page has already paid for a spent gesture once: every newsreel came
   * out SILENT, reported three times, with nothing wrong in the player.
   */
````

<a id="reel-38"></a>
## reel-38: demo/reel/index.html, inline script, line 508

````js
    // AND EMPTY IT. Destroying the hls instance leaves the element un-paused
    // with a source that no longer exists — inaudible today, and exactly the
    // state that becomes a phantom second sound the next time something calls
    // play() on everything.
````

<a id="reel-39"></a>
## reel-39: demo/reel/index.html, inline script, line 519

````js
  // STREAMS, STORES NOTHING. One content GET to arhiiv.err.ee for the film's
  // media url, then the element is given that URL. The page never holds the
  // bytes: no fetch of segments, no blob URL over them, nothing to R2 or to
  // localStorage. A copy is the one thing this must not make.
````

<a id="reel-40"></a>
## reel-40: demo/reel/index.html, inline script, line 524

````js
    // BLESS THE ELEMENT NOW, before anything is awaited.
    //
    // A user gesture does NOT survive an `await`. This function fetches the
    // media url first and calls `play()` after, by which time the gesture is
    // spent — so the unmuted play was refused and the fallback muted it. Every
    // newsreel came out silent, twice reported, and my headless check missed it
    // because `--autoplay-policy=no-user-gesture-required` is exactly the flag
    // that hides this.
    //
    // Calling `play()` synchronously inside the gesture marks the element as
    // user-activated even though it rejects for having no source yet. That
    // rejection IS the mechanism, not a failure.
````

<a id="reel-41"></a>
## reel-41: demo/reel/index.html, inline script, line 541

````js
    // ERR hands back a PROTOCOL-RELATIVE url (`//vod.err.ee/…`). On the deployed
    // https page that resolves to https on its own, but on a local http server
    // it resolves to http — so the same code plays over a different protocol
    // depending on where it runs, which is the kind of difference that is
    // invisible until it is a mixed-content block. Pin it.
````

<a id="reel-42"></a>
## reel-42: demo/reel/index.html, inline script, line 564

````js
    // ── the sound ────────────────────────────────────────────────────────
    // WHERE IT GOES DEPENDS ON WHETHER THERE IS A PICTURE. With a newsreel to
    // pair against, the radio loads into the hidden element and the picture
    // drives it. With no newsreel, the radio goes into the VIDEO element
    // itself — a <video> plays an audio-only HLS stream perfectly well, shows
    // a black frame, and its controls are then real controls driving real
    // media. That is how a sound-only day gets the same transport as every
    // other day without a second set of buttons appearing under the picture.
````

<a id="reel-43"></a>
## reel-43: demo/reel/index.html, inline script, line 620

````js
    // WITH SOUND. `armVideo` mutes — that is its whole job, buying autoplay on a
    // page that never got a gesture — and using it here made every newsreel
    // silent. This play came FROM a gesture (a press on the line), so sound is
    // allowed and these films have it: AAC in its own group, alongside
    // renditions up to 1920x1080.
    //
    // The fallback is still there and is still needed: a browser may refuse
    // anyway, and a muted picture beats no picture. But it is the fallback now,
    // not the default.
````

<a id="reel-44"></a>
## reel-44: demo/reel/index.html, inline script, line 640

````js
    // THE PICTURE DRIVES THE SOUND. Not a servo and not a sync loop — the two
    // are different recordings of different lengths that merely share a day, so
    // pretending to hold them in lockstep would be inventing a relationship the
    // archive does not have. They start together, stop together, and a scrub of
    // the picture takes the sound to the same offset. Where the radio is longer
    // than the film, which is usual, it simply keeps its own place.
````

<a id="reel-45"></a>
## reel-45: demo/reel/index.html, inline script, line 659

````js
    // THE FILMS ARE SILENT, and it took four reports of "no sound" to establish
    // that nothing was broken.
    //
    // Measured: every `AK filmikroonika` audio fragment is exactly 6,766 bytes
    // per 10 seconds — 5.4 kbps, which is what AAC costs to encode silence. A
    // 1965 item from outside the series measured 123.8 kbps on the same path,
    // so the player, the CORS, the audio group and the decoder are all fine.
    // `filmikroonika` was shot MUTE; sound was added at screening or not at all.
    //
    // This still reports, because "silent" and "broken" look identical from the
    // outside and the difference is the whole point. It just no longer accuses
    // the player of a fault that belongs to 1965.
````

<a id="reel-46"></a>
## reel-46: demo/reel/index.html, inline script, line 689

````js
  // THE DECK AND THE PICTURE MOVE TOGETHER, WHEN THERE IS A PICTURE. Anything
  // that starts the deck (the play button, the keyboard, a release after a
  // scrub) starts whatever is open, and anything that stops it stops that.
  //
  // ⚠️ WITH NOTHING OPEN THE YEAR SIMPLY RUNS, and this branch used to open the
  // first film instead. The playhead advances at one second of 1965 per second
  // of now, which at a month to a screen is about a pixel an hour: invisible,
  // and truthful. `command.play` says so in the log, which is where the words
  // belong.
````

<a id="reel-47"></a>
## reel-47: demo/reel/index.html, inline script, line 702

````js
      // ONLY IF IT HOLDS SOMETHING. play() on a source-less element does not
      // throw and does not make a sound; it just leaves the element reading as
      // playing, which is a lie the next reader has to chase down.
````

<a id="reel-48"></a>
## reel-48: demo/reel/index.html, inline script, line 712

````js
  // ── scrubbing the year ────────────────────────────────────────────────────
  // reel-line.mjs: the playhead follows the finger, and the broadcast nearest
  // where it comes to rest arrives at `onLand` above, once the hand has let go.
  // A press (not a drag) on a mark arrives at `onPress`.
````

<a id="reel-49"></a>
## reel-49: demo/reel/index.html, inline script, line 739

````js
    // WHY THIS IS ASSERTED AT ALL: the strip auto-detects an absolute domain by
    // magnitude (`range[0] > 1e12`), and 1965 is NEGATIVE — so the detection
    // says "relative" and the axis would read `-1822d` instead of `1965-01-04`.
    // The page's `absolute: true` is what fixes that, and dropping it fails here.
````

<a id="reel-50"></a>
## reel-50: demo/reel/index.html, inline script, line 747

````js
    // 🔴 THE LOOP'S ARITHMETIC, GRADED WITHOUT OPENING ANYTHING. A mark on this
    // line is a moment in 1965, and the loop plays it as an offset into the film
    // that is up, so this mapping is what the loop stands on. It is also the
    // ONLY part of the loop this page can check: the rest needs a real stream
    // from ERR, and a check is not a reason to open one.
````

<a id="reel-51"></a>
## reel-51: demo/reel/index.html, inline script, line 756

````js
    // 🔴 WHERE A SCRUB LANDS, GRADED WITHOUT OPENING ANYTHING. A finger stops
    // between broadcasts far more often than on one, so the arithmetic that
    // picks the nearest IS the behaviour. The rest of a scrub needs a stream
    // from ERR, and a check is not a reason to open one.
    // ⚠️ BOTH DIRECTIONS, because one of them alone passes for a function that
    // always answers with the same end of the year.
````

<a id="reel-52"></a>
## reel-52: demo/reel/index.html, inline script, line 766

````js
    /**
     * 🔴 THE RULE THIS PAGE LIVES UNDER, GRADED AS A CONNECTION COUNT RATHER
     * THAN AS AN INTENTION. Every URL that leaves for ERR goes through
     * `reachERR`, so both of these ask the only question worth asking: how many
     * times did this page reach for somebody else's server?
     *
     * The first is data already in hand and runs for everybody, which is what
     * makes it worth having: a visitor's own page is the honest witness to
     * whether opening it costs a broadcaster anything.
     */
````

<a id="reel-53"></a>
## reel-53: demo/reel/index.html, inline script, line 778

````js
    /**
     * ⚠️ THE SECOND PRESSES A CONTROL, SO IT IS BEHIND THE GATE. `step` is what
     * ‹ and › call, and a check that went round it would be grading a copy of
     * the rule rather than the rule — but `selfcheck.mjs` is exact about what
     * moves behind the gate, and "presses a control" is on its list.
     * 🔴 THE RULE ITSELF IS NOT GATED AND MUST NEVER BE. Stepping while nothing
     * plays picks a day for everybody; what is gated is only this page driving
     * its own buttons to prove it.
     * ⚠️ AND IT PUTS THE PAGE BACK. Two steps forward and back leave the day
     * the view opened on picked; `select(null)` returns it to the state a
     * visitor arrives in, which is nothing picked and no connection held.
     */
````

<a id="reel-54"></a>
## reel-54: demo/reel/index.html, inline script, line 799

````js
    /**
     * 🔴 THE LINE UNDER THE STRIP SAYS WHAT THE POINTER IS ON, AND SAYS SO WHEN
     * IT IS ON NOTHING. Both halves are the check: a box that reports only when
     * there is something to report is a box that collapses and takes the page
     * down with it every time a finger moves off a mark.
     *
     * ⚠️ IT DRIVES THE STRIP'S OWN POINTER PATH rather than calling
     * `footer.set` with a hit of its own making. Everything worth grading is
     * between those two points: the hit test, `describeRow`, and the wiring
     * `createStripView` does between the strip's `onHover` and the footer. A
     * check that handed the footer a hit would be grading the footer's
     * `textContent`, which nobody doubts.
     *
     * ⚠️ AND IT AIMS AT THE DAY THE VIEW OPENED ON, so no zoom and no pan is
     * needed to reach it: it is at the centre of the opening month by
     * construction, and the nearest other newsreel is days away against a hit
     * tolerance of six pixels. Behind the gate, because moving a pointer over a
     * page is something a person would see.
     */
````
