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

// ── the slab, and what a headset can read at arm's length ─────────────────
// 🔴 THE TABLET IS AS TALL AS WHAT IS ON IT — ITS HEIGHT IS DERIVED, NOT TYPED.
// The first version fixed the canvas at 768x528 and divided the space between
// however many controls there were, so ONE control got a 438 px row: a label at
// the top, a slider at the bottom and a hand's breadth of nothing in between.
// Empty space on a readout is not neutral, it reads as a cell that failed to
// load — the same rule that says an odd readout is CUT and never padded. Rows
// are a FIXED height stacked from the top, the canvas is as tall as it needs to
// be, and the metres follow the pixels. Adding a second control makes the
// object taller, which is the honest thing for it to do.
const ROW_H = 190;
// The strip that says what the shape on your hand IS. Not decoration and not an
// instruction: a claim about the picture, made on the picture, because a proxy
// that pretends to be a controller is the dishonest version of this. See
// GRIP_PARTS in xr-room.mjs.
const FOOT = 46;
// The tablet's own inset, and also the slider track's — which is why
// `valueFromU` reads THIS rather than a second constant that could disagree.
const PAD = 22;
const TRACK_H = 16;
const KNOB = 13;

/** The canvas, in DESIGN pixels, for `n` controls. */
const pyFor = (n) => PAD + Math.max(1, n) * ROW_H + FOOT + PAD;
const DESIGN_W = 768;
const DESIGN_H = pyFor(DEFAULT_CONTROLS.length);

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
// 1280 px texture, so **29.4 px per degree**.
//
// MEASURED against that, at a reading distance of 0.35 m:
//
//   0.12 m across @  768 px   19.4°   39.6 px/deg   ← reported TOO SMALL
//   0.20 m across @ 1280 px   31.9°   40.1 px/deg   ← this
//
// So the object is **67% wider** and the type is very slightly FINER per degree
// than it was, not coarser — which is the whole reason the canvas grew with it.
// ⚠️ And 40 px/deg is still only an anchor: `mirror`'s own legibility has never
// been graded by a face, so matching it is a floor rather than a measurement.
// `plan-xr-hands` §5.2.
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
const rowsBottom = () => DESIGN_H - PAD - FOOT;
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
 * 🔴 THE TRACK IS INSET BY `PAD`, SO THE VALUE IS NOT `u` SCALED. Reading the
 * value straight off `u` gives a slider that can never reach either of its own
 * ends — short by exactly the margin at both — while every number on screen
 * stays plausible. Clamped rather than extrapolated, because a ray that slides
 * off the side of the tablet with the trigger down must not drive the number
 * past what the control says it can be.
 */
export function valueFromU(u, control) {
  const x0 = PAD, x1 = DESIGN_W - PAD;
  const f = Math.max(0, Math.min(1, (u * DESIGN_W - x0) / (x1 - x0)));
  const v = control.min + f * (control.max - control.min);
  return Math.round(v * 1e6) / 1e6;
}

/** The inverse, for drawing the knob where the value says it is. */
const uOfValue = (value, control) => {
  const f = (value - control.min) / ((control.max - control.min) || 1);
  return (PAD + f * (DESIGN_W - 2 * PAD)) / DESIGN_W;
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
  pad: PAD, foot: FOOT, fillAlpha: FILL_ALPHA, scale: SCALE,
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
 * 🔴 WHAT THE SHAPE ON YOUR HAND ACTUALLY IS, IN WORDS, ON THE THING ITSELF.
 *
 * `xr-room.mjs` calls this when it learns the answer — the real model landed,
 * or it did not and a stand-in is being drawn. It matters because the two are
 * NOT distinguishable by looking once the model loads: a good stand-in and a
 * real controller are both controller-shaped, and a page that draws one while
 * you believe it is drawing the other is the same offence as colouring an
 * unmeasured thing as if it had passed.
 *
 * ⚠️ A MODULE-LEVEL VERSION, because the footer belongs to every tablet and the
 * answer arrives long after any of them were built. A tablet folds this counter
 * into its own, so the canvas is re-drawn exactly once when the words change
 * and never again.
 */
let drawnAs = 'a stand-in shape, not your real controller';
let drawnAsV = 0;
export function registerDrawnAs(words) {
  if (!words || words === drawnAs) return;
  drawnAs = words; drawnAsV++;
}
export const drawnAsNow = () => drawnAs;

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
  let version = 0, drawn = -1, drawnFoot = -1;
  let aimed = null;             // { u, v, i } while the pointer is on it
  let dragging = null;          // the control index the trigger took hold of

  const css = typeof getComputedStyle === 'function'
    ? getComputedStyle(document.documentElement) : null;
  const tok = (n, fb) => ((css?.getPropertyValue(n) || '').trim() || fb);
  const FG = tok('--fg', '#e8edf5');
  const DIM = tok('--dim2', '#7a879c');
  const HI = tok('--hi', '#ffd400');
  const LINE = '#2b3546';

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
    if (drawn === version && drawnFoot === drawnAsV) return version;
    drawn = version; drawnFoot = drawnAsV;
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

      // ⚠️ THE READOUT'S OWN SHAPE, IN ITS OWN ORDER: a small dim LABEL, the
      // big NUMBER under it, the UNIT tucked after the number. It is the shape
      // a visitor already knows from every other page here, and inventing a
      // second one for the headset would mean learning the readout twice.
      g.fillStyle = DIM;
      g.font = '500 28px ui-monospace, SFMono-Regular, Menlo, monospace';
      g.fillText(c.label, PAD, top + 34);

      const num = fmt(v, c);
      g.fillStyle = lit ? HI : FG;
      g.font = '600 62px ui-monospace, SFMono-Regular, Menlo, monospace';
      g.fillText(num, PAD, top + 108);
      if (c.unit) {
        // ⚠️ MEASURED, NOT OFFSET BY A GUESS. The unit sits after whatever the
        // number happens to be, so `7` and `100` both keep it against the
        // digits — an offset typed once leaves a gap that grows and shrinks
        // with the value, which reads as the unit drifting.
        const w = g.measureText(num).width;
        g.fillStyle = DIM;
        g.font = '500 30px ui-monospace, SFMono-Regular, Menlo, monospace';
        g.fillText(c.unit, PAD + w + 10, top + 108);
      }

      // the track, under the number, the full width between the margins
      const ty = top + rh - TRACK_H - 30;
      const x0 = PAD, x1 = DESIGN_W - PAD;
      g.fillStyle = LINE;
      rrect(g, x0, ty, x1 - x0, TRACK_H, TRACK_H / 2);
      const kx = uOfValue(v, c) * DESIGN_W;
      g.fillStyle = lit ? HI : '#5b6a80';
      rrect(g, x0, ty, Math.max(TRACK_H, kx - x0), TRACK_H, TRACK_H / 2);
      // ⚠️ THE KNOB GROWS WHEN THE RAY IS ON IT, and it does not change hue.
      // Colour in this project says HOW SOMETHING LANDED; "you are pointing at
      // it" is a second meaning on that channel, which is the rule `TOUCH` in
      // xr-panel.mjs exists to hold. Size is the half that reads in a headset.
      g.fillStyle = lit ? HI : FG;
      g.beginPath();
      g.arc(kx, ty + TRACK_H / 2, lit ? KNOB * 1.35 : KNOB, 0, 6.2832);
      g.fill();
    });

    // 🔴 THE FOOTER SAYS WHAT THE SHAPE IN YOUR HAND IS. A proxy that says it
    // is a proxy is honest; one that pretends to be a controller is not, and
    // this is the only surface in the session where that claim can be read.
    g.fillStyle = DIM;
    g.font = '500 24px ui-monospace, SFMono-Regular, Menlo, monospace';
    g.fillText(drawnAs, PAD, DESIGN_H - PAD - 8);
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
