// demo/shell/name.mjs. Notes into a chord name, and which of them you keep playing.
//
//   node demo/shell/name-test.mjs
//
// 🔴 THIS IS THE OPPOSITE DIRECTION FROM `chords.mjs` AND IT IS A DIFFERENT
// PROBLEM, NOT THE SAME ONE WITH THE ARROW TURNED ROUND. `parseChord('Cmaj')`
// is a table walk where every branch is decidable. Going the other way, some
// sets of notes simply do not have one name: MEASURED in
// `research/chord-learning-2026-09-23.md`, this repository's own `QUALITIES`
// table spells 288 chords over 223 distinct pitch class sets, and 120 of the
// 288 sit in a set that names more than one chord. `C6` and `Am7` are the same
// four notes. `Csus2` and `Gsus4` are the same three. A diminished seventh is
// four chords at once and an augmented triad is three.
//
// 🔴 SO THE VALUE OF THIS FILE IS THE MARGIN, NOT THE NAME. MEASURED over 600
// generated voicings of the eleven qualities people actually play: template
// matching gets 88.0 per cent right outright, and when it refuses to answer
// unless the best reading beats the second by a whole point it is 100.0 per
// cent right on the 72.0 per cent of cases it speaks about. `name-test.mjs`
// asserts exactly that and the idea dies if it goes red, because a page that
// names a chord wrongly with confidence is worse than one that says nothing.
//
// ⚠️ AND IT LIVES BESIDE `chords.mjs` RATHER THAN INSIDE IT, ON PURPOSE. That
// file's whole value is that it has no tunable weights in it. This one has
// three, and folding a scorer into a grammar would put them in the same 49
// checks. What is shared is the note letters and nothing else.
//
// ── THE FOUR THINGS THE RESEARCH MEASURED THAT DECIDE THIS FILE ────────────
//
// 1. 🔴 THE OBVIOUS RECOGNISER IS THE WORST ONE AND ITS FAILURE IS INVISIBLE.
//    Taking the lowest sounding note as the root scores **33.8 per cent**
//    overall, 100 per cent on root position triads and **exactly zero on every
//    inversion**. A page doing that works perfectly while somebody plays root
//    position with one hand and is wrong about everything the moment they voice
//    anything. Template matching with the bass worth 0.5 scores **82.4**.
// 2. 🔴 FEWER NAMES IS BETTER. Eleven qualities score 88.0 against the full
//    table's 82.0 and take the confident answer rate from 46 to 72 per cent.
//    The sixths and the diminished sevenths are the ones that poison it, so
//    they are not here and `C6` always reports as `Amin7`.
// 3. 🔴 THE RECOGNISER MUST NOT INHERIT THE PARSER'S ORDERING. `QUALITIES` in
//    `chords.mjs` is sorted longest name first so that `m7b5` is not read as
//    `m7` plus a stray `b5`, which is a fact about STRINGS. A recogniser needs
//    an order by how likely a chord is, which is a fact about MUSIC. MEASURED
//    as a live bug: `Cm7` with its fifth left out is `C Eb Bb`, which ties
//    `Cmin7` against `Cmin7b5` at 3 matched and 1 missing each, and the
//    parser's order hands it to `min7b5`.
// 4. 🔴 A MARGIN AND A SETTLING WINDOW ARE TWO MECHANISMS, NOT ONE. MEASURED at
//    every prefix of a rolled `Cmaj7`: after three notes the best reading is
//    `C` at a margin of 1.0, which is correct AND about to be replaced. A
//    recogniser with a margin is right at every instant and still changes its
//    mind, so `createSettler` names the LARGEST set held during a window rather
//    than the set held when the timer fires.
//
// 🔴 EVERY TIMING DEFAULT IN THIS FILE IS A GUESS AND IS MARKED AS ONE. Nobody
// has played this. The research's own section 8 says its timing numbers are
// synthetic, generated with a factor of ten between a passing chord and a held
// one BY CONSTRUCTION, so any gate between them worked. What has to be measured
// is a real session's histogram of hold times.
//
// ⚠️ WHAT COMES NEXT IS `suggest.mjs` AND NOT THIS FILE. A suggester reads
// what a recogniser named, so the two want one owner and two files: this one
// has a measurable ceiling and a right answer, and that one has neither.
//
// This file has no audio, no DOM and no browser in it, which is the bargain
// `chords-test.mjs`, `looper-test.mjs` and `pedal-test.mjs` already make.

import { noteName, parseChord } from './chords.mjs';

/* ⚠️ THE LETTERS COME OUT OF `chords.mjs` RATHER THAN BEING TYPED AGAIN. A
   shared table written twice is a table that will disagree, which is already
   recorded in `positron-ui` about a number in a stylesheet and a number in a
   page. `noteName(60)` is `C4`, so the octave comes off the end. */
export const NOTE_LETTERS =
  Array.from({ length: 12 }, (_, pc) => noteName(60 + pc).slice(0, -1));
const PC_NAME = NOTE_LETTERS;

/**
 * 🔴 ELEVEN QUALITIES, AS 12 BIT PITCH CLASS MASKS WITH THE ROOT AT BIT 0, AND
 * THE ORDER IS BY HOW LIKELY A CHORD IS RATHER THAN BY THE LENGTH OF ITS NAME.
 * See point 3 in the header. `min7` sits above `min7b5` because that one line
 * is the whole of the one real bug the research found in the obvious build.
 *
 * ⚠️ NO SIXTHS AND NO DIMINISHED SEVENTHS, WHICH IS A DECISION AND NOT AN
 * OMISSION. MEASURED: adding `maj6`, `min6` and `dim7` drops the confident
 * answer rate from 72.0 per cent to 32.8, because `C6` IS `Am7` and every
 * `dim7` inversion poisons the margin for its neighbours. A page that never
 * says `C6` and always says `Amin7` makes one arbitrary choice out loud, which
 * is better than a page that goes quiet two thirds of the time.
 * ⚠️ NO NINTHS, ELEVENTHS OR THIRTEENTHS EITHER. A ninth is a note the template
 * cannot explain, so `C E G D` still names as `Cmaj` with one note reported
 * outside it, which is true and useful. Putting `add9` in the list buys the
 * name and costs the coverage.
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
 * The three free numbers, named rather than buried, because every one of them
 * was swept and the sweep is the reason they are these values.
 *
 * 🔴 A BASS BONUS OF 1.0 IS THE TRAP AND IT LOOKS LIKE THE BEST OPTION.
 * MEASURED: it raises the confident answer rate from 32.8 to 75.0 per cent,
 * which reads as the recogniser becoming more useful, and it drops precision
 * from 100 per cent to 77.1. What it is doing is manufacturing a margin out of
 * a fact the margin has no business trusting. A weight that raises coverage and
 * lowers precision is not a tuning improvement, it is the page changing what it
 * is willing to lie about.
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
 * ⚠️ 4,096 BYTES OF RAM AND NO BYTES OF SOURCE. The first version of this
 * scorer built 132 objects and sorted them on every call and took **27.14
 * microseconds**; written this way it takes **0.30**. Neither number matters at
 * human pace and the gap is recorded because the obvious implementation is the
 * slow one. What 0.30 microseconds settles is a DESIGN question rather than a
 * performance one: the page can name the held notes on every note down and
 * every note up, so the settling window exists purely to decide when to BELIEVE
 * an answer and never to decide when to compute one.
 */
const POP = new Uint8Array(4096);
for (let i = 1; i < 4096; i++) POP[i] = POP[i >> 1] + (i & 1);

const rot = (mask, by) => (((mask << by) | (mask >>> (12 - by))) & 0xfff);
const pcOf = (n) => (((n % 12) + 12) % 12);

/**
 * Name whatever is being held.
 *
 * @param {number[]} notes  MIDI note numbers, in any order, with any doublings
 * @param {object} [o]
 * @param {number} [o.bassWeight]  see `BASS_WEIGHT`
 * @param {number} [o.missingWeight]
 * @param {number} [o.margin]
 * @returns {{
 *   ok: boolean,        were there any notes at all
 *   sure: boolean,      did the best reading beat the second by `margin`
 *   name: string,       `Cmaj`, `Amin7`, `C5`, spelled so `parseChord` reads it back
 *   root: number, quality: string,
 *   bass: number|null,  pitch class of the lowest note, or null
 *   over: string|null,  the bass LETTER when it is not the root, so the page can
 *                       write `C/G`. It is reported beside the name and never
 *                       folded into it, which is the rule `chords.mjs` already
 *                       keeps in the other direction.
 *   label: string,      `name` with `/bass` on it when there is one
 *   margin: number, score: number,
 *   extra: number,      notes the named chord cannot explain, as a count
 *   alts: Array<{name, score}>  the top two readings, for the unsure case
 * }}
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

  /* Ties go to the earlier quality and then to the lower root, which is why the
     order of `RECOGNISED` is a statement about music rather than an accident of
     the file. */
  /**
   * 🔴 A BARE FIFTH IS A TWO NOTE THING, AND LETTING IT COMPETE WITH REAL CHORDS
   * BLOCKS THEM. MEASURED 2026-09-23 on a take from this desk: `G2 D3 E3 G3`,
   * played as a chord, read as *"Emin7 or G5"* and went into the roll as
   * nothing. `G5` matches two of the three notes held with none missing, and it
   * takes the bass bonus because the hand had a G underneath, so it scores 1.5
   * against `Emin7`'s 2.0 and the margin never reaches 1.
   * ✅ SO `5` IS OUT OF THE RUNNING ONCE THREE DIFFERENT NOTES ARE DOWN. That is
   * a statement about music rather than a tuning: a power chord is a root and a
   * fifth, and a third note means somebody is playing a chord. It stays exactly
   * as it was for two notes, which is the one job it has and the one this
   * file's own check asserts.
   */
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
   * 🔴 A RIVAL ONLY COUNTS IF YOU COULD HEAR THE DIFFERENCE, AND THIS WAS
   * MEASURED ON A PERSON RATHER THAN REASONED ABOUT. 2026-09-23, on 63 seconds
   * of real playing recorded off the keyboard on this desk: 108 of 236 readings
   * came back unnameable, and **51 of those were one shape**. `D E G` scored
   * `Emin7` and `Emin7b5` DEAD EQUAL, thirty times, because what separates them
   * is a B against a B flat and neither was ever played. The page said *two
   * names and no verdict* about a distinction that did not exist.
   * ✅ SO A CANDIDATE THAT DIFFERS FROM THE WINNER ONLY IN NOTES NOBODY PLAYED
   * DOES NOT BLOCK CONFIDENCE. You cannot hear a flat five that is not there,
   * and refusing to name the chord does not make the page more honest, it makes
   * it quiet at the moment somebody played something perfectly ordinary.
   * 🔴 AND THE CASE THIS MUST NOT BREAK IS THE ONE THE PAGE IS PROUDEST OF.
   * `Caug` and `Eaug` are the SAME THREE PITCH CLASSES under a different name,
   * and so are `Csus2` and `Gsus4`, and all four inversions of a diminished
   * seventh. Those are real ambiguity and they still read as two names, because
   * the test below is about the pitch classes that DIFFER: where two candidates
   * cover an identical set, there is nothing unevidenced about their
   * disagreement, and they block each other exactly as before.
   * ⚠️ MEASURED BOTH WAYS on that take: `C D E F G` still refuses `Cmaj` against
   * `Csus4`, because the E and the F that separate them were both played.
   * 🔴 AND THE RIVAL HAS TO BE THE SAME SIZE, WHICH THE GUARD BELOW FOUND BY
   * GOING RED. Without that test the rule also waves away a rival that is
   * simply BIGGER, so two notes C and F read as a confident `F5` and twelve
   * generated `sus4 no fifth` cases became confidently wrong. A chord with
   * fewer notes in it is not a better reading of an incomplete one, it is a
   * smaller claim, and `at a margin of 1.0 the recogniser is never wrong` is
   * the assert this whole feature was made to rest on.
   */
  const bestT = rot(RECOGNISED[bestQ][1], bestR);
  /* 🔴 AND ONLY WHEN ENOUGH OF THE WINNER WAS ACTUALLY PLAYED, WHICH IS THE
     SECOND THING THE TESTS FOUND. The rule below waves away a rival whose
     disagreement with the winner is entirely in notes nobody played, and on two
     notes that is almost every rival: `C E` would confidently become `Cmaj`
     when it is equally `Cmaj7`, `C6`, `Caug` or `Amin`. The research already
     measured that from the other side, that of the 132 chords this vocabulary
     spells, a major third is in 10 of them and a perfect fifth in 13, so two
     notes do not pin a chord down.
     ✅ THREE OF THE WINNER'S OWN TONES HELD IS THE LINE, and it is the fifth
     being the omittable one that makes it musical rather than arbitrary: a
     seventh chord with its root, third and seventh down is stated, and the
     fifth is the note players drop. `D E G` has three and is rescued; `C E` has
     two and stays two names and no verdict. */
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
    /* 🔴 TWO NAMES AND NO VERDICT IS WHAT THE PAGE SHOWS BELOW THE MARGIN, and
       that is not a failure state. `Caug or Eaug` is the truth about three
       notes that really are three chords, and it is more interesting than a
       wrong single answer. */
    alts: [{ name, score: bestScore }, { name: say(nextQ, nextR), score: nextScore }],
  };
}

// ── when to believe an answer ───────────────────────────────────────────────

/**
 * 🔴 A ROLLED CHORD GIVES YOU ITS NOTES AT FOUR DIFFERENT INSTANTS AND THE
 * RECOGNISER'S ANSWER CHANGES AT EACH ONE. This is the debounce, and the one
 * thing about it that is not obvious is that it settles on the LARGEST set held
 * during the window rather than the set held when the timer fires. Lifting
 * three fingers unevenly walks the reading back down through `C E G`, `C E`,
 * `C` on the way to silence, and every one of those is a legitimate reading of
 * what is held. One extra variable removes the whole class.
 *
 * ⚠️ A GESTURE ENDS WHEN THE HANDS EMPTY OR WHEN THE WINDOW FIRES, and between
 * those two the largest set is only ever replaced by a LARGER one. The cost is
 * stated rather than hidden: a player who changes chord without ever lifting
 * every finger can union two chords inside one window. UNMEASURED, because
 * nobody has played this.
 *
 * ⚠️ AND IT TAKES ITS TIMES FROM THE CALLER RATHER THAN READING A CLOCK, which
 * is what makes it gradable with no browser in it. The page owns the timer.
 *
 * @param {object} [o]
 * @param {number} [o.windowMs] 150 to 250 is the research's starting GUESS: a
 *   rolled chord is said to spread over 30 to 120 ms and a chord change at 100
 *   beats a minute is 600 ms apart. **Both ends of that gap are guesses.**
 * @param {number} [o.minNotes] Two notes do not name a chord. MEASURED over the
 *   132 chords this vocabulary spells, a perfect fifth is in 13 of them and a
 *   major third is in 10, so the only dyad worth naming is a bare fifth, which
 *   the arithmetic already reaches on its own.
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
 * 🔴 THE TALLY COUNTS TIME HELD, NOT EVENTS, AND THIS IS THE ONE PLACE THE
 * OBVIOUS IMPLEMENTATION IS SIMPLY WRONG. MEASURED on a synthetic session of 66
 * chord events, four loop chords held 1.2 to 1.8 s and passing chords held 0.09
 * to 0.25 s: **by raw event count the top four are `C(10) G(10) C7(10) Am(10)`
 * and `C7` is a passing chord**, while by time held they are `Am 15.4s G 15.0s
 * F 14.9s C 14.0s` with every passing chord under 1.6 s. A chord you pass
 * through on the way somewhere is, by construction, a chord you keep arriving
 * at. What separates it from one you mean is how long you stay.
 * ⚠️ VISIT COUNT IS THE SAME NUMBER AS RAW COUNT HERE AND IS WRONG THE SAME
 * WAY, which is worth knowing because it is the obvious repair.
 *
 * 🔴 AND A ROW NEVER MOVES AND NEVER LEAVES. MEASURED on a 100 event session
 * where the player changes loop halfway: a top four list re-sorted on every
 * chord **changes 29 times, 22 of which are pure re-sorts** with the same four
 * rows swapping places under the reader's eye. Admitted once and pinned, it
 * changes **4 times, all of them appends**. `positron-ui` already governs this:
 * nothing that redraws while somebody is looking may change how much room it
 * takes, and a pure re-sort is the worst version of that because nothing new
 * happened.
 *
 * ⚠️ AND A FULL LIST SAYS SO RATHER THAN EVICTING. A roll that silently stopped
 * learning would look broken.
 *
 * @param {object} [o]
 * 🔴 AND A TOTAL ON ITS OWN ADMITS EVERYTHING EVENTUALLY, WHICH THE RESEARCH
 * DID NOT MEASURE BECAUSE IT SCORED A TOP FOUR RATHER THAN A THRESHOLD.
 * MEASURED here while building it, on a synthetic session where two passing
 * chords are played FOUR times a bar at 150 ms and four loop chords once a bar
 * at 1,400: over eight bars the loop chords bank 11.2 s and the passing chords
 * bank **4.8 s**, so a 2,000 ms threshold lets both in. Ranked, the top four
 * are right; admitted, all six arrive. **A top four list and an admission
 * threshold are not the same mechanism and the second one needs a second
 * gate.**
 * ✅ THE GATE IS THE OTHER SCORING THE RESEARCH ALREADY MEASURED AT 4 OF 4:
 * *count of events held longer than 200 ms*. A hold shorter than `minHoldMs`
 * banks nothing at all, so a chord you only ever pass through never accrues,
 * however often you arrive at it. With it the same session admits exactly the
 * four loop chords.
 * ⚠️ AND THE RESEARCH'S WARNING ABOUT THIS NUMBER STANDS UNCHANGED: its sweep
 * found every gate from 200 to 800 ms working, and said so itself, BECAUSE it
 * generated passing chords under 250 ms and loop chords over 1,200. The gap was
 * there by construction. **If a real player's gap is a factor of two rather
 * than ten, this gate is a much harder choice and might not exist.**
 *
 * 🔴 AND THE GATE IS A COUNT OF VISITS, NOT A TOTAL OF TIME. Asked 2026-09-23:
 * *"just monitor what i play and save repeating ones"*. A total admits a chord
 * you rested on once while you were thinking, which is the commonest thing a
 * pair of hands does and the opposite of a chord you came back to. Counting
 * ARRIVALS says what was asked for, and the time floor above is what makes an
 * arrival real, so a chord you only pass through still never accrues however
 * often you pass through it.
 * ⚠️ THE RESEARCH MEASURED RAW COUNT FAILING AND THIS IS NOT THAT. It found
 * count and visit count both putting a PASSING chord in the top four, on data
 * whose gap between held and passing was a factor of ten by construction, and
 * it said so. Count with a floor under it is strictly better than either, and
 * nobody has played any of it.
 *
 * @param {number} [o.times] 🔴 A JUDGEMENT. 2, because *repeating* in its
 *   plainest reading is played, left, played again, and three arrivals before
 *   anything appears makes a mode that looks broken for its first minute.
 * @param {number} [o.minHoldMs] 🔴 A GUESS, in the middle of the 200 to 800 ms
 *   band the research swept. A hold shorter than this is a chord you were on
 *   your way through, and it counts as no arrival at all.
 * @param {number} [o.slots] four to six, per the research.
 */
export function createTally({ times = 2, minHoldMs = 400, slots = 6 } = {}) {
  /** key -> milliseconds of holds that were long enough to count. */
  const banked = new Map();
  /** key -> how many separate holds got past the gate. This is the gate now. */
  const visits = new Map();
  const pinned = [];
  let live = null, since = 0, saidFull = false;

  /* ⚠️ THE LIVE HOLD COUNTS ONLY ONCE IT IS PAST THE GATE, or a chord would be
     admitted a moment before the page had decided it was being held on purpose,
     and then the gate would be a thing that only applies to history. */
  const liveMs = (at) => {
    const held = at == null ? 0 : Math.max(0, at - since);
    return held >= minHoldMs ? held : 0;
  };
  const total = (key, at) => (banked.get(key) || 0) + (live === key ? liveMs(at) : 0);

  const closeOut = (at) => {
    if (live === null) return;
    const ms = liveMs(at);
    banked.set(live, (banked.get(live) || 0) + ms);
    /* ⚠️ AN ARRIVAL IS BANKED ONLY IF IT GOT PAST THE FLOOR, which is the whole
       difference between this and counting events. `liveMs` already returns 0
       for a hold under the gate, so one test covers both. */
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
     * When the chord under the fingers would cross, or null. One timeout, no
     * polling, which is what keeps this free for a visitor doing nothing.
     * ⚠️ IT IS AN ABSOLUTE TIME AND IT CAN BE IN THE PAST, which is what a
     * caller wants: a page schedules `max(0, dueAt - now)` and a moment already
     * gone fires straight away. Returning `at` instead would hide how late it
     * is from anything reading it.
     */
    dueAt(at) {
      if (live === null || pinned.includes(live)) return null;
      /* 🔴 A COUNT LANDS ON AN EVENT, NOT ON A COUNTDOWN, and that is the whole
         change in one function. The hold under the fingers becomes an arrival
         the instant it passes the floor, so if this is the last one needed the
         chord is due exactly then, and if it is not, no timer will ever admit
         it: the player has to let go and come back. */
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
 * The key a page hangs a tally on. Voicing is thrown away at the moment of
 * naming, which is what naming is FOR: every inversion of `Cmaj` is one entry
 * and a doubled root is one entry. The bass is deliberately not in it, since
 * `C/G` and `C` are one chord played two ways.
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
