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
 *   const cues = createTimedMessages(player, video, {
 *     onMessage: (cue, {lateMs}) => showOverlay(cue.data),
 *   });
 *   cues.add({ id: 'act2', at: Date.parse('...'), data: {...} });
 *   cues.connect('wss://your-worker.example/cues');   // optional transport
 *   cues.destroy();
 */

const DEFAULTS = {
  /** Poll cadence (ms). 100 ms ≈ 3 frames — tight enough for overlays. */
  interval: 100,
  /**
   * Fire cues up to this many ms *behind* the playhead (late joiner, seek,
   * rebuild). Older cues are surfaced through onMissed instead, so a late
   * joiner can e.g. render past chat without replaying every animation.
   */
  pastWindow: 15000,
  /** WebSocket reconnect backoff bounds (ms). */
  wsRetryMin: 1000,
  wsRetryMax: 15000,
  /** Auth token appended to the WS URL (?token=…) when the URL lacks one. */
  token: null,
};

export function createTimedMessages(player, video, opts = {}) {
  const cfg = { ...DEFAULTS, ...opts };
  const onMissed = opts.onMissed || (() => {});
  // onMessage routes through a mutable ref so attachSubtitleTrack can wrap it.
  let onMessageRef = opts.onMessage || (() => {});

  /** Pending cues sorted by `at`; delivered ids kept to survive rebuilds. */
  let queue = [];
  const delivered = new Set();
  let destroyed = false;
  let ws = null, wsTimer = null, wsDelay = cfg.wsRetryMin, pingTimer = null, pendingPingT0 = null;

  /** Live transport telemetry: rtt from ping/pong (performance.now() based),
   *  serverClockOffset from the DO's echoed Date.now() (coarse — Workers
   *  freeze Date.now() during execution; treat as ±70 ms). */
  const stats = { rttMs: null, rttP50: null, serverClockOffsetMs: null, samples: [] };

  /** Wall-clock epoch ms at the current playhead, or null if unknowable. */
  function playheadTime() {
    // hls.js: fragment PROGRAM-DATE-TIME mapped to currentTime.
    const d = player.hls?.playingDate;
    if (d) return d.getTime();
    // Safari native: getStartDate() is the PDT at currentTime === 0.
    const start = video.getStartDate?.();
    if (start && !isNaN(start)) return start.getTime() + video.currentTime * 1000;
    return null;
  }

  function add(cue) {
    if (destroyed || cue == null || cue.at == null) return;
    const id = cue.id ?? `${cue.at}:${JSON.stringify(cue.data).slice(0, 40)}`;
    if (delivered.has(id)) return;
    // Revision: same id replaces the queued cue.
    queue = queue.filter((c) => c.id !== id);
    queue.push({ ...cue, id });
    queue.sort((a, b) => a.at - b.at);
  }

  function remove(id) {
    queue = queue.filter((c) => c.id !== id);
  }

  function tick() {
    if (destroyed || !queue.length) return;
    const now = playheadTime();
    if (now == null) return;
    while (queue.length && queue[0].at <= now) {
      const cue = queue.shift();
      delivered.add(cue.id);
      const lateMs = now - cue.at;
      if (lateMs <= cfg.pastWindow) onMessageRef(cue, { lateMs });
      else onMissed(cue, { lateMs });
    }
  }
  const timer = setInterval(tick, cfg.interval);

  /**
   * Optional transport: a WebSocket delivering JSON frames.
   *   {type:'cue',    cue:{id,at,data}}     schedule (or revise by id)
   *   {type:'cues',   cues:[...]}           batch (e.g. backlog on join)
   *   {type:'cancel', id}                   unschedule
   * Reconnects with backoff forever — same philosophy as the player.
   */
  function connect(url) {
    if (destroyed) return;
    // Guard double-connect: cancel any pending reconnect and close the old
    // socket, whose handlers below no-op once it is no longer `ws`.
    clearTimeout(wsTimer);
    clearInterval(pingTimer);
    try { ws?.close(); } catch {}
    const wsUrl = cfg.token && !/[?&]token=/.test(url)
      ? url + (url.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(cfg.token)
      : url;
    const sock = new WebSocket(wsUrl);
    ws = sock;
    ws.onopen = () => {
      wsDelay = cfg.wsRetryMin;
      clearInterval(pingTimer);
      pingTimer = setInterval(() => {
        // Bare "ping" hits the DO's auto-response: answered by the runtime
        // without waking a hibernated object — free, and measures pure
        // network RTT. t0 kept locally (one ping in flight at a time).
        try { pendingPingT0 = performance.now(); sock.send('ping'); } catch {}
      }, 5000);
    };
    ws.onmessage = (m) => {
      if (m.data === 'pong') {
        if (pendingPingT0 == null) return;
        const rtt = performance.now() - pendingPingT0;
        pendingPingT0 = null;
        stats.rttMs = rtt;
        stats.samples.push(rtt);
        if (stats.samples.length > 100) stats.samples.shift();
        const sorted = [...stats.samples].sort((a, b) => a - b);
        stats.rttP50 = sorted[Math.floor(sorted.length / 2)];
        return;
      }
      let f; try { f = JSON.parse(m.data); } catch { return; }
      if (f.type === 'cue') add(f.cue);
      else if (f.type === 'cues') (f.cues || []).forEach(add);
      else if (f.type === 'cancel') remove(f.id);
    };
    ws.onclose = () => {
      if (destroyed || sock !== ws) return; // a replaced socket never reconnects
      wsTimer = setTimeout(() => connect(url), wsDelay);
      wsDelay = Math.min(cfg.wsRetryMax, wsDelay * 2);
    };
    ws.onerror = () => { try { sock.close(); } catch {} };
  }

  /**
   * Render cues that carry {data: {text}} as native subtitles. Uses the
   * browser's own TextTrack pipeline (styling, positioning, the CC button on
   * iOS), so no overlay DOM is needed. A cue's wall-clock `at`/`until` is
   * mapped onto the media timeline at delivery time.
   *
   *   const track = cues.attachSubtitleTrack('et');
   *   cues.add({ at: t, until: t + 4000, data: { text: 'Tere tulemast' } });
   */
  function attachSubtitleTrack(lang = 'en', label = 'Subtitles') {
    const track = video.addTextTrack('subtitles', label, lang);
    track.mode = 'showing';
    const prevOnMessage = onMessageRef;
    onMessageRef = (cue, meta) => {
      const text = cue?.data?.text;
      if (text != null) {
        const now = playheadTime();
        if (now != null) {
          const start = video.currentTime + (cue.at - now) / 1000;
          const dur = ((cue.until ?? cue.at + 5000) - cue.at) / 1000;
          try { track.addCue(new VTTCue(Math.max(0, start), Math.max(0.5, start + dur), text)); } catch {}
        }
      }
      prevOnMessage(cue, meta);
    };
    return track;
  }

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
  function attachMetadataTrack(onCue) {
    const track = video.addTextTrack('metadata', 'events');
    track.mode = 'hidden';
    const prevOnMessage = onMessageRef;
    onMessageRef = (cue, meta) => {
      const now = playheadTime();
      if (now != null) {
        const start = Math.max(0, video.currentTime + (cue.at - now) / 1000);
        try {
          const vc = new VTTCue(start, start + 0.5, JSON.stringify(cue.data ?? null));
          vc.onenter = () => onCue(cue);
          track.addCue(vc);
        } catch { onCue(cue); }
      } else onCue(cue);
      prevOnMessage(cue, meta);
    };
    return track;
  }

  return {
    add,
    remove,
    connect,
    attachSubtitleTrack,
    attachMetadataTrack,
    /** Epoch ms at the playhead — exposed for "schedule N s from now" UIs. */
    get playheadTime() { return playheadTime(); },
    get pending() { return queue.length; },
    get stats() { return stats; },
    destroy() {
      destroyed = true;
      clearInterval(timer);
      clearTimeout(wsTimer);
      clearInterval(pingTimer);
      try { ws?.close(); } catch {}
    },
  };
}
