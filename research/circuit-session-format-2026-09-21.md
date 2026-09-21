# The Circuit session file, measured, and who has already done this

> **The ask**, 2026-09-21: *"Look for session parsing and writing"*.
>
> 🔴 **THIS DOCUMENT CORRECTS ONE THIS SESSION PUBLISHED SIX HOURS EARLIER.**
> `plans/plan-circuit-samples.md` §7 said a session is *"not seven bit, so it is
> not SysEx payload"*, on the evidence that **44,071 of 53,248 bytes are above
> 0x7F**. That number is right and the conclusion drawn from it is wrong: those
> bytes are **0xFF padding**, not data. The real payload is 9,180 bytes and
> **two of them** are above 0x7F. The plan is corrected.
>
> ⚠️ **THE MISTAKE IS THE PROJECT'S OWN NAMED ONE**: a statistic measured over
> the whole file rather than over the part in question. Counting high bytes in a
> file that is four fifths erased flash measures the erasure.

---

## 1. What a session actually is, measured

`New Pack.circuitpack`, `sessions/session_0.circuitsession`, one of 32 that are
all exactly **53,248 bytes**.

```
53,248 bytes, 115 distinct byte values, entropy 0.91 bits per byte
0xFF   44,069   (82.8%)     erased flash
0x00    6,941
0x60     1,495
everything else            about 743 bytes
```

🔴 **ENTROPY OF 0.91 BITS PER BYTE IS THE HEADLINE.** Random data is 8.0 and
ordinary structured binary is 4 to 6. **This file is almost entirely empty**,
and nothing about it is encrypted or compressed.

**The container, mapped by finding every run of 0xFF 16 bytes or longer:**

| | |
|---|---|
| data blocks | **49** |
| their sizes | **1 x 528, 15 x 452, 32 x 32, 1 x 848** |
| real data | **9,180 bytes of 53,248**, which is 17 per cent |
| padding runs | 49, of three lengths only: **688, 1056, 5156** |
| the stride | **1508 bytes** for the 452 byte blocks, which is 452 of data and 1056 of pad |
| tail | the last pad ends exactly at the end of the file |

🔴 **AND THE PAYLOAD IS SEVEN BIT.** Of the 9,180 non-0xFF bytes, **2** are
above 0x7F. So a session could travel over MIDI as SysEx with almost no
encoding, which is the opposite of what was written this morning.

⚠️ **WHAT THAT DOES NOT SAY IS THAT NOVATION MOVES IT THAT WAY.** The
Programmer's Reference documents SysEx for PATCHES and says nothing about
sessions. *Could* and *does* are different claims and only the first is
measured.

**A first look at the shape inside a block**, offset 0x30 onward:

```
61 32 00 00 ... 38 00 00 01 ... 01 00 00 00 37 02 00 29
00 00 00 60  00 00 00 60  00 00 00 60  00 00 00 60  00 00 00 60
01 00 00 00 37 08 00 50
00 00 00 60  00 00 00 60  ...
```

⚖️ **INFERRED, and it is a reading rather than a finding:** an eight byte record
followed by four byte entries, where `0x60` is 96 and is the commonest non zero
value in the file. 96 is a plausible default velocity. **Nothing here has been
confirmed against a session whose contents are known**, which is the experiment
§5 describes.

---

## 2. Who has already done this, and it is for a different device

🌐 **THE WORK EXISTS AND IT TARGETS CIRCUIT TRACKS, NOT THE ORIGINAL CIRCUIT.**
That distinction is the whole answer to the ask, so it is first:

| | ours | theirs |
|---|---|---|
| device | **Novation Circuit** (2015) | **Circuit Tracks** (2021) |
| extension | `.circuitsession` | `.ncs` |
| size | **53,248 bytes** | **160,780 bytes** |
| pack | `.circuitpack` | `.circuittrackspack` |

**[ncstool](https://github.com/Ondrysak/ncstool)** is the substantial one. It
**reads and writes**: it prints timing, scale, FX, scenes and chains, synth and
MIDI pattern summaries and drum patterns as ASCII; it clones sessions, edits
drum patterns and saves them; it repacks archives and generates projects from
templates. 🌐 It reports **97.3 per cent of a 160,780 byte session parsed**, and
it ships `FORMAT_MAP.md` and `offsets.toml`. ⚠️ **Its licence is not stated on
the repository page**, which for this project means read it, do not take it.

🟢 **AND ITS BEST IDEA IS NOT A BYTE OFFSET.** It carries the bytes it does not
understand **raw, per pattern, for round trip fidelity**. That is exactly the
rule anything written here should follow: a writer that only emits the fields it
understands silently destroys everything it does not.

**[CircuitTracksReverseEngineering](https://gist.github.com/userx14/664f5e74cc7ced8c29d4a0434ab7be98)**
is a firmware teardown, and the useful part is that Novation's own validator
**names its sections**. Read out of the decompiled WASM validator, in the order
it checks them:

```
header and feature flags, timing, scenes table, scene chain bounds and padding,
pattern chain table, synth patterns (five chunks A-E), synth track info,
drum patterns (five chunks A-E), drum mute state, default drum choices,
MIDI patterns (five chunks A-E), MIDI track info, scale settings, FX presets,
MIDI keyboard octaves, labels (three helpers)
```

with error strings including `"Session colour out of range"`, `"Tempo out of
range"`, `"Scene pattern chain padding not set to 0"` and `"has an invalid drum
choice value"`.

🔴 **THAT LIST IS A HYPOTHESIS FOR US AND NOT A MAP.** It is a different
device's file, three times the size, with MIDI tracks the original Circuit does
not have. What transfers is the SHAPE of the answer: a session is a sequence of
named sections with per section padding, which is exactly what the block map in
§1 looks like.

**Also found, and less relevant:** `circuit-patch-converter` (converts patches
between Circuit and Circuit Tracks), `rk002-circuit-song-mode`, and
`Unofficial-Novation-Circuit-MIDI-CC-JavaScript-data-library`, which is the same
control change table `demo/shell/circuit-cc.mjs` now generates from the
published reference.

🔴 **NOTHING WAS FOUND THAT PARSES `.circuitsession`.** Not a partial decoder,
not a format note. If somebody wants the original Circuit's sessions read, it is
original work.

---

## 3. What writing one would take, and why it is not the next thing

✅ **READING AND REWRITING THE CONTAINER IS ALREADY POSSIBLE AND COSTS
NOTHING.** `demo/shell/unzip.mjs` opens the pack, the 49 block map above is
deterministic, and a writer that changes nothing produces a byte identical file.
**That round trip is the first thing to build and the only thing that can be
proved without a device**: read 32 sessions, write them back, compare md5.

🔴 **EVERY STEP AFTER THAT NEEDS THE HARDWARE AND THE HARDWARE HAS NO UNDO.**
Decoding a field means making a change on the device, exporting, and diffing
against the same session before the change. That is the only honest method, and
it costs one Components export per field. It also means putting sessions back on
the Circuit, which is the operation CLAUDE.md warns about in capitals.

⚠️ **AND THE 32 SESSIONS ARE STILL NOT BACKED UP.** `New Pack.circuitpack`
contains the PACK's session slots. The 32 live on the device are the thing the
owner called *"very important"* and nobody has exported them. **Decoding a
format is a poor reason to be the first person to write to that device.**

---

## 4. What this changes in the plans

- `plans/plan-circuit-samples.md` §7 said sessions are not seven bit and
  therefore not SysEx payload. **Corrected**: the payload is seven bit, and the
  earlier number was counting erased flash.
- The recommendation in that section does **not** change, and for a better
  reason than the wrong one it had: sessions are worth reading, a container
  round trip is free, and **writing to the device stays behind the backup that
  has not happened**.

## 5. The experiment that would settle the semantics

🔌 **ONE SESSION, ONE CHANGE, TWO EXPORTS.** Export a session, change exactly
one thing on the device (one step on one drum track), export again, diff. The
block map in §1 turns that diff into a field, and a dozen of those is most of a
format. **It needs a person at the Circuit and about an hour**, and it should
happen after the 32 sessions are off the device and not before.

## Sources

- **Measured here, 2026-09-21**: byte census, entropy and block mapping of all
  32 `.circuitsession` files in `New Pack.circuitpack`, in Python.
- 🌐 [ncstool](https://github.com/Ondrysak/ncstool),
  [Circuit Tracks firmware reverse engineering gist](https://gist.github.com/userx14/664f5e74cc7ced8c29d4a0434ab7be98),
  [circuit-patch-converter](https://github.com/yuriizubkov/circuit-patch-converter),
  [Unofficial Novation Circuit MIDI CC library](https://github.com/drbourbon/Unofficial-Novation-Circuit-MIDI-CC-JavaScript-data-library).
