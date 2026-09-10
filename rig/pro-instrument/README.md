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
| direct peer-to-peer link | **6.50 ms** | 10.70 ms | 12.50 ms | 4.50 ms | 60 |
| via the Cloudflare relay | **72.70 ms** | 96.90 ms | 149.80 ms | 63.20 ms | 60 |

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

**The sound's own delay is not the network.** The browser holds a cushion of
audio so that unevenly-arriving packets still play smoothly; it read **30–44 ms**
across runs here with zero packets lost, and it adapts — a clean LAN gives it
little to absorb, so it shrinks. It cannot be switched off from JavaScript
(`jitterBufferTarget = 0` is a hint the browser clamps, and forcing it
destabilised an SFU run from 116 to 235 ms). This is why a machine in the same
room sounds much like one across the country: the cushion, not the distance,
owns the number.

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
