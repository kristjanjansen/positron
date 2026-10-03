# plan-wish-dawless: Wish without a laptop, the Pi as the hub

> Asked 2026-10-03: *"Giving the ideqa about wish and general mapp anything to
> anywhere how it would fit it into dawless setups. What is hun? Pi? What
> listens? A phone browser? Pi attached cheap mike? Camera interepting
> gestures? Random ideas"*, then *"Add plan etc"*.
> **NOTHING IN THIS PLAN IS MEASURED.** It is reasoning from what is already in
> the repository. §8 lists what would have to be run to turn each claim into a
> fact. Latency figures marked ESTIMATE are guesses and must not be quoted.

## 1. The verdict

Make the Pi the hub and the phone the ear and the screen. The model only ever
writes rows in a route table that the Pi holds. It is never on the path a note
travels. The first step is small: move the route table from the `/wish/` page
into `rig/board`, so that rows made on a phone keep working with the phone
locked and the internet gone.

## 2. Today's shape, and why it is not DAWless

`/wish/` (https://positron.studio/wish/) runs on a laptop:

- the browser does WebMIDI (`requestMIDIAccess` behind a press);
- `node demo/wish-local.mjs` holds the Cloudflare credential, because a browser
  cannot;
- a Workers AI model turns speech or text into a proposed connection;
- `demo/shell/bay.mjs` validates it (pure, graded by `demo/shell/bay-test.mjs`),
  a row appears, and `×` takes it down.

Take the laptop away and three jobs have no home: **holding the routes**,
**hearing the player**, and **showing what is connected**.

## 3. The split: slow brain, fast hands

| layer | speed | needs network | who does it |
| --- | --- | --- | --- |
| setup: say a wish, get a row | seconds | yes (model) | phone plus Workers AI |
| performance: notes, knobs, gestures, audio through rows | milliseconds | no | the Pi |

The reason is already measured in `demo/manifest.mjs` above the `wish` row: on
the day `/wish/` was built, the 70B returned a valid patch pointed at the
**wrong instrument**, and no validator can catch that. A model that only writes
rows a person can read costs one `×` when it is wrong. A model in the note path
would cost a wrong note on stage.

## 4. The hub: the Pi

`rig/board` on the Pi (a Pi 4 by `rig/board/README.md`) is most of a router
already:

- the Circuit is attached, and `rig/board/inputs.mjs` already gates which MIDI
  reaches it (the 52 synth CCs on ch 1 and 2 since session 59);
- `rig/board/rtc.mjs` gives a browser a direct data channel to it, board round
  trip **4 ms** on one network (MEASURED 2026-09-30, `plans/plan-away-webrtc.md`
  §9);
- `snd-virmidi` and `aconnect` are already on it (`rig/board/README.md`), which
  is a kernel patchbay.

What it would gain:

- **A route table it owns and persists.** A row is
  `{ from: port+message, to: port+message, range, curve }`. A plain one to one
  route could compile to `aconnect`; anything with a range or a curve runs in a
  small forwarding loop in Node. Rows survive a reboot and work with no network.
- **Scenes.** Named sets of rows, recalled by a footswitch or by a Circuit
  program change. Switching a Circuit session could switch the routes with it.
- **The SysEx refusal stays at the hub, not at the page.** Every route ends in
  the Pi's gate, so no wish, however worded, can send SysEx to the Circuit. That
  is a hard rule: the Circuit has no factory reset (CLAUDE.md).

## 5. What listens

| option | for | against |
| --- | --- | --- |
| **phone browser, hold to talk** | best mic present, a screen to read the proposed row, `getUserMedia` already works in `/wish/` | the phone has to come out |
| cheap USB mic on the Pi | no screen, hands free | the room is full of the player's own music, so speech competes with the mix; needs push to talk; nothing shows what it understood |
| wake word on the Pi | no button | false triggers from the music, always listening |

**Recommendation: the phone hears and shows, the Pi decides.** Talking only
while a button is held. The button can be on the phone, a footswitch the Pi
reads, or a spare Circuit pad, so hands stay on the instrument. The Pi answers
with one short confirmation (*"mod wheel to Circuit synth 1 filter"*) through a
small speaker or a phone notification, which stands in for the screen when the
phone is in a pocket.

## 6. Camera gestures

- **For continuous control, not for commands.** Hand height to cutoff, hand
  spread to reverb, two hands as an XY pad. ESTIMATE: camera plus hand tracking
  is 50 to 100 ms or more, fine for a sweep and late for a hit.
- **Run it on the phone.** MediaPipe Hands in a phone browser uses the phone's
  GPU. A Pi 4 would manage a few frames a second (ESTIMATE). It also keeps the
  Pi's camera out of it, which matters: the Pi camera is to be **off by default
  and enabled only by an env var** (BACKLOG, asked 2026-09-30, privacy).
- **A gesture is just another source.** *"left hand height to Circuit drum 2
  decay"* is a wish like any other, and it arrives at the Pi as a row.

## 7. Further ideas, unranked

- **The Pi listens to the music, not to the player.** The board already captures
  the Circuit's audio. An envelope follower on it is a source: *"kick loudness
  ducks the synth filter"* is sidechain compression without a compressor.
- **Instrument to instrument with no computer in the loop**: Evolution knobs to
  Circuit macros, Circuit pads to Yoshimi on the Pi.
- **Wish by demonstration.** Say *"this"*, wiggle a knob, *"should move that"*,
  wiggle the target. The Pi sees both messages and builds the row with no model.
  The most reliable mapping there is; the model only names it.
- **Undo with a foot.** Hold a footswitch two seconds and the last row goes. The
  same as `×`, with no screen.
- **Edits by voice**: *"only the top half"*, *"slower"*, *"inverted"* change a
  row's range or curve. A small edit is easier to get right than a whole routing.
- **Remote wishes.** `/away/` (https://positron.studio/away/) already reaches the
  Pi from another building over the direct path; somebody there could lay a row
  on this desk and the player would see it arrive.

## 8. What is not known, and what would settle it

| question | how to settle |
| --- | --- |
| Speech to row time on a phone, end to end | time `Hold to talk` release to row on `/wish/` from a phone, with Workers AI; `research/cf-models-speech-to-patch-2026-09-21.md` has the model survey but nothing was timed |
| Does a phone mic pick out a voice at playing volume | one test in the room with the Circuit playing |
| Added latency of a Node forwarding loop vs `aconnect` on the Pi 4 | `rig/board/bench.mjs`-style timestamps on a loopback through `snd-virmidi` |
| Hand tracking latency and frame rate on a phone browser | a throwaway page with MediaPipe Hands and a timestamped CC out |
| Whether the Pi is really a Pi 4 | `cat /proc/device-tree/model` on it (README says Pi 4) |

## 9. Steps, in order

1. **Route table on the board.** `rig/board/routes.mjs`: rows, persistence to a
   file, a forwarding loop, every output through the existing gate. A test in
   `rig/board/test.mjs` style, no device.
2. **`/wish/` writes rows to the board** instead of holding them in the page,
   over the board's existing relay and direct paths. `×` deletes the row on the
   Pi. Rows outlive the page.
3. **Credential off the laptop.** `wish-local.mjs` becomes a route on an existing
   Worker the phone can call, so no laptop process is needed. Needs a decision on
   who may call it (a visit must still reach nothing, per CLAUDE.md).
4. **Push to talk from hardware.** A footswitch or a spare Circuit pad starts and
   stops capture on the phone through the board.
5. **Scenes**, recalled by program change.
6. Then pick from §7: wish by demonstration first, it needs no model.

Nothing here touches somebody else's server, and nothing sends SysEx.
