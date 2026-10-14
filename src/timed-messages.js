// Cues {id, at, data} beside a live stream, fired when this viewer's playhead reaches `at`; Stream
// strips in-band metadata. `clock`: 'pdt' (default), 'live' (on arrival, WebRTC has no PDT) or
// 'lag' (wall clock minus this viewer's latency).
// why: lessons/src.md#header

const DEFAULTS = {
  // Poll cadence in ms; 100 ms is about 3 frames.
  // why: lessons/src.md#interval
  interval: 100,
  // Fire cues up to this many ms behind the playhead; older ones go to onMissed.
  // why: lessons/src.md#past-window
  pastWindow: 15000,
  /** WebSocket reconnect backoff bounds (ms). */
  wsRetryMin: 1000,
  wsRetryMax: 15000,
  /** Auth token appended to the WS URL (?token=…) when the URL lacks one. */
  token: null,
  // Which clock decides a cue is due: 'pdt' | 'live' | 'lag'.
  // why: lessons/src.md#clock
  clock: 'pdt',
  // clock 'lag' only: this viewer's latency in seconds; null holds the cue rather than firing it.
  // why: lessons/src.md#latency-seconds
  latencySeconds: null,
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

  // Transport telemetry: rtt from ping/pong; serverClockOffset is coarse (DO clocks freeze, about
  // 70 ms).
  // why: lessons/src.md#stats
  const stats = { rttMs: null, rttP50: null, serverClockOffsetMs: null, samples: [] };

  /** Wall-clock epoch ms at the current playhead, or null if unknowable. */
  function playheadTime() {
    // clock 'live': the viewer is live, so now is now and every passed cue is due.
    // why: lessons/src.md#live
    if (cfg.clock === 'live') return Date.now();

    // clock 'lag': wall clock minus this viewer's own latency.
    // why: lessons/src.md#lag
    if (cfg.clock === 'lag') {
      const secs = typeof cfg.latencySeconds === 'function'
        ? cfg.latencySeconds()
        : cfg.latencySeconds;
      // null/undefined/NaN means CANNOT TELL, which is not the same as zero.
      // Hold rather than guess.
      if (secs == null || !Number.isFinite(secs)) return null;
      return Date.now() - secs * 1000;
    }

    // clock 'pdt': hls.js maps fragment PROGRAM-DATE-TIME to currentTime.
    // why: lessons/src.md#pdt
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

  // Optional WebSocket transport of JSON frames: cue, cues (backlog), cancel. Reconnects forever.
  // why: lessons/src.md#connect
  function connect(url) {
    if (destroyed) return;
    // Guard double-connect: cancel a pending reconnect and close the old socket.
    // why: lessons/src.md#double
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
        // A bare "ping" is answered by the runtime without waking the object: pure network RTT.
        // why: lessons/src.md#ping
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

  // Cues with {data: {text}} as native subtitles through a TextTrack; `at`/`until` map onto media
  // time at delivery. Example: cues.attachSubtitleTrack('et').
  // why: lessons/src.md#subtitles
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

  // Invisible cues on the media clock (kind 'metadata', mode 'hidden'), fired by the browser's
  // own scheduler, frame-accurate between polls.
  // why: lessons/src.md#metadata
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
    /** Epoch ms at the playhead, exposed for "schedule N s from now" UIs. */
    get playheadTime() { return playheadTime(); },
    /** Which clock is deciding, so a page can SAY so in its readout. */
    get clock() { return cfg.clock; },
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
