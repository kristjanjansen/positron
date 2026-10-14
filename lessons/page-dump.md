# Page comments: dump

The full comments cut from the code under demo/ for dump, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="dump-1"></a>
## dump-1: demo/dump/index.html, style, line 10

````css
  /* ⚠️ THIS PAGE WENT FULL WIDTH FOR ONE AFTERNOON AND CAME BACK, ASKED FOR
     2026-09-20 as *"make dump page regular width"*, a few hours after *"can be
     full w below the header / desc / feedback"*. It takes the standing 720px
     like every other page, so there is no `body { max-width }` here and no
     `.pos-head` override. **Do not reintroduce either without being asked**:
     a page rule beating the stylesheet on source order is a thing this project
     measures going wrong, and the reason to carry that risk was removed. */
````

<a id="dump-2"></a>
## dump-2: demo/dump/index.html, style, line 18

````css
  /* 🔴 THE TWO HEIGHT RULES THAT STOOD HERE ARE GONE, AND DELETING THEM IS
     PART OF THE CHANGE RATHER THAN A TIDY-UP. They were
     `.ports .pos-tbl-body { max-height: 190px }` and
     `.traffic .pos-tbl-body { max-height: min(60vh, 620px) }`, both CEILINGS,
     so each box was whatever height its rows made it underneath one: nothing
     at all when empty and hundreds of pixels a second later. Both tables ask
     for `minRows` now, and `shell.css`'s `.pos-tbl[data-rows] .pos-tbl-body`
     answers with `height` AND `max-height: none` at (0,3,0), which beats a
     page's (0,2,0) whatever the source order says. Leaving them would have
     left two DEAD RULES reading as correct, which this project measures as its
     second most expensive kind of defect after a dead JavaScript guard.
     ⚠️ THE HEIGHTS ARE READ BACK RATHER THAN REASONED ABOUT. See the three
     measurements in `check`: empty, overflowing and cleared, one number.
     ⚠️ `.ports` and `.traffic` stay and nothing styles them. They are what
     tells the two tables apart in the DOM, in a screenshot and in the checks
     below, and the sizes they used to carry now live beside the tables. */
````

<a id="dump-3"></a>
## dump-3: demo/dump/index.html, inline script, line 45

````js
  /**
   * 🔴 WHY THIS PAGE EXISTS. Three plan documents in this repo describe four
   * devices almost entirely from documentation, and several of their central
   * claims cannot be checked from any document at all: TASCAM publishes no
   * controller numbers for the Model 12 in Mackie Control mode at any firmware
   * revision, and Novation never wrote down whether the Circuit's NRPN rides
   * the usual convention. Both are answerable in about four seconds of turning
   * one knob in front of this page.
   *
   * 🔴 AND THE ANSWER IS ONLY WORTH ANYTHING IF THE READING IS SEPARABLE FROM
   * THE BYTES. A relative encoder reads as a position if you interpret it, so
   * every row carries the raw bytes in their own column beside whatever this
   * page thinks they mean.
   */
````

<a id="dump-4"></a>
## dump-4: demo/dump/index.html, inline script, line 62

````js
  /**
   * 🔴 THE TABLES ARE DRAWN AT ONCE, EMPTY, AT A HEIGHT THEY KEEP. Asked for
   * 2026-09-25: *"dump: nothing asked yet / press Listen, then play something /
   * show empthy tables / miditables immidately with fixed heigh. no texdt in
   * them until dumps arrive"*. The two quoted strings were this page's `empty`
   * captions and they are gone: `minRows` makes the TABLE ITSELF the empty
   * state, so a heading and a stack of ruled rows stand where a sentence used
   * to, and nothing is written in them until a message lands.
   *
   * ⚠️ AND IT BUMPS INTO `an empty box is a line`, WHICH POINTS THE OTHER WAY
   * AND IS NOT IN CONFLICT HERE. `demo/shell/roll.mjs:111` argues FOR a caption,
   * because a container with nothing in it must not paint its own edges, and
   * this project has paid for that three times (`/typist/`'s 2 px band,
   * `.pos-controls`'s 14 px one, `drop.mjs`'s hidden footer). **A framed table
   * is not an empty box.** Its heading names the columns and its ruled rows say
   * how many records will fit, which is structure a reader can see and read a
   * meaning off. What that rule refuses is a rectangle saying nothing, and this
   * is the opposite of one. **So this is not a caption waiting to be put
   * back**, and `/pack/`'s `an empty table draws no heading` is not being
   * contradicted either: that assert is about a heading over NOTHING, and there
   * is something under this one.
   *
   * 🔴 FLOOR AND CEILING ARE ONE NUMBER, WHICH IS THE HALF THAT COST SOMETHING
   * ELSEWHERE. `/wish/` records a box that was *"7 lines for one connection and
   * 16 for the next"* and therefore moved the log and the end of the page on
   * every press. Rows land here in hundreds and they land on their own, so a
   * box that grew with them would do that to everything under it without
   * anybody touching the page.
   *
   * ⚠️ TWO NUMBERS, NOT ONE, AND THE SECOND ONE IS A CHOICE RATHER THAN A
   * MEASUREMENT. `PORTS_ROWS` is 6 because that is what this box already is:
   * the `max-height: 190px` it replaces is 5.9 rows at `--tbl-row-h`, and
   * `/circuit/` and `/evo/` both reserve exactly 6 for a MIDI table through
   * `createMidiLog({ reserve: 6 })`, which is the same request one step
   * earlier. `TRAFFIC_ROWS` is 16 because this page's whole subject is the
   * traffic and the other two reserve 6 for a side panel: 16 rows is 518.40 px,
   * which is under the 620 px ceiling it replaces and is 60vh of an 864 px
   * viewport, a 1080p screen with an ordinary browser on it. **Answering a
   * request about the EMPTY state by making the one table this page exists for
   * five times shorter would be answering a different request.**
   */
````

<a id="dump-5"></a>
## dump-5: demo/dump/index.html, inline script, line 108

````js
    // ⚠️ ONE SENTENCE, AND THE COMMENT HERE USED TO GIVE THE WRONG REASON. It
    // said "because this page has a diagram", which was true for about an hour
    // and stopped being true when the diagram was removed on instruction. The
    // rule stands on its own: a description is a single sentence, not stretched
    // with a colon, a semicolon or a dash buying a second clause. It is still
    // the same sentence the index card carries, so a visitor arriving from
    // there is not told the same thing twice in two wordings that can drift.
````

<a id="dump-6"></a>
## dump-6: demo/dump/index.html, inline script, line 120

````js
    /**
     * 🔴 THREE CONTROLS, AND `Known stream` IS NOT ONE OF THEM. Asked for
     * 2026-09-20: *"rm other buttons that listen fro user"*, then *"leave ask
     * for version and listen and clear"*. The one that went was the page's own
     * self-grading machinery showing through the interface, which is the same
     * argument `/shout/` makes about a `Run the checks` button: a visitor has
     * no use for a stream of invented messages, and the harness can reach the
     * checks another way.
     * ⚠️ **SO THE CHECKS MOVED TO `Listen`, WHICH IS NOW THE ONLY CONTROL THAT
     * CAN REACH THEM.** See its handler. CLAUDE.md is explicit that a control a
     * harness cannot press is a check nobody runs, and removing a button is
     * exactly how that happens.
     * 🔴 CONTROL 0 IS THE ONE THE HARNESS GIVES `settleMs` TO, and putting
     * anything in front of `listen` moves every other control's press. That has
     * already cost this project an intermittent failure on a page where nothing
     * had changed.
     * 🔴 AND NO BUTTON HERE IS PRIMARY. Asked 2026-09-28: *"dump: all buttons
     * secondary"*. `Listen` carried `primary: true` and so wore `pos-pri`, the
     * site's one accent, which is spent on what is CHOSEN or LIVE. Neither
     * control on this page is either: both are a question put to whatever is
     * plugged in, and the accent belongs to the traffic that answers. Dropping
     * the FLAG is all that changed. The ORDER is untouched, for the reason
     * directly above, and `pos-pri` is unchanged for every other page.
     */
````

<a id="dump-7"></a>
## dump-7: demo/dump/index.html, inline script, line 147

````js
      /**
       * 🔴 `Clear` IS NOT HERE. Asked 2026-09-20: *"move clear below table to
       * right and small button"*. It sits under the traffic table in a `.kpad`
       * row, which is the SAME component and the same class as `Notes off`
       * under the keyboard, chosen rather than invented because `keyboard.mjs`
       * already made this exact argument: a control that UNDOES something
       * belongs apart from the controls that do things, and small, and next to
       * the thing it undoes.
       * ⚠️ **A MOVED BUTTON IS A BUTTON THE HARNESS NO LONGER PRESSES.**
       * `demo/verify.mjs` drives `.pos-controls`, so leaving this row costs
       * `Clear` its automatic press. Nothing is graded behind it, which is why
       * it could move at all, and CLAUDE.md's rule about a control a harness
       * cannot reach is why that had to be checked rather than assumed.
       */
````

<a id="dump-8"></a>
## dump-8: demo/dump/index.html, inline script, line 165

````js
  /**
   * 🔴 A VISIT OPENS NOTHING, AND ON THIS PAGE THAT RULE HAS TEETH.
   * `navigator.requestMIDIAccess()` raises a browser permission dialog, and
   * SysEx is a SECOND, separate permission. A page that costs a visitor a
   * bandwidth bill is one thing; a page that puts a dialog in front of somebody
   * who has not pressed anything is worse. Nothing below runs until a press.
   */
````

<a id="dump-9"></a>
## dump-9: demo/dump/index.html, inline script, line 181

````js
    // ⚠️ NO `empty:`. `minRows` ignores one, and a sentence inside a framed
    // table lands in the first ruled row and reads as a record.
````

<a id="dump-10"></a>
## dump-10: demo/dump/index.html, inline script, line 193

````js
      // 🔴 THE BYTES ARE A COLUMN OF THEIR OWN AND THEY ARE NEVER REPLACED BY
      // THE READING BESIDE THEM. This is the whole design of the page.
````

<a id="dump-11"></a>
## dump-11: demo/dump/index.html, inline script, line 199

````js
    // 🔴 THE NEWEST ROW STAYS IN VIEW. Asked 2026-09-20: *"scroll dump to
    // bottom always"*. MEASURED on a real MK-425C the same hour: **733 messages
    // in eight seconds** from one keyboard, so without this the only rows on
    // screen are the ones from several seconds ago.
    // ⚠️ IT STANDS DOWN WHILE THE KEYBOARD IS IN THE TABLE, or it would drag
    // the view off the focused row between two arrow presses.
````

<a id="dump-12"></a>
## dump-12: demo/dump/index.html, inline script, line 214

````js
  /**
   * `Clear`, under the table it clears, small and on the right.
   *
   * ⚠️ IT REUSES `.kpad` AND `.kpad-right` RATHER THAN INVENTING A SIZE.
   * `keyboard.mjs` puts `Notes off` in exactly this row for exactly this
   * reason, and `shell.css` already carries the 26px height and the 11px mono
   * face. Hand rolling a small button here would be a fourth copy of a control
   * that exists, which is the thing `/kit/` was built to stop.
   */
````

<a id="dump-13"></a>
## dump-13: demo/dump/index.html, inline script, line 231

````js
  /* 🔴 ON THE PATCHBAY ON A PRESS OF Join, NEVER ON LOAD (plans/plan-routing-migration.md
     step 5). The instruments plugged into this machine are announced as devices,
     keyed by their ports and never by their names, and this page announces a
     sink of its own beside them: a tap a person can put on any of those outs
     from `/patchbay/`, whose badge says whether anything is arriving. Join sits
     outside `.pos-controls` and asks for MIDI first when Listen has not.
     `midi-node.mjs` in the shell has the rest. */
````

<a id="dump-14"></a>
## dump-14: demo/dump/index.html, inline script, line 257

````js
    // ⚠️ THESE TWO STAY EMPTY UNTIL ONE ARRIVES rather than showing 0. A zero
    // reads as a very confident measurement of nothing, and on this page it
    // would read as `this device sends no clock`, which is a real claim about
    // a real device that nobody has measured.
````

<a id="dump-15"></a>
## dump-15: demo/dump/index.html, inline script, line 276

````js
  /**
   * ── the tap: what arrived, written where a session can read it ───────────
   *
   * 🔴 WHY. This page reads MIDI in a browser, and a browser is where a person
   * is sitting rather than where a session can look. Getting the first real
   * measurements off this desk meant driving a second Chrome through an
   * extension and reading its console back one question at a time, which the
   * person at the desk called ridiculous and was right about: every reading
   * cost a round trip, and a press that landed between two of them was lost.
   * Now the presses land in `.tap/midi.jsonl` and anybody can read the file.
   *
   * 🔴 THE DEV SERVER ONLY, AND THE CHECK IS ON THE ORIGIN. `workers/view` has
   * no `/_tap` route, deliberately, so a deployed `/dump/` posts nowhere and a
   * visitor's instrument is never written to anybody's disk. **This is not a
   * page feature and it must never become one.**
   *
   * ⚠️ BATCHED, BECAUSE THE RATE IS THE POINT OF THIS PAGE. MEASURED on one
   * MK-425C: 733 messages in eight seconds. A request per message is 90 a
   * second at a dev server, so they go in one post every 500 ms.
   * ⚠️ AND IT IS FIRE AND FORGET. A failed post must never cost a message on
   * screen, because the screen is what a person is actually watching.
   */
````

<a id="dump-16"></a>
## dump-16: demo/dump/index.html, inline script, line 303

````js
    /**
     * 🔴 A HARNESS RUN MUST NOT WRITE INTO THE CAPTURE FILE, AND IT DID.
     * MEASURED 2026-09-20: `node demo/verify.mjs dump` drives the known stream
     * to grade the decoder, every message of it went down the tap, and
     * `read-tap.mjs` then reported `known stream ch1 CC 99` beside real
     * readings off a Circuit and a Model 12. **739 messages, and 32 of them per
     * verify run were invented.**
     * ⚠️ THE ROWS WERE LABELLED AND THAT WAS NOT ENOUGH. Every one carried
     * `from: 'known stream'`, so nothing was lying, and the counts, the
     * histograms and every verdict `classifyEncoder` produced were still
     * computed over a mixture. **A label on a row does not keep it out of an
     * aggregate**, which is the same lesson as a lane with no feedback counting
     * as zero in a score.
     * ⚠️ AND THE FILE IS A RECORD OF SOMETHING THAT HAPPENED ONCE. Nobody can
     * re-press a knob to find out which rows were real.
     */
````

<a id="dump-17"></a>
## dump-17: demo/dump/index.html, inline script, line 327

````js
          // 🔴 SAY IT ONCE AND STOP. A dev server without the route answers 404
          // on every batch, and a log line twice a second is a page shouting
          // about a thing that is not this page's job.
````

<a id="dump-18"></a>
## dump-18: demo/dump/index.html, inline script, line 393

````js
  /**
   * 🔴 `open()` EXPLICITLY, AND THIS PAGE SHIPPED WITHOUT IT AND READ AS A DESK
   * WITH NOTHING ON IT. MEASURED 2026-09-20 with four instruments plugged in
   * and transmitting: every port read `connected/closed`, the page showed an
   * empty table, and fifteen seconds of moving a fader produced nothing. One
   * `await p.open()` on each port took the same fifteen seconds to 239
   * messages.
   * ⚠️ **THE SPECIFICATION SAYS ASSIGNING `onmidimessage` OPENS THE PORT**, and
   * that is why the line was not there. It is also why the failure is so quiet:
   * there is no error, no rejected promise and no console line, so a page with
   * closed ports is pixel for pixel a page watching a silent instrument. The
   * one thing that can tell them apart is `port.connection`, which is why it is
   * a column in the ports table rather than a detail on the hover.
   * ⚠️ AND IT HAD WORKED EARLIER IN THE SAME SESSION, which is worse than never
   * working: the implicit open is real but it is not reliable across a reload
   * with another client holding the device. An intermittent silent failure on
   * the one page whose whole job is to report what a device sends.
   */
````

<a id="dump-19"></a>
## dump-19: demo/dump/index.html, inline script, line 427

````js
      // ⚠️ A BROWSER WITHOUT WEB MIDI IS NOT A FAULT. Safari has none at all,
      // and a page that reports a missing optional capability as an error
      // teaches its reader that red means nothing.
````

<a id="dump-20"></a>
## dump-20: demo/dump/index.html, inline script, line 456

````js
    /**
     * 🔴 THE CHECKS HANG OFF THE ONLY CONTROL THERE IS, AND THEY RUN THE KNOWN
     * STREAM THEMSELVES. `demo/verify.mjs` presses every control and never
     * calls `check`, so a page's asserts have to be driven by one of its own
     * buttons. With `Known stream` removed there is exactly one.
     * ⚠️ **THIS IS THE `/mirror/` PATTERN, NOT A SELF-CHECK BRANCH IN
     * DISGUISE.** CLAUDE.md records that a control a harness cannot reach is a
     * check nobody runs, and the sanctioned repair is for the page to drive the
     * unreached path behind `SELFCHECK`. A visitor pressing Listen gets their
     * own instruments and nothing invented; a harness, which has no permission
     * and no device, gets the bytes written down in this file.
     * ⚠️ AND IT MUST NOT PUT FAKE ROWS IN FRONT OF A PERSON. That is the whole
     * reason it is gated rather than always run.
     */
````

<a id="dump-21"></a>
## dump-21: demo/dump/index.html, inline script, line 473

````js
  /**
   * 🔴 DEVICE INQUIRY, WHICH IS THE ONE QUESTION EVERY MANUFACTURER'S BOX
   * UNDERSTANDS. Reading a firmware version is otherwise a different ritual per
   * device: a menu dive and a jog dial on the Model 12, a web application for
   * the Circuit, and nothing at all for the other two.
   *
   * 🔴 IT REFUSES TO TOUCH REAL HARDWARE UNDER `?selfcheck=1`, WHICH IS WHAT
   * `board.mjs` ALREADY DOES AND FOR THE SAME REASON. A harness run must not
   * put bytes into an instrument on somebody's desk. It answers the stand-in
   * instead and says which it did.
   */
````

<a id="dump-22"></a>
## dump-22: demo/dump/index.html, inline script, line 498

````js
    // ⚠️ A SILENCE IS A PERMITTED ANSWER AND IS NOT THE SAME AS AN ABSENT
    // DEVICE. A device may ignore the inquiry, which is allowed, and saying so
    // is a real result rather than a failure to report.
````

<a id="dump-23"></a>
## dump-23: demo/dump/index.html, inline script, line 509

````js
  /**
   * ⚠️ STILL REGISTERED AS A HANDLER AND ALSO WIRED TO THE BUTTON. The handler
   * is what `d.run('clear')` reaches, and the button is what a person presses;
   * having both means the control cannot drift from the thing it does.
   */
````

<a id="dump-24"></a>
## dump-24: demo/dump/index.html, inline script, line 525

````js
  /**
   * 🔴 A KNOWN STREAM, AND IT IS AN ORDINARY CONTROL RATHER THAN A SELF-CHECK
   * BRANCH. The rule here is that a page which behaves one way for
   * `?selfcheck=1` and another way for a person is a page nothing grades, so
   * the harness presses the same button a visitor can press. It costs nothing
   * and opens nothing: these bytes are written down in this file.
   *
   * ⚠️ FOUR REAL DEVICES ARE PLUGGED INTO THE MACHINE THIS WAS WRITTEN ON, AND
   * NOT ONE OF THEM CAN GRADE THE DECODER. What a device happens to send today
   * is not a known answer, so pointing this page at a mixer proves it runs and
   * proves nothing about whether it reads correctly.
   */
````

<a id="dump-25"></a>
## dump-25: demo/dump/index.html, inline script, line 583

````js
    /**
     * 🔴 THE EMPTY FRAME IS READ BEFORE ANYTHING IS PUT IN IT, which is the
     * only moment it exists. Everything below this line feeds the known stream,
     * and a measurement of the empty state taken after that would be a
     * measurement of a full table.
     * ⚠️ THE BODY, NOT THE WRAPPER. `shell.css` sets the height on
     * `.pos-tbl-body`, which is the box that scrolls; the wrapper also holds
     * the heading and would report a different number for a reason that has
     * nothing to do with this.
     * ⚠️ AND `getComputedStyle(...).display` FOR THE HEADING, NOT `.hidden`.
     * `el.hidden` is a fact about an attribute and this project has already
     * shipped an assert reading it green while the heading was on screen:
     * `.pos-tbl-row`'s own `display: grid` beat the browser's `[hidden]` until
     * `shell.css` said otherwise. Only the computed value knows what is drawn.
     */
````

<a id="dump-26"></a>
## dump-26: demo/dump/index.html, inline script, line 616

````js
    // 🔴 THE FLOODS ARE THE POINT OF THAT SUBTRACTION.
````

<a id="dump-27"></a>
## dump-27: demo/dump/index.html, inline script, line 620

````js
    // ⚠️ AND THE NEGATIVE HALF: if `isFlood` were switched off, the count above
    // would be zero AND the row count would be four higher. Asserting both
    // means the sabotage cannot pass by moving the failure somewhere quiet.
````

<a id="dump-28"></a>
## dump-28: demo/dump/index.html, inline script, line 636

````js
    // 🔴 THE QUESTION THIS PAGE EXISTS FOR, ASSERTED IN BOTH DIRECTIONS.
    // A page that called everything relative would pass the first of these and
    // fail the second, which is what makes the pair worth having.
````

<a id="dump-29"></a>
## dump-29: demo/dump/index.html, inline script, line 644

````js
    // The four NRPN messages stay as four rows AND the fourth says what they meant.
    // ⚠️ `.pos-tbl-head` CARRIES `.pos-tbl-row` TOO, so an unfiltered query
    // returns 33 rows for 32 messages and the extra one has no hex in it. The
    // assert below went red on exactly that, which is the right outcome: it
    // was measuring one more row than the page has.
````

<a id="dump-30"></a>
## dump-30: demo/dump/index.html, inline script, line 656

````js
    // 🔴 RAW BYTES BESIDE THE READING, WHICH IS THE PAGE'S ONE DESIGN RULE.
    // Asserted on the DOM rather than on the data, because the rule is about
    // what is on screen.
````

<a id="dump-31"></a>
## dump-31: demo/dump/index.html, inline script, line 672

````js
    // ⚠️ THE PORTS TABLE IS EMPTY UNTIL SOMEBODY PRESSES LISTEN, AND THAT IS
    // THE POINT. Asserting it is empty here is asserting that a visit opened
    // nothing, which is the rule that cost this project four separate repairs.
````

<a id="dump-32"></a>
## dump-32: demo/dump/index.html, inline script, line 682

````js
    /**
     * 🔴 A READOUT CELL IS NOT AN ASSERT AND NEITHER IS A NUMBER IN A COMMENT.
     * The whole point of `minRows` is that the box does not move, so the check
     * is four readings of one box at four fillings: empty before anything
     * arrived, overflowing, emptied again by the real `Clear` handler, and
     * holding a single row. If any one of them differs the page is pushing
     * everything under it up and down as messages land, which is the defect
     * `/wish/` paid for.
     * ⚠️ THE CLEAR IS THE REAL HANDLER, driven through `d.run`, so what is
     * measured is the button a person presses rather than a private reset.
     */
````

<a id="dump-33"></a>
## dump-33: demo/dump/index.html, inline script, line 704

````js
    // ⚠️ THE NEGATIVE HALF, and it is the half that says the box is holding
    // itself open rather than being held open by the rows in it: the room a
    // placeholder takes is given back one row at a time, so the two always sum
    // to the reserved count and a placeholder is never counted as a record.
````
