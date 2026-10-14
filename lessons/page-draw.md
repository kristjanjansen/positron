# Page comments: draw

The full comments cut from the code under demo/ for draw, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="draw-1"></a>
## draw-1: demo/draw/index.html, style, line 10

````css
  /* The pad styles itself — it is `demo/shell/xy-pad.mjs` now, not a canvas
     this page dresses. What is left here is layout: the row under the transport
     that carries the knob and the one destructive button, pushed to the far end
     of the same row. */
````

<a id="draw-2"></a>
## draw-2: demo/draw/index.html, inline script, line 31

````js
    // ⚠️ THREE SENTENCES, and it had quietly become five — describing a pink
    // line and a yellow mark that are both gone now. A description that
    // advertises things the page no longer draws is worse than a short one.
    // 🔴 AND HALF AS LONG, ON INSTRUCTION 2026-09-16: *"keep demo desc FONT SIZE
    // the same, reduce its length by 2x"*. It was 129 words in three long
    // sentences, which is an essay wearing a word limit's clothes, and the
    // first answer to it was to set the type at 10px instead — a paragraph
    // nobody could read is not a paragraph anybody skipped. 65 words, the
    // shell's own 13.5px. What went is the sentence about the numbers, because
    // the numbers are on the pad in front of you.
    // ONE SENTENCE, the manifest's `one`, since the page has a diagram
    // (2026-10-05); what the paragraph explained is in the diagram's notes.
````

<a id="draw-3"></a>
## draw-3: demo/draw/index.html, inline script, line 44

````js
    // Every cell moves with the drawing. `invented` is the one to read: it is
    // the fraction of the drawn line that no sample attests.
    //
    // ⚠️ SIX, WHICH IS EVEN. `as two` and `times worse` arrived together for
    // that reason as much as any other — an odd readout leaves a hole in the
    // last row on a phone, and `mount()` throws on one. They pair down the page
    // as they read: what was kept, what was invented · how far the one record
    // is off and at worst · how far the same gesture is off when it is written
    // down as two records instead, and by what factor that is worse.
    // 🔴 PUBLISHED, NOT DRAWN, ON INSTRUCTION 2026-09-16. Asked for by pasting
    // the whole row back with `rm` in front of it, and the page order that came
    // with it has no readout in it: description, knobs, pad, transport,
    // timeline, log. The numbers are not lost and the machine contract is
    // unchanged (`__demo.readout` still carries all six, and `verify.mjs` still
    // asserts the page declares them); what goes is a row of six figures above
    // a page whose whole subject is two lines you can see the difference
    // between. ⚠️ NOT `readout: null`, which is a page saying it HAS no numbers.
    // This one has six and has put them where they can be read against the
    // thing they describe.
````

<a id="draw-4"></a>
## draw-4: demo/draw/index.html, inline script, line 65

````js
    // 🔴 NOTHING DRAWS FOR YOU. There was a `Draw one for me` control that
    // synthesised a Lissajous, and it was there because the harness could not
    // draw — `element.click()` fires no pointer events. It is gone, button and
    // mechanism: a page about a gesture that offers you a gesture it made
    // itself is answering its own question, and the line you get is not the
    // line this page is about.
    //
    // The suite reaches it the real way now: `verify.mjs` dispatches actual
    // pointer events across any element marked `data-gesture`, which the pad
    // carries for every page that mounts one — so what the checks below grade
    // is a drag, the same as yours.
    // ⚠️ EMPTY ON PURPOSE. The shell's control bar sits ABOVE the page body,
    // and this page's only button belongs under the pad beside the knob —
    // in the row it acts on, at the far end of it, away from the surface you
    // draw on. `verify.mjs` presses `.pos-controls button` wherever the row
    // is, so the footer row below is reached exactly like a top one.
````

<a id="draw-5"></a>
## draw-5: demo/draw/index.html, inline script, line 85

````js
  // ── the two records ──────────────────────────────────────────────────────
  // 🔴 TWO APPEND-ONLY LANES, NEVER ONE MUTABLE ARRAY. The 2025 ancestor of
  // this page decimated by emptying its own buffer (`realTimePoints.length =
  // 0`), so the comparison it existed to make had already eaten its own ground
  // truth. `evidence` is every sample and is never touched by the throttle; it
  // is the PAD's capture, handed over as the live array, and the pad starts a
  // fresh one on the next gesture rather than emptying this one.
  //
  // The rate is a CONTROL, because it is the other half of this page's
  // question. The knob below the pad says how much a player may invent
  // between two samples; this says how many samples there are to invent
  // between. Move it and `kept`, `invented` and `off by` all move — at 20 ms
  // interpolation has almost nothing to do, and at half a second no
  // interpolator rescues a fast corner.
````

<a id="draw-6"></a>
## draw-6: demo/draw/index.html, inline script, line 106

````js
  /**
   * The sparse record, DERIVED from the evidence rather than taken instead of
   * it — so the rate can change after the fact and the same gesture can be
   * asked the question again.
   *
   * 🔴 THE LAST SAMPLE IS ALWAYS KEPT. A plain wall-clock throttle drops the
   * endpoint whenever a gesture ends mid-interval, and every replay then
   * undershoots the place the hand actually reached. It is rule 2 of the
   * capture discipline in `demo/shell/cc-adapter.mjs` and it belongs here for
   * the same reason.
   */
````

<a id="draw-7"></a>
## draw-7: demo/draw/index.html, inline script, line 128

````js
  /**
   * 🔴 THE NEGATIVE CONTROL — THE SAME NUMBER OF SAMPLES, PUT WHERE THE LINE
   * BENDS. It was a setting on this page for about an hour, and it is not one
   * any more because it loses every time (the check below says by how much).
   * A control whose every position is worse than the default is a decision
   * handed to a visitor who has no way to make it.
   *
   * It stays as CODE because the check needs something to be better than: a
   * plausible alternative, run for real, and rejected by measurement. Delete
   * it and the page's claim about sample placement becomes an assertion.
   *
   *
   * A clock spends its budget evenly, which means it spends most of it on the
   * straight parts — where a player could have worked the line out anyway —
   * and arrives at a corner with nothing left. This keeps the two ends, then
   * repeatedly adds whichever point sits furthest from the straight line
   * between the samples already kept (Douglas-Peucker, top down), until it has
   * as many as the clock would have taken.
   *
   * ⚠️ THE COUNT IS HELD EQUAL ON PURPOSE. "Better because it kept more" is not
   * a finding, it is a bigger file. Equal count is the only comparison that
   * says anything about WHERE samples should go.
   */
````

<a id="draw-8"></a>
## draw-8: demo/draw/index.html, inline script, line 163

````js
  /**
   * The engine both alternatives below run on, so the comparison between them
   * is about WHERE they put their samples and nothing else. Keep the two ends,
   * then repeatedly add whichever sample `dev` says the line already kept is
   * most wrong about, until `target` are kept. Returns indices into `evidence`.
   *
   * `dev(a, b, i)` is "how wrong would the straight line a..b be at i", in
   * whatever unit the caller measures in — perpendicular pixels for a path,
   * pixels on one axis for a single series. ⚠️ NEVER A MIXTURE OF THE TWO:
   * a deviation that adds milliseconds to pixels needs a scale factor between
   * them, and there is no defensible one, so the number it produces is an
   * artefact of whoever picked it.
   */
````

<a id="draw-9"></a>
## draw-9: demo/draw/index.html, inline script, line 198

````js
  /**
   * 🔴 THE OTHER READING OF THE SAME GESTURE — ONE DIRECTION, RECORDED ON ITS
   * OWN. This is the arrangement plan-gesture §3 rejected by inference and P3
   * measures: a pad that writes down two one-dimensional series rather than one
   * two-dimensional one, which is what a hardware controller sends and what
   * `demo/shell/cc-adapter.mjs` receives. The whole of the difference is that
   * the gate is PER SERIES — across can be written down at an instant down is
   * not — so nothing here may consult the other axis.
   *
   * ⚠️ THE COUNT IS HELD EQUAL PER AXIS, WHICH HANDS THE ALTERNATIVE THE
   * ADVANTAGE, and that is deliberate. Each series gets as many samples as the
   * whole 2-D record has, so the split reading stores twice the rows; and its
   * samples are placed by a pass over the FINISHED gesture, which no live gate
   * could run. If the best case a two-series recording can reach still loses,
   * every real per-series gate loses too — and the one that ships (a
   * per-controller wall-clock throttle over a quantised value) is strictly
   * worse placed than this.
   *
   * ⚠️ THE VALUE RIDES IN `.x`, whichever axis it came from, so the SAME
   * measured interpolators grade it: `catmullSample` treats x and y
   * independently over shared time knots, so a one-axis series is exactly a
   * two-axis one whose other component never moves. No second spline was
   * written, which is the only way the comparison is about placement.
   */
````

<a id="draw-10"></a>
## draw-10: demo/draw/index.html, inline script, line 235

````js
    // THE SAME GESTURE, WRITTEN DOWN AS TWO. Rebuilt with the record, because
    // the rate knob changes how many samples there are to place.
````

<a id="draw-11"></a>
## draw-11: demo/draw/index.html, inline script, line 242

````js
  // ── reconstruction ───────────────────────────────────────────────────────
  // The adapter's own interpolators, which is the whole reason this page did
  // not need writing: `holdSample`, `lerpSample` and `catmullSample` are the
  // measured article (0.036 px mean for the spline against 24.19 for a hold).
  // 🔴 ONE KNOB, NOT THREE BUTTONS. The three reconstructions used to be a
  // radio row, which makes them three unrelated things you pick between; they
  // are three points on ONE axis — how much a player is willing to invent
  // between two samples. At 0 nothing is invented and the line is a staircase;
  // at 1 the line is a spline through the same samples. Dragging it moves
  // `off by` continuously, which is the page's whole subject turned into
  // something you can feel rather than three numbers you compare.
  //
  // The ends are EXACTLY the named methods, so the checks below still grade
  // the three real algorithms rather than a blend of them.
````

<a id="draw-12"></a>
## draw-12: demo/draw/index.html, inline script, line 260

````js
  /**
   * The reconstruction, as ONE function — between two attested samples, at
   * smoothing `s`, with whatever neighbours there are.
   *
   * 🔴 IT IS ALSO THE ADAPTER'S `interpolate`, and that is deliberate. The blue
   * line and the transport's own read of the record both come through here, so
   * the picture and the playhead cannot disagree about what the same record
   * says. What that costs is worth writing down: the check
   * below compares the transport's answer against this page's, and since both
   * end in this function it CANNOT catch an arithmetic mistake in it — what it
   * catches is the plumbing (a record the transport never received, a seek that
   * asserts nothing, interpolation refused), which is what P2 is about. The
   * arithmetic is graded separately, against the evidence, by `error()`.
   *
   * ⚠️ REFLECTED AT THE ENDS, and by `catmullSample` rather than by hand. This
   * page used to build its own phantom — a DUPLICATE of the near sample placed
   * one interval earlier, which halves the tangent — while its comment claimed
   * a reflection. Handing the ends over as `undefined` gets the adapter's
   * measured behaviour (FIX-3) and makes the comment true.
   */
````

<a id="draw-13"></a>
## draw-13: demo/draw/index.html, inline script, line 285

````js
    // ⚠️ TIME-KNOTTED. A wall-clock throttle never produces evenly spaced
    // samples, so uniform knots bend the curve toward whichever sample happened
    // to arrive late.
````

<a id="draw-14"></a>
## draw-14: demo/draw/index.html, inline script, line 308

````js
  /** Where ONE independently-recorded direction says it was at `t`. Its rows
   *  carry their value in `.x` whichever axis they came from — see
   *  `oneAxisAlone` — so this is `at()` with the second component thrown away,
   *  through the same `blend` and therefore the same measured interpolators. */
````

<a id="draw-15"></a>
## draw-15: demo/draw/index.html, inline script, line 347

````js
  // ── the transport ────────────────────────────────────────────────────────
  // ONE DECK for the page's life — the bar binds its deck at construction, so
  // a deck built after the first gesture leaves the bar pointing at something
  // nobody is playing. The lane is rebuilt (`sched.clear()` + re-schedule)
  // whenever the record changes, which is every move of the rate knob.
````

<a id="draw-16"></a>
## draw-16: demo/draw/index.html, inline script, line 353

````js
  // 🔴 THE EVIDENCE POLICY IS NOT OPTIONAL HERE. Interpolating between two
  // attested samples IS restoration (tier 1), so `sampleAt` and the fold both
  // THROW on a deck that has not chosen — and under 'attested' the fold is
  // handed no successor at all and degrades to holding the last sample, which
  // is this page's own 34 px baseline wearing a transport. Chosen once, here.
````

<a id="draw-17"></a>
## draw-17: demo/draw/index.html, inline script, line 368

````js
    // BOTH DOORS. `actuate` is the attested fire as the playhead crosses a
    // sample; `assertState` is the fold after a seek, and `pointer-adapter`
    // routes both here. A state of null (a fold with nothing behind it) never
    // arrives — the adapter drops it — so the mark can go stale, which is
    // exactly what the check below watches for.
````

<a id="draw-18"></a>
## draw-18: demo/draw/index.html, inline script, line 378

````js
  // ⚠️ THE SPEEDS COME FROM THE ADAPTER, AND THE BAR BUILDS THE CONTROL. There
  // is no speed widget on this page and there must not be: `transport-bar.mjs`
  // renders one button per rate in the INTERSECTED `caps.rates` of the deck's
  // adapters, and shows an honest static `1x` when no adapter declares any —
  // which is what this page showed until now, because `pointer-adapter.mjs`
  // says `rate: true` and never says which. A capability declared as a boolean
  // is a capability no UI can offer.
  //
  // SET BEFORE `createDeck`, so neither the deck's registration of the kind nor
  // the bar's first read of the lattice can miss it. (Which of the two caches
  // is not something this page should have to know.)
  //
  // ⚠️ AND IT CHANGES NOTHING THIS PAGE MEASURES. Every number here comes from
  // the samples' own stamps through `at()` / `atApart()`, and the transport
  // check seeks to explicit positions — a position is a position at any speed.
  // The one thing that does read the playhead live is the replay's ink limit
  // below, and it reads `deck.position()`, which is in the recording's
  // milliseconds however fast they are being crossed.
````

<a id="draw-19"></a>
## draw-19: demo/draw/index.html, inline script, line 402

````js
  /**
   * Hand the record to the transport. Called when a gesture ends and whenever
   * the rate knob changes what the record IS — not on every sample, because a
   * lane rebuilt per pointermove is a lane nobody plays.
   *
   * ⚠️ NORMALISED TO ZERO. The samples carry `event.timeStamp`, which is
   * milliseconds since the page loaded — so a gesture drawn four seconds in
   * would give the bar a clock reading `0:04.210 / 0:03.200`. A recording
   * starts at zero. The payload's `at` is normalised too, because the adapter
   * interpolates against the POSITION it is asked for.
   *
   * ⚠️ AND THEN RE-ASSERT AT THE PLAYHEAD. The overdub law fires an event
   * scheduled behind the playhead immediately — right for a note, wrong for a
   * position, which would leave the mark at the end of the line rather than
   * where the playhead is.
   */
````

<a id="draw-20"></a>
## draw-20: demo/draw/index.html, inline script, line 438

````js
  // 🔴 WHAT YOU DREW IS WHITE AND IT IS THE LOUDEST THING HERE — and the pad
  // draws it, not this page. It was the other way round once: your line dark
  // underneath, the reconstruction in the page's yellow on top, which put the
  // emphasis on the invented line and made the page look like it was about the
  // reconstruction. It is about the DIFFERENCE. The reconstruction is blue: a
  // second reading of the same gesture, present and legible without competing.
  // Not `--hi`, which is the playhead's colour on every page — and on this page
  // the playhead is the END OF THE WHITE LINE, which is why there is no dot.
  //
  // ⚠️ `apart` IS KEPT AND NOTHING STROKES IT. The split reading had a third
  // line here, dashed and pink, and the first thing anybody asked about this
  // page was "what is the dotted line?" — which is the entire verdict on it.
  // The colour stays because the reasoning behind it is worth having if the
  // line ever comes back: not white (the capture), not blue (the record this
  // page is about), not `--hi` (the playhead), and deliberately not `--bad` red
  // or `--ok` green, because painting the loser red would be the picture
  // asserting the conclusion the numbers are there to reach.
````

<a id="draw-21"></a>
## draw-21: demo/draw/index.html, inline script, line 457

````js
  // ── the two lines take turns ─────────────────────────────────────────────
  // 🔴 WHILE YOUR HAND IS DOWN THERE IS ONE LINE ON THE PAD. Reported as *"find
  // a way to see blue line on drawing (no enough contrast am blue on white)"*.
  // The reconstruction was drawn at half weight ON TOP of the capture, so
  // everywhere the two agree the blue landed on white ink rather than on the
  // pad and came out a pale blue nobody can separate from the white under it.
  // MEASURED off this canvas, in `check()` below: those two colours are 1.4:1
  // apart, where 3:1 is the floor for a graphic somebody is meant to make out.
  //
  // So they take turns. Drawing, the capture is at full weight and the reading
  // is not drawn at all — there is nothing to confuse it with. Lift the hand
  // and the capture fades back to `INK.settled` while the reading fades in to
  // full: the blue is then on the PAD's ground almost everywhere, the two
  // measure 3.5:1 apart, and the fat grey band underneath still says where
  // your hand went. That holds while it is playing too, which is when the
  // difference between the two lines is the thing you are watching.
  //
  // ⚠️ 0.26 IS A TRADE AND BOTH SIDES OF IT ARE MEASURED, on this pad's own
  // ground: at 0.42 the capture wins its fight with the reading again and the
  // two read 2.1:1 apart, and at 0.20 the capture is down to 1.7:1 against the
  // pad it is drawn on and stops being a line you can follow. At 0.26 the two
  // lines are 3.5:1 apart and the capture holds 2.1:1 against the ground. 3:1
  // is the floor for a graphic somebody is meant to make out, and it is what
  // the check below holds the picture to.
````

<a id="draw-22"></a>
## draw-22: demo/draw/index.html, inline script, line 485

````js
  // ⚠️ DECLARED BEFORE THE PAD, because the pad PAINTS as it is built and its
  // paint calls this page's overlay — a `let` below it is in its temporal dead
  // zone at exactly that moment, and the page dies before `ready`.
````

<a id="draw-23"></a>
## draw-23: demo/draw/index.html, inline script, line 490

````js
  // ⚠️ AND SO ARE THESE, FOR THE SAME REASON — and `handDown` is the page's own
  // flag rather than `pad.drawing()`, which would read the pad from inside the
  // pad's first paint and throw before `ready`.
````

<a id="draw-24"></a>
## draw-24: demo/draw/index.html, inline script, line 504

````js
  // ⚠️ NOT `mix` — that name is already a POINT between two samples, forty
  // lines up, and two of those in one file is the kind of collision a page
  // finds by refusing to parse.
````

<a id="draw-25"></a>
## draw-25: demo/draw/index.html, inline script, line 508

````js
  // 🔴 AND THE CAPTURE ONLY STEPS BACK IF THERE IS SOMETHING TO STEP BACK FOR.
  // Drawing with record OFF stores nothing, so no reading fades in and there
  // is nothing for your line to make room for: it stays at full weight, which
  // is what it did before any of this. PHOTOGRAPHED while building it, with
  // the record button never pressed: a ghost of a line on an empty pad with no
  // second line anywhere reads as the page losing what you drew.
````

<a id="draw-26"></a>
## draw-26: demo/draw/index.html, inline script, line 518

````js
  // ── the pad ──────────────────────────────────────────────────────────────
  // The surface is `demo/shell/xy-pad.mjs`: it owns the capture, it draws it,
  // and it hands every sample over at full rate. This page owns the second
  // record and the second reading, which is what it is about.
  //
  // The axes are the pad's own pixels, because that is genuinely this page's
  // unit — every number it prints is a distance on this surface.
  // 🔴 NOTHING IS STORED UNTIL RECORD IS ON. Asked for, and it is the right
  // shape for this page: drawing and RECORDING a drawing are two different
  // acts, and a page that records everything you do has no way to show you the
  // difference. It also gives the line an honest start — the first sample is
  // the one after you armed it, rather than whatever happened to be first.
  //
  // ⚠️ The pad still captures at full rate either way. `recording` gates what
  // reaches the RECORD, never what the pad draws or what the evidence lane
  // holds — that separation is rule 2 of the capture discipline and this page
  // exists to measure it.
````

<a id="draw-27"></a>
## draw-27: demo/draw/index.html, inline script, line 536

````js
  // Whether the white line on the pad IS the take the transport is playing.
  // It is not, after you draw on the pad with record off — that leaves the
  // record alone (see `onStart`) and the two are then different gestures, so
  // wiping the ink back to the playhead would be wiping something the playhead
  // knows nothing about.
````

<a id="draw-28"></a>
## draw-28: demo/draw/index.html, inline script, line 545

````js
    // ⚠️ `x` AND `y`, NOT `across` AND `down`. Asked for. The long words were
    // chosen under the no-jargon rule, and that rule is about this project's
    // PRIVATE vocabulary — a fold, a lane, an evidence gate — not about the two
    // most widely known axis names there are. On a pad whose whole subject is a
    // pair of numbers, `x` and `y` are what a reader already calls them, and
    // two short labels also stop the strip's gutter paying for two long ones.
````

<a id="draw-29"></a>
## draw-29: demo/draw/index.html, inline script, line 553

````js
    // rule 1: this arrives for EVERY coalesced sample. It marks the derived
    // record stale and returns — the picture is redrawn once a frame by the
    // pad, and rebuilding a 900-point spline per sample would be three or four
    // pictures per frame that nobody sees.
    // Every coalesced sample. While recording, the line and its picture grow
    // as the hand moves — the timeline is drawn immediately rather than at the
    // end of the gesture, and the playhead sits on the newest sample, so the
    // cursor travels along the drawing as you make it.
````

<a id="draw-30"></a>
## draw-30: demo/draw/index.html, inline script, line 565

````js
    // ⚠️ THE RECORD IS ONLY CLEARED WHEN A RECORDING STARTS. Touching the pad
    // with record OFF draws, and leaves whatever was recorded before intact —
    // otherwise arming, drawing, and then idly touching the pad would silently
    // throw the take away.
    // ⚠️ `handDown` IS SET FOR EVERY GESTURE, ARMED OR NOT. Which line the pad
    // shows is a question about the hand, not about the record: drawing with
    // record off still has to be one line at full weight, or the last take's
    // blue sits on top of a gesture it knows nothing about.
````

<a id="draw-31"></a>
## draw-31: demo/draw/index.html, inline script, line 586

````js
    // 🔴 A REPLAY REDRAWS THE LINE, IT DOES NOT DRAW ON TOP OF IT. Asked for,
    // and it changes what pressing play means: the ink is wiped back to the
    // playhead and grows under the mark, so what you watch is the replay. It
    // used to retrace a finished drawing, where the replay and the original are
    // the same pixels and you cannot tell which you are looking at.
    //
    // Paused, the whole line is back — a still page shows what was recorded,
    // which is the pad's own rule 3 and not something playing gets to change.
    //
    // ⚠️ A TIME, NOT A COUNT. `base + position` is the stamp the capture
    // carries; a count would need this page to know how the pad coalesced.
    // 🔴 ONLY AS FAR AS THE CURSOR, WHETHER IT IS PLAYING OR BEING DRAGGED.
    // It was gated on `deck.playing()`, so scrubbing showed the whole line with
    // a mark sliding along it — and a line you can already see all of does not
    // need a cursor to tell you where you are in it. The gate is the POSITION,
    // not the transport state: at the very end the whole line is back, which is
    // what a finished drawing should look like.
    // ⚠️ NOT `!recording` — that was the obvious gate and it is the wrong one.
    // Record stays ARMED after a gesture ends, so the line would never follow
    // the cursor until you disarmed it, and the check read three identical
    // pixel counts. `growing` is the state that actually means "a hand is down
    // right now", which is the only time the line must show everything
    // regardless of where the playhead is.
````

<a id="draw-32"></a>
## draw-32: demo/draw/index.html, inline script, line 614

````js
    // 🔴 NO MARK. The white line now stops AT the playhead, so its end IS the
    // cursor — a ringed dot on top of that point is a second indicator for one
    // position, which reads as two. Asked for, and right for the same reason
    // the pad stopped drawing its own labels.
````

<a id="draw-33"></a>
## draw-33: demo/draw/index.html, inline script, line 621

````js
  /**
   * HOW FAR THE INK GOES, as one function, because TWO lines read it now.
   * 🔴 The blue line grows with the cursor as well — asked for, and it is the
   * only version that makes sense: with white stopping at the playhead and blue
   * drawn to the end, the picture showed a reconstruction of a gesture that had
   * not happened yet, and the gap between them stopped being the thing the page
   * is about. Both lines end at the same instant, so what you watch while it
   * plays is the DIFFERENCE arriving, which is the subject.
   * ⚠️ One function rather than the same condition typed twice: two copies of
   * this would agree today and disagree the first time either is touched, and
   * the symptom would be two lines ending in different places — which reads as
   * a reconstruction error rather than as a layout bug.
   */
````

<a id="draw-34"></a>
## draw-34: demo/draw/index.html, inline script, line 639

````js
  /** Rebuild everything derived from the SPARSE RECORD as it stands — without
   *  re-deriving the record itself, because the check below hands it a record
   *  built another way and needs that one graded, not this one.
   *
   *  No canvas: the error functions used to depend on a paint having happened,
   *  so they could not be asked a question without redrawing the page. */
````

<a id="draw-35"></a>
## draw-35: demo/draw/index.html, inline script, line 654

````js
        // ⚠️ THE INSTANT TRAVELS WITH THE POINT. Cutting the blue line at the
        // playhead needs to know WHEN each rebuilt point is, and a count would
        // not do it — the rebuild walks time in even steps, the capture does
        // not, so the nth blue point and the nth white sample are different
        // moments.
````

<a id="draw-36"></a>
## draw-36: demo/draw/index.html, inline script, line 669

````js
    // 🔴 AGAINST WHAT WAS CAPTURED, NOT AGAINST HOW FINELY THE LINE IS DRAWN.
    // This divided by `drawnPoints`, which is the REBUILD RESOLUTION — the loop
    // above walks the gesture in `(t1-t0)/900` steps, so `drawnPoints` is about
    // 900 whatever you do. The cell was therefore `100 × (1 − kept/900)` and
    // could not come down: turning `sample every` all the way to 10 ms on a 3 s
    // gesture keeps ~300 samples and still reads **66.7% invented**. Reported
    // as "cannot get most kept", which is exactly right — the number was
    // measured against a constant this page picked for SMOOTHNESS, and no
    // control on the page moves it.
    //
    // The honest denominator is what the browser actually gave us. "How much of
    // what you see no sample attests" is kept against CAPTURED, and it reaches
    // 0 when the gate is fine enough to keep every sample — which is a state
    // the knob can actually get to.
    // ⚠️ `evidence`, not `drawn`: one is the full-rate record of what happened,
    // the other is this page's own redrawing of it, and only the first is a
    // measurement of anything.
````

<a id="draw-37"></a>
## draw-37: demo/draw/index.html, inline script, line 703

````js
    // 🔴 THE SAME GESTURE AS TWO RECORDS IS STILL MEASURED AND NO LONGER DRAWN.
    // It was a third line, dashed and pink, and the first question anybody
    // asked about this page was "what is the dotted line?" — which is the whole
    // verdict on it. It answers a question the page asks in its NUMBERS (`as
    // two`, `times worse`) and the picture could not say which of three lines
    // was the subject. `drawnApart` is still computed on every recompute,
    // because the check below grades it; only the stroke is gone.
    // 🔴 IT USED TO BE DRAWN AT HALF WEIGHT AND THAT IS THE BUG THIS PAGE WAS
    // REPORTED FOR. The reasoning was that white is what happened and blue is a
    // reading OF it, so the white should show through wherever the two agree
    // and the blue should only become visible where it DEPARTS. What it
    // produced was blue ink on white ink, 1.4:1 apart, and a reader who could
    // not tell which line was which anywhere. The weight the reading is drawn
    // at now is `READ`, which is 0 while a hand is down and 1 after: the
    // capture is what steps back, not the reading.
````

<a id="draw-38"></a>
## draw-38: demo/draw/index.html, inline script, line 733

````js
    // The samples that are actually attested, so "kept" is a thing you can
    // count on screen rather than only in a cell. They belong to the sparse
    // record, so they are the record's colour — a third hue here would say
    // they were a third kind of thing.
    // ⚠️ AND THEY STOP WHERE THEIR OWN LINE STOPS. A dot is a sample of the
    // blue record, so dots past the cut would be the record asserting samples
    // for a stretch of line it is not drawing — a count on screen that does not
    // match the line under it.
````

<a id="draw-39"></a>
## draw-39: demo/draw/index.html, inline script, line 760

````js
  /**
   * 🔴 THE TIMELINE IS DRAWN AS THE HAND MOVES, not when it stops. Asked for,
   * and it changes what the page is: a strip that appears at the end is a
   * report, and one that grows under your hand is a recording.
   *
   * ⚠️ ONCE A FRAME, NOT ONCE A SAMPLE. `getCoalescedEvents` hands over every
   * sample the browser buffered — a dozen per frame on a 120 Hz digitiser —
   * and rebuilding the lane and its spline for each one is a dozen pictures
   * per frame that nobody sees. The pad already coalesces its own painting the
   * same way, for the same reason.
   *
   * The playhead is parked on the newest sample, so the cursor travels along
   * the line as you draw it rather than sitting at zero until you let go.
   */
````

<a id="draw-40"></a>
## draw-40: demo/draw/index.html, inline script, line 777

````js
    // ⚠️ THE CROSSOVER NEEDS FRAMES AND NOTHING ELSE WOULD ASK FOR THEM. The
    // pad repaints when a sample arrives, when the playhead moves or when this
    // page tells it to — and the moment the two lines trade places is exactly
    // the moment none of those three is happening. A fade nobody paints is a
    // jump, which is what it looked like before this line.
````

<a id="draw-41"></a>
## draw-41: demo/draw/index.html, inline script, line 800

````js
  // ⚠️ IT TAKES THE READING, NOT A SMOOTHING NUMBER. It took `sm` until P3 put
  // a second reading of the same gesture on the page, and a function that can
  // only grade one of them is a function that decides which one is the subject.
  // `reading(t)` is anything that answers "where does this record say the hand
  // was at t" — including the one that reads two separate records.
````

<a id="draw-42"></a>
## draw-42: demo/draw/index.html, inline script, line 817

````js
  /**
   * How far the reconstruction sits from what happened AS A SHAPE — nearest
   * point on the drawn line to each sample, with time thrown away.
   *
   * 🔴 TWO QUESTIONS, AND THEY HAVE DIFFERENT ANSWERS. `error()` asks "where
   * does the record say the hand was at 4.212 s", which is what a playback
   * needs. This asks "does the ink go through the same places", which is what
   * a drawing needs. A record can be excellent at one and poor at the other,
   * and this page measured exactly that on its first run.
   */
````

<a id="draw-43"></a>
## draw-43: demo/draw/index.html, inline script, line 840

````js
  // While it is PLAYING the mark moves between the attested samples, which fire
  // ten times a second at the default rate — a mark that only moved on a fire
  // would step rather than travel. Paused, nothing here writes: the fold after
  // a seek is the only thing that moves the mark, which is what the check below
  // is able to grade.
````

<a id="draw-44"></a>
## draw-44: demo/draw/index.html, inline script, line 851

````js
  // 🔴 THE GESTURE AS A SIGNAL, NOT ONLY AS A PATH. The pad shows WHERE the
  // hand went; this shows WHEN — x and y against time, on the line the
  // transport actually scrubs. They are the same thirty samples read two ways,
  // and the second reading is the one that makes the timing visible: a fast
  // corner is a steep edge here and just a bend up there.
  //
  // The polyline comes from the strip's own `continuous` renderer, which calls
  // `deck.sampleAt(kind, t)` — so it is drawn through the SAME interpolator the
  // page's blue line and the playhead's mark use. Three surfaces, one answer;
  // if they ever disagree it is because something real changed, not because a
  // third drawing path was written.
````

<a id="draw-45"></a>
## draw-45: demo/draw/index.html, inline script, line 872

````js
  /**
   * 🔴 THE TIMELINE OPENS AT TWICE THE FIT. Asked for as *"draw timeline: zoom
   * 2.0 by default"*. Fitting puts the whole recording on screen, and the
   * whole of a three second gesture in a strip this wide is two lanes of
   * wobble: the corners round off, and the one thing these lanes exist to show
   * — that a fast corner is a steep edge here and only a bend up on the pad —
   * is drawn too small to read. At twice that, half the recording is on screen
   * at twice the detail.
   *
   * ⚠️ IT IS THE STRIP'S OWN ZOOM, so a wheel with ctrl or shift held moves it
   * from here, and a view somebody has moved is left alone: this is called
   * when the RECORDING changes under the view, never when a knob changes what
   * is drawn in it.
   *
   * ⚠️ AND EVERY CALLER IS BELOW THE STRIP. `view` is a `const` declared above,
   * so reading it from anything the pad runs during its first paint would
   * throw, which is the same trap the `let`s near the top of this page carry a
   * note about.
   */
````

<a id="draw-46"></a>
## draw-46: demo/draw/index.html, inline script, line 898

````js
    // WHERE THE PLAYHEAD SITS IN THAT WINDOW. The strip's own answer is 0.38,
    // which leaves most of the view for what is ahead. Two things bend it:
    // there is nothing before a recording starts or after it ends, so the
    // window stays inside it rather than spending a third of the strip on
    // empty time; and the playhead never goes past 0.78, because the strip
    // scrolls it back the moment it crosses its own follow edge at 0.82 and
    // the two of us would then fight 25 times a second under a moving hand.
````

<a id="draw-47"></a>
## draw-47: demo/draw/index.html, inline script, line 911

````js
  // ⚠️ ONE POSITION SURFACE PER PAGE. The strip seeks on press AND on drag,
  // which the bar's slider does not — two horizontal time axes at different
  // scales, both scrubbing, is a contradiction rather than a redundancy.
  // 🔴 RECORD SITS NEXT TO PLAY, because it is a transport verb. `take` puts
  // its own record button here for the same reason: a control that starts
  // writing belongs beside the one that starts reading, not in a row of page
  // buttons a hand's width away.
  //
  // ⚠️ IT IS NOT `--hi`. Every primary control on this site is that yellow, and
  // a record button that looks like the main path is a page inviting you to
  // start writing before you have anything to write. `--rec` exists for
  // exactly this one control.
````

<a id="draw-48"></a>
## draw-48: demo/draw/index.html, inline script, line 925

````js
    /**
     * 🔴 THE THREE DIRECTIONS, ASKED FOR 2026-09-16: *"in draw allow < > <>
     * loop mode"*. `/replay/` refused them and was right to: a picture only
     * runs forwards and reversing sound needs a buffer. Neither applies here.
     * What plays on this page is a RECORD of a hand, read through a deck at
     * whatever position the transport asks for, so a lap backwards is the same
     * record read the other way and the line simply draws itself in reverse.
     */
````

<a id="draw-49"></a>
## draw-49: demo/draw/index.html, inline script, line 937

````js
  // The record face is the kit's icon, not a font glyph (asked 2026-10-12:
  // *"global: change transport buttons to proper icon buttons"*).
````

<a id="draw-50"></a>
## draw-50: demo/draw/index.html, inline script, line 959

````js
  // UNDER the pad and its transport, because they change the picture above
  // them and a control that sits below what it moves is read in the order it is
  // used. A GROUP, not two sliders in a div: `createSliderGroup` shares one set
  // of columns, so the longer label cannot push its own lane sideways.
````

<a id="draw-51"></a>
## draw-51: demo/draw/index.html, inline script, line 965

````js
      // 10..300, and the top end is MEASURED rather than picked. Thinning one
      // 3.2 s gesture at each interval: 20 ms 0.01 px · 50 ms 0.03 · 100 ms
      // 0.15 · 200 ms 1.17 · 300 ms 4.32 · 500 ms 24.63 — and holding the last
      // sample is 34 px, so by half a second interpolation has stopped
      // rescuing anything and the rest of the travel would be a region that is
      // uniformly broken. Under ~50 ms is the other dead end: 0.03 px and
      // 0.01 px are both invisible, so the knob would be moving a number
      // nobody can see. The range kept is the one where moving it changes the
      // picture. (The page LOGS this ladder for whatever line you drew — these
      // are from the suite's drag, re-measured after the ends were reflected
      // properly, which moved every figure.)
````

<a id="draw-52"></a>
## draw-52: demo/draw/index.html, inline script, line 984

````js
  /**
   * 🔴 THERE IS NO CLEAR BUTTON. Asked for 2026-09-16: *"no need for clear
   * butotn in draw"*, and the page agrees with the instruction: arming the
   * record button ALREADY empties the pad, the two records, the strip and the
   * playhead, so Clear was a second way to do a thing the only other control
   * does on its way to doing something useful.
   *
   * ⚠️ WHAT WENT WITH IT WAS A REAL LESSON AND IT LIVES ON THE ARMING PATH NOW.
   * Clear used to empty the pad and leave the strip below it still drawing the
   * whole gesture: 33306 lit pixels went to 0 while the strip held 1423 and the
   * playhead sat parked in a range that had just gone back to empty. A control
   * that looks like it reset the page and did not is worse than no control.
   */
````

<a id="draw-53"></a>
## draw-53: demo/draw/index.html, inline script, line 1001

````js
  // 🔴 THE ORDER DOWN THE PAGE, GIVEN AS A LIST 2026-09-16: description, the
  // two knobs, the pad, the transport, the timeline, the log. Each component
  // appends itself to the body as it is built, so the order the page is
  // ASSEMBLED in is the order it was drawn in; this states the order it is READ
  // in, once, in one place. `append` moves a node that is already in the
  // document, so this is a reordering rather than a second copy of anything.
  // ⚠️ THE KNOBS MOVE ABOVE THE PAD, which reverses the note above them: they
  // used to sit under the picture they change, on the argument that a control
  // below what it moves is read in the order it is used. The knobs are now the
  // settings you draw AT rather than the ones you correct afterwards.
  // ⚠️ AND THE ROW IS ONE `.pos-controls`, MOVED WHOLE. `verify.mjs` presses
  // the buttons in it in DOM order, so moving the row changes where the row is
  // and not which press is control 0, which is the trap that moved another
  // page's single harness press by thirty seconds.
````

<a id="draw-54"></a>
## draw-54: demo/draw/index.html, inline script, line 1017

````js
  // ── how it works ─────────────────────────────────────────────────────────
  // One machine, because nothing here leaves the tab: no relay, no upload, no
  // storage. The boxes are the five things built above, in the order a sample
  // travels through them, and the check at the end of `check()` holds the
  // picture to that list. `atEnd` puts it under the log on `document.body`, so
  // the pad the harness drags on does not move by a pixel.
  // The record's sub is read off the knob's opening value rather than typed,
  // so the picture and the knob cannot disagree about where the page starts.
````

<a id="draw-55"></a>
## draw-55: demo/draw/index.html, inline script, line 1065

````js
  // ── the page checks itself, once, on the first line you finish ───────────
  // Not on every `pointerup`: `d.assert` appends, so checking on each one would
  // grow the count without end and make "diff the per-demo assert count" —
  // this project's cheapest regression test — meaningless.
  //
  // ⚠️ AND NOT ON A THRESHOLD OF LINE QUALITY. What is graded below is a real
  // gesture, so it can be slow, fast, short or scribbled; every check here is
  // about the RELATIONSHIP between the two records, which holds for any line.
````

<a id="draw-56"></a>
## draw-56: demo/draw/index.html, inline script, line 1073

````js
  /**
   * 🔴 NOT FOR A VISITOR. NOT ONE OF THEM, EVER. CLAUDE.md's standing rule,
   * and this page was one of the forty-one still breaking it.
   *
   * PHOTOGRAPHED 2026-09-16: a visitor's log carrying two red FAIL lines about
   * a record of a moving point and a playhead, after drawing one line. Nothing
   * on the page was broken. What the checks below do is seek the transport
   * twenty times, walk five sampling rates, move the view and read the pad's
   * pixels, all in front of somebody who came to draw a line, and then report
   * on it in the box where this page's real faults are reported.
   *
   * ⚠️ AND THE RED WAS NOT NOISE, WHICH IS WHY GATING IT IS ONLY HALF AN
   * ANSWER. Both claims hold for the suite's smooth synthetic drag and were
   * refuted by a real hand: at 100 ms a scribble makes two records CLOSER than
   * one at every rate on the ladder (0.5x to 0.9x), and refusing to interpolate
   * costs 3.9x rather than the 5x the second check requires. That belongs in
   * `BACKLOG.md` as a question about the claim, not in a threshold quietly
   * loosened until it goes green.
   *
   * ⚠️ THE FLAG COMES FROM `shell/selfcheck.mjs` NOW, NOT FROM A LINE OF ITS OWN
   * HERE. Four pages each had their own copy and the other forty-one never grew
   * one; one import is what makes a `grep -L selfcheck` over the demo pages an
   * answer to "which ones have never been swept".
   */
````

<a id="draw-57"></a>
## draw-57: demo/draw/index.html, inline script, line 1110

````js
    // 🔴 THE ONE THIS PAGE EXISTS FOR. Most of the line you see was never
    // recorded — say how much, in the same breath as how wrong it is.
    // ⚠️ AGAINST WHAT WAS CAPTURED, the same denominator the cell uses. It
    // divided by `drawnPoints` — the rebuild resolution, ~900 whatever you do —
    // so the assert and the readout could report DIFFERENT percentages for the
    // same gesture, and briefly did: the cell said 0.0% at 10 ms while this
    // line said 96.7%. Two numbers with one name is worse than either being
    // wrong, because whichever a reader happens to see becomes the fact.
````

<a id="draw-58"></a>
## draw-58: demo/draw/index.html, inline script, line 1124

````js
    // ⚠️ ASSERT THE ORDER, NOT A THRESHOLD. The three reconstructions are the
    // subject, and a threshold on any one of them says nothing about whether
    // interpolating helped. Holding must be worse than joining, and joining
    // worse than smoothing, on the same recording.
````

<a id="draw-59"></a>
## draw-59: demo/draw/index.html, inline script, line 1133

````js
    // ⚠️ A RATIO, NOT A DISTANCE. `< 1 px` was calibrated against a smooth
    // synthetic curve; a person scribbles, and a fast corner is several pixels
    // wrong however well you interpolate. What is true of every gesture is that
    // smoothing is worth a lot MORE than holding, and how much is the number.
````

<a id="draw-60"></a>
## draw-60: demo/draw/index.html, inline script, line 1141

````js
    // 🔴 THE ONE THAT ANSWERS "HOW DO I MAKE THIS BETTER". Three levers exist —
    // keep more samples, interpolate better, or put the samples somewhere
    // cleverer — and only the third one is free. This grades the third with the
    // COUNT HELD EQUAL, so it cannot win by keeping more.
````

<a id="draw-61"></a>
## draw-61: demo/draw/index.html, inline script, line 1150

````js
    // 🔴 THIS CHECK WAS WRITTEN THE OTHER WAY ROUND AND THE PAGE REFUSED IT.
    // The guess was that the same number of samples, put where the line turns,
    // must beat samples spaced evenly — a straight stretch needs almost none
    // and a corner needs them all. MEASURED, 30 samples either way, both ways:
    //
    //                      in time      as a shape
    //   evenly in time     0.347 px     0.674 px
    //   where it bends     3.009 px     0.958 px
    //
    // Evenly wins BOTH, and by 8.7x on the one that matters for playback. The
    // reason is the reconstruction, not the placement: the blue line is a
    // spline knotted on TIME, and picking samples by how far they sit from a
    // straight line ignores time completely — so the knots come out unevenly
    // spaced in the one dimension the curve is parameterised by, and it
    // overshoots between the far-apart ones.
    //
    // So the answer to "how do I make the blue line closer" is: keep samples
    // more often, or interpolate better. NOT: be cleverer about which ones you
    // keep. Placing by shape is right for a line nobody replays — a coastline
    // on a map — and wrong for a gesture that has to happen at the right time.
````

<a id="draw-62"></a>
## draw-62: demo/draw/index.html, inline script, line 1175

````js
    // WHAT THE RATE BUYS YOU, as a ladder rather than a claim. The knob spans a
    // range and nothing on the page said which end of it is worth being at, so
    // it says so here: the same gesture, thinned at each interval, each one
    // reconstructed the same way — and beside it what the SAME gesture costs
    // when the two directions are written down separately, which is the check
    // below asked at every density instead of only at the default.
    //
    // ⚠️ 500 ms IS PAST THE KNOB'S TOP END AND IS IN THE LADDER ON PURPOSE.
    // It is where the record stops being worth reconstructing at all (24.63 px
    // against a 34 px hold), and it is also where the two-record reading stops
    // losing — at eight samples, placing them well beats spacing them evenly.
    // Both readings are broken there, so it is not a rate anybody picks, and
    // the check below does not grade it.
````

<a id="draw-63"></a>
## draw-63: demo/draw/index.html, inline script, line 1201

````js
    // ── ONE RECORD OF A MOVING POINT, OR TWO RECORDS OF A MOVING NUMBER ────
    //
    // 🔴 WRITTEN DOWN BEFORE IT WAS RUN, and it is in plan-gesture §5 P3 in the
    // same words so it cannot be back-fitted. The last time this page compared
    // two ways of placing samples, the guess was backwards and the measurement
    // refused it; that is the whole reason the prediction goes first.
    //
    //   ORDER — one 2-D record, knotted on a clock, lands closer to what the
    //           hand did IN TIME than two 1-D records each gated on its own.
    //   RATIO — by more than 2x.
    //
    // 🔴 THE ORDER HELD AND THE RATIO DID NOT SURVIVE AS A ONE-POINT CHECK.
    // At the knob's default the prediction passed — 0.15 px as one record
    // against 0.34 px as two, 2.3x — but the ladder above asks the same
    // question at six densities and the answer MOVES, all the way across:
    //
    //   sample every     one record     as two records
    //   20 ms  (101n)    0.01 px        6.3x worse
    //   50 ms   (51n)    0.03 px        9.0x worse
    //   100 ms  (30n)    0.15 px        2.3x worse
    //   200 ms  (17n)    1.17 px        2.4x worse
    //   300 ms  (12n)    4.32 px        1.9x worse
    //   500 ms   (8n)   24.63 px        0.5x — TWO RECORDS WIN
    //
    // So "> 2x" is a property of one gesture at one knob position and not a
    // relationship that holds for any line, which is the bar every check on
    // this page has to clear. Shipping it would have been a threshold dressed
    // as a ratio. What IS true at every rate the knob offers is the ORDER, and
    // what makes the gap material rather than noise is that it reaches 9x
    // somewhere in that range — so the check grades both ends of the ladder
    // and not its middle. plan-gesture §3 has the correction; the short form is
    // that two 1-D series are NOT the 8.6x failure it inferred (they are ~2x at
    // the default, and the 13x "where it bends" arrangement is six times worse
    // than they are), because a per-axis gate can still place its samples by
    // TIME, and this one does.
    //
    // ⚠️ THE SHAPE FIGURES ARE PRINTED AND NOT ASSERTED. A shape metric throws
    // time away, and time is the whole of the claim.
    //
    // ⚠️ AND THE TWO AXES HAVE TO ACTUALLY DISAGREE, or this compares a record
    // with itself and passes while measuring nothing. Two axes gated together
    // is not the alternative being tested, so how many instants they share is
    // part of the check rather than part of the prose.
````

<a id="draw-64"></a>
## draw-64: demo/draw/index.html, inline script, line 1258

````js
    // ── the transport, at twenty positions ─────────────────────────────────
    //
    // 🔴 WHAT THIS CAN AND CANNOT CATCH, because that is the first question to
    // ask of any comparison. The transport's answer and this page's come from
    // ONE interpolator (see `blend`), so the arithmetic cancels and an error in
    // it is invisible here. What does NOT cancel is everything between: whether
    // the record reached the lane at all, whether a seek folds and asserts,
    // whether the bracket picks the right pair and its neighbours, whether the
    // evidence policy lets the fold interpolate. Each of those fails by tens of
    // pixels, not by fractions.
    //
    // So the check is: seek, and compare the mark's distance from the HAND
    // against the record's own distance from the hand at the same instant. Two
    // real numbers, which must agree.
    //
    // ⚠️ 0.042 px IS NOT A THRESHOLD SOMEBODY PICKED, and it is also not a
    // claim about this gesture. It is `proto/paths`' measured seek accuracy for
    // this adapter — a 100 ms record of an analytic Lissajous, read back at
    // three seek positions — so it is the smallest difference that has ever
    // meant anything for this kind, used here as the width of "agree".
````

<a id="draw-65"></a>
## draw-65: demo/draw/index.html, inline script, line 1307

````js
    // ⚠️ AND PAINT IT. The mark moves on a fold, and the pad repaints on the
    // next animation frame — reading the pixels in the same turn would read the
    // frame before the seek and report a mark that is there as missing.
````

<a id="draw-66"></a>
## draw-66: demo/draw/index.html, inline script, line 1312

````js
    // 🔴 THE TIMELINE OPENS AT TWICE THE FIT, AND IT IS GRADED AGAINST THE FIT
    // ITSELF rather than against a pixels-per-second somebody wrote down. A
    // number typed into an assert would go stale the first time the strip's
    // gutter or this page's width changed, and it would agree with the code it
    // is grading for the wrong reason. `fit()` is the component's own answer
    // to "the whole recording, exactly"; this page's opening view has to be
    // twice it. ⚠️ It MEASURES BY MOVING and puts the view back, which is the
    // one kind of mutation a check here is allowed: a visitor sees both of
    // these views, and the one they are left in is the one they came for.
    // 🔴 AND THE 2 BELOW IS TYPED A SECOND TIME ON PURPOSE. Written as
    // `- OPEN_ZOOM` it passed with `OPEN_ZOOM` set to 1, which is this
    // project's oldest trap in a new costume: a check derived from the same
    // constant as the code catches a typo in the arithmetic and can never
    // catch the page opening at the wrong zoom. PROVED by setting it to 1 and
    // watching this line stay green. The literal is the ASK — *"zoom 2.0 by
    // default"* — and the constant is the implementation of it; they are two
    // different things and they are allowed to disagree, which is the point.
````

<a id="draw-67"></a>
## draw-67: demo/draw/index.html, inline script, line 1337

````js
    // ⚠️ NOTHING IN THE SUITE LOOKS AT INK, so this page has to. A right answer
    // in a cell over a blank pad is the defect this project has hit twice.
    //
    // 🔴 AND IT IS NO LONGER "NEAR-WHITE". The capture is knocked back to
    // `INK.settled` the moment a hand comes up, so a test for `r > 200` is now
    // a test for a line that is being drawn RIGHT NOW rather than a test for a
    // line. What separates the two of them at every weight is COLOUR: the
    // capture is grey, its three channels within a few of each other, and the
    // reading is blue, its blue channel far above its red. The only other ink
    // on the pad is the grid, which sits at 29 on every channel and is under
    // the floor below, so a blank pad still cannot pass.
    //
    // It hands back the two lines' actual colours as well as their sizes, and
    // it takes the COMMONEST value in each bucket rather than the brightest
    // or the bluest. 🔴 THE BRIGHTEST WAS TRIED FIRST AND IT IS A THRESHOLD IN
    // DISGUISE: a line that crosses itself lays the capture down twice in that
    // one spot, so the brightest grey is the densest crossing rather than the
    // line, and how many crossings there are is up to whoever drew it. The
    // commonest value is the stroke's own core — every other pixel of either
    // line is a part-covered edge of it, and each of those values occurs a
    // handful of times where the core occurs thousands. That is what makes the
    // contrast below a measurement of the picture rather than arithmetic on
    // the constants that drew it.
````

<a id="draw-68"></a>
## draw-68: demo/draw/index.html, inline script, line 1368

````js
        // ⚠️ 12, AND IT WAS 20 FOR ONE RUN. The capture's own pixels sit 9
        // apart on those two channels; at 20 the bucket also caught the pixels
        // where a blue EDGE lands on the capture, and reported the contrast
        // between the reading and a mixture of the two, which is a colour
        // nothing on this page draws.
````

<a id="draw-69"></a>
## draw-69: demo/draw/index.html, inline script, line 1386

````js
    // ── THE TWO LINES CAN BE TOLD APART, AT BOTH MOMENTS ──────────────────
    //
    // 🔴 WHAT WAS REPORTED WAS A CONTRAST, SO WHAT IS GRADED IS A CONTRAST.
    // *"find a way to see blue line on drawing (no enough contrast am blue on
    // white)"*. The reading used to be drawn at half weight over the capture,
    // which put blue ink on white ink everywhere the two agreed; the number
    // below says how far apart those two colours were, and it is the reason
    // the page now draws one line at a time.
    //
    // ⚠️ BOTH STATES ARE FORCED, NOT WAITED FOR. `phase()` is a function of
    // `handDown` and `settleAt` and of nothing else, so each end of the
    // crossover can be asked for directly and painted. Neither is a state
    // invented for the check: one is what a visitor sees with a finger down,
    // the other is what they see a quarter of a second after lifting it.
````

<a id="draw-70"></a>
## draw-70: demo/draw/index.html, inline script, line 1415

````js
    // The arrangement this replaced, composited from the capture this run
    // actually measured: the reading at half weight over the line underneath
    // it. Labelled as the old one in the message, because it is computed
    // rather than painted.
````

<a id="draw-71"></a>
## draw-71: demo/draw/index.html, inline script, line 1426

````js
    // 🔴 THE LINE'S END IS THE PLAYHEAD NOW, so that is what gets checked.
    // This assert used to count yellow pixels for a ringed dot; the dot is gone
    // because the white line stops at the cursor and two indicators for one
    // position read as two. ⚠️ The CLAIM has not been weakened — it was "the
    // playhead is visible on the pad, not just a number in a cell", and it
    // still is — but it is now tested by the thing that carries it. Deleting
    // the assert along with the dot would have quietly dropped the page from 21
    // asserts to 20 while reading green, which is this project's cheapest
    // regression test going blind.
    //
    // Measured as a RELATIONSHIP across three positions, never a pixel count:
    // a count would be a threshold tuned until it passed, and it could not tell
    // "the line is short because the cursor is early" from "the line failed to
    // draw". Early < middle < end, and end is the whole line back.
    // ⚠️ BOTH LINES, NOT JUST YOURS. The reading grows with the cursor too, and
    // a check that only watched the capture would stay green while the reading
    // silently went back to being drawn to the end — which is the exact defect
    // this pairing exists to prevent, because a blue line running past the
    // capture reads as a RECONSTRUCTION ERROR rather than as a drawing bug.
    // ⚠️ AND IT IS MEASURED IN THE SETTLED PICTURE, which is the state left
    // above: with a hand down there is no reading to watch at all, so this
    // would be grading the wrong half of the page.
````

<a id="draw-72"></a>
## draw-72: demo/draw/index.html, inline script, line 1493

````js
  /**
   * 🔴 THE LOOP PAIR WEARS THE SAME EDGE AS EVERY OTHER BUTTON ON THE BAR, AND
   * THIS PAGE IS WHERE THAT CAN BE SAID. Reported four separate times, the last
   * one 2026-09-16 with a photograph of this exact row: *"global: loop buton
   * borders as rest of button"*. MEASURED here before the repair — the pair read
   * `rgb(106, 114, 128)` while the rate buttons beside it read `rgb(43, 53, 70)`,
   * which is text grey against a button edge, two and a half times lighter.
   *
   * ⚠️ IDLE ONLY, AND THE ARMED RATE IS CHECKED AS THE CONTROL. A state is
   * allowed to override its own edge: a running loop paints `--fg` and the
   * armed rate keeps its yellow outline. If this check simply demanded that
   * every button on the bar match, it would go red on the thing that is working
   * — so it asserts the two idle families are EQUAL and that the armed rate is
   * DIFFERENT, which is the pair of claims that can tell the defect from the
   * design.
   * ⚠️ `/draw/` is the only demo in the suite that draws a loop pair at all:
   * `/archive/radio/` and `/tapes/` are the other two and both reach a server that is
   * not ours.
   *
   * 🔴 AND IT IS BEHIND THE FLAG, BECAUSE IT WORKS A CONTROL TO TAKE ITS
   * READING. `loopBtn.dataset.loop = 'off'` is the LOOP button being set to a
   * state nobody asked for so its idle edge can be measured, and putting it back
   * only happens where there was something to put back — a button that arrived
   * with no `data-loop` at all is left saying `off`. That is the whole shape the
   * rule is about: a check that reaches into what a visitor is looking at.
   * Everything else this page asserts is already gated; this block was outside
   * `check()` and ran on every visit.
   */
````
