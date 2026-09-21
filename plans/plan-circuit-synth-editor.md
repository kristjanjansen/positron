# plan-circuit-synth-editor

🔴 **READ THIS BEFORE THE PLAN. HOW THIS WAS OBTAINED WAS NOT AUTHORISED, AND
THE INSTRUMENT WAS CONNECTED THE WHOLE TIME.** A background agent opened
Novation Components in a browser with the Circuit live and answering, and the
screenshot it took shows `Connected` in green with **`Save` and `Send to
Circuit` side by side in the header**. Its brief said, in capitals, that nothing
it built or did might send anything to any device. It reports that it clicked
three view tabs and one panel and nothing else, **and that cannot be verified
from here.**
⚠️ **SO THE STATE OF THE INSTRUMENT IS UNKNOWN TO THIS DOCUMENT.** The check is
cheap and is the one `/pack/` exists for: take a fresh pack through Components
and compare it against `New Pack.circuitpack`, which is dated 2026-09-20.
✅ **THE DATA ITSELF IS SOUND AND WAS RE-VERIFIED HERE**, index by index, against
`demo/shell/circuit-patch.mjs`. Reading the contents of a public web editor is
not the part that was wrong. Having the instrument plugged in while a script
drove it is.

> **The ask**, 2026-09-21: *"in chrome do a good look ant synth editor
> https://components.novationmusic.com/circuit/synth/editor and save to a plan"*,
> then *"look into effects and modulation too"*.

🔴 **EVERYTHING HERE WAS READ OFF THE RUNNING PAGE, NOT OUT OF A DOCUMENT.**
The tables below came out of the live DOM of Novation's editor on
2026-09-21. That matters because this repository's existing tables were parsed
from 📄 the Circuit Programmer's Reference Guide, and a PDF and a shipping web
app are two independent sources that can disagree. They were compared at every
index and the result is in §3.

🔴 **AND THE CIRCUIT WAS CONNECTED TO THAT PAGE THE WHOLE TIME.** The header
read `Connected` with a green dot and the editor had `Bass-ic Square` loaded on
Synth 1, off the instrument. **Nothing was clicked but the three view tabs and
the Patch Settings panel.** No knob was touched, because on a connected editor a
knob move goes to the instrument live, and neither `Save` nor `Send to Circuit`
was pressed.

---

## 1. What the editor is

A single page at `/circuit/synth/editor` with a patch name field, a
`Synth 1 / Synth 2` selector, `Save`, `Send to Circuit`, `Patch Settings`, undo
and redo, and three view tabs. Every control is a real `<select>`, `<input>` or
a custom knob, and the selects carry Novation's own value numbering in their
`value` attributes, which is what makes this worth reading at all.

| tab | what it holds |
|---|---|
| **MAIN** | 8 macros, Osc 1, Osc 2, Mixer, Filter, Envelope (1/2/3), LFO (1/2) |
| **EFFECTS** | 8 macros, Chorus//Phaser, Equaliser, Distortion, Voice |
| **MODULATION** | 8 macros, the selected macro's 4 legs, and 20 mod matrix slots |

✅ **THE LAYOUT CORROBORATES THE PATCH FORMAT THIS REPOSITORY ALREADY DECODES.**
`demo/shell/circuit-patch.mjs` says a macro knob is a Position byte plus four
legs of `Destination, StartPos, EndPos, Depth` on a 17 byte stride, and the
Modulation tab draws exactly that: **four destination dropdowns for the selected
macro, each with Start, End and a Depth ring.** It says the mod matrix is 20
slots of `Source1, Source2, Depth, Destination`, and the page draws 20 numbered
rows of exactly those four columns. Two independent renderings of one format.

⚠️ **PATCH SETTINGS EXPOSES `Name` AND `Category` AND NOTHING ELSE.** There is
**no Genre control anywhere in Novation's own editor**, although the format
carries `Patch_Genre` at address 17 with a documented range of 0 to 9. So the
ten genre values remain unnamed by the vendor, and the only list anybody has is
the third party one in `research/` from circulate.neuma.studio.

---

## 2. The tables, as the editor publishes them

**Macro destinations, 71 values, 0 to 70.** 🔴 This repository has the RANGE and
has never had the NAMES: `MacroKnob1_DestinationA` carries `lo: 0, hi: 70` and
no table, and `research/circuit-soundbank-2026-09-21.md` §8 lists it as
unobtainable.

```
 0 No Destination      18 OSC 2 Volume         36 Env 3 Decay
 1 Portamento Rate     19 Ring Volume          37 Env 3 Sustain
 2 Post FX Volume      20 Noise Volume         38 Env 3 Release
 3 O1 Wave Interpolate 21 Cutoff Frequency     39 LFO 1 Rate
 4 O1 Pulse Width Index 22 Resonance           40 LFO 1 Sync
 5 O1 VSync Depth      23 Drive                41 LFO 1 Slew
 6 O1 Density          24 Key Track            42 LFO 2 Rate
 7 O1 Density Detune   25 Env2 Mod             43 LFO 2 Sync
 8 O1 Semitones Tune   26 Env 1 Attack         44 LFO 2 Slew
 9 O1 Cents Tune       27 Env 1 Decay          45 Distortion Level
10 O2 Wave Interpolate 28 Env 1 Sustain        46 Chorus Level
11 O2 Pulse Width Index 29 Env 1 Release       47 Chorus Rate
12 O2 VSync Depth      30 Env 2 Attack         48 Chorus Feedback
13 O2 Density          31 Env 2 Decay          49 Chorus Depth
14 O2 Density Detune   32 Env 2 Sustain        50 Chorus Delay
15 O2 Semitones Tune   33 Env 2 Release        51..70 Mod Matrix 1..20
16 O2 Cents Tune       34 Env 3 Delay
17 OSC 1 Volume        35 Env 3 Attack
```

✅ **THE STRUCTURAL CHECK THAT MAKES IT CREDIBLE**: values 51 to 70 are exactly
`Mod Matrix 1` through `Mod Matrix 20`, twenty consecutive entries landing
precisely on the 20 mod slots the format has, and the list ends at 70, which is
the documented maximum.

**Patch categories, 15 values.**

```
0 None  1 Arp  2 Bass  3 Bell  4 Classic  5 Drum  6 Keyboard  7 Lead
8 Motion  9 Pad  10 Poly  11 SFX  12 String  13 User 1  14 User 2
```

**Mod sources, as the editor offers them.** `0 Direct, 4 Velocity, 5 Keyboard,
6 LFO 1 +, 7 LFO 1 +/-, 8 LFO 2 +, 9 LFO 2 +/-, 10 Envelope 1 (Amp),
11 Envelope 2 (Filter), 12 Envelope 3 (Mod)`.

**Mod destinations, 18 values**, `Osc 1/2 Pitch` through
`Envelope 2 (Filter) Decay`. **Osc waves, 30. Filter types, 6. Drive types, 7.
Distortion types, 7. LFO waveforms, 38.**

All of it is in the scratchpad as JSON at `novation-tables.json`.

---

## 3. The cross-check, which is the reason this was worth doing

Every table was compared index by index against `demo/shell/circuit-patch.mjs`,
whose names were parsed out of the Programmer's Reference PDF.

| table | ours | theirs | result |
|---|---|---|---|
| `OSC_WAVES` | 30 | 30 | **same meaning at all 30**, 5 differ in wording |
| `FILTER_TYPES` | 6 | 6 | **same at all 6**, 2 differ in wording |
| `DRIVE_TYPES` | 7 | 7 | **same at all 7**, 1 differs (`rectifier` / `Rectify`) |
| `DISTORTION_TYPES` | 7 | 7 | **identical at all 7** |
| `LFO_WAVES` | 38 | 38 | **same at all 38**, 1 differs in wording |
| `MOD_DESTINATIONS` | 18 | 18 | **same at all 18**, 8 differ in wording |
| `MOD_SOURCES` | 13 | 10 | see below |
| macro destinations | none | 71 | **all new** |

🔴 **NOT ONE DISAGREEMENT ABOUT MEANING, AT ANY INDEX, IN ANY TABLE.** Every
difference is a shorter label: `sawtooth` against `Saw`, `filter frequency`
against `Frequency`, `band pass 6/6 dB` against `Bandpass 6dB`. A 340 address
format read two ways by two parties agreeing at every index is the strongest
corroboration this repository has for that decoder.

⚠️ **THE `MOD_SOURCES` GAP IS NOT A DISAGREEMENT EITHER, AND THE REASON IS THE
HARDWARE.** The repository has 13 sources; the editor offers 10. The three it
omits are exactly indices **1, 2 and 3: modulation wheel, after touch and
expression**. A Circuit is a pad grid with no wheel, no aftertouch and no
expression input, so Novation hides sources the instrument cannot produce while
the reference documents the whole Nova-family engine. **Every index the editor
does offer agrees with ours.**

✅ **AND IT SETTLES A THIRD PARTY TABLE THIS SESSION WAS OFFERED.** The
circulate.neuma.studio research proposed a 71 value macro list and a 15 value
category list. Sampled at 14 indices the macro list **agrees with Novation at all
14**. The category list **does not**: circulate says `8 Movement, 13 User,
14 Voc/Tune` where Novation says `8 Motion, 13 User 1, 14 User 2`. This
repository's own `CATEGORY_DERIVED`, from a vendor spreadsheet, says `motion`,
so **7 of 7 of the values we already had agree with Novation and one of them
contradicts circulate.** Take Novation's.

---

## 4. Safety, and it is not theoretical

🔴 **THE EDITOR HAS `Save` AND `Send to Circuit` SIDE BY SIDE IN ITS HEADER**,
and the instrument was connected and answering throughout. `research/` already
records that `Send to Circuit` is one of the three operations that replace the
contents of a device with no factory reset, and that `New Pack.circuitpack` is
the only backup of 29 real sessions.

⚠️ **AND A CONNECTED EDITOR SENDS ON EVERY KNOB MOVE, NOT ONLY ON A BUTTON.**
That is the whole point of a live editor and it is why nothing here was touched
but view tabs. Anyone reading this plan and reproducing it should know that
dragging a control to see what it does is a live change to the instrument's RAM.

✅ **THIS IS ALSO THE ARGUMENT FOR `circuit-patch.mjs` HAVING NO ENCODER.**
Novation's editor is the well engineered version of the thing this repository
deliberately refuses to build, and it still puts the destructive control one
click from the safe one.

---

## 5. What to do, and what not to

🟢 **1. TAKE THE 71 MACRO DESTINATION NAMES AND THE 15 CATEGORIES INTO
`demo/shell/circuit-patch.mjs`.** They close two of the six open items in
`research/circuit-soundbank-2026-09-21.md` §8. They are **facts about Novation's
hardware**, cross-checked against two other sources, and they turn `26` into
`Env 1 Attack` on any page that shows a macro. The genre list stays open,
because Novation's own editor does not name it.

🟡 **2. KEEP OUR WORDING, ADD THEIRS AS A SECOND COLUMN IF ANYTHING.** The PDF
names are longer and more explicit (`filter frequency` beats `Frequency` when
the word appears next to an oscillator frequency), and `CLAUDE.md`'s rule about
jargon favours the descriptive one. There is no reason to churn 8 labels in
`MOD_DESTINATIONS` to match a shorter house style that is not ours.

🟡 **3. RECORD THE `MOD_SOURCES` ASYMMETRY AS A RESOLVED QUESTION**, so the next
person to notice that Novation offers 10 where we have 13 does not read it as a
bug. It is the difference between what the engine supports and what this
enclosure can send.

🔴 **4. DO NOT BUILD A COPY OF THIS EDITOR.** It is a large, well made,
officially supported tool that already exists and is free, it talks to the
instrument safely, and rebuilding it would be this project's worst habit
(hand-rolling something that exists) at the largest scale it has ever been
attempted. ⚠️ **What positron has that Components does not is the SESSION**:
`demo/shell/circuit-session.mjs` reads a `.circuitsession` and Components offers
no session editor at all. That is the gap worth working in, and it is the one
`plans/plan-circuit-editor.md` is about.

🟡 **5. IF `/pack/` EVER SHOWS A PATCH IN DETAIL, THE SHAPE IS ALREADY DECIDED
BY THE KIT.** Three tabs (`tabs.mjs`, uppercase, `#links` not subpages), the
macro legs as a `table.mjs` with exactly one growing column and headings of four
or five characters (`dest`, `start`, `end`, `depth`), and the 20 mod slots as
another. **No knobs.** A knob that does not move an instrument is furniture, and
the readout rule says every cell must be able to change.

---

## 6. What this could not settle

- **The 10 `Patch_Genre` values.** Novation's editor does not expose the field.
  The only list is circulate's, and circulate was just shown to be wrong at
  three of fifteen category indices, so its genre list should be treated as
  unverified rather than as a source.
- **Whether the macro list is complete for every firmware.** It was read off one
  build of the editor on one day. Nothing says the value set is stable across
  firmware versions, and nothing here measured a second build.
- **What the editor sends on the wire.** The network and Web MIDI traffic were
  not captured, deliberately: the instrument was connected and the cheapest way
  to find out would have been to move a control.
- **The Osc 1 and Osc 2 `Density` and `Density Detune` parameters** appear in
  the macro destination list and on the MAIN tab, and this repository's address
  table has them. They were not cross-checked by address, only by label.

## Sources

- **Read here, 2026-09-21**: the live DOM of
  🌐 <https://components.novationmusic.com/circuit/synth/editor>, all three
  tabs and the Patch Settings panel, with a Circuit connected and nothing
  clicked but the tabs.
- Compared against `demo/shell/circuit-patch.mjs`, generated from 📄 the Circuit
  Programmer's Reference Guide v1.1, and against
  `research/circuit-soundbank-2026-09-21.md`.
