// demo/shell/rt-oled.mjs: the runtime of an oled node on /connect/: a 128x64 panel drawn from oled:video-in.
// Unlinked, the panel keeps its last picture and counts nothing.
// why: lessons/kit-rt-oled.md#header

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
