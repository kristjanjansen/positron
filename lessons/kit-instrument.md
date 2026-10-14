# Kit lessons: instrument

The longer comments cut from `demo/shell/instrument.mjs` and `demo/shell/instrument-test.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-instrument.md#<anchor>`.

<a id="header"></a>

## `instrument.mjs` module header

```text
demo/shell/instrument.mjs — a cased panel with the instrument's name on it.

🔴 THIS IS A COMPOSITION, NOT A LAYOUT ENGINE, AND THAT IS THE WHOLE POINT.
`createPanelLayout` already owns the case, the fixed column and the one
scrolling strip; `createNameplate` already owns the plate and its four
placements (three horizontal, and `side` since 2026-09-25). What did not exist was the sentence that joins them, and five
pages had each written it themselves:

  /tom/      createNameplate({ lines: ['POSITRON', 'TOM'], place: 'ends' })
             panel.el.prepend(plate.el)
  /circuit/  its own createNameplate call and its own placing
  /evo/      the same again
  /twelve/   createNameplate({ lines: ['MODEL 12'], place: 'end' })
  /kit/      two more, in its PANEL specimen

`positron-ui` names this exactly: a control that exists in one page and
nowhere else is a component that has not been noticed yet. Here it was in
five, which is not a special case, it is a component with five copies of its
assembly instructions.

⚠️ NOTHING HERE REIMPLEMENTS EITHER PART. If a panel behaviour is wrong, it
is wrong in `panel-layout.mjs` and it is wrong for every page at once, which
is the property a second implementation would have destroyed.

🔴 AND THE PLATE GOES IN BY `prepend`, WHICH IS WHAT `/tom/` DISCOVERED AND
THE OTHERS DID DIFFERENTLY. A nameplate is not a row inside the scroller: it
belongs to the CASE, above the fixed column and the strip both, or it scrolls
away from the instrument it names.
```

<a id="header-says"></a>

## `instrument.mjs` HEADER_SAYS

```text
What the header's status control says in its two states.

🔴 THE WORDS ARE THE ONES IN THE ASK, AND THE COLOURS COME FROM THE KIT.
Asked 2026-09-22: *"left: online status button: enabled disabled
(green/gray)"*. `presence.mjs` already owns green for a thing that answered
and grey for one that has not, already reserves the badge's width off the
longest word it can say so it cannot twitch, and is already the settled
answer on eight pages. A second green dot here would be the hand-rolled
control defect arriving inside the kit.
⚠️ TWO STATES, NOT FIVE, WHICH IS WHAT `can` IS FOR. A header is not asking
whether a board in another building is answering; it is saying whether this
instrument is switched into the chain, which has no `checking` and no
`coming`. Narrowing it also narrows the reserve to the longer of these two
words rather than to `coming online`.
```

<a id="header-word"></a>

## `instrument.mjs` HEADER_SAYS: the word

```text
🔴 THE WORD SAYS WHAT A PRESS DOES, NOT WHAT THE STATE IS, SINCE 2026-09-22:
*"online labels: 'turn on' 'turn off'"*. It read `enabled` and `disabled`.
⚠️ AND IT IS ONE WORD, CORRECTED WITHIN THE HOUR TO *"*name* off / on"*. The
badge already prints the instrument's name in front of it, so `PLAITS turn
off` said the verb twice as far as a reader is concerned.
🔴 **AND THEN REVERSED: *"reverse on / off names"*, SO THE WORD IS THE STATE
AFTER ALL.** `PLAITS on` means it IS on, and the dot agrees with it rather
than contradicting it. The first arrangement asked a reader to hold two
things at once, a green dot meaning running and a word meaning what a press
would do, and one of them had to be read backwards. Two channels saying one
fact beats two channels saying two.
⚠️ **THE DOT STILL CARRIES THE STATE**, which is what makes this legible
rather than confusing: green with `turn off` is a thing that is on and a
press that would stop it. Two channels, one fact each, which is the rule this
project applies to every other control.
⚠️ AND IT IS RIGHT ONLY BECAUSE THE CONTROL ACTS. A badge that reported and
could not be pressed would be labelled with an instruction nobody can
follow, so a caller that supplies no `press` still gets the states named as
states through `says`.
```

<a id="platelines"></a>

## `instrument.mjs` plateLines

```text
The plate's lines, and the placement they need.

🔴 PURE, AND SEPARATE, SO IT CAN BE GRADED WITH NO BROWSER. Everything else
in this file needs a `document`, and a rule that only a browser can check is
a rule that gets checked once. `node demo/shell/instrument-test.mjs` runs
this in a few milliseconds.
⚠️ ONE LINE OR TWO, AND THE CALLER DOES NOT CHOOSE THE PLACEMENT FOR ONE.
A maker of `''` is how a page says *this thing carries no brand*, which is
what `/twelve/` means by `MODEL 12` alone, and `ends` is `space-between`,
which parks a lone child on the LEFT. `createNameplate` records that as the
reason `end` exists, so choosing it here rather than leaving it to a caller
is this function agreeing with that file.
```

<a id="keeps-one-line"></a>

## `instrument.mjs` KEEPS_ONE_LINE

```text
🔴 AND `side` SURVIVES A SINGLE LINE, WHICH THE RULE ABOVE WOULD OTHERWISE
   HAVE THROWN AWAY. The downgrade exists because `ends` is `space-between` and
   parks a lone child on the left, which is a horizontal argument about a
   horizontal placement. A plate glued down the edge of the case has no such
   problem: one line is the ordinary case for it, and `/shape/` is exactly that,
   `shape` with no maker. Sending it to `end` would put the one page that asked
   for a vertical plate back on a horizontal one, silently.
```

<a id="buildheader"></a>

## `instrument.mjs` buildHeader

```text
The header row: a status control on the left, a patch selector optically
centred on the case, and the nameplate on the right.

🔴 **A THREE COLUMN GRID WITH EQUAL OUTER TRACKS, WHICH IS THE WHOLE ASK AND
IS SAID PRECISELY IN IT.** *"center patch selector (optically center to the
instrument)"*. Centred to the INSTRUMENT, not balanced between two unequal
neighbours: a flex row with a status on one side and a plate on the other
puts its middle child wherever the difference between those two leaves it,
which is a different place on every panel and moves the moment a patch name
gets longer. `1fr auto 1fr` puts the centre track on the container's own
centre whatever is in the outer two, and `.panel-case` is
`padding: 0 var(--panel-pad)`, the same both sides, so the header's centre is
the CASE's centre. That is what `/kit/` asserts, against the case's own box.

🔴 **THE STATUS CONTROL ACTS OR IT IS NOT A BUTTON, AND THAT IS DECIDED HERE
RATHER THAN LEFT TO A CALLER.** `positron-ui` calls a control whose only
honest behaviour is to do nothing *"the shape of control this project calls a
lie"*, and the ask wants one element that both reports a state and looks
pressable. So: a caller that hands over `press` gets a real button that calls
it, built by `createPresenceButton`, and a caller that hands over nothing
gets a BADGE, which is a span with no tab stop, no pointer cursor and no
handler. There is no third shape, and nothing here ever presses itself.
⚠️ **A BADGE IS NOT A DEGRADED BUTTON, IT IS THE HONEST ANSWER FOR AN
INSTRUMENT THAT IS SIMPLY ON.** `/muta/`'s two firmwares are in the page and
cannot be unplugged; a header on one of those reports and does not pretend to
connect anything.

⚠️ **AND THE PLATE IN A HEADER IS `end`, NEVER `ends`.** `ends` is
`space-between`, which needs a box that SPANS something to put a gap in; in a
header's right cell, which is as wide as its content, it puts the maker and
the model hard against each other. `end` pushes both to the right edge, and
`shell.css` gives that placement a `column-gap` so two lines read as two.
```

<a id="header-order"></a>

## `instrument.mjs` buildHeader: order

```text
⚠️ THE PLATE IS FIRST IN THE DOM AND THIRD IN THE PICTURE, and that is the
   phone layout rather than an accident. Asked for as *"3 levels"*: the title,
   then the enabled button at full width, then the patch at full width. A
   single column grid lays its children out in source order, so this order IS
   the phone. The desktop places all three by `grid-column` in `shell.css`,
   which is visible in the stylesheet, rather than by a flex `order` nobody
   can see in the markup.
```

<a id="plate-false"></a>

## `instrument.mjs` buildHeader: plate false

```text
🔴 A HEADER MAY CARRY NO PLATE AT ALL, `plate: false`, ADDED 2026-09-22:
*"rm nameplates"*. It is not a bare removal: the status control prints the
instrument's name in front of its state, so a plate beside it is the name
twice on one row, which is the doubled-channel objection this project keeps
making about everything else.
⚠️ **THE DEFAULT KEEPS THE PLATE**, because a caller whose status control
is a plain badge with no name has nothing else to say which instrument it
is looking at.
```

<a id="on-off"></a>

## `instrument.mjs` buildHeader: on and off

```text
🔴 THE CONTROL SAYS `on` AND `off`, NEVER `FAU ON`. Asked 2026-09-25:
*"on synth on offs do not add synt name to fau on / fau off: just ON
OFF"*. `presence.mjs` paints the name and the state as ONE phrase when it
has an `of`, which is right on `/keys/` where a badge in a transport bar
is the only thing naming a Raspberry Pi in another building, and wrong
here: **a header carries the nameplate on the same row.**
⚠️ AND THAT IS THIS FILE'S OWN ARGUMENT A THIRD TIME. `plate: false`
exists because *"a plate beside it is the name twice on one row"*, and a
status control naming the instrument again is the same doubled channel
from the other side.
🔴 **IT CHANGES WHAT IS PAINTED, NOT WHAT THE CONTROL KNOWS ABOUT
ITSELF.** `of` stays, and it has to: the aria label below is
`switch ${of} on and off`, and *"switch on and off"* names nothing to
somebody who cannot see the plate. **The eye reads the plate, a screen
reader reads the label, and both are told which instrument this is.**
⚠️ IT COVERS THE BADGE AS WELL AS THE BUTTON, WHICH WAS CHECKED RATHER
THAN ASSUMED. A header always sits on a case that names itself: with
`plate: false` the bar gives its plate up and `barHasPlate` hands it back
to the CASE, so there is no configuration where this drops the last thing
saying which instrument a reader is looking at.
⚠️ AND IT IS BEFORE `...rest`, so a caller that really wants the name in
the phrase passes `showName: true` and gets it.
```

<a id="createinstrument"></a>

## `instrument.mjs` createInstrument

```text
A cased instrument panel with its name printed across the top.

@param {object}  o
@param {string}  o.name            the model, printed at the right end
@param {string}  [o.maker=MAKER]   the maker, printed at the left end
@param {Element} [o.host]          append the case to this
@param {string}  [o.place='ends']  a `createNameplate` placement
@param {object}  [o.panel]         passed straight to `createPanelLayout`
@param {object}  [o.header]        build a header row across the top of the
  case. See `buildHeader`. `{ online, patch }`, where `online` takes a
  `press` to become a button and is `false` for no status control at all.

  🔴 **IT IS AN OPTION AND THE DEFAULT IS OFF, WHICH IS A DECISION ABOUT
  OTHER PEOPLE'S PAGES RATHER THAN A HEDGE.** The plate sits in the case's
  top inset today and `/muta/` and `/kit/` both ASSERT it there, one of them
  by reading the case's first child. Moving it into a header for every caller
  would take those asserts red on pages nobody had touched, and this file
  already records a wrapper shipping a defect to a new page on the day it was
  written to prevent one. **With a header the plate moves into it; without
  one nothing about any existing case changes.**
@returns {{el, panel, plate, fixed, strip, flow, head, online, add, band, unband, seam, shown}}
```

<a id="caps"></a>

## `instrument.mjs` createInstrument: caps

```text
🔴 `caps: false` KEEPS THE NAME AS TYPED, ASKED FOR ON `/shape/`
2026-09-25 AS A LOWER CASE `shape`. `panel-layout.mjs` carries the whole
argument beside the option: the uppercase rule is about a shelf of
REPLICAS reading as one shelf, and this page is a replica of nothing. It
is a DEPARTURE from every plate in the project today and it is written
down as one rather than slipped in.
```

<a id="no-name"></a>

## `instrument.mjs` createInstrument: no name

```text
🔴 REFUSED WITHOUT A NAME, FOR THE REASON `knob.mjs` REFUSES WITHOUT A
LABEL: the plate is the only thing on a case that says which instrument
this is, and a case with an unnamed plate is furniture wearing a border.
⚠️ IT THROWS AT BUILD TIME, IN FRONT OF THE AUTHOR, rather than rendering
an empty plate a visitor has to interpret. `createNameplate` already
refuses a plate with no lines at all and this is the same refusal one
argument earlier, where the caller can still see what they forgot.
```

<a id="plate-owner"></a>

## `instrument.mjs` createInstrument: who owns the plate

```text
🔴 THE HEADER OWNS THE PLATE WHEN THERE IS ONE, AND THE PANEL OWNS IT WHEN
   THERE IS NOT. Two plates would be two names on one case, and handing the
   panel a plate it then places in the top inset while the header holds
   another is exactly that.
```

<a id="glued-header"></a>

## `instrument.mjs` createInstrument: glued header

```text
🔴 THE HEADER IS A GLUED PART, NOT A ROW INSIDE THE CASE, SINCE
2026-09-22. Reported against a screenshot: *"this does not look like glued
transport or smt. underline does not extend to sides, to much padding. make
it a snd componetn or reuse one"*.
🔴 **AND EVERY WORD OF THAT WAS A SYMPTOM OF ONE CAUSE: IT WAS AN
IMITATION.** A border drawn on a child of the case sits INSIDE the case's
own padding, so it can never reach the sides; the padding was the case's
plus the header's; and the whole thing was a second implementation of a
seam `glue.mjs` already owns and `/pack/`, `/tom/` and `/wish/` already
use. `positron-ui` opens with BUILD FROM `/kit/` for exactly this.
✅ `createGlue` gives the seam its full width, drops the doubled padding by
making the children give up their own border and radius, and makes an
instrument with a header the same object as a transport bar over the strip
it drives.
```

<a id="panel-places-plate"></a>

## `instrument.mjs` createInstrument: panel places the plate

```text
🔴 THE PANEL PLACES THE PLATE, THIS FILE DOES NOT. It did
`panel.el.prepend(plate.el)` for one day, which is exactly what the five
pages before it were doing, and it inherited exactly what they were paying
for: the case's padding is horizontal only, so a plate put in from outside
sat on the top border. `/tom/` had fixed that in its OWN stylesheet and
`/plai/` had no such rule, so this wrapper shipped the defect to a new page
on the day it was written to prevent it.
⚠️ **CENTRALISING AN ASSEMBLY THAT DOES NOT OWN ITS OWN LAYOUT MOVES THE
DUPLICATION RATHER THAN REMOVING IT.** `createPanelLayout` takes a `plate`
now and owns the spacing, so no wrapper and no page can get it wrong.
```

<a id="barhasplate"></a>

## `instrument.mjs` createInstrument: barHasPlate

```text
🔴 THE CASE KEEPS ITS OWN PLATE WHENEVER THE BAR IS NOT CARRYING ONE.
A header with `plate: false` used to leave the instrument with no plate
anywhere, which was right while the status control printed the name beside
it and wrong the moment the bar moved to the foot: a nameplate at the
BOTTOM of a case names it after a reader has already read it.
⚠️ SO THE TEST IS WHO HAS THE PLATE, NOT WHETHER THERE IS A BAR. One plate,
in one of two places, decided by the bar rather than by the caller having
to remember to ask twice.
```

<a id="header-placement"></a>

## `instrument.mjs` createInstrument: header placement

```text
🔴 THE HEADER GOES IN BY `prepend`, FOR THE REASON THE PLATE DOES: it
   belongs to the CASE, above the fixed column and the strip both, or it
   scrolls away from the instrument it names. `/tom/` found that with a plate.
   ⚠️ AND THE SPACING IS `shell.css`'S, NOT THIS FILE'S. `.panel-case >
   .panel-head` carries the same `padding-block` the plate's own rule does,
   off the same `--panel-pad`. Centralising an assembly that does not own its
   own layout moves the duplication rather than removing it, which is written
   at length in `panel-layout.mjs` and was paid for on `/plai/`.
```

<a id="glued"></a>

## `instrument.mjs` createInstrument: glued

```text
🔴 GLUED, NEVER PREPENDED, SINCE 2026-09-22. This put the header INSIDE the
   case, where its underline sat within the case's own padding and could never
   reach the sides, and where its padding was the case's plus its own. See the
   note on `head` above. `createGlue` returns the single block unwrapped when
   there is only one, so a case with no header gains no box and no edge.
```

<a id="at-foot"></a>

## `instrument.mjs` createInstrument: at

```text
🔴 THE BAR SITS ABOVE OR BELOW, `header: { at: 'head' | 'foot' }`, ADDED
2026-09-22: *"make it revertable: move plaits/warps headers to footers and
add nameplate to top right"*. **`head` is the default and nothing about it
changed**, which is the whole of *revertable*: a caller moves one word back
and gets exactly what it had, rather than a rewrite being undone by hand.
⚠️ AND `createGlue` TAKES THE PARTS IN ORDER, so this is an argument swap
rather than a second assembly. The seam, the shared border and the children
giving up their own edges are the same either way.
```

<a id="parts"></a>

## `instrument.mjs` createInstrument: parts

```text
🔴 A CALLER MAY GLUE ITS OWN PARTS IN, `parts: [el]`, ADDED 2026-09-22:
*"move it to glued section on top of onoff/patchselector"*. They sit
BETWEEN the case and the bar, which is the only place a part can go that is
neither the instrument's controls nor its bar.
⚠️ **AND THEY ARE GLUE PARTS, NOT CASE CONTENTS.** `add()` puts something
inside the case, where it scrolls with the panel and sits within the case's
inset. A part is its own surface with the glue's seam either side of it,
which is what a picture under an instrument wants: the same edge the bar
has, at the same width.
```

<a id="band"></a>

## `instrument.mjs` createInstrument: band

```text
Stack a block across the case, under whatever is already there, and the
rule between two of them.

🔴 FORWARDED RATHER THAN WRAPPED, the way `fixed`, `strip` and `flow`
already are, so everything `panel-layout.mjs` documents about where a
seam may live stays true here. **A band is not `add()`**: `add()` puts a
block in the SCROLLER, where it is as wide as the widest row and scrolls
with it, and a band is a child of the case, across the whole of it.
```

<a id="test-header"></a>

## `instrument-test.mjs` instrument-test module header

```text
demo/shell/instrument-test.mjs — the instrument case, without a browser.

🔴 WHAT THIS FILE CAN AND CANNOT SEE, SAID AT THE TOP SO NOBODY READS IT AS
COVERAGE IT DOES NOT HAVE. `createInstrument` needs a `document`, so the
assembly itself is graded on `/kit/`. What is graded here is the part that
decides WHAT GOES ON THE PLATE, which is pure, plus the one property the
whole module exists for: that it composes the two components that already
exist rather than reimplementing either.
```

<a id="code"></a>

## `instrument-test.mjs` code

```text
The same file with every comment taken out.

🔴 **TWO ASSERTS IN THIS FILE WERE GREEN WHILE MATCHING COMMENT TEXT, AND THE
MEASUREMENT IS 2026-09-22.** `it calls the two components that already exist`
tested `/createNameplate\(/` against the raw source, and `createNameplate` was
IMPORTED AND NEVER CALLED: the only occurrence was the worked example in this
module's own header. `the plate is prepended to the case` tested
`/panel\.el\.prepend\(plate\.el\)/`, and that line had not existed in the code
since `createPanelLayout` took a `plate` option; the only occurrence was
inside the comment explaining why it had been removed. Both matched, both
passed, and one of them was grading a prohibition against the sentence
describing it.
⚠️ THE NEGATIVE CONTROL BELOW HAD ALREADY STRIPPED COMMENTS FOR EXACTLY THIS
REASON, which is what makes the other two an oversight rather than an
argument: the file knew, in one of its four checks.
✅ **AN ABSENCE IS ASSERTED OVER `code` AND A PRESENCE OVER `code` TOO**, and
only a claim about the PROSE may read `src`.
```

<a id="t-one-line"></a>

## `instrument-test.mjs` tests: one line

```text
🔴 ONE LINE TAKES `end` AND NEVER `ends`, AND THIS IS THE WHOLE REASON THE
FUNCTION EXISTS. `ends` is `space-between`, which parks a lone child on the
LEFT. `panel-layout.mjs` records that `/twelve/` was reported for exactly
this and that `end` was added for it. A caller choosing the placement would
have to know that; this decides it.
```

<a id="t-side"></a>

## `instrument-test.mjs` tests: side

```text
🔴 THE ONE PLACEMENT THAT SURVIVES A SINGLE LINE, AND IT IS A NEGATIVE
CONTROL AGAINST THE RULE DIRECTLY ABOVE IT. The downgrade to `end` exists
because `ends` is `space-between` and parks a lone child on the LEFT, which
is an argument about a horizontal row. A plate glued down the edge of the
case is not one, and one line is its ordinary case: `/shape/` asked for
exactly that, `shape` with no maker. Without the exemption the only page
that asked for a vertical plate would silently get a horizontal one, and
nothing would look broken.
```

<a id="t-composes"></a>

## `instrument-test.mjs` tests: composes

```text
🔴 THE ONE PROPERTY THAT MAKES THIS MODULE WORTH HAVING, AND IT IS
ASSERTED AS AN ABSENCE. A second panel implementation would look correct,
pass every check on this page, and drift from `panel-layout.mjs` the first
time a panel behaviour changed. `positron-ui` records three pages that
ended up with three different radio rows exactly that way.
```

<a id="t-header-placement"></a>

## `instrument-test.mjs` tests: header placement

```text
The plate belongs to the CASE, above the fixed column and the strip both,
   or it scrolls away from the instrument it names. `/tom/` found that with a
   plate, and a header is the same claim one element out.
   🔴 THIS ASSERT USED TO READ `panel.el.prepend(plate.el)` AGAINST THE RAW
   SOURCE AND THAT LINE HAD NOT EXISTED FOR A DAY. See the note on `code`.
   🔴 **AND IT WENT RED AGAIN ON 2026-09-22 FOR THE SAME REASON IN A NEW
   PLACE**: the header is a GLUED part now rather than a child prepended to
   the case, reported as *"underline does not extend to sides, to much
   padding"*, both of which are what a border drawn inside the case's padding
   does. What the claim was protecting is unchanged and is what this now
   reads: the header is ABOVE the instrument and outside anything that
   scrolls, and a case with no header still places its own plate.
```

<a id="t-either-end"></a>

## `instrument-test.mjs` tests: either end

```text
🔴 AND IT MAY SIT AT EITHER END SINCE 2026-09-22: *"move plaits/warps
   headers to footers"*, with `head` still the default so the change is one
   word to revert. What this grades is unchanged in substance: the bar is
   GLUED to the case rather than placed inside it, and the case keeps placing
   its own plate whenever the bar is not carrying one.
```

<a id="t-parts"></a>

## `instrument-test.mjs` tests: parts between

```text
⚠️ THE MATCH ALLOWS A CALLER'S OWN PARTS BETWEEN THE TWO, which is the
   `parts` option added 2026-09-22 for a picture that sits between a case and
   its bar. This read the two arguments as literally adjacent and went red on
   a spread appearing between them, which is a change in the call's shape
   rather than in what it claims.
```

<a id="t-default-top"></a>

## `instrument-test.mjs` tests: default top

```text
🔴 THE DEFAULT IS THE TOP, WHICH IS WHAT MAKES THE MOVE REVERTIBLE RATHER
   THAN A REWRITE. A caller that says nothing gets what every caller had
   before the option existed.
```

<a id="t-no-edge"></a>

## `instrument-test.mjs` tests: no own edge

```text
🔴 AND THE SEAM IS `glue.mjs`'S, WHICH IS THE WHOLE POINT OF THE CHANGE. A
   `border-bottom` typed in this file would put the imitation back one element
   along, and it would read as correct in the stylesheet.
```

<a id="t-status-button"></a>

## `instrument-test.mjs` tests: status button

```text
🔴 THE DECISION THE ASK FORCED, GRADED AS SOURCE BECAUSE IT IS A BRANCH AND
NOT A VALUE. A status control that only reports must not be a button, and
one that acts must be. `positron-ui` calls a control whose only honest
behaviour is to do nothing *"the shape of control this project calls a
lie"*, and the ask wanted one element doing both jobs.
```

<a id="t-colours"></a>

## `instrument-test.mjs` tests: colours

```text
🔴 GREEN AND GREY ARE `presence.mjs`'S, DECIDED ONCE. A second green dot in
   this file would be the hand-rolled control defect inside the kit itself.
```

<a id="t-words"></a>

## `instrument-test.mjs` tests: words

```text
🔴 AND THE WORDS ARE WHAT A PRESS DOES, NOT WHAT THE STATE IS, SINCE
   2026-09-22: *"online labels: 'turn on' 'turn off'"*. This asserted the two
   literal words and had to move with them, but the claim underneath is not a
   spelling: the word for the ONLINE state is what would turn it OFF, and the
   word for OFFLINE is what would turn it on. A pair that read the same way
   round as the state would be a button promising to do what it has already
   done.
```

<a id="t-word-pair"></a>

## `instrument-test.mjs` tests: word pair

```text
⚠️ THE PAIR READS THE SAME WAY ROUND AS THE STATE SINCE 2026-09-22:
   *"reverse on / off names"*. This asserted the opposite for an hour, when
   the word was what a press would DO, and the claim underneath is the same
   either way and is the one worth grading: **the two words are different
   and neither is the other's state**. A pair that said `on` for both, or
   that drifted so `online` read `off` again, is what this catches.
```

<a id="t-header-plate"></a>

## `instrument-test.mjs` tests: header plate

```text
🔴 THE PLATE IN A HEADER IS `end` AND NEVER `ends`, AND IT IS THE SAME
REASON `plateSpec` EXISTS AT ALL. `ends` is `space-between`, which needs a
box that spans something to put a gap in; a header's right cell is as wide
as its content, so `ends` would put the maker hard against the model.
```

<a id="t-grid-centre"></a>

## `instrument-test.mjs` tests: grid centre

```text
⚠️ THE CENTRE IS A GRID TRACK, NOT A FLEX CHILD, and the whole ask turns on
   it. This is the only half of that claim readable without a browser: the
   geometry is asserted on `/kit/` against the case's own box.
```

<a id="t-default-off"></a>

## `instrument-test.mjs` tests: no header by default

```text
🔴 THE DEFAULT IS OFF, WHICH IS A DECISION ABOUT OTHER PEOPLE'S PAGES.
   `/muta/` and `/kit/` both assert the plate in the case's top inset, one of
   them by reading the case's first child.
```
