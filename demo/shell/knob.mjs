// demo/shell/knob.mjs: a rotary control that is NOT turned in a circle.
//
// 🔴 THE INTERACTION IS THE WHOLE COMPONENT, AND IT WAS RESEARCHED RATHER THAN
// GUESSED, ON INSTRUCTION: *"research the implementation (moving them via mouse
// is historycally fiddly)"*. It is fiddly, and there is a settled answer.
//
// **A KNOB IS DRAGGED VERTICALLY, NEVER ANGULARLY.** Every professional audio
// application does this and the reason is geometric rather than habitual:
// angular drag asks the cursor to follow a circular path, and near the centre a
// movement of two pixels swings the angle through most of its range. The
// control becomes unusable exactly where a hand naturally lands. A mouse is a
// linear device and cannot execute a rotation comfortably; a finger on glass is
// worse, because the finger covers the knob it is trying to aim at.
//
// 🔴 AND THE KNOWN COST OF THE RIGHT ANSWER IS DISCOVERABILITY. Vertical drag
// has no signifier: a control that LOOKS like a dial invites somebody to turn
// it, and if the first thing they try does nothing, the control reads as
// broken. That is the one real criticism in the literature and it is answered
// here with three signals rather than a tooltip nobody reads:
//   1. `cursor: ns-resize` on hover, which is the standard vertical-drag arrow.
//   2. An angular drag STILL WORKS, badly but harmlessly, because the vertical
//      component of a circular gesture is read like any other vertical motion.
//      Somebody who tries to turn it sees the value move, which is the only
//      lesson that lands.
//   3. The keyboard and the wheel both work, so nobody is trapped.
//
// ⚠️ `movementY` RATHER THAN `clientY`, WHICH IS THE OTHER HALF OF NOT BEING
// FIDDLY. A knob driven by absolute pointer position jumps the moment the
// pointer leaves the element, and cannot be dragged further than the screen is
// tall. Accumulating relative motion means the gesture is about the HAND rather
// than about where the cursor happens to be, and `setPointerCapture` keeps the
// events arriving after the pointer has left the 40 px circle.
// ⚠️ **POINTER LOCK IS THE NEXT STEP AND IS DELIBERATELY NOT TAKEN.** It is the
// only thing that survives hitting the edge of the screen, and it costs a
// hidden cursor, an escape key that now means something, and a browser
// notification. `SWEEP` below is 180 px for the whole range, so a full travel
// fits on any screen in one gesture. **If somebody measures a real edge-hit,
// this is where to add it**, and not before.

/** How far the hand travels, in pixels, to cross the whole range. */
const SWEEP = 180;
/** Shift multiplies the travel by this, so the same gesture is five times finer. */
const FINE = 0.2;
/**
 * Degrees of sweep, with the gap at the bottom where a real knob's gap is.
 *
 * 🔴 270, AND IT IS THE ONLY VALUE. Decided 2026-09-21: *"use full arcs only"*.
 * It went 270 to 150 on *"do not full round rotary knob path, just a bit"* and
 * back, and the short arc taught the component two things worth keeping: the
 * viewBox has to be cropped to what is actually drawn, and a long needle reads
 * as escaping a short track. Both fixes stay and both are right at 270 too.
 * ⚠️ **THE PER KNOB OPTION IS GONE WITH IT.** `sweep` existed so five could be
 * put side by side and compared, which is what an undecidable number needs; a
 * decided one needs a constant. A page passing its own sweep is a page whose
 * knobs do not match the next page's, which is the drift `/kit/` exists to
 * catch.
 */
// The invisible hand's button, frame loop and hand-over come from
// `hand-drive.mjs`, shared with `slider.mjs`. What a movement IS lives in
// `hand.mjs` and is graded with no browser by `node demo/shell/hand-test.mjs`.
import { createHandDrive } from './hand-drive.mjs';

const ARC = 270;

/**
 * 🔴 THE WORD "HAND" MEANS TWO DIFFERENT THINGS ON THIS COMPONENT AND BOTH ARE
 * OLDER THAN THE OTHER FILE'S. `set(v, { from: 'hand' })` has meant A PERSON
 * since this knob was written, and `handMoves()` counts those. The INVISIBLE
 * hand, added 2026-09-22, is the opposite claim: nobody touched it. So its
 * moves arrive as `from: 'self'` with their own counter, and a page asking
 * *"did a person move this"* keeps the answer it always had.
 * ⚠️ THE OPTION IS STILL CALLED `hand`, because that is what it is called on
 * `slider.mjs`, on the button and by the person who asked for it. Renaming it
 * here would make the kit disagree with itself to fix a word.
 */
const SELF = 'self';

/**
 * A value held inside the ends and, when there is a step, rounded onto one.
 *
 * 🔴 PURE, EXPORTED AND SEPARATE, SO IT CAN BE GRADED WITH NO BROWSER. The rest
 * of this file needs a `document`, and `instrument.mjs` already records why
 * that matters: a rule only a browser can check is a rule that gets checked
 * once. `node demo/shell/knob-test.mjs` runs this in a few milliseconds, and
 * the drag arithmetic that snapping breaks is graded there rather than by
 * dragging a dial and looking.
 *
 * ⚠️ THE SIX PLACES ARE `slider.mjs`'S AND THE REASON IS FLOATING POINT.
 * `Math.round((3 - 1) / 0.1) * 0.1 + 1` is 3.0000000000000004, which prints
 * with a decimal the caller never asked for and compares unequal to the step
 * above it.
 *
 * @param {number} n
 * @param {object} o
 * @param {number} o.min @param {number} o.max
 * @param {number} [o.step]  0 or omitted for a continuous travel
 */
export function snapTo(n, { min, max, step = 0 } = {}) {
  const x = Math.min(max, Math.max(min, Number(n)));
  if (!step) return x;
  return Math.min(max, Math.max(min,
    Number((Math.round((x - min) / step) * step + min).toFixed(6))));
}

/**
 * How many decimal places a knob prints its value at, from its own resolution.
 *
 * 🔴 IT IS DECIDED ONCE AND NEVER PER FRAME, WHICH IS THE WHOLE POINT. See the
 * note on `dp` inside `createKnob`: a string that gains and loses a decimal
 * point sixty times a second is what *"make it stop wiggling"* was about.
 *
 * @param {object} o
 * @param {number} o.min @param {number} o.max
 * @param {number} [o.step]
 * @param {number} [o.sweep]  the travel in pixels. Only a test passes this.
 */
export function knobPlaces({ min, max, step = 0, sweep = SWEEP } = {}) {
  const cap = (n) => Math.max(0, Math.min(4, n));
  if (step) return cap(String(step).split('.')[1]?.length ?? 0);
  return cap(Math.round(-Math.log10((max - min) / sweep)));
}

/**
 * One knob.
 *
 * @param {object} o
 * @param {string} o.label     under the dial, uppercased by CSS. Keep it short.
 * @param {string} [o.sub]     a dimmer second line: `CC 80`.
 * @param {number} [o.min]     default 0, because these are MIDI controllers
 * @param {number} [o.max]     default 127
 * @param {number} [o.value]   where it starts, default the midpoint
 * @param {number} [o.home]    where a double press returns it to, default `value`
 * @param {string} [o.unit]    printed after the number
 * @param {string} [o.title]   hover text
 * @param {number} [o.step]    a knob that lands only on whole steps.
 *
 *   🔴 **THE ROUNDING BELONGS HERE AND NOT IN THE PAGE, WHICH IS THE WHOLE
 *   REASON THIS IS AN OPTION.** Asked for 2026-09-22 as *"move voices to knobs,
 *   bottom right, stepped knob"*, for a voice count that can only be a whole
 *   number. A page that rounds the value on its way out leaves the NEEDLE
 *   somewhere the number is not, so the dial and the readout disagree about a
 *   control the reader is looking straight at.
 *   ⚠️ **THE NAME AND THE ARITHMETIC ARE `slider.mjs`'S**, deliberately, rather
 *   than a second vocabulary for one idea: the option is `step`, the snap is
 *   `Math.round((x - min) / step) * step + min` rounded to six places, and the
 *   invisible hand's step count is `span / step` exactly as it is there.
 *   🔴 **AND THE TRAP IS THE DRAG, WHICH SNAPPING KILLS IF IT IS WRITTEN THE
 *   OBVIOUS WAY.** The pointer moves the value by `span / SWEEP` a pixel, which
 *   on a one-to-eight knob is 0.039, so every single pixel of hand movement
 *   rounds straight back to where it started. Zeroing the accumulator after
 *   each move, which is what the continuous knob does, then throws that pixel
 *   away and **the knob never moves at all, at any speed**. So the accumulator
 *   is spent by what the value ACTUALLY moved and keeps whatever the snap ate.
 *   ⚠️ **AND THE WHEEL AND THE ARROW KEYS BOTH HAVE A FLOOR OF ONE STEP** for
 *   the same reason. `span / SWEEP * 6` is a sixth of a voice, and shift makes
 *   it a thirtieth, so both controls would have been inert on exactly the knob
 *   this was built for.
 * @param {number} [o.stroke]  how thick the ring and the needle are, in the
 *   dial's own 100 unit space. Default 4.
 *   🔴 BOTH ARE HERE TO BE COMPARED, NOT TO BE VARIED PER PAGE. Asked
 *   2026-09-20: *"i am not sure. make optopon for thinness, shom multiple"*,
 *   after the thickness went 7 to 10 to 4 in ten minutes and the sweep went 270
 *   to 150. Neither is decidable from a description and both are obvious side
 *   by side.
 *   ⚠️ **WHEN ONE IS CHOSEN, THE DEFAULT CHANGES AND THE CALLERS DO NOT.** A
 *   page passing its own thickness is a page whose knobs do not match the
 *   next page's, which is the drift `/kit/` exists to catch. These exist so a
 *   specimen can put five of them in a row.
 * @param {(v:number, from:string)=>void} [o.onInput]
 * @param {(v:number, from:string)=>void} [o.onChange]
 * @returns {{el:HTMLElement, set:Function, value:()=>number, source:()=>string,
 *            hardwareMoves:()=>number, handMoves:()=>number}}
 */
export function createKnob({
  label, sub = '', min = 0, max = 127, value, home, unit = '', title = '',
  onInput = () => {}, onChange = () => {}, disabled = false,
  stroke, ends, step, hand: wantHand = false,
} = {}) {
  if (!label) throw new Error('a knob needs a label: it is the only thing naming what it moves');
  const span = max - min;
  if (!(span > 0)) throw new Error(`a knob needs max above min, got ${min}..${max}`);
  /**
   * The step, or 0 for the continuous travel every knob had before today.
   *
   * ⚠️ `0` RATHER THAN `undefined` INSIDE, so every arithmetic below reads
   * `Math.max(x, stp)` and `stp || fallback` with no branch of its own, and the
   * continuous case comes out byte for byte what it was. A step of 0 is the
   * only value that makes all three of those expressions the identity.
   * 🔴 AND IT IS REFUSED RATHER THAN CLAMPED. A step wider than the travel is a
   * knob with two positions, which is a switch wearing a dial, and a step of
   * zero or less is a control that can never move. Both are the shape this
   * project calls a lie, and both are the caller's mistake, so they are said in
   * front of the author at build time.
   */
  const stp = step === undefined ? 0 : Number(step);
  if (step !== undefined && !(stp > 0 && stp <= span)) {
    throw new Error(`a knob's step is above 0 and no wider than its travel, got ${step} on ${min}..${max}`);
  }
  /**
   * 🔴 HOW MANY DECIMALS THE NUMBER IS PRINTED AT, DECIDED ONCE AND NEVER PER
   * FRAME. REPORTED 2026-09-22 watching the invisible hand run: *"invisible m4
   * knob: show value without floating or make it stop wiggling"*.
   * `Math.round(v * 100) / 100` yields `40`, `40.4` and `40.37` on three
   * consecutive frames, so the STRING gains and loses a decimal point sixty
   * times a second. It only became visible now, because until the hand landed
   * nothing moved a knob on its own.
   * ⚠️ **THE BASIS IS THE CONTROL'S OWN RESOLUTION**, which is the step when
   * there is one and `span / SWEEP` when there is not, because that is the
   * quantity the drag and the arrow keys already move by. A stepped knob prints
   * its step's own decimals, the way `slider.mjs` infers them. A continuous one
   * prints to the ORDER OF MAGNITUDE of its smallest move: 0 places on a 0 to
   * 127 knob whose least move is 0.71, and 2 on a -1 to 1 attenuverter whose
   * least move is 0.011.
   * ⚠️ **A BLANKET "NO DECIMALS" WOULD HAVE DESTROYED THE ATTENUVERTERS**, which
   * is why this is derived rather than chosen: three of them on `/muta/` run
   * -1 to 1 and would have shown `-1`, `0` and `1` and nothing else.
   */
  const dp = knobPlaces({ min, max, step: stp });

  const mk = (tag, cls, text) => {
    const n = document.createElementNS(
      tag === 'svg' || tag === 'circle' || tag === 'path'
        ? 'http://www.w3.org/2000/svg' : 'http://www.w3.org/1999/xhtml', tag);
    if (cls) n.setAttribute('class', cls);
    if (text != null) n.textContent = text;
    return n;
  };

  let v = clamp(value === undefined ? min + span / 2 : value);
  const rest = home === undefined ? v : clamp(home);
  let from = '', hw = 0, hand = 0, selfMoves = 0;

  const root = mk('div', 'pos-knob');
  if (title) root.setAttribute('title', title);
  // ⚠️ A CUSTOM PROPERTY, NOT A STROKE WRITTEN ONTO THE PATHS. A component that
  // sets the property itself writes a rule nothing can override, including its
  // own stylesheet, which is the defect `video-panel.mjs` shipped with its
  // `aspect` option. Set the variable and let the stylesheet read it.
  if (stroke !== undefined) root.style.setProperty('--knob-stroke', String(stroke));
  // ⚠️ KEPT AS A LOCAL NAME even though it is now always `ARC`: the viewBox
  // crop and the needle angle both read it, and a constant inlined in three
  // places is three places to miss when it changes.
  const SWEEP_DEG = ARC;
  let off = !!disabled;

  /**
   * ⚠️ SVG RATHER THAN A `conic-gradient`, and the reason is the gap. A real
   * knob's travel stops short of the bottom, which is how an eye reads where
   * zero is; a conic gradient can be made to do that only by layering a second
   * shape over it, and then the two have to agree about a radius.
   * `stroke-dasharray` on an arc path is one number.
   */
  const svg = mk('svg', 'pos-knob-dial');
  /**
   * 🔴 THE VIEWBOX IS CROPPED TO WHAT IS ACTUALLY DRAWN, AND IT IS DERIVED FROM
   * THE SWEEP. Photographed 2026-09-20: *"knobs are half seen"*. It was a
   * square `0 0 100 100` left over from the 270 degree ring, which filled a
   * square. A 150 degree arc occupies the TOP of that square and nothing else,
   * so the element reserved a square and drew in a third of it, and the knob
   * read as cropped with empty space under it.
   * ⚠️ **COMPUTED, NOT TYPED.** `sweep` is an option, so a hand-measured box
   * would be correct for one value and wrong for every other. The arc's extent
   * is `r sin(half)` across and `r` to `r cos(half)` down, plus room for the
   * stroke and its round cap.
   * ⚠️ AND THE ELEMENT'S HEIGHT FOLLOWS FROM ITS WIDTH through the viewBox
   * ratio, which is why `shell.css` gives it `height: auto`. Setting both would
   * be two opinions about one shape.
   */
  const half = (SWEEP_DEG / 2) * Math.PI / 180;
  const R = 38, PAD = 9;
  const xOut = SWEEP_DEG >= 180 ? R : R * Math.sin(half);
  const yTop = 50 - R;
  const yBot = SWEEP_DEG >= 180 ? 50 + R : 50 - R * Math.cos(half);
  const vb = [
    (50 - xOut - PAD).toFixed(2), (yTop - PAD).toFixed(2),
    (2 * (xOut + PAD)).toFixed(2), (yBot - yTop + 2 * PAD).toFixed(2),
  ].join(' ');
  svg.setAttribute('viewBox', vb);
  /**
   * 🔴 WHERE THE RING'S LOWER EDGE IS, AS A FRACTION OF THE DRAWING, BECAUSE
   * THE HAND BUTTON SITS ON IT. Asked for 2026-09-22: *"button in the h center,
   * vertically centered to the lower edge ot the \"ring\""*.
   * ⚠️ **DERIVED, NEVER TYPED.** `sweep` is an option and the viewBox is
   * already computed from it, so a pixel measured off one knob would be wrong
   * on every other. At the 270 degree default the box spans y 3 to 97 and the
   * ring's lower edge is y 88, which is 0.904 of the height; a 150 degree arc
   * puts it somewhere else entirely and this arithmetic follows it.
   * ⚠️ AND THE SHAPE GOES WITH IT. The element's height follows its width
   * through the viewBox ratio, so the stylesheet needs both numbers to place
   * anything against the drawing rather than against the column.
   */
  const vbW = 2 * (xOut + PAD), vbH = yBot - yTop + 2 * PAD;
  root.style.setProperty('--knob-dial-r', (vbH / vbW).toFixed(4));
  root.style.setProperty('--knob-ring-f', ((yBot - (yTop - PAD)) / vbH).toFixed(4));
  const track = mk('path', 'pos-knob-track');
  const arc = mk('path', 'pos-knob-arc');
  const pointer = mk('path', 'pos-knob-ptr');
  const d = arcPath(50, 50, 38, -SWEEP_DEG / 2, SWEEP_DEG / 2);
  track.setAttribute('d', d);
  arc.setAttribute('d', d);
  svg.append(track, arc, pointer);

  // 🔴 THE DIAL IS THE FOCUSABLE THING. A wrapper taking focus rings the label
  // and the number too, which reads as the column being selected rather than as
  // a control being steerable.
  svg.setAttribute('tabindex', '0');
  svg.setAttribute('role', 'slider');
  svg.setAttribute('aria-label', label);
  svg.setAttribute('aria-valuemin', String(min));
  svg.setAttribute('aria-valuemax', String(max));

  const num = mk('div', 'pos-knob-v');
  const lab = mk('div', 'pos-knob-lab', label);
  root.append(num, svg, lab);
  /**
   * 🔴 THE TWO ENDS OF THE TRAVEL, PRINTED EITHER SIDE OF THE DIAL. Asked for
   * 2026-09-22 on `/plai/` as *"support starte end labels -1 1"*, and the case
   * that needs it is the bipolar attenuverter: a knob running -1 to 1 with a
   * centre home is indistinguishable from one running 0 to 127 until a finger
   * moves it, and the real module prints `-` and `+` on exactly those three.
   * ⚠️ **IT IS `ends: true` FOR THE NUMBERS AND A PAIR FOR ANYTHING ELSE.**
   * `true` prints `min` and `max`, which is the honest default because those
   * are the numbers the control really carries. A caller passing `['-', '+']`
   * gets the panel's own marks instead, which is what Mutable print.
   * ⚠️ **AND IT SITS IN THE DIAL'S OWN GAP RATHER THAN ON A NEW ROW.** A knob's
   * travel stops short of the bottom, which is the whole reason the arc is an
   * SVG and not a conic gradient, and that gap is where a panel prints these.
   * A new row would change `--ctl-foot` for every knob on the site, and
   * `positron-ui` records `/twelve/` being corrected twelve times in one
   * evening over exactly that kind of arithmetic.
   */
  if (ends) {
    const [lo, hi] = ends === true
      ? [String(min), String(max)]
      : [String(ends[0] ?? min), String(ends[1] ?? max)];
    const row = mk('div', 'pos-knob-ends');
    row.append(mk('span', 'pos-knob-end', lo), mk('span', 'pos-knob-end', hi));
    root.insertBefore(row, lab);
  }
  if (sub) root.append(mk('div', 'pos-knob-sub', sub));

  /** The ends only, with no snap, so a drag can keep what the snap ate. */
  function hold(n) { return Math.min(max, Math.max(min, Number(n))); }

  /**
   * Inside the ends AND on a whole step, which is what every caller of this
   * gets. `hold` is the half without the snap and exists for the drag alone.
   */
  function clamp(n) { return snapTo(n, { min, max, step: stp }); }

  /**
   * What the number reads, at a fixed number of places.
   *
   * ⚠️ `-0.00` IS WRITTEN AS `0.00`. `(-0.0004).toFixed(2)` is `"-0.00"`, so an
   * attenuverter sitting on nothing flickers a minus sign in and out while a
   * hand runs it, which is the same complaint the decimal count came from one
   * character along.
   */
  function show(n) {
    let t = n.toFixed(dp);
    if (t === `-${(0).toFixed(dp)}`) t = (0).toFixed(dp);
    return unit ? `${t} ${unit}` : t;
  }

  /**
   * 🔴 THE NUMBER'S BOX RESERVES THE WIDEST THING THIS KNOB CAN EVER PRINT, and
   * without it fixing the decimals is only half the repair. `.pos-knob` is
   * `align-items: center` and `.pos-knob-v` had a fixed HEIGHT and no width, so
   * `9` becoming `10` still slid the whole string sideways under the hand
   * moving it. `slider.mjs` reserves its readout the same way and for the same
   * reason, and `positron-ui` states the rule: nothing that redraws every frame
   * may change how much room it takes.
   * ⚠️ **A CUSTOM PROPERTY, NEVER THE PROPERTY.** Writing `num.style.minWidth`
   * from here would be a rule nothing can override, including this component's
   * own stylesheet, which is the defect `video-panel.mjs` shipped with `aspect`.
   * ⚠️ **AND `ch` IS EXACT HERE** because the face is monospaced and the cell is
   * `tabular-nums`, so a digit, a minus and a point are all one advance. The
   * two ends are the widest strings a value between them can make.
   */
  root.style.setProperty('--knob-num-w',
    `${Math.max(...[min, max].map((n) => show(n).length))}ch`);

  function paint() {
    const frac = (v - min) / span;
    const len = arc.getTotalLength ? arc.getTotalLength() : 0;
    if (len) {
      arc.style.strokeDasharray = String(len);
      arc.style.strokeDashoffset = String(len * (1 - frac));
    }
    const a = (-SWEEP_DEG / 2 + frac * SWEEP_DEG) * Math.PI / 180;
    /**
     * 🔴 A SHORT TICK JUST INSIDE THE RING, NOT A LONG HAND ACROSS IT.
     * Photographed 2026-09-20 with one word: *"what"*. It ran r=16 to r=31
     * against a ring at r=38, which was geometrically inside and did not read
     * that way: a line that long, ending a few units short of a 150 degree arc,
     * looks like a hand escaping past the end of the track rather than pointing
     * along it. The 270 degree ring hid this, because the track was always
     * behind the hand wherever it pointed.
     * ⚠️ THE GAP IS WHAT MAKES IT READ. r=24 to r=32 against a ring whose
     * stroke starts at about 36 leaves clear air between tick and track.
     */
    const cx = 50 + Math.sin(a) * 24, cy = 50 - Math.cos(a) * 24;
    const ex = 50 + Math.sin(a) * 32, ey = 50 - Math.cos(a) * 32;
    pointer.setAttribute('d', `M ${cx.toFixed(2)} ${cy.toFixed(2)} L ${ex.toFixed(2)} ${ey.toFixed(2)}`);
    // ⚠️ `tabular-nums` IS ON THE CLASS, and the unit is hidden when there is no
    // number, because a `%` with nothing in front of it reads as a value that
    // went missing. Same rule as a readout cell.
    // 🔴 AND THE PLACES ARE FIXED, so the string cannot gain and lose a decimal
    // point sixty times a second under a hand. See `dp` and `show` above.
    num.textContent = show(v);
    svg.setAttribute('aria-valuenow', String(Math.round(v)));
    if (from) root.setAttribute('data-from', from); else root.removeAttribute('data-from');
  }

  /**
   * @param {number} next
   * @param {object} [o]
   * @param {string} [o.from]   `'hardware'` or `'hand'`
   * @param {boolean} [o.quiet] do not call back, for echoing a value that came
   *                            from the thing that would be called
   */
  function set(next, { from: src = 'hand', quiet = false } = {}) {
    const was = v;
    v = clamp(Number(next));
    from = src;
    if (src === 'hardware') hw++; else if (src === 'hand') hand++;
    paint();
    if (!quiet && v !== was) { onInput(v, src); onChange(v, src); }
    return v;
  }

  // ── the hand ───────────────────────────────────────────────────────────
  //
  // ⚠️ `handApi` IS DECLARED HERE AND FILLED IN FURTHER DOWN, rather than
  // declared where it is built. A `let` shadows its whole block from the top,
  // and `positron-ui` records seven asserts going silent on exactly that: the
  // handlers below name it, and they must not be reading a variable in its dead
  // zone if one of them ever runs during construction.
  let handApi = null;
  let dragging = false, acc = 0;

  svg.addEventListener('pointerdown', (e) => {
    if (off) return;
    // ⚠️ YIELD, NOT OFF. A motorised fader you can grab is the thing the phrase
    // names, and nothing pressed the button. `hand-drive.mjs` picks the
    // movement up again from wherever the dial was left.
    handApi?.yield();
    dragging = true;
    acc = 0;
    svg.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  svg.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    // 🔴 UP IS MORE. `movementY` is positive DOWNWARDS, so it is negated here,
    // and getting this backwards is the single most irritating possible bug in
    // a knob because it feels wrong without looking wrong.
    const dy = -(e.movementY ?? 0);
    acc += dy * (e.shiftKey ? FINE : 1);
    const per = span / SWEEP;
    if (Math.abs(acc) < 0.001) return;
    /**
     * 🔴 THE ACCUMULATOR IS SPENT BY WHAT THE VALUE ACTUALLY MOVED, AND KEEPS
     * WHAT THE SNAP ATE. This line read `set(...); acc = 0` until a `step`
     * existed, and on a stepped knob that is a control that can never move: one
     * pixel of hand is a fraction of a step, `set` rounds it straight back, and
     * zeroing throws the pixel away, so the value does not change at any speed.
     * ⚠️ **AND IT IS BYTE FOR BYTE THE OLD BEHAVIOUR WITH NO STEP.** `hold`
     * applies the ends and `set` applies the ends and the snap, so on a
     * continuous knob `want` and `got` are the same number and `acc` lands on
     * exactly 0, including at both ends of the travel.
     */
    const want = hold(v + acc * per);
    const got = set(want, { from: 'hand' });
    acc = (want - got) / per;
  });

  const stop = (e) => {
    if (!dragging) return;
    dragging = false;
    try { svg.releasePointerCapture(e.pointerId); } catch { /* already gone */ }
    // A lift resumes it at once. Only a `set()` with no lift has to wait out
    // `HAND_YIELD_MS`, which is the arrow-key case below.
    handApi?.resume();
  };
  svg.addEventListener('pointerup', stop);
  svg.addEventListener('pointercancel', stop);

  // ⚠️ A DOUBLE PRESS GOES HOME, which is what every plugin does and what a
  // hand reaches for after overshooting. It is `dblclick` rather than a
  // hand-rolled double-tap timer, because the platform already knows what a
  // double press is on each input device.
  svg.addEventListener('dblclick', (e) => { e.preventDefault(); set(rest, { from: 'hand' }); });

  // ⚠️ `passive: false` OR `preventDefault` DOES NOTHING AND THE PAGE SCROLLS
  // UNDER THE KNOB. Chrome makes wheel listeners passive by default.
  svg.addEventListener('wheel', (e) => {
    if (off) return;
    e.preventDefault();
    // ⚠️ A FLOOR OF ONE STEP. Six notches of `span / SWEEP` is a sixth of a
    // voice on a one-to-eight knob and a thirtieth of one with shift held, so
    // without this the wheel would be inert on the control `step` was built
    // for. `Math.max(x, 0)` is the identity, so a continuous knob is unchanged.
    const amount = Math.max((span / SWEEP) * (e.shiftKey ? FINE : 1) * 6, stp);
    handApi?.yield();
    set(v - Math.sign(e.deltaY) * amount, { from: 'hand' });
  }, { passive: false });

  svg.addEventListener('keydown', (e) => {
    if (off) return;
    const fine = e.shiftKey ? FINE : 1;
    // ⚠️ ONE STEP IS THE WHOLE UNIT ON A STEPPED KNOB, and shift does not make
    // it finer, because there is nothing finer than one voice to go to.
    const one = stp || Math.max(span / 127, span / SWEEP) * fine;
    const go = { ArrowUp: one, ArrowRight: one, ArrowDown: -one, ArrowLeft: -one,
                 PageUp: one * 10, PageDown: -one * 10,
                 Home: min - v, End: max - v }[e.key];
    if (go === undefined) return;
    e.preventDefault();
    // ⚠️ NO LIFT ON A KEY PRESS, so this one waits out `HAND_YIELD_MS` rather
    // than resuming at once. Shorter and the arrow keys look broken, because
    // the value is dragged away between one press and the next.
    handApi?.yield();
    set(v + go, { from: 'hand' });
  });

  // ── the invisible hand ────────────────────────────────────────────────────
  //
  // 🔴 EVERYTHING BUT THE THREE THINGS ONLY A KNOB KNOWS COMES FROM
  // `hand-drive.mjs`. Those three are: how many steps this travel has, how a
  // share of the travel becomes a value, and the sentence it says when it is
  // barred from a control row.
  if (wantHand) {
    const opt = (wantHand && typeof wantHand === 'object') ? wantHand : {};
    /**
     * ⚠️ A KNOB'S STEP IS ITS DRAG RESOLUTION, NOT ITS RANGE. Both the pointer
     * and the arrow keys move by `span / SWEEP`, so the travel has `SWEEP`
     * distinguishable positions whatever `min` and `max` are, and a 0..1 knob
     * is exactly as fine as a 0..127 one. Counting `span` instead would have
     * called a 0..1 knob a one-step control and refused it a hand.
     * 🔴 **UNLESS IT REALLY HAS STEPS, IN WHICH CASE THEY ARE THE ANSWER.** A
     * knob with `step: 1` over one to eight has EIGHT places to be and no
     * others, and `hand-drive.mjs` refuses a hand under about thirty steps
     * because the wander at each end would be less than one step. Reporting
     * `SWEEP` here would have talked it out of a refusal that is correct. Same
     * arithmetic as `slider.mjs`'s own step count.
     */
    const steps = stp ? Math.max(1, Math.round(span / stp)) : SWEEP;
    const handBtn = mk('button', 'pos-knob-hand');
    handBtn.setAttribute('type', 'button');
    // ⚠️ THE BUTTON IS NOT THE DIAL AND MUST NOT BEHAVE LIKE IT. A press on it
    // would otherwise start a drag on the dial underneath and the knob would
    // jump by whatever the pointer did next.
    for (const ev of ['pointerdown', 'pointerup', 'wheel', 'dblclick'])
      handBtn.addEventListener(ev, (e) => e.stopPropagation());
    root.append(handBtn);
    handApi = createHandDrive({
      btn: handBtn,
      row: root,
      at: () => (v - min) / span,
      /**
       * ⚠️ IT DOES NOT CALL `set()`, WHICH IS WHAT KEEPS `set()` MEANING
       * "SOMEBODY ELSE MOVED THIS". It shares `clamp()` and `paint()` and emits
       * `onInput` exactly as a drag does, with `from: 'self'` rather than
       * `'hand'`, because the whole point of this control is that no hand was
       * anywhere near it.
       */
      move: (share) => {
        const nv = clamp(min + share * span);
        if (nv === v) return;
        v = nv; from = SELF; selfMoves++;
        paint();
        onInput(v, SELF);
      },
      rest: () => onChange(v, SELF),
      steps,
      preset: opt.preset,
      onHand: opt.onHand,
      barredSays: 'a knob in a control row may not have an invisible hand: the suite presses '
        + 'every button in that row on every run, and this one would start sending',
    });
  }

  /** See the note on `pad.mjs`'s `enable`: a disabled control costs the checks
   *  behind it, and is still the right answer when the control cannot do its job. */
  function enable(yes, why = '') {
    off = !yes;
    if (off) { root.setAttribute('data-off', '1'); svg.removeAttribute('tabindex'); }
    else { root.removeAttribute('data-off'); svg.setAttribute('tabindex', '0'); }
    if (why) root.setAttribute('title', why);
    // A control that cannot be dragged cannot be driven by a hand either, and a
    // hand still running on a disabled knob is the page arguing with its own
    // greyed-out control. Same rule `slider.mjs` states for its own disable.
    handApi?.setEnabled(!off);
    if (off) handApi?.stop('disabled');
    return !off;
  }
  enable(!off, title);

  paint();
  // The arc length is only knowable once the path is in a document, so the
  // first paint above draws no fill. This one runs when it can.
  queueMicrotask(paint);

  return {
    el: root,
    set,
    value: () => v,
    /** '' until something has moved it, then 'hand', 'hardware' or 'self'. */
    source: () => from,
    /** 🔴 COUNTERS, so "is this binding live" is answerable after the fact. */
    hardwareMoves: () => hw,
    /** how many times A PERSON moved it. See the note on `SELF` above. */
    handMoves: () => hand,
    /** how many times the INVISIBLE hand moved it, which is nobody moving it. */
    selfMoves: () => selfMoves,
    /** the invisible hand, or `null` on a knob that was not given one. */
    hand: handApi,
    repaint: paint,
    enable,
    disabled: () => off,
  };
}

/** An SVG arc path, degrees clockwise from twelve o'clock. */
function arcPath(cx, cy, r, a0, a1) {
  const p = (deg) => {
    const a = deg * Math.PI / 180;
    return [cx + Math.sin(a) * r, cy - Math.cos(a) * r];
  };
  const [x0, y0] = p(a0), [x1, y1] = p(a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

/**
 * Several knobs in a row, which is how every macro bank and every channel strip
 * is laid out, because a person compares them ACROSS rather than down.
 *
 * ⚠️ IT SCROLLS SIDEWAYS RATHER THAN SHRINKING, and the scroller carries
 * `min-width: 0`. Without that, `overflow-x` cannot shrink a flex item below its
 * content and the PAGE drags sideways instead of the row. MEASURED once at
 * 390 px as 141 px of page overflow.
 */
export function createKnobBank(knobs = [], { label = '' } = {}) {
  if (!knobs.length) throw new Error('a knob bank with no knobs is an empty box painting its own edges');
  const wrap = document.createElement('div');
  wrap.className = 'pos-knob-bank';
  if (label) {
    const l = document.createElement('div');
    l.className = 'pos-knob-banklab';
    l.textContent = label;
    wrap.append(l);
  }
  const row = document.createElement('div');
  row.className = 'pos-knob-row';
  for (const k of knobs) row.append(k.el);
  wrap.append(row);
  return {
    el: wrap,
    knobs,
    /** How many have ever been moved by hardware, which is what "is it bound" means. */
    bound: () => knobs.filter((k) => k.hardwareMoves() > 0).length,
    repaint: () => knobs.forEach((k) => k.repaint()),
  };
}
