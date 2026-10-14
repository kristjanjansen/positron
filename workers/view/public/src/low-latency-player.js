// Low-latency HLS for Cloudflare Stream: hls.js config plus recovery (drift, stall, starved, source
// stall, fatal error, no stream yet, tab visible), and native HLS on WebKit. v14.
// createLowLatencyPlayer(video, url, opts).on('latency'|'dimensions'|'rebuild', fn); .destroy().
// why: lessons/src.md#player-header

const DEFAULTS = {
  // A drift-seek aborts in-flight fragment loads, so it must earn itself: time since the last one,
  // buffered runway, and a target the device has shown it can hold. Never more often than this
  // (ms).
  // why: lessons/src.md#drift-seek
  minDriftSeekMs: 10000,
  /** Refuse to drift-seek with less than this much buffer ahead (s). */
  driftSeekMinBuffer: 1.5,
  /** Refusals in a row before we stop fighting and raise our own target. */
  driftHeldBeforeYield: 3,
  /** How far the target may drift upward when the device cannot hold it (s). */
  maxTargetBias: 6,
  // Step the level down when the playhead advances slower than this ratio for N ticks:
  // capLevelOnFPSDrop is inert, a stuttering iPhone dropped 3 of 507 frames while crawling at 0.2x.
  // why: lessons/src.md#advance-floor
  advanceFloor: 0.8,
  advanceTicksBeforeCap: 6,
  // Do not play until the audio/video intersection holds this much: Stream lands audio seconds
  // behind
  // video at startup, and playing into 0.05 s stalls and leaves a 5.5 s hole.
  // why: lessons/src.md#start-buffer
  startBuffer: 1.0,
  startBufferTimeoutMs: 8000,
  // Ticks the starved watchdog waits when the shortfall is audio only: a seek cannot conjure audio.
  // why: lessons/src.md#audio-lag
  audioLagTicks: 12,
  /** Seek instead of nudging once we are this far past target (seconds). */
  seekThreshold: 2.0,
  /** Nudge playback rate for drift above this but below seekThreshold. */
  nudgeThreshold: 0.3,
  /** Max playback rate while catching up. 1.05 is imperceptible. */
  catchUpRate: 1.05,
  // liveSyncSeconds overrides PART-HOLD-BACK: one INDEPENDENT part per 2.0 s segment makes a target
  // inside a GOP unreachable. 3.0 s = 1.5 GOPs, passed at construction. preferNative:
  // 'auto'|true|false.
  // why: lessons/src.md#live-sync
  preferNative: 'auto',
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
  // Also drift-seek on PDT wall latency (hls.latency freezes in ingest pauses). Off by default, and
  // only when liveSyncPosition is usefully ahead.
  // why: lessons/src.md#pdt-trigger
  pdtDriftTrigger: false,
};

export function createLowLatencyPlayer(video, url, opts = {}) {
  const cfg = { ...DEFAULTS, ...opts };
  const listeners = new Map();
  const emit = (evt, p) => (listeners.get(evt) || []).forEach((f) => { try { f(p); } catch {} });
  function on(evt, fn) { listeners.set(evt, [...(listeners.get(evt) || []), fn]); return this; }

  let destroyed = false;

  // Which player. `Hls.isSupported()` is true on iPhone since iOS 17.1 (ManagedMediaSource), so it
  // no longer identifies one; decide on native HLS capability instead.
  // why: lessons/src.md#which-player
  const nativeHls = !!video.canPlayType('application/vnd.apple.mpegurl');
  const onlyManagedMse = typeof self !== 'undefined' && !self.MediaSource && !!self.ManagedMediaSource;
  // Native HLS on all WebKit, gated on ManagedMediaSource, since canPlayType answers "maybe" in
  // Chrome
  // too. Desktop Safari: native 0.961x and 5.25 s, hls.js 0.344x and 7.71 s with 2 errors.
  // why: lessons/src.md#native-gate
  const webkitMedia = typeof self !== 'undefined' && !!self.ManagedMediaSource;
  const useNative = cfg.preferNative === true
    || (cfg.preferNative === 'auto' && webkitMedia);

  const Hls = window.Hls;
  if (!Hls?.isSupported()) throw new Error('HLS is not supported in this browser');

  // ---- state shared across rebuilds ----------------------------------------
  let hls = null;
  let timer = null;
  // Shared rate state is declared before the native branch returns, or that branch throws a TDZ
  // error.
  // why: lessons/src.md#hoisted
  let advEma = null, edgeEma = null, lastAdvT = 0, lastAdvCt = -1, lastEdgeV = -1;
  let advRefT = 0, advRefCt = -1, edgeRefT = 0, edgeRefV = -1;
  let rebuildTimer = null;
  let rebuilds = 0;
  let consecutiveFailures = 0;   // rebuilds since last successfully buffered frag
  let everPlayed = false;
  let levelSwitches = 0;
  // Raised when the device demonstrates it cannot hold the target. Smooth at
  // 8 s beats jerky at 6 s, and this is what stops the seek loop re-arming.
  let targetBias = 0;
  let slowTicks = 0;
  let audioLagWaits = 0;
  let advanceCaps = 0;
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

  // Freeze the last frame into the poster before teardown, so a rebuild shows a still, not black.
  // A tainted canvas (native src) just skips.
  // why: lessons/src.md#freeze
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

  // Tear down and build fresh: every observed wedge recovers under a full rebuild and nothing
  // weaker.
  // State that must survive lives outside boot().
  // why: lessons/src.md#rebuild
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
      player: useNative ? 'native' : 'hls.js',
      webkitMedia,
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
      // A few quick fragment retries with a tight cap: a part 404 at the live edge is normal, and
      // fail-fast
      // caused rebuild storms while slow backoff hid a UID swap for minutes.
      // why: lessons/src.md#frag-retry
      levelLoadingMaxRetry: 4,
      levelLoadingRetryDelay: 1000,
      fragLoadingMaxRetry: 4,
      fragLoadingRetryDelay: 500,
      fragLoadingMaxRetryTimeout: 4000,
      maxLiveSyncPlaybackRate: cfg.catchUpRate,
      // capLevelOnFPSDrop on, though it keys on dropped frames; the advance cap covers what it
      // misses.
      // why: lessons/src.md#fps-drop
      capLevelOnFPSDrop: true,

      // Start with more material, on a boundary: these three knobs default against us in 1.7.1
      // (startFragPrefetch false, initialLiveManifestSize 1, startOnSegmentBoundary false).
      // why: lessons/src.md#start-aligned

      // Fetch the first fragment before media attach, so both loaders are
      // already moving when playback is allowed to begin.
      startFragPrefetch: true,

      // Wait for 3 segments; the audio and video playlists advance in lockstep, so both have depth.
      // why: lessons/src.md#manifest-size
      initialLiveManifestSize: 3,

      // A segment boundary is the only point both tracks decode from scratch; costs up to one
      // segment.
      // why: lessons/src.md#boundary
      startOnSegmentBoundary: true,
      // A target shorter than one keyframe interval cannot be held; see
      // liveSyncSeconds. Must be in userConfig, hence here and not a setter.
      ...(cfg.liveSyncSeconds != null ? { liveSyncDuration: cfg.liveSyncSeconds } : {}),
      ...(opts.hlsConfig || {}),
    });

    let mediaRecoveries = 0;

    // Watch the MediaSource directly: Safari closes it and dumps every buffer, and MMS gates
    // loading.
    // why: lessons/src.md#media-source
    watchMediaSource();
    // Deferred: boot() runs inside the constructor, before the caller can chain .on().
    // why: lessons/src.md#engine-emit
    if (rebuilds === 0) setTimeout(() => emit('engine', engineReport()), 0);

    hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
      // Resolution from the master manifest, about 200 ms after loadSource, reserves layout before
      // the frame.
      // why: lessons/src.md#dimensions
      const best = (data.levels || [])
        .filter((l) => l.width && l.height)
        .sort((a, b) => b.width - a.width)[0];
      if (best) {
        video.style.aspectRatio = `${best.width} / ${best.height}`;
        emit('dimensions', { width: best.width, height: best.height, aspectRatio: best.width / best.height });
      }
      startWhenPlayable();
    });

    hls.on(Hls.Events.LEVEL_LOADED, () => { mediaRecoveries = 0; });

    // Report level switches: four close renditions and one keyframe per 2 s make ABR churn a
    // suspect.
    // why: lessons/src.md#level-switch
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
      // A 204 empty manifest (no stream yet) is fatal and wedges the instance; rebuild on a rising
      // backoff.
      // why: lessons/src.md#parse-error
      consecutiveFailures++;
      const delay = Math.min(10000, cfg.bootstrapRetryDelay * Math.max(1, Math.ceil(consecutiveFailures / 3)));
      scheduleRebuild(data.details || data.type, delay);
    });

    const sep = url.includes('?') ? '&' : '?';
    hls.loadSource(cfg.cacheBust ? `${url}${sep}rb=${Date.now()}` : url);
    hls.attachMedia(video);
  }

  // Native HLS, after bufferReport() and measureRates(), so both paths report the same quantities.
  // why: lessons/src.md#native
  if (useNative) {
    // Deferred for the same reason as on the hls.js path.
    // why: lessons/src.md#native-engine
    setTimeout(() => emit('engine', {
      player: 'native', managedMediaSource: !!self.ManagedMediaSource,
      plainMediaSource: !!self.MediaSource, nativeHls, hls: null,
    }), 0);
    // Native recovery is a reload, the only lever (decode errors are terminal, UIDs change); rate
    // limited.
    // why: lessons/src.md#native-recovery
    let nativeLastEdge = -1;
    let nativeLastCt = -1;
    let nativeCtMoved = Date.now();
    let nativeEdgeMoved = Date.now();
    let nativeReloads = 0;
    let lastReloadAt = 0;
    function nativeReload(why) {
      if (destroyed) return;
      const since = Date.now() - lastReloadAt;
      if (since < cfg.nativeReloadCooldownMs) return;
      lastReloadAt = Date.now();
      nativeReloads++;
      emit('rebuild', { why, attempt: nativeReloads, player: 'native' });
      try {
        video.removeAttribute('src');
        video.load();
        video.src = url;
        video.play().catch(() => {});
      } catch { /* the element is gone */ }
    }

    video.src = url;
    video.play().catch((e) => emit('error', e));

    // Native HLS exposes no hls.latency; EXT-X-PROGRAM-DATE-TIME reaches us as
    // getStartDate(), and wall - (start + currentTime) is the true lag.
    const nativeLatency = () => {
      const start = video.getStartDate?.();
      if (!start || isNaN(start)) return null;
      const l = (Date.now() - (start.getTime() + video.currentTime * 1000)) / 1000;
      return l > 0 ? l : null;
    };

    timer = setInterval(() => {
      if (destroyed) return;
      const rates = measureRates();

      // The native source watchdog needs both the edge and the playhead frozen: currentTime does
      // not
      // share a timeline with seekable here, and an edge-only check reloaded a healthy stream.
      // why: lessons/src.md#native-source
      const edge = seekableEnd();
      if (edge != null && edge > nativeLastEdge + 0.01) { nativeLastEdge = edge; nativeEdgeMoved = Date.now(); }
      const ctMoving = video.currentTime > nativeLastCt + 0.01;
      if (ctMoving) { nativeLastCt = video.currentTime; nativeCtMoved = Date.now(); }
      if (nativeLastEdge > 0
          && Date.now() - nativeEdgeMoved > cfg.sourceStallTimeout
          && Date.now() - nativeCtMoved > cfg.sourceStallTimeout) {
        emit('stall', { kind: 'source', frozenMs: Date.now() - nativeEdgeMoved, player: 'native' });
        nativeEdgeMoved = Date.now();
        nativeReload('source-stall');
        return;
      }

      // Not gated behind latency: getStartDate() can be unavailable for a while; latency may be
      // null.
      // why: lessons/src.md#native-telemetry
      const latency = nativeLatency();
      // No target to chase: AVFoundation runs its own catch-up against the
      // manifest's PART-HOLD-BACK, which is Apple's own spec. Report what it
      // achieves rather than pretending we steer it.
      emit('latency', {
        latency, target: cfg.fallbackTarget,
        drift: latency == null ? null : latency - cfg.fallbackTarget,
        pdtLatency: latency, playbackRate: video.playbackRate,
        buffer: bufferReport(), targetBias: 0, rates,
      });
    }, cfg.interval);

    video.addEventListener('error', () => {
      const e = video.error;
      emit('media-error', { code: e?.code, message: String(e?.message || '').slice(0, 120) });
      // MEDIA_ERR_DECODE (3) and MEDIA_ERR_SRC_NOT_SUPPORTED (4) are terminal
      // for the element; only a reload clears them.
      if (e?.code === 3 || e?.code === 4) nativeReload(`media-error-${e.code}`);
    });
    video.addEventListener('waiting', () => emit('waiting', { ct: +video.currentTime.toFixed(2), ahead: bufferReport().ahead }));
    video.addEventListener('ended', () => nativeReload('ended'));

    return {
      get latency() { return nativeLatency(); },
      get target() { return cfg.fallbackTarget; },
      get hls() { return null; },
      get rebuilds() { return nativeReloads; },
      get levelSwitches() { return 0; },
      get targetBias() { return 0; },
      get advanceCaps() { return 0; },
      get player() { return 'native'; },
      bufferReport,
      engineReport,
      syncToEdge: () => {
        if (!video.seekable.length) return false;
        video.currentTime = video.seekable.end(video.seekable.length - 1);
        return true;
      },
      on,
      destroy() {
        destroyed = true;
        clearInterval(timer);
        video.removeAttribute('src');
        video.load();
      },
    };
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

  // What is buffered, per source buffer: video.buffered is the intersection, so a demuxed stream
  // reads 0 when audio and video stop overlapping.
  // why: lessons/src.md#buffer-report
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
    // null, not 0, outside every buffered range: 0 means measured and empty, null means cannot
    // tell.
    // why: lessons/src.md#null-ahead
    const inRange = ahead > 0;
    const rep = { ahead: inRange ? +ahead.toFixed(2) : null, ranges: fmt(b) };
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

  // How fast the playhead and the live edge advance per wall second: advance near 1.0 with latency
  // climbing means the edge runs away; advance well under 1.0 means the device cannot keep up.
  // why: lessons/src.md#rates
  function measureRates() {
    const now = Date.now();
    const ct = video.currentTime;
    const edge = seekableEnd();
    if (lastAdvT && now > lastAdvT) {
      const dt = (now - lastAdvT) / 1000;
      if (dt > 0.2) {
        if (lastAdvCt >= 0 && !video.paused) {
          const r = (ct - lastAdvCt) / dt;
          // A long baseline, not an EMA (an EMA reported the startup transient), moved only on a
          // jump or when stale.
          // why: lessons/src.md#baseline
          if (r < -0.1 || r >= 3) {
            advRefT = now; advRefCt = ct;          // a jump: restart the baseline
          } else if (advRefT === 0) {
            advRefT = now; advRefCt = ct;
          } else {
            const span = (now - advRefT) / 1000;
            if (span > 1) advEma = (ct - advRefCt) / span;
            if (span > 30) { advRefT = now; advRefCt = ct; }   // keep it fresh
          }
        }
        if (lastEdgeV >= 0 && edge != null) {
          const e = (edge - lastEdgeV) / dt;
          if (e < -0.1 || e >= 3) { edgeRefT = now; edgeRefV = edge; }
          else if (edgeRefT === 0) { edgeRefT = now; edgeRefV = edge; }
          else {
            const span = (now - edgeRefT) / 1000;
            if (span > 1) edgeEma = (edge - edgeRefV) / span;
            if (span > 30) { edgeRefT = now; edgeRefV = edge; }
          }
        }
        lastAdvT = now; lastAdvCt = ct; lastEdgeV = edge ?? -1;
      }
    } else { lastAdvT = now; lastAdvCt = ct; lastEdgeV = edge ?? -1; }
    let q = null;
    try {
      const g = video.getVideoPlaybackQuality?.();
      if (g) q = { total: g.totalVideoFrames, dropped: g.droppedVideoFrames, corrupted: g.corruptedVideoFrames };
      else if (video.webkitDecodedFrameCount != null) q = { total: video.webkitDecodedFrameCount, dropped: video.webkitDroppedFrameCount };
    } catch { /* not everywhere */ }
    return {
      advance: advEma == null ? null : +advEma.toFixed(3),
      edgeRate: edgeEma == null ? null : +edgeEma.toFixed(3),
      rate: video.playbackRate,
      quality: q,
    };
  }

  /** Play once the intersection is playable, or after the timeout regardless. */
  function startWhenPlayable() {
    const t0 = Date.now();
    const attempt = () => {
      if (destroyed) return;
      const ahead = bufferReport().ahead ?? 0;
      const waited = Date.now() - t0;
      if (ahead >= cfg.startBuffer || waited > cfg.startBufferTimeoutMs) {
        emit('start', { ahead: +ahead.toFixed(2), waitedMs: waited, forced: ahead < cfg.startBuffer });
        video.play().catch((e) => emit('error', e));
        return;
      }
      setTimeout(attempt, 100);
    };
    attempt();
  }

  let msWatched = null;
  function watchMediaSource() {
    // hls.js keeps it on the bufferController; undocumented, so guarded, and
    // retried because it does not exist at the instant boot() runs.
    let tries = 0;
    const grab = () => {
      if (destroyed || tries++ > 40) return;
      const ms = hls?.bufferController?.mediaSource;
      if (!ms || ms === msWatched) { setTimeout(grab, 250); return; }
      msWatched = ms;
      emit('ms', { event: 'attached', readyState: ms.readyState, kind: ms.constructor?.name });
      for (const ev of ['sourceopen', 'sourceended', 'sourceclose', 'startstreaming', 'endstreaming']) {
        try {
          ms.addEventListener(ev, () => {
            emit('ms', {
              event: ev,
              readyState: ms.readyState,
              // MMS.streaming is the flag Safari flips to gate our loading
              streaming: typeof ms.streaming === 'boolean' ? ms.streaming : null,
              ct: +video.currentTime.toFixed(2),
              ahead: bufferReport().ahead,
              hidden: document.hidden,
            });
          });
        } catch { /* not every impl exposes every event */ }
      }
      setTimeout(grab, 1000);          // a rebuild makes a new MediaSource
    };
    grab();
  }

  function seekableEnd() {
    return video.seekable.length ? video.seekable.end(video.seekable.length - 1) : null;
  }

  function tick() {
    if (destroyed || Date.now() < cooldownUntil) return;

    // Source watchdog: runs while paused too, so draining the buffer cannot mask a dead origin.
    // why: lessons/src.md#source-watchdog
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
      // Starved: keep the stall clock running (holes parked readyState 1 for 18 to 20 s). Skip to a
      // real
      // range just ahead after 3 confirming ticks, once per target, before escalating.
      // why: lessons/src.md#starved
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
        // Audio-only shortfall: wait, since a seek forward only opens a hole.
        // why: lessons/src.md#audio-only
        const rep = bufferReport();
        const vr = rep.tracks?.video;
        const vEnd = vr?.length ? vr[vr.length - 1][1] : null;
        if (vEnd != null && vEnd > video.currentTime + 2 && (rep.ahead ?? 0) < 0.5
            && audioLagWaits < cfg.audioLagTicks) {
          audioLagWaits++;
          emit('audio-lag', { videoAhead: +(vEnd - video.currentTime).toFixed(2),
            intersection: rep.ahead, waits: audioLagWaits });
          return;
        }
        audioLagWaits = 0;
        lastAdvance = Date.now();
        failedSeeks++;
        emit('stall', { kind: 'starved', attempt: failedSeeks, buffer: rep });
        // Nothing buffered ahead to skip to: seek to the live edge; escalate
        // to a rebuild if that keeps failing or starvation repeats.
        if (failedSeeks > cfg.seeksBeforeReload || !syncToEdge('starved')) rebuild('starved');
      }
      return;
    }

    beachedTicks = 0; lastHoleSkipTo = -1;
    measureRates();   // keep the EMA warm across the early ticks

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
    const rates = measureRates();
    // Judge advance only while playing with a healthy buffer; `?? 0` because null means cannot
    // tell.
    // why: lessons/src.md#advance-judge
    if (rates.advance != null && !video.paused && (bufferReport().ahead ?? 0) > 2) {
      if (rates.advance < cfg.advanceFloor) slowTicks++;
      else slowTicks = Math.max(0, slowTicks - 1);
      if (slowTicks >= cfg.advanceTicksBeforeCap && hls?.levels?.length > 1) {
        const cur = hls.currentLevel >= 0 ? hls.currentLevel : hls.levels.length - 1;
        const next = Math.max(0, cur - 1);
        if (next !== cur && (hls.autoLevelCapping === -1 || hls.autoLevelCapping > next)) {
          hls.autoLevelCapping = next;
          advanceCaps++;
          slowTicks = 0;
          emit('advance-capped', {
            advance: rates.advance, from: cur, to: next,
            height: hls.levels[next]?.height, caps: advanceCaps,
          });
        } else slowTicks = 0;
      }
    }
    const latency = currentLatency();
    if (latency == null) return;
    const target = targetLatency();
    const drift = latency - target;
    // PDT wall latency, always reported; acted on only with pdtDriftTrigger and room ahead to seek.
    // why: lessons/src.md#pdt-latency
    const pd = hls?.playingDate;
    const pdtLatency = pd ? (Date.now() - pd.getTime()) / 1000 : null;
    const pdtDrift = cfg.pdtDriftTrigger && pdtLatency != null
      && pdtLatency - target > cfg.seekThreshold
      && (hls?.liveSyncPosition ?? -Infinity) - video.currentTime > cfg.seekThreshold;

    if (drift > cfg.seekThreshold || pdtDrift) {
      const sinceSeek = Date.now() - lastDriftSeekAt;
      const runway = bufferReport().ahead ?? 0;
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
    emit('latency', { latency, target, drift, pdtLatency, playbackRate: video.playbackRate, buffer: bufferReport(), targetBias, rates });
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

  // The element's own error object names decode failures that never reach
  // hls.js as an ERROR event.
  video.addEventListener('error', () => {
    const e = video.error;
    emit('media-error', { code: e?.code, message: String(e?.message || '').slice(0, 120) });
  });
  video.addEventListener('waiting', () => emit('waiting', { ct: +video.currentTime.toFixed(2), ahead: bufferReport().ahead }));

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
    get advanceCaps() { return advanceCaps; },
    get player() { return 'hls.js'; },
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
