# Handoff — 2026-09-04 (end of session 8)

Read order for a fresh session: this file → `SUMMARY.md` → `PROGRESS.md`
(newest first) → the plan you're touching. `plan-timeline.md` §7–§9 is the
current state of the library and OVERRIDES §§1–6 where they disagree; §9 is
newest and wins over §7–§8.

## One line

The project is **positron**, live on **positron.studio**, and the work is now
visible: a shared demo shell and **18 demos, 239/239 green** against the
deployed URL — including the latency ladder measured on a page anyone can open
(**rtt 25 ms WHEP vs 3.49 s LL-HLS**), the seek fold asserted at every cue
boundary, and a publisher container that runs only while somebody is watching.

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

## Where things stand (session 8)

**Live.** `positron.studio` is the demo index, generated from
`demo/manifest.mjs`. Demos are at `/<nn>-<name>/`, notes at `/notes/`.

| worker | hostname | what |
|---|---|---|
| `elektron-view` | `positron.studio`, `www` | the index, the demos, the archive pages |
| `positron-ws` | `ws.positron.studio` | tokenless verbatim relay (superseded `elektron-jam`, retired) |
| `positron-pub` | `pub.positron.studio` | ffmpeg publisher container, alive only while `/watch` is held |
| `elektron-rtc` etc. | `rtc|cues|instrument|selfrec|osc|moq.positron.studio` | unchanged; script names stay for their DO state |
| R2 `elektron-archive-test` | `archive.positron.studio` | the show archive |

**Built (18):** `01`–`05` (Act 0, no network) · `06` llhls · `07` webrtc ·
`09` ladder · `10` room · `11` grid · `12` cues · `13` record · `14` replay ·
`15` seek · `16` looper · `17` instrument · `18` jam · `19` flipper.

**Not built (5):**
- `08 moq` — needs `moq-pub` compiled into the publisher image (Rust/musl
  multi-stage). Feasible: QUIC egress from Containers is already measured
  working, and `moq-pub` has `src/main.rs`.
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
  **Still to do:** open `/06-llhls/` on the iPhone and read `switches`. The
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

## How to run and check things

```sh
node demo/server.mjs                       # :8890, serves the repo; / == deployed
node demo/verify.mjs                       # every built demo, locally
DEMO_BASE=https://positron.studio node demo/verify.mjs   # against the deploy
cd workers/view && node build.mjs && npx wrangler deploy  # ALWAYS build first
```

Wrangler traps that cost time: `.env` in the cwd shadows machine OAuth, so run
from a dir without one (`proto/archive`) or `env -u CF_API_TOKEN
-u CLOUDFLARE_API_TOKEN`. And `build.mjs` now REFUSES duplicate destinations —
stripping the `demo/` prefix let two sources collide on `index.html`.

## Nothing is in flight. Everything below is committed and green.

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
`keepalive.mjs` · `lab/` (prop-test, prop-nested, prop-store, prop-render,
firewall, strip-verify — all green).

**`proto/looper/`** — the instrument. `node proto/looper/server.mjs`, then
`http://127.0.0.1:8891/proto/looper/`. Space = pedal, letter keys = piano.
Add `?room=NAME` in two windows and it is a shared loop. 39 + 17 + 12 + 12
asserts.

**`studio/`** — `node studio/engine.mjs` + one URL runs a complete show with
GO LIVE · SHOW · ROOM · SOUND · ARCHIVE. verify 24/24.

**Deployed** (unchanged this session): `elektron-view` (four archive viewers,
public) · `elektron-rtc` · `elektron-selfrec` · `positron-ws` ·
`elektron-instrument` · `elektron-osc`.
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

1. **Play it. Run a show.** Still the top item and now sharper: there is a
   playable instrument and a five-panel studio, and everything measured is
   synthetic — canvas sources, injected keys, headless Chrome, burned clocks.
   Twenty minutes with a real camera, a real keyboard and one other person
   would teach more than any module.
2. **The unexplained cross-peer tail** — two tabs playing one loop agree at
   p50 −5.77 / p95 −1.52 ms but the max is 28.39 ms. Part is the servo's dead
   band (a per-peer position error, invisible solo, a flam when shared:
   5 → 1 ms moved p50 from −8.24 to −5.77). The rest is not explained.
3. **Re-measure the content anchors** together, after the `replay.html` fix.
4. **`createAudioLane` does not consult the evidence gate** — a derived lane
   routed through it would still sound. Also wanted:
   `createAudioLane(…, {onStateChange: 'cancel' | 'keep'})` so a child lane can
   render a loop directly instead of by expansion (default must stay `cancel`).
5. **Remote P2/P3** (`plan-looper.md`) — over the deployed `elektron-jam` DO,
   then over real distance. P2's point is that the loop plane should be
   INDISTINGUISHABLE from P1; if it is not, the claim is wrong, which is the
   most valuable possible outcome. P3 needs the one unmeasured number: min-RTT
   skew over a real link rather than loopback.
6. Still owed by §−1: `when` on spans, competing authorities (the deferral most
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
blind to a whole class of audio bug (7/7 stub vs 1/7 real).
