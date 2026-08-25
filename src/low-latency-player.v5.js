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

const DEFAULTS = {
  /** Seek instead of nudging once we are this far past target (seconds). */
  seekThreshold: 2.0,
  /** Nudge playback rate for drift above this but below seekThreshold. */
  nudgeThreshold: 0.3,
  /** Max playback rate while catching up. 1.05 is imperceptible. */
  catchUpRate: 1.05,
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
  let cooldownUntil = 0;

  // watchdog state
  let lastTime = -1, lastAdvance = Date.now(), failedSeeks = 0;
  let lastEdge = -1, lastEdgeMove = Date.now();

  function resetWatchdogs() {
    lastTime = -1; lastAdvance = Date.now(); failedSeeks = 0;
    lastEdge = -1; lastEdgeMove = Date.now();
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
      ...(opts.hlsConfig || {}),
    });

    let mediaRecoveries = 0;

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
    return typeof t === 'number' && t > 0 ? t : cfg.fallbackTarget;
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
      emit('stall', { kind: 'source', frozenMs: Date.now() - lastEdgeMove });
      rebuild('source-stall');
      return;
    }

    if (video.paused || video.readyState < 2) { lastAdvance = Date.now(); return; }

    // -- player watchdog: is the playhead moving? ---------------------------
    if (video.currentTime > lastTime + 0.01) {
      lastTime = video.currentTime;
      lastAdvance = Date.now();
      failedSeeks = 0;
    } else if (Date.now() - lastAdvance > cfg.stallTimeout) {
      lastAdvance = Date.now();
      failedSeeks++;
      emit('stall', { kind: 'player', frozenMs: cfg.stallTimeout, attempt: failedSeeks });
      if (failedSeeks > cfg.seeksBeforeReload || !syncToEdge('stall')) rebuild('player-stall');
      return;
    }

    // -- latency control ----------------------------------------------------
    const latency = currentLatency();
    if (latency == null) return;
    const target = targetLatency();
    const drift = latency - target;

    if (drift > cfg.seekThreshold) {
      syncToEdge('drift');
    } else if (drift > cfg.nudgeThreshold) {
      const rate = Math.min(cfg.catchUpRate, 1 + drift / 100);
      if (video.playbackRate !== rate) video.playbackRate = rate;
    } else if (video.playbackRate !== 1) {
      video.playbackRate = 1;
    }
    emit('latency', { latency, target, drift, playbackRate: video.playbackRate });
  }

  function onVisibility() {
    if (document.visibilityState === 'visible' && cfg.resyncOnVisible) {
      setTimeout(() => { if (!syncToEdge('visibility')) resetWatchdogs(); }, 250);
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
    syncToEdge: () => syncToEdge('manual'),
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
