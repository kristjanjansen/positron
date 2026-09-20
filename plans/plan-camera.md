# plan-camera — a webcam and two microphones on the box, and what they are actually for (2026-09-11)

Ideas only. Nothing here is built, and nothing here should be built before §6
says which measurement settles it.

Every claim is tagged: **MEASURED** (run today, on the board), **DOCUMENTED** (a
vendor or spec says so, with a source), **ESTIMATED** (arithmetic on measured
values), **UNCONFIRMED** (nobody has looked).

---

## 0. The short answer

**The interesting half is the microphone, and the interesting thing about the
microphone is its limitation.**

The C925e captures at a **fixed 16,000 Hz** — MEASURED, `/proc/asound/card5/stream0`
reads `Rates: 16000` with no other entry, so it is not a default that can be
raised. That is an 8 kHz ceiling, which is poor for music and **exactly the
format every speech model wants**. Meanwhile the camera can do 1920×1080 MJPEG
at 30 fps (MEASURED) and the box already streams 720p h264 to a browser at
~28 fps / ~1.9 Mbit with 0 frames lost over 3.5 minutes (MEASURED, previous
session) — so the camera adds no *new* capability to the video path at all.

So the honest framing is inverted from the obvious one:

| | obvious use | what it is actually good for here |
|---|---|---|
| the camera | another video source | a **numbers** source — motion, luminance, difference — steering things that are already on screen |
| the microphone | another audio source | **speech**, and **grain material in the same band as the 1965 archive** |

And one question answered directly, because it was asked two ways:

- **Loudspeakers: no.** MEASURED — `aplay -l` lists only Loopback, bcm2835
  Headphones and two HDMI outputs; `/proc/asound/card5/stream0` has a `Capture`
  section and no `Playback` one. The C925e is deaf-mute in the output direction.
- **Speaker *recognition*: yes, and it is a Workers AI call, not a Pi one.**
  Deepgram Nova-3 on Workers AI does diarization and streams over a WebSocket
  (DOCUMENTED). The board never runs a model; it ships 16 kHz PCM and reads back
  text. `plan-voice` already took this position — *"Not on the box"* — for the
  same reason.

---

## 1. What is actually plugged in

MEASURED on the board today.

**Video — `/dev/video0`, Logitech Webcam C925e on `usb-0000:01:00.0-1.2`**

| format | largest usable mode | note |
|---|---|---|
| `MJPG` | **1920×1080 @ 30 fps** | compressed on the camera; this is the mode to use |
| `YUYV` | 1920×1080 @ **5 fps**, 2304×1536 @ **2 fps** | uncompressed — the frame rate is a USB bandwidth wall, not a sensor one |

⚠️ **The 2304×1536 mode is a trap.** It is the biggest number in the list and it
is 2 fps. Anything reading "max resolution" off that table and planning around it
is planning a slideshow.

**Audio — card 5, `USB Audio`**

    Format:   S16_LE
    Channels: 2
    Rates:    16000          <- the only entry

**Also on the board, and already contended for:** `h264_v4l2m2m` on
`/dev/video11` (a single exclusive V4L2 device that **cannot be killed when it
wedges** — SIGTERM, SIGKILL and `timeout` all do nothing, and recovery is a
reboot: MEASURED, twice), the V3D GPU running the mirror shader, and a JACK
graph carrying Yoshimi / hexter / FluidSynth through pappus.

---

## 2. The ideas

### 2.1 Voice as a command channel — and the rule that keeps it safe

Nova-3 over a WebSocket, 16 kHz stereo PCM straight off the card, text back. The
mic's musical weakness is a speech strength: no resampling, no downmix, the exact
rate the model is trained on.

**What makes this worth doing rather than a gimmick** is that positron already
has the safety rule it needs, written down twice. `plan-hardware` §8.4 and
`plan-nodes` §5.6 both say: a model may produce a **document**, which `plan()`
then checks. So a spoken sentence never actuates anything. It composes a patch
document, the board's planner accepts or refuses it **by the same rules it
applies to a hand-written one**, and the refusal is what the operator hears back.

`plans/plan-voice.md` (221 lines, written 2026-08) is the existing design for this and
it is about splitting a keyboard by spoken sentence. A microphone on the box is
the missing input end of a plan that already exists.

🔴 **The failure mode is the one `alsa.mjs` was built around: a wrong patch is
silent.** An ASR mishear that reaches the rig produces a graph that is wrong and
looks fine. The defence is that the planner grades the document, not the
sentence — but that only holds if the spoken path has no shortcut around it, and
"just this one command can go direct" is how that rule dies.

⚠️ **And an always-listening microphone in a room is a privacy surface**, not a
feature flag. Whatever is built needs a state that is audibly and visibly off,
and "the LED is on" is the camera's claim, not the mic's.

### 2.2 🔴 The mic and the 1965 archive may be in the same band — and that is the best idea here

pappus loads a minute of ERR's 1965 audio into its grain buffers today and plays
it back granulated (MEASURED, `pappus-live.mjs`: *"a minute of 1965 lands in the
grain buffers · 4 buffers"*, held under `mlock` so the write head does not erase
it). A live minute off the microphone is **the same shape of object** — same
buffers, same lock, same commands.

The 8 kHz ceiling reads as a defect. It may not be one. **1965 Estonian radio
tape, digitised, is itself band-limited** — UNCONFIRMED how band-limited, and
that is exactly the measurement worth taking, because if a 1965 item's energy
dies around 5–6 kHz then the room and the archive **occupy the same band** and
can be cross-faded, interleaved or stacked in one grain cloud without one of them
sounding obviously modern against the other.

That is the idea with the most in it: *the room and 1965 in one buffer, and you
cannot tell by bandwidth which grain came from which.*

**What settles it:** spectral centroid and rolloff of an ERR 1965 item against a
minute of the room. `measure.mjs` already computes centroid — `pappus-live.mjs`
prints it on every take (`centroid 554 Hz` for 1965 under seed 424242, MEASURED).
This is a one-evening comparison and it either opens the idea or closes it.

### 2.3 The room as the drift source — and why it costs something

pappus drifts on its own: **858 nudges in a 90-second gap with nothing sent**,
MEASURED, walking its scan position 0.471 → 0.378. That walk is currently driven
by a seeded PRNG (`mulberry32`), which is why the drift is reproducible.

The room could drive it instead — mic level, or centroid, steering `mscan`.

⚠️ **This trades away the property the engine was built to have.** `plan-nodes`
rule 16: *"the seed is in the document and the output is not… a node that cannot
reproduce itself from its own `params` is carrying a reference, and the document
says so."* A seed is in the document. A room is not. So room-drift is allowed
only if the extracted stream is **recorded as data the document references** —
at which point it is a take, not a live input, and it will reproduce.

Stated plainly so it is a choice and not an accident: **you can have room-driven
drift, or you can have a patch that replays identically, and not both from the
same field.**

### 2.4 The camera as numbers, not as a texture

The video path is done. What the camera adds that we do not have is a **cheap
continuous measurement of a physical room**: frame difference, mean luminance,
centroid of motion, how much of the frame moved.

At **160×120 @ 30 fps** — a real supported mode, MEASURED — that is 19,200 pixels
a frame, which a Pi can difference without noticing. Sent at 10 Hz as four
numbers, it is ~10 msg/s on a relay whose budget is 60 msg/s total and where
**audio already uses 50** (MEASURED). It fits; a video stream does not, which is
why video went on its own socket.

Those numbers can drive things already on screen: `mirror`'s three knobs
(`mirrors`, `grain`, `hue`), or pappus's grain density. **A room that changes the
picture without ever being seen** is a better use of a webcam on a Pi than
another 720p feed, and it costs a fraction of the bandwidth.

⚠️ The honest weakness: this is a one-way mapping with no way to tell a good
mapping from a bad one except by looking, and *"nothing in the suite looks at
ink"* (LESSONS §33–38). It will be graded by eye or not at all.

### 2.5 Two microphones is a three-state control, and nothing more

Two omnis on a camera bar. Inter-channel *time* difference is the only usable
cue, and the arithmetic bounds it hard — ESTIMATED: at 16 kHz one sample is
62.5 µs; over roughly 6 cm of spacing the largest possible arrival difference is
~175 µs, so **~2.8 samples end to end**.

That is enough for **left-of-centre / centre / right-of-centre**. It is not
enough for an angle, and anything that prints degrees off it is printing noise
with a unit attached. Worth writing down precisely because this is the sort of
figure that gets over-claimed the moment it half-works.

### 2.6 The box can answer, through the instrument

No loudspeaker on the camera, but the board has bcm2835 Headphones and two HDMI
outputs, and — more to the point — a **JACK graph**. Aura-1 on Workers AI
generates speech over a WebSocket (DOCUMENTED).

So the box's own synthesised voice can be routed into JACK, which means **it can
be granulated by pappus like any other source**. Ask the box something and its
answer becomes grain material. That is a loop worth having, and it is the only
idea here that uses the output half of the AI stack for something other than
notification.

### 2.7 🔴 Contention testing, which is the one with a known failure waiting

This was the third idea in the brief and it is the best-grounded, because the
failure it would find has already happened once in a different costume.

Running simultaneously on one Pi 4, **never yet measured together**:

- `h264_v4l2m2m` on `/dev/video11` — single exclusive, and when it wedges,
  three more ffmpegs stack up behind it and the symptom from outside is *"the
  encoder produces no bytes"*. MEASURED; recovery was a reboot.
- the V3D GPU running the mirror shader
- JACK with pappus — SuperCollider, 2,030 lines, real-time thread
- **new:** a USB camera at up to ~3 MB/s (ESTIMATED, MJPEG 1080p30) and a USB
  audio capture stream, on the same USB 2.0 controller as everything else

What to measure: **JACK xruns per minute with the camera capturing and not
capturing**, and `pgrep -cx ffmpeg` as the wedge guard — `-x`, never `-f`,
because `pgrep -f h264_v4l2m2m` matches its own ssh command line and answers
*"still held"* about itself (MEASURED, twice, twenty minutes each time).

⚠️ **And the A/B has a hole to close before it is run.** A camera that degrades
audio, and a camera that merely shares a bus with something else that degrades
audio, look identical from outside. The separating run is **camera enumerated and
open but not capturing** — plugged in, bus power drawn, no isochronous traffic.
Without that arm, the comparison cannot tell bus contention from CPU contention,
and it will confidently report whichever one it was looking for.

---

## 3. What this is NOT

- **Not a multimodal model watching the room and deciding things.** A model may
  produce a document; `plan()` checks it. `plan-visuals` §5.6 left "are generated
  shaders allowed to run" open and answered no; `plan-nodes` §5.6 repeats it. A
  Pi 4 has no headroom for a local model regardless (`plan-voice` §1).
- **Not a second video source on the relay.** The relay is a bus with a measured
  budget and audio holds 50 of 60 msg/s. Video already has its own socket for
  this reason; a second camera feed is a bandwidth decision, not a feature.
- **Not face or person identification.** Nothing here needs it, and adding it to
  a box that sits in a room permanently is a different project with different
  obligations.
- **Not a reason to add routing or parsing to the relay.** Its value is that it
  does not parse — 1–2 ms at p50, MEASURED.

---

## 4. Where this is weakest, stated plainly

- **The camera is the less interesting half and it is the half that looks
  exciting.** Everything in §2.4 is numbers extracted from pixels; the pixels
  themselves are a solved path we already ship.
- **§2.2 rests on an unmeasured assumption.** If 1965 ERR material turns out to
  be full-band, the "same band" idea collapses and the mic is simply a low-rate
  source next to a good one.
- **§2.1 is the only idea with a real safety surface**, and it is an
  always-listening microphone. That is a heavier commitment than any of the
  others and it should not be smuggled in as a side effect of §2.2 sharing the
  same audio path.
- **None of this has a harness.** A camera-driven knob and a mic-driven drift are
  both graded by eye today, which is the exact shape of failure this project
  keeps re-learning — `plan-nodes` §5.1 is about the same problem in a different
  UI.

---

## 5. If only one thing gets built

**§2.7, the contention measurement** — because it is the only item that produces
a number whether the answer is yes or no, it protects work that already exists,
and the failure it is looking for has already cost two reboots in a different
costume.

**Then §2.2's one-evening comparison** — centroid and rolloff, a 1965 item
against a minute of the room — because a single number opens or closes the most
interesting idea in this document, and the tooling to take it is already written.

---

## 6. What would have to be true

1. **A 1965 item and the room occupy comparable bands.** UNCONFIRMED. Settled by
   centroid + rolloff, using `measure.mjs`, which already prints centroid.
2. **Capturing from the camera does not cost JACK xruns.** UNCONFIRMED, and it
   needs the third arm (§2.7) or it cannot separate bus from CPU.
3. **A spoken command reaches the rig only as a document.** Checkable: the path
   has no branch that calls the rig without `plan()` answering first.
4. **The mic can be turned off in a way a person in the room can verify.**
   Not a flag in a config file.
5. **A refusal is heard, in words.** `alsa.mjs` already reports `aconnect -l`'s
   empty-stdout-exit-1 as a fact rather than a throw for exactly this reason; a
   voice path inherits the obligation and has a worse failure mode without it.
6. **Room-driven drift is recorded, or it is not called reproducible.** Both are
   fine; claiming both is not.
7. **Nothing prints an angle.** §2.5 bounds the direction estimate at ~2.8
   samples end to end. Three states, no degrees.
