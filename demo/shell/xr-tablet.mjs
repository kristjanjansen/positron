// demo/shell/xr-tablet.mjs — the small screen that sits on the controller, and
// the one control on it.
//
// 🔴 IT IS A CANVAS, WHICH IS THE ONLY REASON IT WORKS AT ALL. The 2-D page is
// behind your face inside an immersive session — `d.log` and the readout are
// invisible there — so anything you need to READ or PRESS while wearing the
// headset has to be drawn in the scene. `panel.mjs` settled that idiom for a
// wall-sized panel and this is the same idiom at 0.20 m: draw to a canvas,
// `texImage2D` it, and point at it.
//
// 🔴 A SECOND CONTROL IS ONE LINE OF `DEFAULT_CONTROLS`, NOT A REWRITE. The
// canvas's height, the tablet's size in metres, the row boundaries the hit test
// uses and the fingerprint two runs are compared on are all derived from that
// one array; the value, its range, its unit and what it drives live on the
// control's own object. The way it is kept honest is that the drawing and the
// hit test read the SAME arithmetic for "where is row `i`", so they cannot
// disagree about it — and the one that would be wrong is the invisible one.
//
// ⚠️ THE SHAPE IS THE READOUT'S, ON PURPOSE — a label, a number, a unit. It is
// the shape a visitor already knows from every other page here, and inventing a
// second one for the headset would mean learning the readout twice. The one
// thing it adds is the track underneath, because in a headset a number you
// cannot change is a number you cannot investigate.
//
// 🔴 AND NOTHING IN THIS FILE KNOWS WHAT KIND OF SESSION IT IS IN. There is no
// `immersive-vr`, no `immersive-ar`, no blend mode and no passthrough anywhere
// below, and `xr-pick-test.mjs` asserts that the fingerprint carries none of
// those words either. The requirement was that the controller interface be
// identical in both modes, and the way to satisfy that is structural: the code
// cannot tell them apart, so it cannot drift.
//
// ⚠️ INCLUDING THE CONTRAST, WHICH IS THE ONE PLACE IT WAS TEMPTING. Over
// passthrough the tablet composites onto a lit room; in an opaque session onto
// a dark one, and the instinct is to brighten it in the first. That instinct is
// about CONTRAST rather than about mode, so the fix is to make the tablet its
// own background in both — an opaque-enough fill that what is behind it stops
// mattering — rather than to ask the session what it is. One number, both
// modes, and it is `FILL_ALPHA` below.
//
// ⚠️ NOTHING HERE IS DESTRUCTIVE ON A SINGLE PRESS, and that is forced rather
// than chosen: Quest reserves the palm-pinch gesture on both hands and has an
// open bug (webxr-hand-input#117, since 2022) where reaching for it fires a
// spurious `select`. A slider that moves is reversible by moving it back.
// `plan-xr-hands` §3.3.

/**
 * 🔴 ONE LINE ADDS A CONTROL, AND THERE IS EXACTLY ONE LIST. `key` is what the
 * page reads the value back by, `apply` is what the value DOES, and everything
 * else is what the cell says. The canvas's height, the tablet's metres, the hit
 * test's row boundaries and the fingerprint all derive from this array, so a
 * control added here arrives complete.
 *
 * ⚠️ `apply` TAKES THE VALUE AND THE PAGE'S CONTEXT, so a control never reaches
 * into anything itself — which is what keeps this module free of the room, the
 * session and the page.
 *
 * ⚠️ AND `createXRTablet` TAKES NO CONTROL LIST. It used to, and that quietly
 * broke the promise above: the canvas was sized from this array at load, so a
 * caller passing two controls got a second row drawn past the bottom edge and
 * unreachable by the hit test. Two pages showing two different tablets is also
 * exactly what "the same interface in both kinds of session" forbids, one level
 * up. One list, both pages, both modes.
 */
export const DEFAULT_CONTROLS = [
  {
    key: 'grid',
    label: 'floor dots',
    unit: '%',
    min: 0,
    max: 100,
    value: 75,
    apply: (v, ctx) => ctx?.room?.setGrid?.({ alpha: v / 100 }),
  },
];

// ── the site's slider, in one table ───────────────────────────────────────
//
// 🔴 THE SAME CONTROL IN ANOTHER SURFACE, SO IT LOOKS THE SAME. Reported from
// the headset: *"use our slider style"*. The tablet had a pill-shaped track
// with a round knob and a filled portion — a second visual language for a
// control this project already has one for, which is the thing `/kit/` exists
// to prevent. This is `demo/shell/slider.mjs` as drawn by `shell.css`.
//
// ⚠️ A CANVAS CANNOT USE THE STYLESHEET, SO THE NUMBERS ARE COPIED — AND THAT
// IS THE DANGEROUS PART. Two copies of a design drift and nobody notices until
// they are side by side. So they are copied ONCE, into this table, each with
// the rule it came from; nothing below this block carries a literal. The
// COLOURS are not copied at all — they are read live off `:root` with these as
// fallbacks, so a token change reaches the tablet without anyone editing here.
//
//   shell.css `.sld`        height 34px · --sld-knob 20px · gap 8px
//   shell.css `.sld-lane`   background --card2 · inset 0 0 0 1px --line2
//                           · border-radius 4px
//   shell.css `.sld-knob`   width var(--sld-knob) · height 34px
//                           · background --hi · border-radius 4px
//   shell.css `.sld-l`      500 9.5px/1 mono · letter-spacing .1em
//                           · uppercase · --dim2
//   shell.css `.sld-v`      500 12px/1 mono · --fg · tabular-nums · LEFT
//   shell.css `.sld-head`   column · gap 4px  ← the value UNDER the label,
//                           which changed today; the old side-by-side is gone
//   shell.css `.sld-lane:focus-visible`
//                           outline 2px solid --hi · outline-offset 1px
//   shell.css `.sld-group`  row gap 10px
//
// ⚠️ `K` IS THE ONLY THING ADDED. A 34 px lane on a 768 px canvas read at
// arm's length would be a hairline, so every CSS pixel above becomes `K` design
// pixels — ONE factor, so the proportions are the stylesheet's and only the
// size is this surface's. At K=4 the lane comes out 374x136, which is 2.75:1
// against the shipped control's 96x34, i.e. 2.8:1. That match is the check.
const K = 4;
const KIT = {
  laneH: 34 * K,
  knobW: 20 * K,
  radius: 4 * K,
  edge: 1 * K,
  gap: 8 * K,             // head -> lane
  headGap: 4 * K,         // label -> value
  rowGap: 10 * K,         // between one control and the next
  labelPx: 9.5 * K,
  labelTrack: 0.1,        // em
  valuePx: 12 * K,
  ring: 2 * K,            // .sld-lane:focus-visible outline-width
  ringOffset: 1 * K,      // .sld-lane:focus-visible outline-offset
};

// 🔴 THE ONE PLACE A MONOSPACE FACE IS ASSUMED. Every width below is a
// character count times an advance, because that is the only way a layout can
// be arithmetic — and arithmetic is the only way `node` can grade it. 0.6em is
// the advance of every face in `--mono`. ⚠️ It is an ASSUMPTION, so the page
// MEASURES the drawn label against the column it was given and asserts it fits;
// if the face ever changes, that assert is what says so rather than a label
// quietly running under the lane.
export const MONO_ADV = 0.6;
const labelW = (s) => s.length * KIT.labelPx * (MONO_ADV + KIT.labelTrack);
const valueW = (c) => (`${c.max}`.length + (c.unit ? c.unit.length + 1 : 0)) * KIT.valuePx * MONO_ADV;

// ── the slab, and what a headset can read at arm's length ─────────────────
//
// 🔴 MORE AIR. Reported from the headset as cramped; the inset was 22 design
// pixels, under 3% of the width. It is `PAD` below and nothing else, because
// every other measurement is taken from it or from the kit table above.
//
// ⚠️ PADDING COMES OUT OF THE CONTENT, so the thing to check is that the TYPE
// did not shrink to pay for it. It did not: the value is `KIT.valuePx` = 48
// design pixels, against 62 before — but the canvas is the same 1280 real
// pixels across the same 31.9 degrees, so the figure that matters is unchanged
// at **40.1 px per degree**, and 48 design pixels is 2.0 degrees of cap height
// at a reading distance of 0.35 m. Nothing was bought by making the words
// smaller and nothing had to be.
const PAD = 48;
// ⚠️ AND THE FOCUS RING SITS OUTSIDE THE LANE, so the row has to be tall enough
// to hold it — a ring clipped by the canvas edge reads as a drawing fault
// rather than as a control with the pointer on it.
const RING_OUT = KIT.ringOffset + KIT.ring;
// The row's content is whichever of the two columns is taller; the gap below it
// is the stylesheet's own row gap, and the LAST row does not carry one.
const HEAD_H = KIT.labelPx + KIT.headGap + KIT.valuePx;
const ROW_CONTENT = Math.max(KIT.laneH + RING_OUT * 2, HEAD_H);
const ROW_H = ROW_CONTENT + KIT.rowGap;

/** The canvas, in DESIGN pixels, for `n` controls. */
const pyFor = (n) => PAD + Math.max(1, n) * ROW_H - KIT.rowGap + PAD;
const DESIGN_W = 768;
const DESIGN_H = pyFor(DEFAULT_CONTROLS.length);

// 🔴 THE HEAD COLUMN IS AS WIDE AS ITS WIDEST LINE, WHICH IS WHAT `max-content`
// DOES IN `.sld-group`. Computed from the control list rather than typed, so a
// control with a longer name widens the column instead of running under the
// lane — and computed with arithmetic rather than `measureText`, so the hit
// test and the drawing share it and `node` can grade both.
const HEAD_W = Math.max(...DEFAULT_CONTROLS.map((c) => Math.max(labelW(c.label), valueW(c))));

/**
 * The lane, in design pixels. Exported because the knob's travel is the one
 * number in this file that is easy to get wrong and invisible when it is — see
 * `valueFromU`.
 */
const LANE = {
  x: PAD + HEAD_W + KIT.gap,
  get w() { return DESIGN_W - PAD - this.x; },
  h: KIT.laneH,
  knobW: KIT.knobW,
  get travel() { return this.w - this.knobW; },
};

// 🔴 EVERY LAYOUT NUMBER ABOVE IS A **DESIGN** PIXEL, AND THE CANVAS IS BIGGER
// THAN THAT BY ONE FACTOR. The tablet was reported too small from the headset
// and the fix is to grow the OBJECT — but growing an object without growing its
// texture spends the legibility budget rather than the object, so both move
// together and `SCALE` is the single number that moves them. `draw()` sets one
// transform and then works in design pixels; `controlAt` and `valueFromU` do
// the same, so the drawing and the hit test stay the same arithmetic and the
// scale cannot get into one of them and not the other.
const SCALE = 5 / 3;
const PX = Math.round(DESIGN_W * SCALE);
const PY = Math.round(DESIGN_H * SCALE);

// 🔴 THE TEXTURE SIZE IS AN ANGULAR BUDGET, NOT A SIZE. The instinct for a
// small object is a small texture and it is BACKWARDS: what a face resolves is
// pixels per DEGREE, and a tablet is an order of magnitude closer than a wall
// panel. `mirror`'s shipped panel is 1.28 m at 1.6 m — 43.6 degrees across a
// 1280 px texture, so **29.4 px per degree**. This is 0.20 m across 1280 px at
// a reading distance of 0.35 m — 31.9 degrees, so **40.1**. Above the shipped
// panel rather than merely matching it, because a tablet is read at a glance
// while holding something else. ⚠️ And 40 px/deg is still only an anchor:
// `mirror`'s own legibility has never been graded by a face, so matching it is
// a floor rather than a measurement. `plan-xr-hands` §5.2.
const W_M = 0.20;
// ⚠️ THE HEIGHT FOLLOWS THE PIXELS. A width and a height typed separately are
// two numbers that can disagree about the aspect, and a stretched texture is
// the one defect nobody photographs because it looks almost right.
const H_M = Math.round((W_M * PY / PX) * 10000) / 10000;

// 0..1. Held high on purpose — see the contrast note at the top of the file.
const FILL_ALPHA = 0.92;

/**
 * How many figures a control's number is worth. Read off its own RANGE rather
 * than typed per control: a 0..100 control that printed `75.0000` reads as
 * false precision, and a 0..1 control rounded to whole numbers has three
 * positions and looks broken.
 */
const fmt = (v, c) => {
  const span = Math.abs((c?.max ?? 100) - (c?.min ?? 0));
  const dp = span >= 20 ? 0 : span >= 2 ? 1 : 2;
  return v.toFixed(dp);
};

/**
 * A rounded rectangle that still draws where `roundRect` does not exist.
 *
 * ⚠️ `g.roundRect?.(…)` FOLLOWED BY `g.fill()` DRAWS NOTHING ON A BROWSER THAT
 * LACKS IT — no throw, no warning, an empty path filled successfully. That is
 * the optional-chaining failure this project already paid for on an iPhone's
 * fullscreen button: a control that looks live and is inert.
 */
const rrect = (g, x, y, w, h, r) => {
  g.beginPath();
  if (g.roundRect) g.roundRect(x, y, w, h, r);
  else g.rect(x, y, w, h);
  g.fill();
};

/**
 * Where the rows live, in canvas pixels.
 *
 * 🔴 READ BY THE DRAWING AND BY THE HIT TEST, WHICH IS THE WHOLE POINT. Two
 * arithmetics for "where is row `i`" is two answers, and the one that would be
 * wrong is the invisible one — a press landing on a row that is not the row
 * under the knob, with nothing on screen to say so.
 */
const rowsTop = () => PAD;
const rowsBottom = () => DESIGN_H - PAD;
const rowH = () => ROW_H;

/**
 * Which control a point on the tablet is over, or null for the footer and the
 * margins.
 *
 * @param {number} u 0..1 across
 * @param {number} v 0..1 down, origin TOP LEFT — the way `pickQuad` hands it over
 */
export function controlAt(u, v) {
  if (!(u >= 0 && u <= 1 && v >= 0 && v <= 1)) return null;
  const py = v * DESIGN_H;          // design pixels, where the layout lives
  if (py < rowsTop() || py >= rowsBottom()) return null;
  const i = Math.floor((py - rowsTop()) / rowH());
  if (i < 0 || i >= DEFAULT_CONTROLS.length) return null;
  return { i, control: DEFAULT_CONTROLS[i] };
}

/**
 * What a drag across the tablet means, in the control's own units.
 *
 * 🔴 A SHARE OF THE TRAVEL, NEVER OF THE WIDTH — which is `slider.mjs`'s own
 * rule and the reason its two ends land flush. The knob is `LANE.knobW` wide
 * and moves `LANE.w - LANE.knobW`; a value read as a share of the LANE puts the
 * knob half outside it at both extremes, and a value read as a share of the
 * whole TABLET can never reach either end at all. Both look like a broken
 * control and neither throws.
 *
 * ⚠️ HALF A KNOB IS SUBTRACTED because the ray grabs the knob's CENTRE, exactly
 * as a pointer does in `slider.mjs`'s `fromX` — without it the extremes are
 * only reachable by aiming off the tablet entirely.
 *
 * Clamped rather than extrapolated: a ray that slides off the side with the
 * trigger down must not drive the number past what the control says it can be.
 */
export function valueFromU(u, control) {
  const f = Math.max(0, Math.min(1, (u * DESIGN_W - LANE.x - LANE.knobW / 2) / LANE.travel));
  const v = control.min + f * (control.max - control.min);
  return Math.round(v * 1e6) / 1e6;
}

/** The inverse, for drawing the knob where the value says it is. */
/** Where the knob's LEFT EDGE goes, in design pixels. The inverse of the above. */
const knobX = (value, control) => {
  const f = (value - control.min) / ((control.max - control.min) || 1);
  return LANE.x + Math.max(0, Math.min(1, f)) * LANE.travel;
};

/**
 * 🔴 WHAT ONE HEADSET RUN IN VR AND ONE IN AR ARE COMPARED ON.
 *
 * The owner will do at most one pass of each mode, so "are the two the same?"
 * has to be answerable by putting two log lines side by side rather than by a
 * third run. This string is built entirely out of declarations — sizes, counts,
 * ranges, which hand gets what — and there is no session, no blend mode and no
 * frame anywhere in it. Two runs that print different fingerprints have a
 * branch in them that should not be there; two that print the same one cannot.
 *
 * ⚠️ It is a getter rather than a field so that it describes the list as it
 * actually is, including a control added later by somebody who never read this.
 */
export const TABLET = {
  w: W_M, h: H_M, px: PX, py: PY,
  pad: PAD, fillAlpha: FILL_ALPHA, scale: SCALE,
  designW: DESIGN_W, designH: DESIGN_H, lane: LANE, kit: KIT, headW: HEAD_W,
  controls: DEFAULT_CONTROLS,
};
Object.defineProperty(TABLET, 'fingerprint', {
  enumerable: true,
  get() {
    // ⚠️ REGISTERED BY xr-room.mjs RATHER THAN IMPORTED FROM IT, and the reason
    // is the direction of the dependency: the room draws the tablet, so the
    // tablet must not reach back into the room or the two cannot be loaded
    // apart — which is what lets `node demo/shell/xr-pick-test.mjs` grade this
    // file with no WebGL anywhere. `registerStandIn` is the one line that
    // crosses, and it crosses the way that keeps the arithmetic testable.
    const parts = TABLET.standInParts ?? '?';
    const cs = DEFAULT_CONTROLS
      .map((c) => `${c.key} ${c.min}..${c.max}${c.unit || ''}`).join(', ');
    return `tablet ${W_M}x${H_M} m @ ${PX}x${PY} px · ${DEFAULT_CONTROLS.length} control(s) [${cs}]`
      + ` · stand-in ${parts} parts · tablet on the left hand, pointer on the right`;
  },
});

/**
 * How many parts the controller stand-in is drawn from — called once by
 * `xr-room.mjs`, which owns the shape. It is in the fingerprint because the
 * stand-in is part of the controller interface the two session modes are being
 * compared on, and because a footer that says "a stand-in" should be able to
 * say how much of one.
 */
export function registerStandIn(parts) { TABLET.standInParts = parts; }

/**
 * 🔴 THE LINE THAT SAID WHAT THE SHAPE ON YOUR HAND WAS HAS GONE FROM THE FACE
 * — BUT THE FACT HAS NOT, AND THAT IS THE WHOLE OF THIS NOTE.
 *
 * The footer used to read "a stand-in shape, not your real controller", and it
 * was asked to go: it is a caption on a control surface, and captions crowd out
 * the numbers. Deleting a display without rehoming what it SAID is how a page
 * quietly stops reporting something, so the fact moved rather than went. It now
 * lives in two better places:
 *
 *   · **the shape itself.** A stand-in draws in a colour no real controller is
 *     — see `STAND_IN_COL` in xr-room.mjs. The fact is in the thing rather than
 *     in a caption about the thing, which is where this project puts every
 *     other claim it makes about a picture.
 *   · **one line per session on the beacon**, said when the answer settles
 *     rather than only when it fails.
 *
 * ⚠️ Do not put it back on the face. If a third place is ever wanted, the
 * readout on the flat page is the one with room for it.
 */

/**
 * The tablet, drawn.
 *
 * ⚠️ `document` IS TOUCHED HERE AND NOWHERE ABOVE. Everything a laptop needs to
 * grade — the layout, the hit test, the value arithmetic, the fingerprint — is
 * a pure function above this line, so `node demo/shell/xr-pick-test.mjs` runs
 * with no browser at all.
 */
export function createXRTablet({ ctx: hostCtx = null } = {}) {
  const controls = DEFAULT_CONTROLS;
  const canvas = document.createElement('canvas');
  canvas.width = PX; canvas.height = PY;
  const g = canvas.getContext('2d');
  const values = new Map(controls.map((c) => [c.key, c.value]));
  let version = 0, drawn = -1;
  let aimed = null;             // { u, v, i } while the pointer is on it
  let dragging = null;          // the control index the trigger took hold of

  // 🔴 THE COLOURS ARE READ LIVE OFF `:root`, NOT COPIED. The KIT table above
  // holds the stylesheet's SIZES because a canvas cannot compute them — but a
  // colour it can just ask for, so a token change reaches the tablet with
  // nobody editing this file. The literals are fallbacks for a context with no
  // document behind it, and they are the current values of those tokens.
  const css = typeof getComputedStyle === 'function'
    ? getComputedStyle(document.documentElement) : null;
  const tok = (n, fb) => ((css?.getPropertyValue(n) || '').trim() || fb);
  const FG = tok('--fg', '#e6e6e6');           // .sld-v
  const DIM2 = tok('--dim2', '#6a7280');       // .sld-l
  const HI = tok('--hi', '#ffd400');           // .sld-knob
  const CARD2 = tok('--card2', '#151b26');     // .sld-lane ground
  const LINE2 = tok('--line2', '#2b3546');     // .sld-lane edge
  const MONO = tok('--mono', 'ui-monospace, SFMono-Regular, Menlo, monospace');

  const value = (key) => values.get(key);
  const set = (key, v) => {
    const c = controls.find((x) => x.key === key);
    if (!c) return false;
    const clamped = Math.max(c.min, Math.min(c.max, v));
    if (values.get(key) === clamped) return false;
    values.set(key, clamped);
    version++;
    try { c.apply?.(clamped, hostCtx); } catch { /* a control must not take the frame with it */ }
    return true;
  };

  /** Push every control's value through its `apply` once — at session start. */
  const applyAll = () => {
    for (const c of controls) {
      try { c.apply?.(values.get(c.key), hostCtx); } catch { /* see above */ }
    }
  };

  /**
   * Where the pointer is on the tablet this frame, or null.
   *
   * ⚠️ AIM AND PRESS ARE SEPARATE CALLS because they answer different
   * questions, and because a press must be able to CONTINUE off the control it
   * started on: once the trigger has hold of a slider, running the ray off the
   * side of the tablet clamps rather than drops it, which is how every slider a
   * hand has ever used behaves.
   */
  function aim(hit) {
    // ⚠️ THE VERSION MOVES WHEN THE PICTURE WOULD, AND NOT OTHERWISE. Bumping
    // it on every frame the ray is anywhere on the tablet would re-draw and
    // re-upload 768x528 ninety times a second to show the same image — the
    // canvas only cares WHICH ROW is lit, so that is what is compared.
    const wasI = aimed ? aimed.i : null;
    if (!hit) { if (aimed) { aimed = null; version++; } return null; }
    const at = controlAt(hit.u, hit.v);
    const i = at ? at.i : -1;
    aimed = { u: hit.u, v: hit.v, i };
    if (i !== wasI) version++;
    return aimed;
  }

  /** The trigger went down while the ray was somewhere. True if we took it. */
  function press(hit) {
    if (!hit) return false;
    const at = controlAt(hit.u, hit.v);
    if (!at) return false;
    dragging = at.i;
    set(at.control.key, valueFromU(hit.u, at.control));
    return true;
  }

  /** The trigger is still down. `hit` may be null — the drag keeps its grip. */
  function drag(hit) {
    if (dragging === null) return false;
    const c = controls[dragging];
    if (!c || !hit) return true;
    set(c.key, valueFromU(hit.u, c));
    return true;
  }

  const release = () => { const had = dragging !== null; dragging = null; return had; };
  const holding = () => dragging !== null;

  function draw() {
    if (drawn === version) return version;
    drawn = version;
    // ⚠️ ONE TRANSFORM, SET EVERY TIME. `setTransform` rather than `scale`
    // because `scale` compounds: called once a frame it would shrink the
    // picture to nothing over a few seconds, which reads as the tablet fading
    // out rather than as a transform bug.
    g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    g.clearRect(0, 0, DESIGN_W, DESIGN_H);

    // The face. The rounded corner is the SHADER's job — see HOLD_FS in
    // xr-room.mjs — so this canvas is the ink on the face and nothing else.
    // Drawing a second rounded rectangle here would put one rounding over
    // another and show a seam at every corner.
    const rh = rowH();
    g.textBaseline = 'alphabetic';
    g.textAlign = 'left';
    controls.forEach((c, i) => {
      const top = rowsTop() + i * rh;
      const v = values.get(c.key);
      const lit = aimed?.i === i;

      // ── the head: the LABEL, and the VALUE UNDER IT ────────────────────
      // 🔴 UNDER, NOT BESIDE. `shell.css`'s `.sld-head` changed today and the
      // reason it changed applies here too: a number on the far side of the
      // lane drifts away from the word it belongs to as it narrows, and this
      // project's rule everywhere else is that a figure sits beside its own
      // ink. The two are one column, as wide as the wider of its two lines.
      const headTop = top + (ROW_CONTENT - HEAD_H) / 2;
      g.fillStyle = DIM2;
      g.font = `500 ${KIT.labelPx}px ${MONO}`;
      // `.sld-l` is uppercase with .1em of tracking. `letterSpacing` is not on
      // every canvas implementation, so the tracking is done by hand — which is
      // also the only way it can agree with `labelW` above.
      let x = PAD;
      const track = KIT.labelPx * KIT.labelTrack;
      for (const ch of c.label.toUpperCase()) {
        g.fillText(ch, x, headTop + KIT.labelPx);
        x += KIT.labelPx * MONO_ADV + track;
      }

      // ⚠️ THE UNIT IS PART OF THE VALUE STRING, exactly as `.sld-v` prints it
      // — `12.40 ms`, one run of text, left-aligned under the label's first
      // letter. It used to be a separate smaller word positioned by a measured
      // offset, which is two things to keep in step for no gain.
      // ⚠️ THE VALUE DOES NOT CHANGE COLOUR WHEN THE RAY IS ON IT. Colour in
      // this project says HOW SOMETHING LANDED, and "you are pointing at it" is
      // a second meaning on that channel — the rule `TOUCH` in xr-panel.mjs
      // exists to hold. The pointer's feedback is the ring below, which is the
      // site's own answer to the same question.
      g.fillStyle = FG;
      g.font = `500 ${KIT.valuePx}px ${MONO}`;
      g.fillText(`${fmt(v, c)}${c.unit ? ' ' + c.unit : ''}`,
                 PAD, headTop + KIT.labelPx + KIT.headGap + KIT.valuePx);

      // ── the lane and the knob ──────────────────────────────────────────
      const ly = top + (ROW_CONTENT - KIT.laneH) / 2;
      g.fillStyle = CARD2;
      rrect(g, LANE.x, ly, LANE.w, KIT.laneH, KIT.radius);
      // ⚠️ AN INSET EDGE, NOT A BORDER — `.sld-lane` uses an inset shadow for
      // one measured reason: a border insets the box the handle moves in, so
      // its travel is a pixel short at each end on a control whose whole brief
      // is that it sits flush. Stroked half a width inside here, which paints
      // the same line and takes nothing off the travel.
      g.strokeStyle = LINE2;
      g.lineWidth = KIT.edge;
      g.beginPath();
      if (g.roundRect) g.roundRect(LANE.x + KIT.edge / 2, ly + KIT.edge / 2, LANE.w - KIT.edge, KIT.laneH - KIT.edge, KIT.radius);
      else g.rect(LANE.x + KIT.edge / 2, ly + KIT.edge / 2, LANE.w - KIT.edge, KIT.laneH - KIT.edge);
      g.stroke();

      // 🔴 THE RAY'S FEEDBACK IS THE SITE'S OWN FOCUS RING, NOT A BIGGER KNOB.
      // `shell.css`: `.sld-lane:focus-visible { outline: 2px solid var(--hi);
      // outline-offset: 1px }`. A knob that swelled past its lane was tried and
      // it read as a drawing fault — the handle is the same height as the lane
      // by design, so anything taller looks like it has come loose. The ring is
      // the answer this project already gives to "this control has the
      // pointer", it is outside the lane where nothing is competing with it,
      // and it costs the knob nothing.
      if (lit) {
        const o = KIT.ringOffset + KIT.ring / 2;
        g.strokeStyle = HI;
        g.lineWidth = KIT.ring;
        g.beginPath();
        if (g.roundRect) g.roundRect(LANE.x - o, ly - o, LANE.w + o * 2, KIT.laneH + o * 2, KIT.radius + o);
        else g.rect(LANE.x - o, ly - o, LANE.w + o * 2, KIT.laneH + o * 2);
        g.stroke();
      }

      // 🔴 NO FILLED PORTION. The shipped control has none: it is a lane and a
      // solid handle, and a bar that fills as the value rises was this tablet
      // inventing a second way to read the same number.
      g.fillStyle = HI;
      rrect(g, knobX(v, c), ly, KIT.knobW, KIT.laneH, KIT.radius);
    });

    return version;
  }

  return {
    canvas, controls, value, set, applyAll, aim, press, drag, release, holding,
    draw,
    w: W_M, h: H_M,
    get version() { return version; },
    get aimed() { return aimed; },
    get fingerprint() { return TABLET.fingerprint; },
    values: () => Object.fromEntries(values),
  };
}
