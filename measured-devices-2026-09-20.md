# What is actually plugged into the M2 Mac, MEASURED 2026-09-20

🔴 **EVERY LINE HERE IS MEASURED ON THIS MACHINE, NOT READ FROM A MANUAL.**
`plan-circuit-model12.md`, `plan-device-layouts.md` and `plan-fasttrack-mk425c.md`
are written almost entirely from documentation and mark their claims as read.
Where this file disagrees with one of them, this file wins.

Machine: `Mac14,10`, MacBook Pro 14-inch M2 Pro, macOS 26.6.2.

## The instrument lied first, and that is the lesson

🔴 **`system_profiler SPUSBDataType` RETURNS NOTHING ON THIS MACHINE AND EXITS
0.** Not an error, not a permission message. Empty. The same binary answers
`SPHardwareDataType` and `SPAudioDataType` perfectly, so the tool works and that
one category is restricted.
⚠️ **IT WAS BELIEVED ONCE AND REPORTED AS "NOTHING IS ATTACHED".** Four devices
were attached at the time. This is CLAUDE.md's check-the-instrument rule in a
new costume, and the second opinion that worked is **`ioreg`**:

```sh
ioreg -p IOUSB -w0 -l | grep -iE '"USB Product Name"|"USB Vendor Name"|\+-o '
```

## The four devices

| device | idVendor | idProduct | bcdDevice | USB speed | serial string |
|---|---|---|---|---|---|
| FastTrack Pro | `0x0763` M-Audio | `0x2012` | `0x0102` | full, 12 Mbit/s | none |
| Circuit | `0x1235` Focusrite A.E | `0x0079` | `0x0200` | full, 12 Mbit/s | `V1.00` |
| MK-425C USB MIDI Keyboard | `0x0A4D` Evolution Electronics Ltd. | `0x0067` | `0x0125` | full, 12 Mbit/s | none |
| Model 12 | `0x0644` TEAC | `0x805F` | `0x0100` | **high, 480 Mbit/s** | `no serial number` |

⚠️ **`bcdDevice` IS NOT FIRMWARE.** It is a USB device release number the vendor
chooses, and nothing says it tracks the firmware a unit is running. The Model 12
reads `0x0100` and the only trustworthy answer is the unit's own
`MENU` `SYSTEM` `INFORMATION` `FIRMWARE` screen.
⚠️ **THE CIRCUIT PUTS `V1.00` IN ITS USB SERIAL NUMBER FIELD**, which is a
version-shaped string in a field meant for a unique id. It is almost certainly
not the firmware version either. Read the Circuit's own version with `Shift` and
`Record`.

## Every one of them is class compliant, and no vendor driver is installed

🔴 **ALL FOUR BIND `com.apple.driver.AppleUSBAudio`**, Apple's own USB audio and
MIDI class driver, through `AppleUSBAudioControlNub`. **Nothing from M-Audio,
Novation, Focusrite or TASCAM is installed on this machine.** The only
third-party audio plug-ins present are `MSTeamsAudioDevice`,
`ReincubateCamoAudio`, `ParrotAudioPlugin` and `XDJ-XZ USBAudio`, none of which
is any of these devices.

Interface subclasses, from the descriptors:

| device | 1 AudioControl | 2 AudioStreaming | 3 MIDIStreaming |
|---|---|---|---|
| FastTrack Pro | yes | **yes** | yes |
| Circuit | yes | no | yes |
| MK-425C | yes | no | yes |
| Model 12 | yes | **yes** | yes |

So the Circuit and the MK-425C are **MIDI only over USB**, which is expected and
now measured. The other two carry audio as well.

## 🔴 THE FAST TRACK PRO WORKS, AND THAT WAS THE BIGGEST OPEN QUESTION

The whole premise of researching it was that M-Audio's driver died years ago and
the device might be useless on Apple Silicon. **It is not.** CoreAudio exposes
it right now with no driver installed:

- **FastTrack Pro (output): 4 channels at 44100 Hz**
- **FastTrack Pro (input): 2 channels at 48000 Hz**

⚠️ **IT IS TWO COREAUDIO DEVICES, NOT ONE DUPLEX DEVICE**, and they are **at
different sample rates right now**. Anything wanting to play and record at once
needs an Aggregate Device, and a 44100 against 48000 split is either a resample
or a drift depending on who is asked. **This is the real cost of the device, and
it is a different problem from the one everybody expected.**

The Model 12 is the opposite and is one device: **12 in, 10 out, 48000 Hz**,
matching what TASCAM documents.

## The Model 12 is direct. The other three are two hubs deep

**RE-READ after the Model 12 was moved, and the tree really did change between
the two readings.** It was one hub deep at `02130000` and is now on a host
controller of its own:

```
AppleT8112USBXHCI@00000000
 +- Model 12                      <- direct, nothing between it and the Mac
AppleT8112USBXHCI@02000000
 +- USB3.1 Hub (GenesysLogic)
 +- USB2.1 Hub (GenesysLogic)
     +- USB 2.0 Hub [MTT]
         +- USB 2.0 Hub
             +- FastTrack Pro
             +- Circuit
             +- MK-425C
AppleT8112USBXHCI@01000000
 +- iPhone
```

✅ **SO THE MODEL 12 FIRMWARE UPDATE IS POSSIBLE AS CABLED.** TASCAM's update
document carries an ATTENTION box requiring a direct connection and no hub, and
that condition is now met. The procedure is: copy the firmware into `UTILITY` on
the SD card over USB storage mode, unmount, power off, then **power on holding
`8` and the stop button** until the update screen appears.
⚠️ **A MAC LEAVES A SHADOW FILE.** Copying from macOS writes a second file
beginning `._` beside the firmware. **Select the one WITHOUT `._`.**

⚠️ **THE OTHER THREE SHARE ONE FULL SPEED HUB CHAIN.** The Fast Track Pro is a
**full speed** device, 12 Mbit/s, carrying 4 out and 2 in through two nested
hubs alongside two other devices. That is enough bandwidth on paper. It is worth
knowing before blaming the device for a dropout, and it is the first thing to
change if one appears.

## Chrome already has one of them open

`AppleUSBHostDeviceUserClient` handles owned by **Google Chrome** are attached to
the MK-425C, nine of them. A browser on this machine is already talking to that
device, so the Web MIDI path is live rather than theoretical.

## What is still NOT measured

- **CoreMIDI port names.** USB enumeration is not the same thing as a MIDI port,
  and nothing above proves a port exists or what it is called. `/dump/` answers
  this.
- **What any of them actually SENDS.** Every note number, every CC number, every
  NRPN convention in all three plans is still read rather than measured. That is
  the entire reason `/dump/` is being built.
- **`bMaxPower`** was not in the descriptors read back, so the power question is
  still open on every device.

## Reading a firmware version

**Model 12**, from TASCAM's own update document, verbatim in order:
`MENU` then SYSTEM then `INFORMATION`, then turn the `MULTI JOG` dial to reach
the `FIRMWARE` screen, and read `VERSION`.

**Circuit**: Novation Components in Chrome reads it over Web MIDI. ⚠️ **The
`V1.00` in the Circuit's USB serial number field is almost certainly NOT the
firmware version.** It is a version-shaped string in a field meant to hold a
unique id, and treating it as firmware is exactly the kind of confident wrong
sentence this project keeps paying for.

🔴 **AND THERE IS ONE QUESTION THAT ASKS ALL FOUR AT ONCE: MIDI DEVICE
INQUIRY.** `F0 7E 7F 06 01 F7` is universal SysEx, not a vendor extension, and a
device that answers replies with `F0 7E <ch> 06 02 <manufacturer> <family>
<member> <software revision, 4 bytes> F7`. Those four revision bytes are the
firmware version, from the device itself, with no menu and no web app.
⚠️ **IT IS A REQUEST, SO IT NEEDS THE SYSEX PERMISSION**, which Web MIDI gates
separately from ordinary MIDI. `/dump/` should offer it as a press.
⚠️ **AND NOT EVERY DEVICE ANSWERS.** A silence means the device ignores the
inquiry, which is permitted, and it must never be reported as the device being
absent or asleep. **A row saying no reply is a real result and has to be shown
as one.**

# What they actually SEND, MEASURED 2026-09-20 through `/dump/`

🔴 **EVERY NUMBER BELOW CAME OFF THE WIRE IN A BROWSER, NOT OUT OF A MANUAL.**
Three plan documents in this repo describe these devices from documentation and
say so. Where this section disagrees with one of them, this section wins.
⚠️ **TWO INDEPENDENT ROUTES AGREE**: the readings were taken through Web MIDI in
Chrome, and the device list matches CoreMIDI's own enumeration read separately.

## Novation Circuit

| control | channel | sends | kind |
|---|---|---|---|
| macro knobs 1 to 6 | **1** | **CC 80, 81, 82, 83, 84, 85** | absolute 7 bit |
| master filter | **16** | **CC 74** | absolute 7 bit |
| synth 2 keys | 2 | note on and note off | velocity |
| drum pads | **10** | notes 60, 62, 64 | velocity 96, fixed |
| clock | none | `0xF8` continuously | 24 per quarter note |

🔴 **THE MACROS ARE PLAIN CC AND NOT NRPN, AND THAT QUESTION WAS OPEN.**
`plan-circuit-model12.md` could not settle whether the Circuit rides the usual
CC 99 / 98 / 6 convention because Novation never wrote it down. **Zero NRPN
sequences completed across every capture**, while 140 ordinary control changes
did. The macros are 7 bit absolute and nothing more.
⚠️ **MACROS 7 AND 8 WERE NOT TURNED**, so CC 86 and 87 are inferred from the run
of six rather than measured. Turn them to close it.
🔴 **THE MASTER FILTER IS ON CHANNEL 16, NOT CHANNEL 1**, which is the one thing
here nobody would have guessed. A layout binding every Circuit control to one
channel gets five knobs and loses the filter.
🔴 **AND IT TRANSMITS CLOCK UNATTENDED, WITH NOBODY TOUCHING IT.** MEASURED
across several windows: 227 in 4 s, 585 in 12 s, 821 and 3083 cumulative.
**48.75 per second at 24 per quarter note is 122 bpm.** Anything joining this
rig inherits a tempo whether it asked for one or not, and `/dump/` counts these
rather than listing them for exactly this reason: at 48 a second they bury
every other message within four seconds.

## Evolution MK-425C

**The global channel is 2, not 1.** Measured on every stream but a stray pair on
channel 1.

| control | sends | kind |
|---|---|---|
| knobs | **CC 84, 72, 74, 71, 93, and CC 5** | absolute 7 bit |
| mod wheel | **CC 1** | absolute, 57 to 127 seen |
| pitch bend wheel | `0xE0` | see below |
| program buttons | program change 1 to 9, with bank select MSB and LSB | |

🔴 **THE PITCH BEND WHEEL IS SEVEN BIT IN A FOURTEEN BIT MESSAGE.** 106 bend
messages, **every one with an LSB of 0**, and 63 distinct MSB values. So 128 of
the 16384 positions exist and the other 16256 are unreachable.
`plan-fasttrack-mk425c.md` lists *"144 Pitch Bend (14-bit)"* from the manual and
calls this the rig's only 14 bit gesture. **It is not.** The assignment type is
14 bit; the wheel behind it is not.
⚠️ **Raw range 0 to 13952**, so it does not reach either end of the nominal
range, and only 6 messages read exactly 8192. **A layout must not assume a
centred wheel reports centre.**
⚠️ **THE KNOB DEFAULTS WERE THE LARGEST HOLE IN THAT PLAN**, which reports that
neither manual prints the default CC number of any knob. They are above.
⚠️ **CC 5 IS `portamento time` AND CC 74 IS `cutoff` BY CONVENTION**, and that
says nothing about what either knob does. This is the Yoshimi lesson: the
standard meaning of a controller number is a convention, never a fact about a
device.

## M-Audio Fast Track Pro

✅ **IT SENDS NOTHING OF ITS OWN, AND THAT IS CORRECT RATHER THAN BROKEN.**
Reported from the desk as *"maudio does nada. its midi in out only it seems"*,
and the measurement agrees. It has no knob, no key and no transport. Its
CoreMIDI source carries **only what arrives at the 5 pin DIN socket**, so with
nothing patched in, silence is the only honest reading.

## TASCAM Model 12, firmware 1.11

🔴 **THE PAN KNOBS SEND RELATIVE CLICKS, NOT POSITIONS. MEASURED, AND THIS WAS
THE BIGGEST OPEN QUESTION IN `plan-circuit-model12.md`**, which says in so many
words that **TASCAM publishes no note numbers and no CC numbers, anywhere, at
any firmware revision**. 525 messages on `Model 12 DAW Control IN`, **CC 16,
channel 1**, in DAW control mode on firmware **1.11**:

| value | count | reading |
|---|---|---|
| `0x04` | 172 | clockwise, 4 |
| `0x44` | **189** | counter clockwise, 4 |
| `0x3F` | **48** | clockwise, 63 |
| `0x7F` | **48** | counter clockwise, 63 |
| `0x02` | 35 | clockwise, 2 |
| `0x42` | 33 | counter clockwise, 2 |

**Three step sizes, each mirrored across bit 6, and the two fast steps landing
on the same count to the message.** That is signed bit relative, which is what
Mackie Control specifies, now measured on this unit rather than read off a
reverse engineering document.
⚠️ **CC 16 IS V-POT 1 IN THE PUBLISHED MCU MAP**, so this is almost certainly
the channel 1 PAN knob. **Not yet confirmed**: turning channel 2's PAN should
give CC 17, and that one press would validate the whole third party map at
once.
⚠️ **NOTHING ELSE CAME OUT OF IT**, no notes and no pitch bend, because only one
control was moved. The faders are pitch bend per channel and the buttons are
notes, both still unmeasured.
🔴 **AND `Model 12 MIDI IN` STAYED SILENT THROUGHOUT**, which is correct: that
port is the DIN socket bridged to USB, and nothing was patched into it.

🔴 **THIS MEASUREMENT KILLED A BUG IN OUR OWN INSTRUMENT, WHICH IS THE POINT OF
HAVING ONE.** `classifyEncoder` called that histogram **`unknown`**. It had been
written to look for values clustered near 1 and near 65, a window that was
GUESSED, and a real MCU encoder uses the whole of `0x01..0x3F` and
`0x41..0x7F`, so a fast turn sending 63 fell straight outside it. A textbook
relative encoder read as no answer at all.
✅ **IT ASKS THE SIGN BIT NOW.** Bit 6 is the direction and the low six bits are
the step, so what makes a stream relative is a small set of step sizes MIRRORED
across bit 6, never where the values sit. The measured histogram is a
regression test in `midi-decode-test.mjs`, alongside a swept knob, a measured
Circuit macro, one direction only, and a stream of zero magnitudes, all of
which must NOT read as relative.

## TASCAM Model 12, the two ports

🔴 **IT PRESENTS TWO PORT PAIRS AND ONLY ONE OF THEM IS THE MIXER.**

```
Model 12 MIDI IN  / MIDI OUT           the DIN sockets, bridged to USB
Model 12 DAW Control IN / OUT          Mackie Control
```

Reported as *"nothing from tascam"*, and `MIDI IN` will stay silent forever
unless something is plugged into its DIN socket. **The faders, knobs and
transport come out of `DAW Control`, which transmits only in DAW control mode.**
⚠️ **SO THE BIGGEST OPEN QUESTION IN `plan-circuit-model12.md` IS STILL OPEN**,
and it is now one menu setting away: whether those pan knobs send absolute
positions or MCU relative clicks. `classifyEncoder` answers it in about four
seconds of turning one, and refuses to answer until the knob has been turned
BOTH ways, because one direction cannot tell the two apart.

## Model 12 in DAW control mode: the map, MEASURED

🔴 **`plan-circuit-model12.md` SAYS THE NOTE NUMBERS AND CC NUMBERS BELOW HAD
NEVER BEEN CHECKED AGAINST A MODEL 12 AND THAT EVERY ONE OF THEM NEEDED THE
HARDWARE.** They have been checked now, on firmware **1.11**, through `/dump/`.

| control | message | measured |
|---|---|---|
| REC, channel 1 | note **0** | `90 00 7F` |
| SOLO, channel 1 | note **8** | `90 08 7F` then `90 08 00` |
| MUTE, channel 1 | note **16** | `90 10 7F` then `90 10 00` |
| PAN, channel 1 | **CC 16** | relative, signed bit |
| fader, channel 1 | pitch bend | `E0 57 57`, 7 bit |

✅ **THAT IS THE PUBLISHED MACKIE MAP, CONFIRMED**: REC is notes 0 to 7, SOLO is
8 to 15, MUTE is 16 to 23 across the eight channels, so channel 1 lands on 0, 8
and 16 exactly as the reverse engineering document says. **One press each made a
third party document trustworthy.**
⚠️ **A BUTTON IS A NOTE ON AT 127 AND A NOTE ON AT 0**, which is the note off
disguise `midi-decode.mjs` warns about, arriving on a mixer rather than a
keyboard.
⚠️ **REC SENT `7F` TWICE WITH NO RELEASE BETWEEN**, while SOLO and MUTE both sent
clean pairs. Either REC latches and reports only presses, or its releases landed
after the file was read. **Unresolved**, and one slow press settles it.

🔴 **SUB AND MAIN SEND NOTHING, AND THAT IS CORRECT RATHER THAN BROKEN.** They
are analogue routing switches on the mixer, and TASCAM's list of what is live in
DAW control mode is PAN knobs, REC, MUTE, SOLO, the channel faders and the FX
fader as master. Neither is on it.

🔴 **THE FADER IS SEVEN BIT AND HIDES IT BY DUPLICATING A BYTE.** `E0 57 57`,
`E0 58 58`, `E0 59 59`: the low byte is a COPY of the high byte, so it changes on
every message and carries nothing. **128 positions, not 16384.**
⚠️ **THE OBVIOUS TEST IS FOOLED BY THIS AND THE MK-425C FOOLS IT THE OPPOSITE
WAY.** That wheel sends `E0 00 <msb>` and a "does the low byte move" test catches
it; this fader moves its low byte perfectly. **The question is whether the low
byte is INDEPENDENT of the high one**, never whether it moves. `classifyBend()`
asks that, and both measured disguises are regression tests beside a genuinely
independent pair that must still read 14 bit.

### The eight channel map is confirmed, and REC is not like the others

✅ **SOLO ON CHANNEL 2 IS NOTE 9**, `90 09 7F` then `90 09 00`. SOLO runs 8 to
15 across the eight channels, so channel 1 at note 8 and channel 2 at note 9 is
the published map with its stride measured rather than assumed. **Two presses
made the whole layout trustworthy**, which is what a second data point is for:
one note number is a coincidence and two are a stride.

🔴 **REC SENDS NO RELEASE, MEASURED OVER THREE PRESSES.** `90 00 7F` three
times, and **not one `90 00 00`**. SOLO and MUTE each sent a clean pair in the
same capture, so this is the button and not the capture.
⚠️ **IT HAS A CONSEQUENCE FOR ANY LAYOUT BUILT ON THIS.** A REC bound as a
momentary control latches on and never turns off, because the event that would
turn it off never arrives. `plan-device-layouts.md` separates momentary from
latching as T7 against T12, and this is a case where **the DEVICE decides which
one it is** and the two buttons beside it decided differently.
⚠️ **AND IT IS NOT WHAT MACKIE CONTROL SPECIFIES**, where a surface sends 127 on
press and 0 on release for every button and the host sends a note back to light
the lamp. Whatever this is, it is TASCAM's reading of the protocol on firmware
1.11, and it is measured.

### Transport, the master fader, and a contradiction inside one mixer

| control | message | measured |
|---|---|---|
| STOP | note **93** `0x5D` | `90 5D 7F` then `90 5D 00` |
| PLAY | note **94** `0x5E` | `90 5E 7F` then `90 5E 00` |
| RECORD | note **95** `0x5F` | `90 5F 7F` then `90 5F 00` |
| FX fader | **pitch bend, channel 9** | `E8 03 03` up to `E8 7F 7F` and back to `E8 00 00` |

✅ **THAT IS THE MACKIE TRANSPORT BLOCK EXACTLY**: rewind 91, fast forward 92,
stop 93, play 94, record 95. Three presses confirmed three of the five and the
stride does the rest.
✅ **AND THE FX FADER IS THE MCU MASTER, ON CHANNEL 9**, which is what the
protocol says and what TASCAM's own documentation claims. `E8` is pitch bend on
channel index 8. A full sweep was captured, `0x00` to `0x7F` and back.

🔴 **THE TRANSPORT RECORD BUTTON SENDS A RELEASE AND THE CHANNEL REC BUTTON DOES
NOT.** Note 95 sent `7F` then `00`, cleanly, three transport buttons in a row.
Note 0 sent `7F` three times and never once `00`. **Two buttons on one mixer,
both called record, behaving differently on the wire.** Neither is a capture
artefact: both were measured across several presses in separate captures.
⚠️ **SO A LAYOUT CANNOT DECIDE MOMENTARY AGAINST LATCHING PER DEVICE**, which is
what `plan-device-layouts.md` assumes when it separates T7 from T12. It is per
CONTROL, and the same machine disagrees with itself.

🔴 **AND THE FX FADER IS SEVEN BIT TOO**, `E8 03 03`, `E8 7F 7F`: the low byte
copies the high byte exactly as the channel faders do. **Every fader on this
mixer has 128 positions.** 31 distinct positions were seen across one full
sweep, which is a person's hand rather than the hardware's limit.

### Evolution MK-425C: the program buttons send three messages, not one

Each press sends a **bank select pair and then a program change**:

```
B1 20 00     CC 32, bank select LSB = 0
B1 00 00     CC 0,  bank select MSB = 0
C1 01        program change 1
```

Nine buttons gave programs **1 to 9** on channel 2, which is the documented
`145 Program/Bank preset` assignment behaving as written.
🔴 **ONE BUTTON SENT ON CHANNEL 1 AND THE OTHER NINE SENT ON CHANNEL 2.**
`B0 20 00`, `B0 00 00`, `C0 00`: program **0**, channel **1**. The manual says
every controller carries its own channel and that channel 00 means use the
global one, so this button most likely has an explicit channel while the rest
inherit. **Unresolved**, and it matters, because a layout reading the global
channel would send that one button's traffic to the wrong place.

### Novation Circuit: macro 8 confirmed, macro 7 still unseen

CC **80, 81, 82, 83, 84, 85 and 87** have all now been measured on channel 1.
**CC 86 has never appeared.** The run is almost certainly 80 to 87 for the eight
macros, and 86 is inferred rather than measured, which is a different thing and
is written down as such.

### Circuit macro 7 is CC 86, so the run is complete and measured

**583 messages, 128 distinct values, 0 to 127**, a full sweep. Every one of the
eight macros is now measured rather than inferred:

| macro | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| **CC** | 80 | 81 | 82 | 83 | 84 | 85 | **86** | 87 |

All absolute 7 bit on **channel 1**, with the master filter alone on **channel
16** as CC 74.

### The MK-425C keys, and a transpose nobody asked for

- **Channel 2**, the same global channel as its knobs.
- **25 keys, notes 47 to 71**, contiguous, which is the whole keyboard.
- **Velocity really is sensed**: 45 to 117 across one ordinary bit of playing,
  not a fixed value.
- 🔴 **EVERY MESSAGE IS `0x91`. THERE IS NO `0x81` AT ALL.** A release is a note
  on at velocity 0, measured **25 times**, never once a real note off. This is
  the trap `midi-decode.mjs` was written around, and this keyboard is a live
  example of it: anything treating `0x90` as "on" leaves all 25 notes hanging.

🔴 **AND THE RANGE IS B2 TO B4, WHICH IS A SEMITONE BELOW WHERE IT SHOULD BE.**
A 25 key controller spans C to C, so the expected run is **48 to 72**. This one
sent **47 to 71**. That is a transpose of **-1**, and it is the kind of fault
that never announces itself: the keyboard plays perfectly, in tune with itself,
and a semitone flat against every other instrument in the rig.
⚠️ **CHECK THE TRANSPOSE SETTING BEFORE BUILDING ANYTHING ON THIS.** A layout
calibrated against these numbers would bake the error in.
⚠️ **NO OCTAVE SHIFT IS VISIBLE IN THE DATA.** The 25 notes are one contiguous
run, so whatever was pressed on the octave buttons either did not take or was
undone before playing. The octave step is still unmeasured.

### The transpose is fixed, and the earlier range above is no longer true

✅ **MEASURED AFTER THE FIX**: 48, 50, 52, 53, 55, 57, 59, 60. A C major scale
from **C3 to C4**, so the lowest key is note **48** and the keyboard sits where
a 25 key controller belongs.
⚠️ **THE RANGE WRITTEN ABOVE, 47 TO 71, WAS TRUE WHEN IT WAS MEASURED AND IS NOT
TRUE NOW.** It is kept rather than edited away, because it is the measurement
that found the fault. **Anything calibrated against those numbers is wrong by a
semitone.**
✅ **THE FIX**: `OCTAVE +` and `OCTAVE -` pressed TOGETHER enters transpose, then
one press per semitone.
🔴 **AND THE FAULT WOULD NEVER HAVE ANNOUNCED ITSELF.** The keyboard played
perfectly and in tune with itself the whole time. It was a semitone flat against
every other instrument in the rig, and the only thing that could see it was a
note number on screen.

### A harness run was writing invented bytes into the capture file

🔴 **MEASURED AND FIXED 2026-09-20.** `node demo/verify.mjs dump` drives the
known stream to grade the decoder, and every message of it went down the tap.
`read-tap.mjs` reported `known stream ch1 CC 99` in the same table as real
readings off a Circuit and a Model 12.
⚠️ **THE ROWS WERE LABELLED AND THAT WAS NOT ENOUGH.** Each carried `from:
'known stream'`, so nothing lied, and every count, histogram and verdict was
still computed over a mixture. **A label on a row does not keep it out of an
aggregate.**
⚠️ **AND A CAPTURE IS A RECORD OF SOMETHING THAT HAPPENED ONCE.** Nobody can
re-press a knob to find out which rows were real, which is what makes this worse
than an ordinary wrong number.
✅ The tap is off under `?selfcheck=1`, and a full verify run now writes
**nothing**, proved by clearing the file and running one.
