# TINY — the same engine, small enough for a browser

`PAPPUS_TINY=1` compiles a fourth rung on Pappus's own ladder. It exists for one
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

| | bytes | UGens |
|---|---|---|
| FULL | 118,597 | 2,780 |
| LITE | 73,297 | 1,706 |
| **TINY** | **63,297** | **1,451** |

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

## Running it

    PAPPUS_TINY=1        the 64 KiB graph — and it implies LITE
    (unset)              exactly as before; `lite` is still `prLiteMode`

The flag is off by default, so this file is a drop-in replacement for the
upstream engine and the board behaves identically until somebody asks.

**Both ends run the same graph.** That is the reason to put TINY on the BOARD as
well as in the browser: a comparison between a 2,780-UGen graph on a Pi and a
1,451-UGen graph in a tab is not a comparison of where the sound is made, it is
two different instruments. With the flag on both, it is one engine in two
places.
