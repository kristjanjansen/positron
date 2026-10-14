# Kit lessons: pappus-mod.mjs, pappus-mod-test.mjs

The long comments cut from `demo/shell/pappus-mod.mjs` and `demo/shell/pappus-mod-test.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-pappus-mod.md#<anchor>`.

<a id="header"></a>

## pappus-mod.mjs, file header

demo/shell/pappus-mod.mjs — the movement Pappus has and our tab does not.

🔴 WHY THIS EXISTS, AND IT IS A DIAGNOSIS RATHER THAN A FEATURE. Upstream
Pappus has eight LFOs with two destinations each, six shapes, rates from
0.005 Hz to 12 Hz, a Turing machine on its sample-and-hold, and an envelope
follower its own source calls *"the most musical source in the box"*.
**NONE OF IT IS IN THE SYNTHDEF.** It all lives in the Lua half, which pushes
`/n_set` sixty times a second at a running graph. We load the compiled graph
and get the granulator with none of the motion.

So every patch this project ships is a set of FROZEN NUMBERS, and two sets of
frozen numbers both producing a static wash sound alike however far apart the
numbers are. REPORTED as *"patches still too similar and not too
interesting"*, after a round of widening the ranges that could not have
helped: it moved the numbers further apart without making any of them move.

── three things that make this safe, all of them checked ──────────────────

1. 🔴 **IT WILL NOT ZIPPER, AND THAT WAS THE REAL RISK.**
   `Engine_Pappus.sc:485` sets `lagt = 0.02` and nearly every control goes
   through it — `msize`, `mrate`, `mscan`, `mswarm`, `mstrum`, the window
   ends — all `Lag.kr(…, lagt)`, with `mbuflen` on 0.1. The engine already
   smooths stepped control changes over 20 ms. Stepping parameters from a
   timer is what Pappus is built to receive.

2. **20 ms of lag also sets the rate.** Above ~50 Hz the lag throws the extra
   messages away, so 25 Hz is an argument rather than a taste: fast enough
   that the lag has something to smooth, slow enough that nothing is wasted.

3. 🔴 **EVERY SOURCE IS A FUNCTION OF THE AUDIO CLOCK, NEVER AN ACCUMULATOR.**
   `phase = (now * hz + offset) % 1`. A late tick, a dropped tick, a tab that
   was in the background — all cost RESOLUTION and none of them cost PHASE,
   because the next tick still reads the wave exactly where it should be.
   That is what makes a plain `setInterval` adequate here, and it is why the
   plan's objection to "a per-frame wire this page cannot prove arrived" does
   not apply: this is a sampler of a continuous function, and the sampling
   rate is free to wobble. ⚠️ The ONE piece that genuinely integrates is the
   envelope follower, and it is given the real elapsed time so a long gap
   decays it correctly rather than pretending no time passed.

── the two decisions worth stealing from upstream ─────────────────────────

Both are invisible from the engine and both are the difference between a
modulation that is musical and one that is a knob being waggled.

<a id="spec"></a>

## pappus-mod.mjs, spec

A control's own space. `map`/`unmap` are the slider's warp, so a modulation
is applied where the LANE is, not where the number is.

🔴 THIS IS THE ONE THAT MATTERS. Upstream: `spec:map(clamp(spec:unmap(base)
+ d, 0, 1))`. On an exponential control that makes a modulation a constant
RATIO rather than a constant amount — an LFO on grain length multiplies and
divides, so the same wobble is musical at 2 ms and at 8 s. Added in the
engine's own units instead, a depth that breathes at the top of the lane is
a stutter at the bottom and inaudible in the middle.

<a id="taper"></a>

## pappus-mod.mjs, taper

🔴 THE AMOUNT IS CUBED, AND UPSTREAM SAYS WHY IN A COMMENT. The amount is a
fraction of the WHOLE parameter range, so 0.2 was already a huge gesture:
`val * amt * amt * abs(amt)`. Cubed, 0.5 becomes 0.125 and a routing set by
feel lands somewhere usable instead of slamming the lane end to end.

<a id="env-follower"></a>

## pappus-mod.mjs, createEnvFollower

An envelope follower — a one-pole with separate attack and release.

🔴 ITS SOURCE IS THE RADIO, WHICH IS THE WHOLE POINT ON THIS PAGE. Upstream
offers OUT / GS1 / GS2 / IN L+R / LEFT / RIGHT and calls the input *"the most
musical source in the box"*. Here the input is a live radio station, so the
station plays the granulator: loud passages shorten the grains and lift the
rate, quiet ones open into long smears. Nothing else available to this page
is correlated with the material at all.

Defaults are upstream's: attack 0.01 s, release 0.35 s, sensitivity 6.

<a id="env-coefficient"></a>

## pappus-mod.mjs, createEnvFollower, coefficient

⚠️ THE COEFFICIENT IS DERIVED FROM `dt`, NOT A FIXED FRACTION. A fixed
one makes the attack and release times depend on how often this happens
to be called, which is the same class of mistake as a per-block glide.

<a id="shapes"></a>

## pappus-mod.mjs, SHAPES

Shapes. `t` is phase 0..1; every one returns -1..1.

⚠️ `step` AND `glide` ARE NOT HERE because they are not functions of phase
alone — they read a sixteen-slot memory that the clock indexes. See
`advance()` and `read()`. Upstream has the same six (`LFO_SHAPES`, `:2035`) and the same
split: four are arithmetic, two are a machine.

<a id="advance"></a>

## pappus-mod.mjs, advance

The sample-and-hold, with upstream's Turing machine on it.

🔴 THIS IS THE ONE THAT MAKES A GRANULATOR SOUND COMPOSED RATHER THAN
WAGGLED, and it is the piece the diagnosis at the top of this file was
really about. A sine on a grain length is a wobble; sixteen values on a loop
that rewrite themselves slowly is a PART. Upstream (`:2054–2075`): sixteen
slots read on a loop, and each step rewrites its own slot with a fresh random
value with probability `1 − machine`. At `machine 0` it is free random and
never repeats; at 1 the sixteen values loop for ever; in between the pattern
drifts one value at a time, which is the setting worth having.

🔴 THE STEP INDEX COMES FROM THE CLOCK AND ONLY THE VALUES ARE STATE. That is
the same rule the rest of this file follows — `step = floor(t·hz + phase)` —
and it is what keeps a Turing route honest when a tick is late: the pattern
stays where the clock says it is instead of sliding. ⚠️ A late tick that
skipped steps still runs the rewrite decision ONCE PER SKIPPED STEP (bounded
at sixteen, which is a whole lap), or a backgrounded tab would come back with
a pattern that had aged less than the music it is playing under.

`glide` is the cosine ease between the previous slot and the current one
(`:2205–2207`), which is what makes a stepped source usable on a continuous
control like grain length.

<a id="followers"></a>

## pappus-mod.mjs, createModulator, followers

🔴 ONE FOLLOWER PER NAMED MEASUREMENT, AND THE PAGE OWNS THE MEASURING.
Upstream offers one follower with a source switch (OUT / GS1 / GS2 / IN L+R
/ LEFT / RIGHT). Here the interesting sources are all derived from the same
audio the page is already analysing for its meter — loudness, three bands,
where the energy sits, how fast it is changing — so the page hands in raw
numbers by name and this holds the envelope for each.

⚠️ SENSITIVITY IS PER NAME AND MUST BE. `rms` wants upstream's 6; a
centroid that is already 0..1 saturates instantly at 6 and would sit
pinned at the top looking like a broken follower.

<a id="prepare"></a>

## pappus-mod.mjs, prepare

A routing is read ONCE PER TICK and then sampled per element.

🔴 THE SPLIT EXISTS BECAUSE `advance()` MUTATES. A Turing route owns
sixteen values and a step counter, and an array destination reads it eight
times in one tick — so evaluating the whole source per element would run
the rewrite decision eight times a step and shred the pattern it exists to
hold. Advance once; read eight times.

<a id="read"></a>

## pappus-mod.mjs, read

−1..1 for element `j` of `n`.

⚠️ THE OFFSET IS A DIFFERENT QUANTITY FOR EACH KIND, which is why it is not
one number passed in. A continuous shape wants a FRACTION of its cycle
(`j/n`), so eight voices sit evenly round one wave. A sixteen-slot memory
wants a WHOLE SLOT (`j`), so eight voices read eight consecutive steps of
the same pattern — rotate a sine by a slot and you get nothing; rotate a
pattern by a fraction and you get a value that is not in it.

<a id="unknown-source"></a>

## pappus-mod.mjs, setRoutes, unknown source

🔴 AN UNKNOWN SOURCE IS REFUSED, NOT QUIETLY TURNED INTO A SINE. The
first version tested `src === 'env'` and let everything else fall
through to a shape, so `src: 'lfo2'` or a typo became a 0.1 Hz sine —
a routing that works, sounds plausible and is not the one written.

<a id="phases"></a>

## pappus-mod.mjs, setRoutes, phases

⚠️ PHASES SPREAD ROUND THE CYCLE, `i / n`, which is upstream's
`(i-1)/NLFO` (`:3033`). Sources at one rate starting together are one
source; started apart they are a texture.

<a id="go-home"></a>

## pappus-mod.mjs, setRoutes, go home

⚠️ A DESTINATION THAT STOPS BEING MODULATED MUST GO HOME. Without this
it keeps whatever the last tick left it at, so a patch change would
inherit the previous patch's wobble as a static offset — silently, and
only on the controls that happened to be moving.

<a id="array-phase"></a>

## pappus-mod.mjs, tick, array destination

🔴 AN ARRAY DESTINATION GETS ONE PHASE PER ELEMENT, which is the
whole reason it is worth modulating. `probs` is eight per-voice
firing probabilities; one shape rotated across them makes voices
come and go in turn. ⚠️ A FOLLOWER HAS NO PHASE, so on an array it
moves all eight together — a duck rather than a rotation, which is
honest and is not the same gesture.

<a id="quant"></a>

## pappus-mod.mjs, tick, integer control

⚠️ AN INTEGER CONTROL IS ROUNDED HERE, NOT LEFT TO THE ENGINE.
`mcontour` is a `Select.kr` index (`:726`); handing it 7.4 asks the
server to decide, and a destination whose value the page cannot
read back the way it sent it cannot be graded by an assert.

<a id="deadband"></a>

## pappus-mod.mjs, tick, dead-band

🔴 A DEAD-BAND, AND IT IS WHAT KEEPS THE TRAFFIC HONEST. Sending 25
messages a second per routing regardless of whether anything moved
makes a 0.005 Hz source — a two-hundred-second wave — cost exactly as
much as a 12 Hz one. Measured against the LANE rather than the value,
so a control at the bottom of an exponential range is not spammed by
changes too small to be a step anywhere on it.

<a id="hold"></a>

## pappus-mod.mjs, hold

Stop moving and put every destination back on its base.

🔴 A CHECK THAT READS A CONTROL BACK CANNOT READ A MOVING ONE. The page's
"did the patch reach the engine" assert compares `/s_get` against the
patch's number, and the moment anything modulates that control the two
legitimately differ — MEASURED the first time this ran: `msize
2.4448649883270264 not 1.8`, which is the modulator working and the
assert asking the wrong question. Holding separates them: with nothing
moving, the read-back grades delivery; with it moving, the check below
grades the movement.

<a id="test-header"></a>

## pappus-mod-test.mjs, file header

demo/shell/pappus-mod-test.mjs — the modulator, off the wire.

`node demo/shell/pappus-mod-test.mjs`

🔴 WHY THIS EXISTS. Every claim `pappus-mod.mjs` makes is about arithmetic —
a cube, a warped offset, a sixteen-slot memory, a dead-band — and none of it
needs SuperCollider, a browser or a radio station to grade. The page's own
assert can only say that SOMETHING moved; it cannot say the pattern locked
when it was told to, or that an array destination did not shred it. Those are
exactly the defects that would sound like "the patches are a bit random",
which is the report this whole file was written to answer.

⚠️ AND IT CARRIES ITS OWN CONTROLS. A test that only checks the locked case
passes on a machine that always locks.

<a id="test-inside-lane"></a>

## pappus-mod-test.mjs, both samples inside the lane

⚠️ BOTH SAMPLES WELL INSIDE THE LANE. The first version used 2 s on a lane
that ends at 4, so a tenth of the lane ran off the top and CLAMPED — and a
clamped reading looks exactly like a warp that does not work.

<a id="test-skipped-tick"></a>

## pappus-mod-test.mjs, a skipped tick ages by the clock

── a skipped tick ages the pattern by the CLOCK, not by the tick ─────────

🔴 THIS IS THE CLAIM IN THE HEADER, MEASURED. With `machine 1` nothing is
ever rewritten, so a slot's value is fixed after the first lap — which means
the value at time t must equal the value at t plus a whole number of laps,
however many ticks did or did not happen in between. An accumulator would
have drifted by exactly the ticks it missed.

<a id="test-once-per-tick"></a>

## pappus-mod-test.mjs, a Turing route on an array

🔴 THE ONE THE SPLIT EXISTS FOR. A Turing route on an eight-element
destination must advance its memory ONCE PER TICK. Evaluating the source per
element ran the rewrite decision eight times a step, which shreds a locked
pattern into noise — and it would have read as "machine does nothing".

<a id="test-rms"></a>

## pappus-mod-test.mjs, rms 0.12

⚠️ 0.12, NOT 0.5. `value()` is `clamp01(env × sens)` and sens is upstream's
6, so an rms of 0.5 pins the follower at its ceiling — where it is no
longer a follower and every later reading is the same number. The first
version of this test did exactly that and then asserted that the value
CHANGED on release, which a saturated follower cannot do.
