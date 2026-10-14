# Page comments: wish

The full comments cut from the code under demo/ for wish, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="wish-1"></a>
## wish-1: demo/wish/index.html, style, line 10

````css
  /* 🔴 EVERY BOX HERE HAS A RESERVED HEIGHT, because all of them are filled by
     something that arrives over a network a second or two after the press. A
     page whose blocks appear one at a time moves the thing under the reader's
     hand twice. */
````

<a id="wish-2"></a>
## wish-2: demo/wish/index.html, style, line 17

````css
  /* 🔴 THE ANSWER IS ONE COMPONENT OF THREE PARTS. Asked 2026-09-21: *"make it
     a single component, 3 parts, glued. in top is patch list visualizer, below
     is diagram and dump is below"*. `createGlue` builds it, the picker row is
     the top part, the picture is the middle one and the JSON is the bottom one.
     🔴 A GLUE TAKES A CHILD'S BORDER AND RADIUS AWAY, SO EVERY PART HAS TO
     PAINT ITS OWN GROUND. `.pos-glue` is `gap: 1px` over `background:
     var(--line)`, so what says where one part ends is a 1 px seam of `--line`
     showing between them. A part that paints nothing lets that colour through
     its whole area and the seam disappears into it, which is the question a
     three part glue asks and a two part one does not: the middle part touches
     the component's own border on neither side and is bounded by seams alone.
     The kit's own glued pairs already answer it, and neither of them says so
     out loud: `.pos-cell` and `.pos-log` both carry `background: var(--card)`.
     ⚠️ SO THE RULE SITS ON THIS PAGE'S OWN ELEMENTS AND NEVER ON `.pos-glue`.
     A page reaching into a component's insides is a named defect here, and
     nothing about this needs it: a part that paints itself is a part wherever
     it is put, and `createGlue` already takes as many blocks as it is given.
     ⚠️ AND THE INSET MOVES OUT OF THE `<pre>` INTO THE PART, so the JSON and
     the verdict under it share one padding instead of each buying their own. */
````

<a id="wish-3"></a>
## wish-3: demo/wish/index.html, style, line 37

````css
  /* 🔴 THE HEADER: AN ACTION ON THE LEFT, ITS MODEL ON THE RIGHT. Asked for one
     block at a time on 2026-09-21, once for each of the two blocks.
     `space-between` rather than a spacer element, and it WRAPS, because at
     390 px a button and a five option picker on one line is a row that drags
     the page sideways, which is already this project's most repeated phone
     defect. */
````

<a id="wish-4"></a>
## wish-4: demo/wish/index.html, style, line 47

````css
  /* ⚠️ THE PICKER DOES NOT GROW. Left to itself a choice in a flex row takes
     whatever the button leaves, so the word `model` and its options would drift
     apart as the button's label changed length. They stay one object. */
````

<a id="wish-5"></a>
## wish-5: demo/wish/index.html, style, line 52

````css
  /* 🔴 THE BOTTOM PART IS THE OBJECT AND THE VERDICT ON IT, WHICH IS WHY THEY
     ARE ONE PART RATHER THAN A FOURTH. The request names three parts and the
     allowed/refused line is not one of them, and it is not furniture either:
     every row is a reading of a link in the JSON an inch above it, printed by
     `printLink` off the same object. A seam between them would say they are two
     answers. Under it, with no seam, they are the answer and what this desk
     makes of it. */
````

<a id="wish-6"></a>
## wish-6: demo/wish/index.html, style, line 59

````css
  /* 🔴 ITS OWN BORDER SINCE IT LEFT THE GLUE, 2026-09-22: *"json dump border
     should have border"*. Inside a glue every child gives up its border because
     the glue draws one round the lot; a part that moves out and keeps that up
     is a surface with no edge, which on this ground reads as text floating on
     the page rather than as a block. */
````

<a id="wish-7"></a>
## wish-7: demo/wish/index.html, style, line 68

````css
  /* 🔴 THE TRANSCRIPTION IS EDITABLE AND ITS HEIGHT IS FIXED. A textarea that
     grows with its content is the one thing this project has a rule against,
     so it scrolls instead. `resize: none` for the same reason: a corner a
     reader can drag is a block that changes the page's height. */
````

<a id="wish-8"></a>
## wish-8: demo/wish/index.html, style, line 76

````css
    /* 🔴 MONOSPACED, ASKED FOR AGAINST THE SENTENCE ITSELF ON 2026-09-21. It
       inherited the page's reading face, which is the right choice for prose
       and the wrong one here: this box is not prose, it is the exact words that
       go to a model, and it sits directly above a monospaced object built out
       of them. A reader comparing what they SAID with what came BACK was
       crossing a typeface to do it.
       ⚠️ AND THE SIZE COMES DOWN WITH THE FACE. A monospaced 15 px is visibly
       larger than the proportional 15 px it replaces, and this box is one line
       tall by reservation. */
````

<a id="wish-9"></a>
## wish-9: demo/wish/index.html, style, line 89

````css
    /* `pre-wrap` and not `pre`: a long object wraps instead of running off the
       right edge, and what was off the edge was the evidence. It changes height
       when an answer lands, which is a human-paced change rather than a clock,
       and is the case the no-twitch rule explicitly allows. */
````

<a id="wish-10"></a>
## wish-10: demo/wish/index.html, style, line 93

````css
    /* 🔴 ONE RESERVED HEIGHT, FLOOR AND CEILING THE SAME NUMBER, ASKED FOR
       2026-09-22 AS *"separate json dump to sepatate block, reserve its
       hight"*. It was a 62 px floor and an 18 line ceiling while this box held
       every link at once; it holds ONE now, the selected row's, and a box that
       is 7 lines for one connection and 16 for the next would move the log and
       the end of the page on every press of a row. That is the caption that
       reflowed sixty times a second on `grain-scope`, arriving through a
       click.
       ⚠️ IT SCROLLS INSIDE ITSELF RATHER THAN CLIPPING, because the one thing
       this box exists to show is the argument a refusal names, and that can be
       on any line of it. A clip would hide exactly the evidence a reader came
       for, which is the defect `pre-wrap` was introduced to fix from the other
       direction.
       ⚠️ AND THE NUMBER IS A LINE COUNT RATHER THAN A PIXEL GUESS, MEASURED
       OVER WHAT ONE CONNECTION CAN BE: 7 lines with no transform on it, 12 with
       one, 16 with two, which is the longest this desk's own examples produce.
       14 holds the common case whole and lets the longest scroll by two lines,
       against a reservation of 16 that would stand 60 px of air over every
       ordinary answer and over an empty page. */
````

<a id="wish-11"></a>
## wish-11: demo/wish/index.html, style, line 115

````css
    /* 🔴 GREYER, ASKED FOR IN ONE WORD AGAINST THE OBJECT ITSELF. It was
       `--ink`, the page's reading colour, which made a raw object the loudest
       thing in the component while the picture and the verdict above it are
       what a reader acts on. The object is EVIDENCE: it is there to be checked
       against, not read first. Same argument `shell.css` already makes about
       nothing in the log being white. */
````

<a id="wish-12"></a>
## wish-12: demo/wish/index.html, style, line 122

````css
    /* 🔴 NOTHING IS WRITTEN HERE UNTIL THERE IS SOMETHING TO WRITE, AND THE
       ROOM IS STILL TAKEN. Asked 2026-09-21: *"rm no patch yet"*. The box used
       to draw `# no patch yet`, which is furniture: it tells a reader that a
       box is a box, which the box already said, and it is the same mistake as
       an em dash standing in for a number nobody measured.
       🔴 AND IT PAINTS NO EDGE AND NO GROUND OF ITS OWN SINCE 2026-09-21,
       because it is inside a glue now and the glue draws the one edge round the
       whole component. This box used to carry `border: 1px solid transparent`
       that became `--line` on `[data-shown]`, so an empty box painted nothing
       and a filled one painted a card with edges, which is how it answered the
       rule `/typist/` bought: an empty bordered rectangle renders as a
       horizontal rule nobody wrote. Both halves of that belong to the part
       now. `.wish-dump` paints the ground whatever is in the box, the glue
       paints the edge, and an empty box can no longer draw a line because it
       has nothing to draw one with.
       ⚠️ THE ROOM IS STILL RESERVED ON THIS ELEMENT AND NOT ON THE PART, so the
       floor is the JSON's own and the check reads it where it is declared.
       ⚠️ AND `[data-shown]` HAS NO RULE LEFT, WHICH IS DELIBERATE. A rule
       painting an edge the glue already paints would be a second border over
       the one the child gave up, which is the doubled edge `.pos-glue` exists
       to avoid, and it would read as correct in the stylesheet. The attribute
       itself stays: `show()` and `clearAnswer()` are the page's own record of
       whether an answer is on screen, and the checks read it.
       ⚠️ THE GLIMMER IS UNAFFECTED. It was always `background-image`, and the
       warning that bought that wording was about a `background` shorthand
       resetting it. There is no shorthand on this element any more. */
````

<a id="wish-13"></a>
## wish-13: demo/wish/index.html, style, line 150

````css
  /* 🔴 A TEXT SURFACE THAT IS WAITING FOR SOMETHING SAYS SO, WITH THE SAME
     SWEEP EVERY CONTROL IN THIS PROJECT USES. Asked 2026-09-21: *"make
     textinputs / areas have same glimmer fade when processing, waiting for
     input. bit moer subtle"*.
     ⚠️ SUBTLER IS ONE NUMBER AND NOT A SECOND ANIMATION. The button's sweep is
     `var(--fg)` at 22 per cent; this is 9, because a button is a small bright
     object and these two are the largest surfaces on the page. The PERIOD is
     deliberately the same 1.1 s: two sweeps side by side at different rates
     beat against each other, which is a second thing to look at rather than a
     quieter version of the first.
     ⚠️ `@keyframes pos-sweep` IS `shell.css`'s OWN, reused rather than copied.
     One idea, one picture, which is the argument `choice.mjs` already makes
     about its own pending state.
     ⚠️ PAINT ONLY, WHICH IS THE STANDING RULE: `background-image` changes no
     size, no border width and no shadow spread, so nothing under a reader's
     hand moves while it runs. Asserted as a measured height rather than
     believed. */
````

<a id="wish-14"></a>
## wish-14: demo/wish/index.html, style, line 167

````css
  /* 🔴 NO SHIMMER ON EITHER BOX, ASKED FOR AS *"rm shimmers from textareas"*.
     A sweeping gradient across a box somebody is reading or typing into is
     motion with no information in it: the busy state is already said by the
     button's own sweep, which `shell.css` paints, and by the log line that
     lands when the answer does. Two channels saying the same thing, and the one
     removed was the one sitting under a cursor.
     ⚠️ WHAT IT WAS FOR IS NOT LOST. `data-busy` is still set on both boxes, so
     a page rule could paint them again and the checks that read the attribute
     are unmoved; what is gone is the animation. */
````

<a id="wish-15"></a>
## wish-15: demo/wish/index.html, style, line 176

````css
  /* 🔴 ONE ROW PER CONNECTION, AND EVERY ROW IS A PART OF THE GLUE. Asked
     2026-09-22 with a sketch: *"make allowes/disallower + diagram to a separate
     row: --- interpret ... --- (diagram1) allowed: Mk... --- (diagram2)
     allowed: .... ---"*. Every verdict used to stack in one part with ONE
     picture of all of them under the lot, so a reply proposing two connections
     drew two arrows in one figure and left the reader to work out which
     sentence belonged to which arrow. A connection is a row now, and it carries
     its own picture, its own sentence and its own reserved room on the right.
     ⚠️ A GRID RATHER THAN NESTED FLEX ROWS, because the right hand column has to
     be RESERVED rather than sized by what is in it: a track declared in
     `grid-template-columns` takes its width with an empty cell, and a flex
     child cannot. See `--wish-act`. */
````

<a id="wish-16"></a>
## wish-16: demo/wish/index.html, style, line 194

````css
    /* 🔴 A ROW CARRIES ITS OWN AIR SINCE 2026-09-22, ASKED FOR AS *"add more
       padding to patch block"*. It had only `.wish-part`'s 10 by 12, which was
       written for a part holding a paragraph, and a row holds a DRAWING: the
       figure keeps 2 px off its own edge, so with 12 px of part padding the
       first box stood 14 px from the seam and read as falling out of the row.
       ⚠️ IT ARRIVED WITH THE LEFT ALIGNMENT AND NOT BEFORE IT, which is the
       whole reason it was not seen earlier: a centred figure bought this air by
       accident, from space nobody had asked for. Left aligning it took away a
       margin that was never declared. */
````

<a id="wish-17"></a>
## wish-17: demo/wish/index.html, style, line 205

````css
  /* 🔴 THE RIGHT OF EVERY ROW IS FOR ACTIONS, AND SINCE 2026-09-28 THERE IS ONE
     IN IT. Asked on 2026-09-22 as *"reserve right side of diagram+allowed
     to action buttons etc. align diagram to left?"*, filled on 2026-09-25 by
     *"wish: when connections (diagram rows) are there, enable them. add small
     remove button on each to the right of the row"*, and halved on 2026-09-28
     by *"rm on button on wish, just keep x button"*. It was declared empty for
     three days for the reason that still governs it: a column that arrives with
     its first button moves the picture sideways under the reader's eye, so the
     width was reserved before anything wanted it.
     🔴 AND THE WIDTH DOES NOT SHRINK WITH ITS CONTENTS, WHICH IS THE SAME RULE
     FROM THE OTHER SIDE. A reserved column that narrowed when a control left
     would move the picture sideways exactly as one that widened, so 72 px stays
     and the remove square keeps sitting at its right edge.
     🔴 AND ITS TENANT WAS PREDICTED WRONG, WHICH IS WORTH LEAVING IN. This
     comment said the tenant was the incomplete row's missing controller number,
     learned by turning a knob. That is still unbuilt, and so is the switch that
     came and went in three days.
     🔴 AND THE WIDTH IS A MEASUREMENT RATHER THAN A TASTE. `diagram.mjs` draws
     a row of boxes while its host is at least 560 px wide and stacks them into
     one tall column below that. This page is 688 px at its widest, the glue
     spends 2 px on its border and a part 24 px on its own padding, so 662 px is
     what the row has and everything the actions take comes off the picture. 72
     plus the 12 px gap leaves 578, which is 18 px of headroom. The check reads
     the mode the drawer chose and prints the width beside it, so the day this
     column grows the page says which number broke it. */
````

<a id="wish-18"></a>
## wish-18: demo/wish/index.html, style, line 232

````css
    /* 🔴 THE COLUMN STAYS A COLUMN WITH ONE CONTROL IN IT, AND THE MEASUREMENT
       THAT BOUGHT THE STACK IS KEPT BECAUSE IT IS WHAT REFUSES A SECOND ONE
       BESIDE IT. MEASURED 2026-09-25 with both built: the checkbox and its word
       were 37.3 px and the remove square is 34.0, which is 77.3 px side by side
       against a column of 72, so anything that ever joins this button joins it
       underneath. The column spans both rows of the connection grid, so it is
       120 px tall at its shortest and one 34 px control sits in the middle of
       that. */
````

<a id="wish-19"></a>
## wish-19: demo/wish/index.html, style, line 240

````css
    /* ⚠️ `flex-start` IS THE OTHER HALF OF THE ALIGNMENT ABOVE, and the two
       have to be read together: this column spans both rows of the connection
       grid and is 120 px tall at its shortest, so `center` put a 34 px square
       in the middle of a reserve while the picture beside it started at the
       top. */
````

<a id="wish-20"></a>
## wish-20: demo/wish/index.html, style, line 248

````css
  /* 🔴 THE SQUARE IS `shell.css`'s OWN 34, RE-DECLARED HERE BECAUSE THAT RULE
     IS SCOPED TO `.pos-controls` AND THIS BUTTON IS NOT IN IT. `shell.mjs`
     stamps `data-glyph` on a control whose whole label is one non-letter and
     `.pos-controls button[data-glyph="1"]` squares it; a glyph button anywhere
     else keeps the 18 px word padding of a pill, which is a word of air round
     one character. MEASURED 2026-09-25 by taking this rule off and running the
     page: the same button lays out at **45.8 px** wide against the 34.0 it has
     with the rule, in a column of 72.
     ⚠️ THE NUMBER IS COPIED, NOT MEASURED AGAIN, so the two cannot disagree
     about what a square is. The shared rule needing a page copy is reported
     rather than fixed here, because this page does not own `shell.css`. */
````

<a id="wish-21"></a>
## wish-21: demo/wish/index.html, style, line 264

````css
  /* 🔴 A ROW IS PRESSED TO CHOOSE IT, AND THE TREATMENT IS THE TABLE'S OWN.
     Asked as *"clickin on row enables it (left yellow border and slihjt bg
     change as in table)"*, so the two declarations under `.on` are
     `.pos-tbl-row.on`'s, read out of `shell.css` rather than invented here.
     ⚠️ THEY ARE COPIED RATHER THAN BORROWED, WHICH IS A DECISION AND NOT AN
     OVERSIGHT. `.pos-tbl-row` is a grid of the columns a table declares, with
     its own padding and its own bottom rule, so a page pulling that class onto
     something that is not a table row would be reaching into a component's
     insides for two lines of paint. What keeps the copy honest is the check: it
     marks a row in the table above and compares the computed shadow and ground
     of the two, so the day `shell.css` moves either one this page goes red. */
````

<a id="wish-22"></a>
## wish-22: demo/wish/index.html, style, line 278

````css
  /* 🔴 THE LIFTED GROUND ALONE, AND THE YELLOW LEFT BAR IS GONE SINCE
     2026-09-22: *"rm yellow left line, its excessive"*. It was taken from
     `table.mjs` so that a chosen row here and a chosen row there would be one
     treatment, and that reasoning was right about the SOURCE and wrong about
     the DOSE: a table row is 28 px tall and one line of text, where a 2 px bar
     is the only thing that could carry a state; a connection row is 180 px of
     picture and sentence, where the same bar is a stripe down a panel.
     ⚠️ **THE GROUND STILL COMES FROM `table.mjs`'S OWN**, and the check still
     compares the two, so one treatment survives where it can be seen. What went
     is the half that did not scale with the row. */
````

<a id="wish-23"></a>
## wish-23: demo/wish/index.html, style, line 289

````css
  /* 🔴 THE ROW'S OWN SENTENCE, UNDER ITS OWN PICTURE, IN THE LEFT COLUMN, AND
     IT KEEPS TWO LINES' ROOM WITH ONE LINE IN IT. That reservation was on the
     verdict PART until 2026-09-22 and the reason has not changed: a refusal
     names its reason under it and an allowed link names what the far end
     drops, so most answers are two lines and some are one, and a box sized by
     its words would move the picture above it between two answers that are
     both perfectly ordinary. MEASURED at 39 px for two lines against this
     40 px floor.
     ⚠️ CENTRED IN THAT ROOM, so a single line does not sit against the picture
     with all the air under it. The flex children are the two lines, which are
     blocks either way, so the column direction changes nothing about how they
     read. */
````

<a id="wish-24"></a>
## wish-24: demo/wish/index.html, style, line 301

````css
  /* 🔴 NO RESERVED BOX, SINCE 2026-09-22: *"rm wish-hy"*, against an inspector
     shot of `div.wish-why 582 x 40` sitting empty under every row. It reserved
     40 px for a sentence that MOVED INTO THE FIGURE'S CAPTION hours earlier, so
     what it held was air, and that air is the *"extra huge padding below
     diagram"* reported three times.
     ⚠️ **IT STILL EXISTS FOR THE ONE ROW THAT HAS NO PICTURE**, a link that
     begins and ends at one instrument, which draws no arrow and so has no
     caption to write into. It takes the room it needs and none when it is
     empty, which is the empty box rule: a container with nothing in it must not
     paint its edges or hold its height. */
````

<a id="wish-25"></a>
## wish-25: demo/wish/index.html, style, line 316

````css
  /* 🔴 THE SENTENCE IS THERE WHEN NOBODY IS READING THE PICTURE. Asked as
     *"allowed: Mk... (show when no iteraction with diagram)"*. `createDiagram`
     writes the box's or the arrow's own note into its caption on hover and
     marks that caption `data-on`, so the attribute is the whole signal and
     nothing has to be wired to a pointer on this page.
     ⚠️ `visibility`, NEVER `display`: the line keeps its room, so reading the
     picture cannot move the row the picture is in.
     ⚠️ AND A BROWSER THAT DOES NOT KNOW `:has()` DISCARDS THE RULE AND SHOWS
     THE SENTENCE ALWAYS, which is what this page did yesterday. `shell.css`
     records what a discarded selector list cost on `:fullscreen`; what is
     different here is that the fallback is the old behaviour rather than a
     control that does nothing. */
````

<a id="wish-26"></a>
## wish-26: demo/wish/index.html, style, line 330

````css
  /* 🔴 THE THIRD VERDICT, AND ITS COLOUR IS DECIDED ONCE HERE. `--ok` is the
     desk agreeing and `--bad` is the desk refusing, and a link that is missing
     an argument is neither: it is the desk waiting for something a person can
     supply. `--warn` is the project's third mark colour and carries exactly
     that on every lane that uses it, so nothing new is invented and no reader
     has to learn a fourth hue.
     ⚠️ NOT `--hi`, WHICH ALREADY MEANS SOMETHING ON THIS ROW. The chosen row's
     left edge is `--hi`, and a word in the same yellow inside it would read as
     part of the selection rather than as a verdict. */
````

<a id="wish-27"></a>
## wish-27: demo/wish/index.html, style, line 343

````css
  /* 🔴 THE PICTURE'S ROOM, AND IT STANDS NOW BECAUSE THE HOST MOVED. This
     comment recorded a measured failure until 2026-09-21: with nothing proposed
     the host was **0 px, `display: none`**, because `shell.css` carries
     `.pos-stack > div:empty { display: none }` at (0,2,1) and this host is an
     empty div on the first paint and after every press. A page-local
     `div.wish-dg:empty { display: flex }` at the same weight and later in the
     cascade was what held it up.
     🔴 THAT RULE IS GONE, because the host is a child of the glue now and not
     of the page stack, so the shared rule cannot reach it at all. A rule that
     matches nothing is this project's second most expensive kind of defect,
     and it reads as the thing keeping the room open. The room is `min-height`
     and `display: flex` on this element, which is all it ever needed to be once
     nothing was fighting it.
     ⚠️ IT IS CENTRED IN ITS OWN BOX, because the tallest state is the one with
     the least in it: without this the picture would sit against the top and
     leave nothing but air under it for every run that succeeds. */
````

<a id="wish-28"></a>
## wish-28: demo/wish/index.html, style, line 359

````css
  /* ⚠️ **120 STAYS, AND I CUT IT TO 100 FOR A FEW MINUTES ON A MISREADING.**
     `.pos-dg` measures 100 and the HOST measures 119 with a picture in it,
     because the figure carries its own caption line. Reserving 100 would make
     the row grow by 19 px the moment an answer landed, which is the jump this
     reservation exists to stop, and the page's own check caught it in one run:
     `100 px is the default height, against 0, 119, 100 drawn`. */
````

<a id="wish-29"></a>
## wish-29: demo/wish/index.html, style, line 366

````css
    /* 🔴 A DEFAULT HEIGHT, AND IT IS MEASURED. Asked 2026-09-21: *"use the
       patcher visualizer with a default height and a shimmer only while
       thinking"*. The two states that exist both lay out at **119 px** at this
       page's width, so 120 is the default and the box grows past it where a
       narrower screen makes the drawer stack.
       ⚠️ IT READ 252 px BEFORE THAT, measured when the WHOLE DESK was drawn in
       one column. Only the instruments a proposal touches are drawn since, so
       that number reserved 133 px of air that nothing could ever fill.
       🔴 IT READ 140 WHILE THIS HOST WAS ITSELF A PART OF THE GLUE, which was
       the same 120 with the part's own padding added back, because `*
       { box-sizing: border-box }` is project-wide and a `min-height` on a
       padded box reserves the padding out of it. The host is a CELL of a
       connection row since 2026-09-22 and the padding belongs to the row, so
       the number is 120 again and it is the number that was measured. The
       check still subtracts whatever padding it finds, which is 0 here.
       ⚠️ AND THE PICTURE IS CENTRED INSIDE THIS CELL RATHER THAN AGAINST THE
       LEFT EDGE, because `diagram.mjs` centres its own figure in the width it
       is given. What the row can do is take the width away: the actions column
       holds the right hand end, so the picture sits in the left of the row.
       Going further is a change to the component and was not made. */
````

<a id="wish-30"></a>
## wish-30: demo/wish/index.html, style, line 387

````css
    /* 🔴 `flex-start`, NOT `center`, SINCE 2026-09-28. Asked with a crop of a
       row whose `×` sat half way down beside a picture that started at the top:
       *"align close top margin to diagram top margin"*.
       ⚠️ AND THE THING BEING ALIGNED TO WAS NOT A MARGIN. MEASURED before
       touching it: this cell runs 174.5 to 294.5 and the figure inside it runs
       184.5 to 284.5, so the picture's 10 px of air was the LEFTOVER of
       centring a 100 px figure in a 120 px reserve, and `.pos-dg`'s own
       `margin-top` and `padding-top` both read 0. A number that is the half of
       a subtraction is a number no sibling can read, which is why the repair is
       not a 10 px anything on the actions column: both cells start their
       content at the top of the row now, and they agree at every width and in
       both of the drawer's modes without either knowing the other's height.
       ⚠️ THE RESERVE IS UNCHANGED AND SO IS WHAT IT IS FOR. 120 px still holds
       the row still between states; the slack simply sits under the picture
       rather than being split above and below it. */
````

<a id="wish-31"></a>
## wish-31: demo/wish/index.html, style, line 404

````css
  /* 🔴 ONE PADDING ON BOTH AXES, ASKED FOR AS *"just have unified x y
     padding"*. The row was `6px 10px`, so the air above a picture was not the
     air beside it, and the figure carried its own band on top of that. 10 is
     the horizontal number that was already there, and `.tbar` makes the same
     argument for its own 8: one number, both ways, and the three that follow
     from it are one sum rather than three typed figures. */
````

<a id="wish-32"></a>
## wish-32: demo/wish/index.html, style, line 411

````css
  /* 🔴 NO MARGIN AT ALL, AND IT USED TO BE `margin-top` ONLY. Not
     `.pos-body > .pos-dg`: that 44 px belongs to the standing `How it works`
     picture, which opens a section at the end of a page. This one is a result
     and sits with the JSON it draws.
     🔴 THE BOTTOM HALF IS WHAT MADE THE ROOM A FICTION. `.pos-dg` carries
     `margin: 0 0 14px`, and `.pos-glue` takes a margin off its DIRECT children
     only, so the figure kept 14 px under it inside this part: a 119 px picture
     asked for 133 px of room against a 120 px floor, and the part grew when an
     answer landed. The assert could not see it either, because it reads the
     figure's own rect and a margin is outside that. */
````

<a id="wish-33"></a>
## wish-33: demo/wish/index.html, style, line 423

````css
  /* 🔴 NO SPINNER ON HOVER. Asked 2026-09-21: *"rm spinner on hover"*.
     `shell.css` gives every busy control `cursor: progress`, which macOS draws
     as a spinning wheel beside the pointer, so the one control on this page a
     person holds down had a spinner under their hand for the whole press.
     🔴 AND NO DOT EITHER, ASKED THE SAME DAY: *"rm dot from hold to talk"*. A
     voice level dot was asked for first and then withdrawn, so the button
     carries no indicator of its own at all. The `data-busy` sweep, which is
     paint on the button rather than something added to it, is the whole signal
     and it runs from the press until the answer lands.
     ⚠️ SPECIFICITY RATHER THAN ORDER, WHICH IS THE WEAKER FIX AND IS THE ONLY
     ONE AVAILABLE: the rule being beaten is in a shared stylesheet this page
     cannot reorder. `button[data-busy="1"]` is (0,1,1) and this is (0,2,1). */
````

<a id="wish-34"></a>
## wish-34: demo/wish/index.html, style, line 436

````css
  /* 🔴 AND NOTHING PAINTS THE MODEL PICKERS AT ALL. Asked 2026-09-21: *"don't
     animate the model radios"*. They were briefly given `choice.mjs`'s own
     pending sweep so the row could say which of the two models was at work, and
     that is the wrong thing to say on them: a picker holds a choice a person
     made, and animating it reads as the page doing something TO that choice.
     What is at work is said by the box the answer is going to land in.
     ⚠️ SO THERE IS NO RULE HERE, AND THAT IS DELIBERATE. A rule guarding the
     spinner on an animating picker would be a dead rule, which this project
     counts as its second most expensive kind of defect. The check reads the
     pickers at every moment of the span and expects to find nothing. */
````

<a id="wish-35"></a>
## wish-35: demo/wish/index.html, inline script, line 458

````js
  /**
   * 🔴 A COUNTER IN FRONT OF THE ONE CALL THAT REACHES AN INSTRUMENT, AND IT IS
   * `/tom/`'s. `navigator.requestMIDIAccess` raises a browser permission dialog
   * and hands back every port on the desk, and this page may not make that call
   * on a visit or under the harness. A comment saying so is a claim about a
   * file; this makes *nothing was opened* a number an assert can read, which is
   * the same shape as `reached` for the agent further down.
   * ⚠️ IT IS WRAPPED BEFORE ANY OF THIS PAGE'S OWN CODE RUNS, or the wrapper
   * would be grading whatever happened after it.
   */
````

<a id="wish-36"></a>
## wish-36: demo/wish/index.html, inline script, line 474

````js
  /**
   * 🔴 SAY WHAT YOU WANT AND THE DESK PROPOSES A PATCH. Asked 2026-09-21:
   * *"Can we have a demo called Wish? Where I can input voice uh, commands and
   * you are translating them to a batch pay via the models from Cloudflare,
   * maybe even try out different models."*
   *
   * 🔴 **IT PROPOSES, AND A PERSON PRESSES, AND THAT IS NOT CAUTION, IT IS THE
   * MEASUREMENT.** Run against the real models and the real desk on the day this
   * was built: asked to put the mod wheel on the master filter, the 70B returned
   * a perfectly valid patch pointed at the **wrong instrument**. Nothing in a
   * validator can catch that, because there is nothing invalid about it. What
   * catches it is somebody reading one line of text.
   * 🔴 **THIS PARAGRAPH READ `IT NEVER CONNECTS` UNTIL 2026-09-25, AND HALF OF
   * IT IS NOW FALSE.** Asked: *"wish: when connections (diagram rows) are there,
   * enable them"*, settled the same day as *"arhive bay demo and rm from index.
   * use the connecting code in wish"*. A row makes the link REAL: `bay.mjs`'s
   * `link`, `send` and `unlink`, the same code `/bay/` used before its page was
   * archived.
   * 🔴 **AND THE SWITCH THAT USED TO CARRY IT WENT ON 2026-09-28**, asked as
   * *"rm on button on wish, just keep x button"*. The row itself is the
   * connection now, so **what a person presses is `Interpret`, a prepared row
   * or `Hold to talk`, and the answer that comes back is made**. The sentence
   * above it survives that unchanged: the model still only proposes, the reply
   * is still on screen in words and in a picture before anything is sent, and
   * `×` takes any row down and off in one gesture.
   * ⚠️ **AND NOTHING IS OPENED UNTIL SOMEBODY ASKS FOR A PATCH.** There is no
   * `requestMIDIAccess` on the load path, a visit lays one empty row and calls
   * `show` never, and under `?selfcheck=1` there is none at all: the checks
   * drive the whole routing path through two stand-in ports, so a suite run is
   * never a hand on somebody's instrument.
   *
   * ⚠️ **NOTHING HERE REACHES CLOUDFLARE UNTIL A PRESS, AND NOTHING REACHES IT
   * UNDER THE HARNESS AT ALL.** It is somebody's account, and a suite run is
   * dozens of Chromes. The checks below run on a canned reply.
   */
````

<a id="wish-37"></a>
## wish-37: demo/wish/index.html, inline script, line 510

````js
  /**
   * 🔴 WHERE THE AGENT IS, AND THIS PAGE USED TO ANSWER 200 ON A HOSTNAME WHERE
   * IT COULD NOT POSSIBLY WORK. The default was `http://127.0.0.1:8799`
   * whatever served the page, so `https://positron.studio/wish/` loaded
   * perfectly, painted every control, and then asked a port on the VISITOR's
   * own machine, which is nobody's wish agent. That is the shape this project
   * calls a lie: a page that looks like it is working.
   * ✅ **THE DEFAULT FOLLOWS WHERE THE PAGE CAME FROM.** Served off this laptop
   * it talks to `node demo/wish-local.mjs`; served off anything else it talks
   * to the deployed Worker, which is where the credential is.
   * ⚠️ `?api=` STILL WINS OVER BOTH, which is how the deployed page is pointed
   * at a local agent and the other way round.
   * ⚠️ AND THE TEST IS *IS THIS MACHINE*, NOT *IS THIS THE SITE*. A phone on
   * the same wifi is looking at `http://192.168.x.x:8890` and can never reach a
   * laptop's loopback, so it belongs on the deployed agent like any other
   * visitor. `workers/wish/src/wish.mjs` allows that page's origin for exactly
   * this reason.
   */
````

<a id="wish-38"></a>
## wish-38: demo/wish/index.html, inline script, line 528

````js
  /**
   * 🔴 AND THE DEFAULT IS THE DEPLOYED WORKER EVERYWHERE SINCE 2026-09-21, WHICH
   * REVERSES HALF OF THE PARAGRAPH ABOVE. Reported in one line: *"nothing
   * answered at http://127.0.0.1:8799. Start the agent with `node
   * demo/wish-local.mjs` - fix it. use worker"*.
   * ⚠️ THE OLD REASONING WAS RIGHT ABOUT THE DEPLOY AND WRONG ABOUT THE DESK.
   * It fixed a real defect, a page that answered 200 on a hostname where it
   * could not possibly work, and it fixed it by following where the page came
   * from. What it then did was make `http://127.0.0.1:8890/wish/` depend on a
   * SECOND process that nobody starts, so the page this repository is developed
   * on is the one page that does not work out of the box.
   * ✅ AND NOTHING IS LOOSENED, WHICH IS WHY THIS IS SAFE RATHER THAN A
   * CONCESSION. `workers/wish/src/wish.mjs`'s `NEAR` pattern already allows
   * `http://localhost`, `http://127.0.0.1` and every private range, for the
   * phone-on-the-wifi case, so a page on this laptop was always a caller the
   * agent would answer. The only thing that changes is which URL it asks first.
   * ⚠️ `?api=` STILL WINS, which is how somebody working on the agent itself
   * points at `node demo/wish-local.mjs`, and it is what the local runner is
   * for now.
   */
````

<a id="wish-39"></a>
## wish-39: demo/wish/index.html, inline script, line 551

````js
  /**
   * 🔴 THE DESK, DESCRIBED RATHER THAN DISCOVERED, AND THAT IS DELIBERATE ON
   * THIS PAGE. `/bay/` reads the browser's own MIDI ports and therefore needs a
   * permission and an instrument; this page is about the sentence, so it carries
   * the desk that was measured, and every id is the one `/bay/` would build for
   * the same device.
   */
````

<a id="wish-40"></a>
## wish-40: demo/wish/index.html, inline script, line 558

````js
  /**
   * ⚠️ `box` IS DECLARED RATHER THAN DERIVED, and the Model 12 is why. Its two
   * ports are called `Model 12 MIDI IN` and `Model 12 MIDI OUT`, so the middle
   * segment of their ids differs and the two halves of one instrument cannot be
   * recognised as one by splitting an id. Stripping the words off the labels
   * would work until a device is renamed, which is the thing a label does.
   */
````

<a id="wish-41"></a>
## wish-41: demo/wish/index.html, inline script, line 569

````js
    /**
     * 🔴 THE MODEL 12 OFFERS TWO PAIRS AND ONLY ONE WAS HERE, WHICH MADE A
     * WRONG ANSWER THE ONLY ANSWER AVAILABLE. Asked 2026-09-21: *"I want to
     * play notes with my model 12 REC buttons and play it to a circuit synth
     * 1"*, and the model answered `Model 12 MIDI IN -> Circuit`, which is
     * ALLOWED and would do nothing.
     * ✅ MEASURED: the control surface is `Model 12 DAW Control IN`, **525
     * messages**, while `Model 12 MIDI IN` **stayed silent throughout**,
     * because that port is the DIN socket bridged to USB and nothing was
     * patched into the jack.
     * 🔴 AND THE PORT LIST IS AN `enum` ON PURPOSE, WHICH IS WHY THIS MATTERED
     * SO MUCH. That enum is what stopped a Moog and a Prophet, neither on this
     * desk, coming back as inventions. An enum missing a REAL port is the same
     * mechanism refusing the truth, and the model has no way to say *the port I
     * need is not on your list*.
     * ⚠️ `instruments.mjs` HAD KNOWN ABOUT BOTH PAIRS SINCE THE TAXONOMY
     * LANDED, and says in its own comment that they are two different things:
     * the MIDI pair carries notes and controllers, the DAW Control pair speaks
     * Mackie Control. The fact was in this repository and not in this list.
     */
````

<a id="wish-42"></a>
## wish-42: demo/wish/index.html, inline script, line 598

````js
  /**
   * Measured facts, handed to the model because no manual carries them.
   *
   * 🔴 THE ROTARIES ARE IN HERE SINCE 2026-09-21, AND THEIR ABSENCE WAS A REAL
   * GAP RATHER THAN A MODEL FAILURE. Reported: *"'first' should be enogh. i see
   * these rotaries!"*, after *"connect the first rotary knob of evolution to
   * the first rotary knob of circuit"* came back as `{"op":"cc","to":1}` with
   * no `from` at all and was refused. **The model had no way to know what a
   * rotary sends.** It was told the channels and the semitone offset and
   * nothing about controller numbers, so *the first rotary* named a thing it
   * could not resolve, and it guessed a 1.
   * ⚠️ AND THE PAGE COULD HAVE ANSWERED IT ALL ALONG. Both runs are measured on
   * this desk and written down in `research/measured-devices-2026-09-20.md`: the
   * keyboard's knobs at line 199 and the Circuit's macros at line 169. The
   * facts existed in the repository and were never handed over.
   * ⚖️ AND THE INFERRED HALF IS MARKED AS INFERRED, HERE, IN THE PROMPT. Macros
   * 7 and 8 were never turned, so CC 86 and 87 come from the run of six rather
   * than from a measurement, and a model told they are facts would state them
   * as facts. Telling it which two are guesses is the same rule this project
   * applies to its own prose.
   */
````

<a id="wish-43"></a>
## wish-43: demo/wish/index.html, inline script, line 627

````js
    // 🔴 THE MODEL 12'S BUTTONS, AND THE ONE THAT CANNOT SAFELY PLAY A SYNTH.
    // ✅ MEASURED and recorded on `/twelve/`: REC is notes 0 to 7, SOLO 8 to 15,
    // MUTE 16 to 23, and **REC SENDS NO RELEASE while SOLO and MUTE do**. Two
    // buttons on one mixer, both momentary on the panel, disagreeing on the
    // wire. A model asked to play a synth from REC would write a perfectly
    // valid patch that leaves every note hanging on an instrument in another
    // building, and nothing in the validator could catch it, because there is
    // nothing invalid about it. So the model is told, in the same sentence.
````

<a id="wish-44"></a>
## wish-44: demo/wish/index.html, inline script, line 645

````js
    // 🔴 THE LIST OF TRANSFORMS USED TO BE RETYPED HERE AND IT READ
    // *"channel, transpose, velocity, only, drop, cc, and three more"*. It was
    // the fourth copy of one vocabulary, it was written the day `range`,
    // `vrange` and `fixed` were added, and the copy that actually defines the
    // format for a model, the operator table in `systemFor()`, was the one
    // nobody updated. The table is generated from `bay.mjs` now and lists all
    // nine with their argument names, so a sentence here naming six would only
    // ever be a chance to disagree with it.
    // ⚠️ WHAT STAYS IS THE PART NO PER-OP LINE CAN CARRY: a split is a SHAPE
    // made of two links, which is a fact about composing the language rather
    // than about any one word in it.
````

<a id="wish-45"></a>
## wish-45: demo/wish/index.html, inline script, line 661

````js
  /**
   * 🔴 TWO LISTS, NOT ONE. `accepts` is what a port handles and anything else is
   * dropped at the boundary with the link saying so; `never` refuses the link
   * outright. The Circuit's SysEx line is on the second list because that device
   * keeps the owner's sessions, which no factory reset brings back.
   */
````

<a id="wish-46"></a>
## wish-46: demo/wish/index.html, inline script, line 675

````js
  /**
   * 🔴 ALL THREE OF THESE WORK, AND FOR A WHILE TWO OF THEM COULD NOT. Reported
   * 2026-09-21: choosing `whisper` answered a schema mismatch, because one
   * payload shape was being sent to three models that do not share one. `turbo`
   * takes base64, the two older ones take an array of bytes, and `turbo` was the
   * default, so nothing had ever pressed the other two.
   * ✅ MEASURED on one 12,863 byte recording of the same sentence, after the
   * repair: all three returned it word for word, in 1.2 s, 1.3 s and 1.7 s.
   * ⚠️ THE DIFFERENCE SHOWS UP ON LENGTH. On 79 s of speech `turbo` returned
   * 1,653 characters in 11.0 s and `whisper` returned 839 in 29.1 s, so the
   * older one transcribed about half the recording and took nearly three times
   * as long. A byte array also costs 3.57 bytes of request per byte of audio
   * against base64's 1.34, which is 2.67 times the body for the same words.
   * ⚠️ AND VOICE ACTIVITY DETECTION IS `turbo`'s ALONE: the other two take no
   * options at all, so nothing tells them to ignore a synth in the room.
   */
````

<a id="wish-47"></a>
## wish-47: demo/wish/index.html, inline script, line 694

````js
  /**
   * 🔴 THE ROW IS CALLED `PATCH` AND IT WAS CALLED `THINK`. Asked 2026-09-21:
   * *"replace "think" with something else, more related to task at hand"*.
   * `think` describes a mechanism in the private vocabulary of the people who
   * built the page, which is exactly what the no-jargon rule is about: a
   * visitor reading `THINK` beside `HEAR` learns nothing about what either one
   * produces. `patch` is already this project's word for the output, in
   * `printLink`, in the patch language and in `/bay/`, so the row reads
   * *HEAR ... PATCH ...*, which is what the page does.
   * ⚠️ `WIRE` WAS THE OTHER CANDIDATE AND IS TAKEN, by `demo/shell/wire.mjs`
   * and by a demo of that name.
   */
````

<a id="wish-48"></a>
## wish-48: demo/wish/index.html, inline script, line 712

````js
  /**
   * 🔴 WHAT EACH MODEL IS CALLED IN FULL AND WHAT A PRESS COSTS, ON HOVER.
   * Asked 2026-09-22: *"give me full names of models with prices as model
   * (browser std tooltip) on hover"*. Both rows show a nickname, `turbo` and
   * `70B` and `Scout`, which is the right label on a button that wide and tells
   * a reader nothing about which model ran or what asking it costs.
   * ✅ READ OFF `developers.cloudflare.com/workers-ai/platform/pricing/` on
   * 2026-09-22, whose own page stamp says last updated 2026-09-17. The rate is
   * $0.011 per 1,000 neurons and the free allocation is 10,000 neurons a day,
   * reset at 00:00 UTC.
   * 🔴 `whisper-tiny-en` HAS NO PUBLISHED PRICE AND ITS TOOLTIP SAYS SO IN
   * WORDS. Two pages were checked: it is absent from the audio pricing table
   * entirely and its own model page has no Unit Pricing row. It does not get a
   * guessed price, an interpolated one, or one borrowed from either of the
   * other whispers. A plausible invented number here is the exact failure this
   * project keeps paying for.
   * ⚠️ AND TWO CLOUDFLARE PAGES DISAGREE ABOUT `@cf/openai/whisper`. The
   * pricing table says $0.0005 per audio minute and that model's own page says
   * $0.000453. The table is what is quoted, because one source has to win and
   * the pricing table is the one that prices everything else in this list.
   * ⚠️ THE UNITS ARE IN THE TOOLTIP RATHER THAN IMPLIED. `$0.293` on its own
   * says nothing, an audio minute and a million tokens are not comparable
   * quantities, and telling those two apart is most of what this hover is for.
   * ⚠️ WORTH KNOWING AND NOT A TYPO: `3B` costs MORE per input token than `8B`,
   * $0.051 against $0.045.
   * ⚠️ NEURONS PER MILLION TOKENS, input then output, which is what the dollar
   * figures are computed from and what the daily allocation is counted in:
   * 70B 26,668 and 204,805, 8B 4,119 and 34,868, 3B 4,625 and 30,475, Mistral
   * 31,876 and 50,488, Scout 24,545 and 77,273. The two priced speech models
   * are 46.63 and 41.14 neurons an audio minute. They are here rather than in
   * the tooltip because a tooltip is two short lines and this is a table.
   */
````

<a id="wish-49"></a>
## wish-49: demo/wish/index.html, inline script, line 759

````js
  /**
   * The full name on one line and what it costs on the next.
   * ⚠️ A MODEL WITH NO ROW IN `PRICE` GETS A ONE LINE TOOLTIP AND THE CHECK
   * GOES RED, rather than a fallback price that reads as a reading. `filter`
   * drops the missing line instead of printing `undefined`, which would be a
   * number-shaped thing in a place a reader trusts.
   */
````

<a id="wish-50"></a>
## wish-50: demo/wish/index.html, inline script, line 770

````js
    /**
     * ⚠️ MORE SPECIFIC, AND THE VENDOR IS OUT. Asked 2026-09-21: *"be more
     * specific and its not importat its cf model"*. `what you want the desk to
     * do` is a sentence that would fit any page here, and *Cloudflare* names
     * whose computer it runs on, which is a fact about the bill rather than
     * about what a visitor is looking at.
     */
````

<a id="wish-51"></a>
## wish-51: demo/wish/index.html, inline script, line 777

````js
    /**
     * 🔴 THE SENTENCE MOVED AGAIN ON 2026-09-28, AND IT IS THE RULE RATHER THAN
     * A POLISH. It read *a connection you can switch on* while the switch was
     * on every allowed row; the switch is gone (*"rm on button on wish, just
     * keep x button"*) and a row that arrives is already made, so the old line
     * described a control a visitor would look for and never find. A
     * description that has drifted is worse than a missing one, because a
     * visitor believes it.
     * ⚠️ STILL ONE SENTENCE, with no colon, no semicolon and no second clause
     * bolted on: what `×` does is said by its own hover.
     */
````

<a id="wish-52"></a>
## wish-52: demo/wish/index.html, inline script, line 789

````js
    /**
     * 🔴 NO READOUT AT ALL. Asked 2026-09-21: *"rm links / 1 / refused / 1"*,
     * which is both remaining cells after the two timings came off earlier the
     * same day. The cells went one pair at a time for the same reason: a count
     * of links and a count of refusals are the OUTCOME, and the outcome already
     * has a better home on a page where every answer is an event rather than a
     * running measurement.
     * ✅ NOTHING IS LOST, AND THAT WAS CHECKED RATHER THAN ASSUMED. Every
     * proposal logs one line carrying the time, the link count, the refusals
     * and the tokens together, which is more than two boxes could hold and it
     * is dated, so two answers can be compared.
     * ⚠️ `readout: null` IS A DECLARATION AND NOT AN OMISSION. The shell turns
     * it into `readoutOptOut`, so `demo/verify.mjs` asserts *declares that it
     * has no readout, on purpose* rather than failing a page that forgot one.
     * ⚠️ AND THE BOX IT WOULD HAVE DRAWN IS MEASURED RATHER THAN TRUSTED,
     * below: an empty `.pos-readout` painted its own two 1 px edges as a
     * full-width band nobody wrote on `/typist/`, reported as *"old UI creeping
     * in"*.
     */
````

<a id="wish-53"></a>
## wish-53: demo/wish/index.html, inline script, line 810

````js
      /* 🔴 CONTROL 0, so `settleMs` lands on it and so the harness presses the
         thing this page is about. It uses a canned reply under `?selfcheck=1`
         and reaches nobody.
         ⚠️ THE LABEL IS THE DOCUMENTATION. A control that is worked with a
         gesture rather than a press has to name the gesture, because there is
         nothing else on the page that could.
         🔴 AND IT IS NOT THE PRIMARY. Asked 2026-09-21: *"hold to talk is
         secondary button"*. It had carried `primary: true` since it was called
         `Speak`, which put the brightest fill in the row on a control that also
         wears the busy sweep from the press until the answer lands: a glow that
         means *press this* and a sweep that means *this is working* on one
         button, and the two were being read as one thing. */
````

<a id="wish-54"></a>
## wish-54: demo/wish/index.html, inline script, line 823

````js
      /* 🔴 THERE IS NO `Ask` BUTTON, ASKED FOR 2026-09-21: *"remove the Ask
         button, auto-ask after transcription"*. A release already transcribed
         and then proposed by itself, so the button was a second way to do the
         thing that had just finished happening.
         🔴 AND THE BOX STILL HAS A WAY TO SUBMIT, BECAUSE AN EDITABLE BOX WITH
         NONE IS A LYING CONTROL. It is Enter, with Shift+Enter for a newline.
         See the `keydown` handler for why that key and where the gesture is
         written down.
         🔴 AND `Use the example` IS GONE SINCE 2026-09-22, ASKED FOR AS *"add 5
         varied examples into a table, some failable instead of 'Use the
         example' in wish"*. One example was one sentence, and what is
         interesting about this page is that some sentences come back wrong in
         several different ways. See `EXAMPLES`.
         🔴 IT CARRIED A CLAIM THAT WAS NOT TRUE, AND THE CLAIM WAS MEASURED
         BEFORE IT WAS DELETED. This comment said the row had to keep one button
         because `demo/verify.mjs` presses `.pos-controls button` and nothing
         else, so the asking path would otherwise be graded by nothing. MEASURED
         2026-09-22 by moving that one button out of the row and running the
         page: **51/51 green with 45 page asserts, the same as with it in**.
         Every check on this page hangs off `d.on('check')`, which is reached by
         `speakBtn.click()` at the foot of this file, so the harness press was
         driving a path the checks already drive and was carrying no assert of
         its own. **The trap is real and this page was not in it.** */
````

<a id="wish-55"></a>
## wish-55: demo/wish/index.html, inline script, line 846

````js
      /* 🔴 `interpret` IS NEW, ASKED FOR 2026-09-21: *"add interpret button to
         header"*. It asks the language model about whatever is in the box, which
         is the same verb Enter already carries and the same one a release
         carries after a transcription. It is a BUTTON for the reason the comment
         above gives about `Use the example`: a harness cannot press a key in a
         textarea, so a page whose only way to ask was Enter would be graded by
         nothing while the suite stayed green.
         ⚠️ IT SHARES `askBox()` RATHER THAN REPEATING IT. Three ways in and one
         function, or the three drift and two of them stop matching what the page
         says they do. */
````

<a id="wish-56"></a>
## wish-56: demo/wish/index.html, inline script, line 861

````js
  /**
   * 🔴 EACH PICKER SITS WITH THE THING IT MAKES, AND THEY USED TO SHARE ONE ROW
   * AT THE TOP. Asked 2026-09-21: *"but think controls before json"*. Two models
   * run in sequence here and each one fills a different box, so a reader looking
   * at a transcription and asking *which one heard this?* had to go back up past
   * the JSON to find out, and a reader looking at the JSON had the same walk.
   * `hear` labels the transcript directly under it.
   * 🔴 `patch` NO LONGER SITS DIRECTLY ON THE JSON, AND THAT IS THE LATER ASK
   * RATHER THAN A DRIFT BACK. *"make it a single component, 3 parts, glued. in
   * top is patch list visualizer, below is diagram and dump is below"*, so the
   * picker heads the component the patch model fills and the picture stands
   * between it and the object. What the earlier ask was about survives: the
   * picker that chooses the patch model is inside the thing that model
   * produces, rather than in a row at the top of the page beside a picker for a
   * different model.
   * ⚠️ THEY ARE ROWS RATHER THAN LOOSE PICKERS, because `.pos-choice` is an
   * inline element and `.pos-stack` owns the gap between BLOCKS: an inline child
   * takes no margin, so a bare picker would sit flush against the box under it.
   * `.pos-crow` is the row the kit already has for this.
   * ⚠️ AND THE GAP IS THE PROJECT'S ONE RHYTHM, not a smaller one bought for
   * the pair. A page that writes its own gap here is a page making a claim
   * about one relationship, and the claim would be that a picker is a caption,
   * which it is not: it is a control somebody presses.
   */
````

<a id="wish-57"></a>
## wish-57: demo/wish/index.html, inline script, line 885

````js
  /**
   * 🔴 BOTH PICKERS ARE LABELLED `model`, WHICH IS WHAT THEY ALWAYS WERE.
   * Asked 2026-09-21 twice, once per block: *"move model selection to right,
   * label 'model'"* and *"model selecton to right label: 'model'"*. They read
   * `hear` and `patch`, which name the STEP rather than the thing the row
   * chooses, and a row of five model names under the word `PATCH` is a label
   * arguing with its own options.
   * ⚠️ WHAT `hear` AND `patch` WERE CARRYING IS NOT LOST, it moved to the other
   * side of the same header: the button on the left names the step, and it
   * names it as a verb somebody presses rather than as a noun.
   */
````

<a id="wish-58"></a>
## wish-58: demo/wish/index.html, inline script, line 899

````js
  /**
   * 🔴 A HEADER IS AN ACTION ON THE LEFT AND ITS MODEL ON THE RIGHT, AND BOTH
   * BLOCKS WEAR THE SAME ONE. Asked for one block at a time: *"add interpret
   * button to header and move model selection to right"*, then *"make similar
   * glued header as in interpret, put hold to talk to left and model selecton
   * to right"*.
   * 🔴 THE BUTTONS ARE MOVED OUT OF `.pos-controls`, WHICH IS A DOCUMENTED
   * PATTERN AND A REAL COST. `shell.mjs` says pages move controls on purpose and
   * are told to, and `d.button(id)` finds one wherever the page put it, which is
   * why that lookup stopped being a query on the row. The COST is that
   * `demo/verify.mjs` presses `.pos-controls button` and nothing else, so a
   * moved button is a button the harness no longer presses: `/mirror/` lost ten
   * asserts that way and `/blocks/` six, and neither suite went red, they went
   * quiet. **So the checks below press `speak` and `interpret` by name.**
   * ⚠️ `Use the example` STAYS IN THE ROW, so the row is not empty and the
   * harness still reaches the asking path by itself.
   */
````

<a id="wish-59"></a>
## wish-59: demo/wish/index.html, inline script, line 924

````js
  /**
   * 🔴 THE HEARD SENTENCE IS EDITABLE. Asked 2026-09-21, pointing at the
   * transcription: *"-> textarea"*. There are two models in the chain and the
   * first one is the one nobody could correct, so a word it got wrong cost a
   * second recording and two more model calls.
   * ⚠️ IT ALSO SEPARATES TWO FAILURES THAT LOOK IDENTICAL FROM OUTSIDE: the
   * speech model mis-heard, and the language model mis-read a sentence that was
   * transcribed correctly. Re-asking the same words is the only way to tell
   * those apart, and it needs a box somebody can retype.
   */
````

<a id="wish-60"></a>
## wish-60: demo/wish/index.html, inline script, line 935

````js
  /**
   * 🔴 NO PLACEHOLDER, AND THE REASON IT HAD ONE IS THE REASON IT CAN LOSE IT.
   * Asked 2026-09-21: *"rm placholder text 'hold the button.."*. It read *hold
   * the button and say what you want, or type here and press Enter*, and it was
   * carrying the page's only written account of how to submit, because the `Ask`
   * button had been removed and Enter is invisible.
   * ✅ TWO BUTTONS CARRY IT NOW. `Hold to talk` heads this very block and names
   * its own gesture, and `Interpret` heads the one below it. The label is the
   * documentation, which is the rule this comment always cited, and the
   * documentation is on a control rather than inside the box a reader is about
   * to type over.
   * ⚠️ ENTER STILL ASKS AND SHIFT+ENTER STILL MAKES A NEWLINE, and the check
   * for that stays: what changed is where a reader is told, not what happens.
   */
````

<a id="wish-61"></a>
## wish-61: demo/wish/index.html, inline script, line 417

````js
  /**
   * 🔴 A CONNECTION IS A ROW, AND THE ROW IS A PART OF THE GLUE. Asked
   * 2026-09-22: *"make allowes/disallower + diagram to a separate row"*. It
   * holds the picture of that one link on the left, a reserved column for
   * actions on the right, and the sentence about it underneath, and the
   * stylesheet owns every measurement in that sentence.
   * ⚠️ ONE IS BUILT WITH NOTHING IN IT WHENEVER THERE IS NO ANSWER, so the
   * component is the same height before and after a one link reply lands. That
   * is this page's standing rule, the one every other box on it already obeys,
   * and it is the reason the verdict used to keep a line of room while it was a
   * part of its own.
   */
````

<a id="wish-62"></a>
## wish-62: demo/wish/index.html, inline script, line 439

````js
  /**
   * 🔴 ONE COMPONENT, THREE PARTS, GLUED. Asked 2026-09-21: *"make it a single
   * component, 3 parts, glued. in top is patch list visualizer, below is
   * diagram and dump is below"*. The page used to lay four blocks down its own
   * stack with the project's 40 px rhythm between them, so the picker, the
   * JSON, the verdict and the picture read as four things that happen to be
   * near each other rather than as one answer.
   * 🔴 `createGlue` IS DOCUMENTED AS BEING FOR ONE PAIR AND THIS IS THREE. Its
   * header says so, and so does CLAUDE.md's spacing rule: *"createGlue IS FOR
   * THE ONE PAIR IT WAS WRITTEN FOR, a strip sitting on the transport bar that
   * drives it"*. The ask is explicit, and the function already takes
   * `...blocks` and has since it was written, so nothing about the component
   * changes here.
   * ⚠️ WHAT A THIRD PART COSTS IS AN EDGE. Inside a glue every child gives up
   * its border and its radius, and with two parts each one still has the
   * component's own border along its outer side. The MIDDLE part has neither:
   * the picture is bounded by a 1 px seam above and a 1 px seam below and by
   * nothing else, so a part that paints no ground would let the seam colour
   * through its whole area and the two seams would stop being seams. Every part
   * carries `wish-part` for exactly that, and the rule is on this page's own
   * elements rather than on `.pos-glue`. See the stylesheet.
   * ⚠️ AND THE ALLOWED/REFUSED LINE IS NOT A FOURTH PART. It rides with the
   * JSON inside the bottom one, because every row it prints is a reading of a
   * link in that object.
   */
````

<a id="wish-63"></a>
## wish-63: demo/wish/index.html, inline script, line 464

````js
  /**
   * 🔴 THE VERDICT MOVED OUT FROM UNDER THE JSON AND UNDER THE HEADER, asked
   * for 2026-09-21: *"allowed MK-425C USB MIDI Keyboard to Circuit { transpose
   * +1, channel 1 } move under header"*. It rode with the object because every
   * row it prints is a reading of a link in that object, which is true and put
   * it two parts away from the control that produced it, at the very bottom of
   * the component. A reader pressing `Interpret` now gets the answer in words
   * directly under the button they pressed, and the object stays where evidence
   * belongs.
   * ⚠️ THE ARGUMENT THAT PUT IT AT THE BOTTOM IS NOT WRONG, IT IS OUTWEIGHED.
   * Both facts are true: it is a reading of the object, and it is the answer.
   * What settles it is which one a reader acts on.
   */
````

<a id="wish-64"></a>
## wish-64: demo/wish/index.html, inline script, line 480

````js
  /**
   * 🔴 THE HEAR BLOCK IS GLUED TOO NOW, which is the whole of *"make similar
   * glued header as in interpret"*. The picker and the transcript it fills were
   * two blocks with the page's 40 px rhythm between them, so a reader had to
   * join them by proximity; they are one surface with a 1 px seam now, exactly
   * like the patch block under it.
   * ⚠️ `said` CARRIES `wish-part` FOR THE REASON THE THREE PART GLUE ALREADY
   * RECORDS: a child that paints no ground lets the glue's own line colour
   * through its whole area and the seam stops being a seam.
   */
````

<a id="wish-65"></a>
## wish-65: demo/wish/index.html, inline script, line 495

````js
  /**
   * 🔴 THE VERDICT IS ITS OWN PART OF THE GLUE, NOT A LINE INSIDE THE HEADER.
   * Reported 2026-09-21 against a screenshot: *"you are missing divider on top
   * of allowerd and spacing"*, and then in four words that settle it, *"its a
   * line in glue"*.
   * ✅ AND THAT IS WHY IT IS THE RIGHT SHAPE RATHER THAN A STYLING FIX. Inside
   * the header part the line needed a border and a margin TYPED ON THIS PAGE, a
   * divider drawn by hand where the component beside it already draws one. As a
   * part it gets the glue's own 1 px seam of `--line` and the part's own
   * padding, which is the same edge the picture and the object already have, in
   * the same colour, from the same rule.
   * 🔴 AND IT STAYS AT ONE LINE RATHER THAN GOING AWAY, WHICH REVERSES WHAT I
   * BUILT AN HOUR EARLIER. Asked 2026-09-21 against a screenshot of the filled
   * component: *"make this the minimal height even when no data"*.
   * ⚠️ THE ARGUMENT FOR HIDING IT WAS THE EMPTY-BOX RULE, and the argument
   * against is the stronger one on this page: **nothing may change how much room
   * it takes.** A part that appears when an answer lands moves the picture and
   * the object down under the reader's eye, on a page whose every other box
   * already reserves its room from the first paint for exactly that reason.
   * ⚠️ AND THE EMPTY-BOX RULE IS NOT BEING BROKEN, IT IS BEING OUTRANKED. That
   * rule is about a container drawing EDGES around nothing. The seams here are
   * the glue's and exist for the parts either side of this one whatever it
   * holds, so nothing new is painted; what is reserved is a line's height.
   */
````

<a id="wish-66"></a>
## wish-66: demo/wish/index.html, inline script, line 520

````js
  /**
   * 🔴 THE ROWS SIT BETWEEN THE HEADER AND THE OBJECT, AND THEY ARE THE ONLY
   * PART OF THIS COMPONENT THAT COMES AND GOES. `.pos-glue` is a flex column
   * whose seam is its own `gap` over a line coloured ground, so a part inserted
   * into it is drawn with the same 1 px seam as the parts that were there at
   * build time and nothing has to be told about it.
   */
````

<a id="wish-67"></a>
## wish-67: demo/wish/index.html, inline script, line 527

````js
  /**
   * 🔴 THE OBJECT BLOCK IS ITS OWN SURFACE SINCE 2026-09-22, NOT THE GLUE'S
   * LAST PART. Asked against a screenshot of the two touching: *"disconnect
   * these 2 panels"*, and in the same breath *"clickig on it shoul should show
   * dump in a separate panel"*.
   * ⚠️ **IT WAS RIGHT WHILE THE BLOCK HELD ONE ANSWER AND IS WRONG NOW.**
   * `createGlue`'s own rule is that gluing CLAIMS two things are one object,
   * which was true of a header, a picture and the object behind it. The rows
   * are the answer now, and the object is a reading OF the row a person
   * pressed: one surface per thing, with the page's own rhythm between them,
   * says that where a shared border says the opposite.
   */
````

<a id="wish-68"></a>
## wish-68: demo/wish/index.html, inline script, line 541

````js
  /**
   * 🔴 FIVE THINGS TO SAY, IN A TABLE, AND SOME OF THEM GO WRONG. Asked
   * 2026-09-22: *"add 5 varied examples into a table, some failable instead of
   * 'Use the example' in wish"*. What replaced is one button holding one
   * sentence, which was enough to prove the chain runs and said nothing about
   * the thing this page is actually for: a model proposes, a validator argues,
   * and a person is the only reader who can catch the proposals that are
   * perfectly valid and aimed at the wrong instrument.
   * 🔴 IT SITS BETWEEN THE SENTENCE AND THE ANSWER BECAUSE THAT IS WHAT IT
   * FILLS. A row writes into the same box the microphone fills and then asks,
   * which is one destination rather than two, and is why that box is editable.
   * ⚠️ ITS OWN BLOCK RATHER THAN A THIRD PART OF THE HEAR GLUE. `.pos-tbl`
   * paints its own border, radius and ground; inside a glue every child gives
   * those up, so a table in one would either draw a second edge over the one
   * the glue draws or lose the edge that makes it read as a table. The page's
   * one 40 px rhythm separates it instead, which is the standing rule.
   * ⚠️ TWO COLUMNS, NOT THREE. A row scrolls sideways rather than squeezing,
   * and a row that has to be dragged is a row nobody reads, so the thing to do
   * with a third column is not add it.
   * ⚠️ AND THE `about` COLUMN SAYS WHAT THE SENTENCE IS ABOUT, NEVER WHAT THE
   * ANSWER WILL BE. Under `?selfcheck=1` the reply is canned and known; for a
   * visitor it is whatever the model says today, so a column reading `refused`
   * would be this page predicting an answer it has not got. What each one
   * really returned when it was asked is on the row's hover, where a fact with
   * a date belongs.
   */
````

<a id="wish-69"></a>
## wish-69: demo/wish/index.html, inline script, line 567

````js
  /**
   * 🔴 ONE COLUMN SINCE 2026-09-22, AND IT IS DIM. Reported with a screenshot
   * of the two column table as *"rm about col and gray the ask content"*.
   * ⚠️ `about` IS STILL CARRIED, IT IS JUST NOT A COLUMN. Every row keeps its
   * field and the check drill still reports per example with it, so nothing
   * that was being graded stopped being graded. What went is a 150 px column
   * restating in three words a sentence the reader has already read.
   * ⚠️ AND `hi` WENT WITH IT, WHICH IS THE `gray` HALF. `.pos-tbl-c` is
   * `--dim` and `.pos-tbl-c.hi` is `--fg`, so this table was the brightest
   * block on a page whose subject is the ANSWER. A marked row still lifts to
   * `--hi`, because `.pos-tbl-row.on .pos-tbl-c.hi` was never what made the
   * pressed row visible: its rule is on the row.
   */
````

<a id="wish-70"></a>
## wish-70: demo/wish/index.html, inline script, line 588

````js
  /**
   * 🔴 ABOVE `Hold to talk` SINCE 2026-09-22, ASKED FOR AS *"move above
   * hold-to-talk"*. The table used to sit between the box a sentence goes into
   * and the answer it produces, which put the five worked examples in the
   * middle of the thing they are examples OF.
   * ⚠️ AND THE ORDER NOW READS AS THE PAGE'S ORDER OF OPERATIONS: here are
   * five sentences you can press, here is where you say your own, here is what
   * came back.
   */
````

<a id="wish-71"></a>
## wish-71: demo/wish/index.html, inline script, line 597

````js
  /* ⚠️ THE OBJECT BLOCK IS A SIBLING OF THE ANSWER, not a child of it, so the
     page's own vertical rhythm sits between them. See the note on `answer`. */
````

<a id="wish-72"></a>
## wish-72: demo/wish/index.html, inline script, line 601

````js
  /**
   * Put one example in the box and ask about it, which is what the button this
   * replaced did on its last day.
   * ⚠️ THE ROW LIGHTS UP, so a reader scrolling back to the table after reading
   * an answer can see which sentence produced it. `mark` takes a predicate over
   * the row data rather than an index, which is the component's own rule.
   */
````

<a id="wish-73"></a>
## wish-73: demo/wish/index.html, inline script, line 608

````js
  /**
   * 🔴 A ROW PRESSES THE BUTTON RATHER THAN DOING THE BUTTON'S WORK. Asked
   * 2026-09-22: *"wish: when i click to prepared ask, interpret button should
   * disable and shimmer"*. A row used to call `think` itself, so the two models
   * ran while `Interpret` sat there looking idle and pressable, and the page
   * had no way to say a proposal was already in flight.
   * 🔴 AND THE BUSY STATE IS NOT THIS PAGE'S TO INVENT. `shell.mjs` attaches
   * one listener to every control it builds and, when the handler returns a
   * promise, paints `data-busy`, disables the button, sets `aria-busy` and
   * clears all three in a `finally`. Its own comment says it does this *"rather
   * than every page inventing its own"*. Pressing the button is how a page gets
   * all of it and cannot drift from it.
   * ⚠️ THE BOX IS FILLED FIRST, because `askBox` reads it synchronously the
   * moment the press lands.
   * 🔴 AND A ROW PRESSED WHILE ONE IS IN FLIGHT IS REFUSED BEFORE IT MARKS
   * ANYTHING. The shell's disabled button already swallows the press, so the
   * work could never double up; what it cannot stop is this page lighting a row
   * and writing a sentence into the box for a question nobody is going to ask,
   * which is a row that looks chosen while the answer on screen belongs to
   * another one. The log says what happened, because it is a thing that
   * happened rather than a state.
   * ⚠️ THE ROW LIGHTS UP, so a reader scrolling back to the table after reading
   * an answer can see which sentence produced it. `mark` takes a predicate over
   * the row data rather than an index, which is the component's own rule.
   */
````

<a id="wish-74"></a>
## wish-74: demo/wish/index.html, inline script, line 644

````js
  /**
   * 🔴 THE CONTROL ROW IS EMPTY NOW AND MUST NOT PAINT ITS EDGES. All three of
   * this page's controls live somewhere else: `speak` and `interpret` head the
   * two glued blocks, and the third was `Use the example`, which a table
   * replaced. `shell.mjs` hides `.pos-controls` only when a page DECLARES no
   * controls, which is not this case, so the row would stand there empty and
   * draw the 14 px band the `[hidden]` rule exists to stop. Same rule as the
   * empty readout that rendered as a 2 px line nobody wrote on `/typist/`.
   * ⚠️ ASKED OF THE ROW RATHER THAN TYPED, so the day a control comes back into
   * it the row comes back with it.
   */
````

<a id="wish-75"></a>
## wish-75: demo/wish/index.html, inline script, line 686

````js
    /* Set and DELETED, never set to `''`: every rule here is written
       `[data-busy]`, and an attribute selector matches on presence, so a
       surface that had waited once would glimmer for the rest of the page's
       life. Measured on `video-panel.mjs` and it is a standing rule. */
````

<a id="wish-76"></a>
## wish-76: demo/wish/index.html, inline script, line 657

````js
  /**
   * 🔴 THE BOX AN ANSWER IS GOING TO LAND IN GLIMMERS WHILE ITS MODEL IS
   * WORKING. Asked 2026-09-21: *"make textinputs / areas have same glimmer fade
   * when processing"*, *"show processing animation"*, and then narrowed the
   * same day to *"a shimmer only while thinking"*. The sweep IS the processing
   * animation rather than a second picture beside it, and it is the one every
   * control in this project already wears.
   *
   * 🔴 ONLY WHILE A MODEL IS ACTUALLY WORKING, WHICH IS THE NARROWING AND IT
   * TOOK ONE STATE OFF. The first build painted from the press, so an open
   * microphone with somebody still talking into it read as work in progress.
   * Nothing is being computed then: the page is waiting for a person, and a
   * page that looks busy while nothing is happening is this project's
   * gate-feedback defect in a new costume. The button's own sweep says the
   * CONTROL is at work, which is true from the press, and that is a different
   * claim from *a model is thinking*.
   * 🔴 ONE BOX AT A TIME, AND WHICH ONE IS THE MESSAGE. The listening model
   * fills the transcript, so that box glimmers while `/hear` is out; the patch
   * model fills the JSON, so that box glimmers while `/wish` is out. Painting
   * both would say two models were working when one is, and it is the arrow
   * telling a reader where to look next.
   * ⚠️ AND NEVER THE PICKERS: *"don't animate the model radios"*. See the
   * stylesheet.
   * ⚠️ IT IS PAINT, EXACTLY LIKE THE BUTTON'S. No size, no border width, no
   * shadow spread, because nothing on this page may change how much room it
   * takes while somebody is looking at it.
   * @param {'hear'|'patch'|null} [stage] which model is at work, or neither
   */
````

<a id="wish-77"></a>
## wish-77: demo/wish/index.html, inline script, line 697

````js
  /**
   * @param {object} [o]
   * @param {boolean} [o.live] wire the in-ports to the one function on this
   *   page that can put a byte on a wire. A graded bay takes no `deliver` at
   *   all, so a proposal being checked cannot reach an instrument even if some
   *   later edit called `send` on it by mistake.
   */
````

<a id="wish-78"></a>
## wish-78: demo/wish/index.html, inline script, line 718

````js
  /**
   * 🔴 EVERY PROPOSED LINK IS PUT THROUGH THE SAME VALIDATOR `/bay/` USES, and
   * the refusals are shown beside the line that caused them. This is the whole
   * point of the page: a model's output is an opinion and the validator is the
   * thing with an argument.
   */
````

<a id="wish-79"></a>
## wish-79: demo/wish/index.html, inline script, line 724

````js
  /**
   * 🔴 A TRANSFORM WHOSE SHAPE IS RIGHT AND WHOSE ARGUMENT DID NOT ARRIVE,
   * WHICH IS A QUESTION RATHER THAN A REFUSAL. Asked 2026-09-22: *"perhaps a
   * step model can return: not 'accepted' not accepted but needs more info /
   * input?"*
   * 🔴 THE MEASURED CASE IS `{ op: 'cc', to: 1 }`, from *"connect the first
   * rotary knob of evolution to the first rotary knob of circuit"* on
   * 2026-09-21. `cc` moves the controller numbered `from` onto the controller
   * numbered `to`; the model had been told the channels and nothing about
   * controller numbers, so it gave the destination and left the source out.
   * Nothing about that proposal is wrong. One number is absent, and it is a
   * number a person at this desk knows.
   * 🔴 IT IS A STRUCTURAL TEST AND NEVER A READING OF THE SENTENCE.
   * `checkTransforms` returns English and the temptation is to match on it,
   * which would make this page's vocabulary depend on the wording of somebody
   * else's error message. `OP_HELP` carries the same `args`, `need` and `oneOf`
   * the validator enforces, so the question *did every key that arrived belong
   * to this op, and is a required one absent* is asked of the object.
   * ⚠️ AND A KEY THE OP DOES NOT HAVE IS NOT A GAP. `{ op: 'transpose', to: 1 }`
   * carries its argument under the wrong name, which is a mistake in what was
   * said rather than something anybody can supply, and it stays refused. So do
   * an op that does not exist, an argument of the wrong type and every policy
   * refusal, none of which a person can answer.
   * @returns {{op: string, key: string}|null} the first gap, or null
   */
````

<a id="wish-80"></a>
## wish-80: demo/wish/index.html, inline script, line 772

````js
      /* 🔴 TWO QUESTIONS WERE BEING ANSWERED WITH ONE BOOLEAN UNTIL 2026-09-22.
         `checkTransforms` reports what a transform is missing and `validate`
         reports what this desk will not do, and flattening both to `ok: false`
         printed a question as a verdict. It is the lesson `bay.mjs` already
         paid for one layer down, where one `accepts` list merged *I do not use
         that* with *that damages me* and refused every real link on the desk. */
````

<a id="wish-81"></a>
## wish-81: demo/wish/index.html, inline script, line 782

````js
      /**
       * 🔴 `warn` IS KEPT SINCE 2026-09-22 AND WAS THROWN AWAY BEFORE IT.
       * `bay.mjs` returns one on an allowed link, and on this desk it is almost
       * always `Circuit will drop touch, program, clock`, which is a fact about
       * what really crosses a connection that the page computed on every press
       * and showed nobody. Asked for as *"show all actual details of connection
       * on the diagram not slop"*, and the first actual detail was already in
       * hand and being discarded one line from here.
       */
````

<a id="wish-82"></a>
## wish-82: demo/wish/index.html, inline script, line 791

````js
      /* 🔴 `fix` IS THE SECOND HALF OF A REFUSAL AND IT ARRIVED 2026-09-22.
         Asked as *"can we have cooncrete problem -> soluton texts?"*. Every
         value it needs was already inside `bay.mjs`, so the page carries the
         sentence rather than composing one: two pages print these and one
         vocabulary is the whole reason the validator is a module. */
````

<a id="wish-83"></a>
## wish-83: demo/wish/index.html, inline script, line 800

````js
    /* 🔴 THREE DISJOINT COUNTS, AND `refused` KEEPS ITS OLD MEANING RATHER
       THAN QUIETLY GAINING ONE. A link the desk will not make is refused; a
       link it cannot judge until somebody supplies a number is not. Every
       check on this page that counts refusals counts the same things it
       counted yesterday, because the only rows that moved are the ones nothing
       was refusing. */
````

<a id="wish-84"></a>
## wish-84: demo/wish/index.html, inline script, line 811

````js
  /**
   * 🔴 A PROPOSAL BECOMES A CONNECTION ON A PRESS, NEVER ON AN ANSWER. Asked
   * 2026-09-25: *"wish: when connections (diagram rows) are there, enable
   * them"*, and settled in the same breath as *"use the connecting code in
   * wish"*. Every line of what makes a link real is `bay.mjs`'s and is moved
   * into service here rather than rewritten: `link()` validates and holds it,
   * `send()` applies the transforms and drops what the far end does not consent
   * to, `deliver` is the one way out, and `unlink()` takes it down. `/bay/`'s
   * page went to `archive/` the same day and its module did not.
   * 🔴 TWO BAYS, AND THEY ANSWER TWO DIFFERENT QUESTIONS. `grade()` builds a
   * fresh one per press, because *is this proposal any good* has to be asked of
   * a clean desk or the second answer would be refused for closing a loop with
   * the first. This one holds only links somebody pressed, so its `links()` is
   * the honest reading of what this page is doing to the room right now.
   */
````

<a id="wish-85"></a>
## wish-85: demo/wish/index.html, inline script, line 830

````js
  /**
   * 🔴 A COUNT IS ONLY EVIDENCE ON THE FAR SIDE OF THE BOUNDARY. `bay.mjs`
   * counts what a link QUEUED and what a port was HANDED, and both of those are
   * true of a desk with nothing plugged into it. This counts messages that were
   * turned into bytes and written to a port, which is the only number on this
   * page that means anything left the tab.
   */
````

<a id="wish-86"></a>
## wish-86: demo/wish/index.html, inline script, line 842

````js
  /**
   * 🔴 AN EVENT BACK INTO BYTES, AND THE LIST IS SHORT ON PURPOSE. There is no
   * branch here for SysEx, for a program change or for a clock byte, so none of
   * them CAN BE EXPRESSED, whatever a link or a model says. The `never` list on
   * a port is a declaration and this is arithmetic, which is the second wall
   * `/bay/` put behind the first, and the reason it matters on this desk is in
   * CLAUDE.md: a factory reset restores Novation's content and never the owner's sessions, so nothing undoes a patch overwrite.
   * ⚠️ IT IS THE ONE FUNCTION ON THIS PAGE THAT CAN PUT A BYTE ON A WIRE.
   */
````

<a id="wish-87"></a>
## wish-87: demo/wish/index.html, inline script, line 867

````js
  /**
   * 🔴 ALL NOTES OFF AND ALL SOUND OFF, ON EVERY CHANNEL, WHEN A LINK COMES
   * DOWN. This page's own `FACTS` name the case in one line: the Model 12's REC
   * buttons SEND NO NOTE OFF. A link cut while one of them is held leaves a note
   * sounding on an instrument nobody has a finger on, and the switch that
   * caused it has just stopped being able to carry the release.
   * ⚠️ CC 123 AND CC 120 ARE ORDINARY CHANNEL MODE CONTROL CHANGES, so this
   * expresses nothing `toBytes` could not already build: no SysEx, no program
   * change, no clock byte, and nothing that touches flash.
   * ⚠️ BOTH, AND IN THAT ORDER. All Notes Off releases held notes and lets their
   * release envelopes finish, which is the musical answer; All Sound Off cuts
   * the voices dead, which is the answer when something never sent a release at
   * all. Sending only the first leaves a hung voice on a long release and only
   * the second makes an ordinary release sound broken.
   * ⚠️ AND EVERY CHANNEL, NOT THE ONE THE LINK USED. A stuck note is by
   * definition on a channel nothing is tracking any more, which is exactly why
   * the transform that moved it is no help here.
   */
````

<a id="wish-88"></a>
## wish-88: demo/wish/index.html, inline script, line 898

````js
  /**
   * One real source, listened to. The decode is `midi-decode.mjs`'s and the
   * class is `bay.mjs`'s, so what a message IS is decided in one place for the
   * page, the validator and the picture.
   */
````

<a id="wish-89"></a>
## wish-89: demo/wish/index.html, inline script, line 909

````js
  /**
   * 🔴 NOTHING IS OPENED UNTIL SOMEBODY ASKS FOR A PATCH, AND NOTHING AT ALL IS
   * OPENED UNDER THE HARNESS. `requestMIDIAccess` raises a permission dialog and
   * hands back every instrument on the desk; a suite run is dozens of Chromes,
   * and a check that took this branch would be a hand on somebody's instrument.
   * That is `/shape/`'s rule and it is why the gate is on the CALL rather than
   * on the control: a control that does nothing is the shape this project calls
   * a lie, so under `?selfcheck=1` the same wiring runs against two stand-in
   * ports and the whole path is graded for nothing.
   * ⚠️ THE ONLY CALLER IS `connect`, AND THE ONLY CALLER OF THAT IS `connectAll`
   * OUT OF `show`. So the first thing that reaches this line is an answer coming
   * back from a press, never a visit and never a scroll.
   */
````

<a id="wish-90"></a>
## wish-90: demo/wish/index.html, inline script, line 927

````js
  /**
   * 🔴 THE MATCH IS ON THE PORT'S NAME, AND THAT IS A KNOWN WEAKNESS RATHER
   * THAN AN OVERSIGHT. `PORTS` is DECLARED on this page, measured off this desk,
   * because the page is about the sentence rather than about discovery; the only
   * thing that can join a declared row to a real port is the label, and a label
   * is the thing a replug changes. CoreMIDI really does rename a held port to
   * `Circuit 2`, which `bay.mjs`'s own header records. An instrument that comes
   * back under another name reads here as an instrument that is not plugged in,
   * and the log says which one did not answer.
   */
````

<a id="wish-91"></a>
## wish-91: demo/wish/index.html, inline script, line 968

````js
  /**
   * 🔴 THE STAND-IN IS THE SAME WIRING WITH TWO OBJECTS IN PLACE OF TWO PORTS,
   * AND THAT IS THE WHOLE REASON IT IS WORTH ANYTHING. A check that called
   * `desk.send` directly would grade `bay.mjs`, which has its own test beside
   * it; what this page adds is the decode, the class, the byte encoder and the
   * two maps, and every one of those is on the path below. What it cannot grade
   * is `requestMIDIAccess` itself and whether a real instrument answers to the
   * name this page declares for it.
   */
````

<a id="wish-92"></a>
## wish-92: demo/wish/index.html, inline script, line 991

````js
  /**
   * 🔴 BOTH ENDS HAVE TO BE THERE, OR THE SWITCH IS A LIE. A link held in a bay
   * with nothing plugged into either end is arithmetic nobody asked for: the
   * box would be lit, the log would say connected, and not one message could
   * ever cross. `caps.mjs` already answers this shape for a whole demo row, in
   * words and with the reason, and this is the same answer one control down.
   */
````

<a id="wish-93"></a>
## wish-93: demo/wish/index.html, inline script, line 1024

````js
  /**
   * 🔴 `here:` IS THIS PROJECT'S OWN VOCABULARY AND IT WAS ON THE PAGE. Asked
   * 2026-09-21: *"here:mk-425c-usb-midi-keyboard:out -> here:circuit:in { ... }
   * what is here?"* It is the SITE, the first of the three segments in a port
   * id, and it means this machine as opposed to one reached over the relay. The
   * question is the answer: nobody outside this repository can know that, and
   * every port on this desk is local, so the segment that exists to tell two
   * sites apart was printing the same word on every row.
   * ✅ SO A ROW SHOWS THE NAME, AND A SITE APPEARS ONLY WHEN IT IS NOT THIS ONE.
   * The id is still the model's key and it is still in the JSON above, where a
   * reader wants exactly what came back.
   *
   * 🔴 AND `printLink` IS NOT THE PLACE TO FIX IT, WHICH IS WORTH WRITING DOWN
   * BECAUSE THE OBVIOUS READING SAYS OTHERWISE. That function's output is
   * parsed straight back by `parseLink`, and `bay-test.mjs` asserts the round
   * trip: a `printLink` that printed labels would make the text form a second
   * source of truth that says something the graph cannot, which is the one
   * thing the module's own header forbids. So the human form is a separate
   * function, and it reuses `printLink` for the transform half rather than
   * writing a second formatter that could disagree about a `+`.
   */
````

<a id="wish-94"></a>
## wish-94: demo/wish/index.html, inline script, line 1068

````js
  /**
   * 🔴 THE DESK, DRAWN, AND IT IS THE FIRST DIAGRAM IN THIS PROJECT THAT IS NOT
   * `How it works`. Asked 2026-09-21: *"make it json and autodraw diagram below
   * (reserve space for it)"*. Every other picture here is REFERENCE: it passes
   * `{ how: true, atEnd: true }`, takes the standing heading and sits last on
   * the page because it is read once. **This one is a RESULT.** It changes on
   * every press, it is the answer rather than an explanation, and it belongs
   * directly under the JSON it draws, so it passes neither flag and takes no
   * title at all. `createDiagram` already allows that: with no `how` and no
   * `title` the heading element is hidden and nothing is written above the
   * picture.
   * 🔴 THE WHOLE DESK IS DRAWN WHATEVER WAS PROPOSED, and that is the point. A
   * model here produces well formed patches aimed at the WRONG INSTRUMENT, which
   * no validator can catch because there is nothing invalid about them. An arrow
   * arriving at the wrong box is visible in an instant, and only if the right
   * box is in the picture beside it.
   */
````

<a id="wish-95"></a>
## wish-95: demo/wish/index.html, inline script, line 1085

````js
  /**
   * 🔴 `also` IS THE WORDS A PERSON ACTUALLY SAYS, AND THE PAGE WAS MISSING
   * THEM. Reported 2026-09-21 with a screenshot: *"connect evolution to
   * circuit"* answered *the model proposed nothing*. **The model was right and
   * the desk's vocabulary was wrong.** CoreMIDI calls that port `MK-425C USB
   * MIDI Keyboard`; the instrument is an **Evolution MK-425C**, the maker's
   * name is on the box and in every sentence anybody says about it, and it was
   * in none of the strings the model was given. The last line of the prompt
   * fired exactly as written.
   * 🔴 THEY ARE DATA AND ARE NEVER DERIVED FROM THE LABEL. A pattern turning
   * `MK-425C` into `Evolution` is an invention that happens to be right in this
   * room and would be wrong on the next device. A maker is a fact somebody
   * knows, so it is typed here, and an instrument with nothing to add gets no
   * line in the prompt at all.
   * ⚠️ AND AN ALIAS NEVER BECOMES A PORT ID. `from` and `to` in the schema stay
   * an `enum` of the real ids, which is what stopped a Moog and a Prophet
   * neither of which is on this desk coming back as inventions. Aliases go in
   * the prose the model READS, never in the list it must choose from.
   * ⚠️ `the desk` IS DELIBERATELY NOT ON THE MIXER. This page's own prose calls
   * the whole rig the desk, so an alias would resolve *connect the keyboard to
   * the desk* to one instrument on it.
   */
````

<a id="wish-96"></a>
## wish-96: demo/wish/index.html, inline script, line 1107

````js
  /**
   * 🔴 A BOX'S NOTE IS BUILT FROM THE MAPPING, NOT TYPED. Asked 2026-09-21:
   * *"are more detail to box desc based on the mapping data"*, and in the same
   * breath, against the note that used to sit here, *"rm this slop text"*.
   * 🔴 THE SENTENCE THAT WENT SAID: *"The Evolution keyboard. It sends on
   * channel 2 and its keys are one semitone flat, which is why a transpose turns
   * up in almost every proposal."* Two facts and a paragraph of colour, and the
   * colour is a claim about what the model TENDS to do, which nothing on the
   * page measures and which would read as true whatever it did.
   * ✅ WHAT REPLACES IT IS WHAT THE MODEL IS ACTUALLY TOLD: this box's ports,
   * their direction, and what each one carries, read off `PORTS`, `ACCEPTS`,
   * `EMITS` and `NEVER` at build time. A reader hovering a box now sees the
   * same table the proposal is validated against, so a refusal has a visible
   * cause.
   * ⚠️ AND ONE TYPED LINE STAYS PER BOX, because it carries what no port list
   * can: which channel a device answers on. It is the same string handed to the
   * model in `FACTS`, split per box rather than written twice, so the page and
   * the prompt cannot disagree.
   */
````

<a id="wish-97"></a>
## wish-97: demo/wish/index.html, inline script, line 1126

````js
  /**
   * ⚠️ TERSE BECAUSE THE BOX IS A BOX. `createDiagram` reports what it had to
   * cut, and the first version of these overran the Circuit's note by 40 px and
   * took `the picture drew every name and every arrow whole` red. That is the
   * component telling the AUTHOR, which is the one person who can do anything
   * about it, and it is the same answer `table.mjs` gives about a heading too
   * long for its column.
   */
````

<a id="wish-98"></a>
## wish-98: demo/wish/index.html, inline script, line 1148

````js
  /**
   * What one box's ports carry, in words, straight off the tables the validator
   * reads. `never` is named separately from what a port does not accept,
   * because `bay.mjs` keeps those two lists apart on purpose: a class a
   * destination does not handle is dropped and reported, and a class on `never`
   * REFUSES the link. The difference is *I do not use that* against *that
   * damages me*, and only the second is worth an error.
   */
````

<a id="wish-99"></a>
## wish-99: demo/wish/index.html, inline script, line 1161

````js
      /**
       * 🔴 `In takes nothing, never sysex.` WAS REPORTED AS UNCLEAR LANGUAGE ON
       * 2026-09-22, AND IT WAS TWO DIFFERENT UNCLEAR THINGS IN ONE LINE.
       * *takes nothing* does not say whether the port accepts no message class
       * or merely has nothing patched into it, and those are a fact about the
       * DEVICE and a fact about the ROOM. It is the first one: the MK-425C's
       * input is an `ACCEPTS` entry of `[]`.
       * ⚠️ AND *never sysex* READ AS A CONTRADICTION DIRECTLY AFTER IT. A port
       * that takes nothing appears to be being told it takes nothing twice,
       * which buries the one thing that line is for: the two lists are not the
       * same list. A class off `accepts` is DROPPED at the boundary and
       * reported; a class on `never` REFUSES THE LINK. So the refusal gets its
       * own sentence and the word `refused`, which is the word the picture
       * already puts on a refused arrow.
       */
````

<a id="wish-100"></a>
## wish-100: demo/wish/index.html, inline script, line 1185

````js
  /**
   * 🔴 WHICH PORT OF THIS INSTRUMENT THE PROPOSAL ACTUALLY USES, WHICH IS THE
   * DETAIL A BOX CANNOT OTHERWISE SHOW. Asked 2026-09-22 as *"show all actual
   * details of connection on the diagram not slop"*. A box is an INSTRUMENT,
   * the Model 12 has four ports, and picking the wrong one of them is the
   * single most expensive mistake this page has recorded: `Model 12 MIDI IN` is
   * allowed, is the DIN socket, and stayed silent through 525 messages while
   * the buttons came out of `Model 12 DAW Control IN`. A picture that drew both
   * of those as `Model 12` could never show the difference.
   * ⚠️ IT REPLACES THE INSTRUMENT'S KIND, which is what the sub used to say:
   * `MIDI keyboard`, `Novation synth`, `TASCAM mixer`. Those are facts about
   * the DEVICE and the request is about the CONNECTION, and a box that has
   * nothing in this proposal keeps its kind because there is no port to name.
   * ⚠️ THE INSTRUMENT'S OWN NAME COMES OFF THE FRONT, or the sub echoes the
   * label printed directly above it, which is the fault `captionTexts` records
   * about a line under a picture repeating the box it points at. What is left
   * of `Circuit` is nothing, so that one falls back to the direction, which is
   * the word the port id itself uses.
   */
````

<a id="wish-101"></a>
## wish-101: demo/wish/index.html, inline script, line 1220

````js
  /**
   * The ports as the model is told about them: the real id, the label CoreMIDI
   * gives it, and whatever else this room calls the instrument it belongs to.
   * ⚠️ IT IS BUILT AT CALL TIME rather than folded into `PORTS`, because `PORTS`
   * is also what `freshBay()` and the picture read and neither has any business
   * with a nickname.
   */
````

<a id="wish-102"></a>
## wish-102: demo/wish/index.html, inline script, line 1231

````js
  /**
   * 🔴 THE CAPTION IS GONE, ASKED FOR 2026-09-22 WITH A SCREENSHOT OF IT AND THE
   * word *"rm"*. It read *"Every arrow is a link the model asked for, and a
   * refused one is marked rather than left out."*, and it is the second time in
   * two days that sentence has been reported: yesterday it was drawn over an
   * empty picture and the fix was to stop drawing the picture at all.
   * ⚠️ IT WAS EXPLAINING A DRAWING RATHER THAN SAYING ANYTHING ABOUT THIS RUN.
   * A refused arrow already carries the word `refused` on it, so the caption
   * was a second way of saying what the picture says, and the one fact it
   * added, that a refusal is drawn rather than dropped, is visible the moment
   * a refusal happens.
   * ⚠️ THE LINE UNDER THE PICTURE STAYS AND IS NOT EMPTY FURNITURE. That slot
   * is a box's own sentence on hover, which `captionTexts` still reserves
   * height for, so nothing moves when a box is hovered and nothing is drawn
   * when one is not.
   */
````

<a id="wish-103"></a>
## wish-103: demo/wish/index.html, inline script, line 1248

````js
  /**
   * One arrow per pair of instruments the proposal joins.
   * 🔴 A REFUSED LINK IS PART OF THE PICTURE. The run this page was reported on
   * was `1 link, 1 refused`, so a diagram drawing only what passed would have
   * been EMPTY while the readout beside it said an answer had arrived. Its label
   * is `refused`, which is what travels: nothing.
   * ⚠️ TWO PROPOSALS BETWEEN ONE PAIR ARE ONE ARROW, or two would be drawn down
   * one gap and read as one, and then the picture would say fewer links than the
   * readout does.
   * ⚠️ AND NOTHING REACHES THAT BRANCH SINCE 2026-09-22, BECAUSE EVERY CALLER
   * NOW HANDS IT ONE LINK: a connection is a row and a row draws its own. It is
   * kept rather than cut because it is what makes this function safe to call
   * with any list, and because the day a row holds more than one link it is the
   * behaviour that was wanted. The examples table asserts the outcome from the
   * other side: the split reads as two rows and two arrows.
   * ⚠️ AND A LINK THAT BEGINS AND ENDS AT ONE INSTRUMENT HAS NO ARROW TO DRAW.
   * It is counted and logged rather than dropped in silence.
   */
````

<a id="wish-104"></a>
## wish-104: demo/wish/index.html, inline script, line 1279

````js
      /* 🔴 WHICH PORTS, WHICH IS THE DETAIL THE PICTURE CANNOT DRAW. A box is
         an INSTRUMENT and the Model 12 has four ports, two of which look like
         the right one and only one of which carries its buttons. A `Set`,
         because a split proposes two links down the same pair of ports and
         naming it twice would read as two connections. */
````

<a id="wish-105"></a>
## wish-105: demo/wish/index.html, inline script, line 1288

````js
        /* ⚠️ EVERY DISTINCT TRANSFORM, NOT THE FIRST ONE. This kept `g.t ||
           TRANSFORM_TEXT(...)`, so a pair carrying two links with two different
           transforms showed one of them and said nothing about the other. A
           split is exactly that shape. */
````

<a id="wish-106"></a>
## wish-106: demo/wish/index.html, inline script, line 1298

````js
    /**
     * 🔴 ONLY A REFUSED ARROW IS LABELLED, AND THE BUDGET IS WHY RATHER THAN
     * TASTE. MEASURED: the gap between two columns gives a link label **52 px**
     * here, which is about seven characters at the drawer's link size, and
     * `createDiagram` reported `transpose+1,…` as a cut the first time this was
     * built. `refused` fits. A list of message classes or a transform does not,
     * so what travels goes in the note, which is read on hover in the line under
     * the picture where there is room for a sentence.
     * ⚠️ AND THE ASYMMETRY IS THE MESSAGE: an arrow means the model asked for
     * this link, a marked arrow means the validator stopped it.
     */
````

<a id="wish-107"></a>
## wish-107: demo/wish/index.html, inline script, line 1309

````js
    /**
     * 🔴 AN ALLOWED ARROW NAMES WHAT CROSSES IT SINCE 2026-09-22, AND A REFUSED
     * ONE STILL SAYS `refused`. Reported with a screenshot of `MK-425C ->
     * Circuit` joined by a bare line: *"show all actual details of connection
     * on the diagram not slop"*. The picture said a link existed and nothing
     * else, and everything the page knew about it was one hover away.
     * ⚠️ THE ASYMMETRY SURVIVES AND IS THE REASON THE TWO STRINGS ARE NOT THE
     * SAME KIND OF THING. An arrow means the model asked for this link; a
     * marked one means the validator stopped it. `refused` is a verdict and a
     * class list is cargo, so the two can never be read as each other.
     * ⚠️ AND THE CLASS LIST IS THE ONLY DETAIL THAT FITS. The budget above is
     * MEASURED rather than judged: `GAP_X_MAX` is 58 px and `EDGE_OUT` is 2, so
     * a link label gets **52 px** over two lines at the drawer's 9.5 px, and
     * `createDiagram` reported `transpose+1,...` as a cut the first time this
     * was tried. What a destination consents to is at most three of the six
     * classes a MIDI port emits, so the longest this can ever be is `note, cc,
     * bend`, which wraps. Everything longer is in the sentence below.
     */
````

<a id="wish-108"></a>
## wish-108: demo/wish/index.html, inline script, line 1331

````js
      /**
       * 🔴 FOUR STATES, NOT TWO, AND THE PICTURE CARRIES THE VERDICT AS WELL
       * AS THE WORDS. Asked 2026-09-22: *"diagam could show grayed out boxes
       * with "?" in the right place and/or grayed connector/label. depences if
       * model gets the hw rihht just connetion details missiong or really hw is
       * misising"*.
       *
       *   allowed      solid boxes, the ordinary grey line, named by what crosses it
       *   incomplete   solid boxes, the ordinary grey line, labelled `?`
       *   refused      solid boxes, a red line, labelled `refused`
       *   not here     grey boxes labelled `??`, NOT BUILT
       *
       * 🔴 THE BOXES STAY SOLID ON THE MIDDLE TWO, WHICH IS THE WHOLE POINT
       * OF THE DISTINCTION THE ASK DRAWS. Both instruments are real and on this
       * desk; what is missing is a number, or the desk's consent. Greying a box
       * would say the hardware is not there.
       * 🔴 AND THE FOURTH IS NOT REACHABLE FROM HERE. `from` and `to` are an
       * `enum` of the real port ids, which is what stopped a Moog and a Prophet
       * coming back as inventions, so a model cannot name an instrument this
       * desk does not have: it returns no links and there is nothing to draw.
       * Drawing it needs a second free text field on the reply for the names
       * the model could not map, which is a change to the schema and to the
       * Worker rather than to this page.
       * ⚠️ `?` RATHER THAN A SENTENCE, because a link label gets 52 px over two
       * lines here and `createDiagram` reports anything longer as a cut. What
       * is missing is in the note, read on hover in the line under the picture.
       */
````

<a id="wish-109"></a>
## wish-109: demo/wish/index.html, inline script, line 1362

````js
        /* 🔴 RED, ASKED FOR 2026-09-22 AS *"when refused, paint recused
           conector/label red"*. `bad: true` is a `diagram.mjs` flag added the
           same day and it paints the line, the label and the arrowhead.
           ⚠️ IT IS A SECOND CHANNEL AND THE FIRST ONE DOES NOT MOVE. The label
           still reads `refused` in words, so the picture still says what
           happened in greyscale, in a screenshot, and to a reader who cannot
           separate these two hues. Colour is never the only carrier here. */
````

<a id="wish-110"></a>
## wish-110: demo/wish/index.html, inline script, line 1371

````js
        /* 🔴 THE WHOLE CONNECTION, IN THE LINE UNDER THE PICTURE, WHICH IS THE
           ONE CHANNEL HERE WITH ROOM FOR A SENTENCE. Three facts and three
           sentences rather than one string with commas holding it together:
           which ports, what crosses them and after what, and what the far end
           will throw away. */
````

<a id="wish-111"></a>
## wish-111: demo/wish/index.html, inline script, line 979

````js
  /**
   * 🔴 ONE PICTURE PER CONNECTION SINCE 2026-09-22, AND IT WAS ONE PICTURE
   * UNDER ALL OF THEM UNTIL THEN. A reply proposing two connections drew two
   * arrows into one figure under a stack of two sentences, and which arrow
   * belonged to which sentence was left to the reader. This draws the links of
   * ONE row into that row's own host, which is why it takes a host.
   * ⚠️ IT GOES THROUGH `arrowsFor`, WHICH IS UNCHANGED AND STILL TAKES A LIST.
   * A row is a list of one, and everything that function knows about a loop,
   * about what an arrow carries and about what the far end drops is knowledge
   * this page has in one place rather than two.
   */
````

<a id="wish-112"></a>
## wish-112: demo/wish/index.html, inline script, line 996

````js
    /**
     * 🔴 ONLY THE INSTRUMENTS THE PROPOSAL TOUCHES, NOT THE WHOLE DESK.
     * Reported 2026-09-21 with a crop: *"why 2 boxes when only 2 are
     * connected"*, pointing at a Model 12 drawn with nothing attached to it
     * beside a keyboard reaching a Circuit.
     * ⚠️ IT WAS DELIBERATE AND IT WAS WRONG. The whole desk was drawn so that a
     * proposal of nothing had something to show rather than a blank box, and
     * that reason died when the picture was made to wait for a mapping: there
     * is no empty state left for it to serve. What survived was three boxes
     * where two were asked for, and an unattached box is not neutral, it is the
     * picture saying *this instrument was considered and left out*, which is a
     * claim the model never made.
     * ⚠️ BOTH ENDS OF A REFUSED LINK STAY, because a refusal is part of the
     * answer: the run that prompted all of this was one link, refused, and a
     * picture showing only what passed would have been empty while the readout
     * said there was an answer.
     */
````

<a id="wish-113"></a>
## wish-113: demo/wish/index.html, inline script, line 1014

````js
    /**
     * ⚠️ THE NOTE IS ATTACHED HERE RATHER THAN HELD ON THE CONSTANT, because it
     * is DERIVED: `portNote()` reads the same `PORTS`, `ACCEPTS`, `EMITS` and
     * `NEVER` tables the validator reads, so the words under a box and the rule
     * that refuses a link cannot drift apart. A typed note could, and did.
     */
````

<a id="wish-114"></a>
## wish-114: demo/wish/index.html, inline script, line 1022

````js
    /**
     * 🔴 NO LINKS, NO PICTURE AT ALL, AND THIS WAS A REAL DEFECT. Reported
     * 2026-09-21: *"Every arrow is a link the model asked for, and a refused
     * one is marked rather than left out. - on empty diagram"*. Filtering the
     * nodes down to the ones a proposal touches left `createDiagram` being
     * called unconditionally, so a proposal of nothing rendered **a caption
     * with nothing above it**: furniture explaining a picture that is not
     * there.
     * ⚠️ THERE ARE TWO ROUTES TO AN EMPTY PICTURE AND ONLY ONE WAS HANDLED.
     * `clearAnswer()` empties the host, which is why this survived every run:
     * the only way to see it is the *model proposed nothing* path.
     * ⚠️ AND THE REPORT IS NOT THE CAPTION. *The model proposed nothing* lives
     * in the patch box and stays; this caption goes. One is an answer, the
     * other explains a drawing.
     * ⚠️ **THE CAPTION IS GONE ALTOGETHER SINCE 2026-09-22** and this guard is
     * NOT spent by that. An empty `createDiagram` still draws a figure with a
     * reserved caption line and a room round it, so the thing this line stops
     * is furniture with nothing above it either way.
     * ⚠️ THE ROOM STAYS EITHER WAY. See `.wish-dg`.
     */
````

<a id="wish-115"></a>
## wish-115: demo/wish/index.html, inline script, line 1043

````js
    /* 🔴 THE ROW'S OWN SENTENCE IS THIS FIGURE'S CAPTION, which is the slot
       `createDiagram` already reserves and already swaps on hover. See
       `captionFor`. */
````

<a id="wish-116"></a>
## wish-116: demo/wish/index.html, inline script, line 1047

````js
    /**
     * 🔴 `align: 'left'`, ADDED TO `diagram.mjs` 2026-09-22 FOR THIS PAGE.
     * A figure here is not the block any more: it shares its row with a
     * verdict under it and a reserved action column to its right. `placeRow`
     * centres by default, which is right on every page where the picture IS
     * the block, and here it put each figure about 70 px in from each side of
     * whatever space was left. **Two rows with different box counts then had
     * their first box at two different x**, so a column of pictures lined up
     * with nothing.
     * ⚠️ THE ROW TAKING THE WIDTH AWAY WAS NOT ENOUGH, which is worth writing
     * down because it looked like it should have been: reserving the column
     * moves where the figure's space ENDS and says nothing about where the
     * drawing sits inside it.
     */
````

<a id="wish-117"></a>
## wish-117: demo/wish/index.html, inline script, line 1065

````js
  /**
   * 🔴 TWO DIFFERENT EMPTY STATES, AND ONLY ONE OF THEM IS A SENTENCE. Nothing
   * has been asked yet, and a model was asked and proposed nothing.
   * ⚠️ THE FIRST ONE LOST ITS WORDS ON 2026-09-21: *"rm no patch yet"*. It said
   * `# no patch yet`, which tells a reader that an empty box is empty. The box
   * shows nothing and paints no edge now, and `.wish-patch` holds the floor so
   * the log below cannot be shoved down the page when an answer lands.
   * 🔴 THE SECOND ONE SURVIVES AND IS NOT FURNITURE. *The model proposed
   * nothing* is a REPORT, and the right answer to an instruction that names
   * nothing on this desk, so it is shown in a box that paints its edges like
   * any other answer. There is an assert on it.
   */
````

<a id="wish-118"></a>
## wish-118: demo/wish/index.html, inline script, line 1077

````js
  /* 🔴 NOTHING, SINCE 2026-09-22: *"rm # the model proposed nothing, which is
     the right answer to an instruction / # that names nothing on this desk"*.
     ⚠️ **IT WAS A REPORT RATHER THAN FURNITURE AND IT IS STILL SAID**, in the
     log, where a sentence about one run belongs. What it could not go on doing
     is sitting inside a box whose whole subject is the model's own object: a
     comment in a JSON box is a thing a reader tries to parse. */
````

<a id="wish-119"></a>
## wish-119: demo/wish/index.html, inline script, line 1085

````js
  /**
   * 🔴 THE PATCH BOX IS JSON, ONE OBJECT PER LINE. Asked 2026-09-21: *"can it
   * not be full json(l) message?"* The compact patch language was written for
   * `/bay/`, where it labels a link somebody is about to make and the shortest
   * true sentence wins. Here it is the MODEL'S OUTPUT being shown for
   * inspection, and the compact form was dropping the evidence: the run this
   * was reported on read `{ transpose, channel 1 }` with no sign of the `to: 1`
   * that was the whole problem, so the refusal underneath named a key the line
   * above it did not show.
   */
````

<a id="wish-120"></a>
## wish-120: demo/wish/index.html, inline script, line 1095

````js
  /**
   * The two lines a row says about its own connection.
   *
   * 🔴 THE VERDICT WORD IS GONE, ASKED FOR 2026-09-22: *"rm refused text, its
   * already on connetor"*. Two channels for one fact, which is the third time
   * in two days: the wave card said *not drawn* beside an empty picture, the
   * slider's hand had a filled button and a hollowed handle, and the arrow and
   * the sentence both said refused.
   * 🔴 **AND ALL THREE WENT, NOT ONLY `refused`.** The arrow carries every one
   * of them already: an allowed one is labelled with what crosses it, an
   * incomplete one with `?`, and a refused one reads `refused` in red. Dropping
   * one word of three would have left the state a reader most needs to spot as
   * the only one with no word in the picture, which runs the asymmetry the
   * wrong way round. What the sentence keeps is the half only it can carry,
   * which is WHY.
   * ⚠️ AND THE STATE IS STILL READABLE OFF THE ROW, in `data-verdict`, so a
   * check grades what a reader is shown and the reserved action column has
   * something to key on the day it grows a button.
   *
   * 🔴 TWO LINES, A PROBLEM AND A SOLUTION. Asked in the next breath: *"can we
   * have cooncrete problem -> soluton texts?"*. `bay.mjs` answers a refusal
   * with both halves and the values in them are its own, so nothing here
   * composes a sentence out of a validator's insides.
   * ⚠️ AN ALLOWED LINK HAS NO PROBLEM, so its first line is the link itself and
   * its second is what the far end will throw away. That second line is often
   * the only surprising thing about an allowed connection on this desk: a MIDI
   * source emits six classes and the Circuit consents to three.
   */
````

<a id="wish-121"></a>
## wish-121: demo/wish/index.html, inline script, line 1123

````js
  /**
   * 🔴 EVERY ROW NAMES ITS CONNECTION FIRST, WHATEVER THE VERDICT. This put
   * `r.why` at the head of a refused row, so a refusal printed its reason and
   * never said WHICH link it was about: on a page that now draws one row per
   * connection, two refusals read as the same sentence twice.
   * ⚠️ IT WAS RIGHT WHILE THERE WAS ONE BLOCK FOR ALL OF THEM, because the
   * object underneath named them. One row per connection changed what a row has
   * to carry on its own.
   * ✅ SO IT IS THREE LINES AND THEY ARE THREE DIFFERENT KINDS OF THING: WHICH
   * connection, then what is wrong with it, then what would fix it. An allowed
   * link has nothing wrong with it, so it prints what the far end will throw
   * away instead, which is the only thing left that a reader cannot see.
   */
````

<a id="wish-122"></a>
## wish-122: demo/wish/index.html, inline script, line 1145

````js
  /**
   * 🔴 THE SAME TWO LINES AS ONE STRING, FOR THE LINE UNDER THE PICTURE.
   * `createDiagram` reserves that line, writes the caption into it when nothing
   * is hovered and a box's or an arrow's own sentence while one is, so the
   * caption slot is ALREADY the one element with two contents. This page used
   * to run a second element beneath it and hide it with `visibility` while the
   * caption was up, which is two elements taking turns in one place. Asked for
   * 2026-09-22: *"do not put refused etc below diagram text, it is a default
   * text when no interacton"*.
   * ⚠️ A NEWLINE RATHER THAN A JOIN, and `.wish-dg .pos-dg-cap` is what makes
   * it break. A middot or a dash between a problem and its solution is the tic
   * CLAUDE.md names, and it would let the pair read as one run-on sentence.
   */
````

<a id="wish-123"></a>
## wish-123: demo/wish/index.html, inline script, line 1160

````js
  /**
   * 🔴 THE ROWS ON SCREEN, IN ORDER, AND THE ONE THAT IS CHOSEN. `chosen` is an
   * INDEX into this list rather than a flag on a row, because the object block
   * below has to be able to ask *which connection am I showing* and there is
   * exactly one answer to that question.
   */
````

<a id="wish-124"></a>
## wish-124: demo/wish/index.html, inline script, line 1170

````js
  /* ⚠️ THE ROWS GO AT THE END OF THE GLUE NOW, because the object block left it
     on 2026-09-22 and `insertBefore(row, dump)` was inserting before a node that
     is no longer a child. It threw on the first answer and took the whole page
     with it, which is why `__demo.ready` failed rather than one assert. */
````

<a id="wish-125"></a>
## wish-125: demo/wish/index.html, inline script, line 1181

````js
  /**
   * 🔴 THE OBJECT BLOCK SHOWS ONE CONNECTION, THE CHOSEN ONE. Asked
   * 2026-09-22: *"separate json dump to sepatate block, reserve its hight. it
   * will show just one connection json at time"*.
   * 🔴 AND IT IS STILL AN ARRAY, WHICH IS THE ASK THIS ONE HAS TO NOT UNDO.
   * *"display as json array"* and then *"(event when one)"* were asked the same
   * day about a reply that printed two bare objects one after the other. A box
   * that is an array for two links and an object for one is a shape every
   * reader and every parser has to branch on; now that it is always one link,
   * always an array is the only reading that keeps that true.
   * ⚠️ INDENTED, AND WRAPPED RATHER THAN CLIPPED. Asked as *"indent json"*, and
   * the clipping was the more serious half: a screenshot showed a line cut at
   * `"op":"trans`, one character before the `"to": 1` that the whole box exists
   * to reveal.
   */
````

<a id="wish-126"></a>
## wish-126: demo/wish/index.html, inline script, line 1209

````js
  /**
   * 🔴 THE LIST IS ONE TAB STOP AND THE ARROWS MOVE INSIDE IT, WHICH IS
   * `table.mjs`'S OWN PATTERN AND IS ON THIS PAGE ALREADY. Every row being a
   * tab stop is what made tabbing past `/making/`'s 63 rows take sixty-three
   * presses. Enter and the space bar choose; the arrows move the focus and
   * choose nothing, because a table on this same page behaves that way and two
   * keyboard conventions in one component is worse than either of them.
   */
````

<a id="wish-127"></a>
## wish-127: demo/wish/index.html, inline script, line 1226

````js
      /* 🔴 ONLY THE ROW'S OWN KEYS, AND THIS LINE IS WHAT THE ACTION COLUMN
         COST. The remove button sits INSIDE this row, so without it a space on
         that button bubbles up here, is `preventDefault`ed as the row's choose
         key, and the button never fires. A space on a `<button>` is the
         browser's job rather than a page's, and a container that eats it takes
         that back.
         ⚠️ IT STILL MATTERS WITH ONE CONTROL IN THE COLUMN RATHER THAN TWO.
         This guard was written for the checkbox that left on 2026-09-28 and it
         is load bearing for the remove button on its own, which is why it did
         not go with it. */
````

<a id="wish-128"></a>
## wish-128: demo/wish/index.html, inline script, line 1250

````js
  /**
   * 🔴 THE RIGHT OF A ROW, AND SINCE 2026-09-28 THERE IS ONE CONTROL IN IT.
   * Asked: *"rm on button on wish, just keep x button"*, with a photograph of
   * a row's right hand column holding an `on` checkbox above an `×`.
   * 🔴 SO A ROW THAT EXISTS IS CONNECTED, WHICH IS WHAT TAKING THE SWITCH AWAY
   * MEANS RATHER THAN A SEPARATE DECISION. The switch was the page's only path
   * to making a connection on the desk, so a page that kept the list and lost
   * the switch could only ever describe a patch it refused to make. `show`
   * connects every allowed row as it lays it down, and `×` takes the link down
   * and the row off in one gesture.
   * ⚠️ EVERY ROW GETS THE SAME ONE CONTROL, allowed, refused or incomplete. A
   * refused link is the desk saying no and an incomplete one is waiting for a
   * number a person can supply, so neither is connected by existing, and taking
   * a wrong answer off the page is the one thing a reader can do about either.
   * 🔴 AND IT IS NOT IN `.pos-controls`, WHICH IS A DECISION AND NOT AN
   * ACCIDENT. `demo/verify.mjs` presses `.pos-controls button, .tbar-x` in
   * document order, so a remove button in that row would be pressed on every
   * run and would empty the page in the middle of its own checks, which is
   * `/shape/`'s standing rule. The row's own column is where it goes, and the
   * checks below press it by reference.
   */
````

<a id="wish-129"></a>
## wish-129: demo/wish/index.html, inline script, line 1272

````js
    /* ⚠️ `×` U+00D7 HAS NO EMOJI FORM, which is the whole of this project's
       glyph rule: `✖` and most of the geometric shapes default to a colour
       picture at a size of their own on some machines and not on others. */
````

<a id="wish-130"></a>
## wish-130: demo/wish/index.html, inline script, line 1279

````js
      /* The row under it is `role="button"` and a press inside it means choose
         me, so a press that is about to delete the row has to stop here: it
         would otherwise show the object of a row that is gone by the next
         frame. */
````

<a id="wish-131"></a>
## wish-131: demo/wish/index.html, inline script, line 1290

````js
  /**
   * 🔴 THE ROWS ARE THE CONNECTIONS, SO LAYING THEM DOWN IS WHAT MAKES THEM.
   * Nothing here is reached by a page load: `show` runs only out of `think`,
   * which runs only out of a press on `Interpret`, on a prepared row or on a
   * release of `Hold to talk`. A visit lays one empty row and connects nothing,
   * and `requestMIDIAccess` sits behind `openDesk` under the first `connect`.
   * ⚠️ AND A ROW THE DESK COULD NOT MAKE CARRIES NO `data-connected`. The log
   * already says which port did not answer; this is the same fact where a check
   * can read it, and it is written per row rather than per answer because one
   * reply can name an instrument that is plugged in and one that is not.
   * ⚠️ ONE CHAIN RATHER THAN ONE PROMISE PER ROW, so a second answer cannot
   * start connecting while the first is still opening the desk, and so the
   * checks have one thing to await.
   */
````

<a id="wish-132"></a>
## wish-132: demo/wish/index.html, inline script, line 1317

````js
  /**
   * 🔴 A ROW LEAVES WITH ITS CONNECTION, NEVER WITHOUT IT. A live link whose row
   * has gone is a link nobody can see and nobody can take down, so the page
   * would be routing an instrument on the strength of a sentence that is no
   * longer on screen. Since the switch went on 2026-09-28 this is the whole of
   * what `×` means, and it is one gesture rather than two.
   * ⚠️ AND THE COMPONENT KEEPS ITS HEIGHT. Removing the last row lays an empty
   * one back, which is this page's standing reservation: nothing may change how
   * much room it takes while somebody is looking at it.
   */
````

<a id="wish-133"></a>
## wish-133: demo/wish/index.html, inline script, line 1343

````js
    /* 🔴 THE LAST ANSWER'S LINKS COME DOWN HERE, NOT ONLY IN `clearAnswer`.
       A row is the connection since 2026-09-28, so a row destroyed without its
       link left an instrument being routed by a sentence that is no longer on
       screen and nothing left on the page to stop it. `think` clears first and
       so passes an empty list through this loop; every other caller is a check,
       and a check calling `show` twice used to leak a live link into the run. */
````

<a id="wish-134"></a>
## wish-134: demo/wish/index.html, inline script, line 1354

````js
      /* 🔴 THE STATE IS AN ATTRIBUTE NOW THAT IT IS NO LONGER A WORD. The
         picture carries it for a reader; this carries it for a check and for
         the action column the day it grows a button. */
````

<a id="wish-135"></a>
## wish-135: demo/wish/index.html, inline script, line 1360

````js
    /* 🔴 A ROW WITH NOTHING IN IT WHEN THERE IS NOTHING TO SHOW. A proposal
       naming nothing on this desk is an answer, and the component may not
       change height between having one and having none. */
````

<a id="wish-136"></a>
## wish-136: demo/wish/index.html, inline script, line 1364

````js
    /* 🔴 DRAWN AFTER THE ROWS ARE IN THE PAGE, NEVER BEFORE, AND THIS IS THE
       ONE ORDERING THAT MATTERS HERE. `createDiagram` measures the host it is
       given and falls back to 320 px when that host has no size yet, which is
       under the 560 px at which it stops laying a picture out in a row: a
       picture built into a detached element would be drawn stacked, and its
       `ResizeObserver` would put it right one frame later, so every check that
       reads the picture in the same tick would be reading a layout no reader
       ever sees. */
````

<a id="wish-137"></a>
## wish-137: demo/wish/index.html, inline script, line 1373

````js
    /* 🔴 THE REPORT IS A LOG LINE SINCE 2026-09-22, not a comment inside the
       object box: *"rm # the model proposed nothing..."*. It is still made,
       because an empty reply is an ANSWER and a blank box alone cannot say
       which of the two empty states it is in. */
````

<a id="wish-138"></a>
## wish-138: demo/wish/index.html, inline script, line 1381

````js
    /**
     * 🔴 THE ONE ROW THAT HAS NO PICTURE TO CAPTION STILL HAS TO SAY
     * SOMETHING. A link that begins and ends at one instrument draws no arrow,
     * so `drawOne` renders no figure and there is no caption slot to write
     * into, and a proposal of `Circuit -> Circuit` would have been a blank row.
     * The line under the picture's room carries the same two sentences there.
     * ⚠️ IT IS NOT THE OLD PAIR OF ELEMENTS TAKING TURNS. Exactly one of the
     * two exists on any row: a row with a figure has a caption and no line, a
     * row without one has the line and no figure. What was removed on
     * 2026-09-22 was a line standing down with `visibility` while a caption
     * above it said something else.
     */
````

<a id="wish-139"></a>
## wish-139: demo/wish/index.html, inline script, line 1398

````js
    /* 🔴 THE CONTROLS ARE BUILT AFTER `conns` IS ASSIGNED, NOT INSIDE THE MAP
       ABOVE IT. `drawOne` is spread into a NEW object, so a handler closing over
       the one that went in would hold a row whose `linkId` nothing else can
       see: the switch would connect and the remove would find nothing to take
       down. Two objects for one row is the `createTransportBar` trap in another
       costume. */
````

<a id="wish-140"></a>
## wish-140: demo/wish/index.html, inline script, line 1417

````js
  /**
   * 🔴 A PRESS CLEARS THE LAST ANSWER BEFORE IT ASKS THE NEXT QUESTION. Asked
   * 2026-09-21: *"hold to talk should clear previous input / routing"*. The
   * heard sentence, the JSON, the refusals and the picture all used to stay on
   * screen while a new recording was made and while both models thought, so for
   * several seconds the page showed the OLD answer next to a NEW question with
   * nothing to say which was which. A blank says *nothing yet*. A previous
   * answer left standing says *this is the answer*.
   * ⚠️ ON THE PRESS, NOT ON THE REPLY. Clearing when the answer lands leaves
   * the whole window that causes the problem exactly as it was.
   * ⚠️ AND THE BOX GOES BACK TO BLANK, never to a placeholder. There used to be
   * a `# no patch yet` line here, which said only that a box is a box.
   */
````

<a id="wish-141"></a>
## wish-141: demo/wish/index.html, inline script, line 1430

````js
  /**
   * 🔴 NOTHING IS DRAWN UNTIL THERE IS A MAPPING. Asked 2026-09-21: *"do not
   * show diagram until we have mapping"*, after *"make it json and autodraw
   * diagram below (reserve space for it)"*.
   * ⚠️ THE SECOND HALF OF THAT PAIR IS THE ONE THIS DOES NOT DELIVER, AND IT IS
   * MEASURED RATHER THAN ARGUED. See `.wish-dg`: an empty host is
   * `display: none` and 0 px, so the room is not held and the log moves when a
   * picture lands. The patch box above it DOES hold its floor, because a `<pre>`
   * is not on the list of wrappers `shell.css` collapses.
   * ⚠️ AND AN EMPTY BOX MUST NOT PAINT ITS EDGES, which is a standing rule here
   * ("separation is spacing, not lines, AND AN EMPTY BOX IS A LINE"), measured
   * once on `/typist/` where a page declaring `readout: null` still got a div
   * whose own borders rendered as a 2 px band nobody had written. `.wish-dg`
   * carries no border and no background either way.
   * ⚠️ A DESK WITH NO ARROWS IS NOT A MAPPING. The old behaviour drew all three
   * instruments from the first paint, which reads as an answer: three boxes and
   * nothing joining them is a picture saying *these do not connect*, which is a
   * claim nobody made.
   */
````

<a id="wish-142"></a>
## wish-142: demo/wish/index.html, inline script, line 1455

````js
    /* 🔴 A NEW QUESTION TAKES DOWN THE CONNECTIONS THE LAST ANSWER MADE, AND
       THAT IS NOT TIDINESS. The rows ARE the answer here, so a link that
       outlived its row would be an instrument being routed by a sentence nobody
       can read any more, with nothing left anywhere to stop it. One line for
       the lot rather than one per link, because it is one event. */
````

<a id="wish-143"></a>
## wish-143: demo/wish/index.html, inline script, line 1465

````js
    /* 🔴 BACK TO ONE EMPTY ROW, NEVER TO NO ROW AT ALL. The room a
       connection takes is reserved from the first paint, so pressing Interpret
       and getting one link back moves nothing under the reader's hand. */
````

<a id="wish-144"></a>
## wish-144: demo/wish/index.html, inline script, line 1479

````js
  /**
   * 🔴 ONE COUNTED FUNCTION, AND IT IS THE ONLY THING ON THIS PAGE THAT CAN
   * LEAVE IT. `reached` is what the assert below reads, so "a visit reached
   * nobody" is a number rather than a claim about a file.
   */
````

<a id="wish-145"></a>
## wish-145: demo/wish/index.html, inline script, line 1486

````js
  /**
   * 🔴 A FETCH THAT NEVER CONNECTED AND A FETCH THAT CAME BACK WITH AN ERROR
   * ARE TWO DIFFERENT REPORTS, AND THIS PAGE USED TO GIVE ONE. Both ends bolted
   * *"Is `node demo/wish-local.mjs` running?"* onto whatever went wrong, so an
   * expired Cloudflare credential was reported as a process that might not be
   * up. It sent a reader to look at the one thing that was never wrong, and it
   * cost an hour. The agent's own message is the agent's message.
   */
````

<a id="wish-146"></a>
## wish-146: demo/wish/index.html, inline script, line 1495

````js
    /* 🔴 A SUITE RUN ASKS NOBODY AND SPENDS NOTHING, AND `reached` IS NOT BUMPED
       BECAUSE NOTHING WAS REACHED. The counter is the page's audit of whether a
       visit opened anything, so counting a call that never left the tab would
       make the one assert about it read false. */
````

<a id="wish-147"></a>
## wish-147: demo/wish/index.html, inline script, line 1499

````js
    /**
     * 🔴 AND THE LISTENING CALL IS GATED TOO, SO THE WHOLE RELEASE IS GRADED.
     * Until this line `/hear` was unreachable in a harness run by construction
     * rather than by a gate: `begin()` stops before it opens a microphone, so
     * `finish()` never ran and the auto-ask nobody could reach was graded by
     * nothing at all. With a canned transcription a check can drive `finish()`
     * and watch a release transcribe and then propose, for nothing.
     * ✅ THE SENTENCE IS THE ONE THAT WAS MEASURED, from
     * `research/cf-models-speech-to-patch-2026-09-21.md` §7.1: 3.68 s of
     * webm/opus, returned word for word in 961 ms. Its case and its missing
     * full stop are the model's, not a typo, and they are what makes it
     * distinguishable from `EXAMPLE` in a check.
     */
````

<a id="wish-148"></a>
## wish-148: demo/wish/index.html, inline script, line 1513

````js
      /* 🔴 THE STAND-IN ANSWERS PER MODEL, BECAUSE THE REAL ONES DO. One canned
         sentence for three models would have graded the repair with a
         transcript that needs no repairing, which is a check that runs and
         measures nothing. Every string in `HEARD_BY` is a real reply from that
         model to the same spoken sentence. */
````

<a id="wish-149"></a>
## wish-149: demo/wish/index.html, inline script, line 1521

````js
      /* ⚠️ THE GATE RETURNS WHAT THE SERVER NOW RETURNS, not the raw model
         output. `relabel` in `workers/wish/src/wish.mjs` repairs the one key
         this model always gets wrong and reports the repair, so a stand-in
         handing back the raw form would grade a path that no longer exists.
         The raw form is still used directly below, where the validator is being
         asked about it. */
````

<a id="wish-150"></a>
## wish-150: demo/wish/index.html, inline script, line 1527

````js
      /**
       * 🔴 ONE ANSWER PER EXAMPLE, BECAUSE THERE ARE FIVE EXAMPLES NOW. Until
       * 2026-09-22 this returned the same reply whatever was asked, which was
       * right while one button held one sentence and would be a hole the moment
       * a second sentence existed: four of the five rows would fall outside the
       * gate and a suite run would start spending on somebody's account, or,
       * if the gate still caught them, four different requests would be graded
       * against one answer and measure nothing.
       * ⚠️ KEYED ON THE SENTENCE, which is the only thing the agent is sent
       * that identifies the request. It is the row's own `say`, so the table
       * and the gate cannot drift: there is one list.
       * ⚠️ AND THE FALLBACK IS THE FIRST EXAMPLE'S REPLY, for the paths that
       * ask about something nobody listed: a transcription that came off a
       * recording, and anything typed into the box and sent with Enter.
       */
````

<a id="wish-151"></a>
## wish-151: demo/wish/index.html, inline script, line 1553

````js
      /* ⚠️ AND THE ADVICE FOLLOWS THE ADDRESS. Telling a visitor on
         positron.studio to start a node process on their own laptop is the
         `Authentication error` defect again: a message that sends a reader to
         look at the one thing that was never theirs. */
````

<a id="wish-152"></a>
## wish-152: demo/wish/index.html, inline script, line 1577

````js
  /**
   * 🔴 THE INSTRUMENTS THIS PAGE CAN ACTUALLY PATCH, DERIVED FROM ITS OWN PORT
   * LIST AND NEVER TYPED AGAIN. `demo/shell/instruments.mjs` describes the
   * whole room: a Fast Track Pro, an IAC bus and the Model 12's DAW control
   * surface are all real and none of them is on this page. A correction that
   * wrote one of those names into the box would put a word in somebody's mouth
   * AND still come back *nothing on this desk*, which is both failures in one
   * press. `describe()` turns a port's own label into the taxonomy's name, so
   * this list cannot drift from `PORTS`.
   */
````

<a id="wish-153"></a>
## wish-153: demo/wish/index.html, inline script, line 1589

````js
  /**
   * 🔴 THE SPEECH MODEL'S HEARING, REPAIRED BEFORE THE LANGUAGE MODEL READS IT,
   * AND SAID OUT LOUD EVERY TIME. Asked 2026-09-21: *"can you patch wish thinkg
   * or transcding with simular-sounding lookups"*, and this is where the lookup
   * finally gets called: it had 32 asserts and 144 measured transcripts behind
   * it and NO page using it.
   *
   * 🔴 IT IS THE TRANSCRIPTION AND NEVER THE TYPING. A machine produced these
   * words and a machine may be corrected; what a person typed into that box is
   * what they meant, and a page that rewrites it while they press Enter is
   * arguing with them. So `think()` is left alone and this sits on the one path
   * a model's output takes.
   *
   * ⚠️ NOTHING IS REWRITTEN SILENTLY, which is the whole condition on doing it
   * at all. The line below names the words that were there before, the box
   * shows the result, and the box is editable, so the repair costs one
   * keystroke to undo. It is the same arrangement as `relabel()` at the other
   * end of the chain, which repairs the one key this model always gets wrong
   * and RETURNS the repair so the page can print it.
   *
   * ⚠️ AND TWO INSTRUMENTS ON ONE SPAN IS NEVER PICKED BETWEEN. See `reword()`:
   * the words stand, both names are printed, and the person chooses by typing
   * one of them. This page's desk has three instruments and the ambiguity
   * cannot arise on it, so that branch is graded in
   * `demo/shell/instruments-test.mjs` with a desk that has both.
   */
````

<a id="wish-154"></a>
## wish-154: demo/wish/index.html, inline script, line 1629

````js
  /**
   * The patch half of the flow: a sentence in, an object out.
   * ⚠️ THE FUNCTION KEEPS ITS NAME AND THE PAGE DOES NOT USE THE WORD. `think`
   * is fine in code and is jargon on screen, which is the whole of the rule: a
   * visitor never reads a function name.
   */
````

<a id="wish-155"></a>
## wish-155: demo/wish/index.html, inline script, line 1645

````js
      /* 🔴 A REPAIR NOBODY IS TOLD ABOUT IS A REWRITE, and *a model proposes and
         a person presses* survives only if the person can see what the model
         actually said. */
````

<a id="wish-156"></a>
## wish-156: demo/wish/index.html, inline script, line 1652

````js
      /* 🔴 THE WHOLE OUTCOME LIVES HERE NOW, because the readout gave up its
         cells and a number nothing prints is a number the page stopped
         reporting. Four facts on one line, dated by the log, so two answers can
         be compared. */
````

<a id="wish-157"></a>
## wish-157: demo/wish/index.html, inline script, line 1661

````js
      /* ⚠️ IN A `finally`, or a model that answers with an error leaves both
         surfaces glimmering at somebody who is never going to get an answer. */
````

<a id="wish-158"></a>
## wish-158: demo/wish/index.html, inline script, line 1669

````js
  /**
   * What a listening model really returned for that sentence, word for word,
   * measured in `research/cf-models-speech-to-patch-2026-09-21.md` §7.1. It is
   * the gate's reply for `/hear`, and it is NOT `EXAMPLE`: a check that saw the
   * example in the box could not tell a transcription that flowed through the
   * chain from a constant a button had written a moment earlier.
   */
````

<a id="wish-159"></a>
## wish-159: demo/wish/index.html, inline script, line 1678

````js
  /**
   * 🔴 WHAT EACH LISTENING MODEL REALLY RETURNED, SO THE REPAIR IS GRADED
   * THROUGH THE PATH IT LIVES ON RATHER THAN BESIDE IT. All three rows are
   * quoted from `research/name-lookups-2026-09-21.md`, including the leading
   * space `whisper-tiny-en` puts on everything.
   * - `turbo` gets the sentence above, which names both instruments properly
   *   and is therefore the negative control: a correct hearing must come back
   *   untouched.
   * - `whisper` mangled `tascam` into `taskham` (row 647). On the WHOLE desk
   *   that reaches the Model 12 and its DAW control surface at the same
   *   distance; this page has no DAW control port, so exactly one instrument
   *   survives and the words are corrected.
   * - `tiny-en` split `MK425C` into two tokens (row 582), which is the case the
   *   span arithmetic exists for.
   * ⚠️ THE PICKER IS AN ORDINARY CONTROL AND THE CHECK USES IT AS ONE. Nothing
   * here is a second switch only a harness knows about.
   */
````

<a id="wish-160"></a>
## wish-160: demo/wish/index.html, inline script, line 1700

````js
  /**
   * 🔴 THE REPLY THE REAL MODEL GAVE, AND IT IS THE GATE FOR A SUITE RUN.
   * MEASURED 2026-09-21 through `demo/wish-local.mjs` against
   * `@cf/meta/llama-3.3-70b-instruct-fp8-fast`: the ports were right and the
   * transform's argument was under the wrong key. A check written against an
   * invented reply would have missed the only interesting thing that happened.
   * 🔴 AND IT IS WHY `Use the example` MAY ASK. Reported 2026-09-21: *"i do not
   * get why you own example does not work. use example shoyld ask"*. The button
   * used to write into the box and ask nobody, so the harness could press it
   * for nothing; but a button called *use the example* that does not use it is
   * the shape of control this project calls a lie. **THE GATE BELONGS ON THE
   * NETWORK, NOT ON THE BUTTON**, which is `/shape/`'s `sink` exactly: a suite
   * run must not be a hand on somebody's paid account, and the way to arrange
   * that is for the call to reach a stand-in rather than for the control to do
   * nothing.
   */
````

<a id="wish-161"></a>
## wish-161: demo/wish/index.html, inline script, line 1438

````js
  /**
   * 🔴 THE SAME REPLY AFTER THE BOUNDARY REPAIRED IT, which is what a real call
   * returns now. Reported 2026-09-21 as *"can we please kill it"* after the
   * refusal was seen a fourth time. `to` is an ABSOLUTE target and `by` is a
   * RELATIVE shift, so the language keeps `by` and `to` is accepted as a known
   * synonym: `transpose to 1` would mean transpose to note number 1, which is
   * meaningless, and standardising on `to` would make the patch language wrong
   * in order to agree with a model.
   * ⚠️ THE PROMPT WAS NEVER THE PROBLEM. It already said *"transpose takes by,
   * not to"* in those words and the model did it anyway on every run, because
   * a link's own destination field is `to` and `channel to=N` is the first
   * transform listed, so `to` sits beside `transpose` twice in the most
   * prominent places there are. Pattern matching, not misreading.
   */
````

<a id="wish-162"></a>
## wish-162: demo/wish/index.html, inline script, line 1456

````js
  /**
   * 🔴 FIVE SENTENCES, AND THREE OF THEM GO WRONG IN THREE DIFFERENT WAYS.
   * Asked 2026-09-22: *"add 5 varied examples into a table, some failable
   * instead of 'Use the example' in wish"*.
   *
   * 🔴 `links` IS WHAT THE REAL MODEL REALLY RETURNED ON FOUR OF THE FIVE, AND
   * THE FIFTH SAYS ON ITS OWN ROW THAT IT IS CONSTRUCTED. A
   * check written against an invented reply misses the only interesting thing
   * that happened, which is the argument `CANNED` above already makes; the
   * same standard is owed to a reader pressing a row.
   * ⚠️ AND `links` IS ONLY EVER SEEN UNDER `?selfcheck=1`. A visitor pressing a
   * row reaches the deployed agent and gets whatever the model says today. What
   * is canned here is what a suite run sees, so that a run costs nobody
   * anything, which is the whole of `post`'s gate: the gate belongs on the
   * network and never on the control.
   * 🔴 SO FIVE ROWS NEED FIVE CANNED ANSWERS. One reply for five sentences
   * would put four of them outside the gate and a suite run would start paying
   * for them, or worse, would grade four different requests against one answer
   * and measure nothing.
   *
   * ⚠️ WHAT IS NOT HERE, AND IT IS THE ONE THIS DESK WORRIES ABOUT MOST. A
   * SysEx link to the Circuit cannot be produced on this page at all: `NEVER`
   * refuses a class the source could deliver, `EMITS` does not list `sysex`, so
   * `delivers()` can never contain it and the hard refusal is unreachable from
   * any sentence. Putting `sysex` into `EMITS` to make the example work would
   * refuse EVERY link into the Circuit, because `never` is tested before
   * anything is dropped. The rule is still said in words on the box's own
   * hover, and it is still true of the instrument.
   */
````

<a id="wish-163"></a>
## wish-163: demo/wish/index.html, inline script, line 1486

````js
    /**
     * ✅ MEASURED 2026-09-21 on `@cf/meta/llama-3.3-70b-instruct-fp8-fast`
     * through `demo/wish-local.mjs`: the ports right and the transform's
     * argument under the wrong key. `links` is the reply AFTER the boundary
     * repaired it, because that is what a real call returns now, and `fixed` is
     * the repair the page prints in words.
     */
````

<a id="wish-164"></a>
## wish-164: demo/wish/index.html, inline script, line 1499

````js
    /**
     * 🔴 THE PROPOSAL THAT IS PERFECTLY VALID AND WOULD DO NOTHING, WHICH IS
     * THE FAILURE NO VALIDATOR CAN CATCH AND THE REASON THIS PAGE PROPOSES
     * RATHER THAN CONNECTS. ✅ MEASURED 2026-09-21 from *"I want to play notes
     * with my model 12 REC buttons and play it to a circuit synth 1"*: the
     * model answered `Model 12 MIDI IN -> Circuit`. That port is the 5 pin DIN
     * socket bridged to USB and it stayed SILENT through 525 messages while the
     * buttons came out of `Model 12 DAW Control IN`.
     * ⚠️ IT IS ALLOWED AND IT STAYS ALLOWED. There is nothing invalid about it,
     * and a page that refused it would be inventing a rule to hide a lesson.
     */
````

<a id="wish-165"></a>
## wish-165: demo/wish/index.html, inline script, line 1518

````js
    /**
     * 🔴 THE VOCABULARY REACHING FOR THE NEAREST WORD IT HAS. ✅ MEASURED
     * 2026-09-21 from *"Split the keyboard into half. Lower part plays synth 1
     * in the circuit and upper part plays synth 2 in the circuit."*: the 70B
     * produced `{"op":"only","to":1}` twice and both were refused, because
     * `only` filters by message CLASS and was the closest thing in the whole
     * language to a filter.
     * ⚠️ `range` WAS ADDED THE SAME DAY AND THIS REPLY IS FROM BEFORE IT
     * EXISTED. Whether the model reaches for `range` now has not been measured,
     * and a canned answer saying it does would be a claim nobody checked.
     * ⚠️ IT IS ALSO THE ONLY ROW WITH TWO LINKS BETWEEN ONE PAIR, AND IT IS TWO
     * ROWS AND TWO ARROWS SINCE 2026-09-22. It was one arrow while every link
     * was drawn into one picture, because two lines down one gap read as one
     * and the picture would then have said fewer links than the answer does. A
     * connection is a row with a picture of its own now, so there is no shared
     * gap left and each link is drawn whole.
     */
````

<a id="wish-166"></a>
## wish-166: demo/wish/index.html, inline script, line 1545

````js
    /**
     * 🔴 THE ENUM REFUSING AN INVENTION, WHICH IS THE ONE PLACE A JSON SCHEMA
     * REALLY EARNS ITS KEEP HERE. ✅ MEASURED 2026-09-21: a Moog and a Prophet,
     * neither of them on this desk, came back as **no links at all in 496 ms**,
     * because `from` and `to` are an `enum` of the real port ids and there was
     * nothing in it to name. The page says so in words rather than showing an
     * empty box.
     */
````

<a id="wish-167"></a>
## wish-167: demo/wish/index.html, inline script, line 1559

````js
    /**
     * 🔴 THE ONE THAT CARRIES A CONTROLLER RATHER THAN NOTES, AND IT IS
     * CONSTRUCTED. ⚖️ MEASURED 2026-09-21 was the FAILURE: *"connect the first
     * rotary knob of evolution to the first rotary knob of circuit"* came back
     * as `{"op":"cc","to":1}` with no `from` at all and was refused, because
     * the model had been told the channels and nothing about controller
     * numbers. `FACTS` gained the keyboard's six CC numbers and the Circuit's
     * eight macros that day. **This reply is what those facts make possible and
     * it has not been asked again**, so it is marked as constructed on the row
     * rather than quoted as a reading.
     */
````

<a id="wish-168"></a>
## wish-168: demo/wish/index.html, inline script, line 1583

````js
  /**
   * ⚠️ ONE FUNCTION FOR THREE WAYS IN. Enter in the box, the `Interpret` button
   * and a release after a transcription all ask the same question about the
   * same text, and three copies of that would be three things to keep in step.
   */
````

<a id="wish-169"></a>
## wish-169: demo/wish/index.html, inline script, line 1597

````js
  /**
   * 🔴 ENTER ASKS, SHIFT+ENTER MAKES A NEWLINE, AND THAT REPLACES A BUTTON.
   * Asked 2026-09-21: *"remove the Ask button, auto-ask after transcription"*.
   * An instruction here is one sentence, so a newline is very nearly never
   * wanted, which is what lets Enter carry the primary meaning: it is the
   * settled convention for a composer and it needs no furniture on the page.
   * ⚠️ `preventDefault` ON THE ASKING BRANCH ONLY, or Enter would both ask and
   * leave a blank line in the box it just sent.
   * 🔴 AND A HARNESS CANNOT PRESS A KEY IN A TEXTAREA. `demo/verify.mjs` clicks
   * every button in the control row and does nothing else, so an ask that only
   * a key could reach would be graded by nothing while the suite stayed green.
   * Two things keep it reachable: `Use the example` is a button and it asks,
   * and the check below dispatches the real `keydown` for both halves.
   */
````

<a id="wish-170"></a>
## wish-170: demo/wish/index.html, inline script, line 1619

````js
  /**
   * 🔴 HELD RATHER THAN TOGGLED, ASKED FOR 2026-09-21: *"replace speak button
   * with a hold to alk button"*. A toggle carries a state that can get stuck:
   * a second press that is missed, a hand that leaves the page, a phone that
   * takes the gesture away to scroll, and the microphone is open with nobody in
   * front of it. A hold lasts exactly as long as the hand does.
   *
   * 🔴 **AND IT ANSWERS A PLAIN CLICK AS WELL, WHICH IS NOT POLITENESS.**
   * `demo/verify.mjs` drives every page by calling `.click()` on each button in
   * `.pos-controls`, and `element.click()` fires NO pointer events at all. A
   * hold-only control in that row is a check the harness can no longer reach,
   * and those asserts do not go red, they stop running while the suite stays
   * green: this repository has paid for exactly that twice, on `/mirror/` and
   * on `/blocks/`. So a press with no pointer behind it, which is the harness,
   * the Enter key and an assistive click, records a fixed short window instead.
   * **A click is a tap with no finger**, and it is the same code path.
   */
````

<a id="wish-171"></a>
## wish-171: demo/wish/index.html, inline script, line 1648

````js
  /* 🔴 THE PICTURE IS THE ONE EVERY OTHER CONTROL IN THIS PROJECT USES.
     `data-busy` is paint only, it is reduced-motion aware, and it says "this
     control is at work" from the moment of the press until the answer lands,
     which is true of the recording and of the proposal after it. A label change
     or a spinner would resize the button and reflow the row under the hand that
     is holding it. */
````

<a id="wish-172"></a>
## wish-172: demo/wish/index.html, inline script, line 1656

````js
  /**
   * 🔴 THE BUTTON CARRIES NOTHING OF ITS OWN, AND THAT IS AN INSTRUCTION RATHER
   * THAN A CHOICE. A dot moving with the microphone level was asked for on
   * 2026-09-21 and withdrawn the same day: *"rm dot from hold to talk"*. The
   * `AnalyserNode` that had been built for it came out with it, because a
   * microphone analyser nobody reads is a node opened on every press for no
   * reader.
   * 🔴 **SO THERE IS NO PER HOLD LEVEL INDICATION ON THIS PAGE, AND IT IS A
   * KNOWN GAP RATHER THAN AN OVERSIGHT.** Somebody holding the button cannot
   * tell whether the microphone is picking them up until the transcription
   * arrives. What is left is the sweep above, which says the control is at work
   * and says nothing about what it can hear.
   */
````

<a id="wish-173"></a>
## wish-173: demo/wish/index.html, inline script, line 1681

````js
    /* 🔴 THE ANSWER GOES BEFORE THE QUESTION IS ASKED, not when the reply
       lands. See `clearAnswer`: the window this closes is the whole recording
       plus both model calls, which is the several seconds a reader spends
       looking at the last answer while giving the next instruction. */
````

<a id="wish-174"></a>
## wish-174: demo/wish/index.html, inline script, line 1687

````js
    /* ⚠️ AND NOTHING SHIMMERS YET. A microphone that is open with somebody
       still talking into it is the page waiting for a PERSON, and no model is
       working: *"a shimmer only while thinking"*. The button's own sweep says
       the control is at work, which is a different and true claim. */
````

<a id="wish-175"></a>
## wish-175: demo/wish/index.html, inline script, line 1691

````js
    /* ⚠️ THE MICROPHONE IS THE ONLY HALF A CHECK SKIPS. The gesture itself, its
       timing and its ending are the same code for a harness and for a hand,
       because a gesture that behaves one way under `?selfcheck=1` is a gesture
       nothing grades. */
````

<a id="wish-176"></a>
## wish-176: demo/wish/index.html, inline script, line 1712

````js
    /* ⚠️ A PERMISSION PROMPT TAKES LONGER THAN A PRESS. The hand can be off the
       button before the microphone opens, so the release is checked here rather
       than assumed. */
````

<a id="wish-177"></a>
## wish-177: demo/wish/index.html, inline script, line 1722

````js
    /* ⚠️ A TAP CAN LET GO BEFORE THE MICROPHONE OPENS, so this reads the state
       rather than describing the gesture it assumed. */
````

<a id="wish-178"></a>
## wish-178: demo/wish/index.html, inline script, line 1737

````js
      /* 🔴 THE PHONE CASE, AND IT ENDS THE RECORDING RATHER THAN SENDING IT.
         The browser takes a gesture away to scroll and no `pointerup` ever
         arrives, so half a word would be uploaded on behalf of somebody who was
         scrolling the page. */
````

<a id="wish-179"></a>
## wish-179: demo/wish/index.html, inline script, line 1752

````js
  /* ⚠️ THE LIGHT STAYS ON UNTIL `finish()` IS DONE. Turning it off at the
     release and on again at the upload blinks the control for the one or two
     frames `onstop` takes to arrive, and a control that flickers reads as one
     that lost the press. */
````

<a id="wish-180"></a>
## wish-180: demo/wish/index.html, inline script, line 1771

````js
    /* 🔴 THE SHIMMER STARTS HERE, which is the moment the recording has stopped
       and the listening model's work begins. Before this line the page is
       waiting for a person; after it, it is waiting for a model.
       ⚠️ AND IT IS SET BEFORE THE FIRST `await` RATHER THAN BESIDE THE `post`,
       so there is no tick in which the box is blank and nothing says why. It
       also makes the moment observable by a check, which cannot sample a state
       that only exists between two awaits. */
````

<a id="wish-181"></a>
## wish-181: demo/wish/index.html, inline script, line 1781

````js
      /* ⚠️ CHUNKED, because `String.fromCharCode(...buf)` on a few seconds of
         audio is tens of thousands of arguments and blows the stack. */
````

<a id="wish-182"></a>
## wish-182: demo/wish/index.html, inline script, line 1791

````js
      /**
       * 🔴 THE RELEASE ASKS BY ITSELF, AND IT HAS SINCE THE HOLD WAS BUILT.
       * Asked again 2026-09-21: *"then auto-ask after it and show glimmer and
       * then show json"*. `think()` writes the transcription into the box on
       * its way past, so the words land somewhere a reader can correct them and
       * the proposal starts in the same breath. `Ask` is for the second attempt
       * at a sentence the speech model got wrong, which is the only reason that
       * box is a textarea.
       */
````

<a id="wish-183"></a>
## wish-183: demo/wish/index.html, inline script, line 1815

````js
    /* 🔴 CAPTURE, OR A PHONE GETS STUCK RECORDING. With the pointer captured
       this button is guaranteed its `pointerup` even when the finger has slid
       off it, so the pointer leaving cannot strand a hold. `pointercancel` is
       the other half: the browser takes the gesture away for a scroll and
       nothing else ever arrives. */
````

<a id="wish-184"></a>
## wish-184: demo/wish/index.html, inline script, line 1830

````js
  /* ⚠️ NOT `async`, ON PURPOSE. The shell paints `data-busy` and DISABLES a
     control whose handler returns a promise, and it clears both when the
     promise settles, which would wipe the recording's own paint one tick after
     a tap set it. The selfcheck branch does return one, because there the
     control really is working for as long as the checks run. */
````

<a id="wish-185"></a>
## wish-185: demo/wish/index.html, inline script, line 1837

````js
    /* 🔴 A CLICK THAT TRAILS A REAL HOLD IS THE SAME PRESS ARRIVING TWICE. A
       trusted `pointerup` is followed by a `click` on the same button, so
       without this a hand's press would also start the no-pointer path. A
       synthetic click carries no pointer events at all and never trips it. */
````

<a id="wish-186"></a>
## wish-186: demo/wish/index.html, inline script, line 1851

````js
    /**
     * 🔴 THE ROWS, READ OFF THE PAGE RATHER THAN OFF `conns`. What is being
     * graded is what a reader is shown, and two numbers derived from one field
     * agree with each other whatever is wrong, which this project has already
     * paid for once on the MIM corpus.
     * ⚠️ EVERY CHECK BELOW THAT USED TO READ ONE `whyBox` READS THE SAME WORDS
     * THROUGH `whyText`. The claims did not move when the layout did: a refusal
     * still has to name the key it is about, and a row still has to name the
     * instrument rather than a port id.
     */
````

<a id="wish-187"></a>
## wish-187: demo/wish/index.html, inline script, line 1862

````js
    /**
     * 🔴 A ROW'S SENTENCE LIVES IN TWO PLACES AND THE CHECKS MAY NOT CARE
     * WHICH. Since 2026-09-22 it is the FIGURE'S CAPTION, the slot
     * `createDiagram` already reserves and already swaps on hover, and
     * `.wish-why` is the fallback for the one row that has no picture to
     * caption: a link that begins and ends at one instrument draws no arrow.
     * ⚠️ **SO A CHECK READING `.wish-why` DIRECTLY WOULD READ AN EMPTY BOX ON
     * EVERY ORDINARY ROW AND PASS ONLY ON THE ODD ONE.** Six asserts did
     * exactly that for one run. This reads whichever element is carrying the
     * words, which is what every one of them meant.
     */
````

<a id="wish-188"></a>
## wish-188: demo/wish/index.html, inline script, line 1875

````js
    /* ⚠️ THE WHOLE ROW, NOT THE CAPTION ELEMENT. A row's sentence may be three
       lines and the figure's caption renders the first of them, so a check
       reading the caption alone sees the connection's name and never the reason
       under it. Reading the row catches the words wherever the component put
       them. */
````

<a id="wish-189"></a>
## wish-189: demo/wish/index.html, inline script, line 1883

````js
    /**
     * 🔴 A CANNED REPLY, AND IT IS THE ONE THE REAL MODEL GAVE. Measured
     * 2026-09-21 through `demo/wish-local.mjs` against
     * `@cf/meta/llama-3.3-70b-instruct-fp8-fast`: the ports were right and the
     * transform's argument was under the wrong key. **A check written against
     * an invented reply would have missed the only interesting thing that
     * happened.**
     */
````

<a id="wish-190"></a>
## wish-190: demo/wish/index.html, inline script, line 1893

````js
    /* 🔴 A COUNTER, NOT A CLAIM. This read `SELFCHECK ? true : true` and could
       not go red whatever the page did, which is an assert that reports the
       author's intention. `post()` is the one function on this page that can
       leave it, and it counts every call.
       🔴 AND IT COUNTS THE DESK SINCE 2026-09-28, WHICH IS THE DAY A ROW
       STOPPED NEEDING A SWITCH. With the answer itself making the connection,
       the thing worth auditing is no longer only *did a press reach a model*
       but *did anything reach an instrument*, and the line above this one is
       the strongest negative control there is for it: `CANNED` is a REFUSED
       reply, so a `connectAll` that ignored `row.ok` would light this red.
       `requestMIDIAccess` is counted from the load path, so a page that opened
       the desk to draw a picture would be caught here too. */
````

<a id="wish-191"></a>
## wish-191: demo/wish/index.html, inline script, line 1910

````js
    /* 🔴 THE SENTENCE NAMES NO FIELD AT ALL SINCE 2026-09-22, WHICH REVERSES
       WHAT THIS ASSERT USED TO REQUIRE. It read `transpose takes "by"` and
       `was given "to"`, and the quoting was itself a repair: bare `by` and `to`
       parsed as broken grammar. Then the whole register was reported as
       unusable, *"its not for humans, i do not know what to do"*, and the
       sentences became English about the instrument.
       ✅ **SO THIS GRADES THE CLAIM RATHER THAN THE WORDING, AND ALSO GRADES
       THE ABSENCE.** The link is still refused, the reason still says what is
       missing in words a person can act on, and NO field name appears in it.
       The last clause is the one that would catch a slide back. */
````

<a id="wish-192"></a>
## wish-192: demo/wish/index.html, inline script, line 1920

````js
    /* ⚠️ AND THE PROSE IS WHAT MAY NOT CARRY A FIELD NAME, not the repair. The
       solution line offers the corrected OBJECT, which is a thing to compare
       against the JSON block directly above it rather than an English claim
       about two keys, and `bay.mjs` argues that at length where it is built.
       So the absence is graded on the reason and not on the row. */
````

<a id="wish-193"></a>
## wish-193: demo/wish/index.html, inline script, line 1926

````js
    /* ⚠️ A LIST RATHER THAN A REGEX LITERAL, and the reason is the build rather
       than taste: `build.mjs` scans modules for imports, and a pattern holding
       a quoted `from` reads as one. It refused the build with
       `wish/index.html imports /.test(whyOnly)`, which is the scanner quoting
       my own check back at me. */
````

<a id="wish-194"></a>
## wish-194: demo/wish/index.html, inline script, line 1939

````js
    /* 🔴 THE JSON IS THE MODEL'S OWN OBJECT, and the `to: 1` that caused the
       refusal is IN it. That is the whole reason this box stopped being the
       compact patch language: the refusal underneath was naming a key the line
       above it did not show.
       🔴 AND THE PARSE IS GUARDED, WHICH THE FIRST BUILD OF THIS LINE WAS NOT.
       Found by sabotage: putting the compact form back made `JSON.parse` THROW
       inside the assert's own expression, which killed the rest of the check and
       took the page from 25 asserts to 2 while reading green. An assert that
       throws does not go red, it goes missing. */
````

<a id="wish-195"></a>
## wish-195: demo/wish/index.html, inline script, line 1950

````js
      /* 🔴 THE INDENT MOVED FROM TWO SPACES TO FOUR WHEN THE BOX BECAME AN
         ARRAY, so a test for `\n  "` stopped matching. It reads the SHAPE now
         rather than the whitespace: an array, opening on its own line, with a
         key indented under an entry. Indentation was never the claim. The
         claim is that the object is shown whole and readable rather than
         compacted onto one line, which is what hid a `to: 1` once. */
````

<a id="wish-196"></a>
## wish-196: demo/wish/index.html, inline script, line 1959

````js
      /* 🔴 `asObject[0]`, BECAUSE THE BOX IS AN ARRAY SINCE 2026-09-22. This
         read `asObject.transforms` and would have gone red on the shape
         change, which is what it is for. */
````

<a id="wish-197"></a>
## wish-197: demo/wish/index.html, inline script, line 1965

````js
    /* ⚠️ THE NEGATIVE CONTROL FOR THE SLICE, and it is the only thing that makes
       `TRANSFORM_TEXT` safe: it cuts a fixed number of characters off
       `printLink`'s output, so the day that function's separator changes this
       goes red instead of the page quietly showing half an id. */
````

<a id="wish-198"></a>
## wish-198: demo/wish/index.html, inline script, line 1975

````js
    /* 🔴 NO `here:` ANYWHERE A READER LOOKS. It is the site segment of a port id
       and it means this machine, which nobody outside this repository can know
       and which is the same word on every row of this desk. */
````

<a id="wish-199"></a>
## wish-199: demo/wish/index.html, inline script, line 1983

````js
    /**
     * 🔴 AND WITH AN ANSWER ON SCREEN A CONNECTION IS A PART OF THE GLUE WITH
     * A SEAM ABOVE IT, which is the only moment that can be measured: a row
     * holding nothing is what stands there until something is proposed, so a
     * check taken before one lands says nothing about the rows an answer makes.
     * ⚠️ THAT IS WHY THIS SITS HERE RATHER THAN BESIDE THE OTHER LAYOUT CHECKS.
     * A check run at the wrong moment is a check that measures a state nothing
     * has reached, which this page has already paid for once.
     * ⚠️ AND THE SEAM UNDER IT IS MEASURED AGAINST THE OBJECT BLOCK, which is
     * the part that follows the last row. With one link there is one row, so
     * both of its seams belong to the glue and neither is drawn by this page.
     */
````

<a id="wish-200"></a>
## wish-200: demo/wish/index.html, inline script, line 2000

````js
      /* ⚠️ THE SEAM BELOW WENT WITH THE OBJECT BLOCK, 2026-09-22. A row is the
         LAST part of the glue now, so what is under it is the component's own
         edge rather than a seam, and asking for 1 px there was asking the glue
         to have a part it no longer has. The claim that survives is the one
         this was always about: a row is a PART, with the glue's seam above it,
         painting its own ground and drawing no border of its own. */
````

<a id="wish-201"></a>
## wish-201: demo/wish/index.html, inline script, line 2016

````js
    // ⚠️ THE NEGATIVE CONTROL: the same link, spelled right, is allowed. Without
    // it the line above would pass on a page that refused everything.
````

<a id="wish-202"></a>
## wish-202: demo/wish/index.html, inline script, line 2030

````js
    /* 🔴 A MODEL THAT PROPOSED NOTHING IS A REPORT AND IS SHOWN LIKE ANY OTHER
       ANSWER, which is the second clause here and is the negative control for
       the assert below it: two empty states, and this is the one with something
       to say.
       🔴 THE EDGE CLAUSE LEFT THIS LINE 2026-09-21 AND WAS REHOMED RATHER THAN
       DROPPED. It read `borderTopColor !== rgba(0, 0, 0, 0)` on the `<pre>`,
       which was the page's way of saying *this box is showing something*. Inside
       a glue no child has an edge of its own, so the fact moved to the assert on
       the component's seams and edges, where it is now measured for all three
       parts at once instead of for this one. */
````

<a id="wish-203"></a>
## wish-203: demo/wish/index.html, inline script, line 2040

````js
    /* 🔴 THE REPORT MOVED TO THE LOG ON 2026-09-22: *"rm # the model proposed
       nothing..."*. It was a REPORT rather than furniture and is still made, in
       the place a sentence about one run belongs. What it could not go on doing
       is sitting inside a box whose subject is the model's own object, where a
       comment is a thing a reader tries to parse.
       ⚠️ SO WHAT IS GRADED IS THE SAYING, NOT WHERE IT IS SAID: an empty reply
       still produces a line naming it, and the object box is blank rather than
       holding prose. */
````

<a id="wish-204"></a>
## wish-204: demo/wish/index.html, inline script, line 2056

````js
    /**
     * 🔴 AND THE OTHER EMPTY STATE IS THE ONE THAT SAYS NOTHING, WHICH IS WHAT
     * *"rm no patch yet"* ASKED FOR ON 2026-09-21. Four things at once, because
     * they only work together: the box is blank, it does not claim to be
     * showing anything, it draws no edge and no ground of its own, and the room
     * is still taken so an answer landing after a two model round trip cannot
     * shove what is under it down the page.
     * 🔴 THE EDGE CLAUSE IS A WIDTH NOW AND IT USED TO BE A COLOUR, which is a
     * change in the instrument rather than in the claim. `border-top-color`
     * computes to `currentColor` when nothing sets it, so on a box with no
     * border at all it answers the ink colour and never `rgba(0, 0, 0, 0)`: the
     * old test could only work while the page was painting a transparent 1 px
     * edge on purpose. A width of 0 is the same question asked of a box that
     * has given its border to the glue.
     * ⚠️ THE COMPUTED VALUES, NEVER THE SOURCE. A rule that lost reads as
     * correct in a stylesheet, which this project has measured five times, and
     * `.wish-patch` is fighting `.pos-glue`'s (0,2,0) child rule now.
     */
````

<a id="wish-205"></a>
## wish-205: demo/wish/index.html, inline script, line 2082

````js
      /* ⚠️ WITHIN HALF A PIXEL, BECAUSE A USED HEIGHT IS NOT THE NUMBER THAT
         WAS ASKED FOR. The browser lays out on a 1/64 px grid, so a
         `min-height` of 268.8 px is used as 268.796875 and an exact `>=`
         reads as a box that lost its floor by three thousandths of a pixel.
         MEASURED the moment the reservation stopped being a whole number. */
````

<a id="wish-206"></a>
## wish-206: demo/wish/index.html, inline script, line 1890

````js
    /* ── the picture, in all three of its states ──────────────────────────
       🔴 GRADE IT, BECAUSE NOTHING ELSE CAN SEE IT. `createDiagram` collects
       every name it had to shorten, every note over about forty words and every
       arrow it could not route, on `cuts`.
       ⚠️ AND IN EVERY STATE, WHICH THE FIRST BUILD OF THIS CHECK GOT WRONG. It
       read `cuts` once, on a picture with no arrows in it, so a link label the
       drawer had to cut passed straight through a check written to catch
       exactly that. The picture is rebuilt on every answer, so the cuts are a
       fact about a state rather than about the page. */
````

<a id="wish-207"></a>
## wish-207: demo/wish/index.html, inline script, line 1899

````js
    /* 🔴 ACROSS EVERY ROW, WHICH IS WHAT `THE PICTURE` MEANS SINCE 2026-09-22.
       One host became one per connection, so a query rooted at a single host
       would have gone on grading the first row and reporting it as the page.
       The counts are totals and the heights are the tallest of them, so a
       second row that draws badly cannot hide behind a first one that does
       not. */
````

<a id="wish-208"></a>
## wish-208: demo/wish/index.html, inline script, line 1909

````js
    /* ⚠️ `:not([aria-hidden])` IS NOT DECORATION. `createDiagram` measures its
       own text with a ruler element that carries the same class, parked off to
       one side and emptied after each layout, so a plain query answers one more
       label than the picture has and the first one is always blank. */
````

<a id="wish-209"></a>
## wish-209: demo/wish/index.html, inline script, line 1913

````js
    /* 🔴 AND THE LINES ARE JOINED WITH A SPACE, BECAUSE `textContent` JOINS
       THEM WITH NOTHING. `createDiagram` draws a wrapped label as one `tspan`
       per line, so the moment an arrow carried more than one word this read
       `note, cc,bend` and an assert about what the picture says was failing on
       the place the drawer chose to break. MEASURED 2026-09-22, the first day
       an allowed arrow had a name on it. */
````

<a id="wish-210"></a>
## wish-210: demo/wish/index.html, inline script, line 1926

````js
    /* ⚠️ A ROW'S `dg` IS NULL IN THE STATE WHERE NOTHING WAS PROPOSED, since a
       picture with no arrows is not drawn at all. Reading `dg.mode` there is a
       TypeError inside the check, which does not go red, it takes every assert
       after it with it. */
````

<a id="wish-211"></a>
## wish-211: demo/wish/index.html, inline script, line 1941

````js
      /* 🔴 AND THE WIDTH THE DRAWER WAS GIVEN, because the mode above is
         decided on it: `diagram.mjs` lays a picture out in a row while its host
         is at least 560 px and stacks it below that, and everything the
         reserved action column takes comes off this number. A row layout that
         quietly became a column would double the height of every connection. */
````

<a id="wish-212"></a>
## wish-212: demo/wish/index.html, inline script, line 1963

````js
    /* 🔴 THE WHOLE DESK, WHATEVER WAS PROPOSED, AND ONE ARROW PER PROPOSAL.
       🔴 THE CLAIM CHANGED 2026-09-21 AND THIS ASSERT WENT RED, CORRECTLY. It
       used to require THREE boxes on every run, because the whole desk was
       drawn so a proposal of nothing had something to show. That reason died
       when the picture was made to wait for a mapping, and what was left was
       reported: *"why 2 boxes when only 2 are connected"*. An unattached box is
       not neutral, it is the picture saying *this instrument was considered and
       left out*, which the model never said.
       ⚠️ THE OTHER HALF IS UNCHANGED AND IS THE ONE THAT MATTERS: the refused
       run still draws its arrow, and BOTH ITS ENDS. A picture showing only what
       passed would have been blank on the run this was reported from, while the
       readout beside it said `1 link, 1 refused`. */
````

<a id="wish-213"></a>
## wish-213: demo/wish/index.html, inline script, line 1975

````js
    /* 🔴 AND NOTHING AT ALL IS RENDERED ON THE EMPTY PATH, WHICH THIS LINE
       COULD NOT SEE AND A READER COULD. Reported 2026-09-21: *"Every arrow is a
       link the model asked for, and a refused one is marked rather than left
       out. - on empty diagram"*. `createDiagram` was still being called with no
       nodes and no links, so it drew a caption with nothing above it, and this
       assert read `0 boxes, 0 arrows` and passed, because **a count of the
       things you expected cannot see a thing you did not expect.** The third
       clause counts everything in the host instead. */
````

<a id="wish-214"></a>
## wish-214: demo/wish/index.html, inline script, line 1990

````js
    /* 🔴 THE ASYMMETRY, AND IT CHANGED SHAPE ON 2026-09-22 WITHOUT CHANGING
       MEANING. This used to read *an allowed one is not marked* and the whole
       weight of it sat on an allowed arrow carrying NOTHING, which is also what
       *"show all actual details of connection on the diagram not slop"* was
       reported about. An allowed arrow names what crosses it now.
       ⚠️ THE CLAIM THAT MATTERS IS UNCHANGED: a refused link and an allowed one
       must never read as each other. `refused` is a verdict and `note, cc,
       bend` is cargo, so the second clause is that the allowed run says neither
       nothing nor `refused`. */
````

<a id="wish-215"></a>
## wish-215: demo/wish/index.html, inline script, line 2004

````js
    /**
     * 🔴 AND IT IS RED, WHICH IS A SECOND CHANNEL RATHER THAN A REPLACEMENT.
     * Asked 2026-09-22 as *"when refused, paint recused conector/label red"*.
     * 🔴 THE COMPUTED VALUE, NEVER THE STYLESHEET. `positron-ui` records four
     * dead CSS rules found this way, one of them inert for as long as it
     * existed, and the reason is always the same: a rule that lost reads as
     * correct in the source. This reads what the browser decided.
     * ⚠️ AND IT GRADES THE ARROWHEAD SEPARATELY, because an SVG marker is
     * painted from its own fill and does NOT inherit the line's stroke. A red
     * line arriving at a grey head is the exact defect the four marker
     * declarations in `diagram.mjs` exist to prevent, and one CSS rule would
     * have looked like it covered it.
     * ⚠️ THE NEGATIVE HALF IS THE ALLOWED RUN: if everything were red, this
     * would pass while saying nothing.
     */
````

<a id="wish-216"></a>
## wish-216: demo/wish/index.html, inline script, line 2023

````js
      /* 🔴 THE LINK'S OWN `marker-end`, NEVER A SEARCH FOR THE RED MARKER.
         This read `.pos-dg-head-bad` anywhere in the picture on its first run
         and went red correctly on the ALLOWED case: all four arrowheads are
         declared in `<defs>` on every picture, so the red one is always
         present and finding it says nothing about whether any line uses it.
         **A count of a thing that is always there cannot see a thing that is
         sometimes used.** */
````

<a id="wish-217"></a>
## wish-217: demo/wish/index.html, inline script, line 2055

````js
    /**
     * 🔴 THE THIRD VERDICT, DRIVEN ON THE OBJECT A REAL MODEL RETURNED.
     * Asked 2026-09-22: *"perhaps a step model can return: not 'accepted' not
     * accepted but needs more info / input?"* ✅ MEASURED 2026-09-21: *"connect
     * the first rotary knob of evolution to the first rotary knob of circuit"*
     * came back as `{ op: 'cc', to: 1 }` with no `from`, and the page called it
     * refused. Nothing about it is refused. One number is absent and it is a
     * number a person at this desk knows.
     * 🔴 FOUR CLAIMS AT ONCE BECAUSE THEY ONLY WORK TOGETHER: it is counted
     * apart from both the allowed and the refused, it says so in its own word,
     * that word is in neither of the other two colours, and the picture asks
     * rather than refuses. Any one of them alone would pass on a page that had
     * renamed a refusal.
     * ⚠️ AND THE BOXES STAY SOLID, which is the distinction the picture was
     * asked to draw: the hardware is real and known, and only the connection's
     * detail is missing.
     */
````

<a id="wish-218"></a>
## wish-218: demo/wish/index.html, inline script, line 2078

````js
      /* 🔴 THE VERDICT IS AN ATTRIBUTE AND THE COLOUR IS THE ROW'S, since the
         word came off the sentence on 2026-09-22. This looked for a
         `.wish-why-q` span holding the word `incomplete` and read its ink, and
         neither exists any more: the row carries `data-verdict` and the
         stylesheet colours the row from it.
         ⚠️ AND THE REASON IS IN WORDS NOW, so the old `"from" is missing` test
         was looking for a field name the sentence deliberately no longer says.
         What it was protecting is that the reason names the thing that is
         missing, which it does, in instrument terms. */
````

<a id="wish-219"></a>
## wish-219: demo/wish/index.html, inline script, line 2104

````js
    /* ⚠️ THE NEGATIVE CONTROL, AND IT IS THE SAME TRANSFORM WITH THE NUMBER
       SUPPLIED. Without it the line above would pass on a page that had learned
       to call everything incomplete, and it is also the exact thing an action
       in the row's reserved column would do: 84 is the keyboard's first rotary
       knob, which is what a person turning it would tell the desk. */
````

<a id="wish-220"></a>
## wish-220: demo/wish/index.html, inline script, line 2115

````js
    /* 🔴 THE ROOM IS TAKEN BEFORE THE PICTURE ARRIVES, which is what *"reserve
       space for it"* asked for. The reservation is a CSS number, so this reads
       the COMPUTED value rather than the source: a rule that lost is a rule that
       reads as correct in a stylesheet.
       🔴 AND THE ROOM HAS TO ACTUALLY STAND, WHICH IS A SECOND QUESTION AND THE
       ONE THIS ASSERT USED TO MISS. `min-height` reads its number whatever the
       box is doing, so a reserved room and a collapsed one look identical to
       it. MEASURED 2026-09-21: the empty host was **0 px, `display: none`**,
       beaten by `.pos-stack > div:empty` in `shell.css` at (0,2,1), so the log
       moved on every answer while this line read green. The empty height is a
       clause now, not a remark.
       🔴 AND THE ROOM IS THE CONTENT BOX, NOT THE `min-height`. `box-sizing` is
       `border-box` project-wide, so any padding on the host would be inside its
       `min-height` and comparing a figure against that number would grade the
       picture against a box that is partly air. The padding comes off before
       the comparison and the detail line prints both, so nobody has to
       re-derive which is which. It is 0 now that the host is a cell of a
       connection row and the padding belongs to the row.
       🔴 AND THE HOST IS THE FIRST ROW'S, WHICH IS EVERY ROW'S: they are cells
       of one grid column with one rule on them, and `figH` and `hostH` take the
       TALLEST of whatever is on screen, so a second row that grew would be the
       number this reads. */
````

<a id="wish-221"></a>
## wish-221: demo/wish/index.html, inline script, line 2147

````js
      /* 🔴 AND THE DRAWER IS STILL LAYING THE PICTURE OUT IN A ROW, WHICH IS
         THE CLAUSE THE ACTION COLUMN PUT HERE. `diagram.mjs` stacks a picture
         into one tall column when its host drops under 560 px, so widening the
         reserved column past what is left would double the height of every
         connection and no other clause in this check would say so. */
````

<a id="wish-222"></a>
## wish-222: demo/wish/index.html, inline script, line 2160

````js
    /* ── the only feedback the control has left ────────────────────────────
       🔴 THE BUTTON CARRIES NOTHING OF ITS OWN, so the paint IS the signal and
       it is worth grading. A dot was asked for and withdrawn the same day, and
       what replaced it is nothing, which makes this the one channel a person
       holding the button has. The negative half is in the same line: it must
       not be lit before anybody has touched it. */
````

<a id="wish-223"></a>
## wish-223: demo/wish/index.html, inline script, line 2171

````js
    /* 🔴 BOTH PICKERS SAY `model`, AND THAT IS THE THIRD LABEL THIS ROW HAS
       WORN. It was `think` until 2026-09-21, which named a mechanism in this
       project's own vocabulary; then `hear` and `patch`, which name the STEP;
       and now `model`, which names what the row actually chooses. Asked for one
       block at a time. What `hear` and `patch` carried did not vanish, it moved
       to the button on the left of the same header, where it is a verb somebody
       presses rather than a noun over a list of model names.
       ⚠️ READ OFF THE DOM RATHER THAN OFF THE CONSTANTS, or the check would
       agree with itself. */
````

<a id="wish-224"></a>
## wish-224: demo/wish/index.html, inline script, line 2188

````js
    /**
     * 🔴 A NICKNAME ON THE BUTTON AND THE WHOLE TRUTH ON THE HOVER. Asked
     * 2026-09-22: *"give me full names of models with prices as model (browser
     * std tooltip) on hover"*. `70B` is the right label on a button and says
     * nothing about which model ran or what asking it costs.
     * ⚠️ THE UNITS ARE PART OF THE CLAIM AND ARE GRADED AS ONE. An audio minute
     * and a million tokens are not comparable quantities, so a tooltip reading
     * `$0.293` would be a number with no unit in a place a reader trusts. Five
     * rows say `per M input tokens` and two say `per audio minute`, which is
     * the split between the two things this page asks.
     * 🔴 AND THE ONE MODEL WITH NO PUBLISHED PRICE SAYS SO IN WORDS, WHICH IS
     * THE CLAUSE WORTH MOST. `whisper-tiny-en` is absent from Cloudflare's
     * audio pricing table and has no Unit Pricing row of its own, and a
     * plausible interpolated number in that slot is exactly the kind of
     * confident sentence this project keeps paying for. If somebody ever fills
     * it in with a guess, this line goes red.
     * ⚠️ READ OFF THE BUTTONS, NEVER OFF `PRICE`, or the check would agree with
     * itself about a tooltip that never reached the DOM.
     */
````

<a id="wish-225"></a>
## wish-225: demo/wish/index.html, inline script, line 2220

````js
    /**
     * 🔴 THE TWO HEADERS, MEASURED OFF REAL RECTS. An action on the left and its
     * model on the right, in both blocks, which is what was asked for one block
     * at a time. `append` order is not layout and a stylesheet can reverse a row.
     * 🔴 AND THE MOVED BUTTONS ARE THE HALF THAT NEEDS SAYING OUT LOUD: they are
     * no longer in `.pos-controls`, so the harness does not press them, and the
     * checks on this page are driven from the page for exactly that reason. This
     * asserts they are where the page put them.
     */
````

<a id="wish-226"></a>
## wish-226: demo/wish/index.html, inline script, line 2242

````js
    /**
     * 🔴 THE HEAR PICKER IS DIRECTLY ABOVE THE BOX IT FILLS. Asked as *"but
     * think controls before json"*, and the whole of it is document order, so it
     * is read as document order rather than as a pair of coordinates: nothing on
     * this page is positioned, so the DOM answers the question a rect would only
     * imply.
     * 🔴 AND IT ASKS ABOUT THE PICKER, NOT ABOUT THE ROW AROUND IT, WHICH THE
     * FIRST BUILD OF THIS LINE GOT WRONG. It compared the two `.pos-crow`
     * wrappers' indices, and putting both pickers back in the top row left the
     * second wrapper standing empty in the same slot, so the sabotage that
     * undoes exactly what was asked for read **green**. A check on the
     * container of a thing is not a check on the thing.
     * 🔴 THE PATCH HALF LEFT THIS LINE 2026-09-21 AND IS ASSERTED BELOW OFF REAL
     * RECTS. It read `holds(patch, patchPick)`, which is false now and correctly
     * so: *"in top is patch list visualizer, below is diagram and dump is
     * below"* puts the picture between that picker and the JSON. The negative
     * clause stays here, because *the patch picker is not the thing labelling
     * the transcript* is still the confusion this line exists to catch.
     */
````

<a id="wish-227"></a>
## wish-227: demo/wish/index.html, inline script, line 2270

````js
    /**
     * 🔴 ONE COMPONENT, THREE PARTS, IN THAT ORDER, MEASURED OFF RECTS. Asked
     * 2026-09-21: *"make it a single component, 3 parts, glued. in top is patch
     * list visualizer, below is diagram and dump is below"*.
     * 🔴 APPENDING IN AN ORDER IS NOT LAYOUT, WHICH IS WHY THIS READS BOXES AND
     * NOT `children`. `/twelve/` was corrected by screenshot twelve times in one
     * evening and every one was plausible reasoning a rect would have refused.
     * The DOM answers *what did the author write*; the rect answers *what did
     * the browser do with it*, and a glue is a flex column whose order a single
     * `order` or `flex-direction` could reverse without moving a line of this
     * page.
     * ⚠️ AND THE GLUE ITSELF IS A CLAUSE. Three parts in document order inside
     * three separate blocks would satisfy every inequality below and be exactly
     * the arrangement that was asked to go away, so the first clause is that one
     * element holds all three and that it is `.pos-glue`.
     */
````

<a id="wish-228"></a>
## wish-228: demo/wish/index.html, inline script, line 2286

````js
    /**
     * ⚠️ THE PART, NOT THE HEADER ROW. Since the verdict moved under the header
     * the top part is a `.wish-part` holding a `.wish-head` and the
     * allowed/refused line, so a check reading the ROW measures a box that ends
     * 11 px above where the part does and reports an 11 px seam on a component
     * that is glued perfectly. MEASURED when exactly that happened.
     */
````

<a id="wish-229"></a>
## wish-229: demo/wish/index.html, inline script, line 2293

````js
    /**
     * ⚠️ AND THE MIDDLE PART IS A LIST SINCE 2026-09-22, WHICH IS WHY THIS READS
     * THE ROWS RATHER THAN ONE NAMED BOX. There is one part per connection and
     * a single empty one when there is nothing to show, so what has to be true
     * is that every one of them sits inside the glue, under the header and over
     * the object, in that order and with none of them overlapping.
     */
````

<a id="wish-230"></a>
## wish-230: demo/wish/index.html, inline script, line 2305

````js
    /* 🔴 THE OBJECT BLOCK IS NO LONGER IN THE GLUE, SINCE 2026-09-22:
       *"disconnect these 2 panels"*. So this grades two claims that used to be
       one: the picker and the rows are ONE glued component in order, and the
       object is a SEPARATE surface under it with the page's own air between
       them rather than a shared border. The second half is the ask, and reading
       the gap is what tells a disconnected panel from one that merely lost its
       seam. */
````

<a id="wish-231"></a>
## wish-231: demo/wish/index.html, inline script, line 2328

````js
    /**
     * 🔴 AND WHAT SAYS WHERE A PART ENDS IS THE SEAM, WHICH IS THE WHOLE
     * QUESTION A THIRD PART ASKS. Inside a glue every child gives up its border
     * and its radius, so the picture is bounded above and below by 1 px of
     * `--line` and by nothing else. That only works while each part paints a
     * ground of its own: a transparent part lets the seam colour through its
     * whole area, and then there is no seam, there is a block of `--line` with
     * text on it.
     * ⚠️ THREE THINGS AT ONCE BECAUSE THEY ONLY WORK TOGETHER: the gaps between
     * the parts are 1 px rather than the page's 40 px rhythm, no part draws a
     * border of its own, and every part's ground is something other than the
     * seam colour. Drop any one and the other two are still true of a picture
     * nobody can read the edges of.
     * ⚠️ THE GROUND IS COMPARED AGAINST THE GLUE'S OWN BACKGROUND rather than
     * against a colour typed here, so the day `--line` or `--card` moves this
     * still asks the right question. Two values read from the page, never one
     * read and one remembered.
     */
````

<a id="wish-232"></a>
## wish-232: demo/wish/index.html, inline script, line 2347

````js
    // ⚠️ EVERY PART, READ OFF THE GLUE, rather than three named by hand. The
    // verdict became a fourth part on 2026-09-21 and a list typed here would
    // have gone on grading three of four without anything saying so.
````

<a id="wish-233"></a>
## wish-233: demo/wish/index.html, inline script, line 2354

````js
    /**
     * ⚠️ EVERY SEAM, WALKED OFF THE GLUE, rather than two computed between three
     * boxes named by hand. Those two were the header to the picture and the
     * picture to the object, which measured a 42 px gap the moment the verdict
     * became a part and stopped going away: a real distance between two real
     * boxes, with a third part in between that the arithmetic did not know
     * about. The layout was right and the ruler was counting the wrong pair.
     */
````

<a id="wish-234"></a>
## wish-234: demo/wish/index.html, inline script, line 2373

````js
    /**
     * 🔴 A CONNECTION KEEPS ITS ROOM WITH NOTHING IN IT, which is what
     * *"make this the minimal height even when no data"* asked for about the
     * verdict and is now the whole row's job. The test is not that it is tall:
     * it is that the component does not CHANGE HEIGHT between an answer of one
     * connection and no answer at all, because that is the thing a reader would
     * have seen move under the button they pressed.
     * 🔴 AND THE SENTENCE'S OWN ROOM IS THE SECOND CLAUSE, because it is two
     * lines on most answers and one on some: a refusal names its reason under
     * it and an allowed link names what the far end drops. A box sized by its
     * words would make the picture above it move between two answers that are
     * both perfectly ordinary.
     * ⚠️ IT EMPTIES AND REFILLS THE BOX IN ONE BLOCK WITH NO `await` IN IT, so
     * no frame can be drawn between and nobody watching the page sees it
     * flicker. Same argument `/kit/` makes about its own measuring window.
     * ⚠️ AND TWO CONNECTIONS ARE TALLER THAN ONE, WHICH IS NOT A DEFECT AND IS
     * NOT GRADED HERE. One row per connection is what was asked for, so a reply
     * with two of them takes two rows' room. What may not move is everything
     * that is on screen before the reply lands.
     */
````

<a id="wish-235"></a>
## wish-235: demo/wish/index.html, inline script, line 2414

````js
    /* ── one row per connection, and the one a reader chose ────────────────
       🔴 MEASURED ON THE ONE EXAMPLE THAT COMES BACK AS TWO CONNECTIONS,
       because a page that draws one row correctly says nothing about the thing
       this redesign was asked for: *"a reader cannot tell which picture belongs
       to which sentence when the model returns two"*. The keyboard split is two
       links between the same pair of ports, which is also the hardest case for
       the rows to tell apart. */
````

<a id="wish-236"></a>
## wish-236: demo/wish/index.html, inline script, line 2422

````js
      /**
       * 🔴 TWO CONNECTIONS BETWEEN DIFFERENT PAIRS, AND THIS ONE IS
       * CONSTRUCTED RATHER THAN MEASURED, WHICH IS WHY IT SAYS SO. The two link
       * reply this desk really produced is the keyboard split, and both of its
       * links run between the same two ports with the same refusal under them,
       * so its two rows are expected to read alike and it can say nothing about
       * a reader telling one picture from another. That is the defect this
       * redesign was asked about, so the check builds the shape it is about:
       * two instruments reaching one, one row each.
       * ⚠️ THE SPLIT IS NOT DROPPED. It is driven in the examples table below,
       * where its two rows and its two arrows are counted.
       */
````

<a id="wish-237"></a>
## wish-237: demo/wish/index.html, inline script, line 2447

````js
        /* ⚠️ THE VERDICT IS AN ATTRIBUTE, NOT THE SENTENCE'S FIRST WORD. It
           came off the words on 2026-09-22, *"rm refused text, its already on
           connetor"*, so a row is read by `data-verdict` and the sentence
           carries what only it can: which connection this is. */
````

<a id="wish-238"></a>
## wish-238: demo/wish/index.html, inline script, line 2453

````js
        /* ⚠️ AND THE TWO SENTENCES ARE DIFFERENT, AND SO ARE THE TWO PICTURES,
           which is the pair of clauses that cannot be satisfied by drawing one
           answer twice. One row names the keyboard and the other the Model 12,
           in the words and in the boxes. */
````

<a id="wish-239"></a>
## wish-239: demo/wish/index.html, inline script, line 2464

````js
      /* 🔴 THE OBJECT BLOCK FOLLOWS THE ROW A READER PRESSED, AND SHOWS THAT
         ONE ALONE. *"it will show just one connection json at time"*. The two
         objects here differ in one field, so an assert that the box CHANGED is
         also an assert that it changed to the right one. */
````

<a id="wish-240"></a>
## wish-240: demo/wish/index.html, inline script, line 2480

````js
      /**
       * 🔴 THE MARK IS THE TABLE'S OWN, COMPARED AGAINST A REAL TABLE ROW
       * RATHER THAN AGAINST TWO VALUES TYPED HERE. Asked as *"left yellow
       * border and slihjt bg change as in table"*. This page declares those two
       * properties itself, because `.pos-tbl-row` carries a table's grid and
       * padding with it and a page pulling that class onto something that is
       * not a table row would be reaching into a component's insides. What
       * makes the copy safe is this line: the example table is marked, and the
       * computed shadow and ground of its lit row are compared against the
       * chosen connection's, so the day `shell.css` moves either one this page
       * goes red instead of drifting.
       * ⚠️ AND THE NEGATIVE HALF IS THE ROW BESIDE IT, or a page that marked
       * everything would pass.
       */
````

<a id="wish-241"></a>
## wish-241: demo/wish/index.html, inline script, line 2502

````js
        /* ⚠️ AND THE BAR IS ASSERTED ABSENT RATHER THAN SIMPLY NOT CHECKED.
           It was removed on a report that it is excessive at this size, so a
           day when somebody re-adds it by copying a table rule should be a red
           run rather than a silent return. */
````

<a id="wish-242"></a>
## wish-242: demo/wish/index.html, inline script, line 2511

````js
      /**
       * 🔴 ONE TAB STOP FOR THE LIST, NOT ONE PER ROW, WHICH IS
       * `table.mjs`'S RULE AND IS ON THIS PAGE ALREADY. `positron-ui` records
       * what the other shape cost: tabbing past a 63 row table took sixty-three
       * presses. It is invisible in a screenshot and free to read off the DOM,
       * so both halves are asserted, the one at 0 and every other at -1.
       * ⚠️ AND AN ARROW MOVES WITHOUT CHOOSING, WHICH IS THE OTHER HALF OF THE
       * SAME CONVENTION. Choosing here is free, so the reason is consistency
       * rather than cost: a table on this same page moves on an arrow and opens
       * on Enter, and two keyboard conventions in one component is worse than
       * either of them.
       */
````

<a id="wish-243"></a>
## wish-243: demo/wish/index.html, inline script, line 2543

````js
      /**
       * 🔴 THE ACTION COLUMN IS RESERVED FROM THE FIRST PAINT, AND THE CLAIM
       * GREW A HALF ON 2026-09-25 WHEN SOMETHING FINALLY MOVED INTO IT. It used
       * to be that the column takes its width with NOTHING in it, which was the
       * whole of *"reserve right side of diagram+allowed to action buttons
       * etc"*. What has to hold now is that filling it moved nothing:
       * everything the actions take comes off the picture, and `diagram.mjs`
       * stacks the entire figure into one tall column the moment what is left
       * drops under 560 px.
       * ⚠️ SO THE CONTROLS ARE MEASURED AGAINST THE COLUMN RATHER THAN STYLED
       * AND LOOKED AT. The widest of them against `--wish-act`, every one of
       * their right edges against the column's, and the column's own width
       * against what it was asked for. A fixed grid track cannot be pushed
       * wider by what is in it, so the failure this catches is the other one: a
       * control that overflows and lies across the picture while every width in
       * the stylesheet still reads correct.
       * ⚠️ AND THE COUNT IS A CLAUSE SINCE 2026-09-28, WHICH IS THE DAY THE
       * SWITCH LEFT. *"rm on button on wish, just keep x button"*: one control,
       * and the clause is what would catch a later edit putting a second one
       * back beside it rather than under it, which is the arrangement that does
       * not fit in 72 px and was measured not fitting on 2026-09-25.
       * ⚠️ AND THE COLUMN IS STILL THE SAME WIDTH WITH ONE CONTROL IN IT, which
       * is the reserved-room claim read from the other side: a column that
       * narrowed when a control left would move the picture exactly as one that
       * widened.
       * ⚠️ THE SQUARE IS A CLAUSE FOR THE SAME REASON, AND IT WAS ADDED AFTER
       * MEASURING THAT NOTHING CAUGHT IT. `shell.css`'s `[data-glyph]` rule is
       * scoped to `.pos-controls`, so this page carries its own copy; taking
       * that copy away lays the button out at 45.8 px, which still fits the
       * column and so passed every clause above it. A page-local copy of a
       * shared rule that nothing grades is a copy that drifts.
       * ⚠️ THE ROW WITH NO ANSWER IN IT IS MEASURED TOO, because *from the first
       * paint* is a claim about the state nobody has pressed anything in, and
       * that row holds no controls at all.
       */
````

<a id="wish-244"></a>
## wish-244: demo/wish/index.html, inline script, line 2603

````js
    /**
     * 🔴 AND THE LEFT EDGE IS THE HALF THE RESERVED COLUMN COULD NOT FIX.
     * Asked as *"align diagram to left?"*. `placeRow` centres, so reserving the
     * column moved where the space ENDS and said nothing about where the
     * drawing sits inside it: every figure stood about 70 px in from each side
     * of whatever was left, and **two rows with different box counts started at
     * two different x**. `diagram.mjs` took an `align` option on 2026-09-22 and
     * this page is its one caller.
     * ⚠️ THE CLAIM IS AGREEMENT ACROSS ROWS, NOT A NUMBER. A figure at a typed
     * x would pass while being wrong the first time a box got wider, and this
     * page draws a different number of boxes per row by design.
     * ⚠️ AND IT NEEDS TWO ROWS WITH DIFFERENT CONTENT TO MEAN ANYTHING, which
     * is why it runs on the split: one link and two are the case that was
     * broken.
     */
````

<a id="wish-245"></a>
## wish-245: demo/wish/index.html, inline script, line 2627

````js
      /* ⚠️ THE LEFTMOST BOX, NOT THE FIRST IN THE DOM. They are different
         elements: a figure paints its boxes in node order, and the node order
         is the caller's, so `querySelector` returned row two's DESTINATION and
         the check read a 248 px spread on a figure that was correct in one of
         the two rows. Measure the quantity in question. */
````

<a id="wish-246"></a>
## wish-246: demo/wish/index.html, inline script, line 2645

````js
    /**
     * 🔴 THE OBJECT BLOCK KEEPS ONE HEIGHT WHATEVER IS IN IT. Asked as
     * *"reserve its hight"*, and the reason is the one `grain-scope` bought: a
     * box that is 7 lines for one connection and 16 for the next moves the log
     * and the end of the page every time a row is pressed.
     * ⚠️ THE TALLEST CASE IS THE NEGATIVE CONTROL AND IT HAS TO SCROLL. A
     * reservation that everything fitted inside would pass this line while
     * saying nothing, and a clip would hide the argument a refusal names, which
     * can be on any line of the object.
     */
````

<a id="wish-247"></a>
## wish-247: demo/wish/index.html, inline script, line 2673

````js
    /**
     * 🔴 THE SENTENCE IS THERE WHEN NOBODY IS READING THE PICTURE, which is
     * the one clause of the ask that was ambiguous: *"allowed: Mk... (show when
     * no iteraction with diagram)"*. What is built is the reading where the
     * two share the space: `createDiagram` writes a box's or an arrow's own
     * note into its caption on hover and marks it `data-on`, and the row's
     * sentence stands down while that is up. The other reading, that the
     * sentence goes for good once a reader touches the picture, is not built,
     * because a verdict that disappears permanently is a fact the page has
     * stopped reporting.
     * ⚠️ IT IS DRIVEN WITH A REAL `pointerenter` ON THE BOX, and the caption's
     * own attribute is read as well, or this would pass on a page where nothing
     * happened at all.
     * ⚠️ AND THE ROOM IS THE OTHER HALF. `visibility` rather than `display`, so
     * the line keeps its height and reading the picture cannot move the row the
     * picture is in.
     */
````

<a id="wish-248"></a>
## wish-248: demo/wish/index.html, inline script, line 2695

````js
      /**
       * 🔴 ONE ELEMENT WITH TWO CONTENTS, NOT TWO TAKING TURNS. This graded a
       * second line standing down under `visibility` while the caption was up,
       * which is what the page did for a few hours. Asked for on 2026-09-22:
       * *"do not put refused etc below diagram text, it is a default text when
       * no interacton"*, and the sentence BECAME the caption, so there is no
       * second element left to hide.
       * ✅ **WHAT IT WAS PROTECTING IS UNCHANGED AND IS WHAT THIS READS NOW**:
       * pointing at a box swaps the line to that box's own words, leaving takes
       * it back to the verdict, and the row does not change height while either
       * happens. That last clause is the one that matters, because a line that
       * grew under a pointer would move the picture the pointer is on.
       */
````

<a id="wish-249"></a>
## wish-249: demo/wish/index.html, inline script, line 2730

````js
    /**
     * 🔴 THE MODEL IS TOLD WHAT THIS ROOM CALLS EACH INSTRUMENT, AND THAT IS
     * THIS PAGE'S HALF OF IT. Reported 2026-09-21 with a screenshot: *"connect
     * evolution to circuit"* answered *the model proposed nothing*, which was
     * the right answer to a prompt that had never heard the word. The rendering
     * is the Worker's job and `node workers/wish/src/wish-test.mjs` grades it;
     * what a browser can see is that the words leave here at all.
     * ⚠️ AND THE IDS ARE UNTOUCHED, which is the second clause. `from` and `to`
     * are an `enum` of exactly these, so a nickname leaking into the list the
     * model must choose from would be an invention arriving by invitation.
     */
````

<a id="wish-250"></a>
## wish-250: demo/wish/index.html, inline script, line 2751

````js
    /* ── the hold ──────────────────────────────────────────────────────────
       🔴 DRIVEN WITH REAL POINTER EVENTS, which is the half a `.click()`
       cannot reach and the half that gets a phone stuck. No microphone is
       opened by any of it: `begin()` does the gesture's own bookkeeping and
       stops at its `SELFCHECK` line, so what is graded here is the wiring and
       the arithmetic rather than a recording. */
````

<a id="wish-251"></a>
## wish-251: demo/wish/index.html, inline script, line 2467

````js
    /* ⚠️ THE SHELL DISABLES A CONTROL WHILE ITS HANDLER IS PENDING, AND THIS
       CHECK IS THAT HANDLER. A disabled button receives no pointer events at
       all, so the presses below would land on nothing and three asserts would
       quietly measure a page nobody had touched. */
````

<a id="wish-252"></a>
## wish-252: demo/wish/index.html, inline script, line 2476

````js
    /* 🔴 THE ANSWER AND THE QUESTION ARE PUT UP FIRST AND THE PRESS HAS TO TAKE
       BOTH AWAY. Asked as *"hold to talk should clear previous input /
       routing"*, and the clear has to happen on the PRESS: clearing when the
       reply lands leaves exactly the window that causes the problem, which is
       the recording plus both model calls. */
````

<a id="wish-253"></a>
## wish-253: demo/wish/index.html, inline script, line 2492

````js
    /* 🔴 THE PAINT IS THE WHOLE OF THIS CONTROL'S OWN FEEDBACK, so the press had
       better light it. Both halves in one line: dark before anybody touches it,
       lit from the press. What it cannot say is whether the microphone can hear
       anything, which is the gap the withdrawn dot leaves. */
````

<a id="wish-254"></a>
## wish-254: demo/wish/index.html, inline script, line 2502

````js
      /* ⚠️ AND THE ROOM A CONNECTION TAKES IS STILL THERE, which is the half a
         count of nothing cannot see: the press empties the rows, it does not
         take them away, or the component would shrink under the hand that
         pressed it and grow again when the answer landed. */
````

<a id="wish-255"></a>
## wish-255: demo/wish/index.html, inline script, line 2529

````js
    /* Holding a button on an iPhone raises the text loupe and drops selection
       handles over the page, and this is the one control here that is held.
       The COMPUTED value, because a rule that lost is a rule that reads as
       correct in the source.
       ⚠️ **AND ONE THIRD OF IT CANNOT BE MEASURED IN THE BROWSER THAT RUNS THIS
       CHECK.** MEASURED 2026-09-21: desktop Chrome computes
       `-webkit-touch-callout` as the empty string, so grading it there took
       this assert red about a page where nothing is wrong. A probe that could
       not answer reads as `unknown` and never blocks, the same rule
       `caps.mjs` works to, and the detail line says which of the three were
       actually read. */
````

<a id="wish-256"></a>
## wish-256: demo/wish/index.html, inline script, line 2548

````js
    /* 🔴 THE EXAMPLES DRILL SITS HERE AND NOT WHERE THE ONE BUTTON'S ASSERT
       USED TO, AND THE REASON IS THE SAME ONE THE SHIMMER DRILL BELOW ALREADY
       CARRIES. Five rows cannot be pressed without awaiting between them, and
       the shell paints `data-busy` on the `speak` button the moment this
       handler first yields, so an await above the press drill takes
       `busy before true` and a check fails because of the check above it rather
       than because of the page. MEASURED 2026-09-22: it did, on the first run
       after the table landed. Every await in this function belongs below the
       line that reads `speakBtn.dataset.busy`.
       ⚠️ AND THE LAST ROW IS PRESSED AND LEFT PENDING, which is what the
       shimmer drill's opening wait is for. */
````

<a id="wish-257"></a>
## wish-257: demo/wish/index.html, inline script, line 2559

````js
    /* ── the five examples, which cost nothing ────────────────────────────
       🔴 EVERY ROW IS PRESSED FOR REAL, because `post` is gated and none of
       them reaches Cloudflare. A row is a `<button>` by role and `onPick` is
       what a finger reaches, so `.click()` on the row element is the same path
       a person takes rather than a function called around the table.
       🔴 AND THE ROWS ARE READ OFF THE BODY, NEVER OFF THE COMPONENT. The
       heading IS a `.pos-tbl-row` (it is `pos-tbl-row pos-tbl-head`) and it
       comes first, so a query on the element answers the heading and an assert
       about a row measures a column name. `scroller()` is the body. */
````

<a id="wish-258"></a>
## wish-258: demo/wish/index.html, inline script, line 2578

````js
    /**
     * 🔴 THE TABLE REPORTS WHAT DID NOT FIT, THE WAY THE PICTURE DOES, AND IT
     * IS THE AUTHOR WHO IS TOLD. A heading that wraps is not a typography
     * problem, it is the table saying its column list is too heavy for the
     * page, and it says it in the one place a reader can do nothing about it.
     * PHOTOGRAPHED on `/making/` with `FILE` set one letter per line beside an
     * empty cell, on a page reading 38 of 38 green.
     * ⚠️ `measured` IS A CLAUSE RATHER THAN A DETAIL. A table with no layout
     * answers no cuts, which would read as a clean table, so the check has to
     * require that anything was looked at. Same rule as `caps.mjs`: a probe
     * that could not answer must never read as a pass.
     */
````

<a id="wish-259"></a>
## wish-259: demo/wish/index.html, inline script, line 2598

````js
    /**
     * 🔴 FIVE ROWS, FIVE ANSWERS, AND THE POINT IS THAT THEY ARE DIFFERENT.
     * One line per row, compared as ONE STRING against what each example is
     * for, so a row that quietly starts behaving like its neighbour cannot pass
     * by satisfying a count.
     * ⚠️ THE VERDICTS ARE READ OFF THE PAGE rather than off `grade`'s return
     * value, because what is being graded is what a reader is shown. Two
     * numbers derived from one field agree with each other whatever is wrong,
     * which this project has already paid for on the MIM corpus.
     */
````

<a id="wish-260"></a>
## wish-260: demo/wish/index.html, inline script, line 2608

````js
    /**
     * 🔴 THE VERDICT IS AN ATTRIBUTE, NOT A WORD IN THE SENTENCE, SINCE
     * 2026-09-22. This read `<i>` for allowed and `.wish-why-q` for incomplete
     * out of the row's own markup, and both of those went when the verdict word
     * came off the sentence: *"rm refused text, its already on connetor"*. The
     * sentence is the figure's caption now, which is plain text with no
     * elements in it at all.
     * 🔴 **AND THE FAILURE WAS THE WORST SHAPE THERE IS**: every row fell
     * through to the last branch, so five examples that were allowed came back
     * **refused**, in a check whose own name is about telling them apart. A
     * reader of that output would have gone looking for a broken validator.
     * ✅ `data-verdict` is written by `show()` for exactly this, and the
     * component that draws the sentence cannot affect it.
     */
````

<a id="wish-261"></a>
## wish-261: demo/wish/index.html, inline script, line 2632

````js
        /* ⚠️ THE THIRD VERDICT IS COUNTED HERE TOO, SINCE 2026-09-22, OR A ROW
           THAT BECAME INCOMPLETE WOULD BE COUNTED BY NEITHER HALF OF THIS LINE
           AND THE STRING WOULD GO ON MATCHING. None of the five is incomplete
           today, which is what the zero says and is a fact worth keeping an eye
           on rather than an omission. */
````

<a id="wish-262"></a>
## wish-262: demo/wish/index.html, inline script, line 2652

````js
        /* 🔴 TWO ARROWS SINCE 2026-09-22, AND IT WAS ONE UNTIL THEN. The split
           is two links between one pair of ports, which `arrowsFor` drew as a
           single arrow because two lines down one gap read as one. A connection
           is a row with its own picture now, so there is no gap for them to
           share and each one is drawn whole. */
````

<a id="wish-263"></a>
## wish-263: demo/wish/index.html, inline script, line 2663

````js
    /**
     * 🔴 THE DETAILS THE PICTURE DID NOT CARRY UNTIL 2026-09-22, MEASURED ON
     * THE ROW THEY MATTER MOST ON. Reported with a screenshot of a bare arrow:
     * *"show all actual details of connection on the diagram not slop"*. The
     * example is the Model 12 one, because that instrument has four ports, two
     * of them look right and only one carries its buttons, and a picture
     * drawing both as `Model 12` can never say which was chosen.
     * ⚠️ `:not([aria-hidden])` FOR THE SAME REASON THE LINK LABELS NEED IT:
     * `createDiagram` measures its own text with a ruler carrying the same
     * class, parked off to one side, so a plain query answers one more than the
     * picture has.
     */
````

<a id="wish-264"></a>
## wish-264: demo/wish/index.html, inline script, line 2682

````js
      /* ⚠️ WHAT IS UNDER THE BOXES, NOT IN WHAT ORDER. The picture draws them
         in `INSTRUMENTS` order and which end of an arrow comes first is the
         drawer's business, so an ordered comparison here would be an assert
         about a constant's line order wearing a claim about a picture. */
````

<a id="wish-265"></a>
## wish-265: demo/wish/index.html, inline script, line 2692

````js
    /* 🔴 AND A LINK THAT PASSES IS NOT SILENTLY COMPLETE. `allowed` on its own
       reads as *all of it will happen*, and on this desk it never is: a MIDI
       port emits six classes and the Circuit consents to three. The validator
       has said so on every allowed link since it was written and the page threw
       it away until 2026-09-22. */
````

<a id="wish-266"></a>
## wish-266: demo/wish/index.html, inline script, line 2702

````js
    /**
     * 🔴 A PREPARED ROW PRESSES `Interpret`, SO THE BUTTON SAYS IT IS
     * WORKING. Asked 2026-09-22: *"wish: when i click to prepared ask,
     * interpret button should disable and shimmer"*. A row used to call the
     * model itself and the button sat there looking idle.
     * ⚠️ NONE OF THAT STATE IS THIS PAGE'S. `shell.mjs` paints `data-busy`,
     * disables the control and sets `aria-busy` whenever a handler returns a
     * promise, and clears all three in a `finally`, so what is graded here is
     * that the press reaches that one implementation rather than that this page
     * reproduced it.
     * 🔴 AND THE FAILURE WORTH CATCHING IS THE STATE THAT NEVER CLEARS, so the
     * line reads both ends: nothing lit before, all three up during, all three
     * gone once the answer has landed.
     * ⚠️ THE SECOND PRESS IS THE OTHER HALF. A disabled button swallows it, so
     * no second run can start; what this page had to add is that a refused
     * press marks no row and writes no sentence into the box, or a row would
     * look chosen while the answer on screen belonged to another one.
     */
````

<a id="wish-267"></a>
## wish-267: demo/wish/index.html, inline script, line 2740

````js
    /* ⚠️ AND THE LAST PRESS IS LEFT PENDING ON PURPOSE. The shimmer drill below
       opens by waiting a whole turn for everything already in flight to land,
       which is the first moment of that drill rather than a setup line, and it
       needs something to have been in flight. */
````

<a id="wish-268"></a>
## wish-268: demo/wish/index.html, inline script, line 2746

````js
    /* ── the shimmer, at every moment of the flow it belongs to ────────────
       🔴 IT SITS HERE AND NOT HIGHER UP, FOR THE REASON THE LAST BLOCK OF THIS
       CHECK ALREADY CARRIES: the check runs synchronously inside the `speak`
       handler, so the shell has not yet painted `data-busy` on that button, and
       the FIRST `await` in this function is the moment it does. An await above
       the press drill takes `busy before true`, which is a check failing
       because of the check above it. Every press below therefore happens before
       the await, while the button is still enabled.
       🔴 AND IT IS SIX MOMENTS OF ONE BEHAVIOUR RATHER THAN SIX CLAIMS. *"a
       shimmer only while thinking"* has a negative half in every one of them: a
       check that looked only at a model working would pass a page that also
       shimmered while a microphone was open, which is the state that was asked
       to stop. */
````

<a id="wish-269"></a>
## wish-269: demo/wish/index.html, inline script, line 2759

````js
    /**
     * Which surfaces say they are waiting, in words, so one string can be
     * compared against a whole flow rather than booleans against moments.
     * ⚠️ IT READS THE DOM AND NEVER `waitFor`'s OWN ARGUMENT. A check that read
     * the stage back would agree with itself whatever the paint was doing,
     * which is the two-numbers-derived-from-one-field trap this project has
     * already paid for on the MIM corpus.
     * ⚠️ AND IT KEEPS READING THE PICKERS, WHICH ARE EXPECTED NEVER TO APPEAR.
     * *"don't animate the model radios"*: the guard for a thing that was
     * removed is to go on looking for it, and `choice.mjs` still has the
     * `pending()` that would put it back.
     */
````

<a id="wish-270"></a>
## wish-270: demo/wish/index.html, inline script, line 2778

````js
    /* 🔴 EVERYTHING ALREADY IN FLIGHT HAS TO LAND BEFORE THIS DRILL STARTS, AND
       FINDING THAT OUT IS THE FIRST MOMENT OF THE DRILL RATHER THAN A SETUP
       LINE. The last example row above is pressed and deliberately not
       awaited, so its proposal is still pending at this point in a synchronous
       check and its paint would be read as this drill's own. A `setTimeout` rather than a
       microtask, because a proposal is several ticks deep and one
       `Promise.resolve()` only buys one of them. What it then measures is that
       a finished proposal leaves NOTHING shimmering. */
````

<a id="wish-271"></a>
## wish-271: demo/wish/index.html, inline script, line 2790

````js
    /* 🔴 THE NEGATIVE MOMENT, AND IT IS THE WHOLE OF THE NARROWING. An open
       microphone is the page waiting for a PERSON, so nothing shimmers. The
       first build of this feature painted from here and it was asked to stop. */
````

<a id="wish-272"></a>
## wish-272: demo/wish/index.html, inline script, line 2796

````js
    /**
     * 🔴 THE WHOLE RELEASE, DRIVEN THROUGH THE REAL FUNCTION AND COSTING
     * NOTHING. `finish()` is what a stopped recording calls, and until `/hear`
     * was gated it could not be reached under a harness at all: `begin()` opens
     * no microphone, so nothing ever called this and the auto-ask was graded by
     * nothing. `chunks` is empty, so the blob is 0 bytes and the log says so,
     * which is honest for a check.
     * ⚠️ IT IS SAMPLED BEFORE THE AWAIT because `waitFor('hear')` is the last
     * thing `finish()` does synchronously. A state that only exists between two
     * awaits cannot be sampled at all, which is why that line sits where it
     * does rather than beside the `post`.
     */
````

<a id="wish-273"></a>
## wish-273: demo/wish/index.html, inline script, line 2813

````js
    /**
     * 🔴 THE RELEASE ASKED BY ITSELF, AND NOTHING GRADED THAT UNTIL NOW. Asked
     * 2026-09-21: *"then auto-ask after it and show json"*, and again as
     * *"remove the Ask button, auto-ask after transcription"*. One call, and
     * both models ran: the transcription is in the box a person can correct and
     * the object is in the box under the patch picker, with no second press.
     * ⚠️ THE TRANSCRIPTION IS NOT THE EXAMPLE SENTENCE, on purpose, so this
     * cannot pass on a constant a button wrote a moment earlier. `begin()`
     * emptied the box on the press above.
     * ⚠️ AND THE PARSE IS GUARDED. An assert that throws does not go red, it
     * goes missing, and it takes the rest of this check with it.
     */
````

<a id="wish-274"></a>
## wish-274: demo/wish/index.html, inline script, line 2828

````js
      /* `[0]` since 2026-09-22: the box is a JSON ARRAY now, one entry per
         link, and an array even when there is one. */
````

<a id="wish-275"></a>
## wish-275: demo/wish/index.html, inline script, line 2849

````js
    /**
     * 🔴 A NAME THE SPEECH MODEL MANGLED IS REPAIRED BEFORE THE PATCH MODEL
     * READS IT, AND THIS IS THE FIRST PAGE TO CALL THAT LOOKUP AT ALL. It had
     * 32 asserts and 144 measured transcripts behind it and no caller, which
     * `HANDOFF.md` recorded as open. The two transcripts below are real replies
     * from those two models, and the picker is pressed the way a person would
     * press it rather than reached around.
     * ⚠️ **THE NEGATIVE CONTROL IS THE ASSERT ABOVE**, which drove `turbo` and
     * found `CANNED_HEARD` in the box unchanged. A repair that fired on a
     * correct hearing would take it red, so the two halves are graded and
     * neither can pass alone.
     * ⚠️ AND THE SECOND ONE IS THE HALF THAT KEEPS THIS FROM BEING A SILENT
     * REWRITE. The words that were there before are read back off the LOG, not
     * off the constant, because what has to exist is the sentence a person
     * reads.
     */
````

<a id="wish-276"></a>
## wish-276: demo/wish/index.html, inline script, line 2869

````js
        /**
         * 🔴 `taskham` WAS A REPAIR AND IS AN AMBIGUITY SINCE 2026-09-21, AND
         * THE PAGE IS RIGHT TO REFUSE IT. Adding the Model 12's DAW Control
         * pair to `PORTS` gave this desk TWO things a mangled `TASCAM` could
         * mean, `TASCAM Model 12` and `TASCAM Model 12 DAW control`, and
         * `reword()` never picks between two instruments on one span. So the
         * expectation is the sentence UNCHANGED, and the log line saying why.
         * ⚠️ THIS IS THE ASSERT DOING ITS JOB RATHER THAN BREAKING. It went red
         * the moment the desk grew a fourth port, which is exactly when a check
         * about naming things on this desk SHOULD go red, and the page's
         * behaviour never changed.
         */
````

<a id="wish-277"></a>
## wish-277: demo/wish/index.html, inline script, line 2899

````js
      /**
       * 🔴 AND A NAME THIS DESK DOES NOT HAVE IS REPORTED, NEVER SUBSTITUTED.
       * `demo/shell/instruments.mjs` describes the whole room and this page
       * carries three instruments of it, so *"The fast track row is the
       * recording input."* names something real that is not here. Writing
       * `M-Audio Fast Track Pro` into the box would put a word in somebody's
       * mouth and still come back *nothing on this desk*.
       */
````

<a id="wish-278"></a>
## wish-278: demo/wish/index.html, inline script, line 2909

````js
      /* ⚠️ BOTH HALVES OF THE SENTENCE, AND THE SECOND CLAUSE IS NEW ON
         2026-09-22. `not on this desk` is now also the `about` of an example
         row, so a failing assert's own detail line can carry those words into
         the log and this search would find the harness talking to itself
         instead of the page. MEASURED: it did, on the first run after the
         table landed. */
````

<a id="wish-279"></a>
## wish-279: demo/wish/index.html, inline script, line 2923

````js
    /**
     * 🔴 ENTER IS THE ONLY WAY TO SUBMIT AN EDITED SENTENCE NOW, AND A HARNESS
     * CANNOT PRESS A KEY, SO IT IS PRESSED HERE. Both halves in one line:
     * Enter asks and claims the key, and Shift+Enter does neither, or a
     * sentence could never be given a second line and every newline would
     * spend a model call.
     * ⚠️ IT IS SAMPLED ON THE SHIMMER, because `waitFor('patch')` is the first
     * thing a proposal does synchronously and *did a model call start* has no
     * other observable answer inside one tick.
     */
````

<a id="wish-280"></a>
## wish-280: demo/wish/index.html, inline script, line 2946

````js
      // ⚠️ AND THE BOX SAYS NOTHING, which is the other half of the same ask.
      // A placeholder that explained the gesture was the page's only account of
      // it until `Interpret` existed; now two buttons carry it and the box is
      // empty. Asserted rather than assumed, because a stray placeholder is
      // exactly the kind of string that survives a removal.
````

<a id="wish-281"></a>
## wish-281: demo/wish/index.html, inline script, line 2958

````js
    /* 🔴 PAINT, NOT ROOM, AND BOTH HALVES ARE MEASURED. Nothing that redraws
       may change how much space it takes, so the height is read with the
       glimmer on and off; and a CSS rule that lost reads as correct in the
       source, so the ANIMATION is read as a computed value rather than trusted.
       ⚠️ THE REDUCED MOTION BRANCH IS NOT A GET OUT. `shell.css` turns every
       animation off under that setting, so the honest answer there is `none`
       and the page says which branch was measured. It is the `caps.mjs` rule:
       a probe that could not answer must not read as a failure. */
````

<a id="wish-282"></a>
## wish-282: demo/wish/index.html, inline script, line 2974

````js
    /**
     * 🔴 THIS ASSERT GRADED THE GLIMMER AND NOW GRADES ITS ABSENCE, which is the
     * shape a removal has to take here. Asked 2026-09-21: *"rm shimmers from
     * textareas"*. A check that simply vanished with the feature would leave the
     * page one assert lighter and nothing saying why, and the next person to
     * think a sweeping box looks lively would put it back.
     * ⚠️ AND `data-busy` IS STILL ASSERTED TO LAND, because the state is not
     * what was removed: only the animation went. The busy state is said by the
     * button's own sweep, which `shell.css` paints, and by the log line.
     */
````

<a id="wish-283"></a>
## wish-283: demo/wish/index.html, inline script, line 2994

````js
      /* Nothing on this page may change its own height while a reader is
         looking at it, and a textarea that grows with its content is exactly
         that. MEASURED at both ends: empty, and with far more text than fits. */
````

<a id="wish-284"></a>
## wish-284: demo/wish/index.html, inline script, line 3009

````js
      /**
       * 🔴 NO READOUT, AND NO EMPTY BOX PAINTING AN EDGE WHERE ONE WOULD HAVE
       * BEEN. Asked 2026-09-21: *"rm links / 1 / refused / 1"*, which is both
       * remaining cells.
       * 🔴 MEASURED RATHER THAN TRUSTED, BECAUSE THE FAILURE IS RECORDED.
       * `/typist/` declared `readout: null` and still got a `.pos-readout` div
       * with no children, whose own 1 px top and bottom borders rendered as a
       * 2 px full-width band nobody wrote, reported as *"old UI creeping in"*.
       * The shell hides an empty readout now, and *"the shell handles it"* is
       * exactly the kind of sentence this project keeps finding has outlived
       * its own truth.
       * ⚠️ IT ACCEPTS EITHER SHAPE. Whether the shell omits the element or
       * hides it is the shell's business; what this page needs is that nothing
       * paints an edge where the row used to be, so the test is on the
       * rendered height.
       */
````

<a id="wish-285"></a>
## wish-285: demo/wish/index.html, inline script, line 3033

````js
      /**
       * 🔴 AND THE CONTROL ROW IS EMPTY NOW, WHICH IS THE SAME RULE ONE
       * ELEMENT ALONG. All three controls live somewhere else: `speak` and
       * `interpret` head the two glued blocks, and `Use the example` was
       * replaced by a table of five on 2026-09-22. `shell.mjs` hides
       * `.pos-controls` only for a page that DECLARES none, which this page
       * does not, so the row would have stood there empty and drawn the 14 px
       * band its `[hidden]` rule exists to stop.
       * ⚠️ MEASURED AS A HEIGHT, exactly like the readout above, because
       * whether it is hidden or emptied is not the question. The question is
       * whether anything paints where the row used to be.
       */
````

<a id="wish-286"></a>
## wish-286: demo/wish/index.html, inline script, line 3053

````js
    /* ── what a row does by existing, and what really crosses ──────────────
       🔴 ASKED 2026-09-25: *"wish: when connections (diagram rows) are there,
       enable them"*, settled as *"use the connecting code in wish"*, and
       narrowed on 2026-09-28 to *"rm on button on wish, just keep x button"*.
       There is no switch left, so what is graded below is that an ANSWER makes
       the connection and `×` takes it down, against two stand-in ports rather
       than against the desk: `bay.mjs` has its own test beside it, so what
       these grade is what this PAGE adds, which is the decode, the class, the
       byte encoder, the two maps and the presses.
       ⚠️ AND NOT ONE OF THEM OPENS AN INSTRUMENT, which is the first clause of
       the first one rather than a remark here.
       🔴 AND THE GESTURE IS A REAL PRESS ON A PREPARED ROW, NOT A CALL TO
       `show`. A person's whole path is a press, `useExample`, the `Interpret`
       button, `askBox`, `think` and only then `show`, and a check that called
       `show` itself would skip every step that decides whether a connection is
       proposed at all. `EXAMPLES[0].links` IS `REPAIRED`, and `post` is gated,
       so the press reaches nobody and costs nothing. */
````

<a id="wish-287"></a>
## wish-287: demo/wish/index.html, inline script, line 3090

````js
      /* 🔴 A NOTE PLAYED AT THE SOURCE, THROUGH THE WHOLE PATH. 0x91 is a note
         on, channel 2, which is the channel this keyboard really sends on, and
         the reply's one transform is `transpose by 1`. So 60 arriving as 61 is
         the transform running rather than a message being copied across. */
````

<a id="wish-288"></a>
## wish-288: demo/wish/index.html, inline script, line 3106

````js
      /* 🔴 THE TWO LISTS, WHICH IS WHY `bay.mjs` HAS TWO. The Circuit consents
         to note, cc and bend, so a program change is DROPPED at the boundary
         and counted rather than refusing the link: *I do not use that* against
         *that damages me*, and only the second is worth an error. A page that
         only ever sent notes would grade neither. */
````

<a id="wish-289"></a>
## wish-289: demo/wish/index.html, inline script, line 3127

````js
      /* 🔴 `×` IS BOTH HALVES IN ONE GESTURE, AND IT QUIETENS WHAT IT WAS
         REACHING. This page's own FACTS say the Model 12's REC buttons send no
         note off, so a link cut under a held note leaves it sounding with
         nothing left to carry the release. 16 channels by two channel mode
         messages is 32.
         🔴 THE TALL ROW HERE IS THE ONE THE WHOLE CHANGE RESTS ON. The switch
         used to be the way down and the remove was the way off; with the switch
         gone a remove that took the row and left the link would leave an
         instrument being played by a sentence nobody can read, with nothing on
         the page left to stop it. So this presses the REAL button and then
         plays a note to see whether anything still crosses. */
````

<a id="wish-290"></a>
## wish-290: demo/wish/index.html, inline script, line 3156

````js
      /* 🔴 A REFUSED ROW IS NEVER MADE, AND REMOVE IS THE ONE THING A READER
         CAN DO ABOUT IT. `CANNED` is the reply the real 70B gave with its
         argument under the wrong key, so this is the refused row rather than a
         constructed one, and it is the negative half of the line above it: a
         `connectAll` that laid a link down for every row rather than for every
         ALLOWED one would show up here and nowhere else. */
````

<a id="wish-291"></a>
## wish-291: demo/wish/index.html, inline script, line 3181

````js
      /* 🔴 AND AN ALLOWED ROW WHOSE INSTRUMENT IS NOT PLUGGED IN SAYS SO RATHER
         THAN LOOKING MADE. This is the hole the switch used to cover by
         snapping back to off: with the row itself carrying the claim, a
         connection the desk could not make has to be visible as a connection
         the desk could not make. The port is taken out of the map and put back,
         which is the only way to reach `connect`'s first branch at all, because
         every port the stand-in lays down is one `grade` already allowed. */
````

<a id="wish-292"></a>
## wish-292: demo/wish/index.html, inline script, line 3206

````js
      /**
       * 🔴 AND THE PICTURE IS STILL A ROW OF BOXES WHERE THIS PAGE IS READ.
       * `diagram.mjs` lays a row out while its host is at least 560 px and
       * stacks it into one tall column below that, so a control that made the
       * reserved column wider would double the height of every connection. The
       * width is swept on the COMPONENT rather than on the window, because
       * `demo/verify.mjs` runs at one width with no viewport override and a
       * media query it cannot enter is a layout nothing here can grade.
       * ⚠️ 390 AND 560 ARE MEASURED AND NOT ASSERTED ON, because the figure has
       * always stacked there: 72 px of actions and 12 of gap come off a 390 px
       * component whatever is in them. What is asserted at every width is that
       * nothing overflows the column, which is the failure the controls could
       * actually cause.
       */
````

<a id="wish-293"></a>
## wish-293: demo/wish/index.html, inline script, line 3243

````js
    /**
     * 🔴 THE REPAIR IS GRADED, IN BOTH DIRECTIONS, AND THIS BLOCK IS LAST ON
     * PURPOSE. Placed earlier, its `await think()` left the control lit and
     * the press drill below then read `busy before true`, which is a check
     * failing because of the check above it rather than because of the page.
     * ⚠️ THE GLIMMER DRILL ABOVE SHARES THAT CONSTRAINT AND SITS AFTER THE
     * PRESS DRILL FOR THE SAME REASON. Every await in this check has to be
     * below the line that reads `speakBtn.dataset.busy`, because the shell
     * paints it the moment this function first yields.
     * What the boundary sends back
     * has to be a patch the validator ACCEPTS, and the raw thing it repaired
     * has to still be refused, or the two halves could drift into agreeing.
     */
````

<a id="wish-294"></a>
## wish-294: demo/wish/index.html, inline script, line 3263

````js
      /* And the page SAYS it, which is the half that keeps this from being a
         silent rewrite. Read off the log rather than off the constant.
         ⚠️ THE PROPOSAL IS DRIVEN HERE RATHER THAN LEFT TO A PRESS. A first
         draft read the log and found nothing, because the line is only written
         when a proposal runs and nothing guarantees a control was pressed
         before this check. Depending on press order is how a check ends up
         measuring the moment instead of the code. It costs nothing: `post` is
         gated under `?selfcheck=1` and reaches no model. */
````

<a id="wish-295"></a>
## wish-295: demo/wish/index.html, inline script, line 3281

````js
  /**
   * 🔴 THE CHECKS ARE DRIVEN FROM HERE, BECAUSE THE BUTTON THAT USED TO REACH
   * THEM IS NO LONGER IN THE ROW THE HARNESS SWEEPS. `demo/verify.mjs` presses
   * `.pos-controls button` and nothing else; every check on this page hangs off
   * `d.on('check')`, which is reached by pressing `speak` under `SELFCHECK`, and
   * `speak` moved into the hear header when the two glued headers were built.
   * 🔴 MEASURED THE MOMENT IT MOVED: 41 page asserts became **2**, and the run
   * stayed GREEN. Not one assert failed. They stopped running, and only the
   * COUNT said so. That is `/mirror/`'s ten and `/blocks/`'s six arriving a
   * third time, in a page whose own comment two hundred lines up had just
   * finished describing the trap.
   * ⚠️ IT PRESSES THE REAL BUTTON RATHER THAN CALLING `d.run('check')`, so what
   * is exercised is the same path a person's press takes, including the shell's
   * busy paint and the handler's own `SELFCHECK` branch.
   */
````
