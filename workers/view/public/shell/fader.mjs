// demo/shell/fader.mjs — a slider that stands up, and says where its value came
// from.
//
// 🔴 IT WAS PARKED FOR AN HOUR AND THE REASON IS WORTH KEEPING. It was written
// to put the Circuit's eight macros on screen, and that was the wrong shape:
// **the Circuit has eight rotary KNOBS and no fader on it anywhere.** Reported
// in four words the moment it was proposed, *"circuit has no vert fader"*.
// Every number behind the proposal was measured and correct, and the control it
// was drawn as was still wrong, because a CC number says what TRAVELS and says
// nothing about what a hand TOUCHES. **Measure the device, then look at it.**
//
// ✅ IT IS IN USE AGAIN, ASKED FOR 2026-09-20 as *"make exmaples with knobs,
// haldpads, fullpad and vert slider under each other"*. And it is the right
// component for the Model 12, which has eight channel faders and an FX fader,
// measured sending pitch bend on channels 1 to 9.
//
// 🔴 WHY A SECOND SLIDER EXISTS AT ALL, BECAUSE THIS PROJECT'S RULE IS TO USE
// THE ONE IN THE KIT. `slider.mjs` is a three column grid: a label, a lane and a
// number, side by side, sharing columns across a group so several of them line
// up. That shape is the whole component and it is horizontal by construction.
// Eight of them stacked is 8 rows deep and unreadable as a bank.
// What a hardware bank wants is the opposite: eight narrow columns side by side,
// which is how every mixer and every macro row on every synth is laid out,
// because a person compares them ACROSS rather than reading them down.
// ⚠️ ASKED FOR 2026-09-20 in the device layout work: *"perhaps we could use our
// sliders vertically"*.
//
// 🔴 AND THE PART THAT IS NOT ABOUT ORIENTATION: A FADER HERE KNOWS WHETHER A
// HAND OR A PIECE OF HARDWARE LAST MOVED IT. A control bound to a knob in the
// room is a control with two masters, and a page that cannot tell them apart
// cannot report the one failure that matters, which is a binding that has
// quietly stopped arriving. A fader that has never heard from its hardware looks
// exactly like one whose hardware is unplugged.
// ⚠️ THE SOURCE IS A COUNTER, NEVER A FLAG. CLAUDE.md: a counter beats a state
// when a check runs next to an event. `hardwareMoves()` counts what has EVER
// arrived, so a check asking "is this binding live" cannot be satisfied by an
// instant that happens to be true.

import { MOVES, MOVE_TURN, MOVE_GLYPH, MOVE_SAYS, MOVE_OFF, plan, positionAt }
  from './hand.mjs';

const VMIN = 0, VMAX = 127;

/**
 * One vertical fader.
 *
 * @param {object} o
 * @param {string} o.label     under the lane, uppercased by CSS. Keep it short.
 * @param {string} [o.sub]     a second, dimmer line under the label: `CC 80`.
 * @param {number} [o.min]     default 0, because these are MIDI controllers
 * @param {number} [o.max]     default 127
 * @param {number} [o.value]   where it starts, default the midpoint
 * @param {string} [o.title]   hover text on the whole control
 * @param {boolean} [o.hand]   an invisible hand: one button that makes this
 *   fader move by itself, for watching a binding without touching the desk.
 *   🔴 **IT USES `hand.mjs`'s PLANNER, NOT A LOOP OF ITS OWN.** `slider.mjs`
 *   already drives a control from `plan()` and `positionAt()`, and a second
 *   implementation of the same idea is how two controls come to move
 *   differently while both claim to be doing the same thing.
 *   ⚠️ **THE GLYPH ROTATES.** `⇄` is a left and right pair, drawn for a
 *   horizontal lane. On a fader it is turned 90 degrees, because an arrow
 *   pointing across a control that moves up and down is a picture of the wrong
 *   gesture.
 * @param {(v:number, from:string)=>void} [o.onInput]   every move
 * @param {(v:number, from:string)=>void} [o.onChange]  on release and on a key
 * @returns {{el:HTMLElement, set:Function, value:()=>number, source:()=>string,
 *            hardwareMoves:()=>number, handMoves:()=>number, destroy:Function}}
 */
export function createFader({
  label, sub = '', min = VMIN, max = VMAX, value, title = '',
  onInput = () => {}, onChange = () => {}, disabled = false, hand = false,
} = {}) {
  if (!label) throw new Error('a fader needs a label: it is the only thing naming what it moves');
  const span = max - min;
  if (!(span > 0)) throw new Error(`a fader needs max above min, got ${min}..${max}`);

  let v = clamp(value === undefined ? min + span / 2 : value);
  let from = '';                 // '' until something moves it
  // ⚠️ `byHand`, NOT `hand`. The option added later is called `hand`, and a
  // counter sharing its name is a SyntaxError at module load that takes every
  // page importing this file down with it. Second time in this kit: `knob.mjs`
  // had the same collision between an `arc` option and its `arc` element.
  let hw = 0, byHand = 0, off = !!disabled;

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  const root = el('div', 'pos-fdr');
  if (title) root.title = title;

  const num = el('div', 'pos-fdr-v', String(Math.round(v)));
  // 🔴 A LANE AND A HANDLE, AND NO FILL. `.sld-knob` is the slider's whole
  // reading and this is the same control turned 90 degrees, so a fill would be
  // the value said twice by two elements that can disagree by a pixel.
  const lane = el('div', 'pos-fdr-lane');
  const cap = el('div', 'pos-fdr-cap');
  lane.append(cap);

  // 🔴 THE LANE IS THE FOCUSABLE THING, NOT THE WRAPPER. A wrapper that takes
  // focus puts the ring round the label and the number too, which reads as the
  // whole column being selected rather than as a control being steerable.
  lane.tabIndex = 0;
  lane.setAttribute('role', 'slider');
  lane.setAttribute('aria-label', label);
  lane.setAttribute('aria-valuemin', String(min));
  lane.setAttribute('aria-valuemax', String(max));

  const lab = el('div', 'pos-fdr-lab', label);
  const subEl = sub ? el('div', 'pos-fdr-sub', sub) : null;

  root.append(num, lane, lab);
  if (subEl) root.append(subEl);

  function clamp(n) {
    return Math.min(max, Math.max(min, n));
  }

  function paint() {
    const frac = (v - min) / span;
    // ⚠️ A SHARE OF THE TRAVEL, NEVER OF THE HEIGHT, so both ends land flush.
    // `slider.mjs` does the same arithmetic on `left` and its comment says why.
    cap.style.bottom = `calc(${(frac * 100).toFixed(3)}% - ${(frac * 100).toFixed(3)} * var(--fdr-knob) / 100)`;
    num.textContent = String(Math.round(v));
    lane.setAttribute('aria-valuenow', String(Math.round(v)));
    // ⚠️ AN ATTRIBUTE, NOT A CLASS, and DELETED rather than emptied when there
    // is no source. `[data-from]` matches on PRESENCE, so `= ''` would leave a
    // fader that had been touched once looking touched for the rest of the
    // page's life. That exact bug was measured in `video-panel.mjs` on
    // 2026-09-19 and it survived because entering a state is what gets tested.
    if (from) root.dataset.from = from; else delete root.dataset.from;
  }

  /**
   * Move it.
   * @param {number} next
   * @param {object} [o]
   * @param {string} [o.from]  `'hardware'` or `'hand'`. Anything else is a
   *                           caller inventing a source, and it is kept as
   *                           given rather than corrected, because a wrong
   *                           label a reader can see beats a silent rewrite.
   * @param {boolean} [o.quiet]  do not call back. For echoing a value that CAME
   *                             from the thing that would be called.
   */
  function set(next, { from: src = 'hand', quiet = false } = {}) {
    const was = v;
    v = clamp(Number(next));
    from = src;
    if (src === 'hardware') hw++; else if (src === 'hand') byHand++;
    paint();
    if (!quiet && v !== was) { onInput(v, src); onChange(v, src); }
    return v;
  }

  // ── the hand ───────────────────────────────────────────────────────────
  //
  // ⚠️ POINTER EVENTS, NOT MOUSE EVENTS, and capture on the LANE so a drag that
  // leaves the column keeps steering it. A fader 34 px wide is one a finger
  // slides off constantly.
  let dragging = false;

  const fromY = (e) => {
    const r = lane.getBoundingClientRect();
    const frac = 1 - (e.clientY - r.top) / r.height;
    return min + clamp(min + frac * span) - min;
  };

  lane.addEventListener('pointerdown', (e) => {
    if (off) return;
    dragging = true;
    lane.setPointerCapture(e.pointerId);
    set(fromY(e), { from: 'hand' });
    e.preventDefault();
  });
  lane.addEventListener('pointermove', (e) => {
    if (dragging) set(fromY(e), { from: 'hand' });
  });
  const stop = (e) => {
    if (!dragging) return;
    dragging = false;
    try { lane.releasePointerCapture(e.pointerId); } catch { /* already gone */ }
  };
  lane.addEventListener('pointerup', stop);
  lane.addEventListener('pointercancel', stop);

  lane.addEventListener('keydown', (e) => {
    if (off) return;
    const step = e.shiftKey ? Math.max(1, Math.round(span / 10)) : Math.max(1, span / 100);
    const go = { ArrowUp: step, ArrowDown: -step, PageUp: step * 5, PageDown: -step * 5,
                 Home: min - v, End: max - v }[e.key];
    if (go === undefined) return;
    e.preventDefault();
    set(v + go, { from: 'hand' });
  });

  /** See `pad.mjs`'s `enable`: disabling costs the checks behind a control,
   *  and is still right when the control genuinely cannot do its job. */
  function enable(yes, why = '') {
    off = !yes;
    if (off) { root.dataset.off = '1'; lane.removeAttribute('tabindex'); }
    else { delete root.dataset.off; lane.tabIndex = 0; }
    if (why) root.title = why;
    return !off;
  }
  enable(!off, title);

  /* ── the invisible hand ─────────────────────────────────────────────── */
  let handBtn = null, raf = 0, pl = null, t0 = 0, seed = 1, running = false;
  const toT = (x) => (x - min) / span;
  const fromT = (t) => clamp(min + t * span);

  if (hand) {
    handBtn = el('button', 'pos-fdr-hand', null);
    // ⚠️ THE GLYPH IS IN A SPAN BECAUSE A TRANSFORM NEEDS AN ELEMENT. Rotating
    // the button would turn its border too; rotating a bare text node is not
    // possible at all.
    /**
     * 🔴 `hand.mjs`'s OWN GLYPH, ROTATED. It was swapped for two geometric
     * triangles because U+21C4 has an emoji presentation and rendered in
     * colour; asked back on 2026-09-21, *"keep ⇄ emoji just 90rot"*, and the
     * emoji rendering is accepted rather than worked around.
     * ⚠️ **THE POINT IS THAT IT IS THE SLIDER'S GLYPH.** A fader and a slider
     * running the same planner should wear the same mark, and a substitution
     * here would be the two drifting apart over a rendering detail.
     */
    handBtn.append(el('span', 'pos-fdr-hand-g', MOVE_GLYPH[MOVES[MOVE_TURN[0]][0]]));
    handBtn.type = 'button';
    handBtn.title = MOVE_OFF;
    handBtn.setAttribute('aria-pressed', 'false');
    handBtn.onclick = () => (running ? stopHand() : startHand());
    /**
     * 🔴 BELOW THE LANE, SQUARE, JOINED TO IT. Corrected 2026-09-21: *"no.
     * soubl be on bottom and keep ⇄ emoji just 90rot, be square"*.
     * ⚠️ **SO WHAT A PAD COLUMN LINES UP WITH IS THE FADER'S LAST CONTROL, NOT
     * ITS LANE.** With the button underneath, the lane ends 33 px above the
     * fader's controls do, and the honest fix is the check knowing that rather
     * than the page pushing the pads around to hide it. A hand is a mode: it
     * changes where the control ends, and everything beside it ends there too.
     */
    lane.after(handBtn);
  }

  const frame = () => {
    const t = performance.now() - t0;
    // ⚠️ THE PLAN IS REGENERATED WHEN IT RUNS OUT, so a hand left on does not
    // repeat itself. Same reasoning as the slider's own loop.
    if (t >= pl.totalMs) { pl = planFor(); t0 = performance.now(); }
    const nv = fromT(positionAt(pl, performance.now() - t0));
    if (nv !== v) set(nv, { from: 'hand' });
    raf = requestAnimationFrame(frame);
  };
  const planFor = () => plan(MOVES[MOVE_TURN[0]][1], { seed: (seed = (seed * 48271) % 2147483647), from: toT(v) });

  function startHand() {
    if (off || running) return;
    running = true;
    pl = planFor();
    t0 = performance.now();
    if (!raf) raf = requestAnimationFrame(frame);
    if (handBtn) {
      handBtn.setAttribute('aria-pressed', 'true');
      handBtn.title = MOVE_SAYS[MOVES[MOVE_TURN[0]][0]];
    }
  }
  function stopHand() {
    if (!running) return;
    running = false;
    cancelAnimationFrame(raf); raf = 0;
    if (handBtn) { handBtn.setAttribute('aria-pressed', 'false'); handBtn.title = MOVE_OFF; }
    onChange(v, 'hand');
  }

  paint();

  return {
    el: root,
    enable,
    /** '' when there is no hand on this fader. */
    handOn: () => running,
    startHand, stopHand,
    disabled: () => off,
    set,
    value: () => v,
    /** '' until something has moved it, then 'hand' or 'hardware'. */
    source: () => from,
    /** 🔴 COUNTERS, so "is this binding live" is answerable after the fact. */
    hardwareMoves: () => hw,
    handMoves: () => byHand,
    destroy() { lane.replaceWith(lane.cloneNode(true)); },
  };
}

/**
 * Several faders in a row, which is the only reason a vertical one exists.
 *
 * ⚠️ IT SCROLLS SIDEWAYS RATHER THAN SHRINKING. Eight faders at 34 px plus gaps
 * do not fit a 390 px phone, and a fader narrow enough to fit is one a finger
 * cannot hit. `overflow-x` cannot shrink a flex item below its content, so the
 * row carries `min-width: 0` on the scroller, which is the trap CLAUDE.md
 * records: without it the PAGE drags sideways instead of the row.
 *
 * @param {ReturnType<createFader>[]} faders
 * @param {object} [o]
 * @param {string} [o.label]  a gutter word above the row
 */
export function createFaderBank(faders = [], { label = '' } = {}) {
  if (!faders.length) throw new Error('a fader bank with no faders is an empty box painting its own edges');
  const wrap = document.createElement('div');
  wrap.className = 'pos-fdr-bank';
  if (label) {
    const l = document.createElement('div');
    l.className = 'pos-fdr-banklab';
    l.textContent = label;
    wrap.append(l);
  }
  const row = document.createElement('div');
  row.className = 'pos-fdr-row';
  for (const f of faders) row.append(f.el);
  wrap.append(row);
  return {
    el: wrap,
    faders,
    /** How many of them have ever been moved by hardware. */
    bound: () => faders.filter((f) => f.hardwareMoves() > 0).length,
  };
}
