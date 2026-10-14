// iRb jazz and McGill Billboard into one key-relative (degree, class) alphabet, so bII7 and
// V7/V are sayable; mode is not a field (0maj and 0min differ). Class feeds the model,
// spelling the display. Reads tmp/chord-corpora/ (fetch-chord-corpora.mjs), never a page.
// See lessons/page-resources.md#resources-31

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
 * Seven classes, each a different thing to do next. sus stays apart from dom (iRb has 658
 * sus against 13,211 plain 7); min6 and minmaj7 fold into min, a known limitation.
 * See lessons/page-resources.md#resources-32
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
 * A symbol as a reader sees it: `2min` -> `ii`, `7dom` -> `V7`, `1dom` -> `bII7`.
 * Follows chords.mjs's roman() spelling.
 * See lessons/page-resources.md#resources-33
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
 * One `.jazz` file into a chord sequence, honouring the `*>[A,N1,...]` expansion list so
 * turnarounds exist; transitions repeat as often as their section is played.
 * See lessons/page-resources.md#resources-34
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
  /* The slash is a bass and is dropped, as roman() in chords.mjs does: Dmin7/G is a ii.
     See lessons/page-resources.md#resources-35 */
  const slash = s.indexOf('/');
  if (slash >= 0) s = s.slice(0, slash);
  const cls = classOf(s);
  if (!cls) return null;
  return { pc: r.pc, cls, spell: s || 'maj' };
}

/* ── McGill Billboard, the SALAMI chord text ───────────────────────────────── */

/**
 * One `salami_chords.txt` into a chord sequence. The tonic is tracked as the file is walked
 * (83 of 890 files modulate); `N` and `X` break the sequence.
 * See lessons/page-resources.md#resources-36
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
 * An immediate repeat is one harmonic event and is collapsed on (degree, class), else self
 * transitions dominate and the suggester answers the chord already playing.
 * See lessons/page-resources.md#resources-37
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
