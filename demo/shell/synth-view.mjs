// demo/shell/synth-view.mjs
// Three pictures of one voice: an envelope, a filter response and a waveform.
//
// 🔴 ONE FILE FOR THREE FIGURES, AND THAT IS A DECISION RATHER THAN A PILE.
// They share a frame (a bordered box painting its own ground, a canvas of fixed
// height, a device pixel ratio, a resize observation and a paint counter), they
// share three greys, and they share the one thing that makes them worth having
// at all: a REFUSAL state, drawn, for the case where the shape cannot honestly
// be derived. Three files would have been three copies of that frame, which is
// the hand-rolled control defect arriving inside the kit itself.
//
// 🔴 WHAT EACH ONE MAY HONESTLY CLAIM IS NOT THE SAME, AND IT IS DECIDED BY THE
// INSTRUMENT RATHER THAN BY TASTE. MEASURED 2026-09-22 out of `circuit-cc.mjs`
// and `circuit-patch.mjs`:
//   - The FILTER is reachable over control change: type is CC 68 over six
//     values, frequency is CC 74 and resonance is CC 71. So a filter figure can
//     be driven live and a control that moves it is not a lie.
//   - ENVELOPE 1 is reachable, five parameters, CC 73, 75, 70, 72 and 108.
//     Envelopes 2 and 3 are in the patch format and NOT on any controller
//     number, so a control for those would name something it cannot do.
//   - The oscillator WAVE is a number, 0 to 29, and the shapes behind those
//     numbers are not published anywhere this project can read.
// So: a picture is a picture and a control is the page's business, and nothing
// in this file sends anything anywhere.
//
// 🔴 THE FILTER CURVE IS A SCHEMATIC AND SAYS SO ON ITS OWN FACE, WHICH IS THE
// MOST IMPORTANT LINE IN THIS FILE. Novation publish no response curves for
// this instrument and nothing here has measured one. What is drawn is a
// textbook two or four pole prototype: the corner is where the cutoff
// parameter says, the slope is what the type's name says, and the peak height
// follows the resonance. Every one of those is a statement about a model, and a
// real analogue ladder is not a cascade of identical biquads, does not keep its
// passband flat as the resonance comes up, and does not have a frequency axis
// anybody here has calibrated. The word `schematic` is painted into the canvas
// rather than written in a caption beside it, so it travels with the picture
// into whatever page puts it somewhere.
// ⚠️ AND NO NUMBER ON IT IS A MEASUREMENT EITHER. There is no Hz on the x axis
// and no dB printed on the y, because the only scale this project honestly has
// for a cutoff is `0 to 127`, which is a parameter and not a frequency.
//
// 🔴 THE WAVEFORM DRAWS FOUR OF THIRTY AND REFUSES THE OTHER TWENTY SIX IN
// WORDS. A name is mapped to a shape only when the name IS the shape's name:
// `sine`, `triangle`, `sawtooth` and `square`. The Circuit's other twenty six
// are nine `saw 9:1 PW` blends and a `pulse width` whose duty nothing here
// knows, and sixteen WAVETABLES, which have no single shape to draw by
// definition. An invented squiggle under a real instrument's parameter name is
// the failure this component exists not to be, so the refusal names the wave
// and says why there is no picture. That is strictly more than the slider
// reading `17` which is what those pages have today.
// ⚠️ SIXTEEN, AND THE BRIEF THIS WAS BUILT FROM SAID FOURTEEN. MEASURED
// 2026-09-22 against `OSC_WAVES`: `FIRST_WAVETABLE` is 14, so 14 is the number
// of PLAIN waveforms and `slice(14)` is 16 rows long. The two numbers are the
// two halves of one split and the count was written down the wrong way round.
// It changes nothing about the conclusion, which is that 26 of the 30 have no
// shape this file may honestly draw.
//
// ⚠️ THE ENVELOPE'S SHAPE IS EXACT AND ITS TIME AXIS IS NOT. Attack, decay and
// release are `0 to 127` on this instrument with no published mapping to
// seconds, so stage widths are proportional to the SETTINGS and the picture
// carries no unit. A caller who really has milliseconds passes them with a
// `unit`, and then the axis means what it says. The default draws
// `proportions` on its own face for the same reason the filter draws
// `schematic`.
//
// ⚠️ NOTHING IN HERE IS A LIVE SENTENCE. Every word any of these draws is
// painted into the canvas, which is a fixed box, so none of it can change its
// own height while somebody is looking at it. That is `grain-scope`'s caption
// lesson, which reflowed between three and four lines sixty times a second and
// made a whole page jump.
//
// ⚠️ AND NONE OF THEM RUNS A FRAME LOOP. A still picture that asked for an
// animation frame would spend a phone's battery redrawing the same pixels with
// nothing on screen saying so. They paint when they are set and when they are
// resized, and `paints` counts so a check can read the counter rather than ask
// a boolean.
//
// STYLING is prepended to <head> so `shell.css` and a page's own <style>
// override it on source order, the arrangement `wave-view.mjs` and `xy-pad.mjs`
// already use and record.

import { el } from './shell.mjs';

/**
 * How much of an envelope's width the sustain hold takes when any stage has a
 * length. Sustain is a LEVEL rather than a time, so it has no width of its own
 * and needs to be given one or it cannot be seen.
 */
export const HOLD_SHARE = 0.25;

/** The top and the bottom of the filter figure's vertical scale, in decibels.
 *  A drawing choice: wide enough for a resonant peak, deep enough to show a
 *  four pole slope going away. Neither end is a measurement of anything. */
export const DB_TOP = 18;
export const DB_FLOOR = -48;

/** How many octaves the filter figure's full width covers. A drawing choice,
 *  about the range of hearing, and the reason no frequency is printed on it. */
export const OCTAVES = 10;

/** The resonance scale, from flat to a peak worth looking at. */
export const Q_MIN = 0.707;
export const Q_MAX = 10;

/** The shapes this file can derive from their own definitions and nothing else. */
export const WAVE_SHAPES = ['sine', 'triangle', 'saw', 'square', 'pulse'];

/**
 * ⚠️ EXACT NAMES ONLY, WHICH IS THE WHOLE HONESTY OF IT. `sawtooth` is a
 * sawtooth and `saw 9:1 PW` is not, however much of the word they share. A
 * substring test here would draw a plain ramp for nine blends whose ratios are
 * the only thing that tells them apart, under the instrument's own label for
 * them, which is exactly the confident wrong picture this component refuses.
 */
const BY_NAME = new Map([
  ['sine', 'sine'],
  ['triangle', 'triangle'],
  ['sawtooth', 'saw'],
  ['saw', 'saw'],
  ['square', 'square'],
]);

/**
 * The shape behind a wave's name, or `null` when the name does not name a
 * shape this file can derive.
 *
 * ⚠️ `pulse` IS IN `WAVE_SHAPES` AND IS NEVER RETURNED FROM HERE, on purpose. A
 * pulse is not one shape, it is a family with a duty cycle, and no name carries
 * one. A caller that HAS a width asks for it by hand.
 *
 * @param {string} name
 * @returns {'sine'|'triangle'|'saw'|'square'|null}
 */
export function shapeFor(name) {
  return BY_NAME.get(String(name ?? '').trim().toLowerCase()) ?? null;
}

/**
 * One sample of a shape, at a phase from 0 to 1, between -1 and 1.
 *
 * ⚠️ THE PHASE AND THE POLARITY ARE DRAWING CONVENTIONS RATHER THAN
 * MEASUREMENTS. What makes a sawtooth a sawtooth is the linear ramp and the
 * jump; whether an instrument's ramp rises or falls, and where in the cycle it
 * starts, is not something this file knows about any particular oscillator. The
 * SHAPE is the claim.
 *
 * @param {string} shape
 * @param {number} phase  0 to 1 over one cycle
 * @param {object} [o]
 * @param {number} [o.duty]  for `pulse` only, the share of the cycle that is high
 */
export function waveSample(shape, phase, { duty = 0.5 } = {}) {
  const p = ((Number(phase) || 0) % 1 + 1) % 1;
  switch (shape) {
    case 'sine': return Math.sin(2 * Math.PI * p);
    case 'triangle': return 4 * Math.abs(((p - 0.25) % 1 + 1) % 1 - 0.5) - 1;
    case 'saw': return 2 * p - 1;
    case 'square': return p < 0.5 ? 1 : -1;
    case 'pulse': return p < Math.max(0, Math.min(1, duty)) ? 1 : -1;
    default: return NaN;
  }
}

/**
 * `count` samples of a shape over `cycles` cycles, for drawing.
 *
 * ⚠️ TWO CYCLES BY DEFAULT, NOT ONE. One cycle of a square and one cycle of a
 * pulse at 50 per cent are the same picture, and one cycle of anything leaves
 * the reader to guess whether what they are looking at repeats. Two says it.
 *
 * @returns {Float64Array|null} `null` for a shape this file cannot derive
 */
export function wavePoints(shape, count, { cycles = 2, duty = 0.5 } = {}) {
  if (!WAVE_SHAPES.includes(shape)) return null;
  const n = Math.max(2, Math.floor(Number(count) || 0));
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = waveSample(shape, (i / (n - 1)) * cycles, { duty });
  return out;
}

/**
 * An envelope as six points, x from 0 to 1 across the picture and y from 0 at
 * the bottom to 1 at the top.
 *
 * 🔴 THE WIDTHS ARE PROPORTIONAL TO THE SETTINGS AND NOT TO TIME, unless a
 * caller has real times to give. `Envelope1_Attack` is `0 to 127` and the
 * seconds behind those numbers are not published, so an axis in milliseconds
 * would be a number this project made up. What IS exact is the shape: a rise to
 * full, a fall to the sustain level, a hold there, and a fall to nothing.
 *
 * ⚠️ A SUSTAIN IS A LEVEL AND HAS NO LENGTH, so it is given `hold` of the width
 * to stand in. With every timed stage at zero there is nothing to divide, and
 * the hold takes the whole width rather than leaving three quarters of the box
 * empty beside a picture that is correct.
 *
 * @param {object} o
 * @param {number} [o.delay]    Env 3 on the Circuit has one, Env 1 and 2 do not
 * @param {number} [o.attack]
 * @param {number} [o.decay]
 * @param {number} [o.sustain]  a LEVEL, 0 to `max`
 * @param {number} [o.release]
 * @param {number} [o.max]      the top of every parameter, default 127
 * @param {number} [o.hold]     the sustain's share of the width
 * @returns {{points:Array<{x:number,y:number}>, sustain:number, hold:number,
 *   stages:{delay:number,attack:number,decay:number,hold:number,release:number},
 *   silent:boolean, end:number}}
 */
export function envelopePath({ delay = 0, attack = 0, decay = 0, sustain = 0,
                               release = 0, max = 127, hold = HOLD_SHARE } = {}) {
  const m = Math.max(1e-9, Number(max) || 1);
  const n = (x) => Math.max(0, Math.min(1, (Number(x) || 0) / m));
  const d = n(delay), a = n(attack), dec = n(decay), r = n(release);
  const s = n(sustain);
  const tot = d + a + dec + r;
  const h = tot > 0 ? Math.max(0, Math.min(1, Number(hold))) : 1;
  const timed = 1 - h;
  const w = (x) => (tot > 0 ? (x / tot) * timed : 0);
  const x1 = w(d);
  const x2 = x1 + w(a);
  const x3 = x2 + w(dec);
  const x4 = x3 + h;
  const x5 = x4 + w(r);
  return {
    points: [
      { x: 0, y: 0 }, { x: x1, y: 0 }, { x: x2, y: 1 },
      { x: x3, y: s }, { x: x4, y: s }, { x: x5, y: 0 },
    ],
    sustain: s,
    hold: h,
    stages: { delay: w(d), attack: w(a), decay: w(dec), hold: h, release: w(r) },
    silent: tot === 0,
    end: x5,
  };
}

/**
 * The kind and the pole count behind a filter type's name, or `null` when the
 * name does not say.
 *
 * 🔴 THERE IS NO TABLE IN HERE AT ALL, AND THAT IS THE POINT. The six names
 * live once, in `FILTER_TYPES` in `circuit-patch.mjs`; a second list of them
 * here would agree with that one until somebody edited one of them, which is
 * this project's most repeated defect in its cheapest form. The names say the
 * slope out loud (`low pass 24dB`, `band pass 6/6 dB`) and six decibels an
 * octave is one pole, so this READS the name instead of holding a copy, and a
 * name it cannot read is refused rather than drawn as a low pass.
 *
 * @param {string} name
 * @returns {{kind:'lp'|'hp'|'bp', poles:number}|null}
 */
export function filterShapeFor(name) {
  const s = String(name ?? '').trim().toLowerCase();
  const kind = s.includes('low pass') ? 'lp'
    : s.includes('high pass') ? 'hp'
      : s.includes('band pass') ? 'bp' : null;
  if (!kind) return null;
  const nums = (s.match(/\d+/g) || []).map(Number).filter((x) => x > 0);
  if (!nums.length) return null;
  const perSide = Math.max(...nums);
  if (perSide % 6 !== 0) return null;
  const poles = kind === 'bp' ? (perSide / 6) * 2 : perSide / 6;
  return poles > 0 ? { kind, poles } : null;
}

/** A two pole prototype, as a magnitude. `w` is the ratio to the corner. */
function biquad(kind, w, q) {
  const x = w * w;
  const den = Math.sqrt((1 - x) * (1 - x) + (w / q) * (w / q)) || 1e-12;
  if (kind === 'hp') return x / den;
  if (kind === 'bp') return (w / q) / den;
  return 1 / den;
}

/**
 * The filter figure's curve: `points` values from 0 at the bottom of the box to
 * 1 at the top.
 *
 * 🔴 IT IS A SCHEMATIC. Nothing here has measured this or any other
 * instrument's filter. A four pole answer is one resonant stage times one flat
 * stage, which is not what a real ladder does either; what it gets right is the
 * corner position, the slope the type's name claims, and the direction the
 * resonance moves the peak. That is what a reader can use and it is all that is
 * being claimed.
 *
 * @param {object} o
 * @param {'lp'|'hp'|'bp'} [o.kind]
 * @param {number} [o.poles]
 * @param {number} [o.freq]        the cutoff PARAMETER, 0 to `max`
 * @param {number} [o.resonance]   0 to `max`
 * @param {number} [o.max]
 * @param {number} [o.points]
 * @param {number} [o.octaves]     how wide the picture is, a drawing choice
 * @returns {{y:Float64Array, db:Float64Array, cornerAt:number, peakAt:number,
 *   peakDb:number, zeroY:number}}
 */
export function filterCurve({ kind = 'lp', poles = 2, freq = 64, resonance = 0,
                              max = 127, points = 160, octaves = OCTAVES } = {}) {
  const n = Math.max(8, Math.floor(Number(points) || 0));
  const m = Math.max(1e-9, Number(max) || 1);
  const fc = Math.max(0, Math.min(1, (Number(freq) || 0) / m));
  const res = Math.max(0, Math.min(1, (Number(resonance) || 0) / m));
  const q = Q_MIN + res * (Q_MAX - Q_MIN);
  const stages = Math.max(1, Math.round(poles / 2));
  const y = new Float64Array(n);
  const db = new Float64Array(n);
  let peakAt = 0, peakDb = -Infinity;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const w = Math.pow(2, (u - fc) * octaves);
    // ⚠️ ONE RESONANT STAGE AND THE REST FLAT. Cascading two identical resonant
    // biquads squares the peak, which draws a four pole filter as twice as
    // resonant as a two pole at the same setting, and that is a claim about the
    // instrument rather than about the model.
    let mag = biquad(kind, w, q);
    for (let s = 1; s < stages; s++) mag *= biquad(kind, w, Q_MIN);
    const v = 20 * Math.log10(Math.max(1e-9, mag));
    db[i] = v;
    if (v > peakDb) { peakDb = v; peakAt = u; }
    y[i] = Math.max(0, Math.min(1, (v - DB_FLOOR) / (DB_TOP - DB_FLOOR)));
  }
  return {
    y,
    db,
    cornerAt: fc,
    peakAt,
    peakDb,
    zeroY: (0 - DB_FLOOR) / (DB_TOP - DB_FLOOR),
  };
}

/* ── the frame the three figures share ─────────────────────────────────── */

const CSS_ID = 'pos-sv-css';

function ensureCss() {
  if (document.getElementById(CSS_ID)) return;
  const s = el('style', '', `
.pos-sv { display: block; background: var(--card); border: 1px solid var(--line);
          border-radius: 4px; overflow: hidden; }
.pos-sv[hidden] { display: none; }
.pos-sv-c { display: block; width: 100%; height: var(--sv-h, 96px); }
`);
  s.id = CSS_ID;
  document.head.prepend(s);
}

/**
 * The bordered box, the canvas, the device pixel ratio and the resize
 * observation, once.
 *
 * 🔴 THE BORDER IS ON THE WRAPPER AND NOT ON THE CANVAS, which is arithmetic
 * rather than taste. `box-sizing: border-box` is global here, so a canvas with
 * a 1 px border whose CSS width comes from its container renders 2 px of
 * content narrower than its backing store and stretches the picture. The
 * wrapper carries the border and `clientWidth` is a CONTENT width, so the two
 * agree by construction. This is `wave-view.mjs`'s own note, reused rather than
 * rediscovered.
 */
function figure({ host, cls, height, label, ground = '--card' }) {
  ensureCss();
  const wrap = el('div', `pos-sv ${cls}`);
  const canvas = el('canvas', 'pos-sv-c', '', { role: 'img', 'aria-label': label || '' });
  wrap.append(canvas);
  // ⚠️ A CUSTOM PROPERTY, NEVER THE PROPERTY. Writing `canvas.style.height`
  // from a component is writing a rule nothing can override, including this
  // component's own stylesheet, which is the defect `video-panel.mjs` shipped
  // with its `aspect` option and is recorded in CLAUDE.md.
  if (height) wrap.style.setProperty('--sv-h', `${Math.round(height)}px`);
  host?.append(wrap);

  const ctx = canvas.getContext('2d');
  const css = getComputedStyle(document.documentElement);
  const tok = (n, fb) => (css.getPropertyValue(n) || '').trim() || fb;
  /**
   * 🔴 THREE GREYS, ONE HIGHLIGHT AND NO OTHER HUE, WHICH IS THIS PROJECT'S
   * SETTLED ANSWER REUSED RATHER THAN RE-ARGUED. Colour here says what a mark
   * IS rather than how it landed, because nothing in these three pictures has
   * landed well or badly. The field and the grid are the box, the line is the
   * thing being described, and `--hi` marks the one place a reader is meant to
   * look, which is the corner of a filter or the sustain level of an envelope.
   */
  const C = {
    /**
     * 🔴 A CALLER MAY SIT ON A LIGHTER GROUND, AND IT IS A TOKEN RATHER THAN A
     * HEX. Asked 2026-09-22 as *"put same bit lighter gray behind eq viz"*.
     * ⚠️ **IT IS SAFE ONLY BECAUSE `field` IS READ BACK OUT OF THE CANVAS.**
     * `ink()` samples pixel 0,0 AFTER the fill and counts everything that is
     * not that colour, so changing the ground recalibrates the counter by
     * itself. Painting a lighter rectangle inside `draw()` instead would have
     * made every pixel of the plot read as ink, which is the exact defect that
     * had four envelope asserts green while none of them could see a picture.
     */
    field: tok(ground, '#11151d'),
    grid: tok('--line', '#1f2937'),
    ink: tok('--dim', '#8b93a1'),
    faint: tok('--dim2', '#6a7280'),
    hi: tok('--hi', '#ffd400'),
    back: tok('--bg', '#0b0e14'),
  };
  const mono = tok('--mono', 'ui-monospace, Menlo, monospace');

  let W = 0, H = 0, dpr = 1, paints = 0;
  let draw = () => {};
  /**
   * The field's own colour, read back OUT OF THE CANVAS rather than parsed out
   * of the token.
   *
   * 🔴 THE PARSED VERSION SHIPPED AND WAS BLIND, AND IT WAS CAUGHT BY THREE
   * DIFFERENT PICTURES REPORTING THE SAME NUMBER. `ink()` compared each pixel
   * against `C.field.match(/\d+/g)`, and `--card` is `#11151d`, so that regex
   * answers the single number 11151 and the green and blue comparisons were
   * both against `undefined`. Every painted pixel therefore counted as ink, and
   * `ink()` was measuring the AREA OF THE BOX. MEASURED on `/kit/` 2026-09-22:
   * three envelopes with three different shapes in them all read exactly
   * **10032**, which is 209 by 96 divided by the sampling stride, and the
   * fourth read 31488 only because it wrapped onto a row of its own and was
   * wider. Four asserts were green and none of them could see a picture.
   * ⚠️ THE TELL WAS FREE AND WAS ALMOST MISSED: three separate subjects
   * agreeing to the digit is a broken collector, never a finding.
   * ✅ READING IT BACK NEEDS NO PARSER AT ALL and is exact for any format a
   * token can hold, hex, `rgb()`, a named colour or a `color-mix`. The canvas
   * has already been filled with it on the line above, so this is what is
   * really on screen rather than what the stylesheet was asked for.
   */
  let field = null;

  function size() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(0, Math.round(wrap.clientWidth));
    const h = Math.max(0, Math.round(canvas.clientHeight));
    if (w === W && h === H && canvas.width) return false;
    W = w; H = h;
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
    return true;
  }

  function paint() {
    if (!W || !H) return;
    paints++;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.fillStyle = C.field;
    ctx.fillRect(0, 0, W, H);
    if (!field) {
      try { field = [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3); }
      catch { field = null; }
    }
    draw();
  }

  /** One short line of text, cut to fit rather than allowed to run off. */
  function say(text, x, yy, { colour = C.faint, px = 9, align = 'left', room = W } = {}) {
    ctx.font = `${px}px ${mono}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = colour;
    let s = String(text ?? '');
    if (ctx.measureText(s).width > room) {
      while (s.length > 1 && ctx.measureText(`${s}…`).width > room) s = s.slice(0, -1);
      s = `${s}…`;
    }
    ctx.fillText(s, x, yy);
    ctx.textAlign = 'left';
  }

  const ro = new ResizeObserver(() => { if (size()) paint(); });
  ro.observe(wrap);

  return {
    wrap,
    canvas,
    ctx,
    C,
    mono,
    /**
     * A colour, from a token name or from a literal.
     *
     * ⚠️ IT EXISTS FOR THE SECOND TRACE AND FOR NOTHING ELSE. A figure drawing
     * one line needs no palette, and the three greys plus `--hi` above are this
     * project's settled answer to everything that is not an identity. Two
     * signals in one picture ARE an identity, which is the one case colour is
     * allowed to carry here, and a caller naming `--hi` rather than a hex is a
     * caller whose picture follows the theme.
     */
    tok,
    say,
    get W() { return W; },
    get H() { return H; },
    get paints() { return paints; },
    setDraw(fn) { draw = fn; },
    resize: size,
    paint,
    /**
     * How many pixels are not the field colour, so a check can ask whether
     * anything was drawn rather than trust that it was.
     * ⚠️ IT SAMPLES, because reading every pixel of a wide canvas costs more
     * than the answer is worth and the answer is the same: a picture has
     * thousands of marked pixels and an empty box has none.
     * 🔴 AND IT IS ONLY HALF AN ANSWER WITHOUT `area()`. A count with no
     * denominator cannot tell a drawing from a filled box, which is exactly the
     * defect this shipped with: see the note on `field` above. A check that
     * wants to know a picture was drawn should compare the two.
     */
    ink(step = 2) {
      if (!canvas.width || !canvas.height || !field) return 0;
      let data;
      try { data = ctx.getImageData(0, 0, canvas.width, canvas.height).data; }
      catch { return -1; }
      let n = 0;
      const stride = Math.max(1, Math.floor(step)) * 4;
      for (let i = 0; i < data.length; i += stride) {
        if (data[i + 3] === 0) continue;
        if (Math.abs(data[i] - field[0]) > 6 || Math.abs(data[i + 1] - field[1]) > 6
          || Math.abs(data[i + 2] - field[2]) > 6) n++;
      }
      return n;
    },
    /** How many pixels `ink()` looked at, which is the denominator it needs. */
    area(step = 2) {
      if (!canvas.width || !canvas.height) return 0;
      return Math.ceil((canvas.width * canvas.height) / Math.max(1, Math.floor(step)));
    },
    destroy() { ro.disconnect(); },
  };
}

/* ── the envelope ──────────────────────────────────────────────────────── */

/**
 * @param {object} o
 * @param {HTMLElement} [o.host]
 * @param {string} [o.label]    drawn into the picture, bottom left
 * @param {number} [o.height]
 * @param {number} [o.max]
 * @param {string} [o.unit]     `''` for proportions, or a real unit when the
 *   caller has real times. With a unit the axis means what it says and the
 *   `proportions` mark is not drawn.
 * @param {number} [o.delay] @param {number} [o.attack] @param {number} [o.decay]
 * @param {number} [o.sustain] @param {number} [o.release]
 * @returns {{el:HTMLElement, canvas:HTMLCanvasElement, set:Function,
 *   get:()=>object, path:()=>object, ink:Function, paints:number, destroy:Function}}
 */
export function createEnvelopeView({ host, label = '', height = 96, max = 127,
                                     unit = '', delay = 0, attack = 0, decay = 0,
                                     sustain = 0, release = 0 } = {}) {
  const f = figure({ host, cls: 'pos-sv-env', height, label: label || 'envelope' });
  let v = { delay, attack, decay, sustain, release };
  let path = envelopePath({ ...v, max });

  const PAD = 10;
  /* 🔴 THE FOOT SITS THE SAME DISTANCE OFF THE BOTTOM AS THE PICTURE SITS OFF
     THE SIDES, ASKED FOR 2026-09-22 AS *"more space under eq labels, same as
     left right"*. It was a bare 4 px against `PAD`'s 10, so the two words hung
     on the bottom edge while the curve above them was properly inset, and a
     box whose insets disagree with each other reads as a box that was cut.
     ⚠️ AND THE PLOT FLOOR MOVES WITH IT. The text baseline rising by 6 px
     takes the room the words need with it, so `yBot` gives up the same 6 or
     the curve lands on the label. The two numbers are one measurement and are
     written as one. */
  const FOOT_ROOM = 16;

  f.setDraw(() => {
    const { W, H, ctx, C } = f;
    const x0 = PAD, x1 = W - PAD;
    const yTop = PAD, yBot = H - PAD - FOOT_ROOM;
    const px = (x) => x0 + x * (x1 - x0);
    const py = (y) => yBot - y * (yBot - yTop);

    // The floor and the sustain level, which are the two lines a reader
    // measures against. The sustain gets the highlight because it is the one
    // value in an envelope that is a level rather than a length.
    ctx.fillStyle = C.grid;
    ctx.fillRect(x0, yBot - 0.5, x1 - x0, 1);
    ctx.save();
    ctx.setLineDash([2, 3]);
    ctx.strokeStyle = C.hi;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.moveTo(x0, py(path.sustain) + 0.5);
    ctx.lineTo(x1, py(path.sustain) + 0.5);
    ctx.stroke();
    ctx.restore();

    // The stage boundaries, so the four lengths can be read off the picture
    // rather than only seen.
    ctx.save();
    ctx.strokeStyle = C.grid;
    ctx.beginPath();
    for (const p of path.points.slice(1, -1)) {
      ctx.moveTo(Math.round(px(p.x)) + 0.5, yTop);
      ctx.lineTo(Math.round(px(p.x)) + 0.5, yBot);
    }
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    path.points.forEach((p, i) => (i ? ctx.lineTo(px(p.x), py(p.y)) : ctx.moveTo(px(p.x), py(p.y))));
    ctx.stroke();

    const foot = H - 4;
    if (label) f.say(label, PAD, foot, { room: W / 2 });
    // 🔴 THE HONESTY MARK, PAINTED INTO THE PICTURE. Stage widths follow the
    // settings, which are `0 to 127` with no published mapping to seconds, so
    // this axis is not time and must not be read as time. It travels with the
    // canvas into whatever page puts it somewhere, which a caption beside the
    // box would not.
    f.say(unit ? `stages in ${unit}` : 'proportions, not seconds',
      W - PAD, foot, { align: 'right', room: W / 2 });
  });

  function relabel() {
    f.canvas.setAttribute('aria-label',
      `${label || 'envelope'}, attack ${v.attack}, decay ${v.decay}, `
      + `sustain ${v.sustain}, release ${v.release} of ${max}`);
  }

  f.resize();
  relabel();
  f.paint();

  return {
    el: f.wrap,
    canvas: f.canvas,
    /** Change any of the five and redraw. Omitted values are left alone. */
    set(next = {}) {
      v = { ...v, ...next };
      path = envelopePath({ ...v, max });
      relabel();
      f.resize();
      f.paint();
      return { ...v };
    },
    get: () => ({ ...v }),
    path: () => path,
    /**
     * Measure the box again and paint, now, on this line.
     *
     * 🔴 IT EXISTS BECAUSE A RESIZE OBSERVATION IS A FRAME AWAY AND A CHECK IS
     * NOT. `/kit/` lays every closed tab panel out inside a measuring window
     * that holds no `await`, so a figure that was last painted at a width of
     * zero is still at zero when the check reads it, and `ink()` answers 0 on a
     * picture that is perfectly correct. A reader never meets this, because
     * opening a tab gives the observer its frame; only a synchronous reader of
     * the pixels does.
     * ⚠️ AND IT IS NOT THE COMPONENT WORKING AROUND ITS OWN BUG. Nothing here
     * polls and nothing holds a frame loop. This is the one call that says
     * `look again right now`.
     */
    redraw() { f.resize(); f.paint(); },
    ink: (step) => f.ink(step),
    area: (step) => f.area(step),
    get paints() { return f.paints; },
    destroy: () => f.destroy(),
  };
}

/* ── the filter ────────────────────────────────────────────────────────── */

/**
 * @param {object} o
 * @param {string} [o.type]  the type's own NAME, read by `filterShapeFor`. A
 *   name it cannot read is refused in words rather than drawn as a low pass.
 * @param {number} [o.freq]       the cutoff PARAMETER, 0 to `max`
 * @param {number} [o.resonance]  0 to `max`
 * @param {number} [o.max]
 */
export function createFilterView({ host, label = '', height = 96, max = 127, ground = '--card2',
                                   type = 'low pass 12dB', freq = 64,
                                   resonance = 0 } = {}) {
  const f = figure({ host, cls: 'pos-sv-filt', height, label: label || 'filter', ground });
  let v = { type, freq, resonance };
  let shape = filterShapeFor(v.type);
  let curve = shape ? filterCurve({ ...shape, freq: v.freq, resonance: v.resonance, max }) : null;

  const PAD = 10;

  f.setDraw(() => {
    const { W, H, ctx, C } = f;
    const x0 = PAD, x1 = W - PAD;
    const yTop = PAD, yBot = H - PAD - 10;
    const foot = H - PAD;   // the same inset as the sides. See FOOT_ROOM.

    if (!curve) {
      // 🔴 THE REFUSAL IS THE PICTURE. A name this file cannot read is a filter
      // whose slope and whose direction are both unknown, and drawing the
      // default low pass under that name would be the exact confident wrong
      // picture the header refuses.
      /* 🔴 AT THE FOOT, NOT FLOATING IN THE MIDDLE. Asked 2026-09-22 as
         *"align texts to bottom of the eq"* and then *"..betwen texts and
         align to bottom"*, so the pair sits on the bottom edge with room
         between them rather than centred over an empty box.
         ⚠️ THE NAME SITS ABOVE THE REASON, which is the same order every
         other refusal in this file uses, and the gap is 13 px against the
         11 px name so the two read as two lines rather than as a paragraph. */
      f.say(v.type || 'no type', PAD, foot - 13, { colour: C.ink, px: 11, room: W - PAD * 2 });
      f.say('this name does not say which filter it is', PAD, foot,
        { room: W - PAD * 2 });
      return;
    }

    // 0 dB, which is the one line worth having: it says where the passband sits
    // and therefore how far the resonance has lifted the corner above it.
    const yz = yBot - curve.zeroY * (yBot - yTop);
    ctx.fillStyle = C.grid;
    ctx.fillRect(x0, Math.round(yz) + 0.5, x1 - x0, 1);

    // The corner, which is the one number a reader is working with.
    const cx = x0 + curve.cornerAt * (x1 - x0);
    ctx.save();
    /* 🔴 DOTTED, NOT DASHED, ASKED FOR 2026-09-22 AS *"dashed to dotted in
       eq"*. A zero length dash with a round cap is a real dot; `[1, 3]` with
       the default butt cap draws one-pixel dashes, which at this alpha read as
       a broken line rather than as a series of marks. The envelope's sustain
       line keeps its dashes, because nobody asked about it and two marks that
       mean two different things are worth keeping apart. */
    ctx.lineCap = 'round';
    ctx.setLineDash([0, 3]);
    ctx.strokeStyle = C.hi;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.moveTo(Math.round(cx) + 0.5, yTop);
    ctx.lineTo(Math.round(cx) + 0.5, yBot);
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < curve.y.length; i++) {
      const x = x0 + (i / (curve.y.length - 1)) * (x1 - x0);
      const y = yBot - curve.y[i] * (yBot - yTop);
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.stroke();

    if (label) f.say(label, PAD, foot, { room: W / 2 });
    // 🔴 THE WORD THAT MAKES THIS HONEST, AND IT IS IN THE PICTURE RATHER THAN
    // BESIDE IT. Nothing here has measured this instrument's filter, nobody
    // publishes its curves, and a response drawn from a textbook prototype that
    // LOOKS like a measurement is the failure this project keeps paying for.
    f.say('schematic', W - PAD, foot, { align: 'right', room: W / 2 });
  });

  function relabel() {
    f.canvas.setAttribute('aria-label',
      `${label || 'filter'}, ${v.type}, cutoff ${v.freq} of ${max}, `
      + `resonance ${v.resonance} of ${max}, drawn as a schematic`);
  }

  f.resize();
  relabel();
  f.paint();

  return {
    el: f.wrap,
    canvas: f.canvas,
    set(next = {}) {
      v = { ...v, ...next };
      shape = filterShapeFor(v.type);
      curve = shape ? filterCurve({ ...shape, freq: v.freq, resonance: v.resonance, max }) : null;
      relabel();
      f.resize();
      f.paint();
      return { ...v };
    },
    get: () => ({ ...v }),
    /** `null` when the type's name does not say which filter it is. */
    shape: () => shape,
    curve: () => curve,
    /**
     * Measure the box again and paint, now, on this line.
     *
     * 🔴 IT EXISTS BECAUSE A RESIZE OBSERVATION IS A FRAME AWAY AND A CHECK IS
     * NOT. `/kit/` lays every closed tab panel out inside a measuring window
     * that holds no `await`, so a figure that was last painted at a width of
     * zero is still at zero when the check reads it, and `ink()` answers 0 on a
     * picture that is perfectly correct. A reader never meets this, because
     * opening a tab gives the observer its frame; only a synchronous reader of
     * the pixels does.
     * ⚠️ AND IT IS NOT THE COMPONENT WORKING AROUND ITS OWN BUG. Nothing here
     * polls and nothing holds a frame loop. This is the one call that says
     * `look again right now`.
     */
    redraw() { f.resize(); f.paint(); },
    ink: (step) => f.ink(step),
    area: (step) => f.area(step),
    get paints() { return f.paints; },
    destroy: () => f.destroy(),
  };
}

/* ── the waveform ──────────────────────────────────────────────────────── */

/** What the refusal says when a caller gives no reason of its own. */
export const NO_SHAPE = 'no shape is published for this one';

/**
 * The samples a trace draws: what the caller MEASURED if it has any, and what
 * this file can DERIVE otherwise.
 *
 * 🔴 **`points` OUTRANKS `shape`, AND THAT IS NOT A HOLE IN THE REFUSAL, IT IS
 * WHAT THE REFUSAL IS ABOUT.** The whole argument of this component is that an
 * invented squiggle under a real instrument's parameter name is a lie: sixteen
 * of the Circuit's thirty waves are wavetables with no single shape and nine
 * are blends whose ratios nobody here has measured, so a name is refused rather
 * than guessed at. A caller handing over SAMPLES is not guessing. It read the
 * signal, and a reading is strictly better evidence than a textbook shape,
 * which is the same reason `wave-view.mjs` draws a min/max envelope of a real
 * file rather than a picture of what the file ought to look like.
 * ⚠️ **NOTHING HERE TAKES A TAP, A CONTEXT OR A FRAME LOOP.** The page owns the
 * sound and calls `set({ points })` at its own rate, exactly as `wave-view.mjs`
 * takes a position rather than making one. This file still has no
 * `AudioContext`, no `requestAnimationFrame` and no poll of any kind.
 */
export function traceOf(t = {}, fallback = '--dim') {
  const shape = t.shape ?? shapeFor(t.name);
  const cycles = t.cycles ?? 2;
  const duty = t.duty ?? 0.5;
  const pts = t.points?.length
    ? Float64Array.from(t.points)
    : wavePoints(shape, 512, { cycles, duty });
  return { ...t, shape, cycles, duty, pts, colour: t.colour || fallback };
}

/**
 * @param {object} o
 * @param {string} [o.name]    the wave's own name, read by `shapeFor`
 * @param {string} [o.shape]   one of `WAVE_SHAPES`, when the caller knows it
 *   without a name to read. This is how a `pulse` gets drawn, because a duty
 *   cycle is not in any name.
 * @param {number} [o.duty]    for `pulse`
 * @param {string} [o.reason]  what to say when there is no shape. The caller
 *   knows more than this file does: a wavetable and a blend whose ratio nobody
 *   has measured are two different absences.
 * @param {ArrayLike<number>} [o.points]  samples between -1 and 1, when the
 *   caller MEASURED the signal instead of naming it. See `traceOf`.
 * @param {string} [o.colour]  a token name or a literal, default `--dim`
 * @param {object} [o.over]    A SECOND TRACE IN THE SAME PICTURE, described
 *   exactly as the first: `{ name, shape, points, duty, cycles, colour }`.
 *
 *   🔴 **ASKED FOR 2026-09-22 AS A SCOPE SHOWING AN OSCILLATOR AND AN EFFECT AT
 *   ONCE**: *"can you have wave / osilocope visualizer to top of muta. plai and
 *   warp with different colors"*. Two signals in one picture is the only way to
 *   see what the second thing did to the first, and drawing them in two boxes
 *   side by side asks a reader to hold one in their head while looking at the
 *   other.
 *   ⚠️ **COLOUR IS ALLOWED HERE AND NOWHERE ELSE IN THIS FILE, AND THE RULE IS
 *   UNCHANGED.** The three greys and one highlight exist because colour here
 *   says what a mark IS rather than how it landed. Two traces are two different
 *   things, so which is which IS what a mark is, and it is the same argument
 *   that gives a lane its gutter swatch.
 *   ⚠️ **AND IT IS ONE EXTRA TRACE, NOT A LIST.** Three signals in one box with
 *   no legend is a picture nobody can read, and the moment a caller wants four
 *   it wants a strip with rows and labels, which this project already has.
 */
export function createWaveShape({ host, label = '', height = 96, name = '', ground = '--card2',
                                  shape, duty = 0.5, reason = '', cycles = 2,
                                  points, colour = '--dim', over = null, axes = null, trail = 0 } = {}) {
  /* 🔴 THE SAME GROUND AS THE FILTER, ASKED FOR 2026-09-22 AS *"add same bg to
     waveform as to filter"*. Safe for the same reason it was safe there: `ink()`
     reads the field back OUT OF THE CANVAS after the fill, so the counter
     recalibrates itself and the refusal asserts that count ink keep working.
     ⚠️ THE ENVELOPE IS STILL `--card` AND THAT IS WHAT WAS ASKED, not an
     oversight. Two of the three figures sit on the lighter ground. */
  const f = figure({ host, cls: 'pos-sv-wave', height, label: label || 'waveform', ground });
  let v = { name, shape: shape ?? shapeFor(name), duty, reason, cycles, points, colour, over, axes };
  let a = traceOf(v, colour);
  let b = v.over ? traceOf(v.over, '--hi') : null;
  let pts = a.pts;
  /* The windows behind the current one, oldest first. Empty unless a caller
     asked for a `trail`, so a figure that never moves carries no cost. */
  const past = [];

  const PAD = 8;

  f.setDraw(() => {
    const { W, H, ctx, C } = f;
    const foot = H - 4;
    const yTop = PAD, yBot = H - PAD - 10;
    const mid = (yTop + yBot) / 2;

    /* 🔴 THE ZERO LINE IS DRAWN ONLY WHEN THERE IS A WAVE ON IT. Reported
       2026-09-22 with a screenshot of `saw 7:3 PW` and the word *"rm line"*: a
       refused wave was getting a rule straight through its own two lines of
       text, and an axis under no curve is furniture that reads as a picture
       which failed to load. It is the same rule as an empty table drawing no
       heading. */
    if (pts) {
      ctx.fillStyle = C.grid;
      ctx.fillRect(PAD, Math.round(mid) + 0.5, W - PAD * 2, 1);
    }

    if (!pts) {
      /* 🔴 THE REFUSAL, AND IT IS THE REASON THIS COMPONENT IS WORTH HAVING.
         Sixteen of the Circuit's thirty oscillator waves are WAVETABLES, which
         have no single shape by definition, and nine more are blends whose
         ratios nothing here has measured. Drawing a plausible squiggle under
         one of those names would be an invention wearing an instrument's label.
         🔴 IT SITS AT THE BOTTOM SINCE 2026-09-22, ASKED FOR AS *"alitng title
         and desc to bottm (leave nice padding)"* after a screenshot of the two
         lines floating in the middle of an otherwise empty card.
         🔴 AND `not drawn` WENT WITH IT, ASKED AS *"no \"not drawn\""*. The card
         was carrying the refusal twice: the reason says why nothing is drawn and
         `not drawn` said that nothing is drawn, which the empty picture has
         already said. Two channels for one fact, and the one removed is the one
         with no information in it. ⚠️ THE `aria-label` STILL SAYS IT, because a
         reader with no picture has no empty canvas to infer from, and the assert
         on `/kit/` reads it there.
         ⚠️ **THE PADDING IS `PAD`, WHICH IS THE CARD'S ONE CONSTANT.** The
         drawn case's own name line sits on `foot`, and the two here sit on the
         same baseline and one line above it, so nothing in this file carries a
         second number meaning the gap at the bottom. */
      /**
       * 🔴 `reason: null` DRAWS NOTHING AT ALL, added 2026-09-22. It is
       * DISTINCT from `''` and from no reason, which both fall back to
       * `NO_SHAPE`, and the distinction is the point: this file refuses to
       * invent a shape and says so, which is right for a wavetable nobody has
       * measured and wrong for a scope whose instrument is simply switched off.
       * ⚠️ **THE ABSENCE STILL HAS TO BE EXPLAINED SOMEWHERE**, and a caller
       * passing `null` is claiming it is explained elsewhere. On `/muta/` the
       * instrument's own lamp reads `PLAITS off` an inch below, so a second
       * sentence saying nothing is sounding would be the doubled channel this
       * project keeps removing.
       * ⚠️ AND THE ROOM IS STILL RESERVED. The figure keeps its height whether
       * it draws words, a trace or nothing, so a picture arriving cannot move
       * the page under a reader.
       */
      if (v.reason !== null) {
        f.say(v.reason || NO_SHAPE, PAD, foot, { room: W - PAD * 2 });
        f.say(v.name || 'no wave', PAD, foot - 13, { colour: C.ink, px: 11, room: W - PAD * 2 });
        if (label) f.say(label, W - PAD, foot - 13, { align: 'right', room: W / 2 });
      }
      return;
    }

    /* Each trace in its own ink, the first on top of the second so a caller's
       primary signal is never buried under whatever it was put through. */
    const room = (yBot - yTop) / 2;
    const line = (t, alpha = 1, width = 1.5) => {
      if (!t?.pts) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = f.tok(t.colour, t.colour);
      ctx.lineWidth = width;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i < t.pts.length; i++) {
        const x = PAD + (i / (t.pts.length - 1)) * (W - PAD * 2);
        const y = mid - Math.max(-1, Math.min(1, t.pts[i])) * room;
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    };

    /**
     * 🔴 THE TRACES BEHIND THIS ONE, FADING, WHICH IS A PHOSPHOR AND NOT AN
     * ANIMATION. Asked 2026-09-22: *"can you do a bit of analog effect so
     * previous wave is still bit shown fading out when news is coming, vacuum
     * tube ... make it subtle"*.
     * ⚠️ **IT IS DRAWN, NOT ANIMATED, WHICH IS WHY THIS FILE STILL HAS NO FRAME
     * LOOP.** The old windows are kept and painted on the next `set`, so the
     * decay happens at whatever rate the caller feeds it and this component
     * still never asks for a frame. A `requestAnimationFrame` here would be the
     * poll the whole file is written to avoid.
     * ⚠️ AND THE OLDEST IS THE FAINTEST, CUBED, so the fall is quick and the
     * tail is short. It was squared at 0.45 and reported as *"fade faster"*: at
     * 47 windows a second a long tail is six visible lines rather than a glow.
     */
    for (let i = 0; i < past.length; i++) {
      const age = (past.length - i) / (past.length + 1);
      line({ pts: past[i], colour: a.colour }, Math.pow(1 - age, 3) * 0.3, 1);
    }

    line(b);
    line(a);

    /* 🔴 THE NAME IS ON THE LEFT SINCE 2026-09-22, ASKED FOR AS *"align
       waveform names to left"*. A column of figures with their names on the
       right had every name at a different x, because the boxes are not all the
       same width, so the one thing a reader scans down was the one thing that
       did not line up. When a caller passes a `label` as well, the label keeps
       the left and the name follows it.
       ⚠️ AND WITH TWO TRACES EACH NAME IS WRITTEN IN ITS OWN TRACE'S INK, which
       is the legend. A separate key beside the picture would be the thing this
       project keeps taking off pages: a figure and its ink joined across two
       elements is what makes a legend necessary in the first place. */
    /**
     * 🔴 THE TWO SCALES, WHERE A SCOPE PUTS THEM. `axes: { x, y }`, added
     * 2026-09-22 on *"perhaps x y units?"*. Without them a trace is a shape
     * with no size: the same picture is a 20 ms window or a 2 second one, and a
     * reader has no way to tell which.
     * ⚠️ **THEY ARE THE CALLER'S STRINGS AND THIS FILE INVENTS NEITHER.** What
     * a window spans is a fact about the thing that captured it, and a
     * component that guessed at it would be drawing a number nobody measured,
     * which is the whole argument this file already makes about waveshapes.
     * ⚠️ AND `y` SITS AT THE TOP because it labels the vertical extent, while
     * `x` sits under the trace's right edge because it labels the span. Neither
     * takes room from the picture: both are on lines the figure already has.
     */
    if (v.axes?.y) f.say(v.axes.y, W - PAD, yTop + 9, { align: 'right', px: 10, colour: C.faint, room: W / 2 });
    if (v.axes?.x) f.say(v.axes.x, W - PAD, yBot - 3, { align: 'right', px: 10, colour: C.faint, room: W / 2 });

    const nameA = v.name || a.shape || '';
    if (b) {
      const nameB = v.over?.name || b.shape || '';
      f.say(nameA, PAD, foot, { colour: f.tok(a.colour, a.colour), room: W / 2 - PAD });
      f.say(nameB, W - PAD, foot, { align: 'right', colour: f.tok(b.colour, b.colour), room: W / 2 - PAD });
    } else if (label) {
      f.say(label, PAD, foot, { room: W / 2 });
      f.say(nameA, W - PAD, foot, { align: 'right', room: W / 2 });
    } else {
      f.say(nameA, PAD, foot, { room: W - PAD * 2 });
    }
  });

  function relabel() {
    /* 🔴 `not drawn` STAYS IN THE ANNOUNCEMENT AFTER COMING OFF THE PICTURE.
       A reader who cannot see the canvas has no empty box to infer an absence
       from, so these words are the only channel they have, and `/kit/` asserts
       them here. The drawn string and the announced string are two different
       channels and only the drawn one was objected to. */
    const how = a.points?.length ? 'measured' : `${a.cycles} cycles of a ${a.shape}`;
    const one = pts
      ? `${v.name || a.shape} drawn as ${how}`
      : `${v.name || 'wave'}, not drawn: ${v.reason || NO_SHAPE}`;
    const two = b?.pts
      ? `, over ${v.over?.name || b.shape} in a second colour`
      : '';
    f.canvas.setAttribute('aria-label', one + two);
  }

  f.resize();
  relabel();
  f.paint();

  return {
    el: f.wrap,
    canvas: f.canvas,
    set(next = {}) {
      /* ⚠️ THE OLD WINDOW IS KEPT BEFORE THE NEW ONE REPLACES IT, and only when
         there is a real one to keep: a caller clearing the picture should not
         leave a ghost of the last signal hanging over an instrument that has
         been switched off. */
      if (trail > 0 && next.points && pts && pts.length) {
        past.push(pts);
        while (past.length > trail) past.shift();
      }
      if (trail > 0 && next.points === null) past.length = 0;
      v = { ...v, ...next };
      if (next.shape === undefined && next.name !== undefined) v.shape = shapeFor(next.name);
      a = traceOf(v, v.colour);
      b = v.over ? traceOf(v.over, '--hi') : null;
      pts = a.pts;
      relabel();
      f.resize();
      f.paint();
      return { ...v };
    },
    get: () => ({ ...v }),
    /** `false` when this wave has no shape to draw, which is the honest case. */
    drawn: () => !!pts,
    /** `false` when there is no second trace, or it has nothing to draw. */
    overDrawn: () => !!b?.pts,
    /** The two traces' inks, resolved, so a check can tell them apart. */
    inks: () => [f.tok(a.colour, a.colour), b ? f.tok(b.colour, b.colour) : null],
    /**
     * Measure the box again and paint, now, on this line.
     *
     * 🔴 IT EXISTS BECAUSE A RESIZE OBSERVATION IS A FRAME AWAY AND A CHECK IS
     * NOT. `/kit/` lays every closed tab panel out inside a measuring window
     * that holds no `await`, so a figure that was last painted at a width of
     * zero is still at zero when the check reads it, and `ink()` answers 0 on a
     * picture that is perfectly correct. A reader never meets this, because
     * opening a tab gives the observer its frame; only a synchronous reader of
     * the pixels does.
     * ⚠️ AND IT IS NOT THE COMPONENT WORKING AROUND ITS OWN BUG. Nothing here
     * polls and nothing holds a frame loop. This is the one call that says
     * `look again right now`.
     */
    redraw() { f.resize(); f.paint(); },
    ink: (step) => f.ink(step),
    area: (step) => f.area(step),
    get paints() { return f.paints; },
    destroy: () => f.destroy(),
  };
}
