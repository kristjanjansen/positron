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
  Either report them as absent or do not report them. ✅ **Answered
  2026-09-13: on BARE they report `-1`.** See the BARE section below.
- **Master:** `mcomp` `fade` `run` `bypass` `amp` `ingain` `limceil`.
- **`snapwrite` / `snapread`** move the grain buffer to and from disk;
  `bufclear` and `delayclear` empty them.

---

## BARE — the fourth rung, and what it does not build

    PAPPUS_BARE=1     GRAINSWARM straight to the master. RESONATOR, DELAY,
                      COLOUR and REVERB are not built.

Implemented 2026-09-13 in `Engine_Pappus.sc`. It implies `PAPPUS_TINY` the same
way TINY implies LITE — a rung that is not a subset of the one above it is not a
rung, it is a variant — so the ladder is `FULL > LITE > TINY > BARE`.

⚠️ **Set by PRESENCE, not by value.** `PAPPUS_BARE=0` turns it ON, because
`PAPPUS_TINY` already behaves that way and one sharp edge shared by two
neighbouring flags is easier to hold than two different rules. `PAPPUS_LITE` is
the only one of the three that reads its value.

🔴 **COMPILE-TIME, NEVER A RUNTIME ZERO, AND THAT IS THE WHOLE CLAIM.** The
routing matrix at the top of this file can already send a granulator past the
chain at run time (`oin1 1, pin1 0`), with no recompile and no flag. What BARE
buys is narrower and is the only thing it buys: **the UGens stop existing.**
SuperCollider does not strip an unconnected one, so `pwet 0` changes the sound
and not one byte of the def, and every filter in a bypassed stage still costs a
Pi 4 the same every block. Every cut is an `if` around the CONSTRUCTION.

### What each `if` removes

| stage | what stops being built on BARE | already gone on TINY |
|---|---|---|
| RESONATOR | three noise generators + a BPF (the excitation), one `PlayBuf` chain per loop file, an `Amplitude` follower, an `HPF`, BRIGHTNESS's `LPF`, ~24 `Lag.kr`, and **two `Limiter`s** | the 48-`Ringz` modal bank (3,526 B) and the eight string voices (3,344 B) |
| DELAY | the `Phasor`, the feedback `BufRd` and its tilt pair, the `BufWr`, four taps (`Phasor` + `BufRd` + `Pan2` + 3 `Lag.kr` each), the output tilt, and eight `AllpassC` of DIFFUSE | four of the eight taps (2,894 B, ~28 UGens) |
| COLOUR | drive's saturator and its fitted make-up, crush's quantiser and its two `Latch`/`Impulse` rate reducers, LOSS (two cascaded `LPF` on LITE, an `FFT`/`IFFT` pair on FULL), the envelope follower, the noise wash and its loop players, WOW's modulated `DelayC` | — |
| REVERB | six `CombL`, two `LPF`, four `AllpassC` | the shimmer's one `PitchShift` (236 B) |
| the feedback bus | **both ends** — no `LocalIn.ar(3)`, no `LocalOut`. COLOUR owned two channels and REVERB the third, and BARE has neither user | — |

⚠️ **RESONATOR is where the "it is already a pass-through" intuition is wrong.**
TINY took the bank and the strings, which is what makes the *sound* a wire — but
the excitation chain, the brightness filter, two dozen `Lag.kr` and **two
`Limiter`s** were all still being built and still running every block, feeding a
`DC.ar([0, 0])`. A stage that costs nothing audibly is not a stage that costs
nothing.

### What BARE deliberately keeps

- **Every command.** `pwet`, `rverb`, `swet`, `taptimes`, `drive`, `crush` and
  the rest are still declared and still `set` a control; they simply have
  nothing to drive. That is LITE's own precedent for the `n…` controls, quoted
  at the top of this section of the engine: *"nothing in Lua has to know, no
  command becomes an error, and a pset written on a Pi 4 loads here without
  complaint."* A page sending `pwet` to a BARE engine gets no error.
- **`bypass`.** Its two `Select`s happen to live in COLOUR's tail on the full
  graph, and they do **not** go with the stage — BARE rebuilds them, so
  `bypass 1` still hands the input straight out.
- **The buffers behind the buffer commands.** `dbuf` shrinks from 11 s to 0.1 s
  rather than disappearing, so `delayclear` stays a real command with a real
  buffer behind it — the same thing LITE does for the second granulator's
  capture, and for the same reason: a command that raises is worse than one that
  does nothing. `bufclear`, `snapwrite` and `snapread` are untouched.
- **The master: COMP, level, fade, limiter.** COMP is not one of the four named
  stages and it is the one master colour left in the path — but `mcomp 0` makes
  the `Compander` an *exact* identity (threshold 1, both slopes 1, make-up 1),
  so a page can null it with no recompile. That is the test for whether
  something belongs in a compile-time rung at all: a `Compander` is one UGen and
  can be made exactly transparent; forty-eight `Ringz` are neither. ⚠️ **A
  comparison against the browser granulator should send `mcomp 0`** — at its
  default of 0.2 it is compressing.

### 🔴 The four feed points collapse into one, and they SUM

`pin`/`sin`/`kin`/`oin` are where each granulator joins the chain, and the
defaults put it in at the HEAD (`pin 0.7`) with the other three at zero.
Honouring only `oin` on BARE would have compiled a rung that is **silent out of
the box**, and silent for every patch written on any other rung — LESSONS #62's
shape exactly, where a value that is not in the table is not an error, it is
nothing.

Summing is not a compromise, it is what the full chain already does: with every
stage's WET at zero each stage passes its input through and adds the next feed,
so `RESONATOR > DELAY > COLOUR > out` is literally `pin + sin + kin + oin` —
the same 2.8x at four feeds of 0.7 that the routing comment in the engine
measures. One `Lag.kr` for the sum rather than four.

⚠️ **BARE IS EARLIER THAN THE SAME SETTINGS ON TINY, AND THAT IS NOT A SUM.**
SC's `Limiter` looks ahead by its `dur` and delays its output by it, so
RESONATOR's output limiter alone puts **50 ms** of pure delay in the dry path,
plus WOW's ~0.5 ms `DelayC` in COLOUR and (on FULL only) LOSS's 512-sample
`DelayN`. So the level and the routing match; the ALIGNMENT does not. A
sample-aligned A/B between rungs would read as a total mismatch for a reason
that is not the chain. ⚠️ That figure is read off the UGen's documented
behaviour, not measured here — check it before quoting it.

### 🔴 The meters: absent reads `-1`, and never `0`

The seven meters are the reason this was not a free rung. On BARE, four of the
boxes on SIGNAL do not exist, and **a meter reading zero because a stage was
compiled out is indistinguishable from one reading zero because the stage is
broken** — the board's status is what a page reads, so the second reading is the
one somebody would act on.

What was implemented:

- **`-1` on the bus for every stage that was not built** — meters 2 (GRAINSWARM
  2, which LITE removed), 3, 4, 5 and 6. `-1` cannot be a measurement: every
  real meter here is an `Amplitude`, which is a magnitude and is never negative,
  so a reader who has never heard of BARE can still separate the two with `< 0`.
  One shared `DC.kr(-1)`, not five — an unconnected UGen is still a UGen and so
  is a duplicated constant.
- **All seven polls stay registered.** A poll that vanishes is a lookup that
  fails on the Lua side, which is the same argument the `n…` controls make.
  Nothing disappears; the value carries the meaning.
- **A new `rung` poll** — `0` FULL, `1` LITE, `2` TINY, `3` BARE — sits beside
  them, because `-1` on its own is a magic number. This is what makes it
  answerable rather than merely encoded. sclang only: no UGen, no bus.
- **A line in the log at alloc**, since the log is where this board's state
  actually gets read from, and `prRungName` now names the rung. ⚠️ The old line
  said `LITE` for TINY as well, so it could not tell a 73 KB graph from a 63 KB
  one.

⚠️ **LITE's own `mt2` is still a zero and is allowed to be**, because the
drawing side agrees with LITE about what exists — Lua draws no GR2 box on LITE
at all, so nothing reads it. Nothing has ever heard of BARE, which is why BARE's
four cannot borrow that excuse.

### ✅ WEIGHED 2026-09-13 — all four arms, one machine, one sitting

| rung | bytes | UGens | headroom to 64 KiB |
|---|---|---|---|
| FULL | 121,425 | 2,812 | — |
| LITE | 74,733 | 1,722 | — |
| **TINY** | **64,733** | **1,467** | **803 B** |
| **BARE** | **43,551** | **941** | **21,985 B** |

Against the pre-`report` table (118,597 / 73,297 / 63,297): **`report` and the
BARE plumbing cost TINY 1,436 bytes**, taking its headroom from 2,239 down to
**803**. TINY still loads in a browser — but it is now within one modest feature
of not doing so, and the next thing added to the granulator should be weighed
before it is shipped rather than after.

BARE is **43,551 B and 941 UGens** — a third of FULL, and two thirds of TINY
gone. `plan-twins` §3 guessed "much smaller than TINY"; it is, and by more than
the SOUND difference suggests, because RESONATOR's excitation chain, BRIGHTNESS's
filter, two dozen `Lag.kr` and two `Limiter`s were all still being BUILT and run
into a `DC.ar([0,0])` on TINY.

🔴 **AND THE RUN FOUND A DEAD FLAG.** `PAPPUS_LITE=1` reported FULL. The env var
was reaching sclang — measured, `"PAPPUS_LITE".getenv` returned `"1"` — and the
membership test was the fault:

    e == "1"                                 ->  true
    #["1","lite","true","yes"].includes(e)   ->  FALSE
    #["1","lite","true","yes"].indexOf(e)    ->  nil

**`Array.includes` compares by IDENTITY.** Two Strings with the same characters
are different objects, so the check read correctly, tested true under `==`, and
was always false — `PAPPUS_LITE` had never worked in either direction since it
was written, in EITHER direction, and nobody noticed because the fall-through
reads the device tree and a Pi answers LITE anyway. It only surfaced when a
weighing run asked for LITE on purpose and got FULL. Fixed with `indexOfEqual`;
`PAPPUS_LITE=1` now reports LITE and `PAPPUS_LITE=full` reports FULL.

### How it was weighed, and how to do it again

🔴 **No byte count for BARE appears anywhere in this repo, because nobody has
taken one.** `sclang` is only on the board. TINY.md's own warning is why an
estimate is not offered instead: *the size does not track the UGen count* — the
shimmer is one UGen and cost 236 bytes, four delay taps are ~28 and cost 2,894.

⚠️ **This does not need the Pi.** The def size is a pure function of the source
and the flags, with two exceptions that must be pinned either way: `prLiteMode`
reads the device tree (force it with `PAPPUS_LITE`) and the size depends on how
many `.wav` files sit in `pappus/audio/` next to the class, because FULL builds
one `PlayBuf` chain per file. **So take all four arms on ONE machine in one
sitting** — the 118,597 / 73,297 / 63,297 figures above were taken on the board
before `report` was added, and mixing a new BARE number into that table would be
comparing two different builds.

    # 1. ship the engine to the path sclang actually compiles, and restart
    #    nothing yet
    ./rig/box/push.sh --no-restart            # or: ./rig/box/push.sh <ip>
    BOX=<the address push.sh printed>

    # 2. the board's own audio has to be out of the way: one exclusive card,
    #    one scsynth. Check, do not assume.
    ssh positron@$BOX 'sudo systemctl stop positron-box; \
      pkill -9 -x sclang; pkill -9 -x scsynth; sleep 1; \
      echo "sclang $(pgrep -cx sclang) scsynth $(pgrep -cx scsynth)"'

    # 3. a dummy JACK — a clock, no soundcard. ⚠️ JACK's control socket is
    #    per-user: this must be the SAME user sclang runs as.
    ssh positron@$BOX 'pgrep -x jackd >/dev/null || \
      (setsid jackd -r -d dummy -r 48000 -p 1024 >/tmp/jackd.log 2>&1 &); \
      sleep 2; pgrep -cx jackd'

    # 4. somewhere for Qt's runtime dir, and the weighing script below
    ssh positron@$BOX 'mkdir -p /tmp/rt'

⚠️ **Put the script on the board as its own file — do not wrap it in a heredoc
inside the block above.** The block is indented, so the indentation would go
into the heredoc's own terminator and it would never close. `scp` it, or paste
it into `cat > /tmp/weigh.scd` at an unindented prompt. It lives in `/tmp` on the
board rather than in this repo because it is a measurement, not a fixture.

```supercollider
// /tmp/weigh.scd on the board
s.options.numOutputBusChannels = 2;
s.options.numInputBusChannels  = 2;
s.options.sampleRate = 48000;
s.options.memSize = 65536;
s.waitForBoot({
    var ctx = (
        server: s, xg: Group.new(s),
        // Engine_Pappus.sc — in_b is an ARRAY, out_b is a SINGLE bus
        in_b: [Bus.new(\audio, s.options.numOutputBusChannels,     1, s),
               Bus.new(\audio, s.options.numOutputBusChannels + 1, 1, s)],
        out_b: Bus.new(\audio, 0, 2, s)
    );
    Engine_Pappus.new(ctx, { arg e;
        var d = SynthDescLib.global[\pappus].def;
        ("WEIGH lite=" ++ e.lite ++ " tiny=" ++ e.tiny ++ " bare=" ++ e.bare
            ++ " bytes=" ++ d.asBytes.size
            ++ " ugens=" ++ d.children.size
            ++ " commands=" ++ e.listCommands.size).postln;
        Routine({ s.quit; 1.wait; 0.exit; }).play(AppClock);
    });
});
```

    # 5. FOUR ARMS, ONE AT A TIME, each in its own sclang. A fixed server port
    #    is a shared mutable global: two of these at once measure each other.
    for F in "" "PAPPUS_LITE=1" "PAPPUS_TINY=1" "PAPPUS_BARE=1"; do
      ssh positron@$BOX "env $F XDG_RUNTIME_DIR=/tmp/rt \
        QT_QPA_PLATFORM=offscreen QTWEBENGINE_DISABLE_SANDBOX=1 \
        sclang /tmp/weigh.scd 2>&1 | grep -E '^(WEIGH|Engine_Pappus|ERROR)'"
    done

    # 6. PUT THE BOARD BACK. It is a service that dials out on boot; leaving it
    #    stopped is an outage nobody is standing next to.
    ssh positron@$BOX 'sudo systemctl start positron-box; sleep 3; \
      systemctl is-active positron-box'

⚠️ **Confirm the arms are actually different before believing any of them.** The
`lite=`/`tiny=`/`bare=` fields are in the output for exactly that reason: an
environment variable that did not reach `sclang` gives four identical rows, and
four identical rows read as "the flags do nothing" rather than as "the flags
never arrived". And ⚠️ `PAPPUS_BARE=1` alone must report `tiny=true lite=true` —
if it does not, the ladder is not a ladder.

Then fill the table below, and add a BARE column to TINY.md's cut list.

## The rungs, as they stand

| | bytes | UGens | fits a browser |
|---|---|---|---|
| FULL | 118,597 | 2,780 | no |
| LITE | 73,297 | 1,706 | no |
| **TINY** | **63,297** | **1,451** | **yes** |
| BARE | ⚠️ **built, NOT WEIGHED** | — | — |

🔴 **BARE's row is empty because nobody has run it, and a number nobody
took does not go in a table.** The code is in `Engine_Pappus.sc` and the
commands that fill the row are at the end of the BARE section above. Until
somebody runs them, every claim about what BARE saves is arithmetic on a guess
— and TINY.md's own warning is that *the size does not track the UGen count*,
so the guess would be wrong in an unknown direction.

⚠️ **TINY's headroom is 2,239 bytes** against the 64 KiB `/d_recv` ceiling that
wasm scsynth enforces silently. The `report` control added on 2026-09-13 costs
sixteen `SendReply` UGens and two controls, and **that cost has not been
measured against this ceiling** — `SynthDesc` has no compiled def before the
engine allocates, so it needs a running engine to weigh. If TINY stops fitting,
that is not a reason to drop `report`; it is a reason to build BARE, which
removes far more than it adds.
