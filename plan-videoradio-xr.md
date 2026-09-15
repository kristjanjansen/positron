# plan-videoradio-xr: the scan landscape as a floor you stand on (2026-09-16)

Status: **not started.** Asked 2026-09-16: *"can we iplenent videoradio on vr?
just on the floor? as 'i am on a sea' fading out on all dirs? can we play
audio?"* `BACKLOG.md` carries the line.

> Read `plan-xr.md` §7 and `plan-xr-room.md` §1 first. Neither is re-derived
> here. The five WebXR defects this project has already paid for live at the top
> of `demo/shell/xr-panel.mjs` (lines 40 to 70) and are treated below as
> settled, not as open questions.

🔴 **NOTHING IN THIS PLAN IS GRADED BY RUNNING A HARNESS AGAINST
`/videoradio/`.** That page plays five ERR mounts, reached through our own
relay at `shout.positron.studio` but served upstream by somebody else's
Icecast, and CLAUDE.md's rule about `/radio/` applies for the same reason:
a red run is a fact about somebody else's server. Every check named below runs against
either `demo/shell/xr-panel.mjs`'s own `preview()` on a laptop, or a separate
probe page that decodes from our own R2 worker. Change `/videoradio/`,
syntax-check it, ship it.

---

## 0. The short answer

**Yes to the floor, and the picture is already a heightfield, which is the whole
reason this is worth doing rather than clever.** `OUT_FS` maps the field's V axis
to DEPTH and its R channel to HEIGHT: across is where in the eight seconds the
granulator is reading, into the distance is how long those grains were, up is how
many landed (`demo/videoradio/index.html:976-1187`). That is a real surface drawn
in fake perspective. A headset supplies real perspective, so the honest port is
to stop faking it.

**Yes to audio, with one measured caveat and three unmeasured ones.** The page
has NO media element anywhere: `demo/shell/mp3-stream.mjs` decodes the mount
itself into `AudioBufferSourceNode`s, so every media-element-in-a-session
question is inapplicable here. What is not known is whether a Quest keeps a
WebAudio graph running through an immersive session, at what output latency, and
whether a main-thread `fetch` plus demux plus `AudioDecoder` keeps up while the
render loop runs at 90 Hz. §3 designs the probe.

**`immersive-vr`, opaque, not passthrough.** §2.4.

**One thing must not happen: the chain must never be re-rendered per eye.** §1.4
has the arithmetic. It is the difference between 1.5x today's cost and a cliff.

---

## 1. Is the render chain reusable in an XR frame?

**Mostly yes, and the reason is an accident worth naming: `makeField(g)` already
takes the graphics context as an argument** (`demo/videoradio/index.html:1339`).
Every program, every framebuffer and every texture in it is created on whatever
`g` it is handed. `mirror` does exactly this with `liveMirror.attach(g)`
(`demo/mirror/index.html:575-591`), and `xr-panel.mjs` compiles a page's live
renderer into the session's own context on first draw.

### 1.1 The passes, sorted by whether they port

| pass | line | target | portable? |
|---|---|---|---|
| `ACC_FS` | 746 | 960x540 field | **yes.** Its space is the field's own. `gl_FragCoord.x` is a bucket stripe on a fixed 960 px width, not a screen. |
| `PRESENT_FS` | 809 | 960x540 field | **yes.** Same. |
| `BRIGHT_FS` | 873 | 240x135 glow | **yes.** |
| `BLUR_FS` | 886 | 240x135 glow, twice | **yes.** |
| `COPY_FS` | 866 | the canvas | **no, and it is simply not run.** It is the only pass that binds framebuffer `null`. In a session that is the default framebuffer, not the layer, so running it costs 518,400 fragments and paints nothing. The live path returns a texture instead. |
| `OUT_FS` | 912 | 960x540 composite | **runs, and means the wrong thing.** See below. |

### 1.2 What inside `OUT_FS` assumes a screen

Five things, all of them fine as a texture and wrong as a floor:

1. **The perspective itself** (`baseY` 1036, `widen` 1054, `fx` 1055). It
   builds a picture WITH A HORIZON IN IT. Laid flat on the ground that is a
   photograph of a landscape on the carpet, which is the failure mode this plan
   exists to avoid.
2. **Hidden-line removal** (`if (d < -w * occl) { near = ...; break; }`, line
   1184). This is a software depth buffer. A headset has a hardware one.
3. **The scanlines** (line 1321): `cos(gl_FragCoord.y * 3.14159)`, a period fixed
   in TARGET pixels. Deliberate, and correct on a screen. On a plane in
   perspective the period in the eye varies with distance, so the far half of the
   floor is a moire field. It must be recomputed per world metre or dropped.
4. **The vignette** (line 1326), `dot(uv - 0.5, uv - 0.5)`. On a floor it is a
   dark ring at a fixed radius on the ground rather than a softening at the edge
   of vision. The radial fade in §2.3 replaces it and does the job properly.
5. **The three-band feedback** (`fbTap`, line 1278) zooms about uv (0.5, 0.5).
   In field space that is the centre of the picture; on a floor it is a fixed
   point on the ground that everything crawls outward from, directly under you.
   That is a strong vection cue. Risk R6.

The mirror fold (`LOOK.mirror`, line 1013) and the glitch bands (line 946) are
screen-space too, but `quartz` has `mirror: 0` and the glitch is gated on `jolt`,
so neither bites on the shipping look.

### 1.3 Uniforms and sizes, named

`FIELD_W` 960, `FIELD_H` 540 (line 169). `GLOW_W` 240, `GLOW_H` 135 (line 1394).
The data texture is 64 x 4 RGBA8, 1024 bytes, read with `texelFetch` only
(line 380), and its layout version sits at row 3, x 63. Uniforms are `uRes`,
`uData`, `uPrev`, `uField`, `uSrc`, `uGlow`, `uPrevOut`, `uDir`
(the six programs are declared at lines 1373-1378). Seven full-size targets
exist: `A`, `B`, `P`, `Q`, `shown`, plus `glowA`/`glowB` at a quarter.

None of them changes in a headset. **The field is 960x540 whatever the
framebuffer is**, because it is the instrument's own resolution and not a
picture of a screen.

### 1.4 What 3360x1760 twice a frame costs, against what the page draws today

Per eye 1680x1760, both eyes 5,913,600 fragments, one framebuffer, measured on a
Quest 3 and recorded in CLAUDE.md. Rate 89.8 fps in VR, 90.0 in passthrough.

- **Today**, per frame: about 2.07 Mfrag across the six passes, of which `OUT_FS`
  carries a loop up to 46 deep with a `texture()` and two `texelFetch`es an
  iteration. Plus the copy to the canvas.
- **In a headset, done right**: the SAME 2.07 Mfrag chain, once per frame, at
  89.8 Hz instead of the window's 60. **1.5x, and nothing else.** Plus the floor:
  5,913,600 fragments a frame at roughly one texture fetch, one distance and one
  mix each, which is 531 Mfrag/s of very cheap work. `blocks` already holds 89.8
  fps drawing a whole room, so that half is not the question.
- **In a headset, done wrong**: re-running the chain per eye at framebuffer
  resolution is 5,913,600 x up to 46 iterations = 272 M inner iterations a frame,
  24 G/s. That is the cliff, and `xr-panel.mjs:1379` already carries the rule in
  writing: once per frame, never per eye, and before the layer's framebuffer is
  bound because the renderer binds one of its own.

⚠️ **1680x1760 is TALLER than it is wide** (aspect 0.95). Nothing in the floor
mapping may assume 16:9.

### 1.5 Two couplings to fix before `makeField` is handed a second context

- `g.bindVertexArray(g.createVertexArray())` at line 1371 binds a VAO once and
  never restores it. In a context shared with `xr-panel.mjs` that stomps the
  caller's state. `drawEye` rebinds its own VAO each eye and nulls it at the end,
  so it survives today by luck. Bind the field's VAO in `step()` and null it
  after, or the first time somebody reorders `drawEye` this becomes a picture
  that disappears for reasons nobody can see.
- `step()` ends with the canvas copy (lines 1449-1455). Split `step()` into
  `render(bytes)` returning the composite texture, and `present()` doing the
  canvas copy. The window calls both; the session calls only the first.

### 1.6 Verdict

**The accumulate, present and bloom half ports unchanged and should be shared
verbatim.** `OUT_FS` should NOT be run on the floor: it is re-authored as a
vertex displacement plus a fragment shading in §2. The two ends then agree
because both compile from the same `LOOK` object (line 602), which is one const
and must stay one.

---

## 2. The floor

### 2.1 Geometry: a displaced mesh, not a textured quad

A quad with `OUT_FS`'s output on it is a photograph of a landscape lying on the
ground. The picture already IS a heightfield, so displace real vertices and let
the depth buffer do the occlusion that line 1184 and the wedge above it are
doing by hand.

- **`LOOK.rows` line strips** (46 for `quartz`), laid at 46 depths along the
  duration axis. Keeping the row count is keeping the picture: the note at line
  989 records that 72 rows merged into a grey ramp and that the GAP between
  lines is worth more than the line.
- **256 columns a row**, up from the 64 buckets, using the facet interpolation
  that already exists at lines 1065-1078. 46 x 256 = 11,776 vertices. Nothing.
- **Height in the vertex shader**, from `texelFetch` on the same 64 x 4 data
  texture plus `texture(uField, ...)`. GLES 3.0 guarantees 16 vertex texture
  units, so this is not a capability question on an Adreno 740.
- **A skirt under each line**, filled in the floor's own colour, depth-written,
  drawn with the line on top. That is the Unknown Pleasures occlusion, in 3D, for
  free, and it deletes `occl`, `near` and the `break`.
- **Amplitude in metres**, not in uv. Start at 0.15 m of swell rising to 0.6 m on
  a loud passage, from the same `ampA`/`ampL`/`ampB`/`ampM` terms scaled once.
- **Span**: 24 m across (time) by 24 m deep (duration), centred on the viewer's
  floor position. Both inside the fade's outer radius, so no edge is ever
  witnessed. `demo/floor/index.html:141-150` is the same reasoning about the same
  problem and it was paid for with a reported bug.

### 2.2 Texture source

**Render the chain once per frame into the session's context and read the
`shown` target as the field.** Not per eye (§1.4), and not uploaded from the
window's canvas: a `texImage2D` from a canvas is a copy across the bus and a
photograph of a frame taken a frame ago, which is the A/B `mirror` already
measured. The vertex stage samples `shown` and the data texture; the fragment
stage does the phosphor ramp (lines 1211-1216) and the halo/core wedge (lines
1173-1174) in world space.

⚠️ **The session's chain starts empty.** `A`, `P` and `Q` are new targets in a
new context, and `quartz` has `keep: 0.995`, a trail that takes about half a
minute to build. The picture will open nearly black in the headset. Accept it and
say so in the log line, or seed the session's targets from a `readTarget` of the
window's. Recommend accepting: a readback plus an upload on the way into a
session is 2 MB of latency at the one moment timers stop being generous.

### 2.3 The fade

**An alpha ramp in WORLD space, measured from the viewer's floor position, mixed
into the clear colour. No blending.**

```
float far = distance(worldXZ, eyeXZ);
float a   = 1.0 - smoothstep(FADE_FROM, FADE_TO, far);
frag = vec4(mix(FLOOR_RGB, c, a), 1.0);
```

That is `demo/floor/index.html:322` and `:414`, verbatim in shape. Four decisions
it settles, each of them already paid for on that page:

1. **From the eye, not from the floor's centre.** A fade centred anywhere else
   moves under you as you walk, and the far side reaches full opacity behind your
   back.
2. **Mix, not `gl.BLEND`.** The lines and their skirts overlap in depth. A
   transparent fringe that writes depth punches a hole the second eye cannot
   fill; one that does not write depth needs sorting. Mixing into a known colour
   needs neither.
3. 🔴 **The fade target and the clear colour are ONE triple, typed once.**
   `demo/floor/index.html:154-168` records what happens otherwise: the ring of
   faded geometry read as a visibly brighter disc on a darker void, a rim nobody
   drew, at exactly the radius the fade was meant to hide. They were out by
   nearly a factor of two.
4. **Two radii, not one.** Geometry out to `FADE_TO`, fading from `FADE_FROM`.
   Suggested 11 m and 16 m, the same band that page settled on, so the far edge
   of what is drawn is already gone before it is reached.

⚠️ **The phosphor's dim end is the problem, not the bright end.** `COLD` at
`chroma: 1.0` is (0.38, 0.56, 0.92) times a `lit` near zero, which is a very dark
blue. Against `FLOOR_RGB` at (0.018, 0.022, 0.030) the fade has almost nothing to
travel, so most of the sea will vanish within a metre or two of where the ramp
starts. Measure the mean `lit` across the mesh before tuning the radii, or the
radii will be tuned against a picture that was never there. That is exactly the
mistake recorded at `demo/videoradio/index.html:509-513`.

### 2.4 `immersive-vr`, and passthrough is a separate question

**Recommend `immersive-vr`.** Three reasons, in order of how much they cost:

1. **The look is unusable over a lit room.** Its whole dim end is near-black at
   low chroma. Under `alpha-blend`, black composites as your carpet where the
   alpha is low and as a black hole where it is high. The picture that survives
   is the handful of bright crests, which is not a sea.
2. **"I am on a sea" wants a void to fade into.** A sea that fades into the
   actual floor of the actual room is a different and weaker image, and §2.3's
   fade-by-mixing cannot be done at all against a background the page cannot see.
3. `demo/videoradio/index.html:331` creates its context `alpha: false`, which
   makes passthrough impossible by construction. `xr-panel.mjs` creates its own
   context `alpha: true` (line 787) so this is not a blocker, but it does mean
   the session's context is not the page's, which §1.5 already requires.

🔴 **If passthrough is tried later, assert on `session.environmentBlendMode`,
never on the session name.** `xr-panel.mjs:1029` is the one place in this repo
where those two are separated, and a session called `immersive-ar` that
composites `opaque` presents as a drawing bug rather than as a session one.

### 2.5 Which module owns the session

**Extend `demo/shell/xr-panel.mjs` with a floor surface. Do not write a fourth
session path.** There are already three (`blocks`, `floor`, and this module), and
every one of the five defects is silent from outside.

The shape: a new `surface` option beside `panels`, `{ attach(gl), draw({tSec}),
w, d, fade: [from, to], y }`, drawn in `drawEye` after the room and before the
grab bars. Call it with:

```js
createXRPanels({
  panels: [],
  surface: theSea,
  room: { seed: 424242, sky: false, things: false, bg: FLOOR_RGB },
  onFrame: () => stepTheChain(),
  log: (m, k) => d.log(m, k),
});
```

⚠️ `room: null` is the wrong choice even though this page wants no furniture.
`theTablet`, `theHands` and therefore the quit badge's grips are all built only
when there is a room (`xr-panel.mjs:490-493`), so a page with no room has no
visible way out and falls back to the grip and the dead-man's switch. Keep the
room with `sky: false, things: false`: what is left is the dotted grid, which is
the ground the sea sits on, plus the controller, the beam and the badge. Whether
the grid fights the sea is a looking question and belongs in stage B.

---

## 3. Audio

### 3.1 What is KNOWN, from this repo

- **There is no media element.** `demo/shell/mp3-stream.mjs` exists precisely
  because `createMediaElementSource` was measured silent on iOS: the analyser
  read 0.0000 for 50 seconds while the element played. The mount is fetched,
  ICY-demuxed, frame-split, decoded by `AudioDecoder` or `decodeAudioData`, and
  scheduled as `AudioBufferSourceNode`s. So every question about elements,
  AirPlay, `disableRemotePlayback` and media sessions is inapplicable here.
- **The granulator is on the audio thread.** `bootScsynth` is an AudioWorklet
  (`demo/shell/scsynth.mjs`), insulated from a 90 Hz render loop.
- 🔴 **The loop recorder is NOT.** `loopTap = ctx.createScriptProcessor(4096, 2,
  2)` at `demo/videoradio/index.html:1674` runs on the MAIN thread, and the main
  thread in a session is the one running the XR frame callback. This is the one
  named audio-thread hazard in the page and the tour uses it every lap.
- 🔴 **The gate needs a TRUSTED press and there is none inside a session.**
  `demo/videoradio/index.html:1576-1587` opens the output gain only on a trusted
  `pointerdown` or `keydown` on the Play button. Nothing on a controller is a DOM
  event. So the press that enters VR must also open the gate, or a wearer stands
  in a silent sea with no way to fix it.
- **`navigator.audioSession.type = 'playback'`** is already claimed at line 1596,
  guarded as a capability test. It is WebKit-only and a no-op on the Quest
  Browser, which is fine; it must stay a capability test.
- **Read, not measured here:** `research/quest-xr-2026-09.md` §4.2 records that
  entering an immersive session does not suspend the `AudioContext` on a Quest,
  that Horizon OS raises `visible-blurred` for system UI, and that background
  audio has been deliberate since v47. That is documentation, not a measurement
  taken by this project.

### 3.2 What is UNMEASURED, and must not be claimed

1. Whether the `AudioContext` on a Quest 3/3S actually keeps running through
   `requestSession`, through the system menu, and through a doff.
2. `ctx.sampleRate`, `ctx.baseLatency`, `ctx.outputLatency` on the device. The
   only published Quest figure anywhere is five years old and from a Quest 2
   (research §4.2, §7 item 3).
3. Whether `AudioDecoder` configures for `mpeg` and `adts` on the Quest Browser
   at all, and which of `mp3-stream.mjs`'s two paths it takes.
4. Whether a main-thread `fetch` plus demux plus decode keeps up at 90 Hz, and
   whether the `ScriptProcessorNode` underruns there.
5. Whether `visibilitychange` on a doff suspends the context, and how late.

### 3.3 The smallest probe

🔴 **It must not touch a third-party mount.** Otherwise "the headset went silent"
and "Radio 1965 was down, which is its normal state" are the same observation.

A new page, one slug, `xr: true` in `demo/manifest.mjs` so `verify-quest.mjs`
picks it up by tag. Working name `earshot`; the naming rule in `plan-names.md`
decides. It has no third-party URL in it at all.

**Arm 1, synthesised.** A 440 Hz `OscillatorNode` into the same two-analyser
shape `/videoradio/` uses, one either side of a gain. Enter `immersive-vr` with
`createXRPanels` and a single flat-colour surface. Once a second, inside the
session, beacon: `ctx.state`, `ctx.sampleRate`, `ctx.baseLatency`,
`ctx.outputLatency`, and the post-gate analyser RMS. Answers questions 1 and 2.

**Arm 2, decoded.** Swap the oscillator for `createMp3Stream` pointed at our own
R2 worker, `https://positron-station.kristjan-jansen.workers.dev`
(`demo/station/index.html:17`). Beacon `stats().path`, `framing`, `codec`,
`sampleRate`, `channels`, `underruns`, `dropped`, `errors`. Answers 3 and 4.

**Arm 3, the ScriptProcessor.** Add the same 4096-frame `createScriptProcessor`
wired to a silent sink and count callbacks against wall time. A processor that
should fire 11.7 times a second at 48 kHz and fires 9 is the answer to question
4, and it is invisible in every other reading.

**The negative controls, and they are what make the run mean anything:**

- **The same five numbers taken in the WINDOW, before entering and after
  leaving, on the same run.** Without the window arm, 0.0000 in the session
  cannot be told from 0.0000 on this page.
- **Sabotage once.** Disconnect the gate for two seconds mid-session and confirm
  the RMS reader reports zero. A meter that cannot read zero is not a meter, and
  this repo has shipped that mistake.

**Delivery:** `navigator.sendBeacon` to `https://pub.positron.studio/log`, which
is what `beacon()` in `xr-panel.mjs:102` already does, because `createShipper`
holds for 2 s and entering a session is exactly when timers stop being generous.
Read back at `https://pub.positron.studio/logs?format=text`.

⚠️ **A doff watchdog, and here it is about somebody else's bandwidth rather than
our bill.** A headset left on a table holding an open Icecast connection is a
listener on a mount we do not own, for as long as the battery lasts. Stop the
stream on `visibilitychange`, and say in the log that it may be about ten seconds
late.

---

## 4. Entry, exit, instrumentation and the deadline

Everything here exists in `demo/shell/xr-panel.mjs` and the page inherits it. The
list is what the page must not undo:

| thing | where | why |
|---|---|---|
| support taken once at load, never re-awaited in the handler | 118-127 | `requestSession` needs a transient activation and awaiting spends it |
| `local-floor` required, `plane-detection` optional | 972-974 | the sea sits on the floor; a headset that never ran Space Setup must still get in |
| 90 s deadline on `requestSession`, 6 s on everything after | 944-984 | a room-data permission prompt is a human answering a question, and a 6 s deadline under one left a Quest black with a restart to get out |
| a late session is ENDED, not abandoned | 977-982 | otherwise the worst case is an immersive session nothing is drawing |
| the layer read INSIDE the frame callback | 1272-1275 | `updateRenderState` queues; `baseLayer` is null until the next frame |
| only eye 0 clears colour, the rest clear depth in a scissor | 1148-1194 | `gl.clear` ignores the viewport |
| `bindAttribLocation` before `linkProgram` | 794 | called after, it is a no-op that reads like a fix |
| `gl.getError()` read and published on the first frame | 1560 | a Quest drew a correct-looking picture with 1282 pending |
| quit badge, held, with a ring | `xr-quit.mjs:91` | the way out belongs to the page |
| dead-man's switch at 4 s with nothing drawn | 1119-1126 | a black room with no way out is the failure this catches |

**Three things this page must add.**

1. **A deadline around the surface's `attach()`.** It compiles six programs and
   allocates seven targets in a context that has just been created. A throw there
   escapes the frame callback and silently deletes everything below it, which is
   how `blocks` (called `scene` in the comments that record it) lost its status
   panel for the whole life of the page. Wrap it in
   the module's own `step()` helper so a compile failure names itself:
   `beacon('FAIL the sea would not compile: <message>')`, then end the session.
2. **A NO-DATA deadline, which is the one nobody has.** Four seconds into a
   session with `state.frames > 0` but no grain reported and no follower moving,
   beacon it. A silent decoder and a black picture look identical from inside the
   headset, and without this line the wearer's report is "it did not work", which
   names neither.
3. **The gate opened by the press that enters.** §3.1. The VR control's handler
   is trusted, so it starts the machine if it is not started and opens the gate in
   the same turn.

**What gets beaconed, in order:** `… requestSession immersive-vr` / `ok` per step
(already), then `session created · blend <mode> · refresh <n>`, then `sea
attached · <rows> rows x <cols> columns · fade <from>..<to> m`, then once a second
`fps <n> · grains <n> · rms <n> · ctx <state>`, then on end `session ended · <n>
frames · <fps> · <reason>`. Every line via `sendBeacon`, including the
uncaught-error handler, because a net meant to catch a silent failure must not
itself be waiting on the timer that stopped.

---

## 5. Stages, and what grades each one

### Stage A. The session, the plane, the fade, the sound. No sea.

Ships: the `surface` option in `xr-panel.mjs`; a flat quad on the floor carrying
the `shown` target; the world-space radial fade; the gate opened on entry; the
beacons; the doff watchdog.

**Graded by:** `xr-panel.mjs`'s `preview()` (line 1622) on a laptop, which drives
the same `drawEye` twice a frame into an off-screen canvas and returns a pixel
spread and the error flag. Asserts: the surface attached, the programs linked,
`gl.getError()` is 0, and the ink at the fade's inner radius is brighter than the
ink at the outer one by a stated margin.

**The check that fails before it passes:** set `FADE_TO` below `FADE_FROM` and
confirm the spread assert goes red. A fade assert that passes on an inverted
ramp is measuring nothing.

**And a second one, because it is the one that actually bites:** draw the surface
with a constant white texture for one run. If the fade ring is correct there, the
geometry and the fade are correct and any remaining darkness is §2.3's dim-end
problem, not a bug. That separation is the whole of risk R4.

### Stage B. The sea.

Ships: the displaced mesh, the skirts, the phosphor shading in world space, the
scanlines recomputed per world metre or dropped, the vignette dropped.

**Graded by:** `preview()` for compile, error flag and a silhouette test (the
mesh must occlude: a pixel behind a crest must be the skirt's colour, not the
line's). Then one headset run, and the picture itself is graded by a person
wearing it. **Say that out loud rather than inventing a number for it.**

**The check that fails before it passes:** set every height to zero and confirm
the silhouette test goes red. A flat mesh that passes an occlusion test is
testing the clear colour.

### Stage C. The audio numbers.

Ships: the probe page of §3.3 and its three arms.

**Graded by:** `node demo/verify-quest.mjs earshot` against a real headset, plus
the window-arm negative control and the gate sabotage. It grades nothing about
`/videoradio/` and touches no third-party mount.

**The check that fails before it passes:** the gate sabotage. If the RMS does not
fall to zero when the gate is closed, the run says nothing about whether sound
was playing.

### What CANNOT be checked by `verify.mjs`, and why

- **Anything with a GL context in it.** `verify.mjs` runs Chrome with
  `--disable-gpu`, where `getContext('webgl2')` is null. `videoradio` already
  carries `gl: true` for exactly this, so it is graded by `verify-gl.mjs`.
- **Anything behind `requestSession`.** Desktop Chrome has a genuinely native
  `navigator.xr` and answers `immersive-vr: false` (measured, and written into
  `verify-quest.mjs`'s header). The session branch is unreachable on any laptop,
  and the Immersive Web Emulator satisfying it is the iPhone mistake in a new
  accent.
- **Any timing at all.** `preview()`'s own note refuses this: no compositor, no
  reprojection, no 3360x1760 framebuffer. It answers "does it draw and is it
  clean" and nothing about a frame rate.
- **The ink in a headset.** `Page.captureScreenshot` cannot see the immersive
  view, only the 2D panel (research §3.3).
- **Audio output latency, whether the context survives, whether `AudioDecoder`
  configures.** All device facts. §3.3.
- 🔴 **And `/videoradio/` itself is not to be run by any harness**, because it
  plays five ERR mounts served upstream by somebody else's Icecast. Its XR half
  is graded through `xr-panel.mjs`'s `preview()` and through the probe page,
  never by pointing `verify-quest.mjs` at the slug.

---

## 6. Risks, each with the measurement that separates it from its alternative

**R1. "The chain is too slow at 90 Hz" against "the floor draw is too slow."**
Step the chain every other frame while drawing the floor every frame. If the rate
recovers, the chain dominates; if it does not, the floor does. The existing
half-resolution probe hook (`xr-panel.mjs:1394-1408`) gives the second point that
turns "it costs this much" into "and resolution is or is not the lever".

**R2. "The audio broke because of the session" against "the mount was down."**
The probe decodes from our own R2 worker, never from Icecast, and takes the same
five numbers in the window before entering and after leaving on the same run.
Four of eight mounts being down is the normal state of that station; an A/B
against it would be an A/B where both arms share the confound.

**R3. "Nothing drew" against "it drew and is invisible."** `state.frames` and the
first-frame `gl.getError()` are already published (`xr-panel.mjs:1554-1560`).
Frames counted with a clean error flag and nothing visible is a fade, alpha or
scale problem; zero frames is a session problem. These are opposite fixes and
they look identical from a headset.

**R4. "The fade radius is wrong" against "the picture is too dark to fade."**
Stage A's white-texture run. See §2.3's warning: the mean `lit` across the mesh
has to be measured before the radii are tuned, or the radii are tuned against a
picture that was never drawn.

**R5. "It reads as a sea" against "it reads as a photograph of a landscape on the
floor."** Only stage B's displaced arm can be a sea, so the separation IS the two
stages. There is no instrument for this and nobody should invent one: the grader
is a person wearing the headset, and the plan says so.

**R6. Vection, and whether the feedback tunnel causes it.** The three-band
feedback pulls everything outward from a fixed point on the ground under you
(§1.2 item 5). Run once with `keep: 0.995` and once with the trail off entirely.
Reported by the wearer, not measured. ⚠️ If it does cause it, the fix is to take
the tunnel off the floor rather than to slow it down: a slow outward crawl in the
periphery is the strongest vection cue there is.

**R7. The room's dotted grid fighting the sea.** One run with the grid on, one
with it off. `bg` is already a per-page option (`mirror` passes one).

**R8. Two compiled copies of the same look drifting apart.** `makeField` is
called once for the window's context and once for the session's, so the `LOOK`
constants are compiled into two sets of programs. `mirror`'s own note records why
this matters: one shader string, because the live renderer is built long after a
look may have changed. Both compile from the single `LOOK` const at line 602, and
the page asserts that the two report the same `LOOK_NAME`.

**R9. The `ScriptProcessorNode` under a 90 Hz loop.** Arm 3 of §3.3 counts its
callbacks against wall time. The loop feature failing in a headset while the
station plays perfectly is a defect that no readout on that page can currently
see, because the page reports grains and not loop-tap callbacks.

**R10. The picture opening black in the headset.** `keep: 0.995` over a fresh
accumulator is about half a minute of rebuild (§2.2). It will be reported as
broken. Either say it in the log line on entry, or seed the targets. The
separation from a real failure is the no-data beacon of §4 item 2: a black
picture with grains arriving is a trail filling, and a black picture with no
grains is the audio having died.

---

## 7. What would have to be true

1. The `AudioContext` survives `requestSession` on a Quest 3/3S. Documented by
   Meta, never measured here. If it does not, this whole page is a silent
   picture and the ask is answered no.
2. `AudioDecoder` configures for `mpeg` on the Quest Browser, or
   `decodeAudioData` carries it with seams. `mp3-stream.mjs` reports which path
   ran, so this costs one line to settle.
3. A main-thread decode keeps up at 90 Hz. If not, the demux and decode move to a
   Worker, which is a real change to a shared module and should be priced before
   it is promised.
4. The displaced mesh at 46 x 256 with skirts holds 89.8 fps alongside the
   960x540 chain. Estimated comfortably, measured by nobody.
5. Somebody is willing to wear it and say whether it is a sea. Stage B has no
   other grader.
