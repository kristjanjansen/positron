// demo/shell/hand-drive.mjs: the button, the frame loop and the hand-over.
//
// 🔴 THE SPLIT THIS FINISHES WAS ALREADY WRITTEN DOWN AND ONLY HALF BUILT.
// `slider.mjs` says it in its own hand block: *"What a movement IS lives in
// `hand.mjs` and is graded with no browser at all by `node
// demo/shell/hand-test.mjs`. What lives here is the button, the frame loop and
// the hand-over, which is the same split `looper.mjs` uses."* That second half
// then sat inside `createSlider`, about 150 lines of it, where a knob could not
// reach it.
//
// 🔴 SO WHEN A HAND WAS ASKED FOR ON A KNOB, 2026-09-22, THE CHEAP ANSWER WAS
// TO COPY IT. That is the hand-rolled control rule arriving from INSIDE the
// kit: `positron-ui` records `choice.mjs` and the slider group both shipping
// class names no stylesheet matched, *"a bug that only happens to a control
// nobody else uses"*, and two copies of a ten minute ceiling, a visibility
// handler and a `.pos-controls` refusal is a much larger version of that. One
// implementation, two callers.
//
// ⚠️ IT WORKS IN LANE SHARE, 0 TO 1, AND NEVER IN A VALUE. `hand.mjs` plans in
// that space already, and a driver that also knew about `min`, `max`, `step`
// and exponential lanes would be a second opinion about what a control's
// travel is. The host converts, clamps and paints; this decides where along the
// travel the handle should be at this instant.
import {
  MOVES, MOVE_TURN, MOVE_GLYPH, MOVE_SAYS, MOVE_OFF,
  plan as planMove, positionAt, minSteps,
} from './hand.mjs';

/**
 * 🔴 A CEILING, BECAUSE A HAND LEFT ON IS A PAGE SENDING FOR AS LONG AS THE TAB
 * IS OPEN. `/knobs/` puts fifty messages a second on a relay and into a
 * Raspberry Pi in another building, so ten minutes is about thirty thousand
 * messages: long enough to demonstrate anything, short enough that walking away
 * from it costs nothing. `transport-bar.mjs` already says the general form of
 * this, that a live loop with no ceiling is a recording with no end.
 *
 * ⚠️ THESE TWO LIVED IN `slider.mjs` UNTIL 2026-09-22 and are re-exported from
 * there, because `/radio/`, `/kit/` and `/knobs/` all import `HAND_YIELD_MS`
 * from that module and a moved export is a 404 in three pages.
 */
export const HAND_MAX_MS = 10 * 60 * 1000;

/**
 * How long the hand keeps its own hands off after somebody else moved the
 * handle.
 *
 * ⚠️ YIELD, NOT OFF. A motorised fader you can grab is the physical thing the
 * phrase "invisible hand" names, and nothing pressed the button, so the hand
 * picks the movement up again from wherever it was left. A pointer lifting
 * resumes it at once; a `set()` from the page or from an arrow key has no lift,
 * so it waits this long instead. Shorter and the arrow keys look broken,
 * because the value is dragged away between one press and the next.
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
   * 🔴 A CONTROL TOO COARSE TO SHOW A HAND SAYS SO RATHER THAN DRAWING A
   * STAIRCASE. The ends of a sweep wander by `endJit` of the travel, so on a
   * lane of N steps that wander is `endJit * N` steps, and under one step it
   * rounds away and every lap turns at the same number. MEASURED at 8 steps:
   * the metric cannot find a single reach to measure while the ends still read
   * as varied, which is a page looking right and moving like a machine.
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
   * ⚠️ THE VALUE IS A FUNCTION OF THE CLOCK, NEVER AN ACCUMULATION PER FRAME,
   * so a dropped frame costs a skipped sample and never a drifted phase.
   * ⚠️ AND IT NEVER CALLS THE HOST'S `set()`. It calls `move()`, which the host
   * wires to the same path a pointer drag uses, so `set()` keeps meaning
   * "somebody else is moving this" with no exceptions.
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
    // ⚠️ THE LAST VALUE OF A GESTURE IS THE ONE THAT HAS TO LAND. A send gate
    // holds back a move that is not due yet, so a hand that stopped without an
    // endpoint could leave a filter at the second to last position for ever.
    // This is what `onChange` on a pointer lift is for, and a hand stopping is
    // the same event.
    rest?.();
    onHand?.({ on: false, move: was, why, says: MOVE_OFF, coarse });
  }

  /**
   * ⚠️ YIELD, NOT OFF. A motorised fader you can grab is the physical thing the
   * phrase "invisible hand" names, and nothing pressed the button, so the hand
   * picks the movement up again from wherever it was left.
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
   * 🔴 IT REFUSES TO RUN FROM INSIDE A CONTROL ROW, AND THAT IS NOT
   * THEORETICAL. `verify.mjs` presses `.pos-controls button` on every demo on
   * every run, dozens of times a day, and TWO pages build their own
   * `.pos-controls` and put sliders in it: `/draw/` appends a two-slider group
   * to one, and `/grains/` puts its fade and its brightness in two of them.
   * Neither has a hand today and both are one `hand: true` away from a suite
   * run starting fifty messages a second to a shared Raspberry Pi.
   *
   * ⚠️ A COMMENT IN THIS FILE AND AN ASSERT ON THE PAGE THAT TURNED IT ON
   * PROTECT NEITHER OF THOSE PAGES, because the mistake would be made on a
   * page that has no such assert. So the component answers for itself: the
   * button is disabled, it says why on its own face, and the page gets a line
   * for its log. It fails in the log rather than on the board.
   * ⚠️ AND IT IS READ ONE FRAME LATE, because a control is built before it is
   * appended to anything: asking at construction time asks about an element
   * with no parent, which always answers no.
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

  // 🔴 OFF WHEN THE TAB IS HIDDEN. A forgotten tab on a second monitor sending
  // fifty messages a second to shared hardware is the `/tapes/` and
  // `/videoradio/` failure in a new costume.
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
