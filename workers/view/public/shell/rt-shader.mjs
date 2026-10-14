// demo/shell/rt-shader.mjs: the runtime of a `shader` node on /connect/
// (node-runtime.mjs): /shader/mirror/'s kaleidoscope (mirror-shader.mjs).
// `segments` arrives on shader:value-in and nowhere else; a screen at the far
// end of shader:video-out pulls a frame. Its face is the program in the kit's
// code box, recompiled when an edit settles, as on /shader/mirror/.

import { CODE_ROWS } from './concept-nav.mjs';
import { createCodeBox } from './code-box.mjs';
import { PARAM_HUES } from './code-lang.mjs';
import { createCompileIdle } from './compile-idle.mjs';
import { createMirrorShader, MIRROR_FS, GLSL } from './mirror-shader.mjs';

export function make({ log }) {
  let segments = null, delivered = 0, frames = 0;
  const shader = createMirrorShader({ log });
  const code = createCodeBox({ language: GLSL, value: MIRROR_FS, rows: CODE_ROWS, label: '',
    hues: { hueOf: (n) => (n === 'uSegments' ? PARAM_HUES[0] : null) },
    ariaLabel: 'the fragment shader this node runs, edit it and it recompiles' });
  createCompileIdle({ input: code.input, host: code.el, compile: (text) => {
    const out = shader.build(text);
    log(out.ok ? 'the edit compiled and is running' : `the edit did not compile, the last good shader keeps running: ${out.error}`, out.ok ? '' : 'warn');
    return out;
  } });
  const face = document.createElement('div');
  face.className = 'cn-panel';
  face.append(code.el);
  return {
    face, slot: 'panel', shader,
    deliver: {
      'value-in': (e) => {
        if (e?.of !== 'param' || e.name !== 'segments') { log('the shader takes one parameter, segments, and this was not it'); return; }
        segments = Math.min(32, Math.max(1, Math.round(e.v)));
        delivered++;
      },
    },
    video: {
      frame() {
        if (!shader.gl) return null;
        shader.render(segments);
        if (shader.ok() && segments != null) frames++;
        return shader.canvas;
      },
    },
    // No N until one arrives: the knob that reaches it opens on /mirror/'s 8 and sends it.
    spec: (name) => (name === 'segments' ? { min: 1, max: 32, value: 8 } : null),
    param: (name) => (name === 'segments' ? segments ?? undefined : undefined),
    segments: () => segments,
    delivered: () => delivered,
    heard: () => frames,
    close() { face.remove(); },
  };
}
