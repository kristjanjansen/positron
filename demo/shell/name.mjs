// demo/shell/name.mjs: notes into a chord name, and which you keep playing (node demo/shell/name-test.mjs).
// Template matching with a margin: 88.0 per cent right outright, 100.0 per cent on the 72.0 per cent it
// speaks about. Timing defaults are guesses. No audio, no DOM.
// why: lessons/kit-name.md#header

import { noteName, parseChord } from './chords.mjs';

// The letters come from chords.mjs so the two tables cannot disagree; noteName(60) is C4.
// why: lessons/kit-name.md#note-letters
export const NOTE_LETTERS =
  Array.from({ length: 12 }, (_, pc) => noteName(60 + pc).slice(0, -1));
const PC_NAME = NOTE_LETTERS;

/**
 * Eleven qualities as 12 bit pitch class masks, root at bit 0, ordered by how likely a chord is
 * (min7 above min7b5). No sixths or dim7: they drop the confident rate from 72.0 to 32.8 per cent.
 * why: lessons/kit-name.md#recognised
 */
export const RECOGNISED = [
  ['maj', 0b000010010001],
  ['min', 0b000010001001],
  ['7', 0b010010010001],
  ['min7', 0b010010001001],
  ['maj7', 0b100010010001],
  ['sus4', 0b000010100001],
  ['sus2', 0b000010000101],
  ['dim', 0b000001001001],
  ['min7b5', 0b010001001001],
  ['aug', 0b000100010001],
  ['5', 0b000010000001],
];

/**
 * The three free numbers were swept. A bass bonus of 1.0 raises coverage to 75.0 per cent and drops
 * precision to 77.1, so 0.5.
 * why: lessons/kit-name.md#bass-weight
 */
export const BASS_WEIGHT = 0.5;
/** A template tone nobody played costs one point. At or below 1.0 a four note
 *  chord with three tones present still beats a three note chord with three
 *  tones present and one note it cannot explain, which is what gets an omitted
 *  fifth right 80.0 per cent of the time. */
export const MISSING_WEIGHT = 1.0;
/** How far the best reading must beat the second before the page will say it
 *  out loud. MEASURED at 1.0: never wrong, and speaks 72.0 per cent of the
 *  time. */
export const MARGIN = 1.0;

/**
 * Popcount table: a call takes 0.30 microseconds, so the page can name on every note change.
 * why: lessons/kit-name.md#pop
 */
const POP = new Uint8Array(4096);
for (let i = 1; i < 4096; i++) POP[i] = POP[i >> 1] + (i & 1);

const rot = (mask, by) => (((mask << by) | (mask >>> (12 - by))) & 0xfff);
const pcOf = (n) => (((n % 12) + 12) % 12);

/**
 * Name whatever is being held.
 * @param {number[]} notes MIDI note numbers, any order, any doublings
 * @param {object} [o] bassWeight, missingWeight, margin
 * @returns {{ ok, sure, name, root, quality, bass, over, label, margin, score, extra, alts }} over is the
 *   bass letter when it is not the root, reported beside the name, never folded in.
 * why: lessons/kit-name.md#name-chord
 */
export function nameChord(notes, { bassWeight = BASS_WEIGHT,
                                   missingWeight = MISSING_WEIGHT,
                                   margin = MARGIN } = {}) {
  const list = (notes || []).filter((n) => Number.isFinite(n));
  if (!list.length) {
    return { ok: false, sure: false, name: '', label: '', root: -1, quality: '',
      bass: null, over: null, margin: 0, score: 0, extra: 0, alts: [] };
  }
  let held = 0, low = Infinity;
  for (const n of list) { held |= 1 << pcOf(n); if (n < low) low = n; }
  const bass = pcOf(low);
  const heldCount = POP[held];

  const scoreOf = (t) => {
    const matched = POP[held & t];
    return matched - missingWeight * (POP[t] - matched) - (heldCount - matched);
  };

  // Ties go to the earlier quality, then the lower root. A bare fifth is out of the running once three
  // different notes are down: G2 D3 E3 G3 read as Emin7 or G5 and named nothing.
  // why: lessons/kit-name.md#bare-fifth
  const bare = RECOGNISED.findIndex(([q]) => q === '5');
  const skipBare = heldCount >= 3 && bare >= 0;

  let bestScore = -Infinity, bestQ = 0, bestR = 0;
  for (let qi = 0; qi < RECOGNISED.length; qi++) {
    if (skipBare && qi === bare) continue;
    const mask = RECOGNISED[qi][1];
    for (let r = 0; r < 12; r++) {
      const score = scoreOf(rot(mask, r)) + (r === bass ? bassWeight : 0);
      if (score > bestScore) { bestScore = score; bestQ = qi; bestR = r; }
    }
  }

  /**
   * A same-size rival that differs from the winner only in notes nobody played does not block confidence
   * (D E G scored Emin7 and Emin7b5 equal 30 times). Identical pitch class sets still block each other.
   * why: lessons/kit-name.md#unheard-rival
   */
  const bestT = rot(RECOGNISED[bestQ][1], bestR);
  // Only when three of the winner's own tones are held: two notes do not pin a chord down.
  // why: lessons/kit-name.md#stated
  const stated = POP[held & bestT] >= 3;
  let nextScore = -Infinity, nextQ = bestQ, nextR = bestR;
  for (let qi = 0; qi < RECOGNISED.length; qi++) {
    if (skipBare && qi === bare) continue;
    const mask = RECOGNISED[qi][1];
    for (let r = 0; r < 12; r++) {
      if (qi === bestQ && r === bestR) continue;
      const t = rot(mask, r);
      const differs = bestT ^ t;
      /* Same pitch classes, different name: a real ambiguity, it blocks.
         Different pitch classes, none of them played: nothing to hear, it does
         not block. Otherwise it is an ordinary rival. */
      if (stated && differs !== 0 && (differs & held) === 0 && POP[t] === POP[bestT]) continue;
      const score = scoreOf(t) + (r === bass ? bassWeight : 0);
      if (score > nextScore) { nextScore = score; nextQ = qi; nextR = r; }
    }
  }

  const say = (qi, r) => `${PC_NAME[r]}${RECOGNISED[qi][0]}`;
  const extra = heldCount - POP[held & bestT];
  const gap = bestScore - nextScore;
  const over = bass === bestR ? null : PC_NAME[bass];
  const name = say(bestQ, bestR);
  return {
    ok: true,
    sure: gap >= margin,
    name,
    label: over ? `${name}/${over}` : name,
    root: bestR,
    quality: RECOGNISED[bestQ][0],
    bass,
    over,
    margin: gap,
    score: bestScore,
    extra,
    // Two names and no verdict is the answer below the margin, not a failure state.
    // why: lessons/kit-name.md#two-names
    alts: [{ name, score: bestScore }, { name: say(nextQ, nextR), score: nextScore }],
  };
}

// ── when to believe an answer ───────────────────────────────────────────────

/**
 * The debounce for rolled chords. It settles on the largest set held during the window, not the set held
 * when the timer fires. Times come from the caller. Defaults are guesses.
 * @param {object} [o] windowMs (150 to 250 guessed), minNotes (two notes do not name a chord)
 * why: lessons/kit-name.md#create-settler
 */
export function createSettler({ windowMs = 200, minNotes = 3 } = {}) {
  let largest = [], last = 0, open = false;
  return {
    /**
     * The fingers changed. Returns when the window will be up, or null once the
     * hands are empty.
     */
    held(notes, at) {
      const n = (notes || []).slice().sort((a, b) => a - b);
      if (!n.length) { largest = []; open = false; return null; }
      if (!open || n.length > largest.length) largest = n;
      last = at;
      open = true;
      return last + windowMs;
    },
    /** The window is up. Hand back what was held at its widest, once. */
    settle(at) {
      if (!open || at < last + windowMs) return null;
      const notes = largest;
      largest = [];
      open = false;
      return { notes, enough: notes.length >= minNotes };
    },
    dueAt: () => (open ? last + windowMs : null),
    widest: () => largest.slice(),
    reset() { largest = []; open = false; },
    windowMs,
    minNotes,
  };
}

// ── which chords somebody keeps returning to ───────────────────────────────

/**
 * Chords you keep playing: a count of arrivals, each held at least minHoldMs, so passing chords never
 * accrue. An admitted row never moves or leaves; a full list says so rather than evicting.
 * @param {object} [o] times (2, a judgement), minHoldMs (400, a guess in the 200 to 800 ms band),
 *   slots (four to six)
 * why: lessons/kit-name.md#create-tally
 */
export function createTally({ times = 2, minHoldMs = 400, slots = 6 } = {}) {
  /** key -> milliseconds of holds that were long enough to count. */
  const banked = new Map();
  /** key -> how many separate holds got past the gate. This is the gate now. */
  const visits = new Map();
  const pinned = [];
  let live = null, since = 0, saidFull = false;

  // The live hold counts only once it is past the gate.
  // why: lessons/kit-name.md#live-ms
  const liveMs = (at) => {
    const held = at == null ? 0 : Math.max(0, at - since);
    return held >= minHoldMs ? held : 0;
  };
  const total = (key, at) => (banked.get(key) || 0) + (live === key ? liveMs(at) : 0);

  const closeOut = (at) => {
    if (live === null) return;
    const ms = liveMs(at);
    banked.set(live, (banked.get(live) || 0) + ms);
    // An arrival is banked only past the floor; liveMs returns 0 under it.
    // why: lessons/kit-name.md#bank-arrival
    if (ms > 0) visits.set(live, (visits.get(live) || 0) + 1);
    live = null;
  };
  /** Arrivals so far, counting the one under the fingers once it is past the
   *  floor. Same shape as `total`, for the same reason. */
  const seen = (key, at) => (visits.get(key) || 0)
    + (live === key && liveMs(at) > 0 ? 1 : 0);

  return {
    /** This chord is under the fingers from now. */
    hold(key, at) {
      if (live === key) return;
      closeOut(at);
      live = key;
      since = at;
    },
    /** Nothing is under the fingers any more. */
    release(at) { closeOut(at); },
    /**
     * Admit anything that has crossed the threshold. Returns what was newly
     * admitted and whether the list is full, so a page can say both.
     */
    check(at) {
      const ready = [];
      for (const key of new Set([...banked.keys(), ...(live ? [live] : [])])) {
        if (pinned.includes(key)) continue;
        if (seen(key, at) >= times) ready.push(key);
      }
      ready.sort((a, b) => total(b, at) - total(a, at));
      const admitted = [];
      let full = false;
      for (const key of ready) {
        if (pinned.length >= slots) { full = true; break; }
        pinned.push(key);
        admitted.push(key);
      }
      const sayFull = full && !saidFull;
      if (full) saidFull = true;
      return { admitted, full, sayFull };
    },
    /**
     * When the chord under the fingers would cross, or null; one timeout, no polling.
     * An absolute time that may be in the past, so a caller schedules max(0, dueAt - now).
     * why: lessons/kit-name.md#due-at
     */
    dueAt(at) {
      if (live === null || pinned.includes(live)) return null;
      // A count lands on an event: due at the floor if this is the last arrival needed, otherwise never.
      // why: lessons/kit-name.md#due-at-count
      return (visits.get(live) || 0) >= times - 1 ? since + minHoldMs : null;
    },
    msOf: (key, at) => total(key, at),
    /** How many times a chord has been arrived at and stayed with. */
    timesOf: (key, at) => seen(key, at),
    minHoldMs,
    /** The pinned list, in the order it was admitted. Never re-sorted. */
    rows: () => pinned.slice(),
    /** Everything seen, heaviest first. For a log line, never for the roll. */
    scores(at) {
      const out = [...new Set([...banked.keys(), ...(live ? [live] : [])])]
        .map((key) => ({ key, ms: total(key, at) }));
      out.sort((a, b) => b.ms - a.ms);
      return out;
    },
    held: () => live,
    times,
    slots,
  };
}

/**
 * The tally key: voicing and bass are thrown away, so every inversion of Cmaj is one entry.
 * why: lessons/kit-name.md#chord-key
 */
export const chordKey = (root, quality) => `${root}:${quality}`;
export const fromKey = (key) => {
  const [root, quality] = String(key).split(':');
  return { root: Number(root), quality, name: `${PC_NAME[Number(root)]}${quality}` };
};

/** The notes of a learned chord, so the roll can draw it. It goes back through
 *  `parseChord` rather than rebuilding a table, which is what keeps the two
 *  directions from drifting apart. */
export const notesOf = (key) => {
  const { name } = fromKey(key);
  const c = parseChord(name);
  return c.ok ? c.notes : [];
};
