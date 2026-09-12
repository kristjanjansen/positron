# Meta Quest 3S, for this project (2026-09-11)

> 🔴 **SUPERSEDED IN PART, 2026-09-12.** A headset arrived. `plan-xr.md` carries
> what was MEASURED on it and it settles several things this document could only
> tag UNCONFIRMED — the framebuffer (3360×1760, two views), the frame rate
> (89.8 fps VR, 90.0 passthrough on an Adreno 740), the 1280×670 window, that
> `immersive-ar` really composites (`alpha-blend`), and that a real Quest
> Browser's `navigator.xr` passes a nativeness gate. It also confirms §1.7
> empirically: **the user agent says "Quest 3" on a 3S.**
>
> Where the two disagree, `plan-xr.md` wins — it was taken from the device.

A buying question — a Quest 3S 128 GB from an Estonian retailer — asked against
a stack that is all web, all measured, and all on Cloudflare. The intended use
is generative code (three.js / WebXR scenes partly written by a model at run
time) plus the streaming tiers this repo already has.

**Nothing here was measured on a headset.** Every claim carries a tag:

| tag | means |
|---|---|
| **DOCUMENTED** | a vendor or standards body says so, with a URL and a date |
| **MEASURED** | a number this repo produced, or one produced today against repo code |
| **ESTIMATED** | my inference from those — it can be wrong |
| **UNCONFIRMED** | I looked and could not settle it |

Two definitions used throughout, because they are not general knowledge:

- **WebXR** is the browser API for putting a page inside a headset.
  `immersive-vr` replaces the world; `immersive-ar` composites the page over
  the headset's camera view of the real room ("passthrough").
- **A secure context** is a page the browser trusts with powerful APIs. HTTPS
  qualifies; so does `http://localhost`. Plain HTTP to another machine's IP
  address does not, and WebXR refuses to start there.

---

## 0. The short answer

Three things decide it, and two of them turned out better than expected.

1. **The web path is not a compromise.** Passthrough, hands, anchors, planes,
   hit-test and compositor video layers are all there, WebGPU is being wired
   into WebXR through 2026, and — the surprise — **colocation exists on the web
   too**, which was the strongest argument for Unity.
2. **Our harness can reach the headset.** `demo/verify.mjs` speaks raw Chrome
   DevTools Protocol over a plain WebSocket; a Quest exposes the same protocol
   over `adb`, and at least four people have already driven it that way — one
   of them with a script almost identical in style to ours, which enters an
   immersive session and asserts on it.
3. **The 3S is the same machine for our purposes.** Same chip, and — correcting
   the brief — **the same passthrough cameras**, 4 MP at 18 pixels per degree,
   with an identical camera API. What you give up is display pixels, lens
   quality, 14° of field of view and the infrared pattern that helps depth on
   blank walls. Comfort and the quality of your own judgement of a picture, not
   the validity of a measurement. ⚠️ The one open risk is a **~1.6× memory
   bandwidth gap** on the identical chip, which is a teardown figure Meta does
   not publish and nobody has tested.

Recommendation, with reasons and prices in §6: **buy the 3S — and wait the
twelve days for Meta Connect (23–24 September) first**, because waiting is
nearly free and there is a harness to write in the meantime. The condition is
that `verify-quest.mjs` gets built before the first WebXR demo is called green:
this project's most expensive recurring failure is a green suite over a code
path the suite cannot reach, and Meta will cheerfully hand you one (§3.3).

The listing is genuine — **368.70 €, in stock, two-year warranty**, against
Meta's own EU list of 359.99 € and a Quest 3 at 616.97 €. §6 has the detail,
including the two things about the 3S that look decisive for a latency project
and turn out not to be.

**Three defects in code we already ship were found by writing this**, none of
them needing a headset to confirm:

- 🔴 **`demo/shell/moq.mjs` publishes VP8, and Meta states VP8 is not
  hardware-decoded on Quest 3 or 3S.** Software decode inside a 13.9 ms frame
  budget on a six-core part. The codec was chosen from a correct measurement on
  Safari — a laptop. AV1 is the right default here. (§4.3)
- 🟠 **`rig/box/listen.html` never requests a sample rate**, and nothing in the
  chain resamples the box's 48 kHz PCM. On any 44.1 kHz output this pitches
  wrong *and* trims samples several times a second, while the page's own
  fault-detector cell stays green. Live today, on any Mac. (§4.2)
- 🟡 **`openWire()` cannot tell a full room from a dead relay.** The seventeenth
  client meets `503 room full (16)` and reconnect-loops forever saying nothing.
  (§5.3)

---

## 1. What the Quest Browser actually supports

### 1.0 Two warnings about the instruments, before any fact

**Every "Quest" row in MDN's browser-compat-data is a lie unless it is one of
about twenty.** BCD has an `oculus` key labelled "Quest Browser", and the npm
package ships *pre-resolved* values, so querying it returns a plausible Quest
version for nearly every API. The GitHub source shows most of those are the
literal token `"mirror"` — meaning *copy Chrome for Android's answer*, never
measured on a headset. So caniuse and BCD will confidently tell you Quest has
WebTransport, WebCodecs, WebGPU, MSE, `SharedArrayBuffer` and WebRTC, and not
one of those is evidence.

The real Quest datapoints in BCD are almost entirely WebXR: `fixedFoveation`
(8.0), `XRHand`/`XRJointPose`/`XRJointSpace` (15.1), the whole layers family
plus `XRMediaBinding` (16.1), planes/meshes/persistent-anchors/frame-rate
control (31.2), `foveateBoundTexture` (38.1). ⚠️ **And 31.2 is a floor, not a
landing version** — BCD's Quest release list jumps from 22.0 (2022-06) to 31.2
(2024-01), so anything that shipped in that window is attributed to 31.2. Proof:
BCD says `updateTargetFrameRate` = 31.2 while
[Meta's own page](https://developers.meta.com/horizon/documentation/web/webxr-frames/)
says "Browser version **16.4** and later".

**Meta's WebXR documentation is half-unmaintained, and the tell is the date
stamp.** Pages carrying "Updated: …" are current; pages without one are stale
and demonstrably wrong (`webxr-mixed-reality` still describes support as "Meta
Quest 2 and Meta Quest Pro", from Connect 2022).

| maintained (dated) | stale (undated) |
|---|---|
| `webxr-overview`, `3d-web`, `browser-remote-debugging`, `iwsdk-*`, `browser-audio`, `browser-specs` | `webxr-layers`, `webxr-hands`, `webxr-mixed-reality`, `webxr-ffr`, `webxr-frames`, `webxr-space-warp`, `web-multiview`, `browser-video` |

**The best current primary source is not the documentation — it is
[`github.com/facebook/immersive-web-sdk`](https://github.com/facebook/immersive-web-sdk)**,
Meta's own MIT-licensed WebXR framework, last pushed 2026-09-09. It is written
against the browser that exists.

### 1.1 Which build, and how far behind

DOCUMENTED, [Meta release notes](https://developers.meta.com/horizon/documentation/web/browser-release-notes/):

| release | date | Chromium | notable |
|---|---|---|---|
| 39 | 2025-06-25 | 136 | shared-spaces fix |
| 40.0 / 40.1 / 40.4 | 2025-08…10 | 138 | **passthrough camera listed as a New Feature** (40.1); **hit-test re-backed by the Depth API** (40.4) |
| 41.0 | 2025-10-21 | 140 | |
| 42.0 | 2026-01-26 | **142** | |
| **144** | 2026-03-02 | **144** | the version scheme re-bases on the Chromium milestone here |
| **146.0** | 2026-04-21 | **146** | experimental **WebGPU in WebXR**; WebXR depth projection; bounded-floor fix |
| 149.1 | 2026-07-27 | 149 | WebGPU support for **space-warp layers** |
| **150.1** | 2026-08-28 | 150 | experimental **WebGPU foveation**; **MV-HEVC playback enabled** |

**About three milestones — ten weeks — behind Chrome stable**, tightened from
about thirteen weeks during 2025. That is close enough that "it is in Chromium"
is a decent prior, and far enough that it is not a fact.

⚠️ **Do not reason from the version number anywhere else, including inside
Meta's own docs.** The browser-specs page (updated 2026-07-21) prints an example
user agent reading `OculusBrowser/39.2 … Chrome/136` — a browser from before the
re-base paired with a Chromium ten milestones behind that page's own date. The
page says so itself: the string is "an example, not a feature contract", and
**"Do not use the user-agent string for feature detection. Check each web API or
mode before you show a feature that needs it."** That instruction is the reason
this entire section is worth less than one page that probes the device (§6).

### 1.2 WebXR

| feature | status | landed | note |
|---|---|---|---|
| `immersive-vr` | **default on** | v7.0, 2019-12-06 | |
| `immersive-ar` (passthrough) | **default on** | Connect 2022 | colour on Quest 3/3S/Pro, greyscale on Quest 2 |
| `hand-tracking` / `XRHand` | **default on** | experimental 8.0 → **default 15.1** (2021-04-09) | 25 joints. Simultaneous hands+controllers 31.4. ⚠️ **Left-hand palm pinch is reserved as the system menu button** — do not bind it |
| `hit-test` | **default on** | — | ⚠️ **Since Browser 40.4 (2025-10-02) it is backed by the Depth API, not the scene mesh**: no room scan needed, works to ~5 m, instant placement, Quest 3/3S |
| `anchors`, incl. persistent | **default on** | — | **Hard limit: 8 persistent anchors per SITE at a time.** None in private mode; cleared with site history |
| **shared / colocated reference space** | **experimental, behind a flag** | initial 38.2 (2025-04-30), fixed v39 | see below |
| `depth-sensing` | **default on — Quest 3 / 3S only** | pre-33.3; start/stop control v39 | stereo disparity from the two front tracking cameras, ~5 m |
| `plane-detection` | **default on** | Connect 2022 | always **horizontal or vertical rectangles** on Quest. `XRSession.initiateRoomCapture()` is a Quest extension, callable **once per session**; wait 2–3 s before concluding `detectedPlanes` is empty |
| `mesh-detection` | **default on — Quest 3 / 3S only** | — | bounded meshes with semantic labels, plus a global scene mesh |
| WebXR Layers + `XRMediaBinding` | **default on** | **16.1**, 2021-06-25 | `XRMediaBinding` is **Quest-exclusive** — `false` in Chrome, Firefox and Safari. Built on Quest's Timewarp layers. ⚠️ **Ceiling: 16 composition layers per frame**; beyond that, layers are silently not rendered |
| **`camera-access` (raw passthrough pixels)** | **shipped, still labelled experimental** | **38.2 experimental (2025-04-30) → 40.1 New Feature (2025-08-12)**; still being fixed in 146.0 | see below — this corrects a claim I made earlier in this document |
| `local` / `local-floor` / `bounded-floor` / `viewer` | **default on** | | bounded-floor bug fixed in 146.0 |
| `unbounded` | **production** | experimental 34.2 | IWSDK now marks it `required: true` in its own depth-occlusion sample |
| frame-rate control | **supported** | **16.4** | `session.frameRate`, `supportedFrameRates`, `updateTargetFrameRate()`. Default 72 fps (90 on Quest 2). **Ask `supportedFrameRates` at runtime** — see §6 for why the headline 207 Hz figure does not transfer |
| foveation | **supported** | 8.0 / 16.1 | v36.0 made it a smooth scalar rather than three discrete levels; viewport scaling same release |
| **Space Warp** | **behind a flag** | 24.2+ | `chrome://flags` → "WebXR Space Warp". Needs `["layers","space-warp"]`, a `texture-array` projection layer, `EXT_color_buffer_half_float`. No translucent objects; higher controller latency |
| `XRVisibilityMaskChangeEvent` | **not supported** | | BCD explicit `false` |
| DOM overlays | **not supported** | | |

Also shipped: body tracking (32.0), `XRRenderState.passthroughFullyObscured`
(38.2, since adopted into the W3C spec), 6DoF pen / Logitech MX Ink (35.1).

**Colocation on the web: it exists, and it is a prototype.** Feature descriptor
`"shared"`, reference space type `"shared"`, `XRSharedReferenceSpace` carrying a
UUID common to every headset in the room, and a `reset` event when the true
shared space settles a few seconds in. Read off the live shipped demo's own
source ([sharedshooter.arvr.social](https://sharedshooter.arvr.social/),
answering 200 today, last modified 2025-01-23):

```js
requestSession('immersive-ar', {
  requiredFeatures: ['local-floor'],
  optionalFeatures: ['shared', 'unbounded'],
});
const space = await session.requestReferenceSpace('shared');
space.UUId;          // note the capitalisation
space.onReset;
```

Enable via `chrome://flags` → "WebXR experiments". Room-sized, **scoped
per-site** (two pages on one origin get different spaces), origin set by the
first headset, and the space is lost when the last participant leaves.
([cabanier/shared-spaces](https://github.com/cabanier/shared-spaces))

⚠️ **Four reasons to treat it as a prototype rather than a platform.** It is
built on Meta's Shared Spatial Anchors with **no vendor-neutral OpenXR
extension**. There is **no standardisation track** — a search of the whole
`immersive-web` GitHub org for "shared reference space" / "shared spaces"
returns **zero** issues. The demo repo's last code push was **2025-06-03**,
fifteen months ago. And **Meta's own current WebXR SDK does not support it** —
`colocation`, `XRSharedReferenceSpace` and `shared-space` are all zero hits in
`facebook/immersive-web-sdk`. Nothing else — Vision Pro, Pico — has an
equivalent at all.

**Raw camera access is shipped, and this corrects what I wrote in §2 of an
earlier draft.** The confusion is real and worth recording, because it is a
trap anyone researching this will fall into: Meta's mixed-reality page says
"There is **no way** to get to the pixels of the passthrough content", and
IWSDK's camera guide (2026-09-05) says a headset's passthrough "is not
automatically available as a browser camera". **Both are about
`navigator.mediaDevices`, a different API, and both are correct about it.**

The WebXR path is a separate story and Meta's release notes say it shipped:
38.2 (2025-04-30) "Passthrough Camera: Added initial support for passthrough
camera" under *Experimental*, then 40.1 (2025-08-12) "Support for passthrough
camera" under **New features**, then 146.0 (2026-04-21) fixing "experimental
lens calibration and distortion for passthrough camera". Meta's consumer
permission page carries a matching **"Headset cameras"** permission —
"Allows a website to access the real-time passthrough camera feed from the front
of your headset" — exposing camera focal length, principal point, image
dimensions and camera position relative to device centre, which is exactly the
`XRCamera` / Raw Camera Access model.
([Manage website permissions](https://www.meta.com/help/quest/1406582186767703/))

⚠️ Still unresolved: the exact feature descriptor Quest wants (`camera-access`
per spec, Quest's token UNCONFIRMED), whether the flag is still required, and
one dated contrary report (Meta forum, Oct 2025, Browser 40.2, "still does not
have access"). Also: **only one foreground app may hold camera data at a
time.** `session.enabledFeatures` settles all of it in one line.

That same permission page settles the device split cleanly: **scene data on all
devices; mesh and depth on Quest 3 / 3S only.**

### 1.3 WebGL2, multiview and WebGPU

**WebGL2** is the baseline. `OCULUS_multiview` is **on by default** and is the
one with MSAA (`framebufferTextureMultisampleMultiviewOVR`); the standard
`OVR_multiview2` is **behind a `chrome://flags` flag** and has no MSAA. ⚠️ The
benefit is **CPU-side only** — Meta quotes 25–50% CPU reduction and nothing at
all if you are fragment-bound. `MAX_SAMPLES`, `MAX_TEXTURE_SIZE` and texture
memory: **UNCONFIRMED**, nothing published.

**WebGPU as a page API shipped default-on in Browser 32.0, 2024-02-27
(Chromium 122)** — listed under *New Features*, not *Experimental*. Chrome for
Android shipped it in 121, so Meta took it on the first rebase that had it.
⚠️ Still **no first-hand `navigator.gpu` confirmation on a real headset exists**
anywhere; measure before depending on it.

**WebGPU *inside* an immersive session is behind a flag** — `chrome://flags` →
"WebXR experimental features", since Browser 146.0 (2026-04-21), confirmed both
by Meta's browser engineer and by Babylon's WebXR lead. Before that it simply
did not exist: Cabanier wrote flatly in
[three.js#32858](https://github.com/mrdoob/three.js/issues/32858) on 2026-01-26,
"It is **not implemented on Meta Quest**." Since then 149.1 added space-warp
layers for WebGPU and 150.1 added foveation.

The spec it implements, `XRGPUBinding`, is an **Editor's Draft dated
2026-08-12** ([immersive-web.github.io/webxr-webgpu-binding](https://immersive-web.github.io/webxr-webgpu-binding/))
— incubation, not Recommendation track. It is shipped default-on in exactly one
place: **Safari 26.2 on visionOS** (2025-12-12). ⚠️ Ignore chromestatus entry
5077077997649920, which says "No active development" and was last touched
2024-08-14; the Chromium flag landed 2024-11-12.

**So, for generative shader work:** WebGPU for offscreen compute and 2D canvas
is shippable today; WebGPU as the renderer of an immersive scene is a flag the
visitor has to set, which makes it an R&D capability and not a deliverable.
WebGL2 plus `OCULUS_multiview` is what ships.

**WASM, SIMD, threads:** present upstream in Chromium 146–150, therefore
ESTIMATED present; every WASM row in BCD is a mirror and there is no Quest
measurement. **`SharedArrayBuffer` requires COOP + COEP unconditionally** —
Quest's upstream is Chrome *Android*, which never had the unrestricted-SAB
deprecation trial — so `Cross-Origin-Opener-Policy: same-origin` plus
`Cross-Origin-Embedder-Policy: require-corp`, and then every cross-origin
subresource needs CORP or CORS. **Our Worker sets none of those headers today**,
and nobody has confirmed SAB working on a Quest at all.

**Cores and bandwidth, which matter more than they look:** Quest 2 and Pro have
**8** cores (XR2 Gen 1); **Quest 3 and 3S have 6** (XR2 Gen 2) — the newer
headsets have *fewer*. And the 3S runs **42 GB/s of memory bandwidth against the
Quest 3's 68 GB/s on identical GPU silicon**, now from two independent sources.
A bandwidth-bound pass tuned on a Quest 3 can fall off a cliff on a 3S; see §6,
where this is the one spec that could invalidate the cheaper buy.

### 1.4 WebTransport — the make-or-break one is genuinely unevidenced

**UNCONFIRMED, and the absence of evidence is total.** Meta's web docs have no
WebTransport page. The release notes never mention it. BCD's "20.0" is a
**mirror**, not a Quest datapoint. There is no published MoQ, moq-rs, hang or
Cloudflare-relay test on a Quest in either direction, and a GitHub search for
repositories pairing `webxr` with `webtransport` returns **zero**.

The inference is strong — Chromium shipped it default-on in M97 on desktop *and*
Android, and Quest is on ~150 — but it is an inference.

⚠️ **And there is a new trap even if it is present. Chromium M147 added local
network access restrictions for WebTransport**
([chromestatus 5126430912544768](https://chromestatus.com/feature/5126430912544768)).
A Quest on ~150 dialling a **LAN relay** meets a permission gate that did not
exist when `rig/pro-instrument/lan-relay.sh` was written. Cloudflare's public
relay is unaffected; a laptop on the same Wi-Fi is not.

What matters more than any of this is that the project already built the probe.
`demo/shell/moq.mjs` exports `moqSupport()`, which reports `webTransport`,
`webCodecs` and a `why` string **separately** — written precisely because "an
error string cannot tell 'API absent' from 'API blocked'" (CLAUDE.md). Opening
`/moq/` on the headset prints the answer with nobody writing code.

### 1.5 Media and codecs — and one finding that lands directly on our MoQ tier

From [Browser Video Support](https://developers.meta.com/horizon/documentation/web/browser-video/)
(undated, therefore stale by §1.0's rule — but it is the only codec source Meta
publishes):

| | |
|---|---|
| containers | **MP4 (incl. MPEG-DASH), Ogg, WebM.** HLS is **not listed** |
| codecs | H.264, H.265, VP8, VP9, AV1 |
| **hardware decode gaps** | "AV1 isn't hardware decoded on Quest 2 and Quest Pro"; **"vp8 isn't hardware decoded on Quest 3 and Quest 3S"** |
| resolution | 4K everywhere; 8K only on H.265 and AV1 |
| **simultaneous video** | Meta's only guidance in any document: *"During high quality playback, **only play a single video at a time**."* **No concurrent-decoder count is published for any Quest, by anyone.** It is Android's `getMaxSupportedInstances()` underneath, and Chromium Android has no software fallback for H.264/H.265 — so exceeding it is a codec-allocation failure, not a graceful degrade |
| audio | AC3 and EAC3 yes; **AC4 no** |
| MV-HEVC | enabled in 150.1 (2026-08-28) |

🔴 **`demo/shell/moq.mjs` publishes and subscribes `vp8`, and VP8 is the one
codec Meta says is not hardware-decoded on Quest 3 and Quest 3S.** It is also
absent from the XR2 Gen 2 product brief. That is not a "might be slower" — it is
a software decode inside a 13.9 ms frame budget, on a 6-core part, while the
scene is also rendering. On this device the right default is **AV1** (which
NVIDIA's shipping CloudXR.js device profiles also pick for Quest 3/3S, with
H.265 for Quest 2), and **H.264 is the safe floor everywhere**. Worth knowing
that our VP8 choice was measured on *Safari*, where it was the fast encode path
(370 fps against H.264's 72) — a correct measurement about a different machine.

**WebRTC is proven in production on Quest Browser**: NVIDIA CloudXR.js streams
to Quest 2/3/3S over WebSocket signalling plus WebRTC media at 2048×1792 per eye
at 90 fps. So the WHEP tier has a working precedent, not just an inference.

**MSE** is supported. **`ManagedMediaSource` is absent** (Chromium has never
implemented it), so our WebKit gate classifies a Quest correctly.

⚠️ **The native-HLS story changed and my earlier reading of it was wrong.**
Chromium shipped a built-in HLS demuxer in **M142**, and Chrome 147 on macOS
*and Android* now answers `"maybe"` to
`canPlayType('application/vnd.apple.mpegurl')` and actually takes the native
path. What a Quest answers is **UNCONFIRMED**, and it conflicts with Meta's
container list omitting HLS entirely. **Our existing `ManagedMediaSource` gate
is still the right gate — for a new reason:** MMS is absent on Quest, so the
gate routes a Quest to hls.js and *avoids* Chromium's native-HLS path. That
matters, because that path requests playlists with
`Accept-Encoding: identity;q=1,*;q=0`, and a server that gzips unconditionally
returns `DEMUXER_ERROR_COULD_NOT_PARSE` — a silently dead player. Which
directly contradicts LL-HLS Appendix B.1's "Playlists are delivered in GZIP
format".

**WebCodecs** is present — a developer successfully configured
`VideoDecoder`/`VideoEncoder` and encoded `avc1.42E01E` on a Quest during the
origin-trial era. Current-build confirmation and per-codec
`hardwareAcceleration` flags are **UNCONFIRMED**; Meta's own advice is to ask
`navigator.mediaCapabilities.decodingInfo()` at runtime, which also answers
Widevine L1 per configuration.

**Audio: the only published Quest latency figure anywhere is five years old and
from the wrong device** — `AudioContext.baseLatency` 0.004 s on Quest 1 against
~0.045 s on Quest 2, reported by a developer with audible late playback and
never answered by Meta. **No Quest 3 or 3S figure exists.** Given what
`rig/box` is for, that is the number that decides whether a headset can host
anything interactive, and it has to be measured. Entering an immersive session
does **not** suspend the AudioContext; background audio playback has been
deliberate since Horizon OS v47.

### 1.6 The `@moq/net` user-agent gate — MEASURED, twice, independently

Our MoQ client library blocks Safari by user agent rather than by capability,
for a good reason (WebKit bug 319818 — the QUIC flow-control window never
refills). The question was whether the same gate catches a Quest, whose user
agent ends in the words `VR Safari/537.36`.

**It does not. The Quest Browser passes.** Run against the vendored gate in
`demo/moq/moq-vendor.js` and the `bowser` it bundles (2.14.1 — confirmed by
comparing the bundle's 68-entry alias table against the installed package), with
**real observed Browser 149.1 and 150.1 user agents** and a Safari control to
prove the guard fires. Reproduced independently against npm `@moq/net@0.3.5`:

```
ALLOW | bowser sees Chrome 150.0.7871.224            | Quest 3, Browser 150.1 (real UA)
ALLOW | bowser sees Chrome 150.0.7871.224            | Quest 2, Browser 150.1 (real UA)
ALLOW | bowser sees Chrome 149.0.7827.197            | Quest 3, Browser 149.1 (real UA)
ALLOW | bowser sees Samsung Internet for Android 4.0 | legacy Quest w/ SamsungBrowser token
BLOCK | bowser sees Safari 26.0                      | macOS Safari 26  ← control
```

The gate is `bowser.getParser(ua).satisfies({firefox:'>=153.0', safari:'<0'})`,
and `satisfies()` returns `undefined` for any browser it does not find in the
spec object — which the wrapper turns into "allowed". **bowser has no Oculus,
Quest or VR descriptor at all** (all 73 enumerated), so a modern Quest matches
bowser's *Chrome* descriptor and falls straight through. The trailing
`VR Safari/537.36` is never reached, because bowser's Safari test sits near the
end of its ordered list, after Chrome, Samsung Internet and Android Browser.

⚠️ **It is a denylist with a permissive default**, so the Chrome version bowser
reports is never consulted. If anyone ever tightens it to an allowlist keyed on
`chrome: '>=N'`, a modern Quest still passes but **legacy Quest user agents
carrying `SamsungBrowser/4.0` would silently fail**, because bowser classifies
those as Samsung Internet 4.0.

Reproducible in ten seconds, which is the point — a check nobody can run is a
check nobody runs:

```sh
npm i bowser && node -e '
const b=require("bowser");
const ua="Mozilla/5.0 (X11; Linux x86_64; Quest 3) AppleWebKit/537.36 (KHTML, like Gecko) \
OculusBrowser/150.1.0.24.52.1046134268 Chrome/150.0.7871.224 VR Safari/537.36";
const t=b.getParser(ua).satisfies({firefox:">=153.0",safari:"<0"});
console.log(b.getParser(ua).getBrowserName(), t===undefined?"ALLOW":(t?"ALLOW":"BLOCK"));'
```

**What is MEASURED is the gate's verdict on those strings; what is not measured
is that a headset in hand sends one of them.**

### 1.7 The user agent, and why two parsers disagree about it

```
Mozilla/5.0 (X11; Linux x86_64; Quest 3) AppleWebKit/537.36 (KHTML, like Gecko)
OculusBrowser/150.1.0.24.52.1046134268 Chrome/150.0.7871.224 VR Safari/537.36
```

- **The token is still `OculusBrowser/`.** There is no `MetaQuestBrowser/`,
  despite the product being renamed in v31.2 (January 2024).
- Since the re-base, the `OculusBrowser` major **equals** the Chrome major
  (146↔146, 149↔149, 150↔150). Observed, never announced — do not rely on it.
- **Quest 3S reports the device token `Quest 3`**, as does the Xbox Edition.
  **You cannot tell a 3 from a 3S by user agent** — which matters, because the
  3S has no proximity sensor and 38% less memory bandwidth.
- **Desktop mode is the default**, so the platform reads `X11; Linux x86_64`
  and **bowser reports `platform.type === "desktop"`, `os === "Linux"` for a
  headset.** Mobile mode adds a `Mobile VR` token and an `Android` platform.
- ⚠️ **`ua-parser-js` says "Oculus Browser", device `{type:"xr", model:"Quest
  3", vendor:"Facebook"}`. `bowser` says "Chrome".** They disagree, and which
  library a dependency uses decides whether a Chrome-version gate sees the Quest
  at all (§1.6).
- `navigator.userAgentData` exists; its `brands` on a Quest, and whether it
  sends `Sec-CH-UA-Form-Factors: "XR"`, are **UNCONFIRMED**.

### 1.8 Hard limits and quirks

- **⚠️ Taking the headset off does NOT end or hide the session.** Meta's own
  engineer: *"the Quest browser lies and reports that the experience is visible
  even though it isn't. The same happens when the headset is taken off."*
  `visibilitychange` fires only once the device sleeps, roughly **ten seconds
  later**, and **the Quest 3S has no proximity sensor at all** (it uses a timed
  auto-shutoff). [webxr#1396](https://github.com/immersive-web/webxr/issues/1396)
  is still open. **For us that is a billing and a measurement problem at once:**
  a MoQ or WHEP stream keeps running through a doff with no in-page signal to
  pause on, and Cloudflare Stream bills *delivered minutes* — CLAUDE.md's
  "buffering is billable" applies to an empty headset on a table.
- **The system menu does not hide the session either** — it goes
  `visible-blurred`, the browser's 2D UI overlays a still-rendering session,
  **only head placement updates**, and `requestAnimationFrame` is throttled.
  There is no way to trigger this programmatically, so it cannot be tested for.
- **`http://localhost` is explicitly blessed by Meta**, which upgrades §3.2 from
  an inference to a statement: *"For development purposes, Browser allows WebXR
  on **localhost** servers without a secure connection or SSL certificate."*
- **`chrome://flags` is exposed and load-bearing.** "WebXR experiments" /
  "WebXR experimental features" gates shared spaces and WebGPU-in-WebXR;
  "WebXR Space Warp" gates space warp.
- **⚠️ Desktop mode is the default and `<meta viewport>` is ignored.** Default
  window 1280 × 670 CSS pixels, minimum 500 × 495, maximum 2000 × 1070.
  `demo/shell/shell.css` caps its column at `max-width: 720px` and centres it,
  so width is fine; **height is the constraint** — 670 px is about half a laptop
  viewport, so a demo's paragraph, readout, controls and log will not be on
  screen together, and a readout scrolling out of view mid-measurement is
  exactly the thing that gets reported as "the page is broken".
- **⚠️ Sandboxed iframes need `allow-same-origin` on Quest** or VR content will
  not load — a divergence from desktop Chrome. Cross-origin iframes additionally
  need `allow="xr-spatial-tracking"`.
- **Per-tab memory cap, JS heap cap and OOM behaviour: UNCONFIRMED.** The
  published 4.4 GiB (Quest 2/Pro) and 5.75 GiB (Quest 3/3S) figures are *app
  process* limits and nobody states whether they bind a Chromium renderer.
- Service workers, cache and storage quota: supported, **no Quest-specific
  divergence documented and no quota numbers published**.
- **There is effectively one browser.** Wolvic (the Firefox Reality successor)
  still runs on Quest, but Igalia put it into **maintenance mode on 2025-11-26**
  and the Horizon Store build is the older Gecko one — the better Chromium build
  is sideload-only and does not auto-update. **Whether a sideloaded Chrome for
  Android gets immersive WebXR is UNCONFIRMED**, and the mechanism argues
  against it: stock Chrome's `immersive-vr` path was Daydream (discontinued) and
  its `immersive-ar` path needs Google Play Services for AR, which Horizon OS
  does not have.

---

## 2. Do we need Unity? No — and for this project it is close to actively bad

The verdict is specific to positron, not general.

**What Unity would buy:**

1. **Colocation and shared spatial anchors, fully supported rather than
   experimental.** Meta's Colocation Discovery and Group Sharing are documented
   for Unity, Unreal and OpenXR — DOCUMENTED,
   [Meta blog](https://developers.meta.com/horizon/blog/colocation-discovery-group-sharing-shared-spatial-anchors-mixed-reality/).
   The web has the same capability behind an experimental flag (§1.2), which is
   a real difference in reliability, not in possibility.
2. **Native performance and the whole Meta XR SDK** — better control over
   compositor layers, foveation, hand-tracking prediction, passthrough styling.
3. **Store distribution.** A WebXR page cannot be sold in the Horizon Store.
4. **The passthrough camera pixels, on a documented and supported footing.**
   ⚠️ **This was my first answer to "where can the web not follow" and it was
   wrong** — recorded rather than quietly deleted, because the trap is one
   anybody researching this will fall into. Meta's native **Passthrough Camera
   API** is real and well specified — 1280 × 960 or 1280 × 1280, 60 Hz, 20–40 ms
   capture latency, YUV420, ~1–2% GPU per streamed camera, Horizon OS v74+,
   Quest 3 and 3S alike ([Meta, 2026-04-21](https://developers.meta.com/horizon/documentation/unity/unity-pca-overview/)).
   But **the web has it too**: Meta's release notes ship passthrough camera
   access in Browser 38.2 as experimental and 40.1 as a New Feature, and the
   consumer permission page carries a "Headset cameras" permission exposing
   focal length, principal point, image dimensions and camera pose (§1.2). The
   two Meta pages that say the pixels are unreachable are both about
   `navigator.mediaDevices`, a different API. So the gap is **maturity, not
   capability**: the native API is documented and stable, the web one is shipped
   and still labelled experimental with an unconfirmed feature descriptor.

**What Unity would cost, concretely, here:**

- A second toolchain in a repo where the entire verification culture is one
  contract: a page publishes `window.__demo` and a Node script asserts on it.
  `demo/verify.mjs`, `verify-native.mjs` and `verify-safari.mjs` reach exactly
  zero percent of a Unity build.
- A C# codebase in a repo that has none, plus an Android/IL2CPP build and an
  APK deploy cycle. A third-party summary puts a Unity iteration at **30–90
  seconds** against a web save-and-reload — ESTIMATED, from
  [tobias-weiss.org](https://tobias-weiss.org/content/webxr-ai-2026-platform-state/),
  2026-06-27, not measured here.
- None of the deployed endpoints get easier. `ws.positron.studio` is a plain
  WebSocket; the box speaks JSON over it; `demo/shell/wire.mjs` is the single
  written-down envelope. A Unity client would be a *second* implementation of
  that envelope, which is the exact thing `rig/box` avoided by importing
  `wire.mjs` rather than copying it.
- The generative half gets harder, not easier. Generated C# needs a compile
  step; generated JavaScript does not.
- **And Meta's own AI-assisted development tooling is on the web side.** The
  Immersive Web SDK — MIT-licensed, `@iwsdk/*` on npm, three.js under it
  (`super-three@0.181.0`), with an MCP server that hands a coding agent
  screenshots, console logs, scene-graph and ECS state, input emulation and
  page reloads — is a *WebXR* framework. DOCUMENTED,
  [Meta blog](https://developers.meta.com/horizon/blog/immersive-web-sdk-new-era-spatial-web-development/)
  and [iwsdk.dev/ai](https://iwsdk.dev/ai/). For a project whose whole question
  is "how do I let a model write scene code and check it", the vendor has
  already answered on the web, and its answer runs against an emulator rather
  than a headset (§3.3) — which is a gap we know how to close and Unity does
  not help with.

**Where the web genuinely cannot follow:** store distribution, and anything that
needs a *supported* rather than an experimental footing — colocation and raw
camera pixels both exist on the web but both are flagged, undated, or (for
shared spaces) unsupported by Meta's own current SDK. None of that is on this
project's path. positron is R&D judged on RAM, CPU and latency — not a product
that ships to a store, and an experimental flag is a perfectly good place for
R&D to live.

**Verdict: no Unity.** If colocation later turns out to be the whole point of
an experiment and the experimental web flag is unreliable, that is the moment
to revisit — and even then the honest first move is to measure the flag, not to
buy a toolchain.

---

## 3. The development loop

This section turned out to be the best-documented part of the whole question,
and the answer to "can our harness reach the headset" is **yes, and four other
people have already built it**.

### 3.1 Getting Developer Mode, and what it is for

**Browsing needs nothing.** Put the headset on, open Browser, type
`positron.studio`. Developer Mode is not involved — Browser is preinstalled
consumer software.

**Developer Mode unlocks `adb`, sideloading, the Unknown Sources tab, and
remote debugging** — DOCUMENTED, [Enable developer mode](https://developers.meta.com/horizon/documentation/android-apps/enable-developer-mode/),
last updated 2026-08-24. To get it you must be a registered Meta developer with
a verified *account* (payment method and/or two-factor), at least 18, and a
member of a developer team — "You need to be in a team before you can enable
developer mode" ([Device setup](https://developers.meta.com/horizon/documentation/native/android/mobile-device-setup/),
2026-08-06). **Organization verification is NOT required** for Developer Mode;
it is required only before publishing to the Store
([developer verification policy](https://developers.meta.com/horizon/policy/developer-verification/)).
Create a one-person org, verify your own account, done.

⚠️ **The toggle is in the Meta Horizon phone app, not the headset.** Horizon app
→ headset icon → paired headset → Headset Settings → Developer Mode. Then
in-headset: Settings → Developer → enable MTP Notification, and accept "Always
allow from this computer" on the USB prompt. DOCUMENTED as of 2026-08-24.

### 3.2 The loop itself — Meta documents exactly the one we want

[Debug Browser content](https://developers.meta.com/horizon/documentation/web/browser-remote-debugging/),
last updated **2026-07-22**, gives it in four steps:

1. Developer Mode + USB setup.
2. Install Android Platform Tools so you have `adb`. (**Not installed on this
   Mac** — `which adb` returns nothing today.)
3. "If your site runs on a local port, use `adb reverse` to make that port
   available to Browser": `adb reverse tcp:8080 tcp:8080`, then open
   `localhost:8080` in Browser.
4. `chrome://inspect/#devices` in desktop Chrome → **inspect** on the tab.

For us that is literally `adb reverse tcp:8890 tcp:8890`, then
`http://localhost:8890/demo/` in the headset — **`demo/server.mjs` needs no
change at all.** It already binds `127.0.0.1:8890`, and `adb reverse` binds the
listener on the *device's* loopback, so the page's origin really is
`http://localhost:8890`.

**And that origin runs WebXR — Meta says so in as many words.** Their
documentation: *"For development purposes, Browser allows WebXR on **localhost**
servers without a secure connection or SSL certificate."* That is DOCUMENTED by
the vendor, not inferred, and it is corroborated by the spec from two sides:
[MDN Secure Contexts](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts)
(2026-08-15) — "Locally-delivered resources such as those with
`http://127.0.0.1`, `http://localhost` … are therefore potentially trustworthy"
— and the [WebXR Device API](https://www.w3.org/TR/webxr/) (W3C CR draft,
2026-06-09), which marks `Navigator.xr` `[SecureContext]` and additionally
requires a transient user activation for `immersive-vr`.

**Someone has already done it on a Quest and it works.**
[`patrick-morrison/belowjs`, `scripts/quest-perf-test.mjs`](https://github.com/patrick-morrison/belowjs/blob/main/scripts/quest-perf-test.mjs),
pushed 2026-09-01: default `BASE_URL` is `http://localhost:5173/…` over plain
HTTP, it runs `adb reverse tcp:5173 tcp:5173`, and then over CDP calls
`navigator.xr.requestSession('immersive-vr', …)` and asserts
`renderer.xr.isPresenting`. Third-party, not a Meta statement — but it is the
measurement that settles it.

**A LAN IP is not a secure context.** `http://192.168.x.x:8890` will not run
WebXR. That is the whole reason the LAN route needs HTTPS.

**Self-signed HTTPS on the LAN is documented and does work — but `auto.crt`
will not.** Meta's own IWSDK testing chapter
([2026-03-11](https://developers.meta.com/horizon/documentation/web/iwsdk-guide-testing-experience))
says HTTPS is required, that Vite generates a self-signed certificate, and
tells you to open `https://<your-ip>:8081` in the headset and "**Accept the
certificate warning (this is normal for local development with self-signed
certificates)**". So the interstitial is click-through-able.

The repo's `auto.crt` / `auto.key` are **mediamtx's own generated TLS pair** —
`PROGRESS.md` says so, they are gitignored, and the certificate confirms it:
`CN=mediamtx`, self-issued, valid 2026-08-25 to 2036-08-22, **no
subjectAltName at all**. Chromium rejects a certificate with no SAN outright
and offers no proceed link for that particular failure. It is also useless for
the reason already written in `demo/shell/moq-audio.mjs`: WebTransport
certificate pinning wants ECDSA P-256 and validity ≤ 14 days, "which is why the
repo's old ten-year auto.crt was refused with an error that never mentions
validity."

⚠️ Two traps on the HTTPS route: an origin that has ever sent
`Strict-Transport-Security` gets a **non-overridable** interstitial with no
proceed link, and there is **no documented way to install a user CA on Horizon
OS** — `/system` is not writable on a retail device, Settings does not surface
Android's certificate installer as far as any doc shows, and Meta's only
certificate tooling is in the enterprise device manager and appears to be for
Wi-Fi/EAP rather than a browser trust store. UNCONFIRMED but with no path
found. So `mkcert`, whose entire value is installing its root, buys nothing
here.

Routes, ranked:

| route | cost | WebXR? |
|---|---|---|
| **`adb reverse` + `http://localhost:8890`** | one command, USB cable | **yes** — spec + a working third-party harness |
| deploy to `positron.studio`, open the URL | a build + a wrangler deploy | yes — real HTTPS, and already how we verify production |
| a tunnel (`cloudflared`) to the dev server | one process, real cert | yes; also the only route that survives HSTS, and the only one that works with Meta's [Web Launch](https://developers.meta.com/horizon/documentation/web/web-launch/) URL-push (HTTPS only) |
| self-signed over the LAN | a cert + a click-through every time | yes, Meta-documented — but no CA install, so the click never goes away |

### 3.3 Can `verify.mjs`-style CDP asserts be driven against the Quest Browser?

**Yes. Known-working, undocumented, and four independent people have built it.**
This is the most important finding in the document.

The connection:

```sh
# the socket name is NOT stable — discover it
SOCKET=$(adb shell cat /proc/net/unix \
  | grep -o '@[[:graph:]]*devtools_remote[[:graph:]]*' | head -1 | tr -d '@\r')
adb forward tcp:9222 "localabstract:${SOCKET}"
curl http://127.0.0.1:9222/json/version    # → browser-level webSocketDebuggerUrl
curl http://127.0.0.1:9222/json/list       # → one per tab
```

Three socket names are in the wild: `chrome_devtools_remote` (the Android
default, hard-coded and reported working by
[`quest-browser-mcp`](https://github.com/nparashuram/quest-browser-mcp)),
`com.oculus.browser_devtools_remote` (documented as Quest Browser's in
[NVIDIA/IsaacTeleop](https://github.com/NVIDIA/IsaacTeleop), 379★, pushed
2026-09-11), and `weblayer_devtools_remote_<pid>` when a URL is handled by the
system WebLayer instead of Browser. **Discover it; never hard-code it.**
IsaacTeleop forces `-p com.oculus.browser` specifically because WebLayer "does
not fully plumb controller input sources through".

`demo/verify.mjs` already fetches `/json/version` for `webSocketDebuggerUrl`
and speaks raw CDP over node's global `WebSocket` with no dependencies. So does
belowjs's harness — **the same house style, arrived at independently.** The
connection half needs one hostname and nothing else.

**Five adaptations, all of them things somebody else already hit:**

1. **Do not create a tab.** `verify.mjs` opens a fresh `about:blank` per run
   with `Target.createTarget`. belowjs refuses to: "No existing Quest Browser
   page target found. The harness will not create extra tabs… Quest Browser
   keeps launched intents around aggressively." Reuse one tab and drive it with
   `Page.navigate` or `window.location.replace()`.
2. **`Page.bringToFront` before anything XR.** "WebXR requires the page to be
   visible" (IsaacTeleop).
3. **User activation is fiddly.** `Runtime.evaluate` with `userGesture: true`
   is enough for belowjs. IsaacTeleop needed both a synthetic
   `Input.dispatchMouseEvent` press/release *and* a DOM `.click()` afterwards,
   "because on Meta Quest Browser the synthesized mouse event grants activation
   but does not fire React's onClick handler (touch-first routing)". Our shell
   uses plain `addEventListener('click')`, so `userGesture: true` should be
   enough — ESTIMATED.
4. **`Page.captureScreenshot` cannot capture the immersive view.** Only the 2D
   panel. Not a problem for us — CLAUDE.md already notes "nothing in the suite
   looks at ink" — but it means a visual check needs the device's own capture
   service (`com.oculus.metacam/.capture.CaptureService`, pulled over adb).
5. **The cert interstitial, if you take the HTTPS route.** IsaacTeleop tries
   `Security.setIgnoreCertificateErrors` first and keeps a DOM fallback that
   clicks `#details-button` then `#proceed-link` — the fallback's existence
   suggests the Security domain is not reliable there.

**And a free measurement channel this project should want badly:**
`adb logcat -s VrApi` prints `FPS=` and `Stale=` once a second, **from the
compositor**. That is the far side of the boundary — the count that is not the
page's own opinion of itself. CLAUDE.md: "a count is only evidence on the far
side of the boundary". A dropped-frame number from the page and one from
`VrApi` disagreeing is exactly the kind of thing this project exists to notice.

Two more useful `adb` levers:

- Open a URL without wearing the headset:
  `adb shell am start -a android.intent.action.VIEW -d '<url>' -p com.oculus.browser`
- Keep the device awake for an unattended run, via Meta's **Scriptable Testing
  Services** (Quest OS v44+, verified developer, Store PIN) — DOCUMENTED,
  [Scriptable Testing](https://developers.meta.com/horizon/documentation/native/android/ts-scriptable-testing/):
  `adb shell content call --uri content://com.oculus.rc --method SET_PROPERTY --extra …`
  with `disable_guardian`, `disable_dialogs`, `disable_autosleep`. Meta is
  explicit that this only *prepares* a device and runs no tests. ⚠️ Restore the
  properties afterwards with a watchdog — leaving `disable_autosleep` on drains
  the battery and risks burn-in, which Meta warns about.

**What no amount of CDP gives you:** the WebXR Test API (`navigator.xr.test`,
`FakeXRDevice`) is a web-platform-test-only surface that Chromium does not
expose to page or extension code — the spec says so and
[issue #48](https://github.com/immersive-web/webxr-test-api/issues/48) records
it. ESTIMATED-near-certain that Quest Browser does not expose it. There is also
no WebDriver extension for WebXR, and no report of anyone pointing ChromeDriver
at `com.oculus.browser`. So the *fake* device is off the table, which is fine —
we want the real one.

⚠️ **Meta's own AI tooling does not close this gap, and the way it fails is the
exact trap CLAUDE.md warns about.** The Immersive Web SDK ships an MCP server (a
standard way for a coding agent to call tools) exposing ~**52 tools** across
session, transforms, input, browser, scene and ECS state, with screenshots and
console capture. But: "screenshots and console logs are captured server-side
through Playwright's CDP integration", against "a managed Chromium instance",
with **IWER** — the Immersive Web Emulation Runtime — supplying a *fake* XR
device. Controllers, hands and headset transforms are IWER commands, not
hardware. "No headset required during development." DOCUMENTED,
[iwsdk.dev/ai](https://iwsdk.dev/ai/) (v0.5.3) and
[AI-Native Development](https://developers.meta.com/horizon/documentation/web/iwsdk-ai-assisted-dev-tooling/)
(2026-03-10). The docs make no claim about running against a real headset or in
CI.

Meta also ships the emulator standalone as a Chrome extension —
[Immersive Web Emulator](https://github.com/meta-quest/immersive-web-emulator),
461★, v2.0, on the Web Store — and claims its coverage is "on par with the
WebXR support in the Meta Quest Browser". That is a marketing claim, not a
measurement, and it is the sentence to be suspicious of: it is precisely the
claim "desktop Chrome covers the iPhone path" made in a new accent.

So the shape of a `verify-quest.mjs` is:

| | reaches |
|---|---|
| `verify.mjs` (desktop Chrome, headless) | everything that is not XR |
| **Immersive Web Emulator / IWER** | the XR *code path*, with a fake device — cheap, fast, and not evidence |
| **`verify-quest.mjs` over adb + CDP** | the real device, the real compositor, `VrApi` FPS from outside the page |

All three, in that order, with the third one load-bearing.

### 3.4 The Unity path, briefly

Developer Mode as above, then **Meta Quest Developer Hub** — still called that,
still shipping, Mac build **6.4.1 dated 2026-06-04** (version from search
metadata, medium confidence). It bundles `adb` (v1.0.41) and warns about
conflicts if you have a second one. Device Manager → Device Actions → **ADB
over Wi-Fi** gets the cable off; a VPN on the host breaks it. `adb install -r`
overwrites an existing APK of the same name.

⚠️ **`adb pair` is not a Meta-documented Quest flow.** Meta documents only the
pre-Android-11 route — `adb tcpip 5555` then `adb connect <ip>:5555`. The
Android 11 TLS pairing machinery is present in Horizon OS but has no UI;
[`thedroidgeek/oculus-wireless-adb`](https://github.com/thedroidgeek/oculus-wireless-adb)
flips it through the settings provider. UNCONFIRMED whether a pairing-code
screen exists on current builds.

MQDH is also useful on the *web* path: Device Manager → Device Actions →
Browser → paste a URL → Open loads a page on the device, and it can cast the
headset view to the desktop. DOCUMENTED,
[Use MQDH with browser](https://developers.meta.com/horizon/documentation/web/browser-mqdh/).

---

## 4. How the headset would reach our endpoints

### 4.1 `ws.positron.studio` — the cue and message relay

**Works, and it is the boring one.** A plain `wss://` WebSocket from a Chromium
browser to a Cloudflare Durable Object. `demo/shell/wire.mjs` needs no change.
The relay is tokenless, `access-control-allow-origin: *`, and
`openWire()` already reconnects with a fresh `from` id — which matters more on
a headset than on a laptop, because a headset roams between the router and
sleep.

Expected round trip: **ESTIMATED 5–40 ms** on the same Wi-Fi as a laptop that
measured it. The parts we know are MEASURED: the Durable Object hop costs
**1–2 ms at p50** over the runtime's `ping`/`pong` autoresponse, and a full
16-socket room costs the sender **8 ms at p50** over an empty one with zero
loss (CLAUDE.md, `demo/perf-wire.mjs`). Everything else is Wi-Fi.

One thing to check rather than assume: the headset's Wi-Fi is 802.11ax but the
radio is shared with tracking and video; **UNCONFIRMED** whether a Quest shows
worse WebSocket jitter than a laptop on the same access point. `wire.mjs`'s
`ping()` answers it, and it never wakes the Durable Object, so it times pure
network.

### 4.2 `rig/box/` — the Pi instrument

The page at `/box/` opens a socket, sends `note.on` and `voice.select` as JSON,
and receives **binary frames of 16-bit PCM at 48 000 Hz, 960 samples per frame,
50 frames a second**, which it converts to float and posts to a `pcm-playout`
AudioWorklet ring buffer with a 60 ms cushion.

**What should work:** the socket, the JSON, the AudioWorklet, the ring buffer.
All Chromium. ESTIMATED.

**What is unchecked and is a real defect risk — and it is not headset-specific,
it is just that a headset is where you would find it.** Nothing in the chain
resamples. `rig/box/synth.mjs` fixes `RATE = 48000`; `proto/jam/playout-worklet.js`
writes those samples into a ring that is drained at the AudioContext's
`sampleRate`; and `rig/box/listen.html` creates the context with
`new AudioContext({ latencyHint: 'interactive' })` — **no `sampleRate`
requested**. If the headset's audio output runs at 48 kHz, this is fine. If it
runs at anything else, two things happen at once:

- the pitch is wrong by the ratio, and
- the ring fills faster than it drains, so the worklet's latency-creep guard
  trims the oldest samples back to the floor several times a second — audible
  as periodic clicking.

And **the page's readout would stay green throughout**, because its
fault-detector cell is frames-per-second (`rate`, which must sit near 50) and
that is unaffected. This is the shape of failure this repo already named: "a
live, unmuted stream of digital silence looks identical to a working one from
every angle except the samples". MEASURED-by-reading, not by running: there is
no resampling step anywhere in `listen.html` or `playout-worklet.js`, and no
`sampleRate` is requested.

The fix is one argument — `new AudioContext({ sampleRate: 48000, latencyHint:
'interactive' })` — and the check is one line in the readout: print
`ctx.sampleRate` beside the frame rate. Worth doing before a headset is
involved, because the same latent bug is present on any Mac whose output device
runs at 44.1 kHz.

**What genuinely changes in a headset — less than feared, in one direction.**
Entering an immersive session does **not** suspend the `AudioContext`; Quest
instead raises `visible-blurred` for system UI, and background audio playback
has been deliberate since Horizon OS v47. So the ring keeps draining. ⚠️ But
CLAUDE.md's rule still applies with full force: `AudioContext.resume()` waits on
a user gesture and never rejects, so awaiting it before doing the real work is a
hang, not an error. `listen.html` does `await ctx.resume()` at line 274 — on a
device where the gesture requirement bites harder, that is the line that stops
everything.

⚠️ **And the latency number nobody has: the only published Quest Web Audio
figure anywhere is five years old and from the wrong devices** —
`AudioContext.baseLatency` 0.004 s on Quest 1 against **~0.045 s on Quest 2**,
reported by a developer with audible late playback, never answered by Meta. **No
Quest 3 or 3S figure exists.** Given that `rig/box` exists to hit 98.7 ms note
to ear over the internet, a 45 ms output stage would be **almost half the
budget**, and it would be invisible in every readout the page currently draws.
That is the single most important number to take off a borrowed headset after
the WebTransport probe.

### 4.3 LL-HLS, WHEP, MoQ, and video in a 3D scene

| tier | in a Quest Browser | note |
|---|---|---|
| **LL-HLS** (Cloudflare Stream) | via hls.js on MSE | MSE is supported. The native-HLS branch is unreachable because `ManagedMediaSource` is absent — and see the trap below, which makes that a *good* thing rather than a limitation |
| **WHEP** (Cloudflare WebRTC) | **works — with a production precedent** | NVIDIA's CloudXR.js streams to Quest 2/3/3S over WebSocket signalling plus WebRTC media at 2048 × 1792 per eye at 90 fps. Our measured desktop number was p50 **67.0 ms** glass-to-glass; a headset adds compositor latency on top |
| **MoQ** | gated on WebTransport (§1.4), and **carrying the wrong codec** — see below | If WebTransport is there, `demo/shell/moq.mjs` connects unchanged: the library's user-agent gate lets a Quest through (§1.6, MEASURED). Our measured desktop number was p50 **26.2 ms** |

🔴 **The finding that lands hardest: `moq.mjs` publishes and subscribes `vp8`,
and Meta states that "vp8 isn't hardware decoded on Quest 3 and Quest 3S."**
DOCUMENTED, [Browser Video Support](https://developers.meta.com/horizon/documentation/web/browser-video/).
VP8 is also absent from the XR2 Gen 2 product brief. That is not "a bit slower":
it is a software decode running inside a 13.9 ms frame budget on a **six-core**
part (§1.3) that is simultaneously rendering a stereo scene.

The choice was not careless — it was measured, on the wrong machine. VP8 was
picked because Safari's WebCodecs does VP8 1280 × 720 at 370 fps against
H.264's 72, which is a correct measurement about a laptop. On this device:

| | |
|---|---|
| **AV1** | the right default for Quest 3 / 3S. Hardware-decoded there, and it is what NVIDIA's shipping CloudXR.js device profiles select for exactly these headsets |
| **H.265** | what CloudXR.js selects for Quest 2, where AV1 is *not* hardware-decoded |
| **H.264** | the safe floor on every device, including Quest 2 |
| **VP8** | the single worst choice on Quest 3 / 3S |

The catalog in `moq.mjs` already carries the codec as data (`codec: 'vp8'` in
the rendition), so this is a negotiation problem rather than a rewrite — but it
is a real defect against this device and it would have read as "MoQ is slow in a
headset".

⚠️ **The native-HLS story changed, and my earlier reading of it was wrong.**
Chromium shipped a built-in HLS demuxer in **M142**; Chrome 147 on macOS *and
Android* now answers `"maybe"` to `canPlayType('application/vnd.apple.mpegurl')`
and actually takes the native path. What a Quest answers is **UNCONFIRMED**, and
it conflicts with Meta's container list, which omits HLS entirely. **Our
existing `ManagedMediaSource` gate is still correct — for a new reason.** MMS is
absent on Quest, so the gate routes a Quest to hls.js and *avoids* Chromium's
native path. That matters: the native path requests playlists with
`Accept-Encoding: identity;q=1,*;q=0`, and a server that gzips unconditionally
answers with `DEMUXER_ERROR_COULD_NOT_PARSE` — a silently dead player — which
directly contradicts LL-HLS Appendix B.1's "Playlists are delivered in GZIP
format". CLAUDE.md already says to grep for `canPlayType` before trusting any
HLS page; this is a second, independent reason.

**Can a video become a texture in a three.js material inside an immersive
session? Yes — and the performance pitfall is the opposite way round from what
everyone assumes.** `THREE.VideoTexture` runs *fine* inside an XR session on
Quest; it is the **2D, non-immersive** path that is slow there. Meta's own
engineer, in [three.js#28868](https://github.com/mrdoob/three.js/issues/28868):
"when entering the XR session, it runs just fine… I've seen performance issues
lately on the 2D side." NVIDIA's CloudXR.js ships exactly this — `texSubImage2D`
into a plain `XRWebGLLayer` on Quest, plus an undocumented
`useQuestColorWorkaround` colour correction.

⚠️ **That inversion is a measurement trap of precisely the kind CLAUDE.md
names.** An A/B of video-texture performance run on the desktop page — the
obvious, cheap place to run it — reports the opposite of the truth about the
device. Measure the quantity in question.

**But Media Layers are still the better path, and Meta publishes the numbers.**
WebXR Layers let the headset's own compositor draw the video on a quad, cylinder
or sphere at panel resolution, instead of your renderer resampling it into an
eye buffer. Meta's measurement of the same content both ways: GPU bus-busy
**50.210% → 23.904%**, render time **~3.15 ms → ~0.72 ms per frame**, and a
picture that is "sharper and has less distortion, especially at the top and
bottom" ([WebXR Layers](https://developers.meta.com/horizon/documentation/web/webxr-layers/)).
`XRMediaBinding` is **Quest-exclusive** — false in Chrome, Firefox and Safari —
so this is a device-specific path, not a portable one. ⚠️ **Ceiling: 16
composition layers per frame; past that, layers are silently not rendered.**

⚠️ **Meta contradicts itself on cross-origin video in layers**, and the
resolution matters: `browser-video` warns that with WebXR Layers "cross origin
content may not work", while `webxr-layers` promises "any video will work,
including video that is cross origin or streaming". Both are true of different
things — the promise is about **Media** layers, where the browser composites and
the page never touches pixels; the warning is about **WebGL-drawn** layers,
where a cross-origin video without CORS taints the canvas and `texImage2D`
throws.

**DRM forces the layer path, architecturally.** The WebXR Layers explainer lists
"inability to display encrypted media" as one of the reasons media layers exist
— so protected video in an immersive session must go through
`XRMediaBinding.createQuadLayer` / `createCylinderLayer` / `createEquirectLayer`
rather than a texture. Whether DRM on a Quest media layer works *today* is
**UNCONFIRMED**; Meta's wording is only "any video will work, including cross
origin or streaming", never "encrypted". Not our problem — none of our content
is protected — but it is the kind of thing that silently returns a black quad.

**Simultaneous decodes: still no number, from anyone.** Meta's only guidance in
any document is *"During high quality playback, only play a single video at a
time."* Underneath it is Android's `getMaxSupportedInstances()`, and Chromium on
Android has **no software fallback for H.264 or H.265** — so exceeding the limit
is a codec-allocation failure, not a graceful degrade. This bites the moment
anyone builds the obvious demo: several live streams on several surfaces in one
room. Ramp it with a counter and read
`getVideoPlaybackQuality().totalVideoFrames` per element — and per CLAUDE.md, if
the answer comes back *exactly* N−1 every single time, suspect the collector
before believing the pattern.

⚠️ **And one billing consequence, from §1.8: taking the headset off does not
stop anything.** `visibilitychange` does not fire for roughly ten seconds, the
3S has no proximity sensor at all, and the session keeps reporting itself
visible. A Cloudflare Stream tier keeps delivering — and Stream bills
*delivered minutes* regardless of protocol. An empty headset on a table is a
billable viewer for as long as the device stays awake.

### 4.4 `ingest.positron.studio` and `backlog.positron.studio`

Nothing headset-specific. Both answer `access-control-allow-origin: *`; ingest
is the tokenless write path with server-minted session ids and per-segment,
per-session and per-address caps in a Durable Object; backlog joins a room as an
ordinary socket so the relay still parses nothing. A headset is just another
client. ESTIMATED, from reading the workers.

The one wrinkle is `MediaRecorder`: if anything in a headset ever records, the
repo's existing platform fact applies — `MediaRecorder` output reports
`duration: Infinity`, so seek far past the end and come back.

---

## 5. The generative-code architecture

### 5.1 The proposal is right in shape, and this repo already argued most of it

The pasted third-party answer proposes a frozen load-bearing layer, a mutable
layer where generated code is allowed, a quarantine zone, scene patches rather
than whole-app reload, a restricted plugin API instead of raw generated WebXR,
instant local placeholders with the generated upgrade arriving later, voice for
semantics and gesture for grounding, and rollback as a first-class feature.

Most of that is already written down here — in `plan-voice.md`, for a different
medium, and better grounded. That document is about a spoken request turning
into a MIDI keyboard split, and its rules are:

- **"A model that produced it is one more untrusted client."**
- **"Never let a generated thing be authoritative over a thing that can be
  checked."**
- **A `plan` twin that changes nothing**, beside every verb that changes the
  rig — because "a wrong MIDI patch is silent".
- **"Do not let the model emit program numbers directly. It should choose a
  *name* from a list the box supplied, so an unknown name is a caught error
  rather than a wrong instrument."**
- **"The reply is the interface"** — the box says back, in the words of the
  request, every decision that was *not* spoken. That is the acceptance test:
  "if the box cannot say what it did, it does not know, and something applied a
  guess."
- **"Do not make voice the only way in."** Everything reachable from
  `ask.mjs` with a JSON document.

So: the "restricted plugin API rather than raw generated WebXR" is our
choose-a-name-from-the-list rule. The "staging/quarantine zone" is our `plan`
twin. The "rollback as first-class" is weaker than what we already have, which
is *refuse before applying*. The proposal is missing the one rule that this
repo found expensive to learn: **say back the decisions nobody made.** In a
scene that is "I put the thing where you were looking, 2.1 m away, and it is
40 cm across" — the numbers the user never gave and cannot otherwise correct.

The proposal is also missing two positron rules that bite hard here:

- **"Prove a guard fires."** A quarantine that has never rejected anything is a
  claim. Break it on purpose, once, every run.
- **"A green suite can mean zero coverage."** A generated-code pipeline tested
  only against generated code that happened to be valid has tested nothing.

### 5.2 Patch types on the envelope we already have

A scene-patch protocol is an **application of `wire.mjs`, not a new thing**. The
envelope is `{ id, type, from, at, seq, ...payload }`, carried verbatim by a
relay that never parses. Plausible verbs, all of which mirror the box's:

| type | payload | mirrors |
|---|---|---|
| `scene.plan` | a proposed patch | `patch.plan` — validates, changes nothing, returns what it *would* do |
| `scene.apply` | the same document | `patch.apply` |
| `scene.applied` | what actually landed, in words and numbers | `plan-voice` §5, "the reply is the interface" |
| `scene.refused` | the document and *why* | the rule that refusing is loud and over-applying is silent |
| `scene.undo` | an applied patch's `id` | rollback |
| `pose` | head and hands, 20 Hz | new |

⚠️ **`at` is now a reserved word and it throws.** `wire.mjs` changed today:
`format()` refuses a payload carrying `from`, `at` or `seq`, because
`source.load` once carried an excerpt offset as `at`, every send overwrote it
with `Date.now()`, and the box asked ffmpeg to seek to second 1,789,103,743,118.
A scene patch that wants to say "at this position" must not call the field `at`.

**Where the ordering lesson applies.** CLAUDE.md: a Durable Object's input gate
holds events across a `storage.get`, but **not** across a non-storage await —
"two frames a millisecond apart will race each other into a table in the wrong
order. Where order IS the product, serialise the handler through one promise
chain." For scene patches, order **is** the product: apply-then-undo and
undo-then-apply are different scenes. Two consequences:

1. The relay itself is safe — it parses nothing and fans out synchronously in
   one loop, so its own ordering is TCP's.
2. **The receiver is not.** Any patch handler that awaits — fetching an asset,
   compiling a shader, `await import(blobUrl)` — can interleave two patches.
   The scene applier must be one promise chain, the same way the box's is.

And `seq` earns its keep here for the reason `wire.mjs` states: TCP already
orders one sender's messages, so what the counter actually catches is **the
relay's caps biting silently** and a reconnect gapping. A dropped patch is
exactly the failure that would otherwise present as "the model got it wrong".

⚠️ **One thing the proposal assumes and this repo has not decided: there is no
Content Security Policy on the deploy today.** `workers/view` sets none, so
`new Function(...)` and `await import(blobURL)` both work, and generated code
would run with the page's full authority — including its socket to
`ws.positron.studio` and its credentials to every other endpoint. That is not an
argument for adding a policy reflexively; it is an argument that **"generated
code runs here" is a decision that has not been made yet**, and the first page
that makes it should say so in its own source. The cheapest honest answer is
that generated code is a **document** validated against a vocabulary the page
owns — the `plan-voice` rule — and never a string that is executed. The moment
it becomes executable, the page needs a policy and the policy needs a test.

### 5.3 What the relay's caps mean for pose and patches

The caps, read from `workers/relay/src/index.js` rather than remembered:
`MAX_BYTES` 256 KiB per message, `MAX_SOCKETS` **16 per room**, `BYTES_PER_SEC`
512 KiB/s **per socket**, `MSG_PER_SEC` 60 with `MSG_BURST` 120, `STRIKES` 20
overruns before the socket is closed. The buckets are **on the sender's
ingress**; fan-out to every socket in the room is unmetered. MEASURED
previously: at both 120 and 300 msg/s, three runs each delivered exactly **298
messages in three seconds** — the bucket read off the wire, with the sender told
nothing.

Message sizes, computed today against the real envelope (MEASURED, in UTF-8
bytes, coordinates rounded to 4 decimal places):

| what is sent | bytes | at 20 Hz, per sender | room of 8, total fan-out |
|---|---:|---:|---:|
| head pose only | 152 | 3.0 KB/s | 0.19 MiB/s |
| head + two controllers | 285 | 5.7 KB/s | 0.35 MiB/s |
| head + two hands, 25 joints each | 3 274 | 65 KB/s | **4.00 MiB/s** |

Reading those against the caps:

- **20 Hz pose is a third of the message budget** (20 of 60 per second) and
  leaves 40/s for patches, pings and everything else. Comfortable.
- **Two participants at 20 Hz plus the box at 50 msg/s is already a busy room**
  — but on *different sockets*, so no single bucket is threatened. The bucket
  is per-socket, which is the thing to keep hold of.
- **Full hand-joint streaming does not fit.** 65 KB/s out is only 12.8% of one
  socket's byte budget, but every other participant *receives* N × 65 KB/s and
  N × 20 messages per second to `JSON.parse`, inside a 72–90 Hz render loop. At
  N = 8 that is 160 parses a second of 3 KB each. Send wrists and a pinch state,
  not fifty joints — and if joints are genuinely needed, send them as a binary
  frame, which the relay carries unchanged and which costs a tenth of the bytes.
- **16 sockets is a hard room size**, and the box and any recorder are two of
  them. The relay refuses the 17th at the upgrade with `503 room full (16)`
  rather than accepting and dropping — "a client that is told no can retry", per
  its own comment. ⚠️ But `openWire()` does not distinguish that from a network
  failure: a refused upgrade produces an `error` then a `close`, and the
  reconnect loop backs off to 5 s and tries forever. **A seventeenth headset
  would present as "the relay is down" with nothing anywhere saying "the room is
  full".** That is worth fixing before a room ever has more than a handful of
  people in it, and the fix is small — read the HTTP status the upgrade failed
  with, or ask `/room/<name>/stats`, which already reports the socket count.

**Patch delivery is not the problem; a patch is one message.** The burst
allowance (120) means a page can push a dozen patches in one frame without
loss. The thing that *would* bite is a naive "resend the whole scene at 10 Hz"
design, which is why patches rather than snapshots is the right call — for a
reason the proposal does not give.

### 5.4 The honest latency budget

Gesture → intent → model → validated code → promoted into the scene. Leg by
leg:

| leg | time | tag |
|---|---|---|
| gesture detected → message sent | < 1 frame, 11–14 ms at 72–90 Hz | ESTIMATED |
| speech, if spoken: end of utterance → text | 0.5–1.5 s, dominated by endpoint detection | ESTIMATED — nothing here has measured it; `plan-hardware` §8.8 chose Workers AI Whisper on paper and never ran it |
| browser → Worker | 1–2 ms DO hop + Wi-Fi | MEASURED (the hop) |
| **model call** | **0.78 s to first token, then 84.6 tokens/s** | DOCUMENTED — Claude Haiku 4.5, non-reasoning, on the Anthropic API, per [Artificial Analysis](https://artificialanalysis.ai/models/claude-4-5-haiku) |
| …so a 300-token patch | **≈ 4.3 s** | ESTIMATED from the two numbers above |
| …with reasoning turned on | **17.33 s to first answer token** | DOCUMENTED, same source |
| validate the document against a schema | 1–10 ms | ESTIMATED |
| compile and first-run the generated code | 5–100 ms, and this is where frames get dropped | ESTIMATED |
| promoted → visible | 1 frame | ESTIMATED |

**So: 2–7 seconds, dominated entirely by the model, and only if reasoning is
off.** Model ids and prices, for planning: `claude-haiku-4-5` is $1/$5 per
million tokens in/out with a 200K context; `claude-sonnet-5` is $3/$15;
`claude-opus-5` is $5/$25 with a 1M context. There is a "fast mode" research
preview on Opus 5 at up to 2.5× the output rate, priced at $10/$50.

The proposal's "instant local placeholder, generated upgrade seconds later" is
therefore **correct, and the gap is bigger than it implies.** Four seconds is a
long time to look at a placeholder. The design consequence is that the
placeholder must be *good* — it has to be the thing you asked for, at the right
place and size, differing only in detail — which means **the spatial decisions
must be made locally and never sent to the model at all.** The model gets
"make it shimmer", not "put a shimmering thing 2.1 m in front of me".

### 5.5 Where "measure the quantity in question" bites

Everyone who builds this will quote model latency, because it is the number the
API hands you. It is the wrong number twice over.

**It is adjacent, not the quantity.** The quantity is *time from the user's
gesture to the frame in which the change is visible*, and an A/B between two
prompting strategies that both share a 200 ms compile stall will report
"identical" and read as "fine".

**And it hides the cost that actually ruins an XR experience: dropped frames.**
A patch that lands in 3 s and drops forty frames on promotion is worse than one
that lands in 5 s and drops none, because dropping frames in a headset is not a
stutter — it is nausea. Nothing about the model call can see that.

So the rig that has to exist before any of this is claimed to work measures two
things, on **one clock**, on the device:

1. `performance.now()` at the gesture, `performance.now()` in the
   `XRFrame` callback that first renders the change. One device, one clock, so
   the delta is exact rather than an estimate — the same trick `moq.mjs` uses
   in loopback mode and refuses to use in watch mode, where the clocks are
   unrelated.
2. The `XRFrame` timestamps across the promotion window, against the display
   period, so a missed frame is counted rather than felt.

Both median and max, per CLAUDE.md — "a median hides the one bad fire that is
the reason to look".

⚠️ **And number 2 must be checked against a counter outside the page.**
CLAUDE.md: "a count is only evidence on the far side of the boundary" —
`createMidiLane`'s `scheduled()` counted what the page QUEUED and read
identically to delivery while every note was being scheduled fifty-six years
out. A page counting its own `requestAnimationFrame` callbacks is on the wrong
side of exactly that boundary: it cannot see a frame the compositor reprojected
or dropped. The far side exists and is free — `adb logcat -s VrApi` prints
`FPS=` and `Stale=` once a second, from the compositor (§3.3). If the page's
missed-frame count and `VrApi`'s `Stale` disagree, that disagreement is the
finding.

### 5.6 The first demo: `scene`

The smallest honest thing. It generates nothing; it proves the *pipe* and the
*guard*, which is what everything after it rests on.

**slug:** `scene` · **act:** 0, the substrate · **one:** "a change to the room
arrives as a message, and you can see exactly when it lands"

**what** (one paragraph, the shell's only prose block):

> Pinch, and a shape appears where you were looking. The shape is not made
> here — the request goes out over the same socket every page in this project
> uses, comes back, and only then is the room changed, so the number below is
> the real distance between asking and seeing. One of the requests is
> deliberately malformed and the room refuses it; that refusal is counted too,
> because a check that has never said no has not been shown to work. Nothing
> is generated yet: this measures the road, not the traffic.

**readout:** `to frame` ms · `worst` ms · `frames missed` count ·
`round trip` ms · `refused` count

Every cell moves. `worst` rather than an average, because the bad one is the
reason to look. `refused` is never zero — the page sends one invalid document
per run on purpose.

**`window.__demo` asserts** (a demo that branches must assert every branch —
count them and diff the count after any change):

1. `navigator.xr` exists and `immersive-vr` is supported
2. an immersive session started and a `local-floor` reference space resolved
3. the relay socket opened and the page's own message came back (the echo is
   what gives everyone one order)
4. ≥ 8 valid patches were applied
5. the malformed patch was **refused**, and the scene's object count did not
   change across it
6. `to frame` median is under a stated ceiling — the ceiling is a constant in
   the page, printed from the same constant, never typed twice
7. `frames missed` during promotion is under a stated ceiling
8. no patch arrived out of order (`seq` gaps counted, `missing` = 0)

**What it deliberately does not do:** call a model, generate code, or run
anything it did not ship with. Those are demo two.

**Harness note:** asserts 1 and 2 cannot be reached by desktop Chrome, which is
the whole point — they are the Quest-only branch, and they are why
`verify-quest.mjs` (§3.3) has to exist before this page's green means anything.
The Immersive Web Emulator will satisfy 1 and 2 on a laptop, which makes it
useful for writing the page and worthless as evidence about a device. Until the
real harness exists, the page is human-verified and says so on its own face.

**What to build in the twelve days before a headset arrives:** this page, driven
by `verify.mjs` for asserts 3–8 (which need no headset at all), plus
`verify-quest.mjs`'s connection half against desktop Chrome over `adb`-less CDP.
Then the only thing the device adds on day one is asserts 1, 2 and the numbers.

---

## 6. The verdict

### The listing

Fetched today. ⚠️ The page is **user-agent gated**: a plain fetch gets HTTP 403
with no body; the same URL with a browser user agent returns 200. Not a bot
wall in the Cloudflare sense, but worth knowing before anyone concludes the site
is down.

| | |
|---|---|
| price | **368.70 €** incl. VAT |
| product code | 7226643 · EAN **815820025252** |
| stock | in stock, free pickup Liimi 1 Tallinn; delivery from 16 Sept |
| warranty | 2 years |
| seller | MK TRADE Baltic OÜ |

**That is essentially the floor.** Meta's own EU list for the 3S 128 GB is
**359.99 €** and Estonia is not a Meta Store shipping country, so buying direct
is not an option without a foreign address. Across ~40 Estonian offers the
cheapest is 367.54 €. rde is +8.71 € over Meta's list and +1.16 € over the
cheapest listing. Sources: [Meta compare](https://www.meta.com/ie/quest/compare/),
[hinnavaatlus](https://www.hinnavaatlus.ee/4105350/meta-quest-3s-128-gb/), both
2026-09-11.

⚠️ Two integrity flags on the page: hinnavaatlus lists the same offer as
available "from 2026-09-15", which contradicts the page's own same-day pickup
claim — phone before driving. And the listing carries obviously fake
placeholder reviews (a laptop review, a "Force Touch?" question dated 2016)
under a VR headset, so the 3.0/28 rating is worthless. Site-quality signals,
not pricing problems.

**The step up:** Quest 3 512 GB is **616.97 €** in Estonia, slightly *below*
Meta's 619.99 € list. So the real choice is **368.70 € against 616.97 € — a
gap of 248 €.**

### Three timing facts

1. **Meta Connect 2026 is 23–24 September — twelve days away.**
   ([Meta, 2026-05-12](https://www.meta.com/blog/connect-2026-save-the-date/))
   A thin-and-light headset, codename Phoenix, leaked out of Quest firmware and
   is expected to be *unveiled* there ([RoadToVR, 2026-07-29](https://roadtovr.com/meta-thin-vr-headset-images-leak/)).
   Expect a tease, not a shipping product.
2. **There is no Quest 4 and none close.** Reporting puts the ultralight at H1
   2027 and a Quest 4 no earlier than H2 2027. Quest 3 is **not**
   discontinued — the "Meta discontinues Quest" headlines from January 2026 are
   about enterprise sales ending, with consumer hardware explicitly unaffected
   ([SiliconANGLE, 2026-01-16](https://siliconangle.com/2026/01/16/meta-stop-selling-quest-headsets-businesses-discontinue-multiple-vr-features/)).
3. **Prices went UP on 2026-04-19, on memory-chip costs, not tariffs.** 3S
   128 GB 329.99 → 359.99 €; Quest 3 512 GB 549.99 → 619.99 €
   ([Meta, 2026-04-16](https://www.meta.com/blog/update-meta-quest-pricing/)).
   Quest 3 took a 70 € hit against the 3S's 30 €, so the gap between them
   widened by 40 € this year. With the memory crunch ongoing, **waiting is more
   likely to cost than to save.**

### The spec gap, and one premise in the brief that is wrong

**The brief assumed the 3S has "worse passthrough cameras". It does not — the
cameras are identical, and Meta says so on its own page:** "Full colour
passthrough (4 MP, 18 PPD)" for both
([compare page](https://www.meta.com/gb/quest/compare/), 2026-09-11). Meta's
Passthrough Camera API documentation gives the same numbers for both devices
with no per-device caveat anywhere: **1280 × 960 and 1280 × 1280, 60 Hz, image
capture latency 20–40 ms**, ~1–2% GPU per streamed camera
([Meta, 2026-04-21](https://developers.meta.com/horizon/documentation/unity/unity-pca-overview/)).

Every degradation reviewers report is **downstream of the sensor** — the lower
resolution panel and the Fresnel optics you view the feed through. That
distinction decides the purchase, because a worse *display* degrades everything
equally while a worse *camera* would have degraded only the AR work.

| | Quest 3 | Quest 3S |
|---|---|---|
| chip | Snapdragon XR2 Gen 2, 8 GB, **6 CPU cores** | **identical** — Meta states it outright. (Note both are *fewer* cores than Quest 2/Pro's 8) |
| memory | LPDDR5, ~68 GB/s, 2.36 GHz | **LPDDR4X, ~42 GB/s, 2.05 GHz** — 38% less, on identical GPU silicon. ⚠️ Two independent sources now, **still not confirmed by Meta** |
| display, per eye | 2064 × 2208, **25 PPD**, two panels | 1832 × 1920, **20 PPD**, one shared panel (Quest 2's) |
| refresh | 72/90/120 Hz **plus 72–207 Hz, 240 Hz in dev mode** | 72/90/120 Hz only |
| lenses | pancake | **Fresnel** — god-rays, small sweet spot; iFixit found them *literally Quest 2 parts* |
| field of view | 110° × 96° | **96° × 90°** |
| IPD | continuous | **three positions**, 58/63/68 mm |
| passthrough cameras | 4 MP, 18 PPD | **identical** |
| depth | IR pattern projector assisting a CV pipeline | **two IR flood illuminators**, no pattern. **WebXR `depth-sensing` and `mesh-detection` are supported on both** |
| low-light tracking | **cannot track head or hands in the dark** | **tracks fine** — a 3S *advantage* |
| 3.5 mm jack | yes | **no** |
| proximity sensor | yes | **no** — and see §1.8: a doff already fails to stop a session on *either* headset, but the 3S has nothing to detect it with at all |
| battery claim | 2.2 h | 2.5 h |

**The depth story is inverted from how it is usually told.** Neither headset has
a hardware depth sensor in the LiDAR sense. UploadVR, 2025-05-02: "Quest 3 and
Quest 3S use computationally expensive computer vision algorithms to derive
depth (in Quest 3's case, assisted by a projected IR pattern)." Meta's own
wording is "environment depth *estimates*" from "an AI-powered depth engine".
So Quest 3's projector is a **texture aid**, and what the 3S loses is help on
**untextured surfaces — blank walls, plain floors.** Meta's Depth API and scene
mesh docs both name Quest 3 **and Quest 3S** with no 3S caveat
([Depth API, 2026-04-29](https://developers.meta.com/horizon/documentation/unity/unity-depthapi-overview/);
[scene mesh, 2026-07-06](https://developers.meta.com/horizon/documentation/unity/unity-scene-roommesh/)).
**And the web APIs do not distinguish them at all.** Meta's consumer permission
page splits spatial data as "scene: all devices; mesh: Quest 3/3S only; depth:
Quest 3/3S only" — the 3S is on the *supported* side of every line, and the
WebXR depth path is stereo disparity from the two front tracking cameras, which
both headsets have in identical form (§1.2). **Nobody has published a controlled
A/B of scene-mesh accuracy between the two.** Treat "no depth sensor therefore
worse MR" as unproven in the direction it is usually meant. And note from §1.7
that you cannot even tell the two apart by user agent — the 3S reports the
device token `Quest 3`.

### Two Quest-3-only specs that look decisive for this project, and are not

The temptation is to read the table above and conclude that a latency project
must have the Quest 3, on two rows. Both deserve a second look.

**Extended refresh rates — 72 to 207 Hz, 240 Hz in developer mode — are Quest 3
exclusive.** "Extended refresh rates are exclusive to Meta Quest 3. It is not
available on Meta Quest 3S", because the 3S panel cannot exceed 120 Hz.
DOCUMENTED, [Meta, 2026-08-27](https://developers.meta.com/horizon/documentation/unreal/unreal-change-display-refresh-rate/).
The frame budget goes from 13.9 ms at 72 Hz to 4.2 ms at 240 Hz.

⚠️ **But that is an Unreal Engine document, and there is no evidence WebXR can
reach those rates.** WebXR's lever is `XRSession.updateTargetFrameRate` against
`supportedFrameRates`, and **UNCONFIRMED** whether Quest Browser offers anything
above 120 there. Also: 9.7 ms of frame budget sits far below the noise of
everything this project actually measures — LL-HLS at 2.4 s, WHEP at 67 ms, the
relay at 1–2 ms plus Wi-Fi. It would matter for a frame-pacing study of the
*compositor*. That is not what positron does.

**The 3S has no 3.5 mm jack**, which removes the cheapest way to get an analogue
reference signal off a headset. That looks bad for a project whose box measures
"note to ear over the internet: 98.7 ms median".

⚠️ **But a jack is the *convenient* instrument, not the honest one.** A wired tap
measures to the DAC and stops; it cannot see the speaker, the driver or the
enclosure. A microphone in front of the headset measures what an ear gets,
which is the quantity actually in question — and this repo's own rule is to
measure the quantity in question rather than one adjacent to it. Positron
already owns the technique: `fluid-test.mjs` and `live-test.mjs` assert on RMS
before and after a note, and the same analysis works on a recorded microphone
signal. The jack would have been a shortcut; its absence forces the better
method.

**The one row that might genuinely decide it is the one Meta does not publish:**
the ~1.6× memory-bandwidth gap on an identical SoC. If real, it lands exactly on
GPU-bound generative scenes — lots of geometry, lots of texture, procedural
shaders — which is half of what the headset is being bought for. It is a
community teardown figure and **nobody has published a controlled comparison.**

### The recommendation

**Buy the 3S — and wait the twelve days for Connect first.**

Waiting is nearly free and asymmetric: Connect is on the 23rd, prices rose in
April rather than falling, and an unveiling that changes nothing costs you a
fortnight while one that changes something saves you 369 €. Nothing in the
project is blocked in the meantime — there is a harness to write (§3.3), a
`sampleRate` bug to fix (§4.2), and a `scene` demo to build against the desktop
emulator before the device arrives.

Buy the 3S rather than the Quest 3 because **the 248 € buys optics, not
capability.** Same chip, same passthrough cameras, same Passthrough Camera API
numbers, same Depth API and scene mesh support, and the 3S is *better* in low
light. What you give up is 5 PPD, 14° of horizontal field of view, pancake
lenses, continuous IPD and a headphone jack — comfort and the quality of your
own judgement of a picture, not the validity of a measurement.

**It is a false economy in exactly two cases.** If the work becomes "does this
generated scene *look* good", the softer window corrupts the judgement and 248 €
is cheap. And if the generative-shader half turns out to be memory-bandwidth
bound, the 3S is a slower machine wearing the same chip's name. Both are
testable rather than arguable — see below.

**The condition, restated because it is the actual risk:** build
`verify-quest.mjs` before the first WebXR demo is called green. This project's
most expensive recurring failure is a green suite over an unreachable code
path — 261/261 while a demo was fatally broken on an iPhone; 291 asserts across
three pages that had never played a frame of HLS. A headset is a fourth engine,
and Meta will hand you a fast, rich, fully green loop against an *emulator*
(§3.3) with a marketing line saying its coverage is "on par with the Meta Quest
Browser". That sentence is the iPhone mistake in a new accent.

### The one experiment, if a headset could be borrowed for an hour

**Ramp a GPU-bound WebXR scene in steps and read `adb logcat -s VrApi`.**

That is the memory-bandwidth question, which is the only 3S-versus-3 difference
that could invalidate the cheaper buy and the only one nobody has published a
number for. Draw the same scene at increasing triangle and texture cost, hold
the target frame rate, and record **the complexity at which `Stale` starts
climbing.** Then run the identical page on the other headset — or on the one
that gets bought — and compare the two thresholds. Reviewer adjectives about
god-rays are not that number; PPD is not that number; the published SoC name is
not that number and is in fact the thing that hides it.

Read it from `VrApi`, not from `requestAnimationFrame`, because the compositor
is on the far side of the boundary and the page's own opinion of its frame rate
is exactly the count CLAUDE.md says not to quote.

**And spend the first ten minutes on the free go/no-go**, which needs no code
written at all: open `https://positron.studio/moq/` on the headset and read the
page. In one load it settles whether `WebTransport` exists on the device
(`moqSupport()` reports it separately from WebCodecs and from the error string —
the whole reason that function has the shape it has), whether the `@moq/net`
user-agent gate lets a Quest through as §1.6 predicts, whether WebCodecs
encodes and decodes VP8 at 1280 × 720 on the XR2 Gen 2, and — if it connects —
the loopback glass-to-glass number on one clock, against the desktop's measured
p50 of 26.2 ms.

Then `adb reverse tcp:8890 tcp:8890` and `http://localhost:8890/demo/`, to see
the whole local development loop work once with your own eyes.

**The rest of the hour, in priority order** — all eight fit on one page that
POSTs its JSON to `ingest.positron.studio`, and the `adb reverse` route already
works:

1. `typeof WebTransport`, then `await transport.ready` against the relay. An
   `undefined` and a `ready` that never settles are different failures, and the
   error string will not tell you which (§1.4).
2. `AudioContext.baseLatency` and `outputLatency` — the last published number
   is five years old and from a Quest 2 (§4.2).
3. `session.enabledFeatures` after requesting everything — settles
   `camera-access`, `shared` and the flag questions in one line each.
4. `navigator.gpu` truthy and `requestAdapter()` non-null.
5. `SharedArrayBuffer` on a COOP/COEP-isolated page.
6. N concurrent decoders at real resolution, read via
   `getVideoPlaybackQuality().totalVideoFrames` per element. ⚠️ If the answer
   comes back *exactly* N−1 every time, suspect the collector.
7. `video.canPlayType('application/vnd.apple.mpegurl')`, and whether
   `video.src = <m3u8>` actually paints.
8. WebGL2 `MAX_SAMPLES` / `MAX_TEXTURE_SIZE` / renderer string;
   `navigator.hardwareConcurrency`; `navigator.userAgentData.brands`.

---

## 7. What would have to be true

The recommendation rests on these. Each is UNCONFIRMED or ESTIMATED, and each is
cheap to settle. They are ordered by how much each would change a decision.

1. **WebTransport exists on the device.** Completely unevidenced in either
   direction (§1.4) — BCD's answer is a mirror of Chrome for Android, not a
   measurement. If it is absent, the MoQ tier simply does not exist here and
   LL-HLS and WHEP carry everything. ⚠️ And if a **LAN** relay is ever wanted,
   Chromium M147's local-network-access gate for WebTransport is a second, newer
   obstacle.
2. **The ~38% memory-bandwidth gap either is not real or does not bind.**
   42 GB/s against 68 GB/s on identical GPU silicon and an identical six-core
   CPU — two independent sources, never confirmed by Meta, never A/B'd by
   anyone. This is the one spec that could make the 3S the wrong buy for
   generative-shader work, and the borrowed-hour experiment in §6 aims at it.
3. **Quest 3/3S Web Audio output latency is not ~45 ms.** The only published
   figure for any Quest is five years old and from a Quest 2 (§4.2). At 45 ms
   it is almost half of `rig/box`'s whole 98.7 ms note-to-ear budget, and no
   readout on the page would show it.
4. **`session.enabledFeatures` actually contains what §1.2 says it should** —
   specifically `camera-access` (or whatever Quest's token is) and `shared`. One
   line, and it settles three of this document's open questions at once.
5. **A Meta developer account with a team can be created.** Developer Mode needs
   one, Developer Mode gates `adb`, and `adb` gates the entire harness (§3.1).
   Organization *verification* is not required — an account with 2FA or a
   payment method is.
6. **The Quest Browser's DevTools socket answers `/json/version` over `adb
   forward`.** Three socket names are in the wild; discover it from
   `/proc/net/unix` rather than hard-coding one (§3.3).
7. **`userGesture: true` on `Runtime.evaluate` is enough to enter an immersive
   session** with our shell's plain click handlers. If not, the fallback is a
   synthetic mouse event followed by a DOM click, which somebody else has
   already had to write.
8. **Meta's "Shared Spaces" colocation flag still exists.** The demo repo has
   not been touched since 2025-06-03, there is no standardisation track, and
   **Meta's own current WebXR SDK does not support it** (§1.2). If it is gone,
   colocation on the web is gone and §2's Unity verdict deserves a second look.
9. **A model call of ~4 s is acceptable as the generated-upgrade tempo**, with
   the placeholder carrying those four seconds. If sub-second generation is a
   requirement rather than a preference, no current hosted model meets it and
   the architecture has to put the model somewhere else entirely.
10. **Nothing at Meta Connect on 23–24 September changes the answer.** Twelve
    days is the cost of finding out, and the Phoenix leak suggests an unveiling
    rather than a shipping product.
11. **`verify-quest.mjs` gets built before the first WebXR demo is called
    green.** The only item on this list that is a decision rather than a fact,
    and the one the recommendation actually rests on.

### Settled since the first draft, recorded so nobody re-researches them

- **`http://localhost` runs WebXR on a Quest.** Meta says so outright, and a
  third-party CDP harness does it (§3.2). Not an inference any more.
- **WebGPU as a page API shipped default-on in February 2024.** Only
  WebGPU-*inside*-an-immersive-session needs a flag (§1.3).
- **Raw passthrough camera access is shipped on the web**, not a native-only
  capability — which removed my strongest argument for Unity (§2).
- **`demo/shell/moq.mjs`'s VP8 is the wrong codec for this device**, and that is
  a fact about Quest 3/3S published by Meta rather than a suspicion (§4.3).

### Two things worth changing before a headset is ever plugged in

Both are independent of the purchase and both are already latent:

1. **`rig/box/listen.html` should request `sampleRate: 48000`** and print
   `ctx.sampleRate` in its readout (§4.2). The bug is live today on any 44.1 kHz
   output device.
2. **`openWire()` should distinguish a full room from a dead relay** (§5.3). A
   seventeenth client currently reconnect-loops forever against a `503 room full
   (16)` while the page says nothing.
