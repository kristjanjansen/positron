# Grain presets for `/radio/`, and whether it can keep time

Session 27, 2026-09-15. Everything below was measured on the page itself unless
it says otherwise. The page is at
**<https://positron.studio/radio/>** when it is deployed; locally, with the
dev server up, **<http://127.0.0.1:8890/radio/>**.

⚠️ The real relay answered `502` in under 20 ms for the whole of this work
(`workers/shout` is being changed by somebody else), so every measurement here
was taken against a stand-in relay on `127.0.0.1:8899` serving a 1 kHz tone as a
128 kbps MP3 with ICY metadata interleaved. A steady tone is better material for
an onset measurement than a radio programme: every grain comes out at the same
amplitude, so a missed onset is a missed onset and not a quiet bar.

---

## 1. The tempo question, answered

> *"rhythm ones perhaps not good without tempo syncing (can you do it btw?)"*

**Yes, and it is now done. The two clocks that matter are both exact, so they can
be made to divide each other, and after that they cannot drift.** What cannot be
chosen from this page is the PHASE of a sixteen step figure, and that limit is
described in §1.5.

### 1.1 The loop's period is an exact number of samples

`onLoop('set')` copies `loopRing.filled` samples into an `AudioBuffer` created at
`ctx.sampleRate` and plays it with `loop = true`. The claim that a grain grid can
divide that rests entirely on the loop repeating at exactly that many samples, so
it was tested rather than assumed: a buffer of 384000 samples of random noise,
looped, recorded, and compared with itself at lags around the expected one.

| speed | expected lap | measured lap | residual |
|---|---|---|---|
| 1.0 | 384000 samples | **384000** | **0** (bit identical) |
| 0.5 | 768000 samples | **768000** | **0** (bit identical) |

Both speeds are exact and the residual is not "small", it is zero: the same
samples come back. Every rate the transport bar offers is a power of two
(`[0.0625, 0.125, 0.25, 0.5, 1]`, read off `caps.rates` in the suite output), so
a loop that is *k* bars long at speed 1 is *k*·2^m bars long at any of them. A
lock made at speed 1 survives every speed button with nothing to recompute.

A loop left to fill is exactly `BUF_SECONDS` long, 384000 samples at 48 kHz,
because the bar closes the window on a timer at 8000 ms and the ring caps at its
own length. A loop closed early by a second press is a whole number of
ScriptProcessor blocks (4096 samples), which is exact but arbitrary.

### 1.2 The grain clock is exact, and it is audio rate

`Engine_Pappus.sc:689`:

```
gph  = Phasor.ar(K2A.ar(t_sync), Lag.kr(mrate, lagt).max(0.05) * SampleDur.ir, 0, 1);
trig = ((gph - Delay1.ar(gph)) < 0) + Impulse.ar(0);
```

So the grain trigger is a phasor running at `mrate / SampleRate` per sample, in
the same `AudioContext` as the loop. Measured from the engine's own output, with
the page parked on `slowed` (the one patch with no modulation routes) and the
granulator reconfigured to one voice, 30 ms grains, `mrate 2`, no spray and no
chain, recorded off `eng.meter` and onsets fitted by least squares:

| run | onsets | expected period | measured period | worst residual |
|---|---|---|---|---|
| 1 | 24 of 24 | 24000 samples | **24000.04 ± 0.22** | 0.35 ms |
| 2 | 24 of 24 | 24000 samples | **24001.11 ± 0.68** | 2.03 ms |

Both are consistent with exactly 24000. Taking the looser of the two as a bound,
the grain clock departs from `SampleRate / mrate` by under 1.5 samples per
half second, which is **under 0.25 ms per eight second lap**. Nothing musical
happens down there.

⚠️ The recording anchor was calibrated rather than trusted. A ScriptProcessor
hands over a block captured earlier and `ctx.currentTime` read inside the
callback is when the main thread got round to it, so the sample index of a
context time carries an unknown constant. A gain step scheduled at an exact
context time does not, so six such bursts were placed with the granulator paused
and found in the same recording: **offset 0.00 ms, spread 0.00 ms, 6 of 6**. The
anchor is exact, which is what makes §1.4's latency number a real number rather
than this probe's own buffering.

### 1.3 Therefore: two exact periods can divide each other

A figure of `elen` steps at `mrate` grains a second has a bar of `elen / mrate`
seconds, because `estep = Stepper.ar(trig, …)` counts grain triggers and nothing
else. `lockGrainsToLoop(seconds)` nudges `mrate` to the nearest value that fits a
whole number of those bars into the loop, moves the slider with it, tells the
modulator its new base, and puts everything back when the loop stops.

The page asserts this twice. In the burst, where the suite collects it:

```
the grain clock tunes itself to a loop, and comes back off it
  2.5 s of loop took 9.2000/s, which is 23.00000 whole laps, 0.000 thousandths out, then back to 9
```

and at the end of the run, through the real LOOP button, on a window deliberately
closed early so its length is a number no patch could have been written for:

```
the grain clock is tuned to the loop, so the two cannot drift
  0.597 s of loop at 8.3705 grains a second is 5.00000 whole laps, 0.000 thousandths out
```

Both were broken on purpose once. Replacing `round(bars)` with `bars` in
`lockGrainsToLoop` takes them to `22.50000 whole laps, 500.000 thousandths out`
and `5.37600 whole laps, 376.000 thousandths out`, both red.

🔴 **A routing onto `rate` unpicks the lock**, because the grain clock is the only
timing this instrument has. `the sixteenth` had `env -> rate` and was therefore
the one patch built on a rhythm that spent its life walking its own tempo; it is
on `size` now. `ground`'s `env.low -> rate` moved to `env.low -> probs`, which is
the same musical claim ("bass thins it") by a road that does not touch the clock.
The washes (`dust`, `fast forward`) keep theirs, because a cloud has nothing to
be in time with.

### 1.4 The 25 Hz path cannot place a grain on a beat, and does not have to

`pappus-mod.mjs`'s header argues that 25 Hz is enough because `Lag.kr(…, 0.02)`
smooths every control over 20 ms. **That argument is about smoothing and it does
not transfer to rhythm.** Measured in the page, under its real load:

| what | median | spread |
|---|---|---|
| `setInterval(40)` hitting its nominal instant | (constant offset) | **2.0 to 2.6 ms** over 150 ticks |
| "send this at context time T" from a `setTimeout` | (constant offset) | **3.9 to 7.3 ms** over 12 tries |

Those are idle headless numbers and a real page under load is worse. But the
number that decides the design is not the jitter, it is the QUANTISATION: the
modulator samples its sources 25 times a second, so a step source at *H* Hz has
its step boundary resolved to **40 ms**, always, however steady the timer is.

What that does and does not cost:

- It **cannot make a grain late.** Grain times come from the audio rate phasor.
- It **can hand a grain the wrong step's voices.** `the sixteenth` had a 4 Hz step
  source on `probs` against a grid whose steps are 62.5 ms apart, so a boundary
  that slides by up to 40 ms mis-assigns roughly one grain in three. It is at
  1 Hz now, where a step is twenty five ticks long.

**The rule this buys: a rhythm is written in the engine's sixteen step gate
buffer, never as a fast step source in the modulator.** Every step route in the
table is now at or below 1 Hz.

Which side of the boundary is each number measured on? The jitter numbers are
JS side, and that is correct, because the claim is about the JS timer. Every
claim about the grains is measured either in the recorded audio (§1.2, §1.4) or
by reading the control back off scsynth with `/s_get` (§1.3, §2). Nothing here
counts messages the page posted.

### 1.5 `t_sync` exists, works, and is not shipped

The SynthDef carries a `t_sync` trigger control (confirmed in the bytes of
`demo/grains/defs/pappus-tiny.scsyndef`, and it is a `TrigControl`), and
`Phasor`'s reset input snaps the grain clock to zero. Measured by firing it
twelve times at randomly chosen phases of a 500 ms grain period and finding the
first onset afterwards in the recording:

| run | resets found | where the grain landed |
|---|---|---|
| 1 | 11 of 12 | 120.67 to 121.00 ms after the request (spread **0.33 ms**) |
| 2 | 12 of 12 | 120.67 to 123.67 ms (spread **3.0 ms**) |

Twenty three of twenty four landed inside a 3 ms window spanning 500 ms of
possible phase. If `t_sync` did nothing the offsets would be spread uniformly
across the whole period, so this is not a coincidence: the reset works, and the
path from a JS `send` to the grain is about **121 ms** with a few milliseconds of
jitter, reproduced across two independent browser sessions.

**It is deliberately not used.** `estep` is a `Stepper` on the grain trigger and a
`Stepper` is not reset by `t_sync`, so firing it re-phases the grain clock and
leaves the sixteen step figure wherever it had got to. Firing it when a loop
closes would therefore restart the pulse but not the figure, which is half a
feature. The frequency lock is the whole of the value and it needs no message at
all.

### 1.6 A fact worth keeping about the capture ring

`mbuflen` is 8 s and the default loop is 8 s, so the ring's write head laps
exactly with the loop. `sos` is both the grain/input blend AND the record gain
(`sosin = ((1 - sos) * 4).clip(0, 1)`, `:646`), so under a loop a patch with
`sos` above about 0.75 stacks the same phrase onto itself at a constant offset
instead of smearing it. That also explains a measurement that cost half an hour:
`sos 1` sets the record gain to ZERO, so a probe that set it read **0.00000 at
the engine's meter while grains were being reported at 10 a second**. Grains
firing is not sound coming out, again.

---

## 2. The presets

Twelve, all of them read back off scsynth and all twelve different. The suite
grades that claim rather than the author asserting it:

```
every sound in the list reaches the engine, and no two are the same
  12 sounds, 12 different settings of read head, figure, rate, length, roll and window
```

Each patch is applied through `applyPatch`, then `mscanmode`, `melen`, `mrate`,
`msize`, `mstrum` and `mwinstart` are asked of the server in one `/s_get` (which
takes a list and answers with one `/n_set` carrying every pair, so it is twelve
round trips rather than seventy two). Both halves must hold: every patch must
arrive as the table wrote it, AND no two may arrive the same. The first alone
would pass a table of twelve identical rows; the second alone would pass a table
nothing delivered. Broken on purpose by giving `strummed` the same six values as
`slowed`, it reports
`1 pair(s) identical on read head, figure, rate, length, roll and window: 1/1/28/0.1/0/0`
and goes red.

Those six are the ones that decide what KIND of sound it is rather than what
colour. Two patches agreeing on all six would be one patch with two names
whatever their reverb was set to, which is exactly what the old seven were
(LESSONS #59: a randomiser over nine overlapping ranges makes one sound with nine
names).

### 2.1 The list

`bar` is `elen / rate` seconds, and `laps` is how many of them fit an eight
second loop. **All twelve are whole numbers**, so every patch locks to a full
window with no retuning at all; the retuning exists for windows closed early.

| # | name | for | mode | rate | size | overlap | elen | bar | laps in 8 s | what it is |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | four seconds ago | **station** | DELAY 4.0 s | 9 | 0.28 | 2.5 | 1 | 0.111 s | 72 | the broadcast itself, late, in pieces long enough that words survive |
| 2 | dub | both | DELAY 2.0 s | 8 | 0.24 | 1.9 | 8 | 1.000 s | 8 | chopped on an eight step figure into echoes at 0.5, 1, 2 and 4 s |
| 3 | slowed | both | STRETCH +0.25x | 28 | 0.10 | 2.8 | 1 | 0.036 s | 224 | a quarter speed, pitch intact, every colour stage at zero |
| 4 | one note held | **station** | POSITION, frozen | 45 | 0.16 | 7.2 | 1 | 0.022 s | 360 | one instant, stacked into a minor eleventh and drowned |
| 5 | fast forward | both | STRETCH +2x | 34 | 0.05 | 1.7 | 1 | 0.029 s | 272 | the held seconds at double speed, dry |
| 6 | the sixteenth | **loop** | STRETCH +0.5x | 16 | 0.055 | 0.9 | 16 | 1.000 s | 8 | a sixteen step figure, four voices four steps apart |
| 7 | **strummed** | both | STRETCH +0.5x | 2 | 0.35 | 0.7 | 1 | 0.500 s | 16 | a chord rolled out one note at a time, twice a second |
| 8 | **two seconds of it** | **loop** | STRETCH, window 0.25 to 0.50 | 24 | 0.18 | 4.3 | 1 | 0.042 s | 192 | two seconds out of the eight, stretched over four |
| 9 | **cut up** | **loop** | DELAY 4.0 s | 1 | 1.0 | 1.0 | 4 | 4.000 s | 2 | a second at a time, one second in four left out |
| 10 | ground | both | STRETCH -1x | 0.5 | 4.0 | 2.0 | 1 | 2.000 s | 4 | half a grain a second, four seconds each, reversed, an octave down |
| 11 | dust | both | STRETCH +1x | 62 | 0.42 | 26.0 | 1 | 0.016 s | 496 | twenty six grains sounding at once, drifting as one body |
| 12 | burnt | **station** | STRETCH +0.08x | 7 | 0.70 | 4.9 | 1 | 0.143 s | 56 | `sos 0.45`, so you hear the source through overdrive and crushing |

Bold names are new. Bold "for" columns are the ones that are noticeably better on
one material than the other; "both" means it works either way and means the same
thing.

### 2.2 Which are for a loop and which are for the stream, and why

**For the station (a moving stream):**

- **four seconds ago.** A delay only means "a moment ago" when the material keeps
  changing. Against a repeating phrase a delay is a phase rotation of the same
  phrase, which is a different and weaker idea. Its echoes are deliberately left
  at 0.75/1.5/2.25/3.0 s, which divide nothing: it is the stream preset.
- **one note held.** Freezing is something you do to a moving thing. With `lock 1`
  the ring stops being written, so on a loop it freezes a phrase that was already
  going to come back.
- **burnt.** `sos 0.45` is the source with the granulator as an effect. Its point
  is that you recognise what is underneath, which is more interesting when what is
  underneath keeps changing.

**For a loop (a fixed phrase):**

- **the sixteenth.** Its bar is exactly one second, so eight fit an eight second
  loop and the same step lands on the same instant of the phrase every lap, for
  ever. Over the station the same figure is a pulse imposed on whatever happens to
  be arriving, which is a weaker thing to hear. This is the patch the tempo work
  was for.
- **two seconds of it.** `winstart`/`winend` fold every read into a slice of the
  held seconds, and `speed = winspan × (3·mscan − 1)`, so a quarter window with the
  read head at the top of its lane gives two seconds of material crossed in four:
  half speed, lapping twice per loop. Over a loop that is one phrase of the music
  arriving twice a lap in the same place each time. Over the station it is a two
  second memory read over and over, which is fine but has no shape to lock to.
  Both window ends carry the same triangle at the same phase, so the slice slides
  rigidly through the buffer over about eighty seconds.
- **cut up.** One one second grain per step of a four step figure with one step
  empty, so the material comes back a second at a time with a second missing. Four
  steps at one a second is a four second bar: two per loop, so the same second
  goes missing every lap. Over the station it is just a chopped smear.

**Good on both, and they mean the same thing on both:**

- **strummed**, **slowed**, **fast forward**, **dub**, **ground**, **dust**.
  `dub` is the interesting one of these: its figure and its four echoes are now
  all divisors of eight seconds, so on a loop the whole delay network is in step
  with the phrase, while on the stream it is an ordinary dub delay.

### 2.3 What changed, and why

**Added three.** Each one is built on a mechanism nothing else in the table used,
which is the only defence against twelve names for one sound:

- **strummed** uses `strum`, which is a SUBDIVISION OF THE GRAIN PERIOD:
  `strumsp = mstrum.clip(0, 0.125) × (1 / mrate)` and
  `vtrig = TDelay.ar(trig × …, strumsp × i)`, so voice *i* fires *i* eighths of a
  period after voice 0. At the ceiling with eight voices open, one trigger becomes
  eight notes spread over seven eighths of the period. It is the only rhythm here
  that comes from inside a single grain period, and it is exact because it is laid
  out by the same audio rate clock the grains are. The follower is on the roll
  itself: a bright passage tightens it toward a chord, a dull one opens it into an
  arpeggio.
- **two seconds of it** uses `winstart`/`winend`, which no patch had ever set.
- **cut up** is the only patch whose grains are as long as the steps they sit on,
  which makes it an arrangement of the material rather than a texture over it.
  DELAY mode there is about safety and not taste: a grain is an un-syncing read
  forward from wherever it started, so a one second grain taken near the write
  head is overtaken by it mid-note and splices.

**Deleted one.** `three, three, two` was an eight step gate figure at twelve
grains a second beside `the sixteenth`'s sixteen step figure at sixteen. A second
gate figure at a similar rate is a second helping of one kind, which is the exact
failure the set was rebuilt to escape. `strummed` took its slot.

**Retuned the timing of four.**

- `dub`: rate 7 to **8** (an eight step figure becomes a one second bar), echoes
  0.375/0.75/1.125/1.5 to **0.5/1/2/4** s. It used to divide nothing, so against a
  loop it wandered in and out of phase with itself for ever.
- `the sixteenth`: `env -> rate` became `env -> size`; the `probs` step source
  4 Hz to **1 Hz**; echoes 0.25/0.5/0.75/1.0 to **0.25/0.5/1/2** s.
- `ground`: rate 0.45 to **0.5**, which is what its own description already said
  ("half a grain a second") and now divides the loop four ways;
  `env.low -> rate` became `env.low -> probs`; echoes 3/5/7/8 to **2/4/6/8** s.
- `burnt`: echoes 0.5/1/1.5/2 to **0.5/1/2/4** s.

**Left six alone.** `four seconds ago`, `slowed`, `one note held`, `fast forward`,
`dust` and (apart from its echoes) `burnt` already sit at ends of the axes the
engine has and none of them needed a number moved. `slowed`'s description changed
from "the station" to "the sound" because it now applies to a loop as well; that
is the whole of the editorial rule in the table, that a `says` line naming the
station is a stream patch, one naming the loop is a loop patch, and one naming
"the sound" is both.

---

## 3. What is open

- 🔴 **Two of the page's asserts are never collected by the suite.** MEASURED: the
  page makes **32** and `node demo/verify.mjs radio` reads **30**. The end of
  run loop test sits about a second behind the burst and `verify.mjs` stops
  collecting 400 ms after the count last grew, so `the grain clock is tuned to the
  loop, so the two cannot drift` and `pressing LOOP keeps the station and plays it
  back, and it is audible` are both invisible to it. The second of those has never
  been collected, since before this work. The tempo claim is therefore ALSO graded
  inside the burst, by calling `lockGrainsToLoop` directly on a length of 2.5 s
  that divides none of the rates in the table. Closing the gap properly means
  either restructuring the end of `startGranulator` so the loop test runs before
  the first assert (where `settleMs` covers it) or giving the page a control 0,
  and neither was in scope here.
- **No preset has been heard.** Nothing in this repo can grade whether a sound is
  musical, and CLAUDE.md's rule about implementing somebody else's format applies
  with a vengeance to a judgement that is not a number. What is claimed is that
  every value is inside the engine's own ranges, that the engine holds what the
  table wrote, that no two are the same on the six controls that decide the kind,
  and that every figure divides the loop.
- **A loop shorter than half a patch's figure cannot be locked** and says so in the
  log rather than halving the grain rate to make one bar fit. That affects `cut up`
  (a four second bar) and `ground` (two seconds) on a hand closed window.
- **The station was down throughout.** Re-run `node demo/verify.mjs radio`
  against the real relay once `workers/shout` is healthy; the only assert that
  depended on the stand-in was `the in-band text channel is alive`, which needed
  ICY metadata interleaved into the stand-in before it went green.

## 4. Suite

| | asserts | result |
|---|---|---|
| before | 39 | 39/39 green (real relay, Raadio 2) |
| after | **41** | **41/41 green** (stand-in relay on `127.0.0.1:8899`) |

The two new ones are `every sound in the list reaches the engine, and no two are
the same` and `the grain clock tunes itself to a loop, and comes back off it`.
Both were broken on purpose and both went red.
