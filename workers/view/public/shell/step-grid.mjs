// demo/shell/step-grid.mjs
// Rows of square pads over a ruler, with a head that walks them.
//
// 🔴 IT WAS ASKED FOR AS A PAD GRID AND IT IS NOT CALLED ONE, BECAUSE THAT NAME
// IS TAKEN AND THE THING THAT HAS IT IS A DIFFERENT COMPONENT. `pad.mjs`
// exports `createPadGrid`, which lays out a grid of the hardware PAD control,
// each with its own head and foot label slots, and `/circuit/` and `/evo/` both
// use it for a keypad. This is rows over STEPS with a head walking them, which
// is a sequencer surface rather than a keypad, and two components answering to
// one name in one kit is exactly the drift `/kit/` exists to catch. The request
// was *"use a standard pad grid component from tom"*; the noun that survives is
// the one that tells them apart.
//
// 🔴 IT IS A LIFT OUT OF `/tom/`, NOT A NEW DESIGN, AND THAT IS THE WHOLE
// POINT. `/tom/` is 64 rows by 16 steps and `/pack/` grew a 16 by 6 one the
// next day for a session's note events. Two hand-rolled grids in two pages is
// `positron-ui`'s own words for a component that has not been noticed yet, and
// the second copy is where the drift starts.
//
// 🔴 FIVE SEPARATE EDGES HAVE BEEN ASKED OFF THIS GRID, EACH ONE REPORTED ON
// ITS OWN, AND THOSE DECISIONS ARE THE COMPONENT. A careless lift re-opens all
// five, so they are carried here with their reports rather than as CSS:
//   1. THE PLAYHEAD CURSOR. Reported against a bordered column standing over
//      the pads: *"just hilite the pads, no extra bordered cursor"*. The
//      instrument in the photograph lights its pads; a band drawn on top is a
//      second object with its own edge and its own alignment to get wrong.
//   2. THE HIGHLIGHT BORDER, asked for as *"lose hilite borders"*. A lit pad on
//      the instrument is a lit pad: the light IS the fill.
//   3. THE PAD HOVER, asked for as *"no border hover effect on pad, just make
//      pad brigher on hover"* and *"hover on pad only changes bg lighter a
//      bit"*. It is `filter: brightness()` rather than a pair of typed colours,
//      so a pad that is off, on, silent or under the head all lift by the same
//      amount from whatever they already are. Four states, one line.
//   4. THE FOCUS RING. Reported with a crop as *"outline looks bad"*: a 2 px
//      ring standing off a 16 px pad is wider than the 2 px gutter, so it drew
//      over the two pads either side and read as a rendering fault.
//      `outline-offset: -1px` puts it INSIDE the pad, where it cannot reach a
//      neighbour at any gap.
//   5. THE PADS' OWN OUTLINE, asked for as *"rm borders on pads"*. The field IS
//      the pad, and sixteen outlines across a row read as a wire grid rather
//      than as an instrument. `border: 0` and not a transparent colour, because
//      `box-sizing: border-box` is global here and a 1 px border was taking
//      2 px out of every pad's inside.
// ⚠️ AND A SIXTH, ABOUT THE COLUMN BESIDE THE PADS: *"rm divider vert line next
// to pads, just numbers 0..64 on left"*. The label column has no border, and it
// is 22 px because a number is what is in it.
//
// 🔴 THE PADS FILL THE WIDTH AND ARE SQUARE, AND THE SIZE IS MEASURED IN
// JAVASCRIPT RATHER THAN FLEXED IN CSS. Asked for as *"make tom pads fit the
// space"* and *"the rest of w are sqare pads"*. The reason it cannot be done in
// CSS alone is the layout: the label column and the steps live in separate flex
// children, so nothing in the browser relates a pad's height to a label row's
// height. They agree because both are one token tall. A pad that flexed would
// size itself and leave the labels behind, and the misalignment would grow with
// the window.
//
// 🔴 READ ONLY IS A STATE AND NOT `disabled`. A grid nobody may edit must not
// look pressable: its pads are not buttons, they take no tab stop, they do not
// brighten under a pointer and they show no focus ring. Greying them out would
// say *this is switched off*, which is a different and false claim about a
// picture that is perfectly current. It is the same argument `/tom/` already
// makes about a row with no sample being a `div` rather than a disabled button:
// eight dimmed controls read as a page that failed.
//
// 🔴 THE CLOCK IS THE PAGE'S AND THE COMPONENT REFUSES TO RUN WITHOUT BEING
// TOLD WHOSE IT IS. Asked for as *"just add std play / stop of the grid pad, no
// prev next"*, and it overrides a decision made the day before on a
// measurement: `/pack/` has no play button because NOTHING IN A CIRCUIT SESSION
// NAMES A TEMPO, so a rate presented as the file's would be invented.
// `/tom/` names one, which is why it can play. So `rate` takes a `whose` and
// `createStepGrid` THROWS without it, the same way `createTable` throws unless
// exactly one column grows. A page that cannot say whose tempo it is running at
// does not get a play button, and `clock` is `null` rather than a control that
// lies.
// ⚠️ AND THE CLOCK IS OPT IN. A page with a deck of its own drives `at()` and
// never asks for one, which is what `/tom/` does: its playhead is a real
// transport with a score behind it and a second clock would be two heads
// arguing.
// ⚠️ IT MAKES NO SOUND. `onStep` is where a page hangs one, so what a step
// COSTS is the page's business and this file has no `AudioContext` in it.
//
// ⚠️ ONE DOM WRITE A STEP, NOT ONE PER PAD. Setting an attribute on each pad of
// a column would be 64 removals and 64 additions eight times a second; one
// attribute on the CONTAINER, with one generated `nth-child` rule per step
// behind it, is one write. `positron-ui`'s rule is that a live picture may not
// change how much room it takes, and a background colour cannot.
//
// STYLING lives in `shell.css` beside the other controls, because a pad grid is
// a control and every control in this project is declared there.

import { el } from './shell.mjs';

/** The smallest a pad is allowed to get before the strip scrolls instead.
 *  ⚠️ MEASURED RATHER THAN CHOSEN: at 390 px a strip has about 360 px to give,
 *  which is 20 px a pad over sixteen steps. The floor is what makes a narrower
 *  box scroll rather than making the pads vanish. */
export const PAD_MIN = 10;

/** The gutter between pads, and the one place it is read. It is also the row
 *  gap, which is what lets the label column and the steps share one pitch. */
export const PAD_GAP = 2;

/** How tall the ruler is.
 *  ⚠️ THIS SAID *"it carries no text"* UNTIL 2026-09-22 AND THAT IS NO LONGER
 *  TRUE. `ticks` numbers the beats on it. The height is unchanged and does not
 *  depend on whether there is text in it, which is what makes the option free:
 *  `.pos-pg-tick` already carried the font and the colours for a string it
 *  never had. */
export const RULER_H = 8;

/**
 * How long the head's light takes to arrive and how long it takes to die, in
 * milliseconds.
 *
 * 🔴 **A LAMP LIGHTS FAST AND DIES SLOWLY, AND THE FALL WAS 320 ms UNTIL
 * 2026-09-22.** Asked first as *"make it appear smooth like analog lamp lights
 * up and turns out"*, which bought the asymmetry, and then, from a screenshot
 * of the grid running at step 13 with three washed columns behind the head, as
 * *"make 2nd and 3nd fade fade faster"*.
 * 🔴 **THE TRAIL IS THE TRANSITION AND THERE IS NO TRAIL CODE TO FIND.** Only
 * ONE column is ever marked: `ensureSteps` generates a rule for the current
 * step alone, so every other lit column in that screenshot is a cell still
 * transitioning out.
 * 🔴 **AND THE NUMBER ONLY MEANS ANYTHING AS A FRACTION OF A STEP.** At 120
 * beats a minute with four steps to a beat a step is **125 ms**, so 320 ms was
 * **2.6 steps** of tail and the third column behind the head was still visibly
 * lit. 180 ms is **1.4 steps**: the column one behind is most of the way out
 * and the one two behind is gone. The same millisecond count is a long tail at
 * 120 and a strobe at 240, which is why it is written down this way.
 * ⚠️ **SHORTENING THE 90 ms WOULD HAVE BEEN THE WRONG EDIT** and is the obvious
 * one. That number is on the HEAD's rule and governs the light ARRIVING, which
 * is the half the earlier report bought. The fall is on the base rule, because
 * the element being transitioned FROM is the one whose transition runs when an
 * attribute is removed.
 * ⚠️ **AND THE BREATHE ANIMATION IS NOT PART OF THE TRAIL, WHICH WAS CHECKED.**
 * `pg-breathe` runs from the same `[data-now]` selector, and an animation ends
 * the instant its rule stops matching rather than easing out, so a cell the
 * head has left is not still breathing.
 */
export const RISE_MS = 90;
export const FALL_MS = 180;

/**
 * How wide one pad is, given the room and the number of steps.
 *
 * ⚠️ THE FLOOR IS THE WHOLE REASON THIS IS A FUNCTION. Without it a narrow box
 * gives a pad of zero or a negative width, which draws nothing at all and looks
 * like a grid that failed to build rather than one that needs scrolling.
 *
 * @param {number} boxW   the room in CSS pixels
 * @param {number} steps
 * @param {number} [gap]
 * @param {number} [min]
 * @returns {number} whole pixels, never below `min`
 */
export function cellSize(boxW, steps, gap = PAD_GAP, min = PAD_MIN) {
  const n = Math.max(1, Math.floor(Number(steps) || 0));
  const g = Math.max(0, Number(gap) || 0);
  const w = Math.max(0, Number(boxW) || 0);
  return Math.max(min, Math.floor((w - (n - 1) * g) / n));
}

/**
 * Which step a position in milliseconds is inside.
 *
 * ⚠️ CLAMPED AT BOTH ENDS. A position past the last step is the last step and
 * never step `n`, which would index past the pads and quietly stop drawing a
 * head at the one moment a reader is watching for it.
 */
export function stepAt(pos, stepMs, steps) {
  const ms = Math.max(1e-9, Number(stepMs) || 1);
  const n = Math.max(1, Math.floor(Number(steps) || 0));
  const i = Math.floor((Number(pos) || 0) / ms);
  return Math.max(0, Math.min(n - 1, i));
}

/**
 * How long one step is, at a tempo.
 *
 * @param {number} bpm
 * @param {number} [perBeat]  steps in a beat, four by default, which is a
 *   sixteenth note grid and is what both pages here use.
 */
export function stepMsFor(bpm, perBeat = 4) {
  const b = Math.max(1e-9, Number(bpm) || 0);
  const p = Math.max(1, Math.floor(Number(perBeat) || 1));
  return 60000 / (b * p);
}

/**
 * Where an arrow, `Home` or `End` lands from `r, s`.
 *
 * 🔴 IT CLAMPS AND NEVER WRAPS, which is a decision. An arrow that wrapped from
 * the last step of a row to the first of the next reads as the focus jumping,
 * and on a 64 row grid it means holding a key walks the whole instrument. A
 * grid is a surface rather than a list.
 *
 * @returns {[number, number]|null} `null` for a key this does not handle
 */
export function rovingNext(key, r, s, rows, steps) {
  const R = Math.max(1, Math.floor(Number(rows) || 0));
  const S = Math.max(1, Math.floor(Number(steps) || 0));
  const to = {
    ArrowLeft: [r, s - 1], ArrowRight: [r, s + 1],
    ArrowUp: [r - 1, s], ArrowDown: [r + 1, s],
    Home: [r, 0], End: [r, S - 1],
  }[key];
  if (!to) return null;
  return [Math.max(0, Math.min(R - 1, to[0])), Math.max(0, Math.min(S - 1, to[1]))];
}

/**
 * Whether a step is a beat and whether it is a bar.
 *
 * ⚠️ IT IS THE FIELD THAT CARRIES THIS AND NEVER INK. `/tom/` printed 1, 5, 9
 * and 13 over the pads and the numbers came off: *"no 1 5 labels above the top
 * pad row"*. Two channels carrying one fact, and the one made of words went.
 */
export function marksAt(s, beat = 4, bar = 16) {
  const i = Math.max(0, Math.floor(Number(s) || 0));
  return {
    beat: beat > 0 && i % beat === 0,
    bar: bar > 0 && i % bar === 0,
  };
}

/* ── the generated head rules ──────────────────────────────────────────────
   🔴 TWO RULES A STEP, AND THE PARKED ONE CHANGES NO COLOUR AT ALL. Reported
   against a crop as *"hilite should not kill my 1st col beat bg color"*: a
   parked head was REPLACING the background, so column 1, which is a bar and
   therefore the lightest field on the grid, lost the one thing that said so.
   ✅ `filter: brightness()` LIFTS WHATEVER IS THERE rather than replacing it,
   so a bar column parked under the head is still visibly a bar and a lit step
   under it is still visibly lit.
   ⚠️ PLAYING IS THE OTHER RULE AND IT DOES REPLACE, deliberately: a running
   head is the loudest thing on the grid and has nothing to share with.
   ⚠️ AND THE PARKED COLUMN BREATHES TOO, SHALLOWER AND SLOWER. Asked for as
   *"hilited col when paused should breate and be bit darker"*. It held
   perfectly still and read as a selection rather than as a head waiting: what
   says *this is where it will start* is that it is alive, and what says *it is
   not running* is that it is dimmer. Two channels, one per fact.
   ⚠️ ONE SHEET FOR EVERY GRID ON THE PAGE, GROWN TO THE WIDEST. Two grids with
   different step counts would otherwise be two sheets saying the same thing
   about the same class, and the second one to build would win by source order
   for every step they share. */
const SHEET_ID = 'pos-pg-steps';
let widest = 0;

function ensureSteps(steps) {
  const n = Math.max(0, Math.floor(steps));
  if (n <= widest) return;
  let sheet = document.getElementById(SHEET_ID);
  if (!sheet) {
    sheet = el('style');
    sheet.id = SHEET_ID;
    document.head.append(sheet);
  }
  const out = [];
  for (let i = widest; i < n; i++) {
    const at = `.pos-pg-pad:nth-child(${i + 1})`;
    out.push(`.pos-pg-rows[data-now="${i}"] ${at}{filter:brightness(1.45);`
      + 'animation:pg-breathe 2.2s ease-in-out infinite}');
    /**
     * 🔴 THE RUNNING HEAD LIFTS THE PAD, IT DOES NOT REPLACE IT, AND THIS LINE
     * SAID `background:var(--pg-now)` UNTIL 2026-09-22. Reported as *"its rms
     * cell orginial color and appears and disappears too abrupt ... preseve
     * original button hue a bit"*.
     * ⚠️ IT IS THE SAME REPORT `/tom/` MADE ABOUT THE PARKED HEAD, one state
     * along: *"hilite should not kill my 1st col beat bg color"*. That one was
     * fixed by moving to a filter and this one was left replacing the field,
     * so a lit pad, a silent pad and a bar pad all became the same colour the
     * moment the head reached them. **Colour here says STATE, and the head
     * overwriting three other states is the head saying all four.**
     * ✅ AN INSET SHADOW LAYERS OVER `background-color` RATHER THAN BEING IT,
     * so `[data-on]`, `[data-mute]` and `[data-bar]` all still show through
     * their own wash. A translucent mix is what *a bit* means.
     * 🔴 AND IT IS A `box-shadow` RATHER THAN A `background-image` BECAUSE IT
     * HAS TO TRANSITION. Two gradients interpolate unevenly and a background
     * colour cannot cross-fade with a filter at all; an inset shadow animates
     * as one colour and is the only one of the three that lights smoothly.
     */
    out.push(`.pos-pg-rows[data-live][data-now="${i}"] ${at}{`
      + 'filter:brightness(1.12);'
      + 'box-shadow:inset 0 0 0 999px color-mix(in oklab, var(--pg-now) 58%, transparent);'
      + `transition:box-shadow ${RISE_MS}ms ease-out,filter ${RISE_MS}ms ease-out;`
      + 'animation:pg-breathe 1.4s ease-in-out infinite}');
  }
  sheet.textContent += (sheet.textContent ? '\n' : '') + out.join('\n');
  widest = n;
}

/** For a check that wants to know the sheet grew rather than trust that it did. */
export function stepRulesBuilt() { return widest; }

/**
 * @param {object} o
 * @param {HTMLElement} [o.fixed]  where the label column goes. Omit it and no
 *   column is drawn at all, which is a real arrangement rather than a missing
 *   feature.
 * @param {HTMLElement} o.strip    where the ruler and the rows go. This is the
 *   element that scrolls, and it is what the pad size is measured from.
 * @param {number} o.rows
 * @param {number} o.steps
 * @param {(r:number)=>string} [o.label]   the text in the label column
 * @param {(r:number)=>string} [o.title]   the hover on one label
 * @param {(r:number)=>void} [o.onLabel]   a label is pressable only when this is
 *   given. A label with nothing behind it is a `div`, never a disabled button:
 *   at rest every row of `/tom/` is empty, and sixty four dimmed controls read
 *   as a page that failed rather than as a page waiting for a file.
 * @param {(r:number)=>boolean} [o.canPress]  whether THIS row's label is
 *   pressable, when only some are
 * @param {string} [o.corner]  the cell above the label column. `''` is a plain
 *   spacer, which is what a grid whose ruler carries no text wants.
 * @param {boolean} [o.readOnly]  pads cannot be pressed and do not look
 *   pressable. See the header: it is a state, not `disabled`.
 * @param {(r:number)=>boolean} [o.silent]  this row makes no sound, so a lit pad
 *   on it stays grey. Brightness says WHETHER THIS CAN MAKE A SOUND, which is
 *   the one thing a reader cannot see any other way.
 * @param {(r:number,s:number)=>string} [o.padTitle]  the hover on one pad
 * @param {(r:number,s:number,on:boolean,why:string)=>void} [o.onToggle]
 * @param {(step:number)=>void} [o.onSeek]  a press on the ruler
 * @param {{bpm:number, whose:string, perBeat?:number}} [o.rate]  give this and
 *   the grid gets a `clock` with play and stop on it. 🔴 `whose` IS REQUIRED
 *   AND THIS THROWS WITHOUT IT. See the header.
 * @param {(step:number)=>void} [o.onStep]  fired by the clock, never by `at()`
 * @param {number} [o.beat] @param {number} [o.bar]
 * @param {boolean|((s:number,m:object)=>string)} [o.ticks]  number the step
 *   axis. `true` numbers the BEATS and nothing between them, which is the only
 *   scale that fits. A function is a caller that knows better. Default nothing,
 *   which is what every grid had before 2026-09-22. See `tickText`.
 * @param {number} [o.minCell]
 * @param {string} [o.cls]
 */
export function createStepGrid({
  fixed = null, strip, rows = 1, steps = 16,
  label = (r) => String(r), title, onLabel = null, canPress = () => true,
  corner = null, readOnly = false, silent = () => false, padTitle = null,
  onToggle = null, onSeek = null,
  rate = null, onStep = null,
  beat = 4, bar = 16, ticks = false, minCell = PAD_MIN, cls = '',
} = {}) {
  if (!strip) throw new Error('step grid: no strip to put the steps in');
  if (rate && !rate.whose) {
    // 🔴 THE REFUSAL THE HEADER IS ABOUT. A grid that plays is claiming a
    // tempo, and a tempo has an owner. `/pack/` has none to claim because
    // nothing in a Circuit session names one, and the honest answer there is no
    // play button rather than a number presented as the file's.
    throw new Error('step grid: a rate needs a `whose`, because a tempo nobody '
      + 'owns is a number presented as the file\'s');
  }

  let R = Math.max(1, Math.floor(rows));
  const S = Math.max(1, Math.floor(steps));
  ensureSteps(S);

  let on = Array.from({ length: R }, () => new Uint8Array(S));
  let pads = [];        // pads[r][s]
  let labelEls = [];
  let tickEls = [];
  let nowStep = -1;
  let focusR = 0, focusS = 0;
  let lastLit = -1;

  const gridEl = el('div', `pos-pg ${cls}`.trim());
  /* 🔴 THE FALL IS PUBLISHED AS A CUSTOM PROPERTY AND THE RISE IS INTERPOLATED
     INTO THE GENERATED RULE, SO BOTH NUMBERS ARE DECLARED IN THIS FILE ONCE.
     The fall belongs on the BASE rule, which is in `shell.css`, and a `180` typed
     there against a `180` typed here is a measurement that will disagree. This
     repository has repaired exactly that twice, as `--sld-col` and `--ctl-gap`.
     ⚠️ A CUSTOM PROPERTY, NEVER THE PROPERTY. Writing the transition itself from
     here would be a rule nothing can override, including `shell.css`. */
  gridEl.style.setProperty('--pg-fall', `${FALL_MS}ms`);
  const rulerEl = el('div', 'pos-pg-ruler', '', {
    role: 'slider', tabindex: '0', 'aria-label': 'position',
    'aria-valuemin': '1', 'aria-valuemax': String(S), 'aria-valuenow': '1',
  });
  const rowsEl = el('div', 'pos-pg-rows');
  if (readOnly) {
    // 🔴 A STATIC GRID IS A TABLE AND AN EDITABLE ONE IS NOT. `role="grid"`
    // promises a keyboard a reader does not have here, and promising one is the
    // same defect as a control that cannot do the thing it names.
    rowsEl.setAttribute('role', 'table');
    rowsEl.setAttribute('aria-readonly', 'true');
  }
  gridEl.append(rulerEl, rowsEl);
  strip.append(gridEl);
  if (fixed) fixed.classList.add('pos-pg-labs');

  /**
   * What a tick says, which is NOTHING unless a caller asks for numbers.
   *
   * 🔴 **THE STEP AXIS CARRIED NO TEXT AT ALL UNTIL 2026-09-22**, asked for as
   * *"show example with both axies labels and one withouth ones"*. The row axis
   * was already optional (`fixed` plus `label`) and the step axis had no
   * numbers to switch off, so *both axes labelled* could not be demonstrated by
   * passing options that existed.
   *
   * 🔴 **AND IT NUMBERS THE BEATS RATHER THAN THE STEPS, WHICH IS A DECISION
   * AND NOT A DETAIL.** A number under every one of 64 steps is this project's
   * wrapping table heading in a new costume: the cell is `--pg-cell` wide,
   * about 26 px, and `64` at 9 px mono is most of it, so a full numbering would
   * either collide or have to be shrunk at the reader. `positron-ui` is
   * explicit that a heading which does not fit is the AUTHOR's problem, never
   * solved by wrapping it or shrinking it. The component already knows `beat`,
   * so the honest scale is the one the music has: 1, 2, 3, 4 under the
   * downbeats and nothing between them.
   * ⚠️ **THE RULER'S TWO EXISTING JOBS ARE UNTOUCHED.** It is still a press
   * target and still the track the head runs along, its height is still
   * `--pg-ruler` whether or not there is text in it, and `.pos-pg-tick` already
   * carried the font and the colours for text it never had. Numbering costs no
   * height and moves nothing.
   * ⚠️ A CALLER MAY PASS ITS OWN FUNCTION, which is how `label(r)` works one
   * axis along, and then the budget is that caller's problem to keep.
   */
  function tickText(s, m) {
    if (!ticks) return '';
    if (typeof ticks === 'function') return String(ticks(s, m) ?? '');
    return m.beat && beat > 0 ? String(Math.floor(s / beat) + 1) : '';
  }

  /* ── drawing ─────────────────────────────────────────────────────────── */

  function draw() {
    if (fixed) fixed.textContent = '';
    rowsEl.textContent = '';
    rulerEl.textContent = '';
    pads = []; labelEls = []; tickEls = [];
    focusR = Math.min(focusR, R - 1);
    focusS = Math.min(focusS, S - 1);

    if (fixed) {
      // ⚠️ THE CORNER IS RESERVED EVEN WHEN IT IS EMPTY, or the first label sits
      // a ruler's height above the first row of pads and the two columns never
      // line up again. A component's invisible reservations have to be made or
      // a caller gets them wrong, which is the `--ctl-head` lesson one control
      // along.
      const c = el('div', 'pos-pg-corner', corner || '');
      if (corner) c.classList.add('pos-pg-corner-said');
      fixed.append(c);
    }

    for (let s = 0; s < S; s++) {
      const m = marksAt(s, beat, bar);
      const t = el('div', 'pos-pg-tick', tickText(s, m));
      if (m.beat) t.dataset.beat = '1';
      if (m.bar) t.dataset.bar = '1';
      t.dataset.step = String(s);
      tickEls.push(t);
      rulerEl.append(t);
    }

    for (let r = 0; r < R; r++) {
      if (fixed) {
        const pressable = !!onLabel && canPress(r);
        const nm = el(pressable ? 'button' : 'div', 'pos-pg-lab', label(r));
        if (pressable) { nm.type = 'button'; nm.dataset.row = String(r); }
        const tip = title ? title(r) : '';
        if (tip) nm.title = tip;
        labelEls.push(nm);
        fixed.append(nm);
      }

      const rowEl = el('div', 'pos-pg-row');
      if (readOnly) rowEl.setAttribute('role', 'row');
      const mute = !!silent(r);
      const line = [];
      for (let s = 0; s < S; s++) {
        const lit = !!on[r][s];
        const c = readOnly
          ? el('div', 'pos-pg-pad', '', { role: 'cell' })
          : el('button', 'pos-pg-pad', '', {
            type: 'button',
            'aria-label': `${label(r)}, step ${s + 1}`,
            'aria-pressed': lit ? 'true' : 'false',
          });
        const m = marksAt(s, beat, bar);
        if (m.beat) c.dataset.beat = '1';
        if (m.bar) c.dataset.bar = '1';
        c.dataset.row = String(r); c.dataset.step = String(s);
        if (lit) c.dataset.on = '1';
        if (lit && mute) c.dataset.mute = '1';
        const tip = padTitle ? padTitle(r, s) : '';
        if (tip) c.title = tip;
        if (!readOnly) c.tabIndex = (r === focusR && s === focusS) ? 0 : -1;
        line.push(c);
        rowEl.append(c);
      }
      pads.push(line);
      rowsEl.append(rowEl);
    }

    nowStep = -1;
    size();
  }

  /* ── the measured pad ────────────────────────────────────────────────── */

  function size() {
    const box = strip.clientWidth || 0;
    if (!box) return false;
    const w = cellSize(box, S, PAD_GAP, minCell);
    // ⚠️ A CUSTOM PROPERTY, NEVER A WRITTEN `width`. A component that varies a
    // property per instance sets a custom property or no stylesheet can take it
    // back, which is the `video-panel.mjs` lesson this project already paid for.
    gridEl.style.setProperty('--pg-cell', `${w}px`);
    if (fixed) fixed.style.setProperty('--pg-cell', `${w}px`);
    return true;
  }

  // ⚠️ A `ResizeObserver` RATHER THAN A `resize` LISTENER. The strip changes
  // width when the window does AND when something above it grows, and only one
  // of those fires `resize`.
  const ro = new ResizeObserver(() => size());
  ro.observe(strip);

  /* ── the head ────────────────────────────────────────────────────────── */

  function at(step) {
    const s = Math.max(0, Math.min(S - 1, Math.floor(Number(step) || 0)));
    if (s === nowStep) return s;
    if (tickEls[nowStep]) delete tickEls[nowStep].dataset.now;
    nowStep = s;
    if (tickEls[s]) tickEls[s].dataset.now = '1';
    rulerEl.setAttribute('aria-valuenow', String(s + 1));
    rowsEl.dataset.now = String(s);
    return s;
  }

  function live(yes) {
    // ⚠️ DELETED, NEVER SET EMPTY. Every rule about a running head is written
    // `[data-live]`, and an attribute selector matches on PRESENCE, so a grid
    // that had played once would keep the bright column for the rest of the
    // page's life. MEASURED on `video-panel.mjs` in exactly this shape.
    if (yes) rowsEl.dataset.live = '1'; else delete rowsEl.dataset.live;
  }

  /* ── switching a pad ─────────────────────────────────────────────────── */

  function set(r, s, v, why = 'page') {
    if (!on[r] || s < 0 || s >= S) return false;
    const want = v ? 1 : 0;
    on[r][s] = want;
    const c = pads[r] && pads[r][s];
    if (c) {
      if (want) c.dataset.on = '1'; else delete c.dataset.on;
      if (want && silent(r)) c.dataset.mute = '1'; else delete c.dataset.mute;
      if (!readOnly) c.setAttribute('aria-pressed', want ? 'true' : 'false');
    }
    if (why !== 'quiet') onToggle?.(r, s, !!want, why);
    return true;
  }

  const count = () => on.reduce((n, row) => n + row.reduce((m, v) => m + v, 0), 0);

  /* ── the stroke ──────────────────────────────────────────────────────── */
  //
  // 🔴 HOLD AND DRAW, ASKED FOR AS *"when i hold pointer down enabling pads, i
  // should be able to draw otjher pads before i do poiunterup"*. A sixteen step
  // pattern is built in runs, and pressing sixteen times to make one is the kind
  // of thing an instrument is supposed to save you.
  //
  // 🔴 THE VALUE IS DECIDED BY THE FIRST PAD AND CARRIED, NOT TOGGLED PER PAD.
  // Toggling each one under the finger means dragging across a run of lit pads
  // ERASES them while dragging across dark ones lights them, so one gesture does
  // two opposite things depending on what it crosses. The first press says `on`
  // or `off` and the whole stroke means that.
  //
  // ⚠️ NO `setPointerCapture`, WHICH IS THE OBVIOUS THING AND IS WRONG HERE.
  // Capturing retargets every later pointer event to the element that captured,
  // so `pointerover` would never fire on the pads being dragged across and the
  // stroke would paint exactly one pad. The listeners sit on the CONTAINER.
  //
  // ⚠️ AND `click` IS GONE, because a press that painted on `pointerdown` and
  // again on `click` toggles twice and lands back where it started. The keyboard
  // path is unaffected: Enter has its own branch and does not come through here.
  let stroke = null;

  function paint(c, first) {
    const r = +c.dataset.row, s = +c.dataset.step;
    if (Number.isNaN(r) || Number.isNaN(s)) return;
    if (on[r][s] === (stroke ? 1 : 0)) return;      // already what the stroke wants
    /* 🔴 `draw`, NOT `stroke`, SINCE 2026-09-22. Reported against `/kit/`'s
       own readout, which said `row 0 step 5 off, by stroke`: `stroke` is this
       file's private word for the gesture and it names a mechanism rather than
       what a person did. The ask that built the gesture called it drawing,
       *"i should be able to draw otjher pads"*, so that is what it is called
       where a reader meets it. `positron-ui`'s no-jargon rule is about exactly
       this: a word from the implementation's own vocabulary appearing in
       something a visitor reads. */
    set(r, s, stroke, first ? 'press' : 'draw');
    if (first) rove(r, s, false);
  }

  if (!readOnly) {
    rowsEl.addEventListener('pointerdown', (e) => {
      const c = e.target.closest('.pos-pg-pad');
      if (!c || e.button !== 0) return;
      e.preventDefault();
      stroke = !on[+c.dataset.row][+c.dataset.step];
      paint(c, true);
    });
    rowsEl.addEventListener('pointerover', (e) => {
      if (stroke === null) return;
      const c = e.target.closest('.pos-pg-pad');
      if (c) paint(c, false);
    });
  }
  // ⚠️ ON THE WINDOW, because a stroke that ends off the grid still has to end.
  // A `pointerup` on the page background never reaches the container, and a
  // stroke left armed would paint on the next hover with nothing held down.
  const endStroke = () => { stroke = null; };
  for (const ev of ['pointerup', 'pointercancel']) addEventListener(ev, endStroke);

  if (fixed && onLabel) {
    fixed.addEventListener('click', (e) => {
      const b = e.target.closest('button.pos-pg-lab');
      if (!b) return;
      onLabel(+b.dataset.row);
    });
  }

  /**
   * 🔴 THE RULER SEEKS, WHICH IS WHAT MAKES A GRID A POSITION SURFACE. Without
   * it a transport bar with `scrub: false` takes seeking off the page rather
   * than moving it.
   * ⚠️ ON A PRESS AND NOT ON A DRAG, AND THAT IS A TRADE RATHER THAN AN
   * OVERSIGHT. The ruler sits inside a horizontal scroller, so a
   * `touch-action: none` that captured a drag would also stop a finger
   * scrolling the steps, which is the gesture a reader makes far more often. A
   * tap seeks and a swipe scrolls.
   */
  if (onSeek) {
    rulerEl.addEventListener('click', (e) => {
      const t = e.target.closest('.pos-pg-tick');
      if (t) onSeek(+t.dataset.step);
    });
  }

  /* ── the keyboard ────────────────────────────────────────────────────── */
  //
  // 🔴 THE ROVING TAB STOP IS SET WHILE THE PADS ARE MADE, NOT AFTERWARDS.
  // `table.mjs` records why there is one at all: every row at `tabIndex = 0`
  // made tabbing past a 63 row table take sixty three presses, and a grid is
  // that failure squared, 1,024 tab stops for one block on a page.
  //
  // 🔴 AN ARROW MOVES AND MUST NOT REACH THE TRANSPORT. `transport-bar.mjs`
  // binds ONE keyboard table for the whole project on `window`: space toggles
  // play and the arrows SEEK, with a `preventDefault` on them. A grid that moved
  // focus with the arrows and let the event through would seek on every press.
  function rove(r, s, focus = true) {
    const old = pads[focusR] && pads[focusR][focusS];
    if (old) old.tabIndex = -1;
    focusR = Math.max(0, Math.min(R - 1, r));
    focusS = Math.max(0, Math.min(S - 1, s));
    const next = pads[focusR] && pads[focusR][focusS];
    if (next) { next.tabIndex = 0; if (focus) next.focus(); }
    return next;
  }

  if (!readOnly) {
    rowsEl.addEventListener('keydown', (e) => {
      const c = e.target.closest('.pos-pg-pad');
      if (!c) return;
      const r = +c.dataset.row, s = +c.dataset.step;
      /**
       * 🔴 SPACE PLAYS AND ENTER TURNS A PAD ON AND OFF. Asked for as *"space
       * should play and stop. enter turns pad on and off"*.
       * ⚠️ SPACE IS PREVENTED AND NOT HANDLED. A pad is a `<button>`, so the
       * browser's own default for space is to PRESS it, which would toggle a
       * step; stopping the propagation alone left the default firing, so space
       * toggled a pad and did not play, which is the two keys the other way
       * round. `preventDefault` kills the button default and the event is left
       * to BUBBLE to the transport bar's own keyboard table, which already owns
       * space as the play key on every page here. One binding for play.
       * ⚠️ AND ENTER GETS `preventDefault` TOO, or a button fires its click as
       * well and the pad toggles twice, landing back where it started.
       */
      if (e.key === ' ') { e.preventDefault(); return; }
      if (e.key === 'Enter') {
        e.preventDefault(); e.stopPropagation();
        set(r, s, !on[r][s], 'key');
        return;
      }
      const to = rovingNext(e.key, r, s, R, S);
      if (!to) return;
      e.preventDefault();
      e.stopPropagation();
      rove(to[0], to[1]);
    });
  }

  /* ── the clock, which is the page's ──────────────────────────────────── */

  let clock = null;
  if (rate) {
    let bpm = Math.max(1, Number(rate.bpm) || 120);
    const perBeat = Math.max(1, Math.floor(rate.perBeat ?? 4));
    let raf = 0, t0 = 0, running = false, laps = 0;
    const listeners = onStep ? [onStep] : [];

    /**
     * ⚠️ THE STEP IS A FUNCTION OF THE CLOCK, NEVER AN ACCUMULATION PER FRAME,
     * so a dropped frame costs a skipped step and never a drifted phase. It is
     * the same rule `slider.mjs` states for its invisible hand.
     * ⚠️ AND A HIDDEN TAB STOPS ASKING FOR FRAMES, WHICH IS SAID OUT LOUD
     * BECAUSE IT IS A REAL LIMIT. The picture stops moving when the tab is
     * hidden and the position is recomputed from the wall clock on return, so
     * nothing drifts and nothing is missed on screen. A page that needs
     * something to HAPPEN on every step of a hidden tab must not hang it here.
     */
    const frame = () => {
      raf = 0;
      if (!running) return;
      const elapsed = performance.now() - t0;
      const ms = stepMsFor(bpm, perBeat);
      const total = Math.floor(elapsed / ms);
      laps = Math.floor(total / S);
      const s = total % S;
      if (s !== nowStep) {
        at(s);
        for (const fn of listeners) fn(s, { laps });
      }
      raf = requestAnimationFrame(frame);
    };

    clock = {
      /** The words the caller gave for whose tempo this is. */
      whose: String(rate.whose),
      bpm: () => bpm,
      setBpm(n) { bpm = Math.max(1, Number(n) || bpm); return bpm; },
      stepMs: () => stepMsFor(bpm, perBeat),
      perBeat,
      playing: () => running,
      laps: () => laps,
      play() {
        if (running) return;
        running = true;
        // 🔴 IT RESUMES WHERE THE HEAD IS, rather than from the top. A play
        // button that always restarted would make the ruler's seek useless,
        // which is a control quietly cancelling another one.
        t0 = performance.now() - Math.max(0, nowStep) * stepMsFor(bpm, perBeat);
        live(true);
        if (!raf) raf = requestAnimationFrame(frame);
      },
      /**
       * 🔴 STOP, NOT PAUSE, AND IT GOES BACK TO THE FIRST COLUMN. Asked for as
       * *"replace pause with stop. when i pess space 2 timess its plays, stops
       * (resets to first col and restarts)"*, which is a different control from
       * a pause and has to behave like one.
       */
      stop() {
        running = false;
        cancelAnimationFrame(raf); raf = 0;
        live(false);
        at(0);
      },
      toggle() { if (running) this.stop(); else this.play(); },
      onStep(fn) { listeners.push(fn); return () => {
        const i = listeners.indexOf(fn);
        if (i >= 0) listeners.splice(i, 1);
      }; },
    };
  }

  draw();
  at(0);

  return {
    el: gridEl,
    fixed,
    ruler: rulerEl,
    rowsEl,
    get pads() { return pads; },
    get labels() { return labelEls; },
    get ticks() { return tickEls; },
    steps: S,
    get rows() { return R; },
    readOnly,
    clock,

    get: (r, s) => !!(on[r] && on[r][s]),
    set,
    count,
    /** Every row as a plain array, for a page that wants to save one. */
    pattern: () => on.map((row) => [...row]),

    at,
    step: () => nowStep,
    live,
    size,
    focus: (r, s) => rove(r, s),
    focused: () => [focusR, focusS],

    /**
     * Flash one label, for a row that just did something.
     *
     * 🔴 A COLOUR, NEVER A BOX, ASKED FOR AS *"rm bg on sample preview, just
     * animate color to yellow"*. Hearing a row is not selecting it: a filled box
     * behind the number said *this one is chosen* and stayed saying it, while
     * what actually happened was a sound that has already finished. Colour can
     * say a moment; a box says a state.
     */
    lit(r) {
      if (labelEls[lastLit]) delete labelEls[lastLit].dataset.lit;
      lastLit = r;
      if (labelEls[r]) labelEls[r].dataset.lit = '1';
    },

    /**
     * Change how many rows there are, keeping every pad that still has a row.
     *
     * 🔴 THE PATTERN SURVIVES, which is the whole reason this is not a rebuild
     * from nothing. `/tom/` is 64 empty rows until a pack lands, and somebody
     * typing a pattern before opening one must not lose it. There is an assert
     * on exactly that.
     */
    setRows(n) {
      const want = Math.max(1, Math.floor(Number(n) || 1));
      const next = Array.from({ length: want }, (_, r) => {
        const row = new Uint8Array(S);
        if (on[r]) row.set(on[r].subarray(0, S));
        return row;
      });
      on = next; R = want;
      draw();
      at(Math.max(0, nowStep));
      return R;
    },
    /** Rebuild in place, for a caller whose labels or silences have changed. */
    redraw() { const was = nowStep; draw(); at(Math.max(0, was)); },

    destroy() {
      ro.disconnect();
      for (const ev of ['pointerup', 'pointercancel']) removeEventListener(ev, endStroke);
      clock?.stop?.();
    },
  };
}
