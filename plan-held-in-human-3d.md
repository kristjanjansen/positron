# plan-held-in-human-3d, what of this piece a headset could actually be given

Written 2026-09-19, the same day the score arrived. It answers one question
Kristjan asked about **Held in Human**: *"what can you actually simulate in
3d?"*

Read `plan-held-in-human-score.md` first. That document is what the score SAYS.
This one is what a browser could DO with it, and the two are different questions
with different answers. Nothing below re-derives a number that file already
holds; where a number appears here it is either new or it is re-read from
`demo/resources/held-in-human.json`, which is the machine readable form of the
score and outranks both documents.

Every claim carries one of four labels:

- **MEASURED**, I ran it on this machine and read the number.
- **READ**, a file or a document says it and I am quoting it.
- **INFERRED**, my reasoning from the two.
- **NOT MEASURED**, it needs a headset and there is no headset attached here.

🔴 **No Quest was used for anything in this document.** Every statement about
what a Meta Quest does is READ or INFERRED. The three places where one headset
session would change an answer are named as they come up and collected in §8.

🔴 **The piece is somebody else's work.** §9 is the rights section and it is
short on purpose.

---

## 0. The short answer, in three lines and a recommendation

**Bucket 1, what the score fully specifies and a browser can do.** The whole
clock (eight scenes, eleven events of which two are waits, 775.2 s with the
maze taken out),
the opacity channel (eight values and eight ramps, which in this repo is the
alpha argument of a `gl.clearColor` call that is currently hard-coded to zero in
two files), the intro's 318 keystrokes at a position 3.40 m in front of the
visitor, the sixteen dialogue lines at two placements, the twenty-four QandA
lines with their eight silences, the outro paragraph, the credits scroll, and
the cylinder's radius.

**Bucket 2, what the score specifies and a browser cannot do.** One thing, and
it is the thing the piece is built out of: **the colour lookup table on the
passthrough image.** In an `alpha-blend` session the real room reaches the
visitor as `room * (1 - alpha)`, and `alpha` is ONE number shared by all three
colour channels. A page can dim the room and it can lay a colour on top of it.
It cannot touch the room's red without touching its green, which is the smallest
thing a colour table does.

**Bucket 3, what the score does not specify at all.** The maze, because
`maze.json` is not in the file and the score's only knob over it is a 0.4 m
offset. The sound, all of it: 175.9 s of recorded voice across 31 lines, 22.7%
of a visit, present as durations and absent as audio. `Ghost trace`, which is a
time and a name. `HoldMe`, which is an anchor point and a length. The river's
pacing. Every typeface and every type size in the piece. And the facing and the
placement of four of the eight scenes.

**Recommendation.** A faithful version is not possible from this file and a
partial one would misrepresent the piece, so do not build one. There is one
honest thing and it is a measurement rather than a demo: make the passthrough
alpha a parameter instead of a hard-coded zero, drive it from the score's own
eight values, and take it into a headset once. §8 says what that would settle
and what it would not.

---

## 1. The passthrough verdict, which decides everything else

The premise I was given to check was: **WebXR hands a page no passthrough
pixels. A session can composite over the room, but the page draws INTO that
composite and never sees the camera image.** If that is right, then the two
channels that shape the whole piece are exactly what a browser cannot do.

It is half right, it is out of date in one direction, and the half that survives
is the half that matters. Here is how I checked.

### 1.1 What I ran

**MEASURED, 2026-09-19.** I launched Chrome 153.0.8010.53 with a throwaway
profile, navigated it to a `http://127.0.0.1` origin so `isSecureContext` is
true, and read the WebXR surface out of the page. Two runs, headless and headed,
same answer. The profile was removed on the way out.

⚠️ **The first run of that probe answered "there is no WebXR here" and it was
wrong.** On `about:blank` the whole `XR*` family is absent, because
`navigator.xr` is gated on a secure context. On a real origin, 50 `XR*`
constructors appear. That is worth writing down because it is a probe that
returns a confident negative for a reason that has nothing to do with the
question, which is this project's standing failure mode in a new costume.

The two answers that matter:

```
XRRenderState.prototype:  baseLayer  constructor  depthFar  depthNear
                          inlineVerticalFieldOfView  layers

XRWebGLBinding.prototype: constructor  createCubeLayer  createCylinderLayer
                          createEquirectLayer  createProjectionLayer
                          createQuadLayer  getCameraImage  getDepthInformation
                          getReflectionCubeMap  getSubImage  getViewSubImage
                          nativeProjectionScaleFactor  usesDepthValues
```

`XRSession.prototype` carries `environmentBlendMode`, `enabledFeatures`,
`interactionMode`, the depth sensing pair, `initiateRoomCapture` and the usual
session machinery. `XRView.prototype` carries `camera`. `XRCamera` is a global.

**So the render state has six members and not one of them is about the
environment.** There is no opacity, no tint, no table, no blend control. The
session reports its blend mode and does not take one. That is the flat answer to
the second half of the premise, and it is a MEASURED fact about the Chromium the
Quest Browser is built on rather than a reading of a specification.

**And `getCameraImage` is there**, which is the half of the premise that is out
of date. See §1.5.

### 1.2 The arithmetic, which is the real proof

A session with `environmentBlendMode: alpha-blend` composites the page over the
room with source-over blending. Where the page's framebuffer holds colour `c`
and alpha `a`, the visitor sees:

```
out = c * a  +  room * (1 - a)
```

Read what that gives a page:

- **The room only ever appears multiplied by `(1 - a)`.** One scalar.
- **`a` is one channel.** There is no separate alpha for red, green and blue,
  because a framebuffer has one alpha channel and the compositor reads that one.
- **`c * a` is added on top**, and `c` does have three channels, so a page can
  lay any colour over the room at any strength.

The family of operations available to a page is therefore `out = s * room + k`,
where `s` is a **scalar** and `k` is a colour. Per pixel, `s` and `k` can both
vary, so a page can dim one part of the room more than another and wash one part
a different colour from another. What a page can never do is give the room's
three channels different gains, because there is one alpha and it multiplies all
three.

**A colour lookup table is, at its very simplest, a per-channel curve.** Every
LUT worth the name is at minimum three independent transfer functions and is
usually a three-dimensional table where the output depends on all three inputs
at once. The one operation a page cannot perform is the one operation a LUT is
defined by.

⚠️ **And there is no second pass to escape into.** The compositor blends once,
from one RGBA framebuffer, so drawing the scene in four passes still hands it a
single colour and a single alpha per pixel. The other blend mode the
specification defines is `additive`, for an optical see-through display, where
the visitor sees `room + c` and a page cannot darken the room at all. Quest
video passthrough reports `alpha-blend`, which is the better of the two for this
piece and is still one alpha.

INFERRED from the blend equation and MEASURED from the API surface: **the LUT
channel of this score is not reachable in a WebXR session, and it is not
reachable by a better page.**

### 1.3 Why a coloured quad is not a lookup table, in numbers

The obvious answer is to draw a full-view green quad at low alpha and call it
the green LUT. Take the dialogue scene, where the score asks for `green` at
opacity 0.70, and the cylinder, where it asks for `green` at opacity 0.15.

A quad of colour `c` at alpha `a` does `out = (1 - a) * room + a * c`. Three
things follow and all three are wrong for this piece:

1. **It is a lift, not a gain.** A green quad adds `a` to the green channel of
   every pixel equally, the black ones as much as the bright ones. That is fog.
   A grade moves the mid-tones and leaves the blacks alone, or crushes the blacks
   and leaves the mid-tones alone. Those look nothing like each other.
2. **It always lowers contrast, by exactly `(1 - a)` in every channel.** The
   difference between any two pixels shrinks by that factor, without exception.
   The score's own comment on the master dimmer is *"warning: it reduces the
   overall contrast, which makes it dull"*, so the authors named this cost and
   put it on a control they then left at 1.0. Implementing the colour channel as
   a wash pays that cost a second time, on a channel that was never supposed to
   have it.
3. 🔴 **It spends the dimmer's own budget.** This is the one that kills it. The
   page has one alpha. The opacity channel already needs it. In the cylinder the
   score asks for the room at 0.15, which is `a = 0.85`. Substitute green:

   ```
   out.r = 0.15 * room.r
   out.g = 0.15 * room.g + 0.85
   out.b = 0.15 * room.b
   ```

   The green channel is pinned above 0.85 everywhere in the frame. That is a
   green card with a ghost in it, not a dark room graded green.

**The score keeps two channels because they are two operations.** It runs eight
opacity values against four colour tables with independent fade times, and the
two lists disagree with each other constantly: the cylinder's opacity ramp is
2 s and its colour ramp is 5 s, the river's are 3 s and 10 s, and the outro is
the only scene in the piece where the two are equal, both at 10 s. A wash
collapses them into one channel and the disagreement becomes unrepresentable.

### 1.4 The other half is already in this repo as a hard-coded zero

The dimmer, by contrast, is not merely reachable. It is one argument in code
that already ships.

**READ, `demo/shell/xr-room.mjs:1739` and `demo/shell/xr-panel.mjs:1410`**, the
same line in both files:

```js
if (ar) gl.clearColor(0, 0, 0, 0);
```

Every passthrough page here clears the frame to transparent black, which is
`a = 0`, which is the room at 100%. `gl.clearColor(0, 0, 0, 0.85)` is the room
at 15%.

🔴 **And both ends of that range have already been measured on a real headset by
this project.** CLAUDE.md carries the rule:

> `alpha: false` on the WebGL context makes passthrough impossible. The
> compositor puts the real room behind the page and can only do that through
> transparent pixels; with no alpha there is nothing to clear to zero and the
> room is replaced by black instead of composited under.

That is `a = 1` and it reads as a bug report, which is what makes it good
evidence: nobody set out to prove the endpoint, somebody hit it and wrote down
what it looked like. `a = 0` is how four pages work today. So the two ends are
MEASURED on a Quest 3 and the ramp between them is INFERRED from the blend
equation and **NOT MEASURED**.

Two things the ramp could still get wrong, and only a headset can say:

- **Whether the compositor blends in linear light or in the display's own
  transfer curve.** If it blends after the curve, `a = 0.85` does not give a
  room at 15% of its luminance, it gives one at some other fraction, and the
  score's eight values would land somewhere other than where they land in Unity.
- **Whether the runtime does anything else with intermediate alpha**, such as
  quantising it or treating anything above a threshold as fully obscuring.
  Quest's own `XRRenderState.passthroughFullyObscured`, which READ from
  `research/quest-xr-2026-09.md` shipped in Browser 38.2 and has since been
  adopted into the W3C specification, is a hint in exactly that direction: the
  platform gives a page a way to say *I am covering the room* and no way to say
  *show me fifteen per cent of it*.

⚠️ **And the dimming would apply to a room the page is not compositing over
correctly to begin with.** `research/quest-xr-2026-09.md` and this repo's own
`BACKLOG.md` both record that a Quest composites passthrough with **no depth**,
so everything the page draws sits in front of every real wall whatever their
true distance. That is not a difference from the real piece, which is Unity
passthrough and has the same property. It matters here only because the score's
two dialogue placements are 9.4 m and 11.9 m away (§2.3) and this repo's only
page that stands words in a room had to shrink its whole world by a factor of
0.30 in passthrough for exactly this reason.

### 1.5 The one route to the pixels, and what it costs

The premise said WebXR hands a page no passthrough pixels. **That has not been
true since 2025 and the correction is already in this repo**, in
`research/quest-xr-2026-09.md`, which flags it as a trap it fell into itself:

> Meta's mixed-reality page says "There is no way to get to the pixels of the
> passthrough content", and IWSDK's camera guide (2026-09-05) says a headset's
> passthrough "is not automatically available as a browser camera". Both are
> about `navigator.mediaDevices`, a different API, and both are correct about
> it.

READ from the same file, off Meta's own release notes: passthrough camera
arrived **experimental in Browser 38.2 (2025-04-30)**, moved to **New Features
in 40.1 (2025-08-12)**, and was still being fixed in 146.0 (2026-04-21). There
is a matching consumer permission called **Headset cameras**. MEASURED here:
`XRWebGLBinding.prototype.getCameraImage` and `XRView.prototype.camera` both
exist in Chromium 153 on this laptop, so the API is not a proposal.

So there **is** a route. Here is what it costs, and why I am not recommending
it.

To grade the room with a real LUT you must:

1. **Stop using the compositor's passthrough entirely.** Draw at `a = 1`
   everywhere, which by the rule in §1.4 gives a black room.
2. **Ask for `camera-access`**, take a permission prompt in front of the
   visitor, and get a texture per frame from `getCameraImage`.
3. **Apply the LUT**, which is the only cheap step: a 3D texture lookup in the
   fragment shader.
4. **Reproject the camera image into each eye.** The cameras are not at the
   eyes. `XRCamera` hands over intrinsics and a pose, so the geometry is
   available, but reprojecting a flat image to a different viewpoint needs depth
   or it is only correct at infinity. `depth-sensing` is default on for Quest 3
   and 3S, so a coarse depth map exists, which means the step is possible and
   not that it is good.
5. **Accept the page's own latency.** The compositor reprojects passthrough at
   scan-out. A page cannot. This is the step that is not a code problem.

Four more constraints READ from the same research file: **only one foreground
app may hold camera data at a time**; the exact feature descriptor Quest wants
is UNCONFIRMED; whether the flag is still required is UNCONFIRMED; and there is
one dated contrary report from a developer on Browser 40.2 in October 2025
saying it still does not work.

**The verdict is not "impossible", it is "the wrong trade".** At the end of that
work you no longer have passthrough. You have a page-drawn video backdrop with
parallax errors at page latency, in exchange for a colour grade, inside a piece
whose entire subject is the real room the visitor is standing in. The cheap
version of the same mistake is the coloured quad. The expensive version is this.

---

## 2. The room, worked out

The `room` block of `held-in-human.json` is the place to start because every
placement in the file has `right = 0`, so a placement is a height, a distance
and an angle. Here is what that actually gives you.

### 2.1 Which way she faces, and the worked example that settles it

The score's own comment:

> `// The scene is built around the point (0,0,0)`
> `// Example:`
> `// starting position = (1.0,0.0,-2.0)`
> `// starting rotation = 180.0`
> `// The center of the space will be two meters behind the visitor,`
> `// one meter to her right`

🔴 **Both halves of that example resolve, and `plan-held-in-human-score.md` says
one of them only half resolves.** The difference is the `180.0`, which that
reading leaves out of the arithmetic.

Work it with the axes the file states, right, up, back. A visitor at
`back = -2` stands 2 m in the direction of decreasing `back`. Taking increasing
`back` as the facing at rotation 0:

- **At rotation 180 she has turned round**, so the centre, which was 2 m in
  front of her, is 2 m behind her. The comment's first clause. ✔
- **At rotation 180 her own right points the way world-left points.** She is at
  `right = +1`, so the centre is 1 m to her world-left, which is 1 m to her
  right. The comment's second clause. ✔

INFERRED, and it holds whichever handedness the yaw uses, because 180 degrees is
180 degrees either way.

The real score then has `starting orientation 0.0`, so **at rotation 0 the
visitor stands 2 m in front of the centre of the space and looks toward it and
past it.** The intro text at `back = +1.4` is then 3.40 m directly in front of
her, which is the independent check: a piece whose first move is a wall of text
does not put it behind the visitor's head.

### 2.2 The six placements, from where she actually stands

MEASURED by arithmetic on the score's own numbers, with her starting point at
`back = -2` and **her eye taken at 1.7 m, which the score does not state**. The
elevation column is the only one that moves with that assumption; the distances
and the bearings do not. At the 1.6 m this repo's own pages use (`EYE_Y` in
`demo/weight/index.html` and `demo/blocks/index.html`) the four elevations read
+3.4, -11.3, +0.6 and +9.2 instead.

| placement | up | back | rotation | from her | off her axis | elevation |
|---|---|---|---|---|---|---|
| starting position | 0.0 | -2.0 | 0 | she is here | | |
| intro text | 1.8 | 1.4 | 0 | **3.40 m** | 0.0 deg | +1.7 deg |
| holdme anchorpoint | 1.3 | -0.5 | none | **1.55 m** | 0.0 deg | **-14.9 deg** |
| inner maze offset | 0.0 | -0.4 | none | a shift, not a place | | |
| dialogue Imagine | 1.7 | 8.0 | 50 | **9.41 m** | 40.6 deg | **0.0 deg** |
| dialogue Remember | 3.5 | 10.0 | 330 | **11.91 m** | 25.1 deg | +8.7 deg |

Four things fall out of that table that are not in the prose reading of the
score.

🔴 **`Imagine` is the only placement at a plausible eye height, and that is why
the eye is assumed to be 1.7 m rather than the other way round.** It is the one
number in the room block that a designer would choose to mean *level with her*,
and it is within 0.6 degrees of level across every eye height a person is likely
to have. ⚠️ Read the other way it is circular, so the honest form is: the score
does not say how tall she is, one placement reads as eye level, and every
elevation in the table hangs off that reading. `Remember` is 8.7 degrees above
her eye seen from where she stands and 10.2 degrees above it seen from the
centre, which is the number `plan-held-in-human-score.md` quotes. Both are right
about their own origin and that document does not say which it used.

🔴 **The two voices are 65.8 degrees apart seen from her, not 80.** The 80 is
`50 + 30` and it is the angle at the centre of the space. She does not stand at
the centre. The composition a visitor actually gets is two voices about 66
degrees apart, one level with her eyes and one raised, at 9.4 m and 11.9 m.

🔴 **The hold me anchor is about 15 degrees BELOW her eye and 1.55 m away.** It is
the only thing in the piece you look down at, and at that distance and angle it
is within reach if she takes one step. That is arm's-reach geometry, which is
the one scale every XR page in this repo already assumes.

🔴 **Four of the six placements are inside the cylinder and two are far outside
it.** The cylinder radius is 2.55 m. The start (2.0 from centre), the intro text
(1.4), the hold me anchor (0.5) and the inner maze offset (0.4) all sit inside a
5.1 m circle. The two dialogue voices sit at 8.0 and 10.0 from the centre. That
is the split that decides what a headset in an ordinary room can hold, and it is
a clean one: **the piece is a 5 m room with two things hung a long way outside
it.**

### 2.3 The cylinder

Radius 2.55 m, so 5.10 m across. She begins 2.00 m from the centre, so **the
near wall is 0.55 m behind her and the far wall 4.55 m in front.** MEASURED, and
true only at the start, since by the cylinder scene she has walked.

That is a gallery-sized object. A Quest guardian in a domestic room is typically
2 to 3 m across, so the cylinder would enclose the real walls, and with the room
at 0.15 opacity through most of that scene the visitor would mostly not see them
anyway. INFERRED: in a small room the cylinder scene degrades gracefully and the
maze and the dialogue do not.

The score gives the cylinder a radius and nothing else. No height, no material,
no position for its centre in the vertical, no statement of whether it is a
surface or an absence. §5 counts that as one of the holes.

### 2.4 The facing of the two voices cannot be settled, and here is the control that says so

I tried to settle it and failed, and the failure is worth more than the claim
would have been.

The score uses the same comment, `// rotation around center of the space`, for
`dialogue rotation Remember`, `dialogue rotation Imagine` and `intro text
orientation`. So `rotation` and `orientation` are one thing. Two readings:

- **Rigid**, the placement is swung about the centre and the object turns with
  it, so its facing is determined.
- **Positional**, the placement is swung and the object's own facing is a
  separate thing the score does not state.

Under the rigid reading, an object that faced the visitor's start at rotation 0
would, after its swing, still face within **9.4 degrees** of her for `Imagine`
and **4.9 degrees** for `Remember`. That looked like evidence. **MEASURED
negative control: sweep the same placement through all 360 rotations and the
mean is 9.2 degrees and the worst case is 14.5 degrees.** Every rotation aims at
her within fifteen degrees, because at 8 m from a centre she stands only 2 m
from, every direction points roughly her way. The statistic is constant by
construction over the subject, which is CLAUDE.md's own rule about the
kaleidoscope in a different costume.

The bound is exact and worth keeping: `arcsin(2 / d)`, which is 14.5 degrees at
8 m and 11.5 degrees at 10 m.

**So the facing of every text surface in this piece is unstated.** That is not a
small thing to leave open, because a text plane seen edge-on is invisible, and
the two dialogue placements are the two with an angle on them.

### 2.5 What `xr-room.mjs` would have to grow

`demo/shell/xr-room.mjs` is 116 KB and owns the picture: a room from a 32-bit
seed, spinning cubes with a proven separation rule, the dotted floor grid snapped
onto detected planes where the headset reports any and onto the page's own five
quads where it does not, the two-eye pass with the `gl.clear` and
`bindAttribLocation` traps already paid for, controller stand-ins and real glTF
models through `xr-glb.mjs`, the pointer beam, and the tablet.

What it does not have, for this piece:

| the score needs | `xr-room.mjs` today | what it would take |
|---|---|---|
| a cylinder of radius 2.55 | `lathe()` exists and is **not exported** | a body of revolution is ten lines in its own idiom |
| an object placed at a height, a distance and an angle | `modelM(x, y, z, s, rx, ry)` takes cartesian | a polar wrapper, trivial |
| text standing in the room | nothing here; `demo/weight/text.mjs` has it | see §4 |
| the room dimmed on a clock | `gl.clearColor(0, 0, 0, 0)`, hard-coded | one parameter |
| a visitor who has walked to a named place | `local-floor` gives head position | the named place does not exist, see §5 |

The two-eye pass, the way out, the plane detection and the controller path all
come free, and every one of them is a WebXR defect this project has already paid
for once on real hardware. That is the genuine asset here and it is worth saying
plainly: **the expensive half of putting anything in a headset is done.**

---

## 3. Scene by scene

The running order, with both channels, MEASURED off `held-in-human.json`:

| scene | length | LUT | LUT fade | opacity | opacity fade | change |
|---|---|---|---|---|---|---|
| transition | 40.0 s | neutral | 0 s | 1.00 | 2 s | +0.40 |
| intro | 142.3 s | neutral | 0 s | 0.60 | 4 s | -0.40 |
| maze | **absent** | neutral | 0 s | 0.60 | 3 s | 0 |
| dialogue | 107.9 s | **green** | **0 s** | 0.70 | 6 s | +0.10 |
| cylinder | 150.0 s | green | 5 s | **0.15** | 2 s | **-0.55** |
| river | 120.0 s | blue | 10 s | 0.30 | 3 s | +0.15 |
| hold me | 165.0 s | red | 2 s | 0.50 | 4 s | +0.20 |
| outro | 90.0 s | neutral | 10 s | 0.60 | 10 s | +0.10 |

Two MEASURED figures about the channels that are not in the score document:

- **The room's opacity is moving for 29 seconds of a 775 second visit**, which
  is 3.7% of it. Total ramp time is 34 s, of which the maze's 3 s changes nothing
  (0.6 into 0.6) and the transition's 2 s happens between visitors. So the room
  is standing still for 746 of the 775 seconds somebody is inside the piece, and
  every move it makes is an event.
- **The colour tables run neutral 232.3 s, green 257.9 s, blue 120.0 s, red
  165.0 s** across a visit with the maze counted as zero. Green is the longest,
  and it spans the two scenes with the biggest opacity gap in the piece, 0.70 and
  0.15.

### 3.1 transition, 40 s

**What could be shown.** The credits, which arrive at 7.0 s and scroll for
35.0 s. Eleven credit groups, a canvas texture on a quad, scrolled by a UV
offset. `xr-panel.mjs` already draws panels as textures and this is that with
one animated coordinate. The room at 1.00 opacity is `clearColor(0,0,0,0)`,
which is what the repo does today.

**What could not.** Nothing, mechanically.

**What would have to be invented.** Where the credits hang, how big they are,
what typeface. The score gives no placement for them. And the scene's own clock
does not close: the credits end at 42.0 s in a scene stated as 40.0, and `time
after credits until intro` does not say which end it counts from, which gives
four different answers for when the next visitor starts. That is ambiguity
`transition-clock` in the data and it is `settled: false`.

### 3.2 intro, 142.3 s, and it is one of the two nearly free ones

**What could be shown.** All of it. 318 keystroke events with their delays
already summed into absolute times, 307 printable keys, 5 returns, 6 backspaces,
306 characters on screen, spanning 142.277 s. A position 3.40 m in front of the
visitor at 1.8 m up, on her axis, facing her. White text, stated. A 4 s opacity
ramp from 1.00 down to 0.60 at the top of the scene.

And the correction is the content: six backspaces delete `houses` and
`buildings` is typed in its place, with a **2.295 s hesitation before the first
backspace that is longer than the deletion itself.** A score holding the finished
string could not carry that. This repo already made the opposite decision on
purpose, in `/typist/`, which records the change and never the key, and
`plan-held-in-human-score.md` §6.2 is right that the two files are the two sides
of one argument.

**What could not.** The typing has to appear somewhere, and the two ways of
standing text in a room here both have a problem with text that changes:

- `xr-panel.mjs` draws to a 2D canvas and uploads it, which is fine at panel
  sizes and goes to mush on a wall of text three metres wide.
- `demo/weight/text.mjs` builds signed distance fields, wraps against a width in
  **metres**, honours `\n`, and stays sharp at any size. Its own header names
  the expiry: *"Go to a glyph atlas when text has to CHANGE at runtime, anything
  typed, streamed, counted up, or translated on the fly, because this shape
  rebuilds a whole texture for a one-letter edit."* The intro is anything typed.

  MEASURED in that file: eleven phrases take about 320 ms on the main thread, so
  roughly 29 ms each. ⚠️ Those eleven are that page's own display words and a
  line of body type is a different texture, so 29 ms is an order of magnitude
  rather than a figure. INFERRED at that order: a rebuild per keystroke against
  an 11.1 ms frame at 90 Hz is a couple of dropped frames per character, 306
  times. The median gap between keystrokes is 270 ms and the shortest is 56 ms,
  so at the fast end the page would be asked to rebuild faster than it can draw.
  The repair is the one the file already names, a glyph atlas, and it is not a
  small addition.

  ⚠️ The Quest-specific half of this is already found and fixed: BACKLOG.md
  records that `/weight/`'s live retype scheduled its rebuild on
  `window.requestAnimationFrame`, **which does not fire inside an immersive
  session**, so in a headset the rebuild was queued and never ran. It uses the
  session's own frame callback now.

**What would have to be invented.** The type size, the wrap width, the typeface,
whether a caret is drawn, and whether the six lines stand still or scroll. The
score gives a colour and a position and says nothing else about the type. The
graphic designer is credited in the file and his work is not in it.

### 3.3 maze, no length, and it is the one that cannot be started

**What could be shown.** Two word lists, 28 outer and 24 inner, and one event:
the outer maze begins 60.0 s in.

**What could not.** Everything else. `maze.json` holds the geometry and is not
in the score. There are no positions, no scale, no idea what a maze is made of
here, and the score's only knob over that file is `inner maze offset`, 0.4 m
toward the side the visitor starts on. The score cannot be read into a maze
because the maze is not what the score contains.

Three further unknowns inside the two lists, all `settled: false` in the data:
the `;n,n` suffixes on four inner entries using the values 1, 2, 4, 5, 6 and 7;
`r,a,d,i,s,h` as the only entry spelled out with commas; and the trailing spaces
on `thought ` and `loop ` in the outer list, which nothing else has.

**What would have to be invented.** **The stairs.** The one QandA line with a
negative time says *"Please walk towards the stairs in front of you."* and there
are no stairs anywhere in the file. That single line also makes this the only
scene that waits for a person, so its length is not merely unstated, it is
unstatable.

⚠️ And it is the one scene that requires room-scale walking. Every XR page in
this repo assumes arm's reach plus a few steps, and a headset in a domestic room
has a guardian two or three metres across.

**Verdict: nothing.** Not a partial build, not a sketch. Placing 52 words in a
room would be inventing the room design, which the file credits to somebody else
and does not contain.

### 3.4 dialogue, 107.9 s

**What could be shown.** Sixteen lines, two speakers strictly alternating, with
their own durations and five pauses, summing to 107.9 s. Two placements with
rotations. The 6 second pause after `/imagine the art of missing out.` is line 9
of 16 and is the one long silence, placed deliberately. The last two lines switch
from `/imagine` and `/remember` to `/whisper`, and by then the maze sound has
faded out, so the two whispers have nothing behind them.

**What could not.** Speak. The line durations are the lengths of recordings the
file does not carry, 98.4 s of them across sixteen lines. A silent build shows
sixteen captions on a stopwatch.

**What would have to be invented.** Whether the lines are spoken or shown or
both, and which way each surface faces (§2.4). Also, what happens at 9.4 m and
11.9 m in a room that is 4 m wide: `/weight/` had to scale its whole world by
0.30 in passthrough for this, and uniform scaling about eye height preserves
every angle in the table in §2.2 exactly while destroying every distance. That
is the honest trade and it should be named rather than taken silently.

### 3.5 cylinder, 150 s

**What could be shown.** A cylinder of radius 2.55 m with the visitor inside it.
The fastest and largest opacity move in the piece, 0.55 of range in 2.0 seconds,
against 0.100 a second for the fastest move a visitor is inside for otherwise.
Seven QandA lines beginning at 90.0 s and ending at 128.0 s of 150.0.

The scene is worth building for its dramaturgy alone: the room collapses to 0.15
and holds there for two and a half minutes, and ninety seconds into that a voice
asks *"Have you noticed how the walls don't meet the ceilings here?"*, then *"Are
you here?"*, then *"Do you see me?"*.

**What could not.** `Ghost trace` at 60.0 s. It is an event with a time and a
name and no description anywhere in the file. It is also the only thing that
happens in the first ninety seconds of the scene other than the opacity
collapse, so not knowing it is not knowing the scene.

**What would have to be invented.** The cylinder's height, its material, whether
it is a wall or a boundary, where its centre sits vertically, and what a ghost
trace is.

### 3.6 river, 120 s

**What could be shown.** Fifteen fragments and two minutes.

**What could not.** Pace them. This is the largest hole in the file as supplied:
the dialogue carries seconds per line and the QandA carries seconds per line, and
the river carries nothing at all, while its fragments run from **one word to
seventy-nine**. Evenly spread they are 8.0 s each, and they cannot be evenly
spread.

Two more, both real:

- **31 `<size=18>` spans set an absolute size on individual words**, and 18 is
  relative to a surrounding size the file never states, so **the direction of the
  emphasis cannot be read off the score.** Bigger or smaller is a coin toss.
- `weight/text.mjs` rasterises one texture per phrase at one size. A size change
  inside a line is not in it and is not a small addition. That is a limit of this
  repo rather than of a browser: a 2D canvas does mixed sizes without complaint,
  at the cost of the sharpness the distance fields exist for.

**What would have to be invented.** The pacing, the size relationship, the
placement. The score gives the river an orientation of 0 and no position, the
only element in the file like that.

### 3.7 hold me, 165 s

**What could be shown.** An anchor point 1.55 m in front of where she started
and about 15 degrees below her eye, a duration, and two voice blocks: five lines at
0 s and eleven lines at 144.0 s. The second block runs **85.5 s past the end of
its own scene** and carries the voice across the boundary into the outro, which
is the cleverest and most fragile thing in the score.

**What could not.** Be built. **`HoldMe` is a name, a point and a length.** The
file says nothing about what it is.

⚠️ The one hint is in the geometry rather than the words, and it is a hint and
not a fact: 1.55 m away and below the eye is where a thing you take hold of is,
and it is the only placement in the piece below eye level. `xr-hands.mjs` and
`xr-panel.mjs` already carry a grab path with `grabOffset`, `heldAt` and a
`grabMovedM` counter, so if HoldMe is a thing you hold, this repo has the hands
for it. **INFERRED from a coordinate, which is not enough to build from.**

### 3.8 outro, 90 s

**What could be shown.** One paragraph with the author's own line breaks,
appearing at 30.0 s. Both channels ramping back over 10 s, which is the only
scene in the piece where the LUT fade and the opacity fade are the same length
and the only one where both are at their maximum. Under the reading the data
uses, the outro text appears **half a second after the voice asks "Do you
recognise it?"**, which is the strongest piece of arithmetic in the whole score
reading.

**What could not.** Speak the three lines that land in this scene, and grade the
room back to neutral.

**What would have to be invented.** Where the paragraph hangs and how big it is.

### 3.9 The QandA, which crosses four scenes and is the other nearly free one

It is not a scene, it is one voice reading one list with a cursor that crosses
scene boundaries. MEASURED off the data:

- 24 lines, of which **8 have no text at all** and are silences of a stated
  length, from 1 s to 46.5 s.
- **Spoken lines total 77.5 s and silences total 77.5 s**, equal to the tenth of
  a second. That is measured, and I am not claiming it was intended.
- Plus 8.5 s of pauses, so the block is 163.5 s end to end.
- The assignment of lines to scenes is entirely **INFERRED**: the score states
  how many lines each scene takes (0, 7, 5, 11) and never states which, and the
  block holds 24 against the 23 asked for.

**As timed text with real silences it is free.** The rows are in the data with
absolute times already computed. A page can show a line for exactly as long as
the score says and show nothing for exactly as long as the score says nothing,
and the silences are the reason the block works: a format that could only list
utterances would have to fake the pauses and the 46.5 second one could not exist
at all.

**What it cannot be is a voice.** 77.5 s of speech across fifteen lines, none of
it in the file.

---

## 4. What this repo already has, named

Not a gesture at capability. These are the files and what each one would do here.

| file | what it owns | what it gives this piece |
|---|---|---|
| `demo/shell/xr-panel.mjs` | the session, the render state, panels as textures, the dead-man's switch at 4 s, the entry instrumentation | the only session path that carries all five WebXR defects already fixed. A page that writes its own `requestSession` inherits none of them |
| `demo/shell/xr-room.mjs` | a room from a seed, the dotted floor on detected planes, the two-eye pass, `wallYaw` off the measured walls | the picture, the floor, and the one line that is the score's opacity channel |
| `demo/shell/xr-hands.mjs` | which hand points and which carries, the button map, grip resolution | the hold me anchor, if it turns out to be a thing you hold |
| `demo/shell/xr-controller.mjs`, `xr-glb.mjs` | real controller models through a hand-written glTF parser | nothing this piece asks for |
| `demo/shell/xr-ray.mjs`, `xr-pick.mjs` | a ray from the hand onto a rectangle | nothing this piece asks for. Held in Human has no controls |
| `demo/shell/xr-quit.mjs` | hold any button 3 s, an arc filling at your hand, no labels | the way out, which is mandatory here and which the score does not have |
| `demo/shell/xr-tablet.mjs` | a slab of controls on the left hand | refused in passthrough by standing instruction, and this piece is passthrough |
| `demo/weight/text.mjs` | words as signed distance fields, wrapped against a width in **metres**, sharp at any size | the intro, the dialogue, the outro, the river. It is the closest thing in the repo to what four of these scenes need |
| `demo/held/index.html` | the score's clock drawn as a strip, 43/43 | the piece already read, with the maze as a hatched break in pixels rather than milliseconds |
| `demo/resources/held-in-human.json` | the score as data, every duration labelled stated, measured or absent | everything above reads from this and decides nothing it leaves open |

Three measured facts about the device that this piece would depend on, READ from
CLAUDE.md and `plan-xr.md`, all from a Quest 3 on 2026-09-12 and 2026-09-16:

- **The framebuffer is 3360x1760, two views, and a page holds 89.8 fps in VR and
  90.0 fps in passthrough.** Compositing over the room costs nothing measurable.
- **Audio survives an immersive session and costs nothing.** The `AudioContext`
  is running before, during and after; base and output latency are identical
  inside and outside to the digit; `AudioDecoder` configures and decodes in there
  with zero errors; a main-thread `ScriptProcessorNode` never starved over 3322
  frames. So for this piece **nothing about audio is a technical obstacle. The
  obstacle is that there is no audio.**
- **A doff is reported about ten seconds late**, which for a fifteen minute piece
  with a fixed clock is a real number rather than a curiosity.

---

## 5. What the score does not carry, and what each absence costs

This is the valuable bucket and it should be read as a list of things nobody
could build from this file however capable they were.

### 5.1 `maze.json`

**Cost: the whole maze scene, and the only scene that waits for a person.**

The score references it in a comment and holds one 0.4 m offset over it. The
geometry, the stairs, the scale, the materials and what 52 words are doing in
space are all in a file we do not have. Nothing partial is honest here.

### 5.2 The sound, all of it

**Cost: 175.9 s of recorded voice across 31 lines, 22.7% of a visit, plus every
ambience.**

The score's total specification of the sound design is **one envelope**: the
maze sound begins to fade 30.0 s into the dialogue and is gone 60.0 s later.
That is the only reference to any sound in the file, and it names a thing
(`maze sound`) that is never otherwise mentioned. Everything else about the
audio is a duration standing in for a recording: sixteen dialogue lines at 98.4 s
and fifteen spoken QandA lines at 77.5 s.

The sound designer is credited, and the source of the words is credited too:
audience interaction from Held in Human I at EKA Gallery in 2023, remixed with
ChatGPT. Neither the recordings nor the voice are in the file.

🔴 **This is the single largest reason not to build the piece from this score.**
A version where the dialogue and the QandA are captions is not a quiet version
of Held in Human. It is a different work with the same timings.

### 5.3 `Ghost trace`

**Cost: everything in the cylinder between its opening and its voice.**

A time (60.0 s) and a name. The cylinder is 150 s long, the opacity collapses in
its first 2 s and the voice arrives at 90 s, so between 2 s and 90 s the ghost
trace is the scene. It is two words.

### 5.4 What `HoldMe` is

**Cost: a 165 second scene, the longest in the piece.**

An anchor point at 1.3 m up and 0.5 m forward of the centre, and a duration. The
name suggests something and the coordinate suggests something, and neither is a
specification. §3.7 has the one geometric hint and it is a hint.

### 5.5 The river's pacing

**Cost: 120 seconds, and the only text block in the score with no timing.**

Fifteen fragments of one to seventy-nine words. Something outside the score paces
them, or the sound design does, or somebody runs them by hand, and the file does
not say which.

### 5.6 Type, everywhere

**Cost: every text surface in the piece.**

The score carries exactly one thing about type: `text color 1.0,1.0,1.0`, one
colour for the whole piece, no per scene and no per speaker. It carries no
typeface, no size, no wrap width, no leading, and no facing (§2.4). The graphic
designer is in the credits and his work is not in the file. For a piece that is
almost entirely text standing in a room, that is most of what a builder would
need to know.

### 5.7 Placement, for four of the eight scenes

**Cost: a builder becomes the room designer.**

Placed: the intro text, the two dialogue voices, the hold me anchor, the inner
maze offset. Given a radius and nothing else: the cylinder. Given an orientation
and nothing else: the river. **Given nothing at all: the outro text, the credits,
the QandA voice and the maze.**

---

## 6. The three buckets, in full

### 6.1 The score specifies it and a browser can do it

- The running order and the clock. Eight scenes, eleven events of which two
  are waits, 775.2 s from the intro's first keystroke to the end of the outro
  with the maze taken out. Already drawn by `/held/`.
- **The opacity channel.** Eight values and eight ramps, on `gl.clearColor`'s
  alpha. Both endpoints MEASURED on a Quest by this project; the ramp between
  them NOT MEASURED.
- The intro keystroke track, 318 events over 142.277 s, at 3.40 m in front at
  1.8 m up, white, with the hesitation and the correction intact.
- The QandA as timed text with real silences, 24 rows, 8 of them silence, 1 s to
  46.5 s, with the caveat that the assignment of lines to scenes is inferred.
- The dialogue as timed text at two placements 65.8 degrees apart seen from the
  visitor, one at eye level and one 8.7 degrees above.
- The outro paragraph at 30.0 s, with the author's line breaks and the piece's
  only matched pair of 10 s ramps.
- The credits, starting at 7.0 s and scrolling for 35.0 s.
- The cylinder as a shape of radius 2.55 m that the visitor begins inside.
- The way out, which the score does not have and which is mandatory here.
- ⚠️ And one thing that is reachable and unbuilt: **occlusion**. `depth-sensing`
  is default on for Quest 3 and 3S and no page in this repo asks for it, so
  everything here draws in front of every real wall. The real piece has the same
  property, so this is an improvement available rather than a gap to close.

### 6.2 The score specifies it and a browser cannot do it

**One entry, and everything in §1 is about it.**

- **The LUT on the passthrough image.** Four tables, eight values, eight ramps,
  257.9 s of green in a single visit. In an `alpha-blend` session the room
  reaches the visitor as `room * (1 - a)` with one alpha for all three channels.
  A page can dim it and lay colour over it. It cannot grade it. The `camera-access`
  route exists and replaces passthrough with a page-drawn backdrop, which is the
  wrong trade for this piece (§1.5).

⚠️ **That bucket having one entry is itself the finding.** Almost nothing this
score asks for is beyond a browser. The one thing that is, is the channel the
piece is named after: a room you are held in, coloured.

### 6.3 The score does not specify it

`maze.json`. The sound. `Ghost trace`. What HoldMe is. The river's pacing. Every
typeface and type size. The facing of every text surface. The placement of four
of the eight scenes. The stairs. Whether the piece loops. Which scene speaks the
one line with a negative time. The nine entries in `ambiguities`, all of them
`settled: false`.

---

## 7. What a build would actually look like, if somebody insisted

Not a recommendation. A description, so that the cost is visible rather than
argued about.

You would get: a fifteen minute silent piece in which the real room dims and
brightens on the score's own clock and never changes colour; a wall of text that
types itself for two and a half minutes with the hesitation intact; a gap where
the maze is, of a length you chose; sixteen captions alternating between two
points you had to guess the facing of; a cylinder of a height you invented,
containing nothing, with a two word event missing from the middle of it; fifteen
news fragments at a pace you invented; a scene called hold me consisting of an
empty point in the air for two and three quarter minutes; and a paragraph.

**More than half the running time is a scene where somebody would be inventing
the content or its pacing.** MEASURED from §5: cylinder 150 s with its one event
missing, river 120 s with no pacing at all, hold me 165 s with no description,
and the maze with neither a length nor a geometry. That is 435 s of the 775 s
known clock, 56%, before the maze is counted at all.

And it would be handed to somebody as Held in Human.

---

## 8. Recommendation

**Do not build the piece from this file.** The maze has no geometry and hold me
has no description, the cylinder's one event is two words, the river has no
pacing, the colour channel that runs underneath all of them is not reachable in
a browser, and 22.7% of a visit is a recorded voice the file carries only as
durations. A partial version would not be
a smaller Held in Human, it would be a different work wearing its timings, and
the parts it would be missing are the parts the credits name other people for.

**There is one honest thing and it is a measurement, not a demo.** The opacity
channel is already in this repo as a zero:

```js
if (ar) gl.clearColor(0, 0, 0, 0);     // xr-room.mjs:1739, xr-panel.mjs:1410
```

Make that alpha a parameter, drive it with the score's eight values and eight
ramps, and take it into a headset once. **What it would settle**, and none of
these is answerable from here:

1. **Whether the compositor's blend is linear**, and therefore whether alpha 0.85
   really is the room at fifteen per cent. If it is not, every number in the
   score's opacity column lands somewhere other than where it lands in Unity, and
   that is worth knowing before anybody quotes one.
2. **Whether the Quest does anything else with intermediate alpha**, such as
   quantising it or treating anything above a threshold as fully obscuring.
3. **Whether 0.15 for 150 seconds is safe to stand in**, which is question 8 in
   `plan-held-in-human-score.md` §7.2 asked about our compositor rather than
   theirs. The score's own warning is that dimming costs contrast, and contrast
   is what tells a person where the floor is.

**And it would have to be proved by sabotage, the way everything here is.** Set
the alpha to zero and the check must go red; the failure mode this project keeps
finding is a page that reports a boundary whatever it is shown. The negative
control is the colour half: **drive the same parameter with a colour instead of
black and the room should get a fog rather than a grade**, which is §1.3 turned
into something a person can look at. A page that can show both in one session is
a page that has said something true about what a browser can and cannot do to a
room, which is more interesting than the effect.

⚠️ **That is worth doing on its own terms and it is not Held in Human.** It would
carry none of the piece's texts, none of its scenes and none of its name.
`plan-held-in-human-score.md` §6.4 already proposed a page called `veil` for
roughly this, and the finding in §1.4 makes it smaller than that document
thought: the mechanism is one argument that already ships, and what is actually
missing is the measurement and the sabotage rather than the code.

---

## 9. Rights

The score is **Liis Vares and Taavet Jansen's**, produced by elektron.art, with
mixed reality design and coding by Norbert Pape, sound by Mihkel Tomberg,
graphics by Jaan Evart and room design by Mari Möldre. The intro and outro texts
are **Ene Mihkelson**, *"Apartment"*, Tallinn 1985, translated from Estonian by
**Miriam Anne McIlfarick-Ksenofontov**. The whispers, chat and dialogue are
audience interaction from Held in Human I at EKA Gallery, Tallinn, 2023.

Nothing described in this document may be built, shipped or shown without asking
the authors first, and reproducing the intro keystroke track is a redistribution
of a published author's text in translation, which is a separate permission
again. That is question 9 in `plan-held-in-human-score.md` §7.2 and it comes
before any code.

The texts quoted here are quoted only where a number depends on them and none of
them is rewritten.
