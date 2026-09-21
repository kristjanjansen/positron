# plan-panel-layouts: where every control physically sits on the four devices

> 🔴 **NOTHING IN THIS FILE IS BUILT.** No page was changed, no module was
> added, nothing was committed and nothing was deployed. It is a description of
> four pieces of hardware, written so that a layout can be drawn without owning
> any of them.
>
> 🔴 **AND IT IS THE HALF THAT `plans/plan-circuit-model12.md` AND
> `plans/plan-fasttrack-mk425c.md` DO NOT HAVE.** Those two answer *what does
> this control send*. Neither answers *where is it*. `demo/twelve/index.html`
> already draws one TASCAM Model 12 channel strip, every MIDI number in it
> measured, and its ARRANGEMENT was reasoning plus two corrections shouted from
> in front of the hardware. This file settles the arrangement.

## The ask

> *"do you have mod 12 visual layout?"*, then *"yes. look up layputs for others
> too"*.

## Evidence marks, used on every claim

| mark | means |
|---|---|
| 🖼️ **DIAGRAM** | read off the manufacturer's own panel drawing or photograph, rendered from the PDF at 200 to 1600 dpi and looked at. The strongest thing here, and new in this file. |
| 📄 **DOC** | read out of the prose of a manufacturer PDF, with the URL. |
| 📁 **REPO** | read out of this checkout. |
| ⚖️ **INFERRED** | reasoned from something above. Nobody wrote it down. |
| 🔌 **NEEDS THE HARDWARE** | cannot be settled without the thing in front of you. |
| 🔴 **MEASURED** | off the wire, from `measured-devices-2026-09-20.md`. |

🔴 **THE WARNING IN THE BRIEF WAS RIGHT AND THERE IS A WAY PAST IT.** A panel
diagram is a picture and `pdftotext` loses its geometry: on Model 12 owner's
manual page 21 the callout numbers are not in the text layer at all, so the only
thing extraction returns is the numbered list. **The way past it is to render
the page and look at it**, which is what 🖼️ DIAGRAM means throughout. Where a
statement below comes from reconstructing an order out of a callout list rather
than from seeing the drawing, it says so in those words.

```sh
pdftoppm -f 20 -l 20 -r 800 -png -x 2090 -y 1400 -W 480 -H 1320 model12_om.pdf ch1top
```

`-x -y -W -H` crop in device pixels at the given resolution, so a strip can be
pulled out at 800 dpi and read. `sips -r 90` rotates, which is the only way to
read the Evolution manual, whose keyboard photograph is printed on its side.

---

# 1. TASCAM Model 12

Sources, both fetched today and both 200:

- Owner's Manual, 228 pages:
  <https://cf.tascam.com/wp-content/uploads/downloads/products/tascam/model_12/model-12_om_efs_vh4.pdf>
- DAW Control Mode Manual, 23 pages:
  <https://cf.tascam.com/wp-content/uploads/downloads/products/tascam/model_12/e_model-12_daw_control_om_vc.pdf>

📄 DOC, dimensions: **343.0 x 98.8 x 360.0 mm** with the side panels,
**315.0 x 98.8 x 360.0 mm** without. 🖼️ The drawing agrees: the panel measures
about 0.92 wide for every 1 deep, against 0.875 from the figures.
🔴 **SO THE PANEL IS TALLER THAN IT IS WIDE, AND A LAYOUT THAT ASSUMES A MIXER
IS A LANDSCAPE OBJECT IS WRONG BEFORE IT STARTS.** Eight channel strips and a
master column share 315 mm of width, so one strip is about 26 mm wide and
about 300 mm tall: a ratio of roughly **1 to 11**. 📄 The faders are **60 mm**.

## 1.1 The top panel is six regions, and the manual names them

🖼️ DIAGRAM, owner's manual page 20, callouts A to F:

| region | what it holds | where |
|---|---|---|
| **A** input channel mixing section-1 | GAIN, LOW CUT, INST | top left, across all 8 channels |
| **B** input channel mixing section-2 | everything else per channel, down to the fader | the whole left three quarters |
| **C** equalizer section | MASTER SECTION EQ, PHONES, PHANTOM, SD slot | top right |
| **D** screen operation section | display, meters, F1 to F4, MULTI JOG, transport | upper right, under C |
| **E** monitoring section | AUX 1/2 monitor, PHONES levels, Bluetooth, CLICK | middle right |
| **F** analog output adjustment | FX, SUB and MAIN faders | bottom right |

The eight channel strips occupy the left of the panel. The master column is a
single vertical stack down the right, and C, D, E and F are its four floors.

## 1.2 One channel strip, top to bottom

🖼️ DIAGRAM, read off the owner's manual page 20 rendering of channels 1 and 2 at
800 dpi. **This is seen, not reconstructed from the callout list.**

| # | control | kind | panel legend |
|---|---|---|---|
| 1 | channel number | printed badge, white on black | `1` |
| 2 | **GAIN** | knob, with SIG indicator at its top right | arc marked `0 / LINE / MIC`, scale `-10  0  dB  +50+40` |
| 3 | **LOW CUT** | push switch, left of a pair | `LOW CUT` `100Hz` |
| 4 | **INST** | push switch, right of that pair | `INST` |
| 5 | **MODE** | slide switch, on a black band across the strip | `LIVE` to `MTR`, with `DIRECT  PC` and `USB` under it |
| 6 | **COMP** | knob, with an indicator at its top right | `OFF` to `MAX` |
| 7 | EQ **HIGH** | knob, first of four in a bordered box | `EQ` at left, `0` above, `10kHz`, scale `-15 dB +15` |
| 8 | EQ **MID frequency** | knob, second in the box | `600` above, `100  Hz  8k` below |
| 9 | EQ **MID gain** | knob, third in the box | `MID` at left, `0` above, `-15 dB +15` |
| 10 | EQ **LOW** | knob, fourth in the box | `0` above, `80Hz`, `-15 dB +15` |
| 11 | **AUX 1** | knob, first of a bracketed pair | `AUX` bracket at left, `AUX 1`, `0`, `inf dB +15` |
| 12 | **AUX 2/FX** | knob, second of that pair | `AUX 2/ FX`, `0`, `inf dB +15` |
| 13 | **PAN** | knob, alone between two rules | `PAN`, `C` above, `L` and `R` |
| 14 | **REC** | wide rectangular button, spanning the strip, with a round indicator below it and to the right | `REC` printed under the button |
| 15 | **channel fader** | 60 mm fader, on the LEFT of the lower block | ticks left of the slot, numbers right: `dB 10, 5, 0, 5, 10, 15, 20, 30, 40, inf` |
| 16 | **MUTE** | square switch, in a column to the RIGHT of the fader, level with `dB 10` | `MUTE` |
| 17 | **MAIN** | square switch, same column, level with `10` | `MAIN` |
| 18 | **SUB** | square switch, same column, level with `20` | `SUB` |
| 19 | **SOLO** | square switch, same column, level with `inf`, with a round indicator below it | `SOLO` |
| 20 | channel number again | printed badge at the foot of the strip | `1` |

🔴 **THE THING A GUESS GETS WRONG IS THE BOTTOM BLOCK, AND IT IS NOT A COLUMN.**
REC sits **above** the fader and spans the strip. MUTE, MAIN, SUB and SOLO sit
**beside** the fader, in a column to its right, at four fixed heights on the
fader scale. Nothing is under the fader but the channel number. A stack of
REC, MUTE, SOLO above a fader is the arrangement no channel on this mixer has.

⚠️ **THE POST INDICATOR IS SHARED AND LIVES ON CHANNEL 1's STRIP.** 🖼️ A single
LED sits to the left of the AUX bracket in the channel 1 column, legended
`POST` `CH1-10`. 📄 DOC, callout 8: *"POST indicator (shared by all channels).
When this indicator is lit, signals are sent to the AUX 1 bus after the channel
faders."* Drawing it on every strip would be drawing eight of one thing.

⚠️ **THERE IS NO SELECT BUTTON ON ANY CHANNEL.** 🖼️ Mackie Control specifies a
per channel SELECT on notes 24 to 31, and this mixer has no control that can
send one. A layout that draws an MCU strip faithfully draws a button the Model
12 does not have.

## 1.3 Which channels differ

🖼️ DIAGRAM, read off channels 7/8 and 9/10 at 800 dpi beside channels 1 and 2.

| | channels 1 to 6 | channel 7/8 | channel 9/10 |
|---|---|---|---|
| control set | the 20 rows above | **identical** | **identical** |
| GAIN scale | `-10  0  dB  +50+40` | `-20  0  dB  +50+30` | `-20  0  dB  +50+30` |
| pan legend | `PAN` `C` `L` `R` | `PAN` `C` **`BAL`** `L` `R` | `PAN` `C` **`BAL`** `L` `R` |
| input | mono, one combo jack | **stereo**, combo jack for L plus a TRS for R | **stereo**, combo jack for L plus a TRS for R |
| extra | none | none | **Bluetooth glyph beside MODE** |

🔴 **SO THE PANEL LAYOUT IS THE SAME ON ALL EIGHT AND THE LEGENDS ARE NOT.**
Every knob, switch, button and fader is in the same place on every strip, which
is what makes one drawn strip reusable. Three legends change, and on 7/8 and
9/10 the pan knob is a balance control, which is a different thing said with the
same knob.

📄 DOC, rear panel, on why they are stereo: *"The TRS jacks are for standard TRS
stereo line input. If only the L jack in a pair is connected, the same signal
was be sent to both left and right channels"*, against *"The TRS jacks are for
standard TRS mono line input"* on 1 to 6. And *"Activating the INST switch only
affects the L jack"*, so the INST switch on a stereo pair is half a switch.

📄 DOC, the Bluetooth glyph: the ASSIGN switch in the monitoring section sends
the Bluetooth receiver to `9/10` or to `MAIN`, or turns it `OFF`.

## 1.4 The master column, top to bottom

🖼️ DIAGRAM, four crops at 800 dpi.

**Floor C, the equalizer section.** A bordered box headed `MASTER SECTION EQ`
holding four knobs in a **2 by 2 grid**, not a column:

| | left | right |
|---|---|---|
| **top** | `HIGH`, `0`, `10kHz`, `-15 dB +15` | MID frequency, `800` above, `100 Hz 8k` below |
| **bottom** | `LOW`, `0`, **`60Hz`**, `-15 dB +15` | MID gain, `0`, `-15 dB +15` |

A square push switch sits to the right of the MID frequency knob with two
curve glyphs under it: 📄 DOC, *"This sets the acuteness of the MID band"*,
narrow when on and broad when off. Two more square switches run along the
bottom of the box: `AUX 1/2 / MAIN MIX` and `EQ IN / BYPASS`. To the right of
the box, a vertical pair of standard stereo `PHONES` jacks numbered `1` and `2`.
To the right of those, `PHANTOM +48V` with its indicator, and under it the
`PUSH EJECT` SDXC card slot.

⚠️ **THE MASTER EQ IS NOT THE CHANNEL EQ WITH A DIFFERENT NAME.** Its LOW is
60 Hz against the channel's 80 Hz, its MID centre defaults to 800 Hz against
600 Hz, and it has a Q switch the channels do not.

**Floor D, the screen operation section.** A black panel with `TASCAM` across
the top. Left edge, two indicators stacked: `USB` above `PFL/AFL`. Centre, the
LCD. Right edge, a **stereo LED ladder** headed `MAIN`, segments marked
`OL, 15, 10, 6, 3, 0, -2, -4, -7, -10, -20, -30` with `L (dB) R` at its foot.
Under the display, four function buttons in a row with leader lines up to the
soft labels on the screen: 📄 DOC, *"From left to right, they are called the F1,
F2, F3 and F4 buttons."* Under that, a second block in two rows:

```
row 1:   MULTI JOG        MENU       <<        >>
row 2:   (dial, tall)     STOP       PLAY/PAUSE  RECORD
```

The `MULTI JOG` dial is a large encoder spanning both rows on the left, with
arrows either side and `PUSH ENTER` printed under it. 📄 DOC: *"This dial
functions as a dial when turned and as a button when pressed."* The stop button
is drawn wider than the other two, inside a bracket shape.

**Floor E, the monitoring section.** Three rows on the left, a Bluetooth block
and a CLICK block on the right:

| row | left to right |
|---|---|
| 1 | AUX 1 knob (`inf dB +10`), MUTE indicator over MUTE switch, AFL switch, badge `AUX 1` |
| 2 | AUX 2 knob (`inf dB +10`), MUTE indicator over MUTE switch, AFL switch, badge `AUX 2`, and to their right `SD MAIN MIX RETURN` with its indicator |
| 3 | `PFL/AFL MASTER` knob, then `PHONES` 1 and 2 knobs (`MIN` to `MAX`), each with an `AUX 1/2 / MAIN` switch under it |

Right of those, a rounded `Bluetooth` block holding the `PAIRING` button with
its indicator and the three way `ASSIGN` slide switch (`9/10  OFF  MAIN`). Far
right, a separate black column: `CLICK`, a `TAP` badge, a `TEMPO` indicator and
the `START/STOP` button.

**Floor F, the analog output adjustment section.** Three fader strips, left to
right **FX, SUB, MAIN**:

| strip | above the fader | beside the fader, top to bottom | foot |
|---|---|---|---|
| **FX** | `DIGITAL EFFECT PROCESSOR` badge, `TO AUX 1` knob (`inf dB +15`), `SELECT` button, and the printed list of 16 effects from `1 HALL 1` to `16 CHORUS+HALL 2` | MUTE, AUX 1, MAIN, SUB, AFL | `FX` |
| **SUB** | mute indicator | MUTE, MAIN | `SUB` |
| **MAIN** | `POST REC` switch with its indicator | MUTE | `MAIN` |

All three faders carry the same `dB 10 ... inf` scale as a channel fader.

## 1.5 Which of those are live in DAW control mode

🖼️ **DIAGRAM, AND THIS IS THE BEST SOURCE IN THE WHOLE FILE.** DAW Control Mode
Manual page 5 prints the entire panel with every enabled control **filled
blue**. 📄 DOC beside it: *"The blue knobs, switches and faders in the
illustration below are enabled."* Rendered at 700 and 1400 dpi and read.

**Blue on every channel strip, and nothing else on it:**

| control | blue | measured message |
|---|---|---|
| PAN | yes | 🔴 CC 16, relative, signed bit |
| REC | yes | 🔴 note 0, and **no release** |
| MUTE | yes | 🔴 note 16, clean pair |
| channel fader | yes | 🔴 pitch bend, 7 bit in a 14 bit message |
| SOLO | yes | 🔴 note 8, clean pair |

**Not blue, on every strip:** GAIN, LOW CUT, INST, MODE, COMP, all four EQ
knobs, AUX 1, AUX 2/FX, **MAIN** and **SUB**. 🔴 That last pair is already
measured as silent, and the diagram is why: they are analogue routing switches
and TASCAM never put them in the mode.

**Blue in the master column:**

| control | blue |
|---|---|
| F1 | **no, and this is the detail worth having** |
| F2, F3, F4 | yes |
| MENU | yes |
| MULTI JOG | yes |
| `<<` and `>>` | yes |
| STOP, PLAY/PAUSE, RECORD | yes |
| **FX fader** | yes, and 🔴 measured as the MCU master on pitch bend channel 9 |
| SUB fader, MAIN fader | no |
| everything in floors C and E | no |

🔴 **F1 IS WHITE IN THE DIAGRAM AND THE THREE BUTTONS BESIDE IT ARE BLUE.** 📄
DOC: *"To use it in ordinary mode, end DAW control mode with the F1 button."*
So F1 is the way out, not a DAW control, and its own manual lists only F2, F3
and F4 under *"Controls that can be used with the DAW"*. **A layout that draws
four identical function buttons is drawing one lie in four.**

📄 DOC, what F2 to F4 say on each of the two screens, which is what a drawn
button should carry:

| screen | F1 | F2 | F3 | F4 |
|---|---|---|---|---|
| DAW CONTROLLER **MARKER** | `EXIT` | `SET` | `<<` | `>>` |
| DAW CONTROLLER **TRACK** | `EXIT` | `CYCL` | `<=` | `=>` |

📄 The screen itself shows `SOLO` and the digits 1 to 8 with a hollow circle for
solo off and a filled one for solo on, which is the only lamp feedback this
mixer gives about the DAW's state.

🔴 **AND DAW CONTROL MODE COSTS THE MIXER, WHICH IS A LAYOUT FACT AND NOT ONLY
AN OPERATIONAL ONE.** 📄 DOC: only channels 1 and 2 can be heard; their faders
are *"always 0 dB"* wherever they sit, their PAN is forced hard L and R, and
the AUX 1/2/MAIN switches are forced to MAIN. 🖼️ DIAGRAM, DAW manual page 6
prints those in **yellow** as fixed, the input section in a **green** frame as
still affecting what goes to the computer, and two monitoring MUTE switches in
**red** as always on. So on the real panel, during DAW control mode, three
separate things are true of one strip: five controls drive the DAW, three are
physically dead, and the input half still works on the audio.

## 1.6 What this settles for `demo/twelve/index.html`

📁 REPO. That page draws PAN at the top, then a row of the fader with a column
of REC, MUTE, SOLO to its right aligned to the fader's foot. Against the
diagram:

| the page | the hardware | verdict |
|---|---|---|
| PAN above everything else | PAN is the last knob before the lower block | ✅ **right**, and now read rather than guessed |
| buttons beside the fader, not above it | MUTE, MAIN, SUB, SOLO are beside it | ✅ **right**, and the two corrections from the desk are confirmed |
| SOLO at the bottom | SOLO is the bottom of the four | ✅ **right** |
| REC above MUTE | REC is above, and it is **not in that column at all** | ⚠️ **half right** |
| REC in the column, same size as the others | REC is a **wide button above the fader**, spanning the strip, with its own indicator under it | 🔴 **wrong** |
| three buttons in the column | **four**, with MAIN and SUB between MUTE and SOLO | 🔴 **wrong**, and it changes where MUTE and SOLO sit relative to the fader |

⚠️ **THE FOUR COLUMN BUTTONS ARE AT FIXED HEIGHTS ON THE FADER SCALE**, which
is the thing that makes a drawn strip look like the object: MUTE at `dB 10`,
MAIN at `10`, SUB at `20`, SOLO at `inf`. Spacing three buttons evenly puts
none of them where the mixer puts it.

⚠️ **AND MAIN AND SUB ARE DEAD IN DAW CONTROL MODE, WHICH IS EXACTLY WHY THEY
SHOULD PROBABLY BE DRAWN.** They are the two controls whose absence from the
mode is the point: 🔴 measured as sending nothing, 🖼️ shown white in TASCAM's own
enabled diagram. Drawing them and disabling them says something true. Leaving
them out makes MUTE and SOLO adjacent, which is a statement about the panel
that is false. This is a decision for whoever edits the page, not a decision
this file makes.

## 1.7 Rear panel

🖼️ DIAGRAM, owner's manual page 25 at 900 dpi. Left to right **as seen from
behind**, so channel 1 is at the right hand end here and the left hand end from
the front:

- upper left: `USB` Type-C, with `DC IN 15V` and `SERIAL NO.` under it
- `STANDBY` switch, marked `ON`
- `MAIN OUTPUT` `R` and `L`, XLR
- `MUSIC/TALK`, a 4 pole mini jack with a phone glyph, marked `OUTPUT` and
  `INPUT`, feeding channel 9/10
- the input row, headed `MIC/LINE(BAL)/INST`: combo jacks labelled `9/10 L`,
  `7/8 L`, `6`, `5`, `4`, `3`, `2`, `1`
- under the two stereo combos, two TRS jacks each labelled `R`
- the lower row, left to right: `SUB OUTPUT R / L`, `AUX OUTPUT AUX 2 / AUX 1`,
  the two `R` jacks above, `CLICK`, `FOOTSWITCH`, `MIDI OUT`, `MIDI IN`, and
  two `INSERT` jacks for channels 1 and 2 only

📄 DOC, the ATTENTION already in `measured-devices-2026-09-20.md`: *"The unit
should be connected directly to the computer, not through a USB hub."*

## 1.8 What is NOT established about the Model 12

- 🔌 **Are the PAN knobs pushable?** MCU's V-Pot is normally a push encoder with
  its own note. Nothing in the drawing shows a push action and nothing in the
  prose mentions one. One press with `/dump/` listening settles it.
- 🔌 **Do the faders send MCU fader touch, notes 104 to 111?** They are not
  motorised (📄 DOC: pitch bend transmits and is not recognised) and nothing
  says they are touch sensing. Expected answer: nothing. Unmeasured.
- 🔌 **Does the MULTI JOG send CC 60?** 🌐 THIRD PARTY says the MCU jog wheel is
  relative CC 60. 📄 DOC says the dial *"can be used for locating"* in DAW
  control mode. Never measured on this unit, and `classifyEncoder` would answer
  in four seconds of turning it both ways.
- 🔌 **What lights the REC, MUTE and SOLO lamps?** MCU sends notes back to the
  surface to light them. 📄 DOC's implementation chart says note number is
  recognised, remarks *"MCU: Key, LED"*, so the lamps are drivable. Nothing has
  been sent to this unit yet.
- ⚖️ The MODE switch is drawn as a **three position** slide (`LIVE`, a centre,
  `MTR`) with `DIRECT PC` under it. 📄 DOC points at a separate page for what
  the positions mean rather than naming them at the callout, so the number of
  detents is read off the drawing and not confirmed in prose.

---

# 2. Novation Circuit, original, 2015

Source: User Guide v1.6, 72 pages, fetched today, 200:
<https://fael-downloads-prod.focusrite.com/customer/prod/s3fs-public/novation/downloads/15792/circuit-ug-en-03-v1-6.pdf>

⚠️ **NOVATION'S SUPPORT SITE REFUSES AUTOMATED FETCHES AND WAS NOT NEEDED.**
The brief records `support.novationmusic.com` answering 403 and the Zendesk
JSON route that gets past it. The panel drawing is in the User Guide PDF, which
fetches normally, so the Zendesk route was not used for this.

📄 DOC has **no dimensions anywhere**. 🖼️ Measured off the drawing, the panel is
about **1.23 wide for every 1 tall**, which is a proportion read off a
photograph rather than a specification.

## 2.1 The top panel, region by region

🖼️ DIAGRAM, User Guide page 12 at 250 dpi with five crops at 600 to 1600 dpi.
The guide's own callout numbers are in brackets.

**Top row, left to right:**

| control | kind | notes |
|---|---|---|
| `novation` logo | printed | top left corner |
| **Master Volume** (4) | pot with a printed white pointer and a dashed arc | far left, alone, below the logo |
| **Macro 1, 3, 5, 7** (3) | endless encoders, upper of two staggered rows | knurled caps, no pointer, a white arc ring and a coloured LED wedge under each |
| **Macro 2, 4, 6, 8** (3) | endless encoders, lower row, offset right | the number is printed under each knob |
| **Filter** (2) | pot, visibly larger diameter, printed pointer, RGB LED ring | far right of the macro area, under the `CIRCUIT` wordmark |
| `CIRCUIT` wordmark | printed | top right corner |

🔴 **THE MACROS ARE A ZIG ZAG, NOT A ROW.** Odd numbers on the upper row, even
numbers on the lower row and offset to the right, so the eight knobs interleave.
A layout drawing them as one straight row of eight, or as two aligned rows of
four, is drawing a different instrument. 🖼️ Confirmed from the rear photograph
too, where ten knob profiles stand above the panel edge: two with pointers
(Filter and Master Volume, at the two ends) and eight without.

**The button row, directly under the macros, left to right.** Eight rectangular
buttons, with grey secondary legends printed **above** the button they modify:

| button | legend above it |
|---|---|
| `Oct` down (13) | `Pattern Octave`, centred over the pair |
| `Oct` up (13) | (same pair) |
| `Tempo` (14) | `Tap` |
| `Swing` (15) | none |
| `Clear` (16) | none |
| `Duplicate` (17) | none |
| `Save` (18) | `Clear` |
| `Session` (18) | `Sessions` |
| `Shift` (19) | none, and it sits apart, to the right of the other seven, over the right hand button column |

⚠️ **THE LEGEND-ABOVE CONVENTION IS CONFIRMED TWICE FROM THE GUIDE'S OWN
GLOSSARY.** `Expand` is printed above `Note` and the glossary says *"Expanded
View: Shift + Note"*. `Fixed` is printed above `Velocity` and the glossary says
*"Fixed: Shift + Velocity"*. So a grey word above a button is what Shift plus
that button does.
⚠️ **AND THE LAST TWO DO NOT RESOLVE CLEANLY.** The button faces read `Save` and
`Session`; the legends above them read `Clear` and `Sessions`; the guide's
callout 18 calls the pair *"Save and Sessions"*. Read at 1600 dpi, `Clear` is
unambiguously over `Save` and `Sessions` unambiguously over `Session`. **What
Shift plus Save actually does is not stated anywhere in the User Guide**, and
this file does not guess at it.

**Left column, top to bottom:**

| control | kind | group legend |
|---|---|---|
| `Scale` (8) | rectangular button | none |
| `Note` (6) | round button | under `STEP` bracket, `Expand` above it |
| `Velocity` (6) | round button | `STEP`, `Fixed` above it |
| `Gate` (6) | round button | `STEP` |
| `Nudge` (7) | round button | under `PATTERN` bracket |
| `Length` (7) | round button | `PATTERN`, `Rate` above it |
| headphone socket (20) | jack with a headphone glyph | at the foot of the column, on the panel's front edge |

**Right column, top to bottom:**

| control | kind |
|---|---|
| `Shift` (19) | rectangular button, at the top, level with the button row |
| `Patterns` (9) | round button |
| `Mixer` (10) | round button |
| `FX` (11) | round button |
| **Record** (12) | large round button with a filled circle, `Step Record` printed above it |
| **Play** (12) | large round button with a triangle, `Save Session` printed above it |

**Between the button row and the grid:** a row of **eight rectangular track
buttons**, left to right `Synth 1`, `Sidechain`, `Synth 2`, `Sidechain`,
`Drum 1`, `Drum 2`, `Drum 3`, `Drum 4`, with three blue group brackets above
them reading `SYNTH 1` (over `Patch` and `Source`), `SYNTH 2` (over `Patch` and
`Source`) and `DRUMS` (over `Patch`). These are callout 5.

**The grid (1):** 32 rubber pads, **4 rows of 8**, RGB lit, filling the centre
and bottom of the panel between the two button columns.

**Not on the top surface:** the speaker (23) is in the base, the battery
compartment (21) is on the right hand side and the Kensington slot (22) at the
top right corner.

## 2.2 Where the measured MIDI lands on that panel

🔴 MEASURED, from `measured-devices-2026-09-20.md`, placed:

| panel control | position | message |
|---|---|---|
| Macros 1 to 8 | the staggered pair of rows, top centre | **CC 80 to 87, channel 1**, absolute 7 bit, all eight measured |
| Filter | the large knob at the top right of the macro area | **CC 74, channel 16** |
| grid pads, synth 2 in Note view | the 4 by 8 grid | note on and off, channel 2, velocity sensed |
| grid pads, drums in Note view | the 4 by 8 grid | notes 60, 62, 64, channel 10, velocity fixed at 96 |
| nothing on the panel | | `0xF8` clock at about 48.75 a second, unattended, which is 122 bpm |

🔴 **THE FILTER IS ON A DIFFERENT MIDI CHANNEL FROM EVERY OTHER KNOB ON THE
DEVICE, AND IT IS THE SECOND LARGEST KNOB ON THE PANEL.** A layout binding a
whole Circuit panel to one channel gets eight macros and silently loses the one
control the guide describes as *"always active"*.

⚠️ **THE MASTER VOLUME IS NOT IN THAT TABLE AND ITS ABSENCE IS NOT A
MEASUREMENT.** 📄 DOC calls it *"controls the overall level of Circuit's audio
outputs"*, and ⚖️ INFERRED from that it is an analogue output level control that
sends nothing. It was never turned during a capture. 🔌 Turn it with `/dump/`
listening; the expected result is silence, and a silence that has been looked
for is a different claim from one that has not.

## 2.3 Rear panel

🖼️ DIAGRAM, User Guide page 15. Left to right **as seen from behind**:

`POWER` (5, a soft button), DC input (4, `12V DC 1A`, centre positive),
USB Type B (3), the `novation` logo, `MIDI OUT` and `MIDI IN` (2) on
**3.5 mm TRS jacks** with breakout cables to 5 pin DIN, then `RIGHT` and
`L/MONO` (1) on quarter inch TS jacks.

📄 DOC: *"Circuit's USB port does not carry either DC power or audio."*

## 2.4 What is NOT established about the Circuit

- What Shift plus `Save` does, printed on the panel as `Clear`. Not in the User
  Guide. 🔌 One press answers it.
- Physical dimensions. Not printed in the User Guide at all. The 1.23 to 1
  proportion above is off a photograph.
- Whether the Master Volume transmits. See above.
- Which of the eight macro LEDs is lit in which view, and what their colours
  mean per view. The guide covers this in prose spread across every view
  chapter and it was not read for this file.

---

# 3. Evolution MK-425C

Sources, both fetched today and both 200:

- Getting Started Guide, 21 pages, with the `MK-425C Graphic Illustration`:
  <https://www.synthmanuals.com/manuals/m-audio/evolution_mk461c/quick_start_guide/evo_mk425-49-61c_gttgstartd.pdf>
- Advanced User Guide, 20 pages:
  <https://synthmanuals.com/manuals/m-audio/evolution_mk425/user_guide/060123_4series_ug_en01.pdf>

📄 DOC, printed beside the illustration: **480 x 210 x 100 mm**. So the panel is
about **2.3 wide for every 1 deep**, which is the opposite shape from the Model
12 and worth knowing before either is drawn beside the other.

🔴 **THE ILLUSTRATION IS PRINTED ON ITS SIDE AND HAD TO BE ROTATED TO READ.**
`pdftoppm` then `sips -r 90`. In the page as printed, the keyboard's left end is
at the bottom.

⚠️ **THE CALLOUT LIST COVERS THREE KEYBOARDS AT ONCE AND THE MK-425C IS THE
SMALL ONE.** Callout 6 says *"Eight function keys"*, callout 9 says *"Nine
40 mm faders"* and callout 10 says *"Twelve rotary controllers (eight on
MK-449C and MK-225C)"*. 🖼️ **On the MK-425C photograph there are SIX function
buttons, EIGHT knobs and NO faders at all.** The footnotes confirm the six:
*"single press functions: Global Channel, Control Assign, Program, Data LSB,
Data MSB, Recall"*. **Read the picture, not the shared list.**

## 3.1 The top panel, left to right

🖼️ DIAGRAM, Getting Started page 4, rotated and cropped at 1400 dpi.

**Left end, the control cluster, from the rear edge forward:**

| control | kind | notes |
|---|---|---|
| **LCD display** (5) | backlit rectangular LCD | rearmost, at the far left corner |
| **assignable buttons** (3, 4) | a **4 row by 3 column** matrix of 12 square buttons | in front of the LCD |
| **PITCH BEND** wheel (2) | wheel, left of the pair | frontmost, in line with the keys front to back |
| **MODULATION** wheel (2) | wheel, right of the pair | `MIN` printed below, `MAX` above |

🖼️ The keypad matrix, read at 1400 dpi:

```
   1    2    3
   4    5    6
   7    8    9
   -    0    +
```

with `SNAP SHOT` printed across the bottom row joining the `-` and `+` buttons,
and a black header strip under the whole block reading `ASSIGNABLE BUTTONS`.
📄 DOC, callout 4: *"+/- buttons. Dual press function sends out Snap Shot
command."* So the block is **10 assignable buttons plus a `-` and `+` pair**,
which is 12 buttons even though the guide calls it ten.

**Along the rear edge, left to right after the LCD:**

| control | kind | legends |
|---|---|---|
| six **function buttons** (6, 7) | square buttons in a row under a black `FUNCTION BUTTONS` header | above each: `GLOBAL CHANNEL`, `CONTROL ASSIGN`, `PROGRAM`, `DATA LSB`, `DATA MSB`, `RECALL` |
| | | below, printed **between** adjacent pairs with tie marks: `CONTROL MUTE`, `CHANNEL ASSIGN`, `CONTROL SELECT`, `MIDI OUT FROM USB`, `STORE` |
| **OCTAVE** pair (8) | two **round** buttons | `OCTAVE` above, `-` and `+` over each, `TRANSPOSE` below spanning both |
| branding | printed | the Evolution `e` mark, `USB`, `MK-425C` |
| **eight knobs** (10) | pots with pointers and printed tick arcs, in one bordered row | labelled `C1` to `C8`, with a **vertical divider between C4 and C5** |

🔴 **THE DUAL PRESS FUNCTIONS ARE PRINTED BETWEEN TWO BUTTONS, NOT UNDER ONE.**
🖼️ Each lower legend sits in the gap between a pair with a small tie mark to
each, so `CONTROL MUTE` is `GLOBAL CHANNEL` plus `CONTROL ASSIGN` pressed
together, and so on down the row. 📄 DOC corroborates the shape at least once:
*"Press DATA LSB and RECALL simultaneously to send out memory dump"*.
⚠️ Which combination gives which function is 🖼️ read off a low resolution
photograph. The legends are legible; the exact pairing of the two rightmost is
the weakest reading in this file.

**The keys:** 25, velocity sensitive, starting immediately to the right of the
wheels and running to the right hand end under the knob row.

## 3.2 Where the measured MIDI lands on that panel

🔴 MEASURED:

| panel control | message | channel |
|---|---|---|
| knobs (six of the eight turned) | **CC 84, 72, 74, 71, 93 and CC 5** | 2 |
| MODULATION wheel | **CC 1**, values 57 to 127 seen | 2 |
| PITCH BEND wheel | `0xE0`, **7 bit inside a 14 bit message**, raw range 0 to 13952 | 2 |
| the assignable buttons, nine of them | bank select LSB, bank select MSB, then program change 1 to 9 | 2 |
| one assignable button | the same three messages on channel **1**, program 0 | 1 |
| keys | notes 48 to 72 after the transpose fix, velocity 45 to 117, release is always a note on at velocity 0 | 2 |

⚠️ **THE PANEL NUMBERS THE CONTROLS AND THE MEASUREMENT DOES NOT.** 🖼️ The knobs
are printed `C1` to `C8`. 🖼️ The wheels carry small legends under them that read
as `C9` and `C10` at 1400 dpi. 📄 DOC, Advanced Guide: *"We have given the
buttons 0 to 9 the following numbers for the selection process: MK-425C =
11-20"*. **Eight knobs plus two wheels is ten, and the buttons start at
eleven**, so the `C9` and `C10` reading is corroborated by an independent source
and the panel's own numbering is `C1` to `C8` for the knobs, `C9` and `C10` for
the wheels, 11 to 20 for the buttons.
🔴 **NOTHING SAYS WHICH KNOB SENT WHICH CC.** The six measured CC numbers were
recorded as a set, not as a per knob mapping, so `C1` to `C8` cannot yet be
labelled. 🔌 Turn them one at a time in order.
⚠️ **AND THE NUMBERS ARE NOT FACTORY DEFAULTS.** 📄 DOC: every assignment is
stored in non volatile memory and can be edited from the panel, so these are
what this unit is set to today, which is a different claim from what an
MK-425C sends.

## 3.3 Rear panel

🖼️ DIAGRAM, Getting Started page 7. Left to right **as seen from behind**:

`USB` Type B (11), `MIDI OUT` 5 pin DIN (12), `SUSTAIN` quarter inch jack (13),
`POWER` slide switch marked `ON` and `OFF` (14), and the DC input printed
`DC 9-12V` (15).

⚠️ Two small disagreements between the callout list and the panel print, both
worth carrying: callout 13 calls it a *"Footswitch socket"* and the panel says
`SUSTAIN`; callout 15 says *"9v DC power supply"* and the panel says `DC 9-12V`.
🔴 **AND THERE IS NO MIDI IN SOCKET.** Only MIDI OUT. That matches the measured
USB descriptors, where this device carries MIDIStreaming and no AudioStreaming.

## 3.4 What is NOT established about the MK-425C

- Which knob is which CC. See above. One knob at a time settles it.
- Whether the panel legends under the wheels really read `C9` and `C10`. The
  photograph is a low resolution JPEG and this is the limit of what it gives.
  🔌 The unit prints the controller number on its own LCD when a control is
  moved, so one wheel movement settles it with no manual at all.
- Which pair of function buttons produces which dual press function. Legible but
  soft at the right hand end of the row.
- Whether this unit has factory assignments or somebody's edits in memory.
  📄 DOC gives ten factory presets recalled with `Recall`, so the question is
  answerable from the panel.
- Why one assignable button sends on channel 1 while the other nine send on
  channel 2. 🔴 Measured and unresolved. 📄 DOC says each controller carries its
  own channel and that channel 00 means use the global one, so ⚖️ INFERRED that
  this button has an explicit channel and the rest inherit.

---

# 4. M-Audio Fast Track Pro

Source: user guide, 17 pages, fetched today, 200:
<https://www.lclark.edu/live/files/14551-m-audio-fast-track-pro-manual>

🔴 **IT HAS NOTHING TO MIRROR, AND THAT IS THE ANSWER RATHER THAN A GAP.**
🔴 MEASURED: *"maudio does nada. its midi in out only it seems"*, and the
capture agrees. Every control on it is an analogue signal path control or a
socket. Nothing on this device transmits MIDI of its own; its CoreMIDI source
carries only what arrives at the 5 pin DIN input.

⚠️ **THE EXISTING PLAN SAYS TWENTY SIX ITEMS AND THERE ARE TWENTY EIGHT.**
📁 REPO, `plans/plan-fasttrack-mk425c.md` §2.6: *"the user guide's numbered panel
list, all twenty six items"*. 📄 DOC has **28**: the list omits **27, Balanced
Outputs 1 and 2 on quarter inch TRS**, and **28, Inserts 1 and 2**. The
conclusion that plan draws is unaffected and slightly strengthened, because both
missing items are sockets.

📄 DOC has no dimensions.

## 4.1 Front panel, left to right, in two tiers

🖼️ DIAGRAM, page 2 of the guide at 900 dpi.

| tier | left to right |
|---|---|
| **channel 1** | `Clip` LED (2) above `Signal` LED (1), `GAIN` knob (3) below; `Inst/Line` button (4) above `Pad` button (5); `Mic/Inst` Neutrik combo jack (6) |
| **branding** | `M-AUDIO` and a printed `1`, then `FAST TRACK PRO` and a printed `2` |
| **channel 2** | the same group mirrored: `Mic/Inst` combo (6), `Inst/Line` (4) above `Pad` (5), `Clip` (2) above `Signal` (1), `GAIN` (3) |
| **divider rule** | |
| **monitoring** | `Stereo/Mono` button (7) upper, `MIDI In` and `MIDI Out` LEDs (8) stacked lower |
| | `Mix` knob (9), upper, larger, `IN` at one end and `PB` at the other |
| | `Output` bracket holding the `Level` knob (10), lower |
| | `A/B` button (11) upper, `Power` LED (13) and `48V` LED (12) lower |
| | headphone `Level` knob (14) upper right, quarter inch headphone jack (15) lower right under a headphone glyph |

## 4.2 Rear panel, left to right

🖼️ DIAGRAM, page 4 of the guide at 700 dpi. As seen from behind:

`Power` button (16), Kensington slot (17) below it, `9V DC 500 mA` jack (18),
`USB` Type B (19), `MIDI Out` DIN (20), `MIDI In` DIN (21), `48V PH Power`
slide switch marked `On` and `Off` (22), `S/PDIF Out` and `S/PDIF In` RCA (23,
24), the `Output` RCA block with `2` and `1` on the upper row (25) and `4` and
`3` on the lower (26), and the `TRS Output` pair `2` and `1` on quarter inch
jacks (27). The two `Insert` jacks (28) are on the panel with them.

## 4.3 What is NOT established about the Fast Track Pro

- Physical dimensions. Not in the guide.
- Nothing else, because there is nothing else to ask. This device has no control
  a page could mirror, no lamp a page could light and no encoder a page could
  read. 🔴 **The two MIDI activity LEDs on its front panel are the only feedback
  this project will ever get from it**, and they report traffic rather than
  content.

---

# 5. Everything this file could not settle, in one list

**Model 12**

1. 🔌 Whether the PAN knobs push, and what a push sends.
2. 🔌 Whether the faders send MCU fader touch on notes 104 to 111.
3. 🔌 Whether the MULTI JOG sends relative CC 60.
4. 🔌 Whether notes sent TO the unit light the REC, MUTE and SOLO lamps, which
   the implementation chart says should work and nobody has tried.
5. ⚖️ How many detents the MODE switch has. Read off a drawing, not from prose.

**Circuit**

6. 🔌 What Shift plus `Save` does. The panel prints `Clear` above it and the
   User Guide never says.
7. 🔌 Whether the Master Volume transmits anything. Expected silence, never
   looked for.
8. 📄 Physical dimensions. Absent from the User Guide.

**MK-425C**

9. 🔌 Which of `C1` to `C8` sends which of CC 84, 72, 74, 71, 93 and 5, and what
   the two unturned knobs send.
10. 🖼️ Whether the wheel legends read `C9` and `C10`. Corroborated by the
    Advanced Guide's controller numbering, still soft on the photograph.
11. 🖼️ The exact pairing of function buttons to dual press functions at the right
    hand end of the row.
12. 🔌 Why one assignable button sends on channel 1 and the other nine on
    channel 2.
13. 🔌 Whether this unit holds factory assignments or somebody's edits.

**Fast Track Pro**

14. 📄 Physical dimensions. Absent from the guide.

**All four**

15. 🔴 **Nothing here was measured with a ruler.** Every proportion in this file
    is either a figure out of a manufacturer's specification table (Model 12 and
    MK-425C, which have one) or a ratio read off a drawing (Circuit, which does
    not). Control sizes, spacings and gaps are all 🖼️ relative readings off
    renderings. That is enough to draw a strip that looks like the object and
    not enough to build a faceplate.

---

# 6. Sources, all fetched 2026-09-20, all 200

| device | document | URL |
|---|---|---|
| Model 12 | Owner's Manual, 228 pp | `https://cf.tascam.com/wp-content/uploads/downloads/products/tascam/model_12/model-12_om_efs_vh4.pdf` |
| Model 12 | DAW Control Mode Manual, 23 pp | `https://cf.tascam.com/wp-content/uploads/downloads/products/tascam/model_12/e_model-12_daw_control_om_vc.pdf` |
| Circuit | User Guide v1.6, 72 pp | `https://fael-downloads-prod.focusrite.com/customer/prod/s3fs-public/novation/downloads/15792/circuit-ug-en-03-v1-6.pdf` |
| MK-425C | Getting Started Guide, 21 pp | `https://www.synthmanuals.com/manuals/m-audio/evolution_mk461c/quick_start_guide/evo_mk425-49-61c_gttgstartd.pdf` |
| MK-425C | Advanced User Guide, 20 pp | `https://synthmanuals.com/manuals/m-audio/evolution_mk425/user_guide/060123_4series_ug_en01.pdf` |
| Fast Track Pro | User Guide, 17 pp | `https://www.lclark.edu/live/files/14551-m-audio-fast-track-pro-manual` |

Three of these are already cited in `plans/plan-circuit-model12.md` and
`plans/plan-fasttrack-mk425c.md`. What is new here is that the **pictures in
them have been rendered and looked at**, rather than the text extracted, which
is the only way any of the geometry above could be read.
