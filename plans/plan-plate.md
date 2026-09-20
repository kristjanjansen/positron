# plan-plate — the live station standing still, on a floor you can stand on

> ⚠️ **NOTHING IN THIS FILE IS BUILT.** No page, module, manifest row or assert
> exists. Every number tagged **R§** below is quoted from
> `research/vr-sound-visual-2026-09.md` and **has not been reproduced here** —
> §1 says what to do about that before any of them reaches a page.

Companions: `research/vr-sound-visual-2026-09.md` (the material, measured),
`plans/plan-visuals.md` §4 (which side of the wire a picture is made on),
`plans/plan-xr.md` (the headset, and five defects it found),
`demo/floor/index.html` (an infinite instanced WebXR floor that already exists),
`demo/radio/index.html` (the station, its relay, and the only feature
extractor in this repo).

---

## 0 · The short answer

**Build `/plate/`: a new demo, in three graded steps, on a research document
whose numbers are re-derived first.**

1. 🔴 **Re-derive the anchors before writing a page.** The research is strong
   and **its provenance is unknown** — three sessions declined to author it, and
   `df826fb` committed it saying so. Its analysis scripts were in a scratchpad
   and are gone. That is not a reason to distrust the conclusions; it is a
   reason that **the first commit here is a script, not a shader**. Everything
   else waits on it.
2. **The mapping is a plate, not a spectrum bar and not a noise field** — a sum
   of standing modes whose amplitudes are band energies, so a drone is a still
   pattern and a change is a morph. Geometry carries the slow swell, colour
   carries the fast one. (R§0, R§4A.)
3. 🔴 **The comfort claim is the page's product, so it is the thing that gets
   asserted.** The page moves at a measured 0.025 Hz while ISO 2631-1 weights
   0.1–0.5 Hz hardest, and *three ordinary edits move it into that band* (R§2.2).
   A comment saying so is worth nothing. §6 is a check that DFTs the floor's own
   displacement and grades the share of its power in the sickness band, with a
   sabotaged variant that must go red.
4. **Passthrough first, not a virtual floor in a void.** MEASURED in this repo:
   `immersive-ar` holds **90.0 fps** against VR's 89.8 — it costs nothing. And it
   does something no `smoothstep` can: **the real room is a real rest frame**,
   which is the best-evidenced mitigation there is (R§2.3).
5. **The suite must not need the station.** A known tone through the same graph
   grades the mapping; the live stream is the demonstration, never the fixture.

**One decision belongs to the session and not to this file — §4.**

---

## 1 · The document this rests on, and the first commit

`research/vr-sound-visual-2026-09.md` makes four claims that decide the whole
design (R§0): the envelope lives at **0.025 Hz** with **78.1%** of its
modulation power under 0.1 Hz; sub-bass is **1.8%** of the energy and the
flattest band there is; brightness moves **120 Hz per 46 ms frame at p50**; and
dynamic range is **22.9 LU**. The mapping table in R§3.4 hard-codes eight
percentiles off that analysis.

Three facts about those numbers, and they compound:

- They come from **one 98.5 s capture at one time of day**, which the document
  says twice (R§1.1, R§7).
- The scripts that produced them **are not in the repo** (R§8).
- **Nobody will say who wrote them.** `HANDOFF.md` has carried
  *"still untracked and still unattributed"* for three sessions.

⚠️ Hard-coding a percentile from a document in that state is the repo's own
*"a number nobody re-measures reads as a fact"*, with an extra step: nobody can
be asked what the number meant. And the repair is cheap, because **a
measurement's provenance problem is solved by re-running it**, not by finding
its author.

**So the first commit is `demo/plate/lab/analyse.mjs`** — level envelope and its
modulation spectrum, octave bands, centroid/flatness/width, and the detrended
tempo estimator **with its click-track and pink-noise controls**, which is the
one piece R§8 says to keep because it is the only reason a "224.7 BPM" artefact
was ever caught. It runs over **an hour** of the station, not 98.5 s, and writes
`demo/plate/anchors.mjs`.

- ⚠️ `lab/` is a subdirectory, and `demoFiles()` in `workers/view/build.mjs`
  takes **files only, one level deep** — so the lab is not deployed, by the same
  containment wall that keeps enumeration away from `.env`. Checked, not assumed
  (`build.mjs:351`, `if (!e.isFile()) continue`).
- 🔴 **`anchors.mjs`, never `anchors.json`.** A `.json` would be copied and then
  `fetch`ed at a URL **nothing checks** — which is `/items/`'s
  `manifest.webmanifest` 404 exactly. A module is covered by `checkImports()`,
  which refuses the build when an import has no deployed file.
- ⚠️ **The anchors are written once and quoted from one place.** The page reads
  them, the readout prints them, and this plan's successor cites them by
  importing them into its prose rather than retyping — *a shared measurement in
  two files is a measurement that will disagree* (`--sld-col`).

If the re-run disagrees with R§1, **the document is annotated and the anchors
win**, because the anchors are the ones a script can produce again.

---

## 2 · What the page is

**Slug `plate`. Act 5, beside `radio` and `floor`.** Its subject is the
station, not the shader; a visitor arrives at it from the radio.

```js
  { name: 'plate', act: 5, created: '<the day>', built: true, gl: true, xr: true,
    one: 'the live station standing still — the sound settles into a pattern you can walk on',
    tags: ['WebXR', 'WebGL2', 'WebAudio', 'Icecast', 'live'],
    settleMs: 6000 },
```

`gl: true` and `xr: true` for the reason `mirror`, `scene` and `floor` carry
them, written in the manifest already: `verify.mjs` runs `--disable-gpu`, where
`getContext('webgl2')` is **null**, and a GPU page graded there reports a defect
belonging to the harness.

**The visitor paragraph — three sentences, no jargon, and it is in the plan
because if it cannot be written the page is wrong:**

> A radio station in Tallinn is playing live, and this floor is standing in it:
> each part of the sound holds the surface in a shape, the way sand settles into
> lines on a plate somebody is bowing. When the music holds still the floor
> holds still, and when it changes the pattern moves — slowly, because this
> music's loudness takes about forty seconds to swell. The colour follows how
> bright the sound is, which changes several times a second.

⚠️ Not "modal", not "eigenmode", not "spectral centroid", not "Chladni" — that
last one is a person's name and a name is not jargon (CLAUDE.md), but it names
nothing a visitor can use, so it lives in a comment.

**The readout — six cells, every one of them moves:**

| key | what it is | why it is not a constant |
|---|---|---|
| `loudness` | the station, in LUFS | R§1.3: p10 −40.0, p90 −14.5 |
| `brightness` | where the energy sits, in Hz | the fast axis, R§1.5 |
| `width` | how far apart left and right are | p10 0.034 → p90 0.464, R§1.6 |
| `sway` | **the share of the floor's own motion in 0.1–0.5 Hz** | §6; this is the page grading itself |
| `rise` | the fastest the surface is moving, mm/s | the velocity cap, R§2.3 |
| `steps` | sudden changes over 3 LU since you arrived | R§3.3; fires rarely by construction |

- **Six, not five or seven** — `mount()` throws on an odd count, and the
  editorial half of that rule is that an odd readout always has a weakest cell.
- 🔴 **`sway` prints an em dash until it has 60 s of history.** It is a
  statistic over a window and it does not exist before the window does; a `0`
  there is a very confident measurement of nothing.
- ⚠️ `sway` gets the one explanatory sentence `drift` gets on `transport`: it is
  how much of the floor's movement is in the band that makes people ill, and
  lower is better.

---

## 3 · Three places this could have gone instead

**Into `/floor/`.** Rejected. Its subject is the 1965 newsreel catalogue; a tile
is a picture, and bending a picture is a distortion no viewer can tell from a
decode fault. And `HANDOFF.md` says of that page: *"NOTHING IN THE HEADSET HALF
IS MACHINE-GRADED"* — adding an ungradeable feature to the least-graded page is
how the five-round "no playback" failure happened there.

**As a mode of `/radio/`.** Tempting: it owns the relay, the `audioSession`
claim, the iOS `interrupted` watcher and a deafness control, all of which this
page needs. Rejected on the rule that costs the most when it is broken — *a demo
that branches must assert every branch on every run*, and that page is at 36
asserts with a wasm scsynth already inside its 30 s settle. **What is worth
taking from it is its code, not its page**, which is §4.

**Straight into the kit as a renderer.** Rejected: `xr-room.mjs` draws
controllers inside a whole renderer and `floor` already declined to call into it
for exactly that reason. The plate has its own vertex work. It shares
`xr-ray.mjs`, `xr-controller.mjs` and `fullscreen.mjs`, which are already shared.

---

## 4 · 🔴 The one decision for the session — where the feature extractor lives

R§6 hands this over deliberately, and CLAUDE.md is explicit: *"If the thing you
need is not in the kit, stop and ask."*

**What exists today:** `demo/radio/index.html:1084` `meterTick()` computes
RMS, three fixed bands, a spectral centroid folded to a 0..1 `tone`, and a
positive-only flux, and feeds them to `pappus-mod.mjs`'s `sense()`. `shout` has
a smaller hand-rolled one. `demo/shell/` has a scope and **nothing that extracts
features**.

**The recommendation: `demo/shell/features.mjs`, and `radio` moves onto it
in the same change.** *A control that exists in one page and nowhere else is a
component that has not been noticed yet* — and the failure mode of doing half of
it is already written in this repo: `field.mjs`'s header says `wire` has still
not been moved onto it, *"so there are two implementations and this header is
the reason to finish the job."*

⚠️ **It is a superset, not a rename.** The research rejects three of
`radio`'s six numbers for this purpose: RMS instead of K-weighted loudness,
three bands instead of twenty-four, and an onset flux that R§1.2 measures firing
**194 times in 98.5 s with no periodicity behind it**. `features.mjs` adds
K-weighted momentary (400 ms) and short-term (3 s) loudness, 24 log-spaced bands
from 40 Hz to 12 kHz, flatness, side/mid width, and a `|ΔLU| > 3` event — and
keeps the old six, computed the same way.

🔴 **And the lift has to be provably sound-neutral, because `radio` is an
instrument.** Those six numbers modulate a granulator; a "tidy-up" that shifts
`tone` by 2% changes how the page sounds and nothing would report it. **The
migration's first assert feeds one fixed buffer through the old code and the new
and requires the six to agree**, before the old code is deleted.

**The alternative** — leave `radio` alone and write the extractor inside
`/plate/` — is defensible for exactly one reason: it cannot break a working
instrument. It is rejected because it makes the third copy, and because the kit
is the only place a component gets looked at.

⚠️ Two names are taken: `field.mjs` is a text input and `fixture.mjs` is a
timeline adapter. `features.mjs`.

---

## 5 · The mapping, concretely

Everything here is R§3 and R§4A unless marked. Three things the research leaves
open are decided:

**5.1 The modes are separable, so 24 of them cost 10 sines and not 48.**
`φ_mn(x,y) = sin(mπx/L)·sin(nπy/L)`. Taking the pairs from a **5×5 grid**
(25 modes) needs five sines in x and five in y per vertex, reused across every
pair — where 24 unrelated `(m,n)` need 48. The displacement is then a 25-term
dot product of a rank-1 outer product with the amplitude matrix.

**5.2 ⚠️ The band → mode mapping is ORDINAL, and the page must not claim
otherwise.** A membrane's modal frequencies go as `√(m²+n²)`, so a 5×5 grid
spans **1.41 → 7.07**, a factor of 5. The bands span 40 Hz → 12 kHz, a factor of
**300**. Nothing maps a 300:1 range onto a 5:1 one — so band *i* drives the
*i*-th mode **in frequency order** and the picture is a readout of the
spectrum's SHAPE, not of its pitch. Two more honesties fall out: `(1,2)` and
`(2,1)` are **degenerate** (identical frequency, orthogonal shapes), so the
order within a degenerate pair is a choice; and R§1.4 says nothing above 16 kHz
survives a 128 kbit/s encoder, so **the top band stops at 12 kHz** — never drive
a visible channel from a band the codec discards.

**5.3 🔴 The low modes ARE the piston, and the fix is one scalar.** R§2.3's
first rule is that whole-field in-phase heave is the motion to avoid. Mode
`(1,1)` is a single hump rising and falling — it *is* pistonic heave with a
pattern's name on it. The mean of `sin(mπx/L)` over the plate is `2/(mπ)` for
odd *m* and **exactly 0** for even *m*, so the field's mean is a closed form:

```
  mean = Σ  a_mn · (2/(mπ)) · (2/(nπ))        over odd m, n only
```

`(1,1)` alone carries `(2/π)² = 0.405` of its own amplitude as DC. **Subtract
that mean every frame.** Dropping the odd-odd modes instead would throw away
nine of twenty-five shapes; subtracting keeps every shape and removes only the
piston, and it is one scalar from numbers already in hand.
⚠️ The price, said out loud: the plate no longer pins to zero at its rim. On a
floor that repeats there is no rim in view, and if a rim ever becomes visible
this is the line to revisit.

**5.4 Smoothing is in seconds, and that is not a preference.**
`smoothingTimeConstant = 0`, then `a = exp(-dt/τ)` against a real τ. The
analyser's own smoothing is applied **per call**, so a page smooths differently
at 60, 72, 90 and 120 fps — a time constant that silently depends on frame rate.
⚠️ `radio:747` already sets it to 0 for its own independent reason (a flux
follower measuring the blend rather than the programme). Two arrivals at one
rule; `features.mjs` states it once.

**5.5 Geometry slow, light fast.** Displacement from momentary loudness in LU
against fixed anchors; hue from centroid; nodal sharpness from flatness; lateral
spread from side/mid width. The `|ΔLU| > 3` event goes to an expanding ring and
a brightening, **never to a step in height** (R§2.2, R§3.3).

---

## 6 · 🔴 Making the comfort claim gradeable

This is the part that decides whether the page is worth building, because
everything above is reasoning and this repo's most expensive recurring failure
is a green suite over an unreachable claim.

**The claim:** the floor's own motion stays out of 0.1–0.5 Hz.
**The instrument:** DFT the floor's displacement and look.

**6.1 It cannot be a live assert, and the reason is in CLAUDE.md.**
`verify.mjs` stops collecting **400 ms after the last assert**, so a 60-second
measurement either never reports or silently loses everything behind its pause.
So the field is a **pure step**, the way `floor`'s state machine already is:

```js
  plate.step(dt, features) -> { modes, meanY, sampleY, maxVel }
```

No GL, no audio, no `requestAnimationFrame`. The harness drives it at a fixed
1/60 for 300 simulated seconds in a few milliseconds, which is also the only way
to grade a 40-second gesture at all. ⚠️ This is `floor`'s lesson reused
verbatim: `step()` takes `dt` as an argument *precisely so the state machine can
be driven with no browser in the loop*, because `Runtime.evaluate` times out the
moment it awaits a frame in a backgrounded tab.

**6.2 The input is a recorded envelope, checked in with its provenance.** The
985-value momentary-loudness series from the §1 re-run, as a module beside the
anchors. Real material, no station, no network, byte-identical every run.

**6.3 The assert is a RATIO, not a threshold.** The input's own share in
0.1–0.5 Hz is **16.7%** (R§1.3). The honest question is not "is the output
quiet in that band" — it is **"did this mapping put MORE energy there than the
music had"**. A threshold could be satisfied by a page that flattens everything;
a ratio grades the mapping. Three asserts:

| assert | why this quantity |
|---|---|
| output share in 0.1–0.5 Hz ≤ input share | measures the mapping, not the music |
| `|meanY|` < ε for **random** amplitude vectors | §5.3, a property, not a sample |
| `max |dY/dt|` under the cap, over the whole run | amplitude limits alone let a small displacement arrive violently |
| displacement within 1.5 m of the head ≈ 0, full past 3 m | the rest frame, R§2.3 |

**6.4 🔴 And it is proved by breaking it.** R§2.2 names the three edits that
would ruin this — a short-time-constant AGC, a synthetic 0.2 Hz pulse, a fast
attack — so the harness runs the same 300 seconds **with each of them switched
on**, and requires the first assert to **FAIL** all three times. A comfort check
that cannot go red on an AGC is decoration. This is `verify-quest.mjs`'s
`--self-test` in a new costume, for the same reason: *sabotage it and it goes
3/3 → 0/3, which is how you know it is not decoration.*

**6.5 Ask the picture the right question.** The GPU half is graded by
`verify-gl.mjs`, and a plate pattern is **symmetric about both axes by
construction** — so sampling mirrored points measures the symmetry of the thing
being checked, which is `mirror`'s kaleidoscope failure exactly. Grade the
**modal amplitude vector on the CPU** (where the claim actually lives) and let
the GPU asserts be structural and **per channel**: it drew, it moved, its red
channel spans a real range.

**6.6 The one assert that proves the mapping is the one it says it is.** Feed
the tone source (§7) a 1 kHz sine: the bands near 1 kHz must rise, the modes
they drive must rise, **and the others must not**. "The floor is not flat"
passes for any mapping, including a scrambled one.

---

## 7 · The suite must not need the station

`radio` measures the station live and carries three-state availability for
it because a stream is a thing that goes away. This repo already knows what that
costs a harness: *a demo that needs something off this machine goes red when a
leftover Chrome is holding relay sockets*, and *run the failing demos ALONE
before believing the suite*.

So `/plate/` takes **`?src=tone`**, which puts a known signal through the **same**
graph — the same analyser, the same bands, the same step. It is three things at
once, which is why it is cheap:

1. the fixture for §6.6's mapping assert,
2. the **deafness control**, which `radio` had to invent under `?report=1`
   after an iPhone read `rms=0.0000` on a page that was playing — *"six arms of
   zero is the shape of a deaf instrument"*,
3. what the page falls back to when the station is down, so it shows something
   honest instead of a flat floor that reads as a broken shader.

⚠️ And it is guarded the way `proveAnalyser` had to be: **the invariant lives on
the function, not on its caller.** That test tone was once armed inside a
per-frame tick, sixty oscillators a second summing to 0.80, and the page drew
the test tone while reporting it as the radio.

---

## 8 · In the headset

**8.1 Passthrough first.** MEASURED here: `immersive-ar` reports
`environmentBlendMode: alpha-blend` and holds **90.0 fps** against VR's 89.8, at
**3360×1760** in two views. It costs nothing measurable, and it buys the one
thing the comfort argument most wants: **a real, stationary ground reference**.
R§2.3 spends a `smoothstep` to build a rest frame; passthrough is handed one.
⚠️ Which makes the rest-frame ramp *more* important, not less — a pattern drawn
over the floor you are standing on hides the very reference that is helping, so
the ramp keeps the patch under your feet clear.

**8.2 Four things that have already cost headset runs, and are not re-learned:**

- `alpha: false` makes passthrough impossible — nothing to composite through,
  so the room is replaced by black. Assert on `environmentBlendMode`, **never**
  on the session name.
- `session.renderState.baseLayer` is **null until the next animation frame**;
  reading it a line after creating the session throws, and the throw takes the
  render loop, the exit button and the bail-out timer with it. Read it inside
  `requestAnimationFrame`.
- `gl.clear` ignores the viewport: only the first eye clears, the rest clear
  depth inside a `gl.scissor`.
- Instrument the entry path with `navigator.sendBeacon`, not the batched
  shipper, which holds for 2 s — and the uncaught-error handler too.

**8.3 The way out is the page's.** Any controller button ends the session, plus
a dead-man's switch after 4 s with nothing drawn.

**8.4 🔴 The gate that comes before all of it (R§3.6).** Does an `<audio>`
element playing a live stream keep producing samples when the page enters an
immersive session on the Quest Browser? **UNCONFIRMED**, and there is a Meta
community report of audio going distorted on entry. It is five minutes with a
headset and it changes the architecture if the answer is no.

⚠️ **Ask it on the far side.** `ctx.state === 'running'` is the near side of the
boundary and would answer "fine" for a graph producing silence — that is
`createMidiLane`'s `scheduled()` counting what the page queued while every note
was fifty-six years out. The gate is **non-zero RMS off the analyser, for N
frames, inside the session**, shipped by beacon. And per CLAUDE.md, `play()` and
`resume()` are fired and not awaited: neither rejects, so awaiting either in the
session-entry path is a hang rather than an error.

---

## 9 · Phases, each with the thing that grades it

| # | what lands | graded by | done when |
|---|---|---|---|
| **0** | `lab/analyse.mjs` over an hour of the station; `anchors.mjs` | its own click-track and pink-noise controls | the anchors exist and R§1 is annotated where it disagrees |
| **0b** | the headset audio gate (§8.4) | `verify-quest.mjs`, one page, beacon | a non-zero RMS from inside a session, or a changed architecture |
| **1** | `features.mjs` in the kit; `radio` moved onto it | `verify.mjs`; the six-number equality assert first | `radio` still 36/36 **and** provably unchanged in sound |
| **2** | `/plate/` on the desktop: the plate, the tone source, the readout | `verify-gl.mjs` + the offline `step()` checks of §6 | the three sabotage runs go red |
| **3** | XR, passthrough first | `verify-quest.mjs` | `environmentBlendMode: alpha-blend` asserted, exit proved |
| **4** | *optional* — the wave layer for `|ΔLU| > 3` events | as phase 2 | ripples decay without scripting |

⚠️ **Diff the per-demo assert counts after every phase.** Adding a mode to
`grid` once took it from 11 asserts to 10 while still reading green.

---

## 10 · What is deliberately not here

- **The Pi renderer path.** `plans/plan-visuals.md` §5.5 owns that question; this page
  renders where the sound is, per §4.2 — *analysis is the right signal for
  anything that must look like the sound, computed in the browser, because that
  is the only place the picture and the sound are on one clock.*
- **Bloom.** ESTIMATED from repo numbers, one full-resolution RGBA8 read+write
  at 3360×1760 is 4.26 GB/s per pass at 90 fps; `UnrealBloomPass`'s twelve
  passes are **51 GB/s**, which exceeds a Quest 3S's entire 42 GB/s.
- **three.js.** `LAYOUT.md` prices it: not a loader, a whole renderer, and
  adopting it discards the per-eye loop and four measured GL defects held in
  comments.
- **A spectrogram waterfall.** It scrolls, which is continuous optic flow under
  a standing viewer — the exact thing §6 exists to keep out. Good on a wall.
- **Onset-driven rings.** R§1.2 measured an onset picker firing **118×/minute
  with no periodicity**: a steady drizzle that looks like it is working and is
  picking texture. An onset detector on this material does not fail loudly, it
  fails by always answering.

---

## 11 · What would have to be true

- The re-run over an hour broadly confirms R§1. If the station is a different
  animal at 03:00, the anchors become time-of-day dependent and §6.3's ratio
  still holds while §5's mapping needs a second look.
- Audio survives immersive entry on the Quest Browser (§8.4). **UNCONFIRMED.**
- A standing viewer tolerates this for ten minutes. Reasoned from ISO 2631-1,
  **not measured on this content, by anyone.** §6 grades the *signal*; it cannot
  grade a person. Somebody has to wear it.
- `OCULUS_multiview` composes with a displaced mesh. Nothing here has used it,
  and its benefit is CPU-side only.
- The kit answer in §4 is settled before phase 1 starts, not during it.
