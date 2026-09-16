# plan-xr-room — one room, panels around you, and sound that comes from them (2026-09-12)

> Extends `plan-xr.md`, which holds the device measurements and the five defects
> the headset found. Nothing here re-derives those. Read §7 of that file first:
> item 7 already says a doff watchdog is required **before** anything streams,
> and that is the constraint this whole plan turns on.

## 0. The short answer

**Positional audio: yes, and we are unusually well placed for it** — every other
page hands sound to a `<video>` element and loses it, while `/keys/` and `/rack/`
already carry raw samples into a worklet we own. Panning something you already
hold is one node; panning a media element is a fight.

**Eight screens around you: no.** Three or four, and only the one you are
looking at should be live. Not for GPU reasons — for **billing** reasons, which
are the ones that bite unattended, and which turn into an OUTAGE rather than an
invoice on this account.

**The strongest version of this room is not "look at everything at once".** It
is *the room only pays for what you look at* — which is a genuinely new demo, is
forced on us by the constraints anyway, and is more interesting to stand in.

## 1. Positional sound — the mechanism, and where we already win

WebAudio does this natively: a `PannerNode` with `panningModel: 'HRTF'` per
source, and one `AudioListener` whose position and orientation are driven from
`XRFrame.getViewerPose()` every animation frame. Turn your head, the mix turns.

Three kinds of source, in increasing order of how well we are placed:

| source | how it reaches a panner | difficulty |
|---|---|---|
| LL-HLS panel (`<video>`) | `createMediaElementSource` | ⚠️ takes the audio away from the element — the element goes silent and the graph owns it. Also one-way: you cannot give it back. |
| WHEP panel | `MediaStreamAudioSourceNode` from the received track | straightforward |
| **the box, and `rack`** | **it is already in a worklet we wrote** | **one node** |

🔴 **And today's stereo work has a direct consequence here.** `pcm-playout` now
outputs two channels, and **a `PannerNode` wants MONO in** — feeding it stereo
makes it downmix internally and throws away the placement you were trying to
create. So an XR panel wants the worklet's **1-channel** path, which still
exists and is exactly what the `nOut === 1` branch does. The stereo path is for
a page you listen to on headphones; the mono path is for a source that has a
POSITION, because the position is the stereo. That is not a compromise, it is
what positional audio means, and it is worth writing down before somebody
"upgrades" the XR room to stereo panels and makes it worse.

### What is NOT known, and must be measured before any of this is claimed

- **HRTF cost per source on an Adreno 740.** Unmeasured by us. HRTF is a
  convolution per source; a handful is fine on desktop and the headset is not a
  desktop. Measure at 1, 4, 8 sources against the 89.8 fps we know it holds.
- 🔴 **The Quest's audio output latency.** Completely unmeasured, and it decides
  whether a keyboard in the room is playable or just demonstrable. The relay
  already costs ~70 ms; if the headset's own output adds another 40–60 ms we are
  past the ~100 ms line that `rig/m1/README.md` measured as the point where
  playing "reads as sluggish under the fingers". **Do not promise an in-headset
  instrument until this number exists.**
- **Whether `createMediaElementSource` works on the Quest browser at all** for
  an MSE/HLS stream. Chromium says yes; this is a specific Chromium on specific
  hardware and the repo's own history is a list of places that mattered.

## 2. The room — what goes in it, and how many

Panels like `mirror`'s: a picture with a footer of real numbers under it. That
already exists as a design and it reads well, so the room borrows rather than
invents.

**Three or four panels. Not eight.** Three reasons, in order of how much they
cost:

1. 🔴 **Cloudflare bills DELIVERED MINUTES, on HLS and — from 2026-10-15 — on
   WebRTC too.** Eight live panels is eight times the meter for one person
   standing still. Worse, the account's 1000 storage-minute cap **blocks new
   live streams when it fills**, and testing already adds ~225/day. So the
   failure mode of an over-ambitious room is not a bill, it is `/06/` and `/09/`
   going down. This is the constraint, and it is not negotiable by being clever
   about GPU.
2. **Buffering is billable and rounds up to the segment**, which is the 2.0 s
   GOP here. A panel you glance at for two seconds bills the ~3 segments hls.js
   prefetched. Eight panels glanced at is 24 segments for nothing.
3. **Video-to-texture cost is unmeasured.** Each panel is a `texImage2D` from a
   `<video>` per frame, and the framebuffer is 3360×1760. Measure one panel
   first.

### The answer to all three: gaze-gating

A panel shows a still frame until you look at it (or press it), then it goes
live; look away for N seconds and it stops. This is not a compromise bolted on
to save money — it is the most interesting thing in the room, it is honest about
what streaming costs, and it makes the room's own readout worth reading: *what
is live right now, and what is it costing.*

⚠️ It also needs the doff watchdog from `plan-xr.md` §7.7 **first**, not after.
A headset put down on a desk with a panel live is an unattended meter, and
`visibilitychange` fires ~10 s late. The dead-man's switch that already ends a
session after 4 s with nothing drawn is the shape to copy.

### What each panel should show

One per transport, because the whole point is that Positron carries the same
picture four ways and they behave differently:

| panel | why it earns a place | footer numbers |
|---|---|---|
| LL-HLS | the boring one that works everywhere | latency, advance, stalls |
| WHEP | 25 ms RTT, the fast one | rtt, fps |
| MoQ | browser→relay→browser, p50 ~26 ms glass-to-glass | p50, p99 |
| the box / `rack` | a *thing* playing, not a file | round trip, breaks |

🔴 **Put the numbers in the footer, not floating.** And they must be the lane's
own measurement against the score — `candidate-pair` RTT beside MoQ's
glass-to-glass flattered WHEP by ~3x once already, and a room where four panels
quote four differently-defined numbers side by side is that mistake with a
bigger audience.

## 3. Interactivity — what is already built, and what is not

Built, on the device, in `scene`: a controller ray, grab-and-move, any button
ends the session, a dead-man's switch. So **pointing at a panel and pressing a
button is not new work** — it is the drag code with a different target.

New:
- **A button that a ray can press.** Trivial geometrically; the real work is the
  press FEEDBACK, since there is no click and no finger. `scene`'s own report
  said the missing thing was controller feedback, so: a highlight on hover, a
  colour on press, and a sound.
- **A keyboard panel.** This is the one that is worth doing and the one with an
  unmeasured blocker (§1). Build it, measure the latency, and let the number
  decide whether it is called an instrument or a demonstration.

⚠️ **One controller.** Measured, in this user's hands. Every gesture must work
with one, which already killed a two-grip idea once.

## 4. What I would actually build, in order

1. **One panel, one transport, measured.** Video→texture cost and fps against
   the known 89.8. No audio. Answers the question the other seven panels depend
   on.
2. **Positional audio on the box**, because it needs no media element and no
   billing. One mono source, one panner, listener from the pose. This is the
   cheapest possible proof that the room turns when your head does.
3. **The doff watchdog**, before anything bills.
4. **Gaze-gating**, with a readout saying what is live and what it costs.
5. **Three more panels.**
6. **The keyboard**, and the latency number that says what to call it.

## 5. What would have to be true

1. **Video-to-texture holds 90 fps on the device.** UNMEASURED.
2. **HRTF at N sources holds 90 fps.** UNMEASURED.
3. **Quest audio output latency is known.** UNMEASURED, and it gates §4.6.
4. **`createMediaElementSource` works there.** UNMEASURED.
5. **A doff stops the meter.** Not built. `plan-xr.md` §7.7.
6. **A panel that is not live says so in words**, rather than showing a frozen
   frame that reads as a broken stream. The repo rule already: a blank cell
   collapses "we did not look" and "we looked and it was fine".
7. **The room works with one controller.** Measured constraint, not a guess.

---

## 9 · MEASURED ON A QUEST, 2026-09-13 — §5.1 and §5.2 are answered

`mirror`'s panel ran on the real headset. From the device's own log
(`pub.positron.studio/logs`), build `968d9e7-050248`:

```
first headset frame · fb 3360x1760 · 2 views · eye0 1680x1760
                    · gl error 1282 · panel 1280x800
  85 frames · 84.5 fps · worst gap 41.8 ms · upload 0.20 ms
1169 frames · 90.0 fps · worst gap 41.8 ms · upload 0.10 ms
a button — leaving
session ended · 1230 frames · 90.0 fps
```

✅ **One panel holds 90.0 fps** against `scene`'s 89.8 with no panel at all. So
**video-to-texture costs nothing measurable on an Adreno 740**, which is the
number §4.1 existed to get and the one every other panel depended on. §5.1 is
answered: yes.

✅ **`texImage2D` + compose: 0.10–0.20 ms** for a 1280×800 canvas. ⚠️ CPU time
only; the card's own time still needs a timer extension nobody has read there.

✅ **The framebuffer is 3360×1760, two views, 1680×1760 an eye** — read from the
device by a second page, independently confirming `scene`'s earlier figure
rather than quoting it.

✅ **The exits work against a real controller.** "a button — leaving" is the
first time the any-button scan has met hardware; `inputSources` is empty in a
synthetic session, so this was untestable until now.

⚠️ **The lag report is one frame at entry, not sustained.** "a bit laggy" came
with `worst gap 41.8 ms` — and that figure NEVER MOVES after the first second
while fps goes 84.5 → 90.0 and stays. One dropped frame on entry, then nothing.
Do not chase it as a frame-rate problem; it is a startup hitch.

🔴 **`gl error 1282` ON THE FIRST FRAME, STILL.** `GL_INVALID_OPERATION`, which
this project already documents as the state where a page draws a right-looking
picture with an error pending. The page reported it, which is what the rule
asks; it now needs FIXING rather than noting, and it is the first thing to do
before more panels.

**Still unmeasured after this run:** whether the panel is LEGIBLE at 1.28 m wide
from a 1280×800 texture (only a face answers that, and the report was about lag,
not reading); HRTF cost per source (§5.2 is untouched — no audio was in this
run at all); whether two WebGL2 contexts are affordable; and passthrough, which
was not attempted — `blend opaque`, and `session.frameRate` is still **not
reported**, consistent with the earlier Quest findings.


---

## 10 · MEASURED 2026-09-13 — the sky goes, the picture is rendered in the headset, and the panels move

`mirror` now enters **both** kinds of session (`Run in VR`, `Run in XR`), hangs
**two** panels rather than one, draws the LEFT one with the headset's own
graphics context instead of copying a canvas in, and lights the floor with the
picture's average colour. `scene` is untouched: every one of these is a per-page
option on `demo/shell/xr-panel.mjs`, and the full GL suite reads **77/77** with
`scene` at the same 37 asserts it had before.

### What is in the room now

**No sky, no objects, a floor.** `room: { sky: false, things: false, bg: [...] }`.
⚠️ **The walls were carrying the light.** `SKY_FS`'s brightness was raised from
0.16 to 0.34 once because "the room reads as black" through a headset; with the
cube gone that is now literally what is behind the floor. What is left to carry
the place is the floor's 22 m of dots (fading from 4.5 m to 11 m), the two
panels, the controllers, and the glow. **It is a dark room on purpose and the
background is a chosen constant** rather than one inherited from a page that
still has walls.

🔴 **VR-with-no-sky and passthrough converge in the code and not in the eye.**
One `draw()` serves both — the only differences left are the clear (transparent
against `bg`) and the fact that **planes arrive in an AR session and not in a VR
one**. That is why offering the second mode cost one word in `requestSession`
and four asserts.

### The fake light, and what it is not

The floor's dots take the colour of the left panel's picture and a faint pool is
washed between them, falling off as a gaussian round the panels' mean position.
The colour is the **measured average** of that canvas, sampled at 5 Hz into an
8x8 canvas. **It is not a light**: nothing is integrated over the panel's area,
nothing falls off as 1/r², nothing is shadowed, nothing bounces, and nothing
else in the room is lit by it. The list is in the comment above `GRID_FS`.

⚠️ **The first version was invisible and the comment describing it was wrong.**
MEASURED off a rendered frame: with the pool squared and a radius of 2.4 m, the
brightest point came out at **~7 of 255** — a panel hangs 1.6 m above the floor,
so even directly underneath most of the falloff is already spent. Linear in `g`,
radius 3.0 m and an amplitude that tracks the picture's luminance puts it at
**34 of 255 against a 12 of 255 floor**. ⚠️ It also stopped the `discard` in
`GRID_FS` culling most floor fragments within ~4 m of the panels; that is one
cheap blended fragment per pixel there and the frame rate is the check.

### The picture, rendered in the headset — §5.1 answered a second way

🔴 **A page's own WebGL canvas is a DIFFERENT CONTEXT from the session's.** Its
programs and textures do not exist there, so "the shader is already compiled in
the session" is false and a canvas can only ever arrive as a bitmap copied every
frame. `mirror`'s shader machinery now takes its context as an argument and
there are two instances of it — one on the flat canvas, one inside the session.

MEASURED on this laptop (ANGLE Metal, M2 Pro), 960x534 = 0.51 Mpix a frame:

```
0.48 – 0.67 ms on the card    →  760 – 1070 Mpix/s
```

consistent with the ~50 Mpix/s this same shader holds on the Pi's GPU (§3.4 of
`plan-visuals`) and with it being ALU-bound rather than fill-bound.

🔴 **AND THE LAPTOP CANNOT SAY WHERE THAT TIME GOES.** A quarter-size probe runs
beside the full pass so the two can be compared; four runs with no code between
them answered **0.24x, 0.72x, 0.73x, 0.82x**. A verdict quoted from any one of
those would have been confident and wrong, so `verdictOnCost()` now refuses to
attribute the cost when the card's own samples disagree with themselves by more
than 2.5x, and prints the dispersion instead. The Quest run collects far more
samples over a longer window and may well produce a verdict; **that is the
reading that counts**, and this laptop's is only proof the instrument works.

⚠️ **The A/B is a whole path against a whole path, not one extra pass.** Live ON
removes a 2-D compose and a 1280x800 `texImage2D` and adds a 960x534 render;
live OFF is the other way round. The thumbstick click swaps them inside the
session and both arms are beaconed with the second's frame rate beside them.

**Resolution is derived, not chosen**: the panel is 1.28 m at 1.6 m = 43.6°, a
Quest eye is 1680 px over ~95°, so the panel covers ~770 of them and 960 is a
margin over that. Height follows the picture area's own aspect.

### Picking a panel up

A **grab bar** hangs under each panel — the Quest lobby's affordance, and it
keeps the picture free for the right-hand ray that already drives the tablet.
Grabbed at the ray's hit rather than at the centre; **faces you continuously
while held and holds that facing when you let go**; yaw only, upright, aimed at
the head. Bounded to 0.55–6.0 m out and 0.45–3.0 m up, so it cannot be put
anywhere you could not walk to it. The thumbstick pushes it away and pulls it
back while held.

⚠️ **This drag has never run in a headset.** The exit scan used to end the
session on button 0, which is the same press that arms the grab — so it could
not have worked before today. The arithmetic is pure and exported (`grabOffset`,
`heldAt`, `facing`, `barOf`) and the page grades it on a laptop against the same
functions the session calls; **all three checks were broken on purpose and all
three went red.** What a laptop still cannot say is whether it FEELS right.

### The thing that changed most: a laptop can now see the headset's picture

🔴 `createXRPanels(...).preview()` drives the **same per-eye draw** with a
hand-made projection into an off-screen canvas, reads the error flag and the
pixels back, and can hand out a PNG. `Page.captureScreenshot` cannot see an
immersive view, so before this the only reviewer of anything 3-D here was
somebody wearing a headset.

It paid for itself on its first run, twice: a **framebuffer feedback loop**
(a live renderer leaves its own FBO bound and the texture it returns is that
FBO's attachment — `GL_INVALID_OPERATION` and an empty frame) and a **backtick
inside a shader template literal** that killed the whole module. Both would have
been headset runs.

⚠️ **It says nothing about frame rate.** No compositor, no reprojection, no
3360x1760 framebuffer — the same refusal `verify-gl.mjs` makes about
SwiftShader.

### Still open after this

- 🔴 **`gl error 1282` on the first Quest frame is NOT explained.** The preview
  reads `clean` on this machine, so whatever the Quest is reporting is not
  reproduced here. Do not claim it fixed.
- **Whether the panels are LEGIBLE**, which only a face answers.
- **Whether the room reads as a place with no sky in it** — the floor, the glow
  and two panels are all it has, and that is a judgement, not a measurement.
- **Whether the drag feels right**, and whether the bar is where a hand expects.
- HRTF cost per source (§5.2), Quest audio output latency (§5.3), the doff
  watchdog (§5.5) — untouched.
