// demo/video/loopback.mjs: what the two loopback pages share, the
// WebRTC one (/video/webrtc/) and the LL-HLS one (/video/llhls/).
// Split 2026-10-12, *"Split hls and webrtc loopbacks"*: each page holds one
// round trip and its own patchbay, and this module holds what is the same on
// both, so it is written once:
//
//   - the camera, with the clock row burned over it, as the frame that leaves
//     the page (`createLoopCamera`), its start button, its camera picker, and
//     the original's picture panel with the camera's name and size;
//   - a picture panel drawn from a video element, faded over the ground as a
//     press runs out (`createPicture`);
//   - the delay read off the burned clock of each presented frame (`meter`),
//     and the warmup count in a footer (`warm`).
//
// A page owns its leg, its cap, its bay and its footers' other cells.
//
// NOTHING OPENS ON A VISIT. The camera, and whatever a page then does with it,
// are made on the start press; building any of this opens nothing.
import { el, armVideo } from '/shell/shell.mjs';
import { createVideoPanel } from '/shell/video-panel.mjs';
import { createButtonGroup } from '/shell/button-group.mjs';
import { createPicker } from '/shell/picker.mjs';
import { drawCamera, burn, readBurnedFrom, FRAME_W, FRAME_H } from '/shell/pattern.mjs';

// How many presented frames a delay is the median of: three seconds at 30 fps.
export const WINDOW = 90;
export const GROUND = '#0b0e14';

export const median = (a) => {
  if (!a.length) return null;
  const s = a.slice().sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};
export const delayText = (x) => (x == null ? '' : x < 1000 ? `${Math.round(x)} ms` : `${(x / 1000).toFixed(1)} s`);

/**
 * Glass to glass off the burned clock, per PRESENTED frame, as /cam/ does:
 * this one page stamps the row and reads it, so one clock is on both ends
 * and the difference is exact. A frame whose row does not read (its checksum
 * fails, which a scaled or mid-ramp frame can) is skipped, never guessed.
 */
export function meter(v) {
  const m = { samples: [], frames: 0, read: 0, live: true, firstAt: null };
  const scratch = document.createElement('canvas');
  if (typeof v.requestVideoFrameCallback !== 'function') return m;
  const tick = () => {
    if (!m.live) return;
    m.frames++;
    const at = readBurnedFrom(v, scratch);
    if (at != null) {
      if (m.firstAt == null) m.firstAt = performance.now();
      m.samples.push(performance.timeOrigin + performance.now() - at);
      if (m.samples.length > WINDOW) m.samples.shift();
      m.read++;
    }
    v.requestVideoFrameCallback(tick);
  };
  v.requestVideoFrameCallback(tick);
  return m;
}

/**
 * Warmup, per leg: from the press to the first frame back whose burned clock
 * reads. While it runs the cell counts whole seconds and the word at the left
 * says `warming up`; then the cell holds the measured time, to a tenth, and
 * the word clears, because the numbers beside it already say so (2026-10-12,
 * *"cound time for warmup. move readout data to videpanel footers"*).
 * `leg` is `{ askedAt, firstMs, live }`.
 */
export function warm(cells, word, leg, m, label, log) {
  if (leg.askedAt == null) return;
  if (leg.firstMs == null && m?.firstAt != null) {
    leg.firstMs = m.firstAt - leg.askedAt;
    log(`${label}: first frame back ${(leg.firstMs / 1000).toFixed(1)} s after the press`, 'hi');
  }
  if (leg.firstMs != null) {
    cells.set('warmup', `${(leg.firstMs / 1000).toFixed(1)} s`);
    if (word.textContent === 'warming up' || word.textContent.startsWith('no media yet')) word.textContent = '';
  } else if (leg.live !== false) {
    cells.set('warmup', `${Math.floor((performance.now() - leg.askedAt) / 1000)} s`);
  }
}

/** A muted, inline video element for a picture that comes back. */
export function returnVideo() {
  const v = el('video');
  v.muted = true; v.playsInline = true; v.autoplay = true;
  return v;
}

/**
 * A canvas the size of the frame that leaves. The returns are drawn by the
 * test picture's own `drawCamera`, contained, no scrim, so the only difference
 * between the original and a return is the trip. `alpha` below 1 lays the
 * picture over the ground at that strength, which is how a picture fades out
 * over the last seconds of a press.
 */
export function createPicture() {
  const c = el('canvas');
  c.width = FRAME_W; c.height = FRAME_H;
  const ctx = c.getContext('2d', { alpha: false });
  function paint(v, on, alpha = 1) {
    ctx.globalAlpha = 1;
    if (on && alpha < 1) { ctx.fillStyle = GROUND; ctx.fillRect(0, 0, FRAME_W, FRAME_H); }
    const ready = v instanceof HTMLCanvasElement || (v.readyState >= 2 && v.videoWidth > 0);
    if (on && alpha > 0 && ready) {
      ctx.globalAlpha = alpha;
      if (v instanceof HTMLCanvasElement) ctx.drawImage(v, 0, 0, FRAME_W, FRAME_H);
      else drawCamera(ctx, v, FRAME_W, FRAME_H, { scrim: 0 });
      ctx.globalAlpha = 1;
    } else if (!on || alpha <= 0) { ctx.fillStyle = GROUND; ctx.fillRect(0, 0, FRAME_W, FRAME_H); }
  }
  return { c, ctx, paint };
}

/** 1 until `endAt`'s last `fadeMs`, then down to 0 at `endAt`; 1 with no end set. */
export const fadeAt = (endAt, fadeMs) => (endAt ? Math.max(0, Math.min(1, (endAt - performance.now()) / fadeMs)) : 1);

/**
 * The camera, the frame that leaves, and the controls that start it.
 *
 * `start` and `stop` are the PAGE's: the button and the camera picker call
 * them, so a press always goes through the page's own leg as well. The page's
 * `start` calls `open()` first and `stop` calls `close()` last. `render` is
 * called every animation frame while the camera is on, to paint the pictures.
 * `extra` is the one video element per return the page wants `armVideo`d on
 * the press, before any await, or iOS refuses it later.
 */
export function createLoopCamera({ log, start, stop, render, extra = [] }) {
  const video = returnVideo();
  // What leaves the page: the camera, uncropped and undimmed, with the clock
  // row and its two clocks burned over it. The leg sends THIS, so each
  // returned frame says when it left, read back on the same clock.
  const src = el('canvas');
  src.width = FRAME_W; src.height = FRAME_H;
  const sctx = src.getContext('2d', { alpha: false });
  let cam = null, send = null, drawT = 0, frameN = 0, raf = 0;
  let devices = [], deviceId = null;

  // When the last frame was presented, per video element: what lights a video wire.
  const last = new Map();
  function watchFrames(v) {
    last.set(v, 0);
    if (typeof v.requestVideoFrameCallback !== 'function') return;
    const tick = () => { if (!cam) return; last.set(v, performance.now()); v.requestVideoFrameCallback(tick); };
    v.requestVideoFrameCallback(tick);
  }
  const fresh = (v) => !!cam && performance.now() - (last.get(v) || 0) < 500;

  // The original's footer as on /video/camera/: one line, empty until
  // on, the camera's name at the left and its size at the right beside the
  // full-screen button.
  const picture = createPicture();
  const name = el('span', 'cc-say', '');
  const size = el('span', 'cc-say', '');
  const panel = createVideoPanel({ media: picture.c, left: name });
  panel.el.querySelector('.pos-vp-r').prepend(size);

  function frame() { render(); if (cam) raf = requestAnimationFrame(frame); }

  /** The camera on and the burned frame running. Returns its label, or null when refused. */
  async function open(isCurrent) {
    armVideo(video); for (const v of extra) armVideo(v);
    let s;
    try {
      s = await navigator.mediaDevices.getUserMedia({
        video: { ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
          width: { ideal: FRAME_W }, height: { ideal: FRAME_H }, frameRate: { ideal: 30 } },
        audio: false,
      });
    } catch (e) {
      const why = e?.name === 'NotAllowedError' ? 'the camera was refused'
        : e?.name === 'NotFoundError' ? 'this machine has no camera'
        : `the camera did not start (${e?.name || e})`;
      log(`${why}, so nothing was sent anywhere`, 'bad');
      face(false);
      return null;
    }
    if (!isCurrent()) { s.getTracks().forEach((t) => t.stop()); return null; }
    cam = s;
    const track = cam.getVideoTracks()[0];
    const set = track.getSettings();
    deviceId = set.deviceId || deviceId;
    video.srcObject = cam;
    video.play().catch(() => {});
    // A camera's label ends in its USB ids, `(2C0E:82E3)`, which name nothing a reader needs.
    const label = (track.label || '').replace(/\s*\([0-9a-f]{4}:[0-9a-f]{4}\)\s*$/i, '');
    name.textContent = label;
    size.textContent = set.width && set.height ? `${set.width}x${set.height}` : '';
    log(`camera on: ${track.label || 'default'} at ${set.width}x${set.height}`, 'hi');
    // The frame that leaves: camera, then the clock, 30 times a second.
    drawT = setInterval(() => {
      drawCamera(sctx, video, FRAME_W, FRAME_H, { scrim: 0 });
      burn(sctx, FRAME_W, FRAME_H, frameN++, { field: false, scrim: true });
    }, 1000 / 30);
    send = src.captureStream(30);
    watchFrames(video);
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
    face(true);
    return label || 'camera';
  }

  /** Every track stopped and the original back to the ground. */
  function close() {
    clearInterval(drawT);
    video.srcObject?.getTracks?.().forEach((t) => t.stop());
    try { video.pause(); } catch { /* fine */ }
    video.srcObject = null;
    send?.getTracks().forEach((t) => t.stop());
    send = null;
    cam?.getTracks().forEach((t) => t.stop());
    cam = null;
    cancelAnimationFrame(raf);
    name.textContent = ''; size.textContent = '';
    render();
    face(false);
  }
  addEventListener('pagehide', () => { if (cam) stop(); });

  // ── which camera, once there is more than one ───────────────────────────
  // Device labels are empty until the camera has been allowed, so the list is
  // read after the first start and never on a visit.
  const at = () => Math.max(0, devices.findIndex((x) => x.deviceId === deviceId));
  const picker = createPicker({ what: 'camera',
    prev: () => pick((at() - 1 + devices.length) % devices.length),
    next: () => pick((at() + 1) % devices.length),
    onPick: (i) => pick(i) });
  picker.el.hidden = true;
  async function listCameras() {
    try {
      devices = (await navigator.mediaDevices.enumerateDevices()).filter((x) => x.kind === 'videoinput');
    } catch { devices = []; }
    picker.options(devices.map((x, i) => x.label || `camera ${i + 1}`));
    picker.show(at());
    picker.el.hidden = devices.length < 2;
  }
  async function pick(i) {
    const dev = devices[i];
    if (!dev || dev.deviceId === deviceId) return;
    deviceId = dev.deviceId;
    picker.show(i);
    if (cam) { stop(); await start(); }
  }

  const transport = createButtonGroup({ buttons: [
    { id: 'cam', icon: 'video', label: 'start the camera', onPress: () => (cam ? stop() : start()) },
  ] });
  // The group itself disables the button while a press's promise runs, so a
  // second press cannot start a second camera while the prompt is up.
  function face(on) {
    transport.setIcon('cam', on ? 'stop' : 'video', on ? 'stop the camera' : 'start the camera');
  }
  const top = el('div', 'cc-top');
  top.append(transport.el, picker.el);

  return {
    top, panel, picture, src, watchFrames, fresh, open, close, listCameras,
    get on() { return !!cam; },
    get send() { return send; },
  };
}
