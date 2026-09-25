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
//
// ── THE TEMPO AND THE ALIGNMENT, ADDED 2026-09-25 ──────────────────────────
//
// 🔴 ASKED: *"in keyboadd looper: do basic bmp detection / quant and when first
// loop set, all next ones align on it, either times shorter, same or longer"*.
//
// ⚠️ IT IS STILL ARITHMETIC AND STILL OWNS NO AUDIO AND NO CLOCK. The caller
// hands over a lap it measured and the onset times inside it, and gets back a
// lap to use and an account of how that number was reached. Nothing here plays,
// schedules or draws anything, which is what keeps it gradable with no browser.
//
// 🔴 THE TEMPO IS DETECTED FROM THE GAPS BETWEEN ONSETS, NEVER FROM THE LOOP'S
// TOTAL LENGTH, AND THE TWO FAIL DIFFERENTLY. A total length alone says nothing:
// 2000 ms is four beats at 120, eight at 240 and two at 60, and every one of
// those readings fits perfectly, so a tempo derived that way is an assumption
// about the bar count wearing a measurement's clothes. The gaps between onsets
// are real evidence, and when there are not enough of them THIS SAYS SO rather
// than answering 120.
// ⚠️ AND THE LENGTH IS KEPT AS A SECOND, INDEPENDENT READING RATHER THAN FOLDED
// IN. `tempo().unitBeats` is the unit divided by the detected beat, so a unit
// measuring 4.02 beats corroborates the detection and one measuring 3.61 argues
// with it. Feeding it back into the answer would collapse two sources into one,
// which is exactly the defect `positron-verify` records about two numbers
// derived from one field agreeing perfectly while both are wrong.
//
// 🔴 AN OCTAVE ERROR IS POSSIBLE AND IS BOUNDED ON PURPOSE. The median gap is
// folded into `TEMPO_BAND` by doubling or halving, so somebody playing steady
// sixteenths is reported at four times the tempo they are counting. There is no
// way round that in basic detection and it costs the READOUT only: the alignment
// below is computed from the unit lap and never from the tempo, so a loop aligns
// correctly whatever octave the number landed in.

/* ✅ ONE TEMPO IN THIS PROJECT, NOT TWO. `stepMsFor` is `step-grid.mjs`'s and is
   what every clock in the kit already converts beats to milliseconds with, so a
   grid computed here cannot disagree with a grid computed there. Writing
   `60000 / (bpm * 4)` out again would have been one line and a second source of
   truth. MEASURED: that import chain costs 3 ms in node and touches no DOM, so
   this module is still graded with no browser. */
import { stepMsFor } from './step-grid.mjs';

/** The four states, in the order a slot walks them. */
export const STATES = ['empty', 'recording', 'looping', 'stopped'];

/**
 * 🔴 THE ALLOWED RATIOS, AND THIS SET IS A DECISION RATHER THAN A DEFAULT.
 * *"either times shorter, same or longer"* is an integer ratio, and which
 * integers are allowed is what makes this one instrument rather than another.
 *
 * ⚠️ POWERS OF TWO, AND THIRDS ARE REFUSED ON PURPOSE. Three reasons, in order
 * of weight:
 *  1. The rest of this kit is already in four. `step-grid.mjs` runs
 *     `stepMsFor(bpm, 4)` and its `marksAt(s, beat = 4, bar = 16)` says a bar is
 *     sixteen steps. A ratio set with thirds in it would make this the one
 *     module in the repository that assumes triplets, and the disagreement would
 *     be invisible until somebody played one.
 *  2. A set holding both `1/3` and `1/2` cannot snap predictably. A take at
 *     0.40 of the unit is 0.09 from a third and 0.10 from a half in log space,
 *     so two takes of the same phrase can land on different ratios and the
 *     player has no way to see why. A set whose members are far apart snaps the
 *     same way twice.
 *  3. `1/4` to `4` is a sixteen to one span. Past that a loop is not aligned to
 *     the first one in any sense a listener can hear.
 * ⚠️ CHANGING IT IS ONE CONSTANT AND NOTHING ELSE, which is why it is here
 * rather than buried in the snap.
 */
export const RATIOS = [
  { r: 1 / 4, label: '1/4' },
  { r: 1 / 2, label: '1/2' },
  { r: 1, label: '1' },
  { r: 2, label: '2' },
  { r: 4, label: '4' },
];

/**
 * 🔴 HOW FAR A PERFORMANCE MAY BE STRETCHED TO REACH A RATIO, AND PAST IT THE
 * SNAP IS REFUSED RATHER THAN FORCED. Neighbouring ratios are a factor of two
 * apart, so the worst case inside the span is a factor of 1.414, which is a
 * 29 per cent squeeze: loud enough to destroy the take it is meant to rescue.
 * ⚠️ A GUESS WITH A REASON, THE SAME KIND AS `doubleMs` ABOVE, AND IT WANTS A
 * PAIR OF HANDS RATHER THAN MORE ARITHMETIC. At 1.20 a player closing a four
 * beat loop a whole beat late (25 per cent) would be refused, which is the exact
 * case this feature exists for. At 1.30 that lands, and the worst squeeze it can
 * impose is 23 per cent, a beat in a bar. Above it an honest unaligned loop that
 * drifts beats a confident aligned one that is wrong.
 */
export const MAX_STRETCH = 1.30;

/**
 * Where a detected beat is folded to, in beats a minute.
 * ⚠️ 80 TO 160 IS THE OCTAVE CENTRED ON 120, which is the number every clock in
 * this project already opens at. Any band has to be exactly one octave wide or
 * the fold below either loops for ever or has nowhere to put some gaps.
 */
export const TEMPO_BAND = [80, 160];

/**
 * How close a gap has to be to a beat to count as landing on it, as a fraction
 * of the beat.
 * 🔴 IT HAS A CHANCE FLOOR AND THE FLOOR IS THE POINT. A window of `±TOL` either
 * side of every beat covers `2 * TOL` of the gap between them, so a take with no
 * rhythm in it scores about `CHANCE` by luck alone. `MIN_FIT` is set at twice
 * that, so *the gaps fit a pulse* is a claim with a known null value under it
 * rather than a number that sounds good. `numloop-test.mjs` measures the floor
 * against real random takes rather than trusting this sentence.
 */
export const TOL = 0.15;
export const CHANCE = 2 * TOL;
export const MIN_FIT = 0.6;

/**
 * ⚠️ FOUR ONSETS, WHICH IS THREE GAPS, BEFORE ANYTHING IS CALLED A TEMPO. Two
 * gaps are always consistent with some pulse, so a fit computed over them is
 * arithmetic rather than evidence. Three is the smallest number that can
 * disagree with itself.
 */
export const MIN_INTERVALS = 3;

/**
 * How close together two onsets have to be to be one chord rather than two
 * events. A judgement: a chord struck together lands inside about 30 ms and a
 * rolled one spreads further, and 50 ms keeps an ordinary sixteenth run at 125 ms
 * well clear of being merged.
 */
export const CHORD_MS = 50;

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

/** `{ bpm: null }` and a sentence, which is what *we do not know* looks like. */
const NO_TEMPO = Object.freeze({
  bpm: null, beatMs: 0, gridMs: 0, source: 'none', fit: 0, onsets: 0, intervals: 0,
  why: 'nothing has been played into a loop yet, so there is no tempo to report',
});

/**
 * Onset times with chords collapsed to one event each.
 *
 * ⚠️ IT MEASURES FROM THE LAST ONSET IT KEPT RATHER THAN FROM THE FIRST OF THE
 * GROUP, so a slowly rolled chord chains into one event and a steady run at more
 * than `chordMs` apart never merges at all. The other anchor has the opposite
 * failure, splitting a roll into three onsets that then read as a pulse three
 * times too fast, which is the worse of the two here because it invents rhythm
 * rather than losing some.
 */
export function groupOnsets(times, chordMs = CHORD_MS) {
  const gap = Math.max(0, Number(chordMs) || 0);
  const xs = [...(times || [])].map(Number).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  const out = [];
  for (const t of xs) if (!out.length || t - out[out.length - 1] > gap) out.push(t);
  return out;
}

/**
 * Basic tempo detection off the gaps between onsets.
 *
 * 🔴 THE MEDIAN GAP IS THE PULSE, AND THE MEDIAN IS WHAT MAKES SUBDIVISION FREE.
 * Somebody playing mostly eighths has a median of an eighth, so the fold lands on
 * the eighth and every quarter in the take is exactly two of them: an integer.
 * A mean would be dragged off by one rest at the end of a phrase.
 *
 * 🔴 AND IT REFUSES RATHER THAN GUESSING. Fewer than `MIN_INTERVALS` gaps, or a
 * fit under `MIN_FIT`, answers `source: 'none'` and `bpm: null`. **One note is
 * not a tempo and silence is not 120.** A confident wrong number here would be
 * copied into a readout and read as a measurement, which is the failure this
 * project keeps paying for.
 *
 * @param {number[]} onsetTimes  when each note started, in ms, any origin
 * @returns {{bpm:number|null, beatMs:number, gridMs:number, source:string,
 *            fit:number, onsets:number, intervals:number, why:string}}
 */
export function detectBpm(onsetTimes, { chordMs = CHORD_MS } = {}) {
  const onsets = groupOnsets(onsetTimes, chordMs);
  const gaps = [];
  for (let i = 1; i < onsets.length; i++) gaps.push(onsets[i] - onsets[i - 1]);
  const head = { onsets: onsets.length, intervals: gaps.length };
  if (gaps.length < MIN_INTERVALS) {
    return { ...NO_TEMPO, ...head,
      why: `${onsets.length} onset(s) is ${gaps.length} gap(s), and it takes `
         + `${MIN_INTERVALS} before two of them can disagree, so nothing here is a tempo` };
  }
  const sorted = [...gaps].sort((a, b) => a - b);
  const h = sorted.length / 2;
  let beat = sorted.length % 2 ? sorted[Math.floor(h)] : (sorted[h - 1] + sorted[h]) / 2;
  if (!(beat > 0)) {
    return { ...NO_TEMPO, ...head, why: 'every gap in this take measured zero, so there is no pulse in it' };
  }
  /* Fold into one octave. The guard is not defensive dressing: a gap of a
     microsecond would otherwise double for as long as the loop is allowed to
     run, and a stuck loop in a module with no browser is a hung harness. */
  const lo = 60000 / TEMPO_BAND[1], hi = 60000 / TEMPO_BAND[0];
  let guard = 0;
  while (beat < lo && guard++ < 40) beat *= 2;
  while (beat >= hi && guard++ < 40) beat /= 2;
  const hits = gaps.filter((g) => {
    const k = Math.round(g / beat);
    return k >= 1 && Math.abs(g - k * beat) <= TOL * beat;
  }).length;
  const fit = hits / gaps.length;
  const bpm = 60000 / beat;
  if (fit < MIN_FIT) {
    return { ...NO_TEMPO, ...head, fit,
      why: `the gaps land on a ${Math.round(bpm)} beat a minute pulse `
         + `${Math.round(fit * 100)} per cent of the time, and chance alone scores about `
         + `${Math.round(CHANCE * 100)}, so this take is not saying a tempo` };
  }
  return {
    bpm, beatMs: beat, gridMs: stepMsFor(bpm, 4), source: 'detected', fit, ...head,
    why: `${hits} of ${gaps.length} gaps land on a ${Math.round(bpm)} beat a minute pulse`,
  };
}

/**
 * Snap a raw lap onto an integer ratio of the unit, or refuse and say why.
 *
 * 🔴 THE DISTANCE IS MEASURED IN LOG SPACE, WHICH IS NOT A FLOURISH. A ratio set
 * is multiplicative, so a linear distance would put a take at 3.0 of the unit
 * nearer to 4 than to 2 by a mile and a take at 0.37 nearer to 1/2 than to 1/4
 * by a hair, biasing every single choice toward the large end of the set.
 *
 * @returns {{ratio:number|null, label:string, lap:number, stretch:number,
 *            snapped:boolean, why:string}}
 */
export function snapRatio(rawMs, unitMs) {
  const raw = Number(rawMs) || 0, unit = Number(unitMs) || 0;
  const labels = RATIOS.map((x) => x.label).join(', ');
  if (!(raw > 0) || !(unit > 0)) {
    return { ratio: null, label: '', lap: Math.round(raw), stretch: 1, snapped: false,
      why: 'a lap of no length has no ratio to anything' };
  }
  const want = raw / unit;
  let best = RATIOS[0];
  for (const x of RATIOS) {
    if (Math.abs(Math.log(want / x.r)) < Math.abs(Math.log(want / best.r))) best = x;
  }
  const lap = Math.round(unit * best.r);
  const stretch = lap > raw ? lap / raw : raw / lap;
  if (stretch > MAX_STRETCH) {
    return { ratio: null, label: '', lap: Math.round(raw), stretch, snapped: false,
      why: `this take is ${want.toFixed(2)} times the unit, and the nearest of ${labels} `
         + `would move it by ${Math.round((stretch - 1) * 100)} per cent, past the `
         + `${Math.round((MAX_STRETCH - 1) * 100)} per cent this will stretch a performance, `
         + 'so it keeps the length it was played at and will drift' };
  }
  return { ratio: best.r, label: best.label, lap, stretch, snapped: true,
    why: `${best.label} times the unit, which moved the take by `
       + `${Math.round((stretch - 1) * 100)} per cent` };
}

/**
 * Pull times onto a grid, by a strength.
 *
 * 🔴 IT IS OPT IN AND ITS DEFAULT STRENGTH IS 0, WHICH IS THE OPPOSITE OF THE
 * ALIGNMENT RULE ABOVE AND IS DELIBERATE. `keyboard.mjs` already says the lap is
 * the take and that *"rounding to a beat would invent a grid nobody set"*. That
 * is right about the NOTES: moving somebody's playing is changing the
 * performance, and nobody asked for that. It is wrong about the LAP, because two
 * laps that are not an integer ratio apart audibly walk away from each other, and
 * hearing that is the complaint this whole entry exists to answer. So the lap is
 * aligned by default and the notes are left exactly where they were played
 * unless a caller asks.
 * ⚠️ A STRENGTH RATHER THAN A SWITCH, so a caller can take half the error out and
 * keep the feel, which is what every quantise control a player has met does.
 */
export function quantiseTimes(times, gridMs, strength = 0) {
  const g = Number(gridMs) || 0;
  const s = Math.max(0, Math.min(1, Number(strength) || 0));
  const xs = [...(times || [])].map((t) => Number(t) || 0);
  if (!(g > 0) || !s) return xs;
  return xs.map((t) => t + (Math.round(t / g) * g - t) * s);
}

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
 * @param {boolean} [o.align]    snap every lap after the first onto an integer
 *   ratio of it. ⚠️ ON BY DEFAULT, unlike the note quantise, because two laps
 *   that are not an integer ratio apart walk away from each other and hearing
 *   that is the whole of what was asked for. Off is for a caller that wants ten
 *   independent free takes, which is what this was before 2026-09-25.
 * @param {number} [o.chordMs]   how close two onsets have to be to be one chord.
 * @returns {{press, release, settle, state, states, held, clear, clearAll,
 *            pending, destroy, slots, doubleMs, fitLap, lap, unit, tempo,
 *            assume, releaseUnit, align}}
 */
export function createNumLoop({
  slots = 10, doubleMs = 250, onEnter = () => {}, onTouch = () => {},
  align = true, chordMs = CHORD_MS,
} = {}) {
  if (!Number.isInteger(slots) || slots < 1) throw new Error('a numloop needs at least one slot');
  const state = Array.from({ length: slots }, () => 'empty');
  /** slot -> the timer holding its press back, or 0 */
  const waiting = new Array(slots).fill(0);
  /** slot -> the lap this slot settled on, or 0 while it holds nothing */
  const laps = new Array(slots).fill(0);

  let unitMs = 0, unitFrom = -1;
  let tune = { ...NO_TEMPO };

  const ok = (i) => Number.isInteger(i) && i >= 0 && i < slots;

  /**
   * 🔴 WHAT HAPPENS TO THE UNIT WHEN THE LOOP THAT SET IT IS CLEARED, WHICH IS A
   * DECISION AND AN UNSTATED ONE IS A BUG WAITING. **The unit SURVIVES its own
   * slot being cleared, and is released only when every slot is empty.**
   *  - Releasing it with its slot would mean clearing loop 1 silently changed
   *    what loop 3 gets aligned to next, while loop 3 is still playing and
   *    still in the old time base. Two loops in two time bases with nothing on
   *    screen saying so is the drift this feature exists to remove, arriving by
   *    the back door.
   *  - Moving it to the next surviving loop is worse rather than safer. That
   *    loop's lap is ALREADY a ratio of the unit, so re-basing onto it is either
   *    a no-op or a factor of two, which changes nothing anybody can hear and
   *    changes every later snap for a reason nobody can see.
   *  - Every slot being empty is the one moment a player unambiguously means
   *    start again, so that is where the unit and the tempo both go.
   * ⚠️ AND A DOUBLE PRESS ON AN EMPTY SLOT DOES NOT RELEASE IT, because that
   * gesture STOPS the other loops and never clears them. It is about what you
   * can hear, and the module already says so above.
   */
  const forget = (i) => {
    laps[i] = 0;
    if (unitMs && !laps.some((v) => v > 0)) { unitMs = 0; unitFrom = -1; tune = { ...NO_TEMPO }; }
  };

  /* ⚠️ THE BOOKS ARE CLOSED BEFORE THE CALLBACK RUNS, which is this file's own
     lesson one method along: `onTouch` used to fire before the press was booked
     and a page reading `pending()` inside it saw false. A page reading `unit()`
     inside `onEnter` for the slot that just emptied would read the same lie. */
  const enter = (i, next) => {
    const was = state[i];
    if (was === next) return;
    state[i] = next;
    if (next === 'empty') forget(i);
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
      /* 🔴 THE FORGET IS REPEATED HERE ON PURPOSE AND IT WAS A REAL HOLE.
         `enter` returns early when the state is not changing, so a slot already
         reading `empty` that still held a lap kept it, and the unit then
         outlived every loop in the bank. Found by the check below on its first
         run, which cleared three slots and read the unit still standing.
         ⚠️ THE STATE AND THE LAP ARE TWO BOOKS AND THEY CAN DISAGREE. In
         `keyboard.mjs` they never do, because `fitLap` is called from inside the
         move into `looping`. A contract that holds only while one caller is
         careful is not a contract, so clearing a slot forgets its lap whatever
         the state machine thought was going on. */
      forget(i);
    },
    clearAll() { for (let i = 0; i < slots; i++) this.clear(i); },
    destroy() { for (let i = 0; i < slots; i++) if (waiting[i]) clearTimeout(waiting[i]); },

    /**
     * 🔴 THE ONE CALL A CALLER MAKES WHEN IT CLOSES A TAKE. It hands over the lap
     * it measured and the onset times inside that take, and gets back the lap to
     * use plus a full account of how that number was reached. It is the only
     * method here that changes the tempo or the unit.
     *
     * ⚠️ IT TAKES ONSETS RATHER THAN READING A TAPE, because this module has never
     * known what a note is and gains nothing by starting. In `keyboard.mjs` that
     * list is `t.tape.filter((e) => e.down).map((e) => e.t)`.
     *
     * ⚠️ THE FIRST LOOP KEEPS THE LENGTH IT WAS PLAYED AT. It is the unit, so
     * there is nothing above it to align to, and rounding it to a whole number of
     * beats would change the take that every later one is measured against on the
     * strength of a tempo that was inferred from it. `tempo().unitBeats` reports
     * how many beats it came to and lets a reader judge the detection instead.
     *
     * @param {number} i
     * @param {number} rawMs  the take's own length, floors already applied
     * @param {object} [o]
     * @param {number[]} [o.onsets]  when each note in the take started
     * @returns {{lap:number, raw:number, unit:number, ratio:number|null,
     *            label:string, stretch:number, snapped:boolean, first:boolean,
     *            why:string}|null}
     */
    fitLap(i, rawMs, { onsets = [] } = {}) {
      if (!ok(i)) return null;
      const raw = Math.max(0, Math.round(Number(rawMs) || 0));
      /* 🔴 THE TEMPO IS FOUND ONCE AND NEVER REPLACED. A take that finds one when
         none was known fills it in, which is how a first loop of two chords and a
         second of a full phrase behaves sensibly. A later take may NOT overwrite
         a tempo that is already there: the unit does not move, so a changed
         number would silently re-label every reading a reader has already seen
         and would not change one thing that is audible. */
      if (tune.source === 'none' && onsets.length) {
        const t = detectBpm(onsets, { chordMs });
        tune = t.source === 'detected' ? t : { ...t };
      }
      if (!(raw > 0)) {
        return { lap: raw, raw, unit: unitMs, ratio: null, label: '', stretch: 1,
          snapped: false, first: false, why: 'a take of no length sets nothing and aligns to nothing' };
      }
      if (!unitMs) {
        unitMs = raw; unitFrom = i; laps[i] = raw;
        return { lap: raw, raw, unit: raw, ratio: 1, label: '1', stretch: 1,
          snapped: false, first: true,
          why: 'this is the first loop, so it sets the unit and keeps the length it was played at' };
      }
      if (!align) {
        laps[i] = raw;
        return { lap: raw, raw, unit: unitMs, ratio: null, label: '', stretch: 1,
          snapped: false, first: false, why: 'aligning is switched off on this looper' };
      }
      const s = snapRatio(raw, unitMs);
      laps[i] = s.lap;
      return { ...s, raw, unit: unitMs, first: false };
    },

    /** what lap this slot settled on, or 0 while it holds nothing */
    lap: (i) => (ok(i) ? laps[i] : 0),

    /**
     * The length every later loop is aligned to, and which slot set it.
     * `null` while nothing has been recorded.
     */
    unit: () => (unitMs
      ? { ms: unitMs, from: unitFrom, beats: tune.beatMs ? unitMs / tune.beatMs : null }
      : null),

    /**
     * 🔴 WHETHER THE TEMPO WAS DETECTED, GIVEN OR IS SIMPLY NOT KNOWN, WHICH IS
     * THE PART A READOUT MAY NOT DROP. `source` is one of:
     *   `detected`  measured off the gaps in a take, with `fit` saying how well
     *   `given`     a page with a real clock said so, and nothing here guessed
     *   `none`      `bpm` is null and `why` says what was missing
     * ⚠️ `unitBeats` IS THE SECOND, INDEPENDENT READING and is deliberately not
     * fed back into `bpm`. Near a whole number it corroborates the detection;
     * far from one it argues with it, and a reader can see which.
     */
    tempo: () => ({
      ...tune,
      unitBeats: unitMs && tune.beatMs ? unitMs / tune.beatMs : null,
    }),

    /**
     * A page that already knows the tempo says so, and then nothing here is
     * inferring anything. `step-grid.mjs`'s `clock.bpm()` is the caller this
     * exists for.
     */
    assume(bpm) {
      const b = Number(bpm);
      if (!(b > 0)) return null;
      tune = { bpm: b, beatMs: 60000 / b, gridMs: stepMsFor(b, 4), source: 'given',
        fit: 1, onsets: 0, intervals: 0,
        why: 'the page said what the tempo is, so nothing here is guessing' };
      return tune.bpm;
    },

    /** Drop the unit and the tempo on purpose, without clearing any slot. */
    releaseUnit() { unitMs = 0; unitFrom = -1; tune = { ...NO_TEMPO }; },

    slots,
    doubleMs,
    align,
  };
}
