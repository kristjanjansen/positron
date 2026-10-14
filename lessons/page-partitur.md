# Page comments: partitur

The full comments cut from the code under demo/ for partitur, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="partitur-1"></a>
## partitur-1: demo/partitur/index.html, style, line 16

````css
  /* The three link picks share one label column, so every row's options start
     on one x (positron-compose section 2: label and control rows are one grid).
     Each pick is a subgrid row of it. Above the phone width only: below it the
     kit stacks a pick's label over its options and there is no column to share. */
````

<a id="partitur-2"></a>
## partitur-2: demo/partitur/index.html, inline script, line 35

````js
  /*
   * 🔴 THE SCORE AND ITS WALL AS ONE PAGE, asked 2026-10-05: *"unify partitur
   * and wall to tabbed page"*. `/wall/` was its own unlisted page for a day and
   * is gone with no redirect, the way the 2026-10-04 regrouping retired pages.
   *
   *   SCORE  Moholy-Nagy's 1924 plate as a timeline, its three lanes as sources
   *   WALL   any screen as the light lane's destination
   *
   * A wall is usually ANOTHER browser (a projector, a phone), so the two tabs
   * meet through the room, never through this page's memory: the check pass
   * proves it by joining both to the run's own room and sending a stripe
   * across. `demo/shell/tab-page.mjs` does the rest. SCORE owns the page's one
   * published transport bar.
   */
````

<a id="partitur-3"></a>
## partitur-3: demo/partitur/index.html, inline script, line 51

````js
    // No `what` under the title: each tab says what it is in the box under the
    // tab row (`tab-page.mjs` rule 6), asked 2026-10-05 as *"rm top desriptions"*.
````

<a id="partitur-4"></a>
## partitur-4: demo/partitur/index.html, inline script, line 58

````js
  // ⚠️ IMPORTED AFTER `mount()`, NOT AT THE TOP. `score.mjs` awaits the score
  // file while it loads, and a static import holds the whole script, `mount()`
  // and its inline favicon included, until that fetch lands. MEASURED
  // 2026-10-05: in that gap Chrome sometimes asked for /favicon.ico, and the
  // 404 turned `no console errors` red on one run in three.
````

<a id="partitur-5"></a>
## partitur-5: demo/partitur/wall.mjs, module, line 1

````js
// demo/partitur/wall.mjs: the WALL tab of /partitur/, from the old /wall/.
//
// 🔴 A PROJECTION WALL ANY SCREEN CAN BECOME, asked 2026-10-04 after *"how
// universl patchbay and timeline relate"*: the smallest step is a timeline lane
// with a destination, and a destination has to exist first. Open this tab on a
// projector, a television's browser or a phone, press Become a wall, and it
// joins the studio's room as a patchbay node with one `light` input (a `value`
// of three channels) and one captions input. The SCORE tab links its light lane
// to it; `/patchbay/` draws it.
// 🔴 ONE PAGE WITH THE SCORE SINCE 2026-10-05, asked *"unify partitur and wall
// to tabbed page"*. `/wall/` is gone with no redirect, as the 2026-10-04
// regrouping did it.
// WHAT CHANGED ON THE WAY IN, AND WHY:
//   1  🔴 IT JOINS ON A PRESS, NOT ON LOAD. The old page sat in `studio-1` the
//      moment it opened. Building this tab opens nothing (`tab-page.mjs` rule 1).
//   2  🔴 THE ROOM IS THE PAGE'S `?room=` WHEN IT HAS ONE. The old page ignored
//      it and announced into the real `studio-1`, so every suite run put a fake
//      wall on the owner's patchbay (plans/plan-stage-patchbay.md F6). The
//      harness hands every run a room of its own; a person gets `studio-1`.
//   3  🔴 THE ROOM, THE ANNOUNCE AND THE RE-ANNOUNCE ARE `bay-node.mjs`'s SINCE
//      2026-10-06 (plans/plan-routing-migration.md step 1), and so is the
//      choice of room: `?room=`, or a room of the run's own under the harness
//      even when no `?room=` was passed, or `studio-1` for a person.
// ⚠️ IT ONLY LISTENS AND PAINTS. It asks nobody for anything, and a colour
// arrives only because somebody linked a lane to this wall.
````

<a id="partitur-6"></a>
## partitur-6: demo/partitur/wall.mjs, module, line 74

````js
    // 🔴 UNTIL A LIGHT ARRIVES THE WALL SAYS WHAT IT IS AND WHAT IT IS CALLED,
    // added 2026-10-05. It was a black box either side of the press, and the
    // name SCORE lists it under (`wall ab12`) was written nowhere on the wall,
    // so with two walls open nobody could tell which one to pick.
````

<a id="partitur-7"></a>
## partitur-7: demo/partitur/wall.mjs, module, line 150

````js
      // 🔴 THE ROUND TRIP THE TWO OLD PAGES NEVER HAD: SCORE and this tab join
      // the run's own room, SCORE hears the wall, links its light lane to it,
      // and a stripe chosen there arrives here. Only in this pass, and only in
      // the room the harness named, so nothing reaches `studio-1`.
````

<a id="partitur-8"></a>
## partitur-8: demo/partitur/wall.mjs, module, line 160

````js
      // ⚠️ NEGATIVE CONTROL: in the room and heard, but linked by nobody.
````

<a id="partitur-9"></a>
## partitur-9: demo/partitur/score.mjs, module, line 1

````js
// demo/partitur/score.mjs: the SCORE tab of /partitur/, the page as it was
// until 2026-10-05, when *"unify partitur and wall to tabbed page"* made the
// projection wall its second tab (`./wall.mjs`).
//
// WHAT CHANGED ON THE WAY IN, AND WHY:
//   1  🔴 IT JOINS THE ROOM ON A PRESS, NOT ON LOAD (`tab-page.mjs` rule 1):
//      Find walls, the first press on the transport bar, or a scene mark.
//   2  🔴 THE ROOM IS `?room=` WHEN THE PAGE HAS ONE, so a suite run no longer
//      announces a fake score into the owner's `studio-1`
//      (plans/plan-stage-patchbay.md F6).
//   3  The checks moved from load into the page's one SELFCHECK pass. They
//      are still all on data in hand, plus one round trip to a wall in WALL.
//   4  🔴 THE ROOM, THE ANNOUNCE AND `link.request` ARE `bay-node.mjs`'s SINCE
//      2026-10-06 (plans/plan-routing-migration.md step 1), the one join helper
//      `/patchbay/` and WALL use too. What it sends is unchanged.
````

<a id="partitur-10"></a>
## partitur-10: demo/partitur/score.mjs, module, line 30

````js
/*
 * 🔴 L. MOHOLY-NAGY, PARTITURSKIZZE ZU EINER MECHANISCHEN EXZENTRIK, 1924,
 * the fold-out plate in Bauhausbücher 4 (1925), played as a positron timeline.
 * Asked 2026-10-04 as *"Do it. Better name"* after
 * `research/moholy-nagy-partiturskizze-2026-10-04.md`. The plate was
 * transcribed from the public-domain scan by
 * `demo/resources/build-moholy-partiturskizze.mjs`, every row marked `seen`
 * or `inferred`, and this page only draws and plays what that file holds.
 *
 * ⚠️ NOTHING HERE IS TYPED IN SECONDS. Every position is a fraction of the
 * plate, because Moholy gave no unit, no tempo and no total length. The total
 * is a choice this page makes and says it made: the length control is the
 * only place a duration enters, and everything scales from it.
 * ⚠️ AND IT OPENS NOTHING. The data is a file in this repository and the
 * sirens are oscillators in this tab, started only by pressing play.
 */
````

<a id="partitur-11"></a>
## partitur-11: demo/partitur/score.mjs, module, line 54

````js
// `length` was a cell until 2026-10-05 and repeated the length control two
// blocks up; `links` says what the visitor cannot otherwise see, whether any
// lane is reaching anything.
````

<a id="partitur-12"></a>
## partitur-12: demo/partitur/score.mjs, module, line 61

````js
  // The plate's story was a THE SCORE block here until 2026-10-05; the tab's
  // `about` line says what it is now (*"rm top desriptions"*).
````

<a id="partitur-13"></a>
## partitur-13: demo/partitur/score.mjs, module, line 79

````js
  // ── the picture: the light column at the playhead, on the projection wall ─
  //
  // ⚠️ WHITE PAPER READ AS WHITE LIGHT IS AN INFERENCE, AND THE TRANSCRIPTION
  // SAYS SO. The colours are the scan's sampled means, so they are the colour
  // of a 2014 JPEG of a 1925 print, not of any lamp.
````

<a id="partitur-14"></a>
## partitur-14: demo/partitur/score.mjs, module, line 119

````js
  // ── the scenes lane: marks that recall a `/patchbay/` scene ───────────────
  //
  // 🔴 A MARK IS A RECALL AT A FRACTION OF THE SCORE, asked 2026-10-04. The
  // patchbay keeps scenes and lists their names in the room as `scene.list`;
  // a mark here sends `scene.recall` with one of those names when the playhead
  // passes it while PLAYING forward. A seek, a scrub or a length change moves the
  // playhead without passing anything, so it fires nothing.
  // ⚠️ MARKS LIVE IN THIS BROWSER, in `localStorage`, which may throw or come
  // back empty, so every read and write is wrapped and the lane works without it.
````

<a id="partitur-15"></a>
## partitur-15: demo/partitur/score.mjs, module, line 182

````js
    // Plain English since 2026-10-05: the plate's own words (I. Bühne, II.
    // Bühne, Licht, Ton) stay in the transcription and in the hit text.
````

<a id="partitur-16"></a>
## partitur-16: demo/partitur/score.mjs, module, line 224

````js
  // ── the light lane as a patchbay source ───────────────────────────────────
  //
  // 🔴 A LANE WITH A DESTINATION, asked 2026-10-04 (*"how universl patchbay
  // and timeline relate"*, then *"Yea"*). Moholy bound his columns to stages;
  // this binds the light lane to a port. The page announces the lane in the
  // studio's room as an out port, lists every wall it hears (the WALL tab), and a pick is a
  // link checked by `bay.mjs` like any other. Once linked, every change of
  // stripe at the playhead goes to that wall, playing or scrubbing.
````

<a id="partitur-17"></a>
## partitur-17: demo/partitur/score.mjs, module, line 234

````js
  /*
   * 🔴 THREE LANES, THREE OUT PORTS, asked 2026-10-04 (*"Do"*): the light lane
   * to a wall's light, the Ton lane's siren bands to any MIDI input in the room
   * (a board input like the Circuit, or a board synth), and the stage cues to a
   * wall's captions. Each pick is a link `bay.mjs` checks, and `/patchbay/` can
   * ask for the same link with `link.request`, which this page answers.
   */
````

<a id="partitur-18"></a>
## partitur-18: demo/partitur/score.mjs, module, line 344

````js
  /*
   * 🔴 THE ROOM IS JOINED ON A PRESS, NOT ON LOAD: Find walls, the first press
   * on the transport bar, or a scene mark that needs the room. The old page
   * joined `studio-1` the moment it opened (`tab-page.mjs` rule 1).
   */
````

<a id="partitur-19"></a>
## partitur-19: demo/partitur/score.mjs, module, line 421

````js
  /*
   * 🔴 THE PICTURE AND THE TIMELINE FIRST, ONE SURFACE, AND THE LINKING UNDER
   * THEM. Until 2026-10-05 the tab stacked the length, Find walls, three link
   * picks, a sentence about scenes and the mark row ABOVE the picture, about
   * 650 px at the desk and 960 on a phone before the thing a visitor came to
   * see, and the three picks read `none` with nothing to pick until the room
   * was joined. Now the picks and the scene marks appear when the room is
   * joined (or when this browser already keeps marks), so what a first visit
   * shows is the score, its length, and one button.
   */
````

<a id="partitur-20"></a>
## partitur-20: demo/partitur/score.mjs, module, line 451

````js
  // ── sirens, only while playing ─────────────────────────────────────────────
  //
  // ⚠️ SOUND NEVER GATES THE WORK. The context is made on the first play press
  // and its resume is not awaited; the picture and the line run without it.
````

<a id="partitur-21"></a>
## partitur-21: demo/partitur/score.mjs, module, line 485

````js
  /* 🔴 THE LANES' DESTINATIONS ARE DRIVEN FROM A TIMER TOO, NOT ONLY FROM THE
     ANIMATION FRAME. MEASURED 2026-10-04 with three tabs: /partitur/ behind
     another tab stopped sending entirely, because a browser pauses
     `requestAnimationFrame` in a hidden tab, while a wall in another room went
     on waiting. A timer still runs there, about once a second, so a wall keeps
     following a score that nobody is looking at. Each send is a no-op unless
     its value changed, so running it from both is free. */
````

<a id="partitur-22"></a>
## partitur-22: demo/partitur/score.mjs, module, line 547

````js
        // ⚠️ NEGATIVE CONTROL: the wall at the start is the first stripe, black,
        // and at the longest darkness is black, and at a yellow stripe is not.
````

<a id="partitur-23"></a>
## partitur-23: demo/partitur/score.mjs, module, line 600

````js
        // ⚠️ NEGATIVE CONTROLS: a seek over the mark, and a scrub over it while paused.
````
