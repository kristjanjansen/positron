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
- **REVERB** — and ⚠️ note the open defect while writing it: the insert adds
  **-4.1 dBFS of noise with no input at all**, measured, against digital
  silence with the insert removed.
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

## 4. Syncing the shape, both directions

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
- **The same material.** The cheapest version is the page sending the board a
  chord it can also make itself; the honest version is both granulating the
  SAME recorded seconds. Until then the material difference dominates
  everything else in this document and no other comparison means much.
- **Mono against stereo.** Sum the page engine to mono for the comparison, or
  accept it and say so. ⚠️ A channel count cannot be inferred from a payload
  (CLAUDE.md) — whatever is done here is declared, not guessed.

---

## 5. How we will know it worked, and the control that makes it a measurement

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

## 6. What this is not

Not a deletion. FULL stays the default and BARE is off unless asked for, the
same way TINY is — the board behaves identically until somebody sets the
variable, and `CHAIN.md` is what makes the removed stages recoverable rather
than merely absent.

Not a claim that the simpler one sounds better. It sounds *comparable*, which
is a different and smaller thing, and it is the only thing the side-by-side
needs.
