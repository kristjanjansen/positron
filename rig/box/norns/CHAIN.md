# CHAIN — what is in Pappus, stage by stage, before anything is taken out

Written 2026-09-13, and written FIRST on purpose. `plan-twins.md` §2 asks for a
`PAPPUS_BARE` rung that skips everything after the grains, and the rule it sets
is that **a stage with no entry in this file may not be skipped**. A rung that
removes four stages makes them unfindable for anyone who did not already know
them; this is what makes the removal reversible rather than merely absent.

`TINY.md` is the precedent — it records what each of its four cuts removed, in
bytes and UGens, and what the cut costs the sound. Same shape here, one level
up.

    GRAINSWARM 1 and 2 (parallel) > RESONATOR > DELAY > COLOUR > REVERB > out

⚠️ **That is the default path, not the only one.** SIGNAL is a routing matrix:
each granulator has an amount fed into each stage, so either one can skip any
part of the chain. `pin1/pin2` feed RESONATOR, `sin1/sin2` DELAY, `kin1/kin2`
COLOUR, `oin1/oin2` straight to the output. Defaults are `pin 0.7`, everything
else 0 — so out of the box both granulators enter at RESONATOR and run the
whole chain. **A `BARE` rung is therefore not the only way to get a dry grain
cloud**: `oin1 1, pin1 0` does it at run time, today, with no recompile. The
difference is that the UGens still exist and still cost CPU, which is the whole
of §3's argument.

---

## GRAINSWARM — the subject, and the only stage BARE must not touch

Two independent granulators, `m` and `n`, each capturing the input into a mono
ring buffer and spawning grains from a movable playhead. Eight voices each, one
per grid row, each with its own pitch.

**Controls** (each exists twice, `m…` and `n…`):
`rate` `size` `contour` `scan` `scanmode` `delay` `spray` `spraymode`
`elen` `ephase` `swarm` `swarmmode` `lock` `sos` `buflen` `winstart` `winend`
`strum` `tilt` `src`, plus `pitches` `probs` `gates` `epattern` per half.

Things that are not obvious and have each cost a day:

- **`src` is 1 OFF, 2 STEREO, 3 MONO L, 4 MONO R. There is no 0.** A value
  outside the table is not an error, it is silence — LESSONS #62, where every
  probe taken with `msrc 0` measured an empty buffer while looking like a
  sweep. And `src 1` does not merely pause the write, **it erases**: record
  gain zero and retain gain zero writes `0·new + 0·old` over the window in real
  time, so a loaded minute is gone within one window pass (LESSONS #46).
- **`elen` is a STEP COUNT, not a fraction.** Rolling it 0.2–1.0 made `% 1` = 0
  and switched the granulator off in 30.5% of rolls.
- **`scanmode`: 1 STRETCH, 2 POSITION, 3 DELAY SYNC, 4 DELAY FREE** — and the
  default follows the write head, which is why a granulator with the instrument
  still playing in sounds like the instrument (LESSONS #61).
- **`report`** (added 2026-09-13) fires a `/pgrain` per grain carrying the read
  position, gated on the trigger and off by default.

**BARE keeps all of it.** The granulator is the subject; everything below is
what sits between it and the listener.

---

## RESONATOR — a Rings-style modal / string resonator

**Controls:** `pfrq` `pamp` `pvfrq` `pvamp` `pdamp` `pbright` `pstruct` `ppos`
`pmodel` `pgrain` `pgraintype` `pwet`, fed by `pin1`/`pin2`.

MODAL is **forty-eight resonators** — six partials on each of the eight grain
voices — tuned to the chord the grains are playing, or to `pfrq` in FREE/SCALE,
with `pstruct` stretching the partial series. STRING is **eight Karplus-Strong
voices**, one per row.

**Already removed by TINY**, and this is where its two largest cuts landed: the
48-`Ringz` modal bank plus ~96 `Lag.kr` (**3,526 B**) and the eight string
voices (**3,344 B**). So on the board today — which runs `PAPPUS_TINY=1` — this
stage is already a pass-through.

**What removing it costs the sound:** the pitched, struck, bell-and-string
character. A grain cloud through the modal bank is tuned; without it the cloud
is whatever the material was. This is the stage most likely to be missed, and
`research/supercollider-browser-2026-09.md` §5 names exactly why: *"`GrainBuf`,
`DynKlank`, `PitchShift` and `Compander` are decades-tuned, and a hand-rolled
resonator bank will sound worse before it sounds better."*

🔴 **And it is the stage that made the granulator unmeasurable.** LESSONS #48:
four octaves of key moved measured brightness by **−0.05** through a
resonator-heavy roll, against **1.77** through one that goes straight out. Forty-
eight fixed-pitch resonators cannot follow a key, so every pitch measurement
taken through them was measuring them instead.

---

## DELAY — a mono line with panned taps

**Controls:** `scycle` `sfb` `stilt` `stiltxover` `sdiffuse` `swet` `shold`
`taptimes` `taplevels` `tappans` `tappitch`, fed by `sin1`/`sin2`.

Mono, with the taps panned out to stereo — keeping the line mono is what lets
the taps be placed independently. `shold` freezes it; `sfb` is feedback and
`sdiffuse` smears the taps into each other.

**TINY is at four taps of eight.** The other four cost **2,894 B** and ~28
UGens — ⚠️ and that pair of numbers is the reason TINY.md says *size does not
track UGen count*: the shimmer is ONE UGen and cost 236 bytes, while these ~28
cost twelve times that.

**What removing it costs the sound:** rhythm, and most of the sense of space
that is not the reverb. `taptimes` against a euclidean gate is where Pappus
stops being a wash.

---

## COLOUR — drive, crush, loss, noise

**Controls:** `drive` `crush` `crushmode` `loss` `noise` `noisetype`
`noisedecay` `noisetone` `noisedyn`, plus `kwow`, fed by `kin1`/`kin2`.

In that order: saturation, then bit/rate reduction, then dropout, then an
**envelope-following noise** wash (WHITE, PINK, DUST, or any loop file dropped
into the audio folder). `kwow` is the tape-wow modulation.

⚠️ **COLOUR is always wet** — it is the colour stage, and a dry path through it
is the granulator's own signal, which the routing matrix already provides.

⚠️ **It holds two of the three `LocalIn`/`LocalOut` feedback channels** in the
whole def (crush's two error-feedback channels; the third is REVERB's). One
`LocalIn` per SynthDef is allowed, so these share the one — meaning a cut here
has to leave the remaining user of it intact.

**What removing it costs the sound:** grit. The difference between a clean
granulator and one that sounds like hardware.

---

## REVERB — Sean Costello's feedback-delay network, plus a shimmer

**Controls:** `rverb` (wet/dry) `rtime` (size and decay together — pushed all
the way up, the tank freezes) `rshimmer` (send) `rshimmersemi` (the interval it
climbs by, resolved in Lua as OCT/5TH/SCALE and sent as a plain semitone
count). Sits after COMP.

**The shimmer is already removed by TINY** — one `PitchShift`, **236 B**.

✅ **AND IT IS NOT NOISY**, which was carried as an open defect from 2026-09-12
until it was re-measured on 2026-09-13: six arms at rest all read
`0.000000 / -180.0 dBFS`, on a path proved live in the same run by a held note
at `0.041883 / -22.3 dBFS`. Full table in `plan-twins.md` §8. ⚠️ Note this is
the SEPARATE Csound reverb insert (`rig/box/csd/space.csd`), not this stage —
the two are easy to confuse and the measurement was about the insert.

**What removing it costs the sound:** the tail, and with it most of the reason
a grain cloud reads as a place rather than as a texture.

---

## The rest, which BARE also has to think about

- **SIGNAL's routing** — `pin`/`sin`/`kin`/`oin` and `route`. If BARE compiles
  the stages out, these controls still EXIST (every `n…` control does on LITE
  too, deliberately, "so nothing in Lua has to know, no command becomes an
  error, and a pset written on a Pi 4 loads here without complaint"). Follow
  that precedent: the commands stay and land somewhere harmless.
- **The seven meters**, on a control bus: `1 GRAINSWARM 1 · 2 GRAINSWARM 2 ·
  3 RESONATOR · 4 DELAY · 5 COLOUR · 6 REVERB` and the master. 🔴 **If BARE
  skips stages, these must still mean something** — a meter reading zero
  because a stage was compiled out looks exactly like a meter reading zero
  because a stage is broken, and the board's own status would start lying.
  Either report them as absent or do not report them.
- **Master:** `mcomp` `fade` `run` `bypass` `amp` `ingain` `limceil`.
- **`snapwrite` / `snapread`** move the grain buffer to and from disk;
  `bufclear` and `delayclear` empty them.

---

## The rungs, as they stand

| | bytes | UGens | fits a browser |
|---|---|---|---|
| FULL | 118,597 | 2,780 | no |
| LITE | 73,297 | 1,706 | no |
| **TINY** | **63,297** | **1,451** | **yes** |
| BARE | not built | — | — |

⚠️ **TINY's headroom is 2,239 bytes** against the 64 KiB `/d_recv` ceiling that
wasm scsynth enforces silently. The `report` control added on 2026-09-13 costs
sixteen `SendReply` UGens and two controls, and **that cost has not been
measured against this ceiling** — `SynthDesc` has no compiled def before the
engine allocates, so it needs a running engine to weigh. If TINY stops fitting,
that is not a reason to drop `report`; it is a reason to build BARE, which
removes far more than it adds.
