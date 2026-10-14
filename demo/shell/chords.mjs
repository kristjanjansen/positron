// demo/shell/chords.mjs: chord symbols into note numbers. Every token is a chord, no octave: `c5`
// is a power chord. A slash is a bass below the root, not a chord tone. Anything that is not a
// chord character separates; a token that does not parse is reported, never dropped. No DOM or audio.
// why: lessons/kit-chords.md#header

/** Semitones above C for each letter. */
const LETTER = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };

/**
 * Ordered longest first, which is load bearing: `m` is a prefix of `maj`, `m7` of `m7b5`.
 * chords-test.mjs asserts the order. Names are the ones people type, several per chord.
 * why: lessons/kit-chords.md#qualities
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
  /**
   * Five counted spellings (3,026 of 159,644 chords) of chords already here; each maps through
   * `QUALITY_SAYS` to an existing name. `^` is still a separator, so `C^` reads as C major.
   * why: lessons/kit-chords.md#glyph-spellings
   */
  ['hdim7', [0, 3, 6, 10]],
  ['h7', [0, 3, 6, 10]],
  ['o7', [0, 3, 6, 9]],
  ['maj', [0, 4, 7]],
  ['min', [0, 3, 7]],
  ['dim', [0, 3, 6]],
  ['aug', [0, 4, 8]],
  // `+` is an augmented triad, the ordinary spelling; the splitter keeps it as a chord character.
  // why: lessons/kit-chords.md#plus
  ['+', [0, 4, 8]],
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
  /**
   * `2` is `[0, 2, 7]`, no third, so `C2/E` puts the third in the bass: E3 C4 D4 G4 (52 60 62 67).
   * Same notes as `sus2` on purpose; `[0, 2, 4, 7]` is `add9` already. Written 0 times in the corpora.
   * why: lessons/kit-chords.md#two
   */
  ['2', [0, 2, 7]],
  ['m', [0, 3, 7]],
  // `h` and `o` sit down here with `m`, below the longer rows they prefix (`h7`, `o7`).
  // why: lessons/kit-chords.md#h-and-o
  ['h', [0, 3, 6, 10]],
  ['o', [0, 3, 6]],
  // No `M` row: a capital `M` is normalised to `maj` first, so such a row could never be reached.
  // why: lessons/kit-chords.md#no-m-row
  ['', [0, 4, 7]],
];

/**
 * What a quality is called once parsed, so two spellings read as one.
 * `2` is deliberately absent, so `C2` reads `C2` and not `sus2`.
 * why: lessons/kit-chords.md#quality-says
 */
export const QUALITY_SAYS = {
  '': 'maj', m: 'min', min: 'min', maj: 'maj',
  m6: 'min6', m7: 'min7', m9: 'min9', m11: 'min11', m13: 'min13',
  m7b5: 'min7b5', sus: 'sus4',
  hdim7: 'min7b5', h7: 'min7b5', h: 'min7b5', o7: 'dim7', o: 'dim', '+': 'aug',
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
   * `M` is the one name whose case carries meaning: `CM` is C major, `Cm` C minor.
   * Normalised rather than special cased, so `M7` and `M9` become `maj7` and `maj9`.
   * why: lessons/kit-chords.md#capital-m
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
  // The bass sits at the nearest octave below the root; folding it in would make `F/C` an `Fadd4`.
  // `- 1` on an exact match puts `C/C` an octave down rather than in unison.
  // why: lessons/kit-chords.md#bass
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
  // `b` is a note and a flat; only position tells: the first character is the root.
  // why: lessons/kit-chords.md#flat-b
  const acc = t[1];
  if (acc === '#' || acc === '♯') { pc += 1; used = 2; }
  else if (acc === 'b' || acc === 'B' || acc === '♭') { pc -= 1; used = 2; }
  pc = ((pc % 12) + 12) % 12;
  return { pc, used, name: NAMES[pc] };
}

/**
 * The seven degrees and the five not in the scale: a semitone above the key is `bII`, not `#I`.
 * why: lessons/kit-chords.md#degree
 */
const DEGREE = ['I', 'bII', 'II', 'bIII', 'III', 'IV', 'bV', 'V', 'bVI', 'VI', 'bVII', 'VII'];

/** Qualities whose THIRD is minor, which is what puts a numeral in lower case. */
const MINOR_THIRD = new Set(['min', 'min6', 'min7', 'min9', 'min11', 'min13',
  'min7b5', 'dim', 'dim7']);

/**
 * A chord's numeral in a key. Case is the third: `F` is IV, `Fm6` is iv; a dominant stays upper
 * case; the bass is ignored, so `F/C` is IV.
 * @param {object} chord  a parsed chord from `parseChord`
 * @param {number} keyPc  the key's pitch class, 0 for C
 * why: lessons/kit-chords.md#roman
 */
export function roman(chord, keyPc) {
  if (!chord?.ok) return '';
  const step = (((chord.root - keyPc) % 12) + 12) % 12;
  const d = DEGREE[step];
  const minor = MINOR_THIRD.has(chord.quality);
  const numeral = minor ? d.toLowerCase() : d;
  // Diminished takes a circle and augmented a plus, since case alone cannot tell them apart.
  // why: lessons/kit-chords.md#roman-marks
  if (chord.quality === 'dim' || chord.quality === 'dim7') return `${numeral}\u00b0`;
  if (chord.quality === 'min7b5') return `${numeral}\u00f8`;
  if (chord.quality === 'aug') return `${numeral}+`;
  return numeral;
}

/**
 * A whole line of chord symbols. Splits on whatever is not a chord character; `/` and `#` survive.
 * @returns {{chords: object[], bad: object[]}} both halves, because a token that did not parse has to be shown back rather than silently missing.
 * why: lessons/kit-chords.md#parsechords
 */
/** What a typed line is split on: everything that cannot be part of a chord. */
export const CHORD_GAP = /[^A-Za-z0-9#/♯♭+]+/;

export function parseChords(line) {
  // A `+` standing on its own is still a gap, so `C + G` is two chords.
  // why: lessons/kit-chords.md#lone-plus
  const parts = String(line ?? '').split(CHORD_GAP).filter((p) => p && !/^\++$/.test(p));
  const chords = [], bad = [];
  for (const part of parts) {
    const c = parseChord(part);
    (c.ok ? chords : bad).push(c);
  }
  // The key is the first chord's root, an inference, and the page says so.
  // why: lessons/kit-chords.md#key
  const key = chords.length ? chords[0].root : null;
  for (const c of chords) c.roman = key === null ? '' : roman(c, key);
  return { chords, bad, key };
}

/**
 * Voicings, so a chord fits 25 keys. `root` the spelling, `close` one octave, `lead` least motion
 * from `near`, `split` the root alone underneath and the rest above. A slash chord keeps its root in
 * `split`; the root is read as the lowest note; the bass is never inverted, only moved by octaves.
 * why: lessons/kit-chords.md#voicings
 */
export const VOICINGS = ['root', 'close', 'lead', 'split'];

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
 * @param {'root'|'close'|'lead'|'split'} [o.mode]
 * @param {number} o.lo     lowest note the keyboard can draw
 * @param {number} o.hi     highest note the keyboard can draw
 * @param {number[]} [o.near]  the previous chord, for `lead` and `split`
 * @param {boolean} [o.bass]   is the first note a slash bass
 * @returns {{notes:number[], outside:number[], mode:string}}
 */
export function voiceChord(notes, { mode = 'root', lo = 48, hi = 72, near = [], bass = false } = {}) {
  const src = [...notes].sort((a, b) => a - b);
  if (!src.length) return { notes: [], outside: [], mode };
  let bassNote = bass ? src[0] : null;
  let body = bass ? src.slice(1) : src;
  /**
   * `split` changes only the body and the note underneath; the rest is the shared machinery.
   * A chord with fewer than two notes above its bass is left whole.
   * why: lessons/kit-chords.md#split
   */
  const split = mode === 'split';
  /**
   * The root leaves the hand only when it is the note going underneath, so a split voicing always
   * holds exactly the pitch classes of the spelling. A slash chord keeps its root.
   * why: lessons/kit-chords.md#droproot
   */
  const dropRoot = split && bassNote === null && body.length >= 2;
  if (dropRoot) {
    bassNote = body[0];
    body = body.slice(1);
  }
  /**
   * The bass follows the body and stays under it with its pitch class; pinned, `F/C` came out
   * `60,53,57,60`, a bass no longer the bass.
   * why: lessons/kit-chords.md#bass-follows
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
   * Every inversion at every octave on the keys; fitting is part of the choice. Fitting after
   * choosing made `lead` move 46 semitones against `close`'s 43.
   * why: lessons/kit-chords.md#places
   */
  const places = [];
  for (const inv of inversions(body)) {
    for (let by = -36; by <= 36; by += 12) {
      const moved = shift(inv, by);
      const full = whole(moved);
      if (fits(full)) places.push({ body: moved, full });
    }
  }
  // If nothing fits, the chord is still drawn; `outside` reports it.
  // why: lessons/kit-chords.md#nothing-fits
  if (!places.length) {
    let out = whole(body);
    void bassNote;
    while (Math.min(...out) < lo && Math.max(...out) + 12 <= hi) out = shift(out, 12);
    while (Math.max(...out) > hi && Math.min(...out) - 12 >= lo) out = shift(out, -12);
    return { notes: out, outside: out.filter((n) => n < lo || n > hi), mode };
  }

  // The two ways of choosing, named once, because `split` needs both.
  // why: lessons/kit-chords.md#byspan
  const bySpan = (list) => list.reduce((best, p) => {
    if (span(p.full) < span(best.full)) return p;
    if (span(p.full) === span(best.full)
        && Math.min(...p.full) < Math.min(...best.full)) return p;
    return best;
  }, list[0]);
  const nearestTo = (list, want, of) => list.reduce((best, p) =>
    (distance(of(p), want) < distance(of(best), want) ? p : best), list[0]);

  let pick;
  if (mode === 'close') {
    /**
     * The span is measured with the bass in it; body alone took `Fm6/C` from 14 semitones to 20.
     * A tie goes to the lowest.
     * why: lessons/kit-chords.md#close
     */
    pick = bySpan(places);
  } else if (split) {
    /**
     * Distance is measured over the body, not the walking bass: the hand travels 114 semitones that
     * way against 132 over thirty chords. The previous hand is `near` minus its lowest note.
     * why: lessons/kit-chords.md#split-distance
     */
    const prev = [...near].sort((a, b) => a - b);
    const nearBody = prev.length > 1 ? prev.slice(1) : prev;
    // With nothing to move from, split uses the closest place, as `lead` does for a first chord.
    // why: lessons/kit-chords.md#split-first
    pick = nearBody.length ? nearestTo(places, nearBody, (p) => p.body) : bySpan(places);
  } else if (mode === 'lead' && near.length) {
    pick = nearestTo(places, near, (p) => p.full);
  } else {
    // `root` keeps the spelling and only moves it onto the keys; a `lead` with nothing to lead from
    // is a `close`.
    // why: lessons/kit-chords.md#root-lead
    if (mode === 'lead') return voiceChord(notes, { mode: 'close', lo, hi, bass });
    const upright = places.filter((p) => p.body.join() === body.join());
    pick = (upright[0] || places[0]);
  }

  return { notes: pick.full, outside: pick.full.filter((n) => n < lo || n > hi), mode };
}
