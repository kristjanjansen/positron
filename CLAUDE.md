# positron

Live at **https://positron.studio**. 24 of 28 demos built, 332/332 green. Read
`HANDOFF.md` for current state, `LESSONS.md` for why the rules below exist,
`PROGRESS.md` for what was measured when.

## Run and check

```sh
node demo/server.mjs                     # :8890, serves the repo; / == deployed
node demo/verify.mjs                     # every built demo (CDP, asserts on window.__demo)
node demo/verify.mjs 06 09               # just these
node demo/verify-native.mjs              # THE IPHONE CODE PATH — verify.mjs cannot reach it
node demo/verify-safari.mjs              # desktop Safari over WebDriver, both engines
DEMO_BASE=https://positron.studio node demo/verify.mjs      # against the deploy

cd workers/view && node build.mjs && npx wrangler deploy    # ALWAYS build first
```

`.env` in the cwd shadows machine OAuth. Deploy from a directory without one, or
`env -u CF_API_TOKEN -u CLOUDFLARE_API_TOKEN npx wrangler deploy`.

Device logs from any phone: `https://pub.positron.studio/logs?format=text`.
Every 06 log opens with `BUILD <sha>-<hhmmss>`, so a report can be attributed.
Clear with `POST /logs/clear`. `GET /status` blocks on the container's cold start
— that is expected, not a hang.

## Rules that cost real time to learn

**Measure the quantity in question, not one adjacent to it.** An A/B where both
arms share the bug returns "identical", which reads as "fine". Before running a
comparison, ask what defect it could NOT detect.

**A green suite can mean zero coverage.** `verify.mjs` reported 261/261 while a
demo was fatally broken on iPhone, because desktop Chrome never enters that
branch. After any change to `src/low-latency-player.js`, run
`demo/verify-native.mjs` too.

**Attribute a run to a build before iterating on it.** Every 06 log opens with
`BUILD <sha>-<hhmmss>`, substituted into the deployed `shell.mjs` by
`build.mjs`. Without it, "still broken" and "the fix never loaded" are the same
observation. **Confirm the stamp changed before asking anyone to retest** — the
edge serves the previous build for a few seconds after deploy.

**Being right about a mechanism says nothing about whether it dominates.** State
what you expect to see if your cause is the real one, then check that you see it,
before shipping a fix.

**When two hypotheses have opposite fixes, build the measurement that separates
them first.** Do not pick between them on plausibility.

**Never guard a patch on `s.includes(<substring>)`.** Three bugs in one day from
this — `BUILD` matched inside `REBUILD`; `LOG_KEEP` and `#log` were satisfied by
the code just inserted. Guard on the exact declaration, or assert the effect
afterwards. Printing "ok" is not evidence.

**`verify.mjs` stops collecting 400 ms after the last assert.** Its stabiliser
waits only while the count is still GROWING, so a check whose FIRST assert sits
behind a wait reports "asserted nothing" (a page that is working reads as
broken), and one that pauses mid-way silently loses every assert after the
pause. Slow work — going live, a recording, resolving a WebM duration — belongs
behind control 0, which is the only control that gets `settleMs`.

**`grep` returns nothing on `timeline/transport.mjs`.** It held two literal NUL
bytes (a cache-key separator typed raw instead of `\u0000`), so BSD grep called
the file binary and printed nothing — not "binary file matches", nothing. Every
search of the timeline core answered "not there", including for `createDeck`,
which is exported ~40 lines from where the search claimed nothing was. The NULs
are now escaped. If a search for a symbol you are sure exists comes back empty,
suspect the file before the symbol: `node -e "…indexOf(…)"` is the second
opinion.

**An engine switch invalidates the harness's HTTP cache.** A media element
loading `video.src = <m3u8>` stores a no-cors (opaque) entry for that URL; the
moment a page switches to hls.js, its XHR for the SAME url is served from that
entry and rejected as a CORS failure — on a URL that answers 200 with
`access-control-allow-origin: *`, and while the page's own `fetch` of it
succeeds in the same run. Two demos read red for exactly this and nothing in
either page was wrong. `verify.mjs` now deletes its profile's Cache before
every run.

**Never let sound gate the work.** `audio.play()` and `AudioContext.resume()`
both wait on a user gesture in a real browser, and neither REJECTS — awaiting
one before doing the real work is a hang, not an error. It cost two demos in one
session: 26 shout spent five seconds buffering an element before its measurement
opened, pushing the whole run past the harness's settle, and 28 vclick awaited a
suspended context and never compiled, never built its deck, never raised its
transport bar — while looking fine, because the readout had been filled at load.
Headless hides it: `--autoplay-policy=no-user-gesture-required` resolves both.
Fire them and move on; sound is allowed to be late, the timeline is not.

**Prove a guard fires.** Break the thing on purpose once. And note `cmd | tail`
reports `tail`'s exit status, not `cmd`'s.

**Long measurements: no pipes, no dangling promises.** `node x.mjs | tail` buffers
until exit and looks hung — write to a file. An un-awaited `fetch` keeps the
event loop alive forever.

**Read the comments already in the file.** `src/publish.sh` pins `ffmpeg@7`
("needs libfreetype for the clock overlay") and the publisher says "the key must
never be echoed". Both were correct and both were ignored, each costing a run.

**A recovery action is not free.** Rate-limit it, require it to have somewhere to
land, and make it yield rather than retry forever — see `low-latency-player.js`,
where a drift-seek every 2–3 s aborted the in-flight fragment loads it was trying
to recover.

## Platform facts

- **iOS 17.1 added `ManagedMediaSource`**, so `Hls.isSupported()` is now TRUE on
  iPhone. Any fallback written `if (!Hls.isSupported() && canPlayType(...))`
  silently stopped firing.
- **Prefer native HLS on all WebKit, and gate it on `ManagedMediaSource`.**
  `canPlayType('application/vnd.apple.mpegurl')` returns `"maybe"` in BOTH Safari
  and Chrome, so it cannot tell them apart — gating on its truthiness put Chrome
  on a path it cannot play. MMS is WebKit-only, so it is a capability test rather
  than a brand check. Measured on desktop Safari, same page, same 40 s: native
  advance 0.961x / latency 5.25 s / 0 errors, against hls.js 0.344x / 7.71 s /
  2 errors. **HEADLESS Chrome answers `"maybe"` too**, so the suite cannot tell
  the two paths apart: `14 replay`, `15 seek` and `19 flipper` all ran
  `video.src = <m3u8>` on a Chrome that cannot play it — dead picture, green
  suite, because their asserts were about decks and cue folds, not about frames.
  All three now gate on MMS (2026-09-06). Grep for `canPlayType` before trusting
  any HLS page.
- **Safari can close a ManagedMediaSource under you.** Every buffer is dumped.
  MMS also gates loading via `startstreaming`/`endstreaming`.
- **`video.buffered` on MSE is the INTERSECTION of the source buffers.** With
  demuxed audio+video it reads 0.05 s while video holds 5 s. Never diagnose a
  "starved" player without splitting the tracks.
- **Native HLS has no recovery hooks** — no `liveSyncDuration`, no level capping,
  no `hls.latency`. Reload is the only lever, so watchdogs must be hand-built.
- **Audio-only LL-HLS is not lower latency on Cloudflare Stream — it is only
  smaller.** The audio rendition and every video rendition carry the same
  `PART-TARGET=0.5`, the same `PART-HOLD-BACK=1.5`, the same `TARGETDURATION=3`,
  and — the giveaway — the same INDEPENDENT cadence: 11 of 41 parts on BOTH,
  though every AAC frame is independently decodable and audio could mark them
  all. Measured with that packaging: audio-only 3.88 s against video-only
  3.82 s, the same, while the bytes go 418 kbps against 11.8 Mbps. What
  actually costs latency is running BOTH renditions at once (8.8 s on raw
  hls.js) — the demuxed intersection problem `low-latency-player.js` exists to
  fight. `27 tracks` asserts the packaging from the playlists, so the claim
  needs no stopwatch.
- **Cloudflare WHEP refuses a single-track offer.** One recvonly transceiver —
  audio alone or video alone — is `HTTP 400`, both ways, while video+audio
  negotiates in the same second. So "is audio-only WHEP lower latency" has no
  answer to measure on this provider; you cannot subscribe to it.
- **A latency target inside one keyframe interval is unreachable.** Cloudflare
  advertises `PART-HOLD-BACK=1.5` with a 2.0 s GOP, and only one part per segment
  is `INDEPENDENT`.
- **LL-HLS deliberately does not specify how a client picks its live position.**
  Every player invents a policy; that is why this tier is fiddly.
- **A live-edge part 404 is normal.** Separate it with a ceiling; do not silence
  it.
- **Cloudflare mints a new video UID on every encoder reconnect.** Cached media
  URLs 404 afterwards.
- **`-re` is a per-input ffmpeg option.** `-re -i a -i b` paces only `a`.
- **MoQ:** a relay cannot live in a Container (no inbound QUIC — dial-out only);
  IETF `moq-pub` does not interoperate with hang at the catalog layer; but
  browser→relay→browser works today at p50 ~20 ms, with no container and no Rust
  build.
- **MoQ on Safari is blocked for a good reason.** WebTransport shipped in Safari
  26.4 (macOS and iOS) and connects to Cloudflare's relay in 140 ms — but
  `@moq/net` blocks Safari by user agent (`safari: '<0'`) because of
  [WebKit 319818](https://bugs.webkit.org/show_bug.cgi?id=319818): the QUIC
  flow-control window never refills, deadlocking after ~16 MiB or ~7,600
  streams. MoQ opens one stream per group, so that is about two minutes.
  Bypassing it (`08-moq/?transport=force`) is worse than the bug report implies.
  Measured twice, 150 s each on desktop Safari: **6-8 frames total**, first
  stall at 20 s, and **a full page reload with a fresh WebTransport does not
  help** (7 frames then 8). The window refills at roughly one frame per minute
  rather than never. So "reconnect every N seconds" is NOT a workaround — a
  question the published bug report leaves open. Not the encoder either: Safari
  does VP8 720p realtime at 370 fps. MoQ on Safari is unusable today; Safari
  gets WHEP (25 ms measured) instead.
- **Cloudflare's MoQ relay has no WebSocket listener**, so the qmux fallback
  cannot help. `moq-relay` (self-hosted) does, via `[web.http] listen`.
- **An error string cannot tell "API absent" from "API blocked".** `@moq/net`
  emits the same "WebTransport not supported" either way, which is how a claim
  that iOS lacks WebTransport got made without anyone checking `typeof
  WebTransport` on the device. Report the capability, not the error.
- **ManagedMediaSource needs `disableRemotePlayback = true`** (or an AirPlay
  source alternative) or `sourceopen` never fires. There is no published
  low-latency guidance for MMS — native HLS is the documented low-latency path
  on WebKit, which is why the player prefers it there.

- **Stream recording cannot be turned off.** `mode: off` also disables HLS
  playback of a live input, and `preferLowLatency` requires `automatic`, so 06
  and 09 depend on it. Storage is bounded by DELETING recordings; the account
  cap is 1000 storage-minutes and testing adds ~225/day.
  `deleteRecordingAfterDays` minimum is 30 — too coarse to help.
- **`ingest.positron.studio` is the only tokenless write path.** Server-minted
  session ids, per-segment/session/address caps enforced in a DO, 6-hour TTL
  with a cron sweep. `selfrec` stays token-gated; keep the two separate.
- **MediaRecorder output reports `duration: Infinity`**, which leaves a
  transport bar with no range to scrub. Seek far past the end, let the browser
  resolve the duration, then come back.
- **ERR blocks live segments by PROGRAMME, not by age.** The playlists are open
  (200 + `access-control-allow-origin: *`), the segments under `/live/hls/` can
  be 403 with NO ACAO — which reaches a browser as a CORS failure, so hls.js
  holds an empty buffer and the cell just stays black. Swept at 13 points
  across each 2 h window on 2026-09-06: `etv` refused its newest ~45 min,
  `etv2` refused its OLDEST ~78 min and served the edge, `etvpluss` served
  everything. It moves with the schedule and it is not always at the edge, so
  there is no offset to hard-code. A served segment honours Range, so a 2-byte
  GET asks "will you serve this one?" — `19 flipper` sweeps back from the edge,
  starts where ERR will serve, and puts the refused minutes in its readout.
- **A remote `MediaStream` carries the SENDER's msid.** After a hop,
  `remote.id === local.id` and the track ids match too, so "is this the received
  stream or the source?" cannot be answered by id — it is answered by object
  identity against `pc.getReceivers()[i].track`. An id comparison passes
  vacuously in both directions.
- **`candidate-pair` RTT is not media latency.** Quoting WHEP's 25 ms RTT
  beside MoQ's 20 ms glass-to-glass flattered WHEP by ~3x. Measured the same
  way: MoQ p50 26.2 ms, WHEP p50 67.0 ms, and WHEP wins p99.

## Assert both modes, and watch the assert COUNT

A demo that branches must assert every branch on every run. Adding a uniform
mode to 11 grid silently dropped it from 11 asserts to 10 while still reading
green — and worse, because `verify.mjs` presses every control the toggle was ON
at check time, so only 6 of that page's 8 asserts ever ran in the suite.
(11 grid no longer branches: one grid, one quality, 8/8 run.) Diff per-demo
counts against the last known total after any change.

## Conventions

- Demos are `demo/<nn>-<name>/index.html`, deployed at `/<nn>-<name>/`. Order and
  metadata live in `demo/manifest.mjs`; `built: false` hides one from the index.
- Every demo mounts the shell (`demo/shell/shell.mjs`) and publishes
  `window.__demo` — human-openable and CDP-drivable from the same page. Assert on
  `__demo`, never on DOM ids.
- Shared demo code goes in `demo/shell/`, which `build.mjs` **enumerates**. It
  also refuses the build when a page imports a file nothing deploys, and when two
  sources collide on one destination.
- Transport UI is `demo/shell/transport-bar.mjs` and nothing else. Playhead from
  `observePosition`, seek only via `deck.seek()`, rates from intersected
  `caps.rates`.
- Secrets never reach a log. The publisher redacts at the point of capture, so a
  secret split across two stderr chunks is still caught.
- Prefer terse UI. No explanatory prose in demo pages; one line saying what the
  demo does, and a readout of real numbers.
