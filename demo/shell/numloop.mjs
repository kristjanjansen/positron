// demo/shell/numloop.mjs. Ten loop slots driven by ten number keys.
//
// 🔴 ASKED FOR 2026-09-23: *"use numpad from evo: when i press a number the loop
// rec stars until i prss same number again it starts looping. third click stops,
// fourth plays again erc. dubleclick clrears. can make a separate tmp demo too
// get it right 'num'"*.
//
// ── THE MACHINE, WHICH IS THE WHOLE FEATURE ───────────────────────────────
//
//   press   from        to
//   1st     empty   ->  RECORDING
//   2nd     rec     ->  LOOPING
//   3rd     loop    ->  STOPPED
//   4th     stop    ->  LOOPING      and so on, stop and play for ever
//   double  has one ->  empty
//   double  empty   ->  RECORDING, and every other LOOPING slot goes to stopped
//
// ⚠️ TEN OF THEM, INDEPENDENT. Pressing 3 while 1 is looping does not touch 1.
// That is what makes this a looper rather than a transport, and it is why the
// state lives per slot rather than in one `mode` variable.
//
// ── THE TRAP, WHICH IS WHY THIS IS A MODULE AND NOT TEN LINES IN A PAGE ────
//
// 🔴 A DOUBLE PRESS IS TWO SINGLE PRESSES FOLLOWED BY A CLEAR. The browser fires
// `click` twice before it fires `dblclick`, so wiring the machine straight to
// `click` runs it twice on the way to clearing: a double press on an empty slot
// would start recording, stop recording into a loop, and only then clear. What
// you meant as *forget this* would have recorded a loop first.
// ✅ SO A PRESS IS HELD FOR `doubleMs` BEFORE IT COUNTS, and a second press
// inside that window cancels the first and clears instead.
// ⚠️ AND THAT MAKES EVERY SINGLE PRESS LATE BY `doubleMs`, WHICH ON A LOOPER IS
// THE ONE THING A PLAYER CAN FEEL. There is no way round it that keeps a double
// press meaning *undo*: the machine cannot know a press was single until the
// window has passed. What it CAN do is tell the caller immediately that
// something was pressed, so the page can light the key on the press and commit
// the state after, which is what `onTouch` is for. The lamp is honest and
// instant; the transport is correct and late.
//
// ⚠️ IT OWNS NO AUDIO AND NO CLOCK. `onEnter` says a slot changed state and the
// page decides what recording or looping MEANS, exactly as `roll.mjs` reports a
// pick and lets the page light the keys. That is also what lets this be graded
// with no browser at all.

/** The four states, in the order a slot walks them. */
export const STATES = ['empty', 'recording', 'looping', 'stopped'];

/**
 * What one more press does to a slot in this state.
 *
 * ⚠️ `stopped` GOES BACK TO `looping` AND NOT TO `empty`, which is the whole of
 * *"fourth plays again erc"*: after the first cycle a slot only ever toggles
 * between playing and silent, and the one way back to empty is the double press.
 */
export const NEXT = {
  empty: 'recording',
  recording: 'looping',
  looping: 'stopped',
  stopped: 'looping',
};

/**
 * @param {object} [o]
 * @param {number} [o.slots]     how many numbers there are. Ten on this panel.
 * @param {number} [o.doubleMs]  how long a press waits to find out whether it is
 *   half of a double one. 🔴 A GUESS WITH A REASON RATHER THAN A MEASUREMENT:
 *   the platform's own double click interval is not readable from a page, 250 ms
 *   is what most desktops ship, and this is the number `/num/` exists to try
 *   against a pair of hands. Lower and a real double press gets read as two
 *   singles; higher and every press drags.
 * @param {(i:number, state:string, o:{was:string})=>void} [o.onEnter]  a slot
 *   changed state. The page decides what that MEANS.
 * @param {(i:number)=>void} [o.onTouch]  a key went down, immediately, before the
 *   double press window. For the lamp, never for the transport.
 * @returns {{press, release, state, states, held, clear, clearAll, pending,
 *            destroy, slots, doubleMs}}
 */
export function createNumLoop({
  slots = 10, doubleMs = 250, onEnter = () => {}, onTouch = () => {},
} = {}) {
  if (!Number.isInteger(slots) || slots < 1) throw new Error('a numloop needs at least one slot');
  const state = Array.from({ length: slots }, () => 'empty');
  /** slot -> the timer holding its press back, or 0 */
  const waiting = new Array(slots).fill(0);

  const ok = (i) => Number.isInteger(i) && i >= 0 && i < slots;

  const enter = (i, next) => {
    const was = state[i];
    if (was === next) return;
    state[i] = next;
    onEnter(i, next, { was });
  };

  return {
    /**
     * A number key went down.
     *
     * 🔴 IT REPORTS THE TOUCH AT ONCE AND COMMITS LATE, and those are two
     * different promises. A page that lit its key on `onEnter` would look dead
     * for a quarter of a second on every press.
     */
    press(i, at = Date.now()) {
      if (!ok(i)) return;
      /* A second press inside the window is the double press, and it CANCELS
         the first rather than following it. This is the whole reason a press is
         held: without it the machine would already have advanced once. */
      if (waiting[i]) {
        clearTimeout(waiting[i]);
        waiting[i] = 0;
        /**
         * 🔴 A DOUBLE PRESS MEANS TWO DIFFERENT THINGS AND THE SLOT DECIDES
         * WHICH. Asked 2026-09-23: *"when doubleclick on empty slot, it stops
         * others possible loops playing and starts rec"*.
         * On a slot with something in it, a double press is *throw this away*.
         * On an EMPTY one there is nothing to throw away, so the gesture was
         * doing nothing at all, and what a player wants from a blank key is to
         * start over: silence whatever is running and record the next idea
         * against nothing.
         * ⚠️ IT STOPS THEM RATHER THAN CLEARING THEM. The loops are still there
         * and one press each brings any of them back, because *start over* is
         * about what you can HEAR and not about throwing away work somebody
         * recorded. Clearing all ten on a double press would be an undo nobody
         * asked for with no way back.
         */
        if (state[i] === 'empty') {
          for (let k = 0; k < slots; k++) if (k !== i && state[k] === 'looping') enter(k, 'stopped');
          enter(i, 'recording');
        } else {
          enter(i, 'empty');
        }
        onTouch(i);
        return;
      }
      waiting[i] = setTimeout(() => {
        waiting[i] = 0;
        enter(i, NEXT[state[i]]);
      }, doubleMs);
      /* 🔴 THE TOUCH IS REPORTED AFTER THE PRESS IS ON THE BOOKS, AND THE ORDER
         IS THE WHOLE POINT. `onTouch` fired first in the first version, so a
         page painting its lamp from `pending()` inside that callback read FALSE
         and the key never lit. Found by `/num/` on the first run, which is
         exactly what that bench exists for: the arithmetic was right and the
         handover was not, and no amount of grading the state machine would have
         shown it. */
      onTouch(i);
    },
    /** Nothing to do on release, and it is here so a caller can wire both and
     *  not wonder which one the machine wanted. */
    release() {},
    /**
     * Run a held press now rather than waiting, for a check that does not want
     * to sleep and for a page that knows the window is over.
     * ⚠️ IT IS NOT A SHORTCUT ROUND THE WINDOW: calling it is saying *I know no
     * second press is coming*, which only a clock or a test can know.
     */
    settle(i) {
      if (!ok(i) || !waiting[i]) return;
      clearTimeout(waiting[i]);
      waiting[i] = 0;
      enter(i, NEXT[state[i]]);
    },
    state: (i) => (ok(i) ? state[i] : 'empty'),
    states: () => state.slice(),
    /** slots that are recording or looping, which is what a page draws as live */
    held: () => state.filter((s) => s === 'recording' || s === 'looping').length,
    /** is a press still waiting to find out whether it is a double one */
    pending: (i) => (ok(i) ? waiting[i] !== 0 : false),
    clear(i) {
      if (!ok(i)) return;
      if (waiting[i]) { clearTimeout(waiting[i]); waiting[i] = 0; }
      enter(i, 'empty');
    },
    clearAll() { for (let i = 0; i < slots; i++) this.clear(i); },
    destroy() { for (let i = 0; i < slots; i++) if (waiting[i]) clearTimeout(waiting[i]); },
    slots,
    doubleMs,
  };
}
