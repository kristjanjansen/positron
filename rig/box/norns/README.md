# norns engines, without norns

A norns "engine" is an ordinary SuperCollider class that inherits from
`CroneEngine` and registers commands. The Lua layer, the grid, the screen and
softcut are **not involved in making the sound** — so an engine runs on plain
`scsynth` given a stand-in for that one base class.

`CroneEngine.sc` here is that stand-in, 65 lines. Drop it and an engine into
`~/.local/share/SuperCollider/Extensions/` and the engine compiles.

## What it has to provide

Measured against [Pappus](https://github.com/FoundSoundsMM/Pappus), a granular
soundscape instrument whose engine is 2,030 lines and one `SynthDef`:

| | |
|---|---|
| `*new(context, doneCallback)` | the constructor shape engines expect |
| `alloc` | called once, **inside a Routine** — engines call `server.sync` in it |
| `addCommand` / `addPoll` | registration; a dictionary is enough |
| `free` | teardown |

That is all. Pappus registers **107 commands** and touches exactly **four**
members of the audio context.

## ⚠️ The context members are NOT the same shape

Two failed runs went into this, and neither error said what was wrong — only
`Message 'index' not understood` and then `Message 'at' not understood`. The
answer is in the engine itself (`Engine_Pappus.sc:1757`):

    \inbusl, context.in_b[0].index,
    \inbusr, context.in_b[1].index,
    \outbus, context.out_b.index

So **`in_b` is an ARRAY of single-channel busses** and **`out_b` is a SINGLE
bus**. Guessing symmetry fails both ways round. Read the engine.

    ctx = (
        server: s,
        xg:     Group.new(s),
        in_b:  [Bus.audio(s, 1), Bus.audio(s, 1)],
        out_b: Bus.new(\audio, 0, 2, s)     // hardware out
    );

`context` can be a plain `Event` — SuperCollider's `Event` answers `.foo` as
`[\foo]`, so no class is needed for it.

## Running it

    jackd -r -d dummy -r 48000 -p 1024 &      # a clock, no soundcard
    sclang run-pappus.scd

Three environment variables are required and none of them is optional on a
headless box:

    QT_QPA_PLATFORM=offscreen        Debian's sclang links the Qt GUI classes
    QTWEBENGINE_DISABLE_SANDBOX=1    it embeds QtWebEngine, whose Chromium
                                     zygote refuses to run as root
    XDG_RUNTIME_DIR=/tmp/rt          or Qt complains and some paths break

And **JACK's control socket is per-user**: a root `jackd` and a non-root
`sclang` cannot see each other at all. It presents as a server that boots and
never registers a port.

## What Pappus decides for itself

It reads the device tree and builds a different graph per board — LITE on a Pi 3
(one granulator, 24 resonators), **FULL on a Pi 4** (two granulators, 48).
Confirmed at runtime here: `lite mode: false`. Override with `PAPPUS_LITE=1`.

Two smaller rungs are compiled in below that, each a set of `if`s around the
CONSTRUCTION rather than gains set to zero — SuperCollider does not strip an
unconnected UGen. `PAPPUS_TINY=1` fits the graph under wasm scsynth's silent
64 KiB `/d_recv` ceiling (`TINY.md`); `PAPPUS_BARE=1` implies it and builds no
RESONATOR, DELAY, COLOUR or REVERB at all (`CHAIN.md`). Both are read by
PRESENCE — `=0` turns them ON — and the granulator is untouched on every rung.
The engine names the rung it compiled in its first log line, and reports it as
a number on the `rung` poll.

Its own constraint, worth knowing before adding to it: one `SynthDef` sitting
close to **scsynth's fixed pool of 64 audio interconnect buffers**.

🔴 **AND THAT IS NOT A THEORETICAL LIMIT — THE FIRST SYNTH ADDED BESIDE PAPPUS
HIT IT.** `PosSource.sc` (the material `grains` sends, plan-twins §4a) was first
written as one `SinOsc` per partial: six voices of twenty-four is **1,151 UGens
and 46,815 bytes**, and scsynth refused to load it at `numWireBufs` 64 *and* at
128 —

    exception in GraphDef_Load: exceeded number of interconnect buffers.
    *** ERROR: SynthDef posSource not found

— after which every `/s_new` for it failed and the only symptom a page could see
was silence. `Mix.fill` holds every partial live at once, so the wires scale with
the table. Rewritten as a WAVETABLE (one `Osc.ar` per voice, whatever the table
holds) it is **4,508 bytes and 104 UGens** for the same sound. `run-pappus.scd`
also asks for 128 wire buffers now, as headroom rather than as the repair.

⚠️ **A NODE ID IS NOT EVIDENCE THAT A SYNTH EXISTS.** `Synth.new` allocates one
on the CLIENT and returns before the server has read the message, so it answered
`node 1002` about the def that had just failed to load. Ask the server: `/s_get`
replies only for a node that is really there, with the value it really holds.
`/pos/confirm` in `run-pappus.scd` is that question.

`PosSource.sc` is a CLASS, so it lives in the Extensions directory like the
engine and `CroneEngine.sc` — `push.sh` installs all three. A class that is not
there does not fail loudly: sclang's compile stops at the first unknown name,
`PAPPUS READY` never prints, and `fx.pappus` reports *"the engine came up but
never reported READY"*.

Licence: Pappus declares none. R&D only.
