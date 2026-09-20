// demo/shell/knob.mjs — a rotary control that is NOT turned in a circle.
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
const ARC = 270;

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
  stroke,
} = {}) {
  if (!label) throw new Error('a knob needs a label: it is the only thing naming what it moves');
  const span = max - min;
  if (!(span > 0)) throw new Error(`a knob needs max above min, got ${min}..${max}`);

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
  let from = '', hw = 0, hand = 0;

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
  if (sub) root.append(mk('div', 'pos-knob-sub', sub));

  function clamp(n) { return Math.min(max, Math.max(min, n)); }

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
    num.textContent = `${Math.round(v * 100) / 100}${unit ? ` ${unit}` : ''}`;
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
  let dragging = false, acc = 0;

  svg.addEventListener('pointerdown', (e) => {
    if (off) return;
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
    const step = span / SWEEP;
    if (Math.abs(acc) < 0.001) return;
    set(v + acc * step, { from: 'hand' });
    acc = 0;
  });

  const stop = (e) => {
    if (!dragging) return;
    dragging = false;
    try { svg.releasePointerCapture(e.pointerId); } catch { /* already gone */ }
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
    const step = (span / SWEEP) * (e.shiftKey ? FINE : 1);
    set(v - Math.sign(e.deltaY) * step * 6, { from: 'hand' });
  }, { passive: false });

  svg.addEventListener('keydown', (e) => {
    if (off) return;
    const fine = e.shiftKey ? FINE : 1;
    const one = Math.max(span / 127, span / SWEEP) * fine;
    const go = { ArrowUp: one, ArrowRight: one, ArrowDown: -one, ArrowLeft: -one,
                 PageUp: one * 10, PageDown: -one * 10,
                 Home: min - v, End: max - v }[e.key];
    if (go === undefined) return;
    e.preventDefault();
    set(v + go, { from: 'hand' });
  });

  /** See the note on `pad.mjs`'s `enable`: a disabled control costs the checks
   *  behind it, and is still the right answer when the control cannot do its job. */
  function enable(yes, why = '') {
    off = !yes;
    if (off) { root.setAttribute('data-off', '1'); svg.removeAttribute('tabindex'); }
    else { root.removeAttribute('data-off'); svg.setAttribute('tabindex', '0'); }
    if (why) root.setAttribute('title', why);
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
    /** '' until something has moved it, then 'hand' or 'hardware'. */
    source: () => from,
    /** 🔴 COUNTERS, so "is this binding live" is answerable after the fact. */
    hardwareMoves: () => hw,
    handMoves: () => hand,
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
