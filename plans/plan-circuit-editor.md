# plan-circuit-editor: a Circuit synth editor, and the one byte that destroys a patch

> **The ask**, 2026-09-21: *"also research circuit synth editor"*.
>
> 🟢 **THIS ONE IS UNUSUALLY WELL FOUNDED FOR A PLAN IN THIS REPOSITORY.** Two
> independent sources agree byte for byte: **64 patch files measured here with
> no device attached**, and **Novation's own Circuit Programmer's Reference
> Guide v1.1**, fetched and read. Where a plan normally has to say *this is
> documentation and nobody has run it*, this one can put a measurement beside
> the document and show they match.
>
> 🔴 **NOTHING IS BUILT. NO BYTE HAS BEEN SENT TO THE CIRCUIT**, and §6 argues
> that not sending one yet was the right call.
>
> | mark | means |
> |---|---|
> | 🔴 **MEASURED** | run here, output pasted. |
> | 📄 **DOC** | Circuit Programmer's Reference Guide v1.1, with the section. |
> | 📁 **REPO** | read out of this checkout. |
> | ⚖️ **INFERRED** | reasoned from something above. |
> | 🔌 **NEEDS THE HARDWARE** | needs a cable, a press, or a risk somebody accepts. |

---

## 1. The headline

🟢 **A CIRCUIT SYNTH EDITOR NEEDS NO SysEx AT ALL TO EDIT, AND THAT IS THE
FINDING.** 📄 The Programmer's Reference exposes **374 addressable parameters
live over ordinary MIDI**: **98 by control change and 276 by NRPN**, covering
Voice, Oscillator, Mixer, Filter, Envelope, LFO, Effects and EQ, Mod Matrix and
all eight Macro knobs, on **channel 1 for Synth 1 and channel 2 for Synth 2**.
An editor that only ever sends control changes and NRPNs can move every knob on
the synth engine and **cannot damage anything**, because nothing it can express
writes to flash.

🔴 **SysEx IS ONLY NEEDED TO READ A PATCH BACK, AND READING IS 9 BYTES AND IS
SAFE.** 📄 `Current Patch Dump Request` is `F0 00 20 29 01 60 40 <00|01> F7`,
nine bytes, and the Circuit answers with a 350 byte `Replace Current Patch`
message on its USB port.

🔴 **AND THE DANGEROUS MESSAGE DIFFERS FROM THE SAFE ONE BY ONE BYTE IN ONE
POSITION.** 📄 Both are 350 bytes with the same header:

| byte 6 | command | where it lands |
|---|---|---|
| `00` | Replace Current Patch | **RAM**, the sound currently loaded |
| `01` | **Replace Patch** | **FLASH**, permanently overwriting one of the 64 |

🔴 **THE CIRCUIT HAS NO FACTORY RESET**, which CLAUDE.md already records, so a
`01` where a `00` was meant is not recoverable from the device. **An editor in
this repository should be incapable of emitting `01`**, the same way
`/circuit/` is incapable of emitting a record command: 📁 REPO, that page's
`send()` has no path for a control change, a program change or SysEx, so a
record *cannot be expressed* and deleting a `disabled` flag still cannot produce
one. That is the shape to copy.

---

## 2. What was measured here, with no device

🔴 **`New Pack.circuitpack` HOLDS 64 PATCHES AND EVERY ONE IS 350 BYTES.**
`unzip`, then a byte census across all 64:

```
64 patches, all 350 bytes
constant across every patch: offsets 0..8  =  F0 00 20 29 01 60 00 00 00
first varying offset: 9        last varying offset: 348      final byte: F7
data bytes above 0x7F: 0
every patch name is printable ascii in offsets 9..24: True
parameter bytes that differ between patches: 246 of 324
```

🔴 **AND THE FILE LAYOUT MATCHES THE DOCUMENTED MESSAGE EXACTLY.** 📄 The guide
gives the format as `F0`, `00 20 29` manufacturer, `01` product type, `60`
product number, one command byte, one location byte, one reserved byte, **340
bytes of patch data**, `F7`, **350 in total**. Laid against the measurement:

| offsets | count | doc says | measured |
|---|---|---|---|
| 0..5 | 6 | `F0 00 20 29 01 60` | identical in all 64 |
| 6 | 1 | command | **`00` in all 64** = Replace Current Patch |
| 7 | 1 | location | **`00` in all 64** = Synth 1 |
| 8 | 1 | reserved, set to 0 | `00` in all 64 |
| 9..348 | **340** | patch data, addresses 0..339 | 246 of them vary between patches |
| 349 | 1 | `F7` | `F7` |

🟢 **SO THE PACK'S PATCH FILES ARE EXACTLY THE DOCUMENTED PORTABLE SINGLE PATCH
FORMAT**: 📄 *"use a sysex file containing a single Replace Current Patch sysex
message with the Location set to Synth 1"*. They are not a Novation container
format that needs decoding. **They are MIDI messages on disk.**

🔴 **THE PATCH TABLE IS 340 ROWS, ADDRESSES 0 TO 339**, and the first rows line
up against the bytes measured here:

| address | doc | patch_0 measured |
|---|---|---|
| 0..15 | `Patch_Name` | `Aciiid          ` |
| 16 | `Patch_Category`, 0..14 | `02` |
| 17 | `Patch_Genre`, 0..9 | `03` |
| 18..31 | `Patch_Reserved1..14` | all `00`, and constant across all 64 |
| 32 | `Voice_PolyphonyMode`, 0..2 | varies |
| 36 | `Osc1_Wave`, 0..29 | varies |
| 64 | `Filter_Frequency` | varies |
| 339 | `MacroKnob8_DepthD` | varies |

⚠️ **THE 78 ALWAYS IDENTICAL PARAMETER BYTES ARE NOT PADDING AND MUST NOT BE
TREATED AS SUCH.** 14 of them are the documented reserved block; the rest are
parameters that simply happen to sit at their default across these 64 patches.
An editor that skipped "constant" bytes would silently refuse to edit whatever
the factory never varied.

---

## 3. The live control surface, which is what an editor should actually use

📄 **98 control change parameters and 276 NRPN parameters.** The split is worth
knowing because it decides how hard an editor is:

- **Control changes** are one message and cover what a hand wants on a panel:
  oscillator wave and interpolation, pulse width, virtual sync, density, detune,
  semitones, cents, mixer levels, filter frequency, resonance and drive,
  envelope stages, LFO rates, and all eight macro POSITIONS.
- **NRPN** is four messages (CC 99 MSB, CC 98 LSB, CC 6 data MSB, and often CC
  38) and covers the deeper structure: every macro knob's four destination
  slots, the reverb and delay internals, the sidechain, FX bypass.
  📁 REPO **`midi-decode.mjs` ALREADY HAS `createNrpn()`**, written for `/dump/`
  and graded with no browser, so the hard half of NRPN is done and tested.

🔴 **THREE OF THIS REPOSITORY'S OWN MEASUREMENTS ARE CONFIRMED BY THE DOCUMENT,
WHICH IS THE POINT OF HAVING TWO SOURCES:**

| claim | measured here | documented |
|---|---|---|
| macros are CC 80..87 on channel 1 | 583 messages, full sweep | `macro knob 1..8 position`, CC 80..87 |
| drums are notes 60, 62, 64, 65 | measured on channel 10 | Drum Notes Table, identical |
| master filter is CC 74 on channel 16 | measured | Session Control, channel 16, CC 74 |

🔴 **AND ONE OF THIS REPOSITORY'S SENTENCES IS WRONG AND IS NOW FIXED.**
`HANDOFF.md` and `demo/circuit/index.html` said the channel 16 filter *"is not
what any manual says"*. 📄 It is what the **Programmer's Reference** says, in a
whole section called Session Control addressed to channel 16, with the filter's
resonance beside it on CC 71. 📁 And `plans/plan-circuit-model12.md` §3.5 had
**already tabulated that section** out of the same document. The sentence was
written from the USER GUIDE, which does not cover it, and generalised to *any
manual*. **The correction is in the page and this is the record of it.**

⚠️ **A COLLISION THAT PROVES THE `(channel, controller)` RULE.** CC 80 is macro
knob 1 on channel 1 **and** drum 4 pan on channel 10. 📁 `plans/plan-device-layouts.md`
§5.3 argues that the key must always be the pair; here is the case.

---

## 4. What an editor would be, in this repository

**Three things, in this order, and each is useful without the next.**

1. **A reader that needs no device.** Decode a `.syx` into 340 named parameters
   using the patch table, and show it. 🔴 It can be graded against the 64 files
   already in the repository, with no hardware, the way `midi-decode.mjs` is.
   ⚠️ The patch table has to be typed out of the PDF once; that is the only
   real work in this step, and it is exactly the kind of table that wants a
   generated module plus a check that the ranges in it accept every value
   present in all 64 patches. **That check is the whole test**: a mistyped row
   shows up as a factory patch holding an out of range value.
2. **A live editor that only ever sends CC and NRPN.** Cannot write flash,
   cannot be made to. This is the useful thing: a panel of real controls bound
   to the 374 parameters, on channels 1, 2 and 16.
3. 🔌 **A round trip: request a dump, edit, request again, diff.** This is the
   step that turns the patch table from documentation into measurement, because
   moving one control and diffing two 340 byte dumps says which address that
   control is, without trusting the table at all.

⚠️ **WHAT IT NEEDS FROM THE KIT THAT IS NOT THERE YET:** 📁 REPO
`demo/shell/midi.mjs` asks `{ sysex: false }`, already an open line in
`BACKLOG.md`. Step 1 needs nothing, step 2 needs nothing, **step 3 needs
`{ sysex: true }`**, which is a separate browser permission and a shared kit
change that must be made once by one agent.

---

## 5. The safety rules, which are not optional on this device

🔴 **AN EDITOR MUST NOT BE ABLE TO EXPRESS `Replace Patch`.** Not disabled: not
expressible. `/circuit/`'s guard is the precedent and it is asserted by firing
it on purpose with four shapes that could touch a recording, with a negative
control beside it so a guard that refused everything could not pass.

🔴 **AND `Replace Current Patch` IS NOT SAFE EITHER, IT IS ONLY RECOVERABLE.**
📄 It replaces the sound in RAM. If somebody has been editing on the device and
has not saved, that work is gone. ⚖️ Treat it as a write, ask before it, and
keep it out of step 2 entirely.

🔴 **THIS SAID `New Pack.circuitpack` IS NOT A FULL BACKUP AND THAT THE 32 USER
SESSIONS ARE NOT IN IT. IT IS WRONG, IT WAS WRONG WHEN IT WAS WRITTEN, AND IT
SURVIVED BEING FLAGGED ONCE.** `research/circuit-soundbank-2026-09-21.md` §9
measured the opposite and named this sentence as the contradiction; nobody came
back and changed it. The owner settled it on 2026-09-21: *"its in kristjanjansen
git"*.
✅ **MEASURED, TWICE, ON DIFFERENT DAYS:** the pack's `index.json` declares 32
sessions, 32 `.circuitsession` files are present, **32 distinct fingerprints of
32**, none empty, 84.57 to 89.58 per cent non-zero, and the names in the index
are the owner's own work (`Skyscraper`, `Insert Point`, `Chunk`, `Ghostly
Intro`, `Dub Circulation`, `Werk`, `Off Timed`, `Back To Earth`, and the ones
still called `User Session`, which measurement puts HIGHER than most of the
named ones). **The backup exists and it is tracked in the repository.**
⚠️ **WHAT IS STILL TRUE IS MUCH NARROWER AND IS WORTH KEEPING.** The pack was
taken on 2026-09-20 through Novation Components, so it is the device as it was
THAT DAY. Anything made on the Circuit since is in one place. That is an
argument for taking a fresh pack before a risky operation, not an argument that
there is no backup.
🔴 **AND THE COST OF A MISTAKE IS STILL REAL.** A `Replace Patch` overwrites
flash on an instrument with no factory reset, and recovering from the pack means
sending it back, which is itself one of the three operations that replace the
instrument's contents.

---

## 6. Why nothing was sent to the device today

⚠️ **I HAVE A WORKING CoreMIDI SENDER AND DID NOT USE IT FOR THIS.** A dump
request is read only and would have cost nothing; getting one byte of it wrong
is a message the device may interpret as something else entirely, on a box with
no undo, while its only backup is missing the sessions. **The measurement that
was available with zero risk, 64 files on disk against the published format,
answered the format question completely.** The remaining questions all need the
hardware and should be run by somebody who has decided to accept that.

🔌 **THE FIRST THING TO RUN, WHEN SOMEBODY DOES:** send the nine byte
`Current Patch Dump Request` for Synth 1 and watch `/dump/`. If a 350 byte
`Replace Current Patch` comes back, every claim in §2 is confirmed on the wire
as well as on disk, and step 3 is unblocked.

---

## 7. What this does not cover

- **Drum patches.** 📄 Drum control is its own table on channel 10 with a patch
  select CC per drum, and the drum patches themselves are samples rather than
  synth parameters. Nothing here applies to them.
- **Sessions.** 📄 Channel 16 program change selects a session, 0..31 instant and
  64..95 queued. The 32 sessions are the thing CLAUDE.md says matters most and
  they are **not** reachable through any message in this document.
- **Components.** Novation's own web editor does all of this and more, and is the
  supported route. This plan is about what a page in THIS repository could do
  with what it already has.

## Sources

- **Measured here, 2026-09-21**: `unzip` of `New Pack.circuitpack`, then a byte
  census of all 64 `patches/*.syx` in Python: lengths, constant and varying
  offsets, the 7 bit check, name extraction, command and location bytes.
- 📄 **Circuit Programmer's Reference Guide v1.1**, Paul Whittington and
  Jonathan Page, Novation / Focusrite:
  <https://fael-downloads-prod.focusrite.com/customer/prod/s3fs-public/downloads/Circuit%20Programmers%20Reference%20Guide%20v1-1_0.pdf>
  Read as text with `pdftotext -layout`; parameter counts are from parsing that
  text rather than from reading the tables by eye.
- 📁 `plans/plan-circuit-model12.md` §3.5, `research/measured-devices-2026-09-20.md`,
  `demo/shell/midi-decode.mjs`, `demo/circuit/index.html`.
