# plan-audio-shader: the granulator, drawn per pixel, from three signals it already has

> ⚠️ **NOTHING IN THIS FILE IS BUILT.** No page, module, manifest row, shader,
> assert or harness exists. Nothing was deployed and nothing on the board was
> touched. It is a proposal.
>
> **Tags.** **READ** means it is in the source and the file and line are given.
> **MEASURED** means I ran something in this session and the output is quoted.
> **INFERRED** means arithmetic on top of one of those, and the arithmetic is
> shown. A number READ out of another document in this repo was measured
> *there*, not here, and is cited that way. ⚠️ That distinction matters for one
> source in particular: `plans/plan-plate.md §0` records that
> `research/vr-sound-visual-2026-09.md` has **unknown provenance** and that its
> analysis scripts are gone, so every anchor quoted from it below is a number
> nobody in this repo can currently re-take. §8 makes re-deriving them step
> zero.

Companions, and each one decides something here rather than being background:
`plans/plan-visuals.md` (which side of the wire a picture is made on, and the GPU
numbers), `research/vr-sound-visual-2026-09.md` (what this station's audio
actually is, measured), `plans/plan-plate.md` (the VR floor, which is a different
picture from this one and is gated on a different unknown),
`plans/plan-board-modulation.md` (the same modulator, on the Raspberry Pi),
`demo/mirror/index.html` (the portable shader mechanism that exists today).

---

## 0 · The short answer

**Draw the instrument, not the sound.**

There is already a picture of this audio on this page and it is good: the
scrolling waveform with grain ticks on it. A second picture that turns the same
spectrum into moving shapes is what every audio visualiser on the web already
is, and `research/vr-sound-visual-2026-09.md §4E` says so in the repo's own
words: domain-warped noise "says nothing specific about the sound: the same
picture appears for any input". Building that here would earn the reply this
project has already given twice, to two different pages: *"this viz does nothing
to me"* (READ `demo/shell/grain-scope.mjs:15`) and *"mambo jumbo"*.

So the proposal is narrow. The shader draws **where the granulator is reading,
how long each bite is, and which voice took it**, as a field on the material's
own axis, and the live audio sets how that field is lit. Three facts decide
whether that is worth a page:

1. 🔴 **Two of the four numbers the engine reports about every grain are thrown
   away before anything can draw them.** READ: `/pgrain` carries
   `pos, dur, voice, half` and `demo/radio/index.html:3284` hands all four
   to the scope, but `demo/shell/grain-scope.mjs:211` keeps only
   `pos, level, half`. MEASURED by grep in this session: `g.dur` appears **0
   times** in `grain-scope.mjs` and `g.voice` **0 times**. Grain length is the
   single control this page argues about most (READ, the long comment at
   `demo/radio/index.html:3366-3382` about the engine's 2 ms to 8 s lane)
   and it has never reached a picture.
2. 🔴 **A third channel is constant by construction on this page.** The tick's
   alpha is `(0.25 + 0.75 * min(1, g.level))` (READ `grain-scope.mjs:425`), and
   `radio` passes no `level`, so `g.level ?? 1` is **always 1** and that term
   is always exactly 1.0. CLAUDE.md: a statistic that is constant by
   construction over your subject is blind, not weak. The picture has a
   loudness-of-grain channel that has never varied.
3. **The modulation has no picture at all.** `moving` in the readout is a count
   of destinations (READ `demo/radio/index.html:350` and `:3095`), and
   MEASURED by parsing the spec table in this session, there are **15
   destinations, 14 scalars plus `probs` with 8 elements, so 22 numbers**, driven
   by **6 followers** (`rms low mid high tone flux`) and four LFO shapes and a
   sixteen-slot Turing memory. The page's own diagnosis was *"patches still too
   similar and not too interesting"* (READ `pappus-mod.mjs:12`). Nothing on
   screen shows whether a patch moves, how far, or in what shape.

**The transport is one frozen 64x4 RGBA8 data texture, 1024 bytes, uploaded once
per frame from the frame callback, and no second timer anywhere.** §2 argues
that, and argues that `pappus-mod.mjs`'s 25 Hz argument does not transfer.

**Portability is a compile-time claim in v1, not a running board.** READ
`rig/vis/v3dpipe.c:112` and `:138-162`: the board's renderer takes **five named
floats over stdin** through a hard-coded `if`/`else` chain and has no path for a
texture, an array, or a sixth name. A portable audio shader needs one new stdin
verb and one new uniform, about twenty-five lines of C. §5 specifies it and §8
refuses to build it first.

---

## 1 · What the picture IS, and why it is not a third rendering

### 1.1 The two surfaces that already exist, and exactly what each cannot say

| surface | axis | what it carries | what it cannot say |
|---|---|---|---|
| `grain-scope`'s scrolling wave (READ `grain-scope.mjs:480-614`) | arrival time, 8 s across | the material, the loop marks, the live edge, a hairline per grain at its read position | how **long** any grain was, which **voice** took it, how loud it was, and whether any parameter is moving |
| the readout (READ `demo/radio/index.html:350`) | none | `voices`, `behind`, `grains/s`, `moving` | anything with a shape. `moving 3` is a count of routings, on the near side of the wire |

Both are correct and neither is the picture being proposed. The scope answers
*where in the sound is it eating*. Nothing answers *what is it eating with*.

### 1.2 What a viewer sees

One field, the width of the picture, on **the same left-to-right axis the scope
already uses**: position in the eight seconds the granulator is holding
(`BUF_SECONDS = 8`, READ `demo/radio/index.html:255`).

- **Up the picture is grain length**, on the engine's own exponential lane, 2 ms
  at the bottom to 4 s at the top. Those are the page's own slider ends (READ
  `demo/radio/index.html:3382`, `add('grain length', 'size', 0.002, 4, …,
  { warp: 'exp' })`), so the axis is the control's axis and not an invented one.
- **Every grain the engine reports is one mark at (where it read, how long it
  was)**, written once and left to decay. `voice` is the mark's shape, `half`
  its side, exactly as the scope already uses side for identity rather than
  colour (READ `grain-scope.mjs:459`, "the half is drawn as a side, not as a
  colour. One meaning for colour across every demo").
- **Behind the marks is the read window as a density, not a rectangle.** `scan`
  is where its centre is, `spray` is how wide it spreads, and the shape is the
  actual probability the engine is sampling from rather than a box with two
  edges. This is the one thing a per-pixel program does that a 2D canvas cannot
  do cheaply: the scope draws the range as `fillRect` plus two strokes (READ
  `grain-scope.mjs:394-406`), which is a correct drawing of the *bounds* and a
  wrong drawing of the *distribution*.
- **The live audio sets how the field is lit**, and only that: brightness from
  loudness, sharpness from spectral flatness. Not hue. §1.4 says why.

### 1.3 What it lets a viewer see that they cannot now

Three things, and each is a question this page has actually been asked.

**"They all sound the same."** Two patches with the same wash produce different
fields: `fast forward` is a dense low band of short bites, `ground` is a handful
of tall smears. If two patches make the same picture, the complaint was right,
and that is a finding rather than a failure of the picture.

**"Is anything actually moving?"** A modulated `scan` slides the band; a
modulated `spray` breathes its width; a Turing step source on `size` moves the
marks in a sixteen-step pattern that repeats and slowly rewrites itself. Those
are three visibly different motions today reported as the single number 3.

**"Did the grain go where I think it went?"** This page has already shipped a
wrong answer to exactly that, twice in one line, and the comment at
`demo/radio/index.html:3253-3278` records it: the position was read from the
wrong OSC field so every grain was drawn at `-1`, and the rescale from the
capture ring to the held window was missing so everything landed in the left
13%. READ, in that comment: *"the count was right the whole time and the place
was not, and nothing could see it"*. A picture with a second axis has a second
chance to be wrong visibly, which is the point.

### 1.4 🔴 COLOUR IS SPOKEN FOR ON THIS PAGE, AND IT WAS REFUSED TWICE

`grain-scope.mjs:492-508` is a dead branch with a long note: a hue-mapped wave,
height for loudness and hue for spectral centroid, bounded to about 95 degrees
of `--hi` rather than a rainbow. The argument was good and it was reverted, on
instruction, **twice**. The rule left behind is quoted: *"If colour comes back
here it needs a flag the PAGE sets by name, not a field that turns it on by
being present."*

So the design consequence is not negotiable and it changes the obvious mapping.
`research/vr-sound-visual-2026-09.md §3.4` maps spectral centroid to hue, and
that is right for a floor in a black void where nothing else owns colour. Here:

- the field is **monochrome by default**, on `--dim2` and `--hi` like everything
  else in that box;
- the fast spectral axis drives **sharpness**, not hue. Flatness spans 0.025 to
  0.158 over this material (READ, research §1.5, measured there), so tonal
  passages give crisp marks and noisy ones diffuse marks. That is the research's
  own "nodal-line sharpness" row, moved off the colour channel;
- hue exists as a **named page flag, off**, and the flag's name is what a reader
  greps for. Not a field that switches it on by arriving.

### 1.5 What would make this a decoration, stated so it can be refused

If the field's shape does not change when a parameter changes, it is wallpaper.
The test is in §7 and it is a sabotage: hold every parameter at its base with
`modulator.hold(true)` (READ `pappus-mod.mjs:368`) and the field must go still
while the grain marks keep arriving. If it keeps moving, it was being driven by
the clock.

---

## 2 · The transport, and its rate

**This is the section the rest depends on, so it is argued rather than chosen.**

### 2.1 🔴 THE 25 Hz ARGUMENT DOES NOT TRANSFER, AND THE REASON IS WHAT IT WAS ABOUT

READ, `demo/shell/pappus-mod.mjs:26-28`, in full:

> 20 ms of lag also sets the rate. Above ~50 Hz the lag throws the extra
> messages away, so 25 Hz is an argument rather than a taste: fast enough that
> the lag has something to smooth, slow enough that nothing is wasted.

The quantity that fixes 25 is `lagt = 0.02` inside `Engine_Pappus.sc`, a
one-pole **in the consumer**. Everything the modulator writes is smoothed over
20 ms on the far side of the message, so a 100 Hz write and a 50 Hz write arrive
at the same audio. `plans/plan-board-modulation.md §1.3` makes the same argument again
about the board and adds a second smoother, a 21.3 ms JACK period.

**A shader has neither.** There is no one-pole between a uniform and a pixel.
The consumer is an eye and a compositor, and the compositor's own rate is the
only quantisation there is. So the ceiling that made 50 Hz wasteful for scsynth
does not exist here, and copying 25 Hz across would be taking a number from a
mechanism that is not present.

⚠️ **The mistake in the other direction is just as easy.** "The shader runs at
60 or 90, so feed it at 60 or 90" is a claim about the *drawing* rate, not about
the *information* rate, and those are different. READ
`demo/radio/index.html:1091`: `analyser.fftSize = 2048`. INFERRED at the
48 kHz this page runs at, that is a **42.7 ms window**. Read at 60 Hz,
consecutive reads overlap by 61% and genuinely new information arrives at about
23 Hz. Re-reading an overlapped window is not waste, because the alternative is a
23 Hz staircase the eye can see on a picture that is redrawn 60 times a second,
but nobody should write down "60 Hz of spectrum" as if it were 60 independent
measurements.

### 2.2 The answer: one clock, and it is the frame callback, because the work is already being done there

READ, `demo/radio/index.html:1503-1560`. `meterTick` is a
`requestAnimationFrame` loop that already, every frame:

- reads `sink` with `getFloatTimeDomainData` and updates a running peak;
- reads `analyser` with `getFloatTimeDomainData`, computes rms;
- reads `analyser` with `getFloatFrequencyData` into 1024 bins;
- walks those bins once, computing three band sums, a spectral centroid and a
  positive-only spectral flux;
- calls `modulator.sense({ rms, low, mid, high, tone, flux })` at `:1556`;
- calls `scope.feed(buf, ctx.sampleRate)`.

**So the six features exist at frame rate today.** The 25 Hz `setInterval` at
`:3042` is only the rate at which the modulator *writes to scsynth*. A shader
reading those same six numbers costs **one extra array read per frame and no
extra analysis**, which is the strongest possible argument for putting the
sampling in the frame callback: it is where the numbers already are.

Three channels, three places they are sampled, one place they are assembled:

| channel | sampled | where | why there |
|---|---|---|---|
| spectrum and level | once per frame | inside `meterTick` | it is already computed there; a second timer would be a second clock for one number |
| parameters | at the instant they change | a tap in the modulator's `send` callback (READ `demo/radio/index.html:2976`, `send: (name, v) => setParam(...)`) | `send` is a page callback. One assignment beside the existing call, no polling, no missed change, and the tap sees exactly what went out |
| grain events | when they arrive | inside `onReply` (READ `demo/radio/index.html:3279`) | they are events. §3 |

All three land in one `Uint8Array`, uploaded with **one `texSubImage2D` per
frame**. One clock, one upload, one thing to reason about.

### 2.3 🔴 A COUNT IS ONLY EVIDENCE ON THE FAR SIDE, AND THIS PICTURE STRADDLES THE BOUNDARY

CLAUDE.md's rule applies here with unusual force, because two of the three
channels are on opposite sides of the same wire.

- **The parameter row is on the NEAR side.** It is what the page asked for. If
  the shader draws `size` moving, that proves `setInterval` ran and
  `createModulator.tick()` computed a number. It proves nothing about scsynth.
  `createMidiLane`'s `scheduled()` is the repo's own recorded version of this
  failure: a count of what was queued read identically to delivery while every
  note was fifty-six years out.
- **The grain row is on the FAR side.** Every mark is the engine reporting, over
  OSC, that it fired. READ `demo/radio/index.html:3254`: *"Every tick is a
  grain the ENGINE reported firing, from the code that started it, never one
  inferred from an output envelope."*
- **The spectrum row is on the far side of the audio boundary**, but ⚠️ **not of
  the granulator's.** READ `demo/radio/index.html:1176-1180`: `sink` is fed
  by `dry` and `loopOut` only. `dry` is the station path after the fader (READ
  `:3149`, `dry.gain.value = muted ? 0 : 1 - v`) and the granulator's own output
  goes to the destination by its own gain (`:3148`, `eng.out.gain.value`). **So
  neither analyser on this page hears the granulator.** At the fader's
  granulator end, a picture lit from `analyser` is lit by a signal nobody is
  listening to.

That last one is a real defect for this proposal and it needs one graph change,
not a workaround: a master gain that both `dry` and `eng.out` feed, with an
analyser on it. It is three lines and it also gives the page the meter it has
never had. Listed in §8 as part of step 2.

**Design consequence.** The picture must be built so that the near side and the
far side can visibly disagree. Stop the engine while the modulator keeps
ticking, and the band must go on sliding while the marks stop arriving. If both
stop, the parameter row is being fed from the wrong place, and only a picture
that separates them can show it.

### 2.4 Why a texture and not uniforms

Twenty-two parameter numbers, twenty-four band levels, sixty-four grain buckets
and nine scalars is **119 values**. As uniforms that is 119 `getUniformLocation`
lookups, 119 `uniform1f` calls per frame, and a shader body that has to declare
all of them. Three specific reasons it is a texture instead:

1. **The board's ceiling is five.** READ `rig/vis/v3dpipe.c:112` and `:154-160`:
   five named floats, hard-coded, clamped. A uniform-per-value design needs the
   C's parser extended by 119 names. A texture needs one verb.
2. **A spectrum is a field and wants to be sampled like one.** A shader that
   wants the band nearest this pixel reads one texel. With uniforms it needs an
   array and a loop, and `uniform float uBands[24]` indexed by a non-constant
   expression is exactly the construct that compiles differently on different
   drivers.
3. **8 bits is finer than the source's own resolution, so the quantisation costs
   nothing real.** READ `pappus-mod.mjs:175`: `deadband = 0.005`, and `:347`
   measures it against the lane in unmapped space. INFERRED: one step of an 8-bit
   channel is 1/255 = **0.39% of a lane**, against a dead-band of 0.5%. The
   modulator will not send a change the texture cannot represent. That is an
   argument, not a hope, and it is why RGBA8 rather than a float texture.

⚠️ And RGBA8 removes a portability question entirely. Half-float and float
textures raise filtering and renderability questions on two different GL
versions; `RGBA8` with `UNSIGNED_BYTE` is core and required-filterable in both
GLSL ES 3.00 and 3.10, and read with `texelFetch` it needs no sampler state at
all. §5.

---

## 3 · Grain events are discrete, audio is continuous, and they get different channels

### 3.1 The failure mode if they share one

A grain is a thing that happened at an instant. The rate slider reaches
**100 grains a second** (READ `demo/radio/index.html:3360`,
`add('grains a second', 'rate', 0.1, 100, …)`) and the engine has **eight
voices** with independent gates, so the reported rate can exceed the frame rate.
INFERRED: at 60 fps and 200 grains a second, an average frame carries **3.3
grains**, and bursts carry more.

A per-frame uniform holds one value. Feeding grains through one would draw the
last grain of each frame and silently drop the rest. CLAUDE.md, on
`pcm-playout`: *"Every stage that can discard data needs a counter a page
actually displays"*, and the reason it is in CLAUDE.md is that those counters
existed, posted every 250 ms, and no page had ever read one.

⚠️ **There is already a silent cap on this path.** READ
`grain-scope.mjs:212`: `if (live.length > 600) live.splice(0, live.length - 600)`.
INFERRED: with `fadeMs = 520` (READ `:73`) and 200 grains a second, live marks
peak around 104, so the cap does not bite today. Nothing says so, nothing counts
a splice, and a rate change or a longer fade moves it. A new picture must not
add a second uncounted cap.

### 3.2 🔴 A FRAGMENT SHADER CANNOT SCATTER, SO TURN THE SCATTER INTO A GATHER BY CHOOSING THE AXIS

`plans/plan-visuals.md §2.2` states the constraint: a fragment shader writes exactly
one pixel, its own, fixed by rasterisation; scatter needs compute, which is
WebGPU only in a browser. Three ways to deposit a grain, and only one of them is
portable:

| | how | why not |
|---|---|---|
| a quad per grain, additive blending | real scatter, and WebGL2 can do it | the board draws `glDrawArrays(GL_TRIANGLES, 0, 3)` and nothing else (READ `v3dpipe.c:135`). Per-grain geometry is not portable to it |
| every pixel tests every grain | pure gather, no geometry | O(pixels x grains). On a machine `plan-visuals §3.4` measured as **ALU-bound, not fill-bound**, this is the worst available shape |
| **a bucket texture whose x axis IS the grain's own axis** | the CPU writes grain `i` into bucket `floor(pos * 64)`; every pixel reads the bucket under it and a few neighbours | **recommended.** O(1) per pixel, no geometry, one texture |

The third works only because the grain already has a natural spatial coordinate:
`pos`, its read position in the held buffer, which is the picture's x axis by
construction. That is the same insight `grain-scope` had when it stopped
plotting position against time and started plotting it on the waveform it came
from (READ `grain-scope.mjs:10-17`).

### 3.3 How each one reaches the shader

**Continuous (spectrum, level, centroid, flatness, width).** Sampled in the
frame callback, written to rows 0 and 3, and **smoothed in seconds, never per
call**. READ `demo/radio/index.html:1099`,
`analyser.smoothingTimeConstant = 0`, with the comment explaining that the
analyser's own smoothing is applied per call so the same page smooths
differently at 60, 72, 90 and 120 Hz. Every filter in the shader's feed uses
`k = 1 - exp(-dt / tau)` against a `tau` in seconds, which is exactly the shape
`createEnvFollower` already uses (READ `pappus-mod.mjs:99`).

**Discrete (grains).** Accumulated in a JavaScript bucket array as they arrive in
`onReply`, drained into row 1 once per frame, and **the array is cleared after
the upload**, so a grain is written once. The field's persistence is the shader's
job, through the feedback tap that `mirror` already has: read `uPrev`, multiply
by a decay, add this frame's deposits. That is what ping-pong is for, and it
means the picture holds history without the CPU holding a list.

⚠️ **Two counters, both displayed.** How many grains arrived this frame, and how
many were refused because a bucket saturated. The second one exists so the
saturation can be seen rather than deduced. §7 breaks it on purpose.

**Near-side (parameters).** Written on change, not sampled. §2.2.

---

## 4 · What the shader gets, exactly

🔴 **THIS LAYOUT IS FROZEN THE WAY `pattern.mjs`'s `ROW` IS FROZEN, AND FOR THE
SAME REASON.** READ `demo/shell/pattern.mjs:13-20`: *"CHANGE THESE NUMBERS AND
THE COMPARISON SILENTLY STOPS MEANING ANYTHING."* A shader body compiled against
layout 1 and fed layout 2 does not fail; it draws a plausible wrong picture. So
the version lives **in the texture**, at row 3 x 63, and the page asserts it.

### 4.1 The uniforms

Exactly `mirror`'s eight, plus one. Nothing else, ever.

```glsl
uniform float uT;          // frame counter, i/30.0 on the board. NOT wall time
uniform vec2  uRes;        // pixels of the target being drawn
uniform sampler2D uPrev;   // the previous frame, for the feedback tap
uniform float uSeg;        // 2..64    kaleidoscope fold count
uniform float uFb;         // 0..0.95  how much of the previous frame survives
uniform float uScale;      // 0.5..40  noise frequency
uniform float uWarp;       // 0..1.2   displacement amount
uniform float uHue;        // 0..3     colour channel separation
uniform sampler2D uData;   // NEW. 64 x 4 RGBA8, layout below
```

⚠️ **The five knobs keep their meanings and no body may invent new ones.** READ
`demo/mirror/index.html:786-789`: *"A body that invented its own controls would
make the knobs lie, which is worse than not having the body."* The clamp ranges
above are READ from `v3dpipe.c:154-158`, which is the end that clamps.

⚠️ **`uT` is a frame counter and not a clock**, READ
`demo/mirror/index.html:751-754`. A shader that drives motion from `uT` and a
shader that drives it from the data are different pictures; §7's determinism
assert depends on `uT` being a number the harness can hold still.

### 4.2 The data texture

**64 wide, 4 tall, `RGBA8`, `UNSIGNED_BYTE`, `NEAREST`, `CLAMP_TO_EDGE`, 1024
bytes.** Read with `texelFetch(uData, ivec2(x, y), 0)`, never `texture()`: a
fetch takes integer coordinates, needs no filtering and cannot be off by half a
texel, which is the entire class of bug a data-in-a-texture design invites.

Every channel below is `0..255` standing for `0..1` unless stated. Every
mapping is from a **fixed anchor**, never from a running maximum. ⚠️ An
auto-normaliser here makes silence look loud, which is a confident measurement
of nothing; `research/vr-sound-visual-2026-09.md §3.5` says it and CLAUDE.md
forbids it.

**Row 0, x = 0..23: the spectrum.** 24 log-spaced bands, 40 Hz to 12 kHz at
about a quarter octave (READ, research §3.2). ⚠️ Nothing above 16 kHz: research
§1.4 measured **0.0000% of energy at p50** above 16 kHz on this 128 kbit/s
stream, so a channel driven from there reports the encoder's opinion.

| ch | quantity | mapping |
|---|---|---|
| R | this band now, 93 ms window | `(dB + 72) / 72`, clamped. One step = 0.28 dB |
| G | the same band, 3 s time constant | same mapping |
| B | where R sits between this band's own measured p10 and p90 | the fixed anchors from research §1.4. 0 means at or below p10, 255 at or above p90 |
| A | 255 | reserved, and set so a debug read of the texture is opaque |

**Row 1, x = 0..63: the grain deposit.** 64 buckets across the 8 s held buffer,
**125 ms per bucket** (INFERRED, 8000/64).

| ch | quantity | mapping |
|---|---|---|
| R | grains landing in this bucket since the last upload | count, capped at 255 |
| G | mean grain length of those grains | `spec.unmap(dur)` on the engine's own exponential lane, `min 0.002 max 4 warp exp` (READ `demo/radio/index.html:3382`) |
| B | the voice that fired most in this bucket | `voice * 32`, so 0..7 maps to 0..224 |
| A | grains refused because R saturated | count, capped at 255. **This is the counter §3.3 demands** |

**Row 2, x = 0..22: the parameters.** x is a fixed index into a named table.
0..14 are the fifteen destinations in declaration order (MEASURED by parsing the
spec table this session: `rate size scan spray swarm strum sos contour wow drive
crush noise winstart winend probs`), and 15..22 are `probs`' eight elements.

| ch | quantity | mapping |
|---|---|---|
| R | the value now, **as a fraction of its own lane** | `spec.unmap(v)`. 🔴 In the lane, never in engine units: `pappus-mod.mjs:50-55` is a long note on why a modulation means the same thing at 2 ms and 8 s only in the control's warped space, and a picture that draws it in engine units is drawing a different quantity from the one the modulator moved |
| G | the base, where the patch put it | same mapping. R minus G is the excursion, which is what the picture wants |
| B | 255 if this destination is currently modulated, else 0 | so "not moving" and "moving and momentarily at its base" are different pixels. CLAUDE.md: a blank cell collapses "we did not look" and "we looked and it was fine" |
| A | 255 | reserved |

**Row 3: scalars, one per x.**

| x | quantity | mapping |
|---|---|---|
| 0 | momentary loudness, 400 ms | `-40.0 .. -14.5 LUFS` to 0..1 (research §1.3 p10/p90) |
| 1 | short-term loudness, 3 s | same anchors |
| 2 | spectral centroid | `1374 .. 3821 Hz` to 0..1 (research §1.5) |
| 3 | spectral flatness | `0.025 .. 0.158` to 0..1 |
| 4 | side over mid energy | `0.034 .. 0.464` to 0..1 (research §1.6) |
| 5 | the fader, radio to granulator | 0..1 straight from `wet` (READ `:3146`) |
| 6 | grains reported since the last upload | capped at 255 |
| 7 | grains refused since the last upload | capped at 255 |
| 8 | a loudness jump over 3 LU | set to 255 on the frame it happens, decays. Research §3.3 picks 3 LU because `abs(dM)` p90 is 1.71 LU, so 1 LU would fire constantly |
| 9..62 | unassigned. **Zero, and a body must not read them** | |
| 63 | **layout version**, R channel, currently 1 | |

⚠️ **Every anchor in rows 0 and 3 is READ out of a document whose scripts are
gone** (`plans/plan-plate.md §0`). They are the best numbers available and none of them
has been re-taken. §8 step 0.

### 4.3 What a body looks like against it

Short, and only to show the shape. Nothing here is proposed as the picture.

```glsl
// row 1: what landed in this column, and how long it was
ivec2 uv  = ivec2(gl_FragCoord.xy);
int   col = int(gl_FragCoord.x / uRes.x * 64.0);
vec4  g   = texelFetch(uData, ivec2(col, 1), 0);
float y   = gl_FragCoord.y / uRes.y;              // 0 = 2 ms, 1 = 4 s
float hit = g.r * exp(-abs(y - g.g) * 40.0);      // a mark at its own length
// row 3: what it sounds like right now
float loud  = texelFetch(uData, ivec2(0, 3), 0).r;
float sharp = texelFetch(uData, ivec2(3, 3), 0).r;
vec3  prev  = texture(uPrev, gl_FragCoord.xy / uRes).rgb;
o = vec4(prev * uFb + hit * loud, 1.0);
```

---

## 5 · Portability, concretely

### 5.1 The two compilers, and the intersection is GLSL ES 3.00

READ `demo/mirror/index.html:758-763`: the body travels without a version line
and each end prepends its own. The browser compiles `#version 300 es` because
WebGL2 is GLSL ES 3.00; the board compiles `#version 310 es` because
`v3dpipe.c:202` writes that string and the EGL context asks for
`EGL_CONTEXT_MAJOR_VERSION 3, MINOR_VERSION 1` (READ `v3dpipe.c:172`).

**So the shader must be valid GLSL ES 3.00.** Named refusals, because "keep it
simple" is not a specification. A body may not use:

- `textureGather` and its variants. ES 3.10 only.
- `layout(binding = N)` on a sampler or any uniform. ES 3.10 only. Sampler units
  are set from the host with `uniform1i`, as `mirror` already does
  (READ `demo/mirror/index.html:942`).
- image load and store, shader storage blocks, `atomic_uint`, and anything
  `compute`. ES 3.10 only, and `plans/plan-visuals.md §2.2` records that none of them
  are in the WebGL2 API surface at all.
- `gl_HelperInvocation`. ES 3.10 only.
- arrays of arrays. ES 3.10 only.
- any `#extension` line. Neither end negotiates extensions and a body that needs
  one is a body that compiles on one machine.

And two that are about the browser being *stricter* than the board:

- 🔴 **Never sample the target being drawn to.** `plans/plan-visuals.md §2.3` quotes
  OpenGL ES 3.0.6 §4.4.3, "When a feedback loop exists, **undefined behavior**
  results", against WebGL, which promotes it to a hard `INVALID_OPERATION`. A
  body that reads its own target works by accident on the Pi and errors in a
  browser, which is the worst available direction for a bug to point. Two
  targets, swapped every frame. Both ends already do this.
- ⚠️ **WebGL2 requires every declared uniform to be statically used** before it
  gets a location. A body that declares `uData` and never reads it gets
  `getUniformLocation` returning `null`, which is not an error and is easy to
  read as "the texture is not arriving".

### 5.2 What the board needs, and it is one verb

READ `rig/vis/v3dpipe.c:138-162`. The control channel is stdin, one line per
change, parsed as `sscanf(line, "%31s %f")` against a hard-coded chain of five
names, plus a `shader <base64>` line. There is no path for a texture.

**The change: one new line verb and one new uniform.**

```
data <base64 of exactly 1024 bytes>
```

which `drain_stdin` decodes into a static buffer and the render loop uploads
with `glTexSubImage2D` into a 64x4 `GL_RGBA8` texture bound to texture unit 1,
with `uData` set by `glGetUniformLocation` in `draw_pass` beside the five floats
it already sets defensively (READ `v3dpipe.c:122-135`, and note its own comment:
a body "need not declare all of them, and `glGetUniformLocation` returning -1 for
one it dropped is the normal case rather than an error"). About twenty-five
lines of C, in the file that already has the b64 decoder the `shader` verb uses.

Three measured constraints on it:

1. **MEASURED this session, the body size budget.** `g_pending` is 16384 bytes
   and the line buffer is 16384 (READ `v3dpipe.c:117`, `:141`), so with the
   seven-character `shader ` prefix the largest decodable body is
   **12,282 bytes**. `mirror`'s current `FS_BODY` is **1,090 bytes, 1,456 base64
   characters**. Eleven times headroom, and it is worth knowing because the same
   line buffer would have to carry a 1024-byte data payload at **1,368 base64
   characters** per frame.
2. 🔴 **`drain_stdin` reads ONE BYTE PER `read()` SYSCALL.** READ
   `v3dpipe.c:143`: `while(read(0, &c, 1) == 1)`. INFERRED: a 1,368-character
   data line costs 1,368 syscalls, and at 30 frames a second that is **41,040
   read syscalls a second** on a board whose renderer is already the thing being
   measured. It is fine for a `shader` line that arrives once; it is not
   obviously fine for a data line that arrives every frame. **Unmeasured**, and
   it is the first thing to measure if the board's frame rate moves when data
   starts arriving. The fix, if needed, is a buffered read, not a smaller
   payload.
3. **The board's texture limit is not the issue.** READ `plans/plan-visuals.md §3.3`,
   measured there: `GL_MAX_TEXTURE_SIZE 4096`. A 64x4 texture is not close to
   anything.

### 5.3 The Quest

READ `research/quest-xr-2026-09.md` via `plans/plan-visuals.md §2.4` and CLAUDE.md:
**WebGL2 plus `OCULUS_multiview` is what ships**; WebGPU inside an immersive
session is behind a `chrome://flags` toggle the visitor must set. The framebuffer
is 3360x1760, two views, and `blocks` holds 89.8 fps in it, measured.

Two things follow for a data texture specifically:

- ⚠️ **The session's context is a different context.** READ
  `demo/mirror/index.html:856-867`: programs, targets and textures from the
  page's canvas do not exist there, which is why `makeKaleidoscope` takes its
  `gl` as an argument. **`uData` has to be uploaded into both contexts**, and a
  design that uploads into one and reads in the other draws a black or stale
  field with no error. This is the single most likely implementation bug in the
  whole proposal.
- **`alpha: false` makes passthrough impossible**, CLAUDE.md, and the assert is
  on `environmentBlendMode`, never on the session name.

### 5.4 ⚠️ The live swap works on the page and its only sender names a different field

READ `demo/mirror/index.html:1378`: `if (msg.type === 'dev.shader' && typeof
msg.body === 'string')`. READ `rig/scene/say.mjs:29`:
`msg = { type: 'dev.shader', sky: readFileSync(...) }`. READ
`demo/blocks/index.html:628`: `blocks` reads `m.sky`.

So `node rig/scene/say.mjs --shader file.glsl` drives `blocks` and **cannot
drive `mirror`**: same message type, different field name, and nothing fails
loudly. `say.mjs` also defaults to room `scene-demo` while `mirror` defaults to
`studio-1`. Anything in this plan that claims "handed a new shader over the
relay without reloading" is claiming a path whose only CLI does not currently
reach it. One line in `say.mjs` sending both fields, or one line in `mirror`
accepting `sky`, and it is closed.

---

## 6 · What it costs

### 6.1 The baselines, all READ from repo measurements rather than guessed

| machine | shader | result | source |
|---|---|---|---|
| Raspberry Pi 4, V3D 4.2.14.0 | kaleido fold, 3 octaves of noise, warp, feedback, 1 pass, 1280x720 | **18.31 ms, 54.6 fps, 50.3 Mpix/s** | `plans/plan-visuals.md §3.4`, measured there |
| same | same at 640x480 | 6.28 ms, 159.2 fps, **48.9 Mpix/s** | same |
| same | flat fill, 720p | 2.01 ms, **458.6 Mpix/s** | same |
| same | plus three 3x3 blur passes, 720p | 35.47 ms total, so a marginal full-res pass is **~5.7 ms** | same |
| laptop, ANGLE Metal, M2 Pro | the same shader, 720p | **0.66 ms, 1392.1 Mpix/s** | `plans/plan-visuals.md §5.1`, measured there |
| SwiftShader, CPU | the same shader, 720p | 5.40 ms, 170.7 Mpix/s | same |
| Quest 3 | `blocks`, 3360x1760, two views | **89.8 fps** | CLAUDE.md, measured there |

🔴 **The Pi number is the one to design against, and the reason is in it: it is
ALU-bound, not fill-bound.** 50 Mpix/s for the generative shader at both 720p
and 480p, against 400 to 460 for a flat fill. **The lever is shader complexity,
not resolution**, which inverts the usual instinct.

### 6.2 The budget for this picture

The picture sits where `grain-scope` sits: full page width, `height: 140` CSS,
dpr capped at 2 (READ `grain-scope.mjs:129,131`). INFERRED at a 720 CSS px wide
page: **720 x 140 at dpr 2 = 0.4032 Mpix**.

| machine | at its measured Mpix/s | per frame | share of a 16.7 ms frame |
|---|---|---|---|
| M2 Pro | 1392.1 | **0.29 ms** | 1.7% |
| SwiftShader | 170.7 | 2.36 ms | 14% |
| Pi 4 V3D | 50.3 | **8.02 ms** | 48% |

INFERRED throughout, from the measured rates above and this pixel count, and it
assumes a shader of comparable weight. ⚠️ **A phone is not in that table and
nothing in this repo has measured one.** `plans/plan-visuals.md §5.6` names it as an
open question in those words, and a three-second bench cannot see thermal
throttling on any device.

**The budget ceiling is a constant the page owns and prints**, per CLAUDE.md,
and the assert in §7 reads the same constant rather than a number typed twice.
Proposed: `FRAME_BUDGET_MS = 8`, which is half a 60 Hz frame and is what a Pi
would just clear.

### 6.3 🔴 THE REAL RISK IS NOT THE GPU, IT IS THE MAIN THREAD OF THIS PARTICULAR PAGE

`/radio/` already runs, on one thread:

- **wasm scsynth**, booted in the tab (READ `demo/radio/index.html:3249`);
- a **`ScriptProcessor(4096, 2, 2)`**, READ `:1140`, with its own comment
  admitting "it is deprecated and it runs on the main thread". INFERRED at
  48 kHz that is a callback **every 85.3 ms** which must return before the next
  block or the loop recording gets a seam;
- `meterTick` at frame rate: two time-domain reads, one 1024-bin frequency read
  and a 1024-iteration loop (READ `:1503-1560`);
- the modulator at 25 Hz (READ `:3042`);
- `grain-scope`'s own `requestAnimationFrame` full-canvas repaint (READ
  `grain-scope.mjs:695`).

A WebGL pass adds GPU work, but it also adds command submission, a 1 KB upload
and a second canvas to composite, all on that thread. **Nobody has measured the
headroom.** §8 makes measuring it step zero rather than discovering it as a
crackle in somebody's loop recording.

### 6.4 The instrument, and its own honesty

READ `demo/shell/xr-panel.mjs:856-859`: `EXT_disjoint_timer_query_webgl2`, with
the extension's name reported when it is absent because *"a zero here would read
as free"*. READ `plans/plan-visuals.md §2.6`: it is raw nanoseconds and effectively
Chromium only, **64.22% overall, Firefox 0.07%, Safari 0.11%**. On Safari and
Firefox there is no way to measure GPU time from a page and the readout must say
so in words.

⚠️ **And a single reading is not a number.** READ
`demo/shell/xr-panel.mjs:585-596`: the same preview run four times on one laptop
with no code between answered **0.24x, 0.72x, 0.73x and 0.82x** for the same
ratio, so `verdictOnCost` refuses to draw a conclusion when its own samples
disagree by more than 2.5x. Any cost number here takes the median of at least
eight and reports the spread, or says it cannot be measured.

---

## 7 · How it would be graded

`gl: true` in the manifest row, so it runs under `demo/verify-gl.mjs` and not
under `demo/verify.mjs`, which launches Chrome with `--disable-gpu` where
`getContext('webgl2')` returns null (READ `demo/verify-gl.mjs:8-12`). Count the
asserts and diff the count after any change. For scale: MEASURED by grep this
session, `mirror` has **30** `d.assert` call sites and `radio` has **32**.

Each row says what it **cannot** detect, because that is where this project
keeps getting hurt.

| # | assert | cannot detect |
|---|---|---|
| 1 | a real WebGL2 context and the renderer named, refusing SwiftShader | anything about a phone, a Quest or the Pi. A laptop's card says nothing about an Adreno |
| 2 | the body compiled and linked, and **`gl.getError()` is 0 after the first frame** | that the picture is right. CLAUDE.md: a Quest reported 1282 on its first frame and drew correctly anyway |
| 3 | N frames drawn, proved finished by a one-pixel `readPixels` rather than submitted | a frame the compositor dropped. That is on the far side and a page cannot see it |
| 4 | not a flat field: **per-channel** spread over the **whole** frame | that the picture is of the sound rather than of `uT`. ⚠️ Per channel because three cosines 120 degrees apart sum to a constant; whole frame because four points on an eight-fold symmetric image measure the symmetry. `mirror` failed this assert twice, both ways (READ `demo/mirror/index.html:1573-1614`) |
| 5 | 🔴 **the separating pair.** Hold `uT` and hold the data: two frames must be **byte identical**. Hold `uT` and change **one texel**: the frames must differ | which texel drives what. Assert 4 alone passes on a body that never reads `uData`, and that is the failure this pair exists for |
| 6 | 🔴 **the positional assert.** Push **two** synthetic grains into known, distinct buckets with everything else zero. Read back and assert the two brightest columns are at the expected x within tolerance, **in the right order and the right distance apart** | whether *live* grains are decoded from the right OSC field, because these are synthetic. One grain proves a deposit; two prove the axis. This is `radio`'s own `/pgrain` bug written as a check: a count could not tell you where a grain read, and a green suite hid it |
| 7 | the live histogram is non-degenerate and lies **inside the lit range the page also draws** | a constant offset shared by the picture and the range, since both come from `winPos` |
| 8 | 🔴 **the drop counter fires.** Flood one bucket past 255 in one frame on purpose and assert row 1's A channel is non-zero; assert it is zero in ordinary play | a drop upstream, in the board's OSC batcher or in `onReply`. That is a different boundary and needs its own counter |
| 9 | 🔴 **the stationary control.** With `modulator.hold(true)`, row 2's B channel goes to zero for every destination and the **parameter part of the field stops moving while the grain marks keep arriving** | which of two moving destinations is which. `plan-board-modulation §4.2` states the general rule: every movement check needs a stationary control in the same reading |
| 10 | the near and far sides can disagree: stop the engine, keep the modulator ticking, the band must keep sliding and the marks must stop | nothing about audibility. The engine can be running and silent |
| 11 | sharpness follows flatness: sweep row 3 x=3 from its p10 anchor to its p90 anchor with everything else held, and assert a stated minimum change, **per channel** | whether it is legible to a person. That is not measurable and the page must not pretend |
| 12 | the layout version in the texture equals the one the page compiled against | a layout that changed meaning without changing version |
| 13 | the board compiles the same body: `v3dpipe` prints `SHADER-OK`, or prints `SHADER-REFUSED` with the driver's own log | that it looks the same. **It will not.** The same body with identical fixed inputs summed 48,147,330 of red on ANGLE Metal and 68,001,881 on SwiftShader, 41% apart, READ `plans/plan-visuals.md §5.1`. Structure is portable, pixels are not |

⚠️ **What none of the thirteen can detect**, stated once: whether the picture is
worth looking at. `mirror` says the same thing about its own frame rate. The
readout says "8.02 ms on the card, n=8, spread 1.3x", never "it looks good".

⚠️ **And every assert must sit where the harness can reach it.** READ
`demo/mirror/index.html:188-192`: a control moved out of `.pos-controls` for one
revision took the assert count from 9 to 7 while the page read green.

---

## 8 · What to build first, and what to refuse

### Step 0 · Two measurements, and no shader

**0a. Re-derive the anchors.** Every number in rows 0 and 3 of §4.2 is quoted
from a document whose provenance is unknown and whose scripts are gone
(`plans/plan-plate.md §0`). A page that hard-codes `-40.0 .. -14.5 LUFS` and
`1374 .. 3821 Hz` is quoting a measurement nobody can re-take, and §7's assert 11
would be grading the page against a number the page itself supplied. **The first
commit is a script, not a shader.** `plans/plan-plate.md` reaches the same conclusion
independently, which is a reason to do it once and share it.

**0b. Measure the main thread of `/radio/` as it stands.** §6.3. The
`ScriptProcessor` block time and the frame budget with the scope running. This is
the number that decides whether the picture goes on that page or on its own, and
that decision should not be made by feel.

### Step 1 · `uData` on the machinery that already exists

Add `uniform sampler2D uData;` to `mirror`'s shared `HEAD` (READ
`demo/mirror/index.html:793`), upload a texture the page fills with a known test
pattern, and add one `LOOK` that reads it. **No audio, no new page, no board.**
The five knobs are untouched so they keep meaning what they say.

What this buys, and it is the whole of the idea: **asserts 5 and 6 from §7 run
here**, with synthetic data, on a page that already has a GPU harness. If the
determinism pair and the positional pair cannot be made to pass on a test
pattern, nothing built on top of them is trustworthy.

### Step 2 · The extractor, lifted rather than written again

🔴 `research/vr-sound-visual-2026-09.md §6` leaves this open in exactly the terms
CLAUDE.md demands: *"add `demo/shell/features.mjs` as a kit component, or lift
what `radio` already has? Both are defensible; building a third copy inside a
new page is not."*

**Recommendation: lift it.** `meterTick` is already written, already tuned, and
already carries the two guards a second author would miss: the
`Number.isFinite(freqBuf[i])` check because an empty bin reports `-Infinity` and
one NaN poisons every follower at once (READ `demo/radio/index.html:1539`),
and positive-only flux because a decay is not an event (READ `:1543`). Rewriting
that is how a second implementation of one measurement gets made.

In the same step, **the graph change from §2.3**: a master gain that both `dry`
and `eng.out` feed, with an analyser on it, so the page finally has a
measurement of what leaves rather than two measurements of the station.

### Step 3 · The picture

`demo/shell/grain-field.mjs`, a WebGL2 layer, **inside `grain-scope`'s own wrap
and sharing its box**, so the two axes cannot drift apart: they are the same
element's width. The 2D canvas keeps what it does well, the waveform, the loop
marks, the live edge and the playhead. The grain layer moves to the shader.

⚠️ **The fallback is the picture that exists today.** No WebGL2 context means the
2D ticks stay and `showing()` says which is drawn, which is the mechanism
`grain-scope` already has for exactly this (READ `grain-scope.mjs:360`).

### What to refuse, and why, with the citation

- 🔴 **Sending the data to the board, in v1.** The board has no audio of this
  station and no data path (§5.2). A board pane fed zeros must draw a defined
  still picture and say "no sound here" in its bar, or it reproduces `mirror`'s
  own recorded failure: two panes that do not match "read as a bug"
  (READ `demo/mirror/index.html:842-848`). Portability in v1 is proved by
  compiling, not by running.
- 🔴 **Bloom, at any resolution, ever on a Quest 3S.** `UnrealBloomPass` is 12
  full-screen passes, read from source, and at 3360x1760 that is **51 GB/s
  against a 3S's entire 42 GB/s** (READ `research/vr-sound-visual-2026-09.md §5`).
- 🔴 **Beat detection, onset rings, anything per-onset.** MEASURED in research
  §1.2: a flux detector scoring **r=0.992 on a 120 BPM control** scores **0.169**
  on this station against **0.031** on pink noise, and an adaptive onset picker
  fires **118 times a minute with no periodicity behind it**. In that document's
  own words, an onset detector on this material "does not fail loudly; it fails
  by always answering".
- 🔴 **Any AGC or auto-normaliser.** Research §2.2 and §3.5, and CLAUDE.md's rule
  about a zero reading as a confident measurement of nothing.
- 🔴 **Sub-bass as the primary gesture.** MEASURED, research §1.4: 20 to 60 Hz is
  **1.8% of total energy** and has the **narrowest** dynamic range of any band at
  17.4 dB. The instinctive mapping binds the biggest gesture to the flattest
  signal in the piece.
- **Compute shaders and WebGPU.** `plans/plan-visuals.md §2.5`: WebGL2 is the renderer,
  WebGPU is a second backend behind a runtime adapter check, worth building when
  something needs scatter writes. §3.2 turns this one's scatter into a gather, so
  it does not. And the Pi has GLES compute and no WebGPU at all, so a compute
  path would not be the same code on both machines, which is the entire claim.
- **A generated shader from a model.** `plans/plan-visuals.md §1.2` seam 3 is
  explicitly undecided and the validator does not exist. Until it does the answer
  is no.
- **A second time axis on `/radio/`.** CLAUDE.md: one position surface per
  page, because two horizontal time axes at different scales stacked is a
  contradiction. The proposal shares the scope's axis rather than adding one.
- **Hue, by default.** §1.4. Reverted twice, on instruction.

---

## 9 · What would have to be true

Each is checkable and each names who checks it.

1. **The anchors can be re-derived.** Step 0a. Until they are, §4.2's rows 0 and
   3 are quoting a document nobody can reproduce.
2. **`/radio/`'s main thread has room for a second canvas.** Step 0b.
   Unmeasured.
3. **The determinism pair passes.** §7 assert 5. If a body cannot be made to draw
   byte-identical frames from identical inputs on one machine, the whole
   "picture as a document" argument collapses and nothing below it is gradeable.
   ⚠️ On one machine only: the cross-backend hash is 41% apart, measured.
4. **The positional pair passes with two grains, not one.** §7 assert 6.
5. **The drop counter has fired in this run.** §7 assert 8. A counter that has
   never counted anything is a claim.
6. **The parameter row and the grain row can be made to disagree on purpose.**
   §7 asserts 9 and 10. This is the near-side and far-side separation and it is
   the one thing a pretty picture will hide.
7. **The board's `drain_stdin` survives a data line every frame.** §5.2 note 2.
   41,040 read syscalls a second is INFERRED, not measured, and it is the number
   that decides whether the C needs a buffered read.
8. **`uData` is uploaded into the session's context as well as the page's.**
   §5.3. Two contexts, and the failure is a black field with no error.
9. **`say.mjs` and `mirror` agree on a field name.** §5.4. Today they do not, and
   the live-swap claim depends on it.
10. **Nobody writes `--enable-unsafe-swiftshader` into a harness to make this
    green.** It produces a number 3.4x faster than the real Pi GPU and 8.2x
    slower than the real laptop one, about a machine that does not exist.
11. **The picture survives being looked at by the person who called the last two
    "mambo jumbo" and "slop".** There is no assert for this and there should not
    be one. It is why step 3 is a layer inside an existing picture rather than a
    new page: the smallest thing that can be shown and refused.

---

## 10 · Open questions

**10.1 Where does it live, and it is a real fork.** A layer inside
`grain-scope`'s wrap shares the axis by construction and cannot become a second
position surface, but it also cannot be the `mirror`-style side-by-side page that
would prove portability by running. A standalone slug gets the board pane and the
comparison, and pays for it with a second picture of the same facts. **Step 0b's
number decides half of it and the other half is editorial.** My recommendation is
the layer first, and a standalone page only if the layer is looked at and wanted.

**10.2 Does `grain-scope` keep `dur` and `voice`, or does the layer own them?**
Both fields arrive at `mark()` and are dropped today (§0). If the 2D fallback
should also draw them, that is a change to a shared component used by `/grains/`
as well, and the two pages would then disagree about what a tick means unless
both change. Not decided here.

**10.3 Is 64 buckets the right width?** 125 ms per bucket at an 8 s buffer. A
grain of 2 ms and a grain of 120 ms land in the same bucket, so the deposit
smears at the short end of a lane whose short end is the interesting one. 128
buckets is 62.5 ms and 2048 bytes. Nobody has looked at either.

**10.4 What does the field do when the fader is all radio?** The grain layer
already has the answer for ticks: `grainAlpha` scales them by the share of what
you are hearing that is granulator, and at zero they are **skipped outright
rather than drawn at alpha zero**, because a loop that runs and paints nothing
invites a report (READ `grain-scope.mjs:578-584`). The shader layer needs the
same rule and the same reasoning, and "skipped" in a feedback shader means the
decay must still run or the field freezes instead of fading.

**10.5 Nothing here has measured a phone or a headset.** `plans/plan-visuals.md §5.6`
already carries "what does a phone actually do?" as an open question, and
`research/vr-sound-visual-2026-09.md §3.6` carries a second one that gates the
XR half entirely: **does an `<audio>` element playing a live stream keep playing
when the page enters an immersive session on the Quest Browser?** Unconfirmed,
five minutes with a headset, and the answer changes the architecture if it is no.
