
/**
 * 🔴 ONE LOOK FOR "THE RAY IS ON THIS", EVERYWHERE.
 *
 * A room with a highlight per page is a room where you learn the highlight
 * again in every corner. This is the whole rule, and both `scene`'s things and
 * an XR panel take it from here rather than each inventing one:
 *
 *   aimed   the ray is on it            brighter, and very slightly bigger
 *   held    you have hold of it         brighter still, and bigger still
 *
 * ⚠️ SIZE AS WELL AS BRIGHTNESS, and the size is the half that matters in a
 * headset. Brightness alone is a poor signal there — the panel is emissive, the
 * room around it is not, and a 35% lift reads as "that one happens to be pale"
 * rather than "that one is under your pointer". A thing that grows when you
 * point at it is unambiguous at any brightness, and it survives being looked at
 * from an angle, which a specular highlight does not.
 *
 * ⚠️ AND IT IS NOT A COLOUR CHANGE. In this project colour says HOW SOMETHING
 * LANDED; a hue that also means "you are pointing at it" is two meanings on one
 * channel, which is the rule a focus ring already broke here once (LESSONS #43).
 */
export const TOUCH = {
  none:  { lit: 1.00, scale: 1.000 },
  aimed: { lit: 1.35, scale: 1.035 },
  held:  { lit: 1.80, scale: 1.075 },
};
export const touchOf = (isHeld, isAimed) => (isHeld ? TOUCH.held : isAimed ? TOUCH.aimed : TOUCH.none);

// demo/shell/xr-panel.mjs — panel.mjs canvases, hung in front of you in a
// headset, with the frame rate measured while you are standing in them.
//
// `plan-xr-room.md` §4.1 is the whole job: "One panel, one transport, measured.
// Video→texture cost and fps against the known 89.8. No audio. Answers the
// question the other seven panels depend on." This is the piece that enters the
// session and draws the panel; the page supplies the picture.
//
// 🔴 THIS IS demo/scene's ENTRY PATH, EXTRACTED — NOT A SECOND ONE. Every rule
// below was paid for on a real Quest and every one of them is in CLAUDE.md. A
// hand-rolled copy in a second page is the "fourth copy" mistake with the most
// expensive code in the repo, so the traps live here, once:
//
//   1. `session.renderState.baseLayer` IS NULL until the next animation frame.
//      `updateRenderState()` queues; it does not apply. Reading
//      `baseLayer.framebufferWidth` one line after `requestSession` throws a
//      TypeError, the throw escapes the handler, and the render loop, the
//      exit-on-button AND the bail-out timer are all never registered — a live
//      session, nothing drawing, no way out. The layer is read INSIDE the frame
//      callback, where it exists.
//   2. `alpha: false` MAKES PASSTHROUGH IMPOSSIBLE. The compositor puts the
//      real room behind the page and can only do it through transparent
//      pixels. This module creates its own context so no page can get that
//      attribute wrong — the defect is unrepresentable rather than documented.
//   3. `gl.clear` IGNORES THE VIEWPORT. Both eyes share ONE framebuffer, so a
//      clear on the second view wipes what the first drew. Only the first view
//      clears colour; the rest clear DEPTH inside a `gl.scissor`, or the second
//      eye tests against the first eye's depths.
//   4. `bindAttribLocation` ONLY TAKES EFFECT AT THE NEXT LINK. Called after
//      `linkProgram` it is a no-op that reads like a fix — a Quest reported
//      GL_INVALID_OPERATION (1282) for it and DREW CORRECTLY ANYWAY, because
//      the linker happened to pick the same slot. So it is called before the
//      link and `gl.getError()` is read on the first frame and published.
//   5. THE WAY OUT COMES WITH THE SESSION. A long hold on ANY controller button
//      ends it, with a ring filling in front of you while you hold
//      (`xr-quit.mjs`) — plus a dead-man's switch that ends it if nothing has
//      been drawn after 4 s. "Press the Meta button" is not an answer a page
//      gets to give about its own bug.
//      🔴 AND SINCE 2026-09-19 IT IS NOT A LINE ANYBODY REMEMBERS TO WRITE.
//      `mountXRQuit(gl, session)` puts the hold on the session's own frame
//      loop, so no file advances it and no file can fail to. `/blocks/` built
//      the badge, drew it every frame and never advanced it, and there was no
//      way out of that page at all.
//      ⚠️ THE TWO ARE NOT THE SAME THING AND ONLY ONE IS AN EXIT. The hold is
//      for a person who wants out; the dead-man's switch is for a page that has
//      stopped being able to offer one. 2026-09-17 removed every OTHER exit
//      here — the grip, and the tablet's own button — and deliberately kept
//      that guard, because without it a throw in the entry path leaves a live
//      session with nothing drawing, no way out and no log line.
//
// ⚠️ AND THE LINES THAT SAY WHERE IT HUNG CANNOT BE ON A BATCHED SHIPPER.
// `createShipper` holds for 2 s and entering an immersive session is exactly
// when timers stop being generous — measured on a Quest 3: every flat assert
// arrived, then the press, then nothing at all. `navigator.sendBeacon` survives
// it, so `beacon()` below is what the entry path uses.
//
// ⚠️ demo/scene STILL CARRIES ITS OWN SESSION and was deliberately left alone.
// It is the page a real headset has already graded, its session holds a
// controller ray and grab-and-move, and moving it onto this module is a change
// only a device can re-grade. Do that on a day with a Quest to hand. What the
// two DO now share is the PICTURE: demo/shell/xr-room.mjs draws the room for
// both, so a panel hanging here hangs in the same room `scene` shows.

import { createXRRoom, roomOf, ROOM_OPTIONAL_FEATURES, GRID, mul } from './xr-room.mjs';
import { createXRHands, BUTTON, AXIS } from './xr-hands.mjs';
import { mountXRQuit } from './xr-quit.mjs';
import { createXRTablet } from './xr-tablet.mjs';
// ⚠️ READ, NEVER WRITTEN, AND THAT IS THE POINT. `xr-pick.mjs` is the ONE
// ray-to-rectangle answer in this repo — `xr-hands.mjs` already asks it where
// the ray meets the tablet, and a second copy here would be two truths about
// one pointer, which is the shape of bug nobody can see from inside a
// working-looking picture. The panels' grab bars ask the same function.
import { pickQuad } from './xr-pick.mjs';

const REPORT = new URLSearchParams(location.search).get('report');

/**
 * A line that must arrive even if the event loop is about to be throttled.
 *
 * ⚠️ ONLY FROM A BROWSER THAT IS ABOUT TO ENTER A SESSION, which in practice
 * means a headset. Posting from every desktop visitor would put somebody else's
 * traffic in our diagnostics and is nobody's idea of consent — the same gate
 * `scene` uses. `?report=0` turns it off anywhere.
 */
export function beacon(line) {
  if (REPORT === '0') return;
  try {
    navigator.sendBeacon?.('https://pub.positron.studio/log',
      new Blob([`${(performance.now() / 1000).toFixed(2)} ${line}`], { type: 'text/plain' }));
  } catch { /* diagnostics are never load-bearing */ }
}

// ⚠️ TAKEN ONCE, AT LOAD, AWAY FROM ANY GESTURE. `requestSession` needs a
// TRANSIENT user activation and awaiting anything first can spend it — which is
// why `enter()` below reads this cached answer and never asks afresh. It starts
// as `null`, which means "we have not looked yet" and is a third answer, not a
// polite false (demo/shell/caps.mjs makes the same distinction).
let supported = null;
navigator.xr?.isSessionSupported?.('immersive-vr').then(
  (v) => { supported = v; }, () => { supported = false; });
if (!navigator.xr?.isSessionSupported) supported = false;
// ⚠️ PASSTHROUGH IS ITS OWN QUESTION AND IT IS ASKED SEPARATELY. A headset that
// does VR need not do AR, and answering the second from the first would be a
// page claiming a capability it never probed. Same three-state rule: `null`
// means we have not been told yet, which never reads as "no".
let supportedAr = null;
navigator.xr?.isSessionSupported?.('immersive-ar').then(
  (v) => { supportedAr = v; }, () => { supportedAr = false; });
if (!navigator.xr?.isSessionSupported) supportedAr = false;

/** true, false, or null while the browser has not answered yet. */
export const headsetSupported = () => supported;
/** the same, for passthrough. */
export const passthroughSupported = () => supportedAr;

const PANEL_VS = `#version 300 es
  in vec3 aPos;
  uniform mat4 uProj, uView, uModel; out vec2 vUv;
  void main(){ vUv = vec2(aPos.x + 0.5, 0.5 - aPos.y);
    gl_Position = uProj * uView * uModel * vec4(aPos, 1.0); }`;
// 🔴 TWO SAMPLERS, BECAUSE A PANEL DRAWN BY THE GRAPHICS CARD HAS NO TEXT IN
// IT. A panel here is a picture with a footer of real numbers under it — that
// is the whole design in `panel.mjs` — and a picture that is rendered live in
// this session's own context is a framebuffer, which cannot carry a word. So
// the quad samples the picture above `uFoot` and a small canvas of numbers
// below it. `uFoot` is 0 for a panel whose canvas already has its footer drawn
// into it, and then the second sampler is never reached.
const PANEL_FS = `#version 300 es
  precision highp float;
  in vec2 vUv;
  uniform sampler2D uTex; uniform sampler2D uFootTex;
  uniform float uFoot; uniform float uRound; uniform float uAspect;
  out vec4 o;
  void main(){
    // 🔴 ROUNDED ONLY WHERE THE PICTURE IS NOT ROUNDED ALREADY. panel.mjs
    // clips its canvas to a radius, and two roundings over one another show a
    // seam at every corner — xr-room.mjs pays for that rule with its tablet. A
    // framebuffer has no corners, so a LIVE panel gets its radius here and an
    // uploaded one passes a radius of zero and is left alone.
    // ⚠️ DISCARD, NOT AN ALPHA OF ZERO. Blending is off for panels, so a
    // transparent fragment would still WRITE — black in an opaque session, and
    // a hole punched in whatever the room had put there. Discarding leaves the
    // background exactly as the room drew it, which in passthrough is your room.
    if (uRound > 0.0) {
      vec2 p = vec2((vUv.x - 0.5) * uAspect, vUv.y - 0.5);
      vec2 q = abs(p) - vec2(0.5 * uAspect - uRound, 0.5 - uRound);
      float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRound;
      if (d > 0.0) discard;
    }
    if (uFoot > 0.0 && vUv.y > 1.0 - uFoot) {
      o = texture(uFootTex, vec2(vUv.x, (vUv.y - (1.0 - uFoot)) / uFoot));
    } else {
      float k = uFoot > 0.0 ? 1.0 / (1.0 - uFoot) : 1.0;
      o = texture(uTex, vec2(vUv.x, vUv.y * k));
    } }`;

/**
 * 🔴 THE GRAB BAR, AND WHY THE WHOLE PANEL IS NOT THE HANDLE.
 *
 * Asked for as "what the Meta lobby does with screens": a bar along one edge is
 * what you take hold of, and the surface stays a surface. Two reasons it has to
 * be that way here rather than "press anywhere on the picture":
 *
 *   1. The picture is the thing this page exists to be looked at, and on
 *      `mirror` it is a picture somebody may later want to POINT at. A surface
 *      that jumps into your hand when you aim at it cannot also be aimed at.
 *   2. The right-hand ray already drives the tablet's slider. One ray with two
 *      meanings is how a press ends up doing two things, one of which you did
 *      not ask for — the same collision `selectstart` already has a guard for.
 *
 * Drawn as a rounded capsule from a signed distance, the same trick the tablet
 * and the floor use, so it is exact at any distance from the eye.
 */
const BAR_FS = `#version 300 es
  precision highp float;
  in vec2 vUv; uniform vec3 uCol; uniform float uAlpha; uniform float uAspect;
  out vec4 o;
  void main(){
    // A capsule: the distance to a horizontal segment, radius half the bar's
    // height. Exact, so the ends are round at any size and any distance.
    vec2 p = vec2((vUv.x - 0.5) * uAspect, vUv.y - 0.5);
    float ax = max(abs(p.x) - (0.5 * uAspect - 0.5), 0.0);
    float d = length(vec2(ax, p.y)) - 0.5;
    float w = fwidth(d);
    float a = 1.0 - smoothstep(-w, w, d);
    if (a <= 0.004) discard;
    o = vec4(uCol, a * uAlpha); }`;

/**
 * Where a panel hangs: `dist` metres in front of where you were looking when
 * the session started, at eye height, turned to face you.
 *
 * ⚠️ PLACED ONCE, IN THE ROOM — not head-locked. A panel that follows your face
 * cannot be looked away from, and looking away is the whole of the gaze-gating
 * in `plan-xr-room.md` §2. It is worth getting right now rather than rebuilding
 * when that arrives.
 *
 * Built by hand rather than by multiplying matrices: the quad's local +Z must
 * point back at your head and its local +Y must stay world-up, which is three
 * columns of a rotation anybody can check by eye.
 */
function placeFacing(headMat, headPos, wM, hM, dist, yaw) {
  // -Z of the head's own frame is forward. Flattened onto the floor plane, so a
  // panel does not end up over your head because you entered looking up.
  let fx = -headMat[8], fz = -headMat[10];
  const l = Math.hypot(fx, fz);
  if (l < 1e-4) { fx = 0; fz = -1; } else { fx /= l; fz /= l; }
  if (yaw) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const nx = fx * c - fz * s, nz = fx * s + fz * c;
    fx = nx; fz = nz;
  }
  return facing([headPos.x + fx * dist, headPos.y, headPos.z + fz * dist], headPos, wM, hM);
}

/**
 * The same quad, at a centre somebody else chose, turned to face a head.
 *
 * 🔴 BOTH AXES SINCE 2026-09-17, AND IT WAS YAW ONLY. Instructed: *"make them
 * always look at me not only horiz but also vertic"*. The old rule and its
 * reason are kept here because the reason was a real one and it lost on a
 * measurement nobody had: it said a panel that tips to meet a head looking down
 * from above reads as FALLING OVER, because a picture on a stand does not lean
 * back when you stand up. That is true of a picture standing on a floor. These
 * panels hang in mid-air at head height and can be pushed to 3 m up or pulled
 * to 0.45 m off the ground by the thumbstick, and at either of those a
 * world-upright rectangle is a plane you are reading at an angle — the text in
 * its footer keystones and the picture foreshortens. A thing hanging in the air
 * has no floor to be upright against.
 *
 * ⚠️ IT IS STILL A ROTATION AND NEVER A SKEW. The three columns are an
 * orthonormal basis built from one direction, so the quad stays a rectangle and
 * `pickQuad` — which reads exactly these columns — keeps answering about the
 * shape that is drawn.
 *
 * ⚠️ AND THE ROLL IS PINNED TO WORLD UP, WHICH IS THE HALF THAT MUST NOT
 * FOLLOW THE HEAD. Tilt your head sideways and a panel that matched it would
 * rotate in your view and stay rotated when you straighten up. `right` is
 * perpendicular to world up, so the panel's horizon is the room's.
 *
 * 🔴 AND IT IS AIMED AT THE HEAD, NOT AT THE CONTROLLER THAT PLACED IT. The
 * viewer is the head; aiming at the hand points the panel at your own wrist.
 */
export function facing(c, headPos, wM, hM) {
  // The panel's own +Z: from its centre back to the head, which is the
  // direction the quad's face has to point.
  let nx = headPos.x - c[0], ny = headPos.y - c[1], nz = headPos.z - c[2];
  let l = Math.hypot(nx, ny, nz);
  if (l < 1e-4) { nx = 0; ny = 0; nz = 1; l = 1; }
  nx /= l; ny /= l; nz /= l;
  // right = worldUp x normal. Degenerate only when the head is directly above
  // or below the centre, where there is no horizon to line up with and any
  // perpendicular will do for the frame it lasts.
  let rx = nz, ry = 0, rz = -nx;
  const rl = Math.hypot(rx, ry, rz);
  if (rl < 1e-4) { rx = 1; ry = 0; rz = 0; } else { rx /= rl; ry /= rl; rz /= rl; }
  // up = normal x right, which is a unit vector because the two are orthonormal
  const ux = ny * rz - nz * ry;
  const uy = nz * rx - nx * rz;
  const uz = nx * ry - ny * rx;
  return new Float32Array([
    rx * wM, ry * wM, rz * wM, 0,
    ux * hM, uy * hM, uz * hM, 0,
    nx, ny, nz, 0,
    c[0], c[1], c[2], 1,
  ]);
}

/**
 * The grab bar's own quad, hanging under a panel in the panel's own plane.
 *
 * Its columns are built the same way a panel's are — first column right times
 * width, second up times height, third the normal, fourth the centre — which is
 * exactly what `pickQuad` reads, so the thing that is drawn and the thing the
 * ray is tested against are one matrix rather than two descriptions of one.
 */
export function barOf(M, hM, barW, barH, gap) {
  // Column 0 is right*width and column 1 is up*height, so unit right is
  // column 0 over the panel's width — and the width is the length of it.
  const w = Math.hypot(M[0], M[1], M[2]) || 1;
  const rx = M[0] / w, ry = M[1] / w, rz = M[2] / w;
  // 🔴 THE PANEL'S OWN UP, NOT WORLD UP — AND THIS BROKE THE MOMENT PANELS
  // STARTED TO PITCH. The bar used to be `(0, barH, 0)` dropped along world
  // −Y, which is the same thing while every panel is world-upright and is a
  // handle floating OUT OF the panel's plane the moment one tips: it would hang
  // in front of a panel tilted down at you and behind one tilted up, and
  // `pickQuad` would answer about a rectangle in a different plane from the one
  // being drawn. Both come off column 1 now, so the bar is in the picture's
  // plane at every angle by construction.
  const h = Math.hypot(M[4], M[5], M[6]) || 1;
  const ux = M[4] / h, uy = M[5] / h, uz = M[6] / h;
  const drop = hM / 2 + gap + barH / 2;
  return new Float32Array([
    rx * barW, ry * barW, rz * barW, 0,
    ux * barH, uy * barH, uz * barH, 0,
    M[8], M[9], M[10], 0,
    M[12] - ux * drop, M[13] - uy * drop, M[14] - uz * drop, 1,
  ]);
}

/**
 * How a panel is picked up. Metres.
 *
 * ⚠️ THE BOUND IS THE INTERESTING ONE. A panel you can push six metres away and
 * then cannot read, or drop through the floor, is a panel you have lost — and
 * there is no menu in here to get it back. So the centre is clamped: never
 * closer than you can focus, never further than a big room, never low enough to
 * bury its own grab bar in the floor, never above head height plus a metre.
 * Everything inside that box is somewhere you can walk to and point at.
 */
export const PLACE = {
  near: 0.55, far: 6.0,
  lowest: 0.45,            // the CENTRE's lowest y above the floor
  highest: 3.0,
  // 🔴 THE BAR'S THREE NUMBERS, AND IT HAS BEEN HALVED TWICE BY EYE IN A
  // HEADSET. Instructed 2026-09-17: *"retuce movebar size under panel 2x."*
  //
  //   first guess   0.42 of the width, 45 mm tall, 22 mm clear
  //   2026-09-16    0.28 of the width, 32 mm tall, 38 mm clear
  //   2026-09-17    0.14 of the width, 16 mm tall, 30 mm clear
  //
  // On the shipped 1.28 m panel that is **358 mm x 32 mm becoming 179 mm x
  // 16 mm** — half in each direction, a quarter of the area. A handle should be
  // findable and unremarkable; the picture is the thing you came to look at.
  //
  // ⚠️ THE GAP CAME DOWN AND NOT BY HALF. It had GROWN as the bar shrank, on
  // the argument that a small handle sitting close reads as part of the frame
  // rather than as a separate thing to aim at — that argument still holds, so
  // 38 mm of air under a 16 mm bar would be more than twice the handle's own
  // height and the thing would read as floating loose. 30 mm keeps it clearly
  // separate without setting it adrift.
  // ⚠️ AND THE BAR IS STILL A SEPARATE GESTURE FROM THE PICTURE. That is the
  // whole reason it exists; making it smaller does not make it the picture.
  barH: 0.016,             // the grab bar's height
  barGap: 0.030,           // air between the panel's lower edge and the bar
  barShare: 0.14,          // how much of the panel's width the bar spans
  pushPerSec: 1.6,         // metres a second, on a fully pushed thumbstick
  stickDead: 0.25,         // below this the stick is at rest
};

/**
 * Where a panel's centre sits in the CONTROLLER's own axes, at the moment it is
 * grabbed.
 *
 * 🔴 THIS IS THE WHOLE OF "GRAB WHERE THE RAY HIT, NOT THE CENTRE". Keep the
 * offset and the thing stays where your hand met it; keep only a distance and
 * it snaps to the middle of your pointer on the press, which reads as the panel
 * jumping away from you. The tablet's slider solves the same problem the same
 * way. The rotation part of a pose matrix is orthonormal, so its inverse is its
 * transpose and there is nothing to invert.
 *
 * @param {Float32Array} M   the panel's model matrix
 * @param {Float32Array} m   the controller's target-ray pose matrix
 * @param {{x:number,y:number,z:number}} o  the ray's origin
 */
export function grabOffset(M, m, o) {
  const dx = M[12] - o.x, dy = M[13] - o.y, dz = M[14] - o.z;
  return [
    dx * m[0] + dy * m[1] + dz * m[2],
    dx * m[4] + dy * m[5] + dz * m[6],
    dx * m[8] + dy * m[9] + dz * m[10],
  ];
}

/**
 * Where a held panel's centre goes this frame, bounded.
 *
 * 🔴 EXPORTED SO A LAPTOP CAN GRADE IT, and that is not a convenience. Nothing
 * about a drag can be tried without a controller in a headset, and this repo
 * gets one headset run — so the arithmetic lives in a pure function the page's
 * own checks drive with a made-up pose. ⚠️ The session calls THIS function, not
 * a copy of it: a test against a second implementation grades the test.
 *
 * The bound is `PLACE`: never nearer than you can focus, never further than a
 * big room, never low enough to bury the panel's own grab bar in the floor,
 * never above head height plus a metre. Measured from YOUR HEAD rather than
 * from the origin, because you are the thing it has to stay reachable from and
 * you can walk.
 */
export function heldAt(m, o, L, hp, floorY = 0) {
  let cx = o.x + m[0] * L[0] + m[4] * L[1] + m[8] * L[2];
  let cy = o.y + m[1] * L[0] + m[5] * L[1] + m[9] * L[2];
  let cz = o.z + m[2] * L[0] + m[6] * L[1] + m[10] * L[2];
  const vx = cx - hp.x, vz = cz - hp.z;
  const flat = Math.hypot(vx, vz);
  if (flat > 1e-4) {
    const want = Math.max(PLACE.near, Math.min(PLACE.far, flat));
    cx = hp.x + vx / flat * want; cz = hp.z + vz / flat * want;
  }
  cy = Math.max(floorY + PLACE.lowest, Math.min(floorY + PLACE.highest, cy));
  return [cx, cy, cz];
}

/**
 * @param {object} o
 * @param {Array<object>} o.panels  each panel's picture and its size IN METRES.
 *        `{ canvas }` is a 2-D canvas uploaded every frame — the original and
 *        still the default. `{ live }` is a renderer that draws INTO THIS
 *        SESSION'S OWN CONTEXT and hands back a texture, with `{ foot }` an
 *        optional small canvas of numbers drawn in a strip under it, because a
 *        framebuffer cannot carry a word. A panel may carry both, and
 *        `setLive()` decides which is on the quad — which is the only way to
 *        A/B the two paths in one session.
 * @param {(ctx:{frame:XRFrame, pose:XRViewerPose, session:XRSession}) => void} [o.onFrame]
 *        called once per animation frame, BEFORE the upload — this is where a
 *        page redraws its panel canvases. Once per FRAME, never per eye.
 * @param {() => void} [o.onEnd]
 * @param {(msg:string, kind?:string) => void} [o.log]
 * @param {number} [o.dist]  metres in front of you
 * @param {boolean|{seed?:number, sky?:boolean, things?:boolean, bg?:number[]}} [o.room]
 *        hang the panels INSIDE the room `scene` builds — the same module, the
 *        same seed arithmetic, the same dotted floor. `true` takes the default
 *        seed. `sky: false` turns the wall cube off and `things: false` empties
 *        the room of its objects, which together leave a floor and whatever the
 *        page puts in front of it — see the note by `sky` in xr-room.mjs.
 * @param {() => ({col:number[], amp:number}|null)} [o.glow]  the fake light the
 *        panels cast on the floor. Asked once a frame; see GRID_FS in
 *        xr-room.mjs for what it is and what it is NOT.
 * @param {boolean} [o.live]  start with the live renderers on the quads
 * @returns {object}
 */
export function createXRPanels({
  panels = [], onFrame = null, onEnd = null, log = () => {},
  dist = 1.6, clear = [0.02, 0.03, 0.045, 1], deadManMs = 4000, room = null,
  glow = null, live = true, fan = 0.7,
  /**
   * 🔴 SOMETHING THE PAGE DRAWS ON THE GROUND, IN THIS SESSION'S CONTEXT.
   *
   * `{ attach(gl), draw({ proj, view, eye, tSec, bg }), detach?() }`. It is
   * attached once when the context is built and drawn once per eye, after the
   * room and before the panels, because it is the ground the panels stand over.
   *
   * ⚠️ THIS EXISTS SO THERE IS NOT A FOURTH SESSION PATH. `blocks`, `floor` and
   * this module already each own one, and every one of the five WebXR defects
   * at the top of this file is silent from outside: a page that writes its own
   * `requestSession` inherits none of the fixes and none of the ways out. What
   * a page owns here is its picture and nothing else.
   *
   * ⚠️ AND IT IS HANDED `bg`, WHICH IS THE COLOUR THE FRAME WAS CLEARED TO.
   * A surface that fades at its edges has to fade INTO something, and if it
   * picks that colour itself the two drift: `demo/floor/index.html:154-168`
   * records a visibly brighter disc on a darker void, a rim nobody drew, at
   * exactly the radius the fade was meant to hide, because the fade target and
   * the clear colour were typed twice and were out by nearly a factor of two.
   * One triple, passed in.
   *
   * ⚠️ IT IS ALLOWED TO FAIL ON ITS OWN, like the grab bars and the room's
   * grid. A driver that will not compile it costs the picture on the floor,
   * never the session and never the way out.
   */
  surface = null,
} = {}) {
  // What `surface` started as, and what is left of it. A surface that threw is
  // set to null here and SAID SO in `state`, because a page whose floor quietly
  // did not draw looks exactly like a page whose floor drew black.
  let theSurface = surface;
  let gl = null, prog = null, quad = null, U = null;
  let barProg = null, barU = null;
  let session = null, space = null, arMode = false;
  // 🔴 THE WAY OUT IS A HOLD, AND THE BUTTON WAS NEVER THE POINT. This page once
  // exited on a TAP of whatever button happened to be pressed, so you left it by
  // accident while reaching for something and it gave no warning. It then exited
  // on one NAMED button, held, which fixed the accident and asked somebody
  // wearing a headset to find a particular button by feel. Since 2026-09-17 it
  // is ANY button, HELD, with a ring in front of you filling while you hold:
  // nothing is reachable by accident and there is nothing to be told.
  // ⚠️ THE RING CAME OFF THE CONTROLLERS ON 2026-09-19 and is head locked now,
  // and the hold is advanced by the session rather than by this file. See the
  // header of `xr-quit.mjs` for the argument that lost.
  let theQuit = null;

  /**
   * 🔴 BUILT ON FIRST DRAW, IN EITHER PATH, AND THAT IS WHAT LETS A LAPTOP
   * GRADE IT. Built inside `requestSession` it is reached for the first time on
   * the first frame of a headset session, where a shader that will not compile
   * costs the one run somebody was going to make and the page has no way out at
   * the moment it needs one most. It is the same argument the tablet's own note
   * makes two hundred lines down, and WebXR draws through this very context, so
   * there is no second context to worry about.
   *
   * ⚠️ IT MUST NOT THROW INTO THE CALLER. A badge that will not compile is a
   * page with an uglier way out; a throw here is a page with none, because an
   * uncaught error in a frame callback deletes everything below it.
   *
   * 🔴 CALLED TWICE, WITH AND WITHOUT A SESSION, AND THE SECOND ONE IS THE REAL
   * EXIT. 2026-09-19 moved the hold behind the session's own frame loop, so
   * `mountXRQuit` wants the session and nothing else advances it. `build()`
   * still asks for one with no session, which compiles the shader on a laptop
   * and reports `driven: false`; the entry path asks again with the session and
   * gets an exit that drives itself. The compile-only one is thrown away at
   * that point, because two badges is two programs.
   */
  function ensureQuit(forSession = null) {
    if (quitFailed || !gl) return theQuit;
    // The one we have is right unless we now have a session and it is not on
    // one. `driven` also goes false when a session ends, so re-entering builds
    // a fresh mount rather than keeping a badge tied to a session that is gone.
    if (theQuit && (!forSession || theQuit.driven)) return theQuit;
    try {
      theQuit?.dispose();
      theQuit = mountXRQuit(gl, forSession, {
        // 🔴 NO `armed` GUARD HERE ANY MORE, AND IT DID NOT GO MISSING.
        // The press that opened this page's own button may still be down as the
        // session starts, and with every button live it IS one of the buttons
        // the hold counts. That guard is now inside `xr-quit.mjs` for every
        // page at once: the hold arms on the first frame with nothing pressed,
        // or after three seconds regardless so a stuck button cannot trap
        // somebody. This page's own `armed` flag still gates the trigger and
        // the thumbstick, which is what it was also for.
        // ⚠️ AND THIS DOES NOT END THE SESSION. The module does that itself,
        // after this returns, which is the line that went missing from
        // `/blocks/` and left a page with no way out.
        onQuit: () => beacon('held a controller button, leaving'),
        log,
        say: beacon,
      });
      // ⚠️ COMPILED HERE, NOT ON THE FIRST DRAW. The object is lazy, so having
      // one proves nothing about its shader, and the check below would pass on
      // a badge that cannot be drawn. PROVED by sabotage: with `compile` made to
      // throw, the assert stayed green until this line existed.
      quitReady = theQuit.prepare();
      if (!quitReady) beacon(`FAIL quit badge would not compile: ${theQuit.why}`);
    } catch (e) {
      quitFailed = true;
      beacon(`FAIL quit badge would not build: ${e.message}`);
    }
    return theQuit;
  }
  let quitFailed = false, quitReady = false;
  let placed = null, armed = false, armAt = 0;
  // Whether the live renderers are the ones on the quads. The A/B this page
  // exists to measure is a single boolean, so it is one.
  // ⚠️ AND ONLY WHERE THERE IS SOMETHING TO BE LIVE. `state.live` saying true
  // about a page with no live renderer would be the page reporting a mode it
  // is not in.
  let liveOn = !!live && panels.some((p) => p.live);

  // ── the room the panels hang in ────────────────────────────────────────
  // 🔴 A PANEL IN NOTHING IS NOT A PLACE. Before this, an immersive session
  // here was one rectangle in a black void — no floor, no scale, nothing to
  // judge the panel's distance against — and `scene` had a whole room sitting
  // in one page nobody else could use. It is one module now, so the room this
  // draws is byte for byte the room `scene` rolls.
  //
  // ⚠️ THE DOCUMENT IS BUILT AT LOAD, THE CONTEXT IS NOT. The room is four
  // bytes of seed and some arithmetic, so it can be built and CHECKED on a
  // laptop with no headset — but a WebGL2 context for every desktop visitor who
  // will never press the button is a cost with nothing on the other side of it.
  // `attach()` happens on the way into a session.
  const roomSeed = (room && typeof room === 'object' && Number.isFinite(room.seed)) ? room.seed >>> 0 : 424242;
  const roomOpt = (room && typeof room === 'object') ? room : {};
  const wantSky = roomOpt.sky !== false;
  const wantThings = roomOpt.things !== false;
  /**
   * 🔴 `grid: false` HIDES THE DOTTED FLOOR AND KEEPS THE ROOM.
   *
   * A page that draws its OWN ground has two floors: reported on
   * `/videoradio/`, whose sea is 46 wave fronts standing on a plane that the
   * room was also dotting. `room: null` is the wrong answer and CLAUDE.md says
   * why: the tablet and the hands are built only when there is a room, so a
   * page with none loses the pointer and the slab. It no longer loses the way
   * out, which is head locked and reads the session directly since 2026-09-19.
   * This takes the dots to zero alpha and leaves everything that gets you home.
   */
  const wantGrid = roomOpt.grid !== false;
  /**
   * 🔴 `hands: false` DRAWS NO CONTROLLER AND KEEPS EVERY POSE.
   *
   * Asked for on `/videoradio/`, which is a sea you stand in: *"rm dotted floor
   * and controlers from vr videoradio"*. A page whose whole subject is the
   * water has a pair of plastic Touch controllers floating in it.
   *
   * ⚠️ IT STRIPS THE MODELS, NOT THE INPUT. `pointer`, `tabletM` and the hit
   * test all still arrive, so the ray still points and the tablet still hangs.
   * The quit badge is not affected by any of this since 2026-09-19: it is head
   * locked and it reads its own controllers off the session, so it draws and
   * fires with nothing else in the picture.
   */
  // 🔴 AND THE DEFAULT IS NOW OFF. 2026-09-17: *"rm controller
  // geometry/tablet on all (only if i am ask on specific demo so keep that code
  // ready to pop into scene)"*. It was `!== false`, so every page got plastic
  // controllers unless it said otherwise; it is `=== true` now, so a page gets
  // them only by asking. The drawing code is untouched and lives where it
  // always did — `GRIP_PARTS` and `loadModel` in `demo/shell/xr-room.mjs`, and
  // the stand-in meshes in `demo/shell/xr-controller.mjs` — so putting them
  // back into one scene is `hands: true` and nothing else.
  const wantHands = roomOpt.hands === true;
  /**
   * 🔴 `tablet: false` TAKES THE SLAB OFF THE LEFT HAND TOO.
   * `hands: false` stopped the controller models and the tablet stayed, because
   * it hangs on a matrix that is input rather than a model: reported as
   * *"videoradio vr: still has left controller and tablet"* — the thing still
   * in the left hand WAS the tablet.
   * ⚠️ THE WAY OUT SURVIVES. `xr-quit.mjs`'s ring is head locked and its hold
   * is advanced by the session, so it draws and fires with nothing else in the
   * picture at all. A page that takes the tablet away has one visible exit
   * instead of two, which is why this is a switch a page asks for rather than
   * the default.
   */
  // 🔴 OFF BY DEFAULT TOO, SAME INSTRUCTION, SAME DAY. The slab and its slider
  // are kept whole in `demo/shell/xr-tablet.mjs` and are one `tablet: true`
  // away from being back in a scene.
  // 🔴 AND NEVER IN PASSTHROUGH, WHATEVER A PAGE ASKS FOR. 2026-09-17: *"slider
  // is ok. but again, do not show it on any vr/xr when showing ar scenes"*.
  // The test is `arMode`, which is read off `environmentBlendMode` and NOT off
  // the session's name — CLAUDE.md records that a session can be called
  // `immersive-ar` and still composite `opaque`, and gating on the name would
  // hide the tablet in a session that is drawing an opaque room.
  const wantTablet = roomOpt.tablet === true;
  const roomBg = Array.isArray(roomOpt.bg) ? roomOpt.bg : null;
  const roomDoc = room ? roomOf(roomSeed) : null;
  // ⚠️ THE DOCUMENT IS STILL ROLLED FROM THE SEED EVEN WHEN NOTHING IS DRAWN
  // FROM IT, because `hue` comes out of it and because "the room is a function
  // of four bytes" is the claim, not "the room has boxes in it". What a page
  // asked to SEE is a separate question and it is answered here.
  const drawnDoc = room ? (wantThings ? roomDoc : { ...roomDoc, things: [] }) : null;
  const theRoom = room ? createXRRoom(null, { log, say: beacon }) : null;
  // The dots go to nothing when the page draws its own ground. See `wantGrid`.
  if (theRoom && !wantGrid) theRoom.setGrid({ alpha: 0 });

  // ── the controllers, the pointer and the tablet ────────────────────────
  // 🔴 THE SAME ONES `scene` HAS, FROM THE SAME TWO MODULES. A page that stands
  // in this room gets the room's controller interface too — the stand-ins, the
  // beam from the right hand's target ray, and the tablet on the left with its
  // slider on it. Building a second one here is the "fourth copy" mistake with
  // the most expensive code in the repo, and it would be the copy that drifts.
  //
  // ⚠️ BUILT ONLY WHERE THERE IS A ROOM TO PUT IT IN. A page that asked for no
  // room is a page hanging one rectangle in an empty session, and a tablet in
  // a void is a thing with nothing to be near.
  const theTablet = theRoom ? createXRTablet({ ctx: { room: theRoom } }) : null;
  // ⚠️ THE ROOM IS GIVEN THE TABLET EVEN WHERE IT IS NOT SHOWN. `setTablet` is
  // what uploads its face when the version moves; whether the slab is DRAWN is
  // `tabletM`, and `setInput` below nulls that unless the page asked for it and
  // this is not a passthrough session. `applyAll()` is what puts the floor dots
  // at the strength the slider declares rather than at a default, so it has to
  // run whether anybody can see the slider or not.
  if (theTablet) { theRoom.setTablet(theTablet); theTablet.applyAll(); }
  const theHands = theRoom
    ? createXRHands({
      tablet: theTablet,
      // The same answer the room is given below: the page asked for it, and
      // this is not a passthrough session. A slab nobody can see must not eat
      // the trigger — see `tabletShown` in xr-hands.mjs.
      tabletShown: () => wantTablet && !arMode,
      log,
      say: beacon,
    }) : null;

  /**
   * 🔴 WHICH CALL, NOT WHETHER. `gl.getError()` returns the FIRST error since
   * the LAST call and clears the flag — so one read on the first frame covers
   * everything from context creation onward and can name nothing. A Quest
   * reported `1282` (GL_INVALID_OPERATION) that way and it stayed unlocated
   * because the reading was a yes/no about a whole session's worth of calls.
   *
   * This checks after each PHASE and keeps the first phase that was dirty, so
   * the next device run says where. It runs during setup and on the first frame
   * only — `getError` is a synchronous stall and calling it per frame would be
   * measuring the instrument.
   */
  // 🔴 AND THE IN-FRAME PHASES WERE DEAD CODE UNTIL 2026-09-13. Every one of
  // them was guarded on `state.frames === 0` and the counter is incremented at
  // the TOP of the frame callback, so `upload`, `footer` and `bindFramebuffer`
  // could never be reached — the file promised "the next device run says where"
  // and the only phase that could ever answer was `firstDraw`. That is exactly
  // the shape of the open `1282`: a per-phase attribution that was not running.
  // A guard that cannot fire is worse than no guard, because the page reads as
  // instrumented.
  const glErrors = [];
  function glCheck(phase) {
    if (!gl) return;
    const e = gl.getError();
    if (e && glErrors.length < 8) glErrors.push(`${phase}:${e}`);
    return e;
  }

  const median = (a) => (a.length ? [...a].sort((x, y) => x - y)[a.length >> 1] : null);

  /**
   * Time one pass on the CARD. ⚠️ Nothing here may throw inside a frame
   * callback — an uncaught error there does not stop the loop, it silently
   * deletes everything below it.
   */
  function gpuBegin(what) {
    if (!gpuTimerExt || gpuQ) return false;
    try {
      gpuQ = gl.createQuery(); gpuQFor = what;
      gl.beginQuery(gpuTimerExt.TIME_ELAPSED_EXT, gpuQ);
      return true;
    } catch { gpuQ = null; gpuQFor = null; return false; }
  }
  function gpuEnd() {
    if (!gpuQ) return;
    try { gl.endQuery(gpuTimerExt.TIME_ELAPSED_EXT); } catch { /* nothing to end */ }
  }
  function gpuPoll() {
    if (!gpuQ) return;
    try {
      if (!gl.getQueryParameter(gpuQ, gl.QUERY_RESULT_AVAILABLE)) return;
      // ⚠️ A DISJOINT RESULT IS NOT A SLOW ONE, IT IS A MEANINGLESS ONE — the
      // driver is telling you the clock moved under the measurement. Kept out
      // of the sample rather than averaged in, because one absurd figure in a
      // median of eight is exactly the kind of number that gets quoted.
      const bad = gl.getParameter(gpuTimerExt.GPU_DISJOINT_EXT);
      const ns = bad ? null : gl.getQueryParameter(gpuQ, gl.QUERY_RESULT);
      if (ns != null) {
        const arr = gpuQFor === 'half' ? gpuHalf : gpuFull;
        arr.push(ns / 1e6);
        if (arr.length > 32) arr.shift();
        if (gpuQFor !== 'half') state.liveGpuMs = median(gpuFull);
        else state.liveHalfGpuMs = median(gpuHalf);
      }
      gl.deleteQuery(gpuQ);
    } catch { /* the query is the diagnostic, never the product */ }
    gpuQ = null; gpuQFor = null;
  }

  /**
   * 🔴 WHERE THE COST LANDS, AS A SENTENCE, FROM TWO MEASUREMENTS. "It is
   * slower" is not actionable; "it is fragment-bound at this resolution" says
   * the next thing to try. Half the pixels at about half the time is the
   * fragment case; half the pixels at about the same time means the cost is in
   * issuing the pass and resolution is the wrong lever.
   */
  function verdictOnCost() {
    if (state.liveGpuMs == null) { state.liveWhereCost = state.gpuTimer; return; }
    const mp = state.livePixels ? (state.livePixels.w * state.livePixels.h) / 1e6 : null;
    const rate = mp && state.liveGpuMs > 0 ? (mp / (state.liveGpuMs / 1000)) : null;
    const head = `${state.liveGpuMs.toFixed(3)} ms on the card`
      + (mp ? ` for ${mp.toFixed(2)} Mpix` : '')
      + (rate ? ` · ${rate.toFixed(0)} Mpix/s` : '');
    if (state.liveHalfGpuMs == null) { state.liveWhereCost = `${head} · half-size not measured yet`; return; }
    const k = state.liveHalfGpuMs / state.liveGpuMs;
    // ⚠️ THE SAMPLE COUNTS, BECAUSE THE RATIO IS A MEDIAN OF A FEW AND IT
    // MOVES. Three runs of the same preview on one laptop gave 0.69, 0.84 and
    // 0.86 — a verdict quoted without its n invites somebody to treat the first
    // of those as a fact.
    const n = ` (n=${gpuFull.length}/${gpuHalf.length})`;
    // 🔴 CHECK THE INSTRUMENT BEFORE BELIEVING THE PATTERN. MEASURED on this
    // laptop: the same preview, run four times with no code between, answered
    // 0.24x, 0.72x, 0.73x and 0.82x — and the confident sentence below would
    // have called the first FRAGMENT-bound and the last not, from one run each.
    // A GPU timer is a driver's estimate of a span it is free to reorder, so
    // when its own samples disagree with themselves the only honest verdict is
    // that this device cannot answer.
    const spread = (a) => (a.length >= 3 ? Math.max(...a) / Math.max(1e-9, Math.min(...a)) : Infinity);
    const sf = spread(gpuFull), sh = spread(gpuHalf);
    if (!(sf < 2.5 && sh < 2.5)) {
      state.liveWhereCost = `${head} · where that time goes cannot be said here${n}:`
        + ` the card's own clock disagrees with itself by ${Number.isFinite(sf) ? `${sf.toFixed(1)}x` : '—'}`
        + ` across full-size samples and ${Number.isFinite(sh) ? `${sh.toFixed(1)}x` : '—'} across quarter-size ones`;
      return;
    }
    // Half in each direction is a QUARTER of the pixels, so pure fragment cost
    // predicts 0.25 and a pass whose cost is all in issuing it predicts 1.
    state.liveWhereCost = `${head} · a quarter of the pixels costs ${k.toFixed(2)}x${n}, so it is `
      + (k < 0.45 ? 'FRAGMENT-bound: resolution is the lever'
        : k > 0.80 ? 'NOT fragment-bound: the pass costs what it costs whatever size it is, so resolution will not help'
        : 'partly fragment-bound: resolution helps, but not in proportion');
  }
  /**
   * What the trigger has hold of.
   *
   * 🔴 THE OFFSET IS TAKEN IN THE CONTROLLER'S OWN FRAME, WHICH IS THE WHOLE OF
   * "grab where the ray hit, not the centre". `local` is the vector from the
   * ray's origin to the panel's centre AT THE MOMENT OF THE GRAB, written in
   * the ray's axes; every frame after that the centre is put back at
   * `origin + R_now · local`. So a panel taken by the corner of its bar stays
   * offset by exactly that corner, and nothing jumps on the press. Storing a
   * distance alone is what makes a panel snap to the middle of your pointer.
   */
  let grabbing = null;            // { i, local:[x,y,z], src }
  let grabDist = 0;               // for the beam's length, and the readout
  let aimedBar = null;            // { i, t } — which grab bar the ray is on
  let tick = 0, tickAt = 0, lastFrame = 0;
  const tex = new Map();                      // canvas -> WebGLTexture
  const uploads = [];                         // CPU ms per frame, for a median
  const liveMs = [];                          // CPU ms per frame for the live pass
  // ── the card's own stopwatch ───────────────────────────────────────────
  // One TIME_ELAPSED query may be in flight at a time, so this is a one-slot
  // queue: a frame that finds the slot busy simply does not time itself, which
  // costs a sample and never a stall.
  let gpuTimerExt = null, gpuQ = null, gpuQFor = null;
  const gpuFull = [], gpuHalf = [];
  let probeFrames = 0;
  let stickWasDown = false;

  /**
   * Swap the panels between the live renderers and the uploaded canvases.
   *
   * ⚠️ IT SAYS SO ON THE BEACON EVERY TIME. The whole value of the switch is
   * that a headset run can hold the two side by side afterwards, and a run
   * whose log does not say which path each second was drawn with cannot.
   */
  function setLive(v, why = 'the page') {
    const next = !!v && panels.some((p) => p.live);
    if (next === liveOn) return liveOn;
    liveOn = next;
    liveMs.length = 0; gpuFull.length = 0; state.liveGpuMs = null; state.liveWorstMs = 0;
    uploads.length = 0; state.uploadWorstMs = 0;
    beacon(`${why} · the picture is now ${liveOn
      ? 'RENDERED LIVE by this session, in its own context'
      : 'UPLOADED from a 2-D canvas, the way it was'}`
      + ` · last second ${state.fps == null ? 'no rate yet' : `${state.fps.toFixed(1)} fps`}`);
    log(liveOn
      ? 'the headset is drawing that picture itself now'
      : 'the picture is being copied in from this page again');
    return liveOn;
  }

  /**
   * Everything a harness or a report can read. `frames` and `fps` are counted
   * by THIS PAGE — printed beside, never averaged with, whatever the
   * compositor says, because the two are counted on opposite sides of the wire
   * and a mean of them hides the case worth catching.
   */
  const state = {
    presenting: false,
    mode: 'window',
    frames: 0,                 // drawn inside the session
    fps: null,                 // measured inside the session
    worstGapMs: null,
    fb: null,                  // { w, h } — the headset's own framebuffer
    eye: null,                 // { w, h } — one eye's viewport in it
    views: null,
    blendMode: null,
    glError: null,
    // ⚠️ WHAT THE HEADSET PROMISES, so `fps` can be graded against the rate
    // this device actually runs at rather than against a number typed by
    // somebody who had a different one. CLAUDE.md measured that a Quest 3
    // reports NO `frameRate`, which is why the list beside it is read too and
    // why both are published even when they come back empty: "we asked and it
    // would not say" is a finding, and it is not the same as not asking.
    frameRate: null,
    supportedFrameRates: null,
    // The page's own floor: whether it attached, and why not when it did not.
    // ⚠️ `null` MEANS NONE WAS OFFERED, which is not the same as one that
    // refused. A check that cannot tell those apart passes on a page that
    // forgot to pass a surface at all.
    surface: surface ? { attached: false, why: 'not built yet', draws: 0 } : null,
    // ⚠️ CPU TIME, AND IT SAYS SO. `uploadCpuMs` is how long `texImage2D` takes
    // on the PROCESSOR; the graphics card's own time for the copy is NOT
    // visible from here without a timer extension, and a number that has to be
    // disclaimed every time it is quoted is measured wrong. `fps` is the
    // load-bearing evidence; these two are the costs that would explain a bad
    // one. They are kept apart because they answer different questions: one is
    // the page drawing its picture, the other is handing that picture to the
    // card.
    drawCpuMs: null,
    uploadCpuMs: null,
    uploadWorstMs: null,
    panelPixels: null,         // the texture actually being uploaded
    // ── what the live renderers cost ────────────────────────────────────
    // 🔴 THREE NUMBERS BECAUSE THERE ARE THREE PLACES THE TIME CAN GO, and
    // "it is slower" says which of them exactly never. `liveCpuMs` is the
    // JavaScript side of issuing the pass; `liveGpuMs` is the card's own
    // time, read with EXT_disjoint_timer_query_webgl2 where the driver has
    // it and left NULL where it does not — "we could not measure" is a
    // finding and it is not the same as zero. `liveHalfGpuMs` is the same
    // pass at half the pixels, run once as a one-shot probe into a scratch
    // target nobody sees: if it comes back at about half, the cost is
    // FRAGMENT-bound and the lever is resolution; if it comes back at about
    // the same, it is per-draw and resolution will not help.
    live: null,                // is the live path on the quads right now
    livePixels: null,          // { w, h } of the texture it renders
    liveCpuMs: null,
    liveWorstMs: null,
    liveGpuMs: null,
    liveHalfGpuMs: null,
    liveWhereCost: 'not measured yet',
    gpuTimer: null,            // the extension's name, or why there is none
    // 🔴 THE FAKE LIGHT, PUBLISHED AS WHAT IT IS. A page that draws a glow and
    // reports nothing about it is asserting a physical claim with no number
    // under it. This is the colour and the strength actually handed to the
    // shader this frame, so a run can say the picture moved it.
    glow: null,
    // ⚠️ WHERE THE PANELS ARE, IN METRES, so a run can say whether the drag
    // actually moved anything rather than whether the code for it exists.
    grabbed: 0,                // completed press → move → release cycles
    grabMovedM: null,          // how far the last one moved a panel
    // ⚠️ WHERE THE PANEL IS HANGING, AND WHERE THE GRID'S FLOOR CAME FROM.
    // Published so one headset run answers both without anybody reading a log,
    // and so a laptop can still grade the half that is arithmetic. `surfaces`
    // is a WORD and there are six of them — see the list beside `planes` in
    // xr-room.mjs — because "we did not look", "we were refused", "it answered
    // and we could not read it" and "your room has no surfaces in it" are four
    // different findings, and a boolean would collapse all four into one.
    room: room
      ? { on: true, seed: roomSeed,
          // What the seed MADE, and what this page asked to have drawn from it.
          // Two numbers, because a page that hides the objects has not stopped
          // rolling them and the assert that used to read `things > 0` would
          // otherwise pass vacuously or fail for the wrong reason.
          made: roomDoc.things.length,
          things: drawnDoc.things.length,
          // Three facts about what is in the room, as a LIST rather than one
          // string with joins in it. This reaches a page's assert details and
          // so a visitor's log box, which is why it lost its middots on
          // 2026-09-19 along with the rest of what a visitor reads.
          scenery: `${wantSky ? 'walls' : 'no walls'}, ${wantThings ? 'objects' : 'no objects'} and a dotted floor`,
          // The floor's own numbers, so the one property that has broken here
          // before — dots still at strength where the quad stops — is gradeable
          // from a laptop.
          dots: { span: GRID.span, cell: GRID.cell, fadeNear: GRID.fadeNear, fadeFar: GRID.fadeFar },
          surfaces: 'not asked', floor: 'the page', note: '' }
      : { on: false, seed: null, made: 0, things: 0, scenery: 'no room', dots: null,
          surfaces: 'no room', floor: 'nothing', note: 'this page hangs its panels in an empty session' },
    // 🔴 THE CONTROLLER INTERFACE, DESCRIBING ITSELF, WITH NO SESSION IN IT.
    // The same string `scene` publishes and beacons, out of the same modules —
    // so a run of this page and a run of that one, in either mode, are
    // comparable by eye. A difference here is a branch that should not exist.
    ui: theHands ? theHands.fingerprint() : 'no controller interface built',
  };
  if (theRoom) {
    // A getter each, because the room writes its own verdict in place as the
    // frames go by and a field copied once would answer about page load.
    Object.defineProperty(state.room, 'surfaces', { get: () => theRoom.planes.state, enumerable: true });
    Object.defineProperty(state.room, 'floor', { get: () => theRoom.planes.from, enumerable: true });
    Object.defineProperty(state.room, 'note', { get: () => theRoom.planes.note, enumerable: true });
    Object.defineProperty(state.room, 'grid', { get: () => theRoom.hasGrid, enumerable: true });
  }
  // ⚠️ A GETTER, NOT A COPY. The probe resolves after this object is built, so a
  // field written once here would publish `null` forever — a machine surface
  // saying "we never looked" about a browser that answered a second later.
  Object.defineProperty(state, 'supported', { get: () => supported, enumerable: true });
  Object.defineProperty(state, 'supportedAr', { get: () => supportedAr, enumerable: true });
  Object.defineProperty(state, 'live', { get: () => liveOn, enumerable: true });
  // 🔴 THE WAY OUT, ON THE MACHINE SURFACE. A page that cannot assert its own
  // exit has an exit nobody grades, and this is the one control a headset run
  // cannot recover from being wrong about: everything else on this page can be
  // got out of by leaving, and leaving is this. A getter, because the badge is
  // built when the session starts and this object is built at load.
  Object.defineProperty(state, 'quit', {
    enumerable: true,
    get: () => (theQuit && quitReady
      // ⚠️ `button` IS `'any'` SINCE 2026-09-17, not an index, so a check that
      // asked `Number.isInteger(button)` is asking about the design that was
      // replaced. `holdMs` is published beside it because with every button
      // live the hold length is the only thing between a resting thumb and the
      // session ending, which makes it the number worth asserting on.
      // 🔴 `driven` AND `frames` ARE THE TWO THE OLD SHAPE COULD NOT REPORT.
      // A badge that is built, compiled and drawn is what `/blocks/` had while
      // there was no way out of it: what was missing was anything ADVANCING the
      // hold. `driven` says a session is doing that and `frames` counts the
      // frames it has done it for, so a headset run can assert the exit is
      // live rather than that it exists.
      ? { built: true, button: theQuit.button, holdMs: theQuit.holdMs,
          label: theQuit.label, pressed: theQuit.pressed,
          driven: theQuit.driven, frames: theQuit.frames, armed: theQuit.armed,
          holding: theQuit.holding, progress: theQuit.progress }
      : { built: false, button: null, holdMs: null, label: null, pressed: null,
          driven: false, frames: 0, armed: false,
          holding: false, progress: 0,
          why: theQuit?.why || (quitFailed ? 'it threw on construction' : 'never built') }),
  });
  if (panels[0]?.canvas) state.panelPixels = { w: panels[0].canvas.width, h: panels[0].canvas.height };
  const liveOne = panels.find((p) => p.live);
  if (liveOne?.live?.pixels) state.livePixels = { ...liveOne.live.pixels };

  /** Compile, with the attribute slot bound BEFORE the link — see defect 4. */
  function build() {
    const cv = document.createElement('canvas');
    cv.width = 16; cv.height = 16;             // never presented; the layer owns the pixels
    // 🔴 `alpha: true`, ALWAYS. See defect 2 at the top of this file.
    gl = cv.getContext('webgl2', { alpha: true, antialias: true, xrCompatible: true });
    if (!gl) return false;
    const sh = (t, src) => {
      const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, PANEL_VS));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, PANEL_FS));
    gl.bindAttribLocation(prog, 0, 'aPos');    // BEFORE linkProgram, never after
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    U = { proj: gl.getUniformLocation(prog, 'uProj'), view: gl.getUniformLocation(prog, 'uView'),
          model: gl.getUniformLocation(prog, 'uModel'), tex: gl.getUniformLocation(prog, 'uTex'),
          footTex: gl.getUniformLocation(prog, 'uFootTex'), foot: gl.getUniformLocation(prog, 'uFoot'),
          round: gl.getUniformLocation(prog, 'uRound'), aspect: gl.getUniformLocation(prog, 'uAspect') };
    glCheck('program');
    // The grab bar's own program. ⚠️ ALLOWED TO FAIL ON ITS OWN, like the room's
    // grid: a driver that will not compile a signed-distance capsule must cost
    // the handle, never the picture — and the page says so rather than
    // presenting a session with an invisible control in it.
    try {
      barProg = gl.createProgram();
      gl.attachShader(barProg, sh(gl.VERTEX_SHADER, PANEL_VS));
      gl.attachShader(barProg, sh(gl.FRAGMENT_SHADER, BAR_FS));
      gl.bindAttribLocation(barProg, 0, 'aPos');
      gl.linkProgram(barProg);
      if (!gl.getProgramParameter(barProg, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(barProg));
      barU = { proj: gl.getUniformLocation(barProg, 'uProj'), view: gl.getUniformLocation(barProg, 'uView'),
               model: gl.getUniformLocation(barProg, 'uModel'), col: gl.getUniformLocation(barProg, 'uCol'),
               alpha: gl.getUniformLocation(barProg, 'uAlpha'), aspect: gl.getUniformLocation(barProg, 'uAspect') };
    } catch (e) {
      barProg = null; barU = null;
      log(`the panels' grab bars would not compile: ${e.message}`, 'warn');
      beacon(`FAIL grab bars · ${e.message} · the panels cannot be moved in this session`);
    }
    glCheck('bar');
    /**
     * The page's floor gets the context once, here, and never a second one.
     * ⚠️ SAME RULE AS THE BAR PROGRAM ABOVE: it may fail and the session goes on
     * without it, with the reason said in words rather than left as a black
     * floor somebody has to guess at. `attach` returning `false` is a refusal
     * and is treated exactly like a throw, so a surface that checks its own
     * capabilities does not have to invent an Error to report one.
     */
    if (theSurface) {
      try {
        if (theSurface.attach?.(gl) === false) throw new Error('it refused this context');
        state.surface = { attached: true, why: '', draws: 0 };
      } catch (e) {
        state.surface = { attached: false, why: e.message, draws: 0 };
        theSurface = null;
        log(`the floor would not build: ${e.message}`, 'warn');
        beacon(`FAIL surface · ${e.message} · the session runs with nothing on the ground`);
      }
      glCheck('surface');
    }
    const P = [-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0];
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(P), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    glCheck('quad');
    quad = { vao, count: 6 };
    // Context-wide, set once: a canvas is already the way up a texture wants
    // it, and flipping it here would put the footer above the picture.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    for (const p of panels) {
      for (const cv of [p.canvas, p.foot]) {
        if (!cv || tex.has(cv)) continue;
        const t = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        tex.set(cv, t);
      }
    }
    glCheck('textures');
    // ── the card's own stopwatch ─────────────────────────────────────────
    // 🔴 ASKED FOR BY NAME AND REPORTED WHEN IT IS NOT THERE. The one number
    // that says whether a live render is affordable is how long the CARD spends
    // on it, and CPU time cannot see that at all — GL commands are posted, not
    // executed. Where the driver has the extension this measures it; where it
    // does not, `liveGpuMs` stays NULL and `gpuTimer` says why, because a zero
    // here would read as "free".
    gpuTimerExt = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    state.gpuTimer = gpuTimerExt
      ? 'EXT_disjoint_timer_query_webgl2'
      : 'this driver has no GPU timer, so the card’s own time cannot be read from in here';
    // 🔴 THE LIVE RENDERERS COMPILE INTO THIS CONTEXT, WHICH IS THE WHOLE
    // POINT. A page's own WebGL canvas is a DIFFERENT context: its programs and
    // its textures do not exist here, so "the shader is already compiled" is
    // false and a panel drawn from it can only ever arrive as a copied bitmap.
    // Handing the session's own `gl` to the page's renderer is what makes the
    // picture in the headset a render rather than a photograph of one.
    for (const p of panels) {
      if (!p.live) continue;
      try {
        const ok = p.live.attach(gl);
        if (!ok) throw new Error('the renderer refused this context');
      } catch (e) {
        p.live = null;
        log(`the live picture would not compile in the headset's context: ${e.message}`, 'warn');
        beacon(`FAIL live panel · ${e.message} · falling back to the uploaded canvas`);
      }
    }
    glCheck('live');
    // The room compiles into the SAME context as the panels — one framebuffer,
    // one set of attribute slots, one clear rule. A second context here would
    // be a second thing to get `alpha: true` wrong on.
    if (theRoom) {
      theRoom.attach(gl);
      glCheck('room');
    }
    // 🔴 THE WAY OUT COMPILES HERE, WITH EVERYTHING ELSE. `build()` is where
    // this module's context comes into existence, so it is the earliest moment
    // the badge CAN be made, and making it here is what lets a laptop grade it
    // rather than a headset discovering the shader is broken at the moment
    // somebody needs to leave. Tried at construction first and it could not
    // work: `gl` is null until this function runs, and the swallowed error said
    // so only after `ensure` was made to report one.
    ensureQuit();
    glCheck('quit');
    return true;
  }

  /**
   * @param {'immersive-vr'|'immersive-ar'} [mode]
   *
   * 🔴 ONE ENTRY PATH, TWO MODES, AND THE SECOND IS ALMOST FREE *HERE* — which
   * is not the same as saying the two look alike. Every trap this file was
   * written for is about getting INTO a session and none of them is about which
   * kind, so the request line is the only branch. What genuinely differs is
   * three things, all of them downstream: the clear is transparent so the
   * compositor can put your room behind the page (`ar` in `theRoom.draw`), the
   * wall cube is not drawn, and **planes only arrive in an AR session** —
   * measured on a Quest 3, 11 surfaces against none, same room and same grant.
   */
  async function enter(mode = 'immersive-vr') {
    if (session) return true;
    if (!navigator.xr) { log('this browser has no WebXR at all', 'warn'); return false; }
    // 🔴 NO AWAIT BEFORE `requestSession`. The support answer is the one already
    // taken at load; asking again here can spend the user activation, and a
    // handler that throws where nothing is reporting is what produced a run
    // with no asserts at all on a real Quest.
    const wantAr = mode === 'immersive-ar';
    const can = wantAr ? supportedAr : supported;
    if (can === false) {
      log(wantAr
        ? 'this browser cannot show passthrough · nothing changes on this page'
        : 'no headset here · nothing changes on this page', 'warn');
      return false;
    }
    if (!gl) {
      try {
        if (!build()) { log('this browser gave no 3-D context, so there is nothing to draw with', 'bad'); return false; }
      } catch (e) { log(`the panel would not compile: ${e.message}`, 'bad'); return false; }
    }
    // ⚠️ A DEADLINE ON EVERY STEP. A rejected promise reports itself; one that
    // never settles does not, and that is what two headset runs looked like
    // from outside — a session somebody was standing in, with no line saying
    // which await had not come back.
    // 🔴 AND 6 s IS NOT A DEADLINE FOR A STEP THAT CAN ASK A HUMAN A QUESTION.
    // MEASURED on a Quest 3, 2026-09-13, on the page that shares this room:
    // `requestSession` did not hang — it was waiting for the owner to answer a
    // ROOM-DATA PERMISSION PROMPT, which appears because this session asks for
    // plane detection. The short deadline fired underneath it, the page
    // declared failure and tore its own entry path down, and THEN the session
    // started: a headset standing in an immersive session that no code owned,
    // drawing nothing. Black, and a restart to get out.
    //
    // ⚠️ THIS MODULE STILL HAD THE 6 s. `scene` was fixed and this was not, and
    // the two ask for the same optional feature — so the same black headset was
    // one permission prompt away on `mirror`. A step that can prompt gets a
    // human's worth of time and says what it is probably waiting for;
    // everything after the session is machinery and keeps the short one.
    const step = async (what, p, ms = 6000) => {
      beacon(`… ${what}`);
      const out = await Promise.race([p,
        new Promise((_, no) => setTimeout(() => no(new Error(
          `${what} did not answer in ${ms / 1000} s`
          + (ms > 6000 ? '. Is there a permission prompt waiting for you?' : ''))), ms))]);
      beacon(`ok  ${what}`);
      return out;
    };
    try {
      // ⚠️ `local-floor` IS REQUIRED, not optional: the panel hangs at eye
      // height measured from the floor, and on `local` the origin is wherever
      // your head happened to be when the session started.
      // 🔴 `plane-detection` IS OPTIONAL AND IT MUST STAY OPTIONAL. It is what
      // lets the dotted grid lie on the floor you are actually standing on
      // rather than on the page's guess at one — but a headset whose owner has
      // never run Space Setup, or who says no to the permission, must still get
      // a room. In `requiredFeatures` this line would turn "I have not mapped
      // my house" into "this page refuses to start", and the grid would be
      // gated on a thing it is not allowed to be gated on.
      // ⚠️ AND THE PROMISE IS KEPT, NOT ABANDONED. If the deadline wins, the
      // request is still in flight — and a session that arrives after the page
      // has given up is a headset in an immersive session nothing is drawing.
      // It is caught and ENDED, so the worst case is "it did not start" rather
      // than a black room and a restart.
      const ask = navigator.xr.requestSession(mode, {
        requiredFeatures: ['local-floor'],
        ...(theRoom ? { optionalFeatures: [...ROOM_OPTIONAL_FEATURES] } : {}),
      });
      let gaveUp = false;
      ask.then((late) => {
        if (!gaveUp) return;
        beacon('the session arrived after this page gave up waiting. Ending it rather than leaving you in a room nothing is drawing');
        try { late.end(); } catch { /* already gone */ }
      }, () => { /* a rejection is reported by the step below */ });
      // 🔴 90 s, BECAUSE THIS ONE ASKS YOU A QUESTION. See `step`.
      try {
        session = await step(`requestSession ${mode}`, ask, 90000);
      } catch (e) { gaveUp = true; throw e; }
      // ⚠️ The blend mode, not the session name — `markAsked` uses it to decide
      // what "no surfaces" is allowed to blame. Measured: a VR session returns
      // none however well the room is scanned.
      theRoom?.markAsked(session.environmentBlendMode === 'opaque');
      // ⚠️ EVERYTHING AFTER THE SESSION IS INSIDE THE SAME try. A throw from
      // makeXRCompatible, XRWebGLLayer or requestReferenceSpace escaping the
      // handler means the session STARTS and the page then dies with no line —
      // indistinguishable from the button never having been pressed.
      //
      // 🔴 AND `makeXRCompatible()` IS ONLY CALLED WHEN IT HAS SOMETHING TO DO.
      // The context above is created `xrCompatible: true`, so on a browser that
      // could honour that the call is a ritual — and it is not a free one.
      // MEASURED against a synthetic XRSystem on this laptop: it NEVER SETTLES,
      // so the 6 s deadline fired and tore down a session that was otherwise
      // fine. Ask the context what it already is (a capability test, the same
      // rule as everything else here) and only ask for the change when the
      // answer is no.
      if (gl.getContextAttributes?.()?.xrCompatible !== true) {
        await step('makeXRCompatible', gl.makeXRCompatible());
      } else {
        beacon('ok  the context was already made for a headset · makeXRCompatible not needed');
      }
      beacon('… XRWebGLLayer');
      session.updateRenderState({ baseLayer: new XRWebGLLayer(session, gl) });
      beacon('ok  XRWebGLLayer');
      space = await step('requestReferenceSpace local-floor', session.requestReferenceSpace('local-floor'));
    } catch (e) {
      log(`the headset refused · ${e.name}: ${e.message}`, 'bad');
      beacon(`FAIL session · ${e.name}: ${e.message}`);
      try { await session?.end(); } catch { /* it may never have started */ }
      session = null;
      return false;
    }
    // 🔴 NOTHING READS `session.renderState.baseLayer` HERE. It is null until
    // the next animation frame — see defect 1 at the top of this file.
    state.presenting = true; state.mode = mode;
    state.frames = 0; state.fps = null; state.worstGapMs = 0;
    state.blendMode = session.environmentBlendMode || null;
    // 🔴 THE BLEND MODE DECIDES WHETHER TO COMPOSITE, NEVER THE SESSION'S NAME.
    // A session can be called `immersive-ar` and still come back `opaque`, and
    // then clearing to transparent puts BLACK where the room should be — which
    // presents as a drawing bug rather than as a session one. This is the one
    // place the two are separated, and everything downstream reads `arMode`.
    arMode = state.blendMode === 'alpha-blend' || state.blendMode === 'additive';
    if (wantAr && !arMode) {
      log(`this session was asked for passthrough and composites ${state.blendMode || 'something it will not name'} · drawing it as an opaque room instead`, 'warn');
      beacon(`asked for ${mode} and got blend ${state.blendMode || 'not reported'} · NOT compositing over your room`);
    }
    state.frameRate = session.frameRate ?? null;
    try { state.supportedFrameRates = session.supportedFrameRates ? Array.from(session.supportedFrameRates) : null; }
    catch { state.supportedFrameRates = null; }
    placed = null; armed = false; armAt = performance.now();
    tick = 0; tickAt = performance.now(); lastFrame = 0;
    uploads.length = 0; state.uploadWorstMs = 0; state.drawCpuMs = null;
    liveMs.length = 0; gpuFull.length = 0; gpuHalf.length = 0;
    state.liveWorstMs = 0; state.liveGpuMs = null; state.liveHalfGpuMs = null;
    probeFrames = 0; state.liveWhereCost = 'not measured yet';
    state.grabbed = 0; state.grabMovedM = null;
    beacon(`session created · ${mode} · blend ${session.environmentBlendMode || 'not reported'} · refresh ${session.frameRate || 'not reported'}`
      + ` · picture ${liveOn && panels.some((p) => p.live) ? 'RENDERED LIVE in this session' : 'uploaded from a canvas'}`
      + ` · walls ${wantSky ? 'on' : 'off'} · objects ${wantThings ? 'on' : 'off'}`);
    log('you are in it · hold any controller button for three seconds to come back out', 'ok');

    session.addEventListener('end', () => {
      state.presenting = false; state.mode = 'window';
      session = null; space = null; placed = null; arMode = false;
      grabbing = null; aimedBar = null;
      log(`came back out · ${state.frames} frames drawn${state.fps ? ` at ${state.fps.toFixed(1)} a second` : ''}`);
      beacon(`session ended · ${state.frames} frames · ${state.fps ? state.fps.toFixed(1) : '—'} fps`
        + ` · picture ${liveOn ? 'live' : 'uploaded'} · ${state.liveWhereCost}`
        + ` · ${state.grabbed} panel move(s)`);
      try { onEnd?.(); } catch { /* the page's business */ }
    });
    // 🔴 THE TRIGGER GRABS AND NOTHING HERE LEAVES. There was a `leave()` in
    // this scope, called from `squeezestart`, and it is gone with every other
    // exit on 2026-09-17: the one way out is `xr-quit.mjs`'s long hold, which
    // is armed by the same `armed` flag below.
    // 🔴 A PRESS THAT LANDS ON THE TABLET BELONGS TO THE TABLET. Without this
    // the same trigger would move a slider AND drag the panel across the room,
    // two things from one press, one of which you did not ask for.
    // 🔴 THE BAR IS THE HANDLE, NOT THE PICTURE — see the note above BAR_FS. A
    // press anywhere else is a press on a picture and this module lets it go
    // past, which is what leaves the surface free for the page to use later.
    session.addEventListener('selectstart', (e) => {
      if (!armed) return;
      if (theHands?.over) { beacon('trigger on the tablet · the slider has it, the panel was not grabbed'); return; }
      if (!placed || !aimedBar) return;
      const src = e.inputSource?.targetRaySpace ? e.inputSource : null;
      if (!src) return;
      // ⚠️ THE HAND THAT IS POINTING IS THE HAND THAT GRABS. `aimedBar` was
      // taken from the POINTER's ray — the right hand's, by the one decision in
      // xr-hands.mjs — so accepting a press from the other hand would drag the
      // thing this hand is aiming at with the hand that is not. It cannot
      // happen with one controller, which is what this user has; it is one line
      // and it stops the two-controller case being a surprise.
      const pointerSrc = theHands?.state?.pointerSrc;
      if (pointerSrc && src !== pointerSrc) {
        beacon('trigger on the hand that is not pointing · nothing grabbed');
        return;
      }
      grabbing = { i: aimedBar.i, src, local: null, from: null };
      beacon(`grabbed panel ${aimedBar.i} by its bar at ${aimedBar.t.toFixed(2)} m`);
    });
    session.addEventListener('selectend', () => {
      if (grabbing && grabbing.from && placed) {
        const M = placed[grabbing.i];
        const moved = Math.hypot(M[12] - grabbing.from[0], M[13] - grabbing.from[1], M[14] - grabbing.from[2]);
        state.grabbed++;
        state.grabMovedM = moved;
        // 🔴 THE FULL CYCLE, NAMED, BECAUSE THIS DRAG HAS NEVER RUN. Until the
        // exit scan stopped eating button 0 the trigger armed a drag and the
        // next frame ended the session, so "press, move, release" had no
        // evidence anywhere that it works. One line per completed cycle is that
        // evidence, and `grabbed`/`grabMovedM` are its machine copy.
        beacon(`released panel ${grabbing.i} after moving it ${moved.toFixed(2)} m`
          + ` · it is now ${state.panelsAt?.[grabbing.i]?.dist?.toFixed?.(2) ?? '—'} m from you, facing you`);
      }
      grabbing = null;
    });
    // 🔴 THE GRIP NO LONGER LEAVES, AND NEITHER DOES ANYTHING ELSE ON THIS
    // PAGE. 2026-09-17: *"make one general way to get out ... no other exit
    // methods/ui's for now."* `squeezestart` ended the session here, which was
    // an exit nothing on screen ever named and which sat next to the trigger
    // people drag panels with. The one way out is a long hold on any button,
    // with a ring at the controller saying how far it has got.
    // ⚠️ AND A DEAD-MAN'S SWITCH. If nothing has been drawn 4 s after the
    // session started, the room is black and staying black: end it and say so
    // rather than leaving somebody standing in it.
    setTimeout(() => {
      if (session && state.frames === 0) {
        beacon('FAIL no frame drawn 4 s after the session started · leaving on my own');
        log('the headset session drew nothing. Ended it rather than leave you in the dark', 'bad');
        session.end().catch(() => {});
      }
    }, deadManMs);
    // 🔴 THE WAY OUT JOINS THE SESSION HERE, AND THIS IS THE ONE LINE THAT
    // MATTERS. `mountXRQuit` puts its own callback on the session's frame loop,
    // so the hold advances from this moment whatever happens to the render loop
    // below it. It is before `requestAnimationFrame(onXR)` on purpose: if the
    // page's own loop throws on its first frame, the exit is already running.
    ensureQuit(session);
    session.requestAnimationFrame(onXR);
    beacon('session running · requestAnimationFrame registered');
    return true;
  }

  /**
   * ONE VIEW OF EVERYTHING THIS MODULE DRAWS.
   *
   * 🔴 EXTRACTED SO A LAPTOP CAN RUN IT. Every pixel below used to exist only
   * inside `onXR`, which needs an XRSession — so the only machine that could
   * ever find a pending `gl.getError()`, a shader that will not compile or a
   * quad drawn inside-out was a headset, on a page that gets one run. `preview`
   * at the bottom of this file drives this same function with a hand-made
   * projection into an off-screen canvas, which is how the suite reaches it.
   *
   * ⚠️ THE CALLER OWNS THE VIEWPORT AND THE SCISSOR, because in a session those
   * come out of the layer and this function has no business asking for them.
   */
  function drawEye(proj, viewM, eye, tSec, hp, theGlow) {
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    // 🔴 ONLY THE FIRST VIEW CLEARS COLOUR — defect 3. `gl.clear` ignores the
    // viewport and both eyes share one framebuffer, so a colour clear on the
    // second view wipes the first eye's picture and the headset goes black.
    // The room does exactly the same arithmetic when it is drawing, which is
    // why `clear` is handed to it rather than done twice.
    if (theRoom?.ok) {
      theRoom.draw({
        proj, view: viewM, tSec, doc: drawnDoc, clear: eye === 0, ar: arMode,
        eye: [hp.x, hp.y, hp.z],
        // 🔴 THE WALLS, OR NOT. In passthrough there is no sky to draw because
        // your room is behind the page; with `sky: false` there is none because
        // the page said so. The two arrive here as one picture, which is the
        // whole of why this module can offer both modes out of one draw call.
        sky: wantSky, bg: roomBg, glow: theGlow,
        // The beam ends on the bar it is on, or on the panel it is holding —
        // `xr-room.mjs` already has that rule for `scene`'s things and the
        // tablet, and a pointer that behaves differently per page is two
        // pointers to learn.
        aimedDist: aimedBar ? aimedBar.t : 0,
        held: grabbing ? { i: -1, dist: grabDist } : null,
      });
      // ⚠️ THE PANELS ARE IN FRONT OF THE ROOM, ON PURPOSE, and this one
      // line is what says so. A thing from the room standing between you and
      // the panel would hide the numbers this page exists to report — and
      // unlike `scene`'s things, nothing here can pick it up and move it out
      // of the way. Clearing depth inside this eye's scissor puts the room
      // behind the screen and leaves the screen readable.
      gl.enable(gl.SCISSOR_TEST);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.disable(gl.SCISSOR_TEST);
    } else if (eye === 0) {
      // ⚠️ TRANSPARENT IN PASSTHROUGH HERE TOO. A page with no room still has
      // to let the compositor put your room behind it, and clearing to an
      // opaque colour is exactly the `alpha: false` failure one level up.
      if (arMode) gl.clearColor(0, 0, 0, 0);
      else gl.clearColor(clear[0], clear[1], clear[2], clear[3]);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    } else {
      // Each eye still needs its OWN depth, or it tests against the first
      // eye's depths and drops the picture. A scissor is what makes a clear
      // respect a region; a viewport is not a clip.
      gl.enable(gl.SCISSOR_TEST);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.disable(gl.SCISSOR_TEST);
    }
    // ── the page's floor ─────────────────────────────────────────────────
    // 🔴 AFTER THE ROOM AND BEFORE THE PANELS, because it is the GROUND: the
    // room's grid is under it and the panels stand over it. The room branch
    // above has just cleared depth inside this eye's scissor, so the floor is
    // never occluded by a wall, which is the whole reason it is drawn here
    // rather than with the room.
    if (theSurface) {
      // 🔴 THE FRAMEBUFFER IS REMEMBERED AND PUT BACK, AND THIS IS THE BUG THE
      // PREVIEW FOUND ON ITS FIRST RUN, ONE LEVEL UP. A page that renders its
      // own chain leaves ITS framebuffer bound and hands back a texture that is
      // that framebuffer's colour attachment; sampling it while drawing into it
      // is a feedback loop, which WebGL answers with GL_INVALID_OPERATION and a
      // frame with nothing in it. In a session the layer's framebuffer is the
      // one that must be bound, and it is bound long before this line.
      // 🔴 THE LAYER'S FRAMEBUFFER BY NAME, NEVER `getParameter`. MEASURED on a
      // Quest the first time a page used this: `gl bindFramebuffer:1282` on the
      // first headset frame. An `XRWebGLLayer`'s framebuffer is OPAQUE — the
      // spec forbids inspecting it — so reading it back and binding what comes
      // out is asking the driver a question it is entitled to refuse. The
      // session already knows which framebuffer this frame is drawing into.
      // ⚠️ `?? null` IS THE WINDOW CASE. `preview()` runs `drawEye` with no
      // session at all, where the default framebuffer is the right answer.
      const fbWas = session?.renderState?.baseLayer?.framebuffer ?? null;
      try {
        theSurface.draw({ proj, view: viewM, eye: [hp.x, hp.y, hp.z], tSec,
          // ONE triple: what this frame was actually cleared to. See `surface`.
          bg: roomBg || [clear[0], clear[1], clear[2]] });
        state.surface.draws++;
      } catch (e) {
        theSurface = null;
        state.surface = { attached: false, why: `it threw while drawing: ${e.message}`,
          draws: state.surface.draws };
        log(`the floor threw and was taken down: ${e.message}`, 'bad');
        beacon(`FAIL surface draw · ${e.message}`);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbWas);
      // ⚠️ AND THE STATE THE PANELS ASSUME. They are drawn unblended with depth
      // writing, and a surface that left `BLEND` on or `depthMask` off would
      // make them translucent for a reason nothing in their own code says. The
      // VAO, the program and face culling are set by the panels themselves a
      // few lines down, so only these two need putting back.
      gl.disable(gl.BLEND);
      gl.depthMask(true);
    }
    // ⚠️ A SCREEN HAS NO BACK. The room turns face culling ON (it has to —
    // its walls are a cube seen from the inside), and a panel you can walk
    // behind and find gone is a panel that looks broken rather than
    // one-sided. Turned off again for the panels, every frame, because the
    // room's state is the room's business and this is the only place that
    // knows a quad is a screen.
    gl.disable(gl.CULL_FACE);
    gl.useProgram(prog);
    gl.uniformMatrix4fv(U.proj, false, proj);
    gl.uniformMatrix4fv(U.view, false, viewM);
    gl.bindVertexArray(quad.vao);
    panels.forEach((p, i) => {
      const useLive = liveOn && p.live && p.liveTex;
      const t = useLive ? p.liveTex : tex.get(p.canvas);
      if (!t) return;
      gl.uniformMatrix4fv(U.model, false, placed[i]);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.uniform1i(U.tex, 0);
      // The footer strip is only a second texture on a live panel — an
      // uploaded canvas already has its numbers drawn into it by panel.mjs.
      const footTex = useLive && p.foot ? tex.get(p.foot) : null;
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, footTex || t);
      gl.uniform1i(U.footTex, 1);
      gl.uniform1f(U.foot, footTex ? (p.footFrac ?? 0.11) : 0);
      // The same radius panel.mjs clips its own canvas to — 18 of its 400 css
      // units of height — so the two kinds of panel are the same shape.
      gl.uniform1f(U.round, useLive ? 0.045 : 0);
      gl.uniform1f(U.aspect, (p.w ?? 1.2) / (p.h ?? 0.75));
      gl.drawArrays(gl.TRIANGLES, 0, quad.count);
    });
    gl.activeTexture(gl.TEXTURE0);
    // ── the grab bars ────────────────────────────────────────────────────
    // ⚠️ AFTER the panels and BLENDED, because the capsule is transparent at
    // its rim. Depth WRITE off for the same reason a transparent quad never
    // writes depth: it would punch a hole the second eye cannot fill.
    if (barProg && placed) {
      gl.useProgram(barProg);
      gl.uniformMatrix4fv(barU.proj, false, proj);
      gl.uniformMatrix4fv(barU.view, false, viewM);
      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      panels.forEach((p, i) => {
        const bw = (p.w ?? 1.2) * PLACE.barShare;
        const held = grabbing?.i === i;
        // ONE LOOK FOR "THE RAY IS ON THIS" — the table at the top of this
        // file, the same one `scene`'s things use. Brighter AND bigger,
        // because in a headset brightness alone reads as "that one is pale".
        const tch = touchOf(held, aimedBar?.i === i);
        gl.uniformMatrix4fv(barU.model, false,
          barOf(placed[i], p.h ?? 0.75, bw * tch.scale, PLACE.barH * tch.scale, PLACE.barGap));
        gl.uniform1f(barU.aspect, bw / PLACE.barH);
        // 🔴 MONOCHROME, LIGHTENING UP WHEN NEEDED. Instructed 2026-09-17:
        // *"make it monochrome, just lightening up when needed."* It was a
        // cold blue-grey at rest and YELLOW with hold of something, and the
        // yellow is the site's "this is the thing that is running" colour spent
        // on a handle. A handle has one thing to say and it is HOW IT LANDED —
        // nothing, the ray is on it, you have hold of it — which is three
        // brightnesses of one grey and needs no hue at all. It is the same
        // decision the pointer took on the same day, so the ray and the thing
        // it lands on now answer in the same channel.
        // ⚠️ `tch.lit` IS THE SCALE AND IT IS NOT LINEAR IN THE GREY. 1.00,
        // 1.35 and 1.80 against a 0.50 base gives 0.50, 0.68 and 0.90, which
        // stays inside the range rather than clipping to white at the aimed
        // step and having nothing left for held.
        const g = Math.min(1, 0.50 * tch.lit);
        gl.uniform3fv(barU.col, [g, g, g]);
        gl.uniform1f(barU.alpha, held ? 1 : 0.85);
        gl.drawArrays(gl.TRIANGLES, 0, quad.count);
      });
      gl.depthMask(true);
      gl.disable(gl.BLEND);
    }
    // ⚠️ LAST IN THE EYE, AFTER EVERYTHING ELSE. The badge is the one thing in
    // here that must never be behind a panel: it is how somebody leaves, and a
    // way out you cannot see is the failure the module already has a dead-man's
    // switch for. Its own program binds what it needs and this one has finished
    // with the state.
    // 🔴 THE VIEW MATRIX, NOT A LIST OF GRIPS. The ring is head locked since
    // 2026-09-19, so where it goes comes out of the matrix this eye is already
    // being projected with: no hand has to be reporting a pose for there to be
    // a way out, which is what a session driven by tracked hands has.
    ensureQuit(session)?.draw(mul(proj, viewM), viewM);
    gl.bindVertexArray(null);
  }

  function onXR(now, frame) {
    if (!session) return;
    session.requestAnimationFrame(onXR);
    const pose = frame.getViewerPose(space);
    if (!pose) return;
    // ⚠️ HOW LONG THIS FRAME WAS IS WORKED OUT WHERE IT IS USED. There was one
    // here for the way out, capped at 0.1 s because a headset that stalled for
    // a second must not advance a hold by a second. The way out measures its
    // own frames now and caps them the same way, and the stick push below
    // keeps its own.
    // 🔴 THE LAYER IS READ HERE, INSIDE THE CALLBACK, WHERE IT EXISTS.
    const layer = session.renderState.baseLayer;
    if (!layer) return;
    state.frames++;

    // Arm the trigger and the thumbstick once every button is up, or after 3 s
    // regardless, so a stuck button cannot be the reason nothing on this page
    // works.
    // ⚠️ THIS USED TO ARM THE WAY OUT TOO, AND THAT MOVED RATHER THAN WENT.
    // The press that opened this page's own button may still be down as the
    // session starts, and it IS one of the buttons the hold counts, so without
    // that guard the session would end about three seconds after it began.
    // `xr-quit.mjs` carries it for every page now: see ARM_MS in that file. The
    // flag is kept here because the trigger and the stick want the same answer.
    if (!armed) {
      let anyDown = false;
      for (const src of session.inputSources) {
        for (const b of src.gamepad?.buttons || []) if (b.pressed) anyDown = true;
      }
      if (!anyDown || performance.now() - armAt > 3000) armed = true;
    } else {
      // 🔴 THE WAY OUT IS NOT READ HERE ANY MORE, AND ITS ABSENCE IS THE POINT.
      // There was an `ensureQuit()?.update(session.inputSources, dtSec)` on
      // this line, which is the line `/blocks/` never wrote: it built the
      // badge, drew it at both hands every frame and never advanced the hold,
      // so there was no way out of that page at all and no shared code was
      // wrong. The hold now runs on the session's own frame loop from inside
      // `mountXRQuit`, so there is nothing here to forget and nothing here that
      // can be deleted by accident.
      //
      // 🔴 THE THUMBSTICK IS THE A/B SWITCH AND IT IS NOT AN EXIT. The one
      // thing a headset run of this page has to do is compare the picture
      // RENDERED HERE against the same picture UPLOADED from a canvas, and a
      // comparison you have to take the headset off to make is not one anybody
      // will make. Click the stick and the panels swap path; the rate, the
      // card's own time and the verdict are all published and beaconed.
      // ⚠️ It is the CLICK, and only while nothing is held: pushing the same
      // stick is how a held panel is pushed away and pulled back, so the two
      // gestures cannot collide.
      for (const src of session.inputSources) {
        const bs = src.gamepad?.buttons || [];
        const stick = !!bs[BUTTON.thumbstick]?.pressed;
        if (stick && !stickWasDown && !grabbing) setLive(!liveOn, 'the thumbstick');
        stickWasDown = stickWasDown || stick;
      }
      // One rising edge per press: cleared only when every stick is up.
      if (![...session.inputSources].some((s) => s.gamepad?.buttons?.[BUTTON.thumbstick]?.pressed)) {
        stickWasDown = false;
      }
    }

    // ── the page redraws its canvases, ONCE per frame ──────────────────────
    // ⚠️ NOT PER EYE. Two views share one framebuffer and one picture; drawing
    // the source twice would double the cost this page exists to measure and
    // show the two eyes two different instants, which reads as a headache
    // rather than as a bug.
    const t0 = performance.now();
    try { onFrame?.({ frame, pose, session }); } catch (e) { log(`the picture threw: ${e.message}`, 'bad'); }
    const t1 = performance.now();
    state.drawCpuMs = t1 - t0;

    // ── and the panels go to the card ─────────────────────────────────────
    // ⚠️ `texImage2D` EVERY FRAME, ON PURPOSE, because that is the cost
    // `plan-xr-room.md` §2 asks about ("each panel is a texImage2D from a
    // <video> per frame — measure one panel first"). `texSubImage2D` after the
    // first upload would skip the reallocation and is the obvious next lever;
    // measure it against this number rather than instead of it.
    //
    // 🔴 A LIVE PANEL SKIPS ALL OF THIS, WHICH IS HALF OF WHAT IT BUYS. Its
    // picture is already in this context as a framebuffer's texture, so there
    // is no canvas, no compose and no copy across the bus — only the footer's
    // strip, which is a ninth of the pixels and only redrawn when a number
    // moves. The other half is that the picture is a RENDER rather than a
    // photograph of one taken a frame ago.
    gpuPoll();
    for (const p of panels) {
      if (liveOn && p.live) continue;
      const t = tex.get(p.canvas);
      if (!t) continue;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, p.canvas);
      if (state.frames === 1) glCheck('upload');
    }
    for (const p of panels) {
      // The footer strip belongs to the live path and is uploaded only when its
      // own version counter moved — it is numbers, and numbers change at human
      // pace, so a copy a frame would be measuring an instrument nobody reads.
      if (!p.foot || !(liveOn && p.live)) continue;
      const v = p.footVersion?.() ?? 0;
      if (v === p.__footAt) continue;
      const t = tex.get(p.foot);
      if (!t) continue;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, p.foot);
      p.__footAt = v;
      if (state.frames === 1) glCheck('footer');
    }
    const cost = performance.now() - t1;
    uploads.push(cost);
    if (uploads.length > 120) uploads.shift();
    state.uploadCpuMs = median(uploads);
    state.uploadWorstMs = Math.max(state.uploadWorstMs ?? 0, cost);

    // ── the picture, drawn HERE, in this session's own context ────────────
    // 🔴 ONCE PER FRAME, NEVER PER EYE. Both eyes sample one texture; rendering
    // it twice would double the cost this page exists to measure AND show the
    // two eyes two different instants, which reads as a headache rather than as
    // a bug. It also happens BEFORE the framebuffer is bound, because the
    // renderer binds one of its own and the next line takes it back.
    const t2 = performance.now();
    if (liveOn) {
      const timed = gpuBegin('live');
      for (const p of panels) {
        if (!p.live) continue;
        try { p.liveTex = p.live.draw({ tSec: now / 1000 }); }
        catch (e) {
          p.live = null; p.liveTex = null;
          log(`the live picture stopped drawing: ${e.message}`, 'bad');
          beacon(`FAIL live panel while drawing: ${e.message} · back to the uploaded canvas`);
        }
      }
      if (timed) gpuEnd();
      // ── the one-shot size probe ────────────────────────────────────────
      // A quarter of the pixels, into a scratch target nobody ever sees, for a
      // handful of frames once the session has settled. Two points is the
      // minimum that can say whether resolution is the lever, and a probe that
      // ran forever would be a cost pretending to be a measurement.
      if (state.frames > 120 && probeFrames < 10 && gpuHalf.length < 6 && !gpuQ) {
        const one = panels.find((p) => p.live?.probe);
        if (one) {
          probeFrames++;
          if (gpuBegin('half')) {
            try { one.live.probe({ scale: 0.5, tSec: now / 1000 }); } catch { /* the probe is never the product */ }
            gpuEnd();
          }
        } else { probeFrames = 10; }
      }
    }
    const liveCost = performance.now() - t2;
    if (liveOn) {
      liveMs.push(liveCost);
      if (liveMs.length > 120) liveMs.shift();
      state.liveCpuMs = median(liveMs);
      state.liveWorstMs = Math.max(state.liveWorstMs ?? 0, liveCost);
    }
    // ⚠️ THE VERDICT IS BUILT ONCE A SECOND, NOT ONCE A FRAME. It is a sentence
    // with four numbers formatted into it; ninety of those a second is a cost
    // inside the measurement the sentence is about.

    // ── your real floor and walls, if this headset will say ───────────────
    // ⚠️ ONCE PER FRAME, BEFORE THE EYE LOOP — the answer is the same for both
    // eyes. 🔴 AND IT CANNOT THROW: `frame.detectedPlanes` raises on a session
    // that was not granted the feature, and an uncaught error in a frame
    // callback does not stop the loop, it silently deletes everything below it.
    // The module swallows it, marks the session refused and stops asking.
    theRoom?.observePlanes(frame, space);

    // 🔴 ONE INPUT PATH, THE SAME ONE `scene` USES, AND IT HAS NO SESSION MODE
    // IN IT. Once per frame, never per eye, and it cannot throw — every read
    // inside it is guarded, because an uncaught error in a frame callback does
    // not stop the loop, it silently deletes everything below it.
    if (theHands && theRoom) {
      const seen = theHands.observe(frame, space, session);
      // The room draws what is in `hands`; everything else in here is input.
      theRoom.setInput({
        ...seen,
        ...(wantHands ? {} : { hands: [] }),
        ...(wantTablet && !arMode ? {} : { tabletM: null, hit: null }),
      });
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);
    if (state.frames === 1) glCheck('bindFramebuffer');
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    const hp = pose.transform.position;
    if (!placed) {
      const hm = pose.transform.matrix;
      const n = panels.length;
      placed = panels.map((p, i) => placeFacing(
        hm, hp, p.w ?? 1.2, p.h ?? 0.75, p.dist ?? dist,
        // One panel is straight ahead; several fan out around you, which is
        // where `plan-xr-room.md` §2 is going.
        n === 1 ? 0 : (i - (n - 1) / 2) * fan));
      grabDist = panels[0]?.dist ?? dist;
    }

    // ── dragging ─────────────────────────────────────────────────────────
    //
    // 🔴 WHAT THE QUEST LOBBY DOES WITH A SCREEN, AS CLOSELY AS THIS PAGE CAN
    // SAY IT: you take a bar under the panel, it rides your ray keeping the
    // offset you grabbed it at, it turns to face you CONTINUOUSLY WHILE HELD so
    // you can see what you are placing, and it HOLDS that facing the moment you
    // let go. A panel you hung stays hung.
    //
    // ⚠️ THE SWIMMING ARGUMENT IS WHY IT IS ONLY WHILE HELD. This module already
    // says a panel is placed in the room rather than pinned to your face,
    // because a thing that follows you cannot be looked away from — and two
    // panels both re-aiming forever would read as the ROOM turning rather than
    // as you turning, on a page whose whole subject is two pictures held side by
    // side. Billboarding is only harmless while you are the one moving it.
    //
    // ⚠️ BOTH AXES, ROLL PINNED TO THE ROOM, AND AIMED AT THE HEAD — see `facing`.
    if (grabbing && placed && grabbing.src) {
      const rp = frame.getPose(grabbing.src.targetRaySpace, space);
      if (rp) {
        const m = rp.transform.matrix, o = rp.transform.position;
        const M = placed[grabbing.i];
        const p = panels[grabbing.i];
        const wM = p.w ?? 1.2, hM = p.h ?? 0.75;
        if (!grabbing.local) {
          grabbing.local = grabOffset(M, m, o);
          grabbing.from = [M[12], M[13], M[14]];
        }
        // Push and pull along the ray with the same stick whose CLICK swaps the
        // picture's path — they cannot collide, because the click is ignored
        // while something is held.
        const ay = grabbing.src.gamepad?.axes?.[AXIS.stickY] ?? 0;
        if (Math.abs(ay) > PLACE.stickDead && lastFrame) {
          const dt = Math.min(0.1, (now - lastFrame) / 1000);
          // -Z is forward, so pushing the stick FORWARD (a negative axis on the
          // xr-standard mapping) must make the local z MORE negative.
          grabbing.local[2] += ay * PLACE.pushPerSec * dt;
        }
        // 🔴 THE BOUND AND THE FACING ARE `heldAt` AND `facing`, WHICH ARE
        // EXPORTED AND TESTED. A drag cannot be tried without a headset, so the
        // arithmetic is pure and this page's own checks drive it with a made-up
        // pose — against these functions, not against a second copy of them.
        const c = heldAt(m, o, grabbing.local, hp, theRoom?.planes?.floorY ?? 0);
        placed[grabbing.i] = facing(c, hp, wM, hM);
        grabDist = Math.hypot(c[0] - o.x, c[1] - o.y, c[2] - o.z);
      }
    }

    // ── where each panel is, and which bar the ray is on ──────────────────
    // ⚠️ ONE ANSWER, TAKEN ONCE A FRAME, READ BY THE BEAM, THE HIGHLIGHT AND
    // THE PRESS. Asking again inside `selectstart` would be a second opinion
    // about where the pointer is, and the press could land on a bar the picture
    // never lit — two truths about one pointer.
    aimedBar = null;
    const ray = theHands?.pointer || null;
    if (placed && barProg && ray?.o && ray?.dir && !grabbing && !theHands?.over) {
      const o = ray.o, d = ray.dir;
      for (let i = 0; i < panels.length; i++) {
        const p = panels[i];
        const bw = (p.w ?? 1.2) * PLACE.barShare;
        const hit = pickQuad(barOf(placed[i], p.h ?? 0.75, bw, PLACE.barH, PLACE.barGap), o, d);
        if (hit && (!aimedBar || hit.t < aimedBar.t)) aimedBar = { i, t: hit.t };
      }
    }
    state.panelsAt = placed
      ? placed.map((M) => ({
        x: M[12], y: M[13], z: M[14],
        dist: Math.hypot(M[12] - hp.x, M[13] - hp.y, M[14] - hp.z),
      }))
      : null;

    // ── the fake light the pictures throw on the floor ────────────────────
    // The colour is the page's — it is the one thing here that has seen the
    // picture — and the place is the middle of wherever the panels ended up, so
    // moving them moves the pool. See GRID_FS in xr-room.mjs for what this is
    // and, more to the point, what it is not.
    let theGlow = null;
    if (glow && placed?.length) {
      let g = null;
      try { g = glow(); } catch { g = null; }
      if (g && g.amp > 0) {
        let sx = 0, sy = 0, sz = 0;
        for (const M of placed) { sx += M[12]; sy += M[13]; sz += M[14]; }
        theGlow = { col: g.col, at: [sx / placed.length, sy / placed.length, sz / placed.length],
                    radius: g.radius ?? 2.2, amp: g.amp };
      }
    }
    state.glow = theGlow
      ? { col: [...theGlow.col], amp: theGlow.amp, at: [...theGlow.at] }
      : null;

    let eye = 0;
    for (const view of pose.views) {
      const vp = layer.getViewport(view);
      gl.viewport(vp.x, vp.y, vp.width, vp.height);
      gl.scissor(vp.x, vp.y, vp.width, vp.height);
      drawEye(view.projectionMatrix, view.transform.inverse.matrix, eye, now / 1000, hp, theGlow);
      eye++;
    }

    if (state.frames === 1) {
      const vp0 = layer.getViewport(pose.views[0]);
      state.fb = { w: layer.framebufferWidth, h: layer.framebufferHeight };
      state.eye = { w: vp0.width, h: vp0.height };
      state.views = pose.views.length;
      // ⚠️ ASSERT ON THE ERROR FLAG. A page will render a right-looking picture
      // with an error pending — a Quest did exactly that for a mismatched
      // attribute binding nobody would have seen by looking.
      glCheck('firstDraw');
      // The first phase that was dirty, not merely that one was.
      state.glError = glErrors.length ? Number(glErrors[0].split(':')[1]) : 0;
      state.glWhere = glErrors.join(' ') || 'clean';
      beacon(`first headset frame · fb ${state.fb.w}x${state.fb.h} · ${state.views} views · eye0 ${state.eye.w}x${state.eye.h} · gl ${state.glWhere}`
        + ` · ${panels.length} panel(s)`
        + ` · picture ${liveOn && panels.some((p) => p.live)
          ? `RENDERED HERE at ${state.livePixels?.w}x${state.livePixels?.h}`
          : `uploaded at ${panels[0]?.canvas?.width ?? '?'}x${panels[0]?.canvas?.height ?? '?'}`}`
        + ` · grab bars ${barProg ? 'drawing' : 'WOULD NOT COMPILE'}`
        + ` · ${state.gpuTimer}`
        + (theRoom ? ` · room seed ${roomSeed}, ${drawnDoc.things.length} of ${roomDoc.things.length} things drawn · walls ${wantSky ? 'on' : 'OFF'} · grid ${theRoom.hasGrid ? 'drawing' : 'NOT drawing'} on ${theRoom.planes.from}` : ' · no room, the panel hangs in nothing'));
      // The line to hold beside the other page's, and beside the other mode's.
      beacon(`controller interface · ${theHands ? theHands.fingerprint() : 'NONE BUILT'}`
        + ` · its face ${theRoom?.hasTablet ? 'compiled' : 'WOULD NOT COMPILE, so there is no tablet in here'}`
        + ' · nothing before this dot depends on which kind of session this is');
      log(`drawing ${state.fb.w}x${state.fb.h}, ${state.eye.w}x${state.eye.h} an eye`, 'hi');
    }

    // Frame rate, counted over a one-second window — the same way the flat
    // panes on this page count theirs, so the two numbers are comparable.
    tick++;
    if (now - tickAt >= 1000) {
      verdictOnCost();
      state.fps = tick * 1000 / (now - tickAt);
      tick = 0; tickAt = now;
      // 🔴 THE RATE AND WHAT IT WAS PAID FOR, ON ONE LINE. A page that gets
      // slower without saying so leaves the reader inferring it from how it
      // feels; this says which path drew the second, what the card spent on it
      // and what the picture is doing to the floor.
      beacon(`${state.frames} frames · ${state.fps.toFixed(1)} fps · worst gap ${state.worstGapMs.toFixed(1)} ms`
        + ` · picture ${liveOn ? 'live' : 'uploaded'}`
        + ` · upload ${state.uploadCpuMs == null ? '—' : state.uploadCpuMs.toFixed(2)} ms cpu`
        + ` · live ${state.liveCpuMs == null ? '—' : state.liveCpuMs.toFixed(2)} ms cpu`
        + ` / ${state.liveGpuMs == null ? 'no gpu timer' : `${state.liveGpuMs.toFixed(3)} ms gpu`}`
        + ` · glow ${state.glow ? `${state.glow.amp.toFixed(3)} at rgb ${state.glow.col.map((v) => v.toFixed(2)).join(',')}` : 'none'}`);
    }
    if (lastFrame) state.worstGapMs = Math.max(state.worstGapMs, now - lastFrame);
    lastFrame = now;
  }

  /**
   * 🔴 THE SAME PICTURE, DRAWN ON A LAPTOP, SO THE SUITE CAN FIND WHAT ONLY A
   * HEADSET USED TO FIND.
   *
   * Everything this module draws lived behind `requestSession`, so a shader
   * that would not compile, a quad wound inside-out or a pending
   * `gl.getError()` cost a headset run to discover — and the owner gets one run.
   * This builds the same context, attaches the same room and the same live
   * renderers, and drives `drawEye` TWICE per frame with a hand-made projection
   * into an off-screen canvas nobody sees, so the error flag, the compile and
   * the ink are all gradeable here.
   *
   * ⚠️ WHAT IT IS NOT: a frame rate. There is no compositor, no reprojection
   * and no 3360x1760 framebuffer, so nothing about timing measured in here
   * describes a headset — the same refusal `verify-gl.mjs` makes about
   * SwiftShader, for the same reason. It answers "does it draw and is it
   * clean", and those are the two questions a laptop can answer.
   *
   * @returns {Promise<object>} what it found, including a pixel spread so a
   *          page can assert there is a picture rather than a flat field.
   */
  async function preview({ frames = 8, width = 512, height = 320, eyeAt = [0, 1.6, 0],
                           snapshot = false } = {}) {
    // ⚠️ NEVER WHILE A SESSION IS RUNNING. It resizes the context's canvas and
    // rewrites where the panels are — harmless on a laptop, and in a headset it
    // would move somebody's room while they were standing in it.
    if (session) return { ok: false, why: 'a session is running; the preview is for a window' };
    if (!gl) {
      try { if (!build()) return { ok: false, why: 'this browser gave no 3-D context' }; }
      catch (e) { return { ok: false, why: e.message }; }
    }
    const cv = gl.canvas;
    cv.width = width; cv.height = height;
    const hp = { x: eyeAt[0], y: eyeAt[1], z: eyeAt[2] };
    // A 70-degree field down a 16:10 window, and a head looking along -Z — the
    // same convention `placeFacing` reads out of a real pose matrix.
    const f = 1 / Math.tan((70 * Math.PI / 180) / 2);
    const asp = width / height;
    const proj = new Float32Array([f / asp, 0, 0, 0, 0, f, 0, 0, 0, 0, -1.0002, -1, 0, 0, -0.02, 0]);
    const viewM = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -hp.x, -hp.y, -hp.z, 1]);
    const headM = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, hp.x, hp.y, hp.z, 1]);
    placed = panels.map((p, i) => placeFacing(
      headM, hp, p.w ?? 1.2, p.h ?? 0.75, p.dist ?? dist,
      panels.length === 1 ? 0 : (i - (panels.length - 1) / 2) * fan));
    for (let n = 0; n < frames; n++) {
      // ⚠️ THE WAIT COMES FIRST, NOT LAST. With no `preserveDrawingBuffer` the
      // default framebuffer is not readable once the frame has been presented —
      // so a `readPixels` after the final `requestAnimationFrame` samples a
      // cleared surface and reports a flat field on a picture that is fine.
      // That is this page's oldest recurring failure in a new costume.
      if (n) await new Promise((r) => requestAnimationFrame(r));
      gpuPoll();
      const tSec = performance.now() / 1000;
      try { onFrame?.({ frame: null, pose: null, session: null }); } catch { /* the page's business */ }
      if (liveOn) {
        // 🔴 THE SAME STOPWATCH THE HEADSET USES. A laptop cannot say what an
        // Adreno will do — that is the SwiftShader refusal again — but it CAN
        // say what one pass of this shader costs on the card in front of it,
        // and it can prove the instrument works before the one headset run that
        // has to produce the number that matters.
        // ⚠️ The size probe alternates with the full pass rather than running
        // beside it, because only one TIME_ELAPSED query may be in flight.
        const half = n >= 4 && gpuHalf.length < 6 && panels.some((p) => p.live?.probe);
        const timed = gpuBegin(half ? 'half' : 'live');
        if (half) {
          for (const p of panels) {
            if (!p.live?.probe) continue;
            try { p.live.probe({ scale: 0.5, tSec }); } catch { /* the probe is never the product */ }
          }
          if (timed) gpuEnd();
        }
        for (const p of panels) {
          if (!p.live) continue;
          try { p.liveTex = p.live.draw({ tSec }); } catch (e) { p.live = null; p.liveTex = null; glErrors.push(`livePreview:${e.message}`); }
        }
        if (timed && !half) gpuEnd();
      }
      for (const p of panels) {
        const c = (liveOn && p.live) ? p.foot : p.canvas;
        const t = c && tex.get(c);
        if (!t) continue;
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
      }
      // 🔴 BACK TO THE SCREEN BEFORE ANYTHING IS DRAWN TO IT — AND THIS IS THE
      // BUG THE PREVIEW EXISTED TO FIND, ON ITS FIRST RUN. A live renderer
      // leaves ITS OWN framebuffer bound, and the texture it hands back is that
      // framebuffer's colour attachment; sampling a texture that is attached to
      // the framebuffer you are drawing into is a feedback loop, which WebGL
      // answers with GL_INVALID_OPERATION (1282) and a frame with nothing in
      // it. In a session the layer's framebuffer is bound a few lines later and
      // the hazard never arises, which is exactly why it needed a second place
      // to be caught.
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      let g = null;
      if (glow) { try { g = glow(); } catch { g = null; } }
      const theGlow = g && g.amp > 0
        ? { col: g.col, at: [placed[0][12], placed[0][13], placed[0][14]], radius: g.radius ?? 2.2, amp: g.amp }
        : null;
      state.glow = theGlow ? { col: [...theGlow.col], amp: theGlow.amp, at: [...theGlow.at] } : null;
      // BOTH eyes, side by side in one framebuffer, because the rule that gets
      // broken is "only the first view clears colour" and one eye cannot break
      // it. A viewport is not a clip region; the scissor is what makes it one.
      for (let eye = 0; eye < 2; eye++) {
        const x = eye * (width >> 1);
        gl.viewport(x, 0, width >> 1, height);
        gl.scissor(x, 0, width >> 1, height);
        drawEye(proj, viewM, eye, tSec, hp, theGlow);
      }
    }
    // Give the card's own answers time to come back — they are asynchronous by
    // construction, and a result read before it exists is no result at all.
    for (let i = 0; i < 20 && gpuQ; i++) { await new Promise((r) => setTimeout(r, 16)); gpuPoll(); }
    verdictOnCost();
    glCheck('preview');
    // ⚠️ READ THE WHOLE FRAME, PER CHANNEL. Four points on a radial picture
    // measure its symmetry, and a sum over R+G+B is constant by construction on
    // three cosines 120° apart — this page has failed a working picture both
    // ways already.
    const px = new Uint8Array(width * height * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const lo = [255, 255, 255], hi = [0, 0, 0];
    let lit = 0;
    for (let i = 0; i < px.length; i += 4) {
      for (let k = 0; k < 3; k++) {
        const v = px[i + k];
        if (v < lo[k]) lo[k] = v;
        if (v > hi[k]) hi[k] = v;
      }
      if (px[i] > 24 || px[i + 1] > 24 || px[i + 2] > 24) lit++;
    }
    /**
     * 🔴 A LINE ACROSS THE FLOOR, SO A CHECK CAN TELL A RAMP FROM A DISC.
     *
     * `spread` and `litShare` both pass on a surface drawn at one flat alpha,
     * which is exactly the failure a radial fade has: it is easy to draw a
     * bright plate with a hard edge and call it a fade. This is 32 samples
     * across the LEFT eye at a quarter of the way up the image, which is where
     * a floor in front of a standing viewer lands, each the brightest channel
     * at that point. Centre-bright and edge-dark is a ramp; flat is not.
     *
     * ⚠️ `readPixels` COUNTS ROWS FROM THE BOTTOM, so a quarter of the way up
     * this array is a quarter of the way up the picture. Getting that backwards
     * samples the sky and reports a floor that is not drawing.
     * ⚠️ AND IT IS THE LEFT EYE ONLY. Both eyes are in one framebuffer side by
     * side, so a row across the whole width crosses the seam between them and
     * reads the second eye's left edge as the first eye's centre.
     */
    const PROFILE_N = 32;
    const profile = [];
    {
      const eyeW = width >> 1;
      // 🔴 A BAND, NOT A ROW, AND THE REASON IS THIN GEOMETRY. One pixel per
      // sample is right for a textured plane and useless for a mesh of
      // hairlines: most samples land between two lines and read as the ground,
      // so a picture that is drawing perfectly reports a flat field. Taking the
      // brightest pixel in a vertical strip catches a line wherever in the
      // strip it happens to be, and still answers the only question this is
      // for — is the middle of the view brighter than its edge.
      const y0 = Math.round(height * 0.12), y1 = Math.round(height * 0.46);
      for (let i = 0; i < PROFILE_N; i++) {
        const x = Math.min(eyeW - 1, Math.round(((i + 0.5) / PROFILE_N) * eyeW));
        let best = 0;
        for (let y = y0; y < y1; y++) {
          const o = (y * width + x) * 4;
          const v = Math.max(px[o], px[o + 1], px[o + 2]);
          if (v > best) best = v;
        }
        profile.push(best);
      }
    }
    // The clear colour, read off the top row of the same eye: what the fade has
    // to reach. A ramp that never gets there is a rim, which is the defect
    // `/floor/` paid for.
    const groundAt = ((height - 2) * width + (width >> 2)) * 4;
    const ground = Math.max(px[groundAt], px[groundAt + 1], px[groundAt + 2]);
    // ⚠️ AND THE DRAWING BUFFER GOES BACK TO NOTHING. This module deliberately
    // does not build a context for a visitor who will never press the button;
    // the preview has to build one to check anything at all, so the least it
    // can do is not leave a 512x320 buffer behind on a phone for the rest of
    // the page's life.
    cv.width = 16; cv.height = 16;
    // 🔴 A PICTURE OF THE HEADSET'S PICTURE, ON DEMAND. There is no other way to
    // LOOK at what a session draws without wearing one — `Page.captureScreenshot`
    // cannot see an immersive view, which research §3.3 already measured. Taken
    // from the pixels already read back, in the same turn, and flipped because
    // `readPixels` counts rows from the bottom and a canvas counts them from the
    // top. Off by default: it is a debugging instrument, not part of the page.
    let png = null;
    if (snapshot) {
      try {
        const flip = new Uint8ClampedArray(px.length);
        const row = width * 4;
        for (let y = 0; y < height; y++) flip.set(px.subarray((height - 1 - y) * row, (height - y) * row), y * row);
        const out = document.createElement('canvas');
        out.width = width; out.height = height;
        out.getContext('2d').putImageData(new ImageData(flip, width, height), 0, 0);
        png = out.toDataURL('image/png');
      } catch { png = null; }
    }
    const err = glErrors.length ? Number(glErrors[0].split(':')[1]) : 0;
    return {
      png,
      ok: true,
      canvas: cv,
      glError: Number.isFinite(err) ? err : 0,
      glWhere: glErrors.join(' ') || 'clean',
      spread: Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]),
      litShare: lit / (width * height),
      bars: !!barProg,
      // ⚠️ `draws` IS THE LOAD-BEARING HALF. `attached` only says the page's
      // programs compiled; a surface can attach cleanly and never be reached,
      // which is what an early `return` in `drawEye` would look like from here.
      surface: state.surface ? { ...state.surface } : null,
      /** 32 brightnesses across the left eye, a quarter up. See the note. */
      profile,
      /** the brightest channel at the top of that eye: the ground colour */
      ground,
      live: liveOn && panels.some((p) => p.live),
      // ⚠️ THIS MACHINE'S NUMBERS, AND THEY ARE NOT A HEADSET'S. Reported so
      // that "we can measure it at all" is established here rather than on the
      // one device run, and so the two can be held side by side afterwards.
      liveGpuMs: state.liveGpuMs,
      liveHalfGpuMs: state.liveHalfGpuMs,
      whereCost: state.liveWhereCost,
      gpuTimer: state.gpuTimer,
      pixels: state.livePixels,
    };
  }

  return {
    supported: () => supported,
    supportedAr: () => supportedAr,
    enter,
    /** Passthrough, which is the same entry path with one word changed. */
    enterAR: () => enter('immersive-ar'),
    setLive,
    isLive: () => liveOn,
    preview,
    end: async () => { try { await session?.end(); } catch { /* already gone */ } },
    state,
  };
}
