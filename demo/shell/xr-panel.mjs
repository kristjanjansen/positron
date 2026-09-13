
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
//   5. THE WAY OUT BELONGS TO THE PAGE. Any controller button ends the session,
//      plus a dead-man's switch that ends it if nothing has been drawn after
//      4 s. "Press the Meta button" is not an answer a page gets to give about
//      its own bug.
//
// ⚠️ AND THE LINES THAT SAY WHERE IT HUNG CANNOT BE ON A BATCHED SHIPPER.
// `createShipper` holds for 2 s and entering an immersive session is exactly
// when timers stop being generous — measured on a Quest 3: every flat assert
// arrived, then the press, then nothing at all. `navigator.sendBeacon` survives
// it, so `beacon()` below is what the entry path uses.
//
// ⚠️ demo/scene STILL CARRIES ITS OWN COPY and was deliberately left alone. It
// is the page a real headset has already graded, its session also holds a room,
// a controller ray and grab-and-move, and moving it onto this module is a
// change only a device can re-grade. Do that on a day with a Quest to hand.

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

/** true, false, or null while the browser has not answered yet. */
export const headsetSupported = () => supported;

const PANEL_VS = `#version 300 es
  in vec3 aPos;
  uniform mat4 uProj, uView, uModel; out vec2 vUv;
  void main(){ vUv = vec2(aPos.x + 0.5, 0.5 - aPos.y);
    gl_Position = uProj * uView * uModel * vec4(aPos, 1.0); }`;
const PANEL_FS = `#version 300 es
  precision highp float;
  in vec2 vUv; uniform sampler2D uTex; out vec4 o;
  void main(){ o = texture(uTex, vUv); }`;

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
  const cx = headPos.x + fx * dist, cy = headPos.y, cz = headPos.z + fz * dist;
  return new Float32Array([
    -fz * wM, 0, fx * wM, 0,
    0, hM, 0, 0,
    -fx, 0, -fz, 0,
    cx, cy, cz, 1,
  ]);
}

/**
 * @param {object} o
 * @param {Array<{canvas:HTMLCanvasElement, w?:number, h?:number}>} o.panels
 *        each panel's canvas and its size IN METRES
 * @param {(ctx:{frame:XRFrame, pose:XRViewerPose, session:XRSession}) => void} [o.onFrame]
 *        called once per animation frame, BEFORE the upload — this is where a
 *        page redraws its panel canvases. Once per FRAME, never per eye.
 * @param {() => void} [o.onEnd]
 * @param {(msg:string, kind?:string) => void} [o.log]
 * @param {number} [o.dist]  metres in front of you
 * @returns {{ supported: () => (boolean|null), enter: () => Promise<boolean>,
 *             end: () => Promise<void>, state: object }}
 */
export function createXRPanels({
  panels = [], onFrame = null, onEnd = null, log = () => {},
  dist = 1.6, clear = [0.02, 0.03, 0.045, 1], deadManMs = 4000,
} = {}) {
  let gl = null, prog = null, quad = null, U = null;
  let session = null, space = null;
  let placed = null, armed = false, armAt = 0;

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
  const glErrors = [];
  function glCheck(phase) {
    if (!gl) return;
    const e = gl.getError();
    if (e && glErrors.length < 8) glErrors.push(`${phase}:${e}`);
    return e;
  }
  // What the trigger has hold of, and how far away it was when it was grabbed.
  let grabbing = null, grabDist = 0;
  let tick = 0, tickAt = 0, lastFrame = 0;
  const tex = new Map();                      // canvas -> WebGLTexture
  const uploads = [];                         // CPU ms per frame, for a median

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
  };
  // ⚠️ A GETTER, NOT A COPY. The probe resolves after this object is built, so a
  // field written once here would publish `null` forever — a machine surface
  // saying "we never looked" about a browser that answered a second later.
  Object.defineProperty(state, 'supported', { get: () => supported, enumerable: true });
  if (panels[0]?.canvas) state.panelPixels = { w: panels[0].canvas.width, h: panels[0].canvas.height };

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
          model: gl.getUniformLocation(prog, 'uModel'), tex: gl.getUniformLocation(prog, 'uTex') };
    glCheck('program');
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
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      tex.set(p.canvas, t);
    }
    glCheck('textures');
    return true;
  }

  async function enter() {
    if (session) return true;
    if (!navigator.xr) { log('this browser has no WebXR at all — nothing to put on', 'warn'); return false; }
    // 🔴 NO AWAIT BEFORE `requestSession`. The support answer is the one already
    // taken at load; asking again here can spend the user activation, and a
    // handler that throws where nothing is reporting is what produced a run
    // with no asserts at all on a real Quest.
    if (supported === false) { log('no headset here — nothing changes on this page', 'warn'); return false; }
    if (!gl) {
      try {
        if (!build()) { log('this browser gave no 3-D context, so there is nothing to draw with', 'bad'); return false; }
      } catch (e) { log(`the panel would not compile — ${e.message}`, 'bad'); return false; }
    }
    // ⚠️ A DEADLINE ON EVERY STEP. A rejected promise reports itself; one that
    // never settles does not, and that is what two headset runs looked like
    // from outside — a session somebody was standing in, with no line saying
    // which await had not come back.
    const step = async (what, p) => {
      beacon(`… ${what}`);
      const out = await Promise.race([p,
        new Promise((_, no) => setTimeout(() => no(new Error(`${what} never returned`)), 6000))]);
      beacon(`ok  ${what}`);
      return out;
    };
    try {
      // ⚠️ `local-floor` IS REQUIRED, not optional: the panel hangs at eye
      // height measured from the floor, and on `local` the origin is wherever
      // your head happened to be when the session started.
      session = await step('requestSession immersive-vr',
        navigator.xr.requestSession('immersive-vr', { requiredFeatures: ['local-floor'] }));
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
        beacon('ok  the context was already made for a headset — makeXRCompatible not needed');
      }
      beacon('… XRWebGLLayer');
      session.updateRenderState({ baseLayer: new XRWebGLLayer(session, gl) });
      beacon('ok  XRWebGLLayer');
      space = await step('requestReferenceSpace local-floor', session.requestReferenceSpace('local-floor'));
    } catch (e) {
      log(`the headset refused — ${e.name}: ${e.message}`, 'bad');
      beacon(`FAIL session — ${e.name}: ${e.message}`);
      try { await session?.end(); } catch { /* it may never have started */ }
      session = null;
      return false;
    }
    // 🔴 NOTHING READS `session.renderState.baseLayer` HERE. It is null until
    // the next animation frame — see defect 1 at the top of this file.
    state.presenting = true; state.mode = 'immersive-vr';
    state.frames = 0; state.fps = null; state.worstGapMs = 0;
    state.blendMode = session.environmentBlendMode || null;
    state.frameRate = session.frameRate ?? null;
    try { state.supportedFrameRates = session.supportedFrameRates ? Array.from(session.supportedFrameRates) : null; }
    catch { state.supportedFrameRates = null; }
    placed = null; armed = false; armAt = performance.now();
    tick = 0; tickAt = performance.now(); lastFrame = 0;
    uploads.length = 0; state.uploadWorstMs = 0; state.drawCpuMs = null;
    beacon(`session created · immersive-vr · blend ${session.environmentBlendMode || 'not reported'} · refresh ${session.frameRate || 'not reported'}`);
    log('you are in it — any controller button comes back out', 'ok');

    session.addEventListener('end', () => {
      state.presenting = false; state.mode = 'window';
      session = null; space = null; placed = null;
      log(`came back out — ${state.frames} frames drawn${state.fps ? ` at ${state.fps.toFixed(1)} a second` : ''}`);
      beacon(`session ended · ${state.frames} frames · ${state.fps ? state.fps.toFixed(1) : '—'} fps`);
      try { onEnd?.(); } catch { /* the page's business */ }
    });
    // 🔴 ANY CONTROLLER BUTTON LEAVES — defect 5. The trigger and the grip have
    // their own events; everything else is read off the gamepad in the frame
    // loop. ARMED ONLY ONCE NOTHING IS PRESSED, because the press that opened
    // this page's button may still be down as the session starts, and an exit
    // that fires on entry is a session nobody can get into.
    const leave = (why) => {
      if (!armed) return;
      beacon(`${why} — leaving`);
      session?.end().catch(() => {});
    };
    // 🔴 TRIGGER GRABS, GRIP LEAVES — the same split `scene` already settled
    // on, for the same reason: a page must keep a way out that belongs to it,
    // and dragging needs a button, so the two cannot be the same button. Both
    // used to exit here, which left nothing to drag with.
    session.addEventListener('selectstart', (e) => { if (armed) grabbing = e.inputSource || true; });
    session.addEventListener('selectend', () => { grabbing = null; });
    session.addEventListener('squeezestart', () => leave('grip'));
    // ⚠️ AND A DEAD-MAN'S SWITCH. If nothing has been drawn 4 s after the
    // session started, the room is black and staying black: end it and say so
    // rather than leaving somebody standing in it.
    setTimeout(() => {
      if (session && state.frames === 0) {
        beacon('FAIL no frame drawn 4 s after the session started — leaving on my own');
        log('the headset session drew nothing — ended it rather than leave you in the dark', 'bad');
        session.end().catch(() => {});
      }
    }, deadManMs);
    session.requestAnimationFrame(onXR);
    beacon('session running — requestAnimationFrame registered');
    return true;
  }

  function onXR(now, frame) {
    if (!session) return;
    session.requestAnimationFrame(onXR);
    const pose = frame.getViewerPose(space);
    if (!pose) return;
    // 🔴 THE LAYER IS READ HERE, INSIDE THE CALLBACK, WHERE IT EXISTS.
    const layer = session.renderState.baseLayer;
    if (!layer) return;
    state.frames++;

    // Arm the way out once every button is up — or after 3 s regardless, so a
    // stuck button cannot be the reason somebody is trapped.
    if (!armed) {
      let anyDown = false;
      for (const src of session.inputSources) {
        for (const b of src.gamepad?.buttons || []) if (b.pressed) anyDown = true;
      }
      if (!anyDown || performance.now() - armAt > 3000) armed = true;
    } else {
      for (const src of session.inputSources) {
        for (const b of src.gamepad?.buttons || []) {
          if (b.pressed) { beacon('a button — leaving'); session.end().catch(() => {}); return; }
        }
      }
    }

    // ── the page redraws its canvases, ONCE per frame ──────────────────────
    // ⚠️ NOT PER EYE. Two views share one framebuffer and one picture; drawing
    // the source twice would double the cost this page exists to measure and
    // show the two eyes two different instants, which reads as a headache
    // rather than as a bug.
    const t0 = performance.now();
    try { onFrame?.({ frame, pose, session }); } catch (e) { log(`the picture threw — ${e.message}`, 'bad'); }
    const t1 = performance.now();
    state.drawCpuMs = t1 - t0;

    // ── and the panels go to the card ─────────────────────────────────────
    // ⚠️ `texImage2D` EVERY FRAME, ON PURPOSE, because that is the cost
    // `plan-xr-room.md` §2 asks about ("each panel is a texImage2D from a
    // <video> per frame — measure one panel first"). `texSubImage2D` after the
    // first upload would skip the reallocation and is the obvious next lever;
    // measure it against this number rather than instead of it.
    for (const p of panels) {
      const t = tex.get(p.canvas);
      if (!t) continue;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, p.canvas);
      if (state.frames === 0) glCheck('upload');
    }
    const cost = performance.now() - t1;
    uploads.push(cost);
    if (uploads.length > 120) uploads.shift();
    const sorted = [...uploads].sort((a, b) => a - b);
    state.uploadCpuMs = sorted[sorted.length >> 1];
    state.uploadWorstMs = Math.max(state.uploadWorstMs ?? 0, cost);

    gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);
    if (state.frames === 0) glCheck('bindFramebuffer');
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    if (!placed) {
      const hm = pose.transform.matrix, hp = pose.transform.position;
      const n = panels.length;
      placed = panels.map((p, i) => placeFacing(
        hm, hp, p.w ?? 1.2, p.h ?? 0.75, p.dist ?? dist,
        // One panel is straight ahead; several fan out around you, which is
        // where `plan-xr-room.md` §2 is going.
        n === 1 ? 0 : (i - (n - 1) / 2) * 0.7));
      grabDist = panels[0]?.dist ?? dist;
    }

    // ── dragging ─────────────────────────────────────────────────────────
    // While the trigger is down the panel rides the controller at the distance
    // it was grabbed at, and keeps facing you. ⚠️ IT STILL FACES THE HEAD, not
    // the controller: a panel you can turn edge-on to yourself is a panel you
    // can lose, and there is no second hand here to turn it back (one
    // controller, measured, in this user's hands).
    if (grabbing && placed) {
      const src = grabbing.targetRaySpace ? grabbing : null;
      const rp = src && frame.getPose(src.targetRaySpace, space);
      if (rp) {
        const m = rp.transform.matrix, o = rp.transform.position;
        // -Z of the ray's frame is forward.
        const px = o.x - m[8] * grabDist,
              py = o.y - m[9] * grabDist,
              pz = o.z - m[10] * grabDist;
        const hp = pose.transform.position;
        let fx = px - hp.x, fz = pz - hp.z;
        const l = Math.hypot(fx, fz) || 1;
        fx /= l; fz /= l;
        const p0 = panels[0];
        const wM = p0.w ?? 1.2, hM = p0.h ?? 0.75;
        placed[0] = new Float32Array([
          -fz * wM, 0, fx * wM, 0,
          0, hM, 0, 0,
          -fx, 0, -fz, 0,
          px, py, pz, 1,
        ]);
      }
    }

    let eye = 0;
    for (const view of pose.views) {
      const vp = layer.getViewport(view);
      gl.viewport(vp.x, vp.y, vp.width, vp.height);
      gl.scissor(vp.x, vp.y, vp.width, vp.height);
      // 🔴 ONLY THE FIRST VIEW CLEARS COLOUR — defect 3. `gl.clear` ignores the
      // viewport and both eyes share one framebuffer, so a colour clear on the
      // second view wipes the first eye's picture and the headset goes black.
      if (eye === 0) {
        gl.clearColor(clear[0], clear[1], clear[2], clear[3]);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      } else {
        // Each eye still needs its OWN depth, or it tests against the first
        // eye's depths and drops the picture. A scissor is what makes a clear
        // respect a region; a viewport is not a clip.
        gl.enable(gl.SCISSOR_TEST);
        gl.clear(gl.DEPTH_BUFFER_BIT);
        gl.disable(gl.SCISSOR_TEST);
      }
      gl.useProgram(prog);
      gl.uniformMatrix4fv(U.proj, false, view.projectionMatrix);
      gl.uniformMatrix4fv(U.view, false, view.transform.inverse.matrix);
      gl.bindVertexArray(quad.vao);
      panels.forEach((p, i) => {
        gl.uniformMatrix4fv(U.model, false, placed[i]);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex.get(p.canvas));
        gl.uniform1i(U.tex, 0);
        gl.drawArrays(gl.TRIANGLES, 0, quad.count);
      });
      gl.bindVertexArray(null);
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
      beacon(`first headset frame · fb ${state.fb.w}x${state.fb.h} · ${state.views} views · eye0 ${state.eye.w}x${state.eye.h} · gl ${state.glWhere} · panel ${panels[0]?.canvas.width}x${panels[0]?.canvas.height}`);
      log(`drawing ${state.fb.w}x${state.fb.h}, ${state.eye.w}x${state.eye.h} an eye`, 'hi');
    }

    // Frame rate, counted over a one-second window — the same way the flat
    // panes on this page count theirs, so the two numbers are comparable.
    tick++;
    if (now - tickAt >= 1000) {
      state.fps = tick * 1000 / (now - tickAt);
      tick = 0; tickAt = now;
      beacon(`${state.frames} frames · ${state.fps.toFixed(1)} fps · worst gap ${state.worstGapMs.toFixed(1)} ms · upload ${state.uploadCpuMs.toFixed(2)} ms`);
    }
    if (lastFrame) state.worstGapMs = Math.max(state.worstGapMs, now - lastFrame);
    lastFrame = now;
  }

  return {
    supported: () => supported,
    enter,
    end: async () => { try { await session?.end(); } catch { /* already gone */ } },
    state,
  };
}
