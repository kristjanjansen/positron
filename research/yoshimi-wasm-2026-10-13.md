# Yoshimi and ZynAddSubFX in a browser tab (2026-10-13)

Status (2026-10-14): retired. Yoshimi was retired from the Pi the same day (archive/yoshimi/README.md, plans/plan-retire-yoshimi.md), and the port it recommended was never started (BACKLOG.md).

Asked 2026-10-13, about the Yoshimi the Raspberry Pi plays for
`/concepts/remote/000/`: *"yoshimi is based on sc? or just binary? can it work
in browser?"*, then whether a ZynAddSubFX or Yoshimi WebAssembly build exists
and what a port would cost.

Every claim carries a mark. **MEASURED** means run on this laptop today (Apple
M2 Pro, node 25.9.0, headless Chrome 155.0.8059.40). **READ** means read in the
source or on a page, not run. **INFERRED** means reasoned from those and not
checked. The scripts are in `research/tools/yoshimi-wasm/`.

## The short answer

- **Yoshimi is not SuperCollider.** It is a C++ program, forked from
  ZynAddSubFX in 2009 (Paul Nasca's engine, forked by Alan Calvert, maintained
  by Will Godfrey and others), and on the Pi it is a native binary that talks
  JACK and ALSA. READ, [Yoshimi homepage](https://yoshimi.github.io/),
  `rig/board/packages.txt` (`yoshimi 2.3.3.3-1`, 911 instruments in 24 banks).
- **It can work in a browser, and it already has.** Two WebAssembly builds
  exist and both play a note in an AudioWorklet in Chrome 155 today. MEASURED.
- **Verdict: port it, starting from the existing 2019 Yoshimi build rather than
  from scratch.** Rebuild that tree from source in the same container `/muta/`
  used for Plaits, about 1 to 2 days, then decide on a second step to Yoshimi
  2.3 (the Pi's version, 2 to 4 days more) only if a side-by-side render against
  the Pi shows an audible difference. The reasons are in §6.

## 1. What exists

### 1a. jariseon/yoshimi: Yoshimi 1.6.0 as a Web Audio Module (2019)

- **Repo** [github.com/jariseon/yoshimi](https://github.com/jariseon/yoshimi),
  branch `wam`, a fork of Yoshimi/yoshimi by Jari Kleimola (one of the authors
  of Web Audio Modules). Created 2019-10-02, last push 2019-10-02, 18 stars.
  READ (GitHub API).
- **Live demo** [webaudiomodules.org/demos/jariseon/yoshimi/](https://webaudiomodules.org/demos/jariseon/yoshimi/).
  The wasm there answers 200, 1,061,172 bytes, `last-modified` 2019-10-02.
  MEASURED with one `curl -I`; the page itself was not driven. The Yoshimi
  homepage links it: *"Jari Kleimola has ported the sound engines to
  webassembly"*. READ.
- **What it is**: Yoshimi **1.6.0** (`-DYOSHIMI_VERSION="1.6.0"` in
  `wam/build/Makefile`), headless, all three engines (ADDsynth, SUBsynth,
  PADsynth), every effect (reverb, echo, chorus, phaser, alienwah, distortion,
  EQ, dynamic filter), microtonal, MIDI learn. No CLI, no GUI. READ.
- **How small the change was**: **72 added lines** across 8 upstream files
  (`FFTwrapper`, `Config`, `MusicClient`, `FileMgrFuncs`, `Part`,
  `InterChange`), all `#ifdef WASM`, plus 1,273 lines of stub headers
  (`argp.h`, `fftw3.h`, `jack/ringbuffer.h`, `FL/Fl.H`, `zlib.h`) and the
  KissFFT and mxml headers. FFTW is replaced by **KissFFT**, gzip by
  **zlib.js on the main thread**, threads by nothing (no `pthread_create` is
  reached). READ, commit stats via the GitHub API.
- **How it outputs audio: AudioWorklet**, 128 frames, with a ScriptProcessor
  polyfill (`audioworklet-polyfill`) for browsers that had none in 2019. The
  wasm bytes and the glue JS travel to the worklet as `processorOptions` and the
  glue is `eval`ed there. READ (`wam/dist/worklet/yoshimi-awp.js`).
- **Patches**: a `.xiz` is fetched on the main thread, gunzipped by zlib.js, and
  the XML text is posted to the worklet, which loads it into **part 0 only**
  (`Yoshimi::set("patch")`). Banks are not bundled; `banks/root.json` lists 24
  banks and the files are copied in from the repo's `banks/`. READ.
- **Size**: `yoshimi.wasm` 1,061,172 bytes, **247,309 brotli** (q11), plus
  127,789 bytes of glue JS. MEASURED.
- **Licence**: Yoshimi GPL-2.0 (or later), WAM glue MIT, KissFFT BSD, mxml
  Apache-2.0 with exceptions, zlib.js MIT. READ (README).
- ⚠️ **It cannot be rebuilt as it stands.** It links `mxml.bc` and
  `kissfft.bc`, LLVM bitcode from the 2019 `fastcomp` Emscripten backend, and
  uses `EXTRA_EXPORTED_RUNTIME_METHODS` and `BINARYEN_ASYNC_COMPILATION`, all
  removed from current Emscripten. INFERRED from the Makefile; not attempted.
  So vendoring it means vendoring a binary nobody can reproduce, which is the
  opposite of what `demo/muta/vendor/PROVENANCE-plai.json` exists to prove.

### 1b. gboddin/zynaddsubfx-wasm: ZynAddSubFX 3.x for Strudel (2026)

- **Repo** [github.com/gboddin/zynaddsubfx-wasm](https://github.com/gboddin/zynaddsubfx-wasm),
  GPL-2.0, created 2026-04-25, last push 2026-05-15 on `develop`, 4 stars,
  announced upstream as
  [zynaddsubfx#395 "WASM version"](https://github.com/zynaddsubfx/zynaddsubfx/issues/395)
  (no replies). Releases v0.1.0 and v0.2.0 on 2026-04-25, CI green on
  `develop`. READ.
- **What it is**: the upstream ZynAddSubFX core (submodule at `3ab608c`) built
  with CMake under Emscripten, **real FFTW 3.3.11, liblo 0.34, mxml 4.0.4,
  zlib 1.3.2 and libsndfile 1.2.2 all cross-compiled to wasm**, GUI, JACK, ALSA,
  OSS and plugins off. A 501 line patch: semaphores stubbed, the liblo server
  disabled for port 0, PADsynth's sample generator forced down the single
  threaded `WIN32` path, the allocator pool cut from 16 to 8 MB, and a lot of
  `fprintf` tracing. READ (`Makefile`, `zyn-wasm-patch.patch`).
- **How it outputs audio: AudioWorklet**, ES6 module glue, wasm bytes posted to
  the worklet and compiled there, MIDI queued and applied at the start of each
  128 frame block (no sample accurate timing). It drives `Master::AudioOut`
  directly; the MiddleWare (Zyn's non-realtime half) is constructed inside the
  worklet too. 16 parts, each part's output exposed, and a pool of several
  instances for Strudel. READ.
- **Size**: `zyn_wasm.wasm` is **33,680,007 bytes**, 1,113,064 brotli. Of that,
  **30.4 MB is a data section holding ~1,268 uncompressed patches** embedded
  with `--embed-file`, and 1.1 MB is a `--profiling` name section. The code
  section alone is 2.09 MB, **472,973 brotli**. MEASURED by walking the wasm
  sections.
- **Heap**: 256 MiB from boot. MEASURED. The source says `INITIAL_MEMORY`
  512 MB and the `develop` head is titled *"Let's uuuuh use reasonable memory
  settings?"*.
- ⚠️ **Maturity**: a commit on 2026-04-25 reads *"Pooling mode, no more studer,
  investigating missing notes"*, and patch loads deliberately skip
  `ShutUp()`/`initialize_rt()` so ringing notes are not cut. MEASURED
  consequence: in a sweep that did not send all sound off between patches,
  tails from earlier patches piled up and the heaviest reading went from
  38.5 to 74.8 per cent of a core.

### 1c. Nothing else that runs

- **No WAM2 build** of either. READ: GitHub code search across the
  `webaudiomodules` organisation for `yoshimi` returns nothing; the only hits
  for Yoshimi and WAM are the 2019 port and a
  [KVR thread](https://www.kvraudio.com/forum/viewtopic.php?t=535281) about it.
- **Cardinal does not carry Zyn on the web.** Cardinal's Makefile builds with
  `HAVE_ZYN_DEPS=false` and excludes Carla's internal `zynaddsubfx` from its
  source tarball. READ
  ([DISTRHO/Cardinal](https://github.com/DISTRHO/Cardinal)). And
  `plans/plan-vcv-modules.md` §9.2 already measured Cardinal's web target as a
  main-thread ScriptProcessor.
- **Zyn-Fusion's split is real and does not help here.** The zest UI (mruby,
  OpenGL) talks to the core over OSC through `MiddleWare`, which is why a
  headless core and a remote UI work at all
  ([zyn-fusion](https://zynaddsubfx.sourceforge.io/zyn-fusion.html)). No web
  build of zest was found. READ. The OSC tree is still the cheapest parameter
  surface for a page, and the gboddin build already disables liblo's socket and
  could take OSC by function call instead. INFERRED.
- **PADsynth alone in JS**: [mmontag/padsynth-js](https://github.com/mmontag/padsynth-js)
  (2018, last push 2022, its own synth with PADsynth wavetables, Web Audio,
  playable at [mmontag.github.io/padsynth-js](https://mmontag.github.io/padsynth-js)).
  It is the algorithm, not Zyn's PADsynth engine, and cannot read a `.xiz`.
  READ. Paul Nasca published the algorithm itself as public domain; that claim
  is from memory and was not re-checked today.

## 2. Both builds, run here

### 2a. In a real AudioWorklet

`runner.mjs` served both builds from this laptop and opened each in headless
Chrome 155 with `AddSynth Morph` (the patch `/concepts/remote/000/` selects,
bank 115 program 32, which is `Will_Godfrey_Companion/0033-AddSynth Morph.xiz`),
held A3, and read an AnalyserNode one second later. MEASURED.

| build | boot | RMS after 1 s | console errors |
| --- | --- | --- | --- |
| Yoshimi 1.6.0, 2019 WAM | 20 ms to `addModule` (compile happens in the processor) | 0.038 | 0 |
| ZynAddSubFX 3.x, gboddin v0.2.0 | 933 ms (33.7 MB fetched locally, compiled, `zyn_init` ~620 ms) | 0.019 | 0 |

⚠️ **A Yoshimi format patch loads into Zyn and sounds**, but nothing here says
it sounds the SAME. The two RMS values differ by about 2x on every patch tried,
which is at least a different default master volume. Timbre parity was not
measured.

### 2b. Every bank patch, in node (same V8 as Chrome)

All **841** `.xiz` in the 2019 repo's `banks/` were loaded one after another
into part 0, an 8 note chord held for 1 s, released for 2 s. The figure is
render time as a share of one M2 Pro core at 48 kHz. MEASURED.

| | Yoshimi 1.6 wasm | ZynAddSubFX 3.x wasm |
| --- | --- | --- |
| instantiate + init | 14 + 23 ms | 90 + 623 ms |
| heap | 32 MiB at boot, 128 MiB after all 841 | 256 MiB, fixed |
| patch load, all, p50 / p95 / max | 1.4 / 46.2 / 175.9 ms | 1.1 / 40.5 / 166.0 ms |
| patch load, the 194 PADsynth patches | 29.8 / 84.1 / 175.9 ms | 27.6 / 74.6 / 166.0 ms |
| 8 voices, p50 / p95 / max | **2.4 / 8.6 / 17.0 %** | 1.7 / 17.5 / 38.5 % |
| AddSynth Morph, 1 voice / 8 voices | 0.5 / 1.3 % | 0.4 / 0.9 % |
| heaviest single patch | 17.0 % | `Noises/0006-Wind` 38.5 % |

Why Zyn's tail is twice Yoshimi's is not settled: the heaviest Cormi patches
measured the same on both in isolation (8.2 against 8.4 per cent), so it is
some patches and not the engine overall.

## 3. What a port needs, dependency by dependency

| on the Pi | in the tab | cost and status |
| --- | --- | --- |
| FFTW3 (float) | KissFFT (2019 port) or FFTW itself compiled with emcc (2026 port) | both done and MEASURED working; FFTW keeps bit parity with the Pi, KissFFT is smaller |
| mxml | mxml compiled with emcc | done in both; Yoshimi 2.3's `XMLStore` still uses mxml. READ |
| zlib (`.xiz` is gzip) | `DecompressionStream('gzip')` on the main thread, or zlib in wasm | the browser has gzip built in now; zlib.js is no longer needed. INFERRED |
| JACK / ALSA | an AudioWorklet calling `MasterAudio` per 128 frames | done in both |
| pthreads | nothing in Yoshimi 1.6; **Yoshimi 2.x `BuildScheduler` builds PADsynth wavetables on `std::thread`** and `InstanceManager` uses threads | needs the build to run inline (as gboddin did to Zyn) or SharedArrayBuffer threads, which need COOP/COEP. **positron.studio sends neither header today**, MEASURED with `curl -I`. Inline is the cheaper road |
| liblo (Zyn only) | disabled, port 0 | done in gboddin |
| FLTK / NTK GUI | not built | the page draws its own controls |
| argp (Yoshimi CLI) | stub header | done in 2019 |
| banks in `/usr/share/yoshimi/banks` | `.xiz` files served from our origin, fetched one at a time | a patch is 1 to 15 KB gzipped; all 841 are 4.4 MB. MEASURED |

### PADsynth: build time and memory, the part that is not free

- **Build time is a stall on the audio thread.** Both builds load a patch on
  the worklet's own thread, so a PADsynth patch takes **28 to 84 ms (p50 to
  p95) on an M2 Pro**, against a 2.67 ms render quantum: 10 to 30 quanta of
  silence or glitch on every patch change. MEASURED. On a phone it is longer
  (INFERRED, not measured on any phone). The cures, cheapest first: change
  patches only while nothing sounds; or build in a second wasm instance in a
  Worker and post the finished tables across (needs a small C++ entry point that
  exports the tables); or SharedArrayBuffer threads, which needs COOP/COEP.
- **Memory per PADsynth patch**: from each patch's `SAMPLE_QUALITY`
  (`samplesize` 2^(n+14) samples, times `(octaves+1) x samples_per_octave`
  tables, float32), the 194 PADsynth patches need **5.0 MiB at p50, 15 MiB at
  p95, 30 MiB at most** (`Drums/0002-subliminal-kit`). Computed from the XML
  with Zyn's formula from `PADnoteParameters.cpp` line 891. READ plus
  arithmetic; an upper bound, because every kit item's block is counted.
- **CPU per voice on a phone: not measured.** The M2 Pro numbers above are
  1.3 per cent for 8 voices of the Pi's patch. An iPhone of the last few years
  is within about 2x of that core and a cheap Android 3 to 5x (INFERRED from
  general single-core benchmarks, not from this code). Even 5x of the p95 patch
  is 43 per cent of a core, and 5x of AddSynth Morph is under 7.

### How the Pi's `.xiz` would load

The same files, unchanged: fetch the `.xiz` the Pi has (bank 115 program 32 is
`Will_Godfrey_Companion/0033-AddSynth Morph.xiz`, 2,150 bytes), gunzip, hand
the XML to the worklet. ⚠️ The Pi has 911 instruments in 24 banks on
Yoshimi 2.3.3.3 and the 2019 repo has 841; the extra 70 would need copying off
the board, which `voices.list` already enumerates. INFERRED, not compared file
by file.

## 4. How Plaits went, and what is different here

`demo/muta/build/build.sh` is the template and it fits: `emscripten/emsdk` in
OrbStack so nothing is compiled on the host (this laptop SIGKILLs local
binaries), upstream cloned at pinned commits into a gitignored `tmp/`, a small
hand-written C shim as the only exported surface, `-sSTANDALONE_WASM
-sFILESYSTEM=0 -sALLOW_MEMORY_GROWTH=0 -sINITIAL_MEMORY=4MB`, a source digest
over the commits, the shim and the sorted source list, and
`PROVENANCE-plai.json` beside the artefact. The worklet receives bytes over the
port because a worklet cannot fetch and a posted `WebAssembly.Module` is
silently never delivered (`demo/muta/muta-worklet.js`, measured 2026-09-22).
READ.

| | Plaits (`plai.wasm`) | Yoshimi 1.6 (2019) | Zyn 3.x code only |
| --- | --- | --- | --- |
| raw | 200,710 B | 1,061,172 B | ~2.1 MB |
| brotli | 114,920 B | 247,309 B | 472,973 B |
| sources | 31 files, no libraries | ~60 files + mxml + KissFFT | the whole core + FFTW, liblo, mxml, zlib, libsndfile |
| memory | 4 MB fixed | 32 to 128 MiB, growing | 256 MiB |
| filesystem | none | none | `FORCE_FILESYSTEM` |
| state | a handful of parameters | a 15 KB XML patch per part | the same, plus MiddleWare |

So Yoshimi is about 2x Plaits over the wire and comparable to the scsynth this
repo already vendors (`scsynth-nrt.wasm` 1,701,983 B, 348,054 brotli). What is
different is not size: it is **memory growth** (PADsynth tables are
allocated at patch load, so `ALLOW_MEMORY_GROWTH=0` with a fixed heap means
choosing a ceiling, about 64 MiB for the p95 patch), **a patch load that blocks
the audio thread**, and **a C++ code base with a filesystem habit**
(`loadXMLinstrument` takes a filename on desktop and was bent to take the XML
text instead).

## 5. The cost table

| route | effort | over the wire | sound parity with the Pi | risk |
| --- | --- | --- | --- | --- |
| A. vendor the 2019 binary as is | half a day of wrapping | 247 KB br + 128 KB JS | Yoshimi 1.6 against the Pi's 2.3.3.3, not compared | cannot be rebuilt; `eval` of glue in the worklet; old Emscripten runtime |
| **B. rebuild the 2019 tree from source in the muta container** | **1 to 2 days** | about the same | as A | low: the diff is 72 lines and already works |
| C. B, then rebase onto Yoshimi 2.3.3.3 | **+2 to 4 days** | INFERRED a little larger | the Pi's own version | `BuildScheduler` and `InstanceManager` threads to run inline; `XMLStore` is new |
| D. take gboddin's Zyn build | 1 day to strip the embedded patches and `--profiling` and wrap it | ~473 KB br | ZynAddSubFX, not Yoshimi; patches load, timbre not compared | one person's April 2026 repo, "missing notes" open, 256 MiB heap |
| E. don't; PADsynth-style pad on what is here | an afternoon | 0 new bytes | none: a different instrument | none |

Every effort figure is INFERRED, from the size of the diffs read today and from
how Plaits went, and none of it has been attempted.

## 6. Verdict

**Port it, by route B, and stop there until a measurement says to go on.**

1. **It exists and it works**, which is the strongest fact in this document: the
   2019 build plays the Pi's patch in Chrome 155 and loads all 841 bank patches
   in node with nothing silent. MEASURED. A port is therefore a rebuild of a
   known-good 72 line diff, not a research project.
2. **It is cheap to run.** 1.3 per cent of a core for 8 voices of AddSynth
   Morph and 8.6 per cent for the p95 patch on this laptop; 247 KB brotli,
   about twice Plaits.
3. **Not route A**, because the one thing `/muta/` established is that a
   vendored binary carries a recipe and a digest anyone can reproduce, and this
   one cannot be rebuilt with any current Emscripten.
4. **Not route D**, because it is ZynAddSubFX rather than the Yoshimi on the
   Pi, it is 30 MB of patches wrapped round half a megabyte of engine, and its
   own history says notes go missing.
5. **Route C only on evidence.** What would justify it is a render of the same
   note through the tab and through the Pi (the Pi's sound already comes back
   over the relay) that differs audibly. Yoshimi 2.x's background PADsynth
   build is real threading work for a question nobody has asked yet.

**The first step**: add a `yosh` case to a copy of `demo/muta/build/build.sh`
that clones `jariseon/yoshimi` at its last commit on `wam`, builds mxml and
KissFFT from source inside `emscripten/emsdk`, compiles the Makefile's source
list against them with a C shim in the style of `plai_shim.cc` (init, render
128, MIDI, load XML into part N) in place of the WAM glue, and then runs
`research/tools/yoshimi-wasm/yosh-bench.cjs` against the new artefact. **It is
done when AddSynth Morph's 1 voice and 8 voice RMS match the 2019 binary's
(0.040 and 0.142 in node).**

**If the answer is "don't"** (route E), the same kind of sound in a tab is a
pad, and this repo already has the parts: Paul Nasca's PADsynth algorithm is an
inverse FFT of a spread harmonic profile and fits in a page's JS, played as a
looped buffer through Web Audio or through the scsynth already vendored.
⚠️ That is the PADsynth half only. `AddSynth Morph`, the patch the Pi actually
plays, is ADDsynth, and nothing in this repo makes that sound except Yoshimi.

## 7. What could not be settled

- **Whether Yoshimi 1.6 and 2.3.3.3 sound the same** on the Pi's patches. It
  needs one render through each, same note, same patch, compared.
- **Whether Zyn 3.x and Yoshimi sound the same** on a Yoshimi `.xiz`: the 2x
  level difference is measured, the rest is not.
- **Any phone figure.** No phone ran either build. Load time and CPU on an
  iPhone and on a cheap Android are the numbers that would turn the estimates
  in §3 into facts; `verify-native.mjs` is the iPhone path.
- **Whether the 2019 build really cannot be rebuilt**: inferred from a
  Makefile that links fastcomp bitcode, not tried.
- **Why Zyn's p95 is twice Yoshimi's**: some patches, not traced.
- **Paul Nasca's PADsynth algorithm being public domain** is from memory.
- The live webaudiomodules.org demo page was not driven; only its wasm was
  fetched once.
