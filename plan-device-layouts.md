# plan-device-layouts: what a control MEANS, and then how to compose one screen out of them

> 🔴 **NOTHING IN THIS FILE IS BUILT.** No module was added to `demo/shell/`, no
> row was added to `demo/manifest.mjs`, no page was created, nothing was
> deployed and nothing was committed. It is a proposal.
>
> 🔴 **NEITHER DEVICE IS PLUGGED IN.** Every claim about the Novation Circuit
> and the Tascam Model 12 comes from `plan-circuit-model12.md`, which read them
> out of manufacturer PDFs and marked each one. Nothing here was seen on a wire.
>
> ✅ **FIVE THINGS WERE MEASURED, AND ALL FIVE ARE MEASUREMENTS OF THIS REPO'S
> OWN CODE**, run on 2026-09-20 with no device attached, against
> `demo/shell/cc-adapter.mjs` as it stands in this checkout. They are §4.2 and
> they are the reason §4 is the centre of this document.
>
> **Evidence marks, the same ones `plan-circuit-model12.md` uses:**
>
> | mark | means |
> |---|---|
> | 📄 **DOC** | out of a manufacturer PDF. Quoted or cited through `plan-circuit-model12.md`. |
> | 📁 **REPO** | read out of this checkout, with the file and the line. |
> | 🌐 **THIRD PARTY** | a published reverse engineering document. Weaker. |
> | ⚖️ **INFERRED** | reasoned from something above. Nobody wrote it down. |
> | 🔌 **NEEDS THE HARDWARE** | cannot be settled without plugging the thing in. |
> | 🔴 **MEASURED** | run here, output pasted. Exactly **five**, all in §4.2, all of CODE. |

---

## 0. The ask, verbatim

> *"Can we plan controls to compose virtual layouts for both devices? Do not
> have to be physically supersimilar, perhaps ee could use our sliders
> vertically. First what types of control we need and then how to compose
> layouts."*

Three instructions in one sentence, and the third one is the method.

1. **Types first, layouts second.** This document is in that order and nothing
   in part one draws a picture of anything.
2. **Not a photograph of the hardware.** A vertical slider where the Circuit
   has a knob is wanted, not tolerated. So the question every type below
   answers is what a control MEANS on the wire, never what it looks like on the
   box.
3. **Both devices**, which are not symmetric and produce two different kinds of
   layout. §9 is where that stops being a detail.

---

## 1. Why the order is the whole method

The two MIDI maps are 150 CC addresses on the Circuit alone, spread over four
channels, plus about 270 more that have no CC at all, plus a control surface on
the Model 12 that speaks a protocol with no position in its messages.
⚖️ COUNTED from `plan-circuit-model12.md` §3.3, §3.4, §3.5 and §3.6: 52 CC
addresses per synth channel and there are two of them, 7 parameters on each of
four drums, 18 on the session channel, which is **150**; the NRPN list in §3.6
comes to about **270** more, of which 128 are the macro wiring in bank 3.

Drawing first produces a picture of a Circuit with eight knobs on it, because
that is what a Circuit looks like. Eight knobs is what the device shows a hand.
It is not what the device accepts, and the gap between those two numbers is the
whole reason a virtual layout is worth building at all.

So: enumerate the kinds of thing a parameter can BE, work out which of them
this project can already draw, and only then decide what goes on a screen.

---

# PART ONE: THE TYPES

## 2. The catalogue, as one table

Fourteen types. The last one is a type that must be refused.

| | type | the devices that need it | what it sends or receives | the kit today |
|---|---|---|---|---|
| **T1** | continuous absolute 7 bit | most of the Circuit | `Bn cc v` | ✅ `createSlider` |
| **T2** | bipolar around a centre | Circuit semitones, cents, pan, depths | `Bn cc v`, default 64 | ⚠️ option on the slider |
| **T3** | enumerated | Circuit waves, filter type, polyphony, drum patches | `Bn cc index` | ✅ `createChoice` or `createPicker` |
| **T4** | folded two sided range | Circuit master filter, CC 74 channel 16 | `Bn cc v`, 64 means off | ⚠️ option on the slider |
| **T5** | **relative encoder** | Model 12 V-Pots and jog | `Bn cc 0x01` up, `0x41` down | 🔴 **nothing** |
| **T6** | 14 bit absolute | Model 12 faders | pitch bend, one channel per fader | ✅ messages, ⚠️ display |
| **T7** | momentary button | Model 12 transport, REC, SOLO, MUTE, SELECT | note on and note off | ⚠️ exists once, inside the keyboard |
| **T8** | **a lamp, which is a control that READS** | Model 12 every button | note velocity 0, 1, 127 back to the surface | 🔴 **nothing** |
| **T9** | **NRPN addressed parameter** | half the Circuit synth | CC 99, CC 98, CC 6 in sequence | 🔴 **nothing sends one** |
| **T10** | program change | Circuit patches and sessions | `Cn index`, no bank select | ✅ `createPicker`, ⚠️ queued variant |
| **T11** | device transport | Circuit receives, Model 12 sends | start, stop, continue, song position | ⚠️ must not be the transport bar |
| **T12** | **note grid** | Model 12 MCU strip, Circuit drums | notes, plus T7 and T8 per cell | 🔴 **nothing** |
| **T13** | a lamp bank that is not a control at all | Model 12 V-Pot LED rings | `Bn 48..55 bitmap` | 🔴 nothing, and see §4.2 |
| **T14** | tempo | neither | **nothing** | ✅ correctly absent, §3.14 |

Four rows are 🔴 and they are the plan. One row, T13, is here because a
measurement put it there and nobody would have predicted it.

---

## 3. Each type, and what it actually is

### 3.1 T1, continuous absolute 7 bit

**What it is.** One controller number, one channel, a value 0 to 127 that is a
complete statement. Losing a message is harmless the instant the next one
arrives, and harmful forever only if it was the last. 📁 REPO:
`demo/shell/cc-adapter.mjs`'s header argues exactly this and calls it
LEVEL VALUED, and every design decision in that file follows from it.

**Which parameters.** 📄 DOC, `plan-circuit-model12.md` §3.3: portamento rate,
wave interpolate, pulse width index, virtual sync depth, density, density
detune, every mixer level, filter drive, filter tracking, resonance, frequency,
all four Env 1 times, distortion and chorus level, and the eight macro knob
positions on CC 80 to 87. §3.4: drum level, pitch, decay, distortion and EQ,
four of each. §3.5: twelve reverb and delay sends, the two master filter
controls and the session mixer levels.

**Kit.** ✅ `createSlider`, and it is the best furnished control in the project:
a reserved value width so the number cannot shift while you read it, an
exponential lane for perceptual quantities, `set()` so a page can drive it in a
check because `verify.mjs` cannot drag it, and an invisible hand.

**What it still needs for a device.** Nothing about the widget. Everything
about the address, which is §5.

⚠️ **AND THE EXPONENTIAL LANE IS THE ONE THING WORTH DECIDING PER PARAMETER.**
📁 REPO, `slider.mjs`: `/radio/` was measured with half its travel in a region
where nothing audibly changes. A Circuit filter frequency is CC 74, a 7 bit
integer with 128 stops, and whether those stops are laid out linearly on screen
is a choice the page makes and the device knows nothing about. 🔌 NEEDS THE
HARDWARE to say whether the Circuit's own CC to cutoff curve is already
perceptual, and until somebody listens the honest default is linear, because
`warp: 'exp'` on top of an already exponential engine is two curves.

### 3.2 T2, bipolar around a centre

**What it is.** The same message as T1 and a different meaning. The centre is
the neutral and the two directions are opposite, so the interesting reading is
the DISTANCE FROM 64 and its sign.

**Which parameters.** 📄 DOC §3.3, every one with a default of 64: osc 1 and
osc 2 semitones (CC 26, 37), cents (CC 27, 39), pre glide (CC 9, range 52 to
76), keyboard octave (CC 13, range 58 to 69), pre and post FX level (CC 58, 59,
range 52 to 82), filter Q normalize (CC 78), env 2 to frequency (CC 79),
Env 1 velocity (CC 108). §3.4: the four drum pans on CC 77 to 80. §3.5: synth
pan on CC 117 and 118.

⚠️ **TWO SUB CASES AND ONLY ONE OF THEM IS OBVIOUS.** Some are a full 0 to 127
range centred at 64. Some are a RESTRICTED range, 52 to 76 or 58 to 69, that
happens to be centred on 64. `createSlider` already takes `min` and `max`, so
the restricted range is free; what neither case has is a picture that says
where the centre is.

**Kit.** ⚠️ An option, not a component. A lane that fills from the left says
"this much of a quantity". A pan at 64 drawn that way says "half". What is
needed is a fill that grows out of the centre in whichever direction the value
went, plus a detent on the way past, plus a way back to the middle.

📁 REPO precedent: `/knobs/`'s Panic already returns both sliders to 64, so
"come back to neutral" is a verb this project has written once, as a page level
button. On a bipolar control it belongs on the control.

### 3.3 T3, enumerated

**What it is.** The value IS an index into a list of names. A slider over it is
wrong twice: it implies the neighbours are near each other, and it implies a
value between two of them exists.

**Which parameters.** 📄 DOC §3.3: osc 1 wave CC 19 and osc 2 wave CC 29, both
**0 to 29**, thirty waveforms. Polyphony mode CC 3, 0 to 2. Filter routing
CC 60, 0 to 2. Filter drive type CC 65, 0 to 6. Filter type CC 68, 0 to 5.
§3.4: drum patch select on CC 8, 18, 44 and 50, **0 to 63**, and 📄 DOC notes
that drum patches are chosen by CC rather than by program change, which is
unusual and is explicit in the manual.

**Kit.** ✅ Two of them, and the line between them is a real decision the ask
already anticipated.

| control | what it is | where it works | where it does not |
|---|---|---|---|
| `createChoice` | a segmented row, every option visible at once, `aria-pressed` on the armed one | 2 or 3 short words | 📁 REPO, its own header: gaps make options read as unrelated controls, and six segments do not fit a phone |
| `createPicker` | `‹ name ›` with an invisible native `<select>` laid over the middle, fixed width from the widest name | 4 and up, and it was built for 878 Yoshimi patches | a list of two, where a dropdown is a ceremony |
| `createStepper` with `pick` | the same value cell with two arrows and no separate group | inside a row that already has a label | when the list needs its own name |

🔴 **THE RULE, STATED ONCE SO IT IS NOT DECIDED TWICE PER PARAMETER: THREE OR
FEWER IS A CHOICE, FOUR OR MORE IS A PICKER.** Polyphony mode (3) and filter
routing (3) are choices. Filter type (6), filter drive type (7), the waves (30)
and the drum patches (64) are pickers. The number is not arbitrary: 📁 REPO,
`picker.mjs` exists because a stepper over a long list is "press the arrow eight
hundred times", and `choice.mjs` exists because three buttons with gaps read as
three unrelated controls. Both arguments break at about four.

🔴 **AND THE NAMES DO NOT EXIST YET, WHICH IS A REAL HOLE.** The Programmer's
Reference Guide gives `0 to 29` and does not print thirty waveform names, and it
gives `0 to 63` and does not print sixty four drum patch names. The Circuit has
no screen, so the device cannot tell you either. A picker that can only say
`wave 17` is honest and is not finished. 🔌 NEEDS THE HARDWARE or a Novation
Components export, and until then a layout shows the index and says in its log
that the name is not known, because a made up name is worse than a number.

### 3.4 T4, the folded two sided range

**What it is.** One 0 to 127 value in which the halves are DIFFERENT
PARAMETERS. 📄 DOC, §3.5, verbatim: `0-63=Low Pass, 64=OFF, 65-127=High Pass`.

🔴 **IT IS THE ONE CONTROL ON THE CIRCUIT WORTH BUILDING A PAGE AROUND AND IT
IS THE ONE A SLIDER GETS MOST WRONG.** A plain lane feels correct throughout
and lies at both ends: it draws a low pass opening as a bar getting shorter, it
draws a dead centre as a middling amount of something, and a page that labels it
`FILTER` is using one word for two filters.

**Kit.** ⚠️ An option, and two thirds of it already exist. 📁 REPO,
`slider.mjs` exports `setRange({ min, max, unit, digits, warp })` and `label()`,
both added for `/radio/`, whose read head is a PLACE in one mode, a SPEED in
another and a LAG in a third. So a slider that renames itself as the value
crosses 64, and shows `LOW PASS 40` on one side and `HIGH PASS 92` on the other
and `OFF` at the centre, is those two methods plus a centre aware paint. It is
T2's option with a per side label callback on top.

### 3.5 T5, the relative encoder

This is the biggest gap in the plan and §4 is about nothing else. The short
form: 🌐 THIRD PARTY, `plan-circuit-model12.md` §4.4, MCU V-Pots are CC 16 to
23 and the jog wheel is CC 60, and the value is `0x01` for one click clockwise
and `0x41` for one click anticlockwise. **There is no position in the message.**

### 3.6 T6, 14 bit absolute

**What it is.** A pitch bend message carrying a 14 bit value, 0 to 16383, LSB
in data 1 and MSB in data 2. 🌐 THIRD PARTY §4.4: MCU faders 1 to 8 are pitch
bend on MIDI channels 1 to 8 and the master fader is channel 9. 📄 DOC, the DAW
control chart: pitch bend TRANSMIT yes, RECOGNIZE no, remark `MCU: Fader`.

🔴 **THE "RECOGNIZE NO" IS THE FADERS NOT BEING MOTORISED**, and it is the
single fact that decides what a Model 12 layout can be. §9.

**Kit.** ✅ for the message and ⚠️ for the display.
📁 REPO, `cc-adapter.mjs` already has `encPB`, `decPB`, `dec14`, `msbOf`,
`lsbOf`, `clamp14`, a `pb:<channel>` key form in `keyOf`, `CC_DEFAULTS.pb =
8192` and a comment saying pitch bend is one message carrying both halves. So
eight MCU faders arrive as eight distinct keys, `pb:0` through `pb:7`, correctly
folded and correctly restated. **That is the one MCU control this repo already
handles end to end**, and §11 keeps it in the first layout as a negative control
for exactly that reason.

⚠️ **THE WIDGET IS THE SLIDER AS DATA AND THE DISPLAY IS NOT DECIDED.**
`createSlider({ min: 0, max: 16383, step: 1 })` works, and `16383` is a number
nobody can read off a fader. 📁 REPO, `slider.mjs` defaults `step` to
`span / 100`, which for this range is 163.83, so a caller that forgets `step`
gets a fader with 100 stops out of 16384 and never notices. Say the position as
a percentage with one decimal, keep the 14 bit integer underneath, and reserve
the widest string the way the component already does.

### 3.7 T7, momentary versus latching

**What it is.** A momentary control reports PRESS and RELEASE as two events. A
latch reports one event and changes its own state. They are not variants: a
momentary is the only one of the two that can hold something.

**Which controls.** 🌐 THIRD PARTY §4.4: MCU transport is notes 91 to 95 (rew,
ff, stop, play, record), fader touch is 104 to 111 with the master at 112, and
REC, SOLO, MUTE and SELECT are notes 0 to 7, 8 to 15, 16 to 23 and 24 to 31.
📄 DOC, the DAW control chart: note number and note on velocity are YES in both
columns, remark `MCU: Key, LED`.

🔴 **ON MCU THE SURFACE IS ALWAYS MOMENTARY AND THE LATCH LIVES SOMEWHERE
ELSE.** The button sends note on and note off; whatever is listening decides
whether that means a toggle, and then tells the surface by lighting the lamp.
So the same physical control is momentary on the wire and latching in meaning,
and the only thing that joins the two is T8 coming back. That is why T8 is a
type and not a detail.

**Kit.** ⚠️ It exists exactly once, and not where you would look for it.
📁 REPO: `createButtonGroup` fires `onPress` on `click`, which is a single
event with no release, and it deliberately never writes `aria-pressed`, so it
cannot latch either. 📁 REPO: `createKeyboard` DOES have the momentary
behaviour, with pointer capture so that a held finger is a held note, a hit test
through `elementFromPoint`, and a rule that a key is lit by a NOTE rather than
by the press that caused it. **That rule is T8, written down in the one
component that already needed it.**

So this is CLAUDE.md's "a control that exists in one page and nowhere else is a
component that has not been noticed yet", one level down: a BEHAVIOUR that
exists in one component and nowhere else. The repair is `momentary: true` on
`createButtonGroup`, giving `onDown` and `onUp`, lifting the pointer capture
rule out of `keyboard.mjs` rather than writing it a second time.

### 3.8 T8, a lamp, which is a control that READS

**What it is.** 🌐 THIRD PARTY §4.4: `LED feedback | note velocity | 0 off, 1
blink, 127 on`. The message travels FROM the listener TO the surface. 📄 DOC,
the chart's RECOGNIZE column is YES for note number and note on velocity.

🔴 **THREE STATES, NOT TWO, AND THE THIRD ONE IS BLINK.** A boolean cannot hold
it. This is the same shape as two arguments this project has already settled:
📁 REPO, `presence.mjs` argues that `unknown` is a real third state and is not
`offline`; 📁 REPO, `choice.mjs`'s `pending(i)` sets `data-busy` for an option
that has been pressed and has not arrived, and its own comment says chosen and
arrived are two different facts and collapsing them makes a pressed button
appear unpressed.

⚠️ **BLINK IS NOT `data-busy` EVEN THOUGH IT LOOKS THE SAME.** `data-busy` is
this project's one picture for "working on it", and MCU's blink means something
else: on Pro Tools and most MCU hosts it is a record arm waiting for the
transport, which is a STATE rather than a delay. Reusing the picture would put
one sweep on two different claims, and CLAUDE.md's rule is one idea one picture,
not one picture two ideas.

**Kit.** 🔴 Nothing. There is no component that renders a three state lamp.
What exists to build it out of: the badge in `/kit/` that measures the same
width in all four of its states, and `presence.mjs`'s vocabulary.

🔴 **AND IT IS THE ONLY FEEDBACK CHANNEL A MODEL 12 HAS.** §9.

### 3.9 T9, an NRPN addressed parameter

**What it is.** The same widget as T1, T2 or T3, at a different kind of address.
📄 DOC §3.6: the PRG writes addresses as `bank:number` with banks 0 to 3, and
the parameters with NO CC at all are envelope 2, envelope 3, LFO 1, LFO 2, the
four band EQ, distortion type and compensation, the whole chorus, the whole
reverb, the whole delay, FX bypass, all twenty mod matrix slots at four
addresses each, the sidechain for both synths, and **every macro knob
destination, start, end and depth**, which is bank 3, LSB 0 to 127.

⚠️ **NOVATION NEVER SAYS WHICH CONTROLLERS CARRY IT.** 📄 DOC §3.6: the PRG
gives `1:83` and never states that MSB is CC 99, LSB is CC 98 and data entry is
CC 6. ⚖️ INFERRED that it is the MIDI 1.0 convention because there is no other
one, and 🔌 NEEDS THE HARDWARE, and it is cheap to check with a MIDI monitor.

**Kit.** 🔴 Nothing sends one. 📁 REPO, `cc-adapter.mjs` is built on
`(status, d1, d2)` and the CC status byte; `keyOf` has a `cc:` form and a `pb:`
form and no third one.

🔴 **AND IT BREAKS THE MODULE'S STATED CONTRACT FOR A DIFFERENT REASON FROM T5,
WHICH IS WHY THEY ARE TWO TYPES.** A relative encoder is not level valued
because each message is a delta. An NRPN is not level valued because the
parameter select messages are STATE: three or four messages with meaning only in
sequence, so a lost MSB leaves the next data entry landing on whatever parameter
was selected last. Neither is idempotent, and they are not idempotent in
opposite ways.

⚠️ **WHAT THIS MEANS FOR A LAYOUT IS SMALL AND FOR THE SENDER IS NOT.** The
control is a slider. The address carries a bank and a number instead of a
controller. The sender needs a separate path that does not coalesce, does not
interpolate and emits the sequence atomically. §5.3.

### 3.10 T10, program change

**What it is.** 📄 DOC §3.7, the whole table: channel 1 PGM 0 to 63 selects
synth 1's patch, channel 2 the same for synth 2, channel 16 PGM 0 to 31 selects
a session instantly and **64 to 95 selects the same session queued**. There is
no mode flag anywhere: the queue is the index plus 64.

🔴 **THERE IS NO BANK SELECT AND SENDING ONE IS SENDING A CONTROLLER THE DEVICE
HAS NO MEANING FOR.** 📄 DOC §3.7: CC 0 and CC 32 appear nowhere in either PRG.
📁 REPO: `rig/board/board.mjs` sends a bank select before a program change for
Yoshimi. A Circuit layout must not, and on channel 16 CC 32 is inside the 32 to
63 block besides.

**Kit.** ✅ `createPicker` is literally this control. It was built for the
patch row and it has the die for "surprise me", which is the right verb for a
bank of 64 sounds you have not heard.

⚠️ **THE QUEUED VARIANT IS THE MISSING HALF AND IT IS NOT A SECOND PICKER.**
One list, two verbs, and the difference is `index` against `index + 64`. That is
a picker plus a `createChoice` of two, `NOW` and `AT THE BOUNDARY`, sharing one
label. Note that "at the boundary" is a promise the page cannot confirm: the
Circuit acts on it and says nothing back.

### 3.11 T11, a device transport

**What it is.** Realtime messages, not notes and not controllers. 📄 DOC §3.9:
the Circuit supports start, stop, continue and timing clock, plus song position
pointer and song select, and has **no MTC and no MMC**. 📄 DOC §4.2: the
Model 12 transmits MIDI clock and song position pointer while its recorder runs
and transmits MTC quarter frames, and recognises none of it. 📄 DOC §4.3: the
DAW control port carries no system realtime at all, in either direction.

**Kit.** ⚠️ And the danger here is reaching for the wrong component.
🔴 `transport-bar.mjs` is the one transport UI in this project and its whole
model is a POSITION inside a sound: a playhead from `observePosition`, seeking
only through `deck.seek()`, rates intersected from `caps.rates`. A device
transport has no deck. CLAUDE.md already records what happens: `verify.mjs`
reads `__demo.transport.position` and dies on `t0.pos.toFixed` when a page
publishes something that is not a bar, and the output names the harness rather
than the page.

So a device transport is **three or four buttons in a `createButtonGroup`**,
labelled with verbs, and if a page ALSO has a real transport bar then the bar
keeps `__demo.transport` and the device row is not published.

⚠️ `toggle: false` is the other precedent and it is the right shape for a
different case: 📁 REPO, `transport-bar.mjs` supports a bar with no play button
at all, for `/keys/`, where a note sounds while a key is held and there is
nothing to start or resume. A bar like that still carries the `chip`, which on
a device page is the presence badge, and that is worth having. **A Circuit
layout may want that bar for the chip alone, with `toggle: false` and
`publish: false`.**

### 3.12 T12, a note grid

**What it is.** A rectangle of momentary note buttons (T7), each with a lamp
(T8), where the COLUMN carries an identity the row does not.

🔴 **AND THE JUSTIFICATION IS THE MODEL 12, NOT THE CIRCUIT'S 32 PADS, WHICH IS
THE OPPOSITE OF WHAT IT LOOKS LIKE.** The Circuit has 32 pads and
`plan-circuit-model12.md` documents no per pad MIDI address for any of them.
What the Circuit documents receiving is four drum notes, 📄 DOC §3.2, at
**60, 62, 64, 65** with gaps of +2, +2, +1, and ordinary chromatic notes on the
two synth channels. The pads are a sequencer grid the device draws for itself.

What IS a 4 by 8 grid of note addressed momentary buttons with lamps is the
Model 12's MCU channel strip: 🌐 THIRD PARTY §4.4, REC on notes 0 to 7, SOLO on
8 to 15, MUTE on 16 to 23, SELECT on 24 to 31. Thirty two notes, four rows of
eight, one column per channel, each cell lit from the far end.

**Kit.** 🔴 Nothing, and `keyboard.mjs` is not it. 📁 REPO, that file's own
header: black keys drawn as black keys, a grid with one column per WHITE key and
the black ones straddling the joins, note names on every key, an octave pad
bolted on with no option to remove it, a QWERTY map, and a swipe rule that
separates scrolling from playing. Its argument is that **the shape constrains
the mapping, so the shape comes first**. A 4 by 8 is a different shape, so by
that file's own reasoning it is a different component.

⚠️ **AND THE SMALLEST REAL INSTANCE IS FOUR CELLS, NOT THIRTY TWO.** The
Circuit's four drum notes are a 1 by 4 note grid. So the component is
`createPadGrid({ rows, cols, cells })` and a drum row is the degenerate case,
which is a good sign: a component whose smallest instance is also useful is a
component with the right seams.

### 3.13 T13, a lamp bank that is not a control at all

🌐 THIRD PARTY §4.4: `V-Pot LED ring | CC | 48 to 55`. Eight controllers whose
values are a ring pattern travelling back TO the surface.

This type is in the table only because §4.2 measured what this repo currently
does with it, and the answer is worse than anything predicted. It is not a
control a person operates and a virtual layout would draw it as part of the
encoder it belongs to, if at all.

### 3.14 T14, tempo, and it is refused

🔴 **THERE IS NO CC FOR TEMPO, SWING OR GATE ON THE CIRCUIT. NOT ONE.** 📄 DOC
§3.5, both PRG versions searched: neither word appears in any parameter table.
Tempo is reachable only through MIDI clock, which means the only way to change a
Circuit's tempo remotely is to become its clock master.

📄 DOC §4.2: the Model 12's clock tempo is its METRONOME's tempo, set by hand on
the unit's own jog dial, and there is no clock at all while the transport is
stopped.

**So a tempo slider on either layout is a control that cannot do the thing it
names, which is CLAUDE.md's definition of the defect.** A layout may show tempo
as a READOUT derived from an incoming clock, which is a measurement. It may not
offer tempo as a control unless the page has taken the clock master seat, which
is a much larger commitment than drawing a slider and belongs in
`plan-circuit-model12.md` §7 rather than here.

⚠️ The same applies, less sharply, to anything on the Model 12. 📄 DOC §2: every
cell in that device's RECOGNIZE column on the general ports is NO. **There is no
arrangement in which anything controls a Model 12 over MIDI.** A layout that
offers to is lying in every one of its controls at once.

---

## 4. The single biggest gap, and it is not the widget

### 4.1 What a relative encoder is

🌐 THIRD PARTY, `plan-circuit-model12.md` §4.4, from a published reverse
engineering document that has never been checked against a Model 12: the V-Pots
are CC 16 to 23, the jog wheel is CC 60, `0x01` is one click clockwise and
`0x41` is one click anticlockwise.

⚠️ **AND THE MODEL 12'S OWN PAN KNOBS MAY NOT BE THIS AT ALL.** ⚖️ INFERRED in
§4.4: they are physical potentiometers rather than endless encoders, so TASCAM
either sends something absolute or converts a movement into a stream of clicks.
The chart says only `MCU: PAN, Encoder`. 🔌 NEEDS THE HARDWARE, and it is the
first thing a MIDI monitor would answer.

The widget for this is easy. The decoder is the problem, because every CC in
this project already flows through one module whose contract it violates.

### 4.2 🔴 MEASURED: what `cc-adapter.mjs` does with MCU traffic today

Run 2026-09-20 against `demo/shell/cc-adapter.mjs` in this checkout, no device,
no browser, no page. These are pure functions, which is why they can be
measured at all.

**A. A V-Pot and its own LED ring land on ONE key.**

```
CC 16 -> key cc:0:16    | COARSE 16 | has14 true | label CC16
CC 48 -> key cc:0:16    | COARSE 16 | has14 true | label CC16
CC 23 -> key cc:0:23    | COARSE 23 | has14 true | label CC23
CC 55 -> key cc:0:23    | COARSE 23 | has14 true | label CC23
CC 60 -> key cc:0:28    | COARSE 28 | has14 true | label CC28
```

📁 REPO, `cc-adapter.mjs:54`: `COARSE = (n) => (n >= 32 && n < 64 ? n - 32 : n)`
and `has14 = (n) => n < 32`, which is the MIDI 1.0 coarse and fine pairing and
is correct in general. Against MCU it means **V-Pot 1's rotation and V-Pot 1's
LED ring are filed as the two halves of one 14 bit value.**

This is worse than the Circuit collision already recorded in
`plan-circuit-model12.md` §6.5, and it is worse in a specific way. There, two
real parameters were folded into one. Here **one half is not a parameter at
all**: it is the lamp, travelling in the opposite direction.

**B. The fold, with real MCU bytes in it.**

```
entries: 1
cc:0:16  bits 14  msb 1  lsb 33  value14 161  -> re-sends [[176,16,1],[176,48,33]]
```

One click clockwise (`msb 1`) and a ring pattern (`lsb 33`) become the single
number **161**, which describes neither. Every consumer of the map is then
wrong: the digest, the keyframe, the count of live controllers, and anything
drawing a value.

⚠️ **AND THE RE-SENT BYTES ARE CORRECT, WHICH IS WHY NOBODY WOULD NOTICE.**
`assertBytes` emits `[176,16,1]` and `[176,48,33]`, the right two messages in
the right order. So a replay actuates correctly and the recording is nonsense,
which is this project's own worst shape and is the same conclusion §6.5 reached
about the Circuit by a different road.

**C. Five clicks clockwise become one click.**

```
tick  -> {"set":[[16,1]]}
stats -> {"offered":5,"sent":1,"messages":1,"thinned":4,"restated":0}
```

📁 REPO, `makeCcSend` holds one message per controller per 20 ms gate and calls
an overtaken value a THINNING, which for a level is exactly right: a filter
sweep's intermediate positions are waste and the last value is the whole truth.
For a delta it is the opposite. **A knob turned five detents moves one**, and
the meter reports the loss as a successful economy.

**D. A jog wheel is interpolated during a seek.**

```
isInterpolableKey(cc:0:60) = true
half way between one click up and one click down:
{"status":176,"d1":60,"d2":1,"key":"cc:0:60","value14":33,"u":0.5,"interpolated":true}
```

📁 REPO, `SWITCHES` holds 64 to 69 and 120 to 127, so CC 60 is not one, so the
jog wheel is both throttled and ramped. Half way between clockwise and
anticlockwise is **33**, a value MCU does not define in either direction. Note
the key: the jog wheel is also filed as the fine half of CC 28, which on a
Circuit is osc 1 pitchbend.

**E. And the Circuit's own channel collision, restated.**

```
CC 12 ch10 (drum 1 level)  -> cc:9:12
CC 12 ch16 (synth 1 level) -> cc:15:12
tick  -> {"set":[[12,110]]}
stats -> {"offered":2,"sent":1,"messages":1,"thinned":1,"restated":0}
```

`keyOf` DOES carry the channel and is correct. `makeCcSend` does not: `put`
takes no channel, `live`, `pending` and `lastSent` are all keyed by controller
number, and `tick` returns pairs with no channel in them. **There is nowhere
for a channel to go.** This reproduces `plan-circuit-model12.md` §6.5's
measurement independently and it is the same repair.

### 4.3 What the gap actually is

Not a widget. Three things, in this order.

1. 🔴 **A DECODER AND AN ACCUMULATOR, WHICH DO NOT EXIST.** Something that
   reads `0x01` as +1 and `0x41` as -1, accumulates per `(channel, controller)`,
   clamps to a range the page declares, and hands the result to an ordinary
   slider's `set()`. ⚠️ MCU also encodes SPEED in the high bits of the low
   nibble on some hosts, so `0x05` can mean five clicks. 🌐 THIRD PARTY does
   not say whether the Model 12 does that. 🔌 NEEDS THE HARDWARE, and the
   decoder should therefore report the raw byte alongside its verdict so the
   first measurement has something to disagree with.
2. 🔴 **A WAY PAST `cc-adapter.mjs`, NOT A CHANGE TO IT.** Its level valued
   contract is right for what it was built for and it is measured and shipped.
   Relative traffic must not enter it: no coalescing, no interpolation, no
   COARSE folding, no keyframe. The clean seam is a `rel:` address kind, §5.3,
   recognised before the CC path is reached.
3. ⚠️ **AND THE WIDGET, WHICH IS THE SMALLEST PART.** On these two devices a
   relative encoder only ever flows INTO the browser: the Model 12 recognises
   nothing, and the Circuit has no relative controller in its map. So nothing
   here needs to SEND one. The virtual control is a slider over the accumulated
   value that a person may also drag, which then diverges from the hardware
   knob, and **no message exists that could reconcile them**, because the
   surface does not listen. §9.

⚠️ **UMP WOULD MAKE THIS NATIVE AND IT IS NOT AVAILABLE.** MIDI 2.0's Universal
MIDI Packet has a relative controller message with a 32 bit signed delta, which
is this type with the ambiguity removed. 📁 REPO, `plan-midi2.md`: Chrome
**refuses `midi2` and `ump` by name** as permission types and Safari has no Web
MIDI at all. So the 7 bit two's complement encoding above is the only one there
is on this machine today.

---

# PART TWO: COMPOSING A LAYOUT

## 5. What a layout IS as data

### 5.1 Three levels, and conflating two of them is the usual mistake

| level | what it holds | how many | who writes it |
|---|---|---|---|
| **the MAP** | every address the device has, its type, its range, its default | ONE per device | transcribed from §3 and §4, never edited afterwards |
| **the LAYOUT** | which of those to show, in what order, as which type, in which group | several per device | a person, for a task |
| **the STATE** | what each address is at right now | one per patch, per session, per moment | the device, or a hand |

🔴 **"PER DEVICE OR PER PATCH" IS THE QUESTION THIS TABLE ANSWERS, AND THE
ANSWER IS THAT THEY ARE DIFFERENT OBJECTS.** A map is per device and per
firmware. A layout is per TASK: a performance layout, a sound design layout, a
mixer layout, three different arrangements of one map. A patch is STATE, and
📁 REPO `cc-adapter.mjs`'s `foldRows` already holds exactly that shape, one
entry per address with its current value. A layout that is "per patch" is a
layout that has swallowed its own state and can no longer be shared.

### 5.2 The layout is DERIVED from the map, never typed twice

📄 DOC, and this is the useful accident: the PRG's own tables already have the
columns a control needs.

```
| section | parameter        | CC | range    | default |
| Filter  | frequency        | 74 | 0 to 127 | 127     |
| Osc 1   | wave             | 19 | 0 to 29  | 2       |
| Mixer   | pre FX level     | 58 | 52 to 82 | 64      |
```

`section` is the group. `parameter` is the label. `CC` plus the table's own
channel is the address. `range` is min and max. `default` is the starting value
and, for T2, the centre.

🔴 **SO A LAYOUT ROW REFERS INTO THE MAP BY ID AND CARRIES NOTHING THE MAP
ALREADY KNOWS.** CLAUDE.md's rule, measured twice on this repo: a shared
measurement in two files is a measurement that will disagree, and the MIM corpus
lesson is sharper still, that a lookup keyed by a name a re-encode can change
silently re-credited somebody's recording. **Key by `id`, never by label and
never by position in a table.**

```js
// the map: one row per address, and the id is what everything else refers to
{ id: 'synth.filter.frequency', ch: 0, at: { kind: 'cc', n: 74 },
  type: 'abs7', label: 'FREQUENCY', group: 'FILTER', min: 0, max: 127, def: 127 }

// the layout: a selection and an arrangement, and nothing else
{ id: 'circuit-filter', device: 'circuit', title: 'FILTER',
  rows: [
    { of: 'synth.filter.frequency', as: 'fader' },
    { of: 'synth.filter.resonance', as: 'fader' },
    { of: 'synth.filter.type',      as: 'picker' },
  ] }
```

⚠️ **`as` IS ALLOWED TO NARROW AND NOT TO CONTRADICT.** The map says a
parameter is `enum`; a layout may choose `choice` or `picker` for it, because
that is a decision about the screen. A layout may not render an `enum` as a
fader, and the builder should throw rather than draw it, the way
`createSliderGroup` throws on a table with no growing column and `mount()`
throws on an odd readout.

🔴 **AND THE DERIVED FORM NEEDS A CHECK IT CAN FAIL, WHICH IS THE MIM LESSON
AGAIN.** Comparing the control's starting value against the map's `default`
agrees with itself, because both come from one field. The independent source is
the DEVICE: 📄 DOC §3.8, a `40` Current Patch Dump Request returns 340 bytes
documented address by address, so a patch read back is a second opinion about
what every control should be showing. ⚠️ That needs SysEx, which 📁 REPO two
files currently refuse (`midi.mjs:57` and `hardware.mjs:115` both pass
`{ sysex: false }`), so it is a deliberate escalation and not a free check.

### 5.3 The address is a tagged union, and the tag is the transport

🔴 **`(channel, controller)` IS THE KEY. NEVER THE CONTROLLER ALONE.** 📄 DOC
§3.1, the collisions are real: CC 12 is drum 1 level on channel 10 and synth 1
level on channel 16, CC 14 is drum 1 pitch and synth 2 level, CC 74 is the synth
filter on channels 1 and 2 and the MASTER filter on channel 16, CC 80 is macro
knob 1 on the synths and drum 4 pan on channel 10. §4.2 E above measures what
happens when the channel is dropped.

Six kinds, and the widget never knows which one it is bound to.

| kind | the address | what goes on the wire | may it coalesce | may it interpolate |
|---|---|---|---|---|
| `cc` | channel, controller | `Bn cc v` | **yes**, and it should | yes |
| `nrpn` | channel, bank, number | CC 99, CC 98, CC 6 in sequence | **no**, the select is state | no |
| `pb` | channel | pitch bend, 14 bit | yes | yes |
| `note` | channel, note | note on and note off | **no**, edge valued | no |
| `rel` | channel, controller | a delta, `0x01` or `0x41` | **no**, §4.2 C | **no**, §4.2 D |
| `pgm` | channel | `Cn index`, no bank select | yes, last wins | no |

⚠️ **THE TWO "NO"s IN THE COALESCE COLUMN ARE NOT THE SAME NO.** A `note` must
not coalesce because a note on and a note off are two halves of one object.
A `rel` must not coalesce because every message is the whole of a movement. An
`nrpn` must not coalesce because the messages before it changed what the next
one means. Three reasons, and a sender that handles one of them is not handling
the others.

🔴 **AND THE MODEL 12 HAS NO SEND COLUMN AT ALL.** Everything above is about
the Circuit. A Model 12 layout's addresses are read only, which is §9.

### 5.4 Where a layout lives on a page

📁 REPO, and this is not a style question.

- **Not in `.pos-controls`.** `demo/verify.mjs` and `demo/verify-gl.mjs` press
  every `.pos-controls button` on every run. A layout of 32 MCU buttons in that
  row is 32 presses at a real instrument on every suite run, dozens of times a
  day. `slider.mjs`'s header already states this rule for the invisible hand and
  the reason is identical.
- **In `d.el`, the way `createSliderGroup` already goes.** Which means
  `verify.mjs` cannot press any of it, which means the page asserts through
  `set()` and the component's own API, which is the bargain `slider.mjs` and
  `keyboard.mjs` both already name.
- **One or two page level controls in `.pos-controls`**, and they are the slow
  ones. CLAUDE.md: `settleMs` lands on control 0 only, and adding a page's first
  control moves every other control's harness press. Asking for MIDI access is
  the slow thing here, so it is control 0.

---

## 6. Vertical sliders, which the ask names

### 6.1 What `createSlider` is today, exactly

📁 REPO, `slider.mjs` and `shell.css:1368` onward.

- `.sld` is `inline-flex`, `align-items: center`, `height: 34px`, and 34 px is
  load bearing: controls share a flex row and anything taller makes the row grow.
- `.sld-lane` is `width: 96px; height: 34px` standalone, `width: auto` inside a
  group, with an INSET SHADOW rather than a border, and the reason is measured:
  a border insets the padding box so the handle's travel is short by a pixel at
  each end.
- `.sld-knob` is `position: absolute; top: 0; left: 0; width: var(--sld-knob);
  height: 34px`, and `paint()` writes
  `knob.style.left = calc(pct% - pct * var(--sld-knob) / 100)`, which is a
  percentage of the TRAVEL rather than of the lane so the ends land flush.
- `fromX(clientX)` reads `lane.getBoundingClientRect()` and computes
  `travel = r.width - kw`.
- `.sld-head` stacks the label above the number, left aligned, and the number
  reserves its widest possible string in `ch` with `tabular-nums`.
- `createSliderGroup` is a grid, `grid-template-columns: max-content
  minmax(0, 1fr)`, with `.sld { display: contents }` so each slider's parts land
  in the shared columns. The whole argument for it is that four sliders laying
  themselves out means four lanes starting at four different x positions.

### 6.2 What vertical costs

**The widget: small, and one line of it is where the bug will be.**

- `paint()` writes `top` instead of `left`, and **top grows downward while a
  value grows upward**, so it is `1 - t`. That inversion is the single place a
  vertical slider silently reads backwards, and it will look plausible.
- `fromX` becomes `fromY` with `r.bottom - clientY` and `travel = r.height - kh`.
- The keyboard needs nothing. 📁 REPO, `slider.mjs:428` already maps
  `ArrowUp` and `ArrowRight` to plus and `ArrowDown` and `ArrowLeft` to minus, so
  a vertical lane is already correct from the keyboard today.
- `aria` needs nothing: `role="slider"` with `aria-valuemin`, `aria-valuemax`
  and `aria-valuenow` says nothing about an axis.

So: **`axis: 'y'` is an option on `createSlider`**, two branches in two
functions, and the component stays one component. A second slider component
would be two copies of the invisible hand, the glide, the reserved width, the
exponential lane and the yield rule.

**The container: not small, and it is a different object.**

`createSliderGroup` exists to align lanes' LEFT EDGES down a column. A rack of
vertical faders wants to align their TOPS and BOTTOMS across a row, which is the
transpose, and the grid that does one cannot do the other with a flag.

- N columns, one per fader, each as wide as `max(34, its widest value)`.
- The head goes under the lane or over it, centred rather than left aligned,
  because a 5 character number does not fit beside a 34 px column.
- A height has to come from somewhere. 34 px is the row's number and it is not
  a fader's; 120 px to 160 px is a fader, and whatever it is, it is declared once
  as a token the way `--sld-col` already is, because 📁 REPO records that a
  shared measurement typed in two files disagreed three times on `/radio/`.

So: **`createFaderBank` is a second container**, and that matches how the kit
already splits `createSlider` from `createSliderGroup`.

🔴 **AND THE CSS ORDERING TRAP IS A MEASURED ONE, NOT A HYPOTHETICAL.**
CLAUDE.md: `.pos-pick`'s entire phone layout sat in a media block at line 1589
and its plain override sat at line 2052, same specificity, later in the file, so
the picker had **never** collapsed on a phone in its life, and it was found by
putting two controls side by side and measuring both. Any `.sld[data-axis="y"]`
rule goes AFTER the base `.sld` block, and the way to know it works is to point a
browser at it and read the COMPUTED value, not to review the source.

### 6.3 Where vertical is right, and where horizontal still wins

⚠️ **VERTICAL IS NOT A SKIN, IT IS A CLAIM ABOUT COMPARISON.** A rack of
vertical faders is worth its height when the useful reading is ACROSS them:
eight channel levels, four drum levels, a bank of sends. That is the Model 12's
whole surface and it is the Circuit's mixer and send sections.

Horizontal stays right where the reading is a single value against its own
range: a filter frequency, a portamento rate, one macro knob. And it stays right
for anything that must sit in the 34 px control row.

So a layout declares `as: 'fader'` or `as: 'slider'` per row, and the map does
not have an opinion. That is exactly the "do not have to be physically
supersimilar" instruction turned into a field.

---

## 7. Grouping and naming

📄 DOC, and this is the second useful accident: the Circuit's map is **already
grouped by Novation**. The PRG's own first column reads Voice, Osc 1, Osc 2,
Mixer, Filter, Env 1, FX, Macro, and §3.5's reads Reverb send, Delay send,
Master filter, Mixer. So the grouping is DOC rather than invented, and a layout
that uses it is using the manufacturer's own organisation of their own synth.

📁 REPO, what exists and what does not.

- `createSliderGroup` **takes no label**, and `/grains/` was reported for
  ungrouped controls. A group with a name is `{ label }`, one option.
- `.kit-h` is the existing uppercase heading treatment, and CLAUDE.md's rule is
  that the newest thing goes at the top of `/kit/` and its heading is uppercase,
  typed uppercase so the source reads like the page. Every control component
  here already uppercases its `label` in CSS, so a group heading should too.
- `stack.mjs` is the existing "blocks of a page, and the air between them".
- 🔴 **NO DIVIDERS BETWEEN GROUPS.** CLAUDE.md: separation is spacing, not
  lines, and an empty box is a line. `shell.css` sets one vertical rhythm on the
  gap between siblings, and a container with nothing in it must not paint its
  edges, which is the measured `/typist/` bug where `readout: null` still drew a
  2 px full width band.

⚠️ **AND A GROUP HEADING IS NOT A `what` PARAGRAPH.** CLAUDE.md, instructed
2026-09-19: descriptions are single sentences and may not be stretched with a
colon or a semicolon or a dash. A layout with eight groups must not grow eight
explanations. The group's name is `FILTER`; what a filter is belongs in the
page's one sentence or in the diagram's note, and nowhere else.

---

## 8. Declaring, storing and naming a layout

**Declared** as plain data, in a module, next to the map it refers into. 📁 REPO
precedent: `demo/resources/corpus.json` is this project's shape for a fact
measured once and written down, and `build-corpus.mjs` merges a measured file
into it rather than letting a page re-derive it on every visit.

**Stored** the same way for the ones this repo ships. A layout a VISITOR makes
is a different question and it is deliberately not answered here: it needs a
place to put it, a name, a way to get it back, and none of that is decided by
anything in the two MIDI maps. ⚠️ Naming it as an open question rather than
guessing, because CLAUDE.md is a list of confident sentences that outlived what
they described.

**Named** by a slug, lowercase, the way every demo is, and the layout's `title`
is what a person reads. The slug is the identity and the title may change.

⚠️ **AND WHERE THE FILES GO IS `LAYOUT.md`'s ANSWER, NOT THIS DOCUMENT'S.**
What this document asserts is only that the map and the layout are two files, not
one, and that a page imports both.

---

## 9. What a layout does when the device is not there, and the harder case

### 9.1 Four states, and `midi.mjs` already reports three of them

📁 REPO, `demo/shell/midi.mjs` reports `unsupported`, `refused` and
`none plugged in` as three separate states, and its header says why: a browser
without Web MIDI is not a fault, and a demo that reports a missing optional
capability as an error teaches its reader that red means nothing. That file was
written before Chrome 124 made the permission prompt apply to all Web MIDI and
it already had the right three way split.

The fourth state is new here: **plugged in, but it is not the device this layout
was written for.** A layout is written against a map, and a map is a device and
a firmware. 🔌 There is no published Web MIDI port name for either unit;
`plan-circuit-model12.md` §4.4 notes that TASCAM's own manual prints the DAW
control port name two different ways in one document, with and without
parentheses, and that the DIN pair's macOS name is not printed anywhere.

📁 REPO, `caps.mjs` supplies the three rules this needs and they are already
argued: it is a capability test and never a brand check, a probe that could not
answer returns `unknown` and `unknown` never blocks, and `midi` is deliberately
SOFT because the on-screen keys still play.

### 9.2 So: it draws, it moves, and it says once that nothing is listening

- **Do not grey out 150 controls.** CLAUDE.md: a disabled control is a check the
  harness can no longer reach, measured twice in one day on two pages
  independently, costing ten asserts on `/mirror/` and six on `/blocks/`. A
  layout that disables itself when no device is present disables its own
  coverage on every machine in the suite.
- **Do not let a control look live and be inert.** That is this project's named
  hazard and `/mirror/`'s ⛶ is the worst case of it: `p.requestFullscreen?.()`
  optional-chained straight past a missing method, so there was no throw, no
  catch, no log line and no picture.
- **The middle is what the board pages already do.** 📁 REPO, `board.mjs` and
  `presence.mjs`: a badge that says whether the thing in the other building is
  answering, in words, plus one log line when the state changes. `transport-bar`
  carries that badge as its `chip` and `/keys/` and `/knobs/` both use it.

### 9.3 🔴 The harder case: a Model 12 layout is NEVER confirmed, even plugged in

This is the sharpest thing in part two and it follows straight from the map.

📄 DOC §4.3, the DAW control chart: pitch bend TRANSMIT yes, RECOGNIZE **no**.
📄 DOC, repeated on every single DAW page of the manual, verbatim: *"the DAW
settings and the state and positions of the Model 12 buttons, knobs and faders
will not match."* 🌐 THIRD PARTY, Sound on Sound: *"you'll need to familiarise
yourself with how to optimise your DAW to respond to non-motorised faders."*
📄 DOC §2 and §4.2, the general ports: every cell in the RECOGNIZE column is NO.

**So the two devices produce two opposite kinds of layout and they should not
pretend to be one kind.**

| | Circuit layout | Model 12 layout |
|---|---|---|
| direction | this page SENDS | this page RECEIVES |
| can it read the device back | only by SysEx, §3.8, and this repo asks for `{ sysex: false }` today | never, in any way |
| what a control means | a command | the last thing that arrived |
| what a wrong value looks like | the synth does the wrong thing, audibly | the screen and the hardware disagree, silently |
| the one honest claim | "I sent this" | "I was told this" |

⚠️ **AND THAT MAKES THE MODEL 12 LAYOUT MORE USEFUL, NOT LESS.** Its faders
have no motors and its lamps are lit by whatever is listening, so the hardware
CANNOT show you its own state. A screen can. A virtual Model 12 is the display
the console does not have, and that is a better reason to build it than mirroring
would have been.

🔴 **AND A CONTROL A PERSON DRAGS ON A MODEL 12 LAYOUT CREATES A DIVERGENCE
NOTHING CAN CLOSE.** If somebody moves the virtual fader, the hardware fader is
still where it was and no message exists that could tell it. Three honest
options and the plan does not pick one, because it is a design decision for the
first page rather than a fact about the device: make those controls read only, or
let them move and mark them as no longer agreeing, or let them move and say so
in the log. What is NOT an option is letting them move silently.

---

## 10. What a layout must not do

Collected, because each of these is somewhere in CLAUDE.md already and a layout
page is the shape that breaks all of them at once.

1. 🔴 **Never ask for MIDI access on load.** `requestMIDIAccess` raises a
   permission prompt since Chrome 124, for all Web MIDI and not only for SysEx.
   A page that asks on load pops a dialog at somebody who pressed nothing.
   📁 REPO, `demo/instrument/index.html` already puts it behind a button, and
   this is the `/reel/` lesson in a different accent: that page fetched from ERR
   on its load path for a first frame nobody had asked to see.
2. 🔴 **Never run a self check for a visitor**, gated on `?selfcheck=1` through
   `demo/shell/selfcheck.mjs`. On a layout page this matters more than usual,
   because a check that presses a control SENDS MIDI to a real instrument in
   front of somebody. And the gate covers the whole cost, not the audible part.
3. 🔴 **No tempo control.** §3.14.
4. 🔴 **No bank select before a program change.** §3.10.
5. ⚠️ **No SysEx unless it is a deliberate escalation.** 📁 REPO, `midi.mjs:57`
   and `hardware.mjs:115` both pass `{ sysex: false }` today, and 📄 DOC, MDN:
   `sysex` is a distinct sub field of the `midi` permission descriptor, so it is
   a larger form of the same grant and a stronger prompt.
6. ⚠️ **Do not re-publish `__demo.transport`.** §3.11, and CLAUDE.md records the
   exact failure: the harness throws inside its own drill, so the output names
   the harness rather than the page and nothing in the per page count moves.
7. ⚠️ **Do not put the layout in `.pos-controls`.** §5.4.
8. ⚠️ **Watch the assert count.** CLAUDE.md: a page that gains its first control
   moves every other control's harness press, and `settleMs` only ever lands on
   control 0. A layout page will gain and lose controls constantly.

---

## 11. The smallest first layout

### 11.1 The answer: one Model 12 MCU channel strip, channel 1 only

Four controls. Every one of them is a different address kind, and three of the
four are kinds this repo cannot do today.

| control | address | type | kit today |
|---|---|---|---|
| **fader 1** | `pb:0`, pitch bend channel 1, 14 bit | T6 absolute, inbound | ✅ **handled correctly already** |
| **V-Pot 1** | `rel:0:16`, CC 16, `0x01` up and `0x41` down | T5 relative, inbound | 🔴 nothing |
| **MUTE 1** | `note:0:16`, note on and note off | T7 momentary, inbound | ⚠️ exists only inside the keyboard |
| **MUTE 1's lamp** | `note:0:16` velocity 0, 1, 127 | T8 a control that reads, outbound | 🔴 nothing |

🔴 **THE FADER IS IN IT DELIBERATELY AND IT IS THE NEGATIVE CONTROL.** §4.2
measured that `pb:<channel>` is already keyed correctly and folded correctly, so
one of the four should work on the first run. A first layout in which everything
is new cannot tell "the new code is wrong" from "the whole approach is wrong".

⚠️ **AND FOUR CONTROLS IS ALSO A FOUR CELL READOUT, WHICH IS EVEN**, which
`mount()` requires.

### 11.2 It needs no hardware, and that is the point

🔴 **IT NEEDS A STAND IN, AND THIS PROJECT HAS THREE ALREADY.**
`demo/fake-station.mjs` is an Icecast mount that is nobody's radio,
`demo/fake-tapes.mjs` is an archive that is nobody's archive,
`demo/fake-err.mjs` is a live edge that is nobody's broadcaster. A
`fake-mcu.mjs` is the same idea one layer in: not a server, a module that
produces the exact byte sequences §4.4 predicts, so the page's decoder can be
graded with nothing plugged in.

⚠️ **AND THEN SABOTAGE IT, BECAUSE A STAND IN MAKES A PAGE RUNNABLE WITHOUT
MAKING IT GRADED.** CLAUDE.md records four instances of that pattern, two on
`fake-tapes.mjs` and two on `fake-err.mjs`, where a page read fully green
against a stand in that had been broken on purpose. The sabotages that matter
here, and what each one proves:

| break | what should go red | what it proves |
|---|---|---|
| serve every V-Pot click as an ABSOLUTE value | the encoder's accumulated position | the page is decoding rather than reading |
| serve five clicks in 10 ms | the accumulated position, by exactly five | the coalescer is not in the path, §4.2 C |
| stop sending lamp messages | the lamp's own state, and it must read `unknown` rather than `off` | `presence.mjs`'s rule, that nobody having answered is not the same as off |
| send a fader on channel 2 instead of channel 1 | nothing on strip 1 | the channel is part of the key, §4.2 E |

🔴 **AND A NEGATIVE CONTROL, WHICH IS THE HALF THAT PROVES THE INSTRUMENT.**
A page that reported a divergence whatever it was shown would pass "a divergence
was found". So the stand in also sends one strip that behaves perfectly, and the
page must assert BOTH that the broken strip is reported broken AND that the good
one is reported good. The first goes red under sabotage and the second stays
green, which is correct.

### 11.3 The second and third rungs, named so they are not invented later

**Second: the Circuit's master filter, one slider.** CC 74 on channel 16, the
folded range from §3.5. It is one control and it proves the other direction:
this page SENDS, the address is `(channel, controller)` and channel 16 is not
channel 1, the range folds at 64 so the label changes as the value crosses, and
nothing reads back. 🔌 It needs a Circuit, because there is no useful stand in
for "did the sound change".

**Third: the Circuit's filter section, eight controls, as vertical faders.**
Frequency, resonance, drive, tracking, Q normalize, env 2 to frequency as five
T1 and T2 faders, plus filter type and filter drive type as two T3 pickers, plus
filter routing as a T3 choice of three. One group, mixed types, the manufacturer's
own section name as its heading, and the first thing in this project that is a
LAYOUT rather than a control.

---

## 12. What is genuinely uncertain

**The ones that would change the plan.**

1. 🔌 **Whether MCU V-Pots on a Model 12 send the relative codes at all.**
   🌐 THIRD PARTY is one reverse engineering document and ⚖️ §4.4 already
   suspects the PAN knobs are physical pots, which would mean absolute values
   from a control the protocol says is an encoder. If they are absolute, T5 is
   still needed for the jog wheel and stops being the biggest gap.
2. 🔌 **Whether MCU click SPEED is encoded.** Some hosts read the low nibble as
   a count, so `0x05` is five clicks. Nothing says whether the Model 12 does.
   A decoder written for one click per message will under count a fast turn and
   it will look like a stiff knob rather than a bug.
3. 🔌 **Which controllers carry NRPN on a Circuit.** ⚖️ INFERRED as the MIDI 1.0
   convention because there is no other one, and Novation did not write it down.
   Cheap to check with a MIDI monitor, expensive to be wrong about, and half the
   synth is behind it.
4. ⚠️ **Where a visitor's own layout would be stored**, §8. Undecided on purpose.
5. ⚠️ **Whether a Model 12 layout's controls should be draggable at all**, §9.3.
   Three honest options and this plan picks none.

**The device questions, all cheap once something is plugged in.**

6. 🔌 The Web MIDI port name strings for both units, on this Mac, in Chrome.
7. 🔌 The thirty waveform names and the sixty four drum patch names, §3.3.
8. 🔌 Whether the Circuit receives pitch bend as a performance message. The PRG
   documents CC 28 and CC 40 as the bend RANGE and 📄 DOC §3.9 lists the realtime
   and system common messages it supports. **Neither says whether a bend itself
   is received**, and this plan does not claim it either way.
9. 🔌 Whether the Circuit's own CC to cutoff curve is already perceptual, §3.1.

---

## 13. What a person has to approve before any of this is built

Nothing in this document has been built and nothing should be until these are
answered, because three of them are shared code and CLAUDE.md is explicit that
anything shared is done ONCE, by one agent, before any page agent starts.

1. **Does `axis: 'y'` go on `createSlider`, and does `createFaderBank` become a
   second container?** §6. It is a change to the most used component in the kit.
2. **Does the relative encoder become `demo/shell/relative.mjs`, sitting BESIDE
   `cc-adapter.mjs` rather than inside it?** §4.3. This is the biggest single
   decision in the plan.
3. **Do `momentary: true` and a three state `lamp()` go on
   `createButtonGroup`?** §3.7 and §3.8.
4. **Is `createPadGrid` a new component?** §3.12. `keyboard.mjs`'s own argument
   says yes and it is worth somebody disagreeing out loud.
5. **Is `makeCcSend` repaired to key by `${ch}:${controller}`?** §4.2 E measures
   the defect and `plan-circuit-model12.md` §6.5 measures it independently.
   ⚠️ It changes what a meter counts, so per this project's own rule the per page
   assert counts have to be diffed afterwards.
6. **Is `fake-mcu.mjs` built before the page?** §11.2. The alternative is a page
   that can only be run with a console plugged in, which means it is graded by
   nobody.
