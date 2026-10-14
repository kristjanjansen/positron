# plan-sampler-pi-pico: the sampler on the Pi, on a Pico, and whether a Pico can drive the Fast Track Pro

Status (2026-10-14): partly done. The Pi half was built the same day as rig/board/scsampler.mjs and rig/board/sampler.mjs (commit "a SuperCollider sampler on the Pi"), and nothing for a Pico sampler or the Fast Track Pro exists under rig/pico/.

> Asked 2026-10-11, verbatim in `BACKLOG.md`: *"Can pi be similar sampler too?
> Pico?"*, then *"Yes to plans"*, and while this was being written: *"Can pico
> drive our soundcard?"*
>
> **NOTHING HERE IS BUILT.** Plan only. The browser sampler group
> (`/concepts/sampler/000`, `010`, `020`) is being built by another agent in
> `demo/concepts/sampler/` at the same time, and this plan does not touch it.
>
> Every claim carries one label:
>
> - **MEASURED**: run today (2026-10-11) on this laptop or read off the Pi with
>   read only commands (`apt-cache policy`, `which`, `jack_lsp`, `aconnect -l`,
>   `lsusb -v`, `/proc/asound`, `free`, `df`, `pgrep`), or measured earlier in
>   this repository with the file named.
> - **DOCUMENTED**: read today in a document, URL given, read 2026-10-11 unless
>   another date is given. Fetched through a summarising tool, so a number that
>   gets built on is worth one look at the raw source.
> - **READ**: a file in this repository, named with its line, read today.
> - **UNCONFIRMED**: my reasoning, arithmetic on the numbers above, or a claim
>   nobody has checked. Arithmetic is marked `(arithmetic)`.
>
> It stands on, and does not repeat: `plans/plan-pico.md` (§5 sound, §8.3
> PIO-USB, §9 pins and clocks, §11 parts), `research/pico-synths-and-cv-2026-10-04.md`
> (§1.3 Pico samplers, §2 outputs, §5 what rp2040js can do with sound),
> `plans/plan-universal-routing.md` (media, `file` as a medium),
> `plans/plan-away-webrtc.md` (the direct path's latency),
> `plans/plan-routing-time.md` (the relay PCM's latency),
> `archive/box-fluidsynth-hexter/README.md` (why FluidSynth left), and
> `rig/board/` as it is in the tree today.

## 1. The verdict

1. **The Pi: yes, and the cheapest version needs no install at all.** A node
   sampler inside the board code, built exactly the way `rig/board/synth.mjs`
   already imports `demo/shell/rhodes.mjs` "imported, not ported", reading the
   same note map and velocity rules as the browser page, with the samples
   fetched once from our own R2 and decoded once by the `ffmpeg` already on the
   Pi. It is `pi-1:sampler` with `midi-in`, `file-in` and `audio-out`.
   **sfizz is the better engine and the worse first step**: it is not in Debian
   trixie for arm64 at all, so it is a build from source on the Pi, and its
   JACK client takes MIDI only on a JACK MIDI port and ignores program change.
2. **But it will not be playable as a piano from a browser over the relay.**
   Key press to speaker through the relay is **~175 ms MEASURED**; the direct
   data channel path is **~48 ms MEASURED** on one network. The Pi sampler is
   for a keyboard plugged into the Pi, for listening from elsewhere, and for
   the patchbay story; the browser's own sampler stays the instrument under the
   fingers.
3. **The Pico: yes as a small standalone sampler, on its own board.** The full
   piano set (30 notes) and the full Rhodes set (65 files) both fit in the 4 MB
   flash at once as IMA ADPCM at 22.05 kHz, about **3.06 MB (arithmetic)**.
   Polyphony is a CPU question that only the board answers; the arithmetic says
   tens of voices on one M33 core, published Pico samplers claim 6 to 8.
4. **Can a Pico drive the Fast Track Pro?** **Not as a USB host**: the card is
   USB Audio Class 1 with isochronous endpoints (MEASURED) and TinyUSB's host
   stack has no audio class and no isochronous transfers (DOCUMENTED). **Yes
   into analog input 2**, which is free and already on the JACK graph as
   `system:capture_2` with nothing connected (MEASURED). That is the
   recommendation: one cable, no new code on the Pi beyond a bay link.
5. **In the browser, the emulator could plausibly play a sampler live**, which
   the earlier research rejected for Plaits: a sampler costs perhaps one
   hundredth of a Plaits voice, and the emulator skips idle time in WFI (READ,
   `demo/shell/pico.mjs:352`). UNCONFIRMED until one firmware is timed. The
   honest twin is still the same C compiled to wasm in an AudioWorklet.

⚠️ **WHILE THIS WAS BEING WRITTEN, A SECOND AGENT STARTED THE sfizz HALF**
(BACKLOG `sampler/030`, asked *"Build sfizz pi as next demo in bg"*). READ
today: it is **blocked on the install** for the same reason §2.2 found (no
sfizz in apt for trixie arm64, OBS has amd64 and armhf only), and it has
already written `rig/board/sampler.mjs` (the SFZ writer and an idempotent
fetch, `test.mjs` 413/413) and put the 30 FLACs and `piano.sfz` on the card at
`/opt/positron-board/samples/piano/` (MEASURED: 6.4 MB). The browser group's
shared module is `demo/concepts/sampler/sampler.mjs` (named in that file's
header). This plan builds on both rather than beside them: the node engine in
§2.3 reads the same cache and the same rules, and the choice in §2.2 is now a
choice the `sampler/030` agent is waiting on.

**Order**: Pi node sampler (§2.3), then the Pico sampler firmware with its wasm
twin in `gcc`/emscripten containers with no board (§3.8), then the Pico on the
Fast Track Pro's input 2 with PWM (§4), then an I2S DAC by post if the PWM is
not good enough. sfizz only if a JACK sampler is wanted for the granulator
insert or for local monitoring (§2.4).

## 2. The Pi as `pi-1:sampler`

### 2.1 What the Pi is today (MEASURED 2026-10-11, read only)

| fact | value |
| --- | --- |
| board | Raspberry Pi 4 Model B Rev 1.5, 4 cores, arm at 1.8 GHz (`vcgencmd measure_clock arm` 1,800,404,352) |
| OS | Debian GNU/Linux 13 (trixie), `aarch64`, dpkg arch `arm64` |
| memory | 1,847 MB total, **1,494 to 1,520 MB available**, swap 1,846 MB, 9 MB used |
| SD card | 29 GB, **22 GB free** (22 per cent used) |
| load | 0.24 0.14 0.17, up 22 days |
| apt sources | Debian trixie main contrib non-free, trixie-security, archive.raspberrypi.com trixie, nodesource node_24.x |
| node | 24.21.0 |
| ffmpeg | 7.1.5-0+deb13u1+rpt2, installed |
| JACK now | `jackd -r -d alsa -C hw:CARD=Pro,DEV=0 -r 48000 -p 512 -n 3`, capture only. Ports: `system:capture_1` into `poscircuit:input_1`, **`system:capture_2` connected to nothing** |
| capture to the relay | `ffmpeg -f jack -channels 1 -i poscircuit -f s16le -ar 48000 -ac 1 -` |
| instruments up now | none: no `yoshimi`, no `scsynth` process |
| ALSA MIDI | `FastTrack Pro` client 40 (one port, `FastTrack Pro MIDI 1`), `Circuit` client 44, four `VirMIDI` clients 16 to 19, `Midi Through` 14 |
| USB | Fast Track Pro 0763:2012 and Circuit 1235:0079 behind a VIA 2109:3431 hub, both **full speed**; a Logitech C925e |

The JACK setup is commit `babab4eb` (2026-10-11): jackd on the Fast Track Pro
itself, capture only, 512 x 3, so the Circuit is no longer resampled between
two clocks. 512 frames at 48 kHz is **10.7 ms** a period (READ,
`rig/board/inputs.mjs:259`). Yoshimi, when it runs, is spawned by
`JACK_SYNTHS.yoshimi` in `rig/board/jacksynth.mjs:272`, its left and right are
summed into the capture (`posboard:input_1`, mono sum on purpose, measured
2026-09-13), and the granulator is an insert between them
(`SuperCollider:in_1/in_2`).

### 2.2 The engines

| engine | on this Pi | MIDI in | program change | velocity layers | joins the audio where | label |
| --- | --- | --- | --- | --- | --- | --- |
| **node sampler in the board code** | nothing to install: node 24 and ffmpeg are there | ALSA sequencer, as `synth.mjs` already does with `aseqdump`, and the relay's `note.on` | its own: program 0 piano, 1 Rhodes | whatever the browser module does (nola plays the loudest layer at a velocity, one at a time) | straight onto the relay as 48 kHz mono PCM, the path `synth` and `moog` use (`board.mjs:586-612`); **not on JACK** | MEASURED (what is installed), UNCONFIRMED (the rest) |
| **sfizz** (`sfizz_jack`) | **not in apt for trixie arm64**: `apt-cache policy sfizz` and `sfizz-lv2` print nothing, `apt-cache search sfizz` finds nothing (MEASURED). Upstream OBS has `Debian_Testing` for **amd64 only** and `Raspbian_11/12` (armhf, 32 bit) ([OBS listing](https://download.opensuse.org/repositories/home:/sfztools:/sfizz/)). Latest release **1.2.3, 2024-01-14** ([sfz.tools](https://sfz.tools/sfizz/downloads)). So: a build from source; `cmake` and `libjack-jackd2-dev` are not installed, `g++` 14.2 is (MEASURED) | **a JACK MIDI port named `input` only** ([jack_client.cpp](https://raw.githubusercontent.com/sfztools/sfizz/develop/clients/jack_client.cpp)); the board's MIDI is ALSA, so it needs `a2jmidid` (candidate 9-3.1, not installed, MEASURED) or jackd's own ALSA MIDI bridge | **ignored**: the client dispatches note on and off, aftertouch, CC and pitch bend only (DOCUMENTED, same file). Its stdin takes `load_instrument <path>`, `set_voices`, `set_preload_size`, `set_oversampling` | full SFZ: velocity ranges and crossfades | a JACK client, so exactly where Yoshimi joins: into `posboard:input_1`, or through the granulator insert | as marked |
| **FluidSynth** | **installed**, 2.4.4+dfsg-1+deb13u2 (MEASURED), although `rig/board/packages.txt:26` says the board must not quietly get it back. Worth asking why before anything else | ALSA sequencer directly | native, SF2 presets | SF2 velocity ranges, no crossfade | a JACK client, as Yoshimi | MEASURED |
| LinuxSampler | **no candidate** in apt (MEASURED) | | | | | MEASURED |
| samplv1 | candidate 1.3.1-2, not installed (MEASURED) | | | one sample per instance, so not a multisampled piano (UNCONFIRMED from what the project is known for) | JACK | as marked |
| Carla, liquidsfz | no candidate (MEASURED) | | | | | MEASURED |

**Why FluidSynth left the board, and why it is not a reason against it as an
engine.** Removed 2026-09-16 on instruction (`archive/box-fluidsynth-hexter/README.md`).
The reason written there is not quality or CPU: *"There is ONE `jackd`, ONE
ffmpeg capture and ONE relay room on that board. Whatever is up is what every
listener on every page hears"*, so an instrument picker on `/keys/` took the
sound away from somebody in another building, and `/knobs/` broke when
somebody pressed `sampled`, because FluidSynth answers neither CC 74 nor
CC 71. Two numbers in that file are worth keeping: on the board, through JACK,
FluidSynth with FluidR3 GM cost **12.3 per cent of 400** and **74 ms to the
ear** (MEASURED then, the old `rig/box`). And it loads a soundfont whole, no
streaming (READ there): 141 MB for FluidR3, about 32 MB for ours (§2.5).

🔴 **THE SAME OBJECTION LANDS ON EVERY ENGINE IN THIS TABLE, NOT ONLY ON
FLUIDSYNTH.** The board runs one source at a time: `audio.start {source}`
answers with the one source that is up, and `/concepts/synth/060/` refuses to
stop somebody else's (`if (st.ok && st.source !== 'yoshimi') ... will not stop
it`, READ, line 187). A `sampler` source is a second row in exactly the picker
that was removed. Three ways out, for the owner to choose:

- **a)** the sampler is one more source, and a page that finds Yoshimi up says
  so and does not take it (060's behaviour). Cheapest; one instrument at a
  time, which is the board as it is.
- **b)** on JACK, both run at once and both sum into the capture. The bay links
  already make this expressible (`jacksynth.mjs` keeps bay rows on every
  re-patch); what does not exist is a page telling two players apart in one
  mono capture.
- **c)** a second capture into a second relay room, which the FluidSynth
  README names as the real fix. Not costed here.

This plan assumes **a)** for the first step.

### 2.3 Recommended first: a node sampler, `source: 'sampler'`

**Shape** (UNCONFIRMED, a design):

- An engine file beside `synth.mjs` (`rig/board/sampler.mjs` is taken: it is
  the `sampler/030` agent's SFZ writer and fetch, and the engine imports its
  fetch rather than writing a second one), `createSampler()` with
  `noteOn(note, vel)`, `noteOff(note)`, `cc(n, v)` (64 sustain), `program(p)`,
  `render(frames)` and `startRealtime(sendPcm)`, the same surface
  `createSynth` has.
- **The map is shared, not copied.** `demo/nola/index.html` holds the rules
  today: `PIANO_NOTES` (21 to 108 step 3, 30 notes, every key within one
  semitone), `RHODES_NOTES` (15 notes, gaps 6, 5, 5, 5, 5, 4, 3, 3, 6, 5, 5, 5,
  5, 5, so up to three semitones), `nearestIn` (a tie goes DOWN, graded against
  the author's SFZ key regions), `RHODES_XF` (the author's crossfade table, used
  to pick the loudest layer), and the velocity curve (18.8 dB over the range,
  against 5.5 dB of layer to layer wander). All READ, `demo/nola/index.html:140-275`.
  The browser group is putting them in `demo/concepts/sampler/sampler.mjs`
  (READ, named in `rig/board/sampler.mjs`'s header); once it lands, the board
  imports that module, or it moves to `demo/shell/` and both import it, the
  precedent being `rhodes.mjs`: *"the board and the browser cannot drift into
  two instruments that merely sound similar"* (`synth.mjs:1-6`). ⚠️ That edit
  touches the concept pages and is the other agent's to agree to, after they
  land.
- **`file-in`**: on the first `program` that needs a set, the board fetches its
  files from `https://positron-station.kristjan-jansen.workers.dev/media/sampler/<set>/...`
  (our own R2, MEASURED today: both sample URLs answer with `audio/mpeg` and
  `audio/mp4`, `access-control-allow-origin: *`; ⚠️ and a HEAD answers
  **206**, which a check written as `status === 200` would read as broken),
  decodes each with `ffmpeg -i <f> -f f32le -ac 1 -ar 48000 -` into the cache,
  and writes a manifest of name, bytes and sha256 so the next start reads the
  SD card and asks nobody anything. The cache already exists: the `sampler/030`
  agent put 30 FLACs at `/opt/positron-board/samples/piano/` (MEASURED, 6.4 MB),
  so the node engine decodes those FLACs rather than fetching again. ⚠️
  `/opt/positron-board` is what `push.sh` and `setup.sh` write to; whether a
  push leaves `samples/` alone was not checked (UNCONFIRMED), and it is never
  `~/positron`, which is the stale copy (positron-hardware skill).
- **`audio-out`**: 960 frame (20 ms) or 480 frame (10 ms) mono s16 frames into
  `sendPcm`, the relay path `synth` uses, so every page that already hears the
  board hears it, including the direct path's `goDirect()` (`plan-away-webrtc.md`).
- **Program change**: program 0 piano, 1 Rhodes, matching `web:patch` in
  `/concepts/sampler/010/` which sends a MIDI program change into the sampler's
  `midi-in` (BACKLOG). Only the set the program asks for is fetched.

**Why first**: no apt install, no build on the Pi, no change to
`packages.txt`, the same instrument the browser plays, and a board that has
already shipped two engines this way (`synth`, `moog`). The cost is that it is
not a JACK client, so it cannot go through the granulator insert or a bay link
inside the Pi. It could reach JACK through `snd-aloop` (card 1 `Loopback` is
loaded, MEASURED) and `alsa_in`, but that is the resampling between two clocks
that `babab4eb` just removed for the Circuit.

**CPU, UNCONFIRMED.** Per voice per sample: one linear interpolation and one
gain, against `moog`'s oscillators and ladder filter, which measured **8 voices
at 6.8x realtime, 15 per cent of one core** on this Pi's A72
(`rig/board/README.md:167`). A sampler voice is cheaper than a moog voice, so
64 voices is plausible in one core; `node bench.mjs` style numbers on the board
settle it in seconds, and the README's own rule is that the measurement replaces
the estimate.

### 2.4 sfizz, when a JACK sampler is wanted

Worth it for two things the node sampler cannot do: the granulator insert and
bay links inside the Pi, and local monitoring if jackd ever gets a playback side.

- **Getting it.** Build 1.2.3 from source on the Pi or in an arm64 container
  (the board's `debian:trixie` arm64 container precedent is in
  `archive/box-fluidsynth-hexter/README.md`). `SFIZZ_JACK` is on by default on
  Linux (DOCUMENTED, [sfz.tools build](https://sfz.tools/sfizz/development/build/)).
  It needs `cmake`, `libjack-jackd2-dev` and libsndfile's headers on the build
  side. ⚠️ An install on the Pi is the owner's decision and is out of scope for
  this plan (read only today). Building on the laptop is refused by the managed
  machine rule (memory: locally compiled binaries are killed); a container that
  emits an arm64 binary is the route.
- **MIDI**: `a2jmidid -e` (in apt, MEASURED candidate 9-3.1) bridges the ALSA
  sequencer to JACK MIDI; then `virmidi -> a2j -> sfizz:input`. Or start jackd
  with its ALSA MIDI driver; jackd's flags are the board's and are changed in
  `inputs.mjs`, not by hand.
- **Program change**: two options, both UNCONFIRMED. (1) The board intercepts
  program change and writes `load_instrument piano.sfz` or `rhodes.sfz` to
  sfizz's stdin. How long a load takes, and whether it is silent meanwhile, is
  unmeasured. (2) One SFZ with both sets, each region gated on a CC with
  `locc`/`hicc`, and the board turning program 0 or 1 into that CC. `loprog`
  and `hiprog` exist in SFZ v2 ([sfzformat](https://sfzformat.com/opcodes/loprog/))
  but sfizz's support for them was not found, so the CC route is the safer bet.
- **CPU at 30 to 60 voices on this Pi: not measured and not measurable today**,
  because it is not installed. Upstream says ARM builds got performance work
  (search snippet, not to build on). Measure with `sfizz_render` on a fixed MIDI
  file before wiring anything.

**The SFZ mapping.** Decode to FLAC once (`ffmpeg -i 60.mp3 -ar 48000 -c:a
flac piano/60.flac`), then:

```
// piano.sfz: 30 regions, one per recording, nearest note, no ties (step 3)
<control> default_path=piano/
<global> amp_veltrack=100 ampeg_release=0.12
<region> sample=21.flac  pitch_keycenter=21  lokey=21  hikey=22
<region> sample=24.flac  pitch_keycenter=24  lokey=23  hikey=25
...                                      (n-1 to n+1 for every n = 27 to 105)
<region> sample=108.flac pitch_keycenter=108 lokey=107 hikey=108
```

`ampeg_release=0.12` is `synth.mjs`'s `DAMP_SEC` (a damper, not a music box).
`amp_veltrack` and an `amp_velcurve_N` set are what make the level follow
velocity the way nola's curve does; the numbers come out of the shared module,
not out of this plan.

**The Rhodes needs no SFZ from us.** The author ships his own:
`jRhodes3d-mono.sfz` and **`jRhodes3d-mono-no-xfade.sfz`** in
[sfzinstruments/jlearman.jRhodes3d](https://github.com/sfzinstruments/jlearman.jRhodes3d)
(DOCUMENTED, FLAC, about 90 MB for all three variants). The no-xfade one is
the behaviour nola has (one layer at a time); the crossfade one is the
author's intent and will sound different from the browser. ⚠️ Our R2 copies
are not his files: capped at 4 s, faded over 8 ms, AAC 96 kbps
(`PROVENANCE-rhodes.json`), so either decode ours and rewrite his `sample=`
paths to our names (`rhodes-<note>-<layer>`), or fetch his FLACs once at
provisioning time. Licence CC BY-NC-SA 4.0, share-alike, so `LICENSE-jrhodes3d`
goes in the cache directory beside the files.

### 2.5 Sizes (MEASURED today with `ffprobe` on `demo/nola/`)

| set | files | duration | source format | decoded s16 | decoded float32 (node) |
| --- | --- | --- | --- | --- | --- |
| piano | 30 mp3, 732 KB | **90 s**, longest 3.13 s | mp3, 44.1 kHz, **stereo** | 15.9 MB stereo, 7.9 MB mono (arithmetic) | 31.8 MB stereo, 15.9 MB mono (arithmetic) |
| Rhodes | 65 m4a, 3.2 MB | **188 s**, longest 3.99 s | AAC, 44.1 kHz, mono | 16.6 MB (arithmetic) | 33.2 MB (arithmetic) |

Against 1.5 GB available and 22 GB of card, both sets decoded whole is about
1 to 2 per cent of the memory. Nothing needs streaming from disk.

### 2.6 Latency, and what it means under a player's fingers

| path | key press to the note arriving back | key press to speaker | label |
| --- | --- | --- | --- |
| browser, relay, Pi, relay, browser | 78 to 99 ms, median ~93 | **~175 ms** | MEASURED, `plan-routing-time.md:107,213` from `HANDOFF.md:468-476` |
| the same over the direct data channel, one network | ~15 to 20 ms | **~48 ms** | MEASURED, `plan-away-webrtc.md:212-217` |
| relay legs | ~18 ms each way | | MEASURED, `plan-away-webrtc.md:29-30` |
| a JACK sampler on the board adds | about one to three 10.7 ms periods at 512 x 3 | | UNCONFIRMED (arithmetic on MEASURED settings) |
| a keyboard on the Pi, sound out of the Fast Track Pro | ALSA MIDI in, sampler, two or three periods out | **about 25 to 35 ms (arithmetic)** | UNCONFIRMED, and **impossible today**: jackd is capture only, so nothing on the Pi plays out of the card |

What it means: 175 ms is not a piano, it is a delay effect; a player hears the
note a long eighth note late at 120 BPM. 48 ms is playable for slow material
and still worse than the browser's own sampler, whose output latency is the
AudioContext's (not measured here). So:

- a player at a browser plays the browser sampler and **listens** to the Pi;
- a player at the Pi plays a keyboard plugged into the Pi, and the Pi sampler
  is for whoever listens remotely;
- local monitoring at the Pi needs a playback side on jackd, which is a change
  to `babab4eb`'s decision and is the owner's.

### 2.7 The links

```
web:keys:midi-out          -> pi-1:sampler:midi-in        (through cf-relay:studio-1)
web:patch:midi-out         -> pi-1:sampler:midi-in        (program change, as sampler/010)
cf-r2:piano:file-out       -> pi-1:sampler:file-in        (fetched once, kept on the SD card)
cf-r2:rhodes:file-out      -> pi-1:sampler:file-in
pi-1:sampler:audio-out     -> web:speaker:audio-in        (through cf-relay:studio-1, as synth/060's Yoshimi)
```

The patchbay draws a relay link as two hops through `cf-relay:<room>`
(`demo/shell/patchbay.mjs:65-74`). `file` is a medium in
`plan-universal-routing.md` §3 (*"a session to or from a store"*), so a
`file-out -> file-in` link is in the vocabulary already. ⚠️ It is the first
`file` link whose receiving end is a board rather than a browser; the board
does the fetch, so the link is drawn as a fact, not a live transfer.

### 2.8 Program change and the looper on the Pi

- **Program change**: §2.3 (node, native) and §2.4 (sfizz, translated).
  Yoshimi already takes program numbers per bank (`archive/.../README.md`:
  *"A program NUMBER still works and is what every page sends"*).
- **The looper (020) could run on the Pi, and the question is where the loop
  should live, not whether it can.** A raw MIDI looper is timestamps and a
  replay, trivial in node. But it records the timing that arrives where it
  runs: on the Pi, a browser player's notes arrive with the relay's jitter
  baked in, while a loop recorded in the browser is exact and only its playback
  is jittered. So: **loop where the notes are born.** A keyboard plugged into
  the Pi loops on the Pi (`pi-1:looper` between the ALSA keyboard and
  `pi-1:sampler`); the browser keys loop in the browser (`web:looper`, the
  page being built). Sustain (CC 64) is in the same MIDI stream either way.

## 3. The Pico as a sampler

### 3.1 What is on the desk

- The desk board is a **Pico 2 W** (RP2350A, two Cortex-M33 at 150 MHz, FPU,
  520 KB SRAM, 4 MB flash; READ in `plan-pico.md` §2). The shopping list in
  `HANDOFF.md:559-575` (Pico 2 WH, SSD1306 with four buttons, MB-102
  breadboard, OTG cable) says **"no MIDI DIN"** and **"owner has a powered USB-B
  hub"**: the router's next firmware is a USB host into that hub.
  ⚠️ Whether every part on that list has arrived and is wired is UNCONFIRMED
  here.
- Firmware in the tree: `rig/pico/firmware/` (the DIN router, UF2 54,784 bytes
  for `pico2_w`), `rig/pico/net/` (the wifi node, UF2 **798,720 bytes**),
  `rig/pico/patch/` and `rig/pico/rings/` (MEASURED file sizes today). A UF2
  carries 256 bytes of payload in each 512 byte block, so the net image is
  about **399 KB of flash** and the router about 27 KB (arithmetic).

### 3.2 Flash budget

| build | flash left for samples (arithmetic) |
| --- | --- |
| a sampler on its own (code about 64 to 128 KB) | about **4.0 MB** |
| a sampler inside the wifi node (about 399 KB of code with the CYW43 firmware) | about **3.7 MB** |

### 3.3 Format, rate and how much fits (arithmetic)

| format, mono | bytes a second at 22,050 Hz | seconds in 4.0 MB | at 32,000 Hz |
| --- | --- | --- | --- |
| 16 bit PCM | 44,100 | 95 s | 65 s |
| 8 bit mu-law | 22,050 | 190 s | 131 s |
| **IMA ADPCM, 4 bit** | **11,025** (plus a 4 byte header per block, under 1 per cent) | **380 s** | **262 s** |

| what | seconds (MEASURED today) | IMA ADPCM 22.05 kHz | IMA ADPCM 32 kHz | 16 bit 22.05 kHz |
| --- | --- | --- | --- | --- |
| piano, all 30 notes, folded to mono | 90 | **0.99 MB** | 1.44 MB | 3.97 MB (does not fit beside wifi) |
| Rhodes, all 65 files | 188 | **2.07 MB** | 3.01 MB | does not fit |
| Rhodes, one layer, 15 notes | about 43 (65 files average 2.9 s) | 0.48 MB | 0.69 MB | 1.9 MB |
| **piano and the full Rhodes together** | 278 | **3.06 MB, fits both builds** | 4.45 MB, does not fit | does not fit |
| "a handful": 8 piano notes, 1.5 s each | 12 | 0.13 MB | 0.19 MB | 0.53 MB, which still exceeds SRAM |

So the realistic sampler plays **from flash through XIP**, not from SRAM: 520 KB
of SRAM holds about 5.9 s of 16 bit audio at 22.05 kHz, before the firmware's
own memory. The recommendation is **IMA ADPCM at 22.05 kHz** for both sets, or
32 kHz ADPCM for the piano alone. 22.05 kHz cuts everything above 11 kHz,
which a piano mostly survives and a demo certainly does (UNCONFIRMED by ear).

The Pi builds the sample image: decode from R2, fold to mono, resample, ADPCM
encode, pack with a table of note, layer, offset and length, written as a
binary blob linked into the UF2 or flashed to a fixed offset. `ffmpeg` encodes
IMA ADPCM (`adpcm_ima_wav`); a few lines of C or JS give the raw nibble stream.

Prior art on this class of chip, all READ in `research/pico-synths-and-cv-2026-10-04.md`
§1.3: Workshop Computer cards `48_two_tracks` (**ADPCM in flash**, MIT),
`73_VSS` (**6 voice mu-law**), `67_Fragments` (six slot sampler, CC0), all
RP2040; PicoADK v2 claims a **sampler of 8 voices** on RP2350 (READ in
`plan-pico.md` §5.1).

### 3.4 Pitch and polyphony

- **Pitch by resampling**: each voice keeps a 32 bit phase with a 16.16 step of
  `2^((note - root)/12)`, decodes ADPCM forward as the phase crosses each
  source sample, and linearly interpolates between the last two. ADPCM only
  decodes forward, which is fine: every note starts at sample 0 and these sets
  have no loops (`PROVENANCE-rhodes.json`: *"none. This is the unlooped set"*).
  The piano's worst bend is one semitone, the Rhodes' three (nola's comments).
- **Cycles (arithmetic)**: 150 MHz / 32,000 is **4,688 cycles a sample a
  core**, / 22,050 is **6,803**. A voice is roughly an ADPCM step (table
  lookups and clamps, 15 to 25 cycles), an interpolation (about 10), a gain and
  envelope (about 5), a mix (about 3): **40 to 60 cycles**, plus XIP cache
  misses. At 60 per cent of a core that is **45 to 70 voices on one core at
  32 kHz**. Published figures are far lower (6 to 8), and nobody publishes what
  they spend the rest on, so the claim to build on is **"16 voices on core 1
  with room to spare", until a board says otherwise.**
- **Two cores**: core 0 keeps MIDI, USB or wifi and the screen; core 1 renders.
  For more voices, each core renders half the voices into its own buffer and
  core 1 sums. With wifi up, core 0's share is unknown (`plan-pico.md` §9.4).
- **XIP**: per voice ADPCM at 22.05 kHz reads 11 KB/s; 32 voices read about
  350 KB/s, a small fraction of what QSPI delivers; the cost is stalls on
  cache misses, which nobody has measured on an RP2350 (UNCONFIRMED).
- **Voice stealing**: nola allows 64 voices because a pedalled glissando passes
  a hundred notes (READ, `demo/nola/index.html:178`). A 16 voice Pico steals
  the oldest released voice first, then the oldest. The sustain pedal makes
  this matter.

### 3.5 Audio out: PWM against an I2S DAC

| | PWM | I2S DAC (PCM5102A) |
| --- | --- | --- |
| quality | about 10 to 11 bits: pico-extras `audio_pwm` defaults to **22,058 Hz**, supply noise is the worst offender; PicoDexed calls its PWM build *"not recommended"* (all READ, `plan-pico.md` §5.2, research §2) | 16 to 32 bit, **112 dB SNR**, 2.1 Vrms, internal PLL so no MCLK (DOCUMENTED, vendor pages in today's search, e.g. [electropeak](https://electropeak.com/pcm5102-i2s-digital-audio-dac-decoding-module)) |
| parts | a pin, a two pole RC filter around 10 kHz, a DC blocking capacitor, a jack: about **€3** at Oomipood (`research/pico-synths-and-cv` §6) | the module, 3 pins (BCK, LRCK, DIN), one PIO state machine |
| clock | any sysclk; at 150 MHz a 10 bit wrap is a 146 kHz carrier (arithmetic), far above audio | needs a sysclk that divides cleanly: 153.6 MHz (PRA32-U2), 191.08 MHz (picoX7), 144 MHz (ComputerCard), all READ in `plan-pico.md` §5.2. That fights the router's 120 MHz multiple for PIO-USB (§9.4 there) |
| where to buy | Oomipood, today | **not in Oomipood's own stock** (MEASURED 2026-10-04, ten searches, only an INMP441 microphone). Today's web search turned up only aggregator listings on `.ee` domains of doubtful standing (one at €3.05); not a source to plan on. By post: GY-PCM5102 modules from eBay.de or diymore, Adafruit 6250 (PCM5102) or 6251 (PCM5100), Pimoroni Pico Audio Pack (named by PRA32-U2 and Pico2Dexed). Prices not checked today |

**Recommendation: PWM first**, because it is buildable this week from shelf
parts and it goes into an input that has a gain knob (§4.2), then a PCM5102A by
post for quality. Both from the same firmware: the render loop fills a buffer,
and a DMA channel feeds it to either the PWM compare register or the PIO FIFO.

### 3.6 MIDI in

| route | parts | firmware | note |
| --- | --- | --- | --- |
| **USB MIDI device** (TinyUSB device class, DOCUMENTED in its [README](https://raw.githubusercontent.com/hathach/tinyusb/master/README.rst)) | the Pico's own USB socket into the Pi's hub | TinyUSB is in the SDK image but its submodules are empty there (`plan-pico.md` §2) | power and MIDI on one cable; on the Pi it is one more ALSA sequencer client that `alsa.mjs` patches like the Circuit. **Not on the router board**, whose socket is a host |
| UART DIN at 31,250 baud | optocoupler, DIN socket, resistors: **not bought** ("no MIDI DIN") | already written: `rig/pico/firmware/midi_parse.c` parses DIN on GP1 | the router's DIN out could feed a sampler Pico |
| **over wifi from the relay** | none beyond a Pico 2 W | `rig/pico/net/`, plain `ws://` to the relay, **MEASURED 2026-10-04: `101 Switching Protocols`** (`plan-pico.md` §1) | makes it `pico-1:sampler:midi-in` in the patchbay, played from any browser. Its sound still comes back through the Pi (§4) |
| from the router Pico as USB host | the hub | TinyUSB host MIDI is supported (DOCUMENTED, README) | the router as host, the sampler as device, both in the hub |

### 3.7 In the browser: what rp2040js would need to make sound

Read today in `demo/shell/vendor/rp2040js.mjs` (1.4.0) and `demo/shell/pico.mjs`:

- **RP2040 only, one core, no FPU** (`rig/pico/sim/README.md`). So the emulated
  build is an RP2040 build of the same C, fixed point. A sampler is integer
  arithmetic, so this costs nothing in sound; the M0+ just spends more cycles
  per voice than the M33.
- **PWM is timed by clock alarms**, not stepped: each `PWMChannel` has
  `Timer32PeriodicAlarm`s for A, B and the wrap, and the wrap raises
  `DREQ_PWM_WRAP0 + n` to DMA (READ). A write to the channel's CC is where every
  sample lands, and patching that setter captures it with its board time.
- **A core in WFI is not stepped**: *"its clock jumps to the next alarm, which
  is what makes an idle firmware cheap"* (READ, `demo/shell/pico.mjs:352`).
- **PIO is not on the CPU clock** (research §5.1: about 0.79 million PIO
  instructions a second in Node, a quarter of what I2S needs). So **PWM, not
  I2S, in the emulator.**
- Measured speeds: the router **0.6x** real time flat out, Plaits bench
  **0.44x** flat out, and **one Plaits voice at 548 per cent of a 125 MHz core**
  (research §5.1, MEASURED 2026-10-04).

**Why the earlier rejection does not automatically carry over.** The research
rejected live audio from the emulator because Plaits needs five cores' worth
per voice. A sampler voice at perhaps 60 to 100 cycles a sample on an M0+ at
22,050 Hz is **1.3 to 2.2 million cycles a second**, about 1 to 2 per cent of a
125 MHz core (arithmetic). Eight voices are 10 to 18 million, against an
emulator that executes about 75 million board cycles a second flat out (0.6 of
125 MHz, arithmetic). If the firmware sleeps in WFI between DMA interrupts, the
emulator skips the idle time and the worker could keep real time with headroom.
Set the PWM wrap to the sample rate (`top` about 5,669 at 125 MHz for
22,050 Hz, about 12.5 bits) so there is one CC write per sample and three
alarms per sample period, about 66,000 alarm events a second (arithmetic).

**What the page needs** (UNCONFIRMED, a design): the worker collects CC values
per board time into blocks, posts them to the page, and an AudioWorklet plays
them through a cushion that grows when the emulator falls behind, the way
`pcm-playout` handles relay frames. The worker already reports `speed` and
`flatOut` (`pico-worker.mjs:67-69`), which is the number that says whether it
keeps up.

**Prior art**: Wokwi's buzzer plays emulated pins in the browser, and its own
docs say the *"accurate"* mode *"will add audible click noises ... due to
fluctuations in the simulation speed - it's not always able to provide the
complete sound buffer in real time"* (DOCUMENTED, [docs.wokwi.com](https://docs.wokwi.com/parts/wokwi-buzzer)).
That is exactly the risk, stated by the people who built the emulator.

**So two things, kept apart and labelled**, as research §5.2 already
recommends: (1) the **wasm twin**: the same pure C sampler library compiled by
emscripten into an AudioWorklet, which is what a visitor hears and is honestly
labelled "the firmware's DSP"; (2) the **emulated board** for the glue (a DIN
byte reaches `note_on`, DMA keeps PWM fed, the OLED shows the program), with
live sound as an experiment that prints its own `speed` beside it. A golden
render compares the samples from `gcc:14`, the wasm and the emulator's CC
capture on one fixed note list; integer DSP should match bit for bit.

### 3.8 What can be done with no board

All in containers, the way `rig/pico/firmware/` is built (Docker, `pico-sdk`
2.2.0): the sampler library and a WAV render in `gcc:14`; the image packer on
the laptop in node; the wasm twin with `emscripten/emsdk` (already pulled,
research §5.2); an RP2040 UF2 run in rp2040js to time cycles per voice. Only
noise, clock jitter, XIP stalls on the RP2350 and voices with wifi associated
need the board.

## 4. Can a Pico drive the Fast Track Pro?

### 4.1 The card, read off the Pi (MEASURED 2026-10-11, read only)

| fact | value |
| --- | --- |
| USB | `0763:2012`, **bcdUSB 1.10**, ALSA says **full speed**; **bus powered, MaxPower 200 mA** |
| audio class | AudioControl with **bcdADC 1.00**, so **USB Audio Class 1**; AudioStreaming interfaces 2 and 3 (playback), 4 and 5 (capture) |
| playback | two PCM devices, each 2 channels S16_LE at 44,100 or 48,000 Hz, endpoints 0x03 and 0x04, **isochronous, adaptive**, `wMaxPacketSize` 200 bytes (48 kHz stereo 16 bit is 192 bytes a millisecond) |
| capture | two PCM devices, each 2 channels, 8,000 to 48,000 Hz, endpoints 0x85 and 0x86, isochronous, sync. `stream0` capture (interface 4) is **running** (jackd); `stream1` capture (interface 5) is **stopped** |
| MIDI | a MIDIStreaming interface, two MIDI IN jacks and two MIDI OUT jacks, bulk endpoints 0x01 and 0x81; on the Pi it is ALSA client 40 `FastTrack Pro MIDI 1` |
| mixer | no simple controls; only the four channel map controls |
| JACK | `system:capture_1` (input 1, the Circuit) into `poscircuit:input_1`; **`system:capture_2` connected to nothing** |
| config | `BOARD_INPUTS` reads the card as `hw:CARD=Pro,DEV=0`, 2 channels, `take: 1`, `via: jack`, `jackd: {period: 512, periods: 3}` |

Linux carries a boot quirk for this exact card: it switches it from USB
configuration 1 to **configuration 2**, and a `device_setup` parameter picks 16
or 24 bit, 48 or 96 kHz, and whether **Digital Input** is enabled; in the
24 bit modes, enabling digital input disables interface 4 and disabling it
disables interface 5 (DOCUMENTED, `snd_usb_fasttrackpro_boot_quirk` and
`fasttrackpro_skip_setting_quirk` in
[sound/usb/quirks.c](https://raw.githubusercontent.com/torvalds/linux/master/sound/usb/quirks.c)).
The default (16 bit) uses altsetting 1 everywhere, which is what the Pi shows.
And it sends big endian under an `S16_LE` label in the 24 bit altsettings
(same file), which fits `inputs.mjs:295`'s measurement of 2026-09-30.

### 4.2 The four ways, compared

| | 1. Pico as USB host to the card | 2. Pico into analog input 2 | 3. Pico into S/PDIF coax in | 4. Pico sends MIDI to the card's DIN in |
| --- | --- | --- | --- | --- |
| what it means | the Pico replaces the Pi as the card's host and streams audio out of it | the Pico makes sound; the Pi captures it as it captures the Circuit | the same, digitally | the Pico is a controller; the Pi's sampler or Yoshimi makes the sound |
| card side | UAC1, full speed, isochronous adaptive OUT, 200 byte packets (MEASURED); needs the config 2 switch Linux does (DOCUMENTED) | input 2 is free, **`system:capture_2` is already on the JACK graph** (MEASURED) | `hw:CARD=Pro,DEV=1` capture (interface 5) exists and is idle (MEASURED). **Whether it is the S/PDIF input in 16 bit mode is UNCONFIRMED**: `quirks.c` treats interface 5 as the digital input interface in the 24 bit modes (DOCUMENTED); the Audiophile USB's documentation maps its devices the other way round ([audiophile-usb.rst](https://raw.githubusercontent.com/torvalds/linux/master/Documentation/sound/cards/audiophile-usb.rst)), so the sibling cannot settle it | DIN in is there, ALSA client 40 (MEASURED) |
| Pico side | **TinyUSB host has no audio class**: CDC, vendor serial, HID, MSC, MIDI and hubs only (DOCUMENTED, [README](https://raw.githubusercontent.com/hathach/tinyusb/master/README.rst)); its host transfer API is control, bulk and interrupt, **no isochronous** (DOCUMENTED, [usbh.h](https://raw.githubusercontent.com/hathach/tinyusb/master/src/host/usbh.h)). Pico-PIO-USB has **no isochronous** either (READ, `plan-pico.md` §8.3). So a UAC1 host driver and iso transfers would be written from scratch | §3.5: PWM and an RC filter (€3, Oomipood) or a PCM5102A (by post) | pico-extras has `pico_audio_spdif` (a PIO program, DMA, 44.1 and 48 kHz constants, divider from sysclk), with a comment in `audio_spdif.c` reading *"TODO... not completing stereo audio connection properly!"* (DOCUMENTED, [audio_spdif.c](https://raw.githubusercontent.com/raspberrypi/pico-extras/master/src/rp2_common/pico_audio_spdif/audio_spdif.c)). Its RP2350 status was not found. Coax needs a resistor divider and a capacitor to reach about 0.5 V into 75 ohm (UNCONFIRMED values) | a UART at 31,250 baud on GP0, which the router already does (READ, `rig/pico/firmware/README.md:37`), plus the DIN out circuit: two resistors and a socket, **not bought** |
| power | the card wants **200 mA from the bus** (MEASURED); the Pico would pass 5 V through VBUS, which the router's breadboard plan already does (pin 40, `HANDOFF.md:571`), UNCONFIRMED with this card | none | none | none |
| clock | the host would have to match the card's adaptive endpoint | the card's own ADC clock, the same as the Circuit's: **no resampling** | S/PDIF carries the Pico's clock; a PIO divider gives about 48 kHz, not exactly, so either the card locks to it (UNCONFIRMED) or the samples slip against jackd's clock on DEV=0, and capturing DEV=1 while jackd owns DEV=0 is `alsa_in`, the resampling `babab4eb` removed | n/a |
| what the Pi loses | **the card itself**: one USB device has one host, so the Circuit capture and the board's whole audio path leave with it | nothing; input 1 stays the Circuit | nothing, if DEV=1 can be opened beside DEV=0 at full speed (UNCONFIRMED; the bus has room: two 200 byte streams) | nothing |
| work | weeks, and a driver nobody publishes | a cable and one bay link: `system:capture_2 -> posboard:input_1` (or into the granulator) and a `BOARD_INPUTS`-style name for it | a resistor network, an S/PDIF firmware port, and a measurement of DEV=1 | a DIN circuit, or none at all if the Pico is a USB MIDI device in the Pi's hub instead (§3.6), which is simpler than DIN |
| quality | n/a | PWM about 10 to 11 bits, the card's ADC at 16 bit; a DAC module gives the card's own floor (the Circuit's floor on this input chain measured **-79.8 to -80.6 dBFS** idle, `babab4eb`) | bit exact, no analog stage | n/a |
| verdict | **no** | **yes, first** | **maybe, second**, if DEV=1 proves to be S/PDIF in and clocking is clean | **yes, but it is not a sound source**; and USB MIDI beats DIN for this |

⚠️ **THE FAST TRACK PRO'S INPUTS ARE MIC AND INSTRUMENT COMBO INPUTS WITH A
GAIN KNOB** (UNCONFIRMED from the product's known front panel, not read today).
A PWM line out of about 1 V peak after the filter into an instrument input
needs the gain near minimum; a PCM5102A's 2.1 Vrms will need a pad. Measure
the input 2 level with nothing plugged first, the way `babab4eb` measured the
idle floor, so a later reading means something.

### 4.3 Recommendation for the soundcard

**The Pico into analog input 2**, PWM first (about €3 of parts at Oomipood plus
a 3.5 mm to 6.35 mm cable), a PCM5102A by post when quality matters. In the
patchbay that is `pico-1:sampler:audio-out -> pi-1:capture_2:audio-in`, and the
Pi already does everything after that. Hardware: a Pico 2 (€8.20, no radio,
Oomipood) or the desk's Pico 2 W, two resistors and two capacitors, a jack, and
a cable. **And it is §5.3 of `plan-pico.md` arriving at the same answer:**
*"As a local output into the Pi's audio interface ... This is the only path
that works."* What this plan adds is that the input is free and already on the
graph today.

## 5. Recommendation, order and costs

| step | what | cost | settles |
| --- | --- | --- | --- |
| 1 | **Pi node sampler**, `source: 'sampler'`, after the browser group lands; the map lifted into one shared `demo/shell/` module | 1 to 2 days; €0; nothing installed | the same instrument on the Pi, program change, `file-in` from R2 cached on the SD card. Measure CPU at 16, 32, 64 voices on the board and replace §2.3's estimate |
| 2 | the owner chooses a), b) or c) of §2.2 | a conversation | whether a sampler and Yoshimi can be up at once |
| 3 | **Pico sampler library in C**, pure, no SDK, WAV render in `gcc:14`, the ADPCM image packer, the wasm twin in an AudioWorklet | 2 to 3 days; €0; no board | the sound of the firmware's DSP in a browser |
| 4 | an RP2040 UF2 in rp2040js: cycles per voice, then the live audio experiment with `speed` printed beside it | 1 day | whether the emulator can play it live (§3.7) |
| 5 | **the Pico on input 2 with PWM** | an afternoon; about €3 to €12 | a real sampler on the desk, captured like the Circuit. Measure input 2's idle floor first |
| 6 | a PCM5102A by post | €3 to €10 plus post, a week or two of waiting | 16 bit quality on the same input |
| 7 | sfizz built in an arm64 container, with `a2jmidid`: **this is `sampler/030`, already started and blocked on exactly this** | 1 to 2 days plus the owner's yes to an install | the granulator insert and bay links for a sampler; the author's crossfading Rhodes |
| 8 | only if wanted: S/PDIF | 1 to 2 days | needs DEV=1 measured first |

Refused, and why:

- **The Pico as the Fast Track Pro's USB host.** No UAC host class and no
  isochronous host transfers in TinyUSB or PIO-USB (DOCUMENTED), and it would
  take the card away from the Pi, and the Circuit capture with it.
- **Streaming the Pico's audio over wifi.** Already priced in `plan-pico.md`
  §5.3: at the measured UDP ceiling for one stream, with no WebSocket figure.
- **Reviving FluidSynth as the default sampler.** It is installed, it takes
  ALSA MIDI and program change natively, and it measured 12.3 per cent and
  74 ms here, but it left on a recorded instruction, and the reason (one
  capture, one source) applies to any sampler; reversing that is the owner's
  call, not a plan's. ⚠️ **And it IS installed on the Pi right now, 2.4.4,
  while `packages.txt` says the board must not get it back.** Which package
  pulled it in was not checked (read only, and `apt-cache rdepends` was not
  run).
- **Running anything on the Pi today beyond reading.** No `arecord` on
  `DEV=1`: opening a second capture on a card whose first capture is live is
  a change to the running board, not a read.

## 6. What could not be settled

| question | why not | what settles it |
| --- | --- | --- |
| node sampler CPU on this Pi at 16 to 64 voices | not built | a bench on the board, as `bench.mjs` did for moog |
| sfizz CPU at 30 to 60 voices on this Pi | not installed, not in apt for arm64 | `sfizz_render` on a fixed MIDI file, built in an arm64 container |
| sfizz `loprog`/`hiprog` support, and how long `load_instrument` takes | not found in what was read | a test SFZ |
| whether a sampler and Yoshimi may run at once | an owner decision (§2.2) | the owner |
| whether `hw:CARD=Pro,DEV=1` capture is S/PDIF in, at 16 bit, and whether the card locks to an external S/PDIF clock | read only today; the sibling card's documentation maps it the other way | `arecord -D hw:CARD=Pro,DEV=1` with a known S/PDIF source, at a moment the board can be disturbed |
| the input 2 front end (mic, line, instrument) and its idle floor | the panel was not looked at | look at the card; record input 2 with nothing plugged |
| voices per core on an RP2350 for this sampler, with and without wifi, and XIP stall cost | no board run | step 4 then step 5 |
| whether rp2040js keeps real time on a WFI sampler | not built | step 4 |
| whether every part on the HANDOFF shopping list is on the desk | not asked | the owner |
| a reliable Estonian source for a PCM5102A | only aggregator listings found today; Oomipood had none on 2026-10-04 | open TME and Farnell through Oomipood in a browser, or order abroad |
| why FluidSynth is installed on the Pi | read only | `apt-cache rdepends --installed fluidsynth` and `apt-mark showmanual` |
| the Fast Track Pro's power when hosted by a Pico | not tried | a USB meter on the cable |
