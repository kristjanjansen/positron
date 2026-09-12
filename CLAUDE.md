# positron

Live at **https://positron.studio**. 30 shelled demos of 35 rows,
**441 asserts** (2026-09-11; `now`'s four are ERR refusing its own live edge,
verified with a 403 probe, not a regression). `scene` is the first WebXR page;
`node demo/verify-quest.mjs` drives it on a real Quest over adb, and
`--self-test` proves its headset guard discriminates with no device attached. The front page is
ordered NEWEST FIRST — `DEMOS` is still the story order and `byNewest()` copies
it, because the index answers "what is new here?" and the sequence answers
"where do I start?". Read
`HANDOFF.md` for current state, `LESSONS.md` for why the rules below exist,
`PROGRESS.md` for what was measured when.

## Run and check

```sh
node demo/server.mjs                     # :8890, serves the repo; / == deployed
node demo/verify.mjs                     # every built demo (CDP, asserts on window.__demo)
node demo/verify.mjs llhls ladder        # just these, by slug
node demo/verify-native.mjs              # THE IPHONE CODE PATH — verify.mjs cannot reach it
node demo/verify-safari.mjs              # desktop Safari over WebDriver, both engines
DEMO_BASE=https://positron.studio node demo/verify.mjs      # against the deploy

cd workers/view && node build.mjs && npx wrangler deploy    # ALWAYS build first
```

`.env` in the cwd shadows machine OAuth. Deploy from a directory without one, or
`env -u CF_API_TOKEN -u CLOUDFLARE_API_TOKEN npx wrangler deploy`.

Device logs from any phone or headset:
`https://pub.positron.studio/logs?format=text`. 🔴 **Those reports used to
evaporate in under a minute** — the ring buffer was an in-memory array on a
Durable Object, so an eviction took it with it. MEASURED 2026-09-12: posted at
02:07:46, read back fine, **gone by 02:08:32**. The failure mode is the worst
shape there is — the device ships correctly, the reader sees
`(nothing reported)`, and the obvious conclusion is that the device never sent
anything, so somebody debugs the device. Persisted to DO storage now and
re-checked at 120 s. **Any "the phone reported nothing" conclusion drawn before
2026-09-12 is worthless.**
Every 06 log opens with `BUILD <sha>-<hhmmss>`, so a report can be attributed.
Clear with `POST /logs/clear`. `GET /status` blocks on the container's cold start
— that is expected, not a hang.

## Finding the box, and where its code actually lives

**Ask port 22, not ARP and not mDNS.** `positron-box.local` does not resolve
from this sandbox (mDNS is multicast UDP), a ping sweep answers nothing useful,
and guessing Raspberry Pi MAC prefixes in `arp -an` missed it outright — the
board was there the whole time. One line finds it in about a minute:

```sh
for i in $(seq 1 254); do (nc -z -G 1 -w 1 192.168.1.$i 22 2>/dev/null && echo 192.168.1.$i) & done; wait
ssh positron@<ip> hostname -s            # it answers `raspberrypi`
```

It also answers over the relay from any network — `node rig/box/ask.mjs --room
studio-1 audio.status` — so **"I cannot ssh to it" is never the same as "it is
down"**, and saying the second because of the first is wrong. Ask the relay
first; it needs no LAN.

⚠️ **The service runs from `/opt/positron-box/`, NOT from `~/positron/`.**
`provision.sh` unpacks into `~/positron` and `setup.sh` copies that to
`/opt/positron-box`, which is what `positron-box.service` executes. The copy in
`~/positron` on the board is stale — it has no `pappus.mjs` at all — so editing
or checking it tells you nothing about what is running. Compare `md5sum` against
`/opt/positron-box/rig/box/` before believing a deploy landed.

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
session: shout spent five seconds buffering an element before its measurement
opened, pushing the whole run past the harness's settle, and vclick awaited a
suspended context and never compiled, never built its deck, never raised its
transport bar — while looking fine, because the readout had been filled at load.
Headless hides it: `--autoplay-policy=no-user-gesture-required` resolves both.
Fire them and move on; sound is allowed to be late, the timeline is not.

**"Is the XR object real" is not "is there a headset", and desktop Chrome is
the proof.** MEASURED while building `verify-quest.mjs`: desktop Chrome has a
genuinely **native `navigator.xr`** — an `XRSystem`, an accessor on
`Navigator.prototype`, every method `[native code]` — and answers
`immersive-vr: false`. So a nativeness test alone passes every laptop, and an
`isSessionSupported` test alone passes a polyfill that claims everything. They
catch disjoint things and BOTH are needed, plus `adb shell getprop` from
outside the browser entirely. The Immersive Web Emulator installs a JavaScript
`XRSystem`, and Meta markets its coverage as "on par with the Meta Quest
Browser" — which is the iPhone mistake in a new accent. `--self-test` runs all
three cases against headless Chrome and needs no device; sabotage
`nativeVerdict` and it goes 3/3 -> 0/3, which is how you know it is not
decoration.

**A second browser of your own is a harness that reads broken.** A full run
went 429/429, then 420/429 with nine failures, then 429/429 again with no code
between them — and all nine were in the three demos that depend on something
outside the machine (`carry`'s relay socket opened 0 times, `shout` read
`peak rms 0.0000`, `now` showed no frames). The cause was two probe Chromes of
mine still holding relay sockets and bandwidth while the suite ran. Re-running
just those three gave 57/57. So **before calling a red run a regression, run the
failing demos ALONE** — it costs a minute and it separates "my change broke it"
from "I was competing with myself", which look identical in the output.

**A harness and a dev server that share a port is a harness that reads broken.**
`node demo/verify.mjs` died with an unhandled `EADDRINUSE` three separate times
in one session because `node demo/server.mjs` was still holding 8890 — each
time looking like a broken suite rather than a busy port. `serve()` now takes
the next free port and says so, and the harnesses read `server.address().port`
rather than the one they asked for. The general form: **a fixed port is a
shared mutable global.** The same bug in a second costume is a fixed CDP port —
`verify-gl.mjs` attached to a Chrome left over from the previous run and
reported that run's flags, which is how a SwiftShader test reported ANGLE
Metal. Let the OS choose and read back what you got.

**A wedged hardware encoder cannot be killed, and looks like broken code.**
`/dev/video11` is a single exclusive V4L2 device, and when it wedges, ffmpeg
sits in uninterruptible sleep: `SIGTERM` does nothing, `SIGKILL` does nothing,
`timeout` does nothing, and `modprobe -r bcm2835_codec` answers "Module is in
use". Three ffmpegs stacked up behind it, each one reading from the outside as
"the encoder produces no bytes". Recovery is a reboot. **Check `pgrep -cx
ffmpeg` before concluding anything about an encode** — and `-x`, never `-f`,
because `pgrep -f h264_v4l2m2m` matches its own ssh command line and answers
"still held" about itself. That is LESSONS #39 in a new costume and it cost
twenty minutes twice.

**Ask the picture the right question.** `mirror`'s "there is a picture in it,
not a flat field" assert failed twice on a vivid kaleidoscope. First it sampled
four points — on an EIGHT-FOLD SYMMETRIC radial image, where any two samples at
similar radius are similar by construction, so it was measuring the symmetry of
the thing it was checking. Then it summed R+G+B over the whole frame and read
`9 of 765`, because the shader's colour is three cosines 120° apart and **three
cosines 120° apart sum to a constant**: the image varies almost entirely in HUE
at near-constant luminance. Per channel, red alone spans 26..254. A statistic
that is constant by construction over your subject is not a weak measurement,
it is a blind one.

**Prove a guard fires.** Break the thing on purpose once. And note `cmd | tail`
reports `tail`'s exit status, not `cmd`'s.

**When you implement somebody else's format, only their implementation can
grade you.** `timeline/csound.mjs` was 22/22 green for months with two real
defects, because the test compared it against a number derived from the SAME
formula the compiler implements — which catches a typo and can never catch a
misreading. Real Csound found both in an hour: the tempo ramp was 239 ms out at
beat 30 (Csound interpolates seconds-per-beat linearly in beat, not tempo), and
`^+x` resolved against the wrong note. The warning comment in that file was
worse than useless — its confident "118 ms early" was the distance between two
WRONG answers. `timeline/lab/csound-oracle.mjs`; it skips cleanly where the
reference is not installed, because a check nobody can run is a check nobody
runs.

**A partial result that is too tidy is a broken collector, not a finding.**
Exactly 4 of 5 events, exactly 0 across every case, exactly nothing on the
network scan. In one session: csound writes ANSI escapes so `grep '^EVT'` lost
most lines; `execFileSync` returns only stdout while csound's `prints` go to
stderr; and `.local` names do not resolve at all from this sandbox because mDNS
is multicast UDP. Check the instrument before believing the pattern.

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

- **The Ableton rig is PARKED (2026-09-11) and it is parked working — 11/11.**
  Not broken, too heavy: six things must be true before a note sounds and
  **four are Preferences clicks with no API**, including Live's audio output
  device, which the Live Object Model cannot set. A capture started over ssh is
  deaf, so its relay agent must live in a login session — the box is a service
  that dials out on boot, this is a performance instrument you wake on purpose.
  `rig/pro-instrument/README.md` has the measurements, the two traps and the
  revisit order. `/rack/` stays live and reports silence AS silence.
- **An avfoundation device INDEX is a shared mutable global, exactly like a
  fixed port.** `ffmpeg -f avfoundation -i ":0"` meant the microphone when
  `rig/pro-instrument/README.md` was written and means **BlackHole** today —
  and both read **-91.0 dB**, where one reading proves "this capture is deaf"
  and the other proves "nothing is playing", which are opposite conclusions
  from an identical number. The README's own deafness control had been
  measuring the wrong device. Resolve by NAME from
  `-list_devices true` every time; `rig/pro-instrument/live-check.mjs` does.
- **WebXR, MEASURED on a Quest 3 (Browser 150.1 / Chromium 150, Adreno 740),
  2026-09-12.** The framebuffer is **3360x1760, two views, 1680x1760 per eye**,
  and `scene` holds **89.8 fps** in it — full rate. The 2D window really is
  **1280x670 CSS at dpr 1**. `session.frameRate` is **not reported**. The user
  agent says **"Quest 3" on a 3S**, which is the empirical form of the claim
  that the two cannot be told apart. **Passthrough works and is real**:
  `immersive-ar` reports `environmentBlendMode: alpha-blend` and holds
  **90.0 fps** — the same as VR's 89.8, so compositing over the room costs
  nothing measurable here.
- 🔴 **`alpha: false` on the WebGL context makes passthrough impossible.** The
  compositor puts the real room behind the page and can only do that through
  transparent pixels; with no alpha there is nothing to clear to zero and the
  room is replaced by black instead of composited under. And **assert on
  `environmentBlendMode`, never on the session name** — a session can be called
  `immersive-ar` and still composite `opaque`, which presents as a drawing bug
  rather than a session one.
- 🔴 **`session.renderState.baseLayer` is NULL until the next animation frame.**
  `updateRenderState()` queues; it does not apply. Reading
  `baseLayer.framebufferWidth` one line after creating a session throws a
  TypeError — which cost three headset runs, because the throw escaped the
  handler and so the render loop, the exit-on-any-button and the bail-out timer
  were ALL never registered. Session live, nothing drawing, no way out, no log
  line. Read the layer inside `requestAnimationFrame`, where it exists.
- **Instrument the entry path BEFORE guessing at it.** Those three runs were
  indistinguishable from outside; what separated them was a line shipped before
  and after every await, with a deadline turning a hang into a named failure.
  ⚠️ And the lines that say where something hung **cannot be on a batched
  shipper** — `createShipper` holds for 2 s, and entering an immersive session
  is exactly when timers stop being generous. `navigator.sendBeacon` survives
  it. The uncaught-error handler has to use it too, or the net meant to catch a
  silent failure is itself waiting on the timer that stopped.
- **Anything immersive needs a way out that the PAGE owns.** Any controller
  button ends the session, plus a dead-man's switch that ends it if nothing has
  been drawn after 4 s. "Press the Meta button" is not an answer a page gets to
  give about its own bug.
- **`gl.clear` ignores the viewport.** Both eyes share one framebuffer, so a
  clear on the second view wipes what the first drew — black. Only the first
  eye clears; the rest clear DEPTH inside a `gl.scissor`, or the second eye
  tests against the first eye's depths. A viewport is not a clip region.
- **`bindAttribLocation` only takes effect at the NEXT link.** Called after
  `linkProgram` it is a no-op that reads like a fix; the Quest reported
  `GL_INVALID_OPERATION` (1282) on its first frame and **drew correctly
  anyway**, because the linker happened to choose the same slots. A page will
  render a right-looking picture with an error pending, so assert on
  `gl.getError()`.
- **iPhone Safari has NO element Fullscreen API.** Not `requestFullscreen`,
  not `webkitRequestFullscreen` — the only thing that fills an iPhone screen is
  a `<video>`, via the non-standard `HTMLVideoElement.webkitEnterFullscreen()`.
  iPad is different (iPadOS carries the prefixed element API), so **"iOS" is the
  wrong unit** and the capability has to be asked, not branched on by platform.
  `mirror`'s ⛶ did nothing at all on an iPhone because `p.requestFullscreen?.()`
  **optional-chains straight past a missing method**: no throw, no `catch`, no
  log line, no picture — optional chaining is an excellent way to build a
  control that looks live and is inert. `demo/shell/fullscreen.mjs` tries the
  real API, falls back to a `position:fixed` cover that needs no API, and says
  which ran. ⚠️ **Style it with a CLASS, never `:fullscreen`** — a browser that
  does not know that pseudo-class discards the entire selector list it appears
  in, so `.pane:fullscreen, .pane.d-full { … }` would delete the fallback on
  precisely the browsers that need it. And the utility needs (0,2,0): MEASURED,
  a bare `.d-faux` lost to a page's own `.pane { position: relative }` on source
  order and the cover stayed 338px wide inside its grid.
- **A long press on a control raises the iOS text LOUPE, and `user-select:
  none` does not stop it.** `-webkit-touch-callout: none` is the one that does.
  Photographed on `/box/` and `/mirror/`: the magnifier over the piano keys and
  selection handles dragged across a readout. Controls and keys now carry it
  along with `touch-action: manipulation`, which also drops the 300 ms
  double-tap wait so a key sounds when it is pressed. Prose, readouts and the
  log stay selectable — copying a number out of those is a real thing to want.
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
  the two paths apart: `replay`, `seek` and `flipper` all ran
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
  fight. `tracks` asserts the packaging from the playlists, so the claim
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

- **Stream recording cannot be turned off — ON THE RTMPS PATH.** `mode: off`
  also disables HLS playback of a live input, and `preferLowLatency` requires
  `automatic`, so 06 and 09 depend on it. **WHIP ingest is the opposite and the
  unqualified rule has already misled a plan once: WHIP RECORDS NOTHING** —
  direct-tested, 183 s against a recording-ENABLED input, 26 polls, zero assets.
  Stream-WebRTC is delivery-only, so a WHIP source costs no storage minutes and
  cannot be archived server-side either; whatever records it must do so itself. Storage is bounded by DELETING recordings; the account
  cap is 1000 storage-minutes and testing adds ~225/day.
  `deleteRecordingAfterDays` minimum is 30 — too coarse to help.
- **Stream bills MINUTES, not bytes, and from 2026-10-15 WebRTC bills too.**
  $1 per 1,000 minutes delivered on both protocols — "regardless of protocol"
  (GA notice 2026-09-08; this account delivered 246 WebRTC minutes in 30 days,
  ≈$0.25). Three consequences that are not the price. **Buffering is billable**
  and HLS minutes round up to the segment, which is the GOP — 2.0 s here — so a
  visitor who leaves after two seconds is billed for the ~3 segments hls.js
  prefetched (`liveSyncDurationCount: 3`, read from the bundled build) and for
  ~2 s on WHEP. **An idle broadcast costs nothing on WHIP and storage on
  RTMPS**, because recording cannot be turned off there. And **the 1000-minute
  cap blocks new live streams when it fills** — at ~225 min/day that is 4.4
  days, so the RTMPS path's real cost is an outage, not a bill. Because the
  meter is duration, `tracks`' 28x byte saving (418 kbps against 11.8 Mbps) is
  worth exactly $0 on this provider: audio-only is an argument for the viewer's
  connection, never for the account. Recording and HLS interop for WHIP are
  announced "in the coming months" and are NOT shipped — re-test before
  planning either way.
- **A Durable Object's OUTBOUND client WebSocket hands binary over as a
  `Blob`**, not an `ArrayBuffer` — measured `Blob`, `size` 9, `byteLength`
  undefined — and a `Uint8Array` binds to a SQLite `BLOB` column as an EMPTY
  one, silently. So a recorder can look like it stored a frame while the row
  reads back at 0 bytes with its hex head blank. `await data.arrayBuffer()`
  first, and bind the ArrayBuffer. A BLOB also comes back OUT as an
  ArrayBuffer, which has no useful `.slice()` and no iterator — wrap it before
  reading it. (`workers/backlog`, 2026-09-09.)
- **A DO's input gate does NOT cover a non-storage await.** Events are held back
  across a `storage.get`, so handlers cannot interleave there — but
  `blob.arrayBuffer()` is not storage, and two frames a millisecond apart will
  race each other into a table in the wrong order. Where order IS the product,
  serialise the handler through one promise chain.
- **The relay's own token bucket is readable off the wire**, and it is exact:
  at both 120 and 300 msg/s, three runs delivered **298 messages in three
  seconds** — `MSG_BURST` 120 plus 3 s at `MSG_PER_SEC` 60. The sender is told
  NOTHING when this bites: no error, no close, no backpressure. Only a
  per-connection counter in the payload can see it. The Durable Object hop
  itself costs **1–2 ms at p50** over the runtime's `ping`/`pong` autoresponse,
  and a full 16-socket room costs the sender **8 ms at p50** over an empty one
  with zero loss (`demo/perf-wire.mjs`).
- **`ingest.positron.studio` is the only tokenless write path.** Server-minted
  session ids, per-segment/session/address caps enforced in a DO, 6-hour TTL
  with a cron sweep. `selfrec` stays token-gated; keep the two separate.
- **MediaRecorder output reports `duration: Infinity`**, which leaves a
  transport bar with no range to scrub. Seek far past the end, let the browser
  resolve the duration, then come back.
- **The same suite read 425/429 and then 429/429, forty minutes apart, with no
  code between them.** All four failures were `now`, all downstream of frames
  never arriving, and a single two-byte range GET on the live edge segment
  answered **403 with no ACAO** while the playlists beside it were fine. So
  before treating a red `now`/`flipper` as a regression, ASK ERR — one range
  request separates "our code broke" from "the schedule moved", and they look
  identical from the harness.
- **ERR blocks live segments by PROGRAMME, not by age.** The playlists are open
  (200 + `access-control-allow-origin: *`), the segments under `/live/hls/` can
  be 403 with NO ACAO — which reaches a browser as a CORS failure, so hls.js
  holds an empty buffer and the cell just stays black. Swept at 13 points
  across each 2 h window on 2026-09-06: `etv` refused its newest ~45 min,
  `etv2` refused its OLDEST ~78 min and served the edge, `etvpluss` served
  everything. It moves with the schedule and it is not always at the edge, so
  there is no offset to hard-code. A served segment honours Range, so a 2-byte
  GET asks "will you serve this one?" — `flipper` sweeps back from the edge,
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
mode to grid silently dropped it from 11 asserts to 10 while still reading
green — and worse, because `verify.mjs` presses every control the toggle was ON
at check time, so only 6 of that page's 8 asserts ever ran in the suite.
(grid no longer branches: one grid, one quality, 8/8 run.) Diff per-demo
counts against the last known total after any change.

## Conventions

- Demos are `demo/<slug>/index.html`, deployed at `/<slug>/`. **A demo's identity
  is its slug and its ORDER is its position in `DEMOS`** — there is no number in
  the directory, the URL, or the page. There used to be, in five places at once,
  and keeping them in step is what made reordering expensive enough to get
  wrong: the 05/28 swap left one page still declaring its old number inside its
  own `mount()`, which only the full sweep caught. Moving a demo is now moving a
  line in the array. `built: false` hides one from the index.
- Every demo mounts the shell (`demo/shell/shell.mjs`) and publishes
  `window.__demo` — human-openable and CDP-drivable from the same page. Assert on
  `__demo`, never on DOM ids.
- Shared demo code goes in `demo/shell/`, which `build.mjs` **enumerates**. It
  also refuses the build when an import has no deployed file, and when two
  sources collide on one destination. **It scans modules, not just pages** — it
  read HTML only until 2026-09-07, and in that gap `demo/shell/moq.mjs` kept
  importing `/08-moq/moq-vendor.js` across the slug rename: a 404 that killed
  the module, so `moq` and `ladder` asserted NOTHING and read red for a reason
  that was true but not theirs (no relay on this network). **A rename moves
  URLs that live in modules, harnesses and comments, none of which are
  type-checked — grep the OLD form everywhere.** The same rename left
  `verify-native.mjs` pointed at a 404, which is the iPhone path.
- **What a demo REQUIRES is read off its `tags`, never listed twice.**
  `demo/shell/caps.mjs` maps a tag to a capability (`WebGL2` -> `webgl2`,
  `getUserMedia` -> `camera`), probes this browser once, and un-links rows the
  browser cannot run **with the reason in words** — a vanished row says the
  demo does not exist, which is a different and false statement. Three rules
  the file exists to hold: it is a **capability test, never a user-agent
  check** (a headset browser is Chromium, and research/quest-xr §1.7 measured
  that a Quest 3 and a 3S are indistinguishable by UA); a probe that could not
  answer returns **`unknown`, which never blocks**, because "we did not look"
  must not read as "it is missing"; and `midi` is deliberately soft, since
  `instrument` keeps playing from its on-screen keys. Proved by breaking it:
  the same page under `--disable-gpu` un-links `mirror` with *"this browser
  draws no 3-D"* and links it with the GPU on.
- **The generated test picture is `demo/shell/pattern.mjs` and nothing else.**
  Six demos draw it and `src/publish.sh` generates its ffmpeg filter by calling
  it; `workers/pub/container/server.mjs` holds a marked copy because that image
  is one `COPY` with nothing to import — change one, change the other, and diff
  the y/size/colour table afterwards. **After ANY move of `ROW`, re-run burn →
  `readBurned`** (600/600 exact through three moves); it is the only thing
  between a layout tweak and a stream nothing can read. The field is NEVER
  tinted — a warm hue at low saturation and low lightness is mud at any alpha —
  so colour lives in the labels, the sweep square and the strip lane, inside a
  100° band on `--hi`. One `PAD` off every edge. A camera is CONTAINED, never
  covered or stretched: iOS ignores a resolution request and returns portrait,
  where stretching squashes a face and cover shows 32% of the frame.
- Transport UI is `demo/shell/transport-bar.mjs` and nothing else. Playhead from
  `observePosition`, seek only via `deck.seek()`, rates from intersected
  `caps.rates`.
- **One meaning for colour across every demo.** A mark's colour says HOW IT
  LANDED, never which lane it is in — lane identity is the row, the label and
  the gutter swatch, three channels that already carry it. Grey = not played,
  slate = played and this lane cannot say how well, green = inside what its way
  of firing promises, amber/red = later. "Played, unmeasured" gets its own
  colour rather than borrowing green: colouring an unchecked thing as if it
  passed is an assertion nothing made.
- **A number belongs to the lane that can answer for it.** Report each lane's
  error against the score, not against another lane; every pairwise gap is a
  subtraction away. Give every lane a row even when it has nothing to say, and
  let it say so in words — a blank cell collapses "we did not look" and "we
  looked and it was fine". Never let a lane with no feedback count as 0 in an
  aggregate: it must not be able to improve the score.
- **A count is only evidence on the far side of the boundary.**
  `createMidiLane`'s `scheduled()` counted what the page QUEUED and read
  identically to delivery — while every note was being scheduled fifty-six
  years out. Ask which side of the wire a counter is counted on before quoting
  it.
- **A background agent must not commit.** `git add -A` in a shared checkout
  sweeps another agent's in-flight work into an unrelated commit. It happened
  twice in one session: `timeline/score.mjs` and `csound.mjs` — the whole score
  container — landed inside a commit about `loops`, and `04-score/index.html`
  inside one about a plan document. The code was right and the history lied
  about it, which is worse than either being wrong on its own, because a reader
  doing archaeology trusts the message. Repaired with `git notes` rather than a
  rewrite, since one agent still held uncommitted work in a file the rewrite
  would have touched. **Agents report; the session commits.** And when a commit
  must be made while an agent is running, stage the paths by name — never
  `git add -A`.
- Secrets never reach a log. The publisher redacts at the point of capture, so a
  secret split across two stderr chunks is still caught.
- **Write for someone who does not work here.** Terse, but understandable —
  those are not in tension, and the old rule ("no explanatory prose, one line
  and a readout") produced pages that only their author could read. A demo page
  carries two things: **ONE paragraph of three or four sentences** saying what
  happens, how it is done and what the numbers mean — and a readout of real
  numbers. It was a lead line plus a second `d.how()` paragraph until
  2026-09-08; two blocks meant the lead said too little and the mechanism went
  unread. `d.how()` is gone; put it all in `what`.
- **No jargon in anything a visitor sees.** Not in `what`, not in `how`, not in
  a readout key, not in `manifest.mjs`'s `one` line. Banned unless the page
  defines it on the spot: lookahead, horizon, one-shot, tick, host, commit,
  actuate, lattice, deck, lane, fold, adapter, evidence gate. Say what it does,
  not what it is called internally. `drift` survives only because it is a
  readout key with a sentence under it explaining it is lateness in
  milliseconds, and that it is NOT stream latency — a reader assumed exactly
  that, which is what prompted this rule.
- **A constant belongs beside the thing it governs, not in a header.** `how()`
  took a spec line of real values (`looks 100 ms ahead · re-checks every 25 ms`)
  on the theory that constants beat prose. They do — when someone is looking for
  them. Above a paragraph they are one more thing to parse before reaching the
  sentence that says what is going on. The numbers now sit under the lane whose
  behaviour they describe, in the strip's gutter. Wherever a number IS printed,
  read it from the same constant the page hands the library, never typed twice:
  a description that can disagree with the config is worse than none.
- **Per-lane numbers go in that lane's gutter** (`subLabel`), never in a
  separate table or a readout row. Joining a figure to its ink across two
  elements is what makes a legend necessary; put them together and it is not.
- **A gutter carries what its lane MEASURED, never instructions.** `typical
  +1.20 ms` / `worst +2.90 ms`, or an honest `no way to check` — not "press
  Record", not "drag the line". Help text belongs in the one `how()` paragraph,
  and if a reader still cannot tell what to press, fix the control's LABEL.
  Instructions in a gutter crowd out the numbers, repeat the paragraph above,
  and do not fit. **Anything that truncates with an ellipsis is in the wrong
  place** — that is the signal, not a styling problem to widen your way out of.
- **A tooltip is two or three short lines, never a sentence.** It is drawn ON
  TOP of the thing it describes and is read every time you point at one, so a
  paragraph there covers the picture and gets re-read twenty times. Budget
  ~40 characters a line: what it is, the number, the mechanism. Explanation
  goes in the `how` block, which is read once. `1.20 ms late · as expected` /
  `timer set ahead`, not `A timer was set for it in advance. Those land
  within a few ms.`
- **Every readout cell must be able to change.** A cell showing a structural
  constant reads as a measurement and teaches the reader to ignore the row.
  01's `missed` count was always 1 — the mark due at position 0 can never have
  a timer — so it became `worst`, which moves. Prefer median AND max over
  either alone: a median hides the one bad fire that is the reason to look.
- **A colour scale whose normal reading is a warning has no warning left.**
  Calibrate against what the mechanism promises, not against an absolute
  ideal. 01 first painted 18 of 20 marks amber on a loaded machine, against a
  5 ms threshold — while the lab measures the shipped worker host at p50
  5.0 ms, so the DOCUMENTED BASELINE was amber. Colour and words must come
  from one table, so a green bar can never be described in language that
  sounds like a failure.
- **One position surface per page.** A page with a strip passes
  `createTransportBar(…, { scrub: false })`: two horizontal time axes at
  different scales, stacked, is not a redundancy but a contradiction. The
  strip already seeks on press AND on drag, which the bar's slider did not.
