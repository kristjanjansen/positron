// demo/shell/dither-shader.mjs: /video/shader/'s ordered dither as an engine,
// a picture in and a picture out. Lifted 2026-10-14 from that page for
// /connect/ (plans/plan-connect-ui.md slice 4, the convergence rule).
//
// `draw(src, size, { out })` renders one frame of `src` (a playing <video> or
// a canvas) into `canvas` and answers whether there was a picture to dither;
// `out: false` clears to the page's ground, as a picture with no link out.
// The WebGL2 context is made here; with none, the log says so and `draw`
// does nothing.

import { FRAME_W, FRAME_H } from './pattern.mjs';

export function createDitherShader({ w = FRAME_W, h = FRAME_H, log = () => {} } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false });
  let prog = null, tex = null, U = {};
  if (gl) {
    const vs = `#version 300 es
      in vec2 p;
      void main() { gl_Position = vec4(p, 0.0, 1.0); }`;
    // Brightness per cell of uSize pixels, a little contrast, then one Bayer
    // threshold: below it the page's ground, above it warm off-white, which
    // leans toward --hi only in the brightest cells. Outside the contained
    // frame there is no input.
    const fs = `#version 300 es
      precision highp float;
      uniform sampler2D uTex; uniform vec2 uRes; uniform vec2 uFit;
      uniform float uHas; uniform float uSize;
      out vec4 o;
      const vec3 GROUND = vec3(0.043, 0.055, 0.078);
      const vec3 INK = vec3(0.92, 0.89, 0.82);
      const vec3 HI = vec3(1.0, 0.831, 0.0);
      const float M[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
      float bayer(vec2 c) { ivec2 i = ivec2(mod(c, 4.0)); return (M[i.x + i.y * 4] + 0.5) / 16.0; }
      vec3 src(vec2 frag) {
        vec2 uv = (frag / uRes - 0.5) / uFit + 0.5;
        if (uHas < 0.5 || any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return vec3(0.0);
        return texture(uTex, uv).rgb;
      }
      void main() {
        vec2 cell = floor(gl_FragCoord.xy / uSize);
        float l = dot(src((cell + 0.5) * uSize), vec3(0.2126, 0.7152, 0.0722));
        l = smoothstep(0.04, 0.96, l);
        vec3 ink = mix(INK, HI, smoothstep(0.86, 1.0, l) * 0.55);
        vec3 dith = mix(GROUND, ink, step(bayer(cell), l));
        o = vec4(dith, 1.0);
      }`;
    const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); return x; };
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      log(`the shader did not compile: ${gl.getProgramInfoLog(prog)}`, 'bad');
      prog = null;
    } else log('the shader compiled');
    if (prog) {
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'p');
      gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      for (const u of ['uTex', 'uRes', 'uFit', 'uHas', 'uSize']) U[u] = gl.getUniformLocation(prog, u);
      tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.uniform1i(U.uTex, 0);
      gl.uniform2f(U.uRes, w, h);
    }
  } else log('this browser has no WebGL2, so there is no shader and the picture stays dark', 'bad');

  /** One frame. `src` is a <video> with a picture, a canvas, or null for no input. */
  function draw(src, size, { out = true } = {}) {
    if (!gl) return false;
    gl.viewport(0, 0, w, h);
    if (!prog || !out) { gl.clearColor(11 / 255, 14 / 255, 20 / 255, 1); gl.clear(gl.COLOR_BUFFER_BIT); return false; }
    const sw = src ? (src.videoWidth ?? src.width) : 0, sh = src ? (src.videoHeight ?? src.height) : 0;
    const has = !!src && (src.readyState === undefined || src.readyState >= 2) && sw > 0 && sh > 0;
    if (has) {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, src);
      // Contained rather than covered, as drawCamera does: a phone camera can
      // come back portrait.
      const va = sw / sh, ca = w / h;
      gl.uniform2f(U.uFit, va > ca ? 1 : va / ca, va > ca ? ca / va : 1);
    }
    gl.uniform1f(U.uHas, has ? 1 : 0);
    gl.uniform1f(U.uSize, size);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return has;
  }

  return { canvas, gl, ok: () => !!prog, draw };
}
