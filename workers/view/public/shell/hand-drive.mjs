// demo/shell/hand-drive.mjs: the invisible hand's button, frame loop and hand-over, one copy for
// slider and knob; what a movement is lives in `hand.mjs`. Works in lane share 0 to 1, never
// in a value: the host converts, clamps and paints.
// why: lessons/kit-hand-drive.md#header
import {
  MOVES, MOVE_TURN, MOVE_GLYPH, MOVE_SAYS, MOVE_OFF,
  plan as planMove, positionAt, minSteps,
} from './hand.mjs';

/**
 * A ceiling: a hand left on sends for as long as the tab is open. Ten minutes at 50 messages a
 * second is about 30,000. Re-exported from `slider.mjs`, which three pages import it from.
 * why: lessons/kit-hand-drive.md#hand-max-ms
 */
export const HAND_MAX_MS = 10 * 60 * 1000;

/**
 * How long the hand keeps off after somebody else moved the handle: it yields, it does not stop.
 * A pointer lift resumes at once; `set()` and arrow keys wait this long.
 * why: lessons/kit-hand-drive.md#hand-yield-ms
 */
export const HAND_YIELD_MS = 1200;

/**
 * Drive one control with an invisible hand.
 *
 * @param o.btn        the button. Its face, title, `aria-pressed` and
 *                     `data-on` are written here.
 * @param [o.row]      an element carrying `data-hand` and `data-held` for the
 *                     stylesheet. A control with nothing to mark passes none.
 * @param o.at         `() => number` where the handle is now, 0 to 1.
 * @param o.move       `(share: number) => void` the hand moved it.
 * @param [o.rest]     `() => void` the hand stopped, so the last value has to
 *                     land. See the note on `stop` below.
 * @param [o.settle]   `() => void` end any glide before the hand takes over.
 * @param o.steps      how many discrete steps this travel has.
 * @param [o.preset]   a movement preset, overriding the one the button names.
 * @param [o.onHand]   `({on, move, why, says, coarse}) => void`
 * @param o.barredSays the sentence shown when the control sits in a
 *                     `.pos-controls` row. It names the control, so it is the
 *                     caller's to write.
 * @param [o.seed]     starting seed, for a test that wants a fixed movement.
 * @returns the hand api, the same shape `createSlider` has always published.
 */
export function createHandDrive({
  btn, row = null, at, move, rest = null, settle = null,
  steps = 100, preset = null, onHand = null, barredSays = '',
  seed: seed0 = null,
} = {}) {
  if (!btn) throw new Error('createHandDrive needs a button');
  if (typeof at !== 'function' || typeof move !== 'function')
    throw new Error('createHandDrive needs at() and move()');

  const nameOf = (i) => MOVES[MOVE_TURN[i]][0];
  const presetOf = (i) => preset || MOVES[MOVE_TURN[i]][1];
  // -1 is off, and it opens there on every page and forever: the button is a
  // press, and nothing this page can do turns it on by itself.
  let idx = -1;
  let raf = 0, pl = null, t0 = 0, startedAt = 0;
  let seed = seed0 || ((Math.random() * 1e9) | 0) || 1;
  let yielded = false, yieldTimer = 0;

  /**
   * A control too coarse to show a hand says so: under one step the ends' `endJit * N` wander
   * rounds away. Measured at 8 steps.
   * why: lessons/kit-hand-drive.md#coarse
   */
  const need = minSteps(presetOf(0));
  const coarse = steps < need
    ? `this control has ${steps} steps and an invisible hand needs about ${need}: `
      + 'the wander at each end would be less than one step, so it would draw a staircase'
    : null;

  const nextSeed = () => { seed = ((seed * 1664525 + 1013904223) >>> 0) || 1; return seed; };

  function face() {
    const on = idx >= 0;
    if (row) {
      row.dataset.hand = on ? 'on' : 'off';
      if (yielded) row.dataset.held = '1'; else delete row.dataset.held;
    }
    const says = on ? MOVE_SAYS[nameOf(idx)] : MOVE_OFF;
    btn.textContent = MOVE_GLYPH[nameOf(on ? idx : 0)];
    btn.title = says;
    btn.setAttribute('aria-label', says);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.dataset.on = on ? '1' : '0';
    if (yielded) btn.dataset.held = '1'; else delete btn.dataset.held;
  }

  /**
   * The value is a function of the clock, never accumulated per frame. It calls `move()`, never
   * the host's `set()`, which keeps meaning somebody else moved it.
   * why: lessons/kit-hand-drive.md#frame
   */
  const frame = () => {
    raf = 0;
    if (idx < 0 || yielded) return;
    const now = performance.now();
    if (now - startedAt >= HAND_MAX_MS) { stop('ceiling'); return; }
    let t = now - t0;
    // The plan is regenerated when it runs out and the seed advances, so a
    // hand left on for ten minutes does not repeat itself.
    if (t >= pl.totalMs) { pl = planMove(presetOf(idx), { seed: nextSeed(), from: at() }); t0 = now; t = 0; }
    move(positionAt(pl, t));
    raf = requestAnimationFrame(frame);
  };

  function start(i, why = 'press') {
    // The refusal below is on `start` rather than only on the button, because
    // a page can reach `hand.start()` directly and a check certainly will.
    if (barred) return;
    idx = i;
    settle?.();
    pl = planMove(presetOf(idx), { seed: nextSeed(), from: at() });
    t0 = startedAt = performance.now();
    yielded = false; clearTimeout(yieldTimer); yieldTimer = 0;
    if (!raf) raf = requestAnimationFrame(frame);
    face();
    onHand?.({ on: true, move: nameOf(idx), why, says: MOVE_SAYS[nameOf(idx)], coarse });
  }

  function stop(why = 'press') {
    if (idx < 0) return;
    const was = nameOf(idx);
    idx = -1; yielded = false;
    cancelAnimationFrame(raf); raf = 0;
    clearTimeout(yieldTimer); yieldTimer = 0;
    face();
    // The last value of a gesture has to land, or a send gate could hold the second to last for ever.
    // why: lessons/kit-hand-drive.md#rest
    rest?.();
    onHand?.({ on: false, move: was, why, says: MOVE_OFF, coarse });
  }

  /**
   * Yield, not off: the hand picks the movement up again from where it was left.
   * why: lessons/kit-hand-drive.md#handyield
   */
  const handYield = () => {
    if (idx < 0) return;
    yielded = true;
    cancelAnimationFrame(raf); raf = 0;
    clearTimeout(yieldTimer);
    yieldTimer = setTimeout(() => handPickUp(), HAND_YIELD_MS);
    face();
  };
  const handPickUp = () => {
    if (idx < 0 || !yielded) return;
    clearTimeout(yieldTimer); yieldTimer = 0;
    yielded = false;
    settle?.();
    // It picks the movement up from wherever the handle was left, which is
    // what makes it a fader you can grab rather than one that argues with you.
    pl = planMove(presetOf(idx), { seed: nextSeed(), from: at() });
    t0 = performance.now();
    if (!raf) raf = requestAnimationFrame(frame);
    face();
  };

  /**
   * It refuses to run inside a `.pos-controls` row, which verify.mjs presses on every run: disabled,
   * saying why on its face. Read one frame late, since a new control has no parent yet.
   * why: lessons/kit-hand-drive.md#barred
   */
  let barred = null;
  requestAnimationFrame(() => {
    if (!btn.closest('.pos-controls')) return;
    barred = barredSays;
    stop('in-controls');
    btn.disabled = true;
    btn.title = barred;
    btn.setAttribute('aria-label', barred);
    onHand?.({ on: false, move: null, why: 'in-controls', says: barred, coarse });
  });

  const press = () => {
    const at2 = idx < 0 ? 0 : idx + 1;
    if (at2 >= MOVE_TURN.length) stop('press'); else start(at2, 'press');
  };
  btn.addEventListener('click', press);

  // Off when the tab is hidden, so a forgotten tab does not keep sending to shared hardware.
  // why: lessons/kit-hand-drive.md#visibility
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop('hidden');
  });

  face();
  const api = {
    el: btn,
    press,
    start: (i = 0, why = 'page') => start(i, why),
    stop: (why = 'page') => stop(why),
    yield: () => handYield(),
    resume: () => handPickUp(),
    setEnabled: (yes) => { if (!barred) btn.disabled = !yes; },
    get running() { return idx >= 0; },
    get held() { return yielded; },
    get move() { return idx < 0 ? null : nameOf(idx); },
    get says() { return idx < 0 ? MOVE_OFF : MOVE_SAYS[nameOf(idx)]; },
    get plan() { return pl; },
    get barred() { return barred; },
    /** how long it has left before the ceiling stops it, in ms */
    get leftMs() { return idx < 0 ? 0 : Math.max(0, HAND_MAX_MS - (performance.now() - startedAt)); },
    coarse,
    steps,
  };
  if (coarse) onHand?.({ on: false, move: null, why: 'coarse', says: coarse, coarse });
  return api;
}

export default createHandDrive;
