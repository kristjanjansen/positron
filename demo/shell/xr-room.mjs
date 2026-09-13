// demo/shell/xr-room.mjs — the room `scene` builds from one seed, as a module,
// so a second page can stand in the same one.
//
// 🔴 THIS IS demo/scene's ROOM, EXTRACTED — NOT A SECOND ONE. `scene` drew the
// sky, the wall cube, the things and the per-eye loop inside its own page, and
// `mirror` had a panel hanging in nothing. Two rooms would be two sets of the
// same five WebXR defects, each of them silent from outside and every one of
// them already paid for on a real Quest. The traps live at the top of
// demo/shell/xr-panel.mjs, which owns the SESSION; this file owns the PICTURE,
// and the two rules it has to keep on its own are:
//
//   1. `gl.clear` IGNORES THE VIEWPORT. Both eyes render into one framebuffer,
//      so only the first view clears colour and the rest clear DEPTH inside a
//      `gl.scissor` — `draw({ clear: eye === 0 })` is that, and a viewport is
//      not a clip region.
//   2. `bindAttribLocation` ONLY TAKES EFFECT AT THE NEXT LINK. One VAO feeds
//      three programs with position at 0 and normal at 1, so every link here
//      binds both slots BEFORE `linkProgram` — called after, it is a no-op that
//      reads like a fix, and a Quest reported GL_INVALID_OPERATION for it while
//      drawing a correct-looking picture.
//
// ⚠️ AND NOTHING IN `draw` OR `observePlanes` MAY THROW. An uncaught error
// inside a frame callback does not stop the loop — it silently removes
// everything below it, which is how `scene` lost its status panel and its
// gl-error check for the whole life of the page. `frame.detectedPlanes` is the
// new hazard: it THROWS on a session that was not granted the feature, so it is
// asked once behind a try and never asked again after a refusal.

import { world as world0 } from './seed.mjs';
import { TABLET, registerStandIn, registerDrawnAs } from './xr-tablet.mjs';
import { readGLB } from './xr-glb.mjs';

// ── nothing sits inside anything else ─────────────────────────────────────
// 🔴 THE GENERATOR PLACES EACH THING WITHOUT LOOKING AT THE ONES ALREADY
// THERE, so two of them can occupy the same piece of space. Reported from a
// Quest 2026-09-13, and MEASURED over 200 seeds before this landed: 264
// overlapping pairs of 46,440, in 135 of 200 rooms, the worst of them 0.615 m
// deep — one thing swallowing another. In a window that reads as an odd shape;
// in a headset it is a thing you cannot walk round, because it is not one
// thing.
//
// ⚠️ THE BALL, NOT THE BOX. Things SPIN (`ry + tSec * spin` in the draw), so a
// box-against-box test is true this frame and false the next, and a separation
// that holds at one instant is not a rule. The circumscribed sphere of a cube
// of edge s — s·√3/2 — is the only bound that survives every rotation, and it
// is the same ball `scene`'s `pick` aims with, read from this one constant
// rather than typed in both places.
//
// 🔴 AND THE ROOM MUST STILL BE A FUNCTION OF ITS SEED. Everything below is
// arithmetic on the generated numbers: no clock, no `Math.random`, no iteration
// order that depends on anything but the index. Roll the same seed twice and it
// is still byte for byte the same room, which is the claim the negative control
// makes and the whole reason a room fits in four bytes.
export const radiusOf = (t) => t.s * 0.87;
// Air between two surfaces, and it is doing two jobs. It has to clear the
// document's own rounding — MEASURED at a gap of zero, 128 pairs of 46,440 were
// pushed to exactly touching and then ROUNDED back into contact, by 1.3e-4 m,
// which 1 cm already fixes. 4 cm is for the eye: two things a rounding error
// apart are one shape with a seam in it, and the rule is meant to make two
// things look like two.
export const GAP = 0.04;
// MEASURED over 400 seeds: 11 passes was the most any room needed, and 342 of
// them settled in two. The cap is here so a pathological room cannot spin, not
// because rooms reach it.
export const SPREAD_PASSES = 24;
// How many goes a DROPPED thing gets at finding somewhere to be. It is far
// larger than the placement number because only one thing moves there — the
// rest of the room is nailed down — so it has to walk out of a crowd rather
// than have the crowd open up. MEASURED over 123,027 drops made dead centre
// into another thing: 8 goes left 146 of them still overlapping, 48 leaves 3.
// ⚠️ AND 64 ALSO LEAVES 3 — the same three. They are not slow to converge, they
// do not converge: the thing bounces between two neighbours, clearing each by
// entering the other. More passes buy nothing, the residue is 0.064 m at its
// worst rather than the 0.73 m a generator can produce, and the honest thing is
// to say so here rather than claim a guarantee this does not have.
export const DROP_PASSES = 48;
export const r4 = (v) => Math.round(v * 10000) / 10000;

/** The same room, with every thing pushed off every other thing. */
export function spaced(w) {
  const th = (w?.things || []).map((t) => ({ ...t }));
  for (let pass = 0; pass < SPREAD_PASSES; pass++) {
    let shifted = false;
    for (let i = 0; i < th.length; i++) for (let j = i + 1; j < th.length; j++) {
      const a = th[i], b = th[j];
      const need = radiusOf(a) + radiusOf(b) + GAP;
      let dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
      let len = Math.hypot(dx, dy, dz);
      if (len >= need - 1e-6) continue;
      // Two centres in the same place have no line between them to push along.
      // The direction comes from the pair's own indices — a random one would be
      // a different room on every roll.
      if (len < 1e-6) { dx = Math.cos(i + j); dy = 0.3; dz = Math.sin(i + j); len = Math.hypot(dx, dy, dz); }
      const k = (need - len) / len / 2;        // half the shortfall each, along the line
      a.x -= dx * k; a.y -= dy * k; a.z -= dz * k;
      b.x += dx * k; b.y += dy * k; b.z += dz * k;
      shifted = true;
    }
    if (!shifted) break;
  }
  // Rounded the way the generator rounds — see seed.mjs. The document is
  // compared byte for byte, so it has to leave here canonical.
  return { ...w, things: th.map((t) => ({ ...t, x: r4(t.x), y: r4(t.y), z: r4(t.z) })) };
}

/**
 * A room from a seed, spaced.
 *
 * ⚠️ THE SEPARATION IS PART OF THIS, NOT OF THE CALLERS. A rule applied at
 * three call sites is a rule missing from the fourth — and a generator swapped
 * in live over the wire would arrive without it.
 */
export const roomOf = (seed) => spaced(world0(seed));

/**
 * How the things in a room stand to one another: how many pairs are inside each
 * other, how deep the worst of them is, and the tightest gap there is between
 * two surfaces.
 *
 * `closest` is what the asserts print when they pass — a pass that prints only
 * "0 pairs" says the same thing about a room with 4 cm to spare and one with
 * 4 metres, and the number that moves is the one worth reading.
 */
export function clashes(w) {
  const th = w?.things || [];
  let pairs = 0, deep = 0, closest = Infinity;
  for (let i = 0; i < th.length; i++) for (let j = i + 1; j < th.length; j++) {
    const a = th[i], b = th[j];
    const gap = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) - radiusOf(a) - radiusOf(b);
    if (gap < 0) { pairs++; deep = Math.max(deep, -gap); }
    closest = Math.min(closest, gap);
  }
  return { pairs, deep, closest: Number.isFinite(closest) ? closest : 0 };
}

// ── the smallest matrix library that does this job ────────────────────────
// Column-major, like GL wants. Written out rather than imported because it is
// forty lines and the alternative is a dependency.
export const mul = (a, b) => { const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; }
  return o; };
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

export const modelM = (x, y, z, s, rx, ry) => {
  const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry);
  // R = Ry * Rx, then uniform scale, then translate.
  return new Float32Array([
    s * cy, 0, s * (-sy), 0,
    s * (sy * sx), s * cx, s * (cy * sx), 0,
    s * (sy * cx), -s * sx, s * (cy * cx), 0,
    x, y, z, 1]);
};
export const perspective = (fov, asp, n, f) => { const t = 1 / Math.tan(fov / 2);
  return new Float32Array([t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, 2 * f * n / (n - f), 0]); };
export const lookAt = (eye, at) => {
  const z = norm(sub(eye, at)), x = norm(cross([0, 1, 0], z)), y = cross(z, x);
  return new Float32Array([
    x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0,
    -dot3(x, eye), -dot3(y, eye), -dot3(z, eye), 1]);
};

/**
 * A long thin box lying along a controller's ray.
 *
 * `modelM` cannot do this: it scales uniformly and only rotates about two axes,
 * while a beam needs the controller's OWN orientation and a different scale
 * down each axis. Taking the rotation straight out of the pose matrix is both
 * shorter and exact.
 */
export function beamM(m, len) {
  const sx = 0.004, sy = 0.004;
  return new Float32Array([
    m[0] * sx, m[1] * sx, m[2] * sx, 0,
    m[4] * sy, m[5] * sy, m[6] * sy, 0,
    m[8] * len, m[9] * len, m[10] * len, 0,
    // -Z is forward, so the box's centre sits half a length down the ray
    m[12] - m[8] * len * 0.5, m[13] - m[9] * len * 0.5, m[14] - m[10] * len * 0.5, 1]);
}

/**
 * 🔴 THE CONTROLLER STAND-IN, AND WHY IT IS NOT THE REAL MODEL.
 *
 * The headset reports `meta-quest-touch-plus`, so the WebXR input-profiles
 * registry WOULD hand over a real glTF, and the licence is not the obstacle —
 * `@webxr-input-profiles/assets` is MIT (Amazon, 2019). The obstacle is what it
 * costs, MEASURED off the registry on 2026-09-13 rather than guessed at:
 *
 *   meta-quest-touch-plus/left.glb    217,984 bytes
 *   meta-quest-touch-plus/right.glb   213,868 bytes
 *   profile.json                       11,430 bytes   (taken — see xr-hands.mjs)
 *
 * 433 KiB of mesh, and every byte of it needs machinery this repo does not
 * have. The `.glb` is glTF 2.0 with 31 nodes, 6 meshes, 23 accessors, one PBR
 * material and one embedded PNG, with POSITION/NORMAL/**TEXCOORD_0** — and the
 * room's whole shader vocabulary is a flat-colour box program over one VAO with
 * position at slot 0 and normal at slot 1 and no texture coordinate anywhere.
 * So it is a container parser AND an accessor decoder AND a node walk AND a PNG
 * decode AND a third program, to draw a thing whose entire job is to answer
 * "where is my hand". And `LAYOUT.md` would put the bytes in
 * `demo/<slug>/vendor/`, listed by name in the build — while this module is
 * SHARED by two pages, so a per-slug asset path fetched from `demo/shell/` is
 * the exact shape of the `moq.mjs` rename bug that made two demos assert
 * nothing.
 *
 * ⚠️ So: primitives, and the tablet's footer SAYS it is a stand-in. A proxy
 * that admits to being a proxy is honest; one that pretends to be a controller
 * is not. `plan-xr-hands` §4.2 reached the same answer for the same reasons and
 * this is that decision with the numbers under it.
 *
 * The parts, in metres, each one a box offset along the grip's own -Z:
 * the handle your fist is round, the SQUARE TOP FACE the tablet lies on, and a
 * nub where the thumbstick is so the thing has a visible orientation.
 */
export const GRIP_PARTS = [
  // The body: butt, tapering handle, and the wider rounded head the face plate
  // is on. `sy` flattens the circle into the oval a Touch controller actually
  // is — the profile is a body of revolution and the squash is one number.
  { name: 'body', mesh: 'body', sx: 1, sy: 0.88, sz: 1, at: 0, col: [0.26, 0.29, 0.35] },
  // The thumbstick, which is the only part that says WHICH WAY UP the thing is.
  { name: 'thumbstick', mesh: 'stick', sx: 1, sy: 1, sz: 1, at: 0.038, col: [0.52, 0.57, 0.67] },
];
registerStandIn(GRIP_PARTS.length);

/**
 * 🔴 WHERE THE CONTROLLER MODELS LIVE, AND WHY A SHELL MODULE MAY HOLD THE
 * PATH.
 *
 * The hazard is real and it is `LESSONS`' own: `demo/shell/moq.mjs` went on
 * importing a URL a slug rename had moved, 404ed, killed the module, and made
 * two demos assert NOTHING while reading red for an unrelated reason. A shared
 * module holding a path is exactly that shape.
 *
 * Three things make it safe here, and all three had to be true:
 *
 *   1. **The path is under `/shell/`, which is where this module lives.** These
 *      assets belong to the ROOM, and the room is shared by two pages — putting
 *      them under one page's `vendor/` would mean the other page's controllers
 *      came from a directory named after a demo it is not. `LAYOUT.md` carries
 *      the reasoning; the wall it describes is still a wall, this is just the
 *      right side of it.
 *   2. 🔴 **`workers/view/build.mjs` REFUSES THE BUILD if the file is missing**,
 *      by name, the same treatment an import with no deployed file already
 *      gets. That is the check `moq.mjs` did not have. A rename cannot ship.
 *   3. **A 404 at runtime is not fatal and it SAYS SO.** The primitive stand-in
 *      draws instead and the tablet's own footer says which one you are looking
 *      at. `moq.mjs`'s 404 was silent; this one is on the thing in your hand.
 *
 * ⚠️ KEYED ON `XRInputSource.profiles`, WHICH IS THE STRING THE HEADSET ITSELF
 * REPORTS. The filename carries the profile id for that reason — the name and
 * the lookup are the same string, so there is nothing to keep in step. A
 * headset reporting anything else gets the stand-in, and is told.
 */
export const MODEL_BASE = '/shell/vendor/';
export const MODEL_PROFILES = { 'meta-quest-touch-plus': true };

/**
 * The stand-in's outline, as radius against distance along the controller.
 *
 * 🔴 THE FIRST VERSION WAS THREE BOXES AND IT CAME BACK FROM THE HEADSET AS
 * *"butt-ugly boxes"*. That is a fair verdict and it is not an argument for the
 * 433 KiB of glTF — those reasons are unchanged and they are in `LAYOUT.md`. It
 * is an argument for a shape somebody chose. A lathe is twelve numbers and one
 * loop, and a body of revolution round the controller's own axis is very nearly
 * what a controller is.
 *
 * ⚠️ AND IT HAS NO TRACKING RING, WHICH IS CORRECT RATHER THAN MISSING. The
 * headset reports `meta-quest-touch-plus` — the Quest 3 controller — and that
 * generation removed the ring. A ring here would be a stand-in for a DIFFERENT
 * controller, which is worse than an obvious placeholder: it would be a
 * confident picture of the wrong object.
 *
 * ⚠️ AND IT STILL SAYS IT IS A STAND-IN, on the tablet's own footer. A shape
 * that looks like a real controller and is not is worse than a box.
 *
 * Metres, in grip-local coordinates, where -Z is the thumb's direction — so the
 * butt sits at positive z and the face plate at negative z.
 */
export const BODY_PROFILE = [
  [+0.0735, 0.004],  // the butt, rounded off rather than cut flat
  [+0.068, 0.012],
  [+0.052, 0.018],
  [+0.028, 0.021],
  [+0.004, 0.023],
  [-0.014, 0.025],   // the waist, where a fist closes
  [-0.026, 0.028],
  [-0.036, 0.031],
  [-0.043, 0.032],   // the head, widest just under the face plate
  [-0.047, 0.028],
  [-0.0492, 0.017],
  [-0.0498, 0.004],  // the face plate, rounded off at its rim
];
export const STICK_PROFILE = [
  [+0.002, 0.004],
  [-0.001, 0.0085],
  [-0.008, 0.0092],
  [-0.011, 0.0075],
  [-0.0125, 0.003],
];

/**
 * One part of the stand-in, at a grip pose.
 *
 * `modelM` cannot do this — it scales uniformly and rotates about two axes,
 * while a part needs the controller's OWN orientation and a different size down
 * each axis. Taking the rotation straight out of the pose matrix is shorter and
 * exact; it is `beamM`'s pattern with different constants.
 *
 * ⚠️ THE PROFILES ARE ALREADY IN METRES, so `sz` is 1 and the scales are only
 * there to squash a circle into an oval. A lathe built at unit size and then
 * scaled to fit would be two places holding the controller's dimensions.
 */
export const partM = (m, p) => new Float32Array([
  m[0] * p.sx, m[1] * p.sx, m[2] * p.sx, 0,
  m[4] * p.sy, m[5] * p.sy, m[6] * p.sy, 0,
  m[8] * p.sz, m[9] * p.sz, m[10] * p.sz, 0,
  // -Z is the thumb's direction, which is the way the top face looks
  m[12] - m[8] * p.at, m[13] - m[9] * p.at, m[14] - m[10] * p.at, 1]);

/**
 * 🔴 HOW FAR ALONG THE CONTROLLER THE TOP OF IT IS — **MEASURED off the real
 * model**, not from the stand-in and not typed.
 *
 * `readGLB` on the vendored `meta-quest-touch-plus` files puts the geometry at
 * z -0.0498 .. +0.0735 about the grip origin, both hands, identically. So the
 * face plate is 4.98 cm along the thumb's direction — and the stand-in's own
 * profile was 7.1 cm, **2.1 cm too long**, which is not nothing: swapping
 * between a stand-in and a real model would have moved the tablet's apparent
 * attachment point by two centimetres the moment the fetch landed, which reads
 * as the tablet jumping rather than as two shapes disagreeing. `BODY_PROFILE`
 * is built to these bounds now, so the two occupy the same space.
 */
export const CONTROLLER_TOP = 0.0498;
/** Air between the tablet's lower edge and the top of the controller. */
export const TABLET_GAP = 0.008;

/**
 * 🔴 HOW FAR THE FACE LEANS BACK FROM SQUARE-ACROSS-THE-CONTROLLER, in radians.
 *
 * 0 would put the screen exactly perpendicular to the handle. 20 degrees leans
 * its top edge away and its bottom edge towards you, which is how a watch face
 * sits on a wrist and is what makes it readable at the angle a hand actually
 * holds a controller at.
 *
 * ⚠️ IT IS FIXED TO THE CONTROLLER AND IT DOES NOT FOLLOW YOUR HEAD, and that
 * is a decision rather than an omission. A face that turns to meet you is a
 * billboard: it swims whenever you look away and back, the thing it is attached
 * to appears to rotate under it, and you can never learn where it is because it
 * is never in the same place twice. `xr-panel.mjs` makes the same argument
 * about panels ("a panel that follows your face cannot be looked away from").
 * A fixed offset is learned once, with your wrist.
 *
 * This is the first number to change if it still reads wrong in a headset.
 */
export const FACE_TILT = 20 * Math.PI / 180;

/**
 * Where the tablet's centre sits, along the controller's own axis.
 *
 * 🔴 DERIVED, NOT TYPED, and it had to become derived. The tablet grew by two
 * thirds and a hand-typed lift left its lower edge 0.4 mm INSIDE the head — a
 * two-sided number (too little and it is buried, too much and it floats
 * detached and reads as a tracking fault) that four constants all move. It is
 * the top of the controller, plus air, plus however far the slab's own lower
 * edge reaches once it has leaned back. `xr-pick-test.mjs` measures the gap
 * that comes out and requires it to be positive and small.
 */
export const TABLET_LIFT = CONTROLLER_TOP + TABLET_GAP + (TABLET.h / 2) * Math.cos(FACE_TILT);

/**
 * 🔴 THE TABLET, STANDING UP FROM THE CONTROLLER'S TOP FACE AND LEANING BACK AT
 * YOU. Reported from a Quest 3: *"tablet works but looks to sky not to me (x
 * rot 90 missing)"* — and that diagnosis was exactly right.
 *
 * The grip convention (WebXR CRD via MDN): the origin is the centroid of the
 * closed fist, **-Z runs along the controller in the direction of the thumb**,
 * and X comes out of the back of the hand. The first version put the tablet's
 * NORMAL along -Z — flat on the top plate, facing the way the plate faces,
 * which with the controller held normally is **straight up at the ceiling**. It
 * was square to the controller, which is what was asked for, and unreadable,
 * which was not.
 *
 * One quarter turn about the controller's own X axis fixes it, and the axes
 * fall out of that rotation rather than being chosen again:
 *
 *   its right   = the grip's +X                    (untouched by its own turn)
 *   its up      = -Y·cos(t) - Z·sin(t)             at t=90° that is -Z, i.e.
 *                                                  straight up the controller
 *   its normal  = +Y·sin(t) - Z·cos(t)             at t=90° that is +Y, i.e.
 *                                                  across the handle, back at
 *                                                  whoever is holding it
 *
 * with `t = 90° - FACE_TILT`, so the face leans back towards the reader.
 *
 * 🔴 AND THE DETERMINANT IS STILL THE LOAD-BEARING CHECK. A rotation cannot
 * change it — it is w·h either way — but a hand-negated column can, and the
 * room draws with `CULL_FACE` on, so a mirrored basis is an **INVISIBLE**
 * tablet rather than a wrong-looking one. That is why the fix above is a
 * rotation of the whole basis and not a sign flipped until the picture looked
 * right. `xr-pick-test.mjs` asserts the sign, the lean and the old failure's
 * exact signature, on a laptop.
 *
 * ⚠️ STILL NO `handedness` TERM. MDN's mirrored-X warning is about anything
 * hung off the HAND; this hangs off the PLASTIC, and the top face is on the
 * thumb side for both hands. A sign flip here would correct a bug this pose
 * does not have.
 */
export function holdM(m, o = TABLET) {
  const rx = m[0], ry = m[1], rz = m[2];          // the grip's +X
  const ux = m[4], uy = m[5], uz = m[6];          // its +Y
  const fx = m[8], fy = m[9], fz = m[10];         // its +Z, so -Z is the thumb
  const t = Math.PI / 2 - FACE_TILT;
  const c = Math.cos(t), sn = Math.sin(t);
  // up = -(Y·cos t + Z·sin t)
  const nux = -(ux * c + fx * sn), nuy = -(uy * c + fy * sn), nuz = -(uz * c + fz * sn);
  // normal = Y·sin t - Z·cos t
  const nfx = ux * sn - fx * c, nfy = uy * sn - fy * c, nfz = uz * sn - fz * c;
  return new Float32Array([
    rx * o.w, ry * o.w, rz * o.w, 0,
    nux * o.h, nuy * o.h, nuz * o.h, 0,
    nfx, nfy, nfz, 0,
    m[12] - fx * TABLET_LIFT, m[13] - fy * TABLET_LIFT, m[14] - fz * TABLET_LIFT, 1]);
}

/** hue 0..1 -> rgb, the same three-cosines palette the walls use. */
export const hueRGB = (h) => [0, 0.33, 0.67].map((o) => 0.45 + 0.55 * Math.cos(6.2831 * (h + o)));

// ── the look ──────────────────────────────────────────────────────────────
export const ROOM_VS = `#version 300 es
  in vec3 aPos; in vec3 aNrm;
  uniform mat4 uProj, uView, uModel;
  out vec3 vN; out vec3 vW; out vec3 vP;
  void main(){
    vP = aPos;
    vN = mat3(uModel) * aNrm;
    vec4 w = uModel * vec4(aPos, 1.0); vW = w.xyz;
    gl_Position = uProj * uView * w; }`;

// The walls run demo/mirror's shader, unchanged apart from losing the feedback
// tap — the same kaleidoscope and domain warp, so the surface of this room is
// the picture that page already measures on two GPUs.
export const SKY_FS = `#version 300 es
  precision highp float;
  uniform float uT; uniform float uHue; out vec4 o;
  in vec3 vP;
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
  void main(){
    vec3 p = normalize(vP);
    vec2 uv = vec2(atan(p.z, p.x) / 6.2831853, p.y * 0.5);
    float a = uv.x * 6.2831853, r = length(vec2(uv.x, uv.y)) + 0.35, seg = 6.2831853 / 8.0;
    a = abs(mod(a + 0.5*seg, seg) - 0.5*seg);
    vec2 k = vec2(cos(a), sin(a)) * r;
    float w = n(k*3.0 + uT*0.06) + 0.5*n(k*6.0 - uT*0.04) + 0.25*n(k*12.0 + uT*0.1);
    vec3 c = 0.5 + 0.5*cos(6.2831*(w + vec3(0.0,0.33,0.67)) + uHue*6.2831);
    // Held down hard: this is a WALL, behind the things you are looking at, and
    // a bright surround in a headset is the difference between a room and a
    // migraine.
    // ⚠️ 0.16 WAS TOO DARK. It was chosen against a bright laptop panel, where
    // it reads as a held-back surround; through a headset there is no ambient
    // light to compare it with and the room reads as black. 0.34 with the same
    // colour, so the walls are still behind the things and not competing with
    // them.
    o = vec4(c * 0.34, 1.0); }`;

// ── the real controller, when we have its model ───────────────────────────
// 🔴 A THIRD PROGRAM, AND IT IS THE ONE THING THE MESHES GENUINELY COST. The
// room's box program has position at slot 0 and normal at slot 1 and no texture
// coordinate anywhere; a glTF model carries TEXCOORD_0 and a base-colour map,
// so it needs its own attribute layout and its own fragment shader. That is
// twenty lines, which is the honest price — and the PNG beside it costs
// nothing, because `createImageBitmap` hands the decode to the browser.
//
// ⚠️ THE LIGHTING IS THE ROOM'S, NOT THE MODEL'S. One lambert from the same
// direction `BOX_FS` uses, times the base-colour texture. It is deliberately
// NOT physically-based: a metallic-roughness path needs an environment to
// reflect and this room does not have one, so it would be a more expensive way
// to look worse. See the revisit trigger at the top of xr-glb.mjs.
export const MODEL_VS = `#version 300 es
  in vec3 aPos; in vec3 aNrm; in vec2 aUv;
  uniform mat4 uProj, uView, uModel;
  out vec3 vN; out vec2 vT;
  void main(){
    vN = mat3(uModel) * aNrm; vT = aUv;
    gl_Position = uProj * uView * uModel * vec4(aPos, 1.0); }`;
export const MODEL_FS = `#version 300 es
  precision highp float;
  in vec3 vN; in vec2 vT;
  uniform sampler2D uTex; uniform float uHas; uniform vec3 uCol;
  out vec4 o;
  void main(){
    vec3 n = normalize(vN);
    float l = 0.35 + 0.65 * max(0.0, dot(n, normalize(vec3(0.4, 0.9, 0.25))));
    vec3 c = uCol;
    if (uHas > 0.5) c *= texture(uTex, vT).rgb;
    o = vec4(c * l, 1.0); }`;

export const BOX_FS = `#version 300 es
  precision highp float;
  in vec3 vN; in vec3 vW; uniform vec3 uCol; out vec4 o;
  void main(){
    vec3 n = normalize(vN);
    float l = 0.35 + 0.65 * max(0.0, dot(n, normalize(vec3(0.4, 0.9, 0.25))));
    o = vec4(uCol * l, 1.0); }`;

// ── the dotted grid ───────────────────────────────────────────────────────
//
// A reference surface, not scenery. It says where the floor is and which way
// the walls run, and in passthrough it is the only thing this page draws that
// is ABOUT your room rather than in front of it — so it is dots rather than
// lines (lines read as a cage), it fades out with distance rather than ending
// in a hard rectangle, and the dots are one size — see the note in main()
// can be read rather than guessed.
//
// ⚠️ THE WIDTH COMES FROM `fwidth` ON THE RAW COORDINATE, not on the folded
// one. Folding with `fract` puts a discontinuity at every cell boundary, and a
// derivative taken across it spikes — which draws a faint line down the middle
// of each gap, i.e. exactly the grid of lines this is not supposed to be.
//
// ⚠️ AND A DOT SMALLER THAN A PIXEL FADES RATHER THAN ALIASES. At a grazing
// angle one pixel covers many cells; drawn at full strength that is a grey haze
// on the far floor, which reads as fog on a page that has none.
const GRID_VS = `#version 300 es
  in vec3 aPos;
  uniform mat4 uProj, uView, uModel;
  uniform vec2 uSize, uOrigin;
  out vec2 vM; out vec3 vW;
  void main(){
    vM = aPos.xy * uSize + uOrigin;
    vec4 w = uModel * vec4(aPos, 1.0); vW = w.xyz;
    gl_Position = uProj * uView * w; }`;
const GRID_FS = `#version 300 es
  precision highp float;
  in vec2 vM; in vec3 vW;
  uniform vec3 uCol; uniform float uAlpha;
  uniform float uCell; uniform float uDot;
  uniform vec3 uEye; uniform vec2 uFade;
  out vec4 o;
  float dotsAt(vec2 p, float cell, float rad, float w){
    vec2 f = (fract(p / cell + 0.5) - 0.5) * cell;
    return 1.0 - smoothstep(rad - w, rad + w, length(f)); }
  void main(){
    vec2 fw = fwidth(vM);
    float w = max(max(fw.x, fw.y), 1e-5);
    // ⚠️ ONE DOT SIZE. Every fourth dot used to be 2.2x as a metre marker, and
    // it went because it was asked for: through a headset the two sizes read as
    // two grids rather than as one grid with a scale on it, and the thing the
    // grid is for is the surface, not the measurement. The cell is 0.125 m, so
    // a metre is eight dots for anyone counting.
    float a = dotsAt(vM, uCell, uDot, w);
    a *= 1.0 - smoothstep(uFade.x, uFade.y, distance(vW, uEye));
    a *= clamp(uDot * 2.0 / w, 0.0, 1.0);
    a *= uAlpha;
    if (a < 0.02) discard;
    o = vec4(uCol, a); }`;

/**
 * The tablet's face — a dark slab with rounded corners, with the tablet's own
 * canvas drawn onto it.
 *
 * 🔴 A SIGNED-DISTANCE ROUNDED RECTANGLE, NOT A TEXTURE AND NOT GEOMETRY. The
 * corner radius is computed per pixel from the quad's own coordinate, so it is
 * exact at any size and at any distance from the eye — a rounded PNG would be
 * soft the moment you brought it close, and rounded geometry would need
 * tessellation to look like anything. It is the same trick the grid uses one
 * shader up, for the same reason. ⚠️ And it is why `xr-tablet.mjs` draws NO
 * rounded rectangle of its own: two roundings over one another show a seam at
 * every corner.
 *
 * 🔴 `uHas` IS WHAT SEPARATES "NO CONTENT" FROM "CONTENT THAT IS BLANK". With
 * no tablet module wired in, the slab is a slab; with one, its ink is composited
 * over the fill. A shader that sampled an unbound texture would read black-and-
 * opaque, which is a tablet whose screen has failed rather than one that has no
 * screen — and those need different fixes.
 *
 * ⚠️ THE FILL IS HELD NEAR-OPAQUE AND THAT IS A CONTRAST DECISION, NOT A MODE
 * ONE. Over passthrough this composites onto a lit room and in an opaque
 * session onto a dark one; the tempting fix is to brighten it in the first,
 * which would put the session mode into the controller interface. Making the
 * slab its own background instead means what is behind it stops mattering, so
 * one number serves both and there is nothing to branch on. It is still DARK —
 * a bright panel at arm's length is a lamp in your vision.
 */
const HOLD_VS = `#version 300 es
  in vec3 aPos;
  uniform mat4 uProj, uView, uModel;
  out vec2 vP;
  void main(){ vP = aPos.xy; gl_Position = uProj * uView * uModel * vec4(aPos, 1.0); }`;
const HOLD_FS = `#version 300 es
  precision highp float;
  in vec2 vP;
  uniform vec3 uCol; uniform float uAlpha; uniform float uAspect; uniform float uRadius;
  uniform sampler2D uTex; uniform float uHas;
  out vec4 o;
  float roundRect(vec2 p, vec2 half_, float r){
    vec2 q = abs(p) - half_ + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
  void main(){
    // into a space where one unit is one unit, so the radius is not stretched
    vec2 p = vec2(vP.x * uAspect, vP.y);
    float d = roundRect(p, vec2(0.5 * uAspect, 0.5), uRadius);
    // one pixel of feather, from the derivative — no magic number, and it is
    // right at every distance
    float w = fwidth(d);
    float a = 1.0 - smoothstep(-w, w, d);
    if (a <= 0.002) discard;
    // a hairline edge, so it reads as an object rather than as a smudge
    float edge = 1.0 - smoothstep(0.0, 0.004 + w, abs(d + 0.002));
    vec3 c = mix(uCol, vec3(0.62, 0.68, 0.78), edge * 0.55);
    // ⚠️ THE SAME WAY ROUND AS EVERY OTHER PANEL HERE. PANEL_VS in
    // xr-panel.mjs reads vUv = (aPos.x + 0.5, 0.5 - aPos.y), and xr-pick.mjs
    // hands back a u,v derived from that one line rather than from a second
    // opinion. Change it in one place and change it in all three.
    if (uHas > 0.5) {
      vec4 t = texture(uTex, vec2(vP.x + 0.5, 0.5 - vP.y));
      c = mix(c, t.rgb, t.a);
    }
    o = vec4(c, a * uAlpha); }`;

/**
 * The slab's look. Its SIZE lives in `xr-tablet.mjs` beside the texture that
 * has to fill it, because the two are one decision — pixels per degree — and
 * splitting them across two files is how they come to disagree.
 */
const HOLD = {
  // ⚠️ IN THE SHADER'S OWN UNITS, WHERE THE HALF-HEIGHT IS 0.5 — so this is a
  // corner radius of a quarter of the slab's height. It was 0.055, which is
  // 11% and reads as a rectangle somebody forgot to round; *"bit rounded rect"*
  // was the note from the headset. The rounding itself is the signed-distance
  // one already in HOLD_FS — exact at any size and at any distance from the
  // eye — so this is a constant moving, not a second way of drawing a corner.
  radius: 0.125,
  col: [0.09, 0.10, 0.12],
  alpha: TABLET.fillAlpha,
};

// 🔴 THE FLOOR IS BIGGER THAN THE FADE, WHICH IS MOST OF WHAT "DRAW A CORRECT
// FLOOR" MEANT. The dots fade out with distance so the surface does not end in
// a hard rectangle — but the square was 10 m across, half-span 5 m, against a
// fade that does not finish until 11 m. So the dots were still at roughly two
// thirds strength where the quad simply stopped, which is a hard edge 5 m in
// front of you: exactly the cage the fade exists to avoid, drawn by the fade's
// own constants disagreeing with the floor's. The span is DERIVED from the fade
// now rather than typed beside it, so the two cannot drift again.
const FADE_NEAR = 4.5, FADE_FAR = 11;
export const GRID = {
  span: FADE_FAR * 2,   // the floor square's side — half of it IS the fade's end
  // 🔴 12.5 cm, HALVED FROM 25. Reported from a Quest 3 as *"xr grids too
  // big"*: at a quarter of a metre the dots read as a coarse lattice you look
  // AT rather than as a surface you stand ON, which is the whole job. A metre
  // is eight dots now rather than four, and 0.125 still divides the 22 m floor
  // exactly (176 cells a side), so the pattern stays centred on the origin.
  // ⚠️ The count does not cost anything: the dots are a fragment shader over
  // ONE quad, so the work is per pixel and not per dot, and the sub-pixel fade
  // two lines down is what keeps a denser grid from turning into haze.
  cell: 0.125,
  dot: 0.007,           // dot radius — ONE size, see the note in the shader
  fadeNear: FADE_NEAR,  // metres from the eye where the dots start to go
  fadeFar: FADE_FAR,
};
// 🔴 WHITE, AND ONE WHITE. It was blue-white in VR, brighter blue-white in
// passthrough, and GREEN when the dots were on surfaces the headset had
// reported — that last one was a proof device, asked for in as many words
// ("make it another colour for me to believe"), and it has done its job: 11
// surfaces confirmed on a Quest 3 on 2026-09-13. A proof device that stays
// after it has proved its point is decoration with a story attached.
//
// ⚠️ AND ONE COLOUR IS THE POINT, NOT A SIMPLIFICATION OF IT. Two brightnesses
// chosen per session mode is the session mode reaching into the picture; the
// dots' strength is now the tablet's slider, which is a thing the person
// wearing the headset can answer for themselves in either mode. Where the grid
// IS drawn — your measured surfaces, or the one surface `local-floor`
// guarantees — is still said in words, in `describe()`, where a claim about
// your room belongs.
const GRID_COL = [1, 1, 1];

export const FADE_MS = 900;

/**
 * Ask for this ALONGSIDE the required features, never instead of them.
 *
 * 🔴 REAL ROOM DATA IS OPTIONAL AND IT MUST NOT GATE THE GRID. A headset whose
 * owner has never run Space Setup, or who refuses the permission, still gets a
 * floor to stand on — the page's own — and is TOLD that is what it is. Asking
 * for `plane-detection` in `requiredFeatures` would turn "I did not set my room
 * up" into "this page will not start", which is the same collapse as a blank
 * readout cell meaning both "we did not look" and "we looked and it was fine".
 */
export const ROOM_OPTIONAL_FEATURES = ['plane-detection'];

/**
 * The room, drawn.
 *
 * @param {WebGL2RenderingContext|null} gl  a context made with `alpha: true` —
 *        see xr-panel.mjs defect 2; with no alpha there is nothing to clear to
 *        zero and passthrough is replaced by black. May be null and handed over
 *        later with `attach()`: a page that only needs a context once somebody
 *        puts a headset on should not make one for every desktop visitor, and
 *        the document, the plane bookkeeping and the words about where the
 *        grid's floor came from are all answerable with no context at all.
 * @param {object} [o]
 * @param {(msg:string, kind?:string) => void} [o.log]  the page's own log
 * @param {(line:string) => void} [o.say]  a line that must survive entering a
 *        session — `shipNow`/`beacon`, never a batched shipper
 */
export function createXRRoom(gl = null, { log = () => {}, say = () => {} } = {}) {
  const compile = (t, src) => {
    const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const link = (vs, fs, names = ['aPos', 'aNrm']) => {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    // 🔴 BEFORE linkProgram, NOT AFTER — trap 2 at the top of this file.
    names.forEach((n, i) => gl.bindAttribLocation(p, i, n));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    p.__u = {};
    for (const n of ['uProj', 'uView', 'uModel', 'uT', 'uHue', 'uCol',
                     'uSize', 'uOrigin', 'uCell', 'uDot', 'uEye', 'uFade', 'uAlpha',
                     'uAspect', 'uRadius', 'uTex', 'uHas']) {
      const loc = gl.getUniformLocation(p, n);
      if (loc) p.__u[n.slice(1).toLowerCase()] = loc;
    }
    return p;
  };

  function unitCube() {
    // 6 faces, flat normals. Positions in -0.5..0.5 so `s` is an edge length.
    const P = [], N = [];
    const faces = [[[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[-1, 0, 0], [0, 1, 0], [0, 0, -1]],
                   [[0, 1, 0], [0, 0, 1], [1, 0, 0]], [[0, -1, 0], [0, 0, -1], [1, 0, 0]],
                   [[0, 0, 1], [0, 1, 0], [-1, 0, 0]], [[0, 0, -1], [0, 1, 0], [1, 0, 0]]];
    for (const [nrm, u, v] of faces) {
      const c = nrm.map((x) => x * 0.5);
      const q = [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]];
      for (const [a, b] of q) {
        P.push(c[0] + (u[0] * a + v[0] * b) * 0.5, c[1] + (u[1] * a + v[1] * b) * 0.5, c[2] + (u[2] * a + v[2] * b) * 0.5);
        N.push(...nrm);
      }
    }
    return mesh(P, N);
  }
  function unitQuad() {
    const P = [-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0];
    // A normal per vertex even though the grid does not read one: one VAO
    // convention across every program here means a program can be swapped in
    // without wondering which slots are live.
    return mesh(P, P.map((_, i) => (i % 3 === 2 ? 1 : 0)));
  }
  /**
   * A body of revolution round local Z, from `[[z, radius], ...]`.
   *
   * ⚠️ SMOOTH NORMALS, FROM THE PROFILE'S OWN SLOPE. A lathe with face normals
   * reads as a faceted barrel — which is the box problem again in a rounder
   * costume. The normal at a profile point is perpendicular to the segment
   * through its neighbours, swung round with the point: `(dz, -dr)` in the
   * half-plane, which needs no trigonometry and is exact at the caps where the
   * slope goes vertical.
   *
   * ⚠️ AND THE WINDING HAS TO COME OUT FRONT-FACING, because the room draws
   * with `CULL_FACE` on and `cullFace(BACK)` — a lathe wound the other way is
   * an object you see the INSIDE of, which reads as a hole in the controller
   * rather than as a winding bug. `z` DECREASES down the profile here (the butt
   * is at +z), so the ring order below is the one that comes out counter-
   * clockwise seen from outside.
   */
  function lathe(profile, seg = 24) {
    const ring = profile.map(([z, r], i) => {
      const a = profile[Math.max(0, i - 1)], b = profile[Math.min(profile.length - 1, i + 1)];
      const dz = b[0] - a[0], dr = b[1] - a[1];
      const l = Math.hypot(dz, dr) || 1;
      return { z, r, nr: dz / l, nz: -dr / l };
    });
    const P = [], N = [];
    const put = (k, ang) => {
      const c = Math.cos(ang), sn = Math.sin(ang);
      P.push(ring[k].r * c, ring[k].r * sn, ring[k].z);
      N.push(ring[k].nr * c, ring[k].nr * sn, ring[k].nz);
    };
    for (let i = 0; i < ring.length - 1; i++) {
      for (let sgm = 0; sgm < seg; sgm++) {
        const a0 = (sgm / seg) * 6.2831853, a1 = ((sgm + 1) / seg) * 6.2831853;
        put(i, a0); put(i, a1); put(i + 1, a0);
        put(i, a1); put(i + 1, a1); put(i + 1, a0);
      }
    }
    return mesh(P, N);
  }
  /** Positions, normals AND texture coordinates — slots 0, 1, 2. */
  function mesh3(P, N, T) {
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    for (const [data, loc, size] of [[P, 0, 3], [N, 1, 3], [T, 2, 2]]) {
      const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    }
    gl.bindVertexArray(null);
    return { vao, count: P.length / 3 };
  }
  function mesh(P, N) {
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    for (const [data, loc] of [[P, 0], [N, 1]]) {
      const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);
    }
    gl.bindVertexArray(null);
    return { vao, count: P.length / 3 };
  }

  let cur = null, incoming = null, fadeFrom = 0, gridProg = null, holdProg = null;
  // ── what is in your hands, handed over once a frame ──────────────────────
  // 🔴 THE ROOM DOES NOT DECIDE ANY OF THIS, IT ONLY DRAWS IT. Which hand
  // carries the tablet and which one points is `xr-hands.mjs`'s single decision,
  // taken from `handedness`; this file is the picture. Two places choosing a
  // hand is two places that can choose differently, and only one of them would
  // be the one somebody reads.
  let hands = [];          // [{ m, handedness }] — a stand-in per resolved grip
  let pointer = null;      // { m } — the ray that is drawn, from targetRaySpace
  let tabletM = null;      // where the tablet is hanging, or null
  let tablet = null;       // the tablet module, if this page wired one in
  let tabletHit = null;    // where the pointer meets it, taken from xr-hands
  let tabletTex = null, tabletUploaded = -1, tabletUploadMs = null;
  // 0..1, and it is the tablet's slider. Set once at session start through
  // `applyAll` so the dots start where the control says they are rather than at
  // a default that only agrees with the number by coincidence.
  let gridAlpha = 0.75;
  let cube = null, quad = null, standIn = null, ok = false;
  // ── the real controller models ──────────────────────────────────────────
  // `null` until asked for, then a promise, then `{ vao, count, tex, col }` or
  // `false` for "we asked and it would not come". Three states, not two: "we
  // have not looked" and "we looked and there is none" are different findings
  // and the footer prints different words for them.
  let modelProg = null;
  const models = new Map();            // profile|handedness -> entry
  let modelSaid = false;

  /** Hand the room a context. Idempotent, and it says whether it took. */
  function attach(context) {
    if (ok) return true;
    if (context) gl = context;
    if (!gl) return false;
    try {
      cur = { sky: link(ROOM_VS, SKY_FS), box: link(ROOM_VS, BOX_FS) };
      cube = unitCube(); quad = unitQuad();
      standIn = { body: lathe(BODY_PROFILE), stick: lathe(STICK_PROFILE, 14) };
      ok = true;
    } catch (e) { log(`the room would not compile — ${e.message}`, 'bad'); return false; }
    // ⚠️ THE GRID IS ALLOWED TO FAIL ON ITS OWN. It is the newest thing here
    // and the only one that needs `fwidth`; a driver that will not compile it
    // must cost the dots, never the room.
    // ⚠️ THE MODEL PROGRAM IS ALLOWED TO FAIL ON ITS OWN, like the grid. A
    // driver that will not compile it must cost the real controllers and fall
    // back to the stand-in, never the room.
    try { modelProg = link(MODEL_VS, MODEL_FS, ['aPos', 'aNrm', 'aUv']); }
    catch (e) {
      modelProg = null;
      log(`the controller models would not compile — ${e.message}`, 'warn');
      say(`FAIL controllers · the model shader would not compile — ${e.message}`);
    }
    try { holdProg = link(HOLD_VS, HOLD_FS, ['aPos']); }
    // ⚠️ `log`, NOT `onLog`. There is no `onLog` in this scope, so a failed
    // compile would have thrown a ReferenceError out of `attach` — a handler
    // for a failure that fails.
    // ⚠️ AND IT SAYS SO ON THE BEACON TOO. The tablet is the one thing here a
    // headset run is FOR, so "it would not compile" has to reach the log the
    // owner reads rather than only the page behind their face.
    catch (e) {
      holdProg = null;
      log(`the tablet would not compile — ${e.message}`, 'warn');
      say(`FAIL tablet · its shader would not compile — ${e.message}`);
    }
    try { gridProg = link(GRID_VS, GRID_FS, ['aPos']); }
    catch (e) { log(`the floor grid would not compile — ${e.message}`, 'warn'); }
    return true;
  }
  attach(gl);

  // ── where the grid goes ─────────────────────────────────────────────────
  // Each surface is one quad: its model matrix, the metres it spans, and the
  // origin its dots count from — so dots on a detected wall line up with that
  // wall's own corner rather than with a world axis that has nothing to do
  // with it.
  let floorY = 0;
  let ownRoom = [];
  /**
   * 🔴 A FLOOR, AND NOTHING ELSE. THE PAGE'S OWN WALLS ARE GONE.
   *
   * This used to build a 10 m square and four 3 m walls, and the walls were the
   * page inventing geometry it has no information about. A made-up wall at 5 m
   * is a CLAIM about where your room ends, and that claim is always wrong —
   * which is the same offence as colouring an unmeasured thing as if it had
   * passed. The floor is different in kind: the session is on `local-floor`, so
   * the origin IS the floor. It is the one surface the page actually knows
   * about, and knowing it is what the reference space is for.
   *
   * ⚠️ AND THERE IS NO SESSION MODE IN HERE, WHICH IS THE POINT. "Walls in
   * passthrough, none in VR" would have been a branch, and a branch on
   * `planes.state` would have been worse: `none` only arrives after the grace
   * period, so a passthrough session would have drawn walls for two and a half
   * seconds and then taken them away — a flash, caused by a verdict about the
   * headset's scan being read as a verdict about what to draw. The rule that
   * removes both is simpler than either: **draw what was measured, and one
   * floor besides.** Real walls still appear in passthrough the moment the
   * headset reports them, because those are surfaces somebody's room actually
   * has; they arrive through `planeQuads`, which replaces this list entirely.
   */
  function buildOwnRoom() {
    const { span } = GRID;
    // Local +X to world +X, local +Y to world +Z, local +Z to world +Y: a quad
    // lying flat, its dots counted from the room's own centre. Horizontal by
    // construction rather than by a rotation somebody has to check.
    const flat = new Float32Array([span, 0, 0, 0, 0, 0, span, 0, 0, 1, 0, 0, 0, floorY, 0, 1]);
    ownRoom = [{ m: flat, size: [span, span], origin: [0, 0] }];
  }
  buildOwnRoom();

  // ── your room, if this headset will say ─────────────────────────────────
  /**
   * 🔴 "NO PLANES" IS NEVER DRAWN AS "NO WALLS". Three different things look
   * identical from outside — the session was never granted the feature, the
   * feature is granted and the room has never been set up, and the room is set
   * up and we are standing in it — so each one gets its own words and its own
   * line in the log. A grid at the page's own floor that does not say it is the
   * page's own floor is a measurement claiming to be about your room.
   */
  // How long an AR session may keep answering "no surfaces" before that counts
  // as an answer. MEASURED: a Quest 3 took **200 ms** from session start to
  // handing over 11 surfaces; 2.5 s is an order of magnitude of headroom on the
  // one number anybody has. ⚠️ It is a floor on PATIENCE, not a timeout — the
  // room is still accepted whenever it turns up, including long after this.
  const EMPTY_GRACE_MS = 2500;

  const planes = {
    asked: false,        // did a session request `plane-detection`
    emptySince: 0,       // when the headset first answered "none" — see observePlanes
    opaque: null,        // is this a VR session — see markAsked, and `none` in describe
    // 🔴 SIX ANSWERS, NOT A BOOLEAN. `not asked` (no session yet), `waiting`
    // (asked, no frame has answered), `refused` (the session was never given
    // the feature), `unreadable` (it answered and we could not parse it),
    // `none` (granted, and your room has no surfaces in it — and ONLY after
    // `EMPTY_GRACE_MS`, because the first empty answer is not the final one),
    // `yours` (we are standing in a mapped room). A boolean would collapse at
    // least three
    // different findings — including "we did not look" and "we looked and
    // there is nothing" — into one word, which is the collapse this project
    // keeps paying for.
    state: 'not asked',
    why: '',             // the browser's own word for a refusal
    count: 0,
    labels: {},          // semanticLabel -> how many
    floorY: 0,
    from: 'the page',
    note: '',
    short: '',
  };
  let planeQuads = [];
  let saidKey = '', saidTimes = 0, planeFails = 0;

  function describe(quiet = false) {
    // ⚠️ THE WORDS ARE READ OFF THE SAME CONSTANT THE FLOOR IS BUILT FROM. A
    // description that can disagree with its config is worse than none, and
    // this one had exactly that shape: it said "with 3 m walls" for as long as
    // there were walls to say it about, and it would have gone on saying it.
    const own = `the page's own floor — a ${GRID.span} m square of dots at y=0, and no walls,`
      + ' because the floor is the one surface a headset standing on it can be sure of';
    if (planes.state === 'yours') {
      const bits = Object.entries(planes.labels).map(([k, v]) => `${k} ${v}`).join(' · ');
      const walls = planes.labels.wall || 0;
      planes.note = `${planes.count} surface(s) from your room — ${bits} — grid is on them, floor at y=${planes.floorY.toFixed(2)} m`
        + (walls ? ` · ${walls} of them are walls, and those are the only walls this page draws`
                 : ' · NO wall surfaces came back, so there are no dotted walls');
      planes.short = `floor: your room\n${planes.count} surfaces, ${walls} walls`;
      planes.from = 'your room';
    } else if (planes.state === 'none') {
      // 🔴 THIS MESSAGE BLAMED THE WRONG THING AND SENT SOMEBODY LOOKING AT
      // THEIR HEADSET SETTINGS. MEASURED on a Quest 3, 2026-09-13, minutes
      // apart on one machine:
      //
      //   immersive-ar   11 surface(s) — door 1 · ceiling 1 · wall 4 ·
      //                  window 1 · bed 1 · shelf 2 · floor 1
      //   immersive-vr   NO surfaces
      //
      // Same room, same grant, same scan. **Planes come in an AR session and
      // not in a VR one** — which makes sense, since an opaque session has no
      // room to composite against, but nothing said so and the old wording
      // asserted "Space Setup has probably never been run here" about a
      // headset whose Space Setup was fine. A guess presented as a diagnosis
      // is worse than no diagnosis: it cost a room rescan and a serious
      // suggestion of reinstalling the headset.
      //
      // So the note now says which session it is in, and only mentions Space
      // Setup where that is still a live possibility.
      planes.note = planes.opaque
        ? 'no surfaces, and this is a VR session — a headset composites nothing over your room here, '
          + `so it does not hand one over either. Try the XR button for passthrough. The grid is ${own}`
        : `your headset reported NO surfaces in a passthrough session — Space Setup may never have been run here. The grid is ${own}`;
      planes.short = planes.opaque
        ? 'floor: this page\nVR gives no surfaces'
        : 'floor: this page\nyour room reported none';
      planes.from = 'the page';
    } else if (planes.state === 'refused') {
      planes.note = `this session was not given surface detection (${planes.why}) — the grid is ${own}`;
      planes.short = 'floor: this page\nno surface detection';
      planes.from = 'the page';
    } else if (planes.state === 'unreadable') {
      // 🔴 A FOURTH ANSWER, BECAUSE THREE WAS NOT ENOUGH. The headset answered
      // and we could not read what it said — which is not "it said no" and is
      // certainly not "your room has no walls". Without this it read as "not
      // asked", i.e. as OUR failure to ask, and the next person would go
      // looking for the request that was in fact made.
      planes.note = `your headset answered about its surfaces and this page could not read the answer (${planes.why}) — the grid is ${own}`;
      planes.short = 'floor: this page\nanswer unreadable';
      planes.from = 'the page';
    } else if (planes.state === 'waiting') {
      planes.note = `your headset has been asked for its surfaces and has not answered yet — the grid is ${own}`;
      planes.short = 'floor: this page\nwaiting on an answer';
      planes.from = 'the page';
    } else {
      planes.note = `nothing has asked your headset for surfaces yet — the grid is ${own}`;
      planes.short = 'floor: this page\nnot asked yet';
      planes.from = 'the page';
    }
    const key = `${planes.state}|${planes.count}|${Object.keys(planes.labels).sort().join(',')}`;
    if (key === saidKey || saidTimes >= 8) return;
    saidKey = key;
    // ⚠️ THE FIRST DESCRIPTION IS SILENT. It is written before any session
    // exists, so announcing it would put "nothing has asked your headset for
    // surfaces yet" in the log of every laptop visitor — a line about a
    // measurement nobody requested, which is noise wearing a finding's clothes.
    if (quiet) return;
    saidTimes++;
    say(`room surfaces · ${planes.note}`);
    log(planes.note, planes.state === 'yours' ? 'ok' : 'warn');
  }
  describe(true);

  /**
   * Say that a session asked for `plane-detection`, so "we never asked" and
   * "we asked and were refused" stop being the same state. Called by whatever
   * opened the session, because only that code knows what it put in
   * `optionalFeatures`.
   */
  /**
   * @param opaque  true when the session composites OPAQUE — i.e. VR. It
   *   decides what "no surfaces" is allowed to blame, and that distinction
   *   was measured the expensive way: see the `none` branch in `describe`.
   *   ⚠️ Read off `environmentBlendMode`, never off the session's NAME — a
   *   session can be called `immersive-ar` and still composite opaque.
   */
  function markAsked(opaque) {
    planes.asked = true;
    if (opaque !== undefined) planes.opaque = !!opaque;
    if (planes.state === 'not asked') planes.state = 'waiting';
    describe();
  }

  /**
   * Once per FRAME, never per eye, and it cannot throw.
   *
   * ⚠️ `frame.detectedPlanes` THROWS on a session that was not granted
   * `plane-detection` — it is not `undefined`, it is an exception, and an
   * exception in a frame callback silently deletes every line below it. It is
   * asked behind a try, and after a refusal it is never asked again: retrying
   * 90 times a second to be told no is a cost with no information in it.
   */
  function observePlanes(frame, space) {
    if (!frame || planes.state === 'refused' || planeFails > 3) return;
    let set = null;
    try { set = frame.detectedPlanes; }
    catch (e) { planes.state = 'refused'; planes.why = `${e.name || 'refused'}`; describe(); return; }
    if (!set) { planes.state = 'refused'; planes.why = 'the browser reports no detectedPlanes at all'; describe(); return; }
    try {
      const quads = [], labels = {};
      let lowest = null;
      for (const plane of set) {
        if (quads.length >= 32) break;           // a room, not a point cloud
        const pose = frame.getPose(plane.planeSpace, space);
        if (!pose) continue;
        const poly = plane.polygon || [];
        if (poly.length < 3) continue;
        let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
        for (const p of poly) {
          x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x);
          z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z);
        }
        const w = x1 - x0, d = z1 - z0;
        if (!(w > 0.2 && d > 0.2)) continue;     // a sliver is not a surface
        const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
        // The plane's own space has the surface in its XZ, so the unit quad's
        // local +Y has to become the plane's +Z and its local +Z the normal.
        const L = new Float32Array([w, 0, 0, 0, 0, 0, d, 0, 0, 1, 0, 0, cx, 0, cz, 1]);
        quads.push({ m: mul(pose.transform.matrix, L), size: [w, d], origin: [cx, cz] });
        const label = plane.semanticLabel || plane.orientation || 'unlabelled';
        labels[label] = (labels[label] || 0) + 1;
        const y = pose.transform.position.y;
        if (plane.orientation === 'horizontal' && (lowest === null || y < lowest)) lowest = y;
        if (label === 'floor') lowest = y;
      }
      planeQuads = quads;
      planes.count = quads.length;
      planes.labels = labels;
      // 🔴 AN EMPTY SET ON THE FIRST FRAMES IS NOT AN ANSWER, AND CALLING IT
      // ONE MADE THIS PAGE BLAME SPACE SETUP FOR THE SECOND TIME. MEASURED on
      // a Quest 3, 2026-09-13, ONE passthrough session:
      //
      //   6.30 s   "your headset reported NO surfaces — Space Setup may never
      //            have been run here"
      //   6.50 s   11 surface(s) — shelf 2 · wall 4 · ceiling 1 · bed 1 ·
      //            floor 1 · window 1 · door 1
      //
      // 200 ms apart. The room was there the whole time; the headset simply had
      // not finished handing it over. The previous fix taught this message to
      // distinguish VR from AR — correctly — and left the assumption underneath
      // untouched: that the FIRST empty answer is the final one. A diagnosis
      // that is right about the mechanism and wrong about the timing reads
      // exactly like a diagnosis that is right, and this one cost a room rescan
      // and a serious suggestion of reinstalling the headset.
      //
      // ⚠️ The grace period is on the CLOCK, not on a frame count: a page that
      // is drawing slowly would otherwise wait longer in wall time for the same
      // verdict, and the thing being waited on is the headset's scan, which
      // does not care how fast we render.
      if (quads.length) { planes.state = 'yours'; planes.emptySince = 0; }
      else if (planes.state !== 'yours') {
        // stay in `waiting` until the headset has had its say
        planes.emptySince = planes.emptySince || performance.now();
        planes.state = (performance.now() - planes.emptySince) > EMPTY_GRACE_MS ? 'none' : 'waiting';
      }
      if (lowest !== null) { planes.floorY = lowest; if (floorY !== lowest) { floorY = lowest; buildOwnRoom(); } }
      describe();
    } catch (e) {
      // A malformed plane must not take the render loop with it — and it must
      // not leave the page saying "nothing asked", which is a claim about US
      // rather than about the answer that did arrive.
      planeFails++;
      if (planes.state === 'not asked') { planes.state = 'unreadable'; planes.why = e.message; describe(); }
      if (planeFails === 1) log(`could not read your room's surfaces — ${e.message}`, 'warn');
    }
  }

  // ── drawing ─────────────────────────────────────────────────────────────
  /** 0..1, eased, or null when nothing is arriving. */
  function fadeK() {
    if (!incoming) return null;
    const k = Math.min(1, (performance.now() - fadeFrom) / FADE_MS);
    return k * k * (3 - 2 * k);
  }
  /**
   * ⚠️ CONSTANT-ALPHA BLENDING, AND `LEQUAL` WITH IT. The old picture is
   * already in the framebuffer, so drawing the new one over it with
   * `blendColor(0,0,0,k)` gives new*k + old*(1-k) for nothing — and it needs no
   * third program and no extra targets.
   *
   * The depth function is the part that is easy to miss: the second pass is the
   * SAME geometry at the SAME depth, so the default `LESS` rejects every
   * fragment of it and the fade does nothing at all while looking wired up.
   */
  function fadeOn(k) {
    gl.enable(gl.BLEND);
    gl.blendColor(0, 0, 0, k);
    gl.blendFunc(gl.CONSTANT_ALPHA, gl.ONE_MINUS_CONSTANT_ALPHA);
    gl.depthFunc(gl.LEQUAL);
  }
  function fadeOff() {
    gl.disable(gl.BLEND);
    gl.depthFunc(gl.LESS);
  }

  let gridBroke = false;
  function drawGrid(proj, view, eye) {
    if (!gridProg || gridBroke) return;
    try {
      const U = gridProg.__u;
      gl.useProgram(gridProg);
      gl.uniformMatrix4fv(U.proj, false, proj);
      gl.uniformMatrix4fv(U.view, false, view);
      gl.uniform1f(U.cell, GRID.cell);
      gl.uniform1f(U.dot, GRID.dot);
      gl.uniform2f(U.fade, GRID.fadeNear, GRID.fadeFar);
      // 🔴 ONE COLOUR AND ONE STRENGTH, AND NEITHER OF THEM IS A FUNCTION OF THE
      // SESSION. `ar` used to be a parameter of this function purely so the dots
      // could be a different white in passthrough; it is gone, and with it the
      // last place the controller interface could have learned what kind of
      // session it was in. What the dots are ON is still a real difference and
      // it is one line below — the surfaces the headset measured, or the floor.
      gl.uniform3fv(U.col, GRID_COL);
      gl.uniform1f(U.alpha, gridAlpha);
      gl.uniform3fv(U.eye, eye || [0, 1.6, 0]);
      // ⚠️ SEPARATE ALPHA, because in passthrough the destination starts at
      // zero alpha and the compositor reads that channel to decide how much of
      // your real room to let through. `ONE, ONE_MINUS_SRC_ALPHA` accumulates
      // coverage there; the ordinary two-argument form would leave the dots
      // painted onto a still-transparent buffer.
      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      // A reference surface does not hide what is behind it, and depth written
      // by a transparent quad would do exactly that.
      gl.depthMask(false);
      // A wall is a wall from either side, and a detected plane's facing is the
      // runtime's business rather than ours.
      gl.disable(gl.CULL_FACE);
      gl.bindVertexArray(quad.vao);
      const surfaces = planeQuads.length ? planeQuads : ownRoom;
      for (const s of surfaces) {
        gl.uniformMatrix4fv(U.model, false, s.m);
        gl.uniform2f(U.size, s.size[0], s.size[1]);
        gl.uniform2f(U.origin, s.origin[0], s.origin[1]);
        gl.drawArrays(gl.TRIANGLES, 0, quad.count);
      }
      gl.bindVertexArray(null);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
      gl.enable(gl.CULL_FACE);
    } catch (e) {
      gridBroke = true;
      log(`the floor grid stopped drawing — ${e.message}`, 'warn');
    }
  }

  /**
   * One view of the room.
   *
   * @param {object} o
   * @param {Float32Array} o.proj
   * @param {Float32Array} o.view
   * @param {number} [o.tSec]     seconds, for the spin and the wall shader
   * @param {object} [o.doc]      the room document
   * @param {boolean} [o.clear]   🔴 ONLY THE FIRST VIEW MAY CLEAR COLOUR
   * @param {boolean} [o.ar]      passthrough: no walls, and clear to nothing
   * @param {number|null} [o.aimed]        index the ray is on
   * @param {{i:number,dist:number}|null} [o.held]
   * @param {{m:Float32Array}|null} [o.ray]
   * @param {number} [o.aimedDist]
   * @param {number[]} [o.eye]    where the viewer is, for the grid's fade
   * @param {boolean} [o.grid]
   * @param {(lit:boolean, aimed:boolean) => {lit:number, scale:number}} [o.touch]
   */
  function draw(o) {
    // 🔴 NOTHING THAT RUNS IN A FRAME CALLBACK MAY THROW. An uncaught error
    // there does not stop the loop — it silently removes every line below it,
    // which is how this project's own XR page lost its status panel and its
    // gl-error check for the whole life of the page, and how three headset runs
    // became indistinguishable from outside. If the room breaks, it stops being
    // the room and SAYS so; the page's panels, its way out and its dead-man's
    // switch all keep running.
    try { drawInner(o); }
    catch (e) {
      ok = false;
      log(`the room stopped drawing — ${e.message}`, 'bad');
      say(`FAIL the room threw while drawing — ${e.message}`);
    }
  }

  /**
   * The tablet, wherever `xr-hands.mjs` says it is hanging.
   *
   * ⚠️ NOT INSIDE THE OPAQUE PASS. It is transparent at its edges, so it is
   * drawn after the room or it blends against whatever happened to be in the
   * depth buffer. Depth TEST stays on — a tablet behind a cube should be behind
   * it — but depth WRITE goes off, or it punches a hole the second eye cannot
   * fill.
   *
   * ⚠️ AND CULLING GOES OFF. A screen has no back, and the room turns culling
   * ON because its own walls are a cube seen from the inside. A tablet you can
   * see the back of is a one-sided object; a tablet that VANISHES when the
   * controller is turned over reads as a tracking fault.
   */
  function drawTablet(proj, view) {
    if (!holdProg || !tabletM) return;
    const U = holdProg.__u;
    gl.useProgram(holdProg);
    gl.uniformMatrix4fv(U.proj, false, proj);
    gl.uniformMatrix4fv(U.view, false, view);
    gl.uniformMatrix4fv(U.model, false, tabletM);
    gl.uniform3fv(U.col, HOLD.col);
    gl.uniform1f(U.alpha, HOLD.alpha);
    if (U.aspect) gl.uniform1f(U.aspect, TABLET.w / TABLET.h);
    if (U.radius) gl.uniform1f(U.radius, HOLD.radius);
    if (U.has) gl.uniform1f(U.has, tabletTex ? 1 : 0);
    if (tabletTex && U.tex) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tabletTex);
      gl.uniform1i(U.tex, 0);
    }
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.disable(gl.CULL_FACE);
    gl.bindVertexArray(quad.vao);
    gl.drawArrays(gl.TRIANGLES, 0, quad.count);
    gl.bindVertexArray(null);
    gl.enable(gl.CULL_FACE);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }

  /**
   * The tablet's ink, on the card.
   *
   * ⚠️ ONCE PER FRAME AND ONLY WHEN IT CHANGED, which is the difference between
   * this and the panels in `xr-panel.mjs`. Those re-upload every frame ON
   * PURPOSE, because measuring that cost is what that page is for. This one is
   * a slider and a number: it changes when a thumb moves it and not otherwise,
   * so a version counter is the whole optimisation and the first upload's cost
   * is reported so that "it is free" stays a measurement rather than a belief.
   *
   * 🔴 CALLED ONCE PER FRAME, NEVER PER EYE. `texImage2D` between the left eye
   * and the right would show the two eyes two different instants.
   */
  function uploadTablet() {
    if (!tablet || !gl || !ok) return;
    const v = tablet.draw();
    if (v === tabletUploaded) return;
    const t0 = performance.now();
    if (!tabletTex) {
      tabletTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tabletTex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      // A canvas is already the way up a texture wants it; flipping here would
      // put the footer above the numbers.
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    } else {
      gl.bindTexture(gl.TEXTURE_2D, tabletTex);
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tablet.canvas);
    const cost = performance.now() - t0;
    if (tabletUploaded < 0) {
      tabletUploadMs = cost;
      say(`tablet · first upload ok · ${TABLET.px}x${TABLET.py} px · ${cost.toFixed(2)} ms of processor time`);
    }
    tabletUploaded = v;
  }

  function drawInner({ proj, view, tSec = 0, doc = null, clear = true, ar = false,
                       aimed = null, held = null, ray: rayIn = null, aimedDist = 0,
                       eye = null, grid = true, touch = null } = {}) {
    if (!ok) return;
    // ⚠️ THE POINTER COMES FROM `setInput` UNLESS A PAGE OVERRIDES IT. One
    // source of truth by default, and the override exists only because `scene`
    // still owns its own grab-and-move and hands the same ray back down.
    const ray = rayIn || pointer;
    gl.enable(gl.DEPTH_TEST);
    // 🔴 `gl.clear` IGNORES THE VIEWPORT — it clears the whole framebuffer.
    // Both eyes render into ONE framebuffer side by side, so clearing on the
    // second view wipes everything the first had just drawn. A viewport is not
    // a clip region, and `gl.scissor` is the thing that makes it one.
    if (clear) {
      // Transparent in passthrough: every pixel this page does not draw is a
      // pixel of your actual room.
      if (ar) gl.clearColor(0, 0, 0, 0);
      else gl.clearColor(0.02, 0.03, 0.045, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    } else {
      // Each eye still needs its OWN depth cleared, or the second eye tests
      // against the first eye's depths and drops most of the room.
      gl.enable(gl.SCISSOR_TEST);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.disable(gl.SCISSOR_TEST);
    }
    gl.bindVertexArray(cube.vao);

    // The walls: one big cube seen from the inside, so the front faces are the
    // ones pointing AWAY. Cull the other way round rather than turning culling
    // off — a room drawn with both faces writes depth from the near wall and
    // hides everything inside it.
    // ⚠️ NO WALLS IN PASSTHROUGH. The walls ARE the room in the other two
    // modes; in passthrough your own room is the room, and drawing a box around
    // you would be drawing over the thing you asked to see.
    let L;
    const hue = doc ? doc.hue : 0.5;
    if (!ar) {
      gl.useProgram(cur.sky);
      L = cur.sky.__u;
      gl.cullFace(gl.FRONT); gl.enable(gl.CULL_FACE);
      gl.uniformMatrix4fv(L.proj, false, proj);
      gl.uniformMatrix4fv(L.view, false, view);
      gl.uniformMatrix4fv(L.model, false, modelM(0, 2, 0, 26, 0, 0));
      gl.uniform1f(L.t, tSec); gl.uniform1f(L.hue, hue);
      gl.drawArrays(gl.TRIANGLES, 0, cube.count);
      const k = fadeK();
      if (k !== null) {
        const NL = incoming.sky.__u;
        gl.useProgram(incoming.sky);
        gl.uniformMatrix4fv(NL.proj, false, proj);
        gl.uniformMatrix4fv(NL.view, false, view);
        gl.uniformMatrix4fv(NL.model, false, modelM(0, 2, 0, 26, 0, 0));
        gl.uniform1f(NL.t, tSec); gl.uniform1f(NL.hue, hue);
        fadeOn(k);
        gl.drawArrays(gl.TRIANGLES, 0, cube.count);
        fadeOff();
      }
    }
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.useProgram(cur.box);
    L = cur.box.__u;
    gl.uniformMatrix4fv(L.proj, false, proj);
    gl.uniformMatrix4fv(L.view, false, view);
    const things = doc?.things || [];
    things.forEach((t, i) => {
      // The thing under the pointer, and the thing in your hand, are lit
      // differently — colour says WHAT IS HAPPENING to it, which is the same
      // rule every other page here follows about colour.
      // ONE LOOK, from the kit — see TOUCH in xr-panel.mjs. Brighter AND
      // slightly bigger, because in a headset brightness alone reads as "that
      // one is pale" rather than "that one is under your pointer".
      const tch = touch ? touch(held?.i === i, aimed === i) : { lit: 1, scale: 1 };
      gl.uniformMatrix4fv(L.model, false,
        modelM(t.x, t.y, t.z, t.s * tch.scale, t.rx, t.ry + tSec * t.spin));
      const c = hueRGB(t.c);
      gl.uniform3fv(L.col, [c[0] * tch.lit, c[1] * tch.lit, c[2] * tch.lit]);
      gl.drawArrays(gl.TRIANGLES, 0, cube.count);
    });
    const bk = fadeK();
    if (bk !== null) {
      const NB = incoming.box.__u;
      gl.useProgram(incoming.box);
      gl.uniformMatrix4fv(NB.proj, false, proj);
      gl.uniformMatrix4fv(NB.view, false, view);
      fadeOn(bk);
      things.forEach((t, i) => {
        gl.uniformMatrix4fv(NB.model, false, modelM(t.x, t.y, t.z, t.s, t.rx, t.ry + tSec * t.spin));
        const c = hueRGB(t.c);
        const lit = held?.i === i ? 1.8 : (aimed === i ? 1.35 : 1);
        gl.uniform3fv(NB.col, [c[0] * lit, c[1] * lit, c[2] * lit]);
        gl.drawArrays(gl.TRIANGLES, 0, cube.count);
      });
      fadeOff();
      gl.useProgram(cur.box);
      L = cur.box.__u;
    }

    // ⚠️ THE POINTER HAS TO BE VISIBLE OR THE ROOM IS UNUSABLE. Dragging worked
    // before this and still felt like guessing, because nothing showed where
    // you were aiming — reported from the headset, and it is the difference
    // between a control and a coincidence. A beam down the ray, and nothing at
    // the end of it: a marker there reads as a fourth object in the room, one
    // that follows you and cannot be picked up.
    // ⚠️ THE BEAM IS THE POINTER'S, AND IT IS THE SAME BEAM IN BOTH MODES.
    // `ray` is whatever `xr-hands.mjs` chose — the right hand's target ray
    // where there is one — and its LENGTH follows the same rule whatever kind
    // of session this is: to the thing it has hold of, else to the nearest
    // thing it is on, else to the tablet if it is on that, else a fixed 2.4 m.
    // 🔴 "IN PASSTHROUGH IT COULD END ON A REAL SURFACE" IS THE TEMPTING
    // EXCEPTION AND IT IS REFUSED. A beam that behaves one way over your room
    // and another in the dark is two pointers to learn; and the plane it would
    // stop on is one the page has only in one of the two modes, so the
    // behaviour would be a function of what was measured rather than of what
    // you did. One rule, both modes.
    // ⚠️ THE HIT IS THE ONE `xr-hands.mjs` ALREADY TOOK, NOT A SECOND ONE.
    // Computing it again here would be a second answer to "is the ray on the
    // tablet", and the beam could stop somewhere the slider does not think it
    // was pressed — two truths about one pointer, which is the shape of bug
    // nobody can see from inside a working-looking picture.
    if (ray) {
      const len = held ? held.dist : (tabletHit ? tabletHit.t : (aimedDist || 2.4));
      gl.uniformMatrix4fv(L.model, false, beamM(ray.m, len));
      gl.uniform3fv(L.col, held ? [1.0, 0.83, 0.0] : [0.42, 0.78, 0.76]);
      gl.drawArrays(gl.TRIANGLES, 0, cube.count);
    }

    // 🔴 ONE STAND-IN PER HAND THAT ACTUALLY RESOLVED, and "resolved" is the
    // point. MEASURED on a Quest 3: two sources appeared and the LEFT grip did
    // not resolve while the right did, in the same frame. A page that draws a
    // controller wherever it last saw one would leave a shape sitting in the
    // air; a page that draws only what the runtime answered for shows you
    // exactly what it knows, which is also the debugging instrument.
    //
    // ⚠️ IDENTICAL ON BOTH HANDS. They used to be two slightly different greys
    // for no reason anybody could read off the picture — colour in this project
    // says how something LANDED, and "this is the left one" is not that. Which
    // hand is which is answered by the tablet being on one of them.
    // 🔴 THE REAL MODEL WHERE THERE IS ONE, THE STAND-IN WHERE THERE IS NOT,
    // AND THE TABLET'S FOOTER SAYS WHICH. The model is fetched the first time a
    // controller with a known profile is seen and drawn from the frame it
    // lands; there is no waiting anywhere, so a session that starts before the
    // fetch finishes simply shows the stand-in for a moment. A headset
    // reporting a profile nobody has vendored keeps the stand-in for good, and
    // that is a supported outcome rather than a failure.
    const drawnWithModel = [];
    for (const h of hands) {
      if (!h || !h.m) continue;
      const hand = h.handedness === 'left' ? 'left' : 'right';
      const key = `${h.profile}|${hand}`;
      const known = MODEL_PROFILES[h.profile];
      if (known && !models.has(key)) loadModel(h.profile, hand);   // not awaited
      const M = known ? models.get(key) : false;
      if (M) { drawnWithModel.push({ h, M }); continue; }
      for (const p of GRIP_PARTS) {
        const g = standIn?.[p.mesh];
        if (!g) continue;
        gl.bindVertexArray(g.vao);
        gl.uniformMatrix4fv(L.model, false, partM(h.m, p));
        gl.uniform3fv(L.col, p.col);
        gl.drawArrays(gl.TRIANGLES, 0, g.count);
      }
    }
    gl.bindVertexArray(null);

    // ⚠️ THE MODELS RUN A DIFFERENT PROGRAM, SO THEY GO AFTER THE LOOP. Two
    // programs alternating once per controller is two `useProgram` calls per
    // hand for nothing; and the box program's uniforms are still needed below.
    if (modelProg && drawnWithModel.length) {
      const MU = modelProg.__u;
      gl.useProgram(modelProg);
      gl.uniformMatrix4fv(MU.proj, false, proj);
      gl.uniformMatrix4fv(MU.view, false, view);
      for (const { h, M } of drawnWithModel) {
        // 🔴 THE GRIP POSE, UNSCALED. The model is authored in metres about the
        // grip origin — that is what the input-profiles registry means by a
        // controller asset — so the model matrix IS the grip matrix. Scaling it
        // to "look right" would be correcting a pose that is already correct,
        // and it would be wrong the moment somebody held it up to a real one.
        gl.uniformMatrix4fv(MU.model, false, h.m);
        gl.uniform3fv(MU.col, M.col);
        gl.uniform1f(MU.has, M.tex ? 1 : 0);
        if (M.tex) {
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, M.tex);
          gl.uniform1i(MU.tex, 0);
        }
        gl.bindVertexArray(M.vao);
        gl.drawArrays(gl.TRIANGLES, 0, M.count);
      }
      gl.bindVertexArray(null);
      // back to the program the rest of this function is holding
      gl.useProgram(cur.box);
      L = cur.box.__u;
      gl.uniformMatrix4fv(L.proj, false, proj);
      gl.uniformMatrix4fv(L.view, false, view);
    }

    // Last, because these are transparent and have to blend over what is behind.
    if (grid) drawGrid(proj, view, eye);
    drawTablet(proj, view);
  }

  /**
   * A look on its way in.
   *
   * ⚠️ HELD, NOT SWAPPED. A shader changing between one frame and the next is a
   * hard cut, and a hard cut across your whole field of view is a great deal
   * more violent than the same cut in a browser pane. Throws if it will not
   * compile, and the picture keeps its own.
   */
  function applyLook({ sky, box } = {}) {
    if (!ok) throw new Error('the room has no graphics context yet');
    let s = null, b = null;
    try {
      s = link(ROOM_VS, sky || SKY_FS);
      b = link(ROOM_VS, box || BOX_FS);
    } catch (e) {
      if (s) gl.deleteProgram(s);
      if (b) gl.deleteProgram(b);
      throw e;
    }
    incoming = { sky: s, box: b };
    fadeFrom = performance.now();
    return incoming;
  }

  /**
   * Retire the outgoing look when its fade has finished. True on the frame it
   * happened, so the page can say so.
   *
   * ⚠️ CALLED OUTSIDE `draw`, NEVER INSIDE IT — `draw` runs once PER EYE, so
   * swapping there would replace the programs between the left eye and the
   * right and show two different looks in one frame.
   */
  function retire() {
    if (!ok || !incoming || performance.now() - fadeFrom < FADE_MS) return false;
    gl.deleteProgram(cur.sky); gl.deleteProgram(cur.box);
    cur = incoming; incoming = null;
    return true;
  }

  /**
   * Fetch, read and upload one controller model. Never awaited by anything the
   * picture depends on.
   *
   * 🔴 NOT IN THE ENTRY PATH, AND NOT EVEN NEAR IT. This repo has lost three
   * headset runs to things that take time between `requestSession` and the
   * first frame, and a 218 KB fetch is exactly that shape. It is started the
   * first time a controller with a known profile is SEEN — which is already
   * inside a running session, drawing at 90 fps — and until it lands the
   * stand-in draws. Nothing waits for it, nothing fails if it never arrives,
   * and every outcome has its own words.
   *
   * ⚠️ AND THE COSTS ARE MEASURED AND SHIPPED, because "it is free" should be a
   * number somebody can read back. Bytes, parse milliseconds, vertex count and
   * the texture decode all go into one line.
   */
  async function loadModel(profile, handedness) {
    const key = `${profile}|${handedness}`;
    if (models.has(key)) return models.get(key);
    models.set(key, null);                       // asked, not answered
    const url = `${MODEL_BASE}${profile}-${handedness}.glb`;
    const t0 = performance.now();
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status} from ${url}`);
      const buf = await res.arrayBuffer();
      const tFetch = performance.now() - t0;
      const t1 = performance.now();
      const m = readGLB(buf);
      const tParse = performance.now() - t1;
      const t2 = performance.now();
      let tex = null;
      if (m.image) {
        // 🔴 THE DECODE IS THE BROWSER'S, WHICH IS WHY IT IS NOT A COST. The
        // rejection this replaced listed "a PNG decode" among the work; it is
        // one `await` against a Blob and one upload. Said here because the
        // estimate was wrong in a way that made a decision look better than it
        // was — see the top of xr-glb.mjs.
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
      const entry = {
        ...mesh3(m.positions, m.normals, m.uvs),
        tex, col: [m.baseColor[0], m.baseColor[1], m.baseColor[2]], profile,
      };
      models.set(key, entry);
      const tGpu = performance.now() - t2;
      say(`controllers · ${profile} ${handedness} drawn from its real model`
        + ` · ${m.stats.bytes} bytes fetched in ${tFetch.toFixed(0)} ms`
        + ` · read in ${tParse.toFixed(1)} ms into ${m.count} vertices from ${m.stats.primitives} primitives`
        + ` · texture ${m.stats.imageBytes} bytes, decoded and uploaded in ${tGpu.toFixed(1)} ms`);
      if (!modelSaid) { modelSaid = true; log('your real controllers are being drawn, from their own models', 'ok'); }
      registerDrawnAs('the real controller models');
      return entry;
    } catch (e) {
      models.set(key, false);
      // ⚠️ REFUSED, NOT APPROXIMATED — and it is said in the one place you can
      // read it while wearing the thing.
      say(`FAIL controllers · ${profile} ${handedness} — ${e.message} · drawing the stand-in instead`);
      log(`no model for your controller (${e.message}) — drawing a stand-in`, 'warn');
      registerDrawnAs('a stand-in shape, not your real controller');
      return false;
    }
  }

  /**
   * Everything about the hands, from `xr-hands.mjs`, once a frame.
   *
   * ⚠️ GRIP FOR THE STAND-INS, TARGET RAY FOR THE POINTER, and the two are not
   * interchangeable. The ray is where you are POINTING and the grip is where
   * your HAND is; a controller drawn at the ray floats in front of you and a
   * tablet drawn there is unreachable. `plan-xr-hands` §1.4.
   *
   * 🔴 IT TAKES, IT DOES NOT DECIDE. Which hand carries the tablet, where the
   * tablet hangs and whether the ray is on it were all settled by the one
   * module that owns input. A second opinion here would be a second answer to
   * the same question, and only one of them would be the one anybody reads.
   */
  function setInput(h) {
    hands = Array.isArray(h?.hands) ? h.hands : [];
    pointer = h?.pointer || null;
    tabletM = h?.tabletM || null;
    tabletHit = h?.hit || null;
    uploadTablet();
  }

  /**
   * The tablet module whose canvas goes on the slab. Optional: a page with no
   * controls still gets the stand-ins, the beam and the floor.
   */
  function setTablet(t) {
    tablet = t || null;
    tabletUploaded = -1;
    if (tablet) say(`tablet · wired in · ${TABLET.fingerprint}`);
  }

  /**
   * How strongly the dots are drawn, 0..1 — the tablet's own slider, applied
   * through the control's `apply`. It is a setter rather than a read of the
   * tablet so that the room keeps working with no tablet at all, and so the
   * value arrives the same way any future control's would.
   */
  function setGrid({ alpha } = {}) {
    if (Number.isFinite(alpha)) gridAlpha = Math.max(0, Math.min(1, alpha));
  }

  const room = {
    attach, draw, applyLook, retire, observePlanes, markAsked,
    setInput, setTablet, setGrid, planes, grid: GRID, parts: GRIP_PARTS, tabletSize: TABLET,
  };
  // ⚠️ GETTERS, NOT COPIES. `look` is what a page compares before and after a
  // refused shader, and a field written once would answer about whichever
  // instant it was written in.
  Object.defineProperty(room, 'ok', { get: () => ok, enumerable: true });
  Object.defineProperty(room, 'look', { get: () => cur, enumerable: true });
  Object.defineProperty(room, 'incoming', { get: () => incoming, enumerable: true });
  Object.defineProperty(room, 'hasGrid', { get: () => !!gridProg && !gridBroke, enumerable: true });
  // What the grid is ACTUALLY drawn on this frame — your room's planes when
  // there are any, the page's own five quads when there are not. Exposed
  // because the snapping is code only a headset can reach, and a list a
  // harness can read is the difference between "it should work" and a number.
  Object.defineProperty(room, 'surfaces', { get: () => (planeQuads.length ? planeQuads : ownRoom), enumerable: true });
  // What the tablet cost to hand to the card, the FIRST time. Published rather
  // than logged only, because "it is free" should be a number somebody can read
  // back rather than a belief this file holds about itself.
  Object.defineProperty(room, 'tabletUploadMs', { get: () => tabletUploadMs, enumerable: true });
  Object.defineProperty(room, 'gridAlpha', { get: () => gridAlpha, enumerable: true });
  // 🔴 WHAT THE CONTROLLERS ARE ACTUALLY DRAWN FROM, as a word. Three answers,
  // not two: `not asked` (no controller has been seen), `model` (the real one),
  // `stand-in` (unknown profile, or the fetch failed). A boolean would collapse
  // "we have not looked" into "there is none", which is the collapse this
  // project keeps paying for.
  Object.defineProperty(room, 'controllers', {
    get: () => {
      if (!models.size) return 'not asked';
      const vals = [...models.values()];
      if (vals.some((v) => v && v !== true)) return 'model';
      if (vals.every((v) => v === false)) return 'stand-in';
      return 'loading';
    },
    enumerable: true,
  });
  // ⚠️ "THE FACE COMPILED", NOT "A TABLET IS ON SCREEN". Whether one is hanging
  // needs a hand in a headset; whether this driver would draw it is answerable
  // on a laptop, and it is the half that can silently fail — the shader gained
  // a sampler and a flag, and a page that cannot compile it loses the only
  // control it has in there.
  Object.defineProperty(room, 'hasTablet', { get: () => !!holdProg, enumerable: true });
  Object.defineProperty(room, 'tabletHanging', { get: () => !!tabletM, enumerable: true });
  return room;
}
