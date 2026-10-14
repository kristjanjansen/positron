// demo/shell/xr-room.mjs: the room `scene` builds from one seed, shared so a second page can stand in it.
// This file owns the picture (xr-panel.mjs owns the session). Only the first eye clears colour,
// bindAttribLocation goes before linkProgram, and nothing in draw or observePlanes may throw.
// why: lessons/kit-xr-room.md#header

import { world as world0 } from './seed.mjs';
import { createXRRay } from './xr-ray.mjs';
import { TABLET, registerStandIn } from './xr-tablet.mjs';
import { readGLB } from './xr-glb.mjs';

// Circumscribed sphere of a spinning cube (s * sqrt(3) / 2): the only bound that survives every rotation.
// Spacing is pure arithmetic on the seed: no clock, no Math.random, so a seed is always the same room.
// why: lessons/kit-xr-room.md#radius-of
export const radiusOf = (t) => t.s * 0.87;

/**
 * Half a cube's edge, for the box test: a sphere test reports flush bricks as overlapping.
 * @returns (overlapOf) {{ox, oy, oz} | null} depth into each other per axis, or null when clear.
 * why: lessons/kit-xr-room.md#half-of
 */
export const halfOf = (t) => t.s / 2;
// No gap by default: on a grid, bricks that touch are the product. Pass a gap where air is wanted.
// TOUCH_EPS (1 micrometre) keeps flush bricks from reading as overlapping by float error (5.5e-17).
// why: lessons/kit-xr-room.md#overlap-of
const TOUCH_EPS = 1e-6;
export function overlapOf(a, b, gap = 0) {
  const need = halfOf(a) + halfOf(b) + gap;
  const ox = need - Math.abs(a.x - b.x);
  if (ox <= TOUCH_EPS) return null;
  const oy = need - Math.abs(a.y - b.y);
  if (oy <= TOUCH_EPS) return null;
  const oz = need - Math.abs(a.z - b.z);
  if (oz <= TOUCH_EPS) return null;
  return { ox, oy, oz };
}

/** The axis two boxes are LEAST into each other on — the short way out, and the
 *  one that makes a brick land on top of another rather than beside it. */
export function leastAxis(o) {
  if (o.oy <= o.ox && o.oy <= o.oz) return 'y';
  return o.ox <= o.oz ? 'x' : 'z';
}
// 4 cm of air so two things read as two. Nothing in this file passes it (spaced() uses no gap);
// it stays because /blocks/ imports the name.
// why: lessons/kit-xr-room.md#gap
export const GAP = 0.04;
// Measured over 400 seeds: 11 passes at most, 342 settled in two. The cap only stops a pathological spin.
// why: lessons/kit-xr-room.md#spread-passes
export const SPREAD_PASSES = 24;
// Goes a dropped thing gets to walk out of a crowd. Over 123,027 drops: 8 left 146 overlapping, 48 leaves 3.
// 64 also leaves the same 3 (they oscillate, worst residue 0.064 m), so this is not a guarantee.
// why: lessons/kit-xr-room.md#drop-passes
export const DROP_PASSES = 48;
export const r4 = (v) => Math.round(v * 10000) / 10000;

/** The same room, with every thing pushed off every other thing. */
export function spaced(w) {
  const th = (w?.things || []).map((t) => ({ ...t }));
  for (let pass = 0; pass < SPREAD_PASSES; pass++) {
    let shifted = false;
    for (let i = 0; i < th.length; i++) for (let j = i + 1; j < th.length; j++) {
      const a = th[i], b = th[j];
      const o = overlapOf(a, b);
      if (!o) continue;
      // Push along the shortest axis, half each: pushing along the centre line slides bricks off the grid.
      // why: lessons/kit-xr-room.md#spaced-axis
      const ax = leastAxis(o);
      const need = o['o' + ax] / 2 + 1e-6;
      // Two centres in the same place have no side to be on. The direction
      // comes from the pair's own indices — a random one would be a different
      // room on every roll.
      const d = b[ax] - a[ax];
      const dir = Math.abs(d) < 1e-6 ? (Math.cos(i + j) >= 0 ? 1 : -1) : Math.sign(d);
      a[ax] -= dir * need; b[ax] += dir * need;
      shifted = true;
    }
    if (!shifted) break;
  }
  // Rounded the way the generator rounds — see seed.mjs. The document is
  // compared byte for byte, so it has to leave here canonical.
  return { ...w, things: th.map((t) => ({ ...t, x: r4(t.x), y: r4(t.y), z: r4(t.z) })) };
}

/**
 * A room from a seed, spaced. The separation lives here, not in the callers.
 * why: lessons/kit-xr-room.md#room-of
 */
export const roomOf = (seed) => spaced(world0(seed));

/**
 * How the things stand to one another: overlapping pairs, the deepest one, and the tightest gap.
 * `closest` is printed on a pass so the number that moves is visible.
 * why: lessons/kit-xr-room.md#clashes
 */
export function clashes(w) {
  const th = w?.things || [];
  let pairs = 0, deep = 0, closest = Infinity;
  for (let i = 0; i < th.length; i++) for (let j = i + 1; j < th.length; j++) {
    const a = th[i], b = th[j];
    const need = halfOf(a) + halfOf(b);
    // A box's gap is along the axis it is MOST separated on — that is the one
    // that keeps them apart, and the other two are free to overlap.
    const gap = Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z)) - need;
    if (gap < -1e-9) { pairs++; deep = Math.max(deep, -gap); }
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
 * A long thin box along a controller's ray, with rotation taken from the pose (modelM cannot do this).
 * why: lessons/kit-xr-room.md#beam-m
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
 * Primitives rather than the 433 KiB meta-quest-touch-plus glTF, which needs a texture path the room lacks.
 * Parts in metres, offset along the grip's -Z. Amber, a colour no controller is, says it is a stand-in.
 * why: lessons/kit-xr-room.md#stand-in
 */
export const STAND_IN_COL = [0.62, 0.49, 0.27];
export const GRIP_PARTS = [
  // The body: butt, tapering handle, and the wider rounded head the face plate
  // is on. `sy` flattens the circle into the oval a Touch controller actually
  // is — the profile is a body of revolution and the squash is one number.
  { name: 'body', mesh: 'body', sx: 1, sy: 0.88, sz: 1, at: 0, col: STAND_IN_COL },
  // The thumbstick, which is the only part that says WHICH WAY UP the thing is.
  { name: 'thumbstick', mesh: 'stick', sx: 1, sy: 1, sz: 1, at: 0.038,
    col: STAND_IN_COL.map((v) => Math.min(1, v * 1.45)) },
];
registerStandIn(GRIP_PARTS.length);

/**
 * Controller models live under /shell/ with the room; build.mjs refuses the build if one is missing,
 * and a runtime 404 draws the stand-in and says so. Keyed on the XRInputSource profile string.
 * why: lessons/kit-xr-room.md#model-base
 */
export const MODEL_BASE = '/shell/vendor/';
export const MODEL_PROFILES = { 'meta-quest-touch-plus': true };

/**
 * The stand-in's outline as [z, radius], lathed round the controller axis. No tracking ring (Quest 3 has none).
 * Metres, grip-local, -Z is the thumb's direction: the butt is at +z, the face plate at -z.
 * why: lessons/kit-xr-room.md#body-profile
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
 * One part of the stand-in at a grip pose, rotation from the pose (beamM's pattern).
 * The profiles are already in metres, so the scales only squash a circle into an oval.
 * why: lessons/kit-xr-room.md#part-m
 */
export const partM = (m, p) => new Float32Array([
  m[0] * p.sx, m[1] * p.sx, m[2] * p.sx, 0,
  m[4] * p.sy, m[5] * p.sy, m[6] * p.sy, 0,
  m[8] * p.sz, m[9] * p.sz, m[10] * p.sz, 0,
  // -Z is the thumb's direction, which is the way the top face looks
  m[12] - m[8] * p.at, m[13] - m[9] * p.at, m[14] - m[10] * p.at, 1]);

/**
 * How far along the controller its top is, measured off the real model: z -0.0498 .. +0.0735 m.
 * BODY_PROFILE uses the same bounds, so the tablet does not jump when the real model loads.
 * why: lessons/kit-xr-room.md#controller-top
 */
export const CONTROLLER_TOP = 0.0498;
/** Air between the tablet's lower edge and the top of the controller. */
export const TABLET_GAP = 0.008;

/**
 * How far the face leans back from square across the controller, in radians (20 degrees, like a watch).
 * Fixed to the controller and never following the head, so it is learned once with the wrist.
 * why: lessons/kit-xr-room.md#face-tilt
 */
export const FACE_TILT = 20 * Math.PI / 180;

/**
 * Tablet centre along the controller axis, derived: top + air + the leaned slab's lower reach.
 * xr-pick-test.mjs requires the resulting gap to be positive and small.
 * why: lessons/kit-xr-room.md#tablet-lift
 */
export const TABLET_LIFT = CONTROLLER_TOP + TABLET_GAP + (TABLET.h / 2) * Math.cos(FACE_TILT);

/**
 * The tablet standing on the controller's top face, turned a quarter about grip +X minus FACE_TILT.
 * Rotate the whole basis, never flip a sign: CULL_FACE makes a mirrored basis an invisible tablet.
 * No handedness term: it hangs off the plastic, not the hand. xr-pick-test.mjs asserts the sign.
 * why: lessons/kit-xr-room.md#hold-m
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

/**
 * A thing's `c` 0..1 to rgb, as grey: brightness is how the room marks aimed and held things.
 * why: lessons/kit-xr-room.md#shade-rgb
 */
export const shadeRGB = (c) => [c, c, c];

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

// A third program for glTF models (they carry TEXCOORD_0 and a base-colour map).
// Lambert from the room's light times the texture, deliberately not PBR: the room has no environment.
// why: lessons/kit-xr-room.md#model-vs
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

// A reference surface: dots fading with distance. fwidth is taken on the raw coordinate, since
// fract's discontinuity spikes the derivative into lines, and a sub-pixel dot fades rather than aliases.
// why: lessons/kit-xr-room.md#grid-vs
const GRID_VS = `#version 300 es
  in vec3 aPos;
  uniform mat4 uProj, uView, uModel;
  uniform vec2 uSize, uOrigin;
  out vec2 vM; out vec3 vW;
  void main(){
    vM = aPos.xy * uSize + uOrigin;
    vec4 w = uModel * vec4(aPos, 1.0); vW = w.xyz;
    gl_Position = uProj * uView * w; }`;
// Glow is one colour (the panel's average pixel) poured on the dotted surfaces with a gaussian falloff.
// It is not a light: nothing else is lit, nothing shadowed. Kept weak; uGlowFall.y is the amplitude.
// why: lessons/kit-xr-room.md#grid-fs-glow
const GRID_FS = `#version 300 es
  precision highp float;
  in vec2 vM; in vec3 vW;
  uniform vec3 uCol; uniform float uAlpha;
  uniform float uCell; uniform float uDot;
  uniform vec3 uEye; uniform vec2 uFade;
  // the fake light: its colour, where it is, and (radius, amplitude)
  uniform vec3 uGlowCol; uniform vec3 uGlowAt; uniform vec2 uGlowFall;
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
    // ⚠️ ONE DISTANCE FADE, SHARED. The dots and the pool both go out on the
    // same curve, so nothing this shader draws can survive to the edge of the
    // quad — which is the whole reason the floor's span is derived from the
    // fade's far distance rather than typed beside it.
    float far = 1.0 - smoothstep(uFade.x, uFade.y, distance(vW, uEye));
    a *= far;
    a *= clamp(uDot * 2.0 / w, 0.0, 1.0);
    a *= uAlpha;
    float g = 0.0;
    if (uGlowFall.y > 0.0) {
      float dg = distance(vW, uGlowAt) / max(uGlowFall.x, 1e-3);
      g = uGlowFall.y * exp(-dg * dg) * far;
    }
    // The dots take the picture's colour where the pool is strongest, and the
    // pool itself is a wash BETWEEN them.
    // ⚠️ LINEAR IN g, NOT SQUARED. Squared was the first version and it was
    // INVISIBLE — measured off a rendered frame: a panel hangs 1.6 m above the
    // floor, so even directly underneath the falloff has already taken a third
    // of the strength, and squaring what is left put the brightest point of the
    // pool at about 7 of 255. A fake nobody can see is not a subtle fake, it is
    // an absent one, and the comment above it was describing something that was
    // not happening.
    vec3 c = mix(uCol, uGlowCol, clamp(g * 2.0, 0.0, 1.0)) * (1.0 + g * 1.2);
    float pool = g * 0.8 * uAlpha;
    float aa = max(a, pool);
    if (aa < 0.02) discard;
    o = vec4(c, aa); }`;

/**
 * A dark slab with a signed-distance rounded rectangle (exact at any distance; xr-tablet.mjs draws none).
 * `uHas` separates no content from blank content. The fill is near-opaque so one value suits AR and VR.
 * why: lessons/kit-xr-room.md#hold-vs
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
 * The slab's look. Its size lives in xr-tablet.mjs beside the texture that fills it.
 * why: lessons/kit-xr-room.md#hold
 */
const HOLD = {
  // Shader units where the half-height is 0.5: a corner radius of a quarter of the slab's height.
  // why: lessons/kit-xr-room.md#hold-radius
  radius: 0.125,
  col: [0.09, 0.10, 0.12],
  alpha: TABLET.fillAlpha,
};

// The floor span is derived from the fade so the dots are gone before the quad ends (no hard edge).
// 11 m is where a 4 mm dot is under a pixel on a Quest 3. /blocks/ holds a soft wall at twice this half-span.
// why: lessons/kit-xr-room.md#fade
const FADE_NEAR = 4.5, FADE_FAR = 11;
export const GRID = {
  span: FADE_FAR * 2,   // the floor square's side — half of it IS the fade's end
  // 12.5 cm: eight dots a metre, and it divides the 22 m floor exactly (176 cells) so the grid stays centred.
  // Dots cost per pixel, not per dot (one quad).
  // why: lessons/kit-xr-room.md#grid-cell
  cell: 0.125,
  // 4 mm radius, 6.4% of the 12.5 cm cell, so the surface is marked without the marks being looked at.
  // why: lessons/kit-xr-room.md#grid-dot
  dot: 0.004,           // dot radius, ONE size, see the note in the shader
  /**
   * Starting dot strength, exported because xr-tablet.mjs's floor dots slider reads it.
   * why: lessons/kit-xr-room.md#grid-alpha
   */
  alpha: 0.525,
  fadeNear: FADE_NEAR,  // metres from the eye where the dots start to go
  fadeFar: FADE_FAR,
};
// One white in every session mode; strength is the tablet's slider, and where the grid is drawn is said
// in words by describe().
// why: lessons/kit-xr-room.md#grid-col
const GRID_COL = [1, 1, 1];

/**
 * No glow: amplitude zero, named once so both call sites agree.
 * why: lessons/kit-xr-room.md#glow-off
 */
const GLOW_OFF = { col: [1, 1, 1], at: [0, 0, 0], radius: 1, amp: 0 };

export const FADE_MS = 900;

/**
 * Which detected surfaces get dots: every vertical plane, the lowest horizontal one, and the ceiling.
 * Dotting furniture superimposes parallel dot fields (a doubled floor, unconfirmed on a headset).
 * Falls back to every plane when nothing is classified, never to none.
 * why: lessons/kit-xr-room.md#boundary-of
 */
export function boundaryOf(quads) {
  if (!quads.length) return quads;
  const vertical = quads.filter((q) => q.vertical);
  const flat = quads.filter((q) => !q.vertical);
  const named = (n) => flat.filter((q) => q.label === n);
  // The floor: the one the headset called a floor, else the lowest surface
  // there is. A room has exactly one, whatever is standing on it.
  const floorQ = named('floor')[0]
    || flat.reduce((lo, q) => (lo === null || q.y < lo.y ? q : lo), null);
  // The ceiling: only where it is named. Guessing the highest horizontal plane
  // would promote the top of a wardrobe, and a dotted wardrobe lid over your
  // head is the same superimposition in the other direction.
  const ceilQ = named('ceiling')[0] || null;
  const shell = [...vertical];
  for (const q of [floorQ, ceilQ]) if (q && !shell.includes(q)) shell.push(q);
  return shell.length ? shell : quads;
}

/**
 * The room's orientation in radians from measured walls, 0 with none: area-weighted circular mean of
 * normal angles folded by 4, so it lands in [-45, +45] degrees. A plane's normal is its pose's +Y.
 * why: lessons/kit-xr-room.md#wall-yaw
 */
export function wallYaw(quads) {
  let sx = 0, sy = 0;
  for (const q of quads) {
    if (!q.vertical || !q.n) continue;
    const a = Math.atan2(q.n[0], q.n[2]);
    const w = Math.max(0, (q.size?.[0] ?? 1) * (q.size?.[1] ?? 1));
    sx += w * Math.cos(4 * a);
    sy += w * Math.sin(4 * a);
  }
  if (Math.hypot(sx, sy) < 1e-9) return 0;
  return Math.atan2(sy, sx) / 4;
}

/**
 * Ask for this alongside the required features, never instead: plane detection must not gate the grid.
 * why: lessons/kit-xr-room.md#room-optional-features
 */
export const ROOM_OPTIONAL_FEATURES = ['plane-detection'];

/**
 * The room, drawn.
 * @param {WebGL2RenderingContext|null} gl  made with `alpha: true` (else passthrough goes black);
 *        may be null and handed over later with `attach()`.
 * @param {object} [o]
 * @param {(msg:string, kind?:string) => void} [o.log]  the page's own log
 * @param {(line:string) => void} [o.say]  a line that must survive entering a session (shipNow/beacon)
 * why: lessons/kit-xr-room.md#create-xr-room
 */
export function createXRRoom(gl = null, { log = () => {}, say = () => {} } = {}) {
  // the pointer ribbon, built the first time a ray is actually drawn. Lazy on
  // purpose: a page that never enters a session never compiles it.
  let beam = null;
  const compile = (t, src) => {
    const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const link = (vs, fs, names = ['aPos', 'aNrm']) => {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    // Before linkProgram, not after (see the file header).
    // why: lessons/kit-xr-room.md#link
    names.forEach((n, i) => gl.bindAttribLocation(p, i, n));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    p.__u = {};
    for (const n of ['uProj', 'uView', 'uModel', 'uT', 'uHue', 'uCol',
                     'uSize', 'uOrigin', 'uCell', 'uDot', 'uEye', 'uFade', 'uAlpha',
                     'uAspect', 'uRadius', 'uTex', 'uHas',
                     'uGlowCol', 'uGlowAt', 'uGlowFall']) {
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
   * A body of revolution round local Z from [[z, radius], ...], with smooth normals from the profile slope.
   * Wound counter-clockwise from outside: CULL_FACE would otherwise show the inside.
   * why: lessons/kit-xr-room.md#lathe
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
  // The room only draws hands; which hand carries the tablet and which points is xr-hands.mjs's decision.
  // why: lessons/kit-xr-room.md#hands
  let hands = [];          // [{ m, handedness }] — a stand-in per resolved grip
  let pointer = null;      // { m } — the ray that is drawn, from targetRaySpace
  let tabletM = null;      // where the tablet is hanging, or null
  let tablet = null;       // the tablet module, if this page wired one in
  let tabletHit = null;    // where the pointer meets it, taken from xr-hands
  let tabletTex = null, tabletUploaded = -1, tabletUploadMs = null;
  /**
   * 0..1, the tablet's slider, set at session start through applyAll. A default, not a ceiling.
   * why: lessons/kit-xr-room.md#grid-alpha-state
   */
  let gridAlpha = GRID.alpha;
  let cube = null, quad = null, standIn = null, ok = false;
  // null until asked, then a promise, then { vao, count, tex, col } or false (asked and it would not come).
  // why: lessons/kit-xr-room.md#model-state
  let modelProg = null;
  // One controller line per session, on success as well as failure. Reset by markAsked.
  // why: lessons/kit-xr-room.md#said-this-session
  let saidThisSession = false;
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
    } catch (e) { log(`the room would not compile: ${e.message}`, 'bad'); return false; }
    // The grid and model programs may fail on their own: they cost the dots or the real controllers,
    // never the room.
    // why: lessons/kit-xr-room.md#attach-fail
    try { modelProg = link(MODEL_VS, MODEL_FS, ['aPos', 'aNrm', 'aUv']); }
    catch (e) {
      modelProg = null;
      log(`the controller models would not compile: ${e.message}`, 'warn');
      say(`FAIL controllers · the model shader would not compile: ${e.message}`);
    }
    try { holdProg = link(HOLD_VS, HOLD_FS, ['aPos']); }
    // `log`, not `onLog` (not in scope). The failure also goes to the beacon so a headset run reports it.
    // why: lessons/kit-xr-room.md#attach-hold-fail
    catch (e) {
      holdProg = null;
      log(`the tablet would not compile: ${e.message}`, 'warn');
      say(`FAIL tablet · its shader would not compile: ${e.message}`);
    }
    try { gridProg = link(GRID_VS, GRID_FS, ['aPos']); }
    catch (e) { log(`the floor grid would not compile: ${e.message}`, 'warn'); }
    return true;
  }
  attach(gl);

  // Each surface is one quad: its model matrix, its span in metres, and the origin its dots count from.
  // why: lessons/kit-xr-room.md#grid-placement
  let floorY = 0;
  let ownRoom = [];
  /**
   * A floor and nothing else: on local-floor the origin is the floor, and made-up walls would be a claim.
   * No session-mode branch; measured planes replace this list entirely.
   * why: lessons/kit-xr-room.md#build-own-room
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

  // Not granted, not set up, and an empty room each get their own words. A Quest 3 took 200 ms to hand
  // over 11 surfaces; 2.5 s is a floor on patience, and a later room is still accepted.
  // why: lessons/kit-xr-room.md#empty-grace
  const EMPTY_GRACE_MS = 2500;

  const planes = {
    asked: false,        // did a session request `plane-detection`
    emptySince: 0,       // when the headset first answered "none" — see observePlanes
    opaque: null,        // is this a VR session — see markAsked, and `none` in describe
    // not asked, waiting, refused, unreadable, none (only after EMPTY_GRACE_MS) or yours. Not a boolean.
    // why: lessons/kit-xr-room.md#planes-state
    state: 'not asked',
    why: '',             // the browser's own word for a refusal
    count: 0,            // how many surfaces the headset reported
    // How many surfaces get dots, separate from how many were reported. See boundaryOf.
    // why: lessons/kit-xr-room.md#planes-dotted
    dotted: 0,
    labels: {},          // semanticLabel -> how many
    floorY: 0,
    // Radians; 0 also means no walls were measured, so check count or labels.wall. See wallYaw.
    // why: lessons/kit-xr-room.md#planes-yaw
    yaw: 0,
    from: 'the page',
    note: '',
    short: '',
  };
  let planeQuads = [];
  // The subset of planeQuads that gets dots (boundaryOf), kept beside the full list.
  // why: lessons/kit-xr-room.md#plane-shell
  let planeShell = [];
  let saidKey = '', saidTimes = 0, planeFails = 0;
  function describe(quiet = false) {
    // The words are read off the constant the floor is built from, so they cannot disagree.
    // why: lessons/kit-xr-room.md#describe-own
    const own = `the page's own floor: a ${GRID.span} m square of dots at y=0, and no walls,`
      + ' because the floor is the one surface a headset standing on it can be sure of';
    if (planes.state === 'yours') {
      const bits = Object.entries(planes.labels).map(([k, v]) => `${k} ${v}`).join(', ');
      const walls = planes.labels.wall || 0;
      // This string reaches a page's log box: separate sentences, no middots.
      // why: lessons/kit-xr-room.md#describe-yours
      planes.note = `${planes.count} surface(s) from your room, ${bits}.`
        + ` The dots are on ${planes.dotted} of them: every wall, the floor and the ceiling, and nothing standing on the floor,`
        + ` floor at y=${planes.floorY.toFixed(2)} m.`
        + (walls ? ` ${walls} of them are walls, and those are the only walls this page draws.`
                 : ' NO wall surfaces came back, so there are no dotted walls.');
      planes.short = `floor: your room\n${planes.dotted} of ${planes.count} dotted`;
      planes.from = 'your room';
    } else if (planes.state === 'none') {
      // Planes arrive in an AR session and not in a VR one (measured on a Quest 3, 11 against none),
      // so the note names the session mode and only mentions Space Setup where it is still possible.
      // why: lessons/kit-xr-room.md#describe-none
      planes.note = planes.opaque
        ? 'no surfaces, and this is a VR session. A headset composites nothing over your room here, '
          + `so it does not hand one over either. Try the XR button for passthrough. The grid is ${own}`
        : `your headset reported NO surfaces in a passthrough session. Space Setup may never have been run here. The grid is ${own}`;
      planes.short = planes.opaque
        ? 'floor: this page\nVR gives no surfaces'
        : 'floor: this page\nyour room reported none';
      planes.from = 'the page';
    } else if (planes.state === 'refused') {
      planes.note = `this session was not given surface detection (${planes.why}). The grid is ${own}`;
      planes.short = 'floor: this page\nno surface detection';
      planes.from = 'the page';
    } else if (planes.state === 'unreadable') {
      // The headset answered and we could not parse it: neither no, nor not asked.
      // why: lessons/kit-xr-room.md#describe-unreadable
      planes.note = `your headset answered about its surfaces and this page could not read the answer (${planes.why}). The grid is ${own}`;
      planes.short = 'floor: this page\nanswer unreadable';
      planes.from = 'the page';
    } else if (planes.state === 'waiting') {
      planes.note = `your headset has been asked for its surfaces and has not answered yet. The grid is ${own}`;
      planes.short = 'floor: this page\nwaiting on an answer';
      planes.from = 'the page';
    } else {
      planes.note = `nothing has asked your headset for surfaces yet. The grid is ${own}`;
      planes.short = 'floor: this page\nnot asked yet';
      planes.from = 'the page';
    }
    const key = `${planes.state}|${planes.count}|${planes.dotted}|${Object.keys(planes.labels).sort().join(',')}`;
    if (key === saidKey || saidTimes >= 8) return;
    saidKey = key;
    // The first description is written before any session, so it is not logged.
    // why: lessons/kit-xr-room.md#describe-quiet
    if (quiet) return;
    saidTimes++;
    say(`room surfaces · ${planes.note}`);
    log(planes.note, planes.state === 'yours' ? 'ok' : 'warn');
  }
  describe(true);

  /**
   * Say a session asked for plane-detection, so never asked and refused differ. Called by the session opener.
   * @param opaque  true when the session composites opaque (VR), read off environmentBlendMode, not the name.
   * why: lessons/kit-xr-room.md#mark-asked
   */
  function markAsked(opaque) {
    saidThisSession = false;          // a new session gets its own controller line
    planes.asked = true;
    if (opaque !== undefined) planes.opaque = !!opaque;
    if (planes.state === 'not asked') planes.state = 'waiting';
    describe();
  }

  /**
   * Once per frame, never per eye, and it cannot throw. frame.detectedPlanes throws without the
   * feature, so it is asked behind a try and never again after a refusal.
   * why: lessons/kit-xr-room.md#observe-planes
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
        const label = plane.semanticLabel || plane.orientation || 'unlabelled';
        const y = pose.transform.position.y;
        // orientation can be missing; then the pose's up (column 1) classifies the plane,
        // so an unlabelled wall does not compete to be the floor.
        // why: lessons/kit-xr-room.md#plane-orientation
        const pm = pose.transform.matrix;
        const upY = pm[5];
        const vertical = plane.orientation
          ? plane.orientation === 'vertical'
          : Math.abs(upY) < 0.5;
        quads.push({ m: mul(pm, L), size: [w, d], origin: [cx, cz], label, y, vertical,
          // The plane's own +Y in world, which is its normal — see `wallYaw`.
          n: [pm[4], pm[5], pm[6]] });
        labels[label] = (labels[label] || 0) + 1;
        if (!vertical && (lowest === null || y < lowest)) lowest = y;
        if (label === 'floor') lowest = y;
      }
      planeQuads = quads;
      // Dots go on the room's shell, not on everything seen. See boundaryOf.
      // why: lessons/kit-xr-room.md#plane-shell-set
      planeShell = boundaryOf(quads);
      planes.count = quads.length;
      planes.dotted = planeShell.length;
      // Which way round the room is, for pages lining square things up with the walls. See wallYaw.
      // why: lessons/kit-xr-room.md#plane-yaw-set
      planes.yaw = wallYaw(quads);
      planes.labels = labels;
      // An empty set on the first frames is not an answer: a Quest 3 reported none, then 11 surfaces 200 ms later.
      // The grace period runs on the clock, not frames, because the headset's scan ignores our frame rate.
      // why: lessons/kit-xr-room.md#plane-empty
      if (quads.length) { planes.state = 'yours'; planes.emptySince = 0; }
      else if (planes.state !== 'yours') {
        // stay in `waiting` until the headset has had its say
        planes.emptySince = planes.emptySince || performance.now();
        planes.state = (performance.now() - planes.emptySince) > EMPTY_GRACE_MS ? 'none' : 'waiting';
      }
      if (lowest !== null) { planes.floorY = lowest; if (floorY !== lowest) { floorY = lowest; buildOwnRoom(); } }
      describe();
    } catch (e) {
      // A malformed plane must not take the render loop with it, and reads unreadable, not not asked.
      // why: lessons/kit-xr-room.md#plane-malformed
      planeFails++;
      if (planes.state === 'not asked') { planes.state = 'unreadable'; planes.why = e.message; describe(); }
      if (planeFails === 1) log(`could not read your room's surfaces: ${e.message}`, 'warn');
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
   * Constant-alpha blending (new*k + old*(1-k)) with depth LEQUAL: the second pass is the same geometry
   * at the same depth, and LESS would reject all of it.
   * why: lessons/kit-xr-room.md#fade-on
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
  function drawGrid(proj, view, eye, glow) {
    if (!gridProg || gridBroke) return;
    try {
      const U = gridProg.__u;
      gl.useProgram(gridProg);
      gl.uniformMatrix4fv(U.proj, false, proj);
      gl.uniformMatrix4fv(U.view, false, view);
      gl.uniform1f(U.cell, GRID.cell);
      gl.uniform1f(U.dot, GRID.dot);
      gl.uniform2f(U.fade, GRID.fadeNear, GRID.fadeFar);
      // The fake panel light (see GRID_FS). Amplitude 0 means no glow.
      // why: lessons/kit-xr-room.md#draw-glow
      gl.uniform3fv(U.glowcol, glow?.col || GLOW_OFF.col);
      gl.uniform3fv(U.glowat, glow?.at || GLOW_OFF.at);
      gl.uniform2f(U.glowfall, glow?.radius ?? GLOW_OFF.radius,
                   glow ? Math.max(0, Math.min(0.5, glow.amp ?? 0)) : 0);
      // One colour and one strength, neither a function of the session mode.
      // why: lessons/kit-xr-room.md#draw-grid-col
      gl.uniform3fv(U.col, GRID_COL);
      gl.uniform1f(U.alpha, gridAlpha);
      gl.uniform3fv(U.eye, eye || [0, 1.6, 0]);
      // Separate alpha: in passthrough the compositor reads destination alpha to decide how much room shows,
      // so ONE, ONE_MINUS_SRC_ALPHA accumulates coverage there.
      // why: lessons/kit-xr-room.md#draw-grid-blend
      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      // A reference surface does not hide what is behind it, and depth written
      // by a transparent quad would do exactly that.
      gl.depthMask(false);
      // A wall is a wall from either side, and a detected plane's facing is the
      // runtime's business rather than ours.
      gl.disable(gl.CULL_FACE);
      gl.bindVertexArray(quad.vao);
      // The room's measured shell where there is one, else the page's own floor. See boundaryOf.
      // why: lessons/kit-xr-room.md#draw-grid-surfaces
      const surfaces = planeShell.length ? planeShell : ownRoom;
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
      log(`the floor grid stopped drawing: ${e.message}`, 'warn');
    }
  }

  /**
   * One view of the room.
   * @param {object} o
   * @param {Float32Array} o.proj
   * @param {Float32Array} o.view
   * @param {number} [o.tSec]     seconds, for the spin and the wall shader
   * @param {object} [o.doc]      the room document
   * @param {boolean} [o.clear]   only the first view may clear colour
   * @param {boolean} [o.ar]      passthrough: no walls, and clear to nothing
   * @param {number|null} [o.aimed]        index the ray is on
   * @param {{i:number,dist:number}|null} [o.held]
   * @param {{m:Float32Array}|null} [o.ray]
   * @param {number} [o.aimedDist]
   * @param {number[]} [o.eye]    where the viewer is, for the grid's fade
   * @param {boolean} [o.grid]
   * @param {(lit:boolean, aimed:boolean) => {lit:number, scale:number}} [o.touch]
   * why: lessons/kit-xr-room.md#draw
   */
  function draw(o) {
    // An error in a frame callback silently removes everything below it, so the room catches and says so
    // while the page's panels and way out keep running.
    // why: lessons/kit-xr-room.md#draw-no-throw
    try { drawInner(o); }
    catch (e) {
      ok = false;
      log(`the room stopped drawing: ${e.message}`, 'bad');
      say(`FAIL the room threw while drawing: ${e.message}`);
    }
  }

  /**
   * Drawn after the opaque pass with depth test on and depth write off, and with culling off:
   * a tablet that vanishes when the controller turns over reads as a tracking fault.
   * why: lessons/kit-xr-room.md#draw-tablet
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
   * The tablet's ink, uploaded once per frame (never per eye) and only when its version changed.
   * The first upload's cost is published as tabletUploadMs.
   * why: lessons/kit-xr-room.md#upload-tablet
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
                       eye = null, grid = true, touch = null,
                       /**
                        * Radians added to every thing, default 0: one angle for all, so boxes line up with the walls (planes.yaw).
                        * why: lessons/kit-xr-room.md#draw-yaw
                        */
                       yaw = 0,
                       sky = true, bg = null, glow = null } = {}) {
    if (!ok) return;
    // The pointer comes from setInput unless a page passes one (scene still owns its own grab).
    // why: lessons/kit-xr-room.md#draw-ray
    const ray = rayIn || pointer;
    gl.enable(gl.DEPTH_TEST);
    // gl.clear ignores the viewport and both eyes share one framebuffer; gl.scissor makes it a clip region.
    // why: lessons/kit-xr-room.md#draw-clear
    if (clear) {
      // Transparent in passthrough. With no sky this colour is the room, so a page may choose it with `bg`.
      // why: lessons/kit-xr-room.md#draw-clear-colour
      if (ar) gl.clearColor(0, 0, 0, 0);
      else if (bg) gl.clearColor(bg[0], bg[1], bg[2], 1);
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

    // The walls are one cube seen from inside, so cull front faces rather than turning culling off.
    // None in passthrough, and `sky: false` turns them off in VR too, leaving nothing behind the floor.
    // why: lessons/kit-xr-room.md#draw-walls
    let L;
    const hue = doc ? doc.hue : 0.5;
    if (!ar && sky) {
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
      // Aimed and held things are brighter and slightly bigger (TOUCH in xr-panel.mjs): brightness alone reads as pale.
      // why: lessons/kit-xr-room.md#draw-touch
      const tch = touch ? touch(held?.i === i, aimed === i) : { lit: 1, scale: 1 };
      gl.uniformMatrix4fv(L.model, false,
        modelM(t.x, t.y, t.z, t.s * tch.scale, t.rx, t.ry + yaw + tSec * t.spin));
      const c = shadeRGB(t.c);
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
        gl.uniformMatrix4fv(NB.model, false, modelM(t.x, t.y, t.z, t.s, t.rx, t.ry + yaw + tSec * t.spin));
        const c = shadeRGB(t.c);
        const lit = held?.i === i ? 1.8 : (aimed === i ? 1.35 : 1);
        gl.uniform3fv(NB.col, [c[0] * lit, c[1] * lit, c[2] * lit]);
        gl.drawArrays(gl.TRIANGLES, 0, cube.count);
      });
      fadeOff();
      gl.useProgram(cur.box);
      L = cur.box.__u;
    }

    // The beam (xr-ray.mjs's ribbon) runs to the held thing, else the aimed thing, else the tablet, else 2.4 m,
    // the same rule in every mode. The tablet hit is xr-hands.mjs's, never a second one.
    // It takes the per-eye `view` matrix, not `eye`: the eyes are 64 mm apart.
    // why: lessons/kit-xr-room.md#draw-beam
    if (ray) {
      const len = held ? held.dist : (tabletHit ? tabletHit.t : (aimedDist || 2.4));
      beam = beam || createXRRay(gl);
      beam.draw({
        vp: mul(proj, view), view,
        pose: ray.m, len, held: !!held,
      });
      // Put the box program back: the ribbon has its own program and VAO.
      // why: lessons/kit-xr-room.md#draw-beam-restore
      gl.useProgram(cur.box);
      gl.bindVertexArray(cube.vao);
    }

    // One controller per hand that resolved this frame (a Quest 3 can resolve one grip and not the other).
    // Same on both hands. The real model where loaded, the stand-in otherwise, never waiting.
    // why: lessons/kit-xr-room.md#draw-controllers
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

    // The models use a different program, so they are drawn after the loop.
    // why: lessons/kit-xr-room.md#draw-models
    if (modelProg && drawnWithModel.length) {
      const MU = modelProg.__u;
      gl.useProgram(modelProg);
      gl.uniformMatrix4fv(MU.proj, false, proj);
      gl.uniformMatrix4fv(MU.view, false, view);
      for (const { h, M } of drawnWithModel) {
        // The grip pose unscaled: the model is authored in metres about the grip origin.
        // why: lessons/kit-xr-room.md#draw-model-pose
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
    if (grid) drawGrid(proj, view, eye, glow);
    drawTablet(proj, view);
  }

  /**
   * A look on its way in, faded in rather than swapped. Throws if it will not compile, keeping the old one.
   * why: lessons/kit-xr-room.md#apply-look
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
   * Retire the outgoing look once its fade is over; true on that frame. Call outside draw (draw runs per eye).
   * why: lessons/kit-xr-room.md#retire
   */
  function retire() {
    if (!ok || !incoming || performance.now() - fadeFrom < FADE_MS) return false;
    gl.deleteProgram(cur.sky); gl.deleteProgram(cur.box);
    cur = incoming; incoming = null;
    return true;
  }

  /**
   * Fetch, read and upload one controller model, started the first time a known profile is seen.
   * Nothing waits on it; the stand-in draws until it lands. Bytes, parse ms, vertices and decode are logged.
   * why: lessons/kit-xr-room.md#load-model
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
        // The PNG decode is the browser's (createImageBitmap), so it costs one await and one upload.
        // why: lessons/kit-xr-room.md#load-model-decode
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
      say(`controllers · ${profile} ${handedness} loaded from its real model`
        + ` · ${m.stats.bytes} bytes fetched in ${tFetch.toFixed(0)} ms`
        + ` · read in ${tParse.toFixed(1)} ms into ${m.count} vertices from ${m.stats.primitives} primitives`
        + ` · texture ${m.stats.imageBytes} bytes, decoded and uploaded in ${tGpu.toFixed(1)} ms`);
      // Says what loaded, not what is drawn: this file cannot see whether anything draws it.
      // why: lessons/kit-xr-room.md#load-model-said
      if (!modelSaid) { modelSaid = true; log('your controller\u2019s own model loaded, ready to be drawn', 'ok'); }
      return entry;
    } catch (e) {
      models.set(key, false);
      // Refused, not approximated, and said on the beacon a headset wearer can read.
      // why: lessons/kit-xr-room.md#load-model-refused
      say(`FAIL controllers · ${profile} ${handedness}: ${e.message} · drawing the stand-in instead`);
      log(`no model for your controller (${e.message}) · drawing a stand-in`, 'warn');
      return false;
    }
  }

  /**
   * Everything about the hands from xr-hands.mjs, once a frame: grip for the controllers, target ray
   * for the pointer. It takes these decisions, it does not make them.
   * why: lessons/kit-xr-room.md#set-input
   */
  function setInput(h) {
    hands = Array.isArray(h?.hands) ? h.hands : [];
    pointer = h?.pointer || null;
    tabletM = h?.tabletM || null;
    tabletHit = h?.hit || null;
    uploadTablet();
    // Say once per session, when settled, what the controllers are drawn from, whichever way it went.
    // why: lessons/kit-xr-room.md#set-input-said
    if (!saidThisSession && hands.length) {
      const w = room.controllers;
      if (w === 'model' || w === 'stand-in') {
        saidThisSession = true;
        say(`controllers · this session is drawing ${w === 'model'
          ? 'your REAL controller models'
          : 'the amber STAND-IN (no model for this profile, or it would not load)'}`
          + ` · ${hands.map((h) => `${h.handedness}:${h.profile}`).join(' | ')}`);
      }
    }
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
   * Dot strength 0..1, the tablet's slider applied through the control's `apply`, so no tablet is needed.
   * why: lessons/kit-xr-room.md#set-grid
   */
  function setGrid({ alpha } = {}) {
    if (Number.isFinite(alpha)) gridAlpha = Math.max(0, Math.min(1, alpha));
  }

  /**
   * Fetch, read and upload a controller model without drawing one (the scenes draw no controllers),
   * so the load path is still graded on real hardware. room.controllers answers for it.
   * why: lessons/kit-xr-room.md#warm-model
   */
  const warmModel = (profile, handedness = 'left') => loadModel(profile, handedness);

  const room = {
    attach, draw, applyLook, retire, observePlanes, markAsked, warmModel,
    setInput, setTablet, setGrid, planes, grid: GRID, parts: GRIP_PARTS, tabletSize: TABLET,
  };
  // Getters, not copies: `look` is compared before and after a refused shader.
  // why: lessons/kit-xr-room.md#getters
  Object.defineProperty(room, 'ok', { get: () => ok, enumerable: true });
  Object.defineProperty(room, 'look', { get: () => cur, enumerable: true });
  Object.defineProperty(room, 'incoming', { get: () => incoming, enumerable: true });
  Object.defineProperty(room, 'hasGrid', { get: () => !!gridProg && !gridBroke, enumerable: true });
  // What the grid is drawn on this frame, exposed so a harness can read headset-only code.
  // why: lessons/kit-xr-room.md#surfaces
  Object.defineProperty(room, 'surfaces', { get: () => (planeShell.length ? planeShell : ownRoom), enumerable: true });
  // Everything the headset reported, beside what gets dots.
  // why: lessons/kit-xr-room.md#all-surfaces
  Object.defineProperty(room, 'allSurfaces', { get: () => planeQuads, enumerable: true });
  // What the tablet cost to hand to the card, the FIRST time. Published rather
  // than logged only, because "it is free" should be a number somebody can read
  // back rather than a belief this file holds about itself.
  Object.defineProperty(room, 'tabletUploadMs', { get: () => tabletUploadMs, enumerable: true });
  Object.defineProperty(room, 'gridAlpha', { get: () => gridAlpha, enumerable: true });
  // not asked, model, or stand-in (unknown profile or the fetch failed). Not a boolean.
  // why: lessons/kit-xr-room.md#controllers
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
  // Whether the tablet face compiled (answerable on a laptop), not whether one is hanging.
  // why: lessons/kit-xr-room.md#has-tablet
  Object.defineProperty(room, 'hasTablet', { get: () => !!holdProg, enumerable: true });
  Object.defineProperty(room, 'tabletHanging', { get: () => !!tabletM, enumerable: true });
  return room;
}
