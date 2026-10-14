// demo/shell/numloop.mjs: ten independent loop slots on ten number keys. Press: empty, recording,
// looping, stopped, looping...; a double press clears. A press is held `doubleMs` so a double is
// not two singles first; `onTouch` lights at once. No audio, no clock: graded without a browser.
// why: lessons/kit-numloop.md#header

// One tempo conversion in the project: step-grid.mjs's stepMsFor. The import costs 3 ms, no DOM.
// why: lessons/kit-numloop.md#step-ms-import
import { stepMsFor } from './step-grid.mjs';

/** The four states, in the order a slot walks them. */
export const STATES = ['empty', 'recording', 'looping', 'stopped'];

/**
 * The allowed lap ratios: powers of two from 1/4 to 4. Thirds are refused: the kit is in four,
 * and a set with 1/3 and 1/2 cannot snap predictably.
 * why: lessons/kit-numloop.md#ratios
 */
export const RATIOS = [
  { r: 1 / 4, label: '1/4' },
  { r: 1 / 2, label: '1/2' },
  { r: 1, label: '1' },
  { r: 2, label: '2' },
  { r: 4, label: '4' },
];

/**
 * How far a take may be stretched to reach a ratio; past it the snap is refused.
 * 1.30 lets a four beat loop closed a beat late land; worst squeeze 23 per cent.
 * why: lessons/kit-numloop.md#max-stretch
 */
export const MAX_STRETCH = 1.30;

/**
 * Where a detected beat is folded to, in bpm: the octave around 120. Must be exactly one octave.
 * why: lessons/kit-numloop.md#tempo-band
 */
export const TEMPO_BAND = [80, 160];

/**
 * How close a gap must be to a beat, as a fraction of the beat. A rhythmless take scores
 * about CHANCE, so MIN_FIT is twice that (measured in numloop-test.mjs).
 * why: lessons/kit-numloop.md#tol
 */
export const TOL = 0.15;
export const CHANCE = 2 * TOL;
export const MIN_FIT = 0.6;

/**
 * Three gaps before anything is a tempo: two always fit some pulse.
 * why: lessons/kit-numloop.md#min-intervals
 */
export const MIN_INTERVALS = 3;

/**
 * Onsets closer than this are one chord: struck chords land inside about 30 ms, a
 * sixteenth run at 125 ms stays clear.
 * why: lessons/kit-numloop.md#chord-ms
 */
export const CHORD_MS = 50;

/**
 * What one more press does to a slot. `stopped` goes back to `looping`, never `empty`.
 * why: lessons/kit-numloop.md#next
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
 * Onset times with chords collapsed. Measures from the last kept onset, so a roll chains
 * into one event rather than inventing a fast pulse.
 * why: lessons/kit-numloop.md#group-onsets
 */
export function groupOnsets(times, chordMs = CHORD_MS) {
  const gap = Math.max(0, Number(chordMs) || 0);
  const xs = [...(times || [])].map(Number).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  const out = [];
  for (const t of xs) if (!out.length || t - out[out.length - 1] > gap) out.push(t);
  return out;
}

/**
 * Tempo off the median gap between onsets; refuses (`source: 'none'`, `bpm: null`) rather than
 * guess. @param {number[]} onsetTimes  in ms. @returns {{bpm:number|null, beatMs:number,
 * gridMs:number, source:string, fit:number, onsets:number, intervals:number, why:string}}
 * why: lessons/kit-numloop.md#detect-bpm
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
 * Snap a raw lap onto a ratio of the unit, or refuse and say why. Distance is in log space.
 * @returns {{ratio:number|null, label:string, lap:number, stretch:number, snapped:boolean, why:string}}
 * why: lessons/kit-numloop.md#snap-ratio
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
 * Pull times onto a grid by a strength. Opt in, default 0: the lap is aligned, the notes
 * stay where they were played unless a caller asks.
 * why: lessons/kit-numloop.md#quantise-times
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
 * @param {number} [o.doubleMs]  how long a press waits to learn whether it is half of a double
 *   one; 250 ms, a guess (most desktops), tried on /num/.
 * @param {(i:number, state:string, o:{was:string})=>void} [o.onEnter]  a slot changed state
 * @param {(i:number)=>void} [o.onTouch]  a key went down, immediately. For the lamp only.
 * @param {boolean} [o.align]    snap every lap after the first onto a ratio of it. On by default.
 * @param {number} [o.chordMs]   how close two onsets have to be to be one chord.
 * @returns {{press, release, settle, state, states, held, clear, clearAll,
 *            pending, destroy, slots, doubleMs, fitLap, lap, unit, tempo,
 *            assume, releaseUnit, align}}
 * why: lessons/kit-numloop.md#create-num-loop
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
   * The unit survives its own slot being cleared and is released only when every slot is empty.
   * A double press on an empty slot stops others, never clears, so it does not release it.
   * why: lessons/kit-numloop.md#forget
   */
  const forget = (i) => {
    laps[i] = 0;
    if (unitMs && !laps.some((v) => v > 0)) { unitMs = 0; unitFrom = -1; tune = { ...NO_TEMPO }; }
  };

  // Books are closed before the callback runs, so `unit()` inside onEnter reads the truth.
  // why: lessons/kit-numloop.md#enter
  const enter = (i, next) => {
    const was = state[i];
    if (was === next) return;
    state[i] = next;
    if (next === 'empty') forget(i);
    onEnter(i, next, { was });
  };

  return {
    /**
     * A number key went down: the touch is reported at once, the state committed late.
     * why: lessons/kit-numloop.md#press
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
         * A double press on a full slot clears it; on an empty slot it stops the other loops
         * (never clears them) and starts recording.
         * why: lessons/kit-numloop.md#press-double
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
      // Touch reported after the press is booked, so `pending()` inside onTouch reads true.
      // why: lessons/kit-numloop.md#press-touch-order
      onTouch(i);
    },
    /** Nothing to do on release, and it is here so a caller can wire both and
     *  not wonder which one the machine wanted. */
    release() {},
    /**
     * Run a held press now: only for a caller that knows no second press is coming.
     * why: lessons/kit-numloop.md#settle
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
      // Forget repeated on purpose: `enter` returns early on no change, and state and lap can disagree.
      // why: lessons/kit-numloop.md#clear-forget
      forget(i);
    },
    clearAll() { for (let i = 0; i < slots; i++) this.clear(i); },
    destroy() { for (let i = 0; i < slots; i++) if (waiting[i]) clearTimeout(waiting[i]); },

    /**
     * Closes a take: hands over its lap and onsets, gets back the lap to use and how it was reached.
     * The only method that changes tempo or unit. The first loop keeps the length it was played at.
     * @param {number} i
     * @param {number} rawMs  the take's own length, floors already applied
     * @param {object} [o]
     * @param {number[]} [o.onsets]  when each note in the take started
     * @returns {{lap:number, raw:number, unit:number, ratio:number|null,
     *            label:string, stretch:number, snapped:boolean, first:boolean,
     *            why:string}|null}
     * why: lessons/kit-numloop.md#fit-lap
     */
    fitLap(i, rawMs, { onsets = [] } = {}) {
      if (!ok(i)) return null;
      const raw = Math.max(0, Math.round(Number(rawMs) || 0));
      // Tempo is found once and never replaced; the unit does not move, so a new number only relabels.
      // why: lessons/kit-numloop.md#fit-lap-tempo-once
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
     * `source` is detected, given or none (bpm null, `why` says what was missing).
     * `unitBeats` is a second, independent reading and is never fed back into `bpm`.
     * why: lessons/kit-numloop.md#tempo
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
