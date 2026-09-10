# pro-instrument — play a machine in the next room

`synth.html` runs on the instrument machine; `play.html` runs on yours. Notes go
up a direct peer-to-peer link, the sound is synthesised there and comes back on
the same connection. The Cloudflare relay carries ONLY the initial handshake.

    # on the instrument machine
    node demo/server.mjs
    open http://127.0.0.1:8890/rig/pro-instrument/synth.html?room=proinst

    # on yours
    node demo/server.mjs
    open http://127.0.0.1:8890/rig/pro-instrument/play.html?room=proinst

## Measured, 2026-09-10, two Macs on one LAN

Same payload, both paths, alternating note by note so neither arm gets the
better half of the link. Both are ROUND TRIPS timed on one machine, so no clock
agreement is involved and none of the number is skew — which is the only reason
the two are comparable.

| control path | typical | worst 1 in 20 | slowest | quickest | presses |
|---|---|---|---|---|---|
| direct peer-to-peer link | **6.00 ms** | 8.20 ms | 31.10 ms | 4.50 ms | 100 |
| via the Cloudflare relay | **68.90 ms** | 94.80 ms | 120.90 ms | 59.30 ms | 100 |

**The relay costs 11.5x at typical**, and the number that decides playability is
the last row of the run rather than the median: **presses over 100 ms — direct
0 of 100, relay 4 of 100.** Anything past ~100 ms reads as sluggish under the
fingers, so the relay crosses that line four times in a hundred and the direct
link never approaches it.

⚠️ **Discard a warm-up.** A first attempt read 1781 ms at worst-1-in-20 on BOTH
arms — a single ~2 s stall in the first seconds of the page, which at only 30
samples per arm made the 95th percentile almost the maximum. A page that has
just started is not the thing being measured. These figures follow 24 discarded
presses.

**Typical** is the middle press — half were quicker. **Worst 1 in 20** is the
level 19 presses out of 20 came in under, which is what says whether the slow
ones are rare or routine. A median alone hides the one bad press, and that press
is usually the reason to look.

**The relay costs 11.2x the direct link**, and the shape says why: a machine
three metres away is reached by going out to Cloudflare's edge and back down,
then the acknowledgement repeats the trip. Two edge round trips for one room.

So anything in the timing path takes the direct link. The relay is for the
handshake, which is not in the timing path, and for reaching machines that
cannot see each other directly.

## Key press to sound: 84 ms — and the control path is 7% of it

The two numbers on the page are DIFFERENT JOURNEYS and only one is what you hear.
The control figure times a *message* — press out, acknowledgement straight back —
and carries no audio and no buffer. Measured together, 40 notes:

| | typical | worst 1 in 20 | spread |
|---|---|---|---|
| **key press → sound** | **84 ms** | 86 ms | every sample 77–86 ms |
| message round trip (direct link) | 6.10 ms | — | — |
| the browser's audio cushion | 37.9 ms | — | 0 packets lost |

Roughly 3 ms of one-way control, ~38 ms of cushion, ~20 ms of Opus framing, and
the rest synthesis, encode and decode. **So making the control path faster buys
almost nothing** — it is already 7% of the total — and the sound path is the
whole game. That is the argument for MoQ audio return (35.8 ms key→ear measured
in `proto/jam`) over any amount of tuning here.

It lands in the same band as `proto/jam`'s 77.7 ms, which is a useful check: that
figure came from two headless Chromes on ONE machine, this one from two real
machines in a room.

**What this number does NOT include: your output device.** The onset is detected
on the DECODED audio, before it reaches a speaker; physical ears add the output
latency on top (`proto/jam` used +32 ms). State it as decoded-audio latency and
it is a floor worth having rather than a claim.

**How it is measured**: an AudioWorklet on the returned stream reports the first
sample over threshold, so the onset is sample-accurate. Polling an analyser in
rAF would quantise an 84 ms answer to a frame.

**The sound's own delay is not the network.** The browser holds a cushion of
audio so that unevenly-arriving packets still play smoothly; it read **30–44 ms**
across runs here with zero packets lost, and it adapts — a clean LAN gives it
little to absorb, so it shrinks. It cannot be switched off from JavaScript
(`jitterBufferTarget = 0` is a hint the browser clamps, and forcing it
destabilised an SFU run from 116 to 235 ms). This is why a machine in the same
room sounds much like one across the country: the cushion, not the distance,
owns the number.

## What makes the sound

A **triangle-wave oscillator with a 5 ms attack and a 450 ms decay**, built in
Web Audio inside a headless Chrome on the instrument machine — about fifteen
lines in `synth.html`. It feeds a `MediaStreamDestination`, and that stream is
the outgoing WebRTC audio track. A near-silent `ConstantSourceNode` sits on the
same bus on purpose: Chrome hands a bus it has decided is silent an EMPTY buffer,
and a sender treats a dead track as nothing to send.

**It is not Ableton.** Live 11 and BlackHole 2ch are installed on that machine
and untouched here. Capturing BlackHole instead of synthesising — so Live is the
instrument and this is only the transport — is the next step, and it needs a way
in for the notes: Live's transport is clocked by its audio engine, and
`is_playing` reports intent rather than delivery (a `current_song_time` that
does not move is the only proof the clock stopped).

## What is NOT measured here

- **Off-LAN.** `iceServers` is empty on purpose — host candidates only, right for
  one room, and it will not cross a NAT. An internet arm needs STUN, and a
  symmetric NAT needs TURN.
- **A faster return.** MoQ audio return measured **35.8 ms key→ear** against
  WebRTC's 77.7 in `proto/jam` (session 6i), because the cushion is the cost and
  MoQ lets you choose the floor. That is the upgrade, and it is a real build.
- **A real instrument.** The synth here is a triangle wave with an envelope. The
  Pro has Ableton Live 11 and BlackHole 2ch, so the next step is to capture
  BlackHole instead of synthesising, and to drive Live over MIDI or OSC.
