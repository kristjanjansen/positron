# Kit lessons: looper.mjs, looper-test.mjs

The long comments cut from `demo/shell/looper.mjs` and `demo/shell/looper-test.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-looper.md#<anchor>`.

<a id="header"></a>

## looper.mjs, file header

demo/shell/looper.mjs — the looper, for every page that keeps seconds of sound.

🔴 IT WAS `/archive/radio/`'S AND IS NOW EVERY PAGE'S, ASKED FOR IN THOSE WORDS:
*"make it use same looping ui as radio (make it global)"*. What was on that
page was a vocabulary of ways to play a kept lap, a button glued to LOOP that
cycles → ← ⇆, a ring that keeps the sound, and one voice that reads the lap
under whichever way is showing. None of that is about radio. Two pages had a
LOOP button and only one of them could turn a loop round, which is the shape
this repo already paid for three times: a control that exists in one page and
nowhere else is a component that has not been noticed yet.

The split, which is the whole of why this is a module and not a copy:

  THIS FILE owns what a loop IS. The ring, the kept buffer, the mirrored
  copy, the voice, the lap, where the sound has got to, the button's face.
  THE PAGE owns what else happens on its own graph: which node stops being
  heard while a loop plays, what the log calls the thing it is looping, and
  what its picture does.

⚠️ TWO PAGES REACH `keep()` AND `close()` AT DIFFERENT MOMENTS, AND BOTH ARE
RIGHT. On a live station the sound the loop will play HAS NOT ARRIVED YET, so
the first press opens a window and the second closes it: `keep` on the bar's
`fill`, `close` on its `set`. On a tape both marks are behind you and the bar
loops the file itself, so the first lap comes off the tape while the ring
fills: `keep` on `set`, `close` on the first `wrap`. From there the two pages
are the same instrument.

⚠️ NEGATIVE PLAYBACK RATES DO NOT EXIST. `AudioBufferSourceNode.playbackRate`
will not go below zero in any shipping engine, so backwards is a MIRRORED
COPY of the samples and pingpong is the two joined end to end. That is the
reason this module has to hold the audio at all: a page cannot play a media
element backwards, and a kept lap it can.

The arithmetic is separated from the wiring on purpose: `ringOrder`,
`planVoice` and `headOf` are pure and are graded by `looper-test.mjs`, with
no browser and no audio hardware. Every bug this module has ever had was in
one of those three (a ring copied from the wrong index sounds like an edit
nobody made; a pingpong head that was a ramp sat at the right edge for the
whole return half).

<a id="loop-ways"></a>

## looper.mjs, LOOP_WAYS

🔴 THE WAYS, AND THE ORDER OF THIS TABLE IS LOAD-BEARING. Every check in
`/archive/radio/` drives a way BY NUMBER, so `pingpong` is fifth rather than third:
renumbering them would make four asserts grade a different way than their own
labels claim. Each is a different MECHANISM rather than a different number of
one, which is the rule the twelve sounds were rebuilt under.

 round  the kept seconds as they arrived        the default
 back   the same samples, mirrored              a direction
 half   the same lap, twice as long             a speed
 chop   a sixteenth of the lap, repeating       a length
 pingpong  forwards then backwards, seamless    a direction

<a id="loop-turn"></a>

## looper.mjs, LOOP_TURN

🔴 THE THREE THE BUTTON CYCLES, IN THE ORDER IT CYCLES THEM. Directions, and
only directions: `half` is what a rate row beside it is for and `chop` is a
length with no control today. Both are still reachable and both are still
driven by the checks, which is a loose end written down rather than left to
be found.

<a id="way-glyph"></a>

## looper.mjs, WAY_GLYPH

The face of the button for each way. ⚠️ A GLYPH IS THE STATE, NOT THE NEXT
PRESS, which is the opposite of what LOOP's own word does. The difference is
that LOOP has three states with two names and this has three states with
three faces: showing the next one would mean the button never says which way
the loop you are listening to is running.

<a id="ring-order"></a>

## looper.mjs, ringOrder

Where the oldest kept sample sits in the ring.

⚠️ NOT ZERO ONCE IT HAS WRAPPED. The ring's write head is the oldest sample
the moment it is full, so copying from index 0 plays the seconds in two
pieces with the join in the middle, which sounds like an edit nobody made.

<a id="plan-voice"></a>

## looper.mjs, planVoice

What one voice reads, for a way and a place to pick it up.

`unit` is one pass of the KEPT seconds, which is what a picture of the loop is
as wide as. `whole` is the buffer this way actually reads, which is twice
`unit` under pingpong. `fromFrac` is a fraction of the PICTURE, so a press
does not throw you back to the top of the loop.

🔴 `null` MEANS THE TOP OF THE LOOP AND IT IS NOT THE SAME AS `0`. Zero is the
left edge of the picture, and under `back` the top of the loop is the RIGHT
edge: the mirrored buffer's first sample is the kept seconds' last one. A new
loop opening backwards at picture 0 mirrors to an offset of the buffer's whole
duration, where there is nothing left to read.

<a id="plan-voice-here"></a>

## looper.mjs, planVoice, here

Where that fraction of the PICTURE sits in the buffer this voice reads.
⚠️ AGAINST `unit`, NEVER `whole`: under pingpong the buffer is twice the
picture, and against `whole` a press at the middle of the wave would pick
the sound up at the turn.

<a id="plan-voice-begin"></a>

## looper.mjs, planVoice, begin

🔴 WHERE IT ACTUALLY STARTS READING, AND IT WAS ALWAYS THE TOP ONCE.
`loopStart`/`loopEnd` bound the lap; the second argument to `start()` is
where inside it to begin, and they are different numbers. Only `chop` was
getting this, so pressing ← jumped the sound to the far end of the picture.

<a id="voice-pos"></a>

## looper.mjs, voicePos

Where the voice is reading, in seconds of the buffer it reads.
⚠️ FROM WHERE THE VOICE WAS TOLD TO BEGIN (`off`), not from the top of its
lap: a way change picks the sound up where it already was.

<a id="head-of"></a>

## looper.mjs, headOf

Where the SOUND is, as a fraction of the kept seconds a picture draws.

From the voice's own clock rather than from a deck's, because a deck's
fraction is only the same thing until a loop can run backwards, at half
speed, or a slice at a time. ⚠️ MIRRORED UNDER `back`: sample `i` of the
reversed buffer is sample `n - 1 - i` of what the picture shows.

🔴 PINGPONG IS A TRIANGLE AND IT WAS A RAMP THAT STUCK. The voice reads one
buffer of `2 x unit`, so divided by `unit` and clamped the line crossed the
picture over the first half and then sat at the right edge for the whole
return, which is the half a reader is listening for.

<a id="create-looper"></a>

## looper.mjs, createLooper

The looper itself.

 seconds   how long the ring holds, which is the longest loop this page can
           promise. A button promising more than the page can deliver is a
           control that lies at the moment it is used.
 log       `(text, kind)`, the page's own logger.
 onWay     `(wayName, lapSeconds)` after a way change that moved the sound,
           for a page with something to retune to the lap.

🔴 IT IS BUILT WITHOUT AN `AudioContext` AND GIVEN ONE LATER, WHICH IS NOT
FUSSINESS. Every page here builds its graph on the first press, because an
`AudioContext` made at load is a suspended context on a real browser, and the
transport bar is built long before that: the bar needs `wayExtra()` at
construction and the ring needs a sample rate. Splitting the two is what lets
one object own both ends. Before `attach()` every audio verb is a no-op, which
is right: there is no sound yet to loop.

<a id="start-voice"></a>

## looper.mjs, startVoice

Start, or restart, the one voice that plays the kept seconds.

⚠️ A DIP, NOT A CUT. A buffer source cannot change its buffer or its loop
points cleanly while it runs, so a way change is a new voice, and swapping
one mid-sample is a click every time somebody presses a button. The first
voice of a loop needs none of that: `loopOut` is still at zero and the
caller ramps it up straight afterwards.

<a id="pingpong-buffer"></a>

## looper.mjs, startVoice, pingpong buffer

🔴 PINGPONG IS ONE BUFFER, NOT TWO VOICES TAKING TURNS. Alternating two
sources on a timer puts a gap or an overlap at every turn, and at these
lap lengths that is a click twice a lap. Forwards followed by the same
samples backwards is a single buffer whose end already matches its start,
so `loop: true` joins it to itself with nothing to hear, and the join in
the middle is seamless by construction: the last sample forwards IS the
first sample backwards.

<a id="voice-stop-scheduled"></a>

## looper.mjs, startVoice, scheduled stop

⚠️ THE OLD ONE STOPS AT THE INSTANT THE NEW ONE STARTS, SCHEDULED RATHER
THAN TIMED. A `setTimeout` stop leaves both voices in `loopOut` for as
long as the timer is late, which is two copies of the loop at different
phases: the thing that sounds like a broken instrument.

<a id="attach"></a>

## looper.mjs, attach

Give it the graph.

 tap   the node whose output is kept. Upstream of any fader, so a loop is
       the material rather than a recording of where a blend happened to
       be standing.
 out   where the kept seconds are played back into. Downstream of it
       everything gets the loop for free: a granulator chews it, an
       analyser measures it, a meter reads what actually left.

<a id="tap-node"></a>

## looper.mjs, attach, script processor tap

⚠️ A SCRIPT PROCESSOR AS A TAP, deliberately rather than lazily. It is
deprecated and it runs on the main thread, which is the objection; what
it does here is copy two blocks into a typed array and return, and a
worklet would be a second file and a module load for that. It is wired
to a SILENT sink so it is pulled without reaching the speakers: a node
that is not connected to the destination is not scheduled at all, which
is the trap that makes a tap look like it is working and record nothing.

<a id="voice"></a>

## looper.mjs, api.voice

🔴 THE NODE THE SOUND ACTUALLY COMES OUT OF, published for a check.
Which buffer it holds, how long its lap is and what rate it runs at are
three facts about the audio graph rather than three variables a page set,
and a check that reads the second kind passes over a row wired to nothing
at all.

<a id="close-empty"></a>

## looper.mjs, close, an empty window

A window that caught nothing is not a loop. It happens when nothing was
actually playing at the press, and saying so is better than looping
silence and letting somebody wonder.
🔴 SILENTLY, ON INSTRUCTION 2026-09-16: *"rm all loop messages."*. It
said `nothing was playing, so there is nothing to loop`, which is true
and is a sentence about a loop. The caller gets 0 and the button goes
back to `off`, which is the same fact in the two channels that already
carry it.

<a id="close-material"></a>

## looper.mjs, close, the material

⚠️ THE SECONDS ARE KEPT AND THE VOICE THAT PLAYS THEM IS A SEPARATE
THING. This is the material; the way decides which part of it a voice
reads, and a way change rebuilds the voice without touching it.

<a id="close-opens-way"></a>

## looper.mjs, close, opens the shown way

🔴 IT OPENS THE WAY THE BUTTON IS SHOWING, rather than resetting to
`round`. The button is on the bar with no loop running, so a direction
can be chosen BEFORE pressing LOOP, and a control reading ← over a
sound running forwards is the page lying about itself. The normalising
happens in `stop()`, where the button is the only thing left to be true
to.

<a id="stop-direction"></a>

## looper.mjs, stop, the direction survives

⚠️ THE DIRECTION SURVIVES THE LOOP AND ONLY A WAY WITH NO FACE IS PUT
BACK. Somebody who chose ← meant ←, and taking it away the moment a loop
ends makes the choice something that has to be re-made every time.
`half` and `chop` have no face on the bar, so leaving the button showing
→ over a loop that would come back chopped is the one case where keeping
it would be the lie.

<a id="cycle"></a>

## looper.mjs, cycle

One press of the button glued to LOOP: → then ← then ⇆ then → again.
⚠️ A WAY THAT IS NOT IN `LOOP_TURN` LANDS ON THE FIRST: pressing after
`half` or `chop` is a reader asking for a direction, and the honest
answer is the first direction rather than an index arithmetic accident.

<a id="way-extra"></a>

## looper.mjs, wayExtra

The entry for `createTransportBar`'s `loopExtras`, so a page declares the
button by handing over this and nothing else.

⚠️ `always: true` KEEPS IT ON THE BAR WITH NO LOOP RUNNING, and it is not
an inert control: it changes what the NEXT press of LOOP does.

<a id="say-too-long"></a>

## looper.mjs, sayTooLong

🔴 A LOOP LONGER THAN THE RING CANNOT BE TURNED ROUND, AND THE BUTTON HAS
TO SAY SO RATHER THAN SIT THERE. A page that marks its loop on a file can
mark one of any length; this holds `seconds` of it. Greying the button
with the reason on it is what `caps.mjs` does for a demo this browser
cannot run, and for the same reason: a control that looks live and does
nothing is worse than one that says why it cannot.

<a id="test-header"></a>

## looper-test.mjs, file header

demo/shell/looper-test.mjs — the looper's arithmetic, with no audio at all.

  node demo/shell/looper-test.mjs

`ringOrder`, `planVoice` and `headOf` are pure, and every bug this looper has
ever had lived in one of them: a ring copied from index 0 after it wrapped
(an edit nobody made, in the middle of the loop), a voice that always began
at the top (pressing ← jumped the sound to the far end of the picture), a
pingpong head that was a ramp and sat at the right edge for the whole return
half. None of those needs a browser to catch, and the page that carried them
is one no harness may open.

SIX OF THESE ARE NEGATIVE CONTROLS: they are written so that the bug they
describe would fail them, rather than so that today's code passes.
