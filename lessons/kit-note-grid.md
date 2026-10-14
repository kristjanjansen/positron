# Kit lessons: note-grid.mjs, note-grid-test.mjs

The long comments cut from `demo/shell/note-grid.mjs` and `demo/shell/note-grid-test.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-note-grid.md#<anchor>`.

<a id="header"></a>

## note-grid.mjs, file header

demo/shell/note-grid.mjs. Note events, drawn where they fall in a pattern.

🔴 ASKED FOR TWICE, 2026-09-21: *"can we see actual notes on timeline in
https://positron.studio/pack/#sessions"*, then *"so can you show notes in
timeline in pack?"*. The events had been decoded since that morning and the
page was printing a COUNT of them, which is the one thing about music that
carries no music in it.

🔴 IT IS NOT `strip.mjs` AND THAT IS A DECISION. A strip draws lanes of marks
against a DECK, in milliseconds, and its mark colour is reserved: the project
rule is that colour says HOW A MARK LANDED and never which lane it is in. A
Circuit pattern has no milliseconds in it (sixteen steps, no tempo stored),
and the thing worth seeing is PITCH, which a strip has no axis for. Bending
either one to fit would have cost the rule or cost the picture.

🔴 AND IT IS NOT A PIANO ROLL OF THE WHOLE SESSION EITHER, for a reason that
is about the instrument rather than about drawing. A session holds sixteen
patterns of sixteen steps; they are alternatives, not a timeline, so laying
them end to end would invent an order the file does not have, and stacking
them on one x axis would overlay sixteen different patterns at step 1. One
ROW PER PATTERN is the only arrangement that says what is there.

⚠️ ONE PITCH SCALE FOR THE WHOLE PICTURE, NOT ONE PER ROW. A per-row scale
would make the same height mean a different note in each row, which is a
chart that punishes the reader for comparing it. The scale comes from the
events handed in, so a session that lives in one octave gets that octave.

⚠️ EMPTY PATTERNS ARE LEFT OUT AND COUNTED. Sixteen rows of which five hold
anything is mostly a picture of nothing; the rows that are missing are said
in words instead, which is the same answer `table.mjs` gives about a heading
it had to cut.

MEASURED on the owner's pack, which is what the sizes below are chosen
against: 29 of 32 sessions hold notes, 5,095 events in all, up to 16 regions
holding notes in one session and up to 78 events in one region, pitch 36 to
132 across the pack and velocity 1 to 127.

<a id="row-h"></a>

## note-grid.mjs, ROW_H

How tall one pattern's row is.
⚠️ IT WAS 22 UNTIL 2026-10-12 AND THAT WAS MOST OF THE MESS. MEASURED on
`/kit/timeline/`: the specimen's two patterns made a picture 44 px tall in
which fifteen semitones shared 19 px, 1.3 px a semitone under a 3 px note, so
a rising line and a falling one were two smears. 40 gives the same fifteen
semitones 2.2 px each, which a reader can follow by eye.

<a id="note-h"></a>

## note-grid.mjs, NOTE_H

🔴 A NOTE IS DRAWN AT LEAST THIS TALL. With one scale over the whole picture,
a session spanning 96 semitones in one row puts two adjacent notes inside a
fraction of a pixel of each other, and a canvas drawing a 0.2 px rectangle
draws a grey smear. Three pixels is the smallest thing that still reads as a
mark rather than as noise.

<a id="note-name"></a>

## note-grid.mjs, noteName

MIDI note number to the name a musician would say.
⚠️ MIDDLE C IS C3 HERE, WHICH IS WHAT THE CIRCUIT ITSELF SAYS. The octave
numbering of note 60 is not standardised: Yamaha calls it C3, Roland C4, and
the MIDI specification does not say. `research/measured-devices-2026-09-20.md` records
the Circuit's own drum pads at notes 60, 62, 64 and 65, and the instrument
labels that octave 3, so a page about Circuit sessions uses the Circuit's
numbering and says so rather than picking the commoner one.

<a id="layout"></a>

## note-grid.mjs, layout

Which patterns hold anything, and the pitch range over all of them.
@param {Array<{region:number, step:number, note:number, velocity:number}>} events
@returns {{rows:number[], lo:number, hi:number, count:number, regions:number}}
🔴 AND IT COUNTS THE ONES THAT CANNOT BE NOTES, WHICH IS A HOLE IN OUR OWN
DECODER FOUND BY TRYING TO DRAW ITS OUTPUT. MEASURED 2026-09-21 over the
owner's pack: **105 of 5,095 events carry a note number above 127**, which
is impossible in MIDI. The values are 128, 129, 130, 131 and 132, clustered
rather than scattered, and their velocities and gates look ordinary. So the
byte `notesIn()` reads as a pitch is not only a pitch, and masking bit 7 off
does not rescue them either: it would turn them into notes 0, 1, 2, 3 and 4,
which is five octaves below anything else in the file.
⚠️ **THEY ARE DRAWN AND THEY ARE COUNTED SEPARATELY**, never quietly clamped.
A clamp would pile them all on the top line of the picture and make a chord
that is not in the file, which is this project's named hazard: an instrument
that reports something rather than reporting that it does not know.

<a id="place"></a>

## note-grid.mjs, place

Where one event lands, in the picture's own coordinates.
⚠️ A SESSION WHOSE NOTES ARE ALL ONE PITCH HAS NO RANGE TO DIVIDE BY, and a
drum pattern is exactly that. It is centred rather than put at the top or
dropped, because `lo === hi` is a real and common answer.
`inset` keeps the top and bottom notes off the row's own rules; the pure
arithmetic is graded at 0, where the top of the range is the top of the row.

<a id="length-of"></a>

## note-grid.mjs, lengthOf

How long a note is, in words a footer cell can hold.
⚠️ THE GRID DOES NOT KNOW THE GATE'S UNIT AND DOES NOT GUESS IT. The Circuit
writes a gate in steps minus one or in sixths of a step depending on a header
byte (`research/circuit-session-notes-2026-09-21.md`, a reading on 31 of 31),
and `notesIn` hands over the raw byte. So a caller that knows passes
`length` in steps on the event, and the grid draws and prints that; one that
does not gets the raw gate, labelled as a gate rather than dressed as steps.

<a id="create-note-grid"></a>

## note-grid.mjs, createNoteGrid

@param {HTMLElement} host
@param {object} [o]
@param {number} [o.rowH]   pixels per pattern row
@param {string} [o.label]  what the picture is, for a screen reader
@param {(e:object|null)=>void} [o.onPick]  the note in focus changed

🔴 REWORKED 2026-10-12 ON *"its a mess. rm hover intereacvtion. add footer to
show note info. figure out left lane col. column headers?"*.
- NO HOVER. Pointing at the picture changes nothing. A press picks the note
 nearest it, and the arrows walk the notes (`stepFrom`), from the canvas,
 which is one tab stop.
- THE NOTE IN FOCUS IS ALWAYS ONE NOTE. `set()` picks the first note of the
 first pattern, so the footer is never an empty row that fills in on the
 first press, and a press or a key moves it. There is no playhead here: a
 Circuit pattern in a file has no clock, so nothing plays it.
- THE FOOTER IS CELLS IN RESERVED WIDTHS (`createPanelValues`, the kit's own
 footer row), so a value changing never moves its neighbour, and the row
 wraps by its reserves rather than by what it holds, so its height depends
 on the box and never on the note.
- THE LEFT COLUMN IS THE PATTERN NUMBER, NOT A KEYBOARD. A row is one
 pattern with its own small pitch scale inside it, so there is no single
 pitch per row for a key to name; the exact note is the footer's job. It is
 a DOM column as wide as its widest label, sticky when the grid scrolls
 sideways, and its rows ARE the grid's rows, so it cannot drift from them.
- THE COLUMN HEADINGS ARE THE FOUR BEATS, each spanning four step tracks of
 the same CSS grid the picture sits in, so they line up by construction.

<a id="hidden-empty"></a>

## note-grid.mjs, createNoteGrid, hidden until drawn

⚠️ HIDDEN UNTIL THERE IS SOMETHING TO DRAW, which is the same rule the drop
footer and the empty table heading follow: a container with nothing in it
must not paint its edges.

<a id="velocity-alpha"></a>

## note-grid.mjs, draw, the notes

🔴 THE NOTES. Velocity is ALPHA rather than colour, because this project
spends colour on state and a note has none: it is not late, early or
refused, it is simply in the file. The one note in focus is the one
thing in the accent, because it is the one thing chosen.

<a id="prevent-default"></a>

## note-grid.mjs, keydown, preventDefault

⚠️ prevented even at an end, or an arrow at the last note scrolls the page.

<a id="range-named"></a>

## note-grid.mjs, caption, the range

⚠️ THE RANGE IS NAMED FROM THE NOTES THAT REALLY ARE NOTES. Printing
      `C1 to ` with a blank at the end because the top value is 132 is a
      caption reporting our own decoder's gap as if it were music.

<a id="test-header"></a>

## note-grid-test.mjs, file header

demo/shell/note-grid-test.mjs — the arithmetic of the note picture, no browser.
  node demo/shell/note-grid-test.mjs

🔴 THE PURE HALF IS WHAT IS GRADED HERE AND THE DRAWING IS GRADED ON `/pack/`.
`layout` and `place` decide which patterns get a row, what one pitch scale the
whole picture uses and where an event lands in it; those are functions of
their arguments and need no canvas. Whether any ink reaches the screen is a
different claim and it is asserted against a real pack in the page, where a
`clientWidth` of 0 can make a perfectly correct picture draw nothing.

🔴 AND IT IS GRADED AGAINST THE OWNER'S OWN PACK WHERE THAT FILE IS PRESENT,
because numbers invented for a test agree with whatever the test expects.
`tmp/` is gitignored, so the corpus half SKIPS on a fresh clone and says so
rather than passing quietly.

<a id="test-names"></a>

## note-grid-test.mjs, names

── names ──────────────────────────────────────────────────────────────────

⚠️ MIDDLE C IS C3, WHICH IS THE CIRCUIT'S OWN NUMBERING AND NOT THE ONLY ONE
IN USE. Roland would call note 60 C4. The instrument this page is about
labels its drum pads, notes 60 to 65, as octave 3, so that is what is drawn.

<a id="test-over-127"></a>

## note-grid-test.mjs, no name above 127

🔴 NEGATIVE CONTROL, AND IT IS THE ONE THIS COMPONENT EXISTS TO BE HONEST
  ABOUT. 105 of the 5,095 events in the owner's pack carry a note number above
  127, which cannot be a MIDI note. An empty string is what a reader should get
  for those, so the caption can say what it really is instead of printing a
  name for a number that has none.

<a id="test-higher"></a>

## note-grid-test.mjs, higher note sits higher

🔴 A HIGHER NOTE SITS HIGHER, which is the whole claim the picture makes
    and the one a y axis gets backwards for free: a canvas counts down.

<a id="test-one-pitch"></a>

## note-grid-test.mjs, one pitch

🔴 A PATTERN WITH ONE PITCH IN IT HAS NO RANGE TO DIVIDE BY, and a drum
    pattern is exactly that. Centred, not dropped and not NaN.

<a id="test-footer-walk"></a>

## note-grid-test.mjs, the footer and the walk

── the footer and the walk, 2026-10-12 ────────────────────────────────────

🔴 THE FOOTER NAMES THE NOTE IN FOCUS AND THE ARROWS MOVE IT, so the two
pure halves are graded here: what each cell says, and where a key goes.

<a id="test-105"></a>

## note-grid-test.mjs, 105 events above 127

🔴 AND 105 OF THEM CANNOT BE NOTES, WHICH THIS COMPONENT FOUND BY TRYING TO
PUT EACH ONE SOMEWHERE. A count never had to. The values are 128 to 132,
clustered, with ordinary velocities and gates, and masking bit 7 would turn
them into notes 0 to 4, five octaves below anything else in the file.
⚠️ IT IS ASSERTED AS A NUMBER rather than as *some*, so the day the decoder
is understood this goes red and somebody reads why.
