# plan-twins — make the two granulators the same instrument

Written 2026-09-13, from a session note after `grains` put them side by side:
*"make them similar. Simplify the board granulator a lot, but document what's
existing there currently, so we can return to it later. Sync the shape of the
instrument and the pipeline as much as possible."*

✅ **§2, §3, §4a, §4b step 1 and §5 are DONE (2026-09-13).** The two ends now
chew one description, `where` means one thing, and the board's own engine
answers for what it holds. What each section did, and what it got wrong, is
written into the section itself rather than collected here.

🔴 **§4b step 3 IS DONE TOO — 2026-09-14 — AND THE DOCUMENT'S OWN TITLE IS NOW
LITERAL.** `/grains/` runs **real SuperCollider at both ends, loading the same
compiled `pappus.scsyndef`**: wasm scsynth in the tab, the board's own sound
server on the Pi, TINY at both. The page is 17/17 with the board live, and the
three claims that had never been made before are made by the engines rather
than by the page:

| | measured, 2026-09-14 |
|---|---|
| the left pane really is SuperCollider | **64,733 B** of compiled SynthDef taken in **23 ms**, `/n_go`, **1,571 building blocks running** (1,467 Pappus + 104 `PosSource`) |
| the material is built before it is read | `/g_queryTree.reply 0 0 2 3001 -1 posSource 3000 -1 pappus` — the SERVER's own answer, not the page's |
| a grain a second means one thing | **2.2 a second in the tab and 2.2 on the board, against 2.2 asked for** — both graded against the slider, never against each other |
| both ends stop when told | tab **0.005569 → 0.000000** at `amp 0`; board **0.0964 → 0.0002** with the material turned down |
| one description, two engines | 72 sine partials at each end, this page's scsynth answering **6 notes at 131 Hz** and the board's the same |

⚠️ **AND THE BOARD IS ON TINY AGAIN, KNOWINGLY** — `PAPPUS_TINY=1` in
`/etc/default/positron-board`, proved from the board's own `Engine_Pappus: TINY
graph` line. The price is the modal bank: at `pwet 1` TINY reads **exactly
0.000000** where LITE reads 0.030–0.041. Recorded in `rig/board/norns/TINY.md`
and `CHAIN.md` so it is a decision rather than a drift.

⚠️ **§6's two-pane comparison is STILL NOT DONE.** What changed is that the
reason it was hard has halved: the engines are the same now, so a disagreement
is no longer confounded by "two different programs". The remaining obstacles are
the ones §6a names and they are untouched — the two ends are at different
LEVELS, and a granulator chewing a stationary drone returns that drone, so rms
cannot see a change of `rate`, `where` or `spray` at all.

🔴 **AND THE LARGEST SINGLE REASON THE TWO PANES SOUNDED NOTHING ALIKE IS NOT IN
THE TABLE BELOW, BECAUSE NOBODY KNEW IT.** `Engine_Pappus.sc:945`:

    sxf  = (msos.max(mlock) / 0.6).clip(0, 1)
    gsum = gsum * sin(sxf * pi/2)  +  [capl, capr] * cos(sxf * pi/2)

`capl`/`capr` is the **live input**. So at `msos 0` — the engine's default, and
what every page and every harness in this repo left it at — a Pappus granulator
outputs **its own input, verbatim**, and not one grain. MEASURED over the relay
on a held note, sweeping `mrate` 0.5 against 24 at each `sos`:

| `msos` | `mrate` 0.5 | `mrate` 24 | apart | dip at 0.5 |
|---|---|---|---|---|
| **0** | 0.030519 | 0.030519 | **the same to six digits** | 0.981 |
| 0.3 | 0.021687 | 0.028364 | 1.31x | 0.980 |
| **0.6** | 0.004981 | 0.041123 | **8.26x** | **0.000** |
| 1.0 | 0.007658 | 0.043263 | 5.65x | 0.000 |

(*dip* is the fifth-percentile envelope over its median — how deep the gaps
between grains go. 0.981 is a continuous drone; 0.000 is real silence between
grains.)

⚠️ **THIS CLOSES THE 2026-09-12 PUZZLE AND NOTHING WAS BROKEN.** `grains` carries
the note in its own source: *"no granulator parameter on this board could be
shown to change the returned audio — `mrate` 0.5 against 24, `pwet` 0 against 1,
`melen` 1 against 8, all identical — and the sharpest number in that whole
investigation was that the envelope NEVER dropped below a quarter of its own
median at any setting."* Every one of those sweeps was taken at `sos 0`, which is
the engine passing its input through; the envelope never dipped because there
were no grains in it. `0.981` above is that same measurement, reproduced.
`grains` now sends `sos 0.6` — the first value that is all grains, and the last
one before the buffer stops recording, which the engine's own comment explains.

---

## 1. The problem, which the side-by-side created

`grains` shows one granulator in the page and one on a Raspberry Pi, with the
same four settings going to both. They sound nothing like each other, and every
reason is structural rather than a bug:

| | the page | the board | now |
|---|---|---|---|
| **material** | six sawtooth oscillators, static | FluidSynth or Yoshimi playing a patch's chord | ✅ one spec, expanded by one function, built at each end (§4a) |
| **grains at all** | every grain is a grain | at `sos 0` the output is the INPUT, with no grains in it | ✅ the page sends `sos 0.6` |
| **`rate`** | grains per second, full stop | fed to GRAINSWARM across **eight voices**, each with `swarm` detuned duplicates — the same number could be 10–50x the density | ✅ MEASURED at 1x: `mrate` 8 reports 8.0 grains a second, 4 reports 4.0, 16 reports 16.0. One voice is gated by default, so no division is needed — and the page now asserts the ratio rather than assuming it |
| **after the grains** | a raised-cosine window and nothing | RESONATOR > DELAY > COLOUR > REVERB | BARE removes all four (§3); the board still runs TINY by default |
| **`where`** | always a distance behind the write head | `scanmode`: STRETCH / POSITION / DELAY SYNC / DELAY FREE, and the page never set it | ✅ POSITION at both ends (§5) |
| **out** | stereo, `pan 0.8` | mono, through a relay and a jitter buffer | still as it was |

⚠️ **AND ONE MORE THAT WAS NOT A GRANULATOR DIFFERENCE AT ALL.** With the insert
switched on, `pappusFx` disconnected and re-patched only the instrument's LEFT
port, while `startJackSynth` connects LEFT AND RIGHT to the capture (deliberately
— many ports into one input sum in JACK, and that mono-sum is what makes a
capture of a stereo instrument honest). So what a page heard was

    the granulator's left output  +  the instrument's right channel, DRY

and the granulator was being fed in mono-left. Read straight off `jack_lsp -c`:
`posbox:input_1` had two sources, `yoshimi:right` and `SuperCollider:out_1`.
Fixed in `pappusFx` — both channels each way, and the granulator's own right
output joins the capture too, because SPRAY, TILT and the delay taps all pan.
MEASURED before and after, holding a note with the instrument unplugged from the
granulator's input: **3.19x before** (0.008070 quiet against 0.025760 held),
**1.00x after** (0.008025 against 0.008009). `spaceFx` had always patched both.

A page that draws two panes side by side is making a claim that they are
comparable. Right now that claim is false, and the honest repair is to make it
true rather than to caption it away.

---

## 2. ⚠️ WRITE DOWN WHAT IS THERE BEFORE CUTTING ANY OF IT

**This is the first task and it is not optional.** Pappus's chain is 2,030
lines of somebody else's engine, and a rung that skips four stages is a rung
that makes those stages unreachable by anyone who did not already know them.

✅ **DONE 2026-09-13 — `rig/board/norns/CHAIN.md`.** Every stage, its controls,
what TINY has already taken out of it, and what removing it costs the sound.
Three things it turned up that change the plan below:

- **The chain can ALREADY be skipped at run time.** SIGNAL is a routing matrix
  — `oin1 1, pin1 0` sends a granulator straight to the output today, with no
  recompile. So BARE is not the only way to get a dry cloud; what it buys is
  that the UGens stop existing and stop costing CPU, which is a narrower claim
  than the one §3 was making.
- **RESONATOR is already a pass-through on the board**, because TINY removed
  both the 48-`Ringz` modal bank and the eight string voices. Half of what BARE
  was going to remove is gone on the machine we are comparing against.
- 🔴 **The meters would start lying.** Seven of them sit on a control bus, one
  per stage. A meter reading zero because a stage was compiled out looks
  exactly like a meter reading zero because a stage is broken.

The original requirement, kept because it is the rule rather than the task:

- **RESONATOR** — a Rings-style modal/string resonator. What MODAL and STRING
  are, what `structure`/`bright`/`damp`/`position` do, and the fact that TINY
  has already removed the 48-`Ringz` modal bank and the eight string voices.
- **DELAY** — a mono delay line with panned taps. TINY is at four taps of
  eight; say what the other four were and what they cost (2,894 B, ~28 UGens).
- **COLOUR** — drive, crush, loss, envelope-following noise, in that order,
  and what each one is for.
- **REVERB** — ⚠️ and it is NOT noisy, which was an open defect until
  2026-09-13. See §8.
- **The meters** — seven of them on a control bus, which is how SIGNAL draws
  the flow. If BARE skips stages, the meters must still mean something or the
  board's own status starts lying.

A stage with no entry in that file may not be skipped. That is the rule that
makes this reversible.

---

## 3. BARE — a fourth rung on a ladder the engine already has

FULL > LITE > TINY are compile-time rungs chosen by `prLiteMode` and
`PAPPUS_TINY`. BARE is the next one and it is not a new mechanism:

    PAPPUS_BARE=1     GRAINSWARM straight out. No resonator, no delay, no
                      colour, no reverb. One voice, swarm 0.

🔴 **COMPILE-TIME, NEVER A RUNTIME ZERO.** SuperCollider does not strip an
unconnected UGen: setting a gain to zero changes the sound and not one byte of
the def, and leaves every one of those UGens still costing CPU on a Pi 4. TINY
learned this the expensive way — the shimmer is ONE UGen and cost 236 bytes;
four delay taps are ~28 UGens and cost 2,894. Every cut must be an `if` around
the construction.

✅ **BUILT AND WEIGHED, 2026-09-13.** All four rungs on one machine in one
sitting: FULL 121,425 B / 2,812 UGens · LITE 74,733 / 1,722 · TINY 64,733 /
1,467 · **BARE 43,551 / 941**. A third of FULL, and two thirds of TINY gone —
more than the sound difference suggests, because RESONATOR's excitation chain,
BRIGHTNESS's filter, two dozen `Lag.kr` and two `Limiter`s were all still being
BUILT on TINY and run into a `DC.ar([0,0])`. The run also found that
`PAPPUS_LITE` had never worked in either direction, because `Array.includes`
compares by identity in sclang. `CHAIN.md` has the table and the recipe.

---

## 4. Decided, 2026-09-13

- **Mono, both ends.** The board sends one channel; the page engine sums to it
  rather than the board being widened. ⚠️ Declared, never inferred — a channel
  count cannot be read off a payload, and 960 int16s is a valid 20 ms mono
  frame AND a valid 10 ms stereo one.
- 🔴 ~~**Two granulators, both ends.**~~ **WRONG, AND IT WAS ALREADY WRONG WHEN
  IT WAS WRITTEN — CORRECTED 2026-09-13.** Pappus is a pair (`m` and `n`) on
  FULL. The board does not run FULL: `/etc/default/positron-board` sets
  `PAPPUS_TINY=1`, TINY implies LITE, and **LITE has one granulator** —
  `Engine_Pappus.sc:976`, `graw2 = if(lite) { DC.ar([0, 0]) }`. So "the board
  losing its" had already happened, on purpose, for the reason TINY exists.
  MEASURED: every `grain.marks` the board has ever sent carries `half: 0`, over
  six seconds of continuous reporting and every probe since.

  So the decision is the opposite one: **one granulator, both ends**, which is
  what the page already has. ⚠️ And the `n…` half of every command still exists
  and still lands somewhere harmless, deliberately (LITE's own precedent), so a
  page sending `nrate` gets no error and no sound — which is exactly how this
  went unnoticed. `grains` asserts *"the two halves are set differently"* against
  its own PATCHES table, so that assert is about the page and not about the
  board; it is true and it is not evidence of two granulators.
- **The same input, generated at both ends from one description.** Today the
  page granulates six sawtooth oscillators and the board granulates whatever
  instrument is running, and that difference dominates everything else in this
  document. A simple synthetic waveform with named parameters, made in both
  places, is what makes every other comparison mean something.

### 4a. The input generator, which is the first piece of work

**Generated SEPARATELY at each end from one set of parameters — not generated
once and shipped.** This was asked as a question, which means the document did
not say it, so it is said here first.

The rejected option is worth writing down because it sounds better than it is:
generate the sound once and send the AUDIO to both granulators. The two would
then chew identical samples by construction and nothing would need measuring.
But it puts the relay IN FRONT OF the board's granulator — jitter, a cushion,
loss, a 60 msg/s cap — so the comparison becomes *a granulator on clean audio*
against *a granulator on network audio*, which is a worse confound than the one
it removes. And the board stops being an instrument and becomes an effects unit
fed from a browser, which is most of what the page is claiming.

So: one spec, two builders, nothing audio crossing the wire ahead of either
granulator. The price is that "the same input" is a claim to be MEASURED rather
than assumed, and that price is what the rest of this section pays.


**The material comes before the granulator.** Nothing below §4 is worth
measuring until both ends are chewing the same thing.

🔴 **THE SOURCE IS ONE SUPERCOLLIDER SYNTHDEF, RUN IN BOTH PLACES.** Not a
WebAudio generator and a SuperCollider generator kept in step — one definition,
two machines.

⚠️ **THE FIRST VERSION OF THIS SECTION WAS WRONG, AND SO WAS THE CORRECTION.**

The first version argued that the source had to be ADDITIVE — a table of sine
partials, with `saw` as a name for `1/n` — because "a sawtooth at 110 Hz" does
not survive two engines: WebAudio's `type: 'sawtooth'` is band-limited by a
wavetable the specification never pins down, `Saw.ar` by a different method,
Csound's `vco2` by a third.

The correction threw that away, on the grounds that once scsynth runs in the tab
`Saw.ar` is `Saw.ar` on both machines and identical by construction, so the
additive constraint buys nothing and forbids a real sawtooth, noise, a sample
and every richer material later.

🔴 **AND THAT CORRECTION SPENT A DECISION THAT HAD NOT BEEN TAKEN.** scsynth in
a tab is §4b step **3**, explicitly behind "re-ask whether it is still worth it"
— it may never happen. Until it does, **the two ends are different engines**, and
while they are, the first version is simply right: a spec that says `saw` means
a twelve-partial sine table in the browser and `Saw.ar` on the board, which is
two different sounds under one name. That is the confound this whole document
exists to remove, hidden behind a word instead of visible in a table.

`PosSource.sc` was written to the correction before this was noticed, with a
`shape` control selecting sine / saw / pulse / additive. It has been rewritten:
**the client sends an AMPLITUDE TABLE and the engine plays a sum of sines.**
`demo/shell/source.mjs` owns the tables and the normalisation, both ends call
its `partialsOf`, and neither invents a number. An oscillator shape comes back
as one line the day it can be compared against anything.

✅ **BUILT AND MEASURED, 2026-09-13.** `source.set {spec}` → the box expands it
with the SAME `partialsOf` the page uses → `PosSource.sc` renders it into
Pappus's own input bus. Measured over the relay, with nothing pressed and no
instrument feeding the granulator: **rms 0.008025, peak -29.6 dBFS**, against
**0.000000 / -180.0** with the source switched off. `grains` asserts it, four
runs out of four.

⚠️ **AND THE INSTRUMENT HAS TO COME OUT OF THE INPUT, NOT BE STOPPED.** scsynth
fills its input busses from JACK before any synth runs, so `Out.ar` to that bus
SUMS with whatever is patched to `SuperCollider:in_1` — two materials in one
buffer, which is a third thing neither end can describe. It cannot simply be
stopped either: `posbox`, the capture whose frames are the audio a page HEARS,
is raised as part of the instrument's own chain, so `audio.stop` would take the
result away along with the material. `sourceFeed()` in `jacksynth.mjs`
disconnects one JACK link and leaves everything else standing.

### 4a-i. Three things the build measured that nothing had written down

- 🔴 **A NODE ID IS NOT EVIDENCE THAT A SYNTH EXISTS.** The first version
  answered `{ok: true, node: 1002, engineOn: true}` about a SynthDef that had
  **failed to load**, because `Synth.new` allocates an id on the CLIENT and
  returns before the server has read the message. The page would have drawn
  "the board is chewing the same material" over silence. `/pos/confirm` asks
  scsynth for a CONTROL VALUE (`/s_get`), which answers only for a node that is
  really there holding the value it really holds, and `source.applied` reports
  `ok: false` until it does. That guard proved itself on the real failure below
  before anything was believed.
- 🔴 **scsynth HAS A FIXED POOL OF AUDIO INTERCONNECT BUFFERS AND PAPPUS IS
  ALREADY NEAR IT.** Six voices of twenty-four partials written out as one
  `SinOsc` each is **1,151 UGens and 46,815 bytes**, and scsynth refused to load
  it at `numWireBufs` 64 *and* at 128: `exception in GraphDef_Load: exceeded
  number of interconnect buffers`, then `SynthDef posSource not found` for every
  `/s_new` after it. A WAVETABLE is one `Osc.ar` per voice whatever the table
  holds — **4,508 bytes and 104 UGens**, ten times smaller both ways, for the
  same sound. ⚠️ `/b_gen sine1`'s `normalize` argument DEFAULTS TO TRUE and would
  have thrown the spec's level away while everything still made a sound.
- ⚠️ **TWO TABLES AND A CROSSFADE.** Filling the buffer an `Osc.ar` is reading is
  a step in the waveform, and a click on a granulator's INPUT is written into
  the ring and re-fired by every grain that later reads that spot.

`rig/board/norns/PosSource.sc` is that definition. It writes to Pappus's own
input bus (`context.in_b[0].index`), so the granulator picks it up with NO JACK
RE-PATCH — and a re-patch is what made `fx.pappus` answer `ok` seven seconds
before anything could be heard.

### 4b. ✅ DECIDED — the AudioWorklet granulator goes

Once Pappus runs in a tab, the page's own granulator is dropped. Two granulator
implementations is the same mistake as two sawtooths one level up, and keeping
it would mean every finding had to say which of the three engines it was about.

⚠️ **AND THAT COSTS THE PICTURE, WHICH HAS TO BE BOUGHT BACK.** The reason the
left card can draw every grain is that OUR worklet reports each one; Pappus
reports none, in a tab or on a Pi. So dropping the worklet means adding a
`SendReply` on the grain trigger in `Engine_Pappus.sc` — which is already
queued as "make the board report grains" and is now load-bearing rather than
a nicety. It serves both ends: free in a tab with no relay in the path, and
batched at ~250 ms for the board's measured 60 msg/s ceiling.

⚠️ **AND THE ORDER WAS WRONG WHEN IT WAS FIRST WRITTEN HERE — IT PUT THE
EXPENSIVE HALF FIRST.** `research/supercollider-browser-2026-09.md` §5 already
argued against scsynth in a tab for this project, on numbers: **1,701,983 B of
wasm against a 6,659 B worklet** for the same audible result, AGPL-3.0-or-later
on a page that is served over a network, and a command surface whose every word
("synthdef", "node id", "audio bus") the jargon rule bans. Its sharpest point is
the one that matters here: *"a wasm scsynth is as opaque as the Pi — you would
still be inferring grain behaviour from output envelopes"*.

That objection assumes the engine cannot be changed. **It can — we own
`Engine_Pappus.sc`.** And the moment `SendReply` goes in, it goes in for the
BOARD as well, which means the Raspberry Pi's card gets the same picture the
page's has. At which point most of the reason to ship 1.86 MB of AGPL wasm has
gone: both lanes are fully drawn, the comparison is explicit, and what remains
is making them the same INSTRUMENT — which is BARE and the shared source,
neither of which needs wasm.

**Order, corrected:**

1. ✅ **`SendReply` on the grain trigger in `Engine_Pappus.sc`**, batched at
   ~250 ms for the relay's measured 60 msg/s ceiling. Done 2026-09-13; the
   `report` control and the `grain.marks` broadcast.
2. ✅ **BARE and the shared source** (§2, §3, §4a). Done 2026-09-13.
3. ✅ **DONE 2026-09-14 — scsynth in a tab, and the answer was yes.** The
   argument against it was 1,701,983 B of wasm against a 6,659 B worklet,
   AGPL-3.0-or-later on a page served over a network, a jargon-heavy command
   surface, and 803 bytes of headroom. What settled it is that the page was
   making a claim it could not support: *"the same granulator in this page and
   on a Raspberry Pi"*, about two different programs. A reimplementation that
   sounds similar is not the same instrument, and no amount of matched settings
   makes it one.
   - The bytes are paid **only by somebody who presses something** — the engine
     is imported inside `startPappus()`, so a visit costs the page.
   - The jargon never reaches the reader: the page says *"SuperCollider in a
     tab"* and *"every tick is a grain the engine reported firing"*.
   - The vendored engine moved to `demo/shell/vendor/` (`LAYOUT.md`), because
     `patch` came off the site the same day and a `/patch/…` URL would have had
     nothing behind it.

🔴 **AND THE WORKLET IS NOT DELETED, WHICH THIS LINE USED TO SAY IT WOULD BE.**
`demo/shell/granular-worklet.js` stays on disk with nothing importing it, and
its own header now says so. The reason is that §5's argument for it was never
about being half of this comparison: a page about **writing** a granulator —
what a window is, why overlap is the parameter that matters, why a hard edge
clicks twenty times a second — is a page that file is the SUBJECT of. That page
does not exist yet. Deleting the only readable granulator in the repo to tidy up
after a rewire would be throwing away the thing the rewire did not replace.

The additive table survives as ONE shape among several, and it keeps one real
use: it is the only source whose expected spectrum is known in closed form, so
it is what the INPUT CHECK below measures against. That is a test fixture, not
the design.

Parameters, engine-independent and unchanged by the correction: `shape`, `hz`,
`chord`, `level`, `spread`, and `count` where the shape is the additive one.

What was built before the correction, and what it is worth now:
`demo/shell/source.mjs` + `source-test.mjs`, 12/12. The SPEC and the pure
`partialsOf` expander survive and are the fixture; **the WebAudio builder in it
is a stopgap and is expected to be deleted** when the tab runs scsynth. Nothing
further goes into that lane.

**SuperCollider, and the ranking that used to be here is gone with the rest of
the correction.** scsynth is already on the board; `PAPPUS_TINY` is already
proven to load in a tab; Pappus reads its input from a bus
(`context.in_b[0].index`), so a source synth writing to that bus feeds the
granulator with no JACK re-patch at all — and a re-patch is what made
`fx.pappus` answer `ok` seven seconds before anything could be heard.

Csound and a node JACK client were listed as cheaper alternatives. They are
cheaper today and they both leave TWO generators to keep in step, which is the
same mistake as two sawtooths one level up.

~~🔴 **SO THE REAL BLOCKER IS VENDORING WASM SCSYNTH**, and everything in this
section is queued behind it rather than around it.~~ **NOT TRUE, AND SAYING SO
COST NOTHING TO DISPROVE.** The half that matters — the board granulating a
description the page wrote rather than whatever instrument was running — needs
no wasm at all. It is shipped. What wasm would buy is the stronger claim that
the two graphs are IDENTICAL, which is §4b step 3 and is still a question.

⚠️ **And the input stage gets its own check, on both ends.** Measure the
generated source BEFORE the granulator — same fundamental, same rms, same
spectral shape, within a tolerance taken from a measurement rather than picked.
Measuring it at the output measures the granulator too, which is the mistake
this repo keeps paying for: an A/B where both arms share the defect returns
"identical", and identical reads as fine.

The additive shape is what that check runs on, because its spectrum is known
without measuring anything. A `Saw.ar` on both ends should agree far more
exactly than the check can resolve — and if it ever does not, the additive
fixture is how you find out whether the disagreement is in the oscillator or in
everything after it.

The current source is deliberately dull and that is acknowledged, not defended
— it is a held saw chord because a granulator wants material that sustains, and
speech or a 1965 transfer did not work sonically. Making it interesting is a
separate question and comes after the two ends agree.

---

## 5. Syncing the shape, both directions

Not all of this is the board coming down to the page.

- ✅ **`rate` must mean one thing — and it already did, MEASURED.** The worry was
  that `mrate` is fed to eight voices each with swarm duplicates, so the same
  number could be 10–50x the density. It is not: the engine's `SendReply` fires
  once per VOICE per trigger and only one voice is gated by default, so at
  `mrate` 8 the board reported **8.0 grains a second**, at 4 **4.0**, at 16
  **16.0**. No division. `grains` now asserts the board's own reported rate
  against the number on the slider rather than assuming either — "the same
  number" and "the same density" are different claims and this is the one that
  can tell them apart. ⚠️ A patch that opens more voice gates would change this,
  which is why it is an assert and not a comment.
- ✅ **`where` must mean one thing.** `mscanmode 2` POSITION is sent explicitly
  and the page's own worklet runs `follow: 0`. The engine's default is **1
  STRETCH**, where `mscan` is not a position at all but a playhead SPEED mapped
  −1..+2 — so 0.333 is freeze and 1.0 is double speed forwards. One slider, one
  number, three meanings. POSITION is the only mode under which the slider's
  label, the page's own engine and the board's grain reports (`pos`, a fraction
  of the whole buffer) are the same claim. Confirmed from the reports: at
  `mscan 0.5` with `mbuflen 8` of a 60 s buffer, every grain reported
  `pos 0.070` — which is 0.5 × 8/60.
- ✅ **THE SAME MATERIAL** — §4a, and it was the first piece of work.
- ✅ **Mono against stereo** — decided above: mono, declared.
- 🔴 **AND TWO MORE THAT WERE NOT ON THIS LIST AND SHOULD HAVE BEEN, BOTH FOUND
  THE HARD WAY.** `sos` (the header — the granulator's own grains-against-input
  crossfade) and `src`/`lock` (whether it is recording at all). The page pressed
  "Hold what it has", which sets `src 1` and `lock 1`, and set neither of them
  anywhere else — and **`src 1` does not pause the write, it ERASES**
  (LESSONS #46). The board is an OBJECT and keeps what the last person left, so
  a visitor who pressed Hold and closed the tab handed the next one a granulator
  with an empty buffer and no way to fill it. It showed up as the suite reading
  green once and red three times with no code between the runs, because the
  suite presses every control. **The rule generalises past `scanmode`: a page
  driving this board sets every control its sound depends on, every time, or it
  works exactly once.**
- 🔴 **AND THE ENGINE'S OWN STARTUP OVERWROTE THE CLIENT, ON A COLD BOARD ONLY.**
  `pappusFx` answers `ok` on the exact line `PAPPUS READY`, so a page acts the
  instant it appears — and `run-pappus.scd` then waited a second and set
  `mrate 0.5`, `msrc 2`, `amp`, `ingain` and `run` on top of whatever had just
  arrived. MEASURED: the page asked for 2.2 grains a second and the engine
  reported **0.5**, which is that file's own default landing late; the same page
  on a warm board read 2.1 and 2.3, because the Routine had long since run. So
  it failed only on the first visit after a restart — the visit nobody is
  watching. `PAPPUS READY` is now printed at the END of that Routine: nothing the
  engine sets can land on top of a client's settings, because no client has been
  told it may start yet. After the fix the same check reads **2.2 against 2.2**
  cold and warm.

---

## 6. How we will know it worked, and the control that makes it a measurement

With both engines on the same material and matched settings, the two panes
should agree: rms within a few percent, and the spectral centroid within a
band that has to be picked from a measurement rather than in advance.

🔴 **AND THE NEGATIVE CONTROL IS THE POINT.** With `PAPPUS_BARE` OFF, the same
comparison must FAIL — clearly, not marginally. If the two agree with the whole
chain in the path, then the comparison is not measuring the chain and the
number is worthless. This project has shipped that exact mistake: a test that
compared a compiler against a number derived from the same formula it
implements was 22/22 green for months with two real defects in it.

Measure the pair, not just the board.

### 6a. ⏳ NOT DONE, AND WHAT IS STANDING IN FOR IT

The two-pane comparison itself has NOT been measured. What has, and what each
piece is worth:

- ✅ **The material is the same, and the board's own engine says so.** `grains`
  asserts `/s_get`'s answer — 72 sine partials at each end, and scsynth
  answering 6 notes at 130.81 Hz. This is a control-path claim, not an audio one.
- ✅ **The sound the board returns is made from that material**, with a negative
  control: the material turned down and the ring emptied reads **0.0000–0.0005**
  against **0.047–0.100** with it up, four runs out of four.
- ✅ **The grain rate agrees**, asserted against the board's own reports.
- ❌ **rms and spectral centroid, pane against pane.** Nothing does this yet.
  Two things make it harder than it looks and both were measured on the way:
  the two ends are at very different LEVELS (the generated material read 0.0085
  against the instrument's 0.0721 through the same path — `level` is a spec
  parameter and nothing has calibrated it), and **a granulator chewing a
  stationary drone returns that drone**, so rms cannot see a change of `rate`,
  `where` or `spray` at all. A comparison on held sines will agree for a reason
  that is not the granulator. The material has to be non-stationary before §6
  means anything, which is the same shape as §4a's own warning about measuring
  at the output.
- ❌ **The `PAPPUS_BARE` negative control.** BARE is built and weighed but has
  never been RUN as the board's rung — `/etc/default/positron-board` still says
  `PAPPUS_TINY=1`, which §7 is explicit about. Running it means editing that
  file and restarting, so it is a deliberate act on a shared instrument rather
  than something to leave behind.

---

## 7. What this is not

Not a deletion. FULL stays the default and BARE is off unless asked for, the
same way TINY is — the board behaves identically until somebody sets the
variable, and `CHAIN.md` is what makes the removed stages recoverable rather
than merely absent.

Not a claim that the simpler one sounds better. It sounds *comparable*, which
is a different and smaller thing, and it is the only thing the side-by-side
needs.

---

## 8. The reverb noise, closed — it does not reproduce

Carried as an open board-side defect since 2026-09-12 on this measurement,
taken with nothing playing:

    reverb off      rms 0.053735   peak  -8.8 dBFS
    reverb room     rms 0.095467   peak  -7.7 dBFS
    reverb hall     rms 0.137798   peak  -4.1 dBFS
    everything out  rms 0.000000   peak -180.0 dBFS

Re-measured 2026-09-13 over the relay, every arm 4 s of frames:

| | rms | peak |
|---|---|---|
| nothing running at all | 0.000000 | -180.0 dBFS |
| yoshimi idling, no insert | 0.000000 | -180.0 dBFS |
| the same through the reverb | 0.000000 | -180.0 dBFS |
| **a note held, through the reverb** | **0.041883** | **-22.3 dBFS** |
| four seconds after the release | 0.000000 | -180.0 dBFS |
| reverb at mix 1, room 1, nothing playing | 0.000000 | -180.0 dBFS |

and idling with no insert at all: **yoshimi, hexter and fluidsynth are each
0.000000**.

🔴 **THE HELD NOTE IS THE CONTROL AND IT IS THE WHOLE REPORT.** Six arms of
`0.000000` is exactly the shape of a deaf instrument — "a partial result that
is too tidy is a broken collector, not a finding" — and this probe WAS deaf on
its first run, for a reason worth keeping: it waited on a reply of type
`fx.space` when the board answers `fx.space.applied`, so the reverb was never
switched on and all four arms measured the same untouched silence while
appearing to compare four conditions. The fix was to read the box's own handler
rather than to guess the name. With the reverb genuinely on and confirmed
(`ok:true, on:true, mix 1, room 1, instrument yoshimi`), a held note reads
0.0419 through the same path that reads 0.000000 at rest.

So: not reproduced, on a path proved live in the same run. What changed in
between is not established — the board has been restarted and redeployed many
times since, and Pappus now runs TINY. **If it returns, the first arm to take
is "which instrument was in the graph, and was pappus in it too"**, because the
original's `reverb off` row was already 0.0537 with nothing playing, and that
is an upstream source rather than a reverb tail.
