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
export function mediaMaster(deck, source, {
  anchorMs = 0,
  toleranceMs = 40,
  jumpMs = 250,
  stallMs = 1000,
  stallPolicy = 'hold',
  autoPlayPause = true,
  attachTimeupdate = true,
  useRvfc = true,
  variableFps = false,
  rvfcStaleMs = 250,
  sampleLimit = 20000,
  onEvent,
  onCorrection,
} = {}) {
  if (!deck || typeof deck.sync !== 'function') throw new Error('mediaMaster needs a deck');
  if (!source) throw new Error('mediaMaster needs an element or a source function');
  if (stallPolicy !== 'hold' && stallPolicy !== 'release')
    throw new Error(`mediaMaster: stallPolicy must be 'hold' or 'release' (got ${stallPolicy})`);

  const pick = typeof source === 'function'
    ? source
    : () => {
        const a = typeof anchorMs === 'function' ? anchorMs() : anchorMs;
        return { el: source, pos: a + source.currentTime * 1000, key: 'el' };
      };

  const S = {
    syncs: 0, corrections: 0, jumps: 0, stalls: 0, releases: 0, acquires: 0,
    ticks: 0, backstopTicks: 0, idle: 0,
    lastCorrectionMs: null, lastJumpMs: null, key: null, stalled: false, driving: false,
    // L4b accounting: the sensor is measured, not assumed.
    rvfc: { supported: null, registered: 0, frames: 0, used: 0, stale: 0, rejected: 0,
            superseded: 0,
            lastMediaTime: null, lastExpectedDisplayMs: null, lastDeltaMs: null,
            lastRawDeltaMs: null, samples: 0, dropped: 0 },
  };
  let lastPos = null, lastWall = 0, disposed = false, attachedTo = null;
  const now = () => (typeof performance === 'object' && performance.now ? performance.now() : Date.now());
  const say = (reason, extra) => { if (onEvent) onEvent({ reason, key: S.key, t: Date.now(), ...extra }); };

  function clearAdvance() { lastPos = null; lastWall = 0; }

  // ---- L4b: the rVFC sensor -------------------------------------------------
  // One registration per mastering element, re-armed from inside the callback
  // (rVFC is one-shot, like rAF). `rv` is the last frame the compositor told us
  // it presented; `ctChangedAt` is when we last saw `currentTime` MOVE. The
  // fresher of the two wins, and the disagreement between them is recorded so
  // "which sensor is better" is a number rather than an opinion.
  let rvEl = null, rv = null, rvArmed = false;
  let lastCt = null, ctChangedAt = -Infinity;
  const disagree = [];                 // (mediaTime carried to now − currentTime), ms
  const disagreeRaw = [];              // (mediaTime − currentTime) UNCARRIED, ms

  function rvfcSupported(el) {
    return !!(el && typeof el.requestVideoFrameCallback === 'function');
  }
  /** THE RATE THE PICTURE IS MOVING AT — which is not `playbackRate`, because
   *  `playbackRate` is 1 on a paused element. A frame sample is carried onto
   *  the wall clock by this; at 0 the carry is the identity and the sample says
   *  only which frame is on the glass. See L4b. */
  function carryRate(el) {
    if (el.paused || el.ended || el.seeking) return 0;
    const r = el.playbackRate;
    return Number.isFinite(r) && r > 0 ? r : 1;
  }
  function armRvfc(el) {
    if (!useRvfc || variableFps || disposed || el !== rvEl || rvArmed) return;
    if (!rvfcSupported(el)) return;
    rvArmed = true;
    S.rvfc.registered++;
    el.requestVideoFrameCallback((nowMs, meta) => {
      rvArmed = false;
      if (disposed || el !== rvEl) return;
      S.rvfc.frames++;
      rv = {
        mediaTime: meta.mediaTime,
        expectedDisplayTime: meta.expectedDisplayTime,
        presentationTime: meta.presentationTime,
        presentedFrames: meta.presentedFrames,
        at: now(),
      };
      S.rvfc.lastMediaTime = meta.mediaTime;
      S.rvfc.lastExpectedDisplayMs = meta.expectedDisplayTime;
      armRvfc(el);                     // one-shot: re-arm for the next frame
    });
  }
  function detachRvfc() { rvEl = null; rv = null; rvArmed = false; lastCt = null; ctChangedAt = -Infinity; }
  function attachRvfc(el) {
    if (el === rvEl) return;
    detachRvfc();
    rvEl = el || null;
    if (!rvEl) return;
    S.rvfc.supported = useRvfc && !variableFps && rvfcSupported(rvEl);
    armRvfc(rvEl);
  }

  /** The L4b decision, for ONE tick. Returns the ms to ADD to a position that
   *  was derived from `el.currentTime` — 0 when the currentTime path wins,
   *  which is every tick on Firefox < 132, on `<audio>`, on a VFR source, in a
   *  hidden tab, and whenever a `timeupdate` moved currentTime more recently
   *  than the compositor presented a frame. */
  function sensorDeltaMs(el, wall) {
    const ct = el.currentTime;
    if (ct !== lastCt) { lastCt = ct; ctChangedAt = wall; }
    if (!useRvfc || variableFps || !rv) return 0;
    armRvfc(el);                       // a dropped re-arm must not blind us forever
    const rate = carryRate(el);        // 0 while the picture is not moving (L4b)
    // rVFC's sample is a PAIR, not a scalar: `mediaTime` is the PTS of the frame
    // the compositor will show AT `expectedDisplayTime`. Read as a bare number
    // it is ~half a frame to a frame AHEAD of `currentTime`, and that offset is
    // display latency, not error — carrying it onto `wall` is the whole point of
    // the spec shipping the two together. (Measured: uncarried, the two clocks
    // disagree by 0.30 frame p50 / 1.01 frame max at 30 fps; carried, see
    // sensorStats().)
    const edt = Number.isFinite(rv.expectedDisplayTime) ? rv.expectedDisplayTime : rv.at;
    const carried = rv.mediaTime + ((wall - edt) / 1000) * rate;
    const raw = (rv.mediaTime - ct) * 1000;
    const d = (carried - ct) * 1000;
    if (disagree.length < sampleLimit) { disagree.push(d); disagreeRaw.push(raw); } else S.rvfc.dropped++;
    S.rvfc.samples++;
    S.rvfc.lastDeltaMs = +d.toFixed(4);
    S.rvfc.lastRawDeltaMs = +raw.toFixed(4);
    if (wall - rv.at > rvfcStaleMs) { S.rvfc.stale++; return 0; }
    // While the picture is FROZEN (rate 0), a sample taken before the last
    // observed move of `currentTime` describes a picture that has been
    // superseded: the element was sent somewhere and the compositor has not
    // caught up yet. Only `currentTime` knows where it was sent, and the
    // disagreement can be far smaller than `jumpMs`, so the rejection below
    // cannot see it. ⚠️ Rate 0 only — see L4b for why applying this during
    // playback switches the sensor off for good rather than guarding it.
    if (rate === 0 && rv.at < ctChangedAt) { S.rvfc.superseded++; return 0; }
    // A frame sample from BEFORE a discontinuity must never be carried across
    // it: past the jump threshold the element has MOVED (L2) and only
    // `currentTime` knows where to. This is what keeps the sensor swap from
    // ever changing which branch L2 takes.
    if (Math.abs(d) > jumpMs) { S.rvfc.rejected++; return 0; }
    S.rvfc.used++;
    return d;
  }

  /** attach the L4 backstop to whichever element is currently mastering */
  function attach(el) {
    attachRvfc(el || null);
    if (!attachTimeupdate || el === attachedTo) return;
    if (attachedTo && attachedTo.removeEventListener) attachedTo.removeEventListener('timeupdate', backstop);
    attachedTo = el || null;
    if (attachedTo && attachedTo.addEventListener) attachedTo.addEventListener('timeupdate', backstop);
  }
  function backstop() { S.backstopTicks++; tick(); }

  /**
   * ONE step of the law. Call it from the rAF loop you already run.
   * @returns null when there is no usable master this tick, else
   *   {reason:'sync'|'jump'|'stall'|'hold', pos, correction, errMs}
   */
  function tick() {
    if (disposed) return null;
    S.ticks++;
    const src = pick();
    const el = src && src.el;
    if (!src || !el) {                              // no usable master right now
      if (S.driving) { S.driving = false; say('release', { why: 'no source' }); }
      S.key = null; S.idle++; clearAdvance(); attach(null);
      return null;
    }
    if (src.key !== undefined && src.key !== S.key) {   // master changed hands
      S.key = src.key; S.acquires++; clearAdvance(); say('acquire', {});
    }
    attach(el);

    // L5: not a clock while it is loading or seeking.
    if (el.readyState < 1 || el.seeking) { S.idle++; return null; }

    const wall = now();
    // L4b: `src.pos` is `anchor + el.currentTime * 1000` in every client and in
    // the element form below; the rVFC correction is therefore a DELTA on it.
    const basePos = Number.isFinite(src.pos)
      ? src.pos
      : (typeof anchorMs === 'function' ? anchorMs() : anchorMs) + el.currentTime * 1000;
    const pos = basePos + sensorDeltaMs(el, wall);

    // L5: paused / ended — re-anchor once and hold.
    if (el.paused || el.ended) {
      if (autoPlayPause && deck.playing()) deck.pause();
      deck.sync(pos);
      clearAdvance();
      S.driving = true;
      return { reason: 'hold', pos, correction: null, errMs: 0 };
    }

    const errMs = pos - deck.position();

    // L2 — THE FIX. A discontinuity is a SEEK, never a sync: a sync would leave
    // every cue in between pending and burst them the moment the lookahead
    // catches up. This branch runs BEFORE the stall check, because a jump IS an
    // advance (a scrub while the picture is frozen must not read as a stall).
    if (Math.abs(errMs) > jumpMs) {
      S.jumps++; S.lastJumpMs = Math.round(errMs);
      say('jump', { jumpMs: Math.round(errMs), mediaTime: el.currentTime, pos });
      deck.seek(pos);
      lastPos = pos; lastWall = wall;
      S.driving = true;
      return { reason: 'jump', pos, correction: null, errMs };
    }

    // L3: has the picture advanced?
    if (lastPos !== null && pos === lastPos && wall - lastWall > stallMs) {
      if (!S.stalled) {
        S.stalled = true; S.stalls++;
        say('stall', { mediaTime: el.currentTime, pos, policy: stallPolicy });
      }
      if (stallPolicy === 'hold') {
        if (autoPlayPause && deck.playing()) deck.pause();
        return { reason: 'stall', pos, correction: null, errMs };
      }
      S.releases++; S.driving = false; S.key = null; clearAdvance();
      say('release', { why: 'stall' });
      return null;                                  // client free-runs / re-picks
    }
    if (lastPos === null || pos !== lastPos) {
      if (S.stalled) { S.stalled = false; say('resume', { pos }); }
      lastPos = pos; lastWall = wall;
      if (autoPlayPause && !deck.playing()) deck.play();
    }

    // L1: the master is never nudged — we only move the vector.
    S.driving = true; S.syncs++;
    const corr = deck.sync(pos, { toleranceMs });
    if (corr) {
      S.corrections++; S.lastCorrectionMs = +corr.toFixed(2);
      if (onCorrection) onCorrection(+corr.toFixed(2));
    }
    return { reason: 'sync', pos, correction: corr, errMs };
  }

  return {
    tick,
    /** the position the master implies right now, without driving anything */
    pos() {
      const src = pick(); const el = src && src.el;
      if (!el || el.readyState < 1) return null;
      const base = Number.isFinite(src.pos)
        ? src.pos
        : (typeof anchorMs === 'function' ? anchorMs() : anchorMs) + el.currentTime * 1000;
      // read-only: never touches the sensor's accounting or re-arms anything
      if (!useRvfc || variableFps || !rv || el !== rvEl) return base;
      const w = now();
      if (w - rv.at > rvfcStaleMs) return base;
      const rate = carryRate(el);                  // L4b: paused/ended/seeking carries at 0
      if (rate === 0 && rv.at < ctChangedAt) return base;   // superseded picture
      const edt = Number.isFinite(rv.expectedDisplayTime) ? rv.expectedDisplayTime : rv.at;
      const d = (rv.mediaTime + ((w - edt) / 1000) * rate - el.currentTime) * 1000;
      return Math.abs(d) > jumpMs ? base : base + d;
    },
    driving: () => S.driving,
    stalled: () => S.stalled,
    key: () => S.key,
    /** L4b: the sensor disagreement distribution — |mediaTime − currentTime| in
     *  ms over every tick where both were readable. This is the number that
     *  says whether preferring rVFC was worth doing on THIS machine. */
    sensorStats() {
      const q = (arr, p) => arr[Math.min(arr.length - 1, Math.floor(p * arr.length))];
      const dist = (rows) => {
        const n = rows.length;
        if (!n) return { n: 0, p50: null, p95: null, max: null, mean: null, signedP50: null };
        const abs = rows.map(Math.abs).sort((a, b) => a - b);
        const signed = rows.slice().sort((a, b) => a - b);
        return {
          n, p50: +q(abs, 0.5).toFixed(4), p95: +q(abs, 0.95).toFixed(4), max: +abs[n - 1].toFixed(4),
          mean: +(rows.reduce((a, b) => a + b, 0) / n).toFixed(4),
          signedP50: +q(signed, 0.5).toFixed(4),
          signedMin: +signed[0].toFixed(4), signedMax: +signed[n - 1].toFixed(4),
        };
      };
      // `carried` is the sensor the servo actually uses; `raw` is the naive
      // "mediaTime instead of currentTime" read, kept because the gap between
      // the two IS the finding (raw = display latency, carried = sensor noise).
      return { ...dist(disagree), dropped: S.rvfc.dropped, carried: dist(disagree), raw: dist(disagreeRaw) };
    },
    /** every (carried, raw) disagreement sample in ms — for a histogram */
    sensorSamples: () => disagree.slice(),
    sensorSamplesRaw: () => disagreeRaw.slice(),
    stats: () => ({ ...S, sensor: { useRvfc, variableFps, rvfcStaleMs },
                    laws: { toleranceMs, jumpMs, stallMs, stallPolicy, autoPlayPause } }),
    /** give up the role by hand (the client took over, or the element is gone) */
    release(why = 'manual') {
      if (S.driving) { S.releases++; say('release', { why }); }
      S.driving = false; S.key = null; clearAdvance();
    },
    dispose() { disposed = true; attach(null); detachRvfc(); },
  };
}
