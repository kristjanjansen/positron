// archive/videoradio-xr/sea-in-window.js — the sea `/videoradio/` drew under
// its picture, removed 2026-09-16. See README.md.
//
// 🔴 NOT A MODULE. Kept verbatim, in source order, the same way `xr-half.js` is.


// ── the CSS ─────────────────────────────────────────────────────────────

  /* 🔴 THE SEA, IN THE WINDOW, UNDER THE PICTURE. It is the same geometry a
     headset stands in, drawn from a camera that turns slowly on the spot, and
     it exists so the thing can be looked at without putting a headset on. Two
     real defects went unseen through two device runs for want of it.
     ⚠️ A FIXED HEIGHT, NOT AN ASPECT RATIO. The picture above is 16:9 because
     it IS a screen; this is a window onto a world, and what it needs is enough
     height to show the horizon and the water under it without taking the page
     over. It does not move when the column width changes.
     🔴 150 px, DOWN FROM 240, ON INSTRUCTION 2026-09-16: *"also lower 3d scene
     in desktop page"*, in the same message that archived the headset half. The
     240 was sized for a picture that was standing in for something you would
     otherwise put a headset on to see, and there is no headset to stand in for
     any more: it is a second view of the same bytes, under the one a visitor
     came for, and it should read as that. The horizon still sits in the upper
     third with water under it, which is the whole of what the height was for. */
  .vr-sea {
    display: block; background: var(--card2);
    border: 1px solid var(--line2); border-radius: 4px; overflow: hidden;
  }
  .vr-sea canvas { display: block; width: 100%; height: 150px; }
  /* ⚠️ A SENTENCE THAT NEVER CHANGES, so it may be prose under a picture that
     redraws every frame. CLAUDE.md's rule is about text that rewrites itself
     and reflows; this says the same words for ever. */
  .vr-seanote {
    margin: 0; padding: 8px 10px; border-top: 1px solid var(--line2);
    color: var(--dim); font-size: 12.5px;
  }

// ── the shape of the water, and the two shaders ─────────────────────────

  const SEA = {
    // Both radii in metres, and the mesh is bigger than the outer one so its
    // own edge is already gone before it is reached.
    fadeFrom: 11, fadeTo: 16, y: 0.02,
    // How far the water goes: a 34 m square centred on where you are standing,
    // which puts its nearest edge 17 m out and the fade finished at 16.
    spanX: 34, spanZ: 34,
    // 🔴 HOW HIGH A CREST STANDS, IN METRES. A wave you are standing among has
    // to be shin-high at most or it is a wall: 0.55 m at full density reads as
    // swell from an eye 1.6 m up, and the whole point is that you are ON the
    // sea rather than looking at a relief map of one.
    lift: 0.8,
    // 🔴 HOW THICK A WAVE FRONT IS, IN METRES BELOW ITS OWN CREST. This is what
    // replaced a line width: `gl.lineWidth` is capped at 1 in every shipping
    // WebGL, so a front was one device pixel wherever you stood. 7 cm is a bold
    // band underfoot and a thin one at the fade, which is what perspective does.
    band: 0.07,
    // How many lines and how many points along each. 46 is `LOOK.rows`, and
    // keeping it is keeping the picture: the note by `rows` records that 72
    // merged into a grey ramp and that the GAP between lines is worth more
    // than the line. 192 points is 33 per metre at the near edge.
    cols: 192,
    // 🔴 THE FADE TARGET AND THE CLEAR COLOUR ARE ONE TRIPLE, AND THIS IS IT.
    // `/floor/` paid for typing them twice with a ring of faded geometry
    // reading as a brighter disc on a darker void, at exactly the radius the
    // fade was meant to hide. `xr-panel.mjs` hands `bg` to `draw()`.
    bg: [0.018, 0.022, 0.030],
  };

  /**
   * 🔴 REAL GEOMETRY, NOT A PICTURE OF IT. THIS REPLACED A TEXTURED PLANE AND
   * THE REPORT THAT KILLED THAT PLANE IS WORTH KEEPING:
   *
   *   *"nothing is happening in this really lowres floor pseudotexture except
   *   some scattered lines on top of floor wave texture. make actual wave
   *   outlines / geometry moving."*
   *
   * Stage A put the composite on a quad on the ground, which is a PHOTOGRAPH
   * of a landscape lying on the carpet: its perspective, its hidden-line
   * removal and its vignette are all screen-space, computed for an eye that is
   * not yours, and flattening it on the floor leaves the crests as marks rather
   * than as things standing up. `archive/videoradio-xr/plan-videoradio-xr.md` §2.1 said so before it
   * was built and the picture proved it.
   *
   * 🔴 AND IT IS CHEAPER, WHICH THE FIRST HEADSET RUN MEASURED. That run held
   * **72 fps** where `/earshot/` on the same device held 90.0, and the only
   * heavy thing in it was a full-screen chain at 1920x1080 whose `OUT_FS` loops
   * over 46 rows PER PIXEL: about 95 million inner iterations a frame. This
   * mesh is 46 x 192 vertices and some thin lines. The chain is not built in a
   * session at all any more.
   *
   * ⚠️ IT READS THE DATA TEXTURE DIRECTLY, WHICH IS THE SAME 64x4 BYTES THE
   * WINDOW'S SHADER READS. Not the same arithmetic, and that is deliberate
   * rather than sloppy: `h` in `OUT_FS` mixes the bucket density with the
   * luminance of the ACCUMULATED FIELD, and there is no accumulated field here
   * because there is no chain. What is left is the density itself plus the same
   * standing wave, which is the quantity the picture was always of.
   */
  const SEA_VS = `#version 300 es
  precision highp float;
  uniform mat4 uProj, uView;
  uniform sampler2D uData;
  uniform vec2 uCentre;
  uniform vec4 uCfg;          // spanX, spanZ, lift, floorY
  in vec3 aRCF;               // row 0..1, column 0..1, 1 at the floor edge
  out vec3 vW;
  out float vH;
  out float vDrop;            // metres below this wave's own crest
  vec4 D(int x, int y) { return texelFetch(uData, ivec2(x, y), 0); }
  void main() {
    float loud  = D(0, 3).r;
    float lowB  = D(1, 3).r;
    float pulse = D(19, 3).r;
    float drift = D(21, 3).r;
    float u = aRCF.y, v = aRCF.x;
    // 🔴 THE SAME FACET INTERPOLATION THE WINDOW USES, and for the same reason:
    // sampling the buckets with a linear filter rounds every ridge into one
    // soft hump, so 46 of them are 46 copies of one shape. texelFetch on the
    // bucket row, interpolated between CENTRES, gives a polygonal crest cut by
    // the data rather than by a smoothing kernel.
    float cf = clamp(u * 64.0 - 0.5, 0.0, 63.0);
    int c0 = int(floor(cf));
    int c1 = min(c0 + 1, 63);
    float mixf = fract(cf);
    vec4 b0 = D(c0, 0), b1 = D(c1, 0);
    float d0 = clamp(b0.r * 255.0 / 2.2, 0.0, 1.0);
    float d1 = clamp(b1.r * 255.0 / 2.2, 0.0, 1.0);
    float mf = mix(mixf, clamp((mixf - 0.5) * 2.2 + 0.5, 0.0, 1.0), ${LOOK.facet.toFixed(4)});
    float dens = mix(d0, d1, mf);
    // the bucket's grain position bends the crest, so two rows over the same
    // density are not the same shape
    dens *= mix(1.0, 0.55 + 0.45 * sin(mix(b0.g, b1.g, mf) * 9.4 + v * 6.0), ${LOOK.bucket.toFixed(4)});
    /**
     * 🔴 THE SEA MOVES WITH NO SOUND AT ALL, AND IT DID NOT. Reported as
     * *"these floor lines, they just lie there"*, and the cause was one
     * subtraction: the height was \`max(0.0, h - valley)\` with valley at 0.30,
     * while the standing wave alone only ever reaches 0.055. So with nothing
     * playing EVERY VERTEX clamped to exactly the floor and the mesh was 46
     * perfectly straight lines drawn on the ground. It looked like a mesh that
     * was not reading its data; it was reading it and throwing the answer away.
     *
     * Two repairs. The swell is its own term with its own amplitude, so there
     * is water before there is any signal. And the clamp is gone: \`valley\` is
     * a MID POINT, so a quiet stretch sinks BELOW the surface and a loud one
     * rises, which is what gives a wave a trough to have a crest above.
     */
    float swell = 0.34 * sin(u * 2.7 + v * 5.0 - drift * 6.28318)
                + 0.22 * sin(u * 6.1 - v * 3.3 + drift * 9.90)
                + 0.16 * sin(v * 31.416 - drift * 12.566);
    vH = clamp(dens + 0.35 * swell + 0.35, 0.0, 1.5);
    /**
     * 🔴 EVERY HEIGHT IS METRES ABOVE THE FLOOR, AND NOTHING IS SUBTRACTED
     * FROM IT. It used to be \`(h - valley) * amp * lift\` with valley at 0.30,
     * borrowed from the window's shader where valley is a MID POINT in a
     * picture that has no floor to sink through. Here it does: with no sound
     * the whole expression is negative, so THE ENTIRE SEA SAT 3 cm UNDER THE
     * GROUND. Reported from a headset as *"videoradio floor is not moving. i
     * see dotgrid through it and my controller. totally broke"* — the grid was
     * visible because the water was below it.
     *
     * Three terms, all in metres, all added:
     *   rest   how high the calm surface floats, so there is always water
     *   roll   the swell, which is there with nothing playing at all
     *   sound  what the instrument adds on top of that
     */
    float rest  = 0.35;
    float roll  = 0.30 * swell * (1.0 - loud * 0.45);
    float sound = dens * (0.30 + 1.30 * loud + 0.50 * lowB)
                * mix(1.0, 0.78 + 0.34 * pulse, 0.6) * uCfg.z;
    float crest = uCfg.w + rest + roll + sound;
    // The curtain runs from the crest to well BELOW the floor, so no trough can
    // ever show the ground through itself and the grid is hidden by the water
    // rather than by luck.
    float y = mix(crest, uCfg.w - 0.6, aRCF.z);
    vDrop = crest - y;
    vec3 w = vec3(uCentre.x + (u - 0.5) * uCfg.x, y, uCentre.y + (v - 0.5) * uCfg.y);
    vW = w;
    gl_Position = uProj * uView * vec4(w, 1.0);
  }`;


// ── the fragment shader ─────────────────────────────────────────────────

  const SEA_FS = `#version 300 es
  precision highp float;
  uniform vec2 uCentre;
  uniform vec3 uBg;
  uniform vec3 uFade;         // from, to, band thickness in metres
  in vec3 vW;
  in float vH;
  in float vDrop;
  out vec4 o;
  void main() {
    // 🔴 FROM THE EYE, NOT FROM THE WORLD. A fade centred anywhere else moves
    // under you as you walk and reaches full opacity behind your back.
    float far = distance(vW.xz, uCentre);
    float a = 1.0 - smoothstep(uFade.x, uFade.y, far);
    /**
     * 🔴 THE LINE IS THE TOP OF A SOLID WAVE FRONT, NOT A LINE.
     * Reported as *"these lines are way too thin and do nada"*, and they were:
     * \`gl.lineWidth\` is capped at 1 in every shipping WebGL, so a wave front
     * was one device pixel wherever you stood and vanished at any distance.
     *
     * Every wave is a curtain from its crest down to below the floor, and this
     * lights the top few centimetres of it. Thickness is therefore a distance
     * IN METRES rather than in pixels: a near crest is a bold band and a far
     * one is thin, which is what perspective does and what a line width can
     * never do. The curtain below it is the ground's own colour and writes
     * depth, so a wave behind a crest is simply behind something. That is the
     * hidden-line removal the window's shader does by hand with a break and a
     * margin, done here by the depth buffer from wherever you are standing.
     */
    float band = 1.0 - smoothstep(0.0, uFade.z, vDrop);
    // P7 phosphor: strikes blue-white at a tall crest and decays to a cold
    // grey, so height has a second channel.
    vec3 cold = vec3(0.38, 0.56, 0.92);
    vec3 c = mix(cold * 0.60, vec3(1.0), clamp(vH * 0.95, 0.0, 1.0));
    // MIXED INTO THE GROUND, NOT BLENDED. The curtains overlap in depth; a
    // transparent fringe that writes depth punches a hole the second eye cannot
    // fill, and one that does not write depth needs sorting.
    o = vec4(mix(uBg, c, band * a), 1.0);
  }`;

  /**
   * The sea: this page's picture as water you look across, under the screen.
   *
   * 🔴 STILL A FACTORY THOUGH THERE IS ONE OF THEM NOW. It became one because
   * there were two in two different contexts, and the headset's was archived on
   * 2026-09-16. What the shape buys is unchanged and is the reason not to
   * flatten it back: a program, a vertex array and a texture belong to the
   * context that made them, and module-level handles are how a second `attach`
   * silently overwrites the first's with objects that context cannot use.
   */


// ── the sea itself ──────────────────────────────────────────────────────

  function makeSea() {
   let seaProg = null, seaU = null, seaVao = null, seaFrames = 0;
   let seaGl = null, seaData = null, seaVerts = 0;
   return {
    attach(g) {
      const sh = (t, src) => {
        const o = g.createShader(t); g.shaderSource(o, src); g.compileShader(o);
        if (!g.getShaderParameter(o, g.COMPILE_STATUS)) throw new Error(g.getShaderInfoLog(o));
        return o;
      };
      seaProg = g.createProgram();
      g.attachShader(seaProg, sh(g.VERTEX_SHADER, SEA_VS));
      g.attachShader(seaProg, sh(g.FRAGMENT_SHADER, SEA_FS));
      // ⚠️ BEFORE `linkProgram`, NEVER AFTER. CLAUDE.md records a Quest
      // reporting GL_INVALID_OPERATION on its first frame and DRAWING CORRECTLY
      // ANYWAY, because the linker happened to choose the same slot.
      g.bindAttribLocation(seaProg, 0, 'aRCF');
      g.linkProgram(seaProg);
      if (!g.getProgramParameter(seaProg, g.LINK_STATUS)) throw new Error(g.getProgramInfoLog(seaProg));
      seaU = {};
      for (const n of ['uProj', 'uView', 'uData', 'uCentre', 'uCfg', 'uBg', 'uFade']) {
        seaU[n] = g.getUniformLocation(seaProg, n);
      }
      /**
       * The mesh, built once: every wave is a solid curtain from its crest down
       * past the floor, two triangles per segment.
       *
       * ⚠️ ONE BUFFER, ONE DRAW, AND NO SEPARATE LINES. It was a set of
       * `gl.LINES` over a skirt, which is two draws to say one thing and gave a
       * wave front one device pixel wide however near it was. The curtain IS
       * the wave now and the shader lights its top few centimetres, so
       * thickness is a distance in metres and a near crest is bolder than a far
       * one. 46 rows of 192 points is 52,440 vertices: nothing for a card that
       * was being asked to loop over 46 rows per pixel a moment ago.
       */
      const R = LOOK.rows, C = SEA.cols;
      const vtx = [];
      for (let r = 0; r < R; r++) {
        const v = (r + 0.5) / R;
        for (let c = 0; c < C - 1; c++) {
          const a = c / (C - 1), b = (c + 1) / (C - 1);
          // crest a, crest b, floor a  /  crest b, floor b, floor a
          vtx.push(v, a, 0, v, b, 0, v, a, 1,
                   v, b, 0, v, b, 1, v, a, 1);
        }
      }
      seaVerts = vtx.length / 3;
      seaVao = g.createVertexArray();
      g.bindVertexArray(seaVao);
      const vb = g.createBuffer();
      g.bindBuffer(g.ARRAY_BUFFER, vb);
      g.bufferData(g.ARRAY_BUFFER, new Float32Array(vtx), g.STATIC_DRAW);
      g.enableVertexAttribArray(0);
      g.vertexAttribPointer(0, 3, g.FLOAT, false, 0, 0);
      g.bindVertexArray(null);
      // Its own copy of the 64x4 bytes, in this context. A texture belongs to
      // the context that made it, so the window's cannot be read here at all.
      seaData = g.createTexture();
      g.bindTexture(g.TEXTURE_2D, seaData);
      g.texImage2D(g.TEXTURE_2D, 0, g.RGBA8, DATA_W, DATA_H, 0, g.RGBA, g.UNSIGNED_BYTE, null);
      for (const q of [g.TEXTURE_MIN_FILTER, g.TEXTURE_MAG_FILTER]) g.texParameteri(g.TEXTURE_2D, q, g.NEAREST);
      for (const q of [g.TEXTURE_WRAP_S, g.TEXTURE_WRAP_T]) g.texParameteri(g.TEXTURE_2D, q, g.CLAMP_TO_EDGE);
      seaGl = g;
      seaFrames = 0;
      d.log(`the sea is ${R} wave fronts of ${C} points, standing up out of the `
        + `same bytes the picture is drawn from (${seaVerts} vertices)`);
      return true;
    },
    /** The data the mesh stands on, once a frame. */
    step() {
      if (!seaGl || !seaData || !lastBytes) return;
      seaGl.bindTexture(seaGl.TEXTURE_2D, seaData);
      seaGl.texSubImage2D(seaGl.TEXTURE_2D, 0, 0, 0, DATA_W, DATA_H,
        seaGl.RGBA, seaGl.UNSIGNED_BYTE, lastBytes);
      seaFrames++;
    },
    draw({ proj, view, eye, bg }) {
      if (!seaProg || !seaGl) return;
      const g = seaGl;
      g.useProgram(seaProg);
      g.bindVertexArray(seaVao);
      g.uniformMatrix4fv(seaU.uProj, false, proj);
      g.uniformMatrix4fv(seaU.uView, false, view);
      g.uniform2f(seaU.uCentre, eye[0], eye[2]);
      g.uniform4f(seaU.uCfg, SEA.spanX, SEA.spanZ, SEA.lift, SEA.y);
      g.uniform3f(seaU.uFade, SEA.fadeFrom, SEA.fadeTo, SEA.band);
      g.uniform3fv(seaU.uBg, bg);
      g.activeTexture(g.TEXTURE0);
      g.bindTexture(g.TEXTURE_2D, seaData);
      g.uniform1i(seaU.uData, 0);
      // ⚠️ NO CULLING. A curtain is a two-sided sheet and you can walk round
      // behind one; the room turns culling on for its own walls, and a wave
      // that vanished from one side would look like a hole in the water.
      g.disable(g.CULL_FACE);
      g.drawArrays(g.TRIANGLES, 0, seaVerts);
      g.bindVertexArray(null);
    },
    /** For the checks: how many frames of data the mesh has been given. */
    frames: () => seaFrames,
   };
  }





// ── the canvas it drew into, its camera, and one frame of it ────────────

  // ── the sea, in the window, under the picture ─────────────────────────────
  //
  // 🔴 ASKED FOR AFTER TWO HEADSET RUNS FOUND NOTHING: *"why do not you do
  // local 3d rendering first below prev one"* — below the quartz renderer.
  // It is the right instrument and it would have caught both of the bugs those
  // runs did not: that the page's frame loop stops inside a session, and that
  // the whole mesh was sitting under the floor. Neither is visible from a
  // laptop through `preview()`, which draws the surface but says nothing about
  // a clock it is not driving, and both are obvious the moment the same
  // geometry is on screen in front of you.
  //
  // ⚠️ THE SAME `makeSea`, THE SAME SHADERS, THE SAME BYTES. A preview built
  // from a second copy of the arithmetic would agree with itself and not with
  // the headset, which is the defect `timeline/csound.mjs` was green through
  // for months. The only things this owns are a canvas and a camera.
  const seaBox = el('div', 'vr-sea');
  const seaCv = el('canvas');
  seaBox.append(seaCv);
  const seaNote = el('p', 'vr-seanote',
    'The same sea a headset stands in, from a camera walking the water. '
    + 'It reads the bytes the picture above is drawn from.');
  seaBox.append(seaNote);
  pane.after(seaBox);

  const winSea = makeSea();
  let seaWinGl = null, seaWinOk = false;
  try {
    seaWinGl = seaCv.getContext('webgl2', { antialias: true, alpha: false });
    if (seaWinGl) { winSea.attach(seaWinGl); seaWinOk = true; }
    else {
      seaWinWhy = 'no webgl2 context';
      d.log('this browser gave no second 3-D context, so the sea stays in the headset', 'warn');
    }
  } catch (e) {
    seaWinWhy = e.message;
    d.log(`the sea would not build in the window: ${e.message}`, 'warn');
  }

  /** A perspective matrix, column major, the way GL wants it. */
  function persp(fovDeg, aspect, near, far) {
    const f = 1 / Math.tan((fovDeg * Math.PI / 180) / 2);
    const d = near - far;
    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) / d, -1,
      0, 0, (2 * far * near) / d, 0,
    ]);
  }
  /**
   * A view matrix from a yaw and a pitch at `eye`.
   *
   * ⚠️ THE SEA IS CENTRED ON THE EYE, so moving the camera moves the water with
   * it and nothing appears to happen. What this does instead is TURN: the eye
   * holds still at standing height and the look direction sweeps, which is what
   * shows the swell travelling past.
   */
  function lookFrom(eye, yaw, pitch) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    // right, up, back — the rows of the rotation, then the translation
    const r = [cy, 0, -sy];
    const u = [sy * sp, cp, cy * sp];
    const b = [sy * cp, -sp, cy * cp];
    return new Float32Array([
      r[0], u[0], b[0], 0,
      r[1], u[1], b[1], 0,
      r[2], u[2], b[2], 0,
      -(r[0] * eye[0] + r[1] * eye[1] + r[2] * eye[2]),
      -(u[0] * eye[0] + u[1] * eye[1] + u[2] * eye[2]),
      -(b[0] * eye[0] + b[1] * eye[1] + b[2] * eye[2]), 1,
    ]);
  }

  /**
   * A handle for a probe and for a person with devtools open: is the sea
   * drawing, how many frames has it had, and what did it refuse.
   *
   * 🔴 IT EXISTS BECAUSE A PIXEL READBACK CANNOT ANSWER THAT. With no
   * `preserveDrawingBuffer` the default framebuffer is unreadable once the
   * frame has been presented, so a `readPixels` from outside a rAF samples a
   * cleared surface and reports a black canvas over a picture that is fine.
   * MEASURED: a probe read `brightest 0` on this canvas and the only thing it
   * proved was that the probe was wrong. A counter is readable at any moment.
   */
  let seaWinFrames = 0, seaWinWhy = '';
  window.__sea = () => ({
    built: seaWinOk, frames: seaWinFrames, why: seaWinWhy,
    data: winSea.frames(), bytes: lastBytes ? lastBytes.length : 0,
    size: seaWinOk ? [seaCv.width, seaCv.height] : null,
  });

  /** One frame of the window's sea. Called from `tick`, never from a timer. */
  function drawWinSea(now) {
    if (!seaWinOk || !seaWinGl) return;
    seaWinFrames++;
    const g = seaWinGl;
    // ⚠️ SIZED FROM THE ELEMENT EVERY FRAME, CAPPED AT dpr 2. A canvas whose
    // backing store never follows its CSS box is a blurred picture on every
    // retina screen, and one that follows `devicePixelRatio` unbounded is four
    // times the fragments on a phone that cannot spare them.
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(64, Math.round(seaCv.clientWidth * dpr));
    const h = Math.max(48, Math.round(seaCv.clientHeight * dpr));
    if (seaCv.width !== w || seaCv.height !== h) { seaCv.width = w; seaCv.height = h; }
    winSea.step();
    g.viewport(0, 0, w, h);
    g.enable(g.DEPTH_TEST);
    g.disable(g.BLEND);
    g.clearColor(SEA.bg[0], SEA.bg[1], SEA.bg[2], 1);
    g.clear(g.COLOR_BUFFER_BIT | g.DEPTH_BUFFER_BIT);
    const eye = [0, 1.6, 0];
    // A slow sweep, and a little tilt down, so the swell is seen travelling
    // rather than head on. 40 seconds a turn: slower than anything in the
    // picture above, so what moves fast is the water and not the camera.
    const t = now / 1000;
    const yaw = Math.sin(t * (Math.PI * 2 / 40)) * 0.55;
    winSea.draw({
      proj: persp(62, w / h, 0.1, 60),
      view: lookFrom(eye, yaw, -0.17),
      eye, bg: SEA.bg,
    });
  }
