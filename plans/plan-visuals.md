# plan-visuals — generative pictures, and which side of the wire they are made on (2026-09-11)

Companion to `plans/plan-hardware.md` (the box), `research/quest-xr-2026-09.md` (the
headset), and `rig/board/README.md` (the instrument that already exists). Written
because the user asked one question with a shape this project has answered
before, for sound: **some instruments render on the board and stream samples;
others send only control signals and are synthesised in the browser. Does the
same split apply to pictures?**

It does. The boundary is in a different place, and this document says where,
with numbers taken on the actual board rather than inferred from the class of
chip.

Every claim is tagged **MEASURED** (a command was run and its output is quoted),
**DOCUMENTED** (a vendor, spec or release note says so, with a URL and a date),
**ESTIMATED** (arithmetic on top of measured values, and the arithmetic is
shown), or **UNCONFIRMED** (nobody here has checked).

---

## 0. The short answer

**Render in the viewer's browser. Send parameters and seeds, not pixels.** That
is the default, and it is the default for the same reason `carry` synthesises a
Rhodes locally instead of streaming one: the thing being made is pure arithmetic
over a small state, and shipping the arithmetic costs bytes that do not scale
with resolution, frame rate, or the number of people watching.

**Stream pixels only when the picture cannot be reproduced from a document** —
when it depends on something the browser does not have and cannot be sent
cheaply: a camera, an archive video, a 60-second circular audio buffer, a
2,030-line SuperCollider graph's own internal state. That is the visual
equivalent of the sampler-versus-FM split this repo already made.

**And the Raspberry Pi 4 is a genuinely capable visual machine, which was the
surprise.** MEASURED on the board today, alongside the running instruments:
a kaleidoscope-fold, three-octave-noise, domain-warp, feedback shader renders
**720p at 54.6 fps** on the VideoCore VI (51.8 if the CPU governor is left at
`ondemand` — §3.4); the same shader plus three blur passes runs 28.2 fps; and the whole chain — render, read the pixels back, encode them
with the board's hardware H.264 encoder — sustained **29.6 fps at 1280×720 for
30 seconds with zero audio dropouts**, using under one of the four cores. The
board also runs **GLES 3.1 compute shaders**, which is a capability nobody in
this repo had checked for: 262,144 particles integrated at 183 dispatches a
second.

**The third surprise is that the existing relay already carries video.**
MEASURED Pi → Cloudflare → laptop: 4 Mbit/s of H.264-shaped binary at 30
messages a second arrives **byte-identical with zero gaps**. At 8 Mbit/s it
loses 101 of 361 frames silently. So "stream pixels over the thing we already
have" is real, has a measured ceiling, and needs a sequence number inside the
payload to see the ceiling bite.

**The renderer is WebGL2, not WebGPU, and that is a measurement rather than a
preference.** WebGL2 is available in every shipping browser (96.44%, caniuse).
WebGPU returns a working adapter on 82.47% of sessions overall but **17.09% on
Linux** (web3dsurvey, MEASURED, read 2026-09-11) — and on a Raspberry Pi, on
zero. Compute shaders are the real prize and they are worth a second backend
when something needs scatter writes; nothing in phase one does.

🔴 **And one hardware finding cuts against an existing plan: the Pi 5 has no
H.264 encoder at all.** Broadcom removed the block from BCM2712 — encode *and*
decode — and Raspberry Pi's own documentation says the Pi 5 uses software
encoders with longer latency that "can sometimes be an issue for real-time
streaming applications". `plan-hardware` §4 recommends building on a Pi 5. **For
visuals that is the wrong board**, and §3.6 has the numbers.

**The largest single risk is not performance. It is that this repo's own test
harness cannot see a GPU.** MEASURED: `demo/verify.mjs` launches Chrome with
`--disable-gpu`, and under that flag `canvas.getContext('webgl2')` returns
**null**. Every visual assert would be unreachable — the exact failure that cost
this project three demos in September. §5.1 is about the rig, and it comes
before the feature on purpose.

---

## 1. The split: render here, or render there

### 1.0 The audio lesson, restated as a test

This project already learned the answer for sound, and the lesson is not "big
things go on the server". It is sharper than that. From `rig/board/README.md`:

- `demo/shell/rhodes.mjs` is **imported, not ported**, by the box. The same
  arithmetic runs in an AudioWorklet at `/carry/` and in node on the Pi. It can
  do that because it is "pure per-sample arithmetic with no audio library" —
  7 flops and zero state for its pickup nonlinearity.
- Yoshimi cannot do that. It is 911 instruments in 24 banks and **317 MB of
  RSS** (MEASURED, session 17). Pappus cannot either: it is a 2,030-line
  SuperCollider graph whose sound *is* the contents of a 60-second circular
  buffer of audio that went into it.

So the test was never size. **It was whether the output is a function of a small
document, or a function of a large state that lives somewhere.** A Rhodes note
is `f(pitch, velocity, time)`. A Pappus grain is `f(whatever was recorded into
the buffer)`, and the buffer is on the board.

### The visual equivalent, stated as a rule

> **A picture renders in the viewer's browser when every pixel is a function of
> (a seed, a parameter set, a clock) and nothing else. It renders elsewhere and
> streams as pixels when any pixel depends on data the browser does not have and
> cannot cheaply be given.**

Applied:

| the picture is… | where it renders | why |
|---|---|---|
| a fragment shader over `(uv, time, params)` | **browser** | a document. ~2 KB of GLSL plus ~200 bytes of parameters reproduces it at any resolution |
| a particle system seeded by a PRNG | **browser** | same — the seed IS the state, which is exactly what `pappus.mjs`'s `mulberry32` already proves for sound |
| geometry generated from a rule (L-system, voxel field, mesh from noise) | **browser** | the rule is the document; the mesh is its output and need never cross |
| kaleidoscope / displacement / feedback over any of the above | **browser** | post-processing is a pure function of the previous frame, which the browser already has |
| the same, but over a **camera** | wherever the camera is | pixels the browser does not have |
| the same, but over an **ERR archive clip** or a live stream | **hybrid** — see §1.4 | the video streams; the post-processing is local |
| the same, but over the **box's audio buffer as an image** | box, or hybrid | the 60-second buffer is on the board and is the state |
| a scene whose content is chosen by a model | **browser**, with the document validated locally | `plan-voice`'s rule: the model picks a *name from a list the page owns*; the picture is still local arithmetic |

⚠️ **The rule has a failure mode and it is worth naming.** "It is a function of
a document" is true of essentially any procedural picture, which makes the rule
sound like it always says *browser*. It does — for the picture. It says nothing
about the **machine**, and that is the second axis: a browser that cannot run
the shader fast enough has to be given something else. §2 and §5.4 are about
discovering that per visitor rather than assuming it.

### 1.1 The four options, with the numbers this repo already owns

**A. Render in the viewer's browser, driven over the relay.**

- **Latency:** the control message only. MEASURED: the Durable Object hop is
  **1–2 ms at p50** (`demo/perf-wire.mjs`); the board's note-to-ear over the
  open internet is **98.7 ms median** (session 17), of which 60 ms is the
  deliberate playout cushion in `listen.html`. A visual parameter has no
  cushion, so it can be applied on the next frame — 11–17 ms at 60–90 Hz.
- **Relay cost:** one message. A parameter document of the size §5.3 of the
  Quest report measured for a head pose (152–285 bytes) at even 20 Hz is 20 of
  the 60 messages a second a socket is allowed. **Fan-out is unmetered** — the
  relay's buckets are on the sender's ingress — so one sender driving sixteen
  viewers costs the same as driving one. That is the property that makes this
  option scale and the pixel options not.
- **What breaks:** the visitor's GPU. And, separately, the harness (§5.1).

**B. Render elsewhere and stream encoded pixels.** This repo can already do it
three ways and has measured all three:

| tier | measured latency | note |
|---|---|---|
| LL-HLS (Cloudflare Stream) | 3.82–3.88 s | and a latency target inside one keyframe interval is unreachable — `PART-HOLD-BACK=1.5` against a 2.0 s GOP |
| WHEP (Cloudflare WebRTC) | p50 **67.0 ms** glass-to-glass, wins at p99 | refuses a single-track offer: audio-only or video-only is HTTP 400 |
| MoQ (Cloudflare relay) | p50 **26.2 ms** glass-to-glass | blocked on Safari by `@moq/net`'s user-agent gate for a real WebKit bug |
| **the relay itself**, as binary frames | **NEW, MEASURED today — see §3.6** | 4 Mbit/s at 30 msg/s, zero loss; 8 Mbit/s loses 28% silently |

- **Latency:** 26 ms at best, 3.9 s at worst. Against option A's one frame.
- **Cost:** Cloudflare Stream **bills delivered minutes, not bytes**, on both
  HLS and WebRTC from 2026-10-15. So a second viewer doubles the bill, and the
  28x byte saving that `tracks` measured is worth **$0** there. The relay does
  not bill per viewer, which is why §3.6 matters.
- **What breaks:** every viewer needs their own decode. On a Quest 3S that is a
  hardware decoder slot, and Meta's only published guidance is *"only play a
  single video at a time"* with no concurrent-decoder count published by anyone.

**C. Stream a raw framebuffer.** This is not a candidate and the arithmetic says
so in one line.

    1280 × 720 × 4 bytes × 60 fps = 221,184,000 B/s = 221 MB/s = 1.77 Gbit/s

Against the relay's MEASURED per-socket budget of **512 KiB/s = 524,288 B/s**,
that is **422x over**. It is also 30 frames a second against a 60 msg/s ceiling
that would be met at 60 — so the message cap is the *only* cap this would not
immediately break, and every other one it exceeds by two and a half orders of
magnitude. Even 320×240×4 at 30 fps is 9.2 MB/s, still **17.6x** over.

⚠️ And a single raw 720p frame is **3,686,400 bytes against `maxBytes` of
262,144** — 14x the per-message cap — so it cannot even be sent as one message.
`openWire`'s `send()` would refuse it locally; `sendBinary()` would not, and the
relay would drop it silently. MEASURED confirmation of the mechanism is in §3.6.

The only honest use for a raw framebuffer is **inside one machine**: the board
reads pixels back at **486 MB/s** (§3.4) precisely so it can hand them to an
encoder in the same process tree. It never goes on a wire raw.

**D. Hybrid.** The thing the user is actually pointing at. §1.4.

### 1.2 Where the seam goes

There are three candidate seams and they are not equally good.

**Seam 1 — parameters cross, everything else is local.** The box (or a page, or
a model) sends `{seed, params, clock}`; the viewer's browser owns the geometry,
the shader and the post-processing. This is `carry` for pictures, and it is the
default.

The precedent is exact and it is already in this repo. `rig/board/pappus.mjs`
carries a **seeded PRNG** (`mulberry32`) for one stated reason: *"an
unrepeatable die is a die you cannot use… Every roll here carries the seed that
produced it; passing it back reproduces the roll exactly."* A seed plus a
parameter set is a complete description of a generative state in tens of bytes.
It is the smallest possible message that fully determines a picture, and this
project already built it for the other medium.

**Seam 2 — a video texture composited into a locally-rendered scene.** The
archive clip, the camera or the live stream arrives as video on one of the three
tiers; the browser draws it into a texture and the kaleidoscope, displacement
and feedback run locally on top. This is the right shape whenever real footage
is involved, and it has a documented performance inversion worth quoting from
the Quest report: **`THREE.VideoTexture` runs fine inside an immersive session
on Quest and is slow on the flat 2D page** — Meta's own engineer, in
[three.js#28868](https://github.com/mrdoob/three.js/issues/28868). An A/B run on
a desktop page reports the opposite of the truth about the device.

**Seam 3 — generated code crosses.** A model writes a shader; the page compiles
and runs it. This is the interesting one and it is **not decided**, for a reason
the Quest report already stated and this plan will not soften:

> ⚠️ There is no Content Security Policy on the deploy today. `workers/view`
> sets none, so `new Function(...)` and `await import(blobURL)` both work, and
> generated code would run with the page's full authority — including its socket
> to `ws.positron.studio`.

A **GLSL or WGSL source string is a much better case than JavaScript**, and the
difference should be made explicit rather than assumed: a shader cannot open a
socket, cannot read `document.cookie`, and cannot reach the page's credentials.
It compiles inside the GL driver. Its worst case is a hang or a driver reset,
not exfiltration. So **generated shaders are a defensible seam 3 and generated
JavaScript is not**, and the first page to run either should say which it does,
in its own source.

⚠️ Even a shader is not free. A shader with an unbounded loop can hang the GPU
and take the compositor with it; browsers respond with `WEBGL_lose_context` or a
tab kill. The guard is a **validator the page owns** — no `while`, bounded `for`
counts, a compile timeout, and a first-run frame-budget check before the shader
is promoted — which is `plan-voice`'s "choose a name from a list the box
supplied" applied to syntax. **And per CLAUDE.md: break it on purpose once every
run, or the guard is a claim rather than a check.**

### 1.3 What each option costs on the relay, in one table

Caps read from `demo/shell/wire.mjs`, which reads them from
`workers/relay/src/index.js`: `maxBytes` 256 KiB/message, `maxSockets` **16 per
room**, `bytesPerSec` 512 KiB/s **per socket**, `msgPerSec` 60 with a burst of
120. MEASURED previously: at both 120 and 300 msg/s, three runs each delivered
exactly **298 messages in three seconds**, and the sender was told nothing.

| what crosses | bytes/s | messages/s | share of one socket's budget | fan-out cost |
|---|---:|---:|---:|---|
| seed + ~20 parameters, on change | ~200 B per change | ~1–5 | < 0.1% | free — fan-out is unmetered |
| the same at 20 Hz (continuous drift) | ~4 KB/s | 20 | 0.8% bytes, **33% messages** | free |
| box audio PCM, as it ships today | 96 KB/s | **50** | 18% bytes, **83% messages** | free |
| 2 Mbit/s H.264 at 30 fps | 250 KB/s | 30 | 48% bytes, 50% messages | free |
| 4 Mbit/s H.264 at 30 fps | 500 KB/s | 30 | **96% bytes** | free |
| raw 720p RGBA at 60 fps | 221 MB/s | 60 | **42,200%** | — |

⚠️ **The message budget binds before the byte budget, and the audio stream has
already spent most of it.** The box sends 50 messages a second of PCM
(`RATE / FRAME` = 48000/960). Adding 20 Hz of visual parameters on the *same
socket* is 70/s against a ceiling of 60 — over. The fix is architectural and
cheap: **the buckets are per socket**, so visual control belongs on a different
connection from the audio, or it rides at ≤10 Hz, or it is interpolated locally
from sparse keyframes. That last one is what the timeline lineage already
settled: *"throttle at capture (~100 ms), interpolate at replay"*
(`plan-timeline` §0, a measured tradeoff from a previous generation).

### 1.4 The hybrid, concretely

The shape that follows from all of the above:

```
  box / model / page                 relay                   viewer's browser
  ──────────────────                 ─────                   ────────────────
  a seed + parameters  ───────────►  1 msg  ───────────────►  local render
  note.on / params.rolled ────────►  1 msg  ───────────────►  drives the params
                                                              ↓
  (only when real footage        LL-HLS / WHEP / MoQ          video texture
   is involved)         ───────────────────────────────────►  ↓
                                                              kaleidoscope,
                                                              displacement,
                                                              feedback — local
```

- **Geometry local. Post-processing local. Parameters and seeds over the wire.**
- **Video only when there is real footage**, and then on the tier whose latency
  matches the use: MoQ at 26 ms if it must be in time with the sound, LL-HLS at
  3.9 s if it is wallpaper.
- **Pixels from the box only when the box is the one with the state** — and even
  then, §3.6 says the existing relay carries it, so no new tier is needed for a
  single-digit-viewer case.

---

## 2. GPU capability in the browser, honestly

Sources and dates are given inline. The short version: **WebGL2 is universal and
WebGPU is not, the gap is on Linux and Firefox, and for anything this project
would ship in the next six months WebGL2 is the renderer and WebGPU is the
experiment.**

### 2.1 Where WebGPU actually is, September 2026

| | status | source |
|---|---|---|
| **Chrome / Edge, Windows + macOS + ChromeOS** | shipped since **Chrome 113**, 2023-05-02 | [developer.chrome.com](https://developer.chrome.com/blog/webgpu-release), 2023-04-06 — DOCUMENTED |
| **Chrome, Linux** | ⚠️ **partial.** Intel Gen12+ in **144** (2026-01-13); NVIDIA driver 535.183.01+ **on Wayland only** in **147** (2026-04-07). **All AMD, and everything else, still needs `--enable-unsafe-webgpu`** | [new-in-webgpu-144](https://developer.chrome.com/blog/new-in-webgpu-144) 2026-01-07, [147–148](https://developer.chrome.com/blog/new-in-webgpu-147-148) 2026-04-22, [GPUWeb wiki](https://github.com/gpuweb/gpuweb/wiki/Implementation-Status) 2026-08-13 — DOCUMENTED |
| **Chrome for Android** | shipped **121**, 2024-01-23 — **Android 12+**, Qualcomm and ARM GPUs. PowerVR needs Android 16 + Chrome 139; Samsung Xclipse still not shipped | [new-in-webgpu-121](https://developer.chrome.com/blog/new-in-webgpu-121) 2024-01-18 + wiki — DOCUMENTED |
| **Firefox** | Windows **141** (2025-07-15); macOS Apple Silicon **147** (2026-01-13). **Linux: Nightly only. Android: behind a flag. macOS Intel: Nightly only.** Firefox 155 (2026-09-01) still ships no Linux WebGPU | [Mozilla gfx](https://mozillagfx.wordpress.com/2025/07/15/shipping-webgpu-on-windows-in-firefox-141/), [FF147 notes](https://www.firefox.com/en-US/firefox/147.0/releasenotes/), [MDN experimental features](https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Experimental_features) last modified 2026-09-04 — DOCUMENTED |
| **Safari** | shipped **26.0**, 2025-09-15, on macOS, iOS, iPadOS, visionOS. ⚠️ **Requires macOS Tahoe 26 / iOS 26 — `navigator.gpu` is absent in Safari 26 on Sequoia or Sonoma** | [webkit.org](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/) 2025-09-15; [WebKit bug 299237](https://bugs.webkit.org/show_bug.cgi?id=299237) 2025-09-20 — DOCUMENTED |
| **Quest Browser** | page API default-on since **Browser 32.0** (2024-02-27). ⚠️ **WebGPU *inside* an immersive session is behind a `chrome://flags` toggle** since Browser 146.0 (2026-04-21) | `research/quest-xr-2026-09.md` §1.3 — DOCUMENTED there |
| **Raspberry Pi** | **none.** Not in Chrome's Linux rollout; a Pi on Chromium 144 reports `chrome://gpu` → "WebGPU: Disabled, Vulkan: Disabled, **WebGL: Hardware accelerated**" | [RPi forum 396128](https://forums.raspberrypi.com/viewtopic.php?t=396128) 2026-02-09, answered by an RPi engineer — MEASURED (user-reported) |

**The headline number and why not to use it.** caniuse reports WebGPU at
**87.35%** global (read 2026-09-11, DOCUMENTED). Web3D Survey, which counts
sessions where `requestAdapter()` actually **returned a working adapter**,
reports **82.47%** — and by operating system: ChromeOS 92.27, macOS 90.33,
iOS 86.05, Android 74.46, **Linux 17.09** ([web3dsurvey.com/webgpu](https://web3dsurvey.com/webgpu),
read 2026-09-11, MEASURED; sample size not disclosed).

⚠️ **Those are two different quantities and the difference is the whole
decision.** caniuse counts browser *versions* that implement the API; the survey
counts *adapters that came back*. A page that branches on `'gpu' in navigator`
is asking the caniuse question; a page that branches on `await
navigator.gpu.requestAdapter() !== null` is asking the real one. **Branch on the
adapter.** This is CLAUDE.md's rule about measuring the quantity in question, in
one line of code.

**WebGL2 is 96.44%** (caniuse, read 2026-09-11) and the only entries marked
unsupported are Internet Explorer and Opera Mini. **There is no shipping browser
in 2026 where WebGL2 is unavailable.** DOCUMENTED.

### 2.2 What compute shaders actually buy

WebGL2 is OpenGL ES **3.0**. Compute shaders, shader storage buffers, image
load/store and indirect draw are all ES **3.1** features and none of them are in
the WebGL2 API surface (MDN `WebGL2RenderingContext`, DOCUMENTED). Chrome's own
migration guide is blunt: *"Compute shaders … are available only in WebGPU, not
WebGL"*, and storage textures support *"random access writes"*
([from-webgl-to-webgpu](https://developer.chrome.com/blog/from-webgl-to-webgpu),
2023-09-19, updated 2025-09-16 — DOCUMENTED).

For generative visual work the three that matter:

1. **Scatter versus gather.** A fragment shader writes exactly one pixel — its
   own, fixed by rasterisation. A compute shader writes anywhere. That is the
   difference between "each particle reads its own cell" and "each particle
   *deposits* into an arbitrary bin": histograms, spatial hashing, sorting, and
   the trail/deposit fields that make Physarum-style and reaction-diffusion
   pictures work. A fragment-only ping-pong cannot express a deposit at all
   without additive blending tricks that lose precision.
2. **Workgroup shared memory.** WGSL's `workgroup` address space gives a
   workgroup on-chip scratch — default limits `maxComputeWorkgroupStorageSize`
   16,384 bytes and `maxComputeInvocationsPerWorkgroup` 256 (MDN
   `GPUSupportedLimits`, DOCUMENTED). WebGL2 has no analogue; neighbour data is
   re-fetched through the texture cache every time.
3. **Indirect dispatch and indirect draw.** `dispatchWorkgroupsIndirect()` takes
   its workgroup counts from a 12-byte buffer; `drawIndirect()` takes its vertex
   and instance counts from a 16-byte buffer (MDN, DOCUMENTED). The GPU decides
   how much work to do, with no CPU readback. WebGL2 has neither.

⚠️ **The honest comparison is compute against transform feedback, not compute
against a CPU loop.** WebGL2's transform feedback *is* a real GPU-side state
update, and the "150x" figures circulating in blog posts are comparing against
CPU-updated particles and should be discarded.

**The one good published benchmark** does it correctly: Saga Palmér, *Performance
Comparison of WebGPU and WebGL for 2D Particle Systems on the Web*, MSc thesis,
KTH, PDF dated 2024-11-17
([DiVA](https://www.diva-portal.org/smash/record.jsf?pid=diva2%3A1945245)) —
WebGPU compute with ping-pong storage buffers against WebGL2 transform feedback
with ping-pong buffers, both fully GPU-resident, timed with `timestamp-query`
and `EXT_disjoint_timer_query_webgl2`. MEASURED:

| GPU | compute time | total GPU time | max particles at 60 fps |
|---|---|---|---|
| RTX 3080 | **~100x** better | **10–20x** | 37M / 20M (WebGPU) vs 2.7M / 2.3M (WebGL) |
| Intel UHD 620 | **5–6x** | 60% – 6x | 2.1M / 398k vs 374k / 310k |

Note the spread: **the win collapses from 20x to under 6x on integrated
graphics**, which is the tier most visitors are on. The author's own stated
limitation is that no tuned fragment-shader ping-pong was compared, and **no
such published benchmark exists** — UNCONFIRMED.

### 2.3 Post-processing: what each effect costs, and which need ping-pong

| effect | needs a second render target? | why |
|---|---|---|
| **mirror / kaleidoscope** | **no** | a coordinate fold before the sample. Pure ALU, one pass, free |
| **displacement / domain warp** | **no** | offset the read position. One pass, costs extra texture fetches with poor locality |
| **feedback** (last frame as texture) | **YES, always** | you cannot read and write one texture |
| **blur** | **yes** | reads neighbours, so it cannot be done in place |
| **bloom** | **yes, many** | a downsample/upsample pyramid |

**Feedback is not a style choice about buffers — the specs forbid the
alternative.** OpenGL ES 3.0.6 §4.4.3: *"When a feedback loop exists, **undefined
behavior** results"*, and §4.4.3.1 adds that the framebuffer is still reported
*complete* while *"the values of fragments rendered while in this state will be
undefined"* — a silent wrong answer, which is the worst kind.
[WebGL promotes it to a hard error](https://registry.khronos.org/webgl/specs/latest/1.0/):
`INVALID_OPERATION`. WebGPU rejects it earlier still — one render pass is one
usage scope, so merely calling `setBindGroup()` with the attachment fails
validation whether or not the shader samples it (W3C WebGPU CRD 2026-09-01
§3.4.3–3.4.4). All DOCUMENTED. **So: two targets, swapped each frame. There is
no in-place option anywhere.**

**Bloom is 12 full-screen passes in the implementation this project would
reach for.** three.js `UnrealBloomPass`, read from source: `nMips = 5`,
`kernelSizeArray = [6,10,14,18,22]`, separable horizontal + vertical per mip →
**12 full-screen draws into 11 render targets per frame**. Unity URP defaults to
6 iterations = 12 passes; Unreal uses 5 levels. DOCUMENTED. Measured mobile cost
from Arm: a shipping title's bloom *"contributed for **3 ms** to total frame
rendering time"*; a texture-based fake cost *"less than 1 ms"*
([Arm, 2018-04-17](https://developer.arm.com/community/arm-community-blogs/b/mobile-graphics-and-gaming-blog/posts/post-processing-effects-on-mobile-optimization-and-alternatives)).

**And this is where tile-based GPUs — every phone, the Quest, and the Pi — make
a separate argument.** Arm's *GPU Best Practices Guide* Rev 3.4 (2025-01-31)
§7.2: *"Do not switch back and render to the same FBO multiple times in a frame…
On Valhall, it is especially important to minimize FBO switching as the driver
does a flush in `glBindFramebuffer()`."* The quantified version, from Arm's
*Understanding Render Passes* (2021-03-22), is their own worked example:
1920×1080×4 bytes × 6 accesses = **49.7 MB/frame = 2.99 GB/s at 60 fps**, and
*"external DDR bandwidth costs 100mW per GB/s"*. Both DOCUMENTED.

**ESTIMATED from those two Arm constants:** one full-screen 1080p RGBA8 access
is 8.29 MB → 0.5 GB/s at 60 fps → ~50 mW. **A single ping-pong pass (one read +
one write) is ≈ 1 GB/s ≈ 100 mW ≈ 4% of a 2.5 W phone's whole power budget —
before any shading.** Twelve bloom passes is the entire budget.

⚠️ **But "fewer passes is better" is wrong, and Arm say so themselves.** Marius
Bjørge, SIGGRAPH 2015, Mali-T760: a naive 1080p Gaussian blur at **41.9 ms**
against an **8-pass** dual filter at **2.8 ms** — ~15x faster *with more passes*,
at PSNR 50 dB and 7% of the bandwidth. Arm's own conclusion: *"It may sound
unintuitive, but using multiple-passes and taking advantage of cache locality is
a huge performance win."* MEASURED.

**The resolution of the apparent contradiction is the rule to carry:** passes are
cheap when each one is *smaller*; passes are expensive when each one is
full-resolution. **Downsample, then iterate.** §3.4 measured exactly this shape
on the Pi from the other direction — three full-resolution 3×3 blurs cost
~5.7 ms each against the generative pass's 18.3 ms, so even at full resolution
the marginal pass is a third of the first one, and at half resolution it would
be a twelfth.

⚠️ And one counterintuitive warning that applies directly to §2.2's enthusiasm:
Arm Best Practices §9.1 — *"**Compute shaders can be slower and less
energy-efficient than fragment shaders for simple post-processing workloads.**
Examples … are downscaling, upscaling, and blurs."* and *"Do not use compute to
process images generated by fragment shading. Doing so creates a backwards
dependency that can cause a bubble."* DOCUMENTED. **Compute is for particles and
fields, not for blurs.**

### 2.4 The Quest 3S

From `research/quest-xr-2026-09.md` §1.3 and §4.3 — not re-researched here:

- **WebGL2 plus `OCULUS_multiview` is what ships.** Multiview is on by default
  and is the variant with MSAA. ⚠️ Its benefit is **CPU-side only** — Meta quote
  25–50% CPU reduction and *nothing at all if you are fragment-bound*. A
  heavy post-processing chain is fragment-bound by definition, so **multiview
  buys this workload nothing.**
- **WebGPU inside an immersive session is a `chrome://flags` toggle the visitor
  must set.** That makes it an R&D capability, not a deliverable.
- **Quest 3 and 3S have 6 cores** (XR2 Gen 2), fewer than Quest 2's 8. And the
  **3S runs 42 GB/s of memory bandwidth against the Quest 3's 68 GB/s on
  identical GPU silicon.** Read that against §2.3's bandwidth arithmetic: a
  ping-pong chain tuned on a Quest 3 can fall off a cliff on a 3S. **This is the
  single most relevant spec on the device for this plan.**
- **Media layers beat video textures**, and Meta publish the numbers: same
  content, GPU bus-busy 50.210% → 23.904%, render time ~3.15 ms → ~0.72 ms.
  ⚠️ But a media layer is composited by the headset and **the page never touches
  its pixels** — so a video that must be post-processed cannot use one. That is
  a real fork in the road for §1.4's hybrid, and it has to be chosen per surface.

### 2.5 What breaks if we target WebGPU today

1. **Linux visitors mostly do not get it** — 17.09% of sessions return an
   adapter. This project's own board is a Linux machine with no WebGPU at all.
2. **Firefox on Linux and Android does not have it**, and Safari needs macOS 26
   or iOS 26 — not merely Safari 26.
3. **three.js's WebGPU path is still officially experimental.** r186 (published
   2026-09-08); the manual still says *"The renderer itself is still in an
   experimental state … depending on your application and scene setup, you will
   encounter missing features or a better performance with `WebGLRenderer`."*
   ⚠️ That wording dates from 2025-11-14 and has not been edited since — it is
   live but ten months old, and **no 2026 statement declaring it stable exists**
   (UNCONFIRMED).
4. **It costs 1.7x the bundle.** MEASURED (min+gzip, `three@0.186.0`): classic
   **184.9 KB**, `three/webgpu` **291.1 KB** — +106 KB. three.js's own CI bot on
   PR #34334 reports a tree-shaken minimal app at 124.88 KB against 207.95 KB.
   And TSL is not usable standalone: `three/tsl` is a re-export shim over
   `three/webgpu`, so using it costs the full 284 KB.
5. ⚠️ **But the WebGL2 fallback is better than its reputation.** three.js's
   `WebGLBackend` ships inside `three.webgpu.js`, is selected automatically, and
   **does run compute** — emulated with `RASTERIZER_DISCARD` plus transform
   feedback (verified in the shipped r186 bundle). What it lacks is
   multi-dimensional dispatch and indirect dispatch. 25 of 231 official
   `webgpu_*` examples hard-refuse it — including `compute_birds`, `cloth`,
   `particles_fluid`, `texture_pingpong` and `water`.

**So the position for this project:** WebGL2 is the renderer. WebGPU is a second
backend behind a runtime adapter check, worth building when something genuinely
needs scatter writes — a deposit field, a sort, a spatial hash — and not before.
`mirror` (§5.2) needs none of them.

### 2.6 How to measure GPU frame cost from a page — and the trap in it

⚠️ **`requestAnimationFrame` deltas measure wall clock, not GPU time**, and
`performance.now()` is itself coarsened to 100 µs in a non-isolated context
(5 µs cross-origin-isolated) — MDN, DOCUMENTED. A rAF delta cannot tell a slow
GPU from a busy main thread.

**WebGPU's `timestamp-query` is the real instrument and it works unflagged.**
It is an optional feature requested at device creation; **98.76%** of
WebGPU-capable browsers report it (web3dsurvey, MEASURED).

⚠️ **Two corrections to Chrome's own documentation, both MEASURED on Chrome 152
today by the platform survey, with a separating control run:**

- Chrome documents the quantum as 100 µs. **It is 65,536 ns (2^16), not
  100 µs.** A ~1.63 ms pass returned values whose GCD was exactly 65536 and
  none of which was a multiple of 100000. The control — the same code under
  `--enable-webgpu-developer-features` — returned GCD 1 ns, which rules out the
  Metal timer period and attributes the snapping to Chrome's quantizer. *(Two
  hypotheses with opposite implications, separated by a measurement rather than
  by plausibility — CLAUDE.md's rule, applied.)*
- The Intent to Ship said non-isolated contexts get no exposure. **They do** —
  `timestamp-query` was in `adapter.features` on a plain page with
  `crossOriginIsolated === false` and no flags.

**Consequence for a readout:** at 65.5 µs granularity a pass cheaper than ~65 µs
reads as either 0 or 65.5 µs and nothing in between. That is CLAUDE.md's
"every readout cell must be able to change" trap waiting to happen — **do not
put a sub-65 µs per-pass number in a readout**, and say the granularity beside
any number that is close to it.

**On WebGL2, `EXT_disjoint_timer_query_webgl2` returns raw nanoseconds** — finer
than WebGPU's default — but it is effectively Chromium-only: 64.22% overall,
Chrome 78.61, **Firefox 0.07, Safari 0.11** (web3dsurvey, MEASURED). So on the
tier this project would actually ship, **GPU time is measurable in Chrome and
not measurable in Safari or Firefox.** A page must therefore report *whether it
could measure*, and never let "no timer" collapse into "0 ms" — CLAUDE.md:
*"a blank cell collapses 'we did not look' and 'we looked and it was fine'."*

---

## 3. The Raspberry Pi 4B — MEASURED, on the board, today

Board: `positron@192.168.1.213`, **Raspberry Pi 4 Model B Rev 1.5**, revision
`b03115`. All of the following was taken **with `positron-board` running** —
jackd, jack-dssi-host/hexter, scsynth/Pappus, sclang and ffmpeg all live — and
the service was never stopped. Contention is reported rather than removed,
because it is itself the answer to the user's question.

Commands are given for every number.

### 3.1 What is on it

| | | command |
|---|---|---|
| OS | Debian 13 trixie, kernel **6.18.34+rpt-rpi-v8** aarch64 | `uname -a`, `/etc/os-release` |
| RAM | **1847 MB** total, 520 used, 1326 available, 65 MB swap in use | `free -m` |
| firmware | `288930ab` (start), built May 21 2026 | `vcgencmd version` |
| memory split | `arm=948M` / `gpu=76M` — the **legacy** split; under full KMS the GPU allocates from CMA instead | `vcgencmd get_mem arm`, `… gpu` |
| **CMA** | **CmaTotal 512 MB, CmaFree 45 MB** | `grep -i cma /proc/meminfo` |
| KMS | `dtoverlay=vc4-kms-v3d`, `max_framebuffers=2`, `disable_fw_kms_setup=1` | `/boot/firmware/config.txt` |
| drivers | `v3d` and `vc4` both loaded; `[drm] Initialized v3d 1.0.0 for fec00000.v3d` | `lsmod`, `dmesg` |
| device nodes | `/dev/dri/card0`, `card1`, **`renderD128`** | `ls -l /dev/dri/` |
| display | **none.** `card1-HDMI-A-1` and `-2` both `disconnected`; no `DISPLAY`, no `WAYLAND_DISPLAY` | `cat /sys/class/drm/*/status` |
| Mesa | **26.2.1-2~bpo13+0~rpt1**, `v3d_dri.so` present | `dpkg -l` |
| GPU clock | **500 MHz** (`frequency(46)=500000992`) | `vcgencmd measure_clock v3d` |
| temperature, idle | 48.2 °C, `throttled=0x0` | `vcgencmd measure_temp`, `get_throttled` |

⚠️ **`gpu=76M` is a red herring on this board and would mislead a planner.** The
firmware split governs the legacy VideoCore firmware stack. With
`dtoverlay=vc4-kms-v3d` the V3D allocates through CMA, and CMA is **512 MB** —
which is the number that actually bounds how many render targets fit. 45 MB of
it was free at the time of measurement, with the instruments loaded.

### 3.2 It renders offscreen with no display — this is the key enabling fact

EGL's surfaceless and GBM platforms are both present, and the GBM platform on
`/dev/dri/renderD128` initialises against the **real** driver:

    $ eglinfo -B
    GBM platform:
      EGL vendor string: Mesa Project      EGL driver name: v3d
      OpenGL ES profile renderer: V3D 4.2.14.0
      OpenGL ES profile version: OpenGL ES 3.1 Mesa 26.2.1-2~bpo13+0~rpt1
      OpenGL ES profile shading language version: OpenGL ES GLSL ES 3.10
    Wayland platform: eglinfo: eglInitialize failed
    X11 platform:     eglinfo: eglInitialize failed
    Surfaceless platform: … V3D 4.2.14.0 … OpenGL ES 3.1

MEASURED. The relevant EGL extensions are `EGL_MESA_platform_surfaceless`,
`EGL_KHR_platform_gbm`, `EGL_KHR_surfaceless_context` and
`EGL_KHR_no_config_context` — which together mean a context with **no surface,
no config and no display**, rendering into a framebuffer object. That is the
whole headless path and it is four lines of setup.

⚠️ **The DRM/KMS path does NOT work headless, and the difference matters.**

    $ glmark2-es2-drm --off-screen
    Error: Failed to find a suitable connector
    Error: main: Could not initialize canvas

MEASURED. `glmark2`'s DRM backend wants a connected connector even in its
off-screen mode, and both HDMI ports are unplugged. **Anything that goes through
KMS needs a display or a dummy; anything that goes through the render node does
not.** Use `renderD128`.

⚠️ **And there is a software rasteriser sitting right next to the real one.**
`eglinfo` also enumerates an EGL device backed by **llvmpipe, reporting OpenGL
ES 3.2** — a *higher* version than the real GPU's 3.1. A capability check that
picks the highest ES version, or that takes whatever `EGL_DEFAULT_DISPLAY`
hands it, will silently select the CPU. §3.5 measures what that costs. **Always
print `GL_RENDERER` beside any number taken on this board.**

### 3.3 GLES 3.1 means compute shaders — and they run

    $ ./v3dcompute 262144 3
    RENDERER V3D 4.2.14.0 / OpenGL ES 3.1 Mesa 26.2.1-2~bpo13+0~rpt1
    compute shader compiled and linked OK
    262144 particles: 183.3 dispatches/s  5.46 ms each  48.0 M particle-steps/s
    state after run (must differ from init 0.5/0/0): p[0]=-9.7372,14.8434 …

MEASURED. A 64-wide workgroup compute shader integrating a particle field
through an SSBO, with the result mapped back and printed **to prove it ran** —
a dispatch that silently does nothing looks identical to one that works, which
is this repo's `src 1` lesson in a different medium.

| | |
|---|---|
| `GL_MAX_COMPUTE_SHARED_MEMORY_SIZE` | **32,768 bytes** |
| `GL_MAX_COMPUTE_WORK_GROUP_COUNT[0]` | 65,535 |
| `GL_MAX_COMPUTE_WORK_GROUP_INVOCATIONS` | **256** |
| `GL_MAX_SHADER_STORAGE_BUFFER_BINDINGS` | 32 |
| `GL_MAX_TEXTURE_SIZE` | **4,096** |

Throughput is flat across sizes, so it is ALU-bound rather than dispatch-bound:
**48.0 M** particle-steps/s at 262,144; **44.4 M** at 65,536; **39.3 M** at
16,384.

🔴 **The trap: compute exists through GLES and NOT through desktop GL, on the
same chip.** MEASURED — the V3D's desktop-GL core profile caps at **GL 3.1 /
GLSL 1.40** and its extension list does **not** contain `GL_ARB_compute_shader`
(`eglinfo`, GBM platform, core-profile section: zero matches). The GLES profile
on the identical context reports **ES 3.1 / GLSL ES 3.10**, where compute is
*core*. DOCUMENTED corroboration: mesamatrix has `GL_ARB_compute_shader` as
"not started" for v3d on the desktop-GL table, while Mesa 19.3.0's release notes
say *"V3d: Add Compute Shader support"* and *"v3d: Explicitly expose OpenGL ES
Shading Language 3.1"* ([relnotes](https://docs.mesa3d.org/relnotes/19.3.0.html),
Dec 2019), and compute was the blocker Igalia cleared to reach GLES 3.1
conformance ([Igalia, 2020-01-17](https://blogs.igalia.com/itoral/2020/01/17/raspberry-pi-4-v3d-driver-gets-opengl-es-3-1-conformance/)).
Khronos lists the Pi 4B as conformant for **OpenGL ES 3.1** (submissions 881/882,
2020-01-03/04) and **no Raspberry Pi has an ES 3.2 entry**. **So: bind
`EGL_OPENGL_ES_API` and ask for a 3.1 context. A desktop-GL context on this
board silently has no compute** — and "the extension is missing" would read as
"the hardware cannot", which is false.

⚠️ **And do not budget from the 32 GFLOPS figure.** It has no vendor source —
Mesa states plainly that *"Broadcom never released a public specification for
the V3D 3.x or 4.x series"* ([docs.mesa3d.org](https://docs.mesa3d.org/drivers/v3d.html)),
and the Pi 4 product brief, the BCM2711 datasheet and the whole documentation
repo contain zero hits for "GFLOP" or "fill rate". 32 is community arithmetic
(500 MHz × 2 slices × 4 QPU × 4 lanes × 2 ops). The only MEASURED figure is
Idein's own hand-tuned sgemm at **3.878 Gflop/s — about 12% of that peak**
([py-videocore6](https://github.com/Idein/py-videocore6)). **Budget from ~3.9,
not 32.**

**Vulkan is there too.** MEASURED, `vulkaninfo --summary`:

    GPU0: deviceName = V3D 4.2.14.0    driverName = V3DV Mesa
          apiVersion = 1.3.354         conformanceVersion = 1.3.8.3
          driverID   = DRIVER_ID_MESA_V3DV
    GPU1: deviceName = llvmpipe (LLVM 19.1.7, 128 bits)   deviceType = CPU

DOCUMENTED corroboration: Khronos lists **Raspberry Pi 4 Model B, Vulkan 1.3,
submission 784, 2024-07-24, CTS 1.3.8.3** — which is byte-for-byte the
`conformanceVersion` the board reports above. ⚠️ **Raspberry Pi's own
specification page still says "Vulkan 1.0"** and the BCM2711 page still says
"OpenGL ES 3.0"; both are three versions stale. Use Khronos' list and
mesamatrix, not the product pages.

So a native WebGPU implementation has a conformant Vulkan 1.3 target on this
board *in principle*. §3.5 measures what happens in practice, and the answer is
not the one the ICD file suggests.

### 3.4 Rendering: what it actually delivers

⚠️ **Read all of these as the `performance`-governor figures** — they were taken
on a machine that was being actively driven, which the paragraph below the
tables shows is the same thing. The `ondemand` floor is 6–13% lower and less
repeatable.

`v3dbench` renders a full-screen triangle into an RGBA8 FBO with a `glFinish`
per frame, three seconds per case. The shader is a real generative
post-processing pass — 8-segment kaleidoscope fold, three octaves of value
noise, a domain-warp displacement, a feedback tap from the previous frame —
chosen because it is the thing the user asked about rather than a synthetic
fill.

**1280 × 720:**

| case | fps | ms/frame | Mpix/s |
|---|---:|---:|---:|
| flat colour, 1 pass (the fill ceiling) | **497.6** | 2.01 | 458.6 |
| kaleido + warp + feedback, 1 pass | **54.6** | 18.31 | 50.3 |
| kaleido + 3 blur passes (ping-pong) | **28.2** | 35.47 | 103.9 |
| 1 pass + `glReadPixels` RGBA8 | 38.6 | 25.90 | 142.3 MB/s out |

**640 × 480:**

| case | fps | ms/frame | Mpix/s |
|---|---:|---:|---:|
| flat colour, 1 pass | **1286.2** | 0.78 | 395.1 |
| kaleido + warp + feedback | **159.2** | 6.28 | 48.9 |
| kaleido + 3 blur passes | **80.0** | 12.50 | 98.3 |
| 1 pass + `glReadPixels` | 111.0 | 9.01 | 136.4 MB/s out |

All MEASURED. **There is nothing to check these against**: no public Broadcom
V3D 4.x specification exists, no vendor fill-rate or texel-rate figure exists,
and the only number anywhere is a Raspberry Pi engineer's hedged recollection on
the forums — *"the VC6 on the 2711 can hit 2.4GPixels/s. IIRC"*
([forum 244519](https://forums.raspberrypi.com/viewtopic.php?t=244519),
2019-07-08, UNCONFIRMED). The 458.6 Mpix/s measured above is a *shader* fill
through an FBO with a `glFinish`, which is a different and stricter quantity
than a raw fill rate, so the two are not comparable and should not be put in one
sentence.

Three things follow and each changes a design decision:

**1. It is ALU-bound, not fill-bound.** The generative shader holds ~50 Mpix/s at
*both* resolutions while the flat shader does ~400–460 Mpix/s. The GPU is not
running out of pixels; it is running out of arithmetic. **So the lever is shader
complexity, not resolution** — halving the resolution buys 2.9x, but simplifying
the shader buys proportionally more, and a 720p budget exists if the shader is
kept near this one's weight.

**2. Extra passes are cheap relative to the first one.** Three 3×3 blur passes
on top of the generative pass took 35.47 ms against 18.31 — the blurs cost
~5.7 ms each at 720p while the generative pass costs 18.3. Multi-pass
post-processing is affordable here; **expensive per-pixel maths is not.**

**3. Reading pixels back is fast.** Isolating it: 25.90 − 18.31 = **7.59 ms**
for 3,686,400 bytes = **486 MB/s**. On a tiler that is a good number, and it is
what makes the box-encodes-and-streams path viable at all.

⚠️ **The CPU governor matters, and getting this right took two attempts — the
first A/B was contaminated and I am recording the mistake because it is the
repo's own lesson happening in this document.** A widely-cited forum result has
glmark2-es2 off-screen going **168 → 256** on a Pi 4 by switching from
`ondemand` to `performance` (+52%), so it was worth checking. My first
comparison ran the two arms minutes apart on a machine I had just been driving
over ssh, and reported "no effect on the single-pass case". **That was wrong.**
`ondemand` had still been boosted from the previous command when the `ondemand`
arm ran, so both arms were effectively `performance`. Re-run back-to-back on a
quiet machine, three runs per arm:

| case | `ondemand` | `performance` | gain |
|---|---:|---:|---:|
| kaleido + feedback, 1 pass | 51.8 · 51.8 · 51.9 | **54.8 · 55.1 · 55.0** | **+6%** |
| kaleido + 3 blur passes | 23.9 · 23.8 · **25.6** | **28.3 · 28.3 · 28.4** | **+13%** |

MEASURED; the governor was restored to `ondemand` afterwards and read back.

**Two findings, and the second is worth more than the first.**

1. `performance` is worth 6% on one pass and 13% on four — smaller than
   glmark2's 52%, because glmark2 runs many small scenes with heavy per-scene
   CPU setup while this is one draw call, but not nothing.
2. 🔴 **`ondemand` makes the measurement non-repeatable.** Look at the bolded
   25.6 — one run in three landed 7% high, because the governor happened to be
   ramping (the ARM clock read 1500 MHz in that sample against 1800 in the
   others). Under `performance` every run agrees to ±0.1 fps. **A GPU-bound
   workload does not look busy to a CPU governor**, so the clock it gets depends
   on what ran just before it — which is exactly how the first A/B went wrong.

**So: set `performance` on any board doing visuals, and set it before taking any
number.** Not primarily for the 6–13%, but because without it two runs of the
same thing disagree by more than most effects worth measuring.

⚠️ And one instrument note: `vcgencmd measure_clock arm` read **after** a run
does not tell you what the clock was **during** it. It reported 1800 MHz on runs
that had clearly been slower. A sampled clock is not a history.

### 3.5 What can drive it from node — and the trap in the obvious answer

| candidate | result | evidence |
|---|---|---|
| **EGL + GBM + GLES 3.1 from C** | **works, hardware, headless** | every number in §3.3–3.4 |
| `headless-gl` (`gl@8.1.6`, npm-modified 2026-04-10) | **does not build** | MEASURED: node-gyp fails — `Package 'xi', required by 'virtual:world', not found`; `pkg-config --libs x11 xi xext` exit 1 in `angle/src/angle.gyp`. It bundles ANGLE and wants X11 even to configure |
| `@kmamal/gl` 9.1.0 | UNCONFIRMED — not tested; last published 2025-02-26, so 18 months stale | `npm view` |
| **`webgpu@0.6.0`** (node-webgpu, Dawn) | **installs, then picks the WRONG GPU, then crashes** — see below | MEASURED |
| `node-webgpu` on npm | **unpublished 2025-01-06** | `npm view` → 404 |
| `canvas` 3.2.3 / `skia-canvas` 3.0.8 | exist for arm64; **CPU only** — no path to the V3D | DOCUMENTED (they are CPU rasterisers) |
| headless Chromium | **not installed**; would be **190 MB across 71 packages** | MEASURED: `apt-get --print-uris install chromium`, candidate `1:152.0.7977.82-1~deb13u1+rpt1` |

🔴 **The `webgpu` npm package is a trap, and it is exactly the trap CLAUDE.md
warns about.** It installs from prebuilts on arm64 in seven seconds and answers
`requestAdapter()` with a working device — so "WebGPU works on the Pi" is a
sentence someone could write in good faith. MEASURED, it does not:

    Warning: Vulkan shaderUniform*ArrayDynamicIndexing required.
     - While initializing adapter (backend=BackendType::Vulkan)
    using GPU adapter: llvmpipe (LLVM 19.1.7, 128 bits)
    adapter.info: {"vendor":"mesa","architecture":"software",
                   "description":"llvmpipe: Mesa 26.2.1 (LLVM 19.1.7)"}

Dawn's Vulkan backend **rejects V3DV** because the driver does not expose
`shaderUniformBufferArrayDynamicIndexing`, and falls through to the CPU
rasteriser without saying anything louder than a warning. The adapter reports
`architecture: "software"` — which is the one field that tells the truth, and is
the field nobody reads.

The A/B, same algorithm, same particle count (16,384), same board:

| | throughput | its own CPU |
|---|---:|---:|
| V3D, GLES 3.1 compute | **39.3 M** particle-steps/s | 0.44 s over 3.13 s = **14% of one core** |
| llvmpipe, WGSL via node `webgpu` | **18.1 M** particle-steps/s | 7.29 s over 3.35 s = **218% of one core** |

MEASURED. **2.2x slower and 16x the CPU** — and the CPU is the resource the
synths need. And it is not even stable: at 65,536 particles it died with

    Fatal glibc error: pthread_mutex_lock.c:94 (___pthread_mutex_lock):
    assertion failed: mutex->__data.__owner == 0

reproducibly, while 16,384 ran twice without incident.

**Conclusion for the board: the node-native WebGPU path is not available today.**
The working path is a small C program on EGL/GBM/GLES 3.1 that node spawns and
reads pixels from over a pipe — which is *precisely* the shape `fluid.mjs`
already uses for FluidSynth, and for the same reason. `rig/board` is a node
service that drives ordinary Linux tools; a renderer is one more tool.

### 3.6 The whole chain, sustained — and the verdict

`v3dpipe` renders the generative shader headless, reads the pixels back, and
writes raw RGBA to stdout. Piped into `ffmpeg -c:v h264_v4l2m2m`, which is the
board's **hardware** encoder (`/dev/video11`, `bcm2835-codec-encode`, ffmpeg
7.1.5).

    $ ./v3dpipe 1280 720 900 1 | ffmpeg -f rawvideo -pix_fmt rgba -s 1280x720 \
        -r 30 -i - -pix_fmt yuv420p -c:v h264_v4l2m2m -b:v 2M -y /tmp/sust.h264

    renderer V3D 4.2.14.0  1280x720  1 passes  900 frames
    900 frames in 30.40s = 29.6 fps | render 19.76 ms  readback 8.21 ms
                                      write 5.81 ms per frame
    own CPU 10.63s = 35% of one core (9% of 400%)  maxRSS 79220 kB

MEASURED, 30 seconds, **alongside the live instruments**. During the run:

| | |
|---|---|
| whole-machine CPU | **18.6% user + 14.0% sys of 400%** — i.e. under one of four cores for renderer *and* encoder |
| renderer RSS | **79 MB** |
| temperature | 50.1 °C → 55.0 °C |
| throttling | `throttled=0x0` — none |
| **audio xruns during the run** | **0** (`journalctl -u positron-board`, 3-minute window) |

640×480 the same way: **75.0 fps** (render 7.13 ms, readback 2.73, write 3.47).

#### Three things to know about that encoder before depending on it

**1. 1080p30 is its documented ceiling, and 720p30 is comfortably inside it.**
*"H.264 (1080p60 decode, **1080p30 encode**)"* —
[Pi 4 product brief](https://datasheets.raspberrypi.com/rpi4/raspberry-pi-4-product-brief.pdf),
April 2026, DOCUMENTED. ⚠️ The reason it is 30 and not 60 is a *level* default,
not a hardware wall: 6by9 (Raspberry Pi engineer, 2024-08-27) traced "1080p60
hangs" to ffmpeg not passing an H.264 level, so it defaulted to 4.0 where 1080p60
needs 4.2 — *"We do not guarantee the hardware can encode >level 4 in
real-time"* ([forum 375704](https://forums.raspberrypi.com/viewtopic.php?t=375704)).
DOCUMENTED. **If an encode ever "hangs", look at the level before the driver.**

**2. 🔴 It is gone on a Pi 5, and this is the strongest argument in this document
for keeping the board a Pi 4.** *"The 2712 does NOT have a H264 HW block for
encoding or decoding"* — jamesh, Raspberry Pi engineer; and RPi's own docs:
*"**Raspberry Pi 5 uses software video encoders.** These generally output frames
with a longer latency than the old hardware encoders, and this can sometimes be
an issue for real-time streaming applications."* DOCUMENTED
([forum 357870](https://forums.raspberrypi.com/viewtopic.php?t=357870), 2023-10-17).
`plan-hardware` §4 says "build first: a Raspberry Pi 5". **For visuals that is
the wrong board**, and the reason is one removed silicon block. On a Pi 5 the
§3.6 chain becomes libx264 at the measured 57 fps single-threaded — which still
clears 30 fps, but now costs **a whole core** instead of 9% of the machine.

**3. ⚠️ A known open upstream defect did NOT reproduce here — checked, because
it would have been fatal.** `h264_v4l2m2m` is
[reported since 2024-07-31](https://github.com/raspberrypi/bookworm-feedback/issues/285)
to be unusable for live streaming *"since it doesn't include SPS/PPS headers
inline"*, so a client joining mid-stream cannot decode; the fix PR is still open.
That would have killed §5.5 outright. MEASURED on this board's stack (ffmpeg
**7.1.5-0+deb13u1+rpt2**, kernel 6.18.34), counting NAL unit types in 150 frames
at `-g 30`:

| encoder | SPS (7) | PPS (8) | IDR (5) | pattern |
|---|---:|---:|---:|---|
| `h264_v4l2m2m` | **150** | **150** | 5 | `7,8,5, 7,8,1, 7,8,1, …` — **parameter sets before every frame** |
| `libx264` | 5 | 5 | 5 | `7,8,6,5,1,1,…` — once per keyframe |

**The hardware encoder emits SPS and PPS ahead of every single frame**, which is
more than inline headers and exactly what a lossy fan-out wants. The defect is
either fixed in this stack or was never present in it. ⚠️ A joiner still waits
for the next **IDR** — 5 in 150 frames at `-g 30`, so up to one second — and that
is a GOP choice, not a bug.

**And CPU contention barely touches it**, which is the finding that settles the
headroom question. Same render, with 1 and then 2 cores fully occupied by busy
loops:

| busy cores | fps at 720p |
|---|---:|
| 0 | 38.3 |
| 1 | 38.1 |
| 2 | **37.6** |

MEASURED. A 2% loss for half the machine taken away, because the work is on the
GPU and the CPU is only feeding it. HANDOFF's measured audio load — **Pappus +
hexter together at 57.6% of 400%** — is less than one of those busy cores.

#### The verdict, with numbers

> **Yes. The board has enough headroom to do something visually worth doing, and
> the synths do not have to be stopped for it.**
>
> **Sustainable today: a single-pass generative post-processing shader at
> 1280×720, 30 fps, encoded in hardware, for about 33% of one of four cores and
> 79 MB — with zero audio dropouts measured over 30 seconds against the running
> instruments.** Add the instruments' own measured 57.6% of 400% and the total
> is **ESTIMATED ~90% of 400%**, which is comfortable. (ESTIMATED because the
> two were measured separately; the instruments were loaded but not sounding
> during the render test. §5.1 says how to close that.)
>
> Also sustainable: **640×480 at 75 fps**, or **720p with three extra blur
> passes at 28 fps**, or a 262,144-particle GPU compute field at 183 Hz.
>
> Not sustainable: anything that puts the picture on the CPU. The software
> rasteriser costs 218% of one core to run half the work.

#### And the relay already carries it

The question "but how do the pixels get out" has an answer that needed no new
tier. MEASURED today, Pi → `ws.positron.studio` → laptop, sending
GOP-shaped binary frames (one keyframe per 2 s at 6x the mean, the rest below)
at 30 a second, with a **sequence number written into the payload** because a
binary frame carries no envelope:

| offered | bytes/s | sent | received | gaps | loss |
|---:|---:|---:|---:|---:|---|
| 2 Mbit/s | 252 kB/s | 452 | 452 | 0 | **none, byte-identical** |
| 4 Mbit/s | 504 kB/s | 451 | 451 | 0 | **none, byte-identical** |
| 5 Mbit/s | 635 kB/s | 361 | 361 | 0 | **none** |
| **8 Mbit/s** | 1017 kB/s | 361 | **260** | **96** | **101 frames — 28% — silently** |

**The guard fires, and only the in-payload counter can see it.** At 8 Mbit/s the
relay dropped 28% of the stream with no error, no close and no backpressure —
which is the behaviour `wire.mjs`'s own comment predicts and the reason `seq`
exists. Note that 5 Mbit/s passed cleanly despite exceeding the nominal
512 KiB/s (524 kB/s), so there is burst headroom above the stated cap; **do not
design to 5, design to 4 and measure.**

At 2 Mbit/s this is 48% of one socket's byte budget and 50% of its message
budget, and **fan-out to the other fifteen sockets in the room is unmetered** —
so the board can broadcast a 720p30 picture to a small room over the
infrastructure that already exists, with no Stream minutes billed.

### 3.7 What was installed on the board, exactly

Reported per the brief. All from Debian 13 main, all small, nothing was removed,
nothing under `/opt/positron-board` was touched, and `positron-board` was never
stopped:

    mesa-utils mesa-utils-bin libgles2 libgles1 libgles-dev libegl-dev
    libgbm-dev libgl-dev libglx-dev glmark2-es2-drm glmark2-data
    vulkan-tools libx11-dev libxau-dev libxcb1-dev libxdmcp-dev
    x11proto-dev xorg-sgml-doctools xtrans-dev

Total installed size ≈ **19 MB**, of which `glmark2-data` is 9.3 MB. The X11
`-dev` packages arrived as dependencies of `libgl-dev`; they are headers only
and no X server was installed.

Left in `/tmp` (tmpfs, cleared on reboot): `v3dbench`, `v3dcompute`, `v3dpipe`
and their `.c` sources — the measurement rig, so any number above can be
re-taken in ten seconds. The npm test tree and all encoded output were deleted.

**One system setting was changed and changed back, twice**, disclosed because it
is machine-wide: the CPU governor was switched `ondemand` → `performance` for
the §3.4 benchmarks and restored to `ondemand` each time, verified by reading it
back. **The board is currently on `ondemand`, which is where it started** — and
§3.4 argues it should be changed to `performance` deliberately, by whoever owns
the board, rather than as a side effect of a measurement run.

**Not installed, and a proposal rather than a done thing:** Chromium — 190 MB
across 71 packages, candidate `1:152.0.7977.82`. §5.4 says when that question
becomes worth answering. ⚠️ Note that installing it would **not** deliver
WebGPU: a Pi on Chromium 144 reports `chrome://gpu` → *"WebGPU: Disabled,
Vulkan: Disabled, WebGL: Hardware accelerated"*
([RPi forum 396128](https://forums.raspberrypi.com/viewtopic.php?t=396128),
2026-02-09, answered by an RPi engineer). A browser on the board buys WebGL2 and
a 190 MB dependency; the EGL/GLES path in §3.2 buys the same GPU with a 73 KB
binary.

---

## 4. Pairing with the sound

The repo has three candidate signals and they are not interchangeable. The rule
that decides between them is CLAUDE.md's: **a count is only evidence on the far
side of the boundary**, and **measure the quantity in question**.

### 4.1 The three signals, and their latencies

| signal | where it exists | latency to the viewer | what it can say |
|---|---|---|---|
| **note / control events** (`note.on`, `params.rolled`) | already on the wire | **1–2 ms** DO hop + network | *what was asked for* |
| **the PCM itself** (48 kHz, 960-sample frames, 50 msg/s) | already on the wire | ~98.7 ms note-to-ear MEASURED, of which **60 ms is the deliberate playout cushion** in `listen.html` | *what came out* |
| **analysis of the PCM** (FFT bands, RMS, onsets) | computed wherever the PCM is | audio latency **+ the analysis window** | *what it sounded like* |

### 4.2 Which is right, and when

**Drive structure from the events. Drive texture from the analysis. Never
confuse the two.**

- **Events are the right signal for anything that must be in time**: a flash on
  a note, a scene change on a roll of Pappus' die, a colour that follows the
  chosen instrument. They arrive ~97 ms *before the sound they caused*, because
  the audio path carries a 60 ms playout cushion plus encode, transit and
  buffering. ⚠️ **That is not an advantage — it is a bug waiting to be filed as
  "the visuals are early".** A visual driven by an event must be **delayed to
  match the audio**, and the delay is not a guess: it is the same cushion the
  page already sets (`playout.port.postMessage({ cmd: 'floor', ms: 60 })`) plus
  the measured transit. Read it from the same constant the page hands the
  worklet, per CLAUDE.md — *"a description that can disagree with the config is
  worse than none."*

- **Analysis is the right signal for anything that must look like the sound**:
  a spectrum, a level, a bloom that swells with energy. And it should be
  computed **in the browser, from the audio the browser is actually playing**,
  because that is the only place where the picture and the sound are on one
  clock. An analysis computed on the box and sent as numbers would arrive on the
  *event* timeline while describing the *audio* timeline — two different clocks,
  no way to align them, and it would look right on a LAN and wrong over the
  internet.

⚠️ **This is a case where an A/B would report "identical" while both arms are
wrong.** Comparing two visual-reaction strategies on a laptop next to the board
puts every latency near zero; the difference only appears over the internet,
where the 98.7 ms exists. **Measure it over the relay from another network, or
do not claim it.**

⚠️ **And "reacting to the events that caused the sound" is a different
measurement from "reacting to the sound".** The first is on the near side of the
audio boundary and can be perfect while the sound is silent — which is exactly
`createMidiLane`'s `scheduled()` failure, where a count of what the page queued
read identically to delivery while every note was fifty-six years out. **A
visual that fires on `note.on` proves a message arrived, not that anything was
heard.** If a demo claims "the picture follows the sound", it has to show a
number derived from the *samples*, on the far side.

### 4.3 What this means in practice

1. **`note.on` and `params.rolled` already flow.** A visual page joins the room
   as an ordinary client (`openWire`), reads the same messages `listen.html`
   reads, and needs no new protocol. The box does not have to change.
2. **The PCM already flows**, and a page that is already playing it has an
   `AudioContext`. An `AnalyserNode` on the same graph costs nothing and is on
   the right clock.
3. **The seed is the bridge.** `params.rolled` carries a seed (`mulberry32`).
   The same seed can drive the visual parameters, which means **the picture and
   the sound are literally the same roll of the same die** — reproducible,
   auditable, and free.

---

## 5. The plan

### 5.1 ⚠️ The rig comes first, and here is why it must

This project's most expensive recurring failure is a green suite over a path the
suite cannot reach. It has happened with iPhone HLS (261/261 while a demo was
fatally broken), with `canPlayType` (291 asserts green across three pages that
had never played a frame), and with `moq.mjs`'s 404 (two demos asserting
nothing). **Visuals will reproduce it exactly unless the rig is built first**,
and the proof is already in hand.

🔴 **MEASURED TODAY: `demo/verify.mjs` cannot see a GPU.** It launches Chrome
with `--disable-gpu` (line 39). Under that flag, on this machine:

    verify.mjs's actual flags:  webgl2 = false,  error = "no webgl2"

`canvas.getContext('webgl2')` returns **null**. Not slow — absent. A visual demo
verified by today's harness would take whatever branch its `if (!gl)` leads to,
and per CLAUDE.md's own warning a page whose first assert sits behind that would
report *"asserted nothing"*, which reads as broken, or would assert its fallback
and read as fine.

🔴 **And the obvious fix is worse than the bug.** Adding
`--enable-unsafe-swiftshader` makes it green:

| Chrome flags | renderer | fps @720p | Mpix/s |
|---|---|---:|---:|
| `--disable-gpu` (today) | — | — | **no context** |
| `--disable-gpu --enable-unsafe-swiftshader` | SwiftShader (CPU) | 185.2 | **170.7** |
| `--use-gl=swiftshader` | SwiftShader (CPU) | 185.9 | 171.3 |
| GPU allowed | ANGLE Metal, Apple M2 Pro | **1510.5** | **1392.1** |
| GPU allowed, 4 passes | ANGLE Metal, M2 Pro | 946.0 | 3487.3 |
| GPU allowed, 640×480 | ANGLE Metal, M2 Pro | 2121.9 | 651.8 |

All MEASURED, same shader, same page. Read the middle rows against §3.4: **the
CPU rasteriser on a laptop is 3.4x FASTER than the real Raspberry Pi GPU**
(170.7 against 50.3 Mpix/s) and **8.2x slower than the real laptop GPU**. So a
harness "fixed" with SwiftShader would print plausible numbers about a machine
that does not exist, pass a page that would crawl on a phone, and fail a page
that would fly on a laptop.

🔴 **A golden-image assert cannot be portable either.** Same shader, same fixed
inputs (`uT = 1.234`, feedback source cleared), one deterministic 720p frame,
summing the red channel over all 921,600 pixels:

| backend | red-channel sum | FNV hash | first pixel |
|---|---:|---|---|
| ANGLE Metal (M2 Pro) | 48,147,330 | `12bf7829` | `[1, 63, 80]` |
| SwiftShader (CPU) | 68,001,881 | `acd62166` | `[47, 7, 92]` |

MEASURED. A **41% difference in mean red** from identical source and identical
inputs, because `fract(sin(dot(p, k)) * 43758.5453)` — the standard GLSL hash —
amplifies last-bit float differences into unrelated noise. **So "the picture is
correct" cannot be asserted by comparing pixels across machines.** It has to be
asserted structurally, and §5.2 says how.

#### What the rig must therefore be

1. **`demo/verify-gl.mjs`** — Chrome **without** `--disable-gpu`, which asserts
   `UNMASKED_RENDERER_WEBGL` is **not** SwiftShader before it asserts anything
   else, and **fails the run** if it is. Print the renderer in the report.
   Without that first assert every number below it is unattributable, which is
   the same rule as the `BUILD` stamp.
2. **The page itself reports its renderer**, in the readout, always. A visitor
   on a software rasteriser is a real visitor and the page should say so rather
   than quietly being slow.
3. **`rig/board/gl-test.mjs`** on the board — the C bench above, run over ssh,
   asserting `GL_RENDERER` is `V3D` and not `llvmpipe`, and that the fps holds
   above a stated floor. Same trap, different machine.
4. **⚠️ Measure the sound while the picture renders.** The §3.6 numbers were
   taken with the instruments loaded but not sounding. The honest version plays
   notes for the duration and counts xruns on the far side — `journalctl`, not
   the renderer's own opinion.
5. **Force the frame to finish before timing it.** WebGL has no blocking
   `glFinish`; a one-pixel `readPixels` is what actually makes the GPU complete
   the work. Without it the loop times command *submission* and prints a
   fantasy — which is why `glbench.html` does it and says so in a comment.
6. **Say which instrument produced the GPU number, and its granularity.** Per
   §2.6: `timestamp-query` is unflagged and 98.76% available but quantised to
   **65.5 µs**, so a cheap pass reads 0 or 65.5 and nothing between;
   `EXT_disjoint_timer_query_webgl2` is raw nanoseconds but **Chromium-only**
   (Firefox 0.07%, Safari 0.11%). On Safari and Firefox there is **no** way to
   measure GPU time from a page, and the readout must say *"cannot measure
   here"* rather than showing a zero.

#### What these measurements could NOT detect

Stated explicitly, because the brief asks and because this is where this project
has been burned:

- **A correct frame rate over a wrong picture.** fps says a frame finished, not
  that anything is in it. The counter-measure is a structural assert (§5.2), and
  even that cannot tell "beautiful" from "not".
- **A frame rate measured in headless Chrome says nothing about a phone.**
  Different GPU, different thermals, and a phone throttles after 90 seconds
  where a 3-second bench never will. **A 3-second benchmark cannot detect
  thermal throttling, on any device.** If sustained performance matters, the
  measurement has to be minutes.
- **`requestAnimationFrame` counts are on the wrong side of the boundary.** A
  page cannot see a frame the compositor dropped or reprojected. On a headset
  the far side exists and is free (`adb logcat -s VrApi`); in a browser it is
  `chrome://tracing` or nothing, and **"nothing" should be written down rather
  than papered over with a rAF count.**
- **The Pi numbers were taken at 48–55 °C in September.** `throttled=0x0` today
  is not `throttled=0x0` in a warm room in an enclosure.
- **Nothing here measured a real viewer.** Every browser number is one laptop.

### 5.2 Phase 1 — the smallest honest first step

**slug:** `mirror` · **act:** 0, the substrate

Chosen name because it is what the page does (a kaleidoscope is a mirror fold)
and because it carries no jargon.

**what** — one paragraph, the shell's only prose block:

> A picture is folded into eight mirrored wedges, pushed around by moving noise,
> and mixed with the frame before it, so it never quite settles. Nothing is
> streamed: the whole picture is made in this page from a handful of numbers and
> a starting value, which is why it costs a few hundred bytes rather than a few
> megabits. The page prints which graphics chip drew it — if that says software,
> the numbers below are about your processor and not your graphics, and they
> will be slow. Press the button and the same starting value builds the same
> picture again, exactly.

**readout:** `renderer` · `frames/s` · `worst frame` ms · `shader` ms ·
`bytes to describe it` · `same seed, same picture`

Every cell moves. `worst frame` rather than an average, per CLAUDE.md — the one
bad frame is the reason to look. `renderer` is not a constant across visitors
and is the most load-bearing cell on the page. `bytes to describe it` is the
serialised parameter document, which is the entire argument of §1 in one number.

**controls:** `roll` (a new seed) · `replay` (the same seed again) ·
`heavier` (add blur passes, so the reader can watch the cost move)

**`window.__demo` asserts** — count them and diff the count after any change:

1. a WebGL2 context exists *(this is the one that fails under today's harness)*
2. `UNMASKED_RENDERER_WEBGL` is readable and is reported in the readout
3. the shader compiled and linked — the log is captured if not
4. ≥ 60 frames were drawn, and a `readPixels` of one pixel proves the frame was
   **finished**, not merely submitted
5. the frame is **not blank** — a non-trivial spread of values across a sampled
   grid. *(A page that renders black is indistinguishable from a page that
   renders nothing, which is `live-test.mjs`'s rms lesson in pixels.)*
6. the feedback loop is **live** — frame N and frame N+1 differ, so the
   ping-pong is actually ping-ponging
7. **the same seed gives the same picture on this machine** — roll, hash, replay
   the seed, hash again, assert equal. ⚠️ *On this machine only.* §5.1 measured
   that the hash is not portable across backends, so this asserts determinism,
   never correctness.
8. a different seed gives a **different** picture — otherwise assert 7 passes
   vacuously on a page that ignores its seed
9. the parameter document round-trips: serialise, parse, re-render, same hash
10. `worst frame` is under a ceiling **printed from the same constant the page
    uses**, never typed twice
11. **the guard fires**: one deliberately invalid parameter document per run is
    **refused**, and the picture does not change across it

Eleven asserts, of which 1 and 2 are unreachable by `demo/verify.mjs` today.
That is the point and the page should say so on its own face until
`verify-gl.mjs` exists.

**How a harness sees it:** exactly as every other page — `window.__demo.asserts`
and `window.__demo.readout` over CDP. The only new thing is the Chrome flags.

**Why this first:** it generates nothing, streams nothing, and needs no board,
no headset and no model. It proves the substrate — that a picture can be a
document, that the document reproduces, that the guard says no, and that the
harness can see a GPU. Everything after it rests on those four.

### 5.3 Phase 2 — the sound drives it

**slug:** `pulse`. `mirror` plus the relay: join the room, take `note.on` and
`params.rolled`, and drive the picture from them — **delayed by the same cushion
`listen.html` uses**, read from one constant, so the picture lands with the
sound and not 97 ms ahead of it.

Adds, on top of `mirror`'s eleven:

- the relay socket opened and the page's own echo came back
- ≥ N events arrived and ≥ N visual changes followed, with **no `seq` gaps**
- the alignment is measured **and reported as a number**: the delta between a
  note's audible onset (from an `AnalyserNode` on the audio the page is actually
  playing — the far side) and the frame that responded to its event (the near
  side). ⚠️ **Both on one clock, in one page**, which is the only way the delta
  is exact rather than an estimate — the trick `moq.mjs` already uses in
  loopback and refuses to use in watch mode.
- the same seed drives both the sound and the picture, and the page says so

**What this could not detect:** whether it *looks* like it fits the music. That
is not measurable and the page should not pretend otherwise — the readout says
"picture lands 12 ms after the sound", not "in time".

### 5.4 Phase 3 — the branch, and it is a real decision

Only now is there enough evidence to choose, and the choice is **per visitor**,
not per project:

- **the page measures its own renderer for two seconds at load** (it already
  does, for `mirror`'s readout), and
- above a threshold it renders locally;
- below it, it asks for pixels.

That threshold is the open question, and §5.6 names the experiment.

The pixel source is then whichever of the four tiers fits: the relay at up to
4 Mbit/s for a small room with no Stream bill, MoQ at 26 ms when it must be in
time, WHEP at 67 ms with a p99 advantage, LL-HLS at 3.9 s for wallpaper.

### 5.5 Phase 4 — the board renders

`rig/board/visuals.mjs`: a node module that spawns the EGL/GBM renderer, reads
RGBA over a pipe, hands it to `h264_v4l2m2m`, and publishes the encoded frames
onto the relay as binary — **the same shape `fluid.mjs` already uses for
FluidSynth, and the same socket `audio.start` already uses for PCM.**

This is worth building *because* §3.6 measured it working, and worth building
*last* because §1 says it is the exception rather than the default. Its real
clients are the cases where the box has the state: the Pappus buffer drawn as an
image, an ERR archive clip post-processed on the board, a camera.

⚠️ **It must not share a socket with the audio.** 50 msg/s of PCM plus 30 msg/s
of video is 80 against a ceiling of 60, and the loss would be silent on both.

⚠️ **And it pins the board to a Pi 4.** §3.6 note 2: the Pi 5 has no H.264
hardware block at all. This is the one place in the repo where the newer board is
the worse one, and `plan-hardware` §4's "build first: a Raspberry Pi 5" should be
read with that exception written next to it.

### 5.6 Open decisions, and the experiment that settles each

| open | what settles it |
|---|---|
| **WebGPU or WebGL2 for the browser renderer?** | Ship `mirror` on WebGL2 and add a WebGPU backend behind a flag. The experiment is not "does WebGPU work" — it is *what fraction of real visitors get a hardware WebGPU adapter*, which only the deployed page can answer. Branch on `await navigator.gpu?.requestAdapter() !== null`, never on `'gpu' in navigator` (§2.1), and log `adapter.info.architecture` to `pub.positron.studio/logs` from the page itself. ⚠️ Baseline to beat: 82.47% of sessions overall, **17.09% on Linux** |
| **Could a Pi ever run WebGPU in a browser?** | Chrome's **compatibility mode** targets exactly this tier — `requestAdapter({ featureLevel: "compatibility" })` over **OpenGL ES 3.1**, shipped Chrome 146 (2026-03-10) — but **Android only**, with ChromeOS-on-GLES-3.1 "being explored" ([new-in-webgpu-146](https://developer.chrome.com/blog/new-in-webgpu-146), 2026-02-25). The Pi's GLES 3.1 + Vulkan 1.3 stack is technically in range and nobody has wired it up. Nothing to do but re-check in six months |
| **Where is the local/remote threshold?** | `mirror`'s two-second self-benchmark, logged with the renderer string, across every device anyone opens it on. The threshold is the fps below which the page looks bad, and that is a judgement made by looking — so collect the distribution first, do not guess a number |
| **Are generated shaders allowed to run?** | §1.2 seam 3. Not decided. The experiment is a validator plus a deliberate hostile shader per run (an unbounded loop, a 4096×4096 allocation) and a check that the page survives. Until that exists the answer is no |
| **Does the repo add a Content Security Policy?** | Only needed if generated **JavaScript** ever runs. A generated GLSL string does not need one. Deciding "shaders only" makes the CSP question disappear, which is an argument for deciding it |
| **Can the Pi 4's GLES 3.1 compute beat its fragment path for particles?** | Measured 48.0 M steps/s on compute; the fragment/transform-feedback equivalent is **not measured**. One afternoon with `v3dbench` extended |
| **Does `h264_v4l2m2m` hold up as a live stream, not a file?** | §3.6 wrote to a file. The Pi's V4L2 encoder is known for quirky rate control and no B-frames. The experiment is 10 minutes into the relay with a decoder on the far end counting frames and reporting `totalVideoFrames` |
| **What does a phone actually do?** | Nothing here measured one. `mirror` on a phone, for three minutes, watching for thermal decay — the one defect a 3-second bench cannot see |
| **Quest 3S** | Per the Quest report: WebGL2 + `OCULUS_multiview` is what ships; WebGPU inside an immersive session is behind a `chrome://flags` toggle the visitor must set. And ⚠️ `verify-quest.mjs` must exist before any of it is called green |

---

## 6. What would have to be true

For this plan to be right, all of these have to hold. Each is checkable and each
says who checks it.

1. **A harness can see a GPU.** Today it cannot — MEASURED, `--disable-gpu`
   returns a null WebGL2 context. `verify-gl.mjs` exists and refuses to run on
   SwiftShader. *Nothing visual is green before this.*
2. **A picture can be reproduced from a document.** `mirror` assert 7 and 9. If
   a seed does not reproduce a picture on one machine, the whole local-render
   argument collapses and everything becomes a pixel stream.
3. **The pixel hash is not portable and everybody knows it.** MEASURED: 41%
   difference in mean red between two backends on identical input. Any future
   golden-image check must be per-machine or it will fail for a reason that is
   not the page's.
4. **The guard has said no, in this run.** `mirror` assert 11. A validator that
   has never rejected anything is a claim.
5. **The board still makes sound while it draws.** MEASURED at zero xruns over
   30 s with the instruments loaded; **not yet measured with them sounding.**
   Until that run exists, §3.6's verdict is one step short.
6. **The two CPU figures add up.** 33% of 400% for the visual chain plus 57.6%
   for Pappus + hexter is ESTIMATED, not measured together. One run settles it.
7. **The relay's video ceiling is respected.** 4 Mbit/s clean, 8 Mbit/s loses
   28% silently — both MEASURED. Any streaming design carries a sequence number
   **inside the payload**, because a binary frame has no envelope and the relay
   says nothing when it drops.
8. **Visual control does not share a socket with audio.** 50 + 30 > 60.
9. **A visual driven by an event is delayed to match the sound**, from the same
   constant the audio path uses. Otherwise it is early, and "early" will be
   reported as "broken".
10. **A claim that the picture follows the sound is backed by a number taken
    from the samples**, not from a count of messages received.
11. **Generated JavaScript does not run** until somebody decides it does, in
    writing, with a policy and a test. Generated *shaders* are a separate and
    much smaller question, and the plan should keep them separate.
12. **Every number in §3 can be re-taken in ten seconds.** The three C files are
    on the board in `/tmp`; they belong in `rig/board/` if any of this proceeds.
13. **The board stays a Pi 4 if it is ever to encode.** DOCUMENTED: BCM2712 has
    no H.264 block, encode or decode. `plan-hardware` §4 needs that exception
    written beside it before anyone buys a 5 for this.
14. **The page branches on an adapter, not on an API name.** `'gpu' in
    navigator` is the caniuse question (87.35%); `await requestAdapter()` is the
    real one (82.47%, and 17.09% on Linux). They differ by five points globally
    and by sixty-five on the platform this project's own hardware runs.
15. **Nothing claims WebGPU compute is faster here until it is measured here.**
    The one good published benchmark shows the win falling from 20x on a
    discrete GPU to under 6x on integrated graphics — and it compares against
    transform feedback, not against the fragment ping-pong this project would
    actually write. That comparison does not exist in the literature.
16. **The board's CPU governor is `performance` before any number is taken.**
    Not for the 6–13%, but because `ondemand` makes two runs of the same thing
    disagree by 7% depending on what ran just before them — which is how the
    first version of §3.4 reached a wrong conclusion, in this document, today.
17. **Nobody writes `--enable-unsafe-swiftshader` into a harness to make it
    green.** It produces a number 3.4x faster than the real Pi GPU and 8.2x
    slower than the real laptop one, about a machine that does not exist.
