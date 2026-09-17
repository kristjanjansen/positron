// demo/shell/xr-quit.mjs — the way out of an immersive session, on the
// controller, with a ring that fills while you hold it.
//
// 🔴 WHY THIS REPLACED THREE OTHER ANSWERS. Every headset page here has had its
// own exit and none of them was discoverable:
//
//   · **"any button leaves"** — a TAP on any button, which means every button is
//     a trap. You cannot rest a thumb anywhere, and the page never says which
//     button did it. ⚠️ THE BUTTON WAS NEVER THE FAULT — THE TAP WAS, and that
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
// your thumb, and it can be labelled. The label floats at the controller, says
// what the button does, and fills a ring while the button is down. Let go early
// and nothing happens — which is what makes it safe to put on a button somebody
// might press by accident.
//
// ⚠️ THE DEAD-MAN'S SWITCH STAYS AND IS NOT THIS. It ends a session when
// NOTHING HAS BEEN DRAWN for a few seconds, which is the case where the page
// threw and there is no ring, no label and no render loop to draw one. The two
// cover different failures: this one is for a person who wants out, that one is
// for a page that has stopped being able to offer anything. CLAUDE.md records
// the failure it prevents in as many words — session live, nothing drawing, no
// way out, no log line — and it is not a user-facing exit, so it survived the
// cull below.
//
// 🔴 ANY BUTTON, NOT BUTTON 4. CHANGED 2026-09-17 ON INSTRUCTION: *"all vr/ar
// general  make one general way to get out. hold down any controller button for
// looooong enough then it quits. no other exit methods/ui's for now."* The
// named-button version was already the good half of this design — the hold, the
// ring, the label — and it still asked somebody in a headset to find one
// particular button under their thumb. Every button now advances the same hold,
// so the gesture is "press something and keep pressing it", which is what a
// person does when they want out and cannot see their hands.
//
// ⚠️ AND THE TRIGGER IS A BUTTON. On `/blocks/` and `/mirror/` the trigger is
// also what drags a thing, so a drag held longer than `HOLD_MS` ends the
// session. That is a real cost and it is why the ring is drawn from the first
// millisecond of any press rather than appearing part way: a drag that is about
// to become an exit says so in front of you, and letting go cancels it to zero.
// UNVERIFIED IN A HEADSET — nobody here has one — so it is written down rather
// than claimed to be fine.
// ⚠️ A page that needs one exact button back passes `button: 4`, which is A on a
// right Touch controller and X on a left one in the `xr-standard` mapping.

/**
 * 🔴 HOW LONG THE HOLD IS, AND WHY THIS NUMBER.
 * 3 s. Long enough that nothing accidental reaches it: a brush is under 300 ms
 * and a deliberate press about 500, so an exit at three seconds cannot be
 * arrived at by resting a thumb. Short enough to be reachable by somebody who
 * wants out NOW — three seconds is about as long as anybody will hold a control
 * before deciding it is broken, and the ring says how far the hold has got, so
 * the wait is spent watching something happen rather than wondering.
 * ⚠️ It was 900 ms while the exit was one named button nobody would press by
 * accident. With every button live, 900 ms is a trap.
 */
const HOLD_MS = 3000;
const PX = 256;               // the label texture, square
/**
 * 🔴 HOW BIG THE BADGE IS IN THE WORLD, IN METRES, AND IT WAS TWICE THIS.
 * Reported 2026-09-16: *"make smaller. its a small thing perpendicular to
 * button"*. At 75 mm it was a sign held over the controller; at 40 mm it is a
 * marking ON one, which is what a face button's legend actually is. The whole
 * badge is about the width of the thumb resting under it.
 */
const SIZE = 0.040;
/**
 * 🔴 HOW FAR OFF THE BUTTON IT SITS, ALONG THE CONTROLLER'S OWN AXIS.
 * Reported 2026-09-16: *"its a small thing perpendicular to button"*. It used
 * to be lifted along WORLD up, which is right for a sign and wrong for a
 * legend: turn your wrist over and the badge stayed hanging above the grip
 * while the button it names rotated away underneath it. Along the grip's own
 * up it stands off the face the button is on and turns with the hand, which is
 * what perpendicular to the button means.
 * ⚠️ HALVED WITH THE BADGE. 55 mm above a 75 mm sign was proportionate; above
 * a 40 mm marking it was a balloon on a string.
 */
const LIFT = 0.030;

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
  // a fix — a Quest reported GL_INVALID_OPERATION on its first frame for
  // exactly this and drew correctly anyway, because the linker happened to pick
  // the same slot.
  gl.bindAttribLocation(p, 0, 'aCorner');
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  return p;
}

/** What `button` means when a page names no index: every button on every
 *  controller advances one hold. */
export const ANY_BUTTON = 'any';

/**
 * @param {WebGL2RenderingContext} gl
 * @param {object} [o]
 * @param {string} [o.label]    what the hold does. Read at arm's length, in a
 *                              headset, once — so three short words at most.
 * @param {number|'any'} [o.button]  gamepad index, or `'any'` (the default).
 * @param {number} [o.holdMs]   how long to hold. Long enough that a brush is
 *                              not a press; short enough to be a decision.
 * @param {Function} o.onQuit   called once, when the ring fills.
 */
export function createXRQuit(gl, { label = 'Hold to quit', button = ANY_BUTTON,
  holdMs = HOLD_MS, onQuit = () => {} } = {}) {
  const cv = document.createElement('canvas');
  cv.width = PX; cv.height = PX;
  const g = cv.getContext('2d');

  let prog = null, vao = null, tex = null, drawn = -1, fired = false;
  let why = null;                                 // why it would not build, if it did not
  let held = 0;                                  // ms the button has been down
  let lastFrom = null;                            // which hand is holding it
  let lastIndex = null;                           // which button is holding it

  /**
   * ⚠️ REDRAWN ONLY WHEN THE PICTURE CHANGES, and the picture is a hundredth of
   * a turn. `texImage2D` of a 256-square canvas on every frame of a 90 Hz
   * headset is 23 MB a second of upload to say the same thing; quantising the
   * progress means the texture moves about ninety times over the whole hold.
   */
  function paint(p) {
    const q = Math.round(p * 100);
    if (q === drawn) return;
    drawn = q;
    const f = q / 100;
    g.clearRect(0, 0, PX, PX);
    const cx = PX / 2, cy = PX / 2, r = PX * 0.40;
    /**
     * 🔴 NO CIRCLE UNTIL THERE IS SOMETHING TO COUNT. Reported 2026-09-16:
     * *"initially no circle, its appears on countdown (no bg circle just
     * arc). make it thinner and just white and bit rounded"*.
     *
     * There was a faint full circle behind it at all times, on the argument
     * that the arc needs somewhere to fill INTO. That is a good argument about
     * a progress bar on a screen and the wrong one here: a ring drawn round a
     * word on a controller you are not pressing is a shape that means nothing
     * yet, and it is the loudest thing on the badge. The arc appearing from
     * nothing IS the feedback. With no hold there is a word and no geometry at
     * all.
     *
     * ⚠️ WHITE, NOT THE SITE'S YELLOW. Yellow in here is spent on the thing
     * that is running; this is the way out, which is furniture until the moment
     * you use it. ⚠️ AND THINNER, with round caps, which is the `bit rounded`:
     * at 0.055 of the badge it read as a heavy dial, and a countdown that has
     * only to be SEEN does not need weight.
     */
    if (f > 0) {
      g.lineWidth = PX * 0.030;
      g.strokeStyle = '#ffffff';
      g.lineCap = 'round';
      g.beginPath();
      g.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f);
      g.stroke();
    }
    // ⚠️ THE LABEL IS INSIDE THE RING, not under it. A caption below the badge
    // is a second thing to find at arm's length; inside, the ring is a frame
    // round the word and the whole badge is one object.
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const words = label.split(' ');
    const lines = words.length > 2
      ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')]
      : words;
    const size = lines.length > 1 ? PX * 0.115 : PX * 0.15;
    g.font = `600 ${size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    lines.forEach((ln, i) => {
      g.fillText(ln, cx, cy + (i - (lines.length - 1) / 2) * size * 1.25);
    });
  }

  function ensure() {
    if (prog) return true;
    try {
      prog = compile(gl, VS, FS);
      prog.__u = {
        VP: gl.getUniformLocation(prog, 'uVP'), O: gl.getUniformLocation(prog, 'uO'),
        R: gl.getUniformLocation(prog, 'uR'), U: gl.getUniformLocation(prog, 'uU'),
        tex: gl.getUniformLocation(prog, 'uTex'), a: gl.getUniformLocation(prog, 'uAlpha'),
      };
      vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.bindVertexArray(null);
      tex = gl.createTexture();
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

  /** One badge, at one grip. See `draw` for why there is one per hand. */
  function drawAt(vp, m, eye) {
    // The grip's own up: column 1 of its matrix, which points out of the face
    // the button is on. Normalised, because a grip matrix is not guaranteed
    // to be free of scale and a badge that changed size with the pose would
    // be a very confusing thing to look at.
    const uy = [m[4], m[5], m[6]];
    const ul = Math.hypot(uy[0], uy[1], uy[2]) || 1;
    const o = [
      m[12] + (uy[0] / ul) * LIFT,
      m[13] + (uy[1] / ul) * LIFT,
      m[14] + (uy[2] / ul) * LIFT,
    ];
    // Billboard: right is across the line of sight, up is perpendicular to
    // both. Computed per draw because the eye moves every frame.
    const f = [o[0] - eye[0], o[1] - eye[1], o[2] - eye[2]];
    const fl = Math.hypot(f[0], f[1], f[2]) || 1;
    const fz = [f[0] / fl, f[1] / fl, f[2] / fl];
    let r = [fz[2], 0, -fz[0]];
    const rl = Math.hypot(r[0], r[1], r[2]);
    // Looking straight down the badge's own axis leaves no side to face; any
    // fixed direction will do for the one frame it lasts.
    if (rl < 1e-4) r = [1, 0, 0]; else { r = [r[0] / rl, r[1] / rl, r[2] / rl]; }
    const u = [
      fz[1] * r[2] - fz[2] * r[1],
      fz[2] * r[0] - fz[0] * r[2],
      fz[0] * r[1] - fz[1] * r[0],
    ];
    const h = SIZE / 2;
    gl.useProgram(prog);
    gl.bindVertexArray(vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    if (drawn !== -2) {
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    const L = prog.__u;
    gl.uniformMatrix4fv(L.VP, false, vp);
    gl.uniform3fv(L.O, new Float32Array(o));
    gl.uniform3fv(L.R, new Float32Array([r[0] * h, r[1] * h, r[2] * h]));
    gl.uniform3fv(L.U, new Float32Array([u[0] * h, u[1] * h, u[2] * h]));
    gl.uniform1i(L.tex, 0);
    // ⚠️ FAINT UNTIL IT IS BEING USED. A badge at full strength on every
    // controller, all the time, is a label competing with whatever the page is
    // about; at a third it is a thing you notice when you look at your hand.
    gl.uniform1f(L.a, held > 0 ? 1 : 0.34);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return true;
  }

  return {
    /**
     * 🔴 COMPILE NOW, SO SOMETHING OTHER THAN A HEADSET CAN GRADE IT. Everything
     * in here is lazy until the first `draw`, which means the object existing
     * says nothing at all about whether its shader builds. A page asserting
     * "there is a way out" off the object alone passes on a broken badge:
     * PROVED by making `compile` throw and watching the check stay green.
     * Returns whether it is really ready.
     */
    prepare() { return ensure(); },
    /** Why it would not build, or null. */
    get why() { return why; },
    /** How far through the hold, 0..1 — published so a page can assert it. */
    get progress() { return Math.min(1, held / holdMs); },
    get holding() { return held > 0; },
    /** `'any'`, or the one index a page asked for. */
    get button() { return button; },
    /** Which button index is actually holding it right now, or null. Published
     *  so a run can say WHICH button somebody found, which is the only way to
     *  learn whether "any" was the right answer. */
    get pressed() { return lastIndex; },
    get holdMs() { return holdMs; },
    get label() { return label; },

    /**
     * Read the controllers and advance the hold.
     *
     * 🔴 RELEASING CANCELS, AND IT CANCELS TO ZERO. A hold that kept its
     * progress between presses would let somebody quit by brushing the button
     * nine times over a minute, which is the accident this design exists to
     * prevent. ⚠️ And it only ever fires ONCE: `session.end()` is async, and a
     * ring that stays full for three more frames would ask three times.
     */
    update(inputSources, dt) {
      let down = false, from = null, which = null;
      for (const src of inputSources || []) {
        const pad = src.gamepad;
        if (!pad) continue;
        // ⚠️ EVERY BUTTON, NOT ONE. `pad.buttons` is whatever the runtime
        // reports for this controller, so this covers the trigger, the squeeze,
        // the thumbstick click, A/X, B/Y, the thumbrest and the menu without
        // this file having to know which indices a given headset uses — which
        // is the whole point of "any". A page that named an index gets that
        // index and nothing else.
        if (button === ANY_BUTTON) {
          for (let i = 0; i < pad.buttons.length; i++) {
            if (pad.buttons[i]?.pressed) { down = true; from = src; which = i; break; }
          }
        } else if (pad.buttons[button]?.pressed) { down = true; from = src; which = button; }
        if (down) break;
      }
      lastFrom = down ? from : null;
      lastIndex = down ? which : null;
      if (!down) { held = 0; return 0; }
      held += Math.max(0, dt) * 1000;
      if (held >= holdMs && !fired) { fired = true; onQuit(); }
      return Math.min(1, held / holdMs);
    },

    /**
     * Draw the badge at a controller.
     *
     * 🔴 BILLBOARDED AGAINST THE EYE THE VIEW MATRIX DESCRIBES, not against a
     * camera position the page passes in. A headset draws two views 64 mm
     * apart; orienting on one eye's answer for both is not a smear, it is a
     * DISPARITY — the badge reads as sitting at a depth it is not at.
     * `eyeFromView` takes the position out of the matrix that is doing the
     * projecting, so the two cannot disagree.
     *
     * 🔴 ON EVERY HAND, NOT ON THE FIRST ONE. It drew at `grips[0]` while the
     * exit was one named button; with any button live the hold can start on
     * either controller, and a ring filling on the hand you are NOT pressing is
     * feedback pointing at the wrong place. Both hands carry the same badge and
     * the same ring, so whichever one you pressed is the one you are looking at
     * when it starts to fill.
     *
     * @param {Float32Array} vp     projection * view for THIS eye
     * @param {Array} grips         one grip matrix per hand, in the same order
     *                              as the sources handed to `update`
     * @param {number[]} eye        the eye position, from `eyeFromView(view)`
     */
    draw(vp, grips, eye) {
      if (!ensure() || !grips?.length || !eye) return false;
      paint(this.progress);
      let any = false;
      for (const m of grips) if (m && drawAt(vp, m, eye)) any = true;
      return any;
    },

    /** Let the page start a fresh session without a stale fire. */
    reset() { held = 0; fired = false; drawn = -1; },
    get from() { return lastFrom; },
  };

}
