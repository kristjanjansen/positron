# pi-drum-machines: what runs a drum machine on a Raspberry Pi, and whether this rig wants one

> **The ask, verbatim, 2026-09-21:** *"in bg research drum ,achines / samplers of
> pi"*, *"for pi"*.
>
> ⚖️ **MARKS.** 📄 read from documentation or from this repository's own source,
> with the file and line. 🌐 from a project page, a vendor page or a forum.
> ⚖️ my reading, not checked. ✅ measured on this machine or on this board and
> recorded here. 🔌 an experiment nobody has run.
>
> 🔴 **NOTHING WAS BUILT, DEPLOYED, INSTALLED OR COMMITTED.** No ssh to the
> board, no verb sent to `studio-1`, no package installed, no file in `rig/`
> touched. Every number about this rig below is read out of the repository or
> quoted from a measurement already in it.

---

## 0 · The answer in one line

🔴 **Running a drum machine ON the Pi buys exactly one thing that `/tom/` in a
browser cannot do, which is that everybody in the `studio-1` room hears it and
it keeps playing after the tab closes. It costs the ability to play it with your
hands, because the floor on this rig is roughly 160 to 220 ms of press to sound
against a browser's 10 to 25 ms. So: keep the grid and the playing in the
browser, and if the room matters, send `/tom/`'s STEP EVENTS to the board and
let it play the same pack as a second speaker.**

⚠️ **AND THE FIRST FACT THAT DECIDES IT IS ONE NOBODY HAS WRITTEN DOWN YET:
THIS BOARD HAS NO SOUNDCARD IN ITS AUDIO PATH.** 📄 `rig/board/jacksynth.mjs:631`
starts `jackd -r -d dummy -r 48000 -p 1024`. The DUMMY backend. The instrument
plays into a graph with no hardware on the other side of it, `ffmpeg -f jack`
captures it and the bytes leave over the relay. **The Pi is not "the thing
making sound" in any sense a person standing next to it could hear.** It is a
renderer whose only output is a WebSocket.

---

## 1 · What this rig actually is, and three claims in the brief that have moved

### 1.1 The board

| | | source |
|---|---|---|
| model | ⚖️ **a Raspberry Pi 4** | inferred from three independent traces, see below |
| JACK | `jackd -r -d dummy -r 48000 -p 1024` | 📄 `rig/board/jacksynth.mjs:631` |
| JACK block | **1024 frames at 48 kHz = 21.33 ms** | 📄 arithmetic on the line above |
| audio out | **none.** ffmpeg captures the JACK graph and the board ships frames | 📄 `jacksynth.mjs:719` |
| capture | `ffmpeg -f jack -i posboard -f s16le -ar 48000 -ac 1 -` | 📄 `jacksynth.mjs:719` |
| framing | `RATE = 48000, FRAME = 960`, so **20 ms mono frames, 50 a second** | 📄 `jacksynth.mjs:19` |
| instruments up | Yoshimi, and scsynth running the Pappus granular engine | 📄 `jacksynth.mjs` `JACK_SYNTHS` |
| already installed | jackd2 1.9.22, yoshimi 2.3.3.3, **supercollider 3.13.0**, sc3-plugins, **csound 6.18.1**, ffmpeg 7.1.5, alsa-utils, v4l-utils, node 24 | 📄 `rig/board/packages.txt` |
| service | `/opt/positron-board`, `Restart=always`, dials out, nothing listens | 📄 `positron-board.service` |

🔴 **"PI 4" IS AN INFERENCE AND IS MARKED AS ONE, BECAUSE NOTHING IN THIS
REPOSITORY EVER PRINTS THE MODEL STRING.** Three traces point the same way and
none of them is the model:

- ✅ `Engine_Pappus` reads the device tree and builds LITE on a Pi 3 and FULL on
  a Pi 4 or newer. Confirmed at runtime: `lite mode: false`
  (📄 `rig/board/norns/README.md`).
- ✅ `rig/vis` measures the **BCM2711 V3D** and encodes through `/dev/video11`,
  the hardware H.264 block. 🌐 Broadcom removed that block from BCM2712, so a Pi
  5 could not run what this board runs (📄 `rig/vis/README.md:71`).
- ✅ `rig/board/README.md:167`: *"Measured on the Pi 4's A72: 8 voices at 6.8x
  realtime, 15% of one core."*

🔌 **ONE COMMAND SETTLES IT AND IT IS FREE:**
`ssh positron@<ip> cat /proc/device-tree/model`. Worth doing before anybody buys
a HAT, because a Pi 4 HAT and a Pi 5 HAT are not the same part.

⚠️ **A PI 4 DOES HAVE A 3.5 MM JACK ON THE BOARD, SO THERE MAY BE A PHYSICAL
OUTPUT.** Nothing in `rig/` ever routes audio to it, and 🌐 the linuxaudio wiki
calls the onboard output *"11 bits only"*, prone to *"clicks and pops"*, and
*"not really suited for real-time, low-latency audio processing"*. Treat it as
absent.

### 1.2 The three claims in the brief that have moved

🔴 **`/keys/` IS RETIRED.** The brief says *"`demo/keys/` and `demo/knobs/` are
the two pages that play it"*. `demo/keys/` does not exist. It was retired
2026-09-17 to `archive/keys/listen.html`, and `demo/shell/board.mjs`'s own header
says so in capitals at line 3. ✅ Measured today: **exactly one page imports
`shell/board.mjs`, and it is `/knobs/`**.

⚠️ **AND THE BOARD IS PLAYED BY TWO PAGES, NOT ONE.** ✅ `grep -l studio-1
demo/*/index.html` answers four: `/knobs/` (through `board.mjs`), `/grains/`
(its own hand rolled socket and its own `pcm-playout`, never moved onto the kit
module), `/mirror/` (the picture, not the sound) and `/kit/` (the gallery, wired
to nothing).

⚠️ **THE TWO CUSHIONS ARE NOT TWO PAGES' CUSHIONS.** 100 ms is `board.mjs`'s
DEFAULT (📄 `board.mjs:80`) and was `/keys/`'s. 160 ms is `/knobs/`'s override
(📄 `knobs/index.html:412`). The reason is recorded and it is a good one, quoted
in §2.2.

---

## 2 · The latency arithmetic on the path that already exists

### 2.1 Every stage, named, with what is measured and what is not

```
a press in a tab
  -> WebSocket to the Cloudflare edge          ~21 to 35 ms one way   ✅ §2.3
  -> Durable Object hop                        1 to 2 ms p50          ✅
  -> board reads JSON, calls the instrument    unmeasured             ⚖️
  -> jackd dummy, 1024 frames                  21.33 ms               📄
  -> ffmpeg -f jack, its own buffer            UNMEASURED             ⚖️
  -> node cuts 960-sample frames               20 ms of granularity   📄
  -> relay back                                same again             ✅
  -> pcm-playout cushion                       100 ms, 160 on /knobs/ 📄
  = sound
```

⚖️ **SO ROUGHLY 160 TO 220 ms, AND THAT IS A SUM OF PARTS RATHER THAN A
MEASUREMENT.** The two terms nobody has ever put a number on are ffmpeg's own
JACK capture buffer and the board's own handling time, and both are on the
inside of the sum.

### 2.2 The cushion, and why it is what it is

✅ **MEASURED 2026-09-16, off this relay, with a node client and no browser in
the way:** 992 frames in 20 s, **nothing lost**, mean gap **exactly 20.0 ms**,
p90 **29.5**, p99 **43.5**, worst single gap **83.6 ms**
(📄 `demo/shell/board.mjs:336`, `demo/knobs/index.html:398`).

The 160 came from a report while somebody was listening: *"some vobbly sound,
cutoffs, not nice"*, with a log full of `ran dry` and `trimmed`. 🔴 **Nothing was
being lost on the wire.** The frames all arrived, some of them in lumps, so it
is a cushion decision rather than a network one. A 100 ms cushion has 16 ms left
after an 83.6 ms lump.

⚠️ **A CUSHION HAS NO RESTORING FORCE**, so the floor ratchets up when it is
proved too small and never comes back down on its own.

### 2.3 The number `/knobs/` shows is NOT press to sound, and this matters

🔴 **`/knobs/`'s `round trip` cell is a browser to relay EDGE echo with the
Durable Object never woken and the board not in the room at all.**
📄 `demo/knobs/index.html:542`: *"the runtime answers `ping` with `pong` for free
out of its hibernation autoresponse"*. The page's own comment quotes **about
45 ms** for it.

✅ Separately measured 2026-09-14 (PROGRESS.md): relay round trip **42 to 44 ms**
for two peers on one Pi, **64 to 69 ms** Mac to Pi. Those are three different
quantities and the only reason to hold all three is that none of them is the one
a drummer feels.

🔴 **PRESS TO SOUND THROUGH THIS BOARD HAS NEVER BEEN REPORTED AS A NUMBER IN
THIS REPOSITORY.** `/keys/` had the cell that did it properly, timed in-tab from
the key press to the first sound that press produced plus the cushion still in
front of it, with both stamps from one `performance.now()` so there is no clock
offset in it (📄 `archive/keys/listen.html:141`). That page is retired. The
`lag` cell went with it and `/knobs/` never had one.

🔌 **THE EXPERIMENT THAT WOULD SETTLE IT IS SMALL AND HAS NOT BEEN RUN:** put
`/keys/`'s `lag` cell on `/knobs/`, press one key, read the number. It needs no
new hardware and touches the board exactly once.

### 2.4 What `/tom/` costs by comparison

📄 `/tom/` starts a `BufferSource` with no `when`, at the moment its scheduler
calls. There is no network and no cushion. The only latency is the browser's own
output latency plus the scheduler's lateness.

✅ **THE ONE RECORDED NUMBER IS 22.6 ms LATE**, reported 2026-09-21 as *"lot of
late. when i put pads in and then get samples, not good timing"*. 🔴 **And the
cause was not the scheduler.** `fire()` decoded a row's WAV the first time that
row sounded, so the first hit of every sample paid `toMono` plus `createBuffer`
plus `copyToChannel` inside the window the readout measures. All 64 are decoded
on pack open now (📄 `demo/tom/index.html:1395`).

⚖️ **NOBODY HAS RE-MEASURED `late` SINCE THAT FIX**, and the page's own comment
prices the remaining timer-versus-sample-accurate error at *"single digit
milliseconds"* without measuring it. ⚠️ `createAudioLane` is deliberately not
used and the reason is read off the source rather than measured: a node's
`onended` moves an event to `rendered`, `rendered` is terminal, and a step grid
that cannot loop is not a step grid.

🔌 **THE SECOND SMALL EXPERIMENT: open `/tom/`, run a pattern, read `late`.**
That is the browser side of the comparison and it costs one visit.

---

## 3 · Software that makes a Pi a drum machine or a sampler

Ordered by what it would cost THIS board, which is the only ordering that means
anything here.

### 3.1 Already installed, zero new packages

| | what it IS underneath | licence |
|---|---|---|
| **SuperCollider** 3.13 + sc3-plugins | 📄 on the board today, running Pappus. **A sampler is `Buffer.read` plus a `PlayBuf` SynthDef.** Sixty four buffers of 48 kHz mono is 5.1 MB of RAM | GPLv3 |
| **Csound** 6.18 | 📄 on the board. ✅ Renders to a pipe at about **150x realtime** and is byte exact, but its realtime mode wants a real device. `timeline/csound.mjs` already compiles this project's scores to it | LGPL |
| **ALSA sequencer** | 📄 `aconnect` is already the patchbay. Anything that registers a sequencer client is patchable with no special case | |

🔴 **THIS IS THE FINDING THAT MATTERS MOST IN THIS SECTION.** A sample player on
this board is not a project. It is a SynthDef, a `Buffer.allocRead`, and a verb.
`rig/board/norns/CroneEngine.sc` already proves an engine compiles here, and
`source.set` already proves the shape of a browser sending a SPEC and the board
building the sound and CONFIRMING it holds it (📄 `rig/board/board.mjs:1048`,
which waits for `/s_get` and compares the values rather than trusting `ok`).

⚠️ **AND SUPERCOLLIDER'S OWN CEILING IS ALREADY CHARTED HERE, WHICH IS WORTH
MORE THAN THE FEATURE LIST.** ✅ scsynth has a fixed pool of audio interconnect
buffers; the board runs `-w 128`; a first attempt at `PosSource.sc` was 1,151
UGens and was refused at 64 **and** at 128 with the only visible symptom being
silence. Rewritten as a wavetable it was 104 UGens for the same sound. A drum
machine is 8 to 16 `PlayBuf`s and is nowhere near that, ⚖️ but the failure mode
is silence and that is the thing to remember.

### 3.2 One apt install away, on arm64 Debian

| | what it IS underneath | licence | notes |
|---|---|---|---|
| **Hydrogen** + `h2cli` | a real drum machine with a pattern and song model, drumkits, JACK and ALSA out. 🌐 `h2cli` is the same core with no GUI | GPLv2 | 🌐 packaged for aarch64. ⚖️ `h2cli` is documented for batch export and drumkit management; whether it can be driven as a LIVE headless sequencer is not something I could confirm from its man page |
| **Pure Data** `pd -nogui -alsa` | patchable DSP. 🌐 It is the entire sound engine of the Critter & Guitari Organelle | BSD-like | the most direct route to "a drum machine somebody else wrote" |
| **sfizz** / **LinuxSampler** / **FluidSynth** | SFZ, GIG and SF2 rompler engines, each an ALSA seq client | BSD-2 / GPLv2 / LGPL | 🔴 **FluidSynth was deliberately REMOVED from this board 2026-09-16** and the reason was the shared graph, not the code. `archive/box-fluidsynth-hexter/` |
| **MilkyTracker**, **Schism Tracker** | XM and IT trackers, tiny, their own UI | GPL | needs a screen on the board, which there is not |
| **Orca** | a livecoding sequencer that emits MIDI and OSC. It sequences and makes no sound | MIT | ⚖️ the interesting half for this rig: it is a pattern source, and this board already speaks OSC to sclang on 57120 |

### 3.3 Free or paid downloads, not in apt

| | what it IS | licence |
|---|---|---|
| **SunVox** | 🌐 a tracker, modular synth and **multisample sampler** in one, with an official `linux_arm` build in the zip. Runs on a Pi | closed source, **free on desktop and Pi**, paid on iOS and Android |
| **Renoise** 3.4+ | 🌐 an ARM build for Raspberry Pi shipped in 3.4 (2022), alongside M1. A tracker with a serious sampler | commercial, about 75 EUR |
| **TidalCycles + SuperDirt** | 🌐 SuperDirt **is** a sampler, written in SuperCollider, which this board already runs. 🌐 A community library of **72 drum machines** of samples exists for it | GPLv3 |

⚠️ **SUPERDIRT ON A PI IS REPORTED AS HEAVY AND THE REPORTS ARE ABOUT A PI 3.**
🌐 Tidal Club threads describe about 445 MB of memory and JACK errors on a Pi 3,
and success on a Pi 4. ⚖️ The weight is the default sample library rather than
the engine, and pointing it at 64 Circuit samples instead is a config line.

---

## 4 · Hardware built around a Pi, and what each one IS underneath

| project | the Pi in it | what it really is | community |
|---|---|---|---|
| **monome norns** / **norns shield** | 🌐 factory norns is a **Compute Module 3+**; the shield is a HAT for a **3B, 3B+ or 4B** | Linux, a **CS4270/CS4271 codec** doing the actual converting, an OLED, three buttons and three encoders. Sound is **SuperCollider** plus **softcut**, which is a live sampler and player. Scripts are Lua | the strongest of any on this list |
| **Zynthian** | 🌐 Pi 4 or 5 | a curated Debian stack: FluidSynth, LinuxSampler, **sfizz**, and **zynseq**, which is their step sequencer and is the groovebox half. `zynsampler` is newer and in development | large, its own forum |
| **Critter & Guitari Organelle M** | 🌐 a **Raspberry Pi Compute Module** | Linux plus **Pure Data**. Wooden keys, an OLED, and a built-in microphone for sampling into a patch | commercial, active patch scene |
| **SamplerBox** | 🌐 a Pi plus an I2S DAC HAT with MIDI DIN, headphone amp, display and controls on one PCB | a **Python and Cython** sampler reading folders of WAVs | 🌐 open source and open hardware, long lived |
| **LMN-3** | 🌐 a **Pi 4** plus a HyperPixel display | **Tracktion Engine** (JUCE), so a real DAW engine with synth, sequencer and sampler. A **Teensy** runs the buttons and encoders and speaks MIDI to the Pi | GitHub, `FundamentalFrequency` org |
| **OTTO** | 🌐 announced around a **Pi 3B+** | an open groovebox with synths, samplers, effects, sequencer and looper | ⚖️ I did not confirm whether it is still developed |
| **Pisound** (Blokas) + **Patchbox OS** | a HAT for any modern Pi | a proper codec plus **DIN MIDI over SPI with its own microcontroller**, and a Pi distro pre-tuned for low latency. Not an instrument, the thing you put under one | commercial, well documented |
| **Elk Audio OS** | 🌐 supports a Pi 4 with their Elk Pi HAT | a **Xenomai dual-kernel** realtime Linux. Not an instrument, a substrate | commercial |
| **MiniDexed**, **mt32-pi** | a Pi 3 or later | 🌐 **bare metal, no Linux at all**, on the **Circle** framework. MiniDexed is a DX7; mt32-pi is Munt plus FluidSynth | active, mt32-pi has a community fork after the original stopped |

🔴 **AND A WARNING ABOUT THE SEARCH TERM ITSELF.** Most of what 2026 press calls
a *"Raspberry Pi drum machine"* is an **RP2040 microcontroller** project and not
the Linux board: 🌐 the Lonesoulsurfer Acid Drip and the Wee Noise Makers PGB-1
are both RP2040. They are good instruments and **nothing in them ports to this
Pi 4 in any useful sense**. ⚠️ The same trap catches `pikocore` and most of the
Hackaday hits.

---

## 5 · The latency numbers, with their sources marked

### 5.1 On a Pi with a real soundcard, which this board does not have

| | figure | source |
|---|---|---|
| Pi 4, USB interface, 16 frames x 2 periods at 48 kHz | **about 1.8 ms**, plus about 1 ms for the interface, needing CPU affinity and no GUI. Fine at 64 frames without that effort | 🌐 LinuxMusicians forum report, one person, one machine |
| any Linux, 128 frames x 2 at 48 kHz | 2.67 ms capture, 5.33 ms playback, **about 8 ms round trip** | 🌐 the same thread, and it is arithmetic rather than a measurement |
| recommended starting point for USB on a Pi | **128 frames, 3 periods** | 🌐 linuxaudio wiki |
| onboard Pi headphone jack | *"probably can't use period settings below 256"*, *"11 bits only"*, *"not really suited for real-time, low-latency audio processing"* | 📄 linuxaudio wiki, verbatim |
| **SamplerBox, MIDI note-on to DAC output** | **8 ms**, on a **Pi 3**, with their own PCB MIDI interface and DAC, **on an oscilloscope** | 🌐 hackaday.io project log, "P. T.", 2017-05-04. Buffer settings not stated |
| Pisound MIDI loopback | **2.105 ms** | 🌐 Blokas' own documentation, vendor |
| Pisound Micro MIDI round trip, software to wire and back | **about 1.45 ms** | 🌐 Blokas, vendor |
| Elk Audio OS | *"down to 1ms round-trip latency"* | 🌐 elk.audio, **vendor marketing**, and it is a claim about the OS on their own HAT |
| Elk on a practical Pi setup | *"around 25ms"* inherent | 🌐 a thread on Elk's own forum, one user. ⚖️ almost certainly a different quantity from the 1 ms |
| MiniDexed / mt32-pi bare metal | *"super-low latency"* | 🌐 **no number found**, from the Raspberry Pi magazine article or either README |

🔴 **THE 1 ms AND THE 25 ms ARE ON THE SAME VENDOR'S OWN SITE AND THEY ARE NOT
IN CONFLICT, THEY ARE DIFFERENT MEASUREMENTS.** One is the OS scheduling a block
and the other is somebody's whole chain with a USB interface in it. **Quoting
either one as "Pi latency" is the mistake**, which is this project's own named
error about quoting a candidate-pair RTT as media latency.

### 5.2 On this board, which is the one that decides anything

| | figure | source |
|---|---|---|
| JACK block | **21.33 ms** (1024 frames at 48 kHz, dummy driver) | 📄 `jacksynth.mjs:631` |
| frame granularity out | **20 ms**, 50 a second | 📄 `jacksynth.mjs:19` |
| relay Durable Object hop | **1 to 2 ms p50** | ✅ this repo |
| relay caps | 1000 msg/s, 2000 burst, **8 MiB/s per socket**, **1000 KiB per message**, 128 sockets | 📄 `workers/relay/src/index.js:77` |
| frame arrival off the relay | mean gap 20.0 ms, p90 29.5, p99 43.5, **worst 83.6 ms**, nothing lost | ✅ 2026-09-16, node client |
| playout cushion | 100 ms default, **160 on `/knobs/`**, adaptive to 250 and 400 | 📄 `board.mjs:80`, `knobs:412` |
| Pi 4 A72 CPU, 8 voices of per-sample JS synthesis | **6.8x realtime, 15% of one core** | ✅ `rig/board/README.md:167` |
| Pappus on this board | FULL graph: two granulators, 48 resonators | ✅ runtime, `lite mode: false` |
| **press to sound through the board** | **never measured** | see §2.3 |

⚖️ **THE ONE SENTENCE THAT SUMMARISES 5.1 AGAINST 5.2:** every good Pi latency
number in the world is about a Pi with a converter wired to it, and this board's
21.33 ms JACK block on a dummy driver is already worse than a well configured Pi
4 with a real interface, before a single byte touches the network.

---

## 6 · Driving one from a browser over the relay this rig already has

### 6.1 The four things that are already built

- ✅ **A verb dispatch.** 📄 `rig/board/board.mjs` answers 30 verbs today
  including `note.on`, `ctl.set`, `cc`, `voice.select`, `params.set`,
  `source.set`, `audio.start`, `jack.graph`. A drum machine is a small family
  more.
- ✅ **A browser to board spec channel with a real confirmation.** `source.set`
  sends a spec, the board builds the synth, and then **waits for scsynth's
  `/s_get` and compares the values** before answering `ok`, because *"`ok` MEANS
  THE ENGINE HAS IT, not that this process sent it"*.
- ✅ **A heartbeat that carries state nobody asked for.** `board.alive` every 5 s
  already carries `fx`, `fxBy`, `fxAgoSec`, `fxHeld`, so a page learns about a
  change it did not make without polling. A pattern's state fits the same shape
  exactly.
- ✅ **A liveness sweep with no lease to leak.** `sweepInsert()` drops the
  granulator when the page that asked for it has been quiet for `INSERT_HELD_MS`
  (15 s, and the number is checked against `/grains/`'s 4 s poll rather than
  chosen). A running pattern needs the same thing and the same reasoning applies
  unchanged.

### 6.2 The three things that are not, with what each really costs

🔴 **1. GETTING THE SAMPLES THERE. THE BINARY CHANNEL IS ALREADY SPOKEN FOR.**
📄 `rig/board/board.mjs:244`: *"every page here treats an incoming binary frame
as PCM."* So a pack cannot simply be pushed down the existing socket. The
options, priced:

| route | arithmetic | verdict |
|---|---|---|
| chunk the pack over the relay | 3.5 MB compressed against a **1000 KiB** message cap and **8 MiB/s** per socket. **Four messages, about 0.5 s** | ⚖️ works, needs a chunk protocol and a reassembly check |
| base64 in JSON | 4.7 MB of text, six messages | ⚖️ same thing, 33% fatter, no new framing |
| a tagged binary frame | one byte of discriminator at the front | 🔴 changes a convention every page depends on |
| the board fetches it | the board reaches out to somebody's server | 🔴 refused by CLAUDE.md unless it is our own R2 |
| **ship a pack in `push.sh`** | 3.5 MB into `/opt/positron-board` | ✅ **cheapest by far**, and `New Pack.circuitpack` already lives in this repository |

⚠️ **AND THE BOARD WOULD NEED A BUFFER STORE**: a name per sample, a cache, a
way to say which pack is loaded, and a way to free it. That is a verb family,
not a line.

🔴 **2. A CLOCK, AND IT IS THE HARD HALF.** 📄 `plan-circuit-samples.md` §6 is
already right that *"a drum machine that invents its own clock is a drum machine
that cannot line up with anything else here"*. The board has no `timeline/`
deck. ⚖️ scsynth's own scheduler is sample accurate if steps are sent with OSC
timestamps, which is a better clock than anything in the browser, **and it is
bounded by the 21.33 ms JACK block at the output regardless**.

🔴 **3. ONE jackd, ONE CAPTURE, ONE ROOM.** 📄 `rig/board/README.md`: *"whatever
is up is what every listener on every page hears: pressing an instrument button
took the sound away from somebody in another building, mid note. It happened for
real."* FluidSynth and hexter were removed from this board for that reason and
not for any fault of their own. **A drum machine is a fourth claimant on a
resource that already has an arbitration story written in blood.**

⚠️ **THE WEDGED ENCODER IS THE ADJACENT WARNING AND IT IS ABOUT VIDEO, NOT
AUDIO.** ✅ `/dev/video11` is a single exclusive V4L2 device, and when it wedges
`SIGTERM`, `SIGKILL`, `timeout` and `modprobe -r` all fail and recovery is a
**reboot** (📄 `positron-verify`). That does not bite a sampler directly. What it
says that DOES: this board has single-instance resources with no way back except
a power cycle, and it is in another building.

---

## 7 · Licences, as footnotes

📄 `positron-is-rnd`: licences are footnotes rather than gates. So, briefly.

- **GPLv2/GPLv3**: SuperCollider, Csound (LGPL), Hydrogen, LinuxSampler,
  TidalCycles, Zynthian, norns. All fine to run; none of them is linked into
  anything this project ships.
- **Closed and free on Pi**: SunVox. **Commercial**: Renoise, Elk, Pisound,
  Organelle.
- 🔴 **The licence that would actually bite is on the SOUNDS, not the software**,
  and `plan-circuit-samples.md` §5 already covers it: *"royalty free" on a
  marketing page is not a licence you can redistribute under*, and anything that
  plays on a page a visitor opens is redistribution. That plan's own conclusion
  stands and is the cheapest answer available: **record a pack off the Model 12
  on this desk and the question disappears**.

---

## 8 · The recommendation, with its reasons

### 8.1 The direct answer to the direct question

> *given `/tom/` already sequences a Circuit pack in a browser and the Pi is the
> thing that makes sound, what would running a drum machine on the Pi actually
> buy, and what would it cost?*

**What it buys, and all five are real:**

1. 🔴 **The room hears it.** The board's capture goes to `studio-1` and every
   page in that room hears whatever is up. `/tom/` is audible in exactly one tab.
   **This is the only genuinely new capability on the list.**
2. **It survives the tab closing.** `Restart=always`, dials out on boot, and
   `sweepInsert()` already proves the board can hold and release state on its own
   heartbeat.
3. **Several people can play it.** 128 sockets on the relay, and the board is
   already the arbiter of one shared thing.
4. **It can reach real MIDI.** `aconnect` is already the patchbay, so a pattern
   on the board can clock or trigger an instrument plugged into it. A browser
   cannot do that to hardware in another building.
5. **The CPU is not the constraint.** 8 voices of per-sample JS arithmetic cost
   15% of one A72 core; `PlayBuf` is far cheaper, and the whole pack is 5.1 MB of
   RAM.

**What it costs:**

1. 🔴 **You cannot play it with your hands.** 160 to 220 ms against a browser's
   10 to 25 ms. ⚖️ Both ends of that comparison are estimates and §2 says which
   terms were never measured.
2. 🔴 **21.33 ms of JACK block is worse than the scheduler lateness that started
   this.** The complaint that produced the `late` readout was **22.6 ms**. Moving
   to the board hands you the same number back as a floor, before the network.
3. 🔴 **A fourth claimant on one jackd, one capture and one room**, on a board
   that has already taken the sound away from somebody mid note.
4. **New plumbing for the samples**, because the binary channel means PCM.
5. **Nothing on that board makes a sound anybody near it can hear.** Adding a
   drum machine to a renderer with no converter does not make it an instrument in
   a room. **It makes it a second source on a stream.**

### 8.2 So: keep it in the browser. Plainly.

🔴 **For playing, `/tom/` is not merely adequate, it is the better instrument on
this rig, and the reason is structural rather than a matter of effort.** The
browser holds the samples in the same process as the hand that presses, and the
board is 200 ms of network away with a 21 ms block at the end of it. No amount
of work on the board closes that, because most of it is the cushion, and the
cushion is what makes the stream listenable.

### 8.3 The one shape that IS worth building, if anything is

**Let `/tom/` stay the instrument and make the board a second speaker.**

- `/tom/` already decodes all 64 samples in the tab on pack open.
- It sends **step events**, not audio: 16 steps at 120 bpm is **8 messages a
  second** against a relay measured at 1000.
- The board holds the same pack in scsynth buffers (shipped once with `push.sh`)
  and plays `PlayBuf` on each event.
- The person pressing hears their own tab **now**. The room hears the board
  **200 ms later**. The delay becomes a room delay instead of a play delay, which
  is the difference between a latency and a PA system.

⚠️ **AND THAT IS THE `twins` ARCHITECTURE, ALREADY ARGUED AND ALREADY BUILT
ONCE.** The same definition running in a page and on the board, with the two
ends COMPARED rather than assumed. ✅ `/grains/` asserts *"72 sine partials here,
72 on the board"* and *"2.2 a second in this page and 2.3 on the board"*. A drum
machine's version of that assert is *"this page fired 16, the board fired 16"*,
and it is the check that would catch the whole thing being silently one lap out.

🔌 **THE ONE THING THAT WOULD HAVE TO BE MEASURED BEFORE BUILDING IT**: whether
the board's step timing, driven by messages rather than by its own clock, is
steadier than 21.33 ms. If it is not, the board should be sent a PATTERN and a
tempo and run its own clock, and the two ends should be compared on a bar
boundary rather than step by step.

### 8.4 If the goal is a Pi drum machine as an OBJECT

⚖️ **Do not build one. The shape already exists twice and both are better than
anything reachable from here in a session.**

- **norns shield** if the point is sampling and live buffer work. It is a Pi 3B,
  3B+ or 4B plus a CS4270 codec, and its sound layer is **SuperCollider and
  softcut**. 🔴 **And this repository is already most of the way in**: `rig/board/
  norns/CroneEngine.sc` is a 65 line stand-in that runs norns engines on plain
  scsynth with no Lua, no grid and no screen, proved against Pappus' 2,030 lines
  and 107 commands.
- **Zynthian** if the point is a box with knobs that hosts other people's
  engines. Pi 4 or 5, sfizz, LinuxSampler, FluidSynth, zynseq.

🔴 **AND WHICHEVER ONE, THE FIRST PURCHASE IS NOT A PROJECT, IT IS A
CONVERTER.** A USB interface or an I2S HAT, roughly 30 to 100 EUR. Without it
"running it on the Pi" can only ever mean "rendering it on the Pi and streaming
it back to the browser that asked", which is what the board does today and is
exactly the thing §8.1 prices at 200 ms.

---

## 9 · What this could not settle

Named, because a plan written from reading says which of its readings are not
facts.

1. 🔌 **The board's model.** ⚖️ Pi 4 from three traces, never read off
   `/proc/device-tree/model`.
2. 🔌 **Press to sound through the board.** Never measured end to end. `/keys/`
   had the cell and `/keys/` is retired.
3. 🔌 **`/tom/`'s `late` since the warm fix.** The 22.6 ms is a pre-fix number.
4. ⚖️ **ffmpeg's own JACK capture buffer.** An unmeasured term sitting inside
   every latency estimate in this document.
5. ⚖️ **Whether `-p 1024` on the dummy driver is necessary.** Nothing in the repo
   argues for it and a dummy driver cannot xrun against hardware. 🔌 Lowering it
   to 256 would cut 16 ms off every path and costs one line and one restart, which
   is thirteen seconds of silence for everybody in the room.
6. ⚖️ **Whether `h2cli` can be driven as a live sequencer.** Its man page
   describes batch export and drumkit management.
7. ⚖️ **Whether OTTO is still developed.** The evidence I found is its
   announcement.
8. 🌐 **Every external latency figure in §5.1 is a forum post or a vendor page.**
   Not one of them was reproduced here and none of them is about a Pi with no
   converter, which is the Pi this project has.

---

## Sources

**Measured or read in this repository, 2026-09-21:** `rig/board/jacksynth.mjs`,
`rig/board/board.mjs`, `rig/board/README.md`, `rig/board/packages.txt`,
`rig/board/norns/README.md`, `rig/vis/README.md`, `demo/shell/board.mjs`,
`demo/knobs/index.html`, `demo/tom/index.html`, `archive/keys/listen.html`,
`workers/relay/src/index.js`, `plans/plan-circuit-samples.md`,
`plans/plan-hardware.md`, `PROGRESS.md`, `.claude/skills/positron-hardware/SKILL.md`,
`.claude/skills/positron-verify/SKILL.md`.

**External, read 2026-09-21:**

- [Raspberry Pi and realtime, low-latency audio, linuxaudio wiki](https://wiki.linuxaudio.org/wiki/raspberrypi)
- [SamplerBox: 8ms, lowest latency open-source sampler/synth](https://hackaday.io/project/9825-samplerbox-1/log/59022-8ms-lowest-latency-open-source-sampler-synth)
- [SamplerBox](https://www.samplerbox.org/) and [josephernest/SamplerBox](https://github.com/josephernest/SamplerBox)
- [norns shield, monome docs](https://monome.org/docs/norns/shield/) and [monome/norns-shield](https://github.com/monome/norns-shield)
- [awesome-monome-norns](https://github.com/p3r7/awesome-monome-norns)
- [Zynthian](https://zynthian.org/) and [Zynthian engines](https://zynthian.org/engines)
- [Demystifying Zynthian, Sonicstate](https://sonicstate.com/news/2024/12/11/exactly-what-is-zynthian/)
- [Organelle M hands-on, Engadget](https://www.engadget.com/2019-07-16-organelle-m-portable-hackable-music-computer-hands-on.html)
- [LMN-3 Monorepo](https://github.com/jshbrntt/LMN-3-Monorepo) and [LMN-3 build guide](https://github.com/FundamentalFrequency/LMN-3-Build-Guide)
- [LMN-3, Hackaday](https://hackaday.com/2022/06/14/lmn-3-putting-the-op-in-open-source-synthesizers/)
- [OTTO open source groovebox, MusicTech](https://musictech.com/news/gear/new-open-source-groovebox-otto-is-inspired-by-the-op-1/)
- [Pisound, Blokas](https://blokas.io/pisound/) and [Pisound MIDI docs](https://blokas.io/pisound/docs/midi/)
- [Pisound Micro detailed specs](https://blokas.io/pisound-micro/docs/detailed-specs/)
- [Patchbox OS](https://blokas.io/patchbox-os/)
- [Elk Audio](https://www.elk.audio/) and [Elk Audio OS docs](https://elk-audio.github.io/elk-docs/html/index.html)
- [mt32-pi](https://github.com/dwhinham/mt32-pi) and the [maintained fork](https://github.com/metaneutrons/mt32-pi)
- [MiniDexed, Raspberry Pi Official Magazine](https://magazine.raspberrypi.com/articles/mini-dexed)
- [h2cli man page](https://manpages.ubuntu.com/manpages/resolute/man1/h2cli.1.html) and [Hydrogen releases](https://github.com/hydrogen-music/hydrogen/releases)
- [Hydrogen for aarch64, Arch Linux ARM](https://archlinuxarm.org/packages/aarch64/hydrogen)
- [SunVox, WarmPlace](https://warmplace.ru/soft/sunvox/) and [SunVox on Raspberry Pi](https://warmplace.ru/forum/viewtopic.php?f=16&t=4454)
- [Renoise 3.4 adds Raspberry Pi ARM support](https://www.modwiggler.com/forum/viewtopic.php?t=260919)
- [SuperDirt on Raspberry Pi 4, Tidal Club](https://club.tidalcycles.org/t/superdirt-midi-out-on-raspberry-pi-4/3890) and [a 72 drum machine library for Tidal](https://club.tidalcycles.org/t/a-huge-drum-machine-library-for-tidal-72-drum-machines/3408)
- [JACK frame and period settings for USB interfaces, LinuxMusicians](https://linuxmusicians.com/viewtopic.php?t=10707) and [help me reduce latency](https://linuxmusicians.com/viewtopic.php?t=19324)
- [Lonesoulsurfer Acid Drip, Synth Anatomy](https://synthanatomy.com/2026/06/lonesoulsurfer-acid-drip-open-source-groovebox-with-synth-and-drum-machine.html) and [Wee Noise Makers PGB-1](https://synthanatomy.com/2026/04/wee-noise-makers-pgb-1.html), both **RP2040 and not the Linux board**
