// demo/shell/rt-oled.mjs: the runtime of an `oled` node on /connect/
// (node-runtime.mjs): a 128x64 panel (oled-view.mjs), drawn with what arrives
// on oled:video-in. A frame comes only along a link, from the runtime at its
// other end (a Pico); unlinked, the panel keeps its last picture and counts nothing.

import { drawOled, oledCanvas } from './oled-view.mjs';

export function make() {
  let frames = 0, lit = 0;
  const face = document.createElement('div');
  face.className = 'cn-oled';
  const cv = oledCanvas(face);
  return {
    face, slot: 'picture', canvas: cv,
    frame(px) {
      frames++;
      lit = 0;
      for (let i = 0; i < px.length; i++) lit += px[i];
      drawOled(cv, px);
    },
    heard: () => frames,
    lit: () => lit,
    close() { face.remove(); },
  };
}
