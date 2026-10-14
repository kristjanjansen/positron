# Page comments: slides

The full comments cut from the code under demo/ for slides, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="slides-1"></a>
## slides-1: demo/slides/index.html, inline script, line 12

````js
  // The sample and the system. Every slide engine piece (rendering, the scale,
  // the faces, the marks, navigation, keys, full screen, notes, the checks)
  // lives in /slides/deck.mjs and /slides/deck.css since 2026-10-05, shared
  // with /talk/. What is left here is the talk itself.
````

<a id="slides-2"></a>
## slides-2: demo/slides/index.html, inline script, line 28

````js
  /**
   * The machines, as `diagram.mjs` draws them. Declared here rather than
   * inside the live element because the words on other slides take their hue
   * from the same boxes: `createDeck` reads its `hues` off this, so a box that
   * changes its `tech` changes the word on every slide with it. Each note
   * names other boxes in **bold**, which the diagram draws in that box's hue,
   * and that rendered word is what the self-check compares the slides against.
   * A top level box's `desc` is what the box is, set by the deck as slide text
   * under its column; the diagram itself draws names only (deck.mjs,
   * `liveDiagram`, asked 2026-10-05: *"do not use diagram native descs below
   * but use slides text and postion"*).
   */
````

<a id="slides-3"></a>
## slides-3: demo/slides/index.html, inline script, line 50

````js
          // 1 to 2 ms: PROGRESS.md:3472, the DO hop MEASURED +1.0, +1.6 and
          // +0.8 ms over three runs against the runtime's own ping.
````

<a id="slides-4"></a>
## slides-4: demo/slides/index.html, inline script, line 72

````js
  // ── the talk ──────────────────────────────────────────────────────────────
  // `say` is the headline at step 4: one sentence, no full stop, no colon,
  // semicolon, dash or middot, two lines in every face (asserted). The widest
  // face, Atkinson at 0.632 em, holds 18 characters a line at step 4 (MEASURED,
  // logged by the check), so two lines hold 36 and every headline is written
  // to wrap greedily into two lines of 18. What proves it is ONE of: `big` (one figure
  // at step 6), `list` (up to three lines), `rows` (a table of text padded
  // into character columns), `stack` (figures whose decimal points line up)
  // or `live` (a running part). Evidence is at step 3, or step 2 when it has
  // four rows, because four rows at step 3 do not fit under a two line
  // headline. `statement: true` makes `say` the whole slide at step 5, up to
  // three lines, 12 characters a line in Atkinson.
  // `cap` is the caption at step 1, bottom left, and `link` the slug it points
  // at, written out as a full URL. A link is not a fetch.
  //
  // THE ACCENT: `*26.2*` in any string paints those characters in `--hi`, on
  // what carries the point and never on every word (the owner, 2026-10-05:
  // *"do not have be on single one"*, so a slide may have two).
  // THE HUES: `[Pi|Raspberry Pi]` paints `Pi` in the hue the diagram of the
  // machines gives its box called Raspberry Pi, so a word on any slide is
  // joined by colour to the box it means. Only the two outer boxes that paint
  // a hue, Cloudflare and Raspberry Pi: MEASURED 2026-10-05, the diagram
  // colours a bold name in a note only for a top level box (page, relay and
  // synths came back plain bold), so a word joined to an inner box would have
  // nothing on screen to match.
  // The check reports both counts per slide and their contrast.
  //
  // 🔴 EVERY NUMBER ON A SLIDE IS A MEASURED ONE, AND ITS SOURCE IS THE
  // COMMENT ABOVE IT. A number with no comment is a defect.
  //
  // `rows` is { head, body, align }: `align` is one letter a column, l or r,
  // and the widths are worked out from the longest cell, so a column is a
  // character position. Rows are written to Atkinson's 27 characters at step 3.
````

<a id="slides-5"></a>
## slides-5: demo/slides/index.html, inline script, line 106

````js
    // ── what this is ──
    // 46 rows and 44 built: CLAUDE.md's count command over the manifest, run
    // 2026-10-05, printed `46 44`. Counted, never remembered. (The command is
    // not quoted here because the build reads an import in a comment as real.)
````

<a id="slides-6"></a>
## slides-6: demo/slides/index.html, inline script, line 120

````js
    // PROGRESS.md:4712-4719, both browser to Cloudflare to browser, burned
    // pixels: MoQ p50 26.2 / p95 42.4 / p99 104.8 ms (n=2740, PROGRESS.md:6624),
    // WHEP p50 67.0 / p95 76.9 / p99 84.1 ms (n=17,501, PROGRESS.md:4712).
    // Quicker is the median, steadier is the p99 under MoQ's. No hue: both
    // ride Cloudflare, and diagram.mjs's TECH_HUE has no entry that tells the
    // two transports apart, so the two winning figures are the yellow instead.
````

<a id="slides-7"></a>
## slides-7: demo/slides/index.html, inline script, line 137

````js
    // plans/plan-away-webrtc.md:212-214, laptop and Pi on one network: key
    // press to speakers ~175 ms over the relay, ~48 ms over a direct WebRTC
    // data channel. Another network is NOT measured (:216-217), which the
    // caption says.
````

<a id="slides-8"></a>
## slides-8: demo/slides/index.html, inline script, line 143

````js
    // research/circuit-archive-2026-09-21.md:253-256: 3 sessions with no note
    // events and 29 with, so 32; plans/plan-circuit-editor.md:65: 64 patches,
    // all 350 bytes.
````

<a id="slides-9"></a>
## slides-9: demo/slides/index.html, inline script, line 158

````js
    // ── how it is built ──
    // 167: `ls demo/shell/*.mjs | wc -l`, 2026-10-05.
````

<a id="slides-10"></a>
## slides-10: demo/slides/index.html, inline script, line 175

````js
    // ── what it learned ──
    // positron-streaming SKILL.md:228-230, a 13 point sweep of each 2 h window
    // on 2026-09-06: etv refused its newest ~45 min, etv2 its oldest ~78 min,
    // etvpluss nothing. The 2 h is plans/plan-live-timeline.md:42, 3750
    // segments of 1.92 s.
````

<a id="slides-11"></a>
## slides-11: demo/slides/index.html, inline script, line 187

````js
    // research/cf-models-speech-to-patch-2026-09-21.md:243-244: Workers AI,
    // llama 3.3 70B, a patch from a sentence: loose schema 1.6 s, one branch
    // per operation 10.2 to 11.6 s and looping until the tokens ran out.
````

<a id="slides-12"></a>
## slides-12: demo/slides/deck.mjs, module, line 1

````js
// demo/slides/deck.mjs, the slide deck engine.
//
// A talk is a list of slide objects. This module turns the list into slides
// inside a `createVideoPanel`, steps them, presents them full screen, sets them
// in JetBrains Mono, shows speaker notes when asked, and grades
// the result. `/slides/` (the sample and the system) and `/talk/` (the talk
// about positron) both import it from `/slides/deck.mjs` and link
// `/slides/deck.css`; neither page carries deck code of its own.
// plans/plan-slides.md has the research, the scale and the slide model.
//
// ⚠️ ONE DECK A PAGE. The word hues are module state, set by `createDeck` from
// the diagram it is told lends them, so two decks on one page would share one
// map. Nothing here needs two.
````

<a id="slides-13"></a>
## slides-13: demo/slides/deck.mjs, module, line 25

````js
// ── the face ────────────────────────────────────────────────────────────────
// ONE FACE SINCE 2026-10-12. This was seven self-hosted monospaced faces behind
// a picker, with `?face=plex` in the address, and JetBrains Mono the default
// since 2026-10-05 (*"jetbrains default"*, plans/plan-slides.md section 9).
// plans/plan-fonts-minimal.md cut the site to JetBrains Mono and Geist, so the
// other six left with their files, the picker went (a choice of one is not a
// choice) and `?face=` is ignored. `FACES` stays a list so the measuring pass
// below, which loops over it, reads the same with one entry.
````

<a id="slides-14"></a>
## slides-14: demo/slides/deck.mjs, module, line 38

````js
// ── the marks in a slide string ─────────────────────────────────────────────
// `*x*` paints x in `--hi`, on what carries the point. `[x|box]` paints x in
// the hue the deck's diagram gives its box called `box`, so a word on any
// slide is joined by colour to the box it means. Only boxes that paint a hue
// lend one, and MEASURED 2026-10-05 the diagram colours a bold name in a note
// only for a top level box (page, relay and synths came back plain bold), so
// a word joined to an inner box would have nothing on screen to match.
````

<a id="slides-15"></a>
## slides-15: demo/slides/deck.mjs, module, line 102

````js
/**
 * A stack of figures, label and number and unit per row. `rows` is
 * [label, value, unit]; a live stack sets a value later through `set(i, t)`.
 */
````

<a id="slides-16"></a>
## slides-16: demo/slides/deck.mjs, module, line 118

````js
// ── live elements ───────────────────────────────────────────────────────────
// A slide's `live(host)` is called the first time the slide is shown, because a
// box in a hidden slide measures 0, and the element runs only while its slide
// is the one on screen. None of them opens a connection. Each returns
// { start, stop, value, subject }, `windowMs` when its value moves slower than
// every frame so the check knows how long to look, and `fit` when it scales
// itself to the slide, so the check can re-fit it synchronously.
````

<a id="slides-17"></a>
## slides-17: demo/slides/deck.mjs, module, line 152

````js
  // `frames` is there because `fps` alone does not move on a screen locked to
  // its refresh rate: MEASURED in headless Chrome, 60.0 for a whole second.
````

<a id="slides-18"></a>
## slides-18: demo/slides/deck.mjs, module, line 196

````js
/**
 * A diagram, drawn by `diagram.mjs`, a lit box walking through it.
 *
 * 🔴 BOX NAMES ONLY, AND WHAT EACH TOP LEVEL BOX IS GOES UNDER ITS COLUMN AS
 * SLIDE TEXT. Asked 2026-10-05: *"do not use diagram native descs below but
 * use slides text and postion"*. So every `sub` and every link `label` is
 * taken out before the diagram sees the spec, the diagram's own caption line
 * is not shown on a slide (deck.css), and a top level node's `desc` is set at
 * step 1 in the chosen face, one line under that box, centred on it. A desc
 * may carry the same marks as any slide string.
 * The row is reserved before the picture is fitted (two lines of step 1 and
 * half a line of air), so the picture and its words are centred together.
 */
````

<a id="slides-19"></a>
## slides-19: demo/slides/deck.mjs, module, line 306

````js
/**
 * A step grid from the kit at a tempo this slide made up, and the time each
 * step lands behind its own mark, in ms, under it. The grid's clock is a frame
 * clock (`step-grid.mjs`: the step is a function of the clock, read once a
 * frame), so a step can only appear on the first frame after its time, and
 * what the stack prints is how long after.
 */
````

<a id="slides-20"></a>
## slides-20: demo/slides/deck.mjs, module, line 344

````js
// ── the deck ────────────────────────────────────────────────────────────────
//
// A slide object:
//   name       short id for the log and the checks, lowercase
//   say        the headline at step 4: one sentence, no full stop, no colon,
//              semicolon, dash or middot, two lines in every face (asserted)
//   statement  true makes `say` the whole slide at step 5, up to three lines
//   big        one figure at step 6
//   list       up to three lines
//   rows       { head, body, align }, a table of text padded into character
//              columns; `align` is one letter a column, l or r
//   stack      [label, value, unit] rows whose decimal points line up
//   live       a builder, see above
//   cap        the caption at step 1, bottom left
//   link       the slug the caption links, written out as a full URL; '' is
//              the front page. A link is not a fetch.
//   notes      what to say, shown under the panel only with `?notes=1`
//
// 🔴 EVERY NUMBER ON A SLIDE IS A MEASURED ONE, AND ITS SOURCE IS THE COMMENT
// ABOVE THE SLIDE IN THE PAGE. A number with no comment is a defect.
````

<a id="slides-21"></a>
## slides-21: demo/slides/deck.mjs, module, line 453

````js
  // The face, one since 2026-10-12, so there is no picker and the address
  // carries no `?face=`.
````

<a id="slides-22"></a>
## slides-22: demo/slides/deck.mjs, module, line 489

````js
  // Keys. A clicker sends PageUp and PageDown (Logitech R400), F5 and Escape
  // from its play button, and a full stop from its blank button. Escape leaves
  // full screen as well as the browser's own Escape does on the real API, so
  // the fallback cover leaves on it too, and on a desktop, where deck.css
  // hides the way-out button over a slide, Escape, `f` and F5 are the way out.
````

<a id="slides-23"></a>
## slides-23: demo/slides/deck.mjs, module, line 620

````js
  // The face in before counting requests. It loads from `/shell/vendor/`,
  // the files every page of the site ships, since 2026-10-12.
````

<a id="slides-24"></a>
## slides-24: demo/slides/deck.mjs, module, line 702

````js
  // ── the measuring pass: every slide, every face, two widths ──
  // Every slide is laid out at once, unseen, so each face at each width is one
  // synchronous layout. A fitted picture is re-fitted by hand on every slide,
  // because its ResizeObserver does not run inside a synchronous loop.
````

<a id="slides-25"></a>
## slides-25: demo/slides/deck.mjs, module, line 902

````js
  // Every hued word is the colour the diagram itself draws that box's name
  // in. Each box's note names others in bold, and the diagram paints a bold
  // name in its box's hue, so focusing every box gives one rendered word per
  // box to compare against. The caption line is not shown on a slide, and a
  // computed colour does not need it to be.
````
