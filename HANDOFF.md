# Handoff — 2026-09-10 (end of session 16)

Read order for a fresh session: this file → `SUMMARY.md` → `PROGRESS.md`
(newest first) → the plan you're touching. `plan-timeline.md` §7–§9 is the
current state of the library and OVERRIDES §§1–6 where they disagree; §9 is
newest and wins over §7–§8.

⚠️ **Session 13 was never written into this file.** It built `reel`, `now` and
`keep`, landed plan-names P1, and removed `tracks` and `grid`; its record is
`LESSONS.md` §33–38 and the git log, and the demo table further down predates
it. Do not read the older sections below as current.

## Session 16 — one real encoder, three transports, and a picture read back at the far end

**HANDOFF 0ad is discharged.** OBS on the Pro publishes to LL-HLS, WHEP and MoQ
from the SAME source, driven over obs-websocket from the dev Mac. `rig/obs-pro/`
holds the rig: `stream.mjs hls|whip|moq|off` is the one driver, `shot.mjs` reads
the burned clock out of OBS's own composited frame, `read-hls.mjs` reads it back
off the live edge, `clear-recordings.mjs` is the storage lever.

| transport | connect | frames | skipped | far end |
|---|---|---|---|---|
| HLS (RTMPS) | 1.8 s | 1038 | **0** | **25/25 frames readable off the edge** |
| WebRTC (WHIP) | 3.6 s | 876 | **0** | storage unchanged → records nothing |
| MoQ 720p | 113 ms | — | **0** | 30 fps, 712 decoded, 0 decode errors |
| **MoQ 4K30** | 137 ms | 2451 | **0 (0.00%)** | 30 fps, 1358 decoded, 0 errors |

**4K30 held on SOFTWARE x264 at 6.2 Mbps with zero drops** on the M1 Pro; the
hardware encoder was never needed. **WHIP records nothing — reconfirmed from a
real encoder** (512.54 min before an 876-frame publish, 512.54 after), where the
rule was previously known only from the container.

**The rig found a real defect in its first hour.** OBS Simple mode leaves x264 at
`keyint=250` — 8.33 s at 30 fps — so the manifest carried **4 INDEPENDENT parts
of 63** against the publisher's documented 10-of-38, pinning the LL-HLS floor
near 8 s. `keyint=60` gives **11 of 43**. Note OBS parses custom encoder settings
**space-separated**; the x264 CLI colon form logs `x264 param … failed` and
half-applies.

**Two blockers that do not announce themselves.** macOS **Local Network Privacy
is per APP** — `curl` on the Pro got 200 where Chrome and OBS got
`ERR_ADDRESS_UNREACHABLE`, a black frame with nothing in any log; and
**`BrowserHWAccel=true` renders every browser source black** on a Mac with no
attached display. Both were separated from "my page is broken" by a
`color_source_v3`, which read back solid red and put the fault in CEF.

⚠️ **`moq.positron.studio` still samples the PRE-session-12 row**, so its
`g2g_p50` came back as −40198856720202 ms (≈ −1274 years). Transport is verified;
**glass-to-glass is NOT measured** until that player is rebuilt. Third instance
of this staleness class after the container image and `rig/obs-docker/clock.html`.

⚠️ **A stream key reached a session transcript** via a raw
`GetStreamServiceSettings`. Rotate `positron-demo`'s RTMPS key; see
`SECRETS-ROTATION.md`.

**And the Pro became an instrument you can play.** `rig/pro-instrument/` — notes
up a direct peer-to-peer link, synthesised there, sound back on the same
connection; the relay carries only the handshake. The control-path A/B, same
payload, alternating note by note, 60 each:

| control path | typical | worst 1 in 20 | slowest | over 100 ms |
|---|---|---|---|---|
| direct peer-to-peer link | **6.00 ms** | 8.20 ms | 31.10 ms | **0 of 100** |
| via the Cloudflare relay | **68.90 ms** | 94.80 ms | 120.90 ms | **4 of 100** |

**The relay costs 11.5x**, because a machine three metres away is reached by
going out to the edge and back, twice. So anything in the timing path takes the
direct link — which is what `proto/jam`'s 0.56 ms MIDI leg already implied and
this now measures between two real machines. The sound's own delay is the
browser's audio cushion (**30–44 ms**, adapting, 0 lost), not the network; MoQ
audio return measured 35.8 ms against WebRTC's 77.7 and is the upgrade path.

⚠️ Both pages shipped broken first: the heredocs that wrote them ended one line
early, so neither had a closing `</script>` and neither module ever ran, with
**nothing thrown** — an unterminated module is a parse failure, not a runtime
one, and the only console line was a favicon 404. I read "page returns 200 with
the right URL" as "page works". `window.__play === undefined` is the check.

**The Pro became a playable instrument, and then an Ableton bridge.**
`rig/pro-instrument/` — notes up a direct peer link, sound back on the same
connection. **86 ms → 29 ms key→ear** once a **self-hosted MoQ relay** went on
the LAN (`moq-relay-ietf`, built there in 90 s; 10-day ECDSA cert pinned by the
page via `serverCertificateHashes`, because Chrome refuses anything over 14
days). The control leg is 6.10 ms and is **7% of what you hear** — the cushion
is the whole cost, which is why MoQ and not tuning.

**The relay's 71 ms is geography, not the Durable Object**: `ping`→`pong` (the
runtime's autoresponse, never wakes the object) 34.19 ms against 34.37 ms
through it — **the DO costs 0.18 ms**. A note is two such trips, predicting
68.7 ms against 71.00 observed.

**Ableton Live is wired in, and almost none of it needed clicking.** The **IAC
MIDI driver is enabled from the command line** — `devices:0:offline` in
`Default.mcfg` via PlistBuddy plus `killall MIDIServer`, which closes the "Yours
alone" MIDI item and survives reboots. **`abletonosc-ext/browser.py` adds what
AbletonOSC lacks** — Live's browser — registered from `view.py` because
`/live/api/reload` reloads `abletonosc/*` but NOT `manager.py`, so no Live
restart is needed. With it, `live-setup.mjs` loads Drift, routes `IAC Driver
(Bus 1)`, arms and sets monitoring In in one command, from the other machine.

✅ **DONE — Ableton Live is playable remotely.** All four cases measured, 14 of
14 notes each, receipt 6.6–8.8 ms throughout:

| sound comes back over | typical | worst 1 in 20 | gaps | result |
|---|---|---|---|---|
| **MoQ, LAN relay** | **58 ms** | 69 ms | 31 | clean |
| WebRTC peer to peer | 111–128 ms | 114–236 ms | — | clean |
| MoQ via Cloudflare | 136 ms | 271 ms | **1133** | **garbled** |

⚠️ **The Cloudflare relay is LOSSY for this publisher**, not merely slower —
about a third of frames missing, audible as garbling and confirmed by ear. The
same relay carried the built-in synth cleanly, so it is this cadence (5 ms Opus
frames grouped every 50 ms) over that path, not a broken relay. NOT separated:
group policy, frame duration, or the wide-area path. `seq` is the only thing that
sees it — nothing else on the path reports a thing.

✅ **58 ms key→ear on the LAN relay** (MoQ over the
LAN relay; 128 ms over WebRTC), 14 of 14 notes, receipt 7.50 ms, 0 underruns.
Live costs ~29 ms over the built-in synth, about what it reports for itself
(512 samples at 48 kHz plus 13.7 ms output latency).

**Two lessons, both expensive.** A `Browser.grantPermissions` grant lives only
while the CDP client stays CONNECTED — the launcher exited, permission fell back
to "prompt", and the capture already open went on reporting a live, unmuted,
enabled track carrying digital silence (0.00010 against 0.38763 for a freshly
granted capture of the same device, in the same second). And **verify the
instrument before believing the signal**: three tests said "BlackHole is silent"
and all three were deaf instruments — `afplay` over ssh, headless Chrome, and a
GUI app SPAWNED from ssh rather than opened. The microphone is the control: it
cannot be digitally silent in a room.

**Two platform facts worth keeping.** Accessibility (`sshd-keygen-wrapper` in
Privacy & Security) makes system modals scriptable — which matters because
**Live blocked for 20 minutes on a crash-recovery dialog** after a hard restart
and the tell was LESSONS #47 again: its log had written **zero** lines. But
**Live's own UI is opaque to the Accessibility API** — its Preferences window
exposes only close/zoom/minimise — so Live's audio device is genuinely a
one-time manual setting, and no amount of permission changes that.

**Both parallel agents landed.** `csound.mjs` is section-local (0aa closed,
42/42 self-test, 23/23 oracle against real Csound 6.18), and the `t` → `type`
sweep is done (0a closed, 413/413, no shim). The sweep's negative control is
worth keeping: **a half-swept room reads GREEN**, because "nobody dropped out"
passes vacuously when there are no peers.

## Session 14 — one message shape, and a history the relay refuses to keep

`plan-ws.md` was written and then built. **`wire` is live at
`positron.studio/wire/`** (21/21) — a demo ABOUT the socket: compose a message,
watch the exact bytes go out and come back, and find the history already on the
page when you arrive, over an ordinary web request. The room is SHARED (`wire`)
for that reason; three visible controls — *Send it*, *Send and keep it*,
*Clear history* — with the three mechanism checks hidden rather than removed so
the harness still reaches them (`?checks=1` shows them). Clear scopes to this
room; the worker's `/clear-all` sweeps every room its index knows of, which is
only what was recorded since the index existed. New worker **`positron-backlog`** on **`backlog.positron.studio`**, in
which **the recorder joins the room as an ordinary socket** — which is the whole
trick, because it is what lets the relay go on parsing nothing.

**374/389 green, and every one of the 15 failures is attributed**: eleven are
this shell's missing UDP egress (reproduced — a DNS query to `1.1.1.1:53`
returned nothing while TCP answered 200 in 0.16 s), four are ERR refusing
`etv`'s live edge to `now`, proven with a 2-byte Range GET (newest three
segments **403 with no ACAO**, one ~3,700 back **206 with ACAO `*`**). One
signal is NOT explained: `keep` logged a **409**, which is HTTP and cannot be
the UDP story.

> ⚠️ **Superseded the same day — re-run at 413/413, 26 demos, ZERO failures.**
> The missing UDP was **the VPN on this machine**, settled by test: with it
> disconnected a DNS query to `1.1.1.1:53` answers, and `webrtc` (14), `moq`
> (16), `show` (15) and `keep` (20) all run their full sets. The denominator
> moved 389 → 413 because a page that loses a leg stops before the asserts
> behind it, so restoring the leg ADDS asserts rather than only flipping them.
>
> **Two of the three clearances are weather, not fixes.** `now`'s four cleared
> because ERR happened to be serving `etv`'s edge on this run, which the notes
> already say moves with the schedule and cannot be hard-coded — it will read
> red again. And **`keep`'s 409 did not reproduce; it is not explained** (§0b).
> A 409 is HTTP and no mechanism connects UDP egress to it. Absent is not
> understood, which is the whole of #29.

**Four decisions, each argued where it lands in `plan-ws.md`:**

- **Room, not channel.** A channel in the payload forces either a parsing relay
  or full fan-out to every socket. The caps are per SOCKET, so multiplexing puts
  every channel in one 512 KiB/s bucket. elektron settles it from their side:
  `useChat()` opens its OWN socket, so v3 paid N sockets AND full fan-out.
- **`type`, not `t`.** `t` means TIME everywhere else here, and it would sit one
  letter from `at`. Cost: 3 bytes a message. **The sweep is NOT done** — 6 files,
  ~46 literals, and only `wire` speaks `type` today.
- **`from` is not `userId` renamed** — a socket, not a person, because that is
  the only scope in which a counter means anything.
- **`seq` stays, on a corrected argument.** TCP already orders one sender's
  messages, so a reordering check would pass forever. What it sees is the relay
  dropping under its caps, silently — and the perf run made that concrete.

### The relay's numbers, measured (`demo/perf-wire.mjs`, three runs)

| | measured |
|---|---|
| the Durable Object hop, over the runtime's `ping`/`pong` | **+0.8 to +1.6 ms at p50** |
| a full 16-socket room, at the sender's own echo | **+8 ms at p50, 900/900 delivered** |
| 256 KiB message against 1 KiB | 125 ms against 47 ms p50 |
| the rate cap | **298 delivered in 3 s at BOTH 120 and 300 msg/s** |

That last one is the token bucket read back off the wire — `MSG_BURST` 120 plus
3 s at 60/s — and the sender is told nothing when it bites. Only a
per-connection counter in the payload sees it. Not measured: where a single DO
bends. The run reached 300 sends/s, 2% of what the caps permit.

## One line (session 12, kept for context)

Live on **positron.studio**. Session 12 made `demo/shell/pattern.mjs` the ONE
generated test picture — six demos and both ffmpeg publishers draw it — and
found, on the way, that it had been imported by a single caller that cannot
connect, while four demos each drew their own. **A shared module nobody can see
is a claim, not a unification** (LESSONS #30). The same look also found three
dead paths the slug rename left behind, including one that had `moq` and
`ladder` asserting NOTHING for weeks and one pointing the IPHONE harness at a
404. `take` is new: a local video timeline where a take is drawn as it records.
**332/344 green**, and `workers/pub` is NOT deployed — see the warning below.

Session 11 before it was a **UI/UX review of the demos, one at a time**, and it
found that a reader's every "I don't understand this" named a real defect rather than a wording preference. `01 transport` was
**printing a fabricated `0` for the one number it exists to report** — and its
assert passed on the empty array that caused it. The stop-at-end lived in the
render loop, so a hidden tab let a 20 s deck reach **91,001 ms** while still
reporting `playing: true`. The transport bar **overflowed a 390 px phone by
94 px and clipped two rate buttons off the edge**. And the page carried two
horizontal time axes that disagreed, one of which — the strip — had always been
the better scrubber. `01`, `02` and `03` are fixed and are the worked
examples; the other 21 have not had the pass. **Before reviewing any of them,
grep the fabricated-zero class**: `dr?.p50 ?? dr?.ms ?? 0` printed a confident 0
on two separate pages while their asserts passed, because both only checked
non-null. Three instances of one shape; `grep -rn '?? 0' demo/` is fifteen
seconds. **127/127 green** across the eight strip demos,
per-demo counts unchanged.

**Three lanes now measure themselves on one page**: bg worker +1.50 ms typical,
sound card **+0.01 ms** (an AudioWorklet timestamping the output sample — 1–2
samples at 48 kHz, reproducing the lab's Arm E independently), midi in +0.40 ms
over the IAC loopback. `midi out` is the only one with no feedback path at all;
its error is bounded by the round trip, not observed.

New: `demo/shell/hardware.mjs` (one gesture buys sound + MIDI out, capability
reported rather than error), `createMidiLane` in `timeline/transport.mjs` — which spent its first
run scheduling every note **fifty-six years into the future**, because
`MIDIOutput.send()` speaks `performance.now()` and the transport's clock is
epoch ms. Its own counter went up regardless: **it counts what we QUEUED, not
what the port accepted.** Fixed, and then MEASURED through the IAC loopback: **p50 0.4 / p95 0.6 /
max 3.7 ms, n=31** — send to our own JS handler, an upper bound that includes
the event loop, never send to a synth on a cable. `e.timeStamp` is useless for
this (exactly 0.000 five times out of five: CoreMIDI passes the send stamp
through). `verify.mjs` still cannot reach any of it, since headless Chrome
needs `Browser.grantPermissions` for midi to enumerate a port at all, and
`d.how()` in the shell. `CLAUDE.md`'s writing conventions were rewritten: the
old "no explanatory prose" rule is what produced pages only their author could
read.


### Session 10, for context

Live on **positron.studio**, **24 of 28 demos built, 332/332 green** when
session 10 closed. That session finished the demo spine — `25 show` (recorded
off the received stream), `26 shout` (Icecast through a Worker, −0.8 ms of
carry), `27 tracks` (audio-only LL-HLS is smaller, not faster) and `28 vclick`
(a Csound score compiled into something you can seek into) — simplified
`11 grid` to one tier, and found that **291 asserts had been green across three
pages that never once played a frame of HLS in Chrome**, because they gated on
`canPlayType`. Session 9 before it found why iOS stuttered: our own drift-seek,
then a stale check that had silently stopped preferring native HLS since iOS
17.1 added ManagedMediaSource.

**A re-run on 2026-09-07 read 301/313** — no UDP egress in that shell, so every
WebRTC/QUIC leg failed. See the re-verification note below before quoting 332.

### 2026-09-07/08 — `take`, ONE test pattern, and three dead paths

Full detail in PROGRESS.md session 12. What a fresh session needs:

**`take` is a local video timeline.** Record lives in the transport bar
(`createTransportBar` grew `extras`, defaulting to empty; no other demo passes
one). Takes lie end to end, so exactly one part is ever under the playhead —
which is why `media-master` L1 holds unchanged: **the part being played IS the
master.** Every frame burns its POSITION ON THE LINE, so a scrub checks itself
with no arithmetic. A take is drawn while it records, part and events both.

**`demo/shell/pattern.mjs` is now the ONE test pattern**, for the browser canvas
and for ffmpeg. `take`, `record`, `capture`, `show`, `moq` and `ladder` all draw
it; `src/publish.sh` GENERATES its filter by calling the module. The container
carries a marked copy because its image is one `COPY server.mjs .` with nothing
to import — **if you change one, change the other**, and the y/size/colour table
is worth diffing after any edit.

Rules the picture now obeys, each of which cost a round:

- **The field is never tinted.** A warm hue at low saturation and low lightness
  is mud, at any alpha. Colour lives in the labels, the square and the strip
  lane. `FIELD` is one constant.
- **One `PAD = 60`** off every edge; the row's `Y` is DERIVED from it, not typed.
- **Layout is numbers, square, row** — the reader's half above the machine's.
- **`hueFor`/`videoHue` stay in a 100° band on `--hi`** (hue 50). Index 0 is the
  key colour.
- **The sweep square crosses once per 10 s OF THE BURNED CLOCK**, so two
  pictures of the same instant put it in the same place — a delay you can see
  without reading anything.
- **`drawCamera()` contains, never covers or stretches.** iOS ignores a 640x360
  request and hands back PORTRAIT; cover showed 32% of it.

**After ANY move of `ROW`, re-run burn → readBurned.** It has been 600/600 exact
after each of three moves, and that is the only thing standing between a layout
tweak and a silently unreadable stream.

**Three dead paths from the slug rename**, none of which a test caught:

- `demo/shell/moq.mjs` imported `/08-moq/moq-vendor.js`. The 404 killed the
  module, so **`moq` and `ladder` asserted NOTHING** for the life of the rename.
  The harness had been printing `FAIL __demo.ready` / `0/1 green` — one line,
  perfectly clear — and it was read as "relay/WebRTC in headless", which is
  independently true of both pages. LESSONS #29; the tell is the DENOMINATOR,
  `0/1` versus `13/17`.
- `verify-native.mjs` and `verify-safari.mjs` both fetched `/06-llhls/`, a 404.
  **That is the iPhone code path**, which `verify.mjs` cannot reach.

`build.mjs` refuses an import with no deployed file but **read HTML only**, so
the dead one — inside a module — was never checked. It now scans `.mjs`/`.js`,
proved by restoring the bad path and watching the build refuse.

**Harness.** `.tbar-x` joins the control selector. The assert stabiliser waits
while the count is still ZERO (it exited as soon as the count stopped changing,
and zero never changes) — capped at 30 s, NOT `settleMs`, or a page whose live
leg is down burns `tracks`' 125 s cold-container budget twice. The strip ink
sample now lands after a frame, up to three tries, because it raced a canvas
resize about one run in ten.

**351/351 green — every demo, no failures, on 2026-09-08.** This is the first
clean full run since session 10, and it settles the open question below: the
12 failures seen earlier in the session WERE the shell's missing UDP egress, and
with it back `webrtc`, `moq` and `show` all connect. `moq` in particular read
**600 clean rows, 0 unreadable** THROUGH the Cloudflare relay — the burned clock
surviving encode → QUIC → decode with the row in its new position, which is a
stronger check on that geometry than any local round-trip.

The denominator moved 313 → 344 → 351: `moq` runs at all now (it had been dead
behind a 404), `take` and `room` gained asserts, and `ladder` was removed.

### ⚠ `workers/pub` is NOT deployed

Three rounds of pattern changes — typography, hue, and the row's move to the
bottom — need a **container image rebuild** before they reach the live streaming
demos. Until then the live legs draw the OLD picture, so "one spec, two
renderings" is true in the repo and false on the wire. Anything comparing a
browser frame against a container frame will be comparing two different
pictures; do this before trusting such a comparison.

## 2026-09-04 — renamed to `positron`, moved to `positron.studio`

Working dir `~/personal/elektron` → `~/personal/positron`. The domain is on
Cloudflare Registrar (zone `1ead979d8f29aaecbd02d701fb557f8e`, created
2026-09-04). **Eight deployed Workers now answer on the domain**, via Workers
custom domains attached with `wrangler triggers deploy` (routes only — no code
re-upload):

| hostname | worker script |
|---|---|
| `positron.studio`, `www.positron.studio` | `elektron-view` |
| `rtc.positron.studio` | `elektron-rtc` |
| `ws.positron.studio` | `positron-ws` (tokenless relay; superseded `elektron-jam`, retired 2026-09-04) |
| `cues.positron.studio` | `elektron-cues` |
| `instrument.positron.studio` | `elektron-instrument` |
| `selfrec.positron.studio` | `elektron-selfrec` |
| `osc.positron.studio` | `elektron-osc` |
| `moq.positron.studio` | `elektron-moq-safari` |
| `archive.positron.studio` | R2 bucket `elektron-archive-test` |

**`workers_dev: true` is set on every one on purpose** — the `*.workers.dev`
hostnames still serve, so the move is additive and no pre-move link died. The
`pub-b8d50fdb….r2.dev` archive URL likewise still works.

### Why the Worker SCRIPT names are still `elektron-*`

Renaming a Worker script does not rename anything — it creates a **new** Worker
at a new hostname and **abandons the Durable Objects** of the old one
(`RtcRoom`, `JamRoom`, `Hub`, `Sessions`, `BeaconStore`, `Gate` — the last
holds the durable ERR cache). A custom domain decouples public identity from
script name, so the names stay and cost nothing: nobody types them. Same for
the R2 bucket — **R2 buckets cannot be renamed at all**, and its objects and
public URL are bucket-bound.

Three rig Workers turned out to have **zero deployments** (`obs-cloud/obs-worker`,
`obs-cloud/quic-test`, `rig/containers`), so those script names *were* free to
change and are now `positron-obscloud`, `positron-obscloud-quic`,
`positron-cnt-test`. They remain undeployed; no custom domain was attached.

### Deliberately NOT renamed

`elektronstudio` (v3/v4/ws/lab/archive), `elektron-nuxt`, `elektron.art`,
`data.elektron.art` — these name the **real predecessor project**, which exists
under that name and is not on this Cloudflare account. Rewriting them would make
the prior-art notes false, so they stand as citations, including the Estonian
genitive `elektron.arti` in quoted sources.
`research/elektron-participation-2026-08.md` keeps its filename for the same
reason: it is named for its subject, not for this repo.

### Two consequences worth remembering

- **The Cache API is no longer a no-op.** `caches.default` does nothing on
  `*.workers.dev`; on a custom domain it is a real edge cache. `workers/view`
  still does not use it (the durable cache spans colos, which `caches.default`
  does not) — but that is now a choice, not a constraint.
- **A fresh `.studio` name can be negatively cached for an hour.** The `.studio`
  SOA minimum TTL is 3600 s, so any resolver that was asked for
  `positron.studio` before registration will answer `NXDOMAIN` for up to an hour
  afterwards. Cloudflare, Google, Quad9 and OpenDNS all resolved it within
  minutes; a home router that had cached the miss did not. Not a misconfiguration.

## Where things stand (session 10)

> **Numbering note, 2026-09-07.** `28 vclick` is now **`05 vclick`** and the old
> `05 strip` is now **`28 strip`**. The session-10 narrative below and the
> entries in `PROGRESS.md` and `SUMMARY.md` keep the numbers they were written
> with, because renumbering a record of what happened makes the record false —
> the same reason `elektronstudio` and `elektron.art` were left alone in the
> move to positron.

**332/332 green when the session closed; 24 of 28 built.** `20`–`22` are archive
pages that work and are linked but not re-shelled, `23 studio` is assembly.

Session 10 finished the demo spine: four new demos, one demo simplified out of a
branch, and one bug class removed that had been hiding a dead code path behind
green asserts.

| demo | what it settles |
|---|---|
| `11 grid` | one tier, no featured tile — the client tier was never the cost the SFU leg is (paint at 54 uniform tiles 0.27 ms, but synthetic) |
| `25 show` | live over WebRTC, recorded off the **received** stream, replayed on a deck — what you archive can be the bytes off the wire |
| `26 shout` | an Icecast stream through a Cloudflare Worker: **−0.8 ms of carry**, 600 s on one response |
| `27 tracks` | audio-only LL-HLS is **smaller, not faster** (3.88 s vs video-only 3.82 s); WHEP refuses a single-track offer outright |
| `28 vclick` | a Csound score compiled to a timeline you can seek into, with the tempo-map integral drawn against the mean-tempo line it corrects |

**`19 flipper` cost the most and taught the most.** Two unrelated bugs stacked:
ERR blocks its own segments **by programme, not by age** (403 with no ACAO,
which reaches a browser as a CORS failure), and three demos — `14 replay`,
`15 seek`, `19 flipper` — had gated native HLS on `canPlayType`, which answers
`"maybe"` in Chrome too. So **291 asserts were green across three pages that
had never once played a frame of HLS in Chrome.** All three now gate on
`ManagedMediaSource`. Grep for `canPlayType` before trusting any HLS page.

### Deployed, current

| worker | hostname | what |
|---|---|---|
| `elektron-view` | `positron.studio` | the index, the demos, the archive pages |
| `positron-ws` | `ws.positron.studio` | tokenless verbatim relay |
| **`positron-backlog`** | **`backlog.positron.studio`** | **the history the relay refuses to keep (session 14) — a recorder joins the room as a socket; SQLite in the DO, NDJSON over plain HTTP** |
| `positron-pub` | `pub.positron.studio` | publisher container + device log sink (`/logs?format=text`) |
| `positron-ingest` | `ingest.positron.studio` | the one tokenless WRITE path to R2, capped |
| **`positron-shout`** | **`shout.positron.studio`** | **the Icecast relay — its own worker because it holds one connection open for a whole listen** |
| `elektron-selfrec` | `selfrec.positron.studio` | token-gated R2 recorder (Bearer SELFREC_TOKEN) |
| R2 `elektron-archive-test` | `archive.positron.studio` | shows, plus `demo/ingest/<session>/` |

### Three harnesses, because one cannot see everything

```sh
node demo/verify.mjs          # every built demo, CDP/Chrome — 332 asserts
node demo/verify-native.mjs   # the IPHONE code path; verify.mjs CANNOT reach it
node demo/verify-safari.mjs   # desktop Safari over WebDriver, both engines
```

`verify.mjs` starts its OWN server on :8890 — do not start `demo/server.mjs`
beside it or the run dies on `EADDRINUSE`.

**A green suite can still mean zero coverage**, and session 10 produced the
second instance: 261/261 while 06 was fatally broken on iPhone (session 9), then
291/291 across three pages that never played HLS (session 10). Both times the
asserts were about the wrong thing, not absent.

### The numbers worth remembering

| path | glass-to-glass | how |
|---|---|---|
| MoQ | **p50 26.2 / p95 42.4 ms** | browser→CF→browser, burned pixels |
| WHEP | **p50 67.0 / p95 76.9 / p99 84.1 ms** | same method, n=17,501 |
| LL-HLS | ~3.3 s | the compatibility tier |
| LL-HLS audio-only | 3.88 s at 418 kbps | *same latency* as video-only (3.82 s at 11.8 Mbps) |
| Icecast through the edge | **−0.8 ms of carry** | 16 KiB needle found in both streams, 60 s |

MoQ is ~1.6–1.9x faster than WHEP at the median once you add the vsync its
measurement omits — NOT 3x — and WHEP wins p99. "WHEP rtt 25 ms" is NOT
comparable to either; it is candidate-pair RTT, not media latency.

### Re-verified 2026-09-07 — 301/313 from a shell with no UDP

The suite re-run while writing these notes read **301/313, 12 FAILED**. The gap
is the environment: **UDP egress was blocked** (a DNS query to `1.1.1.1:53` got
no reply in 4 s while TCP to `positron.studio` answered 200 in 97 ms), so every
transport that needs it failed — `07 webrtc` (5), `08 moq` (2,
`QUIC_NETWORK_IDLE_TIMEOUT`), `09 ladder`'s WHEP rung (2), and `25 show`'s
loopback `RTCPeerConnection` (2, stuck at `connecting/connecting`). One failure
is NOT explained by it: `17 instrument`'s `relay open — 0`, which is a
WebSocket.

Every other demo was green at its committed count, including all four new ones.
And note **313, not 332**: a page that loses a leg stops before the asserts
behind it, so `25 show` ran 8 of its 15. A falling total is a symptom to read,
not a number to update. **332/332 is unconfirmed until the suite runs somewhere
with UDP egress.**

## Where things stand (session 9 — superseded above)

**332/332 green.** 24 of 28 built; `20`–`22` are archive pages that work and are
linked but not re-shelled, `23 studio` is assembly.

| worker | hostname | what |
|---|---|---|
| `elektron-view` | `positron.studio` | the index, the demos, the archive pages |
| `positron-ws` | `ws.positron.studio` | tokenless verbatim relay |
| `positron-pub` | `pub.positron.studio` | publisher container + device log sink (`/logs?format=text`) |
| **`positron-ingest`** | **`ingest.positron.studio`** | **the one tokenless WRITE path to R2, capped** |
| `elektron-selfrec` | `selfrec.positron.studio` | token-gated R2 recorder (Bearer SELFREC_TOKEN) |
| R2 `elektron-archive-test` | `archive.positron.studio` | shows, plus `demo/ingest/<session>/` |

### Three harnesses, because one cannot see everything

```sh
node demo/verify.mjs          # every built demo, CDP/Chrome — 332 asserts
node demo/verify-native.mjs   # the IPHONE code path; verify.mjs CANNOT reach it
node demo/verify-safari.mjs   # desktop Safari over WebDriver, both engines
```

`verify.mjs` reported 261/261 while 06 was fatally broken on iPhone, because
desktop Chrome never enters that branch. Run all three after touching
`src/low-latency-player.js`.

### The numbers worth remembering

| path | glass-to-glass | how |
|---|---|---|
| MoQ | **p50 26.2 / p95 42.4 ms** | browser→CF→browser, burned pixels |
| WHEP | **p50 67.0 / p95 76.9 / p99 84.1 ms** | same method, n=17,501, re-measured 09-05 |
| LL-HLS | ~3.3 s | the compatibility tier |

MoQ is ~1.6–1.9x faster at the median once you add the vsync its measurement
omits — NOT 3x. WHEP wins p99 (84 vs 105 ms): the jitter buffer costs the median
and buys the tail. "WHEP rtt 25 ms" is NOT comparable to these; it is
candidate-pair RTT, not media latency.

### Open, with a named next step

- **iOS is UNCONFIRMED since the native switch.** "Seems to work" was reported on
  v12; then a TDZ of mine broke the page entirely, and v13/v14 added native
  recovery plus three native-path fixes. No phone has been tested since. Open
  `positron.studio/llhls/` and read the first log line for the build id.
- **The archival cron.** Copying Stream recordings to R2 is PROVEN (105.8 MB MP4,
  byte-exact, publicly served). The worker needs a Stream-scoped token; `.env`
  holds the known-exposed legacy one — mint a fresh token rather than deploying
  it. Without the cron, storage climbs ~225 min/day under testing toward a hard
  1000-minute cap that breaks playback.
- **Recording mode cannot be turned off.** It also disables HLS playback of a
  live input, and `preferLowLatency` requires `automatic`. 06 and 09 depend on
  it. Deletion is the only lever; `deleteRecordingAfterDays` minimum is 30.
- **MoQ is Chromium/Firefox only.** Safari has WebTransport since 26.4 but
  WebKit 319818 deadlocks the session; measured 7–8 frames per 150 s, and a
  reconnect does not clear it. Safari and iOS get WHEP.
- **`.env` still holds the exposed legacy `CF_API_TOKEN`** (Stream/Calls only).

## Where things stand (session 8 — superseded above)

**Live.** `positron.studio` is the demo index, generated from
`demo/manifest.mjs`. Demos are at `/<nn>-<name>/`, notes at `/notes/`.

| worker | hostname | what |
|---|---|---|
| `elektron-view` | `positron.studio`, `www` | the index, the demos, the archive pages |
| `positron-ws` | `ws.positron.studio` | tokenless verbatim relay (superseded `elektron-jam`, retired) |
| `positron-pub` | `pub.positron.studio` | ffmpeg publisher container, alive only while `/watch` is held |
| `elektron-rtc` etc. | `rtc|cues|instrument|selfrec|osc|moq.positron.studio` | unchanged; script names stay for their DO state |
| R2 `elektron-archive-test` | `archive.positron.studio` | the show archive |

**Built (24):** `01`–`05` (Act 0, no network) · `06` llhls · `07` webrtc ·
`08` moq · `09` ladder · `10` room · `11` grid · `12` cues · `13` record ·
`14` replay · `15` seek · `16` looper · `17` instrument · `18` jam ·
`19` flipper · `24` capture · `25` show · `26` shout · `27` tracks · `28` vclick.

**Not built (4):**
- `20 kurenniemi`, `21 megatimeline`, `22 remixer` — the pages WORK and are
  linked from the index; they are not re-shelled. `21` is the big one at 1220
  lines. They get an appended back link in the deployed copy only.
- `23 studio` — now assembly rather than engineering: every panel it consumes
  (`10`–`14`) exists and is verified.

**Open, with a named next step:**
- **LL-HLS jank — mechanism found, fixed, NOT yet confirmed on a real iPhone.**
  The publisher was ruled out by A/B first: container and local Mac publishing
  the identical command both gave inter-arrival jitter **0.40** and EXTINF
  **sd 0.003 s** (2.000–2.021). Starvation wobbles declared durations; these
  don't. Then the manifest gave the cause: Cloudflare advertises
  `PART-HOLD-BACK=1.5` with `PART-TARGET=0.5`, but only **one part per segment**
  carries `INDEPENDENT=YES` (10 of 38) because our GOP is 2.0 s. The player can
  APPEND every 0.5 s but can only START DECODING every 2.0 s, so a 1.5 s target
  is unreachable — it overshoots to ~2.78 s, nudges at `catchUpRate`, crosses
  `seekThreshold: 2.0`, resyncs, repeats. Fix: `liveSyncSeconds: 3.0` (1.5 GOPs)
  passed as hls.js `liveSyncDuration` **at construction** — its `targetLatency`
  getter only honours the override from `hls.userConfig`. Measured after, on the
  deploy: latency **3.33 s** against target **4.0** (hls.js adds
  `liveSyncOnStallIncrease` per internal stall, capped at one targetduration),
  rate **1.0**, **0 resyncs**, 1 level switch. Cost: ~0.5 s more latency.
  **Still to do:** open `/llhls/` on the iPhone and read `switches`. The
  arithmetic is device-independent, but the jank was reported on iOS and only
  that device can confirm it. iPhone does take the hls.js path — bundled hls.js
  is 1.7.1 and its `getMediaSource` returns `ManagedMediaSource` when
  `MediaSource` is absent, which is iOS 17.1+ Safari.
- **ABR churn is the remaining unmeasured suspect.** The stream carries four
  renditions (720/480/360/240) with tightly clustered BANDWIDTH, and a switch at
  the live edge cannot present a frame until the next INDEPENDENT part — once
  per 2.0 s. `06` now reports `switches` so the phone can answer it. Deliberately
  NOT tuned on a hunch; `capLevelToPlayerSize` was rejected because it would pin
  a phone to 240p.
- **Cloudflare emits non-monotonic PDT at startup** — measured `56.935` →
  `56.604`, 331 ms backwards. Inert here (`pdtDriftTrigger` is off by default);
  recorded because anything that starts trusting PDT will trip on it.
- **The Cache API.** `caches.default` is no longer a no-op now that we are off
  workers.dev. Highest value in front of the single serialized `Gate` DO.
- **Fixed 2026-09-04: the publisher leaked the stream key.**
  `container/server.mjs` said the key is "never logged" and its stderr handler
  even said "the key must never be echoed" — but both only TRUNCATED a tail,
  and `/status` serves that tail publicly. ffmpeg echoes the full RTMPS URL on
  any output error, so a failed encode published the key. Now redacted at the
  point of capture (accumulate-then-redact, so a secret split across two
  stderr chunks is still caught) and again on read, with a URL-shape fallback
  for secrets that were never registered. The local A/B run is what exposed it.
- **`.env` still holds the exposed legacy `CF_API_TOKEN`** (Stream/Calls/
  Realtime only — it cannot do Workers/DNS/R2 work). Use machine OAuth from a
  dir without `.env`. Re-confirmed unrotated 2026-09-04. `JAM_TOKEN` is now
  moot; delete it.
- **`vain.md.later`** — the Väin philosophy note, unlinked for now.

## Read LESSONS.md first

Written at the end of session 9. Method lessons that each cost real time —
measure the quantity in question rather than an adjacent one; a green suite can
mean zero coverage; attribute a run to a build before iterating on it — plus
platform facts (iOS 17.1 ManagedMediaSource silently disabling native-HLS
fallbacks, `video.buffered` being the INTERSECTION of source buffers, `-re`
being per-input, MoQ relays being impossible in a Container).

The blunt version: our own recovery layer caused more of the iOS stutter than
hls.js did.

**It no longer stops at session 9.** The file now runs #1–13 (method, session
9), #14–32 (session 11's reader review), #33–38 (session 13's live line) and
**#39–42 (session 14)**: a counter that cannot be wrong is not a check ·
`map(fn)` passes the INDEX, and a defaulted second parameter takes it · hide a
control the harness needs rather than removing it · a control's blast radius
must not exceed its label.

**Session 10 is still the gap.** Its method lessons went into `CLAUDE.md`'s
rules (the 400 ms settle window, the NUL-byte grep, the cross-engine cache,
never letting sound gate the work) and into `PROGRESS.md`'s session-10 entry.
Fold them back here when `LESSONS.md` is next revised.

## How to run and check things

```sh
node demo/server.mjs                       # :8890, serves the repo; / == deployed
node demo/verify.mjs                       # every built demo, locally
node demo/verify-native.mjs                # the iPhone code path — verify.mjs CANNOT reach it
DEMO_BASE=https://positron.studio node demo/verify.mjs   # against the deploy
cd workers/view && node build.mjs && npx wrangler deploy  # ALWAYS build first
```

Wrangler traps that cost time: `.env` in the cwd shadows machine OAuth, so run
from a dir without one (`proto/archive`) or `env -u CF_API_TOKEN
-u CLOUDFLARE_API_TOKEN`. And `build.mjs` now REFUSES duplicate destinations —
stripping the `demo/` prefix let two sources collide on `index.html`.

## Nothing is in flight. Everything below is committed and green.

*(Working tree clean at the end of session 12. The one thing NOT shipped is
`workers/pub`'s container image — see the warning above.)*

## What exists

**`timeline/`** — `transport.mjs` v0.7 (vector + lookahead, worker tick default,
sample-accurate audio lane, adapter registry with caps the library READS,
**evidence firewall on BOTH sides — read and fire**, `deck.assertState`,
provenance, `when` uncertainty, `caps.series`, two-phase seek) · `nested.mjs`
(nested decks, fragment quotation, loops, carry asserted at the playhead) ·
`score.mjs` (a quotation is a VALUE; scores round-trip byte-identically) ·
`strip.mjs` (**ambiguation, `when.kind` edges, a correct aoristic aggregate,
deep time to 10 Gyr with a measured ceiling**) · `store.mjs` (1M rows in 3.8 MB)
· `render.mjs` (**renders a NEST** — fragment, loop, two levels; 60–86k× real
time flat, 1.9× that for a nest) · `media-master.mjs` · `osc.mjs` ·
`keepalive.mjs` · **`csound.mjs`** (a Csound score compiles to rows: `t`
statements become a beat↔ms map that is the INTEGRAL of `60/tempo`, not the
mean; `m`/`n` become quotation values that round-trip through `score.mjs`
byte-identically; `reduceAt` exact at 57 probes and both sides of all 16 notes)
· `lab/` (prop-test, prop-nested, prop-store, prop-render, firewall,
strip-verify, **csound-test 22/22** — all green).

**`proto/looper/`** — the instrument. `node proto/looper/server.mjs`, then
`http://127.0.0.1:8891/proto/looper/`. Space = pedal, letter keys = piano.
Add `?room=NAME` in two windows and it is a shared loop. 39 + 17 + 12 + 12
asserts.

**`studio/`** — `node studio/engine.mjs` + one URL runs a complete show with
GO LIVE · SHOW · ROOM · SOUND · ARCHIVE. verify 24/24.

**Deployed**: `elektron-view` (the index, the demos, four archive viewers,
public) · `elektron-rtc` · `elektron-selfrec` · `positron-ws` ·
`positron-pub` · `positron-ingest` · **`positron-shout`** (new in session 10)
· `elektron-instrument` · `elektron-osc`.
**Public link**: https://positron.studio

## The numbers worth remembering

- Cue sync **16 ms p50** (the old 59 was ONE LOCKED PHASE SAMPLE — real old
  margin ~11 %, presented as 60 %).
- Remote instrument **35.8 ms** key→ear over MoQ vs 77.7 ms over WebRTC.
- Loop wraps are the **most** precise instant in a loop (0.10 ms vs 4.50 ms),
  0.000 ms/wrap over 600 wraps — **and the offline renderer reproduced the
  inversion independently.**
- MoQ **group-per-bundle = 100 % OSC integrity**; message-per-group = 0 %.
- **`caps.audio` does nothing without a lead**: 1/36 notes reach the sample grid
  at `leadMs: 0`, 27/27 at 30 — sd 4.38 → 0.38 ms for a constant offset a loop
  cannot hear.
- **A remote loop is latency-indifferent**: identical loops over links from
  1.1 ms to 4700.8 ms; the cost is paid in PASSES. Clock skew, not latency, is
  the hard problem — uncorrected, the flam is *exactly* the skew.
- **The studio anchor was never a constant**: a ~95 ms-wide frame-quantised
  distribution. Fixed to p95 19–26 ms (was 39).

## ⚠ A correction that reaches backwards

**Every content-anchor number this project has printed carries ~one frame of
bias**, including the archive rig's −15 ms. `replay.html`'s `decodeNow()` reads
the frame on the glass while `meta.mediaTime` is the PTS of the frame about to
be shown — the `rVFC` pair-vs-single trap already documented in §7.6. The
one-line fix and the "re-measure everything in the same breath" caveat are in
`studio/NOTES.md`. Do not quote an old content-anchor number as exact.

## Next, in order

0sec. ⚠️ **Rotate `positron-demo`'s RTMPS stream key — it reached a session
   transcript on 2026-09-10** via a bare `GetStreamServiceSettings`, which
   returns the key in clear. Every purpose-built script here redacts; the ad-hoc
   call did not. Same lesson `src/publish.sh` already paid for: **redaction has
   to live at the point of capture**, because any convenience call around it
   prints the raw object. `rig/obs-pro/stream.mjs` carries a comment forbidding
   such a call. Add to `SECRETS-ROTATION.md`, which is now five items.

0aa. ~~**`csound.mjs`'s tempo map is SECTION-LOCAL in Csound and global in ours.**~~
   **DONE 2026-09-10.** Graded against real Csound 6.18 over ssh
   (`timeline/lab/csound-ssh.mjs` stands in for the binary). Six rules, each from
   a probe where the competing models are seconds apart — the decisive
   instrument was `csound --keep-sorted-score`, which prints per-section warp
   lines with no performance involved. **A section starts at the previous one's
   END TIME in seconds**, ends at the furthest of every note's p2+p3, every `f`'s
   p2 and the `s` argument, and resets to 60 bpm unless it declares its own `t`.
   Separately fixed: **a `t` whose first pair is not beat 0 is discarded whole**
   by Csound, where ours held it back to beat 0. `csound-test` 27 → **42/42**,
   oracle 10 → **23/23**, verify counts unchanged.
   **Three new KNOWN OPENs, labelled in the oracle rather than omitted** — the
   biggest being that **Csound's `n` is a SOURCE REWIND, not an in-place replay**:
   it re-reads statements from the mark and only fires at a section boundary.
   Matching it would mean giving up the quotation, which is why this compiler
   exists. That is a decision to take, and it is bigger than 0aa was.

0ac. **`workers/pub`'s container image is still stale, and the Pro now makes it
   easy.** It draws the pre-session-12 test pattern, so a browser frame and a
   container frame are two different pictures and any comparison between them is
   void. The Pro has `ffmpeg@7` with `drawtext`/libfreetype CONFIRMED, which is
   what `src/publish.sh` pins the version for. `positron-pub-pub` is the ONLY
   container on the account (verified 2026-09-10) — the three rig workers
   `positron-obscloud`, `positron-obscloud-quic` and `positron-cnt-test` do not
   exist on it at all, so there is no CF OBS container to tear down.

0ad. ~~**OBS on the Pro is ready and obs-moq is loaded.**~~ **DONE 2026-09-10 —
   see the session 16 section above.** All three transports run from one encoder
   off one source, `rig/obs-pro/stream.mjs hls|whip|moq`. What is NOT done is the
   comparison itself: **`moq.positron.studio` samples the pre-session-12 row**, so
   glass-to-glass is unmeasurable until that player is rebuilt. Rebuilding it is
   the next step, and it is the same job as 0ac.

0ab. **Ableton is drivable and measured** — AbletonOSC on Live 11 Standard,
   beat clock within 0.063% across four tempos. Two facts to build on:
   the transport does NOT advance with the audio engine off while `is_playing`
   still says true, and OSC is UDP so a reply can go missing. OSC arms and
   reads; never put it in the timing path.

0a. ~~**Finish the `t` → `type` sweep.**~~ **DONE 2026-09-10.** 47 literals across
   six files, **413/413, every per-demo count unchanged, no shim.** Two
   corrections to the plan's own estimate: `workers/instrument/src/index.js` had
   **zero** (it already said `type`, and `demo/instrument/` does not talk to it —
   it uses the tokenless relay), so the deploy-coupling hazard did not exist; and
   `proto/looper/remote-verify.mjs` was an unlisted reader that would have broken
   assert P3 silently. One `t` is left on the wire ON PURPOSE:
   `workers/pub/worker.mjs`'s `{t:'hello', viewers}`, which nothing reads.
   **Keep the negative control it produced**: a room swept on one side only goes
   completely dead and **still reports every assert passing**, because "nobody
   dropped out" is vacuous with no peers. `verify.mjs` is single-tab and
   structurally cannot see it.

0b. **Chase `keep`'s 409 — STILL OPEN, but there is now a named suspect.**
   Its two failures were filed under this shell's missing UDP egress and one of
   them does not fit: a 409 is HTTP. It did NOT reproduce on the 413/413 run and
   that is not a fix — a symptom that stopped is exactly the condition #29 was
   earned under.

   **The suspect, found 2026-09-10 while reading `demo/shell/live.mjs`.**
   `keep` calls `whipPublish()`, which POSTs to `pub.positron.studio/whip` and
   throws `publish ${res.status}` on any non-ok — so a 409 stops the page before
   a single assert, which matches "asserted 0" exactly. And **Cloudflare answers
   409 when a live input already has a publisher.** The pub container publishes
   the same burned pattern to the SAME `whep-rig` input whenever anything holds
   `/watch`, so two publishers on one input is an ordinary occurrence and would
   be intermittent in precisely this way. It also has nothing to do with UDP.

   **Not confirmed — this is a hypothesis with a cheap decisive test**: hold
   `/watch` to bring the container up, then run `keep`, and see whether the 409
   reproduces on demand. Costs nothing (WHIP records nothing), takes minutes.
   If it returns in the wild, capture the response body and request URL first.

0. **Measure min-RTT clock skew over a REAL LINK.** Twenty minutes, one phone on
   cellular, and it settles the last unmeasured number in the whole timing
   story — the one every multi-device claim rests on.

   Why it is now first rather than filed under the looper: the vClick work made
   clock agreement the load-bearing quantity. Compiling a score moves the
   network out of the TIMING path (each client derives its own position from the
   beat↔ms map instead of being told every beat), which is what lets a click
   track survive a blip. What it does NOT remove is the network — band members
   need clicks in their ears, together — so accuracy stops depending on network
   jitter and starts depending entirely on how well two devices agree what time
   it is. That agreement is now the thing the design leans on, and it has only
   ever been measured on loopback.

   **The estimator already exists and is measured**, in `proto/looper/peer.mjs`:
   NTP's, keeping the sample with the MINIMUM round trip and never an average
   (an average is dragged by every queued packet; the minimum is the one that
   got through cleanly). Both options were compared and the choice is not
   arbitrary — against a Worker `/time` endpoint it is **±50 ms and that is
   BIAS**, edge/worker path asymmetry rather than jitter, which at a 2 s loop is
   2.5 % of the circle and an audible constant flam. Peer to peer it is
   **±0.15 ms, drift 7 µs / 25 min**. Note that the ±50 was itself a revision:
   the plan's optimistic ±25 ms was corrected by measurement.

   **What to run.** Two devices that are not on one machine — the second on
   cellular, so the path is genuinely asymmetric — exchanging pings through the
   deployed relay, with `peer.mjs`'s own skew log drained at the end. Report the
   min RTT, the offset it settled on, and the spread across a run of several
   minutes.

   **What would falsify the design**: min-RTT being scale-free is the claim, and
   the supporting evidence is that a 311 ms link estimated as well as a 1.3 ms
   one — but that was still loopback-shaped. If a real link's offset spread is
   materially worse than ±0.15 ms, then peer-to-peer estimation alone does not
   carry a multi-device click track, and the plan needs a correction path rather
   than an assumption.

   **Do not apply a correction by jumping.** Already paid for: a late layer is
   GATED, never seeked, because seeking to the next downbeat moves the clock and
   desyncs by exactly the amount it moved. And the servo's dead band is not
   free — tightening it from 5 ms to 1 ms moved cross-peer p50 from −8.24 to
   −5.77 ms.

1. **`sched.running()` does not exist**, so "is this deck's scheduler actually
   ticking?" cannot be asserted — and that is not hypothetical. `03`'s child
   deck was created `autoStart: false`, which reads as "the nest drives it" and
   is true of the TRANSPORT while being false of the SCHEDULER. The recording's
   own marks therefore never fired at all, for the whole life of the demo, and
   nothing on screen could contradict it. It surfaced only when the marks were
   asked to log themselves and the log came back empty. A one-line library
   addition makes it guardable; the alternative (assert the child fired) has to
   wait for playback and would be written tolerantly, which is LESSONS #27.

2. **Play it. Run a show.** The oldest item here and still the sharpest:
   the demo spine is finished — 24 demos, an instrument, a five-panel studio —
   and **nothing has still ever been used by a human.** Everything measured is
   synthetic: canvas sources, injected keys, headless Chrome, burned clocks.
   Twenty minutes with a real camera, a real keyboard and one other person
   would teach more than any module.
3. **Confirm iOS on a real phone.** Unchanged since session 9 and now two
   sessions stale: the native-HLS switch has never been seen on the device it
   was written for. Open `positron.studio/llhls/` and read the `BUILD` on the
   first log line before believing anything about it.
4. ~~**Re-run the suite somewhere with UDP egress.**~~ **DONE 2026-09-08:
   351/351, every demo, no failures.** `webrtc`, `moq` and `show` all connect,
   and `instrument`'s `relay open — 0` — the one failure that was NOT explained
   by missing UDP — is green too, so it was the same cause after all.
5. **The archival cron** needs a fresh Stream-scoped token — `.env` holds the
   known-exposed legacy one, so mint rather than deploy it. Without the cron,
   storage climbs ~225 min/day under testing toward a hard 1000-minute cap that
   breaks recordings and therefore playback. Deletion is the only lever;
   `mode: off` also disables HLS playback and `deleteRecordingAfterDays`
   bottoms out at 30.
6. **Cap `26 shout` before its link goes anywhere public.** 128 kbps is
   ~57.6 MB per listener-hour, all billable and none of it cacheable (the origin
   sends `no-cache, no-store`). Nothing throttles or counts listeners today.
7. **Rotate the leaked secrets** (`SECRETS-ROTATION.md`) — four items, open
   since session 1.
8. **The four unbuilt demos.** `20 kurenniemi`, `21 megatimeline`, `22 remixer`
   work and are linked but are not re-shelled (`21` is 1220 lines); `23 studio`
   is assembly now rather than engineering — every panel it consumes exists and
   is verified.
9. **The unexplained cross-peer tail** — two tabs playing one loop agree at
   p50 −5.77 / p95 −1.52 ms but the max is 28.39 ms. Part is the servo's dead
   band (a per-peer position error, invisible solo, a flam when shared:
   5 → 1 ms moved p50 from −8.24 to −5.77). The rest is not explained.
10. **Re-measure the content anchors** together, after the `replay.html` fix.
11. **`createAudioLane` does not consult the evidence gate** — a derived lane
   routed through it would still sound. Also wanted:
   `createAudioLane(…, {onStateChange: 'cancel' | 'keep'})` so a child lane can
   render a loop directly instead of by expansion (default must stay `cancel`).
12. **Remote P2/P3** (`plan-looper.md`) — over the deployed `elektron-jam` DO,
   then over real distance. P2's point is that the loop plane should be
   INDISTINGUISHABLE from P1; if it is not, the claim is wrong, which is the
   most valuable possible outcome. P3 needs the real-link skew number,
   which is item 0 above.
12. Still owed by §−1: `when` on spans, competing authorities (the deferral most
   likely to be regretted), non-contiguous brackets, the trapezoid interior.

## Yours alone

Rotate the leaked secrets (`SECRETS-ROTATION.md`) · `positron.studio` is
drop-caught and for sale via Afternic (expiry 2027-02-08) · an iPhone capture
probe · the macOS **IAC MIDI toggle** — the looper's Web MIDI path is wired and
has never seen a device, so M1's stamp numbers are the *keyboard* path · ask ERR
about the **Finna CDN edge rule** (not policy — it blocks three Kurenniemi
sources) · and the ERR licence conversation, which gates anything public.

## Traps that cost hours (do not re-derive)

**Platform.** A DO runs OLD class code for ~1 min after deploy — a smoke test
straight after `wrangler deploy` LIES · CORS allow-headers must carry
`X-Chunk-Sha256` · CDP `packetLoss` is a no-op in Chrome 151 (use netem) ·
`--use-fake-ui-for-media-devices` is insufficient under `headless=new` (needs
`Browser.grantPermissions`) · **`Page.startScreencast` frame 0 is a stale
re-capture stamped `now`** (20–36 ms old; frames 1+ are 6–9 ms) · `-bf 0` for
repackaged MediaRecorder streams · one MoQ group = one QUIC uni-stream ·
Docker-esbuild is GONE (`cd proto/jam/moq && npm run build`).

**Audio.** Chrome hands an AudioWorklet an EMPTY input array when it latches a
bus silent (fix: a started `ConstantSourceNode(0)`) · **iOS refuses to autoplay
an UNMUTED video** · **`caps.audio` is inert without `leadMs`** — a late fire
has no future instant to schedule and silently falls back to `currentTime` ·
Web Audio is `[Exposed=Window]`, so offline audio cannot leave a document's main
thread.

**The library.** Backstop ordering is correctness (once anything parks,
everything parks) · **`nest.add()` on an already-playing parent silently never
enters** — it pauses the deck and relies on an `enter` event already in the
past; fix with `parent.seek(parent.position()); nest.servo()` · a boundary must
be a COMMITTED one-shot, never polled — this has now bitten three times, at the
wrap, at the offline wrap, and at a remote layer's gate · **a late layer is
GATED, never seeked** (seeking to the next downbeat moves the clock and desyncs
by the amount it moved) · `loopPhase(x, L)` answers `off: 0` for negative `x`,
which stacks a pre-roll into a chord · `new Date(-4.35e20).toISOString()`
**throws** — deep time must never reach `Date`.

**Measuring.** A codec is not testable against itself · **a virtual clock runs
BACKWARDS without complaint** if you `advanceTo` a stale instant (the artefact
looks exactly like a scheduler defect) · **`advanceTo` is not a tab blur** — it
runs every intervening tick, so a real freeze must suppress ticks AND timers ·
comparing two peers' own timestamps CANCELS the skew under test · use
FRACTIONAL offsets in every cadence · **determinism is not correctness** (a
polled render is byte-identical to itself and still wrong) · a stub context is
blind to a whole class of audio bug (7/7 stub vs 1/7 real) · **a missing
measurement must print as ABSENT, never as zero** — the first `getStats` after
an answer has no `inbound-rtp`, which read as a very impressive 0 ms jitter
buffer · one sample of a number that moves is not that number (`hls.latency`
read once at the end; now medians the second half of the window) · **TTFB
cannot answer "what does this hop cost"** when the origin bursts (Icecast hands
every new listener ~64 KiB, so the later connection can hold more audio — find
the same byte in both streams instead).

**Session 10's additions.** **`verify.mjs` stops collecting 400 ms after the
LAST assert** — slow work goes behind control 0, the only control with
`settleMs`, or a working page reads as "asserted nothing" · `verify.mjs` starts
its OWN server, so starting `demo/server.mjs` beside it dies on `EADDRINUSE` ·
**an engine switch poisons the harness's HTTP cache** (a `video.src` load stores
an opaque entry that hls.js's XHR for the same URL is then served and rejects —
the profile Cache is now cleared every run) · **`grep` prints NOTHING, not
"binary file matches", for a file holding a NUL byte** — suspect the file before
the symbol · **an id comparison that cannot distinguish is not a test** (a
remote `MediaStream` carries the SENDER's msid; use object identity against
`pc.getReceivers()[i].track`) · **never let sound gate the work** —
`audio.play()` and `AudioContext.resume()` neither resolve nor reject without a
gesture, and headless resolves both, so the page reads green while being dead ·
a hard-coded row count against a generated list goes stale (`rows === 23` against
26 entries) · **`.env` in the cwd shadows machine OAuth and `env -u` cannot fix
it**, because wrangler reads `.env` from the cwd — deploy from a directory
without one.
