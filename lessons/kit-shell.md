# Kit lessons: shell.mjs, shell-test.mjs

The long comments cut from `demo/shell/shell.mjs` and `demo/shell/shell-test.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-shell.md#<anchor>`.

<a id="build-stamp"></a>

## shell.mjs, BUILD

Which build is this? Replaced by workers/view/build.mjs in the DEPLOYED
copy only, so a page always says what it is. Asked for after a run whose
result could not be attributed: without a stamp there is no way to tell a
fix that did not work from a fix that was never loaded.

<a id="header"></a>

## shell.mjs, file header

demo/shell/shell.mjs — page frame + the __demo contract.

mount() builds the whole chrome and returns the only API a demo needs.
Everything it shows a human it has already published for a CDP script on
window.__demo — that is the point: one page, both audiences.

  const d = mount({ name:'transport', what:'…', readout:{drift:'ms'} });
  d.set('drift', 0.4);  d.log('seeked');  d.ready();

<a id="leaf-imports"></a>

## shell.mjs, leaf imports (symbol.mjs)

⚠️ EVERY IMPORT IN THIS FILE IS A LEAF. `shell.mjs` is the frame every page
mounts, so a dependency here is a dependency everywhere;
`symbol.mjs` imports nothing and touches nothing but the element it is handed.

<a id="leaf-stack"></a>

## shell.mjs, leaf imports (stack.mjs)

⚠️ AND SO IS THIS ONE. `stack.mjs` imports nothing — it makes its own element
with `createElement` rather than borrowing `el()` from here, which is what
keeps a cycle out of the frame every page mounts.

<a id="leaf-glue"></a>

## shell.mjs, leaf imports (glue.mjs)

⚠️ AND SO IS THIS ONE, SINCE 2026-09-28, AND IT HAD TO BECOME ONE FIRST.
`glue.mjs` read `import { el } from './shell.mjs'`, so this line would have
been a cycle and `createReport` below built its own `<div class="pos-glue">`
instead. It now makes its own element the way `stack.mjs` does, so the glued
surface a report draws and the glued surface a page draws are ONE
implementation rather than two that agree today.

<a id="readout-null"></a>

## shell.mjs, mount() readout option

key -> unit string ('ms', 's', '' …). ⚠️ `null` is DIFFERENT from `{}` and
from leaving it out: it says this page has deliberately no readout because
its subject is visible rather than numeric, and the harness checks for that
declaration rather than accepting an empty one. `typist` is the case — the
document IS the readout, and cells repeating the letters and the cursor
position were the same facts twice.

<a id="show-log"></a>

## shell.mjs, mount() showLog option

🔴 `false` REMOVES THE LOG BOX FROM THE PAGE AND KEEPS THE RECORD.
Lines still accumulate on `__demo.logs`, so a harness and an assert read
exactly what they read before; what goes is the surface. `videoradio` is
the case that bought this: it is a picture you watch, asked for full
screen, and a scrolling block of prose under it is the one element on the
page that is not the picture.
⚠️ IT MUST NOT APPEND THE ELEMENT AT ALL rather than hide its contents.
`.pos-log` carries its own border, and CLAUDE.md already records a page
that opted out of a surface, kept its empty box, and painted a 2 px
full-width band nobody wrote. A container with nothing in it must not
paint its edges.

<a id="joined"></a>

## shell.mjs, mount() joined option

🔴 THE READOUT SITS ON TOP OF THE LOG AS ONE SURFACE AT THE FOOT, ON EVERY
PAGE, AND IT IS THE DEFAULT SINCE 2026-09-28. Instructed: *"global: move
all reading sections atop of the logs and glue them (you have patterns).
use you new glueing code for this, see the kit"*.
⚠️ IT WAS `false` UNTIL THEN, ASKED FOR AS AN OPTION 2026-09-16 (*"combine
readout with log component, put it top of it. they can be used split or
also be the same thing in bottom of page"*), AND THREE PAGES OF 56 ASKED
FOR IT IN TWO YEARS OF DAYS. That is the shape this project already has a
rule about: `rows` was added opt in for one readout that wrapped 7 and 3,
fixed that page, and left every page written afterwards free to make the
same shape again. A rule nobody has to remember is the only kind that
holds, so the arrangement somebody wants is the one a page gets for saying
nothing.
⚠️ THE FLAG SURVIVES AS AN OPT-OUT AND NO PAGE PASSES IT. `joined: false`
is how a page says the two are not one object, and the bar for saying it is
a reason a reader can see on the page rather than a preference. `/kit/` is
the only caller today, and it passes `false` to a specimen because showing
both arrangements side by side is what that page is for. If the count is
still zero next time somebody reads this, delete the split arm rather than
leaving an arrangement nothing on the site can be looked at in.
`createReport()` below owns both arrangements and the empty cases; this
flag only chooses between them.

<a id="feedback-button"></a>

## shell.mjs, the feedback button

🔴 EVERY SHELLED PAGE GETS THE FEEDBACK BUTTON, WHICH IS WHY IT IS HERE AND
NOT IN FORTY PAGES. It sits beside the title, pushed right, because the
title row is the one strip of every demo that means the same thing on all
of them: this page, and what you can do about this page.

⚠️ IT IS NOT A `.pos-controls` BUTTON AND THAT IS NOT AN ACCIDENT OF
LAYOUT. `verify.mjs` presses every control in that row on every page on
every run, and a feedback button wired like one would have sent forty real
messages per run — the FCM defect CLAUDE.md records at length, in new
clothes. The row it is in is only the first fence; the one that holds is
`isTrusted` below, and the server-side origin check behind it.

<a id="feedback-trusted"></a>

## shell.mjs, the feedback button, isTrusted gate

🔴 A SCRIPTED PRESS DOES NOTHING. `element.click()` — which is how this
project's harness presses every control it presses — produces an event with
`isTrusted: false`, and so does anything else a page can synthesise. A real
finger, a real mouse and a real keyboard produce `true`. So the one control
on the site that writes to a store a person is going to read can only be
worked by a person, and no future harness change can quietly start pressing
it. `aria-expanded` is flipped on the far side of the gate, which is both
correct markup for a disclosure button and the thing the check below reads.

<a id="feedback-lazy"></a>

## shell.mjs, the feedback button, lazy import

Imported here rather than at the top of this file: `shell.mjs` is
mounted by every page, and a panel nobody opens should not cost every
page the module, the field and the wire on load. It also keeps this
file importing nothing but a leaf.

<a id="report"></a>

## shell.mjs, mount(), the readout and the log

The readout and the log, as two surfaces or as one. `createReport()` below
owns both arrangements, the cells, the lines and the empty cases; `mount()`
owns only what the page declared and what `__demo` reports about it.

`showReadout: false` publishes the numbers on `__demo` without drawing the
row. It is for a page whose numbers have found a better home — 02 puts each
lane's figures in that lane's own gutter, beside its ink, which leaves the
row on top duplicating them a second time in a place with no context. The
MACHINE contract is unchanged: a CDP script still reads `__demo.readout`,
and `verify.mjs` still asserts the page declares one.

<a id="empty-controls"></a>

## shell.mjs, mount(), an empty control row

⚠️ A ROW WITH NOTHING IN IT STILL TAKES ITS MARGIN. `.pos-controls` carries
14 px under it, so a page that declares no controls — `lanes`, and `draw`
now that its one button lives in its own footer row — got a band of dead
space between the readout and the page, which reads as something that
failed to render rather than as nothing being there.

<a id="glyph-button"></a>

## shell.mjs, mount(), glyph buttons

🔴 A GLYPH BUTTON IS A SQUARE, AND THE SHELL DECIDES IT — NOT THE PAGE.
Three pages carried `.pos-controls button.ico { width: 34px; height: 34px }`
in their own <style>, and `mount()` has never put an `ico` class on
anything: the rule matched nothing, on every page, for as long as it
existed. The ⛶ kept the row's `0 14px` padding and came out about 41 by
34 — a rectangle pretending to be an icon, reported twice, fixed twice in
a place that could not work.
⚠️ THE TEST IS ON THE LABEL, not on a flag a page has to remember. One
character that is not a letter or a digit is an icon by construction;
everything else is a word and gets a word's box. A page cannot forget to
pass something it does not pass.

<a id="glyph-centre"></a>

## shell.mjs, mount(), centring a glyph

⚠️ AND CENTRED ON ITS INK, not on its box. `place-items: center` centres
the ADVANCE and the BASELINE — the right rectangle for a letter and the
wrong one for a picture: ⛶ is drawn small and high in a box sized for a
capital, so it sat up and left in its square. `symbol.mjs` measures the
glyph in the face it will actually be drawn in and moves it.

<a id="control-end"></a>

## shell.mjs, mount(), end: true

`end: true` pushes a control to the far right of the row. It is for the
destructive one — deleting what you just made should not sit shoulder to
shoulder with the button that makes it, where a mis-aimed click lands on
the wrong one.

<a id="control-busy"></a>

## shell.mjs, mount(), busy controls

A CONTROL THAT IS WORKING SAYS SO, and the shell does it rather than every
page inventing its own. If a handler returns a promise the button goes
busy until it settles: disabled, so a second press cannot start a second
run, and swept by a moving highlight so there is something to watch.

No spinner and no label change ON PURPOSE — both resize the button, the
row reflows, and the thing you were about to click moves out from under
the pointer. The sweep is paint only.

<a id="two-stacks"></a>

## shell.mjs, mount(), the two stacks

🔴 TWO STACKS, AND BETWEEN THEM THEY COVER EVERY WAY A BLOCK REACHES A
PAGE. The rhythm used to be one CSS rule on the children of `.pos-body`,
so a page that wrapped two controls in a div, or spliced a row in with
`insertBefore`, or appended a block anywhere else, fell out of it silently
— and nobody found out until somebody photographed a keyboard sitting flush
against a transport bar. demo/shell/stack.mjs carries the three measured
cases and the argument.

 column   `document.body` — the head, the surfaces, the control row, the
          page, the diagram, and anything a page inserts between them
 page     `.pos-body` — the blocks the demo itself draws

⚠️ IT CHANGES NO EXISTING CALL. `d.el` is the same element it always was,
so `d.el.append(x)` now gets the rhythm rather than needing it. The stack
handle is returned as `d.stack` for a page that wants to state its blocks
in one line, which is the form the order of a page should be readable in.

<a id="column-order"></a>

## shell.mjs, mount(), column order

⚠️ THE ORDER IS THE ARRANGEMENT, AND A SKIPPED SLOT COSTS NOTHING.
`report.top` is the readout when the two are split and NOTHING when they
are joined, which since 2026-09-28 is every page; `report.foot` is the log
when they are split, the one joined surface when they are not, and `null`
when there is nothing to draw. `createStack().add` skips a null, so the
joined column is head, controls, page, report, with no empty slot in it.

<a id="muted"></a>

## shell.mjs, __demo.muted

How many benign browser notices `guard()` has swallowed. See
`BENIGN_NOTICES` at the bottom of this file.

🔴 A FILTER NOBODY CAN COUNT IS A FILTER NOBODY CAN PROVE FIRES. The
whole point of that filter is that a reader sees nothing, which is
indistinguishable from a browser that never sent the notice and from a
filter that was deleted. This number is the one place the difference is
visible, and it is why the filter can be graded at all.

<a id="feedback-check"></a>

## shell.mjs, the feedback control checks

── the feedback control, checked on every page, on every run ────────────

🔴 THE SECOND ONE PROVES THE GUARD BY BREAKING IT. CLAUDE.md: prove a guard
fires, break the thing on purpose once. This presses the button the way a
script presses a button and asserts that nothing opened — and it
discriminates, because `aria-expanded` is set on the far side of the
`isTrusted` check, so removing the check turns this assert red rather than
leaving it green about nothing. It costs one synthetic click at load and it
is the difference between believing the suite cannot write feedback and
knowing it.

<a id="shell-asserts"></a>

## shell.mjs, __demo.shellAsserts

🔴 HOW MANY OF THESE THE SHELL MADE, SO THE HARNESS CAN TELL THEM FROM THE
PAGE'S. `demo/verify.mjs` waits for a page to produce its first assert
before it starts timing out, and the test for "has it produced one yet" was
`asserts.length === 0`. These two land at t+0 on EVERY shelled page, so
that test became false immediately and the wait never engaged again.

MEASURED the day they landed: `/archive/radio/` makes 34 asserts, the suite
collected **2**, and reported **13/13 green**. A green suite with no
coverage, across the 28 demos that declare `settleMs`, and nothing about it
looked wrong from the outside.

⚠️ IT IS A COUNT, NOT A FLAG ON EACH ROW. The harness only needs to know
where the page's own asserts begin, and a count says that without changing
the shape of `asserts`, which other things read.

<a id="set-and-log"></a>

## shell.mjs, set() and log()

Both of these are thin now: the cell and the line are written by
`setCell()` and `addLine()`, which `createReport()` hands to `/kit/` too,
so a specimen in the sandbox is filled by the same code a demo is. What
stays here is the half that belongs to the page rather than to the
surface: the declaration check, the published value and the capped record.

<a id="assert-quiet"></a>

## shell.mjs, assert()

🔴 A PASSING CHECK IS NOT A MESSAGE. Every assert used to write a prose
line into the log, so a page with nine checks opened with nine sentences
nobody reads — `ok their real score compiles — 25 rows` — and a real event
afterwards had to be found among them. Reported as "slop log", and the
word is right: the log is for things that HAPPENED, at the moment they
happened. A check that passed did not happen, it held.
⚠️ A FAILURE IS a message, and keeps its line — that is the asymmetry, and
it is the whole rule. The tally goes out once, from `ready()`.
⚠️ Nothing parses these lines: the harness reads `__demo.asserts`, which is
unchanged, so per-demo counts are unaffected by this.

<a id="assert-detail"></a>

## shell.mjs, assert(), the failure detail

🔴 A SECOND LINE, NOT A MIDDOT, AND THIS ONE LINE STAMPED THEM
EVERYWHERE. Every failing assert on every shelled page comes through
here, so a sweep of reader-facing strings cannot catch the formatter that
puts one back on each of them: that is how the em dash sweep of 418
joins ended up minting `·` at the same rate, under a comment in this
file calling it "already this project's separator".

The detail is not a second clause of the label, it is the evidence for
it, so it goes on its own line. `.pos-m` is `pre-wrap` (see shell.css,
which keeps it that way so the log can align itself with spaces), so a
newline here is a newline on screen, and the two spaces indent the
evidence under the claim.

<a id="controls-row"></a>

## shell.mjs, __demo.controls

🔴 THE CONTROL ROW ITSELF, so a page can MOVE it rather than build a
second one. `videoradio` wants its buttons inside the picture's box and
under the screen, the way a player's chrome sits; hand-rolling that row
would give the project a fourth set of buttons and would take them out
of `.pos-controls`, which is what `verify.mjs` presses on every page.

<a id="report-surfaces"></a>

## shell.mjs, __demo readoutEl and logEl

The two surfaces the shell made, and the box round them when they are
joined (`null` when they are not).

🔴 HANDED OVER RATHER THAN LOOKED UP, BECAUSE THE LOOK-UP DOES NOT WORK.
`/crate/` wants its readout inside its own upload block and asks for it
with `d.el.querySelector('.pos-readout')` — and `d.el` is `.pos-body`
while the readout is a SIBLING of it, so that query has always answered
`null`: the class is added to nothing, the row is never moved, and the
`hidden` that was meant to keep four empty cells off the page until an
upload runs is never set. It is the same shape as `d.button(id)`
searching the control row for a button a page had moved. A page that
wants a surface somewhere else is told where it is.

<a id="run"></a>

## shell.mjs, __demo.run()

Run a registered handler without a button.

🔴 THIS EXISTS SO THAT "RUN THE CHECKS" CAN STOP BEING A BUTTON. Eleven
pages carried one, and it is harness machinery showing through into a
page a person is meant to read — `shout` already wrote the argument down
beside its own: *it made the asserts OPTIONAL, which is the wrong default
for the only thing that can say it worked.* A handler is a named piece of
work; a control is one way to start it, and it was never the only way.
The checks now run at the end of whatever produced the numbers they read,
which is also the first moment they can be true.

<a id="button"></a>

## shell.mjs, __demo.button()

A control this shell built, by id, WHEREVER THE PAGE HAS PUT IT.

🔴 IT USED TO SEARCH THE CONTROL ROW ONLY, AND MOVING A BUTTON BROKE IT
SILENTLY. Pages move controls on purpose and are told to: `/videoradio/`
moved `Run in VR` under its sentence, `/tapes/` moves its own row, and
`/archive/radio/` moved `Automate` into the granulator block on instruction. The
button still worked; `d.button(id)` returned null, so every check that
read its state reported `no button` about a control plainly on the page.
MEASURED as three red asserts the moment `Automate` moved.

⚠️ A MAP BUILT AT MOUNT, NOT A DOCUMENT QUERY. `[data-id]` is not unique
to this row: a transport bar's extras carry one too, and a page could
easily own a third. The shell knows exactly which elements it made, so it
remembers them instead of going looking.

<a id="create-report"></a>

## shell.mjs, createReport()

THE READOUT AND THE LOG, AS ONE COMPONENT.

🔴 IT LIVES HERE RATHER THAN IN `demo/shell/<name>.mjs`, AND THAT IS A
DELIBERATE BREAK WITH THE ONE-FILE-PER-COMPONENT CONVENTION. Every other kit
module — slider, choice, table, presence — starts with
`import { el } from './shell.mjs'`, so a file of its own here would make
`shell.mjs` import a module that imports `shell.mjs` back. A cycle in the
frame every page mounts is not worth a filename, and the alternative (a third
file holding `el` and `fmtNum` so the cycle can be broken) is a new module
whose only job is to work around this one. These two surfaces are also not
controls a page drops in: no page has ever built one, `mount()` has always
made both, and the 120 lines of measured comment about them were already in
this file. So the COMPONENT is `createReport`, exported, and `/kit/` builds
its specimens with the same call `mount()` makes.

Two arrangements, and a page chooses with one flag:

 joined (default)  `top` is nothing, `foot` is ONE surface at the bottom of
                   the page with the readout sitting on top of the log
 split             `top` is the readout, above the controls
                   `foot` is the log, under the page

🔴 JOINED IS THE DEFAULT SINCE 2026-09-28, AND THE SURFACE IS `createGlue`'S.
Instructed: *"global: move all reading sections atop of the logs and glue
them (you have patterns). use you new glueing code for this, see the kit"*.
The look was always `.pos-glue` in shell.css — one border, a 1 px seam of
`--line`, children giving up their own edges — but the ELEMENT was built here
with two lines of `el('div', 'pos-glue pos-report')`, because `glue.mjs`
imported `el` from this file and importing it back would have been a cycle.
`glue.mjs` makes its own element now, so there is one function in this kit
that makes a glued surface and a report is one of the things it makes. The
seam between the readout and the log is therefore the same seam
`instrument-panel.mjs` gets, from the same `gap: 1px` over the same ground.
⚠️ AND `createGlue` UNWRAPS A GLUE OF ONE, which is what a report holding
only a readout now is: `showLog: false` hands one part over and gets that
part back, wearing `.pos-report` and its own single border. That is the same
picture the wrapper drew and one element less to hide, which is the case
`/videoradio/` has: it hides `.pos-readout` by name for full screen, and a
wrapper round it would have stayed on screen as a band of its own two edges.

🔴 AND A CONTAINER WITH NOTHING IN IT MUST NOT PAINT ITS EDGES, WHICH IS THE
WHOLE REASON THIS FUNCTION DECIDES WHAT GETS APPENDED RATHER THAN THE PAGE.
`readout: null` used to leave a childless `<div class="pos-readout">` on the
page, and shell.css gives that div `border: 1px solid var(--line)`: MEASURED
on `/typist/` at **2.0 px tall with 0 children**, a full-width band made
entirely of a box's own two borders, 24 px above the controls. A horizontal
rule nobody wrote, reported as "old UI creeping in". Joining the two
surfaces gives that trap two new faces and both are answered here: a joined
report holding only a log, or only a readout, draws ONE border and no seam,
because a `display: none` child takes no `gap` in a flex column; and a joined
report holding NEITHER is never appended at all, so there is no box to paint.

<a id="even-cells"></a>

## shell.mjs, createReport(), even cell count

🔴 AN EVEN NUMBER OF CELLS, AND WHEN IT IS ODD THE ANSWER IS TO CUT ONE.
The row was `repeat(auto-fit, minmax(96px, 1fr))` when this rule was
written, so a phone got two columns and an odd count left a HOLE in the
last row — a slot of a different colour with nothing in it, which reads as
a cell that failed to load rather than as a cell that does not exist. The
row is flex now and fills at every width, so the rule is EDITORIAL: a
readout with an odd cell always has a weakest cell — usually one that
cannot change (a constant read out of a playlist, a codec name) or one a
neighbour already implies — and being made to find it is the point.
Padding with a blank is the wrong repair: it adds a thing to look at that
says nothing. Thirteen pages were odd when this landed and every one of
them got BETTER for losing a cell.

It throws rather than warns so the suite catches it on the next run: every
demo is driven by `verify.mjs`, so a page that breaks this cannot reach a
visitor without going red first.

<a id="rows"></a>

## shell.mjs, createReport(), rows and the six-cell cap

🔴 A FIXED NUMBER OF ROWS, ASKED FOR 2026-09-21 AS *"why not 5x2 cells?"*
and then as *"1xsomehting / 2xsomehing etc"*. The flex row fills every line,
which is right when a page does not care where the break falls and wrong
when the cells are PAIRS: `written` and `not erasure` belong beside each
other and landed in different rows at whatever width the browser chose.
🔴 IT IS ROWS AND NOT COLUMNS, AND THAT IS THE OWNER'S CORRECTION RATHER
THAN A PREFERENCE. This took a `cols` for about an hour. A caller who says
`cols: 5` has done the division themselves and can get it wrong; a caller
who says `rows: 2` is naming the SHAPE, and the columns fall out of the cell
count. `1 x something` and `2 x something` is how the owner said it.
✅ AND IT LEANS ON THE EVEN RULE ABOVE, WHICH IS WHY THAT RULE EARNS ITS
KEEP TWICE. An even count divides by 2 exactly, so `rows: 2` is always a
full rectangle and never a hole in the last row. The rule that used to be
editorial is structural again the moment a caller asks for a shape.
⚠️ IT IS OPT IN AND THE FLEX ROW IS STILL THE DEFAULT, because that row was
measured filling at thirteen widths and both counts, and nothing about the
pages using it has changed.
⚠️ A CUSTOM PROPERTY AND NOT `style.gridTemplateColumns`. A component that
varies a property per instance sets a custom property, never the property,
or no stylesheet can ever take it back: `video-panel.mjs` wrote
`style.aspectRatio` from an option and left one page's picture square on a
16:9 screen with the way out of full screen off the top of it.
🔴 AND ABOVE SIX CELLS IT IS NO LONGER OPT IN, SINCE 2026-09-22. Reported
against `/plai/`'s eight cell readout, which the flex row laid out as
**SEVEN AND ONE**: *"make rule of max 6 in a row or go full 2 x 4. no odd
nrs"*. A lone cell on its own line reads as a cell that failed to load,
and at eight cells there is no width where the flex row does the right
thing by accident.
⚠️ **THE OPT IN WAS THE DEFECT.** `rows` was added on 2026-09-21 for a ten
cell readout that wrapped 7 and 3, and it fixed that page and left every
page written afterwards free to make the same shape again. A rule nobody
has to remember is the only kind that holds.
✅ **SIX IS THE CAP AND THE ROWS ARE BALANCED**, which is the two halves of
what was asked: `ceil(n / 6)` rows, then the columns fall out of that, so
eight is 4 and 4 rather than 6 and 2. Nothing changes at six or fewer,
which is every page that was measured filling at thirteen widths.
⚠️ A CALLER'S OWN `rows` STILL WINS, because a page that has named its
shape has a reason the cell count cannot see: `/pack/`'s `written` and
`not erasure` are a PAIR and belong on one line.

<a id="readout-sm"></a>

## shell.mjs, createReport(), size sm

⚠️ `sm` IS A QUIETER VALUE AND NOT A SMALLER PANEL. The key stays 9.5 px
because it is the half a reader scans down.

<a id="pending-unit"></a>

## shell.mjs, createReport(), the unit

⚠️ THE UNIT IS PART OF THE VALUE, SO IT IS HIDDEN WHILE THERE IS NONE.
A pending cell reading a lone `%` or `px` is a unit with nothing under
it — it looks like the number went missing, when in truth it has not been
measured yet. CSS hides it on `[data-state="pending"]`; it stays in the
DOM so `set()` can re-append it without rebuilding the cell.

<a id="glue-report"></a>

## shell.mjs, createReport(), the glued box

`createGlue` puts `pos-glue` on: the LOOK, one border, a 1 px seam and the
children giving up their own edges, shared with every other glued pair on
the site. `pos-report` is added here and is only this box's own position on
the page. Two classes because they are two facts, and the second one is the
half that is not reusable.

⚠️ THE HIDDEN READOUT IS STILL HANDED OVER, NOT FILTERED OUT. A page with
`readout: null` or `showReadout: false` gets a surface holding a
`display: none` readout and a log, which draws one border and no seam
because a `display: none` child takes no `gap` in a flex column. Filtering
it would unwrap the glue to a bare `.pos-log` and take the element off the
page, and three pages reach for `.pos-readout` by name to assert that it is
present and paints nothing.

<a id="empty-report"></a>

## shell.mjs, createReport(), nothing to draw

🔴 AND WITH NEITHER HALF TO DRAW, NOTHING IS APPENDED AT ALL. This is
`/typist/`'s defect in the joined arrangement: an empty bordered container
renders as a full-width band made entirely of its own two edges, MEASURED
at 2.0 px with 0 children and reported as "old UI creeping in". `foot`
stays null, so there is nothing for `mount()` to put on the page.

<a id="set-cell"></a>

## shell.mjs, setCell()

Write one readout cell.

🔴 NOTHING MEASURED PRINTS AS ABSENT, AND THAT INCLUDES `''` AND `NaN`.
`null` always did; the empty string did not, so `d.set('invented', '')`
emptied the cell and left the unit standing alone — a `%` with no number in
front of it. And a page that pre-sets a counter to 0 before anything has
happened is worse: a zero reads as a very confident measurement. Pages hand
over `''`/`null` until they have something; this turns all three into one
pending cell: EMPTY, with the unit hidden too.

⚠️ EMPTY, NOT AN EM DASH — 2026-09-13. The placeholder used to be `—`, on the
reasoning that a cell has to show it is a cell. It does not: the key above it
and the box around it already say that, and four dashes in a row read as four
failed readings rather than as four cells waiting. The empty cell is quiet
and says the same thing.

<a id="add-line"></a>

## shell.mjs, addLine()

Write one log line.

⚠️ THREE CELLS, NOT ONE PADDED STRING. A line was time + text in one node, so
a message longer than the box wrapped back to COLUMN ZERO — the continuation
started under the timestamp and read as a new entry with no time.
Photographed on `mirror`: "…spans 157" then "of 255" hanging off the left
margin. A grid gives the message its own column to wrap inside.

<a id="tap"></a>

## shell.mjs, the log tap

🔴 EVERY LOG LINE GOES TO THE DEV SERVER AS WELL, SO A SESSION CAN READ WHAT
A PAGE SAID. Asked for 2026-09-21: *"build a way to get the logs and debug
(like you did with tap)"*, after an afternoon where every question about what
a page was doing cost the person at the desk a screenshot.

🔴 IT CAN ONLY EVER RUN ON THIS MACHINE, AND THAT IS THE WHOLE SAFETY OF IT.
The route is `demo/server.mjs` only and there is none in
`workers/view/src/index.js`, so a deployed page has nowhere to post even if
this fired. The hostname test is the second guard, in front of the first, so
a visitor's browser never makes the request at all rather than making one
that 404s.

⚠️ BATCHED AND `keepalive`, NEVER ONE FETCH A LINE. A page can put a dozen
lines out in a frame, and `/reel/` is this project's standing lesson about
what a page quietly does on its own behalf. Lines are collected and flushed
on a timer, and the last flush survives the tab closing.

⚠️ AND A FAILURE HERE IS SILENT ON PURPOSE. If nothing is listening, the page
must behave exactly as it does today: no console error, no log line about the
logger, no retry. A debugging aid that changes what it is watching is worse
than none.
🔴 AND THERE ARE TWO DESTINATIONS, BECAUSE THE SECOND ONE ALREADY EXISTED.
Asked 2026-09-21, on being told the dev server had to be restarted to pick up
the route: *"just make it worker?"* — and the worker is already built and has
been since 2026-09-12. `createShipper()` below posts to
`https://pub.positron.studio/log`, `CLAUDE.md` documents reading it back at
`https://pub.positron.studio/logs?format=text`, and SIX pages wire it by hand
for the headset and phone cases.
✅ SO THIS IS A UNIFICATION RATHER THAN A THIRD MECHANISM. One function, two
destinations, and every page's log reaches whichever one can be read.
 **local**, on `127.0.0.1`: the dev server's `/_log`, which appends to a
 file. Free, private, on by default, and it is how a session reads a page
 somebody is looking at on this desk.
 **`?logs=1`**, anywhere including the deploy: the Worker, which is how a
 page on a phone or a headset or on positron.studio can be read at all.
🔴 THE WORKER HALF IS BEHIND A FLAG AND MUST STAY THERE. A deployed page that
shipped every visitor's log by default is a page opening something on load,
which is this project's most expensive named defect and cost `/reel/` a
newsreel on every visit. The flag is the person saying *watch this one*.
⚠️ AND THE RING BUFFER THIS POSTS INTO USED TO EVAPORATE IN UNDER A MINUTE.
MEASURED 2026-09-12: posted at 02:07:46, read back fine, gone by 02:08:32,
because it was an in-memory array on a Durable Object. It is persisted now.
Any *the device reported nothing* conclusion drawn before that date is
worthless.

<a id="tap-worker"></a>

## shell.mjs, the log tap, worker first

⚠️ THE WORKER FIRST, because it is the one a person asked for by adding a
flag, and because `createShipper` does its own batching and its own repeat
collapsing. Built on the first line rather than at module load, so a page
nobody asked to watch never constructs it.

<a id="pagehide"></a>

## shell.mjs, the log tap, pagehide

⚠️ `pagehide` AND NOT `unload`. `unload` is not fired at all in some
conditions and blocks the back/forward cache where it is; `pagehide` is the
one that still runs, and `keepalive` is what lets the request outlive it.

<a id="favicon"></a>

## shell.mjs, favicon()

The favicon: p.s since 2026-10-14, replacing β+ (2026-10-06), chosen from
the trials on /kit/logo/#p-s: ps with no dot at 16, p.s at 32 and 48, the
mono face at 600 tracked -0.12 em with the dot in the accent, on #0b0e14.
`psIcons()` in workers/view/build.mjs draws it with no browser (resvg) and
writes `/favicon.ico` with the apple touch icon and the manifest beside it.
`demo/favicon.ico` is the same bytes, kept only because the dev server
serves files off disk; the build says when the two differ.
Declared here so a page that declares nothing does not leave the browser to
guess, and so nothing logs a 404 for it.

<a id="arm-video"></a>

## shell.mjs, armVideo()

ARM A VIDEO INSIDE THE GESTURE.

iOS grants autoplay only while a user activation is live. Every live demo
here does work first — wait for the publisher, wait for the manifest or the
whip leg, negotiate WHEP — and by the time it calls play() the activation
is long gone. On a real iPhone that produced:

 11.65  WHEP negotiated in 1952 ms
 11.65  play refused: NotAllowedError

with the connection healthy behind it (rtt 16 ms, 31 fps) and a black box
in front. Calling play() synchronously in the handler, before any await,
spends the activation while it still exists; the element then keeps playing
when a source arrives later.

<a id="play-or-prompt"></a>

## shell.mjs, playOrPrompt()

Play, or ask. A refused play() must never leave a black rectangle with no
explanation — that is indistinguishable from a broken stream.
Play, and offer a tap ONLY if the browser refused for policy reasons.

It used to prompt on any rejection, which produced a second full-width
yellow button competing with the page's own primary control — and worse, a
button that could not work: the measured iOS failure rejected play() for
having no data, and no amount of tapping conjures a fragment. Only
NotAllowedError is a permission problem. Everything else is the player's
job and its watchdogs are already on it.

<a id="match-aspect"></a>

## shell.mjs, the MediaRecorder mime note, and matchAspect()

The mime a MediaRecorder will actually accept here, WebKit included.

Three demos each carried the same WebM-only list and `d.fail()`d when nothing
matched — `record`, `capture` and `show`. **WebKit records MP4/H.264 and
never WebM**, so on a phone all three did not degrade: they stopped. And
`verify.mjs` could not see it, because desktop Chrome matches the first
candidate and never reaches the branch. Exactly the shape of the
`canPlayType` bug that left 291 asserts green across three pages that had
never played a frame.

WebM first where it exists, because everything downstream was built and
measured against it; MP4 after, so a WebKit browser records something rather
than nothing.

WHAT THIS DOES NOT PROMISE: that the result plays back through this project's
replay paths on WebKit. MSE's appetite for fragmented MP4 is a separate
question and is unverified here — no iOS device has ever run these pages.
This fixes recording, and claims only that.
Keep a <video> the shape of what is INSIDE it.

An element with a width and no height uses the intrinsic ratio — but only
once metadata has arrived. Before that a video is 300x150, so a 16:9 stream
starts life in a 2:1 box and the page jumps when the first frame lands; a
portrait phone stream jumps further. And any page that pins a height gets a
letterbox inside a box that is the wrong shape to begin with.

So: a stated ratio up front, replaced by the real one as soon as the source
says what it is, and again if it CHANGES — an SFU can switch a sender's
resolution mid-call, and `resize` is the only event that reports it.

<a id="benign-notices"></a>

## shell.mjs, BENIGN_NOTICES

🔴 WINDOW `error` EVENTS THAT ARE NOT FAULTS. EXACTLY TWO STRINGS, AND
NOTHING IS MATCHED BY PREFIX, SUFFIX OR SUBSTRING.

Both are the SAME browser notice in two spellings: the one every engine
sends today, and the one Chrome sent before it was reworded. It means an
observer callback resized something the observer was watching, so the layout
loop did not settle in a single pass and the remaining notifications were
delivered on the next frame instead. Nothing is lost, nothing is broken, and
the next frame fixes it. There is no `e.error` behind it, because no
exception was ever thrown: the browser is narrating its own scheduling.

🔴 WHY IT HAD TO BE FILTERED AT ALL. `guard()` turned every window `error`
into `d.fail()`, which logs in the `bad` colour AND sets `__demo.failed`. So
a page with a diagram, a grain scope or a strip in it could fill its own log
with three copies of a browser scheduling note, in the colour reserved for a
page that died. Three kit modules observe sizes, so that is almost any page,
and mark the run failed in the one field a reader consults to find out
whether it did. PHOTOGRAPHED 2026-09-20 with a log box holding nothing else:
*"Excessive scary logging of nonsene"*. This project has already decided
that this log must not cry wolf, over a single ⚠️ in `/items/`.

🔴 AND IT IS FILTERED HERE, WHERE IT ARRIVES, RATHER THAN AT EVERY OBSERVER.
One test beats three modules each remembering to be careful, and a page that
grows a fourth observer is covered without being told.

⚠️ THE CLASS IS NOT SWALLOWED. A window `error` with no `e.error` and a
message this file does not recognise is still a real fault and still lands
in the log in red: a `SecurityError` from a cross-origin script arrives in
exactly that shape. Only these two strings are dropped, so the next page
somebody mutes has to be muted on purpose, by name, here.

<a id="benign-notice"></a>

## shell.mjs, benignNotice()

Is this window `error` event one of the notices above?

⚠️ IT ALSO REQUIRES `e.error` TO BE ABSENT. A page is free to `throw new
Error('ResizeObserver loop limit exceeded')` from its own code, and that one
carries a real Error object with a real stack. The notice never does.

<a id="uncaught"></a>

## shell.mjs, early error listener

🔴 AN UNCAUGHT ERROR ANYWHERE ON A PAGE MARKS IT FAILED, SINCE 2026-10-14.
Listened for from the moment this module loads, so a throw in a page's own
module (an addNodes that refused, found on grain-rig) is not a lower assert
count with `failed: null`. One before mount() is kept and handed over then;
one that stops mount() ever running still publishes a failed `__demo`.

<a id="shipper"></a>

## shell.mjs, createShipper()

Batched, fire-and-forget device reporting.

A phone cannot be attached to a debugger, so the page posts instead. The sink
is the publisher Durable Object, whose lifetime is already "somebody is
watching": POST /log, read back with GET /logs?format=text.

Lives here because two demos have now needed it and the second one called it
before noticing it was local to the first. Diagnostics must never be able to
make the page worse than the problem being diagnosed, hence the swallowed
failure, the 2 s batch, and the repeat collapsing — one phone sent the same
fragLoadError ~30x in a run and pushed everything useful out of the ring.

<a id="mark-headset"></a>

## shell.mjs, markHeadset()

Give a demo page the headset layout when it is being read through one.

⚠️ THE INDEX ALREADY DID THIS AND THE DEMOS DID NOT, which is backwards: the
index is a list you scan once and a demo is a page you stand in front of
while a number changes. The reason it matters is a measurement, not a
preference — the Quest Browser opens in DESKTOP MODE by default, it IGNORES
`<meta viewport>`, and its window is 1280 x 670 CSS pixels. 670 is about half
a laptop viewport, so a page's paragraph, readout, controls and log are not
on screen together, and a readout that scrolls out of view mid-measurement is
exactly the thing that gets reported as "the page is broken".

⚠️ The sizes were UNCONFIRMED until 2026-09-14, when /floor/ was photographed
in the Quest browser and the readout came back with a 20 px band of line
colour between every cell — the one `.xr` rule that touched the GAP rather
than the cells. shell.css says which numbers to move, and now says why that
one is not among them.

Capability, never a user-agent string: a headset browser is Chromium wearing
a Chromium UA, and research/quest-xr §1.7 measured that a Quest 3 and a 3S
cannot be told apart by user agent at all.

<a id="test-header"></a>

## shell-test.mjs, file header

demo/shell/shell-test.mjs: the DOM log's cap and the device-log shipper,
with a fake document and no browser.

  node demo/shell/shell-test.mjs

FOUR OF THE 6 ARE NEGATIVE CONTROLS, written so the bug they name fails them.
What `mount()` draws is graded by every page's harness run, not here.
