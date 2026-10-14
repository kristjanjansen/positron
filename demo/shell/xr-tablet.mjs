// demo/shell/xr-tablet.mjs: the small screen on the controller, drawn to a canvas, and its controls.
// Nothing here knows whether the session is VR or AR, so the interface cannot drift between them.
// A new control of an existing kind is one DEFAULT_CONTROLS line; a new kind is a branch in four places.
// why: lessons/kit-xr-tablet.md#header

/**
 * The one control list: canvas height, metres, row boundaries and fingerprint all derive from it.
 * `apply(value, ctx)` keeps controls free of the room and the session. HOLD_MS is held, not pressed,
 * because the trigger that drives the slider would otherwise end sessions by accident.
 * why: lessons/kit-xr-tablet.md#default-controls
 */
const HOLD_MS = 800;

// Declared above DEFAULT_CONTROLS because the table names it (a temporal dead zone otherwise).
// why: lessons/kit-xr-tablet.md#hold-ms-order

/**
 * The tablet's way out, off the shipped list and kept whole: it is the only button kind instance.
 * Append it to DEFAULT_CONTROLS to put it back. `apply` only notifies; xr-hands.mjs ends the session.
 * why: lessons/kit-xr-tablet.md#quit-control
 */
export const QUIT_CONTROL = {
  key: 'left',
  kind: 'button',
  label: 'Hold to leave',
  // `leaves` is what makes xr-hands.mjs end the session; without it the button is inert.
  // why: lessons/kit-xr-tablet.md#leaves
  leaves: true,
  hold: HOLD_MS,
  apply: (_v, ctx) => ctx?.left?.(),
};

export const DEFAULT_CONTROLS = [
  {
    key: 'grid',
    label: 'floor dots',
    unit: '%',
    min: 0,
    max: 100,
    /**
     * A fallback: `from` reads ctx.room.gridAlpha at construction. Not an import, because
     * xr-room.mjs imports this file and the cycle evaluates to nothing.
     * why: lessons/kit-xr-tablet.md#floor-dots-value
     */
    value: 53,
    from: (ctx) => (Number.isFinite(ctx?.room?.gridAlpha) ? Math.round(ctx.room.gridAlpha * 100) : null),
    apply: (v, ctx) => ctx?.room?.setGrid?.({ alpha: v / 100 }),
  },
];


/** A control's kind. Absent means the kind that was here first. */
export const kindOf = (c) => c?.kind || 'slider';
export const isButton = (c) => kindOf(c) === 'button';
const SLIDERS = DEFAULT_CONTROLS.filter((c) => !isButton(c));

// The sizes of shell.css `.sld*` and `button` copied once, here, because a canvas cannot read
// the stylesheet; colours are read live off :root. Every CSS pixel becomes K design pixels,
// one factor, so the proportions stay the stylesheet's (lane 2.75:1 against the shipped 2.8:1).
// why: lessons/kit-xr-tablet.md#kit-table
const K = 4;
const KIT = {
  laneH: 34 * K,
  knobW: 20 * K,
  radius: 4 * K,          // shared: `.sld-lane` and `button` both round by 4
  edge: 1 * K,            // shared: the lane's inset line and the button's border
  gap: 8 * K,             // head -> lane
  headGap: 4 * K,         // label -> value
  rowGap: 10 * K,         // between one control and the next
  labelPx: 9.5 * K,
  labelTrack: 0.1,        // em
  valuePx: 12 * K,
  ring: 1 * K,            // .sld-lane:focus-visible outline-width
  ringOffset: 1 * K,      // .sld-lane:focus-visible outline-offset
  btnH: 34 * K,           // button height
  btnPadX: 14 * K,        // button padding, each side
  btnPx: 13 * K,          // button font size
  btnRing: 1 * K,         // :focus-visible outline-width
  btnRingOffset: 2 * K,   // :focus-visible outline-offset
};


/**
 * Quantised fill: the room re-uploads the whole canvas texture when `version` moves,
 * so ten steps across a 0.8 s hold rather than one per frame.
 * why: lessons/kit-xr-tablet.md#hold-steps
 */
const HOLD_STEPS = 10;

// Widths are character counts times this advance, so the layout is arithmetic node can grade.
// The page asserts the drawn label fits its column, which catches a face change.
// why: lessons/kit-xr-tablet.md#mono-adv
export const MONO_ADV = 0.6;
const labelW = (s) => s.length * KIT.labelPx * (MONO_ADV + KIT.labelTrack);
const valueW = (c) => (`${c.max}`.length + (c.unit ? c.unit.length + 1 : 0)) * KIT.valuePx * MONO_ADV;
/** How wide a button has to be to hold its own label — the stylesheet's padding
 *  either side of a monospace run. Exported so the page can measure the REAL
 *  face against it, the same way it does the slider's label. */
export const btnLabelW = (c) => c.label.length * KIT.btnPx * MONO_ADV + KIT.btnPadX * 2;

// Inset in design pixels. Type did not shrink to pay for it: 40.1 px per degree, 48 design px
// of value is 2.0 degrees of cap height at 0.35 m.
// why: lessons/kit-xr-tablet.md#pad
const PAD = 48;
// The focus ring sits outside the lane, so the row must be tall enough to hold it unclipped.
// why: lessons/kit-xr-tablet.md#ring-out
const RING_OUT = KIT.ringOffset + KIT.ring;
// A button keeps the root :focus-visible offset of 2px against the lane's 1px, so its ring is larger.
// why: lessons/kit-xr-tablet.md#btn-ring-out
const BTN_RING_OUT = KIT.btnRingOffset + KIT.btnRing;
// One row height over every kind, not over the list: the hit test finds a row by one division.
// why: lessons/kit-xr-tablet.md#row-content
const HEAD_H = KIT.labelPx + KIT.headGap + KIT.valuePx;
const ROW_CONTENT = Math.max(KIT.laneH + RING_OUT * 2, KIT.btnH + BTN_RING_OUT * 2, HEAD_H);
const ROW_H = ROW_CONTENT + KIT.rowGap;

// Padding is equal to the ink, not the row box: the ring's room is taken out of the outer pad.
// Top and bottom differ because the first row is a slider and the last a button.
// why: lessons/kit-xr-tablet.md#ink-pad
const INK_TOP = (ROW_CONTENT - KIT.laneH) / 2;        // ring air above row 0's lane
const INK_BOT = (ROW_CONTENT - KIT.btnH) / 2;         // ring air below the last button
const PAD_TOP = Math.max(0, PAD - INK_TOP);
const PAD_BOT = Math.max(0, PAD - INK_BOT);

/** The canvas, in DESIGN pixels, for `n` controls. */
const pyFor = (n) => PAD_TOP + Math.max(1, n) * ROW_H - KIT.rowGap + PAD_BOT;
const DESIGN_W = 768;
const DESIGN_H = pyFor(DEFAULT_CONTROLS.length);

// The head column is as wide as its widest line (max-content), computed from sliders only:
// a button has no label column, and counting it shortened the lane from 2.75:1 to 2.16:1.
// why: lessons/kit-xr-tablet.md#head-w
const HEAD_W = Math.max(0, ...SLIDERS.map((c) => Math.max(labelW(c.label), valueW(c))));

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

/**
 * The button, in design pixels: full width in its own last row, so it never disturbs the
 * slider's lane and a ray reaching the slider never crosses it. Its rectangle is not its row.
 * why: lessons/kit-xr-tablet.md#btn
 */
const BTN = {
  x: PAD,
  get w() { return DESIGN_W - PAD * 2; },
  h: KIT.btnH,
};

// Layout numbers are design pixels; SCALE grows object and texture together, and draw,
// controlAt and valueFromU all apply it the same way.
// why: lessons/kit-xr-tablet.md#scale
const SCALE = 5 / 3;
const PX = Math.round(DESIGN_W * SCALE);
const PY = Math.round(DESIGN_H * SCALE);

// Texture size is pixels per degree: 0.20 m across 1280 px at 0.35 m is 40.1 px/deg,
// above mirror's wall panel at 29.4. A second row makes the slab taller, not denser.
// why: lessons/kit-xr-tablet.md#w-m
const W_M = 0.20;
// The height follows the pixels, so the texture cannot be stretched.
// why: lessons/kit-xr-tablet.md#h-m
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
 * A rounded rectangle path, so one corner can be filled, stroked or clipped.
 * Not `g.roundRect?.()`: on a browser without it the fill silently draws nothing.
 * why: lessons/kit-xr-tablet.md#rpath
 */
const rpath = (g, x, y, w, h, r) => {
  g.beginPath();
  if (g.roundRect) g.roundRect(x, y, w, h, r);
  else g.rect(x, y, w, h);
};
const rrect = (g, x, y, w, h, r) => { rpath(g, x, y, w, h, r); g.fill(); };

/**
 * Where the rows live, in canvas pixels. Shared by the drawing and the hit test,
 * so a press always lands on the row under the knob.
 * why: lessons/kit-xr-tablet.md#rows
 */
const rowsTop = () => PAD_TOP;
const rowsBottom = () => DESIGN_H - PAD;
const rowH = () => ROW_H;
const rowTop = (i) => rowsTop() + i * ROW_H;
/** The lane's top edge in row `i` — the control centred in the row's content. */
const laneY = (i) => rowTop(i) + (ROW_CONTENT - KIT.laneH) / 2;
/** The button's, which is the same arithmetic on the button's own height. */
const btnY = (i) => rowTop(i) + (ROW_CONTENT - KIT.btnH) / 2;

/**
 * Which control a point on the tablet is ON, or null. A slider owns its whole row;
 * a button owns only its rectangle, so its margins never fire it.
 * @param {number} u 0..1 across
 * @param {number} v 0..1 down, origin top left, as `pickQuad` hands it over
 * why: lessons/kit-xr-tablet.md#control-at
 */
export function controlAt(u, v) {
  if (!(u >= 0 && u <= 1 && v >= 0 && v <= 1)) return null;
  const py = v * DESIGN_H;          // design pixels, where the layout lives
  if (py < rowsTop() || py >= rowsBottom()) return null;
  const i = Math.floor((py - rowsTop()) / rowH());
  if (i < 0 || i >= DEFAULT_CONTROLS.length) return null;
  const control = DEFAULT_CONTROLS[i];
  if (isButton(control)) {
    const px = u * DESIGN_W, top = btnY(i);
    if (px < BTN.x || px > BTN.x + BTN.w) return null;
    if (py < top || py > top + KIT.btnH) return null;
  }
  return { i, control };
}

/**
 * A drag in the control's units, as a share of the knob's TRAVEL (slider.mjs's rule), minus half
 * a knob because the ray grabs its centre. Clamped, so sliding off cannot overshoot the range.
 * why: lessons/kit-xr-tablet.md#value-from-u
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
 * The clock a hold is measured against. Every caller takes an override, so a hold is graded
 * without waiting, in node and in the page under verify.mjs.
 * why: lessons/kit-xr-tablet.md#clock
 */
const clock = () => (typeof performance === 'object' && performance ? performance.now() : Date.now());

/**
 * What one VR run and one AR run are compared on: built only from declarations, so two runs
 * printing different fingerprints have a mode branch that should not exist. A getter, so it
 * describes the list as it is.
 * why: lessons/kit-xr-tablet.md#tablet-fingerprint
 */
export const TABLET = {
  w: W_M, h: H_M, px: PX, py: PY,
  pad: PAD, fillAlpha: FILL_ALPHA, scale: SCALE,
  designW: DESIGN_W, designH: DESIGN_H, lane: LANE, btn: BTN, kit: KIT, headW: HEAD_W,
  holdMs: HOLD_MS, holdSteps: HOLD_STEPS,
  rowH: ROW_H, rowContent: ROW_CONTENT, rowsTop: PAD_TOP, padTop: PAD_TOP, padBot: PAD_BOT,
  controls: DEFAULT_CONTROLS,
};
Object.defineProperty(TABLET, 'fingerprint', {
  enumerable: true,
  get() {
    // Registered by xr-room.mjs rather than imported, so this file loads without the room
    // and xr-pick-test.mjs grades it with no WebGL.
    // why: lessons/kit-xr-tablet.md#stand-in-registered
    const parts = TABLET.standInParts ?? '?';
    // Each kind describes itself in its own terms: a button has no range to print.
    // why: lessons/kit-xr-tablet.md#fingerprint-kinds
    const cs = DEFAULT_CONTROLS.map((c) => (isButton(c)
      ? `${c.key}, a button held ${c.hold ?? HOLD_MS} ms`
      : `${c.key} ${c.min}..${c.max}${c.unit || ''}`)).join(', ');
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

// The stand-in fact lives in the shape's own colour (STAND_IN_COL in xr-room.mjs) and one
// beacon line per session, not as a caption on the face.
// why: lessons/kit-xr-tablet.md#stand-in-caption

/**
 * The tablet, drawn. `document` is touched here and nowhere above, so everything above
 * is graded by node demo/shell/xr-pick-test.mjs with no browser.
 * why: lessons/kit-xr-tablet.md#create-xr-tablet
 */
export function createXRTablet({ ctx: hostCtx = null } = {}) {
  const controls = DEFAULT_CONTROLS;
  const canvas = document.createElement('canvas');
  canvas.width = PX; canvas.height = PY;
  const g = canvas.getContext('2d');
  // Sliders only: a button has no value to hold. `from(ctx)` asks the thing a control drives
  // where it already is (floor dots read room.gridAlpha); null keeps the typed value.
  // why: lessons/kit-xr-tablet.md#values-from
  const values = new Map(SLIDERS.map((c) => {
    const asked = typeof c.from === 'function' ? c.from(hostCtx) : null;
    return [c.key, Number.isFinite(asked) ? asked : c.value];
  }));
  let version = 0, drawn = -1;
  let aimed = null;             // { u, v, i } while the pointer is on it
  let dragging = null;          // the control index the trigger took hold of
  // { i, from, p, step, on } while a BUTTON is under a held trigger.
  let holding_ = null;

  // What the tablet says about itself, drained by whoever has a beacon: let go early, ray off,
  // and press never landed each write a different line. The tablet keeps no logger of its own.
  // why: lessons/kit-xr-tablet.md#pending-notes
  const pending = [];
  const note = (line) => { if (pending.length < 24) pending.push(line); };
  // Controls whose action has fired and not yet been collected. Objects rather
  // than keys, so the collector reads `leaves` off the control itself instead of
  // matching a string it would have to keep in step.
  const firedQ = [];

  // Colours are read live off :root; the literals are fallbacks with no document behind them.
  // why: lessons/kit-xr-tablet.md#live-colours
  const css = typeof getComputedStyle === 'function'
    ? getComputedStyle(document.documentElement) : null;
  const tok = (n, fb) => ((css?.getPropertyValue(n) || '').trim() || fb);
  const FG = tok('--fg', '#e6e6e6');           // .sld-v · button
  const DIM2 = tok('--dim2', '#6a7280');       // .sld-l
  const HI = tok('--hi', '#ffd400');           // .sld-knob · button.pos-pri ground
  const CARD = tok('--card', '#11151d');       // button:active
  const CARD2 = tok('--card2', '#151b26');     // .sld-lane ground · button ground
  const LINE2 = tok('--line2', '#2b3546');     // .sld-lane edge · button border
  const PRI_INK = tok('--bg', '#0b0e14');      // button.pos-pri's own ink
  const MONO = tok('--mono', 'ui-monospace, SFMono-Regular, Menlo, monospace');

  const value = (key) => values.get(key);
  const set = (key, v) => {
    const c = controls.find((x) => x.key === key);
    if (!c || isButton(c)) return false;
    const clamped = Math.max(c.min, Math.min(c.max, v));
    if (values.get(key) === clamped) return false;
    values.set(key, clamped);
    version++;
    try { c.apply?.(clamped, hostCtx); } catch { /* a control must not take the frame with it */ }
    return true;
  };

  /**
   * Push every slider's value through its `apply` once, at session start. Sliders only:
   * a button here would fire the way out on the first frame.
   * why: lessons/kit-xr-tablet.md#apply-all
   */
  const applyAll = () => {
    for (const c of SLIDERS) {
      try { c.apply?.(values.get(c.key), hostCtx); } catch { /* see above */ }
    }
  };

  /**
   * Where the pointer is on the tablet this frame, or null. Aim and press are separate so a
   * drag keeps its grip when the ray runs off the side.
   * why: lessons/kit-xr-tablet.md#aim
   */
  function aim(hit) {
    // The version moves only when the lit row changes, or the face re-uploads every frame.
    // why: lessons/kit-xr-tablet.md#aim-version
    const wasI = aimed ? aimed.i : null;
    if (!hit) { if (aimed) { aimed = null; version++; } return null; }
    const at = controlAt(hit.u, hit.v);
    const i = at ? at.i : -1;
    aimed = { u: hit.u, v: hit.v, i };
    if (i !== wasI) version++;
    return aimed;
  }

  /** How far through its hold a button is, quantised the way it is drawn. */
  const holdStep = (p) => Math.floor(Math.max(0, Math.min(1, p)) * HOLD_STEPS);
  const setHoldP = (p) => {
    holding_.p = p;
    const s = holdStep(p);
    if (s !== holding_.step) { holding_.step = s; version++; }
  };
  const holdSpan = (c) => Math.max(1, c.hold ?? HOLD_MS);

  /**
   * The trigger went down while the ray was somewhere. True if we took it.
   *
   * `at` is the timestamp, so a hold can be graded without waiting for one.
   */
  function press(hit, at = clock()) {
    if (!hit) return false;
    const found = controlAt(hit.u, hit.v);
    if (!found) return false;
    dragging = found.i;
    if (isButton(found.control)) {
      holding_ = { i: found.i, from: at, p: 0, step: 0, on: true };
      version++;                              // `button:active`, straight away
      note(`holding "${found.control.label}" · it wants ${holdSpan(found.control)} ms`
        + '; let go, or run the ray off it, and nothing happens');
      return true;
    }
    set(found.control.key, valueFromU(hit.u, found.control));
    note(`took hold of "${found.control.label}" at ${fmt(values.get(found.control.key), found.control)}${found.control.unit || ''}`);
    return true;
  }

  /**
   * The trigger is still down; `hit` may be null and the drag keeps its grip.
   * A slider reads the ray's `u`, a button reads the clock.
   * why: lessons/kit-xr-tablet.md#drag
   */
  function drag(hit, at = clock()) {
    if (dragging === null) return false;
    const c = controls[dragging];
    if (!c) return true;
    if (isButton(c)) return dragButton(c, hit, at);
    if (!hit) return true;
    set(c.key, valueFromU(hit.u, c));
    return true;
  }

  /**
   * Running the ray off the button cancels the hold and keeps the grip; running back on
   * restarts it from zero, so a hold cannot be completed by accident.
   * why: lessons/kit-xr-tablet.md#drag-button
   */
  function dragButton(c, hit, at) {
    const on = !!hit && controlAt(hit.u, hit.v)?.i === holding_.i;
    if (!on) {
      if (holding_.on || holding_.p > 0) { holding_.on = false; holding_.from = at; setHoldP(0); version++; }
      return true;
    }
    if (!holding_.on) { holding_.on = true; holding_.from = at; version++; }
    const p = Math.min(1, (at - holding_.from) / holdSpan(c));
    setHoldP(p);
    if (p >= 1) fire(c);
    return true;
  }

  /** The hold ran to the end. */
  function fire(c) {
    holding_ = null; dragging = null; version++;
    note(`"${c.label}" was held all the way · doing it`);
    firedQ.push(c);
    try { c.apply?.(null, hostCtx); } catch { /* a control must not take the frame with it */ }
  }

  const release = (at = clock()) => {
    const had = dragging !== null;
    if (holding_) {
      const c = controls[holding_.i];
      note(`let go of "${c.label}" at ${(holding_.p * 100).toFixed(0)}% of its ${holdSpan(c)} ms`
        + `${holding_.on ? '' : ', with the ray already off it'} · nothing happened`);
      holding_ = null; version++;
    } else if (had) {
      const c = controls[dragging];
      if (c && !isButton(c)) note(`let go of "${c.label}" at ${fmt(values.get(c.key), c)}${c.unit || ''}`);
    }
    dragging = null;
    return had;
  };
  const holding = () => dragging !== null;
  /** What the tablet has to say since the last time anyone asked. */
  const notes = () => { const out = pending.slice(); pending.length = 0; return out; };
  /** Controls whose action fired since the last time anyone asked. */
  const fired = () => { const out = firedQ.slice(); firedQ.length = 0; return out; };

  /** The button's row, filled in, so a page can assert it without a headset. */
  const hold = () => (holding_ ? { key: controls[holding_.i].key, p: holding_.p, on: holding_.on } : null);

  function draw() {
    if (drawn === version) return version;
    drawn = version;
    // `setTransform`, not `scale`: scale compounds once a frame and shrinks the picture to nothing.
    // why: lessons/kit-xr-tablet.md#set-transform
    g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    g.clearRect(0, 0, DESIGN_W, DESIGN_H);

    // The rounded corner is the shader's job (HOLD_FS in xr-room.mjs); a second one here shows a seam.
    // why: lessons/kit-xr-tablet.md#face-corner
    controls.forEach((c, i) => {
      const lit = aimed?.i === i;
      if (isButton(c)) { drawButton(c, i, lit); return; }
      drawSlider(c, i, lit);
    });

    return version;
  }

  function drawSlider(c, i, lit) {
    const top = rowTop(i);
    const v = values.get(c.key);
    g.textBaseline = 'alphabetic';
    g.textAlign = 'left';

    // The value sits UNDER the label, as shell.css `.sld-head` does, so a figure stays by its word.
    // why: lessons/kit-xr-tablet.md#head-under
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

    // The unit is part of the value string, as `.sld-v` prints it. The value keeps its colour
    // under the ray: colour says how something landed, and the ring says pointing.
    // why: lessons/kit-xr-tablet.md#value-string
    g.fillStyle = FG;
    g.font = `500 ${KIT.valuePx}px ${MONO}`;
    g.fillText(`${fmt(v, c)}${c.unit ? ' ' + c.unit : ''}`,
               PAD, headTop + KIT.labelPx + KIT.headGap + KIT.valuePx);

    // ── the lane and the knob ──────────────────────────────────────────
    const ly = laneY(i);
    g.fillStyle = CARD2;
    rrect(g, LANE.x, ly, LANE.w, KIT.laneH, KIT.radius);
    // An inset edge, not a border, as `.sld-lane`: a border would shorten the knob's travel.
    // why: lessons/kit-xr-tablet.md#inset-edge
    g.strokeStyle = LINE2;
    g.lineWidth = KIT.edge;
    rpath(g, LANE.x + KIT.edge / 2, ly + KIT.edge / 2, LANE.w - KIT.edge, KIT.laneH - KIT.edge, KIT.radius);
    g.stroke();

    // The ray's feedback is the site's focus ring (`.sld-lane:focus-visible`), not a bigger knob,
    // which read as a drawing fault.
    // why: lessons/kit-xr-tablet.md#focus-ring
    if (lit) {
      const o = KIT.ringOffset + KIT.ring / 2;
      g.strokeStyle = HI;
      g.lineWidth = KIT.ring;
      rpath(g, LANE.x - o, ly - o, LANE.w + o * 2, KIT.laneH + o * 2, KIT.radius + o);
      g.stroke();
    }

    // No filled portion: the shipped slider is a lane and a solid handle.
    // why: lessons/kit-xr-tablet.md#no-fill
    g.fillStyle = HI;
    rrect(g, knobX(v, c), ly, KIT.knobW, KIT.laneH, KIT.radius);
  }

  /**
   * The way out, drawn as the site's button. The hold fill turns it into `button.pos-pri`
   * left to right; ring and fill share --hi because the fill only exists while held.
   * why: lessons/kit-xr-tablet.md#draw-button
   */
  function drawButton(c, i, lit) {
    const x = BTN.x, y = btnY(i), w = BTN.w, h = KIT.btnH, r = KIT.radius;
    const mine = holding_ && holding_.i === i;
    const down = !!(mine && holding_.on);
    const p = mine ? holdStep(holding_.p) / HOLD_STEPS : 0;

    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `500 ${KIT.btnPx}px ${MONO}`;

    g.fillStyle = down ? CARD : CARD2;          // `button:active` is the pressed ground
    rrect(g, x, y, w, h, r);
    g.fillStyle = FG;
    g.fillText(c.label, x + w / 2, y + h / 2);

    if (p > 0) {
      g.save();
      rpath(g, x, y, w, h, r);
      g.clip();                                 // never outside the button's corner
      g.beginPath(); g.rect(x, y, w * p, h); g.clip();
      g.fillStyle = HI;
      g.fillRect(x, y, w * p, h);
      g.fillStyle = PRI_INK;
      g.fillText(c.label, x + w / 2, y + h / 2);
      g.restore();
    }

    g.strokeStyle = LINE2;
    g.lineWidth = KIT.edge;
    rpath(g, x + KIT.edge / 2, y + KIT.edge / 2, w - KIT.edge, h - KIT.edge, r);
    g.stroke();

    if (lit) {
      const o = KIT.btnRingOffset + KIT.btnRing / 2;
      g.strokeStyle = HI;
      g.lineWidth = KIT.btnRing;
      rpath(g, x - o, y - o, w + o * 2, h + o * 2, r + o);
      g.stroke();
    }

    // Restore the text state: the context is shared, and a centred baseline would move later rows.
    // why: lessons/kit-xr-tablet.md#text-state
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
  }

  return {
    canvas, controls, value, set, applyAll, aim, press, drag, release, holding,
    notes, fired, hold,
    draw,
    w: W_M, h: H_M,
    get version() { return version; },
    get aimed() { return aimed; },
    get fingerprint() { return TABLET.fingerprint; },
    values: () => Object.fromEntries(values),
  };
}
