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
  };
  let lastPos = null, lastWall = 0, disposed = false, attachedTo = null;
  const now = () => (typeof performance === 'object' && performance.now ? performance.now() : Date.now());
  const say = (reason, extra) => { if (onEvent) onEvent({ reason, key: S.key, t: Date.now(), ...extra }); };

  function clearAdvance() { lastPos = null; lastWall = 0; }

  /** attach the L4 backstop to whichever element is currently mastering */
  function attach(el) {
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

    const pos = Number.isFinite(src.pos)
      ? src.pos
      : (typeof anchorMs === 'function' ? anchorMs() : anchorMs) + el.currentTime * 1000;
    const wall = now();

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
      return Number.isFinite(src.pos)
        ? src.pos
        : (typeof anchorMs === 'function' ? anchorMs() : anchorMs) + el.currentTime * 1000;
    },
    driving: () => S.driving,
    stalled: () => S.stalled,
    key: () => S.key,
    stats: () => ({ ...S, laws: { toleranceMs, jumpMs, stallMs, stallPolicy, autoPlayPause } }),
    /** give up the role by hand (the client took over, or the element is gone) */
    release(why = 'manual') {
      if (S.driving) { S.releases++; say('release', { why }); }
      S.driving = false; S.key = null; clearAdvance();
    },
    dispose() { disposed = true; attach(null); },
  };
}
