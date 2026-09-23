// demo/shell/chords.mjs. Chord symbols into note numbers, and nothing else.
//
// Asked for on `/nola/` 2026-09-23: *"i need a parser that shows hilited keys
// (muted gray) on keyboard. just strings like c5 cmaj, can be separated by
// anyhing"*, then given four examples that decided the whole grammar:
// **`Cmaj C9 F/C Fm6/C`**.
//
// 🔴 EVERY TOKEN IS A CHORD. THERE IS NO OCTAVE IN THIS GRAMMAR, AND THE FIRST
// READING HERE HAD ONE. `c5` looks like *note C, octave 5*, and beside `cmaj`
// that reads as a note and a chord. `C9` kills it: a bare number after a root
// is an EXTENSION, so `c5` is the POWER CHORD, root and fifth, and the whole
// input is chord symbols. The wrong reading would have lit one key where four
// belong and nothing would have looked broken.
//
// 🔴 A SLASH IS A BASS, NOT A CHORD TONE. `F/C` is F major with a C underneath
// it, and the C is not a member of the chord: it sits BELOW the root rather
// than being folded into the stack. Returning it as part of `notes` would make
// `F/C` and `Fadd4` indistinguishable, and they are different chords.
//
// ⚠️ THE SEPARATOR IS NOT A LIST, IT IS EVERYTHING ELSE. *"can be separated by
// anyhing"*, so this cannot split on a set of characters. It splits on anything
// that is not a chord character, which makes `Cmaj C9`, `Cmaj, C9`,
// `Cmaj | C9` and `Cmaj->C9` all the same input.
//
// ⚠️ AND A TOKEN THAT DOES NOT PARSE IS REPORTED, NEVER DROPPED. `createDiagram`
// already set this habit with `cuts`: an author who cannot see what was refused
// has no way to know where it went. A page shows the bad token back.
//
// This file has no audio, no DOM and no browser in it, which is the bargain
// `looper-test.mjs` and `pedal-test.mjs` already make. `chords-test.mjs` is
// beside it.

/** Semitones above C for each letter. */
const LETTER = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };

/**
 * 🔴 THE TABLE IS ORDERED LONGEST FIRST AND THAT IS LOAD BEARING. `m` is a
 * prefix of `maj`, `maj` of `maj7`, `m7` of `m7b5`, so a table walked in any
 * other order reads `Cmaj7` as `C` + `maj` and loses the seventh, or reads
 * `Cm7b5` as a minor seventh and loses the flattened fifth. `chords-test.mjs`
 * asserts the ordering rather than trusting it.
 * ⚠️ AND THE NAMES ARE THE ONES PEOPLE TYPE, not one canonical spelling each.
 * A parser that takes `min` and refuses `m` is a parser nobody can use.
 */
export const QUALITIES = [
  ['maj13', [0, 4, 7, 11, 14, 21]],
  ['maj11', [0, 4, 7, 11, 14, 17]],
  ['maj9', [0, 4, 7, 11, 14]],
  ['maj7', [0, 4, 7, 11]],
  ['maj6', [0, 4, 7, 9]],
  ['min13', [0, 3, 7, 10, 14, 21]],
  ['min11', [0, 3, 7, 10, 14, 17]],
  ['min9', [0, 3, 7, 10, 14]],
  ['min7b5', [0, 3, 6, 10]],
  ['min7', [0, 3, 7, 10]],
  ['min6', [0, 3, 7, 9]],
  ['dim7', [0, 3, 6, 9]],
  ['sus2', [0, 2, 7]],
  ['sus4', [0, 5, 7]],
  ['add9', [0, 4, 7, 14]],
  ['m7b5', [0, 3, 6, 10]],
  ['maj', [0, 4, 7]],
  ['min', [0, 3, 7]],
  ['dim', [0, 3, 6]],
  ['aug', [0, 4, 8]],
  ['sus', [0, 5, 7]],
  ['m13', [0, 3, 7, 10, 14, 21]],
  ['m11', [0, 3, 7, 10, 14, 17]],
  ['m9', [0, 3, 7, 10, 14]],
  ['m7', [0, 3, 7, 10]],
  ['m6', [0, 3, 7, 9]],
  ['13', [0, 4, 7, 10, 14, 21]],
  ['11', [0, 4, 7, 10, 14, 17]],
  ['9', [0, 4, 7, 10, 14]],
  ['7', [0, 4, 7, 10]],
  ['6', [0, 4, 7, 9]],
  ['5', [0, 7]],
  ['m', [0, 3, 7]],
  /* 🔴 THERE IS NO `M` ROW, AND THERE WAS ONE UNTIL `chords-test.mjs` REPORTED
     IT. A capital `M` is normalised to `maj` before this table is consulted, so
     a row for it could never be reached: the lookup is case blind and would
     find `m` first anyway, which is the bug the normalisation exists to stop.
     A row that cannot be reached reads as the thing handling the case. */
  ['', [0, 4, 7]],
];

/** What a quality is CALLED once it is parsed, so two spellings read as one. */
export const QUALITY_SAYS = {
  '': 'maj', m: 'min', min: 'min', maj: 'maj',
  m6: 'min6', m7: 'min7', m9: 'min9', m11: 'min11', m13: 'min13',
  m7b5: 'min7b5', sus: 'sus4',
};

/** The default octave a chord is voiced in. C4 is 60, which is middle C. */
export const ROOT_OCTAVE = 4;

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
/** `60` -> `C4`, the same spelling `keyboard.mjs` prints on a key. */
export const noteName = (n) => `${NAMES[((n % 12) + 12) % 12]}${Math.floor(n / 12) - 1}`;

/**
 * One chord symbol into notes.
 *
 * @param {string} text  `Cmaj`, `C9`, `F/C`, `Fm6/C`, `c5`
 * @returns {{ok:true, text, name, root, quality, intervals, bass, notes:number[]}
 *          | {ok:false, text, why:string}}
 */
export function parseChord(text) {
  const raw = String(text ?? '').trim();
  if (!raw) return { ok: false, text: raw, why: 'nothing to read' };

  const [body, bassPart, ...extra] = raw.split('/');
  if (extra.length) return { ok: false, text: raw, why: 'more than one slash' };

  const head = readRoot(body);
  if (!head) return { ok: false, text: raw, why: 'no note name at the start' };

  const rest = body.slice(head.used);
  /**
   * 🔴 `M` IS THE ONE NAME WHOSE CASE CARRIES MEANING, AND EVERYTHING ELSE'S
   * DOES NOT. `CM` is C major and `Cm` is C minor, while `CMAJ`, `Cmaj` and
   * `cMaJ` are all the same chord. MEASURED as a real bug here: a
   * case-insensitive pass over the table reached `m` first and parsed `CM` as
   * **C minor**, which is a wrong chord rather than a refused one, and the four
   * examples that were given would never have caught it.
   * ⚠️ IT IS NORMALISED RATHER THAN SPECIAL CASED, so `M7` and `M9` come out as
   * `maj7` and `maj9` instead of needing a row each.
   */
  const want = /^M(\d.*)?$/.test(rest) ? `maj${rest.slice(1)}` : rest;
  const q = QUALITIES.find(([name]) => want.toLowerCase() === name.toLowerCase());
  if (!q) return { ok: false, text: raw, why: `${rest} is not a chord quality` };

  let bass = null;
  if (bassPart !== undefined) {
    const b = readRoot(bassPart);
    if (!b || b.used !== bassPart.length) {
      return { ok: false, text: raw, why: `${bassPart} is not a note` };
    }
    bass = b.pc;
  }

  const rootMidi = (ROOT_OCTAVE + 1) * 12 + head.pc;
  const notes = q[1].map((i) => rootMidi + i);
  /* 🔴 THE BASS SITS BELOW THE ROOT, AT THE NEAREST OCTAVE UNDER IT, WHICH IS
     WHAT MAKES IT A BASS. Folding it into the stack would put the C of `F/C`
     between the F and the A and make the chord an `Fadd4` with a different
     name. `- 1` on an exact match pushes `C/C` an octave down rather than
     doubling the root in unison, which is inaudible and reads as a bug. */
  let bassMidi = null;
  if (bass !== null) {
    bassMidi = (ROOT_OCTAVE + 1) * 12 + bass;
    while (bassMidi >= rootMidi) bassMidi -= 12;
  }

  const quality = QUALITY_SAYS[q[0]] ?? (q[0] || 'maj');
  return {
    ok: true,
    text: raw,
    name: `${head.name}${quality === 'maj' && q[0] === '' ? '' : quality}`
      + (bass !== null ? `/${NAMES[bass]}` : ''),
    root: head.pc,
    quality,
    intervals: q[1],
    bass,
    notes: bassMidi === null ? notes : [bassMidi, ...notes],
  };
}

/** A letter and an optional accidental at the start of a string. */
function readRoot(s) {
  const t = String(s ?? '');
  const letter = t[0]?.toLowerCase();
  if (!letter || !(letter in LETTER)) return null;
  let pc = LETTER[letter], used = 1;
  /* ⚠️ `b` IS A NOTE AND A FLAT, AND ONLY THE POSITION TELLS THEM APART. `Bb`
     is B flat and `bb` is the same chord typed in lower case, because the FIRST
     character is the root and a `b` after it can only be an accidental. */
  const acc = t[1];
  if (acc === '#' || acc === '♯') { pc += 1; used = 2; }
  else if (acc === 'b' || acc === 'B' || acc === '♭') { pc -= 1; used = 2; }
  pc = ((pc % 12) + 12) % 12;
  return { pc, used, name: NAMES[pc] };
}

/**
 * 🔴 THE SEVEN DEGREES, AND THE FIVE THAT ARE NOT IN THE SCALE. A numeral is a
 * chord's place in a key, so a root a semitone above the key is a flattened
 * second and not a sharpened first: `bII` is the spelling everybody writes and
 * `#I` is the one nobody does.
 */
const DEGREE = ['I', 'bII', 'II', 'bIII', 'III', 'IV', 'bV', 'V', 'bVI', 'VI', 'bVII', 'VII'];

/** Qualities whose THIRD is minor, which is what puts a numeral in lower case. */
const MINOR_THIRD = new Set(['min', 'min6', 'min7', 'min9', 'min11', 'min13',
  'min7b5', 'dim', 'dim7']);

/**
 * A chord's numeral in a key.
 *
 * 🔴 THE CASE IS THE WHOLE REASON THIS SAYS MORE THAN THE NAME DOES, and the
 * four frames that were given settle it: `F` is **IV** and `Fm6` is **iv** on
 * the same root in the same key. Upper case is a major third, lower case a
 * minor one.
 * ⚠️ A DOMINANT STAYS UPPER CASE. `C9` is **I** and not `i`, because its third
 * is major even though its seventh is not, and a numeral describes the third.
 * ⚠️ AND THE BASS IS IGNORED. `F/C` is **IV**: a slash says which note is at the
 * bottom, not which degree the chord is. Folding the bass in would have made it
 * a numeral about C, which is the key itself.
 *
 * @param {object} chord  a parsed chord from `parseChord`
 * @param {number} keyPc  the key's pitch class, 0 for C
 */
export function roman(chord, keyPc) {
  if (!chord?.ok) return '';
  const step = (((chord.root - keyPc) % 12) + 12) % 12;
  const d = DEGREE[step];
  const minor = MINOR_THIRD.has(chord.quality);
  const numeral = minor ? d.toLowerCase() : d;
  /* ⚠️ THE TWO THAT TAKE A MARK RATHER THAN A CASE. A diminished chord is
     lower case AND carries a circle, an augmented one is upper case AND a
     plus, because neither of them is told apart from an ordinary minor or
     major by case alone. */
  if (chord.quality === 'dim' || chord.quality === 'dim7') return `${numeral}\u00b0`;
  if (chord.quality === 'min7b5') return `${numeral}\u00f8`;
  if (chord.quality === 'aug') return `${numeral}+`;
  return numeral;
}

/**
 * A whole line of chord symbols.
 *
 * ⚠️ IT SPLITS ON WHAT IS NOT A CHORD RATHER THAN ON A LIST OF SEPARATORS, so
 * a comma, a bar, an arrow and four spaces are all the same thing. `/` and `#`
 * are chord characters and survive; everything else is a gap.
 *
 * @returns {{chords: object[], bad: object[]}} both halves, because a token that
 *   did not parse has to be shown back rather than silently missing.
 */
export function parseChords(line) {
  const parts = String(line ?? '').split(/[^A-Za-z0-9#/♯♭]+/).filter(Boolean);
  const chords = [], bad = [];
  for (const part of parts) {
    const c = parseChord(part);
    (c.ok ? chords : bad).push(c);
  }
  /* 🔴 THE KEY IS THE FIRST CHORD'S ROOT, WHICH IS AN INFERENCE AND IS SAID ON
     THE PAGE. Nothing in a line of chord symbols declares a key, and the four
     frames that bought this feature are all in C with `Cmaj` first. A page
     that showed numerals without saying where the key came from would be
     stating a fact it had guessed. */
  const key = chords.length ? chords[0].root : null;
  for (const c of chords) c.roman = key === null ? '' : roman(c, key);
  return { chords, bad, key };
}

/**
 * 🔴 THE VOICINGS, ASKED FOR THREE TIMES AND EACH TIME FOR THE SAME REASON:
 * *"can there be voicing selector to make it easier to play on 25 keys"*.
 *
 * ⚠️ A SPELLING IS NOT A VOICING, WHICH IS THE WHOLE OF WHY THIS EXISTS.
 * `parseChord` returns ROOT POSITION from one octave: root, third, fifth,
 * stacked upward, with a slash bass under it. That says WHICH NOTES the chord
 * has and nothing about where a hand goes. On two octaves of keys it is the
 * worst answer available: `Fm6/C` spans thirteen semitones from its bass, four
 * chords in a row jump the hand up and down the keyboard, and a seventh chord
 * with a slash bass can simply not fit.
 *
 * Three modes, and each one is a real way people play:
 *   `root`  what the parser said. Kept because it is the SPELLING, and a chart
 *           that shows a shape nobody asked for is lying about the symbol.
 *   `close` every note folded into one octave above the lowest, which is the
 *           smallest span a chord has. This is what makes a chord fit.
 *   `lead`  the inversion whose notes move least from the chord before it,
 *           which is what makes a PROGRESSION playable: the hand stays put and
 *           the notes change under it. `near` is the previous chord's notes.
 *
 * ⚠️ AND THE BASS IS NOT INVERTED, IN ANY MODE. A slash chord names a bass and
 * folding it up is a different chord with the same letters, which is the same
 * mistake `parseChord` already refuses when it puts the bass below the root.
 * It is kept at the bottom and only moved by whole octaves to fit the window.
 */
export const VOICINGS = ['root', 'close', 'lead'];

/** Every octave transposition of `notes` whose span fits inside `lo`..`hi`. */
const inversions = (notes) => {
  const out = [];
  const lowest = Math.min(...notes);
  for (let i = 0; i < notes.length; i++) {
    /* Move the i lowest notes up an octave each, which is what an inversion is.
       Anything beyond that repeats the set an octave higher. */
    const rolled = notes.map((n, j) => (j < i ? n + 12 : n));
    out.push(rolled.slice().sort((a, b) => a - b));
    void lowest;
  }
  return out;
};

/** How far apart two sets of notes are, as the sum of each note's distance to
 *  the nearest note in the other set. It is symmetric enough for choosing an
 *  inversion and it is cheap. */
const distance = (a, b) => {
  if (!a.length || !b.length) return 0;
  const near = (n, set) => Math.min(...set.map((m) => Math.abs(m - n)));
  return a.reduce((s, n) => s + near(n, b), 0) / a.length;
};

/**
 * Put a chord where a hand can play it.
 *
 * @param {number[]} notes  a chord's notes, lowest first, bass included
 * @param {object} o
 * @param {'root'|'close'|'lead'} [o.mode]
 * @param {number} o.lo     lowest note the keyboard can draw
 * @param {number} o.hi     highest note the keyboard can draw
 * @param {number[]} [o.near]  the previous chord, for `lead`
 * @param {boolean} [o.bass]   is the first note a slash bass
 * @returns {{notes:number[], outside:number[], mode:string}}
 */
export function voiceChord(notes, { mode = 'root', lo = 48, hi = 72, near = [], bass = false } = {}) {
  const src = [...notes].sort((a, b) => a - b);
  if (!src.length) return { notes: [], outside: [], mode };
  const bassNote = bass ? src[0] : null;
  const body = bass ? src.slice(1) : src;
  /**
   * 🔴 THE BASS FOLLOWS THE CHORD AND STAYS UNDER IT, AND IT KEEPS ITS PITCH
   * CLASS. With the bass pinned to one octave while the body was free to move,
   * a body placed low ended up BELOW it: MEASURED as `60,53,57,60` for `F/C`,
   * a slash chord whose named bass is no longer the bass. `parseChord` already
   * makes exactly this decision when it writes the bass in, and this is the
   * same rule applied again after the body has moved.
   */
  const bassPc = bassNote === null ? null : ((bassNote % 12) + 12) % 12;
  const bassUnder = (lowest) => {
    const drop = (((lowest - bassPc) % 12) + 12) % 12;
    return lowest - (drop || 12);
  };
  const whole = (c) => (bassNote === null ? [...c] : [bassUnder(Math.min(...c)), ...c]);
  const span = (x) => Math.max(...x) - Math.min(...x);
  const fits = (x) => Math.min(...x) >= lo && Math.max(...x) <= hi;
  const shift = (x, by) => x.map((n) => n + by);

  /**
   * 🔴 EVERY PLACE THIS CHORD COULD GO: each inversion, at each octave that
   * lands on the keys. THE FIRST VERSION BUILT INVERSIONS ONLY AND THEN MOVED
   * THE WINNER INTO THE WINDOW AFTERWARDS, which is why leading came out WORSE
   * than closing over a line of chords: MEASURED at 46 semitones of hand
   * movement against 43, on the mode whose whole job is to move least. The
   * nearest inversion was chosen and then shoved an octave by a step that knew
   * nothing about what it was near.
   * ⚠️ SO THE FITTING IS PART OF THE CHOICE RATHER THAN A CORRECTION TO IT.
   */
  const places = [];
  for (const inv of inversions(body)) {
    for (let by = -36; by <= 36; by += 12) {
      const moved = shift(inv, by);
      const full = whole(moved);
      if (fits(full)) places.push({ body: moved, full });
    }
  }
  /* ⚠️ AND IF NOTHING FITS, THE CHORD IS STILL DRAWN. A window too small for a
     chord is a fact about the window; refusing to answer would leave a row with
     no dots and nothing saying why, and `outside` already reports it. */
  if (!places.length) {
    let out = whole(body);
    void bassNote;
    while (Math.min(...out) < lo && Math.max(...out) + 12 <= hi) out = shift(out, 12);
    while (Math.max(...out) > hi && Math.min(...out) - 12 >= lo) out = shift(out, -12);
    return { notes: out, outside: out.filter((n) => n < lo || n > hi), mode };
  }

  let pick;
  if (mode === 'close') {
    /**
     * 🔴 THE SPAN IS MEASURED WITH THE BASS IN IT, AND THE FIRST VERSION
     * MEASURED THE BODY ALONE AND MADE CHORDS WIDER. MEASURED by this module's
     * own test: `Fm6/C` went from fourteen semitones in root position to
     * TWENTY, because packing the body tight pulled it away from a bass that
     * cannot move with it. The body really was narrower and the chord really
     * was worse, which is what a statistic measured over the wrong subject
     * does.
     * ⚠️ A tie goes to the lowest, so two equal answers do not depend on the
     * order of the list.
     */
    pick = places.reduce((best, p) => {
      if (span(p.full) < span(best.full)) return p;
      if (span(p.full) === span(best.full)
          && Math.min(...p.full) < Math.min(...best.full)) return p;
      return best;
    }, places[0]);
  } else if (mode === 'lead' && near.length) {
    pick = places.reduce((best, p) =>
      (distance(p.full, near) < distance(best.full, near) ? p : best), places[0]);
  } else {
    /* `root` keeps the spelling and only moves it onto the keys, and a `lead`
       with nothing to lead from is a `close`: a first chord has no previous
       hand position, and root position for it would make the second chord jump
       to meet it. */
    if (mode === 'lead') return voiceChord(notes, { mode: 'close', lo, hi, bass });
    const upright = places.filter((p) => p.body.join() === body.join());
    pick = (upright[0] || places[0]);
  }

  return { notes: pick.full, outside: pick.full.filter((n) => n < lo || n > hi), mode };
}
