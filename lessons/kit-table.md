# Kit lessons: table.mjs

The long comments cut from `demo/shell/table.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-table.md#<anchor>`.

<a id="header"></a>

## table.mjs, file header

demo/shell/table.mjs — rows in columns you declare, rather than columns
somebody else already decided.

🔴 WHY THIS EXISTS, AND IT IS A CORRECTION. `/kurenniemi/` needed a list of
122 archive records with the date, the holder, the name, the size and the
licence each in its own column, the name a link, and one line per row. It was
built on `messages.mjs`, which has FIVE HARD-CODED COLUMNS — direction, size,
a marker word, the text — chosen for a page that watches relay traffic. Each
new need arrived as another option on that component: a fourth column, a way
to remove the third, a size the caller formats, a switch to stop wrapping.
Four options to describe one table. REPORTED as *"just make reusable
component that take different types of cols"*, which is the right answer and
was the right answer two options earlier.

⚠️ IT DOES NOT REPLACE `messages.mjs`. That one renders a MESSAGE — a thing
with a direction and a size that arrived over a wire, wrapped because a line
of JSON on a phone must not be cut. This renders a RECORD. Two shapes, two
components; the mistake was making the first one grow a spec it did not want.

⚠️ A REAL GRID, NOT PADDED MONOSPACE. The page it replaces lined its columns
up by `padEnd()` inside one text cell, which works only while every glyph is
the same width and breaks the moment anything is not — and it cannot give a
column its own colour, alignment or link.

<a id="column"></a>

## table.mjs, Column typedef

@typedef {object} Column
@property {string} key        the field this column reads from a row
@property {string} [label]    a heading. Any column having one gives the
 table a header row; with none anywhere there is no header at all.
@property {number} [width]    a fixed track, in px
@property {boolean} [grow]    take the remaining width. One column should.
@property {'left'|'right'} [align]
@property {string} [link]     the field holding a URL. The cell becomes a
 link to it; a row with nothing there still shows its value, unlinked,
 because "no address" is a fact about the record and not a reason to hide
 its name.
@property {boolean} [hi]      full-strength text rather than dim
@property {string} [hover]   a field whose value becomes this cell's `title`,
 for when the cell SHORTENS what it shows. A column of licences reads down
 only if `CC BY-NC-SA 4.0` is three or four characters wide, and an
 abbreviation nobody can expand is worse than a long word. Defaults to the
 cell's own text when `clip` is set.
@property {boolean} [clip]    ONE LINE, cut with an ellipsis, full value on
 `title`. ⚠️ CLAUDE.md says an ellipsis means the content is in the wrong
 place, and that rule is about a MEASUREMENT or a label being squeezed. A
 proper name is the case it does not cover: 122 titles wrapping to two and
 three lines each is not a table anybody can read down, the full text is one
 hover away, and the cell is usually a link to the whole record besides.

<a id="create-table"></a>

## table.mjs, createTable, note, stick and minRows

@param {object} o
@param {Column[]} o.columns
@param {number} [o.cap]      most rows kept
@param {string} [o.empty]    what to say with nothing in it
@param {string} [o.note]     a field whose value becomes the ROW's `title`.
 ⚠️ FOR A SENTENCE THAT HAS NO COLUMN AND SHOULD NOT GET ONE. A record can
 carry a paragraph — *"a page of his diary, photographed"* — that is worth
 having and would ruin the grid: a column wide enough for it starves every
 other, and a narrow one shows four words and an ellipsis, which is the
 signal that a thing is in the wrong place. Hovering is the right weight for
 a fact you want occasionally.
@returns {{el:HTMLElement, set:(rows:object[])=>void, add:(row:object)=>void,
          clear:(msg?:string)=>void, count:()=>number, columns:Column[]}}
@param {boolean} [o.stick]  keep the newest row in view as rows arrive.

🔴 FOR A TABLE THAT IS BEING WRITTEN TO WHILE SOMEBODY WATCHES IT. Asked for
on `/dump/` 2026-09-20 as *"scroll dump to bottom always"*, where a keyboard
can put 733 messages on screen in eight seconds and the newest row is the
only one anybody is looking at. Every other table here is `set()` once from a
corpus, so this is off by default and no existing page changes.

⚠️ IT STANDS DOWN WHILE THE KEYBOARD IS IN THE TABLE. `table.mjs` gained
arrow key navigation on 2026-09-19 and it scrolls the focused row into view;
a stick that fired on every arriving row would drag the view off that row
between two presses, so the two controls would fight and the newer one would
win at random. Focus inside the body means a person is steering, and steering
outranks following.
🔴 `minRows`: THE TABLE ITSELF IS THE EMPTY STATE, AT A HEIGHT THAT IS
CHOSEN RATHER THAN LEFT TO THE CONTENT. Asked for on `/dump/` 2026-09-25:
*"show empthy tables / miditables immidately with fixed heigh. no texdt in
them until dumps arrive"*, replacing two captions, `nothing asked yet` and
`press Listen, then play something`.

🔴 IT IS A REVERSAL AND THE THING IT REVERSES IS FOUR DAYS OLD ON THE SAME
PAGE, so it is written down here rather than left for somebody to undo.
`shell.css`'s `.pos-midilog[data-reserve]` records *"press the status
button, then play something - rm just leave room for midi table"*, from
2026-09-21, and its own note says **NO ROW, NO HEADING, NO TEXT. Just the
space**. That was right about the ROOM and this is the same request one step
further: the room stops being a blank rectangle and becomes the table, drawn
empty. Both asks are about a box that does not rearrange the page when the
first message lands; they disagree only about what stands in the box until
it does.

⚠️ AND IT BUMPS INTO `an empty box is a line`, WHICH POINTS THE OTHER WAY
AND IS NOT IN CONFLICT HERE. `roll.mjs:111` argues for a caption because a
container with nothing in it must not paint its own edges, and this project
has paid for that three times (`/typist/`'s 2 px band, `.pos-controls`'s
14 px one, `drop.mjs`'s footer). **A framed table is not an empty box.** Its
heading names its columns and its ruled rows show how many records will fit,
which is structure a reader can see and read meaning off. What that rule
refuses is a rectangle saying nothing, and this is the opposite of one.
⚠️ SO THE CAPTION GOES AWAY ENTIRELY WHEN `minRows` IS SET, INCLUDING ONE
PASSED TO `clear(msg)`. A sentence inside a framed table lands in the first
ruled row and reads as a record, which is worse than either answer on its
own. A table wants one empty state, not two that can both be on screen.

🔴 AND THE HEIGHT IS FLOOR AND CEILING AT ONE NUMBER, WHICH IS THE HALF
THIS PROJECT HAS ALREADY PAID FOR. `demo/wish/index.html` records a box that
was *"7 lines for one connection and 16 for the next"* and therefore moved
the log and the end of the page on every press. A table that grows as rows
land does that to everything under it, and on `/dump/` rows land in
hundreds. So `minRows` sizes the scrolling body exactly and it does not
grow: past that many records the box scrolls, the way `/wish/`'s does.
⚠️ WHICH IS WHY IT IS NOT `--tbl-h`. That is a MAX and a table under it is
whatever height its rows make it, which is the right answer for every table
that is filled once from a corpus and the wrong one for a box being written
into while somebody watches.
⚠️ THE ROW HEIGHT IS `--tbl-row-h` AND IS NOT COMPUTED HERE. `shell.css`
declares it beside the padding it is made of and already reserves rooms with
it, so a change to a row's padding moves the reservation with it rather than
leaving a second number behind. A measurement in two files is a measurement
that will disagree.
⚠️ AND A PLACEHOLDER IS NOT A ROW. `.pos-tbl-rest` carries no `.pos-tbl-row`
class, is `aria-hidden`, takes no focus and is not counted by `count()`.
`roll.mjs` learned this the expensive way: a placeholder wearing the row's
class took nine asserts red at once, each reporting five rows on a page with
four chords.

<a id="one-grower"></a>

## table.mjs, createTable, exactly one grow column

🔴 EXACTLY ONE COLUMN MAY GROW, AND SAYING SO IS CHEAPER THAN DEBUGGING IT.
With none, the table does not fill its box and the last column floats in the
middle of nowhere; with two, neither has a predictable width and the row
reflows as content changes — which is the defect the grid exists to remove.

<a id="grow-floor"></a>

## table.mjs, createTable, the growing track's floor

🔴 THE GROWING TRACK HAS A FLOOR, AND THE FLOOR IS NOT A NUMBER IN THIS
FILE. `minmax(0, 1fr)` let the one flexible column pay for every fixed one
until it was nothing at all: PHOTOGRAPHED on `/making/` with `FILE` set one
letter per line beside an empty cell, and MEASURED afterwards at 0 px on a
phone and 11 px at 621. `--tbl-grow` is declared in `shell.css` beside
`.pos-tbl`, so the measurement lives with the rest of the layout and a page
can override it on its own table without editing this component.
⚠️ AND THE ROW'S `min-width` IS `min-content`, NOT A TYPED WIDTH. With a
floor in the track list, the sum of the tracks IS the smallest the row can
be, so the browser computes what used to be typed as 560 px, from the very
column list the caller passed, which is the one thing that cannot drift
away from it.

<a id="hidden-head"></a>

## table.mjs, createTable, header over nothing

🔴 A HEADER OVER NOTHING IS THREE WORDS LABELLING AIR. An empty table used
to draw `file · size · state` above a line saying nothing had been dropped
yet, which is a column heading for a column that does not exist and a
promise the table is not yet keeping. Reported on /crate/, pointing at each
of the three in turn.
The header is HIDDEN rather than removed, so the moment a row lands it is
there and the rows below it line up under names that were already measured.
Building it late would size its columns against the first row instead of
against the track list every row shares.

<a id="focus-row"></a>

## table.mjs, createTable, focusRow

Put the keyboard on one row, and say whether there was one to put it on.

🔴 IT SCROLLS THE TABLE'S OWN BOX AND NOTHING ELSE. Reported 2026-09-20:
*"do not make keyboard focused item move away from viewport of table when
keep using keyboard"*. This was `row.focus()` followed by
`row.scrollIntoView({ block: 'nearest' })`, and **both of those scroll
every scrollable ancestor, the document included**. So stepping through a
list moved the page under the table as well as the row inside it, and the
two scrolls fight: `focus()` goes first on its own heuristic, then
`scrollIntoView` corrects from wherever that left things.

⚠️ `preventScroll: true` IS THE HALF THAT IS EASY TO MISS. Without it the
arithmetic below is correct and then the browser scrolls anyway, because
focusing an element is itself a scroll request.

⚠️ AND THE ROW IS KEPT OFF THE EDGE BY ONE ROW'S HEIGHT. `nearest` puts
each new row flush against the boundary, so somebody stepping down reads
the list from a row with nothing under it and no idea what is coming. A
row of margin is the cheapest thing that makes a list feel navigable, and
it costs nothing at the ends because the clamp below cannot scroll past
them.

<a id="keep-in-view"></a>

## table.mjs, createTable, keepInView

Bring one row inside the scrolling box, by moving THAT box only.

🔴 RECTS, NOT `offsetTop`, AND THE FIRST BUILD OF THIS USED `offsetTop` AND
WAS WRONG BY 579 PIXELS. `offsetTop` is measured from the `offsetParent`,
and `.pos-tbl-body` is `position: static`, so the offset parent is whatever
positioned ancestor happens to be further up the page rather than the
scroller. The number looked like a position inside the scrolled content and
was a position inside something else entirely.
⚠️ A RECT IS MEASURED FROM THE VIEWPORT AND THAT DOES NOT MATTER HERE,
because both rects are read in the same frame and only their DIFFERENCE is
used. Where the page is cancels out.
⚠️ AND ONLY `scrollTop` IS WRITTEN, which is what keeps the document still.

<a id="empty-caption"></a>

## table.mjs, createTable, clear, the empty caption

🔴 AN EMPTY STRING MEANS SAY NOTHING, AND SAYING NOTHING MEANS NO
ELEMENT. `.pos-tbl-empty` carries `padding: 8px 10px`, so appending it
with no text leaves a padded band with nothing in it: a container
painting its own space, which is the same fault as the empty readout
that drew a 2 px rule nobody wrote. A caller that passes '' wants the
table silent, not quietly tall.
⚠️ AND A FRAMED TABLE SAYS NOTHING AT ALL, WHICH IS THE WHOLE OF
      `minRows`. The frame IS the empty state, so a caption here would be a
      second one sitting inside it. See the block above the factory.

<a id="framed-head"></a>

## table.mjs, createTable, clear, the heading over a frame

🔴 THE HEADING STANDS WHEN THERE IS A FRAME UNDER IT, AND ONLY THEN.
      `a column name over nothing labels air` is the rule and it is unchanged:
      what `minRows` puts under the names is ruled rows, so they are naming
      something a reader can see. With no frame this hides exactly as it
      always did, which is what keeps `/pack/`'s assert on it true.

<a id="on-pick"></a>

## table.mjs, createTable, onPick rows

🔴 A ROW A CALLER CAN ACT ON, WITHOUT THE TABLE KNOWING WHAT THE ACTION
IS. Asked for on `/crate/` 2026-09-16: *"no table rework. just make
clickin files playable"*, and the second half of that sentence is the
design. The component gains one callback and no opinion: no play glyph,
no chevron, no second column.

⚠️ A `<button>` ROW, NOT A DIV WITH A CLICK HANDLER. A clickable div is
unreachable by keyboard and invisible to a screen reader, and this is a
list somebody may be working through with tab.
⚠️ AND IT DOES NOT SWALLOW A LINK. A cell may already be an anchor
(`link:`), which is a different destination from the row's own action, so
a press that lands on one is left alone rather than being turned into a
row press.

<a id="roving-tabindex"></a>

## table.mjs, createTable, roving tabindex

🔴 ROVING TABINDEX: ONE STOP FOR THE WHOLE LIST, NOT ONE PER ROW.
Every row used to be `tabIndex = 0`, which is correct for a handful and
wrong for a corpus: `/making/` draws 63 pictures and 26 recordings, so
tabbing past the table meant sixty-three presses to reach the thing
after it. The list is ONE thing you tab into; the arrows move inside
it. This is the pattern a listbox has had for thirty years and the
reason it exists is exactly this.

<a id="arrows-enter"></a>

## table.mjs, createTable, arrows move and Enter opens

🔴 ARROWS MOVE, ENTER OPENS, AND THEY MUST NOT BE THE SAME ACT. Asked
for 2026-09-19: *"allow keyboard nav in tables"*.

⚠️ AN ARROW THAT PICKED WOULD BE A DISASTER ON EXACTLY THE PAGE THAT
ASKED FOR THIS. `onPick` on `/making/` opens a file off the bucket, so
holding the down arrow through 63 rows would fetch 63 pictures nobody
asked to see — the load-on-visit defect this project has already paid
for three times, arriving through the keyboard. Moving focus is free;
opening is a decision, and Enter is where a decision goes.

⚠️ AND FOCUS IS MOVED WITH `preventDefault`, or the page scrolls under
the arrow as well as the focus moving, which puts the row you just
reached somewhere you did not expect.

<a id="above-rests"></a>

## table.mjs, createTable, add above the placeholders

⚠️ ABOVE THE PLACEHOLDERS, NOT AFTER THEM. A frame holds its room open
      with elements, so a plain `append` would put the first real record
      underneath the empty rows that were standing in for it.

<a id="stick-after"></a>

## table.mjs, createTable, add, stick

⚠️ `scrollHeight` IS READ AFTER THE APPEND AND AFTER THE CAP TRIM, or it
is the height of the table one row ago and the view lands one row short
for as long as rows keep arriving.

<a id="mark"></a>

## table.mjs, createTable, mark

🔴 WHICH ROW IS THE LIVE ONE, DECIDED BY THE CALLER AND DRAWN BY THE
TABLE. Asked for on `/crate/` 2026-09-16: *"i do not see which one is
actiev on table"*.

⚠️ IT TAKES A PREDICATE OVER THE ROW DATA, NOT AN INDEX. A page repaints
this list whenever the store changes, and an index survives exactly until
a row is added at the top, which `/crate/` does on every upload. Asking
the caller "is THIS row the one" is the only form that survives a repaint.

<a id="cuts"></a>

## table.mjs, createTable, cuts

🔴 WHAT DID NOT FIT, REPORTED TO THE AUTHOR. The same answer
`createDiagram` gives about a label too long for its box, and for the
same reason: a heading that does not fit is a fact about the column list
somebody declared, and the reader is the one person who can do nothing
about it. `shell.css` stops a heading wrapping and clips it instead; this
is the half that says which one was clipped.

⚠️ IT IS A METHOD, NOT A PROPERTY, BECAUSE A TABLE CANNOT MEASURE ITSELF
UNTIL IT IS ON SCREEN. `createDiagram` measures its own text with a
canvas and can answer while it is being built; a grid's track widths are
the browser's answer to a box it has not been put in yet. So this is read
after mount, from a page's own self-check.

⚠️ AND `measured` IS THE HALF THAT KEEPS IT HONEST. A table inside a tab
nobody has opened, or one with no rows in it yet, has no layout at all
and every cell reads zero wide, which would report every heading as cut,
or with the test the other way round, report a broken table as clean.
"We did not look" answers `measured: false` and no cuts, which is
CLAUDE.md's rule about a probe that could not answer.

@returns {{measured: boolean, width: number,
          cuts: {id: string, where: 'label'|'columns',
                 full: string, shown: string, width: number}[]}}

<a id="cuts-columns"></a>

## table.mjs, createTable, cuts, columns against the box

The columns against the box they were given. This is NOT automatically
a fault: from `min-width: min-content` on the row, a table whose
columns do not fit is dragged sideways rather than squeezed, and on a
phone that is the intended answer and has been since the table existed.
It is reported because on a wide screen it means the column list is too
heavy for a 720 px page, and only the author can decide which column
goes.
