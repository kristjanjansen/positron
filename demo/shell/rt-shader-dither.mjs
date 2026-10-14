// demo/shell/rt-shader-dither.mjs: a `shader-dither` node on /connect/ (dither-shader.mjs).
// A screen on video-out pulls a frame; it pulls one from video-in, dithers it at the
// `size` on value-in, and hands its canvas on.
// why: lessons/kit-rt-shader-dither.md#header

import { createDitherShader } from './dither-shader.mjs';

export function make({ upstream, log }) {
  let size = 4, frames = 0;
  const dither = createDitherShader({ log });
  return {
    shader: dither,
    deliver: {
      'value-in': (e) => {
        if (e?.of === 'param' && e.name === 'size') size = Math.max(1, Math.round(e.v));
        else log(`the dither shader has no ${e?.name}, so it ignores it`);
      },
    },
    video: {
      frame() {
        if (!dither.gl) return null;
        const src = upstream('video-in')?.video?.frame?.() ?? null;
        if (dither.draw(src, size)) frames++;
        return dither.canvas;
      },
    },
    spec: (name) => (name === 'size' ? { min: 2, max: 16, value: size } : null),
    param: (name) => (name === 'size' ? size : undefined),
    heard: () => frames,
    close() {},
  };
}
