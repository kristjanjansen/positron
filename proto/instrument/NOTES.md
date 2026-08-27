# proto/instrument — remote instrument platform (v0)

"Play my synth" on our own stack. An owner exposes real hardware; a player
anywhere browses a catalog, asks for it, plays it, hears and sees it come back;
the session lands on the timeline as a flat event log with an audio span.

Built 2026-08-27. **54/54 end-to-end checks green**
(`results/instr-verify.json`, one headless Chrome, three tabs, real WebRTC,
real R2, a real 15 s network outage). Sessions are **durable**: notes as SQLite
rows in an EU-pinned DO, audio *and the panel video the player actually saw* in
R2 behind a three-rung owner consent toggle, an IndexedDB backstop on both
lanes so an outage loses nothing, and per-session capability tokens so holding
the id is no longer the whole permission system.

## Files

| file | what |
|---|---|
| `server.mjs` | rig server on **:8899**. Static + `/time-local` (hrtime-anchored epoch µs, same-host truth) + `/env.json` + result sink. Serves `proto/instrument/` first, then falls back to `proto/jam/` — which is how the sibling's `host-check.html` runs unmodified on this port too. |
| `instrument-core.js` | the carried primitives: 16-B frame codec, dedupe, min-RTT skew clock, MIDI hygiene + all-notes-off, signaling client, WebRTC helpers, ct→epoch edge-median map, onset tap, adaptive onset↔note matcher, the percussive synthetic voice, percentiles — **plus `makeBackstop`, selfrec's IndexedDB never-drop buffer generalised to any unit of work**. |
| `host.html` / `host.js` | the owner: register, go online, accept, actuate MIDI onto hardware, publish audio + panel video, safety — plus the **host lane** of the session log (what the instrument actually did, host clock) and the consent-gated **audio recording** into R2. |
| `play.html` / `play.js` | the player: browse, request, play, hear, HUD, record, download, replay — plus the **batched append** of their own lane to the session store, **load a stored session by id** and replay it (with its audio) through the same send path, and **delete**. |
| `harness/run-instrument.mjs` | the verification run. |
| `results/instr-verify.json` | the numbers + all 54 checks. |
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
- From `proto/selfrec/participant.html`: the **IndexedDB park-and-drain buffer**
  and the **codec probe table**. Reimplemented as `makeBackstop` in
  `instrument-core.js` rather than imported — `participant.html` is one inline
  script bound to its own show/participant/collector shape and was off limits to
  edit — but the shape is its: bounded, oldest-first, high-water tracked, and
  what cannot be sent is *reported* in the manifest, never dropped.
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

## Session storage (2026-08-27, second pass)

Sessions used to end as a client-side `.jsonl` download and the audio was
ephemeral. Now:

- **Notes** → batched POST to `elektron-instrument`'s new **`Sessions` DO**
  (SQLite **rows**, plan-timeline C4; EU jurisdiction). Flush every 1 s or 200
  events — the same throttle-at-capture rule the HUD uses, never one request
  per note. Full schema + routes in `workers/instrument/DEPLOYED.md`.
- **Audio** → the owner's `MediaRecorder` on the *same audio track the player is
  hearing*, timeslice 2 s, chunk → POST → R2 `instrument/<sid>/audio/` →
  server-side sha256 verify → retry ×3 → list-and-compare → manifest. That is
  `proto/selfrec`'s proven shape, reused; `workers/selfrec` was not touched.
- **Consent** is the owner's, defaults **OFF**, and is **not persisted** — a
  checkbox remembered from last week is not consent for today.
- **Delete** is a tombstone: rows dropped, R2 prefix swept, `deleted.marker`
  written, reads 410, appends 410. Player deletes with the session id; owner
  deletes with `INSTRUMENT_TOKEN`.

### TWO LANES, NEVER ONE — do not "fix" this by averaging

The player logs what they **meant**, in the player's clock. The host logs what
the instrument **actually did** (`kind:'midi-actuated'`, `ref` → the player's
note seq), in the **host's** clock — which is the clock its audio recording is
stamped in. So:

- **Replay from storage uses the HOST lane as master.** Actuations and audio are
  natively aligned (one machine, sub-ms); the audio's offset into the file is
  `firstEvent.at − mediaSpanStart.at`, a subtraction, not a skew guess. The
  player's lane is their intent, rendered as a second lane, and is **never** the
  audio's timing source.
- **The pair of lanes IS the drift channel.** Verified: joining them on `ref`
  reproduced the live one-way MIDI number exactly — **p50 0.48 ms from storage
  vs 0.48 ms live**, n=128. Averaging the lanes into one would destroy that
  measurement, which is the whole reason both are stored.

### Storage numbers from the verification run

| thing | value |
|---|---|
| stored rows, one 64-note session | **392** (128 player `midi`, 256 host `midi-actuated`, **4** `media-span` — two lanes × start/end, 1 `audio-span`, 3 `session`) |
| append rejections | 0 |
| audio chunks in R2 / verified | **12 / 12**, `audio/webm;codecs=opus`, 2 s timeslice |
| A/V chunks in R2 / verified | **12 / 12**, **`video/webm;codecs=h264,opus`**, 2 s timeslice |
| bytes kept, the one proof session | **978,255 B** — 290,720 audio + 687,535 A/V (incl. both manifests), ~24 s |
| replay from storage | **256 fired**, master `host`, media lane **`av`**, offset 1.79 s, `<video>` 640×360, `currentTime` advanced 0.65 s in 0.7 s |
| consent matrix | `audio+video` → 12 audio + 12 av · `audio` → 3 audio + **0** av · `off` → 19 rows, **0** objects, no `media-span` at all |
| 15 s offline window | 80/80 player events, 80/80 actuations, 9/9 audio chunks, 9/9 A/V chunks — nothing lost, nothing degraded |
| delete by player | rows dropped, R2 purged, read → 410, re-append → 410, upload with a valid token → 410 |

The host lane holds 256 rows to the player's 128 because the harness *replays*
the session once mid-run and the instrument really was actuated a second time.
The host lane logs what happened, not what was intended — that asymmetry is the
feature working.

### Things learned the hard way

- **`X-Chunk-Sha256` must be in `Access-Control-Allow-Headers`** or the chunk
  POST dies in preflight and the browser says only `Failed to fetch`. One whole
  harness run to find; selfrec had it right and it did not get carried over.
- **One seq counter per (session, source).** Actuations and `media-span` markers
  share the `instrument` source, so they must share the monotonic sequence — a
  span marker taking seq 0 makes the first actuation's seq 0 a *rejected*
  duplicate. The counter is keyed by session id, not global, so a recorder still
  finalizing the previous session cannot restart at 0 and collide.
- **Reject per event, not per batch.** A retried batch is then idempotent (its
  events are already ≤ max and drop out individually) instead of a hard failure.
- **A backstop that reorders is a backstop that loses data.** The very same
  monotonic-seq guard that makes a retry idempotent turns an *overtaking* batch
  into a silent loss: the fresh batch lands, the parked one comes back later and
  every event in it is ≤ max, so it is "rejected as a duplicate" and gone. The
  fix is one rule — *once anything is parked, everything later is parked too* —
  and it is the reason `makeBackstop` has a single `offer()` entry point rather
  than a send-with-fallback.
- **A Durable Object keeps running its OLD class code after a deploy** until the
  instance is evicted. The worker routed the new `/av` paths immediately while
  the `Sessions` DO still answered `no such session op`; ~1 minute later it
  picked up the new code by itself. Not a bug — but "deployed" and "the DO is
  running it" are two different moments, and a smoke test right after a deploy
  can lie to you.
- **`Network.emulateNetworkConditions({offline:true})` also kills the signaling
  WebSocket**, so the session really ends mid-outage. That made the durability
  test harsher than designed (the recorder finalises *while still offline* and
  its `settle()` has to outlast the outage) and it is the better test for it.

## The three gaps, closed (2026-08-27, third pass)

### 1. Video capture — the panel the player actually saw

Consent has three rungs now (**off · audio · audio+video**, still defaulting off
and still never persisted). At the top rung the page runs **two** recorders off
the very tracks already on the wire: the old audio-only one, and a second on
`new MediaStream([audioTrack, panelVideoTrack])` — **one** webm carrying both,
chunked to `instrument/<sid>/av/`, with its **own** `media-span` pair carrying
`payload.kind:'av'`. Chosen codec on this machine: **`video/webm;codecs=h264,opus`**
(the probe found h264, avc1, vp8 and vp9 all available with opus; h264 wins
because it makes a later repackage a remux rather than a transcode — selfrec's
reasoning, carried).

Replay **prefers the A/V span** and falls back to audio-only: a plain `<video>`
fed the Blob-concatenated chunks, no MSE, because only chunk 0 carries the webm
header — the same fact the audio lane already relied on. Verified live: 640×360,
`currentTime` advanced 0.65 s in a 0.7 s window.

### 2. The IndexedDB backstop, on BOTH lanes

`instrument-core.js` now exports `makeBackstop({name, send})` — selfrec's buffer
generalised from "a media chunk" to "a unit of work" — used four times: player
events, host events, host audio chunks, host A/V chunks. Park on failure, drain
oldest-first on reconnect, high-water tracked, and whatever is still parked when
a manifest is written is named there as `missing`/`degraded:true`.

**One rule selfrec never needed: order is correctness.** The DO enforces a
monotonic `seq` per `(session, source)`, so a batch that overtook a parked one
would be rejected as a *duplicate* and the parked one lost silently. Hence:
once anything is parked, everything later is parked, and the drain is the only
sender.

Verified with a real 15 s CDP `Network.emulateNetworkConditions({offline:true})`
window mid-session on both tabs (this also kills the signaling socket, so the
session really does end mid-outage — a harsher test than intended, and it
passes):

| lane | parked | drained | high water | drain from reconnect |
|---|---|---|---|---|
| player events | 9 | 9 | 9 / 6,925 B | 840 ms |
| host events | 7 | 7 | 7 / 7,708 B | 657 ms |
| host audio | 8 | 8 | 8 / 123,859 B | 2,545 ms |
| host A/V | 8 | 8 | 8 / 396,137 B | 3,208 ms |

### 3. Access control that is not just "hold the id"

The Hub mints **two 128-bit hex tokens** with the session id at `accept`, writes
them on the session row *before* either party is told the id exists, and hands
each party only its own. Enforced on exactly three things: player-delete needs
`playerToken`, owner-delete needs `ownerToken` **or** `INSTRUMENT_TOKEN`, media
upload needs `ownerToken` or `INSTRUMENT_TOKEN`. Reads stay open (a session id
is a share link) and per-lane event appends stay open (the two-lane `ref` join
makes a forged lane obvious). **A tombstone still outranks a valid token.**

These are capabilities, not identities — see DEPLOYED.md for the full honest
statement of what they do and do not defend against.

### What session storage still does NOT do

- **No compaction job.** C6's tombstones are here; the "sweep tombstoned media
  later" job is not, because delete purges R2 inline today.
- **`audioPrefix`/`avPrefix` are convenience indexes, not the truth.** The
  `media-span` rows are. Nothing yet enforces that they agree if a manifest
  write fails.
- **No token expiry, rotation or revocation** short of deleting the session, and
  no binding of a token to a device or a socket.
- **The A/V lane duplicates the audio.** At `audio+video` both recorders run, so
  the instrument's sound is stored twice (290 kB + 688 kB for 24 s). That is
  deliberate — an audio-only consumer should not have to demux video — but a
  future rung could record `av` alone.
- **No hardware camera in the verification run.** The panel canvas (with the
  camera compositing path exercised but no real device attached under
  `--use-fake-device-for-media-stream`) is what got encoded.

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
- **No accounts, no identities, no payments.** The catalog is public and playing
  is public; the owner's Accept button is the entire access-control system for
  the *instrument*. Per-session capability tokens govern what happens to the
  *recording* afterwards — see §3 above. No rate limit on session requests.
- **No TURN, and NAT traversal is untested.** The pages default to
  `stun:stun.cloudflare.com:3478`; the verification run used `ice=none` because
  both peers were on one machine. A symmetric-NAT owner will need a TURN server
  and there is no relay fallback.
- **No hardware run.** Everything measured used the synthetic WebAudio synth
  stand-in and Chrome's fake audio device. See below.
- **No sysex, no NRPN-aware handling, no program changes** beyond raw pass-through
  of whatever 3-byte messages arrive; MIDI realtime is dropped by design.
- ~~No persistence of the session log~~ — **done, see "Session storage" above.**
  Still not joined to the megatimeline.
- ~~No video recorded, no durability backstop, no access control beyond the id~~
  — **all three done, see "The three gaps, closed" above.**
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
