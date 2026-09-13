# plan-twins — make the two granulators the same instrument

Written 2026-09-13, from a session note after `grains` put them side by side:
*"make them similar. Simplify the board granulator a lot, but document what's
existing there currently, so we can return to it later. Sync the shape of the
instrument and the pipeline as much as possible."*

⚠️ **Queued, not started.** The two panes ship today as two different
instruments wearing one control surface, and the page does not say so.

---

## 1. The problem, which the side-by-side created

`grains` shows one granulator in the page and one on a Raspberry Pi, with the
same four settings going to both. They sound nothing like each other, and every
reason is structural rather than a bug:

| | the page | the board |
|---|---|---|
| **material** | six sawtooth oscillators, static | FluidSynth or Yoshimi playing a patch's chord |
| **`rate`** | grains per second, full stop | fed to GRAINSWARM across **eight voices**, each with `swarm` detuned duplicates — the same number can be 10–50x the density |
| **after the grains** | a raised-cosine window and nothing | RESONATOR > DELAY > COLOUR > REVERB (COLOUR is drive > crush > loss > envelope-following noise) |
| **`where`** | always a distance behind the write head | `scanmode`: STRETCH / POSITION / DELAY SYNC / DELAY FREE, and the page never sets it |
| **out** | stereo, `pan 0.8` | mono, through a relay and a jitter buffer |

A page that draws two panes side by side is making a claim that they are
comparable. Right now that claim is false, and the honest repair is to make it
true rather than to caption it away.

---

## 2. ⚠️ WRITE DOWN WHAT IS THERE BEFORE CUTTING ANY OF IT

**This is the first task and it is not optional.** Pappus's chain is 2,030
lines of somebody else's engine, and a rung that skips four stages is a rung
that makes those stages unreachable by anyone who did not already know them.

`rig/box/norns/TINY.md` is the precedent and the shape to copy: it records what
each cut removed, what it saved in bytes and UGens, and — the part that matters
— **what the cut costs the sound**. Do the same here, in
`rig/box/norns/CHAIN.md`, before a line of BARE is written:

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

It should also make the board's graph much smaller than TINY's 63,297 B, which
is a free side effect worth measuring rather than assuming.

---

## 4. Decided, 2026-09-13

- **Mono, both ends.** The board sends one channel; the page engine sums to it
  rather than the board being widened. ⚠️ Declared, never inferred — a channel
  count cannot be read off a payload, and 960 int16s is a valid 20 ms mono
  frame AND a valid 10 ms stereo one.
- **Two granulators, both ends.** Pappus is a pair (`m` and `n`) with
  deliberately unlike halves, and that pair is what stops one flat wash. The
  page engine has one and grows a second, rather than the board losing its.
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

⚠️ **AND THE FIRST VERSION OF THIS SECTION WAS WRONG, WHICH IS WHY IT SAYS SO.**
It argued that the source had to be ADDITIVE — a table of sine partials, with
`saw` as a name for `1/n` — because "a sawtooth at 110 Hz" does not survive two
engines: WebAudio's `type: 'sawtooth'` is band-limited by a wavetable the
specification never pins down, `Saw.ar` by a different method, Csound's `vco2`
by a third. Every word of that is true and **it only matters while the two ends
are different engines.** They are not going to be. Once scsynth runs in the tab,
`Saw.ar` is `Saw.ar` on both machines and is identical by construction — so the
additive constraint buys nothing and forbids everything: no real sawtooth, no
noise, no sample, no richer material later. It was a constraint invented for a
problem we are deciding not to have.

**A shape is therefore whatever the engine can make.** `SinOsc`, `Saw`, `Pulse`,
noise, a buffer — and the spec names one rather than describing a spectrum. A
sine is a fine place to start and is not the ceiling.

`rig/box/norns/PosSource.sc` is that definition. It writes to Pappus's own
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

1. **`SendReply` on the grain trigger in `Engine_Pappus.sc`**, batched at
   ~250 ms for the relay's measured 60 msg/s ceiling. Cheap, bounded, wanted on
   its own merits, and needed by every path.
2. **BARE and the shared source** (§2, §3, §4a) — the two granulators become
   the same instrument, with both pictures already drawn.
3. **Then re-ask whether scsynth in a tab is still worth it.** It may be: the
   identical-graph claim is genuinely stronger than a comparison. But it should
   be re-argued against the numbers above rather than assumed, and by then the
   page can show exactly what is still different.

The worklet is deleted at step 3 if step 3 happens, and not before.

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

🔴 **SO THE REAL BLOCKER IS VENDORING WASM SCSYNTH**, and everything in this
section is queued behind it rather than around it.

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

- **`rate` must mean one thing.** Either the page grows eight voices, or the
  board's `mrate` is divided by the voice and swarm count before it is sent.
  The second is a client-side change and is reversible; do that first and
  measure whether the densities actually match, because "the same number" and
  "the same density" are different claims.
- **`where` must mean one thing.** Set `mscanmode` explicitly from the page
  rather than inheriting whatever the patch left. ⚠️ It is ONE-based in the
  engine and out-of-range values fail silently — LESSONS #62, where `msrc 0`
  was not a source at all and every probe measured an empty buffer.
- **The same material** — §4a, and it is the first piece of work.
- **Mono against stereo** — decided above: mono, declared.

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
