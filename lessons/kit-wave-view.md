# Kit lessons: wave-view.mjs, wave-view-test.mjs

The long comments cut from `demo/shell/wave-view.mjs` and `demo/shell/wave-view-test.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-wave-view.md#<anchor>`.

<a id="header"></a>

## wave-view.mjs, file header

demo/shell/wave-view.mjs
A picture of one short sample, with a play head.

The picture is a MIN/MAX ENVELOPE: every column is the lowest and the highest
sample in the slice of audio that column covers, so a transient one sample
wide still reaches the top of the box. A picture drawn by taking one sample
every N instead would be faster, would look almost identical on a sine, and
would be a lie about every peak in the file.

🔴 THE NUMBERS THAT MAKE THAT WORTH SAYING, MEASURED 2026-09-21 ON THE 64
SAMPLES IN `New Pack.circuitpack`: they run 5,999 to 95,947 frames, 0.124979
to 1.998896 seconds, 2,561,855 frames in total, all 48 kHz 16 bit mono. The
longest one in a 700 px box is 137 frames a column, so a reader taking one
sample a column would be drawing 0.73 PER CENT OF THE FILE and would have to
be lucky to land on any peak at all. `envelope()` reads all 95,947, which
costs one pass and is the only thing here that could ever be called slow.

🔴 IT DRAWS AND IT DOES NOT PLAY. There is no `AudioContext` in this file, no
`decodeAudioData`, no `BufferSource`, no `fetch` and no media element. The
page owns the sound and hands this component a POSITION in seconds; a
component that made its own would be a second audio path in a page that
already has one, and the position it drew could then disagree with the sound
somebody is listening to. `wave-view-test.mjs` asserts that absence over the
exported names and over this file's own source text, the way
`circuit-sample-test.mjs` does, because a name test cannot see a call inside
a function.

🔴 AND THE HEAD MOVES ONLY WHILE SOMETHING IS PLAYING. `follow(fn)` starts an
animation frame loop and `rest()` stops it dead. There are two
`requestAnimationFrame` call sites and no more: the one that arms the loop
and the one inside it that asks for the next frame, and a single
`cancelAnimationFrame` ends both. A component that ran a frame loop for a
still picture would be spending a phone's battery to redraw the same pixels,
and nothing on screen would say so. `paints` counts, so a check can watch the
counter STOP rather than ask a boolean whether it thinks it has stopped.

⚠️ NOTHING IN HERE IS TEXT, WHICH IS A LAYOUT DECISION AND NOT AN OMISSION.
`grain-scope`'s live caption reflowed between three and four lines sixty
times a second and made the whole page jump, reported as *"a horrible jump of
content each time it updates"*. The only thing this component owns is a
canvas of fixed height, so there is nothing here that can change its own size
while somebody is looking at it. A number that has to be read goes in the
page's readout, which is a fixed box, and a name goes in the page's table.

⚠️ AND IT DOES NOT SEEK. A press on this picture does nothing, on purpose.
Seeking is a claim about a position inside a sound, one position surface per
page owns that claim, and the audio this was built for is a one shot
`BufferSource` that cannot be seeked at all. Adding a pointer handler here
would put a control on the page that lies about what it can do.

⚠️ NO `touch-action` ON THE CANVAS, DELIBERATELY. The project rule is that
selection suppression is global and `touch-action` is not: a canvas you drag
to look around wants it off, and a canvas inside a page you scroll must not
eat the scroll. Nothing here is dragged, so the page keeps its scroll.

STYLING. Three rules, prepended to <head> so `shell.css` and any page's own
<style> override them on source order, which is the arrangement `xy-pad.mjs`
already uses and records. They want hoisting into `shell.css` and are not
there yet because that file is being edited by another hand today, and a
component that only looks right next to one page's stylesheet is the
`choice.mjs` bug in a new costume.

⚠️ AND THE WRAPPER PAINTS ITS OWN GROUND, WHICH MATTERS BECAUSE THIS GETS PUT
INSIDE THINGS. `createGlue` lays its children out with a 1 px gap over a
`--line` ground, so a transparent child does not show a hairline between two
panes, it shows that colour across its whole area. `.pos-wave` sets
`background: var(--card)`, so the component is safe in a glue. A caller that
wraps it in a box of its own has to paint that box.

🔴 THE BORDER IS ON THE WRAPPER AND NOT ON THE CANVAS, WHICH IS ARITHMETIC
RATHER THAN TASTE. `box-sizing: border-box` is global here, so a canvas with
a 1 px border whose CSS width is set from its container's width renders 2 px
of content narrower than its backing store and stretches the picture by
0.3 per cent. On a 1.3 second sample that is 4 ms of head position, which is
small and is also free to not have. The wrapper carries the border and
`clientWidth` is a CONTENT width, so the two agree by construction.

<a id="head-px"></a>

## wave-view.mjs, HEAD_PX

How wide the play head is drawn, in CSS pixels. One, solid, brightest grey.
`grain-scope.mjs` settled this for the whole project: the loop furniture is
grey because a picture where five things are yellow is one colour saying five
things, and the head keeps the brightest ink because it is the only mark that
is somewhere different every frame.

<a id="min-cols"></a>

## wave-view.mjs, MIN_COLS

The fewest columns an envelope is ever built with.

⚠️ IT EXISTS FOR THE MOMENT BEFORE LAYOUT, not as a taste. A wrapper that is
hidden or not yet in the document measures 0 wide, and a 0 column envelope is
a divide by zero wearing a picture. 64 is enough to draw something honest if
a resize observation never arrives at all.

<a id="arithmetic"></a>

## wave-view.mjs, the arithmetic

── the arithmetic, which is pure and is graded with no browser ───────────
  Everything from here to `createWaveView` takes numbers and returns numbers.
  `wave-view-test.mjs` runs it in node, because every bug this kind of picture
  has ever had lives in exactly these four functions: a bucket that skips
  samples, a bucket that is empty, a head that sits off the right edge, and a
  round trip between seconds and pixels that does not come back.

<a id="column-range"></a>

## wave-view.mjs, columnRange

The half open range of samples column `i` covers, `from` up to but not
including `to`.

🔴 THE TWO PROPERTIES THIS HAS TO HAVE, AND BOTH ARE ASSERTED. With at least
as many samples as columns the ranges TILE the file: every sample is in
exactly one column and none is skipped, which is the whole difference between
an envelope and a decimation. With FEWER samples than columns they repeat
instead, and no column is ever empty, because an empty column has no minimum
and no maximum and would be drawn as silence in the middle of a sound.

@param {number} frames  samples in the file
@param {number} cols    columns in the picture
@param {number} i       which column

<a id="envelope"></a>

## wave-view.mjs, envelope

The picture, as two arrays of the same length as there are columns.

`min` and `max` are SIGNED, so a column of nothing but negative samples
reports a negative maximum rather than zero. Taking the absolute value per
column and drawing it symmetrically would throw away which side of the line
the sound is on, and a transient that only goes one way is exactly the thing
this picture exists to show.

`peak` is the amplitude the picture DRAWS, which is a different claim from
the amplitude in the file only if the bucketing is wrong. They are equal for
every column count, and that equality is the assert that kills a decimator.

@param {Float32Array|number[]} samples
@param {number} cols

<a id="head-at"></a>

## wave-view.mjs, headAt

Where a position sits across the picture, 0 to 1, or `null` when there is
nothing to draw.

A position before the start or past the end is CLAMPED rather than refused,
because both happen for real reasons: an `AudioContext` clock read a frame
before the sound starts is slightly negative, and one read a frame after a
one shot ends is slightly past the duration. Neither is an error and neither
should make the head disappear for one frame.

🔴 IT TAKES A NUMBER AND NOTHING ELSE, AND THIS WAS WRITTEN AS
`Number.isFinite(Number(position))` FIRST, WHICH IS A DEAD GUARD. `Number(null)`
is 0 and `Number('')` is 0, so a head that had been TAKEN AWAY came back as a
head at the very start of the sample: a bright line pinned to the left edge
of a picture nothing is playing, and a `played` shade over column 0 to go
with it. Found by running the component against a stub document and reading
`facts()`, where `position: null` sat next to `headX: 0` in the same object.
Two fields that can disagree is what made it visible; one field would have
been believed.
⚠️ A NUMERIC STRING IS REFUSED TOO, deliberately. A position arriving as text
is a page bug, and a component that quietly parses it is a component that
draws a head somebody else thinks they cleared.

<a id="head-x"></a>

## wave-view.mjs, headX

Where the head is DRAWN, which is not quite where it is.

🔴 THE LAST PIXEL IS THE ONE THAT GOES WRONG. A head at the very end of a
sample maps to x equal to the full width, and a 1 px line drawn there is
entirely outside the canvas: the head vanishes at the exact moment a reader
is watching for it to arrive. That is the pingpong head bug from `looper.mjs`
in a different picture, where a ramp sat at the right edge for the whole
return half. The inset is one head width and it is asserted.

<a id="create-wave-view"></a>

## wave-view.mjs, createWaveView

A canvas that draws one sample, and a head that a page moves.

@param host                     where the picture goes
@param o.height                 CSS pixels tall, default 120
@param o.label                  what the picture is of, for `aria-label`
@param o.normalise              draw relative to this sample's own peak
 instead of full scale. DEFAULT FALSE, and the reason is measured: the 64
 samples in the pack peak between 0.586 and 0.997, so normalising every one
 to the top of the box would draw the quietest and the loudest identically
 while the table beside it reports two different numbers. `grain-scope.mjs`
 learned the same thing from the other end, where a scale that moved was
 reported as *"the scale keeps changing"*.
@param o.minCols                the floor under the column count

<a id="custom-property"></a>

## wave-view.mjs, --wave-h

A per instance value goes on a CUSTOM PROPERTY and never on the property
itself. `video-panel.mjs` wrote `style.aspectRatio` from an option and no
stylesheet could ever take it back, which left one page's picture square on
a 16:9 screen with the way out of full screen off the top of it.

<a id="hidden-until-set"></a>

## wave-view.mjs, wrap.hidden

🔴 NOTHING ON SCREEN UNTIL THERE IS SOMETHING TO SHOW. An empty bordered box
is a horizontal rule nobody wrote, which is the defect `shell.css` already
records for an empty readout: a container with nothing in it must not paint
its edges. `set()` brings it back.

<a id="greys"></a>

## wave-view.mjs, colours

🔴 THREE GREYS AND NO HUE, WHICH IS `grain-scope.mjs`'S SETTLED ANSWER
REUSED RATHER THAN RE-ARGUED. Colour in this project says HOW A MARK
LANDED, and nothing on this picture has landed well or badly: it is
material, a part of it has been played, and a line says where. Three steps
of ink put them in order, and the head keeps the brightest because it is
the only thing here that moves.

<a id="empty-bitmap"></a>

## wave-view.mjs, paint with nothing to draw

🔴 NOTHING TO DRAW IS AN EMPTY BITMAP, NOT AN EMPTY PICTURE, AND THIS
LINE SHIPPED PAINTING A FIELD AND A MIDLINE INSTEAD. `clear()` did not
repaint at all, so the canvas kept the LAST SAMPLE and only the wrapper
being hidden made it look gone. REPORTED 2026-09-21 while `/pack/` was
being wired up: a page drew a sample, read `ink()`, called `clear()`, read
`ink()` again, and got **the same 63,264 pixels both times**, so a check
built on the difference was measuring nothing. Two ways it bites. A page
that unhides the wrapper again for any reason flashes the previous
sample, and every number a check could ask for reads exactly the same
whether the clear worked or not.
⚠️ AND IT IS CLEARED RATHER THAN FILLED WITH A FIELD AND A MIDLINE. A
midline on an empty picture is a drawing of silence, which is a different
claim from there being nothing here. The wrapper paints `--card`, so an
empty canvas shows an empty box either way, and a transparent bitmap is
the one state `ink()` can tell apart from a picture.

<a id="column-width"></a>

## wave-view.mjs, column width

⚠️ THE COLUMN WIDTH IS DERIVED AND NOT ASSUMED TO BE ONE PIXEL. A picture
narrower than `MIN_COLS` has more columns than pixels, and drawing each
one a pixel wide would run the last two thirds of the sample off the
right hand edge while the picture looked perfectly ordinary.

<a id="null-stops"></a>

## wave-view.mjs, follow returns null

🔴 `null` IS THE PAGE SAYING THE SOUND HAS STOPPED, and it stops the loop
rather than being drawn as position zero. A component that kept running
because a page forgot to tell it anything is the frame loop this file
exists not to have.

<a id="clear"></a>

## wave-view.mjs, clear()

Nothing drawn, no head, no loop, and the box goes away with it.

🔴 IT WIPES THE BITMAP, SYNCHRONOUSLY, AND THE FIRST VERSION DID NOT.
Hiding the wrapper is not clearing the picture: the canvas kept every
pixel of the last sample, `ink()` went on reporting them, and the only
thing that would eventually have wiped it is a resize observation
arriving later and setting `canvas.width`. A cleanup that depends on
something else happening afterwards is not a cleanup.

<a id="follow"></a>

## wave-view.mjs, follow()

Follow a position while something is playing. `fn` is asked once a frame
and returns seconds, or `null` when the sound has stopped.

A number is refused rather than accepted quietly, because a number is the
still case and `head()` is what draws it. A component that took either
and guessed would be a control that looks live and is inert, which is the
`requestFullscreen?.()` defect in a different costume.

<a id="ink"></a>

## wave-view.mjs, ink()

How much of the canvas is not field colour, READ BACK OFF THE PIXELS.

🔴 A COLUMN COUNT IS NOT A PICTURE. `/archive/radio/` already records this: a
check that a wave was drawn has to ask the canvas, because every number
in `facts()` would be exactly the same if the fill colour were the field
colour, if the scale were zero, or if `paint()` returned early. The field
colour is SAMPLED at the top left corner rather than parsed out of a
token, because the corner is field by construction: the wave is inset by
`PAD_Y` and can never reach row zero.

🔴 SO IT HAS TO SAY WHEN THE CORNER IS NOT A FIELD COLOUR AT ALL, AND
THIS RETURNED A BARE SHARE UNTIL 2026-09-21. On a bitmap that has never
been painted, or one this component has just wiped, the corner is
TRANSPARENT: every pixel then matches it, or every pixel differs from it
depending on which channels are compared, and the number that comes out
is about nothing. Reported from `/pack/` as a `share` near 0.999 passing
a `share > 0` assert while meaning nothing. `measured` is the field that
says whether there was anything to measure, and it is the one to read
FIRST, the way `table.mjs` reports a table that has not been laid out.
A check that reads `share` without reading `measured` is back to
believing a number that cannot move.

⚠️ IT IS A READBACK AND IT IS FOR A CHECK. Do not call it in a frame.

@returns {{ink:number, total:number, share:number, measured:boolean, why:string}}

<a id="test-header"></a>

## wave-view-test.mjs, file header

demo/shell/wave-view-test.mjs — the wave view's arithmetic, with no browser.

  node demo/shell/wave-view-test.mjs

`columnCount`, `columnRange`, `envelope`, `headAt`, `secondsToX`,
`xToSeconds` and `headX` are pure, and every bug a waveform picture has ever
had lives in one of them: a bucket that skips samples, a bucket that is
empty, a peak that is drawn in the wrong column, a head that sits one pixel
outside the canvas at the end of the sound, and a mapping between seconds and
pixels that does not come back.

🔴 THE CLAIM THIS FILE EXISTS FOR IS THAT THE PICTURE IS A MIN/MAX ENVELOPE
AND NOT A DECIMATION, AND IT IS PROVED BY BUILDING FOUR BROKEN DRAWERS AND
MEASURING WHICH NAMED CLAIMS THEY TAKE RED. A picture is the easiest thing in
the world to write green, because a sine drawn either way looks like a sine.
The difference only shows on a transient one sample wide, which is exactly
the thing a drum sample is made of.

⚠️ WHAT IS NOT GRADED HERE, SAID PLAINLY BECAUSE A GREEN SUITE CAN MEAN ZERO
COVERAGE. Nothing below opens a canvas. Every claim about PIXELS needs a
browser and is therefore ungraded by this file:
  - that `paint()` puts the columns where the arithmetic says
  - that the injected stylesheet loses to `shell.css` on source order
  - that the ResizeObserver fires and rebuilds the envelope at the new width
  - that the frame loop starts on `follow()` and STOPS on `rest()`, which is
    read off the `paints` counter rather than off a boolean
  - that the head is visible against the field, and that the three greys are
    three greys
  - that the canvas does not eat a phone's scroll
`createWaveView` is not called at all in here. It needs a document, and the
half of this component that can be wrong without anybody noticing is the half
that is graded below.

🔴 IT READS `New Pack.circuitpack` FOR ONE SECTION, WHICH IS SOMEBODY'S ONLY
BACKUP OF A DEVICE WITH NO FACTORY RESET. Reading is free. Nothing here
writes a file, touches a port or modifies the pack, and the audio is pulled
out in memory with `unzip.mjs`. If the pack is not there the section skips
rather than failing, because the synthetic fixtures carry the argument and
the real audio only corroborates it.

<a id="test-tiling"></a>

## wave-view-test.mjs, claim 2

2. 🔴 THE CLAIM THAT SEPARATES AN ENVELOPE FROM A DECIMATION, AND IT IS ABOUT
   THE RANGES RATHER THAN ABOUT THE VALUES. The columns TILE the file: the
   first begins at the first sample, the last ends at the last, and each one
   starts exactly where the one before it stopped. A decimator's ranges are
   single points with the rest of the file in the gaps between them.

<a id="test-loudest"></a>

## wave-view-test.mjs, claim 5

5. 🔴 THE ONE THAT MATTERS. The loudest sample in the file sits at index 7,
   and the stride is 13.65, so a drawer taking one sample every N reads index
   0 and index 13 and never sees it. The envelope reads all 4,096.

<a id="test-peak-invariant"></a>

## wave-view-test.mjs, claim 7

7. 🔴 THE INVARIANT THE PICTURE RESTS ON, CHECKED ACROSS THE WHOLE RANGE OF
   COLUMN COUNTS A REAL PAGE CAN PRODUCE. The peak the picture DRAWS is the
   peak that is in the file. It is true at every width because the ranges
   cover every sample at every width, and it is false for every decimation at
   almost every width.

<a id="test-dead-guard"></a>

## wave-view-test.mjs, claim 11b

11b. 🔴 THE BUG THIS COMPONENT SHIPPED FOR AN HOUR, AND IT WAS A DEAD GUARD.
     `Number.isFinite(Number(position))` reads as a finite number test and
     lets four values through as ZERO: `null`, `undefined`, `''` and `false`.
     A head that had been taken away came back as a bright line pinned to the
     left edge of a picture nothing was playing. Found by printing `facts()`,
     where `position: null` sat beside `headX: 0` in one object.

<a id="test-last-pixel"></a>

## wave-view-test.mjs, claim 12

12. 🔴 THE LAST PIXEL, WHICH IS THE ONE THAT GOES WRONG. A head at the very
    end maps to x equal to the width, and a one pixel line drawn there is
    entirely off the canvas: the head vanishes at the exact moment a reader
    is watching for it to arrive. That is `looper.mjs`'s pingpong head in a
    different picture.

<a id="test-sabotage-decimate"></a>

## wave-view-test.mjs, sabotage 1

🔴 SABOTAGE 1: ONE SAMPLE EVERY N, which is what a picture drawn the obvious
way does. It is fast, it is what most tutorials show, and on this fixture it
misses the loudest sample in the file, draws the wrong peak and never reaches
the end.

<a id="test-decimate-sign"></a>

## wave-view-test.mjs, sabotage 1 keeps the sign

⚠️ AND IT KEEPS THE SIGN, WHICH IS RIGHT AND IS WORTH SAYING. A decimation
is not wrong about everything, which is exactly why it survives review: it
is wrong about the one thing a drum sample is made of.

<a id="test-sabotage-symmetric"></a>

## wave-view-test.mjs, sabotage 2

🔴 SABOTAGE 2: THE MAGNITUDE PER COLUMN, DRAWN SYMMETRICALLY. Every peak is
correct, the picture looks better than the real one, and a transient that
only goes one way is drawn going both ways.

<a id="test-sabotage-rounded"></a>

## wave-view-test.mjs, sabotage 3

🔴 SABOTAGE 3: A STRIDE OF round(frames / cols), which is how a bucket
usually gets written. 4,096 over 300 is 13.65, rounding to 14, and 300 times
14 is 4,200, so the last seven columns start past the end of the file.

⚠️ IT TAKES ONE CLAIM RED AND THE PREDICTION WRITTEN HERE FIRST SAID TWO,
WHICH IS THE MEASUREMENT CORRECTING THE AUTHOR. Rounding UP means the last
column that does start inside the file reads 14 samples from 4,088 and is
clipped at the end, so the last sample IS covered and that claim is right to
survive. What is wrong is the picture: seven columns of blank at the right
hand edge of a box whose audio runs all the way to it, which reads as a
sample that ends early rather than as a drawing fault.

<a id="test-sabotage-clamped"></a>

## wave-view-test.mjs, sabotage 4

🔴 SABOTAGE 4: THE MAXIMUM CLAMPED AT ZERO, which is the single character
mistake in `Math.max(0, hi)` that looks like defensive code. The picture is
right everywhere the sound crosses the line and flat everywhere it does not.

<a id="test-control"></a>

## wave-view-test.mjs, control on the controls

🔴 THE CONTROL ON THE CONTROLS. Every drawer above is a variation on one
signal, so the block is only worth anything if the real one is still green
after all of it.

<a id="test-real-peaks"></a>

## wave-view-test.mjs, claim 15

15. 🔴 THE INVARIANT AGAIN, AGAINST AUDIO NOBODY CONSTRUCTED. Sixty four
    drum samples in a 700 px box, and the peak the picture draws is the
    peak the decoder measured, in all 64.

<a id="test-real-cost"></a>

## wave-view-test.mjs, claim 16

16. 🔴 AND THE COST OF GETTING IT WRONG, MEASURED ON REAL AUDIO RATHER THAN
    ARGUED. The longest sample is 95,947 frames, so a 700 px picture is 137
    frames a column and one sample a column would be drawing 0.73 per cent
    of the file.

<a id="test-blank-columns"></a>

## wave-view-test.mjs, claim 17

17. 🔴 A BLANK COLUMN MEANS SILENCE IN THE FILE, AND THIS CLAIM STARTED OUT
    AS "NO REAL SAMPLE HAS A BLANK COLUMN", WHICH IS FALSE AND WENT RED ON
    THE FIRST RUN. Real drum samples carry leading and trailing silence:
    `content()` counts it, and at 1,920 columns those quiet ends are wide
    enough to be columns of their own. The honest claim is the one the
    rounded stride sabotage above depends on, which is that a column comes
    back blank only where the audio really is zero.

<a id="test-stub-section"></a>

## wave-view-test.mjs, the component against a stub document

── the component, against a stub document ───────────────────────────────
  🔴 THIS SECTION EXISTS BECAUSE A REAL DEFECT LIVED EXACTLY WHERE NOTHING WAS
  LOOKING. `clear()` hid the wrapper and left the bitmap alone, so the canvas
  kept the last sample and `ink()` went on reporting it. REPORTED from `/pack/`
  on 2026-09-21: draw a sample, read `ink()`, `clear()`, read `ink()` again,
  and the answer was **the same 63,264 pixels both times**. A page check built
  on that difference was measuring nothing, which is the shape this file's own
  header warns about for `facts()`.

  ⚠️ WHAT IT GRADES AND WHAT IT DOES NOT. The canvas below is a stub that
  rasterises axis aligned rectangles into a byte array and nothing else, so
  what is being graded is WHICH CALLS the component makes into a canvas and
  what state they leave behind. A browser is still the only thing that can say
  the picture is antialiased correctly, that the stylesheet loses to
  `shell.css` on source order, that the three greys read as three greys, or
  that a real `ResizeObserver` fires. Those stay in the list at the top.
  ⚠️ AND A STUB GRADES THE STUB AS MUCH AS THE COMPONENT, which is why the two
  claims taken from it are the coarsest ones available: is any byte of the
  bitmap set, and does the frame counter stop. Neither depends on the stub
  being faithful about anything a browser would do differently.

<a id="test-stub-width"></a>

## wave-view-test.mjs, stub canvas width

A canvas loses its bitmap when either dimension is assigned, exactly as a
real one does. That is load bearing here: it is the thing that would have
wiped the stale picture EVENTUALLY, and the whole point of the defect is
that `clear()` must not wait for it.

<a id="test-clear-wipes"></a>

## wave-view-test.mjs, claim 24

24. 🔴 THE REPORTED DEFECT. `clear()` wipes the canvas, synchronously, and
    it is asserted against the BYTES rather than against what `ink()` says
    about them. Two independent readings of one fact: the bitmap is the
    fact, `ink()` is the component's report of it, and the bug was that the
    report could not disagree with anything.

<a id="test-source"></a>

## wave-view-test.mjs, claim 20

20. AND THE SOURCE TEST, BECAUSE A NAME TEST CANNOT SEE A CALL INSIDE A
    FUNCTION. The module's own header says `AudioContext` and
    `decodeAudioData` in the sentences promising it calls neither, so the
    comments have to come out before the check means anything.

<a id="test-frame-loop"></a>

## wave-view-test.mjs, frame loop source test

🔴 THE FRAME LOOP HAS ONE CALL SITE AND A WAY TO STOP IT. A picture that
never changes does not need a frame a second, and a component that ran one
anyway would be spending a phone's battery with nothing on screen saying
so. This is a SOURCE test and not a behaviour test: whether the loop really
stops needs a browser, and is in the list at the top of this file.

<a id="test-no-dashes"></a>

## wave-view-test.mjs, claim 21

21. CLAUDE.md, and the two formatters that were stamping em dashes are
    exactly why this is checked in code rather than swept by hand. The
    characters are written as escapes so that this file does not fail its
    own check.
