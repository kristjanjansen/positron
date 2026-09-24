# Capturing the Circuit through the Fast Track Pro, measured

> **The ask**, 2026-09-21: *"reseach how to use fastreack pro to capture circuit
> output (i have mono cable r -> r conntected)"*, then four corrections from the
> desk while it was being measured: *"i do not use ch2"*, *"moved l to l"*,
> *"l to 1 actually"*, *"its left pysically on card"*, and finally *"circuit
> outout and fastrack input gain both max, measure"*.
>
> **Every number below was measured on this machine on 2026-09-21**, with the
> Circuit playing into the interface and the command that produced it printed
> beside it. Nothing here is read out of a manual. What IS read out of a manual
> is marked 📄, and there are three of those.

---

## 1. The answer, in one command

The interface presents its capture half to macOS as its own audio device called
`FastTrack Pro`, and the Circuit arrives on **capture channel 1**. So:

```sh
IDX=$(ffmpeg -f avfoundation -list_devices true -i "" 2>&1 \
      | awk '/audio devices/{a=1} a' | grep -oE '\[[0-9]+\] FastTrack Pro' | grep -oE '[0-9]+' | head -1)
ffmpeg -f avfoundation -i ":$IDX" -t 30 -af "pan=mono|c0=c0" -c:a pcm_s16le circuit.wav
```

🔴 **THE INDEX IS RESOLVED BY NAME EVERY TIME AND IS NEVER REMEMBERED.** It was
`1` while this was written and it is a position in a list that changes whenever
anything else is plugged in or out. This project has already paid for that once:
`rig/m1/README.md` had `-i ":0"` meaning the microphone, and the same string
later meant BlackHole, and both read **-91.0 dB**. One reading proves the
capture is deaf and the other proves nothing is playing, which are two opposite
conclusions from one number.

🔴 **`pan=mono|c0=c0` TAKES CHANNEL 1 AND DROPS CHANNEL 2, AND DROPPING IT IS
THE POINT.** Nothing is patched into input 2, its gain is up, and it was
measured carrying its own noise at **-17.0 dBFS peak**. Recording the pair would
put that in a file beside the music for no reason.

---

## 2. What the device is, measured

```
$ system_profiler SPAudioDataType
FastTrack Pro:  Output Channels: 4   Current SampleRate: 44100
FastTrack Pro:  Input Channels: 2    Current SampleRate: 48000
```

🔴 **IT IS TWO CoreAudio DEVICES, NOT ONE**, and only one of them matters here.
`plans/plan-fasttrack-mk425c.md` §2.2 measured why: the box presents three
separate USB AudioStreaming interfaces, macOS grouped the two playback ones as
`…:2,3` and left the capture one as `…:4` on its own. The capture half offers a
**continuous 8000 to 48000 range** and is sitting at 48000.

🔴 **SO FOR CAPTURE THERE IS NOTHING TO SET.** That plan's §2.8 instruction, which is to
set the input to 44100 in Audio MIDI Setup, exists to make the two halves agree
for an application that wants one duplex device. **A recorder does not.** Record
at the rate the input is already at, which is what the command above does by
saying nothing about a rate. Asking ffmpeg for a different one buys a resampler
and no facts.

📄 **AND IT IS 16 BIT, WHICH IS THE ONE REAL COST.** Every physical format on
every stream of both halves is 16 bit linear PCM; not one 24 bit format is
offered, because macOS bound USB configuration 1 and the 24 bit paths are in the
configuration it did not bind. Measured in that plan, §2.3 and §2.5.

---

## 3. The capture is alive, and that was established before anything was
   concluded from a silence

```
$ ffmpeg -f avfoundation -i ":1" -t 3 -af astats -f null -
Stream #0:0: Audio: pcm_f32le, 48000 Hz, stereo
ch1  peak -52.1 dBFS   rms -68.9 dBFS
ch2  peak -57.8 dBFS   rms -72.9 dBFS
```

🔴 **A NOISE FLOOR IS THE PROOF, AND DIGITAL ZERO WOULD HAVE BEEN THE
DISPROOF.** A capture that macOS has refused microphone permission to delivers
**exact zeros**, which `astats` reports as `-inf`. A real converter with a cable
in it never does: it has a floor. So `-52 dBFS` is the reading that says *the
permission is granted, the ADC is running, and nothing is playing*. Those are three facts
that a single number can only carry because the alternative reading is
arithmetically impossible.

⚠️ **THIS IS THE DEAFNESS TRAP AND IT IS WHY THE FLOOR WAS MEASURED FIRST.**
Every conclusion further down rests on the capture not being deaf, and "the
Circuit is silent" and "this recorder hears nothing" look identical from the
outside.

---

## 4. Which channel the Circuit is on, and the cable

The patch changed twice while this was being measured, which is worth keeping
because it is what the measurement is for.

| patch | ch1 peak | ch2 peak | reading |
|---|---|---|---|
| `r -> r`, as first described | **0.0 dBFS** | -65.7 | a hot signal on **1**, nothing on 2 |
| `l -> l`, after the cable moved | -6.0 | -18.6 | still **1**, and no longer pinned |
| both gains at maximum | -1.7 | -17.0 | still **1** |

🔴 **THE SIGNAL WAS NEVER ON CHANNEL 2, UNDER EITHER DESCRIPTION OF THE CABLE.**
Settled from the desk rather than from the audio: *"i do not use ch2"*, then
*"its left pysically on card"*. The cable runs from the Circuit's **left**
output to the interface's **input 1**, which is the physically left input on the
box, and capture channel 1 is that input.

🔴 **AND CHANNEL 2 IS NOT BLEED FROM CHANNEL 1. MEASURED RATHER THAN ASSUMED**,
over 9.46 s with both gains at maximum: the **correlation between the two
captured channels is +0.030**. Crosstalk from a signal 15 dB louder would
correlate; this does not. It is an unconnected input with its own gain turned
up, listening to itself.

⚠️ **SO THE RIGHT CHANNEL OF THE CIRCUIT IS NOT BEING RECORDED AT ALL**, and a
mono file of the left output is what this rig produces today. That is a
statement about the cable, not a fault.

---

## 5. Headroom with both gains at maximum, which is what was asked

```
$ 9.46 s, Circuit playing, Circuit output volume at max, interface input gain at max
ch1  peak -1.69 dBFS (sample 26986 of 32768)   rms -23.29 dBFS
     clipped samples 0     samples within 1 dB of full scale 0
ch2  peak -17.00 dBFS                           rms -31.39 dBFS
     clipped samples 0
```

🟢 **IT DOES NOT CLIP. NOT ONE SAMPLE IN 454,144.** Both controls at their stops
peaks **1.7 dB below full scale** on the material that was playing.

⚠️ **AND 1.7 dB IS NOT A SAFETY MARGIN, IT IS THE LEFTOVER FROM ONE PATTERN.** A
peak is a fact about what was playing, not about the instrument: a denser
pattern, a different patch, or a drum landing on the same beat as a synth all
add. An earlier take through the same chain measured **-0.03 dBFS**, which is
one sample away from the ceiling. **Turning the interface gain down 4 to 6 dB
costs nothing**: the noise floor is 68 dB below the signal, so there is nothing
down there to expose, and 16 bit has room for it.

🔴 **A CLIP COUNT IS THE MEASUREMENT, NOT A PEAK READING.** A peak of exactly
`0.0 dBFS` says a sample touched the rail and says nothing about how many did.
The script counts samples at ±32767/32768, which is the quantity that decides
whether a recording is damaged.

---

## 6. Three things that are NOT the answer, and why

- **The Circuit has no USB audio.** 📄 Its user guide, quoted in
  `plans/plan-circuit-model12.md` §3.10, and corroborated on this machine:
  `research/measured-devices-2026-09-20.md` lists the Circuit as **MIDI only over USB**.
  There is no route that avoids a cable and a converter.
- **The Model 12 would be a better converter and is already here.** 24 bit,
  48 kHz, 12 in and 10 out, one duplex CoreAudio device, against 16 bit, 2 in.
  `plans/plan-fasttrack-mk425c.md` §6.1 reaches the same verdict about this
  interface's audio in general. Using the Fast Track Pro is a decision about
  which box has the free input, not about which is better.
- **`-f avfoundation -i ":0"` is not a shortcut.** See §1.

---

## 7. Can a Raspberry Pi drive it on bus power

> Asked mid-measurement: *"can pi drive fastrackpro on bus power"*, then
> *"usb hub is powered.."*.

🟢 **YES, AND WITH A POWERED HUB THE QUESTION DOES NOT ARISE AT ALL.**

🔴 **MEASURED: THE DEVICE IS GRANTED 200 mA.** `UsbPowerSinkAllocation` off
`ioreg`, recorded in `plans/plan-fasttrack-mk425c.md` §5, consistent with a
`bMaxPower` of `0x64` in USB's 2 mA units. That is **two fifths of what a single
USB port is obliged to supply**, and the board here is a **Pi 4** (`rig/board/`
throughout), whose four ports share about 1.2 A with an adequate supply. It fits
with either arrangement.

✅ **AND A SELF POWERED HUB TAKES IT OFF THE PI ENTIRELY.** The device draws its
200 mA from the hub's own supply, not through the Pi. On this desk the whole
chain is already doing exactly that: the Fast Track Pro, the Circuit and the
MK-425C hang off a hub reporting **2200 mA** of supply, and have through every
measurement in that plan.

📄 **The 9V 500 mA socket on the back is not needed for this.** Its stated
purpose is running the box as a stand alone converter with no computer attached.

🔴 **WHAT IS NOT SETTLED IS NOT POWER, AND IT IS WORTH SAYING BEFORE SOMEBODY
CARRIES THE BOX ACROSS THE BUILDING:**

1. **Linux enumerates this device differently from macOS, on purpose.** The
   device declares `bNumConfigurations = 2`; macOS bound configuration 1; the
   Linux kernel contains a function whose whole job is to throw configuration 1
   away and take configuration 2, logging *"Fast Track Pro switching to config
   #2"* while doing it (`plans/plan-fasttrack-mk425c.md` §2.5). **So none of the
   CoreAudio readings above transfer.** Channel counts, the 16 bit limit and the
   two-device split are macOS facts.
2. **It is a full speed device, 12 Mbit/s**, and on the Pi it would be sharing a
   root hub with whatever else is plugged in.
3. **The board already runs one jackd and one capture**, and a second audio
   interface is a decision about that graph rather than about a socket.

🔌 **The measurement that settles all three takes ten minutes**: plug it into the
board through the powered hub, read `dmesg | grep -i "fast track"`, then
`arecord -l` and `arecord -D hw:CARD --dump-hw-params`. Until somebody does
that, item 1 means this section answers the power question and nothing else.

---

## 8. What is still open

- **The right channel of the Circuit is not recorded.** One more cable and a
  `pan=stereo|c0=c0|c1=c1` makes it a stereo capture. Nobody has asked for one.
- **The input is at 48000 and the output half can only ever be 44100.** It costs
  nothing for a recorder and it is a real constraint for anything that wants to
  play back through the same box at the same time.
- **Nothing in this repo captures this device yet.** These are shell commands. A
  page that recorded the Circuit would go through `getUserMedia` with the
  interface as its input device, and `plans/plan-fasttrack-mk425c.md` §2.7 has
  the one trap waiting there: an `AudioContext` built with an explicit
  `sampleRate` reports the rate it was ASKED for, so the guard in
  `demo/shell/board.mjs` comparing those two numbers cannot fail. **Read the
  hardware's rate, not the page's.**
