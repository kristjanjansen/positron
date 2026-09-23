// demo/resources/chord-corpus.mjs. Two corpora into one key-relative alphabet.
//
// Read by `demo/resources/bench-chord-suggester.mjs`, which grades suggesters,
// and by `demo/resources/build-chord-tables.mjs`, which writes the table that
// ships. It parses nothing at runtime on any page: the corpora live in
// `tmp/chord-corpora/`, gitignored, fetched once by
// `demo/resources/fetch-chord-corpora.mjs`.
//
// 🔴 THE ALPHABET IS `(DEGREE, CLASS)` AND NOT A ROMAN NUMERAL, AND THAT IS THE
// WHOLE REASON THIS CAN EXPRESS WHAT THE 173 BYTE RULE CANNOT. A diatonic
// numeral alphabet has seven slots and every one of them is in the key, so a
// tritone substitution, a secondary dominant, a backdoor cadence and a borrowed
// chord are all unsayable in it. A degree is 0 to 11 semitones above the tonic,
// so `bII7` and `V7/V` and `bVII7` all have somewhere to live.
//
// 🔴 AND THE MODE IS NOT A FIELD, WHICH IS DELIBERATE. McGill Billboard states a
// tonic and never states a mode, and inferring one would be a guess written into
// the data. It does not need to be inferred: `0maj` and `0min` are different
// symbols, so a context beginning on a minor tonic is already a different
// context from one beginning on a major tonic, and the table learns the two
// separately without anybody declaring which is which.
//
// ⚠️ CLASS IS FOR THE MODEL AND SPELLING IS FOR THE DISPLAY, and they are two
// fields rather than one. `7`, `7b9`, `7alt`, `13` and `7#11` are one functional
// class, because a suggester suggests a FUNCTION and the alteration is a
// voicing. But a page that answers `G7` where 1,966 standards wrote `G7b9` has
// thrown away the thing that makes the answer read as jazz. So every cell also
// carries the commonest surface spelling counted for it.

/** Semitones above C. Humdrum writes a flat `-`; Harte writes it `b`. */
const LETTER = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };

/** A root letter with any accidentals. Returns the pitch class and how far it read. */
export function readRoot(s, flatChar = 'b') {
  const letter = s[0]?.toLowerCase();
  if (letter === undefined || !(letter in LETTER)) return null;
  let pc = LETTER[letter], used = 1;
  while (used < s.length) {
    const c = s[used];
    if (c === '#') { pc += 1; used++; }
    else if (c === flatChar || (flatChar === '-' && c === '-')) { pc -= 1; used++; }
    else break;
  }
  return { pc: ((pc % 12) + 12) % 12, used };
}

/**
 * 🔴 SEVEN CLASSES, AND EVERY ONE OF THEM IS A DIFFERENT THING TO DO NEXT.
 * This is the list Open Studio's devices are built out of: a ii is `min`, its V
 * is `dom`, a minor ii is `hdim`, a tritone sub is a `dom` on another degree, a
 * backdoor is a `dom` on bVII, a passing chord is `dim`.
 * ⚠️ `sus` IS KEPT APART FROM `dom` RATHER THAN FOLDED INTO IT. It resolves the
 * same way and it is a different sound, and iRb writes 543 `7sus` and 115 `9sus`
 * against 13,211 plain `7`, which is enough to count separately.
 * ⚠️ AND `min6` AND `minmaj7` ARE FOLDED INTO `min`, WHICH LOSES SOMETHING REAL.
 * They are the tonic-minor colour and `min7` is the ii colour, and on degree 0
 * they mean different things. That is a known limitation of this alphabet and it
 * is named in the benchmark's report rather than hidden.
 */
export const CLASSES = ['maj', 'min', 'dom', 'hdim', 'dim', 'sus', 'aug'];

/** A quality string into one of the seven. `null` means do not count this chord. */
export function classOf(q) {
  const s = String(q ?? '').trim().toLowerCase();
  if (s === '' || s === '^') return 'maj';

  // Suspended first: `sus4(b7)` and `7sus` are dominant-functioning and both
  // carry `sus`, so a `7` test ahead of this one would swallow them.
  if (/sus/.test(s)) return 'sus';

  // Half diminished and diminished before minor, because `hdim7` contains no
  // `min` but `min7b5` does and they are the same chord.
  if (/^h/.test(s) || /hdim/.test(s) || /min7b5/.test(s) || /m7b5/.test(s)) return 'hdim';
  if (/^o/.test(s) || /^dim/.test(s)) return 'dim';

  // `minmaj7` is a minor chord. Test it before the `maj` branch, which would
  // otherwise claim it.
  if (/^min|^m(?![a7])|^-/.test(s)) return 'min';
  if (/^\+|^aug/.test(s)) return 'aug';
  if (/^maj|^\^|^6|^69|^1$|^5$/.test(s)) return 'maj';

  // Everything numeric left over is a dominant: `7`, `9`, `11`, `13`, `7b9`,
  // `7#5`, `7alt`, `7b13`, `9#11`.
  if (/^\d|^alt/.test(s)) return 'dom';
  return null;
}

/** `0maj`, `2min`, `7dom`. One string, so a map key costs nothing. */
export const sym = (degree, cls) => `${degree}${cls}`;

const DEGREE = ['I', 'bII', 'II', 'bIII', 'III', 'IV', 'bV', 'V', 'bVI', 'VI', 'bVII', 'VII'];
const LOWER = new Set(['min', 'hdim', 'dim']);

/**
 * A symbol as a reader sees it. `2min` -> `ii`, `7dom` -> `V7`, `1dom` -> `bII7`.
 * ⚠️ IT FOLLOWS `chords.mjs`'s `roman()` RATHER THAN INVENTING A SECOND
 * SPELLING: lower case is a minor third, a half diminished carries the slashed
 * circle, a diminished the circle, an augmented the plus.
 */
export function say(s) {
  const m = /^(\d+)(.+)$/.exec(s);
  if (!m) return s;
  const d = DEGREE[Number(m[1])], cls = m[2];
  const n = LOWER.has(cls) ? d.toLowerCase() : d;
  if (cls === 'dom') return `${n}7`;
  if (cls === 'sus') return `${n}7sus`;
  if (cls === 'hdim') return `${n}ø`;
  if (cls === 'dim') return `${n}°`;
  if (cls === 'aug') return `${n}+`;
  if (cls === 'min') return n;
  return n;
}

/* ── iRb, the Humdrum `**jazz` spine ───────────────────────────────────────── */

/**
 * One `.jazz` file into a chord sequence.
 *
 * 🔴 THE EXPANSION LIST IS HONOURED, WHICH IS WHAT MAKES A TURNAROUND EXIST.
 * `*>[A,N1,A,N2,B,A2]` is the order the sections are played in, and the
 * transition from the last chord of A back to its first chord is the turnaround
 * this benchmark is asked to test for. A parser that read the file top to bottom
 * would never see one, because in the file A appears once.
 * ⚠️ IT ALSO REPEATS EVERY OTHER TRANSITION IN A SECTION AS MANY TIMES AS THE
 * SECTION IS PLAYED, which is a weighting decision rather than a neutral one.
 * The benchmark reports the counts both ways.
 */
export function parseIrb(text, { expand = true } = {}) {
  const lines = text.split(/\r?\n/);
  let tonic = null, order = null, cur = null;
  const sections = new Map();
  const flat = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('!')) continue;
    if (line.startsWith('*')) {
      const key = /^\*([A-Ga-g][-#]*):$/.exec(line);
      if (key) { const r = readRoot(key[1], '-'); if (r) tonic = r.pc; continue; }
      const exp = /^\*>\[(.+)\]$/.exec(line);
      if (exp) { order = exp[1].split(',').map((s) => s.trim()); continue; }
      const sec = /^\*>(.+)$/.exec(line);
      if (sec) { cur = sec[1].trim(); if (!sections.has(cur)) sections.set(cur, []); continue; }
      continue;                                   // `*M4/4`, `*-`, `**jazz`
    }
    if (line === '=' || line.startsWith('=')) continue;          // barlines
    const tok = /^[0-9.]+(.*)$/.exec(line);
    if (!tok) continue;
    const c = irbChord(tok[1]);
    if (!c) continue;
    flat.push(c);
    if (cur !== null) sections.get(cur).push(c);
  }

  let seq = flat;
  if (expand && order && sections.size) {
    const built = [];
    for (const label of order) {
      const s = sections.get(label);
      if (s) built.push(...s);
    }
    if (built.length) seq = built;
  }
  return { tonic, chords: seq, sectioned: Boolean(order && sections.size) };
}

/** `G:min7` -> {pc 7, q 'min7'}. `E-7b9` -> {pc 3, q '7b9'}. `min7/F` drops the bass. */
function irbChord(t) {
  let s = String(t).trim();
  if (!s || s === 'r' || s === '.') return null;          // `r` is a rest
  const r = readRoot(s, '-');
  if (!r) return null;
  s = s.slice(r.used);
  if (s.startsWith(':')) s = s.slice(1);
  /* ⚠️ THE SLASH IS A BASS AND IS DROPPED, WHICH IS THE RULE `chords.mjs`
     ALREADY MADE: *"A SLASH IS A BASS, NOT A CHORD TONE"*, and `roman()` in that
     file ignores it for exactly this reason. `Dmin7/G` is still a ii. */
  const slash = s.indexOf('/');
  if (slash >= 0) s = s.slice(0, slash);
  const cls = classOf(s);
  if (!cls) return null;
  return { pc: r.pc, cls, spell: s || 'maj' };
}

/* ── McGill Billboard, the SALAMI chord text ───────────────────────────────── */

/**
 * One `salami_chords.txt` into a chord sequence.
 *
 * ⚠️ THE TONIC MOVES AND THE FILE SAYS SO. 83 of 890 files declare more than one
 * `# tonic:`, up to nine of them, so the tonic is tracked as the file is walked
 * rather than read once from the head. Reading it once would put every chord
 * after a modulation on the wrong degree.
 * ⚠️ `N` AND `X` BREAK THE SEQUENCE rather than being counted. A silence is not
 * a chord and a transition across one is not a transition.
 */
export function parseBillboard(text) {
  const out = [];             // arrays of chords, one per unbroken run
  let run = [];
  let tonic = null;
  const push = () => { if (run.length) out.push(run); run = []; };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#')) {
      const t = /^#\s*tonic:\s*([A-G][b#]*)/.exec(line);
      if (t) { const r = readRoot(t[1], 'b'); if (r) { push(); tonic = r.pc; } }
      continue;
    }
    const tab = line.indexOf('\t');
    const body = tab >= 0 ? line.slice(tab + 1) : line;
    if (/^(silence|end|Z)\b/.test(body)) { push(); continue; }
    if (!body.includes('|')) continue;

    const bars = body.split('|').slice(1, -1);
    for (const bar of bars) {
      for (const tok of bar.trim().split(/\s+/)) {
        if (!tok || tok === '.' || tok === '*') continue;       // a held beat
        if (tok === 'N' || tok === 'X') { push(); continue; }
        if (tok.startsWith('&') || tok.startsWith('(')) continue;   // `&pause`, `(4)`
        const c = billboardChord(tok, tonic);
        if (c) run.push(c);
      }
    }
  }
  push();
  return { tonic, runs: out };
}

function billboardChord(tok, tonic) {
  if (tonic === null) return null;
  const r = readRoot(tok, 'b');
  if (!r) return null;
  let s = tok.slice(r.used);
  if (s.startsWith(':')) s = s.slice(1);
  const slash = s.indexOf('/');
  if (slash >= 0) s = s.slice(0, slash);
  const cls = classOf(s);
  if (!cls) return null;
  return { pc: r.pc, cls, spell: s || 'maj' };
}

/* ── Chords into symbols ───────────────────────────────────────────────────── */

/**
 * 🔴 AN IMMEDIATE REPEAT IS ONE HARMONIC EVENT AND IS COLLAPSED, AND THIS IS THE
 * SINGLE BIGGEST DECISION IN THIS FILE. `| A:min | A:min | C:maj |` is a chord
 * held for two bars, not a progression that goes to itself. Counted raw, a self
 * transition is the commonest transition in both corpora by a wide margin, and a
 * suggester trained on that learns to answer *the chord you are already playing*,
 * which is the most predictable answer there is and the least useful.
 * ⚠️ IT IS COLLAPSED ON `(DEGREE, CLASS)` RATHER THAN ON THE SPELLING, so
 * `Cmaj7` following `C6` is also one event. They are the same function.
 */
export function toSymbols(chords, tonic, { collapse = true } = {}) {
  const out = [];
  for (const c of chords) {
    const deg = (((c.pc - tonic) % 12) + 12) % 12;
    const s = sym(deg, c.cls);
    if (collapse && out.length && out[out.length - 1].s === s) continue;
    out.push({ s, spell: c.spell, pc: c.pc, deg, cls: c.cls });
  }
  return out;
}
