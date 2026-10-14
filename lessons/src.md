# src

Comments cut from the code on 2026-10-14 and kept here verbatim, so the code can say in one to three lines what it cannot say itself. Each `why:` pointer in the code names one heading below.

## `src/low-latency-player.js`

### player-header

Above `const DEFAULTS = {`, lines 1 to 101 before the cut.

~~~js
/**
 * Low-latency HLS player for Cloudflare Stream.
 *
 * Wraps hls.js with the configuration and recovery behaviour a live player
 * needs against Cloudflare LL-HLS. Everything here exists because a specific
 * failure was observed in testing:
 *
 *  1. hls.js picks a live-edge position ONCE and, by default, has no recovery:
 *     `maxLiveSyncPlaybackRate` is 1 and `maxLatency` is Infinity. Any startup
 *     hiccup parks the player at an arbitrary latency forever. Measured on the
 *     same stream, same config: 7.6 s one run, 15.4 s the next.
 *
 *  2. Cloudflare mints a NEW video UID behind the live-input URL on every
 *     encoder reconnect — even a 2-second one. The playing level becomes a
 *     dead timeline: `liveSyncPosition` goes stale (it can even move
 *     backwards), and seeking can never help. Only a full reload recovers.
 *
 *  3. A page opened before the broadcast exists gets a fatal
 *     `manifestParsingError`. Patching up a live Hls instance afterwards
 *     (stopLoad/loadSource/startLoad) leaves it wedged: no errors, no loads,
 *     no recovery. The only reliable reset is destroying the instance and
 *     building a new one — the programmatic page-refresh.
 *
 * Recovery model:
 *   latency drift      -> nudge playbackRate (invisible), else seek (one skip);
 *                         repeated silent seek failures escalate to a rebuild
 *   player stall       -> seek; after N failed seeks, full rebuild
 *   element starved    -> readyState < 2 with the clock still counting:
 *                         hole-skip to the next buffered range, else rebuild
 *   source stall       -> live edge stopped advancing: full rebuild
 *                         (seekable-end check from elektronstudio/v4)
 *   fatal hls error    -> media-error quick fixes, else full rebuild
 *   no stream yet      -> rebuild on a steady cadence until it exists
 *   tab became visible -> seek to live edge (hidden tabs always come back stale)
 *
 * v14: three fixes to the native path, all found by driving DESKTOP SAFARI
 * over WebDriver (demo/verify-safari.mjs) — a browser the CDP harness cannot
 * reach at all. Native HLS plays at exactly 1.000x sustained; what looked
 * like 0.29x was the aftermath of v13's own source watchdog reloading a
 * healthy stream, because under native HLS currentTime does not share a
 * timeline with seekable. The watchdog now needs BOTH frozen, telemetry no
 * longer hides behind getStartDate(), and bufferReport says null rather
 * than 0 when it cannot tell.
 *
 * v12: PREFER NATIVE HLS ON IPHONE. The old check only fell back to native
 * when hls.js was UNSUPPORTED, which was a correct proxy for "iPhone" until
 * iOS 17.1 added ManagedMediaSource — after which Hls.isSupported() returns
 * true there and the fallback silently stopped firing. So the one platform with
 * a first-class native HLS stack (AVFoundation, hardware decode, Apple's own
 * LL-HLS) was being put on the MMS path, where Safari closes the MediaSource
 * under us and dumps every buffer. Now decided on the real question, and
 * overridable with preferNative for a same-numbers A/B.
 *
 * v11: startFragPrefetch + initialLiveManifestSize 3 + startOnSegmentBoundary,
 * the three hls.js knobs that all default against us and all push the same way:
 * begin with more material, on a boundary. These target the one failure here
 * that is really hls.js — its audio controller starting behind the main one.
 * UNCONFIRMED on a device as of writing; the startup gate in v10 is the
 * belt-and-braces version of the same idea and stays either way.
 *
 * v10: do not play until the AUDIO/VIDEO intersection is playable, and do not
 * let the starved watchdog seek over an audio-only shortfall. Cloudflare lands
 * audio seconds behind video at startup; video.buffered is the intersection,
 * so the element had 0.05 s to play while video held 5 s. Playing there stalls,
 * the seek that follows opens a hole, and the hole outlives the lag. The lag
 * itself is transient — advance recovers to 1.0 and stays.
 *
 * v9: cap the rendition on ADVANCE. capLevelOnFPSDrop keys on dropped frames
 * and the stuttering iPhone drops 3 of 507 — it advances the media clock at
 * 0.16-0.41x with 5-10 s buffered and the edge moving at 1.0x. Frames are not
 * discarded; time crawls. Also recorded: on that device AUDIO carries holes
 * that video does not, and video.buffered being their intersection inherits
 * them.
 *
 * v8: a drift-seek must earn itself — minimum interval, minimum buffered
 * runway, and it yields by RAISING the target when the device proves it
 * cannot hold one. Setting currentTime aborts in-flight fragment loads, and
 * on an iPhone that abort-per-seek loop ran every 2-3 s for two minutes and
 * was itself the jerkiness. Smooth at 8 s beats jerky at 6 s.
 *
 * v7: liveSyncSeconds overrides PART-HOLD-BACK, because a target inside one
 * keyframe interval is structurally unreachable (measured: 1 INDEPENDENT part
 * per 2.0 s segment) and chasing it is the iOS jank. Level switches are now
 * reported. Also observed and deliberately NOT acted on: Cloudflare emits
 * non-monotonic EXT-X-PROGRAM-DATE-TIME during startup (56.935 -> 56.604,
 * i.e. 331 ms backwards), which only matters here if pdtDriftTrigger is on —
 * it is off by default.
 *
 * v6: split the paused/readyState tick gate (re-play() when visible; starved
 * hole-skip with the stall clock left counting — fixes the measured 18.5–20 s
 * readyState-1 park after same-broadcast resumes), escalate repeated silent
 * drift-seek failures to a rebuild, play() on visibility resync, PDT wall
 * latency in telemetry (+ optional flag-gated PDT drift trigger, default off).
 *
 * Usage:
 *   const player = createLowLatencyPlayer(videoEl, manifestUrl, opts?);
 *   player.on('latency', ({latency, target}) => …)   // ~2/s while playing
 *   player.on('dimensions', ({width, height}) => …)  // before first frame
 *   player.on('rebuild', ({why, attempt}) => …)
 *   player.destroy();
 */
~~~

### drift-seek

Above `minDriftSeekMs: 10000,`, lines 104 to 121 before the cut.

~~~js
/**
 * A DRIFT-SEEK IS NOT FREE. Setting currentTime aborts every in-flight
 * fragment load, and the abort is what stops the buffer from ever growing.
 *
 * Measured on an iPhone (iOS 18.7, Safari 26.6.1, ManagedMediaSource,
 * Safari gating loads): RESYNC drift fired every 2-3 s for two solid
 * minutes, each one immediately followed by "ERR aborted" on BOTH tracks.
 * Latency oscillated across the trigger — 8.25 -> seek -> 6.90 -> 8.34 ->
 * seek — and some seeks went out with buf=0.02, i.e. with no runway to land
 * on, which guarantees the stall it was trying to cure. The jerkiness was
 * this control loop, not the stream: the publisher A/B was clean and the
 * page had segments 0.8 s after asking.
 *
 * So a drift-seek now has to earn itself three ways: enough time since the
 * last one, enough buffered runway to survive it, and a target that the
 * device has not already proved it cannot hold.
 */
/** Never drift-seek more often than this (ms). */
~~~

### advance-floor

Above `advanceFloor: 0.8,`, lines 129 to 140 before the cut.

~~~js
/**
 * Step the level down when the playhead cannot keep up with wall time.
 *
 * hls.js's own capLevelOnFPSDrop is enabled below, but it is INERT for this
 * failure: it keys on droppedVideoFrames, and the iPhone that stutters drops
 * almost nothing — 3 frames out of 507. What it does instead is advance the
 * media clock at 0.16-0.41x while the live edge advances at 1.0x and 5-10 s
 * sit buffered. Frames are not being discarded; time itself crawls.
 *
 * So cap on the symptom that is actually present. Below this ratio, for this
 * many consecutive ticks, drop one rendition.
 */
~~~

### start-buffer

Above `startBuffer: 1.0,`, lines 143 to 155 before the cut.

~~~js
/**
 * Do not start playing until there is a real INTERSECTION to play.
 *
 * Measured on desktop Chrome and on iOS alike: at startup Cloudflare lands
 * the AUDIO track seconds behind the video track —
 *   video [[2.83,4.83],[8.83,21.83]]   audio [[2.85,3.36],[8.84,16.84]]
 * — and video.buffered is their INTERSECTION, so the element had 0.05 s to
 * play while video held 5 s. Playing there stalls at once, the starved
 * watchdog seeks to the edge, and THAT seek leaves a 5.5 s hole (3.36->8.84)
 * which was still visible as an orphan range 40 s later. The lag is
 * transient — advance climbed 0.26 -> 1.0 by t=36 s and stayed — so the whole
 * stutter is a startup cascade that begins with playing too early.
 */
~~~

### audio-lag

Above `audioLagTicks: 12,`, lines 158 to 162 before the cut.

~~~js
/**
 * Ticks the starved watchdog waits before seeking, when the shortfall is
 * AUDIO ONLY (video has data past the playhead, the intersection does not).
 * Seeking forward cannot make an audio segment arrive; it only opens a hole.
 */
~~~

### live-sync

Above `preferNative: 'auto',`, lines 170 to 195 before the cut.

~~~js
/**
 * Latency target in seconds, OVERRIDING the manifest's PART-HOLD-BACK.
 *
 * Cloudflare advertises PART-HOLD-BACK=1.5 with PART-TARGET=0.5, but
 * measured on our own stream (2026-09-04) only ONE part per segment carries
 * INDEPENDENT=YES — 10 of 38 — because our GOP is 2.0 s. So the player can
 * APPEND at 0.5 s granularity but can only START DECODING every 2.0 s. A
 * target inside one keyframe interval is unreachable: it overshoots, nudges
 * at catchUpRate, crosses seekThreshold, resyncs, and repeats. That loop is
 * the iOS jank.
 *
 * The publisher was ruled out FIRST, not assumed: the container and this Mac
 * publishing the identical command both gave segment inter-arrival jitter
 * 0.40 and EXTINF sd 0.003 s (2.000-2.021). Encoder starvation wobbles
 * declared durations; these do not.
 *
 * 3.0 s == 1.5 GOPs. hls.js honours this only when passed at construction
 * (its targetLatency getter tests hls.userConfig.liveSyncDuration).
 * Set null to obey whatever the manifest advertises.
 */
/**
 * Which player: 'auto' (default), true to force native HLS, false to force
 * hls.js. 'auto' picks native only where it is clearly better — an iPhone,
 * detected as "native HLS available and no plain MediaSource". See the
 * decision block in the body for why the old check stopped working.
 */
~~~

### pdt-trigger

Above `pdtDriftTrigger: false,`, lines 219 to 223 before the cut.

~~~js
/** Also fire the drift-seek off PDT wall-clock latency. OFF by default:
 *  hls.latency freezes stale during socket-open ingest pauses (measured
 *  1.7 s reported vs 8.4 s true) and PDT is the only honest signal there —
 *  but a wall-lag with nothing buffered ahead is player-irreducible, so the
 *  trigger also requires liveSyncPosition to be usefully ahead. */
~~~

### which-player

Above `const nativeHls = !!video.canPlayType('application/vnd.apple.mpegurl');`, lines 235 to 248 before the cut.

~~~js
// ---- which player? ------------------------------------------------------
//
// This used to read `if (!Hls.isSupported() && canPlayType(hls))`, which was
// a correct proxy for "this is an iPhone" only while iPhone had NO MSE at all.
// iOS 17.1 added ManagedMediaSource, so Hls.isSupported() now returns TRUE
// there and the check silently stopped firing — putting the one platform with
// an excellent native HLS stack (AVFoundation, hardware decode, and Apple's
// own LL-HLS implementation) onto the MMS path instead, where Safari closes
// the MediaSource under us and every buffer is dumped.
//
// So decide on the real question. Native HLS available AND no plain
// MediaSource is exactly iPhone: macOS/iPad Safari have both and keep the
// hls.js path (which gives us level capping and latency control), Chrome has
// MediaSource and no native HLS.
~~~

### native-gate

Above `const webkitMedia = typeof self !== 'undefined' && !!self.ManagedMediaSource;`, lines 251 to 283 before the cut.

~~~js
// ANY browser with native HLS, not just iPhone. The first version of this
// required onlyManagedMse, which excluded macOS Safari because it has a plain
// MediaSource too — on the theory that hls.js is worth having wherever it
// works, for the level capping and latency control.
//
// Measured on desktop Safari 26.6.2 over WebDriver, same page, same 40 s:
//
//             native      hls.js
//   advance    0.961x      0.344x
//   latency    5.25 s      7.71 s
//   errors     0           2 (aborted at 4.7 s, levelLoadTimeOut at 40 s)
//   buffered   contiguous  hole [[16,18.01],[20.01,26.5]]
//
// The hls.js log also showed "resynced to the live edge" at 4741 ms and
// "aborted" at 4751 ms — the drift-seek killing its own fragment loads, 10 ms
// apart. Control we cannot use well is worth less than a player that works,
// so WebKit gets AVFoundation. Chrome and Firefox have no native HLS, so this
// leaves them on hls.js without needing a browser check.
// THE GATE IS ManagedMediaSource, not canPlayType.
//
// canPlayType('application/vnd.apple.mpegurl') returns "maybe" in BOTH Safari
// and Chrome (measured on both, 2026-09-05) — so it cannot tell them apart at
// all, and using its truthiness put Chrome on the native path, where it cannot
// play HLS and the whole suite broke. ManagedMediaSource is WebKit-only:
//
//                      ManagedMediaSource   MediaSource
//   Safari macOS              true             true
//   Safari iOS                true             false
//   Chrome                    false            true
//
// So it is a capability test for "Apple's media stack is here", which is
// exactly the thing worth preferring, with no brand sniffing. Safari older
// than 17.1 has no MMS and keeps hls.js — the previous behaviour.
~~~

### hoisted

Above `let advEma = null, edgeEma = null, lastAdvT = 0, lastAdvCt = -1, lastEdgeV = -1;`, lines 294 to 300 before the cut.

~~~js
// Rate-measurement state, hoisted HERE on purpose. It used to sit beside
// measureRates() further down, which is AFTER the native-HLS branch returns —
// so on an iPhone the declarations never executed and the native path's own
// interval threw "Cannot access 'lastAdvT' before initialization" every tick.
// The page showed nothing. Local verify could not catch it: desktop Chrome
// never takes that branch. State both branches share must be declared before
// either branch can return.
~~~

### freeze

Above `function freezeFrame() {`, lines 338 to 343 before the cut.

~~~js
/**
 * Freeze the last decoded frame into the element's poster before teardown,
 * so a rebuild shows a still image instead of flashing black. MSE-fed video
 * does not taint the canvas (hls.js fetches media via CORS), so this is safe
 * on the hls.js path; a tainted canvas (native src fallback) just skips.
 */
~~~

### rebuild

Above `let lastRebuildAt = 0;`, lines 355 to 360 before the cut.

~~~js
/**
 * Tear the Hls instance down and build a fresh one. Deliberately blunt:
 * every observed wedge (dead level after UID swap, instance stuck after
 * manifestParsingError) recovers under a full rebuild and under nothing
 * weaker. State that must survive lives outside boot().
 */
~~~

### frag-retry

Above `levelLoadingMaxRetry: 4,`, lines 410 to 414 before the cut.

~~~js
// Fragment retries: moderate. At the LL-HLS live edge a brief part 404
// is NORMAL (players request parts as they are born) — v4's fail-fast
// (1 retry) turned that churn into fatal->rebuild storms that crashed
// the tab. But v3's slow default backoff took 3-5 min to surface a real
// swap. Middle path: a few quick retries, tight timeout cap.
~~~

### fps-drop

Above `capLevelOnFPSDrop: true,`, lines 421 to 426 before the cut.

~~~js
// MEASURED on an iPhone: with 5-7 s buffered and loading keeping up at
// ~0.9x, the playhead advanced 0.94 s in 4.04 s of wall time — 0.23x
// realtime on the 1280x720 rendition. Loading was never the problem;
// presentation was. hls.js has exactly this control: FPS_DROP watches
// droppedVideoFrames against decoded and steps the level down when the
// ratio exceeds fpsDroppedMonitoringThreshold. Off by default.
~~~

### start-aligned

Above `// Fetch the first fragment before media attach, so both loaders are`, lines 429 to 440 before the cut.

~~~js
// ── starting with enough material, aligned ───────────────────────
// The one failure in this file that is genuinely hls.js behaviour is
// that its AUDIO stream controller starts after the main one and
// trails at the live edge. video.buffered is the INTERSECTION of the
// source buffers, so the element gets 0.05 s to play while video holds
// 5 s. All three knobs below default AGAINST us and all three push in
// the same direction: begin with more material, on a boundary.
//
// Defaults read off the bundled 1.7.1, not recalled:
//   startFragPrefetch       false
//   initialLiveManifestSize 1
//   startOnSegmentBoundary  false
~~~

### manifest-size

Above `initialLiveManifestSize: 3,`, lines 446 to 449 before the cut.

~~~js
// Refuse to start until the playlist carries 3 segments. The AUDIO
// playlist is then populated too — measured at the origin, the two
// tracks advance in exact lockstep (v-a = 0.00 s over 12 samples), so
// waiting for depth in one waits for depth in both.
~~~

### boundary

Above `startOnSegmentBoundary: true,`, lines 452 to 455 before the cut.

~~~js
// Start at a segment boundary rather than mid-segment. With exactly one
// INDEPENDENT part per 2 s segment (measured: 10 of 38), a boundary is
// the only place both tracks are simultaneously decodable from scratch.
// Costs up to one segment of latency; buys alignment.
~~~

### media-source

Above `watchMediaSource();`, lines 465 to 471 before the cut.

~~~js
// ── why did Safari close the MediaSource? ──────────────────────────
// "mediaSourceRequiresReset — MediaSource closed while media attached"
// has now appeared in three separate iPhone runs, and each time every
// buffer is dumped (tracks {} immediately after) — which is the visible
// flash. ManagedMediaSource also GATES loading via startstreaming /
// endstreaming, and hls.js 1.7.1 wires both. None of that is observable
// from the outside, so observe it directly.
~~~

### engine-emit

Above `if (rebuilds === 0) setTimeout(() => emit('engine', engineReport()), 0);`, lines 473 to 476 before the cut.

~~~js
// NOT emitted synchronously: boot() runs inside createLowLatencyPlayer,
// before the caller has had a chance to chain .on(), so a synchronous
// emit reaches nobody. The iOS report came back with no ENGINE line at
// all and that was this bug, not a device signal.
~~~

### dimensions

Above `const best = (data.levels || [])`, lines 480 to 482 before the cut.

~~~js
// Dimensions live in the master manifest (#EXT-X-STREAM-INF RESOLUTION):
// available ~200 ms after loadSource, seconds before the first decoded
// frame sets videoWidth. Reserve layout now — no jump.
~~~

### level-switch

Above `hls.on(Hls.Events.LEVEL_SWITCHED, (_e, data) => {`, lines 495 to 499 before the cut.

~~~js
// ABR churn is the other jank candidate and it is UNMEASURED on the
// device that showed the problem. The stream carries four renditions
// (720/480/360/240) with tightly clustered BANDWIDTH, and a switch at
// the live edge cannot present a frame until the next INDEPENDENT part
// — once per 2.0 s. Report switches so the phone can answer it.
~~~

### parse-error

Above `consecutiveFailures++;`, lines 518 to 522 before the cut.

~~~js
// Parsing errors (204 empty manifest — stream not started) are NOT
// covered by the native loading retry, and a wedged instance emits
// nothing further. Rebuild on a rising backoff: quick first retries for
// the common transient, easing off while the edge converges after a
// broadcast swap instead of hammering stale manifests.
~~~

### native

Above `if (useNative) {`, lines 533 to 536 before the cut.

~~~js
// ---- native HLS (AVFoundation) -------------------------------------------
// Deliberately AFTER bufferReport()/measureRates() are defined, so the native
// path reports the SAME quantities as the hls.js path. Comparing two players
// on two different measurements would be worthless.
~~~

### native-engine

Above `setTimeout(() => emit('engine', {`, lines 538 to 541 before the cut.

~~~js
// Deferred, exactly as on the hls.js path: boot happens inside
// createLowLatencyPlayer, before the caller can chain .on(), so a
// synchronous emit reaches nobody. The iPhone log came back with no ENGINE
// line and that was this bug reintroduced, not a device signal.
~~~

### native-recovery

Above `let nativeLastEdge = -1;`, lines 546 to 554 before the cut.

~~~js
// RECOVERY, which this path had none of. Measured on an iPhone at t=153 s:
// MEDIA-ERROR code 3 "Media failed to decode", then currentTime back to 0
// and nothing further. The hls.js path carries every watchdog; here we set
// src and walked away. And Cloudflare mints a NEW video UID on every
// encoder reconnect (5265d9d9, 8cce2ccd, d0390546, 11e6883c observed today),
// which a bare <video src> cannot survive at all.
//
// A reload is the only lever native HLS gives us, so use it — rate limited,
// because a reload storm is worse than a stall.
~~~

### native-source

Above `const edge = seekableEnd();`, lines 592 to 602 before the cut.

~~~js
// Source watchdog — and it needs BOTH signals frozen, not one.
//
// Measured in desktop Safari over WebDriver: under native HLS,
// currentTime does NOT share a timeline with seekable the way it does
// under MSE. A healthy stream showed currentTime 38.42 against
// seekableEnd 23.5, so an edge-only check declared the source dead and
// reloaded a stream that was playing at exactly 1.000x — and the reload
// is what then produced the misaligned, apparently-stalled state. The
// watchdog was manufacturing the fault it was watching for.
//
// If the playhead is advancing, the source is alive by definition.
~~~

### native-telemetry

Above `const latency = nativeLatency();`, lines 616 to 619 before the cut.

~~~js
// NOT gated behind latency. getStartDate() can be unavailable for a while,
// and the first Safari run reported an entirely empty readout for 45 s
// because every field sat behind it — exactly when the numbers were most
// wanted. Latency is allowed to be null; everything else still reports.
~~~

### buffer-report

Above `function bufferReport() {`, lines 692 to 702 before the cut.

~~~js
/**
 * What is actually buffered, and per source buffer.
 *
 * video.buffered on a MediaSource is the INTERSECTION of every source
 * buffer, so a demuxed stream (this one carries a separate AUDIO group)
 * reports len 0 the moment audio and video ranges stop overlapping — even
 * with both tracks holding seconds of data. Measured on an iPhone:
 * bufferStalledError with bufferInfo.len 0 while sitting 7.15 s behind the
 * live edge, i.e. content was available and not landing contiguously.
 * Reporting the tracks SEPARATELY is what tells those two cases apart.
 */
~~~

### null-ahead

Above `const inRange = ahead > 0;`, lines 715 to 719 before the cut.

~~~js
// NULL, not 0, when the playhead sits outside every buffered range. Under
// native HLS that is normal rather than starvation — Safari reported
// currentTime 38.42 against buffered [[18,25]] on a stream playing at
// 1.000x — and reporting 0 there reads as "starved" and drives the wrong
// decisions. 0 means measured-and-empty; null means cannot tell.
~~~

### rates

Above `function measureRates() {`, lines 736 to 750 before the cut.

~~~js
/**
 * How fast is the playhead ACTUALLY advancing per wall second?
 *
 * On an iPhone, latency and buffer grew together — latency 6.39 -> 10.81 s
 * while runway grew 5.0 -> 7.6 s — which means 4.42 s of latency accrued
 * over 6.05 s of wall time with data sitting ready. Either the device
 * presents frames far slower than realtime, or the live edge is running away
 * and hls.latency is reporting THAT as our lag. Those have opposite fixes,
 * and this is the number that tells them apart:
 *
 *   advance ~= 1.0 and latency still climbing  -> the EDGE is running away
 *   advance << 1.0                             -> the DEVICE cannot keep up
 *
 * edgeRate is the same question asked of the live edge itself.
 */
~~~

### baseline

Above `if (r < -0.1 || r >= 3) {`, lines 760 to 770 before the cut.

~~~js
// A LONG BASELINE, not an EMA.
//
// The EMA was seeded while currentTime was still 0 (before play) and
// then crawled toward the truth: it read 0.624 on desktop Safari at
// t=35 s while a direct two-point measurement of the same player gave
// 1.000 sustained. An exponential average of a quantity with a long
// startup transient is mostly a report on the transient.
//
// So measure against a reference point instead, and move the reference
// only when the playhead jumps (a seek is not a playback rate) or when
// the baseline gets stale.
~~~

### source-watchdog

Above `const edge = seekableEnd();`, lines 863 to 865 before the cut.

~~~js
// -- source watchdog: is new content still being produced? --------------
// Runs even while paused/stalled — currentTime advancing through the
// remaining buffer must not mask a dead origin.
~~~

### starved

Above `const ahead = nextBufferedAhead(0.25);`, lines 883 to 895 before the cut.

~~~js
// Starved element. Do NOT reset the stall clock: a drift-seek that lands
// in a buffer hole (same-broadcast resume) leaves readyState at 1
// indefinitely — measured 20.0 s and 18.5 s parks — and the old
// early-return disarmed every watchdog while resetting the clock.
//
// Fast path first: playhead beached at a hole with a real buffered range
// just ahead (post-burst appends land beyond the seek point and the
// element never recovers on its own — hls.js's gap controller takes
// ~20 s). Three consecutive ticks of confirmation (~1.5 s) filter out
// ordinary in-flight seeks whose data is still arriving.
// One attempt per target: a wedged mid-swap level bounces the playhead
// back (measured: ct 0 <-> skip-target loop every ~3 s) — re-skipping to
// the same spot is noise; defer to the starved escalation below instead.
~~~

### audio-only

Above `const rep = bufferReport();`, lines 909 to 912 before the cut.

~~~js
// Is the shortfall AUDIO ONLY? Video holding seconds past the playhead
// while the intersection holds nothing means the missing piece is an
// audio segment. A seek forward cannot conjure one — it just opens a
// hole, which is exactly how the 5.5 s orphan range got made. Wait.
~~~

### advance-judge

Above `if (rates.advance != null && !video.paused && (bufferReport().ahead ?? 0) > 2) {`, lines 952 to 956 before the cut.

~~~js
// A resync jumps currentTime, so the EMA needs a moment to be meaningful
// again; only judge when the buffer is healthy and we are actually playing.
// ?? 0 is explicit rather than relying on `null > 2` being false: ahead is
// null when the playhead sits outside every range, and "cannot tell" must
// not be read as "plenty buffered".
~~~

### pdt-latency

Above `const pd = hls?.playingDate;`, lines 978 to 981 before the cut.

~~~js
// PDT wall-clock latency: the only honest signal while hls.latency sits
// frozen during a socket-open ingest pause. Always reported; only acted
// on when cfg.pdtDriftTrigger is set AND there is somewhere ahead to seek
// to (otherwise the wall lag is player-irreducible).
~~~

## `src/low-latency-player.v5.js`

### v5-header

Above `const DEFAULTS = {`, lines 1 to 39 before the cut.

~~~js
/**
 * Low-latency HLS player for Cloudflare Stream.
 *
 * Wraps hls.js with the configuration and recovery behaviour a live player
 * needs against Cloudflare LL-HLS. Everything here exists because a specific
 * failure was observed in testing:
 *
 *  1. hls.js picks a live-edge position ONCE and, by default, has no recovery:
 *     `maxLiveSyncPlaybackRate` is 1 and `maxLatency` is Infinity. Any startup
 *     hiccup parks the player at an arbitrary latency forever. Measured on the
 *     same stream, same config: 7.6 s one run, 15.4 s the next.
 *
 *  2. Cloudflare mints a NEW video UID behind the live-input URL on every
 *     encoder reconnect — even a 2-second one. The playing level becomes a
 *     dead timeline: `liveSyncPosition` goes stale (it can even move
 *     backwards), and seeking can never help. Only a full reload recovers.
 *
 *  3. A page opened before the broadcast exists gets a fatal
 *     `manifestParsingError`. Patching up a live Hls instance afterwards
 *     (stopLoad/loadSource/startLoad) leaves it wedged: no errors, no loads,
 *     no recovery. The only reliable reset is destroying the instance and
 *     building a new one — the programmatic page-refresh.
 *
 * Recovery model:
 *   latency drift      -> nudge playbackRate (invisible), else seek (one skip)
 *   player stall       -> seek; after N failed seeks, full rebuild
 *   source stall       -> live edge stopped advancing: full rebuild
 *                         (seekable-end check from elektronstudio/v4)
 *   fatal hls error    -> media-error quick fixes, else full rebuild
 *   no stream yet      -> rebuild on a steady cadence until it exists
 *   tab became visible -> seek to live edge (hidden tabs always come back stale)
 *
 * Usage:
 *   const player = createLowLatencyPlayer(videoEl, manifestUrl, opts?);
 *   player.on('latency', ({latency, target}) => …)   // ~2/s while playing
 *   player.on('dimensions', ({width, height}) => …)  // before first frame
 *   player.on('rebuild', ({why, attempt}) => …)
 *   player.destroy();
 */
~~~

### v5-freeze

Above `function freezeFrame() {`, lines 120 to 125 before the cut.

~~~js
/**
 * Freeze the last decoded frame into the element's poster before teardown,
 * so a rebuild shows a still image instead of flashing black. MSE-fed video
 * does not taint the canvas (hls.js fetches media via CORS), so this is safe
 * on the hls.js path; a tainted canvas (native src fallback) just skips.
 */
~~~

### v5-rebuild

Above `let lastRebuildAt = 0;`, lines 137 to 142 before the cut.

~~~js
/**
 * Tear the Hls instance down and build a fresh one. Deliberately blunt:
 * every observed wedge (dead level after UID swap, instance stuck after
 * manifestParsingError) recovers under a full rebuild and under nothing
 * weaker. State that must survive lives outside boot().
 */
~~~

### v5-frag-retry

Above `levelLoadingMaxRetry: 4,`, lines 177 to 181 before the cut.

~~~js
// Fragment retries: moderate. At the LL-HLS live edge a brief part 404
// is NORMAL (players request parts as they are born) — v4's fail-fast
// (1 retry) turned that churn into fatal->rebuild storms that crashed
// the tab. But v3's slow default backoff took 3-5 min to surface a real
// swap. Middle path: a few quick retries, tight timeout cap.
~~~

### v5-dimensions

Above `const best = (data.levels || [])`, lines 194 to 196 before the cut.

~~~js
// Dimensions live in the master manifest (#EXT-X-STREAM-INF RESOLUTION):
// available ~200 ms after loadSource, seconds before the first decoded
// frame sets videoWidth. Reserve layout now — no jump.
~~~

### v5-parse-error

Above `consecutiveFailures++;`, lines 221 to 225 before the cut.

~~~js
// Parsing errors (204 empty manifest — stream not started) are NOT
// covered by the native loading retry, and a wedged instance emits
// nothing further. Rebuild on a rising backoff: quick first retries for
// the common transient, easing off while the edge converges after a
// broadcast swap instead of hammering stale manifests.
~~~

### v5-source

Above `const edge = seekableEnd();`, lines 266 to 268 before the cut.

~~~js
// -- source watchdog: is new content still being produced? --------------
// Runs even while paused/stalled — currentTime advancing through the
// remaining buffer must not mask a dead origin.
~~~

## `src/provision-cam-whip.sh`

### cam-whip

Above `set -e`, lines 2 to 7 before the cut.

~~~sh
# One WebRTC live input for /cam/'s WebRTC leg, so it stops borrowing the input
# that /llhls/'s viewers hold, and its WHIP URL stored as the CAM_WHIP_URL
# secret on positron-pub. Run by the owner, because the WHIP URL carries the
# input's key and an agent may not write secrets. Recording off, as for /stage/.
# Prints the input UID, which is public (it is in every WHEP play URL) and goes
# into the code. Requires CF_API_TOKEN and CF_ACCOUNT_ID in ../.env.
~~~

## `src/provision-cam.sh`

### cam-retired

Above `[ "$PROVISION_RETIRED" = 1 ] || { echo "src/provision-cam.sh is retired (2026-10`..., lines 2 to 8 before the cut.

~~~sh
# RETIRED 2026-10-13. The input this made (positron-cam, 157863305ec9...) was
# deleted from Stream that day, the CAM_STREAM_KEY secret with it, and pub's
# /cam route answers 410, so a new input would have nothing to publish to it.
# Kept as the record of how it was made. It refuses to run unless
# PROVISION_RETIRED=1 is set, so nobody recreates an input (and a recording on
# the account's 1000 minute cap) by accident. The camera's LL-HLS publish lives
# on as /video/ll-hls-loopback/'s loopback, on its own input: src/provision-loop.sh.
~~~

### cam

Above `set -e`, lines 10 to 18 before the cut.

~~~sh
# One RTMPS live input for /cam/'s own container, and its stream key stored as
# the CAM_STREAM_KEY secret on positron-pub. Run 2026-09-30 on the owner's
# explicit instruction; created input 157863305ec9583187dfbb1c66c031ea.
# preferLowLatency and recording automatic, as src/provision.sh makes the
# /llhls/ input: Stream serves LL-HLS from an RTMPS input only with both, and
# recording cannot be turned off there, so every camera session is a recording
# against the account's 1000 minute cap.
# Prints the input UID, which is public (it is in every HLS play URL) and goes
# into the code. Requires CF_API_TOKEN and CF_ACCOUNT_ID in ../.env.
~~~

## `src/provision-loop.sh`

### loop

Above `set -e`, lines 2 to 24 before the cut.

~~~sh
# One RTMPS live input DEDICATED to /video/webrtc-loopback/'s LL-HLS loopback,
# "positron-hls-loopback", and its stream key stored as LOOP_STREAM_KEY on
# positron-pub. Run 2026-10-12, asked for through the session: *"A live input
# DEDICATED to this loopback (its own id, its own name like
# positron-hls-loopback), so a sweep can delete everything on it without
# touching any other input or recording."*
#
# preferLowLatency and recording automatic, as src/provision-cam.sh: Stream
# serves LL-HLS from an RTMPS input only with both, and recording cannot be
# turned off there. So every take is a recording against the account's 1000
# minute cap, and positron-pub deletes it (per take about 90 s after it ends,
# and a cron every 10 minutes for anything older than 5).
# timeoutSeconds 0: the recording closes the moment the publisher goes, which
# is the earliest its video can be deleted.
# deleteRecordingAfterDays 30, the platform's minimum: the last net under the
# two above, never the plan.
#
# Also stores the Stream API token and the account id the worker deletes with
# (STREAM_TOKEN, ACCOUNT_ID), the same pair positron-sweep holds.
# Prints the input UID, which is public (it is in every HLS play URL) and goes
# into the code. Requires CF_API_TOKEN and CF_ACCOUNT_ID in ../.env.
# ⚠️ wrangler 4.148 (rig/containers-next): the npx one in this checkout cannot
# read positron-pub's `durable_object` container entry.
~~~

## `src/provision-stage.sh`

### stage

Above `set -e`, lines 2 to 6 before the cut.

~~~sh
# One WebRTC live input for /stage/'s own container, and its WHIP URL stored as
# the STAGE_WHIP_URL secret on positron-pub. Run by the owner, because the WHIP
# URL carries the input's key and an agent may not write secrets.
# Prints the input UID, which is public (it is in every WHEP play URL) and goes
# into the code. Requires CF_API_TOKEN and CF_ACCOUNT_ID in ../.env.
~~~

## `src/provision.sh`

### provision

Above `set -e`, lines 2 to 8 before the cut.

~~~sh
# Create (or reuse) a Cloudflare Stream live input with LL-HLS enabled,
# and print everything needed to publish and play.
#
#   ./provision.sh [name]
#
# Requires CF_API_TOKEN + CF_ACCOUNT_ID in ../.env
# Token needs Account -> Stream -> Edit.
~~~

## `src/publish.sh`

### publish

Above `set -e`, lines 2 to 8 before the cut.

~~~sh
# Publish a test pattern to the live input created by provision.sh.
#
#   ./publish.sh [input.mp4]     # omit for a synthetic test pattern
#
# Encoder settings are the ones Cloudflare LL-HLS requires:
#   H.264, CBR, fixed GOP, and B-frames OFF (they break LL-HLS).
# GOP == segment length. 2 s is the shortest Cloudflare currently recommends.
~~~

### font

Above `FONT=""`, lines 23 to 27 before the cut.

~~~sh
# MONOSPACE BOLD, whichever one this machine has. The face matters: in a
# proportional font the digits shift sideways as they change, which is jitter in
# exactly the region a reader is watching. The container publisher burns
# DejaVuSansMono-Bold (it ships in ttf-dejavu); prefer the same face here when
# it exists, and fall back to the Courier New Bold this script has always used.
~~~

### epoch

Above `EPOCH=$(python3 -c 'import time;print(f"{time.time():.6f}")')`, lines 44 to 52 before the cut.

~~~sh
# Burn an absolute epoch into the pixels so latency is measurable from a
# screenshot alone. %{pts:flt:OFFSET} — note `basetime` does NOT work.
#
# The filter is GENERATED from demo/shell/pattern.mjs, which is the one place
# the pattern is specified — the same module draws the browser-canvas version.
# This publisher therefore cannot drift from the canvas one; the container's
# copy can only be kept in step by hand (its image is one COPY'd file).
#   HUE=<0..359>  distinguish this publisher from the container's two legs
#   ROW=1         also burn the 56-block machine-readable clock row
~~~

## `src/timed-messages.js`

### header

Above `const DEFAULTS = {`, lines 1 to 43 before the cut.

~~~js
/**
 * Timed messages synced to a live video stream.
 *
 * Cloudflare Stream's transcode strips all in-band metadata (ID3, SCTE-35,
 * DATERANGE, SEI — verified), so messages travel on a side channel and are
 * aligned to the video using the wall clock that LL-HLS embeds per segment
 * (EXT-X-PROGRAM-DATE-TIME → hls.playingDate).
 *
 * A cue is {id, at, data}: `at` is epoch ms of the STREAM moment it belongs
 * to. Each viewer's playhead lags live by their own amount; a cue fires when
 * *their playhead* reaches `at`, so every viewer sees it at the same point in
 * the video regardless of their individual latency. This beats in-band ID3:
 * cues can be scheduled ahead, revised, cancelled, and delivered to viewers
 * who joined late.
 *
 * Works with createLowLatencyPlayer (hls.js path and Safari native path).
 *
 * 🔴 AND SINCE 2026-09-25 IT WORKS ON WebRTC TOO, WHERE THERE IS NO PDT AND
 * THEREFORE NO PLAYHEAD CLOCK AT ALL. Before this, `playheadTime()` returned
 * null on a WHEP subscription and `tick()` returned early every single time,
 * so cues NEVER FIRED and nothing said so: no error, no warning, an empty
 * overlay and a queue that only grew. That is the worst shape a failure can
 * take in this repository's own words, and it is why `clock` is now explicit
 * rather than inferred.
 *
 *   clock: 'pdt'   (default, unchanged) the playhead's own wall clock. Every
 *                  viewer sees a cue at the same POINT IN THE VIDEO whatever
 *                  their latency. Needs EXT-X-PROGRAM-DATE-TIME, which exists
 *                  only because the input was made with preferLowLatency.
 *   clock: 'live'  fire on arrival. For WebRTC, where the viewer IS live:
 *                  measured p50 67 ms glass to glass, which is inside the
 *                  noise of a person noticing a question.
 *   clock: 'lag'   wall clock minus THIS viewer's own reported latency. The
 *                  cheap rule for an HLS stream with no usable PDT. One
 *                  subtraction against a figure the player already computes.
 *
 *   const cues = createTimedMessages(player, video, {
 *     onMessage: (cue, {lateMs}) => showOverlay(cue.data),
 *   });
 *   cues.add({ id: 'act2', at: Date.parse('...'), data: {...} });
 *   cues.connect('wss://your-worker.example/cues');   // optional transport
 *   cues.destroy();
 */
~~~

### interval

Above `interval: 100,`, lines 46 to 46 before the cut.

~~~js
/** Poll cadence (ms). 100 ms ≈ 3 frames — tight enough for overlays. */
~~~

### past-window

Above `pastWindow: 15000,`, lines 48 to 52 before the cut.

~~~js
/**
 * Fire cues up to this many ms *behind* the playhead (late joiner, seek,
 * rebuild). Older cues are surfaced through onMissed instead, so a late
 * joiner can e.g. render past chat without replaying every animation.
 */
~~~

### clock

Above `clock: 'pdt',`, lines 59 to 63 before the cut.

~~~js
/**
 * Which clock decides that a cue is due. See the header.
 * 'pdt' | 'live' | 'lag'. Default 'pdt', which is what this file has always
 * done, so nothing that already uses it changes behaviour.
 */
~~~

### latency-seconds

Above `latencySeconds: null,`, lines 65 to 72 before the cut.

~~~js
/**
 * For clock:'lag' only. Reads this viewer's current latency in SECONDS.
 * `createLowLatencyPlayer` reports exactly this on its 'latency' event, so
 * the usual wiring is a closure over the last value seen there.
 * Returning null means "cannot tell", which HOLDS the cue rather than firing
 * it: a cue fired at the wrong moment cannot be taken back, and this project
 * has already paid once for reading "cannot tell" as a number.
 */
~~~

### stats

Above `const stats = { rttMs: null, rttP50: null, serverClockOffsetMs: null, samples: [`..., lines 88 to 90 before the cut.

~~~js
/** Live transport telemetry: rtt from ping/pong (performance.now() based),
 *  serverClockOffset from the DO's echoed Date.now() (coarse — Workers
 *  freeze Date.now() during execution; treat as ±70 ms). */
~~~

### live

Above `if (cfg.clock === 'live') return Date.now();`, lines 95 to 98 before the cut.

~~~js
// ── clock:'live' — WebRTC. There is no playhead clock and there is no
// need for one: the viewer is live, so "now" is now. Returning the wall
// clock makes every cue whose `at` has passed due immediately, which is
// exactly the intended behaviour and keeps ONE code path in tick().
~~~

### lag

Above `if (cfg.clock === 'lag') {`, lines 101 to 101 before the cut.

~~~js
// ── clock:'lag' — wall clock minus this viewer's own latency.
~~~

### pdt

Above `const d = player.hls?.playingDate;`, lines 112 to 113 before the cut.

~~~js
// ── clock:'pdt' — the original, and still the default.
// hls.js: fragment PROGRAM-DATE-TIME mapped to currentTime.
~~~

### connect

Above `function connect(url) {`, lines 150 to 156 before the cut.

~~~js
/**
 * Optional transport: a WebSocket delivering JSON frames.
 *   {type:'cue',    cue:{id,at,data}}     schedule (or revise by id)
 *   {type:'cues',   cues:[...]}           batch (e.g. backlog on join)
 *   {type:'cancel', id}                   unschedule
 * Reconnects with backoff forever — same philosophy as the player.
 */
~~~

### double

Above `clearTimeout(wsTimer);`, lines 159 to 160 before the cut.

~~~js
// Guard double-connect: cancel any pending reconnect and close the old
// socket, whose handlers below no-op once it is no longer `ws`.
~~~

### ping

Above `try { pendingPingT0 = performance.now(); sock.send('ping'); } catch {}`, lines 173 to 175 before the cut.

~~~js
// Bare "ping" hits the DO's auto-response: answered by the runtime
// without waking a hibernated object — free, and measures pure
// network RTT. t0 kept locally (one ping in flight at a time).
~~~

### subtitles

Above `function attachSubtitleTrack(lang = 'en', label = 'Subtitles') {`, lines 204 to 212 before the cut.

~~~js
/**
 * Render cues that carry {data: {text}} as native subtitles. Uses the
 * browser's own TextTrack pipeline (styling, positioning, the CC button on
 * iOS), so no overlay DOM is needed. A cue's wall-clock `at`/`until` is
 * mapped onto the media timeline at delivery time.
 *
 *   const track = cues.attachSubtitleTrack('et');
 *   cues.add({ at: t, until: t + 4000, data: { text: 'Tere tulemast' } });
 */
~~~

### metadata

Above `function attachMetadataTrack(onCue) {`, lines 232 to 242 before the cut.

~~~js
/**
 * Invisible timed events on the media clock. Same machinery as subtitles but
 * kind='metadata' + mode='hidden': the browser schedules the cue and fires
 * onCue at the exact media time, nothing ever renders. Use for anything
 * that must happen at a stream moment without UI: lighting changes, scene
 * switches, unlocking content, analytics markers.
 *
 * Note: plain onMessage already gives you invisible delivery at ~100 ms
 * resolution and survives player rebuilds; this variant rides the browser's
 * own cue scheduler for frame-accurate firing between polls.
 */
~~~
