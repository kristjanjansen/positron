# plan-xr-room — one room, panels around you, and sound that comes from them (2026-09-12)

> Extends `plan-xr.md`, which holds the device measurements and the five defects
> the headset found. Nothing here re-derives those. Read §7 of that file first:
> item 7 already says a doff watchdog is required **before** anything streams,
> and that is the constraint this whole plan turns on.

## 0. The short answer

**Positional audio: yes, and we are unusually well placed for it** — every other
page hands sound to a `<video>` element and loses it, while `/box/` and `/rack/`
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
