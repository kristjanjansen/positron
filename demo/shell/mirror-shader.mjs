// demo/shell/mirror-shader.mjs: /shader/mirror/'s kaleidoscope with its feedback tap, as an engine:
// a WebGL2 canvas, a program built from text, one frame per `render(segments)`. /shader/remote/
// still has its own copy; why the text is what it is lives on /shader/mirror/.
// why: lessons/kit-mirror-shader.md#header

export const MIRROR_VS = `#version 300 es
void main(){ vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;
export const MIRROR_FS = `#version 300 es
precision highp float;
uniform float uT; uniform vec2 uRes; uniform sampler2D uPrev;
uniform float uSegments;  // value-in
// /mirror/'s defaults, fixed here:
const float uFb = 0.78;    // feedback
const float uScale = 4.0;  // grain, mid
const float uWarp = 0.08;
const float uHue = 1.0;    // hue, full
out vec4 o;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1,0)), f.x),
    mix(h(i + vec2(0,1)), h(i + vec2(1,1)), f.x), f.y); }
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float a = atan(uv.y, uv.x), r = length(uv), seg = 6.2831853 / uSegments;
  a = abs(mod(a + 0.5 * seg, seg) - 0.5 * seg);
  vec2 k = vec2(cos(a), sin(a)) * r;
  float w = n(k * uScale + uT * 0.3) + 0.5 * n(k * uScale * 2.0 - uT * 0.2)
    + 0.25 * n(k * uScale * 4.0 + uT * 0.5);
  vec2 dd = k + uWarp * vec2(cos(w * 6.2831), sin(w * 6.2831));
  vec3 c = 0.5 + 0.5 * cos(6.2831 * (w + vec3(0.0, 0.33, 0.67) * uHue) + uT);
  vec3 fb = texture(uPrev, dd * 0.9 + 0.5).rgb;
  o = vec4(mix(c, fb, uFb), 1.0); }`;

// The uniforms a program here may read, parsed out of MIRROR_FS so the list is typed once; build()
// binds these and the wish contract (glslContract) names them.
export const UNIFORMS = [...MIRROR_FS.matchAll(/\buniform\s+(\w+)\s+(\w+)\s*;/g)].map((m) => ({ type: m[1], name: m[2] }));
/** What each uniform carries, for a reader and for the model. A uniform without one fails the test. */
export const UNIFORM_MEANING = {
  uT: 'time, rising by 1/30 every frame, so about 1 or 2 per second',
  uRes: 'the canvas size in pixels',
  uPrev: 'the previous frame as a texture, for feedback: texture(uPrev, gl_FragCoord.xy / uRes)',
  uSegments: 'a knob from 1 to 32, opening on 8, for any count the picture has (repeats, mirrors, rings)',
};
/** The program a body must be: GLSL ES 3.00 with no `#version` line, each end adds its own. */
export function glslContract() {
  return [
    'Write a GLSL ES 3.00 fragment shader BODY. Do not write a #version line, it is added for you.',
    'Start with: precision highp float;',
    'Declare these uniforms exactly, and use uT so the picture moves:',
    ...UNIFORMS.map((u) => `  uniform ${u.type} ${u.name};  // ${UNIFORM_MEANING[u.name] ?? ''}`),
    'Declare the output exactly as: out vec4 o;',
    'Write void main() and set o to an opaque colour (alpha 1.0). Use gl_FragCoord.xy / uRes for position.',
    'No Shadertoy names (iTime, iResolution, mainImage, fragColor), no textures other than uPrev,',
    'no loops longer than 64 steps, and keep it under 3000 characters.',
  ].join('\n');
}

  // GLSL for the code box, page local (a kit candidate). `params` marks the
  // knob's uniform, so its declaration and every use wear the knob's hue.
export const GLSL = {
    name: 'glsl',
    rules: [
      [/\/\/[^\n]*/, 'comment'],
      [/\/\*[\s\S]*?(?:\*\/|$)/, 'comment'],
      [/#[a-z]+[^\n]*/, 'keyword'],
      [/\b(?:uniform|in|out|precision|highp|mediump|lowp|const|return|if|else|for|void)\b/, 'keyword'],
      [/\b(?:float|int|bool|vec[234]|ivec[234]|mat[234]|sampler2D)\b/, 'class'],
      [/\b(?:atan|abs|mod|cos|sin|length|texture|mix|floor|fract|dot|step|smoothstep|min|max|clamp)\b/, 'builtin'],
      [/\b\d+(?:\.\d*)?|\.\d+/, 'number'],
      [/[A-Za-z_]\w*/, ''],
    ],
    params(src) {
      const m = /uniform\s+float\s+(uSegments)\b/.exec(src);
      if (!m) return [];
      const from = m.index + m[0].length - m[1].length;
      return [{ name: 'uSegments', from, to: from + m[1].length, nameFrom: from, nameTo: from + m[1].length, kind: 'arg' }];
    },
  };

/**
 * @param {object} [o]
 * @param {number} [o.w]   the render size, /mirror/'s own 640 by 360
 * @param {number} [o.h]
 * @param {(line: string, kind?: string) => void} [o.log]
 */
export function createMirrorShader({ w: W = 640, h: H = 360, log = () => {} } = {}) {
  const VS = MIRROR_VS, FS = MIRROR_FS;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false });
  let renderer = '';
  // `prog` and `fsShader` are the program running NOW. An edit that does not
  // compile or link leaves them alone, so the picture keeps the last good one.
  let prog = null, fsShader = null, vsShader = null, A = null, B = null, last = null;
  let U = {};
  /**
   * Build a program from fragment text. A good one is swapped in (new uniform
   * locations, the same feedback targets, the old program deleted); a bad one
   * changes nothing and answers `{ ok: false, error }` with the GL's own log.
   */
  function build(text) {
    if (!gl) return { ok: false, error: 'no WebGL2 here' };
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, text); gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      const error = (gl.getShaderInfoLog(fs) || 'the shader did not compile').trim();
      gl.deleteShader(fs);
      return { ok: false, error };
    }
    const p2 = gl.createProgram();
    gl.attachShader(p2, vsShader); gl.attachShader(p2, fs);
    gl.linkProgram(p2);
    if (!gl.getProgramParameter(p2, gl.LINK_STATUS)) {
      const error = (gl.getProgramInfoLog(p2) || 'the shader did not link').trim();
      gl.deleteProgram(p2); gl.deleteShader(fs);
      return { ok: false, error };
    }
    if (prog) { gl.deleteProgram(prog); gl.deleteShader(fsShader); }
    prog = p2; fsShader = fs;
    gl.useProgram(prog);
    U = {};
    for (const { name } of UNIFORMS) U[name] = gl.getUniformLocation(prog, name);
    if (U.uRes) gl.uniform2f(U.uRes, W, H);
    if (U.uPrev) gl.uniform1i(U.uPrev, 0);
    compiles++;
    return { ok: true, knob: !!U.uSegments };
  }
  let compiles = 0;
  if (gl) {
    vsShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsShader, VS); gl.compileShader(vsShader);
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const r = String(dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    renderer = (r.match(/Renderer:\s*([^,)]+)/)?.[1] ?? r.replace(/^ANGLE \(|\)$/g, '')).trim().slice(0, 24);
    gl.bindVertexArray(gl.createVertexArray());
    // The feedback tap, as /mirror/ does it: two targets, swapped every
    // frame, the previous one bound as `uPrev`. They outlive every program.
    const target = () => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      for (const q of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, q, gl.LINEAR);
      for (const q of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, q, gl.CLAMP_TO_EDGE);
      const f = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      return { t, f };
    };
    A = target(); B = target();
    const first = build(FS);
    if (!first.ok) log(`the shader did not compile: ${first.error}`, 'bad');
  } else log('this browser has no WebGL2, so there is no shader and the screen stays dark', 'bad');

  // The routing follows the links: no link out, the canvas is the page's
  // ground; no value yet, the shader has no N and draws nothing.
  let i = 0;
  // `t` sets uT for one frame (the wish trial at times of its choosing); without it uT is the frame clock.
  function render(segments, { out = true, t } = {}) {
    if (!gl) return;
    const ready = prog && out && segments != null;
    if (!ready) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, W, H);
      gl.clearColor(11 / 255, 14 / 255, 20 / 255, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      return;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, B.f);
    gl.viewport(0, 0, W, H);
    if (U.uT) gl.uniform1f(U.uT, t ?? i / 30);
    i++;
    if (U.uSegments) gl.uniform1f(U.uSegments, segments);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, A.t);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, B.f);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    gl.blitFramebuffer(0, 0, W, H, 0, 0, W, H, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    last = B;
    [A, B] = [B, A];
  }
  return {
    canvas, gl, build, render,
    renderer: () => renderer,
    ok: () => !!prog,
    compiles: () => compiles,
    hasKnob: () => !!U.uSegments,
    source: () => (fsShader ? gl.getShaderSource(fsShader) : null),
    uniform: () => (prog && U.uSegments ? gl.getUniform(prog, U.uSegments) : null),
    /** The last frame drawn, read off its target, so reading moves nothing. */
    pixels() {
      if (!last) return null;
      const px = new Uint8Array(W * H * 4);
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, last.f);
      gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
      return px;
    },
  };
}
