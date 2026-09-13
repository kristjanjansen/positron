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
 * A small box at the grip pose — the controller stand-in.
 *
 * 🔴 A PRIMITIVE, NOT A MODEL, and that is a decision rather than a shortcut.
 * `profiles` comes back as `meta-quest-touch-plus`, so the WebXR input-profiles
 * registry would hand over a real glTF — at the price of a loader, a second
 * renderer for its material, and a CDN fetch inside the entry path, which is
 * the one place in this page where a slow answer has already cost three
 * headset runs. A stand-in answers the question a model is being asked
 * ("where is my hand, and is it tracking?") completely. `plan-xr-hands` §4.
 */
export function gripM(m, sx = 0.045, sy = 0.045, sz = 0.10) {
  return new Float32Array([
    m[0] * sx, m[1] * sx, m[2] * sx, 0,
    m[4] * sy, m[5] * sy, m[6] * sy, 0,
    m[8] * sz, m[9] * sz, m[10] * sz, 0,
    m[12], m[13], m[14], 1]);
}

/**
 * The tablet's model matrix, from a grip pose: lifted above the fist, pushed
 * forward, tilted back towards the face, and scaled to its size in metres.
 *
 * ⚠️ THE TILT IS AROUND THE GRIP'S OWN RIGHT AXIS, not the world's. A slab
 * rotated in world space swings away the moment you turn your wrist, which is
 * the difference between something held and something floating near you.
 */
export function holdM(m, o = HOLD) {
  const rx = m[0], ry = m[1], rz = m[2];          // the grip's right
  const ux = m[4], uy = m[5], uz = m[6];          // its up
  const fx = m[8], fy = m[9], fz = m[10];         // its forward (+Z, so -Z aims)
  const c = Math.cos(o.tilt), sn = Math.sin(o.tilt);
  // up and forward rotated about right; right is untouched by its own rotation
  const nux = ux * c + fx * sn, nuy = uy * c + fy * sn, nuz = uz * c + fz * sn;
  const nfx = fx * c - ux * sn, nfy = fy * c - uy * sn, nfz = fz * c - uz * sn;
  const px = m[12] + ux * o.up + fx * o.fwd;
  const py = m[13] + uy * o.up + fy * o.fwd;
  const pz = m[14] + uz * o.up + fz * o.fwd;
  return new Float32Array([
    rx * o.w, ry * o.w, rz * o.w, 0,
    nux * o.h, nuy * o.h, nuz * o.h, 0,
    nfx, nfy, nfz, 0,
    px, py, pz, 1]);
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
    // grid is for is the surface, not the measurement. The cell is still
    // 0.25 m, so a metre is still four dots for anyone counting.
    float a = dotsAt(vM, uCell, uDot, w);
    a *= 1.0 - smoothstep(uFade.x, uFade.y, distance(vW, uEye));
    a *= clamp(uDot * 2.0 / w, 0.0, 1.0);
    a *= uAlpha;
    if (a < 0.02) discard;
    o = vec4(uCol, a); }`;

/** The page's own room, in metres, when your real one cannot be had. */
/**
 * The held tablet — a dark, slightly see-through slab with rounded corners.
 *
 * 🔴 A SIGNED-DISTANCE ROUNDED RECTANGLE, NOT A TEXTURE AND NOT GEOMETRY. The
 * corner radius is computed per pixel from the quad's own coordinate, so it is
 * exact at any size and at any distance from the eye — a rounded PNG would be
 * soft the moment you brought it close, and rounded geometry would need
 * tessellation to look like anything. It is the same trick the grid uses one
 * shader up, for the same reason.
 *
 * ⚠️ It is DARK and it is TRANSPARENT, which on a headset are the same
 * decision: a bright opaque panel held at arm's length is a lamp in your
 * vision, and in passthrough it blots out the room it is supposed to be part
 * of. `uAlpha` stays under 0.8 and the fill stays under 0.2 luminance.
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
    o = vec4(c, a * uAlpha); }`;

/** The slab, in metres, and where it sits relative to the hand holding it. */
const HOLD = {
  w: 0.17, h: 0.115,       // about a small phone
  radius: 0.055,           // in the shader's own units, not metres
  col: [0.10, 0.11, 0.13],
  alpha: 0.72,
  // ⚠️ ABOVE AND IN FRONT OF THE GRIP, AND TILTED BACK. The grip pose is
  // roughly where your fist is; a slab drawn AT it is inside your hand. These
  // three numbers are the difference between holding something and wearing it,
  // and they are the ones to change first if it reads wrong in a headset.
  up: 0.055, fwd: -0.045, tilt: -0.55,
};

export const GRID = {
  span: 10,        // the floor square's side, and the walls' width
  wallH: 3,        // how far up the walls go from the floor
  cell: 0.25,      // dot spacing
  dot: 0.011,      // dot radius — ONE size, see below
  fadeNear: 4.5,   // metres from the eye where the dots start to go
  fadeFar: 11,
};
// Over passthrough the grid is competing with a lit room, so it is brighter
// there; in VR it is behind the things and stays out of their way.
const GRID_COL_VR = [0.56, 0.64, 0.76], GRID_ALPHA_VR = 0.5;
const GRID_COL_AR = [0.72, 0.86, 1.0], GRID_ALPHA_AR = 0.9;
// 🔴 A DIFFERENT COLOUR WHEN THE GRID IS ON **YOUR** SURFACES, and it is there
// because the claim was challenged: "did you render the grid? make it another
// colour for me to believe". Quite right. The log said `11 surface(s) from
// your room` while the picture said nothing, and a page that reports a thing
// it cannot show is asking to be taken on trust — which this project does not
// do anywhere else.
//
// GREEN means every dot you can see is sitting on a plane your headset
// reported. Blue means it is the page's own 10 m room. It is the same
// distinction the gutter prints, in the one channel you cannot miss while
// wearing the thing.
//
// ⚠️ It is not decoration and it must not become decoration: if the grid ever
// snaps to real walls while still drawing blue, that is a bug in which room it
// thinks it is on, and the colour is how you would find out.
const GRID_COL_YOURS = [0.44, 0.92, 0.62];

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
                     'uAspect', 'uRadius']) {
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
  // ⚠️ WHICHEVER HAND IS FREE. MEASURED on a Quest 3: two sources appeared and
  // the LEFT grip did not resolve while the right did, in the same frame. So
  // preferring left with a fallback to anything is not a style choice — it is
  // the difference between a tablet and nothing at all.
  const HOLD_HAND = 'left';
  let hands = [];
  let cube = null, quad = null, ok = false;

  /** Hand the room a context. Idempotent, and it says whether it took. */
  function attach(context) {
    if (ok) return true;
    if (context) gl = context;
    if (!gl) return false;
    try {
      cur = { sky: link(ROOM_VS, SKY_FS), box: link(ROOM_VS, BOX_FS) };
      cube = unitCube(); quad = unitQuad();
      ok = true;
    } catch (e) { log(`the room would not compile — ${e.message}`, 'bad'); return false; }
    // ⚠️ THE GRID IS ALLOWED TO FAIL ON ITS OWN. It is the newest thing here
    // and the only one that needs `fwidth`; a driver that will not compile it
    // must cost the dots, never the room.
    try { holdProg = link(HOLD_VS, HOLD_FS, ['aPos']); }
    // ⚠️ `log`, NOT `onLog`. There is no `onLog` in this scope, so a failed
    // compile would have thrown a ReferenceError out of `attach` — a handler
    // for a failure that fails.
    catch (e) { holdProg = null; log(`the held panel would not compile — ${e.message}`, 'warn'); }
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
  function buildOwnRoom() {
    const { span, wallH } = GRID, half = span / 2, cy = floorY + wallH / 2;
    const flat = new Float32Array([span, 0, 0, 0, 0, 0, span, 0, 0, 1, 0, 0, 0, floorY, 0, 1]);
    ownRoom = [{ m: flat, size: [span, span], origin: [0, 0] }];
    for (const [ax, sgn] of [['z', -1], ['z', 1], ['x', -1], ['x', 1]]) {
      const m = ax === 'z'
        ? new Float32Array([span, 0, 0, 0, 0, wallH, 0, 0, 0, 0, 1, 0, 0, cy, sgn * half, 1])
        : new Float32Array([0, 0, span, 0, 0, wallH, 0, 0, 1, 0, 0, 0, sgn * half, cy, 0, 1]);
      // The wall's dots count from the floor upward and from the room's centre
      // sideways, which is what makes the metre markers meet the floor's.
      ownRoom.push({ m, size: [span, wallH], origin: [0, cy] });
    }
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
  const planes = {
    asked: false,        // did a session request `plane-detection`
    opaque: null,        // is this a VR session — see markAsked, and `none` in describe
    // 🔴 SIX ANSWERS, NOT A BOOLEAN. `not asked` (no session yet), `waiting`
    // (asked, no frame has answered), `refused` (the session was never given
    // the feature), `unreadable` (it answered and we could not parse it),
    // `none` (granted, and your room has no surfaces in it), `yours` (we are
    // standing in a mapped room). A boolean would collapse at least three
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
    const { span, wallH } = GRID;
    const own = `the page's own room, ${span} m across with ${wallH} m walls and its floor at y=0`;
    if (planes.state === 'yours') {
      const bits = Object.entries(planes.labels).map(([k, v]) => `${k} ${v}`).join(' · ');
      const walls = planes.labels.wall || 0;
      planes.note = `${planes.count} surface(s) from your room — ${bits} — grid is on them, floor at y=${planes.floorY.toFixed(2)} m`
        + (walls ? '' : ' · NO wall surfaces came back, so there are no dotted walls')
        + ' · the dots are GREEN because they are on your surfaces';
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
      planes.state = quads.length ? 'yours' : 'none';
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
  function drawGrid(proj, view, ar, eye) {
    if (!gridProg || gridBroke) return;
    try {
      const U = gridProg.__u;
      gl.useProgram(gridProg);
      gl.uniformMatrix4fv(U.proj, false, proj);
      gl.uniformMatrix4fv(U.view, false, view);
      gl.uniform1f(U.cell, GRID.cell);
      gl.uniform1f(U.dot, GRID.dot);
      gl.uniform2f(U.fade, GRID.fadeNear, GRID.fadeFar);
      const yours = planes.state === 'yours';
      gl.uniform3fv(U.col, yours ? GRID_COL_YOURS : (ar ? GRID_COL_AR : GRID_COL_VR));
      gl.uniform1f(U.alpha, ar ? GRID_ALPHA_AR : GRID_ALPHA_VR);
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
   * The slab, on whichever hand is holding it.
   *
   * ⚠️ NOT INSIDE THE OPAQUE PASS. It is transparent, so it is drawn after the
   * room or it blends against whatever happened to be in the depth buffer.
   * Depth TEST stays on — a tablet behind a cube should be behind it — but
   * depth WRITE goes off, or it punches a hole the second eye cannot fill.
   */
  function drawHeld(proj, view) {
    if (!holdProg || !hands.length) return;
    const on = hands.find((h) => h && h.m && h.handedness === HOLD_HAND)
      || hands.find((h) => h && h.m);
    if (!on) return;
    const U = holdProg.__u;
    gl.useProgram(holdProg);
    gl.uniformMatrix4fv(U.proj, false, proj);
    gl.uniformMatrix4fv(U.view, false, view);
    gl.uniformMatrix4fv(U.model, false, holdM(on.m));
    gl.uniform3fv(U.col, HOLD.col);
    gl.uniform1f(U.alpha, HOLD.alpha);
    if (U.aspect) gl.uniform1f(U.aspect, HOLD.w / HOLD.h);
    if (U.radius) gl.uniform1f(U.radius, HOLD.radius);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.bindVertexArray(quad.vao);
    gl.drawArrays(gl.TRIANGLES, 0, quad.count);
    gl.bindVertexArray(null);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }

  function drawInner({ proj, view, tSec = 0, doc = null, clear = true, ar = false,
                       aimed = null, held = null, ray = null, aimedDist = 0,
                       eye = null, grid = true, touch = null } = {}) {
    if (!ok) return;
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
    if (ray) {
      const len = held ? held.dist : (aimedDist || 2.4);
      gl.uniformMatrix4fv(L.model, false, beamM(ray.m, len));
      gl.uniform3fv(L.col, held ? [1.0, 0.83, 0.0] : [0.42, 0.78, 0.76]);
      gl.drawArrays(gl.TRIANGLES, 0, cube.count);
    }

    // 🔴 ONE BOX PER HAND THAT ACTUALLY RESOLVED, and "resolved" is the point.
    // MEASURED on a Quest 3: two sources appeared and the LEFT grip did not
    // resolve while the right did, in the same frame. A page that draws a
    // controller wherever it last saw one would leave a box sitting in the air;
    // a page that draws only what the runtime answered for shows you exactly
    // what it knows, which is also the debugging instrument.
    for (const h of hands) {
      if (!h || !h.m) continue;
      gl.uniformMatrix4fv(L.model, false, gripM(h.m));
      gl.uniform3fv(L.col, h.handedness === 'left' ? [0.34, 0.37, 0.44] : [0.30, 0.33, 0.39]);
      gl.drawArrays(gl.TRIANGLES, 0, cube.count);
    }
    gl.bindVertexArray(null);

    // Last, because these are transparent and have to blend over what is behind.
    if (grid) drawGrid(proj, view, ar, eye);
    drawHeld(proj, view);
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
   * What is in the hands this frame: `[{ m, handedness }]`, where `m` is a GRIP
   * pose matrix in room coordinates.
   *
   * ⚠️ GRIP, NOT TARGET RAY. The ray is where you are POINTING and the grip is
   * where your HAND is; a controller drawn at the ray floats in front of you,
   * and a tablet drawn there is unreachable. `plan-xr-hands` §1.
   */
  function setHands(list) { hands = Array.isArray(list) ? list : []; }

  const room = { attach, draw, applyLook, retire, observePlanes, markAsked, setHands, planes, grid: GRID, HOLD };
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
  return room;
}
