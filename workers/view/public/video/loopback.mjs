// What /video/webrtc/ and /video/llhls/ share: the clock-burned camera (`createLoopCamera`),
// a fading picture panel (`createPicture`), the delay off the burned clock (`meter`) and the
// warmup cell (`warm`). A page owns its leg, cap, bay and footers. Nothing opens on a visit.
// See lessons/page-video.md#video-11
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
 * Glass to glass off the burned clock per presented frame: one page stamps and reads, so the
 * difference is exact. A frame whose row fails its checksum is skipped, never guessed.
 * See lessons/page-video.md#video-12
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
 * Warmup per leg, press to the first readable frame back: the cell counts whole seconds with
 * `warming up`, then holds the time to a tenth. `leg` is `{ askedAt, firstMs, live }`.
 * See lessons/page-video.md#video-13
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
 * A canvas the size of the frame that leaves; returns drawn by the test picture's
 * `drawCamera`, contained, so the only difference is the trip. `alpha` below 1 fades it out.
 * See lessons/page-video.md#video-14
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
 * The camera and its controls. `start` and `stop` are the page's, which calls `open()` first
 * and `close()` last; `render` runs every frame while on. `extra` videos are `armVideo`d on
 * the press before any await, or iOS refuses them later.
 * See lessons/page-video.md#video-15
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
