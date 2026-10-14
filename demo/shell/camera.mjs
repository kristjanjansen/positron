// demo/shell/camera.mjs: this tab's camera, started and stopped by a person. Nothing opens until
// `start()`; the device list is read after it, since labels are empty before permission.
// A page keeps its own labels, frame loop and patchbay in `onOn` and `onOff`.
// why: lessons/kit-camera.md#header

import { armVideo } from './shell.mjs';
import { createButtonGroup } from './button-group.mjs';
import { createPicker } from './picker.mjs';
import { FRAME_W, FRAME_H } from './pattern.mjs';

/**
 * @param {object} [o]
 * @param {(line: string, kind?: string) => void} [o.log]
 * @param {(on: { label: string, set: object, track: MediaStreamTrack }) => void} [o.onOn]  the camera is on
 * @param {() => void} [o.onOff]  every track stopped
 */
export function createCamera({ log = () => {}, onOn = () => {}, onOff = () => {} } = {}) {
  const video = document.createElement('video');
  video.muted = true; video.playsInline = true; video.autoplay = true;
  let cam = null, gen = 0, lastFrame = 0, frames = 0;
  let devices = [], deviceId = null;

  // Frames counted as the element presents them, so "it is flowing" is a fact about the picture.
  function watchFrames() {
    if (typeof video.requestVideoFrameCallback !== 'function') return;
    const tick = () => { if (!cam) return; lastFrame = performance.now(); frames++; video.requestVideoFrameCallback(tick); };
    video.requestVideoFrameCallback(tick);
  }
  const flowing = () => !!cam && performance.now() - lastFrame < 500;

  async function start() {
    const mine = ++gen;
    armVideo(video);   // before any await, or iOS refuses later
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
      log(why, 'bad');
      face(false);
      return;
    }
    if (gen !== mine) { s.getTracks().forEach((t) => t.stop()); return; }
    cam = s;
    const track = cam.getVideoTracks()[0];
    const set = track.getSettings();
    deviceId = set.deviceId || deviceId;
    video.srcObject = cam;
    video.play().catch(() => {});
    // A camera's label ends in its USB ids, `(2C0E:82E3)`, which name nothing a reader needs.
    const label = (track.label || '').replace(/\s*\([0-9a-f]{4}:[0-9a-f]{4}\)\s*$/i, '');
    onOn({ label, set, track });
    log(`camera on: ${track.label || 'default'} at ${set.width}x${set.height}`, 'hi');
    watchFrames();
    face(true);
    await listCameras();
  }

  function stop() {
    gen++;
    cam?.getTracks().forEach((t) => t.stop());
    cam = null;
    try { video.pause(); } catch { /* fine */ }
    video.srcObject = null;
    onOff();
    face(false);
    log('camera off, every track stopped');
  }

  // ── which camera, once there is more than one ───────────────────────────
  const picker = createPicker({ what: 'camera',
    prev: () => pick((at() - 1 + devices.length) % devices.length),
    next: () => pick((at() + 1) % devices.length),
    onPick: (i) => pick(i) });
  picker.el.hidden = true;
  const at = () => Math.max(0, devices.findIndex((x) => x.deviceId === deviceId));
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

  return {
    video, transport, picker, start, stop, flowing,
    on: () => !!cam,
    stream: () => cam,
    frames: () => frames,
  };
}
