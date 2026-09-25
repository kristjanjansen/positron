// demo/shell/suggest.mjs. What might come next, out of a counted table.
//
//   node demo/shell/suggest-test.mjs
//
// 🔴 A SUGGESTER READS WHAT A RECOGNISER NAMED, WHICH IS WHY THIS IS BESIDE
// `name.mjs` AND NOT INSIDE IT. That file turns notes into a name and has one
// job with a measurable ceiling. This one turns a line of names into two
// proposals and has no ceiling at all, because there is no right answer to what
// somebody should play next.
//
// ── THE TABLE IS COUNTED AND THE RULE THAT PRECEDED IT IS A FALLBACK ────────
//
// 🔴 THE 173 BYTE DIATONIC RULE THIS SHIPPED WITH FIRST SCORES **1.4 PER CENT
// TOP 1 ON JAZZ AND IS SILENT ON 65.3 PER CENT OF CASES**, MEASURED in
// `research/chord-suggester-benchmark-2026-09-23.md` over 251 held-out jazz
// standards and 176 held-out pop songs. It loses to a constant baseline that
// offers the same two chords forever. 🔴 **AND ITS PROBLEM IS THE ALPHABET
// RATHER THAN THE ORDERING**: only 34.9 per cent of real next chords are one of
// its seven diatonic triads, so no amount of re-ordering seven rows reaches the
// other two thirds. A tritone substitution is on `bII`, a backdoor dominant on
// `bVII`, a secondary dominant is a major third on a degree the key says is
// minor, and a borrowed `iv` is minor where the key says major. **None of the
// four has a slot in a diatonic numeral.**
//
// ✅ **SO THE ALPHABET IS `(DEGREE 0..11, CLASS)`**, seven classes over twelve
// degrees, and the table is a trigram counted over it. MEASURED: **48.5 per
// cent top 1 and 67.4 per cent top 3** on held-out jazz, and 12 of 16 named
// jazz devices in the top 2.
//
// ⚠️ THE RULE IS KEPT AS THE LAST RESORT AND NOT DELETED. The table backs off
// trigram to bigram; on a context genuinely in neither, a diatonic rule is a
// better answer than the globally commonest chord. ⚠️ **THAT IS UNVERIFIED**
// and the benchmark says so: the table's own backoff never left a case
// uncovered to measure it on.
//
// ── THE TWO SLOTS ARE TWO JOBS AND THE BENCHMARK PROVED IT ──────────────────
//
// 🔴 A SINGLE RANKED LIST SCORED ON ACCURACY IS THE SHAPE THAT MAKES *be right*
// AND *no cliches* FIGHT OVER ONE CELL, and the constant baseline is the proof:
// 13.8 per cent top 1 with an entropy of 1.00 bits and **two distinct answers
// in eleven thousand contexts**. A page built to maximise that number would
// offer `V7` and `I` forever and would look like it was working.
// MEASURED, held-out jazz:
//
//   slot A, idiomatic     48.7% names the real next chord   16.2% global max
//   slot B, worth hearing  9.9% names the real next chord    1.0% global max
//                          90.7% of what it offers is ATTESTED after that chord
//
// ✅ **SLOT B NAMING THE REAL NEXT CHORD ONLY 9.9 PER CENT OF THE TIME IS THE
// DESIGN WORKING, NOT FAILING.** It is not trying to. What it must not do is
// stop being attested, and it does not.
//
// ⚠️ AND PURE PMI WITH NO POOL WAS REFUSED, which is the setting that looks
// most adventurous. MEASURED: 9.5 points of attestation for 1.8 bits of
// surprisal, and the suggestions it makes are visibly wrong. **Adventurous and
// unattested are not the same thing.**
//
// ── SLOT A IS SAMPLED SINCE 2026-09-25, AND THE ARGMAX WAS THE COMPLAINT ────
//
// 🔴 ASKED AS *"they sound unimaginative and dry and not moving anywhere"*, AND
// `plans/plan-better-chords-2026-09-25.md` MEASURED THAT THE SUGGESTIONS ARE NOT
// BROKEN, THEY ARE THE ARGMAX, AND THE ARGMAX IS THE DEFINITION OF
// UNSURPRISING. Taking slot A ten times in a row, on held-out jazz:
//
//   slot A, always            99.1% of walks cycle   3.74 distinct chords in ten
//   sampled, temperature 1    52.6%                  7.52
//   THE REAL SONGS            52.7%                  7.42
//
// ✅ **SAMPLING FROM THE TABLE ALREADY SHIPPED REPRODUCES THE STATISTICS OF REAL
// MUSIC ON EVERY AXIS MEASURED**, and 96.6 per cent of what it says is played
// after that chord somewhere in songs the table has never seen.
//
// 🔴 THE TEMPERATURE IS A STYLE FACT AND LIVES IN THE TABLE, NOT HERE. Pop's
// real songs cycle 89.0 per cent of the time with 4.65 distinct chords in ten,
// which is nowhere near 1.0. **The same dial that makes jazz right makes pop
// wrong**, so it is one number per style beside the spelling field.
//
// ⚠️ THE COUNT FLOOR IS WHAT KEEPS THIS ATTESTED AND IT IS ALREADY IN THE
// SHIPPED TABLE. `build-chord-tables.mjs` prunes at `row>=3`, so there is no
// tail here to draw from. Sampling without one costs 9.5 points of attestation,
// MEASURED, which is the same trap pure PMI was refused for.
//
// 🔴 AND THE SAMPLER IS SEEDABLE, WHICH IS NOT A CONVENIENCE. Nothing about any
// of the numbers above can be regression tested against a generator that cannot
// be made to repeat itself, and `suggest-test.mjs` asserts BOTH halves: the same
// seed twice is the same line, and two seeds are two lines. One half alone
// passes on a sampler that always returns the same thing.
//
// ── AND SLOT B WAS STILL AN ARGMAX UNTIL 2026-09-26 ────────────────────────
//
// 🔴 REPORTED AS *"suggeston are better but still a bit meh"*. `/nola/` draws
// the SECOND slot, and slot B is the highest pointwise mutual information row
// that A did not take, so it is the PMI top unless A collided with it and the PMI
// second when it did. MEASURED by `demo/resources/chord-e6-keep.mjs` while
// sweeping the prune at 3, 4, 5, 6 and 8 rows: **exactly 2.00 distinct chords a
// context at every one of them.** Two values, for any width of table.
//
// ✅ **SO THE FIX WAS THE SAME FIX ONE SLOT SIDEWAYS**, and it is `B_TEMP` below:
// jazz, 2,000 held-out contexts, 40 draws each, 2.00 distinct becomes **3.53**
// for two tenths of a point of attestation.
//
// 🔴 AND THE PRUNE MOVED IN THE SAME BREATH, BECAUSE IT WAS THE OTHER CEILING.
// `KEEP` was 3 and is 5. The four chord way home now exists on **98.5 per cent**
// of held-out jazz contexts against 92.7, over **307** distinct routes against
// 150. ⚠️ The walk gains much less: held at the real songs' own cycle rate, the
// vocabulary goes 7.15 to 7.32 against the music's 7.42 on jazz, and pop does not
// gain at all. The table costs **18,237 bytes** against 12,789 at the old prune,
// which is 0.48 per cent of what `/nola/` already asks a visitor for.
//
// ── A TAKE ADAPTS TO WHAT IS BEING PLAYED NOW, AND FORGETS ─────────────────
//
// 🔴 THE LARGEST SINGLE GAIN IN THE PLAN, AND THE ONLY ONE ABOUT A PERSON.
// Section 6.2, expansion off, re-measured through THIS table's shape by
// `demo/resources/chord-e7-take.mjs`: **+6.32 points of top 1 on held-out jazz**,
// where the whole step from a bigram to a trigram was 4.5. It costs nothing on
// the other three measures: distinct chords in ten go 7.29 to 7.44 against the
// real songs' 7.44, surprisal 4.42 to 4.58 against 4.84, and the rate of
// answering the corpus's single commonest chord falls 15.9 to 14.6 against 13.8.
//
// 🔴 `mkTake` TAKES A SOURCE AND COUNTS WHAT IT REFUSED, WHICH IS THE RULE MADE
// ASSERTABLE. `/nola/` carries *"you recorded a suggestion. why>"*, and a
// suggester that learns from its own output writes its own line and calls it
// yours. MEASURED as a number rather than left as a warning: a generator fed its
// own suggestions cycles **56.8 per cent** of the time against 50.2 and loses
// vocabulary, moving away from real music on both axes at once.
// ⚠️ AND A PERSISTENT PROFILE IS STILL REFUSED, at +0.60 points from a composer's
// entire body of work. Nothing here is stored and nothing here leaves.
//
// ── WHAT THIS MODULE WILL NOT CLAIM ────────────────────────────────────────
//
// ⚠️ THE ASK WAS *"want them to be openstudiojazz quality stuff"* AND THE
// BENCHMARK REFUSED THAT WORDING ON THESE NUMBERS. 12 of 16 named devices in
// the top 2 is a measurement about a table. A teacher explains WHY the chord
// goes there, and nothing in a trigram explains anything. **The accurate claim
// is that the table knows where the devices go. It does not know what they are
// called or why.**
//
// This file has no audio, no DOM and no browser in it. `suggest-test.mjs` is
// beside it.

import { NOTE_LETTERS } from './name.mjs';
import { parseChord, roman } from './chords.mjs';

const pcOf = (n) => (((n % 12) + 12) % 12);

// ── the key, which is a fiat and is said out loud ──────────────────────────

/**
 * 🔴 THE SEVEN DEGREES OF EACH MODE, AND THEY ARE HERE FOR ONE JOB ONLY: to
 * work out where the music is centred. MEASURED: two chords fit 3.33 keys of 24
 * on average and never fewer than 2, and three chords never fit exactly one,
 * because a major key and its relative minor hold the same seven chords and can
 * never be told apart by which chords were played. So a key cannot be deduced,
 * it can only be decided, and `parseChords` already decides it the same way
 * with the right sentence attached.
 * ⚠️ THE MINOR IS THE NATURAL MINOR, and its numerals carry no flats, because
 * the minor scale is its own reference.
 *
 * 🔴 AND THE MINOR CARRIES A MAJOR `V` AND A DIMINISHED `vii` AS WELL AS THE
 * NATURAL ONES, WHICH IS A FACT ABOUT MUSIC AND WAS ADDED BECAUSE IT WAS
 * MEASURED. A minor ii V is `Dm7b5 G7`, its dominant is MAJOR, and a natural
 * minor has a minor `v`, so a natural-minor-only table fits no key at all for
 * the commonest opening in jazz. MEASURED against the counted jazz table over
 * eight named device contexts: with these rows the tonic comes out right and
 * the table names the real next chord **6 times at slot A and 7 in either
 * slot**, against **4 and 6** for the other obvious rule, which is to take the
 * first chord's root as tonic whenever no key is rooted there.
 * ⚠️ TWO ROWS AT DEGREE 7 IS NOT A DUPLICATE. `v` and `V` are different chords
 * on one degree, `numeralIn` matches on the QUALITY as well as the degree, and
 * each numeral still appears exactly once so a numeral still names one chord.
 */
const DEGREES = {
  major: [[0, 'maj', 'I'], [2, 'min', 'ii'], [4, 'min', 'iii'], [5, 'maj', 'IV'],
    [7, 'maj', 'V'], [9, 'min', 'vi'], [11, 'dim', 'vii']],
  minor: [[0, 'min', 'i'], [2, 'dim', 'ii'], [3, 'maj', 'III'], [5, 'min', 'iv'],
    [7, 'min', 'v'], [7, 'maj', 'V'], [8, 'maj', 'VI'], [10, 'maj', 'VII'],
    [11, 'dim', 'vii']],
};

/** A seventh is its triad for the purpose of finding a key, and a chord with no
 *  third cannot place one. A chord this returns `null` for is SKIPPED rather
 *  than counted against every key: an augmented triad is in no major or natural
 *  minor key, so counting it would make every key fail and the page would say
 *  `no key fits` about somebody playing in one. */
const asTriad = (q) => ({ maj: 'maj', maj7: 'maj', 7: 'maj', min: 'min', min7: 'min',
  dim: 'dim', min7b5: 'dim' }[q] ?? null);

/**
 * A chord's numeral in a key.
 *
 * 🔴 `chords.mjs`'s OWN `roman` CANNOT BE USED FOR A MINOR KEY, AND THIS WAS
 * FOUND BY BUILDING IT RATHER THAN BY READING IT. That function measures every
 * root against a MAJOR reference, so in A minor it calls F `bVI` and G `bVII`,
 * which is correct arithmetic and the wrong vocabulary. MEASURED as a live
 * failure: the diatonic minor table is keyed on `VI`, `roman` handed it `bVI`,
 * and the rule returned nothing at all for `Am then F`, which is the exact gap
 * the chord-learning research names, arriving by a second road.
 * ⚠️ `roman` IS STILL THE ANSWER FOR ANYTHING OFF THE SCALE, because a chord in
 * no degree of the key has no diatonic numeral and a chromatic one beats an
 * empty string.
 */
export const numeralIn = (root, quality, key) => {
  if (!key) return '';
  const triad = asTriad(quality);
  const row = DEGREES[key.mode].find(([step, q]) => pcOf(root - key.pc) === step && q === triad);
  return row ? row[2] : roman({ ok: true, root, quality }, key.pc);
};

/** Which keys every one of these chords could belong to. */
export function keysFitting(chords) {
  const want = (chords || []).map((c) => [c.root, asTriad(c.quality)])
    .filter(([, t]) => t !== null);
  const out = [];
  if (!want.length) return out;
  for (let pc = 0; pc < 12; pc++) {
    for (const mode of ['major', 'minor']) {
      const ok = want.every(([root, triad]) => DEGREES[mode]
        .some(([step, q]) => pcOf(root - pc) === step && q === triad));
      if (ok) out.push({ pc, mode });
    }
  }
  return out;
}

/**
 * 🔴 ONE KEY DECISION FOR BOTH TABLES, WHICH IS WHAT KEEPS THE PAGE HONEST.
 * The counted table is key relative, so it needs a tonic; the diatonic rule
 * needs a tonic and a mode. Two different decisions in one module would be two
 * different sentences about where the key came from.
 * ⚠️ AND IT CANNOT ALWAYS BE APPLIED. `Dm then G` fits C major and A minor and
 * neither is rooted on D, so the page falls back to the first fitting key and
 * `guessed` says so. A ii V is one of the commonest openings there is, so this
 * is not an edge case.
 * ⚠️ WHEN NOTHING FITS AT ALL, the tonic is the first chord's root, which is
 * `parseChords`' own fiat with nothing else to lean on.
 */
export function pickKey(chords) {
  const fits = keysFitting(chords);
  const first = chords[0]?.root ?? 0;
  if (!fits.length) return { key: null, tonic: first, fits, guessed: true };
  const onTonic = fits.find((k) => k.pc === first);
  const key = onTonic || fits[0];
  return { key, tonic: key.pc, fits, guessed: !onTonic };
}

// ── the diatonic rule, kept as the last resort ─────────────────────────────

/**
 * The 173 byte rule, unchanged from the day it was the whole suggester.
 * MEASURED against 24 four chord loops written from memory: it names the real
 * third chord in its top 3 for 19 of 24. MEASURED against 251 held-out jazz
 * standards: **1.4 per cent top 1, silent on 65.3 per cent**. Both numbers are
 * true and the second one is why it is down here.
 * ⚠️ THE MINOR HALF WAS NEVER MEASURED BY ANYBODY. It was written by analogy
 * with the major half because a major only rule returns nothing at all for
 * `Am then F`, and it is UNVERIFIED.
 */
const PLAIN = {
  major: {
    I: ['vi', 'IV', 'V', 'ii', 'iii'],
    ii: ['V', 'vii', 'I', 'IV'],
    iii: ['vi', 'IV', 'ii'],
    IV: ['V', 'I', 'ii', 'vi'],
    V: ['I', 'vi', 'IV'],
    vi: ['IV', 'ii', 'V', 'I'],
    vii: ['I', 'iii'],
  },
  minor: {
    i: ['VI', 'iv', 'VII', 'III', 'v'],
    ii: ['v', 'VII', 'i', 'VI'],
    III: ['VI', 'VII', 'iv'],
    iv: ['v', 'VII', 'i', 'VI'],
    v: ['i', 'VI', 'iv'],
    /* The harmonic minor's own dominant, which goes where the natural one goes
       and rather harder. Added with the degree row above it, and as UNVERIFIED
       as the rest of this half. */
    V: ['i', 'VI', 'iv'],
    VI: ['VII', 'iv', 'III', 'i'],
    VII: ['III', 'i', 'VI'],
    vii: ['i', 'III'],
  },
};

const fromNumeral = (numeral, key) => {
  const row = DEGREES[key.mode].find(([, , n]) => n === numeral);
  if (!row) return null;
  const root = pcOf(key.pc + row[0]);
  return { numeral, root, quality: row[1], name: `${NOTE_LETTERS[root]}${row[1]}` };
};

// ── the counted table ──────────────────────────────────────────────────────

/**
 * 🔴 THE CLASS A NAMED CHORD BELONGS TO. Seven classes, and the corpus share of
 * each is the entire style difference in seven rows: dominant chords are **40.6
 * per cent of jazz and 9.6 per cent of pop**, plain major chords are 64.8 per
 * cent of pop and 20.9 of jazz, and half diminished chords, the front door of
 * every minor ii V, are 4.4 per cent of jazz against 0.2 of pop, a factor of
 * twenty-two.
 * ⚠️ `5` IS A GUESS AND IS THE ONLY ONE HERE. A bare fifth has no third, so it
 * belongs to no class the corpus counted, and it is read as major because that
 * is what a power chord usually stands in for. Nothing measured it.
 */
const CLASS_OF = { maj: 'maj', maj7: 'maj', min: 'min', min7: 'min', 7: 'dom',
  dim: 'dim', min7b5: 'hdim', sus2: 'sus', sus4: 'sus', aug: 'aug', 5: 'maj' };

/**
 * 🔴 A SURFACE SPELLING THE PAGE CANNOT VOICE IS A LABEL THAT LIES ABOUT ITS OWN
 * DOTS. The table carries the commonest spelling of every symbol per style,
 * which is half the style dial: 59 of 75 shared symbols are written
 * differently, jazz writing `min7` and `maj7` where pop writes `min` and `maj`.
 * Some of those spellings are not things `chords.mjs` can read.
 * ✅ SO A SPELLING IS TRIED THROUGH `parseChord` AND WHAT COMES BACK IS BOTH
 * THE LABEL AND THE NOTES. They agree by construction rather than by care, and
 * a spelling that will not parse falls back to its class rather than being
 * drawn over notes that are not it. `aug(b7,9)` becomes `aug` and says `aug`.
 */
const SPELL_ALIAS = { '+': 'aug', 'aug(b7)': 'aug', 'aug(b7,9)': 'aug',
  h7: 'min7b5', hdim7: 'min7b5', o7: 'dim7', o: 'dim',
  '7sus': 'sus4', '9sus': 'sus4', 'sus4(b7)': 'sus4', 'sus4(b7,9)': 'sus4' };
const CLASS_SPELL = { maj: 'maj', min: 'min', dom: '7', dim: 'dim', hdim: 'min7b5',
  sus: 'sus4', aug: 'aug' };

/** The loaded tables, one entry per style, plus the `plain` rule which is
 *  always there and needs no download. */
export const STYLES = {};
let LOADED = null;

/**
 * Install the benchmarked tables, as fetched from
 * `/resources/chord-tables.json`.
 *
 * ⚠️ IT IS A FUNCTION RATHER THAN AN IMPORT BECAUSE THE FILE IS FETCHED, and
 * this repository's rule is that a visit opens nothing. The page asks for it
 * when somebody presses the control that needs it, and until then the diatonic
 * rule answers.
 */
export function useTables(json) {
  if (!json || json.v !== 1 || !json.syms || !json.alpha) {
    throw new Error('that is not a chord table of version 1');
  }
  const { alpha, keep, syms } = json;
  const rev = new Map([...alpha].map((c, i) => [c, i]));
  const STEPS = alpha.length - 1;
  const PAD = ' ';
  /* Fixed width records, so there is nothing to split on and nothing to get
     wrong about a separator appearing inside a value. */
  const read = (packed, width) => {
    const out = new Map();
    const rec = width + 2 * keep;
    for (let i = 0; i + rec <= packed.length; i += rec) {
      const key = [...packed.slice(i, i + width)].map((c) => syms[rev.get(c)]).join('|');
      const rows = [];
      for (let j = 0; j < keep; j++) {
        const c = packed[i + width + 2 * j];
        if (c === PAD) continue;
        rows.push([syms[rev.get(c)], rev.get(packed[i + width + 2 * j + 1]) / STEPS]);
      }
      out.set(key, rows);
    }
    return out;
  };
  const made = {};
  for (const id of Object.keys(json)) {
    const st = json[id];
    if (!st || typeof st !== 'object' || !st.bi || !st.tri) continue;
    const uni = new Map(syms.map((s, i) => [s, rev.get(st.uni[i]) / STEPS]));
    const spell = new Map(syms.map((s, i) => [s, st.spell[i] || '']));
    /* 🔴 THE TEMPERATURE TRAVELS WITH THE STYLE, and a table written before the
       field existed reads as 1, which is jazz's measured value rather than a
       neutral one. It is stated here rather than hidden, because a pop table
       silently sampled at 1.0 is the wrong dial and would show as a page that
       wanders. `build-chord-tables.mjs` writes the field. */
    const temp = Number.isFinite(st.temp) && st.temp >= 0 ? st.temp : 1;
    /* 🔴 AND SO DOES THE MIX, FOR THE SAME REASON AND WITH A BIGGER GAP BETWEEN
       THE STYLES. How much of a suggestion is the player's own take is a fact
       about how much the music repeats itself: MEASURED, jazz wants 0.25 and pop
       0.1, and pop at 0.25 scores hugely better on top 1 while moving every one
       of the four measures away from real pop. A table written before this field
       existed reads as 0.25, which is jazz's measured value. */
    const mix = Number.isFinite(st.mix) && st.mix >= 0 && st.mix <= 1 ? st.mix : 0.25;
    made[id] = { id, bi: read(st.bi, 1), tri: read(st.tri, 2), uni, spell, temp, mix };
  }
  LOADED = made;
  for (const id of Object.keys(made)) STYLES[id] = made[id];
  return Object.keys(made);
}

/** Has a counted table been installed, as opposed to the rule. */
export const tablesIn = () => LOADED !== null;
/** Every style a page could offer, the rule last. */
export const styleNames = () => [...Object.keys(LOADED || {}), 'plain'];

const symbolOf = (root, quality, tonic) =>
  `${pcOf(root - tonic)}${CLASS_OF[quality] || 'maj'}`;

/**
 * A table symbol back into a chord this page can draw and play.
 * @returns {{root, quality, name, numeral}|null}
 */
function chordOfSymbol(sym, tonic, style, key) {
  const m = /^(\d+)(.+)$/.exec(sym);
  if (!m) return null;
  const root = pcOf(tonic + Number(m[1]));
  const cls = m[2];
  const want = style.spell?.get(sym) || '';
  const tries = [SPELL_ALIAS[want] ?? want, CLASS_SPELL[cls] || 'maj'];
  for (const q of tries) {
    if (!q) continue;
    const c = parseChord(`${NOTE_LETTERS[root]}${q}`);
    if (c.ok) {
      return { root, quality: c.quality, name: c.name,
        numeral: key ? numeralIn(root, c.quality, key) : '' };
    }
  }
  return null;
}

/**
 * 🔴 SLOT B IS POINTWISE MUTUAL INFORMATION OVER A POOL, AND THE POOL IS THE
 * SECOND RAIL RATHER THAN A DETAIL. PMI is high for a chord SPECIFIC to this
 * context and low for one that is common everywhere, which is exactly the
 * difference between an idiom and a cliche and is a quantity rather than a
 * taste. With no pool it reaches past a dozen ordinary answers for whatever is
 * most specific, which on a thin context is an augmented triad somebody played
 * four times. MEASURED as refused: 9.5 points of attestation for 1.8 bits of
 * surprisal, with suggestions that are visibly wrong.
 * ⚠️ THE COUNT FLOOR IS ALREADY IN THE SHIPPED TABLE, pruned at three, so there
 * is nothing here to apply it with and nothing here that could get it wrong.
 * ✅ AND THE POOL THE BENCHMARK SWEPT WAS FOUR, WHICH THE SHIPPED TABLE COULD NOT
 * FILL UNTIL 2026-09-26. `build-chord-tables.mjs` kept three rows a context, so
 * this number was a ceiling that never came down: the pool held at most three and
 * slot B was measured on a narrower thing than it was graded on. `KEEP` is 5 now,
 * MEASURED at a mean pool of **3.75** against 2.91 before, so the setting the
 * benchmark swept is finally the setting that runs.
 */
const POOL = 4;

/**
 * 🔴 SLOT B IS DRAWN TOO SINCE 2026-09-26, AND THE MEASUREMENT THAT FOUND IT WAS
 * LOOKING FOR SOMETHING ELSE. `demo/resources/chord-e6-keep.mjs` swept the prune
 * at 3, 4, 5, 6 and 8 rows and slot B answered **exactly 2.00 distinct chords a
 * context at every one of them**. That number is not a coincidence and not a
 * table fact: B is the highest pointwise mutual information row that A did not
 * take, so it is the PMI top unless A collided with the PMI top, in which case it
 * is the PMI second. **Two values, for any width of table, forever.**
 *
 * 🔴 SO THE PLAN'S WHOLE LESSON HAD BEEN APPLIED TO SLOT A AND NEVER TO SLOT B,
 * AND SLOT B IS THE ONE ON SCREEN. `/nola/` draws the second pick. Sampling slot
 * A widened what a walk looks like and could not widen what a player is offered,
 * which is the shape of the report that followed: *"suggeston are better but
 * still a bit meh"*.
 *
 * ✅ MEASURED at `KEEP 5` over 2,000 held-out jazz contexts, 40 draws each:
 *
 *   argmax, as shipped   2.00 distinct   92.98% attested   4.2% globally commonest
 *   drawn at 1           3.53            92.79%            5.0%
 *   drawn at 2           3.64            92.53%            5.8%
 *   drawn at 4           3.73            92.50%            6.7%
 *
 * **1 buys 77 per cent of the available width for two tenths of a point of
 * attestation**, and 2 and 4 buy the rest by answering the corpus's commonest
 * chord more often, which is the quantity the complaint is about.
 * ⚠️ AND 1 IS A DEFINITION RATHER THAN A FIT, WHICH IS WHY IT IS NOT IN THE
 * TABLE BESIDE THE STYLE TEMPERATURE. `2^(pmi/1)` is `p/u` exactly, so a row is
 * drawn in proportion to how specific it is to this context. There is no corpus
 * fact in it to be different per style, and nothing was tuned against a target.
 * ⚠️ SLOT B'S ATTESTATION HAS ALWAYS SAT BELOW THE 94 PER CENT FLOOR AND THE
 * FLOOR IS NOT ABOUT IT. The benchmark measured slot B at **90.7 per cent** and
 * shipped it; the floor is about the ten step walk, which is slot A's. What
 * matters here is that the draw moved it by 0.2 points rather than by nine.
 */
const B_TEMP = 1;

/**
 * 🔴 A SEEDED RANDOM SOURCE, AND IT IS THE SAME ONE THE MEASUREMENTS USE.
 * `demo/resources/chord-e4-generators.mjs` imports this rather than carrying a
 * generator of its own, so a number measured there and a chord offered here come
 * off one stream. A sampler that cannot be made to repeat itself makes every
 * claim in `plans/plan-better-chords-2026-09-25.md` unrepeatable.
 * ⚠️ IT IS A PLAIN LINEAR CONGRUENTIAL GENERATOR AND THAT IS ENOUGH. Nothing
 * here is cryptography and nothing here is a simulation; what is needed is that
 * two runs with one seed agree and two seeds do not.
 */
export function mkRandom(seed = 1) {
  let st = (seed >>> 0) || 1;
  return () => {
    st = (Math.imul(st, 1103515245) + 12345) & 0x7fffffff;
    return st / 0x7fffffff;
  };
}

/**
 * The rows the table holds for a context, with the backoff that is the whole of
 * how a thin context is answered.
 * ⚠️ EXPORTED SO THE MEASUREMENTS GRADE THIS LOOKUP RATHER THAN A COPY OF IT.
 * `demo/resources/chord-e4-generators.mjs` walks ten steps through this function
 * and `sampleRow`, which is the only way the number it prints is about the code
 * that ships.
 * @returns {{rows: Array<[string, number]>, how: string}}
 */
export function rowsFor(style, ctx) {
  const [a, b] = [ctx[ctx.length - 2], ctx[ctx.length - 1]];
  let rows = (a !== undefined && b !== undefined) ? style.tri.get(`${a}|${b}`) : null;
  let how = 'three chords of yours against three of theirs';
  if (!rows || !rows.length) {
    rows = b !== undefined ? style.bi.get(b) : null;
    how = 'the one chord before it';
  }
  return { rows: rows || [], how };
}

/**
 * 🔴 ONE ROW OUT OF THE TABLE'S OWN DISTRIBUTION, FLATTENED BY A TEMPERATURE.
 * The weight is `p^(1/T)` over the kept rows: `T` under 1 sharpens toward the
 * commonest answer, `T` at 1 is the distribution the corpus was counted with,
 * and `T` above 1 flattens it.
 * ⚠️ `temp` OF 0 IS THE ARGMAX, ON PURPOSE AND NOT AS AN ERROR CASE. It is what
 * this file did before 2026-09-25, and `suggest-test.mjs` uses it as the
 * negative control that says the sampler is sampling: at 0 a context answers one
 * chord over two hundred seeds, and at the shipped temperature it answers
 * several.
 * ⚠️ THE ROWS ARE ALREADY FLOORED AT A COUNT OF THREE by the build, so there is
 * no tail here and nothing here that could get a floor wrong.
 */
export function sampleRow(rows, temp, rnd) {
  if (!rows || !rows.length) return null;
  if (!(temp > 0) || typeof rnd !== 'function') return rows[0][0];
  const w = rows.map(([, p]) => Math.pow(Math.max(p, 1e-9), 1 / temp));
  const sum = w.reduce((a, b) => a + b, 0);
  let r = rnd() * sum;
  for (let i = 0; i < rows.length; i++) { r -= w[i]; if (r <= 0) return rows[i][0]; }
  return rows[rows.length - 1][0];
}

/**
 * The two slots over one context, in table symbols.
 * ⚠️ EXPORTED FOR THE SAME REASON `rowsFor` AND `sampleRow` ARE: what `/nola/`
 * draws is slot B, so a measurement of slot B has to be of THIS function rather
 * than of a copy of it. `demo/resources/chord-e6-keep.mjs` sweeps the prune
 * through it, and slot B is the half a prune moves that a walk cannot see.
 */
/**
 * 🔴 A TAKE ADAPTS THE TABLE TO WHAT IS BEING PLAYED NOW, AND IT IS THE LARGEST
 * SINGLE GAIN IN `plans/plan-better-chords-2026-09-25.md`. Section 6.2, MEASURED
 * with section expansion OFF so a repeated A section cannot inflate it:
 *
 *    8 chords seen   54.70% top 1 against 49.35% world only   +5.35
 *   16 chords seen   57.21% against 49.77%                    +7.44
 *   32 chords seen   58.89% against 50.59%                    +8.30
 *
 * For comparison, the whole step from a bigram to a trigram was 4.5 points and
 * justified downloading two corpora.
 * ⚠️ AND PART OF THAT GAIN IS THAT MUSIC REPEATS ITSELF RATHER THAN THAT
 * ANYTHING WAS LEARNED ABOUT A PERSON. With expansion ON the same sweep reads
 * +10.1, and the difference between the two numbers is exactly the repetition
 * the corpus adds. **+7.44 is the conservative reading and is the one to quote.**
 *
 * 🔴 A PERSISTENT PROFILE IS REFUSED AND THE REFUSAL IS MEASURED, NOT CAUTIOUS.
 * Section 6.1: a composer's ENTIRE body of work, leave one chart out over 27
 * composers and 461 charts, is worth **+0.60 points** at its best weight, and a
 * stranger's work at the same weight reads 0.76 points BELOW the baseline. Thirty
 * charts of somebody's life buys six tenths of a point. **This object holds the
 * current take and forgets.** Nothing is stored, nothing is sent, and there is no
 * `localStorage` anywhere in this file.
 *
 * 🔴 AND `heard` IS A COUNTED WRAPPER RATHER THAN A SETTER, WHICH IS THE ONLY
 * WAY THE RULE CAN BE ASSERTED INSTEAD OF CLAIMED. `/nola/` carries a rule from
 * a report reading *"you recorded a suggestion. why>"*, and it matters twice over
 * once a log feeds anything: **a suggester that learns from its own suggestions
 * writes its own line and calls it yours.** So every chord that can reach the
 * adaptation goes through one function, that function takes a SOURCE and counts
 * what it refused, and `refused` is a number a check can read. This repository
 * already owns that shape: `/reel/` proved *a visit opens nothing* by routing
 * every URL through one counted function rather than by reading the file.
 * ⚠️ THERE IS NO DEFAULT SOURCE, ON PURPOSE. `heard(c)` with no second argument
 * is REFUSED, because a default of `'played'` would make the careless call the
 * dangerous one, and the whole point is that the dangerous call is the loud one.
 *
 * 🔴 THE WINDOW IS 64 AND IT IS NOT THE PLAN'S SIXTEEN, WHICH WAS FOUND BY
 * MEASURING THE THREE WINDOWS THE PLAN'S SENTENCE COULD HAVE MEANT. It says
 * *over the last sixteen to thirty two chords* and what section 6.2 actually
 * measured was the FIRST sixteen of a piece. Those are different windows and they
 * do not score alike. MEASURED on held-out jazz at weight 0.25, expansion off:
 *
 *   the last 16 chords    +1.98 points of top 1
 *   the first 16 chords   +5.91
 *   everything so far     +6.32
 *
 * **A sliding window of sixteen is worth a third of what keeping the take is
 * worth**, because sixteen chords ago is the section you just left. 64 is
 * everything so far for any take shorter than that and a slow forget after it,
 * and it reads +6.32 on the same contexts.
 * ⚠️ AND IT IS STILL NOT A PROFILE. A window that forgets nothing WITHIN a take
 * is not a thing that persists BETWEEN takes, which is what section 6.1 refused
 * at +0.60 points. This object dies with the tab.
 *
 * ⚠️ THE MIXING WEIGHT IS NOT HERE, IT IS IN THE TABLE, beside the temperature
 * and for the same measured reason: jazz wants 0.25 and pop 0.1.
 *
 * @param {{window?: number}} [o]  how many recent chords count.
 * @returns {{heard, chords, counted, refused, clear, window}}
 */
export function mkTake({ window = 64 } = {}) {
  const chords = [];
  let counted = 0, refused = 0;
  return {
    /**
     * One chord that was played, or one that was not. Returns whether it counted.
     * @param {{root:number, quality:string}} chord
     * @param {string} source  `'played'` and nothing else is counted.
     */
    heard(chord, source) {
      if (source !== 'played' || !chord || !Number.isFinite(chord.root)) { refused++; return false; }
      chords.push({ root: chord.root, quality: chord.quality });
      while (chords.length > window * 4) chords.shift();
      counted++;
      return true;
    },
    get chords() { return chords.slice(-window); },
    get counted() { return counted; },
    get refused() { return refused; },
    clear() { chords.length = 0; counted = 0; refused = 0; },
    window,
  };
}

/**
 * The table's rows for this context with the take's own counts mixed in.
 *
 * 🔴 THE MIX IS `(1 - w) * world + w * yours`, WHICH IS THE PLAN'S OWN RECIPE
 * AND NOT A NEW ONE. The take backs off exactly as the table does, trigram first
 * and bigram when the trigram has fewer than `floor` sightings, because sixteen
 * chords hold almost no trigram twice and a take with no backoff would contribute
 * nothing at all on most contexts.
 * ⚠️ IT RE-SORTS, SO THE MIXTURE DECIDES BOTH SLOTS. Slot A draws from these rows
 * and slot B takes its pool off the top of them, which is what makes the
 * adaptation reach the chord the page actually shows.
 * ⚠️ EXPORTED SO THE MEASUREMENTS GRADE THIS FUNCTION RATHER THAN A COPY OF IT,
 * the same reason `rowsFor` and `sampleRow` are.
 *
 * @param {Array<[string, number]>} rows  what the table holds
 * @param {string[]} take  the take's chords as table symbols, oldest first
 * @param {string[]} ctx  the context being asked about, as table symbols
 */
export function adaptRows(rows, take, ctx, { weight = 0.25, floor = 2 } = {}) {
  if (!take || take.length < 3 || !(weight > 0)) return rows;
  const a = ctx[ctx.length - 2], b = ctx[ctx.length - 1];
  let d = new Map(), tot = 0;
  if (a !== undefined && b !== undefined) {
    for (let i = 2; i < take.length; i++) {
      if (take[i - 2] === a && take[i - 1] === b) { d.set(take[i], (d.get(take[i]) || 0) + 1); tot++; }
    }
  }
  if (tot < floor) {
    d = new Map(); tot = 0;
    for (let i = 1; i < take.length; i++) {
      if (take[i - 1] === b) { d.set(take[i], (d.get(take[i]) || 0) + 1); tot++; }
    }
  }
  if (!tot) return rows;
  const out = new Map((rows || []).map(([s, p]) => [s, (1 - weight) * p]));
  for (const [s, n] of d) out.set(s, (out.get(s) || 0) + weight * n / tot);
  return [...out].sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1));
}

export function twoSlots(style, ctx, { temp = 1, rnd = null, bTemp = 0, take = null,
  weight = 0.25 } = {}) {
  const got = rowsFor(style, ctx);
  const how = got.how;
  const rows = take ? adaptRows(got.rows, take, ctx, { weight }) : got.rows;
  if (!rows.length) return null;
  const A = sampleRow(rows, temp, rnd);
  const pool = rows.slice(0, POOL).filter(([s]) => s !== A)
    .map(([s, p]) => [s, Math.log2(p / (style.uni.get(s) || 1e-6))]);
  let B = null;
  if (!pool.length) B = null;
  else if (!(bTemp > 0) || typeof rnd !== 'function') {
    /* The argmax, which is what this shipped before 2026-09-26 and is still what
       `bTemp: 0` means. `suggest-test.mjs` uses it as the negative control. */
    let best = -Infinity;
    for (const [s, score] of pool) if (score > best) { best = score; B = s; }
  } else {
    /* 🔴 THE SAME DRAW AS SLOT A, OVER THE SAME QUANTITY SLOT B WAS ALREADY
       RANKED BY. `2^(pmi/T)` is `(p/u)^(1/T)`, so the weight is the specificity
       itself raised to `1/T` and one dial means the same thing in both slots. */
    const top = Math.max(...pool.map(([, sc]) => sc));
    const w = pool.map(([, sc]) => Math.pow(2, (sc - top) / bTemp));
    const sum = w.reduce((a, b) => a + b, 0);
    let r = rnd() * sum;
    B = pool[pool.length - 1][0];
    for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) { B = pool[i][0]; break; } }
  }
  return { A, B: B ?? (rows.find(([s]) => s !== A)?.[0] ?? null), how, rows };
}

/**
 * 🔴 A PATH THAT HAS TO ARRIVE, WHICH IS A DIFFERENT QUESTION FROM A CHORD THAT
 * COMES NEXT, AND THE TABLE ALREADY ANSWERS IT. A beam search over the same
 * trigram for a run of `steps` chords whose last one is `target`.
 * MEASURED over 4,000 held-out jazz contexts in
 * `plans/plan-better-chords-2026-09-25.md`: a route exists on **99.6 per cent**
 * of them and its transitions are attested in held-out songs **98.2 per cent**
 * of the time.
 *
 * 🔴 AND THE ARGMAX PROBLEM RETURNS ONE LEVEL UP, WHICH IS THE PROOF THE LESSON
 * IS GENERAL RATHER THAN A PATCH. MEASURED: **60.4 per cent of the six commonest
 * best paths end in ii V I**. A best path is as cliched as a best chord, so the
 * path is sampled too, and the repair is the same repair.
 * ⚠️ THE WEIGHT IS PER STEP RATHER THAN PER PATH, which is a choice and was
 * measured rather than argued: `2^(lp/steps/T)` is the geometric mean
 * probability of a step raised to `1/T`, so one dial means the same thing to a
 * chord and to a route. Weighting by the whole path's probability instead is the
 * same code with `temp` divided by `steps`, which is how both were graded.
 * ⚠️ `beam` OF 256 PRUNES NOTHING AT FOUR STEPS, because the shipped table keeps
 * five rows a context and `5^3` is 125. It is a ceiling for a longer route rather
 * than a filter on this one, and a beam that pruned would be an argmax wearing a
 * different name.
 * 🔴 IT READ 64 UNTIL 2026-09-26 AND THAT NUMBER WAS DERIVED FROM `KEEP`, SO
 * RAISING THE PRUNE WOULD HAVE TURNED THIS BACK INTO AN ARGMAX SILENTLY. At
 * `KEEP 5` the live set is 125 paths and a beam of 64 would have thrown the
 * lower half away by probability before the draw ever saw it, which is the
 * failure this whole plan is about arriving through a constant nobody re-read.
 *
 * ✅ MEASURED at `KEEP 5` over 4,000 held-out jazz contexts: a route is found on
 * **98.5 per cent** of them against 92.7 at `KEEP 3`, over **307** distinct
 * routes against 150, attested **95.4 per cent** against 98.3.
 *
 * @returns {{path: string[], lp: number, tried: number}|null}
 */
export function routeOver(style, ctx0, target, steps = 4,
  { temp = 1, rnd = null, beam = 256, take = null, weight = 0.25 } = {}) {
  if (!style || !target || steps < 1) return null;
  let live = [{ ctx: [...ctx0], path: [], lp: 0 }];
  for (let d = 0; d < steps; d++) {
    const next = [];
    for (const st of live) {
      /* ⚠️ THE TAKE IS MIXED IN AT EVERY STEP RATHER THAN ONLY THE FIRST,
         because the context moves as the route is built and a way home that
         sounded like this player at step one and like nobody at step three would
         be the adaptation switching itself off half way. */
      const got = rowsFor(style, st.ctx);
      const rows = take ? adaptRows(got.rows, take, st.ctx, { weight }) : got.rows;
      for (const [s, p] of rows) {
        if (d < steps - 1 && s === target) continue;      // arrive once, at the end
        if (d === steps - 1 && s !== target) continue;    // and it must land on it
        next.push({ ctx: [st.ctx[st.ctx.length - 1], s], path: [...st.path, s],
          lp: st.lp + Math.log2(Math.max(p, 1e-9)) });
      }
    }
    if (!next.length) return null;
    next.sort((a, b) => b.lp - a.lp);
    live = next.slice(0, beam);
  }
  if (!live.length) return null;
  if (!(temp > 0) || typeof rnd !== 'function') return { ...live[0], tried: live.length };
  const top = live[0].lp;
  const w = live.map((st) => Math.pow(2, (st.lp - top) / steps / temp));
  const sum = w.reduce((a, b) => a + b, 0);
  let r = rnd() * sum;
  for (let i = 0; i < live.length; i++) { r -= w[i]; if (r <= 0) return { ...live[i], tried: live.length }; }
  return { ...live[live.length - 1], tried: live.length };
}

/**
 * What might come next.
 *
 * 🔴 TWO SLOTS, TWO JOBS. `usual` is the idiomatic continuation and `other` is
 * the one worth hearing. They are not a ranked pair of one job and the
 * benchmark is what settles that.
 *
 * 🔴 AND SLOT A IS A SAMPLE RATHER THAN THE MAXIMUM SINCE 2026-09-25. The
 * header carries the measurement. `temp` overrides the style's own number and
 * `temp: 0` is the argmax this file shipped before, which is what the checks use
 * as their negative control.
 *
 * @param {{chords: Array<{root:number, quality:string}>}} context
 * @param {{style?: string, temp?: number, rnd?: function}} [o]  a style name
 *   from `styleNames()`, or `plain`; a temperature, or the style's own; and a
 *   random source, so a caller that needs to repeat itself can.
 * @returns {{ok, style, source, key, keyName, tonic, guessed, from, picks, says}}
 */
export function suggest(context, { style = 'jazz', temp = null, rnd = null,
  take = null, mix = null, bTemp = null } = {}) {
  const chords = (context?.chords || []).filter((c) => c && Number.isFinite(c.root));
  const blank = { ok: false, style, source: 'none', key: null, keyName: '', tonic: 0,
    guessed: false, from: '', picks: [], says: '' };
  if (chords.length < 2) {
    return { ...blank, says: 'two chords are needed before anything can be suggested' };
  }
  const { key, tonic, guessed } = pickKey(chords);
  const keyName = key ? `${NOTE_LETTERS[key.pc]} ${key.mode}` : `${NOTE_LETTERS[tonic]}`;
  const where = guessed
    ? `taking ${keyName} as the key, which is a guess because no key fits with your first `
      + 'chord as its home'
    : `taking ${keyName} as the key, from the first chord you played`;

  const table = STYLES[style];
  if (table && table.tri) {
    const ctx = chords.map((c) => symbolOf(c.root, c.quality, tonic));
    const T = temp === null ? (table.temp ?? 1) : temp;
    /* ⚠️ THE TAKE IS TURNED INTO SYMBOLS WITH **THIS CALL'S** TONIC AND NOT WITH
       ONE IT REMEMBERED. The key is a fiat that a third chord can change, and a
       take holding symbols from an older tonic would quietly be a take of a
       different piece. It holds chords, and the arithmetic happens here. */
    const mine = take ? take.chords.map((c) => symbolOf(c.root, c.quality, tonic)) : null;
    /* 🔴 `temp: 0` MEANS THE ARGMAX AND THE ARGMAX OF A TWO SLOT ANSWER IS BOTH
       SLOTS, WHICH WAS FOUND BY BREAKING IT. Drawing slot B made
       `suggest(ctx, { temp: 0 })` fall through to `Math.random`, so a call that
       had been deterministic since the day this file was written silently was
       not, and two checks went red in one run and green in the next with no code
       between them. That is the shape of flake this repository spends whole
       sessions on. A caller wanting a fixed A with a drawn B passes both dials. */
    const bT = bTemp === null ? (T > 0 ? B_TEMP : 0) : bTemp;
    const got = twoSlots(table, ctx, { temp: T, rnd: rnd || Math.random, bTemp: bT,
      take: mine, weight: mix === null ? (table.mix ?? 0.25) : mix });
    const usual = got && chordOfSymbol(got.A, tonic, table, key);
    const other = got && got.B && chordOfSymbol(got.B, tonic, table, key);
    if (usual) {
      /* ⚠️ THE WORDING MOVED WITH THE CODE. It read *what jazz players most
         often go to from here*, which was true of an argmax and is a lie about a
         draw: the commonest answer is now the likeliest one to come up rather
         than the only one that can. CLAUDE.md's rule is that a change in what a
         page does is a change in what it says, in the same edit. */
      const picks = [{ role: 'usual', ...usual,
        why: `one of the chords ${table.id} players go to from here, drawn rather than `
          + 'always the commonest' }];
      if (other && other.name !== usual.name) {
        picks.push({ role: 'other', ...other,
          why: 'the continuation most specific to this context rather than common everywhere' });
      }
      return { ok: true, style, source: 'corpus', key, keyName, tonic, guessed,
        from: chords[chords.length - 1].root === undefined ? '' : ctx[ctx.length - 1],
        picks,
        says: `${where}, and reading ${got.how}, the ${table.id} table draws `
          + `${picks[0].name}`
          + (picks[1] ? ` as one of the chords that follow and ${picks[1].name} as the one `
            + 'least common everywhere else' : '') };
    }
  }

  /* 🔴 THE LAST RESORT, AND IT IS THE RULE THAT USED TO BE THE WHOLE THING.
     UNVERIFIED as better than the globally commonest chord: the table's own
     backoff never left a case uncovered to measure it on. */
  if (key) {
    const played = chords.map((c) => numeralIn(c.root, c.quality, key));
    const from = played[played.length - 1];
    const list = (PLAIN[key.mode] || {})[from] || [];
    const usual = list[0] ? fromNumeral(list[0], key) : null;
    const fresh = list.slice(1).find((n) => !played.includes(n));
    const other = fromNumeral(fresh || list[1] || '', key);
    if (usual) {
      const picks = [{ role: 'usual', ...usual, why: `what usually follows ${from}` }];
      if (other) {
        picks.push({ role: 'other', ...other,
          why: fresh ? 'a chord this line has not used yet' : `the next reading of ${from}` });
      }
      return { ok: true, style, source: 'plain', key, keyName, tonic, guessed, from, picks,
        says: `${where}, and with no counted table to read, after ${from} the plain rule `
          + `offers ${picks[0].name}`
          + (picks[1] ? ` and ${picks[1].name}` : '') };
    }
  }

  /* 🔴 THE HONEST BOUNDARY. Two chords from two keys, or a context nothing has
     seen. A fifth either side of the first chord always exists and is never
     absurd, and the page says that is what it did. UNVERIFIED as a good
     musical answer. */
  const first = chords[0];
  const q = asTriad(first.quality) || 'maj';
  const fifths = [7, 5].map((step) => {
    const root = pcOf(first.root + step);
    return { root, quality: q, name: `${NOTE_LETTERS[root]}${q}`, numeral: '' };
  });
  return { ...blank, ok: true, key, keyName, tonic, guessed, source: 'fifths',
    picks: [
      { role: 'usual', ...fifths[0], why: 'a fifth above the chord you started on' },
      { role: 'other', ...fifths[1], why: 'a fifth below it' },
    ],
    says: `nothing in the ${style} reading holds `
      + `${chords.map((c) => NOTE_LETTERS[c.root] + c.quality).join(' and ')}, so these are a `
      + 'fifth either side of the first chord rather than a reading of a key' };
}

/**
 * A four chord way home.
 *
 * 🔴 THIS IS THE ONE PROPOSAL IN `plans/plan-better-chords-2026-09-25.md` THAT
 * CHANGES WHAT A PAGE OFFERS RATHER THAN HOW IT RANKS: not *here is the next
 * chord* but *here is a four chord way home, and here is another one*. The third
 * word of the complaint was *"not moving anywhere"*, and MEASURED literally:
 * taking the old suggestion ten times in a row fell into a repeating cycle
 * **99.1 per cent** of the time, 77.3 per cent of them the three rotations of
 * ii V I. Nothing on this page had a destination, so nothing could arrive.
 *
 * ⚠️ THE TARGET IS THE TONIC AND THAT IS THE ONE UNDECIDED DESIGN QUESTION,
 * section 12.4 of the plan, written down rather than answered here: a real
 * player aims at all sorts of places, and whether a person picks the target or
 * the page infers it is not settled. The tonic is the default because it is the
 * one destination a key already names. A caller may pass `target` as a table
 * symbol, and nothing in this repository does yet.
 *
 * @param {{chords: Array<{root:number, quality:string}>}} context
 * @param {{style?, steps?, target?, temp?, rnd?}} [o]
 * @returns {{ok, style, source, key, keyName, tonic, guessed, target, targetName,
 *   steps: Array<{root, quality, name, numeral}>, says}}
 */
export function routeTo(context, { style = 'jazz', steps = 4, target = null,
  temp = null, rnd = null, take = null, mix = null } = {}) {
  const chords = (context?.chords || []).filter((c) => c && Number.isFinite(c.root));
  const blank = { ok: false, style, source: 'none', key: null, keyName: '', tonic: 0,
    guessed: false, target: '', targetName: '', steps: [], says: '' };
  if (chords.length < 2) {
    return { ...blank, says: 'two chords are needed before a way home can be worked out' };
  }
  const table = STYLES[style];
  if (!table || !table.tri) {
    return { ...blank,
      says: `there is no counted ${style} table here, and the diatonic rule knows where a `
        + 'chord goes next without knowing where a line is going' };
  }
  const { key, tonic, guessed } = pickKey(chords);
  const keyName = key ? `${NOTE_LETTERS[key.pc]} ${key.mode}` : `${NOTE_LETTERS[tonic]}`;
  /* ⚠️ THE TONIC'S CLASS COMES FROM THE MODE AND NOT FROM THE FIRST CHORD. A
     line that opens on a dominant is still going home to a major or a minor
     chord, and `0maj` in a minor key is a chord the table has barely counted. */
  const aim = target || `0${key && key.mode === 'minor' ? 'min' : 'maj'}`;
  const ctx = chords.map((c) => symbolOf(c.root, c.quality, tonic));
  const T = temp === null ? (table.temp ?? 1) : temp;
  const mine = take ? take.chords.map((c) => symbolOf(c.root, c.quality, tonic)) : null;
  const got = routeOver(table, ctx, aim, steps, { temp: T, rnd: rnd || Math.random,
    take: mine, weight: mix === null ? (table.mix ?? 0.25) : mix });
  const home = chordOfSymbol(aim, tonic, table, key);
  if (!got) {
    return { ...blank, key, keyName, tonic, guessed, target: aim,
      targetName: home ? home.name : '',
      says: `nothing the ${table.id} table has counted gets from here to `
        + `${home ? home.name : keyName} in ${steps} chords` };
  }
  const out = got.path.map((s) => chordOfSymbol(s, tonic, table, key)).filter(Boolean);
  if (out.length !== got.path.length) {
    return { ...blank, key, keyName, tonic, guessed, target: aim,
      targetName: home ? home.name : '',
      says: 'a way home was found and one of its chords cannot be written down here' };
  }
  return { ok: true, style, source: 'corpus', key, keyName, tonic, guessed,
    target: aim, targetName: home ? home.name : out[out.length - 1].name, steps: out,
    says: `one of ${got.tried} ways the ${table.id} table knows from here home to `
      + `${home ? home.name : keyName} in ${steps} chords: `
      + `${out.map((c) => c.name).join(', ')}` };
}
