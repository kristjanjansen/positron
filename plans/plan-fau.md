# fau, one description of a sound that runs in the tab and on the board

Answers *"in bg do faust research. demo called fau"* and *"also loop up similar
alternatives"*, asked 2026-09-22 about a proposed demo with the slug `fau`.

The proposition under test: that `libfaust` compiled to WebAssembly lets one
`.dsp` source be compiled AT RUNTIME into an `AudioWorkletNode` in a tab and
compiled to native code for the Raspberry Pi, so a few hundred bytes of source
cross the wire instead of a binary, and both ends provably run the same graph.

🔴 **MOST OF THIS DOCUMENT IS MEASUREMENT, WHICH IS UNUSUAL FOR A PLAN HERE AND
IS WORTH SAYING FIRST.** The npm tarball was fetched into a scratchpad and run
under the node already on this machine. Nothing was installed, nothing was
compiled from C or C++, no system package was touched and no binary was built,
so the managed-laptop rule was not tested. Every compile latency, every wasm
byte count, every licence string and every hostile-input result below came off
libfaust 2.89.2 running here on 2026-09-22 and 2026-09-23.

🔴 **AND NOTHING HAS BEEN HEARD.** Not one sample was played through a speaker.
Renders were done offline and graded by peak, RMS and zero crossings. The
Raspberry Pi was not touched, no `faust2rpialsaconsole` was run, and no browser
executed any of this. Section 11 lists every gap.

| mark | means |
| --- | --- |
| **MEASURED** | a number taken off a running thing on this desk, with the command that took it |
| **DOCUMENTED** | a vendor, standard or project document says so, and the page was fetched today |
| **REPORTED** | a second-hand figure quoted from somebody else's write-up, not confirmed at the source |
| **INFERRED** | a conclusion drawn from two of the above, and stated by neither |
| **UNVERIFIED** | written from memory, and nothing was fetched to check it |

---

## The short answer

**The mechanism is real, it is called `@grame/faustwasm`, and it works.**
MEASURED here: version 0.18.5, carrying libfaust **2.89.2**, LGPL. It compiles
Faust source to a WebAssembly module in **10 to 100 ms** for anything small, and
hands back an `AudioWorkletNode`.

**The browser downloads 6,162,473 bytes to be able to compile at all**, which is
**970,416 bytes over brotli**. That is **2.49 times** the vendored scsynth this
repository already ships. It is one file of 3,598,106 bytes for the compiler,
one of 2,407,445 bytes that is nothing but the 53 standard library `.lib`
sources as text, and 156,922 bytes of Emscripten glue.

**Three of the four claims in the proposition hold and the fourth does not.**

1. ✅ Runtime compilation in a tab: **yes**, MEASURED.
2. ✅ A few hundred bytes of source: **yes for small DSP, no for a real
   instrument**. An oscillator is 46 bytes. The STK waveguide piano is 21,916.
3. ✅ It targets a Raspberry Pi: **yes**, `faust2rpialsaconsole` is a real tool
   and Debian ships a `faust` package.
4. 🔴 **Both ends provably run the same graph: NO, and this is the finding that
   changes the design.** MEASURED: the WebAssembly build of libfaust has exactly
   **three backends compiled in**, `wasm`, `wast` and `cmajor`. Asking it for
   C++ answers *"ERROR : -lang cpp not supported since CPP backend is not
   built"*. The tab cannot emit the code the board compiles. And the versions do
   not line up either: the tab runs 2.89.2 while Debian bookworm, which is what
   a Pi 4 on Raspberry Pi OS 12 has, ships **2.54.9**.

🔴 **AND THE BIGGEST THING FOUND IS NOT ABOUT FAUST AT ALL.** The blocker that
stopped `plans/plan-nola.md` §6.1 item 6 today, that an `AudioWorkletGlobalScope`
has no module loader so `rhodes.mjs` cannot be imported into a worklet, **is
solved by a technique that needs no compiler and no dependency**. `faustwasm`
does not fetch its processor: it calls `Function.prototype.toString()` on the
classes it needs, concatenates them into a string, wraps that in a `Blob`, and
`addModule`s the object URL. `demo/shell/rhodes.mjs` can reach a worklet the same
way, **one copy of the source, no 38 ms spike, no Faust**. Section 2.4. That is
worth doing whether or not `fau` is ever built.

**Polyphony works and the sustain pedal does not**, in the way that matters.
MEASURED by reading `FaustWebAudioDsp.ts`: the poly voice allocator special-cases
controller **123 and 120** and nothing else. Controller 64 is broadcast to the
voices as an ordinary slider, while the allocator has already marked every
pedalled voice `kReleaseVoice`, which is the FIRST thing it steals. The Faust
manual's own pedal recipe therefore holds the note and loses it under a chord.
`demo/shell/pedal.mjs` already has the right semantics and belongs ABOVE the
Faust node, not inside the DSP.

**On trust, the answer is a qualified yes.** MEASURED across nine hostile
inputs: the compiler catches endless evaluation cycles, refuses delays over
2^30, and **survived every single failure with the instance still usable**. But
a 24-byte source compiles in 25 ms into a DSP that **actually allocates 512 MiB
and renders audio out of it**, taking this process from 91 to 603 MiB of
resident memory with no warning anywhere. At a delay of 2^28 the compiler
reports a struct size of **-2,147,483,640**, a signed 32-bit overflow, says the
compile succeeded, and throws `memory access out of bounds` **during render**,
which in a page means on the audio thread. There is no CPU limit, no memory
limit and no compile timeout. `par(i, 50000, ...)` blocked for **9.5 seconds**
before aborting.

**On licence: LGPL 2.1 or later for the compiler, and the standard library is a
patchwork.** MEASURED by reading all 53 `.lib` files out of the shipped blob:
five declare `LicenseRef-LGPL-2.1-or-later-with-Faust-exception`, **three
declare `STK-4.3`**, two declare `LGPL with exception`, one declares
`LGPL-2.1-or-later`, and **42 declare nothing at all**.

**And of everything surveyed, only three things compile a graph at runtime in a
tab AND run on a Pi: Faust, Cmajor and Csound, with SuperCollider arriving.**
Cmajor's in-tab compiler is a whole LLVM at **10.28 MB gzipped against Faust's
1.53**, and is GPLv3 or GBP 2,000. Csound works and would make a duller page,
because it compiles into its own interpreter rather than into a module that is
only this DSP. **SuperCollider's sclang-in-the-tab branch would delete
`checkCompiledDefs()`'s reason to exist**, and is stopped by its sclang PR being
open with changes requested, by needing **COOP and COEP site-wide**, and by
having no npm package to pin. ⚠️ **Its AGPL licence is NOT one of the reasons,
which I had to check to find out**: MEASURED in this working tree, the scsynth
`demo/shell/vendor/` already holds is **AGPL-3.0-or-later** and is already
deployed. ✅ **MEASURED: Faust needs no cross-origin isolation.** Its compiler
imports no shared memory and its only `SharedArrayBuffer` use is 16 bytes of
optional sensor data. Section 8.

**And a plan-nola question got settled for free.** `plans/plan-nola.md` §7 wanted
a `faust2wasm` compile of Faust's STK piano as the cheapest probe of the physical
model question. It was run here. **`faust-stk/piano.dsp` does not compile to
WebAssembly**: it calls foreign C functions and the wasm backend refuses. Its
sibling **`piano1.dsp` does**, in **1,690 ms**, into 65,403 bytes of wasm with a
**966,892 byte per-voice state**, and it renders at **160 times realtime** here.
**It exposes no sustain pedal.** Section 5.

---

## 1. What the browser actually downloads, in bytes

Everything in this section is MEASURED. The package was fetched from
`registry.npmjs.org` and the per-file sizes cross-checked against jsDelivr's
file listing API.

```sh
curl -sL https://registry.npmjs.org/@grame/faustwasm/-/faustwasm-0.18.5.tgz -o fw.tgz   # 8,387,584 B
curl -sL "https://data.jsdelivr.com/v1/packages/npm/@grame/faustwasm@0.18.5?structure=flat"
brotli -q 11 -c libfaust-wasm.wasm | wc -c
```

### 1.1 The compiler

| file | raw | gzip -9 | brotli -q 11 | what it is |
| --- | --- | --- | --- | --- |
| `libfaust-wasm.wasm` | 3,598,106 | 895,772 | 520,372 | the Faust compiler |
| `libfaust-wasm.data` | 2,407,445 | 590,865 | 411,578 | the standard library, as text |
| `libfaust-wasm.js` | 156,922 | 44,212 | 38,466 | Emscripten glue |
| **compiler total** | **6,162,473** | **1,530,849** | **970,416** | |
| `dist/esm/index.js` | 216,533 | 41,750 | 34,161 | the FaustWasm runtime |
| **everything a compiling page needs** | **6,379,006** | **1,572,599** | **1,004,577** | |

🔴 **AND THERE ARE TWO GRAME PACKAGES WITH THE SAME THREE FILENAMES AND
DIFFERENT BYTES IN THEM, WHICH COST A BACKGROUND AGENT AND ME AN HOUR OF
DISAGREEING.** MEASURED, both from jsDelivr's file listing:

| | `.wasm` | `.data` | `.js` | total |
| --- | --- | --- | --- | --- |
| **`@grame/faustwasm` 0.18.5**, which is what I ran | 3,598,106 | 2,407,445 | 156,922 | **6,162,473** |
| `@grame/libfaust` 1.3.1, npm licence `GPL-2.0` | 2,795,726 | 1,489,885 | 254,684 | 4,540,295 |

**Every number in this document is the first row**, because those are the bytes
that answered `2.89.2` when asked their version and that ran every measurement
below. ⚠️ **The second row is 1.6 MB smaller and nobody here has checked what it
costs.** Section 11 item 5.

⚠️ **THE `.data` FILE IS NOT DATA. IT IS SOURCE CODE.** MEASURED by walking the
compiler's own in-memory filesystem: `/usr/share/faust` holds **53 files
totalling 2,406,429 bytes**, which is the `.data` blob to within a kilobyte of
filesystem metadata. The largest are `tubes.lib` at 377,020 bytes,
`physmodels.lib` at 203,199 and `filters.lib` at 178,016. **A page that imports
three libraries pays for fifty three**, and `tubes.lib` alone, which models valve
amplifiers, is 15.7 per cent of the whole download.

### 1.2 Against what this repository already vendors

| | raw | brotli |
| --- | --- | --- |
| libfaust compiler, all three files | 6,162,473 | 970,416 |
| `demo/shell/vendor/` scsynth, all three files | 1,857,788 | 389,306 |
| ratio | **3.32x** | **2.49x** |

MEASURED on the checked-in files: `scsynth-nrt.wasm` 1,701,983, `supersonic.js`
125,542, `clockwork_audio_worklet.js` 30,263.

✅ **SO THE HONEST FRAMING IS NOT "SIX MEGABYTES".** It is *two and a half times
the binary already in this repository, over the wire*. That is a real cost and
it is an arguable one.
⚠️ **BUT WHETHER CLOUDFLARE ACTUALLY BROTLIS THE `.data` FILE IS UNVERIFIED.**
It has no extension the edge recognises and would be served as
`application/octet-stream`. If it goes out uncompressed the real number is
**2.9 MB over the wire, not 1.0 MB**. Section 11 item 3.

### 1.3 The bundle, and why it is 8.46 MB

MEASURED: `dist/esm-bundle/index.js` is **8,463,702 bytes**, gzip 2,374,692,
brotli 1,491,821. INFERRED with confidence: it base64-inlines the three compiler
files, because 6,162,473 times 4/3 is 8,216,631 and the runtime adds another
216,533, which lands within 0.4 per cent of the observed size.

⚠️ **THE BUNDLE EXISTS FOR EXACTLY ONE REASON AND IT IS THE REASON THIS
REPOSITORY CARES.** It is what you `addModule` when you want the COMPILER itself
inside an `AudioWorkletGlobalScope`, where there is no `fetch` to load a `.wasm`
with. The package ships a working example of this at
`test/libfaust-in-worklet/index.html`. **A page that compiles on the main thread
never needs the bundle** and should not ship it: 1.49 MB brotli against 1.00 MB
is a 49 per cent penalty for a capability `fau` does not need.

### 1.4 What crosses the wire per patch, once the compiler is cached

MEASURED by compiling each and reading the factory's byte length.

| dsp | source | compiled wasm | compile, warm |
| --- | --- | --- | --- |
| `os.osc(440)` | 46 B | 2,354 B | 10 ms |
| a Rhodes-shaped voice | 220 B | 4,465 B | 15 ms |
| `pm.djembe` | 79 B | 9,803 B | 50 ms |
| `pm.clarinet_ui_MIDI` | 61 B | 10,281 B | 94 ms |
| `dm.freeverb_demo` | 51 B | 12,274 B | 39 ms |
| poly organ, 3 partials plus ADSR | 218 B | 4,503 B plus a 502 B mixer | 13 ms |
| **`faust-stk/piano1.dsp`** | **21,916 B** | **65,403 B** | **1,690 ms** |

🔴 **THE HEADLINE CLAIM IS TRUE AND IT IS ALSO A TRICK OF SCALE.** `61 bytes of
source becomes a clarinet` is real, and it is real because `pm.clarinet_ui_MIDI`
is a NAME for something living in the 2.4 MB of library already downloaded. The
compression is not magic, it is a dictionary. The moment the DSP is something
nobody wrote a library function for, the source is thousands of bytes, and a
serious physical model is 21,916 of them. **Both halves of that belong on the
page.**

---

## 2. Compile latency, and the worklet question

### 2.1 What it costs to start

MEASURED, node v25.9.0, this machine, `hrtime`:

```
instantiate libfaust module   54.0 ms      (once, per page)
LibFaust + FaustCompiler       0.2 ms
```

⚠️ **THAT 54 ms IS AFTER THE BYTES ARRIVE AND IS NOT THE WHOLE STORY.** It is
`WebAssembly.instantiate` plus Emscripten unpacking 2.4 MB of virtual filesystem.
In a browser on a cold cache you also pay the download. On a phone, UNVERIFIED.

### 2.2 What it costs per compile

MEASURED, four consecutive compiles of each, same compiler instance:

```
osc440       47 / 10 / 10 / 10 ms
rhodes-ish   19 / 16 / 16 / 15 ms
djembe       53 / 52 / 50 / 52 ms
clarinet    106 / 98 / 99 / 94 ms
freeverb     41 / 43 / 40 / 39 ms
poly organ   15 / 13 / 14 / 14 ms
piano1     1690 ms  (mono), 1731 ms (poly)
```

✅ **THE FIRST COMPILE IS SLOWER AND THEN IT SETTLES.** 47 ms then 10 ms. INFERRED:
the library `.lib` files are parsed on first use and cached.
🔴 **AND EVERY ONE OF THESE NUMBERS BLOCKS THE THREAD IT RUNS ON.** libfaust is
synchronous inside its wasm; the `async` on `generator.compile` is Emscripten
plumbing and not concurrency. **1,690 ms of piano is 1,690 ms of a frozen page**
unless the compile is moved to a Worker. That is not a theoretical concern, it
is the difference between a control that feels instant and one that looks broken.

### 2.3 The published figure I went looking for and did not get

The one paper that would carry a browser compile time, *FAUST Domain Specific
Audio DSP Language Compiled to WebAssembly* (Letz, Orlarey, Fober, WWW 2018
companion, DOI 10.1145/3184558.3185970), **returned HTTP 403 to every fetch**. So
there is no published number here to check mine against. Everything in 2.2 is
this desk only, and a phone will be several times slower. UNVERIFIED.

### 2.4 🔴 The worklet technique, which is the most valuable thing in this document

MEASURED by reading `src/FaustDspGenerator.ts` lines 386 to 428. To get a
processor into an `AudioWorkletGlobalScope` that has no `fetch`, no `document`
and no module loader, `faustwasm` does this:

```js
const processorCode = `
const faustData = ${JSON.stringify({ processorName, dspName, dspMeta, poly })};
var ${FaustDspInstance.name} = ${FaustDspInstance.toString()}
var ${FaustBaseWebAudioDsp.name} = ${FaustBaseWebAudioDsp.toString()}
...
(${getFaustAudioWorkletProcessor.toString()})(dependencies, faustData);
`;
const url = URL.createObjectURL(new Blob([processorCode], { type: 'text/javascript' }));
await context.audioWorklet.addModule(url);
```

**`Function.prototype.toString()` is the module loader.** The class source is
already in the main thread's memory, so it is stringified, concatenated, wrapped
in a Blob and handed to `addModule` as an object URL.

🔴 **THIS DELETES THE BLOCKER RECORDED IN `BACKLOG.md` TODAY, WITHOUT FAUST.**
`demo/muta/muta-worklet.js` says in its own words that a worklet has *"no
`fetch`, no `document`, no `XMLHttpRequest` and no module loader"*, and
`plans/plan-nola.md` §6.1 item 6 was stopped by the choice between a duplicate
copy of `rhodes.mjs` and a 38 ms render spike. There is a third option and it has
been here all along: `import { rhodesVoice } from "./rhodes.mjs"` on the main
thread, then `rhodesVoice.toString()` into a Blob into `addModule`. **One copy of
the arithmetic, one file, no spike, no dependency.**

⚠️ **AND IT HAS THREE LIMITS THAT HAVE TO BE WRITTEN DOWN BESIDE IT.**
- The stringified function loses its closure. `rhodesVoice` closes over `TAU`,
  so `TAU` has to be emitted into the blob too. `faustwasm` does exactly this,
  emitting every dependency by name.
- `addModule` on a blob URL **fails when the page is not on a secure origin**,
  which the faustwasm source itself notes in a comment. `localhost` counts as
  secure, so `demo/server.mjs` on 8890 is fine.
- A Content-Security-Policy with a strict `script-src` blocks `blob:`.
  UNVERIFIED whether `workers/view` sets one.

✅ **THE MEASUREMENT THAT MOTIVATED THIS REPRODUCED.** MEASURED here today,
independently of the figure in the brief: `rhodesVoice` at note 21 renders 748,572
samples to its own end in **36.4 ms**, note 60 in 28.4 ms, note 108 in 9.2 ms.

---

## 3. The two ends, and where the claim breaks

### 3.1 🔴 The browser compiler cannot emit the board's code

MEASURED by asking libfaust-wasm for every backend in turn through
`generateAuxFiles`:

| `-lang` | result |
| --- | --- |
| `wasm` | OK |
| `wast` | OK, 8,089 B for an oscillator |
| `cmajor`, `cmajor-hybrid` | OK, 3,495 B and 3,482 B |
| `cpp` | `ERROR : -lang cpp not supported since CPP backend is not built` |
| `c` | `ERROR : -lang c not supported since C backend is not built` |
| `rust`, `llvm`, `julia`, `dlang`, `csharp`, `ocpp`, `vhdl`, `interp`, `jsfx` | same, not built |
| `soul`, `mlir`, `jax` | `ERROR : cannot find backend for ...` |

**So `fau` cannot hand the board a C++ file it generated in the tab.** The board
needs its own native `faust`. The strongest version of the proposition, one
compiler binary producing both ends, is false as shipped.

⚠️ **AND `soul` IS NOT MERELY ABSENT, IT IS GONE.** `cannot find backend` is a
different message from `not built`: the SOUL backend has been REMOVED from the
Faust compiler, not just left out of this build. That is evidence about SOUL's
health from an unexpected direction, and section 7 has the rest.

### 3.2 🔴 And the versions do not line up

DOCUMENTED from `packages.debian.org`, fetched today:

| suite | `faust` |
| --- | --- |
| bullseye | 2.30.5~ds0-2 |
| **bookworm** | **2.54.9+ds0-1** |
| trixie | 2.79.3+ds-2 |
| forky, sid | 2.88.0+ds-1 |

MEASURED in the tab: **2.89.2**. **No Debian suite matches it**, and Raspberry Pi
OS 12 is bookworm, which is **35 minor versions behind**. `apt install faust` on
the board gives you a compiler that is years older than the one in the tab.

✅ **WHAT MAKES THIS TRACTABLE RATHER THAN FATAL IS `expandDSP`.** MEASURED:
`compiler.expandDSP(code, args)` turns a 220-byte source into a 4,712-byte
self-contained expansion in 27 ms, and its first lines are

```
declare version "2.89.2";
declare compile_options "-single -scal -ftz 2";
declare library_path0 "/usr/share/faust/stdfaust.lib";
declare library_path1 "/usr/share/faust/oscillators.lib";
declare library_path2 "/usr/share/faust/platform.lib";
declare library_path3 "/usr/share/faust/maths.lib";
```

**That is a provenance token with the compiler version and every library it
touched stamped into it.** Hash it and you have exactly what
`demo/grains/defs/PROVENANCE.json` hand-maintains, generated rather than
recorded, and generated at both ends. Two ends whose expansions hash the same
really are compiling the same program; two whose expansions differ are not, and
they say why in their own first line.

### 3.3 Target-specific caveats, measured

- 🔴 **`-vec` is not available in the browser.** MEASURED: `-vec -ftz 2` answers
  `ERROR : Vector mode with -lv 0 not supported for WebAssembly`. The board's
  C++ build can vectorise and the tab cannot, so even from identical source the
  two ends do not execute identical code.
- ✅ **Sample rate is handled correctly and the same source sounds the same at
  any rate.** MEASURED on a 440 Hz oscillator rendered for exactly one second:
  439 upward zero crossings and a peak of 0.200000 at 44100, 48000 and 96000.
  The SAMPLES differ; the SOUND does not.
- ✅ **`-double` works**, 2,643 bytes against 2,590 for the same oscillator.
  DOCUMENTED that the default is `float`.
- ✅ **Block size is not a parameter of the graph.** Faust's `compute(count, ...)`
  takes a frame count, so the worklet's 128 and the board's ALSA period are the
  same code. The one thing that is not block-size-independent is anything
  reading `ba.time`, which is a sample counter and is fine.
- ⚠️ **`-ftz 2` is appended to every compile by `faustwasm` itself**, MEASURED in
  `src/faust2wasmFiles.js` with the comment *"Flush to zero to avoid costly
  denormalized numbers"*. If the board is invoked without it, the two ends differ
  in their denormal handling. It has to be passed explicitly on the Pi side.
- ✅ **Generated code is deterministic.** MEASURED: the same source, same name
  and same flags produce byte-identical wasm across runs. A DIFFERENT name
  produces different bytes, because the name is embedded, so any hash-based
  check has to pin the name.

### 3.4 What the board side actually is

DOCUMENTED from `faustdoc.grame.fr/manual/tools/`, fetched today:

- `faust2rpialsaconsole`: *"Compiles Faust programs to RaspberryPi, alsa console
  architecture"*. There is also `faust2rpinetjackconsole`. Flags `-arch32` and
  `-arch64` pick the word size, and `-osc` and `-httpd` add remote control.
- `faust2jack`, `faust2alsa`, `faust2jaqt`, `faust2alsaconsole`, `faust2lv2`,
  `faust2api` all exist and all target Linux audio.
- `-nvoices <num>` on any of them produces *"a polyphonic DSP with `<num>`
  voices, ready to be used with MIDI events"*.

🔴 **NONE OF THIS WAS RUN.** No Pi was touched for this document. Whether
`faust` is installed on the board, which version, and whether the board's
Engine_Pappus service could host a Faust process beside sclang are all unknown.
Section 11 item 1.

---

## 4. Polyphony, MIDI, and the sustain pedal

### 4.1 How a Faust DSP becomes polyphonic

DOCUMENTED from `faustdoc.grame.fr/manual/midi/`, fetched today. Three parameter
names are magic: `freq` (or `key`), `gain` (or `vel`, `velocity`), and `gate`.
Declaring `declare options "[midi:on][nvoices:12]";` or passing `-nvoices 12`
turns the DSP into one voice of a polyphonic instrument, and the runtime
replicates it.

MEASURED: `FaustPolyDspGenerator.compile` returns a `voiceFactory`, a
`mixerBuffer` of **502 bytes**, and an `effectFactory` when the source defines
`effect`. The poly organ compiled in 13 ms.

### 4.2 🔴 The sustain pedal, and why the documented recipe is wrong here

The Faust manual's answer, DOCUMENTED, is to put the pedal inside the DSP:

```
s = hslider("sustain[midi:ctrl 64]", 0, 0, 1, 1);
gate = t + s : min(1);
```

MEASURED by reading `src/FaustWebAudioDsp.ts`, this breaks under a chord:

- The poly manager's `ctrlChange` special-cases **exactly two controllers**:
  `if (ctrl === 123 || ctrl === 120) this.allNotesOff(true);`. **Controller 64
  is not one of them.** It is passed through to every voice as an ordinary
  parameter write.
- `keyOff` on a voice runs `voice.keyOff()`, which sets every gate parameter to
  0 and sets `fCurNote = kReleaseVoice`.
- `getFreeVoice()` steals in this order: a free voice, then *"a voice in
  `kReleaseVoice` mode"*, oldest first, then a playing voice.

🔴 **SO A PEDALLED NOTE IS AUDIBLE AND STEALABLE AT THE SAME TIME.** The DSP
keeps its gate high because the `s` slider is 1, so it sounds. The allocator
already wrote it off on the note-off, so it is first in the queue to be
overwritten. **With the pedal down, the allocator's idea of what is sounding and
the listener's idea diverge completely**, and the more the player uses the pedal
the wronger it gets. This is the same class of defect `plans/plan-nola.md`
measured across browser samplers, arriving from inside the engine rather than
from a missing feature.

✅ **THE REPAIR IS THE ONE THIS REPOSITORY ALREADY BUILT.**
`demo/shell/pedal.mjs` exists, it holds two sets rather than one, its threshold
is 64 and not 127, it acts only on a change, and it forgets the foot when the
keyboard is switched off. **It sits ABOVE the Faust node and defers the
`keyOff` call**, so the allocator never learns the note ended and never steals
it. The DSP declares no `sustain` slider at all.

⚠️ **AND THE FAUST NODE HAS A `console.log` ON THE AUDIO PATH.** MEASURED:
`getFreeVoice` calls ``console.log(`Steal release voice : voice_date = ...`)``
on every steal, from inside an `AudioWorkletGlobalScope`. A pedalled glissando
would log per note. UNVERIFIED whether this is enough to cause a dropout, but it
is a thing to know before blaming the DSP for one.

### 4.3 What else the MIDI layer does

MEASURED in the same file. `midiMessage` decodes command 11 to `ctrlChange`, 14
to `pitchWheel`, 9 with velocity 0 to `keyOff` (**the velocity-zero case is
handled**, which is the same bug `demo/shell/midi.mjs` already guards), and 8 to
`keyOff`. Voice stealing is a hand-over rather than a cut: a stolen voice is
marked `kLegatoVoice` and `computeLegato` renders the first half of the block
with the old note and the second half with the new one.

---

## 5. 🔴 The Faust piano, which settles a plan-nola question

`plans/plan-nola.md` §4 names `faust-stk/piano.dsp` as *"a waveguide commuted
piano with a real sustain-pedal"* and §7 wanted a `faust2wasm` compile of it as
the cheapest probe of the physical model question. **It was run here.** All
MEASURED.

### 5.1 `piano.dsp` does not compile to WebAssembly

```
ERROR : calling foreign function 'getValueStiffnessCoefficient' is not allowed
        in this compilation mode
```

MEASURED: `piano.dsp` is 10,269 bytes and contains **24 `ffunction`
declarations**, which are calls out to C. The wasm backend has nothing to link
them against and refuses. Mono and poly both fail, in 144 ms and 103 ms.

### 5.2 `piano1.dsp` does

MEASURED: 21,916 bytes of source, *"revised by David Braun"*, which replaced the
24 foreign functions with pure-Faust `waveform` lookup tables and left
`// ffunction` as comments where they used to be.

| | |
| --- | --- |
| compile, mono | **1,690 ms** |
| compile, poly | **1,731 ms** |
| wasm, mono | 65,403 B |
| wasm, one voice plus mixer | 80,537 B plus 502 B |
| **per-voice state** | **966,892 B** |
| 2 s offline render, 1024-frame blocks | 17.5 ms, 114x realtime |
| 10 s offline render, 128-frame blocks | 62.4 ms, **160x realtime** |
| peak, RMS of a middle C note | 0.3356, 0.03684 |

🔴 **THE PER-VOICE STATE IS THE BUDGET, NOT THE CPU.** 966,892 bytes a voice
means **7.4 MiB at 8 voices, 14.8 at 16, 29.5 at 32**. At 160x realtime one
voice costs 0.017 ms of a 2.667 ms quantum, so about 160 voices would fill one
core of this machine, and the memory runs out long before the CPU does. **On a
phone both numbers are worse and neither was measured.**

### 5.3 🔴 It has no sustain pedal, and the name in the source is a trap

MEASURED, the complete parameter list:

```
/piano/Basic_Parameters/freq
/piano/Basic_Parameters/gain
/piano/Basic_Parameters/gate
/piano/Physical_Parameters/Brightness_Factor
/piano/Physical_Parameters/Detuning_Factor
/piano/Physical_Parameters/Hammer_Hardness
/piano/Physical_Parameters/Stiffness_Factor
/piano/Reverb/reverbGain
/piano/Reverb/roomSize
/piano/Spat/pan_angle
/piano/Spat/spatial_width
```

Eleven parameters and **not one of them is a pedal**. The source does contain
`sustainPedalLevel`, which reads as a pedal and is not one: MEASURED at line 63,
it is a thirteen-point `waveform` lookup of how much pedal-excitation noise the
soundboard gets AT EACH KEY, applied unconditionally on every note. There is no
damper control and no controller 64 anywhere in it.

⚠️ **SO `plans/plan-nola.md` §4'S DESCRIPTION IS WRONG AND SHOULD BE CORRECTED.**
*"a waveguide commuted piano with a real sustain-pedal"* describes a variable
name. The pedal still has to be `demo/shell/pedal.mjs` sitting above the node,
exactly as §6.1 item 3 already said.

✅ **AND THE PROBE ANSWERED ITS QUESTION.** A physical model piano CAN run in a
browser: 65 KB of wasm against `nola`'s 3.80 MiB of recording, at 160x realtime
for one voice. **Nobody has heard it**, its per-voice memory is a megabyte, and
1.7 seconds of compile is a long time to stare at a page. Whether it is a piano
anybody wants is a listening test and it has not been done.

---

## 6. 🔴 The trust question, which decides whether `fau` can take a patch over the relay

Nine hostile inputs, each MEASURED in its own node process with a watchdog.

| input | result |
| --- | --- |
| `process = _ @ 1000000;` | **compiles, 23 ms**, 1,271 B wasm, struct **4,194,312 B** |
| `process = _ @ 100000000;` | **compiles, 25 ms**, 1,279 B wasm, struct **536,870,920 B (512 MiB)** |
| `process = _ @ 268435456;` (2^28) | **compiles, 23 ms**, struct **-2,147,483,640**, a signed 32-bit overflow |
| `process = _ @ 1000000000;` | **compiles, 26 ms**, struct **8**, an unsigned wrap |
| `process = _ @ 1073741824;` (2^30) | refused: *"too big delay value ... cannot be implemented with a power-of-two delay line"* |
| `f = f; process = f;` | refused in 10 ms: *"after 400 evaluation steps, the compiler has detected an endless evaluation cycle of 2 steps"* |
| `process = + ~ _;` | compiles, legal one-sample feedback, struct 12 B |
| `par(i, 5000, os.osc(100+i))` | **`Maximum call stack size exceeded` after 892 ms** |
| `par(i, 50000, os.osc(100+i))` | **`Aborted(native code called abort())` after 9,542 ms** |
| `rdtable(100000000, ...)` | internal assertion: *"please report this message and the failing DSP file to Faust developers (file: wasm_instructions.hh, line: 585)"* |

### 6.1 What the compiler does protect against

✅ **Compile-time recursion is bounded.** The 400-evaluation-step cycle detector
is real and it fires in 10 ms.
✅ **There is a delay ceiling**, at 2^30 samples, and the refusal names itself.
✅ **Generated code allocates nothing at runtime.** DOCUMENTED that Faust's
output uses statically allocated structures with explicitly bounded loops. There
is no `malloc` on the audio thread, which is a real and unusual guarantee.
✅ **AND THE COMPILER INSTANCE SURVIVES EVERY FAILURE.** MEASURED explicitly: a
good DSP compiles in 9 to 11 ms immediately after a syntax error, an undefined
symbol, an evaluation cycle, a JavaScript stack blowout and an internal
assertion. **Nothing poisons it and no page reload is needed.** This was the
single most important thing to find out and the answer is good.

### 6.2 What it does not protect against

🔴 **There is no memory limit, and the blowup is not theoretical.** MEASURED by
instantiating the compiled factory and rendering a second of audio through it:

```
4 MiB delay      compiled, struct 4194312 B      rendered ok,  27 ms,  rss  91 MiB
512 MiB delay    compiled, struct 536870920 B    rendered ok, 286 ms,  rss 603 MiB
overflowed 2^28  compiled, struct -2147483640 B  THREW: memory access out of bounds
```

**The 512 MiB one does not throw. It works.** 24 bytes of source took this
process from 91 MiB to **603 MiB of resident memory** and produced audio. On a
phone that is the tab being killed, and nothing anywhere in the chain said a
word about it.

🔴 **And the overflowed one fails at the WORST possible moment.** It compiles
without error, it reports a struct size of **-2,147,483,640**, it instantiates,
and it throws `memory access out of bounds` **during `render`**, which in a real
page is inside the `AudioWorkletProcessor` on the audio thread. Between roughly
2^26 and 2^30 samples of delay the compiler's size arithmetic overflows a signed
32-bit integer, **and still says the compile succeeded**. That is worse than
refusing, because the caller gets no signal until the audio thread dies.
✅ **`meta.size` being negative is at least a testable symptom**, which is what
makes the ceiling in 6.3 implementable.
🔴 **There is no compile timeout and no CPU limit.** `par(i, 50000, ...)` held
the thread for **9.5 seconds**. On the main thread that is a hung page. In a
Worker it is a Worker nobody can cancel, because libfaust is synchronous inside
its wasm and `terminate()` is the only stop.
🔴 **There is no sandbox story at all, documented or otherwise.** Nothing in
Faust's documentation addresses untrusted input, because Faust's threat model is
a musician compiling their own file.
🔴 **AND NOTHING LIMITS WHAT THE COMPILED CODE COSTS PER SAMPLE.** A DSP that
compiles in 15 ms can still be 200 voices of reverb, and the audio thread has
2.667 ms per quantum. **The compiler cannot help with this and no compiler
could**, because it is a property of the graph and not of the source.

### 6.3 🔴 What this means for `fau`

**A `.dsp` that arrives over the relay may not be compiled.** Not as a default,
not behind a warning, not for a trusted peer.

The reasons, in order:
1. The memory blowup is one line long, silent, and not detectable from the
   source without reimplementing the compiler's own arithmetic.
2. The 9.5 second block is trivial to trigger and cannot be interrupted.
3. This repository's standing rule is about **whose machine pays**, and here the
   answer is the visitor's. `CLAUDE.md`'s ERR rule is the same shape one layer
   out: *"the rule is about whose server it is, not about which harm has been
   named yet"*.

✅ **WHAT IS SAFE IS A FIXED SET OF SOURCES THE PAGE SHIPS**, compiled on
demand, with the editor editing them. That is the whole demo and it loses
nothing a visitor would notice.
⚠️ **AND IF A PATCH EVER DOES COME OVER A SOCKET**, the shape that could work is
compile in a dedicated Worker, `terminate()` on a 2 s watchdog, refuse the
factory if `meta.size` exceeds a few megabytes or is negative, and never
instantiate on the main thread. **That is a plan, not a measurement, and it has
not been tried.** Section 11 item 7.

---

## 7. Licences, all of them

### 7.1 The compiler

🔴 **LGPL 2.1 or later, and the npm metadata disagrees with the file in the
package.** Both MEASURED.

- `COPYING.txt` inside `@grame/faustwasm` 0.18.5 reads: *"FAUST wasm, Copyright
  (C) 2021-2024 GRAME ... This program is free software; you can redistribute it
  and/or modify it under the terms of the GNU Lesser General Public License as
  published by the Free Software Foundation; either version 2.1 of the License,
  or (at your option) any later version."*
- The npm registry's `license` field for the same package says **`LGPL-3.0`**.
- The sibling package `@grame/libfaust` 1.3.1 (9,537,030 B unpacked) declares
  **`GPL-2.0`**.
- `github.com/grame-cncm/faust` `COPYING.txt` is **LGPL 2.1**, and DOCUMENTED:
  it contains **no exception clause for generated code**.

⚠️ **THE PRACTICAL POSITION IS NOT IN DOUBT AND THE PAPERWORK IS.** Vendoring
an unmodified LGPL library and calling it from a page is exactly what the LGPL
is for. But `LGPL-2.1` in the file, `LGPL-3.0` in the registry and `GPL-2.0` on
the sibling are three different answers, and a `LICENSE-faustwasm` file beside
the vendored blob should carry the `COPYING.txt` verbatim rather than the
registry's one-line guess, which is what `LAYOUT.md` rule 6 already requires.

### 7.2 The standard library is a patchwork, and three files are STK

MEASURED by reading the `declare license` line out of all 53 `.lib` files in the
shipped blob:

| licence declared | files |
| --- | --- |
| **(none at all)** | **42** |
| `LicenseRef-LGPL-2.1-or-later-with-Faust-exception` | 5 (`maths`, `envelopes`, `webaudio`, `maxmsp`, `reducemaps`) |
| **`STK-4.3`** | **3 (`effect.lib`, `filter.lib`, `oscillator.lib`)** |
| `LGPL with exception` | 2 (`math.lib`, `music.lib`) |
| `LGPL-2.1-or-later` | 1 (`tonestacks.lib`) |

- ✅ **`LicenseRef-LGPL-2.1-or-later-with-Faust-exception` is the one that
  matters and it is the good one.** It is the exception that lets generated code
  be licensed freely. Five files carry it explicitly.
- 🔴 **42 files declare nothing**, `physmodels.lib` among them, which is the one
  `fau` would lean on hardest. Their licence is whatever the repository-level
  statement is, and that page was not reachable:
  `faust.grame.fr/community/licenses/` and `faustlibraries.grame.fr/libs/licenses/`
  both returned **404**. UNVERIFIED.
- ⚠️ **`STK-4.3` is the Synthesis ToolKit licence**, which `piano1.dsp` also
  declares. It is MIT-style and permissive, and its one unusual clause asks that
  modifications be noted. The three `.lib` files carrying it are the deprecated
  old-name libraries, so a DSP importing `stdfaust.lib` does not touch them,
  **but `faust-stk/piano1.dsp` does carry it** and attribution to Romain Michon
  and Perry Cook belongs on any page that plays it.

---


## 8. The alternatives

*"also loop up similar alternatives"*. The question each one is asked: can ONE
description of a signal graph run in a browser tab AND on a small Linux board,
changed at runtime rather than rebuilt.

🔴 **MOST OF THIS SECTION WAS GATHERED OVER THE NETWORK BY BACKGROUND AGENTS AND
IS NOT MY OWN MEASUREMENT.** Where a number is marked MEASURED it was taken by
running a command; nothing in this section was heard, run on a Pi, or executed
in a browser. The three figures I re-took myself are marked.

### 8.1 The table

🔴 **THE COOP/COEP COLUMN IS A DISCRIMINATOR AND THE LICENCE COLUMN TURNED OUT
NOT TO BE, WHICH IS THE OPPOSITE OF WHAT THIS SURVEY EXPECTED.** Cross-origin
isolation is not a page setting, it is a SITE setting, and a demo that needs it
changes every other page on the site. **One candidate needs it.**
⚠️ **THE LICENCE COLUMN LOOKED DECISIVE AND IS NOT.** The alarming entry is
AGPL-3.0, whose section 13 triggers on NETWORK INTERACTION rather than on
distribution, so serving a page from `positron.studio` engages it. **Then I read
`demo/shell/vendor/LICENSE-supersonic-scsynth` in this working tree and found
that this repository has been shipping AGPL scsynth since September**, so it is
the status quo rather than a new obligation. §8.4. ⚠️ It is still worth
somebody's attention; it is just not a reason to choose between these rows.

| | licence | changes the graph at runtime, in the tab | needs COOP/COEP | ARM Linux | over the wire, compressed |
| --- | --- | --- | --- | --- | --- |
| **Faust** | LGPL 2.1+, stdlib a patchwork | **yes, compiles source** | **no**, MEASURED | **yes, named Pi targets** | **1.53 MB gzip, 0.97 MB brotli -q 11** |
| **SuperCollider wasm** | **AGPL-3.0** on the binding, and this repo already ships it | **sclang branch yes, unmerged**; the shipped build is scsynth only | 🔴 **yes**, pthreads and SharedArrayBuffer | yes, Debian main, 3.13.0 | 6.14 MB raw, uncompressed |
| **Cmajor** | GPLv3 or GBP 2,000 | **yes, hosted compiler returns an AudioWorkletNode** | not established | **yes, arm64 and arm32 release zips** | **10.28 MB gzip, no brotli served** |
| **Csound 7** | LGPL 2.1 engine, Apache-2.0 wrapper | **yes, `compileOrc`** | **no**, `useSAB` falls back | **yes, Debian arm64/armhf** | 1.89 MB brotli |
| **libpd-wasm** | BSD-3-Clause, Pd is *"Standard Improved BSD"* | **yes, parses `.pd` text, nothing compiles** | no | yes, `puredata` from apt | **0.37 MB brotli** |
| **Glicol** | MIT | **yes, re-parses inside `process()`** | optional, falls back to postMessage | INFERRED only, no ARM CI | 0.41 MB |
| **Elementary** | MIT | no compiler, a JS reconciler diffs a fixed engine | not established | INFERRED only, no ARM CI | **0.17 MB** |
| **Sporth** | MIT or Unlicense | **yes, with safe rollback already written** | n/a | INFERRED, trivial | **no wasm exists anywhere** |
| **Vult** | MIT | yes, but to JavaScript into a `ScriptProcessorNode` | no | via emitted C++ | 0.54 MB |
| **RNBO** | proprietary, EUR 299 plus Max | **no, a round trip to Cycling '74's cloud** | no | yes, official Pi image | not measured |
| **hvcc / Heavy** | GPL-3.0 compiler, **ISC runtime** | no, needs Python and `emcc` | no | `-g c` and write your own wrapper | 53 to 61 KB gzip per patch |
| **WebPd** | LGPL-3.0 | **yes, genuinely, via AssemblyScript** | no | 🔴 **none, no native target at all** | 3.07 MB gzip of toolchain |
| **KFR** | GPLv2+ or EUR 810+ for ARM | no, rebuild | n/a | **best in the survey, ARM CI runs under qemu** | **no wasm artefact exists** |
| **DaisySP** | MIT plus an LGPL-2.1 submodule | no, rebuild | n/a | INFERRED, no CI | no published wasm |
| **Q** | BSL-1.0 | no, by design | n/a | INFERRED, no CI | zero wasm prior art |
| **WAM v2** | MIT | not a DSP mechanism, a plugin wrapper | no | none, browser-only by construction | n/a |
| **Cabbage** | GPL-3.0 | no browser at all | n/a | REPORTED failing, 2020 | n/a |
| **SOUL** | dead | dead | dead | dead | dead |

✅ **FAUST NEEDS NO CROSS-ORIGIN ISOLATION, AND THIS WAS CHECKED RATHER THAN
ASSUMED.** MEASURED three ways: `libfaust-wasm.wasm` has **47 imports and not one
of them is a memory**, it exports its own memory instead, so there is no shared
memory and no pthread build. `libfaust-wasm.js` contains **zero** occurrences of
`SharedArrayBuffer`. And the nine occurrences in the runtime are all in
`FaustAudioWorkletCommunicator`, which carries **16 bytes of accelerometer and
gyroscope data**, is feature-detected as `!!globalThis.SharedArrayBuffer`, and
falls back to a plain `ArrayBuffer`.

🔴 **THAT IS A BIGGER DIFFERENCE THAN IT LOOKS.** COOP and COEP are not a page
setting, they are a SITE setting: cross-origin isolation breaks every embed,
every image from another origin and every iframe that does not opt in, on every
page that carries the headers. **A demo that forces them changes the whole
site.** Faust asks for nothing.

⚠️ **TWO NUMBERS IN THE FAUST ROW DISAGREE WITH EACH OTHER AND BOTH ARE REAL.**
`brotli -q 11` locally gives 520,372 bytes for `libfaust-wasm.wasm`; a background
agent measured what jsDelivr actually SERVES as **771,235 bytes**, because CDNs
compress at a much lower quality than 11. **The number to plan against is the
served one**, so the honest wire figure is between 0.97 MB and 1.4 MB depending
on what Cloudflare does, which is section 11 item 3.

### 8.2 The three that are genuinely in the running

🔴 **CMAJOR IS THE ONLY REAL COMPETITOR, AND IT LOSES ON SIZE BY SEVEN TIMES.**
MEASURED with explicit `Accept-Encoding` headers against `cmajor.dev`:
`cmaj-compiler-wasm.wasm` is **28,156,276 bytes raw and 10,280,020 gzipped**, and
**the host does not serve brotli at all**. Faust's compiler is 1,530,849 gzipped
including the standard library. The reason is not sloppiness: DOCUMENTED,
Cmajor's in-tab compiler links **LLVM**, and Faust's WebAssembly backend does
not.

✅ **AND IT WINS ON THE TWO THINGS THIS DOCUMENT FOUND WRONG WITH FAUST.** Its
standard library is **ISC**, one licence, not the 42-file silence of §7.2. And
DOCUMENTED in `std_library_voices.cmajor`, its `VoiceAllocator` carries
`if (control.control == 64) // 64 = sustain` with per-channel sustain state, an
MPE master flag, and a note-off path that checks `isSustainActive` before
releasing a voice. **That is exactly the defect §4.2 found**, fixed, in 8 KB of
ISC source. ⚠️ **If the page were about the pedal, Cmajor would win.** The page
is about compiling, so the download decides it.
⚠️ **AND THE LICENCE IS A REAL CHOICE, NOT A FOOTNOTE.** GPLv3 or GBP 2,000.
This repository is R&D and publishes its source, so GPLv3 costs nothing here,
but it is a different answer from Faust's LGPL and somebody should know that
before the blob is vendored.

✅ **CSOUND SATISFIES THE BRIEF COMPLETELY AND IS FORTY YEARS OLD.** MEASURED:
`@csound/browser` **7.0.0-beta33**, published 2026-08-12, and `compileOrc` is
present in the shipped bundle, which is the runtime orchestra compiler Csound
has always had. `dist/csound.js` is **2,728,071 bytes**, gzip **1,941,153**, and
inside it is a base64 zlib payload that inflates to **5,985,167 bytes of wasm**.
DOCUMENTED: Debian has `csound 1:6.18.1+dfsg` for **arm64, armel and armhf**, so
the board side is `apt install csound`.
🔴 **AND IT IS THE ONLY ROW WHERE THE PI SIDE COSTS NOTHING TO SET UP.** Faust's
board side is a compiler that Debian ships 35 minor versions behind (§3.2).
Csound's board side is an interpreter reading the same text.
⚠️ **WHAT YOU GIVE UP IS THE POINT OF THE PAGE.** Csound compiles an orchestra
into ITS OWN interpreter. Faust compiles a DSP into a **2,354-byte WebAssembly
module that is only that DSP**, and the readout cell showing that number is half
of what `fau` is for. Csound's equivalent cell would say `5,985,167` every time.
⚠️ Also: the payload is already zlib-compressed inside the JS, so gzip on the
wire barely helps. REPORTED: about **400 KB of that is packaging rather than
engine**, because base64 of already-deflated data does not recompress, and
serving the raw wasm and letting a CDN brotli it gives **1,491,072**.

🔴 **AND CSOUND HANDLES CONTROLLER 64 NATIVELY, WHICH CORRECTS BOTH THIS
DOCUMENT'S ASSUMPTION AND THE QUESTION IT WAS ASKED.** DOCUMENTED from Csound's
own command-flags page: `-+raw_controller_mode=boolean`, whose description is
*"Disable special handling of MIDI controllers like sustain pedal, all notes
off etc. ... Default: no"*. **The default is that the sustain pedal is handled**,
and REPORTED that both `raw_controller_mode` and the string `sustain pedal` are
present in the browser wasm with `setOption` reachable from the tab. There is no
`sustain` opcode and there does not need to be. **So on the one thing §4.2 found
broken in Faust, Csound is right by default and Faust is wrong by default.**
✅ **Csound also needs no cross-origin isolation.** REPORTED: `useSAB` defaults
true and falls back, and ScriptProcessorNode support has been REMOVED, so it is
AudioWorklet only.
⚠️ **AND ITS VERSION SKEW IS THE SAME SHAPE AS FAUST'S.** REPORTED: the browser
package is a **7.0.0 beta** (the last stable was 6.18.7, 2023-02-20) while Debian
ships **6.18.1**. §3.2's problem, different engine.
⚠️ One correction to the brief's premise worth carrying: **`compileCsdText` does
not exist**. The runtime API is `compileOrc`, `parseOrc`, `compileTree`,
`evalCode`, `readScore`, `setOption`, and CSD-from-text is `compileCSD(text, 1)`.

✅ **`libpd-wasm` IS THE SMALLEST THING THAT LOADS A GRAPH AT RUNTIME**, at
**368,275 bytes brotli**, 455,992 gzipped, for the vanilla worklet, because a `.pd` file is text
that libpd parses and **nothing compiles at all**. DOCUMENTED, the author's
stated motive is this repository's problem verbatim: *"RNBO is awesome, but it's
not open-souce, and what you ship is one or more patches that are already
compiled... in my case I wanted to also be able to generate patches
on-the-fly."*
🔴 **AND IT IS FOUR MONTHS OLD WITH EXACTLY ONE RELEASE.** MEASURED: `0.1.6`,
published 2026-05-26, repo created 2026-05-07, last push 2026-06-04, 38 stars.
npm says BSD-3-Clause and GitHub says NOASSERTION, which is two different
answers to the licence question. ⚠️ And the `else`/`cyclone` externals build
carries GPL code in places and was not checked. **Interesting, not dependable.**

### 8.3 The near misses, and what each one is actually missing

- **Elementary Audio, MIT, 170 KB gzipped, and no compiler in it.** MEASURED:
  `render()` is a React-style reconciler that diffs a JavaScript object graph and
  emits mutation instructions to a **fixed** C++ engine. So the graph changes at
  runtime and the NODE TYPES cannot. ✅ Its native story is the best-designed on
  this list: MEASURED, the engine is **header-only C++17**, the CMake has one
  `ONLY_BUILD_WASM` switch, and `cli/` embeds QuickJS so **the same JavaScript
  graph description runs on the device**. 🔴 **But nobody has built it for ARM.**
  CI is x86 only, there is no ARM job, and a search found nothing. ⚠️ And npm's
  `latest` tag is **21 months stale**: `4.0.3` from 2024-12-21, while `4.0.8` sat
  on `next` from 2025-10-22 and was never promoted.
- **Glicol, MIT, 407 KB gzipped, and it really does re-parse on the audio
  thread.** MEASURED from its own worklet source: `process()` dequeues the code
  bytes and calls `this._wasm.exports.update(ptr, size)`. ⚠️ **Two details that
  matter here specifically**: the SharedArrayBuffer path caps one code push at
  **2,048 bytes**, and `index.js` excludes **Safari and iOS Safari** from that
  path by user-agent string, which is a code path this repository already pays
  for separately. ⚠️ Last substantive commit 2025-01-23, npm package from 2023,
  `glicol-cli` not on crates.io, and the README's *"Run on Bela"* link points at
  a directory that no longer exists.
- **Sporth, MIT or Unlicense, and it already solved the hard part.** MEASURED
  from source: `plumber_reparse_string` plus `plumber_swap` hot-swap a patch
  **double-buffered and fail-safe**, destroying the half-built graph on a parse
  error and keeping the previous patch playing. That is the rollback behaviour
  `fau` would otherwise have to invent. 🔴 **And there is no wasm build anywhere
  in the world**: code searches return zero, 20 forks and not one port.
  Soundpipe's repo is **archived**. Building it would mean maintaining a fork of
  a dead library.
- **Vult, MIT, compiles in the tab.** MEASURED: `vultweb.js` is 535,397 bytes
  and its own demo does `eval(generated_code)` into a **deprecated
  `ScriptProcessorNode`**. It emits JavaScript, not WebAssembly, and a repo code
  search for `wasm` returns 0. Pi side is fine since it also emits C++. **The
  only MIT thing that compiles in the tab, and a one-person project whose
  browser story has not been touched in years.**

### 8.4 The ones that are out, and why, briefly

- 🔴 **SOUL is dead and Faust says so from the inside.** MEASURED: last push
  **2022-07-21**, four years. And §3.1's backend enumeration answers `cannot
  find backend for "soul"`, which is a different message from `not built`: the
  Faust compiler **removed** its SOUL backend. Julian Storer's successor is
  Cmajor. If somebody says SOUL in 2026 they mean Cmajor.
- 🔴 **RNBO is architecturally excluded**, not merely expensive. DOCUMENTED:
  *"Web Audio Export utilizes a remote cloud compiler"*, and every export target
  including the C++ one goes through Cycling '74's servers. So there is no
  runtime compilation in a tab at all, and it needs Max plus **EUR 299**. ⚠️ Its
  Pi target is genuinely good, DOCUMENTED for Pi 3, 4, Zero 2 W and 5 on a
  bookworm image, which makes it the most finished product here and the least
  usable one.
- **Gen~ is the older Max product**, needs Max, has no browser story of its own,
  and is superseded by RNBO for this purpose.
- **hvcc / Heavy, GPL-3.0 compiler with an ISC runtime, and very alive**
  (v0.17.2, 2026-09-21, part-funded by NLnet). REPORTED, and it corrects a line
  the survey first wrote: its nine generators are `c`, `daisy`, `dpf`, `fmod`,
  `js`, `owl`, `pdext`, `unity`, `wwise`, and **there is no `wasm` generator and
  no `bela` generator**. WebAssembly comes out of `js`, which shells out to
  `emcc`, so it is Python plus a native LLVM toolchain. **Ahead of time is the
  whole disqualification.**
  🔴 **AND BELA IS NOT A RASPBERRY PI, WHICH THE FIRST PASS OF THIS SURVEY GOT
  WRONG.** DOCUMENTED: Bela is a **BeagleBone Black** and Bela Mini a
  PocketBeagle; Daisy is an **STM32H7 microcontroller**. Bela's own docs call its
  Heavy path *"not the officially supported way"*. **Raspberry Pi is a listed
  hvcc platform with no generator of its own**: you use `-g c` and, in hvcc's own
  words, *"it is the responsibility of the user to create the appropriate
  wrapper"*.
- **WebPd, LGPL-3.0, and it really does compile in the tab**, through
  AssemblyScript and Binaryen loaded into the page, running the build in a
  Worker. REPORTED. 🔴 **And it has no native or C target at all**, eight build
  formats all browser or offline WAV, **which disqualifies it on the Pi half
  outright**. ⚠️ The entry fee is **3,070,456 bytes gzipped, of which Binaryen
  alone is 77 per cent**, and its own README says *"many of your patches will not
  work out of the box"*. Alpha for three and a half years.
- 🔴 **SuperCollider changed under this document while it was being written, and
  it is now a live candidate rather than a settled negative.** This entry is
  **REPORTED, relayed from another session's agent today, and not measured by
  me.** I did not re-research it and did not build anything.

  🔴 **`scsynth` IN WEBASSEMBLY IS MERGED UPSTREAM AND `sclang` IS NOT.**
  REPORTED: PR #7428 by Dennis Scheiba merged **2026-06-06**; the sclang one,
  PR #7440 by the same author, is **OPEN with `CHANGES_REQUESTED`**, last commit
  2026-09-22.
  ✅ **AND IN THAT BUILD sclang GENUINELY COMPILES A SynthDef IN THE TAB.**
  REPORTED, verified by that agent unpacking a real CI artefact: sclang emits
  `/d_recv` OSC and hands it straight to scsynth in the same page,
  `sclang.onOsc = (osc) => scsynth.sendOsc(osc)`, with no precompiled artefact
  anywhere in the path.
  🔴 **SO THE DEFECT THIS REPOSITORY GUARDS AGAINST IS FIXABLE AT THE SOURCE,
  WHICH IS THE WHOLE ARGUMENT FOR `fau` ARRIVING FROM A DIFFERENT DIRECTION.**
  MEASURED from `demo/grains/defs/PROVENANCE.json` in this working tree: the
  `.scsyndef` files are *"Compiled by sclang ON THE BOARD, not built here"*,
  and `LAYOUT.md` rule 6's `checkCompiledDefs()` exists purely because that
  artefact can go stale in silence. **An sclang in the tab deletes that guard's
  reason to exist.** It is open, not merged, and changes were requested.
  ⚠️ **SIZES, REPORTED from the CI zip**: `sclang.wasm` 2,311,861 B,
  `sclang.js` 197,472 B, `sclang.data` 1,972,637 B, `scsynth.wasm` 1,523,055 B,
  `scsynth.js` 131,791 B, **6,136,816 B for the editor set**, uncompressed. That
  is within 4 per cent of libfaust's 6,162,473, which is a coincidence worth
  noticing and not an argument. **Nobody has a compressed figure.**
  ⚠️ **AND THE LICENCE IS AGPL, WHICH I FIRST WROTE DOWN AS THE THING THAT
  DECIDES IT AND THEN CHECKED, AND IT IS NOT.** REPORTED: SuperCollider itself is
  GPL-3.0 and **the WASM binding is AGPL-3.0**, stated in PR #7440's own body.
  AGPL section 13 triggers on NETWORK INTERACTION rather than on distribution,
  and serving a page from `positron.studio` is network interaction.
  🔴 **BUT THIS REPOSITORY IS ALREADY SHIPPING AGPL SCSYNTH AND HAS BEEN SINCE
  SEPTEMBER.** MEASURED by me in this working tree, reading
  `demo/shell/vendor/LICENSE-supersonic-scsynth`: *"SuperSonic, Copyright (c)
  2025-2026 Sam Aaron ... under the terms of the GNU Affero General Public
  License ... version 3 ... or any later version"*, and the file is explicit
  that this *"is that of the combined program"*. `/patch/` and `/grains/` are
  deployed. **So AGPL is not a discriminator between Faust and SuperCollider
  here; it is the status quo**, and any obligation it creates is already
  created. ⚠️ Somebody should still decide whether that was intended. It is a
  question for a person, not for a plan, and it belongs in `LAYOUT.md` rule 6's
  neighbourhood rather than in this document.
  🔴 **IT ALSO NEEDS CROSS-ORIGIN ISOLATION.** REPORTED: scsynth uses pthreads
  and therefore SharedArrayBuffer, so COOP and COEP have to be set. Per the note
  under §8.1 that is a site-wide change, and Faust needs none of it.
  🔴 **AND THERE IS NO PACKAGE TO DEPEND ON.** REPORTED: `scsynth-wasm`,
  `supercollider-wasm`, `sclang-wasm` and `@supercollider/scsynth-wasm` **all
  404 on npm**. Distribution is a CI artefact URL, which cannot be pinned.
  ✅ **The board side is easy**: `supercollider-server` and
  `supercollider-language` are in Debian main at 3.13.0 on bookworm and trixie.
  ⚠️ REPORTED correction worth carrying: the Raspberry Pi extras archive itself
  carries Sonic Pi and **no** supercollider package. It comes from Debian main.
- 🔴 **AND THERE IS A ROUTE THAT DELETES THE PI BUILD STEP WITHOUT sclang AT
  ALL, WHICH IS THE MOST INTERESTING THING IN THIS WHOLE SURVEY FOR `/grains/`.**
  REPORTED, and verified by that agent in the shipped file rather than from a
  README: `rd--/jssc3` (Rohan Drape) is **260,739 bytes of plain JavaScript that
  encodes the binary SynthDef format itself**, carrying `const SCgf =
  Number(1396926310)` (which is the four bytes `SCgf`, the SynthDef magic) and a
  `graphEncodeUgenSpec` that writes UGen specs directly. Occurrence counts in
  that file: `Ugen` 489, `SCgf` 5, `/d_recv` 1, **`sclang` 0**. It runs under
  Deno on a Pi against native scsynth.
  ⚠️ **The price is the source language.** `rig/board/norns/Engine_Pappus.sc`
  would be rewritten in jssc3's JavaScript UGen DSL rather than sclang, and in
  exchange the `.scsyndef` files, `PROVENANCE.json` and `checkCompiledDefs()` all
  stop being necessary. ⚠️ Its licence is stated only as *"Gpl"* with no version
  and no LICENSE file, the repo has 4 stars, and nobody here has run it.
  `samaaron/supersonic` v0.84.2, released 2026-09-21, is the best engineered and
  **the only route needing no COOP/COEP** because it offers a postMessage
  transport, **but it has zero sclang and ships 130 precompiled `.scsyndef`**,
  which is the checked-in-artefact problem relocated rather than deleted. ⚠️ It
  is also what `demo/shell/vendor/` already holds.
- **Cabbage, GPL-3.0, alive** (its VS Code extension was pushed 2026-09-22) and
  **has no browser build at all**. REPORTED from its own forum, the author's
  only Pi advice is *"Then try to build. It will fail. Let me know"*, from 2020.
  What is interesting is Csound underneath it, which is §8.2.
- **Web Audio Modules v2, MIT, is a plugin packaging standard and not a DSP
  mechanism.** It has no non-browser runtime by construction, so it has no Pi
  side. MEASURED: the API spec is still **`2.0.0-alpha.6` from 2023-03-06**,
  three and a half years without a release. ✅ Its one live part is the Faust
  integration, `faust2wam`, which can wrap a runtime-compiled Faust DSP as a WAM.
  **Worth knowing if `fau`'s output should ever be hostable by somebody else's
  browser DAW. Not now.**
- **KFR, GPLv2 or later, or EUR 810.** DOCUMENTED, the ARM architectures are the
  **Plus** tier, so a Raspberry Pi is EUR 810 minimum, and **EULA clause 1.6
  forbids distributing the software together with hardware** below an Enterprise
  agreement, which is the exact shape of a Pi with software on it. 🔴 **And its
  WebAssembly support is documented, designed for in the CMake, and demonstrated
  by nobody**, vendor included: no CI job, no artefact among the 14 release
  binaries, no third-party build found. ✅ Its ARM Linux CI is the best in the
  survey, running the test suite under qemu. **A filter and FFT framework, not a
  synthesis library, and it would supply neither oscillators nor a graph.**
- **DaisySP, MIT, and the trap is the submodule.** DOCUMENTED: `DaisySP-LGPL`
  holds `reverbsc`, `moogladder`, `biquad`, `compressor`, `comb`, `allpass`,
  `bitcrush` and `fold` under **LGPL-2.1**, obliging a relink path for end users.
  ⚠️ **A plain `git clone` without `--recursive` silently omits them**, which is
  how this gets discovered late. Its Emscripten PR was merged in 2021 and the one
  worked browser example was abandoned after a week. Ahead of time regardless.
- **Q, BSL-1.0, the cleanest licence here and zero wasm prior art.** MEASURED:
  code searches for `emscripten` and `wasm` both return 0, and the one issue
  asking was closed with no answer. C++20, header-only, 85 headers. **You would
  be the first**, on a template-heavy library, which is a real risk for no
  runtime benefit.
- **Bela is a board, not a language, and it is a BeagleBone rather than a
  Raspberry Pi.** Its browser IDE is an editor served off the board, not a DSP
  runtime in a tab. Its relevance is the opposite direction: it runs Pd,
  SuperCollider **and Faust** natively, which is another vote for those rows.
- **Ardour/Lua** runs only inside Ardour's process. **Zig** has no DSP language.
  **pd4web** is ahead-of-time Emscripten packaging. **plugdata** has no browser
  build; what it has is hvcc. All four noted so they are not re-discovered.

### 8.5 What the survey could not settle

- 🔴 **NOBODY HAS PUBLISHED AN ARM LINUX BUILD OF ELEMENTARY, GLICOL, DAISYSP OR
  Q**, and none of the four has an ARM CI job. Every *"runs on a Pi"* for those
  is reasoning from portable source, not evidence. Each is one command on the
  board away from being a fact: `cmake --build` in `elementary/cli/`,
  `cargo install --git` for `glicol-cli`.
- **Whether Cmajor's ARM64 Linux build carries the JIT** or only the
  ahead-of-time code generator, and whether it targets a Pi's glibc. DOCUMENTED:
  its own Getting Started page mentions only Mac and Windows binaries, so the
  docs are behind the releases.
- **Whether WebAssembly is KFR's Regular or Plus tier is undefined in the binding
  EULA.** Only the marketing page splits by architecture, and it names CPUs only.
- **Cycling '74's exported-code licence thresholds**, because
  `support.cycling74.com` returns 403 to every fetch. Every figure quoted for
  RNBO is second-hand.
- 🔴 **TWO AGENTS RETURNED DIFFERENT LICENCES FOR THE SAME Pd EXTERNAL SET.**
  One reports `porres/pd-else` as **WTFPL** and the other says the `else` build
  *"carries GPL code in places"*. Both agree `porres/pd-cyclone` is BSD-3-Clause
  and that **`iem-projects/pd-zexy` is GPL-2.0**, which would infect a statically
  linked bundle. **Unresolved, and it only matters if `libpd-wasm` is ever taken
  seriously.**
- 🔴 **NO SUPERCOLLIDER WASM WAS BUILT BY ANYBODY**, so there are no latency,
  CPU or boot-time numbers for any SuperCollider route, and no compressed
  transfer size either. REPORTED. **Section 2.2's Faust compile times are the
  only measured latency figures anywhere in this comparison**, which is worth
  saying plainly rather than letting the table imply the rows are commensurable.
- **Nothing in this section was heard, run on a Pi, or executed in a browser.**
  Every size is a download or a decode, and the SuperCollider row was relayed
  rather than taken here.

---

## 9. The recommendation

🔴 **BUILD `fau`, AND BUILD THE WORKLET TECHNIQUE FIRST, AND THEY ARE SEPARATE
DECISIONS.** Section 2.4's `Function.prototype.toString()` into a Blob into
`addModule` costs nothing, needs no dependency, unblocks `plans/plan-nola.md`
§6.1 item 6 and the `BACKLOG.md` item behind it, and is true whether `fau` is
ever built. **It is the only item here that should happen regardless.**

### 9.1 Faust is the right one, and the reason is not what the ask assumed

The ask's reason was *both ends provably run the same graph*, and section 3
shows that reason does not hold as stated: the tab's compiler cannot emit the
board's code, and no Debian suite ships the tab's version.

**The reason to build it anyway is simpler and survives contact with the
measurements.** MEASURED, and the whole comparison in one row: a **one megabyte**
download, between 970,416 and about 1.4 MB depending on what the edge actually
compresses, buys a page where **editing ten lines of text changes what the audio
thread is running, in 10 milliseconds**. Nothing else in this repository
does that. `/grains/` ships a `.scsyndef` compiled somewhere else, `/muta/`
ships two fixed wasm modules, and both are binaries somebody made earlier.

⚠️ **AND THE TWO-ENDS CLAIM IS STILL WORTH MAKING, IN ITS TRUE FORM.** It is not
*one compiler, two outputs*. It is **one SOURCE, two compilers, with a
generated receipt saying whether they agree**, which is `expandDSP` from §3.2.
That is a weaker claim and it is a checkable one, which is the trade this
repository normally makes.

### 9.2 Against the alternatives, in one paragraph each

- **Cmajor is the only real competitor and it loses on size by a factor of ten.**
  Its in-browser compiler is a whole LLVM: **28,156,276 bytes raw, 10,280,020
  gzipped**, against libfaust's 6,162,473 raw and 1,530,849 gzipped. It wins on
  two things that matter here and should be said plainly: its standard library
  is **ISC** rather than a 42-file patchwork, and **`std::voices::VoiceAllocator`
  handles controller 64 properly, per channel, MPE aware**, which is the exact
  defect section 4.2 found in Faust. ⚠️ **If the page were about the pedal,
  Cmajor would win.** The page is about compiling, so the download decides it.
- **RNBO is architecturally excluded**: every export goes through Cycling '74's
  cloud compiler, so there is no runtime compilation in a tab at all, and it
  needs Max and a paid licence. **SOUL is dead**, last commit 2021-04-15 and last push 2022-07-21, and
  Faust's own compiler has removed its SOUL backend (§3.1).
- 🔴 **SuperCollider is the one that nearly wins, and it is stopped by three
  things that are not about audio.** Its sclang-in-the-tab branch does exactly
  what this repository wants and would delete `checkCompiledDefs()`'s reason to
  exist rather than guard it. But its sclang PR is **open with changes
  requested** and its author reports an unresolved deadlock on server boot, it
  needs **COOP and COEP site-wide**, which is a change to every page on this
  site, and there is **no npm package to pin**, only a CI artefact URL. Faust
  asks for none of those. ⚠️ **AGPL is NOT one of the three**, which I assumed it
  was until I read the licence of the scsynth already in `demo/shell/vendor/`.
  §8.4. ⚠️ **This is a reason to watch PR #7440, not a reason to close the
  question**: if it merges, it is a better answer for `/grains/` than Faust is,
  and `jssc3`'s pure-JavaScript SynthDef encoder may get there without it.
- **Csound is the safe answer and would make a duller page.** It compiles at
  runtime, its board side is `apt install csound`, it needs no cross-origin
  isolation, and **it handles the sustain pedal correctly by default**, which is
  the one thing §4.2 found broken in Faust. What it cannot do is show a visitor
  that their ten lines became **2,354 bytes of machine code**, because Csound
  compiles into its own interpreter and that number would be 5,985,167 every
  time. **The readout cell is the demo.** ⚠️ That is a real trade and somebody
  who cared more about the instrument than about the mechanism should pick
  Csound.

### 9.3 What `fau` must not do

1. 🔴 **It must not compile anything that arrived over a socket.** Section 6.3,
   and `BACKLOG.md` already named this as the question to decide before
   building. The answer is no, and the reason is section 6.2's 603 MiB.
2. 🔴 **It must not put the pedal inside the DSP.** Section 4.2.
3. ⚠️ **It must not hotlink the compiler from a CDN.** `CLAUDE.md`'s rule is
   about whose server it is. Vendor it, at the three lines section 10.5 prices.
4. ⚠️ **It must not draw the Raspberry Pi as a solid box** until section 11
   item 1 is answered. Section 10.3.

### 9.4 The order of work

🔴 **THE SHARED THING IS DONE FIRST AND BY ONE AGENT**, which is `CLAUDE.md`'s
rule for a fan-out.

1. **The one ssh command**: `faust --version` on the board. Section 11 item 1.
   It is four seconds, it changes what gets built, and everything in section 3
   is arithmetic over a number nobody has read. **If this is not done first, the
   diagram gets drawn against a default.**
2. **The worklet loader, on its own, with no Faust anywhere near it.** A
   `demo/shell/worklet.mjs` that takes named functions and constants, stringifies
   them, blobs them and `addModule`s them, plus its own test. Then
   `demo/shell/rhodes.mjs` into a worklet through it, and `plan-nola.md` §6.1
   item 6 is unblocked. ⚠️ **Three limits go in its header**: the lost closure,
   the secure-origin requirement, and CSP. Section 2.4.
3. **Vendor libfaust**, four files and a `LICENSE-faustwasm`, four lines in
   `workers/view/build.mjs`, and one `curl -I` against the deploy to answer
   section 11 item 3 before anything is built on top of it.
4. **The page against two presets only**, an oscillator and the Rhodes voice.
   Every control, the readout's six cells, the diagram, the compile-error path
   and every assert working. This is where the first browser numbers exist at
   all, which is section 11 item 4.
5. **MIDI, `pedal.mjs` and `-nvoices`**, with section 10.4's stealing assert,
   which is the one that would catch section 4.2's bug.
6. **The piano preset**, marked with its own compile time, out of the harness.
   And the listening test that `plan-nola.md` §7 wanted and this document could
   not do.
7. **The board**, if and only if step 1 said there is a compiler on it. The
   measurement that makes the two-ends claim real is section 11 item 9: ten
   seconds of one DSP rendered to a WAV at both ends, compared sample by sample,
   with the `expandDSP` hashes printed beside them.

⚠️ **STEPS 1 TO 4 ARE A SESSION AND STEPS 5 TO 7 ARE A SECOND ONE.** A page that
compiles a visitor's oscillator in 10 ms and says so in its own readout is a
finished demo with a known upgrade path. A page waiting on a Raspberry Pi is
neither.

---
## 10. What `fau` would be

### 10.1 The page

**`demo/fau/index.html`, slug `fau`, act 4, group `instruments`.** It sits
beside `grains`, which already claims *"one granulator, running in this page and
on a Raspberry Pi at once"*, and asks the same question about a different
mechanism.

**A visitor sees a text area with about ten lines of Faust in it, a keyboard, and
a readout.** They edit the text. A **compile** button turns the text into sound,
and the readout says how long that took and how many bytes it made. The keyboard
plays it. A **preset** row of four or five buttons loads a different DSP into the
text area: an oscillator, the Rhodes voice, a plucked string, a reverb, the STK
piano.

**What is actually on offer, in one sentence a visitor can act on:** you are
editing the program the audio thread is running, and it recompiles in the time
it takes to let go of the button.

⚠️ **THE PIANO PRESET IS MARKED, NOT HIDDEN.** 1,690 ms is the one control on
the page that is not instant, and a preset that takes a second and a half without
saying so reads as broken. Its button says how long it takes.

🔴 **NO PATCH ARRIVES FROM ANYWHERE.** Section 6.3. The presets ship with the
page, the text area is the visitor's own machine editing its own copy, and there
is no relay, no room and no shared editing. **If somebody later wants shared
editing, section 6.3's Worker-and-watchdog design is where that conversation
starts, and it starts with item 6 of section 11.**

### 10.2 What it measures, in six cells

The readout must have an even number of cells and every cell must be able to
change.

| key | unit | why it can change |
| --- | --- | --- |
| `compile` | ms | wall clock across `generator.compile`, which is the page's whole point and moves by two orders of magnitude between presets |
| `source` | B | the text area's length, which changes on every keystroke |
| `machine code` | B | the compiled wasm's byte length, which is the other half of the trick in 1.4 |
| `per voice` | KB | `meta.size`, the DSP struct, which is 0.26 KB for an oscillator and 944 KB for the piano |
| `sounding` | | voices currently ringing |
| `held by the pedal` | | the size of `pedal.mjs`'s own set, which is the number nobody can see |

⚠️ **`compiler` IS DELIBERATELY NOT A CELL.** `2.89.2` never changes, and
`positron-ui` is explicit that a cell showing a constant *"reads as a
measurement and teaches the reader to ignore the row"*. It goes in the diagram's
sub, where a fact that does not move belongs.
⚠️ **AND THE 6.16 MB DOWNLOAD GOES IN THE LOG, ONCE, NOT IN A CELL.** It happens
exactly once per page and a cell that changes once is not a measurement either.
The log line is the honest place to say what the page cost to open.

### 10.3 What the diagram shows

Last on the page, `{ how: true, atEnd: true }`, no title, and the page's `what`
is the manifest's `one` line verbatim.

- **`you`** (sub: `10 lines of Faust`), outside the browser, because the source
  is the input and a visitor typing is the thing that starts everything.
- Container **`Browser`**, holding:
  - **`libfaust`** (sub: `2.89.2, wasm`) with the note that the compiler is
    3.6 MB of WebAssembly and the standard library beside it is 2.4 MB of plain
    Faust source, fetched once.
  - **`dsp module`** (sub: `2 to 65 KB`) with the note that this is the machine
    code the audio thread runs, made a moment ago in this tab.
  - **`AudioWorklet`** (sub: `128 frames`)
  - **`pedal.mjs`** (sub: `CC64, 63/64`) with the note that the pedal is held
    OUTSIDE the DSP, because the voice allocator steals a note it thinks has
    ended.
  - **`speakers`**
- Container **`Raspberry Pi`**, holding **`faust2rpialsaconsole`** (sub:
  `the same .dsp`), **greyed or dashed, because it is not wired up**, with the
  note that the board compiles the same source to native ARM and that the two
  compilers are not the same version.

Arrows: `you` to `libfaust` labelled `source`; `libfaust` to `dsp module`;
`dsp module` to `AudioWorklet`; `pedal.mjs` to `AudioWorklet` labelled
`note off, later`; `AudioWorklet` to `speakers`; `you` to
`faust2rpialsaconsole` labelled `the same bytes`.

🔴 **AND THE PI BOX IS DRAWN AS UNBUILT OR IT IS NOT DRAWN.** `positron-diagram`'s
rule is that a diagram may never draw a mechanism the page does not have. Until
section 8 item 1 is answered the board is an intention, and an intention drawn
as a solid box is the one thing a diagram here may not do. **A dashed box with a
note saying so is honest. A solid one is a lie with arrows on it.**

⚠️ **NO BOX FOR THE STANDARD LIBRARY.** It is a file the compiler reads, not a
machine, so it belongs in the `libfaust` box's note.

### 10.4 How it is graded

- `node demo/check-html.mjs demo/fau/index.html` first, no browser at all.
- `node demo/verify.mjs fau`, everything costly behind `SELFCHECK` from
  `demo/shell/selfcheck.mjs`. The asserts only this page can make:
  - a visit compiles nothing and fetches no compiler, asserted over a counter,
    which is the `/reel/` repair
  - the compiler's own `version()` is `2.89.2`, which is the check that the
    vendored blob is the one the page was written against
  - a known source compiles to a known byte length, which is the
    `checkCompiledDefs` idea done at runtime instead of at build time
  - a deliberate syntax error is reported to the visitor AND the next good
    compile still works, which is section 6.1's finding turned into a guard
  - a key held with the pedal down and then released leaves the voice sounding,
    and lifting the pedal ends it, **with the negative control beside it**
  - more notes than `nvoices` with the pedal down does not silence the first
    one, which is section 4.2 turned into an assert and is the one that would
    have caught the bug
- ⚠️ **THE PIANO PRESET IS NOT IN THE HARNESS.** 1.7 seconds times every run is
  a real cost for a preset whose only new information is a bigger number in the
  same cells.
- ⚠️ **THE PAGE HAS NO TRANSPORT.** There is no position inside a sound, so
  `createTransportBar` is absent, which `/keys/` already settled.


### 10.5 What vendoring costs in the build

MEASURED by reading `workers/view/build.mjs`. `demoFiles()`'s extension set is
`.html .mjs .js .css .json .webmanifest .m4a .mp3 .opus .ogg .wav .webm .mp4
.m4v .png .jpg .jpeg .svg .webp`. **Neither `.wasm` nor `.data` is in it**, and
a `vendor/` subdirectory is a second level, which `demoFiles()` does not walk.

So `fau` costs **three explicit lines** in the allowlist, beside the ones
already there for `scsynth-nrt.wasm` and `plai.wasm`:

```js
['demo/fau/vendor/libfaust-wasm.wasm', 'fau/vendor/libfaust-wasm.wasm'],
['demo/fau/vendor/libfaust-wasm.data', 'fau/vendor/libfaust-wasm.data'],
['demo/fau/vendor/libfaust-wasm.js',   'fau/vendor/libfaust-wasm.js'],
```

plus `dist/esm/index.js` as `fau/vendor/faustwasm.mjs`, and a
`LICENSE-faustwasm` carrying `COPYING.txt` verbatim, which is what `LAYOUT.md`
rule 6 requires and what section 7.1 says the registry's one-line guess cannot
substitute for. ✅ **That is the rule working as designed**: a 6 MB binary should
cost somebody a deliberate line.

⚠️ **AND `checkVendorUrls()` ALREADY COVERS IT.** It was widened to `/…/vendor/…`
for exactly this shape, so a page pointing at a blob the build declined to copy
is refused rather than shipped.

⚠️ **NO CONTENT-SECURITY-POLICY WAS FOUND** by grep across `workers/view/src/`
and `workers/view/*.mjs`, which is what §2.4's blob technique needs. That is a
negative from a search and not a check of the deployed headers. UNVERIFIED.

### 10.6 Two packages that were checked and are not the answer

MEASURED from the npm registry today.

- **`@grame/faust-web-component` 0.8.1, LGPL-3.0, 10,212,253 B unpacked.** This
  is the drop-in: `<faust-editor>` and `<faust-widget>` custom elements with
  CodeMirror 6 inside them, and they do compile at runtime. It is the fastest
  possible route to a working page and it is the wrong one here, because it
  brings its own editor, its own control rendering and its own layout, and
  `positron-ui` exists precisely so that controls on this site are this site's.
- **`@shren/faust-ui` 1.1.19 is GPL-3.0-or-later**, 1,141,336 B unpacked. That
  is the auto-generated control surface that `faust2wasm`'s templates use, and
  **its licence is stricter than the compiler's**. It is not needed: the page
  reads `dsp-meta.json` and draws its own controls from the kit. ⚠️ **Worth
  knowing anyway**, because the obvious first move when copying a `faust2wasm`
  template is to copy the whole `faust-ui` folder with it.

---
## 11. What research could not settle

Ordered by how badly the plan depends on it.

1. 🔴 **IS THERE A FAUST COMPILER ON THE BOARD AT ALL, AND WHICH VERSION?** One
   command over ssh: `faust --version`. Everything in section 3 about the two
   ends is arithmetic over a version number nobody has read. If the answer is
   `2.54.9` the version-skew problem is real and `expandDSP` is the only bridge;
   if it is `not found` the first question is whether it can be installed at all
   on a board whose job is already sclang and a granulator. **Nothing else in
   this document is as cheap or as decisive.**
2. 🔴 **NOTHING HAS BEEN HEARD.** Not the STK piano, not the Faust
   transcription of `rhodes.mjs`, not one compiled oscillator. Every render was
   offline and graded by peak, RMS and zero crossings, which catches silence and
   catches clipping and catches nothing else. The piano in section 5 could be a
   convincing instrument or a dull thud and this document cannot tell you which.
3. **DOES CLOUDFLARE COMPRESS `libfaust-wasm.data`?** It has no extension the
   edge recognises. The difference is **1.0 MB against 2.9 MB over the wire**,
   which is the difference between a defensible download and an indefensible
   one. One `curl -I -H 'Accept-Encoding: br'` against a deployed copy settles
   it, and `workers/view/build.mjs` can rename it if the answer is no.
4. **NO BROWSER HAS RUN ANY OF THIS.** Every compile latency in section 2 is
   node v25.9.0 on an Apple Silicon Mac. A phone is the case that decides
   whether the page is usable and it is entirely unmeasured. INFERRED from
   nothing better than intuition that a phone is three to five times slower,
   which would make the piano a **five to eight second** compile.
5. 🔴 **WHAT IS IN THE OTHER 1.6 MB?** `@grame/libfaust` 1.3.1 carries the same
   three filenames at **4,540,295 bytes against `@grame/faustwasm` 0.18.5's
   6,162,473**, and npm declares it `GPL-2.0` rather than `LGPL-3.0`. **Nobody
   has run it**, so its compiler version, its backend list and whether its API is
   the same generation are all unknown. If it is a current compiler in a smaller
   blob it changes §1's whole budget. One `node -e` against it settles the
   version, and §3.1's backend enumeration settles the rest.
6. **CAN THE 2.4 MB STANDARD LIBRARY BE TRIMMED?** The `.data` blob is 53 files
   of plain Faust source and the compiler's filesystem is writable from
   JavaScript, so shipping only the libraries a page imports looks possible.
   INFERRED, and the obstacle is that the blob is baked by Emscripten's
   `file_packager` at build time. What would settle it: try writing the `.lib`
   files in by hand with `compiler.fs().writeFile` against a build with an empty
   preload, which means rebuilding libfaust, which means a toolchain this
   machine should not have. **Probably not worth it.**
7. **THE UNTRUSTED-PATCH SANDBOX IN 6.3 HAS NOT BEEN TRIED.** Whether a
   dedicated Worker plus a `terminate()` watchdog plus a `meta.size` ceiling
   actually contains the three failures in 6.2 is a design, not a result. The
   `par(i, 50000, ...)` case is the one to test, because it is the one that
   blocks for 9.5 seconds.
8. **THE PUBLISHED COMPILE-TIME LITERATURE WAS NOT REACHED.** The Letz et al.
   WWW 2018 paper returned 403. If somebody later finds published browser
   compile timings that contradict section 2.2, the published ones win.
9. **WHAT A FAUST DSP SOUNDS LIKE AGAINST THE SAME GRAPH ON THE BOARD IS THE
   WHOLE CLAIM AND IT IS UNTESTED.** Section 3.3 shows the same source gives the
   same sound at three sample rates in the same engine. It says nothing about
   wasm against native C++, which differ in vectorisation, in denormal handling
   unless `-ftz 2` is passed on both sides, and in float versus double if the
   flags drift. **The measurement that would settle it**: render 10 seconds of
   one DSP to a WAV at both ends and compare sample by sample, which is what
   `faust2sndfile.js` does in the tab and `faust2alsaconsole` plus a file sink
   does on the board.
10. **NO POLYPHONIC NODE HAS BEEN DRIVEN BY REAL MIDI.** Section 4.2's voice
   stealing conclusion is read off the source and is not observed. It is a
   strong reading and it is still a reading. The negative control is the one
   `plans/plan-nola.md` §6.4 already specifies: pedal down, play more notes than
   `nvoices`, listen for the first note dying.
11. **THE PER-VOICE MEMORY CEILING ON A PHONE IS UNKNOWN.** 32 voices of
    `piano1` is 29.5 MiB of wasm memory before any buffers. Whether an iPhone
    grants that inside an AudioWorklet is unmeasured, and it is the number that
    decides whether the piano is a phone demo or a desktop one.

---
