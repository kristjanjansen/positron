# proto/instrument — remote instrument platform (v0)

"Play my synth" on our own stack. An owner exposes real hardware; a player
anywhere browses a catalog, asks for it, plays it, hears and sees it come back;
the session lands on the timeline as a flat event log with an audio span.

Built 2026-08-27. **24/24 end-to-end checks green**
(`results/instr-verify.json`, one headless Chrome, three tabs, real WebRTC).

## Files

| file | what |
|---|---|
| `server.mjs` | rig server on **:8899**. Static + `/time-local` (hrtime-anchored epoch µs, same-host truth) + `/env.json` + result sink. Serves `proto/instrument/` first, then falls back to `proto/jam/` — which is how the sibling's `host-check.html` runs unmodified on this port too. |
| `instrument-core.js` | the carried primitives: 16-B frame codec, dedupe, min-RTT skew clock, MIDI hygiene + all-notes-off, signaling client, WebRTC helpers, ct→epoch edge-median map, onset tap, adaptive onset↔note matcher, the percussive synthetic voice, percentiles. |
| `host.html` / `host.js` | the owner: register, go online, accept, actuate MIDI onto hardware, publish audio + panel video, safety. |
| `play.html` / `play.js` | the player: browse, request, play, hear, HUD, record, download, replay. |
| `harness/run-instrument.mjs` | the verification run. |
| `results/instr-verify.json` | the numbers + all 24 checks. |
| `results/instr-session.jsonl` | a real session recording. |
| `results/instr-host.png`, `instr-play.png` | both pages, live session. |

Worker: `workers/instrument/` → `elektron-instrument`, see its `DEPLOYED.md`.

## What was reused rather than rebuilt

- **`proto/jam/onset-worklet.js` is LOADED, not copied** — `server.mjs` mounts
  `proto/jam/` at `/jam/`, both pages `addModule('/jam/onset-worklet.js')`.
- **`proto/jam/harness/cdp.mjs`** is imported verbatim by the harness.
- From `remote-synth.js`: the percussive instant-attack voice, the ct→epoch
  **edge-median** map (a rolling min is poisoned by headless render-ahead
  bursts), the adaptive onset↔note matcher, `iceComplete`/`pcConnected`, and the
  whole player-offers / host-answers-with-replaceTrack topology.
- From `jam-core.js`: the 16-B frame layout and the `dedupe(key, windowMs)`
  primitive with bounded GC. **Copied, not imported** — `jam-core.js` exports
  only the monolithic `makeJam(opts)`, which binds DOM ids, `/time-local` and
  its own transports; there is no seam to import through, and `proto/jam/*` was
  off limits to edit. Byte 0 now carries the real status byte so note-**off**
  (0x80) rides the identical frame; the layout is otherwise unchanged.
- From `workers/selfrec`: the tokenless rate-guarded `/time` endpoint and its
  min-RTT client protocol.
- From `workers/rtc` (read only, never touched): the room/roster/token shapes
  and above all the **`left` pattern** — socket close is the death detector.
- From `workers/jam`: the hibernation DO + constant-time token skeleton.

## Measured (verification run, 64 notes = 128 MIDI frames)

Both peers on one machine, clocks on the rig's `/time-local` (min-RTT 0.3–0.5
ms), so these are transport numbers and not clock error.

| metric | value |
|---|---|
| one-way MIDI, player → instrument | **p50 0.25 ms**, p95 0.95, p99 1.35, max 1.55 (n=128) |
| key → ear round trip | **p50 72.7 ms**, p95 75.4, p99 76.7, min 66.2 (n=64) |
| player offer → MIDI DataChannel open | **210 ms** |
| host answer → PeerConnection connected | ~60 ms |
| frames lost / duplicated / late | 0 / 0 / 0 |
| replay: fired vs logged | 128 / 128, log grew by 0 |

A previous identical run gave one-way p50 0.50 / key→ear p50 70.5 — the spread
between runs is larger than the spread within one. The one-way distribution's
`min` sometimes lands slightly **negative** (−0.05 ms): the two tabs calibrate
independently against `/time-local` with a 0.3–0.5 ms min-RTT, so at a 0.25 ms
median the residual calibration error is the same size as the measurement. That
is the honest resolution floor of this rig, not a bug — and it is exactly why
the harness uses the local clock rather than the worker's `/time`, where the
error would be tens of milliseconds.

Reproduces PROGRESS 6f (DC-direct 1.0 ms floor) and 6i (WebRTC audio return
77.7 ms, 98.6 % of it the receiver's jitter buffer).

## Decisions worth remembering

- **One DO instance, not one per instrument.** v0 scale is a handful of units and
  one DO makes registry/online/busy trivially consistent. Attachments are the
  state, so hibernation is free.
- **Online/busy are derived from sockets, never stored flags.** No cleanup job,
  no stale-entry sweeper, and the owner's disappearance is a frame the host page
  can hang all-notes-off on.
- **The host is the answerer.** The player offers `recvonly` audio+video plus the
  `midi` DataChannel; the host `replaceTrack`s its instrument onto the
  transceivers. One PeerConnection carries MIDI up and audio+video down.
- **Telemetry acks ride the same lossy channel** as MIDI. A lost ack costs one
  HUD sample, never correctness — so no second channel to negotiate.
- **"Late" is only counted when a playout lead is set.** At lead 0 every note is
  due on arrival by definition; counting those would be theatre.
- **The 48 kHz capture check is shown but not gated in the harness** — Chrome's
  `--use-fake-device-for-media-stream` is 44.1 kHz by construction. The page
  shows it red, which is the right answer for a real interface stuck at 44.1.
- **Headless Chrome takes exactly one URL** ("Multiple targets are not supported
  in headless mode"); the other two tabs come from the DevTools `/json/new`
  endpoint. `getUserMedia` also needs
  `--auto-accept-camera-and-microphone-capture` **and** a CDP
  `Browser.grantPermissions` — `--use-fake-ui-for-media-devices` alone is denied
  under `--headless=new`.
- The panel canvas draws on a 33 ms `setInterval`, **not** rAF: a background tab
  stops rAF and the captured video track would freeze mid-session.

## The MoQ seam (deliberately not taken in v0)

The return path is WebRTC only. `@moq/net` needs a Docker-esbuild bundle, which
ThreatLocker blocks on this machine, so MoQ was skipped rather than faked. The
seam is clean and narrow: `play.js`'s `onTrack()` is the only place that turns a
returned audio stream into an onset tap and a `<video>` element. A MoQ arm
replaces that one function with the `pcm-playout` worklet path already written in
`proto/jam/remote-synth.js` (`aStartMoqSubscribe`) and adds a publisher next to
the host's `replaceTrack`. PROGRESS 6i measured MoQ return at **35.8 ms** at
floor 10 — roughly half of what we get here — with a floor→latency curve of
10→36 / 40→66 ms, so the seam is worth about 35 ms of playability.

## Integration with the sibling's host self-test

`proto/jam/host-check.html` + `host-check.js` (port 8898, another agent's) exist
as of this writing. The host page links to it as **"Check my rig ↗"**. The link
is `/host-check.html`, which resolves through this server's `proto/jam` fallback,
so the self-test runs on **:8899 as well as its own :8898** — verified 200 for
both `/host-check.html` (12162 B) and its root-relative `/host-check.js`
(46327 B). Neither rig imports the other; the only coupling is one static path.

## What v0 does NOT do

- **No MoQ return** (above). WebRTC/Opus only.
- **No multi-player.** One player at a time, enforced in the DO; a second player
  is rejected with `reason:'busy'` plus who holds it and since when. `waiting` is
  a real count, so a queue is addable without a protocol change — but v0 promises
  nobody a turn.
- **No auth for players, no accounts, no payments.** The catalog is public and
  playing is public; the owner's Accept button is the entire access-control
  system. No rate limit on session requests.
- **No TURN, and NAT traversal is untested.** The pages default to
  `stun:stun.cloudflare.com:3478`; the verification run used `ice=none` because
  both peers were on one machine. A symmetric-NAT owner will need a TURN server
  and there is no relay fallback.
- **No hardware run.** Everything measured used the synthetic WebAudio synth
  stand-in and Chrome's fake audio device. See below.
- **No sysex, no NRPN-aware handling, no program changes** beyond raw pass-through
  of whatever 3-byte messages arrive; MIDI realtime is dropped by design.
- **No persistence of the session log** anywhere but the player's download. It is
  not pushed to R2 and not joined to the megatimeline yet.
- **No reconnect.** A dropped signaling socket ends the session; the player must
  request again.

## What a real-hardware run would add

1. **A true audio interface at 48 kHz**, which turns the one INFO line in the
   verification run into a PASS, and replaces the synthetic voice with the
   instrument's actual attack — the onset detector's thresholds (0.05 on / 0.015
   off, 5 ms silence) are tuned for a percussive click and will need widening for
   a pad or a slow-attack patch.
2. **The `output.send(bytes, at)` path exercised for real.** It is written and
   runs, but with no MIDI output bound the synthetic branch is what executed;
   a real DIN/USB port adds its own 1–3 ms and, on some interfaces, its own
   scheduling quirks.
3. **The playout-lead knob earning its keep.** At lead 0 on one machine there is
   nothing to smooth. Across the internet a 20–40 ms lead should convert jitter
   into stable timing, and the "late" counter finally means something.
4. **Real key→ear over a real path**, which is the number the platform lives or
   dies by and the one playasynth.com has never published.
