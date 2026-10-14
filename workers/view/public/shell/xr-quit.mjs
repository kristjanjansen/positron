// demo/shell/xr-quit.mjs: the way out of an immersive session. Hold any controller button
// and a ring fills in front of you; let go and it cancels.
//
//   quit = mountXRQuit(gl, session, { onQuit: () => tearDown() });   // once
//   quit.draw(eyeVP, eyeView);                                       // per eye
//
// It drives itself from `session.requestAnimationFrame`, so no page can forget to advance it.
// It is not the page's dead man's switch. Tracked hands have no buttons to hold.
// `button: 4` asks for one exact button (A or X in `xr-standard`).
// why: lessons/kit-xr-quit.md#header

// Position and axes come out of the projecting view matrix, never a pose derived elsewhere.
// why: lessons/kit-xr-quit.md#eye-from-view
import { eyeFromView } from './xr-ray.mjs';

/**
 * 3 s: a brush is under 300 ms and a deliberate press about 500, so nothing accidental reaches it.
 * why: lessons/kit-xr-quit.md#hold-ms
 */
const HOLD_MS = 3000;
const PX = 256;               // the ring texture, square

/**
 * 1.6 m in front: a metre past a held brick, inside the Quest's 1.3 to 2 m comfort band, and
 * the depth xr-panel.mjs hangs panels at. Dead centre is bearable only because the ring is hollow.
 * why: lessons/kit-xr-quit.md#dist-m
 */
export const DIST_M = 1.6;
/**
 * Size as an angle, so moving `DIST_M` cannot change how big it reads. The arc is 0.8 of it.
 * why: lessons/kit-xr-quit.md#ring-deg
 */
export const RING_DEG = 5.0;
const SIZE = 2 * DIST_M * Math.tan((RING_DEG / 2) * Math.PI / 180);
/**
 * A button already down at session start does not count: the hold arms on the first frame with
 * nothing pressed, or after this long regardless, so a stuck button cannot trap anybody.
 * why: lessons/kit-xr-quit.md#arm-ms
 */
const ARM_MS = 3000;
/**
 * The longest frame the hold will believe, in seconds. A headset that stalled
 * for a second must not advance a hold by a second: the whole point of the hold
 * is that it measures a deliberate press, and a stall is not one.
 */
const MAX_DT = 0.1;

const VS = `#version 300 es
in vec2 aCorner;
uniform mat4 uVP;
uniform vec3 uO;
uniform vec3 uR, uU;
out vec2 vUV;
void main() {
  vec2 c = aCorner * 2.0 - 1.0;
  vUV = vec2(aCorner.x, 1.0 - aCorner.y);
  gl_Position = uVP * vec4(uO + uR * c.x + uU * c.y, 1.0);
}`;

const FS = `#version 300 es
precision highp float;
in vec2 vUV;
uniform sampler2D uTex;
uniform float uAlpha;
out vec4 o;
void main() {
  vec4 t = texture(uTex, vUV);
  if (t.a * uAlpha <= 0.004) discard;
  o = vec4(t.rgb, t.a * uAlpha);
}`;

function compile(gl, vs, fs) {
  const p = gl.createProgram();
  for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    gl.attachShader(p, s);
  }
  // Before `linkProgram`: after the link it is a no-op (a Quest reported GL_INVALID_OPERATION).
  // why: lessons/kit-xr-quit.md#bind-before-link
  gl.bindAttribLocation(p, 0, 'aCorner');
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  return p;
}

/** What `button` means when a page names no index: every button on every
 *  controller advances one hold. */
export const ANY_BUTTON = 'any';

/**
 * The gesture with no DOM, GL or session, driven by xr-quit-test.mjs with a fake session.
 * Releasing cancels to zero, and it fires once (`session.end()` is async).
 * why: lessons/kit-xr-quit.md#create-quit-hold
 */
export function createQuitHold({ button = ANY_BUTTON, holdMs = HOLD_MS,
  onQuit = () => {} } = {}) {
  let held = 0, fired = false, armed = false, since = 0;
  let lastFrom = null, lastIndex = null;

  return {
    /**
     * @param {Iterable} inputSources  the session's own list, this frame
     * @param {number} dt              seconds since the last frame
     * @returns {number} how far through the hold, 0..1
     */
    update(inputSources, dt) {
      const step = Math.max(0, Math.min(MAX_DT, dt || 0)) * 1000;
      since += step;
      let down = false, from = null, which = null;
      for (const src of inputSources || []) {
        const pad = src?.gamepad;
        if (!pad) continue;
        // Every button `pad.buttons` reports, so no headset's index layout needs knowing.
        // why: lessons/kit-xr-quit.md#every-button
        if (button === ANY_BUTTON) {
          for (let i = 0; i < pad.buttons.length; i++) {
            if (pad.buttons[i]?.pressed) { down = true; from = src; which = i; break; }
          }
        } else if (pad.buttons[button]?.pressed) { down = true; from = src; which = button; }
        if (down) break;
      }
      // See ARM_MS: the press that opened the page is not a press to leave it.
      if (!armed) {
        if (!down || since >= ARM_MS) armed = true;
        if (!armed) { lastFrom = null; lastIndex = null; held = 0; return 0; }
      }
      lastFrom = down ? from : null;
      lastIndex = down ? which : null;
      if (!down) { held = 0; return 0; }
      held += step;
      if (held >= holdMs && !fired) { fired = true; onQuit(); }
      return Math.min(1, held / holdMs);
    },
    /** How far through the hold, 0..1. */
    get progress() { return Math.min(1, held / holdMs); },
    get holding() { return held > 0; },
    /** Has a frame been seen with nothing pressed, so a press means something. */
    get armed() { return armed; },
    get fired() { return fired; },
    /** Which button index is holding it right now, or null. Published so a run
     *  can say WHICH button somebody found, which is the only way to learn
     *  whether "any" was the right answer. */
    get pressed() { return lastIndex; },
    /** Which source is holding it right now, or null. */
    get from() { return lastFrom; },
    get holdMs() { return holdMs; },
    get button() { return button; },
    reset() { held = 0; fired = false; armed = false; since = 0; lastFrom = null; lastIndex = null; },
  };
}

/**
 * The picture: a square of canvas with an arc on it, hung in front of the
 * viewer. Everything in here is lazy, so a mount with no GL context costs
 * nothing and cannot throw.
 */
function createBadge(gl) {
  let cv = null, g = null;
  let prog = null, vao = null, buf = null, tex = null;
  let drawn = -1;          // the hundredth of a turn currently PAINTED
  let uploaded = -1;       // ...and the one currently in the texture
  let why = null;          // why it would not build, if it did not

  function ink() {
    if (!g) {
      cv = document.createElement('canvas');
      cv.width = PX; cv.height = PX;
      g = cv.getContext('2d');
    }
    return g;
  }

  /**
   * Redrawn only when the hundredth-quantised progress changes: every eye every frame would be
   * 46 MB a second of uploads at 90 Hz.
   * why: lessons/kit-xr-quit.md#paint
   */
  function paint(p) {
    const q = Math.round(p * 100);
    if (q === drawn) return;
    drawn = q;
    const f = q / 100;
    const c = ink();
    c.clearRect(0, 0, PX, PX);
    const cx = PX / 2, cy = PX / 2, r = PX * 0.40;
    /**
     * No circle until there is something to count; the arc appearing is the feedback.
     * White (yellow is for what is running), thin, round caps.
     * why: lessons/kit-xr-quit.md#arc-only
     */
    if (f > 0) {
      c.lineWidth = PX * 0.030;
      c.strokeStyle = '#ffffff';
      c.lineCap = 'round';
      c.beginPath();
      c.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f);
      c.stroke();
    }
    /**
     * No words on it: the gesture is the documentation. `label` is still accepted and reported.
     * why: lessons/kit-xr-quit.md#no-words
     */
  }

  function ensure() {
    if (prog) return true;
    if (why) return false;
    try {
      prog = compile(gl, VS, FS);
      prog.__u = {
        VP: gl.getUniformLocation(prog, 'uVP'), O: gl.getUniformLocation(prog, 'uO'),
        R: gl.getUniformLocation(prog, 'uR'), U: gl.getUniformLocation(prog, 'uU'),
        tex: gl.getUniformLocation(prog, 'uTex'), a: gl.getUniformLocation(prog, 'uAlpha'),
      };
      vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.bindVertexArray(null);
      tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    } catch (e) {
      // Kept rather than rethrown, so a ring that will not compile cannot take the session with it,
      // and kept in `why` so its absence says why.
      // why: lessons/kit-xr-quit.md#compile-error
      prog = null;
      why = e?.message || String(e);
    }
    return !!prog;
  }

  /**
   * One ring a fixed distance along the viewer's forward. Every number comes from this eye's
   * view matrix (column-major, rotation rows are the camera axes), or the ring shows a disparity.
   * Normalised anyway, so a stray scale cannot resize it.
   * why: lessons/kit-xr-quit.md#badge-draw
   */
  function draw(vp, view) {
    if (!ensure()) return false;
    const eye = eyeFromView(view);
    const unit = (x, y, z) => { const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };
    const R = unit(view[0], view[4], view[8]);
    const U = unit(view[1], view[5], view[9]);
    const F = unit(-view[2], -view[6], -view[10]);
    const o = [eye[0] + F[0] * DIST_M, eye[1] + F[1] * DIST_M, eye[2] + F[2] * DIST_M];
    const h = SIZE / 2;
    gl.useProgram(prog);
    gl.bindVertexArray(vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    if (uploaded !== drawn) {
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
      uploaded = drawn;
    }
    const L = prog.__u;
    gl.uniformMatrix4fv(L.VP, false, vp);
    gl.uniform3fv(L.O, new Float32Array(o));
    gl.uniform3fv(L.R, new Float32Array([R[0] * h, R[1] * h, R[2] * h]));
    gl.uniform3fv(L.U, new Float32Array([U[0] * h, U[1] * h, U[2] * h]));
    gl.uniform1i(L.tex, 0);
    // Full strength: it is only ever on screen while somebody is holding a
    // button, and a countdown at a third of its opacity is a countdown somebody
    // has to squint at to find out whether it is running.
    gl.uniform1f(L.a, 1);
    /**
     * Depth test and depth mask off for the ring, so no wall can hide the way out; both go back after.
     * why: lessons/kit-xr-quit.md#on-top
     */
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    // Put back, not read back: a glGet per frame can cost a driver round trip. Blending off,
    // depth test on, depth mask on, as xr-ray.mjs and xr-controller.mjs leave it.
    // why: lessons/kit-xr-quit.md#put-back
    gl.depthMask(true);
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
    return true;
  }

  return {
    paint, ensure, draw,
    get why() { return why; },
    reset() { drawn = -1; uploaded = -1; },
    dispose() {
      try {
        if (prog) gl.deleteProgram(prog);
        if (vao) gl.deleteVertexArray(vao);
        if (buf) gl.deleteBuffer(buf);
        if (tex) gl.deleteTexture(tex);
      } catch { /* a lost context takes all of it anyway */ }
      prog = null; vao = null; buf = null; tex = null;
    },
  };
}

/**
 * One mount per session; asking twice hands back the same one, or two holds count one thumb.
 * why: lessons/kit-xr-quit.md#mounted
 */
const MOUNTED = new WeakMap();

/**
 * The way out, mounted on a session.
 *
 * @param {WebGL2RenderingContext} gl   the context the page draws through
 * @param {XRSession|null} session      the live session; `null` builds the badge without
 *                                      driving it (`driven === false`), for a laptop check.
 * @param {object} [o]
 * @param {string} [o.label]    what the hold does, for a page's own log. Never drawn.
 * @param {number|'any'} [o.button]  gamepad index, or `'any'` (the default).
 * @param {number} [o.holdMs]   how long to hold.
 * @param {Function} [o.onQuit] the page's own teardown, called once, first. The session is
 *                              ended here anyway, whether it is passed or throws.
 * @param {Function} [o.log]    the page's log, for a line a visitor can read.
 * @param {Function} [o.say]    the beacon. Never a batched shipper: it holds for 2 s.
 * why: lessons/kit-xr-quit.md#mount-xr-quit
 */
export function mountXRQuit(gl, session = null, { label = 'Hold to quit',
  button = ANY_BUTTON, holdMs = HOLD_MS, onQuit = null,
  log = () => {}, say = () => {} } = {}) {
  if (session && MOUNTED.has(session)) return MOUNTED.get(session);

  const badge = createBadge(gl);
  let frames = 0, last = 0, running = false, done = false, failSaid = false;

  /**
   * The page is told, then the session ends; both guarded so a throwing teardown cannot trap anyone.
   * why: lessons/kit-xr-quit.md#leave
   */
  function leave() {
    if (done) return;
    done = true;
    say(`leaving, a controller button was held the whole ${holdMs} ms`);
    log('leaving, you held a controller button', 'ok');
    try { onQuit?.(); } catch (e) { say(`FAIL the page threw on its way out: ${e?.message || e}`); }
    try { session?.end?.()?.catch?.(() => {}); } catch { /* it may already be going */ }
  }

  const hold = createQuitHold({ button, holdMs, onQuit: leave });

  /**
   * The session's own frame loop, so the hold advances with no page code and a dead render loop.
   * It re-registers first, or a throw below would end the loop silently.
   * why: lessons/kit-xr-quit.md#step
   */
  function step(t) {
    if (!running) return;
    try { session.requestAnimationFrame(step); } catch { running = false; return; }
    frames++;
    const dt = last ? (t - last) / 1000 : 0;
    last = t;
    try {
      hold.update(session.inputSources, dt);
    } catch (e) {
      if (!failSaid) {
        failSaid = true;
        say(`FAIL the way out could not read the controllers: ${e?.name}: ${e?.message}`);
      }
    }
  }

  const api = {
    /**
     * Draw the ring, once per eye, last in the eye.
     * @param {Float32Array} vp    projection * view for THIS eye
     * @param {Float32Array} view  THIS eye's view matrix. The position, the
     *                             forward, the right and the up all come out of
     *                             it, so no page has to report a head pose.
     */
    draw(vp, view) {
      if (!vp || !view || !gl) return false;
      /**
       * Nothing drawn until something is held. The arc starts on the first millisecond, so a drag
       * that is about to end the session says so while there is time to let go.
       * why: lessons/kit-xr-quit.md#draw-only-holding
       */
      if (!hold.holding) return false;
      badge.paint(hold.progress);
      return badge.draw(vp, view);
    },
    /**
     * Compile now so a laptop can grade it; the object existing says nothing about the shader.
     * why: lessons/kit-xr-quit.md#prepare
     */
    prepare() { return badge.ensure(); },
    /** Why the badge would not build, or null. */
    get why() { return badge.why; },
    /** Is a session advancing the hold. `false` on a compile-only mount, and
     *  `false` again once the session has ended. */
    get driven() { return running; },
    /** How many session frames have driven the hold. The one fact the old
     *  design could not offer: a page can assert that the way out is being
     *  advanced rather than that it was built. */
    get frames() { return frames; },
    /** Has a frame been seen with nothing pressed. Until it has, a button that
     *  was already down does not count. */
    get armed() { return hold.armed; },
    get progress() { return hold.progress; },
    get holding() { return hold.holding; },
    get pressed() { return hold.pressed; },
    get from() { return hold.from; },
    get holdMs() { return holdMs; },
    get button() { return button; },
    get label() { return label; },
    /** Let a page start a fresh session without a stale fire. Mounting again on
     *  the new session does this anyway; it is here for a page that keeps one. */
    reset() { hold.reset(); badge.reset(); done = false; },
    dispose() { running = false; badge.dispose(); },
  };

  if (session) {
    MOUNTED.set(session, api);
    running = true;
    // ⚠️ THE SESSION STOPS DRIVING WHEN IT ENDS, rather than the callback
    // finding out by throwing. A page that re-enters gets a fresh mount.
    try { session.addEventListener?.('end', () => { running = false; }); } catch { /* not every stub has one */ }
    try { session.requestAnimationFrame(step); } catch (e) {
      running = false;
      say(`FAIL the way out could not join the session's frame loop: ${e?.message || e}`);
      log('the way out of this session could not start. Take the headset off to leave', 'bad');
    }
    say(`the way out is mounted, any controller button held ${holdMs} ms`);
  }
  return api;
}
