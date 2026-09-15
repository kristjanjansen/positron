// demo/shell/xr-quit.mjs — the way out of an immersive session, on the
// controller, with a ring that fills while you hold it.
//
// 🔴 WHY THIS REPLACED THREE OTHER ANSWERS. Every headset page here has had its
// own exit and none of them was discoverable:
//
//   · **"any button leaves"** — which means every button is a trap. You cannot
//     rest a thumb anywhere, and the page never says which button did it.
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
// for a page that has stopped being able to offer anything.
//
// ⚠️ BUTTON 4, BY NAME. In the `xr-standard` gamepad mapping button 4 is A on a
// right Touch controller and X on a left one — the near face button, under the
// thumb, present on both hands. 0 is the trigger and 1 the squeeze, which pages
// use for pointing and grabbing; 3 is the thumbstick click, which is under the
// thumb that steers. 4 is the one left, on both hands, on every headset this
// runs on. A page that needs it for something else passes its own index.

const HOLD_MS = 900;
const PX = 256;               // the label texture, square
const SIZE = 0.075;           // how big the badge is in the world, in metres
const LIFT = 0.055;           // how far above the grip it floats

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

/**
 * @param {WebGL2RenderingContext} gl
 * @param {object} [o]
 * @param {string} [o.label]    what the button does. Two words at most: it is
 *                              read at arm's length, in a headset, once.
 * @param {number} [o.button]   gamepad index. 4 unless a page needs it.
 * @param {number} [o.holdMs]   how long to hold. Long enough that a brush is
 *                              not a press; short enough to be a decision.
 * @param {Function} o.onQuit   called once, when the ring fills.
 */
export function createXRQuit(gl, { label = 'HOLD TO QUIT', button = 4,
  holdMs = HOLD_MS, onQuit = () => {} } = {}) {
  const cv = document.createElement('canvas');
  cv.width = PX; cv.height = PX;
  const g = cv.getContext('2d');

  let prog = null, vao = null, tex = null, drawn = -1, fired = false;
  let why = null;                                 // why it would not build, if it did not
  let held = 0;                                  // ms the button has been down
  let lastFrom = null;                            // which hand is holding it

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
    const cx = PX / 2, cy = PX / 2, r = PX * 0.34;
    // the track, so the ring has somewhere to fill into rather than appearing
    g.lineWidth = PX * 0.055;
    g.strokeStyle = 'rgba(255,255,255,.18)';
    g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
    if (f > 0) {
      g.strokeStyle = '#ffd400';
      g.lineCap = 'round';
      g.beginPath();
      g.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f);
      g.stroke();
    }
    // ⚠️ THE LABEL IS INSIDE THE RING, not under it. A caption below the badge
    // is a second thing to find at arm's length; inside, the ring is a frame
    // round the words and the whole badge is one object.
    g.fillStyle = f >= 1 ? '#ffd400' : '#ffffff';
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
    get button() { return button; },
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
      let down = false, from = null;
      for (const src of inputSources || []) {
        const pad = src.gamepad;
        if (!pad) continue;
        if (pad.buttons[button]?.pressed) { down = true; from = src; break; }
      }
      lastFrom = down ? from : null;
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
     * @param {Float32Array} vp     projection * view for THIS eye
     * @param {Array} grips         one grip matrix per hand, in the same order
     *                              as the sources handed to `update`
     * @param {number[]} eye        the eye position, from `eyeFromView(view)`
     */
    draw(vp, grips, eye) {
      if (!ensure() || !grips?.length || !eye) return false;
      paint(this.progress);
      const m = grips[0];
      if (!m) return false;
      const o = [m[12], m[13] + LIFT, m[14]];
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
    },

    /** Let the page start a fresh session without a stale fire. */
    reset() { held = 0; fired = false; drawn = -1; },
    get from() { return lastFrom; },
  };
}
