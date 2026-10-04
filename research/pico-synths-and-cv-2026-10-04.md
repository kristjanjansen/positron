# Synths, effects and CV on RP2040 and RP2350, and how to hear them before the hardware (2026-10-04)

> Asked 2026-10-04: *"look at the synths and general effect and CV and
> modulation stuff which can be built on that chip maybe in the eurorack
> context or those DX7 style stuff look into it what what could we compile
> into it and somehow get the sound out of it or maybe some kind of wave"*.
>
> It stands on `plans/plan-pico.md` §5 (sound) and §8.4 (CV), which already
> list picoX7, PicoDexed, Pico2Dexed, arduinoMI, PRA32-U2,
> PicoVintageSynthCollection, picoDSP, AMY, PicoADK and Mozzi with their
> claimed numbers. This file does not repeat those rows; it goes under them:
> what each one is made of, what licence the code that would end up in OUR
> binary really carries, which can be linked into `rig/pico/firmware/` (C, Pico
> SDK 2.2.0, Docker) and which only run as their own UF2, and what the
> emulator can and cannot do with sound.
>
> **Boards at Eurorack voltages are NOT surveyed here.** That is
> `research/pico-open-issues-and-modular-2026-10-04.md` Part B, written the
> same day, which recommends the Music Thing Workshop Computer (an RP2040).
> This file is about the firmware that would run on it, or on the Pico 2 W.
>
> Labels:
>
> - **READ**: opened today, the words are there, URL given. GitHub files and
>   READMEs were read raw with `gh api`; pages through a fetch tool are
>   summaries.
> - **MEASURED**: run today on this machine, in Docker or in rp2040js. Three
>   things were: Plaits and the Reverb+ reverb cross compiled for both chips
>   (sizes), the same two benchmarked on an emulated RP2040, and Node's
>   `setTimeout(0)` rate. Recipe in the appendix.
> - **SECONDHAND**: a search snippet or a page quoting another.
> - **INFERRED**: my reasoning, or arithmetic on READ and MEASURED numbers.

## The verdict, first

1. **The strongest single fact is already in this repository.** `/muta/`
   (https://positron.studio/muta/) runs **Mutable Instruments Plaits compiled
   to WebAssembly in an AudioWorklet**, from two pinned upstream commits and a
   polyphonic C shim (`demo/muta/build/plai_shim.cc`, `plai_note_on`,
   `plai_render`, voice stealing, 16 engines), built in `emscripten/emsdk` in
   Docker with `-O3` and deliberately no `-ffast-math`. **MEASURED today: the
   same shim and the same 31 pinned source files compile unchanged with the
   Pico SDK's `arm-none-eabi-gcc` for both chips** (only `-std=gnu++11`
   instead of `c++11`, because newlib hides `M_PI` under strict C++11). So
   "the sound of the firmware in the browser" is not a project for Plaits: the
   browser half exists and the firmware half is one CMake target.
2. 🔴 **Plaits cannot run on an RP2040. MEASURED in rp2040js: one voice needs
   1.4 to 11.8 times real time on a 125 MHz M0+**, because every float
   operation is software. It is an RP2350 engine (single precision FPU), which
   arduinoMI's README already said in words (READ). This matters because the
   Eurorack board the other research recommends, the Workshop Computer, is an
   RP2040.
3. **Integer DSP does run on the RP2040, and there is a lot of it, MIT, in C,
   on the Pico SDK, at modular voltages already.** The Workshop Computer's 123
   program cards (READ, `info.yaml` of every one: **64 MIT**, 11 GPL, 36 with
   no licence stated) include a Dattorro hall reverb, granular samplers,
   chorus, delays, Turing machines, quantizers, clock dividers, Euclidean and
   Grids style sequencers, a 303 sequencer, a Karplus-Strong resonator and USB
   audio. **MEASURED: Reverb+'s integer Dattorro reverb takes 43 % of an
   emulated 125 MHz RP2040 core** for 48 kHz mono in, stereo out.
4. **DX7: picoX7 is the one to compile.** MIT, its own integer OPS and EGS
   model (not Dexed, not MSFA), RP2040 and RP2350, 16 voices on two cores at
   191.08 MHz, and it **already has a native build and a VST3 build** (READ),
   so a WebAssembly build is a port, not a rewrite. 🔴 **Every Dexed based port
   (PicoDexed, Pico2Dexed) is GPL-3.0 in the binary even though both repos say
   MIT**, because they link Synth_Dexed, whose README says *"MicroDexed is
   licensed on the GPL v3"* with only the MSFA part on Apache 2.0 (READ).
   🔴 **And picoX7's ROM patches are Yamaha's**, shipped in `cart/` with a
   licence file that says so; this repository is public, so they stay out of
   it.
5. **AMY is the broadest library and the closest to our shape.** MIT, C, a
   Pico SDK build of its own (`pico_sdk_import.cmake`, a vendored
   `audio_i2s.pio` in `src/pico-audio/`, READ), fixed point tables, a
   Juno-6 and a DX7 patch set, PCM drums, Karplus-Strong, biquads, LFOs,
   envelopes, echo, reverb, chorus, a sequencer, CV triggers, a MIDI mode,
   **and an upstream emscripten build that already runs in an AudioWorklet**.
   Its own matrix: **6 Juno voices on RP2040 at 250 MHz, 8 on RP2350 at
   250 MHz; USB audio on RP2350 only** (READ, issue 354).
6. **Hearing it in the browser: compile the DSP twice, never emulate the
   audio.** The emulator runs the router at 0.6x real time; a synth is heavier
   (MEASURED below: 0.44x flat out in Node with Plaits running), and rp2040js
   **runs PIO on its own `setTimeout` loop, not on the CPU's clock, and has no
   second core and no RP2350** (READ, its source). The honest arrangement is
   the one `/muta/` already proves: the same C source to a `.wasm` for an
   AudioWorklet in `/kit/`, the same C source to the UF2, and a **golden render
   test** that runs both on one fixed note list and compares the samples. The
   emulator's job is narrower and still real: capture what the firmware writes
   to the PIO FIFO or PWM compare register for a few seconds, offline, to prove
   the **firmware's** glue, not the DSP.
7. **CV and modulation is the cheapest thing to build and the most useful on
   this desk**, because it needs no DAC to be useful: an LFO, an envelope, a
   Turing machine or a clock divider is a `value` or `clock` port in the
   patchbay first, a MIDI CC on the DIN second, and a voltage only when there
   is a modular. Written as a small pure C core like `rig/route-core/`, it runs
   bit exactly on the M0+, on the M33, in the emulator and in WebAssembly.
8. **Getting sound out, in Estonia: no I2S DAC module in Oomipood's own stock.**
   Searched today for PCM5102, PCM5102A, PCM5100, UDA1334, UDA1334A, PT8211,
   MAX98357, MAX98357A, CS4344 and "I2S": the only I2S part is an INMP441
   **microphone** (MEASURED, one search each). PWM with an RC filter is the
   only audio output that can be built from shelf parts here today.

## 1. Synth engines

### 1.1 The table

"Into our firmware" means: can the DSP be linked into `rig/pico/firmware/`
(C, Pico SDK, CMake, our own `main.c`, route_core feeding it MIDI) as a
library, or does it only exist as its own UF2. "Twin" means a build of the same
DSP for the browser.

| engine | what | chip | language, build | voices, rate, clock | licence of what lands in the binary | into our firmware | browser twin | label |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Plaits** (Mutable, via `/muta/`'s pinned source) | 16 engines: VA, waveshaping, 2 op FM, grain, additive, wavetable, chords, speech, swarm, noise, particle, string, modal, three drums | **RP2350 only** | C++11, no exceptions, our shim is C ABI | MEASURED: RP2040 cannot (1.4x to 11.8x real time for one voice). RP2350: arduinoMI runs it at 250 MHz (READ); voices at 150 MHz **not measured** | **MIT** (Emilie Gillet, STM32 projects; header READ in `plaits/dsp/voice.cc`), stmlib MIT | **yes, MEASURED to compile** | **exists**, `demo/muta/vendor/plai.wasm` | MEASURED, READ |
| **Braids, Tides v1** (Mutable) | macro oscillator; LFO and envelope | RP2040 and RP2350 | C++ | arduinoMI: *"braids works well on the RP2040/RP2350"* (READ) | **MIT** | yes, same route as Plaits (INFERRED: integer code from an STM32F1 module) | same build script, a third module | READ, INFERRED |
| **Rings, Elements** (Mutable) | modal resonator; full modal voice | RP2350 | C++ | arduinoMI: Rings *"polyphony of 4 on RP2350"*, Elements *"RP2350 only"* (READ). Each declares a **64 KB** reverb buffer (`uint16_t reverb_buffer[32768]`, READ) | MIT | yes, RP2350 | buildable like Plaits | READ |
| **Clouds** (Mutable) | granular | RP2350 | C++ | arduinoMI: *"works with reservations ... 48kHz is pushing it"*. Declares **118,784 + 65,408 = 184,192 bytes** of buffers (READ, `clouds/clouds.cc`), which is 70 % of an RP2040's RAM (INFERRED) | MIT | RP2350 only, and it takes a third of its RAM | buildable | READ, INFERRED |
| arduinoMI wrappers | Arduino sketches around the above | | Arduino IDE 1.8.19 | 250 to 276 MHz | repo says MIT; its README credits Volker Boehm's **mi-UGens**, whose repo carries `gpl-3.0.md` (READ). Whether arduinoMI's wrapper code is derived from GPL code is **not settled** | **do not take the wrappers; take the MIT DSP from upstream**, as `/muta/` already does | | READ |
| **picoX7** (SloeComputers, John Haughton) | DX7: YM21280 OPS and YM21290 EGS models, LFO, pitch EG, SysEx voice load | RP2040, RP2350 | C++ on **PDK**, its own bare metal stack (MTL, UCL), **not the Pico SDK** | 8 voices a core, 16 at 191.08 MHz, 49,096 Hz, I2S or PWM (READ) | **MIT**, PDK MIT. 🔴 `Source/DX7/cart/*.syx` are **Yamaha ROMs**, licence file: *"presumed to be licensed for personal use only"* (READ) | **standalone UF2 today. As a library: a port.** The engine is about 100 KB of self contained C++ headers (`Source/DX7/`, includes only its own files and `<cstdint>`, READ) plus tables generated by Python from PDK | it has a **native SDL2 target and a VST3 target** (READ), so emscripten is a port of the platform layer (INFERRED) | READ |
| PicoDexed, Pico2Dexed | Synth_Dexed (Dexed's MSFA engine) | RP2040; RP2350 | C++, Pico SDK | 10 to 16 notes at 24 kHz, 8 at 48 kHz at 250 MHz; Pico2Dexed 10 notes 44.1 kHz at 250 MHz, *"bubbling and stuttering"* at 150 MHz (READ) | 🔴 **GPL-3.0** via Synth_Dexed ([codeberg](https://codeberg.org/dcoredump/Synth_Dexed), README READ); MSFA part Apache-2.0 | yes, but the firmware becomes GPL-3.0 | Dexed itself is GPL-3.0 | READ |
| **AMY** (Shore Pine Sound Systems) | Juno-6 style VA, DX7 style FM, PCM and 808 samples, wavetable, Karplus-Strong, partials, piano; filters, 2 EGs per osc, LFO by modulation, echo, reverb, chorus, sequencer, CV triggers, MIDI mode | RP2040, RP2350 | **C**, Pico SDK build in `src/` plus Arduino (READ) | RP2040 at 250 MHz: 6 Juno notes; RP2350 at 250 MHz: 8 (READ, [issue 354](https://github.com/shorepine/amy/issues/354)) | **MIT**. ⚠️ `patches.h` carries 391 built in patches named *"DX7 and juno 106"*; their provenance is not stated in what was read | **yes, as a library**: `amy_config.audio = AMY_AUDIO_IS_NONE` and `amy_update()` hands back the next block (READ, `docs/arduino.md`) | **exists upstream**: `make docs/amy.js`, and Tulip Web runs it in an AudioWorklet (READ, README) | READ |
| PRA32-U2 (risgk) | 4 voice subtractive, ZDF state variable filter, chorus, delay/reverb, limiter | RP2350 | Arduino-Pico 6.1.1 sketch | 48 kHz 24 bit I2S, sysclk 153.6 MHz (READ) | **CC0** | the DSP is CC0 so it can be lifted freely; the sketch itself is Arduino, so it is a port | none upstream | READ |
| PicoVintageSynthCollection | ten emulations | RP2350 | C | 444 MHz at 1.60 V (plan-pico READ) | **GPL-3.0** | firmware becomes GPL; overvolted | none | READ |
| picoDSP (Na1w) | mono synth that is a USB audio device | RP2350 | **Rust** | one voice about 45 % of a core (plan-pico READ) | MIT | no, different language | none | READ |
| PicoADK template | FreeRTOS, Vult DSP | RP2350A board | C++ | | **MIT** per GitHub's licence field today (plan-pico §5.1 says BSD-3; one of the two is stale) | it is a template, not an engine | Vult compiles to JS too (SECONDHAND, general knowledge) | READ |
| Pico-DSP-Garden (rudehardware) | header only `rpdsp`: band limited oscillators, SVF, dynamics, Schroeder reverb, envelopes | RP2350, RP2040 | C++ header only, Arduino layout | not stated | MIT | yes, header only | none | READ; **0 stars, first pushed in September 2026**, unproven |
| **Mozzi** | Arduino synth library | RP2040 (RP2350 not mentioned in the code; arduino-pico supports it, INFERRED) | C++ on **arduino-pico only** | 32,768 Hz default, PWM 11 bit default, I2S optional (PT8211 needs LSBJ), **one core** (READ, `internal/config_checks_rp2040.h`) | **LGPL-2.1** | no: it is built on the Arduino core's `PWMAudio`/`I2S` classes | none | READ |
| **CircuitPython `synthio`** | notes, ADSR, LFO blocks, biquads (LP, HP, BP, notch, shelves, peaking) | RP2040, RP2350 | Python on CircuitPython | *"rp2040 ... support up to 12 notes"*, 11,025 Hz default (READ, [docs](https://docs.circuitpython.org/en/latest/shared-bindings/synthio/index.html)) | MIT (CircuitPython) | no: it is a whole firmware | none | READ |
| **Faust** | any DSP written in Faust | RP2350 (FPU) | Faust to C or C++ | | compiler LGPL-2.1; *"The LGPL license of the compiler doesn't apply to the code generated"* (READ, [FAQ](https://faustdoc.grame.fr/manual/faq/)) | **yes in principle**: `faust -lang c` emits a plain C file with `compute()`. There is **no `faust2pico`**; the tool list has `faust2esp32`, `faust2teensy`, `faust2daisy` (READ, repo). RP2040 support is an **open issue since 2022** stuck on fixed point (READ, [#747](https://github.com/grame-cncm/faust/issues/747)) | **`/fau/` already compiles Faust to wasm in the page** (https://positron.studio/fau/) | READ, INFERRED |
| Csound, SuperCollider | | **not on a microcontroller** | | they need an OS, a heap and far more RAM | | no | both already run in this repository's browser pages (`demo/shell/scsynth.mjs`, the Csound pages) | INFERRED |

### 1.2 What the table means for us

- **Linkable into our C firmware, MIT or better, today**: Plaits and the other
  Mutable STM32 modules (straight from upstream, as `/muta/` builds them), AMY,
  the integer Workshop Computer DSP (§2, §3), PRA32-U2's DSP (CC0),
  Faust-generated C. **Standalone only**: picoX7 (own stack), Mozzi and
  PRA32-U2 as shipped (Arduino), synthio (CircuitPython), picoDSP (Rust).
- **GPL in the binary**: anything Dexed (PicoDexed, Pico2Dexed),
  PicoVintageSynthCollection, Turing Machine card 03, Grids card 82, USB audio
  card 06. positron's `LICENSE` is MIT; a GPL engine is fine to run as its own
  UF2 and a decision to link (INFERRED).
- **Other people's sounds**: DX7 ROM cartridges (picoX7 ships them with a
  personal-use notice; AMY's 391 patches are named after DX7 and Juno 106 and
  their source was not read). Build them from an upstream checkout at build
  time like `/muta/` does with source; never commit them here. This is the
  same rule `CLAUDE.md` applies to the Circuit pack, and the reason is the
  same: this repository is public.

### 1.3 Drum machines, granular, Karplus-Strong, samplers, wavetable

All READ from the Workshop Computer `info.yaml` files, all RP2040, all Pico SDK
unless marked:

| kind | card | licence |
| --- | --- | --- |
| drums | `72_motorik` (kick, snare, hat, bass and melody CV), `33_drumdrum` (DFAM style 8 step), `79_Slag` (metallic percussion), `369_Asterisk` (six tracks) | MIT, MIT, MIT, freeware |
| granular | `51_grains` (sampler, live cloud, tape scrub), `53_glitter`, `75_Turing_Clouds`, `34_dual_quant` (granular pitch shifter) | all MIT |
| Karplus-Strong | `21_resonator` | GPL-3.0 |
| samplers, loopers | `67_Fragments` (six slot sampler), `48_two_tracks` (ADPCM in flash), `73_VSS` (6 voice mu-law) | CC0, MIT, none |
| wavetable | `30_cirpy_wavetable` (Plaits, Braids and Microwave tables), `800_graphic_osc` (draw the wave, band limited, FM, sync) | none (CircuitPython), MIT |
| voices | `118_JP8K` supersaw, `91_chorgan` 6 voice chords, `580_Vortex_Runner`, `84_CosmikC1zzl3` phase distortion, `28_eighties_bass` (Mozzi 2) | MIT, MIT, MIT, MIT, none |

Plus Plaits' own drum, string, modal and wavetable engines on RP2350, and AMY's
808 PCM set and Karplus-Strong on both chips.

## 2. Effects

| effect | source | chip | cost | licence | label |
| --- | --- | --- | --- | --- | --- |
| **Dattorro plate/hall reverb, integer** | Workshop `20_reverb`, `reverb_dsp.c` (12 KB of C): *"Integer-arithmetic reverb for RP2040 ... (a*b)>>16 ... single-cycle multiply"*, derived from el-visio/dattorro-verb (MIT) | RP2040 | its README: *"DSP runs in around 12us, out of 20.8us per sample"* at 192 MHz. **MEASURED in rp2040js: 4,800 samples in 42.8 ms of board time at 125 MHz, 43 % of a core, about 1,115 cycles a sample** | MIT | READ, MEASURED |
| Schroeder reverb | Pico-DSP-Garden `rpdsp` | RP2350 | not stated | MIT | READ |
| reverb, echo, chorus | AMY (`delay.c`, reverb and chorus in its feature list) | both | inside AMY's voice budget | MIT | READ |
| chorus and delay/reverb, limiter | PRA32-U2 | RP2350 | inside 4 voices at 153.6 MHz | CC0 | READ |
| clocked lo-fi reverb and delay | `17_COMET` | RP2040 | | MIT | READ |
| stereo chorus and vibrato | `58_LoChoVibes` | RP2040 | | MIT | READ |
| fuzz and wah | `76_hot_fuzz` | RP2040 | | MIT | READ |
| six stage multi FX, glitch looper, degradation (bitcrush) | `45_bends`, `50_flux`, `57_glitch`, `71_degenerator` | RP2040 | | MIT | READ |
| dub delay, shimmer, tape | `818_Bibesque`, `999_Dub_Warning` (PT2399 style) | RP2040 | | MIT | READ |
| frequency shifter, ring mod, LPG, spectral bank | `35_FreqShift` (none), `202_ScaryLingo` (MIT), `81_West_Coast_LPG` (none), `103_spectral` (MIT) | RP2040 | | as listed | READ |
| Freeverb | the classic is float, eight combs and four allpasses, about 25,000 samples of delay at 44.1 kHz | RP2350 with the FPU | **not measured** | public domain (SECONDHAND, general knowledge) | SECONDHAND |

**RAM, INFERRED from the numbers above.** RP2040 has 264 KB, RP2350 520 KB.
The router's bss is 11 KB (READ, README). A Plaits voice is about **21 KB**
(MEASURED: 170,488 bytes of bss for the shim's 8 voices, about 47,500 for 2
with the SDK). A Rings or Elements reverb is 64 KB, Clouds 184 KB. One second
of 48 kHz 16 bit mono delay is 96 KB. So: on RP2040, integer effects with
delays up to about a second; on RP2350, Plaits voices plus a reverb plus a
second of delay with room left for wifi.

## 3. Modulation and CV

### 3.1 What already exists as RP2040 firmware

All READ (Workshop Computer `info.yaml` and sources, `gh api`):

| job | card or source | licence | note |
| --- | --- | --- | --- |
| **Turing machine** | `turingmachine.h` inside `20_reverb` (about 1 KB) | **MIT** | the MIT one. Card `03_Turing_Machine` and `93_Turing_Matrix` are **GPL-3.0-or-later** |
| Bernoulli gate, clock divider | `bernoulligate.h`, `divider.h`, `clock.h` inside `20_reverb` | MIT | about 1 KB each |
| Marbles style random | `174_Skipping_Stones` | MIT | |
| chaotic quad LFO with VCAs | `23_SlowMod` | none stated | |
| polyrhythmic timing and modulation (Pamela's Workout style) | `26_clockwork` | MIT | |
| CV delay (Multimod style) | `14_cvmod` | MIT | |
| quantizers | `89_Lockstep`, `34_dual_quant`, `55_fifths` | MIT, MIT, none | |
| sequencers | `303_acid`, `19_CA_Sequencer` (cellular automata), `60_markov`, `16_the_bells` (change ringing), `82_Computer_Grids` | MIT, MIT, MIT, none, **GPL** | Grids is GPL because Mutable's AVR code is GPL-3.0 (READ, eurorack README: *"Code (AVR projects): GPL3.0"*) |
| VC clock divider and comparator | `09_DivCom` | none | |
| MIDI to CV, USB host to CV | `00_Simple_MIDI`, `92_usb_midi_host_synth` | MIT, MIT | |
| crow protocol, live Lua | `41_blackbird` | GPL-3.0 | |
| CV in to note events | AMY `cv_trigger.c` | MIT | thresholds, 1 V/oct scale and offset |
| **the hardware library** | ComputerCard (Chris Johnson): fixed 48 kHz `ProcessSample()`, knobs and CV smoothed, MCP4822 audio out, PWM CV out, EEPROM calibration for MIDI note CV, second core free | **MIT** (READ, its `LICENSE`) | `set_sys_clock_khz(144000, true)` *"to minimise ADC input noise"* |

Mutable's own modulation sources on the bigger chip: **Tides** (MIT, runs on
RP2040 per arduinoMI), and Marbles and Stages (MIT STM32 projects, float, so
RP2350; INFERRED, not tried).

### 3.2 How it leaves the chip

From plan-pico §8.4 (READ there), with two additions:

| path | resolution | for | parts | label |
| --- | --- | --- | --- | --- |
| `value` port over wifi | float | the patchbay | none | INFERRED (`bay.mjs` MEDIA has `value` and `clock`, READ) |
| MIDI CC on DIN | 7 bit (14 with NRPN) | the Circuit's knobs | the router's DIN out, exists | INFERRED |
| PWM plus RC | about 11 ms settling for 8 bit ripple at 32 kHz | slow modulation | a resistor and a capacitor | READ (plan-pico) |
| PWM, two pole, delta-sigma calibrated | *"about 15 bit"*, 11 bit PWM at 60 kHz | pitch | what the Workshop Computer does | READ (other research, B2) |
| MCP4822 on SPI | 12 bit, 2 channels | pitch | Farnell via Oomipood, €6.17, 8 Oct | READ (plan-pico) |
| **MCP4725 I2C module** | 12 bit, **1 channel** | one CV | **€10.50 at Oomipood**, own stock (READ, [link](https://www.oomipood.ee/product/1kanaliga_12_bit_dac_i2c_moodul_mcp4725)); shares GP4/GP5 with the OLED at another address (INFERRED) | READ |

## 4. Getting sound out

| path | quality | parts, Estonia | fits our firmware | label |
| --- | --- | --- | --- | --- |
| **PWM** | about 11 bits; pico-extras `audio_pwm` at 22,058 Hz; supply noise the worst offender (plan-pico READ). PicoDexed's PWM build is *"only 8-note polyphonic and requires additional filter circuitry"*, *"not recommended"* (READ) | a pin, an RC filter, a 3.5 mm jack (€2.50 Oomipood, plan-pico) | yes, `hardware_pwm` and DMA, both in the SDK we build | READ |
| **I2S DAC by PIO** | 16 to 24 bit, 48 kHz; needs a sysclk that divides cleanly (picoX7 191.08 MHz, PRA32-U2 153.6 MHz, ComputerCard 144 MHz) | 🔴 **none in Oomipood's own stock** (MEASURED: ten searches, only the INMP441 mic). Adafruit PCM5102 (6250) and PCM5100 (6251) are named by PRA32-U2 (READ); Pimoroni Pico Audio Pack is named by PRA32-U2 and Pico2Dexed (READ). Neither shop was priced today. Oomipood's partner catalogues (TME, Farnell) render results with a script and could not be searched with one request | `pico_audio_i2s` from pico-extras (BSD-3), or AMY's vendored copy | MEASURED, READ |
| PT8211 | 16 bit, LSBJ format | not in Oomipood stock (MEASURED) | Mozzi documents the LSBJ need (READ) | |
| **USB audio class** | UAC1 at full speed; Workshop card `06_usb_audio` does 6 channels on an RP2040 (READ, other research); AMY: USB audio on RP2350 yes, RP2040 no (READ, issue 354) | the USB socket | TinyUSB is in the SDK but **not initialised** in our image (plan-pico §2) | READ |
| **into the patchbay** | the Pi's capture of the Pico's line out, which makes it a `BOARD_INPUTS` entry, an `audio` out port, exactly like the Circuit (plan-pico §5.3 and the other research B5, both READ) | a cable | nothing new on the network | READ |

🔴 **The USB socket conflict stands** (plan-pico §9.3): the router is a USB
host, USB audio needs it as a device. A synth on its own Pico 2 is the clean
answer, and it is €8.20 (plan-pico §11).

## 5. Hearing it before the hardware

### 5.1 What the emulator can and cannot do with sound

Read today in `rig/pico/sim/node_modules/rp2040js` 1.4.0 (MIT):

- **PWM is emulated and observable.** `PWMChannel` has `cc` and `top`
  registers; a write to `CHn_CC` sets `ccUpdated`; DMA has `DREQ_PWM_WRAP0` to
  `7`, and `pwm.js` raises it on wrap. So a firmware that feeds PWM by DMA runs,
  and patching `writeRegister` captures every sample it writes (READ).
- **PIO is emulated, but not on the CPU's clock.** `RPPIO.run()` does 1,000
  `step()`s and then `setTimeout(() => this.run(), 0)`; `clkDivRestart` prints
  *"not implemented"* (READ, `peripherals/pio.js`). **MEASURED: Node gives
  `setTimeout(0)` 787 times a second**, so PIO runs about 0.79 million
  instructions a second whatever the CPU is doing. pico-extras' I2S program
  spends about two PIO instructions a bit, and 48 kHz stereo 16 bit is 1.536
  Mbit/s, so **about 3 million PIO instructions per second of audio: about a
  quarter of real time from PIO alone in Node, less in a browser worker**
  where nested timers clamp (INFERRED arithmetic). And because it is decoupled,
  the CPU blocks on a full FIFO at a rate that has nothing to do with 48 kHz.
- **One core, RP2040 only** (the sim README says both). picoX7 puts 8 voices on
  each core; under the emulator half of it never runs. Every RP2350 only
  engine (Plaits, Rings, Elements, Clouds, Pico2Dexed, PRA32-U2) **cannot be
  emulated at all**.
- **Speed. MEASURED today:** the bench firmware below ran 2,224.7 ms of board
  time in 5.1 s of wall time in Node, **0.44x real time flat out** (the router
  manages about 0.6x, `pico-worker.mjs`). And the DSP itself, timed by the
  firmware inside the emulator, on a 125 MHz M0+:

| what | audio | board time | load on one core | label |
| --- | --- | --- | --- | --- |
| Reverb+ integer Dattorro, mono in, stereo out | 4,800 samples, 100 ms | 42.8 ms | **43 %** | MEASURED (rp2040js cycle model) |
| Plaits, 1 voice, virtual analog | 480 samples, 10 ms | 54.8 ms | 548 % | MEASURED |
| Plaits, FM | 10 ms | 69.1 ms | 691 % | MEASURED |
| Plaits, additive | 10 ms | 117.0 ms | 1,170 % | MEASURED |
| Plaits, modal | 10 ms | 117.7 ms | 1,177 % | MEASURED |
| Plaits, hi-hat | 10 ms | 47.7 ms | 477 % | MEASURED |
| Plaits, cheapest of 16 (speech, probably near silent here) | 10 ms | 13.6 ms | 136 % | MEASURED |

⚠️ rp2040js costs instructions by its own model (the sim README says timing is
approximate, at a flat 125 MHz) and does not model XIP flash stalls, so these
are an emulator's numbers, not a board's. The reverb's 43 % at 125 MHz against
its author's *"12us out of 20.8us"* at 192 MHz on a real RP2040 (that figure
includes the rest of the card's interrupt) is the same order of magnitude,
which is the only cross check available today.

### 5.2 The recommendation: one source, two compilers, one golden test

1. **The DSP is a pure C library with no SDK in it**, the way
   `rig/route-core/` is: `init(rate)`, `note_on`, `note_off`, `set_param`,
   `render(out, frames)`. Plaits already is this (`plai_shim.cc`); AMY already
   is (`amy_update()`); a modulation core would be written this way.
2. **The browser build** is `emscripten/emsdk` in Docker (already pulled here,
   2.41 GB), `STANDALONE_WASM`, no JS glue, loaded into an AudioWorklet the
   way `/muta/` does it, beside the emulated board in `/kit/`
   (https://positron.studio/kit/). The keys and MIDI that drive the emulated
   router also drive the worklet, so pressing a key on the emulated board is
   heard. **That is the sound of the firmware's DSP, honestly labelled as
   such.**
3. **The firmware build** links the same files into the UF2.
4. **The golden render**: one fixed note list rendered to a WAV by (a) the
   `gcc:14` container natively, (b) the wasm in Node, (c) for RP2040 builds,
   the emulator, offline, by capturing the PWM compare writes or the I2S words
   (replacing rp2040js' PIO stepping with a fake I2S sink that pulls one frame
   per 1/48,000 s of board time and raises the DREQ, so the samples come out at
   the board's own pace). Integer DSP should match bit for bit; float DSP is
   IEEE single on both M33 and wasm but the compilers may contract or reorder
   differently, so it is compared with a tolerance and the difference
   reported (INFERRED; `/muta/`'s build already refuses `-ffast-math` for this
   exact reason, READ).
5. **What the emulator is for, then**: proving the glue. That a note on the DIN
   reaches `note_on`, that DMA keeps the output fed, that the screen shows the
   patch, that a voice is stolen. Offline renders of a few seconds, not live
   sound. At 0.44x and less, live audio from the emulator would stutter, and
   for anything RP2350 it cannot run at all.

Rejected: streaming emulated PWM or PIO into WebAudio in real time. Too slow by
2x for the CPU and about 4x for PIO in Node (above), wrong chip for the best
engines, one core only.

## 6. Ranked shortlist: what positron should compile first

| rank | what | node in the patchbay | chip | parts beyond the board | why |
| --- | --- | --- | --- | --- | --- |
| **1** | **`mod-core`: our own pure C modulation library** (LFO with shapes and sync, ADSR, S&H and random with a Bernoulli gate, a Turing machine shift register, clock divider and multiplier, Euclidean rhythm, scale quantizer), written like `rig/route-core/`, reading Reverb+'s MIT `turingmachine.h`, `bernoulligate.h` and `divider.h` as reference | a **value** node: `clock` in, `value` and `clock` outs; inside the firmware also a CC source on the DIN out | RP2040 and RP2350, integer | **€0** | runs on both chips and so **runs in the emulator bit exactly**; costs a few per cent of a core (INFERRED); useful today with no modular, because a `value` port can drive the Circuit's filter over the existing DIN or a page's parameter; and it is the CV half of a future Workshop Computer card. Tests in `gcc:14` with vectors, like route-core |
| **2** | **Plaits on a Pico 2**, from `/muta/`'s pinned source and shim | a **synth** node: `midi` in, `audio` out (through the Pi's capture) | RP2350 | PWM out first: two resistors, a capacitor, a jack, about €3 (INFERRED from plan-pico prices); a PCM5102A board from abroad later | **the browser twin already exists and is deployed** (https://positron.studio/muta/); **MEASURED to compile for the M33** with the Pico SDK compiler; MIT; 16 engines including the FM, string, modal and drum ones. What is unknown is voices at 150 MHz (arduinoMI uses 250) |
| **3** | **AMY** as the general polyphonic synth | `midi` in, `audio` out | RP2350 first (8 Juno voices at 250 MHz), RP2040 possible (6) | as rank 2 | Juno and DX7 style in one MIT C library with its own Pico SDK and emscripten builds, and a MIDI mode, so the same patches sound in a worklet and on the board. Ranked under Plaits only because the twin is upstream's, not ours yet, and the patch provenance needs reading first |
| **4** | **picoX7** as its own UF2 on a second Pico 2 | a hardware instrument at the end of the router's DIN out, like the Circuit | RP2350 or RP2040 | I2S DAC (abroad) or PWM; picoX7 has both builds | it **is** the DX7 that was asked for, MIT, an afternoon as a standalone UF2 (plan-pico); bringing its engine into our firmware or into wasm is a port of PDK's platform layer. ROM patches are fetched at build time, never committed |
| **5** | **Reverb+'s integer Dattorro reverb** as a stage after rank 2 or 3 | part of the synth node; an `audio` in effect node only with an ADC or USB audio | RP2040 (MEASURED 43 % at 125 MHz) and RP2350 | none | MIT, one 12 KB C file, measured here today; makes a dry voice sound finished |

**Not now, and why**: Clouds and Elements (RAM, and nothing they add over rank
2 yet); anything Dexed (GPL in the binary and picoX7 is MIT); Mozzi, synthio
and PRA32-U2 as shipped (whole firmwares on other stacks; PRA32-U2's CC0 DSP is
the one worth reading later); PicoVintageSynthCollection (GPL, 444 MHz at
1.60 V); Faust on the Pico (no target exists, and the C it emits has never been
timed on an M33; worth one experiment because `/fau/` would then be the
editor, but not first); Csound and SuperCollider (not microcontroller
software).

## 7. Parts and costs for ranks 1 to 3

| part | price | where | label |
| --- | --- | --- | --- |
| Pico 2 (synth board, separate from the router) | €8.20 | Oomipood, 1 at Peterburi tee, 3 at Järve | READ (plan-pico §11) |
| Pico 2 W (the router and network node, for rank 1) | €12.00 | Oomipood | READ (plan-pico §11) |
| 3.5 mm jack, switched | €2.50 | Oomipood | READ (plan-pico §11) |
| resistors and capacitors for a PWM filter | cents | Oomipood | INFERRED |
| MCP4725 I2C DAC module (one CV out, for rank 1 later) | €10.50 | Oomipood own stock | READ |
| PCM5102A I2S board | not found in Estonia | Adafruit 6250 or a GY-PCM5102 module, by post | MEASURED (absence), READ (names) |

**Rank 1 needs nothing.** Ranks 2 and 3 need about €11 for a first listen over
PWM, and an I2S board by post for real quality.

## 8. What could not be settled

| question | why not | how to settle |
| --- | --- | --- |
| Plaits voices on an RP2350 at 150 MHz, and with wifi on | no M33 emulator; no board | flash the rank 2 build, time `plai_render` with `time_us_64()` as in the appendix, on the real chip |
| Whether the emulator's cycle model matches a real RP2040 | only one cross check, of a different interrupt | run the same bench UF2 on a Pico and compare |
| Whether arduinoMI's wrappers carry GPL code from mi-UGens | the repos' licences disagree in spirit; the files were not compared | diff the wrappers against `v7b1/mi-UGens`, or take only upstream DSP (recommended) |
| Where AMY's 391 DX7 and Juno patches come from | `patches.h` says *"Automatically generated"* and nothing more in what was read | read AMY's generator script under `scripts/` |
| Whether picoX7's engine needs more of PDK than its tables | only the includes of `Source/DX7/` were read | clone and build its native target in `gcc:14` |
| PCM5102A, UDA1334A, PT8211 anywhere in Estonia | Oomipood's TME and Farnell catalogue pages fill their results with a script; hind.ee answered a Cloudflare challenge (403) | open the catalogues in a browser, or order from Adafruit or Pimoroni |
| PicoADK template licence: MIT or BSD-3 | GitHub's field says MIT today, plan-pico says BSD-3 | read its `LICENSE` file |
| Faust generated C on an M33 | never tried by anyone found | `faust -lang c` on one `/fau/` preset, link it into the bench below for `pico2` |
| How fast the browser worker runs PIO | Node measured; a worker's nested timer clamp is SECONDHAND general knowledge | the same `setTimeout` loop inside `pico-worker.mjs` |

## Sources read today (every READ above points at one of these)

| source | URL |
| --- | --- |
| Mutable Instruments eurorack (licence section, `plaits/dsp/voice.cc`, buffer sizes) | https://github.com/pichenettes/eurorack |
| stmlib | https://github.com/pichenettes/stmlib |
| arduinoMI | https://github.com/poetaster/arduinoMI |
| mi-UGens | https://github.com/v7b1/mi-UGens |
| picoX7 (moved to SloeComputers), its `Source/DX7/` and `cart/LICENSE` | https://github.com/SloeComputers/picoX7 |
| PDK | https://github.com/SloeComputers/PDK |
| PicoDexed | https://github.com/diyelectromusic/picodexed |
| Pico2Dexed | https://github.com/nyh-workshop/pico2dexed |
| Synth_Dexed | https://codeberg.org/dcoredump/Synth_Dexed |
| Dexed | https://github.com/asb2m10/dexed |
| AMY, its README, `docs/arduino.md`, `src/` listing, `patches.h`, `cv_trigger.c` | https://github.com/shorepine/amy |
| AMY feature matrix | https://github.com/shorepine/amy/issues/354 |
| PRA32-U2 | https://github.com/risgk/digital-synth-pra32-u2 |
| PicoVintageSynthCollection | https://github.com/Michi71/PicoVintageSynthCollection |
| picoDSP | https://github.com/Na1w/picoDSP |
| PicoADK template | https://github.com/DatanoiseTV/PicoADK-Firmware-Template |
| Pico-DSP-Garden | https://github.com/rudehardware/Pico-DSP-Garden |
| Mozzi, `internal/config_checks_rp2040.h`, `MozziGuts_impl_RP2040.hpp` | https://github.com/sensorium/Mozzi |
| Mozzi RP2040 page | https://sensorium.github.io/Mozzi/doc/html/hardware_rp2040.html |
| CircuitPython synthio | https://docs.circuitpython.org/en/latest/shared-bindings/synthio/index.html |
| Faust (licence, `architecture/`, `tools/faust2appls/`) | https://github.com/grame-cncm/faust |
| Faust FAQ | https://faustdoc.grame.fr/manual/faq/ |
| Faust RP2040 request | https://github.com/grame-cncm/faust/issues/747 |
| Workshop Computer (123 `releases/*/info.yaml`, ComputerCard) | https://github.com/TomWhitwell/Workshop_Computer |
| Reverb+ card (`reverb_dsp.c`, `reverb.c`, README) | https://github.com/TomWhitwell/Workshop_Computer/tree/main/releases/20_reverb |
| ComputerCard | https://github.com/TomWhitwell/Workshop_Computer/tree/main/Demonstrations%2BHelloWorlds/PicoSDK/ComputerCard |
| dattorro-verb | https://github.com/el-visio/dattorro-verb |
| rp2040js (read in `rig/pico/sim/node_modules`, 1.4.0) | https://github.com/wokwi/rp2040js |
| TinyUSB | https://github.com/hathach/tinyusb |
| pico-extras | https://github.com/raspberrypi/pico-extras |
| Oomipood search (the form `product/search?q=`) | https://www.oomipood.ee/product/search?q=MCP4725 |
| MCP4725 module | https://www.oomipood.ee/product/1kanaliga_12_bit_dac_i2c_moodul_mcp4725 |

## Appendix: the measurement, so it can be repeated

Nothing was added to the repository except this file. The bench lived in the
session scratchpad:

- **Sources**: `demo/muta/build/plai_shim.cc` with `kMaxVoices` set to 2, the
  31 files listed in `demo/muta/vendor/PROVENANCE-plai.json` from
  `tmp/plai-src/euro` (Plaits `9739c02`, the pinned checkout `/muta/` builds
  from), and `reverb_dsp.c`/`.h` from Workshop Computer `releases/20_reverb`.
- **Build**: `positron-pico-sdk:2.2.0`, a ten line `CMakeLists.txt` with
  `pico_stdlib`, `-O2`, `-fno-exceptions -fno-rtti` for C++,
  `CMAKE_CXX_EXTENSIONS ON`, stdio on UART0, for `PICO_BOARD=pico` and `pico2`.
- **Sizes, MEASURED**: RP2040 text 223,824, bss 47,880; RP2350 text 206,056,
  bss 47,492 (Plaits with 2 voices, the reverb, the SDK). A bare link of the
  shim with 8 voices: M33 text 181,280, bss 170,488; M0+ text 202,164.
- **Bench**: `main()` prints `clk_sys` (125,000,000), runs 4,800 reverb samples
  of LCG noise between two `time_us_64()` calls, then for each of the 16
  engines sets `plai_set_param(0, engine)`, `plai_note_on(60, 1, 1)`, renders
  one 480 frame block to warm up and times the second.
- **Run**: the UF2 loaded into rp2040js 1.4.0 with the B1 bootrom from
  `rig/pico/sim/firmware/`, UART0 bytes read with `onByte`, in Node.

Cost of this research: about 70 `gh api` calls, 6 page fetches, 3 web
searches, 21 Oomipood search requests one at a time, 3 hind.ee requests (all
403), 4 Docker compiles, 1 emulator run, and one HEAD-style request per link in this file to check it answers (all 200). No broadcaster or media server was
touched. Nothing was bought, flashed or plugged in.
