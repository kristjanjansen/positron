# synth-editors-2026-09-21: what other hardware editors are made of, and what this kit is missing

> **The ask**, 2026-09-21: *"in the background also see existing a bunch of
> editors maybe something to learn from what UI elements we need I think we have
> already have, have a lot maybe open source stuff look it up"*.
>
> 🔴 **NOTHING WAS BUILT AND NO EDITOR WAS RUN.** No module was written, no page
> was touched, nothing was committed. **Not one of the programs below was
> installed, launched or driven here.** Every claim about them is read out of a
> repository, a manual or a support page, and is marked as such. Where a survey
> like this usually goes wrong is a sentence that sounds like a hands-on
> observation and is really a paraphrase of a marketing page, so the marks
> matter more than usual.
>
> | mark | means |
> |---|---|
> | 🔴 **MEASURED** | run here, output pasted, with the command. |
> | 📁 **REPO** | read out of this checkout, with the file. |
> | 📄 **DOC** | read out of a manufacturer document, with the section. |
> | 🌐 **THIRD PARTY** | read off a public repository, manual or support page, with the URL. Weaker. |
> | ⚖️ **INFERRED** | reasoned from something above. Nobody wrote it down. |

---

## 1. The headline

🟢 **THE KIT ALREADY HAS MOST OF IT, AND THE GAPS ARE NOT THE ONES A SURVEY
WOULD PREDICT.** Of the fourteen elements in the brief, 📁 **seven exist**, 📁
**three exist in a different form that is arguably better here**, and 📁 **four
are genuinely absent**: an **envelope editor with draggable breakpoints**, a
**search box over a list**, an **A/B compare**, and an **undo**.

🔴 **AND THE RANKING FOR A CIRCUIT EDITOR IS DECIDED BY ONE MEASUREMENT, NOT BY
TASTE.** `demo/shell/circuit-cc.mjs` holds 98 parameters. Sorted by the shape of
their range:

```
$ node -e "import('./demo/shell/circuit-cc.mjs').then(...)"
total 98
1/2  52  ["Voice","Oscillator","Mixer","Filter","Envelope","Effects and EQ","Macro Knob"]
10   28  ["song select"]
16   18  ["Reverb","Delay","Master Filter","Mixer"]
full 0..127 (knob): 82
small 0-based (list): 10
offset/centred: 6
controller numbers used by more than one parameter: 8
```

⚖️ **So 82 of 98 are a plain knob, which the kit has, and the editor is mostly a
solved problem.** The interesting sixteen are the ten enumerations (`osc 1 wave
0..29`, `drive type 0..6`, `drum 1 patch select 0..63`) and the six that are
centred on 64 (`osc 1 pitchbend 52..76`, `Keyboard Octave 58..69`).

🔴 **AND THE THING NOBODY IN THE SURVEY BUILDS IS THE THING THIS DEVICE NEEDS
MOST.** The Circuit has no factory reset (CLAUDE.md, and `plans/plan-circuit-editor.md`
§5). An editor that moves 98 live control changes has changed the sound in RAM
with **nothing on the device able to put it back**. Every editor below solves
this with a **compare** button and an **undo stack**, and the kit has neither.

---

## 2. The survey

🌐 Every row read off the linked page on 2026-09-21. None of it was run.

| project | what it is | licence | source |
|---|---|---|---|
| **Ctrlr** | a framework for BUILDING hardware editor panels, hosted as VST3/AU | **BSD-3-Clause and GPL-2.0-or-later**, dual, both licence files in the repo | <https://github.com/RomanKubiak/ctrlr> |
| **CtrlrX** | the community fork that is actually shipping, v5.6.35 and a JUCE 8 beta line | as Ctrlr | <https://github.com/damiensellier/CtrlrX> |
| **Dexed** | a DX7 emulation that doubles as a DX7 editor and librarian | **GPL-3.0**, with the `msfa` synth engine kept on Apache-2.0 | <https://github.com/asb2m10/dexed> |
| **Surge XT** | a full synthesizer, ex-commercial, relicensed 2018 | **GPL-3.0** | <https://github.com/surge-synthesizer/surge> |
| **Vital** | a wavetable synthesizer whose modulation interaction is the thing to copy | GPL-3.0 for the synth engine; **the shipped product is not open source** | <https://vital.audio/> |
| **KnobKraft Orm** | a cross-platform SysEx librarian, 80+ synths, Python "adaptations" per device | **AGPL-3.0** | <https://github.com/christofmuc/KnobKraft-orm> |
| **bipluk** | a browser-native SysEx librarian, Web MIDI, claims 110+ synths | **GPL-3.0** | <https://github.com/maxcomperatore/bipluk> |
| **SYSX** | a browser framework for device parameter editing over SysEx, NRPN and CC | not stated on the page | <https://github.com/sicmind/sysx> |
| **circuit-web-synth-editor** | a Novation Circuit patch editor in the browser, the direct comparator | **GPL-3.0** | <https://github.com/ewe2/circuit-web-synth-editor> |
| **elk-herd** | an Elektron device manager that runs in any Web MIDI browser | **not established.** The GitHub repository says the project migrated off GitHub and the licence was not read | <https://github.com/mzero/elk-herd> |
| **webaudio-controls** | a WebComponents parts library: knobs, sliders, switches, param displays, keyboards | **Apache-2.0** | <https://github.com/g200kg/webaudio-controls> |
| **Novation Components** | the vendor's own web editor for the Circuit, Web MIDI, closed | closed | <https://components.novationmusic.com> |
| **Overbridge** | Elektron's editor plugins, closed | closed | <https://www.elektron.se/overbridge> |
| **Midi Quest** | the SoundDiver lineage, commercial, claims 1000+ devices | closed | <https://squest.com/> |
| **Pure Data / Max** | patchers, the other tradition: a canvas of objects rather than a panel | Pd is BSD-like | <http://msp.ucsd.edu/Pd_documentation/> |

⚠️ **LICENCE MATTERS AND THE ANSWER IS THE SAME EVERY TIME: DO NOT VENDOR ANY OF
THEM.** Ctrlr is the only permissive option (BSD-3-Clause), and it is C++ JUCE
code for a desktop plugin host, which is not a thing a page here can use.
webaudio-controls is Apache-2.0 and is the only one that would drop into a
browser, and §6 argues against taking it anyway. **Everything else is GPL or
AGPL, so it is a thing to READ and not a thing to import.**

---

## 3. What each one leans on, element by element

**Ctrlr** 🌐 read from source, `Source/UIComponents/CtrlrComponents/CtrlrComponentTypeManager.cpp`.
Twenty-three registered component types, and the list is the most honest
inventory of what a hardware editor is actually built out of that this survey
found: `uiImageSlider`, `uiSlider`, `uiFixedSlider`, `uiFixedImageSlider`,
`uiCombo`, `uiToggleButton`, `uiButton`, `uiImageButton`, `uiLabel`,
`uiLCDLabel`, `uiGroup`, `uiImage`, `uiMidiKeyboard`, `uiCustomComponent`,
`uiTabs`, `uiArrow`, `uiWaveform`, `uiHyperlink`, `uiXYSurface`, `uiListBox`,
`uiFileListBox`, `uiProgressBar`, `uiNone`.
⚖️ **Four of those twenty-three are image variants**, which is the skinning
tradition: a panel author supplies a photograph of a real knob and the component
crops a filmstrip. That is the whole aesthetic this repository does not want,
and it is why the list is shorter than it looks. ⚖️ **There is no envelope
editor and no mod matrix in it.** A Ctrlr panel that needs one draws it with
`uiCustomComponent` and Lua.

**Dexed** 🌐 read from its wiki and repository. One panel showing 144
automatable parameters at once, six operator strips with a realtime VU meter
each, and a "CART" cartridge window that is the librarian. Right-click on a
program or a cartridge sends it to the hardware. 🌐 The wiki page on using it as
a DX7 editor covers cartridge management and parameter sync **and says nothing
about a patch browser or a compare**, which is worth noting because it is the
best-known open source hardware editor there is.

**Surge XT** 🌐 read from its manual and issue tracker. The patch browser is
category-based with a **textual search** that takes field prefixes
(`AUTHOR=`, `CAT=`) and **favourites**. **MIDI learn** with soft takeover, and
`Clear Learned MIDI` to undo a binding. **Undo** is per-gesture and recent
enough to be in the changelog. Scene A and B with copy and paste between them,
which is a compare in a different costume. A large modulation matrix.

**Vital** 🌐 read from its own site and reviews. The one interaction worth
copying: **you drag a modulation source onto a parameter**, the targets
highlight while you drag, and the applied depth is drawn as a coloured ring on
the destination control. Its LFO editor is **double-click to add a breakpoint,
drag to move it**. Tabs across the top for voice, effects, matrix, advanced.
⚠️ The shipped Vital is not open source; only the engine was released. Copy the
idea, not any code.

**KnobKraft Orm** 🌐 AGPL, JUCE, 80+ synths, and the design idea worth stealing
is not a widget: **a synth is a data file, not a code path.** Support for a
device is an "adaptation", a small script, with a documented programming guide
and a **testing guide**. 📁 That is exactly the shape `demo/shell/circuit-cc.mjs`
already has here, generated from the Programmer's Reference rather than typed.

**bipluk** 🌐 browser-native, Web MIDI, GPL-3.0. Instant fuzzy search over patch
names, bank and patch addressing in the device's own base-8 numbering
(`Patch 11-88`) rather than a flat index, and a per-synth wiki page. ⚖️ The
addressing choice is the good one: a librarian that renumbers a device's patches
to suit itself makes every conversation with the hardware a translation.

**circuit-web-synth-editor** 🌐 the direct comparator, GPL-3.0, Bootstrap 4 plus
jQuery plus WebMidi.js, reads and writes patch data by hex offset and exports
SysEx files compatible with Novation Components. 🔴 **It writes SysEx.** 📁 This
repository's own plan takes the opposite route deliberately: `plans/plan-circuit-editor.md`
§1 shows the dangerous message and the safe one differ by one byte at offset 6,
and argues an editor here should be **incapable of expressing** the flash write.
🌐 That project's README carries the warning the other approach earns: *"Avoid
using any other software connected to the Circuit at the same time"*.

**Novation Components** 🌐 read from Novation's own support pages. Web MIDI in
Chrome, Opera and Edge, a Packs screen, a Browser button, and a synth screen
that edits the patch on the unit in real time **provided MIDI CC In/Out is
enabled**. ⚖️ That last clause says Components itself uses the CC path for live
editing, which is the same route `circuit-cc.mjs` takes.

**Overbridge** 🌐 read from Elektron's manual listing. **Tabs select parameter
pages** (Tracks 1 to 4, FX/Master), which is the same answer as Vital and as
Ctrlr's `uiTabs`: three surveys, three unrelated products, one answer for "too
many parameters for one screen".

**Midi Quest** 🌐 the SoundDiver lineage. 1000+ devices, a context-sensitive
"Patch Zone" list, and the one element nothing else here has: **five patch
generators (Mix, Blend, Mix All, Morph, Gen 4)** that make new banks by
combining existing sounds. That is randomise and morph taken seriously.

**Pure Data and Max** 🌐 the other tradition, included because it is the
alternative and not a variant. A canvas of objects wired together, with a small
set of GUI atoms: bang, toggle, number box, slider, radio, canvas, array graph.
⚖️ A number box that you drag vertically to change and type into to set is the
same control as this kit's readout cell and its field, fused. ⚠️ **A patcher is
not what a hardware editor wants.** A Circuit's parameters are a fixed set with
a fixed layout; the freedom a patcher buys is freedom this problem does not need.

---

## 4. Against this kit, element by element

📁 All of this is read from `demo/shell/` in this checkout.

| element | in the kit? | where, and what form |
|---|---|---|
| **knob** | ✅ **yes** | `knob.mjs`, `createKnob` and `createKnobBank`. Vertical drag (its header argues the case at length), wheel, keyboard, double press returns to `home`, a `sub` line that already prints `CC 80`, and `source()` reporting whether the last move came from a hand or from hardware. |
| **fader** | ✅ **yes** | `fader.mjs`, `createFader` and `createFaderBank`. Vertical lane, and an optional `hand` that makes it move by itself. |
| **XY pad** | ⚠️ **different form** | `xy-pad.mjs`, `createXyPad`. It is a **gesture capture surface**: full-rate `onInput`, an append-only trace, an overlay for a second reading. It is not a two-parameter control you bind to two controller numbers, and making it one is an option rather than a rewrite. |
| **envelope editor, draggable breakpoints** | ❌ **missing** | Nothing. The strip is a time axis with lanes and marks, and its marks are not draggable breakpoints of a shape. |
| **LFO shape picker** | ⚠️ **different form** | `choice.mjs` for up to about four options, `picker.mjs` for a long list. Both are **text**. Nothing draws the shape in the option. |
| **step grid** | ✅ **yes** | `pad.mjs`, `createPadGrid`. 📁 Already in use on `/circuit/`. Colour per pad, deliberately breaking this project's colour rule and saying so. |
| **mod matrix** | ⚠️ **partly** | `table.mjs` gives rows in declared columns, which is a matrix AS ROWS. 📁 `/bay/` renders a patch bay as **two tables** rather than a crosspoint grid. A grid with a cell per intersection does not exist. |
| **patch browser / librarian list** | ⚠️ **partly** | `table.mjs` with keyboard navigation, a roving tabindex, `onPick`, per-column links and hovers. What is missing is everything AROUND the list: no search, no facets, no favourites. |
| **A/B compare** | ❌ **missing** | Nothing in the kit holds two states and swaps between them. |
| **randomise** | ✅ **yes** | `stepper.mjs` and `picker.mjs` both take a `random`, drawn as a die glyph in the middle of the group. |
| **morph between two patches** | ❌ **missing** | Nothing. Midi Quest is the only surveyed program that takes it seriously. |
| **undo** | ❌ **missing** | 🔴 Grepped: `undo` appears in `transport-bar.mjs`, `xr-quit.mjs`, `text-adapter.mjs` and `presence-test.mjs`, in none of them as a reusable undo stack. |
| **MIDI learn** | ⚠️ **different form** | No "press a control, then wiggle a knob" binder. `midi.mjs` has `onControl`, `cc-adapter.mjs` has the whole continuous-control plumbing, and `bay.mjs` is the conceptual answer: **links are declared and validated** rather than learned. |
| **value readout on hover** | ⚠️ **different form** | The value is **always visible** in a fixed box above the knob or fader, never on hover. ⚖️ That is not an oversight, it is CLAUDE.md's own rule: a changing number goes in a reserved-width cell, because prose that updates reflows. `table.mjs` does have `hover` for a cell it had to shorten. |
| **parameter search** | ❌ **missing** | The nearest thing is `picker.mjs`'s invisible native `<select>`, which gets the platform's type-ahead for free on a closed list. There is no text box that filters a table. |

⚠️ **TWO THINGS THE KIT HAS THAT NOTHING IN THE SURVEY DOES**, worth saying
because a comparison that only counts gaps is a comparison with a thumb on it.
📁 `hand.mjs` plus the `hand` option on a slider or fader: a control that moves
itself on a planned path, so a binding can be watched without a hand on the
desk. 📁 `bay.mjs`: a patch bay where a port declares what its data IS and
separately what it CONSENTS TO, so the Circuit's input can be shaped for
ordinary MIDI and still refuse SysEx by arithmetic.

---

## 5. Ranked by what a Circuit editor would actually need

🔴 The ranking is against the 98 measured parameters in §1, not against the
survey.

**1. A search box over a table.** 🔴 98 parameters across 3 channel groups and
11 sections. That is more than one screen at any width, and the two answers the
survey gives are tabs (Overbridge, Vital, Ctrlr) and search (Surge XT, bipluk).
📁 `tabs.mjs` exists and is in two pages, so tabs are nearly free. Search is
not: nothing filters a table today. 🔴 And search is the one that also solves the
librarian, because `New Pack.circuitpack` holds 64 patches and 32 sessions, and
a list of 64 names with no filter is a list you scroll.

**2. A compare, and an undo behind it.** 🔴 The device has no factory reset, and
a live CC editor is a machine for silently destroying the sound somebody had.
⚖️ The cheapest honest form is not a general undo stack: it is **one snapshot of
all 98 values and a button that swaps the desk against it**, which is Surge XT's
Scene A/B and Dexed's compare in the simplest possible shape. It needs no
history, no coalescing and no gesture boundaries.

**3. A picker that draws its options.** 🔴 10 of 98 are enumerations, and two of
them are `osc 1 wave 0..29` and `osc 2 wave 0..29`. 📁 `picker.mjs` handles 30
items today and shows the NAME. A waveform is the one case where a shape beats a
name, and it is the same component with a drawn cell instead of a text one.

**4. A knob that knows it is centred.** 🔴 6 of 98 are offset: `osc 1 pitchbend
52..76` is minus 12 to plus 12 semitones with 64 at the middle. 📁 Read from
source, `knob.mjs:181` computes `frac = (v - min) / span` and `knob.mjs:205`
prints the raw value, so such a parameter reads **"64"** and fills its ring from
the left. Both are wrong for a reader and both are small: a `centre` option that
fills the arc from the middle and a display map.

**5. A crosspoint grid, for the mod matrix.** ⚖️ The Circuit's matrix lives in
the NRPN half (8 macro knobs with 4 destination slots each), so this is behind
the 276 NRPN parameters that `circuit-cc.mjs` does not carry yet. 📁 `table.mjs`
as rows would do the job. A grid is nicer and is not blocking anything.

**6. An envelope editor.** 🔴 The Circuit's envelope is four control changes:
`env 1 attack` 73, `decay` 75, `sustain` 70, `release` 72. Four knobs already
express it exactly. A draggable ADSR shape is a nicer way to reach the same four
numbers and is **the most work of anything on this list**. It is last.

---

## 6. What to build next, and what not to

🟢 **BUILD THESE TWO.**

**A filter box on `table.mjs`.** One text field that narrows the rows, over a
component every list in this repository already uses. 📁 It pays for the
parameter list, the 64 patch browser, `/dump/`'s message log and `/bay/`'s two
tables at once, which is four callers before the Circuit editor exists. ⚠️ And
it has a trap worth naming in advance: 📁 `table.mjs` already fought this fight
once, when `stick` had to stand down while the keyboard was in the table. A
filter that runs while somebody is arrowing through rows moves the row under
their finger. **The filter owns the row set; the keyboard owns the position in
it.**

**A compare snapshot.** Hold all 98 values, swap, swap back, and say in words
which side is live. ⚖️ It is small, it is the only protection a device with no
undo can be given from a page, and it is the difference between an editor
somebody will open on a session they care about and one they will not.

🟡 **PROBABLY THIRD: the drawn picker cell.** 📁 It is `picker.mjs` with a
canvas where the name is, it makes 30 oscillator waves usable, and it costs
about as much as one page.

🔴 **AND TWO THINGS THAT LOOK NECESSARY AND ARE NOT.**

**MIDI learn.** Every editor in the survey has it and this one should not.
📄 The Circuit's map is published in the Programmer's Reference and 📁 generated
into `circuit-cc.mjs` rather than typed, so there is nothing to learn: the
binding is a fact, not a preference. ⚖️ Worse, a learn mode is a UI whose whole
job is to let a person create a binding the code did not declare, which is the
opposite of what `bay.mjs` was built to enforce. **A learn button here would be
a control that exists because other programs have one.**

**Skinning, image sliders, photographed panels.** 🌐 Four of Ctrlr's
twenty-three component types are image variants, and the vendor editors are
pictures of hardware. ⚖️ It is the single biggest difference between this kit
and everything surveyed, and it should stay that way: a drawn photograph of a
Circuit tells a reader nothing the labels do not, it cannot be measured, and
`knob.mjs` already spent its research budget on the interaction instead, which is
the half that was actually fiddly.

⚠️ **AND ONE THING TO DECIDE BEFORE IT DECIDES ITSELF: a page of 52 knobs is a
page.** 📁 `tabs.mjs` is in the kit and in **`/making/` and `/stage/`**, and CLAUDE.md
records why it was pulled from `/items/`: three names over one list is
furniture. Three channel groups over 98 parameters is not furniture, it is the
thing Overbridge, Vital and Ctrlr all independently arrived at. **It would be
the component's third caller, not its first**, which makes it the safe choice
here rather than the adventurous one.

---

## 7. What this does not cover

- **NRPN.** 📄 276 more parameters, four messages each. 📁 `midi-decode.mjs` has
  `createNrpn()` already, so the wire half is done; none of the UI questions
  above change, there are just more rows.
- **Sessions and samples.** Out of reach of everything in `circuit-cc.mjs`.
- **Anything about how these programs FEEL.** None was run. Where a source says
  a thing is fast, or slick, or dated, that is their word and it is marked 🌐.

## Sources

Read 2026-09-21, none of it executed. Every URL is in the table in §2, plus:
Ctrlr's `Source/UIComponents/CtrlrComponents/CtrlrComponentTypeManager.cpp`,
Dexed's wiki page `Dexed-as-a-DX7-editor`, `surge-synthesizer.github.io/manual-xt/`,
Novation support article 360013039659 (Circuit Synth Editor Guide),
`squest.com/Products/MidiQuest13/Details.html`, and
`docs.juce.com/master/classjuce_1_1Slider.html`.

Measured here: the parameter census in §1, from `demo/shell/circuit-cc.mjs`.
Read from this checkout: `demo/shell/` in full, `demo/bay/index.html`,
`demo/circuit/index.html`, `demo/knobs/index.html`, `demo/kit/index.html`,
`plans/plan-circuit-editor.md`.


---

## ⚠️ One claim in this document was wrong and is corrected here

**`tabs.mjs` is NOT unused.** It is imported by `demo/making/index.html`, whose
own comment calls it *"`tabs.mjs`'s FIRST use in a shipped page"*, and by
`demo/stage/index.html`. The survey said otherwise because **`CLAUDE.md` said
otherwise**: that file carried *"`tabs.mjs` is in `/kit/` and in NO page"* long
after it stopped being true, and a document written from it inherited the error.

🔴 **THAT IS THE SECOND TIME IN ONE SESSION A STANDING FILE OUTLIVED ITS OWN
FACTS**, after the demo count at the top of `CLAUDE.md` read `47 of 49` against
a real 51. Both were found by checking rather than by reading. `CLAUDE.md` is
corrected.

⚠️ **AND IT CHANGES ONE CONCLUSION.** The note that three channel groups would
be `tabs.mjs`'s first real caller is wrong: it would be its third. The component
has been used in anger twice, which makes it a safer choice than this document
originally implied, not a riskier one.
