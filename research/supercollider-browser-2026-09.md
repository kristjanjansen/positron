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

⚠️ Pappus also holds one constraint of its own, 📄 from `rig/box/norns/README.md`:
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
  runs Csound in a browser today, and `rig/box/csd/space.csd` runs on the board.
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
