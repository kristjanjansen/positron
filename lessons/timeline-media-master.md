# timeline-media-master

Comments cut from the code on 2026-10-14 and kept here verbatim, so the code can say in one to three lines what it cannot say itself. Each `why:` pointer in the code names one heading below.

## `timeline/media-master.mjs`

### laws

Above `/**`, lines 1 to 121 before the cut.

~~~js
// timeline/media-master.mjs — THE MEDIA-ELEMENT CLOCK MASTER, written once.
//
// Three clients now slave the library's vector to an HTMLMediaElement:
//
//   proto/replay/replay.html        one <video>, T0 + currentTime*1000
//   proto/selfrec/replay-grid.html  N tiles, the usable one masters, per-tile anchor
//   proto/remixer/compose.html      the nested session's audio element
//
// Every one of them wrote the same block with the same laws, in different code,
// and the divergence was not cosmetic: replay-grid's copy synced
// UNCONDITIONALLY, with no jump-vs-drift discrimination, so an external scrub or
// an hls.js recovery jump would re-open the burst-every-skipped-cue bug that its
// own adoption of the library had fixed. That is what a hand-rolled law does
// three copies later. So the law moves in here:
//
//   const mm = mediaMaster(deck, sourceOrEl, opts);
//   function loop() { requestAnimationFrame(loop); mm.tick(); }
//
// THE LAWS, stated once and enforced below.
//
// L1. THE MASTER IS NEVER NUDGED. Its rate and its currentTime are read, never
//     written. The picture is the ground truth; the vector is what bends.
//
// L2. DRIFT IS A `sync()`, A DISCONTINUITY IS A `seek()`. Inside `jumpMs` the
//     error is frame quantisation and decode jitter: `deck.sync()` re-anchors
//     the vector without re-firing anything. Past `jumpMs` the element has
//     MOVED (a user scrub, an hls.js recovery jump, a gap skip) and a sync
//     would leave every cue in between `pending`, to be burst all at once the
//     moment the lookahead notices. `deck.seek()` reconciles statuses and
//     re-folds reduce/assertState instead, which is exactly what a jump means.
//     THIS IS THE WHOLE REASON THE HELPER EXISTS.
//
// L3. A STALLED MASTER MUST NOT LET THE PLAYHEAD RUN AHEAD OF THE PICTURE. If
//     currentTime has not advanced for `stallMs` of wall time while the element
//     claims to be playing, the master role is given up:
//       stallPolicy 'hold'    — pause the deck; the playhead stalls WITH the
//                               picture (one master, nothing else to fall back
//                               to: proto/replay).
//       stallPolicy 'release' — stop driving and report it; the client picks a
//                               different master or free-runs on the wall clock
//                               (N tiles: proto/selfrec/replay-grid).
//
// L4. `timeupdate` IS THE HIDDEN-TAB BACKSTOP. rAF dies when the tab is hidden;
//     `timeupdate` (~4 Hz) does not. The library's own tick host is a worker and
//     survives, so without this backstop a hidden tab would run the vector free
//     against a picture nobody is re-anchoring it to.
//
// L4b. THE SENSOR IS `requestVideoFrameCallback.mediaTime` WHEN IT IS THE
//     FRESHER SAMPLE (v0.6, steal #1 from the browser-NLE survey §11).
//     `el.currentTime` is a COARSE, ASYNCHRONOUSLY-UPDATED view of the decoder:
//     the HTML spec lets a UA refresh it on its own schedule (Chrome does it
//     roughly per frame *and* rounds it to 6 digits), so a servo enforcing a
//     ±20-40 ms dead band against it is enforcing it against a noisy sensor.
//     `rVFC`'s `mediaTime` is the presentation timestamp of the frame the
//     compositor ACTUALLY SHOWED, delivered with the `expectedDisplayTime` it
//     was shown at. Remotion reads it in preference to `currentTime` when its
//     sample is the more recent one; so do we now.
//
//     THE RULE, and it is deliberately conservative:
//       · a frame callback stores {mediaTime, expectedDisplayTime, at};
//       · the sample must be younger than `rvfcStaleMs` — so a hidden tab
//         (rVFC stops, `timeupdate` does not) falls back to `currentTime`
//         automatically, with no visibility API;
//       · 🔴 IT IS CARRIED AT THE RATE THE PICTURE IS MOVING, AND THAT IS
//         NOT `playbackRate`. `playbackRate` reads 1 on a PAUSED element, so
//         carrying by it extrapolates a stationary picture forward.
//         MEASURED on `demo/memento/` 2026-09-13: after a seek with the
//         element paused the playhead crept +180 ms over 250 ms while
//         `currentTime` sat still on the frame it had been sent to, then
//         snapped back when the sample went stale — `2437 ~ 2225` on the
//         shared `keyboard seek lands` check, and the page worked around it
//         by turning the sensor off. Paused, ended or seeking, the carry rate
//         is 0: the sample still says WHICH FRAME IS ON THE GLASS, it just
//         stops claiming that frame is moving.
//       · WHILE THE PICTURE IS NOT MOVING, a sample older than the last
//         observed move of `currentTime` is old news and is dropped — the
//         element was sent somewhere and the compositor has not caught up, and
//         only `currentTime` knows where it was sent. (This is the guard this
//         comment claimed for months while `ctChangedAt` was computed and
//         never read.) ⚠️ It is NOT applied while the picture IS moving, and
//         that is not a stylistic choice: during playback `currentTime` moves
//         on nearly every tick and is NOTICED a tick late, inside `tick()`, so
//         an unconditional form rejects every sample and switches L4b off for
//         good. A fake element whose `currentTime` never changes passes the
//         broken version; `timeline/lab/prop-media-sensor.mjs` S4 moves it,
//         which is the only reason that check can fail.
//       · THE HOLE THE PAIR STILL LEAVES, written down because a guard that
//         moved is a guard whose new blind spot nobody has looked for: a scrub
//         SMALLER than `jumpMs` while the element is PLAYING is caught by
//         neither test — the pre-scrub frame is carried at rate 1 and read as
//         the picture, so the vector can trail where the element was sent by
//         up to `jumpMs` for up to `rvfcStaleMs`. It ends the instant one
//         frame is presented, and a seek presents one. The same bound covers a
//         decoder that stalls without clearing `paused`: it is carried forward
//         until the sample goes stale at `rvfcStaleMs`, and L3 has it after
//         `stallMs`. Both are bounded and neither is detected;
//       · the correction is applied as a DELTA, `(mediaTime − currentTime)`,
//         so the `{el, pos, key}` source form — whose `pos` is by construction
//         `anchor + el.currentTime * 1000` in every client — gets it for free
//         without the client changing a line;
//       · Firefox before 132, Safari before ~15.4, and every `<audio>` element
//         have no `requestVideoFrameCallback` at all: `useRvfc` degrades to the
//         `currentTime` path silently and `stats().rvfc.supported` says so;
//       · `variableFps: true` disables it (Remotion excludes variable-fps
//         sources, and a VFR `mediaTime` is not on a frame grid).
//     rVFC is an OBSERVATION primitive, never a seek primitive: the seek
//     command still goes through `currentTime` in the client. Nothing about the
//     policy above (the dead band, the jump threshold, L1–L5) changes — only
//     which number the policy is applied to.
//
// L5. A PAUSED / ENDED / NOT-YET-READY / SEEKING MASTER IS NOT A CLOCK. While
//     the element is seeking, its currentTime is a target, not a position:
//     driving from it would fight the very seek in progress. Paused or ended,
//     `autoPlayPause` (default on) pauses the deck and re-anchors it once, so
//     the playhead sits exactly on the frozen frame.
//
// No timers live in here (the vector law): `tick()` is called from the rAF loop
// the client already runs. The only listener is the `timeupdate` backstop, and
// it calls the same `tick()`.
//
// Plain ESM, browser only (it needs an HTMLMediaElement), no deps.
~~~

### options

Above `export function mediaMaster(deck, source, {`, lines 123 to 147 before the cut.

~~~js
/**
 * @param deck    a deck (createDeck / makeLogDeck) — needs sync/seek/position/
 *                play/pause/playing.
 * @param source  an HTMLMediaElement, OR a function called each tick returning
 *                `{el, pos, key?}` (or null / falsy when there is no usable
 *                master right now). The function form is what a grid of tiles
 *                needs: it picks the master AND supplies that tile's anchor.
 * @param opts
 *   anchorMs      number | () => number — element form only:
 *                 pos = anchorMs + el.currentTime * 1000   (default 0)
 *   toleranceMs   sync dead band (frame quantisation is not drift)      [40]
 *   jumpMs        past this, route to seek() instead of sync()  (L2)   [250]
 *   stallMs       currentTime frozen this long => stalled (L3)        [1000]
 *   stallPolicy   'hold' | 'release'                                ['hold']
 *   autoPlayPause a paused/ended master pauses the deck, and a running one
 *                 resumes it (L5)                                     [true]
 *   attachTimeupdate  install the L4 backstop                         [true]
 *   useRvfc       prefer requestVideoFrameCallback.mediaTime (L4b)     [true]
 *   variableFps   the source is VFR — never trust mediaTime (L4b)     [false]
 *   rvfcStaleMs   a frame sample older than this is not a sample       [250]
 *   sampleLimit   retained rvfc-vs-currentTime disagreement rows     [20000]
 *   onEvent       ({reason, ...}) — 'jump' | 'stall' | 'resume' | 'acquire' |
 *                 'release'. The client's engine log, not ours.
 *   onCorrection  (ms) — every applied sync correction, for the HUD.
 */
~~~

### rvfc

Above `let rvEl = null, rv = null, rvArmed = false;`, lines 191 to 196 before the cut.

~~~js
// ---- L4b: the rVFC sensor -------------------------------------------------
// One registration per mastering element, re-armed from inside the callback
// (rVFC is one-shot, like rAF). `rv` is the last frame the compositor told us
// it presented; `ctChangedAt` is when we last saw `currentTime` MOVE. The
// fresher of the two wins, and the disagreement between them is recorded so
// "which sensor is better" is a number rather than an opinion.
~~~

### carry-rate

Above `function carryRate(el) {`, lines 205 to 208 before the cut.

~~~js
/** THE RATE THE PICTURE IS MOVING AT — which is not `playbackRate`, because
 *  `playbackRate` is 1 on a paused element. A frame sample is carried onto
 *  the wall clock by this; at 0 the carry is the identity and the sample says
 *  only which frame is on the glass. See L4b. */
~~~

### sensor-delta

Above `function sensorDeltaMs(el, wall) {`, lines 245 to 249 before the cut.

~~~js
/** The L4b decision, for ONE tick. Returns the ms to ADD to a position that
 *  was derived from `el.currentTime` — 0 when the currentTime path wins,
 *  which is every tick on Firefox < 132, on `<audio>`, on a VFR source, in a
 *  hidden tab, and whenever a `timeupdate` moved currentTime more recently
 *  than the compositor presented a frame. */
~~~

### pair

Above `const edt = Number.isFinite(rv.expectedDisplayTime) ? rv.expectedDisplayTime : r`..., lines 256 to 262 before the cut.

~~~js
// rVFC's sample is a PAIR, not a scalar: `mediaTime` is the PTS of the frame
// the compositor will show AT `expectedDisplayTime`. Read as a bare number
// it is ~half a frame to a frame AHEAD of `currentTime`, and that offset is
// display latency, not error — carrying it onto `wall` is the whole point of
// the spec shipping the two together. (Measured: uncarried, the two clocks
// disagree by 0.30 frame p50 / 1.01 frame max at 30 fps; carried, see
// sensorStats().)
~~~

### superseded

Above `if (rate === 0 && rv.at < ctChangedAt) { S.rvfc.superseded++; return 0; }`, lines 272 to 278 before the cut.

~~~js
// While the picture is FROZEN (rate 0), a sample taken before the last
// observed move of `currentTime` describes a picture that has been
// superseded: the element was sent somewhere and the compositor has not
// caught up yet. Only `currentTime` knows where it was sent, and the
// disagreement can be far smaller than `jumpMs`, so the rejection below
// cannot see it. ⚠️ Rate 0 only — see L4b for why applying this during
// playback switches the sensor off for good rather than guarding it.
~~~

### rejected

Above `if (Math.abs(d) > jumpMs) { S.rvfc.rejected++; return 0; }`, lines 280 to 283 before the cut.

~~~js
// A frame sample from BEFORE a discontinuity must never be carried across
// it: past the jump threshold the element has MOVED (L2) and only
// `currentTime` knows where to. This is what keeps the sensor swap from
// ever changing which branch L2 takes.
~~~

### attach

Above `function attach(el) {`, lines 289 to 306 before the cut.

~~~js
/**
 * Attach the L4 backstop to whichever element is currently mastering.
 *
 * 🔴 `seeked` AS WELL AS `timeupdate`, ADDED 2026-09-18, AND THE MISSING ONE
 * WAS A REAL BUG IN EVERY PAGE THAT SEEKS A PAUSED MASTER. A paused element
 * fires NO `timeupdate`, and it produces no frames, so `requestVideoFrame-
 * Callback` is silent too. Seek one and every sensor this module has goes
 * quiet at once: `tick()` never runs, L5 never re-anchors, and the deck holds
 * the position it had while the picture sits somewhere else entirely.
 * ⚠️ MEASURED on `/stage/`'s archive: asked back to 1.00s of a 3.45s
 * recording, the ELEMENT went to 1.00s, `ended` false, `seekable` 0.00..3.45,
 * and the DECK stayed at 3.45s. It was reported as *"there is not caret in
 * arvhice playback"* and diagnosed twice as a MediaRecorder limitation, which
 * it is not: the file seeks perfectly and nothing was listening.
 * ⚠️ IT IS THE ONE EVENT THAT MEANS "THE POSITION MOVED AND NOTHING ELSE
 * WILL TELL YOU". While playing it is redundant, because `timeupdate` follows
 * within a frame or two; while paused it is the only thing there is.
 */
~~~

### tick

Above `function tick() {`, lines 322 to 326 before the cut.

~~~js
/**
 * ONE step of the law. Call it from the rAF loop you already run.
 * @returns null when there is no usable master this tick, else
 *   {reason:'sync'|'jump'|'stall'|'hold', pos, correction, errMs}
 */
~~~

### paused

Above `if (el.paused || el.ended) {`, lines 353 to 353 before the cut.

~~~js
// L5: paused / ended — re-anchor once and hold.
~~~

### jump

Above `if (Math.abs(errMs) > jumpMs) {`, lines 364 to 367 before the cut.

~~~js
// L2 — THE FIX. A discontinuity is a SEEK, never a sync: a sync would leave
// every cue in between pending and burst them the moment the lookahead
// catches up. This branch runs BEFORE the stall check, because a jump IS an
// advance (a scrub while the picture is frozen must not read as a stall).
~~~

### never-nudged

Above `S.driving = true; S.syncs++;`, lines 397 to 397 before the cut.

~~~js
// L1: the master is never nudged — we only move the vector.
~~~

### sensor-stats

Above `sensorStats() {`, lines 429 to 431 before the cut.

~~~js
/** L4b: the sensor disagreement distribution — |mediaTime − currentTime| in
 *  ms over every tick where both were readable. This is the number that
 *  says whether preferring rVFC was worth doing on THIS machine. */
~~~

### samples

Above `sensorSamples: () => disagree.slice(),`, lines 451 to 451 before the cut.

~~~js
/** every (carried, raw) disagreement sample in ms — for a histogram */
~~~
