// mediaMaster(deck, sourceOrEl, opts); call mm.tick() from your rAF. The element is never nudged;
// drift is a sync, a jump past `jumpMs` is a seek; a stall holds or releases; timeupdate and seeked
// back up a hidden tab; rVFC mediaTime is used when fresher (carried at the picture's real rate).
// why: lessons/timeline-media-master.md#laws

// source: an element or () => {el, pos, key?}. opts: anchorMs, toleranceMs 40, jumpMs 250, stallMs
// 1000, stallPolicy 'hold'|'release', autoPlayPause, attachTimeupdate, useRvfc, variableFps,
// rvfcStaleMs 250, sampleLimit, onEvent, onCorrection.
// why: lessons/timeline-media-master.md#options
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

  // One rVFC registration per mastering element, re-armed in the callback; the fresher of the frame
  // sample and currentTime wins, and their disagreement is recorded.
  // why: lessons/timeline-media-master.md#rvfc
  let rvEl = null, rv = null, rvArmed = false;
  let lastCt = null, ctChangedAt = -Infinity;
  const disagree = [];                 // (mediaTime carried to now − currentTime), ms
  const disagreeRaw = [];              // (mediaTime − currentTime) UNCARRIED, ms

  function rvfcSupported(el) {
    return !!(el && typeof el.requestVideoFrameCallback === 'function');
  }
  // The rate the picture moves at: 0 when paused, ended or seeking (playbackRate reads 1 when
  // paused).
  // why: lessons/timeline-media-master.md#carry-rate
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

  // Ms to add to a currentTime-derived position this tick; 0 whenever currentTime wins.
  // why: lessons/timeline-media-master.md#sensor-delta
  function sensorDeltaMs(el, wall) {
    const ct = el.currentTime;
    if (ct !== lastCt) { lastCt = ct; ctChangedAt = wall; }
    if (!useRvfc || variableFps || !rv) return 0;
    armRvfc(el);                       // a dropped re-arm must not blind us forever
    const rate = carryRate(el);        // 0 while the picture is not moving (L4b)
    // mediaTime is the frame shown at expectedDisplayTime, so it is carried onto the wall clock.
    // why: lessons/timeline-media-master.md#pair
    const edt = Number.isFinite(rv.expectedDisplayTime) ? rv.expectedDisplayTime : rv.at;
    const carried = rv.mediaTime + ((wall - edt) / 1000) * rate;
    const raw = (rv.mediaTime - ct) * 1000;
    const d = (carried - ct) * 1000;
    if (disagree.length < sampleLimit) { disagree.push(d); disagreeRaw.push(raw); } else S.rvfc.dropped++;
    S.rvfc.samples++;
    S.rvfc.lastDeltaMs = +d.toFixed(4);
    S.rvfc.lastRawDeltaMs = +raw.toFixed(4);
    if (wall - rv.at > rvfcStaleMs) { S.rvfc.stale++; return 0; }
    // While frozen, a sample older than currentTime's last move is superseded. Rate 0 only, or the
    // sensor switches itself off during playback.
    // why: lessons/timeline-media-master.md#superseded
    if (rate === 0 && rv.at < ctChangedAt) { S.rvfc.superseded++; return 0; }
    // A sample past `jumpMs` is never carried across a jump.
    // why: lessons/timeline-media-master.md#rejected
    if (Math.abs(d) > jumpMs) { S.rvfc.rejected++; return 0; }
    S.rvfc.used++;
    return d;
  }

  // Attach timeupdate and `seeked`: a paused element fires neither timeupdate nor frames, so a seek
  // of a paused master is heard only through `seeked`.
  // why: lessons/timeline-media-master.md#attach
  function attach(el) {
    attachRvfc(el || null);
    if (!attachTimeupdate || el === attachedTo) return;
    if (attachedTo && attachedTo.removeEventListener) {
      attachedTo.removeEventListener('timeupdate', backstop);
      attachedTo.removeEventListener('seeked', backstop);
    }
    attachedTo = el || null;
    if (attachedTo && attachedTo.addEventListener) {
      attachedTo.addEventListener('timeupdate', backstop);
      attachedTo.addEventListener('seeked', backstop);
    }
  }
  function backstop() { S.backstopTicks++; tick(); }

  // One step, from your rAF. Returns null or {reason: 'sync'|'jump'|'stall'|'hold', pos,
  // correction, errMs}.
  // why: lessons/timeline-media-master.md#tick
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

    // Paused or ended: re-anchor once and hold.
    // why: lessons/timeline-media-master.md#paused
    if (el.paused || el.ended) {
      if (autoPlayPause && deck.playing()) deck.pause();
      deck.sync(pos);
      clearAdvance();
      S.driving = true;
      return { reason: 'hold', pos, correction: null, errMs: 0 };
    }

    const errMs = pos - deck.position();

    // A discontinuity is a seek, never a sync (cues in between would burst); checked before the
    // stall.
    // why: lessons/timeline-media-master.md#jump
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

    // The master is never nudged; only the vector moves.
    // why: lessons/timeline-media-master.md#never-nudged
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
    // |mediaTime - currentTime| in ms per tick: whether preferring rVFC pays on this machine.
    // why: lessons/timeline-media-master.md#sensor-stats
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
    // every (carried, raw) disagreement sample in ms
    // why: lessons/timeline-media-master.md#samples
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
