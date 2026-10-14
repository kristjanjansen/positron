# plan-plaits-on-pi: Plaits as an engine on the Raspberry Pi

Status (2026-10-14): a plan. Nothing installed, nothing built, no code changed
outside this file, nothing committed.

Asked (BACKLOG `## Open`, 2026-10-14): *"can we get plaits run on pi?"*

Tags: **MEASURED** (run today, the command named), **READ** (taken off a file
or a page, the path named), **INFERRED** (reasoned, not checked),
**COMPUTED** (arithmetic on numbers tagged elsewhere).

What was touched to write this: the Pi was reached over ssh on the studio LAN
(`positron@<pi>`, hostname `raspberrypi`, `/opt/positron-board`
present) and only read: model, OS, CPU, memory, installed packages, the process
table. Nothing was copied to it, started, stopped or played. On the laptop the
existing `demo/muta/vendor/plai.wasm` was run in node (a JIT of shipped bytes,
not a local compile) to time it. No headless Chrome was started.

## 0. The verdict

**Yes, and it is cheap.** The Pi is a Raspberry Pi 4 Model B with four
Cortex-A72 cores at 1.8 GHz, 1.8 GB of RAM and Debian 13 (MEASURED), it sits at
a load of 0.1 to 0.2 (MEASURED), and Plaits was written to run one voice on a
72 MHz Cortex-M4 (`FAMILY = f37x`, READ from `demo/muta/build/build.sh`; the
clock is INFERRED from the STM32F37x family). The estimate for the dearest
engine (two operator FM) at 8 voices is **about a third of one A72 core as
WebAssembly, less natively**, and the typical engines are under a tenth
(COMPUTED in §2). CPU does not decide this question. The board's architecture
does.

**Recommendation: a native `posplaits` JACK client, compiled on the Pi from
the same pinned source and the same `plai_shim.cc` that make `plai.wasm`, run
as a service beside the sampler and SuperCollider exactly as `scollide.mjs`
runs `poscollide`, and announced in `boardGraph()` as `pi-1:plaits` with
`midi-in`, `value-in` and `audio-out`.** Measure the existing WebAssembly on
the Pi first (step 0, ten minutes, no install), because it is also the
fallback.

Four findings decide it:

1. **The shim already is the native surface.** `plai_shim.cc` is a plain C API
   (`plai_init`, `plai_render`, `plai_note_on`, `plai_note_off`,
   `plai_set_param`, `plai_set_polyphony`, ...) with no browser in it, and its
   build script says in so many words that *"a wasm build here and an aarch64
   build on the board are two translations of the same text, and the digest is
   what says so"*, and that *"a Pi build would need [`-DTEST`] too, because
   that assembly is 32 bit ARM and the board is aarch64"* (READ,
   `demo/muta/build/build.sh`). So the native build reuses the shim, the 31
   source files, the two pins and the source digest unchanged.
2. **Only a JACK client sounds beside the other engines.** A source that writes
   its own frames (the `synth` path) is refused while the sampler sounds: *"the
   sampler is sounding through the JACK capture, and ${source} writes its own
   frames, so the two would interleave"* (READ, `rig/board/board.mjs`
   `startAudio`). And the owner's steer for the board was **"Jack based"**
   (READ, `plans/plan-portable-board.md` §0).
3. **The SuperCollider route gives a different Plaits.** mi-UGens' MiPlaits
   ships no aarch64 binary, is GPL-3, and its vendored Plaits is edited
   (`kBlockSize = 16; //(was 12)`, sample rate made a runtime global) (READ,
   GitHub, §1.B). The browser would play one instrument and the Pi another.
4. **A browser on the board is refused by the board's own rule** (*"No browser
   on the board"*, READ, `rig/board/README.md`), there is no Chromium installed
   (MEASURED), and the RAM is 1.8 GB.

## 1. The options

### 1.A Native C++ as a JACK client (recommended)

What it is: `plai_shim.cc` + the 31 pinned Plaits and stmlib files + one new
small host file (about 150 lines, INFERRED) that opens a JACK client
`posplaits`, registers `out_1`, and calls `plai_render(out, aux, nframes)` in
the process callback. Control arrives on the process's stdin from the board
and is applied inside the callback from a single producer single consumer
ring, because the shim's state is not thread safe (INFERRED from its globals,
READ `plai_shim.cc`). It answers on stdout: `ready`, the build stamp, the
source digest, voices, steals, render time.

Why it fits the JACK graph with no special case:

- the shim refuses any rate but 48000 (`plai_init` returns 0, READ) and jackd
  runs at 48000 on the card: `jackd -r -d alsa -C hw:CARD=Pro,DEV=0 -r 48000
  -p 512 -n 3` (MEASURED, process table);
- the shim carries a remainder across calls (`block_pos`, READ), so a 512
  frame JACK period is 42 Plaits blocks with 8 samples carried, and the scratch
  is 1024 frames (MEASURED, `plai_scratch_frames()`), so one period fits;
- it sums into the existing `posboard:input_1` capture the way `poscollide`
  does, with `ensureCapture('plaits')` and `setStandingRows('plaits', rows)`
  (READ, `rig/board/scollide.mjs`, `rig/board/jacksynth.mjs`).

What it needs on the Pi:

| need | today | READ or MEASURED |
| --- | --- | --- |
| a C++ compiler | `g++ 14.2.0`, `build-essential 12.12` installed, listed in `packages.txt` *"to build rig/vis on the board rather than cross-compiling"* | MEASURED, READ |
| the JACK headers | **absent**: no `/usr/include/jack`, no `libjack-jackd2-dev`. `libjack.so.0` is there | MEASURED |
| the pinned source | not on the Pi. `git` is installed; the laptop already has it at `tmp/plai-src/euro` | MEASURED |
| cmake | absent, and not needed (one `g++` line, as `build.sh` uses one `em++` line) | MEASURED |

So it needs **one apt package, `libjack-jackd2-dev`**, added to
`rig/board/packages.txt` and approved by the owner. (A way round the install
exists: declare the dozen JACK prototypes by hand and link
`/usr/lib/aarch64-linux-gnu/libjack.so.0` directly. It works because the JACK
C ABI is stable, and it is worse than one small package, so it is named and not
recommended.)

Build flags, so the two translations stay close: `-std=c++11 -O3 -DTEST
-fno-exceptions -fno-rtti`, as `build.sh`, plus **`-ffp-contract=off`**.
INFERRED: GCC fuses multiply and add by default on aarch64 in GNU mode, which
WebAssembly does not, so without it the native output drifts from the wasm for
a reason that is not in the source. `build.sh` already refuses `-ffast-math`
for the same reason (READ).

Where the build runs: on the Pi, by `push.sh`, rebuilt when the shim or the
host changed, the pattern it already uses for `rig/vis` (READ,
`rig/board/push.sh` "building the renderer"). Compile time on an A72 for 33
files at `-O3`: unmeasured, INFERRED one to three minutes, once.

Cost: lowest CPU of the four (§2), two more files in the repo, one package,
a build step on the Pi, a second artefact whose equality with the first has to
be shown (§4 step 2).

### 1.B MiPlaits inside SuperCollider (refused)

READ from `github.com/v7b1/mi-UGens` on 2026-10-14:

- **licence**: `gpl-3.0.md` at the root, and `MiPlaits.cpp` carries a GPL-3
  header. The Plaits DSP underneath is MIT.
- **binaries**: release v0.0.9 (2026-04-10) ships `mi-UGens-Linux.zip`, built
  by CI on `ubuntu-latest` only, so x86_64 (the architecture is INFERRED from
  the runner). No aarch64.
- **building it on the Pi**: needs cmake (absent, MEASURED) and a SuperCollider
  source tree (`-DSC_PATH`); the CI clones SuperCollider `main`, while the Pi
  runs `supercollider 1:3.13.0+repack-3` (MEASURED), so the source tree would
  have to be checked out at the 3.13 tag to match the server's plugin API.
  `sc3-plugins 3.13.0` is installed (MEASURED) and does not contain MiPlaits
  (MEASURED: 396 files in `/usr/lib/SuperCollider/plugins`, none matching
  `Mi` or `plaits`).
- **a different instrument**: its vendored `eurorack/plaits/dsp/dsp.h` reads
  `const size_t kBlockSize = 16;   //(was 12);` and `extern float
  kSampleRate;` (READ). Our shim's whole argument is that 12 is the size the
  envelopes were written for (READ, `plai_shim.cc`). It is also one voice per
  UGen with a `trigger` input (READ, `MiPlaits.sc`), so polyphony and voice
  stealing would be the board's own code, not the shim's quietest voice rule
  the browser plays.
- **the collide path cannot carry it**: page programs are compiled by
  `sclang-lite.mjs` against a whitelist of 12 UGens (READ,
  `plans/plan-pi-supercollider-defs.md` §0), and the tab's SuperSonic scsynth
  has no MiPlaits, so a program using it could never play on both ends, which
  is what `/remote/collide/` exists to show.

What it would buy: no new JACK client, SuperCollider's own scheduling. Not
enough against an edited DSP, a GPL wrapper and a cmake toolchain.

### 1.C The existing WebAssembly in node, frames straight to the relay (the fallback)

What it is: `rig/board/plaits.mjs` loads `plai.wasm` with
`new WebAssembly.Instance(module, {})`, which needs **zero imports** (MEASURED
today: `WebAssembly.Module.imports()` is empty; also READ in
`muta-worklet.js`), renders 960 frames every 20 ms, and hands them to
`pcmOut`, the path the arithmetic `synth` uses (READ, `rig/board/synth.mjs`
`startRealtime`, `board.mjs` `pcmOut`). node is `v24.21.0` on the Pi
(MEASURED).

For it: **nothing to install and nothing to compile**; the bytes on the Pi are
the bytes in the browser (sha256 `137de4cb...`, READ,
`demo/muta/vendor/PROVENANCE-plai.json`), which is the strongest form of the
project's *"imported, not ported"* rule (READ, `rig/board/README.md`); it moves
to any board with node 24, Pi 5 included, which `plan-portable-board.md` cares
about. About half a day of work (INFERRED).

Against it:

- **not on JACK**: refused while the sampler sounds (finding 2 above), cannot be
  wrapped by the granulator, has no `jack` ends for a bay link;
- it takes the single "instrument" slot, so starting it stops `synth`, `moog`
  or `capture` (READ, `startAudio` replaces);
- it renders on node's event loop: about 4.8 ms of every 20 ms for 6 voices of
  FM on the A72 (COMPUTED from §2), which is jitter for the WebSocket, the
  data channel and the camera. A `worker_thread` fixes that and is part of the
  work, not an extra.

### 1.D WebAssembly in node, bridged into JACK (rejected)

Node has no JACK binding without a native module, and none ships prebuilt
(INFERRED; `node-datachannel` is the board's one native dependency and is a
prebuilt, READ `push.sh`). The other bridges both cost more than 1.A:

- a small C "stdin to JACK port" bridge: native code anyway, plus a ring buffer
  between node's timer and the card's clock, which drift (INFERRED);
- `aplay` into `snd-aloop` and `alsa_in -j plaits` out of it: a second clock
  and a resampler, and the board already measured `alsa_in` resampling noise at
  *"up to -18.8 dBFS"* (READ, `rig/board/jacksynth.mjs` comment on `jackdArgs`).

### 1.E A headless browser on the Pi (refused)

Refused by `rig/board/README.md` (*"No browser on the board. Every permission
failure of 2026-09 came from running one unattended"*, READ). Chromium is not
installed (MEASURED). RAM is 1847 MB total, 1479 MB available (MEASURED), and a
headless Chromium with an AudioWorklet is hundreds of MB (INFERRED). It would
also need an audio route out of the browser into JACK or the relay, which is
1.D's problem again.

### Side by side

| | A native JACK | B MiPlaits in SC | C wasm in node | D wasm bridged | E browser |
| --- | --- | --- | --- | --- | --- |
| same DSP as the browser | same source and digest, second compile | **no** (block 16, edited) | **same bytes** | same bytes | same bytes |
| on JACK, beside sampler and collide | yes | yes | **no** | yes, with a second clock | no |
| install on the Pi | `libjack-jackd2-dev` | cmake, SC 3.13 sources | **nothing** | a native piece | Chromium |
| compile on the Pi | 33 files, `g++` | mi-UGens with cmake | none | a bridge | none |
| CPU, FM, 8 voices (§2) | ~15 to 25 % of a core, INFERRED | unmeasured | ~29 %, COMPUTED | ~29 % plus the bridge | far more, INFERRED |
| licence | MIT | GPL-3 wrapper | MIT | MIT | MIT |
| new board code (INFERRED) | host ~150 lines C, service ~300 lines JS | service + voice allocation | ~150 lines JS + worker | both | a page + a route |

## 2. What it costs, numbers

### 2.1 The WebAssembly, MEASURED on the laptop today

`node` v25.9.0 on an Apple M2 Pro, `plai.wasm` as shipped, 960 frame renders,
every voice holding a note (gate held, level 1), 5 s of audio per cell, after a
warm up. Script: scratchpad `plai-bench.mjs` (not committed; §4 step 0 commits
a board version). Realtime multiple, and share of one core in brackets:

| engine | 1 voice | 6 voices | 8 voices |
| --- | --- | --- | --- |
| virtual analog | 579x (0.2 %) | 93x (1.1 %) | 70x (1.4 %) |
| two operator FM, the worst | 152x (0.7 %) | 24.0x (4.2 %) | 19.3x (5.2 %) |
| granular formant | 363x | 60x | 44.5x (2.2 %) |
| harmonic (additive) | 303x | 49x | 37.2x (2.7 %) |
| particle noise | 283x | 48x | 35.0x (2.9 %) |
| modal | 302x | 52x | 38.0x (2.6 %) |
| string | 366x | 64x | 47.5x (2.1 %) |
| the other nine | 376x to 1113x | 63x to 217x | 47x to 164x |

`/connect/` and `/code/plaits/` play 6 voices (READ, `rt-plaits.mjs`
`voices: 6`); the shim's ceiling is 8 (MEASURED, `plai_max_voices()`).

### 2.2 Scaled to the Pi's A72, COMPUTED

The one like for like pair this repository has: the arithmetic Rhodes in node,
8 voices, **39.0x on this M2 Pro today** (MEASURED, `node rig/board/bench.mjs`)
and **6.8x on the Pi 4's A72** (READ, `rig/board/README.md`, measured there on
an earlier day with an unrecorded node version). Ratio **5.7**. Applied to the
wasm:

| | M2 Pro | A72 at 5.7x | A72 at 8x (a pessimistic margin) |
| --- | --- | --- | --- |
| FM, 6 voices | 4.2 % | **24 %** of one core | 33 % |
| FM, 8 voices | 5.2 % | **29 %** | 41 % |
| virtual analog, 8 voices | 1.4 % | **8 %** | 11 % |

Native (1.A), INFERRED: WebAssembly in V8 commonly runs at 1.2 to 2 times the
time of the same C++ at `-O3`, so FM at 8 voices lands around **15 to 25 %**.
Either way it is one of four cores, on a board whose own processes read
`board.mjs` 6.6 %, `ffmpeg` capture 4.1 %, `scsynth` (poscollide) 1.0 %,
`jackd` 0.9 % (MEASURED, `ps` lifetime averages, so a floor and not a peak).

### 2.3 Memory

The shim keeps 16384 bytes of allocator per voice, 8 voices (READ,
`plai_shim.cc`); the wasm reserves 4 MB of linear memory (READ, `build.sh`
`-sINITIAL_MEMORY=4MB`). Native, under 1 MB (INFERRED). Against 1479 MB
available (MEASURED). Not a factor.

### 2.4 Latency

| term | value | tag |
| --- | --- | --- |
| Plaits' own trigger delay | 5 blocks of 12 = 60 samples = 1.25 ms | READ (`plai_shim.cc`, "5 blocks of voice.cc's trigger delay line"), COMPUTED |
| JACK period on the card | 512 frames = 10.67 ms, 3 periods | MEASURED (`jackd` command line), COMPUTED |
| key press to the tab's speakers through a JACK instrument | ~175 ms relay, ~48 ms direct | READ, `plans/plan-pi-supercollider-defs.md` §3.1 (measured on Yoshimi) |

1.A rides the same capture as Yoshimi did, so it should land at those two
numbers, give or take Yoshimi's own 256 frame buffer (5.3 ms) going away and
Plaits' 1.25 ms coming in (INFERRED). 1.C skips JACK and ffmpeg but renders on
a 10 ms tick in 20 ms frames (READ, `synth.mjs`), so INFERRED within 10 to 20
ms of the same. Neither is measured; the board's network path dominates.

## 3. How it appears in the patchbay

Today `boardGraph()` gives a node in the `instruments` loop a `midi-in` and an
`audio-out` and nothing else; only `collide` gets a `value-in` (READ,
`demo/shell/graph-registry.mjs`). The catalogue's `plaits` already has the
three ports the brief asks for: `midi-in` (`TAKES_NOTE`), `value-in`
(`PARAM`), `audio-out` (READ, `demo/shell/nodes.mjs`). So:

- **`JACK_ENDS.plaits = ['posplaits:out_1']`**, mono, the shim's main output.
  The aux output is a different signal (READ, `muta-worklet.js` `channel`), so
  it is not a right channel and is not announced.
- **a `plaits` branch in `boardGraph()`** beside `collide`'s, not in the
  generic loop:
  `pi-1:plaits:midi-in` (`accepts: ['note']`, address `studio-1`),
  `pi-1:plaits:value-in` (`shape: { of: 'param', names: [...] }`),
  `pi-1:plaits:audio-out` (`shape: { rate: 48000, channels: 1, frameMs }`,
  transports `relay`, `datachannel`, and `jack` with the end above). The node
  keeps its catalogue name, so the Pi's is `pi-1:plaits` and the browser's is
  `web:plaits` (READ, the rule in `boardGraph`'s collide comment).
- **one parameter vocabulary, imported by both ends.** `value-in` events are
  `{ of: 'param', name, v }` with the names in `KNOBS` (READ, `rt-plaits.mjs`).
  `KNOBS`, `P` and `PATCHES` live in `demo/code/plaits-voice.mjs`, which
  imports `/shell/synth-view.mjs` by absolute browser path, so node cannot
  import it. They move into a pure module (say `demo/shell/plaits-params.mjs`)
  that the page and the board both import, the rule `synth.mjs` follows with
  `rhodes.mjs`. `pitch` is a transpose of the keys, not a Plaits parameter
  (READ, `rt-plaits.mjs` `set`), so the board applies it to the note.
- **verbs**, modelled on `scollide.mjs`: `audio.start { source: 'plaits' }`
  and `audio.stop { source: 'plaits' }` start and stop only it, beside anything
  else; `note.on` / `note.off` / `note.panic` with `node: 'plaits'`, the way
  the sampler and collide are addressed, so the direct path's reorder guard
  applies; `plaits.set { name, v }`; `plaits.patch { index }`; `plaits.stats`
  (voices, steals, render time, xruns, the build and the source digest).
- **a page**: `/remote/plaits/`, a copy of `/remote/collide/`'s shape (local
  voice, Pi voice, two scopes, a crossfader, keys and knobs linked to both),
  with `web:plaits` from `rt-plaits.mjs` and `pi-1:plaits` from
  `addBoardNode()` (READ, `demo/remote/collide/index.html`). And the Pi node
  appears on `/connect/` the moment the board announces it, because
  `/connect/` fills its bay from the registry.

## 4. Order of work

Each step ends in something somebody can check. Steps 0 and 1 change nothing
the board runs.

0. **Measure the wasm on the A72. Needs the owner's OK to copy two files to
   `/tmp` on the Pi.** `scp demo/muta/vendor/plai.wasm` and a committed
   `rig/board/plaits-bench.mjs` (the scratchpad script, pointed at a path), run
   `node plaits-bench.mjs`. Ten minutes. This replaces every COMPUTED number in
   §2.2 and is the go or no go for 1.C.
1. **Build native on the Pi, in `/tmp`, with no JACK.** `git clone` at the two
   pins, `g++` the 31 files and the shim with a tiny `main` that renders a
   fixed note script to a raw file and times itself. No package needed for
   this step. Gives the native CPU number and the compile time.
2. **Prove the two translations agree.** Render the same note script with the
   wasm in node and the native binary, compare sample by sample: report the
   largest difference and the RMS of the difference against the RMS of the
   signal. Expected close, not bit equal (INFERRED); with `-ffp-contract=off`
   it may be bit equal, and if it is, say so.
3. **Install `libjack-jackd2-dev` (owner's approval), add it to
   `packages.txt`, write the JACK host**, `rig/board/plaits/host.cc` beside a
   build line in `push.sh`. Check with `jack.graph` that `posplaits:out_1`
   exists and nothing else moved.
4. **The service**, `rig/board/plaits.mjs`, on `scollide.mjs`'s pattern, the
   `boardGraph()` branch, `JACK_ENDS.plaits`, the shared parameter module, and
   tests in `rig/board/test.mjs` against the fixture graph. `push.sh` prints the
   md5s of the new files too.
5. **Hear it**: `live-test.mjs`'s rule, rms before a note against rms after,
   with the sampler or collide sounding at the same time, which is the one
   thing 1.C could not do. Read `xruns` from `jack.graph` before and after.
6. **The page** `/remote/plaits/`, its `__demo` asserts, `say`, `what`, then
   build and deploy.

If step 0 says the A72 is fine and the owner would rather not install or
compile anything on the board, 1.C is the whole job (steps 0, then a
`plaits.mjs` on `synth.mjs`'s pattern in a worker thread, then 6), with its
limits written on the page: it sounds alone.

## 5. What could not be settled, and what would settle it

| unknown | why it is unknown | what settles it |
| --- | --- | --- |
| the wasm's real cost on the A72 | the brief allowed no writes to the Pi, so nothing was run there | §4 step 0 |
| native cost, and how close native output is to the wasm | nothing compiled anywhere, by rule | §4 steps 1 and 2 |
| the 5.7x M2 to A72 ratio for wasm | it was taken from JavaScript arithmetic, and the Pi's 6.8x was measured on an earlier day with an unrecorded node | step 0 replaces it |
| compile time of 33 files on the Pi | not run | step 1 |
| xruns with Plaits, the sampler and collide all on one 512 frame jackd | not run | step 5, `jack.graph` before and after |
| key to speakers for a Plaits note | inferred from Yoshimi's measurement | step 5 with `/remote/plaits/`'s lag cells |
| whether MiPlaits' block size 16 changes the sound audibly | not built, not listened to; it is refused on other grounds | nothing planned; only matters if 1.B is revived |
| whether the owner wants Plaits beside the other engines (1.A) or is fine with it alone (1.C) | a choice, not a fact | the owner |

One naming note, READ and not decided here: `build.sh` records that
upstream's README *"asks that derivative works not carry the Mutable
Instruments name or the module's name"*, and the browser node is already
labelled `Plaits` (`demo/shell/nodes.mjs`). The Pi node would follow whatever
the browser node is called.

## 6. Cost

- step 0: ten minutes, two files in `/tmp` on the Pi;
- steps 1 and 2: an hour or two, nothing installed;
- steps 3 to 5: about a day (INFERRED), one apt package, two new files on the
  board side and edits to `graph-registry.mjs`, `board.mjs`, `push.sh`,
  `packages.txt`;
- step 6: a page, half a day (INFERRED).
