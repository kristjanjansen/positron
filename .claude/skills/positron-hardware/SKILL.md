---
name: positron-hardware
description: The Raspberry Pi board, the Ableton rig, Yoshimi, the Novation Circuit, MIDI and audio capture on this desk. Load before touching anything under rig/, before a page that plays or records real hardware, and before any claim about what an instrument does.
---

# The machines on and off this desk

Every number here was measured on the hardware named, not read out of a
manual. Where a claim came from a document rather than from the desk, it says
so.

## Finding the box, and where its code actually lives

## Finding the box, and where its code actually lives

**Ask port 22, not ARP and not mDNS.** `positron-board.local` does not resolve
from this sandbox (mDNS is multicast UDP), a ping sweep answers nothing useful,
and guessing Raspberry Pi MAC prefixes in `arp -an` missed it outright — the
board was there the whole time. One line finds it in about a minute:

```sh
for i in $(seq 1 254); do (nc -z -G 1 -w 1 192.168.1.$i 22 2>/dev/null && echo 192.168.1.$i) & done; wait
ssh positron@<ip> hostname -s            # it answers `raspberrypi`
```

It also answers over the relay from any network — `node rig/board/ask.mjs --room
studio-1 audio.status` — so **"I cannot ssh to it" is never the same as "it is
down"**, and saying the second because of the first is wrong. Ask the relay
first; it needs no LAN.

⚠️ **The service runs from `/opt/positron-board/`, NOT from `~/positron/`.**
`provision.sh` unpacks into `~/positron` and `setup.sh` copies that to
`/opt/positron-board`, which is what `positron-board.service` executes. The copy in
`~/positron` on the board is stale — it has no `pappus.mjs` at all — so editing
or checking it tells you nothing about what is running. Compare `md5sum` against
`/opt/positron-board/rig/board/` before believing a deploy landed.

## The instruments

- **`rack` plays Ableton Live from a browser and it is LIVE (2026-09-12).**
  <https://positron.studio/able/>, 15/15. A note number crosses the relay,
  `rig/m1/live-agent.mjs` hands it to Live over CoreMIDI, and a **Core Audio
  process tap** sends a copy of what Live renders back down the same socket —
  so Live keeps playing out of its own speakers while the page hears it too.
  `/keys/` is the SAME PAGE pointed at a Raspberry Pi. **No BlackHole, no
  Multi-Output Device, no Live Preferences click** — the tap removes the one
  requirement the Live Object Model could not script, which is what parked the
  old rig. It stays up by itself via `studio.positron.rack-agent.plist`
  (a LaunchAGENT — TCC grants need a GUI session, a daemon would get silence
  that reads as success). MEASURED: silence 0.00000, keys down **-5.3 dBFS**,
  0 dropped of 801, 50 frames/s at 1541 kbit/s stereo, agent 4.2% of one core.
  ⚠️ **The old "a capture started over ssh is deaf" rule does NOT apply here** —
  that was `ffmpeg -f avfoundation`, whose TCC subject is the terminal;
  `audiotap` disclaims responsibility and is its own subject, measured working
  from an ssh-started process.
- 🔴 **YOSHIMI DOES NOT USE THE GENERAL MIDI CONTROLLER MAP, AND ASKING IT FOR A
  VIBRATO GETS A SLIDER THAT DOES NOTHING.** In General MIDI, 76 and 77 are
  vibrato rate and depth. In the ZynAddSubFX family they are **FM amplitude** and
  **resonance centre**, and the rest of the extended set is 71 filter Q, 74
  filter cutoff, 75 bandwidth, 78 resonance bandwidth. MEASURED 2026-09-16 with
  `node rig/board/wobble-test.mjs`, one note held throughout and every controller
  read twice at one value first: CC 76, CC 77 and the mod wheel move the pitch
  by **0.2 cents** at every value, which is the tracker's own noise.
  ⚠️ **THAT WAS FIRST WRITTEN AS "THERE IS NO VIBRATO ON THIS INSTRUMENT" AND
  THAT WAS WRONG, TWICE OVER.** Challenged 2026-09-17 with *"Sure there is no
  lfo?"*, which was the right question. It had been measured on ONE patch, so a
  patch with no LFO configured was being reported as a fact about Yoshimi; and it
  tracked PITCH only, so an amplitude LFO would have read as flat however obvious
  it was to a listener. MEASURED on `Trem Lead` (bank 110, program 8) with a
  level analyser graded on synthetic tremolo first: a real **21 to 25% deep**
  tremolo at about **1 Hz**, and 1.2 cents of pitch wobble against 0.2 on
  `AddSynth Morph`. **THE LFOs ARE THERE.** What is true is the narrower claim:
  no controller reaches one. CC 76, CC 77 and the mod wheel leave that patch's
  tremolo rate and depth inside their own floor, so a slider labelled LFO speed
  still has nothing to drive. What 75 and 76 DO move is large —
  bandwidth takes the beating between partials from 225 cents at 6 Hz to 114
  cents at 0.8 Hz, FM amplitude takes it from 149 cents to 0.2 — so `/knobs/`
  carries those two beside cutoff and resonance.
  ⚠️ **AND `AddSynth Morph` MOVES ON ITS OWN, WHICH BREAKS A HELD-NOTE FLOOR.**
  Two takes at one value, four seconds apart, differ by **0.58 octaves** of
  brightness. A timbre claim about a controller on that patch needs
  `cc-test.mjs`, which re-triggers the note and so resets the morph; a pitch
  claim is safe, because its floor is a fifth of a cent.
  ⚠️ **THE FIRST TWO BUILDS OF THAT TOOL MEASURED THE WRONG QUANTITY AND PASSED
  THEIR FLOOR PERFECTLY.** A vibrato is a pitch wobble and both early builds
  measured LEVEL: one saturated its crossing counter and reported 19.15 Hz to
  four figures about every controller at every value, the next read **0.85 Hz
  for a 2.0 Hz drive**. A floor proves an instrument does not invent movement.
  Only a KNOWN signal proves it can see any, which is why that file grades its
  analyser on synthetic tones before it says a word about the board.
- 🔴 **A CHANNEL COUNT CANNOT BE INFERRED FROM A PAYLOAD.** 960 int16s is a
  valid 20 ms mono frame AND a valid 10 ms stereo one; guessing wrong plays an
  octave down, which sounds like a broken instrument rather than a broken
  header. The Mac sends stereo, the board sends mono, **both are on the relay at
  once**. Senders declare `audioChannels` AND `frameMs`; receivers CHECK one
  against the other (`samples / channels / rate` must equal `frameMs`).
  ⚠️ Not `channels` — `board.mjs` has that and it means MIDI channels.
  And **a measurement outranks a repeated claim**: proved by shipping a liar,
  which exposed the page correcting itself and then being un-corrected by the
  next status reply repeating the same wrong number.
- 🔴 **A bit-clean stream can still sound broken, and the cushion is where.**
  `pcm-playout` trimmed 15 ms of audio mid-note on ordinary jitter — floor
  60 ms, slack 15 ms, frames arriving in 20 ms lumps, so ONE early frame tripped
  it. The samples measured identical to the source (same pitch, same peak, zero
  discontinuities) and the suite was green the whole time, because the defect is
  downstream of every quantity being measured. Slack now follows the frame size
  the worklet OBSERVES. **Every stage that can discard data needs a counter a
  page actually displays** — these counters existed, posted every 250 ms, and
  no page had ever read one.
- **The Ableton rig is PARKED (2026-09-11) and it is parked working — 11/11.**
  Not broken, too heavy: six things must be true before a note sounds and
  **four are Preferences clicks with no API**, including Live's audio output
  device, which the Live Object Model cannot set. A capture started over ssh is
  deaf, so its relay agent must live in a login session — the box is a service
  that dials out on boot, this is a performance instrument you wake on purpose.
  `rig/m1/README.md` has the measurements, the two traps and the
  revisit order. `/able/` stays live and reports silence AS silence.
- **An avfoundation device INDEX is a shared mutable global, exactly like a
  fixed port.** `ffmpeg -f avfoundation -i ":0"` meant the microphone when
  `rig/m1/README.md` was written and means **BlackHole** today —
  and both read **-91.0 dB**, where one reading proves "this capture is deaf"
  and the other proves "nothing is playing", which are opposite conclusions
  from an identical number. The README's own deafness control had been
  measuring the wrong device. Resolve by NAME from
  `-list_devices true` every time; `rig/m1/live-check.mjs` does.
