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
  /**
   * Which clock decides that a cue is due. See the header.
   * 'pdt' | 'live' | 'lag'. Default 'pdt', which is what this file has always
   * done, so nothing that already uses it changes behaviour.
   */
  clock: 'pdt',
  /**
   * For clock:'lag' only. Reads this viewer's current latency in SECONDS.
   * `createLowLatencyPlayer` reports exactly this on its 'latency' event, so
   * the usual wiring is a closure over the last value seen there.
   * Returning null means "cannot tell", which HOLDS the cue rather than firing
   * it: a cue fired at the wrong moment cannot be taken back, and this project
   * has already paid once for reading "cannot tell" as a number.
   */
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

  /** Live transport telemetry: rtt from ping/pong (performance.now() based),
   *  serverClockOffset from the DO's echoed Date.now() (coarse — Workers
   *  freeze Date.now() during execution; treat as ±70 ms). */
  const stats = { rttMs: null, rttP50: null, serverClockOffsetMs: null, samples: [] };

  /** Wall-clock epoch ms at the current playhead, or null if unknowable. */
  function playheadTime() {
    // ── clock:'live' — WebRTC. There is no playhead clock and there is no
    // need for one: the viewer is live, so "now" is now. Returning the wall
    // clock makes every cue whose `at` has passed due immediately, which is
    // exactly the intended behaviour and keeps ONE code path in tick().
    if (cfg.clock === 'live') return Date.now();

    // ── clock:'lag' — wall clock minus this viewer's own latency.
    if (cfg.clock === 'lag') {
      const secs = typeof cfg.latencySeconds === 'function'
        ? cfg.latencySeconds()
        : cfg.latencySeconds;
      // null/undefined/NaN means CANNOT TELL, which is not the same as zero.
      // Hold rather than guess.
      if (secs == null || !Number.isFinite(secs)) return null;
      return Date.now() - secs * 1000;
    }

    // ── clock:'pdt' — the original, and still the default.
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
