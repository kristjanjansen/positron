// demo/shell/xr-ray.mjs — the pointer ray, as a billboard rather than a stick.
//
//   const ray = createXRRay(gl);
//   ray.draw({ vp, eyePos, pose, len, held });   // once per EYE, per frame
//   ray.dispose();
//
// 🔴 WHY IT IS NOT A LONG THIN BOX, WHICH IS WHAT THIS REPO HAD.
// `xr-room.mjs`'s `beamM` scales a cube 4 mm x 4 mm x however far, and a box
// has a fixed cross-section in the WORLD: point along it and you see a square
// end-on, roll the controller and the lit face changes, and at 12 m it is four
// millimetres of shaded geometry trying to be a line. It also ends at a hard
// edge in mid-air, which reads as the pointer stopping rather than as the
// pointer running out.
//
// A billboard has a fixed cross-section in the VIEW instead. It is a ribbon
// built along the ray whose width axis is chosen per-vertex to be perpendicular
// to both the ray and the direction to the eye, so it presents the same face
// from everywhere, cannot be rolled, and has no end-on degenerate angle.
//
// 🔴 AND THE BILLBOARDING IS IN THE VERTEX SHADER, WHICH IS NOT A STYLE CHOICE.
// A headset draws the same geometry twice from two eye positions ~64 mm apart.
// Orienting the ribbon on the CPU picks one of those two and is therefore wrong
// for the other — and the error is not a smear, it is a DISPARITY: the two eyes
// see the ribbon at different widths and slightly different places, which the
// visual system reads as depth. A pointer that sits at the wrong depth is worse
// than one that looks wrong, because it looks fine and lands somewhere else.
// `uEye` is per-draw, and the host passes the view's own position.
//
// ⚠️ IT FADES AT BOTH ENDS ON PURPOSE. Near the hand because a line growing out
// of a controller model intersects it and reads as a skewer; in the distance
// because a hard end is a claim about where the ray stops, and this ray does
// not stop — it is an aim, not a measurement. Anything that wants to say where
// the ray LANDS says it at the landing, not by terminating the beam.

/** How far along the ray the ribbon has faded in, and started to fade out.
 *  ⚠️ Exported because the check below and the shader must agree about them,
 *  and a test that re-types its subject's constants grades nothing. */
export const FADE_IN = 0.10, FADE_OUT = 0.45;
/** The default aim colour, and the colour of a ray with hold of something.
 *  One meaning for colour across the site: this is HOW IT LANDED, not which
 *  hand it is — which hand is answered by the tablet being on the other one. */
export const AIM_RGB = [0.42, 0.78, 0.76];
export const HELD_RGB = [1.0, 0.83, 0.0];
/** ...and the same pair for a page that has no colour to spend. `floor` is 1965
 *  newsreel put through one luma and a coloured pointer would be the only hue
 *  in the archive — so the ray says "I have hold of this" by getting LIGHTER
 *  rather than by changing hue, which is the same channel doing the same job. */
export const MONO_AIM = [0.55, 0.55, 0.55];
export const MONO_HELD = [1.0, 1.0, 1.0];
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
 * Where the camera is, taken out of its own view matrix.
 *
 * 🔴 DERIVED RATHER THAN PASSED, AND THAT IS THE WHOLE POINT. The billboard has
 * to be turned against the eye that is ALSO projecting it, and a headset draws
 * two views 64 mm apart. Handing the position down beside the matrix means two
 * values that must agree and nothing that makes them — the first draft threaded
 * a `viewPos` through two modules and three call sites, every one of which had
 * a HEAD position already sitting next to it in the right shape. Taking it out
 * of the matrix makes disagreement impossible.
 *
 * A view matrix is `-R * e` in its translation with an orthonormal R above it,
 * so the inverse is a transpose and three dot products.
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
 * One ribbon, reusable by every page and every eye.
 *
 * ⚠️ IT PUTS BACK EVERY PIECE OF GL STATE IT CHANGES. A kit component that
 * leaves blending on, or the depth mask off, is a component that breaks the
 * NEXT thing its host draws — and the host will look like the broken one.
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
     * @param view    THIS eye's view matrix. The position is taken out of it —
     *                see `eyeFromView` for why it is not a separate argument.
     * @param eyePos  an override, for a caller that has no view matrix to hand
     * @param pose    the controller's target-ray matrix (column-major 16)
     * @param len     metres to draw. To what it has hold of, else what it is
     *                on, else a fixed reach — the host owns that rule.
     * @param held    true while the trigger has hold of something
     */
    draw({ vp, view = null, eyePos = null, pose, len = 2.4, held = false, colour = null }) {
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
      const c = colour || (held ? HELD_RGB : AIM_RGB);
      gl.uniform3f(L.col, c[0], c[1], c[2]);
      gl.uniform2f(L.fade, FADE_IN, FADE_OUT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      // ⚠️ DEPTH TESTED, DEPTH MASK OFF. Tested, so the ray really does go
      // behind anything in front of it; not WRITTEN, so a ribbon that is mostly
      // transparent does not occlude whatever is drawn after it.
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
 * 🔴 THE RAY, GRADED BY RENDERING IT — WHICH IS THE ONLY WAY A BILLBOARD CAN BE
 * GRADED AT ALL.
 *
 * The whole claim is about a vertex shader that chooses an orientation per eye,
 * and there is no arithmetic on this side of the GPU to check: a node test
 * would have to re-implement the shader and would then be grading its own copy.
 * So this renders into a 64 px framebuffer and counts ink, and every number it
 * returns is a comparison between two renders of the SAME run — no golden
 * image, for the reason `verify-gl.mjs` records at length.
 *
 * Three questions, and the second is the one that earns its place:
 *
 *  · does it draw at all, from a viewpoint beside the ray?
 *  · does it TURN? The same ray is drawn a second time with `uEye` moved 90
 *    degrees around the ray's own axis — which is exactly the bug of orienting
 *    on the CPU and using one eye's answer for both. A ribbon that really faces
 *    the eye it is given comes out edge-on and nearly disappears; a stretched
 *    box, or a ribbon with the billboarding broken, does not change at all.
 *    ⚠️ So the test PASSES when the second render is much dimmer. A check that
 *    wanted both to look the same would be satisfied by the bug.
 *  · and does it fade at both ends rather than stopping?
 *
 * Returns raw counts; the host asserts on them, so the numbers appear in the
 * page that has the ray rather than in a file nobody runs.
 */
export function rayCheck(gl) {
  // 🔴 THE FRAMEBUFFER HAS TO BE ABLE TO RESOLVE THE THING IT IS GRADING, AND
  // THE FIRST VERSION COULD NOT. At 64 px the frame covers 2.39 m, so the
  // shipping ribbon — 18 mm across — was **half a pixel** wide and the check
  // read 0 ink both ways: a component that draws correctly, reported as drawing
  // nothing at all. ⚠️ And the two zeroes would have satisfied a sloppier
  // assert: `facing >= edgeOn` is true of 0 and 0. At 512 the ribbon is 3.8 px.
  // ⚠️ The width is NOT widened for the test. Grading the shipped RAY_W means
  // setting it to zero fails here, which is the point of having the number in
  // one place.
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
  // ⚠️ THE CAMERA DISTANCE IS COMPUTED, NOT CHOSEN. At a 1.2 rad field of view
  // the half-width visible at distance D is D * tan(0.6), and the fade check
  // below reads the two ENDS of the ribbon — so if the ray overflows the frame
  // those columns are sampling the middle of it and "the ends are dark" is a
  // statement about the background. 1.75 m puts the 2 m ray inside the frame
  // with about 8 px of margin at each end.
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
  // ⚠️ up is a PARAMETER here. The obvious helper takes (eye, at) and assumes
  // +Y, and eyeB looks straight down -Y — where that assumption is degenerate
  // and hands back a matrix of NaN, so the second render would be blank for a
  // reason that has nothing to do with the ray.
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
  // ⚠️ AND THE DERIVATION IS ROUND-TRIPPED, because it has an exact expected
  // answer and almost nothing else here does: this matrix was BUILT from eyeA,
  // so taking the position back out of it must give eyeA again. A transpose
  // written the wrong way round still produces a plausible position.
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
