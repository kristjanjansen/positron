// demo/shell/rt-camera.mjs: the runtime of a `camera` node on /connect/ (camera.mjs).
// Face: Start and the camera picker; the picture leaves on camera:video-out a frame at a time.
// The camera opens only on a person's press of Start, never on a link.
// why: lessons/kit-rt-camera.md#header

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
