# Page comments: kit-input

The full comments cut from the code under demo/ for kit-input, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="kit-input-1"></a>
## kit-input-1: demo/kit/input/index.html, inline script, line 38

````js
  /**
   * 🔴 kit/input, ONE PART OF `/kit/` ON A PAGE OF ITS OWN, 2026-10-06
   * (plans/plan-kit-split.md). Every block, holder and check below is copied
   * VERBATIM from `demo/kit/index.html`, in that file's order, so the newest
   * block is still the first. What changed is mechanical: `section()` lost its
   * first argument, the holders sit here rather than at the top of the
   * monolith, the measuring window and the tab row are gone, and every check
   * is behind `?selfcheck=1`.
   * ⚠️ AND TWO CHECKS MOVED AFTER `d.ready()`, as the plan asks: COMPILE ON A
   * PAUSE's timed half and the keyboard looper. They held about 7.5 s of the
   * monolith's 11 s to `ready`, and every gap in either is under the
   * harness's 2 s of tolerated silence, so they are graded after `ready` the
   * way HARDWARE's and SLIDES' always were.
   */
````

<a id="kit-input-2"></a>
## kit-input-2: demo/kit/input/index.html, inline script, line 63

````js
  // The pair in the invisible hand block: one slider with a hand and one
  // without, held so the checks at the bottom can compare them. ⚠️ DECLARED
  // HERE for the reason the two lines above give: a `let` left beside a block
  // that moves is read in its dead zone.
````

<a id="kit-input-3"></a>
## kit-input-3: demo/kit/input/index.html, inline script, line 69

````js
  // The button group specimens, held for the checks at the bottom: one row of
  // ordinary actions, and one pair driven by what this browser actually says
  // about a headset. ⚠️ DECLARED UP HERE WITH THE OTHERS, for the reason those
  // lines give: this is the newest block and therefore the topmost one, and a
  // `let` left where a block used to be is read in its dead zone.
````

<a id="kit-input-4"></a>
## kit-input-4: demo/kit/input/index.html, inline script, line 75

````js
  // The choice specimen, kept so the button group can be measured AGAINST it
  // rather than against a number typed into a check. The claim being graded is
  // that the two are different sizes of object, which is a comparison or it is
  // nothing.
````

<a id="kit-input-5"></a>
## kit-input-5: demo/kit/input/index.html, inline script, line 80

````js
  /**
   * 🔴 NEWEST AT THE TOP, AND THE HEADING IS UPPERCASE. A drop target, as of
   * 2026-09-21, asked for as *"do lightweight planning on patch demo (inclu
   * global dragdroppable upload)"* and built because `/pack/` needs a way in
   * for a pack that is not the one in this repository.
   *
   * 🔴 THE AREA IS THE POINT AND THE FIRST VERSION OF THIS BLOCK HAD NONE.
   * It showed a button, because that was all the component drew: its cover is
   * `position: fixed` and is inserted only while a drag is in flight, so the
   * thing inviting the gesture appeared after the gesture. Reported as *"i just
   * do not get funcionality why there is no upload aread / button"*.
   *
   * 🔴 IT IS `open`, NOT `upload`, AND THE SPECIMEN'S LABEL IS THE POINT.
   * Nothing leaves the machine and this module names no network API at all. A
   * purchased soundbank lives in `purchased/` precisely because it is not ours
   * to publish, and a control called *upload* invites somebody to build the
   * thing that gitignore exists to prevent.
   *
   * 🔴 AND THE REFUSAL HAS A BUTTON, BECAUSE A DRAG CANNOT BE SYNTHESISED AND
   * THE HALF NOBODY TESTS IS THE HALF THAT REFUSES. `/tapes/`, `/now/` and
   * `/flipper/` were all fully green against stand-ins whose refusals had been
   * switched off, four instances of one pattern, and the fix was the same every
   * time: break it on purpose and see what stays green. Dropping a JPEG here is
   * that press, and it is the same code path a real drop takes.
   *
   * ⚠️ AND NOTHING HERE IS IN A `.pos-controls` ROW, for the reason the two
   * blocks below give: both harnesses press that row by position, so a new top
   * block with a control in it moves every other block's press. These two
   * buttons are in the box, which nothing presses by position.
   */
````

<a id="kit-input-6"></a>
## kit-input-6: demo/kit/input/index.html, inline script, line 110

````js
  // The drop specimen's own state, declared out here rather than inside the
  // block, for the reason this page has written down three times: a block that
  // moves to the top leaves its `const` behind, the build reads it in its dead
  // zone, `section()` swallows the throw into `failed`, and the page dies much
  // later with a message about a different line.
````

<a id="kit-input-7"></a>
## kit-input-7: demo/kit/input/index.html, inline script, line 117

````js
  // ⚠️ DECLARED UP HERE WITH EVERY OTHER HOLDER, NOT BESIDE ITS BLOCK. The
  // SWITCH block is the newest one on this page and so it is the topmost one,
  // and a `let` left where a block used to be is read in its dead zone: this
  // page has already been taken out that way once, and `section()` swallowed
  // the throw so the message named a different line.
````

<a id="kit-input-8"></a>
## kit-input-8: demo/kit/input/index.html, inline script, line 128

````js
  /**
   * 🔴 THE BLOCK UNDER THE HARDWARE PAIR, 2026-09-30, ABOVE KNOBS UNDER THE CODE, AND
   * ONCE THE FIRST CALL TO `section()`. `plans/plan-code-editor.md`, asked as *"a hand-rolled
   * overlay - maybe not that bad idea"* and *"coloring slider code snippets
   * would be nice, perhaps each on its own hue"*. The box is the kit field's
   * own textarea, transparent, over a pre of coloured spans.
   * ⚠️ THE BOOK IS HANDED `cutoff` AND `res` AND NOT `freq` OR `gate`, which is
   * what a page does after a compile: only a name with a knob gets a hue, and a
   * key-driven one is drawn plain. The hslider in the comment is not a
   * parameter at all. Six rows for seven lines, so it scrolls.
   * ⚠️ `codeSpec` IS DECLARED ABOVE THE BLOCK, for the reason `cnoteSpec` is.
   */
````

<a id="kit-input-9"></a>
## kit-input-9: demo/kit/input/index.html, inline script, line 140

````js
  /**
   * THE NEWEST BLOCK ON THIS PAGE, 2026-10-12, AND THE FIRST CALL TO
   * `section()`. Asked as *"have mode on slider to have labels on inside the
   * rails (crossfader case)"* and *"use when threre is xfader, add to kit
   * too"*. The slider's `ends`: two names inside the lane. The second
   * specimen sits at its left end, so its handle covers `here`, which the owner
   * ruled fine the same day (*"its ok to obsucre lael with handle"*).
   * ⚠️ `xfadeSpec` IS DECLARED HERE, ABOVE ITS BLOCK, for the reason the
   * holders above give.
   */
````

<a id="kit-input-10"></a>
## kit-input-10: demo/kit/input/index.html, inline script, line 169

````js
  /**
   * THE NEWEST BLOCK ON THIS PAGE, 2026-10-10, AND THE FIRST CALL TO
   * `section()`. Asked as *"create linkbutton component, but it next to
   * patchbay comppnent title See details"*. A button that reads as a link,
   * beside a heading, as `createPatchbay` uses it.
   */
````

<a id="kit-input-11"></a>
## kit-input-11: demo/kit/input/index.html, inline script, line 227

````js
  /**
   * 🔴 THE NEWEST BLOCK ON THIS PAGE, 2026-09-30, AND THE FIRST CALL TO
   * `section()`. Asked as *"variables in code ... that are under the code and
   * adjust parameters in real time"*: `/collide/` and `/fau/` hand
   * `param-knobs.mjs` the parameters their compiler read out of the program,
   * and it draws one knob each, turning 0 to 1 through the parameter's warp.
   * ⚠️ `--param-hue` IS SET ON THE MIDDLE ONE ONLY, to show the hook;
   * `/collide/` and `/fau/` set it on every knob from the hue book their code
   * box reads, since 2026-09-30. Every knob here has an invisible hand.
   * ⚠️ `pkSpec` IS DECLARED ABOVE THE BLOCK, for the reason `cnoteSpec` is.
   */
````

<a id="kit-input-12"></a>
## kit-input-12: demo/kit/input/index.html, inline script, line 265

````js
  /**
   * 🔴 THE NEWEST BLOCK ON THIS PAGE UNTIL KNOBS UNDER THE CODE, 2026-09-30.
   * Asked as *"unify compilation in ui logic on this and fau ant othes.
   * trigger on inactivity? Small breating "Compiling" note (not button) on
   * right bottom i the plae complile button is in fau. a kit comopnent?"*.
   * `/fau/` and `/csound/` use it.
   * ⚠️ THE COMPILER HERE IS A STAND-IN THAT TAKES 350 ms, because what this
   * block shows is the TIMING and the note, and a real compiler on the kit
   * page would be six megabytes for a specimen. Type `error` anywhere in the
   * box and it refuses, which is how the standing error is shown.
   * ⚠️ `Hold a note` IS `notNow`: while it is down a due compile waits, and it
   * runs the moment it comes up.
   * ⚠️ `cnoteSpec` IS DECLARED BESIDE THE BLOCK AND ABOVE IT, because a block
   * that moves on this page has left its `const` behind before.
   */
````

<a id="kit-input-13"></a>
## kit-input-13: demo/kit/input/index.html, inline script, line 316

````js
  /**
   * 🔴 NEWEST AT THE TOP, AND THE HEADING IS UPPERCASE. A control grid, as of
   * 2026-09-22, asked for as *"make component for know etc grid where centers
   * of 2x2 knobs make square etc"* and then *"it can be any x y count of
   * elements, right?"*.
   *
   * 🔴 **THE PROBLEM IS THAT A CONTROL IS TALLER THAN IT IS WIDE AND MUST BE.**
   * `--ctl-head` and `--ctl-foot` are the contract: a value line above the
   * dial and a label and a sub below it. So the distance between two dial
   * centres ACROSS is a dial plus a gap, and DOWN it is a dial plus three lines
   * plus a gap. On `/plai/` that was 46 against about 100, and four knobs made
   * a tall rectangle.
   * ✅ **THE FIX WIDENS THE COLUMNS AND NEVER SHRINKS THE ROWS**, because
   * shrinking a row means cutting the value or the label, which are the only
   * things naming what the control does.
   * ⚠️ **AND THE THIRD SPECIMEN IS THE DEMONSTRATION.** A grid of FADERS, which
   * are a different shape again, on the same component with the same rule.
   * A block showing only knobs would have proved the arithmetic works once.
   */
````

<a id="kit-input-14"></a>
## kit-input-14: demo/kit/input/index.html, inline script, line 335

````js
  /**
   * 🔴 NEWEST AT THE TOP, AND THE HEADING IS UPPERCASE. A switch, as of
   * 2026-09-22, asked for as *"add switch component (similar to checbox,
   * rounded yellow ot lightgray rect (primary second))"*.
   *
   * 🔴 **IT IS IN `input` TWO BLOCKS ABOVE THE CHECKBOX, AND THAT IS THE WHOLE
   * POINT**, the same argument the SLIDER block makes for a fader beside a
   * slider and the CHOICE one makes for a standing choice beside a lying one.
   * A switch and a checkbox are two state controls built a day apart, so the
   * only thing that can catch them collapsing into one control with two looks
   * is having them on one scroll where one pair of eyes sees both.
   *
   * 🔴 **THE QUESTION THEY ANSWER IS DIFFERENT AND THE LOOK FOLLOWS FROM IT.**
   * A box is a member of a set, so it is small, square and read as part of a
   * list with a heading over it. A toggle is one thing running or not, so it
   * is a button that stays down. `toggle.mjs` carries the argument in full, and
   * the half that decides it is the announcement: `aria-pressed` says PRESSED
   * where a checkbox says *in the set*.
   * ⚠️ IT SAID `switch.mjs` AND `role="switch"` UNTIL 2026-09-23, when that
   * module was deleted and its three callers swept. A path in a comment that no
   * longer resolves is this project's most repeated defect in its cheapest
   * form.
   * ⚠️ **WHAT THAT ROLE SOUNDS LIKE IS NOT MEASURED ANYWHERE.** No screen
   * reader was run on this machine. What is graded below is that the role is on
   * the element carrying the state, which is the half a browser can answer.
   *
   * 🔴 **BOTH WEIGHTS ARE HERE ON AND OFF, AND SO IS A SWITCH NOBODY MAY
   * PRESS.** A state nobody can see is a state nobody grades, and the disabled
   * one is the negative control the rest of this block leans on: it is wired to
   * the same counter as the other four, so a press that gets through shows up
   * as a number rather than as a look.
   */
````

<a id="kit-input-15"></a>
## kit-input-15: demo/kit/input/index.html, inline script, line 367

````js
  /**
   * 🔴 IT REPLACED `SWITCH` ON 2026-09-23, ASKED FOR IN ONE LINE: *"integrate
   * sustain to footer, create toggle button, big and small, use small below
   * keyboard, left from notes off. rm switch button from all uis / kit"*.
   * `switch.mjs` and its test are deleted and its three callers are swept.
   * ⚠️ WHAT THE SWITCH BLOCK GRADED AND THIS ONE STILL DOES: one counter behind
   * every specimen, so a press that got through the DISABLED one is an integer
   * here rather than something nobody would see in a screenshot.
   * ⚠️ AND `weight` DID NOT SURVIVE THE MOVE. A switch had a loud state and a
   * quiet one; a toggle button has a SIZE instead, because the thing that
   * varies between a page control and a keyboard's own footer is how much room
   * it may take, not how loudly it may speak.
   */
````

<a id="kit-input-16"></a>
## kit-input-16: demo/kit/input/index.html, inline script, line 409

````js
  /**
   * 🔴 NEWEST AT THE TOP, AND THE HEADING IS UPPERCASE. A range slider, as of
   * 2026-09-22, asked for as *"2-head slider (range)"*.
   *
   * ✅ **IT HAS A NAMED JOB RATHER THAN BEING A SHAPE SOMEBODY WANTED.** A
   * macro leg on the Circuit is `Destination, Start, End, Depth`, and 8 macro
   * knobs by 4 legs is 32 start and end pairs, every one of which is two
   * sliders today.
   *
   * 🔴 **FOUR CONTROLS IN ONE GROUP, AND THAT IS THE DEMONSTRATION.** What is
   * being shown is not that a range can be dragged; it is that a range and a
   * single slider share the group's columns, so a panel can mix them and every
   * lane still starts at the same x. A block with one range in it would have
   * proved nothing and the check at the foot of this file would have had
   * nothing to compare against.
   * ⚠️ **AND THREE OF THEM ARE AWKWARD STATES.** One is collapsed, which is a
   * real setting for a leg with no travel and is also the case where every
   * press would grab the same handle if the tie rule were wrong. One is
   * disabled. One carries a gap, so the two can never meet.
   * ⚠️ **NOTHING HERE IS IN A `.pos-controls` ROW**, for the reason the blocks
   * below give: both harnesses press that row by position, so a new top block
   * with a control in it moves every other block's press. MEASURED once on
   * `/archive/radio/` as a single press moving from t+1 s to t+31 s.
   */
````

<a id="kit-input-17"></a>
## kit-input-17: demo/kit/input/index.html, inline script, line 469

````js
  /**
   * 🔴 NEWEST AT THE TOP, AND THE HEADING IS UPPERCASE. A checkbox, as of
   * 2026-09-22, asked for as *"plus checboxes and radios (horiz and vert)"*.
   *
   * 🔴 **THERE WAS NO CHECKBOX IN THIS KIT AT ALL.** Searched the whole of
   * `demo/shell/` and every page on 2026-09-22: zero. `choice.mjs` is a
   * segmented row where exactly one option is armed, which answers *which one
   * of these*, and nothing here answered *which of these*.
   * ⚠️ **IT IS A REAL `<input type="checkbox">` AND NOT A BUTTON WEARING
   * `aria-pressed`**, which is the opposite choice from the one beside it and
   * is the right one for a different question. The four reasons are in
   * `check.mjs`, and the one that decides it is the announcement: a screen
   * reader says `checkbox, checked` for one and `button, pressed` for the
   * other, and *pressed* says something happened where what is true is that
   * something IS.
   * ⚠️ **THE THIRD STATE IS HERE BECAUSE IT IS THE ONE A BUTTON CANNOT DRAW.**
   * `indeterminate` is *some of the ones under this heading*, and
   * `aria-pressed` can spell it `mixed` and nothing paints it.
   */
````

<a id="kit-input-18"></a>
## kit-input-18: demo/kit/input/index.html, inline script, line 504

````js
      // 🔴 SOME OF THEM, WHICH IS A REAL ANSWER AND NOT A LOADING STATE. It is
      // what a heading over a set looks like when part of the set is on, and a
      // press clears it because a press has answered the question.
````

<a id="kit-input-19"></a>
## kit-input-19: demo/kit/input/index.html, inline script, line 532

````js
  /**
   * 🔴 NEWEST AT THE TOP, AND THE HEADING IS UPPERCASE. A choice standing up,
   * as of 2026-09-22, the other half of *"radios (horiz and vert)"*.
   *
   * 🔴 **THE TWO ARE SIDE BY SIDE AND THAT IS THE WHOLE POINT**, the same
   * argument the SLIDER block makes for putting a fader next to a slider: a
   * standing choice is the lying one with the join and the corners turned, so
   * the only way to catch the two drifting apart is to put them where one pair
   * of eyes sees both.
   * ⚠️ **TURNING THE DIRECTION IS THE HALF FIX THAT LOOKS FINISHED.**
   * `.pos-seg` overlaps its children on the LEFT and rounds the first child's
   * left corners, so a column that only changed `flex-direction` has a doubled
   * border on every join and two stray curves in the middle of it. Both are
   * asserted at the foot of this file.
   * ⚠️ **AND THE THIRD ONE HAS NOTHING CHOSEN**, which is `at: -1` and is a
   * real state rather than a bug: a question that arrives with an answer
   * already given is a question nobody was asked.
   */
````

<a id="kit-input-20"></a>
## kit-input-20: demo/kit/input/index.html, inline script, line 608

````js
  /**
   * 🔴 NEWEST AT THE TOP, AND THE HEADING IS UPPERCASE. Asked 2026-09-19:
   * *"global: make buttongroup component and convert all vr/ar buttons to it"*.
   *
   * 🔴 THE HEADSET PAIR WAS THE SECOND HALF OF THIS BLOCK AND ITS SPECIMEN IS
   * GONE, 2026-09-20, asked for by quoting the page back: *"rm save pressed /
   * AND TWO THIS BROWSER MAY NOT BE ABLE TO / headset / vr no, ar no"*. The
   * GROUP is still built and still wired to the real probe, off screen, because
   * the check at the foot of this file grades that wiring and nothing else can
   * see a call that is not there. `/held/` shipped the defect it catches: a
   * `Run in VR` on an iPhone that accepts the press and answers with a line in
   * the log.
   * ⚠️ AND THE OFF-SCREEN ROW IS NOT `.pos-controls`. Both harnesses press
   * every button in that row by position, so leaving it there would be two
   * presses landing on buttons nobody can see.
   *
   * ⚠️ AND MOVING A BLOCK MOVES EVERY BUTTON AFTER IT. `verify.mjs` presses by
   * position, so re-run `node demo/verify.mjs kit` and diff the assert count
   * after any reorder. This block is the first on the page with buttons in a
   * `.pos-controls` row, so it owns control 0.
   */
````

<a id="kit-input-21"></a>
## kit-input-21: demo/kit/input/index.html, inline script, line 645

````js
      /* 🔴 THE SMALL VARIANT, NEWEST, SO AT THE TOP OF THE BOX. `button.pos-sm`
         (`shell.css`), asked 2026-09-26 for `/fau/`'s Compile as *"small button
         variant"* and wanted by `/wish/`'s remove button before that. A plain
         button stands first so the eye has the 34 to measure the 26 against;
         then the word, the primary (the ring is a shadow and survives the
         height), and the glyph square `/wish/` asked for.
         ⚠️ NOT IN A `.pos-controls` ROW. Both harnesses press every button in
         one, by position, and a row of four with no handlers added above the
         group would move every press on this page below it. A `kit-row` keeps
         the press order where it was, which is the TOGGLE block's own choice. */
````

<a id="kit-input-22"></a>
## kit-input-22: demo/kit/input/index.html, inline script, line 664

````js
      // ⚠️ SHOWN IN A `.pos-controls` ROW, WHICH IS WHERE IT GOES. Both
      // harnesses press `.pos-controls button`, which is a DESCENDANT selector,
      // so a group inside that row is reachable and one outside it is not. The
      // check at the bottom grades exactly that, against this specimen.
      // ⚠️ AND NO HANDLER, which is what `CONTROL ROW` below already does with
      // its six buttons: what is on show is the row, the join and the states,
      // and an echo of the last press is a readout of the harness rather than
      // of the component.
````

<a id="kit-input-23"></a>
## kit-input-23: demo/kit/input/index.html, inline script, line 684

````js
      // The pair the component was built for, driven by the real probe. Built
      // and never shown, for the reason in the note above: the check at the
      // foot of this file asks whether a page that subscribes agrees with what
      // this browser answers, and it needs a group to ask it of.
````

<a id="kit-input-24"></a>
## kit-input-24: demo/kit/input/index.html, inline script, line 711

````js
      /**
       * 🔴 BOTH KINDS IN ALL THREE STATES, WHICH IS SIX AND WAS FOUR. Reported
       * 2026-09-20: *"primary working button missing"*.
       * `button.pos-pri[data-busy="1"]` and `button.pos-pri:disabled` both have
       * rules in `shell.css` and neither had a specimen, so a rule that stopped
       * working would have looked exactly like a rule that works. A state with a
       * rule and no specimen is the drift this page exists to catch.
       */
````

<a id="kit-input-25"></a>
## kit-input-25: demo/kit/input/index.html, inline script, line 754

````js
      /**
       * ⚠️ THE SAME MIDDLE AS THE PATCH ROW, AND THE SAME CODE. `createValueCell`
       * lives in `picker.mjs` and both use it, so a fix to the cell reaches both
       * rather than one of them drifting. The arrows still step; the middle says
       * where you are and opens the platform's own list.
       */
````

<a id="kit-input-26"></a>
## kit-input-26: demo/kit/input/index.html, inline script, line 773

````js
      // ⚠️ THE THIRD MIDDLE, WHICH IS NO MIDDLE. Reported 2026-09-20 as
      // *"stepper misisng random butotn optopn"*, and the note above this block
      // has always claimed three middles while the page showed two. The empty
      // one is the case the component's own corner rounding has to survive, so
      // it is the one that quietly stops being checked by looking.
````

<a id="kit-input-27"></a>
## kit-input-27: demo/kit/input/index.html, inline script, line 802

````js
      // ⚠️ `hand: true` ON THE TWO THAT MOVE, asked 2026-09-20: *"convert no
      // hand slider to hand slider"*. The disabled one is left plain, because a
      // hand on a lane nobody can drag is a control that cannot do the thing it
      // names. What the button itself does is the INVISIBLE HAND block below.
````

<a id="kit-input-28"></a>
## kit-input-28: demo/kit/input/index.html, inline script, line 815

````js
      /**
       * 🔴 THE SAME CONTROL STANDING UP, BESIDE THE ONE LYING DOWN. Asked
       * 2026-09-21: *"add vert slider examples next to horiz"*, and next to is
       * the whole point: a fader is `.sld-lane` and `.sld-knob` with the axes
       * swapped, and the only way to catch the two drifting apart is to put
       * them where one pair of eyes can see both.
       * ⚠️ **THREE THINGS SHOULD MATCH AND ARE ASSERTED BELOW**: the track is
       * 34 px across either way, the handle is a solid block rather than a
       * fill, and the hand button is a segment of the lane with the corners
       * rounded only on the outside.
       */
````

<a id="kit-input-29"></a>
## kit-input-29: demo/kit/input/index.html, inline script, line 876

````js
      // ⚠️ ONE BUTTON, NOT THREE NAMED SOUNDS. `slow drift`, `glass rain` and
      // `deep hum` came off 2026-09-20 on instruction: *"rm slow drift etc
      // butotns"*. The settings they loaded stayed, because the glide is the
      // only thing this section has to show and a section that cannot be made
      // to do its own trick is a picture of a component rather than a specimen.
````

<a id="kit-input-30"></a>
## kit-input-30: demo/kit/input/index.html, inline script, line 890

````js
        // ⚠️ QUIET AND GLIDING AT THE SAME TIME, which is the pair a patch
        // wants: no callback storm back into whatever loaded the patch, and
        // a handle you can watch move. They are separate options for exactly
        // that reason.
````

<a id="kit-input-31"></a>
## kit-input-31: demo/kit/input/index.html, inline script, line 976

````js
      /**
       * ⚠️ THE BUTTON FOR HEIGHT IS GONE, AND SO IS THE ALIGNMENT THAT SEATED
       * IT. Asked for on 2026-09-17 as *"align to bottom (button, for height and
       * move to right"* and unasked on 2026-09-20 as *"rm button for height"*.
       * The slider block carried one for the same reason and lost it in the same
       * pass.
       * ⚠️ AND THE `out` LINE IS GONE, with the disabled field. *"rm message · 1
       * lines, 8 characters"* and *"rm off button"*. A live count of what you
       * have typed says nothing about the component, and a field is the one
       * control on this page whose state you can read by looking at it.
       */
````

<a id="kit-input-32"></a>
## kit-input-32: demo/kit/input/index.html, inline script, line 990

````js
  // ── keyboard ────────────────────────────────────────────────────────────
  // ⚠️ THE NOTE IS WHERE THE GESTURES ARE WRITTEN DOWN FOR A READER, and it is
  // the only place. `/knobs/` and this page both carry a diagram, so both are
  // held to a one line `what` that is the index's own line; `/instrument/`,
  // `/looper/` and `/able/` have paragraphs about where their SOUND comes from
  // and are already at the length the house rule allows. A gallery of controls
  // is the right home for what a control does.
````

<a id="kit-input-33"></a>
## kit-input-33: demo/kit/input/index.html, inline script, line 997

````js
  /**
   * 🔴 BOTH SHAPES, BECAUSE BOTH WERE ASKED FOR. *"add component that can be
   * glued top of it that is vertical piano roll"*, then *"pianoroll should be
   * work standalone too. add to kit both options"*, 2026-09-23.
   * ⚠️ AND THE DIFFERENCE IS NOT A FLAG IN THE COMPONENT. Being inside a `.kbd`
   * is the whole condition: glued it gives up its edges and brings a seam, on
   * its own it is the standard card every other surface here is. A roll that
   * chose its own look would be a second place for that decision to live.
   * 🔴 THE ONE CLAIM WORTH GRADING IS THE ALIGNMENT, and it is asserted as a
   * COLUMN POSITION IN PIXELS rather than as a base number, which is how the
   * same defect was caught on `/nola/` twice: once as chord charts that had a
   * different base, and once as a roll whose gap was 3 px where the keyboard's
   * was 2.
   */
````

<a id="kit-input-34"></a>
## kit-input-34: demo/kit/input/index.html, inline script, line 1055

````js
  /* ⚠️ HOISTED SO THE CHECK AT THE FOOT CAN REACH THEM. Every specimen is built
     inside its own `section` callback, which is right for a gallery and means a
     check at module scope can see none of it. These two are the keyboard and
     what its callbacks heard, and the loop check below reads both. */
````

<a id="kit-input-35"></a>
## kit-input-35: demo/kit/input/index.html, inline script, line 1072

````js
      /* 🔴 `loop: true`, SO THE GALLERY CARRIES THE COMPONENT'S NEWEST FUNCTION.
         Asked 2026-09-23 as *"a keyboard funcion, a button in bottom rihjt (left
         from sustain) called 'Loop'"* and then, pointedly, *"do not wire nola,
         its gloabl keyboard fn"*. The keyboard records what it emits and replays
         it through its own press path, so a page needs no code for it, and this
         block is where that claim gets to be true in front of a reader.
         🔴 AND IT IS OFFERED HERE WHATEVER IS PLUGGED IN, WHICH IS A DECISION
         AND NOT AN OVERSIGHT. Since 2026-09-28 the control can be withdrawn,
         asked for as *"rm loop button when evolution keyboad is not
         connected"*, and `/nola/` withdraws it until that keyboard answers.
         This page has no MIDI at all and never will: a gallery whose job is to
         show what the kit has, hiding the control the component grew most
         recently, would be a gallery nobody can read. `offerLoop`'s default is
         shown for exactly this caller, and the check below drives both states
         rather than letting the gallery stand in for a measurement. */
````

<a id="kit-input-36"></a>
## kit-input-36: demo/kit/input/index.html, inline script, line 1102

````js
      /**
       * 🔴 THE SAME COMPONENT IN A PHONE'S WIDTH, WHERE IT SCROLLS. Asked
       * 2026-09-17: *"kit keyboard: add example with mobiel overflow"*. The keys
       * have a floor of 49 px and never shrink below it, so a narrow box shows
       * about seven of the thirteen and the row becomes a scroller. On a desktop
       * the block above never reaches that state, so the behaviour every phone
       * gets was the one thing this gallery could not show.
       * ⚠️ 320 px, WHICH IS NARROWER THAN ANY PHONE ANYBODY OWNS. An iPhone SE
       * is 375 and the commonest screens are 390 and 412, so a specimen that
       * overflows at 320 overflows on all of them, with room to spare.
       * ⚠️ `letters: false`, BECAUSE BOTH KEYBOARDS HEAR THE LETTER ROW. They
       * bind `window`, so one press of `a` sounded two notes and lit two keys,
       * which in a gallery reads as a broken component rather than as two
       * components doing exactly what they were told.
       */
````

<a id="kit-input-37"></a>
## kit-input-37: demo/kit/input/index.html, inline script, line 1156

````js
  /* ── what a machine can say about this page ─────────────────────────────
     🔴 EVERY CHECK ON THIS PAGE IS BEHIND `?selfcheck=1`, the page level ones
     included (CLAUDE.md: a self-check never runs for a visitor). The checks
     below are copied from `demo/kit/index.html` VERBATIM and keep that
     file's indent, so a diff against it reads clean; the one line taken out
     of each is a `settle()` or `measure()`, the measuring window a page with
     no closed tab has no use for. Their comments still name it.
     ⚠️ THEY RUN AFTER A FRAME, because `getBoundingClientRect` before the
     first paint answers about a page that has not been arranged yet. */
````

<a id="kit-input-38"></a>
## kit-input-38: demo/kit/input/index.html, inline script, line 1183

````js
          // one line is under one and a half of the font's size: a typed 12 px
          // was the system mono's line box, and JetBrains Mono's is 12.5 at
          // 9.5 px (2026-10-12), while two lines are over 20
````

<a id="kit-input-39"></a>
## kit-input-39: demo/kit/input/index.html, inline script, line 1223

````js
  /* ── the code box, the newest block ────────────────────────────────────────
     🔴 THE WHOLE DESIGN RESTS ON ONE INVARIANT: THE DRAWN LAYER HOLDS EXACTLY
     THE TEXTAREA'S TEXT, AT EXACTLY THE TEXTAREA'S METRICS, IN EXACTLY ITS
     RECTANGLE. Read off the rendered elements, never off the source.
     ⚠️ `refit()` FIRST, BECAUSE A MEASURING WINDOW HOLDS NO FRAME. The box was
     built inside a closed panel, where it measures nothing on purpose, and its
     ResizeObserver answers a frame after this line; the same reason the
     INSTRUMENT PANEL block calls the filter view's `redraw()`. */
````

<a id="kit-input-40"></a>
## kit-input-40: demo/kit/input/index.html, inline script, line 1286

````js
  /* ── the knobs under the code, the newest block ────────────────────────────
     🔴 THE ROW IS DRIVEN THROUGH A KNOB'S OWN KEYS, AND THE HUE IS READ OFF THE
     PAINTED STROKE. A hook nobody has measured is a hook that may never have
     worked, and `var()` fallbacks are exactly the kind of CSS that reads as
     correct and computes to something else. */
````

<a id="kit-input-41"></a>
## kit-input-41: demo/kit/input/index.html, inline script, line 1320

````js
    /* 🔴 SINCE 2026-09-30 AN EMPTY ROW KEEPS A KNOB'S HEIGHT AND SAYS SO
       (*"make the area h for thise buttons fixed so no junmp"*), so the keys
       under it on `/collide/` and `/fau/` never move. Measured against the
       row with two knobs in it, and nothing in the reserve is focusable. */
````

<a id="kit-input-42"></a>
## kit-input-42: demo/kit/input/index.html, inline script, line 1344

````js
  /* ── the compile note ──────────────────────────────────────────────────────
     🔴 THE STATIC HALF NOW, THE TIMED HALF IN THE BACKGROUND. `/kit/` has about
     two seconds of room before the harness gives up waiting for `ready` (see
     the loop block near the foot), and the timed half is four compiles of a
     350 ms stand-in, so it is NOT awaited: its asserts land after `ready`,
     never more than about 1.5 s apart, which is inside the harness's patience.
     ⚠️ EACH HALF IS A NEGATIVE CONTROL FOR THE OTHER. A note that was always
     drawn passes "it breathes while compiling" and fails "the corner is
     empty"; a module that ignored `notNow` fails the held wait; one that
     dropped the compile under the hold fails the release. */
````

<a id="kit-input-43"></a>
## kit-input-43: demo/kit/input/index.html, inline script, line 1364

````js
  /**
   * 🔴 THE BAND BETWEEN TWO HANDLES IS THE ONE THING `range-slider-test.mjs`
   * CANNOT SEE. That file grades the arithmetic and says so at the top: the
   * component positions the band with a `calc()` in percentages, because a
   * percentage follows the lane with no resize observation, and a percentage
   * cannot be run in node. `spanPixels` is the same arithmetic written in
   * pixels, so this compares what the browser resolved against what the
   * arithmetic says, and the two can disagree.
   */
````

<a id="kit-input-44"></a>
## kit-input-44: demo/kit/input/index.html, inline script, line 1389

````js
    /**
     * 🔴 THE WHOLE ARGUMENT FOR THIS BEING A NEW MODULE RATHER THAN A COPY IS
     * THAT IT SHARES THE SLIDER'S COLUMNS, and a group holding four ranges and
     * one plain slider is the only way to measure it. `grains` once appended
     * four sliders to a class with no CSS anywhere and every lane started at a
     * different x, because a wider label pushes its own lane right.
     */
````

<a id="kit-input-45"></a>
## kit-input-45: demo/kit/input/index.html, inline script, line 1403

````js
    /**
     * 🔴 TWO VALUES ARE TWO TAB STOPS, AND THE LANE IS NOT ONE OF THEM. On a
     * single slider the LANE carries `tabindex` and is the slider; a range that
     * copied that would have one of its two values unreachable from a keyboard
     * entirely, which is invisible in a screenshot and free to read off the DOM.
     */
````

<a id="kit-input-46"></a>
## kit-input-46: demo/kit/input/index.html, inline script, line 1417

````js
    /**
     * 🔴 AND EACH HANDLE IS TOLD THE SCALE IT CAN ACTUALLY REACH. Reporting the
     * full 0 to 127 on both says the start can go to 127 while the end is at 96,
     * and the only way to find that out is to press the key and hear nothing
     * change. This reads the attributes a screen reader reads.
     */
````

<a id="kit-input-47"></a>
## kit-input-47: demo/kit/input/index.html, inline script, line 1439

````js
    /* 🔴 A DISABLED CONTROL LEAVES THE TAB ORDER, or it is a control that can be
       driven from a keyboard while looking greyed out. */
````

<a id="kit-input-48"></a>
## kit-input-48: demo/kit/input/index.html, inline script, line 1446

````js
    /**
     * 🔴 THE KEYBOARD, DRIVEN RATHER THAN READ. `verify.mjs` cannot drag a lane
     * and `slider.mjs` says so in its own header, so the arrow keys are the one
     * route a harness has into a control like this. The gap slider is used
     * because it is the one where the invariant has something to do: `End` on
     * its start handle lands 20 below the end rather than at 127.
     * ⚠️ AND IT PUTS THE VALUES BACK. A check does not get to leave a reader's
     * page in a state they did not ask for, and this block holds no `await`, so
     * no frame is rendered in the middle of it.
     */
````

<a id="kit-input-49"></a>
## kit-input-49: demo/kit/input/index.html, inline script, line 1456

````js
    /*
     * 🔴 AND IT RUNS UNDER `?selfcheck=1` ONLY, FOUND 2026-10-04. This block sits
     * at the top level of the module with no gate, so the keys went out on every
     * visit, and with `bubbles: true` each one reached `transport-bar.mjs`'s
     * `window` listener, which moves every bar a key from outside a bar reaches.
     * `ArrowRight` is a 2 per cent seek, so a plain load showed every visible bar
     * at 0:01.200 rather than 0:00. The handle's listener is on the knob itself,
     * so the key does not need to bubble to be graded, and it no longer does.
     */
````

<a id="kit-input-50"></a>
## kit-input-50: demo/kit/input/index.html, inline script, line 1482

````js
  /**
   * 🔴 THE TOGGLE ACTS OR IT IS NOT A CONTROL, SO NOTHING BELOW ASSERTS AN
   * OPTION THAT WAS PASSED IN. A real click goes down the same path a finger
   * takes, the counter behind all the specimens says whether the page was
   * told, and the disabled one is clicked on purpose to prove the counter can
   * refuse to move. That is what the SWITCH block asserted until 2026-09-23 and
   * it is what this one inherits; what left with the switch is the knob travel
   * and the two weights, because a button has neither.
   */
````

<a id="kit-input-51"></a>
## kit-input-51: demo/kit/input/index.html, inline script, line 1493

````js
    /* 🔴 `aria-pressed` IS THE STATE AND `get()` READS THE SAME ATTRIBUTE,
       which is the claim rather than a detail: a control whose picture and
       whose announcement come from two copies of one boolean will eventually
       disagree, and only one of the two is visible in a screenshot. */
````

<a id="kit-input-52"></a>
## kit-input-52: demo/kit/input/index.html, inline script, line 1520

````js
    /**
     * 🔴 THE TWO SIZES ARE A REAL DIFFERENCE AND THE SMALL ONE IS THE PAD'S
     * OWN HEIGHT. 34 px is every control on a page and 26 px is what
     * `shell.css` argues for under a keyboard, which is 34 minus one gap. A
     * check that only asked *is there a data-size attribute* would pass a
     * stylesheet that had stopped reading it.
     */
````

<a id="kit-input-53"></a>
## kit-input-53: demo/kit/input/index.html, inline script, line 1535

````js
    /**
     * 🔴 THE SMALL BUTTON IS THE SMALL TOGGLE'S HEIGHT, READ OFF `--ctl-sm`
     * RATHER THAN TYPED HERE, AND ITS GLYPH FORM IS A SQUARE OF THE SAME.
     * `pos-sm`, 2026-09-26. Three rendered boxes and one token, compared, so
     * a toggle and a button that stopped agreeing would fail here rather than
     * drift. The negative half is the plain button beside them staying a
     * control's 34: a stylesheet that shrank every button would pass a check
     * that only measured the small ones. The primary keeps its ring, which is
     * a shadow and not a size, so it is read as present rather than measured.
     */
````

<a id="kit-input-54"></a>
## kit-input-54: demo/kit/input/index.html, inline script, line 1559

````js
    /**
     * 🔴 ONE YELLOW, READ OFF THE STYLESHEET RATHER THAN TYPED HERE. `--hi`
     * means *the thing this control is about* on every page in this project, so
     * a pressed toggle is compared against the token itself: a colour typed
     * into a check is a second source that can disagree with the first.
     * ⚠️ AND THE NEGATIVE HALF IS THE ONE WORTH HAVING. A check that only asked
     * *is a pressed one tinted* would pass a stylesheet on which every toggle
     * is, which is the drift this grades.
     */
````

<a id="kit-input-55"></a>
## kit-input-55: demo/kit/input/index.html, inline script, line 1589

````js
    /**
     * 🔴 A CONTROL THAT SAYS IT CANNOT BE PRESSED AND THEN ACTS IS THE LIE THIS
     * PROJECT HAS A NAME FOR, and the press is real rather than assumed. It is
     * wired to the same counter as the other four, so a press that got through
     * is an integer rather than something somebody has to notice in a
     * screenshot.
     */
````

<a id="kit-input-56"></a>
## kit-input-56: demo/kit/input/index.html, inline script, line 1609

````js
  /**
   * 🔴 THE CHECKBOX IS A REAL ONE, AND THE HALF THAT MATTERS IS THE HALF THAT
   * IS INVISIBLE. `check.mjs` clips the input to a pixel and draws the box
   * beside it, and the whole reason that is better than `display: none` is that
   * the input stays focusable. That claim cannot be seen and is free to read.
   */
````

<a id="kit-input-57"></a>
## kit-input-57: demo/kit/input/index.html, inline script, line 1629

````js
    /**
     * 🔴 THE THIRD STATE IS THE ONE A BUTTON WEARING `aria-pressed` CANNOT
     * DRAW, so it is the one worth grading. It is a property rather than an
     * attribute, which means nothing in the HTML says it is there and only a
     * check like this can see it.
     * ⚠️ AND A PRESS CLEARS IT, because a press has answered the question. The
     * click is put back on the next line and nothing is awaited in between.
     */
````

<a id="kit-input-58"></a>
## kit-input-58: demo/kit/input/index.html, inline script, line 1648

````js
    /**
     * A set of boxes is a GROUP with its own name attached. Without that, five
     * boxes beside a word are five loose controls and a stray label.
     */
````

<a id="kit-input-59"></a>
## kit-input-59: demo/kit/input/index.html, inline script, line 1670

````js
  /**
   * 🔴 A STANDING CHOICE IS THE LYING ONE WITH THE JOIN AND THE CORNERS TURNED,
   * AND TURNING ONLY THE DIRECTION IS THE HALF FIX THAT LOOKS FINISHED.
   * `.pos-seg` overlaps its children on the LEFT and rounds the first child's
   * left corners, both of which are the wrong axis once the options are
   * stacked: a doubled border on every join, and two stray curves in the middle
   * of the column. Neither shows in a count of buttons.
   */
````

<a id="kit-input-60"></a>
## kit-input-60: demo/kit/input/index.html, inline script, line 1408

````js
  /**
   * 🔴 A FADER IS THE SLIDER TURNED 90 DEGREES, AND THAT IS A MEASUREMENT.
   * Both read their look from `.sld-lane` and `.sld-knob` with the axes
   * swapped, so the two can only drift if nobody compares them. **Putting them
   * side by side on this page is half of it; this is the other half.**
   */
````

<a id="kit-input-61"></a>
## kit-input-61: demo/kit/input/index.html, inline script, line 1438

````js
  /**
   * 🔴 THE DROP TARGET, AND THE FIRST TWO OF THESE ARE ABOUT A COVER NOBODY
   * SHOULD EVER BE TRAPPED UNDER. `/weight/` and `/floor/` both shipped a
   * `position: fixed; inset: 0` cover that sat over the row holding the button
   * that got you out, so this one has two independent guards and both are
   * measured: it is in the document only while a drag is in flight, and it is
   * `pointer-events: none` for its whole life. Either one alone would be enough
   * and neither one alone is checked.
   *
   * ⚠️ THE MEASUREMENT APPENDS THE COVER AND TAKES IT AWAY WITHOUT AWAITING,
   * which is the same argument the panel block's window makes: JavaScript here
   * is single threaded, no frame can be rendered between these statements, and
   * so a person reading this page never sees it. An `await` anywhere in this
   * block would break that and would be a check that mutates the page in front
   * of a reader, which is what `/tapes/`'s zoom check was doing.
   */
````

<a id="kit-input-62"></a>
## kit-input-62: demo/kit/input/index.html, inline script, line 1461

````js
    // 🔴 THE AREA IS ON SCREEN BEFORE ANYBODY DRAGS ANYTHING, which is the whole
    // repair and is exactly what the first version could not have passed.
````

<a id="kit-input-63"></a>
## kit-input-63: demo/kit/input/index.html, inline script, line 1479

````js
  /**
   * 🔴 THE REFUSAL, AND IT IS BEHIND THE GATE BECAUSE IT PRESSES A CONTROL.
   * A drop target that took everything would pass every check that counts what
   * it opened, which is the shape this project measured four times: `/tapes/`,
   * `/now/` and `/flipper/` were all fully green against stand-ins whose
   * refusals had been switched off. So the JPEG is dropped on purpose, down the
   * same code path a real drag takes, and the words it produces are asserted
   * rather than the counter alone: a refusal that increments a number and says
   * nothing to the reader is the failure this is guarding against.
   */
````

<a id="kit-input-64"></a>
## kit-input-64: demo/kit/input/index.html, inline script, line 1490

````js
    // 🔴 THE WINDOW IS SHUT ACROSS THE WAIT AND OPENED AGAIN AFTER, WHICH IS
    // THE RULE THIS PAGE ALREADY WROTE DOWN AND WHICH I BROKE ON THE FIRST RUN.
    // Reading a file is a promise, so an `await` here sits inside the measuring
    // window, a `requestAnimationFrame` callback finds it open, and a frame is
    // drawn with all parts laid out at once. It went red immediately and
    // named the count, which is what that counter is for: no reading of the
    // source can see an await, and three other places on this page do exactly
    // this dance for the same reason.
````

<a id="kit-input-65"></a>
## kit-input-65: demo/kit/input/index.html, inline script, line 1506

````js
    // ⚠️ THE NEGATIVE CONTROL. A target that refused EVERYTHING would pass the
    // assert above perfectly, so one file it does take goes down the same path.
````

<a id="kit-input-66"></a>
## kit-input-66: demo/kit/input/index.html, inline script, line 1516

````js
  // 🔴 THE GROUP'S BUTTONS ARE WHERE THE HARNESSES LOOK, AND THAT IS THE ONE
  // THING A ROW COMPONENT CAN QUIETLY BREAK. `verify.mjs` and `verify-gl.mjs`
  // both press `.pos-controls button`, so a group that wraps its buttons in a
  // row of its own is one refactor away from taking them out of that selector
  // and out of the suite. `/mirror/` has already paid for this once: a stepper
  // moved into the knob row and the press count went 9 to 7 while the page read
  // green. Graded with the harnesses' OWN selector string, against a specimen
  // mounted the way a page mounts one.
  // ⚠️ PROVED BY BREAKING IT, 2026-09-19: the same specimen in a `.kit-row`
  // instead reads `0 of 3` and takes this red. The pressable count beside it is
  // 4 as of 2026-09-20, down from 6 when the headset pair went off screen, and
  // it is a fact about how many blocks currently mount a control row rather
  // than a number this check is graded against.
````

<a id="kit-input-67"></a>
## kit-input-67: demo/kit/input/index.html, inline script, line 1537

````js
  // 🔴 THE GROUP IS ONE OBJECT, AND IT SHIPPED AS THREE. Reported 2026-09-19
  // with a screenshot of `/mirror/`: *"i do not see buttongroup vr xr"*. The
  // row had `gap: 8px`, which is what two unrelated controls look like. The
  // join is `.pos-seg`'s `margin-left: -1px`, so what a reader sees is one
  // line where two buttons meet rather than two edges with a gap: measured as
  // the distance between the first button's right edge and the second's left,
  // which is -1 when they are joined and +8 when they are not.
  // ⚠️ AND THE CORNERS, because a join that overlaps borders while both
  // buttons keep four round corners reads as a mistake rather than as a seam.
  // Only the outer two are round.
````

<a id="kit-input-68"></a>
## kit-input-68: demo/kit/input/index.html, inline script, line 1560

````js
  // 🔴 AND IT IS STILL NOT A CHOICE, WHICH IS THE HALF THE JOIN CANNOT CARRY.
  // A segmented row with nothing armed is a legal choice state: `/stage/` ships
  // one, with `at: -1`, because a question that arrives already answered is a
  // question nobody was asked. So the difference has to live somewhere else and
  // it lives in two places a reader can see. `aria-pressed` is the channel a
  // choice arms, for a screen reader and for the `--hi` tint keyed on it, and a
  // group never writes it. And a group's buttons are FULL SIZE, because they
  // are things you press, where a choice's options are small because they are
  // values being compared.
  // ⚠️ MEASURED AS INK, NOT READ OFF THE STYLESHEET. A rule that is present and
  // inert reads exactly like one that works, which is this page's own lesson.
````

<a id="kit-input-69"></a>
## kit-input-69: demo/kit/input/index.html, inline script, line 1581

````js
  // 🔴 SWITCHING A BUTTON OFF MOVES NOTHING. The answer that switches these off
  // arrives late by construction, because asking a browser about a headset is a
  // promise, so a disabled look that changed the box would reflow the control
  // row under a pointer already on its way to it. `button[disabled]` is opacity
  // and a cursor, and this measures that it stayed that way.
````

<a id="kit-input-70"></a>
## kit-input-70: demo/kit/input/index.html, inline script, line 1612

````js
  // 🔴 THE IPHONE CASE, WHICH IS THE ONE THAT WAS BROKEN. Every XR page wrote
  // `navigator.xr?.isSessionSupported(...).then(...)`, and on a browser with no
  // `navigator.xr` the optional chain returns undefined, so neither handler runs
  // and the variable stays null for ever. `/held/` then reported that to a
  // visitor holding a phone as a check that had FAILED. `createXrProbe` takes
  // the system object rather than reading `navigator`, so the case that cannot
  // be reproduced in this browser can be built in one line.
  // ⚠️ THREE PROBES, NOT ONE. A module that answered `absent` about everything
  // would pass the first of these on its own, which is the whole reason the
  // other two are here.
````

<a id="kit-input-71"></a>
## kit-input-71: demo/kit/input/index.html, inline script, line 1623

````js
    // ⚠️ THE SECOND OF THE TWO WAITS, AND THIS ONE MEASURES NO GEOMETRY AT ALL,
    // so the window simply shuts across it. Three promises resolving is three
    // frames a browser could render with every part open. See `measure()`.
````

<a id="kit-input-72"></a>
## kit-input-72: demo/kit/input/index.html, inline script, line 1637

````js
  // Every answer that switches a control off has a sentence a visitor can read,
  // and the answer that switches nothing off has nothing to say. A disabled
  // button with no reason is worse than an enabled one; a tooltip on a working
  // control restating its own label is furniture.
````

<a id="kit-input-73"></a>
## kit-input-73: demo/kit/input/index.html, inline script, line 1663

````js
  // The pair this page builds is wired the way the four pages wire theirs, so
  // the wiring is graded once here rather than four times over there. Whatever
  // this browser answers, the control agrees with it.
  // ⚠️ THE GROUP IS OFF SCREEN SINCE 2026-09-20, when the specimen was asked
  // for removal. It is the same object wired the same way; what went is the row
  // a visitor could see, and this check is why the group itself did not go with
  // it.
  // ⚠️ PROVED BY BREAKING IT, 2026-09-19: with the two `enable` calls taken out
  // of the subscription this reads `vr no, pressable` and goes red, which is
  // the `/held/` defect exactly. A page that forgets to wire it is the failure
  // this catches, because nothing else can see a call that is not there.
````

<a id="kit-input-74"></a>
## kit-input-74: demo/kit/input/index.html, inline script, line 1682

````js
  // 🔴 THE LEFT EDGES. Reported THREE TIMES on a real page and the third
  // report was a different bug wearing the first one's clothes: a component
  // swap moved the class a rule was keyed on, the sharing call went on setting
  // a custom property nothing consumed, and the row snapped back to the width
  // of one word while the code and the comment beside it both read as correct.
  // Measured ink, not arithmetic about ink.
  //
  // ⚠️ A PAIRED GROUP IS TWO COLUMNS ON PURPOSE, so "one left edge" is the
  // wrong claim about it and grading it that way reported 355 px apart about a
  // layout doing exactly what it was asked. It gets the claim that IS true of
  // it: two columns, and every label in a column on one edge. First written the
  // other way, which is how the difference got noticed.
````

<a id="kit-input-75"></a>
## kit-input-75: demo/kit/input/index.html, inline script, line 1729

````js
  // 2b. 🔴 THE INVISIBLE HAND'S BUTTON, MEASURED RATHER THAN LOOKED AT, AND
  // NOTHING HERE PRESSES IT. A visit to this page must assert a strict subset:
  // everything gradable from what is already on the screen runs, and anything
  // that would start a movement does not. The plumbing claims are graded on
  // `/knobs/` behind `?selfcheck=1`, which is the page that has two sliders and
  // a real send gate to compare them with.
````

<a id="kit-input-76"></a>
## kit-input-76: demo/kit/input/index.html, inline script, line 1751

````js
    // 🔴 AND THE WRAPPER IS CONDITIONAL, WHICH IS A REAL CASUALTY AND NOT A
    // PREFERENCE. `/grains/` selects `.fade > .sld > .sld-lane` with a CHILD
    // combinator, so an unconditional row would stop that matching in silence
    // and take the lane back to its standalone 96 px.
    // ⚠️ AND NO HAND BUTTON MAY SIT IN A CONTROL ROW: `verify.mjs` presses
    // `.pos-controls button` on every demo on every run.
````

<a id="kit-input-77"></a>
## kit-input-77: demo/kit/input/index.html, inline script, line 1768

````js
    /**
     * 🔴 THE STEPPER'S MIDDLE IS REALLY A LIST, not a label that looks like one.
     * A cell that draws the right name with an empty or disabled select behind
     * it is the exact failure `picker.mjs` records on `/mirror/`: the control
     * looked correct and could not be used. So this asserts the working half.
     */
````

<a id="kit-input-78"></a>
## kit-input-78: demo/kit/input/index.html, inline script, line 1784

````js
  // 🔴 THE KEYBOARD UNDER A FINGER, WHICH IS THE ONE THING ABOUT IT THIS
  // MACHINE CANNOT SIT DOWN AT.
  //
  // ⚠️ EVERY CHECK BELOW IS BEHIND `?selfcheck=1`, because every one of them
  // builds a keyboard over the page and presses its keys. A visitor gets none
  // of it, which is the standing rule and not a judgement about how cheap this
  // particular block is.
  //
  // ⚠️ AND THEY BUILD THEIR OWN KEYBOARDS RATHER THAN DRIVING THE SPECIMEN.
  // The specimen sits in a box that is ~656 px wide on a laptop and 328 px on a
  // phone, and the phone layout is the thing to grade. A throwaway one in a
  // holder of a stated width asks the question directly.
  // ⚠️ THE FLAG IS `shell/selfcheck.mjs`'s NOW, read the same way on every page
  // rather than re-derived here. Same value, same moment, one place to grep.
````

<a id="kit-input-79"></a>
## kit-input-79: demo/kit/input/index.html, inline script, line 1799

````js
    // ⚠️ THE MEASURING WINDOW STAYS OPEN ACROSS THIS BLOCK AND THE WATCHDOG
    // STANDS DOWN FOR IT. Everything in here waits — for a fade, for a
    // keyboard's verdict, for a cover to come up — so frames WILL be rendered
    // with every part laid out, and none of them is rendered for a visitor,
    // because a visitor never enters this block at all. The counter comes back
    // on at the end so it still covers the run to `ready()`.
````

<a id="kit-input-80"></a>
## kit-input-80: demo/kit/input/index.html, inline script, line 1811

````js
    // On top of the page and out of the flow: it must be hit-testable, since
    // `document.elementFromPoint` is what decides which key a finger is on, and
    // a holder below the fold has no points to test.
    // 🔴 AND THEY MUST NOT OVERLAP EACH OTHER. The first version stacked them
    // all at `top: 0`, so the LAST one built was the one under every point and
    // three checks measured "no note was produced at all" about keyboards that
    // were working, with the width asserts passing either way because those
    // read geometry rather than hit-test it. `top` is an argument.
````

<a id="kit-input-81"></a>
## kit-input-81: demo/kit/input/index.html, inline script, line 1835

````js
    // ⚠️ LOW ON THE KEY, CLEAR OF THE BLACKS. A point at a white key's centre is
    // inside a raised black one near the top; every gesture below aims at the
    // bottom third, which is white and nothing else.
````

<a id="kit-input-82"></a>
## kit-input-82: demo/kit/input/index.html, inline script, line 1845

````js
    // ── the width, and the negative control that proves it is a FLOOR ───────
    // MEASURED before any of this: 24.77 px a key at 390 CSS px, then 74, now
    // 49 on instruction. The pair of arms matters more than either number: a
    // fixed width would pass the first and fail the second.
````

<a id="kit-input-83"></a>
## kit-input-83: demo/kit/input/index.html, inline script, line 1869

````js
      /* ⚠️ THE COUNTS COME OFF `QWERTY_CHROMATIC` RATHER THAN FROM TWO
         LITERALS, AND THAT IS WHY. This said `8 white and 5 black`, which was
         true for as long as the letter row was one octave and its top C; `l`
         was added on 2026-09-23 and the specimen grew a ninth white key, so a
         check about the SHAPE of a sharp went red over a number that has
         nothing to do with sharps. A count typed twice is a count that will
         disagree with the thing it counts. */
````

<a id="kit-input-84"></a>
## kit-input-84: demo/kit/input/index.html, inline script, line 1882

````js
      /**
       * 🔴 THE WHITE KEYS ARE LEFT EQUAL, WHICH IS WHAT THE OFFSETS ARE FOR AND
       * IS NOT WHAT THIS CHECK USED TO SAY. It asserted that every black key
       * CENTRES on the join, which was the defect: seven whites sharing five
       * blacks cannot both sit on their joins and leave the whites equal, and
       * centring made the narrowest strip 0.401 of a white against 0.551 with
       * the piano's offsets. The old check passed the whole time and could only
       * ever have failed if the offsets were added, which they now are, so it
       * went red at 7.33 px — exactly the intended shift.
       * ⚠️ MEASURE THE THING THE CHANGE IS FOR. The strip a finger has between
       * two black keys is the quantity; where a black key's centre sits is one
       * way of getting there and the wrong one to assert.
       */
````

<a id="kit-input-85"></a>
## kit-input-85: demo/kit/input/index.html, inline script, line 1902

````js
      /**
       * ⚠️ THE NARROWEST STRIP IS THE WHOLE CLAIM, and a spread across ALL eight
       * is not: the two outer keys have a black on one side only, so they are
       * wider by construction and always will be. The first version of this
       * check included them and reported a spread of 22 px about a layout that
       * was correct.
       * 🔴 AND THE FLOOR CAME DOWN FROM 0.5 TO 0.44 ON 2026-09-23, WHICH IS A
       * DELIBERATE TRADE AND NOT A WEAKENED CHECK. `keyboard.mjs` gained
       * `SHARP_NUDGE`, asked for as *"black keys should be centered to verical
       * line / white key gap"* and then *"or bit in between current and
       * ideal..."*, and it takes HALF the piano's offset so a black key sits
       * nearer the join a piano roll's rules point at. MEASURED at three
       * settings on `/nola/`: the narrowest strip is 16.51 px centred, 19.78 px
       * at half and 23.04 px at full, while the black key's centre sits 1.00,
       * 2.27 and 5.54 px off its join. It is one pixel of strip for one pixel
       * of alignment, almost exactly.
       * ⚠️ SO THE FLOOR IS SET WHERE IT STILL MEANS SOMETHING: 0.44 is
       * GarageBand's own ratio, and centring would read 0.401 and go red. The
       * check still refuses the arrangement it was written to refuse.
       */
````

<a id="kit-input-86"></a>
## kit-input-86: demo/kit/input/index.html, inline script, line 1929

````js
    // ── 🔴 THE OVERLAP, WHICH IS A HIT TEST AND NOT A PICTURE ──────────────
    // A raised black key covers the top corners of both whites beside it, so a
    // point up there is inside two keys at once and only paint order decides
    // which note a finger gets. The assert is here because that is an accident
    // of `z-index` that a future stacking context would undo silently, and the
    // symptom would be a keyboard that plays C when you aim at C sharp.
````

<a id="kit-input-87"></a>
## kit-input-87: demo/kit/input/index.html, inline script, line 1942

````js
      // 🔴 BOTH SIDES, AND THE RIGHT ONE IS THE HARD ONE. A sharp straddles two
      // whites, and the white on its RIGHT comes LATER in the DOM, so with
      // equal stacking that one paints over the sharp and takes the note.
      // MEASURED by setting `z-index: 0` on the sharps: a one-sided version of
      // this assert stayed green, because the left half is covered by DOM order
      // alone and only the right half needs the z-index at all.
````

<a id="kit-input-88"></a>
## kit-input-88: demo/kit/input/index.html, inline script, line 1958

````js
    // ── 🔴 A SWIPE SCROLLS AND PLAYS NOTHING; A PRESS PLAYS AND THEN SLIDES ─
    // The two halves are one assert because they are one rule: *"drag to play
    // happens when playing is there"*. Splitting them would let a keyboard that
    // plays nothing at all pass the first half.
````

<a id="kit-input-89"></a>
## kit-input-89: demo/kit/input/index.html, inline script, line 1966

````js
      // A swipe: lands and leaves before the verdict.
      // ⚠️ IT WAITS OUT THE VERDICT WINDOW BEFORE READING THE COUNT, or the
      // whole half is vacuous. MEASURED by disabling the distance test: with
      // the reading taken in the same tick the assert stayed green, because
      // nothing has sounded yet in EITHER case that early. What proves the
      // gesture was abandoned is that the verdict comes and goes in silence.
````

<a id="kit-input-90"></a>
## kit-input-90: demo/kit/input/index.html, inline script, line 1996

````js
    // ⚠️ AND A MOUSE NEVER WAITS. Nothing on a desktop can take a drag away, so
    // there is no verdict to wait for and the note is immediate. Without this
    // the frame-counted window could be applied to every pointer and only a
    // person with a mouse would notice.
````

<a id="kit-input-91"></a>
## kit-input-91: demo/kit/input/index.html, inline script, line 2012

````js
    // 🔴 AND `notes off` HAS TO REACH IT, BECAUSE IT IS THE WHOLE SAFETY STORY.
    // The finger is left DOWN across the press, which is the case that was
    // wrong first: the pointer kept its key and re-pressed it on the next move.
    // ⚠️ IT READS THE LIT KEY BEFORE PRESSING, OR IT PASSES VACUOUSLY: nothing
    // lit afterwards is also what a keyboard that never sounded reports, and
    // that is exactly the state overlapping holders once put it in.
````

<a id="kit-input-92"></a>
## kit-input-92: demo/kit/input/index.html, inline script, line 2038

````js
    /* 🔴 THE PIANO ROLL'S RULES RUN THE WHOLE PICTURE, INCLUDING PAST THE
       FIRST ROW. Five requests have been made about these lines and the fifth
       was *"rm gap in piano roll vert lines"*, 2026-09-25. MEASURED before the
       repair, cell bottom to the next cell's top all the way down a four row
       roll: 6.5, 0, 0, 0, 0, 0, 0. ONE gap, under the first row only, which is
       why four reports in a row could each look like the last one returning.
       🔴 AND THE FIRST ROW IS THE TALL ONE, WHICH IS THE WHOLE OF IT: it holds
       half a row back so the top dots are not crowded against the box, the room
       was meant to go inside the CELL, and the lane it sits in kept a flat
       height, so `height: 100%` resolved against the lane instead of the row.
       ⚠️ THE LABEL IS THE SECOND HALF AND NOBODY REPORTED IT. Measured in the
       same pass: the chord name in row 0 sat 6.5 px above the dots it names,
       and every other row was exact. */
````

<a id="kit-input-93"></a>
## kit-input-93: demo/kit/input/index.html, inline script, line 2076

````js
  /* 🔴 THE TWO TIMED CHAINS, AFTER `d.ready()`, BEHIND `?selfcheck=1`. In
     `/kit/` they ran before `ready` and held about 7.5 s of it; here they are
     graded the way HARDWARE and SLIDES were, each step asserting as it lands. */
````

<a id="kit-input-94"></a>
## kit-input-94: demo/kit/input/index.html, inline script, line 2095

````js
    // ⚠️ A BOX IN A CLOSED TAB HAS NO LAYOUT, SO ITS CORNER CANNOT BE MEASURED.
    // Opened at #hardware this read 0 px in and 0 tall and went red on a page
    // that was fine. The behaviour is still graded; the geometry says it was
    // not looked at rather than failing.
````

<a id="kit-input-95"></a>
## kit-input-95: demo/kit/input/index.html, inline script, line 2141

````js
    /* 🔴 THE KEYBOARD LOOPS WITHOUT THE PAGE KNOWING HOW, which is the claim the
       whole design rests on. Asked 2026-09-23: *"do not wire nola, its gloabl
       keyboard fn. nola gets just chords as if i played htem"*, after a first
       build put the tape on one page.
       ⚠️ GRADED THROUGH THE BUTTON AND THE KEYS, and on what the PAGE hears
       rather than on the component's own counter: what is promised is that a
       looped note is indistinguishable from a finger, so the check reads the
       callbacks this block already wires and looks for `how === 'loop'`. */
````

<a id="kit-input-96"></a>
## kit-input-96: demo/kit/input/index.html, inline script, line 2151

````js
      /* ⚠️ EVERY BLOCK BELOW STARTS FROM AN EMPTY SLOT, AND THAT IS A CHANGE
         RATHER THAN TIDINESS. A stopped take is KEPT now, because the machine
         these loops run on says *fourth plays again*, so stopping no longer
         throws the recording away and the next press is a PLAY rather than a new
         recording. The one way back to empty is the double press, which is what
         `clear` is. Three checks went red on exactly this and all three were
         reading a take the previous block had left behind. */
````

<a id="kit-input-97"></a>
## kit-input-97: demo/kit/input/index.html, inline script, line 2176

````js
      /* 🔴 AND A TAKE WITH ALMOST NOTHING IN IT DOES NOT RUN AWAY. This check
         presses four keys with no waiting between them, so the take is a few
         milliseconds long, and without a floor on the lap it turned 118 times in
         260 ms. That is not a loop, it is a stuck note with extra steps, and a
         person arming the button and pressing it again straight away produces
         exactly the same take. */
````

<a id="kit-input-98"></a>
## kit-input-98: demo/kit/input/index.html, inline script, line 2187

````js
      /* ⚠️ AND NOTHING PLAYED IS NOT A LOOP. The button comes back off rather
         than sitting on with an empty tape behind it, which is the state a
         reader cannot tell from a working one. */
````

<a id="kit-input-99"></a>
## kit-input-99: demo/kit/input/index.html, inline script, line 2197

````js
      /* 🔴 WAITING BEFORE YOU PLAY DOES NOT BUY YOU SILENCE AT THE FRONT OF THE
         LOOP. Reported as *"still no looping"* when every other check here was
         green: the clock used to start at the button, so a lead-in of a few
         seconds went into the take and the loop came round and did nothing until
         it had elapsed again.
         ⚠️ MEASURED AS TIME UNTIL THE NOTE COMES BACK, which is the quantity the
         report was about. Reading the first event's own timestamp would grade the
         bookkeeping; a player is complaining about a wait, so the check waits. */
````

<a id="kit-input-100"></a>
## kit-input-100: demo/kit/input/index.html, inline script, line 2226

````js
      /* 🔴 THE TAKE REACHES BACK FOR WHAT YOU ALREADY PLAYED. Asked 2026-09-23:
         *"when loop button lands bit later, do consider earlier played keys"*. A
         loop button always lands late, because playing the phrase and then
         deciding to keep it is how anybody plays, and without this the first
         chord of every take is the one you lose. */
````

<a id="kit-input-101"></a>
## kit-input-101: demo/kit/input/index.html, inline script, line 2239

````js
        /* ⚠️ AND IT DOES NOT REACH BACK FOR EVERYTHING EVER PLAYED, which would
           open every loop with whatever was lying around. */
````

<a id="kit-input-102"></a>
## kit-input-102: demo/kit/input/index.html, inline script, line 2253

````js
      /* 🔴 TEN TAKES, INDEPENDENT, AND THE SECOND ONE MUST NOT RECORD THE FIRST.
         Asked 2026-09-23: *"num works. how come you can not add it to keyboard"*.
         A number pad presses a slot and this is what a slot does.
         🔴 THE COMPOUNDING TRAP IS THE REASON THIS CHECK EXISTS. A note replayed
         by loop 1 reaches the page, which lights it, which is exactly where the
         tape listens, so without a guard loop 2 records loop 1 while it records
         you and the two grow into each other every lap. The old single loop
         tested its own `looping` flag, which is precisely the test that stops
         working the moment a second slot exists. */
````

<a id="kit-input-103"></a>
## kit-input-103: demo/kit/input/index.html, inline script, line 2290

````js
      /* 🔴 A LOOP KEEPS TIME, AND DRIFT IS A DIFFERENT FAULT FROM JITTER.
         Reported 2026-09-23: *"loops do not sound right (timings)"*. A round used
         to end with `setTimeout(round, lap)`, so the next round began whenever
         that timer fired, and that lateness became the ORIGIN for the round's own
         events. A timer is never early and is routinely a few ms late, so every
         lap inherited the drift of every lap before it and the phrase walked away
         from itself while each individual timer looked fine.
         ⚠️ THE CLAIM IS THAT THE ERROR DOES NOT GROW, NOT THAT IT IS ZERO. Timer
         accuracy has a floor no page gets under, and a check demanding zero would
         be measuring the machine's mood. What separates the bug from the floor is
         whether the last turn is further out than the first. */
````

<a id="kit-input-104"></a>
## kit-input-104: demo/kit/input/index.html, inline script, line 2314

````js
        /* 🔴 THE TEST IS GROWTH, NOT MAGNITUDE, AND THE FIRST VERSION OF THIS
           CHECK GOT THAT WRONG AND STAYED GREEN UNDER SABOTAGE. Chained
           scheduling put back on purpose produced 0, 1, 3, 7, 8 ms against the
           anchored 0, 2, 2, 1, 1, and a threshold on the LARGEST error passed
           both. Drift is small early by construction: it is the slope that says
           the laps are inheriting each other, so the halves are compared.
           🔴 AND THIS CHECK IS COARSE, WHICH IS MEASURED RATHER THAN SUSPECTED.
           The SAME sabotage run twice gave 8 ms of growth over five turns and
           then 1.5 ms, because how late a timer fires depends on what else the
           machine is doing. 1.5 passes. So this catches GROSS drift and cannot
           be read as proof that the scheduling is anchored; separating them
           properly needs about twenty turns, which is five seconds, and
           `verify.mjs` stops growing about two seconds after the last new assert.
           ⚠️ THE REAL INSTRUMENT IS `demo/resources/read-loop-take.mjs`, on a
           take recorded through `/nola/?rec=1` while a loop is turning. It reads
           as many turns as somebody cares to play and separates drift from jitter
           with the halves of a long run rather than of four intervals. */
````

<a id="kit-input-105"></a>
## kit-input-105: demo/kit/input/index.html, inline script, line 2341

````js
      /* 🔴 THE FOOTER ROW READS `Loop`, `Sustain`, `Panic`, AND THE CLAIM IS
         THE GAP AS MUCH AS THE ORDER. Settled 2026-09-23 as *"buttons: Loop
         Sustain Panic"* after two reports that read as position and were
         about spacing: *"move loop button to right"*, then *"loop is leftmost of
         3 in riht"*. A flex line hands its free space to every `margin-left:
         auto` on it EQUALLY, so the rule that pushed one toggle right spread two
         of them across the row and `Loop` sat out on its own.
         ⚠️ AN ORDER-ONLY CHECK WOULD HAVE STAYED GREEN THROUGH ALL OF IT, which
         is why this measures the distance between neighbours as well. The append
         order says what the author meant and the computed left edge says what
         happened, and those two came apart the moment the row carried a third
         control. */
````

<a id="kit-input-106"></a>
## kit-input-106: demo/kit/input/index.html, inline script, line 2353

````js
      /* 🔴 A NOTE PLAYED PAST THE KEYS IS STILL LOOPED, AND THIS IS THE CHECK
         THE FIRST BUILD NEEDED. Reported 2026-09-23: *"can not hear looping"*.
         The tape sat on `press`/`release`, which is every note the COMPONENT
         produces and no note a MIDI keyboard sends: `/nola/` takes `midiDown`
         straight to its own `press`, so a take played on the controller recorded
         nothing and a loop with nothing in it was correctly silent. Playing the
         same notes on screen worked, which is what made it look like a loop bug
         rather than a routing one.
         ⚠️ SO THE CHECK PLAYS THE NOTE THE WAY MIDI DOES: `lightNote` and
         nothing else, never touching a key. That is exactly what every page here
         does with a note that did not come from these keys. */
````

<a id="kit-input-107"></a>
## kit-input-107: demo/kit/input/index.html, inline script, line 2380

````js
        /* ⚠️ AND A SUGGESTION IS NOT A PERFORMANCE. The same call with a lamp
           name is a hint or a proposal drawn on the keys, and looping those would
           record something nobody played. */
````

<a id="kit-input-108"></a>
## kit-input-108: demo/kit/input/index.html, inline script, line 2395

````js
      /* 🔴 THE FIRST LOOP SETS THE UNIT AND EVERY LATER ONE IS AN INTEGER RATIO
         OF IT. Asked 2026-09-25: *"in keyboadd looper: do basic bmp detection /
         quant and when first loop set, all next ones align on it, either times
         shorter, same or longer"*. The arithmetic is `numloop.mjs`'s and is
         graded with no browser at 36 ok; what only a browser can say is whether
         this keyboard USES it, and that is what these four blocks are.
         🔴 AND THE ASSERT ASKS WHAT HAS HAPPENED, COUNTED, WHICH IS THE TRAP
         ALREADY WRITTEN DOWN ON THE PAGE NEXT DOOR. `/loops/` shipped a page
         whose whole subject was looping, quietly not looping, because its check
         tolerated *not reached yet* and passed vacuously every run. So the
         load-bearing claim here is not `lap === unit / 2`, which is a number
         this page would be reading back from the module that wrote it. It is
         that the second loop WRAPPED, three times, at the aligned lap and not
         at the length it was played at, counted off the notes the PAGE heard
         come back.
         🔴 EVERY WAIT IN HERE IS SPENT AGAINST A BUDGET, AND THE BUDGET IS THE
         HARNESS'S BOOT WAIT RATHER THAN ANY RULE ABOUT TASTE. `/kit/` calls
         `d.ready()` at the foot of this block, and `demo/verify.mjs` waits
         1400 ms plus forty polls of 150 ms for that flag before it declares the
         page dead and skips every assert on it. MEASURED 2026-09-26: this page
         becomes ready about 5.9 s after navigation, so there is roughly two
         seconds of room in the whole file and a first draft of this block spent
         2.7 s of it and took `/kit/` fully red at 207 asserts, with the harness
         reporting *console: nothing, so it is hanging rather than throwing*.
         ⚠️ SO THE DETECTION IS GRADED BY ITS INPUT RATHER THAN BY ITS OUTPUT.
         A tempo `numloop.mjs` will speak about has to sit in 80 to 160 a
         minute, which is three gaps of at least 375 ms, which is 1.2 s of
         waiting before anything can be asserted. What a browser adds over
         `numloop-test.mjs` is not the arithmetic, it is whether this file hands
         the module the right list, and that is a stronger claim measured
         cheaply: four notes have to arrive as FOUR onsets and not as the eight
         movements a tape holds, and still produce no tempo.
         🔴 AND THE NOTES ARE HELD RATHER THAN STRUCK, WHICH IS THE WHOLE
         REASON THIS CHECK CAN TELL THE TWO LISTS APART. MEASURED 2026-09-26:
         with the notes struck and released in the same millisecond, feeding
         EVERY movement in instead of the key-downs still answers four onsets,
         because `numloop.mjs` collapses anything inside 50 ms into one chord and
         a down and its own up were 0 ms apart. The sabotage came back fully
         green and the check was decoration. Holding each note 70 ms puts every
         movement clear of that window, so the wrong list answers EIGHT.
         ⚠️ NOTES PLAYED PAST THE KEYS, THE WAY MIDI ARRIVES, so the two takes
         can be told apart by note number while both are running. The block
         above proves that path is taped and comes back. */
````

<a id="kit-input-109"></a>
## kit-input-109: demo/kit/input/index.html, inline script, line 2439

````js
        /* ⚠️ ITS OWN, BECAUSE THE ONE AT THE HEAD OF THE SELF-CHECK IS IN A
           DIFFERENT BLOCK AND `nap` IS NOT DEFINED HERE. MEASURED 2026-09-26 by
           borrowing it: `ReferenceError: nap is not defined`, which killed every
           check after this point, left `d.ready()` uncalled and took the whole
           page red with the harness reporting nothing but a count. */
````

<a id="kit-input-110"></a>
## kit-input-110: demo/kit/input/index.html, inline script, line 2450

````js
        /* ⚠️ 70 ms AND NOT 50, WHICH IS THE THRESHOLD ITSELF. `numloop.mjs`
           merges onsets 50 ms apart or closer into one chord, and a timer asked
           for 50 fires at 48 as readily as at 53, so a check written at the
           boundary would count four onsets on one run and three on the next. 70
           clears it by more than any timer here has ever been out. */
````

<a id="kit-input-111"></a>
## kit-input-111: demo/kit/input/index.html, inline script, line 2482

````js
        /* 🔴 A TAKE AT 0.59 OF THE UNIT, WHICH IS DELIBERATELY NOT A RATIO OF
           IT. The nearest allowed ratio is a half and the snap moves it by about
           17 per cent, well inside the 30 per cent `numloop.mjs` will stretch a
           performance, so this is the case the feature exists for rather than
           the refusal beside it. */
````

<a id="kit-input-112"></a>
## kit-input-112: demo/kit/input/index.html, inline script, line 2503

````js
        /* 🔴 AND NOW THE PART THAT IS NOT ARITHMETIC: DID IT WRAP THERE. Counted
           off what the page HEARD, over a window long enough for three turns,
           while the first loop is still running.
           ⚠️ THE TOLERANCE IS DERIVED FROM THE TWO CANDIDATES RATHER THAN TYPED.
           A fixed window could be wide enough to contain both the aligned lap
           and the played one, which is a check that cannot tell them apart and
           would pass with the alignment ripped out. Half the distance between
           them can only ever match one, and the guard refuses to conclude
           anything at all if they are too close together to separate. */
````

<a id="kit-input-113"></a>
## kit-input-113: demo/kit/input/index.html, inline script, line 2526

````js
        /* 🔴 AND THE ABSENCES, WHICH ARE THE HALF A CELL IS EASIEST TO GET WRONG
           ON, PLUS THE ONE WORD THE BLOCKS ABOVE CANNOT REACH. Clearing every
           slot must empty both cells; a page that states the tempo must read
           `set` rather than `heard`, because a number a page knows and a number
           inferred off somebody's playing are different claims and only one of
           them may be drawn as a fact.
           ⚠️ AND IT PUTS THE KEYBOARD BACK. A stated tempo survives every slot
           being cleared, by design, so without the release this block would
           change the specimen for every reader after it. */
````

<a id="kit-input-114"></a>
## kit-input-114: demo/kit/input/index.html, inline script, line 2557

````js
      /* ⚠️ FOUND BY ITS WORD AND NEVER BY A POSITION CLASS. This read
         `.kpad-right`, which marked whichever control STARTED the right hand
         group, so it moved onto `Sustain` when the row was reordered and this
         check quietly began measuring the same element twice: left edges 444
         and 444, red for the right reason with the wrong story. A check that
         names a control has to name the control.
         ⚠️ AND THE CLASS IS OFF THIS ROW ENTIRELY SINCE 2026-09-28, when the pad
         became two ends in two boxes, so the same lesson now reads as a reason
         this check needed no change at all. `Loop` can leave the row and come
         back under `offerLoop` and these three still find themselves. */
````

<a id="kit-input-115"></a>
## kit-input-115: demo/kit/input/index.html, inline script, line 2578

````js
      /**
       * 🔴 THE `Loop` CONTROL CAN BE WITHDRAWN AND GIVEN BACK WHILE THE PAGE IS
       * OPEN, AND A SOUNDING LOOP IS STOPPED AND KEPT. Asked 2026-09-28 as *"rm
       * loop button when evolution keyboad is not connected"*, and a cable is
       * not a fact that holds still: the control has to be able to leave and to
       * come back. `/nola/` is the page that decides WHEN, off the MIDI port
       * names; this grades WHAT HAPPENS, which is the component's half and
       * belongs where the component is demonstrated.
       * 🔴 THE HARD PART IS THE RUNNING LOOP, AND THE TWO OBVIOUS ANSWERS ARE
       * BOTH WRONG. Leaving it going strands a phrase with nothing that can
       * reach it, because this control is the only way to stop one and `Panic`
       * stops notes rather than loops. Clearing it throws away something
       * somebody played. So the slot is walked to `stopped`, which keeps its
       * tape, and the take is still there when the control comes back.
       * ⚠️ FOUR CLAIMS AND ONE ASSERT ONLY BECAUSE THEY ARE ONE TRANSACTION:
       * it left the row, the loop stopped, the take survived, and it came back
       * at the head of the group rather than after `Sustain`. The detail line
       * prints all four so a failure says which.
       */
````

<a id="kit-input-116"></a>
## kit-input-116: demo/kit/input/index.html, inline script, line 2598

````js
        /* ⚠️ ITS OWN `wait`. The one above is declared inside the tempo block
           and a `const` shadows its whole block from the top, which this page
           has already paid for once: the first run of this check threw
           `wait is not defined`, the page died on `__demo.ready` at 230 asserts
           and the harness named itself rather than the line. */
````

<a id="kit-input-117"></a>
## kit-input-117: demo/kit/input/index.html, inline script, line 2605

````js
        /* ⚠️ `.kpad-grp-start`, NEVER `.kpad-grp`. Both ends wear that class, so
           a check reading the bare one is reading whichever comes first in
           document order, which is a fact about the builder's append order
           rather than about the row. This page has already gone red once for
           reading the same element twice under `.kpad-right`. */
````

<a id="kit-input-118"></a>
## kit-input-118: demo/kit/input/index.html, inline script, line 2637

````js
        /**
         * 🔴 AND THE TWO READOUT CELLS GO WITH IT, WHICH IS A SEPARATE CLAIM
         * AND THEREFORE A SEPARATE ASSERT. `positron-ui` records three
         * alignments that looked like one being three asserts, and this is the
         * same shape: the button leaving is about a control, and `kpad-tempo`
         * and `kpad-ratio` leaving is about a RESERVE. They can only ever say
         * something about a loop, so with no control to start one they are a
         * reserved slot outliving its label, which cost `/circuit/` 75 px of
         * drift down a five row column.
         * ⚠️ AND IT IS THE ROW'S MEASURED WIDTH RATHER THAN THE COUNT ALONE,
         * because those cells are EMPTY most of the time: a count going to zero
         * would also be satisfied by two cells that had never reserved anything,
         * and the whole point of them is the room they hold. MEASURED on
         * `/nola/` at 375 px, where this decides whether the row fits: 86.1 px
         * and 59.6 px plus two 8 px gaps, and the row goes from needing 523.4 px
         * in a 323 px box to 304.4 px, which is one line.
         */
````

<a id="kit-input-119"></a>
## kit-input-119: demo/kit/input/index.html, inline script, line 2662

````js
      /**
       * 🔴 THE CHORD NAME SAYS WHAT IS HELD AND MOVES NOTHING WHILE IT DOES.
       * Asked 2026-09-25: *"add chord name to the footer, right from the
       * transpose message. avoind text moving in x axis"*, and the second
       * sentence is the half a check can settle. The two chords driven here are
       * the shortest and the longest name this cell can produce, `C5` at two
       * characters and a half diminished seventh at eight, and the point is
       * that the box is the same either way.
       * ⚠️ IT MEASURES THE RECTS OF THE CELL AND OF THE ROW AROUND IT, not the
       * string. A cell that says the right thing and shoves its neighbours is
       * exactly what was asked against, and only a rect can tell them apart.
       * ⚠️ AND THE NAME IS READ TOO, or this passes on a cell that never says
       * anything at all, which is a box of reserved air and the thing this
       * project calls a green check with no coverage.
       */
````

<a id="kit-input-120"></a>
## kit-input-120: demo/kit/input/index.html, inline script, line 2679

````js
        /* ⚠️ `.kpad-names` WAS IN THIS LIST AND LEFT WITH THE `N | D` PAIR ON
           2026-09-28. It is a SPREAD rather than a `querySelector`, so losing it
           quietly narrowed what this assert watches instead of throwing, which
           is the shape worth naming: the same removal DID throw on `/nola/`,
           where the selector was singular. The octave pair is the row's first
           control now and is what the left edges are read off. */
````
