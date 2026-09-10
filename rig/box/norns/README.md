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

Its own constraint, worth knowing before adding to it: one `SynthDef` sitting
close to **scsynth's fixed pool of 64 audio interconnect buffers**.

Licence: Pappus declares none. R&D only.
