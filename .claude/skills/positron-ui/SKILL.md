---
name: positron-ui
description: Demo page furniture: the kit in demo/shell/, controls, readouts, tables, sliders, transport bars, CSS, spacing, phone layout and the prose a visitor reads. Load before building or changing any interface, any control, any readout cell or any stylesheet rule.
---

# The kit, the page and everything a visitor looks at

🔴 **BUILD FROM `/kit/`.** Almost everything below exists because somebody
hand-rolled a control that was already in `demo/shell/`, or wrote a rule that
lost to another rule and read as correct for weeks.

## Full screen, CSS and touch

- **iPhone Safari has NO element Fullscreen API.** Not `requestFullscreen`,
  not `webkitRequestFullscreen` — the only thing that fills an iPhone screen is
  a `<video>`, via the non-standard `HTMLVideoElement.webkitEnterFullscreen()`.
  iPad is different (iPadOS carries the prefixed element API), so **"iOS" is the
  wrong unit** and the capability has to be asked, not branched on by platform.
  `mirror`'s ⛶ did nothing at all on an iPhone because `p.requestFullscreen?.()`
  **optional-chains straight past a missing method**: no throw, no `catch`, no
  log line, no picture — optional chaining is an excellent way to build a
  control that looks live and is inert. `demo/shell/fullscreen.mjs` tries the
  real API, falls back to a `position:fixed` cover that needs no API, and says
  which ran. ⚠️ **Style it with a CLASS, never `:fullscreen`** — a browser that
  does not know that pseudo-class discards the entire selector list it appears
  in, so `.pane:fullscreen, .pane.pos-full { … }` would delete the fallback on
  precisely the browsers that need it. And the utility needs (0,2,0): MEASURED,
  a bare `.pos-faux` lost to a page's own `.pane { position: relative }` on source
  order and the cover stayed 338px wide inside its grid.
- 🔴 **A MEDIA QUERY ADDS NO SPECIFICITY, SO A LATER PLAIN RULE BEATS IT AT
  EVERY WIDTH. MEASURED 2026-09-19, AND THE RULE IT KILLED HAD NEVER RUN.**
  `.pos-pick`'s entire phone layout sat in `@media (max-width: 560px)` at
  `shell.css:1589`, and the plain `.pos-pick { display: inline-flex; height:
  34px }` sat at line 2052. Same specificity, later in the file, so the plain
  one won at 390 px as well as at 1280, and the picker had NEVER collapsed on a
  phone in its life.
  ⚠️ **IT WAS FOUND BY PUTTING TWO CONTROLS SIDE BY SIDE AND MEASURING BOTH.**
  At 390 px the three choices went label on top at x=16 while `LOOK`'s segment
  started at x=53, after an inline label. One of them obeyed the stylesheet and
  one did not, which is visible in a screenshot and invisible in the source,
  because the source says exactly what the author meant.
  ⚠️ **THE FIX IS ORDER, NOT WEIGHT**: the media block moves after the section
  it overrides. Raising specificity to win a fight with your own stylesheet is
  how `.pos-faux` ended up needing `(0,2,0)`, and that one at least had a page's
  rule to beat.
  🔴 **AND A DEAD CSS RULE IS THE SECOND MOST EXPENSIVE KIND OF DEFECT HERE**,
  after a dead JavaScript guard, for the same reason: it reads as done. Three
  now, all measured rather than reviewed: this, `.pos-log { margin-top }` which
  was inert for as long as it existed, and `if (fullSupport() === 'none')` on
  `/weight/`, a branch comparing against a string that function never returns.
  **Point a browser at it and measure the COMPUTED value**, which is the only
  thing that knows which rule won.
  🔴 **FOURTH, 2026-09-19, AND IT IS THE ONE A SELECTOR CANNOT WIN: AN INLINE
  STYLE BEATS EVERY STYLESHEET.** `shell.css` has carried
  `.pos-vp[data-full] .pos-vp-stage { aspect-ratio: auto }` since full screen
  was built. `createVideoPanel` later gained an `aspect` option for `/stage/`'s
  film, written as `stage.style.aspectRatio = aspect`, so a panel given a shape
  could never give it up. `/making/`'s 1:1 picture box stayed square on a 16:9
  screen, its picture sat high, and `.pos-fsx` is `position: absolute` INSIDE
  that stage, so **the way out of full screen rode up there with it**. Reported
  as two separate faults because that is how it looks.
  ✅ **A COMPONENT THAT VARIES A PROPERTY PER INSTANCE SETS A CUSTOM PROPERTY,
  NEVER THE PROPERTY.** `stage.style.setProperty('--vp-aspect', aspect)` and
  `aspect-ratio: var(--vp-aspect, 16 / 9)`: per instance, and still reachable by
  a rule. Writing `el.style.x` from a component is writing a rule nothing can
  override, including the component's own stylesheet.

- 🔴 **`[data-thing]` MATCHES AN EMPTY ATTRIBUTE, SO CLEAR IT BY DELETING.**
  MEASURED 2026-09-19 in `video-panel.mjs`, which did `root.dataset.full = full
  ? fullMode : ''`. Every full screen rule is written `.pos-vp[data-full] …`,
  and an attribute selector matches on PRESENCE, so a panel that had been full
  **once** kept `border: 0`, `background: #000` and a stage with no aspect ratio
  for the rest of the page's life.
  ⚠️ **IT SURVIVED BECAUSE ENTERING IS WHAT GETS TESTED.** Every check anybody
  writes about a mode is about going INTO it; the state that is wrong is the one
  after coming back, and it reads as a design choice rather than a fault. Found
  by an assert that the panel took its own shape back, written for another
  reason. `delete el.dataset.x`, never `= ''`.
- **A long press on a control raises the iOS text LOUPE, and `user-select:
  none` does not stop it.** `-webkit-touch-callout: none` is the one that does.
  Photographed on `/keys/` and `/mirror/`: the magnifier over the piano keys and
  selection handles dragged across a readout. Controls and keys now carry it
  along with `touch-action: manipulation`, which also drops the 300 ms
  double-tap wait so a key sounds when it is pressed. Prose, readouts and the
  log stay selectable — copying a number out of those is a real thing to want.
  ⚠️ **AND A `<canvas>` IS NOT A CONTROL, WHICH IS HOW IT WAS MISSED FOR
  MONTHS.** The rule above was written on `button` and nothing covered the
  picture. PHOTOGRAPHED 2026-09-19 on `/blocks/`: the 3-D scene wearing a blue
  selection overlay with both iOS drag handles, one of them hanging below the
  canvas into the log. Instructed as *"3d scene nonselectable"*, and it is
  global rather than per page, because a canvas here is always a picture and
  nobody has ever wanted to select one. **The selection suppression is global,
  `touch-action` is NOT**: a canvas you drag to look around wants it off, and a
  canvas inside a page you scroll must not eat the scroll.

## The readout

- 🔴 **A READOUT HAS AN EVEN NUMBER OF CELLS, AND AN ODD ONE IS CUT, NEVER
  PADDED.** ⚠️ **THE REASON GIVEN HERE WAS WRONG AND THE RULE SURVIVES ANYWAY.**
  It used to say the row is `repeat(auto-fit, minmax(96px, 1fr))`, so a phone
  gets two columns and an odd count leaves a HOLE in the last row. MEASURED on a
  real page 2026-09-13: 96 px plus a 1 px gap gives **three** columns from about
  353 px of content upward, which is every phone anyone owns — so a **4-cell**
  readout holed from 353 to 426 px (iPhone SE 375, iPhone 12–15 **390**, Pixel
  412) and a **6-cell** one holed from 427 to 620, four slots wide at 560. An
  even count guaranteed nothing above two columns, and four-cell readouts had
  been holing on the commonest screen there is. The row is **flex** now, so the
  last row's cells GROW to fill it at every width and every count — verified at
  thirteen widths, both counts, all filling.
  So the even rule is now **editorial, not structural**: an odd readout always
  has a weakest cell, and being made to find it is the point. `mount()` still
  throws. The hole it used to describe is gone. A blank filler is the wrong repair: it adds a
  thing to look at that says nothing. Trimming is the right one, because an odd
  readout always has a weakest cell — usually a constant (`llhls`' `target`,
  `rack`'s 50/s `rate`, `moq`'s `version`) or something a neighbour already
  implies (`wire`'s `round trip` beside its `delivery`). Twelve pages were odd
  when this landed and every one got better. `mount()` THROWS on an odd count.
- **Nothing unmeasured prints as `0`, and never as a lone unit.** `''`, `null`
  and `NaN` all become an EMPTY cell with the unit hidden.
  ⚠️ **THIS SAID "ONE EM DASH" UNTIL 2026-09-18 AND THE CODE HAS SAID OTHERWISE
  SINCE 2026-09-13.** `setCell` renders `''`. The placeholder WAS an em dash and
  was removed on the reasoning written beside it: a cell does not have to show
  that it is a cell, because the key above it and the box around it already say
  so, and four dashes in a row read as four failed readings rather than four
  cells waiting. Two copies of the old wording survive in `/kit/`. An empty string used to
  empty the cell and leave the unit standing alone — a `%` with no number in
  front of it, which reads as a value that went missing — and a page that
  pre-sets a counter to 0 is worse, because a zero reads as a very confident
  measurement of nothing.

## /kit/ itself

🔴 **THE NEWEST COMPONENT GOES AT THE TOP OF `/kit/`, AND ITS HEADING IS
UPPERCASE.** Instructed 2026-09-16: *"in kit move online stuff to topmost item
(all new should land top, make rule)"* and *"always uppercase"*. That page is
read by somebody checking what the kit has, and what they do not know about is
what arrived since they last looked; appending put the newest thing at the
bottom of a long scroll, behind everything they already knew. The front page
settled the same question the same way. `.kit-h` renders a heading uppercase
whatever is typed, so type it uppercase and the source reads like the page.
⚠️ **A BLOCK THAT MOVES TAKES WHAT IT NEEDS WITH IT.** Moving one to the top
left its `const` behind, so the build read it in its dead zone, `section()`
swallowed the throw into `failed`, and the page died much later on an empty map
with a message about a different line. The page reported `this block did not
build` to a reader before the suite did.

✅ **`/kit/` IS MACHINE-GRADED NOW, AND THIS LINE SAID OTHERWISE FOR WEEKS.**
It used to say the page carried no `mount()` and no asserts, so the one page
whose whole job is to make component drift visible was the one page the suite
could not see, and anything demonstrated there had to be measured another way.
`node demo/verify.mjs kit` is **22/22** with 15 page asserts, and they are the
kind only that page can make: a badge measuring the same width in all four of
its states (spread 0.02 px), an animation that touches opacity and nothing that
could move a neighbour, two greys told apart by ink rather than hue, an
embedded dot laying out 8.0 px and still saying its state in words.
⚠️ **THE LESSON IS ABOUT THIS FILE RATHER THAN ABOUT THE PAGE.** A rule that
tells an author their work cannot be graded is a rule that stops them trying,
and this one outlived its own truth. A claim here about what a harness can do
is checkable in one command, so check it before repeating it.

## The shell, the build and what a demo requires

- Shared demo code goes in `demo/shell/`, which `build.mjs` **enumerates**. It
  also refuses the build when an import has no deployed file, and when two
  sources collide on one destination. **It scans modules, not just pages** — it
  read HTML only until 2026-09-07, and in that gap `demo/shell/moq.mjs` kept
  importing `/08-moq/moq-vendor.js` across the slug rename: a 404 that killed
  the module, so `moq` and `ladder` asserted NOTHING and read red for a reason
  that was true but not theirs (no relay on this network). **A rename moves
  URLs that live in modules, harnesses and comments, none of which are
  type-checked — grep the OLD form everywhere.** The same rename left
  `verify-native.mjs` pointed at a 404, which is the iPhone path.
- **What a demo REQUIRES is read off its `tags`, never listed twice.**
  `demo/shell/caps.mjs` maps a tag to a capability (`WebGL2` -> `webgl2`,
  `getUserMedia` -> `camera`), probes this browser once, and un-links rows the
  browser cannot run **with the reason in words** — a vanished row says the
  demo does not exist, which is a different and false statement. Three rules
  the file exists to hold: it is a **capability test, never a user-agent
  check** (a headset browser is Chromium, and research/quest-xr §1.7 measured
  that a Quest 3 and a 3S are indistinguishable by UA); a probe that could not
  answer returns **`unknown`, which never blocks**, because "we did not look"
  must not read as "it is missing"; and `midi` is deliberately soft, since
  `instrument` keeps playing from its on-screen keys. Proved by breaking it:
  the same page under `--disable-gpu` un-links `mirror` with *"this browser
  draws no 3-D"* and links it with the GPU on.

## The test picture

- **The generated test picture is `demo/shell/pattern.mjs` and nothing else.**
  Six demos draw it and `src/publish.sh` generates its ffmpeg filter by calling
  it; `workers/pub/container/server.mjs` holds a marked copy because that image
  is one `COPY` with nothing to import — change one, change the other, and diff
  the y/size/colour table afterwards. **After ANY move of `ROW`, re-run burn →
  `readBurned`** (600/600 exact through three moves); it is the only thing
  between a layout tweak and a stream nothing can read. The field is NEVER
  tinted — a warm hue at low saturation and low lightness is mud at any alpha —
  so colour lives in the labels, the sweep square and the strip lane, inside a
  100° band on `--hi`. One `PAD` off every edge. A camera is CONTAINED, never
  covered or stretched: iOS ignores a resolution request and returns portrait,
  where stretching squashes a face and cover shows 32% of the frame.
  ⚠️ **AND A FILM IS NOT A CAMERA: `drawCamera` TAKES `fit: 'cover'` SINCE
  2026-09-18**, asked for on `/stage/` as *"make 4:3 video win and crop"*. The
  rule above is unchanged and is still the DEFAULT; what it is about is a
  subject somebody framed and a shape the page does not control, and neither is
  true of a film composed to fill its own frame. The arithmetic said the same:
  a camera at 720x1280 into 1280x720 keeps 32%, the 4:3 film that bought this
  option kept **75%**, and contain was laying 160 px of flat field down each
  side of it. **`scrim` is a second option and defaults to the same 0.55**: it
  exists so a burned clock stays readable on top, so a caller that draws nothing
  on top passes 0 rather than dimming its own picture by more than half for
  furniture that is not there. `/stage/` is the only caller of either; the five
  camera pages take the defaults and read 82/82 unchanged.
  ⚠️ **THE 4:3 FILM IS GONE SINCE 2026-09-19 AND THE RULE IS NOT.** That page
  plays a 1280x720 MIMproject recording in a 1280x720 box now (*"video win to
  16:9"*), where `cover` and `contain` agree to the pixel, so the one live
  caller no longer demonstrates the option it asked for. It still passes
  `cover`, for the reason above and because `?bg=` can point it at a corpus row
  that is 4:3 or 480x272. **The numbers above are kept as the measurement that
  bought the option, not as a description of what is on screen.** This entry
  said `a 4:3 film keeps 75%` in the present tense for as long as that was
  true, which is how a confident sentence outlives the thing it describes.

## The transport bar

- 🔴 **AND A PAGE NEVER RE-PUBLISHES `__demo.transport`, BECAUSE THE BAR
  ALREADY DID AND THE RETURN VALUE IS NOT THE SAME OBJECT.**
  `transport-bar.mjs` publishes its internal `api`; `createTransportBar` returns
  a WRAPPER around that api. A page that assigns the return value over the top
  hands the harness an object with no `position`, and `demo/verify.mjs` dies on
  `t0.pos.toFixed` while the page itself looks perfect. Found 2026-09-19 on
  `/making/`. The two objects being different is deliberate and is not the
  defect; assuming they are the same is.
  **The exact shape, so nobody has to re-derive it**: `createTransportBar`
  returns `{ el, api, endStop, commanded, extra, loopExtra, slot, note, destroy
  }`, and `publish: true` writes `api` to `__demo.transport`. `verify.mjs` reads
  `__demo.transport.position` and `__demo.transport.el`, and both live on `api`.
  ⚠️ **THE SYMPTOM IS THE WORST KIND**: the harness THROWS inside its own drill
  rather than failing an assert, so the output names the harness and not the
  page, and nothing in the per-page count moves to point at what changed.
- 🔴 **A PAGE WITH TWO BARS MUST SAY WHICH ONE IS ITS TRANSPORT: `publish:
  false`.** `__demo.transport` is the only handle a CDP check has, and every bar
  claimed it unconditionally, so it was whichever bar was BUILT LAST, which is a
  fact about source order rather than a statement about the page. `/stage/` grew
  a second on 2026-09-18 (a live show in the control room, a recording in the
  archive) and the wrong one won by being further down the file.
  ⚠️ **AND THE DRILL PRESSED A DIFFERENT BAR FROM THE ONE IT GRADED.**
  `verify.mjs` clicked `document.querySelector(".tbar-toggle")` while every
  assert around it read `__demo.transport`: the same element only while a page
  has exactly one bar. DOM order and build order are routinely different on a
  tabbed page. It presses `__demo.transport.el`'s own toggle now, and `el` was
  added to the api object for it, which the file's own comment already demanded:
  a control reachable from the return value and not from `api` is a control the
  harness cannot press.
- Transport UI is `demo/shell/transport-bar.mjs` and nothing else. Playhead from
  `observePosition`, seek only via `deck.seek()`, rates from intersected
  `caps.rates`.
- **One meaning for colour across every demo.** A mark's colour says HOW IT
  LANDED, never which lane it is in — lane identity is the row, the label and
  the gutter swatch, three channels that already carry it. Grey = not played,
  slate = played and this lane cannot say how well, green = inside what its way
  of firing promises, amber/red = later. "Played, unmeasured" gets its own
  colour rather than borrowing green: colouring an unchecked thing as if it
  passed is an assertion nothing made.

## Lanes and colour

- **A number belongs to the lane that can answer for it.** Report each lane's
  error against the score, not against another lane; every pairwise gap is a
  subtraction away. Give every lane a row even when it has nothing to say, and
  let it say so in words — a blank cell collapses "we did not look" and "we
  looked and it was fine". Never let a lane with no feedback count as 0 in an
  aggregate: it must not be able to improve the score.

## Components, layout and the words on the page

- 🔴 **A COMPONENT SWAP MOVES EVERY SELECTOR THAT NAMED THE OLD ONE.**
  `/radio/`'s sound row went `createChoice` -> `createPicker` and one of the
  three rules keyed on the old class was updated. `shareLabelColumn()` went on
  setting `--lab` on exactly the right element and **nothing consumed it**, so
  the JavaScript and the comment beside it both read as correct while the row
  snapped back to the width of one word. REPORTED THREE TIMES, and the third
  report was a different bug wearing the first one's clothes. There is an assert
  on the left edges now and it fired at `12 px apart` before it passed.
  ⚠️ Its other half: a `12` typed in `shell.css` and a `0` typed in the page —
  **a shared measurement in two files is a measurement that will disagree**. It
  is `--sld-col` now.
- 🔴 **THE LOOPER IS A KIT MODULE, AND BOTH PAGES WITH A LOOP USE IT.**
  `demo/shell/looper.mjs`, 2026-09-16, asked for as *"make it use same looping
  ui as radio (make it global)"*. It owns what a loop IS: the ring that keeps
  the sound, the kept buffer, the mirrored copy, the one voice that reads a lap,
  where the sound has got to inside it, and the button glued to LOOP that
  cycles → ← ⇆. A page owns what else happens on its own graph, which node stops
  being heard, and what its log calls the thing it is looping.
  ⚠️ **THE TWO PAGES REACH IT AT DIFFERENT MOMENTS AND BOTH ARE RIGHT.** On a
  live station the sound has not arrived yet, so `keep()` is the bar's `fill`
  and `close()` is its `set`. On a tape both marks are behind you and the bar
  loops the file itself, so `keep()` is `set` and `close()` is the FIRST `wrap`:
  the first lap comes off the tape while the ring fills, and every lap after it
  comes off the ring. That is what makes a direction possible at all, because
  **no media element has a negative playback rate** and a kept lap is an
  `AudioBuffer` that can simply be mirrored.
  ⚠️ **ITS ARITHMETIC IS PURE AND IS GRADED WITHOUT A BROWSER.** `ringOrder`,
  `planVoice` and `headOf` are where every bug it has ever had lived (a ring
  copied from index 0 after it wrapped; a voice that always began at the top; a
  pingpong head that was a ramp and sat at the right edge for the whole return).
  `node demo/shell/looper-test.mjs` is 18 asserts, four of them negative
  controls, and three deliberate sabotages take 7 of them red.
- 🔴 **A DURATION IS A FACT ABOUT A FILE, MEASURED ONCE AND WRITTEN DOWN.**
  `corpus.json` carries `durationMs` on all 26 time-based rows since
  2026-09-16. `demo/resources/measure-durations.mjs` asks each file once with
  ffprobe, one at a time, two seconds apart, at `-probesize 65536` (a header,
  not half a recording), and writes `demo/resources/durations.json`;
  `build-corpus.mjs` merges it. `/tapes/` used to open twenty-four media
  elements on every visit and correct its picture over the following seconds,
  so every visitor paid archive.org for the same answers and saw a run of the
  wrong length first. ⚠️ **AMEND THE CORPUS WITH `--offline`**: it rebuilds from
  the cache, asks no source anything, and was MEASURED byte for byte identical
  to the committed file apart from its timestamp.
- 🔴 **A TABLE IS NAVIGABLE FROM THE KEYBOARD, AND AN ARROW MOVES RATHER THAN
  OPENS.** `table.mjs`, 2026-09-19, asked for as *"allow keyboard nav in
  tables"*: arrows, Page Up and Down, Home and End, Enter to open.
  🔴 **THE OBVIOUS SHAPE WOULD HAVE BEEN A DEFECT ON THE PAGE THAT ASKED FOR
  IT.** An arrow that moved the SELECTION, the way a file browser does, calls
  `onPick` per row, and `/making/`'s `onPick` fetches a picture off the bucket,
  so a held-down arrow pulls 63 files nobody asked to see. That is the
  load-on-a-visit defect, already paid for three times, arriving through the
  keyboard. Moving focus is free; opening is a decision and gets its own key.
  ⚠️ **AND A LIST IS ONE TAB STOP, NOT ONE PER ROW.** Every row was
  `tabIndex = 0`, so tabbing past a 63-row table took sixty-three presses. A
  roving tabindex fixes it, is invisible in a screenshot, and is free to read
  off the DOM, so assert it, including the negative half: one row at 0 AND
  every other at -1.

- 🔴 **NO EMPTY TABLE HEADERS. A COLUMN NAME OVER NO ROWS LABELS AIR.**
  Instructed 2026-09-21: *"no empty table headers (add rule)"*. A heading is a
  promise that there is something under it to scan, and a heading over nothing
  is furniture that reads as a table which failed to load.
  ✅ **`table.mjs` ALREADY DOES IT AND THE RULE IS ABOUT EVERYTHING ELSE.**
  `blank()` sets `head.hidden = true` and `add()` clears it on the first row, so
  no caller has to remember. **The rule exists for the two ways round it**: a
  page that hand-rolls a grid instead of using the component, and a page that
  passes a non-empty `empty:` string, which puts a message under a hidden
  heading rather than a heading over nothing. Both are fine; neither is the
  default you get for free.
  ⚠️ **AND IT IS THE SAME RULE AS `AN EMPTY BOX IS A LINE`, ONE ELEMENT ALONG.**
  `/typist/` drew a 2 px band nobody wrote out of a childless `.pos-readout`,
  `.pos-controls[hidden]` exists because an empty control row left a 14 px band,
  and `drop.mjs`'s footer is `hidden` rather than empty for exactly this. **A
  container with nothing in it must not paint its edges, and a label with
  nothing under it must not paint its name.**
  ⚠️ **ASSERT IT WHERE YOU BUILD IT.** `/pack/` carries
  `an empty table draws no heading, because a column name over nothing labels
  air`, reading `.pos-tbl-head?.hidden === true`, and that assert is free.
  🔴 **AND READ THE BODY, NOT THE ELEMENT, WHEN YOU CHECK A ROW.** The heading
  IS a `.pos-tbl-row` — it is `pos-tbl-row pos-tbl-head` — and it comes first,
  so `table.el.querySelector('.pos-tbl-row')` returns the HEADING. MEASURED
  2026-09-21 on `/pack/`: an assert reading a row's `title` that way came back
  `""` and went red on a page doing exactly what it promises. `scroller()` is
  the body and is the thing to query. That is the third assert on that one page
  measuring something next to the quantity in question.

- 🔴 **A TABLE HEADING IS ONE LINE AND IT IS SHORT. IT NEVER WRAPS.**
  Instructed 2026-09-20: *"Tablw headings aingle line, make rule to keep it
  short"*, photographed on `/making/` with the `FILE` header rendered **one
  letter per line** down four rows while its cell sat empty beside it.
  🔴 **A WRAPPING HEADING IS NOT A TYPOGRAPHY PROBLEM, IT IS THE TABLE
  REPORTING THAT ITS COLUMNS DO NOT FIT** — and reporting it in the one place a
  reader cannot act on. `/making/` went from two fixed columns to six in one
  change, 232 px of fixed width to 476, and the single growing column was handed
  what was left. Nothing in the suite could catch it: the page reads 38/38 and
  the harness runs at desktop width.
  ⚠️ **SO THE HEADING IS `nowrap` AND THE LABEL IS BUDGETED.** A name that does
  not fit is the AUTHOR's problem, reported to the author the way `createDiagram`
  reports a label it had to cut, and never solved by wrapping it at the reader.
  Four or five characters is a heading: `when`, `file`, `via`, `size`, `length`.
  ⚠️ **AND A HEADING IS NOT A SENTENCE.** It names the column; the unit belongs
  in the cell, the explanation belongs in the hover. `uploaded` over a date
  column is right, `uploaded to the site` is a caption that happens to sit in a
  heading row.
  🔴 **THE OTHER HALF IS THAT SIX FIXED COLUMNS MAY SIMPLY NOT FIT A PHONE.**
  `.pos-tbl-row` carries `min-width: 560px` so a row scrolls rather than
  squeezes, and a row that has to be dragged sideways is already recorded here
  as a thing nobody reads. **Fewer columns beats a wider minimum**, and the
  columns to drop first are the ones somebody checks AFTER finding the row
  rather than the ones they scan down.

- **Two more kit components, both 2026-09-15.** `table.mjs` — rows in columns
  the caller declares (`key`, `label`, `width | grow`, `align`, `link`, `hi`,
  `clip`, `hover`); it THROWS unless exactly one column grows. `tabs.mjs` —
  uppercase, x-scrollable, no borders, `#links` rather than subpages (a subpage
  is a navigation: the audio stops, the service worker hands over, an installed
  web app flashes white). ⚠️ **`tabs.mjs` WAS IN NO PAGE AND IS NOW IN TWO**: `/making/`, which says in
  its own comment that it is the first shipped use, and `/stage/`. The line here
  said *"in `/kit/` and in NO page"* long after that stopped being true, and a
  research agent repeated it back on 2026-09-21 because this file said so. What
  is still true is why it was removed from `/items/`: three names on a page
  holding one list and one form is furniture. 🔴 **`min-width: 0` or a scrolling row
  drags the PAGE sideways instead of scrolling**: `overflow-x` cannot shrink a
  flex item below its content, and 390 px measured 141 px of page overflow.
- 🔴 **A LAYOUT CLAIM IS A MEASUREMENT, AND `/model/` WAS CORRECTED BY
  SCREENSHOT TWELVE TIMES IN ONE EVENING.** Every one was plausible reasoning
  that a rect would have refused. The pattern is worth more than any of them:
  **when somebody reports what they SEE, the cause is usually one layer
  under it**, and measuring first costs one throwaway assert.
  - *"less h padding on strip"*: the padding was ALREADY equal at 14 px both
    ways. MEASURED: strip 174.4 px, controls 102.0, **50.2 px of air each side
    of the knob**, because the HEADING was 146 px. Changing the padding would
    have moved 4 px of a 50 px gap and it would have been reported again.
  - *"bottom uneven"*: `padding-bottom: 4px` sat on the scroller and nowhere
    on the lane beside it. **A reservation that only one of two equal things
    makes is a reservation that breaks them.**
  - *"align content to bottom"*: `margin-top: auto` pushed ONE element down
    and left everything above it where it was, which is what it says and not
    what a reader sees.

- 🔴 **THREE ALIGNMENTS THAT LOOK LIKE ONE ARE THREE ASSERTS.** Lane top
  against the first button's top, lane bottom against the last button's
  bottom, and the two labels under them against each other. **Two of the three
  lined up while the third was 30 px out**, and later the boxes matched
  perfectly while the faders inside them were 17 px apart. Arithmetic in a
  comment is not evidence.
  ⚠️ **AND MEASURE THE WORKING SURFACE, NOT THE WRAPPER.** A pad returns its
  wrapper as `el` and exposes `button` separately. An assert reading `el`
  reported a button 17 px low while the button was exactly right.

- 🔴 **A COMPONENT'S INVISIBLE RESERVATIONS MUST BE PUBLISHED OR A CALLER WILL
  GET THEM WRONG.** The distance between two stacked pads is THREE things:
  this one's foot, the gap, and the next one's head, which is reserved even
  when empty. Counting two of them made a lane 115 px against the 145 it
  needed, and the error was exactly one reserved slot.
  ⚠️ **AND A CUSTOM PROPERTY INHERITS DOWNWARD, NEVER SIDEWAYS.** `--fdr-foot`
  declared on `.pos-fdr` was invisible to the button column BESIDE it, `var()`
  fell back silently, the margin was never applied, and the source read as
  correct. It belongs at `:root`.

- 🔴 **A COMPONENT WHOSE VISIBLE EXTENT EXCEEDS ITS INTERACTIVE ELEMENT HAS TO
  SAY SO TWICE.** A pad's labels are siblings of its button, so `:disabled`
  dims the button and cannot reach them: two disabled pads read as live
  because their names were at full strength. The wrapper carries the state as
  well. **The same boundary caused three separate bugs in one evening**, which
  makes it a shape rather than three slips.

- 🔴 **A DEAD SELECTOR READS AS CORRECT, AND RENAMING A CLASS IS HOW ONE IS
  BORN.** `.strip-body .pos-fdr` kept the old class name for one run after the
  row became `.pos-crow`, so `--fdr-lane-h` fell back to its default and a lane
  was 29 px short. **Caught in seconds because the alignment was asserted**,
  which is the fifth dead rule this project has measured and the FIRST one
  found by its own check rather than by somebody looking.

- 🔴 **A `const` SHADOWS ITS WHOLE BLOCK FROM THE TOP, AND SEVEN ASSERTS WENT
  SILENT ON IT.** A new check read an outer `lane` above an inner `const lane`
  declared later in the same block: temporal dead zone, the check threw, and
  the page reported **22/22 green** having previously been 29. **Asserts do not
  fail when they stop running. Only the COUNT says so.**

- ⚠️ **GLYPHS: PICK CHARACTERS WITH NO EMOJI FORM RATHER THAN ASKING FOR TEXT
  PRESENTATION.** `⏪ ⏩ ⏹ ⏯ ⏺` default to emoji and render full colour at the
  wrong size and baseline. Appending U+FE0E is honoured inconsistently, so it
  looks right on one machine and wrong on another. `◄ ► ■ ●` have no emoji
  form at all. ⚠️ `▶` U+25B6 DOES, despite being geometric; `►` U+25BA does
  not.

- 🔴 **A PHONE LAYOUT THIS PROJECT CANNOT GRADE MUST SAY SO.** `demo/verify.mjs`
  runs at 756 px with no viewport override, so **every assert on a page passes
  without ever entering its media query**. Checking the block is last in the
  style element answers the failure this repo actually measured, where
  `.pos-pick`'s phone layout sat above the plain rule that beat it and had
  never run in its life. **Ordering is not behaviour.** Say which claims are
  measured and which are read, or three green alignment asserts imply coverage
  they do not have.

- 🔴 **A HARDWARE CONTROL HAS A WORKING SURFACE AND FURNITURE, AND ONLY THE
  FURNITURE VARIES. `--ctl-head` AND `--ctl-foot` ARE THE CONTRACT.** A fader's
  working surface is its lane, a pad's is its button, a knob's is its dial.
  Above and below each sits text that belongs to the control and is INVISIBLE
  FROM OUTSIDE IT: a value readout, a reserved top label slot, a name
  underneath.
  🔴 **SO A ROW OF DIFFERENT CONTROLS CANNOT BE ALIGNED BY A CALLER, AND THREE
  SCREENSHOTS IN ONE EVENING PROVED IT.** `/model/` was reported with buttons a
  label too low, then with two labels ending on different lines, then with a
  lane starting 30 px below the button beside it. Every one was the page doing
  arithmetic about a component's insides.
  ✅ **ONE HEAD AND ONE FOOT FOR EVERY CONTROL, PUBLISHED IN `shell.css`**, and
  then `.pos-crow` is plain `flex-end` and the browser does it. A page that
  writes its own margin correction here is a page that breaks the moment a
  component gains a label, which is exactly what happened: `/model/` lifted its
  button column by a foot's height, which was right until the pads grew one.
  ⚠️ **A SLOT IS RESERVED EVEN WHEN EMPTY.** A pad with no top label still
  takes `--ctl-head`, or a grid whose downbeats are named has those pads
  sitting higher than the rest, which reads as a rendering fault rather than a
  labelling choice.
  ⚠️ **AND THE DISTANCE BETWEEN TWO STACKED CONTROLS IS THREE THINGS, NOT
  ONE**: this one's foot, the gap, and the next one's head. `--ctl-step` is all
  three. Counting two of them made a lane 115 px against the 145 it needed, and
  the error was exactly one reserved slot.
  🔴 **ASSERT THE ALIGNMENT, BECAUSE ARITHMETIC IN A COMMENT IS NOT EVIDENCE.**
  `/model/` grades three separate claims against real rects: lane top against
  the first button's top, lane bottom against the last button's bottom, and the
  two labels against each other. **Two of the three lined up while the third
  was 30 px out**, and a fourth run caught a dead selector in seconds when a
  renamed class left `--fdr-lane-h` falling back to its default. That is the
  fifth dead rule this project has measured and the FIRST one caught by its own
  check rather than by somebody looking.
  ⚠️ And measure the BUTTON, not the wrapper. A pad returns its wrapper as
  `el` and exposes `button` separately; an assert reading the wrapper reported
  a button 17 px low while the button was exactly right.

- 🔴 **BUILD FROM `/kit/`, AND SAY SO WHEN YOU CANNOT.** Before writing any new
  interface, look at what `demo/shell/` already has — slider, slider group,
  stepper, choice, keyboard, MIDI, transport bar, logger — and use it. Hand-
  rolling a control that exists is how three pages ended up with three different
  radio rows and two different slider stacks, and the cost is not only the
  duplication: `choice.mjs` and the slider group BOTH shipped emitting class
  names no stylesheet matched, which is a bug that only happens to a control
  nobody else uses. **If the thing you need is not in the kit, stop and ask** —
  whether to add it as a component, or to lift something a page already has and
  has not been componentised yet. Do not quietly build a fourth copy. A control
  that exists in one page and nowhere else is a component that has not been
  noticed yet, not a special case.
- 🔴 **THE RASPBERRY PI IS A KIT MODULE, AND BOTH PAGES THAT PLAY IT USE IT.**
  `demo/shell/board.mjs`, 2026-09-16, asked for as *"share code with knobs"*. It
  owns the socket, the reconnect, the presence, the 12-byte frame header, the
  conversion to float, the `pcm-playout` worklet, the cushion and its counters,
  and the check that a frame is the SHAPE the board publishes. A page owns which
  verbs it sends, what it does with a frame after the playout has it, and what
  its log calls things.
  ⚠️ **IT IS THE BETTER OF THE TWO HALVES, NEVER THE AVERAGE, AND THAT IS THE
  GENERAL RULE FOR THIS KIND OF MERGE.** `/keys/` hand-rolled its WebSocket and
  so could not tell a FULL ROOM from a DEAD RELAY (a browser cannot read the
  HTTP status of a refused upgrade; `openWire` asks `/stats` and says which),
  never checked a frame's shape, and never worked out which socket in the room
  WAS the board. All three came from `/knobs/`, so the page that had less gained
  three things rather than the two of them meeting in the middle.
  ⚠️ **THE CUSHIONS STAY DIFFERENT AND THAT IS NOT DRIFT.** 100 ms on `/keys/`,
  which reports press to sound and pays for every millisecond of it; 160 on
  `/knobs/`, which holds one note under a filter sweep where a click is the
  thing a listener cannot ignore. Two trades, one component.
- **Write for someone who does not work here.** Terse, but understandable —
  those are not in tension, and the old rule ("no explanatory prose, one line
  and a readout") produced pages that only their author could read. A demo page
  carries two things: **ONE paragraph of three or four sentences** saying what
  happens, how it is done and what the numbers mean — and a readout of real
  numbers. It was a lead line plus a second `d.how()` paragraph until
  2026-09-08; two blocks meant the lead said too little and the mechanism went
  unread. `d.how()` is gone; put it all in `what`.
- **No jargon in anything a visitor sees.** Not in `what`, not in `how`, not in
  a readout key, not in `manifest.mjs`'s `one` line. Banned unless the page
  defines it on the spot: lookahead, horizon, one-shot, tick, host, commit,
  actuate, lattice, deck, lane, fold, adapter, evidence gate. Say what it does,
  not what it is called internally. `drift` survives only because it is a
  readout key with a sentence under it explaining it is lateness in
  milliseconds, and that it is NOT stream latency — a reader assumed exactly
  that, which is what prompted this rule.
  ⚠️ **A THING'S NAME IS NOT JARGON — DECIDED 2026-09-13, do not re-litigate.**
  `Yoshimi`, `Pappus`, `Ableton Live`, `SuperCollider` are what those programs
  are CALLED, and the open question of renaming them to something friendlier is
  answered: leave them. A friendly label invented here would be a name nobody
  can search for, and it would hide which program is making the sound, which is
  the one fact those pages exist to report. The rule is about words that
  describe a MECHANISM in this project's private vocabulary (a fold, a lane, an
  evidence gate), not about proper nouns.
  ⚠️ **THE ROW THIS WAS DECIDED ABOUT NO LONGER EXISTS**, and the decision is
  kept because it is about names rather than about that control. `/keys/` had an
  instrument row offering `sampled`, `hexter` and `yoshimi`; two of the three
  left the board on 2026-09-16 and a choice of one is not a choice. See
  `archive/box-fluidsynth-hexter/`.
- **A constant belongs beside the thing it governs, not in a header.** `how()`
  took a spec line of real values (`looks 100 ms ahead · re-checks every 25 ms`)
  on the theory that constants beat prose. They do — when someone is looking for
  them. Above a paragraph they are one more thing to parse before reaching the
  sentence that says what is going on. The numbers now sit under the lane whose
  behaviour they describe, in the strip's gutter. Wherever a number IS printed,
  read it from the same constant the page hands the library, never typed twice:
  a description that can disagree with the config is worse than none.
- **Per-lane numbers go in that lane's gutter** (`subLabel`), never in a
  separate table or a readout row. Joining a figure to its ink across two
  elements is what makes a legend necessary; put them together and it is not.
- **A gutter carries what its lane MEASURED, never instructions.** `typical
  +1.20 ms` / `worst +2.90 ms`, or an honest `no way to check` — not "press
  Record", not "drag the line". Help text belongs in the one `how()` paragraph,
  and if a reader still cannot tell what to press, fix the control's LABEL.
  Instructions in a gutter crowd out the numbers, repeat the paragraph above,
  and do not fit. **Anything that truncates with an ellipsis is in the wrong
  place** — that is the signal, not a styling problem to widen your way out of.
- **A tooltip is two or three short lines, never a sentence.** It is drawn ON
  TOP of the thing it describes and is read every time you point at one, so a
  paragraph there covers the picture and gets re-read twenty times. Budget
  ~40 characters a line: what it is, the number, the mechanism. Explanation
  goes in the `how` block, which is read once. `1.20 ms late · as expected` /
  `timer set ahead`, not `A timer was set for it in advance. Those land
  within a few ms.`
- **Every readout cell must be able to change.** A cell showing a structural
  constant reads as a measurement and teaches the reader to ignore the row.
  01's `missed` count was always 1 — the mark due at position 0 can never have
  a timer — so it became `worst`, which moves. Prefer median AND max over
  either alone: a median hides the one bad fire that is the reason to look.
- **A colour scale whose normal reading is a warning has no warning left.**
  Calibrate against what the mechanism promises, not against an absolute
  ideal. 01 first painted 18 of 20 marks amber on a loaded machine, against a
  5 ms threshold — while the lab measures the shipped worker host at p50
  5.0 ms, so the DOCUMENTED BASELINE was amber. Colour and words must come
  from one table, so a green bar can never be described in language that
  sounds like a failure.
- 🔴 **NOTHING THAT REDRAWS EVERY FRAME MAY CHANGE HOW MUCH ROOM IT TAKES.**
  A live picture is fine. A live SENTENCE under it is not: `grain-scope` carried
  a caption that rewrote itself sixty times a second and reflowed between three
  and four lines, so the picture, the pane and everything below them jumped
  continuously — reported as *"a horrible jump of content each time it
  updates"*. The words were accurate and it did not matter. ⚠️ The fix is never
  to shorten the sentence: any prose that updates live will eventually straddle
  a line break, and then it is back. **A changing number goes in a READOUT
  CELL**, which is a fixed box with a reserved width (`tabular-nums`, and the
  slider reserves its widest value for the same reason) — or in a lane's
  gutter, which is also fixed. Text that updates at human pace — a log line, a
  verdict after a check — is fine, because it moves when something happened
  rather than on a clock. The test is not "is it short", it is **can this change
  its own height while somebody is looking at it**.
- 🔴 **A PAGE DOES NOT NARRATE ITS OWN STATE IN SENTENCES.** `grains` generated
  two paragraphs a frame — *"both are chewing the same saw — 72 sine partials
  over 6 notes, made separately at each end from one description"* and *"moving
  on its own · 53 nudges in the 8 s this page has been watching, none of them
  asked for · the slow one is reading at 0.416 of the way through the sixty
  seconds"*. Every number in them was real. The reader's word for it was **slop
  prose**, and the failure is the FORM, not the wording: a sentence has to
  re-say the unchanging part beside the one figure that moved, so you re-read a
  paragraph to find a digit — and it rewraps while you do. A figure goes in a
  **readout cell** or a **lane gutter**, both fixed boxes. A claim goes in an
  **assert**. A state change goes in the **log**, when it changes. ⚠️ And when
  you delete such a block, REHOME WHAT IT SAID — deleting the display without
  the facts is how a page quietly stops reporting something, which is worse
  than saying it badly.
- 🔴 **SEPARATION IS SPACING, NOT LINES — AND AN EMPTY BOX IS A LINE.**
  `shell.css` sets one vertical rhythm on the gap between siblings, so a divider
  is a second channel saying what the spacing already says; `.pos-head` carries
  a note saying exactly that and has no rule under it. ⚠️ **The failure is not
  only an explicit divider.** MEASURED on `/typist/`: a page declaring
  `readout: null` still got a `.pos-readout` div with no children, and its own
  1 px border top and bottom rendered as a **2 px full-width band 24 px above
  the controls** — a horizontal rule nobody wrote, reported as "old UI creeping
  in", which it was, just not in the way it looked. **A page that opts out of a
  surface must opt out of its BOX too**, and that cannot be the page's job to
  remember — the shell hides an empty readout now, the same way
  `.pos-controls[hidden]` already handles an empty control row that was leaving
  a 14 px band behind. A container with nothing in it must not paint its edges.
- 🔴 **VERTICAL SPACING IS A RULE, NOT A PER-PAGE DECISION.** Elements on a demo
  page do not sit tight against each other. `shell.css` sets ONE rhythm and a
  page that needs a different gap somewhere is a page making a claim about that
  one relationship, which it says so in a comment.
  ⚠️ **THE SELECTOR AND THE NUMBER WRITTEN HERE WERE BOTH STALE AND WERE
  CORRECTED 2026-09-20 BY READING THE STYLESHEET.** This said the rhythm was
  `.pos-body > * + * { margin-top: 22px }`. It is **`--pos-gap: 40px`**,
  declared once at `shell.css:49`, applied by `.pos-stack` as a `margin-bottom`
  on every child but the last, with `margin-top: 0` forced on every child but
  the first. `shell.css`'s own comment says why the old one went: `.pos-body >
  * + *` reached ONE element's direct children and nothing else, it LOST to
  `.kbd`'s (0,1,0) on source order, and a row spliced onto `document.body` got
  no rhythm at all.
  ⚠️ **IT IS OWNED ON BOTH SIDES BY A CONTAINER, WHICH IS THE PART THAT
  MATTERS.** A sibling rule can be beaten by a page; a container that sets both
  the bottom margin and the top one leaves nothing for a page to disagree with.
  🔴 **AND A PAGE WITH NO SIBLINGS GETS NO RHYTHM, WHICH IS HOW `/held/` SHIPPED
  GLUED.** MEASURED 2026-09-20: `.pos-body` had **exactly one child**, a single
  `.pos-glue` holding the picture, the transport bar and the strip, so the gap
  list came back EMPTY. The rule was working perfectly and had nothing to act
  on. **Before hunting for a rule that lost, count the siblings**: two elements
  touching usually means they are not siblings at all.
  ⚠️ **`createGlue` IS FOR THE ONE PAIR IT WAS WRITTEN FOR**, a strip sitting on
  the transport bar that drives it, and its own header says so. *"One deck
  drives both"* is true of the log as well and proves too much. Inside a glue
  the children give up their border and radius, so a picture in one has nothing
  to say where its box ends. ⚠️ The failure this
  fixes is not ugliness: a pad, a strip, a transport bar, a knob row and a log
  with nothing between them read as ONE dense block, and a reader cannot tell
  which control belongs to which picture.
- 🔴 **follow TRACKS THE NEWEST FACT ON THE STRIP, WHICH IS NOT ALWAYS THE
  PLAYHEAD.** Every page before `/stage/` followed the playhead because there
  was nothing else it could be, and the rule was written into `followTick` as
  `S.pos`. A tab watching a show being RECORDED has a newest fact and no
  playhead: nothing is playing, the deck sits at 0, and the strip stood still
  while its own rows arrived. `followTarget` (option, or `setFollowTarget(fn)`)
  names it; `armWall(0)` at the recorder's start makes `wallPos()` the write
  head, and `() => wallPos()` is both cases written once, because `disarmWall()`
  hands back to the playhead by itself.
  ⚠️ **AND AN ARMED WALL MEANS THE PICTURE MOVES.** The strip repainted on
  `wallAnchor && deck.playing()`, so a real-time cursor was frozen whenever no
  deck was running and the whole feature was inert with every line of it
  correct. It repaints on `S.wallAnchor` alone now, and a page whose wall has
  stopped meaning anything puts it away rather than keeping a stale one.
  ⚠️ **A WINDOW IS A CEILING, NOT A WIDTH.** At 1280 px a three hour recording
  is 8.3 s per pixel, so the view in which the whole show fits is the view in
  which nothing in it reads. Open on `min(length, window)`, so a short piece
  still fits whole.
  ⚠️ **AND `followsPlayhead` REPORTS THE SETTING, NOT THE BEHAVIOUR.** A check
  built on it, on a finite `followPos` and on a window that MOVED read 32/32
  against a `followPos` sabotaged to ignore the target entirely: the harness had
  seeked the playhead to 90 s, so the number was large and real, and a window
  chasing it moved 17,119 px. Compare `followPos` against the WRITE HEAD and
  require the write head to be on screen.
- **One position surface per page.** A page with a strip passes
  `createTransportBar(…, { scrub: false })`: two horizontal time axes at
  different scales, stacked, is not a redundancy but a contradiction. The
  strip already seeks on press AND on drag, which the bar's slider did not.
  🔴 **AND A BAR MAY HAVE NO PLAY BUTTON AT ALL: `toggle: false`, 2026-09-16.**
  Play, pause and seek are all claims about a POSITION inside a sound, and
  `/keys/` has none: a note sounds while a key is held, there is nothing to
  start or resume, and a toggle whose only honest behaviour is to do nothing is
  the shape of control this project calls a lie. What such a bar still carries
  is the `chip`. On both board pages that is the presence badge, because the
  fact worth having about an instrument in another building is whether it is
  answering. ⚠️ **IT DISARMS EVERYTHING THAT DEPENDED ON PLAYING** rather than
  leaving it to read false by luck: `api.playing` is forced false, the space bar
  stops being a play key, the end-stop never arms, and `api.toggles` says so in
  one boolean. **`demo/verify.mjs` reads `api.toggles` before its play drill**,
  which clicks `.tbar-toggle` and asserts the position advanced; without that a
  bar with no toggle takes the harness red on a page where nothing is wrong.
