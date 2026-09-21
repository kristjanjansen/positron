# A purchased Circuit soundbank, measured, and the one press that would cost the sessions

> **The ask**, 2026-09-21: parse and analyse the Synth-Patches.com soundbank for
> Novation Circuit and Tracks, bought and dropped in `purchased/`.
>
> 🔴 **NOTHING WAS SENT TO THE INSTRUMENT AND NO PORT WAS OPENED.** No MIDI, no
> `amidi`, no SysEx, no CoreMIDI client, nothing enumerated. Every number below
> came off files on this disk. The Circuit on the desk was not touched and did
> not need to be.
>
> 🔴 **AND NOTHING FROM THIS ARCHIVE IS COMMITTED.** `purchased/` is gitignored
> whole and holds nothing tracked at all, and the product's own licence text says
> *"you agree not to copy, redistribute or resell any of the patches in this
> product"*. This
> document is measurements about the bank. It is not a patch list and not a
> transcription, which is why the 128 names are not reproduced here: the
> vendor's spreadsheet is part of what was sold.
>
> | mark | means |
> |---|---|
> | 🔴 **MEASURED** | run here on these files, output pasted. |
> | 📄 **DOC** | Circuit Programmer's Reference Guide, with the section. |
> | 📁 **REPO** | read out of this checkout. |
> | ⚖️ **INFERRED** | reasoned from something above, and said so. |
> | 🔌 **NEEDS THE HARDWARE** | needs a cable, a press, or a risk somebody accepts. |

---

## 1. The headline, which is a warning rather than a finding

🟢 **THE 128 LOOSE `.syx` FILES ARE THE SAFE KIND OF MESSAGE, ALL 128 OF THEM.**
Byte 6 is `00` on every single one, which is `Replace Current Patch` and lands in
RAM. **Not one file in this archive is the flash-writing `Replace Patch`.** 📁
`plans/plan-circuit-editor.md` §1 is the record of why that byte is the only one
worth checking first.

🔴 **AND THE DANGER IS SOMEWHERE ELSE ENTIRELY: THE TWO `.circuitpack` FILES
CARRY 32 BLANK SESSIONS EACH, AND THE VENDOR'S OWN INSTALL INSTRUCTIONS TELL YOU
TO SEND THEM TO THE DEVICE.** The archive's `_Manual and Important Note.txt`
says to open Novation Components, *"click Upload Pack and choose the right file"*,
then *"transfer the bank into your synth using Send to Circuit"*. `Send to
Circuit` is one of the three operations CLAUDE.md names as replacing the
Circuit's contents on a device with no factory reset.

**What is in those session slots, measured rather than assumed:**

| | owner's `New Pack.circuitpack` | purchased Circuit packs |
|---|---|---|
| session files | 32 | 32 (each pack) |
| size each | 53,248 bytes | 53,248 bytes |
| **distinct fingerprints** | **32 of 32** | **1 of 32** |
| entropy | 0.83 to 1.46 bits a byte | **0.01 bits a byte** |
| non-zero share | 84.6% to 89.6% | **0.1%** |
| first four bytes | `DEMO` | `INIT` |
| name in `index.json` | real names and `User Session` | **empty string, all 32** |

🔴 **A PURCHASED SESSION FILE IS 53,212 ZEROS AND 36 OTHER BYTES.** The 36 are
`INIT` at offset 0 and thirty-two `0x20` spaces in the name field. That is an
empty session, it is the same empty session 32 times, and **it is the same empty
session in both packs** (identical sha256). None of the owner's 32 is equal to
it.

⚖️ **SO THE INFERENCE, AND IT IS AN INFERENCE:** a pack that declares 32
sessions and ships 32 blanks, sent to the Circuit, writes 32 blanks over the 32
sessions the owner called *"very important"*. What is measured is the pack's
contents. What Components actually transmits per slot is 🔌 not measured here and
must not be tested on this device to find out.

🔴 **AND ALL THREE PACKS DISPLAY UNDER THE SAME NAME.** The `name` field in
`index.json` reads **`*New Pack`** in the owner's backup and in **both** purchased
Circuit packs. In Components' pack list the only backup of the instrument and the
two packs that would erase its sessions are three rows with identical labels.
**That is the hazard in its cheapest form: the mistake needs no
misunderstanding, only a misclick.**

✅ **THE SAFE WAY TO USE THIS BANK IS THE 128 LOOSE FILES.** They carry no
sessions, no samples and no pack container. Each is one `Replace Current Patch`
message for Synth 1, which is 📄 the documented portable single-patch format and
the same thing the owner's own 64 factory patches are.

---

## 2. What is actually in the archive

🔴 `unzip -l` reports **147 entries**, which is **144 files and 3 directory
entries**. Nothing hidden, no `__MACOSX`, no `.DS_Store`, no executable, no
script.

| what | count | what it is |
|---|---|---|
| `.syx` | 128 | one Circuit patch each, 350 bytes each |
| `.circuitpack` | 2 | 64 patches + 32 blank sessions each |
| `.circuittrackspack` | 1 | 128 patches for a **different instrument** |
| `.xlsx` | 1 | the patch list, 128 rows, name and category |
| `.txt` | 2 | the licence and install note, and `Have Fun! :D` |
| `.url` | 10 | Windows shortcuts to the vendor's other soundbanks |

⚠️ **THE TEN `.url` FILES WERE READ AND NOT FOLLOWED.** They are plain
`[InternetShortcut]` text pointing at the vendor's product pages and two social
accounts. **No request was made to any of them**, which is this repository's
standing rule about whose server it is.

🔴 **THE SAME 128 PATCHES ARE DELIVERED THREE TIMES, AND THAT IS MEASURED BY
CONTENT RATHER THAN BY NAME.** Fingerprinting the 340-byte payload of every
patch in every container:

```
individual .syx   128 files -> 128 distinct payloads
pack Part 1        64 files ->  64 distinct
pack Part 2        64 files ->  64 distinct
Tracks pack       128 files -> 128 distinct

individual vs Part1+Part2 : 128 fingerprints in both, 0 only in either
individual vs Tracks pack : 128 fingerprints in both, 0 only in either
```

**And the slot order matches too**: Part 1 is patches 001 to 064 in order, Part 2
is 065 to 128 in order, the Tracks pack is 001 to 128 in order. So the archive is
one bank of 128 sounds in three wrappers, and **there is no patch in any
container that is not also a loose `.syx`**.

---

## 3. Are they well formed? Yes, on every test, with four values out of range

🔴 **EVERY ONE OF THE 128, AND OF THE 256 PATCHES INSIDE THE THREE PACKS:**

```
length                    350 bytes            128/128, and 256/256 in packs
header bytes 0..5         F0 00 20 29 01 60    128/128 (Circuit packs likewise)
byte 6 command            00                   128/128  = Replace Current Patch
byte 7 location           00                   128/128  = Synth 1
byte 8 reserved           00                   128/128
final byte                F7                   128/128
payload bytes above 0x7F  0                    128/128  seven-bit clean
F0 or F7 inside payload   0                    128/128  not concatenated
name field printable      yes                  128/128  ascii, space-padded
```

✅ **THE DECODER WAS GRADED AGAINST THIS REPOSITORY'S OWN PUBLISHED
MEASUREMENT BEFORE IT WAS BELIEVED.** 📁 `plans/plan-circuit-editor.md` §2
reports the owner's `patch_0` as `Aciiid          `, category `02`, genre `03`.
The address map parsed here reads exactly that. And the plan's census of the
owner's 64 is reproduced to the digit: **246 parameter bytes varying of 324, 78
constant**.

⚠️ **THAT AGREEMENT TOOK ONE STEP OF RECONCILIATION AND IT IS THE DENOMINATOR
RULE AGAIN.** The first count here read **260 of 340** and the plan says 246 of
324, which looks like a disagreement and is not: the plan excludes the 16 name
bytes, and **14 of those 16 vary** while bytes 14 and 15 are a space in all 64.
`260 - 14 = 246`, `340 - 16 = 324`. Two right answers over two denominators.

🔴 **THE ONLY DEFECT FOUND IS FOUR OUT-OF-RANGE LFO PHASE OFFSETS, AND THEY ARE
THE VENDOR'S, NOT THE FACTORY'S.** 📄 The reference gives `LFO1_PhaseOffset` and
`LFO2_PhaseOffset` a maximum of 119.

| patch | address | value | max |
|---|---|---|---|
| `Broken Keys` | 85, LFO 1 | **127** | 119 |
| `Late Yoga` | 93, LFO 2 | **126** | 119 |
| `Tailed Bells` | 93, LFO 2 | **126** | 119 |
| `Single Echo` | 93, LFO 2 | **126** | 119 |

**The owner's 64 factory patches have zero values above 119** at either address,
and across all 448 patches examined no other address anywhere violates the
documented range. So the four are consistent, they travel through all three
containers, and they are the vendor's editor rather than a corruption.

⚖️ **WHICH IS WRONG, THE DOCUMENT OR THE VENDOR, IS NOT SETTLED HERE.** 120
steps of three degrees is exactly one cycle, which makes 0..119 look deliberate
and 126 look like a value the device wraps or clamps. That is arithmetic, not a
measurement. 🔌 The question needs a dump request and a diff at the instrument,
and it is worth nobody's risk: the audible consequence of a wrong LFO start
phase is nothing.

---

## 4. What the patches are, and how they differ from the factory bank

The address map was parsed out of 📄 the Programmer's Reference and covers all
**340 addresses, 0 to 339**, including the two bitfield rows at 91 and 99 that a
column parser cannot see. Values are named against 📄 the Osc Waveform Table,
Filter Table, LFO Waveform Table and Mod Matrix Table.

### 4.1 The bank is soft, wide and polyphonic, and the factory bank is not

| | purchased 128 | owner 64 factory |
|---|---|---|
| polyphonic | **116** | 37 |
| monophonic | 12 (no mono AG) | 22 mono, 5 mono AG |
| second oscillator silent | 11 | 26 |
| filter drive engaged | 87 | 22 |
| chorus engaged | **119** | 9 |
| distortion engaged | 48 | 6 |
| EQ moved off centre | **124** | 21 |
| median amp attack | 13 | 2 |
| median amp release | **107** | 40 |
| release above 80 | **119 of 128** | 4 of 64 |

🔴 **THE RELEASE FIGURE IS THE CHARACTER OF THE WHOLE BANK IN ONE NUMBER.** 119
of 128 patches hold a release above 80 against a factory median of 40. This is a
bank of long tails, and the category mix agrees: **97 of 128 are Keyboard, Motion
or Pad**.

**Oscillator waves, both oscillators pooled over 256 slots:** sine 81, sine table
49, sawtooth 43, triangle 27. **Those four are 200 of 256.** The factory bank
spreads much wider over the same 30 waves, with pulse width and square prominent
and no single wave above 20. So the purchased bank is tonally narrower and
rounder by choice.

**Filter types.** Purchased: low pass 24dB 68, band pass 6/6 22, band pass 12/12
21, low pass 12dB 7, high pass 12dB 8, high pass 24dB 2. Factory: low pass 24dB
43, low pass 12dB 12, and only 6 band pass of 64. **Band pass is 43 of 128 here
against 6 of 64 there**, which is the other half of the soft-and-hollow sound.

**Ring modulation is used 38 times and noise 48**, against 5 and 5 in the factory
bank.

### 4.2 The LFOs, which is the sharpest difference of all

**Definition first, because the number depends on it:** an LFO counts as reaching
something when a mod matrix slot whose depth is not 64 (64 is zero depth) names
`LFO 1 +`, `LFO 1 +/-`, `LFO 2 +` or `LFO 2 +/-` as either of its two sources.

| | purchased 128 | owner 64 factory |
|---|---|---|
| neither LFO reaches anything | **2** | 43 |
| LFO 1 only | 5 | 13 |
| LFO 2 only | 9 | 7 |
| **both LFOs** | **112** | **1** |
| any LFO | **126 of 128** | 21 of 64 |

🔴 **126 OF 128 PATCHES MODULATE, AND 112 RUN BOTH LFOs.** The factory bank runs
both in exactly one patch of 64. Among the LFOs that reach something the waveform
is sine 104 and **random sample-and-hold 82**, then square 15, sawtooth 10,
triangle 10, piano envelope 8. Random S/H at that frequency is what the `Motion`
category is made of.

**Mod matrix use**: a median of 4 slots per patch, most commonly 4 (39 patches),
then 5 (24) and 3 (22), with one patch using 11. Destinations, counted over all
slots in use: osc 1 & 2 pitch 172, filter frequency 63, osc 2 level 51, osc 1
level 40, osc 1 pulse width 28, osc 2 virtual sync 22, **LFO 1 rate 19**. The
factory bank's commonest destination is filter frequency and its commonest
non-`direct` source is **velocity** (31), which appears only 3 times in the
purchased bank.

🔴 **THE VENDOR NEVER TOUCHES MOD SLOTS 12 TO 20.** Across all 128 patches slots
1 to 11 are used and slots 12 to 20 sit at their documented defaults in every
single patch. The factory bank reaches slot 15. ⚖️ That reads as one person
working within a habit rather than as a limit of the format.

### 4.3 What the category byte means, derived rather than read

📄 **THE REFERENCE GIVES `Patch_Category` A RANGE OF 0..14 AND NO LABEL TABLE.**
Neither does it label `Patch_Genre` (0..9). Correlating the byte at address 16
against the vendor's own spreadsheet column across 128 patches:

| byte | vendor's label | agreement |
|---|---|---|
| 1 | ARP | 15 of 17 |
| 2 | Bass | 4 of 4 |
| 3 | Bell | 4 of 4 |
| 6 | Keyboard | 47 of 49 |
| 7 | Lead | 7 of 7 |
| 8 | Motion | 28 of 28 |
| 9 | Pad | 19 of 19 |

⚠️ **THAT IS SEVEN OF FIFTEEN VALUES AND IT IS ONE VENDOR'S WORDING, NOT
NOVATION'S PUBLISHED LIST.** The four disagreements are the vendor's own
inconsistency between their spreadsheet and what they saved. The owner's factory
bank uses **5, 10, 11, 12 and 14 as well**, and this archive contains no evidence
of what those five mean. 🔌 Reading the remaining eight needs Components or the
device.

🔴 **AND THE GENRE BYTE IS UNSET ON ALL 128.** Address 17 is `0` in every
purchased patch, while the factory bank spreads across 1 to 9. So the bank ships
with no genre tag at all, which is cosmetic and worth knowing before anybody
builds a browser that sorts on it.

### 4.4 The macro knobs, which cannot be read yet

Every patch wires macro routing heavily: a median of **16 of 32 possible macro
legs** carry a non-zero depth (factory median 13), over **53 distinct destination
values**.

🔴 **BUT 📄 THE REFERENCE GIVES MACRO DESTINATIONS A RANGE OF 0..70 AND NO
TABLE**, where every mod matrix destination says *"See Mod Matrix Table"*. So 71
destinations have no published labels and the numbers above count routing without
naming what it reaches. **This also bounds the LFO claim in §4.2**: an LFO routed
only through a macro knob would not be counted there, so 126 of 128 is a floor
rather than a total.

---

## 5. The Circuit Tracks pack, and the one byte that decides it

🔴 **IT IS FOR THE OTHER INSTRUMENT, AND TWO INDEPENDENT THINGS IN THE FILE SAY
SO.**

**First, `index.json`:**

| field | Circuit packs | Tracks pack |
|---|---|---|
| `product` | `circuit` | **`circuit-tracks`** |
| `version` | `2.0` | `2.0` |
| slot container | `sessions`, 32 | **`projects`, 64** |
| `patches` | 64 | **128** |

**Second, and this is the measurement worth keeping, the patch header:**

```
Circuit patch   F0 00 20 29 01 60 00 00 00
Tracks patch    F0 00 20 29 01 64 00 00 00
                                ^^
```

🔴 **OFFSET 5 IS THE PRODUCT NUMBER AND IT IS `0x60` FOR CIRCUIT AND `0x64` FOR
CIRCUIT TRACKS**, on all 128 files in each. 📄 The reference specifies `60` for
the Circuit. Everything else about the Tracks files is identical to the Circuit
ones: 350 bytes, command `00`, location `00`, terminating `F7`, seven-bit clean,
**and the same 128 payloads byte for byte**.

⚖️ **SO THE ANSWER FOR THE INSTRUMENT ON THIS DESK IS: THE TRACKS PACK IS NOT
FOR IT, AND IT IS ALSO NOT NEEDED.** Not for it, because the pack declares
`product: circuit-tracks`, offers 128 patch slots the Circuit does not have, and
its patch messages carry another device's product number. Not needed, because the
128 sounds inside it are the same 128 already delivered as loose `.syx` in the
Circuit's own format. ⚠️ Whether Components refuses the pack outright or the
Circuit ignores a `0x64` message is 🔌 unmeasured, and there is no reason to find
out: **a device should ignore SysEx not addressed to it, and that reasoning is
not a substitute for a test nobody needs to run.**

🔴 **THE PACKS ALSO DECLARE SAMPLES THEY DO NOT CONTAIN.** Both Circuit packs and
the Tracks pack declare **64 samples in `index.json` and ship zero `.wav`
files**; the Tracks pack declares 64 projects and ships none of those either.
📁 CLAUDE.md already records that fewer WAVs than sample rows is normal rather
than damage. Here it is all of them, and the owner's own pack by contrast ships
64 of 64.

---

## 6. The spreadsheet and the two text files

✅ **THE SPREADSHEET IS THE MOST USEFUL FILE IN THE ARCHIVE AND IT IS THE ONLY
PLACE THE REAL NAMES EXIST.** 128 rows, no header, three populated columns:
number 1 to 128 contiguous, name, and category from a set of seven (Keyboard 48,
Motion 28, Pad 21, ARP 15, Lead 7, Bell 5, Bass 4). Columns D to G are empty.

🔴 **IT MATTERS BECAUSE THE PATCH NAME FIELD IS 16 BYTES AND TRUNCATES.** Eight
names are cut inside the patches themselves and survive only in the sheet, for
example `Under The Influe`, `Make Less Tensio`, `Gentle Progressi` and
`Overdrived Kalim`. **A patch browser built on the embedded names alone would
show the truncated forms**, because that is genuinely all the instrument carries.

🔴 **AND THE SHEET DISAGREES WITH THE FILES AT THREE ROWS, WHICH IS A ONE-ROW
SHIFT WITH SOMETHING LOST AT THE END OF IT.**

| # | name in the `.syx` | name in the sheet |
|---|---|---|
| 100 | `Metal Bells` | Metal Bells |
| 101 | **`Metal Bells`** | **Orient 2** |
| 102 | `Orient 2` | **Empty Room** |
| 103 | `Empty Room` | **Detuned Radio** |
| 104 | `Under The Influe` | Under The Influence |

**`Detuned Radio` is documented and does not exist in any container**, and patch
101 carries patch 100's name. ⚖️ The most likely reading is that 101's name was
saved from the patch before it and the list slid by one until it re-synced at
104, but **which sound is which cannot be settled from the files**: the content
of 101 is genuinely distinct from 100, so the patch is there and only its label
is wrong. Settling it needs somebody to listen.

⚠️ **AND THIS IS THE `name is not evidence` LESSON POINTING THE OTHER WAY.** The
bank has **four repeated names** (`Sunset Recorder`, `Deep Modulation`, `Old
Times`, `Metal Bells`, each twice) and **128 distinct payload fingerprints with
zero duplicates**. Where the session case had identical-looking names hiding real
work, here the names suggest duplicated sounds and the content says all 128 are
different. Seven further rows differ by plain typo, in both directions:
the sheet has `Virtual Ligt` where the patch has `Virtual Light`, and the patch
has `Quick Thougts` and `Background Colop` where the sheet is spelled correctly.

**The two text files.** `_Manual and Important Note.txt` is the licence quoted in
the preamble plus the Components install procedure, and it is the thing that
makes §1 a warning rather than a curiosity. `Last But Not Least.txt` is twelve
bytes reading `Have Fun! :D`.

---

## 7. Is any of it redundant with what the owner already has?

🔴 **NO. ZERO OVERLAP, MEASURED BY CONTENT.** Fingerprinting the 340-byte payload
of the owner's 64 factory patches against every distinct payload in the purchased
archive:

```
owner distinct payloads          64
purchased distinct payloads     128
identical patches                 0
```

**So all 128 are new sounds**, and the redundancy in this archive is entirely
internal: three containers holding one bank.

⚠️ **THE COMPARISON IS OF PARAMETER CONTENT, NOT OF SOUND.** Two patches can
differ in one byte of an EQ frequency and be indistinguishable to a listener.
What is proved is that no purchased patch is a byte copy of a factory one, which
is the question a fingerprint can answer.

🔴 **AND THE BANK DOES NOT FIT.** The Circuit has 64 synth patch slots and this
is 128 patches. 📄 A full bank load is 64 concatenated messages. So using this
bank as a bank means **choosing 64 of 128 and overwriting all 64 factory
patches**, which are the ones measured above and are not in `New Pack.circuitpack`
twice. ⚖️ The loose `.syx` route avoids the choice entirely: one message auditions
one sound in RAM and writes nothing.

---

## 8. What could not be settled

- 🔌 **Whether Components' `Send to Circuit` writes the session slots.** The pack
  contents are measured. What the tool transmits is not, and the only way to find
  out costs the sessions if the answer is yes.
- 🔌 **Whether the Circuit clamps, wraps or rejects an LFO phase offset of 126.**
  Needs a dump request and a diff.
- 🔌 **Eight of the fifteen `Patch_Category` values and all ten `Patch_Genre`
  values.** Not in the Programmer's Reference, not derivable from this archive.
  The seven in §4.3 came from one vendor's spreadsheet and are that vendor's
  wording.
- 🔌 **The 71 macro knob destinations.** No published table, so §4.4 counts
  routing it cannot name, and the LFO figure in §4.2 is a floor.
- **Which sound is `Detuned Radio`.** The files hold 128 distinct patches and one
  wrong label; only listening resolves it.
- **How any of it sounds.** Nothing here was played. Every claim in §4 is about
  parameter values, and a bank of long releases and heavy modulation is a
  description of numbers rather than a judgement of the sounds.

---

## 9. What this changes elsewhere in the repository

🔴 **`plans/plan-circuit-editor.md` §5 CONTAINS ONE WRONG SENTENCE AND IT
CONTRADICTS CLAUDE.md.** It reads: *"`New Pack.circuitpack` IS THE ONLY BACKUP
AND IT IS NOT A FULL ONE. CLAUDE.md: the 32 user sessions are not in it."*
**They are in it.** Measured again today: the pack's `index.json` declares 32
sessions, 32 `.circuitsession` files are present, all 32 are distinct, none is
empty, and the non-zero share of 84.6% to 89.6% reproduces CLAUDE.md's own
figure. `research/circuit-session-format-2026-09-21.md` §3 carries a softer form
of the same claim, that the pack holds *"the PACK's session slots"* while the 32
live ones are unexported. ⚠️ **That distinction may well be right and it is not
what the editor plan says**, and the editor plan's version is the one that would
stop somebody trusting the backup they have.

⚠️ **A NEW STRUCTURAL FACT FOR THE SESSION FORMAT WORK.** A `.circuitsession`
comes in at least two shapes: the owner's begin `DEMO` and are 0xFF-padded erased
flash images, and a blank begins `INIT` and is zero-filled. Any parser written
against the 0xFF block map in `research/circuit-session-format-2026-09-21.md`
will meet a zero-filled `INIT` file the first time somebody opens a stock pack,
and its run-length block finder will find nothing.

✅ **AND THE PADDING TRAP WAS CHECKED HERE RATHER THAN ASSUMED AWAY.** The 128
patch payloads together are 43,520 bytes at **3.79 bits a byte**, 128 distinct
values, no 0xFF at all, and the longest single-value run anywhere is 17 bytes.
Per patch the entropy runs 3.04 to 3.95. **These 340 bytes are parameter data and
the session-file mistake does not apply to them**, which is worth one command to
know before quoting any percentage over them.

## 10. The recommendation

1. **Audition from the 128 loose `.syx`, one at a time.** They are `Replace
   Current Patch`, they land in RAM, and they are the only route in this archive
   that cannot write flash or touch a session. ⚠️ They still overwrite the sound
   currently loaded, so they are recoverable rather than safe.
2. **Do not send either `.circuitpack` to the Circuit until the 32 live sessions
   are exported and verified.** Both carry 32 blank sessions and both display as
   `*New Pack`, the same label as the only backup.
3. **Delete nothing and rename nothing inside `purchased/`**, but consider giving
   the owner's backup a distinct `name` in Components so three rows stop looking
   alike. ⚠️ That means editing a pack's `index.json`, which is a change to the
   only backup, so it is the owner's call and not an agent's.
4. **The Tracks pack has no use on this desk.** It is a different product string,
   a different product number byte, and the same 128 sounds.
5. **The spreadsheet is worth keeping next to any patch browser**, because eight
   real names exist nowhere else.

## Sources

- **Measured here, 2026-09-21**, with no device attached and no port opened:
  header, command byte, location byte, length, terminator and seven-bit census
  of all 128 loose `.syx` and all 384 patches inside the four packs; sha256
  payload fingerprints across all five sets; entropy, byte histogram and
  run-length checks on the patch payloads and on all 96 session files; parameter
  decode against the 340-address table; correlation of the category byte with
  the vendor spreadsheet.
- 📁 `demo/shell/unzip.mjs` opened all four packs, 164, 99, 99 and 130 entries,
  stored and deflated, no zip64 and nothing encrypted. No second zip reader was
  written.
- 📄 **Circuit Programmer's Reference Guide 1.3**, Novation / Focusrite, read
  from a copy already on this machine with `pdftotext -layout`. The 340-row Synth
  Patch Format table, the Osc Waveform, Filter, LFO Waveform and Mod Matrix
  tables. ⚠️ **No network request was made for it.** 📁
  `plans/plan-circuit-editor.md` cites v1.1; the patch table agrees with that
  plan's published spot checks at addresses 0, 16, 17, 32, 36, 64 and 339.
- 📁 `plans/plan-circuit-editor.md`, `plans/plan-circuit-patches.md`,
  `research/circuit-session-format-2026-09-21.md`,
  `demo/shell/circuit-cc.mjs`, `.gitignore`, `CLAUDE.md`.
  ⚠️ **`purchased/README.md` WAS READ AT THE START OF THIS WORK AND NO LONGER
  EXISTS.** A peer session deleted it at 11:18 in commit `ef22699`, which also
  changed the rule from `purchased/*` plus a negation to a plain `purchased/`.
  The README's own sentence about un-ignoring itself was true when it was read
  and false an hour later, which is this project's stale-file lesson happening
  inside one task.
- **The archive's own** `_List of Patchess and Types.xlsx` and
  `_Manual and Important Note.txt`. The ten `.url` files were read as text and
  **not followed**.
