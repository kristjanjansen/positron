// demo/shell/xr-ray.mjs: the pointer ray as a view-facing billboard ribbon, not a thin box.
//   const ray = createXRRay(gl); ray.draw({ vp, eyePos, pose, len, held }); // per eye, per frame
// Billboarded in the vertex shader per eye (CPU orientation gives a disparity); fades at both ends.
// why: lessons/kit-xr-ray.md#header

/**
 * How far along the ray the ribbon has faded in, and started to fade out.
 * Exported so the check and the shader share them.
 * why: lessons/kit-xr-ray.md#fade
 */
export const FADE_IN = 0.10, FADE_OUT = 0.45;
/**
 * The ray is grey everywhere; brightness is its only channel and `draw` takes no colour.
 * MONO_AIM and MONO_HELD are the same two values, kept as names.
 * why: lessons/kit-xr-ray.md#grey
 */
export const AIM_RGB = [0.55, 0.55, 0.55];
export const HELD_RGB = [1.0, 1.0, 1.0];
export const MONO_AIM = AIM_RGB;
export const MONO_HELD = HELD_RGB;
/** Half-width at full taper, in metres. 9 mm reads as a line at 2 m and is
 *  still visible at 12; a box at 4 mm was invisible past about 6. */
export const RAY_W = 0.009;
/** How many segments along the ray. The ribbon is straight, so this buys
 *  nothing geometrically — it buys the FADE, which is evaluated per vertex and
 *  would stair-step across a single quad. 32 is smooth at arm's length. */
const SEGS = 32;

const VS = `#version 300 es
layout(location=0) in vec2 aTS;      // t along the ray 0..1, side -1 or +1
uniform mat4 uVP;
uniform vec3 uO;                     // the controller
uniform vec3 uD;                     // unit, forward
uniform vec3 uEye;                   // THIS view's eye — see the header
uniform float uLen;
uniform float uW;
out float vSide; out float vT;
void main(){
  float t = aTS.x;
  vec3 p = uO + uD * (t * uLen);
  vec3 s = cross(uD, uEye - p);
  float L = length(s);
  if (L > 1e-5) {
    s /= L;
  } else {
    // the ray points straight at the eye: there is no "across" and the cross
    // product is zero. Normalising it is a NaN and the whole ribbon vanishes,
    // which is exactly the moment somebody is aiming at their own face and
    // wondering where the pointer went. Any perpendicular will do here, because
    // a ribbon seen end-on is a dot whichever way it is turned.
    vec3 up = abs(uD.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    s = normalize(cross(uD, up));
  }
  // thin where it leaves the hand, full width once it is clear of it
  float w = uW * mix(0.3, 1.0, smoothstep(0.0, 0.25, t));
  gl_Position = uVP * vec4(p + s * (aTS.y * w), 1.0);
  vSide = aTS.y; vT = t;
}`;

const FS = `#version 300 es
precision highp float;
in float vSide; in float vT;
uniform vec3 uCol;
uniform vec2 uFade;                  // in by, out from
out vec4 o;
void main(){
  // across the ribbon: a round cross-section rather than a flat tape, so the
  // edges do not alias into a pair of hard lines when it is nearly edge-on
  float across = max(0.0, 1.0 - vSide * vSide);
  float along = smoothstep(0.0, uFade.x, vT) * (1.0 - smoothstep(uFade.y, 1.0, vT));
  float a = across * along;
  // premultiplied, and drawn ADDITIVE: a pointer is light in the room, so it
  // brightens what is behind it and can never punch a hole in it. Over
  // passthrough that is also the only blend that does not fight the real room.
  o = vec4(uCol * a, a);
}`;

/**
 * Where the camera is, taken out of its own view matrix, so position and matrix cannot disagree.
 * The translation is -R * e with R orthonormal: a transpose and three dot products.
 * why: lessons/kit-xr-ray.md#eye-from-view
 */
export function eyeFromView(v) {
  const t0 = v[12], t1 = v[13], t2 = v[14];
  return [
    -(v[0] * t0 + v[1] * t1 + v[2] * t2),
    -(v[4] * t0 + v[5] * t1 + v[6] * t2),
    -(v[8] * t0 + v[9] * t1 + v[10] * t2),
  ];
}

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}

/**
 * One ribbon, reusable by every page and eye. It restores every piece of GL state it changes.
 * why: lessons/kit-xr-ray.md#create-xr-ray
 */
export function createXRRay(gl) {
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FS));
  // ⚠️ BEFORE linkProgram. Afterwards it is a no-op that reads like a fix, and
  // a Quest reported GL_INVALID_OPERATION on a first frame it drew correctly.
  gl.bindAttribLocation(prog, 0, 'aTS');
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));

  const L = {
    vp: gl.getUniformLocation(prog, 'uVP'),
    o: gl.getUniformLocation(prog, 'uO'),
    d: gl.getUniformLocation(prog, 'uD'),
    eye: gl.getUniformLocation(prog, 'uEye'),
    len: gl.getUniformLocation(prog, 'uLen'),
    w: gl.getUniformLocation(prog, 'uW'),
    col: gl.getUniformLocation(prog, 'uCol'),
    fade: gl.getUniformLocation(prog, 'uFade'),
  };

  // a strip: two vertices per ring, SEGS + 1 rings
  const verts = new Float32Array((SEGS + 1) * 4);
  for (let i = 0; i <= SEGS; i++) {
    const t = i / SEGS;
    verts[i * 4] = t; verts[i * 4 + 1] = -1;
    verts[i * 4 + 2] = t; verts[i * 4 + 3] = 1;
  }
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  const count = (SEGS + 1) * 2;

  return {
    /**
     * @param vp      the view-projection for THIS eye
     * @param view    THIS eye's view matrix; the position is taken out of it (eyeFromView)
     * @param eyePos  an override, for a caller with no view matrix
     * @param pose    the controller's target-ray matrix (column-major 16)
     * @param len     metres to draw; the host owns the rule
     * @param held    something active on this ray: grey lightens to white. There is no colour.
     * why: lessons/kit-xr-ray.md#draw
     */
    draw({ vp, view = null, eyePos = null, pose, len = 2.4, held = false }) {
      if (!pose) return;
      const e = eyePos || (view && eyeFromView(view));
      if (!e) return;
      const dx = -pose[8], dy = -pose[9], dz = -pose[10];
      const dl = Math.hypot(dx, dy, dz) || 1;
      gl.useProgram(prog);
      gl.uniformMatrix4fv(L.vp, false, vp);
      gl.uniform3f(L.o, pose[12], pose[13], pose[14]);
      gl.uniform3f(L.d, dx / dl, dy / dl, dz / dl);
      gl.uniform3f(L.eye, e[0], e[1], e[2]);
      gl.uniform1f(L.len, len);
      gl.uniform1f(L.w, RAY_W);
      const c = held ? HELD_RGB : AIM_RGB;
      gl.uniform3f(L.col, c[0], c[1], c[2]);
      gl.uniform2f(L.fade, FADE_IN, FADE_OUT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      // Depth tested so the ray goes behind things; mask off so a mostly transparent ribbon occludes nothing.
      // why: lessons/kit-xr-ray.md#depth
      gl.depthMask(false);
      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, count);
      gl.bindVertexArray(null);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
    },
    dispose() {
      gl.deleteProgram(prog); gl.deleteBuffer(buf); gl.deleteVertexArray(vao);
    },
  };
}

/**
 * Grades the ray by rendering it and counting ink: draws at all, turns edge-on when `uEye` moves
 * 90 degrees round the ray (passes when that render is much dimmer), fades at both ends.
 * Returns raw counts; the host asserts on them.
 * why: lessons/kit-xr-ray.md#ray-check
 */
export function rayCheck(gl) {
  // 512 px so the shipped 18 mm ribbon is 3.8 px wide (at 64 px it was half a pixel and read 0).
  // RAY_W is not widened for the test.
  // why: lessons/kit-xr-ray.md#check-n
  const N = 512;
  const fbTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, fbTex);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, N, N);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fbTex, 0);

  // the ray: from the origin, straight along -Z, 2 m of it
  const pose = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  const LEN = 2;
  // 1.75 m at a 1.2 rad field of view keeps the 2 m ray in frame with about 8 px each end,
  // so the fade check reads the ends and not the middle.
  // why: lessons/kit-xr-ray.md#camera-distance
  const at = [0, 0, -LEN / 2];
  const eyeA = [1.75, 0, -LEN / 2];
  // ...90 degrees round the ray's own axis, i.e. above it. Handing THIS to a
  // ribbon while projecting from eyeA is precisely the orient-on-the-CPU bug.
  const eyeB = [0, 1.75, -LEN / 2];

  const mul = (a, b) => {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 4; r++) {
        o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1]
          + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
      }
    }
    return o;
  };
  const nrm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };
  const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  // `up` is a parameter: eyeB looks straight down -Y, where an assumed +Y gives NaN.
  // why: lessons/kit-xr-ray.md#up-param
  const view = (e, a, up) => {
    const f = nrm([a[0] - e[0], a[1] - e[1], a[2] - e[2]]);
    const r = nrm(crs(f, up));
    const u = crs(r, f);
    return new Float32Array([
      r[0], u[0], -f[0], 0, r[1], u[1], -f[1], 0, r[2], u[2], -f[2], 0,
      -(r[0] * e[0] + r[1] * e[1] + r[2] * e[2]),
      -(u[0] * e[0] + u[1] * e[1] + u[2] * e[2]),
      (f[0] * e[0] + f[1] * e[1] + f[2] * e[2]), 1]);
  };
  const t = 1 / Math.tan(1.2 / 2);
  const proj = new Float32Array([t, 0, 0, 0, 0, t, 0, 0, 0, 0, -1.002, -1, 0, 0, -0.02, 0]);

  const ray = createXRRay(gl);
  const px = new Uint8Array(N * N * 4);
  function shoot(vp, eyePos) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.viewport(0, 0, N, N);
    gl.disable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    ray.draw({ vp, eyePos, pose, len: LEN });   // eyePos here, to vary it on purpose
    gl.readPixels(0, 0, N, N, gl.RGBA, gl.UNSIGNED_BYTE, px);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    let ink = 0;
    for (let i = 0; i < px.length; i += 4) ink += px[i] + px[i + 1] + px[i + 2];
    return ink;
  }

  const viewA = view(eyeA, at, [0, 1, 0]);
  const vpA = mul(proj, viewA);
  // Round-trips eyeFromView against eyeA, the one exact answer here; a wrong transpose looks plausible.
  // why: lessons/kit-xr-ray.md#round-trip
  const back = eyeFromView(viewA);
  const backErr = Math.max(...back.map((v, i) => Math.abs(v - eyeA[i])));
  const facing = shoot(vpA, eyeA);
  const edgeOn = shoot(vpA, eyeB);

  // and the fade, read down the ribbon in the facing render. The ray runs along
  // -Z and the camera is on +X looking at it, so on screen it runs across in X:
  // the controller end and the far end are the two sides of the frame.
  shoot(vpA, eyeA);
  const col = (x) => {
    let v = 0;
    for (let y = 0; y < N; y++) v += px[(y * N + x) * 4 + 1];
    return v;
  };
  // the two ends and the middle, as fractions of the frame rather than as pixel
  // numbers, so changing N above cannot silently move them off the ribbon
  const ends = [col(Math.round(N * 0.11)), col(N >> 1), col(Math.round(N * 0.89))];

  ray.dispose();
  gl.deleteFramebuffer(fb); gl.deleteTexture(fbTex);
  gl.enable(gl.DEPTH_TEST);
  return { facing, edgeOn, ends, backErr };
}
