// demo/shell/xr-controller.mjs — your actual controllers, drawn from their own
// models, for a page that does NOT stand in `xr-room.mjs`'s room.
//
//   const cons = createXRControllers(gl, { log, say });
//   cons.want(profile, handedness);          // once, when a source appears
//   cons.draw({ vp, grip, profile, handedness });   // per hand, per eye
//
// 🔴 WHY THIS IS NOT JUST A CALL INTO `xr-room.mjs`. That module already loads
// and draws these models, and it is where they were written — but it draws them
// as one step inside a whole renderer: it owns the sky, the walls, the dotted
// grid, the tablet and its own box program, and a page gets all of that or none
// of it. `floor` is a page with its own instanced tile shader and its own frame
// loop; standing it in a room to borrow a controller would mean adopting a
// second renderer to draw two hands.
//
// So the MODEL LOADING is the shared thing and it is shared properly: the
// vendored `.glb` files, `readGLB`, and the profile naming all come from where
// they already are. What is new here is ~90 lines of program and draw call.
//
// ⚠️ IT DRAWS ONLY WHAT THE RUNTIME ANSWERED FOR. There is no stand-in here and
// that is deliberate rather than missing: `xr-room.mjs`'s lathe exists because
// that page puts a tablet on the controller and needs something to hang it off.
// A page that just wants to see its hands should show the real thing or show
// nothing, because a shape that is nearly a controller is worse than no shape —
// it is a confident picture of the wrong object.

import { readGLB } from './xr-glb.mjs';
import { MODEL_BASE, MODEL_PROFILES } from './xr-room.mjs';

/** Greyed, and OPAQUE.
 *  ⚠️ MONOCHROME BECAUSE THE PAGE IS. `floor` is 1965 newsreel and everything
 *  on it goes through one luma; a controller arriving in its vendor's plastic
 *  grey-blue would be the only coloured object in the archive. The model's
 *  texture is kept — it is where the buttons and the seams are — and collapsed
 *  to luminance rather than thrown away.
 *  🔴 AND IT WAS SEE-THROUGH FOR ONE VERSION, WHICH WAS WRONG. The idea was
 *  that your hands should not hide the archive. What it actually does is stop
 *  them being objects: a translucent controller shows its own far side through
 *  its near side, so the shape reads as a smear rather than as a thing you are
 *  holding — and it cannot write depth without punching a hand-shaped hole in
 *  what is behind it, so it has no honest way to sit in front of the floor. A
 *  real object in your hand is the one thing in a headset that does not need
 *  softening. */
export const CTRL_TINT = 0.82;

const VS = `#version 300 es
in vec3 aPos; in vec3 aNrm; in vec2 aUv;
uniform mat4 uVP, uModel;
out vec3 vN; out vec2 vT;
void main(){
  vN = mat3(uModel) * aNrm; vT = aUv;
  gl_Position = uVP * uModel * vec4(aPos, 1.0);
}`;

const FS = `#version 300 es
precision highp float;
in vec3 vN; in vec2 vT;
uniform sampler2D uTex; uniform float uHas; uniform float uTint;
out vec4 o;
void main(){
  vec3 n = normalize(vN);
  float l = 0.35 + 0.65 * max(0.0, dot(n, normalize(vec3(0.4, 0.9, 0.25))));
  float g = 1.0;
  // Rec. 601 luma, the same coefficients the rest of the page uses — a
  // controller and a newsreel going grey by two different formulas would be two
  // greys, and the eye is very good at seeing that on adjacent surfaces.
  if (uHas > 0.5) g = dot(texture(uTex, vT).rgb, vec3(0.299, 0.587, 0.114));
  o = vec4(vec3(g * uTint * l), 1.0);
}`;

export function createXRControllers(gl, { log = () => {}, say = () => {} } = {}) {
  const compile = (t, src) => {
    const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  let prog = null, L = null;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
    // ⚠️ BEFORE linkProgram. Afterwards it is a no-op that reads like a fix.
    ['aPos', 'aNrm', 'aUv'].forEach((n, i) => gl.bindAttribLocation(prog, i, n));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    L = {
      vp: gl.getUniformLocation(prog, 'uVP'),
      model: gl.getUniformLocation(prog, 'uModel'),
      tex: gl.getUniformLocation(prog, 'uTex'),
      has: gl.getUniformLocation(prog, 'uHas'),
      tint: gl.getUniformLocation(prog, 'uTint'),
    };
  } catch (e) {
    prog = null;
    log(`the controller models would not compile: ${e.message}`, 'warn');
  }

  const models = new Map();        // "profile|handedness" -> entry | null asked | false refused
  let said = false;

  function mesh3(P, N, T) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const bufs = [];
    for (const [data, loc, size] of [[P, 0, 3], [N, 1, 3], [T, 2, 2]]) {
      const b = gl.createBuffer(); bufs.push(b);
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    }
    gl.bindVertexArray(null);
    return { vao, bufs, count: P.length / 3 };
  }

  /**
   * Ask for a hand's model. Safe to call every frame — the first call starts
   * the fetch and every later one is a Map lookup.
   *
   * ⚠️ NOTHING IS AWAITED ANYWHERE NEAR A SESSION'S ENTRY PATH. The model
   * arrives in whatever frame it arrives in and is drawn from the next one; a
   * page that waited for 218 KiB before its first frame would be a black
   * headset for as long as the network felt like taking.
   */
  async function want(profile, handedness) {
    if (!prog || !MODEL_PROFILES[profile]) return false;
    const key = `${profile}|${handedness}`;
    if (models.has(key)) return models.get(key);
    models.set(key, null);
    const url = `${MODEL_BASE}${profile}-${handedness}.glb`;
    const t0 = performance.now();
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status} from ${url}`);
      const m = readGLB(await res.arrayBuffer());
      let tex = null;
      if (m.image) {
        const bmp = await createImageBitmap(new Blob([m.image.bytes], { type: m.image.mime }));
        tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bmp);
        gl.generateMipmap(gl.TEXTURE_2D);
        bmp.close?.();
      }
      const entry = { ...mesh3(m.positions, m.normals, m.uvs), tex };
      models.set(key, entry);
      say(`controllers · ${profile} ${handedness} · ${m.stats.bytes} bytes into `
        + `${m.count} vertices in ${(performance.now() - t0).toFixed(0)} ms`);
      if (!said) { said = true; log('your real controllers are being drawn, from their own models', 'ok'); }
      return entry;
    } catch (e) {
      models.set(key, false);
      // refused by name rather than approximated — and said where you can read
      // it while wearing the thing
      say(`FAIL controllers · ${profile} ${handedness}: ${e.message}`);
      log(`no model for your controller (${e.message})`, 'warn');
      return false;
    }
  }

  return {
    want,
    /** Is there anything to draw for this hand yet? */
    ready: (profile, handedness) => !!models.get(`${profile}|${handedness}`),
    /**
     * @param vp     the view-projection for THIS eye
     * @param grip   the gripSpace pose, in the same space as `vp`
     *
     * ⚠️ GRIP, NOT TARGET RAY. The ray is where you are POINTING and the grip
     * is where your HAND is; they differ by the controller's forward tilt, and
     * a model drawn at the ray sits visibly wrong in the fist.
     */
    draw({ vp, grip, profile, handedness }) {
      if (!prog || !grip) return false;
      const entry = models.get(`${profile}|${handedness}`);
      if (!entry) return false;
      gl.useProgram(prog);
      gl.uniformMatrix4fv(L.vp, false, vp);
      gl.uniformMatrix4fv(L.model, false, grip);
      gl.uniform1f(L.tint, CTRL_TINT);
      if (entry.tex) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, entry.tex);
        gl.uniform1i(L.tex, 0);
        gl.uniform1f(L.has, 1);
      } else gl.uniform1f(L.has, 0);
      // ⚠️ NO BLEND AND A FULL DEPTH WRITE — a solid object, drawn like one.
      // The caller may have left blending on from the ray, which is drawn
      // additively, so this turns it off rather than assuming.
      gl.disable(gl.BLEND);
      gl.depthMask(true);
      gl.bindVertexArray(entry.vao);
      gl.drawArrays(gl.TRIANGLES, 0, entry.count);
      gl.bindVertexArray(null);
      return true;
    },
    /** What happened, in one word, for a readout. */
    status() {
      if (!prog) return 'no program';
      if (!models.size) return 'not asked';
      const v = [...models.values()];
      if (v.some((x) => x && x.count)) return 'real models';
      if (v.every((x) => x === false)) return 'refused';
      return 'loading';
    },
    dispose() {
      for (const e of models.values()) {
        if (!e || !e.vao) continue;
        gl.deleteVertexArray(e.vao);
        e.bufs.forEach((b) => gl.deleteBuffer(b));
        if (e.tex) gl.deleteTexture(e.tex);
      }
      models.clear();
      if (prog) gl.deleteProgram(prog);
    },
  };
}
