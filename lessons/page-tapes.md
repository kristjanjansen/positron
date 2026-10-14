# Page comments: tapes

The full comments cut from the code under demo/ for tapes, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="tapes-1"></a>
## tapes-1: demo/tapes/index.html, style, line 10

````css
  /* 🔴 WIDER THAN THE PROSE, FOR THE SAME REASON `/resources/`'S TABLE IS. The
     shell caps a page at 720 px, which is right for a paragraph. This axis
     carries 130 years; at 720 px a decade is 55 px and the 1960s — where a
     third of everything sits — is a smear. The strip breaks out and the prose
     above it does not, because they are answering different questions. */
````

<a id="tapes-2"></a>
## tapes-2: demo/tapes/index.html, style, line 16

````css
  /* The name of what is playing. ⚠️ FIXED HEIGHT AND `nowrap`: it changes every
     time you press ‹ or ›, and CLAUDE.md is explicit that nothing which redraws
     may change how much room it takes. Two lines of title would move the strip
     under it every time. */
````

<a id="tapes-3"></a>
## tapes-3: demo/tapes/index.html, style, line 28

````css
  /* 🔴 THE LANE IS EMPTY UNTIL THE LIST ARRIVES, AND AN EMPTY CANVAS READS AS A
     BROKEN ONE. A quiet pulse over the strip says the page is still working
     without adding anything to read, and it takes NO ROOM: opacity only, on an
     element whose size never changes. It is taken off the moment there are bars
     to draw. */
````

<a id="tapes-4"></a>
## tapes-4: demo/tapes/index.html, inline script, line 50

````js
  // The same file `/resources/` reads. ONE corpus, two pictures of it: that
  // page answers "what is there and who holds it", this one answers "when was
  // it, and can I hear it". A second copy of the data would be a second thing
  // to keep true.
````

<a id="tapes-5"></a>
## tapes-5: demo/tapes/index.html, inline script, line 56

````js
  /**
   * 🔴 WHERE THE RECORDINGS ARE FETCHED FROM, AND IT IS archive.org UNLESS
   * SOMEBODY SAYS OTHERWISE. This is the same escape hatch `/archive/radio/` has, in
   * the same shape and for the same reason.
   *
   * Every recording here is on somebody else's server, and the standing
   * instruction is *"stil: super careful with external sources, better avoid"*,
   * said in reply to the argument that archive.org is safe because it is not
   * ERR. So `node demo/verify.mjs tapes` used to pull real recordings off a
   * public archive on every run, including the runs where somebody typed no
   * arguments at all. `demo/fake-tapes.mjs` serves the same paths at the same
   * lengths from this machine, and the harness points the page at it.
   *
   * ⚠️ IT REWRITES THE PATH AND NOTHING ELSE. `corpus.json` is untouched, the
   * list is the same list, and `it.file` still says where a recording really
   * lives, which is what the `served from somewhere else` check below reads.
   * Only the URL the media element is opened at moves.
   *
   * ⚠️ AND A VISIT IS BYTE FOR BYTE WHAT IT WAS. With no `base` the parameter is
   * empty and `srcOf` hands back `it.file`, so nothing about a page nobody has
   * pointed anywhere changes.
   */
````

<a id="tapes-6"></a>
## tapes-6: demo/tapes/index.html, inline script, line 84

````js
  /**
   * 🔴 THE SECOND ADDRESS FOR A RECORDING WHOSE SOUND CANNOT BE READ, ASKED FOR
   * AS *"this recordin wil noot allow read its sound: make proxy"*.
   *
   * archive.org redirects a download to a storage node and that node does not
   * always send `access-control-allow-origin`. Without it `crossOrigin =
   * 'anonymous'` is refused outright, and the only thing this page could do was
   * reopen the element WITHOUT the crossing: the tape plays and the graph is
   * TAINTED, so the analyser runs and is not allowed to return real numbers.
   * `retryOpen` below now tries a same-origin-shaped hop first, because "may I
   * display this" and "may I read its samples" are different permissions and
   * only the second one was missing. `workers/tapes/worker.mjs` is the hop.
   *
   * 🔴 IT IS EMPTY UNDER A `base`, WHICH IS AN INVARIANT RATHER THAN A HOPE.
   * `node demo/verify.mjs tapes` points this page at `demo/fake-tapes.mjs` with
   * its own `?base=`, and `DEMO_HOSTS=1` proves that the only hosts a run
   * contacts are the development server and that stand-in. A page pointed at a
   * stand-in must not be able to reach PAST it, whatever a recording does, so
   * the proxy is switched off by the presence of `base` rather than by the
   * stand-in happening never to fail.
   *
   * ⚠️ AND IT IS NOT DEPLOYED YET. The ladder in `retryOpen` falls through to
   * exactly what this page did before if the proxy answers anything unplayable,
   * so the route being absent costs a waveform on a refusing recording and
   * nothing else. `?proxy=` points it somewhere else and `?proxy=` with no
   * value switches it off.
   */
````

<a id="tapes-7"></a>
## tapes-7: demo/tapes/index.html, inline script, line 118

````js
    // ⚠️ REWRITTEN WITH THE AXIS. It described a picture of DATES: "as wide as
    // its date is vague, so a day is a tick and a decade is a decade wide", and
    // a colour legend for four states that this lane no longer has, since it
    // draws only the tapes that play. Every sentence of it was true of the page
    // this replaced, which is the exact failure CLAUDE.md warns about: a
    // description that has drifted is worse than a missing one, because a
    // visitor believes it.
    // 🔴 THREE SENTENCES. It was five, and it had grown by one with every
    // change: what to press, what the arrows do, why the dates are above rather
    // than on the picture. A visitor wants what this is, what to press and what
    // the numbers mean. ⚠️ AND IT CHANGED WITH THE PAGE, IN THE SAME EDIT: the
    // widths are measured before anybody arrives now, the picture moves by
    // itself, and LOOP keeps a lap instead of sending the tape back.
````

<a id="tapes-8"></a>
## tapes-8: demo/tapes/index.html, inline script, line 141

````js
  // ── colour says HOW IT LANDED, never which lane ─────────────────────────
  // CLAUDE.md, one meaning for colour across every demo. Every one of these
  // comes from a field the corpus already carries, so nothing here is a new
  // measurement — `http`, `cors` and `file` were written down when the record
  // was gathered.
````

<a id="tapes-9"></a>
## tapes-9: demo/tapes/index.html, inline script, line 147

````js
  /**
   * 🔴 TAPE SHADES, AND THIS IS A DELIBERATE EXCEPTION TO THE COLOUR RULE.
   *
   * CLAUDE.md: a mark's colour says HOW IT LANDED, never which lane it is in.
   * That rule was written for a lane holding records in four different states,
   * and it spent the whole channel usefully. This lane no longer does: it draws
   * the PLAYABLE tapes and nothing else, so `stateOf` returns `open` for every
   * one of them and every bar came out the same green. A channel that carries
   * one value carries nothing, and the fact it was spent on is now said by the
   * bar existing at all.
   *
   * So it is spent on the thing that was asked for and has no other channel:
   * WHERE ONE TAPE ENDS AND THE NEXT BEGINS. Laid end to end with a two pixel
   * gap, twenty-three identical bars read as one long bar with scratches in it.
   *
   * ⚠️ GREYISH AND BROWNISH, WHICH IS NOT DECORATION EITHER. These are the
   * colours of the thing being drawn: oxide, leader tape, a splice. They cycle
   * over three rather than two so that a run of three is still three, and they
   * are close enough in lightness that the RING on the loaded tape and the
   * dimming of the rest are still the loudest thing in the lane, which is the
   * one distinction that must survive.
   */
````

<a id="tapes-10"></a>
## tapes-10: demo/tapes/index.html, inline script, line 169

````js
  // ⚠️ MEASURED OFF THE CANVAS AND THEN RAISED. The first set came out at
  // rgb(62,59,58) on screen, four points off the lane's own background: the
  // bars were being drawn correctly and were invisible. Two things darken them
  // and both are legitimate alone. The renderer fills a crisp span at 0.85, and
  // a lane with a current bar dims the rest to half; together that is 0.42 of a
  // mid grey over a near-black field. These are bright enough to survive both,
  // and far enough from each other that the join between two tapes is seen
  // rather than inferred.
````

<a id="tapes-11"></a>
## tapes-11: demo/tapes/index.html, inline script, line 185

````js
  /**
   * 🔴 ASK THE BROWSER AND THE FILENAME, NOT THE HOLDER'S HEADER. Two things the
   * corpus says about a file turn out not to be about that file:
   *
   *   · `fileType` is the content-type the host SENT, and archive.org serves
   *     `YLE.Time.and.Matter.4of5….avi` as `video/mp4`. `canPlayType` believes
   *     it, the browser then cannot decode a frame, and the page offers a
   *     recording nobody can hear. The extension is the better evidence here,
   *     which is not a thing one expects to have to write down.
   *   · `cors` was measured with a Range probe on ONE FILE PER SOURCE, so it is
   *     a fact about archive.org and not about this object — MEASURED the first
   *     time this page ran: `No 'Access-Control-Allow-Origin' header` on exactly
   *     that `.avi`, from a row the corpus marks `cors: true`.
   *
   * Both are capability tests rather than trust: either this browser plays it or
   * it does not, and that is the same question everywhere.
   */
````

<a id="tapes-12"></a>
## tapes-12: demo/tapes/index.html, inline script, line 209

````js
  /**
   * 🔴 THE AXIS IS ONE LONG TAPE, NOT A CENTURY. DECIDED, do not re-open.
   *
   * It was 1890 to 2027 and a mark was as wide as its date is VAGUE, which made
   * a lovely picture of an archive's uncertainty and a useless one of a tape:
   * *"scale is off. i see days but recs are minutes log only"*. A recording of
   * eight minutes drawn ten years wide says nothing about the recording. The
   * decision, in the words it was given in: *"its a loooong life tape
   * experience not overview timeline"*, and then *"jsut back to back tapes"*.
   *
   * So the tapes run END TO END from nought, each exactly as wide as it really
   * is. A width is finally a duration, and the axis is read in hours and
   * minutes of tape rather than in years.
   *
   * ⚠️ A CLOCK STARTING AT 08:00 WAS TRIED FIRST AND CUT, ON INSTRUCTION. It
   * would have read as a day's broadcast, which is a second claim the picture
   * does not need to make: the subject is the tape, and a tape starts at nought.
   *
   * ⚠️ WHAT IS GIVEN UP IS REAL AND IS WRITTEN DOWN HERE so nobody rediscovers
   * it as a bug: **the dates are no longer on the picture**. They are still in
   * the corpus, still in the line above the strip, and still the order the
   * tapes are laid out in.
   */
````

<a id="tapes-13"></a>
## tapes-13: demo/tapes/index.html, inline script, line 233

````js
  // 🔴 HOW WIDE THE PICTURE OPENS, AND IT IS ONE HOUR. Asked as *"zoom to 1h"*.
  // It is a constant rather than a number typed at the `fit()` call because the
  // assert below prints it: a check that types its own idea of the span grades
  // the page against a second copy of the answer, which is the defect
  // `timeline/csound.mjs` was green through for months.
````

<a id="tapes-14"></a>
## tapes-14: demo/tapes/index.html, inline script, line 243

````js
  /**
   * 🔴 WHERE EACH TAPE SITS ON THE DAY, AND IT CANNOT BE KNOWN AT LOAD.
   *
   * A tape's width on this axis is its real length, and nothing in the corpus
   * carries one: a length is only known once a browser has read the file's own
   * metadata. So the schedule is built as the answers arrive rather than once,
   * and a tape that has not answered yet is drawn at `GUESS` and corrected in
   * place when it does.
   *
   * ⚠️ A GUESS IS DRAWN AND IS SAID TO BE A GUESS. Leaving an unmeasured tape
   * off the picture would make the day short by however many have not answered,
   * and every tape after it would sit at the wrong time. Drawing one at a made
   * up length is the lesser wrong ONLY because `measured` records which is
   * which and the lane says how many are still guesses.
   */
````

<a id="tapes-15"></a>
## tapes-15: demo/tapes/index.html, inline script, line 272

````js
    // ⚠️ THE DECK'S RANGE MOVES WITH IT. The day gets longer every time a tape
    // turns out to be longer than the guess, and a range left where it was
    // would push the last tapes off the right edge of a picture that claims to
    // show the whole day.
````

<a id="tapes-16"></a>
## tapes-16: demo/tapes/index.html, inline script, line 277

````js
    // 🔴 AND THE PICTURE IS FRAMED ON IT. `setRange` moves the deck's window and
    // the strip does not refit for it: it fits ONCE, at construction, against
    // whatever range the deck had then. So the run got longer twenty-four times
    // as the lengths arrived and the view stayed where it started, which is a
    // page that draws the whole run and shows part of it.
    // ⚠️ UNTIL A VISITOR TAKES THE VIEW. Refitting under somebody who has just
    // panned or pinched is the page arguing with them, and the last answer from
    // a slow host can be twelve seconds after the page loaded.
    // 🔴 AN HOUR WIDE, NOT THE WHOLE RUN. Asked as *"zoom to 1h"* and never
    // done: `fit()` takes the deck's whole range, so a 24-tape day opened at
    // about two and a half hours across a strip a few hundred pixels wide,
    // where a six minute tape is a sliver and the gap between two of them is
    // less than the one pixel the lane was just given. An hour is a window you
    // can read: it holds roughly ten recordings at a width where each is a
    // block rather than a line.
    // ⚠️ ANCHORED AT THE START, not centred on the playhead. The page opens at
    // the beginning of the first tape, so the hour a visitor is given is the
    // first hour, and the strip pans from there.
````

<a id="tapes-17"></a>
## tapes-17: demo/tapes/index.html, inline script, line 302

````js
  /**
   * 🔴 THE PICTURE OPENS ON THE WHOLE RUN AND CLOSES ITSELF ONTO AN HOUR, AND
   * THEN SLIDES ALONG WITH THE TAPE. Asked for as *"selfmiving zoom"*.
   *
   * Two things a still picture could not say. The first is HOW MUCH THERE IS:
   * arriving already zoomed to an hour, a visitor sees ten blocks and no reason
   * to believe there are fourteen more off the right edge. Starting at the whole
   * two and a half hours and closing onto the first hour says the size of the
   * thing and where you have been put in it, in one movement, without a word.
   * The second is WHERE THE TAPE HAS GOT TO: an hour-wide window over a run this
   * long is left behind within minutes, and a playhead that walks off the right
   * edge is a picture that has stopped being about what you are hearing.
   *
   * ⚠️ IT STOPS THE INSTANT SOMEBODY TOUCHES THE STRIP. `viewOwned` is set by a
   * TRUSTED pointer press, so the page never argues with a hand: this is the
   * rule `timeline/strip.mjs` writes down for its own follow mode, where an
   * earlier demo re-centred every frame and fought the user.
   *
   * ⚠️ THE SPAN IS EASED GEOMETRICALLY, NOT LINEARLY. A zoom from 150 minutes to
   * 60 is a ratio rather than a difference, and a linear ramp of the width
   * crawls at the wide end and then snaps: the same reason a fader is not linear
   * in amplitude. Interpolating the logarithm gives a constant rate of zoom,
   * which is what the eye reads as one smooth movement.
   */
````

<a id="tapes-18"></a>
## tapes-18: demo/tapes/index.html, inline script, line 327

````js
  // 🔴 LEFT OF CENTRE, AND THE NUMBER IS `strip.mjs`'S OWN. What a reader wants
  // from a timeline is mostly what is AHEAD, so centring the playhead spends
  // half the window on tape already heard.
````

<a id="tapes-19"></a>
## tapes-19: demo/tapes/index.html, inline script, line 352

````js
    // ⚠️ CLAMPED TO THE RUN AT BOTH ENDS. Time before the first tape is time
    // nothing can be in, and a window hanging off the far end is the same
    // mistake mirrored: `frame()` in the library puts a moment at 38% ACROSS
    // the view, which at position nought is 38% of an hour of nothing.
````

<a id="tapes-20"></a>
## tapes-20: demo/tapes/index.html, inline script, line 358

````js
    // 🔴 AND IT DOES NOTHING WHEN IT WOULD CHANGE NOTHING. `fit()` invalidates
    // the strip, so calling it every frame over a stopped tape is a canvas
    // redrawing sixty times a second to draw the same picture: a page sitting
    // idle in a background tab with a fan on. Half a pixel is the smallest
    // movement anybody could see.
````

<a id="tapes-21"></a>
## tapes-21: demo/tapes/index.html, inline script, line 390

````js
  /**
   * Finish the opening move now, for a check that has to read a settled view.
   * ⚠️ IT IS NOT A SHORTCUT PAST THE ANIMATION: `zoomSaw` still holds every span
   * it passed through, so the claim that it MOVED is graded on what happened
   * rather than on what this function did.
   */
````

<a id="tapes-22"></a>
## tapes-22: demo/tapes/index.html, inline script, line 403

````js
  /**
   * 🔴 THE LENGTHS ARE IN THE CORPUS NOW, AND THIS PAGE ASKS NOBODY FOR THEM.
   * Asked as *"do measure file lengths gently and write to corpus and use
   * them"*. `demo/resources/measure-durations.mjs` asks each file once, ever,
   * with ffprobe, two seconds apart, reading the header rather than the
   * recording; `build-corpus.mjs` writes the answer into `corpus.json` as
   * `durationMs`. So a visitor arriving here costs those hosts NOTHING and the
   * run is drawn at its real length in the first frame.
   *
   * ⚠️ WHAT THIS REPLACED WAS NOT WRONG, IT WAS EXPENSIVE AND LATE. The page
   * opened twenty-four media elements at `preload = 'metadata'` and corrected
   * the picture as the answers arrived over the following seconds, so every
   * visit was twenty-four requests to archive.org and every visit began with a
   * run of the wrong length. The measurement is the same measurement; it is
   * made once by a program instead of once per visitor.
   */
````

<a id="tapes-23"></a>
## tapes-23: demo/tapes/index.html, inline script, line 429

````js
  /**
   * Ask the files the corpus has no length for, ONE AT A TIME.
   *
   * ⚠️ IT IS A FALLBACK AND IT RUNS FOR NOBODY ON AN ORDINARY VISIT: every
   * recording in the corpus has a measured length, so this loop finds nothing to
   * do. It stays because a corpus rebuilt without the durations step would
   * otherwise silently draw a run of guesses, and a page that can still answer
   * the question itself is better than one that cannot.
   * ⚠️ ONE AT A TIME RATHER THAN FOUR, which is the `gently` in the ask: four
   * parallel probes to one host is the burst this repo has already been asked
   * twice not to make.
   * ⚠️ AND IT IS NOT AWAITED BY THE PAGE. A host that never answers must cost a
   * tape its exact width and nothing else: no wait, no spinner, no blocked load.
   */
````

<a id="tapes-24"></a>
## tapes-24: demo/tapes/index.html, inline script, line 470

````js
  /**
   * 🔴 TWO DECKS, AND THEY ARE TWO DIFFERENT KINDS OF TIME.
   *
   * `mapDeck` is 1890 to 2027 — where in HISTORY you are looking. `tapeDeck` is
   * nought to the length of one recording — where in THE TAPE you are. They are
   * not two views of one quantity and pretending otherwise is how a page ends
   * up with a playhead that means something different depending on which half
   * you look at.
   *
   * 🔴 AND ONLY ONE OF THEM PLAYS, WHICH IS WHY THE MAP HAS NO PLAYHEAD ON IT.
   * It used to have one, moved to the year of whatever record was loaded, and
   * it was read the way a playhead is read everywhere else. The report was
   * *"tapes timeline makes no sense. am i listening all tapes on same day
   * together?"*. A sweeping line over eleven parallel bars says those bars play
   * together, and this page's bars are twenty-three separate recordings of
   * which exactly one is loaded.
   *
   * 🔴 AND THE PLAYHEAD IS BACK, BECAUSE THE AXIS CHANGED UNDER IT. It was
   * taken off when the axis was 1890 to 2027: a line sweeping a century over
   * eleven parallel bars says those bars play together, and they did not. Laid
   * END TO END there is one thing playing and one place it has got to, which is
   * exactly what a playhead means everywhere else. The loaded tape is still
   * ringed, because a playhead says where you are and the ring says which of
   * the twenty-three you are in.
   *
   * ⚠️ `absolute: false` NOW, AND IT IS STILL DECLARED RATHER THAN INFERRED.
   * The strip guesses an absolute wall-clock domain from `range[0] > 1e12`, and
   * this axis starts at nought, so the guess would be right by accident. It is
   * written down because the guess was WRONG for the axis this replaced, where
   * 1890 is a negative number of milliseconds, and a page that relies on a
   * guess being right is a page that breaks when its range moves.
   */
````

<a id="tapes-25"></a>
## tapes-25: demo/tapes/index.html, inline script, line 511

````js
  /**
   * 🔴 `?report=1` — SO THE PAGE CAN SAY WHAT IT DID IN A BROWSER I CANNOT
   * ATTACH TO. Play-on-load has now been reported four times and measured
   * green three times: headless Chrome under a real autoplay policy reaches
   * `20/20` with the speakers at 0.0000, including with a trusted click during
   * load. Something on the reporting machine differs and no amount of reading
   * this file will say what.
   * So it ships the four numbers that decide it, every half second for the
   * first fifteen seconds: whether a person has pressed, whether the page is
   * still grading itself, what the element is doing, and the gain the tape
   * actually comes out through. Read it back at
   * https://pub.positron.studio/logs?format=text
   * ⚠️ OFF UNLESS ASKED, because every visitor posting into a shared ring
   * buffer pushes out the one report somebody is waiting for.
   */
````

<a id="tapes-26"></a>
## tapes-26: demo/tapes/index.html, inline script, line 526

````js
  /**
   * 🔴 THE CHECKS BELOW LOAD A TAPE AND PLAY IT, SO THEY DO NOT RUN FOR A
   * VISITOR. REPORTED AGAINST THE DEPLOY, 2026-09-16: *"tapes still does some
   * loading and playback on page load"*, with the page's own log as the
   * evidence — `0.48 On-Off is loaded`, `1.00 looping 0.4 s of On-Off`,
   * `1.35 back to the tape`, `2.57 ready · 25/25 checks`. Somebody who opens
   * this page is handed a recording they did not ask for, fetched from
   * archive.org, played, looped four ways and stopped again, all inside three
   * seconds.
   *
   * 🔴 AND THE PREVIOUS TWO REPAIRS WERE BOTH REAL AND BOTH ABOUT SOMETHING
   * ELSE, which is why this was reported three times. One shut the SOUND gate,
   * so nothing reached the speakers; the other took out twenty-four
   * `preload = 'metadata'` probes, so the widths came off the corpus instead.
   * Neither touched the checks, and the checks are what opens a file. A page
   * can be inaudible, ask nobody for a duration, and still spend a visitor's
   * bandwidth on a 12 MB recording while its transport runs on its own.
   *
   * `/archive/radio/` and `/crate/` already answer this the same way and for the same
   * reason: a self-check that works the instrument cannot be scheduled into
   * being harmless, it has to not run. `demo/verify.mjs` appends `selfcheck=1`
   * to every demo it opens, so the suite still grades everything.
   *
   * ⚠️ A VISIT ASSERTS A STRICT SUBSET, and that is deliberate rather than a
   * shortfall. Everything that can be graded from the corpus and the picture
   * still runs for everybody: the run, the tiling, the widths, the zoom, the
   * drawn height, and the sound gate itself. What a visit cannot grade is
   * anything that needs a recording to be moving.
   */
````

<a id="tapes-27"></a>
## tapes-27: demo/tapes/index.html, inline script, line 562

````js
// 🔴 `/log`, SINGULAR. `/logs` is the READ path and a POST to it is
````

<a id="tapes-28"></a>
## tapes-28: demo/tapes/index.html, inline script, line 563

````js
      // accepted and thrown away, so the page reported faithfully into a
      // hole and the reader saw `(nothing reported)` — which reads as "the
      // page never sent anything", the exact failure CLAUDE.md records
      // against this endpoint.
````

<a id="tapes-29"></a>
## tapes-29: demo/tapes/index.html, inline script, line 588

````js
  /**
   * ⚠️ `anonymous` IS FOR THE PICTURE, NOT FOR THE SOUND, and it can cost the
   * sound. A cross-origin element plays perfectly well without it; what it buys
   * is a graph the analyser may read, and what it costs is that a host which
   * does not send `access-control-allow-origin` on THIS object refuses the
   * request outright. So it is tried, and `retryOpen()` below drops it and
   * reloads rather than leaving a tape unplayable for the sake of a waveform.
   */
````

<a id="tapes-30"></a>
## tapes-30: demo/tapes/index.html, inline script, line 597

````js
  /**
   * 🔴 THE PITCH FOLLOWS THE SPEED, WHICH IS WHAT VARISPEED MEANS.
   *
   * A media element time-stretches by default, so half speed is the same voice
   * at half the tempo. That is the right answer for a podcast and the wrong one
   * for a tape, where half speed is an octave down and always has been. It also
   * decides whether the walk buttons below can be heard at all: a time-stretch
   * at a sixteenth of speed is a mush of grains rather than a machine winding
   * down.
   *
   * ⚠️ SET ONCE, FOR EVERY SPEED, NOT JUST FOR THE ARC. Turning it off only
   * while a reel changes would be inaudible at 1x and an octave jump at any
   * other armed speed, so the same press would sound different depending on
   * what the speed picker happened to be showing. One setting, one sound.
   */
````

<a id="tapes-31"></a>
## tapes-31: demo/tapes/index.html, inline script, line 629

````js
  /**
   * 🔴 THE PAGE SAYS WHAT IT IS DOING BEFORE IT CAN DRAW ANYTHING, ASKED FOR AS
   * *"loading on entry"*.
   *
   * What a visitor met was an empty line, an empty lane and an empty wave for as
   * long as `corpus.json` took: a page that has nothing to say looks exactly
   * like a page that is broken, and this one cannot draw a single bar until the
   * list has arrived. The line is the same fixed-height box the tape's name goes
   * in afterwards, so nothing moves when it is replaced.
   * ⚠️ IT IS A SENTENCE, NOT A SPINNER. A spinner says something is happening
   * and nothing about what; this names the thing being waited for, which is the
   * only part a reader could act on.
   */
````

<a id="tapes-32"></a>
## tapes-32: demo/tapes/index.html, inline script, line 646

````js
  /**
   * 🔴 ONE LANE, DECLARED WHERE EVERY OTHER TIMELINE DEMO DECLARES IT.
   *
   * This page had grown its own layer: a `LANES` table, a `buildLanes()` that
   * rebuilt the lane from it, a `packRows` greedy packer for sub-rows, and a
   * `setLanes` call to install the result. Every piece of that was the answer to
   * the OLD picture, where twenty-four records sat on a century and thirteen of
   * them had year-wide dates that overlapped. Laid end to end nothing overlaps,
   * so the packer packs one row, the table has one entry and the rebuild
   * rebuilds a constant.
   *
   * `/loops/` is the shape: lanes declared on `createStripView`, `as: 'spans'`,
   * `stack: false`, and a `durMs` on the payload so a row is a thing with a
   * length. Same library, same three options, and no machinery in between.
   */
````

<a id="tapes-33"></a>
## tapes-33: demo/tapes/index.html, inline script, line 668

````js
    // 🔴 TWICE THE LANE, THE SAME TAPE. ASKED THREE TIMES. `barH` is
    // `height - barPad * 2` when nothing stacks, so raising the height alone
    // makes the blocks twice as tall, which is not what was asked for: the
    // request was a taller TIMELINE with the tape blocks where they were.
    // 64 with a pad of 21 is 22 px of tape, the same 22 px as 32 with a pad of
    // 5, and the lane around it has room to be looked at.
````

<a id="tapes-34"></a>
## tapes-34: demo/tapes/index.html, inline script, line 676

````js
    // 🔴 ONE PIXEL, AND IT WENT IN AT THREE. Asked as *"reduce space between
    // tapes to 1px"* and shipped as `barGap: 3` in the same commit, which is
    // the shape of mistake nothing catches: there was no gap at all before, so
    // three read as an improvement rather than as the wrong number. `strip.mjs`
    // takes the inset off the right edge in CSS pixels, so this IS the space a
    // reader sees between two tapes laid end to end.
````

<a id="tapes-35"></a>
## tapes-35: demo/tapes/index.html, inline script, line 688

````js
      // ⚠️ `durMs` ON THE PAYLOAD, AND NOT A `when`. `spansOf` reads
      // `payload.when` BEFORE anything else and returns the moment it finds
      // one, so a record's historical date silently won over this page's
      // layout: the bars were drawn from dates on an axis of minutes, which is
      // also where the feathered edges and bracket terminators came from, since
      // that is how a vague date is drawn. The date is still on `it` for the
      // hover, which is where a date belongs now.
````

<a id="tapes-36"></a>
## tapes-36: demo/tapes/index.html, inline script, line 709

````js
    /**
     * 🔴 THE NAME ON THE TAPE, AND THE THRESHOLD WAS SUPPRESSING EVERY ONE.
     * It was `bw >= 110`, carried over from the old picture where a bar could
     * be a decade wide. MEASURED on the real canvas at the zoom a visitor
     * arrives at: a six minute tape is 79 px, so the test was false for all
     * twenty-four and the lane drew nameless blocks. REPORTED as exactly that.
     *
     * ⚠️ IT CUTS TO FIT RATHER THAN VANISHING. The old rule was that a fragment
     * of a name reads as a different word, which is true of a fragment and not
     * of a name with an ellipsis on it: one says `Antropoi` and the other says
     * `Antropoi…`, and only the first can be mistaken for a word. Under about
     * five characters there is nothing to cut down to, so it goes.
     */
````

<a id="tapes-37"></a>
## tapes-37: demo/tapes/index.html, inline script, line 728

````js
    // ⚠️ THE REST ARE DIMMED LESS THAN THE LIBRARY'S DEFAULT. 0.5 is right on a
    // lane where the dimmed bars are context; here they are the subject, and
    // only one of twenty-three is ever current.
````

<a id="tapes-38"></a>
## tapes-38: demo/tapes/index.html, inline script, line 743

````js
  /**
   * What the lane MEASURED, in its own gutter: how long the whole run is, or how
   * many of its widths are still guesses.
   *
   * 🔴 IT IS WRITTEN TO THE LANE THE STRIP HOLDS, NOT TO THE ONE THIS PAGE
   * DECLARED, AND THAT IS A BUG THIS LINE HAD FROM THE START. `setLanes` COPIES
   * every declaration into a lane of its own, so `tapeLane.subLabel = …` wrote
   * to an object the renderer had stopped reading: MEASURED 2026-09-16,
   * `__strip.lanes()[0].subLabel` was `null` on a loaded page while this
   * function had run. The gutter line promised by the page's own assert
   * (*"Every bar is a guess and the lane says so"*) has never once been on
   * screen.
   *
   * ⚠️ AND IT IS SHORT, BECAUSE A GUTTER IS PAID FOR IN PLOT. `gutterWidthFor`
   * grows the label column to fit the longest sub-label, so `23 tapes, 2h 15m
   * in all` would take about 140 px off a picture that breaks out of the page's
   * own width to get room for the tapes. `2h 15m` says the same thing in six
   * characters and fits the 78 px the gutter already has, which is the same
   * rule a diagram's `sub` follows.
   */
````

<a id="tapes-39"></a>
## tapes-39: demo/tapes/index.html, inline script, line 785

````js
    /**
     * 🔴 A SEEK ON THIS AXIS IS TWO THINGS: WHICH TAPE, AND HOW FAR INTO IT.
     * The run is a line through twenty-three files, so a position on it names
     * one of them and an offset inside it. Loading the right tape and NOT
     * seeking into it would put the playhead somewhere the sound is not.
     */
````

<a id="tapes-40"></a>
## tapes-40: demo/tapes/index.html, inline script, line 791

````js
    /**
     * 🔴 A SEEK ON THIS AXIS IS TWO THINGS: WHICH TAPE, AND HOW FAR INTO IT.
     * The run is a line through twenty-three files, so a position on it names
     * one of them and an offset inside it. Loading the right tape and NOT
     * seeking into it would put the playhead somewhere the sound is not.
     *
     * ⚠️ AND THE TRANSPORT BELOW HAS TO FOLLOW, which is the half that was
     * missing. The bar reads `tapeDeck`, so a scrub that moved the element and
     * left the deck behind gave two pictures of one position disagreeing with
     * each other: the strip where you dragged to, the bar where it used to be.
     * Both are told, in that order, every time.
     */
````

<a id="tapes-41"></a>
## tapes-41: demo/tapes/index.html, inline script, line 803

````js
    /**
     * 🔴 THE PLAYHEAD MOVES WHILE YOU DRAG. THE TAPE IS LOADED WHEN YOU STOP.
     *
     * `onSeek` fires continuously through a drag, and loading on every call set
     * `audio.src` once per tape crossed: each one tears the element down and
     * builds it again, so dragging across the run made the lane flash. REPORTED
     * as the tape blinking while scrubbing, and it is the same thing a hardware
     * transport does by not doing it: you spin the reel and the machine picks up
     * where you let go.
     *
     * ⚠️ THE DECK IS STILL TOLD AT ONCE, EVERY TIME. Deferring the picture as
     * well would be a scrub with no feedback, which is worse than a flash. What
     * is deferred is exactly the expensive irreversible half.
     */
````

<a id="tapes-42"></a>
## tapes-42: demo/tapes/index.html, inline script, line 842

````js
  /**
   * PRESS A MARK TO LOAD THAT TAPE. The tooltip has said `press to hear it`
   * since the page was written and nothing was listening.
   *
   * ⚠️ A PRESS, NOT A DRAG. The strip's own pointer stream is its business
   * (pan, pinch, tap-to-inspect), so this reads the hit IT resolved rather than
   * doing its own geometry: `hover()` holds the span under the pointer on a
   * mouse move and on a finger's tap, and by `pointerup` the strip has already
   * decided. A movement over six pixels is somebody panning the century, and
   * loading a different recording under their finger is the last thing they
   * asked for.
   */
````

<a id="tapes-43"></a>
## tapes-43: demo/tapes/index.html, inline script, line 867

````js
  /**
   * A lane is a KIND of thing, and the mark's shape is the date's honesty.
   *
   * 🔴 THE CORPUS'S `when` IS ALREADY THE STRIP'S `when`, which is why this is
   * six lines rather than a renderer. `{earliest, latest, edtf}` is exactly what
   * `whenOf()` reads, so a record dated `195X` arrives as a decade-wide bar and
   * one dated `1975-06-30` as a tick, with no code here deciding that. MEASURED
   * off the corpus: 85 rows know their day, 112 know only their year, 48 only
   * their decade and 25 span longer than that. Drawn as points, a third of this
   * archive would have been asserted to have happened on the 1st of January.
   *
   * ⚠️ 59 ROWS HAVE NO DATE AT ALL and cannot be on an axis. They are counted in
   * each lane's gutter rather than dropped, because a silent truncation reads as
   * "there were none".
   */
````

<a id="tapes-44"></a>
## tapes-44: demo/tapes/index.html, inline script, line 882

````js
  /**
   * 🔴 ONE LANE, AND THE OTHER FIVE WERE DELETED ON PURPOSE — WRITE THIS DOWN.
   * There were six: `his life` (3), `films & records` (86), `instruments` (3),
   * `papers & photographs` (204) and `the archive itself` (14) sat above and
   * below this one. At the zoom this page is actually read at — about a year
   * across — five of them are a wall of bars nobody can open, because only the
   * playable ones do anything when you press them. A lane you cannot act on,
   * beside one you can, teaches a reader that pressing does nothing.
   *
   * ⚠️ THE RECORDS ARE NOT GONE AND NOTHING WAS FILTERED OUT OF THE CORPUS.
   * `/resources/` still tabulates all 334 and `corpus.json` is untouched; what
   * changed is which of them this page draws. **An every-material timeline is
   * wanted and is a separate page** — it needs its own answer to what a mark
   * means when there is nothing to play, and borrowing this page's answer is
   * how it would get one by accident.
   */
````

<a id="tapes-45"></a>
## tapes-45: demo/tapes/index.html, inline script, line 898

````js
  /**
   * 🔴 THE LOOPER IS THE ONE `/archive/radio/` HAS, AND IT IS A MODULE NOW. Asked for as
   * *"make it use same looping ui as radio (make it global)"*. LOOP keeps the
   * lap you are hearing; the button glued to its right plays that lap forwards,
   * backwards, or there and back. `demo/shell/looper.mjs` owns all of it, so the
   * two pages are one instrument rather than two.
   *
   * 🔴 IT KEEPS THE SOUND RATHER THAN SEEKING THE TAPE, and that is the whole
   * reason a direction is possible at all. A media element has no negative
   * speed: a page can loop a file by seeking back to the start, which is what
   * this did, and there is no arrangement of seeks that plays a recording
   * backwards. A kept lap is an `AudioBuffer`, and a mirrored copy of one plays
   * exactly as well as the original.
   *
   * ⚠️ THE FIRST LAP COMES OFF THE TAPE AND EVERY LAP AFTER IT COMES OFF THE
   * RING, which is why nothing is heard to change at the first press. The bar
   * marks the loop, the tape plays it once while the ring fills, and at the wrap
   * the page takes the tape down and puts the kept seconds up in its place. On
   * `/archive/radio/` the same two moments are `fill` and `set`, because there the sound
   * has not arrived yet.
   *
   * ⚠️ 30 SECONDS, WHICH IS A PROMISE THE PAGE CAN KEEP. Stereo at 48 kHz is
   * 11.5 MB of ring, and a loop marked longer than this is refused IN WORDS on
   * the button rather than quietly kept from the wrong end.
   */
````

<a id="tapes-46"></a>
## tapes-46: demo/tapes/index.html, inline script, line 926

````js
  // ── the sound ───────────────────────────────────────────────────────────
  // ⚠️ A SCROLLING WAVEFORM OF WHAT IS COMING OUT, not a drawing of the whole
  // file. Drawing the file means fetching and decoding all of it — 225 MB for
  // the largest thing here — before a single sample is heard, and the picture
  // would then be of something nobody is listening to yet. This is the same
  // `feed()` path `/archive/radio/` uses, with no grains because there is no
  // granulator on this page.
  // 🔴 IT FREEZES ON A LOOP AGAIN, BECAUSE WHAT A LOOP IS HERE HAS CHANGED.
  // `freezeOnLoop: false` was right for a loop made of seeks: the tape really
  // was still playing, so a picture that stopped was claiming a silence that did
  // not happen, and it was reported as *"visualization just stops on looping
  // tapes"*. The lap is KEPT now. It is a fixed piece of sound, the two marks
  // say where it is in the last eight seconds, and a line crosses it in the
  // direction the lap is actually running: *"keep x scale the same, just stop
  // the viz and move loop playhead"*, which is the other thing that was asked
  // for, about the same picture.
````

<a id="tapes-47"></a>
## tapes-47: demo/tapes/index.html, inline script, line 944

````js
  // ⚠️ THE ONE GESTURE THAT OPENS THE GATE, AND IT LISTENS FOR `isTrusted`.
  // `verify.mjs` drives this page with `element.click()`, which produces an
  // untrusted event: so the harness still presses the real button and still
  // cannot make the page audible, which is exactly the split wanted. A person's
  // finger is trusted and opens it.
  // Registered after the bar exists, in the CAPTURE phase, so it runs before
  // the bar's own handler and `start()` sees the gate already open.
````

<a id="tapes-48"></a>
## tapes-48: demo/tapes/index.html, inline script, line 958

````js
    /**
     * 🔴 AND THE SPACE BAR, WHICH IS THE SAME PRESS BY ANOTHER ROUTE.
     * `transport-bar.mjs` registers its key handler on the WINDOW, so space
     * plays the tape from anywhere on the page while this gate stayed shut: the
     * transport visibly ran and nothing came out, which is a page that looks
     * like it is playing and is silent. The bar's own handler ignores text
     * fields and so does this, or typing a space in the feedback box would
     * count as pressing play.
     */
````

<a id="tapes-49"></a>
## tapes-49: demo/tapes/index.html, inline script, line 979

````js
  /**
   * 🔴 NOTHING LEAVES THIS PAGE UNTIL SOMEBODY ASKS FOR IT, AND THE GATE IS A
   * GAIN NODE RATHER THAN A FLAG.
   *
   * REPORTED: a blip of sound on load. The cause is the load check at the
   * bottom of this file, which plays nine hundred milliseconds of tape to prove
   * the playhead follows the sound — and it was playing it out loud, from
   * wherever the loop check had last sent the playhead, on any browser that
   * allows a page to start on its own. The page had never said it was allowed
   * to be heard.
   *
   * ⚠️ NOT `audio.muted`, AND NOT A DISCONNECTED OUTPUT. Muting the element
   * would be a claim about what a media element hands a Web Audio graph, which
   * is one more thing to be right about; declining to connect the output would
   * change the graph between the checked state and the real one. One gain node
   * in the same place always, opened by the press that asks for sound.
   *
   * ⚠️ AND "SOMEBODY ASKED" IS NOT THE SAME AS `command.play`. The checks at the
   * bottom of this file drive the REAL controls, which is what makes them worth
   * running: the loop check presses LOOP three times and the middle press
   * plays. So while the page is still checking itself there is nobody to have
   * asked, and it is somebody the moment one touches the page.
   */
````

<a id="tapes-50"></a>
## tapes-50: demo/tapes/index.html, inline script, line 1002

````js
  /**
   * 🔴 TWO FACTS, NOT ONE, AND CONFLATING THEM IS WHY THIS PAGE PLAYED ON LOAD
   * THREE TIMES. `checking` is whether the page is still grading itself.
   * `asked` is whether a person has pressed play. They were one flag: the gate
   * opened when the checks ENDED, so whatever made the checks end also made the
   * page audible, and the visitor's first press is exactly the thing that did
   * both. MEASURED under a real autoplay policy: the press landed, the gate
   * opened, and the checks then played 245 ms of somebody else's tape at 0.734
   * into the speakers before pausing themselves. Nothing now can open the gate
   * except a press, and the checks ending is not a press.
   */
````

<a id="tapes-51"></a>
## tapes-51: demo/tapes/index.html, inline script, line 1019

````js
  /**
   * 🔴 "SOMEBODY ASKED" MEANS THEY PRESSED PLAY, NOT THAT THEY TOUCHED THE PAGE.
   *
   * This used to open on the first `pointerdown` or `keydown` ANYWHERE, and that
   * is what was reported as the page playing on load and then stopping: a click
   * to bring the window forward, or on the strip, or anywhere at all, both
   * satisfied the browser's autoplay rule AND opened this gate, while the
   * checks were still pressing the real buttons. So the one gesture that made
   * sound possible was also the one that stopped it being held back, and a
   * visitor heard a second of somebody else's tape for clicking on a picture.
   *
   * ⚠️ AND NOT `command.play` EITHER, because the checks call that too. What
   * opens the gate is the PLAY BUTTON being pressed by a person, and the checks
   * finishing. Nothing else.
   * ⚠️ THE SENTENCE ABOVE WAS TRUE OF THE COMMENT AND FALSE OF THE CODE for a
   * session: the listener was on the whole transport row. See `fromPlayButton`.
   */
````

<a id="tapes-52"></a>
## tapes-52: demo/tapes/index.html, inline script, line 1036

````js
  /**
   * 🔴 IS THIS PRESS ON THE PLAY BUTTON? A PURE FUNCTION OF THE TARGET, AND IT
   * IS PUBLISHED SO A CHECK CAN GRADE THE ROUTING WITHOUT A REAL FINGER.
   *
   * The listener below was on `bar.el`, which is the WHOLE TRANSPORT ROW: the
   * scrub slider, the rate buttons, LOOP and the walk buttons all opened the
   * gate, and the comment above claimed it was the transport's own button. So a
   * visitor who dragged the scrub bar during the self-check had `asked` set, and
   * the `if (asked) start()` at hand-over then played the page at them a few
   * seconds later, unasked. That is the third and fourth report of play on load,
   * with the first two fixes sitting correctly in place above it.
   *
   * ⚠️ `isTrusted` IS STILL THE OTHER HALF AND IS CHECKED SEPARATELY. Splitting
   * them is what makes this testable: no page can forge a trusted event, so a
   * check that could only drive the whole handler could never grade which
   * controls are wired. It can grade this.
   */
````

<a id="tapes-53"></a>
## tapes-53: demo/tapes/index.html, inline script, line 1055

````js
  /**
   * What the button was SHOWING when it was pressed, which is what the person
   * saw. `playing` means the press they just made was a pause, so hand-over
   * must not start anything; anything else means they asked for sound.
   */
````

<a id="tapes-54"></a>
## tapes-54: demo/tapes/index.html, inline script, line 1085

````js
    // THE SPEAKERS' OWN ANALYSER, on the far side of the gate. The first one
    // says what the tape is doing and draws the picture; this one says what is
    // leaving the page. The gap between the two numbers is the only evidence
    // the gate is shut, and a page that measured the sound only before the gate
    // could report a healthy level while shouting.
````

<a id="tapes-55"></a>
## tapes-55: demo/tapes/index.html, inline script, line 650

````js
    /**
     * 🔴 THE TAPE'S OWN WAY IN, SO IT CAN BE TAKEN DOWN WITHOUT TOUCHING THE
     * GATE. While a loop plays, what you hear is the kept seconds and not the
     * file, so the file has to stop being heard. Writing to `out` would move the
     * gain the sound gate owns, and the next `setAudible` would put the tape
     * back underneath the loop. Two gains, one job each, which is the same split
     * `/archive/radio/` draws between its fader and its live path.
     */
````

<a id="tapes-56"></a>
## tapes-56: demo/tapes/index.html, inline script, line 664

````js
    /**
     * ⚠️ IT TAPS `liveIn` AND PLAYS BACK INTO `analyser`, WHICH IS NOT A CIRCLE.
     * The ring is filled from upstream of the analyser and the kept seconds are
     * put back downstream of that tap, so a loop is never a recording of itself.
     * Everything after the analyser then gets the loop for free: the wave is
     * drawn from it, the gate gates it, and the meter that says what left the
     * page measures it.
     */
````

<a id="tapes-57"></a>
## tapes-57: demo/tapes/index.html, inline script, line 675

````js
  /**
   * 🔴 RESUME BEFORE PLAY, AND AWAIT IT. Routing a media element through an
   * AudioContext makes the GRAPH drive it, so a suspended context is an element
   * whose `currentTime` does not advance — playing, by every visible sign, and
   * standing still. That is this repo's "never let sound gate the work" from the
   * other side: not a hang waiting for a gesture, but a transport that reads
   * zero while the page looks fine. `resume()` returns a promise and firing it
   * without waiting is the same bug one tick later.
   *
   * 🔴 AND `play()` IS FIRED, NEVER AWAITED, WHICH IS THE OTHER HALF OF THE
   * SAME RULE AND WAS THIS PAGE'S WHOLE `__demo.ready` FLAKE. Its promise does
   * not settle when playing is ALLOWED, it settles when the decoder has
   * actually started — so on somebody else's file it is a network wait with no
   * deadline on it. MEASURED: 1.1 s on a warm run and 5.9 s on a cold one, and
   * awaited TWICE, once by the loop check's own press of LOOP and once by the
   * check at the foot of this file. CLAUDE.md puts it in one line: sound is
   * allowed to be late, the timeline is not. What the checks want to know is
   * whether the TAPE moved, and they wait for that instead.
   */
````

<a id="tapes-58"></a>
## tapes-58: demo/tapes/index.html, inline script, line 695

````js
    /**
     * 🔴 THE FILE IS OPENED HERE, ON THE FIRST PRESS, AND NOWHERE EARLIER.
     * `select(0, { load: false })` names the first tape and leaves the element
     * empty, so this is the moment a visitor's browser first asks archive.org
     * for anything. Everything above it — the run, the widths, the strip, the
     * transport's travel — came off the corpus and cost nobody a byte.
     * ⚠️ IT IS IDEMPOTENT AND IT MUST BE: `start()` is called by the play
     * button, by a mark press and by the checks, and re-assigning `src` to the
     * file already loaded would throw the buffer away and reset the clock under
     * whoever is reading it.
     */
````

<a id="tapes-59"></a>
## tapes-59: demo/tapes/index.html, inline script, line 712

````js
    // 🔴 FIRED, NEVER AWAITED, AND THE HEADER ABOVE HAD IT EXACTLY BACKWARDS.
    // `resume()` does not reject when a browser will not start audio yet: it
    // stays PENDING until a gesture arrives, so awaiting it is a hang and not
    // an error. MEASURED under a real autoplay policy: the page sat at
    // `checking: true` and never became ready from 3.2 s to 9.6 s, and the
    // whole tail of this file ran at the instant a finger touched the
    // transport. That is this repo's "never let sound gate the work" in the
    // plainest form there is. The graph catches up when it is allowed to; the
    // page does not wait for it.
````

<a id="tapes-60"></a>
## tapes-60: demo/tapes/index.html, inline script, line 725

````js
  /**
   * Wait until the tape has moved `ms` of its own time, or give up at `capMs`.
   *
   * 🔴 THE QUANTITY IN QUESTION, WHICH IS NOT THE ONE A SLEEP MEASURES. A fixed
   * wait buys a tape that has demonstrably RUN only if the sound started at
   * once, and awaiting `play()` buys it at whatever price the network names.
   * This asks how far the recording actually got, and gives up at a deadline
   * rather than hanging, so a slow host costs a named failure instead of a page
   * that never becomes ready.
   */
````

<a id="tapes-61"></a>
## tapes-61: demo/tapes/index.html, inline script, line 747

````js
  /**
   * 🔴 `mediaMaster` DOES NOT RUN ITSELF, AND NOTHING SAYS SO LOUDLY. Its header
   * shows the caller's loop on its second line — `function loop() {
   * requestAnimationFrame(loop); mm.tick(); }` — and without it the object is
   * constructed, holds a deck, listens to nothing that matters, and the deck
   * never moves. MEASURED with a CDP probe after the harness pressed play:
   * `paused false · currentTime 2.395 · deck 0`. The sound was fine the whole
   * time; the page had simply never asked the master to look.
   *
   * ⚠️ AND IT IS ONE LOOP, NOT THREE. The picture, the level and the master all
   * want a frame, and three `requestAnimationFrame` chains reading the same
   * analyser is three copies of one measurement that can disagree about which
   * frame they are in.
   */
````

<a id="tapes-62"></a>
## tapes-62: demo/tapes/index.html, inline script, line 761

````js
  /**
   * 🔴 WHILE A LOOP IS RUNNING THE PICTURE STOPS SCROLLING AND BECOMES THE LOOP.
   *
   * Asked directly: *why not waveform go back and forth on looping as in DAWs?*
   * Because the scope was showing ARRIVAL TIME — the last few seconds of what
   * came out, sliding left — and on that axis a loop can only ever be a mark
   * where it came round, which is what it was. That is the honest picture for a
   * live station, where there is no file and no end. It is the wrong one here:
   * a tape is a file with a length, a loop inside it is a fixed piece of sound,
   * and a person who has just marked one wants to watch the playhead cross it.
   *
   * ⚠️ THE LOOP'S OWN AUDIO, NOT THE FILE'S. `grain-scope`'s header refuses to
   * draw a whole file and is right to — the largest thing here is 225 MB and
   * drawing it means fetching all of it before a single sample is heard. A loop
   * is bounded by the two marks somebody just made, so the first pass through it
   * fills the peaks and every pass after that draws them. It costs the loop's
   * own length and nothing else, and the picture appears exactly when it can be
   * true.
   *
   * ⚠️ AND THE BINS ARE THE PICTURE'S, NOT THE SOUND'S. One column per pixel-ish
   * is all a 380 px canvas can show; asking for more is measuring something
   * nobody can see.
   */
````

<a id="tapes-63"></a>
## tapes-63: demo/tapes/index.html, inline script, line 784

````js
  /**
   * 🔴 WHAT IS KEPT, AND WHEN. The bar marks the two ends; this page keeps the
   * first lap as the tape plays it, and from the second lap on you are hearing
   * the ring rather than the file.
   *
   * ⚠️ ONE WRAP CLOSES IT AND THE REST ARE IGNORED. The bar goes on looping the
   * now silent tape and reports every time it comes round, so without this the
   * page would rebuild the loop from a fresh ring once a lap.
   */
````

<a id="tapes-64"></a>
## tapes-64: demo/tapes/index.html, inline script, line 802

````js
      /**
       * 🔴 A LOOP LONGER THAN THE RING IS REFUSED IN WORDS, NOT SILENTLY KEPT
       * FROM THE WRONG END. Keeping the last thirty seconds of a two minute loop
       * would put a band on the picture four times the length of the sound
       * coming out of it, which is a page disagreeing with itself rather than a
       * limitation. The tape still loops, off the file, forwards: what is lost
       * is the direction, and the button says so on its own face.
       */
````

<a id="tapes-65"></a>
## tapes-65: demo/tapes/index.html, inline script, line 810

````js
      // The reason lives on the control's own face, where somebody who pressed
      // it is already looking. The log line that repeated it went 2026-09-16 on
      // instruction: *"rm all loop messages."*.
````

<a id="tapes-66"></a>
## tapes-66: demo/tapes/index.html, inline script, line 850

````js
    // The wind-down rides this loop rather than starting one of its own: three
    // rAF chains reading the same clock is three copies of one measurement that
    // can disagree about which frame they are in. The opening zoom and the
    // window that follows the tape ride it for the same reason.
````

<a id="tapes-67"></a>
## tapes-67: demo/tapes/index.html, inline script, line 856

````js
    // 🔴 THE MAP'S PLAYHEAD IS THE TAPE'S POSITION PLUS WHERE THE TAPE SITS.
    // Two decks, one sound: `tapeDeck` counts from nought inside one file, and
    // the run counts from nought across all of them. The map is the second, so
    // it has to be TOLD, every frame, or the line sits at the start of the day
    // while the fourth tape plays.
    // 🔴 AND NOT WHILE A FINGER IS ON IT. This line and the drag were two
    // authorities writing one position: the drag put the head under the finger,
    // the next animation frame put it back where the tape was, and at sixty
    // frames a second that is not a head that lags, it is TWO HEADS FLICKERING.
    // REPORTED twice as exactly that. MEASURED with a trace of every call:
    // `seek 1420974` from the drag interleaved with four `seek 0` from here per
    // pointer move. `landScrub` hands the head back once the tape it landed on
    // has been told where it is, so the two never disagree.
````

<a id="tapes-68"></a>
## tapes-68: demo/tapes/index.html, inline script, line 886

````js
      // 🔴 THE LINE ON THE LOOP IS NOT DRAWN HERE ANY MORE. It was computed
      // from the DECK's position inside the two marks, which was the same thing
      // as the sound right up until a lap could be played backwards, at half
      // speed or a slice at a time. `onLoopPos` on the bar pushes it now, off
      // the voice's own clock, which is the only thing that knows where the
      // SOUND is. The wave goes on being fed either way: while the first lap is
      // being kept it really is still arriving, and once it is kept the scope
      // holds the picture still itself.
````

<a id="tapes-69"></a>
## tapes-69: demo/tapes/index.html, inline script, line 900

````js
  /**
   * Load one tape and point everything at it.
   *
   * ⚠️ THE MAP MOVES TO IT AND THE TAPE RESTARTS, and they are separate
   * sentences. A record with no date cannot be framed, so the log says so
   * rather than the view sitting where it was and implying the year.
   */
````

<a id="tapes-70"></a>
## tapes-70: demo/tapes/index.html, inline script, line 914

````js
    /**
     * 🔴 `load: false` NAMES A TAPE WITHOUT FETCHING IT, AND THAT IS WHAT A
     * COLD VISIT GETS. Pointing the element at `it.file` starts a download of
     * somebody else's 2-to-12 MB recording, and until 2026-09-16 the first one
     * started while the page was still opening: reported as *"tapes still does
     * some loading and playback on page load"*.
     *
     * ⚠️ THE LENGTH STILL COMES FROM THE CORPUS, so nothing about the picture
     * or the transport waits for the file. `measure-durations.mjs` asked every
     * recording once, `corpus.json` carries the answer, and it is the same
     * number `loadedmetadata` would have set here. A transport with a real
     * range over a file that has not been opened is exactly right: the travel
     * of the slider is a statement about the RECORDING, not about what has
     * been downloaded.
     */
````

<a id="tapes-71"></a>
## tapes-71: demo/tapes/index.html, inline script, line 934

````js
    // ⚠️ THE RANGE IS NOT RESET TO NOTHING. It used to go to `[0, 1]` here and
    // wait for `loadedmetadata` — so for as long as the file took to answer,
    // the transport's whole travel was one millisecond and a seek landed at
    // 1 ms whatever you asked for. MEASURED: the harness's `keyboard seek
    // lands` read `0 ~ 1`, which is a slider with nowhere to go rather than a
    // seek that missed. The last known length stands until the new one
    // arrives; `loadedmetadata` corrects it within a second.
````

<a id="tapes-72"></a>
## tapes-72: demo/tapes/index.html, inline script, line 946

````js
    // 🔴 A `focus(it)` CALL STOOD HERE AND WAS NEVER A FUNCTION IN THIS FILE.
    // It framed the strip on the record's year, back when the axis was a
    // century; the framing went with the axis and the CALL did not. A bare name
    // in a module falls through to the global, and the global `focus` is
    // `window.focus` — so every tape change asked the browser to raise this
    // window, silently, with no error anywhere to say a deleted function was
    // still being called. Nothing frames anything now: the whole run is on
    // screen at once, which is the point of laying it end to end.
    //
    // WHICH BAR IS RINGED IS A FACT ABOUT `cur`, and the strip redraws when it
    // is told something changed.
````

<a id="tapes-73"></a>
## tapes-73: demo/tapes/index.html, inline script, line 958

````js
    // ⚠️ SILENT WHILE SCRUBBING. A drag across the run crosses one tape after
    // another, and a line per crossing turns the log into a list of everything
    // your finger went past. The log is for things that HAPPENED; passing over
    // a tape on the way somewhere is not one of them, and the strip is already
    // saying where you are far better than a line of text can.
````

<a id="tapes-74"></a>
## tapes-74: demo/tapes/index.html, inline script, line 977

````js
    // ⚠️ THE ELEMENT AND THE DECK BOTH, for the reason `command.seek` already
    // gives: setting `currentTime` on somebody else's file is a range request
    // that lands when the network says so, and the playhead must not wait for
    // the network to catch up with the hand.
````

<a id="tapes-75"></a>
## tapes-75: demo/tapes/index.html, inline script, line 985

````js
  /**
   * 🔴 VARISPEED WITH INERTIA ON ‹ AND ›: THE TAPE WINDS DOWN AND COMES BACK UP.
   *
   * Asked for in those words. A transport that cuts to the next recording is a
   * playlist; a reel has mass, and changing one is something you hear. So the
   * walk buttons ride an arc: the tape slows to a crawl over `SPIN_DOWN_MS`,
   * the reel is changed at the bottom of it, and the new one is pulled back up
   * to speed over `SPIN_UP_MS`.
   *
   * 🔴 AND SINCE 2026-09-25 IT IS THE MECHANISM FOR THREE TRIGGERS RATHER THAN
   * ONE, ASKED FOR AS *"use varispeed/inertia on rate change and also
   * varispeed/inertia on switching looping modes"*. The same curve, the same
   * floor, the same landing, driven from the same `frame()`:
   *
   *   ‹ ›          wind down, CHANGE THE REEL at the bottom, wind back up
   *   the way →←⇆  wind down, TURN THE LAP ROUND at the bottom, wind back up
   *   a speed      GLIDE from where the machine is to the speed that was armed
   *
   * ⚠️ A SPEED IS A GLIDE AND NOT AN ARC, AND THAT IS NOT A SHORTCUT. The other
   * two have a DISCONTINUITY in the middle: a different file, a different
   * buffer. The bottom of the arc is where that discontinuity is hidden, which
   * is what a wind-down is FOR. Nothing is discontinuous about asking a tape to
   * run at 2x, so a machine that stopped on the way there would be an effect
   * rather than an instrument. One span, one direction, no floor.
   *
   * 🔴 AND THE ARC RIDES THE LOOP AS WELL AS THE TAPE, WHICH IS THE HALF THAT
   * MADE THE MODE TRIGGER POSSIBLE AT ALL. While a loop plays the tape is down
   * and what you are hearing is the ring, so an arc that only moved
   * `audio.playbackRate` would be a wind-down nobody could hear on exactly the
   * press it was asked for. `looper.setRate` is the looper's own published way
   * in, and `onRate` below has always used it for the same reason.
   *
   * 🔴 THE ARC RUNS ON THIS PAGE'S OWN CLOCK AND NEVER WAITS FOR A FILE, WHICH
   * IS THE WHOLE DIFFERENCE BETWEEN INERTIA AND A STALL WEARING ITS CLOTHES. A
   * wind-down whose length is however long archive.org takes is not a machine
   * slowing down, it is a page hanging with a curve drawn on it, and the two
   * are indistinguishable from the outside. Both halves run to a fixed number
   * of milliseconds whatever the network is doing, and they are told apart
   * AFTERWARDS by measurement: `spinReport` compares how much TAPE went past
   * during the climb against how much the rate curve says should have. A reel
   * coming up to speed moves tape. A stall moves the rate and no tape, and the
   * page says so in the log rather than letting a hole in the sound read as the
   * effect working.
   *
   * ⚠️ IT DOES NOTHING WHEN THE PAGE IS STOPPED, ON PURPOSE. Nothing standing
   * still has momentum, so a ramp there is a control that visibly does nothing
   * while costing two thirds of a second before the recording somebody asked
   * for arrives. Stopped, ‹ and › cut straight through, which is also what a
   * stopped machine does when you change its reels.
   * ⚠️ AND THE SAME TEST DECIDES THE OTHER TWO, ASKED OF THE RIGHT THING EACH
   * TIME. A speed glides when the TAPE or the LOOP is running. The way button
   * rides an arc only when a lap is actually being PLAYED: with no loop it is a
   * control that says what the next press of LOOP will do, nothing is moving,
   * and half a second of ramp would be an effect played over silence.
   *
   * ⚠️ A SECOND PRESS RETARGETS, IT DOES NOT RESTART. Two quick presses of ›
   * go two tapes on in ONE arc: the target moves and the curve carries on from
   * where it is. Refusing the second press would be a control that looks live
   * and is inert; restarting the arc would snap the rate back to full speed in
   * the middle of a wind-down, which is a click. A press during the climb turns
   * it back down from the speed it has reached, which is what a reel does.
   */
````

<a id="tapes-76"></a>
## tapes-76: demo/tapes/index.html, inline script, line 1049

````js
  /**
   * 🔴 THE WAY BUTTON'S ARC IS SHORTER THAN THE REEL'S, AND THE REASON IS THE
   * LENGTH OF THE THING IT IS RIDING. A reel change is a whole recording going
   * away and another arriving; a way change turns a lap that is typically under
   * a second round on itself. MEASURED under the harness: the lap that gets
   * kept is 0.51 s, so the reel's 260 ms wind-down would be half of it and the
   * whole climb longer than the lap. 150 and 230 keep the same shape at the
   * scale of the thing being turned.
   * ⚠️ IT IS TWO NUMBERS, NOT A SECOND MECHANISM. Same curve, same floor, same
   * landing, same tick; only the spans differ, and they are per arc rather than
   * per file so a press of one inside the other cannot stretch it.
   */
````

<a id="tapes-77"></a>
## tapes-77: demo/tapes/index.html, inline script, line 1063

````js
  /**
   * 🔴 A GLIDE HAS ONE SPAN BECAUSE IT HAS NO BOTTOM. 320 ms is about what the
   * reel arc takes to reach its floor and start back, so a speed change feels
   * like the same machine without pretending to hide a discontinuity that is
   * not there.
   */
````

<a id="tapes-78"></a>
## tapes-78: demo/tapes/index.html, inline script, line 1070

````js
  /**
   * 🔴 THE FLOOR IS NOT NOUGHT. A media element at rate 0 is a PAUSED element,
   * so an arc that reached it would stop the transport rather than slow it, and
   * a browser stops making sound below about a sixteenth of normal speed
   * anyway. A sixteenth is as near stopped as a tape can get and still be heard
   * stopping.
   */
````

<a id="tapes-79"></a>
## tapes-79: demo/tapes/index.html, inline script, line 1083

````js
  /**
   * WHAT THE PICKER SAYS, READ FROM THE DECK RATHER THAN MIRRORED HERE. The bar
   * paints its armed button from `deck.targetRate()`, so an arc that came home
   * to a copy of that number kept in this file would be one more thing able to
   * disagree with what a visitor is reading. It reads the same source the
   * buttons do.
   */
````

<a id="tapes-80"></a>
## tapes-80: demo/tapes/index.html, inline script, line 1095

````js
  /**
   * 🔴 ONE WRITE FOR THE WHOLE MACHINE, BECAUSE THE TAPE IS NOT ALWAYS THE
   * THING BEING HEARD. While a loop plays the tape is down and the ring is up,
   * so an arc that moved only the element would be inaudible on exactly the
   * press it was asked for, and one that moved only the loop would be silent
   * everywhere else. `looper.setRate` is the looper's own way in and
   * multiplies with `half` rather than fighting it.
   */
````

<a id="tapes-81"></a>
## tapes-81: demo/tapes/index.html, inline script, line 1108

````js
  /**
   * Is there anything with momentum in it? The tape, or a lap coming off the ring.
   * ⚠️ NOT CALLED `rolling`: the loop check below declares a `let rolling` of its
   * own for a measurement of the element, and a helper shadowed inside the one
   * block that talks about the same idea is a trap rather than a name.
   */
````

<a id="tapes-82"></a>
## tapes-82: demo/tapes/index.html, inline script, line 1118

````js
  /**
   * Start the arc, or fold a second press into the one already running.
   *
   * `dir` steps the reel, `ways` presses the way button, and both are counted
   * rather than held as callbacks so that two presses inside one arc compose
   * into one bottom instead of two arcs.
   *
   * ⚠️ A PRESS DURING THE CLIMB TURNS IT BACK DOWN from the speed it has
   * reached, which is what a reel does, and it is also what takes a GLIDE and
   * makes it a wind-down: the glide is abandoned, and the climb comes home to
   * `armedRate()` read fresh, which is the speed the glide was heading for.
   */
````

<a id="tapes-83"></a>
## tapes-83: demo/tapes/index.html, inline script, line 1134

````js
      // ⚠️ THE LONGER PAIR WINS. A way press inside a reel arc must not shorten
      // the reel's wind-down, and a reel press inside a way arc must lengthen
      // it, because what is about to happen at the bottom is the bigger event.
````

<a id="tapes-84"></a>
## tapes-84: demo/tapes/index.html, inline script, line 1158

````js
  /**
   * The button glued to LOOP, which cycles → ← ⇆.
   *
   * ⚠️ IT WRAPS THE LOOPER'S OWN ENTRY RATHER THAN REPLACING IT. `wayExtra()`
   * comes with `onPress` already pointed at `looper.cycle`, and the looper is
   * the one thing that writes the button's face, so a way reached from the
   * code and a way reached by pressing cannot disagree about what is showing.
   * All this does is decide WHEN that press lands.
   * ⚠️ NOTHING PLAYING, NOTHING TO WIND DOWN. With no lap running the button
   * only says what the next press of LOOP will do.
   */
````

<a id="tapes-85"></a>
## tapes-85: demo/tapes/index.html, inline script, line 1174

````js
  /**
   * A speed was armed on the picker. Glide to it.
   *
   * ⚠️ AN ARC ALREADY IN FLIGHT IS LEFT ALONE, and that is the behaviour this
   * page already had: the climb reads `armedRate()` fresh on every frame, so it
   * comes home to the NEW speed with no second curve and no step in the middle
   * of the first one.
   */
````

<a id="tapes-86"></a>
## tapes-86: demo/tapes/index.html, inline script, line 1201

````js
      // The bottom of the arc, where everything discontinuous happens.
      // ⚠️ `play` FOLLOWS WHAT THE PAGE IS DOING NOW, not what it was doing
      // when the button was pressed. Somebody who pressed PAUSE during the
      // wind-down has stopped the machine, and starting it again underneath
      // them because of a press two hundred milliseconds old is the page
      // overruling the newer instruction.
````

<a id="tapes-87"></a>
## tapes-87: demo/tapes/index.html, inline script, line 1209

````js
        // ⚠️ A WALK THAT CAME BACK TO WHERE IT STARTED CHANGES NO REEL. › then ‹
        // inside one arc is a cancelled walk, and re-pointing the element at the
        // file it is already holding would throw away everything buffered and
        // fetch it again to arrive where it already is.
````

<a id="tapes-88"></a>
## tapes-88: demo/tapes/index.html, inline script, line 1215

````js
      // ⚠️ AND THE WAY PRESSES LAND HERE FOR THE SAME REASON THE REEL DOES:
      // `setWay` builds a NEW voice, which is the discontinuity a wind-down
      // exists to put out of earshot. Three presses inside one arc are three
      // cycles at the bottom and one arc, so → ← ⇆ → still comes back to →.
````

<a id="tapes-89"></a>
## tapes-89: demo/tapes/index.html, inline script, line 1221

````js
      // ⚠️ A NEW SOURCE RESETS `playbackRate` TO `defaultPlaybackRate`, which
      // is the armed speed, and a new loop voice starts at whatever rate the
      // looper was last told. Without this line the machine would snap to full
      // speed at the exact moment it is meant to be slowest.
````

<a id="tapes-90"></a>
## tapes-90: demo/tapes/index.html, inline script, line 1235

````js
  /**
   * 🔴 THE ARC ENDS ON EXACTLY WHAT THE PICKER SHOWS, not on whatever the curve
   * last produced. A tape left at 0.997 under a button reading 1 is a page
   * saying one thing and playing another, which is the shape this repo has
   * already paid for once with a readout and a fader disagreeing after a probe
   * moved it.
   */
````

<a id="tapes-91"></a>
## tapes-91: demo/tapes/index.html, inline script, line 1247

````js
    // ⚠️ THE LOOP LANDS TOO, and it is the half that would go unnoticed: the
    // tape's speed is under a button somebody is reading, and a lap left
    // running at 0.997 is only audible.
````

<a id="tapes-92"></a>
## tapes-92: demo/tapes/index.html, inline script, line 1251

````js
    // ⚠️ ONLY A CLIMB IS WORTH REPORTING. A glide has no bottom, so it has no
    // `mediaAt` to measure a climb against, and a report over one would compare
    // the tape against a curve that was never run.
````

<a id="tapes-93"></a>
## tapes-93: demo/tapes/index.html, inline script, line 1257

````js
  /**
   * Was that a reel coming up to speed, or a hole where the next recording had
   * not arrived? The climb runs for a known time along a known curve, so the
   * tape it SHOULD have moved is known too: the mean of an ease-out from the
   * floor to the armed speed is the floor plus two thirds of the climb. What
   * actually went past is read off the element.
   */
````

<a id="tapes-94"></a>
## tapes-94: demo/tapes/index.html, inline script, line 1265

````js
    // ⚠️ THE ARC'S OWN SPAN, NOT THE REEL'S. The way button climbs over
    // `MODE_UP_MS` and grading it against `SPIN_UP_MS` would expect nearly
    // twice the tape and call a working climb a stall.
````

<a id="tapes-95"></a>
## tapes-95: demo/tapes/index.html, inline script, line 1279

````js
  /**
   * The way button, with this page's arc in front of the looper's own press.
   *
   * ⚠️ THE LOOPER'S ENTRY IS KEPT AND CALLED, NEVER REIMPLEMENTED. `wayExtra()`
   * carries the id, the face, the label and the title the looper paints, and
   * `onPress` pointed at `looper.cycle`. Taking that function and handing it to
   * `turnWay` is the smallest possible change: the looper goes on owning what a
   * press does and this page decides only when it happens.
   */
````

<a id="tapes-96"></a>
## tapes-96: demo/tapes/index.html, inline script, line 1298

````js
    /**
     * 🔴 THE THREE MOMENTS THE SOUND FOLLOWS, AND ON A TAPE THEY ARE `set`,
     * `wrap` AND `off`.
     *
     *   set   both marks are down and the bar has sent the tape back to the
     *         first one. Start keeping; the tape plays the lap out loud, because
     *         the ring is being filled OUT OF what you are hearing.
     *   wrap  it has come round once, so the ring holds the lap. Take the tape
     *         down and put the kept seconds up in its place.
     *   off   give the tape back.
     *
     * ⚠️ `/archive/radio/` USES `fill` AND `set` FOR THE SAME TWO MOMENTS, because there
     * the sound the loop will play has not arrived yet and the window is opened
     * AHEAD of the press. Same looper, same button, two honest entry points.
     */
````

<a id="tapes-97"></a>
## tapes-97: demo/tapes/index.html, inline script, line 1318

````js
    /**
     * 🔴 WHERE THE SOUND IS INSIDE THE LOOP, WHICH IS NOT WHERE THE DECK IS.
     * The bar's `f` is how far the deck has got between the two marks, and that
     * stopped being the same thing the moment a lap could be played backwards,
     * at half speed or a slice at a time: under `back` it runs the wrong way,
     * under `half` twice too fast, under `chop` it sweeps seconds nobody is
     * hearing. The looper reads its own voice's clock instead. `f` is still the
     * answer for the lap being kept, before there is a voice at all.
     */
````

<a id="tapes-98"></a>
## tapes-98: demo/tapes/index.html, inline script, line 1328

````js
    /**
     * 🔴 ONE BUTTON GLUED TO THE RIGHT OF LOOP, CYCLING → ← ⇆, AND IT IS THE
     * ONE `/archive/radio/` HAS. It is on the bar with no loop running, because a
     * direction is a choice you can make BEFORE pressing LOOP: it says what the
     * next lap will do.
     *
     * 🔴 AND ITS PRESS RIDES THE ARC ON THIS PAGE, WHICH IS WHERE THAT BELONGS.
     * The inertia is not the looper's: `setWay` already dips the gain over
     * 12 ms so a voice swap is not a click, and that is the kit's job and is
     * right for every page that has one. A tape that winds down and comes back
     * up is a fact about THIS machine, it has to move the media element as well
     * as the ring, and putting it in `demo/shell/looper.mjs` would give it to
     * `/archive/radio/`'s transport bar and every other looper page uninvited. So the
     * page decides WHEN the looper's own press lands and the looper still owns
     * what the press DOES.
     */
````

<a id="tapes-99"></a>
## tapes-99: demo/tapes/index.html, inline script, line 1345

````js
    /**
     * 🔴 THE RATE HAS TO REACH THE TAPE, AND NOTHING WAS CARRYING IT.
     *
     * REPORTED as the rate control not working, and it was not: the bar told
     * the deck, the deck is a FOLLOWER of this media element, and the element
     * went on playing at one. So the playhead ran at the pressed speed for a
     * few hundred milliseconds, `mediaMaster` re-anchored it on the sound, and
     * the only visible effect of pressing 2 was a playhead that twitched. The
     * bar's own header says a commanded page owns the thing being played;
     * speed is part of that and was the one verb left out.
     *
     * ⚠️ BOTH ATTRIBUTES. Loading a new source resets `playbackRate` to
     * `defaultPlaybackRate`, so setting only the first would silently drop the
     * chosen speed on every press of ‹ or ›, which is worse than not working:
     * it works until you change tape.
     */
````

<a id="tapes-100"></a>
## tapes-100: demo/tapes/index.html, inline script, line 1361

````js
    /**
     * ⚠️ AND IT KEEPS ITS HANDS OFF A RUNNING ARC. The wind-down owns
     * `playbackRate` until it comes home, and it reads the armed speed fresh on
     * every frame. Pressing a speed mid-spin makes the tape come up to the NEW
     * one, and writing the rate here as well would put a step in the middle of
     * the curve and then be overwritten a frame later anyway.
     */
````

<a id="tapes-101"></a>
## tapes-101: demo/tapes/index.html, inline script, line 1368

````js
    /**
     * ⚠️ AND IT CHEWS THE LOOP TOO, for the same reason it moves the tape: while
     * a loop plays the tape is down, so a rate that only reached the element
     * would be a control that visibly does nothing. `half` in the way table
     * multiplies with this rather than replacing it.
     */
````

<a id="tapes-102"></a>
## tapes-102: demo/tapes/index.html, inline script, line 1374

````js
    /**
     * 🔴 IT GLIDES NOW RATHER THAN SNAPPING, ASKED FOR AS *"use
     * varispeed/inertia on rate change"*. `glide()` owns both writes, which is
     * why neither is made here any more: a rate set here AND ramped from
     * `frame()` is two things writing one property, and the loser is whichever
     * ran second.
     * ⚠️ `defaultPlaybackRate` STILL MOVES AT ONCE, because it is not a speed,
     * it is what the element will come back to when a new source is loaded. The
     * arc's landing and a reel change both read it, and a glide that left it
     * behind would put the OLD speed back on the next press of ‹ or ›.
     */
````

<a id="tapes-103"></a>
## tapes-103: demo/tapes/index.html, inline script, line 1399

````js
      /**
       * 🔴 THE PLAYHEAD MOVES AT ONCE AND THE TAPE CATCHES UP, and both of those
       * are deliberate. Setting `currentTime` on a file coming off somebody
       * else's server is a RANGE REQUEST — the media arrives at the asked
       * position when the network says so, not when the key was pressed.
       * MEASURED: the harness asked for 117 538 ms and read 1 296 back, which is
       * not a seek that missed, it is a seek still in flight.
       *
       * So the deck is told directly as well. ⚠️ AND IT MAY SNAP BACK BY A FRAME
       * OR TWO when the media lands, because `mediaMaster` makes the MEDIA the
       * master and its next tick re-anchors on where the sound actually is. That
       * correction is the design working, not a fault: the picture is allowed to
       * be optimistic for a moment, the sound is never allowed to be wrong.
       */
````

<a id="tapes-104"></a>
## tapes-104: demo/tapes/index.html, inline script, line 1425

````js
  /**
   * 🔴 THE PICTURE AND THE BAR THAT DRIVES IT ARE ONE SURFACE. Asked
   * 2026-09-18: *"just glue the 4 we have properly"*.
   *
   * ⚠️ THE PAIR IS THE SCOPE AND THE BAR, NOT THE STRIP AND THE BAR, AND THAT
   * IS NOT A SHORTCUT. The strip on this page runs edge to edge past the page
   * margins while the scope and the bar are inset, so a box drawn round the
   * strip and the bar would have to reconcile two widths, and the seam between
   * them would sit across a block the tape's own picture already crosses. The
   * scope sits directly above the bar at the same width and the bar drives it,
   * which is the claim gluing makes.
   *
   * ⚠️ THE ANCHOR IS READ BEFORE THE GLUE. `createGlue` re-parents its blocks,
   * so a node captured after the call can be detached and `insertBefore` throws
   * on it. `null` means append, which is what a pair at the end wants.
   */
````

<a id="tapes-105"></a>
## tapes-105: demo/tapes/index.html, inline script, line 1448

````js
  /**
   * 🔴 A TAPE THAT WILL NOT LOAD CROSS-ORIGIN GETS A SECOND ADDRESS BEFORE IT
   * GETS A BLANK WAVEFORM, AND THE ORDER OF THE LADDER IS THE WHOLE REPAIR.
   *
   *   1. the file itself, with the crossing. What every tape gets first.
   *   2. THE PROXY, still with the crossing. `workers/tapes/worker.mjs` fetches
   *      the same recording and puts the header on it that the storage node
   *      left off, so the sound can be READ and there is a waveform.
   *   3. the file itself, without the crossing. What this page did before, and
   *      what it still does when there is no proxy or the proxy cannot help:
   *      the tape plays, the graph is tainted and the picture says why.
   *
   * ⚠️ EACH RUNG IS TRIED ONCE PER TAPE, counted rather than flagged, because a
   * boolean could only ever say "something was already tried" and the two
   * retries want different answers. `select()` resets the count.
   *
   * ⚠️ AND STEP 3 IS NOT A FALLBACK THAT CAN BE DROPPED. A blank picture beside
   * a playing tape is a far better trade than a silent one beside a picture
   * that could not have been drawn anyway, which is why it was the answer for
   * as long as there was no proxy.
   */
````

<a id="tapes-106"></a>
## tapes-106: demo/tapes/index.html, inline script, line 1475

````js
      // ⚠️ THE CROSSING STAYS ON. The whole point of the hop is a response that
      // carries `access-control-allow-origin`, and asking for it without
      // `crossOrigin` would taint the graph anyway and waste the fetch.
````

<a id="tapes-107"></a>
## tapes-107: demo/tapes/index.html, inline script, line 1487

````js
    /**
     * 🔴 SAID IN THE PICTURE AND NOT ONLY IN THE LOG, AND NOT IN THE FAULT
     * COLOUR. Reported 2026-09-16: *"what does it mean. many kureniemis do not
     * play"*, against a red line and a blank bordered box. Both halves were
     * misleading. The sound is fine and is playing; what is missing is
     * permission to LOOK at it, so the one thing that is actually broken is the
     * drawing. A red line in a log whose job is to report real faults says
     * something is wrong with the recording, and an empty box beside it says
     * the page is broken.
     *
     * ⚠️ WHY IT HAPPENS, since the old wording explained nothing: every tape
     * here is on archive.org, which redirects a download to a storage node, and
     * that node does not always send `access-control-allow-origin`. Without it
     * `crossOrigin = 'anonymous'` is refused outright, so the element is
     * reopened without it. That plays, and it TAINTS the audio graph: the
     * analyser is allowed to run and is not allowed to return real numbers.
     *
     * ⚠️ AND THE LINE NAMES THE PROXY WHEN THERE WAS ONE, because "no proxy was
     * tried" and "the proxy was tried and did not help" are different findings
     * and only one of them is a thing anybody can fix.
     */
````

<a id="tapes-108"></a>
## tapes-108: demo/tapes/index.html, inline script, line 1518

````js
  /**
   * Wait for the loaded tape to be playable, or say it is not.
   *
   * 🔴 THE PAGE IS NOT READY UNTIL IT CAN SAY HOW LONG THE TAPE IS. Everything
   * about a transport — the travel of the slider, where a seek lands, whether
   * play advances — is a statement about a length nobody knows until the file
   * answers. Calling `d.ready()` before that is a page announcing a transport
   * over a recording of unknown duration, and it fails exactly the way it
   * should: `play advances position — 0 -> 0`.
   *
   * ⚠️ IT HAS A DEADLINE AND SAYS SO. These are somebody else's 2-to-12 MB files
   * over the open internet; a wait with no end turns one slow host into a page
   * that never loads. Past the deadline the strip, the lanes and every count are
   * still true. Only the sound is missing, and the log names which.
   *
   * 🔴 AND THE DEADLINE WAS NINE SECONDS, WHICH IS LONGER THAN THE BUDGET IT
   * SITS INSIDE. `demo/verify.mjs` allows 7.4 s for `__demo.ready`, and the
   * checks below this cost a further 1.25 s, so a host that used the full nine
   * would have produced a page reading `__demo.ready FAIL` however well its
   * deadline worked. A deadline past the budget is not a deadline, it is a
   * second way of failing with a worse message: one of them names the host and
   * the other says the page is broken. MEASURED over a dozen runs, this wait is
   * 0.8 s to 3.3 s, so 4.5 s is well clear of the normal case and lands the
   * page at 5.8 s in the worst one.
   */
````

<a id="tapes-109"></a>
## tapes-109: demo/tapes/index.html, inline script, line 1543

````js
  // ⚠️ ONE CONSTANT, BECAUSE IT IS ALSO A SENTENCE. The wait and the words that
  // report it had drifted apart once already: this said nine seconds in the
  // assert below long after the wait itself was changed, and a page that can
  // disagree with its own description is worse than one that says nothing.
````

<a id="tapes-110"></a>
## tapes-110: demo/tapes/index.html, inline script, line 1548

````js
  /**
   * 🔴 ONE DEADLINE FOR BEING READY, AND EVERY WAIT AFTER THE FIRST DRAWS ON
   * IT. `demo/verify.mjs` allows 1400 ms plus forty tries at 150 ms, which is
   * 7.4 s. Bounded waits in SERIES are only bounded by their sum, and this page
   * had grown three of them — 4.5 s for the first tape to answer, a wait for it
   * to start moving, and a wait for the reload at the end — each of which looks
   * careful on its own and which add to more than the whole budget. `left()`
   * says how much of the page's own five and a bit seconds is still there, so
   * the promise is a single number somebody can check instead of three to add
   * up. Past it every wait falls back to its floor and the checks report what
   * they could not reach, which is the right way to run out of time.
   *
   * ⚠️ IT IS NOT THE HARNESS'S 7.4 s. The walk check's arc is 0.7 s of fixed
   * work after the last budgeted wait, so the number here is the budget minus
   * that and a margin. MEASURED on the far side: the page lands at 2.2 s to
   * 3.4 s normally and 6.3 s in the worst case this allows.
   */
````

<a id="tapes-111"></a>
## tapes-111: demo/tapes/index.html, inline script, line 1567

````js
  /**
   * ⚠️ THE SHORTCUT ON THE FIRST LINE IS A TRAP FOR ANY CALLER THAT HAS JUST
   * SET `src`, AND IT COST A RUN BEFORE IT WAS UNDERSTOOD. Setting `src` does
   * not clear `readyState` on the spot: the media load algorithm waits for a
   * stable state, so for one turn the element still reports the PREVIOUS file
   * as playable and this answers yes about a file that is already gone.
   * MEASURED as `play advances position — 155 -> 0`, once in ten runs, which
   * is the abandoned load landing in the middle of somebody else's check. Call
   * it about the file the element has been holding, never about one it was
   * pointed at a line ago.
   */
````

<a id="tapes-112"></a>
## tapes-112: demo/tapes/index.html, inline script, line 1605

````js
    // 🔴 THE WIDTHS ARE RIGHT IN THE FIRST FRAME, because they came with the
    // list. See `lengthsFromCorpus`.
````

<a id="tapes-113"></a>
## tapes-113: demo/tapes/index.html, inline script, line 1611

````js
    /**
     * 🔴 EVERY RUN WALKS THE VISITOR'S PATH FIRST, AND THAT IS WHAT MAKES THE
     * RULE GRADABLE. See `select`: a visitor gets the first tape's name, its
     * place on the run and a transport with its real length, and no request to
     * anybody's server.
     *
     * The obvious shape was `select(0, { load: SELFCHECK })`, and it is wrong
     * in the way that let this regression live for three reports: the suite
     * would then take a different path from the visitor, so the one claim worth
     * checking — that a cold page opens no file — would be true only on runs
     * nothing was watching. `coldSrc` is read on EVERY run, including the
     * suite's, and asserted at the foot of this file.
     */
````

<a id="tapes-114"></a>
## tapes-114: demo/tapes/index.html, inline script, line 1629

````js
    /**
     * 🔴 THE WALK BUTTONS ON A STOPPED MACHINE, GRADED HERE BECAUSE HERE IT IS
     * FREE. ‹ and › point the element at another file and back, and the wait
     * for the first tape on the next line is exactly the wait those two loads
     * need. Done anywhere later it is a fetch left in the air at the moment the
     * page says it is finished, and an element whose file lands afterwards
     * resets its own clock under whoever is reading it: MEASURED as
     * `pause holds position — 821.9 == 0.0` in nine runs of ten, on a page
     * whose own checks were green in all ten.
     *
     * ⚠️ AND IT IS THREE FILE LOADS, WHICH IS WHY IT IS BEHIND THE GATE. Free
     * is true only of a run that was going to open a recording anyway. On a
     * visit it is the page fetching two tapes nobody asked for in order to
     * grade a button.
     */
````

<a id="tapes-115"></a>
## tapes-115: demo/tapes/index.html, inline script, line 1652

````js
    // ⚠️ THE UNDATED COUNT LIVES HERE NOW. It was in the lane's gutter and the
    // gutter had to be as wide as it; saying it once in the log costs no width
    // and is the honest home for a fact about the corpus rather than about the
    // lane. A record with no date cannot be on an axis, and a page that drew 12
    // marks for 23 tapes without saying so would be claiming eleven do not exist.
````

<a id="tapes-116"></a>
## tapes-116: demo/tapes/index.html, inline script, line 1283

````js
    // 🔴 SAID OUT LOUD, BECAUSE EVERY OTHER LINE IN THIS LOG IS ABOUT
    // archive.org. A run pointed somewhere else that did not say so would
    // report a recording opening, a length, a loop and a waveform, all of them
    // about a stand-in, in the words it uses for the real thing.
````

<a id="tapes-117"></a>
## tapes-117: demo/tapes/index.html, inline script, line 1294

````js
    // 🔴 A VISIT WAITS FOR NOTHING, BECAUSE IT ASKED FOR NOTHING. `heard` is a
    // fact about a file that has been opened, and on a visit none has: the line
    // says what is true instead, which is that the picture is complete and the
    // sound is one press away.
````

<a id="tapes-118"></a>
## tapes-118: demo/tapes/index.html, inline script, line 1317

````js
  /**
   * 🔴 THE MARKS ARE AS WIDE AS THE DATES ARE VAGUE, WHICH IS THE WHOLE CLAIM OF
   * THE PAGE AND SO IS THE THING TO CHECK. Counted off the rows the lanes
   * actually build, not off the file — a lane that silently dropped its spans
   * would still let the file's own counts pass.
   */
````

<a id="tapes-119"></a>
## tapes-119: demo/tapes/index.html, inline script, line 1323

````js
  // ⚠️ THE DENOMINATOR IS THE LANE'S OWN, NOT THE CORPUS'S. It used to be every
  // dated record in the file, which was right while six lanes between them held
  // everything; with one lane left that assert compared 13 playable marks
  // against 275 dated records and read as a page that had lost its axis. What
  // the check is FOR is that a lane draws every one of the rows it claims —
  // a lane that silently dropped its spans would still pass a count taken off
  // the file.
  // ⚠️ OFF THE LANE ITSELF, not off a table of lanes that no longer exists. The
  // claim is that the lane draws every row it says it has.
````

<a id="tapes-120"></a>
## tapes-120: demo/tapes/index.html, inline script, line 1335

````js
  /**
   * 🔴 THE LOOP, DRIVEN THROUGH ITS OWN BUTTONS, ON A REAL LAP.
   *
   * `verify.mjs` presses `.pos-controls button` and the transport's own row, so
   * a loop graded by calling `loopSet` would step straight over the fault worth
   * catching, which lives in the wiring between the bar and this file.
   *
   * 🔴 AND THE CLAIM IS NEW, BECAUSE THE MECHANISM IS. What was here graded a
   * loop made of SEEKS: the bar sent the tape back to the first mark and the
   * wave went on scrolling, which was the honest picture of a file playing
   * itself round. The lap is kept in a ring now and played from there, so three
   * separate things have to be true in order: the wave goes on taking audio
   * while the lap is being kept, it stops when the ring has it, and the tape
   * itself goes down so that what you hear is the kept seconds rather than both.
   *
   * ⚠️ NOTHING IS AUDIBLE THROUGHOUT. The gate is shut while the page is
   * checking itself, and the ring is filled from UPSTREAM of it, which is what
   * makes this measurable at all.
   */
````

<a id="tapes-121"></a>
## tapes-121: demo/tapes/index.html, inline script, line 1354

````js
  // 🔴 BEHIND THE GATE: this plays a tape and keeps a lap of it. See `SELFCHECK`.
````

<a id="tapes-122"></a>
## tapes-122: demo/tapes/index.html, inline script, line 1363

````js
      // ⚠️ THE GRAPH HAS TO EXIST BEFORE THE RING CAN KEEP ANYTHING. Nothing has
      // pressed play at this point, so without this there is no analyser to read
      // and no tap to fill from: the check would report a loop that caught
      // nothing and call it a fault.
````

<a id="tapes-123"></a>
## tapes-123: demo/tapes/index.html, inline script, line 1369

````js
      // 🔴 AT THE HEAD OF THE TAPE, AND A SHORT LAP. Setting a loop sends the
      // bar back to the first mark, and a seek into the middle of somebody
      // else's recording is a range request that throws the buffer away: marks
      // at a fifth and a half of the way in cost between 1.1 and 12 seconds of
      // waiting, on a page whose whole budget is five and a half. The head is
      // already buffered because `playable_now()` waited for exactly that.
      // ⚠️ AND HALF A SECOND IS THE LAP, because the ring closes at the FIRST
      // WRAP: the check has to sit through one lap of real time, and half a
      // second of it grades the mechanism as well as ten would.
````

<a id="tapes-124"></a>
## tapes-124: demo/tapes/index.html, inline script, line 1385

````js
      /**
       * 🔴 IS A TAPE ACTUALLY MOVING? MEASURED, NOT ASSUMED, AND IT DECIDES
       * WHETHER THERE IS ANYTHING HERE TO GRADE.
       *
       * A browser that will not start a tape before somebody presses something
       * leaves a stopped machine: nothing arrives, the ring keeps nothing, and
       * no arrangement of this page's code could make a lap out of it. Calling
       * that red grades the autoplay rule, and a visitor arriving cold would be
       * met with two FAIL lines in the log about a page that is working.
       * PHOTOGRAPHED on exactly such a load before this was written.
       *
       * ⚠️ AND IT MUST NOT BECOME AN EXCUSE. The distinction is a measurement of
       * the ELEMENT: if the tape IS rolling and the lap still does not close,
       * this is red, which is the case the check exists for. `startedAt` is read
       * a moment after the marks so a slow first frame does not read as a
       * stopped tape.
       */
````

<a id="tapes-125"></a>
## tapes-125: demo/tapes/index.html, inline script, line 1405

````js
      // ⚠️ A BOUNDED WAIT ON THE WRAP, NOT A SLEEP THROUGH IT. What has to
      // happen is a lap of TAPE going past, which is a fact about the element
      // rather than about a clock, and a browser that will not start a tape
      // without a press never gets there. Past the deadline the check says what
      // it found.
````

<a id="tapes-126"></a>
## tapes-126: demo/tapes/index.html, inline script, line 1418

````js
      // ⚠️ THE TAPE GOES DOWN OVER 12 ms, SO THE GAIN IS READ AFTER IT HAS. Read
      // on the same tick it reported 0.109 of its way down and the check called
      // that a tape still playing: a fade measured before it has happened is a
      // measurement of the schedule rather than of the sound. Four time
      // constants is 1.8% of where it started.
````

<a id="tapes-127"></a>
## tapes-127: demo/tapes/index.html, inline script, line 1425

````js
      /**
       * 🔴 THE WAY BUTTON, PRESSED THE WAY A FINGER PRESSES IT, AND THE MIRROR
       * CHECKED ON THE SAMPLES. "Backwards" is the one claim a buffer identity
       * cannot make: a copy that is merely DIFFERENT would satisfy it. Four
       * points are compared against the kept seconds at the mirrored index,
       * exactly, which costs nothing and cannot pass by accident.
       */
````

<a id="tapes-128"></a>
## tapes-128: demo/tapes/index.html, inline script, line 1432

````js
      /**
       * 🔴 AND THE PRESS RIDES AN ARC NOW, SO WHAT IS WAITED FOR IS THE ARC AND
       * NOT A NUMBER OF MILLISECONDS. The way changes at the BOTTOM of the
       * wind-down and the face is painted there, so the 90 ms sleep this
       * replaced would have read the OLD face and the OLD buffer on every
       * press: three asserts about a mirror that had not been swapped in yet.
       * A fixed sleep would also be grading `MODE_DOWN_MS` rather than asking
       * whether the machine came home.
       */
````

<a id="tapes-129"></a>
## tapes-129: demo/tapes/index.html, inline script, line 1448

````js
        // 🔴 THE ARC IS SAMPLED ON THE LOOP'S OWN RATE, NOT THE ELEMENT'S, AND
        // THAT IS THE WHOLE POINT OF THE TRIGGER. While a lap plays the tape is
        // down: a wind-down that moved only `audio.playbackRate` would be
        // inaudible here and would still satisfy a check that read the element.
````

<a id="tapes-130"></a>
## tapes-130: demo/tapes/index.html, inline script, line 1491

````js
      // ⚠️ EVERY HALF IS IN THE DETAIL, NOT JUST THE ONES THAT WENT WRONG. A
      // five-part claim that prints three of its parts is a failure nobody can
      // read: this went red once saying the lap was kept and the picture held,
      // with the answer (a fade measured 12 ms too early) in the part it did
      // not print.
````

<a id="tapes-131"></a>
## tapes-131: demo/tapes/index.html, inline script, line 1517

````js
    /**
     * 🔴 A MODE CHANGE WINDS THE LAP DOWN AND BRINGS IT BACK, ASKED FOR AS
     * *"varispeed/inertia on switching looping modes"*. Both halves, and the
     * second is worth the most: an arc that ramped and forgot to land would
     * leave the lap running at 0.997 under a rate button reading 1, which is
     * the shape this page has already paid for once on the tape's own speed.
     *
     * ⚠️ IT IS MEASURED ON `looper.rate()`, NOT ON `audio.playbackRate`, AND
     * THAT IS THE CLAIM RATHER THAN A DETAIL. While a lap plays the tape is
     * down and the ring is up, so a wind-down that reached only the element
     * would be inaudible on exactly this press and would still pass a check
     * that read the element. The floor has to arrive at the thing being heard.
     *
     * ⚠️ AND IT CANNOT FAIL ON THE AUTOPLAY RULE. A browser that will not start
     * a tape without a press keeps nothing, plays no lap, and has no momentum
     * to spend: that is reported in words, the way every other check in this
     * block reports it, rather than graded.
     */
````

<a id="tapes-132"></a>
## tapes-132: demo/tapes/index.html, inline script, line 1546

````js
  /**
   * 🔴 THE CLAIMS CHANGED WITH THE AXIS, AND THESE ARE THE NEW ONES. What was
   * here graded the old picture: that every DATED record was on a century, that
   * a vague date was drawn as a wide mark, and that a greedy packer never put
   * two overlapping bars in one row. All three were true and all three are now
   * about a drawing this page no longer makes. Keeping them would have been
   * worse than deleting them, which is why they went in the same edit as the
   * axis rather than being left to fail and be explained away.
   */
````

<a id="tapes-133"></a>
## tapes-133: demo/tapes/index.html, inline script, line 1560

````js
  // 🔴 THEY TILE. End to end means each one starts exactly where the one before
  // it ended: no gap, no overlap, nothing rounded into a neighbour. It is the
  // whole of what "back to back" means and it is one line of arithmetic, which
  // is precisely the kind of claim that goes wrong silently.
````

<a id="tapes-134"></a>
## tapes-134: demo/tapes/index.html, inline script, line 1576

````js
  // 🔴 A WIDTH IS A LENGTH, WHICH IS THE POINT OF THE WHOLE CHANGE. A tape
  // whose host has answered is drawn at its real duration; one that has not is
  // drawn at a guess AND SAYS SO in the gutter. The check grades both halves,
  // because a page that quietly drew every bar the same width would look
  // exactly like one that had measured them all.
````

<a id="tapes-135"></a>
## tapes-135: demo/tapes/index.html, inline script, line 1582

````js
    // 🔴 NO WAIT HERE, AND THAT WAS LEARNED THE EXPENSIVE WAY. A bounded wait
    // for the first lengths to arrive looks obviously right and is not: the
    // harness allows 1400 ms plus forty tries at 150 ms for `__demo.ready`, so
    // anything this page sleeps before it is ready comes out of that budget.
    // Two seconds was enough to take a page that works to `__demo.ready FAIL`,
    // which reads as a broken page rather than a slow server. The check grades
    // whatever has arrived by now and says so when that is nothing.
````

<a id="tapes-136"></a>
## tapes-136: demo/tapes/index.html, inline script, line 1592

````js
    // 🔴 "WE DID NOT LOOK" MUST NOT READ AS "IT IS BROKEN". These lengths come
    // off archive.org, and a media element needs a great deal more of a file
    // than a range request does before it will report a duration: MEASURED, a
    // 2 KB range answers in about a second and `loadedmetadata` on the same
    // file can take far longer. A red mark for that grades the network. It is
    // the same rule `demo/shell/caps.mjs` already follows for a capability
    // probe that could not answer, and the reason it is safe is that the check
    // still FAILS on the thing worth catching: hosts answered and every bar
    // came out the same width anyway.
    // 🔴 AND THE LANE REALLY SAYS SO, READ OFF THE LANE THE STRIP DRAWS. This
    // detail has claimed "the lane says so" since the page was written, and the
    // line was being written to a copy the renderer had stopped reading. A
    // sentence in an assert's detail is a claim like any other.
````

<a id="tapes-137"></a>
## tapes-137: demo/tapes/index.html, inline script, line 1615

````js
  /**
   * 🔴 THE BARS THE STRIP ACTUALLY DREW, NOT THE LIST THIS PAGE COMPUTED. Every
   * other check here graded `schedule`, which is an array in this file, and all
   * of them passed for days while the strip was drawing something else
   * entirely: `spansOf` reads `payload.when` before anything else, so the bars
   * came from each record's historical DATE on an axis that had become minutes
   * of tape. That is CLAUDE.md's oldest rule in this repo, measure the quantity
   * in question, and the quantity in question is what is on the picture.
   *
   * ⚠️ AND IT GRADES `crisp`, WHICH IS THE OTHER HALF. A span built from a date
   * is `vagueness` or `ignorance` and gets drawn feathered with bracket
   * terminators; a span built from a length is exact and gets a plain bar. Those
   * edges were reported three times as an unwanted border, and counting them is
   * how this stays fixed.
   */
````

<a id="tapes-138"></a>
## tapes-138: demo/tapes/index.html, inline script, line 1631

````js
    // 🔴 A `view.strip.frame(0, run)` STOOD HERE AND IT IS THE WHOLE OF THE
    // "the scale changes after loading" REPORT. `frame()` puts a moment at 38%
    // ACROSS the view, so framing nought put 38% of the picture BEFORE the run
    // started: MEASURED, `originTime -3283200` on a run of 8640000, an axis
    // reading -50:00 to 1:20:00 with every tape crammed into the right half.
    // A check may read the picture; it may not leave it somewhere else.
````

<a id="tapes-139"></a>
## tapes-139: demo/tapes/index.html, inline script, line 1638

````js
    // ⚠️ `spanStates` REPORTS WHAT IS IN THE WINDOW, not the whole lane, and the
    // strip clamps how far out it will zoom. So the count is checked against
    // the tapes whose run actually overlaps the window it reports, rather than
    // against all of them: comparing to 24 would fail for a reason that is
    // about the zoom ceiling and say nothing about the bars.
````

<a id="tapes-140"></a>
## tapes-140: demo/tapes/index.html, inline script, line 1654

````js
  /**
   * 🔴 THE OPENING MOVE HAPPENED, GRADED ON THE SPANS IT PASSED THROUGH.
   *
   * A zoom is a thing that MOVES, so the end state cannot grade it: a page that
   * jumped straight to an hour and a page that eased there over twelve hundred
   * milliseconds are identical once it is over. `zoomSaw` holds the width of the
   * window at every frame it drew, so the claim is read off what was actually on
   * screen: it started at the whole run, it finished at the hour, and it went
   * through the middle rather than cutting to the end.
   *
   * 🔴 IT WAITS FOR THE MOVE, IT DOES NOT CUT IT SHORT, AND THE DIFFERENCE ONLY
   * SHOWED UP WHEN THE CHECKS STOPPED RUNNING FOR VISITORS. This called
   * `openFinish()` straight away, which was harmless while the loop check ran
   * first and burned a second and a half: by the time it got here the zoom had
   * finished by itself and `openFinish()` was a no-op. MEASURED on the first
   * cold visit after the checks were gated, `1 frames from 142 minutes wide
   * down to 60, 0 of them in between` — the check was reaching the zoom one
   * frame in and snapping it, so the self-moving opening somebody asked for was
   * being destroyed by the thing that grades it, for every visitor.
   *
   * ⚠️ `openFinish()` STAYS, FOR THE DEADLINE CASE ONLY. A page that is too busy
   * to finish the move inside its own duration plus a margin still has to hand a
   * SETTLED view to every assert below this one, which all read the axis. What
   * the wait buys is that the settle is the animation ending rather than a check
   * standing on it.
   */
````

<a id="tapes-141"></a>
## tapes-141: demo/tapes/index.html, inline script, line 1700

````js
  /**
   * 🔴 AND THEN THE WINDOW FOLLOWS THE TAPE, WITHOUT RUNNING OFF EITHER END.
   * Driven by loading a tape near the end of the run and letting the page's own
   * animation loop answer, because the fault worth catching is a window that
   * sits where it was put while the playhead walks out of it.
   */
````

<a id="tapes-142"></a>
## tapes-142: demo/tapes/index.html, inline script, line 1712

````js
    // ⚠️ THE MAP IS MOVED DIRECTLY, NOT BY LOADING A FILE. `select()` points the
    // element at somebody else's recording, and a fetch left in the air at the
    // moment the page says it is ready is the flake this file already carries a
    // warning about. What the follow reads is the map's position, so that is
    // what the check writes.
````

<a id="tapes-143"></a>
## tapes-143: demo/tapes/index.html, inline script, line 1736

````js
  // 🔴 THE PICTURE OPENS ON AN HOUR, AND NONE OF IT IS BEFORE NOUGHT.
  //
  // ⚠️ THIS ASSERT USED TO SAY THE OPPOSITE AND WAS GREEN. It read *the picture
  // opens on the whole run* and required `to > run * 0.95`, which is exactly
  // what *"zoom to 1h"* asked to stop: a 24-tape day is about two and a half
  // hours across a few hundred pixels, where a six minute tape is a sliver.
  // So the ask could not be done without a passing check going red, which is
  // the most expensive kind of wrong check there is. The axis is still minutes
  // of tape laid end to end from nought, so time before the first tape is time
  // nothing can be in and it is still refused.
  // Read off the view the strip is actually using rather than off the range it
  // was told, and graded against `OPEN_SPAN_MS` rather than against a second
  // copy of the number.
````

<a id="tapes-144"></a>
## tapes-144: demo/tapes/index.html, inline script, line 1766

````js
  /**
   * 🔴 HOW TALL THE TAPE IS DRAWN, READ OFF THE CANVAS. The ask was *"add 2x
   * height to timeline (same tape h)"*, three times, and it was implemented and
   * then GRADED BY NOTHING: `height: 64, barPad: 21` is 22 px of tape in a lane
   * with room to be looked at, and a later edit that raised the height alone
   * would double the bars with every check still green. That is exactly the
   * regression this page's own backlog says is waiting to happen.
   *
   * ⚠️ MEASURED IN PIXELS, NOT RE-DERIVED. `height - barPad * 2` is the formula
   * the renderer uses, so a check that computed it would be comparing an answer
   * with itself: the same defect `timeline/csound.mjs` was green through for
   * months. This scans the canvas for the tallest run of ink inside the lane and
   * compares it with the 22 px that was ASKED FOR.
   */
````

<a id="tapes-145"></a>
## tapes-145: demo/tapes/index.html, inline script, line 1828

````js
  // 🔴 STOPPED, A WALK IS A CUT, AND THAT IS THE DECISION WRITTEN AS A CHECK.
  // Nothing standing still has momentum to spend, so a wind-down over silence
  // would be a control that visibly does nothing while costing two thirds of a
  // second before the recording somebody asked for arrives. The speed is read
  // either side to prove it: a stopped walk must not touch it at all.
````

<a id="tapes-146"></a>
## tapes-146: demo/tapes/index.html, inline script, line 1845

````js
  /**
   * 🔴 THIS NO LONGER NEEDS THE FILE, AND THAT IS THE POINT OF MEASURING THE
   * LENGTHS ONCE. It used to read `heard &&`, so it could only pass on a run
   * that had downloaded a recording; the length is in `corpus.json` now and
   * `select()` sets the range from it, so a visitor who has fetched nothing
   * still gets a transport whose travel is the real duration.
   * ⚠️ IT SAYS WHERE THE NUMBER CAME FROM. `corpus` and `the file` are two
   * different claims and a check that printed neither would read the same
   * whichever it graded.
   */
````

<a id="tapes-147"></a>
## tapes-147: demo/tapes/index.html, inline script, line 1860

````js
  // 🔴 THE PLAYHEAD FOLLOWS THE TAPE, which is the one thing a transport over
  // somebody else's recording has to prove. Both halves: it must have moved,
  // and it must have moved to where the MEDIA is rather than to a clock of its
  // own — a deck advancing on a timer would satisfy the first and be a
  // different page.
  //
  // ⚠️ AND IT RUNS THE TAPE WITHOUT ANYBODY HEARING IT. Nothing here is muted
  // and nothing is disconnected: the gate above is shut because the page is
  // still checking itself. ⚠️ THE GATE IS ONLY OPENED BY A TRUSTED PRESS ON THE
  // TRANSPORT NOW, which is the second half of that fix: it used to open on the
  // first pointerdown anywhere, so a click to focus the window both satisfied
  // the browser's autoplay rule and let these seconds out.
````

<a id="tapes-148"></a>
## tapes-148: demo/tapes/index.html, inline script, line 1877

````js
    // ⚠️ A QUARTER OF A SECOND OF TAPE, WAITED FOR RATHER THAN SLEPT THROUGH.
    // `demo/verify.mjs` allows 1400 ms plus forty tries at 150 ms for
    // `__demo.ready`, which is 7.4 s, and this page MEASURED 7.6 s to get
    // there: it passed or failed on how busy the machine was. What this buys is
    // a tape that has demonstrably RUN, and 250 ms of it demonstrates that as
    // well as 900 does — but only if the sound has started, which a sleep
    // cannot know and `ranFor` asks. It costs about 30 ms when the head of the
    // tape is already buffered, which it is by the time this runs.
````

<a id="tapes-149"></a>
## tapes-149: demo/tapes/index.html, inline script, line 1887

````js
    // ⚠️ HOW FAR IT RAN, not where it is. The loop check above leaves the
    // playhead wherever its first mark was, so a position is non-zero here
    // whether or not a single sample was decoded, and "the speakers got
    // nothing" is only worth asserting beside a tape that was actually running.
````

<a id="tapes-150"></a>
## tapes-150: demo/tapes/index.html, inline script, line 1899

````js
  // 🔴 AND NOTHING CAME OUT OF IT. Measured at the speakers rather than at the
  // gate: reading the gain back would grade the setting rather than the sound,
  // and `analyser` alone cannot see the difference because it sits upstream of
  // the gate by construction. The tape's own level is reported beside it, so a
  // pass can be told apart from a check that heard nothing anywhere.
  // ⚠️ A BROWSER THAT REFUSED TO START THE TAPE HAS NOT FAILED THIS. It used to
  // require 200 ms of tape to have run, and a browser that will not start one
  // before somebody presses something makes that impossible: the check then
  // went red for the autoplay rule rather than for anything on this page, on
  // the load a visitor actually sees. The claim that must never pass falsely is
  // the second half, and it is unchanged: if anything reached the speakers, this
  // is red. The first half is reported in words instead.
````

<a id="tapes-151"></a>
## tapes-151: demo/tapes/index.html, inline script, line 1920

````js
  /**
   * 🔴 THE RATE BUTTONS REACH THE TAPE, PRESSED THE WAY A FINGER PRESSES THEM.
   * Driven through the button rather than by calling `onRate`, because the
   * fault being guarded against is exactly the wiring between the bar and the
   * page: for two sessions the bar told the deck, the deck followed the media,
   * and the media never heard about it.
   *
   * 🔴 AND IT GLIDES THERE RATHER THAN SNAPPING, ASKED FOR AS *"use
   * varispeed/inertia on rate change"*. The claim is now two claims and the
   * first one is unchanged: whatever the curve does on the way, the tape ends
   * on exactly the speed the picker is showing.
   *
   * ⚠️ IT STARTS THE TAPE, WHICH THE OLD VERSION DID NOT HAVE TO. A glide only
   * exists where there is something moving to glide, so pressing a speed on a
   * stopped page lands at once and a check written against a stopped page would
   * have graded the snap and reported the glide, which is the vacuous pass this
   * repository has shipped before. The tape is paused again afterwards, the way
   * the walk check below already does.
   *
   * ⚠️ AND IT SAMPLES EVERY FRAME RATHER THAN SLEEPING TO THE MIDDLE. A fixed
   * sleep of `GLIDE_MS * 0.4` measures this machine's frame rate as much as the
   * curve: on a slow first frame the rate would still read 1 and a working
   * glide would be called a snap.
   */
````

<a id="tapes-152"></a>
## tapes-152: demo/tapes/index.html, inline script, line 1944

````js
  // 🔴 BEHIND THE GATE: a rate is a fact about a tape that is running.
````

<a id="tapes-153"></a>
## tapes-153: demo/tapes/index.html, inline script, line 1947

````js
    // ⚠️ NOT CALLED `ride`: that is the name of the arc's own entry point a
    // thousand lines up, and a local shadowing it inside the one block that
    // drives it is a trap rather than a name.
````

<a id="tapes-154"></a>
## tapes-154: demo/tapes/index.html, inline script, line 1981

````js
  // 🔴 EXACTLY ONE MARK IS RINGED AND IT IS THE ONE THE TRANSPORT IS PLAYING.
  // The picture's answer to "which of these am I hearing", counted off the
  // lane's own hook rather than off the page's variable: a hook that had gone
  // stale, or matched on the wrong field, would ring nothing and the page would
  // look exactly as it did when this was reported.
````

<a id="tapes-155"></a>
## tapes-155: demo/tapes/index.html, inline script, line 1995

````js
  /**
   * 🔴 THE WALK BUTTONS WIND THE TAPE DOWN AND COME HOME TO THE SPEED THE
   * PICKER IS SHOWING. Both halves are the check, and the second is the one
   * worth the most: a page that ramped and forgot to land would leave the tape
   * at 0.997 under a button reading 1, which is the shape already paid for once
   * here with a readout and a fader disagreeing. Pressed through the real
   * button, because the fault worth catching is the wiring between the bar and
   * this file rather than either half of it.
   *
   * ⚠️ IT GRADES THE ARC, NEVER THE NETWORK. Whether the next recording had
   * arrived by the time the tape came back up is a fact about archive.org: it
   * is measured, it is reported in the detail, and it cannot fail this.
   */
````

<a id="tapes-156"></a>
## tapes-156: demo/tapes/index.html, inline script, line 2008

````js
  // 🔴 BEHIND THE GATE: a wind-down is measured on a moving reel.
````

<a id="tapes-157"></a>
## tapes-157: demo/tapes/index.html, inline script, line 2018

````js
      // ⚠️ AND WHETHER IT ACTUALLY ROLLED. A browser that will not start a tape
      // before somebody presses something leaves a stopped machine, and a
      // stopped walk is a CUT by design. Grading the arc against that is
      // grading the autoplay rule.
````

<a id="tapes-158"></a>
## tapes-158: demo/tapes/index.html, inline script, line 2026

````js
      // ⚠️ AND ‹ BEFORE THE BOTTOM, WHICH IS WHAT MAKES THIS CHECK CHEAP. The
      // walk cancels itself, so no reel is changed and no file is left arriving
      // when the page says it is ready — and a cancelled walk rides exactly the
      // same arc as a completed one, which is the thing being graded. It also
      // grades the arithmetic of a second press: two presses compose inside one
      // arc rather than starting a second.
````

<a id="tapes-159"></a>
## tapes-159: demo/tapes/index.html, inline script, line 2048

````js
  /**
   * 🔴 ONE HAND ON THE PLAYHEAD AT A TIME. A drag on the run and the animation
   * loop were both writing the map's position: the drag put the head under the
   * finger and the next frame put it back where the tape was, sixty times a
   * second, which is not a head that lags but TWO HEADS FLICKERING. Reported
   * twice in those words. Graded through `stripSeek`, the same entry point the
   * strip calls, because a check that set the flag itself would grade the flag.
   */
````

<a id="tapes-160"></a>
## tapes-160: demo/tapes/index.html, inline script, line 2074

````js
  // ── the page is the visitor's from here ─────────────────────────────────
  //
  // 🔴 THE CHECKS HAND THE PAGE BACK AS THEY FOUND IT, AND SILENCE WAS ONLY
  // HALF OF IT. The gain gate above stops the checks being HEARD, and the
  // comment beside it said so plainly: this costs a visitor the waveform it
  // draws and nothing else. It is not nothing. REPORTED from a screenshot of a
  // page that had just loaded: a stub of wave sitting alone in the middle of an
  // empty scope, and the clock reading 0:48 of 3:55. Both are real traces of
  // nine hundred milliseconds of somebody else's tape, played by the checks,
  // and a visitor has no way to tell them from a page that has misdrawn itself.
  //
  // ⚠️ AFTER EVERY ASSERT, NEVER BEFORE ONE. `followed`, `silent` and the loop
  // checks all read positions and pixels that this undoes, so moving it up
  // would grade a page that had already been put away.
  // 🔴 ALWAYS PAUSED, NOT "PAUSED IF IT WAS NOT AUDIBLE". Nobody has asked for
  // anything yet, so the page a visitor is handed is a stopped one whatever the
  // checks left rolling. The old form let a page that had somehow become
  // audible go on playing, which is the case that was reported.
````

<a id="tapes-161"></a>
## tapes-161: demo/tapes/index.html, inline script, line 2094

````js
  /**
   * 🔴 AND NO `src` IS SET ANYWHERE NEAR HERE, WHICH IS A RULE AND NOT AN
   * OVERSIGHT. A page that points the element somewhere new and then says it is
   * finished has left a fetch in the air: when the file lands it resets
   * `currentTime` to nought and stops being a clock for a moment, so
   * `mediaMaster` either drags the playhead to zero or lets go and lets it
   * free-run. MEASURED the first time the checks changed tape at the end —
   * `demo/verify.mjs` reported `pause holds position — 821.9 == 0.0` in NINE
   * runs of ten, on a page whose own sixteen checks were green in all ten.
   * Nothing was wrong with the page. So every tape the checks load is loaded
   * where a wait already covers it: the stopped walk sits in front of the
   * first tape's own wait, and the moving one cancels itself and changes no
   * reel at all.
   */
````

<a id="tapes-162"></a>
## tapes-162: demo/tapes/index.html, inline script, line 2108

````js
  // 🔴 THE LENGTHS ARE ASKED FOR HERE, AFTER THE CHECKS, AND THAT IS ABOUT
  // BANDWIDTH RATHER THAN TIDINESS. Twenty-four requests to third-party hosts
  // started at load competed with the tape the checks were playing and with the
  // corpus itself: MEASURED, `__demo.ready` moved from 7.6 s to 7.9 s against a
  // harness that allows 7.4 s, so the page failed for being busy rather than
  // for being wrong. Nothing before this point needs a real length: the
  // schedule is drawn at a guess, says so in the gutter, and corrects itself as
  // the answers arrive over the following seconds.
````

<a id="tapes-163"></a>
## tapes-163: demo/tapes/index.html, inline script, line 2123

````js
  /**
   * 🔴 THE CHECKS ENDING IS NOT SOMEBODY PRESSING PLAY, AND FOR THREE SESSIONS
   * IT WAS THE SAME FACT. Measured where it counts, on the far side of the
   * gate, with the page in exactly the state a visitor is handed: ask the page
   * for sound with nobody having pressed anything, and read the gain the tape
   * would come out through. Anything but nought here is a page that plays on
   * load, which is what was reported three times and "fixed" twice.
   */
````

<a id="tapes-164"></a>
## tapes-164: demo/tapes/index.html, inline script, line 2131

````js
  /**
   * 🔴 A COLD PAGE OPENS NO RECORDING, AND THIS IS THE ASSERT THAT WAS MISSING
   * FOR THREE REPORTS. The sound gate below grades whether anything is
   * AUDIBLE, and it was green the whole time this page was fetching a 12 MB
   * recording from archive.org and running it: *"tapes still does some loading
   * and playback on page load"*, with the page's own log as the evidence.
   * Inaudible and idle are different claims and only one of them was checked.
   *
   * ⚠️ IT READS A VALUE TAKEN AT BOOT, NOT THE ELEMENT NOW. By this point the
   * suite has deliberately opened a tape and run it, so asking `audio.src` here
   * would be asking about the checks rather than about the visitor. `coldSrc`
   * is what the element held after the page had finished opening and before
   * anything had touched it, and it is recorded on EVERY run — the suite takes
   * the visitor's path first and only then opens a file on purpose, so this
   * grades the same code path a visitor gets.
   */
````

<a id="tapes-165"></a>
## tapes-165: demo/tapes/index.html, inline script, line 2162

````js
    /**
     * 🔴 AND WHICH CONTROLS OPEN THE GATE, WHICH IS THE HALF THAT WAS WRONG.
     *
     * The check above cannot see the defect that was reported twice more: it
     * measures the gain with `asked` false, and the bug was that `asked` became
     * TRUE for a press anywhere on the transport row. In a real visitor's
     * session it then excuses itself on `asked ||`, so the one case worth
     * grading is the one case it declines to grade.
     *
     * This grades the ROUTING instead, which is a pure function of the press's
     * target and needs no trusted event: the play button opens the gate and
     * every other control on the bar does not. Put the listener back on
     * `bar.el` and the four refusals below become four acceptances.
     *
     * ⚠️ IT ASSERTS THE CONTROLS EXIST, TOO. A selector that matches nothing
     * routes `false` and would pass as a refusal, so a bar that had been
     * restyled out from under this would read as a page with a perfect gate.
     */
````
