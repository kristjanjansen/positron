# keys — the board's own listener, retired 2026-09-17

`https://positron.studio/keys/`, from 2026-09-10 to 2026-09-17. A keyboard in a
browser that played a Yoshimi on a Raspberry Pi in another building and streamed
the sound it made back over the relay. It was `/box/` until 2026-09-16, when the
slug was renamed on instruction; the file never moved out of `rig/box/`, because
`LAYOUT.md` rule 2 names it as the example of a page that belongs with its
hardware — putting it under `demo/` would have invited `built: true`, which puts
a shared board in another building into every run of the suite.

## Why it went

Instructed 2026-09-17: *"keys seems to be dead. bring keyboard to knobs and
archive keys"*. Its keyboard is on `/knobs/` now, which is the same instrument
with the filter controls beside it.

## What was actually wrong, and what was not

It was reported silent twice. Two real faults were found and fixed before it was
retired, and NEITHER of them was reproduced as silence from here:

- **Any other client's `voices.list` was treated as this page's own answer.** The
  relay forwards verbatim and the board replies into the room, so a second
  person on the page, `/knobs/` opening, or a probe from a terminal each made
  this page re-list its patches and send `voice.select` — and a `voice.select`
  makes Yoshimi load an .xiz, which kills the note you are holding. MEASURED:
  three patch loads in one page load, 20 ms apart. Fixed by keeping the id of
  the request and accepting only its reply.
- **A red line in the log on every load**, `6.9 frames a second arriving where
  one clean source is 50`, while `lost` read 0 and the page settled at 50.0 a
  moment later. The rate is frames over time-since-first-frame, and at 1.6 s
  that window is mostly the page waking up.

⚠️ **THE SILENCE WAS NEVER REPRODUCED.** Four ways in under CDP all produced
sound with a draining cushion: a click locally, a click on the deploy, a computer
key, and a browser with the real autoplay policy. Buffer 84 to 109 ms, lag 72 to
207 ms, `lost` 0, peak around 0.05 to 0.09 of full scale.

⚠️ **AND EVERY ONE OF THOSE MEASUREMENTS IS UPSTREAM OF WHERE THE FAULT MUST BE.**
Frames, buffer, cushion, lost, and a peak computed from the bytes as they arrive
all measure what ARRIVED. Nothing measured what the audio graph OUTPUTS. That is
the same shape as the `pcm-playout` trim bug, where six measurements were green
and the defect sat downstream of all of them. The measurement that was never
built is: hook `AudioWorkletNode.prototype.connect` before the page loads, put an
analyser on what reaches the destination, and read that. If `/knobs/` is ever
reported silent, build that first rather than repeating this.

⚠️ **IT HAD NO HARNESS, AND THAT IS WHY A REGRESSION COULD SHIP.**
`node demo/verify.mjs keys` answered `nothing for this harness to verify` for the
whole of its life, because it was never a built demo. `/knobs/` is, at 35/35.

## What else left with it

Reverb and chorus were removed from this page and from the board on the same day
(*"Rm chorus reverb from keys ui and board"*); they are at `archive/keys-space/`.
FluidSynth and hexter left the board on 2026-09-16 and are at
`archive/box-fluidsynth-hexter/`.

## The file

`listen.html` here is the page verbatim as it was retired, including both fixes
above. It expects `/shell/` and `/proto/jam/playout-worklet.js` and talks to
`wss://ws.positron.studio`. Nothing imports it.
