# Browser A/V editors — how everyone else drives time (2026-08-28)

Comparative survey against `timeline/transport.mjs` v0.4 (sessions 6h/6n/6p/6q/6r/6w,
`timeline/lab/NOTES.md`). Marks: ✅ measured (by us, or a number published by the
vendor), 📄 documented (primary source says so), ⚠️ inferred (no primary source;
reasoning stated).

VERDICT UP FRONT: **no existing engine could have replaced what we built**, but two came
close enough that we should have read them first — **Tone.js** (same two bets: worker
clock, 100 ms lookahead — and Chris Wilson published our exact 25/100 ms constants in
2013) and **IRCAM `@ircam/sc-scheduling`** (transport + lookahead + seek + speed, but
main-thread only, and seek is the processor's problem). What nobody has is the *seek*
half: every engine surveyed either re-renders from a pure function of `t`, stops and
restarts at the new position, or replays history from zero. `reduce(prefix ≤ t)` +
`assertState` as a **library** contract appears in none of them.

Three findings that reframe things:
- **The browser tried to solve multi-element sync and gave up** — HTML5's Media
  Controller was specced, never implemented, and dropped in HTML5.1 (§2). Every servo in
  this survey, ours included, is userland compensation for a deliberate platform gap.
- **The whole commercial video industry runs per-frame polling, not scheduling** (§4) —
  correct for them, because a video editor has state-at-`t` and no *events*. We have both
  kinds of lane, which is the entire reason this library exists.
- **We have one engine and it is the real-time one** (§6d). Everyone serious has two, or
  has consolidated onto one that can do both. Ours can be made to do both cheaply —
  `createVirtualRuntime()` and `OfflineAudioContext` already fit the seams — and until it
  does, "export" means real-time capture.

---

## 0. What we are comparing against (ours, for the table)

| axis | ours |
|---|---|
| clock master | `{p0,t0,rate}` vector over a pluggable ClockSource; **zero timers in the vector**. Media elements master *via* `sync()` (re-anchor, no seek semantics, nothing re-fires) ✅ |
| tick host | **Worker by default** — 8.5 ms p95 hidden vs main 981 ms, rAF 9175 ms ✅ |
| scheduling | lookahead, 25 ms tick / 100 ms horizon / 150 ms late-grace, committed-vs-pending, cancellable ✅ |
| audio | separate lane handed to WebAudio early; 10–40 µs render accuracy (1–2 samples @48 kHz) ✅ |
| seek | `reduce(prefix ≤ t)` → `assertState()`, per-kind adapter; property-tested `reduce(≤t) ≡ play(0→t)` at 100 seeds ✅ |
| multi-media | one element masters, others servo in a **±20 ms** dead band; 1169 `sync()` calls, 0 corrections over tolerance; start-together spread 43 ms → 0.1 ms ✅ |
| rate | positive only; per-adapter `caps.rates` lattice, log-nearest degrade, **degradation reported not hidden** 📄 |
| nesting | `createNest` — a span that IS a deck; depth 8; rate composes multiplicatively; drift nests never flattens 📄 |
| continuous | `sampleAt` / `bracket` with per-kind cursor, 3.67 comparisons/call at n=2000 *and* n=8000 ✅ |
| observability | drift is a **channel** (`onDrift`/`peekDrift`/`driftStats`), capped at 20 000 rows 📄 |

---

## 1. The two engines that already made our bets

### Tone.js — the closest relative, and it got there first

Read from source (`dev` branch, 2026-08-28):

- `Tone/core/context/Context.ts` defaults: **`clockSource: "worker"`, `lookAhead: 0.1`,
  `updateInterval: 0.05`, `latencyHint: "interactive"`** 📄
  — https://github.com/Tonejs/Tone.js/blob/dev/Tone/core/context/Context.ts
- `Tone/core/clock/Ticker.ts` is *architecturally our `workerTickHost()`*: a `Blob`
  worker running `setTimeout(tick, timeoutTime)` and `postMessage`-ing back, with a
  `"timeout"` fallback "if that isn't supported", plus a third `"offline"` source. 📄
  — https://github.com/Tonejs/Tone.js/blob/dev/Tone/core/clock/Ticker.ts
- `Tone/core/util/Draw.ts`: visual callbacks scheduled against audio time with
  `anticipation: 0.008` s ("half the time of an animation frame") and
  **`expiration: 0.25`** s — a Draw event more than 250 ms late is *dropped*. 📄
  That is a hard-coded catch-up policy of exactly one kind (`drop`), for exactly one
  lane (visuals). Ours is `caps.catchUp` per kind: `burst | drop | reduce`.
- **Seek**: `Transport.ticks` setter emits `"stop"`, calls
  `_clock.setTicksAtTime(t, time)`, emits `"start"` — i.e. *stop everything synced to
  the transport and restart at the new tick*. 📄
  — https://github.com/Tonejs/Tone.js/blob/dev/Tone/core/clock/Transport.ts#L631
  There is no state reconstruction. Held notes, cue state machines and anything
  stateful are the client's problem — which is precisely the hole session 6n fell into
  (jam needed a voice registry before seek meant anything).

**So**: worker tick and 100 ms lookahead are not our invention; they are Tone.js's
defaults and have been for years. Our 25 ms tick is half theirs. What we add over
Tone is the seek contract, the adapter registry with per-kind catch-up, media-as-master,
and nesting.

### `@ircam/sc-scheduling` — a transport with seek, on the wrong thread

Research-grade, from IRCAM-ISMM. Read from source:

- `Scheduler` defaults **`period = 0.02`, `lookahead = 0.05`** s, `queueSize = 1000`;
  constructor *throws* unless `lookahead > period`. 📄
  — https://github.com/ircam-ismm/sc-scheduling/blob/main/src/Scheduler.js
- Tick host is **`setTimeout` on the main thread** (`src/Scheduler.js:535`), with a
  source comment noting setTimeout's 1–2 ms error. 📄 No worker option, no rAF option
  ⇒ ⚠️ subject to the 1 Hz hidden-tab clamp; the failure mode our arm BG measured at
  981 ms p95 is unguarded here.
- `Transport` has `start/stop/pause/seek(position, time)/loop/loopStart/loopEnd/speed`
  and emits a `TransportEvent` `{type, position, speed, loop}` to each processor. 📄
  — https://github.com/ircam-ismm/sc-scheduling/blob/main/src/Transport.js
- **`speed` must be strictly > 0** (source: *"Note that speed must be strictly
  positive."*) — the same refusal of reverse we made, independently. 📄
- On seek, a processor is *told* the new position and decides for itself. There is no
  library-level fold. `serialize()` / `initialState` exist for cloning a transport to a
  second peer, not for reconstructing application state.

This is the single closest published design to ours, and the delta is exactly two
things: the tick host, and what happens to *state* on seek.

---

## 2. Media-element servo — the prior art is 12 years old and has numbers

**First, the buried lede: the browser tried to solve this and gave up.** HTML5 originally
specified a **Media Controller** — a shared clock for multiple media elements. Vendors
never implemented it and it was **dropped in HTML5.1**. WHATWG editor Ian Hickson, 2009,
on multi-`<audio>` sync: *"not a supported use case."* 📄
https://lists.w3.org/Archives/Public/public-whatwg-archive/2009Feb/0300.html
The authoritative statement of the residual problem is Arntzen/Borch/Daoust,
*Media Synchronization on the Web* (W3C/Norut, 2018): *"Two media elements… may follow
different clocks, and thus offset… may diverge over time even if playback was initiated
at precisely the same time."* 📄
https://www.w3.org/community/webtiming/files/2018/05/arntzen_mediasync_web_author_edition.pdf

Everything below — ours included — is userland compensation for a platform gap that the
platform explicitly declined to close.

`timingsrc` MediaSync (Motion Corporation / Norut; the reference implementation of the
W3C Timing Object) is the canonical "slave a `<video>` to an external clock vector",
i.e. our `sync()` contract. Source read (`v3/test/mediasync/mediasync.js`):

- **`target` default `0.025` s — 25 ms, commented *"~lipsync"***; the library starts at
  `target * 2` ("start out coarse"). 📄
- It is **adaptive**: failing to hold the target widens it (`target = min(1, target*1.4)`,
  hard cap 1 s) and firing a `target_change` callback; hitting it narrows back toward the
  user's original. 📄 We instead fix the dead band (±20 ms) and *report* corrections —
  our replay-grid measured 1169 syncs with 0 corrections over tolerance ✅.
- Graded `playbackRate` servo with bands at |diff| > 0.5 s (coarse), > 0.5, > 0.1,
  > 0.025 s, else fine; `mode: "skip"` forces `currentTime` writes instead when the
  browser can't do variable rate — and Safari is defaulted to `"skip"` by UA sniff. 📄
- **`automute`**: mutes the element while `playbackRate > 1.05 || < 0.95` — a published
  number for "how much rate nudge is audible". 📄
- Docs: *"larger adjustments are implemented by seekTo operations whereas more gradual
  corrections are achieved by modifications to the playbackrate"*, and
  *"Timed media playback requires a short initialization phase... expected to take
  0–3 seconds."* 📄
  — https://timingsrc.readthedocs.io/en/latest/sync/mediasync.html

The W3C Timing Object CG that produced this **closed in Jan 2025** (already in
`research/timeline-prior-art-2026-08.md`). The design is finished, unencumbered, and
unused — and our `sync()` + jump→seek discrimination is a rediscovery of it with a
tighter, non-adaptive band.

**Remotion** is the modern shipping instance, and it is both *far looser* and
*structurally different*. Source-verified (`packages/core/src/get-media-sync-action.ts`,
read 2026-08-28 — two of our research forks disagreed on this and the source settles it):

- `acceptableTimeShift` default **0.45 s** (0.65 s "with amplification"), with a source
  comment *"In Safari, it seems to lag behind mostly around ~0.4 seconds"*. 📄
- **The only correction is a hard seek.** The action union is
  `seek-due-to-shift | seek-if-not-playing | play-and-seek | none`. **There is no
  `playbackRate` servo at all** — `playbackRate` appears in the input only as the
  user-requested speed and as a `> 0` guard. Below the 0.45 s shift while playing, the
  returned action is literally `{type: 'none'}`. 📄
- Sub-thresholds `0.15` s (playing) / `0.01` s (paused) exist only for the *not playing /
  something-else-buffering* branch, with a comment that Chrome rounds `currentTime` to 6
  digits so an exact compare would thrash.
- It reads **`requestVideoFrameCallback`'s `mediaTime` (`rvcTime`) in preference to
  `video.currentTime`** when the rVFC sample is the more recent one, except for
  variable-fps video. 📄 That is rVFC used correctly — as a *measurement* primitive.

So the three published servo designs are genuinely three different bets:

| | dead band | inside the band | outside it |
|---|---|---|---|
| timingsrc MediaSync (2013) | 25 ms, **adaptive** (widens ×1.4 on failure, cap 1 s) | graded `playbackRate` servo, 4 bands; mute outside 0.95–1.05× | `currentTime` write past **1.0 s** diff ("skip" mode) |
| Remotion (2026) | **450 ms**, fixed | **nothing** | hard seek |
| dash.js low-latency | n/a (latency target) | rate bounds **0.96–1.04 (±2–4 %)**; Safari min change 0.25 | — |
| media-element-syncer | 200 ms refresh | — | seek past **1000 ms** |
| **ours** | **±20 ms**, fixed | `playbackRate` nudge | real `seek()` past `hardSeekMs` (250 ms in `nested.mjs`) |

**And MediaSync published measured accuracy**: **0–1 ms on desktop against an NTP clock**,
and ~7 ms for "echoless" audio/video, per Norut Tech Reports 15/2014 and 28/2015 cited in
the W3C paper §9. The Timing Object explainer states the target outright:
**"<10 ms media synchronization across the Internet."** 📄
https://webtiming.github.io/timingobject/

Ours is MediaSync's doctrine with a fixed, 22×-tighter band and a measured result
(1169 syncs, 0 corrections over tolerance; inter-tile max skew 34 ms = one 30 fps frame,
the physical floor ✅). Remotion's 450 ms is not sloppiness — it is the right band for a
system whose *authoritative* output is the offline render (§6); the preview only has to
look approximately right, which is exactly why `<OffthreadVideo>` exists.

⚠️ **A number we should stop repeating without a source.** The "±1–5 % rate nudge is
inaudible" figure has no primary perceptual citation — it is encoded implicitly in tool
defaults (timingsrc's ±5 % automute band, dash.js's ±2–4 % bounds), not quoted from an
audio-engineering study. Our rate-nudge budget rests on the same folklore.

**One graph or many?** Chrome's Web Audio FAQ recommends **one AudioContext per page** —
multiple contexts "can lead to a performance hit". 📄
https://developer.chrome.com/blog/web-audio-faq
And drift is observable *even inside one graph*: W3C issue WebAudio/web-audio-api#2652
records Chrome/Edge staying in sync while Firefox showed "flanging/slip" and Safari
"sync slip of many mS making an audible mess" when mixing `MediaElementAudioSourceNode`s.
📄 `AudioContext.getOutputTimestamp()` returning `{contextTime, performanceTime}` exists
precisely to bridge the audio-hardware clock to `performance.now()` — **the thing our
arm-E caveat says we must re-measure on real hardware** (headless fake-audio gave
1900–5200 ppm, not a DAC number ⚠️).

---

## 3. Background tabs — the industry does not talk about this

Primary sources for the mechanism:

- Chrome ≥88: hidden pages get **1 wake-up per second**; after **5 minutes hidden**,
  timer chain ≥5, silent ≥30 s, no WebRTC → **intensive throttling, 1 wake-up per
  minute**. Visible or audible pages are exempt. 📄
  — https://developer.chrome.com/blog/timer-throttling-in-chrome-88
- ⚠️ **Worker-timer exemption is practice, not spec.** The HTML timer algorithm is
  written generically over `Window` *and* `WorkerGlobalScope`, and background padding is
  only "optionally… implementation-defined". No Chromium doc states workers are exempt.
  It is universally relied on (Tone.js, Remotion, us) and universally undocumented. Our
  arm BG is one of the few published measurements: worker fg 15.9 → hidden **8.5 ms**
  p95, main fg 3 → hidden **980.7 ms**, rAF fg 3.5 → hidden **9174.6 ms** ✅
- **Firefox**: 1 s minimum clamp for inactive desktop tabs; **explicitly does not
  throttle a tab containing an AudioContext**; Android imposes a **15-minute** minimum
  and may unload background tabs; tracking scripts get a stricter 10 s clamp. 📄 MDN
  `setTimeout`
- **Safari**: no published numeric clamp; WebKit confirms rAF is *stopped* (not
  throttled), CSS/SVG animations suspended. On iOS full suspension after backgrounding is
  "very intentional" per an Apple engineer. 📄 https://webkit.org/blog/8970
- **Chrome 133 (2025) adds freezing on Energy Saver** — >5 min hidden + silent +
  CPU-intensive → frozen; exempt if mic/camera/screen-capture, a live
  `RTCPeerConnection`, WebUSB/Bluetooth/HID, or a held Web Lock. 📄
  https://developer.chrome.com/blog/freezing-on-energy-saver
  Plus the **Page Lifecycle** FROZEN state, which suspends the whole task queue. 📄
  **This is a live risk for us**: a worker tick is not on the exemption list. A long
  archival playback in a hidden tab could be frozen outright, and our answer would have
  to be one of the documented exemptions (audio output is the natural one — a silent
  playing AudioContext also exempts a page from *timer* throttling) or accepting the
  freeze and letting `catchUp: 'reduce'` do its job on resume, which arm D measured at
  **0.5 ms to correct state after a 3 s freeze** ✅.
- ⚠️ "Quick Intensive Throttling" experiments drop the intensive entry point from 5 min
  to as little as **10 s**. The direction of travel is hostile.

What the field does instead:

- **GSAP** — clock is `requestAnimationFrame`; default **`lagSmoothing(500, 33)`**: any
  inter-tick gap over 500 ms is *treated as 33 ms*. 📄
  — https://gsap.com/docs/v3/GSAP/gsap.ticker/
  That is a deliberate choice to make the timeline **lie about elapsed time** rather than
  jump — smooth animation, wrong position. Their own guidance is to call
  `gsap.ticker.lagSmoothing(0)` "if your animation must stay locked to an external clock
  like audio or video". Our vector cannot lie: position is `p0 + (now − t0)·rate` by
  construction, and the lie-vs-jump question is instead answered per kind by
  `catchUp: burst | drop | reduce`.
- **Remotion Player** — RAF, with an explicit fallback: *"requestAnimationFrame() does
  not work if the tab is not active... In that case, we use setTimeout() instead."* 📄
  — `packages/player/src/use-playback.ts`. Correct direction; still lands on the 1 Hz
  clamp we measured at 981 ms. Their client-side-rendering docs go further and are the
  **only vendor documentation of hidden-tab behaviour found in the entire survey**:
  *"When the tab is backgrounded and RAF is throttled, the Worker timer takes over…
  rendering in a background tab will be slower."* 📄
  https://www.remotion.dev/docs/client-side-rendering/limitations
- **Replit's renderer** sidesteps it entirely with a **fake clock replacing `setTimeout`,
  `requestAnimationFrame`, `Date.now` and `performance.now()`** — the same move as
  WebVideoCreator's `HeadlessExperimental.beginFrame`. 📄
  https://replit.com/blog/browsers-dont-want-to-be-cameras
  If time is yours, throttling is not a category that exists. That is the render-mode
  argument in one sentence.
- **Everyone else**: across 13 commercial browser NLE targets, **not one** documents
  hidden-tab behaviour. ⚠️ (absence of documentation, not absence of behaviour)

This is the axis where we are furthest ahead of the field, and it is cheap to be ahead
on: the mechanism is public, the fix is 20 lines, and nobody bothers because a video
editor in a hidden tab is not a use case. **For us it is the use case** — a broadcast
timeline that keeps running while the operator is in another tab.

---

## 4. Shipping browser NLEs — the survey

Most are closed. Where a claim rests on a job posting, a support article or a devtools
observation, it is marked ⚠️.

| system | clock master | scheduling | seek/scrub | hidden tab | preview vs export |
|---|---|---|---|---|---|
| **Descript** | ⚠️ media element (GPU/CPU decode toggle implies it) | no evidence | ✅ local **proxy** "optimized assets"; Aug-2026 changelog claims 2–5× faster timeline nav | no evidence | **two engines** — proxies to edit, cloud originals to export 📄 |
| **Kapwing** | ⚠️ not stated | decode-on-demand, not a horizon | 📄 **best-documented in the survey**: demux with mp4box.js, *"decode must always begin at a key frame"*, seek back to nearest keyframe and decode forward; plus low-res proxies | no evidence | **two engines** — browser preview, server FFmpeg `filter_complex` export; >90 % of media served from IndexedDB 📄 |
| **Clipchamp** | ⚠️ FFmpeg-WASM pipeline (Decoder→Compositor→Encoder) | no evidence | no detail | no evidence | **one engine** historically (all-local WASM), WebCodecs later grafted onto **encode only** 📄 |
| **Veed** | no evidence | — | — | — | ⚠️ two (Renderer team is C++/Vulkan/Metal — a native cloud renderer) |
| **Canva** | ⚠️ inside a C++ "Native Video Engine" | no evidence | 📄 "frame-accurate seeking and composition" named as an owned perf domain | no evidence | **one engine** — the cleanest in the survey: one C++/WASM core spans "playback, export, editing" across iOS/Android/Web/Backend 📄 |
| **WeVideo** | ⚠️ "three or four elements blended in real time at 30 fps" (2016 CEO) | — | ⚠️ low-res preview option | — | **two** — public API takes an **XML EDL** (`<timeline><layers><layer>`), returns an MP4 job 📄 |
| **Screenpal** | no evidence | — | 📄 transcript word-timestamps as the scrub index | — | no evidence |
| **Frame.io** (review) | ⚠️ HTMLVideoElement over HLS | — | 📄 "frame-accurate seeking" + hover frame preview ⇒ ⚠️ filmstrip/proxy, not live decode | no evidence | **two** — C2C proxies transcoded server-side, played as HLS 📄 |
| **Vimeo Review** | ⚠️ `<video>` in an iframe, postMessage SDK | — | ⚠️ timecoded comments; mechanism undisclosed | no evidence | **two** — standard VOD transcode/HLS 📄 |
| **Shotstack Studio** (OSS) | 📄 **`performance.now()`** — `playbackTime = anchor + (performance.now() − wallAnchor)/1000` | 📄 per-frame `update(dt, elapsed)` fanned to every clip from an outer rAF | 📄 `seek()` moves the anchor; **HTML/iframe clips pre-capture frames at `captureFps` and swap textures** — a filmstrip for live web content | no evidence | **three** — Studio preview, client `VideoExporter`, and a separate deterministic cloud Edit API ("same edit in, same video out, every time") 📄 |
| **Remotion Player** | 📄 rAF, **`setTimeout` fallback when the tab is inactive** | 📄 per-frame polling; `framesToAdvance` accumulated from elapsed wall time to avoid rounding drift | 📄 set the frame; React re-renders — the whole tree is a pure function of frame | 📄 handled | **two runtimes, one composition** — rAF preview vs headless-Chromium frame-stepping render |
| **Rendley** | 📄 Timeline "owns the playback clock"; **snaps to frame boundaries "to avoid floating-point drift between preview and render"** (30 fps default) | no evidence | 📄 `seek()` + `alignTime(CEIL/FLOOR/NEAREST)` | no evidence | **both offered** — client WebCodecs (ffmpeg.wasm fallback) or server 📄 |
| **IMG.LY CE.SDK** | ⚠️ inside a unified C++ engine; **WebCodecs decode + WebGL compositing** client-side 📄 | no evidence | 📄 frame-numbered (HH:MM:SS:FF) | no evidence | **one engine** — "CE.SDK Renderer uses the same engine as the browser editor… frame-accurate output on the server" 📄 |
| **Creatomate** | no evidence | — | — | — | **two runtimes, one JSON** — separate `@creatomate/preview` (Canvas/WebGL) vs server render; parity by shared declarative model 📄 |
| **Diffusion Studio** | ⚠️ Mediabunny + WebCodecs, Canvas2D compositing | — | — | — | ⚠️ claims "realtime playback… and a high fidelity rendering mode" as two modes of one engine. **NB the public repo's `src/` is now empty** while still shipping an MPL-2.0 LICENSE — v2+ appears to have gone closed 📄 (observed) |

Sources: Kapwing https://www.kapwing.com/blog/working-with-google-chrome/ and
https://www.kapwing.com/blog/how-we-built-it-scaling-to-100k-projects-a-day/ ·
Clipchamp https://www.w3.org/2021/03/media-production-workshop/talks/soeren-balko-clipchamp-webcodecs.html
and https://web.dev/case-studies/clipchamp ·
Descript https://help.descript.com/hc/en-us/articles/12792882150029-How-Descript-Uses-Optimized-Assets-Proxy-Files-to-Improve-Editing-Performance ·
Canva https://www.lifeatcanva.com/en/jobs/6000000001105834/engineering-manager-native-video-engine/ ·
WeVideo https://www.wevideo.com/documentation/docs/guides/video-creation ·
Frame.io https://blog.frame.io/2024/05/28/frame-io-v4-features-player-and-commenting/ ·
Shotstack https://github.com/shotstack/shotstack-studio-sdk (`src/core/edit-session.ts`,
`src/core/timing-manager.ts`, `src/components/canvas/players/html5-player.ts`) ·
Remotion https://github.com/remotion-dev/remotion (`packages/player/src/use-playback.ts`) ·
Rendley https://docs.rendley.com/sdk/getting-started/timeline/ ·
IMG.LY https://img.ly/products/video-sdk/ · Creatomate
https://creatomate.com/docs/api/preview-sdk/what-is-the-preview-sdk

**Three readings of that table.**

1. **Nobody in the commercial video world runs a lookahead scheduler.** They run
   per-frame polling — a render loop that asks "what should be on screen at `t`" every
   frame. That is correct for their problem: a video editor has no *events*, only
   *state at t*. The moment you add a lane whose semantics are "fire once, exactly
   once" (a cue, a MIDI note, a scene change, a DMX go), per-frame polling becomes the
   fan-out graveyard's cousin — you either fire late by up to a frame (replay-grid's
   +15.5 ms latent bug, session 6p) or you fire everything skipped at once on a seek
   (replay-grid's 3 cues bursting 45/25/5 s late, same session). **Our transport exists
   because we have both kinds of lane.**
2. **Proxies are the universal seek answer, and we have no proxy story.** Descript,
   Kapwing, Frame.io, WeVideo, Shotstack (for iframes) and Remotion all decouple "what
   you scrub" from "what you export". Our `sync()`+seek path goes straight at the real
   asset.
3. **"One engine or two" is the industry's real architectural fault line**, and the
   winners in 2026 are consolidating onto one (Canva's C++ core, IMG.LY's shared engine,
   Clipchamp's WASM). The two-engine shops pay for it in preview/export mismatch and
   defend with "parity of declarative model" (Creatomate, Rendley's frame snapping).

---

## 5. Browser DAWs and the audio engines

### 5a. The commercial DAWs publish nothing

| system | what is actually documented |
|---|---|
| **Audiotool** | 📄 official help docs label the default in-browser engine **"Worklet"**, with a native "Booster" companion app as the low-latency option. 2026 "NEXUS" rewrite adds realtime multiplayer; SDK open (github.com/audiotool/nexus), engine closed. https://www.audiotool.com/help |
| **Soundtrap** (Spotify) | 📄 WAC-2017 paper: Web Audio + Web MIDI + WebRTC, **not on AudioWorklet as of 2017**; **"freezes" finished tracks** — a partial offline pre-render to cut runtime CPU; some processing server-side. ⚠️ later job posting implies AudioWorklet + WASM migration. |
| **BandLab** | 📄 "relies completely on the web audio API"; native apps *reimplement the Web Audio API in native code* to keep DSP parity. https://blog.bandlab.com/inside-our-tech-the-sound-team/ |
| **Soundation** | 📄 founder interview: early WebAssembly-threads adopter (SharedArrayBuffer multi-core). Single source. |
| **Amped Studio** | ⚠️ Vue + WASM/C++ engine, third-party sourced only. |
| **Ableton Learning Music / Note** | 📄 shares an engine with Note/Move (CDM); zero architecture detail. |
| **Sequencer.party** | 📄 self-describes as a WAM 2.0 host. |
| Blockhead | **miscategorised** — it is a native desktop app (PortAudio), not browser. |

**Not one commercial browser DAW has published its lookahead scheduler, its seek/loop
implementation, or its offline-vs-realtime bounce mechanism.** The gap is total and it
is the mirror image of the video side.

The one architecturally interesting published idea is Soundtrap's **freeze**: pre-render
a finished track offline so playback stops paying for it. That is the "render is not
playback" split applied *inside* the session rather than at export.

### 5b. Tone.js — read the source (v15.5.36)

- `clockSource: "worker"`, `lookAhead: 0.1`; **`updateInterval` is derived, not
  independent: `lookAhead/2` → 0.05 s**. 📄 `Tone/core/context/Context.ts`
- `Tone.now()` = `currentTime + lookAhead`; `Tone.immediate()` = raw `currentTime`.
- `Ticker.ts`: blob-URL Worker running a **recursive `setTimeout`** (not `setInterval`)
  that posts `"tick"`; main-thread fallback only via try/catch on Worker construction.
  Poll interval floored to one render quantum, `max(128/sampleRate, 0.001)`. 📄
- **Provenance of the worker clock**: Tone.js issue #124 (2016) — Yotam Mann cites
  background-tab throttling, and a commenter points him at **`cwilso/metronome`**.
  Direct lineage Wilson → Tone.js → (independently) us. 📄
- `Draw.ts`: rAF loop, `anticipation = 0.008` s, **`expiration = 0.25` s — visual events
  more than 250 ms late are dropped, never fired**. 📄 One hard-coded catch-up policy,
  for one lane. Ours is `caps.catchUp ∈ {burst, drop, reduce}` per kind, and `drop`
  measured 28 events lost through a 3 s freeze while `reduce` reached correct state
  0.5 ms after wake ✅.
- **Seek** (`Transport.ticks` setter): remaps the tick↔time offset via
  `TickSource.setTicksAtTime` and emits `stop`/`start` to synced sources. It **does not
  cancel or reschedule the event timeline**. Consequences, straight from the model:
  seeking *forward* silently skips events; seeking *backward* over them makes them
  **fire again**. `stop()` resets ticks to 0, `pause()` does not, and **neither clears
  scheduled events**. 📄
  — https://github.com/Tonejs/Tone.js/blob/dev/Tone/core/clock/Transport.ts
  Our arm-B assert `backward-seek-replays-each-event-exactly-once` is precisely the
  property Tone.js does not offer, and `seek-no-skipped-fires` is the other one.

### 5c. Chris Wilson, "A Tale of Two Clocks" — the ancestor of both

Exact prose: **"100ms of 'lookahead' time, with intervals set to 25ms."** 📄
— https://web.dev/articles/audio-scheduling
Confirmed verbatim in `cwilso/metronome/js/metronome.js` (`scheduleAheadTime = 0.1`,
`lookahead = 25.0`), and the live demo drives it from `metronomeworker.js`
(`setInterval(() => postMessage("tick"), interval)` inside a Worker).

**Our ship defaults — 25 ms tick, 100 ms horizon, worker host — are Chris Wilson's 2013
numbers, exactly.** We did not know that when we set them; we arrived by measurement
(arm A/E) at the constants the canon already published. Worth writing down honestly.
Note also: the *article prose* never mentions throttling — the anti-throttling rationale
lives only in the linked worker code, which is why so many people implement the pattern
on the main thread and lose it.

### 5d. AudioWorklet as clock

- W3C: render quantum = **128 frames** by default (~2.67 ms @48 k, 2.9 ms @44.1 k),
  configurable via `renderSizeHint` in Web Audio 1.1. 📄 https://www.w3.org/TR/webaudio/
- **There is no timer API inside `AudioWorkletGlobalScope` at all** — no
  `setTimeout`/`setInterval`. A worklet clock is `process()` itself plus the ambient
  `currentTime`/`currentFrame` globals. Real instance: `stagas/scheduler-node`. 📄
- Engines that put the *whole engine* on the audio thread: **Glicol** (Rust/WASM,
  256-sample blocks, live-coding hot-reload happens on the audio thread) and
  **Elementary Audio** (Emscripten engine inside the worklet, main thread only sends
  graph diffs by `postMessage`). 📄 **Gibberish** is stranger and older: its clock is a
  *unit generator inside the DSP graph* (`PolySeq` converts beats→samples), so
  scheduling is sample-accurate by construction and there is no JS timer anywhere.
- ⚠️ **Honest caveat**: no primary W3C/Chromium sentence was found stating the audio
  render thread is exempt from visibility throttling. It is structurally plausible (OS
  audio callbacks, not the DOM task queue) and universally reported, and WebKit
  bug 231105 (Safari *incorrectly* suspending AudioContext on background/minimise) was
  filed and fixed **as a bug**, which is strong indirect evidence. 📄
  https://bugs.webkit.org/show_bug.cgi?id=231105

### 5e. wavesurfer.js v7 — the cautionary one

- **Default backend is `HTMLMediaElement`**, not WebAudio; WebAudio (`WebAudioPlayer`,
  `AudioBufferSourceNode` + computed `currentTime`) is opt-in. 📄
- Playhead runs on a **rAF `FrameScheduler`** over whichever backend.
- Region boundaries are **backend-dependent in precision**: the WebAudio backend stops
  sample-accurately via `AudioBufferSourceNode.stop(ctx.currentTime + delay)`; the
  MediaElement backend **polls** `currentTime >= stopAtPosition` in the rAF tick, with a
  source comment acknowledging overshoot. `region-in` / `region-out` are detected by
  filtering regions against `timeupdate` each tick. There is **no loop primitive** —
  looping is userland re-triggering on `region-out`. 📄
  — https://github.com/katspaugh/wavesurfer.js

That is the exact shape of the defect session 6p found in our own replay-grid (rAF cue
engine firing one frame late, unbounded on a dropped frame, infinite in a hidden tab),
shipped in the most-used waveform library on the web.

### 5f. Strudel — the genuinely different model

- **A pattern is a pure function of a time span, not a stored event list.**
  `Pattern.query` is a closure `State → Hap[]`; `queryArc(begin, end)` re-invokes it
  fresh every call at arbitrary resolution. A `Hap` carries `whole` (the full event span)
  vs `part` (the fragment overlapping this query), and `hasOnset()` is
  `whole.begin === part.begin`. Nothing is precomputed. 📄
  — https://codeberg.org/uzu/strudel (GitHub mirror dead)
- `zyklus.mjs` Cyclist: `setInterval(onTick, interval*1000)`, defaults
  **`interval = 0.1`, `duration = 0.05`, `overlap = 0.1`**; docs state "query interval is
  50 ms with a minLatency of 100 ms… latency between 50 ms and 150 ms". Each tick queries
  the next slice and dispatches haps with an **absolute** target time to
  `superdough()`, which schedules `AudioBufferSourceNode.start()` directly and guards
  `if (t < ac.currentTime) return`. No Tone.js anywhere in the monorepo. 📄
- **`NeoCyclist` moves the tick into a `SharedWorker` + `BroadcastChannel`** so several
  tabs share one clock with drift compensation. 📄 That is a *multi-tab* generalisation
  of our worker tick host, and it is a thing we do not have.
- Lineage: Alex McLean, "Alternate Timelines for TidalCycles", ICLC 2021,
  https://arxiv.org/pdf/2209.04289

**Why this matters to us.** Strudel's model dissolves the seek problem: there is no
prefix to fold because there is no stored prefix — you query a different span and get
the right answer, in O(pattern) not O(events). It is the *authoring* side of
plan-timeline C10 taken to its logical end. It cannot represent a trace: you cannot
query "what did the performer actually do at 14:32" out of a pure function. **C10's
boundary is visible here as an engineering fact, not just a design opinion** — Strudel
and our log are the two poles, and a system that wants both needs both representations,
which is exactly what C10 says.

- **WAM 2.0** is a hosting/interop spec, not a scheduler, but it standardises event time
  as absolute `AudioContext.currentTime` seconds (`WamEvent.time`) plus a
  `WamTransportData` broadcast carrying `currentBarStarted`. 📄 If we ever want third-party
  instrument plugins on a deck, this is the interop surface, and its time model is
  compatible with our audio lane.
- **Faust web** compiles to `FaustAudioWorkletProcessor` and deliberately has **no
  transport at all** — sequencing is the host's job. 📄

---

## 6. The deterministic-render family — "render is not playback"

### 6a. Remotion is the reference

- **The model**: *"A video is a function of images over time… Think of your component as
  a function that transforms a frame number into an image."* 📄
  https://www.remotion.dev/docs/the-fundamentals
- **The rationale doc is `/docs/flickering`**, and it is the most explicit statement of
  the doctrine anywhere in the survey: render workers are independent parallel Chrome
  tabs with **no shared wall clock**; *"Tabs don't share state and animations that run
  independent of `useCurrentFrame()` will break"*; *"There is no real timing
  synchronization and results will differ across machines"*; *"Deterministic videos
  enable distributed video renders like Remotion Lambda, which can render a video much
  faster than real-time."* 📄
- Four component constraints: same output on repeat calls, no assumption frames render
  in order, no animation while paused, **no unseeded randomness (`Math.random()`
  explicitly forbidden)**. 📄
- **Preview**: rAF with `setTimeout(1000/fps)` fallback when backgrounded; target frame
  is derived from *elapsed wall time* (`floor/ceil((elapsed × playbackSpeed)/(1000/fps))`),
  so it self-corrects for dropped ticks — the same anti-accumulation move as our vector,
  reached from the other direction. 📄 `packages/player/src/calculate-next-frame.ts`
- **Render**: headless Chrome via Puppeteer, screenshot-per-frame, then `encoding` →
  `muxing`; **audio is extracted and mixed offline**, never captured live. 📄
- **`<OffthreadVideo>` is the two-engine tax made visible**: it exists *because* `<video>`
  seeking is drift-tolerant, so for render it extracts the exact frame out-of-process via
  FFmpeg/Mediabunny into an `<Img>`/`<canvas>`, trading live-playability for frame
  accuracy. 📄
- **`<Sequence>` is a first-class nested timeline**: `from` shifts `useCurrentFrame()` for
  all descendants, `durationInFrames` unmounts outside the range, and **nesting cascades
  additively** — *"a sequence that starts at frame 60 which is inside a sequence that
  starts at frame 30 will have its children start at frame 90."* Plus `<Loop>`,
  `<Freeze>`, `trimBefore`. 📄 https://www.remotion.dev/docs/sequence
- **Reverse**: `Player` `playbackRate` runs **−10 to 10 excluding 0**; *"A playbackRate of
  −1 means the video plays in reverse."* But embedded media tags cannot reverse ("this is
  a browser limitation"), and the newer `@remotion/media` components drop reverse
  entirely. 📄

**Remotion's `<Sequence>` and our `createNest` are the same idea with opposite
mechanics.** Sequence shifts a *pure function's* argument — free, because there is no
state to carry across the boundary. Our nest has to move a *stateful* child: seek in the
parent is a real `seek()` in the child so `reduce`-on-seek runs one level down, rate
composes multiplicatively with an honest log-nearest degradation, and a child is
*absent* (paused and asserted at the boundary it left through) outside its span. We pay
for having a trace where Remotion has a program. That is C10 again.

### 6b. Motion Canvas / Revideo — seek by replay, confirmed

- One core (`PlaybackManager`) with two drivers: `Player` (rAF-gated, real time) and
  `Renderer` (*"does not use an update loop… plays through the animation as fast as it
  can"*). 📄
- **`PlaybackManager.seek(frame)`: if the target is at or behind the current frame, it
  `scene.reset()`s — re-invoking the generator factory from scratch — then steps
  `next()` forward one frame at a time to the target.** Source-verified; corroborated by
  their own 3.12.0 blog noting scrub lag "since the entire generator must be re-run each
  time". The only cache (`isCached()`) is a duration cache, not a render-state cache. 📄
- Consequence: export is deterministic but **not parallelisable** — frame N requires
  having stepped 1..N−1 in-process. Revideo (a confirmed fork, now commercial
  "Midrender") splits time ranges across N workers, but each worker still resets and
  replays to reach its chunk's start.
- No nested timelines, no reverse (generators cannot run backward).

**This is the honest comparison for our seek.** Motion Canvas *does* have a "rebuild
state at t" seek — and its cost is O(t), re-executing all of history, which is why
scrubbing left lags. `reduce(prefix ≤ t)` is the same guarantee at O(prefix) with the
work delegated to a per-kind reducer that can be O(1) (a held-note set, a counter), and
`sampleAt`'s cursor makes the continuous case O(1) amortised (3.67 comparisons/call at
n=2000 *and* n=8000 ✅). We are on the same axis as Motion Canvas, further along it.

### 6c. The rest of the family

| engine | clock | seek | nesting | reverse | render path |
|---|---|---|---|---|---|
| **Etro** | rAF wall-clock delta into `_currentTime` | free — declarative keyframe layers, `_currentTime = t` propagated | none | none | **real-time only** — `canvas.captureStream()` → `MediaRecorder`; README still says "offline rendering coming soon" 📄 |
| **Rive** | continuous `advance(seconds)` from an app-driven rAF | `LinearAnimationInstance.time` settable; **`StateMachineInstance` has no absolute-time setter — incremental `advance()` only** 📄 | **Nested Artboards are first-class and cascade** — children advance as part of the parent's `advance()` 📄 | not documented | n/a |
| **Lottie** | one shared global rAF loop for every registered animation; elapsed ms → frame delta via `frameModifier` | `goToAndStop(value, isFrame)` — frame-indexed core, seconds are a wrapper | none | **yes, first-class**: `setDirection(±1)` and negative `setSpeed()` both feed `frameModifier = frameMult × playSpeed × playDirection` 📄 | n/a. **No `visibilitychange` reference anywhere in source** — rides native rAF throttling 📄 |
| **Theatre.js** | continuous rAF `Ticker.tick(performance.now())`; `createRafDriver` lets you substitute a manual/deterministic tick | `sequence.position` | **none** — Project → Sheets → one flat Sequence each | **the cleanest reverse API found**: `sequence.play({direction: 'normal'\|'reverse'\|'alternate'\|'alternateReverse'})`, "similar to CSS animations" 📄 | n/a |
| **GSAP** | rAF; **`lagSmoothing(500, 33)`** — any gap >500 ms is *counted as 33 ms* 📄 | `seek()` / `progress()` — renders state at t, no history replay | **nested timelines are first-class** (`timeline.add(otherTimeline)`) | **yes** — `reverse()`, `timeScale(-1)` | n/a |
| **WebVideoCreator** | 📄 uses Chrome's **`HeadlessExperimental.beginFrame`** to take over frame timing; replaces media elements with canvases driven by its virtual clock | n/a | n/a | n/a | the purest "hijack the browser's clock" render https://github.com/Vinlic/WebVideoCreator |
| **OfflineAudioContext** | W3C: *"renders as quickly as possible… fulfilling the returned promise with the rendered result as an `AudioBuffer`"* 📄 | n/a | n/a | n/a | the audio analogue. Used by **AudioMass** for mixdown and by `@remotion/media-utils`. ⚠️ allocates the full output buffer up front — memory-heavy for archival-length renders |
| **Figma / Framer / Spline** | **documented absence** — only UX/feature posts exist; no public engineering detail on their timing model at all |

### 6d. So: one engine or two?

- **Two, cleanly separated**: Remotion (best-effort Player vs exact Puppeteer renderer),
  Diffusion Studio (`Composition` vs `Encoder`).
- **One core, two drivers**: Motion Canvas / Revideo — export is the same replay logic,
  just unthrottled.
- **One engine, real-time-bound, no offline path**: Etro.
- **One engine across client and server**: Canva's C++ Native Video Engine, IMG.LY
  CE.SDK (*"CE.SDK Renderer uses the same engine as the browser editor… frame-accurate
  output on the server"*), Clipchamp's WASM/FFmpeg.

**What this means for us.** We have exactly one engine and it is the real-time one. We
have never rendered anything offline, and the timeline as built cannot: the wall lane is
anchored to a `ClockSource` and the audio lane to a live `AudioContext`. The good news
is that both are *already pluggable* — `createVirtualRuntime()` is a deterministic clock
we use for CI, and `OfflineAudioContext` satisfies the audio lane's interface. An offline
render mode is "swap two clock sources and drive the tick from a frame counter", not a
second engine. **Nobody else got that for free; we should not squander it.**

---

## 7. How an edit is represented — and the trace/authoring distinction (C10)

### 7a. The formats

- **OpenTimelineIO** self-describes as *"an open source library for the **interchange** of
  editorial information"* — authoring/interchange, explicitly not a log. Model:
  `Timeline → Stack → Track → Clip | Gap | Transition | (nested Track/Stack)`;
  `available_range` (what media exists) vs `source_range` (what is cut in);
  `RationalTime(value, rate)`, `TimeRange(start, duration)`; `Marker`. **Nested Stacks
  are first-class**: *"By nesting a Composition… we can refer to a Composition as though
  it was just another Clip in the outer Composition"* and *"a nested Stack behaves just
  like a Clip that happens to have complex contents"* 📄
  https://github.com/AcademySoftwareFoundation/OpenTimelineIO/blob/main/docs/tutorials/otio-timeline-structure.md
  — **⚠️ note the terminology collision: OTIO "adapters" are *file-format* adapters
  (AAF/FCPXML/EDL importers), not per-kind runtime actuation adapters. Different concept,
  same word.**
  **No production-grade JS-native OTIO port exists** — only third-party WIP Emscripten
  bindings, a Pyodide experiment, and Raven (a viewer with a WASM build). 📄
- **CMX3600 EDL**: event-numbered source/record timecode pairs, max 999 events, ≤4 audio
  tracks. **AAF**: `CompositionMob → MasterMob → SourceMob`. **FCPXML**: resources +
  a "spine", rational timing.
- **W3C Media Fragments URI** `#t=10,20` is a full Recommendation (2012), half-open
  `[10,20)`. **W3C Web Annotation** targets time via `FragmentSelector` wrapping a Media
  Fragment; `motivation`/`body` carry **no confidence or method semantics**. 📄
- **IIIF Presentation 3.0** gives a Canvas a `duration` — *"the duration of the Canvas…
  given in seconds"* — turning it into a temporal coordinate space, with AnnotationPages
  placing media fragments on it by the same mechanism used for images. `timeMode`
  (`trim`/`scale`/`loop`) handles duration mismatch; `Range` groups canvases into
  chapters. **This is an EDL expressed as annotations**, and it is the standard our
  archival client should export to. 📄 https://iiif.io/api/presentation/3.0/
  Viewers: **Clover IIIF** (HTML5 video/HLS + WebVTT sync) and **Ramp**
  (Avalon's React player: `IIIFPlayer`/`MediaPlayer`/`StructuredNavigation`/`Transcript`).
  Both drive an ordinary media element; neither has a scheduler.

### 7b. Does anyone keep a trace *and* an authoring document? — no

| system | which is it |
|---|---|
| rrweb | pure trace (DOM snapshot + append-only timestamped mutations) |
| MCAP | pure trace ("row-oriented, append-only design") |
| OTIO | pure authoring/interchange — no event-log concept in the model |
| DAW session file | pure authoring |
| **Ableton Global Record** | a **trace-to-score compiler**: *"Live has copied the clips you launched during recording into the Arrangement… your recording has not created new audio data, only clips."* The launch trace is consumed, not kept 📄 |
| **QLab "Record Cue Sequence"** | same shape — records your firing timing, then **creates a Group cue of Start cues with matching pre-waits**. One-way 📄 |
| **PREMIS** | the one place the distinction is *argued* rather than shipped. "PREMIS Events Through an Event-sourced Lens" (Code4Lib) proposes re-modelling PREMIS as an append-only log with derived projections, **precisely because current practice stores only current-state snapshots and "we do not necessarily see how we got there"** 📄 https://journal.code4lib.org/articles/17264 |
| nearest patent art | US 11,289,126 — content-addressable immutable EDL change events, all historical versions retained. Versioned authoring, not a trace of a performance |

**Finding: no shipped system deliberately keeps both an immutable evidentiary trace and a
separate editable authoring document, synchronised.** The two systems that come closest
(Ableton, QLab) *destroy* the trace by folding it into the score — which is exactly the
failure mode C10 was written to forbid. The clearest published articulation of the gap is
an archival-metadata paper proposing it as future work. Confidence: **high that it is not
mainstream**, moderate that nothing obscure exists — this is a hard negative to prove.

### 7c. Live-coding schedulers, for the C10 poles

- **Sonic Pi** is the strongest formal treatment of time in the whole survey. FARM'14
  (Aaron, Orchard, Blackwell, *Temporal Semantics for a Live Coding Language*): v1.0's
  real `sleep` drifted under concurrent threads as computation overhead accumulated; v2.0
  made **virtual time a thread-local variable advanced only by `sleep`, decoupled from
  wall clock**, with a `scheduleAheadTime` constant pre-scheduling synth calls at the
  *virtual* time. The paper gives an axiomatic time system and a monadic denotational
  semantics proving `sleep`-programs are "time safe". Explicitly parallels ChucK's `=>`.
  📄 https://www.doc.ic.ac.uk/~dorchard/publ/farm14-sonicpi.pdf
  **Read this before touching musical time.** Our `{p0,t0,rate}` vector is the
  wall-clock dual of their thread-local virtual time; their result is that only one of
  the two can be authoritative per thread, which is the same thing our `sync()` contract
  says about clock masters.
- **TidalCycles → SuperDirt**: Tidal has no sound engine; it sends **timestamped OSC
  bundles ahead of time** and the receiver schedules them. The lookahead lives on the
  wire. 📄
- **Hydra** is per-frame rAF, not a scheduler. **Rete.js** — the brief's premise was
  wrong: it is a node-editor framework, not a scheduler. **WAM** is interop, not a
  scheduler.
- **Elementary Audio** is a declarative render-tree with React-style reconciliation
  (`core.render()` diffs against what you asked for last time) and ships
  `@elemaudio/offline-renderer` for deterministic faster-than-real-time render. 📄
- Seek/offline matrix: only Strudel (in principle, via `queryArc`) and Elementary
  (explicitly) can do either. TidalCycles, Gibber, Hydra and Sonic Pi are **forward-only
  live** — no seek, no offline bounce. Being able to seek at all puts us in a small group.

---

## 8. Evidence and provenance on derived material (plan-timeline §5b)

### 8a. The standard exists and nobody uses it for this

**C2PA has time-range granularity.** The spec defines *Regions of Interest* as a
discriminated union including **`TemporalRange`**, alongside `SpatialRange`,
`FrameRange`, `TextualRange`, `IdentifiedRange`; the Soft Binding API lets a caller
"specify a region of interest to scan for soft bindings, such as timecode interval". 📄
https://spec.c2pa.org/specifications/specifications/2.4/specs/C2PA_Specification.html
AI provenance rides on **`digitalSourceType`** (IPTC NewsCodes), e.g.
`trainedAlgorithmicMedia` (fully generated) vs `compositeWithTrainedAlgorithmicMedia`
(AI-assisted composite/inpainting) — which is *almost exactly* our tier spectrum
(interpolation / inpainting / generative restoration). 📄
⚠️ Exact JSON field names for `TemporalRange` could not be pulled verbatim (spec page too
large to fetch whole); the type taxonomy is confirmed, the field spelling is not.
**And: no shipped product wires region-of-interest to "these seconds were AI-restored".**
The capability exists; the practice does not.

### 8b. The tools that enhance do not mark

- **Descript Studio Sound** is explicitly whole-file: *"applied directly to the original
  media file and enhances the entire source… it affects every instance of that file
  across your project."* No time-region marking of what was synthesised. 📄
  https://help.descript.com/hc/en-us/articles/10327603613837-Studio-Sound
- **Adobe Enhance Speech, iZotope RX**: no evidence of per-region synthesis marking in
  the delivered file or a public sidecar.
- **Auphonic** is the partial exception: an API-exposed **production report** (JSON/YAML)
  logging per-segment classification (speech/music/noise) and where denoising/hum removal
  was applied, visualised as red-line segments. 📄 But it is a *producer-facing processing
  log*, not a listener-facing marker, and Auphonic's operations are subtractive, not
  generative — so it never has to answer "what did you invent".

### 8c. Transcript confidence: one shipped example

- **Sonix** ships a visible per-word **"confidence thermometer"** in its editor —
  *"you can use our confidence thermometer to see how confident we are with every word
  that is transcribed."* 📄 https://sonix.ai/resources/sonix-tutorials-using-confidence-levels-sonix/
- **Trint, Otter, Aviary**: not confirmed either way. Aviary integrates Whisper/Watson/
  Deepgram/AssemblyAI/Trint but no confidence display surfaced in its user guide.
- **PROV-O** has `Entity/Activity/Agent`, `wasGeneratedBy`, `wasDerivedFrom`,
  `wasAssociatedWith` — and **no standardised confidence or method property**; the
  Qualified Terms pattern is the extension point. **PREMIS** Events are the closest fit
  for "this segment was reconstructed by method X" but are object/event-level, not
  natively time-range-scoped. 📄

### 8d. The conservation analogue, and the shipped-UI gap

- **Tratteggio / rigatino**: thin parallel hatched lines infilling paint loss —
  indistinguishable at viewing distance, *"visible on close inspection by the naked eye —
  no tools required"*. Codified in Brandi's *Teoria del restauro*. 📄
  https://conservation-wiki.com/wiki/Tratteggio
- **Venice Charter (1964) Art. 12**, verbatim: *"Replacements of missing parts must
  integrate harmoniously with the whole, but at the same time must be distinguishable
  from the original so that restoration does not falsify the artistic or historic
  evidence."* 📄 https://icahm.icomos.org/wp-content/uploads/2017/01/1964-Venice-Charter.pdf
- **Nobody has shipped the A/V version of this for an audience.** *They Shall Not Grow
  Old* is cited as the counter-example — the colorisation, frame interpolation and
  lip-dubbing were not flagged or distinguishable. The nearest tool found is
  **HS-ART DIAMANT DustBuster+**, where a detected-artifact bounding box "can be clicked
  or touched to toggle the object state" — but that is a **restorer-facing QC control**
  for accepting automated fixes, not an audience-facing "show me what was reconstructed".
  Searches for ARTE/Fraunhofer productised restoration-marking found only ML
  defect-localisation research with no viewer-visible provenance layer. 📄

**Confidence: high.** This is the one place where the survey returned a clean, repeated
negative across products, research prototypes and standards bodies. Our proto/paths ships
it already — hatching, amber dots on attested positions only, a 14× playhead inset
comparing linear chord vs spline, an evidence-only toggle, and
**"59 attested samples, 896 drawn → 93.4 % of the rendered path is invented, at 0.036 px
mean cost" permanently on screen** ✅ (session 6r). That is tratteggio for a timeline, and
the survey found no second instance.

---

## 9. Frame-accurate seek, and reverse

### 9a. `requestVideoFrameCallback` is a measurement primitive, not a seek primitive

The WICG spec's `VideoFrameCallbackMetadata` carries `presentationTime`,
`expectedDisplayTime`, `width`/`height`, **`mediaTime` (the presentation timestamp in
seconds of the frame actually presented)**, `presentedFrames`, `processingDuration`, and
the WebRTC-only `captureTime`/`receiveTime`/`rtpTimestamp`. The stated purpose is to be
"notified when a frame has been presented for composition". **The spec makes no mention
of seeking.** 📄 https://wicg.github.io/video-rvfc/

That is precisely how Remotion uses it — `rvcTime` as the *more trustworthy measurement*
of where the element really is, fed into the seek decision (§2). Not as a way to *get*
somewhere. hls.js's maintainer states the same pattern: use rVFC to **detect when a
commanded `currentTime` seek has landed**, not to drive it. 📄
https://github.com/video-dev/hls.js/issues/7583
**We do not use rVFC at all; our media servo reads `currentTime` from an rAF loop.**
That is the cheapest correctness upgrade available to us (see steal list).
Support: Chrome/Edge v83 (2020), Safari ~15.4, **Firefox only v132 (Oct 2024)** — so it
has been cross-browser baseline for under two years, which is why so little uses it. 📄

**Why `currentTime = t` misses.** The WHATWG spec actually specifies plain `currentTime`
assignment as *exact*; it is `fastSeek()` that carries the "approximate for speed" flag
where a UA *may* "snap to a nearby key frame". The imprecision in practice comes from
demuxer/decoder implementation, MSE segment/GOP granularity and timestamp rounding — not
from spec-mandated snapping. 📄 The problem statement is W3C
media-and-entertainment issue #4, "Frame accurate seeking of HTML5 MediaElement": **there
is no frame-number API, only seconds.** How bad it gets in practice: hls.js #7583 reports
Safari needing **3–12 `currentTime` nudges to advance a single frame**; Shaka Player #234
reports 20–40 increments and was closed "working as intended". 📄

### 9b. Decode-and-seek vs slave-the-element — the split

- **Decode-and-seek (WebCodecs)** is the frame-accurate recipe: demux, find the nearest
  preceding sync sample, `decode()` forward discarding frames until the target PTS,
  `flush()`. The spec enforces it — the first chunk after `configure()`/`flush()` must be
  `type: 'key'` or it throws `DataError`. 📄 https://w3c.github.io/webcodecs/
  **Kapwing publishes exactly this**, with the key sentence *"decode must always begin at
  a key frame"*, using mp4box.js in Web Workers. 📄
  https://www.kapwing.com/blog/working-with-google-chrome/
  The index is the `stss` (SyncSampleBox) table — mp4box.js parses it and exposes
  `seek(time, useRap)`; mediabunny is redoing the same design work in the open (issue
  #303: warm decoder vs cold seek-and-discard-~50-frames). IMG.LY CE.SDK and Diffusion
  Studio are on the same architecture. **Replit's engineering blog rejects native
  `<video>` seeking outright as "fragile and non-deterministic".** 📄
  https://replit.com/blog/browsers-dont-want-to-be-cameras
- **Slave-the-element** is what the review players and most timeline libraries do —
  Frame.io/Vimeo (HLS + `<video>`), wavesurfer, Remotion's classic `<Video>`, ours.
  Streaming players make frame accuracy a *math* problem instead: **Bitmovin's
  `SMPTEController`** computes `currentTime` from frame-rate/timecode arithmetic
  (github.com/bitmovin/bitmovin-player-web-samples/tree/main/frameaccurate), THEOplayer
  does the same, and hls.js makes no frame-accuracy claim at all. 📄
- **The split is institutional, not just technical**: Chromium's WebCodecs
  Intent-to-Ship names **Clipchamp and Grass Valley** as the driving use cases. 📄
  https://groups.google.com/a/chromium.org/g/blink-dev/c/7UlTzFMbTFs
  **Google shipped WebCodecs for editors, not to fix player seek precision.**
- **The split is not "modern vs legacy"; it is "compositing vs playing".** If you are
  drawing every frame yourself into a canvas anyway, WebCodecs is free. If you want the
  browser's decoder, its adaptive streaming, its DRM and its audio output, you slave the
  element and eat the seek imprecision — which is why Remotion needs *both*
  (`<Video>` for the Player, `<OffthreadVideo>` for the render).
- **The universal shortcut is proxies**: Descript's optimized assets, Kapwing's low-res
  transcodes, Frame.io's C2C proxies, Shotstack's `captureFps` frame pre-capture for
  iframe clips, and — the extreme — a public proof-of-concept that pre-extracts *every
  frame as a JPEG* plus PCM segments server-side for instant frame-accurate scrubbing.
  📄 https://jordicenzano.github.io/frame-accurate-scrubbing/
  For the hover-scrub tier specifically the pattern is sprite-sheet storyboards indexed by
  WebVTT with `#xywh=` fragments, real frame loaded only on scrub-end — **Mux documents
  50–100 tiles depending on duration** 📄
  https://www.mux.com/docs/guides/create-timeline-hover-previews ; the same pattern is in
  video.js, JW Player, THEOplayer, Bitmovin and Netflix.
- **The best published description of a browser NLE's scrub buffer** is James Pearce
  (Grass Valley), W3C Media Production Workshop 2021: a **playhead-centred decoded-frame
  window** — "a few frames either side of that cursor, and in some cases a second or
  two" — **predictively resized by the observed scrub direction**, with the same buffer
  serving both directions and a shared shader path between proxy scrub and full-res
  render. 📄
  https://www.w3.org/2021/03/media-production-workshop/talks/james-pearce-browser-hosted-video-editing.html
  That is the design our `sampleAt` cursor is already shaped for — it is a
  position-keyed, direction-aware window, which is exactly what the cursor's
  forward/backward/random paths measure (3.67 / 11.97 / 14.25 comparisons ✅).

**Our position, honestly.** We do neither: we `sync()` the element and discriminate
jump→seek. That is right for our content (long archival A/V we do not own and cannot
pre-transcode at will) and it is why session 6q could report media re-anchor error
**0 ms on all 3 seeks** ✅ while never claiming *frame* accuracy. We have no proxy story
and no decode path. Both are real gaps, in that order of urgency.

### 9c. Reverse — the field is split, and Safari is the odd one out

- **The HTML spec defines it and does not require it.** Verbatim: *"If the element's
  playbackRate is positive or zero, then the direction of playback is forwards.
  Otherwise, it is backwards"* — and a backward-playing element is **spec-defined as
  muted**. The setter may throw `NotSupportedError` if the UA declines the value. 📄
  https://html.spec.whatwg.org/multipage/media.html
- **Chrome declined deliberately**: fixed in **M64 (Nov 2017)** by *throwing
  `NotSupportedError`* rather than implementing it — engineer comment: *"I don't think
  this is something we'd implement, the amount of work is just too high for the limited
  utility."* 📄 https://issues.chromium.org/issues/40346085
- **Firefox declined with the better reason.** Chris Pearce: negative rates are *"more of
  a gimmick, a usage pattern left over from the days of VCRs"*; Bryce Seager van Dyk
  gives the architectural argument: ***"Decoding pipelines operate on the assumption that
  time will advance 'forward'… baked through not only Firefox but through broader codec
  design."*** 📄 https://bugzilla.mozilla.org/show_bug.cgi?id=1468019
- **Safari is the only implementer** — caniuse confirms Safari desktop+iOS ✓ all
  versions, Chrome/Firefox/Edge ✗ all versions, unchanged as of 2026; MDN calls it
  "unofficial". Shaka #165 and video.js discussion #7472 both confirm players simply pass
  the negative rate through, so reverse works in Safari and nowhere else — and Shaka
  documents that it stalls at the start of the *currently buffered* range because
  forward-only prefetch never buffers backward. 📄
- **The audio exception**: `AudioBufferSourceNode.playbackRate` **is** genuinely
  unrestricted (spec floor ≈ −3.4e38) — because it walks an already-decoded PCM buffer
  sample by sample, with no streaming decoder involved. 📄
  Reverse is cheap when you own the samples and impossible when you rent a decoder. That
  is the whole story of this section.
- **How editors fake it**: ffmpeg pre-render (`-vf reverse -af areverse`, memory-bound to
  short clips); or WebCodecs seek-to-keyframe → decode-forward-into-cache → play the
  cache backward — which is **Mozilla's own prescribed workaround** in the bug above, and
  is shipped in Diffusion Studio's `webcodecs-scroll-sync` ("Bidirectional Playback…
  Efficient Buffering… based on current playback position"). 📄
- **Who ships reverse anyway**, by not depending on media elements: **Theatre.js**
  (`direction: 'reverse' | 'alternate' | 'alternateReverse'` — the cleanest API found),
  **Lottie** (`setDirection(-1)`, negative `setSpeed()`), **GSAP** (`reverse()`,
  `timeScale(-1)`), **Remotion Player** (`playbackRate` −10…10 excluding 0, *timeline
  only* — "embedded media tags cannot be played in reverse, this is a browser
  limitation", and the new `@remotion/media` components drop reverse entirely).
- **Who refuses**: Motion Canvas / Revideo (generators cannot run backward),
  **`@ircam/sc-scheduling`** (*"speed must be strictly positive"*), and us.
- Desktop precedent that *does* do it: **ossia score 3.8.x** shipped backwards audio
  playback and 3.8.1 "full backwards playback" — the only surveyed system with genuine
  reverse over real media. 📄 https://github.com/ossia/score/releases/tag/v3.8.1

**Our "no reverse" is the same call IRCAM made, and for the same reason**: reverse is not
a rate, it is a different reducer. `reduce(prefix ≤ t)` is defined for any *t* including
a backward seek — we can *land* anywhere, we just cannot *travel* backwards
continuously. Every system that ships continuous reverse either has no state to unwind
(Lottie, GSAP, Theatre are pure functions of `t`) or owns its decoder (ossia). We are in
the third category — stateful and element-slaved — where reverse would mean inventing an
inverse for every adapter. Correct refusal; worth stating in the docs as a *design*
choice rather than a missing feature.

---

## 10. The comparison table

| system | clock master | scheduling | seek strategy | hidden tab |
|---|---|---|---|---|
| **ours (transport v0.4)** | `{p0,t0,rate}` vector; media element masters via `sync()` | **lookahead 25 / 100 / 150 ms**, committed-vs-pending, cancellable, per-kind catch-up | **`reduce(prefix ≤ t)` → `assertState()`** per kind; property-tested ≡ `play(0→t)` | **worker host, 8.5 ms p95** ✅ |
| **Tone.js** | AudioContext + tick↔time offset | lookahead **50 / 100 ms**, worker ticker | remap tick offset; **no state reconstruction** — forward skips, backward re-fires | worker ticker (built for this) 📄 |
| **`@ircam/sc-scheduling`** | pluggable `getTimeFunction` (usually AudioContext) | lookahead **20 / 50 ms**, `setTimeout` main thread | `seek(pos, time)` → `TransportEvent` to each processor; processor decides | ⚠️ unguarded — main-thread `setTimeout` |
| **Chris Wilson metronome** | AudioContext | **25 / 100 ms**, worker in the demo | n/a | worker in the demo, unmentioned in the prose 📄 |
| **Strudel** | AudioContext; `NeoCyclist` in a **SharedWorker** | query-span loop, **50 ms interval / 100 ms minLatency** | **no seek needed** — query a different span of a pure function | SharedWorker variant 📄 |
| **Sonic Pi** | **thread-local virtual time**, advanced only by `sleep` | `scheduleAheadTime` pre-scheduling at virtual time | forward-only | n/a (native) |
| **wavesurfer.js v7** | HTMLMediaElement (default) or WebAudio (opt-in) | **rAF `FrameScheduler` polling** | `currentTime` write; region events polled off `timeupdate` | ⚠️ rAF stops |
| **GSAP** | rAF ticker | per-frame render of `progress()` | render state at `t` (pure function) | **lies: `lagSmoothing(500,33)` clamps a >500 ms gap to 33 ms** 📄 |
| **Remotion Player** | rAF, `setTimeout` fallback | per-frame; frame derived from elapsed wall time | set the frame — the tree is a pure function of it; media slaved by **hard seek past 0.45 s**, measured via rVFC | 📄 handled by fallback |
| **Remotion render** | **no clock at all** — a frame counter | frame-by-frame in headless Chrome, parallel across machines | n/a — any frame directly | n/a |
| **Motion Canvas / Revideo** | rAF (Player) / unthrottled loop (Renderer) | integer frame counter | **replay: `scene.reset()` re-runs the generator, then step to target** 📄 | ⚠️ rAF |
| **Etro** | rAF wall-clock delta | per-frame | free — declarative keyframe layers | ⚠️ rAF |
| **Theatre.js** | rAF, pluggable driver | per-frame | `sequence.position` | ⚠️ rAF |
| **Lottie** | one global rAF loop for all animations | per-frame `frameModifier` | `goToAndStop(frame)` | ⚠️ **no `visibilitychange` in source at all** |
| **Rive** | app-driven `advance(seconds)` | per-frame delta | `LinearAnimationInstance.time`; **state machines have no absolute-time setter** | app's problem |
| **timingsrc MediaSync** | TimingObject vector; the element is the *slave* | polling comparison loop | `seekTo` past the band, graded `playbackRate` inside | not addressed |
| **Kapwing** | ⚠️ decode-driven | decode-on-demand | **mp4box.js keyframe index → decode forward** 📄 | no evidence |
| **Shotstack Studio** | **`performance.now()`** anchor | per-frame `update(dt)` to every clip | move the anchor; iframe clips use a pre-captured frame cache | no evidence |
| **Descript / Frame.io / Vimeo / WeVideo / Veed / Canva / Clipchamp** | ⚠️ media element or a native/WASM engine | no published scheduler | **proxies** (all of them) | **no evidence, any of them** |

---

## 11. Three things others do better that we should steal

1. **Read `requestVideoFrameCallback.mediaTime` instead of `video.currentTime` in the
   media servo.** Remotion does this in production: `rvcTime` is preferred over
   `mediaTagTime` when it is the more recent sample, excluded only for variable-fps
   video, and it is the input to the seek decision. 📄 `currentTime` is a *coarse,
   asynchronously-updated* view of the decoder; `mediaTime` is the PTS of the frame the
   compositor actually showed, delivered with `expectedDisplayTime`. Our ±20 ms dead band
   is currently being enforced against a noisy measurement — the servo is as good as its
   sensor, and we are using the worse one. Cheap: it is one callback registration and a
   staleness comparison in the existing rAF servo, and it should tighten the
   0.1 ms/34 ms numbers from session 6p without changing any policy. Caveats worth
   coding for: exclude variable-fps sources (Remotion does), keep the `currentTime`
   path as fallback (**Firefox only shipped rVFC in v132, Oct 2024**), and note that rVFC
   is an *observation* primitive — the seek command still goes through `currentTime`.

2. **A deterministic offline render mode — "render is not playback" as a first-class
   second driver.** Remotion's `/docs/flickering` is the doctrine
   (*"There is no real timing synchronization and results will differ across machines"* →
   therefore the render has **no wall clock at all**), Motion Canvas ships it as a second
   driver over one core, Elementary ships `@elemaudio/offline-renderer`, Soundtrap
   "freezes" tracks, and `OfflineAudioContext` is the standardised audio half. **We are
   uniquely well placed to add it and have not**: `createVirtualRuntime()` already is a
   deterministic ClockSource (it is our CI gate), the audio lane takes a context by
   argument so `OfflineAudioContext` drops in, and the tick host is pluggable so a
   frame-stepping host is ~30 lines. Without it, "export the archival remix" means
   real-time capture, which for a 90-minute 1965 broadcast means 90 minutes and a
   promise that nothing stuttered. **Steal the split, not the code.**

3. **A proxy / pre-decoded scrub tier.** This is the single most universal pattern in the
   commercial survey and we have nothing: Descript's optimized assets, Kapwing's low-res
   transcodes + >90 % IndexedDB hit rate, Frame.io's C2C proxies, Shotstack's
   `captureFps` frame pre-capture, and the JPEG-per-frame extreme. Our nearest need is
   the archival client, where the assets are large, remote, ours-by-permission-only and
   *not* re-encodable at will — so the right shape is probably Shotstack's rather than
   Descript's: a **cached decoded-frame/filmstrip lane keyed by position**, which our
   `sampleAt` cursor is already the right index for. Related and nearly free: Kapwing's
   keyframe-index seek (`mp4box.js` `stss`) would let `seek()` report *achievable* target
   positions instead of discovering them after the fact — the same "degrade honestly"
   contract `deck.request()` already implements for rates.

**Honourable mentions that did not make the three**: Strudel's `NeoCyclist`
(SharedWorker + BroadcastChannel = one clock across N tabs — we will want this the day
two operator windows exist); Tone.js's `Draw.expiration` as prior art for a *visual-lane*
default; and Sonic Pi's FARM'14 paper, which should be read before anyone adds musical
time to the log.

---

## 12. Three things we appear to do that nobody else does

Stated with confidence levels. Absence of evidence is not evidence of absence, and the
commercial half of this survey publishes almost nothing.

1. **`reduce(prefix ≤ t)` + `assertState` as a *library* contract for seek.**
   **Confidence: high.** Every surveyed system does one of three things and none does
   this. (a) *Pure function of t* — Remotion, GSAP, Lottie, Theatre, Etro: correct and
   free, but only because there is no state to carry, i.e. they are authoring formats
   (C10's other pole). (b) *Stop and restart* — Tone.js (forward skips, backward
   re-fires), `sc-scheduling` (tell the processor, it decides), wavesurfer (write
   `currentTime`). (c) *Replay from the beginning* — Motion Canvas, at O(t). We are the
   only one that makes "reconstruct the state at t" a **typed contract the library
   executes**, per kind, property-tested at 100 seeds against `play(0→t)`, extended
   correctly to continuous kinds (`state(t) = f(prefix(≤t), successor(s))` — the sharpened
   guarantee from 6w). The nearest published relative is event-sourcing's left fold,
   which nobody has connected to a media transport.

2. **A per-kind adapter registry where the *capabilities* drive library behaviour.**
   **Confidence: high for the shape, moderate for the claim that nobody has it.** Others
   have kind enumerations (Rendley's 13 built-in clip types plus a "Custom" with no
   documented plugin registry), or file-format adapters (OTIO's — a different meaning of
   the word), or plugin interop (WAM), or processors that receive events and decide for
   themselves (`sc-scheduling`). Nobody found has `caps` that the library *reads and
   acts on*: `catchUp` deriving the freeze policy, `audio` opening the wall→audio bridge,
   `rates` forming a lattice that composes multiplicatively through nesting with
   log-nearest degradation **reported**, `continuous`/`interpolate`/`neighbourhood`
   driving `sampleAt`, `followsTransport` producing `adapter.transport(state)`, and
   **unbacked claims caught at `registerAdapter` rather than at 60 Hz**. Session 6w's
   proof-by-deletion (paths: 600 → 566 lines, adapter holds no reference to the log,
   numbers bit-identical) is the kind of evidence nobody else publishes.

3. **Evidence/provenance as a first-class axis of the timeline — tratteggio for time.**
   **Confidence: high that no shipped audience-facing equivalent exists**; this was a
   clean negative across products, prototypes and standards. C2PA has `TemporalRange` and
   `digitalSourceType` and nobody wires them to "these seconds were restored"; Descript's
   Studio Sound is explicitly whole-file; PROV-O and Web Annotation have no confidence
   property; the only visible-confidence UI found anywhere is Sonix's per-word
   thermometer; the only toggle is a restorer-facing QC control in DIAMANT. Meanwhile
   proto/paths ships hatching, attested-only dots, an evidence toggle and a live
   invented-percentage. **Caveat on scope**: what we have shipped is a *demo* of the
   ethic, not the library primitive — `caps.tier/method/evidence/deviates` are declared,
   `request()` has the right `{wanted,chose,degraded,reason}` shape and `degradations()`
   is the ledger, but `info.policy` in reduce and
   `sampleAt(kind, pos, {evidence:'attested'})` are not built (6w ranked this the
   cheapest remaining gap, ~20 lines + one prop arm). The *uniqueness* claim is about the
   idea; the *shipped* claim is about one demo.

**Two more that are probably ours but I will not claim as strongly.**
*Drift as a subscribable channel* (`onDrift`/`peekDrift`/`driftStats`, capped, nesting
rather than flattening across position domains) — no surveyed scheduler exposes its own
per-fire scheduling error as an API surface at all; **confidence: moderate**, because
this is exactly the kind of thing that exists undocumented inside closed products.
*The `sync()` contract with jump→seek discrimination* — the mechanism is timingsrc
MediaSync's from 2013 and Remotion's today; what appears new is making it a *named
contract distinct from `seek()`* ("a correction must never re-fire", enforced through
nesting), rather than an implementation detail of a media wrapper.

---

## 13. Verdict — did we need to write this?

**Yes, but we should have started from Tone.js and `sc-scheduling` rather than from
scratch, and we would have saved measurement time by reading Chris Wilson first.**

The honest accounting:

- **Our two headline transport bets were already published.** 25 ms tick / 100 ms
  horizon is Chris Wilson's number verbatim; the worker tick host is Tone.js's default
  `clockSource`, and Tone.js's own issue #124 traces it back to Wilson's metronome.
  Arriving at the same constants by measurement (arms A/BG/E) was *worth doing* — nobody
  else has published p95s for these choices, and "worker 8.5 ms hidden vs main 981 ms vs
  rAF 9175 ms" is a number the field is missing — but it was rediscovery, and the file
  should say so.
- **No existing engine could have been adopted whole.** Tone.js has no seek
  reconstruction, no media master, no nesting, and one hard-coded catch-up policy for one
  lane. `sc-scheduling` has the transport shape but ticks on the main thread and leaves
  seek entirely to the processor. Remotion has the nesting and the determinism but is a
  *renderer*: its live path is deliberately 450 ms sloppy and it has no event lane at all.
  Motion Canvas has state-at-t but at O(t) and only for generators. GSAP/Theatre/Lottie
  are animation timelines over pure functions and cannot represent a trace. Strudel is
  the other pole of C10 by construction. **The intersection we needed —
  heterogeneous kinds + a real trace + media as clock master + seek that reconstructs
  state + survives a hidden tab — is empty.**
- **The thing that justifies the build is not the scheduler; it is the seek contract and
  the adapter registry.** Four adoptions each found a latent bug that no existing library
  would have prevented (jam's −100.8 ms constant offset, replay-grid's forward-seek
  cue burst, instrument's +1075 ms media misalignment) — all three are failures of
  *seek semantics* and *one instant for all lanes*, which is exactly the layer no
  surveyed engine provides.
- **What we did not need to write, and still might not**: the media servo (timingsrc
  MediaSync was finished, unencumbered and correct in 2013, and the W3C CG that produced
  it closed in Jan 2025 — we could have ported its graded servo instead of tuning our
  own), and the offline renderer we have not written yet, where Remotion's doctrine and
  `OfflineAudioContext` do most of the thinking.

**One-line answer**: the transport was a rediscovery, the *deck* was not.

---

## 14. Sources

Primary sources read directly (source code or spec text), 2026-08-28:
Tone.js `Context.ts`/`Ticker.ts`/`Draw.ts`/`Transport.ts` · `@ircam/sc-scheduling`
`Scheduler.js`/`Transport.js` · timingsrc `v3/test/mediasync/mediasync.js` ·
Remotion `get-media-sync-action.ts` · WICG video-rvfc spec · Chrome timer-throttling blog.
Everything else is cited inline at point of use. Search and fetch transcripts are not
retained; every non-obvious claim above carries its URL.
