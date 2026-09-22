# plan-vcv-modules: VCV Rack's open source modules, headless, on a Pi, and in a browser

**Written 2026-09-22.**

🔴 **THIS DOCUMENT IS WRITTEN FROM DOCUMENTATION AND SOURCE READING, NOT FROM A
RUNNING BUILD.** Nothing in it was compiled, installed or measured on this desk.
No Rack binary was downloaded, no SDK was fetched, no `make` was run, and no
module was loaded. Every number below came from a published source with a date
on it, and the section `What would turn each reading into a fact` says exactly
what would have to be installed, built or plugged in.

Legend, used on every claim:

| mark | meaning |
|---|---|
| 📄 | DOCUMENTED. Read in a source with a date, quoted or cited below. |
| 📏 | MEASURED. Somebody ran it and recorded a number. Says who and when. |
| ⚖️ | INFERRED. A conclusion drawn here from the two above, not stated by any source. |
| ⚠️ | A trap, or a place where the obvious reading is wrong. |

## 1. Answer first

**The five questions, answered in one line each, with the section that proves
it.**

| asked | answer |
|---|---|
| how does a module run? | one C++ class per sample inside one process, and `include/engine/Module.hpp` has **no GUI header in it at all**. §2 |
| headless on macOS or Linux? | **yes, three different ways**, and only the third is interesting. §4 |
| on a Pi, against ALSA? | **VCV ships no ARM64 Linux build and the SDK 404s.** Cardinal ships a prebuilt `linux-aarch64` binary today. §7 |
| can we run them here? | **not on this laptop.** On the board or in a browser tab, yes. §8 |
| in a browser? | **shipped, and it is a deprecated `ScriptProcessorNode` on the main thread**, not an AudioWorklet. §9 |

🔴 **AND THE ONE SENTENCE THAT MATTERS MORE THAN ANY OF THEM: THE BEST PARTS OF
THE VCV ECOSYSTEM WERE NOT WRITTEN FOR VCV, AND THOSE ARE THE PARTS THAT COME
OUT FOR FREE.** Mutable Instruments' `plaits`, `rings`, `clouds`, `elements`
and `marbles` are **MIT** licensed STM32 firmware that Rack consumes as a git
submodule, and the Rack adapter for Plaits is **391 lines** whose entire contact
with the DSP is six. 529 Airwindows effects sit behind a **MIT** base class
whose only includes are `<cstdint> <cassert> <cstring> <stdio.h> <cmath>`.
**Nothing has to be separated. Somebody already did.** §5.

📏 **THE NUMBERS THIS DOCUMENT MEASURED TODAY**, all from a public API or an
HTTP HEAD, none from memory:

| | |
|---|---|
| plugins in the VCV Library | 564 |
| modules in them | 4,961 |
| distinct licence strings across them | **37** |
| modules under permissive or public domain terms | **1,039**, about one in five |
| modules under copyleft | 2,943 |
| modules that cannot be reused at all | 953 |
| Rack SDK 2.6.6 for `lin-arm64` | **HTTP 404** |
| last commit on `VCVRack/Rack` | **2025-11-04**, ten and a half months ago |
| Cardinal `linux-aarch64` prebuilt | **1,054.8 MB** |
| Cardinal web build, published zip | **210.1 MB** |
| `scsynth.wasm`, this project's own yardstick | **1.70 MB**, booting in 747 ms |
| occurrences of `audioWorklet` in DPF, which Cardinal's web build uses | **0** |

⚠️ **AND THE HONEST FRAME FOR ALL OF IT: NOTHING BELOW WAS RUN.** No Rack, no
Cardinal, no module, on no machine. §14 lists what each reading would cost to
turn into a fact and which of those are blocked on this laptop.

## 2. What a VCV module is, at the code level

### 2.1 Two classes, and only one of them is DSP

📄 `include/engine/Module.hpp` on the `v2` branch, read 2026-09-22. A module's
audio half is a C++ class deriving from `rack::engine::Module`. Its whole
include list is:

```cpp
#include <vector>
#include <jansson.h>
#include <common.hpp>
#include <string.hpp>
#include <plugin/Model.hpp>
#include <engine/Param.hpp>
#include <engine/Port.hpp>
#include <engine/Light.hpp>
#include <engine/ParamQuantity.hpp>
#include <engine/PortInfo.hpp>
#include <engine/LightInfo.hpp>
```

🔴 **NOT ONE GUI HEADER.** No `app/`, no `ui/`, no `widget/`, no OpenGL, no
NanoVG. The DSP half of a VCV module is already written against a header that
knows nothing about drawing. ⚖️ This is the single fact that makes the whole
question answerable, and it is why the answer is not *"you would have to rewrite
it"*.

The members are four vectors of plain structs (`params`, `inputs`, `outputs`,
`lights`), some metadata vectors, two `Expander` structs for talking to the
module either side, and a bypass routing table. The virtual methods are
`process(const ProcessArgs&)`, `processBypass`, `toJson`/`fromJson`,
`dataToJson`/`dataFromJson`, and lifecycle hooks `onAdd`, `onRemove`, `onReset`,
`onRandomize`, `onSampleRateChange`, `onBypass`, `onUnBypass`, `onPortChange`,
`onExpanderChange`.

📄 The GUI half is a separate class, `ModuleWidget`, living under `app/`. It
loads an SVG panel from the plugin's `res/` directory and places widgets on it.
A `plugin::Model` binds the two together and is what gets registered.

### 2.2 The contract the host offers a module

📄 vcvrack.com/manual/PluginDevelopmentTutorial, read 2026-09-22. `process()` is
called **once per sample**, not once per block. Inside it a module reads
`params[i].getValue()`, reads `inputs[i].getVoltage()`, writes
`outputs[i].setVoltage(v)`, sets `lights[i].setBrightness(b)`, and gets
`args.sampleTime` and `args.sampleRate` off the `ProcessArgs` struct.

⚖️ **A per-sample callback is the thing to notice.** It means no module owns a
buffer, no module owns a thread, and no module schedules anything. The host owns
the clock and the graph order. That is a much smaller contract than a VST or an
LV2, and it is why lifting one out is cheap. It is also why running a hundred of
them is slower than a block-based graph would be: the function call overhead is
per sample per module.

Signals are **voltages**, not normalised floats. ±5 V audio, ±10 V CV, 1 V per
octave for pitch, and 10 V gates by convention. ⚠️ Anything lifted out of a
module and dropped into a Web Audio graph has to be rescaled, and a module that
clamps or saturates does it at voltage numbers rather than at 1.0.

### 2.3 The process model, and what the build produces

📄 A plugin is a directory holding `src/*.cpp`, `res/*.svg` and a `plugin.json`
manifest. It builds against the **Rack SDK** (headers plus makefiles, pointed at
by `RACK_DIR`) into a single **shared library** which Rack `dlopen`s at start.
📄 `Makefile`, read 2026-09-22: Rack itself builds to `libRack.so` on Linux,
`libRack.dylib` on macOS, `libRack.dll` on Windows, and the standalone app is a
thin `adapters/standalone.cpp` linked against it.

🔴 **SO IT IS ONE PROCESS.** Modules are not sandboxed, not separate processes,
and not separately scheduled. A module that segfaults takes Rack with it. There
is no IPC boundary anywhere in the design, which also means there is no existing
seam to run a module out-of-process behind.

## 3. The licences, and they are not one licence

📄 `LICENSE.md` on `VCVRack/Rack` `v2`, read 2026-09-22. There are at least six
distinct licences in play and mixing them up is the expensive mistake.

| what | licence | what it means here |
|---|---|---|
| VCV Rack Free, source and binaries | **GPLv3**, with a non-commercial plugin exception | copying non-API source into anything means that thing is GPLv3 |
| the plugin API, used by a plugin | any licence you like, **if the plugin is distributed free of charge** | this is the exception, and it is conditioned on price |
| a commercial plugin | needs a licence from VCV, or sale through the VCV Library | not free, not automatic |
| VCV Component Library graphics | **CC BY-NC 4.0** | knobs, jacks, screws. Non-commercial, attribution |
| Core module panel design | **CC BY-NC-ND 4.0** | non-commercial AND no derivatives |
| VCV name, logo, icon | trademark, all rights reserved | `for VCV Rack` is the only sanctioned phrasing |
| bundled dependencies | individually licensed, see `LICENSE-dist.md` | GLEW, GLFW, jansson, curl, openssl, libarchive, zstd, speexdsp, libsamplerate, rtmidi, rtaudio |

⚠️ **THE PLUGIN EXCEPTION IS NOT A PERMISSIVE LICENCE AND IT IS EASY TO READ AS
ONE.** It says a plugin may use the *API* under any licence provided it is given
away for nothing. The moment a plugin copies substantial non-API Rack source, it
is GPLv3 like everything else. ⚖️ For this project the exception is close to
irrelevant either way: positron is R&D and ships nothing for money, and the
interesting direction is taking module source out rather than writing plugins.

🔴 **AND THE COMMUNITY MODULES ARE NOT COVERED BY ANY OF THE ABOVE.** Each
third-party module repository carries its own licence, chosen by its own author.
GPLv3 is the most common, but BSD, MIT, and GPLv3-or-later all appear.
**There is no single answer to "what licence are VCV modules".** The licence has
to be read per repository, per module, before any code is taken.

📄 Cardinal (below) is the place where somebody has already done that work at
scale: its rule is *"All included modules are open-source and have a GPLv3+
compatible license. (GPLv3-only modules are not allowed) It is a requirement
that the final Cardinal binary is GPLv3+ licensed."* 📄 It also warns that
artwork is licensed separately from code, *"from CC-0 to CC-NC-ND to custom"*,
and notes that CC-NC is *"problematic for packaging"* but allowed because it is
so common that even Rack's own Component Library is CC-NC.

⚖️ **WHICH GIVES THE CLEANEST LICENCE READING OF THE WHOLE QUESTION: THE MATHS
AND THE PICTURES HAVE DIFFERENT OWNERS.** Taking a filter's `process()` is a
question about one repository's code licence. Taking its panel is a question
about an artwork licence that is very often non-commercial and sometimes
no-derivatives. **Take the maths, never the panel.** This project draws its own
faces anyway.

## 4. Headless, and the three different things that word means

The split below is taken from `research/vcv-rack-received-2026-09-22.md` §2,
which states it better than the brief did. What follows is the verification, and
**one of the three verdicts in that document is now wrong**.

### 4.A The application with its window hidden

📄 **THE FLAG IS REAL AND IT IS `-h` OR `--headless`.** vcvrack.com/manual/
Installing, read 2026-09-22, gives the full argument list: a patch filename,
`-s/--system`, `-u/--user`, `-d/--dev`, `-h/--headless`, `-a/--safe`,
`-t/--screenshot <zoom>`, `-v/--version`. The manual's own words for headless
are *"Launches the autosaved patch with no window. Great for generative patches
in museum exhibits. Patch can be controlled with MIDI."*

📄 And the source agrees, which is a stronger check than the manual.
`adapters/standalone.cpp`, `v2` branch, read 2026-09-22:

```cpp
if (!settings::headless) { ui::init(); window::init(); }
...
if (!settings::headless) { APP->window = new window::Window; }
...
if (settings::headless) { printf("Press enter to exit.\n"); getchar(); }
```

📄 Andrew Belt (`Vortico`) on the VCV forum, in the `Headless Mode in Rack v2`
thread: *"No OS windowing or OpenGL functions are called. Should work on
embedded systems with no video card at all, although libGL is required to be
installed on Linux because the Rack binary links to it."* 📄 The same thread:
modules **cannot be added** in headless mode, because there is no browser and no
event loop. A headless Rack runs the patch it was given and nothing else.

📄 The linking half of that is visible in the `Makefile`: on Linux `libRack.so`
links `-lGL -ldl -lX11 -lasound -ljack -lpulse -lpulse-simple`, statically
absorbing GLEW, GLFW, jansson, curl, openssl, libarchive, zstd, speexdsp,
libsamplerate, rtmidi and rtaudio. ⚠️ **So `--headless` needs no display and
still needs `libGL.so` and `libX11.so` on the box.** A minimal container without
them will not load the binary at all, and the error will be a loader error that
looks nothing like a graphics problem.

🔴 ⚖️ **AND THERE IS A TRAP IN THAT `getchar()` THAT NOBODY HAS WRITTEN DOWN.**
INFERRED from the source, not tested: headless Rack blocks on standard input. A
systemd unit with `StandardInput=null`, a `nohup`, or an `ssh host ./Rack -h`
with stdin closed gives `getchar()` an immediate EOF, and Rack shuts down
cleanly and instantly. **The failure looks like a crash on startup and is
actually the program being told the user pressed enter.** This project has met
this exact shape before under a different name, in the board rule about a
capture started over ssh being deaf. The fix is to hold stdin open.

**Verdict: correct, cheap, and not the interesting one.** It is still the whole
of Rack with a window suppressed.

### 4.B The engine without the application

🔴 **THE RECEIVED DOCUMENT CALLS THIS "TECHNICALLY PLAUSIBLE". IT IS SHIPPED, AS
A PREBUILT BINARY, FOR THIS PROJECT'S EXACT CPU.**

📄 VCV itself does not offer this. `libRack.so` exists as a build target, but
there is no supported way to drive it without the standalone adapter, and
nothing in the manual describes one.

📄 **DISTRHO Cardinal does.** `github.com/DISTRHO/Cardinal`, read 2026-09-22:
GPL-3.0, 3,198 stars, created 2021-10-07, last push **2026-07-28**. It describes
itself as *"a DPF-based plugin wrapper around VCV Rack, using its code directly
instead of forking the project"*. 📄 Its `docs/BUILDING.md` lists a build option:

> `HEADLESS=true` build headless version (without gui), useful for embed systems

📄 And the `Makefile` shows that is not a runtime flag but a **compile-out**:
`HEADLESS=true` skips building DGL entirely and skips the X11 and OpenGL
dependency checks that otherwise `$(error)` the build. 📄 The MOD Audio target
sets `MOD_ENVIRONMENT += HEADLESS=true STATIC_BUILD=true`, so the embedded ARM
pedal build is the headless build.

📄 `docs/OSC-REMOTE-CONTROL.md`, read 2026-09-22: since version **23.09**, a
Cardinal standalone can be driven over OSC, and *"the headless builds
(standalone, not plugins) will have OSC remote control enabled by default"*, on
UDP port **2228**, overridable with `CARDINAL_REMOTE_HOST_PORT`. The messages
are `/hello`, `/host-param i:port f:value`, `/param h:moduleId i:paramId
f:value` and `/load b:patch-blob`, with `/resp` replies for hello and load.

⚖️ **THAT IS THE SAME SHAPE THIS PROJECT ALREADY RUNS.** `rig/board/` talks OSC
to `scsynth` over UDP and refuses to claim success until the engine answers. A
headless Cardinal on 2228 would slot into that pattern with no new idea in it.

⚠️ **AND THE COUPLING WARNING IN THE RECEIVED DOCUMENT STANDS.** Cardinal is
GPLv3, the whole binary is GPLv3, and driving it over OSC from a node process is
fine precisely because OSC is a socket rather than a link. **The licence
question changes the moment anything is linked instead of spoken to.**

**Verdict: this exists, it runs, and it is the cheapest experiment available.**

### 4.C The DSP compiled out and linked into something else

🔴 **THIS IS THE INTERESTING ONE, THE RECEIVED DOCUMENT IS RIGHT ABOUT THAT, AND
IT IS ALSO MORE FINISHED THAN THAT DOCUMENT ASSUMES.** §5 below names three
real examples where the separation has already been done by the module's own
author, and one of them ships the exact ABI the received document proposed
inventing.

The obstacle the received document names is real and is worth restating
precisely. A module class inherits `rack::engine::Module` and speaks in
`Param`, `Input`, `Output`, `Light` and `ProcessArgs`. Lifting *that* class out
means dragging those headers along. **But a large and identifiable subset of the
ecosystem does not put its DSP in that class at all.** It puts a thin adapter
there and calls into a library that never heard of Rack.

## 5. Three real modules whose DSP is already separated, with licences

🔴 **THE RECEIVED DOCUMENT NAMES NO MODULE. THESE ARE NAMED, CHECKED TODAY, AND
THEY ARE THE ANSWER TO "WHAT COULD BE TAKEN".**

### 5.1 Audible Instruments, and the Mutable Instruments firmware underneath it

📄 `github.com/VCVRack/AudibleInstruments`, read 2026-09-22. 450 stars, last
push **2023-09-14**, so the adapter is dormant. Its layout is the whole point:

| path | what it is | licence |
|---|---|---|
| `src/` | the Rack adapter, 22 files | GPL-3.0-or-later, Andrew Belt |
| `eurorack` | a **git submodule**, not a directory | MIT, Émilie Gillet, 2014 to 2019 |
| `res/` | panel graphics | copyright Émilie Gillet, *"used and distributed with permission"* |

📄 The submodule points at `github.com/VCVRack/pichenettes-eurorack`, which is
Mutable Instruments' own eurorack firmware: `plaits`, `rings`, `clouds`,
`elements`, `braids`, `marbles`, `tides`, `stages`, `streams`, `warps`,
`frames`, `grids`, `peaks`, `ripples`, `shelves`, `blinds`, `branches`, `edges`,
`ears`, `kinks`, `links`, `shades`. 📄 `LICENSE-dist.txt` carries the MIT text
in full. ⚠️ It is headed *"eurorack (applies to STM32F modules, not AVR
modules)"*, so the MIT grant is scoped to the ARM Cortex firmware and the older
AVR parts are not covered by it.

🔴 **AND THE ADAPTER IS 391 LINES, OF WHICH THE DSP CONTACT SURFACE IS SIX.**
MEASURED today by reading `src/Plaits.cpp`:

```cpp
#include "plaits/dsp/voice.h"
plaits::Voice voice[16];
plaits::Patch patch = {};
voice[i].Init(&allocator);
plaits::Modulations modulations;
voice[c].Render(patch, modulations, output, blockSize);   // blockSize = 12
```

⚖️ **THE DSP IS BLOCK BASED AND WAS NEVER WRITTEN AGAINST RACK.** It was written
for an STM32 microcontroller with a fixed buffer, no allocation and no operating
system, which is why the adapter has to *buffer* Rack's per-sample calls into
blocks of 12 before it can hand them over. The separation cost here is not low.
**It is zero, because there is nothing joined in the first place.** Rack is
already just one caller of a library that predates it.

⚠️ **THE PANELS ARE THE PART THAT CANNOT BE TAKEN.** *"Used and distributed with
permission"* is a grant to that repository, not a licence to the world. This
project draws its own faces, so the restriction costs nothing, but taking the
SVGs would be the one clear infringement available here.

### 5.2 Airwindows Consolidated, which already is the ABI the received document proposed

📄 `github.com/baconpaul/airwin2rack`, read 2026-09-22. **MIT**, copyright
2019-2026 Paul Walker. 713 stars. Last push **2026-09-19**, three days ago.

📄 Its README states the design outright, first of three bullets:

> As a static library with a uniform registry and access pattern for you to use
> as a submodule to expose the airwindows

📄 The repository holds `src/` (the library), `src-rack/` (the VCV adapter) and
`src-juce/` (the CLAP, VST3, AU, LV2 and standalone adapter). One DSP core,
three adapters, exactly the arrangement the received document's §12 proposes as
a thing to build.

📏 **529 EFFECTS**, counted today from the git tree: 529 headers under
`src/autogen_airwin/`, 1,588 files in total, three per effect.

🔴 **AND THE BASE CLASS IS THE PROPOSED `DspNode`, ALREADY WRITTEN.**
`src/airwin_consolidated_base.h` includes only `<cstdint> <cassert> <cstring>
<stdio.h> <cmath>` and declares:

```cpp
virtual void processReplacing(float** inputs, float** outputs, VstInt32 sampleFrames) = 0;
virtual void setParameter(VstInt32 index, float value);
virtual float getParameter(VstInt32 index);
virtual void getParameterName(VstInt32 index, char* text);
virtual bool parameterTextToValue(VstInt32 index, const char* text, float& value);
```

⚖️ Block based, float in and float out, parameters by index, no Rack, no JUCE,
no VST SDK, and `VstInt32` is a typedef for a 32 bit integer rather than a
dependency. **The received document's §11 proposes designing this. It exists,
under MIT, with 529 implementations behind it, maintained this week.**

### 5.3 Surge XT, which is the same pattern under copyleft

📄 `github.com/surge-synthesizer/surge-rack`, read 2026-09-22. GPL-3.0, 199
stars, last push 2025-06-28. 📄 Its `.gitmodules` makes the split explicit: the
`surge` submodule is `github.com/surge-synthesizer/surge`, a separate synth.

📄 The same team publishes the DSP as standalone libraries, and these are the
liveliest repositories found in this whole survey:

| library | licence | last push | what it is |
|---|---|---|---|
| `sst-filters` | GPL-3.0 | **2026-09-21** | *"Surge filters as a GPL3 library"* |
| `sst-effects` | GPL-3.0 | 2026-09-18 | the effects |
| `sst-basic-blocks` | GPL-3.0 | 2026-09-14 | *"Basic building blocks for the audio thread"* |
| `sst-waveshapers` | GPL-3.0 | 2026-02-25 | the waveshapers |

⚠️ **GPL-3.0, AND THAT IS THE WHOLE TRADE.** These are header libraries designed
to be lifted, and lifting one makes whatever links it GPLv3. For a repository
that is R&D and ships nothing for money that is a decision rather than a
blocker, but it has to be a decision somebody made on purpose.

### 5.4 The counter-example, so the pattern is not oversold

📄 `VCVRack/Fundamental`, read 2026-09-22, last push 2026-07-21, 259 stars. Its
`LICENSE.md`: source code **GPLv3-or-later**, visual design of the modules
**CC BY-NC-ND 4.0**, *"Commercial use and derivative works are not allowed"*.
⚖️ Its DSP is written inline in the module classes against Rack's own headers
and its `dsp/` helpers, with no separated core. **Fundamental is the shape the
received document warned about, and it is VCV's own flagship module set.**

⚖️ **SO THE HONEST GENERALISATION IS A SPLIT, NOT A RULE.** Modules whose DSP
came from somewhere else (a hardware firmware, a DAW synth, a plugin suite)
carry that elsewhere with them and are free. Modules written for Rack from
scratch are written against Rack. **The question to ask about any module is not
"is it open source" but "did this DSP exist before Rack did".**

## 6. The licence numbers, measured across the whole library

📏 **MEASURED 2026-09-22** by downloading `VCVRack/library@v2` (377 KB tarball)
and reading all 564 plugin manifests. Nothing here is estimated.

| | count |
|---|---|
| plugins in the VCV Library | **564** |
| modules in those plugins | **4,961** |
| plugins declaring a `sourceUrl` | **393** (69.7 per cent) |
| distinct licence strings | **37** |

🔴 **THIRTY-SEVEN DISTINCT LICENCE STRINGS IS THE FINDING.** Not a spread of
seven or eight families written consistently. Thirty-seven strings, including
`GPL-3.0-or-later` and `GPL-3.0+` and `GPL-3.0` and `GPL-3` as four separate
spellings, and `proprietary`, `Proprietary` and `PROPRIETARY` as three more.
**"What licence are VCV modules" has no answer.**

Grouped into families, by module rather than by plugin:

| family | plugins | modules | share of modules |
|---|---|---|---|
| copyleft (GPL-2, GPL-3, AGPL) | 271 | 2,943 | 59.3% |
| closed (proprietary, VCV EULA, vendor policy link) | 160 | 953 | 19.2% |
| permissive (MIT, BSD, Apache, ISC, 0BSD, Zlib, BlueOak) | 102 | 855 | 17.2% |
| public domain (CC0, CC-PDDC, "Public Domain") | 16 | 184 | 3.7% |
| other (CC-BY variants, EUPL, WTFPL) | 9 | 24 | 0.5% |
| unstated | 6 | 2 | 0.0% |
| **total** | **564** | **4,961** | |

⚖️ **THE USEFUL READING FOR THIS PROJECT: 855 MODULES ARE PERMISSIVE AND 184 ARE
PUBLIC DOMAIN, SO ABOUT 1,039 OF 4,961, ONE IN FIVE, CAN BE REUSED WITHOUT
COPYLEFT REACHING INTO ANYTHING.** Another 2,943 can be reused if the result is
GPLv3. And 953 cannot be reused at all.

⚠️ **THE MANIFEST IS A DECLARATION, NOT AN AUDIT.** A `license` field in a JSON
file is what the plugin author typed. It is the same class of evidence as the
`User Session` names on the Circuit pack, and this repository has been wrong
about exactly that kind of field twice. **Before any code is taken, read the
LICENSE file in that repository, and read it for the SUBMODULES too**, because
§5.1 is precisely a case where the interesting licence is not the one in the
manifest.

## 7. On a Raspberry Pi, against ALSA

### 7.1 What this project's board actually is

📏 From `rig/board/README.md` and `BACKLOG.md`, read 2026-09-22, measured by
this repository rather than quoted from anywhere: the board is a **Raspberry Pi
4** (Cortex-A72), **arm64**, Debian **Trixie**, node 24 from NodeSource. It runs
from `/opt/positron-board/`, not `~/positron/`. 📏 The `rhodes` synth measured on
the A72 at **8 voices, 6.8 times realtime, 15 per cent of one core**.

🔴 📏 **AND ITS AUDIO PATH HAS NO SOUNDCARD IN IT.**
`rig/board/jacksynth.mjs:631` starts `jackd -r -d dummy -r 48000 -p 1024`. The
dummy backend, 21.33 ms a block. `ffmpeg -f jack` captures the graph and the
bytes leave over a WebSocket. **The board is a renderer whose only output is a
socket.**

### 7.2 VCV Rack itself: the build system knows ARM64 and VCV does not ship it

📄 `arch.mk` on `v2`, read 2026-09-22, recognises `x86_64-`, `arm64-` and
`aarch64-` machine triples and composes `ARCH_NAME = $(ARCH_OS)-$(ARCH_CPU)`.
**So `lin-arm64` is a name the build system can produce.** The received
document's claim is correct.

🔴 📏 **AND VCV PUBLISHES NO `lin-arm64` SDK. MEASURED TODAY BY HTTP HEAD:**

| Rack SDK 2.6.6 | status |
|---|---|
| `lin-x64` | **200** |
| `lin-arm64` | **404** |
| `mac-arm64` | **200** |
| `mac-x64` | **200** |
| `win-x64` | **200** |

📄 And vcvrack.com/Rack, read today, lists downloads for Windows x64, macOS x64
and ARM64, and Linux x64 only, with the CPU requirement written as *"Intel/AMD
64-bit processor (x64) supporting SSE4.2 (2011 or later), or Apple M1 (ARM64) or
higher"*. 📄 It also recommends a *"dedicated Nvidia/AMD graphics card from 2013
or later"* and says integrated graphics are not recommended, which is about the
GUI and is irrelevant headless.

⚠️ **AND A LINUX x64 PLUGIN BINARY CANNOT RUN ON ARM64.** Every third-party
module would have to be compiled from source for the Pi, one repository at a
time. 📄 A February 2026 forum thread, `Running VCV Rack on a Raspberry Pi 5`,
records a user trying to dodge that with Box64 x86 emulation and failing on
`Error loading needed lib libjack.so.0`, with the only advice being *"compile it
for ARM64 including all of the modules that you want to use (which means no
library and no 'premium' modules)"*. The thread ends unresolved.

### 7.3 Cardinal ships an ARM64 Linux binary, today

📏 From the GitHub releases API, read 2026-09-22. Cardinal **26.02**, published
**2026-02-28**:

| asset | size | downloads |
|---|---|---|
| `Cardinal-linux-aarch64-26.02.tar.gz` | **1,054.8 MB** | 569 |
| `Cardinal-linux-armhf-26.02.tar.gz` | 1,026.6 MB | 148 |
| `Cardinal-linux-x86_64-26.02.tar.gz` | 1,062.3 MB | 3,485 |
| `Cardinal-linux-riscv64-26.02.tar.gz` | 1,070.4 MB | 90 |
| `Cardinal-macOS-universal-26.02.pkg` | 928.9 MB | 6,972 |
| `Cardinal-wasm-simd-26.02.zip` | **210.1 MB** | 363 |
| `Cardinal-wasm-nosimd-26.02.zip` | 210.8 MB | 314 |
| `cardinal-26.02.tar.xz` (source) | 486.4 MB | 1,351 |

🔴 **A GIGABYTE, AND THAT IS THE REAL COST OF "IT ALREADY BUILDS FOR ARM".** It
holds every plugin format plus a full copy of the panel artwork for **83
third-party module collections**, counted from the README today. ⚠️ How much of
that a headless build drops is UNMEASURED here, and it should be large, because
`HEADLESS=true` removes the drawing layer and the panels are only needed to draw.

📄 Cardinal's own README says why the ARM build exists at all: *"Support for ARM
and non-mainstream platforms (for example BSD) has also always been missing from
the official Rack since the start."*

⚠️ 📄 **AND ITS OWN EMBEDDED CAVEAT IS WORTH COPYING OUT.**
`docs/MODDEVICES.md`: *"Compared to desktop, MOD builds are not as fast, so do
not expect to load big patches."* MOD devices are ARM. 📏 **No CPU figure, no
sample rate, no xrun count and no patch size was found anywhere for Cardinal on
a Raspberry Pi.** Not by me, and not in the forum threads. That number does not
exist in public and would have to be made.

### 7.4 The audio path, and the correction

📄 Rack's Linux path is `Module` output, to the Audio module, to Rack's device
abstraction, to **RtAudio**, to **ALSA**. Confirmed structurally:
`src/rtaudio.cpp` exists in the tree and the `Makefile` links `-lasound -ljack
-lpulse -lpulse-simple`. The received document's chain is right.

📄 Cardinal does not use that path. Its `Makefile` explicitly excludes Rack's
`src/rtaudio.cpp`, `src/rtmidi.cpp`, `src/audio.cpp`, `src/midi.cpp`,
`src/network.cpp`, `src/plugin.cpp`, `src/core` and `src/app/ModuleWidget.cpp`
from the vendored tree, and substitutes DPF's. It builds two standalones:
**`Cardinal`** against JACK and **`CardinalNative`** against the platform's own
audio.

🔴 **NOW THE CORRECTION. THE RECEIVED DOCUMENT'S §9 SAYS: *"ALSA support alone is
irrelevant if there is no physical output device behind it."* THAT IS WRONG, AND
THIS REPOSITORY ALREADY HOLDS THE PROOF.**

Two separate facts kill it:

1. 📄 📏 **`snd-aloop` IS AN ALSA PCM DEVICE WITH NO DAC BEHIND IT, AND THE BOARD
   ALREADY LOADS IT.** `rig/board/setup.sh` installs `snd-virmidi` and
   `snd-aloop`, and `rig/board/README.md` describes the second in one line:
   *"this is BlackHole, for Linux"*. A synth plays to `hw:Loopback,0`, `arecord`
   reads `hw:Loopback,1`, and the board forwards it. **ALSA does not require a
   converter. It requires a device node, and the kernel will make one.**
2. 📄 **RACK RUNS ITS ENGINE WITH NO AUDIO DEVICE CONFIGURED AT ALL.** Read in
   `src/engine/Engine.cpp` today: when no module has claimed the clock,
   `Engine_fallbackRun` steps blocks of `sampleRate / 60` frames and sleeps the
   remainder against the wall clock. `adapters/standalone.cpp` calls
   `APP->engine->startFallbackThread()` unconditionally, headless included.
   ⚖️ **So a headless Rack on a board with no sound hardware is not an error
   state. It is a renderer with nowhere to put the samples**, which is precisely
   what this project's board already is with `jackd -d dummy`.

⚖️ **THE SOUNDCARD FINDING IS STILL TRUE AND STILL DECIDES SOMETHING. IT JUST
DECIDES A DIFFERENT THING.** It settles *can a person standing next to the Pi
hear this*, and the answer is no until the Fast Track Pro arrives. It does not
settle *can Rack DSP run on that Pi and reach a browser*, and the answer to that
is the same as it already is for `scsynth`: yes, through a loopback and a
socket. **The board's whole architecture is a counter-example to the claim.**

## 8. Can we run them here

🔴 **THE DAILY DRIVER IS AN APPLE M2 PRO ON macOS 27.0, IT IS DEFENDER MANAGED,
AND IT SIGKILLS LOCALLY COMPILED BINARIES.** `LESSONS.md` §80, written after a
background agent tried anyway: *"the result was not a failed build. It was
security prompts on the owner's screen, in the middle of something else."* Two
earlier research documents in this repository had already recorded the same
constraint.

**So every option gets a machine and a verdict. Of the six, two are blocked on
this laptop, two cost somebody else a gigabyte or a room, one is free, and one
is unchecked.**

| option | machine | verdict |
|---|---|---|
| build Rack or Cardinal from source | this M2 Pro | 🔴 **BLOCKED.** This is the exact act §80 forbids. Do not. |
| install the Cardinal macOS `.pkg` | this M2 Pro | 🔴 **BLOCKED without asking.** 928.9 MB, and 📄 Cardinal's README says *"Neither the macOS or Windows builds are signed, so expect warnings saying they are from an untrusted developer"*. An unsigned installer on a managed laptop is the §80 dialog by another route. |
| prebuilt `linux-aarch64` Cardinal in Docker | this M2 Pro | ⚠️ **POSSIBLE, NOT FREE.** 📄 `rig/moq/RUNBOOK.md` records Docker 28.5.2 running native `linux/aarch64` here, so no emulation. It downloads 1 GB and runs an unsigned foreign binary. It answers *does it start on arm64* and answers nothing about a Pi's CPU. |
| prebuilt `linux-aarch64` Cardinal on the board | the Raspberry Pi 4 | ✅ **THE ONE THAT ANSWERS THE QUESTION.** No compiler, no build, one tarball. ⚠️ It is somebody else's room and the board is a live service. |
| the web build | any browser | ✅ **FREE AND INSTANT.** `https://cardinal.kx.studio/live` answered **HTTP 200** when checked 2026-09-22. Nothing is installed and nothing is compiled. |
| a prebuilt on the studio M1 Pro | `rig/m1` | ⚠️ **PROBABLY, UNCHECKED.** That machine already runs a LaunchAgent in a login session. Whether it carries the same management is not recorded anywhere I read. |

⚖️ **THE ORDERING THAT FALLS OUT: open the web build first because it costs
nothing, then the Pi, and never the laptop.**

## 9. In a browser

🔴 **THE BRIEF ASKED TO SEPARATE *SOMEBODY HAS SHIPPED THIS* FROM *THIS IS
POSSIBLE*. SOMEBODY HAS SHIPPED IT, IT IS RUNNING RIGHT NOW, AND HOW THEY
SHIPPED IT IS THE BAD NEWS.**

### 9.1 What is shipped

📄 📏 Cardinal 26.02 publishes `Cardinal-wasm-simd-26.02.zip`, **210.1 MB**, 363
downloads, and `Cardinal-wasm-nosimd-26.02.zip`, 210.8 MB, 314 downloads, both
2026-02-28. 📄 `docs/BUILDING.md` gives the recipe: emscripten, `emcc`/`em++`,
then `make USE_GLES2=true`, producing `bin/CardinalNative.html`. *"Please note
the web build only contains CardinalNative, no other variants will be built."*
📏 `https://cardinal.kx.studio/live` answers 200 and serves
`CardinalNative-v26.02.js` and a nosimd sibling.

📄 VCV has shipped nothing for the browser. The only other attempt found is an
experimental Emscripten port from **2019**, which is Rack 1 and is not a current
thing.

### 9.2 How it works, and this is the part that matters

🔴 📄 **IT IS NOT AN AUDIOWORKLET. IT IS `createScriptProcessor`.**

Cardinal's web audio comes from DPF's `distrho/src/jackbridge/WebBridge.hpp`,
read 2026-09-22. 📏 Counted today with GitHub code search across all of
`DISTRHO/DPF`:

| term | occurrences in DPF |
|---|---|
| `audioWorklet` | **0** |
| `createScriptProcessor` | **1**, in `WebBridge.hpp` |

📄 The code: `WAB.processor = WAB.audioContext['createScriptProcessor'](realBufferSize, numInputs, numOutputs)`,
where `realBufferSize` is **2048**, with a `fakeSmallBufferSize` option that
presents 256 to the plugin while still asking Web Audio for 2048 and subdividing
it. Samples are copied in and out of the wasm heap through `HEAPF32` inside the
`onaudioprocess` callback.

🔴 **`ScriptProcessorNode` RUNS ON THE MAIN THREAD AND HAS BEEN DEPRECATED IN THE
WEB AUDIO SPEC FOR YEARS.** ⚖️ Three consequences follow and none is small:
the DSP competes with layout, paint and garbage collection; 2048 frames at
48 kHz is **42.7 ms** of buffer before anything else in the chain; and a
deprecated node is a thing a browser may eventually stop shipping.

📄 The build flags, from `DISTRHO/DPF/Makefile.base.mk` read today:
`-msse -msse2 -msse3 -msimd128` (so Rack's SSE intrinsics are translated to
WebAssembly SIMD128), `-sALLOW_MEMORY_GROWTH`, `-sENVIRONMENT=web`. 📏 **No
`-pthread`, no `-sUSE_PTHREADS`, no `-sPROXY_TO_PTHREAD`** anywhere in the wasm
path. ⚖️ **So it needs no `SharedArrayBuffer` and therefore no COOP and COEP
headers**, which is the same happy answer this repository already measured for
`scsynth.wasm` (`research/supercollider-browser-2026-09.md`, 2026-09-12:
*"`crossOriginIsolated: false` and `SharedArrayBuffer` undefined, so no COOP/COEP
headers and nothing in this deployment breaks"*). ⚖️ It also means Rack's
engine multithreading collapses to a single thread in the browser, which removes
the per-sample barrier cost described in §10 and removes any parallelism.

### 9.3 What that costs, against this project's own yardstick

📏 This repository has measured the comparable thing. From
`research/supercollider-browser-2026-09.md`, 2026-09-12: scsynth compiled to
wasm is **1.70 MB**, boots in **747 ms** in headless Chrome, and plays a note at
peak RMS 0.503 against a silence control of exactly 0.000000. The same document
records that a granular synth this project wanted is **251 lines of plain
AudioWorklet** in `demo/shell/granular-worklet.js`.

| thing | size |
|---|---|
| `demo/shell/granular-worklet.js` | 251 lines of JavaScript |
| `scsynth.wasm` | 1.70 MB |
| Cardinal web build, published artefact | **210.1 MB compressed** |

⚠️ **THE 210 MB IS THE PUBLISHED ZIP AND NOT NECESSARILY WHAT A PAGE LOADS.** I
deliberately did not download the running build from somebody else's server, so
what a single visit actually transfers is **UNMEASURED**. Even at a tenth of it
the comparison does not change.

⚖️ **SO THE BROWSER ANSWER SPLITS EXACTLY LIKE THE HEADLESS ONE.** Running
*Rack* in a browser is done, it is impressive, and at two orders of magnitude
over this project's existing wasm engine on a deprecated main-thread node it is
not a positron page. Running *a module's DSP* in a browser is a different and
much smaller job, and this repository has already done that shape twice.

## 10. The engine costs more per sample than anybody writes down

🔴 **THE BRIEF'S COORDINATOR SINGLED THIS CLAIM OUT AS THE ONE TO CHECK HARDEST.
IT IS TRUE, AND THE TRUE VERSION IS WORSE THAN THE CLAIM.**

📄 vcvrack.com/manual/PluginDevelopmentTutorial says `process()` is called once
per audio frame. 📄 `src/engine/Engine.cpp`, `v2` branch, read 2026-09-22,
confirms it structurally:

```cpp
void Engine::stepBlock(int frames) {
    ...
    for (int i = 0; i < frames; i++)
        Engine_stepFrame(this);
}
```

🔴 **AND `Engine_stepFrame` DOES FIVE THINGS PER SAMPLE, NOT ONE.** Read in
order from the source:

| per sample, every sample | what it is |
|---|---|
| param smoothing | one lerp on the one smoothed param, if any |
| `engineBarrier.wait()` | a thread barrier |
| `module->doProcess(args)` for every module | a virtual call each |
| `workerBarrier.wait()` | a second thread barrier |
| `Engine_stepFrameCables` | copies every cable's voltages, with a `std::isfinite` check per channel |
| expander sweep | loops every module testing two `messageFlipRequested` flags |

⚖️ **SO AT 48 kHz THAT IS 48,000 BARRIER PAIRS A SECOND WHATEVER THE PATCH
CONTAINS**, plus a virtual call per module per sample, plus a cable copy per
sample, plus a full module sweep per sample. 📄 The barrier is a `SpinBarrier`
built on `std::atomic` with a `cpuPause()` spin loop. ⚖️ With one worker thread
it degenerates to a few atomic read-modify-writes and returns immediately, so
the single-threaded cost is real but modest. With more than one it is genuine
cross-core synchronisation **once per sample**, which is why Rack's
multithreading is known not to scale and why it matters most on the many-small-
cores machines the Pi question is about.

📄 The polyphony claim checks out too. `include/engine/Port.hpp`:
`static const int PORT_MAX_CHANNELS = 16;` with the comment *"This is inspired by
the number of MIDI channels"*, and every `Port` carries a fixed
`float voltages[16]` plus a `uint8_t channels`. **16 channels per port, and the
storage is allocated whether or not they are used.**

⚖️ **WHY THIS DECIDES THINGS.** A per-block DSP core called once every 12, 32 or
64 samples is a completely different machine from a per-sample virtual dispatch
with two barriers around it. §5.1's Plaits adapter buffers Rack's per-sample
calls into blocks of 12 precisely because the DSP underneath wants blocks.
**Lifting that DSP out does not merely avoid Rack's licence and Rack's headers.
It avoids Rack's per-sample overhead entirely**, and on an A72 or inside a
single-threaded wasm module that is the difference that shows up in a
measurement.

## 11. What could be taken and what could not

| thing | taken? | licence | cost |
|---|---|---|---|
| Mutable Instruments DSP (`plaits`, `rings`, `clouds`, `elements`, `marbles`, `tides`, `stages`, `braids`, `warps`) | ✅ **yes** | **MIT**, Émilie Gillet, STM32F parts only | near zero. Block based, allocator-free, never knew about Rack |
| Airwindows Consolidated, 529 effects | ✅ **yes** | **MIT**, Paul Walker | near zero. The ABI is already `processReplacing(float**, float**, int)` |
| Surge `sst-filters`, `sst-effects`, `sst-basic-blocks`, `sst-waveshapers` | ✅ yes, with a consequence | **GPL-3.0** | low technically. Whatever links them is GPLv3 |
| any module's `process()` that inherits `rack::engine::Module` | ⚠️ only by rewriting | per repository, 37 strings | high. It drags Rack's headers, its `Param`/`Port`/`Light` types and its per-sample model |
| Rack's own `dsp/` helpers and SIMD headers | ⚠️ possible, unwise | GPLv3 with the plugin exception | the exception covers *plugins for Rack*, not arbitrary reuse |
| VCV Component Library graphics, Core and Fundamental panels | 🔴 **no** | CC BY-NC 4.0 and CC BY-NC-ND 4.0 | non-commercial, and the second forbids derivatives outright |
| Mutable panel SVGs in `AudibleInstruments/res/` | 🔴 **no** | *"used and distributed with permission"* | permission to that repository, not a licence to anyone else |
| Cardinal as a whole, driven over OSC | ✅ yes | GPL-3.0 | a socket is not a link. Speaking OSC to a GPL program keeps the boundary clean |
| Cardinal as a whole, linked into something | ⚠️ yes, and it is GPLv3 after that | GPL-3.0 | the received document's coupling warning, correctly placed |

📄 One clause worth keeping in view, verbatim from Rack's `LICENSE.md`:
*"Derived works of this software may keep or omit this Exception."* ⚖️ The
non-commercial plugin exception is Rack's alone to give, and a fork is free to
drop it.

## 12. Recommendation, with reasons

**Do the cheap thing first, and it is not on this laptop.**

1. ✅ **OPEN `https://cardinal.kx.studio/live` AND LOOK AT IT.** It costs
   nothing, installs nothing, and it is the whole of Rack's module ecosystem
   running in a browser tab today. It answers *what does this even feel like*
   before a single decision is made. ⚠️ Expect main-thread audio with a 42.7 ms
   buffer, because that is what it is built on.
2. ✅ **IF ANYTHING RUNS ON THE BOARD, RUN THE PREBUILT `linux-aarch64`
   CARDINAL, HEADLESS, DRIVEN OVER OSC ON 2228.** It needs no compiler and no
   toolchain on a machine anybody owns. It slots into the pattern `rig/board/`
   already uses for `scsynth`. ⚠️ It is a 1 GB download onto somebody else's
   Pi in somebody else's room, and it should be asked for rather than done.
3. 🔴 **BUT THE RECOMMENDATION FOR ACTUAL WORK IS THE RECEIVED DOCUMENT'S §14,
   AND MY RESEARCH SUPPORTS IT RATHER THAN CONTRADICTING IT.** Do not make Rack
   the runtime. Lift DSP out. ⚖️ **And my research changes the size of that job:
   the received document treats the separated-DSP module as a hopeful category
   and proposes designing an ABI for it. §5 finds 529 MIT effects already behind
   exactly that ABI and a whole family of MIT hardware firmware that Rack itself
   consumes as a submodule.** The work is picking one, not designing a scheme.
4. ✅ **THE FIRST EXPERIMENT IS ONE FILE AND IT IS NOT A PORT.** Take one
   Mutable engine or one Airwindows effect, compile it to WebAssembly, and run
   it in a real `AudioWorklet` on a positron page. That is a direct comparison
   against `scsynth.wasm` at 1.70 MB and against
   `demo/shell/granular-worklet.js` at 251 lines, both of which this repository
   has already measured, so the result lands in a table that already exists.
   ⚠️ **And the compile is the blocked step on this laptop.** It needs
   emscripten, which is a toolchain install, which is `LESSONS.md` §80. **Ask
   before any of it, or do it on a machine the owner names.**

⚖️ **WHERE I DISAGREE WITH THE RECEIVED DOCUMENT**, stated plainly because the
brief invited it:

| its claim | my finding |
|---|---|
| §2.B running the engine without the application is *"technically plausible"* | it is **shipped**, as `HEADLESS=true` in Cardinal, with a prebuilt aarch64 binary and an OSC interface since 23.09 |
| §9 *"ALSA support alone is irrelevant if there is no physical output device"* | **wrong, and this repository disproves it.** `snd-aloop` is an ALSA PCM device with no DAC, `setup.sh` already loads it, and Rack's fallback thread runs the engine with no audio device at all |
| §11 proposes designing a `DspNode` ABI | `AirwinConsolidatedBase` is that ABI, MIT, 529 implementations, last touched three days ago |
| §5 says the procedure is per plugin, per licence, and names none | 564 plugins, 4,961 modules, **37 distinct licence strings**, 1,039 modules permissive or public domain, and three named families with the separation already done |
| §14's conclusion that Rack is a source ecosystem rather than a runtime | **supported.** §5, §6 and §10 all point the same way independently |

## 13. What I could not settle

🔴 **NONE OF THE FOLLOWING SHOULD BE REPEATED AS IF IT WERE KNOWN.**

- 📏 **NO PERFORMANCE NUMBER FOR RACK OR CARDINAL ON ANY RASPBERRY PI EXISTS
  THAT I COULD FIND.** Not a CPU percentage, not a sample rate, not a buffer
  size, not an xrun count, not a module count. The forum threads either fail
  before getting there or discuss x64. Cardinal's own MOD documentation says
  only *"not as fast, do not expect to load big patches"*. **This is the single
  biggest hole and it can only be filled by running it.**
- ⚠️ **WHAT A HEADLESS CARDINAL BUILD ACTUALLY WEIGHS.** The published aarch64
  tarball is 1,054.8 MB with every plugin format and all panel artwork in it.
  `HEADLESS=true` compiles the drawing layer out and should drop most of the
  artwork, but by how much is unmeasured, and no headless artefact is published.
- ⚠️ **WHAT THE CARDINAL WEB BUILD ACTUALLY TRANSFERS ON ONE VISIT.** I checked
  that `cardinal.kx.studio/live` answers 200 and stopped there rather than
  pulling a large payload off somebody's server. The 210.1 MB is the release
  zip, which is an upper bound and not a page weight.
- ⚠️ **WHETHER THE STDIN TRAP IN §4.A IS REAL.** It is read out of
  `adapters/standalone.cpp` and never tested. It would take one command on a
  machine with Rack installed, and there is no such machine here.
- ⚠️ **WHAT THE STUDIO M1 PRO WILL ALLOW.** Nothing in this repository records
  whether it carries the same Defender management as the M2 Pro. §8 assumes it
  might and says so.
- ⚠️ **WHETHER VCV RACK'S OWN DEVELOPMENT IS STILL MOVING.** 📏 Measured today:
  `VCVRack/Rack` has a `pushed_at` of **2025-11-04**, ten and a half months ago,
  on tag `v2.6.6`. It is not archived, it has 4,421 stars and 307 open issues,
  and `VCVRack/library` was pushed **today, 2026-09-22**, so the store is
  live. `VCVRack/Object`, described as *"Flexible cross-language ABI-stable OOP
  system"*, was pushed 2026-08-27 and may or may not be Rack 3 groundwork.
  ⚖️ **A quiet repository is not a dead project and I will not call it one.**
  What is true is that the open source application has not changed in ten
  months, which is a fact about risk rather than about health.
- ⚠️ **WHETHER THE PLUGIN EXCEPTION SURVIVES ANY PARTICULAR REUSE.** Reading a
  licence is not the same as advice about it. Everything in §3, §6 and §11 is a
  reading of text, and the only claim I will stand behind unreservedly is the
  narrow one: **MIT code is MIT code and the Mutable and Airwindows repositories
  say MIT in full, verbatim, with the standard text.**

## 14. What would turn each reading into a fact

| reading | what would settle it | what it costs | blocked here? |
|---|---|---|---|
| headless Cardinal runs on this Pi | `tar xzf Cardinal-linux-aarch64-26.02.tar.gz` and run `CardinalNative` with `CARDINAL_REMOTE_HOST_PORT=2228` | 1 GB download onto the board, no compiler | ⚠️ needs the owner's permission, it is a live service in another building |
| what it costs on an A72 | `top` while a known patch runs, plus `jackd` xrun count | minutes, once it is installed | same |
| audio actually leaves the Pi | point Cardinal at `hw:Loopback,0`, `arecord` `hw:Loopback,1`, the path `rig/board/README.md` already documents | one line of config | same |
| the stdin trap | `./Rack -h < /dev/null` and see whether it exits at once | one command | 🔴 no Rack on any machine here |
| Rack's headless engine on ARM | there is no SDK and no binary, so: build from source | a full toolchain and every module recompiled | 🔴 blocked by `LESSONS.md` §80 on this laptop |
| one MIT DSP core in an AudioWorklet | emscripten, one `.cc`, one worklet, one positron page | a toolchain install | 🔴 **ASK FIRST.** This is exactly §80 |
| what the web build transfers | open `cardinal.kx.studio/live` with devtools and read the network panel | one page load off somebody's server | ⚠️ allowed, but it is their bandwidth. One visit, not a harness |
| whether a licence permits a specific reuse | read that repository's LICENSE and its submodules' | free, and it is the step §6 says not to skip | ✅ nothing blocks this |

## 15. Sources, with dates

Everything below was read on **2026-09-22** unless a different date is given in
the text.

| source | what it settled |
|---|---|
| `VCVRack/Rack@v2` `LICENSE.md` | the six licences in §3, verbatim, including the exception's exact name and its section 7 basis |
| `VCVRack/Rack@v2` `include/engine/Module.hpp` | no GUI header in the DSP class |
| `VCVRack/Rack@v2` `include/engine/Port.hpp` | `PORT_MAX_CHANNELS = 16` |
| `VCVRack/Rack@v2` `src/engine/Engine.cpp` | the per-sample loop, the two barriers, the fallback thread |
| `VCVRack/Rack@v2` `adapters/standalone.cpp` | what headless skips, and the `getchar()` |
| `VCVRack/Rack@v2` `Makefile` and `arch.mk` | `libRack.so`, the Linux link line, `lin-arm64` |
| GitHub API on `VCVRack/Rack` | `pushed_at` 2025-11-04, tag `v2.6.6`, 4,421 stars, 307 issues, not archived |
| `vcvrack.com/downloads/Rack-SDK-2.6.6-*.zip`, HTTP HEAD | lin-x64 200, **lin-arm64 404**, mac-arm64 200, mac-x64 200, win-x64 200 |
| `vcvrack.com/Rack` | the download list and the x64-or-M1 CPU requirement |
| `vcvrack.com/manual/Installing` | the full flag list including `-h/--headless` |
| `vcvrack.com/manual/PluginDevelopmentTutorial` | plugin layout, `process()` per frame, the accessors |
| `community.vcvrack.com/t/headless-mode-in-rack-v2/6630` | Vortico on no windowing calls and on `libGL` still being required |
| `community.vcvrack.com/t/running-vcv-rack-on-a-raspberry-pi-5/25506` | February 2026, a Box64 attempt that failed, unresolved |
| `VCVRack/library@v2`, all 564 manifests | 4,961 modules, 393 with `sourceUrl`, **37 licence strings**, the family table in §6 |
| `VCVRack/Fundamental` `LICENSE.md` | GPLv3-or-later code, CC BY-NC-ND 4.0 panels |
| `VCVRack/AudibleInstruments` `LICENSE.md`, `LICENSE-dist.txt`, `.gitmodules`, `src/Plaits.cpp` | the three-way licence split, the MIT text, the submodule, the 391-line adapter and its six-line DSP surface |
| `baconpaul/airwin2rack` README, `LICENSE.md`, `src/airwin_consolidated_base.h`, git tree | MIT, 529 effects, the dependency-free ABI, pushed 2026-09-19 |
| `surge-synthesizer/surge-rack` `.gitmodules`, and the four `sst-*` repositories | GPL-3.0 DSP libraries, all pushed within the last month |
| `DISTRHO/Cardinal` README, `Makefile`, `docs/BUILDING.md`, `docs/MODDEVICES.md`, `docs/OSC-REMOTE-CONTROL.md` | GPLv3, 83 module collections, `HEADLESS=true`, the wasm recipe, OSC on 2228, the MOD speed caveat |
| `DISTRHO/Cardinal` releases API | 26.02 of 2026-02-28 and every asset size in §7.3 and §9.1 |
| `DISTRHO/DPF` `distrho/src/jackbridge/WebBridge.hpp` and `Makefile.base.mk` | `createScriptProcessor` at 2048, zero `audioWorklet`, `-msimd128`, no pthreads |
| `https://cardinal.kx.studio/live`, HTTP HEAD | 200, and the two `CardinalNative-v26.02` script names |
| this repository: `rig/board/README.md`, `rig/board/setup.sh`, `BACKLOG.md`, `LESSONS.md` §80, `research/supercollider-browser-2026-09.md`, `research/scsynth-wasm-official-2026-09.md` | the Pi 4 and its A72 numbers, `jackd -d dummy`, `snd-aloop`, the managed laptop, scsynth.wasm at 1.70 MB and 747 ms |
| `research/vcv-rack-received-2026-09-22.md` | the received argument this document verifies, agrees with in §14 and corrects in §2.B and §9 |
