# plan-session — a show off the wire, laid on one line, kept for six hours

Status: **not started, and no longer blocked.** **§1b is the build** — a
Worker proxies the WHIP handshake, a browser publishes, and no container is in
the path. §1a is the fallback; §1/§3 are the original container variant and are
superseded.

Written 2026-09-08 out of `take`. Proposed slug **`keep`**, Act 3 (*capture and return*), after
`show`.

Read `plan-take.md` first — this extends it and contradicts it in exactly one
place (§3). Read the ⚠ in `HANDOFF.md` about `workers/pub` before §0, because
this plan's P0 is that warning being cleared.

The user's words: *"use take demo and refactor it to new demo that uses either
llhls or webrtc and r2 saves for same functionality"*, and *"you already have
similar demos, reuse parts"*. This plan takes the second as binding: almost
nothing below is new code.

---

## 0. One line, and the honest version of it

`take` records takes off a canvas it draws itself, lays them end to end on one
line, and every frame burns its POSITION so a seek checks itself. It touches no
network.

`keep` does the same with the picture coming off the wire, and puts the takes in
R2 so the line outlives the tab.

**The honest version, which belongs on the page:** it does not persist a show.
It keeps one for **six hours**. `ingest.positron.studio` has a 6-hour TTL and a
cron that actually deletes; the only untimed write path is `selfrec`, which is
token-gated, and a public page cannot hold a token. That is why `ingest` exists
at all, and blurring the two is the thing `CLAUDE.md` explicitly forbids.

And `take`'s central claim does not survive the move. §3 is the whole plan.

---

## 1b. THE ANSWER — a Worker, not a container and not peer-to-peer

Added after §1a, from the follow-up: *"It can be just worker, no?"* Yes, and it
is better than both the container and §1a. **This is the recommended build; §1a
is the fallback if it does not stand up.**

The container was never needed to MAKE a live source — a browser publishes WHIP
today (§1a). It was needed to KEEP A SECRET. But the secret is already in a
Worker: `workers/pub/worker.mjs` reads `env.STREAM_KEY` and `env.WHIP_URL`. So
the Worker can hand the browser a live input without ever handing it the key.

**Why this is only signalling, which is what makes it cheap.** WHIP to
Cloudflare is **single-shot SDP with no trickle** — `rig/whep/publish.html` says
so in as many words, after paying for the knowledge. So the exchange is one POST
of an offer and one answer. Media then flows browser ↔ Cloudflare over
ICE/DTLS/SRTP **directly**; it never crosses the Worker. A Worker cannot carry
media and does not have to.

    browser  --offer SDP-->  Worker  --offer + KEY-->  Cloudflare
    browser  <--answer SDP-- Worker  <--answer------   Cloudflare
    browser  ================= media (direct) =======  Cloudflare

**What it needs to do**, and it is small:

1. `POST /whip` — take the browser's offer, forward it to `env.WHIP_URL`, return
   the answer. The answer SDP carries ICE candidates and a DTLS fingerprint and
   **no credential**, so returning it is safe.
2. **Hide the resource URL.** WHIP returns a `Location` for ICE restart and
   DELETE, and on Cloudflare that URL is itself credential-bearing. The Worker
   mints an opaque id, keeps the mapping, and proxies `DELETE /whip/<id>`.
   Returning the raw `Location` would leak the thing this design exists to hide.
3. **Rate-limit it.** A tokenless publish proxy lets anyone push video into our
   Stream input. This is the one new risk the design creates and it is not
   hypothetical: `ingest` exists in exactly this shape for exactly this reason.
   Reuse its discipline — per-address caps and a TTL in one Durable Object — and
   do not invent a second scheme.

**What it buys over §1a:** the REAL Cloudflare path. Ingest, packager, edge, and
both outputs. §1a's peer-to-peer tests none of that, and "can a live stream be
recorded and scrubbed afterwards" is a question about that path.

**What it buys over the container:** every blocker. No image rebuild, no
`PUB_ROW`, no +16 % encoder CPU on one core carrying two encodes — and no
ffmpeg at all in this demo's path.

**And §3's hard problem is simply gone.** The publisher is a browser running
`burn()`, so the picture carries the row already and the clock in it is a clock
we control. `take`'s claim survives intact and is stronger than `take`'s own
version, because the number is committed to pixels before the picture crosses a
real ingest, a real packager and a real edge — and the receiving page cannot
fake a number it did not write.

**And it costs NO STORAGE MINUTES. This was wrong in the first draft.**

**WHIP ingest records NOTHING** — direct-tested in this repo: 183 s against a
**recording-enabled** input produced **zero assets**, across 26 polls, with
`recording.mode: automatic` set. Stream-WebRTC is delivery-only and creates no
video assets, ever (`PROGRESS.md`, `plan-m2m.md` §5, `proto/m2m/NOTES.md`
Route A).

So `CLAUDE.md`'s "Stream recording cannot be turned off" is about the **RTMPS**
path — where it is true and where `06` and `09` depend on it — and it does not
apply here. §5's arithmetic below is about the container's RTMPS leg and should
be read that way; this demo touches it not at all.

**The corollary is the demo's own subject.** Because the platform records
nothing on this path, the page's own recording is the ONLY archive there is.
§2's decision — a take is a `MediaRecorder` session over the received track —
stops being a preference and becomes the only option. That is a better reason
than the one §2 gives.

The remaining cost is delivery, not storage, and there is **no number for it in
this repo**: whether a WHEP subscriber bills as Stream delivered minutes is
unrecorded and is not being guessed at (§12.5).

**Open question, and it decides P1:** whether Cloudflare TRANSCODES a WHIP
ingest before serving WHEP. If it does, the row must survive that transcode, and
§12.1 is still the thing to measure first — but it can now be measured with a
browser and a Worker, in an afternoon, instead of behind a container deploy.

---

## 1a. AMENDMENT — the container is not needed, and the plan below over-assumed it

Added after review, from one question: *"when we do whip why ffmpeg/container?"*

**A browser can publish WHIP itself.** `rig/whep/publish.html` already does —
canvas 1280x720@30 straight to Cloudflare Stream, with the frozen row in the
picture. So ffmpeg is not what makes a live source; it is what keeps a SECRET.
That file says so in its own comment: *"WHIP publish URL is a credential (path
segment = stream key) — never hardcode it"*, read from a gitignored file via
`?whip=`. A public page cannot hold that, which is the container's whole reason
for existing on this path.

**So do not use Cloudflare Stream for this demo at all.** Use the peer relay
`room` already uses: `wss://ws.positron.studio/room/<id>/ws`, **tokenless**, no
key, no container, no Stream input. One browser draws the shared pattern and
sends it; another receives it, records it, and lays the takes on the line.

What that changes, item by item:

| §3's blocker | with a browser publisher |
|---|---|
| `PUB_ROW: "0"` — no row in the live pixels | the publisher is `burn()`, which draws the row already |
| +16 % encoder CPU on 1 vCPU for two encodes | none: the publishing browser encodes one stream |
| the container image is stale and undeployed | not in the path |
| the burned clock is the PUBLISHER's, offset unknown | it is a browser's clock, and both ends can share one |
| ~2-4 Stream storage-minutes per suite run | zero: no Stream input is touched |
| P0 gates everything | there is no P0 |

**And §3's hard problem mostly dissolves — without weakening the claim.** The
publisher burns POSITION into the pixels BEFORE the picture crosses the wire. It
is then encoded, sent over a real peer connection, decoded, re-encoded by
`MediaRecorder`, stored, played back and read. The number cannot be faked by the
receiving page, because the receiving page did not write it. So `take`'s claim —
*a seek checks itself* — survives INTACT and is strictly stronger than `take`'s
own version, where the frame never left the tab.

**What is lost, said plainly.** This is peer-to-peer, not a broadcast stream, so
it does not test Cloudflare's ingest, its packager, or its edge. Two tabs on one
machine share a clock and a CPU; two DEVICES do not, and that is the run worth
reporting. If the question is specifically *"does a Cloudflare live stream
survive being recorded and scrubbed"*, this does not answer it and §1 below
does.

**Reuse gets better too:** `room` already has the relay, the offer/answer, the
one-dialler rule, and the shared pattern on a canvas — so the source side is a
demo that exists rather than a container that has to be rebuilt.

Sections 1 and 3-5 below were written before this and assume the container.
Read them as the CLOUDFLARE variant, which is still the right answer if the
subject is Cloudflare. Section 1a is the recommended build.

---

## 1. LL-HLS or WebRTC — WebRTC (WHEP), and the reason is not latency

| path | glass-to-glass | measured |
|---|---|---|
| MoQ | p50 26.2 / p95 42.4 ms | burned pixels |
| WHEP | p50 67.0 / p95 76.9 / p99 84.1 ms | same method, n=17,501 |
| LL-HLS | ~3.3 s | the compatibility tier |

**Latency is the third reason, not the first.**

**1. WHEP hands the page a `MediaStream`; LL-HLS does not.** `MediaRecorder`
takes a `MediaStream` and nothing else. `demo/show/index.html` already does
`new MediaRecorder(remote, …)` on a received track and asserts, by object
identity against `pc.getReceivers()`, that it recorded the receiver's track and
not a local one. That is the single largest piece of reuse here and it is a
two-line change of source.

On the LL-HLS path there is no `MediaStream`. You would need
`HTMLMediaElement.captureStream()`, which this repo has never used and which is
believed absent on WebKit — **stated as belief, not as a measured fact from this
repo**. The alternative on that path is copying Cloudflare's segments to R2
rather than recording anything, which is a good idea and a *different demo*: it
is the archival cron, blocked on minting a Stream-scoped token.

**2. 3.3 s makes "press stop" mean nothing.** A take is an interval you started
and stopped. At 67 ms, "what I saw when I pressed stop is in the file" is true
to within a frame or two. At 3.3 s it is false by 80-odd frames, and whether the
last 3.3 s is in the file at all depends on where hls.js's buffer sits — a
quantity this page would have to measure before it could say anything.

**3. Cost is a wash, and must not be argued as a WHEP advantage.** Both legs are
Cloudflare Stream live inputs, both are `recording.mode: automatic` because
`mode: off` also disables HLS playback and `preferLowLatency` requires
`automatic`. Recording cannot be turned off on either. See §5.

**Where LL-HLS genuinely wins, said plainly:** its segments are already the
durable artefact. Cloudflare has stored them; a "keep the show" demo on that
path is a pure byte copy with no re-encode, which is strictly more honest about
what got archived. If that demo is ever built it should be built, and it is not
this one.

**MoQ is not in scope** (the user named two paths) but is worth one line: it is
the only network path here that has already delivered a checksum-clean burned
row — **600 clean rows, 0 unreadable** through the Cloudflare relay on
2026-09-08. Everything §3 needs, MoQ already has. It is excluded because Safari
cannot use it (WebKit 319818) and because the user asked for the other two.

**What WHEP costs this page**, up front: `MediaRecorder` on a received track
re-encodes the decoded frames. What lands in R2 is *not* the bytes off the wire
— it is a second encode of the pictures those bytes produced. `show`'s claim is
about the *source of the pictures*, not byte identity. Do not upgrade it here.

---

## 2. What "a take" is when the source is a live stream

**A take is one `MediaRecorder` session over the received track**, started and
stopped by a person. Same as `show`, with `take`'s bookkeeping around it.

**Not a segment range of the upstream stream.** Over WHEP there are no segments.
Over LL-HLS there are, and they are the wrong unit twice: they are quantised to
a 2.0 s GOP (only one part per segment is `INDEPENDENT`), so a take cannot start
or stop where you meant it to — and worse, `take`'s central assert, *"parts are
laid end to end — no gap, no overlap"*, would become an assertion about
Cloudflare's packager rather than about this page. The subject would quietly
change owners.

**Not a server-side recording.** Cloudflare's own recordings are the thing this
project is trying to *delete*: 183 of them reached **559.97 of 1000
storage-minutes**, testing alone adds ~225 min/day, and the cap breaks playback
when hit. A demo whose artefact is a Stream recording adds to the exact number
that is two days from a wall. It is also asynchronous, and it needs a
Stream-scoped API token that has not been minted.

So: a person presses record, presses stop, and gets a part. Exactly `take`, with
the pixels arriving from somewhere else.

---

## 3. The burned clock — this is the whole problem

### What breaks

`take` calls `burn(g, W, H, frame, { position: line / 1000 })`. It can, because
the page **draws the frames it records**. The number in the picture is the
number the deck will report, so a scrub checks itself with no arithmetic. That
is the demo's entire claim.

Here the page draws nothing. The frames are made by ffmpeg in a container. Its
picture carries two clocks and neither is this deck's: `ABSOLUTE` (spawn epoch +
presentation time) and `LOCAL` (the container's own `gmtime`). `pattern.mjs`'s
own header says why that is not our number — read in a browser, an ffmpeg row
carries an unknown container-vs-viewer clock offset.

So `take`'s claim, as written, is dead on this page. There are two ways out.

### Option A — re-burn POSITION over the received picture. Rejected.

Composite the received frame onto a canvas, `burn(..., { position, field: false })`,
`captureStream()` into the recorder. `take`'s claim returns intact.

Three reasons not to, the third fatal:

1. **It destroys the upstream clock.** The frozen row is drawn at fixed
   coordinates with an opaque black bed. Ours would sit exactly on top of the
   publisher's. The only evidence of what the network did would be overwritten
   by our own arithmetic.
2. **It archives a picture no viewer ever saw** — a re-encode of a re-encode
   with our overlay on it. That contradicts `show`, one row above in the same
   act.
3. **It needs a FOURTH burned-row family, and `pattern.mjs`'s header forbids
   it.** Three exist and are documented there: the frozen row at `PAD+20` /
   bottom (`pattern.mjs` + the container); the OLD geometry at `X:40 Y:100`,
   still live in `rig/whep/*` and `rig/obs-docker/*`, where each rig's burner and
   reader agree with each other; and `proto/m2m/*` + `proto/centralrec/pub.html`'s
   64 blocks of 9 px on a 640×360 grid with a 7th participant-id byte. **Do not
   add a fourth.**

And the deeper objection: burning `00:00.000 POSITION` onto a frame whose real
content is 67 ms old is the page writing its own answer into its own evidence.
`take` was allowed to, because the page *was* the source. This page is not.

### Option B — keep the publisher's clock and re-derive the claim. Take this one.

The 56-block row encodes **48 bits of epoch milliseconds plus an 8-bit XOR
check**, and `readBurned(ctx)` decodes it, returning `null` unless the checksum
agrees. It survives real encoders: 150/150 frames clean through x264 at 2500k in
the container's own measurement, 600/600 clean through the Cloudflare MoQ relay.

The check becomes:

- when a take starts, read the burned epoch off the first received frame → `E0`
- seek the line to position `P`, draw the played frame into a canvas at its
  natural size, `readBurned` → `E`
- **assert `(E − E0) − (P − startMs)` is inside one frame** (40 ms at 25 fps)

**This is stronger than what `take` had, not weaker.** `take` checked that the
picture said the number the page had written into it — a page checking its own
arithmetic. This checks that a clock running in **another process on another
machine, which this page cannot write**, advanced by exactly as much as the
playhead moved. A seek that lands in the wrong place cannot fake it.

The re-stated claim, in the page's own words (this goes in `how()`):

> Every frame carries the publisher's own clock, drawn into the picture as
> blocks a program can read back. Drag the line by four seconds and the clock in
> the picture moves by four seconds. We do not know what the difference between
> that clock and yours is — it is another machine — so that number is shown and
> never used.

**What must NOT be printed:** `E − Date.now()` as a latency. It contains the
unknown container-vs-viewer offset. It goes in a gutter labelled as an offset of
unknown sign and size, with no colour scale and no assert.

### The dependency this creates, and it is the biggest risk in the plan

**The row is not in the pixels today.** `workers/pub/wrangler.jsonc:55` sets
`"PUB_ROW": "0"` — verified. The container draws the two text clocks and no row,
so `readBurned` returns `null` on every frame of both live legs right now.

Turning it on is not free and the cost is measured: **+16 % encoder-process CPU**
(utime 3.095 s → 3.598 s per 20 s of video), on a box that is **1 vCPU running
TWO 720p30 encodes**, where half a vCPU already stalled that pair once. The first
thing a starved encoder wrecks is declared segment duration, currently
**sd 0.003 s**.

And `workers/pub`'s image predates three rounds of pattern changes, so even
`PUB_ROW=1` against a stale image would draw the row at the old coordinates and
be read at the wrong pixels.

So the order is forced: deploy the image, flip `PUB_ROW=1` **on the WHIP leg
only**, measure for one run, then build the page. See P0.

**If that cost cannot be paid, do not build this demo.** Without a readable row
there is no self-checking seek, the only remaining check is `video.currentTime`
— the element telling you what it did, which `show` already asserts — and `keep`
is `show` with more buttons. Build the fallback in §10 instead.

---

## 4. R2: the write path, the caps, and what is not persistent

`ingest.positron.studio` is the only tokenless write path to R2. Server-minted
session ids, per-segment / session / address caps enforced in one Durable Object,
and a cron that enforces the TTL.

| cap | value | what it means here |
|---|---|---|
| `maxSegmentBytes` | 2 MiB | at 900 kbps a 2 s segment is ~225 KB — nowhere near |
| `maxSegments` | 45 | **binding**: 45 × 2 s = 90 s of take |
| `maxSessionBytes` | 24 MiB | ~213 s at 900 kbps — not binding |
| `maxSessionsPerHour` | 5 per address | **binding**: see below |
| `maxBytesPerHour` | 64 MiB per address | ~2.7 sessions' worth |
| `ttlHours` | **6** | then the cron deletes the objects AND the session record |

**One ingest session per take.** Each take is a separate `MediaRecorder` run with
its own WebM header; its segments are continuation clusters of *that* header and
will not assemble alongside another take's. The worker also requires `seq` to be
exactly the next one — no sparse sequences — so two takes cannot share a session.

**That makes the address cap a limit on the demo itself: 5 takes an hour.** Cap
the page at **4**, leaving one session for a retry, and print the number. A
refused `/open` returns 429 with `retryInS`; `capture` already logs it.

### What is NOT persistent — say all of it, in the page's own words

- The objects under `demo/ingest/<session>/` are **deleted after six hours**, by
  a cron that actually runs.
- So is `manifest.json`, so the link the page prints is dead the next morning.
- So is the session record, so `/show/<session>` 404s too.
- **Nothing survives a reload in the browser either** — the deck, the parts and
  the object URLs are in memory, exactly as in `take`.
- What *would* persist: `selfrec` (token-gated, no TTL) or copying a Stream
  recording to R2 (proven — 105.8 MB MP4, byte-exact). Neither is available to a
  page that cannot hold a secret. **That is why `ingest` exists, and the two must
  stay separate.**

**`expiresAt` already comes back from `/open` and no demo shows it.** Put it on
the page as a countdown: a readout cell that moves, and the honest face of the
whole R2 claim.

### The one thing that makes "kept" concrete

`?open=<session>,<session>` reconstructs a line from R2 in a **different tab, or
a different device**, inside the TTL. No worker change needed. Note the wording:
**reconstructed, not restored** — `startMs` is recomputed from resolved
durations, so if a duration resolves differently elsewhere, the line differs.

---

## 5. What this costs

> **Read §1b first.** This section was written for the container variant and is
> about the **RTMPS** leg. WHIP ingest records nothing (direct-tested), so the
> recommended build incurs none of the storage below.

**Stream storage.** Holding `pub.positron.studio/watch` starts the container,
which publishes to two live inputs, both `recording.mode: automatic` because
`mode: off` also disables HLS playback. So **every wall minute this page is open
is recorded minutes**, against a hard 1000-storage-minute cap that breaks
recordings and therefore playback. ~225 min/day accrues under testing;
`deleteRecordingAfterDays` bottoms out at 30 and is useless at that rate.

**What `keep` adds.** `webrtc` declares `settleMs: 75000`; this page needs that
plus two ~6 s takes plus duration resolution — ~110 s of publisher hold per
suite run, times the legs running. **Roughly 2–4 storage-minutes per full
`verify.mjs` run.** Small alone, and exactly how 225 min/day accumulates. So:
do not add this demo to the suite until the archival cron exists, or record the
arithmetic in `PROGRESS.md` when it lands. And if `PUB_ROW=1` also runs on the
RTMPS leg it costs +16 % CPU for nothing — **WHIP leg only**.

**R2.** Bounded and trivial: ≤ 24 MiB per session, ≤ 5 sessions/hour/address,
gone in 6 hours. Egress is free.

**WHEP delivery billing is unknown from this repo** and is not being guessed at.

---

## 6. Reuse — where every piece already lives

Prefer (a) importing as-is, then (b) promoting into `demo/shell/` so two pages
share one copy, and justify anything marked (c).

### (a) importable exactly as it is

| what | where |
|---|---|
| `mount` `guard` `el` `armVideo` `playOrPrompt` `recorderMime` `matchAspect` | `demo/shell/shell.mjs` |
| `whep()` `holdPublisher` `waitForWhip` `LIVE` | `demo/shell/live.mjs` — `waitForWhip`, not `waitForManifest`; asking the wrong one is a 409 |
| `readBurned` `ROW` `videoHue` `hueFor` | `demo/shell/pattern.mjs` — the one picture. Nothing here draws it |
| `createTransportBar(…, { scrub: false, extras })` | `extras` exists because `take` needed it; `keep` is the second caller, which is what makes it shared rather than a claim |
| `createStripView` | `demo/shell/strip.mjs` |
| `createDeck` / `setRange` / `deck.transport.onState` | `timeline/transport.mjs` |
| `mediaMaster` + `release()` `key()` `driving()` | `autoPlayPause: false` — a part ending is a handover, not a stop |
| `partAt` `localOf` `handOver` `tick` `landPart` `partLane` `chunkLane` `runChecks` | `demo/take/index.html`, ~200 lines, verbatim |
| `POST /open` · `PUT /seg` · `POST /close` · `GET /limits` | `workers/ingest/worker.mjs` — no worker change for any of this |

### (b) promote into `demo/shell/` first

| what | today | new home |
|---|---|---|
| **the `duration: Infinity` dance** | three implementations of one documented trick: `take:423` (as `resolveDuration`), `capture:198`, `show:351` (inline in their assemble paths) | `demo/shell/media.mjs`. `keep` would be the fourth |
| **`whepPlay(url)`** | `demo/webrtc/index.html` | `demo/shell/live.mjs`. Carries three paid-for lessons: single-track offers are refused, a track arrives muted, adopting `e.streams[0]` per track loses one |
| **the ingest client** | `demo/capture/index.html` | `demo/shell/ingest.mjs` — **with one correctness fix**, below |
| **the "did a frame ever get presented" latch** | `demo/webrtc/index.html` | beside `armVideo`. Its header records two wrong versions before this one |

**The ingest fix, verified in the code:** `capture` calls `shipSeg(n, e.data)`
from `ondataavailable` **without awaiting it**, while `workers/ingest/worker.mjs:152`
requires `seq === s.segments` and answers **409 out-of-order** otherwise. At
capture's 2 s slice this has never raced. The shared shipper must serialize;
`capture` gets the fix for free.

Promoting means touching `capture`, `show` and `webrtc`. **Re-run each and diff
its assert count** — that is the rule, and it caught `grid` going 11 → 10 while
still reading green.

### (c) genuinely new, and why

- **`readBurnedFrom(videoEl)`** — draw a `<video>` into an offscreen canvas at
  `videoWidth × videoHeight` and `readBurned` it. `moq.mjs` reads from a
  `VideoFrame` via WebCodecs; there is no element path anywhere. ~10 lines, and
  it must size the canvas **to the source, never scale** — `readBurned` samples
  fixed coordinates, so a scaled row is read at the wrong pixels.
- **The position ↔ publisher-clock map.** **This is the demo.** `moq` compares a
  burned clock against `now` on a live frame; nobody has compared a burned clock
  against a *position on a recorded line*.
- **One ingest session per take, and the take↔session table.**
- **The expiry countdown.** `expiresAt` is returned and thrown away by every
  caller today.

### What must NOT become another copy

A fourth burned-row family · a fourth duration dance · a second camera path
(**`keep` has no camera control at all** — its source is upstream, and a camera
would be a lie about what is being tested) · a second position surface · a
second ingest client · a second `hueFor` · a second WHEP client.

---

## 7. Should this be a new demo at all?

`ladder` was removed on 2026-09-08 for being redundant, so argue this rather
than assume it.

**Against:** `keep` = `show` + `take` + `capture`, three demos' subjects on one
page — and `plan-take` §9 says in as many words: *"Do not grow `take` into
`capture`."*

**For, and I think it holds:** none of the three answers *can you scrub a show
afterwards, when you never had the source?* `show` records off the wire and
replays from memory — the artefact dies with the tab. `capture` persists, but its
source is a local canvas — nothing crossed a wire. `take` touches no network.
`keep` is the first page where the artefact outlives the tab **and** the source
was never local, and it carries exactly **one new mechanism** — §3's
publisher-clock check — which is the test `ladder` failed.

**Not by extending `show`:** its one line is a single sharp claim, and a
multi-take timeline plus an R2 round trip buries it. Its loopback peer is also a
deliberate determinism choice for the suite.

**Where it goes:** Act 3, after `show`, `built: false` until P0 lands — so it is
reachable only through `demo/server.mjs`. That is the right state for a page
whose subject is not yet observable.

---

## 8. The asserts

Mechanism asserts, run when a take lands rather than behind a button. No `?? 0`
anywhere; grep it.

**The live leg** (from `webrtc` and `show`): the live leg is connected · a
picture arrived (**the latched** `framePresented`, never a sampled `videoWidth`)
· frames decoded off the wire · **the recording is the RECEIVER's track**, by
object identity against `pc.getReceivers()` — an id comparison passes vacuously,
because a remote `MediaStream` carries the sender's msid.

**The line** (from `take`, unchanged): the format was negotiated, not assumed ·
slices arrived with sizes · every slice is stamped on arrival · the line is
seekable, a finite range · takes are laid end to end · the line is as long as the
takes put together · crossing a boundary hands the picture over · exactly one
take is under the playhead · the take under the playhead drives the clock · a
seek reports what it actually got.

**The new ones — the reason the page exists:**

- `the picture carries a clock a program can read` — `readBurnedFrom` returns
  non-null on the played-back frame. `room` asserts this on a local canvas; here
  it is through an encode, a wire and a second encode.
- **`the publisher's clock moves with the playhead`** — five probes per take:
  seek `P1`, seek `P2`, assert `|(E2 − E1) − (P2 − P1)| < 40 ms`. This is
  `take`'s "a seek checks itself", re-derived.
- `most rows survive the round trip` — clean vs unreadable against a stated
  ceiling. **The page measures its own weakest assumption.**

**The R2 leg, two slots so the count is the same in both modes:** `the upload leg
did what the mode asked` (`useR2 ? session !== null : session === null`) · `playback
came from where the mode says` — and in R2 mode the local blob array must be
**empty**, or the page reads green while replaying memory.

**A defect this found:** `capture`'s R2 asserts sit inside `if (useR2)`, so its
assert count is mode-dependent — the exact shape `CLAUDE.md` bans. Stable only
because the suite never sets `?r2=1`. The two-slot form is the fix.

**What cannot run in the harness:** everything on the live leg needs **UDP
egress** — without it the page asserts nothing and prints `0/1 green`; read the
denominator, `0/1` is "never ran". **The R2 leg cannot run in the suite** at all:
the harness presses every control every run, two takes = two of five sessions per
hour, so three runs hit a 429 and a working page reads red — opt-in by `?r2=1`
only. **The six-hour TTL cannot be asserted by anything** — it is a printed
property, not a check. And `readBurned` fails silently until P0, so that assert
must ship **live and RED rather than skipped**; a skipped assert is how a subject
goes missing.

---

## 9. Phases

**P0 — the container prerequisite. Not this page's code, and it gates
everything.** Deploy the `workers/pub` image (owed regardless). Set `PUB_ROW=1`
**on the WHIP leg only**. One publish run, measuring: declared segment duration
sd on the RTMPS leg (**0.003 s today** — what a starved encoder wrecks first),
WHEP decoded fps, container CPU. Then from a browser on `/webrtc/`, draw the
received frame into a canvas at its natural size and count clean rows.
**Done when** ≥ 95 % of 200 consecutive received frames return a checksum-clean
row **and** segment-duration sd has not moved. **If either fails, stop** and
build §10 instead.

**P1 — the source.** WHEP in, with `webrtc`'s six-attempt / 4 s retry: a fresh
WHIP leg answers 409 for a while, and that is "not yet", not "no". *Done when* a
picture arrives and the live-leg asserts pass at the values `webrtc` reports.

**P2 — one take off the wire, on the line.** `MediaRecorder` from `show`; the
deck, `mediaMaster`, the bar with Record in it, the strip — all from `take`.
*Done when* one take records off WHEP and scrubs.

**P3 — two takes end to end.** `take`'s sequence asserts, unchanged, with the
source being the network. *Done when* the strip shows two coloured bars, the
second growing while it records.

**P4 — the publisher's clock.** `readBurnedFrom`, `E0` per take, the ΔE-vs-ΔP
probes, clean/unreadable counts, the unknown offset printed as unknown. *Done
when* five probes per take land inside one frame and **nothing on the page is
called a latency**.

**P5 — R2, opt-in.** `?r2=1`. One session per take, capped at four. The
serialized shipper. A refused segment **ends the take** rather than skipping —
the sequence must stay dense. Assemble from `manifest.json`, drop the local
blobs, resolve the duration once off the R2 copy. *Done when* a take recorded in
one tab plays back and scrubs in another.

**P6 — the writing pass.** One line, one `how()`, real numbers, per-lane figures
in the gutters, no jargon a visitor could not read. *Done when* someone who does
not work here can read the page and say what it did.

---

## 10. If P0 fails

Do not build `keep`. Build **one increment on `show`**: lay two recordings end to
end on one line. That is `take`'s sequence machinery over `show`'s existing
loopback hop, where **our own canvas is still the source**, so
`burn(..., { position })` works exactly as in `take` and the self-checking seek
survives intact. ~8 asserts, nothing upstream, no storage minutes — and honest
about what it does not do: the pictures crossed a real WebRTC hop but not a real
network, and nothing is kept.

It does not answer the original question. Say so, and say why: the answer needed
a clock in the pixels that this project can read, and turning that clock on costs
16 % of an encoder that has one core for two streams.

---

## 11. Traps specific to this build

- **`readBurned` samples FIXED coordinates.** Size the read canvas to the source;
  never scale. A wrong size returns `null` on every frame, indistinguishable from
  "the row is not there". Print the received `width × height`.
- **A remote `MediaStream` carries the SENDER's msid.** Object identity against
  `pc.getReceivers()` is the only honest test.
- **Cloudflare WHEP refuses a single-track offer** — both directions are HTTP 400.
  Offer both `recvonly`.
- **`ingest` requires a dense sequence.** Serialize the shipper; an out-of-order
  PUT answers 409, which reads like a server fault and is not.
- **Five sessions per address per hour.** Four takes, one spare, the number on
  the page, and handle the 429.
- **`duration: Infinity`.** Resolve it **once**, off the R2 copy, after the local
  blobs are dropped — which is also what makes the playback-source assert mean
  anything.
- **`verify.mjs` stops collecting 400 ms after the last assert**, and its
  first-assert wait is capped at 30 s regardless of `settleMs`. Land the
  capability and negotiation asserts **early**, before the recording.
- **`settleMs`** must cover a cold container plus the WHIP handshake plus two
  takes plus duration resolution. Start at 110000 and measure.
- **A hidden tab throttles `requestVideoFrameCallback` to ~1 Hz.** The read-back
  sampler must not be rAF-only.
- **`build.mjs` refuses an import with no deployed file** and since 2026-09-07
  scans `.mjs`/`.js` as well as HTML — so a dead import inside a promoted module
  is caught. Prove it once by breaking it on purpose.
- **`grep -rn '?? 0' demo/`** before calling any of this done.

---

## 12. What is uncertain, stated as uncertain

1. **Whether the frozen row survives Cloudflare's WHEP path at all.** The 600/600
   result was through a MoQ relay carrying a browser's own encode — different
   codec, different packager, no transcode. **Whether Cloudflare transcodes
   WHIP→WHEP is not recorded anywhere in this repo.** Largest unknown; P0 exists
   to settle it. Do not build past P0 on the assumption.
2. **Whether +16 % encoder CPU is affordable on the actual instance.** Measured
   on a Mac, not on the 1 vCPU box running two encodes.
3. **Whether the row survives a second encode.** VP9 at 900 kbps at 720p is
   probably fine and is not measured. The page's own clean/unreadable count is
   the measurement — a good property, and it should be said out loud.
4. **Whether `HTMLMediaElement.captureStream()` exists on WebKit.** Believed not;
   not checked. Only matters as one more reason the LL-HLS path is worse.
5. **Whether WHEP delivery bills as Stream delivered minutes.** No number here.
6. **Whether a WebM recorded from a WHEP track resolves a finite duration
   reliably.** `show` proves it for a loopback track on desktop Chrome.
   Inherited, not measured on this path.

---

## 13. Definition of done

1. Press record twice, get two takes end to end that play and scrub as one —
   **with the pictures coming from a live input over WHEP and nothing drawn
   locally.**
2. Dragging the line four seconds moves the publisher's own clock, decoded out of
   the pixels, by four seconds — inside one frame, five probes per take.
3. The unknown offset between that clock and this machine's is printed, labelled
   unknown, and used for nothing.
4. With `?r2=1`, every closed slice reaches R2, the local copies are dropped, and
   playback comes back from `archive.positron.studio` — asserted, not assumed.
5. The page says, in plain words, that the recording is deleted after six hours,
   and shows the countdown.
6. `?open=<ids>` reconstructs the line in another tab inside the TTL, and the page
   says **reconstructed**, not restored.
7. Nothing on the page is a constant dressed as a measurement.
8. `verify.mjs` moves by the asserts added and no others — and `capture`, `show`
   and `webrtc` each still report their own counts after the promotions in §6(b).
