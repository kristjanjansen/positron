// demo/shell/rt-shader.mjs: runtime of a `shader` node on /connect/, /shader/mirror/'s kaleidoscope.
// `segments` arrives on shader:value-in only, a whole program on shader:program-in; a screen on
// shader:video-out pulls frames. Its face is the program in the kit's code box, recompiled when an
// edit settles.
// why: lessons/kit-rt-shader.md#header

import { CODE_ROWS } from './concept-nav.mjs';
import { createCodeBox } from './code-box.mjs';
import { PARAM_HUES } from './code-lang.mjs';
import { createCompileIdle } from './compile-idle.mjs';
import { createMirrorShader, MIRROR_FS, GLSL } from './mirror-shader.mjs';
import { VERSION, bodyError } from './glsl-wish.mjs';

export function make({ log }) {
  let segments = null, delivered = 0, frames = 0, programs = 0, refused = 0, lastProgram = null;
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
      // A whole program on program-in, as a body with no #version (each end adds its own, as on the
      // Pi). A refusal keeps the running program and the code box as they were.
      'program-in': (e) => {
        const say = (r) => { lastProgram = { ...r, at: e?.at ?? null }; if (r.ok) programs++; else refused++; return lastProgram; };
        if (e?.of !== 'program' || typeof e.source !== 'string') { log('the shader takes a program on program-in, and this was not one', 'warn'); return say({ ok: false, error: 'not a program' }); }
        if (/^\s*#version/m.test(e.source)) return say({ ok: false, error: 'send the body without a #version line, each end adds its own' });
        const out = shader.build(VERSION + e.source);
        if (!out.ok) return say({ ok: false, error: bodyError(out.error) });
        code.set(VERSION + e.source);
        return say({ ok: true, error: '', knob: out.knob });
      },
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
    /** Programs taken and refused on program-in, and how the last one ended ({ ok, error }). */
    programs: () => ({ ran: programs, refused, last: lastProgram }),
    code,
    heard: () => frames,
    close() { face.remove(); },
  };
}
