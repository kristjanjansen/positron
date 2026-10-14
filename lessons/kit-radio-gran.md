# Kit lessons: radio-gran.mjs

The long comments cut from `demo/shell/radio-gran.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-radio-gran.md#<anchor>`.

<a id="header"></a>

## radio-gran.mjs, file header

demo/shell/radio-gran.mjs — the radio-into-Pappus machine, with no page on it.

🔴 WHY THIS EXISTS, AND IT IS THE SECOND COPY BECOMING A COMPONENT.
`/archive/radio/` is a station list, an audio graph, a wasm SuperCollider, twelve
finished sounds, a modulator spec and a grain clock that locks to a loop, all
inside one 4,985-line page. `/videoradio/` is the same machine with the
instrument panel taken off and a shader in its place. Building a second copy
of any of that inside a new page is the failure `/kit/` exists to catch, and
`research/vr-sound-visual-2026-09.md §6` already left the feature extractor
open in exactly these terms: *"add `demo/shell/features.mjs` as a kit
component, or lift what `radio` already has? Both are defensible;
building a third copy inside a new page is not."*

⚠️ 🔴 `/archive/radio/` HAS NOT BEEN MOVED ONTO THIS YET, AND UNTIL IT IS THERE
ARE TWO IMPLEMENTATIONS. This header is the reason to finish the job rather
than a record that it was done. `field.mjs` carries the same warning about
`wire` and it is the same situation: the table below and the one at
`demo/archive/radio/index.html:2820` are the same twelve sounds typed twice, and
a drift between them is SILENT because both pages go on working. What to do,
in order: delete `PATCHES`, `SCAN_RANGE`, `patternOf`, `liveSteps`,
`predictedRate`, `STATIONS`, `srcOf`, `nominalKbps`, the modulator `specs`
and `followers` blocks, `writePatch`, the band arithmetic inside `meterTick`
and the arithmetic half of `lockGrainsToLoop` from that page, and import them
from here. Nothing in this file touches the DOM, so nothing in that page's
layout has to move.

⚠️ WHAT IS DELIBERATELY NOT HERE: the audio graph, the loop's ring, the
transport, the fader, the pickers, the scope and every assert. Those are a
PAGE's, and the two pages want different ones. What is here is what is true
of the ENGINE and of the RELAY whoever is asking.

🔴 AND ONE THING HERE IS NEW RATHER THAN LIFTED, WHICH IS WHY IT IS A MODULE
AND NOT A FILE OF CONSTANTS. `writePatch` on `/archive/radio/` writes a whole
patch in one shot, which is right for pressing a button and useless for a
page that has to travel from one sound to another over eight seconds. The
split into `writeDiscrete` and `writeContinuous` is what makes a morph
expressible, and the line between them is an argument about the engine:
`Select.kr` indices, gate figures and chords cannot be interpolated, and
pretending otherwise plays a chord nobody wrote.

🔴 AND SO IS THE TOUR CLOCK AT THE BOTTOM, ADDED 2026-09-16 WHEN `/archive/radio/`
WAS ASKED FOR THE SAME MOVEMENT. `/videoradio/` still carries its own inline
copy of that arithmetic and should be moved onto this one; the numbers are
the same numbers and two of them are already in two files. That is the same
warning as the one above about the twelve sounds, and it is here rather than
in a commit message because nothing type-checks a duplicate.

🔴 AND NOBODY IMPORTS THAT CLOCK TODAY, WHICH IS A FACT TO KNOW BEFORE
DELETING IT. `/archive/radio/`'s tour was removed on instruction the same day it was
built (*"rm 'automate' button from radio demo (and functionaitu)"*, see
`archive/radio-automate/`), and it was the only caller of `tourAt`, `breathe`,
`SLOT_MS`, `DWELL_MS` and `MORPH_MS`, and of `morphOf`, `basesOf` and
`writeContinuous` besides. They are kept rather than deleted because the
paragraph above is still the job: `/videoradio/` has that arithmetic inline
and moving it onto these needs them to exist. ⚠️ SO THE COVERAGE IS WORSE
THAN IT LOOKS. Everything named here is exported, unreferenced and ungraded
by any page or harness; a change to one of them breaks nothing today and
breaks `/videoradio/` the day it moves across.

<a id="buf-seconds"></a>

## radio-gran.mjs, BUF_SECONDS

The seconds Pappus holds. `mbuflen`, and every page that draws a grain
position has to rescale by `RING_SECONDS / BUF_SECONDS` (see `pappus.mjs`).

⚠️ IT IS EIGHT AND NOT SIXTY, and the argument is written out at
`demo/archive/radio/index.html:2654`: the ring has to be FILLED before the
granulator sounds like itself, and at sixty that wait is a minute, which puts
every assert outside the harness's budget and a visitor in front of silence.

<a id="stations"></a>

## radio-gran.mjs, STATIONS

── the relay, and which stations are on it ────────────────────────────────

🔴 THE THIRD COLUMN IS THE STATION'S NOMINAL BITRATE AND IT IS NOT A SHARED
CONSTANT. `NOMINAL_KBPS = 128` was true of every mount here until IDA Radio
arrived at 320, and a check that compares a measured rate against one shared
number fails on every run for a station that is behaving perfectly.

⚠️ TWO OF THESE ARE AAC, NOT MP3. `mp3-stream.mjs` picks its frame scanner off
the response's `content-type`, so no page has to know which is which, and no
URL here claims a container.
🔴 IDA IS BACK, 2026-09-16, ON INSTRUCTION: *"bring ida's back to radio (if
single listener)"* and *"bring ida to videoradio too"*. The condition in the
first message is the whole argument. It was removed because their operator
counted roughly 100 concurrent clients against their limit and traced them
here; the relay now holds ONE upstream connection per mount and fans it out,
so the number they count is one however many people are listening.
`workers/shout/worker.mjs` carries the measurement and the caveat that the
operator has not been re-asked.

🔴 AND THEY ARE LAST IN THIS ARRAY, WHICH IS NOT A PREFERENCE. What made the
original mistake expensive was not carrying these mounts, it was one line
that moved them to the FRONT: every page opens the first entry it finds, so
reordering an array pointed every visitor and every harness run at their
server at once. At 320 kbit/s they are 2.5x the weight of anything else here.
Do not move them up.

<a id="stations-radio1965"></a>

## radio-gran.mjs, STATIONS, Radio 1965 removed

Radio 1965 removed 2026-09-15 at the uuu.ee operator's request.

<a id="stations-ida"></a>

## radio-gran.mjs, STATIONS, IDA back last

Back, last, 2026-09-16. See the note in `workers/shout/worker.mjs`: the
relay holds one upstream per mount now, so this is one listener at their
server however many people are on this site.

<a id="ask-health"></a>

## radio-gran.mjs, askHealth

Which mounts are up, asked of the relay rather than of the mounts.

🔴 ONE REQUEST THAT ALWAYS ANSWERS 200, AND THAT IS THE ENTIRE POINT. Fetching
a dead mount directly answers 502, **and the browser logs that to the console
with no way to suppress it**, so a page that probes mounts trips its own
console check and shows a visitor a red line about somebody else's server.
`/health` moves the question to the thing that knows and reports "down" as
data.

🔴 AND IT ASKS ABOUT NAMED STATIONS, NEVER ALL OF THEM BY DEFAULT. `/health`
opens one upstream connection per station it is asked about, so an unnarrowed
probe makes every page load cost the broadcaster six. That is how three ERR
mounts came to answer this relay 502 in 9 ms while serving a laptop normally.

⚠️ A STATION MISSING FROM THE ANSWER IS `undefined`, NEVER `false`. "We did
not get an answer about it" and "it is down" have opposite consequences, and
`caps.mjs` already states the rule: an unknown never blocks.

@returns {Promise<Map<string, boolean|undefined>>}

<a id="patches"></a>

## radio-gran.mjs, PATCHES, the twelve sounds

── the twelve sounds ──────────────────────────────────────────────────────

🔴 EIGHT SOUNDS THAT DIFFER IN KIND, NOT TWELVE SETS OF NUMBERS, and the
distinction is what the previous two sets got wrong. REPORTED three times as
*"radio granulator patches heard almost same"*, after a round of widening the
ranges and a round of adding movement, neither of which could have helped:
seven of the old seven used `scanmode 1`, five of them sat between -0.10x and
+0.25x read speed, and six had the sixteen-step gate switched off. Seven
variations on one architecture. So this set is laid out along the axes the
engine actually has, one patch pushed to each end:

  mode        DELAY, POSITION and STRETCH, all three
  read speed  -1.00 · +0.08 · +0.25 · +0.50 · +1.00 · +2.00 · frozen
  overlap     2 (four-second grains) up to 26 (a cloud)
  rhythm      three patches on a real gate figure
  space       one bone dry, one drowned
  blend       `burnt` at `sos 0.45`, which is the radio with the granulator as
              an effect rather than the other way round

⚠️ `sos` BELOW 0.6 IS NOT A FLAVOUR, IT IS THE GRANULATOR TURNED OFF.
`sxf = (msos.max(mlock)/0.6).clip(0,1)` crossfades grains against the LIVE
INPUT, so 0.6 is the first value that is all grains. `burnt`'s 0.45 is the one
deliberate exception and it is a different thing to hear, not a quieter one.

⚠️ `mod` IS PART OF THE SOUND. A patch is a PLACE and a MOTION: two patches
with the same numbers and different routes are two different instruments,
which is the whole answer to "they all sound the same". See `pappus-mod.mjs`
for why none of this is in the SynthDef.

<a id="patches-lock"></a>

## radio-gran.mjs, PATCHES, one note held

⚠️ `lock 1` HOLDS WHATEVER THE RING CONTAINS AT THE INSTANT IT LANDS,
including the dead air between two programmes. A page that freezes has to
read its own meter afterwards and say which it caught, or a caught silence
is indistinguishable from a broken engine.

<a id="patches-sixteenth"></a>

## radio-gran.mjs, PATCHES, the sixteenth

🔴 A ROUTING ONTO `rate` IS THE ONE THING THAT UNPICKS A RHYTHM. The grain
clock is the only timing this instrument has, so the patches whose point is
a figure have NO route onto `rate`: this one moves `size` instead, which
changes how long a grain is and not when it happens.

<a id="scan-range"></a>

## radio-gran.mjs, SCAN_RANGE

🔴 THE READ HEAD IS THREE DIFFERENT QUANTITIES AND ONE CONTROL.
`Engine_Pappus.sc:719` selects between a SPEED (mode 1), a PLACE (mode 2) and
a LAG (modes 3 and 4), so a page that shows one lane for all three is telling
the truth about one patch in three. In STRETCH the lane IS the speed, in the
engine's own terms: `speed = winspan x (3*mscan - 1)`.

⚠️ AND IT IS WHY A MORPH MAY NOT INTERPOLATE `scan` ACROSS A MODE CHANGE. See
`morphOf` below: halfway between a speed and a lag is neither.

<a id="pattern-of"></a>

## radio-gran.mjs, patternOf

The sixteen steps this patch wants in the gate buffer.

🔴 IT IS NOT A CONVENIENCE. An eight-element `pattern` produces an OSC message
that SAYS sixteen values and carries eight, which scsynth discards without a
word: the patch then plays on whatever the buffer already held and the page
goes on reporting the figure it asked for.

⚠️ IT REPEATS RATHER THAN ZERO-FILLING, because with `elen 16` a repeat plays
an eight-step figure twice, which is what writing eight steps means, and a
zero-fill would silently give half a bar of silence.

<a id="mod-specs"></a>

## radio-gran.mjs, MOD_SPECS

── the modulator's lanes ──────────────────────────────────────────────────

🔴 EVERY ONE OF THESE IS THE ENGINE'S OWN RANGE, AND THEY DECIDE WHAT A
ROUTING MEANS. A modulation is applied in the control's WARPED space, so an
LFO on grain length multiplies and divides rather than adding and
subtracting: get one of these wrong and a musical amount becomes a slam.

<a id="mod-specs-sos"></a>

## radio-gran.mjs, MOD_SPECS, sos floor

🔴 THE FLOOR IS 0.62, NOT 0. `sxf = (msos.max(mlock)/0.6).clip(0,1)`
crossfades the grains against the LIVE INPUT, so a lane reaching zero would
make a slow sine switch the instrument off twice a minute.

<a id="mod-specs-global"></a>

## radio-gran.mjs, MOD_SPECS, global controls

⚠️ THESE THREE ARE GLOBAL CONTROLS with no `m` prefix, which `MOD_CMD`
below knows and a spec table that only listed lane ends did not.

<a id="mod-dests"></a>

## radio-gran.mjs, MOD_DESTS

🔴 THE DESTINATION ORDER IS FROZEN, THE WAY `pattern.mjs`'s `ROW` IS FROZEN.
A page that packs these into a data texture and a shader compiled against a
different order do not fail; they draw a plausible wrong picture. Anything
reading this as a layout must also read `LAYOUT_VERSION` and refuse a
mismatch.

<a id="mod-followers"></a>

## radio-gran.mjs, MOD_FOLLOWERS

🔴 SIX FOLLOWERS OFF ONE ANALYSER READ, AND THE POINT IS THAT THEY ARE ALL THE
STATION. Loudness alone is one gesture: everything it drives moves together.
Split the same audio into bands and the sources stop agreeing. On speech `mid`
moves while `low` sits still, `high` follows sibilance, `tone` says where the
energy is rather than how much of it there is, and `flux` is near zero on a
sustained chord and high on an announcer.

⚠️ SENSITIVITY IS PER SOURCE AND HAS TO BE. `tone` is already 0..1, so
upstream's sens 6 pins it at the ceiling where it stops following anything.

<a id="mod-cmd"></a>

## radio-gran.mjs, MOD_CMD

Where a modulated control is actually written.

⚠️ NOT EVERY CONTROL WEARS THE `m`. `kwow`, `drive`, `crush`, `noise` and the
eight-element arrays are global, one stage for both granulators, so the prefix
would name a control this definition does not have. scsynth discards an
unknown control IN SILENCE, which is a routing that runs, reports, and never
reaches a sample.

<a id="routes-of"></a>

## radio-gran.mjs, routesOf

This patch's routes, with the ones a delay mode cannot carry removed.

⚠️ `winstart`/`winend` ARE REFUSED IN A DELAY MODE. `delaypos` is a position in
the WHOLE lap while `BufWr` writes at the un-windowed phase, so a narrowed
window puts the read head nowhere near the write head and "four seconds
behind" quietly becomes something else, with nothing on screen saying so.

<a id="write-split"></a>

## radio-gran.mjs, writing a patch, in two halves

── writing a patch, in two halves ─────────────────────────────────────────

🔴 THE SPLIT IS THE ARGUMENT, AND THE LINE BETWEEN THEM IS THE ENGINE'S.
`/archive/radio/` writes a whole patch on a button press and that is right there.
A page that TRAVELS from one sound to another needs to know which fields can
be a value in between and which cannot, and the answer is not a matter of
taste:

  · `scanmode`, `spraymode`, `swarmmode`, `crushmode` and `noisetype` are
    `Select.kr` and `Select.ar` INDICES. 2.5 is not a mode.
  · `contour` is a `Select.kr` over seventeen envelope windows, read per
    grain, and a fractional index is a value that cannot be read back the way
    it was sent.
  · `gates`, `pitches` and `tappitch` are a CHORD in semitones. Half of
    `[0, 3, 7]` and `[-12, -7, 0]` is a chord nobody wrote.
  · `elen`, `ephase` and `pattern` are a gate FIGURE, read at audio rate by a
    `Stepper` on the grain trigger. A figure has no halfway.
  · `lock` is a freeze. It is on or it is off.

Everything else is a continuous control behind a 20 ms `Lag.kr`, which is
exactly what stepping at 25 Hz is built to receive.

<a id="write-discrete"></a>

## radio-gran.mjs, writeDiscrete

The half that cannot be interpolated, plus every constant this rung needs.

🔴 IT WRITES EVERY FIELD, EVERY TIME. Each message is fire-and-forget, so a
write that only sets what changed inherits whatever the last one left behind,
silently. This repo has paid for that three times (`msrc 1`, `src`/`lock`,
`notes.gate`).

⚠️ THE SECOND GRANULATOR IS WRITTEN AND DOES NOT EXIST ON THIS RUNG
(`graw2 = DC.ar([0,0])` on LITE, and TINY implies LITE). It is two messages
and it keeps one function for a board that may be on a different rung.

<a id="write-discrete-pattern"></a>

## radio-gran.mjs, writeDiscrete, gate pattern

🔴 THE SIXTEEN-STEP PATTERN IS A BUFFER, NOT A CONTROL, and one that does
not want a rhythm has to write the ones BACK or it inherits the last
patch's figure silently.

<a id="geometric"></a>

## radio-gran.mjs, GEOMETRIC

🔴 THESE ONES TRAVEL AS A RATIO, THE REST AS A DIFFERENCE. `pappus-mod.mjs`
makes the argument for modulation and it is the same argument for a morph: a
grain length halfway between 50 ms and 4 s is 450 ms if you go geometrically
and 2.02 s if you go linearly, and only the first spends any time in the part
of the lane where a granulator stops being a delay and becomes a texture.
Delay times, cycle lengths and filter frequencies are pitches or rhythms and
behave the same way.

⚠️ A ZERO ENDPOINT FALLS BACK TO LINEAR, because a ratio to zero has no
meaning and `slowed` really does hold every tap time at 0.

<a id="morph-of"></a>

## radio-gran.mjs, morphOf

One sound on the way to another.

`k` is 0 at `a` and 1 at `b`. What comes back is a whole set of continuous
values plus the discrete patch that should be LOADED at this instant, so a
caller never has to decide which side of the crossover it is on twice.

🔴 `scan` IS INTERPOLATED ONLY WHEN BOTH ENDS AGREE ABOUT WHAT IT MEANS. In
STRETCH it is a speed, in POSITION a place, in DELAY a lag: halfway between
a speed and a lag is neither, and writing it would move the read head
somewhere neither patch asks for while the page reports a morph going
smoothly. When the modes differ it steps with the mode.

<a id="write-continuous"></a>

## radio-gran.mjs, writeContinuous

The half that can be a value in between, written to the engine.

⚠️ `skip` IS NOT AN OPTIMISATION, IT IS WHAT STOPS TWO WRITERS FIGHTING. A
modulated destination is written 25 times a second by `createModulator` from
`base + modulation`; a morph writing the same control at the same rate makes
the two alternate, which is a 25 Hz square wave on a control that is supposed
to be gliding. A morph moves the BASE of a routed destination and writes
everything else itself.

🔴 IN A DELAY MODE THE WINDOW MUST BE THE WHOLE LAP, AND IT IS ENFORCED HERE
RATHER THAN TRUSTED TO A TABLE. Only STRETCH and POSITION may carry a window.

<a id="write-continuous-window"></a>

## radio-gran.mjs, writeContinuous, delay window

⚠️ A DELAY MODE IS FORCED TO THE WHOLE LAP AND NOT SKIPPABLE. `routesOf`
has already refused a routing onto these there, so `skip` cannot hold them
and there is nothing to fight with.

<a id="write-continuous-scan"></a>

## radio-gran.mjs, writeContinuous, read head last

⚠️ THE READ HEAD IS WRITTEN LAST OF THE GRANULATOR'S SETTINGS, because which
command it is depends on the mode, and the mode has to be the one in force.

<a id="lock-rate"></a>

## radio-gran.mjs, lockRate

🔴 THE WHOLE TEMPO QUESTION, ANSWERED IN ARITHMETIC.

A loop is an `AudioBuffer` of an exact number of samples played with
`loop = true`, so its period is exactly that many samples: MEASURED by looping
384000 samples of noise and finding the lag at which the recording repeats,
384000 at speed 1 and 768000 at 0.5, BIT IDENTICAL, residual exactly 0. The
grain clock is `Phasor.ar(t_sync, mrate x SampleDur)` in the same context, so
its period is exactly `SampleRate / mrate` samples: MEASURED from the engine's
own output over 24 grains, **24000.0 +/- 0.2 samples against 24000 asked
for**, twice. Two exact periods can be made to divide each other, and then
they never drift.

A figure of `elen` steps at `rate` grains a second has a bar of `elen / rate`
seconds, and this is the nearest rate that fits a WHOLE NUMBER of those bars
into the loop. The nudge is at most half a bar's worth.

⚠️ IT LOCKS TO THE LOOP'S LENGTH AT SPEED 1. Every loop speed offered here is
a power of two, so a loop that is `k` bars long at speed 1 is `k x 2^m` bars
long at any of them: still whole, still locked, nothing to recompute.

⚠️ FEWER THAN TWO BARS IN THE LOOP IS REFUSED RATHER THAN FUDGED. Halving a
grain rate to make one bar fit would be a page changing the sound to satisfy
its own arithmetic, and the refusal has to be said in words.

@returns {{rate: number|null, laps: number, bars: number, why: string}}

<a id="lock-rate-subdivide"></a>

## radio-gran.mjs, lockRate, subdivide

🔴 THE OTHER WAY THE TWO PERIODS CAN DIVIDE EACH OTHER, AND WITHOUT IT
SHORT LOOPS NEVER LOCK AT ALL. A figure longer than half the loop cannot
fit into it twice, and the refusal above is right about that. It is not
the only lock available: if the LOOP fits a whole number of times into
the BAR, the two periods still divide each other exactly and the figure
simply takes `m` laps to finish. MEASURED on `/videoradio/` before this
existed: with laps of two and three seconds most of the twelve sounds
refused every time, which reads in the log as the page failing rather
than as arithmetic declining. Off by default, because a page that plays
one long loop has no such problem and should hear the refusal.

<a id="create-features"></a>

## radio-gran.mjs, createFeatures

🔴 LIFTED, NOT REWRITTEN, AND THE TWO GUARDS ARE WHY.
`plans/plan-audio-shader.md §8 step 2` says it in as many words: `meterTick` is
already written, already tuned, and already carries the two things a second
author would miss. An empty FFT bin reports `-Infinity`, and one NaN in the
sum poisons every follower at once; and the flux is POSITIVE ONLY, because a
decay is not an event.

⚠️ THE ANALYSER MUST HAVE `smoothingTimeConstant = 0`. `getFloatFrequencyData`
applies it PER CALL, so a flux follower on a smoothed analyser measures the
blend rather than the programme, and the same page reads differently at 60,
72, 90 and 120 Hz.

⚠️ THE BUFFERS ARE HOISTED. Three typed arrays a frame at 60 Hz is 1.4 MB a
second of garbage for numbers that are overwritten immediately.

<a id="win-pos"></a>

## radio-gran.mjs, winPos

A reported grain position, moved onto the axis a page draws.

Pappus records into a sixty-second ring and reads grains out of a window
`mbuflen` seconds long, and `/pgrain`'s `pos` is a fraction of the RING. A
page drawing on a picture of the live window has to rescale, or every mark
lands in the left 13% of it. `RING_SECONDS` is exported by `pappus.mjs` for
the same reason this is exported here: a number typed twice can disagree with
the buffer it describes.

<a id="tour"></a>

## radio-gran.mjs, the tour

── the tour: a page working its own instrument ────────────────────────────

🔴 EVERY PHASE IS A FUNCTION OF THE CLOCK AND NOTHING IS AN ACCUMULATOR.
`pappus-mod.mjs` makes the argument and it applies to anything left running
for hours: a late tick, a dropped tick or a backgrounded tab costs
RESOLUTION and never POSITION, because the next tick still reads the tour
exactly where it should be. A counter incremented per tick comes back from a
minimised window playing a sound it should have left twenty minutes ago.

⚠️ THE ARITHMETIC IS PURE AND TAKES NO ENGINE, so a page can grade it with
nothing running. `tourAt` is total: every real `elapsedMs` and every `n >= 1`
answers, including a negative elapsed, which is what a page that seeds the
clock BACKWARDS to open on the sound already loaded hands it.

<a id="breathe"></a>

## radio-gran.mjs, breathe

🔴 THE BLEND IS A FUNCTION OF WHERE THE TOUR IS, NOT A FREE-RUNNING SHAPE,
and the difference is legible rather than cosmetic. It opens from the station
toward the granulator over the first half of a sound and comes back over the
second, so the handover between two sounds always happens while the station
is still audible. A sine on a clock of its own eventually puts the deepest
part of the granulator exactly on a crossover, which is the one moment the
instrument has least to say.

⚠️ NEITHER END IS 0 OR 1. At 0 the granulator is inaudible and any picture of
it is drawing something nobody is hearing; at 1 the station is gone and what
is left is an instrument with no material.
