# TINY — the same engine, small enough for a browser

`PAPPUS_TINY=1` compiles a third rung on Pappus's own ladder — `FULL > LITE >
TINY`, with `BARE` below it since 2026-09-13 (CHAIN.md). It exists for one
reason, and the reason is a hard number.

## The number

**wasm scsynth refuses a `/d_recv` over 64 KiB, silently.** Bisected 2026-09-13
with a ladder of generated SynthDefs pushed through `/d_recv` one at a time:

| bytes | result |
|---|---|
| 2,115 … 40,590 | LOADED |
| **52,730** | **LOADED — the largest that does** |
| **68,892** | **no reply — the smallest that does not** |
| 89,150 | no reply |

65,536 sits inside that bracket. There is no `/fail` and no reply of any kind;
the first thing the server says is `/fail "/s_new" "SynthDef not found"` some
seconds later. Identical under both the postMessage and the SAB transport, so it
is scsynth's own OSC receive path and nothing on the page's side can raise it.

## What TINY drops, and what it must not

✅ **WEIGHED 2026-09-13**, all four arms on one machine in one sitting.

| | bytes | UGens | headroom to 64 KiB |
|---|---|---|---|
| FULL | 121,425 | 2,812 | — |
| LITE | 74,733 | 1,722 | — |
| **TINY** | **64,733** | **1,467** | **803 B** |
| **BARE** | **43,551** | **941** | **21,985 B** |

⚠️ **THE OLD 118,597 / 73,297 / 63,297 ROW WAS A DIFFERENT BUILD** — taken
before `report`. `report` and the BARE plumbing cost TINY **1,436 bytes**, so
its headroom went from 2,239 to **803**: still inside the ceiling, and now one
modest feature from not being. The cuts below are all still TINY's; BARE's
column is in `CHAIN.md`, which holds what it removes and why.

Four cuts, each in the engine's own idiom (`lite` already gates whole stages):

1. **the modal bank** — 48 `Ringz` behind two `DynKlank`s, plus ~96 `Lag.kr`.
   Saved 3,526 B.
2. **the string voices** — eight `DelayC` + `CombL` + `Pan2`. Saved 3,344 B.
3. **the shimmer** — one `PitchShift`. Saved 236 B.
4. **four delay taps instead of eight.** Saved 2,894 B.

🔴 **THE GRANULATOR IS UNTOUCHED, AND THAT IS THE WHOLE POINT.** Every cut is
downstream of GRAINSWARM. What TINY removes is the chain that sits BETWEEN the
grains and the listener — which is also the chain that made the grains
impossible to measure through (LESSONS #48: four octaves of key moved measured
brightness by −0.05 through a resonator-heavy roll, and 1.77 through one that
goes straight out).

⚠️ **SuperCollider does not strip an unconnected UGen.** Setting a gain to zero
or leaving a value unread changes the SOUND and not one byte of the def — the
construction has to be skipped. Every cut here is a compile-time `if`, never a
runtime zero.

⚠️ **The size does not track the UGen count.** The shimmer is one UGen and cost
236 bytes; four delay taps are ~28 and cost 2,894. Measure each cut; do not
estimate it.

⚠️ **AND TINY LEFT ORPHANS BEHIND, FOUND 2026-09-13 WHILE BUILDING BARE.** Cut 2
skipped the eight string VOICES and nothing else, so the things that fed them
are all still constructed and still running every block against a signal that is
identically zero:

- `svfrq` and `svamp` — **sixteen `Lag.kr`** plus their clips, tuning eight
  strings that do not exist
- `sdet` and `spos` — STRUCTURE's detune and POSITION's pick offset, read by
  nobody
- `fstring`'s `DC.ar([0, 0])`, its damping normalisation, and the MODE
  crossfade that sums two silences
- 🔴 **a stereo `Limiter`** (`fsum = Limiter.ar(fsum, 0.9, 0.02)`) holding down
  a bank that is guaranteed silent

That is this file's own headline rule happening to this file: *SuperCollider
does not strip an unconnected UGen.* It is **not fixed here**, deliberately —
the fix is a one-line `if(tiny.not)` around the excitation and string tuning,
but it would change TINY's compiled size, and the 63,297 B in the table above
cannot be re-taken from this machine. Fix it and re-weigh in the same sitting,
or not at all. BARE is unaffected: it removes the whole stage.

## Running it

    PAPPUS_BARE=1        GRAINSWARM straight to the master — and it
                         implies TINY. See CHAIN.md.
    PAPPUS_TINY=1        the 64 KiB graph — and it implies LITE
    (unset)              exactly as before; `lite` is still `prLiteMode`

The flags are off by default, so this file is a drop-in replacement for the
upstream engine and the board behaves identically until somebody asks.

⚠️ **`PAPPUS_TINY` and `PAPPUS_BARE` are read by PRESENCE, not by value** —
`PAPPUS_TINY=0` turns TINY ON. `PAPPUS_BARE` matches it deliberately: one sharp
edge shared by two rungs of one ladder is easier to hold than two rules for two
neighbouring flags. `PAPPUS_LITE` is the only one that reads its value, and it
takes `1/lite/true/yes` or `0/full/false/no`.

The engine now names the rung in its own log line — it used to say `LITE` for
TINY as well, so a 73 KB graph and a 63 KB one printed the same thing — and a
`rung` poll reports it as a number (0 FULL, 1 LITE, 2 TINY, 3 BARE).

**Both ends run the same graph.** That is the reason to put TINY on the BOARD as
well as in the browser: a comparison between a 2,780-UGen graph on a Pi and a
1,451-UGen graph in a tab is not a comparison of where the sound is made, it is
two different instruments. With the flag on both, it is one engine in two
places.

## 🔴 The board is on TINY, and it cost the modal bank — DECIDED 2026-09-13

`/etc/default/positron-box` now reads `PAPPUS_TINY=1`, and the board's own log
line says `Engine_Pappus: TINY graph` — ⚠️ **not `PAPPUS READY`, which prints
`lite=true` on TINY as well and cannot tell the two rungs apart.**

This is a decision, not a drift. `/grains/` runs the SAME definition in a
browser now, and TINY is the only rung measured to load in the engine this repo
ships: SuperSonic took TINY's 64,733 B six times and refused LITE's 74,733 five
(`research/supercollider-browser-2026-09.md` §10). The alternative — LITE at
both ends — has no browser to run in.

**The price, measured on this board today rather than quoted.** A chord held on
fluidsynth through the insert, `pin1` at its default 0.7 so the grains enter at
RESONATOR, sweeping that stage's wet mix:

| a chord held, through TINY | rms | peak |
|---|---:|---:|
| `pwet 0` — RESONATOR dry | 0.002723 | −39.2 dBFS |
| 🔴 **`pwet 1` — all RESONATOR** | **0.000000** | **−180.0 dBFS** |
| `pwet` back to 0 | 0.000230 | −62.0 dBFS |
| CONTROL, nothing held | 0.000000 | −180.0 dBFS |

Exactly zero, because TINY compiles out the 48-`Ringz` modal bank and the eight
string voices and this stage is a pass-through with nothing to pass — turn the
whole signal through it and there is no signal. On LITE the same arm reads
0.030–0.041. ⚠️ **The control that makes the zero mean something is the row
above and below it**: a probe that reads 0.000000 everywhere is a deaf probe,
and this one hears 0.002723 through the same path one second earlier.

That loss is the price of comparability and it was taken on purpose. ⚠️ **Do not
put the board back on LITE without changing `/grains/`** — that page's whole
claim is that one graph runs in two places, and the rung is how it is true.
