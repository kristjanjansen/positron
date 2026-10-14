// demo/shell/rt-screen.mjs: the runtime of a `screen` node on /connect/
// (node-runtime.mjs). Its face is the kit's video panel; each frame it pulls a
// picture from the runtime linked into screen:video-in (a camera, a shader)
// and draws it contained, as /video/camera/ does. Unlinked, or with nothing
// arriving, it shows the page's ground and counts nothing.

import { createVideoPanel } from './video-panel.mjs';
import { drawCamera, FRAME_W, FRAME_H } from './pattern.mjs';

const GROUND = '#0b0e14';

export function make({ upstream }) {
  const canvas = document.createElement('canvas');
  canvas.width = FRAME_W; canvas.height = FRAME_H;
  const ctx = canvas.getContext('2d', { alpha: false });
  const panel = createVideoPanel({ media: canvas });
  let frames = 0, raf = 0, closed = false;
  ctx.fillStyle = GROUND; ctx.fillRect(0, 0, FRAME_W, FRAME_H);
  function frame() {
    if (closed) return;
    const src = upstream('video-in')?.video?.frame?.() ?? null;
    if (src && drawCamera(ctx, src, FRAME_W, FRAME_H, { scrim: 0 })) frames++;
    else { ctx.fillStyle = GROUND; ctx.fillRect(0, 0, FRAME_W, FRAME_H); }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  return {
    face: panel.el, slot: 'picture', canvas,
    heard: () => frames,
    close() { closed = true; cancelAnimationFrame(raf); panel.el.remove(); },
  };
}
