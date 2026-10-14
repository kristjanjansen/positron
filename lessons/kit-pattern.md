# Kit lessons: pattern.mjs

The long comments cut from `demo/shell/pattern.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-pattern.md#<anchor>`.

<a id="header"></a>

## pattern.mjs, file header

demo/shell/pattern.mjs — ONE generated test pattern, drawn two ways.

Every publisher in this repo burns an absolute clock into its pixels, because
that is what makes glass-to-glass latency readable from a screenshot alone and
comparable ACROSS transports. There were three drawings of that idea (the MoQ
canvas, rig/whep/publish.html, and a bare ffmpeg drawtext) and no single place
that said what the pattern IS. This is that place.

  burn(ctx, w, h, frame, opts)  — the canvas implementation
  readBurned(ctx)               — decode the row back out of a canvas
  ffmpegFilters(opts)           — the SAME spec as an ffmpeg -vf chain

── THE ROW IS FROZEN ───────────────────────────────────────────────────────
ROW below is byte-identical to rig/whep/publish.html. That identity is the
whole point: the same 48-bit millisecond clock plus 8-bit XOR checksum is
burned by every transport's publisher, so MoQ, WHEP and LL-HLS can be put on
ONE axis instead of three. CHANGE THESE NUMBERS AND THE COMPARISON SILENTLY
STOPS MEANING ANYTHING. (`ladder`, the demo that showed the three side by
side, was removed 2026-09-08; the comparison it existed for is still the
reason the geometry is frozen, and any future page doing it needs this.)

And readBurned() thresholds on LUMINANCE. The bed stays black, the blocks stay
white, and no decoration — hue included — is allowed inside the bed rectangle.
Everything colourful lives outside it.

── the OTHER pattern in this repo ─────────────────────────────────────────
proto/m2m/* and proto/centralrec/pub.html carry a DIFFERENT, deliberately
derived row: 64 blocks of 9 px at 32,40,56 on a 640x360 reference grid, with a
7th payload byte holding a participant id. Its own comment says so ("rig/whep
pattern, halved to 360p, +1 pid byte"). It is a separate spec for a separate
question (who sent this tile?), it is internally consistent across those
pages, and it is NOT interchangeable with this one. Do not unify them by
editing constants; that would move numbers those rigs have already published.

<a id="pad"></a>

## pattern.mjs, PAD

The margin every element on the frame keeps from the top and the left. One
number, because two that happen to differ read as a mistake — the row used to
sit 20 px from the left edge and 80 px from the top, and off-centre besides
(20 px of margin on the left against 100 on the right).

<a id="frame-geometry"></a>

## pattern.mjs, FRAME_W, FRAME_H and ROW geometry

MOVED 2026-09-07, from X:40 Y:100 — so the bed sits PAD from the top and is
CENTRED: 56 x 20 = 1120 of blocks, plus the bed's own 20 px ringing margin,
is 1160 wide on a 1280 frame, which leaves exactly PAD either side.

`workers/pub/container/server.mjs` carries the same numbers and MUST move with
this, because `readBurned()` here reads the row that file's ffmpeg draws.
`rig/obs-docker/*` and `rig/whep/*` each hold a burner and a reader that agree
with EACH OTHER on the old geometry; they are self-contained rigs and are
deliberately left alone. So "byte-identical everywhere" is no longer true and
this comment says so rather than letting the next reader assume it.

<a id="video-hue"></a>

## pattern.mjs, VIDEO_HUE

THE KEY COLOUR FOR VIDEO. `--hi` in shell.css is #ffd400, which is hue 50, so
that is what a picture this project generated looks like — the same colour the
transport bar's playhead and the primary buttons use.

<a id="field"></a>

## pattern.mjs, FIELD

THE FIELD IS NEVER TINTED. Twice now the background was a dark hue —
`hsl(hue 26% 12%)`, then the site's black under a 7% wash — and both were
mud, because that is what a warm hue at low saturation and low lightness IS.
There is no alpha that fixes it; the fix is not to do it.

So the key colour appears only where it is fully saturated and large: the two
labels, the sweep square, and the strip lane the part draws. Those read as
colour. A tinted background reads as dirt, and it was also the weakest way to
tell two sources apart — the square is visible across a room.

<a id="band"></a>

## pattern.mjs, BAND

The band video hues are allowed to occupy: wide enough that two sources are
obviously different, narrow enough that everything still reads as one family
rather than a bag of random colours. An earlier version spread hues over the
whole circle, which put `record` on magenta and `capture` on green — two
pictures with nothing to say to each other and neither of them ours.

<a id="video-hue-fn"></a>

## pattern.mjs, videoHue and SPREAD

The nth distinct video hue. Offsets rather than an angle step, so consecutive
takes are far apart INSIDE the band — a plain step of BAND/n puts take 1 and
take 2 next to each other, which is the one case the colour exists to tell
apart. Index 0 is the key colour itself.

<a id="hue-for"></a>

## pattern.mjs, hueFor

A stable hue for any string, so two sources pick different colours unaided —
now INSIDE the video band, so a MoQ publisher and a local recording are
recognisably the same kind of thing. A person can still tell two publishers
apart at a glance, and nobody has to allocate a colour by hand.

<a id="draw-camera"></a>

## pattern.mjs, drawCamera

Put a camera behind the pattern: field, then the whole camera frame, then a
scrim so the burned clock stays readable. One function because `take`,
`capture` and `show` all did this and all got it wrong the same way.

CONTAIN, not cover, and not stretch. Three attempts, and the arithmetic is
the argument:

 `drawImage(src, 0, 0, w, h)`  distorts. iOS does not honour a 640x360
   request — the track comes back PORTRAIT — so a face is squashed sideways.
 cover                          keeps the aspect but, on 720x1280 into
   1280x720, scales 1.78x and shows **32% of the frame**. Zoomed into a
   featureless patch, it reads as "the camera is not working".
 contain                        keeps the aspect and shows all of it, with
   the field either side.

The bars are the point, not a compromise: a phone held upright IS a tall
picture, and a 16:9 box either lies about that or throws two thirds of it
away. Returns false if the source has no dimensions yet.

🔴 AND `fit: 'cover'` IS THE OPT-OUT, FOR A SOURCE THAT IS NOT A CAMERA.
Asked 2026-09-18 about `/stage/`'s film: *"make 4:3 video win and crop"*.
Every argument above is about a CAMERA, whose subject is a face somebody
framed and whose shape the page does not control: cropping it throws away
the part a person put themselves in. A FILM is the opposite on both counts.
Its subject is composed to fill its own frame, 480x360 into 1280x720 scales
2.00x and keeps **75% of the picture** rather than 32%, and what contain
gives instead is two black pillars over a third of the width. The rule for
cameras is unchanged and is still the default; this is a second case, not a
softening of the first.
⚠️ `scrim` IS SEPARATE AND DEFAULTS TO THE SAME 0.55. It exists so the
burned clock stays readable ON TOP, so a caller that draws nothing on top
passes 0: dimming a picture by 55% for the sake of furniture that is not
there is a page darkening itself for no reason.

<a id="clock-columns"></a>

## pattern.mjs, clockColumns

Where the canvas's two clock columns go, from the widest string each prints.

Column one starts at `PAD`. Column two ENDS at `w - PAD` and starts where
its widest string would have to start to end there. The widest strings are
templates of the same length as what is printed: a monospace face gives
every digit one advance, so `0` stands for any digit. The epoch in ms is
13 digits until the year 2286; the wall clock is always `HH:MM:SS.mmm`; a
POSITION past 99 minutes grows, so the real string is measured too.
`gap` is the clear space between the two columns' widest strings, and a
negative gap is an overlap, which is why it is returned rather than trusted.

<a id="burn-field"></a>

## pattern.mjs, burn, field

── field ────────────────────────────────────────────────────────────────
`field: false` skips ONLY this fill, for a caller that has already painted
the frame — `take` puts the camera there and scrims it. Everything else
still draws, including the row's black bed, which must stay opaque or the
clock stops being readable back.

<a id="burn-clocks"></a>

## pattern.mjs, burn, two clocks

── two clocks, and which is which ───────────────────────────────────────
EVERYTHING ON THIS FRAME IS BIG, and there is nothing on it that is not a
clock. The pattern carried a header, a caption, a moving second-hand, a
rule under the header and a footer; all of them rendered between 3 and 8 px
once the picture was displayed at the size a demo actually shows it, which
is to say they were decoration that cost legibility and gave nothing back.
A picture whose whole job is to be READ off a small pane has room for two
labelled numbers and no more.
ONE SIZE FOR BOTH NUMBERS. They are the same kind of thing, a clock, and
drawing one bigger said one mattered more.

🔴 TWO COLUMNS SINCE 2026-09-18, ASKED FOR IN THOSE WORDS: *"can onscreen
time counters be bit smaller so it filts to 2 cols?"*. They were stacked,
which spent 235 px of height on two numbers and left the top third of the
frame carrying nothing else.

64 rather than 84 is what makes the pair fit side by side, and the
arithmetic is the same as before: the epoch is 13 characters, so
13 x 0.6 x 64 = **499 px**, and the local clock is 12, so **461 px**. Two
columns plus the 60 px gutter is 1020 of the 1160 the margins leave, with
140 px spare. At 84 they came to 655 and 604, which is 1319 and does not
fit at any gutter.
⚠️ IT IS STILL BIG. 64 px on a 1280 frame is 5% of the width per line, and
these panes are shown at about 440 px, where it reads as ~22 px. The rule
this frame is built on is that everything on it can be read off a small
pane, and two columns at 64 clears that where four stacked lines at 84 was
spending the room to say it twice.

<a id="burn-numbers-y"></a>

## pattern.mjs, burn, numbers above the row

🔴 THE NUMBERS SIT ON TOP OF THE ROW, 2026-09-18, ASKED FOR AS *"move
numbers down, on top of timecode"*. The two halves of this picture that a
MACHINE and a PERSON read are now one block at the bottom: the row encodes
the instant, the digits above it say the same instant in words, and the two
can be compared by eye without crossing the frame.
⚠️ AND THE MIDDLE IS LEFT EMPTY ON PURPOSE. It is where a background goes:
`drawCamera` lays a picture in behind all of this, and the furniture now
frames it instead of sitting across it.
🔴 THE GAP ABOVE THE BED EQUALS THE GAP BELOW IT, AND BOTH ARE `PAD`.
Asked 2026-09-18: *"same space between numbers and timecode as timecode
and lower edge"*. The bed sits PAD off the bottom edge by construction, so
the number's baseline sits PAD above its top. Derived from `PAD` rather
than typed, because the whole frame's margins are that one number and an
eye reads the difference between 60 and 59 as a mistake.
⚠️ THE BASELINE IS THE VISUAL BOTTOM HERE. These are digits and a colon,
none of which descend, so there is nothing below the baseline to allow for.

<a id="burn-label-y"></a>

## pattern.mjs, burn, LBL_Y

⚠️ 80 RATHER THAN 68, ASKED FOR 2026-09-18: *"incr a liitle bit space
betwen labels and timecode numbers"*. What an eye reads as the gap is not
this number: it is this number LESS the number's cap height, which at 64 px
is about 50. So 68 was an 18 px gap and 80 is a 30 px one, which is the
"little bit" and not the near doubling the figures suggest.

<a id="burn-columns"></a>

## pattern.mjs, burn, side by side columns

🔴 SIDE BY SIDE AGAIN, SINCE 2026-09-30, AND NEVER OVERLAPPING. Asked in
these words: *"test screen: move local timecode to right not to overlap
with absolute"*. ABSOLUTE on the left margin, the second clock on the
right one, one row, at the baselines above.
🔴 **THE RIGHT COLUMN IS DERIVED FROM THE WIDEST STRING THIS RENDERER
PRINTS, MEASURED, NOT FROM A CHARACTER COUNT.** The two column layout of
2026-09-18 reserved `13 * 0.6 * NUM` for the first column, which is the
canvas epoch in ms and not what ffmpeg prints, and the ffmpeg picture put
LOCAL on top of its own absolute number. Stacking on 2026-09-29 hid that
instead of fixing it. So each renderer now sizes its own columns from its
own widest string: here `measureText` on the real font, in the filter
generator below the font's advance times ffmpeg's own format.
✅ **THE SECOND COLUMN HANGS FROM THE RIGHT MARGIN**, `PAD` in from the
edge like every other side of this frame, and starts where its widest
string would have to start to end there. The gap between the columns is
whatever is left, and it is reported by `clockColumns()` rather than
assumed. MEASURED 2026-09-30 at 1280 in headless Chrome at the widest
epoch, `9999999999999`: column one is 501 px from x=60, LOCAL starts at
x=758 and ends on the bed's right edge at 1220, a 197 px gap, and the
inked digits end at 556 and start at 763. A POSITION past 99 minutes is
one character wider and moves column two to x=835.
⚠️ **AND THE MIDDLE IS BACK.** One row instead of two gives the 140 px of
height the stack took back to whatever `drawCamera` lays in behind this.

<a id="burn-scrim"></a>

## pattern.mjs, burn, the scrim

🔴 THE SCRIM IS THE CONTAINER'S BOX, OPT IN, SINCE 2026-09-30. drawtext in
`ffmpegFilters()` draws every word and number on `black@0.55` with a 14 px
border, and a canvas drawing the same furniture over testsrc2's saturated
bars or over a camera had nothing behind its text at all.
⚠️ THE BOX HUGS THE INK VERTICALLY AND THE ADVANCE HORIZONTALLY, which is
what drawtext does: its box is the text's glyph extent, not the font's line
height, so a label and the number under it get two boxes with a few pixels
between them rather than one slab. Width is the advance, so the box does
not twitch as the digits change.
⚠️ OPT IN, NOT DEFAULT: nine other pages call this and none of them asked.
It never reaches the row's bed, which starts `PAD` below the numbers'
baseline, so `readBurned` reads the same row either way.

<a id="burn-motion"></a>

## pattern.mjs, burn, motion

── motion, and it MEANS something ───────────────────────────────────────
The block has to move, or a rate-controlled encoder dedupes a near-static
frame down to nothing (server.mjs picks testsrc2 for the same reason). It
used to travel at `frame * 7` px, which satisfies the encoder and says
nothing — a moving thing on a measuring instrument that is not measuring
anything.

It now crosses the frame ONCE EVERY 10 SECONDS of the burned clock. So it
is a coarse second hand you can read at a glance from across a room and at
any size, when the digits are too small to resolve — and, because it is
driven by the absolute clock rather than a frame counter, TWO PICTURES OF
THE SAME INSTANT PUT IT IN THE SAME PLACE. Two sources side by side, one
block visibly behind the other, is the delay between them, with nothing to
read and no arithmetic. At 30 fps it still advances ~4 px a frame, which is
more motion than the row's low bits gave the encoder anyway.

<a id="burn-square"></a>

## pattern.mjs, burn, square size

🔴 30 BY 30, SAID IN THOSE WORDS 2026-09-18: *"30x30 moving square"*.
It was matched to the row's bed first, on *"square same h and w ans
timecode strip h"*, which came out at 96 and was answered with *"square
size is wrong"*. A strip has two heights a reader might mean, the black bed
at 96 and the white blocks at 56, and neither was it. A number settles it.
⚠️ THE MARGINS ARE STILL DERIVED. *"distance from edges: same as timecode
ones"* stands: it sits `PAD` off the top and crosses the run between the
same left and right margins the strip respects.

<a id="burn-square-top"></a>

## pattern.mjs, burn, square at the top

🔴 AND IT IS AT THE TOP NOW, WHERE THE CLOCKS USED TO BE. Asked 2026-09-18:
*"move square to top in place of timecodes"*. It reads better there than
between them: it is the one thing on this frame that can be read when the
digits are too small to resolve, and the top edge is where an eye lands
first. It still crosses the frame once every ten seconds of the burned
clock, so two pictures of the same instant still put it in the same place.
PAD from the top, and it crosses the run BETWEEN the margins rather than
edge to edge, which is the strip's own left and right.

<a id="read-burned-from"></a>

## pattern.mjs, readBurnedFrom

Read the burned clock off a playing or paused <video>.

`readBurned` samples FIXED coordinates, so the frame has to be drawn at its
NATURAL size — scaling it into 1280x720 reads the row at the wrong pixels and
returns null on every frame, which is indistinguishable from "there is no
row". `moq.mjs` reads a `VideoFrame` through WebCodecs; this is the element
path, and it is the only other way in.

Returns null if the element has no frame yet, or if the checksum disagrees —
which is the honest answer after an encode, a network and a decode.

<a id="read-burned-scale"></a>

## pattern.mjs, readBurnedFrom, normalise onto 1280

NORMALISE BACK ONTO THE 1280 GRID. `readBurned` samples fixed coordinates,
and a delivered frame is very often NOT 1280 wide: Cloudflare chooses the
WHEP resolution and ramps it — measured 640x360, then 960x540, then
1280x720 over the first half-minute of a subscription. At 640 the blocks
are 10 px and every sample lands in the wrong place, so the row reads as
absent when it is merely small (0 clean frames of 85 at 960x540).

Scaling is safe HERE and only here, because the aspect is unchanged: the
row keeps its relative position, and a block is a solid rectangle whose
centre survives resampling. Scaling a differently-shaped source would not
be safe, which is what the camera path had to learn separately.

<a id="ffmpeg-side"></a>

## pattern.mjs, the ffmpeg side

── the ffmpeg side ─────────────────────────────────────────────────────────

WHAT IT CAN REPRODUCE: the hue, both clocks, the labels, and — measured, see
below — the 56-block row itself.

WHAT IT CANNOT: the ffmpeg clock is `spawn epoch + pts`, i.e. the PUBLISHER'S
clock advanced by presentation time, while the canvas burns the DRAWING
machine's wall clock. Read in a browser, an ffmpeg row therefore carries an
unknown container-vs-viewer clock offset. That is fine at the LL-HLS tier
(seconds) and dominates at the WHEP tier (tens of ms). The row makes the
picture identical; it does not make the two numbers the same kind of number.

TWO TRAPS, both already paid for:
  · drawtext with no `fontfile` resolves to nothing and FAILS SILENTLY — the
    epoch never reaches the pixels.
  · the default homebrew ffmpeg has no drawtext at all; src/publish.sh pins
    ffmpeg@7 for libfreetype and the pin is not decoration.

<a id="q"></a>

## pattern.mjs, q

Quote a filtergraph option value.

Single quotes are the filtergraph parser's own quoting, so a `:` or a space
inside them reaches drawtext untouched — which is why the font path can carry
"Courier New Bold.ttf" and why `%{pts\:flt\:…}` keeps its backslashes all the
way to drawtext's OWN expansion layer, which is what actually consumes them.
Two escaping layers, and only the inner one is ours to write.

<a id="row-canvas-only"></a>

## pattern.mjs, the row is a canvas thing only

THE ROW IS A CANVAS THING ONLY. `rowFilters()`, `MS_EXPR` and `BIT_EXPR`
lived here — 57 drawboxes with `enable` expressions, so ffmpeg could burn the
same machine-readable clock. It worked (150/150 frames checksum-clean through
the production x264 settings, and it survived a transcode ladder down to
6.7 px blocks) and NOTHING EVER READ IT. Every reader in this repo is fed by
a browser canvas: `moq.mjs`'s own publisher, `room`, `rig/whep/play.html` off
`publish.html`, `rig/obs-docker` off `clock.html`. It cost a measured +16 %
encoder CPU on a box with one core and two encodes, to be decoded by nobody.

Removed 2026-09-08. It is in the history with its measurements if an
ffmpeg-drawn row is ever wanted; do not re-derive it from scratch.

<a id="ffmpeg-advance"></a>

## pattern.mjs, FFMPEG_ADVANCE

DejaVu Sans Mono Bold's advance, 1233 of 2048 units, read out of the font's
`hmtx` table for `zero`, `colon`, `period`, `space` and `s` alike. drawtext
cannot measure a string before it draws it, so this is the measurement.

<a id="ffmpeg-columns"></a>

## pattern.mjs, ffmpegColumns

Where the ffmpeg picture's two clock columns go, from the widest string
drawtext actually prints on each side.

🔴 **THE ABSOLUTE CLOCK IS NINETEEN CHARACTERS, NOT SIXTEEN.**
`%{pts:flt:…}` formats with `%.6f`, so it prints `1790752257.100333 s`:
ten digits, a point, SIX decimals, a space and the unit. MEASURED
2026-09-30 by rendering testsrc2 through this filter on ffmpeg@7: the box
is 760 px wide, 732 of text plus the 14 px border either side, which is
19 advances of 38.53. The comment that sized the 2026-09-29 stack said
sixteen and three decimals, read off a grab whose tail was hidden under
the LOCAL column.
The wall clock is `%H:%M:%S`, eight characters, always.
`gap` is between the two drawn BOXES, which is what an eye sees, so the
14 px `boxborderw` is taken off both sides of it.

<a id="ffmpeg-filters"></a>

## pattern.mjs, ffmpegFilters

The whole video filter chain for a generated ffmpeg source.

@param epoch   seconds since the epoch at spawn, e.g. (Date.now()/1000).toFixed(6)
@param hue     0..359 — a ROTATION applied to the source's colours, not an
              absolute hue: testsrc2 has no single hue to set. Two publishers
              with different values look different, which is the requirement.
@param font    fontfile path — REQUIRED, see the trap above

<a id="ffmpeg-typography"></a>

## pattern.mjs, ffmpegFilters, typography

SAME TYPOGRAPHY AS THE CANVAS: a small brand-yellow word over a big light
number, not black text in a white box. The box stays, but as a dark scrim
rather than a white slab — testsrc2 is a bright, busy background and plain
white text on it is unreadable, which is why the white box existed at all.

These colours are NOT hue-rotated: `hue=` is applied first, to the source,
and drawtext paints after it. So #ffd400 here is the same #ffd400 the shell
uses, on every publisher, whatever its hue rotation.
⚠️ `x` IS A PARAMETER NOW, BECAUSE THE CANVAS DREW TWO COLUMNS AND THIS
DREW ONE. The two have to LOOK the same or "one pattern, two renderings" is
a claim nothing supports, and the x was hard coded to PAD.

<a id="ffmpeg-top"></a>

## pattern.mjs, ffmpegFilters, top from baseline

🔴 ffmpeg's `y` IS THE TOP OF THE TEXT BOX AND THE CANVAS'S IS THE
BASELINE, SO ONE HAS TO BE CONVERTED INTO THE OTHER. It was a pair of hand
typed numbers, and when the canvas moved to a 64 px number this kept the
offset that belonged to an 84 px one: the number was drawn **25 px too
low** and nothing said so, because no check compares the two renderings and
this one is only ever seen inside a container. Derived now.
0.774 is that ratio, read back off the numbers this file shipped with
(a 32 px label offset 25, an 84 px number offset 65).

<a id="ffmpeg-baselines"></a>

## pattern.mjs, ffmpegFilters, the canvas's baselines

THE CANVAS'S OWN BASELINES, computed the same way, so the two renderings
cannot drift apart again. One row, since 2026-09-30.

<a id="ffmpeg-four-draws"></a>

## pattern.mjs, ffmpegFilters, four draws

FOUR draws, mirroring burn()'s layout: a small word, then a big number,
twice. It used to be two lines with the word and the number sharing one
box, which is not what the canvas does — and the two have to LOOK the
same or "one pattern, two renderings" is a claim nothing supports.
There is no source label any more: the hue says which publisher this is,
and a name burned into a picture is a small text that cannot be read at
the size a demo shows it.

<a id="ffmpeg-seconds"></a>

## pattern.mjs, ffmpegFilters, seconds not ms

pts-derived, and the same instant the row encodes.

In SECONDS, not milliseconds, where the canvas prints ms. Not a choice:
drawtext's `%{expr_int_format:…:d}` clamps at INT32_MAX, so epoch ms
(1.79e12) prints as 2147483647 and ffmpeg says "Conversion of
floating-point result to int failed" — measured on ffmpeg@7. The unit is
therefore printed beside the number rather than left to be guessed.

<a id="ffmpeg-gmtime"></a>

## pattern.mjs, ffmpegFilters, gmtime escapes

LEGIBLE — the publisher's own wall clock. %{pts:flt:…} is precise and
unreadable; this is the one a person checks against their own watch.
The two drifting apart is real information: it is encoder drift.

The triple backslash is not a typo. gmtime's strftime argument has to
survive drawtext's expansion parser, which splits `%{name:args}` on a
bare colon — so the colons INSIDE the format need an escape of their own,
one level deeper than the one separating `gmtime` from its argument.
Measured against ffmpeg@7: `\\\:` renders 15:31:25, `\:` errors with
"%{gmtime} requires at most 1 arguments".

<a id="cli"></a>

## pattern.mjs, CLI guard

CLI: `node demo/shell/pattern.mjs --epoch=… [--hue=…] [--font=…]`
which is how src/publish.sh gets its filter — one spec, two renderings.

The guard is an EXACT url match, demo/server.mjs's idiom, not
`argv[1].endsWith('pattern.mjs')`: a suffix test would also fire for any
script whose own name happens to end that way, and this module is imported by
a browser where `process` does not exist at all.
