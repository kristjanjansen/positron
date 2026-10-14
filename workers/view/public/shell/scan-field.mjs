// demo/shell/scan-field.mjs: /videoradio/'s granulator picture as a module (also /shader/landscape/).
// Baked (`live: false`) types every look number into the GLSL; live reads them from `uK[]` in
// PARAMS order. Needs shell.css loaded first (reads --hi and --dim2). Everything that moves
// arrives in one 64 x 4 RGBA8 data texture, read with texelFetch, layout version at row 3 x 63:
//
//   row 0, x 0..63   grain deposit: R count, G mean length, B voice x32, A refused
//   row 1, x 0..22   parameters in MOD_DESTS order then probs 0..7: R now, G base, B modulated
//   row 2, x 0..63   read head: R scatter density, G 255 inside the window
//   row 3            0..5 followers (rms low mid high tone flux), 6 blend, 7 grains, 8 refused,
//                    9 morph, 10 from, 11 to, 12 loop, 13 lap, 14 station, 15 station change,
//                    16 trail survival, 17 voices x32, 18 read point knowable, 63 layout version
// why: lessons/kit-scan-field.md#header
export const DATA_W = 64, DATA_H = 4;
export const at = (x, y) => (y * DATA_W + x) * 4;
export const u8 = (v) => Math.max(0, Math.min(255, Math.round(v * 255)));

/**
 * Floors on mark brightness and the grains' share at blend 0, so a quiet page never goes black.
 * A check reads them, and they are interpolated into the body so the two cannot disagree.
 * At 0.25 and 0.15 the flat-field check flaked on a quiet programme (span 42 of 255 against 60).
 * why: lessons/kit-scan-field.md#lit-floor
 */

export const LIT_FLOOR = 0.40, LIT_RANGE = 0.60;
export const WET_FLOOR = 0.30, WET_RANGE = 0.70;


/**
 * The looks archive: `vista` is the working one, every other entry is kept at `?look=<name>`.
 * Before changing how vista looks, copy it to a new entry with a noun for a name, never a number.
 * A look is constants; a change of shape needs a flag here (facet, bucket, valley, mono).
 * why: lessons/kit-scan-field.md#looks
 */
export const LOOKS = {
  // 1. the first answer to the New Order reference. Stacked scanlines, white
  //    on black, no colour, height read from the drawn field alone.
  slab:   { swellY: 0.0, stretch: 0.0, keep: 0.962, chroma: 1.0, xbreath: 0.0, rows: 72, mirror: 0, mir: 1.00, baseA: 0.10, baseB: 0.66, baseE: 1.00,
            travel: 1.0, sway: 0.0, heave: 0.0, halo: 0.0, occl: 0.0,
            idle: 0.0, waves: 1, gamma: 1.45, gain: 1.35,
            mono: 1.0, valley: 0.0, facet: 0.0, bucket: 0.0,
            ampA: 0.26, ampL: 0.34, ampB: 0.0, ampM: 1.0, wide: 1.30, cam: 0.42 },
  // 2. the grain buckets became the height, and a standby wave arrived.
  // why: lessons/kit-scan-field.md#look-plot
  plot:   { swellY: 0.0, stretch: 0.0, keep: 0.962, chroma: 1.0, xbreath: 0.0, rows: 46, mirror: 0, mir: 1.00, baseA: 0.08, baseB: 0.70, baseE: 1.00,
            travel: 1.0, sway: 0.0, heave: 0.0, halo: 0.0, occl: 0.0,
            idle: 0.055, waves: 1, gamma: 1.45, gain: 1.35,
            mono: 1.0, valley: 0.0, facet: 0.0, bucket: 1.0,
            ampA: 0.10, ampL: 0.13, ampB: 0.05, ampM: 5.2, wide: 1.30, cam: 0.42 },
  // 3. the same picture with a still x axis. Archived the moment `vista` was
  //    about to start breathing, which is the protocol in this file's header.
  bluff:  { swellY: 0.0, stretch: 0.0, keep: 0.962, chroma: 1.0, xbreath: 0.0, rows: 46, mirror: 0, mir: 1.00, baseA: 0.06, baseB: 0.56, baseE: 0.72,
            travel: 1.0, sway: 0.0, heave: 0.0, halo: 0.0, occl: 0.0,
            idle: 0.055, waves: 1, gamma: 1.35, gain: 1.45,
            mono: 0.0, valley: 0.30, facet: 1.0, bucket: 1.0,
            ampA: 0.10, ampL: 0.13, ampB: 0.05, ampM: 5.2, wide: 1.55, cam: 0.38 },
  // 5. waves rolling toward the eye, bright on their own: the landscape pass alone carried
  // a mean of 0.07, so halo, gain and low chroma fix the fade.
  // why: lessons/kit-scan-field.md#look-swell
  swell:  { swellY: 0.0, stretch: 0.0, keep: 0.962, chroma: 0.35, rows: 54, mirror: 0, mir: 1.00, baseA: 0.05, baseB: 0.60, baseE: 0.74,
            travel: 0.35, sway: 0.0, heave: 0.0, halo: 1.0, occl: 6.0,
            idle: 0.075, waves: 3, gamma: 0.95, gain: 2.6, xbreath: 0.20,
            mono: 0.0, valley: 0.30, facet: 1.0, bucket: 1.0,
            ampA: 0.13, ampL: 0.16, ampB: 0.06, ampM: 5.4, wide: 1.55, cam: 0.38 },
  // quartz is vista with keep 0.995 (a trail decays over about half a minute, not sixty frames)
  // and xbreath 0, which stops the terrain heaving. keep cannot reach 1.0: the composite becomes
  // a max accumulator and the frame fills in.
  // why: lessons/kit-scan-field.md#look-quartz
  dune:   { swellY: 0.0, stretch: 1.6, keep: 0.995, chroma: 1.0, rows: 46, mirror: 0, mir: 1.00,
            baseA: 0.06, baseB: 0.56, baseE: 0.72,
            // travel 0 holds the rows at fixed depths, so the terrain does not slide vertically.
            // why: lessons/kit-scan-field.md#travel-zero
            travel: 0.0, sway: 0.0, heave: 0.0, halo: 0.0, occl: 0.0,
            idle: 0.055, waves: 1, gamma: 1.35, gain: 1.45, xbreath: 0.45,
            mono: 0.0, valley: 0.30, facet: 1.0, bucket: 1.0,
            ampA: 0.10, ampL: 0.13, ampB: 0.05, ampM: 5.2, wide: 1.55, cam: 0.38 },
  quartz: { swellY: 0.014, stretch: 1.6, keep: 0.995, chroma: 1.0, rows: 46, mirror: 0, mir: 1.00,
            baseA: 0.06, baseB: 0.56, baseE: 0.72,
            // travel 0 holds the rows at fixed depths, so the terrain does not slide vertically.
            // why: lessons/kit-scan-field.md#travel-zero-again
            travel: 0.0, sway: 0.0, heave: 0.0, halo: 0.0, occl: 0.0,
            idle: 0.055, waves: 1, gamma: 1.35, gain: 1.45, xbreath: 0.45,
            mono: 0.0, valley: 0.30, facet: 1.0, bucket: 1.0,
            ampA: 0.10, ampL: 0.13, ampB: 0.05, ampM: 5.2, wide: 1.55, cam: 0.38 },
  // 4. valleys, hard corners, a lower eye and the phosphor blue, and the
  //    perspective breathing on the grain clock.
  vista:  { swellY: 0.0, stretch: 0.0, keep: 0.962, chroma: 1.0, xbreath: 0.45, rows: 46, mirror: 0, mir: 1.00, baseA: 0.06, baseB: 0.56, baseE: 0.72,
            travel: 1.0, sway: 0.0, heave: 0.0, halo: 0.0, occl: 0.0,
            idle: 0.055, waves: 1, gamma: 1.35, gain: 1.45,
            mono: 0.0, valley: 0.30, facet: 1.0, bucket: 1.0,
            ampA: 0.10, ampL: 0.13, ampB: 0.05, ampM: 5.2, wide: 1.55, cam: 0.38 },
  // 4. the same, moving: rows travelling five times faster, a sway per row,
  //    and the amplitude breathing on the grain clock.
  ridge:  { swellY: 0.0, stretch: 0.0, keep: 0.962, chroma: 1.0, xbreath: 0.0, rows: 46, mirror: 0, mir: 1.00, baseA: 0.02, baseB: 0.86, baseE: 0.72,
            travel: 5.0, sway: 1.0, heave: 1.0, halo: 1.0, occl: 9.0,
            idle: 0.085, waves: 3, gamma: 1.15, gain: 1.9,
            mono: 0.0, valley: 0.30, facet: 1.0, bucket: 1.0,
            ampA: 0.10, ampL: 0.13, ampB: 0.05, ampM: 5.2, wide: 1.55, cam: 0.38 },
  // 5. folded about a horizon, so the terrain gets a reflection.
  pulsar: { swellY: 0.0, stretch: 0.0, keep: 0.962, chroma: 1.0, xbreath: 0.0, rows: 46, mirror: 1, mir: 0.52, baseA: 0.01, baseB: 0.50, baseE: 0.88,
            travel: 5.0, sway: 1.0, heave: 1.0, halo: 1.0, occl: 9.0,
            idle: 0.085, waves: 3, gamma: 1.15, gain: 1.9,
            mono: 0.0, valley: 0.30, facet: 1.0, bucket: 1.0,
            ampA: 0.10, ampL: 0.13, ampB: 0.05, ampM: 5.2, wide: 1.55, cam: 0.38 },
  // 6. many more rows, crowded toward the horizon.
  deep:   { swellY: 0.0, stretch: 0.0, keep: 0.962, chroma: 1.0, xbreath: 0.0, rows: 132, mirror: 0, mir: 1.00, baseA: 0.01, baseB: 0.92, baseE: 0.88,
            travel: 5.0, sway: 1.0, heave: 1.0, halo: 1.0, occl: 9.0,
            idle: 0.085, waves: 3, gamma: 1.15, gain: 1.9,
            mono: 0.0, valley: 0.30, facet: 1.0, bucket: 1.0,
            ampA: 0.10, ampL: 0.13, ampB: 0.05, ampM: 5.2, wide: 1.55, cam: 0.38 },
};

/** The size the window draws at, which is what the looks were tuned against. */
export const FIELD_W = 960, FIELD_H = 540;
/** The look /videoradio/ draws when `?look=` names nothing. */
export const DEFAULT_LOOK = 'quartz';
/** The most rows a live body draws; the deepest look has 132. */
export const MAX_ROWS = 160;

/**
 * The numbers a page may turn, in the order `uK[]` carries them: every key of
 * a look, then `EXTRA`. `EXTRA` holds the four the baked body types as
 * literals, at the value it types (the feedback zoom as a multiplier on its
 * own `0.008 + 0.012 * pulse`, so 1 is the baked picture).
 */
export const LOOK_KEYS = ['rows', 'keep', 'travel', 'swellY', 'stretch', 'xbreath', 'mirror', 'mir',
  'baseA', 'baseB', 'baseE', 'sway', 'heave', 'halo', 'occl', 'idle', 'waves', 'gamma', 'gain',
  'mono', 'chroma', 'valley', 'facet', 'bucket', 'ampA', 'ampL', 'ampB', 'ampM', 'wide', 'cam'];
export const EXTRA = { glow: 0.62, scan: 0.10, vig: 0.28, tunnel: 1 };
export const PARAMS = [...LOOK_KEYS, ...Object.keys(EXTRA)];

/**
 * The seven bodies for one look. `live` reads every number in `PARAMS` from
 * `uK[]` instead of typing it; see the header.
 */
export function fieldShaders(LOOK, { live = false } = {}) {
  const idx = (n) => {
    const i = PARAMS.indexOf(n);
    if (i < 0) throw new Error(`the field has no parameter ${n}`);
    return i;
  };
  // a look number, typed (baked) or read (live)
  const K = (n) => {
    if (live) return n === 'rows' ? `${MAX_ROWS}; int NROWS = int(uK[${idx(n)}] + 0.5)` : `uK[${idx(n)}]`;
    return n === 'rows' ? `${LOOK.rows}` : LOOK[n].toFixed(4);
  };
  // the two switches: mirror is 0 or 1, waves is 1 or 3
  const B = (n) => {
    if (n === 'mirror') return live ? `uK[${idx(n)}] > 0.5` : `${LOOK.mirror} == 1`;
    return live ? `uK[${idx(n)}] > 2.0` : `${LOOK.waves} == 3`;
  };
  // one of EXTRA: the baked body's own literal, or the live value
  const X = (n, text) => (live ? `uK[${idx(n)}]` : text);
  const DECL = live ? `uniform float uK[${PARAMS.length}];\n` : '';

  const VS = `#version 300 es
    void main(){ vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
      gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;

  /**
   * Monochrome: colour may only come back behind a flag the page sets by name. Highlight and dim
   * are read from shell.css at compile time; the spectral axis drives sharpness instead.
   * why: lessons/kit-scan-field.md#monochrome
   */
  const cssRGB = (name, fallback) => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const m = /^#?([0-9a-f]{6})$/i.exec(v);
    const hex = m ? m[1] : fallback;
    return [0, 2, 4].map((i) => (parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(4));
  };
  const HI = cssRGB('--hi', 'ffd400');
  const DIM = cssRGB('--dim2', '6b7486');

  const HEAD = `#version 300 es
    precision highp float;
    uniform vec2 uRes;
    uniform sampler2D uData;
    out vec4 o;
    vec4 D(int x, int y){ return texelFetch(uData, ivec2(x, y), 0); }
  `;

  /**
   * The accumulate pass: this frame's grains over what is left of the last. Greyscale, colour later,
   * so history is not re-tinted. No bed here: a per-frame add saturates to x/(1-decay).
   * why: lessons/kit-scan-field.md#acc-fs
   */
  const ACC_FS = HEAD + `
    uniform sampler2D uPrev;
    void main(){
      vec2 uv = gl_FragCoord.xy / uRes;
      int col = int(clamp(floor(uv.x * 64.0), 0.0, 63.0));
      vec4 g = D(col, 0);
      float tone  = D(4, 3).r;
      float decay = D(16, 3).r;
      // Tonal passages give crisp marks and noisy ones diffuse marks.
      float sharp = mix(16.0, 120.0, tone);
      float band  = exp(-abs(uv.y - g.g) * sharp);
      // Eight voices are eight phases of one striation, so a chord and a single
      // voice do not draw the same mark. The voice arrives as v*32/255.
      float stripe = 0.5 + 0.5 * cos(gl_FragCoord.x * 0.9 + g.b * 178.5);
      // 🔴 THE RED CHANNEL IS A COUNT AND THE COUNT IS USUALLY ONE OR TWO, so it
      // is undone back into grains before it is used. The channel holds 0..255
      // because the drop counter beside it needs to mean something, but at 60
      // frames a second and the rates this instrument runs at, an ordinary
      // bucket holds a handful: read as a 0..1 fraction, one grain is 1/255 and
      // a working page draws almost nothing. MEASURED before this line existed:
      // the widest colour channel spanned 42 of 255 on a picture with grains in
      // it, which is a working instrument drawn too dim to check. Two and a half
      // grains in one bucket in one frame is a fully lit mark.
      float n = g.r * 255.0;
      float hit = clamp(n / 3.2, 0.0, 1.0) * band * (0.45 + 0.55 * stripe);
      // 🔴 ADVECTION, AND THIS IS WHY THE PICTURE HAS SOMEWHERE TO GO. A trail
      // that samples uPrev at the SAME uv can only fade: every mark softens
      // exactly where it was laid down and the field is a still photograph
      // getting dimmer. Sampling UPSTREAM of a flow field carries the whole
      // deposit along, so a grain laid down now is somewhere else in a second
      // and somewhere else again after that. The marks are still the engine's;
      // what moves them is not.
      // The flow is two crossed waves rather than noise, because a wave has a
      // direction a viewer can follow and noise reads as boiling. Its speed is
      // the low and mid energy of the station, so a bassline drags the field
      // sideways and a quiet passage lets it settle.
      float lowB = D(1, 3).r, midB = D(2, 3).r;
      float ph = D(21, 3).r * 6.28318;
      vec2 flow = vec2(
         sin(uv.y * 7.0 + ph * 1.3) * (0.0006 + 0.0042 * lowB),
        -cos(uv.x * 5.0 - ph * 0.9) * (0.0004 + 0.0032 * midB));
      float prev = texture(uPrev, uv - flow).r * decay;
      // 🔴 SCREEN, NOT ADD, AND THIS IS WHAT THE MUDDINESS WAS. A clamped add
      // clamps, so anywhere busy pins at exactly 1.0 and STAYS there: a whole
      // band of the picture becomes one flat value, every difference inside it
      // is thrown away, and the present pass then paints that slab in one hue.
      // Reported as "this muddiness", with a screenshot of a solid yellow bar.
      // The screen blend approaches 1 and never reaches it, so density keeps its
      // gradient all the way up and the colour ramp below has something to read.
      float acc = 1.0 - (1.0 - prev) * (1.0 - hit);
      o = vec4(vec3(acc), 1.0);
    }`;

  /**
   * The present pass: the field, lit by the followers, over the read window. The blend scales the
   * grains and not the bed; decay still runs at blend 0, so the field fades rather than freezes.
   * why: lessons/kit-scan-field.md#present-fs
   */
  const PRESENT_FS = HEAD + `
    uniform sampler2D uField;
    const vec3 DIM = vec3(${DIM.join(', ')});
    /**
     * A RAMP, NOT A TINT. The old body was one colour times density, so every lit pixel was
     * the same hue at a different brightness and a busy picture was one slab of
     * yellow. A ramp gives density somewhere to go: cold and dark where the
     * instrument is barely reading, through a green-blue middle, to a warm
     * near-white only where grains really are stacking up.
     * Deliberately LOW SATURATION and deliberately not neon: asked for
     * *"dreamy, floaty"* and *"does not have to be sock synthwave"*.
     */
    vec3 ramp(float t){
      t = clamp(t, 0.0, 1.0);
      vec3 c = mix(vec3(0.07, 0.09, 0.20), vec3(0.16, 0.34, 0.46), smoothstep(0.00, 0.42, t));
      c = mix(c, vec3(0.42, 0.62, 0.58), smoothstep(0.34, 0.72, t));
      c = mix(c, vec3(0.96, 0.88, 0.72), smoothstep(0.66, 1.00, t));
      return c;
    }
    void main(){
      vec2 uv = gl_FragCoord.xy / uRes;
      int col = int(clamp(floor(uv.x * 64.0), 0.0, 63.0));
      vec4 w = D(col, 2);
      float loud  = D(0, 3).r;
      float tone  = D(4, 3).r;
      float flux  = D(5, 3).r;
      float wet   = D(6, 3).r;
      float loopy = D(12, 3).r;
      float head  = D(13, 3).r;
      float known = D(18, 3).r;
      float pulse = D(19, 3).r;
      float f = texture(uField, uv).r;
      // The read window as a DENSITY, not a rectangle: the dim half is the
      // window this sound may read from at all, the bright half is the scatter
      // the engine is actually sampling from, and it is zero where the read
      // point cannot be known rather than guessed at.
      float bed = 0.12 * w.g + 0.60 * w.r * known;
      // 🔴 THE VERTICAL BAR IS GONE. It was a hard 3-pixel column at the loop
      // head, reported as a *"pointless scanline"*, and a straight line across
      // a picture made of drifting marks is the one shape in it that is not
      // about the sound. The loop still reads: it warms and lifts the field it
      // is sitting over, across a soft 6% of the width.
      float lp = loopy * exp(-pow((uv.x - head) / 0.06, 2.0));
      // Brightness breathes with the grain clock. pulse is a phase advanced
      // by the grains the engine actually reported, so this is the instrument's
      // own rhythm rather than a free-running clock.
      float breathe = 0.86 + 0.14 * pulse;
      float lit = (${LIT_FLOOR} + ${LIT_RANGE} * loud) * (1.0 + 0.35 * flux) * breathe;
      float dens = clamp(f * lit * (${WET_FLOOR} + ${WET_RANGE} * wet), 0.0, 1.0);
      // A warm/cool lean from the spectral tilt, kept small on purpose: it is a
      // drift across the ramp, not a second palette.
      vec3 c = ramp(dens * (0.88 + 0.24 * tone) + 0.22 * lp);
      c *= smoothstep(0.0, 0.10, dens + 0.35 * bed + 0.5 * lp);
      c += DIM * bed * 0.55;
      o = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`;

  const COPY_FS = `#version 300 es
    precision highp float;
    uniform vec2 uRes; uniform sampler2D uSrc;
    out vec4 o;
    void main(){ o = vec4(texture(uSrc, gl_FragCoord.xy / uRes).rgb, 1.0); }`;

  /** Bright pass, at a quarter of the width, which is the blur's first half. */
  const BRIGHT_FS = HEAD + `
    uniform sampler2D uSrc;
    void main(){
      vec3 c = texture(uSrc, gl_FragCoord.xy / uRes).rgb;
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      o = vec4(c * smoothstep(0.42, 0.80, l), 1.0);
    }`;

  /**
   * One separable gaussian, run twice with its direction turned. Nine taps at a
   * quarter resolution is a wide, soft glow for very little: the whole point of
   * doing it small is that the blur is cheap and the softness is free.
   */
  const BLUR_FS = HEAD + `
    uniform sampler2D uSrc;
    uniform vec2 uDir;
    void main(){
      vec2 uv = gl_FragCoord.xy / uRes;
      vec2 st = uDir / uRes;
      float wt[5] = float[](0.2270, 0.1946, 0.1216, 0.0540, 0.0162);
      vec3 c = texture(uSrc, uv).rgb * wt[0];
      for (int i = 1; i < 5; i++) {
        c += texture(uSrc, uv + st * float(i)).rgb * wt[i];
        c += texture(uSrc, uv - st * float(i)).rgb * wt[i];
      }
      o = vec4(c, 1.0);
    }`;

  /**
   * The last pass: glow, previous frame, scanlines, glitch, in one pass to spare a phone four targets.
   * It takes no clock, so the same data draws the same bytes exactly.
   * why: lessons/kit-scan-field.md#out-fs
   */
  const OUT_FS = HEAD + DECL + `
    /**
     * One feedback layer: the previous output, resampled smaller and turned.
     * Smaller means last frame is redrawn LARGER, so everything in it travels
     * outward. This is a camera pointed at its own monitor, which is how the
     * Rutt-Etra scan processors and Paik made moving images out of a signal
     * and no drawing at all. It suits this material for a better reason than
     * period: the page is a radio through a granulator, and video feedback is
     * the same shape of process as the audio one beside it.
     */
    vec3 fbTap(sampler2D t, vec2 uv, float zoom, float ang){
      float cs = cos(ang), sn = sin(ang);
      return texture(t, (mat2(cs, -sn, sn, cs) * (uv - 0.5)) / zoom + 0.5).rgb;
    }
    uniform sampler2D uSrc;
    uniform sampler2D uGlow;
    uniform sampler2D uPrevOut;
    void main(){
      vec2 uv = gl_FragCoord.xy / uRes;
      float loud  = D(0, 3).r;
      float flux  = D(5, 3).r;
      float lowB  = D(1, 3).r;
      float midB  = D(2, 3).r;
      float highB = D(3, 3).r;
      float pulse = D(19, 3).r;
      float jolt  = D(20, 3).r;
      float drift = D(21, 3).r;

      // ── glitch: horizontal bands slipped sideways ──
      // Bands, because the scanlines are horizontal and a tear that runs along
      // them reads as the picture breaking up rather than as a shape drawn on
      // top of it. It is gated on the jolt value, which only moves when the
      // sound or the station changes, so the ordinary state of this page is NO
      // glitch.
      float band = floor(uv.y * 28.0 + drift * 6.0);
      float rnd = fract(sin(band * 91.7 + drift * 53.1) * 43758.5453);
      float slip = (step(0.82, rnd) * (rnd - 0.82) / 0.18 - 0.5) * 0.09 * jolt;
      vec2 guv = vec2(uv.x + slip, uv.y);

      /**
       * 🔴 A SCAN LANDSCAPE IN PERSPECTIVE, WHICH IS THE ANSWER TO "IT IS SO
       * 2D". Everything before this drew the field FLAT and then moved the flat
       * thing around: zooming a picture of a plane is still a plane, and no
       * amount of feedback puts a viewer inside it.
       *
       * Here the field is a HEIGHTFIELD. Sixty-four horizontal scanlines are
       * placed at sixty-four depths, each one displaced upward by how much
       * signal is at that point, and each projected by 1/z — so a near line is
       * tall, wide and thick, a far line is compressed toward the horizon, and
       * the lines TRAVEL toward the viewer as the phase advances. The parallax
       * is real: near rows sweep past the edges while far rows barely move,
       * which is the thing a zoom cannot fake.
       *
       * This is the Rutt-Etra scan processor, the Vasulkas' machine: a raster
       * whose lines are bent in depth by the signal driving them. It is the
       * right reference rather than a borrowed look, because the material here
       * IS a raster of a signal, and because the horizontal-scanline reading
       * that was asked for is what the technique is made of.
       *
       * ⚠️ IT READS uSrc AND DOES NOT REPLACE IT. The pass before this still
       * draws the flat field, so every check that grades WHERE A GRAIN LANDED
       * still has a flat picture to measure. Projecting before those ran would
       * have made them grade a camera instead of an instrument.
       */
      const int ROWS = ${K('rows')};
      /**
       * 🔴 HIDDEN LINES, WHICH IS THE WHOLE REFERENCE AND NOT A DETAIL.
       *
       * Asked for the New Order and Factory look, which is Peter Saville's 1979
       * Unknown Pleasures sleeve: Harold Craft's stacked plot of the pulsar
       * CP 1919, white on black, no colour at all. Stacking lines gets nowhere
       * near it on its own. What makes that image read as a landscape rather
       * than as a graph is OCCLUSION: every ridge is opaque, so a near peak
       * hides the lines behind it and the eye gets depth out of what is
       * MISSING. Additive lines drawn over each other give a mesh, which is a
       * different and much weaker picture.
       *
       * ⚠️ 46 ROWS, DOWN FROM 72, AND THE COUNT IS THE PICTURE. At 72 the lines
       * sat under a pixel apart on a 540 px frame, so they merged into a smooth
       * grey ramp with a moire in it and no ridge was ever visible. Reported
       * with a photograph of exactly that. A stacked plot needs the GAP between
       * lines to be worth more than the line.
       *
       * ⚠️ FLIPPED 180 AROUND X, ON INSTRUCTION. The rows run from the bottom
       * of the frame upward to a horizon, the way that sleeve is set.
       */
      /**
       * 🔴 THE Y MIRROR, AND IT IS A FOLDED COORDINATE RATHER THAN A SECOND
       * PASS. Reflecting the picture the obvious way means running the whole
       * 46-row landscape twice, once for the image and once for its
       * reflection, which doubles the most expensive thing on the page.
       * Folding the sample coordinate about the mirror line gives the same
       * image for one loop: a pixel above the line asks what the pixel the same
       * distance below it would have been.
       *
       * It also earns the rest of the frame. The terrain now occupies the half
       * below the line and its reflection the half above, so the black band
       * that filled the bottom of the box is gone and the two halves moire
       * against each other, which is the one thing about this picture that was
       * already liked.
       */
      float MIR = ${K('mir')};
      float sy = guv.y, refl = 0.0;
      if (${B('mirror')} && sy > MIR) { sy = 2.0 * MIR - sy; refl = 1.0; }
      float lit = 0.0, near = 0.0;
      for (int i = 0; i < ROWS; i++) {${live ? ' if (i >= NROWS) break;' : ''}
        // 🔴 THE TERRAIN HAS TO TRAVEL, AND AT 0.06 Hz IT DID NOT. drift is a
        // sawtooth that takes seventeen seconds to come round, so the rows
        // crawled: the picture looked like a still photograph with a moire in
        // it. Multiplying the phase here makes the landscape flow toward the
        // viewer several times faster without touching the drift everything
        // else is tuned against.
        float t = fract((float(i) + 0.5) / float(${live ? 'NROWS' : 'ROWS'}) + drift * ${K('travel')});
        // 🔴 A HIGHER EYE, SO THERE IS GROUND TO LOOK ACROSS. The horizon sat
        // near the top and the rows ran up to it, which is a view from inside
        // the terrain: every ridge was edge-on and the valleys behind them were
        // never in shot. Lifting the eye and pushing the horizon down opens the
        // floor out, which is the from-the-sky reading that was asked for and
        // is also how that sleeve is framed.
        // the rows take the whole frame now. They were packed into the top
        // 56% and the rest of the box was black.
        // rows fill the half under the mirror line; the reflection takes the rest
        // 0.88 rather than 0.72: the exponent bunched the near rows into a band
        // and left the rest of the half empty
        float baseY = ${K('baseA')} + ${K('baseB')} * pow(t, ${K('baseE')});
        // 🔴 A SIDEWAYS SWAY, PER ROW, AND IT IS WHAT MAKES A LANDSCAPE LOOK
        // LIKE IT IS MOVING RATHER THAN SCROLLING. Every row sampled the field
        // at the same x, so the whole terrain slid straight at the eye like a
        // conveyor. Offsetting each row by its own depth-dependent amount makes
        // the ridges pass each other, which is the parallax the rows were
        // already entitled to and were not using.
        float sway = ${K('sway')} * sin(t * 9.1 + drift * 12.6) * (0.03 + 0.10 * lowB);
        /**
         * 🔴 THE X AXIS BREATHES ON THE SAME CLOCK THE RIDGES DO. pulse is
         * advanced by the grains the engine actually reported, so it is already
         * driving the heave; putting it on the depth term as well makes the
         * whole perspective open and close with the instrument rather than only
         * the heights moving inside a fixed frame.
         * ⚠️ IT IS THE DEPTH TERM ONLY, NEVER cam. Breathing the near end too
         * would slide the foreground sideways under the eye, which reads as the
         * camera being shoved rather than as the world opening out.
         */
        float widen = ${K('wide')} * (1.0 + ${K('xbreath')} * (pulse - 0.5));
        float fx = (guv.x - 0.5) * (${K('cam')} + t * widen) + 0.5 + sway;
        float h = 0.0;
        if (fx >= 0.0 && fx <= 1.0) {
          // 🔴 ANGULAR, AND THE FACETS ARE THE 64 BUCKETS THEMSELVES. Sampling
          // the field with a linear filter rounds every ridge into the same
          // soft hump, so a landscape of 46 of them is 46 copies of one shape.
          // Reading the bucket row with texelFetch gives a piecewise-constant
          // profile, and interpolating BETWEEN bucket centres in a straight
          // line gives a polygonal crest: real corners, cut by the data rather
          // than by a smoothing kernel.
          float cf = clamp(fx * 64.0 - 0.5, 0.0, 63.0);
          int c0 = int(floor(cf));
          int c1 = min(c0 + 1, 63);
          float mixf = fract(cf);
          vec4 b0 = D(c0, 0), b1 = D(c1, 0);
          float d0 = clamp(b0.r * 255.0 / 2.2, 0.0, 1.0);
          float d1 = clamp(b1.r * 255.0 / 2.2, 0.0, 1.0);
          // 🔴 THE CORNERS. Pushing the blend toward the ends makes each facet
          // flatter and each corner harder, which is the angular reading that
          // was asked for. facet 0 leaves the plain linear blend, which is
          // what the first two looks had: rounded crests rather than corners.
          // ⚠️ THIS WAS LOST ONCE ALREADY, restoring a shader block from a
          // saved file that predated it. That is why it is a named flag now.
          float mf = mix(mixf, clamp((mixf - 0.5) * 2.2 + 0.5, 0.0, 1.0), ${K('facet')});
          float dens = mix(d0, d1, mf);
          vec3 fc = texture(uSrc, vec2(fx, t)).rgb;
          float fl = dot(fc, vec3(0.299, 0.587, 0.114));
          // bucket 0 reads the drawn field alone, the way the first look did,
          // before the grain counts became the height.
          h = mix(fl, max(dens, fl * 0.85), ${K('bucket')});
          // the bucket's grain position bends the crest, so two rows over the
          // same density are not the same shape
          h *= mix(1.0, 0.55 + 0.45 * sin(mix(b0.g, b1.g, mf) * 9.4 + t * 6.0), ${K('bucket')});
        }
        // something to see before there is any sound: a slow standing wave,
        // small enough that a real signal buries it the moment one arrives
        // 🔴 THE STANDBY FIELD IS THREE WAVES, NOT ONE, AND THE RATIOS NEVER
        // COME BACK INTO PHASE. A single sine is one smooth undulation: every
        // row is the same shape shifted, so there are no peaks for a near row
        // to hide and the landscape has no features at all. Photographed as a
        // faint ribbon in an otherwise black box. Three waves give ridges,
        // saddles and gaps that keep changing, which is what the occlusion
        // below needs in order to have anything to do.
        float idle = sin(fx * 9.0 + t * 5.0 - drift * 6.28318);
        if (${B('waves')}) {
          idle += 0.62 * sin(fx * 21.7 - t * 11.3 + drift * 9.4)
                + 0.38 * sin(fx * 37.1 + t * 3.1 - drift * 15.7);
        }
        h += ${K('idle')} * idle * (1.0 - loud * 0.75);
        // 🔴 VALLEYS, WHICH MEANS THE HEIGHT HAS TO GO BELOW THE LINE AS WELL
        // AS ABOVE IT. Everything before this was max(0, signal), so the floor
        // WAS the baseline and a quiet column was flat rather than sunk. Taking
        // the height off a mid point gives a crest and a trough on the same
        // row, and the troughs are what the near ridges then stand in front of.
        // 🔴 THE HEAVE. pulse is the phase advanced by the grains the engine
        // actually reported, so this is the terrain breathing on the
        // instrument's own clock rather than on a timer. It was already in the
        // data and nothing in the landscape was reading it.
        float amp = (${K('ampA')} + ${K('ampL')} * loud + ${K('ampB')} * lowB)
                  * mix(1.0, 0.78 + 0.34 * pulse, ${K('heave')})
                  * (1.0 - t * 0.45) * ${K('ampM')};
        /**
         * 🔴 THE SPLINE STRETCHES BY HEIGHT, WHICH IS NOT THE SAME AS MORE
         * AMPLITUDE. Scaling amp lifts the whole row, floor included, and the
         * picture just gets bigger. Pulling on each point in proportion to how
         * tall it ALREADY is leaves the floor where it is and sends the crests
         * up: h * (1 + stretch * h * pulse). The landscape gains relief
         * rather than size, which is the difference between a mountain range
         * growing and a photograph being enlarged.
         * ⚠️ ON pulse, the phase advanced by the grains the engine actually
         * reported, so the ridges reach on the instrument's own clock and stand
         * still when it stops.
         */
        h *= 1.0 + ${K('stretch')} * clamp(h, 0.0, 1.0) * pulse;
        // valley 0 puts the floor back on the baseline, which is what every
        // look before the valleys were asked for did.
        /**
         * 🔴 A SWELL THAT TRAVELS THROUGH THE ROWS, STAGGERED BY DEPTH. The
         * background was reading as still: with the rows held at fixed depths
         * the only thing moving was the grain data, and the standby wave that
         * used to carry motion is scaled down by loudness, so a busy passage
         * took it away exactly when there was most to look at.
         * This lifts and drops each row on its own phase, set by how far away
         * it is, so a crest walks from the horizon to the front rather than the
         * whole field bobbing together. It moves the ROW, not the signal, so
         * nothing the engine reported is altered by it.
         * ⚠️ NEAR ROWS SWELL MORE THAN FAR ONES, by 1 - t * 0.6. An equal offset
         * at every depth is the one thing perspective never does, and the eye
         * reads it immediately as the picture sliding rather than the water
         * moving.
         */
        // 🔴 THE SWELL IS THE BACK OF THE PICTURE, NOT THE FRONT. It was
        // strongest at the near rows and weakest at the horizon, which is the
        // right weighting for perspective and the wrong one for this: the
        // foreground carries the grain data, so swelling it fights the signal,
        // and it was reported as too much. Inverted, so the far rows breathe
        // and the near ones hold still, and halved while it was being touched.
        // 🔴 THE STAGGER IS HOW MANY CYCLES FIT THROUGH THE STACK. At two, the
        // rows nearest each other were nearly in phase and the whole back half
        // rose and fell as one slab, which reads as the picture tilting rather
        // than as water. At five, a neighbour is visibly behind the row in
        // front of it and the crest walks through them one at a time, which is
        // the thing that was asked for.
        float swell = sin(t * 31.416 - drift * 6.28318 * 2.0) * (0.25 + t * 0.85);
        float y = baseY + ${K('swellY')} * swell + (h - ${K('valley')}) * amp;
        float d = sy - y;
        // 🔴 A WEDGE, NOT A GAUSSIAN. A gaussian has no edge, so every line
        // faded into its neighbours and 46 of them averaged into a ramp. A
        // linear falloff with a hard cut is a drawn line, and drawn lines are
        // what a plot is made of.
        // 🔴 A CORE AND A HALO, BECAUSE ONE WITHOUT THE OTHER IS HALF A LINE.
        // A pure gaussian has no edge and 46 of them average into a grey ramp,
        // which is what the wedge was brought in to fix. But a pure wedge has
        // no light around it either, and the picture went from a ramp to a
        // faint wire drawing. A hard core for the edge, a wide dim halo for the
        // glow: crisp where it matters, luminous where the bloom picks it up.
        float w = 0.0010 + 0.0034 * (1.0 - t);
        float dim = 0.40 + 0.60 * (1.0 - t);
        lit += max(0.0, 1.0 - abs(d) / w) * dim;
        lit += exp(-pow(d / (w * 5.5), 2.0)) * dim * 0.38 * ${K('halo')};
        // how near the ridge that owns this pixel is, kept for the colour below
        // 🔴 THE BREAK IS THE OCCLUSION, AND IT HAS TO BE FORGIVING NEAR THE
        // CREST OR IT EATS THE PICTURE. Breaking the instant a pixel sits below
        // a ridge is right for a tall landscape and ruinous for a shallow one:
        // with a low field the very first row owns almost every pixel, so one
        // crest blacks out the entire frame under it. That is the mostly empty
        // box in the photograph. Waiting until the pixel is a clear margin
        // below the crest keeps the hiding, because a real peak still stands in
        // front of what is behind it, and lets a shallow field show its layers.
        if (d < -w * ${K('occl')}) { near = 1.0 - t; break; }
      }
      // contrast as a curve rather than a multiply: scaling brightness lifts
      // the floor with the peaks and the picture goes grey. This pushes darks
      // down and lights up around a pivot, so black stays black.
      lit = clamp(lit, 0.0, 1.6);
      // 1.15 and 1.9: the old curve crushed a thin line to nothing before the
      // gain could lift it, so the whole picture sat under the floor
      lit = pow(lit, ${K('gamma')}) * ${K('gain')};
      /**
       * 🔴 ONE HUE, WHICH IS WHAT MONOCHROME MEANS HERE. Grey was asked for and
       * then the blue was asked back, and those are not in conflict: a P7
       * phosphor is monochrome and it is blue. It strikes blue-white and decays
       * through a cold grey, which is the screen this whole picture is
       * pretending to be, and it gives depth a second channel for free because
       * the far rows sit in the cold end while a near crest burns to white.
       */
      // mono 1 is white on black, which is how the first two looks read before
      // the blue was asked back. The phosphor ramp is the same picture in one hue.
      /**
       * 🔴 THE DIM END GOES PALE, NOT SATURATED. The ramp put its most
       * saturated blue where the picture is FAINTEST, so everything far away
       * was a dark navy smear: reported as a murky colour blob in the distance.
       * That is backwards for a phosphor and backwards for aerial perspective,
       * where distance washes colour OUT. chroma is how much of the blue
       * survives at the dim end; the looks made before this keep 1.0.
       */
      vec3 COLD = mix(vec3(0.66, 0.72, 0.82), vec3(0.38, 0.56, 0.92), ${K('chroma')});
      vec3 phos = mix(COLD, vec3(0.90, 0.95, 1.00), smoothstep(0.35, 1.0, lit));
      vec3 c = mix(phos, vec3(1.0), ${K('mono')})
             * clamp(lit, 0.0, 1.0) * (0.72 + 0.38 * near);
      // a reflection is dimmer and colder than the thing it reflects, and that
      // is the whole cue that tells a viewer which half is the real one
      c *= mix(1.0, 0.46, refl);
      c = mix(c, c * COLD * 1.35, refl * 0.55);

      // ── the glow, added ──
      /**
       * 🔴 THE GLOW IS MASKED BY THE TERRAIN THAT EARNED IT. uGlow is a blur
       * of the PRESENT pass, which is the flat field before any of this is
       * projected, so adding it straight put a soft bright patch in the SKY:
       * a blurred copy of a 2D picture floating where there is no landscape at
       * all. Photographed and asked about as a cloud, which is exactly what it
       * looked like and exactly what it was not.
       * Scaling it by lit keeps the bloom where there are ridges and takes it
       * off the empty half of the frame. The right fix one day is to bloom the
       * composite instead of its input, which costs two more full-size targets;
       * this costs one multiply and removes the artifact.
       */
      c += texture(uGlow, guv).rgb * ${X('glow', '0.62')} * clamp(lit, 0.0, 1.0);

      // 🔴 MOTION BLUR, WHICH IS WHAT MAKES IT FLOAT. The previous OUTPUT is
      // held under this one, so a mark leaves a soft wake instead of blinking.
      // It is a second trail and it is not the accumulator's: that one is in
      // field space and decays on a time constant, this one is in screen space
      // and survives the glitch, so a tear smears rather than flickering.
      // It LOOSENS when the sound gets loud (0.74 down to 0.52), because a
      // long hold on a busy passage turns the picture to soup, which is the
      // muddiness this whole change exists to remove.
      float hold = mix(0.74, 0.52, clamp(loud * 1.3, 0.0, 1.0));

      // 🔴 VIDEO FEEDBACK, WHICH IS THE WHOLE DIFFERENCE BETWEEN A TRAIL AND A
      // TUNNEL. A straight mix with the previous frame at the SAME uv is motion
      // blur: every mark softens in place and nothing goes anywhere. Sampling
      // the previous frame slightly SMALLER and slightly TURNED means last
      // frame's picture is redrawn a little bigger and rotated, so everything
      // in it travels outward and keeps travelling. Each grain leaves a wake
      // that recedes into the middle distance, which is the layers-coming-at-me
      // the picture had no depth cue for.
      //
      // This is a camera pointed at its own monitor, which is how Nam June Paik
      // and the Rutt-Etra scan processors made moving images out of a signal
      // and no drawing at all. It suits this material for a better reason than
      // period: the picture is a RADIO going through a granulator, and video
      // feedback is the same shape of process as the audio one next to it.
      //
      // The zoom BREATHES with the grain clock, so the tunnel pulls harder on
      // the beat, and the turn drifts both ways rather than spinning, because
      // a constant rotation reads as a screensaver.
      // 🔴 THREE LAYERS, ONE PER BAND, AND THAT IS THE DIFFERENCE BETWEEN A
      // TUNNEL AND AN EXPERIENCE. One feedback tap is one tunnel at one speed:
      // it moves, and after ten seconds you have seen all of it. Three taps at
      // three zooms and three rotations are three tunnels THROUGH EACH OTHER,
      // and because each one is weighted by a different part of the spectrum
      // they take turns. A bassline brings the wide slow layer forward; the
      // tight fast one only shows up on sibilance and cymbals; the middle one
      // carries speech. Nothing schedules that and nothing repeats, because
      // the thing choosing is the radio.
      float ang = (drift - 0.5) * 0.035;
      float z = ${live ? '(' : ''}0.008 + 0.012 * pulse${live ? `) * ${X('tunnel')}` : ''};
      float wl = 0.30 + 0.70 * lowB;
      float wm = 0.22 + 0.78 * midB;
      float wh = 0.12 + 0.88 * highB;
      float ws = wl + wm + wh;
      vec3 back = (fbTap(uPrevOut, uv, 1.0 + z * 0.45, ang * 0.40) * wl
                 + fbTap(uPrevOut, uv, 1.0 + z * 1.15, -ang * 1.00) * wm
                 + fbTap(uPrevOut, uv, 1.0 + z * 2.40, ang * 2.30) * wh) / ws;
      // 🔴 IT HAS TO LOSE SOMETHING EVERY LAP OR IT RUNS AWAY. Feedback with a
      // gain of 1 is an oscillator: the picture fills with white in a couple of
      // seconds and never comes back. Losing a few per cent a frame puts a
      // ceiling on it. The loss is COLOURED, warm end first, so a layer cools
      // as it travels out. That is a depth cue for nothing: the eye reads
      // cooler as further away.
      // one scalar, not three: a coloured loss would drag a monochrome
      // picture back toward a hue over a few laps
      back *= ${K('keep')};
      // and the trail LENGTH fluctuates, so even the amount of memory in the
      // picture is something the station is doing rather than a setting
      // 🔴 THE CEILING IS 0.80, NOT 0.88, AND THE DIFFERENCE IS WHETHER THE
      // PICTURE SURVIVES. Each lap the fed-back frame also loses 3.8%, so the
      // loop gain is hold x 0.962: at 0.88 that is 0.847, leaving 12% fresh ink
      // per frame to hold the whole image up. On a quiet passage, where the
      // fresh ink is nearly nothing anyway, the steady state is close enough to
      // zero to read as the picture fading out. Reported as exactly that.
      /**
       * 🔴 THE TRAIL ADDS. IT MUST NEVER SUBTRACT, AND mix SUBTRACTS.
       *
       * MEASURED, and this is the bug rather than a tuning problem: mean red
       * 0.77 -> 0.29 -> 0.05 over five seconds with the station playing. A mix
       * REPLACES most of this frame with a dimmed copy of the last one, so the
       * fresh picture only ever contributes its small share and the loop
       * converges on whatever survives the per-lap loss. On a picture made of
       * thin lines over black, most of the frame is black, so the thing it
       * converges on is black. Two attempts to fix that by moving the ceiling
       * were treating an arithmetic sign as a number.
       *
       * max is what a phosphor actually does: this frame is drawn at FULL
       * strength, always, and the decaying previous frame shows through only
       * where this one is darker. A trail can then never take anything away,
       * and the picture cannot fade while there is anything to draw.
       */
      c = max(c, back * clamp(hold + 0.14 * flux - 0.10 * jolt, 0.30, 0.86));

      // ── horizontal scanlines, and a slow roll ──
      // Asked for: *"go 90deg for hoziz vintage scanlines feel"*. The line
      // period is fixed in PIXELS rather than in uv, so it stays a scanline at
      // every size instead of turning into a moire of the window width.
      float scan = ${live ? `1.0 - ${X('scan')}` : '0.90'} + ${X('scan', '0.10')} * cos(gl_FragCoord.y * 3.14159);
      float roll = 1.0 + 0.05 * cos((uv.y - drift) * 6.28318);
      c *= scan * roll;

      // a soft edge, so the picture sits in its box rather than being cut out
      vec2 v = (uv - 0.5) * 2.0;
      c *= 1.0 - ${X('vig', '0.28')} * dot(v, v) * 0.5;

      o = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`;

  return { VS, HEAD, ACC_FS, PRESENT_FS, COPY_FS, BRIGHT_FS, BLUR_FS, OUT_FS, HI, DIM };
}

/**
 * The whole picture, ping-ponging two targets: WebGL refuses a pass that samples its own target.
 * @param {WebGL2RenderingContext} g
 * @param {{present?: boolean, w?: number, h?: number}} [o] `present: false` skips the copy to
 *   the canvas (a headset takes `finalTex()`). `w`/`h` size the targets; scanlines and glitch
 *   are in uRes units, so a bigger field draws finer scanlines.
 * why: lessons/kit-scan-field.md#create-scan-field
 */
export function createScanField(g, { look = LOOKS[DEFAULT_LOOK], live = false, canvas = g.canvas,
  present = true, w: FW = FIELD_W, h: FH = FIELD_H } = {}) {
  const shaders = fieldShaders(look, { live });
  const { VS, ACC_FS, PRESENT_FS, COPY_FS, BRIGHT_FS, BLUR_FS, OUT_FS } = shaders;
  // the live numbers, opening on the look's own (EXTRA at the baked literals)
  const K = new Float32Array(PARAMS.map((n) => (n in EXTRA ? EXTRA[n] : look[n])));
  const compile = (type, src) => {
    const s = g.createShader(type);
    g.shaderSource(s, src); g.compileShader(s);
    if (!g.getShaderParameter(s, g.COMPILE_STATUS)) throw new Error(g.getShaderInfoLog(s));
    return s;
  };
  const prog = (fs, names) => {
    const p = g.createProgram();
    g.attachShader(p, compile(g.VERTEX_SHADER, VS));
    g.attachShader(p, compile(g.FRAGMENT_SHADER, fs));
    g.linkProgram(p);
    if (!g.getProgramParameter(p, g.LINK_STATUS)) throw new Error(g.getProgramInfoLog(p));
    const u = {};
    for (const n of names) u[n] = g.getUniformLocation(p, n);
    return { p, u };
  };
  const target = (w, h) => {
    const t = g.createTexture();
    g.bindTexture(g.TEXTURE_2D, t);
    g.texImage2D(g.TEXTURE_2D, 0, g.RGBA8, w, h, 0, g.RGBA, g.UNSIGNED_BYTE, null);
    for (const q of [g.TEXTURE_MIN_FILTER, g.TEXTURE_MAG_FILTER]) g.texParameteri(g.TEXTURE_2D, q, g.LINEAR);
    for (const q of [g.TEXTURE_WRAP_S, g.TEXTURE_WRAP_T]) g.texParameteri(g.TEXTURE_2D, q, g.CLAMP_TO_EDGE);
    const f = g.createFramebuffer();
    g.bindFramebuffer(g.FRAMEBUFFER, f);
    g.framebufferTexture2D(g.FRAMEBUFFER, g.COLOR_ATTACHMENT0, g.TEXTURE_2D, t, 0);
    g.bindFramebuffer(g.FRAMEBUFFER, null);
    return { t, f, w, h };
  };

  // One vertex array, kept and re-bound in `step`: in a session xr-panel.mjs binds its own every eye.
  // why: lessons/kit-scan-field.md#vao
  const vao = g.createVertexArray();
  g.bindVertexArray(vao);

  const acc = prog(ACC_FS, ['uRes', 'uData', 'uPrev']);
  const pre = prog(PRESENT_FS, ['uRes', 'uData', 'uField']);
  const cpy = prog(COPY_FS, ['uRes', 'uSrc']);
  const bri = prog(BRIGHT_FS, ['uRes', 'uData', 'uSrc']);
  const blr = prog(BLUR_FS, ['uRes', 'uData', 'uSrc', 'uDir']);
  const out = prog(OUT_FS, ['uRes', 'uData', 'uSrc', 'uGlow', 'uPrevOut', ...(live ? ['uK'] : [])]);

  // NEAREST although texelFetch ignores it, so a later body using texture() fails visibly.
  // why: lessons/kit-scan-field.md#data-tex
  const dataTex = g.createTexture();
  g.bindTexture(g.TEXTURE_2D, dataTex);
  g.texImage2D(g.TEXTURE_2D, 0, g.RGBA8, DATA_W, DATA_H, 0, g.RGBA, g.UNSIGNED_BYTE, null);
  for (const q of [g.TEXTURE_MIN_FILTER, g.TEXTURE_MAG_FILTER]) g.texParameteri(g.TEXTURE_2D, q, g.NEAREST);
  for (const q of [g.TEXTURE_WRAP_S, g.TEXTURE_WRAP_T]) g.texParameteri(g.TEXTURE_2D, q, g.CLAMP_TO_EDGE);

  let A = target(FW, FH), B = target(FW, FH);
  // The glow is quarter size: downsampling is most of the softness, at a sixteenth the sampling.
  // why: lessons/kit-scan-field.md#glow-quarter
  const GLOW_W = FW >> 2, GLOW_H = FH >> 2;
  const glowA = target(GLOW_W, GLOW_H), glowB = target(GLOW_W, GLOW_H);
  // the screen-space trail, ping-ponged like the field for the same reason:
  // a pass may not sample the target it is drawing to
  let P = target(FW, FH), Q = target(FW, FH);
  let field = null;                    // the accumulate target most recently written
  let finalT = null;                   // the composite most recently written
  const shown = target(FW, FH);
  // Checks get their own targets; a probe in the visible ping-pong would smear into the trail.
  // why: lessons/kit-scan-field.md#test-targets
  let tA = null, tB = null, tS = null, tG1 = null, tG2 = null, tP = null, tQ = null;
  const TEST_W = 256, TEST_H = 144;

  const upload = (bytes) => {
    g.bindTexture(g.TEXTURE_2D, dataTex);
    g.texSubImage2D(g.TEXTURE_2D, 0, 0, 0, DATA_W, DATA_H, g.RGBA, g.UNSIGNED_BYTE, bytes);
  };
  const pass = (pr, dst, w, h, src, srcName) => {
    g.bindFramebuffer(g.FRAMEBUFFER, dst);
    g.viewport(0, 0, w, h);
    g.useProgram(pr.p);
    g.uniform2f(pr.u.uRes, w, h);
    g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, src); g.uniform1i(pr.u[srcName], 0);
    g.activeTexture(g.TEXTURE1); g.bindTexture(g.TEXTURE_2D, dataTex);
    if (pr.u.uData) g.uniform1i(pr.u.uData, 1);
    g.drawArrays(g.TRIANGLES, 0, 3);
  };

  return {
    shown,
    /** The seven bodies this chain compiled, as text. */
    shaders,
    /** Turn one number of a live chain; the next frame draws with it. */
    set(name, v) {
      if (!live) throw new Error('a baked field has its numbers typed in; build it with live: true to turn them');
      const i = PARAMS.indexOf(name);
      if (i < 0 || !Number.isFinite(v)) return false;
      K[i] = v;
      return true;
    },
    /** Every number as the chain will draw it next, by name. */
    params() { return Object.fromEntries(PARAMS.map((n, i) => [n, K[i]])); },
    /** One live frame: accumulate, present, copy to the canvas. */
    step(bytes) {
      g.bindVertexArray(vao);
      upload(bytes);
      pass(acc, B.f, FW, FH, A.t, 'uPrev');
      field = B;                       // before the swap: B is what was just written
      pass(pre, shown.f, FW, FH, B.t, 'uField');
      // bright pass, then the gaussian along x and back along y
      pass(bri, glowA.f, GLOW_W, GLOW_H, shown.t, 'uSrc');
      g.useProgram(blr.p); g.uniform2f(blr.u.uDir, 1.0, 0.0);
      pass(blr, glowB.f, GLOW_W, GLOW_H, glowA.t, 'uSrc');
      g.useProgram(blr.p); g.uniform2f(blr.u.uDir, 0.0, 1.0);
      pass(blr, glowA.f, GLOW_W, GLOW_H, glowB.t, 'uSrc');
      // the composite: glow added, last frame held under, scanlines, glitch
      g.bindFramebuffer(g.FRAMEBUFFER, Q.f);
      g.viewport(0, 0, FW, FH);
      g.useProgram(out.p);
      if (live) g.uniform1fv(out.u.uK, K);
      g.uniform2f(out.u.uRes, FW, FH);
      g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, shown.t); g.uniform1i(out.u.uSrc, 0);
      g.activeTexture(g.TEXTURE1); g.bindTexture(g.TEXTURE_2D, dataTex); g.uniform1i(out.u.uData, 1);
      g.activeTexture(g.TEXTURE2); g.bindTexture(g.TEXTURE_2D, glowA.t); g.uniform1i(out.u.uGlow, 2);
      g.activeTexture(g.TEXTURE3); g.bindTexture(g.TEXTURE_2D, P.t); g.uniform1i(out.u.uPrevOut, 3);
      g.drawArrays(g.TRIANGLES, 0, 3);
      finalT = Q;
      // The canvas, last. Skipped in a session (`present: false`): the headset takes `finalTex()`.
      // why: lessons/kit-scan-field.md#present-skip
      if (present) {
        g.bindFramebuffer(g.FRAMEBUFFER, null);
        g.viewport(0, 0, canvas.width, canvas.height);
        g.useProgram(cpy.p);
        g.uniform2f(cpy.u.uRes, canvas.width, canvas.height);
        g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, Q.t); g.uniform1i(cpy.u.uSrc, 0);
        g.drawArrays(g.TRIANGLES, 0, 3);
      }
      [A, B] = [B, A];
      [P, Q] = [Q, P];
    },
    /** The composite as a TEXTURE, for something that wants to draw with it
     *  rather than read it back. Null until one frame has been stepped. */
    finalTex() { return finalT ? finalT.t : null; },
    /** Whatever is on screen now, as bytes. */
    readShown() { return this.readTarget(shown); },
    /**
     * The composite: glow, trail, scanlines and glitch included. readShown
     * deliberately still reads the pass BEFORE all of that, because the
     * checks that grade where a grain landed want the picture without a
     * screen-space trail smeared across it.
     */
    readFinal() { return finalT ? this.readTarget(finalT) : null; },
    /**
     * The accumulated field alone: no bed, colour or lighting, so every lit pixel is a grain the
     * engine reported. A whole-picture statistic could be entirely the bed.
     * why: lessons/kit-scan-field.md#read-field
     */
    readField() { return field ? this.readTarget(field) : null; },
    readTarget(t) {
      const px = new Uint8Array(t.w * t.h * 4);
      g.bindFramebuffer(g.READ_FRAMEBUFFER, t.f);
      g.readPixels(0, 0, t.w, t.h, g.RGBA, g.UNSIGNED_BYTE, px);
      g.bindFramebuffer(g.READ_FRAMEBUFFER, null);
      return { px, w: t.w, h: t.h };
    },
    /**
     * One pass from a fixed input over a black previous frame: a feedback picture's consecutive
     * frames differ on a working page, so checks compare passes, not frames.
     * why: lessons/kit-scan-field.md#test-render
     */
    testRender(bytes) {
      tA ||= target(TEST_W, TEST_H); tB ||= target(TEST_W, TEST_H); tS ||= target(TEST_W, TEST_H);
      g.bindFramebuffer(g.FRAMEBUFFER, tA.f);
      g.viewport(0, 0, TEST_W, TEST_H);
      g.clearColor(0, 0, 0, 1); g.clear(g.COLOR_BUFFER_BIT);
      upload(bytes);
      pass(acc, tB.f, TEST_W, TEST_H, tA.t, 'uPrev');
      pass(pre, tS.f, TEST_W, TEST_H, tB.t, 'uField');
      const px = new Uint8Array(TEST_W * TEST_H * 4);
      g.bindFramebuffer(g.READ_FRAMEBUFFER, tS.f);
      g.readPixels(0, 0, TEST_W, TEST_H, g.RGBA, g.UNSIGNED_BYTE, px);
      g.bindFramebuffer(g.READ_FRAMEBUFFER, null);
      return { px, w: TEST_W, h: TEST_H };
    },
    /**
     * The whole chain once over a black start, into targets of its own, for checks on a number
     * the last pass reads (every look number). Nothing touches the live ping-pong.
     * why: lessons/kit-scan-field.md#test-final
     */
    testFinal(bytes) {
      const GW = TEST_W >> 2, GH = TEST_H >> 2;
      tA ||= target(TEST_W, TEST_H); tB ||= target(TEST_W, TEST_H); tS ||= target(TEST_W, TEST_H);
      tG1 ||= target(GW, GH); tG2 ||= target(GW, GH);
      tP ||= target(TEST_W, TEST_H); tQ ||= target(TEST_W, TEST_H);
      g.bindVertexArray(vao);
      for (const t of [tA, tP]) {
        g.bindFramebuffer(g.FRAMEBUFFER, t.f);
        g.viewport(0, 0, TEST_W, TEST_H);
        g.clearColor(0, 0, 0, 1); g.clear(g.COLOR_BUFFER_BIT);
      }
      upload(bytes);
      pass(acc, tB.f, TEST_W, TEST_H, tA.t, 'uPrev');
      pass(pre, tS.f, TEST_W, TEST_H, tB.t, 'uField');
      pass(bri, tG1.f, GW, GH, tS.t, 'uSrc');
      g.useProgram(blr.p); g.uniform2f(blr.u.uDir, 1.0, 0.0);
      pass(blr, tG2.f, GW, GH, tG1.t, 'uSrc');
      g.useProgram(blr.p); g.uniform2f(blr.u.uDir, 0.0, 1.0);
      pass(blr, tG1.f, GW, GH, tG2.t, 'uSrc');
      g.bindFramebuffer(g.FRAMEBUFFER, tQ.f);
      g.viewport(0, 0, TEST_W, TEST_H);
      g.useProgram(out.p);
      if (live) g.uniform1fv(out.u.uK, K);
      g.uniform2f(out.u.uRes, TEST_W, TEST_H);
      g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, tS.t); g.uniform1i(out.u.uSrc, 0);
      g.activeTexture(g.TEXTURE1); g.bindTexture(g.TEXTURE_2D, dataTex); g.uniform1i(out.u.uData, 1);
      g.activeTexture(g.TEXTURE2); g.bindTexture(g.TEXTURE_2D, tG1.t); g.uniform1i(out.u.uGlow, 2);
      g.activeTexture(g.TEXTURE3); g.bindTexture(g.TEXTURE_2D, tP.t); g.uniform1i(out.u.uPrevOut, 3);
      g.drawArrays(g.TRIANGLES, 0, 3);
      return this.readTarget(tQ);
    },
  };
}
