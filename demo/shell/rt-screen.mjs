// demo/shell/rt-screen.mjs: a `screen` node on /connect/, drawing what arrives on screen:video-in
// contained in the kit's video panel. With nothing arriving it shows the ground and counts nothing.
// why: lessons/kit-rt-screen.md#header

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
