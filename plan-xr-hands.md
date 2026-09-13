# plan-xr-hands — controller and hand poses, and the small screen you hold

> Written 2026-09-13, from the owner's question: *"assess the possibility to get
> controller data — mostly angles and x/y/z — in order to connect something to
> them so the user can see rendered controllers, maybe hands, and where we can
> for example have a virtual tablet or PDA to control the timeline or something
> in the future."*
>
> Extends `plan-xr.md` (the device measurements and the five defects the headset
> found) and `plan-xr-room.md` (the room, and §3 "Interactivity", which says
> pointing at a panel and pressing a button is *already built*). Nothing here
> re-derives those.

## 0. The short answer

**Pose data is not a possibility, it is already in hand and being thrown away.**
`demo/scene/index.html` reads one pose and one thumbstick axis from
`session.inputSources` every frame and discards everything else — including the
one field a rendered controller hangs off. Getting the rest is *one line inside
a loop that already exists*, not a feature.

**Angles: use the 4×4 matrix, not the quaternion, and not Euler angles.** The
matrix is what the codebase already passes around, and it hands you the three
basis vectors for free. Euler angles for a readout are a trap this project has
a rule about — see §2.

**Rendering a controller: primitives, not glTF, and it is not close.** The
registry's models need a loader, a PBR path and a third-party fetch inside the
entry path this repo has already lost three headset runs to. A stand-in at the
grip pose is ~20 lines against a cube VAO that exists. Read `profiles` anyway —
it costs one string and it fixes a real latent bug (§4).

**Three traps found while writing this, each of which would have cost a headset
run, and none of which is visible from inside a working-looking page:**

🔴 **1. The grip space's X axis FLIPS SIGN between the left and right hand.** Out
of the back of the hand is +X on the right and −X on the left. So **any fixed
local offset — a stand-in's marker, the tablet's position in the palm, its tilt
— is silently MIRRORED on the other hand**, with every number in the readout
still green. One `handedness === 'left' ? -1 : 1` is the whole fix, and it has to
be written before the first stand-in, not after somebody holds it in the other
hand (§1.5).

🔴 **2. `hand-tracking` alone does not get you the second input.** A non-primary
input source goes into **`session.trackedSources`, not `inputSources`**, and only
if the feature descriptor **`"tracked-sources"`** was *also* granted. Ask for
`hand-tracking` and not `tracked-sources` and the second hand **silently does not
exist** — no error, no event, an empty array that reads exactly like a headset
with one controller. Upstream Chromium does not implement the attribute at all;
Meta's fork shipped it in Browser 34.1 (§1.3).

🔴 **3. Quest's hand target ray is SYNTHESISED, not anatomical — and it points at
where Horizon Home would put a menu.** Meta's own words: it *"assumes that the UI
is in front of the user, so the target rays will always point in that general
direction."* **This is aimed straight at §5's design**, which was "hold the
tablet in one hand, point at it with the other" — and a ray that always points
forward cannot point down at a tablet in your other hand. It does not kill the
tablet; it decides which of two designs the tablet is (§5.1a).

🔴 **The tablet is the interesting part, and the surprise is that half of it is
already built.** The strip is a `<canvas>`. `xr-panel.mjs` already uploads a
canvas to a texture at a **measured 0.10–0.20 ms** on the device. So *the
timeline goes into a headset today with the code that exists.* The transport bar
is DOM and cannot follow — but it only has three things the strip lacks, and
three things is three buttons. See §5.

**One headset run answers the lot**, and the highest-value single field in it is
one subtraction: **how far apart grip and target-ray actually are on this
runtime** (§6). If that reads 0.00 m the whole distinction above is moot here; if
it reads 5 cm and 25°, that is exactly how far a model on the wrong space floats.

⚠️ **But build the arithmetic asserts on a laptop FIRST.** Four coordinate spaces
stand between a ray and a seek and every one of them is pure arithmetic on
`Float32Array(16)`s — so `node` grades them exactly, and a press landing in the
wrong place is the defect this design is most likely to ship (§5.4, §5.6a).

---

## 1. What we already have, and what we throw away every frame

### 1.1 What `scene` reads today

`demo/scene/index.html`, inside `onXR`, around line 789:

```js
for (const src of session.inputSources) {
  if (!src.targetRaySpace) continue;
  const rp = frame.getPose(src.targetRaySpace, xrSpace);
  if (!rp) continue;
  const m = rp.transform.matrix;
  const o   = [m[12], m[13], m[14]];        // where the ray starts
  const dir = [-m[8], -m[9], -m[10]];       // -Z of the ray's own frame
  …
  const ax   = src.gamepad?.axes || [];
  const push = (ax[3] ?? ax[1] ?? 0);        // one thumbstick axis
  const aDown = !!src.gamepad?.buttons?.[4]?.pressed;
  …
  break;                                     // one pointer is enough here
}
```

Plus two session events — `selectstart`/`selectend` (trigger, grabs) and
`squeeze` (grip, leaves) — and a one-shot diagnostic line that prints
`handedness` and the ray position for each source.

`demo/shell/xr-panel.mjs` reads the same `targetRaySpace` for its drag, and
scans `gamepad.buttons` for "any button leaves".

### 1.2 What is discarded

| available on `XRInputSource` | read today | what it is for |
|---|---|---|
| `targetRaySpace` | ✅ | where you are pointing |
| **`gripSpace`** | ❌ **never read anywhere in the repo** | where the thing in your hand *is* |
| `handedness` | diagnostic line only | which hand; never used to tell the two apart in the loop |
| **`profiles`** | ❌ | which controller this is, and therefore which button is which |
| `targetRayMode` | ❌ | `tracked-pointer` vs `gaze` vs `screen` vs `transient-pointer` |
| **`hand`** | ❌ | the 25 joints, when hand tracking is on |
| `gamepad.axes[0..2]` | ❌ (only `[3]`/`[1]`) | the other stick, and the X axis of this one |
| `gamepad.buttons[0..3,5..]` | ❌ (only `[4]`, plus the two events) | every other button |
| the **second** input source | ❌ — `break` drops it | the other hand |
| **`session.trackedSources`** | ❌ — and it is a whole second array, not a field | 🔴 where a non-primary input actually arrives (§1.3) |

Grepped across `demo/`, `timeline/`, `rig/`, `workers/`, `src/`: **zero hits for
`gripSpace`, `XRHand`, `getJointPose`, `hand-tracking`, `trackedSources` or
`.profiles`.** The only match in the whole repo is a Chrome histogram name
inside an old MoQ log.

### 1.3 What one more line gets

Inside the loop that already exists:

```js
const gp = src.gripSpace && frame.getPose(src.gripSpace, xrSpace);
```

That is the whole of controller pose — position, orientation and a 4×4 matrix,
in room coordinates, for a controller the runtime is already tracking. Deleting
the `break` gets the second source.

⚠️ **`hand-tracking` goes in `optionalFeatures`, never `requiredFeatures`** —
for exactly the reason already written above `plane-detection` in that file: in
`requiredFeatures` it turns "I have hand tracking switched off" into "this page
refuses to start".

#### 🔴 And `hand-tracking` on its own is NOT enough — the second input goes somewhere else

This is the trap that would have cost a run, and it is invisible from the page:
**a non-primary input source is not put into `inputSources` at all.** From the
WebXR Device API, W3C Candidate Recommendation Draft, 9 June 2026:

```webidl
partial interface XRSession {
  [SameObject] readonly attribute XRInputSourceArray inputSources;
  [SameObject] readonly attribute XRInputSourceArray trackedSources;
};
```

> The `trackedSources` attribute returns the XRSession's list of active XR
> tracked sources. **The list of active XR tracked sources MUST only be
> populated if `tracked-sources` is included in the set of granted features.**

and on what lands there:

> An XR input source is a **tracked input source** if it does not support a
> primary action. These inputs are primarily intended to provide pose data. …
> **Tracked hands may also be considered a tracked input source if there is no
> gesture recognition being performed to detect primary actions.**

So the correct ask is **two** descriptors, not one, and the loop has to read
**two** arrays:

```js
// demo/shell/xr-room.mjs — today: ['plane-detection']
export const ROOM_OPTIONAL_FEATURES = ['plane-detection', 'hand-tracking', 'tracked-sources'];

// and everywhere that iterates inputSources:
for (const src of [...session.inputSources, ...(session.trackedSources || [])]) { … }
```

🔴 **Ask for `hand-tracking` and not `tracked-sources`, and the second input
SILENTLY DOES NOT EXIST** — no error, no event, an array that reads exactly like
a headset with one controller. There is a matching `trackedsourceschange` event,
and the spec says it too *"MUST only be fired if `tracked-sources` is included in
the session's set of granted features"*, so even the event that would have told
you is gated behind the descriptor you did not ask for.

⚠️ **`session.trackedSources` is a Meta-fork attribute today, so the `||` above
is load-bearing.** Checked against Chromium main on 2026-09-13:
`third_party/blink/renderer/modules/xr/xr_session.idl` has `inputSources` and
`oninputsourceschange` and **no `trackedSources`, no `ontrackedsourceschange`**.
Meta shipped it in Browser 34.1, ahead of upstream Blink. It is standards-track
— it is in the 9 June 2026 CRD — but reading it unguarded on desktop Chrome is a
`TypeError` inside a frame callback, which is the failure mode that silently
deletes everything below it.

### 1.4 🔴 Grip versus target ray — which one a model hangs off

This is the distinction that decides whether a rendered controller sits in your
hand or floats in front of it, and it is worth being exact.

**`targetRaySpace` is the pointer.** Its origin is where the aiming ray starts
and its **−Z axis is the direction you are aiming**. On a Quest Touch controller
the runtime places it where a *person expects to point from* — which is not
where the plastic is. It is the right space for a ray, a hit test, and a beam,
and `scene` already uses it for all three, with a comment that says why: *"using
it rather than the grip means what you aim at is what you get."* That comment is
correct and should stay.

**`gripSpace` is the object.** Its origin sits in the centre of the user's grip
on the physical controller, and its axes are defined by the spec relative to how
the thing is held (see §1.5 for the exact convention). It is the right space —
the *only* right space — for **rendering something that is supposed to be in the
hand**: a controller model, a stand-in, a held tool, or the tablet in §5.

**Hang a model off `targetRaySpace` and it floats out in front of your hand at a
tilt, and follows your aim rather than your wrist.** That is the single most
common WebXR rendering bug and it is why this section exists. The two spaces are
related by a fixed offset and rotation *per controller model* — and how big that
offset is on this runtime is a number nobody here has, which is why §6 measures
it rather than quoting anyone.

So the rule for this codebase, in one line each:

- **The beam is drawn from `targetRaySpace`, and the hit test uses its −Z.**
  Already true. Change nothing.
- **Anything that looks like an object goes on `gripSpace`.** Not written yet.

### 1.5 The grip convention, and 🔴 the sign that flips between hands

The governing document is the **WebXR Device API, W3C Candidate Recommendation
Draft, 9 June 2026** ([w3.org/TR/webxr](https://www.w3.org/TR/webxr/)).

⚠️ **A note on the instrument, because this repo has a rule about it.** Two
attempts to fetch §10 (Input) of the spec itself returned the document truncated
before it — so **everything below is DOCUMENTED *via MDN*, not read off the
specification**, and MDN is a secondary source. Dates are given because they
matter: the `gripSpace` page was last touched **2024-03-11**, over two years ago.
Treat it as a good prior to build against, not as a measurement — which is
exactly why §6 measures the thing rather than asserting the convention holds.

**Grip space**, per
[MDN `XRInputSource.gripSpace`](https://developer.mozilla.org/en-US/docs/Web/API/XRInputSource/gripSpace)
(2024-03-11), describing a user holding a straight rod in a closed fist:

- **origin** — the *centroid of the closed fist*, tracking the hand's position.
- **−Z** — along the length of the rod, **in the direction of the thumb**.
  (+Z the opposite way.)
- **X** — perpendicular to the palm, pointing out of the **back of the hand**.
- **Y** — implied, the cross product of the other two.

**Null** *"if the input source is not inherently trackable. For example, only
inputs whose `targetRayMode` is `tracked-pointer` provide a `gripSpace`."* So
every read is `src.gripSpace && frame.getPose(…)`, never a bare dereference.

🔴 **AND THE X AXIS FLIPS SIGN BETWEEN HANDS.** MDN is explicit: the direction
out of the back of the hand is *"+X if the controller is in the user's right
hand or −X if the controller is in the left hand."*

That is not a footnote, it is the single most likely bug in §5. **Any fixed
local offset — a clipboard sitting to one side of the palm, a stand-in's
thumbstick marker, a tablet's tilt — is MIRRORED on the other hand.** Build the
tablet against the right hand, hand the headset over to someone who holds it in
the left, and the screen hangs off the wrong side of the fist while every number
in the readout stays green. Concretely:

```js
const s = (src.handedness === 'left') ? -1 : 1;   // and handedness can be 'none'
const local = offsetM(s * 0.04, 0.02, -0.06, …);  // X mirrored, Y and Z not
```

⚠️ `handedness` also has the value **`none`**, so this is a three-way choice with
a default, not a boolean — and `none` is what a source with no hand assignment
reports, which §6 will tell us whether this headset ever does.

**Target ray space.** MDN's
[`targetRaySpace` page](https://developer.mozilla.org/en-US/docs/Web/API/XRInputSource/targetRaySpace)
(2026-08-13) says only that *"the orientation of the space indicates the
direction in which the target ray is pointing"* — **it does not name the axis.**
So the −Z convention is UNQUOTED here.

**But it is MEASURED, by us, on the hardware.** `scene` reads
`dir = [-m[8], -m[9], -m[10]]` and the device log carries `grabbed thing N at
X.XX m` lines from a real Quest — you cannot grab what the ray is not on.
⚠️ That is behavioural evidence, not a quote, and it is worth more: it is the
runtime's answer rather than a document's. **Note what it is evidence about,
though: a ray from a CONTROLLER.** The hand case is different and is next.

🔴 **AND A HAND'S TARGET RAY ON QUEST IS SYNTHESISED, NOT ANATOMICAL.** This is
the only sentence in Meta's entire WebXR documentation that mentions
`targetRaySpace`, and it is a behavioural warning
([`webxr-hands`](https://developers.meta.com/horizon/documentation/web/webxr-hands/)):

> it is noteworthy that the `targetRaySpace` for hands is populated with an
> **emulated ray** that matches the behaviors of the pointing ray of hands
> present in Meta Horizon Home, **which assumes that the UI is in front of the
> user**, so the target rays will always point in that general direction.

So a hand's ray is not "where the finger points". It is Quest's system-menu
pointer, aimed at where Horizon Home expects a panel to be. **That lands
directly on §5's design and §5.1a is where it is dealt with.** It also means the
grip-versus-ray offset measured in §6 will mean something *different* for a hand
than for a controller — for a controller it is a fixed ergonomic offset, for a
hand it is the distance between your actual hand and a fiction.

`targetRayMode` values MDN lists on that page are **`gaze`** and
**`tracked-pointer`**; the spec also defines **`screen`**, and
**`transient-pointer`** was added for pinch-style platforms. **Which of these a
Quest hand reports is UNCONFIRMED** (§3.2) and §6 prints it rather than assuming.

---

## 2. Angles, since that is what was asked for

`XRPose.transform` is an `XRRigidTransform` and it carries the same rotation
three ways:

| | type | what it is |
|---|---|---|
| `.position` | `DOMPointReadOnly` | x, y, z in **metres**, in whatever space you asked against |
| `.orientation` | `DOMPointReadOnly` | a **quaternion** — x, y, z, w |
| `.matrix` | `Float32Array(16)` | the two composed, **column-major** |

### 2.1 Use the matrix. The codebase has already decided this.

`demo/shell/xr-room.mjs` exports `mul`, `modelM`, `perspective`, `lookAt` and
`beamM` — all of them `Float32Array(16)`, all column-major. `xr-panel.mjs`'s
`placeFacing` builds one by hand. Every uniform is `uniformMatrix4fv`. There is
no quaternion anywhere in the repo. Converting a pose's `orientation` to
something drawable would mean writing a quaternion→matrix step at exactly the
moment the browser has already done it for you.

And the matrix is not merely convenient — **it hands you the basis vectors for
free, with no trigonometry at all**:

```
m[12], m[13], m[14]     position
 m[0],  m[1],  m[2]     the object's own +X   (its right)
 m[4],  m[5],  m[6]     the object's own +Y   (its up)
-m[8], -m[9], -m[10]    the object's own -Z   (its forward)
```

`scene` already reads exactly the first and last of those.

**And the template for a controller stand-in is already in the file.**
`xr-room.mjs`'s `beamM(m, len)` takes a pose matrix and **scales its columns in
place** — `m[0]*sx, m[1]*sx, m[2]*sx` for the X column, and so on — then offsets
the translation down −Z. Its own comment says why that beats the general route:
*"`modelM` cannot do this: it scales uniformly and only rotates about two axes …
Taking the rotation straight out of the pose matrix is both shorter and exact."*

So a grip stand-in is `beamM` with different constants — **not** `mul(grip,
scaleM(…))`, which would run a 64-multiply loop to produce the same 16 numbers.
`mul` is exported and is the right tool when a genuine local *rotation* is
needed (the tablet's tilt in §5.2 does need one, and `mul(a, b)` applies `b`
first, which is the order that argument wants). For a plain scale, copy `beamM`.

### 2.2 If angles are genuinely wanted in a readout — two honest ones, not three

Euler angles (yaw / pitch / roll) are a conversion of about ten lines of `atan2`
and `asin`. The cost is **not** processor time; it is nanoseconds, twice a frame.
The cost is that they are wrong in two ways that this project already has rules
about:

🔴 **Gimbal lock.** Point a controller straight up or straight down and yaw and
roll become the same axis: the two numbers swing wildly while your hand is
perfectly still. A reader sees a cell leap 180° and concludes the *tracking*
broke. CLAUDE.md: *"Every readout cell must be able to change"* — this is the
mirror-image failure, a cell that changes when nothing moved.

🔴 **There is no "the" Euler angle.** Yaw-pitch-roll and roll-pitch-yaw give
different numbers for the same orientation; there are twelve conventions and the
browser picks none of them. A readout that does not name its convention is not a
measurement. CLAUDE.md: *"a statistic that is constant by construction over your
subject is blind"* — this one is worse, it is a statistic that is *ambiguous* by
construction.

**The two angles that are actually well defined**, straight off the matrix, no
conversion, no lock, no convention to declare:

| cell | maths | degenerate when | what it means to a reader |
|---|---|---|---|
| `tilt` | `acos(m[5])` in degrees — the object's own +Y against world up | never | how far from upright the thing in your hand is |
| `heading` | `atan2(-m[8], -m[10])` in degrees — forward, flattened onto the floor | pointing straight up or down | which way it is aimed, as a compass bearing |

`m[5]` is the Y component of the object's own up vector, and world up is
`(0,1,0)`, so the dot product *is* `m[5]`. One `acos`. `heading` is one `atan2`.

⚠️ **And `heading` must print an em dash when it is degenerate**, not a number
and not a zero. CLAUDE.md: *"Nothing unmeasured prints as `0` … a zero reads as a
very confident measurement of nothing."* Pointing straight up genuinely has no
heading; saying so is the correct output.

Two cells keeps a readout even, which `mount()` throws on otherwise.

### 2.3 Velocity

`XRPose` carries three more fields beyond the transform:

| field | what it is | status here |
|---|---|---|
| `emulatedPosition` | `true` when the position is **inferred rather than tracked** — a 3DOF fallback, or tracking lost | in the spec since early on; ESTIMATED present |
| `linearVelocity` | metres per second, **nullable** — runtimes supply it or do not | UNCONFIRMED on Quest |
| `angularVelocity` | radians per second, **nullable** | UNCONFIRMED on Quest |

🔴 **`emulatedPosition` is the one to print, even if velocity is never used.**
A stale pose and a tracked pose look identical from the outside — this is
`plan-xr-room.md` §5.6's rule ("a panel that is not live says so in words") and
CLAUDE.md's rule about a live stream of digital silence, in a new costume. **A
tablet anchored to an emulated hand drifts while claiming to be somewhere**, and
nothing else in the readout would move. §6 counts it.

⚠️ **Do not build anything on the velocities before §6 prints them.** They are
nullable by design, so "the field is there and it is null" and "this runtime
does not do velocities" are the same observation from the outside — and the
whole reason to print rather than branch.

---

## 3. Hands — what the API is, and what is UNKNOWN on our device

### 3.1 The mechanism

All DOCUMENTED via MDN, with dates, under the same caveat as §1.5.

- The feature descriptor is **`hand-tracking`**, in `optionalFeatures` —
  confirmed by MDN's own example on
  [`XRFrame.getJointPose`](https://developer.mozilla.org/en-US/docs/Web/API/XRFrame/getJointPose)
  (2024-02-05): `requestSession({ optionalFeatures: ["hand-tracking"] })`.
- When granted and a hand is present, `XRInputSource.hand` is an **`XRHand`** —
  a Map-like keyed by joint name, each value an `XRJointSpace`.
- **25 joints**, and `XRHand.size` returns 25.
  ([MDN `XRHand`](https://developer.mozilla.org/en-US/docs/Web/API/XRHand),
  2025-04-28.) They are indexed in a fixed order, **`wrist` first at index 0**,
  then thumb, index, middle, ring and pinky, each running metacarpal → proximal
  → (intermediate) → distal → tip.
- `frame.getJointPose(jointSpace, baseSpace)` returns an **`XRJointPose`** — an
  `XRPose` plus one field, **`radius`**: *"A number indicating the radius in
  meters"*, the distance from the joint to the skin.
  ([MDN `XRJointPose.radius`](https://developer.mozilla.org/en-US/docs/Web/API/XRJointPose/radius),
  **2023-07-07** — the oldest source in this document, and MDN flags the feature
  as *"not yet Baseline"*.)
- There is a bulk form, **`XRFrame.fillPoses()` and `fillJointRadii()`**, which
  fill a `Float32Array` for a whole hand in one call. MDN lists both as
  `XRFrame` methods but documents neither in prose, so their exact signatures are
  UNCONFIRMED here.

**`wrist` being index 0 with a stable name is the fact §5.2 needs**: if hands
turn out to report no `gripSpace` (§3.2), `hand.get('wrist')` is the anchor, and
it is one lookup rather than a search.

⚠️ **And `fillPoses` is worth reaching for on arithmetic, not on taste.** 25
`getJointPose` calls × 2 hands × 90 fps is **4,500 calls a second**; the bulk
form is 180. Nothing here has measured what a call costs on an Adreno 740 — but
a 25× difference in call count is the kind of thing to find out about before
shipping the loop, not after. §6's run counts joint resolutions anyway, so the
number falls out of it for free.

🔴 **`radius` is the field that makes primitive hands nearly free**, and it is
worth saying out loud because it changes the recommendation in §4. Twenty-five
cubes or spheres, each placed by its joint matrix and scaled by its own radius,
*is a recognisable hand* — wrist fat, fingertips thin, no mesh, no loader, no
skinning, no asset. It is the same one `drawArrays` per joint against the same
unit cube. The API was designed so that the cheap rendering is the correct one.

### 3.2 What is UNKNOWN, and why the usual sources do not settle it

⚠️ `research/quest-xr-2026-09.md` §1.0 is the governing warning here and it is
unusually specific: **most "Quest" rows in MDN's browser-compat-data are the
literal token `"mirror"`** — copy Chrome for Android's answer, never measured on
a headset — so caniuse and BCD will confidently answer about a device nobody
tested.

**The hand rows are, unusually, among the real ones.** §1.0 lists the genuine
Quest datapoints as *"almost entirely WebXR: … `XRHand`/`XRJointPose`/
`XRJointSpace` (15.1)"*. So the prior is better than usual — but it is still a
version number in a database, not this headset with this build and this user's
settings.

🔴 **And Meta's own hand page is the worst-maintained page in its WebXR tree —
now demonstrated rather than assumed.** `research/quest-xr-2026-09.md` §1.0 gave
the rule (undated Meta pages are stale); this is the number behind it, checked
2026-09-13:

- **Meta sends no `Last-Modified` header on any documentation page.** Responses
  are `cache-control: private, no-cache, no-store, must-revalidate`. For an
  undated page there is **no machine-readable date at all**.
- The `/documentation/web/` tree was restructured **21 July 2026**, and
  `webxr-overview`, `browser-specs` and `webxr-perf` all carry that date.
  **`webxr-hands` carries none.**
- **`webxr-hands`' body text is byte-identical to the Wayback snapshot of
  2024-12-02** — at least **21 months unedited**, sitting beside siblings Meta
  dated two months ago. It is also the *sole* source for the reserved palm-pinch
  gesture, and it describes hand behaviour without mentioning either Browser
  release that changed it.

⚠️ **Two shipped corrections make anything older than Browser 33.1 suspect.**
From Meta's own archived release notes: **15.1** — *"Made a change to WebXR Hand
Tracking joint orientation to correctly match the WebXR specification"*; **33.1**
— *"WebXR joint names adjusted to match W3C specification"*. So Quest shipped
hand tracking with **wrong joint orientations and wrong joint names** and fixed
them in two separate later releases. Any hand-tracking code, sample or
measurement predating 33.1 is describing a different API.

Everything below needs the run in §6:

| unknown | why it matters | settled by |
|---|---|---|
| Is `hand-tracking` **granted** on this headset? | It is a Settings toggle and a permission. "We did not ask properly" and "this device cannot" look identical. | `session.enabledFeatures` — one line |
| Do hands and controllers appear **at the same time**? | §1.2's `break` silently picks one — and §1.3 says the second one may not be in `inputSources` at all | `inputSources.length` **and** `trackedSources.length`, separately |
| Does this build have **`session.trackedSources`** and will it grant `tracked-sources`? | Without it the second input does not exist (§1.3). Upstream Chromium has no such attribute | `typeof session.trackedSources`, and `enabledFeatures` |
| Does a hand report a **`gripSpace`**? | Decides whether a hand-anchored tablet hangs off grip or off the wrist joint. Two different designs. | print `grip NULL` or a position |
| What **`targetRayMode`** do hands report, and is `select` a pinch? | Decides whether the existing `selectstart` handler works unchanged for hands. | print it |
| Do all **25 joints resolve**, every frame? | A partial hand is a broken renderer or a real tracking edge, and a single count cannot tell them apart. | `N joints, M posed` as two numbers |
| Is **`radius`** populated, and with what? | If it comes back 0 or undefined, primitive hands need a hard-coded size table. | print wrist and index-tip radii |
| What is the **pose rate** inside a 90 fps loop? | Unmeasured by anyone on the web for this device. | resolutions counted against frames (§6) |
| 🔴 What happens on **tracking loss**? | This is the one that decides whether a hand-anchored tablet is buildable at all. Does `getJointPose` return null, or a stale pose that *looks* fine? | an `input lost` line with a duration |
| 🔴 **How far off anatomy is the emulated hand ray?** | §5.1a — it decides whether design C exists at all | the angle between the target ray and wrist→index-tip |

### 3.3 🔴 The palm pinch: reserved on BOTH hands, and one of them ends your session

`research/quest-xr-2026-09.md` §1.2 records this as "left-hand palm pinch is
reserved". The primary source is worse than that summary, and it is worth quoting
in full because three separate things in it are hazards
([`webxr-hands`](https://developers.meta.com/horizon/documentation/web/webxr-hands/),
**UNDATED**):

> Hands in WebXR on Meta Quest headsets **reserves the gesture of palm pinch on
> both hands for system use**. To do a palm pinch on either hand, look at your
> palm at eye level, then hold your thumb and index finger together until the
> menu icon (left hand), or the Meta Quest icon (right hand) fills up, then
> release. **Performing a palm pinch on the left hand is equivalent to pressing
> the menu button on your left controllers, which takes the user out of the
> WebXR session.** The palm pinch gesture is not to be confused with regular
> pinch gesture, which is implemented in the emulated Gamepad attribute for the
> hand as a button press.

1. **Both hands are reserved**, not just the left.
2. **The left one ends your session.** A page cannot prevent it, and
   `plan-xr.md`'s rule that the page must own a way out does not extend to owning
   a way to *stay*. It should be expected and logged, not treated as a crash.
3. 🔴 **It can fire a phantom `select`.** `immersive-web/webxr-hand-input#117` —
   filed by Meta's own spec editor, **open and unresolved since 2022** — records
   Quest Browser firing a spurious `select` as the user reaches for this gesture.
   **§5.5 maps `selectstart` to a press on the tablet**, so a user reaching for
   the system menu can press whatever the ray happens to be over.

⚠️ **And there is no API to detect it.** Meta publishes no statement that the
gesture is filtered out of app-visible hand data, and none that an app is
notified when the system consumes it. So the mitigation is not detection, it is
**design**: nothing on the tablet may be destructive on a single press, and
anything that is gets a confirm — which is good practice anyway and is now
forced.

⚠️ A second Meta page disagrees with the first about which hand is which:
[`design/hands`](https://developers.meta.com/horizon/design/hands/) (**Updated:
Sep 9, 2026**) maps the menu to the *right* hand and the app menu to the *left*,
never says "reserved", and never mentions WebXR. **The dated page and the undated
page contradict each other**, which is its own finding: do not bind a pinch on
either hand until a device says which is which.

### 3.4 Hand tracking rate: 30/60 Hz is the NATIVE figure and must not be carried across

DOCUMENTED for the native SDK
([`design/hands-technology`](https://developers.meta.com/horizon/design/hands-technology/),
**Updated: Aug 17, 2026**): *"**Default mode**: Offers hand tracking at
**30Hz**… **Fast Motion Mode (FMM)**: …offers a tracking rate to **60Hz**…
**Tradeoff**: The increased tracking rate can create a jitter."* And from
[`unity/fast-motion-mode`](https://developers.meta.com/horizon/documentation/unity/fast-motion-mode/)
(**Updated: Aug 11, 2026**): **"You cannot enable FMM with Multimodal."** So
natively, 60 Hz hands and simultaneous-hands-and-controllers are **mutually
exclusive**.

🔴 **None of that is a statement about the browser, and Meta publishes no web
figure at all** — not on any of its ten WebXR pages, not in the archived full
release notes, not in the IWSDK docs. There is no statement that WebXR inherits
the 30 Hz default, no statement that FMM affects it, and **no way for a page to
request it**. The W3C hand-input module is silent on update rate too.

⚠️ So **do not quote 30 or 60 Hz about anything this repo ships.** It is the
`candidate-pair` RTT mistake waiting to happen — a real number, correctly
measured, about a different thing. This is MEASURED-or-nothing, and §6's
`joints N/N` fraction is the measurement. ⚠️ If it comes back at roughly a third
of the frame count, *that* is the 30 Hz figure arriving as evidence rather than
as a quote — and it would also mean **joint poses are stale on two frames out of
three**, which a tablet anchored to a wrist would show as judder.

⚠️ **And the "mutually exclusive" note is worth carrying even though it is about
Unity**, because if it reflects a hardware constraint rather than an SDK one,
then asking for `tracked-sources` (§1.3) may *cost* hand rate. Nobody has said
either way for the web.

### 3.5 Simultaneous hands and controllers — the two versions

DOCUMENTED, but only via the Wayback Machine: every historical Browser
release-notes URL now redirects to a search page that server-renders only the ten
newest entries and carries the banner *"Release note descriptions are summarized
by AI from Meta"*. **The original per-version text is gone from the live site.**
Recovered from a snapshot of `browser-release-notes` dated *"Updated: Jul 23,
2024"*:

> **Meta Quest Browser 31.4 (available on OS v62+ only)** — WebXR: Add support
> for simultaneous hands and controllers.

> **Browser 34.1** — WebXR Multimodal Input: If hands are enabled in WebXR, you
> can now get one hand and one controller. In addition, the non-primary inputs
> can now be tracked in the session's `trackedSources` attribute.

**34.1 is the one that matters** — 31.4 adds the capability, 34.1 gives
one-hand-plus-one-controller (which is exactly design B in §5.1a) and routes the
non-primary input into `trackedSources`.

⚠️ **Meta publishes version numbers only, no calendar dates per release.** The
circulating "31.4 = Feb 2024 / 34.1 = Jul 2024" dates are third-party. Meta's
only anchor is its own *"available on OS v62+ only"*. Treat the dates as
UNCONFIRMED; the headset in the cupboard reports **150.1**, which is far past
both.

---

## 4. Rendering a controller — assess whether we should

### 4.1 The two options, priced

**(a) glTF from the WebXR Input Profiles registry**
([immersive-web/webxr-input-profiles](https://github.com/immersive-web/webxr-input-profiles)).
`inputSource.profiles` is an ordered array of profile ids, **most specific
first**, ending in a generic fallback. You match it against the registry, fetch a
profile JSON, pick the asset for the handedness, load a `.glb`, and — if you want
the trigger to move when the trigger moves — walk the node hierarchy applying the
profile's `visualResponses` per gamepad component.

⚠️ **This plan deliberately does not quote the exact profile id strings for our
controllers**, and that is not a gap. The ids are a property of the headset in
the cupboard, not of a document: §6 prints `profiles` verbatim off the device,
which is one line and is the far side of the boundary. Looking them up first and
then "confirming" them is the shape of check this project already distrusts.

What that costs *here*, concretely:

1. **A glTF loader, which this repo does not have and is not one file.** JSON +
   binary chunk + accessors + buffer views, then a material and texture pipeline
   — the Touch assets are PBR with baked maps. The room's shader is a single
   flat-colour box program with position at slot 0 and normal at slot 1
   (`ROOM_VS`/`BOX_FS` in `xr-room.mjs`). **A textured PBR mesh does not go
   through it.** So it is a loader *and* a second renderer.
2. **A third-party fetch inside the entry path.** The registry's assets are
   served from a CDN. This repo has lost three headset runs to things that
   throw between `requestSession` and the first frame, and CLAUDE.md's standing
   rule is that the entry path gets instrumented before it gets guessed at. A
   network round trip is the worst possible thing to add there.
3. **It only answers for controllers.** Hands have a generic profile with no
   mesh, so the hand half needs primitives regardless — meaning the loader buys
   you *one* of the two things that needed drawing.
4. It is the only realistic object in a room of flat-shaded boxes. It would read
   as an asset dropped in, not as part of the room.

**(b) A primitive stand-in at the grip pose.** Two or three unit cubes: a stubby
body down the grip's −Z, a flattened ring for the tracking band, a small marker
at the thumbstick. Each one is `beamM`'s column-scaling pattern with different
constants (§2.1), drawn against the VAO `xr-room.mjs` already has, through the
flat-colour box program it already compiled. Hands are **the same loop with 25
boxes and `radius` for the scale**. **Roughly 20 lines, no dependency, no fetch,
no second shader, no new failure mode in the entry path.**

### 4.2 Recommendation: (b), and read `profiles` anyway

**Draw primitives.** Three reasons in order of weight:

1. **What a rendered controller is FOR here is answering "where is my hand",
   not "which controller is this".** A stand-in answers that completely. The
   identity question is already answered by the object being in your hand.
2. The dependency is a loader *plus* a PBR path *plus* a CDN fetch in the most
   expensive code in the repo to get wrong.
3. This repo draws everything from primitives on purpose, and it is a stated
   aesthetic — `pattern.mjs`, the room, the beam. Consistency here is a
   decision, not an accident.

🔴 **But read `profiles` and print it, which costs one string and fixes a real
latent bug.** `scene` hard-codes `gamepad.buttons[4]` as "A/X" and
`axes[3] ?? axes[1]` as the thumbstick Y. **Those indices are a guess about a
controller nobody asked the name of.** The registry's profile JSON is a few
kilobytes and maps *named* components (`a-button`, `xr-standard-thumbstick`) to
their gamepad indices — so you can look up "the A button" instead of guessing at
4. **You can take the index map without ever taking the mesh.**

The staged version, cheapest first:

| stage | cost | what it buys |
|---|---|---|
| print `profiles` in the §6 log line | one string | tells us whether `[4]`/`[3]` match this controller at all |
| a tiny hard-coded map for the two or three profiles we ever see | ~10 lines | correct button names with no fetch |
| fetch the profile JSON for the index map | one small fetch, **not** in the entry path | correct on hardware we have never seen |
| fetch the `.glb` | a loader and a renderer | a photoreal controller |

Stop after stage 2 unless something forces otherwise. ⚠️ And if the `.glb` is
ever wanted, it is **a `/kit/` conversation before it is a commit** — CLAUDE.md's
rule is to stop and ask before building a fourth copy of anything, and a second
renderer is well past that line.

---

## 5. 🔴 The virtual tablet

### 5.1 The constraint that shapes it, first

`plan-xr-room.md` §3: **"One controller. Measured, in this user's hands. Every
gesture must work with one, which already killed a two-grip idea once."**

A tablet on one hand, pointed at by the other, **requires two input sources**. So
the design is not "a quad on the left grip" — it is:

- **Two sources present** → the tablet rides one grip, the other points at it.
  This is the PDA the question asks for.
- **One source present** → the tablet **parks in the room** at arm's length,
  turned to face you, and the same controller points at it.

And **the one-controller path is already built.** `xr-panel.mjs` places a quad
in front of you at session start, keeps it facing your head, and lets the trigger
drag it around. A parked tablet is that panel with a different canvas on it.

⚠️ The page must **say which mode it is in, in words**. A tablet that silently
does not attach to a hand reads as a broken tablet, which is the repo's
"a blank cell collapses two findings" rule in a new costume.

### 5.1a 🔴 The emulated hand ray, which decides what the tablet actually is

§1.5 quotes Meta: a hand's `targetRaySpace` on Quest is an **emulated ray** that
*"assumes that the UI is in front of the user, so the target rays will always
point in that general direction."*

**Read plainly, that breaks the headline design.** "Hold the tablet in your left
hand down by your waist and point at it with your right" needs the right hand's
ray to go *down and across*. If Quest's hand ray always points forward at where
Horizon Home would put a menu, it cannot. The tablet would be unpointable
exactly where you would naturally hold it, and — worse — it would half-work,
because a hand raised up in front of your face *is* roughly where the emulated
ray goes.

⚠️ **Note what is and is not known.** The sentence is DOCUMENTED by Meta, on an
**undated page whose body text is byte-identical to a 2024-12-02 snapshot** —
at least 21 months unedited (§3.2). How far the ray deviates, and whether it has
changed across the four Browser releases since, are both UNMEASURED. "Always
points in that general direction" is not a number, and the design decision needs
one. **§6 measures it**: the angle between a hand's target ray and the direction
from its own wrist to its index-finger tip. If that angle is a few degrees, the
ray is anatomical enough and the headline design stands; if it is forty, it is a
fiction and the fallback is what ships.

**Three designs, ranked by how little they depend on the answer:**

| | what it needs | survives an emulated ray? |
|---|---|---|
| **A. tablet parked in the room, one controller points at it** | one controller, and the code `xr-panel.mjs` already has | ✅ **yes — controllers are unaffected**, their ray is real and this repo has already grabbed things with it on a Quest |
| **B. tablet on one hand, the OTHER CONTROLLER points at it** | one hand + one controller, and `tracked-sources` (§1.3) | ✅ yes — only the anchoring uses the hand, and anchoring uses **grip or wrist, never the ray** |
| **C. tablet on one hand, the other HAND points at it** | two hands, and an anatomical ray | ❓ **this is the one at risk** |

🔴 **So build A, then B, and let the measurement decide whether C is ever worth
attempting.** That ordering is not a retreat — A is already built, B is the
genuinely novel one (a screen in your hand, driven by the controller you are
already holding), and B is the version that works with **one controller**, which
is the constraint §5.1 opens with. The emulated ray costs us C, and C was the
version that needed two hands and therefore violated the constraint anyway.

⚠️ **And the anchoring half is untouched by any of this.** A hand's *pose* — grip
or wrist joint — is real tracking data. It is only the *ray* that is synthesised.
So "a screen that rides your hand" is safe; "a finger that points at things" is
the part in doubt.

### 5.2 Where the quad lives

**Hand-anchored.** Model matrix = `mul(gripMatrix, localM)`, where `localM` is a
fixed offset and rotation that sits it like a clipboard in the palm, tilted
30–45° toward the face, plus a scale.

- **Size: about 0.20 m × 0.13 m**, which at ~0.35 m from the eye is a phone held
  at reading distance. (`mirror`'s panel is 1.28 m × 0.80 m at 1.6 m — same
  angular size, an order of magnitude closer. That is the point: a tablet is a
  thing you hold, not a screen on a wall.)
- **Never head-locked.** `xr-panel.mjs`'s header already argues this for panels
  and it is more true for a tablet: a surface you cannot look away from is a
  surface you cannot put down.
- 🔴 **It must survive the hand it is on disappearing.** A controller behind your
  back, a hand out of the cameras. The rule: **freeze it where it was in room
  space and say so on its own face.** Do not let it snap to a stale pose, and do
  not let it vanish. `emulatedPosition` (§2.3) and the `input lost` line (§6) are
  how the page knows.

**Legibility is unmeasured and it is the real risk.** `plan-xr-room.md` §9 lists
*"whether the panel is LEGIBLE at 1.28 m wide from a 1280×800 texture"* as still
open after the last device run. A tablet makes that harder, and the instinct it
provokes — a small object, so a small texture — is **backwards**. Budget for the
*angular* size, not the metres:

| | metres | distance | angle it subtends | texture | pixels per degree |
|---|---|---|---|---|---|
| `mirror`'s panel (shipped) | 1.28 wide | 1.6 m | **43.6°** | 1280 px | **29.4** |
| a tablet at 1024 px | 0.20 wide | 0.35 m | **32.0°** | 1024 px | **32.0** |
| the same tablet at 256 px | 0.20 wide | 0.35 m | 32.0° | 256 px | **8.0** |

(`2·atan(w/2 / d)`, and `mirror`'s numbers are read from its own source:
`PANEL_W = 640` at `scale: 2`, hung at `w: 1.28` with `xr-panel.mjs`'s default
`dist = 1.6`.)

So **around 1024×640 keeps the tablet at the density the shipped panel already
has** — 32 against 29.4 pixels per degree — and 256 px would be a quarter of it.
⚠️ That comparison is only a *floor*, because the shipped panel's own legibility
was never graded: §9 says the device report was about lag, not reading. Matching
an ungraded number is not the same as being legible, and only a face answers it.

### 5.3 Ray versus quad — the maths, and what it costs

The quad's model matrix `M` (column-major) carries everything needed:

```
R = (M[0], M[1], M[2])      local +X, scaled by the quad's width
U = (M[4], M[5], M[6])      local +Y, scaled by its height
N = (M[8], M[9], M[10])     local +Z — the normal
C = (M[12], M[13], M[14])   the centre
```

The ray, already computed in `scene`: origin `o = (rm[12], rm[13], rm[14])`,
direction `d = (-rm[8], -rm[9], -rm[10])`.

```js
// 1. the plane
const den = d[0]*N[0] + d[1]*N[1] + d[2]*N[2];
if (Math.abs(den) < 1e-6) return null;                 // parallel — no hit
const w = [C[0]-o[0], C[1]-o[1], C[2]-o[2]];
const t = (w[0]*N[0] + w[1]*N[1] + w[2]*N[2]) / den;
if (t <= 0) return null;                               // behind you

// 2. the point, in the quad's own coordinates
const P = [o[0]+t*d[0], o[1]+t*d[1], o[2]+t*d[2]];
const v = [P[0]-C[0], P[1]-C[1], P[2]-C[2]];
const x = (v[0]*R[0] + v[1]*R[1] + v[2]*R[2]) / (R[0]*R[0] + R[1]*R[1] + R[2]*R[2]);
const y = (v[0]*U[0] + v[1]*U[1] + v[2]*U[2]) / (U[0]*U[0] + U[1]*U[1] + U[2]*U[2]);
if (Math.abs(x) > 0.5 || Math.abs(y) > 0.5) return null;

// 3. texture coordinates — READ OFF THE SHADER, never derived twice
const u = x + 0.5, vt = 0.5 - y;      // PANEL_VS: vUv = (aPos.x + 0.5, 0.5 - aPos.y)
return { t, u, v: vt };
```

**Why divide by the squared length.** `R` and `U` are not unit vectors — the
width and height are baked into those columns by `placeFacing`. Dividing by
`R·R` normalises *and* rescales in one step, so `x` and `y` come out directly in
`[-0.5, +0.5]`, which is exactly the range of the quad's own vertices in
`xr-panel.mjs` (`P = [-0.5,-0.5,0, 0.5,-0.5,0, …]`). No separate scale term, and
nothing to keep in step when a panel's metres change.

🔴 **And `u, v` are NOT canvas pixels. Three separate conversions sit between
them and a strip hit test, and getting any one wrong is a silent offset.**
Measured by reading `timeline/strip.mjs`:

- `resize()` (line 1109) sets `canvas.width = cssW * dpr` with **dpr capped at
  2**, and stores `S.width = cssW` — so **`canvas.width` and `S.width` differ by
  a factor of 2** on any normal display.
- `localX()` (line 1472) also **subtracts `S.gutterPx`**, the label gutter on the
  left. `hitTest` expects coordinates that have already had it taken off.
- `S.gutterPx` itself changes with width (`cssW < S.narrowAt` picks the narrow
  gutter), so it cannot be a constant typed anywhere.

So the conversion is, and must read these off the strip's own state rather than
from anything typed twice:

```js
const S  = strip.state;                  // exposed on the returned api
const px = u  * S.width  - S.gutterPx;   // NOT u * canvas.width
const py = vt * S.height;
```

Use `u * canvas.width` and every press lands at **twice the time it should**,
shifted by the gutter — a plausible wrong answer with no error anywhere. This is
the strongest single argument for route (ii) in §5.5: the conversion is three
fields of a public state object, and it is the same three fields the strip uses
on itself.

**What it costs.** Count it: one dot for `den` (3 mul, 2 add), one subtract (3),
one dot for `t` (5), one divide, three mul-adds for `P`, three subtracts for `v`,
four dots (20). **About 30 floating-point operations and one divide, per quad,
per ray, per frame.** Two rays and four quads at 90 fps is roughly **22,000
floating-point operations a second**, on a part that is shading 3360×1760 twice
at 90 Hz. It does not appear in any measurement anyone could take. **Say so
plainly in the code, so nobody proposes a bounding-volume hierarchy for four
rectangles.**

### 5.4 ⚠️ The one real trap, and the assert that catches it

`placeFacing` builds the third column as `(-fx, 0, -fz)` where `(fx, fz)` points
*from your head toward the panel*. So **the quad's +Z points back at you**, and
`den = d·N` is **negative** when you are pointing at the front of it.

Worked through: with the panel straight ahead, `f = (0,0,-1)`, so
`R = (1,0,0)`, `U = (0,1,0)`, `N = (0,0,1)`. Your aim is `d ≈ (0,0,-1)`, giving
`den ≈ -1`; and `w = C - o ≈ (0,0,-dist)` gives `w·N ≈ -dist`, so
`t = -dist / -1 = +dist`. **The formula in §5.3 is correct as written with a
negative `den` — the two signs cancel.**

🔴 **The trap is adding a backface test that looks like a tidy-up**, and it is
the sign you write it with. ⚠️ **CORRECTED 2026-09-13, and the correction is the
point of this paragraph.** This section originally said that `if (den > 0)
return null` "rejects every valid hit and nothing else" — **that is wrong, and
its own worked example one paragraph above disproves it**: a valid front hit
derives `den ≈ -1`, which that line KEEPS. The line that rejects every valid hit
is `if (den < 0) return null`, written by somebody who assumed +Z faces away
from the viewer. A warning that is confidently wrong about which sign is which
is worse than no warning, because it is the sentence that gets copied — the same
failure as `csound.mjs`'s "118 ms early" comment, which was the distance between
two wrong answers.

**So `demo/shell/xr-pick.mjs` carries no bare sign test at all.** It computes a
named `front = den < 0`, takes `{ backface }` as an option, and
`xr-pick-test.mjs` asserts BOTH directions on synthetic matrices — the
convention is a measurement rather than a recollection. The tablet, whose +Z
also comes back at the viewer, uses the same function unchanged:

```
demo/shell/xr-pick-test.mjs     # node demo/shell/xr-pick-test.mjs
  a ray from the head through the quad's centre hits at u 0.5, v 0.5
  a ray at the top-left corner hits at u 0, v 0                     (and not 1,1)
  the same quad turned 90° in yaw still hits at 0.5, 0.5            ← catches R/U swaps
  a ray from BEHIND the quad misses                                 ← negative control
  a ray parallel to the quad misses                                 ← negative control
  a ray 1 mm outside the edge misses                                ← negative control
```

⚠️ **The corner case is the one that earns its place**, and it has to be a
corner rather than the centre: the centre hits at 0.5, 0.5 under *every* mirror,
transpose and axis swap you could make, so it is a statistic that is constant by
construction over the defects it is meant to catch. The whole point of the
top-left is that it distinguishes `0,0` from `1,1`, `1,0` and `0,1` — the four
ways the shader's `vUv = (aPos.x + 0.5, 0.5 - aPos.y)` can be re-derived wrong.

Three of those five are negative controls, per the convention already set by
`demo/shell/diagram-test.mjs` — *"a check that cannot fail is a check that is
decoration"*. **All five are pure arithmetic on two `Float32Array(16)`s, so they
run on a laptop with no headset and no browser.** Build them before the device
run; they are the half a Quest cannot grade better than `node` can.

### 5.5 How a press maps to a control

Three states, and they map onto constants the kit already exports — `TOUCH` in
`xr-panel.mjs`:

| state | how | what the page does |
|---|---|---|
| ray on the quad, nothing pressed | hit test returns non-null | `TOUCH.aimed` on the quad, **and a cursor drawn into the canvas at (px, py)** |
| `selectstart` while aimed | the existing session event | a press at (px, py) |
| `selectend` | the existing session event | a release |

⚠️ **The cursor has to be drawn into the canvas, not floated in 3-D.**
`plan-xr-room.md` §3 already names press feedback as the missing thing, and
`xr-room.mjs`'s own comment says a marker at the end of the beam *"reads as a
fourth object in the room, one that follows you and cannot be picked up"*. On a
tablet the beam ends *on a surface*, and the surface is a canvas you are already
redrawing every frame — so the cursor is `ctx.arc` and costs nothing.

⚠️ **And feedback is size and brightness, never hue.** CLAUDE.md: colour says
HOW SOMETHING LANDED. `TOUCH` already encodes exactly that pair, which is why it
exists and why a tablet must not invent a second answer.

🔴 **A `select` from a HAND cannot be trusted to mean "the user pressed".** §3.3:
Quest Browser fires a spurious `select` as the user reaches for the reserved palm
pinch, there is no API to detect it, and the bug has been open since 2022. So the
rule for anything on this surface is **no destructive action on a single press**
— seeking is fine and reversible, play/pause is fine, anything that discards work
gets a confirm. That is good practice regardless; it is now forced, and it is
cheaper to design in than to retrofit after somebody's take is gone.

Now, delivering that press to the control. Two routes, and they are not equal:

**(i) Synthesize a `PointerEvent` on the canvas.** `timeline/strip.mjs` binds
`pointerdown`/`pointermove`/`pointerup` directly on its canvas (lines 1767–1777),
so a dispatched event fires its real handlers. **Two silent failure modes:**

- 🔴 It converts back with `canvas.getBoundingClientRect()` (lines 1473, 1477).
  **If the canvas is not laid out — detached, `display:none`, zero-size — the
  rect is all zeros and every coordinate collapses to the left edge**, so every
  press seeks to the beginning. No error, no log line, a plausible wrong answer.
  The canvas must stay laid out at a real non-zero size while you are in the
  headset (it is invisible there but it is still in the document), **and that has
  to be asserted, not assumed**: check `rect.width > 0` and say so in words.
- ⚠️ `onDown` calls `canvas.setPointerCapture(e.pointerId)`, guarded as
  `canvas.setPointerCapture && …` — which checks the *method exists*, not that
  the call succeeds. `setPointerCapture` throws `NotFoundError` for a pointer id
  that is not an active pointer, which a synthetic one is not. The throw is
  caught by the browser (it is a DOM handler, not the XR frame callback, so it
  does **not** hit the render-loop rule) — but it aborts the rest of `onDown`,
  so the press registers a hit and never arms the drag.

**(ii) Call the control's own API.** `createStrip` already returns `hitTest(px,
py, tolPx)` and `state`, and takes an `opts.onSeek`; `createTransportBar` takes a
`command` object for exactly this reason. So:

```js
const S  = strip.state;
const px = u * S.width - S.gutterPx, py = vt * S.height;   // §5.3
const hit = strip.hitTest(px, py, slop);
if (hit) deck.seek(hit.t);
```

`hitTest` returns `{lane, row, t}` (line 1499), and `t` **is** the time under the
cursor — so there is no second time-mapping to write and none that can drift out
of step with the one the strip draws with.

⚠️ **`slop` is the one number here that is NOT readable off the strip.** Its
touch radius lives in a module-local `const TOUCH = { slop: opts.touchSlop ?? 22
}` (line 1590) that is neither on `state` nor on the returned api. So a caller
either passes `touchSlop` in when it creates the strip — and then owns the
number honestly, in one place — or types 22 here and has created a constant that
can silently disagree with the strip's own. **Pass it in at construction.** A ray
in a headset is at least as coarse as a finger, so a tablet probably wants a
*larger* value than 22 anyway, and that is a decision worth making on purpose
rather than inheriting.

**Recommendation: (ii), and change nothing in the strip or the bar.** Route (i)
is a translation layer with two failure modes that both present as *"the tablet
is broken in a way nobody can see"* — this project's most expensive shape of
bug. Route (ii) is two lines against an API that already exists and is already
the one `transport-bar.mjs` uses. ⚠️ If a *third* control ever needs this, that
is the moment to write one small `demo/shell/xr-surface.mjs` — the `/kit/` rule —
not before.

### 5.6 🔴 Can a DOM surface be reused, or does it have to be drawn again?

This is the question with the most surprising answer, and it splits:

**The strip is already a canvas, so it needs no redraw at all.**
`demo/shell/strip.mjs` creates `el('canvas', …)`; `timeline/strip.mjs` draws all
138 of its `ctx.` calls into it. `xr-panel.mjs` already does
`gl.texImage2D(…, p.canvas)` once per frame, and the cost of that on the real
device is **MEASURED at 0.10–0.20 ms CPU for a 1280×800 canvas**
(`plan-xr-room.md` §9). The tablet at §5.2's 1024×640 is **64% of those pixels**,
so an upload of roughly **0.06–0.13 ms** — if the cost is linear in pixels, which
is an ESTIMATE and the only one in this paragraph.

**So the timeline goes into a headset today, with the code that already exists,
for a cost already measured on the hardware.** That is the finding. It is not a
port; it is `panels: [{ canvas: stripView.el, w: 0.20, h: 0.13 }]`.

⚠️ Two conditions on that. The strip runs its own `requestAnimationFrame` loop
(`opts.loop !== false`) — inside a session, the *page's* rAF is not the
*session's* rAF, so the strip should be driven from `createXRPanels`'s `onFrame`
hook with `loop: false`, which is exactly the hook that exists for it. And the
strip's `ResizeObserver` re-fits on the first non-zero measurement, so the canvas
must have a real size before the session starts or the first frame in the headset
shows a 1 px window.

**The transport bar is DOM and cannot follow.** `demo/shell/transport-bar.mjs`
builds 11 elements with `el()` and has zero canvas calls. There is no supported
way to get DOM pixels into a WebGL texture: `html2canvas`-style rasterisers are a
dependency *and* a reimplementation of layout, and the `SVG foreignObject` →
`drawImage` trick taints the canvas, behaves differently per engine, and does not
pick up `shell.css` cascaded from the document. **It has to be drawn again.**

Which raises the rule directly: CLAUDE.md says **"Transport UI is
`demo/shell/transport-bar.mjs` and nothing else."** A canvas transport is a
second implementation of the one transport. Two ways through, and the second is
better:

**Resolution A — the tablet's transport is a VIEW, not a transport.** It draws
state it reads from `observePosition`, and it issues `deck.seek()` / the same
`command` object. **If any *policy* appears in the canvas version — end-stop,
rate-lattice intersection, degraded reasons — it is a fork and it is wrong.**
Put the drawing in its own module whose header says exactly that. ~60 lines of
`ctx.fillText`/`fillRect`; `panel.mjs` already draws a title, a footer and five
numbers, so the idiom is there to copy.

**Resolution B — do not put the transport bar on the tablet at all, and this is
the recommendation.** CLAUDE.md: *"One position surface per page"*, and where
there is a strip the bar **already gives up its slider** because the strip seeks
on press and on drag and the bar's scrub did not. In a headset the only things
the bar has that the strip does not are **play/pause, the clock, and the rate**.

Three things is three buttons. A row of three big rectangles along the bottom of
the tablet — easier to hit with a ray than a 1.5 px playhead, easier to draw than
a bar, and **not a second transport**, because it carries no policy at all: it
calls `cmd.play()`, `cmd.pause()`, and prints a number.

**So the cheapest correct tablet is: the strip's canvas verbatim, plus three
drawn buttons, plus a cursor.** No new transport, no rasteriser, no loader, and
one `texImage2D` whose cost is already on the record.

### 5.6a One canvas or two quads — and the coordinate step it adds

`createXRPanels` takes a list of panels, each with its own canvas, so two quads
is natively supported. **It is still the wrong answer here**: `placeFacing` fans
several panels *around you* (`(i - (n-1)/2) * 0.7` radians apart), which is right
for a room of screens and wrong for two halves of one object. Stacking them would
mean a second placement rule for a case with one member.

**One canvas, composited by the page**, in the `onFrame` hook that exists for
exactly this:

```js
tab.ctx.drawImage(stripView.el, 0, 0, TAB_W, STRIP_H);   // the strip, verbatim
drawButtons(tab.ctx, 0, STRIP_H, TAB_W, BTN_H);          // ~60 lines
drawCursor(tab.ctx, px, py);                             // ctx.arc
```

A canvas-to-canvas `drawImage` is a blit, and Chromium accelerates it; ESTIMATED
well under 0.1 ms at this size, and it is measured for free because it lands
inside `state.drawCpuMs`, which `xr-panel.mjs` already separates from
`uploadCpuMs` — *"they are kept apart because they answer different questions"*.

⚠️ **And it adds one step to §5.3's conversion**, which is the whole reason this
subsection exists rather than being a footnote. The tablet's `v` covers the
strip *and* the buttons, so:

```js
const ty = vt * TAB_H;                       // pixels down the TABLET
if (ty < STRIP_H) {                          // the strip's half
  const px = u * S.width - S.gutterPx;       // TAB_W cancels — see below
  const py = (ty / STRIP_H) * S.height;
  const hit = strip.hitTest(px, py, slop);
  if (hit) deck.seek(hit.t);
} else {                                     // the buttons' half
  const which = Math.floor(u * 3);           // play/pause · clock · rate
  …
}
```

⚠️ **`TAB_W` cancels out of the X term and `STRIP_H` does not cancel out of Y** —
because the strip spans the tablet's full width but only part of its height. That
asymmetry is exactly the kind of thing that gets "tidied" into symmetry by
someone reading quickly, so it is worth the comment in the source as well as
here.

Four coordinate spaces now stand between a ray and a seek — quad, tablet canvas,
strip CSS pixels, strip time. **Every one of them is pure arithmetic, so every
one of them belongs in `xr-pick-test.mjs` (§5.4) rather than in a headset run.**
A press that lands in the wrong place is the defect this whole design is most
likely to ship, and it is the one a laptop can grade exactly.

### 5.7 What a visitor would be told

Three sentences, no jargon, per the rule — no "grip", no "target ray", no
"joint", no "quaternion":

> Hold up your hand and there is a small screen on it, with the timeline on it
> and three buttons along the bottom. Point at it with your other hand and press
> the trigger to move the playhead, or to start and stop. The numbers under it
> say how many things the headset is tracking and how often it answers — and if
> a hand leaves the cameras the screen stops where it was, rather than jumping.

---

## 6. What to measure first — one headset run

### 6.1 Where it goes

**Into `scene`, not into a new page.** `scene` already has the session, the
beacon path, the exits, the dead-man's switch, and a one-shot `raysSaid`
diagnostic line at exactly the right place in the loop. A new page is a new entry
path and five defects to re-pay for nothing.

### 6.2 The lines to ship

**One-shot, on the first frame where either source array is non-empty**, and
again on any change to either (a controller put down and hands raised is a
different set, and it is one of the things being measured):

```
input · 1 input + 1 tracked · trackedSources attribute PRESENT
      · granted [local-floor, hand-tracking, tracked-sources]
  I0 right tracked-pointer · profiles meta-quest-touch-plus,oculus-touch-v3,generic-trigger-squeeze-thumbstick
      ray 0.31,1.12,-0.42 · grip 0.30,1.09,-0.38 · grip-ray offset 0.051 m, 24.8°
      gamepad 7 buttons, 4 axes · hand none
  T0 left  tracked-pointer · profiles generic-hand-select,generic-hand
      ray 0.19,1.08,-0.40 · grip NULL
      hand 25 joints, 25 posed · wrist r 0.024 · index-tip r 0.008
      ray-vs-anatomy 38.4°   ← wrist->index-tip against the target ray
```

🔴 **`I0` / `T0` rather than `0` / `1`, and the count printed as `1 input + 1
tracked`.** §1.3 is the reason: which ARRAY a source came out of is the finding,
and a flat index would erase it. A run that prints `2 input + 0 tracked` and one
that prints `1 input + 1 tracked` describe two different browsers, and the naive
line cannot tell them apart.

⚠️ **`trackedSources attribute PRESENT` is separate from the count on purpose.**
Absent-and-empty, present-and-empty, and present-with-one-hand are three
different answers — and the first two are what a desktop Chrome and an
un-granted session look like respectively. Collapsing them into `0` would be the
"we did not look" / "we looked and it was fine" collapse this repo has a rule
about.

**A rate line at 3 s and at 10 s** — twice, because the first covers startup and
the second covers steady state, and `plan-xr-room.md` §9 already found those two
differ (84.5 → 90.0 fps):

```
input rate · 271 frames · ray 271/271 · grip 271/271 · joints 6775/6775 · emulated 0 · worst gap 41.8 ms
```

**And one line per loss, rate-limited, on the trailing edge:**

```
input lost · right hand joints unresolved 0.42 s (38 frames) — last wrist 0.30,1.09,-0.38
```

### 6.3 Why each field earns its place

| field | what it settles | what it costs |
|---|---|---|
| `granted [...]` from `session.enabledFeatures` | whether `hand-tracking` was granted at all. **"We did not ask properly" and "this device cannot" are different findings** and a missing `hand` collapses them | one join |
| — and it is free elsewhere | ⚠️ **`session.enabledFeatures` is read nowhere in this repo today**, and `research/quest-xr-2026-09.md` has been asking for it in two places since it was written: §6's hour-long probe list item 3, and §7's "what would have to be true" item 4 (`camera-access` and `shared`). Printing the *whole array* rather than testing for one token settles all of those in the same line, at no extra cost | print the array, do not filter it |
| 🔴 `N input + M tracked`, and the attribute's presence | whether hands and controllers coexist **and which array each arrived in** (§1.3). Without this the highest-cost trap in the document is invisible: an un-granted `tracked-sources` reads exactly like a headset with one controller | two `.length`s and a `typeof` |
| `profiles` | whether `buttons[4]` / `axes[3]` match this controller, or are a guess about a different one (§4.2) | one string |
| `targetRayMode` | whether `selectstart` works unchanged for hands | one string |
| 🔴 **`ray-vs-anatomy …°`** — the angle between a hand's target ray and its own wrist→index-tip direction | **decides whether §5.1a's design C exists.** Meta says the hand ray is emulated and *"always points in that general direction"*; that is a sentence, and this is the number under it. A few degrees means anatomical enough; forty means a fiction. ⚠️ Meaningless for a controller — print it only for a source with a `hand` | one cross-product and an `acos` |
| 🔴 **`grip-ray offset … m, …°`** | **the single highest-value field in the run.** It turns §1.4 from a claim into a number: how far a model hung off the wrong space would float, on *this* runtime. If it reads 0.00 m / 0.0° the distinction is moot here and we stop worrying about it | one subtract, one `acos` |
| `grip NULL` vs a position | whether a hand-anchored tablet hangs off grip or off the wrist joint — two different designs (§5.2) | a null check |
| `N joints, M posed` | **two numbers, never one.** A partial hand is either a broken reader or a real tracking edge, and a single count cannot tell them apart | a counter |
| `wrist r` / `index-tip r` | whether `radius` is populated, and the scale primitive hands draw at. If it is 0 or absent, hands need a hard-coded size table (§3.1) | two floats |
| `ray N/N`, `grip N/N`, `joints N/N` | **the pose rate as a fraction, not a Hz figure.** A Hz number needs a clock and still cannot separate "the runtime updates at 60 while we render at 90" from "poses drop out". Resolutions counted against frames answers both with no clock | three counters |
| `emulated` | how many frames carried an *inferred* rather than a tracked position (§2.3) — the difference between a tablet that is where you think and one that drifts | one counter |
| `input lost … 0.42 s` | 🔴 **the tracking-loss behaviour, which decides whether §5.2 is buildable at all** | one timestamp |

⚠️ **Count on the far side.** CLAUDE.md: *"a count is only evidence on the far
side of the boundary."* `ray 271/271` must count `getPose` returning **non-null**,
not the number of times we called it. A counter incremented at the call site
reads identically whether the runtime answered or not — which is
`createMidiLane`'s `scheduled()` bug in a new costume.

### 6.4 ⚠️ Rules the instrumentation itself has to keep

1. 🔴 **Every one of these reads is inside a `try`, and a refusal is remembered.**
   `frame.getJointPose` on a session that was not granted the feature, or on a
   null `hand`, **throws** — and an uncaught error in a frame callback does not
   stop the loop, it silently deletes every line below it. That is how `scene`
   lost its status panel for the whole life of the page, and how its gl-error
   check never ran. `xr-room.mjs`'s `observePlanes` already has the exact
   pattern to copy: ask once behind a try, mark it refused, never ask again.
2. **`sendBeacon`, never the batched shipper.** `createShipper` holds for 2 s and
   entering an immersive session is precisely when timers stop being generous.
   `beacon()` in `xr-panel.mjs` is the one to use.
3. **One-shot and rate-limited, never per frame.** 90 lines a second would evict
   the entry-path lines that are the reason the log exists. And the log is
   persisted to DO storage now, but it is still a ring buffer.
4. **Confirm the build stamp changed before asking anyone to retest.** Every 06
   log opens with `BUILD <sha>-<hhmmss>`, and the edge serves the previous build
   for a few seconds after a deploy. Without it, "still nothing" and "the fix
   never loaded" are the same observation.
5. **The way out stays untouched.** Any controller button leaves, grip leaves,
   and the dead-man's switch fires at 4 s. Adding input instrumentation must not
   move any of those — and note that reading `gamepad.buttons` for a new purpose
   is reading the same array the exit scan reads.

### 6.5 Order of work

1. **`demo/shell/xr-pick-test.mjs`** — §5.4's five asserts, three of them
   negative controls, plus §5.6a's four coordinate spaces. Pure arithmetic, runs
   under `node`, no device. Catches a press landing in the wrong place before it
   can be blamed on hardware.
2. **The §6.2 log lines in `scene`**, behind `try`, on `beacon` — and
   `ROOM_OPTIONAL_FEATURES` gains **both** `'hand-tracking'` and
   `'tracked-sources'` (§1.3), because asking for one without the other is the
   run that comes back looking like a headset with one controller.
3. **One headset run, and it is a five-step script rather than "look around"** —
   each step exists to make one row of §6.3 differ from the one before:
   1. enter holding the controller in your **right** hand
   2. move it to your **left** hand ⚠️ — this is the step that exercises §7.8,
      and the only one a one-handed run cannot substitute for
   3. put it down and **raise both hands** (does `inputSources` go to 2? do
      controllers and hands coexist?)
   4. put **one hand behind your back** for a few seconds (tracking loss)
   5. leave with the grip, so the exit is exercised too
4. **Read the log**, and only then decide between hand-anchored and parked (§5.1),
   and between grip-anchored and wrist-anchored (§5.2).
5. **A primitive stand-in at the grip pose** (§4.2 stage 1) — the cheapest thing
   that makes the pose data visible, and the thing that proves the grip
   convention on real hardware rather than from a quote.
6. **The tablet, in §5.1a's order**: design **A** (parked in the room, one
   controller) first, because it is `xr-panel.mjs` with a different canvas;
   then **B** (rides a hand, the controller points at it), which is the novel
   one and the one that respects the one-controller constraint. **C** only if
   step 4's `ray-vs-anatomy` angle came back small.

---

## 7. What would have to be true

1. **`hand-tracking` is granted on this headset.** UNKNOWN — §3.2. It is a
   permission and a Settings toggle, not only a browser capability.
2. **`gripSpace` resolves for controllers.** ESTIMATED yes (it is the spec's
   normal case), MEASURED never, here.
3. **Hands report something a tablet can hang off** — a `gripSpace`, or a wrist
   joint with a stable pose. UNKNOWN.
4. **Tracking loss is detectable from the page**, rather than presenting as a
   stale pose that looks tracked. UNKNOWN, and it gates §5.2.
5. **A 0.20 m × 0.13 m quad is legible.** UNMEASURED — and `plan-xr-room.md` §9
   lists the *larger* panel's legibility as still open after the last run. Only a
   face answers this.
6. **The strip's canvas survives being driven from the session's rAF rather than
   the page's**, with `loop: false` and a non-zero size before entry (§5.6).
7. **Two input sources are actually available to this user.** MEASURED
   constraint, in the other direction: one controller is what has been reported,
   which is why §5.1 has two modes rather than one.
8. **The grip X flip is handled before a second hand ever holds anything.**
   DOCUMENTED (§1.5) and not yet written. ⚠️ It is the only item on this list
   that **cannot be caught by a headset run of the kind §6 describes**, because
   a one-handed run is green either way — it needs the thing held in the *other*
   hand, or an assert on the sign.
9. **`profiles` matches the button indices `scene` guesses at.** `buttons[4]` and
   `axes[3] ?? axes[1]` are typed against a controller nobody asked the name of
   (§4.2). UNKNOWN, and §6 prints the answer.
10. 🔴 **This build grants `tracked-sources` and exposes `session.trackedSources`.**
    DOCUMENTED in the 9 June 2026 CRD and shipped by Meta in Browser 34.1, but
    **absent from upstream Chromium entirely** (§1.3). ⚠️ If it is not granted,
    the second input does not exist and *nothing says so* — which makes this the
    only item here whose failure mode is indistinguishable from success.
11. 🔴 **The emulated hand ray is close enough to anatomy for design C.**
    DOCUMENTED as emulated, UNMEASURED as to how far off (§5.1a). Designs A and
    B do not depend on it, which is why they are first.
12. **Nothing on the tablet is destructive on a single press.** Forced, not
    chosen: the reserved palm pinch can fire a phantom `select` and there is no
    API to detect it (§3.3).
13. ⚠️ **Asking for `tracked-sources` does not cost hand tracking rate.** Meta
    states natively that Fast Motion Mode and Multimodal are mutually exclusive
    (§3.4). Whether that is a hardware constraint that reaches the browser is
    UNKNOWN and nobody has said either way.

---

## 8. Three corrections to documents this plan leans on

**`research/quest-xr-2026-09.md` §5.3 — "Full hand-joint streaming does not fit"
is now half wrong, on the sender's side.** It priced head + two hands at 25
joints as **3 274 bytes and 65 KB/s at 20 Hz** (MEASURED against the real
envelope) against relay caps of 16 sockets, 60 msg/s, 512 KiB/s per socket.
**Those caps changed on 2026-09-13** — `workers/relay/src/index.js` now reads
`MAX_SOCKETS` 128, `MSG_PER_SEC` 1000, `MSG_BURST` 2000, `BYTES_PER_SEC` 8 MiB/s,
`MAX_BYTES` 1000 KiB. So 65 KB/s is now **0.8% of one socket's byte budget** and
20 Hz is 2% of the message budget.

⚠️ **The receiver-side half of that argument still stands unchanged**, and it is
the half that matters: every other participant still has to `JSON.parse` N ×
3 KB, N × 20 times a second, *inside a 90 Hz render loop*. The conclusion is the
same and the reason is now only one of the two: **send wrists and a pinch state,
not fifty joints** — and if joints are genuinely needed, send them as a binary
frame, which the relay carries unchanged.

**`research/quest-xr-2026-09.md` §1.2 summarises the palm pinch as
"⚠️ Left-hand palm pinch is reserved as the system menu button — do not bind
it".** The primary source is worse in three ways and §3.3 quotes it in full:
**both** hands are reserved, the left one **ends your WebXR session**, and it can
fire a **phantom `select`** (`webxr-hand-input#117`, open since 2022) which lands
directly on §5.5's press mapping. ⚠️ The same row also gives "Simultaneous
hands+controllers 31.4" — correct, but **31.4 is not the useful version**. Browser
**34.1** is: it adds one-hand-plus-one-controller *and* the `trackedSources`
routing without which the second input is invisible (§1.3, §3.5).

**`plan-xr-room.md` §3 says "pointing at a panel and pressing a button is not
new work — it is the drag code with a different target."** That is right about
the *pointing* and wrong about the *pressing*: the drag code never needs to know
**where on the panel** the ray landed, and a button does. §5.3 is the missing
piece, it is thirty floating-point operations, and it has a backface-test trap
waiting in it that §5.4 catches on a laptop.

---

## 9. What was built, 2026-09-13 — and what is still UNMEASURED

Written after the work, so §§1–8 stay as they were argued and this section is
what actually shipped. ⚠️ **Nothing below has been in a headset.** Every number
here came off a laptop, a registry or a document; the whole device column of §7
is still open.

### 9.1 The files

| | |
|---|---|
| `demo/shell/xr-pick.mjs` | a ray against a rectangle: `{t, u, v, front}`, ~30 flops, no dependencies |
| `demo/shell/xr-pick-test.mjs` | **20 asserts, 6 of them negative controls**, `node`, no browser |
| `demo/shell/xr-tablet.mjs` | the screen on the hand — layout, hit test, value arithmetic, canvas. Pure above the one line that touches `document` |
| `demo/shell/xr-hands.mjs` | 🔴 **the ONE input path.** Both source arrays, the assignment by `handedness`, the tablet's press/drag, the stage instrumentation |
| `demo/shell/xr-room.mjs` | the picture: floor, stand-ins, beam, tablet |

### 9.2 The controller mesh: REJECTED, with the numbers

§4.2 recommended primitives on an argument. Here is the same conclusion with
the registry actually read, on 2026-09-13:

- **Licence is not the obstacle.** `@webxr-input-profiles/assets@1.0.20` is
  **MIT, Copyright 2019 Amazon**.
- **Bytes.** `meta-quest-touch-plus/left.glb` **217,984**,
  `right.glb` **213,868**, `profile.json` **11,430** — 433 KiB for the pair.
  (The whole registry unpacks to 97 MB across 133 files; `-v2` is 4x the size
  of the plain profile, so "which profile" is a 1.5 MB question, not a
  rounding one.)
- **What the `.glb` needs.** Parsed here: glTF 2.0, **no extensions**, 31
  nodes, 6 meshes, 23 accessors, 1 material with a `baseColorTexture`, 1
  embedded PNG, attributes `POSITION / NORMAL / **TEXCOORD_0**`. The room's
  whole shader vocabulary is one flat-colour box program over a VAO with
  position at slot 0 and normal at slot 1 and **no texture coordinate
  anywhere** — so it is a container parser, an accessor decoder, a node walk, a
  PNG decode and a third program.
- 🔴 **And the consumer is shared.** `xr-room.mjs` is imported by `scene` and
  `mirror`; `LAYOUT.md` puts a vendored binary in `demo/<slug>/vendor/`, so a
  shell module fetching a per-slug asset path is the `moq.mjs` rename bug in a
  new costume. That is the argument §4.1 did not have and it is the decisive
  one.

**Taken WITHOUT the mesh: the gamepad index map** (§4.2 stage 2), ten lines in
`xr-hands.mjs`. It **confirms** the indices `scene` had guessed —
`xr-standard-trigger` 0, `xr-standard-squeeze` 1, thumbstick button 3 /
xAxis 2 / yAxis 3, `a`/`x` 4, `b`/`y` 5 — which is worth recording precisely
*because* it is a pass: "it happens to be right" and "it is right" were the same
observation until somebody looked.

**The stand-in says it is a stand-in**, in a footer on the tablet's own face,
which is the only surface in the session where that claim can be read.

### 9.3 The tablet's pose — the complaint that was actually made

> *"ma tahaks et tablet oleks kontrolleri 'peal' ruudukujulisel alal, sellega
> risti mitte nurga all"*

It was tilted 31° back and offset up-and-forward. It is now flat on the
controller's square top face, square to the controller's own axes, with **no
tilt term at all**: right = grip **+X**, up = grip **−Y**, normal = grip **−Z**,
centre = the grip origin lifted 0.09 m along −Z.

Two things that are not obvious and are asserted rather than reasoned about:

- 🔴 **The basis must be right-handed.** Two of the three columns are negated;
  negating one gives a determinant of −w·h, which flips the winding — and the
  room draws with `CULL_FACE` on, so a mirrored basis is an **invisible**
  tablet, which reads as "never built" rather than as a sign error.
- ⚠️ **No `handedness` flip, deliberately.** §1.5's mirrored-X warning is about
  anything hung off the **hand**. This hangs off the **plastic**: the top face
  is on the thumb side, which is −Z for both hands. A sign flip here would
  correct a bug this pose does not have.

### 9.4 Two rules the room lost, and one it gained

- **The page's own WALLS are gone.** A made-up wall at 5 m is a claim about
  where your room ends and it is always wrong. `local-floor` means the origin
  IS the floor, so the floor is the one surface the page can be sure of. Real
  walls still arrive in passthrough, because those were measured.
  ⚠️ **And the branch that was tempting is the one that would have flashed:**
  keying walls off `planes.state` would have drawn them for the 2.5 s grace
  period of an AR session and then taken them away. There is no branch — there
  is one floor, always, replaced entirely by `planeQuads` when a headset reports
  any.
- **The green "these dots are on YOUR surfaces" colour is gone**, along with the
  two blues. It was a proof device, asked for in as many words, and it proved
  its point on 2026-09-13 with 11 surfaces. One white now, at a strength the
  slider sets. Where the dots are is still said in words.
- **The floor is now derived from the fade rather than typed beside it.** It was
  10 m across against a fade that does not finish until 11 m, so the dots were
  at roughly two thirds strength where the quad simply stopped — a hard edge
  5 m in front of you, drawn by the fade's constants disagreeing with the
  floor's. `span = fadeFar * 2`.

### 9.5 🔴 One input path, and how a divergence would be found

> *"make controller uis work same in vr and ar"*

Satisfied **structurally**: `xr-hands.mjs` and `xr-tablet.mjs` contain no
`immersive-vr`, no `immersive-ar`, no `environmentBlendMode` and no session mode
of any kind, and `scene`'s input block no longer mentions `arMode`. Two paths
meant to be the same drift; one path cannot.

Two places where branching was tempting, decided on purpose:

- **Contrast.** The tablet composites onto a lit room in passthrough and a dark
  one in VR. The fix is to make the slab **its own background** — one near-opaque
  fill — so what is behind it stops mattering. That is a contrast decision, not
  a mode one.
- **The beam's far end.** In passthrough it could stop on a real plane. Refused:
  the plane exists in only one of the two modes, so the behaviour would be a
  function of what was *measured* rather than of what you *did*. One rule both
  ways — to the thing it holds, else the thing it is on, else the tablet, else
  2.4 m.

**The check that stops this rotting** is a fingerprint built entirely from
declarations — sizes, counts, ranges, which hand gets what, which gamepad index
is the trigger — with no session anywhere in it:

```
tablet 0.16x0.11 m @ 768x528 px · 1 control(s) [grid 0..100%] · stand-in 3 parts
  · tablet on the left hand, pointer on the right · trigger=button 0, stick=axes 2/3
```

It is beaconed on the **first frame of every session** by both pages and
published on `__demo.xr.ui`, so **one pass of VR and one of passthrough are
compared by putting two log lines side by side** — no third run. `scene` also
asserts it across both of its session buttons on a laptop, and refuses any
session word appearing in it.

### 9.6 What a headset still has to answer

Everything in §7 that is marked UNKNOWN, plus four things this work added:

1. **Is the tablet legible at 0.16 m?** 768 px across ~25.5° is 30 px/degree,
   which MATCHES `mirror`'s shipped panel (29.4) — and that panel's own
   legibility has never been graded by a face. Matching an ungraded number is
   not the same as being legible.
2. **Is 0.09 m the right lift, and is the slab the right size against a real
   controller?** Both are the first two numbers to change if it reads wrong.
3. **Does the left grip resolve?** A run in 2026-09 had the left grip fail while
   the right resolved, in the same frame. The fallback is written down — one
   source carries both jobs and the log says so — but it has never fired.
4. 🔴 **Does the `gl error 1282` on the first frame move?** This work did not set
   out to fix it and does not claim to. It added programs and uniforms to the
   same context, so the first-frame reading may well change; `mirror`'s by-phase
   `glCheck` is what would say where, and a run that still says `firstDraw` has
   learned nothing new.
