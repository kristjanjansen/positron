# Page comments: floor

The full comments cut from the code under demo/ for floor, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="floor-1"></a>
## floor-1: demo/floor/build-tiles.mjs, module, line 1

````js
// demo/floor/build-tiles.mjs — the tiles `/floor/` stands on.
//
//   node demo/floor/build-tiles.mjs            # fetch what is missing, politely
//   node demo/floor/build-tiles.mjs --limit 40 # a slice, for a quick look
//
// WHY A FIXTURE AND NOT A LIVE CALL. The floor needs a thumbnail path per film,
// and the archive publishes it only inside each film's own content record — one
// request per film. Doing that from the page would be ~300 requests on load, to
// somebody else's archive, every time anybody opens it. So it is fetched ONCE,
// here, spaced, with a user agent that says who we are, and the result is a
// static file the page reads in a single GET.
//
// ⚠️ RESUMABLE ON PURPOSE. It reads whatever it wrote last time and only asks
// about films it has no photo for, so an interrupted run costs nothing and a
// re-run is nearly free. An archive is not a thing to hammer because a script
// crashed halfway.
//
// ⚠️ AND IT DOES NOT INVENT A MISS. A film with no thumbnail is written with
// `photo: null` rather than left out, so the next run knows it was ASKED and
// answered nothing — otherwise "missing" and "not yet fetched" are the same
// state and every run re-asks the same hopeless items forever.
````

<a id="floor-2"></a>
## floor-2: demo/floor/build-tiles.mjs, module, line 66

````js
      // ⚠️ `info.photoUrl` is the RELATIVE path the resizer takes —
      // `thumbnails/<year>/<file>.jpg` — and `videoPhotoUrl` is the same file
      // as an absolute URL on a host that sends no CORS. The relative one is
      // what travels, because the page asks our own origin for it.
````

<a id="floor-3"></a>
## floor-3: demo/floor/index.html, style, line 17

````css
  /* 🔴 FULLSCREEN NEEDS THE PAGE TO GIVE UP ITS OWN BOX, AND THIS PAGE DID NOT.
     `.fl` sets `aspect-ratio: 16/9` and `position: relative`, and both survive
     being made fullscreen — so the cover applied and the floor stayed a 16:9
     rectangle in the middle of a black screen, which reads as a button that did
     nothing. `.fl.pos-full` is (0,2,0) and beats `.fl` on specificity rather
     than on source order, which is the repair shell.css records for `.pos-faux`
     losing to a page's own `.pane { position: relative }`.
     ⚠️ `.fl.pos-full`, never `.fl:fullscreen, .fl.pos-full` — a browser that
     does not know that pseudo-class DISCARDS THE WHOLE SELECTOR LIST, which
     would delete the fallback on exactly the browsers that need it. */
````

<a id="floor-4"></a>
## floor-4: demo/floor/index.html, style, line 29

````css
  /* ⚠️ THE `.pos-controls button.ico` RULE THAT USED TO SIT HERE IS GONE, AND
     SO IS THE ONE IN EVERY OTHER PAGE. It never matched: `mount()` has never put
     an `ico` class on a control. `shell.mjs` stamps `data-glyph` on a control
     whose whole label is one non-letter and `shell.css` squares it, once, for
     every page — see the note there.
     🔴 AND REMOVING IT COST THIS PAGE ITS OWN BOX. The regex that took the dead
     rule out matched `[^}]*` and swallowed the three rules above with it, so
     `.fl` lost `aspect-ratio`, `min-height` and `position: relative`: the canvas
     had no height, and `a click on a tile` found no tile because the box it
     clicks into was zero pixels tall. Every other assert on the page still
     passed, because a shader, a matrix and a fade do not care how big the
     element is. MEASURED at 294 of 298 tiles loaded and 60 fps, with the click
     hitting nothing — which is what sent the diagnosis looking at ERR. */
````

<a id="floor-5"></a>
## floor-5: demo/floor/index.html, style, line 43

````css
  /* The title of whatever is under the pointer, AT THE TOP OF THE PICTURE since
     2026-09-19: "move active title comments to top". A FIXED BOX: it is written
     on every frame the gaze moves, and a caption that can change its own height
     would push the picture about while somebody is looking at it.
     ⚠️ THE SCRIM TURNS OVER WITH THE BOX. It ran clear at the top edge and
     opaque from 55% down, which put the dark end under the words. Moved to the
     top and left alone, the words would have been sitting on the clear half of
     their own scrim, over whatever the floor happens to be showing.
     ⚠️ AND IT TAKES THE WHOLE WIDTH AGAIN. It carried 124 px of right-hand
     padding for one session, to keep a long title from running under the
     `Esc to leave` badge that sat at `top: 12px; right: 14px`. That badge is
     gone and its replacement is `.pos-fsx`, a 34 px square at `bottom: 12px;
     right: 12px`. The caption holds y 0 to 46 and the button holds the last
     46 px before the bottom edge, so the two can only meet in a box under about
     92 px tall, and this one is never shorter than 280. */
````

<a id="floor-6"></a>
## floor-6: demo/floor/index.html, style, line 63

````css
  /* The title takes whatever room is left and the date keeps its own. The date
     is LAST now, so without this a long title would push it off the end of the
     box and the one part of the caption that is always the same length would be
     the part that is always missing. */
````

<a id="floor-7"></a>
## floor-7: demo/floor/index.html, style, line 69

````css
  /* 🔴 THE DATE IS NOT AN ACCENT. It was `--hi`, which is this project's one
     accent and is spent on what is CHOSEN or LIVE. A date is neither: it is the
     same fact for every tile on the floor, and painting it yellow made the one
     constant in the caption the loudest thing in the picture. Asked for
     2026-09-19: "move date field last and lose yellow". */
````

<a id="floor-8"></a>
## floor-8: demo/floor/index.html, style, line 75

````css
  /* 🔴 THE WAY OUT, WHERE YOU CAN SEE IT. Asked twice: "how do I get out?", and
     the answer had been going into the LOG, which is outside the cover and so
     invisible at exactly the moment somebody needs it. A page that fills the
     screen has to carry its own exit on the screen it filled.
     🔴 AND THE BADGE THAT USED TO LIVE HERE SAID `Esc to leave` TO A PHONE.
     Reported from an iPhone 2026-09-19: "I can not leave fullscreen on mobile".
     An iPhone has no element Fullscreen API, so it always takes the faux cover,
     which is `position: fixed; inset: 0` over the control row holding the ⛶
     that got you in; and it has no Escape key to read the badge's advice with.
     A word is not a way out. `createFullscreenExit` from `fullscreen.mjs` puts
     a real button inside this box, bottom right, styled as `.pos-fsx` in
     `shell.css`, and every rule the old badge had a reason for is in there:
     it lives in the DOM and only its opacity moves, and it is
     `pointer-events: none` while faded so the corner of the picture cannot
     exit for somebody reaching for the picture. */
````

<a id="floor-9"></a>
## floor-9: demo/floor/index.html, inline script, line 104

````js
  // ── the field ───────────────────────────────────────────────────────────
  // 🔴 THE TILE IS 4:3, WHICH IS WHY THERE IS NO GAP. A square quad showing a
  // 4:3 thumbnail squashes every picture, and a gap was hiding that by putting
  // a black line between two distortions. Make the quad the picture's own shape
  // and the grid tiles EXACTLY — no gap to choose, nothing stretched, and the
  // floor reads as one surface rather than as a spreadsheet.
````

<a id="floor-10"></a>
## floor-10: demo/floor/index.html, inline script, line 111

````js
  // 🔴 THE FLOOR REPEATS, SO IT HAS NO EDGE AT ALL. 298 films laid once is a
  // shape with an outside, and walking to the outside of an archive is the one
  // thing it should not be possible to do. The block below is tiled infinitely:
  // every frame each tile is moved to the COPY OF ITSELF nearest your gaze, so
  // you can walk in any direction forever and the grid stays continuous.
  // ⚠️ A SQUARE PERIOD, and that is not decoration. 15 x 1.68 and 20 x 1.26 are
  // both 25.2 m, so the repeat distance is the same whichever way you walk — an
  // oblong period means the floor starts repeating sooner in one direction, and
  // the first thing anybody does is walk in a straight line.
  // ⚠️ 300 slots for 298 films, so two of them appear twice. Said out loud
  // because the alternative is two holes in an infinite floor, which reads as
  // something failing to load rather than as an archive being the size it is.
  // 🔴 THE PERIOD HAS TO BE BIGGER THAN WHAT YOU CAN SEE, AND IT WAS NOT.
  // MEASURED: at 15 x 20 the period is 25.2 m, so a tile jumps to its other
  // copy at 12.6 m from the gaze — where the fade (9 m to 16 m) still has it at
  // **alpha 0.48**. Half-visible pictures teleporting across the floor as you
  // turn is exactly "erratic". 21 x 28 puts the jump at 17.6 m, past the 16 m
  // where a tile is already gone, so no wrap is ever witnessed.
  // ⚠️ The cost is slots, not work: 588 of them, so each film appears about
  // twice — and only the ~192 with a texture are ever drawn, which is unchanged.
````

<a id="floor-11"></a>
## floor-11: demo/floor/index.html, inline script, line 134

````js
  // 🔴 A FIXED NUMBER OF TEXTURE SLOTS, AND IT IS WHY THIS DRAWS IN ONE CALL.
  // Every tile could have its own texture, and then a floor of 298 pictures is
  // 298 binds and 298 draws per EYE per frame. Instead the whole floor lives in
  // one `TEXTURE_2D_ARRAY` and one instanced draw: a tile's instance carries the
  // LAYER it is using, and a tile with no layer is not drawn at all.
  // 128 layers of 256x192 RGBA is ~25 MB, which a Quest has and a laptop will
  // not notice; it is also the LRU's capacity, so "how much can be on screen"
  // and "how much is kept" are one number rather than two that can disagree.
  // ⚠️ AND IT IS SIZED FROM LOAD_RADIUS, NOT PICKED. The disc the fade draws is
  // pi * 14^2 = 616 m^2 and a tile is 1.68 x 1.26 = 2.12 m^2, so it holds ~291
  // pictures; 320 layers covers that with room for the grid not lining up
  // neatly with a circle. 320 x 256 x 192 x RGBA is **63 MB**, up from 38 —
  // the price of never taking a picture back where somebody can see it.
  // ⚠️ UNMEASURED ON A HEADSET. A Quest has the memory; whether it likes
  // spending it here alongside a video texture is a number nobody has.
````

<a id="floor-12"></a>
## floor-12: demo/floor/index.html, inline script, line 150

````js
  // ⚠️ TWO RADII, AND THE GAP BETWEEN THEM IS THE POINT. Tiles are REQUESTED out
  // to LOAD_RADIUS and FADED OUT from FADE_FROM, so the edge of what has arrived
  // is never a boundary anybody can see — reported as "edge feels jagged", and
  // it was: a hard silhouette wherever the loader happened to have got to, which
  // changes shape as you look around. A ragged edge that is fully transparent
  // by the time it is reached has no shape to be ragged.
  // ⚠️ BOTH RADII SCALED WITH THE TILE. They are in METRES, so doubling the
  // tile without doubling these would have quartered how many pictures are in
  // the ring — the floor would look the same size and hold four times less.
  // ⚠️ BOTH INSIDE THE REPEAT DISTANCE. The period is 25.2 m; fading to nothing
  // by 16 m means the far side of what you can see is already gone before the
  // next copy of a film could arrive next to the first one.
  // 🔴 AND THE RADIUS IS A PROMISE THE TEXTURE POOL HAS TO BE ABLE TO KEEP.
  // 192 layers hold the 192 nearest tiles, which is a disc of
  // sqrt(192 * 1.68 * 1.26 / pi) = 11.4 m — so with the fade running out to
  // 16 m the pool ran dry at 11.4 and the LRU started taking pictures back off
  // tiles that were still 73% visible, instantly, with no fade at all. That is
  // the "edge tiles popping" this page was reported for, and no amount of
  // easing elsewhere could have touched it: the tile was not fading out, it was
  // being switched off. The pool now covers the radius (see LAYERS) and an
  // assert holds the two together, because they are edited independently.
  // 🔴 THE FADE STARTS MUCH FURTHER OUT THAN IT DID, BECAUSE THE WHOLE PICTURE
  // HAD GONE DARK. Shrinking the disc to fit the texture pool (below) moved
  // FADE_FROM in to 8 m, and at a 1.65 m eye height looking down a floor, 8 m
  // is most of what is on screen — so nearly every tile was part-way through
  // fading into the background and the archive read as a dim smear. The band is
  // 11 to 14 now: three metres rather than six, which is only a problem if the
  // thing it fades INTO is a different colour from the thing behind it, and
  // FLOOR_RGB exists so that it is not.
````

<a id="floor-13"></a>
## floor-13: demo/floor/index.html, inline script, line 182

````js
  // 🔴 ONE COLOUR FOR THE FLOOR, READ FROM ONE PLACE. A tile fades out to this
  // and the background is CLEARED to it, and for as long as they were two
  // different triples the ring of faded tiles was a visibly brighter disc laid
  // on a darker void — a rim nobody drew, at exactly the radius the fade was
  // supposed to be hiding. They were 0.055/0.066/0.086 against 0.027/0.035/0.051,
  // which is nearly a factor of two. Typed once now, so they cannot drift.
  // ⚠️ THE LIGHTER OF THE TWO IT USED TO BE. Averaging the tile's fade target
  // with the darker clear colour made the whole floor a shade darker than
  // either, which is the wrong way to settle a disagreement about a colour.
  // ⚠️ DARKER THAN THE PAGE AROUND IT, ON PURPOSE. This was `shell.css`'s own
  // background, which makes the picture continuous with the page — and a floor
  // of lit newsreels wants the opposite: the void behind them has to be further
  // away than the page is, or the tiles at the fade's edge read as sitting on
  // the document rather than receding into a room.
````

<a id="floor-14"></a>
## floor-14: demo/floor/index.html, inline script, line 200

````js
    /**
     * 🔴 ONE SENTENCE, AND IT IS THE INDEX'S OWN LINE. A page with a diagram
     * explains itself twice if it also carries a paragraph: the picture at the
     * bottom says what the machinery is, and prose above it says the same thing
     * in a weaker channel. Taken from the `one` line in `demo/manifest.mjs`, so
     * somebody arriving from the index is not told the same thing in two
     * wordings that can drift apart.
     * ⚠️ WHAT WENT: four sentences, the last of which explained two readout
     * cells. The row and the sentence about it were deleted in one edit,
     * because a page describing a row that is not there is worse than a page
     * describing nothing.
     */
````

<a id="floor-15"></a>
## floor-15: demo/floor/index.html, inline script, line 214

````js
    /**
     * 🔴 NO READOUT. ASKED FOR 2026-09-19: *"rm readout"*. It held `tiles`,
     * `loaded`, `reach` and `fps`, and three of the four were about the loader
     * rather than about the floor: how many slots had a picture, how far out
     * the pictures reached, how fast the frame ran. None of that is what
     * somebody came to this page for, and all of it sat above a picture that
     * shows it directly.
     * ⚠️ `loaded` WAS THE ONE LIVE FACT IN IT and it is not lost: the log says
     * how many pictures are down and how far they reach at the moment the floor
     * stops filling in. See `sayFilled` below. A counter that moves may not
     * live in a sentence, so it is said when it has stopped moving.
     * ⚠️ `null` RATHER THAN AN OMITTED FIELD, because the harness asks which
     * one it is: a page that MEANT to have no readout and a page whose author
     * forgot are the same DOM and a different claim. `createReport` hides a row
     * with no cells in it, so nothing else is needed here to keep an empty box
     * from painting its own border as a rule nobody wrote.
     */
````

<a id="floor-16"></a>
## floor-16: demo/floor/index.html, inline script, line 232

````js
    // ⚠️ THE SAME ⛶ `mirror` USES, AND FOR THE SAME REASONS. U+26F6 SQUARE FOUR
    // CORNERS is the conventional glyph and renders as TEXT rather than as an
    // emoji, so it takes the bar's colour and sits on its baseline instead of
    // arriving as a coloured picture at a size of its own; `title` and
    // `aria-label` carry the meaning for anyone the glyph does not reach.
    // ⚠️ SECONDARY AND PUSHED RIGHT (`end: true`). Fullscreen is not the verb
    // this page is about — it changes how much of the floor you see, not what
    // the floor does — so it sits apart from the control that starts something.
    // And there is no Stop: the film stops when you look away, because that is
    // the thing a person actually does, and a button for it is a second way to
    // say what they already said.
````

<a id="floor-17"></a>
## floor-17: demo/floor/index.html, inline script, line 244

````js
      // ⚠️ NEITHER IS PRIMARY, and that is right for this page. A primary is
      // the thing to press to make the demo happen; here the demo happens by
      // itself and you make it happen MORE by looking at a tile. Both of these
      // change where you are watching from, not whether anything is running.
````

<a id="floor-18"></a>
## floor-18: demo/floor/index.html, inline script, line 263

````js
  // ⚠️ THE PAGE SAYS WHICH RENDERER IT GOT, ALWAYS. A visitor on a software
  // rasteriser is a real visitor and the page should say so rather than quietly
  // being slow; `verify-gl.mjs` also checks this AGREES with what it found, so
  // the two cannot be describing different contexts.
````

<a id="floor-19"></a>
## floor-19: demo/floor/index.html, inline script, line 269

````js
    // ⚠️ THE RENDERER ALONE, WITH NO VENDOR PREFIX. `verify-gl.mjs` compares
    // this string to its OWN reading and both must be the same quantity — a
    // prettier `vendor · renderer` here fails a check that is not about
    // prettiness, it is about the two of them describing one context.
````

<a id="floor-20"></a>
## floor-20: demo/floor/index.html, inline script, line 293

````js
  // 🔴 THE LRU IS BY DISTANCE, NOT BY AGE. A least-recently-used slot is the
  // wrong thing to evict on a floor you walk over: the tile behind you was used
  // a moment ago and you are never going to look at it again, while the one
  // ahead has never been used and is about to be. Age would evict exactly the
  // tiles about to be needed.
  // 🔴 AND THE DISTANCE IS FROM THE EYE, NOT FROM THE GAZE — CHANGED, BECAUSE
  // IT WAS THE GAZE AND THAT MADE TURNING YOUR HEAD EVICT THINGS. The gaze
  // point slides metres in a frame when you look up, so the ordering it
  // produced re-sorted the whole floor as you looked around and the pool churned
  // while nobody had moved. Nothing you can see changes distance from your eye
  // when you turn, so an eye-ordered pool evicts only when you WALK, and then
  // only behind you. ⚠️ The GAZE still decides what is fetched FIRST — what to
  // keep and what to want next are two questions and they had been sharing one
  // answer.
````

<a id="floor-21"></a>
## floor-21: demo/floor/index.html, inline script, line 320

````js
    // 🔴 A TILE IS TURNED DOWN BEFORE IT IS TAKEN AWAY. This used to clear the
    // layer and set the alpha to 0 in the same breath, which is not a fade, it
    // is a disappearance — and the invariant below should mean it never happens
    // where anyone can see it. Should is not a guarantee, so this is the second
    // line of defence: a candidate that is still inside the fade is told to
    // fade (`img = false` makes the easing target 0) and keeps its layer; the
    // pump comes back for it next frame, by which time it is gone honestly.
    // ⚠️ THE TEST IS THE RADIUS AND NOT THE CURVE. Re-evaluating the shader's
    // smoothstep here would be a second copy of the one thing that decides what
    // is visible, and the two could disagree; at LOAD_RADIUS the curve is
    // exactly 0 by construction, so the radius answers the same question with
    // nothing to keep in step.
````

<a id="floor-22"></a>
## floor-22: demo/floor/index.html, inline script, line 471

````js
  // ⚠️ BEFORE linkProgram, NOT AFTER. `bindAttribLocation` only takes effect at
  // the NEXT link — called afterwards it is a no-op that reads like a fix, and
  // a Quest reported GL_INVALID_OPERATION on its first frame and drew correctly
  // anyway because the linker happened to choose the same slots.
````

<a id="floor-23"></a>
## floor-23: demo/floor/index.html, inline script, line 507

````js
  // the video texture — one, because one thing plays at a time
  // The still's own edge — a few per cent, enough to lose a scan border without
  // eating the picture. MEASURED by eye against the thumbnails, which is the
  // only instrument there is for "is there a black line at the edge".
````

<a id="floor-24"></a>
## floor-24: demo/floor/index.html, inline script, line 512

````js
  // ⚠️ THE VIDEO'S CROP IS COMPUTED, NOT GUESSED. A master that is 16:9 with a
  // 4:3 picture in it needs (1 - (4/3)/(16/9)) / 2 = 12.5% off each side, and a
  // master that is already 4:3 needs none — and which one a film is cannot be
  // known until it loads. Derived from `videoWidth`/`videoHeight` every time a
  // film starts, so a squarer master is not cropped into.
````

<a id="floor-25"></a>
## floor-25: demo/floor/index.html, inline script, line 537

````js
  // the pointer, from the kit — one ribbon, drawn once per eye. Built at load
  // rather than on entering a session: it is one program, and the first frame
  // of an immersive session is the worst moment in this page's life to compile
  // anything.
````

<a id="floor-26"></a>
## floor-26: demo/floor/index.html, inline script, line 562

````js
  // ⚠️ TWO DISTANCES, AND MIXING THEM IS WHAT MADE THE EDGE MOVE. `distEye` is
  // how far a tile is from YOU and answers everything spatial — what is visible,
  // what is worth keeping, which copy of a tile is the near one. `distGaze` is
  // how far it is from what you are looking at, and answers exactly one thing:
  // what to fetch FIRST. The gaze point can slide 6 m in one frame when you
  // pitch toward the horizon; your eye cannot.
````

<a id="floor-27"></a>
## floor-27: demo/floor/index.html, inline script, line 571

````js
  // ── loading, and the order it happens in ────────────────────────────────
  //
  // 🔴 NEAREST TO WHERE YOU ARE LOOKING FIRST, RE-SORTED AS YOU LOOK. Loading
  // the catalogue in order fills the floor from one corner and leaves the tile
  // under your nose blank while the far end of 1965 arrives. The queue is
  // rebuilt from the CURRENT gaze point every time a slot frees, so turning
  // your head changes what is being fetched rather than what is fetched next
  // after everything already asked for.
````

<a id="floor-28"></a>
## floor-28: demo/floor/index.html, inline script, line 580

````js
  /**
   * 🔴 WHERE `loaded` WENT WHEN THE READOUT WAS REMOVED. It was the one cell of
   * the four that was a live fact about this page rather than about its loader:
   * whether the floor is still filling in. It cannot become a sentence, because
   * a number that moves may not live in prose and this one moves every few
   * frames. So it is said ONCE, at the moment it stops moving.
   *
   * ⚠️ THE LATCH IS THE COUNT, NOT A FLAG. Walking arms the loader again and it
   * settles again somewhere new, which is a state change and worth a line; a
   * settle that arrives at the same number said nothing new and is dropped. The
   * alternative, a flag set once at the first settle, goes quiet for the rest of
   * the visit exactly where somebody is walking into unloaded floor.
   */
````

<a id="floor-29"></a>
## floor-29: demo/floor/index.html, inline script, line 625

````js
    // ⚠️ SAME-ORIGIN, WHICH IS THE WHOLE REASON `/err-img` EXISTS. The archive's
    // own image hosts answer 200 with NO access-control-allow-origin — measured
    // — so an `<img>` can DISPLAY them and `texSubImage3D` cannot READ them.
    // Asking our own origin makes the pixels ours to upload.
````

<a id="floor-30"></a>
## floor-30: demo/floor/index.html, inline script, line 631

````js
    // 🔴 `decode()`, NOT `onload`. THIS IS WHY SOME TILES CAME UP BRIGHT GREEN.
    // `onload` means the BYTES arrived; with `decoding: 'async'` the pixels may
    // not exist yet, and `texSubImage3D` then uploads whatever is in the decode
    // buffer — which on this machine was a flat green and, on the tile below it,
    // half an image in scanline bands. MEASURED first that the images really are
    // 256x192, because a size mismatch produces the same symptom and would have
    // been the obvious suspect: they are exactly the size asked for, so the size
    // was not it.
    // ⚠️ AND THE MONOCHROME FILTER WOULD HAVE HIDDEN THIS. Green becomes grey,
    // the tile stops looking broken and stays wrong. Fixed before it was added,
    // deliberately, and in that order.
````

<a id="floor-31"></a>
## floor-31: demo/floor/index.html, inline script, line 666

````js
  // ── the projector, where the film is ───────────────────────────────────
  //
  // 🔴 GATED ON THE PICTURE, NOT ON THE INTENT — AND THAT IS THE ONE THING THAT
  // CHANGED SINCE THIS PAGE LAST HAD ONE. The first projector came up during the
  // DWELL, on somebody ASKING for a film, so it sounded exactly the same whether
  // one ever played. For five rounds of "no playback" this page made the noise
  // of a working page while showing no film at all — feedback wired to the input
  // instead of to the outcome, which is the most expensive kind because it
  // actively argues that the broken thing works. It starts on a DECODED FRAME
  // now. If you hear it there is a picture.
  //
  // 🔴 IT COMES FROM THE TILE. A projector in stereo in front of you is a
  // soundtrack; one coming from the square of floor that is running is a machine
  // in a room, and the whole point of putting an archive on a floor is that it is
  // somewhere rather than on a screen. HRTF, a listener that follows the camera,
  // and a source at the playing tile's own metres — which works unchanged in a
  // headset, where the camera is your head.
  //
  // ⚠️ HALVED AGAIN — 0.125, from 0.25. It is a room a film is playing in, not a
  // film about a projector: the thing you should notice is when it STOPS.
  //
  // ⚠️ AND THE RAMP IS SET ONCE PER STATE CHANGE, ON THE AUDIO CLOCK. The old one
  // eased its gain a frame at a time; hide the tab, rAF stops, the gain freezes
  // wherever it got to and the scheduler carries on putting clatters out for
  // ever. A ramp handed to an AudioParam finishes whether or not anything draws.
  // Slow up and quick down, because a projector spinning up is a thing you want
  // to hear arrive and one still running after you stopped it is a thing that
  // will not take the hint.
  // ⚠️ A THIRD OF WHAT IT WAS. At 0.125 the machine was level with the film it
  // is supposed to be running; a projector you can hear over the soundtrack is
  // a projector in the wrong place. `projector.mjs` also puts the whole thing
  // behind a booth wall now, so this is quieter AND duller rather than just
  // turned down, which is what makes it recede instead of vanish.
````

<a id="floor-32"></a>
## floor-32: demo/floor/index.html, inline script, line 711

````js
      // ⚠️ A REFERENCE DISTANCE IN THE SAME UNITS AS THE FLOOR. The tiles are laid
      // out in metres, so these are metres; a default of 1 with a rolloff of 1
      // makes a projector two tiles away almost inaudible, which is not what a
      // room sounds like.
````

<a id="floor-33"></a>
## floor-33: demo/floor/index.html, inline script, line 732

````js
      // 🔴 THE MACHINE IS A PROPERTY OF THE FILM, NOT OF THE ORDER YOU PRESSED
      // THINGS IN. Cycling 0,1,2… would mean the same newsreel sounded different
      // every time you came back to it, and the floor would report your history
      // rather than itself. Taken from the film's own index, so a given film has
      // a given projector for ever — and because 298 films share 8 machines, two
      // tiles of the SAME film also sound the same, which is the honest answer.
````

<a id="floor-34"></a>
## floor-34: demo/floor/index.html, inline script, line 742

````js
      // ⚠️ THREE LEVELS, because any one of them alone leaves something running:
      // the gain, the clatter scheduler, and the context itself.
````

<a id="floor-35"></a>
## floor-35: demo/floor/index.html, inline script, line 752

````js
  /** Put the listener where the camera is and the machine where the film is.
   *  Called every frame in both the window and the headset — a POSITION may be
   *  driven from the render loop, because a frozen position is silent about
   *  nothing; it is a FADE that must never depend on drawing. */
````

<a id="floor-36"></a>
## floor-36: demo/floor/index.html, inline script, line 760

````js
    // ⚠️ TWO APIS, AND THE OLD ONE IS NOT DEAD. `positionX` and friends are
    // AudioParams and the modern path; Firefox still ships only the deprecated
    // setter, and a page that uses one and not the other is silent on half the
    // browsers there are. Both, with the AudioParam preferred.
````

<a id="floor-37"></a>
## floor-37: demo/floor/index.html, inline script, line 783

````js
  // 🔴 IN THE DOCUMENT, AND NOT `display: none`. A detached `<video>` is not
  // reliably decoded — the element played, `currentTime` moved on some browsers
  // and not others, and nothing ever reached the texture. `display: none` has
  // the same failure with better manners: a box that is not laid out can have
  // its decode dropped too. Off-screen and 2 px is a video the browser still
  // considers to be on the page.
  // ⚠️ And it is 2 px rather than 1: some decoders refuse a 1 px box.
````

<a id="floor-38"></a>
## floor-38: demo/floor/index.html, inline script, line 802

````js
    // 🔴 `state.length`, NOT `tiles.length` — AND THIS IS WHY CLICKING DID
    // NOTHING. `i` is a SLOT on the floor; `tiles` is the catalogue, and the two
    // are different lengths on purpose: 588 slots hold 298 films, so each film
    // appears about twice. Guarding a slot number against the catalogue's length
    // meant every slot numbered 298 or higher returned here without a word —
    // 290 of 588, and since the slots are laid out from the middle outwards, the
    // ones nearest the camera are numbered around 294, right on the edge of it.
    // So the floor mostly worked at the far edges and never where you were
    // standing, which is indistinguishable from "clicking does nothing".
    // ⚠️ AND I MADE IT MUCH WORSE WITHOUT TOUCHING THIS LINE. It was written
    // when the block was 15 x 20 = 300 slots for 298 films, where it killed
    // exactly two. Widening the grid to 21 x 28 to stop the wrap being visible
    // turned a two-slot edge case into 290 dead slots — a constant changed in
    // one place silently changing the meaning of a bound in another.
````

<a id="floor-39"></a>
## floor-39: demo/floor/index.html, inline script, line 577

````js
    // 🔴 THERE IS ONE VIDEO TEXTURE AND THE OUTGOING TILE WAS STILL READING IT.
    // `v` is a per-tile cross-fade easing over ~1.4 s, and `uVid` is a SINGLE
    // texture shared by every tile — so for that second and a half the tile you
    // just left was dissolving out while sampling the film you just started.
    // Reported as "different textures blend in on different videos", and that
    // is exactly what it was: not a blending bug, a bug about WHICH FILM the
    // fade was of. A cross-fade is only honest while the thing it is fading
    // from still exists, and here it stops existing the moment the next one
    // loads, so the outgoing tile goes back to its still at once.
````

<a id="floor-40"></a>
## floor-40: demo/floor/index.html, inline script, line 594

````js
      // ERR hands back a PROTOCOL-RELATIVE url; on a local http page that would
      // resolve to http and be blocked as mixed content on the deploy. Pin it.
      // 🔴 THE ASK MAY HAVE BEEN OVERTAKEN WHILE WE WERE WAITING. Two clicks a
      // second apart are two fetches, and the slower one can land last — which
      // would attach the film you did NOT ask for over the one you did, with
      // every number on the page still agreeing because both are real films.
      // `loadOne` already guards its own version of this for images; this had
      // no guard at all.
````

<a id="floor-41"></a>
## floor-41: demo/floor/index.html, inline script, line 604

````js
      // ⚠️ MMS, NOT canPlayType. `canPlayType('application/vnd.apple.mpegurl')`
      // answers "maybe" in Chrome AND in headless Chrome, so it cannot tell the
      // two paths apart — three demos played a dead picture behind a green
      // suite for exactly this. ManagedMediaSource is WebKit-only, so it is a
      // capability test rather than a brand check.
````

<a id="floor-42"></a>
## floor-42: demo/floor/index.html, inline script, line 635

````js
  // ── picking ─────────────────────────────────────────────────────────────
  //
  // ⚠️ ONE PICK FUNCTION FOR BOTH A MOUSE AND A CONTROLLER, because they are
  // the same question: a ray, and which flat rectangle it lands on first. The
  // mouse's ray comes out of the camera through the pointer; the controller's
  // comes out of its own pose.
  // ⚠️ AND IT IS NOT `xr-pick.mjs`, WHICH THIS FILE USED TO CLAIM WHILE
  // IMPORTING IT AND CALLING NOTHING. That module answers "where on this
  // arbitrarily-posed quad did the ray land", in the quad's own uv — which is
  // what a tablet's slider needs. The floor is one plane at y=0 with a grid on
  // it, so the question is a division and a lookup, and going through a general
  // quad intersection 588 times a frame would be slower AND less exact.
````

<a id="floor-43"></a>
## floor-43: demo/floor/index.html, inline script, line 651

````js
    // ⚠️ THE TILE IS NOT SQUARE ANY MORE, so a single half-extent would pick a
    // tile you are not over on one axis and miss one you are on the other.
````

<a id="floor-44"></a>
## floor-44: demo/floor/index.html, inline script, line 664

````js
  // ⚠️ 900 ms TO COMMIT, 2.5 s TO LET GO. The asymmetry is the whole design;
  // see the dwell block in `step()`.
  // 🔴 ONE TEMPO, AND IT IS A PROJECTOR'S. Everything that moves on this page
  // moves slowly and on the same clock: a still coming up, a film crossing over
  // it, the floor standing down, the glide across the disc. The first version
  // ran at interface speed — 300 ms eases, a 900 ms dwell — and it felt like a
  // file browser with pictures in it. Archive film has a pace of its own and
  // the page should not argue with it.
  // ⚠️ These are RATES, not durations: 1 / RATE is roughly the seconds to
  // settle. Kept together so "slower" is one edit and not six.
````

<a id="floor-45"></a>
## floor-45: demo/floor/index.html, inline script, line 675

````js
  // ⚠️ A FILM ARRIVES SLOWLY AND LEAVES QUICKLY, and the second number is not a
  // matter of taste: a look that has left has left, and a picture still
  // dissolving two seconds later is the page arguing about it. Same asymmetry
  // as the dwell and as the dim, for the same reason.
  // ⚠️ 2.2, DOWN FROM 0.7 — ABOUT HALF A SECOND RATHER THAN A SECOND AND A
  // HALF. The slow crossfade was written when the dissolve was the event; now
  // the dim has already happened and the film arriving is the PAYOFF, so a
  // long fade is just a wait with something moving in it.
````

<a id="floor-46"></a>
## floor-46: demo/floor/index.html, inline script, line 685

````js
  // ⚠️ THE FOCUS TRACKS THE DWELL CLOSELY — this one is FAST where the others
  // are slow, and that is the point rather than an inconsistency. What it drives
  // is already timed by the dwell (1.8 s), and it is the page's answer to "how
  // long do I have to hold this?"; easing it slowly on top would lag the answer
  // behind the question.
````

<a id="floor-47"></a>
## floor-47: demo/floor/index.html, inline script, line 691

````js
  // 🔴 THE FLOOR STANDS DOWN IN TWO STAGES AND STANDS BACK UP IN ONE. A glance
  // costs nothing. Holding your look takes everything else DIM_HOLD of the way
  // down, following the dwell, so the darkening IS the progress bar and the
  // thing it is filling toward is a film. Reaching the end takes the rest of
  // the floor the remaining way and starts the film in the same movement.
  // ⚠️ AND LETTING GO IS FAST WHERE TAKING HOLD IS SLOW, which is the same
  // asymmetry as the dwell itself and for the same reason: a look that wanders
  // over a tile must not commit, but a look that has genuinely left must not be
  // made to wait for the floor to catch up. Measured by running the easing at a
  // fixed 1/60 s, which is arithmetic and needs no browser — see the assert.
  // 🔴 0.7, UP FROM 0.45, BECAUSE THE HIGHLIGHT WAS REAL AND INVISIBLE. Driven
  // through `step()` the dim rises exactly as designed — and 0.45 of the way to
  // a 0.24 floor leaves the rest of the picture at 66% brightness, which on a
  // floor of dark grey newsreel is a change you cannot see. Reported as "not
  // hilite" twice. The mechanism was never the problem; the amount was.
````

<a id="floor-48"></a>
## floor-48: demo/floor/index.html, inline script, line 709

````js
  // ⚠️ 2 s TO LET GO, DOWN FROM 4. Still twice as patient as the dwell is quick,
  // which is the asymmetry that stops a wandering gaze cutting a film off — but
  // four seconds of a film still running at something you have already turned
  // away from is a page that will not take the hint.
  // ⚠️ 700 ms TO LET GO, DOWN FROM 2000. Two seconds was chosen to stop a
  // wandering gaze cutting a film off, and it does — but it also means a film
  // you have deliberately turned away from carries on playing for two seconds
  // behind your head, which reads as the page not listening. The dwell is still
  // more than twice as long, so the asymmetry that protects a wandering look is
  // intact; what is gone is the part that outlasted the intention.
  // 🔴 NOTHING STOPS A FILM EXCEPT ASKING IT TO, AND THE TIMER THAT USED TO IS
  // WHY "NO PLAYBACK" WAS REPORTED FOUR TIMES. There was an `AWAY_MS` here: if
  // what you were pointing at stopped being the tile that was playing, the film
  // was torn down. It made sense when RESTING YOUR LOOK was the only verb —
  // looking elsewhere really did mean you had moved on — and it survived the
  // move to a trigger and then to a click, where it means something quite
  // different: it means a film dies if your hand moves.
  // 🔴 AND I SHORTENED IT TO 700 ms ON REQUEST, WHICH MADE IT LETHAL. Two
  // seconds tolerated a wandering pointer. Seven hundred milliseconds does not
  // tolerate a twitch onto the next tile, and the tiles meet with no gap — so
  // the film you had just started was cancelled by the smallest movement you
  // can make while watching it. MEASURED: with the pointer pinned, the same
  // page reaches readyState 4 and 7.57 s of playback on the first try.
  // A film now runs until you start another or stop that one. `playTile` reads
  // a second ask on what is already running as "stop", which is the only way to
  // stop one and is the same gesture in both a window and a headset.
````

<a id="floor-49"></a>
## floor-49: demo/floor/index.html, inline script, line 738

````js
  // ⚠️ THERE IS NO GLIDE ANY MORE, AND THE ARGUMENT FOR IT IS KEPT BECAUSE IT
  // WAS A GOOD ONE THAT ANSWERED THE WRONG QUESTION. A click used to TRAVEL:
  // ease the camera until the clicked tile was under your gaze, and let the
  // dwell fire when you arrived — "a click travels, resting your look plays",
  // two verbs out of one gesture, and the far side of a disc this size really
  // is somewhere you want to GO. What it got wrong is that somebody clicking a
  // picture is asking to see it. Travelling is what dragging and the arrow keys
  // are for, and both of those say what they do while you do it.
  // 🔴 IN A HEADSET THE TRIGGER IS A HAND ON THE FLOOR, NOT A CLICK. Hold it and
  // drag, and the point you grabbed stays under the ray — the same verb the
  // mouse has, with the hand doing what the hand is for. A teleport-on-click
  // would be a different gesture for the same intention, and the one that needs
  // explaining.
  // ⚠️ IT MOVES THE WORLD, NOT THE HEAD. A headset's eye position comes from the
  // wearer's actual head and is not ours to write; the floor is ours. So the
  // drag accumulates a `shift` that is subtracted from the head pose, which is
  // the same picture and does not lie about where anybody is standing.
  //
  // 🔴 AND IT HAS WEIGHT, BECAUSE A RAY ON A FLOOR AMPLIFIES A TREMOR. The hand
  // holds an ANGLE and the floor reads a POSITION, and the gearing between them
  // is the distance down the ray: at 2 m a half-degree of hand shake is 17 mm
  // of floor, at 12 m it is 105 mm. Writing that straight into the world put
  // every bit of controller noise into the whole picture, and it read as
  // "noisy and stuttery" — which it was, and none of it was the frame rate.
  //
  // Three things, and they are ordinary physics rather than a filter chosen by
  // taste:
  //
  //  · the drag writes a TARGET, and the floor follows it with a time constant.
  //    Tremor is fast and small and the follow does not have time to reach it;
  //    a real hand movement is slower and larger and arrives in full.
  //  · the target is ABSOLUTE, not accumulated. `shiftT = hit - grab` each
  //    frame, so the lag never feeds back into the thing generating it — an
  //    accumulating version reads its own delay as more hand movement and
  //    either creeps or oscillates, depending on the rate.
  //  · letting go THROWS. The floor keeps the velocity it actually had and runs
  //    out over about half a second, so the far side of the disc is one flick
  //    away rather than four grabs.
````

<a id="floor-50"></a>
## floor-50: demo/floor/index.html, inline script, line 779

````js
  // ⚠️ HEAVIER THAN THE FIRST VERSION, WHICH WAS STILL TOO LIGHT TO STEADY THE
  // RAY. 5.5 settled in ~180 ms, which is fast enough to follow a tremor most
  // of the way there; 2.5 is ~400 ms and the hand shake never arrives at all.
  // The cost is honest and is the point: the floor is now something you have to
  // push, and it keeps going for about two seconds after you let go.
  // ⚠️ HEAVIER TWICE OVER: 5.5, then 2.5, now 1.6 — about 630 ms to settle, and
  // a flick that coasts for nearly three seconds. Each step was asked for after
  // wearing it, which is the only instrument there is for "heavy"; the ceiling
  // is that a floor slower than about a second stops feeling heavy and starts
  // feeling broken, because the connection between the hand and the picture is
  // no longer legible.
````

<a id="floor-51"></a>
## floor-51: demo/floor/index.html, inline script, line 814

````js
  /** Move the floor one frame: coast if nothing is held, then follow the target.
   *  ⚠️ THE THROW IS TAKEN FROM WHAT THE FLOOR DID, NOT FROM WHAT THE HAND
   *  ASKED. Differentiating the raw target would hand the flick every bit of
   *  tremor the follow was put there to remove, and a throw is the one moment
   *  that noise gets multiplied by half a second of coasting. */
````

<a id="floor-52"></a>
## floor-52: demo/floor/index.html, inline script, line 842

````js
    // Title, then series, then date. The title is what somebody is looking for
    // and it reads first; the date is the same shape on every tile and reads
    // last, where a constant belongs. Asked for 2026-09-19.
````

<a id="floor-53"></a>
## floor-53: demo/floor/index.html, inline script, line 854

````js
    // 🔴 A FINGER HAS NO HOVER, AND WITHOUT THIS A PHONE COULD NEVER PLAY
    // ANYTHING. `pointermove` is where the tile under the pointer is chosen,
    // and on a touchscreen that only fires WHILE you are touching — there is no
    // resting a finger over something without pressing it. So every route into
    // this page's one verb was a mouse-only route, and on a tablet the floor
    // was a picture you could push around and nothing else.
````

<a id="floor-54"></a>
## floor-54: demo/floor/index.html, inline script, line 874

````js
    // ⚠️ DRAG THE FLOOR, NOT THE CAMERA — both signs inverted from the first
    // version. The cursor is a grabbing hand, so the thing under it should
    // follow the hand: drag right and the floor goes right, which turns the
    // view LEFT. Moving the camera with the drag is the opposite of what the
    // cursor promises, and it is the sort of wrong only findable by using it.
    // ⚠️ HALF THE RATE, AND IT SETS A TARGET RATHER THAN THE ANGLE. At 0.004
    // rad/px a 250 px drag swung the view 57 degrees, which on a floor of
    // pictures is a lurch; and writing the angle straight from the pointer puts
    // every bit of mouse and trackpad noise directly into the camera. The
    // pointer moves a TARGET and the camera eases toward it, so the floor has
    // the weight of something being turned rather than something being nudged.
````

<a id="floor-55"></a>
## floor-55: demo/floor/index.html, inline script, line 891

````js
    // 🔴 A CLICK PLAYS. It used to TRAVEL — glide the camera until the tile was
    // under your gaze, and let the dwell fire when you got there — which is a
    // nice idea that answers the wrong question: somebody who clicks a picture
    // is asking to see it, not asking to stand nearer to it. And it was the
    // only thing a tap could do, so on a phone the page had no way to play
    // anything at all. Travelling is still there and is what dragging is for.
    // ⚠️ 6 px of travel still separates a click from a drag, unchanged — the
    // same threshold the headset's hold uses in metres.
````

<a id="floor-56"></a>
## floor-56: demo/floor/index.html, inline script, line 902

````js
  // ⚠️ AND THE ARROWS STOP SCROLLING THE PAGE. A floor you walk with the arrow
  // keys, inside a document that scrolls with the arrow keys, means every step
  // forward also scrolls the picture off the screen.
````

<a id="floor-57"></a>
## floor-57: demo/floor/index.html, inline script, line 939

````js
    // walking
    // ⚠️ ARROW KEYS, AND ONLY ARROW KEYS. W A S D is a convention you have to
    // already know; arrows are on the key caps. This page is a floor of archive
    // film, not a game, and its visitor is somebody who wanted to look at 1965.
````

<a id="floor-58"></a>
## floor-58: demo/floor/index.html, inline script, line 960

````js
    // ── the dwell ──────────────────────────────────────────────────────
    //
    // 🔴 LOOKING AT SOMETHING IS THE ONLY INPUT A HEADSET ALWAYS HAS, so it is
    // the one this page is built on and the mouse borrows it. Hold your look on
    // a tile and it plays; look away and it stops. A click still works and is
    // just an impatient dwell.
    // ⚠️ THE LOOK-AWAY IS SLOWER THAN THE LOOK-AT, deliberately and by a lot.
    // Gaze wanders — a tracker jitters, a head drifts, a pointer crosses a tile
    // on its way somewhere — and a symmetric timer makes a film that starts and
    // stops while you are trying to watch it. Slow to commit, much slower to
    // let go.
    // ⚠️ IN A HEADSET THE DWELL IS A HOLD, NOT A LOOK. `hover` is set by the
    // trigger going down and cleared when it comes up or when the hold turns
    // into a pan, so this same line means "how long have you held it" there and
    // "how long have you rested the pointer" on a screen, with no branch.
    // ⚠️ IN A HEADSET A HOLD ON THE PLAYING TILE IS ALLOWED, and it is the only
    // way to stop a film there — `playTile` reads a second hold on what is
    // already running as "stop". On a screen that would fire every time the
    // pointer came to rest on the film you are watching, so it stays excluded.
    // ⚠️ THE DWELL IS A WINDOW-ONLY THING NOW. A headset has a trigger, and a
    // trigger is a better answer to "did you mean that?" than any length of
    // time — so there is nothing to wait for there and nothing to explain.
````

<a id="floor-59"></a>
## floor-59: demo/floor/index.html, inline script, line 987

````js
    // the fades, per tile, every frame — an image eases up when it lands and a
    // video eases over the still it replaces
    // ⚠️ ONE EASING, WRITTEN ONCE. This was `s.a += (target) - s.a > 0 ? k*(1-s.a)
    // : -k*s.a`, which happens to evaluate correctly and cannot be read — the
    // `?:` binds after the `-` and the `>`, so whether it was the intended
    // expression took working the precedence out by hand. A line nobody can
    // check by looking at it is a line that will be edited wrongly.
````

<a id="floor-60"></a>
## floor-60: demo/floor/index.html, inline script, line 995

````js
    // ⚠️ A MUCH SLOWER EASE FOR THE DIM — about three seconds to settle. It is
    // the room lights going down, not a cut, and at the page's own 3.2 rate it
    // read as the floor flinching.
    // ⚠️ `playing >= 0` BEFORE `vidReady`, and it is not a detail. playTile()
    // zeroes the dwell and sets hover === playing, so between the moment a film
    // is asked for and the moment it decodes, BOTH branches below would read 0
    // — the floor would stand straight back up and then go down again a second
    // later, which is a flinch at exactly the point the page is committing.
````

<a id="floor-61"></a>
## floor-61: demo/floor/index.html, inline script, line 1005

````js
      // ⚠️ ONLY THE WINDOW'S DWELL FILLS THIS. In a headset `dwell` never moves,
      // so a tile that is merely under the ray takes nothing down — the lift on
      // the tile itself is the whole of "you are pointing at this", and the
      // floor only stands down once you have actually clicked.
````

<a id="floor-62"></a>
## floor-62: demo/floor/index.html, inline script, line 1014

````js
      // ⚠️ THE FILM CROSSES SLOWER THAN THE STILL ARRIVES. They are different
      // events: one is a picture appearing where there was none, the other a
      // dissolve between two pictures of the same thing, and a dissolve that
      // keeps up with a fade-in reads as a cut.
````

<a id="floor-63"></a>
## floor-63: demo/floor/index.html, inline script, line 1020

````js
      // ⚠️ TWO VALUES, BECAUSE THEY ARE TWO FACTS. `f` is "the ray is on this",
      // which is a lift and nothing else; `c` is "this is the one you chose",
      // which is an exemption from the dim and nothing else. One number doing
      // both is what put a hole between the click and the picture.
````

<a id="floor-64"></a>
## floor-64: demo/floor/index.html, inline script, line 1100

````js
  // 🔴 THE WAY BACK IS A BUTTON INSIDE THE THING THAT WENT FULL. It is mounted
  // in `wrap` rather than anywhere else on the page, because in real element
  // fullscreen nothing outside that subtree is on screen at all, and the faux
  // cover is laid over the control row. Either way, a way out that is not in
  // here is a way out nobody can reach.
````

<a id="floor-65"></a>
## floor-65: demo/floor/index.html, inline script, line 1107

````js
  // ⚠️ THREE THINGS CAN CHANGE IT AND ONLY ONE OF THEM RAISES AN EVENT. The
  // real API fires `fullscreenchange`, which `watch()` hears; the faux cover is
  // a class, which raises nothing at all, so the control that changed it says
  // so by hand; and the button above knows because it just did it. All three
  // come here, the way out is told, and the log says it once.
````

<a id="floor-66"></a>
## floor-66: demo/floor/index.html, inline script, line 1119

````js
  // ⚠️ ESCAPE STILL LEAVES ON BOTH PATHS AND IS NO LONGER THE ONLY WAY OUT. The
  // real API takes the key itself; `watch()` wires it for the faux cover, which
  // has no browser behaviour behind it. A laptop keeps the key it expects and a
  // phone, which has no such key, now has the button.
  // ⚠️ AND IT REPORTS LEAVING ONLY, WHICH IS NOT TIDINESS. Only the ⛶ can put
  // this page into full screen, and only IT knows which of the two paths ran.
  // `fullscreenchange` may reach here before `toggle()` has returned that word,
  // so letting this branch log an entry is a race whose prize is a line that
  // does not say how it got there.
````

<a id="floor-67"></a>
## floor-67: demo/floor/index.html, inline script, line 1132

````js
    // ⚠️ NO AWAIT BEFORE requestSession — it needs a TRANSIENT user activation
    // and awaiting anything first can spend it. The support answer is the one
    // taken at load, never a fresh await here.
````

<a id="floor-68"></a>
## floor-68: demo/floor/index.html, inline script, line 1140

````js
      // 🔴 ONE WAY OUT, AND IT IS MOUNTED BEFORE ANYTHING THAT CAN THROW. Three
      // awaits follow this line and any of them can fail with the SESSION
      // ALREADY LIVE, which leaves somebody standing in a room with nothing
      // drawing and nothing to press. Mounted here, the hold is already running
      // before any of that can happen.
      // ⚠️ AND THERE IS NO `update` FOR THIS PAGE TO FORGET. `mountXRQuit` puts
      // its own callback on `session.requestAnimationFrame`, so the hold
      // advances off the session's own frame loop even if the render loop below
      // never starts. That is the repair for the failure CLAUDE.md records:
      // `/blocks/` built the badge, drew it every frame and never advanced it,
      // so there was no way out of that page at all.
      // ⚠️ NO `onQuit` AND NO `session.end()`. The module ends the session
      // itself, and everything this page puts away is already in the `end`
      // listener below, which runs whatever ended the session.
      // ⚠️ NO LABEL AND NO BUTTON PASSED. The defaults are the site's decision,
      // any button held three seconds, and a page that retypes them is a page
      // that can disagree with the module about how somebody leaves it.
````

<a id="floor-69"></a>
## floor-69: demo/floor/index.html, inline script, line 1164

````js
      // 🔴 THE DECISION IS MADE WHEN YOU LET GO, AND NOTHING HAS TO BE HELD. A
````

<a id="floor-70"></a>
## floor-70: demo/floor/index.html, inline script, line 1165

````js
    // press that did not move the floor was a click, and a click on a tile plays
    // it — or stops it, if it is the one already playing. Same sentence as the
    // window's, same `playTile`: one verb, two devices. Holding a trigger for a
    // second was asking for something nobody should have to be told about, and
    // the dwell that measured it is gone from here.
````

<a id="floor-71"></a>
## floor-71: demo/floor/index.html, inline script, line 1182

````js
      // 🔴 A DEAD-MAN'S SWITCH. If nothing has been drawn 6 s after the session
      // started, something threw where nothing was reporting and the wearer is
      // standing in a black room with no way out. MEASURED elsewhere in this
      // repo: reading `renderState.baseLayer` one line after creating a session
      // throws, the throw escapes the handler, and the render loop, the exit and
      // the bail-out are then ALL never registered — which is exactly the case
      // this has to survive, so it is armed BEFORE the first frame is asked for.
````

<a id="floor-72"></a>
## floor-72: demo/floor/index.html, inline script, line 1200

````js
    // ⚠️ ASK, DO NOT OPTIONAL-CHAIN. `el.requestFullscreen?.()` on an iPhone is
    // a control that looks live and is inert — no throw, no catch, no picture.
    // `fullscreen.mjs` tries the real API, falls back to a `position: fixed`
    // cover that needs no API, and SAYS which ran.
````

<a id="floor-73"></a>
## floor-73: demo/floor/index.html, inline script, line 1209

````js
  // 🔴 THE WAY OUT IS HELD, IT IS UNLABELLED, AND IT IS IN FRONT OF YOUR FACE.
  // Three answers this page has had, in order. "Any button but the trigger
  // leaves" made every other button a trap: you could not rest a thumb anywhere
  // on a page whose whole verb is a trigger you hold while you drag, and it
  // never said which button had done it. Then one named button held for three
  // seconds with a ring that filled AT EACH HAND, which still asked somebody to
  // find a particular button, and put the feedback on the hand you might not be
  // pressing. Now: ANY button, held, and ONE ring dead centre about 1.6 m out,
  // drawn with the depth test off so a tile cannot hide it.
  // ⚠️ THE TRIGGER BOTH DRAGS THE FLOOR AND ADVANCES THE HOLD, which is the one
  // collision in this design and is written down in `xr-quit.mjs`. The ring
  // fills from the first millisecond of any press, so a drag about to become an
  // exit says so while there is still time, and letting go takes it to zero.
  // ⚠️ Nothing is drawn until something is held. There is no idle badge, and
  // there is no word on it: the arc is the badge and the gesture says the rest.
````

<a id="floor-74"></a>
## floor-74: demo/floor/index.html, inline script, line 1230

````js
  // 🔴 MEASURED ON `shift`, NOT ON `shiftT`, AND THE FIRST VERSION HAD IT WRONG
  // — WHICH IS WHY NOTHING PLAYED AND NOTHING FOCUSED. `shiftT` is the raw ray
  // hit: the signal whose noise is the entire reason `settleFloor` exists. The
  // gearing is in the header above — half a degree of hand shake is 17 mm of
  // floor at 2 m and 105 mm at 12 — so a hold aimed anywhere but your feet blew
  // through a 12 cm threshold within a few frames, latched `holdStill` false,
  // cleared the hover, and every single hold read as a pan. Reported as "no
  // playback, no tile focus, unusable", and that is exactly what it was.
  // ⚠️ This is CLAUDE.md's oldest rule wearing a new coat: MEASURE THE QUANTITY
  // IN QUESTION, NOT ONE ADJACENT TO IT. The question is "did the floor move",
  // and the floor is `shift`. `shiftT` is where a shaking hand asked it to go.
````

<a id="floor-75"></a>
## floor-75: demo/floor/index.html, inline script, line 1249

````js
    // the floor coordinate under the ray, taken against the TARGET rather than
    // against where the floor has got to — grabbing mid-glide must not jump
    // ⚠️ TAKING HOLD STOPS THE FLOOR WHERE IT IS. Without this the target keeps
    // whatever the throw had left in it, and the floor carries on travelling
    // toward it under your stationary hand — which the slip test below would
    // correctly report as a pan, on a hold where nobody moved anything.
````

<a id="floor-76"></a>
## floor-76: demo/floor/index.html, inline script, line 1259

````js
    // 🔴 ONE TRIGGER, TWO VERBS, TOLD APART BY WHETHER THE FLOOR MOVED — which
    // is the mouse's `moved < 6` rule forty lines up, in a headset. Holding the
    // trigger has to pan, because dragging the floor is how you get anywhere;
    // holding it also has to be how you choose a film, because the gaze no
    // longer chooses and nothing else is left. So: hold STILL and the tile you
    // grabbed lights the rest of the floor down and then plays. Move, and it
    // was a pan and the choice is off — latched, so a wobble at the end of a
    // long drag cannot turn it back into a selection.
````

<a id="floor-77"></a>
## floor-77: demo/floor/index.html, inline script, line 1296

````js
    // 🔴 baseLayer is NULL until the next animation frame — `updateRenderState`
    // QUEUES, it does not apply. Reading it a line after creating the session
    // throws, and the throw escapes the handler, so the render loop and the way
    // out are both never registered.
````

<a id="floor-78"></a>
## floor-78: demo/floor/index.html, inline script, line 1307

````js
    // ⚠️ THE POINTER IS TAKEN ONCE, HERE, AND NOT ONCE PER EYE. Asking the
    // frame for a pose twice in one frame is two answers to one question, and
    // the two eyes would draw the ray in slightly different places — which is
    // the disparity bug the ribbon's own header is about, arriving by a
    // different door.
    // 🔴 BOTH HANDS, THE SAME WAY. There is no pointer hand on this page: a
    // floor is in front of all of you, and having to remember which controller
    // is the one that works is a rule with nothing behind it. Either trigger
    // pans, either ray points, and whichever one pulled first has the floor.
    // ⚠️ AND EACH HAND IS ONLY DRAWN IF THE RUNTIME ANSWERED FOR IT THIS FRAME.
    // MEASURED on a Quest 3 while xr-room.mjs was written: two sources appeared
    // and the LEFT grip did not resolve while the right did, in the same frame.
    // A page that draws a hand wherever it last saw one leaves a shape in the
    // air; one that draws what it was told shows you what it knows.
````

<a id="floor-79"></a>
## floor-79: demo/floor/index.html, inline script, line 1348

````js
    // ⚠️ IN A HEADSET THE HEAD IS THE TRUTH — no easing, no target. Smoothing a
    // head pose is motion sickness: the world would lag behind the neck.
````

<a id="floor-80"></a>
## floor-80: demo/floor/index.html, inline script, line 1352

````js
    // 🔴 THE RAY CHOOSES, EVERY FRAME, WHETHER OR NOT THE TRIGGER IS DOWN —
    // which is what makes the lift above mean anything. Pointing is continuous
    // and costs nothing; the trigger is the decision.
````

<a id="floor-81"></a>
## floor-81: demo/floor/index.html, inline script, line 1362

````js
    // 🔴 THE GAZE DOES NOTHING IN A HEADSET, AND IT USED TO DO EVERYTHING.
    // Resting your look was the whole input here, on the argument that looking
    // is the one thing a headset can always read. It is, and it is still the
    // wrong thing to act on: a head never stops moving, so the page was
    // permanently half-committing to whatever happened to be in front of it,
    // and you cannot look around a floor of pictures without repeatedly
    // half-starting films you were only glancing at. A TRIGGER is a decision.
    // ⚠️ The gaze keeps its other job — it still orders what gets fetched, in
    // `distGaze`, because "what do I want to load next" really is answered by
    // where somebody is looking. What it no longer does is choose.
````

<a id="floor-82"></a>
## floor-82: demo/floor/index.html, inline script, line 1379

````js
        // 🔴 gl.clear IGNORES THE VIEWPORT. Both eyes share one framebuffer, so
        // a clear on the second view wipes what the first drew. Only the first
        // eye clears colour; the second clears DEPTH inside a scissor, or it
        // tests against the first eye's depths.
````

<a id="floor-83"></a>
## floor-83: demo/floor/index.html, inline script, line 1392

````js
      // ⚠️ THE SHIFT GOES INTO THE VIEW, not into every tile's position — the
      // instance data is rebuilt each frame and adding it there would be 298
      // additions a frame to say what one translation says once. `inst.x/y`
      // stay the floor's own coordinates, so picking and the gaze distance keep
      // working in the same space the layout was authored in.
      // 🔴 AND IT IS WORKED OUT BEFORE THE FLOOR IS DRAWN, WHICH IT WAS NOT.
      // `upload()` answers 0 on a cold start, so the eye used to leave before
      // this line existed, taking the way out with it on exactly the frames
      // where there is nothing else on screen to look at. The hold advances
      // either way now, off the session's own loop, but holding blind for three
      // seconds is not the same as watching a ring fill.
````

<a id="floor-84"></a>
## floor-84: demo/floor/index.html, inline script, line 1429

````js
      // ⚠️ THE RAY IS IN THE FLOOR'S COORDINATES, LIKE EVERYTHING ELSE DRAWN
      // WITH THIS VP. The pose the runtime hands back is in the headset's own
      // space; the floor has been dragged away from that by `shift`, which the
      // view matrix above already accounts for. Handing the raw pose to the
      // same VP would draw the pointer where the hand would be if the floor had
      // never moved — correct at the start of a session and further out with
      // every drag, which is the worst way for it to be wrong.
      // ⚠️ EVERYTHING HERE IS MOVED INTO THE FLOOR'S COORDINATES. The runtime
      // reports hands in the headset's own space; the floor has been dragged
      // away from that by `shift`, which `vm` above already accounts for.
      // Handing a raw pose to this VP draws your hand where it would be if the
      // floor had never moved — right at the start of a session and further out
      // with every drag, which is the worst way for it to be wrong.
````

<a id="floor-85"></a>
## floor-85: demo/floor/index.html, inline script, line 1443

````js
        // 🔴 NO CONTROLLER IS DRAWN ANY MORE. 2026-09-17: *"rm controller
        // geometry/tablet on all (only if i am ask on specific demo so keep
        // that code ready to pop into scene)"*. `demo/shell/xr-controller.mjs`
        // is untouched and `xrCons.want()` below still fetches and uploads the
        // model, so putting the hands back is three lines here:
        //   const gf = new Float32Array(h.grip);
        //   gf[12] -= shift[0]; gf[14] -= shift[1];
        //   xrCons.draw({ vp: viewVP, grip: gf, profile: h.profile, handedness: h.hand });
        // 🔴 AND THE WAY OUT NO LONGER HANGS OFF A GRIP. It was drawn here, once
        // per hand, inside this `h.grip` guard. A session driven by tracked
        // HANDS reports no grip matrix at all, so on that input there was no
        // ring to see; and one ring per hand put the feedback on a hand you may
        // not be pressing. It is one ring in front of your face now, drawn at
        // the end of the eye and owing nothing to what the runtime reports.
````

<a id="floor-86"></a>
## floor-86: demo/floor/index.html, inline script, line 1460

````js
        // ⚠️ `view: vm`, WHICH ALREADY HAS THE SHIFT IN IT. The ribbon takes its
        // eye position out of the view matrix it is handed, so passing the one
        // that is doing the projecting gets the drag offset for free rather
        // than making this a second place it has to be applied correctly.
        // ⚠️ NO COLOUR IS PASSED ANY MORE AND NONE CAN BE. The ray is grey on
        // every page since 2026-09-17 and lightens when something active
        // happens, which is what `weight` says — this page's own mono pair became
        // the module's only pair. See the note by AIM_RGB in xr-ray.mjs.
````

<a id="floor-87"></a>
## floor-87: demo/floor/index.html, inline script, line 1470

````js
      // 🔴 LAST IN THE EYE, AND ONE OF IT. The ring is head locked and takes its
      // position, forward, right and up out of the very matrix that is doing the
      // projecting, so it cannot be turned against a head pose this page worked
      // out some other way. It draws with the depth test off, which is why it
      // goes after everything: a wall of newsreels must not be able to hide the
      // way out of the room.
````

<a id="floor-88"></a>
## floor-88: demo/floor/index.html, inline script, line 1498

````js
  /** Move every tile to the copy of itself nearest YOU.
   *  🔴 THE SAME CENTRE AS THE FADE, AND IT USED TO BE THE GAZE WHILE THE FADE
   *  WAS TOO. Now that the fade is measured from the eye, wrapping around the
   *  gaze would let a tile change copy 6 m from where the fade is centred —
   *  which is the "a tile only changes copy where nothing can see it" assert
   *  quietly measuring a different radius than the one that matters.
   *  ⚠️ Cheap on purpose — two rounds and two multiplies per tile, 300 of them,
   *  so it runs every frame rather than only when you cross a boundary. A
   *  version that only rewraps on a threshold has a frame where the far tiles
   *  are still in the old copy, which is a row of pictures jumping. */
````

<a id="floor-89"></a>
## floor-89: demo/floor/index.html, inline script, line 1517

````js
  // ── how it works ────────────────────────────────────────────────────────
  //
  // 🔴 THE ONE FACT THE PICTURE EXISTS TO CARRY: the stills and the films take
  // DIFFERENT ROADS. A thumbnail comes through our own origin because the
  // archive's image host sends no `access-control-allow-origin`, and a texture
  // upload is only allowed to read bytes that are ours; the films need no such
  // hop, because their host does send it. Nothing on the page shows that, and a
  // paragraph describing it is the weaker of the two channels.
  // ⚠️ `{ how: true, atEnd: true }` AND NO `title`. The heading lives in
  // `diagram.mjs` and is never typed on a page, and `atEnd` puts the picture
  // after the log, which is the actual bottom of the page.
````

<a id="floor-90"></a>
## floor-90: demo/floor/index.html, inline script, line 1531

````js
      // 🔴 `set: true`: THESE TWO ARE NOT A CHAIN. An undeclared gap between
      // two boxes in one machine is drawn as an arrow, which would claim that
      // the stills produce the films. They are two things the same archive
      // holds, so the gap gets a bracket instead.
````

<a id="floor-91"></a>
## floor-91: demo/floor/index.html, inline script, line 1574

````js
      // 🔴 NO LABEL, AND THAT IS THE RULE RATHER THAN AN OMISSION. Two stacked
      // boxes in one machine share about sixteen pixels of gap, so a name in it
      // runs under both of them. What travels is in the note.
````

<a id="floor-92"></a>
## floor-92: demo/floor/index.html, inline script, line 1583

````js
  // ── the checks ──────────────────────────────────────────────────────────
  // 🔴 GRADE THE PICTURE, BECAUSE NOTHING ELSE CAN SEE IT. `createDiagram`
  // collects every name it had to shorten, every note over about forty words
  // and every link it could not route, on `cuts`. A label that got cut or an
  // arrow that was refused is invisible to a reader, who has no way to know
  // that what they are looking at is not what was described.
````

<a id="floor-93"></a>
## floor-93: demo/floor/index.html, inline script, line 1613

````js
  // 🔴 THE WRAP MUST NEVER BE WITNESSED. A tile jumps to its other copy at half
  // the period from the gaze; if that is inside the fade, half-visible pictures
  // teleport across the floor as you turn — measured at alpha 0.48 before this
  // was widened, and reported as "erratic". The invariant is one comparison and
  // it guards four constants that are edited independently: change the tile
  // size, the columns, the rows or the radius and this is what notices.
````

<a id="floor-94"></a>
## floor-94: demo/floor/index.html, inline script, line 1627

````js
  // 🔴 THE POOL HAS TO BE ABLE TO HOLD WHAT THE FADE SHOWS. The fade promises
  // pictures out to LOAD_RADIUS; the texture array can only hold LAYERS of
  // them. When the second number is the smaller, the LRU starts taking layers
  // back off tiles that are still on screen — which is not a fade, it is a
  // disappearance, and it is what "edge tiles popping" was. At 192 layers the
  // pool ran out at 11.4 m against a fade reaching 16, so tiles were being
  // switched off at 73% alpha. One comparison, and it guards four constants
  // that are edited independently.
````

<a id="floor-95"></a>
## floor-95: demo/floor/index.html, inline script, line 1641

````js
  // 🔴 THE FOCUS, GRADED BY THE PICTURE RATHER THAN BY THE CODE THAT DRAWS IT.
  // Two tiles, a flat grey, rendered into a small framebuffer — one marked as
  // the tile being looked at and one not — and read back at three stages of the
  // dim. Nothing here compares pixels against a stored image; this file and
  // verify-gl.mjs both record why that cannot work across machines. Every claim
  // is a comparison between two readings of the SAME run:
  //
  //  · at a glance the two are identical. "Just looking costs nothing" is the
  //    first thing this page promises and the easiest to break by accident.
  //  · holding a look takes the OTHER tile part of the way down and leaves the
  //    one being looked at exactly where it was. The exemption is the whole
  //    mechanism — with it wrong, the tile the gesture is about darkens along
  //    with everything else and the page reads as fading out at random.
  //  · and a film takes the rest of the floor the rest of the way.
````

<a id="floor-96"></a>
## floor-96: demo/floor/index.html, inline script, line 1660

````js
  // 🔴 BEHIND THE FLAG, BECAUSE THE FIRST THING IT DOES IS PAINT OVER A TILE
  // SOMEBODY IS LOOKING AT. Layer 0 of the texture array belongs to whichever
  // film is nearest the camera by the time this runs, and `texSubImage3D` fills
  // it with flat grey to have something uniform to measure. Nothing puts the
  // picture back: that tile stays grey until the pool takes the layer for
  // something else. Everything after it renders into an off-screen target,
  // which costs nothing a visitor can see and is gated with it because it is
  // the same block.
````

<a id="floor-97"></a>
## floor-97: demo/floor/index.html, inline script, line 1724

````js
    // ⚠️ THIS USED TO ASSERT rest[0] === look[0] — "a glance costs nothing" —
    // and that was right while LOOKING was the input. A ray is aimed, so the
    // thing it is on answers now, and the same equality that was the rule is
    // the defect. Kept as a comment because the reasoning is the interesting
    // part: what changed is not the code, it is which gesture is deliberate.
````

<a id="floor-98"></a>
## floor-98: demo/floor/index.html, inline script, line 1735

````js
    // 🔴 THE ONE THAT CATCHES THE HOLE. The tile you CHOSE has to stay bright
    // from the click to the picture — the archive takes a second to answer and
    // the film another to decode, and for that whole gap there is no video alpha
    // to exempt it. It used to dim right there and light again when the film
    // arrived, which reads as the page changing its mind about what you picked.
````

<a id="floor-99"></a>
## floor-99: demo/floor/index.html, inline script, line 1744

````js
    // ⚠️ "SUBTLER" STATED AS TWO COMPARISONS RATHER THAN AS A SMALLER NUMBER.
    // Against a dimmed floor the aimed tile has to be MORE different in absolute
    // terms to read as the same amount of different — so "is the lift smaller"
    // is the wrong question and it failed this check at +2 when the answer was
    // wrong in the other direction. What subtler means here is: findable against
    // the floor, and plainly not the thing that is playing.
````

<a id="floor-100"></a>
## floor-100: demo/floor/index.html, inline script, line 1756

````js
  // 🔴 DOES RESTING ON A TILE ACTUALLY DO ANYTHING? DRIVEN THROUGH `step()`.
  // Reported twice as "no playback, no tile focus", and both times I diagnosed
  // it by reasoning about the code and shipped a fix for something adjacent.
  // The reason that could happen is that NOTHING HERE COULD SEE THE GESTURE:
  // every check on this page grades a shader, a matrix or a filter, and the one
  // thing a visitor actually does — put a pointer on a picture and wait — had no
  // instrument at all. ⚠️ And it cannot be graded from a browser tab: rAF stops
  // dead in a background tab, so a screenshot harness measures its own
  // backgrounding. `step()` takes dt as an argument, so it can be driven at a
  // fixed 1/60 with no browser, no clock and no frame loop in it.
  // ⚠️ 100 STEPS, WHICH IS 1667 ms AND DELIBERATELY SHORT OF THE 1800 IT TAKES
  // TO FIRE. One frame further and this check would call playTile(), which
  // fetches from the archive — a check that needs the network is a check that
  // goes red when somebody else's server is slow.
  // 🔴 AND THIS ONE RUNS THE PAGE FORWARD 1667 ms WHILE SOMEBODY IS WATCHING IT
  // ARRIVE. `step()` is the frame loop's own body — it wraps the tiles, places
  // the sound, pumps the image queue and advances every fade — so a hundred of
  // them at load skips the fade-in a visitor came in on and leaves the tile
  // alphas where a second and a half of looking would have put them. The dwell,
  // the dim and the playing tile are put back; the fades are not, and cannot be
  // without re-implementing the loop.
````

<a id="floor-101"></a>
## floor-101: demo/floor/index.html, inline script, line 1789

````js
    // the floor standing down IS the highlight on this page — there is nothing
    // drawn on the tile itself — so "no tile focus" is this number staying 0
    // ⚠️ 0.7, NOT 0.8 — AND THE FIRST NUMBER WAS MINE, NOT THE PAGE'S. The dim
    // eases toward a target that is ITSELF still rising with the dwell, so it
    // necessarily sits behind it; at 93% of the way through it reads 72% of the
    // way down, which is the lag working. A threshold picked from what I hoped
    // rather than from what the mechanism does is a red check about nothing.
````

<a id="floor-102"></a>
## floor-102: demo/floor/index.html, inline script, line 1801

````js
  // 🔴 A HELD HAND IS NOT A PAN, DRIVEN THROUGH THE PAGE'S OWN FILTER.
  // This is the defect that made the headset unusable: the pan/choose decision
  // was taken on `shiftT`, the raw ray hit, whose noise is the entire reason
  // `settleFloor` exists — so every hold latched as a pan within a few frames
  // and nothing ever focused or played. The fix is one word, which is exactly
  // the kind that comes back, so it is graded by RUNNING `settleFloor` rather
  // than by re-implementing it: a re-implementation would be a second filter
  // and could agree with a broken one.
  // ⚠️ THE NOISE IS DETERMINISTIC. `Math.random` here would be an assert that
  // fails one run in fifty and cannot be reproduced when it does. Sines with
  // incommensurable periods are noise enough for a low-pass filter and are the
  // same every time.
  // 🔴 AND THE AMPLITUDE HAD TO GO UP, BECAUSE THE FIRST ONE MADE THIS TEST
  // DECORATION. At 0.10 m per axis the raw signal's own worst excursion is
  // hypot(0.10, 0.10) = 141 mm — BOUNDED BELOW the 150 mm threshold by
  // construction. So the broken version, measuring that raw signal, scored 141
  // and PASSED: a test that could not fail on the exact defect it was written
  // for. Proved by sabotage, which is the only reason it was found.
  // 0.15 per axis puts the raw worst at 212 mm, comfortably past the threshold,
  // while the filtered floor stays in single millimetres — so the two versions
  // now land on opposite sides of it. ⚠️ A statistic bounded away from the
  // thing it is testing for is not a weak measurement, it is a blind one.
````

<a id="floor-103"></a>
## floor-103: demo/floor/index.html, inline script, line 1854

````js
  // 🔴 ONE FILM AT A TIME, RUN AS A SWITCH RATHER THAN ASSERTED AS A RULE.
  // There is ONE video texture on this page, so two tiles with any video alpha
  // at once is not a cosmetic overlap — the second one is showing the FIRST
  // one's film, or rather the first is showing the second's, because the
  // texture has already been replaced by the time the fade runs. Sixty frames
  // of a real switch, counting frames where both tiles would sample it.
  // ⚠️ Counting FRAMES, not checking the end state: the defect is entirely in
  // the middle: it starts right and ends right and is wrong for ~0.25 s.
````

<a id="floor-104"></a>
## floor-104: demo/floor/index.html, inline script, line 1878

````js
  // 🔴 THE POINTER, GRADED BY RENDERING IT — and the interesting assert is the
  // one that wants the picture to GET WORSE. `rayCheck` draws the same ray
  // twice: once with the eye it is projecting from, and once with an eye moved
  // 90 degrees round the ray's own axis, which is what orienting a billboard on
  // the CPU and reusing one eye's answer for both would produce. A ribbon that
  // really turns to face the eye it is handed comes out edge-on and nearly
  // vanishes the second time. A stretched box — the thing this replaced —
  // would score the same both ways and pass a test that asked for sameness.
````

<a id="floor-105"></a>
## floor-105: demo/floor/index.html, inline script, line 1898

````js
  // 🔴 THE RELEASE IS FASTER THAN THE TAKE, RUN RATHER THAN ASSERTED FROM THE
  // CONSTANTS. `DIM_OUT > DIM_IN` is true of the numbers and says nothing about
  // the code that uses them — the page could ease the wrong way round, or apply
  // one rate to both directions, and the comparison would still pass. Running
  // the page's own easing at a fixed 1/60 s is arithmetic: no browser, no ear,
  // no frame rate, and it is the same instrument the dwell's asymmetry uses.
````

<a id="floor-106"></a>
## floor-106: demo/floor/index.html, inline script, line 1916

````js
  // 🔴 A CLICK PLAYS A FILM, DRIVEN THROUGH THE PAGE'S OWN HANDLERS, END TO END.
  // "No playback" was reported FIVE TIMES and every assert on this page was
  // about a shader, a matrix, a filter or a dwell — so five rounds of fixes went
  // into things next to the fault, because nothing here could tell a working
  // page from one that never shows a frame of film.
  //
  // It dispatches a real `pointerdown`/`pointerup` at the canvas rather than
  // calling `playTile` directly, and the difference is the whole point: calling
  // the function passed for weeks while CLICKING did nothing, because the fault
  // was in the index the click hands over, not in the playing.
  //
  // Then it waits for the element to actually ADVANCE. A video element reports a
  // readyState on a stream that never moves, so `currentTime` is the claim.
  // ⚠️ IT NEEDS THE NETWORK, so it goes red when ERR is down rather than when we
  // are — and the detail says which. That is worth more than a green suite that
  // has never played a frame.
  // 🔴 AND THIS IS THE ONE THAT MUST NEVER HAVE RUN FOR A VISITOR. It clicks a
  // tile, which asks arhiiv.err.ee for a film, loads it over HLS, plays it for
  // up to six seconds and stops it — on arrival, unasked, on every visit. That
  // is a request to a broadcaster's archive per page load and a film starting
  // by itself in front of somebody who has not chosen one yet. The comment
  // above already said "it needs the network"; what it did not say is who was
  // paying for it.
````

<a id="floor-107"></a>
## floor-107: demo/floor/index.html, inline script, line 1960

````js
    // 🔴 THE SOUND FOLLOWS THE PICTURE, AND THAT IS THE ONE THING WORTH
    // ASSERTING ABOUT IT. The projector this replaces was gated on the DWELL —
    // on somebody asking — so it sounded identical whether a film played or
    // not, and for five rounds it made a broken page sound like a working one.
    // A noise that can be on while nothing is playing is not feedback, it is
    // decoration that lies. Both directions, because only one of them is the
    // failure that already happened.
````

<a id="floor-108"></a>
## floor-108: demo/floor/index.html, inline script, line 1973

````js
  // 🔴 THE PROJECTOR, GRADED OFFLINE — NO GESTURE, NO SPEAKERS, NO WAITING. An
  // OfflineAudioContext renders faster than real time and needs no user
  // activation, so the two things worth asserting about a synthesised machine
  // are checkable on every run, headless included: that it runs at the FILM'S
  // frame rate, and that the eight machines are actually eight. A sample could
  // never be checked this way; it would just be bytes.
  // ⚠️ ALL EIGHT VOICES, not the default one. A preset is a place for a typo to
  // sit unheard — seven of these are only reached by films nobody clicked today.
````

<a id="floor-109"></a>
## floor-109: demo/floor/index.html, inline script, line 1991

````js
    // 🔴 AUTOCORRELATION, NOT A THRESHOLD. The first version found onsets by
    // crossing `peak * 0.4` and reported 8 clatters at 26.6 ms against 5 at
    // ~41.7 by hand — because the clatter's amplitude is deliberately random and
    // the noise bed is always there, so a threshold taken from the loudest
    // sample counts bed peaks on a quiet run. A detector whose answer depends on
    // how loud a particular render happened to be is measuring the render.
````

<a id="floor-110"></a>
## floor-110: demo/floor/index.html, inline script, line 2022

````js
    // ⚠️ 3 ms of tolerance, and the jitter is why: each clatter is deliberately
    // a few per cent off the grid so it does not sound like a machine playing a
    // hi-hat, and the envelope's own resolution here is 2 ms.
````

<a id="floor-111"></a>
## floor-111: demo/floor/index.html, inline script, line 2028

````js
    // 🔴 AND THEY ARE ACTUALLY DIFFERENT, WHICH THE TABLE ALONE CANNOT SHOW. A
    // preset list is eight rows of numbers whether or not anything reads them.
    // Zero crossings are a crude spectral centroid and cost one loop: a higher
    // resonance crosses zero more often, and the randomness averages out over a
    // fifth of a second.
    // ⚠️ AND IT IS WEAKER THAN IT LOOKS — MEASURED, NOT ASSUMED. Sabotaged by
    // putting the clatter back on the old wide random band (1900 + 900 Hz, a
    // spread wider than the gap between two voices), this still PASSED at 533
    // against 1067, because the bed filter and the hum level vary per voice too
    // and either alone moves the centroid. So it proves the voices differ; it
    // does NOT prove the clatter is what differs them. Said here rather than
    // left as a claim, because a check believed to cover more than it does is
    // how the last five rounds of this page went.
````

<a id="floor-112"></a>
## floor-112: demo/floor/index.html, inline script, line 2053

````js
  // ⚠️ LEAVING IS NOT ONE EVENT, SO IT IS NOT ONE HANDLER. A tab can be hidden,
  // backgrounded, navigated away from, or put in the back/forward cache, and
  // they fire different things — `pagehide` covers the last two where `unload`
  // does not fire at all on mobile Safari. All of them mean the same thing here:
  // stop decoding a film for somebody who is no longer looking.
````

<a id="floor-113"></a>
## floor-113: demo/floor/index.html, inline script, line 64

````js
  // The block repeats forever: each tile moves to its copy nearest the gaze. The period is
  // square (21 x 1.68 = 28 x 1.26 = 35.28 m), so a tile wraps at 17.6 m, past the 14 m
  // where it has faded out. 588 slots for 298 films, so each film appears about twice.
  // See lessons/page-floor.md#floor-10
````
