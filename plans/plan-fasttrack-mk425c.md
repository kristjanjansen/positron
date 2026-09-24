# plan-fasttrack-mk425c: an interface that was supposed to be dead, and a keyboard that only talks

> 🔴 **NOTHING IN THIS FILE IS BUILT.** No page was written, no module was
> touched, no row was added to `demo/manifest.mjs`, nothing was deployed and
> nothing was committed. `demo/dump/index.html` is being written by somebody
> else and was not opened, read or edited here. It is a proposal.
>
> 🟢 **AND UNLIKE `plans/plan-circuit-model12.md`, BOTH DEVICES ARE PLUGGED IN.**
> That plan opens by saying not one claim in it was measured. This one opens the
> other way round: the M-Audio Fast Track Pro and the Evolution MK-425C are
> attached to the M2 Pro MacBook Pro on macOS 26.6.2 right now, and the whole of
> §2, §4.1, §5 and §8.1 is read off `ioreg`, off CoreAudio and off CoreMIDI on
> this machine. The MIDI map in §4 is still read out of a manual, and it says so
> line by line.
>
> **Evidence marks, the same set `plans/plan-circuit-model12.md` uses:**
>
> | mark | means |
> |---|---|
> | 🔴 **MEASURED** | run here, output pasted, with the command that produced it. |
> | 📄 **DOC** | read out of a manufacturer PDF, with the URL. |
> | 📁 **REPO** | read out of this checkout, with the file and line. |
> | 🌐 **THIRD PARTY** | published source code, trade press or a forum. Weaker. |
> | ⚖️ **INFERRED** | reasoned from something above. Nobody wrote it down. |
> | 🔌 **NEEDS THE HARDWARE** | needs a person at the keyboard, a cable, or a press. |
>
> ⚠️ **A 2006 MANUAL IS NOT A FACT ABOUT macOS 26.** Both manuals here predate
> every operating system this machine has ever run, predate Apple Silicon, and
> in the MK-425C's case predate the disappearance of the company that wrote it.
> Where a manual and a measurement disagree below, **the measurement wins and
> the disagreement is named**, because a quiet reconciliation is how a wrong
> sentence survives.

---

## 0. The ask

> *"also research some more devices: maudio fasttrack pro and evolution
> mk425c"*

Five questions were set with it: the Fast Track Pro's sample rate behaviour in
depth, a MIDI map for each to the standard of `plans/plan-circuit-model12.md`, power,
what each ADDS that the Circuit and the Model 12 do not already give, and where
each lands in `plans/plan-device-layouts.md`'s fourteen control types. Plus a list of
what to point `/dump/` at.

---

## 1. The headline, so nobody has to read §2 to get it

🔴 **THE FAST TRACK PRO WORKS AND THE DRIVER PROBLEM DOES NOT EXIST.**
`research/measured-devices-2026-09-20.md` established that. This plan does not re-open
it.

🔴 **THE SAMPLE RATE SPLIT IS NOT A CONFLICT. IT IS ONE HALF SET WRONG, AND IT
TAKES ONE CLICK.**

- The **output** half reports exactly **one** available rate: `44100.0` to
  `44100.0`. It has no other. It cannot be moved.
- The **input** half reports a **continuous range**, `8000.0` to `48000.0`. It
  accepts 44100 along with everything else in that span. It happens to be
  sitting at 48000.

So there is nothing to trade off and no resampling to accept. **Set the input
to 44100 and the two halves agree.** The 44100-against-48000 decision the brief
asked for is already made by the hardware, in one direction, with no argument
available.

🔴 **AND IT IS 16 BIT, WHICH IS THE COST NOBODY NAMED.** Every physical format
on every stream of both halves is `16` bit linear PCM. Not one 24 bit format is
offered. That is a much bigger fact about this device than the rate, and §2.5
says why it will never change on this machine.

🔴 **THE SPLIT IS A PROPERTY OF HOW macOS ENUMERATED IT, AND THE PROOF IS THAT
LINUX ENUMERATES IT DIFFERENTLY ON PURPOSE.** The device declares
`bNumConfigurations = 2`. macOS bound configuration **1**. The Linux kernel
contains a function whose entire job is to throw configuration 1 away and take
configuration 2 instead, and it logs the sentence *"Fast Track Pro switching to
config #2"* while doing it. §2.5.

🔴 **NEITHER DEVICE ANSWERS A MIDI DEVICE INQUIRY, AND THAT IS MEASURED RATHER
THAN EXPECTED.** `F0 7E 7F 06 01 F7` was sent to both, and to the Circuit and
the Model 12 for good measure, with a listener on all six CoreMIDI sources. No
reply from any of them. §8.1 has the run, the negative control that makes the
silence mean something, and the instrument bug that made the first three
attempts worthless.

**And the two verdicts the ask invited:**

- **The Fast Track Pro's audio adds nothing to this rig.** 16 bit, 44.1 kHz,
  2 in and 4 out, against a Model 12 that is 24 bit, 48 kHz, 12 in and 10 out
  and already here. §6.1.
- **Its DIN sockets add less than expected, and still add something.** The
  Model 12 is already a USB MIDI interface with a DIN IN and a DIN OUT bridged
  both ways, so the Fast Track Pro is not the rig's first DIN pair, it is its
  **second**, and the second one is clean. §6.2.
- **The MK-425C adds the one thing nothing else in the rig has: keys.**
  Twenty five of them, velocity sensitive, with a pitch bend wheel, a
  modulation wheel and a pedal socket. The Circuit has pads and no keyboard.
  This is not a marginal addition, it is the only physical piano keyboard in
  the building. §6.3.
- **And it needs no new control type.** Everything it can send is already in
  `plans/plan-device-layouts.md`'s catalogue, and every one of that catalogue's four
  🔴 rows is a thing this keyboard cannot do. §7.

---

# PART ONE: THE FAST TRACK PRO

## 2. The sample rate question, which is the live problem

### 2.1 What is actually there, measured

🔴 **MEASURED.** `ioreg -c IOUSBHostDevice -w0 -r -l`, parsed:

| | Fast Track Pro | MK-425C | for contrast: Circuit | Model 12 |
|---|---|---|---|---|
| `idVendor` | `0x0763` M-Audio | `0x0A4D` Evolution Electronics Ltd. | `0x1235` | `0x0644` |
| `idProduct` | `0x2012` | `0x0067` | `0x0079` | `0x805F` |
| `bcdDevice` | `0x0102` | `0x0125` | `0x0200` | `0x0100` |
| `bcdUSB` | **`0x0110`, USB 1.1** | **`0x0100`, USB 1.0** | `0x0200` | `0x0200` |
| `bMaxPacketSize0` | **8** | 64 | 64 | 64 |
| `bNumConfigurations` | **2** | 1 | 1 | 1 |
| `kUSBCurrentConfiguration` | **1** | 1 | 1 | 1 |
| `UsbPowerSinkAllocation` | **200 mA** | **160 mA** | not published | not published |

⚠️ **`bcdUSB` 0x0100 ON THE MK-425C IS USB 1.0, NOT 1.1.** It is the oldest
thing on this machine by that measure. Nothing follows from it directly, and it
is here because it is the kind of detail that explains a strange enumeration
later.

🔴 **MEASURED, the Fast Track Pro's interfaces in configuration 1:**

| interface | `bInterfaceClass` | `bInterfaceSubClass` | endpoints | what it is |
|---|---|---|---|---|
| 0 | 1 | 1 | 0 | AudioControl |
| 1 | 1 | **3** | **2** | MIDIStreaming, one in and one out |
| 2 | 1 | 2 | 0 at alt 0 | AudioStreaming |
| 3 | 1 | 2 | 0 at alt 0 | AudioStreaming |
| 4 | 1 | 2 | 0 at alt 0 | AudioStreaming |

**Three AudioStreaming interfaces**, and that is the shape of the whole problem.

### 2.2 CoreAudio, measured, both halves

🔴 **MEASURED** by calling `AudioObjectGetPropertyData` through `ctypes` against
`/System/Library/Frameworks/CoreAudio.framework/CoreAudio`, asking each device
for its name, uid, transport, nominal rate, available rates, clock domain,
stream configuration, latency, safety offset, buffer frame size and related
devices.

```
--- 112 'FastTrack Pro'
    uid='AppleUSBAudioEngine:M-Audio:FastTrack Pro:2111300:2,3' manuf='M-Audio' transport='usb '
    nominal=44100.0 available=[(44100.0, 44100.0)] clockdomain=1835100526
    streams out=(2 streams, 4 channels)  latency 46 frames  safety offset 46 frames
    buffer=512 range=(14.0, 4096.0)   related devices=(112, 116)
--- 116 'FastTrack Pro'
    uid='AppleUSBAudioEngine:M-Audio:FastTrack Pro:2111300:4' manuf='M-Audio' transport='usb '
    nominal=48000.0 available=[(8000.0, 48000.0)] clockdomain=0
    streams in=(1 stream, 2 channels)   latency 74 frames  safety offset 74 frames
    buffer=512 range=(15.0, 4096.0)   related devices=(112, 116)
```

Three things in there that nothing else said.

🔴 **THE UID NAMES THE INTERFACES.** `:2111300:2,3` is the USB location plus
**interfaces 2 and 3**, and `:2111300:4` is **interface 4**. So macOS grouped
the two playback AudioStreaming interfaces into one device with two streams of
two channels each, and left the third, the capture one, as a device of its own.
The `4 channels out` in `research/measured-devices-2026-09-20.md` is analogue 1 and 2 on
one stream plus S/PDIF on the other.

🔴 **`kAudioDevicePropertyRelatedDevices` RETURNS BOTH ON BOTH.** CoreAudio
already knows these are two halves of one box. That is the relationship an
Aggregate Device formalises, and it is why Audio MIDI Setup can offer them
together.

🔴 **THE TWO HALVES REPORT DIFFERENT CLOCK DOMAINS.** The output says
`1835100526`, which is the four character code `main` and is the same value the
MacBook Pro's own speakers and microphone report. The input says `0`, which in
this property means unknown. ⚖️ **INFERRED, and marked as a reading rather than
a fact:** a playback endpoint that is ADAPTIVE slaves to the host's USB frame
clock and so shares the host's domain, while an asynchronous capture endpoint
free runs and gets `0`. That is the ordinary USB Audio Class 1 arrangement and
it fits both numbers. 🔌 The endpoint descriptor's `bmAttributes` sync type
would settle it and `ioreg` does not publish alternate setting endpoints. §2.7
explains why it matters and §10 names the test.

### 2.3 The available rates, which is the answer

🔴 **MEASURED**, `kAudioDevicePropertyAvailableNominalSampleRates` and
`kAudioStreamPropertyAvailablePhysicalFormats` on every stream:

| half | streams | channels | bit depth | rates offered |
|---|---|---|---|---|
| output, device 112 | 2 | 2 + 2 | **16** | `44100.0 .. 44100.0`, twice, one entry per stream |
| input, device 116 | 1 | 2 | **16** | `8000.0 .. 48000.0`, a **range** |

The output's entries are a degenerate range whose minimum equals its maximum.
The input's is a real interval, which in USB Audio Class 1 means a format type
descriptor with `bSamFreqType = 0` and a min and max pair rather than a list of
discrete frequencies.

🔴 **SO THE SPLIT IS NOT A CONFLICT.** One side has one option and the other
side has every option including that one. Point the input at 44100 and there is
nothing left to decide.

📄 **DOC disagrees slightly and it is worth naming.** The Fast Track Pro user
guide says 16 bit operation runs *"at a maximum sample rate of 48kHz"*. The
measurement says the output offers 44100 and nothing else. Both can be true if
the 48 kHz path lives in the configuration macOS did not bind, which is §2.5.
🌐 **THIRD PARTY corroborates the measurement rather than the manual**: reports
of the device on Apple Silicon say it works with no driver *"but requires
changing the bitrate from 48,000 to 44,100"*, which is this exact instruction
arrived at from the other end.

### 2.4 Why macOS made it two devices and not one duplex device

⚖️ **INFERRED, and the pieces are all measured.** A USB audio device becomes one
duplex CoreAudio device when its AudioControl interface presents playback and
capture as one clocked unit. This one presents **three separate AudioStreaming
interfaces** and gives macOS no reason to believe the capture interface shares a
clock with the playback pair, which is exactly what the two clock domain values
say. So `usbaudiod` published the group it could justify, `2,3`, and the one it
could not, `4`, separately.

⚠️ **THIS IS NOT A FAULT AND NOT A DRIVER BUG.** A device with two engines at
two rates is a thing CoreAudio supports and represents honestly. The Model 12,
measured beside it, is the other case: one device, `:1,2`, 12 in and 10 out,
24 bit, 44100 or 48000, `related devices = (118,)` with only itself in it.

### 2.5 The second USB configuration, and why macOS will never use it

🔴 **MEASURED: `bNumConfigurations = 2`, `kUSBCurrentConfiguration = 1`.** The
device offers macOS a choice and macOS took the first.

🌐 **THIRD PARTY, the Linux kernel, `sound/usb/quirks.c`, quoted verbatim:**

```c
static int snd_usb_fasttrackpro_boot_quirk(struct usb_device *dev)
{
	int err;

	if (dev->actconfig->desc.bConfigurationValue == 1) {
		dev_info(&dev->dev,
			   "Fast Track Pro switching to config #2\n");
		/* This function has to be available by the usb core module.
		 * if it is not avialable the boot quirk has to be left out
		 * and the configuration has to be set by udev or hotplug
		 * rules
		 */
		err = usb_driver_set_configuration(dev, 2);
		...
		/* Always return an error, so that we stop creating a device
		   that will just be destroyed and recreated with a new
		   configuration */
		return -ENODEV;
	} else
		dev_info(&dev->dev, "Fast Track Pro config OK\n");

	return 0;
}
```

**Linux throws configuration 1 away and starts again on configuration 2.** It is
so committed to this that it deliberately fails the probe to force a re-enumeration.

And what configuration 2 buys, from the same file:

```c
#define MAUDIO_SET		0x01 /* parse device_setup */
#define MAUDIO_SET_COMPATIBLE	0x80 /* use only "win-compatible" interfaces */
#define MAUDIO_SET_DTS		0x02 /* enable DTS Digital Output */
#define MAUDIO_SET_96K		0x04 /* 48-96kHz rate if set, 8-48kHz otherwise */
#define MAUDIO_SET_24B		0x08 /* 24bits sample if set, 16bits otherwise */
#define MAUDIO_SET_DI		0x10 /* enable Digital Input */
```

🔴 **NOTE `MAUDIO_SET_96K`: "48-96kHz rate if set, 8-48kHz otherwise".** That is
the measured `8000.0 .. 48000.0` on this machine's capture half, written down by
a kernel developer who read the same descriptors. Two independent sources, one
number.

And `fasttrackpro_skip_setting_quirk` shows what the alternate settings are for:
96 kHz keeps alternate settings 3 and 6, 24 bit keeps 2 and 5, interface 4 is
*"no analog input"* and interface 5 is the digital input, and the fallback
branch is commented **`/* keep only 16-Bit mode */`**.

🔴 **SO THE 24 BIT AND 96 kHz MODES LIVE IN CONFIGURATION 2 AND macOS IS NOT
THERE.** ⚖️ **INFERRED and firm**: Audio MIDI Setup has no control that selects
a USB configuration, `AppleUSBAudio` binds what the composite driver selected,
and the only way to change it would be for a process to seize the device
through IOUSBHost and call `SetConfiguration`, which tears it away from the
audio driver. That is not a supported path and it is not worth building.
**16 bit at 44.1 kHz is what this device is on this machine, permanently.**

⚠️ **AND THERE IS A SECOND REASON IT WOULD NOT HELP.** ALSA matches this device
with `USB_DEVICE_VENDOR_SPEC(0x0763, 0x2012)`, a vendor specific match, and maps
its interfaces with an explicit quirk table rather than by parsing them as
class audio. ⚖️ **INFERRED**: if configuration 2 presented itself as ordinary
USB Audio Class, no quirk table would be needed. So even a hypothetical macOS
that could be made to select configuration 2 would hand it to
`AppleUSBAudio`, which binds class compliant interfaces and would find none.

### 2.6 The "class compliant mode" switch, which does not exist

⚠️ **THE BRIEF ASKED WHETHER THE OLD CLASS COMPLIANT MODE SWITCH STILL MATTERS.
THERE IS NO SWITCH.** 📄 DOC, the user guide's numbered panel list, all
twenty six items: front panel is Signal LEDs, Clip LEDs, Gain knobs, Inst/Line
button, Pad button, Mic/Inst inputs, Stereo/Mono button, MIDI In and Out
activity LEDs, Input/Playback Mix knob, Output Level knob, A/B monitor selector,
48V indicator, Power indicator, headphone Level knob, headphone output. Rear is
Power button, Kensington slot, 9V DC 500 mA connector, USB, MIDI Out, MIDI In,
48V phantom switch, S/PDIF Out, S/PDIF In, Outputs 1/2, Outputs 3/4. **Every one
of those is an analogue signal path control or a socket.** None of them changes
what the USB descriptors say.

📄 **WHAT PEOPLE REMEMBER IS THE DRIVER'S CONTROL PANEL, AND IT WAS SOFTWARE.**
The manual: *"Open the Control Panel by clicking on the Fast Track Pro icon in
the Windows Control Panel. On the Mac, click on the Fast Track Pro icon in the
System Preferences pane."* It has a Sample Depth field offering 16 bit or
24 bit and a read only Maximum Sample Rate field that follows it. The
Configurations section is the whole capability table:

| driver setting | channels | max rate |
|---|---|---|
| 16 bit | 4 in, 4 out, analogue and digital together | 48 kHz |
| 24 bit | 2 in and 4 out, or 4 in and 2 out, analogue **or** digital | 48 kHz |
| 24 bit | 2 in **or** 2 out | 88.2 and 96 kHz |

🔴 **THAT PANEL IS A SYSTEM PREFERENCES PANE FROM 2006 AND IT IS GONE.**
`research/measured-devices-2026-09-20.md` measured that no M-Audio software is installed
and that the device binds `com.apple.driver.AppleUSBAudio`. 🔴 MEASURED here:
`m-audio.com/fast-track-pro` answers **404**, and
`m-audio.com/support/downloads` answers **200** and contains **no occurrence of
the string "Fast Track Pro"** anywhere in its 126 KB, offering instead a
separate "Legacy Products" link. 🌐 THIRD PARTY puts the last driver release at
around 2012, which is the kext era, two Mac architectures ago.

⚠️ **AND A LEFTOVER OLD DRIVER IS THE ONE THING THAT COULD STILL BREAK THIS.**
🌐 THIRD PARTY reports of the device failing on modern macOS mostly resolve to
a stale M-Audio kext still installed. 🔴 MEASURED: there is none on this
machine, and the only third party audio plug-ins present are
`MSTeamsAudioDevice`, `ReincubateCamoAudio`, `ParrotAudioPlugin` and
`XDJ-XZ USBAudio`. **Do not install anything.** The working state is the state
with nothing installed.

### 2.7 The Aggregate Device, and whether one is needed at all

🔴 **FIRST, ASK WHETHER THE PROBLEM IS REAL FOR THIS PROJECT.** An Aggregate
Device exists so that an application which demands ONE duplex device can have
one. A browser does not demand that. `getUserMedia` takes an input device and
the `AudioContext` renders to an output device, and Chrome on macOS is content
for those to be two different devices. **So for every page in this repo, the
split costs nothing structurally.** An Aggregate Device is for a DAW.

🔴 **WHAT IT DOES COST IS ONE SAMPLE RATE, AND THAT REACHES THIS REPO TODAY.**
📁 REPO: an `AudioContext` has a single rate for its whole graph.

```
demo/shell/board.mjs:211   ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: rate, latencyHint: 'interactive' });
demo/able/index.html:83    ... ({ sampleRate: RATE, latencyHint: 'interactive' });
demo/grains/index.html:1326 ... ({ sampleRate: 48000, latencyHint: 'interactive' });
```

📁 REPO, `demo/shell/board.mjs:286`, a guard this project already wrote after
being bitten:

```js
if (ctx.sampleRate !== rate) {
  log(`this browser runs audio at ${ctx.sampleRate} Hz and the board sends ${rate}. Nothing in the chain resamples, so the pitch will be off by ${(rate / ctx.sampleRate).toFixed(3)}x and you will hear clicks`, 'bad');
}
```

🔴 **AND THAT GUARD WOULD AGREE PERFECTLY WHILE BEING WRONG, WHICH IS A SHAPE
CLAUDE.md ALREADY NAMES.** ⚖️ INFERRED from the Web Audio specification: a
context constructed with an explicit `sampleRate` is created at that rate and
the browser resamples on the way to the hardware. So on a machine whose output
device is the Fast Track Pro at 44100, a page asking for `{ sampleRate: 48000 }`
gets `ctx.sampleRate === 48000`, the guard compares 48000 against 48000, passes,
and a resampler runs underneath it that nothing in the page can see.
**The guard measures what the page asked for, not what the hardware does.**
🔌 NEEDS THE HARDWARE: open a board page with the Fast Track Pro selected as
the system output and read `ctx.sampleRate` and the output device's nominal
rate side by side. Two numbers from two sources, which is the only form of this
check that can disagree with itself.

**If an Aggregate Device is wanted anyway**, the arithmetic to go in with:

| | frames | at its rate | ms |
|---|---|---|---|
| Fast Track Pro output latency | 46 | 44100 | 1.04 |
| Fast Track Pro output safety offset | 46 | 44100 | 1.04 |
| Fast Track Pro input latency | 74 | 48000 | 1.54 |
| Fast Track Pro input safety offset | 74 | 48000 | 1.54 |
| buffer, both halves | 512 | | 11.6 at 44100 |
| for contrast, Model 12 output latency | 14 | 48000 | 0.29 |
| for contrast, Model 12 input latency | 74 | 48000 | 1.54 |

🔴 **THE DRIFT QUESTION IS OPEN AND IT IS THE ONLY INTERESTING ONE.** There is
one crystal in the box, so a naive reading says the two halves cannot drift and
drift correction should be switched OFF, which costs nothing. The measured clock
domains say otherwise: `main` on the output and `0` on the input is exactly what
an adaptive playback endpoint slaved to the host plus a free running capture
endpoint would look like, and those two really can drift. **Do not pick between
these on plausibility**, which is CLAUDE.md's rule about opposite fixes.
🔌 The measurement that separates them is in §10.

### 2.8 The instruction, as one line

**Audio MIDI Setup, select the Fast Track Pro input, set Format to 44100 Hz.**
That is the whole repair. The output is already there and cannot go anywhere
else. ⚠️ It is a machine wide setting and §10 says why a person has to do it.

---

## 3. The Fast Track Pro's MIDI, which is a wire rather than a map

🔴 **MEASURED, CoreMIDI**, via `MIDIGetNumberOfDevices` / `MIDIDeviceGetEntity`
and the string properties, called through JavaScript for Automation:

```
DEVICE 12 name=FastTrack Pro model=FastTrack Pro manuf=M-Audio
          driver=com.apple.AppleMIDIUSBDriver offline=0 uid=-1366301660
  ENTITY 0 name=FastTrack Pro srcs=1 dests=1
  SRC 5 name=FastTrack Pro display=FastTrack Pro uid=-2124141973 protocol=null
  DST 5 name=FastTrack Pro display=FastTrack Pro uid=933455975 protocol=null
```

**One entity, one source, one destination, both called `FastTrack Pro`.** That
is the DIN MIDI IN and the DIN MIDI OUT, bridged to USB by Apple's own class
driver with nothing installed.

📄 **DOC**: *"sixteen channels of MIDI in and out"*, item 20 *"MIDI Output
(MIDI Out) - Connect to the MIDI input of your controller or other MIDI
device"*, item 21 *"MIDI Input (MIDI In) - Connect to the MIDI output of your
controller or other MIDI device"*, and item 8, front panel **MIDI In and MIDI
Out activity LEDs**. Those LEDs are the only feedback this project will ever get
about the DIN path without a second device, and §9 uses them.

🔴 **THERE IS NO MIDI MAP AND THERE CANNOT BE ONE.** The Fast Track Pro sends no
MIDI of its own. It has no assignable control, no encoder, no button that
transmits, no clock, no transport. Every knob and button on it is in the
analogue signal path. Whatever arrives on its CoreMIDI source arrived at the
5-pin socket from somewhere else.

⚠️ **SO A DEVICE INQUIRY SENT TO IT IS A PROBE OF THE ROOM, NOT OF THE BOX.**
The bytes leave the DIN OUT. If nothing is patched into the DIN IN, no reply is
possible, and a silence says nothing at all about the interface. §8.1 measured
that silence and §9 says what to do with it.

🔴 **`protocol=null` ON BOTH ENDPOINTS**, which is `kMIDIPropertyProtocolID`
unset, which is a MIDI 1.0 legacy endpoint. Same on every device on this
machine. Nothing here is UMP.

---

# PART TWO: THE MK-425C

## 4. The Evolution MK-425C, the MIDI map

### 4.1 CoreMIDI, measured

🔴 **MEASURED**, same run as §3:

```
DEVICE 4 name=MK-425C USB MIDI Keyboard model=MK-425C USB MIDI Keyboard
         manuf=Evolution Electronics Ltd. driver=com.apple.AppleMIDIUSBDriver
         offline=0 uid=-577501703
  ENTITY 0 name=MK-425C USB MIDI Keyboard srcs=1 dests=1
  SRC 3 name=MK-425C USB MIDI Keyboard display=MK-425C USB MIDI Keyboard uid=-1509707290
  DST 3 name=MK-425C USB MIDI Keyboard display=MK-425C USB MIDI Keyboard uid=-1297040028
```

**One entity, one source, one destination, and the entity name equals the device
name**, so the display name has no suffix. That is different from the Model 12,
which has two entities and therefore display names like `Model 12 MIDI IN`,
and it is the fact `/dump/` needs in order to label a row.

🔴 **AND COREMIDI REMEMBERS DEVICES THAT ARE NOT PLUGGED IN.** The same
enumeration returned thirteen devices, of which **five are `offline=1`**:
`CMX-2000`, `UM-1`, `XDJ-XZ (1)`, `XDJ-XZ (2)` and `LPD8`. None of them is
attached. ⚠️ **A DEVICE LIST IS NOT AN INVENTORY OF WHAT IS ATTACHED**, and a
page that lists CoreMIDI devices without reading `kMIDIPropertyOffline` will
show five instruments that are not in the building. Web MIDI only exposes
online ports, so `/dump/` is safe by construction, and this is written down so
that a future tool built on CoreMIDI does not have to learn it twice.

🔴 **AND CHROME IS ALREADY TALKING TO IT.** `research/measured-devices-2026-09-20.md`
counted nine `AppleUSBHostDeviceUserClient` handles owned by Google Chrome on
this device. The Web MIDI path is live rather than theoretical.
⚠️ **The exact string Web MIDI reports for `port.name` is NOT measured here.**
CoreMIDI holds the name, the display name and the manufacturer above; how
Chrome composes them into `MIDIPort.name` and `MIDIPort.manufacturer` is a
Chrome implementation detail and `/dump/` settles it in one screenshot. This is
the fourth state `plans/plan-device-layouts.md` §9.1 names: plugged in, but is it the
device this layout was written for.

### 4.2 What is on it

📄 **DOC**, the Getting Started guide, which contradicts itself once and is
consistent everywhere else. The features list says *"12 programmable rotary
dials (8 on MK-425C and MK-449C)"*, the overview says *"8 rotary controls (12
rotary controls on MK-461C)"*, and the numbered panel key says *"Twelve rotary
controllers, all of which are fully MIDI assignable (eight on MK-449C &
MK-225C)"*, where `MK-225C` is a typo for MK-425C that recurs four times in two
documents. **All three agree on eight for this model**, and the arithmetic
confirms it: *"a total of 21 controls on the MK-425C"*, and 8 + 10 + 2 + 1 = 21.

| | count | note |
|---|---|---|
| keys | **25** | full size, velocity sensitive, nine velocity curves |
| rotary knobs | **8** | fully assignable |
| buttons | **10** | fully assignable, and they double as the numeric keypad 0 to 9 in edit mode |
| faders | **0** | *"9 full size programmable faders (MK-449C & MK-461C only)"* |
| pitch bend wheel | 1 | assignable |
| modulation wheel | 1 | assignable |
| footswitch socket | 1 | assignable |
| function buttons | 6 | plus dual press combinations |
| display | 1 | blue backlit LCD, a 3 digit field and a small 2 digit field |
| octave and transpose | | 11 octaves of range |

📄 **PORTS: `MIDI OUT` and `USB MIDI OUT/IN`.** ⚠️ **THERE IS NO DIN MIDI IN.**
One 5-pin DIN, output only. §6.2 counts it.

📄 **DRAW BAR MODE IS NOT ON THIS MODEL.** *"This feature is not applicable to
the MK-425C"*, because it reverses faders and there are none.

### 4.3 What a knob sends, and the hole in the middle of this plan

🔴 **NEITHER MANUAL PRINTS THE DEFAULT CONTROLLER NUMBER OF ANY KNOB.** Both
guides were read end to end. The Getting Started guide lists the ten factory
presets by the instrument they were made for, the Advanced Guide lists every
value you can assign and every procedure for assigning it, and **no table
anywhere gives the per knob defaults for a single preset**. This is the largest
unknown in the document and §9 puts it first.

📄 **THE TEN FACTORY PRESETS**, recalled with the `Recall` function and a two
digit number:

| | | | |
|---|---|---|---|
| 01 | GM Preset | 06 | PPGWave2V |
| 02 | B4 | 07 | Lounge Lizard |
| 03 | Pro-53 | 08 | G-Media Oddity |
| 04 | Reason Native | 09 | SoundBlaster Synth |
| 05 | Model-E | 10 | XG/GS Preset |

📄 **THE KEYBOARD TELLS YOU ITSELF, AND THAT IS THE CHEAP WAY TO READ THE MAP.**
*"In Default mode, the LCD will show the controller symbol, and the 2 digit
display will show the last selected controller. The 3 digits display the
currently assigned MIDI CC number."* And in the worked example:
*"While moving the modulation wheel, the display shows the positional value.
When you stop moving the wheel, after a short delay the display shows the
controller number in small digits and 01 in large digits. This tells you that
the modulation wheel currently is assigned to controller number 001."*

🔴 **SO THERE ARE TWO INDEPENDENT SOURCES FOR EVERY ASSIGNMENT AND THEY CAN
DISAGREE.** The device's own LCD, and the bytes on the wire. CLAUDE.md's MIM
corpus lesson is exactly this: two numbers derived from one field agree while
being wrong, and the repair is two sources that can disagree. **Read the LCD and
`/dump/` at the same time.** ⚠️ The modulation wheel's default of CC 1 is the
one default either manual states, and it is stated in an example rather than a
table.

📄 **WHAT A KNOB CAN BE ASSIGNED TO.** Appendix B1, the complete list, which is
also the procedure: select the control by moving it, press `CONTROL ASSIGN`,
type a three digit number.

| assign value | what it sends | `DATA MSB` twice | `DATA LSB` twice |
|---|---|---|---|
| **0 to 119** | standard MIDI CC | | |
| 120 to 127 | channel mode messages | | |
| 128 | pitch bend sensitivity | | |
| 129 | channel fine tune | | |
| 130 | channel coarse tune | | |
| 131 | channel pressure | | |
| **132** | **RPN coarse** | RPN MSB | RPN LSB |
| **133** | **RPN fine** | RPN MSB | RPN LSB |
| **134** | **NRPN coarse** | NRPN MSB | NRPN LSB |
| **135** | **NRPN fine** | NRPN MSB | NRPN LSB |
| 136 | Master Volume, GM SysEx | Volume MSB | Volume LSB |
| 137 | Master Pan, GM SysEx | Pan MSB | Pan LSB |
| 138 | Master Coarse Tune, GM SysEx | Tuning MSB | Tuning LSB |
| 139 | Master Fine Tune, GM SysEx | Tuning MSB | Tuning LSB |
| 140 | Chorus Mod rate, GM2 SysEx | Mod rate | |
| 141 | Chorus Mod Depth, GM2 SysEx | Mod depth | |
| 142 | Feedback, GM2 SysEx | Feedback level | |
| 143 | Send to Reverb, GM2 SysEx | Reverb send level | |
| **144** | **Pitch Bend**, 14 bit | Pitch shift MSB | Pitch shift LSB |
| 255 | controller off | | |

⚠️ **255 CANNOT BE TYPED.** *"This value cannot be typed in using the numerical
keypad. Type in 144 and then press the + button to set this value."*

🔴 **SO A KNOB ON THIS KEYBOARD CAN SEND AN NRPN, AND NOTHING ELSE IN THE RIG
CAN.** 📁 REPO: `demo/shell/cc-adapter.mjs` exports `ST_CC`, `ST_PB`, `COARSE`,
`has14`, `dec14`, `encPB`, `decPB` and a `SWITCHES` set, and **has no NRPN code
at all**, in either direction. `plans/plan-device-layouts.md` T9 records the same gap
from the sending side. **An MK-425C knob assigned 134 creates the receiving side
of that gap**, and §7.1 has what closed half of it while this was being
written.

### 4.4 What a button sends

📄 **DOC**, Appendix B2. The buttons get everything above **plus** seven values
the knobs do not have, and this is where the keyboard is genuinely more
expressive than its price suggests.

| assign value | what it sends | `PROGRAM` twice | `DATA MSB` twice | `DATA LSB` twice |
|---|---|---|---|---|
| 0 to 119 | standard MIDI CC | | toggle value 1 | toggle value 2 |
| **145** | **Program / Bank preset** | program | Bank MSB | Bank LSB |
| **146** | **MIDI CC on/off** | the CC number | press value | release value |
| **147** | **Note on/off** | note number | velocity on | velocity off |
| **148** | **Note on/off toggle** | note number | velocity on | velocity off |
| **149** | **MMC command** | | | command select |
| 150 | reverb type, GM2 | | type | |
| 151 | reverb time, GM2 | | time | |
| 152 | chorus type, GM2 | | type | |

🔴 **147 AND 148 ARE MOMENTARY AND LATCHING, AND THE DIFFERENCE IS A DEVICE
SETTING.** `plans/plan-device-layouts.md` T7 is about exactly this distinction and
treats it as something a page decides. On this keyboard **the device decides
it**, per button, and the page cannot see which was chosen except by watching
the traffic. That is worth knowing before a layout assumes it owns the answer.

📄 **THE MMC COMMANDS**, assign 149 then `DATA LSB` twice then a number:

| | | | |
|---|---|---|---|
| 01 | STOP | 08 | RECORD PAUSE |
| 02 | PLAY | 09 | PAUSE |
| 03 | DEFERRED PLAY | 10 | EJECT |
| 04 | FAST FORWARD | 11 | CHASE |
| 05 | REWIND | 12 | COMMAND ERROR RESET |
| 06 | RECORD STROBE | 13 | MMC RESET |
| 07 | RECORD EXIT | | |

📄 *"Press `CHANNEL` once. Type in `127`. This ensures that the message is set
to all device ID numbers."* MMC is SysEx, so the channel field becomes a device
ID, and 127 is all devices.

📄 **AND THE BUTTONS ARE THE NUMERIC KEYPAD.** *"It is not possible to select
any of the 10 numerical buttons by pressing them, since during edit mode, they
are used to enter numerical values."* To edit one you address it by number:
**on the MK-425C the ten buttons are controllers 11 to 20.**

### 4.5 Keys, wheels and the pedal

📄 **DOC:**

- **Keys**: 25, velocity sensitive, **nine velocity curves**, chosen on the
  MK-425C by pressing `CONTROL ASSIGN` and `DATA LSB` together and typing a
  number. Octave shift with `OCTAVE +` and `OCTAVE -`, 11 octaves of range.
  Transpose is `OCTAVE +` and `OCTAVE -` together, then one press per semitone.
- **Pitch bend wheel**: *"both fully MIDI assignable"*. Default is pitch bend,
  which is the 14 bit message.
- **Modulation wheel**: default **CC 1**, stated in the worked example.
- **Footswitch**: *"fully MIDI assignable"*. ⚠️ **AND ITS POLARITY IS SENSED AT
  POWER UP**, verbatim: *"On power up, the sustain pedal is assumed to be in the
  OFF position. So, if you want the sustain pedal to be off when it is
  unpressed, make sure the pedal is unpressed when you power up."* A pedal held
  down while the keyboard boots is inverted for the whole session and nothing on
  screen will say so.

### 4.6 Channels

📄 **DOC:**

- The global MIDI channel is set with `GLOBAL CHANNEL` and a number 01 to 16. It
  *"affects the keyboard, program and bank changes plus whatever controllers
  have been set to respond to the global setting"*.
- **Every controller can carry its own channel**, set with `CHANNEL ASSIGN`.
  Verbatim: *"If the controller is assigned to channel 00, it will transmit on
  the global channel."*
- ⚠️ **AND `CHANNEL ASSIGN` MEANS SOMETHING ELSE ON A SYSEX ASSIGNMENT.** *"the
  individual control channel number does not define a transmit channel, but a
  device ID. This is made clear since when you press the `CHANNEL` button, the
  Channel symbol will not be shown and there is no 'c' in the 3 digit
  display."*

🔴 **SO `plans/plan-device-layouts.md` §5.3's RULE HOLDS AND GETS SHARPER.** That
section says the key is `(channel, controller)` and never the controller alone,
argued from Circuit collisions. On this keyboard the channel is a **per control
setting that a person can change from a keypad without any record of it
anywhere**, and channel 00 is a third state meaning "whatever global is". A
layout that hard codes a channel for an MK-425C control is asserting something
the device holds in non volatile memory and nobody wrote down.

### 4.7 Program and bank change

📄 **DOC**: press `PROGRAM` once and type a number to send a program change on
the global channel, on the fly. `DATA LSB` and `DATA MSB` once each send Bank
LSB and Bank MSB the same way. Pressing those buttons **twice** instead enters
the programming path for the tables in §4.3 and §4.4, which is the single most
confusing thing about this device's interface and the manual flags it twice.

⚠️ **THE ONE PRESS PATH TRANSMITS WHILE YOU TYPE.** *"No data is sent out of the
Evolution MK-425C/449C/461C when it is in Edit mode except for program and bank
changes."* So typing a program number is audible immediately, and typing a
controller number is not.

### 4.8 SysEx, device ID and the memory dump

📄 **DOC:**

- **You cannot program your own SysEx.** *"It is not possible to program your
  own specified SysEx message into the MK-425C/449C/461C."* What it has is the
  fixed GM, GM2 and MMC set in the tables above.
- **Device ID** is 00 to 127, default **127**, set on the MK-425C by pressing
  `PROGRAM` and `DATA MSB` together. It is a global setting and is separate from
  the per control device ID used by an assigned SysEx message.
- **Memory Dump**, on the MK-425C, is `DATA LSB` and `RECALL` together. Verbatim:
  *"will send out a number of Sys Ex data packets that represent the 10
  memories"*. It can be recorded into a sequencer and played back at the
  keyboard to restore it.
- ⚠️ **A DUMP DOES NOT TAKE EFFECT UNTIL A PRESET IS RECALLED.** *"The current
  controller assignments are not affected by a memory dump, or a memory send to
  the keyboard. Once a memory dump has been sent to the keyboard, you will need
  to recall a preset to access the new memory settings."*
- ⚠️ **A DUMP AT DEVICE ID 127 IS ACCEPTED BY ANY UNIT OF THE SAME MODEL.**
  *"The default Device ID is 127, which means when a memory dump is performed,
  that dump can be received by the same keyboard model, regardless of the Device
  ID setting."*

🔴 **AND THIS IS THE ONE THING THE KEYBOARD RECEIVES.** §4.9.

### 4.9 What it receives, which is almost nothing

📄 **DOC, Appendix A, the MIDI implementation chart.** The Received column is
`X`, meaning no, for **every single row**: basic channel, mode, note number,
velocity, aftertouch, pitch bend, control change 0 to 119, control change 120 to
127, program change, song position, song select, system real time clock, and
every auxiliary message. The **one** exception is System Exclusive, where
Transmitted reads `GM, GM2, MMC` and Received reads **`Memory Dump`**.

🔴 **SO THE MK-425C IS A PURE SENDER.** No lamp can be lit on it. No knob can be
moved by a page. No button can be told what state it is in. No note can be shown
on its keys. Nothing a page does is visible on the instrument.
`plans/plan-device-layouts.md` T8, *"a lamp, which is a control that READS"*, and T13,
the lamp bank, are **structurally impossible** on this device, and that is a
fact rather than a missing feature.

🔴 **IT ALSO TRANSMITS NO CLOCK.** The implementation chart's System Real Time
Clock row is `X` in both columns. So the MK-425C does not enter
`plans/plan-circuit-model12.md` §7's argument about who owns the tempo. It cannot be a
clock source and it cannot follow one. `plans/plan-device-layouts.md` T14 refuses
tempo as a control type; this device refuses it as a capability.

⚠️ **AND THAT IS WHY A DEVICE INQUIRY WAS NEVER LIKELY TO BE ANSWERED**, which
§8.1 measured rather than assumed. A universal inquiry is not a memory dump, and
the chart says memory dump is the only SysEx it accepts.

### 4.10 Assignment, storage, and whether it survives a power cycle

📄 **DOC, and this is the clearest paragraph in either manual:**

> *"The MK-425C/449C/461C uses non-volatile memory so that you can continue
> where you left off even after powering down and restarting. The current
> controller and channel assignments are stored whether you have stored your
> setup to a memory locations or not. Also stored is Draw Bar mode (on/off),
> DATA LSB and DATA MSB data, global channel setting and last used memory
> preset."*

🔴 **YES, AN ASSIGNMENT SURVIVES A POWER CYCLE, AND IT SURVIVES WITHOUT BEING
SAVED.** That is the unusual half. There is no unsaved state on this keyboard.
Turn a knob's CC from 7 to 74, pull the USB cable, plug it back in, and it is
still 74.

**The three ways state moves:**

| | how | what it does |
|---|---|---|
| **live edit** | `CONTROL ASSIGN`, `CHANNEL ASSIGN`, `DATA MSB`, `DATA LSB` | changes the current assignment, kept in non volatile memory immediately |
| **store** | dual press `Store`, then a two digit location | writes the current setup into one of 10 memories |
| **recall** | `Recall`, then a two digit location | loads a memory over the current setup |

📄 **FACTORY RESET**: hold the `+` and `-` buttons while switching the keyboard
on. *"Note: Restoring the Factory presets will erase all setups stored to
memory."* The factory presets themselves are in ROM and cannot be lost.

🔴 **SO THERE IS A REAL HAZARD AND IT IS WORTH ONE LINE IN ANY PAGE THAT TOUCHES
THIS DEVICE.** A stream of assignments typed to make a page work is
**indistinguishable from the factory state afterwards**, because nothing
prompts, nothing is unsaved, and nothing has a name. **Take a memory dump before
changing anything**, which is the only backup this device has, and §9 puts it in
the list for that reason as well as for the format.

### 4.11 Is there an editor that still runs

**No, and it does not matter.**

📄 **DOC**, the Advanced Guide: the editor is the **Evolution Librarian
Software**, *"a Windows PC librarian program"*, version 1.0, which also handles
the UC-33e. The Getting Started guide adds *"(PC only, please check
www.evolution.co.uk for Mac version)"*. It sends and receives the 10 memories,
loads and saves banks, views how a patch was programmed and reorders memories by
drag and drop. ⚠️ Verbatim: *"it is not possible to edit the contents of a
memory"* in it, so even in 2006 it was a librarian rather than an editor.

🌐 **THIRD PARTY**: the Mac successor is **M-Audio Enigma**, and its supported
list includes MK-425C, MK-449C, MK-461C, UC-33e, X-Session, Trigger Finger,
Ozonic, Axiom and the Oxygen range. The last Mac release traceable is
**Enigma OSX 1.2.2**, and it is *"native support for both Power PC and improved
support for Intel-based Macintosh computers"*.

🔴 **MEASURED: `www.evolution.co.uk` DOES NOT RESOLVE.** Not a 404, no DNS
record at all. Every support URL printed inside the MK-425C's own manual, four
of them in four languages, points at a host that no longer exists.

🔴 **MEASURED: the only surviving copy of Enigma found is on the Internet
Archive**, item `EnigmaOSX1.2.2`, one file `Enigma_OSX_1.2.2.dmg`, 8,653,311
bytes, added to the archive 2016-08-07. The same item also carries the
Evolution UC-33e manuals as scanned PDFs.

⚖️ **INFERRED, and marked as inference because the binary was not opened:** a
2007 era PowerPC and Intel Mac application is a 32 bit Carbon or Cocoa binary,
macOS 10.15 removed 32 bit support entirely, and Rosetta 2 translates 64 bit
Intel only and no PowerPC at all. **It will not launch on this machine.**
🔌 The settling test costs one download and one command, `lipo -archs` or `file`
on the binary inside the disk image, and needs no hardware. It is not in §9
because it does not change anything.

🔴 **AND THE PLAN DOES NOT NEED AN EDITOR.** Every assignment is reachable from
the keyboard's own keypad, and the memory dump is ordinary SysEx on the wire in
both directions. **A page in this repo could receive a dump, keep it and send it
back**, which is strictly more than Enigma offered, needs no 32 bit anything,
and is blocked today only by `demo/shell/midi.mjs:57` asking for
`requestMIDIAccess({ sysex: false })`. 📁 REPO, that is the literal line.

### 4.12 What neither manual prints

Written down so it is not looked for twice.

1. **The default CC number of any of the eight knobs, in any preset.** §9 item 1.
2. **The default assignment of the ten buttons.** §9 item 2.
3. **The MIDI channel each control ships on**, beyond "00 means global".
4. **The SysEx format of the memory dump.** Not the manufacturer id, not the
   length, not the layout. Only that it exists and is *"a number of Sys Ex data
   packets"*.
5. **The note number the keys start on** at the default octave.
6. **Whether the pitch bend wheel is 14 bit or 7 bit on the wire.** It is called
   pitch bend, and pitch bend is 14 bit by definition, but a cheap controller
   sending only the MSB is a real and common shortcut.
7. **Which of the ten factory presets is loaded now.** It is whatever was last
   used, because the last used preset is in non volatile memory.

---

## 5. Power, which was open and is now measured

🔴 **MEASURED.** `UsbPowerSinkAllocation`, the power macOS granted each device
from its port:

| device | granted |
|---|---|
| **Fast Track Pro** | **200 mA** |
| **MK-425C** | **160 mA** |
| Circuit | property not published |
| Model 12 | property not published |

⚠️ **THE UNIT IS INFERRED FROM THE MAGNITUDES, NOT READ FROM A HEADER**, and
`bMaxPower` itself is still not in the descriptors `ioreg` publishes. 200 and
160 are exactly twice 100 and 80, and USB encodes `bMaxPower` in 2 mA units, so
these are consistent with `bMaxPower` of `0x64` and `0x50`. Treat them as the
allocation, which is what actually constrains the bus.

⚖️ **INFERRED about the two absences**: a device that declares itself self
powered asks the bus for nothing and gets no allocation. The Model 12 runs from
its own PSU. 📄 DOC, `plans/plan-circuit-model12.md` §3.10, the Circuit's user guide:
*"It cannot be powered from a computer or other device via a USB connection."*
So both absences are explained and neither is a missing reading.

🔴 **AND THE HUBS HAVE THOUSANDS OF MILLIAMPS TO GIVE.** `kUSBHubPowerSupply`,
measured on the chain all three of these devices hang from:

```
USB2.1 Hub  @02100000   2200
  USB 2.0 Hub [MTT] @02110000   3700
    USB 2.0 Hub @02111000   2200      <- FastTrack Pro, Circuit and MK-425C are on this one
USB3.1 Hub  @02200000   4176
```

🟢 **SO THE ANSWER TO "CAN THESE TWO SHARE A HUB CHAIN WITH A CIRCUIT WITHOUT
BROWNING OUT" IS YES, AND IT IS NOT CLOSE.** 200 plus 160 is 360 mA against a
hub reporting 2200, on a chain of self powered hubs, with the Circuit drawing
nothing from the bus at all because it physically cannot. **They are already
doing it**, and have been through every measurement in this document.

📄 **DOC, both external supply options, for completeness:**

- Fast Track Pro: **9V DC 500 mA**, optional, and its only stated purpose is
  running the box as a stand alone 24 bit 44.1 kHz A/D converter with no
  computer attached.
- MK-425C: **9V DC, 250 to 300 mA, centre positive**, not included, and
  verbatim *"Use only one method at a time"*, with a hardware power switch to
  choose. A keyboard with a power switch is a keyboard that can be off while
  plugged in, which is a state worth remembering before concluding a port has
  vanished.

⚠️ **THE FAST TRACK PRO IS A FULL SPEED DEVICE ON A CHAIN OF HIGH SPEED HUBS**,
12 Mbit/s, carrying 4 channels out and 2 in through two nested hubs beside two
other devices. `research/measured-devices-2026-09-20.md` already flags this as the first
thing to change if a dropout appears. At 16 bit and 44.1 kHz its whole stream is
about 4.2 Mbit/s, which is a third of what the wire has, so the arithmetic says
it is fine and the arithmetic is not the part that usually fails.

---

## 6. What each one ADDS, and one of them nearly does not

### 6.1 The Fast Track Pro's audio adds nothing

Measured against the measured Model 12, on the same machine, in the same run:

| | Fast Track Pro | Model 12 |
|---|---|---|
| bit depth | **16** | **24** |
| rates | out 44100 only, in 8000 to 48000 | 44100 and 48000 |
| channels | 2 in, 4 out | **12 in, 10 out** |
| CoreAudio devices | **two** | one |
| USB | full speed, 12 Mbit/s | high speed, 480 Mbit/s |
| mic preamps with phantom | 2 | yes |
| digital I/O | **S/PDIF in and out** | none |
| bus powered | **yes** | no, external PSU |
| output latency | 46 frames | 14 frames |

🔴 **THE HONEST SENTENCE IS THAT ITS AUDIO HAS NO ROLE IN THIS RIG.** A device
that gives you a third as many inputs at two thirds the bit depth and cannot
match the rate of the one already on the desk is not a second interface, it is a
worse one.

**Three things it does have that the Model 12 does not**, none of which is
currently wanted by anything in this repo, listed so the conclusion can be
revisited rather than re-derived:

1. **S/PDIF in and out.** The Model 12 has no digital I/O. If anything ever
   needs a coaxial digital connection, this is the only box that has one.
2. **Bus power.** It is the only audio interface here that works from a laptop
   with no mains. A field recording rig is a real thing and this is what one
   looks like.
3. **It is class compliant at full speed and USB 1.1**, which is the most
   conservative profile there is. ⚖️ INFERRED: it will work on a Raspberry Pi
   with no driver and no configuration, which is more than can be said for most
   interfaces, and `plans/plan-circuit-model12.md` §6.8 has a deferred Pi stage that
   would want exactly that. **Not now. Written down.**

### 6.2 The DIN sockets add something, and less than the brief expected

🔴 **THE RIG ALREADY HAS A DIN MIDI INTERFACE AND IT IS THE MODEL 12.**
`plans/plan-circuit-model12.md` §6.11 establishes it from TASCAM's own manual: the
Model 12's DIN sockets are bridged to USB in both directions, *"MIDI signals
input through this connector will be sent to the computer"* and *"This outputs
MIDI signals sent from the computer"*. 🔴 And this run measured the ports it
publishes: `Model 12 MIDI IN` and `Model 12 MIDI OUT`, plus a second pair
`Model 12 DAW Control IN` and `Model 12 DAW Control OUT`.

**So the Fast Track Pro is not the rig's first DIN pair. It is its second.**
The full inventory, all measured except where noted:

| | DIN IN | DIN OUT | bridged to USB |
|---|---|---|---|
| Model 12 | 1 | 1 | both ways, measured as a CoreMIDI source and destination |
| **Fast Track Pro** | **1** | **1** | both ways, measured as a CoreMIDI source and destination |
| MK-425C | **0** | 1 | out only, and only in *"MIDI out from USB"* mode |
| Circuit | 1 TRS | 1 TRS | 📄 DOC, neither reaches the computer |

**Four reasons a second pair is worth having**, and they are not nothing:

1. 🔴 **THE MODEL 12'S DIN OUT IS NOT CLEAN.** `plans/plan-circuit-model12.md` §6.11
   warns that MIDI TIMECODE and MIDI CLOCK are mixed into that same socket when
   they are switched on. The Fast Track Pro's DIN OUT carries what you send it
   and nothing else. **A port with nothing else on it is a different kind of
   port**, and the moment a clock is involved that difference is the whole
   design.
2. **Two independent wires.** Clock to one instrument and notes to another, at
   the same time, with no merging and no filtering.
3. **It works with no mixer.** The Model 12 is a mixer with a power supply that
   lives in a studio. The Fast Track Pro is a small bus powered box.
4. 🔴 **IT IS THE ONLY WAY TO GET A CIRCUIT'S DIN OUT INTO A COMPUTER WITHOUT
   SPENDING THE MODEL 12'S PORT ON IT**, which §9's second `/dump/` observation
   uses to cross check a device against itself.

### 6.3 The MK-425C adds keys, and nothing else in the building has any

🔴 **THIS IS THE CLEAREST RESULT IN THE DOCUMENT.**

| | Circuit | MK-425C |
|---|---|---|
| keys | **none** | **25, velocity sensitive, 9 curves** |
| pitch bend wheel | **none** | 1, assignable |
| modulation wheel | **none** | 1, assignable, default CC 1 |
| pedal socket | **none** | 1, assignable |
| octave and transpose | pads shift | 11 octaves |
| knobs | 8 macros | 8, freely assignable |
| buttons that send | pads and function keys | 10, freely assignable |
| sends NRPN | 📄 yes | **yes, from a knob** |
| sends MMC | no | **yes, from a button** |
| receives | 📄 CC, NRPN, program change, clock | **memory dump only** |
| sequencer and synth | **yes** | none |
| clock | 📄 sends and receives | **neither** |

📁 **REPO, and this is why it matters here rather than in the abstract.**
`demo/shell/keyboard.mjs` exists and draws an on screen keyboard. `/keys/` and
`/able/` are both keyboard pages: `/able/` plays Ableton Live from a browser and
`/keys/` plays a Raspberry Pi, and both are driven today by pressing pictures of
keys with a mouse or a fingertip. **The MK-425C is a real keyboard for both of
them**, with velocity that means something and a pitch bend wheel that neither
page has ever had.

🔴 **AND THE THING IT CANNOT DO IS THE THING THE CIRCUIT CAN.** It receives
nothing. So the pairing is not a competition: the Circuit is the device a page
talks TO, and the MK-425C is a device a page only ever listens to.
`plans/plan-circuit-model12.md` §5's direction table gains a third row and it is
entirely one way.

### 6.4 The verdict, plainly

| device | role | verdict |
|---|---|---|
| **MK-425C** | the rig's only piano keyboard, pitch bend wheel, mod wheel and pedal input, plus 8 assignable knobs and 10 assignable buttons that can send CC, NRPN, notes, program change and MMC | 🟢 **a distinct and useful role, available today, needs no new control type** |
| **Fast Track Pro, as audio** | 16 bit, 44.1 kHz, 2 in and 4 out, against a 24 bit 48 kHz 12 in and 10 out Model 12 | 🔴 **no role. Do not design anything around it.** Keep it for S/PDIF, for bus power away from mains, and for a Raspberry Pi stage that is deferred |
| **Fast Track Pro, as MIDI** | a second clean DIN IN and DIN OUT bridged to USB with no driver | 🟡 **a real role and a smaller one than expected**, because the Model 12 already is a DIN interface. Worth keeping plugged in, not worth building a page around |

---

## 7. Where each lands in the fourteen control types

📁 **REPO**, `plans/plan-device-layouts.md` §2's catalogue.

### 7.1 The MK-425C needs nothing new

| control | count | type today | types it can be assigned into |
|---|---|---|---|
| rotary knob | 8 | **T1**, continuous absolute 7 bit | **T2** bipolar on any CC that centres at 64, **T4** folded, **T6** 14 bit via assign 144, **T9** NRPN via assign 134 or 135, and T3 enumerated is a page side reading of a T1 |
| button | 10 | **T7**, and the device decides momentary against latching | **T12** notes via 147 or 148, **T10** program change via 145, **T11** device transport via 149 MMC |
| key | 25 | notes, and `keyboard.mjs` already owns this | |
| pitch bend wheel | 1 | **T6**, 14 bit absolute | anything in the knob row |
| modulation wheel | 1 | **T1**, default CC 1 | anything in the knob row |
| footswitch | 1 | **T7** momentary, default CC 64 | anything in the button row |

🔴 **EVERY ONE OF THE CATALOGUE'S FOUR RED ROWS IS SOMETHING THIS KEYBOARD
CANNOT DO.** T5 the relative encoder: it has none, its knobs are absolute
potentiometers. T8 the lamp: §4.9, it receives nothing. T13 the lamp bank: same.
T12 the note grid: it can send the notes but never the lamps, so what it gives
you is the half of T12 that already works. **T14 tempo is refused by the
catalogue and refused by the device**, which transmits no clock.

🟢 **SO THE LAYOUT WORK NEEDS NOTHING NEW FOR THIS DEVICE**, which is the useful
half of the answer. `createSlider` with `set()`, `createChoice`, `createPicker`,
`keyboard.mjs` and the existing pitch bend handling cover the whole instrument.

🔴 **WITH EXACTLY ONE EXCEPTION, AND IT IS IN THE ADAPTER RATHER THAN THE
WIDGET.** A knob assigned 134 or 135 sends an **NRPN**: CC 99, CC 98 and CC 6 in
sequence. 📁 REPO, `demo/shell/cc-adapter.mjs` handles CC and pitch bend and has
no NRPN code in either direction, and its `COARSE` and `has14` helpers implement
the CC n / CC n+32 pairing which is a different convention entirely.
`plans/plan-device-layouts.md` T9 already records *"nothing sends one"*. **This device
creates the receiving side of the same gap**, and an inbound NRPN is harder than
an outbound one, because §5.3 of that plan says an NRPN may not coalesce: the
two select messages change what the third one means, so a parser has to hold
state per channel and a dropped select silently misaddresses everything after
it.

🔴 **AND HALF OF THAT GAP CLOSED WHILE THIS DOCUMENT WAS BEING WRITTEN, WHICH IS
WHY IT IS STATED AS OF AN HOUR RATHER THAN AS A FACT.** 📁 REPO, and it is
**uncommitted work by the agent building `/dump/`**, not something that was here
this morning: `demo/shell/midi-decode.mjs` now exports **`createNrpn()`**, a per
channel accumulator keyed on `Map` from channel to `{ msb, lsb, rpn }` that
folds CC 99, CC 98, CC 101, CC 100, CC 6 and CC 38 into one reading and
distinguishes RPN from NRPN by which select pair arrived last. Its own comment
carries the trap worth having: **99 is the MSB and 98 is the LSB, which is the
opposite order from the numbers**. The same file also exports `deviceInquiry()`
and `readInquiryReply()`.
⚠️ **SO THE REMAINING GAP IS NARROWER AND IS NOT NOTHING.** `createNrpn()`
DECODES an inbound NRPN for a reader. Binding one to a widget is §5.3's `nrpn`
address kind, and `cc-adapter.mjs`, which is the file a layout would actually go
through, is still untouched. 🔌 And nobody has yet seen a real NRPN from this
keyboard, so the parser and the device have not met. §9 item 8.

⚠️ **AND `cc-adapter.mjs` ALREADY KNOWS CC 64 IS A SWITCH.** 📁 REPO, its
`SWITCHES` set contains 64 to 69 and 120 to 127, so the sustain pedal's default
assignment is already classified correctly on arrival. That is a small piece of
free correctness and it is worth an assert rather than an assumption.

### 7.2 The Fast Track Pro contributes no control type at all

🔴 **NONE. NOT ONE.** Every control on the box is analogue. What it contributes
instead is a **transport**, in the sense of `plans/plan-device-layouts.md` §5.3's
tagged union where *"the address is a tagged union, and the tag is the
transport"*. Today every address in that union implicitly means "over USB to the
device named in the layout". The Fast Track Pro introduces a route where the
port and the instrument are different things: the port is `FastTrack Pro` and
the instrument is whatever is on the far end of a 5-pin cable.

⚖️ **INFERRED, and it is the one design consequence worth naming:** a layout
bound to a DIN route can never confirm anything. `plans/plan-device-layouts.md` §9.3
already argues that a Model 12 layout is never confirmed even plugged in,
because the device does not echo. **A DIN route is worse**, because the port
being present proves only that a socket exists. Nothing about a cable, nothing
about what is on the other end, nothing about whether it is switched on. A
layout over DIN is a layout with no fourth state at all, and it should say so in
words once rather than pretend.

---

## 8. What was measured here, and what is still open

### 8.1 🔴 MEASURED: MIDI Device Inquiry, and the negative control that makes it mean something

**The run.** A CoreMIDI client was created through `ctypes`, an input port was
opened and connected to **all six** sources, and `F0 7E 7F 06 01 F7` was sent to
four destinations in turn with a 2.5 second listen after each.

```
sources    : ['IAC Driver Bus 1', 'Model 12 MIDI IN', 'Model 12 DAW Control IN',
              'MK-425C USB MIDI Keyboard', 'Circuit', 'FastTrack Pro']

[0] quiet listen, nothing sent
  idle 3.0 s: 0 non-realtime message(s), realtime 0xf8 x191 from Circuit

[*] MIDI Device Inquiry F0 7E 7F 06 01 F7 -> 'FastTrack Pro'
  MIDISend -> 0
  after send: 0 non-realtime message(s), realtime 0xf8 x123 from Circuit

[*] MIDI Device Inquiry F0 7E 7F 06 01 F7 -> 'MK-425C USB MIDI Keyboard'
  MIDISend -> 0
  after send: 0 non-realtime message(s), realtime 0xf8 x120 from Circuit

[*] MIDI Device Inquiry F0 7E 7F 06 01 F7 -> 'Circuit'
  MIDISend -> 0
  after send: 0 non-realtime message(s), realtime 0xf8 x121 from Circuit

[*] MIDI Device Inquiry F0 7E 7F 06 01 F7 -> 'Model 12 MIDI OUT'
  MIDISend -> 0
  after send: 0 non-realtime message(s), realtime 0xf8 x121 from Circuit
```

🔴 **NOBODY ANSWERED.** Not the Fast Track Pro, not the MK-425C, not the Circuit,
not whatever is or is not on the Model 12's DIN.

🔴 **AND THE INSTRUMENT IS PROVED IN EVERY ONE OF THOSE WINDOWS.** The listener
heard between 120 and 123 clock bytes from the Circuit inside each 2.5 second
window in which the reply did not arrive. **The silence is a reading, not a dead
tool**, and that distinction is the entire value of the measurement.

⚠️ **THE OBVIOUS NEGATIVE CONTROL FAILED AND WAS REPLACED.** Sending the same
bytes to `IAC Driver Bus 1` and listening on `IAC Driver Bus 1` produced nothing,
so the IAC loopback is not usable as a control on this machine and no time was
spent finding out why. The Circuit's unsolicited clock is the better control
anyway, because it is traffic from a real USB MIDI device through the real
driver rather than through a virtual bus.

🔴 **AND THE FIRST THREE ATTEMPTS AT THIS MEASUREMENT REPORTED SILENCE FROM
EVERY DEVICE INCLUDING THE ONE THAT WAS SHOUTING.** The cause is worth writing
down because it is CLAUDE.md's check-the-instrument rule in a new costume.
`MIDIPacketList` is `aligned(4)` on arm64, so `packet[0]` begins at **offset 4**,
directly after the `numPackets` field, not at offset 8 where natural alignment of
the `UInt64` timestamp would put it. Reading at offset 8 finds a length field of
zero, breaks out of the packet loop, and **looks exactly like a quiet MIDI bus**.
Three runs were written up as "no reply from anything" before a deliberately
dumber probe that printed raw bytes showed a continuous stream that the parser
had been discarding.

**How to read each of the four silences:**

| destination | what the silence means |
|---|---|
| **MK-425C** | 🟢 **A REAL ANSWER ABOUT THE DEVICE.** Its destination is the keyboard's own USB MIDI input. 📄 DOC agrees in advance: Appendix A's Received column lists `Memory Dump` as the only SysEx it accepts, and a universal inquiry is not one. **Do not report this as the device being absent or asleep.** Silence is permitted behaviour and this is the permitted behaviour. |
| **Fast Track Pro** | ⚠️ **UNINFORMATIVE, AND THAT IS ITSELF USEFUL.** The bytes left the 5-pin DIN OUT. With nothing patched into the DIN IN, no reply is physically possible. What it does prove is that `MIDISend` to that destination returns 0 and does not error. |
| **Model 12 MIDI OUT** | ⚠️ Same shape. A DIN socket, not a device. |
| **Circuit** | 🟡 A real answer about the Circuit over USB, and it is not the whole story: Novation Components reads a Circuit's firmware version over Web MIDI, so the Circuit answers **something**, and whatever it answers is a Novation specific SysEx rather than the universal inquiry. Out of scope here and flagged for whoever owns that plan. |

### 8.2 🔴 MEASURED, and out of scope, and too interesting to leave out

**The Circuit is emitting MIDI Clock over USB right now, unattended, with nobody
in the room.** 191 `0xF8` bytes in a 3.0 second idle window from the source
named `Circuit`, confirmed by two independent runs of two different probes that
agree on which source it is.

⚠️ **THE RATE IS SOFT AND THE PRESENCE IS NOT.** 191 in 3.0 s is about 64 a
second, which at 24 pulses per quarter note is about 159 BPM. An earlier run
with a cruder counter suggested several times that rate. **The two disagree, so
the tempo figure is not a measurement yet**, and the fact that a clock is
running is.

`plans/plan-circuit-model12.md` §7 is an argument about who owns the tempo, and it
assumes the Circuit's clock output is something you switch on. **Whatever the
current settings are, it is on.** That belongs to that plan and its author, and
it is recorded here because it was seen.

### 8.3 Still open, and what would settle each

**Would change the plan:**

1. **Do the two halves of the Fast Track Pro actually drift against each other.**
   §2.7. Opposite fixes hang on it: one crystal says switch drift correction off
   and pay nothing, an adaptive playback endpoint says leave it on and pay a
   resampler. 🔌 §10 item 4.
2. **What the eight knobs send by default.** §4.12. Every CC number in §7's
   mapping is an assignment the device holds and neither manual prints.
   🔌 §9 item 1.
3. **Whether the pitch bend wheel is really 14 bit on the wire.** It decides
   whether this rig has a T6 gesture at all. 🔌 §9 item 4.
4. **Whether an inbound NRPN is needed.** Only if a knob is or will be assigned
   134 or 135. Measure the defaults first; it may be a gap nobody stands in.
   ⚠️ And `createNrpn()` in `demo/shell/midi-decode.mjs` now decodes one, §7.1,
   so what is open is binding it to a widget through `cc-adapter.mjs` and
   whether the keyboard's own byte order matches what that parser expects.

**Cheap once somebody presses something:**

5. The default button assignments, and momentary against latching per button.
6. The note number the keys start on, and which channel they are on.
7. What Snap Shot actually emits, and whether it is a complete state push a page
   could use to initialise a layout.
8. The memory dump's SysEx format, length and manufacturer id.
9. Whether Chrome's Web MIDI port names for these two match the CoreMIDI names
   in §3 and §4.1.

**Would need a change to shared code:**

10. `demo/shell/midi.mjs:57` asks for `{ sysex: false }`. Everything involving a
    memory dump, a Device Inquiry or the keyboard's GM SysEx assignments needs
    `{ sysex: true }`, which Chrome gates as a separate and stickier permission.
    ⚠️ That is a shared kit module, so by CLAUDE.md's fan-out rule it is done
    once, by one agent, before any page agent starts.

**Not open, recorded so it is not re-opened:**

11. Whether the Fast Track Pro can do 24 bit or 96 kHz on this machine. **No.**
    §2.5, and the reason is a USB configuration macOS will not select and would
    not be able to parse if it did.
12. Whether an M-Audio driver would help. **There is none**, the product page
    404s, the downloads page does not mention the device, and a leftover old
    driver is the documented cause of this device failing rather than working.
13. Whether Enigma runs. **No**, §4.11, and the plan does not need it.

---

## 9. What to point `/dump/` at, ordered by uncertainty resolved per minute

🔴 **`demo/dump/index.html` WAS NOT OPENED, READ OR EDITED.** This is a list of
observations, not a specification of that page.

⚠️ **READ THE KEYBOARD'S OWN LCD AT THE SAME TIME AS THE SCREEN.** §4.3: the
MK-425C displays the assigned controller number of whatever you last moved. That
is a **second independent source** for every number in items 1 to 5, and
CLAUDE.md's MIM corpus lesson is that two readings derived from one source agree
while being wrong. Two sources that can disagree is the whole point.

### The MK-425C, where almost everything is unknown

**1. Turn each of the eight knobs in turn, a little, one at a time.**
Settles: the default CC number and the channel of all eight. **This is the
single largest hole in the plan** and neither manual prints any of it. Eight
numbers in about thirty seconds. Everything in §7's knob row is conditional on
it.

**2. Press each of the ten buttons, and hold one of them for a second.**
Settles three questions at once: is a button a CC, a note or a program change
out of the box; is it momentary or latching, which §4.4 shows is a device
setting rather than a page decision; and does releasing it send anything.
`plans/plan-device-layouts.md` T7's entire distinction, measured rather than assumed.

**3. Press one key softly and one key hard, then press `OCTAVE +` and press the
same key again.**
Settles: the channel the keys are on, the note number at the default octave,
that velocity is real and has range, and how far an octave press moves the note
number. Four facts, three presses.

**4. Push the pitch bend wheel to both extremes and let it spring back.**
Settles §8.3 item 3: is it a 14 bit pitch bend message or a 7 bit one, and does
it return to exactly 8192 or land near it. This is the rig's only 14 bit musical
gesture and 📁 `cc-adapter.mjs` already claims to handle pitch bend, so this is
also a test of existing code.

**5. Move the modulation wheel, then press and release the sustain pedal if one
is attached.**
Settles: CC 1 and its channel, the pedal's default CC and its polarity, which
§4.5 warns is sensed at power up and can be inverted for a whole session with
nothing on screen to say so.

**6. Press `+` and `-` together, which is Snap Shot.**
Settles: what a bulk state push looks like. 📄 DOC, verbatim: *"Press the +/-
buttons (4) together to send a SNAP SHOT of the current controller assignments
and their values"*, and *"The data for an individual controller will be sent on
which ever channel that controller has been assigned to"*. **If this is a complete state push, it is the single
most useful press on the device for this project**, because it is how a layout
can be made to agree with a physical instrument without anybody touching a knob.
Count the messages, check they cover all 21 controls, and note the order.

**7. Take a memory dump: `DATA LSB` and `RECALL` together.**
Settles: the SysEx format, the manufacturer id, the packet count and the length,
none of which is documented. ⚠️ **AND DO IT BEFORE ITEM 8**, because it is the
only backup this keyboard has and §4.10 explains that changing an assignment is
immediate, silent and permanent. 🔴 Needs `requestMIDIAccess({ sysex: true })`,
which 📁 `demo/shell/midi.mjs:57` does not ask for today.

**8. Assign one knob to NRPN coarse and turn it.** `CONTROL ASSIGN` twice, type
`134`, `DATA MSB` twice and `DATA LSB` twice for the parameter number.
Settles §8.3 item 4: whether CC 99, CC 98 and CC 6 arrive in that order, in one
burst, and whether the select pair is repeated per movement or sent once.
An inbound NRPN parser cannot be written without knowing which. ⚠️ Put the knob
back afterwards, or restore the dump from item 7.

**9. Re-run the Device Inquiry from the page.**
Settles only one thing, and it is worth one press: does Web MIDI agree with the
CoreMIDI measurement in §8.1. 🔴 **Expect no reply, and show the no reply as a
row.** A blank where a row should be and a row saying no reply are the same
picture and opposite facts.

### The Fast Track Pro, where the first observation is a cable

**10. Point `/dump/` at the Fast Track Pro with nothing patched in, and expect
nothing.** It measures an empty room. It is on the list only so that the empty
result is understood as correct rather than investigated.

**11. Patch the MK-425C's DIN OUT into the Fast Track Pro's DIN IN and turn a
knob.**
🔴 **THIS IS THE HIGHEST VALUE OBSERVATION FOR THIS DEVICE AND IT SETTLES FOUR
THINGS IN ONE GESTURE.** That the Fast Track Pro really bridges DIN to USB under
Apple's class driver with nothing installed. That the MK-425C's DIN OUT really
carries its controller data by default, which 📄 DOC claims and nobody has seen.
That the two paths agree byte for byte, because the same knob is arriving on two
CoreMIDI sources at once. And that the front panel MIDI In LED lights, which is
a third channel that needs no software at all.

**12. Send anything at all to the Fast Track Pro's destination and watch the
front panel MIDI Out LED.**
Settles the one thing §8.1's measurement could not: that the bytes reach the
hardware rather than stopping in the driver. A `MIDISend` returning 0 proves the
call succeeded, not that a socket blinked.

**13. Only if a synthesiser is patched into the DIN IN: send the Device Inquiry
again.** It is a probe of the room rather than of the interface, and it is the
only interesting thing this port can be asked.

### Order

Items 1 to 5 first, because they are one minute of pressing and they convert
most of §4 from read to measured. Then 11, because a DIN cable and one knob
settle four things. Then 6, then 7, then 12. Items 8, 9, 10 and 13 last, and 8
only if 1 shows a knob already assigned to an NRPN.

---

## 10. What a person has to approve before any of this runs

Nothing here is destructive and three of the five are machine wide.

1. **Setting the Fast Track Pro's input to 44100 Hz in Audio MIDI Setup.** §2.8.
   It is the repair, it takes one click, and it is a **machine wide** setting
   that other software on this laptop may be relying on.
2. **Creating an Aggregate Device**, if one is wanted at all. §2.7 argues a
   browser does not need one. An Aggregate Device appears in every application's
   device list from the moment it exists.
3. **Plugging a DIN cable from the MK-425C's MIDI OUT to the Fast Track Pro's
   MIDI IN.** §9 item 11. A cable is needed and it is not in the box: 📄 DOC,
   the MK-425C's manual says the DIN plug is *"not included"*.
4. **The drift test, if §8.3 item 1 is to be settled.** An audio cable from
   Fast Track Pro Output 1 to Input 1, both halves at 44100, a long recording,
   and a count of how far the returned samples slip against the sent ones. Ten
   minutes of wall clock and nobody has to watch it.
5. **Changing any assignment on the MK-425C.** §4.10: it is immediate, silent,
   permanent and indistinguishable from the factory state afterwards. **Take the
   memory dump first.**

**And three things that must NOT happen:**

- 🔴 **Do not install an M-Audio driver.** §2.6. The working state is the state
  with nothing installed, and a leftover driver is the documented cause of this
  device failing.
- 🔴 **Do not try to force USB configuration 2.** §2.5. It requires seizing the
  device away from the audio driver, and what is in there is not class compliant
  anyway.
- 🔴 **Do not put an MK-425C layout in `.pos-controls`.** 📁 REPO,
  `plans/plan-device-layouts.md` §5.4: `demo/verify.mjs` presses every
  `.pos-controls button` on every run, dozens of times a day.

---

## Sources

**Measured on this machine, 2026-09-20, with the command that produced each:**

- USB descriptors, interface classes, configuration counts and power
  allocations: `ioreg -c IOUSBHostDevice -w0 -r -l`, parsed.
  ⚠️ `system_profiler SPUSBDataType` returns nothing and exits 0 on this
  machine, which `research/measured-devices-2026-09-20.md` records; `ioreg` is the second
  opinion that works.
- CoreAudio device properties, available rates, stream formats, latency, safety
  offset, clock domain and related devices: `AudioObjectGetPropertyData` through
  Python `ctypes` against
  `/System/Library/Frameworks/CoreAudio.framework/CoreAudio`.
- CoreMIDI devices, entities, endpoints, names, manufacturers, drivers, unique
  ids and offline flags: `MIDIGetNumberOfDevices`, `MIDIDeviceGetEntity`,
  `MIDIObjectGetStringProperty` through JavaScript for Automation.
- MIDI Device Inquiry send and listen: `MIDIClientCreate`,
  `MIDIInputPortCreate`, `MIDIPortConnectSource`, `MIDISend` through `ctypes`.
- `m-audio.com/fast-track-pro` answers **404** and
  `m-audio.com/support/downloads` answers **200** with no occurrence of the
  product name, both via `curl` with a browser user agent.
- `www.evolution.co.uk` has **no DNS record**.

**Manufacturer documents, read in full. Both were live and neither is on the
manufacturer's own site, because neither manufacturer's site carries them any
more.**

- Evolution MK-425C / MK-449C / MK-461C **Getting Started**, hosted by
  synthmanuals.com, **live, 200, 4.4 MB**
  <https://www.synthmanuals.com/manuals/m-audio/evolution_mk461c/quick_start_guide/evo_mk425-49-61c_gttgstartd.pdf>
- Evolution MK-425C / MK-449C / MK-461C **Advanced User Guide**, 29 pages,
  hosted by synthmanuals.com, **live, 200, 6.9 MB**. The source for §4.3, §4.4,
  §4.6, §4.8, §4.9 and §4.10.
  <https://www.synthmanuals.com/manuals/m-audio/mk-425c/advanced_user_guide/evo_mk425-49-61c_adv.pdf>
- M-Audio **Evolution MK-425C/449C/461C User Guide**, the 2006 M-Audio reprint
  of the same material, **live, 200**
  <https://synthmanuals.com/manuals/m-audio/evolution_mk425/user_guide/060123_4series_ug_en01.pdf>
- **M-Audio Fast Track Pro User Guide**, the Avid-era revision, 17 pages, hosted
  by Lewis and Clark College, **live, 200, 931 KB**. The source for §2.6's
  configuration table and §3's panel items.
  <https://www.lclark.edu/live/files/14551-m-audio-fast-track-pro-manual>
  ⚠️ Hosted by a university rather than by M-Audio, because
  `m-audio.com/fast-track-pro` is a 404 and the live downloads page does not
  list the product.
- `manuals.plus`'s copy of the same Fast Track Pro guide answers **403 to an
  automated fetch** and was not used.

**Source code, read directly:**

- Linux kernel `sound/usb/quirks.c`, the whole of §2.5.
  <https://raw.githubusercontent.com/torvalds/linux/master/sound/usb/quirks.c>

**Third party, weaker, and marked 🌐 wherever used:**

- Reports of the Fast Track Pro on Apple Silicon working with no driver after
  changing the rate from 48000 to 44100, and of the last driver release being
  around 2012.
- The zZounds product listing's claim that class compliant operation is
  *"up to 16-bit/48kHz 2 x 4"*, which is the only published statement found that
  gives the same channel counts the measurement gives.
  <https://www.zzounds.com/item--MDOFTRACKPRO>
- Enigma's supported device list, which includes the MK-425C.

**Internet Archive, used once:**

- `EnigmaOSX1.2.2`, the only surviving copy of the Mac editor found, one
  `Enigma_OSX_1.2.2.dmg` of 8,653,311 bytes added 2016-08-07, alongside scanned
  Evolution UC-33e manuals. Read through the archive's metadata API rather than
  downloaded.
  <https://archive.org/details/EnigmaOSX1.2.2>

**This repository, read directly:**

- `demo/shell/midi.mjs`, `demo/shell/cc-adapter.mjs`, `demo/shell/board.mjs`,
  `demo/shell/keyboard.mjs`, `demo/able/index.html`, `demo/grains/index.html`
- `research/measured-devices-2026-09-20.md`, `plans/plan-circuit-model12.md`,
  `plans/plan-device-layouts.md`, `CLAUDE.md`
