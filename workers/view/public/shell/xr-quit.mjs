// demo/shell/xr-quit.mjs — the way out of an immersive session. Hold any
// controller button and a ring fills in front of you; let go and it cancels.
//
//   quit = mountXRQuit(gl, session, { onQuit: () => tearDown() });   // once
//   quit.draw(eyeVP, eyeView);                                       // per eye
//
// 🔴 A PAGE CANNOT FORGET IT, AND THAT IS WHY THIS FILE CHANGED ON 2026-09-19.
// Instructed: *"global behaviour hold any vr/xr controller button to quit"*.
// The gesture was already right and every page carried it by writing three
// lines: build it, `update` it with the session's input sources, `draw` it.
// `/blocks/` wrote two of the three. It built the badge, compiled its shader
// and drew it at both hands every frame, and never called `update`, so the hold
// could not advance and THERE WAS NO WAY OUT OF THAT PAGE AT ALL. Reported from
// a headset as *"i was not able to get out"*. Every other page had the line, so
// no shared code was wrong and nothing in the repo could disagree with
// anything.
//
// So the hold is no longer something a page advances. `mountXRQuit` takes the
// SESSION and drives itself from `session.requestAnimationFrame`, which is the
// session's own frame loop and needs nothing from the page. There is no
// `update` to forget, because there is no `update` to call.
// ⚠️ **AND IT SURVIVES A PAGE WHOSE RENDER LOOP IS DEAD.** If the page throws
// on its way in and never draws a frame, the hold still advances and the
// session still ends when it fills: you hold blind for three seconds instead of
// watching an arc. That is not the dead man's switch and does not replace it,
// see below.
//
// 🔴 THE RING IS IN FRONT OF YOU, NOT AT YOUR HANDS. DIRECTED 2026-09-19:
// *"Hold-to-quit: ui should not tied to controllers. it should be just front of
// me"*. It used to be painted at EVERY grip matrix, and the argument for that
// is worth keeping because it was a good one: the hold can start on either
// controller, so a ring filling on the hand you are NOT pressing is feedback
// pointing at the wrong place, and one badge per hand meant whichever hand you
// pressed was the one you were looking at when it began to fill. That argument
// dies the moment the ring is head locked. In front of you there is one of it,
// it is already where you are looking, and WHICH hand started the hold stops
// mattering to anybody.
// ⚠️ **IT TOOK THE `grips?.length` GUARD WITH IT, WHICH IS A REAL GAIN.** A
// session driven by tracked HANDS has no grip matrices, so the badge could not
// be drawn there at all. It draws now. ⚠️ Tracked hands usually report no
// gamepad either, so on that input there is a ring to draw and no button to
// hold. What ends such a session is the page's dead man's switch and the
// headset's own menu, and this file cannot honestly claim otherwise.
//
// 🔴 WHY THE HOLD REPLACED THREE OTHER ANSWERS. Every headset page here has had
// its own exit and none of them was discoverable:
//
//   · **"any button leaves"** — a TAP on any button, which means every button is
//     a trap. You cannot rest a thumb anywhere, and the page never says which
//     button did it. ⚠️ THE BUTTON WAS NEVER THE FAULT, THE TAP WAS, and that
//     distinction is what 2026-09-17 turned on: any button HELD for three
//     seconds, with a ring saying how far it has got, cannot be reached by
//     accident and needs nobody to be told which button to find.
//   · **the grip** — invisible. Nothing on screen says the grip does anything,
//     and a control you have to be told about is one nobody finds.
//   · **a button on a tablet in your other hand** — real, labelled, and gone
//     the moment somebody picks up ONE controller. It also costs a slab, a
//     texture and a renderer that only one page has.
//
// What is left is the one thing true of every headset: there is a button under
// your thumb. Pressing anything and keeping it pressed raises an arc in front
// of you and fills it. Let go early and nothing happens, which is what makes it
// safe to put on a button somebody might press by accident.
//
// ⚠️ THE DEAD MAN'S SWITCH STAYS AND IS NOT THIS. It ends a session when
// NOTHING HAS BEEN DRAWN for a few seconds, which is the case where the page
// threw and there is nothing on screen to hold a ring. The two cover different
// failures: this one is for a person who wants out, that one is for a page that
// has stopped being able to offer anything. CLAUDE.md records the failure it
// prevents in as many words: session live, nothing drawing, no way out, no log
// line. It is not a user facing exit and it belongs to the page.
//
// 🔴 ANY BUTTON, NOT BUTTON 4. CHANGED 2026-09-17 ON INSTRUCTION: *"all vr/ar
// general  make one general way to get out. hold down any controller button for
// looooong enough then it quits. no other exit methods/ui's for now."* The
// named-button version was already the good half of this design, the hold and
// the ring, and it still asked somebody in a headset to find one particular
// button under their thumb. Every button advances the same hold now, so the
// gesture is "press something and keep pressing it", which is what a person
// does when they want out and cannot see their hands.
//
// ⚠️ AND THE TRIGGER IS A BUTTON. On `/blocks/` and `/mirror/` the trigger is
// also what drags a thing, so a drag held longer than `HOLD_MS` ends the
// session. That is a real cost and it is why the arc is drawn from the first
// millisecond of any press rather than appearing part way: a drag that is about
// to become an exit says so in front of you, and letting go cancels it to zero.
// UNVERIFIED IN A HEADSET, nobody here has one, so it is written down rather
// than claimed to be fine.
// ⚠️ A page that needs one exact button back passes `button: 4`, which is A on a
// right Touch controller and X on a left one in the `xr-standard` mapping.

// 🔴 ONE ANSWER FOR WHERE THE CAMERA IS, AND IT IS NOT COPIED HERE.
// `eyeFromView` takes the position out of the view matrix that is doing the
// projecting, so the badge cannot be turned against a position the page derived
// some other way. The forward, right and up below come out of the SAME matrix
// for the same reason.
import { eyeFromView } from './xr-ray.mjs';

/**
 * 🔴 HOW LONG THE HOLD IS, AND WHY THIS NUMBER.
 * 3 s. Long enough that nothing accidental reaches it: a brush is under 300 ms
 * and a deliberate press about 500, so an exit at three seconds cannot be
 * arrived at by resting a thumb. Short enough to be reachable by somebody who
 * wants out NOW, three seconds being about as long as anybody will hold a
 * control before deciding it is broken, and the ring says how far the hold has
 * got, so the wait is spent watching something happen rather than wondering.
 * ⚠️ It was 900 ms while the exit was one named button nobody would press by
 * accident. With every button live, 900 ms is a trap.
 */
const HOLD_MS = 3000;
const PX = 256;               // the ring texture, square

/**
 * 🔴 HOW FAR IN FRONT OF THE VIEWER THE RING SITS, IN METRES.
 *
 * 1.6 m, and the three things that fix it:
 *  · **Clear of anything you are holding.** A brick on `/blocks/` is at arm's
 *    length, about 0.6 m, and the instruction for this change says in as many
 *    words that the ring must not be inside one. 1.6 m is a metre past the end
 *    of an arm.
 *  · **Inside the headset's comfortable range.** A Quest focuses at somewhere
 *    between about 1.3 and 2 m whatever the geometry says, so content a person
 *    is asked to look at for three seconds belongs in that band. Closer than
 *    a metre is where a head locked thing starts to feel like it is on your
 *    face.
 *  · **It is the distance `xr-panel.mjs` already hangs its panels at**, so on
 *    the one page that has both, the ring and the thing behind it are at one
 *    depth rather than two.
 * ⚠️ AND IT IS DEAD CENTRE, WHICH IS ONLY BEARABLE BECAUSE THE BADGE IS HOLLOW.
 * There are no words on it and nothing in the middle: the arc frames what you
 * are looking at rather than covering it, and it is on screen only while a
 * button is down.
 */
export const DIST_M = 1.6;
/**
 * 🔴 HOW BIG IT LOOKS, IN DEGREES, WHICH IS THE HONEST UNIT FOR SOMETHING HEAD
 * LOCKED. The badge used to be 40 mm at a controller, about 4.6 degrees across
 * at the distance a hand is held. Fixing the ANGLE rather than the metres means
 * moving `DIST_M` cannot silently change how big it reads.
 * ⚠️ The arc itself is 0.8 of the badge, so the ring is about 4 degrees.
 */
export const RING_DEG = 5.0;
const SIZE = 2 * DIST_M * Math.tan((RING_DEG / 2) * Math.PI / 180);
/**
 * 🔴 A BUTTON THAT WAS ALREADY DOWN WHEN THE SESSION STARTED DOES NOT COUNT,
 * AND THIS USED TO BE EVERY PAGE'S OWN PROBLEM.
 *
 * The press that worked the page's own "enter" control can still be down as the
 * session starts, and with every button live it IS one of the buttons the hold
 * counts, so without this a session would end about three seconds after it
 * began. `xr-panel.mjs` carried exactly this guard in the page layer and the
 * other three pages did not, which is one more line nobody should have to
 * remember. The hold arms on the first frame with NOTHING pressed.
 * ⚠️ OR AFTER THIS LONG REGARDLESS, so a stuck button cannot be the reason
 * somebody is trapped in a room. That is the better half of the two rules that
 * were merged here, and it is a deliberate trade: a genuinely stuck button ends
 * the session about six seconds in, which is worse than nothing happening only
 * if you wanted to stay.
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
  // 🔴 BEFORE `linkProgram`. Called after the link it is a no-op that reads like
  // a fix. A Quest reported GL_INVALID_OPERATION on its first frame for exactly
  // this and drew correctly anyway, because the linker happened to pick the
  // same slot.
  gl.bindAttribLocation(p, 0, 'aCorner');
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  return p;
}

/** What `button` means when a page names no index: every button on every
 *  controller advances one hold. */
export const ANY_BUTTON = 'any';

/**
 * 🔴 THE GESTURE, WITH NO DOM, NO GL AND NO SESSION IN IT.
 *
 * Every bug this thing has ever had lived in the arithmetic: a hold that kept
 * its progress between presses, a hold that fired twice, a hold that counted
 * the press which opened the page. None of those need a headset to find and
 * none of them needed a browser, so they live here and `xr-quit-test.mjs`
 * drives this with a fake session on a laptop.
 *
 * 🔴 RELEASING CANCELS, AND IT CANCELS TO ZERO. A hold that kept its progress
 * between presses would let somebody quit by brushing a button nine times over
 * a minute, which is the accident this design exists to prevent.
 * ⚠️ And it only ever fires ONCE: `session.end()` is async, and a ring that
 * stays full for three more frames would ask three times.
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
        // ⚠️ EVERY BUTTON, NOT ONE. `pad.buttons` is whatever the runtime
        // reports for this controller, so this covers the trigger, the squeeze,
        // the thumbstick click, A/X, B/Y, the thumbrest and the menu without
        // this file having to know which indices a given headset uses, which is
        // the whole point of "any". A page that named an index gets that index
        // and nothing else.
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
   * ⚠️ REDRAWN ONLY WHEN THE PICTURE CHANGES, and the picture is a hundredth of
   * a turn. A 256 square canvas painted and uploaded on every eye of every
   * frame of a 90 Hz headset is 46 MB a second of traffic to say the same
   * thing; quantising the progress means the texture moves about a hundred
   * times over the whole hold.
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
     * 🔴 NO CIRCLE UNTIL THERE IS SOMETHING TO COUNT. Reported 2026-09-16:
     * *"initially no circle, its appears on countdown (no bg circle just
     * arc). make it thinner and just white and bit rounded"*.
     *
     * There was a faint full circle behind it at all times, on the argument
     * that the arc needs somewhere to fill INTO. That is a good argument about
     * a progress bar on a screen and the wrong one here: a ring drawn in front
     * of somebody who is not pressing anything is a shape that means nothing
     * yet, and it is the loudest thing in the room. The arc appearing from
     * nothing IS the feedback.
     *
     * ⚠️ WHITE, NOT THE SITE'S YELLOW. Yellow in here is spent on the thing
     * that is running; this is the way out, which is furniture until the moment
     * you use it. ⚠️ AND THIN, with round caps, which is the `bit rounded`:
     * at 0.055 of the badge it read as a heavy dial, and a countdown that has
     * only to be SEEN does not need weight.
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
     * 🔴 NO WORDS ON IT. INSTRUCTED 2026-09-19: *"hold any controller button
     * down long enough it shows circular coundown (no labels) and quites"*.
     * The label was the whole discoverability argument this badge was built on,
     * and it lost to the thing it was competing with: a word floating in front
     * of you is furniture you read once and then look past for the rest of the
     * session, in a picture whose whole point is what is in front of you.
     * ⚠️ **SO THE GESTURE IS THE DOCUMENTATION.** Press anything and keep
     * pressing it: the arc appears on the first millisecond and fills, which
     * tells a person holding a button that holding it is doing something,
     * without asking them to read at arm's length.
     * ⚠️ `label` IS STILL ACCEPTED AND STILL REPORTED, so a page that wants to
     * SAY what its way out is can put it in its own log. Nothing draws it.
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
      // ⚠️ A SWALLOWED COMPILE ERROR IS A CONTROL THAT IS SIMPLY ABSENT, with
      // nothing anywhere saying why. This used to be a bare `catch {}`, so a
      // badge that would not build looked exactly like a badge nobody asked
      // for. Kept rather than rethrown, because a way out that will not compile
      // must not take the session with it.
      prog = null;
      why = e?.message || String(e);
    }
    return !!prog;
  }

  /**
   * One ring, a fixed distance along the viewer's own forward, square to them.
   *
   * 🔴 EVERY NUMBER COMES OUT OF THE VIEW MATRIX THIS EYE IS BEING PROJECTED
   * WITH. A headset draws two views 64 mm apart, and a badge turned against a
   * position the page worked out some other way is not a smear, it is a
   * DISPARITY: it reads as sitting at a depth it is not at. The matrix is
   * column-major, so element (row, col) is `v[col * 4 + row]` and the
   * rotation's ROWS are the camera's own axes in the world. Right, up and
   * forward are three reads rather than a cross product, and `eyeFromView` is
   * the position.
   * ⚠️ NORMALISED ANYWAY. A view matrix is rigid and these are already unit
   * vectors; a scale sneaking in would change the badge's SIZE with the pose,
   * which is a very confusing thing to look at for the cost of three square
   * roots on the frames where somebody is holding a button.
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
     * 🔴 ON TOP OF EVERYTHING, AND IT PUTS THE STATE BACK.
     * A way out you cannot see because a wall is in front of it is the failure
     * the dead man's switch exists for, arrived at by drawing. So the depth
     * test is off for these four vertices and the depth mask with it, and both
     * go back afterwards: a kit component that leaves blending on, or the depth
     * mask off, breaks the NEXT thing its host draws and the host looks like
     * the broken one.
     */
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    // ⚠️ PUT BACK, NOT READ BACK. The obvious version asks `gl.isEnabled` first
    // and restores what it found, and a glGet inside a render loop can cost a
    // round trip to the driver: an exit that drops frames while you hold it is
    // an exit that looks broken. This leaves the state every other component
    // here leaves, which `xr-ray.mjs` and `xr-controller.mjs` both write down:
    // blending off, depth test on, depth mask on. The badge is the last thing
    // in the eye, so there is nothing after it to disagree.
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
 * 🔴 ONE MOUNT PER SESSION, AND ASKING TWICE HANDS BACK THE SAME ONE.
 * Two drivers on one session is two holds counting the same thumb, and the
 * second one to fill would ask a session that is already ending to end again.
 * A page that cannot tell whether it has mounted already is a page that mounts
 * twice.
 */
const MOUNTED = new WeakMap();

/**
 * The way out, mounted on a session.
 *
 * @param {WebGL2RenderingContext} gl   the context the page draws through
 * @param {XRSession|null} session      the live session. `null` builds the
 *                                      badge WITHOUT driving it, which is how a
 *                                      laptop grades the shader before anybody
 *                                      puts a headset on; such an object
 *                                      reports `driven === false`.
 * @param {object} [o]
 * @param {string} [o.label]    what the hold does, for a page's own log. Never
 *                              drawn, see `paint`.
 * @param {number|'any'} [o.button]  gamepad index, or `'any'` (the default).
 * @param {number} [o.holdMs]   how long to hold.
 * @param {Function} [o.onQuit] the page's own teardown, called once, first.
 *                              🔴 IT DOES NOT REPLACE THE EXIT. This module
 *                              ends the session itself whether a page passes
 *                              one or not, and whether the one it passes throws
 *                              or not, because "the page ends the session" is
 *                              exactly the line that went missing from
 *                              `/blocks/`.
 * @param {Function} [o.log]    the page's log, for a line a visitor can read.
 * @param {Function} [o.say]    the beacon. 🔴 NEVER A BATCHED SHIPPER:
 *                              `createShipper` holds for 2 s and a session
 *                              ending is exactly when timers stop being
 *                              generous.
 */
export function mountXRQuit(gl, session = null, { label = 'Hold to quit',
  button = ANY_BUTTON, holdMs = HOLD_MS, onQuit = null,
  log = () => {}, say = () => {} } = {}) {
  if (session && MOUNTED.has(session)) return MOUNTED.get(session);

  const badge = createBadge(gl);
  let frames = 0, last = 0, running = false, done = false, failSaid = false;

  /**
   * 🔴 THE PAGE IS TOLD, THEN THE SESSION ENDS. In that order, so a page gets
   * to stop its sound and put its own things away with the session still live.
   * Both halves are guarded: a teardown that throws must not be able to keep
   * somebody in a room, and a session that is already ending answers the second
   * `end()` with a rejection nobody needs to hear about.
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
   * 🔴 THE SESSION'S OWN FRAME LOOP, NOT THE PAGE'S. This is the whole design:
   * `XRSession.requestAnimationFrame` is a list of callbacks and anybody
   * holding the session may add one, so the hold advances without a single line
   * in a page and keeps advancing if the page's render loop has died.
   * ⚠️ IT RE-REGISTERS FIRST. A throw anywhere below would otherwise end the
   * loop silently, which is the failure this file exists to stop, arrived at
   * from the other side.
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
       * 🔴 NOTHING IS DRAWN UNTIL SOMETHING IS BEING HELD. With no label on it
       * an idle badge is a blank square hanging in the middle of the view,
       * which is worse than the word it replaced: it says nothing and it is
       * still in the way. The countdown IS the badge, so there is no badge
       * until there is a countdown.
       * ⚠️ AND THE ARC STARTS ON THE FIRST MILLISECOND, which is the property a
       * drag-to-quit page depends on: on `/blocks/` the trigger both drags a
       * brick and advances this hold, so a drag that is about to end the
       * session has to say so while there is still time to let go.
       */
      if (!hold.holding) return false;
      badge.paint(hold.progress);
      return badge.draw(vp, view);
    },
    /**
     * 🔴 COMPILE NOW, SO SOMETHING OTHER THAN A HEADSET CAN GRADE IT.
     * Everything in the badge is lazy until the first draw, which means the
     * object existing says nothing at all about whether its shader builds. A
     * page asserting "there is a way out" off the object alone passes on a
     * broken badge: PROVED by making `compile` throw and watching the check
     * stay green. Returns whether it is really ready.
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
