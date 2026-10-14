# Page comments: mirror

The full comments cut from the code under demo/ for mirror, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="mirror-1"></a>
## mirror-1: demo/mirror/index.html, style, line 13

````css
  /* ⚠️ BALANCED, WHICH IS THE SHELL'S RULE FOR SHORT CENTRED PROSE ARRIVING
     HERE. `shell.css` carries the argument in full at `.pos-lr-say`. MEASURED
     on this sentence 2026-09-23, in the one state that ever shows it, a browser
     with no WebGL2: greedy wrapping laid it out at **281.8 px over 245.6 px**
     in a 336 px box and **310.7 over 216.8** at 390 px, and it is 260.1 and
     267.3 at both widths now, because balancing makes the break the same one
     at every size the pane takes. */
````

<a id="mirror-2"></a>
## mirror-2: demo/mirror/index.html, style, line 32

````css
  /* 🔴 THE FOOTER IS A ROW OF CELLS, AND IT USED TO BE ONE GLUED STRING.
     It read the renderer's name, then the word `locked`, then `29.9 fps`, all
     strung onto one line with a separator between them, and the separator
     existed only because the values had been joined before anybody asked what
     they were. Reported on sight, with a photograph. A cell carries its own
     key, so there is nothing left to join, and each value sits
     in a box reserved for the widest reading it can ever show, so a digit
     changing moves nothing beside it.
     ⚠️ IT SCROLLS RATHER THAN DRAGGING THE PAGE SIDEWAYS. `overflow-x` cannot
     shrink a flex item below its content without `min-width: 0`, and CLAUDE.md
     records the measurement: 390 px of screen gave 141 px of document overflow
     with that half missing. Both properties or neither.
     ⚠️ AND IT IS NOT SELECTABLE. These numbers sit a thumb's width from the ⛶,
     so every long press here is a miss rather than a copy: photographed on an
     iPhone with selection handles dragged across `30.0 fps`. shell.css keeps
     readouts selectable as a rule; this row is the exception because it is part
     of a control strip. */
````

<a id="mirror-3"></a>
## mirror-3: demo/mirror/index.html, style, line 49

````css
  /* The control group: the four things that change both pictures.
     🔴 TWO BY TWO, AND IT WAS A WRAPPED ROW. Asked as *"look should controls
     should be 2x2 controls grid"*. `flex-wrap` fitted `LOOK`, `MIRRORS` and
     `GRAIN` onto one line and dropped `HUE` alone underneath, which is a shape
     nobody chose: it is whatever the four widths happened to add up to at this
     window size, and it changes as the window moves. Two columns by two rows is
     a decision, and `LOOK MIRRORS` over `GRAIN HUE` is the reading order the
     controls are already in.
     ⚠️ NOTHING HERE SAYS HOW WIDE A CONTROL IS. shell.css already puts each kit
     row's label on top under 560 px and gives its options the whole width, so
     the phone case only has to stop being two columns. A media query of this
     page's own about widths would be a fourth copy of a decision the stylesheet
     already makes for every page.
     ⚠️ `flex-basis: 100%` IS WHAT PUTS IT ON ITS OWN LINE, and that is the
     other half of the ask below: the group above can only have air under it if
     there is something under it. */
````

<a id="mirror-4"></a>
## mirror-4: demo/mirror/index.html, style, line 68

````css
    /* 🔴 MORE AIR UNDER THE HEADSET BUTTONS, AND THIS IS THE PAGE SAYING SO.
       Asked as *"add more space under them"*: the two session buttons sat 8 px
       above `LOOK`, which is `.pos-controls`' own gap, so six controls read as
       one block instead of as two kinds of thing. `.pos-controls` is one flex
       row with one gap, so raising it there would move every control row in the
       project for a claim about this one relationship. 14 px on top of the
       row's 8 makes 22, which is the single vertical rhythm `.pos-body` already
       uses between two blocks, so this is the project's own number rather than
       a new one. */
````

<a id="mirror-5"></a>
## mirror-5: demo/mirror/index.html, style, line 79

````css
  /* 🔴 ONE LABEL COLUMN, BECAUSE COLUMNS MAKE A RAGGED EDGE VISIBLE. In a
     wrapped row nobody could see that `LOOK`, `MIRRORS`, `GRAIN` and `HUE` are
     four different widths. Stacked in two columns their labels sit directly
     above each other and every segment starts at a different x.
     ⚠️ IT IS A PIXEL FLOOR, NOT `7ch`, AND THE REASON IS THAT THE TWO LABELS
     ARE NOT THE SAME TYPE. `.pos-choice-l` is 9.5 px tracked at .1em and
     `.pos-pick-l` is 11 px tracked at .06em, so one `ch`-based rule reserves
     two different widths and lines nothing up. 48 px is `MIRRORS`, the widest
     of the four, MEASURED in this browser rather than computed; the check in
     this page compares the four left edges, so a label that outgrows it says so
     rather than quietly going ragged again.
     ⚠️ WIDE ONLY. Under 560 px both labels are `display: block` on their own
     line and there is no column to share. */
````

<a id="mirror-6"></a>
## mirror-6: demo/mirror/index.html, style, line 104

````css
  /* ⚠️ THE SAME KEY STYLE AS THE READOUT AND THE KIT'S OWN CONTROL LABELS,
     copied from `.pos-k` rather than invented: these name a value the way every
     other label in the project names one, and a second convention for one job
     is how a set of pages stops looking like one thing. */
````

<a id="mirror-7"></a>
## mirror-7: demo/mirror/index.html, inline script, line 128

````js
  // 🔴 TWO PANEL COMPONENTS, ON PURPOSE, AND NEITHER IS THE OTHER'S LEFTOVER.
  // `video-panel.mjs` is the DOM panel and it draws the two panes on the FLAT
  // PAGE: real elements, a footer of real cells, the kit's own fullscreen
  // button and a second storey under it while it is full. `panel.mjs` draws a
  // panel INTO A CANVAS, and that is what a panel hung in a HEADSET is: a
  // framebuffer holds no text, so the footer there has to be laid out as pixels
  // and uploaded as a texture every time a number moves. Neither can do the
  // other's job, so deleting either one takes half this page with it.
````

<a id="mirror-8"></a>
## mirror-8: demo/mirror/index.html, inline script, line 148

````js
  /**
   * 🔴 THE ROOM AND THE SOCKET ARE `bay-node.mjs`'s SINCE 2026-10-06, AND THE
   * PAGE NO LONGER JOINS ON LOAD (plan-routing-migration step 5). It opened a
   * socket to `studio-1` at the top of this script and asked the Pi to draw, so
   * every visit and every harness run started the board's encoder. Now the
   * room is `roomFor`: `?room=` when given, `studio-1` for a person, and a
   * private room of the run's own under `?selfcheck=1`, so a harness cannot
   * reach the Pi at all. Nothing is opened until somebody presses
   * `Show the board` in the right-hand pane.
   * ⚠️ AND THIS TAB IS A SITE OF ITS OWN, `web-<four>`, announcing two ports,
   * so `/patchbay/` draws it: its shader as a `program` out, and its right
   * pane as a `video` in. The Pi already announces `pi-1:shader:program-in` and
   * `pi-1:shader:video-out` (`graph-registry.mjs` `boardGraph`); its site is
   * `pi-1` and no longer the room, since 2026-10-10.
   */
````

<a id="mirror-9"></a>
## mirror-9: demo/mirror/index.html, inline script, line 168

````js
  /**
   * ⚠️ AND THE LEFT PANE IS IN THE GRAPH TOO SINCE 2026-10-09, so the bay sees
   * this tab's local half (`plans/plan-site-names.md` §4e). The browser's own
   * render goes out as `webgl:video` and the left pane takes it in as
   * `left:video`. Both are on this tab, so the bay gives the link the `page`
   * transport and nothing is opened for it: the page already draws that pane.
   * The left pane is a node of its own rather than a second port on `screen`,
   * because two ports that differ in role are two nodes (§4c). `screen` keeps
   * its name until the §4c sweep renames it `right`.
   */
````

<a id="mirror-10"></a>
## mirror-10: demo/mirror/index.html, inline script, line 198

````js
    // 🔴 ONE SENTENCE, AND IT IS THE INDEX'S OWN LINE, VERBATIM. A page with a
    // diagram says what it is once and lets the picture at the bottom carry the
    // machinery: a paragraph and a drawing of the same thing are two
    // explanations and the paragraph is the weaker of them. This was FOUR
    // sentences and 62 words, PHOTOGRAPHED on an iPhone as the top half of the
    // screen before anything could be pressed.
````

<a id="mirror-11"></a>
## mirror-11: demo/mirror/index.html, inline script, line 205

````js
    // ⚠️ NO SHELL READOUT. Every number here belongs to ONE of the two pictures,
    // so it goes in that picture's own footer rather than in a row above both:
    // joining a figure to its ink across two elements is exactly what makes a
    // legend necessary, and a single row under two panes cannot say which pane
    // it means without repeating the word every time. The machine surface is
    // `__demo.panes`, set below.
````

<a id="mirror-12"></a>
## mirror-12: demo/mirror/index.html, inline script, line 212

````js
    /**
     * 🔴 THE ROW IS FILLED BY THIS PAGE, AND IT IS STILL `.pos-controls`. Both
     * harnesses press `.pos-controls button`, which is a DESCENDANT selector,
     * so a group mounted inside that row keeps every button pressable while a
     * row of controls anywhere else is a subject the suite cannot reach. This
     * page has paid for that once already: the look stepper sat in the knob row
     * for one revision and the assert count went 9 to 7 while the page read
     * GREEN.
     * ⚠️ `mount()` HIDES A ROW IT PUT NOTHING IN, which is the standing rule
     * about a container with nothing in it not painting its edges. This one is
     * filled a few lines down, so it is shown again rather than left as a band
     * of dead space that is about to have five controls in it.
     */
````

<a id="mirror-13"></a>
## mirror-13: demo/mirror/index.html, inline script, line 230

````js
  /**
   * 🔴 THE TWO SESSION CONTROLS ARE ONE KIT COMPONENT NOW, AND THIS WAS THE ONE
   * XR PAGE WITH NO CAPABILITY PROBE AT ALL. `Run in VR` and `Run in AR` were
   * live buttons on a phone that has no WebXR, so the only way to find out was
   * to press one and watch nothing happen. `xr-caps.mjs` answers `absent` in
   * the same turn wherever there is nothing to ask, which is every iPhone, and
   * the group switches the control off WITH THE REASON IN WORDS: a grey control
   * with no explanation reads as a broken page rather than as a browser that
   * cannot do the thing.
   *
   * 🔴 THE ID IS `vr` AND IT WAS `xr`. Four XR pages had three spellings for
   * one control, so a check written against one could not be read against
   * another.
   *
   * ⚠️ PREPENDED, NOT APPENDED, AND THE ORDER IS LOAD-BEARING. The harness
   * presses this row in DOM order and `settleMs` only ever lands on control 0,
   * so the session controls stay at the front of it.
   */
````

<a id="mirror-14"></a>
## mirror-14: demo/mirror/index.html, inline script, line 259

````js
  // 🔴 SUBSCRIBED, NOT READ ONCE. `isSessionSupported` is a promise, so a
  // button decided at load would be decided on `asking` every time. `onXrCaps`
  // fires at once with what is known and again on every change, and `canEnter`
  // counts `asking` as yes, so nothing is ever greyed out on a guess.
````

<a id="mirror-15"></a>
## mirror-15: demo/mirror/index.html, inline script, line 268

````js
  /**
   * 🔴 TWO CELLS A FOOTER, AND FOR ONE SESSION THERE WERE FIVE. What a pane
   * says under it is WHAT DREW IT and HOW FAST, which is what it said before
   * anybody touched this page. The move to `video-panel.mjs` also added `clock`
   * here and `kbit/s` and `lost` over there, and none of that was asked for:
   * *"you broke video footer. i never asked this info added"*. A cell has to
   * earn its place, and three of those five were earning a reader's attention
   * without being anything a reader had come for.
   *
   * ⚠️ AND NONE OF THE THREE WAS DELETED, WHICH IS THE HALF THAT MATTERS.
   * Whether this pane is running on its own count or on the board's, how many
   * kbit/s are actually arriving and how many frames the relay dropped are all
   * real, and the relay dropping frames with no error anywhere is the reason
   * that counter exists at all. They are in the LOG and on the BEACON now,
   * which is where this page already puts facts about a session: see
   * `sayLinkRate`, `sayLinkLost` and the two lock lines.
   *
   * ⚠️ BOTH FOOTERS CARRY THE SAME TWO, ON PURPOSE. Two footers of different
   * lengths under two pictures being compared read as two different kinds of
   * thing, which is the argument the headset panels' own footers already lost.
   *
   * The third number in the triple is the width the value is held at, in
   * characters, so a figure that changes every second cannot move the figure
   * beside it.
   *
   * ⚠️ EVERY CELL IS ALWAYS DRAWN, EVEN BEFORE IT HAS A VALUE. Building a
   * footer from only the facts that happen to be known means the first cell
   * starts at the left edge and JUMPS right the moment a frame rate lands. An
   * empty value under its own key says "not measured yet", which is true, where
   * an absent cell says nothing at all and a zero would be a very confident
   * measurement of nothing.
   */
````

<a id="mirror-16"></a>
## mirror-16: demo/mirror/index.html, inline script, line 308

````js
  // ⚠️ THE MACHINE COPY, WRITTEN FROM THE SAME VALUES IN THE SAME CALL. Two
  // places that can disagree is how a readout ends up describing something the
  // page is not doing. It is built HERE rather than further down because
  // `relabel` writes into it while the panes are still being made, and this
  // file has already been bitten three times by reading something before its
  // line ran.
````

<a id="mirror-17"></a>
## mirror-17: demo/mirror/index.html, inline script, line 317

````js
  /**
   * One pane: a picture, a row of facts under it, and the way to fill the
   * screen with it.
   *
   * 🔴 IT IS `video-panel.mjs` AND IT USED TO BE A HAND-ROLLED BAR. That bar
   * carried its own fullscreen button, its own three-column layout, its own
   * narrow-screen rearrangement and a routine that dragged the page's controls
   * into it, every one of which the kit now owns. `fullMode: 'footer'` keeps
   * the row of facts on screen while the panel is full, the ⛶ in that row is
   * the way back out on a phone with no Escape key, and `under()` carries this
   * page's own controls into a second storey beneath it.
   */
````

<a id="mirror-18"></a>
## mirror-18: demo/mirror/index.html, inline script, line 342

````js
    /**
     * 🔴 ONLY THE FAR PANE GETS A PRESENCE DOT, AND THAT IS THE WHOLE POINT OF
     * THE SLOT. The fact worth having about a Raspberry Pi in another building
     * is whether it is answering. The same dot under the left picture would be
     * a badge about the browser you are reading this in, which can never say
     * anything but online, and a control with one honest state is the shape
     * this project calls a lie.
     */
````

<a id="mirror-19"></a>
## mirror-19: demo/mirror/index.html, inline script, line 358

````js
      // 🔴 IT ASKS WHICH PANE IS FULL RATHER THAN BELIEVING THE ONE THAT
      // SPOKE, AND THAT IS NOT TIDINESS. A `fullscreenchange` is a DOCUMENT
      // event, so both panels hear every one of them: the pane going full
      // reports `true` and the other reports `false` in the same turn, and
      // whichever spoke last would have decided. With two panels on the page
      // that means the second one hands the controls straight back out of the
      // first, which is a row that vanishes at the moment it is needed.
````

<a id="mirror-20"></a>
## mirror-20: demo/mirror/index.html, inline script, line 370

````js
  // ⚠️ THE PICTURE NAMES THE THING THAT DREW IT, not the side of the screen it
  // is on. "here" and "the box" say where to look; the chip says what you are
  // looking at, which is the comparison the page exists to make. Until each end
  // reports, it says what it can.
  // ⚠️ NO ARTICLES. "a Raspberry Pi" reads as prose in a slot that is a name,
  // and beside a chip string like "Apple M2 Pro" the mismatch is obvious.
````

<a id="mirror-21"></a>
## mirror-21: demo/mirror/index.html, inline script, line 378

````js
  /**
   * ⚠️ NAME THE CHIP, NOT THE FIRST COMMA, AND DO IT FOR BOTH ENDS. Splitting
   * "ANGLE (Apple, ANGLE Metal Renderer: Apple M2 Pro, Unspecified Version)" on
   * its first comma leaves the word "Apple", which says nothing at all; the part
   * worth printing is what follows "Renderer:".
   * ⚠️ AND IT IS CAPPED, because this is one cell in a row three slots wide. A
   * driver is free to hand back forty characters, and a name that long pushes
   * the row past what a half-page footer can show. 24 fits every string either
   * end has been measured reporting, and a longer one is cut rather than
   * allowed to take the whole footer.
   */
````

<a id="mirror-22"></a>
## mirror-22: demo/mirror/index.html, inline script, line 394

````js
  // ⚠️ DECLARED HERE BECAUSE `relabel` READS IT, and `relabel` is called while
  // the panes are being built. A `let` further down is in the temporal dead
  // zone until its line runs, so the first call threw at module scope: a blank
  // page, no asserts, and a harness reporting "the page reports no renderer".
  // Second time in this file; the first was `knobRow`.
````

<a id="mirror-23"></a>
## mirror-23: demo/mirror/index.html, inline script, line 413

````js
  /**
   * 🔴 THE NAME AND THE CLOCK ARE TWO CELLS, AND THEY USED TO BE ONE STRING.
   * The renderer's name had the word `locked` glued onto the end of it, and
   * that glue is what let a third and a fourth fact be bolted on without
   * anybody deciding to. Reported on sight with a photograph, twice in one
   * minute.
   *
   * 🔴 AND IT ONCE PRINTED THE SAME NAME TWICE IN ONE FOOTER. The chip falls
   * back to the string `WHERE` holds, so before the board reported its own both
   * halves read `Raspberry Pi`. Which side you are looking at is already said
   * by WHICH PANE IT IS; the cell only has to name what drew it.
   */
````

<a id="mirror-24"></a>
## mirror-24: demo/mirror/index.html, inline script, line 432

````js
  /**
   * 🔴 THE DOT UNDER THE FAR PICTURE FOLLOWS THE FRAMES, NOT THE SOCKET. A
   * relay that is reachable says nothing about whether a board in another
   * building is plugged in, and the two are routinely different: the socket
   * opens in about 200 ms and the encoder may be switched off. Thirty frames a
   * second with thirty allowed to go missing is one second of silence, which is
   * the same deadline this page already uses to unlock its own frame counter,
   * written once rather than twice.
   * ⚠️ IT STARTS FOLLOWING AT THE PRESS, NOT AT LOAD. Before anybody asks, the
   * board has not been asked anything, so the dot stays `unknown` rather than
   * counting down to a silence nobody requested.
   */
````

<a id="mirror-25"></a>
## mirror-25: demo/mirror/index.html, inline script, line 448

````js
  /**
   * 🔴 THE PRESS THAT ASKS THE BOARD LIVES IN THE PANE IT FILLS, AND OUTSIDE
   * `.pos-controls` ON PURPOSE. Both harnesses press that row, so a button there
   * would join a room on every run, and a control added there moves every other
   * control's press. A person looks at the empty right-hand picture and finds
   * the button in it.
   */
````

<a id="mirror-26"></a>
## mirror-26: demo/mirror/index.html, inline script, line 470

````js
  /**
   * 🔴 A LINK BADGE ON THE BOARD'S PICTURE, AND NOTHING MORE THAN THAT. The
   * owner's words about a page moving onto the patchbay: *"perhaps just visual
   * indication of picture happening"*. So no patch view here: the right pane
   * wears STARTING, RECEIVING or STALLED, counted from frames DECODED here, the
   * far side of the link, and `/patchbay/` stays where links are drawn.
   * ⚠️ THE TAG SLOT IS HIDDEN WITH THE BADGE, because the slot paints its own
   * dark pill and a hidden child does not make it `:empty`.
   */
````

<a id="mirror-27"></a>
## mirror-27: demo/mirror/index.html, inline script, line 487

````js
  /**
   * 🔴 ONE CONTROL GROUP, AND ALL FOUR ROWS COME OUT OF THE KIT. Asked as
   * *"look,mirrort etc all into controls group"*. `LOOK` was already a
   * `createPicker`; `MIRRORS`, `GRAIN` and `HUE` were HAND-ROLLED here with
   * page-local `.knob` and `.seg` rules, and `choice.mjs`'s own opening comment
   * names this page as one of the three hand-built copies that made it a
   * component. The copy is gone and so is its CSS.
   *
   * 🔴 AND THE "FILL THE WIDTH ON A PHONE" ASK NEEDED NO CSS AT ALL. shell.css
   * already puts a choice's label on top under 560 px and gives its options the
   * whole row, growing to share it and scrolling rather than folding a word in
   * half. `.knob` matched none of those selectors, which was the entire bug:
   * converting to the component fixes it and a media query of this page's own
   * would have been a fourth copy of the same decision.
   */
````

<a id="mirror-28"></a>
## mirror-28: demo/mirror/index.html, inline script, line 504

````js
  /**
   * ⚠️ THREE CHOICES, AND THEY DRIVE BOTH PANES. A control that moved only the
   * local picture would break the one claim this page makes, that the two sides
   * are the same shader, and would do it invisibly: the panes would simply stop
   * matching and look like a bug. So each press sets the local uniform AND
   * sends `video.params` to the box.
   */
````

<a id="mirror-29"></a>
## mirror-29: demo/mirror/index.html, inline script, line 511

````js
  // ⚠️ WIDE ENOUGH TO SEE FROM ACROSS THE ROOM. The first pair were 4/8/16
  // mirrors and three feedback amounts, and the three steps of each looked like
  // the same picture in a slightly different mood: a control whose settings a
  // viewer cannot tell apart is a control that teaches nothing. These are
  // ranges chosen so the ends are unmistakable, and the middle of each is the
  // value the renderer ships with, so "mid mid mid" is the picture the rest of
  // this repo measured.
````

<a id="mirror-30"></a>
## mirror-30: demo/mirror/index.html, inline script, line 524

````js
    // HOW FAR APART THE THREE COLOUR CHANNELS ARE. The colour is three cosines
    // of the same field, offset by vec3(0, 0.33, 0.67), a third of a turn each,
    // which is what makes a full rainbow. Scaling those offsets is the whole
    // palette in one number: near zero the three channels move together and the
    // picture is a duotone sweep; at 1 it is the rainbow; past 1 the offsets
    // wrap and the hues come back round in a different order.
    // ⚠️ 2.2 WAS NOT "WIDER", IT WAS THE SAME RAINBOW RESHUFFLED, and it looked
    // it. Three phases a third of a turn apart is the MAXIMUM colour separation
    // there is: anything past that wraps and lands somewhere else on the circle
    // with no more spread than before, which is why `mid` and `wide` were hard
    // to tell apart. 1.5 is the interesting place instead: the green channel
    // goes half a turn while red and blue come back to nearly the same phase,
    // so the picture splits into two opposed colours, magenta against green,
    // rather than running through all of them. Checked by sweeping
    // 0.12/0.45/1.0/1.5/1.8/2.2 and looking at the six.
````

<a id="mirror-31"></a>
## mirror-31: demo/mirror/index.html, inline script, line 542

````js
  // 🔴 THE WHOLE GROUP GOES IN `.pos-controls`, AND THAT IS NOT A LAYOUT
  // PREFERENCE. The look control sat in the knob row for one revision and the
  // assert count went 9 to 7 while the page read GREEN: both harnesses press
  // `.pos-controls button` and nothing else, so a control anywhere else is
  // never exercised and its asserts never run. That is this project's oldest
  // failure, a green suite over a path the suite cannot reach, committed by
  // moving a button.
  //
  // It is a PICKER rather than a "next" because a list you can only walk
  // forwards through is one you have to go all the way round to revisit.
````

<a id="mirror-32"></a>
## mirror-32: demo/mirror/index.html, inline script, line 553

````js
    // 🔴 `createPicker`, NOT A STEPPER PLUS A SPAN. This was `createStepper` with
    // a hand-made `.lookname` next to it, which is the shape CLAUDE.md warns
    // about by name: a control that exists in one page and nowhere else is a
    // component that has not been noticed yet. The picker already puts the
    // current name INSIDE the row, already carries the die, and already sits on
    // the shared segmented join, so the separate span and the CSS rule for it go
    // with it. REPORTED, after the same swap had been made on `/archive/radio/`.
````

<a id="mirror-33"></a>
## mirror-33: demo/mirror/index.html, inline script, line 582

````js
    // ⚠️ THE LIST IS FILLED WHERE `LOOKS` EXISTS, NOT HERE. The shader sources
    // are declared BELOW this row, so reading `LOOKS[0].name` at build time is a
    // temporal dead zone: `Cannot access 'LOOKS' before initialization`, at
    // module scope, which means a blank page with no asserts and no log line
    // saying why. This file's own comments already record two of these.
````

<a id="mirror-34"></a>
## mirror-34: demo/mirror/index.html, inline script, line 606

````js
  /**
   * 🔴 THE CONTROLS FOLLOW THE PICTURE INTO FULL SCREEN, AND IT IS THE SAME ROW
   * MOVED RATHER THAN A SECOND COPY. Asked as *"extend videopanel footer in
   * fullscreen so it can have section below the footer bar (separaet with
   * line). put controlgroup there"*. Two rows of buttons that can disagree
   * about which option is chosen would be a readout living in two files, so the
   * panel takes this row, remembers where it came from and puts it back on the
   * way out. Off screen it is in `.pos-controls`, which is where a visitor
   * looks for it and where both harnesses can press it.
   *
   * ⚠️ ONE PANEL AT A TIME. A row cannot be in two places, so whichever pane is
   * not full hands it back before the one that is takes it.
   */
````

<a id="mirror-35"></a>
## mirror-35: demo/mirror/index.html, inline script, line 625

````js
    // ⚠️ ASKED BEFORE IT IS HANDED OVER. `under()` puts the row home and picks
    // it up again, so calling it on a panel that already holds the row is a
    // detach and a re-attach for nothing, and every fullscreen change reaches
    // both panels.
````

<a id="mirror-36"></a>
## mirror-36: demo/mirror/index.html, inline script, line 637

````js
  /**
   * One choice pressed, on both pictures.
   *
   * ⚠️ THE SOCKET IS ALLOWED TO BE SHUT. Every press sends to the board, and
   * until a harness started pressing these they were only ever reached by a
   * hand on a page whose socket was open. A throw out of a click handler is a
   * control that looks like it worked and left an exception behind it, so the
   * send is guarded and the local picture changes either way.
   */
````

<a id="mirror-37"></a>
## mirror-37: demo/mirror/index.html, inline script, line 663

````js
  /**
   * Each pane's own numbers, under it, written through the machine copy so the
   * two cannot come apart. `FIELDS`, `FMT` and `paintFacts` are up with the
   * panes, where the cells are made.
   */
````

<a id="mirror-38"></a>
## mirror-38: demo/mirror/index.html, inline script, line 673

````js
  // ── the panels that hang in a headset ───────────────────────────────────
  //
  // 🔴 TWO PANELS, BECAUSE THE PAGE'S SUBJECT IS TWO PICTURES. It was one panel
  // showing whichever end happened to be sending, which is the flat page's
  // comparison collapsed into a single rectangle — you could not hold the two
  // against each other, which is the only thing this demo is for.
  //
  // 🔴 AND THE LEFT ONE IS RENDERED IN THE HEADSET RATHER THAN COPIED INTO IT.
  // A page's own WebGL canvas is a DIFFERENT CONTEXT from the one an immersive
  // session draws with: its programs and textures do not exist there, so the
  // only way a canvas reaches a headset is as a bitmap copied across every
  // frame — a photograph of a render taken a frame ago. `liveMirror` below
  // compiles the SAME shader body into the session's own context and hands back
  // a texture, so the picture in the headset is the graphics chip in the
  // headset drawing it. What that costs is measured rather than assumed: see
  // `liveWhereCost` on `__demo.xr`.
  //
  // 🔴 THE 2-D PAGE IS INVISIBLE ONCE A HEADSET IS ON. The log, the two bars and
  // every number in them are behind your face, so anything worth reading while
  // wearing it has to be drawn INTO the picture. A rendered picture cannot carry
  // a word, so its numbers arrive as a separate strip — a ninth of the pixels,
  // handed over only when a number moves.
````

<a id="mirror-39"></a>
## mirror-39: demo/mirror/index.html, inline script, line 701

````js
  // 🔴 HOW BIG THE LIVE PICTURE IS RENDERED, AND IT IS DERIVED RATHER THAN
  // CHOSEN. The panel is 1.28 m across at 1.6 m, which is 43.6 degrees; a Quest
  // 3 eye is 1680 px over roughly 95 degrees, so the panel covers about 770 of
  // them. Anything past that is pixels nobody can resolve, and this shader is
  // ALU-bound (`plan-visuals` §3.4: ~50 Mpix/s on the Pi's GPU at both 720p and
  // 1080p), so resolution is paid for linearly and buys nothing above the eye.
  // 960 is a comfortable margin over 770 and the height follows the picture
  // area's own aspect — the panel minus its footer strip — so the render is
  // never stretched to fit the quad.
````

<a id="mirror-40"></a>
## mirror-40: demo/mirror/index.html, inline script, line 712

````js
  // ⚠️ DRAWN ONLY WHEN SOMEBODY IS LOOKING AT IT. Copying the picture into the
  // panel and laying out five numbers costs real time every frame, and this
  // page MEASURES ITS OWN FRAME RATE — a decoration that quietly lowers the
  // number the page exists to report is worse than no decoration. It is off
  // until a session is running, and turned on for a quarter of a second when
  // the checks want to look at it.
````

<a id="mirror-41"></a>
## mirror-41: demo/mirror/index.html, inline script, line 479

````js
  // Assigned inside the renderer block below, because that is where they live.
  // ⚠️ DECLARED UP HERE, though: this file has already been bitten three times
  // by reading a `let` before its line ran — `knobRow`, `lockedFrame` and
  // `LOOKS` — and each one was a blank page with no log line saying why.
````

<a id="mirror-42"></a>
## mirror-42: demo/mirror/index.html, inline script, line 485

````js
  // The shader body both renderers are running. ⚠️ ONE STRING, because the live
  // renderer is built when a session starts — long after a look may have been
  // changed — and a second copy is how the two ends of this page would come to
  // be drawing different pictures while claiming to draw one.
````

<a id="mirror-43"></a>
## mirror-43: demo/mirror/index.html, inline script, line 494

````js
  /**
   * The left-hand picture, rendered by whatever graphics context it is given.
   *
   * ⚠️ `attach` IS HANDED THE SESSION'S CONTEXT AND COMPILES INTO IT. Nothing
   * from the flat page's context can be reused — not the program, not the
   * feedback targets, not the textures — which is exactly why this is a
   * measurement worth taking rather than a copy with fewer steps.
   */
````

<a id="mirror-44"></a>
## mirror-44: demo/mirror/index.html, inline script, line 520

````js
  /**
   * ⚠️ CALLED FROM INSIDE THE RENDER CALLBACK THAT JUST DREW, never on a timer
   * of its own. The left-hand canvas is a 3-D surface with no preserved
   * drawing buffer, so it can only be copied in the same turn as the frame that
   * filled it — read it a task later and you get a cleared surface, which would
   * reach the panel as a black rectangle that looks like a broken stream.
   *
   * ⚠️ AND A PANEL THAT IS NOT LIVE SAYS SO IN WORDS. A frozen frame reads as a
   * broken stream — `plans/plan-xr-room.md` §5.6, and the same rule as a blank readout
   * cell collapsing "we did not look" into "we looked and it was fine".
   */
````

<a id="mirror-45"></a>
## mirror-45: demo/mirror/index.html, inline script, line 537

````js
      // 🔴 WHICH PATH DREW WHAT YOU ARE LOOKING AT. The two cost different
      // things and look identical, so the picture has to say which it is or the
      // comparison is one nobody can make.
````

<a id="mirror-46"></a>
## mirror-46: demo/mirror/index.html, inline script, line 542

````js
      // ⚠️ THE CARD'S OWN TIME, AND IT IS BLANK WHERE NO DRIVER WOULD SAY. A
      // zero here would read as "free", which is a claim nobody measured.
      // 🔴 `card` AND `floor` ARE GONE — reported from the headset as the two
      // that did not make sense, and both were right to go for the same reason:
      // a panel's footer carries what THAT PANEL measured, and neither was
      // about this panel.
      //
      // `card` is the graphics card's own time for the live render, and on the
      // Quest it was permanently blank: that driver exposes no GPU timer, so
      // the cell could never say anything on the machine it was added for. A
      // cell that cannot change is a cell that teaches you to stop reading the
      // row.
      //
      // `floor` is whose floor the dots are on — a fact about the ROOM, printed
      // under a picture of a shader. It was put here because the 2-D page is
      // behind your face in a headset, which is a real problem and the wrong
      // solution: it belongs where the room is described, not in a panel whose
      // subject is one rendering of one shader.
      //
      // ⚠️ Neither fact is DELETED. The card's time is still in the
      // once-a-second beacon (`live Y ms cpu / Z ms gpu`), and the floor's
      // provenance is on the first-frame line (`grid drawing on the page` /
      // `on your room`) — so both are readable, in the log, where a fact about
      // the session belongs.
````

<a id="mirror-47"></a>
## mirror-47: demo/mirror/index.html, inline script, line 567

````js
    // ⚠️ ONLY WHEN A NUMBER ACTUALLY MOVED. The strip is a texture upload in the
    // headset, and a version counter that ticks on every draw makes the "only
    // when it changed" upload rule a lie — the exact shape of an optimisation
    // that reads as working. Comparing the values is cheap and exact; a clock
    // would be a second rule to keep in step.
````

<a id="mirror-48"></a>
## mirror-48: demo/mirror/index.html, inline script, line 591

````js
        // ⚠️ THE PROCESSOR'S TIME, NOT THE CARD'S. This is how long it takes to
        // hand this panel to the graphics card each frame; the card's own time
        // for the copy cannot be read from here at all.
        // ⚠️ And the same trim on this side, so the two panels stay a PAIR.
        // Two footers of different lengths under two pictures being compared
        // read as two different kinds of thing. `copy` is the processor's time
        // to hand this panel to the card — a cost of the DISPLAY path, not of
        // what crossed the network — and `lost` is in the beacon.
````

<a id="mirror-49"></a>
## mirror-49: demo/mirror/index.html, inline script, line 604

````js
  /**
   * 🔴 THE FAKE LIGHT THE PICTURES THROW ON THE FLOOR, AND WHERE ITS ONE NUMBER
   * COMES FROM.
   *
   * The whole of it is the AVERAGE COLOUR of the left-hand picture, taken by
   * drawing that canvas into an 8x8 one and reading it back — so it is a real
   * measurement of the picture, and it is the only thing that crosses from the
   * picture to the floor. See GRID_FS in shell/xr-room.mjs for the list of
   * things it is not: no area, no inverse square, no shadow, nothing else in
   * the room lit by it.
   *
   * ⚠️ FOUR OR FIVE TIMES A SECOND, NOT NINETY. `getImageData` is a readback and
   * a readback at frame rate on a tile-based part is a stall; light also does
   * not need to be exact to be convincing, which is the one place a fake has an
   * easier job than the real thing.
   *
   * ⚠️ AND THE AMPLITUDE IS HELD LOW ON PURPOSE. "a bit" was the whole of the
   * request, and a convincing fake invites somebody to believe a measurement
   * nobody made.
   */
````

<a id="mirror-50"></a>
## mirror-50: demo/mirror/index.html, inline script, line 624

````js
  // ⚠️ 0.34 WAS INVISIBLE, MEASURED OFF A RENDERED FRAME rather than guessed
  // at: with the pool falling off round a panel 1.6 m above the floor, the
  // brightest point of the wash came out at about 7 of 255 — a fake nobody can
  // see, which is not a subtle fake but an absent one. This is still "a bit":
  // at the picture's usual brightness it lands near 0.22, and the floor under
  // the panels takes about 4% of the dots' own strength in the picture's hue.
````

<a id="mirror-51"></a>
## mirror-51: demo/mirror/index.html, inline script, line 654

````js
      // ⚠️ AND IT MUST NOT SIT AT THE CEILING. The first version multiplied by
      // 1.6 and this picture pinned it at the maximum on every frame — a value
      // that cannot move is a value that says nothing, whatever it is
      // measuring. Straight through, so a dark look is a dim room and only a
      // white picture reaches the top.
````

<a id="mirror-52"></a>
## mirror-52: demo/mirror/index.html, inline script, line 662

````js
  // ⚠️ AND THE RADIUS IS 3 m RATHER THAN 2.4, for the same reason: the nearest
  // floor is already 1.6 m from a panel hanging at eye height, so a radius near
  // that distance spends most of the falloff before the light reaches anything.
````

<a id="mirror-53"></a>
## mirror-53: demo/mirror/index.html, inline script, line 668

````js
  // ── the picture, here ────────────────────────────────────────────────────
  //
  // ⚠️ THIS IS THE SAME SHADER AS rig/vis/v3dpipe.c, PORTED RATHER THAN
  // REWRITTEN — and the port is three lines of difference, which is itself the
  // argument the page is making. The board runs `#version 310 es` because it
  // has GLES 3.1; WebGL2 is GLSL ES 3.00, and nothing in the fragment shader
  // needs 3.10. Everything else — gl_VertexID, `out vec4`, texture(), highp —
  // is unchanged.
  //
  // ⚠️ AND `uT` IS A FRAME COUNTER, NOT A CLOCK. The C drives it as i/30.0. If
  // this drove it from wall time the two panes would be the same shader making
  // visibly different motion, and the page's whole claim would read as false
  // while both halves were working.
````

<a id="mirror-54"></a>
## mirror-54: demo/mirror/index.html, inline script, line 684

````js
  // ⚠️ THE BODY IS SHARED, THE HEADER IS NOT. The board compiles this same
  // text as `#version 310 es` and the browser as `300 es`, so what travels over
  // the socket is the BODY and each end puts its own first line on it. Until
  // now the two copies agreed by discipline: edit one, forget the other, and
  // nothing anywhere says so. One text, two compilers.
````

<a id="mirror-55"></a>
## mirror-55: demo/mirror/index.html, inline script, line 710

````js
  /**
   * Other looks, on the SAME uniforms — so the three knobs keep meaning what
   * they say whichever one is running. A body that invented its own controls
   * would make the knobs lie, which is worse than not having the body.
   *
   * These are deliberately short. The point is not a shader library; it is that
   * a picture can be replaced while it is being watched, on two machines at
   * once, and you can see it happen.
   */
````

<a id="mirror-56"></a>
## mirror-56: demo/mirror/index.html, inline script, line 768

````js
  // ⚠️ LOCK THE LOCAL PICTURE TO THE BOARD'S FRAME NUMBER WHEN ONE IS ARRIVING.
  // Free-running, the two panes are the same shader counting from different
  // starts — the same family of shape in unrelated colours, which a viewer
  // reads as "these do not match" and which makes the page argue against
  // itself. The board's per-frame sequence number IS its frame counter, so
  // driving `uT` from it puts both panes on the same instant. Then anything
  // still visibly different between them is the PIPELINE, which is the thing
  // worth looking at.
  // (`lockedFrame` and `lockedAt` are declared with `chip`, above, because
  // `relabel` reads them while the panes are still being built.)
````

<a id="mirror-57"></a>
## mirror-57: demo/mirror/index.html, inline script, line 779

````js
  /**
   * 🔴 THE WHOLE PICTURE, AS A FUNCTION OF A GRAPHICS CONTEXT.
   *
   * It used to be one block of code closed over this page's own `gl`, which
   * made it unusable anywhere else — and "anywhere else" turned out to be the
   * one place that mattered: an immersive session draws with a DIFFERENT
   * WebGL2 context, where none of these programs, targets or textures exist. A
   * canvas can only reach that context as a bitmap copied across every frame.
   *
   * So the shader machinery takes its context as an argument and there are two
   * instances of it: one on the flat page's canvas, one inside the headset's
   * session. Same text, same uniforms, same feedback tap, same crossfade — and
   * that is the page's own claim ("the same shader on two machines") applied to
   * the two ends of one browser.
   */
````

<a id="mirror-58"></a>
## mirror-58: demo/mirror/index.html, inline script, line 823

````js
    // ⚠️ MIXING IS A THIRD PROGRAM, NOT A UNIFORM IN THE OTHER TWO. A crossfade
    // done with an `uAlpha` would only work on shaders that agreed to carry
    // one — and the whole point is to accept a body somebody just wrote. Two
    // pictures, drawn to their own targets, mixed by something that knows
    // nothing about either.
````

<a id="mirror-59"></a>
## mirror-59: demo/mirror/index.html, inline script, line 847

````js
    // ⚠️ ONE VERTEX ARRAY PER CONTEXT, BOUND ONCE. A vertex array object belongs
    // to the context that made it; the session's context has none of this
    // page's, which is the whole reason this function takes `g`.
````

<a id="mirror-60"></a>
## mirror-60: demo/mirror/index.html, inline script, line 876

````js
        // ⚠️ THE MIXED RESULT IS WHAT FEEDS BACK, not either half. This shader
        // reads its own previous frame; feeding it one arm of a crossfade would
        // make the trail disagree with the picture and the fade would look like
        // a glitch rather than a dissolve.
````

<a id="mirror-61"></a>
## mirror-61: demo/mirror/index.html, inline script, line 900

````js
    /**
     * The same pass at a fraction of the size, into a target nobody sees.
     *
     * ⚠️ IT DOES NOT TOUCH THE PICTURE. Rendering the probe into the visible
     * ping-pong would put one soft frame into the feedback tap and leave a
     * smear that lasts as long as the trail does — a measurement changing the
     * thing it measures, on the one page where the trail IS the subject.
     */
````

<a id="mirror-62"></a>
## mirror-62: demo/mirror/index.html, inline script, line 937

````js
    // ⚠️ SAY WHICH RENDERER, ALWAYS. A visitor on a software rasteriser is a
    // real visitor, and a page that is quietly slow teaches nothing. It is also
    // what demo/verify-gl.mjs checks its own answer against.
    // The parse and the cap are `shortChip`, up with the names, because the
    // board's string goes through exactly the same one.
````

<a id="mirror-63"></a>
## mirror-63: demo/mirror/index.html, inline script, line 948

````js
    /**
     * A new look, on BOTH renderers.
     *
     * 🔴 AND THE BODY IS REMEMBERED, because the second renderer may not exist
     * yet. A look chosen on the flat page and then a headset put on would
     * otherwise start the session on the shader this file happened to ship
     * with — two ends of one page drawing different pictures while the page's
     * whole claim is that they draw the same one.
     */
````

<a id="mirror-64"></a>
## mirror-64: demo/mirror/index.html, inline script, line 979

````js
    // ⚠️ WHICH FRAMEBUFFER HOLDS THE FRAME THAT WAS JUST DRAWN. Reading pixels
    // without binding one reads whatever happens to be current, and with
    // `preserveDrawingBuffer: false` the default framebuffer is not readable
    // after the frame ends at all — so a check would sample an undefined
    // surface and report a flat field on a picture that is fine.
````

<a id="mirror-65"></a>
## mirror-65: demo/mirror/index.html, inline script, line 986

````js
    // How often the flat picture is still drawn while the headset is drawing
    // its own. ⚠️ NOT ZERO, and for one reason: the fake light on the floor is
    // the average colour of that canvas, and a canvas nobody is drawing to has
    // no colour to average. Five times a second is enough for light and it is
    // 1 frame in 18 of the headset's, which is named here rather than left for
    // somebody to find in the A/B.
````

<a id="mirror-66"></a>
## mirror-66: demo/mirror/index.html, inline script, line 994

````js
    // ⚠️ ONE FRAME, AND A SCHEDULER THAT IS NOT PART OF IT. Inside a headset
    // this page's own requestAnimationFrame stops being the clock — the session
    // has its own, at the headset's rate — so the thing that draws a frame has
    // to be callable from either.
````

<a id="mirror-67"></a>
## mirror-67: demo/mirror/index.html, inline script, line 999

````js
      // ⚠️ A LOCK WITH NO TIMEOUT FREEZES THE THING IT LOCKED. When the box
      // stops sending — it died, the stream ended, the socket dropped without a
      // `video.stopped` — the counter stops advancing and this pane stops with
      // it. Both pictures then appear dead and only one of them actually is,
      // which is the page failing at the exact moment it should be showing that
      // the local one needs nobody. Unlock after a second of silence.
````

<a id="mirror-68"></a>
## mirror-68: demo/mirror/index.html, inline script, line 1009

````js
        // 🔴 THE LOCK IS A STATE CHANGE AND IT GOES IN THE LOG, WHICH IS WHERE
        // A STATE CHANGE GOES. It was a `clock` cell for one session and a
        // the word `locked` glued onto the end of the renderer's name before
        // that; neither was asked for. Both edges are said now, here and where a frame arrives,
        // so the fact is still reported and it is reported when it moves.
````

<a id="mirror-69"></a>
## mirror-69: demo/mirror/index.html, inline script, line 1017

````js
      // ONE CLOCK FOR BOTH RENDERERS. `uT` is a frame counter, not wall time —
      // the board drives it as i/30 — so the two ends only match if they are
      // handed the same number, and the headset's renderer reads it from here.
````

<a id="mirror-70"></a>
## mirror-70: demo/mirror/index.html, inline script, line 1031

````js
        // In the SAME turn as the frame that filled the canvas — a WebGL canvas
        // with no preserved drawing buffer reads back empty one task later.
        // ⚠️ AND ONLY WHERE SOMETHING IS LIT BY IT. `getImageData` is a readback;
        // paying for one on every visitor who will never put a headset on is a
        // cost with nothing on the other side of it, which is the same argument
        // that keeps the session's own context unbuilt until it is needed.
````

<a id="mirror-71"></a>
## mirror-71: demo/mirror/index.html, inline script, line 1056

````js
  // ── the same panels, in a headset ───────────────────────────────────────
  //
  // 🔴 THE SESSION ITSELF IS demo/shell/xr-panel.mjs, NOT THIS PAGE. Getting
  // into an immersive session is the most expensive code in this repo to get
  // right — five separate defects, every one of them found by a real Quest and
  // every one of them silent from outside — so it lives in one module and this
  // page hands it pictures and a way to keep them up to date. The rules it
  // holds are listed at the top of that file.
````

<a id="mirror-72"></a>
## mirror-72: demo/mirror/index.html, inline script, line 1065

````js
    // 1.28 m across at 1.6 m in front of you: about 44 degrees, which is wide
    // enough to read without moving and narrow enough to turn away from. Being
    // able to turn away from it is the whole of the gaze-gating in
    // `plans/plan-xr-room.md` §2, so the panels are placed in the room rather than
    // pinned to your face — and either can be picked up by the bar under it and
    // put somewhere else.
````

<a id="mirror-73"></a>
## mirror-73: demo/mirror/index.html, inline script, line 1072

````js
      // The left one, RENDERED IN THE HEADSET. `canvas` is still here and it is
      // not redundant: it is the other arm of the A/B, so the thumbstick can
      // put the copied-in picture back on the same quad and the two can be held
      // against each other without taking the headset off.
````

<a id="mirror-74"></a>
## mirror-74: demo/mirror/index.html, inline script, line 1084

````js
    // 🔴 A FLOOR AND NOTHING ELSE. The room `scene` rolls has a kaleidoscope
    // sky cube and a dozen objects in it, and both were asked to go from this
    // page: what should be in here is the two pictures and something to stand
    // on. ⚠️ IT IS A PER-PAGE OPTION, NOT A CHANGE TO THE MODULE — `scene` is
    // a page about a room made of objects and it still gets all of them.
    // ⚠️ AND THE WALLS WERE CARRYING THE LIGHT. Their brightness was raised
    // once because without it "the room reads as black"; with them gone that
    // is now literally what is behind the floor, so `bg` is chosen here rather
    // than inherited, and the panels and the fake light off them are what is
    // left to carry the place. It is a dark room on purpose.
````

<a id="mirror-75"></a>
## mirror-75: demo/mirror/index.html, inline script, line 1095

````js
    // ⚠️ WIDER THAN THE MODULE'S DEFAULT, AND IT IS ARITHMETIC RATHER THAN
    // TASTE. A 1.28 m panel at 1.6 m subtends 2·atan(0.64/1.6) = 0.76 rad, so
    // the default 0.70 rad between centres puts their edges in contact and the
    // pair reads as one folded screen rather than as two pictures. 0.86 leaves
    // about six degrees of room between them.
````

<a id="mirror-76"></a>
## mirror-76: demo/mirror/index.html, inline script, line 1105

````js
    // ⚠️ THIS PAGE'S OWN LOOP IS THE THING THAT STOPS. Inside a session the
    // headset owns the clock, so the shader is stepped from here — without it
    // the panel would carry the last frame drawn before the session started,
    // which is a frozen picture and reads as a broken stream.
    // ⚠️ AND `drawPanel` IS NOT CALLED AGAIN HERE. `step` already draws the
    // panels on any frame where a session is running; calling it twice would
    // lay out the numbers twice a frame and put that cost into the very
    // measurement this page is taking.
````

<a id="mirror-77"></a>
## mirror-77: demo/mirror/index.html, inline script, line 1118

````js
  // 🔴 THE ONE WAY TO LOOK AT WHAT A HEADSET WOULD SEE, FROM A MACHINE WITH NO
  // HEADSET. `Page.captureScreenshot` cannot see an immersive view — measured,
  // research §3.3 — so without this the only reviewer of this page's 3-D is
  // somebody wearing it. A harness can drive the same per-eye draw off-screen
  // and get a PNG back.
````

<a id="mirror-78"></a>
## mirror-78: demo/mirror/index.html, inline script, line 1125

````js
  /**
   * One handler, two kinds of session.
   *
   * 🔴 BOTH ARE REAL BRANCHES AND BOTH ASSERT, on every run. A page that
   * branches must grade every branch or the suite is green over a path nobody
   * reached — this project's oldest and most expensive failure. The labels
   * carry the mode so two runs can be held side by side rather than merged.
   */
````

<a id="mirror-79"></a>
## mirror-79: demo/mirror/index.html, inline script, line 1133

````js
  // 🔴 WHICH MODES HAVE ALREADY BEEN GRADED, AND THIS IS NOT A CACHE. Both
  // session controls are switched off on any browser that cannot open a
  // session, which is every laptop and every phone, so the press that used to
  // run the checks below never happens there any more. `runChecks` drives
  // whichever mode nobody reached rather than letting a disabled control take a
  // branch out of the run, and this is what stops the two ever both firing.
````

<a id="mirror-80"></a>
## mirror-80: demo/mirror/index.html, inline script, line 1144

````js
    // ⚠️ WAIT FOR THE PROBE, NEVER RE-ASK IT. Whether this browser can show an
    // immersive session is answered once at load, away from any gesture,
    // because asking again here can spend the user activation `requestSession`
    // needs. On a very fast press the answer may not be back yet, and a bounded
    // wait is the difference between "we have not looked" and "there is none".
````

<a id="mirror-81"></a>
## mirror-81: demo/mirror/index.html, inline script, line 1158

````js
      // ⚠️ A LAST NET, ON THE BEACON. Every await inside the module is guarded,
      // but the failure that cost two headset runs was a plain synchronous
      // statement between the guarded parts — and a handler whose failure mode
      // is silence cannot be trusted to its own internal care. The batched
      // shipper is no use here: entering a session is exactly when timers stop
      // being generous.
````

<a id="mirror-82"></a>
## mirror-82: demo/mirror/index.html, inline script, line 1177

````js
    // ⚠️ THE ROOM IS ARITHMETIC, SO A LAPTOP CAN GRADE IT. The panels' frame
    // rate needs a headset and nothing here can change that — but what the room
    // is made of, and whether the page can SAY where the dotted floor came
    // from, are answerable on this machine.
````

<a id="mirror-83"></a>
## mirror-83: demo/mirror/index.html, inline script, line 1182

````js
    // 🔴 THIS ASSERT USED TO READ `things > 0` AND IT WOULD NOW BE FALSE FOR
    // THE RIGHT REASON, which is the worst kind of red. The objects were turned
    // off on purpose, so the thing worth grading moved to the floor — and the
    // property it grades is one that has actually broken here: the dots used to
    // reach 5 m while the fade did not finish until 11, leaving them at two
    // thirds strength where the quad simply stopped. A hard edge, five metres
    // in front of your face, drawn by the fade's own constants disagreeing with
    // the floor's.
````

<a id="mirror-84"></a>
## mirror-84: demo/mirror/index.html, inline script, line 1195

````js
    // 🔴 "NO SURFACES" MUST NEVER BE DRAWN AS "NO WALLS". Real room data is
    // optional and it does not gate the grid: with none, the dots go on the
    // page's own floor and the page has to SAY that is what they are. The
    // sentence is the assert, because a grid nobody can attribute is a picture
    // claiming to be a measurement.
````

<a id="mirror-85"></a>
## mirror-85: demo/mirror/index.html, inline script, line 1204

````js
    // 🔴 THE CONTROLLER INTERFACE IS THE ROOM'S, NOT THIS PAGE'S, AND IT HAS NO
    // SESSION MODE IN IT. The same stand-ins, the same beam off the right
    // hand's target ray, the same tablet on the left — out of the same two
    // modules `scene` uses, so there is no second copy here to drift. The
    // string is the one both pages beacon on their first headset frame, which
    // is how two runs in two modes are compared without a third.
````

<a id="mirror-86"></a>
## mirror-86: demo/mirror/index.html, inline script, line 1216

````js
      // ⚠️ A BOUNDED WAIT FOR A SECOND OF FRAMES, not for the first one. The
      // frame rate is counted over a one-second window, and the FIRST of those
      // seconds contains the shader compiling and the panel's first, largest
      // copy to the graphics card — so a rate read at the first frame is a
      // number about starting up rather than about running. It is bounded
      // because a session that never draws must report that, not hang here.
````

<a id="mirror-87"></a>
## mirror-87: demo/mirror/index.html, inline script, line 1231

````js
      // 🔴 PASSTHROUGH IS GRADED ON THE BLEND MODE, NEVER ON THE SESSION'S
      // NAME. A session can be called `immersive-ar` and still composite
      // `opaque`, which presents as a drawing bug rather than as a session one
      // — and in VR `opaque` is the correct answer, so the two modes expect
      // opposite things from the same field.
````

<a id="mirror-88"></a>
## mirror-88: demo/mirror/index.html, inline script, line 1245

````js
      // 🔴 THE NUMBER `plans/plan-xr-room.md` §4.1 EXISTS TO GET: a Quest 3 holds 89.8
      // frames a second in an empty room, and what the pictures cost against
      // that is the open question the rest of the room depends on. The detail
      // now carries the whole bill — the copy in, the render here, and the
      // card's own time for it where a driver will say.
      //
      // ⚠️ GRADED AGAINST WHAT THIS HEADSET PROMISES, NEVER AGAINST A TYPED
      // NUMBER. A fixed floor of 60 was tried and it flapped on the first thing
      // that ran at 60 — a threshold sitting exactly on a plausible refresh rate
      // has no warning left in it. Where the headset says what it runs at, nine
      // tenths of that is the floor; where it will not say — and a Quest 3 does
      // not — 55 is a stall detector and the detail says so, because a number
      // whose basis is invisible cannot be argued with.
````

<a id="mirror-89"></a>
## mirror-89: demo/mirror/index.html, inline script, line 1267

````js
      // ⚠️ ASSERT ON THE ERROR FLAG. A page will draw a right-looking picture
      // with an error pending — a Quest did exactly that, for an attribute
      // binding made one call too late, and nobody would have seen it by
      // looking.
````

<a id="mirror-90"></a>
## mirror-90: demo/mirror/index.html, inline script, line 1275

````js
      // 🔴 A HEADSET THAT REFUSED IS NOT A LAPTOP, and the assert below would
      // have said it was. "There is no headset here" and "there is one and it
      // would not start" are opposite conclusions and they were reading as the
      // same pass — the same collapse as a blank cell meaning both "we did not
      // look" and "we looked and it was fine". The line above says which step
      // did not come back; this says that it is a failure.
````

<a id="mirror-91"></a>
## mirror-91: demo/mirror/index.html, inline script, line 1293

````js
  // ── the picture, from the board ──────────────────────────────────────────
  //
  // ⚠️ A SECOND SOCKET, TO `<room>-video`. The relay counts messages per socket
  // and the box's audio is already 50 a second; thirty video frames on the
  // same socket would crowd it, and the bucket drops the excess with no error
  // at all. It also keeps the binary framing unambiguous: every other page
  // here reads a binary frame as PCM.
  //
  // 🔴 THE FIRST SOCKET IS `bay-node.mjs`'s, AND IT OPENS ON A PRESS. It used to
  // be a WebSocket made at the top of this block, so a visit asked the Pi to
  // draw. `node.join()` is called by `Show the board` and by nothing else; the
  // harness never presses it, and the check pass grades the links on a scratch
  // bay instead, so no run reaches the real Pi.
````

<a id="mirror-92"></a>
## mirror-92: demo/mirror/index.html, inline script, line 1318

````js
    // 🔴 `/patchbay/` MAY ASK THIS PAGE TO OPEN ITS SHADER LINK, and the answer
    // is the same act a look press makes: the running body goes to the board in
    // this page's room. Any other target is refused in words, because this page
    // only ever sends to the one board it joined.
````

<a id="mirror-93"></a>
## mirror-93: demo/mirror/index.html, inline script, line 1335

````js
  /**
   * 🔴 TWO LINKS, DESCRIBED IN A BAY BEFORE ANYTHING IS OPENED. The shader goes
   * out as `<site>:webgl:program -> pi-1:shader:program-in` and the picture comes back
   * as `pi-1:shader:video-out -> <site>:screen:video`, which the bay gives the
   * `relay-h264` session because that is the only way the board's port says it
   * travels. Which opener takes the video is `openers.pick`, the same choice
   * `/patchbay/` makes, so the two pages cannot disagree about it.
   * ⚠️ THE PROGRAM LINK HAS NO OPENER IN THE KIT, AND `pick` SAYS SO. A shader
   * is a light link, one message, and `openers.mjs` has no `program` row, so the
   * page opens it itself with `video.shader`, which is exactly what it did before.
   */
````

<a id="mirror-94"></a>
## mirror-94: demo/mirror/index.html, inline script, line 1392

````js
    // ⚠️ THE SAME BODY GOES TO BOTH ENDS. This page compiles it as 300 es and
    // forwards it untouched to the board, which compiles it as 310 es — so the
    // demo's claim ("the same shader, two GPUs") becomes literally one text
    // rather than two copies kept in step by hand.
````

<a id="mirror-95"></a>
## mirror-95: demo/mirror/index.html, inline script, line 1422

````js
      // ⚠️ TELL THE BOX WHAT THIS PAGE IS SET TO. The knobs only sent on a
      // press, so at load the page rendered its own defaults and the box
      // rendered ITS defaults — and the two agreed only because the numbers
      // happened to be the same on both sides. Changing one of them anywhere
      // would have made the panes quietly disagree, which is the one thing this
      // page must never do. Sent on every start, so a box that restarted comes
      // back matching whatever is on screen.
````

<a id="mirror-96"></a>
## mirror-96: demo/mirror/index.html, inline script, line 1430

````js
      // ⚠️ DO NOT REOPEN A STREAM THAT IS ALREADY OPEN. Every client's
      // `video.status` is answered to the whole room, so a second visitor's
      // question tore this one's decoder down and built it again — which showed
      // up as a bar reading "not arriving" next to a live frame rate.
````

<a id="mirror-97"></a>
## mirror-97: demo/mirror/index.html, inline script, line 1439

````js
  /**
   * The picture link, opened through the description. 🔴 A REFUSAL FROM THE BAY
   * STOPS IT, IN WORDS. The board's graph normally arrives first, because joining
   * asks `graph.ask` before `video.status`; if it has not arrived after two
   * seconds the picture is opened without a link and the log says so, which is
   * what this page did for every visitor before links existed.
   */
````

<a id="mirror-98"></a>
## mirror-98: demo/mirror/index.html, inline script, line 1456

````js
  // 🔴 ASKED ON A PRESS SINCE 2026-10-06. This said *"ask on connect, not on a
  // press"*, and connecting happened on load, so a visit started the encoder.
  // What survives is the half that was right: once somebody has pressed, the
  // box is asked at once and stops on its own when the room empties, so nobody
  // has to remember to switch it off.
````

<a id="mirror-99"></a>
## mirror-99: demo/mirror/index.html, inline script, line 1466

````js
  /**
   * Ask again, slowly, for as long as the page is open.
   *
   * ⚠️ Every five seconds and NOT faster: the thing being asked is a Raspberry
   * Pi with one hardware encoder, and a page that retries hard is a page that
   * queues work on a device which blocks rather than fails. Five seconds is
   * slow enough to be polite and quick enough that someone switching the box on
   * sees the picture without reloading.
   */
````

<a id="mirror-100"></a>
## mirror-100: demo/mirror/index.html, inline script, line 1485

````js
  // 🔴 THE RECEIVER IS THE KIT'S SINCE 2026-10-12, `demo/shell/board-video.mjs`,
  // so /shader/remote/ decodes the board's picture with this same code
  // rather than a second copy of it. What stays here is what this page DOES
  // with a frame: the lock to the board's counter, the badge, the log lines.
````

<a id="mirror-101"></a>
## mirror-101: demo/mirror/index.html, inline script, line 1303

````js
    // ⚠️ A DECODER MUST START ON A KEYFRAME, so a joiner waits up to one
    // second at this GOP, which is a GOP choice and not a fault.
````

<a id="mirror-102"></a>
## mirror-102: demo/mirror/index.html, inline script, line 1306

````js
    // ⚠️ THE COUNTER IS IN THE PAYLOAD BECAUSE A BINARY FRAME HAS NO ENVELOPE,
    // and the relay drops frames with no error, no close and no backpressure.
    // Measured: at 8 Mbit/s it lost 101 of 361 frames and nothing else on the
    // path said so. It reports into the log rather than a cell under the picture.
````

<a id="mirror-103"></a>
## mirror-103: demo/mirror/index.html, inline script, line 1316

````js
  /**
   * 🔴 WHAT THE LINK COSTS IS SAID IN THE LOG AND ON THE BEACON, NOT IN A ROW
   * UNDER A PICTURE. `kbit/s` and `lost` were footer cells for one session and
   * were never asked for. They are still worth having: the relay drops frames
   * with NO error, no close and no backpressure, so a sequence number in the
   * payload is the only witness there is, and a rate that has collapsed is the
   * difference between a link that is working and one that is barely there.
   *
   * ⚠️ A RATE IS SAID ONCE AND A LOSS IS SAID WHEN IT HAPPENS. A line a second
   * is the slop log this project already has a rule about, so the rate goes out
   * on the first second of a stream and the totals go out when it stops. A loss
   * is an EVENT, which is exactly what a log is for, with a floor under how
   * often so a bad link cannot fill the box.
   *
   * ⚠️ AND THE BEACON, because a phone or a headset has no log anybody can
   * read. That is where this page already ships the things it wants back from a
   * device.
   */
````

<a id="mirror-104"></a>
## mirror-104: demo/mirror/index.html, inline script, line 1349

````js
    // ⚠️ THE BEACON GETS THE FIRST ONE AND THE TOTAL, NEVER A LINE EVERY FIVE
    // SECONDS. A tab left open on a lossy link would be 720 posts an hour into
    // the ring buffer a headset run depends on being able to read, which is a
    // diagnostic drowning the diagnostics. The first loss is the event worth
    // shipping; the total goes out when the stream stops.
````

<a id="mirror-105"></a>
## mirror-105: demo/mirror/index.html, inline script, line 1359

````js
  // ⚠️ SAY THAT SOMEBODY IS WATCHING, so the box can stop when nobody is. It
  // cannot tell from its side: the relay reported seven sockets in the video
  // room while nothing was watching, because a test run that exits without a
  // clean close leaves one behind. `document.hidden` is checked because a tab
  // in the background is not a viewer either, and a socket count could never
  // have seen that.
  // The ten second `video.watching` is sent by `createBoardVideo` while its
  // socket is open and the tab is not hidden, exactly as it was here.
````

<a id="mirror-106"></a>
## mirror-106: demo/mirror/index.html, inline script, line 1374

````js
    // ⚠️ THE MACHINE COPY IS WHAT THE FOOTER SAYS AND NOTHING MORE. It once
    // carried "not arriving" beside a live 27.7 fps, because a field the bar
    // had stopped drawing was still being written. Nothing on screen showed it,
    // which is worse: the machine surface and the picture disagreed and only a
    // harness would ever have noticed. What the LINK cost lives on
    // `__demo.link`, under its own name, because it is not in this row.
````

<a id="mirror-107"></a>
## mirror-107: demo/mirror/index.html, inline script, line 1387

````js
    // ⚠️ "Waiting…" HAS TO BE TRUE. Saying it and then doing nothing is the
    // worst of both: a reader waits for something nobody is asking for. The
    // page re-asks, and the word is a promise it keeps.
````

<a id="mirror-108"></a>
## mirror-108: demo/mirror/index.html, inline script, line 1409

````js
  // ── what a harness can check ─────────────────────────────────────────────
  // The renderer goes on `__demo` directly, because demo/verify-gl.mjs asserts
  // the page's own answer against what it found itself — two ends disagreeing
  // about which context they are looking at is worth catching.
````

<a id="mirror-109"></a>
## mirror-109: demo/mirror/index.html, inline script, line 1414

````js
  /**
   * ⚠️ THE CHECKS RUN THEMSELVES, because the controls are gone.
   *
   * This project's usual hook is a button the harness presses — "a control the
   * harness cannot press is a subject the suite cannot reach". With no controls
   * the same rule points the other way: the page must reach its own checks, and
   * demo/verify-gl.mjs waits for `__demo.ready` instead of pressing anything.
   *
   * It waits for the box before running, but only for a bounded time: a page
   * whose asserts never fire because a Raspberry Pi is switched off reads as
   * broken, and the left-hand pane is a claim that stands on its own.
   */
````

<a id="mirror-110"></a>
## mirror-110: demo/mirror/index.html, inline script, line 1427

````js
      // ⚠️ THE LOCAL PANE IS ASSERTED WITHOUT THE BOARD, ON PURPOSE. It is a
      // pure function of (parameters, clock) and needs no network at all —
      // which is the claim the page exists to make. Tying its asserts to a
      // Raspberry Pi being switched on would make the page read red for a
      // reason that is not about the page.
````

<a id="mirror-111"></a>
## mirror-111: demo/mirror/index.html, inline script, line 1432

````js
      /**
       * 🔴 THE LOOK PICKER NAMES THE SHADER THAT IS RUNNING, BEFORE ANYBODY
       * TOUCHES IT. PHOTOGRAPHED reading a long em dash with ten looks loaded
       * and one of them drawing: `createPicker`'s `options()` filled the hidden
       * select and set its index and never told the visible cell, so the
       * placeholder stood until somebody pressed ‹ or ›. Every other check on
       * this page grades the PICTURE, and none of them could see a control that
       * had gone blank about it.
       *
       * ⚠️ IT READS THE CELL, NOT THE SELECT. The select was right the whole
       * time; the half that was wrong is the half a reader looks at.
       */
````

<a id="mirror-112"></a>
## mirror-112: demo/mirror/index.html, inline script, line 1456

````js
      // ⚠️ THE PICTURE IS NOT A FLAT FIELD. A shader that compiles, links and
      // draws can still be producing one colour — "it rendered" and "there is
      // something in it" are different claims and only the second is the one
      // anybody cares about.
      //
      // ⚠️ AND IT IS READ OVER THE WHOLE FRAME, NOT AT FOUR POINTS. Four points
      // read `5 of 765` on a picture whose true range is 26..254 — because this
      // image is EIGHT-FOLD SYMMETRIC and radial, so any two samples at similar
      // radius are similar BY CONSTRUCTION. The assert was measuring the
      // symmetry of the thing it was checking, and it failed a working page.
      // A whole frame at this size is 900 KB and reads in a millisecond.
````

<a id="mirror-113"></a>
## mirror-113: demo/mirror/index.html, inline script, line 1472

````js
        // ⚠️ PER CHANNEL, NOT THE SUM — AND THE SUM IS THE ONE STATISTIC THAT
        // CANNOT SEE THIS PICTURE. The colour is
        // `0.5 + 0.5*cos(2pi*(w + vec3(0, 0.33, 0.67)) + uT)`: three cosines
        // about 120 degrees apart, and three cosines 120 degrees apart SUM TO A
        // CONSTANT. So the image varies almost entirely in HUE at near-constant
        // total luminance — measured, R+G+B spans 377..386 of 765 while red
        // alone spans 26..254. A luminance check reported a flat field on a
        // vivid kaleidoscope and failed a page that was perfectly fine, twice.
````

<a id="mirror-114"></a>
## mirror-114: demo/mirror/index.html, inline script, line 1490

````js
      // ⚠️ NOT A PIXEL COMPARISON AGAINST A GOLDEN IMAGE. The same shader with
      // identical inputs summed 48,147,330 of red on ANGLE Metal and 68,001,881
      // on SwiftShader — 41% apart — because the standard GLSL hash amplifies
      // last-bit float differences into unrelated noise. Structure is portable;
      // exact pixels are not.
````

<a id="mirror-115"></a>
## mirror-115: demo/mirror/index.html, inline script, line 1498

````js
      // 🔴 THE SIX BELOW COST THIS PAGE THE NUMBER IT EXISTS TO REPORT, so they
      // wait for a harness. Turning the panels on copies the picture and lays
      // out five figures every frame, which is why they are off until a session
      // needs them, and the preview compiles the whole room's shaders and draws
      // fourteen per-eye frames into an off-screen canvas. Neither is anything a
      // visitor asked for, and the first one quietly lowers the frame rate
      // printed under the left-hand picture while they are reading it.
      //
      // ⚠️ THE PICTURE'S OWN CHECKS ABOVE AND THE PANEL ARITHMETIC BELOW STILL
      // RUN FOR EVERYBODY. Both are read out of what is already on this machine:
      // one reads back the frame the page just drew, the other is pure geometry
      // against the same functions a session calls.
````

<a id="mirror-116"></a>
## mirror-116: demo/mirror/index.html, inline script, line 1511

````js
        // ── the panels, graded on a laptop ──────────────────────────────────
        //
        // ⚠️ THE HALF THAT DOES NOT NEED A HEADSET IS GRADED WITHOUT ONE. That
        // the picture lands on the panel and that the numbers are under it is
        // ordinary code and can be checked here; what only a Quest can say — the
        // frame rate it holds in a 3360x1760 framebuffer — is asserted by the
        // controls above and by nothing on this machine. Leaving all of it to the
        // device would mean the only test of it runs where nobody is watching.
````

<a id="mirror-117"></a>
## mirror-117: demo/mirror/index.html, inline script, line 1528

````js
            // ⚠️ THE BOTTOM OF THE PICTURE, NOT ALL OF IT — and that is the same
            // mistake this page already made once. panel.mjs writes its "nothing
            // arriving yet" line across the middle, so a spread taken over the
            // whole picture area would be measuring the TEXT and would pass just
            // as well with no picture at all. A statistic that is high by
            // construction over your subject is blind, not weak.
````

<a id="mirror-118"></a>
## mirror-118: demo/mirror/index.html, inline script, line 1558

````js
        // 🔴 THE STRIP THE RENDERED PANEL WEARS INSTEAD OF A FOOTER, graded on its
        // own. It is a different canvas from the one above and it is the ONLY
        // place a number appears when the picture is drawn by the headset — so a
        // strip that silently stopped being filled would take every number in
        // there with it and leave a picture that looks perfect.
````

<a id="mirror-119"></a>
## mirror-119: demo/mirror/index.html, inline script, line 1575

````js
        // ── the room, drawn on this machine ─────────────────────────────────
        //
        // 🔴 EVERY PIXEL OF THE HEADSET'S PICTURE USED TO BE UNREACHABLE FROM
        // HERE. The floor, the glow, the grab bars, the panel quads and the live
        // renderer all live behind `requestSession`, so a shader that would not
        // compile or an error flag left standing cost a headset run to find — and
        // the owner gets one run. `preview` drives the SAME per-eye draw with a
        // hand-made projection into an off-screen canvas: no compositor, no frame
        // rate, nothing said about a device — only "does it draw, and is it
        // clean", which are the two questions a laptop can answer.
````

<a id="mirror-120"></a>
## mirror-120: demo/mirror/index.html, inline script, line 1589

````js
        // 🔴 WHAT ONE LIVE PASS COSTS, ON WHATEVER IS IN FRONT OF YOU. It is NOT
        // a headset number and this line says so — a laptop's card tells you
        // nothing about an Adreno, the same refusal demo/verify-gl.mjs makes
        // about a software rasteriser. What it establishes is that the instrument
        // works and what shape the cost has, so the one run that has to happen on
        // the device produces a number somebody can already interpret.
````

<a id="mirror-121"></a>
## mirror-121: demo/mirror/index.html, inline script, line 1610

````js
        // 🔴 AND THE WAY OUT, WHICH IS THE ONE CONTROL A HEADSET RUN CANNOT
        // RECOVER FROM BEING WRONG ABOUT. Everything else in here can be got out
        // of by leaving, and leaving is this. It used to be a tap on ANY button:
        // no warning, nothing on screen naming it, so reaching for a control
        // could end the session and the gesture somebody needs most was the one
        // they had to discover. It is a hold on one named button now, drawn on
        // the controller with its own words and a ring that fills as you hold.
        //
        // ⚠️ IT IS GRADED HERE RATHER THAN BESIDE THE SESSION, and the difference
        // is not tidiness. Written into `enterHeadset` it reported `no badge was
        // built` on this laptop, which is a FALSE claim about the page dressed as
        // a true one about the machine: with no headset there is no context, so
        // nothing had been compiled yet and the check was grading the absence of
        // a GPU. This block exists precisely because a preview builds the same
        // context the headset would, so by here the question has an answer.
        //
        // ⚠️ AND IT GRADES THE COMPILE, NOT THE OBJECT. `createXRQuit` is lazy
        // until its first draw, so an object alone proves nothing. PROVED by
        // sabotage: with the badge's `compile` made to throw, this check stayed
        // GREEN until the module was made to compile it up front.
````

<a id="mirror-122"></a>
## mirror-122: demo/mirror/index.html, inline script, line 1636

````js
        // ⚠️ ASSERT ON THE ERROR FLAG, HERE TOO. A Quest reported 1282 on its
        // first frame and DREW CORRECTLY ANYWAY; the only way that is ever caught
        // before a device run is by a laptop reading the same flag.
````

<a id="mirror-123"></a>
## mirror-123: demo/mirror/index.html, inline script, line 1642

````js
        // 🔴 THE FAKE LIGHT HAS TO ANSWER TO THE PICTURE OR IT IS A DECORATION.
        // A cell that cannot change teaches the reader to ignore it, and this one
        // very nearly could not: the colour is three cosines 120° apart, which
        // SUM TO A CONSTANT, so a mean taken the obvious way is grey whatever the
        // picture does. The amplitude is read here against the picture that was
        // actually on screen.
        // ⚠️ AND STRICTLY INSIDE ITS RANGE, NOT MERELY WITHIN IT. A number pinned
        // at its ceiling is a constant wearing a measurement's clothes — which is
        // what this one did on its first run, and only a bound that excludes the
        // end caught it.
````

<a id="mirror-124"></a>
## mirror-124: demo/mirror/index.html, inline script, line 1662

````js
      // ── picking a panel up, graded with no headset in the building ──────
      //
      // 🔴 THE ONE THING ON THIS PAGE THAT CANNOT BE TRIED WITHOUT A CONTROLLER,
      // AND IT HAS NEVER RUN. The trigger arms a drag and the "any button
      // leaves" scan used to end the session on that same press, so a panel
      // drag was unreachable in every headset run this page has ever had. The
      // arithmetic is pure, so it is driven here with a made-up pose — against
      // the SAME functions the session calls, never a second copy, because a
      // test against a copy grades the copy.
````

<a id="mirror-125"></a>
## mirror-125: demo/mirror/index.html, inline script, line 1714

````js
        /**
         * 🔴 IT FACES YOU IN BOTH AXES, AND THIS CHECK REVERSED ON 2026-09-17.
         * It used to assert the opposite — that a panel stays world-upright
         * whatever height the head is at — and the instruction is explicit:
         * *"make them always look at me not only horiz but also vertic"*.
         *
         * ⚠️ THE NUMBER THAT MATTERS IS THE ANGLE BETWEEN THE PANEL'S NORMAL
         * AND THE LINE TO THE HEAD, and it has to be zero. Checking "its up is
         * no longer world up" would pass on a panel tipped the WRONG WAY, which
         * is the same picture with the sign flipped and is exactly what a
         * hand-built basis gets wrong.
         *
         * ⚠️ AND THE ROLL IS STILL PINNED. `right` must stay level or a panel
         * tilted to meet you also leans sideways, and nothing about a head
         * being higher than a picture says the horizon moved.
         */
````

<a id="mirror-126"></a>
## mirror-126: demo/mirror/index.html, inline script, line 1753

````js
      /**
       * 🔴 THE PICTURE REPORTS ITS OWN DAMAGE. `createDiagram` collects every
       * label it had to shorten, every note over about forty words, every link
       * it could not route and a title passed alongside `how`, and a page that
       * never reads that list ships a cut label looking exactly like a picture
       * that is fine.
       */
````

<a id="mirror-127"></a>
## mirror-127: demo/mirror/index.html, inline script, line 1764

````js
      /**
       * 🔴 AND IT IS LAST, UNDER THE STANDING HEADING. `how` and `atEnd` are
       * `createDiagram`'s THIRD argument, so writing them inside the spec gives
       * two unread keys rather than an error: nothing can see it, not the
       * parser, not `cuts`, not the suite. Another page shipped with no heading
       * and its picture above the log for exactly that.
       */
````

<a id="mirror-128"></a>
## mirror-128: demo/mirror/index.html, inline script, line 1778

````js
      /**
       * 🔴 NOTHING IN A FOOTER IS DRAWN ON TOP OF ANYTHING ELSE, AND THIS IS
       * THE REGRESSION THIS CHECK EXISTS FOR. Reported 2026-09-19 from a crop
       * of the far pane on a DESKTOP: the presence dot was painted over the
       * first label and a value ran under the ⛶. The cause was two rows of the
       * footer's grid resolving to ZERO width, because an `auto` track's growth
       * limit is its max-content and the flexible tracks beside it are only
       * given what is left. MEASURED before the repair at 1280 px: left slot
       * 0 px with the dot 2 px inside the centre, right slot 0 px with the
       * button 2 px inside it.
       * ⚠️ IT ASKS WHERE THE INK IS, NOT WHAT THE STYLESHEET SAYS. A rule that
       * is present and inert reads exactly like one that works, which is why
       * this measures two rectangles against a third rather than reading
       * `grid-template-columns` back.
       */
````

<a id="mirror-129"></a>
## mirror-129: demo/mirror/index.html, inline script, line 1811

````js
      /**
       * 🔴 THE FOUR CONTROL ROWS SHARE ONE LABEL COLUMN. Asked with the 2x2
       * grid, because columns are what make a ragged left edge visible: `LOOK`,
       * `MIRRORS`, `GRAIN` and `HUE` are four different widths and in a wrapped
       * row nobody could see it. What is graded is the OFFSET of each segment
       * inside its own cell, which is the same number at every width: 56 px in
       * two columns, 0 px on a phone where the label goes on its own line.
       * ⚠️ A PIXEL FLOOR CAN BE OUTGROWN, which is the whole reason this is a
       * check rather than a comment. A label wider than the reserve pushes its
       * own segment along and nothing else moves, so the row goes quietly
       * ragged again and only a comparison can see it.
       */
````

<a id="mirror-130"></a>
## mirror-130: demo/mirror/index.html, inline script, line 1836

````js
      // 🔴 A CONTROL THAT IS SWITCHED OFF STILL HAS ITS SUBJECT GRADED, AND
      // WITHOUT THIS THE TWO SESSION BRANCHES WOULD HAVE LEFT THE RUN IN
      // SILENCE. Both buttons go off on any browser that cannot open a session,
      // so on this machine nothing presses them: ten asserts that used to fire
      // on every run, gone, with the page still reading green. That is this
      // project's oldest failure and it arrives here by way of a repair. The
      // same call the button makes is made for whichever mode nobody reached;
      // in a headset both controls are live, a visitor presses them, and this
      // does nothing.
      // ⚠️ BEHIND THE GATE. A self-check never runs for a visitor, and a
      // visitor who could press these is a visitor for whom this is a no-op.
````

<a id="mirror-131"></a>
## mirror-131: demo/mirror/index.html, inline script, line 1853

````js
      // ── the links, graded with no socket at all ──────────────────────────
      //
      // 🔴 A VISIT OPENS NOTHING, AND THAT IS ASSERTED RATHER THAN BELIEVED.
      // Nothing on this page joins a room until `Show the board` is pressed, and
      // the harness never presses it, so by here no socket was made, nothing
      // was announced and no re-announce clock is running.
      // ⚠️ FOR EVERYBODY, NOT ONLY THE HARNESS: a visit that has not pressed is
      // the same claim, and reading three counters costs nothing.
      // ⚠️ UNDER THE HARNESS IT IS ASSERTED WHATEVER HAPPENED, because nobody
      // there can have pressed, so a join by then is the defect. Skipping it on
      // `joining()` would make a page that joins on load skip its own check.
````

<a id="mirror-132"></a>
## mirror-132: demo/mirror/index.html, inline script, line 1873

````js
      /**
       * 🔴 THE TWO LINKS, ON A SCRATCH BAY FED THE BOARD'S REAL GRAPH. The graph
       * is `boardGraph`, the function the Pi itself runs, so the ports linked
       * here are the ports the Pi announces. The video link must get the
       * `relay-h264` session and the shared `video` opener; the program link
       * must be accepted and say in words that no kit opener takes it.
       * ⚠️ NEGATIVE CONTROL: the same picture asked for over WHEP is refused,
       * naming the one transport the board's port allows. A bay that accepted
       * every link would pass the first half and fail this one.
       */
````

<a id="mirror-133"></a>
## mirror-133: demo/mirror/index.html, inline script, line 1902

````js
        /**
         * 🔴 THE LEFT PANE IS A LINK ON THIS TAB, AND THE BAY GIVES IT `page`.
         * Both ends are this browser, so `TRANSPORTS.video.machine` applies and
         * nothing is opened. ⚠️ NEGATIVE CONTROL: the board's picture linked
         * into the same left pane crosses a wire and must NOT get `page`, or a
         * bay answering `page` for every video link would pass the first half.
         */
````

<a id="mirror-134"></a>
## mirror-134: demo/mirror/index.html, inline script, line 1917

````js
      /**
       * 🔴 THE BADGE SAYS WHAT ARRIVED, NOT WHAT WAS ASKED. Its rule as fixtures:
       * a press with nothing yet is `coming`, a count that grew a moment ago is
       * `online`, and the same count gone quiet past the stall window is
       * `offline`. And before any link the badge and its slot draw nothing.
       */
````

<a id="mirror-135"></a>
## mirror-135: demo/mirror/index.html, inline script, line 1939

````js
  /**
   * 🔴 THE PICTURE GOES LAST AND IT IS REFERENCE. `{ how: true, atEnd: true }`
   * and no title: the heading lives in `diagram.mjs` so no page can invent a
   * second wording for it. A diagram is read once, on purpose, by somebody who
   * has already watched the two pictures and wants to know what is behind
   * them, which is under the controls rather than in front of them.
   *
   * ⚠️ BUILT BEFORE THE CHECKS START, because `runChecks` reads `dg` and a
   * `const` below the line that reads it is this file's most repeated defect.
   */
````

<a id="mirror-136"></a>
## mirror-136: demo/mirror/index.html, inline script, line 1953

````js
      /**
       * ⚠️ `join: false`. These two are not a chain and an arrow between them
       * would say they were: one draws a shader, the other draws frames that
       * arrived from somewhere else, and they never touch. The container's own
       * box already carries everything their neighbouring says.
       * ⚠️ AND NO `sub` AND NO `note` ON A CONTAINER. A box holding other boxes
       * is a machine, and the boxes inside it name it better than a phrase
       * above them can.
       */
````

<a id="mirror-137"></a>
## mirror-137: demo/mirror/index.html, inline script, line 1971

````js
      /**
       * 🔴 ONE DURABLE OBJECT, DRAWN AS TWO BOXES BY ROLE. With a single box
       * three arrows would meet at one node and the return would have to be
       * routed back through the picture. Split by what each half carries it is
       * a ring: out along the top, down the board, back along the bottom.
       * ⚠️ IT IS NOT TWO RELAYS. A drawing may split a thing by role to be
       * read; it may not invent a second machine, which is what `Relay object`
       * under each of them is there to say.
       */
````

<a id="mirror-138"></a>
## mirror-138: demo/mirror/index.html, inline script, line 1996

````js
            // ⚠️ NO DEVICE PATH IN HERE. A note is read by a visitor, and the
            // name of a node under /dev tells them nothing and tells a reader
            // of the code something they could have grepped.
````

<a id="mirror-139"></a>
## mirror-139: demo/mirror/index.html, inline script, line 2004

````js
    // One way round, and it is a ring. Out along the top, down the board, back
    // along the bottom. ⚠️ `back: true` IS AN AUTHOR FLAG and nothing infers
    // it: without it a right to left link is laid out as a forward step and
    // drawn through whatever stands in the way.
````

<a id="mirror-140"></a>
## mirror-140: demo/mirror/index.html, inline script, line 2009

````js
      // ⚠️ BOTH HALVES OF A JOURNEY CARRY THE SAME LABEL, because the same
      // thing is travelling. One arrow naming the format and the next saying
      // nothing reads as two different journeys.
````

<a id="mirror-141"></a>
## mirror-141: demo/mirror/index.html, inline script, line 2014

````js
      // 🔴 NO LABEL BETWEEN TWO BOXES IN ONE MACHINE, AND THE DRAWER REFUSES
      // ONE. The gap two stacked children share is sixteen pixels tall and half
      // a box wide, so a name in it either runs under both boxes or shrinks
      // below being read. The direction is the whole message there and what
      // travels goes in the note, which is read on hover with room for it.
````

<a id="mirror-142"></a>
## mirror-142: demo/mirror/index.html, inline script, line 2022

````js
      /**
       * 🔴 `H.264` IS THE PROJECT'S NAME FOR A PICTURE COMING BACK, SETTLED
       * 2026-09-19: *"h.264 - unify label and longer desc on all diagrams where
       * stream back pcm or mp4 video"*. Sound coming back is `PCM` on
       * `/knobs/`, `/grains/` and the specimens in `/kit/`. This page already
       * had the right word on both halves and had no note on either, which is
       * the half that was missing: a label is WHAT TRAVELS, and the note is
       * what that actually is.
       * ⚠️ NEITHER NOTE REPEATS A BOX'S. `enc` already says the frames leave
       * raw, `back` already says each one carries a sequence number, and
       * `codecs` already says a joiner waits for a keyframe. What is left for
       * these two is the number that was measured and the claim the page
       * exists to make.
       */
````

<a id="mirror-143"></a>
## mirror-143: demo/mirror/index.html, inline script, line 2045

````js
    // ⚠️ `how` AND `atEnd` ARE THE THIRD ARGUMENT, NOT PART OF THE SPEC.
````

<a id="mirror-144"></a>
## mirror-144: demo/mirror/index.html, inline script, line 2048

````js
  // ⚠️ IT WAITS FOR THE BOX ONLY WHEN SOMEBODY ASKED FOR IT. Nothing joins on
  // load now, so waiting the box's twelve seconds would be a wait for nothing.
  // 🔴 BUT IT STILL WAITS FOR THIS PAGE'S OWN FIRST FRAMES. Those twelve
  // seconds were also what let the left pane start drawing before its checks
  // read it: without them `the shader compiled and linked` read 0 frames on a
  // page that was drawing a moment later. Measured 2026-10-06, so it waits for
  // a drawn frame, bounded at the same twelve seconds.
````

<a id="mirror-145"></a>
## mirror-145: demo/mirror/index.html, inline script, line 2063

````js
  // ⚠️ ARRIVED FROM THE INDEX WITH `?xr=1` — put the one press that matters
  // under the hand. A link CANNOT enter VR: WebXR needs a transient user
  // activation, so the button still has to be pressed. This only means you do
  // not have to find it, which through a headset is most of the work.
````
