// demo/shell/rt-camera.mjs: the runtime of a `camera` node on /connect/
// (node-runtime.mjs): this tab's camera (camera.mjs). Its face is Start and
// the camera picker; the picture is a screen's, so it leaves on
// camera:video-out to whatever that link reaches, pulled a frame at a time.
// 🔴 THE CAMERA OPENS ONLY ON A PERSON'S PRESS OF START, never on a link.

import { createCamera } from './camera.mjs';

export function make({ log }) {
  const say = document.createElement('p');
  say.className = 'cn-face-say';
  say.textContent = 'off: Start asks for the camera';
  const camera = createCamera({ log,
    onOn: ({ label, set }) => { say.textContent = `${label || 'camera'}, ${set.width}x${set.height}`; },
    onOff: () => { say.textContent = 'off'; },
  });
  const row = document.createElement('div');
  row.className = 'cn-pi-row';
  row.append(camera.transport.el, camera.picker.el);
  const face = document.createElement('div');
  face.className = 'cn-panel';
  face.append(row, say);
  return {
    face, slot: 'panel', camera,
    // What a screen or a shader at the far end reads: the element while the camera is on, else nothing.
    video: { frame: () => (camera.on() ? camera.video : null) },
    heard: () => camera.frames(),
    close() { if (camera.on()) camera.stop(); face.remove(); },
  };
}
