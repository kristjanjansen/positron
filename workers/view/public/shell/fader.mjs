// demo/shell/fader.mjs: a vertical slider for a bank of hardware faders (the Model 12), which
// `slider.mjs`'s horizontal grid cannot lay out across. It counts whether a hand or the hardware
// last moved it: `hardwareMoves()` is a counter, never a flag, so a dead binding is visible.
// why: lessons/kit-fader.md#header

import { MOVES, MOVE_TURN, MOVE_GLYPH, MOVE_SAYS, MOVE_OFF, plan, positionAt }
  from './hand.mjs';

const VMIN = 0, VMAX = 127;

/**
 * One vertical fader.
 * @param {object} o
 * @param {string} o.label     under the lane, uppercased by CSS. Keep it short.
 * @param {string} [o.sub]     a second, dimmer line under the label: `CC 80`.
 * @param {number} [o.min]     default 0, because these are MIDI controllers
 * @param {number} [o.max]     default 127
 * @param {number} [o.value]   where it starts, default the midpoint
 * @param {string} [o.title]   hover text on the whole control
 * @param {boolean} [o.hand]   a button that moves the fader by itself, with hand.mjs's planner;
 *   its ⇄ glyph is rotated 90 degrees to match the gesture.
 * @param {(v:number, from:string)=>void} [o.onInput]   every move
 * @param {(v:number, from:string)=>void} [o.onChange]  on release and on a key
 * @returns {{el:HTMLElement, set:Function, value:()=>number, source:()=>string,
 *            hardwareMoves:()=>number, handMoves:()=>number, destroy:Function}}
 * why: lessons/kit-fader.md#createfader
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
  // `byHand`, not `hand`: sharing the option's name is a SyntaxError at module load.
  // why: lessons/kit-fader.md#byhand
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
  // A lane and a handle, no fill: a fill would say the value twice and disagree by a pixel.
  // why: lessons/kit-fader.md#lane
  const lane = el('div', 'pos-fdr-lane');
  const cap = el('div', 'pos-fdr-cap');
  lane.append(cap);

  // The lane takes focus, not the wrapper, so the ring is round the steerable part only.
  // why: lessons/kit-fader.md#lane-focus
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
    // A share of the travel, never of the height, so both ends land flush (as slider.mjs).
    // why: lessons/kit-fader.md#cap-position
    cap.style.bottom = `calc(${(frac * 100).toFixed(3)}% - ${(frac * 100).toFixed(3)} * var(--fdr-knob) / 100)`;
    num.textContent = String(Math.round(v));
    lane.setAttribute('aria-valuenow', String(Math.round(v)));
    // An attribute, deleted rather than emptied: `[data-from]` matches on presence.
    // why: lessons/kit-fader.md#data-from
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

  // ── the hand ──
  // Pointer events, captured on the lane, so a drag off a 34 px column keeps steering it.
  // why: lessons/kit-fader.md#the-hand
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
    // The glyph is in a span because a transform needs an element; rotating the button turns its border.
    // why: lessons/kit-fader.md#glyph-span
    /**
     * hand.mjs's own ⇄, rotated, emoji rendering accepted: the fader wears the slider's mark.
     * why: lessons/kit-fader.md#hand-glyph
     */
    handBtn.append(el('span', 'pos-fdr-hand-g', MOVE_GLYPH[MOVES[MOVE_TURN[0]][0]]));
    handBtn.type = 'button';
    handBtn.title = MOVE_OFF;
    handBtn.setAttribute('aria-pressed', 'false');
    handBtn.onclick = () => (running ? stopHand() : startHand());
    /**
     * Below the lane, square, joined to it. A pad column lines up with the fader's last control,
     * 33 px below the lane's end, and the check knows that.
     * why: lessons/kit-fader.md#hand-button
     */
    lane.after(handBtn);
  }

  const frame = () => {
    const t = performance.now() - t0;
    // The plan is regenerated when it runs out, so a hand left on does not repeat itself.
    // why: lessons/kit-fader.md#plan
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
    /**
     * Counters, so whether a binding is live is answerable after the fact.
     * why: lessons/kit-fader.md#counters
     */
    hardwareMoves: () => hw,
    handMoves: () => byHand,
    destroy() { lane.replaceWith(lane.cloneNode(true)); },
  };
}

/**
 * Several faders in a row. It scrolls sideways rather than shrinking (8 at 34 px exceed 390 px);
 * the scroller carries `min-width: 0` or the page drags instead.
 * @param {ReturnType<createFader>[]} faders
 * @param {object} [o]
 * @param {string} [o.label]  a gutter word above the row
 * why: lessons/kit-fader.md#createfaderbank
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
