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

const DEFAULTS = {
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
  minDriftSeekMs: 10000,
  /** Refuse to drift-seek with less than this much buffer ahead (s). */
  driftSeekMinBuffer: 1.5,
  /** Refusals in a row before we stop fighting and raise our own target. */
  driftHeldBeforeYield: 3,
  /** How far the target may drift upward when the device cannot hold it (s). */
  maxTargetBias: 6,
  /** Seek instead of nudging once we are this far past target (seconds). */
  seekThreshold: 2.0,
  /** Nudge playback rate for drift above this but below seekThreshold. */
  nudgeThreshold: 0.3,
  /** Max playback rate while catching up. 1.05 is imperceptible. */
  catchUpRate: 1.05,
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
  liveSyncSeconds: 3.0,
  /** Fallback latency target if the manifest advertises no hold-back. */
  fallbackTarget: 3.0,
  /** Drift/watchdog evaluation cadence (ms). */
  interval: 500,
  /** Re-sync when a hidden tab becomes visible again. */
  resyncOnVisible: true,
  /** hls.js native manifest/level retry cadence (ms); retries are uncapped. */
  manifestRetryDelay: 3000,
  /** Playhead frozen this long counts as a player stall (ms). */
  stallTimeout: 6000,
  /** Live edge frozen this long means the source died (ms). */
  sourceStallTimeout: 12000,
  /** Failed seeks tolerated before escalating to a rebuild. */
  seeksBeforeReload: 2,
  /** Cadence for rebuild attempts while the stream doesn't exist yet (ms). */
  bootstrapRetryDelay: 2500,
  /** Cooldown after a rebuild before watchdogs may fire again (ms). */
  rebuildCooldown: 4000,
  /** Append a rebuild nonce to the manifest URL. OFF: Cloudflare propagates
   *  manifest query params into child playlist URLs, with unknown effects. */
  cacheBust: false,
  /** Also fire the drift-seek off PDT wall-clock latency. OFF by default:
   *  hls.latency freezes stale during socket-open ingest pauses (measured
   *  1.7 s reported vs 8.4 s true) and PDT is the only honest signal there —
   *  but a wall-lag with nothing buffered ahead is player-irreducible, so the
   *  trigger also requires liveSyncPosition to be usefully ahead. */
  pdtDriftTrigger: false,
};

export function createLowLatencyPlayer(video, url, opts = {}) {
  const cfg = { ...DEFAULTS, ...opts };
  const listeners = new Map();
  const emit = (evt, p) => (listeners.get(evt) || []).forEach((f) => { try { f(p); } catch {} });
  function on(evt, fn) { listeners.set(evt, [...(listeners.get(evt) || []), fn]); return this; }

  let destroyed = false;

  // ---- Safari: native HLS manages its own live edge correctly. -------------
  if (!window.Hls?.isSupported?.() && video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = url;
    video.play().catch((e) => emit('error', e));
    const api = {
      get latency() {
        const start = video.getStartDate?.();
        if (!start || isNaN(start)) return null;
        return (Date.now() - (start.getTime() + video.currentTime * 1000)) / 1000;
      },
      get target() { return cfg.fallbackTarget; },
      get hls() { return null; },
      syncToEdge() {
        if (video.seekable.length) video.currentTime = video.seekable.end(video.seekable.length - 1);
      },
      on, destroy() { video.removeAttribute('src'); video.load(); },
    };
    return api;
  }

  const Hls = window.Hls;
  if (!Hls?.isSupported()) throw new Error('HLS is not supported in this browser');

  // ---- state shared across rebuilds ----------------------------------------
  let hls = null;
  let timer = null;
  let rebuildTimer = null;
  let rebuilds = 0;
  let consecutiveFailures = 0;   // rebuilds since last successfully buffered frag
  let everPlayed = false;
  let levelSwitches = 0;
  // Raised when the device demonstrates it cannot hold the target. Smooth at
  // 8 s beats jerky at 6 s, and this is what stops the seek loop re-arming.
  let targetBias = 0;
  let lastDriftSeekAt = 0;
  let driftHeld = 0;
  let cooldownUntil = 0;

  // watchdog state
  let lastTime = -1, lastAdvance = Date.now(), failedSeeks = 0;
  let lastEdge = -1, lastEdgeMove = Date.now();
  let failedDriftSeeks = 0, beachedTicks = 0, lastHoleSkipTo = -1;

  function resetWatchdogs() {
    lastTime = -1; lastAdvance = Date.now(); failedSeeks = 0;
    lastEdge = -1; lastEdgeMove = Date.now();
    failedDriftSeeks = 0; beachedTicks = 0; lastHoleSkipTo = -1;
  }

  /** First buffered range starting a real hole's width past the playhead. */
  function nextBufferedAhead(minGap) {
    const b = video.buffered;
    for (let i = 0; i < b.length; i++) {
      if (b.start(i) > video.currentTime + minGap && b.end(i) - b.start(i) > 0.5) return b.start(i) + 0.1;
    }
    return null;
  }

  /**
   * Freeze the last decoded frame into the element's poster before teardown,
   * so a rebuild shows a still image instead of flashing black. MSE-fed video
   * does not taint the canvas (hls.js fetches media via CORS), so this is safe
   * on the hls.js path; a tainted canvas (native src fallback) just skips.
   */
  function freezeFrame() {
    if (video.readyState < 2 || !video.videoWidth) return;
    try {
      const c = document.createElement('canvas');
      c.width = video.videoWidth;
      c.height = video.videoHeight;
      c.getContext('2d').drawImage(video, 0, 0);
      video.poster = c.toDataURL('image/jpeg', 0.85);
    } catch {}
  }

  /**
   * Tear the Hls instance down and build a fresh one. Deliberately blunt:
   * every observed wedge (dead level after UID swap, instance stuck after
   * manifestParsingError) recovers under a full rebuild and under nothing
   * weaker. State that must survive lives outside boot().
   */
  let lastRebuildAt = 0;
  function rebuild(why) {
    if (destroyed) return;
    // Hard rate limit across ALL triggers (fatal errors, watchdogs, visibility):
    // rebuild storms were the direct cause of the v4 tab crash.
    const since = Date.now() - lastRebuildAt;
    if (since < 3000) { scheduleRebuild(why, 3000 - since); return; }
    lastRebuildAt = Date.now();
    clearTimeout(rebuildTimer);
    rebuildTimer = null;
    rebuilds++;
    emit('rebuild', { why, attempt: rebuilds });
    freezeFrame();
    try { hls?.destroy(); } catch {}
    cooldownUntil = Date.now() + cfg.rebuildCooldown;
    resetWatchdogs();
    boot();
  }

  function scheduleRebuild(why, delay) {
    if (destroyed || rebuildTimer) return;
    rebuildTimer = setTimeout(() => { rebuildTimer = null; rebuild(why); }, delay);
  }

  /** Which MediaSource implementation is live, and does Safari gate loading? */
  function engineReport() {
    const mms = typeof self !== 'undefined' && !!self.ManagedMediaSource;
    return {
      managedMediaSource: mms,
      plainMediaSource: typeof self !== 'undefined' && !!self.MediaSource,
      // no MediaSource + ManagedMediaSource present == iPhone Safari 17.1+,
      // where Safari decides when we may load at all
      gatedBySafari: mms && !(typeof self !== 'undefined' && self.MediaSource),
      hls: window.Hls?.version || null,
    };
  }

  function boot() {
    hls = new Hls({
      lowLatencyMode: true,
      backBufferLength: 30,
      // Native, uncapped retry for manifest/level loads: "stream not up yet"
      // and transient origin errors are handled inside hls.js without any
      // instance surgery (the elektronstudio/v4 approach).
      manifestLoadingMaxRetry: Infinity,
      manifestLoadingRetryDelay: cfg.manifestRetryDelay,
      manifestLoadingMaxRetryTimeout: 8000,
      // Fragment retries: moderate. At the LL-HLS live edge a brief part 404
      // is NORMAL (players request parts as they are born) — v4's fail-fast
      // (1 retry) turned that churn into fatal->rebuild storms that crashed
      // the tab. But v3's slow default backoff took 3-5 min to surface a real
      // swap. Middle path: a few quick retries, tight timeout cap.
      levelLoadingMaxRetry: 4,
      levelLoadingRetryDelay: 1000,
      fragLoadingMaxRetry: 4,
      fragLoadingRetryDelay: 500,
      fragLoadingMaxRetryTimeout: 4000,
      maxLiveSyncPlaybackRate: cfg.catchUpRate,
      // A target shorter than one keyframe interval cannot be held; see
      // liveSyncSeconds. Must be in userConfig, hence here and not a setter.
      ...(cfg.liveSyncSeconds != null ? { liveSyncDuration: cfg.liveSyncSeconds } : {}),
      ...(opts.hlsConfig || {}),
    });

    let mediaRecoveries = 0;
    // NOT emitted synchronously: boot() runs inside createLowLatencyPlayer,
    // before the caller has had a chance to chain .on(), so a synchronous
    // emit reaches nobody. The iOS report came back with no ENGINE line at
    // all and that was this bug, not a device signal.
    if (rebuilds === 0) setTimeout(() => emit('engine', engineReport()), 0);

    hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
      // Dimensions live in the master manifest (#EXT-X-STREAM-INF RESOLUTION):
      // available ~200 ms after loadSource, seconds before the first decoded
      // frame sets videoWidth. Reserve layout now — no jump.
      const best = (data.levels || [])
        .filter((l) => l.width && l.height)
        .sort((a, b) => b.width - a.width)[0];
      if (best) {
        video.style.aspectRatio = `${best.width} / ${best.height}`;
        emit('dimensions', { width: best.width, height: best.height, aspectRatio: best.width / best.height });
      }
      video.play().catch((e) => emit('error', e));
    });

    hls.on(Hls.Events.LEVEL_LOADED, () => { mediaRecoveries = 0; });

    // ABR churn is the other jank candidate and it is UNMEASURED on the
    // device that showed the problem. The stream carries four renditions
    // (720/480/360/240) with tightly clustered BANDWIDTH, and a switch at
    // the live edge cannot present a frame until the next INDEPENDENT part
    // — once per 2.0 s. Report switches so the phone can answer it.
    hls.on(Hls.Events.LEVEL_SWITCHED, (_e, data) => {
      const l = hls.levels?.[data.level];
      levelSwitches++;
      emit('level', { level: data.level, switches: levelSwitches, width: l?.width, height: l?.height });
    });

    hls.on(Hls.Events.FRAG_BUFFERED, () => { everPlayed = true; consecutiveFailures = 0; });

    hls.on(Hls.Events.ERROR, (_e, data) => {
      emit('error', data);
      if (!data.fatal) return;

      if (data.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRecoveries < 2) {
        mediaRecoveries++;
        if (mediaRecoveries === 2) hls.swapAudioCodec();
        hls.recoverMediaError();
        return;
      }
      // Parsing errors (204 empty manifest — stream not started) are NOT
      // covered by the native loading retry, and a wedged instance emits
      // nothing further. Rebuild on a rising backoff: quick first retries for
      // the common transient, easing off while the edge converges after a
      // broadcast swap instead of hammering stale manifests.
      consecutiveFailures++;
      const delay = Math.min(10000, cfg.bootstrapRetryDelay * Math.max(1, Math.ceil(consecutiveFailures / 3)));
      scheduleRebuild(data.details || data.type, delay);
    });

    const sep = url.includes('?') ? '&' : '?';
    hls.loadSource(cfg.cacheBust ? `${url}${sep}rb=${Date.now()}` : url);
    hls.attachMedia(video);
  }

  // ---- latency + stall control (runs across rebuilds) ------------------------
  function targetLatency() {
    const t = hls?.targetLatency;
    const base = typeof t === 'number' && t > 0 ? t : cfg.fallbackTarget;
    return base + targetBias;
  }

  function currentLatency() {
    const l = hls?.latency;
    return typeof l === 'number' && l > 0 ? l : null;
  }

  function syncToEdge(reason) {
    const lsp = hls?.liveSyncPosition;
    if (lsp == null || !isFinite(lsp)) return false;
    // Never seek backwards: after a UID swap liveSyncPosition can point
    // *behind* the playhead (stale level). Obeying it makes things worse.
    if (lsp < video.currentTime - 0.5) return false;
    video.currentTime = lsp;
    video.playbackRate = 1;
    emit('resync', { reason, to: lsp });
    return true;
  }

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
  function bufferReport() {
    const fmt = (tr) => {
      const out = [];
      for (let i = 0; i < tr.length; i++) out.push([+tr.start(i).toFixed(2), +tr.end(i).toFixed(2)]);
      return out;
    };
    const t = video.currentTime;
    const b = video.buffered;
    let ahead = 0;
    for (let i = 0; i < b.length; i++) {
      if (b.start(i) <= t + 0.1 && b.end(i) > t) { ahead = b.end(i) - t; break; }
    }
    const rep = { ahead: +ahead.toFixed(2), ranges: fmt(b) };
    // hls.js keeps the per-type buffers here. Undocumented, so guarded.
    try {
      const tracks = hls?.bufferController?.tracks;
      if (tracks) {
        rep.tracks = {};
        for (const k of Object.keys(tracks)) {
          const buf = tracks[k]?.buffer;
          if (buf?.buffered) rep.tracks[k] = fmt(buf.buffered);
        }
      }
    } catch { /* internals moved; the intersection above still stands */ }
    return rep;
  }

  function seekableEnd() {
    return video.seekable.length ? video.seekable.end(video.seekable.length - 1) : null;
  }

  function tick() {
    if (destroyed || Date.now() < cooldownUntil) return;

    // -- source watchdog: is new content still being produced? --------------
    // Runs even while paused/stalled — currentTime advancing through the
    // remaining buffer must not mask a dead origin.
    const edge = seekableEnd();
    if (edge != null && edge > lastEdge + 0.01) { lastEdge = edge; lastEdgeMove = Date.now(); }
    if (everPlayed && Date.now() - lastEdgeMove > cfg.sourceStallTimeout) {
      emit('stall', { kind: 'source', frozenMs: Date.now() - lastEdgeMove, buffer: bufferReport() });
      rebuild('source-stall');
      return;
    }

    if (video.paused) {
      lastAdvance = Date.now();
      // A muted live player has no legitimate long-lived paused state. Chrome
      // pauses hidden/occluded tabs and nothing on the resume path ever calls
      // play() again (boot() only plays on MANIFEST_PARSED). Re-request it.
      if (everPlayed && document.visibilityState === 'visible') video.play().catch(() => {});
      return;
    }
    if (video.readyState < 2) {
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
      const ahead = nextBufferedAhead(0.25);
      if (ahead != null && Math.abs(ahead - lastHoleSkipTo) > 0.5) {
        beachedTicks++;
        if (beachedTicks >= 3) {
          beachedTicks = 0;
          lastAdvance = Date.now();
          lastHoleSkipTo = ahead;
          video.currentTime = ahead;
          emit('resync', { reason: 'hole-skip', to: ahead });
          return;
        }
      } else beachedTicks = 0;
      if (Date.now() - lastAdvance > cfg.stallTimeout) {
        lastAdvance = Date.now();
        failedSeeks++;
        emit('stall', { kind: 'starved', attempt: failedSeeks, buffer: bufferReport() });
        // Nothing buffered ahead to skip to: seek to the live edge; escalate
        // to a rebuild if that keeps failing or starvation repeats.
        if (failedSeeks > cfg.seeksBeforeReload || !syncToEdge('starved')) rebuild('starved');
      }
      return;
    }

    beachedTicks = 0; lastHoleSkipTo = -1;

    // -- player watchdog: is the playhead moving? ---------------------------
    if (video.currentTime > lastTime + 0.01) {
      lastTime = video.currentTime;
      lastAdvance = Date.now();
      failedSeeks = 0;
    } else if (Date.now() - lastAdvance > cfg.stallTimeout) {
      lastAdvance = Date.now();
      failedSeeks++;
      emit('stall', { kind: 'player', frozenMs: cfg.stallTimeout, attempt: failedSeeks, buffer: bufferReport() });
      if (failedSeeks > cfg.seeksBeforeReload || !syncToEdge('stall')) rebuild('player-stall');
      return;
    }

    // -- latency control ----------------------------------------------------
    const latency = currentLatency();
    if (latency == null) return;
    const target = targetLatency();
    const drift = latency - target;
    // PDT wall-clock latency: the only honest signal while hls.latency sits
    // frozen during a socket-open ingest pause. Always reported; only acted
    // on when cfg.pdtDriftTrigger is set AND there is somewhere ahead to seek
    // to (otherwise the wall lag is player-irreducible).
    const pd = hls?.playingDate;
    const pdtLatency = pd ? (Date.now() - pd.getTime()) / 1000 : null;
    const pdtDrift = cfg.pdtDriftTrigger && pdtLatency != null
      && pdtLatency - target > cfg.seekThreshold
      && (hls?.liveSyncPosition ?? -Infinity) - video.currentTime > cfg.seekThreshold;

    if (drift > cfg.seekThreshold || pdtDrift) {
      const sinceSeek = Date.now() - lastDriftSeekAt;
      const runway = bufferReport().ahead;
      // Both of these were violated on the iPhone: seeks every ~2.5 s, and
      // seeks issued with 0.02 s of buffer ahead.
      if (sinceSeek < cfg.minDriftSeekMs || runway < cfg.driftSeekMinBuffer) {
        driftHeld++;
        if (driftHeld >= cfg.driftHeldBeforeYield && targetBias < cfg.maxTargetBias) {
          driftHeld = 0;
          targetBias = Math.min(cfg.maxTargetBias, targetBias + 1);
          emit('target-raised', { bias: targetBias, target: targetLatency(), latency, runway });
        }
        // fall through to the nudge: playbackRate is invisible, a seek is not
        if (drift > cfg.nudgeThreshold) {
          const r = Math.min(cfg.catchUpRate, 1 + drift / 100);
          if (video.playbackRate !== r) video.playbackRate = r;
        }
      } else {
        driftHeld = 0;
        lastDriftSeekAt = Date.now();
        // syncToEdge fails silently when liveSyncPosition is null or behind the
        // playhead (stale level). A failing drift-seek must escalate, not no-op
        // forever with playbackRate parked at 1.
        if (!syncToEdge('drift')) {
          failedDriftSeeks++;
          if (failedDriftSeeks >= 6) { failedDriftSeeks = 0; rebuild('drift-seek-wedged'); return; }
        } else failedDriftSeeks = 0;
      }
    } else if (drift > cfg.nudgeThreshold) {
      const rate = Math.min(cfg.catchUpRate, 1 + drift / 100);
      if (video.playbackRate !== rate) video.playbackRate = rate;
    } else if (video.playbackRate !== 1) {
      video.playbackRate = 1;
    }
    emit('latency', { latency, target, drift, pdtLatency, playbackRate: video.playbackRate, buffer: bufferReport(), targetBias });
  }

  function onVisibility() {
    if (document.visibilityState === 'visible' && cfg.resyncOnVisible) {
      setTimeout(() => {
        if (!syncToEdge('visibility')) resetWatchdogs();
        // Chrome pauses muted video in background tabs; without this a tab
        // that becomes visible again seeks but stays paused forever.
        if (video.paused) video.play().catch(() => {});
      }, 250);
    }
  }

  boot();
  timer = setInterval(tick, cfg.interval);
  document.addEventListener('visibilitychange', onVisibility);

  const api = {
    get latency() { return currentLatency(); },
    get target() { return targetLatency(); },
    get hls() { return hls; },
    get rebuilds() { return rebuilds; },
    get levelSwitches() { return levelSwitches; },
    get targetBias() { return targetBias; },
    syncToEdge: () => syncToEdge('manual'),
    bufferReport,
    engineReport,
    on,
    destroy() {
      destroyed = true;
      clearInterval(timer);
      clearTimeout(rebuildTimer);
      document.removeEventListener('visibilitychange', onVisibility);
      try { hls?.destroy(); } catch {}
    },
  };
  return api;
}
