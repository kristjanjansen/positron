# Kit lessons: grain-scope

The longer comments cut from `demo/shell/grain-scope.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-grain-scope.md#<anchor>`.

<a id="header"></a>

## `grain-scope.mjs` module header

```text
demo/shell/grain-scope.mjs — the sound being eaten, and where.

The picture is the MATERIAL: the held seconds drawn as a waveform, left to
right. On it, a lit range is where grains are being taken from, a cursor is
the middle of that range, and every grain flickers as a tick at the exact
point it read. Move `where` and the range slides along the sound. Widen
`scatter` and it opens. Turn density up and the flicker thickens. Freeze and
the whole picture stops dead.

🔴 THE FIRST VERSION OF THIS PLOTTED POSITION AGAINST TIME AND IT WAS USELESS
to anyone except me. It was a debugging instrument — it answered "did a grain
fire", which was my question, not the player's. Its vertical axis read "0.35
of the way through the held seconds", which is a NUMBER, not a place you can
hear. Drawn on the waveform it came from, the same number is a place: that
quiet bit just before the loud bit. The verdict on the old one — "this viz
does nothing to me, perhaps to you" — was exactly right and is the reason
this file looks like this.

⚠️ IT STILL DOES NOT CARE WHERE THE GRAINS COME FROM, and it still says what
it knows. Two pictures, chosen by what it is given:

  buffer() + mark()   there is material AND the engine reports its grains.
                      The waveform, the range, the cursor, the flicker.
                      Everything drawn is MEASURED.

  feed()              audio and nothing else — a stream from another machine
                      that sends sound and no events. A scrolling waveform of
                      what arrived, and the gutter says it is all that can be
                      honestly shown. No range, no cursor, no grain ticks:
                      inventing them would be drawing knowledge we do not
                      have, and this project already keeps "we did not look"
                      and "we looked and it was fine" apart everywhere else.

⚠️ AND THE GUTTER NAMES IT. A picture of grains drawn from settings and a
picture drawn from reported grains look alike and mean completely different
things, so the line under it says which this is, in words.

🔴 `playhead()` STOPS THE PICTURE AND THAT IS THE WHOLE POINT OF IT. Asked for
in these words: *"keep x scale the same, just stop the viz and move loop
playhead."* A loop plays a window of sound that has already gone by, so while
one runs there is nothing new to scroll and a wave that kept sliding would be
drawing arriving audio that the listener is not hearing. Setting a playhead
freezes the scrolling picture where it stands, at the SAME seconds-per-pixel
it already had, and runs one solid hairline across it; clearing the playhead
starts the scroll again. Nothing is rescaled in either direction, so the
picture a reader learned before the loop is the picture they are reading
during it.
```

<a id="window-narrower"></a>

## `grain-scope.mjs` createGrainScope: window narrower than the buffer

```text
🔴 A WINDOW NARROWER THAN THE BUFFER IT DRAWS GRAINS FROM SILENTLY DROPS THE
OLDEST OF THEM, AND IT IS REFUSED. A grain reported at position `p` of a
`grainSeconds` buffer is drawn at `bornAt - (1 - p) * grainSeconds`, so with
`seconds` smaller than `grainSeconds` every grain read from the first
`1 - seconds/grainSeconds` of the buffer lands left of x=0 and is skipped by
the bounds test.

MEASURED on `/archive/radio/`, which asked for a 6 s window over an 8 s buffer:
the oldest QUARTER of the granulator's range could not be drawn at all, so
whenever its read head sat there the picture showed no grains and the page's
own check read `0 lit`. That was taken for the station being off air more
than once, which is the expensive half: a display defect wearing an outage's
clothes. The picture was also simply wrong for a reader, every day, with
nothing saying so.

It throws rather than widening itself, because a scope that quietly changes
the axis it was asked for is a second thing that can disagree with the page.
```

<a id="grainseconds-fullscale"></a>

## `grain-scope.mjs` createGrainScope: grainSeconds and fullScale

```text
🔴 `grainSeconds` PUTS GRAIN TICKS ON THE SCROLLING WAVE, and the branch
below explains at length why that is normally forbidden: a remote engine's
grain positions are fractions of ITS held buffer, while its arriving audio
is the last few seconds of OUTPUT — two quantities on two axes, and
overlaying them invites a reading nothing supports.

⚠️ THAT ARGUMENT DOES NOT HOLD WHEN THE MATERIAL IS THE SAME AUDIO. On
`/archive/radio/` the granulator's buffer is filled from the very stream this
scope is drawing, on one clock in one process — so a grain that read at
fraction `pos` of an N-second buffer read the audio that arrived
`(1 - pos) * N` seconds ago, and that lands on this axis exactly. Passing
the buffer length is how a page says "these are the same seconds"; leaving
it at 0 keeps the refusal.
🔴 `fullScale` LOCKS THE VERTICAL SCALE, AND WITHOUT IT THE PICTURE LIES
ABOUT LOUDNESS. The default draws the waveform normalised to the loudest
sample CURRENTLY IN VIEW, which is right for a fixed buffer you are
inspecting and wrong for a stream: as a loud passage scrolls off the right
edge the divisor drops and everything left standing suddenly grows, so a
quiet stretch looks identical to a loud one and the whole picture heaves.
Reported from `/archive/radio/` as *"the scale keeps changing"*, which is
exactly what it was doing.

Set it to an amplitude (1 = full scale) and the height means a level again.
⚠️ It is opt-in so that `/grains/`, which inspects a held buffer where
relative shape is the subject, keeps the behaviour it was built with.
```

<a id="gutter"></a>

## `grain-scope.mjs` gutter element

```text
⚠️ THE ELEMENT STAYS AND IS NEVER WRITTEN TO. Removing it outright would
change the wrap's height and every page that lays out around this
component; keeping it empty keeps the geometry and makes the absence
deliberate rather than a deletion somebody has to rediscover.
```

<a id="colours"></a>

## `grain-scope.mjs` colours: mark and head

```text
🔴 A LOOP IS DRAWN IN GREY AND THE THING THAT MOVES IS NOT. ASKED FOR:
*"loop info viz colors: just grayscale?"*. The band, the two ends, the
wraps and the live edge were all `--hi`, the same yellow as the grain
ticks, so a picture of a granulator chewing a loop was one colour saying
five things. `mark` is the furniture: where the loop is and where it came
round. `head` is the playhead, which is the only mark here that is
somewhere different every frame, and it is the brightest grey there is
rather than a second hue. What keeps `--hi` is the grains, because they
are the measurement the picture exists to show.
```

<a id="wraps"></a>

## `grain-scope.mjs` wraps

```text
⚠️ `wraps`, NOT `marks`. This object already had `mark(g)` — one grain, at
the point in the material it read — and a second `mark()` defined lower in
the SAME object literal silently replaced it. Every grain tick on
`/archive/radio/` stopped being drawn, the page's own assert read `0 ticks
alive`, and it was put down to the station being off air, which it also
was. Two names, two jobs, and the collision was invisible because a later
key in an object literal simply wins.
```

<a id="held"></a>

## `grain-scope.mjs` held

```text
🔴 THE COLUMNS THE FROZEN PICTURE IS DRAWN FROM, COPIED AT THE INSTANT IT
FROZE. REPORTED as the waveform being *"chipped away"* while a loop ran,
and the mechanism is two clocks: the picture is drawn against `frozenAt`,
which does not move, while `feed()` goes on trimming `scroll` against
`now()`, which does. So every second of loop dropped a second off the LEFT
of a window that was not sliding, and after `seconds` of looping the whole
wave had been eaten from the left edge inward while the marks stood still.

⚠️ IT IS A SNAPSHOT AND NOT A LONGER RETENTION. Holding `scroll` back to
`frozenAt - seconds` instead would work and would grow without bound: a
loop left running for ten minutes is 150,000 columns nobody is drawing.
A copy is the window being read, `scroll` goes on being the last few
seconds of real audio, and letting go of the copy is what makes the picture
live again — with the loop's own seconds already in it rather than a hole.
```

<a id="loop-marks"></a>

## `grain-scope.mjs` loopA and loopB

```text
🔴 A LOOP IS THREE MARKS, NOT ONE, AND THEY ARRIVE AT DIFFERENT TIMES.
Specified from the page rather than invented here:

  press one   a line at the live edge, and THE WAVE KEEPS SCROLLING. The
              sound is still arriving and being kept, so a frozen picture
              would be a lie about what the button just did. The seconds
              since that line are tinted, which is the only thing on screen
              saying "this part is being recorded".
  press two   the wave STOPS where it is, and a second line lands at the
              rightmost point it reached. Those two lines are now the ends
              of the loop, and they cannot move, because the picture under
              them cannot.
  then        a third line runs between the two, and only between the two.
  press three the lines go and the wave starts moving again.

⚠️ `loopA` AND `loopB` ARE TIMES ON THIS FILE'S OWN CLOCK, not fractions.
A fraction would have to be re-read against the window every frame while
the window is still sliding, and the first mark lives through exactly that.
```

<a id="grainalpha"></a>

## `grain-scope.mjs` grainAlpha

```text
🔴 HOW SOLID THE GRAINS ARE DRAWN, AND IT IS A NUMBER THE PAGE OWNS.
`/archive/radio/` blends a live station against the granulator chewing it, and
the fader that does that is the one gesture on the page — so the ticks are
drawn at exactly the share of what you are HEARING that they are: invisible
when the fader is all radio, solid when it is all granulator.

⚠️ IT MULTIPLIES THE PER-GRAIN FADE, IT DOES NOT REPLACE IT. Each tick
already fades over `fadeMs` from the instant it fired, which is the thing
that makes the picture a flicker rather than a smear; this scales the whole
layer under that. Two alphas, two meanings — age, and share of the output.

⚠️ DEFAULT 1, so `/grains/`, which has no blend to report, is unchanged.
And it is deliberately NOT applied to the waveform: the wave is the
MATERIAL, which is being eaten whatever the fader says, so dimming it would
be the picture claiming the radio had gone away.
```

<a id="freeze"></a>

## `grain-scope.mjs` freeze

```text
Stop the picture at `t`, and keep the columns it is standing on.

⚠️ ONE `now()`, READ BY THE CALLER AND PASSED IN. `loopTo` needs the same
instant for the freeze and for the end mark, and taking the clock twice a
microsecond apart drew the wave held at one moment and the band that marks
the loop against another. That was already a written rule here and the
snapshot is a third reader of the same instant.
```

<a id="feed-tone"></a>

## `grain-scope.mjs` feed: tone

```text
@param {number|null} tone 0..1, where the energy sits — 0 all low, 1 all
  high. OPTIONAL, and the picture is honest either way: given one, each
  column is coloured by it; given none, the wave draws flat as before.
  ⚠️ The SCOPE does not compute it. Whoever owns the audio owns the
  measurement; this file draws what it is handed and nothing else.
```

<a id="feed-frozen"></a>

## `grain-scope.mjs` feed: recording while frozen

```text
🔴 A FROZEN PICTURE GOES ON RECORDING. It used to drop every sample and
then wipe the held columns on release, which left a gap in the picture
for exactly as long as the loop had run. REPORTED, and the reason it is
wrong is one sentence: **there was no silence**. The loop was playing
the whole time and it plays into the same graph, so those seconds have
audio in them and the wave should simply carry on with the loop in its
past and the station after it.

⚠️ THE OLD WORRY WAS REAL AND IS ANSWERED BY RECORDING RATHER THAN
ACCUMULATING. Holding one running maximum across the whole loop would
have put a single enormous column at the seam, a spike that never
happened. Columns keep being pushed at their own times instead; what
freezing changes is only the RIGHT EDGE the picture is drawn against,
so the new ones are off-screen until the edge starts moving again.
```

<a id="grainalpha-setter"></a>

## `grain-scope.mjs` grainAlpha setter

```text
0..1 — how much of what the listener hears is the granulator. See the
note by `grainAlpha` above. Anything outside 0..1 is clamped rather than
refused: this is fed straight off a fader.
```

<a id="wrap"></a>

## `grain-scope.mjs` wrap

```text
A moment worth seeing on the scrolling wave — today, a loop coming round.

🔴 THE LOOP'S ENDS ARE NOT DRAWABLE HERE AND THE WRAP IS. This scope's
axis is ARRIVAL TIME: the last few seconds of what came out, scrolling
left. A loop's start and end are positions in the MEDIA, and at any rate
but 1x the two axes advance at different speeds — so drawing the bounds
on this picture would put media positions on a time axis, which is the
reading the whole file is careful not to invite (see `grainSeconds`).
A WRAP is different: it is a thing that happened at an instant, and an
instant is exactly what this axis holds. Marked where it happened, it
scrolls away with the audio it belongs to — and the spacing between two
marks is the loop's length as you actually heard it, which is the one
number a picture can give you that the transport cannot.
```

<a id="playhead"></a>

## `grain-scope.mjs` playhead

```text
Where a loop has got to, as a fraction of the picture's width, drawn as
one solid hairline. `null` takes it away.

🔴 IT ALSO STOPS THE SCROLLING PICTURE, AND THAT IS NOT A SIDE EFFECT —
it is the thing that was asked for (see the note at the top of this
file). While a playhead is set the wave holds still at the scale it
already had, so the line moves against a fixed picture instead of two
things sliding past each other at different speeds. Clearing it lets the
wave start again.

⚠️ THE FRACTION IS OF THE PICTURE, NOT OF THE LOOP, and the caller is who
turns one into the other. This file knows how many seconds are across its
own width and knows nothing about a loop's ends, so anything else would
be it guessing at somebody else's axis.

@param {number|null} frac 0..1, clamped. Anything not a finite number
  takes the playhead away, so `playhead()` and `playhead(null)` agree.
```

<a id="loopto"></a>

## `grain-scope.mjs` loopTo

```text
Press two: stop the picture and mark where it stopped.
⚠️ `frozenAt` IS SET FIRST, AND `loopB` READS IT. Taking `now()` twice
puts the second line a frame's worth of milliseconds right of the edge
the picture actually froze at, which at eight seconds across is a couple
of pixels of the line standing outside the wave it is supposed to end.
```

<a id="freezeonloop"></a>

## `grain-scope.mjs` freezeOnLoop

```text
🔴 FREEZING IS RIGHT WHERE SOMETHING KEEPS LANDING ON THE FROZEN PICTURE,
AND WRONG WHERE NOTHING DOES.

On `/archive/radio/` the wave stops and the GRAINS carry on being drawn
across the held span, so a stopped picture is still a live one: the thing
that moves is the instrument reading the seconds again and again.

⚠️ THE EXAMPLE THIS NOTE USED TO GIVE HAS CHANGED SIDES, AND THE OPTION IS
WHY IT COULD. `/tapes/` passed `false`, because its loop was made of SEEKS:
the file really was still playing, so a picture that stopped was claiming
a silence that did not happen, reported as *"visualization just stops on
looping tapes"*. That page keeps its lap in a ring now and plays it from
there, so the picture is a fixed piece of sound with a line crossing it,
and it freezes like `/archive/radio/` does. No page passes `false` today. The
option stays because the question it answers is real: whether anything is
still arriving to draw is a fact about the caller, not about this file.
```

<a id="loopto-now"></a>

## `grain-scope.mjs` loopTo: one now()

```text
🔴 ONE `now()`, READ ONCE. The line this replaced carried a warning saying
exactly that and the `freezeOnLoop` edit broke it anyway: two calls a
microsecond apart put the freeze instant and the loop's end mark at
DIFFERENT times, so the picture is held at one moment while the band that
marks the loop is drawn against another. What that looks like is the wave
vanishing and the loop region sitting alone on an empty scope, reported
as the loop eating the waveform.
```

<a id="loopoff"></a>

## `grain-scope.mjs` loopOff

```text
Press three: the wave catches up with live again.

🔴 NOTHING IS THROWN AWAY. This used to empty `scroll`, because with the
picture taking nothing in during a loop the held columns were followed by
a hole, and the wave is one polygon so the hole was drawn as a flat line
at zero: a picture of silence over audio that was playing. Now the loop's
own seconds were recorded as they played, so letting the edge move again
simply reveals them, and the station follows on behind with no seam.

⚠️ THE TWO END MARKS STAY. They age off the left with the audio they
belong to, exactly as a wrap does, so the loop you just heard is still
visible in the picture's past instead of vanishing the moment it stops.
```

<a id="loopoff-scroll"></a>

## `grain-scope.mjs` loopOff: keep scroll

```text
🔴 THE SNAPSHOT GOES AND `scroll` STAYS, AND THAT IS THE OPPOSITE OF
WHAT THIS DID. It used to empty `scroll`, because back when a frozen
picture dropped every sample the held columns were followed by a hole,
and the wave is one polygon so the hole was drawn as a flat line at
zero: a picture of silence over audio that had been playing.
`feed()` records right through a freeze now, so `scroll` holds the
loop's own last seconds, unbroken, and wiping it blanked a picture
that had exactly the right thing in it.
```

<a id="playhead-no-freeze"></a>

## `grain-scope.mjs` playhead: no freeze

```text
⚠️ IT NO LONGER FREEZES BY ITSELF. `loopTo()` is what stops the
picture, and it is a different press from the one that starts the line
moving. A `playhead` that also froze meant the first position pushed
after the loop closed decided where the wave stopped, which is a frame
or two late and is the wrong event to hang it on.
```

<a id="showing"></a>

## `grain-scope.mjs` showing

```text
Which of the two pictures is being drawn. ⚠️ READ OFF THE SAME STATE THE
 PAINT BRANCHES ON, not off whatever a caller last asked for — a page
 that thinks it switched and did not is exactly the thing worth checking.
```

<a id="stats"></a>

## `grain-scope.mjs` stats

```text
⚠️ `frozen` IS REPORTED SEPARATELY FROM `playhead` even though one sets
the other, because they answer different questions: one is where the line
is, the other is whether any new audio is reaching the picture at all.
A check that a loop stopped the wave needs the second and cannot get it
from the first.
⚠️ `frozenCols` IS HOW A CHECK SEES THE WAVE BEING EATEN. A frozen
picture whose column count FALLS is the chipping-away bug; `frozen: true`
cannot see it, because the wave was stopped either way.
```

<a id="grains-no-material"></a>

## `grain-scope.mjs` paint: grains without material

```text
── grains, on the buffer's own axis, with nothing drawn under them ──

🔴 THE THIRD PICTURE, AND IT EXISTS BECAUSE THE AXES DO NOT MATCH.
A remote engine can report WHERE each grain read — a fraction of the
held seconds — long before it can send the held seconds themselves. Its
arriving audio is a different quantity on a different axis (the last
few seconds of OUTPUT), so drawing ticks over that waveform would put
buffer positions on a time axis and invite the one reading this must
never support.

So the waveform goes and the ticks stay, on the axis they belong to —
which is also the axis the page's own granulator is drawn on, so the
two are finally comparable. What is missing is named in the gutter
rather than approximated.
```

<a id="halves"></a>

## `grain-scope.mjs` paint: halves

```text
⚠️ THE HALF IS DRAWN AS A SIDE, NOT AS A COLOUR. One meaning for colour
across every demo: a mark's colour says HOW IT LANDED. Which granulator
fired it is identity, and identity is position — granulator one above
the line, two below it.
```

<a id="audio-only"></a>

## `grain-scope.mjs` paint: audio only

```text
── audio only: what arrived, scrolling ────────────────────────────
⚠️ THE SNAPSHOT WHILE FROZEN, `scroll` OTHERWISE. See `held` above: the
live array goes on being trimmed against a clock this picture is no
longer drawn on, so reading it here is what ate the wave from the left.
```

<a id="frozen-clock"></a>

## `grain-scope.mjs` paint: frozen clock

```text
⚠️ THE CLOCK IS THE FROZEN ONE WHILE A LOOP RUNS, and that single
substitution is what holds the x scale. `seconds` never changes, so
stopping the right edge stops the whole mapping with it: every column
stays exactly where the reader last saw it rather than sliding left
under a line that is supposed to be the only thing moving.
```

<a id="one-grey"></a>

## `grain-scope.mjs` paint: one grey and the kept seconds

```text
🔴 ONE GREY, AND IT IS NOT A STYLE CHOICE — THE SAME RULE `floor`
FOLLOWS AND FOR THE SAME REASON. There was a hue-mapped wave here:
height for loudness, hue for where the energy sits, bounded to ~95
degrees of `--hi` rather than a rainbow. The argument was a good one —
a flat grey wave cannot tell a cymbal from a bass note at the same
level — and it is not the argument that was being had. The repo owner
asked for the original monochrome back, twice, and a second
measurement nobody asked for is a second measurement nobody asked for
however well it is reasoned.

⚠️ AND IT WAS UNFINDABLE FROM THE PAGE. `demo/archive/radio/index.html`
contains no colour at all — one `theme-color` meta and nothing else —
because the hue lived in this shared kit, switched on merely by the
data carrying a `tone` field. Looking at the page that showed it would
never have found it. If colour comes back here it needs a flag the
PAGE sets by name, not a field that turns it on by being present.
── the seconds being kept ─────────────────────────────────────────
🔴 UNDER THE WAVE, AND IT IS THE ONLY THING THAT SAYS RECORDING IS
HAPPENING. Between the first press and the second the picture goes on
scrolling exactly as before, which is correct and leaves the button
with nothing visible to show for itself. A tint from the first mark to
the live edge is that: it grows as the sound arrives, and it is the
shape the loop will have. Drawn before the wave so the wave stays the
brightest thing in the box.
```

<a id="wrap-marks"></a>

## `grain-scope.mjs` paint: wrap marks

```text
🔴 ONE PIXEL, SOLID, IN THE LOOP'S OWN GREY, THE SAME AS EVERY
OTHER LOOP EDGE. These used to fade from 0.25 to 0.80 with age, on
the argument that the fade says which wrap is the recent one without
spending a second channel. The argument is fine and the consistency
is worth more: the transport bar draws a loop's ends as a 1 px solid
border in the same grey, so a loop boundary that is sometimes a
quarter-strength hairline is the same mark in three strengths across
two surfaces. Age is already said by position, which is the channel a
scrolling wave has for free: the leftmost is the oldest, and it
leaves the picture when the audio it belongs to does.
```

<a id="loop-ends"></a>

## `grain-scope.mjs` paint: loop ends

```text
── the loop's ends ────────────────────────────────────────────────
One pixel, solid, in the loop's grey: the same mark the transport bar
draws round a loop. ⚠️ NOT the same as the playhead any more — those
were one colour and the playhead crosses both of them, so at the top
and the bottom of a lap the moving mark and the fixed one it had
reached were indistinguishable. The first
appears on the first press and travels left with the audio it belongs
to while the picture is still moving; the second lands when the
picture stops, and after that neither can move because nothing under
them does.
⚠️ THEY EXPIRE WITH THEIR AUDIO. A mark whose second has scrolled off
the left is a mark about nothing, and left in place it would pin
itself to the edge and read as a loop that is still running.
```

<a id="grains-on-wave"></a>

## `grain-scope.mjs` paint: grains on the wave

```text
the grains, on the same seconds the wave is drawn on.
⚠️ SKIPPED OUTRIGHT AT ZERO, not drawn at `globalAlpha = 0`. The two
are identical on screen and they are not identical to read: a loop
that runs and paints nothing invites exactly the report that came in —
*"turn off grain animation if you are at zero"* — from somebody
watching a picture that was still moving for a different reason.
Skipping says in the code what the fader says on screen.
```

<a id="bornat"></a>

## `grain-scope.mjs` paint: bornAt clock

```text
⚠️ ON THIS FILE'S OWN CLOCK. `now()` is `performance.now()/1000 - t0`
and `g.born` is a raw `performance.now()` in MILLISECONDS, so the
two must be reconciled before either touches `X()`. Mixing them
puts every tick t0 seconds out — a picture that looks plausible
and is wrong by a constant, which is the hardest kind to notice.
```

<a id="live-edge"></a>

## `grain-scope.mjs` paint: live edge

```text
🔴 THE LIVE EDGE IS NOT DRAWN ON A STOPPED PICTURE. This hairline
means "this is now", and while a loop runs the right edge is the
moment the picture stopped rather than the moment you are in. Left
standing it would be a second full-height line in the same colour as
the playhead, claiming to be the live edge of a wave that is not
advancing.
```

<a id="source-line"></a>

## `grain-scope.mjs` source line

```text
🔴 A LINE SAYING WHAT THIS PICTURE IS, AND IT WAS DEAD CODE UNTIL NOW.
`source(name)` has existed and been called by `/archive/radio/` for weeks and the
string was assigned and never drawn: a component with a setter and no
reader, which is the same shape as a control that looks live and is
inert. FOUND 2026-09-16 while answering why `/tapes/` shows an empty box
on most of its recordings.

⚠️ IT IS STATIC TEXT IN A FIXED CORNER, which is what makes it allowed at
all. CLAUDE.md forbids anything that redraws every frame from changing
how much room it takes; this changes only when the page sets it, and it
is drawn INSIDE the canvas, so it cannot reflow the page whatever it says.
```

<a id="source-colour"></a>

## `grain-scope.mjs` paint: source line colour

```text
⚠️ `--dim`, NOT `--line`. `--line` is the colour of a grid rule on a
dark ground and a sentence in it is not readable; this has to be read.
```

<a id="frozen-grains"></a>

## `grain-scope.mjs` paint: playhead and frozen grains

```text
── the loop's playhead ──────────────────────────────────────────────
Last, so it is on top of whichever of the three pictures was drawn, and
SOLID: no age, no fade, no alpha. Every other mark here is faded by
something (a tick by its age, a wrap by how long ago it happened, the
grain layer by the fader), and fading is how this file says a mark is
reported rather than certain. A playhead is neither: it is where the
sound being played has got to, which is not a measurement that can be
more or less confident.
── grains, while the picture is stopped ──────────────────────────────
🔴 A FROZEN WAVE USED TO DRAW NO GRAINS AT ALL, and the page still had a
granulator running. REPORTED as not being able to see the grain
animation: every tick was placed at `bornAt` on an axis whose right edge
had stopped moving, so every one of them landed past the right edge and
was skipped by the bounds test. The picture was correct about the wave
and silently blank about the thing chewing it.

⚠️ POSITIONED ACROSS THE LOOP, AND ONLY BECAUSE THE LOOP IS WHAT IS BEING
READ. A grain reports where in the granulator's buffer it read; while a
loop plays, that buffer holds the loop and nothing else, so the fraction
IS a position inside these two marks. Without both marks there is no span
to map into and nothing is drawn, because a tick at a guessed position is
worse than no tick.
```

<a id="playhead-colour"></a>

## `grain-scope.mjs` paint: playhead colour

```text
⚠️ THE ONE MARK HERE THAT IS SOMEWHERE ELSE EVERY FRAME, so it is the
one that is not drawn in the furniture's grey. See `C.head`.
```

<a id="playhead-span"></a>

## `grain-scope.mjs` paint: playhead span

```text
🔴 BETWEEN THE TWO ENDS, NOT ACROSS THE BOX. It used to run the whole
width, which is only right when the loop happens to be the entire
window: any shorter loop had its playhead outside its own ends, over
audio it was not playing. With both marks known the fraction is mapped
into the span they bound, and the fallback stays the full width for a
caller that pushes a position without having marked anything.
```

<a id="no-frame"></a>

## `grain-scope.mjs` paint: no frame

```text
🔴 THE PICTURE PAINTS NO FRAME OF ITS OWN, AND IT DID UNTIL 2026-09-29.
   `ctx.strokeRect(0.5, 0.5, W - 1, H - 1)` in `C.line` stood here, and it
   is the ring three separate reports were about: *"rm double bordering"*
   against `/pack/` and *"rm thick borders round waveform"* against
   `/archive/radio/` on 2026-09-21, *"rm padding and its border around waveform
   canvas"* against `/pack/` on 2026-09-22, and *"rm border around
   waveform"* against `/pack/`'s SAMPLES tab today.
   🔴 ALL THREE EARLIER REPAIRS WENT TO THE STYLESHEET AND NONE OF THEM
   COULD REACH THIS. MEASURED 2026-09-29 before anything was changed, by
   reading the computed value and then sampling the canvas: the element's
   `border-top-width` is 1px on a bare scope and 0px on a glued one, which
   is `.pos-glue.pos-glue > * { --edge: 0 }` at `shell.css:1018` working
   exactly as written, and the canvas's own outermost pixel row read
   `31,41,55` in BOTH arrangements, which is `--line` at #1f2937. So a bare
   scope drew the CSS border and this stroke as two 1 px lines of one
   colour touching, which is the 2 px edge reported as THICK, and a glued
   scope drew this stroke alone, which is the ring reported today.
   🔴 AND A PAINTED EDGE IS UNREACHABLE BY EVERY CHECK THIS PROJECT HAS.
   `/archive/radio/` carries an assert reading `getComputedStyle(canvas)
   .borderTopWidth === 0` inside a glue, written for the 2026-09-21 report,
   and it has been GREEN the whole time the ring was on screen. A frame in
   the backing store is the inline-style defect in a different costume: no
   selector can beat it and no computed value can see it.
   ✅ SO THE EDGE IS THE ELEMENT'S, WHICH IS THE ONE THAT ALREADY READS
   `--edge`. A bare scope keeps its border, which is what the kit's own note
   at `shell.css:3019` requires so a picture on a `--card` ground does not
   dissolve into it, and a glued one has the glue's seam and nothing else.
   One edge per object, drawn by the outermost thing that owns it.
   ⚠️ NO CHECK ANYWHERE COUNTED THIS INK, WHICH WAS CHECKED RATHER THAN
   ASSUMED. `/pack/`'s `waveInk` counts `r > 40 || g > 45 || b > 55` and
   #1f2937 is 31/41/55, under all three; `/archive/radio/`'s grain ink wants yellow,
   its head ink wants near white, and its `waveSpan` wants `b >= 62` with a
   comment naming this exact border as the thing the blue channel excludes.
```

<a id="no-caption"></a>

## `grain-scope.mjs` paint: no caption

```text
🔴 NO PROSE UNDER A PICTURE THAT REDRAWS EVERY FRAME. This carried a
sentence that rewrote itself sixty times a second and REFLOWED — three
lines, then four, then three — so the whole page jumped under the
reader's eye continuously. The words were accurate and it did not matter;
a caption that changes length is a caption that cannot be read, and it
moves everything below it as well. Reported as "a horrible jump of
content each time it updates", which is exactly what it was.

The count that mattered is a NUMBER, and a number belongs in a cell of
fixed width — `grains` prints it in its readout, where it changes without
moving anything. See `shell.css`'s note on live text and reflow.
```
