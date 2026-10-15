# Page comments: kit-devices

The full comments cut from the code under demo/ for kit-devices, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="kit-devices-1"></a>
## kit-devices-1: demo/kit/devices/index.html, inline script, line 41

````js
  /**
   * 🔴 kit/devices, ONE PART OF `/kit/` ON A PAGE OF ITS OWN, 2026-10-06
   * (plans/plan-kit-split.md). Every block, holder and check below is copied
   * VERBATIM from `demo/kit/index.html`, in that file's order, so the newest
   * block is still the first. What changed is mechanical: `section()` lost its
   * first argument, the holders sit here rather than at the top of the
   * monolith, the measuring window and the tab row are gone, and every check
   * is behind `?selfcheck=1`.
   */
````

<a id="kit-devices-2"></a>
## kit-devices-2: demo/kit/devices/index.html, inline script, line 55

````js
  /* 🔴 `knobSpec`, `halfSpec`, `roundSpec` AND `fadeSpec` WENT WITH THE CHANNEL
     STRIP REBUILD ON 2026-09-22, AND NOTHING WAS READING THEM. MEASURED before
     deleting them: all four were assigned in that block and appeared in no
     assert on this page, so they were four holders of dead state. `padSpec` is
     still read by the PAD block. `chanSpec` replaces all of them and IS read. */
````

<a id="kit-devices-3"></a>
## kit-devices-3: demo/kit/devices/index.html, inline script, line 61

````js
  // The segment displays, by what each one is showing, so the checks at the
  // foot of this file can measure them against each other rather than against
  // a number typed into a check. ⚠️ DECLARED UP HERE WITH EVERY OTHER HOLDER,
  // for the reason the lines above give: this is the newest block and therefore
  // the topmost one, and a `let` left where a block used to be is read in its
  // dead zone, swallowed by `section()` into `failed`, and reported much later
  // with a message about a different line.
  // The strip's parts, broken out of the assembled specimen so the contract
  // between them can be measured. ⚠️ DECLARED UP HERE WITH EVERY OTHER HOLDER,
  // for the reason the lines above give.
````

<a id="kit-devices-4"></a>
## kit-devices-4: demo/kit/devices/index.html, inline script, line 77

````js
  // 🔴 HELD ON ITS OWN AND DELIBERATELY NOT IN `dispSpec`. That map is the six
  // fields the width check compares against each other, and the check is
  // guarded on `dispSpec.size === 6` — so putting a seventh in it would have
  // taken SEVEN asserts silent rather than failing one. A block whose specimens
  // all live in one bag is a block where adding a specimen is a coverage cut.
````

<a id="kit-devices-5"></a>
## kit-devices-5: demo/kit/devices/index.html, inline script, line 88

````js
  /**
   * 🔴 NEWEST AT THE TOP, AND THE HEADING IS UPPERCASE. A segment display, as
   * of 2026-09-21, asked for as *"do we have lcd font (made of parts/lines)?
   * its 3 digits"*. There was none: this page had 25 sections and not one of
   * them was a display.
   *
   * ⚠️ SIX FIELDS OF THE SAME SIZE, EACH SHOWING SOMETHING DIFFERENT, because
   * the claims worth grading here are COMPARISONS: that a field is the same
   * width holding `1` and `8`, that nothing measured is blank rather than
   * `000`, and that a value too wide shows dashes rather than its low digits.
   * One field driven through six values would have proved the same things and
   * left whatever the last check set in front of a reader, which is the
   * mutation this project already paid for on `/tapes/`.
   * ⚠️ AND NOTHING HERE IS IN A `.pos-controls` ROW, for the reason the two
   * blocks below give: both harnesses press that row by position, so a new top
   * block with a control in it moves every other block's press. A display is a
   * picture and has no control to add.
   */
````

<a id="kit-devices-6"></a>
## kit-devices-6: demo/kit/devices/index.html, inline script, line 106

````js
  /**
   * 🔴 NEWEST AT THE TOP, AND THE HEADING IS UPPERCASE. A hardware panel, as of
   * 2026-09-21, asked for as *"generalize the evoltion layout to reusable
   * components / use from others. same patters"* and then *"do it and add to
   * kit"*. It had been hand-rolled THREE times: `/twelve/` called the parts
   * `.rack-wrap` and `.rack-row`, `/circuit/` called them `.circ-panel` and
   * `.circ-scroll`, and `/evo/` called them `.pan-wrap` and `.pan-strip` after
   * having called them `.evo-wrap` and `.evo-strip`.
   *
   * 🔴 **TWO PANELS IN ONE BOX, AND THE SECOND ONE IS THE NEGATIVE CONTROL.**
   * The thing this component is FOR is that the fixed column drives the depth
   * and one child of the flow absorbs the slack, and a specimen that only ever
   * shows the working arrangement proves nothing: a panel that looked right
   * whatever it was given would pass *the absorber absorbed*. So the second
   * panel is the same panel with the class left off, which is the sabotage that
   * produced the 310.03 px measurement on `/evo/`, made permanent as a picture.
   *
   * 🔴 **AND THERE IS NO KEYBOARD IN IT, WHICH IS A REAL COST AND IS SAID OUT
   * LOUD IN THE NOTE.** A keyboard is the honest demonstration of the slack: it
   * is the only caller that has one, and it is where the 15:1 scale mismatch
   * between a real key and a real keypad button lives. It is still the wrong
   * thing to put here. This page already has a KEYBOARD block in the `input`
   * part, and a panel with a two octave keyboard in it MEASURED 1018 px wide on
   * `/evo/` against the 688 px column this page gets, so the specimen would be
   * a scroller inside a scroller and the thing being shown would be lost in the
   * thing showing it. A dashed block absorbing the slack shows the MECHANISM
   * and not the instrument, which is what a sandbox is for.
   *
   * ⚠️ **NO `await` ANYWHERE IN THIS BLOCK.** The measuring window holds none on
   * purpose, because JavaScript here is single threaded and no frame can be
   * rendered between `measure()` and `settle()`, which is what makes an ungated
   * window safe for somebody reading the page. Every call this block needs
   * (`createPanelLayout`, `createNameplate`, `createKnob`, `createPad`,
   * `createFader`, `createPadGrid`) is synchronous, and `paintedOpen` grades it.
   * ⚠️ **AND NOTHING HERE IS IN A `.pos-controls` ROW.** Both harnesses press
   * that row by position, so a new top block with a control in it moves every
   * other block's press: MEASURED once on `/archive/radio/` as a single press moving
   * from t+1 s to t+31 s. A panel is a layout and has no control to add.
   */
````

<a id="kit-devices-7"></a>
## kit-devices-7: demo/kit/devices/index.html, inline script, line 145

````js
  // 🔴 THE SIX NEWEST BLOCKS' SPECIMENS, DECLARED UP HERE WITH EVERY OTHER
  // HOLDER. Same reason the eight comments above give and this page has now
  // written down four times: these are the topmost blocks, and a `let` left
  // where a block used to be is read in its dead zone, swallowed by `section()`
  // into `failed`, and reported much later with a message about a different
  // line.
  // ⚠️ `gridSpec`, NOT `padSpec`. The PAD block already holds a `padSpec` and a
  // second one would shadow nothing and collide with everything, which is the
  // kind of half-collision that reads as correct until somebody moves a line.
````

<a id="kit-devices-8"></a>
## kit-devices-8: demo/kit/devices/index.html, inline script, line 165

````js
  // ⚠️ DECLARED HERE WITH THE REST, NOT BESIDE THEIR BLOCKS, for the reason the
  // eight comments above give: these two are the newest blocks and therefore the
  // topmost ones, and a block that moved on this page once left its `const`
  // behind, the build read it in its dead zone, `section()` swallowed the throw,
  // and the page died much later on an empty map.
````

<a id="kit-devices-9"></a>
## kit-devices-9: demo/kit/devices/index.html, inline script, line 173

````js
  /**
   * 🔴 NEWEST AT THE TOP, AND THE HEADING IS UPPERCASE. A pad grid, as of
   * 2026-09-22, asked for as *"use a standard pad grid component from tom, make
   * it universal and add to kit"*.
   *
   * 🔴 IT IS A LIFT OUT OF `/tom/` AND THE SECOND COPY IS WHY. `/pack/` grew a
   * 16 by 6 grid the day after `/tom/`'s 16 by 64 shipped, which is
   * `positron-ui`'s own words for a component that has not been noticed yet.
   *
   * 🔴 **TWO GRIDS SIDE BY SIDE, AND THE SECOND ONE IS THE STATE THAT IS EASY
   * TO GET WRONG.** One is editable with a label column, which is `/tom/`; one
   * is READ ONLY with a corner cell, which is `/pack/`. A grid nobody may edit
   * must not look pressable, and `disabled` would be the wrong answer: it says
   * *this is switched off* about a picture that is perfectly current. Its pads
   * are not buttons at all, so they take no tab stop, do not lift under a
   * pointer and draw no focus ring, and all three are asserted at the foot of
   * this file.
   *
   * 🔴 **AND THE THIRD ONE IS A PHONE, WHICH IS WHERE THE MEASURED PAD EARNS
   * ITS KEEP.** The pad size cannot be done in CSS alone, because the label
   * column and the steps are separate flex children and nothing in the browser
   * relates a pad's height to a label row's. At 320 px the floor takes over and
   * the STRIP scrolls rather than the page, which is a pair of properties this
   * repository has measured 141 px of page overflow from being half written.
   *
   * 🔴 **THE PLAY BUTTON NAMES WHOSE TEMPO IT IS RUNNING AT, AND THE COMPONENT
   * REFUSES TO RUN WITHOUT ONE.** Asked for as *"just add std play / stop of
   * the grid pad, no prev next"*, which overrides a decision made the day
   * before on a measurement: `/pack/` has no play button because NOTHING IN A
   * CIRCUIT SESSION NAMES A TEMPO. So `rate` takes a `whose` and
   * `createStepGrid` throws without it, and the read only grid here is given no
   * rate at all, which is exactly `/pack/`'s case.
   * ⚠️ **THE BUTTON IS IN THE BOX AND NOT IN A `.pos-controls` ROW**, for the
   * reason every block below gives: both harnesses press that row by position,
   * so a new top block with a control in it moves every other block's press.
   * MEASURED once on `/archive/radio/` as a single press moving from t+1 s to t+31 s.
   */
````

<a id="kit-devices-10"></a>
## kit-devices-10: demo/kit/devices/index.html, inline script, line 210

````js
  /**
   * 🔴 ONE GRID AND THE STANDARD TRANSPORT OVER IT, SINCE 2026-09-22. Reported
   * with a screenshot of three grids and a loose `Play` button, as *"use std
   * transport glued on top, rm other examples"*.
   * 🔴 THE `Play` BUTTON WAS HAND ROLLED, ON THE ONE PAGE WHOSE JOB IS TO CATCH
   * THAT. `createTransportBar` is what thirty pages use and the block below it
   * demonstrates twice. A page building its own play button beside a component
   * that already has a clock is the exact defect `positron-ui` exists to stop,
   * and it was sitting in the kit.
   * ⚠️ THE BAR IS ABOVE THE GRID, WHICH IS WHERE EVERY OTHER PAGE PUTS IT.
   * `/replay/`, `/reel/`, `/stage/` and `/held/` all glue the bar over the
   * thing it drives, and `/pack/` will do the same with this component.
   * 🔴 AND TWO EXAMPLES WENT WITH IT, SO SAY WHAT STOPPED BEING GRADED HERE.
   * The read only shape and the 320 px scroller were separate grids in this
   * block, each with its own assert. What survives without a browser is in
   * `demo/shell/step-grid-test.mjs`: the read only branch is read off the
   * SOURCE there, and the pad floor arithmetic at a phone's width is asserted
   * against 64 steps at 360 px. **What is gone is the computed half**, the
   * cursor, the opacity and the rendered tab stops, and no check makes those
   * claims any more.
   */
````

<a id="kit-devices-11"></a>
## kit-devices-11: demo/kit/devices/index.html, inline script, line 231

````js
  /**
   * 🔴 THE NEWEST BLOCK, AND IT IS FIRST IN THE FILE FOR THE REASON THIS PAGE
   * ALREADY ASSERTS ONE ROW DOWN: *"in kit move online stuff to topmost item
   * (all new should land top, make rule)"*. What a reader does not know about
   * is what arrived since they last looked.
   *
   * 🔴 TWO SPECIMENS, AND THE SECOND IS NOT A REPEAT. A seam reaches the case's
   * inner edges the same way on every panel, but only a case with a SIDE PLATE
   * is a grid, and only on a grid does it have a rail to cross and a row count
   * to be placed by. One of each is the smallest pair that can show both, and
   * the asserts at the foot of this file measure the two against their OWN
   * cases rather than against each other.
   * ⚠️ THE BAND UNDER THE SEAM IS A DASHED BLOCK RATHER THAN A CONTROL, because
   * what these two show is where a rule lands and not what a band holds. The
   * PANEL block further down already shows a case full of real controls.
   */
````

<a id="kit-devices-12"></a>
## kit-devices-12: demo/kit/devices/index.html, inline script, line 249

````js
  /**
   * 🔴 THE NEWEST BLOCK, AND THEREFORE THE FIRST CALL TO `section()`. A knob
   * turned from somewhere else, 2026-10-13, asked as *"make all concept knobs
   * \"invisible-handed\" start from remote 010"*. `knob.receive(v, { from })`
   * glides the dial to a value that arrived from outside (the instrument's own
   * knob, a MIDI controller, a patch, another tab), lights it for a moment and
   * calls nothing, so it is never sent back. A drag still sends.
   * ⚠️ THE STAND-IN HAND IS A TIMER AND OPENS NOTHING: every 2.2 s one of the
   * four knobs receives a value, cycling through the four sources, so the
   * glide and the mark can be seen without any instrument. It stops while the
   * page is hidden. Not in a `.pos-controls` row, for the reason every block
   * below gives.
   */
````

<a id="kit-devices-13"></a>
## kit-devices-13: demo/kit/devices/index.html, inline script, line 290

````js
  /**
   * 🔴 ONCE THE NEWEST BLOCK, NOW SECOND. The
   * scope's TRIGGERED mode, 2026-10-12, asked on `/drums/knobs/` as
   * *"scopes are very "nervous""* and then *"is ti a scope feature/prop?"*.
   * A hit's window is captured from its onset and held until the next hit, the
   * one before it faint underneath. Free running stays the default.
   * ⚠️ NOTHING OPENS ON A VISIT: the Hit button makes the AudioContext and one
   * 60 ms burst. It is in the box and not in a `.pos-controls` row, for the
   * reason every block below gives: both harnesses press that row by position.
   */
````

<a id="kit-devices-14"></a>
## kit-devices-14: demo/kit/devices/index.html, inline script, line 332

2026-10-15: this block is DRUM GRID now, the step grid with no label column and
each row's name on its pads' hover, since the drum grids dropped the column on
the owner's ask (lessons/kit-step-grid.md#no-column). Its code comment and
specimen were, verbatim:

````js
  /**
   * A step grid with rows named in words: createStepGrid, with its label column as wide
   * as its widest name (.pos-pg-labs) and 22 px as the floor, so STEP GRID still
   * measures 22 px. No control in a .pos-controls row.
   * See lessons/page-kit-devices.md#kit-devices-14
   */
  section('STEP GRID WITH NAMED ROWS',
    'The same step grid with its rows named in words, the label column as wide as the widest name.',
    `createStepGrid({ fixed, strip, rows: 4, steps: 16,
  label: (r) => ['kick', 'snare', 'open hat', 'closed hat'][r],
  ticks: true })`,
````

````js
  /**
   * 🔴 ONCE THE NEWEST BLOCK, NOW SECOND. A step
   * grid whose rows are named in WORDS, 2026-10-12, for `/drums/machine/`:
   * *"make a 16 x 4 grid pad componetn (global one)"*. It is `createStepGrid`,
   * not a second grid; what changed is that its label column is as wide as its
   * widest name (`shell.css`, `.pos-pg-labs`), with the old 22 px as the floor,
   * so the numbered grid in STEP GRID below still measures 22 px.
   * ⚠️ NOTHING HERE IS IN A `.pos-controls` ROW, for the reason every block
   * below gives: both harnesses press that row by position.
   */
````

<a id="kit-devices-15"></a>
## kit-devices-15: demo/kit/devices/index.html, inline script, line 361

````js
  /**
   * 🔴 ONCE THE NEWEST BLOCK, NOW SECOND. A knob
   * grid, 2026-10-10, asked as *"Knobs: each has its own wrapper box, in a
   * grid, already reserve room for it. A kit component. In 40 41"*.
   *
   * 🔴 TWO OF THE SIX ARE SWITCHED OFF, BECAUSE THAT IS THE STATE THE
   * COMPONENT EXISTS FOR. A grid showing six live knobs proves nothing about
   * the slot an off knob keeps.
   * 🔴 AND THE SAME SIX IN THE KIT'S 320 px FRAME, which is how this page
   * grades a phone at desk width: the frame is narrower than any phone, so the
   * columns the browser derives there are fewer than at full width, and a grid
   * with a fixed column count would spill out of the frame instead.
   * ⚠️ NOTHING HERE IS IN A `.pos-controls` ROW, for the reason every block
   * below gives: both harnesses press that row by position.
   */
````

<a id="kit-devices-16"></a>
## kit-devices-16: demo/kit/devices/index.html, inline script, line 402

````js
  /**
   * 🔴 THE NEWEST BLOCK ON THIS PAGE, AND THEREFORE THE FIRST CALL TO
   * `section()`. Asked for 2026-09-26 with a sketch: *"do a instrument panel
   * coponent properly in kit. its our glued style"*, *"add several examples to
   * kit"*, *"make separate tab panels for it in kit"*.
   *
   * 🔴 **AND `/kit/` HAS HAD A GLUE BLOCK BEFORE. IT WAS DELETED ON
   * INSTRUCTION, 2026-09-18:** *"i see no poiint in glue, it looks off and
   * pointless in docs. just glue the 4 we have properly"*. It went with its two
   * grey specimen boxes reading `a block` and `and another`. The recorded reason
   * is the one that governs every specimen below: **it demonstrated the
   * mechanism and none of the reason for it, which is what made it read as
   * furniture.** So there are no grey boxes here. Every panel is an instrument
   * somebody could operate, with the kit's own controls in it, and the four of
   * them differ in SHAPE rather than in contents.
   *
   * ⚠️ FOUR SPECIMENS, IN THEIR OWN TABS, WHICH IS WHAT WAS ASKED FOR. Four
   * full panels stacked in one block is a scroll nobody reaches the bottom of,
   * which is the argument that put this whole page behind tabs in the first
   * place. `hash: false` on this row, for the reason the TABS block gives: a
   * sandbox that writes `#sketch` while a reader scrolls past it is one
   * component reaching outside its own box.
   */
````

<a id="kit-devices-17"></a>
## kit-devices-17: demo/kit/devices/index.html, inline script, line 453

````js
        /* 🔴 `kb.el` AND NOT THE HOST IT WAS BUILT IN. `createKeyboard` appends
           into a parent, so handing the parent over puts the keyboard THREE
           levels under the surface, and `.pos-glue > * > .kbd` reaches two.
           MEASURED before this line changed: 4 px of border still on the keys
           and 10 px of their own bottom margin under them. */
````

<a id="kit-devices-18"></a>
## kit-devices-18: demo/kit/devices/index.html, inline script, line 461

````js
      /* ⚠️ `redraw()` BECAUSE A MEASURING WINDOW HOLDS NO FRAME. The component
         resizes on an observation, which is a frame away, and this page lays
         every closed panel out synchronously and reads the pixels on the same
         line. `synth-view.mjs` publishes this call for exactly this caller. */
````

<a id="kit-devices-19"></a>
## kit-devices-19: demo/kit/devices/index.html, inline script, line 473

````js
      /* 3. PADS WHERE THE KEYS GO. The keyboard row is a row like any other.
            ⚠️ `start`, because two knobs centred over sixteen pads is a band of
            empty surface with something in the middle of it; a drum box puts
            its tempo at one end. */
````

<a id="kit-devices-20"></a>
## kit-devices-20: demo/kit/devices/index.html, inline script, line 494

````js
      /* 🔴 FOUR BLOCKS OF THE PAGE, NOT FOUR THINGS IN A BOX. Asked as *"let the
         panels be the panels just extending to the layout"*. No caption under
         each, because the four differ in shape and the eye can see that; a
         caption saying so would be the information footer that was asked out. */
````

<a id="kit-devices-21"></a>
## kit-devices-21: demo/kit/devices/index.html, inline script, line 498

````js
      /* 5. A SWITCH AND A PICKER ON THE FOOT. The plate's ends are controls: the
            name and its power switch at the start, the patch picker at the end,
            which is what /fau/, /muta/, /knobs/ and /shape/ put on a foot bar.
            The keyboard is what gives `between` a width to spread across.
            🔴 THE PICKER HAS NO LABEL AND IS THE END, WHICH IS THE PANEL'S RULE
            SINCE 2026-09-26 (*"patch selector have no label and is in right"*):
            a `patch` control is the far end by construction and the panel
            strips a `.pos-pick-l` off it, so this specimen builds none, and the
            three names are sentence cased because a patch is printed as it was
            written (the rule two blocks up in positron-ui). */
````

<a id="kit-devices-22"></a>
## kit-devices-22: demo/kit/devices/index.html, inline script, line 536

````js
  /**
   * 🔴 THE BASE THE BLOCK ABOVE IS BUILT ON, ASKED FOR IN THE SAME BREATH:
   * *"base on generic \\"glued containers/rows\\" component that you also need
   * to add to kit"*.
   *
   * ⚠️ **AND IT IS NOT AN INSTRUMENT, WHICH IS THE WHOLE POINT OF SHOWING IT
   * SEPARATELY.** If every specimen of a generic component is an instrument,
   * the component is not generic, it is that instrument with a factory around
   * it. This one is a station strip: what to listen to, how fast, and a picture
   * of what is coming out, three rows that have nothing to do with a keyboard.
   *
   * 🔴 AND THE REMOVE BUTTON IS THE SPECIMEN, NOT DECORATION. The mechanism is
   * a 1 px `gap` over a line-coloured ground, and the thing a reader cannot see
   * from a still picture is what happens to the seam when a row goes: a
   * `display: none` child takes no gap in a flex column, so the surface closes
   * up with no orphan rule left behind. **That is the REASON the deleted GLUE
   * block failed to show.**
   */
````

<a id="kit-devices-23"></a>
## kit-devices-23: demo/kit/devices/index.html, inline script, line 564

````js
      /* ⚠️ NO LOOP BUTTON, ASKED OUT 2026-09-26: *"rm loop button from glued
         rows, add way more examples of glued rows"*. And no caption under any
         of these, for the reason the panels above have none: the note names
         the six and the eye tells them apart. */
````

<a id="kit-devices-24"></a>
## kit-devices-24: demo/kit/devices/index.html, inline script, line 583

````js
      /* NO `between` ANYWHERE IN THIS BLOCK. MEASURED three times: on the
         settings list, the meter and this strip it came out 8 px apart against
         an 8 px gap, because a shrink-to-fit surface is only as wide as its
         widest row and a picture that fills a row has no width of its own to
         give it. `between` spreads only across a row with an intrinsic width,
         which on this page is the keyboard, and the panel's plate row above
         already grades it there. */
````

<a id="kit-devices-25"></a>
## kit-devices-25: demo/kit/devices/index.html, inline script, line 598

````js
      /* ⚠️ `start`, NOT `between`, AND THE FIRST DRAFT HAD `between`. MEASURED:
         the two ends sat 8 px apart against a row gap of 8 px, because the
         surface is its own size and every row in this list is short, so there
         was nothing to spread across. `between` means something only when
         another row sets the width; here it was `start` wearing a hat. */
````

<a id="kit-devices-26"></a>
## kit-devices-26: demo/kit/devices/index.html, inline script, line 638

````js
      /* 5. THE STRIP WITH ITS PICTURE HIDDEN. Two rows showing and one seam
            between them, and no orphan line where the third row was. The
            assert at the foot of this file toggles the first strip's picture
            and measures; this one stands still so a reader can see it. */
````

<a id="kit-devices-27"></a>
## kit-devices-27: demo/kit/devices/index.html, inline script, line 683

````js
      /* 9. THE SAME TWO ROWS IN A 320 px FRAME, ON THE SAME PAGE. The justified
            row wraps into two left-aligned lines at their own sizes, because a
            between row has two ends and one item per line parks at the start;
            the start row wraps as a cluster. Both are decided by the frame's
            width and not the window's, which is what lets the harness grade a
            phone layout at desk width. */
````

<a id="kit-devices-28"></a>
## kit-devices-28: demo/kit/devices/index.html, inline script, line 712

````js
      /**
       * One panel built twice, the only difference being whether it carries a
       * side plate. A specimen built from a shared function rather than typed
       * twice is the only version where the two can be COMPARED, which is the
       * argument the PANEL block below already makes about its own pair.
       */
````

<a id="kit-devices-29"></a>
## kit-devices-29: demo/kit/devices/index.html, inline script, line 728

````js
        /* 🔴 A SECOND BAND WITH NO SEAM BETWEEN THEM, BECAUSE THE TWO DISTANCES
           ARE DIFFERENT AND ONLY ONE OF THEM WAS EVER IN QUESTION. Across a
           seam it is the band's inset, the rule, and the next band's inset; band
           to band it is two insets and nothing in the middle. `/shape/` measured
           the second one at 1.0 px where the page it came from reads 40.0, so a
           specimen with one band could not have shown the number that was
           lost. */
````

<a id="kit-devices-30"></a>
## kit-devices-30: demo/kit/devices/index.html, inline script, line 746

````js
  /**
   * 🔴 NEWEST AT THE TOP, AND THE HEADING IS UPPERCASE. The instrument header,
   * as of 2026-09-22, asked for as *"create instrumet header/glue: similar to
   * transport glue etc. left: online status button: enabled disabled
   * (green/gray). right nameplate. center patch selector (optically center to
   * the instrument)"*.
   *
   * 🔴 **THE CENTRE IS THE WHOLE ASK AND IT IS SAID PRECISELY.** Centred to the
   * INSTRUMENT, not balanced between two unequal neighbours. The two specimens
   * below have deliberately different outer contents, so a flex row would put
   * their patch selectors in two different places while a three column grid
   * with equal outer tracks puts both on the case's own centre. **Both are
   * asserted against the case's own box, and the naive answer is asserted to be
   * visibly elsewhere**, which is the negative control.
   *
   * 🔴 **THE STATUS CONTROL ACTS OR IT IS NOT A BUTTON, AND BOTH SHAPES ARE
   * HERE.** `positron-ui` calls a control whose only honest behaviour is to do
   * nothing *"the shape of control this project calls a lie"*, and the ask
   * wanted one element that both reports a state and looks pressable. A caller
   * that says what a press DOES gets a real button; one that says nothing gets
   * a badge with no tab stop and no handler. The second case is not a degraded
   * first: `/muta/`'s two firmwares are in the page and cannot be unplugged.
   * ⚠️ **AND THE PRESS IS DRIVEN HERE RATHER THAN ASSUMED**, because a callback
   * nobody calls is a binding nothing grades.
   *
   * 🔴 **THE ONE LINE CASE LIVES HERE NOW.** It was the INSTRUMENT block's
   * second specimen and was removed on 2026-09-22 (*"one line, which cannot use
   * the same placement / rm example"*). It is a MOVE rather than a loss: a
   * header's plate is `end` whether it has one line or two, so the placement
   * `shell.css` has a whole entry about is still on the page and still checked.
   * ⚠️ **WHAT DID NOT MOVE**: the one line plate sitting in a CASE's top inset,
   * which is `/twelve/`'s shape. That is now demonstrated nowhere on this page,
   * and `instrument-test.mjs` keeps the decision itself.
   *
   * ⚠️ **AND THE PHONE IS SHIPPED ON A READING.** Three levels were asked for
   * (*"3 levels, sorry"*) and `demo/verify.mjs` runs at 756 px with no viewport
   * override, so nothing in this repository can enter that media query. What is
   * asserted here is the desktop geometry and that the block is last in
   * `shell.css`, which answers the failure this repo has actually measured. The
   * layout itself is read and not measured.
   */
````

<a id="kit-devices-31"></a>
## kit-devices-31: demo/kit/devices/index.html, inline script, line 829

````js
      /* 🔴 THE REPORTING CASE, AND ITS OUTER CONTENTS ARE DELIBERATELY A
         DIFFERENT WIDTH FROM THE FIRST ONE'S. A one line plate is much narrower
         than `POSITRON WARP`, and a badge is narrower than a button, so if the
         centre were balanced between neighbours these two patch selectors would
         sit in two different places. That is the negative control. */
````

<a id="kit-devices-32"></a>
## kit-devices-32: demo/kit/devices/index.html, inline script, line 857

````js
  /**
   * 🔴 NEWEST AT THE TOP, AND THE HEADING IS UPPERCASE. A stepped knob, as of
   * 2026-09-22, asked for as *"move voices to knobs, bottom right, stepped
   * knob"* for a voice count that can only be a whole number.
   *
   * 🔴 **THE ROUNDING IS THE COMPONENT'S, NOT THE PAGE'S, AND THAT IS THE WHOLE
   * POINT.** A page that rounds the value on its way out leaves the NEEDLE
   * somewhere the number is not, so the dial and the readout disagree about a
   * control the reader is looking straight at. The assert below reads the
   * NEEDLE'S ANGLE off the drawing and compares it against the value, which is
   * the only thing that can tell those two apart.
   *
   * 🔴 **AND THE THIRD SPECIMEN IS WHY THIS IS NOT A ROUNDING BOLTED ON.** The
   * pointer moves a knob by `span / SWEEP` a pixel, which on a one to eight
   * knob is 0.039, so the obvious implementation rounds every pixel straight
   * back and **the knob never moves at any speed**. The drag arithmetic is
   * graded with no browser by `node demo/shell/knob-test.mjs`, 19 asserts, and
   * one deliberate sabotage of the accumulator takes it red.
   */
````

<a id="kit-devices-33"></a>
## kit-devices-33: demo/kit/devices/index.html, inline script, line 897

````js
      /* 🔴 THE NEGATIVE CONTROL, AND IT IS THE ONE THAT PROTECTS THIRTY PAGES.
         A knob with no step must still be continuous, or a snap that leaked
         into the default would quantise every knob on the site while every
         assert above stayed green. */
````

<a id="kit-devices-34"></a>
## kit-devices-34: demo/kit/devices/index.html, inline script, line 936

````js
      /**
       * 🔴 THE FOUR FADER SPECIMEN WENT 2026-09-22, ASKED FOR AS *"rm four
       * faders, a different shape on the same rule"*, AND IT TOOK THIS BLOCK'S
       * ONLY NEGATIVE CONTROL WITH IT.
       * ⚠️ **WHAT STOPPED BEING CHECKED, NAMED HERE RATHER THAN LEFT AS A
       * SMALLER COUNT**: that a control which is NOT a knob lays out on the
       * same lattice, measured in a real browser. Its assert read
       * `NEGATIVE CONTROL: a grid of faders keeps the same centre to centre
       * rule` and compared a rendered `dx` against the pitch plus the gap. A
       * component that only worked for knobs passed everything else in this
       * block and failed that one, which is what a negative control is for.
       * ✅ **THE ARITHMETIC HALF SURVIVES WITH NO BROWSER**, in
       * `control-grid-test.mjs`: 9 asserts including its own negative control,
       * `it is not the average, which would clip whichever is bigger`. `pitchFor`
       * is pure and exported for exactly this.
       * 🔴 **WHAT IS GONE IS THE RENDERED HALF, AND THOSE ARE DIFFERENT
       * CLAIMS.** The pure test cannot see a stylesheet rule that happens to
       * suit a knob's proportions, because it never lays anything out. The day
       * somebody writes one, nothing on this page will notice.
       */
````

<a id="kit-devices-35"></a>
## kit-devices-35: demo/kit/devices/index.html, inline script, line 962

````js
  /**
   * 🔴 NEWEST AT THE TOP, AND THE HEADING IS UPPERCASE. An instrument case, as
   * of 2026-09-22, asked for as *"wrap it into insrtument wrapper with title
   * suppoer |positron      plai|"* and *"add global component (takes instument
   * panels into it) to kit"*.
   *
   * 🔴 **IT IS A COMPOSITION AND THE BLOCK SHOWS THAT RATHER THAN HIDING IT.**
   * `createPanelLayout` already owned the case and the one scrolling strip;
   * `createNameplate` already owned the plate and its three placements. What
   * did not exist was the sentence joining them, and FIVE pages had each
   * written it: `/tom/` prepends its own plate, `/circuit/` and `/evo/` place
   * theirs their own way, `/twelve/` uses a single line, and this page had two
   * more in its PANEL specimen. `positron-ui` calls that a component that has
   * not been noticed yet.
   * ⚠️ **SO THE INTERESTING ASSERT IS AN ABSENCE**, and it is in
   * `instrument-test.mjs` rather than here: the module builds no case and no
   * plate of its own. A second implementation would pass every check on this
   * page and drift from `panel-layout.mjs` the first time a panel changed.
   * 🔴 **THE ONE LINE SPECIMEN WENT 2026-09-22**, asked for as *"one line,
   * which cannot use the same placement / rm example"*. It was
   * `createInstrument({ name: 'MODEL 12', maker: '' })`, which is `/twelve/`'s
   * shape, and it was the only place the `end` placement was visible.
   * ✅ **IT IS A MOVE RATHER THAN A LOSS, AND THE MOVE IS UP THE PAGE.** The
   * INSTRUMENT HEADER block's second specimen is a one line plate, because a
   * header's plate is `end` whether it has one line or two, so the placement
   * and its assert are both still here.
   * 🔴 **WHAT STOPPED BEING SHOWN, NAMED HERE RATHER THAN LEFT AS A SMALLER
   * COUNT**: a one line plate sitting in a CASE'S TOP INSET, which is what
   * `/twelve/` really has. The header puts it in a grid cell instead, and
   * `shell.css`'s own entry on `end` is about a flex COLUMN whose items are
   * centred, which is neither of those. Nothing on this page renders that
   * arrangement any more; `instrument-test.mjs` keeps the decision that a lone
   * line takes `end`, which is the part a browser was never needed for.
   */
````

<a id="kit-devices-36"></a>
## kit-devices-36: demo/kit/devices/index.html, inline script, line 1023

````js
  /**
   * 🔴 TWO SPECIMENS SINCE 2026-09-22, ASKED FOR AS *"STEP GRID / show example
   * with both axies labels and one withouth ones"*.
   *
   * 🔴 **AND THE STEP AXIS HAD NO LABELS AT ALL, WHICH WAS THE REAL WORK.** The
   * ROW axis was already optional: omit `fixed` and no label column is built.
   * The ruler was a press target and a track for the head and carried no text,
   * so *both axes labelled* could not be shown by passing options that existed.
   * `ticks` is new, and it numbers the BEATS rather than the steps: a number
   * under every one of 64 steps is this project's wrapping table heading in a
   * new costume, and `positron-ui` is explicit that a heading which does not fit
   * is the author's problem rather than something to shrink at the reader.
   * ⚠️ **THE RULER'S TWO EXISTING JOBS SURVIVE INTACT**, which is what made this
   * cheap: its height is `--pg-ruler` whether or not there is text in it, and
   * `.pos-pg-tick` already carried the font and the two colours for a string it
   * never had.
   *
   * 🔴 **THE BARE ONE IS THE NEGATIVE CONTROL AND THAT IS ITS WHOLE VALUE.** It
   * is asserted as an ABSENCE, the way `instrument-test.mjs` asserts that the
   * module builds no case of its own: no label column, no numbers on the ruler,
   * and the labelled one has both.
   *
   * 🔴 **THE WRAPPER AND THE FOOTER WENT IN THE SAME BREATH**, asked as *"rm
   * wrapper and info footer"*. The box was `.kit-box` drawn round a `.pos-glue`
   * that draws its own edge, and the footer was a `nothing pressed` line under
   * it. ⚠️ **WHAT THE FOOTER COST IN CHECKS: NOTHING.** Its three writers were
   * `onLabel`, `onSeek` and `onToggle` and no assert on this page read it; the
   * one that sounds like it did, `a question nobody has answered has nothing
   * pressed`, belongs to the standing choice specimen and reads `standSpec`.
   * The three callbacks are gone with the line rather than left writing to a
   * detached node.
   */
````

<a id="kit-devices-37"></a>
## kit-devices-37: demo/kit/devices/index.html, inline script, line 1078

````js
        /* 🔴 BOTH AXES. The rows are named by `label` and the steps by `ticks`,
           which puts a beat number under every fourth one and nothing between
           them. `corner` is the cell above the label column and now has a word
           in it, because the ruler beside it carries text at last. */
````

<a id="kit-devices-38"></a>
## kit-devices-38: demo/kit/devices/index.html, inline script, line 1087

````js
        // Rows 0 to 3 and 5 can be heard, row 4 cannot, so a lit pad on it
        // stays grey. Brightness says WHETHER THIS CAN MAKE A SOUND, which is
        // the one thing a reader cannot see any other way.
````

<a id="kit-devices-39"></a>
## kit-devices-39: demo/kit/devices/index.html, inline script, line 1094

````js
        /**
         * 🔴 THE TEMPO IS NAMED IN WORDS, AND THE COMPONENT WILL NOT PLAY
         * WITHOUT IT. Nothing about a grid of pads carries a rate, so a play
         * button is a page claiming one. This page's claim is that the number
         * is its own and nobody else's.
         */
````

<a id="kit-devices-40"></a>
## kit-devices-40: demo/kit/devices/index.html, inline script, line 1105

````js
      /**
       * 🔴 THE DECK IS A FOLLOWER AND THE GRID OWNS THE CLOCK, which is the
       * arrangement `/pack/` and `/crate/` both use. The component's clock is
       * the only thing that knows the step length, so a deck running free
       * beside it would be a second reading of one tempo, and the two would
       * disagree the moment either was touched.
       * ⚠️ `publish: false`, BECAUSE THIS PAGE HAS THREE BARS. `__demo.transport`
       * may name only one, and the two blocks further down this file are what
       * the transport checks are written against.
       * ⚠️ `scrub: false` AND `loop: false`: the grid's own ruler already seeks
       * on a press, and one position surface per component is the rule.
       * ⚠️ AND THE CLOCK NEVER PRINTS A TIME. `fmt` takes the whole line, so
       * there is no `0:00.000` and no total: the deck's unit here is one step
       * and the readout says so in the same words the picture does.
       */
````

<a id="kit-devices-41"></a>
## kit-devices-41: demo/kit/devices/index.html, inline script, line 1134

````js
      /* 🔴 NO LABELS ON EITHER AXIS, WHICH IS THE NEGATIVE CONTROL. No `fixed`
         means no label column is built at all, and `ticks` left off means the
         ruler is what it has always been. It is a smaller grid because what is
         being shown is an absence rather than a sequence. */
````

<a id="kit-devices-42"></a>
## kit-devices-42: demo/kit/devices/index.html, inline script, line 1149

````js
      /* ⚠️ `bar` AND `deck` ARE HELD SO THE BLOCK KEEPS THEM ALIVE, and neither
         is read by an assert: what is graded about the transport here is the
         GLUE, through `barHost` and `wrap`. Saying so beats a reader wondering
         which check reads them. */
````

<a id="kit-devices-43"></a>
## kit-devices-43: demo/kit/devices/index.html, inline script, line 1159

````js
  /**
   * 🔴 NEWEST AT THE TOP, AND THE HEADING IS UPPERCASE. An envelope figure, as
   * of 2026-09-22, asked for as *"evelope editor / display (can start with
   * noninteracive)"*.
   *
   * 🔴 **NON-INTERACTIVE IS WHAT THE HARDWARE PERMITS FOR TWO OF THE THREE, NOT
   * A FIRST VERSION.** MEASURED out of `circuit-cc.mjs` and
   * `circuit-patch.mjs`: Envelope 1 is on five controller numbers, so the four
   * sliders here are honest. Envelopes 2 and 3 are in the patch format and on
   * NO controller number at all, so a control for either would name something
   * it cannot do, which is the defect that cost `/twelve/` four buttons.
   *
   * 🔴 **THE SHAPE IS EXACT AND THE TIME AXIS IS NOT, AND THE PICTURE SAYS SO
   * ON ITS OWN FACE.** Attack is `0 to 127` with no published mapping to
   * seconds, so the stage widths follow the settings and the figure paints
   * `proportions, not seconds` into its own canvas rather than into a caption
   * beside it, so the warning travels with the picture into any page that puts
   * it somewhere.
   * ⚠️ **THE FOURTH FIGURE HAS NO LENGTHS AT ALL**, which is a real setting and
   * is also the divide by zero this component had to be written around.
   */
````

<a id="kit-devices-44"></a>
## kit-devices-44: demo/kit/devices/index.html, inline script, line 1208

````js
      // ⚠️ THE SECONDARY LABEL IS THE CONTROLLER NUMBER, which is exactly what
      // `slider.mjs` says that slot is for: the primary names what the control
      // moves and the secondary names what it is on the wire. Here it is also
      // the evidence that this envelope is the reachable one.
````

<a id="kit-devices-45"></a>
## kit-devices-45: demo/kit/devices/index.html, inline script, line 1228

````js
  /**
   * 🔴 NEWEST AT THE TOP, AND THE HEADING IS UPPERCASE. A filter figure, as of
   * 2026-09-22, asked for as *"filter editor / display (can start with
   * nonimteractive)"*.
   *
   * 🔴 **THIS ONE CAN BE DRIVEN AND IT STILL DRAWS A SCHEMATIC, AND THOSE ARE
   * TWO DIFFERENT FACTS.** The filter IS reachable over control change, type on
   * CC 68 across six values, frequency on 74 and resonance on 71, so a control
   * that moves it is honest. What is NOT honest is the curve: Novation publish
   * no response measurements for this instrument and nothing in this repository
   * has taken one. So the corner is where the parameter says, the slope is what
   * the type's NAME says, and the peak follows the resonance, and every one of
   * those is a statement about a textbook model.
   * ⚠️ **THE WORD IS PAINTED INTO THE CANVAS RATHER THAN WRITTEN BESIDE IT.** A
   * caption in this page's prose would not travel with the picture, and a curve
   * that looks like a measurement and is not is exactly the confident wrong
   * picture this project keeps paying for. There is no hertz on the x axis and
   * no decibel figure on the y for the same reason: the only scale anybody here
   * has for a cutoff is `0 to 127`, which is a parameter rather than a
   * frequency.
   * ⚠️ **AND THE THIRD FIGURE IS A NAME THE COMPONENT CANNOT READ**, which it
   * refuses in words instead of drawing the default low pass under somebody
   * else's label.
   */
````

<a id="kit-devices-46"></a>
## kit-devices-46: demo/kit/devices/index.html, inline script, line 900

````js
      // 🔴 THE REFUSAL, WHICH IS THE HALF NOBODY TESTS. A name the component
      // cannot read has an unknown slope and an unknown direction, and drawing
      // the default under it would be an invention wearing an instrument's
      // label. `filterShapeFor` answers null and the picture says so.
````

<a id="kit-devices-47"></a>
## kit-devices-47: demo/kit/devices/index.html, inline script, line 908

````js
      // ⚠️ `onPick` HANDS BACK AN INDEX, NOT A NAME, which is what the dropdown
      // knows about itself. `show` takes the name AND the index, so the drawn
      // cell and the native list underneath it cannot drift apart.
````

<a id="kit-devices-48"></a>
## kit-devices-48: demo/kit/devices/index.html, inline script, line 930

````js
      /**
       * 🔴 THE CONTROLS ARE ONE GRID SINCE 2026-09-22, ASKED FOR AS *"put all
       * to controls grid"* after a screenshot of a type stepper on its own line
       * with two labelled sliders under it, all three placed by hand.
       *
       * 🔴 **AND THE TWO SLIDERS BECAME KNOBS, WHICH IS A CHANGE TO THE BLOCK
       * AND NOT ONLY A TIDY UP. MEASURED, BECAUSE THE OBVIOUS READING OF THE
       * ASK WOULD HAVE SHIPPED A DEFECT.** `createControlGrid` writes
       * `gridAutoRows` at the same pitch as its columns, which is
       * `max(cellW, cellH) + gap`: the whole component is the claim that two
       * working surfaces sit on a SQUARE lattice. A horizontal slider is about
       * 300 px wide and 40 tall, so a square cell for one is **300 px tall for
       * a 40 px control**, and three of them would have been a row of empty
       * case seven times the height of what is in it. That is the exact
       * condition `panel-layout.mjs`'s own `check()` exists to report.
       * ✅ **SO THE LATTICE IS RIGHT AND THE CONTROL WAS WRONG.** Cutoff is
       * CC 74 and resonance is CC 71, which are KNOBS on this instrument and on
       * every other one, and a knob is taller than it is wide, which is the
       * shape a square lattice is a claim about.
       *
       * 🔴 **AND THE TYPE PICKER IS REFUSED FROM THE GRID, ON THE SAME
       * MEASUREMENT, WHICH IS HALF OF WHAT WAS ASKED FOR.** All three were put
       * in first and the page reported it: the picker is about 272 px wide, so
       * the square lattice came out at a **282 px pitch holding a 96 px
       * control, 34 per cent filled**, and both knobs sat in the middle of a
       * box nearly three times their height. A picker is a wide horizontal
       * object exactly as a slider is, and a square lattice is a claim about
       * controls that are TALLER than they are wide.
       * ⚠️ **SO IT SITS ABOVE THE GRID RATHER THAN IN IT.** That is also what a
       * real panel does: a type or a patch selector is a display with two
       * buttons, and it is not on the knob lattice on any instrument on this
       * desk. `positron-ui`'s other half is that if the thing you need is not
       * in the kit, stop and ask, and the thing that is not in the kit here is
       * a grid cell that may span a row.
       * ⚠️ **THE EMPTY CASE IS ASSERTED BOTH WAYS BELOW**, so the day somebody
       * puts a wide control back in, the page says so rather than looking
       * slightly odd.
       */
````

<a id="kit-devices-49"></a>
## kit-devices-49: demo/kit/devices/index.html, inline script, line 983

````js
  /**
   * 🔴 NEWEST AT THE TOP, AND THE HEADING IS UPPERCASE. A waveform figure, as
   * of 2026-09-22, and it is HALF of what was asked for under *"waveform
   * display"*. The other half is drawing a recorded buffer, which is
   * `wave-view.mjs` and `grain-scope.mjs` and already exists on four pages. A
   * second one of those is what this block is not.
   *
   * 🔴 **IT DRAWS 4 OF THE 30 AND REFUSES 26 IN WORDS, AND THE REFUSAL IS THE
   * REASON IT IS WORTH HAVING.** A name is mapped to a shape only when the name
   * IS the shape's name. Sixteen of the Circuit's thirty oscillator waves are
   * WAVETABLES, which have no single shape by definition, and nine more are
   * `saw 9:1 PW` blends whose ratios nothing here has measured, and one is a
   * `pulse width` with no width. An invented squiggle under a real
   * instrument's parameter name is the failure this component exists not to be.
   * ⚠️ **AND THAT IS STILL BETTER THAN WHAT THOSE PAGES HAVE**, which is a
   * slider reading `17`.
   * ⚠️ **THE PICKER WALKS ALL THIRTY**, which is the demonstration: press
   * through the table and watch the same component draw four of them and name
   * its reason for the rest. A block showing only the four it can draw would
   * have hidden the whole point.
   * 🔴 **SIXTEEN, AND THE REQUEST THIS WAS BUILT FROM SAID FOURTEEN.** MEASURED
   * 2026-09-22: `FIRST_WAVETABLE` is 14, which is the count of PLAIN waveforms,
   * and `OSC_WAVES.slice(14)` is 16 rows long. Two halves of one split written
   * down the wrong way round. The conclusion does not move.
   */
````

<a id="kit-devices-50"></a>
## kit-devices-50: demo/kit/devices/index.html, inline script, line 1025

````js
      // ⚠️ `drawnViews`, NOT `drawn`. This page already has a module level
      // `const drawn` holding what each diagram reported, and a second one in
      // here would shadow it inside this block only, which is the kind of
      // half-collision that reads as correct until somebody moves a line.
````

<a id="kit-devices-51"></a>
## kit-devices-51: demo/kit/devices/index.html, inline script, line 1035

````js
      /* 🔴 THE REASON IS SHORTER SINCE 2026-09-22 BECAUSE THE OLD ONE WAS BEING
         CUT. It read `a blend, and its ratio is not published` and rendered as
         `is not publ…` in this block's narrow cards. `positron-ui` is explicit
         that anything truncating with an ellipsis is in the WRONG PLACE, and
         that the ellipsis is the signal rather than a styling problem to widen
         your way out of. The words that carry the fact are `ratio not
         published`; the rest was a sentence built round them. */
````

<a id="kit-devices-52"></a>
## kit-devices-52: demo/kit/devices/index.html, inline script, line 1045

````js
      /**
       * 🔴 TWO TRACES IN ONE PICTURE, 2026-09-22, ASKED FOR AS *"can you have
       * wave / osilocope visualizer to top of muta. plai and warp with
       * different colors"*. A page that puts an oscillator's output and an
       * effect's output in two boxes side by side asks a reader to hold one in
       * their head while looking at the other.
       * 🔴 **AND THE SECOND SPECIMEN IS THE ONE THAT MATTERS, BECAUSE IT IS
       * MEASURED RATHER THAN DERIVED.** `points` outranks a name, and it has
       * to, or this option would be useless to the page that asked for it:
       * `/muta/`'s two signals are a Plaits engine and a wave folder, and
       * neither is a sine, a triangle, a sawtooth or a square. A caller with
       * SAMPLES is not guessing, which is the only thing the refusal is about.
       */
````

<a id="kit-devices-53"></a>
## kit-devices-53: demo/kit/devices/index.html, inline script, line 1073

````js
      /* 🔴 THE WALK AND THE WAVETABLE FIGURE BOTH LEFT ON 2026-09-22, asked
         for as *"rm this exampoel a wavetable, refused"* and *"rm osc 1 wave
         example"*. The walk was a picker over all thirty waves with a figure
         following it, and its argument was that pressing through the table is
         how a reader sees four drawn and twenty six named.
         🔴 SO SAY WHAT STOPPED BEING GRADED. Two asserts went with them: that
         the walk draws exactly the four `shapeFor` answers and refuses the
         other twenty six while walking the whole table, and that a wavetable
         and a blend are refused for DIFFERENT stated reasons. **The counts
         survive** in `synth-view-test.mjs`, which asserts `shapeFor` over all
         thirty with no browser. **What is gone is the demonstration that one
         component handles both answers as a reader steps through them**, and
         the blend figure is the only refusal left on the page. */
````

<a id="kit-devices-54"></a>
## kit-devices-54: demo/kit/devices/index.html, inline script, line 1108

````js
      /**
       * One panel, built twice: identical apart from whether anything absorbs
       * the slack. A specimen built from a shared function rather than typed
       * twice is the only version where the two can be COMPARED, which is what
       * the second one is for.
       * ⚠️ THE CONTROLS ARE REAL ONES FROM THIS PAGE'S OWN KIT. A knob, a pad
       * and a fader stacked make the column the taller child by a wide margin,
       * which is the condition the whole component exists to handle, and a
       * stand-in box of the right height would be the specimen arranging for
       * its own demonstration to succeed.
       */
````

<a id="kit-devices-55"></a>
## kit-devices-55: demo/kit/devices/index.html, inline script, line 1129

````js
        /* 🔴 SIXTEEN PADS, AND THE COUNT IS THE POINT RATHER THAN DECORATION.
           The first build of this specimen used four, and the check *there is
           something to scroll behind the border* went RED at `0 px to scroll`:
           the row fitted the page column, so `overflow-x: auto` was a
           declaration about nothing and the panel was demonstrating its
           arrangement without demonstrating the one thing that arrangement is
           for. A strip that does not overflow is not a strip. */
````

<a id="kit-devices-56"></a>
## kit-devices-56: demo/kit/devices/index.html, inline script, line 1140

````js
        /* 🔴 A NAMEPLATE STOOD IN THIS ROW UNTIL 2026-09-22, ASKED OFF AS *"no
           nameplate exaple"*. It demonstrated the `mid` placement, which is
           what a plate inside a SCROLLING flow needs, and that is the one
           thing no longer shown anywhere. The plate itself is demonstrated on
           the INSTRUMENT block at the top of this file, at `ends`, which is
           the placement a cased instrument uses. `panel-layout.mjs` still
           documents all three. */
````

<a id="kit-devices-57"></a>
## kit-devices-57: demo/kit/devices/index.html, inline script, line 1150

````js
        // 🔴 THE ONE LINE THAT DIFFERS, AND IT IS AN ARGUMENT RATHER THAN A
        // CLASS TYPED ON A PAGE. That is the whole reason `grow` exists: a
        // required line a caller types is a line no browser check can see when
        // it is MISSING, which is the `/blocks/` shape that shipped a headset
        // page with no way out of it.
````

<a id="kit-devices-58"></a>
## kit-devices-58: demo/kit/devices/index.html, inline script, line 1165

````js
      /* 🔴 A THIRD SPECIMEN, A CARD IN A 320 px HOLDER, STOOD HERE UNTIL
         2026-09-22 AND WAS ASKED OFF IN THOSE WORDS. **It was the only check
         in this repository that entered a media query.** `demo/verify.mjs`
         runs at 756 px with no viewport override, so every assert on all
         three panel pages passes without ever meeting one, and `/circuit/`'s
         own *the panel box starts and ends where the rest of the page does*
         is green while being FALSE at 390 px by 286.0 px.
         🔴 SO WHAT WENT IS NOT A SPECIMEN, IT IS THE PROJECT'S ONLY PHONE
         WIDTH ASSERT, and nothing replaces it. The day a panel breaks on a
         phone again, this suite will be green. `plans/plan-panel-component.md`
         has three unpriced options for grading a phone properly, and
         `BACKLOG.md` carries this as open. */
````

<a id="kit-devices-59"></a>
## kit-devices-59: demo/kit/devices/index.html, inline script, line 1203

````js
      // ── the same field, six readings ──────────────────────────────────
      // All three digits, no decimal point, default ink: the width check below
      // compares these against each other, so anything that changed the shape
      // of the box would have to change all six.
````

<a id="kit-devices-60"></a>
## kit-devices-60: demo/kit/devices/index.html, inline script, line 1227

````js
      /**
       * 🔴 THE SECOND SCHEME, AND IT IS THE POINT OF THE WHOLE OPTION. Asked
       * 2026-09-21: *"have iption on segmentdisplay to inverse color:
       * green-grayish"*. `backlit` is a lamp behind the glass, so the driven
       * bars are the bright ones; `reflective` has no lamp, so the crystal goes
       * DARK where it is driven and the field is the pale grey green of a
       * calculator. It is one option rather than three colours passed by hand,
       * because a scheme is a set of three numbers that only make sense
       * together, and its ghost is its own: 0.16 against the backlight's 0.22,
       * because dark bars on a pale field read heavier at the same opacity.
       * ⚠️ THIS PAGE IS THE ONLY PLACE ANYBODY SEES IT, which is the argument
       * for the block existing at all.
       */
````

<a id="kit-devices-61"></a>
## kit-devices-61: demo/kit/devices/index.html, inline script, line 1246

````js
      /**
       * 🔴 A SECOND SMALLER FIELD IS TWO DISPLAYS AND NOT AN OPTION ON ONE, and
       * this is the arrangement that makes that decision workable. The real
       * MK-425C has a three digit field and a small two digit one in one
       * window; here the PAGE draws the window and both displays pass
       * `frame: false`, so there is one edge round the pair instead of two
       * inside a third.
       * ⚠️ THE WINDOW READS `--disp-back` OFF `:root`, which is why that token
       * is declared there rather than on `.pos-disp`. A custom property
       * inherits downward and never sideways, and this box is a SIBLING of both
       * fields.
       */
````

<a id="kit-devices-62"></a>
## kit-devices-62: demo/kit/devices/index.html, inline script, line 1272

````js
  // ── readout ─────────────────────────────────────────────────────────────
  // 🔴 AN EVEN NUMBER OF CELLS, AND A PENDING ONE SHOWS AN EM DASH AND NOTHING
  // ELSE. The row is `auto-fit minmax(96px, 1fr)`, so a phone gets two columns
  // and an odd count leaves a hole of a different colour in the last row. The
  // repair is to CUT the weakest cell, never to pad with a blank: every odd
  // readout has one, usually a constant or something a neighbour implies.
  // `mount()` throws on an odd count so the suite catches it. And nothing
  // unmeasured prints as `0` or as a lone unit: `''`, `null` and `NaN` all
  // become an EMPTY cell with the unit hidden, because a zero reads as a very
  // confident measurement and a bare `%` reads as a number that went missing.
  // ── presence ────────────────────────────────────────────────────────────
  // 🔴 FOUR STATES, AND THE FOURTH IS THE HONEST ONE. A badge that opens on
  // `offline` is a page asserting a measurement of hardware in another building
  // that it has not taken, and it is wrong exactly in the two seconds somebody
  // is watching. The specimens below are FOUR SEPARATE BADGES rather than one
  // pressed through four states, because the checks at the bottom measure them
  // and a check that drives a control is a check a visitor watches happen.
````

<a id="kit-devices-63"></a>
## kit-devices-63: demo/kit/devices/index.html, inline script, line 1289

````js
  /**
   * 🔴 THE STRIP BROKEN INTO ITS PARTS, AND THE PARTS COME FIRST BECAUSE THEY
   * ARE WHAT A CALLER ASSEMBLES. Asked 2026-09-21: *"breaks strp elements down
   * and keep final example"*. A finished strip shows the kit can draw one; it
   * does not show what you write to get there, and it hides the thing that
   * actually goes wrong.
   * ⚠️ NEWEST FIRST YIELDS TO READING ORDER INSIDE THIS PART, which is the same
   * exception the assembled block below already declares for itself. These four
   * are the newest blocks on the page and they sit at the bottom of `hardware`,
   * because parts then whole is one argument read in one direction and breaking
   * it to satisfy an ordering rule would leave the conclusion above its premise.
   */
````

<a id="kit-devices-64"></a>
## kit-devices-64: demo/kit/devices/index.html, inline script, line 1309

````js
      /**
       * ⚠️ WHY A VERTICAL DRAG, WHICH IS A MEASUREMENT RATHER THAN A PREFERENCE:
       * an angular drag dies near the centre, where two pixels swing the angle
       * through most of its range.
       * ⚠️ AND ONE OF THEM IS SHOWN AS MOVED BY HARDWARE, because that state is
       * the reason the component tracks a source at all and it is invisible
       * until something is in it. A live binding and one nobody ever bound look
       * identical.
       */
````

<a id="kit-devices-65"></a>
## kit-devices-65: demo/kit/devices/index.html, inline script, line 1325

````js
        /**
         * 🔴 THE INVISIBLE HAND, 2026-09-22, ON A KNOB RATHER THAN ON A LANE.
         * The button is the same one a slider carries and the movement is the
         * same `hand.mjs` plan, which is the whole reason it was extracted into
         * `hand-drive.mjs` rather than written twice.
         * ⚠️ IT SITS ON THE RING'S LOWER EDGE AND COSTS NO HEIGHT, so this knob
         * lines up with the three beside it. That is asserted below, because
         * `positron-ui` records `/twelve/` being corrected twelve times in one
         * evening over arithmetic exactly like it.
         */
````

<a id="kit-devices-66"></a>
## kit-devices-66: demo/kit/devices/index.html, inline script, line 1352

````js
      /**
       * 🔴 TWO ROWS, WHICH IS ALSO THE SPECIMEN THE BLOCK BELOW MEASURES. The
       * distance between two STACKED pads is the thing `--ctl-step` names, and
       * it needs two rows to exist at all.
       * ⚠️ AND ONLY EVERY OTHER PAD IS NAMED, which is what makes the reserved
       * slot visible: a pad with no top label still takes `--ctl-head`, or the
       * named ones would sit lower than the rest and it would read as a
       * rendering fault rather than a labelling choice.
       */
````

<a id="kit-devices-67"></a>
## kit-devices-67: demo/kit/devices/index.html, inline script, line 1414

````js
  /**
   * 🔴 THE CONTRACT BETWEEN ALL THREE, AND IT IS THE REASON THIS BLOCK EXISTS
   * RATHER THAN THE PARTS ALONE. `/twelve/` was corrected by screenshot twelve
   * times in one evening and **every single correction was the page doing
   * arithmetic about a component's insides**: a button column lifted by a
   * foot's height, which was right until the pads grew a label; a lane starting
   * 30 px below the button beside it; two labels ending on different lines.
   * The sentence the kit publishes is *the distance between two stacked
   * controls is three things, not one*, and nobody believes a sentence like
   * that until they see the three.
   * ⚠️ EVERY FIGURE IS READ OFF THE DOCUMENT, never typed. `--ctl-head`,
   * `--ctl-foot` and `--ctl-gap` are stated once in `shell.css` and
   * `--ctl-step` is declared as the sum of them there, so this block asks for
   * all four and draws what it was told. A number typed here would be a second
   * copy of a measurement and this project's rule is that two copies disagree.
   */
````

<a id="kit-devices-68"></a>
## kit-devices-68: demo/kit/devices/index.html, inline script, line 1442

````js
      /**
       * 🔴 THE BANDS ARE DRAWN AT THE HEIGHTS THE STYLESHEET STATES, so the
       * picture cannot disagree with the contract: each one is `height:
       * var(--ctl-*)` rather than a figure this block chose.
       * 🔴 AND `--ctl-step` IS DRAWN AS A FOURTH BAND BESIDE THE THREE RATHER
       * THAN PRINTED AS A NUMBER, WHICH IS ALSO THE ONLY WAY TO READ IT. A
       * custom property is SUBSTITUTED, not computed, so
       * `getPropertyValue('--ctl-step')` hands back the literal text
       * `calc(var(--ctl-foot) + var(--ctl-gap) + var(--ctl-head))` and
       * `parseFloat` of that is **NaN**. This block read NaN for one run. The
       * value only exists once a browser has resolved it against a real
       * property, so the band IS the measurement, and the two columns being the
       * same height is the whole claim in one look.
       */
````

<a id="kit-devices-69"></a>
## kit-devices-69: demo/kit/devices/index.html, inline script, line 1473

````js
      /**
       * 🔴 AND THE PAIR THE FIGURES ARE ABOUT, STACKED, WITH BOTH LABELS ON
       * BOTH. The check below measures the distance between the two BUTTONS,
       * which is where `--ctl-step` is supposed to land, and it needs a pad
       * that has something under it as well as over it or there is no foot in
       * the measurement.
       * 🔴 MEASURED WHILE WRITING THIS: TWO STACKED PADS WITH NO BOTTOM LABEL
       * SIT 23 px APART, NOT 40. That is `gap` plus `head` exactly, so the foot
       * slot is NOT reserved on a pad with nothing under it, while the head
       * slot IS reserved on a pad with nothing over it. The kit's own rule is
       * written about the head, so this is an asymmetry rather than a
       * contradiction, and it is left alone here and reported rather than
       * patched from a gallery. What it means for a caller is that `--ctl-step`
       * is the distance between two FULLY LABELLED controls and an upper bound
       * on any other pair.
       * ⚠️ THE SPECIMEN IS THIS BLOCK'S OWN. The two-lane grid in `PAD` is that
       * block's specimen and a check does not get to decide what a specimen
       * looks like, which is this project's rule about a check that mutates
       * arriving from the other side.
       */
````

<a id="kit-devices-70"></a>
## kit-devices-70: demo/kit/devices/index.html, inline script, line 1493

````js
      /**
       * ⚠️ AND THE COLUMN IS A REAL `createPadGrid`, NOT A FLEX COLUMN OF MY
       * OWN, WHICH IS ALSO A MEASUREMENT. A hand-rolled column read **32 px**
       * between the two buttons, which is `foot` plus `head` and no gap: the
       * `--ctl-gap` in the middle of the step belongs to the CONTAINER, and
       * `.pos-pad-grid` and `.pos-crow` are the two things in the kit that
       * declare it. So a specimen assembled by hand cannot demonstrate the
       * step, for the same reason the split readout block below had to be put
       * in a stack before its gaps existed at all.
       */
````

<a id="kit-devices-71"></a>
## kit-devices-71: demo/kit/devices/index.html, inline script, line 1515

````js
      /**
       * 🔴 AND A SLOT IS RESERVED EVEN WHEN IT IS EMPTY. One pad named above,
       * one with nothing there, and both buttons start on the same line; a grid
       * whose downbeats alone are named would otherwise have those pads sitting
       * higher than the rest, which reads as a rendering fault rather than as a
       * labelling choice.
       * ⚠️ MEASURE THE BUTTON, NEVER THE WRAPPER. A pad returns its wrapper as
       * `el` and exposes `button` separately; an assert reading the wrapper
       * once reported a button 17 px low while the button was exactly right.
       */
````

<a id="kit-devices-72"></a>
## kit-devices-72: demo/kit/devices/index.html, inline script, line 1535

````js
  /**
   * 🔴 AT THE BOTTOM, WHICH CONTRADICTS THIS PROJECT'S OWN RULE, DELIBERATELY.
   * CLAUDE.md, instructed 2026-09-16: *"in kit move online stuff to topmost
   * item (all new should land top, make rule)"*. Asked for the other way on
   * 2026-09-20: *"add pieces to kit as well (bottom section). i want to verify
   * ui first"*. The top is where a reader finds what ARRIVED since they last
   * looked, which is what a SETTLED component wants. These are not settled.
   * ⚠️ **WHEN THEY ARE ADOPTED THEY MOVE UP.** If this comment is still here and
   * they are in a shipped page, the move was forgotten.
   */
````

<a id="kit-devices-73"></a>
## kit-devices-73: demo/kit/devices/index.html, inline script, line 1545

````js
  /* 🔴 THE FOUR NAMES CAME OFF THE HEADING 2026-09-21, ASKED FOR AS *"rm :
     KNOB, PAD, HALF PAD, FADER"*. Each of the four has its own section on this
     page already, the snippet below names all four constructors, and a heading
     that lists its own contents is the caption the contents already are. */
````

<a id="kit-devices-74"></a>
## kit-devices-74: demo/kit/devices/index.html, inline script, line 1549

````js
  /**
   * 🔴 REAL CHANNELS SINCE 2026-09-22, AND THE REPORT SAID *"still"*: *"still
   * not aligned to vertical separated lanes"*. It had been asked for once
   * before and never started.
   *
   * 🔴 **WHAT WAS HERE WAS NOT A CHANNEL STRIP, AND ITS OWN DESCRIPTION SAID
   * SO**: *"the four shapes a hardware layout is built from"*. Four independent
   * HORIZONTAL rows, six knobs over eight pad columns over six faders, three
   * different pitches stacked, so nothing shared a column with anything above
   * it and a reader could not follow any channel down the picture. A catalogue
   * of four components arranged vertically, captioned as a channel strip.
   * ⚠️ **AND THE CATALOGUE IS NOT LOST**, which is why this is a rebuild rather
   * than an argument: KNOB, PAD and FADER each have their own block on this
   * page, which is where a reader compares shapes. This block is the one place
   * they are assembled, and assembly is the thing it was failing to show.
   *
   * 🔴 **THE DIVIDER IS THE PANEL'S OWN LINE.** `.panel-fixed-l` carries
   * `border-right: 1px solid var(--line)` with `padding-right:
   * var(--panel-gap)`, and `.kit-chan` uses the same two tokens, so a divider
   * here and a divider on `/twelve/` are one measurement.
   *
   * 🔴 **AND THE ALIGNMENT IS THE CONTRACT, NEVER ARITHMETIC IN THIS FILE.**
   * `--ctl-head` and `--ctl-foot` reserve the slot above and below every
   * working surface whether or not it is filled, so a column of a knob, two
   * pads and a fader lines up by itself. `positron-ui` records `/twelve/` being
   * corrected twelve times in one evening, every one of them the page doing
   * arithmetic about a component's insides. There is not one margin here.
   * ⚠️ **A KNOB IS `--ctl-w * 1.1` WIDE AND A PAD IS `--ctl-w`**, which is a
   * real difference rather than a bug, and `/circuit/` solves it by centring
   * both rather than resizing either. So does this.
   *
   * 🔴 **THREE ALIGNMENTS THAT LOOK LIKE ONE ARE THREE ASSERTS**, which is the
   * other half of the same record: two of `/twelve/`'s three lined up while the
   * third was 30 px out, and later the boxes matched while the faders inside
   * them were 17 px apart. The checks below read the DIAL, the BUTTON and the
   * LANE, never a wrapper.
   */
````

<a id="kit-devices-75"></a>
## kit-devices-75: demo/kit/devices/index.html, inline script, line 1633

````js
      /* ⚠️ ONE SHOWN AS MOVED BY HARDWARE, because that state is the reason the
         component tracks a source at all and it is invisible until something
         is in it. A live binding and one nobody ever bound look identical. */
````

<a id="kit-devices-76"></a>
## kit-devices-76: demo/kit/devices/index.html, inline script, line 1644

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

<a id="kit-devices-77"></a>
## kit-devices-77: demo/kit/devices/index.html, inline script, line 1770

````js
    /**
     * 🔴 ONE BORDER ROUND THE LOT AND NONE INSIDE IT, WHICH IS WHAT `.pos-glue`
     * PROMISES AND IS THE TEMPLATE THIS PAGE ALREADY USES FOR THE GLUED
     * TRANSPORT BAR. The seam is a flex `gap` showing the box's own ground
     * through, so it is never drawn and can never double.
     */
````

<a id="kit-devices-78"></a>
## kit-devices-78: demo/kit/devices/index.html, inline script, line 1788

````js
    /**
     * 🔴 EVERY ROW PAINTS ITS OWN GROUND, AND THIS IS THE ASSERT THAT MAKES THAT
     * A FACT RATHER THAN A COMMENT. `.pos-glue` is `gap: 1px` over a `--line`
     * ground, so a row with no background of its own lets the line colour
     * through its WHOLE area and the seam stops being a seam. Three callers have
     * each paid for that in their own stylesheet before the container owned it.
     * ⚠️ IT IS READ AGAINST A SURFACE THAT IS KNOWN TO BE `--card`, this page's
     * own specimen box, rather than against a token parsed out of a string.
     */
````

<a id="kit-devices-79"></a>
## kit-devices-79: demo/kit/devices/index.html, inline script, line 1807

````js
    /**
     * 🔴 THE SKETCH'S ORDER IS THE COMPONENT'S AND NOT THE CALLER'S. Graded
     * against the RENDERED children and against their tops, because a list this
     * module keeps and a page a browser drew are two different facts, and
     * `/pack/` has already been caught believing the first one.
     */
````

<a id="kit-devices-80"></a>
## kit-devices-80: demo/kit/devices/index.html, inline script, line 1822

````js
    /**
     * 🔴 AND A ROW ASKED FOR LATE STILL LANDS ABOVE THE KEYBOARD AND THE FOOT.
     * The node test grades this against a stub; this grades it against a browser,
     * which is the pair `instrument-test.mjs` already draws between the two.
     * ⚠️ IT PUTS THE ROW BACK, because a check does not get to leave a reader
     * looking at a panel they did not ask for.
     */
````

<a id="kit-devices-81"></a>
## kit-devices-81: demo/kit/devices/index.html, inline script, line 1841

````js
    /**
     * 🔴 A ROW THAT GOES AWAY TAKES ITS SEAM WITH IT, WHICH IS THE ONE THING A
     * STILL PICTURE OF THIS COMPONENT CANNOT SHOW. A `display: none` child takes
     * no `gap` in a flex column, so what is left is rows with one hairline
     * between each pair and no orphan rule where the row was.
     */
````

<a id="kit-devices-82"></a>
## kit-devices-82: demo/kit/devices/index.html, inline script, line 1863

````js
    /**
     * 🔴 LABEL AND CONTROL ROWS SHARE ONE COLUMN PAIR. Photographed: BOARD's
     * badge 10 px left of REVERB's and OCTAVE's controls, because each flex row
     * put its control where its own label's width left it. On the grid variant
     * every second child starts on one line and every first child on another.
     */
````

<a id="kit-devices-83"></a>
## kit-devices-83: demo/kit/devices/index.html, inline script, line 1881

````js
    /**
     * 🔴 THE SAME JUSTIFIED ROW IS JUSTIFIED AT FULL WIDTH AND LINEAR IN A
     * 320 px FRAME, ON ONE PAGE, DECIDED BY THE ROW'S OWN WIDTH. A between row
     * has two ends, so when it wraps each line holds one item and `space-between`
     * parks it at the start: two left-aligned lines at their own sizes, the
     * owner's *"go to left alignment in mobile and have gaps between elements,
     * not just squished"*. The first draft forced each child to a full line and
     * stretched a button across the row; so this also reads each child's WIDTH
     * in the frame against its width at full size, and requires them equal.
     */
````

<a id="kit-devices-84"></a>
## kit-devices-84: demo/kit/devices/index.html, inline script, line 1912

````js
    /**
     * 🔴 A START ROW THAT DOES NOT FIT WRAPS AS A CLUSTER: left-aligned, the
     * row's gap between items and between lines, nothing squished and nothing
     * past the inset. Eight octave buttons in a 320 px frame is two lines.
     */
````

<a id="kit-devices-85"></a>
## kit-devices-85: demo/kit/devices/index.html, inline script, line 1932

````js
    /**
     * 🔴 EDGE TO EDGE MEANS THE PICTURE'S OWN LEFT EDGE, AND A CONTROL ROW'S
     * INK STARTS ONE INSET FURTHER IN. This is the shape `/muta/` and `/fau/`
     * both left the case to get, and `/fau/` had to be told twice because a
     * fourth inset nobody had counted was the case's own.
     */
````

<a id="kit-devices-86"></a>
## kit-devices-86: demo/kit/devices/index.html, inline script, line 1949

````js
    /**
     * 🔴 A ROW'S INSET AND A CASE'S ARE ONE NUMBER, ASSERTED RATHER THAN
     * COMMENTED. `shell.css` declares `--rows-pad` as a second name for
     * `.panel-case`'s 20 px, because that one is redeclared as 0 on an uncased
     * panel and a glued surface is glued whether or not anybody built a case.
     * A measurement typed twice is a measurement that will disagree, and this
     * page is where the two are made to agree.
     */
````

<a id="kit-devices-87"></a>
## kit-devices-87: demo/kit/devices/index.html, inline script, line 1966

````js
    /**
     * 🔴 THE FOOT'S TWO ENDS ARE AT THE TWO ENDS, OR `place: 'ends'` MEANS
     * NOTHING. A plate sized to its own content inside a centred row would put
     * the name and the patch next to each other in the middle.
     */
````

<a id="kit-devices-88"></a>
## kit-devices-88: demo/kit/devices/index.html, inline script, line 1984

````js
    /**
     * 🔴 THE FOOT TAKES A CONTROL AT EACH END, AND EACH SITS ON THE ROW'S INSET.
     * The name and its switch are one start end and the picker is the other, so
     * the row is still two ends and goes linear on a phone by the rule above the
     * between row. Measured against the insets the way /muta/ grades its header,
     * so the two pages assert one claim.
     */
````

<a id="kit-devices-89"></a>
## kit-devices-89: demo/kit/devices/index.html, inline script, line 2001

````js
      /* ⚠️ AND NO CAPTION ON THE PICKER, READ OFF THE DOM UNDER THE RENDERED
         END rather than off this page's own call, which passes none: the
         panel's rule is that it strips one, and a specimen that never handed
         one in cannot grade that. The node test hands one in; this reads that
         the far end on screen carries nothing but the control. */
````

<a id="kit-devices-90"></a>
## kit-devices-90: demo/kit/devices/index.html, inline script, line 2014

````js
    /**
     * 🔴 AND REWRITING THE PATCH MOVES NOTHING ELSE, WHICH IS WHY IT IS THE
     * RIGHT-HAND END. A right-aligned box grows leftward into air. The name is
     * the fixed half and sits against the fixed edge.
     * ⚠️ IT PUTS THE ORIGINAL BACK, and it measures a LONGER name so a width
     * that did not change would be the failure rather than the pass.
     */
````

<a id="kit-devices-91"></a>
## kit-devices-91: demo/kit/devices/index.html, inline script, line 2038

````js
    /**
     * 🔴 A PATCH IS SHOWN AS IT WAS WRITTEN, AND THE NAME ABOVE IT IS NOT.
     * Asked 2026-09-26: *"patches are always sentence cased"*. Read off what
     * the browser renders (`shown()`) rather than off the source, which is the
     * half that made `/circuit/`'s uppercase check worth anything: a check on
     * `textContent` grades the string that was typed and stays green whether
     * or not a transform shouts it.
     */
````

<a id="kit-devices-92"></a>
## kit-devices-92: demo/kit/devices/index.html, inline script, line 2056

````js
    /**
     * 🔴 EVERY ROW'S INK STARTS ON ONE LINE, AND A COMPONENT BRINGS NO INSET OF
     * ITS OWN INTO A ROW. Photographed 2026-09-26: the keys sat 29 px from the
     * surface edge while `NOLA` and every knob row sat at 20, because the glue
     * rule stripped the keyboard's border and left its 9 px padding behind.
     * **Padding on a box that no longer has a border is a margin the component
     * invented, and a component does not own its outer margin.** So this walks
     * every row of every panel on the page and measures its FIRST child's left
     * edge against the row's content edge; anything but 0 is a component
     * carrying an inset the row already supplies. A row with its inset off is
     * measured against its border edge instead.
     * ⚠️ IT NAMES THE OFFENDERS, because *"fix systematically"* means all of
     * them and not the one in the crop.
     */
````

<a id="kit-devices-93"></a>
## kit-devices-93: demo/kit/devices/index.html, inline script, line 2076

````js
      /* ⚠️ THE FIRST DRAFT MEASURED THE CHILD'S BOX AGAINST THE ROW'S CONTENT
         EDGE AND NAMED THREE CENTRED KNOB ROWS AS OFFENDERS AT +216 px, while
         the keyboard, whose box IS flush and whose 9 px is INSIDE it, passed.
         The claim is about what a child carries, so that is what is read: its
         own left padding, border and margin, which a row's child must have none
         of. Alignment is the row's business and is graded elsewhere. */
````

<a id="kit-devices-94"></a>
## kit-devices-94: demo/kit/devices/index.html, inline script, line 2082

````js
      /* ⚠️ AND THE SECOND DRAFT FLAGGED A TOGGLE FOR ITS OWN 9 px OF PADDING
         INSIDE ITS OWN 1 px BORDER, WHICH IS THE CONTROL'S SHAPE AND NOT AN
         INSET. The owner's words draw the line: *"component without border but
         with padding is essentially component with margin"*. So three separate
         claims, each named in the detail: a MARGIN is never the child's; PADDING
         is an invented margin only where there is no border to frame it; and a
         BORDER inside a row is a box in a box only on something that is not a
         control, because a button's edge is the button. */
````

<a id="kit-devices-95"></a>
## kit-devices-95: demo/kit/devices/index.html, inline script, line 1838

````js
    /**
     * 🔴 A KEYBOARD IN A ROW GIVES UP ITS OWN BOX, AND THE HALF THAT SHOWS IS
     * ITS BOTTOM MARGIN. `.kbd` carries `margin: 0 0 10px`, which `.pos-glue`
     * zeroes on DIRECT children only, so a keyboard one level down would make a
     * row 10 px deeper at the bottom than at the top. That is this project's own
     * *"a reservation that only one of two equal things makes is a reservation
     * that breaks them"*, and the rule that fixes it is written `> X` and
     * `> * > X` because a direct-child selector once fixed one page and left
     * another exactly as reported.
     */
````

<a id="kit-devices-96"></a>
## kit-devices-96: demo/kit/devices/index.html, inline script, line 1858

````js
  /**
   * 🔴 THE TWO COLUMNS SHARE ONE PITCH, AND NOTHING IN THE BROWSER MAKES THEM.
   * The labels and the steps are separate flex children, so a pad's height and
   * a label row's height are two unrelated numbers that happen to be written
   * from one token. `/tom/` asserts this over 64 rows because `/twelve/`
   * records three alignments that looked like one with two of them lining up
   * while the third was 30 px out. Six rows is enough here and the claim is the
   * same: first row against first label, last against last.
   */
````

<a id="kit-devices-97"></a>
## kit-devices-97: demo/kit/devices/index.html, inline script, line 1867

````js
  /**
   * 🔴 A ROW THAT CANNOT FIT SCROLLS INSIDE ITSELF, AND THAT TAKES TWO
   * PROPERTIES ON ONE ELEMENT. `overflow-x` cannot shrink a flex or grid item
   * below its content, so a scroller without `min-width: 0` beside it drags the
   * PAGE instead, and `positron-ui` has 141 px of measured page overflow from
   * exactly that pair being half written.
   * 🔴 AND BOTH OF THESE WERE HALF WRITTEN UNTIL 2026-09-22, REPORTED FROM A
   * PHONE. `.pos-padgrid` had the `min-width` and not the overflow, so eight
   * fixed columns spilled 27 px out of their own box; the channel strip's own
   * scroller (`.kit-hwitems` then, `.kit-chans` now) had the
   * same half, and one channel strip at 424 px in a 358 px box dragged the
   * document **65 px sideways**. Both comments beside those rules claimed a
   * behaviour the rules did not have, one saying it wrapped and one saying this
   * project refuses horizontal scroll.
   * ⚠️ **THIS READS THE COMPUTED VALUE AND NOT THE STYLESHEET**, which is the
   * only thing that knows which rule won, and it is the fourth dead rule this
   * repository has found that way.
   * ⚠️ **AND IT IS NOT A PHONE CHECK.** `demo/verify.mjs` runs at 756 px with
   * no viewport override, so nothing here has entered a media query. What this
   * grades is that the two properties are still declared together. The
   * overflow itself was measured by hand at 390 px across all ten tabs, page
   * overflow 0, and nothing in this suite can say that.
   */
````

<a id="kit-devices-98"></a>
## kit-devices-98: demo/kit/devices/index.html, inline script, line 1891

````js
    /* 🔴 `.pos-cg` JOINED THIS LIST 2026-09-22 AND SHIPPED WITH NEITHER HALF.
       Its columns are fixed at the measured pitch and never `1fr`, precisely so
       the lattice stays square at every width, so a five wide grid of 50.6 px
       knobs is 280 px whatever the phone is and had nowhere to go but the
       document. Third component with the same defect in three days. */
````

<a id="kit-devices-99"></a>
## kit-devices-99: demo/kit/devices/index.html, inline script, line 1912

````js
  /**
   * 🔴 THE PLATE IS READ AS THE BROWSER RENDERS IT, NOT AS THE PAGE TYPED IT.
   * `createNameplate.shown()` applies the `text-transform` before answering,
   * and `panel-layout.mjs` records why: `/circuit/` rendered `NOVATION`
   * correctly while its source typed `novation`, leaning entirely on the
   * stylesheet, and a check reading `textContent` graded the source and stayed
   * green whichever half went missing.
   * ⚠️ AND THE SECOND HALF IS THE SINGLE LINE CASE, which is the one a caller
   * can get wrong: `ends` is `space-between` and parks a lone child on the
   * LEFT, so a plate with no maker has to be `end`. `plateSpec` decides it and
   * this reads the decision off the rendered plate.
   */
````

<a id="kit-devices-100"></a>
## kit-devices-100: demo/kit/devices/index.html, inline script, line 1924

````js
  /**
   * 🔴 THE CLAIM IS THE SQUARE, SO THE CHECK MEASURES DIAL CENTRES AND NOTHING
   * ELSE. Asserting the pitch token would grade what the component WROTE; the
   * request was about where the working surfaces land, which is one layer out
   * and is the only thing a reader can see.
   * ⚠️ **AND IT IS A LATTICE, NOT ONE PAIR.** Across against down on a three
   * by two, so a grid that happened to be square at cell zero and drifted
   * cannot pass. The `/twelve/` lesson is exactly this: two of three
   * alignments lined up while the third was 30 px out.
   * ⚠️ THE NEGATIVE CONTROL IS THE FADERS. A different control with a
   * different natural shape, on the same rule, so a component that only
   * happened to work for knobs goes red.
   */
````

<a id="kit-devices-101"></a>
## kit-devices-101: demo/kit/devices/index.html, inline script, line 1937

````js
  /**
   * 🔴 THE INVISIBLE HAND ON A KNOB, GRADED WHERE IT IS DEMONSTRATED. Three
   * claims, and they are three asserts rather than one because two of them
   * lined up on `/twelve/` while the third was 30 px out.
   */
````

<a id="kit-devices-102"></a>
## kit-devices-102: demo/kit/devices/index.html, inline script, line 1951

````js
    /* WHERE THE RING'S LOWER EDGE ACTUALLY IS ON SCREEN, from the drawing's own
       fraction rather than from a number typed here. */
````

<a id="kit-devices-103"></a>
## kit-devices-103: demo/kit/devices/index.html, inline script, line 1965

````js
    /* 🔴 THE ONE THAT MATTERS MOST, AND IT IS THE REASON THE BUTTON IS
       ABSOLUTE. A control that gained height here would push its own label down
       and every knob beside it would be a label out of line, which is the
       `--ctl-head` and `--ctl-foot` contract `positron-ui` states. */
````

<a id="kit-devices-104"></a>
## kit-devices-104: demo/kit/devices/index.html, inline script, line 1975

````js
    /* 🔴 THE SIZE ASK, MEASURED AS A RATIO AND NOT AS A PIXEL COUNT. `--ctl-w`
       is the thing 10 per cent was asked against, so the assert reads both and
       divides rather than believing 50.6. */
````

<a id="kit-devices-105"></a>
## kit-devices-105: demo/kit/devices/index.html, inline script, line 1987

````js
    /* 🔴 THE NEGATIVE CONTROL: a knob that was not given one has no button at
       all. Without this, a selector that matched nothing would satisfy every
       assert above by never running them. */
````

<a id="kit-devices-106"></a>
## kit-devices-106: demo/kit/devices/index.html, inline script, line 1999

````js
    /* ⚠️ `dy` IS null ON A SINGLE ROW, AND MY FIRST VERSION READ `c[cols].y`
       UNCONDITIONALLY AND THREW ON THE FADERS, WHICH ARE FOUR IN FOUR COLUMNS.
       The page died on `__demo.ready` rather than failing an assert, which is
       the worst shape: the harness names itself and nothing in the per-page
       count moves to say what changed. A grid with no second row has no down
       to measure and says so. */
````

<a id="kit-devices-107"></a>
## kit-devices-107: demo/kit/devices/index.html, inline script, line 2022

````js
    /* 🔴 EVERY COLUMN, NOT THE FIRST PAIR. A fixed track count makes this true
       by construction, which is the point: it is graded so that the day
       somebody reaches for `1fr` it goes red rather than being square at one
       width only. */
````

<a id="kit-devices-108"></a>
## kit-devices-108: demo/kit/devices/index.html, inline script, line 2030

````js
    /* 🔴 THE NEGATIVE CONTROL THAT USED TO SIT HERE IS GONE WITH ITS SPECIMEN,
       2026-09-22, and the block above says at length what stopped being
       checked. It read `NEGATIVE CONTROL: a grid of faders keeps the same
       centre to centre rule`.
       ⚠️ THE ONE THING WORTH KEEPING OUT OF IT IS THE TERM THAT MADE IT RIGHT:
       CENTRE TO CENTRE IS THE PITCH PLUS THE GAP. It read the pitch alone once
       and went red at `166 apart at a 156 px pitch`, and the ten it was out by
       IS the gap. The knob grids show the same, 101 across at a 91 px pitch, so
       the two asserts above carry that term and are the reason this note is
       here rather than in a commit message nobody will find. */
````

<a id="kit-devices-109"></a>
## kit-devices-109: demo/kit/devices/index.html, inline script, line 2044

````js
    /* 🔴 THE COMPUTED `justify-content`, AND MY FIRST TRY READ RECTS AND WENT
       RED ON A PLATE DOING EXACTLY WHAT IT PROMISES. A `.panel-plate-l` is a
       full width flex child, so its own left and right edges sit at the
       plate's whatever the placement is, and both offsets came back `0.0 px`.
       The rect could not see the difference; the property that implements it
       can. `ends` is `space-between` and `end` is `flex-end`, which is the
       whole of what those two placements are. */
````

<a id="kit-devices-110"></a>
## kit-devices-110: demo/kit/devices/index.html, inline script, line 2051

````js
    /* ⚠️ THE ONE LINE HALF OF THIS ASSERT MOVED UP THE PAGE WITH ITS SPECIMEN.
       It read `bare.length === 1 && bare[0] === 'MODEL 12'` and `end` is
       `flex-end`, and the INSTRUMENT HEADER block grades both against its own
       one line plate. What is no longer graded ANYWHERE is `end` inside a
       case's top inset, which is named in the comment above this block. */
````

<a id="kit-devices-111"></a>
## kit-devices-111: demo/kit/devices/index.html, inline script, line 2062

````js
    /* 🔴 THE PLATE BELONGS TO THE CASE, ABOVE BOTH HALVES, or it scrolls away
       from the instrument it names. `/tom/` found that by prepending. */
````

<a id="kit-devices-112"></a>
## kit-devices-112: demo/kit/devices/index.html, inline script, line 2064

````js
    /**
     * 🔴 THE PLATE SITS OFF THE TOP BY THE CASE'S OWN INSET, AND NOTHING
     * GRADED THIS UNTIL 2026-09-22. `.panel-case` is `padding: 0
     * var(--panel-pad)`, horizontal only, so a plate put in from outside sat
     * on the top border. `/tom/` repaired that in its OWN stylesheet, `/plai/`
     * had no such rule, and this wrapper shipped the defect to a new page on
     * the day it was written to prevent it.
     * ⚠️ **THE CLAIM IS AN EQUALITY, NOT A NUMBER.** The plate is as far from
     * the top as the controls are from the sides, so nobody can satisfy this
     * by typing a value they liked, and a change to `--panel-pad` moves both
     * together or goes red.
     */
````

<a id="kit-devices-113"></a>
## kit-devices-113: demo/kit/devices/index.html, inline script, line 2080

````js
      /* 🔴 THE LINE, NOT THE PLATE'S BOX, AND THIS WENT RED FIRST FOR READING
         THE WRONG EDGE. The inset is `padding-block` on the plate, so the plate
         BOX starts at the case's content top and its TEXT sits 20 px down. The
         box's own rect reported `0.0 px` while the picture was correct. What a
         reader sees is the line. */
````

<a id="kit-devices-114"></a>
## kit-devices-114: demo/kit/devices/index.html, inline script, line 2094

````js
    /* ⚠️ THE STRIP IS NOT A CHILD OF THE CASE, IT IS INSIDE `panel-wrap`, and
       my first reading of this assumed otherwise and went red saying so. What
       the claim is really about is ORDER: the plate is first, and everything
       the panel builds comes after it, so the plate cannot scroll away from
       the instrument it names. `compareDocumentPosition` answers that whatever
       the nesting turns out to be. */
````

<a id="kit-devices-115"></a>
## kit-devices-115: demo/kit/devices/index.html, inline script, line 2111

````js
    /**
     * 🔴 THREE ALIGNMENTS THAT LOOK LIKE ONE ARE THREE ASSERTS. `positron-ui`
     * records two of `/twelve/`'s three lining up while the third was 30 px
     * out, and later the boxes matching perfectly while the faders inside them
     * were 17 px apart. One summary check would have passed both times.
     * 🔴 **AND EACH ONE READS THE WORKING SURFACE, NEVER THE WRAPPER.** A pad
     * returns its wrapper as `el` and exposes `button` separately, and an
     * assert reading the wrapper once reported a button 17 px low while the
     * button was exactly right. A knob's surface is `.pos-knob-dial`, a pad's
     * is its `button`, a fader's is `.pos-fdr-lane`.
     */
````

<a id="kit-devices-116"></a>
## kit-devices-116: demo/kit/devices/index.html, inline script, line 2145

````js
    /**
     * 🔴 THE DIVIDER IS BETWEEN LANES AND NOT INSIDE ONE, WHICH IS THE OTHER
     * HALF OF THE REPORT. It is read as the computed border rather than as a
     * class name, and the last lane has to have none or the strip ends in a
     * line with nothing after it.
     * ⚠️ AND IT IS THE PANEL'S LINE, checked against the same token
     * `.panel-fixed-l` uses rather than against a colour typed here.
     */
````

<a id="kit-devices-117"></a>
## kit-devices-117: demo/kit/devices/index.html, inline script, line 2168

````js
    /* 🔴 THE NEGATIVE CONTROL: the lanes are really four separate columns and
       not one column with four things in it. Without this, every assert above
       would pass on a single lane holding everything, because one lane's
       controls are trivially on one centre. */
````

<a id="kit-devices-118"></a>
## kit-devices-118: demo/kit/devices/index.html, inline script, line 2182

````js
    /**
     * 🔴 THE CENTRE IS ON THE CASE, NOT BETWEEN ITS NEIGHBOURS, AND THAT IS THE
     * WHOLE ASK: *"center patch selector (optically center to the instrument)"*.
     * It is read against the CASE'S OWN BOX rather than against the header's,
     * because the header is the thing under test and grading a thing against
     * itself is how a check comes out true by construction.
     * ⚠️ AND BOTH CASES ARE READ, because the two have deliberately different
     * outer contents: `POSITRON PLAI` with a button on the left against
     * `MODEL 12` with a badge. One of them being centred is luck.
     */
````

<a id="kit-devices-119"></a>
## kit-devices-119: demo/kit/devices/index.html, inline script, line 2195

````js
      /* 🔴 THE MIDDLE CELL IS THE NAMEPLATE SINCE 2026-09-22: *"move patch
         selector the right and nameplate to center"*. The claim never was about
         the picker, it is that whatever sits in column 2 is centred on the CASE
         rather than balanced between two unequal neighbours, so it follows the
         cell rather than its tenant. */
````

<a id="kit-devices-120"></a>
## kit-devices-120: demo/kit/devices/index.html, inline script, line 2217

````js
    /* 🔴 THE NEGATIVE CONTROL, AND IT IS THE REASON THIS IS A GRID. A flex row
       puts its middle child wherever the difference between two unequal
       neighbours leaves it, which is a different place on every panel. If that
       answer happened to agree here, the assert above would be proving
       nothing. */
````

<a id="kit-devices-121"></a>
## kit-devices-121: demo/kit/devices/index.html, inline script, line 2228

````js
    /**
     * 🔴 A CONTROL THAT ACTS IS A BUTTON AND ONE THAT REPORTS IS NOT, AND THE
     * PRESS IS DRIVEN HERE RATHER THAN ASSUMED. `positron-ui` calls a control
     * whose only honest behaviour is to do nothing *"the shape of control this
     * project calls a lie"*, and a callback nobody calls is a binding nothing
     * grades.
     * ⚠️ IT IS NOT IN `.pos-controls`, so no harness presses it and this is the
     * only place it is ever pressed.
     */
````

<a id="kit-devices-122"></a>
## kit-devices-122: demo/kit/devices/index.html, inline script, line 2245

````js
    /**
     * 🔴 THE SWITCH IS THE SAME WIDTH IN BOTH STATES, AND `(same w)` IS THE ASK
     * RATHER THAN A CHECK SOMEBODY THOUGHT OF. Asked 2026-09-25: *"just [() ON]
     * and [() OFF] (same w)"*. `off` is one character wider than `on`, so a
     * control sized to whichever word is showing changes size under the finger
     * that pressed it, which is the rule the transport bar already states about
     * its own two state button.
     * 🔴 AND IT IS EXACT, NOT CLOSE. A tolerance here would hide precisely the
     * defect being asked about, because the two words differ by one character
     * and one character is 6.62 px on this face.
     * 🔴 **DRIVEN BY A REAL PRESS, FROM WHATEVER STATE THE ASSERT ABOVE LEFT
     * IT IN.** Setting the state twice from one starting point would compare a
     * badge against itself, which is this project's own rule about a statistic
     * that is constant by construction over its subject.
     * ⚠️ AND IT WAITS OUT THE SWAP. The word fades 90 ms out, changes at the
     * trough and fades 90 ms back, so reading immediately would grade the word
     * that is leaving.
     * ⚠️ THE ARIA LABEL IS THE OTHER HALF AND IT KEEPS THE NAME. `of` was not
     * removed, only hidden from the paint: the eye reads the nameplate on the
     * same row and a screen reader reads this, and *"switch on and off"* would
     * name nothing.
     */
````

<a id="kit-devices-123"></a>
## kit-devices-123: demo/kit/devices/index.html, inline script, line 2269

````js
      /* ⚠️ THE MEASURING WINDOW IS SHUT ACROSS BOTH WAITS, which is the third
         place it has to be. A word swaps at the trough of a 90 ms fade, so this
         has to wait twice, and an `await` inside the window is a frame drawn
         with all parts open. The check at the foot of this file counts
         those and its own comment records taking a `settle()` out reading
         `3 frames`. */
````

<a id="kit-devices-124"></a>
## kit-devices-124: demo/kit/devices/index.html, inline script, line 2288

````js
      /* 🔴 THE RESERVE IS THE EXACT HALF AND THE RENDERED WIDTH IS THE
         SUB-PIXEL ONE, AND BOTH ARE HERE BECAUSE ONLY TOGETHER DO THEY SAY WHAT
         WAS ASKED. `--pres-ch` is a CHARACTER COUNT computed off the words
         themselves, so `3` is `off` and nothing else, and it cannot drift. The
         rendered widths then differ by 0.02 px, which is text metrics inside a
         box that does not move: the defect being asked about is one CHARACTER,
         6.62 px on this face, and 0.1 px cannot hide 6.62. `/kit/`'s own
         presence check reads a spread of 0.02 on the same component. */
````

<a id="kit-devices-125"></a>
## kit-devices-125: demo/kit/devices/index.html, inline script, line 2308

````js
    /* 🔴 THE OTHER HALF, AS AN ABSENCE. A badge that was a button with the
       handler left off would satisfy the assert above by never being pressed.
       ⚠️ IT READS THE STATUS CELL AND NOT THE HEADER. My first version asked
       the whole header for buttons and went red at `2 buttons` on a header
       doing exactly what it promises: the PATCH SELECTOR has a prev and a next.
       That is the project's own rule about measuring the quantity in question
       rather than one beside it, arriving one element out. */
````

<a id="kit-devices-126"></a>
## kit-devices-126: demo/kit/devices/index.html, inline script, line 2324

````js
    /* The plate in a header is `end` whether it has one line or two, which is
       the placement the removed INSTRUMENT specimen used to demonstrate.
       🔴 AND IT IS THE MIDDLE CELL SINCE 2026-09-22, not the last: *"move patch
       selector the right and nameplate to center"*. The placement stays `end`
       and that is not a contradiction: `end` is how a plate lays its own lines
       out, and the column is where the header puts it. This asserted both and
       had to follow the one that moved. */
````

<a id="kit-devices-127"></a>
## kit-devices-127: demo/kit/devices/index.html, inline script, line 2342

````js
    /* ⚠️ THE HEADER IS THE CASE'S FIRST CHILD FOR THE REASON THE PLATE IS: it
       belongs to the case, above both halves, or it scrolls away. And the case
       carries no plate of its own, because two names on one instrument is the
       failure this option could have shipped. */
````

<a id="kit-devices-128"></a>
## kit-devices-128: demo/kit/devices/index.html, inline script, line 2352

````js
    /**
     * 🔴 THE PHONE LAYOUT IS THREE LEVELS AND NOTHING HERE CAN GRADE IT.
     * `demo/verify.mjs` runs at 756 px with no viewport override, so this page
     * has never entered that media query and never will. What IS checkable is
     * the failure this repository has measured: `.pos-pick`'s entire phone
     * layout sat ABOVE the plain rule that beat it at every width and had never
     * run in its life. A media query adds no specificity, so order decides.
     * ⚠️ **ORDERING IS NOT BEHAVIOUR**, and this assert claims only ordering.
     */
````

<a id="kit-devices-129"></a>
## kit-devices-129: demo/kit/devices/index.html, inline script, line 2379

````js
    /**
     * 🔴 THE NEEDLE LANDS ON THE STEP, WHICH IS THE WHOLE REASON THE ROUNDING
     * IS THE COMPONENT'S AND NOT THE PAGE'S. A page that rounds on the way out
     * leaves the dial where the number is not, and the only thing that can tell
     * those apart is reading the DRAWING. The pointer path is
     * `M cx cy L ex ey` with the tick between r=24 and r=32 off a centre at
     * 50,50, so the angle comes straight out of it.
     */
````

<a id="kit-devices-130"></a>
## kit-devices-130: demo/kit/devices/index.html, inline script, line 2409

````js
    /* 🔴 THE NEGATIVE CONTROL, AND IT PROTECTS EVERY OTHER KNOB ON THE SITE. A
       snap leaking into the default would quantise thirty pages while both
       asserts above stayed green. */
````

<a id="kit-devices-131"></a>
## kit-devices-131: demo/kit/devices/index.html, inline script, line 2417

````js
    /**
     * 🔴 THE NUMBER'S BOX DOES NOT MOVE, WHICH IS THE `"stop wiggling"` REPORT.
     * Two readings at values with DIFFERENT DIGIT COUNTS, which is the half
     * that makes this a measurement: comparing two values that print the same
     * number of characters is a check that cannot fail. `positron-verify`
     * records three subjects agreeing to the digit being a broken collector.
     */
````

<a id="kit-devices-132"></a>
## kit-devices-132: demo/kit/devices/index.html, inline script, line 2440

````js
      /* 🔴 THE NEGATIVE CONTROL FOR THE SAME BOX: the reserve is a real number
         off the component and not an empty box that never had a width. A
         0 to 127 knob reserves three characters and a -1 to 1 knob five. */
````

<a id="kit-devices-133"></a>
## kit-devices-133: demo/kit/devices/index.html, inline script, line 2464

2026-10-15: the named grid left this assert with its label column (the drum
grids dropped it on the owner's ask); it measures the numbered grid alone, and a
second assert grades the drum grid's pad hovers instead. The assert was, verbatim:

````js
  if (namedSpec && gridSpec) {
    /* Nothing in either label column is cut. The numbered grid's column is over 22 px since
       its corner says `beat`; its digits alone would sit at the 22 px floor.
       See lessons/page-kit-devices.md#kit-devices-133 */
    const cutIn = (g) => [...g.labels, g.fixed.querySelector('.pos-pg-corner')]
      .filter((l) => l && l.scrollWidth > l.clientWidth + 0.5).map((l) => l.textContent);
    const cut = [...cutIn(namedSpec.named), ...cutIn(gridSpec.edit)];
    const w = namedSpec.named.fixed.getBoundingClientRect().width;
    const nw = gridSpec.edit.fixed.getBoundingClientRect().width;
    d.assert('a step grid label column is as wide as its widest label, so no name and no corner word is cut',
      cut.length === 0 && w > 22 && nw >= 22,
      `named column ${w.toFixed(1)} px, numbered column ${nw.toFixed(1)} px, ${cut.length ? `${cut.join(', ')} cut` : 'nothing cut'}`);
  }
````

````js
    /* 🔴 NOTHING IN EITHER LABEL COLUMN IS CUT, which is what a column sized to
       its widest label promises. The numbered grid below is wider than 22 px
       since 2026-10-12 because its corner says `beat`, which at 22 px was cut
       to `bea`; its digits alone would sit at the 22 px floor, as /tom/'s do. */
````

<a id="kit-devices-134"></a>
## kit-devices-134: demo/kit/devices/index.html, inline script, line 2492

````js
    /* 🔴 THE PADS ARE SQUARE AND THEY FILL THE ROOM, which is the measured size
       doing its job. Neither half can be read off the stylesheet: the token is
       written from script. */
````

<a id="kit-devices-135"></a>
## kit-devices-135: demo/kit/devices/index.html, inline script, line 2501

````js
    /* 🔴 THE READ ONLY GRID LEFT THIS BLOCK ON 2026-09-22 AND ITS ASSERT WENT
       WITH IT, WHICH IS WORTH SAYING RATHER THAN LEAVING AS A GAP IN A COUNT.
       It read that a read only pad is a `DIV` with no tab stop, a default
       cursor and full opacity, because `disabled` would say *switched off*
       about a picture that is perfectly current. **The structural half is
       graded without a browser** in `demo/shell/step-grid-test.mjs`, which
       reads the branch off the source. **The computed half is not graded
       anywhere now**: the cursor, the opacity and the rendered tab stops are
       claims nothing makes. `/pack/` is the page that uses that shape and is
       where the check belongs if it is wanted back. */
````

<a id="kit-devices-136"></a>
## kit-devices-136: demo/kit/devices/index.html, inline script, line 2516

````js
    /* A lit pad on a row that can make no sound stays grey, because brightness
       here says WHETHER THIS CAN SOUND and nothing else can tell a reader. */
````

<a id="kit-devices-137"></a>
## kit-devices-137: demo/kit/devices/index.html, inline script, line 2527

````js
    /**
     * 🔴 NEITHER HEAD REPLACES THE FIELD ANY MORE, AND THAT IS THE SECOND HALF
     * OF A REPORT MADE TWICE. `/tom/` said *"hilite should not kill my 1st col
     * beat bg color"* about the PARKED head and it was moved to a filter. The
     * running head went on replacing `background` until 2026-09-22, when the
     * same complaint arrived about it: *"its rms cell orginial color ...
     * preseve original button hue a bit"*.
     * ✅ SO THE CLAIM IS NOW THAT THE PAD'S OWN COLOUR SURVIVES BOTH STATES,
     * which is what makes `[data-on]`, `[data-mute]` and `[data-bar]` readable
     * under a head at all. A running head is an inset wash layered OVER that
     * colour, so the two states are told apart by the shadow and not by the
     * background.
     * ⚠️ AND THE NEGATIVE HALF IS THE ONE THAT MATTERS: a parked head must NOT
     * carry the wash, or the difference between waiting and running is gone.
     */
````

<a id="kit-devices-138"></a>
## kit-devices-138: demo/kit/devices/index.html, inline script, line 2561

````js
    /**
     * 🔴 THE CLOCK BELONGS TO THE PAGE AND SAYS SO, AND A GRID WITH NO TEMPO TO
     * CLAIM GETS NO CLOCK AT ALL. That is `/pack/`'s case: nothing in a Circuit
     * session names a rate, so a play button there would be a number presented
     * as the file's. The read only grid here was given no rate, and the
     * component answers `null` rather than a control that lies, and
     * `step-grid-test.mjs` asserts BOTH that absence and the throw on a rate
     * with no `whose`, so neither claim depends on a grid standing here.
     * ⚠️ IT IS PLAYED AND STOPPED ON THESE LINES AND PUT BACK, with no `await`
     * between them, so no frame is rendered in the middle and nobody reading
     * the page sees it happen.
     */
````

<a id="kit-devices-139"></a>
## kit-devices-139: demo/kit/devices/index.html, inline script, line 2585

````js
    /**
     * 🔴 THE 320 px SCROLLER LEFT THIS BLOCK ON 2026-09-22 WITH THE OTHER
     * EXAMPLES, and what it measured is named here rather than left as a hole.
     * It asserted that at a phone's width the STRIP scrolls and the page does
     * not, which takes `overflow-x: auto` AND `min-width: 0` on one element,
     * and this repository has measured 141 px of page overflow from that pair
     * being half written. **The arithmetic behind it survives** as the
     * negative control below and in `step-grid-test.mjs`. **The rendered half
     * does not**, and no check now watches a real strip scroll.
     *
     * 🔴 WHAT REPLACES IT IS THE THING THE BLOCK IS NOW ABOUT: the bar and the
     * grid are ONE surface with a 1 px seam, and the bar is ABOVE. A glue that
     * quietly stopped gluing would look like ordinary spacing, which is
     * exactly the failure `/pack/` met from the other direction when four
     * parts in one glue left a panel with a single child and no rhythm at all.
     */
````

<a id="kit-devices-140"></a>
## kit-devices-140: demo/kit/devices/index.html, inline script, line 2614

````js
    /**
     * 🔴 BOTH AXES ON ONE GRID AND NEITHER ON THE OTHER, WHICH IS THE ASK AND
     * ITS OWN NEGATIVE CONTROL IN ONE PAIR. The absence is the half worth
     * grading: a component that numbered every ruler whatever it was told would
     * pass any check that only looked at the labelled one.
     * ⚠️ AND THE STEP AXIS IS COUNTED AS BEATS, NOT AS STEPS. Sixteen steps at
     * four to a beat is FOUR numbers, which is the decision `tickText` records:
     * a number under every one of 64 steps is the wrapping heading defect in a
     * new costume.
     */
````

<a id="kit-devices-141"></a>
## kit-devices-141: demo/kit/devices/index.html, inline script, line 2643

````js
    /**
     * 🔴 THE RIGHT INSET AND THE BOTTOM ONE ARE THE SAME MEASUREMENT, AND THAT
     * IS TWO CLAIMS RATHER THAN ONE. Asked as *"make sure right padding is same
     * as bottom"* from a crop of the last pad nearly touching the right edge.
     * The computed pair is the stylesheet's claim; the RENDERED distance from
     * the last pad to the content edge is what the crop actually showed, and a
     * scroll container can satisfy the first and fail the second.
     */
````

<a id="kit-devices-142"></a>
## kit-devices-142: demo/kit/devices/index.html, inline script, line 2671

````js
    /**
     * 🔴 THE TRAIL IS A TRANSITION AND NOTHING ELSE, WHICH IS WHY THERE IS NO
     * TRAIL CODE TO FIND. Only one column is ever marked, so every other lit
     * column behind the head is a cell still easing out. Reported from a
     * screenshot at step 13 as *"make 2nd and 3nd fade fade faster"*.
     * ⚠️ **THE NUMBER ONLY MEANS ANYTHING AS A FRACTION OF A STEP.** At 120
     * beats a minute with four steps to a beat a step is 125 ms, so the old
     * 320 ms fall was 2.6 steps of tail and the third column was still visibly
     * lit. It is asserted against the component's own `stepMsFor`, so the claim
     * survives a change of tempo rather than being a millisecond count.
     * ⚠️ **AND THE LAMP KEEPS ITS FILAMENT.** The rise stays shorter than the
     * fall, so shortening the tail did not undo the earlier repair that made
     * the light arrive smoothly.
     */
````

<a id="kit-devices-143"></a>
## kit-devices-143: demo/kit/devices/index.html, inline script, line 2694

````js
      /* 🔴 THE NEGATIVE CONTROL: the two directions really are two rules. One
         duration on the head's rule would give a lamp with no filament, and
         the earlier report that bought the asymmetry would be back. */
````

<a id="kit-devices-144"></a>
## kit-devices-144: demo/kit/devices/index.html, inline script, line 2518

````js
    /**
     * 🔴 THE FLOOR IS WHAT MAKES THAT SCROLL RATHER THAN MAKING THE PADS
     * VANISH, and it is the NEGATIVE CONTROL for the measurement above: without
     * it a 320 px box over sixteen steps still fits, so the case that proves
     * the floor is a step count that does not. `/tom/` opened at 64 steps.
     */
````

<a id="kit-devices-145"></a>
## kit-devices-145: demo/kit/devices/index.html, inline script, line 2531

````js
  /**
   * 🔴 THE THREE DRAWN FIGURES ARE GRADED ON WHETHER INK REACHED THE CANVAS,
   * WHICH IS THE ONE THING `synth-view-test.mjs` SAYS IT CANNOT SEE. Every
   * claim below needs a document: a picture whose arithmetic is perfect and
   * whose `clientWidth` is zero draws nothing at all and looks like a component
   * that was never wired up.
   * ⚠️ `redraw()` FIRST, AND IT IS NOT A WORKAROUND. A resize observation
   * arrives a frame after a panel is laid out, and this window holds no
   * `await`, so a figure last painted while its tab was shut is still at zero
   * width on this line. A reader never meets it, because opening a tab gives
   * the observer its frame.
   */
````

<a id="kit-devices-146"></a>
## kit-devices-146: demo/kit/devices/index.html, inline script, line 2549

````js
    /**
     * 🔴 THE DENOMINATOR IS HERE BECAUSE THIS ASSERT WAS BLIND FOR ONE RUN AND
     * WAS GREEN THE WHOLE TIME. It read `inks.every(n => n > 200)` and reported
     * **10032, 10032, 10032**, three different envelope shapes agreeing to the
     * digit, because `ink()` was comparing each pixel against `--card` parsed
     * with `/\d+/g` and `#11151d` answers the single number 11151. Every
     * painted pixel counted, so the statistic was the AREA OF THE BOX. Three
     * subjects agreeing exactly is a broken collector and never a finding, and
     * it is the only reason this was caught.
     * ⚠️ SO THE CLAIM IS NOW A SHARE RATHER THAN A COUNT. A drawn envelope is a
     * line and a few words, which is a small part of its box; a filled field is
     * all of it. The two are now different numbers, which they were not.
     */
````

<a id="kit-devices-147"></a>
## kit-devices-147: demo/kit/devices/index.html, inline script, line 2567

````js
    /* 🔴 THE FIGURE FOLLOWS THE SETTING, MEASURED BY MOVING ONE AND PUTTING IT
       BACK. A picture that ignored its inputs would look completely ordinary
       and would pass every check above. Synchronous, so no frame is rendered
       in the middle of it. */
````

<a id="kit-devices-148"></a>
## kit-devices-148: demo/kit/devices/index.html, inline script, line 2598

````js
  /**
   * 🔴 THE FILTER IS THE ONE WITH THE HONESTY PROBLEM, so it gets the checks
   * about refusing. A drawn response curve is acceptable here only because it
   * says on its own face that it is a schematic and because a type name it
   * cannot read is refused rather than drawn as the default low pass.
   */
````

<a id="kit-devices-149"></a>
## kit-devices-149: demo/kit/devices/index.html, inline script, line 2606

````js
    /* ⚠️ THE REFUSAL HAS TO CARRY LESS INK THAN A DRAWN CURVE, which is the
       half that says the two states are really different pictures rather than
       one picture and a count that cannot see. Two lines of words are fewer
       marked pixels than a curve across the whole box with a grid under it. */
````

<a id="kit-devices-150"></a>
## kit-devices-150: demo/kit/devices/index.html, inline script, line 2618

````js
    /* 🔴 THE NEGATIVE CONTROL A DRAWER THAT IGNORED ITS TYPE WOULD FAIL. Any
       curve that slopes satisfies "a low pass goes down"; only a curve that
       really reads the name has a low pass and a high pass disagreeing at BOTH
       ends. Driven through the live component and put back. */
````

<a id="kit-devices-151"></a>
## kit-devices-151: demo/kit/devices/index.html, inline script, line 2643

````js
    /**
     * 🔴 A SQUARE LATTICE IS A CLAIM ABOUT CONTROLS THAT ARE TALLER THAN THEY
     * ARE WIDE, AND THIS IS WHERE THAT CLAIM IS PAID FOR. `createControlGrid`
     * writes `gridAutoRows` at the same pitch as its columns, so a cell is as
     * tall as the WIDEST thing in the grid. Put a 300 px wide horizontal
     * slider in and every row becomes 300 px tall for a 40 px control, which is
     * the empty case condition `panel-layout.mjs` reports. The two sliders in
     * this block became knobs for exactly that reason, and the number below is
     * what stops the next person putting them back without noticing.
     * ⚠️ IT IS A RATIO, NOT A PIXEL COUNT, so the claim survives a change to
     * any of the sizes it is made of.
     */
````

<a id="kit-devices-152"></a>
## kit-devices-152: demo/kit/devices/index.html, inline script, line 2655

````js
    /* ⚠️ MEASURE IT AGAIN FIRST. This page lays every closed tab panel out
       inside a measuring window that holds no `await`, so a grid built at a
       width of zero is still at zero when a synchronous reader arrives. The
       control grid asserts above do the same, and for the same reason. */
````

<a id="kit-devices-153"></a>
## kit-devices-153: demo/kit/devices/index.html, inline script, line 2667

````js
    /* 🔴 THE NEGATIVE CONTROL, AND IT IS THE MEASUREMENT THAT DECIDED THE
       SHAPE OF THIS BLOCK. A horizontal slider in the same grid fails the claim
       above by a wide margin, which is why the two here are knobs. It is built,
       measured and thrown away rather than shipped. */
````

<a id="kit-devices-154"></a>
## kit-devices-154: demo/kit/devices/index.html, inline script, line 2687

````js
  /**
   * 🔴 THE WAVEFORM'S WHOLE POINT IS WHAT IT REFUSES, so the counts are graded
   * against the real table through the real component rather than typed here.
   */
````

<a id="kit-devices-155"></a>
## kit-devices-155: demo/kit/devices/index.html, inline script, line 2701

````js
    /* 🔴 A REFUSAL IS A PICTURE WITH WORDS ON IT, NOT AN EMPTY BOX. An empty
       box reads as a component that failed; the name and the reason read as the
       instrument not publishing a shape, which is what is true. */
````

<a id="kit-devices-156"></a>
## kit-devices-156: demo/kit/devices/index.html, inline script, line 2704

````js
    /* 🔴 ONE REFUSAL LEFT ON THE PAGE. The wavetable figure was removed on
       2026-09-22 and this read both. What it can no longer say is that a
       wavetable and a blend are refused for DIFFERENT stated reasons, which
       was the pair's whole job. */
````

<a id="kit-devices-157"></a>
## kit-devices-157: demo/kit/devices/index.html, inline script, line 2720

````js
    /**
     * 🔴 TWO TRACES REALLY ARE TWO, AND THE PROOF IS INK AND NOT A FLAG. A
     * second trace that was declared and never stroked would satisfy every
     * boolean in the component and draw one line, so the measurement is the
     * count of marked pixels against the same figure with nothing over it.
     * ⚠️ AND THE INKS HAVE TO DIFFER, or two traces in ONE colour is a picture
     * that cannot say which signal is which, which is the whole ask.
     */
````

<a id="kit-devices-158"></a>
## kit-devices-158: demo/kit/devices/index.html, inline script, line 2740

````js
    /**
     * 🔴 SAMPLES OUTRANK A NAME, AND THIS IS THE HALF THE PAGE THAT ASKED FOR
     * IT NEEDS. `/muta/`'s two signals are a Plaits engine and a wave folder,
     * and neither is a sine, a triangle, a sawtooth or a square, so an option
     * that only took names would have been decoration on the one page it was
     * built for. A caller handing over SAMPLES is not guessing, which is the
     * only thing the refusal was ever about.
     */
````

<a id="kit-devices-159"></a>
## kit-devices-159: demo/kit/devices/index.html, inline script, line 2754

````js
    /* 🔴 THE NEGATIVE CONTROL: a figure with no second trace reports none, so
       `overDrawn` is measuring the option rather than answering true to
       everything. */
````

<a id="kit-devices-160"></a>
## kit-devices-160: demo/kit/devices/index.html, inline script, line 2763

````js
    /* 🔴 THE WALK ASSERT WENT WITH THE WALK ON 2026-09-22. It turned the same
       component's picture OFF at wave 14 and ON again at wave 0, which is the
       one behaviour a static specimen cannot show, and nothing on this page
       claims it now. `synth-view-test.mjs` still asserts `shapeFor` across all
       thirty names without a browser, so the COUNTS are graded and the
       transition is not. */
````

<a id="kit-devices-161"></a>
## kit-devices-161: demo/kit/devices/index.html, inline script, line 2771

````js
  /**
   * 🔴 THE SEGMENT DISPLAY, GRADED HERE BECAUSE EVERY CLAIM ABOUT IT IS A
   * COMPARISON BETWEEN TWO FIELDS SIDE BY SIDE. `segment-test.mjs` already
   * grades its arithmetic with no browser at all, so nothing below repeats a
   * question that file can answer. What is left is the half that only a laid
   * out page knows: how wide a box came out, what opacity a rule actually won
   * with, and whether the picture takes a pointer.
   */
````

<a id="kit-devices-162"></a>
## kit-devices-162: demo/kit/devices/index.html, inline script, line 2784

````js
    /**
     * 🔴 THE BOX IS THE SAME WIDTH WHATEVER IS IN IT, WHICH IS THIS PROJECT'S
     * RULE ABOUT ANYTHING THAT REDRAWS LIVE. Six three digit fields showing
     * `127`, `111`, `888`, `0`, nothing and an overflow, measured against each
     * other rather than against a number typed here. A `1` is the narrowest
     * glyph there is and an `8` the widest, so if a font or a text box had
     * crept in anywhere this is where it would show.
     */
````

<a id="kit-devices-163"></a>
## kit-devices-163: demo/kit/devices/index.html, inline script, line 2801

````js
    /**
     * 🔴 NOTHING MEASURED IS BLANK, AND A MEASURED ZERO IS NOT. Two fields the
     * same size, one lit by nothing and one lit by a real `0`, which is the
     * pair that makes the claim mean anything: a display that simply could not
     * draw a zero would satisfy the first half on its own.
     */
````

<a id="kit-devices-164"></a>
## kit-devices-164: demo/kit/devices/index.html, inline script, line 2816

````js
    /**
     * 🔴 AND THE UNLIT BARS ARE STILL DRAWN, WHICH IS THE WHOLE REASON THIS IS
     * DRAWN RATHER THAN SET IN A FONT. The blank field is the specimen for it:
     * every part is off, and every part is still on screen at a faint opacity
     * of the SAME ink as a lit one. Read off the COMPUTED style, because that
     * is the only thing that knows which rule won.
     * ⚠️ THE EXPECTED FIGURE IS READ OFF `--disp-ghost`, NOT TYPED HERE, AND
     * THAT IS A REPAIR RATHER THAN A TIDY-UP. This check named 0.13 until
     * 2026-09-21, when the ghost was raised on instruction (*"ligher noacive
     * segments"*) and the check went red on a stylesheet that was right. A
     * number typed into a check is a second copy of a measurement, and this
     * project's rule is that two copies will disagree. The claim is unchanged:
     * an unlit bar is drawn, it is faint, and it is not the lit one.
     */
````

<a id="kit-devices-165"></a>
## kit-devices-165: demo/kit/devices/index.html, inline script, line 2845

````js
    /**
     * 🔴 THE STYLESHEET AND THE MODULE AGREE ABOUT THE GHOST, AND THEY DID NOT.
     * `--disp-ghost` in shell.css and `SCHEMES.backlit.ghost` in segment.mjs
     * are the same measurement written down twice, and on 2026-09-21 one of
     * them was raised and the other was not: a field drawn with no `scheme`
     * option got 0.13 and the same field drawn with `scheme: 'backlit'` got
     * 0.22, which is one component looking two different ways depending on
     * which of its own defaults a caller happened to name. Nothing could fail.
     * ⚠️ TWO INDEPENDENT SOURCES IS THE WHOLE CHECK, which is the repair this
     * project took from the MIM corpus: one side comes out of the stylesheet
     * and the other out of the module, so the two CAN disagree and say so.
     *
     * 🔴 AND IT COVERS ALL THREE NOW, NOT JUST THE GHOST. Extended 2026-09-21,
     * the day the blue came down: `--disp-ink` and `--disp-back` are the same
     * pair as `SCHEMES.backlit.ink` and `.back`, written down twice in exactly
     * the way the ghost was, and the check that existed watched the one of the
     * three that had already been caught. **A check aimed at the defect that
     * happened is not aimed at the defect that is coming**, and these two moved
     * from `#8fb6ff` on `#0d1830` to a near-neutral pair in one edit. Two of
     * three agreeing is the MIM corpus failure precisely: the halves that were
     * compared moved together while the third sat wrong and silent.
     * ⚠️ COMPARED AS RESOLVED COLOUR, NOT AS TYPED TEXT. A token reads back
     * from `getComputedStyle` however the author spelled it, so `#a8b2be` and
     * `#A8B2BE` are one colour and two strings. The browser is the thing that
     * knows: paint each into an element and read the `color` back.
     */
````

<a id="kit-devices-166"></a>
## kit-devices-166: demo/kit/devices/index.html, inline script, line 2899

````js
    /**
     * 🔴 A SCHEME REALLY IS A DIFFERENT DISPLAY, MEASURED AS INK. An option
     * that did nothing would leave two fields side by side looking identical,
     * and nothing else on this page could tell. The three numbers a scheme
     * carries only make sense together, so all three are compared: a reflective
     * field's driven bars are DARKER than its own field rather than brighter,
     * which is the whole difference between a lamp behind the glass and no lamp
     * at all, and its ghost is its own rather than the backlight's.
     * ⚠️ THE DIRECTION IS THE CLAIM, NOT MERELY THE DIFFERENCE. Two schemes
     * that simply disagreed about a colour would pass a check that only asked
     * whether they differ.
     */
````

<a id="kit-devices-167"></a>
## kit-devices-167: demo/kit/devices/index.html, inline script, line 2931

````js
    /**
     * 🔴 NEGATIVE CONTROL, AND IT IS THE ONE A MAP RETURNING "ALL ON" WOULD
     * FAIL. The parts lit in the picture are counted off the DOM; what they
     * are compared against comes out of `GLYPHS`. Two independent sources, so
     * the two can disagree, which is the whole repair from the MIM corpus
     * where both halves of a check were derived from one field.
     */
````

<a id="kit-devices-168"></a>
## kit-devices-168: demo/kit/devices/index.html, inline script, line 2947

````js
    /**
     * 🔴 A VALUE TOO WIDE SHOWS DASHES AND KEEPS THE NUMBER WHERE A READER CAN
     * STILL GET AT IT. The defect this was decided against is an odometer
     * printing `234` for 1234, so the check names the wrong answer as well as
     * the right one, and it reads the TOOLTIP, which is the only place the
     * value survives on screen.
     */
````

<a id="kit-devices-169"></a>
## kit-devices-169: demo/kit/devices/index.html, inline script, line 2980

````js
    /**
     * 🔴 IT IS A PICTURE AND NOT A CONTROL, AND THE TWO HALVES OF THAT ARE ONE
     * ASSERT EACH. The picture takes no pointer while the box around it still
     * does, which is what keeps the tooltip carrying an overflowed value
     * reachable; and nothing in it is selectable, which is the rule a
     * `<canvas>` already lives under here.
     * ⚠️ THE iOS LOUPE HALF IS NOT MEASURED AND THIS CHECK SAYS SO.
     * `-webkit-touch-callout` is a WebKit property, Blink drops it at parse
     * time, and `getComputedStyle(...).webkitTouchCallout` came back
     * **undefined** rather than false, which read as a real failure on a
     * stylesheet that is correct. It is in `shell.css` beside `user-select` and
     * only a WebKit browser can report it, so the claim graded here is the
     * selection one and the callout is named as read.
     */
````

<a id="kit-devices-170"></a>
## kit-devices-170: demo/kit/devices/index.html, inline script, line 3007

````js
  /**
   * 🔴 THE DISTANCE BETWEEN TWO STACKED CONTROLS IS THREE THINGS, AND THIS IS
   * THE FIRST CHECK IN THE REPOSITORY THAT SAYS SO. `/twelve/` was corrected by
   * screenshot twelve times in one evening and every correction was a page
   * doing arithmetic about a component's insides: counting two of the three
   * made a lane 115 px against the 145 it needed, and **the error was exactly
   * one reserved slot**. The kit publishes `--ctl-step` as the sum precisely so
   * nobody adds them up, and until now nothing checked that the sum is what a
   * real pair of pads actually measures.
   * ⚠️ TWO INDEPENDENT SOURCES. One side is the four custom properties read off
   * the document; the other is the rect between two stacked pad BUTTONS in a
   * real grid. They are linked by the stylesheet and not by arithmetic here, so
   * a grid that stopped using the tokens would disagree with them.
   * ⚠️ AND THE BUTTON, NEVER THE WRAPPER. A pad returns its wrapper as `el` and
   * exposes `button` separately; an assert reading the wrapper reported a
   * button 17 px low while the button was exactly right.
   */
````

<a id="kit-devices-171"></a>
## kit-devices-171: demo/kit/devices/index.html, inline script, line 3028

````js
    /**
     * ⚠️ `--ctl-step` IS READ OFF THE BAND DRAWN AT IT, NOT OFF `:root`. It is
     * declared as `calc(var(--ctl-foot) + var(--ctl-gap) + var(--ctl-head))`,
     * and a custom property is SUBSTITUTED rather than computed, so
     * `getPropertyValue` hands back that text and `parseFloat` of it is NaN.
     * This check read NaN for one run. A resolved length only exists once a
     * browser has put the property against something real.
     */
````

<a id="kit-devices-172"></a>
## kit-devices-172: demo/kit/devices/index.html, inline script, line 3047

````js
  /**
   * 🔴 A SLOT IS RESERVED EVEN WHEN IT IS EMPTY, WHICH IS THE OTHER HALF OF THE
   * CONTRACT AND THE ONE A CALLER BREAKS. A pad with no top label still takes
   * `--ctl-head`, or a grid whose downbeats are named has those pads sitting
   * higher than the rest and it reads as a rendering fault rather than as a
   * labelling choice. Measured as two buttons starting on one line while only
   * one of the two wrappers has anything above it.
   * ⚠️ THE NEGATIVE HALF IS THAT THE TWO WRAPPERS REALLY DIFFER. Two pads that
   * both had a top label, or both had none, would start on the same line for a
   * reason that says nothing about the reservation.
   */
````

<a id="kit-devices-173"></a>
## kit-devices-173: demo/kit/devices/index.html, inline script, line 3066

````js
      // ⚠️ THE DETAIL READS BOTH PADS. It said "and the other says nothing" as
      // hardcoded prose, and a sabotage that gave the bare pad a top label took
      // the assert red with a detail still claiming the pad said nothing. A
      // detail is the EVIDENCE for a claim, so it may not restate the claim.
````

<a id="kit-devices-174"></a>
## kit-devices-174: demo/kit/devices/index.html, inline script, line 3074

````js
  /**
   * 🔴 THE PANEL, AND THE FIVE CLAIMS ONLY THIS PAGE CAN MAKE ABOUT IT. Every
   * one reads a real rect or a computed value, and every one has a way of going
   * red that was tried on purpose.
   */
````

<a id="kit-devices-175"></a>
## kit-devices-175: demo/kit/devices/index.html, inline script, line 3080

````js
    /* 1. The two children are ONE DEPTH, and the column is the taller one's
       content. That is contract 3, and it is the claim `/twelve/` was reported
       for with a screenshot: `align-items: flex-end` would make them END
       together and say nothing about their heights, so a check reading only the
       bottoms would pass the arrangement that was wrong. Both edges are read. */
````

<a id="kit-devices-176"></a>
## kit-devices-176: demo/kit/devices/index.html, inline script, line 3095

````js
    /* 2. 🔴 THE ABSORBER, WHICH IS THE COMPONENT'S CENTRAL PROMISE AND WAS
       GRADED BY NOTHING ANYWHERE BEFORE THIS BLOCK. Three things together, and
       no two of them are satisfiable by an accident: the flow's children fill
       it, exactly ONE of them carries `.panel-grow`, and that one is taller
       than the block in the panel beside it which has the same content and no
       class. The third is what makes it a measurement of GROWTH rather than of
       a number that happens to fit. */
````

<a id="kit-devices-177"></a>
## kit-devices-177: demo/kit/devices/index.html, inline script, line 3113

````js
    /* 3. ⚠️ THE NEGATIVE CONTROL, AND IT IS THE HALF THAT PROVES THE INSTRUMENT.
       A panel that reported an absorber whatever it was shown would pass the
       check above. The second panel is the SAME panel with one class left off,
       so it must read the opposite: slack nobody took, no child growing, and
       the component saying so on `cuts` rather than throwing, because
       `/twelve/`'s 25.00 px of trailing air is legitimate. */
````

<a id="kit-devices-178"></a>
## kit-devices-178: demo/kit/devices/index.html, inline script, line 3126

````js
    /* 4. THE SCROLL BOUNDARY, COMPUTED, PLUS THE BORDER THAT MARKS IT. The
       border is the one line on a panel that survives the *separation is
       spacing, not lines* rule, and it has to be on the edge FACING the
       scroller: the left-hand column's RIGHT edge here, and `/twelve/`'s lane's
       left. MEASURED rather than read, because a border stripped by a rule
       nobody wrote is this project's fifth measured dead rule.
       ⚠️ AND THERE HAS TO BE SOMETHING TO SCROLL, or `overflow-x: auto` is a
       declaration about nothing. */
````

<a id="kit-devices-179"></a>
## kit-devices-179: demo/kit/devices/index.html, inline script, line 3147

````js
    /* 🔴 A FIFTH CHECK STOOD HERE AND IT WAS THE ONLY ONE IN THIS REPOSITORY
       THAT ENTERED A MEDIA QUERY. It read a card's left AND right edges inside
       a 320 px holder, both of them, because a card can be right on the left
       and 286 px out on the right. Its specimen was asked off on 2026-09-22
       and the assert went with it. **Nothing replaces it.** `verify.mjs` runs
       at 756 px, so every remaining panel assert passes without ever meeting a
       phone. See the note where the specimen was built. */
````

<a id="kit-devices-180"></a>
## kit-devices-180: demo/kit/devices/index.html, inline script, line 3156

````js
  // ── the panel seam ────────────────────────────────────────────────────────
  //
  // 🔴 EVERY CLAIM HERE IS MEASURED AGAINST THE SEAM'S OWN CASE, never against
  // a number typed in. *"Edge to edge"* is a relationship between two
  // rectangles, and this page has already been corrected twelve times in one
  // evening for reasoning about one of them instead of reading both.
````

<a id="kit-devices-181"></a>
## kit-devices-181: demo/kit/devices/index.html, inline script, line 3163

````js
    /**
     * 🔴 THE CASE'S INNER EDGE IS ITS BORDER BOX LESS ITS OWN BORDER, AND
     * READING THE BORDER BOX WOULD HAVE BEEN WRONG BY 1 px AT EACH END. That is
     * the whole width of the thing being measured, so a check that took the
     * outer rectangle would grade a correct seam as 2 px short and an
     * overhanging one as perfect.
     */
````

<a id="kit-devices-182"></a>
## kit-devices-182: demo/kit/devices/index.html, inline script, line 3176

````js
    /* 1. 🔴 EDGE TO EDGE, ON BOTH ARRANGEMENTS, WHICH IS THE ASK IN ONE LINE:
       *"on each button group have horizontal panel separator edge to edge"*.
       BOTH ends of BOTH seams, because a rule can be right on one edge and
       20 px short on the other, and `.panel-case`'s `padding: 0 var(--panel-pad)`
       is the one inset that would do exactly that. */
````

<a id="kit-devices-183"></a>
## kit-devices-183: demo/kit/devices/index.html, inline script, line 3194

````js
    /* 2. 🔴 IT CROSSES THE RAIL, AND THE NAME SURVIVES THE CROSSING. Two
       separate facts, because a seam that stopped at the plate would pass a
       width check on the other edge alone, and a seam drawn THROUGH the letters
       would pass this one. The plate carries a `z-index` so its ink paints over
       the rule, and the ground is on the LINE rather than on the plate, or the
       whole rail would mask the seam and edge to edge would stop being true. */
````

<a id="kit-devices-184"></a>
## kit-devices-184: demo/kit/devices/index.html, inline script, line 3219

````js
    /* 3. 🔴 NEGATIVE CONTROL, AND IT IS THE ONE THAT SAYS THE ROW COUNT IS DOING
       ANYTHING. A grid case with no count lays every child into row 1, so the
       band would sit ON TOP of the strip rather than under it and the plate
       would stop under the first row. So: the bands stack in source order, and
       the rail runs the case's whole height. MEASURED before the count existed,
       a four child case came out `1721.5px 70.5px 0px 0px 1px 70.5px`, six
       tracks for four bands, with two the plate had blocked. */
````

<a id="kit-devices-185"></a>
## kit-devices-185: demo/kit/devices/index.html, inline script, line 3248

````js
    /**
     * 4. 🔴 A CASE WITH BANDS HAS A VERTICAL RHYTHM, AND IT HAD NONE UNTIL
     * 2026-09-25. FOUND by the `/shape/` agent, which is the second caller
     * finding the hole the first one could not: nine sections lifted out of the
     * strip read **1.0 px** of ink from one section's last lane to the next
     * section's heading, against **40.0 px** on the page as it ships, with the
     * last band **0.0 px** off the case's inner bottom.
     * 🔴 THE CAUSE WAS `/held/`'s LESSON A THIRD TIME: `.pos-stack` owns the
     * 40 px rhythm as a margin on its own children, a block lifted out of a
     * stack stops being one, and `.panel-case` pads horizontally only.
     * 🔴 **THREE DISTANCES, NOT ONE, BECAUSE THEY COME FROM THREE PLACES AND
     * CAN BREAK SEPARATELY.** Across a seam it is the band's own inset either
     * side of a 1 px rule; band to band it is two insets and nothing between;
     * and under the last band it is one inset against the case's border, which
     * is the job `.panel-strip`'s `padding-bottom` does on a case with no
     * bands. `positron-ui` records `/twelve/` having two of three alignments
     * line up while the third was 30 px out, which one bundled assert cannot
     * report.
     * ⚠️ AND EVERY NUMBER IS READ AGAINST THE CASE'S OWN `--panel-pad` RATHER
     * THAN AGAINST A 20 TYPED HERE, so this cannot drift from the stylesheet.
     */
````

<a id="kit-devices-186"></a>
## kit-devices-186: demo/kit/devices/index.html, inline script, line 3289

````js
    /* 5. ⚠️ AND A PANEL WITH NO RAIL IS NOT A GRID AND IS NOT NUMBERED, which is
       the half that keeps this off the seven cased pages that asked for none.
       An inline style nothing reads is a thing somebody has to explain later. */
````

<a id="kit-devices-187"></a>
## kit-devices-187: demo/kit/devices/index.html, inline script, line 299

````js
      /* 2. NO PICTURE AND NO KEYBOARD. A pedal is four knobs and a name. */
````

<a id="kit-devices-188"></a>
## kit-devices-188: demo/kit/devices/index.html, inline script, line 314

````js
      /* 4. ROWS AND NOTHING ELSE. No picture, no keyboard, no foot. */
````

<a id="kit-devices-189"></a>
## kit-devices-189: demo/kit/devices/index.html, inline script, line 418

````js
      /* 3. A DISPLAY OVER ITS BUTTONS. A seven segment field as a picture row,
            and the group that drives it under it. */
````

<a id="kit-devices-190"></a>
## kit-devices-190: demo/kit/devices/index.html, inline script, line 459

````js
      /* 6. THREE PICTURES AND NOTHING ELSE. Every row edge to edge, so the
            surface is three pictures and two hairlines. */
````

<a id="kit-devices-191"></a>
## kit-devices-191: demo/kit/devices/index.html, inline script, line 2879

````js
    /**
     * A decimal point rides the digit to its left and costs no cell, so `12.5`
     * really is on a three digit field. The pure side of that is in
     * `segment-test.mjs`; what is graded here is that the part exists in the
     * picture and that it is the one on the middle digit.
     */
````
