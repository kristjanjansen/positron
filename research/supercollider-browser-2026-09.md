# SuperCollider in a browser — what runs today (2026-09-12)

**scsynth compiles to WebAssembly and it works right now: booted here in headless
Chrome in 747 ms, played a note at peak RMS 0.503 against a silence control of
exactly 0.000000, with `crossOriginIsolated: false` and `SharedArrayBuffer`
undefined — so no COOP/COEP headers and nothing in this deployment breaks.
sclang does NOT compile to wasm and is not close, but Pappus does not need it at
runtime: 103 of its 107 commands are a one-line `synth.set`, which is `/n_set` on
the wire, and a pre-compiled `.scsyndef` handed over as raw bytes through
`/d_recv` played here on the first try. The engine is 1.70 MB of wasm to get a
grain cloud that Faust compiles to 6.6 KB and that **this repo already has in
251 lines of plain AudioWorklet** (`demo/shell/granular-worklet.js`, written
today from the same board measurement that prompted this research), so the
answer splits: ship SuperSonic if the asset you want is *Pappus specifically*,
and otherwise the granulator question is already closed.**

**RECOMMENDATION, in priority order:**

1. **Use SuperSonic this week as a differential oracle for the board bug, not as
   a product decision.** Today's measurement says no granulator parameter
   changes the returned audio on the Pi while `params.set` demonstrably reaches
   the engine. Those are two hypotheses with opposite fixes — a broken SynthDef,
   or a broken command path — and they look identical from outside. Compile
   `SynthDef(\pappus)` to bytes once on the board (it already has sclang),
   `/d_recv` it into a browser, drive `/n_set mrate 0.5` against `/n_set mrate
   24` and listen. If the browser's audio changes, the SynthDef is fine and the
   fault is in `pappus.mjs`→sclang. If it does not, the fault is in the
   SynthDef and the board was never the problem. That is a day's work against a
   bug that CLAUDE.md already calls expensive to debug.
2. **Do NOT port Pappus to the browser as a demo.** 1.86 MB of AGPL-3.0 C++,
   a 107-parameter surface, and a `what` paragraph that would violate the
   three-sentence rule before it started.
3. **The "~150 lines of AudioWorklet" question in the brief is already
   answered, in this checkout.** ✅ `demo/shell/granular-worklet.js` is **251
   lines** and does the job: ring buffer, sample-scheduled grains, raised-cosine
   window table, ten parameters, freeze, reverse, pan spread — and it reports
   every grain start, which the board structurally cannot. Nothing in this
   report argues for replacing it. Faust stays the escape hatch if the DSP ever
   needs to be better rather than merely present (§4.1: 48,062 B for a
   Pappus-shaped chain).

🔴 **READ §10 FIRST IF YOU CAME HERE FOR THE 64 KiB CEILING (2026-09-13).**
§8 below concluded that "the pappus SynthDef does not fit through `/d_recv`",
measured on a LITE build. ✅ **The TINY rung does fit, and it has now been
loaded, started, sounded and read back for real** — the compiled
`pappus.scsyndef` off the board, not a generated look-alike. What §8 says stays
true of LITE and FULL; it is false of TINY and BARE. §10 also finds a **second**
ceiling nobody had measured — the graph clears the byte one by 787 bytes and the
interconnect-buffer one by **five buffers**.

---

## 0 · Marks used in this file

- ✅ **MEASURED** — run on this machine today, numbers reproducible from
  `research/` notes below.
- 📄 **READ** — taken from a repo, README, PR or spec. Not confirmed by running.
- ⚠️ **UNMEASURED** — could not be checked here, and why.

Everything in §1–§4 that carries a number is marked. Nothing is a guess.

---

## 1 · Does scsynth compile to WebAssembly?

Yes, three separate times, by three people, and the third one is alive.

| project | what | last activity | licence | engine size |
|---|---|---|---|---|
| **SuperSonic** (`samaaron/supersonic`) | scsynth re-architected for AudioWorklet; npm, CDN, docs | ✅ pushed **2026-09-12** (today) | AGPL-3.0-or-later | ✅ **1,701,983 B** wasm |
| **SuperCollider official** (PR #7428) | scsynth wasm in the upstream tree | 📄 merged to `develop` **2026-06-06** | GPL-3.0-or-later | ⚠️ not measured — CI artefact |
| **scsynth-wasm-builds** (`rd--/`) | archive of Rutz's original port | 📄 builds dated **2022-02-01** / **2023-09-30**; repo pushed 2026-09-10 | 📄 **none declared** | 📄 1,596,945 B core / 1,943,223 B ext |

### 1.1 SuperSonic is the one that works today ✅

`samaaron/supersonic`, by Sam Aaron (Sonic Pi). 227 stars, 12 forks, **3 open
issues**, repo pushed **2026-09-12T18:06Z** — the same day this was written.
npm `supersonic-scsynth@0.81.0` published **2026-09-12T18:55Z**; first publish
**2025-11-02**; 81 versions in ten months. This is not a dormant proof of
concept.

Five packages, and the licence split matters:

| package | licence | ✅ measured unpacked |
|---|---|---|
| `supersonic-scsynth` (client) | AGPL-3.0-or-later | 563,702 B (incl. a 126 KB README) |
| `supersonic-scsynth-core` (engine) | AGPL-3.0-or-later | wasm **1,701,983 B** + worklet 30,263 B |
| `supersonic-scsynth-synthdefs` | **MIT** | 130 `.scsyndef` files, 668 KB |
| `supersonic-scsynth-samples` | **CC0-1.0** | 207 Sonic Pi samples |
| `supersonic-scsynth-bundle` | see LICENSE | everything |

✅ **What you actually ship for a working page: 1,701,983 (wasm) + 125,542
(client JS) + 30,263 (worklet) = 1,857,788 B before any synthdef.**

📄 The README states the licensing plainly: "The engine is scsynth
(GPL-3.0-or-later […]) running on clockwork (AGPL-3.0-or-later), and the
combined work is AGPL." `clockwork` is Aaron's own substrate and is dual-
licensed AGPL / commercial. **AGPL is the one licence that bites a deployed web
page**, because serving it over a network is the trigger. CLAUDE.md says
licences are footnotes here, not gates — recording it as a footnote, not a
recommendation against.

### 1.2 The official build exists but is NOT in a release 📄

- PR **#6569** (capital-G, opened 2024-12-12) — ScriptProcessorNode based.
  Closed, superseded.
- PR **#7428** "Add scsynth wasm build" — opened 2026-03-21, **merged
  2026-06-06** into `develop`. AudioWorklet, Emscripten+pthreads, CI for wasm,
  demo at <https://supercollider.dennis-scheiba.com/>.
- 📄 Latest tagged SuperCollider release is **3.14.1, 2025-11-24** — *before*
  the merge. So the official wasm build **is not in any shipped
  SuperCollider**, only in `develop`. "Merged" and "released" are different
  claims and the gap is real.
- 📄 A detail worth keeping: the PR fixed "a 30-year-old initialization bug in
  UGen constructors where excessive parameters caused wasm crashes."

### 1.3 sclang: no, and not soon 📄

PR **#7440** "Add WebAssembly support for sclang" — opened **2026-04-01**,
**still OPEN**, last activity 2026-09-11.

What its own author lists as missing: **no file access** ("approach still being
determined"), **no real networking** (sockets removed; a socket is *assumed* at
`127.0.0.1:57120`), **no threading** (`std::async` instead of a thread pool),
**OSCFunc/OSCdef unsupported beyond the server**, and clocks the PR itself calls
"janky". Review on 2026-09-11 was still arguing about interpreter lifetime and
object null-checks — that is mid-design, not pre-merge.

📄 On the earlier PR, capital-G explained why: sclang depends on file access, UDP
sockets and threading in ways scsynth does not, and suggested supporting
**hadron** (a Rust reimplementation of sclang) instead.

**So: server yes, language no.** For a norns engine that distinction is the
entire question, and §2 is the answer to it.

### 1.4 The older archive 📄

`rd--/scsynth-wasm-builds` archives Hanns Holger Rutz's original port (via
`dylans:wasm-no-submodules`). Two variants: **core** (64 MB initial memory,
512 KB packet, default UGens, dated 2022-02-01) and **ext** (256 MB, 16 MB
packet, **plus sc3-plugins** — including `TGrains2`, `TGrains3` and Josh Parmenter's
`Grain` UGens, dated 2023-09-30). ✅ Sizes read from the GitHub contents API:
core `scsynth.wasm` 1,596,945 B, ext 1,943,223 B.

📄 **No licence file in the repo.** R&D only, same footing as Pappus itself.

Relevant only if you need an sc3-plugins UGen — SuperSonic ships core UGens
only. Pappus does not need one (§2.2).

---

## 2 · Can a pre-compiled SynthDef be loaded and driven? ✅ YES — measured

This is the load-bearing result, so it was tested rather than reasoned about.

### 2.1 The measurement ✅

Headless Chrome (`--headless=new --autoplay-policy=no-user-gesture-required
--mute-audio`), local static server, packages served from disk, no CDN.

**Probe 1 — does it boot and make sound at all:**

```
import_ms                  9.4
crossOriginIsolated        false
SharedArrayBuffer_present  false
init_ms                    747.1
mode                       postMessage
sampleRate                 48000
ctx_state                  running
loadSynthDef_ms            8
rms_silence                0.000000      <- the deafness control
rms_peak_while_playing     0.503032
```

**Probe 2 — the actual question: a raw `.scsyndef` binary over `/d_recv`.**
The shipped Sonic Pi files are ✅ `SCgf` **format version 1**. Modern sclang
writes **version 2**, so testing v1 would have proved the wrong thing. A
v1→v2 converter was written for this (widen the int16 count/index fields to
int32; `specialIndex` stays int16) and its parser consumed the source file to
the exact byte. The converted file was then pushed through `/d_recv` as raw
bytes — never through `loadSynthDef`:

```
v2_file_bytes               2370        (from 1656 B of v1)
v2_header                   "SCgf v2"
rms_after_d_recv_silence    0.000000
rms_peak_v2_synthdef        0.502336    <- it played
```

✅ **A format-version-2 SynthDef binary, handed to wasm scsynth as bytes, loads
and plays.** That is the whole proposed architecture, proved end to end, with a
silence control that reads exactly zero on both sides of it.

**Probe 3 — how much fits.** `/status.reply` read straight off the engine:

| held synths | numUGens | glitchCount | glitchDurationMs | wasmErrors | schedDropped | schedLates |
|---|---|---|---|---|---|---|
| 4 | 404 | 0 | 0 | 0 | 0 | 0 |
| 18 | 1,818 | 0 | 0 | 0 | 0 | 0 |
| 41 | 4,141 | 0 | 0 | 0 | 0 | 0 |
| **85** | **8,585** | **0** | **0** | 0 | 0 | 0 |

✅ **8,585 UGens with zero dropped audio.** Pappus FULL is one synth with two
granulators and 48 resonators — nowhere near this. Headroom is not the problem.

🔴 ✅ **But `/status.reply`'s avgCPU and peakCPU fields read `0` at every load,
including 8,585 UGens.** They are not populated in this build. **A cell that
never changes is not a measurement** — do not quote scsynth's CPU percentage
from the wasm engine, and do not let a dashboard display it. `glitchCount` and
`glitchDurationMs` (from Chrome's `playbackStats`) are the counters that
actually move, and they are the ones to watch.

⚠️ **The glitch counts are from headless Chrome with `--mute-audio`.** The
worklet runs in real time against a silent sink, so this is a fair CPU test and
a weak *device* test. Re-measure on a real output — and on an iPhone — before
quoting it as a latency or dropout result.

⚠️ `averageLatencyUs` read ≈ **28,026 µs (28 ms)**, 📄 documented as "Average
audio output latency […] (Chrome playbackStats)". That is the headless sink's
latency, **not** an engine figure. Unusable as stated; re-measure on hardware.

### 2.2 What Pappus would actually need ✅

Read from the real source (`FoundSoundsMM/Pappus`, `lib/Engine_Pappus.sc`,
2,030 lines, fetched and analysed here):

- ✅ **One** `SynthDef(\pappus)`, at line 230.
- ✅ **107** `addCommand` registrations.
- ✅ **50 distinct UGens**, all of them core SuperCollider. The heaviest users:
  `Lag.kr`×80, `Select.ar`×13, `Amplitude.kr`×9, `DC.ar`×8, `LPF.ar`×7,
  `LFNoise2.kr`×7, `BufRateScale.kr`×7, `Phasor.ar`×5, `GrainBuf.ar`×4,
  `BufRd.ar`×4, `PlayBuf.ar`×4, `BufWr.ar`×3, `DynKlank.ar`×2, `PitchShift.ar`,
  `Compander.ar`, `CombL.ar`, `AllpassC.ar`, `LocalIn/LocalOut.ar`.
- ✅ **Cross-checked against SuperSonic's unsupported list** (📄
  `docs/SCSYNTH_DIFFERENCES.md`: `MouseX/Y/Button`, `KeyState`, `DiskIn/Out`,
  `VDiskIn`, `LinkTempo/Phase/Jump`, the Bela UGens, `BeatTrack`, `KeyTrack`,
  `Loudness`, `MFCC`, `Onsets`, `SpecFlatness/Pcile/Centroid`).
  **Intersection: empty. Pappus uses no unsupported UGen and no sc3-plugin.**

### 2.3 Why sclang is not needed at runtime ✅

This is the finding that makes the whole thing cheap. Every one of the 107
commands was read:

- ✅ **103 of 107** are a single line of the form
  `{ arg msg; synth.set(\mrate, msg[1]); }` or `synth.setn(\pfrq, msg[1..48])`,
  or `patbuf.setn(0, msg[1..16])`. On the wire those are **`/n_set`,
  `/n_setn`, `/b_setn`** — plain OSC, no interpreter involved.
- ✅ `bufclear` and `delayclear` are `buf.zero` / `dbuf.zero` → **`/b_zero`**.
  Supported.
- 🔴 ✅ `snapwrite` and `snapread` are `buf.write` / `buf.read` to a **file
  path** → `/b_write` and `/b_read`, which are 📄 on SuperSonic's unsupported
  list. The `supersonic.d.ts` enforces it at the type level — those addresses
  are typed to return **`never`**. Snapshots are the *only* part of Pappus that
  does not port, and they are a save/load feature, not the sound path. In a
  browser the replacement is `/b_getn` out to IndexedDB and `/b_setn` back in.

✅ **So the split is: sclang runs ONCE, on a machine that has it, to produce
`pappus.scsyndef`. After that the browser needs no language at all** — it needs
`/d_recv` once and `/n_set` forever. The board already has sclang, so the
compile step needs no new machine.

⚠️ **UNMEASURED: the actual Pappus SynthDef has not been compiled or loaded.**
There is no SuperCollider on this Mac (`sclang`/`scsynth` not on PATH, no
`/Applications/SuperCollider.app`, not in brew). What was proved is the
*mechanism* (a v2 binary over `/d_recv` plays) and the *compatibility* (no
unsupported UGen). What was not proved is that this particular 2,030-line
SynthDef compiles clean and sounds right. That is one command on the board:
`SynthDescLib` / `SynthDef(...).writeDefFile`, then copy the file.

⚠️ Pappus also holds one constraint of its own, 📄 from `rig/board/norns/README.md`:
one SynthDef "sitting close to **scsynth's fixed pool of 64 audio interconnect
buffers**". SuperSonic exposes `maxWireBufs` (📄 default **64** — the same
number). If Pappus is at the edge on the board it will be at the edge here, and
the knob to turn is `maxWireBufs`. Not verified.

### 2.4 Live input — Pappus granulates `In.ar`, so this matters ✅/📄

Pappus reads `context.in_b[0]` / `in_b[1]`; it is an *input* granulator, not a
sample player. 📄 SuperSonic documents `supersonic.node.input` as an
`AudioNode` you connect a `MediaStreamSource` to, `numInputBusChannels` default
**2**, and reads via `In.ar(2)` (hardware inputs sit above the output buses).
So `getUserMedia` → scsynth input bus is a documented path. ⚠️ Not measured
here — headless Chrome has no microphone.

---

## 3 · Realtime audio in a browser, and what it costs this deployment

### 3.1 The COOP/COEP question has a better answer than expected ✅

The assumption in the brief — AudioWorklet + SharedArrayBuffer requires
cross-origin isolation — is correct **but SuperSonic does not require
SharedArrayBuffer.** 📄 Two transports:

| mode | headers needed | 📄 stated trade |
|---|---|---|
| **`postMessage`** (**default**) | **none** | "works everywhere, no special headers needed"; "each postMessage involves serialisation, event loop scheduling, and deserialisation" |
| `sab` | `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp` | "highest performance and lowest latency and jitter" |

✅ **Measured, and this is the point: the probe ran with `crossOriginIsolated:
false` and `typeof SharedArrayBuffer === 'undefined'`, reported `mode:
"postMessage"`, and still hit `glitchCount: 0` at 8,585 UGens.** The default
path needs nothing from the deployment.

📄 `docs/MODES.md` gives **no latency or jitter numbers** for either mode — the
claim that SAB is lower latency is the project's own, unquantified. ⚠️ If the
difference ever matters here, it has to be measured; there is no published
figure to cite.

### 3.2 What turning isolation on would break — measured, not assumed ✅

If SAB mode were ever wanted, `COEP: require-corp` blocks every cross-origin
subresource fetched in **no-cors** mode that does not send
`Cross-Origin-Resource-Policy`. Checked against this repo's real dependencies:

```
https://live.err.ee/live/etv.m3u8
   HTTP/2 200
   access-control-allow-origin: *
   (no cross-origin-resource-policy)          <- would be blocked in no-cors

https://unpkg.com/supersonic-scsynth@latest/dist/supersonic.js
   HTTP/2 200
   access-control-allow-origin: *
   cross-origin-resource-policy: cross-origin  <- survives
```

✅ **ERR sends ACAO but no CORP.** hls.js fetches playlists by XHR in *cors*
mode, which ACAO covers — but the **native-HLS path is `video.src = <m3u8>`,
which is no-cors, and that is exactly the path CLAUDE.md says all WebKit uses.**
So isolating a page would break `replay`, `seek`, `flipper`, `now` and the ERR
demos on precisely the browsers that were hardest to get working. Add the
already-known ERR behaviour — segments under `/live/hls/` that 403 with no ACAO
by programme — and this is a bad trade for an unquantified latency win.

Two mitigations exist and both should be recorded rather than adopted:

- 📄 **`COEP: credentialless`** relaxes the CORP requirement for no-cors
  resources by sending them without cookies. It still enables cross-origin
  isolation. ERR needs no credentials, so this would probably work. ⚠️ MDN's
  page carried no compatibility table in the fetched content, and **Safari
  support is unverified** — which is the browser that matters for the native-HLS
  path. Do not rely on it without checking.
- **Isolation is per-document.** A Worker can set the headers on one path only
  (`/gran/*`), leaving every other demo alone. ✅ Cloudflare Workers static
  assets support a `_headers` file with path patterns (📄 up to **100 rules**,
  **2,000 characters** per line) — but 📄 "Custom headers defined in the
  `_headers` file are not applied to responses generated by your Worker code",
  and `workers/view` serves pages straight from the asset store with only
  `/api/*`, `/icy/*`, `/report` going through `src/index.js`. So `_headers` is
  the right lever here, not the Worker.

**Neither is needed for the default path. Recording them so the question is not
re-opened from scratch.**

### 3.3 The constraints that do not go away

- 📄 **128-frame render quantum** at 1.0 — 2.67 ms at 48 kHz. 📄 Web Audio 1.1
  adds `renderSizeHint`; "All user agents must support a renderSize that is a
  power of two between 64 and 2048." ⚠️ Actual support unverified.
- ✅ `AudioContext.sampleRate` came up **48000** here. Not guaranteed — it
  follows the device, and 44100 is common. Anything that computes grain lengths
  in samples has to read it.
- **Sound is gated on a user gesture and neither `play()` nor `resume()`
  rejects.** CLAUDE.md's existing rule applies unchanged: fire and move on.
  ✅ SuperSonic's own Quick Start builds the API around a boot button for this
  reason, and 📄 it emits `audiocontext:suspended` / `audiocontext:interrupted`
  (the latter iOS-specific) with a documented `recover()`.
- ⚠️ **Nothing here was tested on iOS.** Per CLAUDE.md's own hardest-won rule, a
  green desktop result says nothing about the iPhone path. `verify-native.mjs`
  would have to be pointed at any page that ships this.

---

## 4 · The alternatives

### 4.1 Faust — ✅ compiled and measured here, and it is not close

`@grame/faustwasm@0.18.4`, LGPL-3.0, ✅ published **2026-09-11** (active),
31.3 MB unpacked — **but that is the compiler, which you never ship.** Faust is
ahead-of-time: you ship the output.

Two DSPs were written and compiled here with Faust **2.88.0**:

| DSP | ✅ wasm | ✅ compile time |
|---|---|---|
| 8-voice live-input granulator (rate/size/pos/spray/pitch/wet, table record + hann-windowed overlap-add) | **6,659 B** | 65 ms |
| Pappus-shaped chain: 2 × 8-voice granulator → 48-band resonator bank → feedback delay → tilt EQ → zita reverb; 1 in / 2 out, 17 params | **48,062 B** | 385 ms |

✅ Total shippable artefact for the second, including GRAME's stock runtime
wrapper: **358,081 B** — and 12,835 B of that is the only glue strictly needed
(`create-node.js`). ✅ DSP state struct 2,402,144 B (two 262,144-sample tables
plus a 96,000-sample delay line — the buffers, not the code).

✅ **48,062 bytes against scsynth's 1,701,983.** 35x, for the same block
diagram at the same scale, with no server, no OSC, no SynthDef and no AGPL.

Honest caveats: it is a **rewrite**, not a port — those two DSPs are Pappus's
*shape*, not Pappus. Faust's language is unforgiving (four compile failures
before the second one built, all arity/syntax). And a 2,030-line instrument's
behaviour lives in details no block diagram carries.

### 4.2 Csound WASM — mature, and the repo already speaks the format

- ✅ `@csound/browser@7.0.0-beta33`, **Apache-2.0**, published **2026-08-12**.
- ✅ `dist/csound.js` = **2,728,071 B**, with the wasm embedded (zlib +
  `rawinflate.js`). Bigger on the wire than SuperSonic's engine.
- ✅ Four backends present in the package: `vanilla`, `worklet`,
  `worklet.singlethread`, `sab`. 📄 `useSAB` defaults **true** but is a
  parameter — so, like SuperSonic, **cross-origin isolation is optional**.
  📄 ScriptProcessorNode support has been removed; AudioWorklet only.
- 📄 Granular is Csound's strongest suit: `partikkel` (built specifically to
  cover "all time-domain varieties of granular synthesis" in Roads'
  *Microsound*), `grain3`, `granule`, `syncgrain`, `sndwarp`, `fog`.
- ⚠️ **`timeline/csound.mjs` is a SCORE COMPILER, not a Csound runtime.** It
  parses `t`/`i`/`s`/`m`/`n` statements into timeline rows. Nothing in this repo
  runs Csound in a browser today, and `rig/board/csd/space.csd` runs on the board.
  "We already have Csound" is true about the *format* and false about the
  *engine* — worth stating because the two get conflated.
- ⚠️ Not booted here. Unlike SuperSonic, no probe was run.

### 4.3 FAUST vs Csound vs the rest, for hosting a granular engine

| option | can host a granulator? | build/ship story | ✅ size |
|---|---|---|---|
| **SuperSonic (scsynth)** | yes, and can host *Pappus* | compile `.scsyndef` once elsewhere; `/d_recv` + `/n_set` | 1.86 MB |
| **Faust** | yes, rewrite required | AOT compile, ship the wasm | **6.6 KB – 48 KB** + glue |
| **Csound WASM** | yes, `partikkel` et al. | ship a `.csd` + the runtime | 2.73 MB |
| **Hand-written AudioWorklet** | ✅ **yes — already done here** | none | ✅ **251 lines** |
| **RNBO** | yes | 📄 **cloud compiler**, closed | ⚠️ not measured |
| **Web Audio Modules 2** | it is a *plugin format*, not an engine | — | — |

**RNBO** 📄: Cycling '74; the Web Export target compiles a patch to wasm via a
**remote cloud compiler** and emits a single `.json` per device wrapped as an
AudioWorkletNode. Licensing is more permissive than expected — 📄 "under $200k
in annual revenue or funding […] you do not have to pay any fees"; generated
code is dual Cycling '74 / GPLv3, engine source MIT. The blocker is not money,
it is that **you cannot build without their server and you need Max to author**.
Wrong shape for a repo whose whole ethos is measuring its own artefacts.

**Web Audio Modules 2** ⚠️: `webaudiomodules/api` was **last pushed
2023-03-06** — three and a half years dormant, 207 stars, 5 open issues. It is
also a category error for this question: WAM standardises how a plugin is
*hosted*, it does not synthesise anything. You would still need Faust or
hand-written DSP underneath. Skip.

---

## 5 · The verdict

🔴 **SCOPE, ADDED 2026-09-13 AFTER THIS SECTION MISLED A DECISION. Everything
below answers ONE question — "do we need scsynth to make granular sound in a
browser?" — and answers it correctly. It does NOT answer "can a synth definition
travel as a message, the way a shader does?", which is a different question with
a different unit: there the engine is a READER fetched once and the asset is the
thing that travels, so `1,701,983 B against 6,659 B` is not the comparison.
A PNG decoder is larger than most PNGs. That second question was put to the
repo the day after this was written, and the pass that rejected it did so by
quoting the paragraph below — which is how a right answer to the wrong question
costs a day. §9 is the second question, measured. `plan-patch.md` is the design.
Nothing in §5 is withdrawn; it is SCOPED.**

**For Pappus specifically: SuperSonic, and only because the SynthDef is the
asset.** Somebody designed 2,030 lines of signal flow. That work transfers as a
**binary**, measured here to work, at a cost of one `/d_recv` and 1.86 MB. A
rewrite throws it away and cannot be checked against the original. The 107
commands need no interpreter — §2.3 is measured, not argued.

**For "positron wants a granular demo": that is settled, and not by this
report.** ✅ `demo/shell/granular-worklet.js` already exists — **251 lines**,
written from the same 2026-09-12 board measurement — and its own header reaches
this conclusion independently: *"A granulator does not need any of that. It is a
ring buffer, a grain scheduler and a window function."* Two routes arriving at
the same answer from the same evidence is worth more than either alone. The
numbers below are why the scsynth route should not now be re-opened:

- ✅ **1,701,983 B against 6,659 B** for the same audible result. A demo page
  cannot justify 256x.
- The page would inherit an **OSC command surface, a node graph, a synthdef
  loader and a buffer allocator** to expose about six knobs — and CLAUDE.md's
  jargon rule bans every word needed to describe any of it. "deck", "lane",
  "commit" are already banned; "synthdef", "node ID", "audio bus" are the same
  offence in a new accent.
- **AGPL-3.0-or-later on a page served at positron.studio.** A footnote, per
  the project's own stance — but the one licence where "served over a network"
  is the trigger, so it belongs in the file rather than in someone's memory.
- ✅ The hand-written one is **251 lines** with no build step, no CDN and no
  wasm fetch to fail. It also does something scsynth cannot be made to do from
  here: **it reports every grain start**, because it is the code that starts
  them. A wasm scsynth is as opaque as the Pi — you would still be inferring
  grain behaviour from output envelopes, which is exactly the measurement that
  failed today.
- The one real argument the other way is **UGen quality**: `GrainBuf`,
  `DynKlank`, `PitchShift` and `Compander` are decades-tuned, and a hand-rolled
  resonator bank will sound worse before it sounds better. If that bites, **Faust
  is the escape hatch, not scsynth** — 48 KB, and `zita_rev1` and `fi.resonbp`
  are the same calibre of code.

**And the immediate use is neither of those.** Today's board measurement —
no granulator parameter changes the audio, while `params.set` demonstrably
reaches the engine (amp 1.0 → rms 0.2622, amp 0.05 → 0.1149) — is the exact
situation CLAUDE.md has a rule for: *when two hypotheses have opposite fixes,
build the measurement that separates them first*. A browser running the same
SynthDef, driven by the same `/n_set` values, over a transport with none of the
board's moving parts, **is** that measurement. It costs a `.scsyndef` file and
an afternoon, and it does not commit the project to shipping anything.

---

## 6 · What is unmeasured, and the cheapest way to close each gap

| gap | why it is open | cost to close |
|---|---|---|
| **Pappus's own SynthDef never compiled** | no sclang on this Mac | one command on the board, which has sclang |
| **Pappus never run in wasm scsynth** | follows from the above | `/d_recv` the file into the probe already written |
| **`maxWireBufs` / 64-interconnect-buffer limit** | 📄 Pappus is documented as close to it | falls out of the run above; the knob exists |
| **Live input (`In.ar`) path** | headless Chrome has no microphone | one page with `getUserMedia` on a real machine |
| **iOS / Safari — anything** | not tested at all | `verify-native.mjs`, which exists |
| **SAB vs postMessage latency** | 📄 no published numbers, either direction | only worth measuring if a real dropout appears |
| **Official SC wasm build size** | CI artefact, not fetched | irrelevant unless SuperSonic is rejected |
| **`COEP: credentialless` on Safari** | MDN table not in fetched content | only matters if SAB mode is ever wanted |
| **Csound WASM booted in a browser** | not probed | same harness, ~20 minutes |
| **Real-device audio latency / dropouts** | headless + `--mute-audio` | a real output device |

---

## 7 · Two traps found while doing this, worth keeping

- 🔴 ✅ **`coreBaseURL` alone did not work in `supersonic-scsynth@0.81.0`.**
  📄 The d.ts says `wasmBaseURL` "Defaults to `coreBaseURL + 'wasm/'`". It did
  not: the engine fetched `baseURL + 'wasm/scsynth-nrt.wasm'` and **404'd**.
  The self-hosting recipe in the core package's own README is the one that
  fails. Working configuration, measured:

  ```js
  new SuperSonic({
    baseURL:         '/supersonic-scsynth/dist/',
    wasmBaseURL:     '/supersonic-scsynth-core/wasm/',
    workletUrl:      '/supersonic-scsynth-core/workers/clockwork_audio_worklet.js',
    synthdefBaseURL: '/supersonic-scsynth-synthdefs/synthdefs/',
  })
  ```

  The failure is loud (a 404 and a rejected promise), which is the good kind.

- ✅ **Testing the shipped synthdefs would have proved the wrong thing.** They
  are `SCgf` **version 1**; sclang in 2026 writes **version 2**. A green run on
  v1 says nothing about the file the board would actually produce. This is
  CLAUDE.md's "measure the quantity in question, not one adjacent to it" —
  the v1 test could not have detected a v2 parsing failure, which is the only
  failure that mattered. Hence the converter.

---

## 8 · The oracle was run, and it is blocked on ONE thing (2026-09-13)

§5 proposed a differential oracle: compile `SynthDef(\pappus)` on the board,
`/d_recv` it into a browser, drive `mrate 0.5` against `24`. It was built and
run. **The rig works and the def will not load.**

**The board side is completely solved.** `sclang` on the Pi compiled the def the
board actually runs — ✅ `LITE=false`, **2,780 UGens**, **118,597 bytes**,
`SCgf` v2 — and the buffer table and buffer CONTENTS were dumped with it,
because the compiled def hard-codes bufnums (`gbufl.bufnum` is a literal in the
graph, not an argument):

| | |
|---|---|
| buffers | 29, numbered 0–28 |
| 0–3 | 2,880,000 frames, 1 ch — the grain rings |
| 4 | 528,000 — the delay |
| 5–9 | the shipped loops, 2 ch |
| 10–26 | 17 × 256 — the grain WINDOWS |
| 27–28 | 16 — the euclidean GATE |

🔴 **Two hypotheses died here, and they are worth recording so nobody re-runs
them.** ✅ `patbuf` reads **all 1s**, so the gate is fully OPEN and `melen = 1`
reads index 0 and passes — **LESSONS #47 does not apply to this board.** And the
envelope buffers are real raised cosines (254 of 256 non-zero, 0..1), so grains
are not being multiplied by a zero window.

**The browser side runs, with controls that prove it.**

```
init 687 ms · ctx 48000 Hz · state running
29 buffers allocated   (b_alloc done 29, no failures)
19 buffers filled with the board's own window and gate data
CONTROL: the source, direct      rms 0.0568  peak -14.4 dBFS
CONTROL: scsynth makes a sound   rms 0.0798  peak  -8.2 dBFS
```

Neither control is optional: without them "silence at every rate" and "this
harness is deaf" are the same reading, which is the mistake that produced three
"BlackHole is silent" readings in this project.

🔴 **`/d_recv` of a large SynthDef does not register, and fails SILENTLY.**

| def | bytes | result |
|---|---|---|
| the shipped v1→v2 converted one (§2.1) | 2,370 | ✅ `/done /d_recv`, plays |
| `sonic-pi-beep` via `loadSynthDef` | small | ✅ `/supersonic/synthdef/loaded` |
| **pappus LITE** (1,706 UGens) | **73,297** | ❌ nothing |
| **pappus FULL** (2,780 UGens) | **118,597** | ❌ nothing |

There is **no `/fail` on `/d_recv`** — no reply at all. The first thing the
server says is `/fail "/s_new", "SynthDef not found"`, and then every parameter
message answers `/fail "/n_set", "Node 1001 not found"`. Raising
`scsynthOptions` (`realTimeMemorySize` 262144, `maxWireBufs` 2048,
`maxGraphDefs` 2048) changed nothing, and all 29 buffers allocate cleanly, so it
is not memory and not buffer count.

⚠️ **And `loadSynthDef()` returns a SUCCESS OBJECT for a def the server never
received** — `{"name":"pappus","size":118597}` — with no `synthdef/loaded`
reply behind it. A green reply that is not evidence, the same shape as
`fx.pappus` answering ok seven seconds before the engine existed. Do not trust
its return value; watch for `/supersonic/synthdef/loaded`.

### 8.1 The limit is in scsynth, not in the transport — measured both ways

Bracketed with the package's own shipped defs, then repeated on the OTHER
transport:

| def | bytes | postMessage | SAB |
|---|---|---|---|
| `sonic-pi-fx_eq` | 8,584 | ✅ LOADED | ✅ LOADED |
| `sonic-pi-stereo_player` | 11,296 | ✅ LOADED | ✅ LOADED |
| `sonic-pi-fx_vowel` | 12,984 | ✅ LOADED | ✅ LOADED |
| **pappus LITE** | **73,297** | ❌ no reply | ❌ no reply |
| **pappus FULL** | **118,597** | ❌ no reply | ❌ no reply |

🔴 **Identical on both transports, so it is NOT SuperSonic's message plumbing —
it is the wasm scsynth's own OSC receive path.** Nothing on our side of the
wire can raise it.

⚠️ Getting to the SAB transport at all took two undocumented steps, both worth
keeping: **`mode: 'sab'` has to be ASKED FOR** — with `crossOriginIsolated`
true and `SharedArrayBuffer` present, SuperSonic still chose `postMessage` — and
**`workerBaseURL` points at `supersonic-scsynth/dist/workers/`, not at
`supersonic-scsynth-core/workers/`**, which holds only the audio worklet.
Pointing it at core gives `OSC IN worker initialization timeout`, which is a
loud failure and the good kind.

**So the limit is between 12,984 B and 73,297 B** — 65,536 is the obvious
constant — **and pappus LITE is only ~12% over it.**

**What this closes and what it does not.** The oracle as designed cannot run on
SuperSonic 0.81.0: the def does not fit, in either transport, and no option
exposed by the package changes that. It is not a configuration mistake and it
is not worth further guessing. What remains open is the same thing as before —
whether the board's fault is in the SynthDef or in `pappus.mjs` → sclang — and
it now needs a different instrument. The three that are left, cheapest first:
a smaller graph compiled from a cut-down engine (breaks "the SynthDef is the
asset", but would answer it); `scsynth` on the DEV MAC driven by the same
`/n_set` values, which has no size limit at all and is the obvious next move;
or reading the OSC buffer constant out of the wasm build and filing it upstream.

**Superseded: the limit is no longer UNMEASURED inside that range.**

🔴 **AND SUPERSEDED AGAIN, 2026-09-13 — see §10.** ✅ The oracle is no longer
blocked: the **TINY** rung (64,733 B, 1,467 UGens) loads into this same
SuperSonic in 11–12 ms, starts, answers all 103 controls, makes a sound against
a 0.000000 silence control, and delivers its per-grain `SendReply` at the rate
the board documents. LITE at 74,733 B still gets nothing, and §10.2 proves that
is bytes rather than the interconnect-buffer cliff the official-build report
found.

### 8.2 The limit is 64 KiB, bisected (2026-09-13)

A ladder of generated SynthDefs — `Mix.fill(n, …)` with n from 10 to 440,
compiled by sclang and written straight to disk, no server — pushed through
`/d_recv` one at a time:

| bytes | result |
|---|---|
| 2,115 … 40,590 | ✅ LOADED |
| **52,730** | ✅ **LOADED — the largest that does** |
| **68,892** | ❌ **no reply — the smallest that does not** |
| 89,150 | ❌ no reply |

✅ **65,536 sits inside that bracket.** The cap on a `/d_recv` into wasm scsynth
is 64 KiB, it is silent (no `/fail`, no reply of any kind), and it is the same
under both transports.

**Which makes this an arithmetic problem, not a wall:**

| | bytes | over 64 KiB |
|---|---|---|
| pappus FULL (2,780 UGens) | 118,597 | +81% |
| **pappus LITE (1,706 UGens)** | **73,297** | **+11.8%** |

LITE needs to lose **7,761 bytes**. The engine already gates whole stages on its
own `lite` flag — granulator two becomes `DC.ar`, a meter becomes `DC.kr`, the
feed network and two later stages are skipped — so a further rung in the same
idiom is the obvious lever, and the RESONATOR is the obvious thing on it: 48
modal filters that are not the subject of a granulator comparison, and whose
`pfrq`/`pamp` arrays nothing sends anyway.

⚠️ **That is a decision, not a task.** Cutting a stage means the browser runs a
DIFFERENT graph from the board, which weakens "the same engine in two places" to
"the same granulator in two places". The granulator is the subject, so it may
well be the right trade — but it should be made deliberately rather than
discovered afterwards.

⚠️ The M1 went to sleep mid-bisect (`Host is down`). The ladder was generated on
the Raspberry Pi instead, which is free: **a `.scsyndef` is a platform-
independent binary**, and `writeDefFile` needs no server, no audio device and no
JACK.

---

## 9 · The other question, and it works (2026-09-13)

§5 priced scsynth as a demo's sound engine. This is the question it did not ask:
**can a synth definition travel as a message?** Built as `/patch/`,
`node demo/verify.mjs patch`, **20 asserts from the page, all green**, no
console errors. `plan-patch.md` holds the design and the open ends; the numbers
are here because this file is where the mechanism was first measured.

### 9.1 What was measured ✅

| file | written by | bytes | building blocks | relay round trip |
|---|---|---:|---:|---:|
| `positron-bell` | a writer in `demo/shell/synthdef.mjs` | **339** | 7 | 34–46 ms |
| `positron-drone` | the same | **384** | 8 | 31–36 ms |
| `sonic-pi-beep` | **sclang, elsewhere, years ago** | 1,656 → **2,370** | 40 | 37–43 ms |

All three crossed `ws.positron.studio` as binary frames and came back
**byte-identical**; the copy that came BACK is the one both engines were given.
Engine boot **626–752 ms**, `postMessage` transport, `crossOriginIsolated:
false` — §3.1's finding holds unchanged in a real page.

✅ **The v1→v2 converter written for `/patch/` produced exactly 2,370 B from the
1,656 B shipped file — byte for byte the number §2.1 recorded for the converter
written independently for this report.** Two implementations, a day apart,
agreeing on a figure neither could have guessed. That is the strongest evidence
in either direction that the format is being read correctly.

### 9.2 The controls ✅

| | |
|---|---|
| SuperCollider, playing | 0.075000 / 0.049195 / 0.075015 rms |
| a second reader (Web Audio, in the page), playing | 0.075028 / 0.041645 rms |
| **both meters, nothing playing** | **0.000000 / 0.000000** |
| loudness 0.15 → 0, SuperCollider | 0.074984 → **0.000000**, `/s_get` reads back `0` |
| loudness 0.15 → 0, the browser's reader | 0.075021 → **0.000000** |

🔴 **The loudness assert is the only one that grades the ARITHMETIC in the
file.** Reading bytes back proves self-consistency; a wrong `BinaryOpUGen`
special index (2 is `*`, 0 is `+`) writes a well-formed file that ADDS the
loudness. Only an engine running the graph can catch that.

### 9.3 Two things worth keeping

🔴 **A `.scsyndef` is a SAFER thing to send than a shader, structurally.**
`plan-visuals.md` §1.2 requires a validator for generated GLSL — "no `while`,
bounded `for` counts, a compile timeout". A synth definition has **no control
flow at all**: it is a list of blocks, each naming a class from a fixed table
compiled into the engine, each wired only to blocks EARLIER in the list. The two
things a shader validator exists to catch cannot be expressed. Its cost is
bounded by the block count, which is in the header and can be read before
loading — `/patch/` reads it and prints it.

⚠️ **The narrow door is 64 KiB, and it is the BROWSER's.** §8.2's bisected
`/d_recv` ceiling binds here: the relay carries 256 KiB a message and a native
scsynth has no such cap, so a browser can be sent strictly less instrument than
a Raspberry Pi can. Pappus LITE is 73,297 B — **11.8% over** — so the one
instrument this repo cares about still does not fit, which is the finding that
should decide whether any of this goes further.

⚠️ **A MAXIMUM STRADDLES A CHANGE, and it produced a false negative that looked
exactly like the board's bug.** The first probe read PEAK loudness over 700 ms
immediately after setting the loudness to a tenth, and reported that the setting
did nothing — twice, convincingly. Two causes: the analyser's 2,048-sample
window still held 42 ms of the loud signal and a maximum keeps it forever; and
two detuned oscillators beat at 1.1 Hz, so any two windows differ anyway. A MEAN
taken after the change lands reads 0.000000. **The symptom was identical to "no
granulator parameter changes the returned audio on the Pi" (§5, the reason the
oracle was proposed). One of those two was a measurement artefact; it is worth
asking whether the other is.**

### 9.3b Broken on purpose, twice ✅

`OP.mul` changed from 2 to 0, so the file ADDS the loudness rather than scaling
by it: **18 of 20**, and only the two "a setting changes the sound" asserts went
red. *"SuperCollider made a sound"* read **0.914262** instead of 0.075000 and
PASSED — a wrong opcode writes a well-formed file that loads, plays, and crosses
the relay unchanged. Five checks are blind to it and one is not.

One count left 16 bits wide in the v1→v2 widening: the reader's exact-byte check
caught it and the run went red — but the file threw inside the page's own
`select()` and the loop skipped it, taking **five asserts with it, 20 → 15**.
Fixed so the skip fails loudly; re-sabotaged, **14 of 16** with the file named.

### 9.4 Still unmeasured

| gap | why |
|---|---|
| a definition written HERE loading into a NATIVE scsynth | only wasm scsynth has ever graded this writer |
| a definition compiled ON THE BOARD loading here | the Pi was in use; the sclang file used is Sonic Pi's, and is v1 |
| the same file sounding the same in two places | `synthdef-audio.mjs` already reports that it does not — band-limited sawtooth, no starting phase |
| anything on iOS | `demo/verify-native.mjs` exists and has not been pointed at `/patch/` |

---

## 10 · The REAL Pappus graph, in the browser — measured at last (2026-09-13)

**Every number in this repo's 64 KiB story had been taken with generated
look-alikes of the right byte size. This section is the real thing.
`pappus.scsyndef` was compiled on the board at all four rungs and sent through
`/d_recv` into the SuperSonic engine `demo/patch/vendor/` already ships.
🔴 TINY LOADS — 64,733 bytes, `/done /d_recv` in 11–12 ms, `/s_new` answers
`/n_go`, 1,467 UGens run, all 103 controls answer `/s_get`, it makes a sound
against a silence control that reads exactly 0.000000, and its SendReply UGens
reach the page at 8.00, 4.00 and 15.99 reports a second against the board's
documented 8.0 / 4.0 / 16.0. BARE loads too. LITE and FULL get nothing on any
channel, and it is BYTES: raising `maxWireBufs` to 128, 256 and 2048 and
`realTimeMemorySize` 32x changes nothing, while a generated definition of
LITE's exact 74,733 bytes with MORE UGens than LITE also refuses and one of
TINY's exact 64,733 bytes with 1,848 UGens — more than LITE's 1,722 — loads.
🔴 But there is a second ceiling nobody here had measured, and the real graph
sits much closer to it than to the byte one: TINY needs 59 audio interconnect
buffers of SuperSonic's default 64, and refuses at 58. Five spare.**

**WHAT THIS MEANS FOR THE RUNG TRADE, in one line: take TINY on the engine we
already vendor.** It is not a compromise any more — it is a graph that has now
been proved to load, start, sound and report in the shipped browser engine,
which is more than can be said for any other combination, and it costs no new
dependency (§10.9).

### 10.0 The instrument, and the control that makes it trustworthy ✅

The four rungs were compiled **on the board**, by the board's own sclang 3.13.0,
from `/opt/positron-board`'s own `Engine_Pappus.sc`.

⚠️ **sclang `File.delete`s the definition it sends** (`SynthDef.sc` `doSend`,
the `/d_load` branch), which is why `~/.local/share/SuperCollider/synthdefs/`
always reads empty and why the previous capture had to race a recompile. There
is no need to race it: `.add` calls `asSynthDesc(libname, keepDef: true)`, so
the SynthDef **object** stays in the library and

```supercollider
SynthDescLib.global[\pappus].def.asBytes
```

hands over the same bytes with nothing deleting anything. A 40-line
`writedef.scd` boots a **second** scsynth on its own UDP port with its own
buffers and its own JACK client, builds one rung, writes the file and exits.

🔴 **IT DOES NOT TOUCH THE RUNNING SERVICE, and that was checked rather than
assumed.** It is not `run-pappus.scd` with a line added — that file opens a
`/pappus/cmd` door and posts `/pgrain` into the live box's own UDP socket. ✅
Before and after all four compiles: one `sclang`, one `scsynth`, `PAPPUS_LITE=1`
in `/etc/default/positron-board`, `systemctl is-active` → `active`, and
`jack_lsp` showing the same single `SuperCollider` client. The board was on LITE
when this started and is on LITE now.

✅ **The control that says the route is honest: the LITE rung compiled this way
is byte-identical to the one captured by racing the directory.** 74,733 bytes,
`md5 8a37f38c33b9829fd8bba815c5c786cb`, both times. A different mechanism
producing the same bytes is what makes the other three trustworthy.

| rung | bytes | md5 | UGens | constants | controls | UGen kinds |
|---|---:|---|---:|---:|---:|---:|
| BARE | 43,551 | `2d262720…` | 941 | 91 | 103 | 37 |
| **TINY** | **64,733** | `08e8129f…` | **1,467** | 169 | 103 | 51 |
| LITE | 74,733 | `8a37f38c…` | 1,722 | 173 | 103 | 55 |
| FULL | 121,425 | `43837b3e…` | 2,812 | 181 | 103 | 63 |

✅ Every byte count and every UGen count matches `rig/board/norns/TINY.md`'s own
weighing table exactly, which is a second independent agreement.

### 10.1 🔴 Does the real TINY graph load? ✅ YES

SuperSonic 0.81.0 as vendored in `demo/patch/vendor/`, headless Chrome 152,
`postMessage` transport, 48 kHz, `--autoplay-policy=no-user-gesture-required
--mute-audio`, **one fresh engine per rung**, boot 730–737 ms.

🔴 **The answer waited for is `/done /d_recv` in the engine's own voice**, and
`/status.reply`'s `numSynthDefs` is read before and after as a second,
independent counter on the far side of the wire. Neither `loadSynthDef()`'s
return value nor SuperSonic's `loadedSynthDefs` is consulted — §8 measured the
first returning `{name,size}` for a definition the server never got and the
second going 1→2→3 across three sends of which one loaded.

| rung | bytes | `/d_recv` | `numSynthDefs` | `/s_new` |
|---|---:|---|---|---|
| BARE | 43,551 | ✅ `/done` after **12 ms** | 1 → 2 | ✅ `/n_go`, **941 UGens** |
| **TINY** | **64,733** | ✅ **`/done` after 11–12 ms** | **1 → 2** | ✅ **`/n_go`, 1,467 UGens** |
| LITE | 74,733 | ❌ nothing, on any channel | 1 → 1 | ❌ `/fail /s_new "SynthDef not found"` |
| FULL | 121,425 | ❌ nothing, on any channel | 1 → 1 | ❌ `/fail /s_new "SynthDef not found"` |

✅ TINY confirmed loading **six times** at the default `maxWireBufs`, LITE
refusing **five**, alternating
TINY/LITE/TINY/LITE in one sitting so the two cannot be separated by drift.

### 10.2 🔴 LITE's refusal is BYTES, and here is the instrument that could have said otherwise ✅

`research/scsynth-wasm-official-2026-09.md` §10 found a limit of a completely
different kind — `maxWireBufs`, biting at `/d_recv`, silent in the same way, and
structurally invisible to a byte ladder. ✅ **That cliff is in SuperSonic too and
the knob reaches it**, proved by breaking it on purpose with N oscillators all
alive at once into one `Out`:

| oscillators alive | bytes | `maxWireBufs` 64 | 128 | 256 |
|---:|---:|---|---|---|
| 63 | 5,634 | ✅ loads | — | — |
| **65** | **5,810** | ❌ **refused** | ✅ **loads** | — |
| **200** | **17,690** | — | ❌ **refused** | ✅ **loads** |

So the instrument discriminates. ✅ Pointed at LITE it says the opposite:

| LITE, 74,733 B | `maxWireBufs` | `realTimeMemorySize` | result |
|---|---:|---:|---|
| | 64 | 8,192 KB | ❌ nothing |
| | 128 | 8,192 KB | ❌ nothing |
| | 256 | 8,192 KB | ❌ nothing |
| | **2,048** | **262,144 KB** | ❌ **nothing** |

✅ And the byte ladder, regenerated **inside the same engine** from
`demo/shell/synthdef.mjs`, at the two sizes that matter:

| generated definition | UGens | result |
|---:|---:|---|
| **64,733 B** — TINY's weight | **1,848** | ✅ `/done /d_recv` |
| 65,520 B | 1,870 | ✅ `/done /d_recv` — the largest that does |
| 65,521 B | 1,871 | ❌ nothing — the smallest that does not |
| **74,733 B** — LITE's weight | 2,134 | ❌ nothing |

🔴 **1,848 generated UGens in 64,733 bytes load; 1,722 real ones in 74,733 bytes
do not.** More building blocks, fewer bytes, loads. That is the discrimination
in one line, and it is bytes.

✅ The 65,520 / 65,521 edge reproduces `research/synthdef-size-limit-2026-09.md`
§2.1 exactly, on a different day in a different harness. **TINY's headroom is
787 bytes to the measured edge and 755 to `SIZE_CEILING`'s derived 65,488.**

### 10.3 🔴 The SECOND ceiling, which the real graph is genuinely close to ✅

A byte ladder is blind to this and so was every number written here before
today. TINY was walked down `maxWireBufs` one at a time, one fresh engine each:

| `maxWireBufs` | 16 | 32 | 48 | 50 | 52 | **53** | 54 | 55 | 56 | 57 | **58** | **59** | 60 | 62 | 63 | **64 (default)** |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **TINY**, 1,467 UGens | ❌ | ❌ | ❌ | — | — | — | — | — | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **BARE**, 941 UGens | ❌ | — | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | — | — | ✅ |

✅ One fresh engine per rung, and every one of those engines passed its own
0.000000 silence control and played the 201-byte control definition first, so
"refused" is never confused with "this engine was not working".

🔴 **TINY needs 59 of SuperSonic's default 64. BARE needs 53.** Five buffers of
headroom, not eight hundred bytes of it — and the failure is the same silence,
so anyone who adds one stage and gets "no reply" will read it as the byte
ceiling and cut bytes that were never the problem.

📄 The board runs `-w 128` (`run-pappus.scd` sets `numWireBufs = 128`, and
`ps` on the board confirms scsynth was started with `-w 128`), so the two ends
are NOT at the same setting: the board has 2.2x the pool the browser does.
⚠️ **LITE's wire-buffer need is unmeasured and cannot be measured here** — it
never crosses `/d_recv`, so there is nothing to refuse it. It is the obvious
thing to check before anyone assumes a bigger browser engine would run LITE:
a graph that clears the byte ceiling can still be over this one.

### 10.4 Does it instantiate, and do the 103 controls survive? ✅ ALL OF THEM

✅ `/s_new pappus 3000 0 0 inbusl 2 inbusr 3 outbus 0` → `/n_go 3000 0`, and
`/status` then reads **1,467 UGens, 1 synth**, which is the file's own block
count to the unit.

✅ Every one of the 103 declared controls was asked of the SERVER, one `/s_get`
at a time, and compared against the value read out of the file:

| | |
|---|---|
| declared in the file | 103 |
| answered by the server | **103** |
| matching the file's own default | **101** |
| the two that differ | `inbusl` 0→2 and `inbusr` 1→3 — **set by the harness at `/s_new`** |

🔴 So it is 103 of 103, and the two apparent disagreements are the harness's own
arguments arriving. ✅ And the wire works in both directions: `/n_set mrate 12.5`
then `/s_get mrate` reads back **12.5**.

### 10.5 Does it make a sound? ✅ Yes, with the deafness control at exactly zero

A 220 Hz oscillator is connected into `sonic.node.input` — the granulator chews
its INPUT, so something has to go in. ⚠️ `msos` is not a flavour control
(CHAIN.md): at 0 the stage hands its input straight back, and 0.6 is the first
all-grains value.

| | RMS |
|---|---|
| 🔴 nothing playing, before anything is loaded | **0.000000** |
| a 201 B control definition playing (this harness can hear) | 0.141618 |
| 🔴 the synth running, nothing fed in | **0.000000** |
| `msos 0` — the input, handed back | 0.099919 |
| **`msos 0.6` — grains only, still recording** | **0.141219** |
| **`msos 1` — grains from a frozen buffer** | **0.191767** |
| 🔴 `amp 0` with everything else still running | **0.000000** |
| 🔴 after `/n_free` | **0.000000** |

⚠️ **The first grain arm read 0.000000 and it was the harness, not the engine.**
`mbuflen` defaults to **8 seconds** of a sixty-second ring, so grains were
reading a part of the buffer nothing had ever been written into. One second of
window, filled before the blend moves off the input, and it sounds. A test whose
subject is silent by construction cannot answer a question about sound.

### 10.6 🔴 Do the SendReply UGens reach the page? ✅ YES, and the count is graded

This is the blocker for the whole `grains` rewire, so it is graded against an
oracle rather than eyeballed. 📄 `CHAIN.md`: `report` fires once per GATED voice
per trigger, `gates` defaults to `[1,0,0,0,0,0,0,0]` — ✅ confirmed by reading
the compiled file — so the rate is `mrate` x 1, and the board measures 8.0 a
second at `mrate` 8, 4.0 at 4 and 16.0 at 16.

| `mrate` | `/pgrain` received | over | per second | the board |
|---:|---:|---:|---:|---:|
| 8 | 64 | 8.00 s | **8.00** | 8.0 |
| 4 | 32 | 8.00 s | **4.00** | 4.0 |
| 16 | 128 | 8.00 s | **15.99** | 16.0 |
| `report 0` | **0** | 1.5 s | **0.00** | — |

✅ Reproduced across every TINY run that carried the grain arm and both BARE runs. ✅ The payload is the
engine's own: `["/pgrain", 3000, -1, 0.1329…, 0.12, 0, 0]` —
`[nodeID, replyID, pos, dur, voice, half]`, exactly
`SendReply.ar(vtrig * report, '/pgrain', [pos, dur, i, half])`.

🔴 **So `demo/patch/engine.mjs`'s existing `sonic.on('in', …)` collector is all
the plumbing this needs.** Per-grain marks come back from the browser engine at
the rate the engine promises, and they stop when `report` goes off — which is
also the control that says the count is the graph's and not the harness's.

### 10.7 Can a browser actually RUN it? ✅ 1,467 UGens, zero dropped audio

⚠️ `/status.reply`'s `avgCPU`/`peakCPU` read 0 in this build at every load (§2.1)
and must not be displayed. The counter that moves is Chrome's own, which
SuperSonic surfaces through `sonic.getMetrics()`:

| after ~44 s with the graph running | |
|---|---|
| `glitchCount` | **0** |
| `glitchDurationMs` | **0** |
| `audioHealthPct` | **100** |
| `engineProcessCount` | 16,488 blocks (1,574 before the synth started) |
| `engineWasmErrors` · `oscInCorrupted` · `engineMessagesDropped` | 0 · 0 · 0 |
| `engineSchedulerDropped` · `engineSchedulerLates` | 0 · 0 |

✅ `getInfo()` also reports this engine's heap: **25,165,824 B**, with
`crossOriginIsolated: false` and no SharedArrayBuffer — §3.1's finding holds.
⚠️ `averageLatencyUs` ≈ 28,000 is the headless sink's, not an engine figure
(§2.1); unusable as stated. ⚠️ And this is headless Chrome with `--mute-audio`
on a Mac — a fair CPU test and a weak device test. Re-measure on a phone before
quoting it.

### 10.8 Three traps this cost, all of them the project's own shapes again

**A reply that answers in a different name is a harness that reads wedged.** ✅
SuperSonic rewrites `/b_alloc` into its own pointer command and answers
**`/done /b_allocPtr`**, not `/done /b_alloc`. A matcher waiting for the reply
scsynth documents waits for ever, and the first run looked like an engine that
had stopped after the positive control passed. 📄 The `/b_alloc` itself is fine
and fast: a 2,880,000-frame buffer allocates in **101 ms**.

🔴 **BARE's buffer numbering is five shorter than every other rung's, and
getting it wrong is silent in the worst direction.** BARE reads none of the five
shipped `.wav` loops (`loopbufs = []` when `bare`), so its grain windows start at
5 and its euclidean gate is 22/23 rather than 27/28. With the other rungs'
numbering the gate buffer was never allocated, the gate read 0, and **BARE fired
no grains and made no sound while passthrough still worked** — which reads as
"BARE has no grain clock" about a harness that mis-numbered a buffer. Corrected,
BARE grains and reports exactly like TINY.

**The reply list must be marked before the send.** Carried over from
`research/synthdef-size-limit-2026-09.md` §8 and worth restating because this
harness had four `/done`-shaped replies in flight (`/notify`, `/b_allocPtr` x29,
the control definition, then the rung): a matcher that searches the whole
history answers the wrong question with an earlier rung's success.

### 10.9 🔴 The rung trade, decided on measurement

| | TINY in the browser, TINY on the board | LITE at both ends |
|---|---|---|
| loads in the engine this repo vendors | ✅ **measured, six times** | ❌ measured, five times |
| starts, sounds, reports per grain | ✅ **measured** | — never got that far |
| wire-buffer headroom in the browser | ✅ 5 of 64 | ⚠️ unmeasured, and unmeasurable here |
| cost | none — `demo/patch/vendor/` is already deployed | a second wasm engine, one person's March laptop build, COOP/COEP on a route, and an engine that **dies** rather than declines (`scsynth-wasm-official-2026-09.md` §7) |

**Take TINY, and put it on the board too.** The reason to run it at both ends is
now the one `synthdef-size-limit-2026-09.md` §6.2 said it should be — *one
engine in two places is a comparison; a 2,812-UGen graph on a Pi beside a
1,467-UGen one in a tab is two instruments* — and it no longer needs the
capacity argument, which was false about the board and is now measured to be
true about the browser only for LITE and above.

⚠️ **And the sentence in `TINY.md` and `Engine_Pappus.sc` still needs its
correction, now for a second reason.** "wasm scsynth refuses a `/d_recv` over
64 KiB" was already wrong about SuperCollider and right about SuperSonic. It is
now also incomplete about SuperSonic: **the graph that fits has five interconnect
buffers to spare and 787 bytes**, and only one of those two numbers is in any
file. A cut made to save bytes that spends a wire buffer buys nothing.

### 10.10 What is still open

| open | why | the check |
|---|---|---|
| ⚠️ LITE's **wire-buffer** need | It never crosses `/d_recv`, so nothing refuses it for that reason. | Bisect `numWireBufs` on a native scsynth — the board prints `exceeded number of interconnect buffers` — or on a browser engine with no byte ceiling. Needs the engine restarted per rung, so not on the shared board mid-session. |
| ⚠️ The **sound** matching the board's | Both ends were driven with different material: a 220 Hz oscillator here, an arpeggio through fluidsynth there. | The differential oracle §5 proposed, now unblocked: same `pfrq`/`pamp`, same `mrate` sweep, `rig/board/measure.mjs` at both ends. |
| ⚠️ Anything on a **phone** | Measured only in headless Chrome on this Mac. | `demo/verify-native.mjs`; SuperSonic needs no COOP/COEP, so the route is already deployable. |
| ⚠️ The **buffer contents** are this harness's, not the board's | The 17 grain windows are rebuilt here from the engine's own `Env([0,1,0],[p,1-p],\sine)` formula, and the gate is all 1s. They are not the board's bytes. | `/b_getn` off the board's scsynth and diff, if a sound comparison ever needs it. |
| ⚠️ `snapwrite` / `snapread` | 📄 §2.3: `/b_write` and `/b_read` are on SuperSonic's unsupported list and typed to `never`. Unchanged by this. | IndexedDB via `/b_getn` and `/b_setn`, when somebody wants snapshots. |
