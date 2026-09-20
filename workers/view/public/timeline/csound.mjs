// timeline/csound.mjs — a Csound/vClick SCORE, compiled into timeline rows.
//
// The claim this file exists to make good on (demo/notes/uuu-positron.md §3):
// a vClick score is a fine authoring format and a poor runtime one, and the
// three places it runs out are all places this library already has an answer.
//
//   · No quotation. A score is flat events, so "that passage again, three
//     times" has to be written out again — which is why vClick's README says
//     every piece needs its own written-out score. Csound HAS the syntax for it
//     (`m name` marks, `n name` repeats), and this compiler turns those into
//     quotation geometry instead of duplicated lines.
//   · Seek is not a property of the format. To start at bar 47 you need the
//     STATE at bar 47 — which tempo is in force, what is still ringing. The
//     score carries no fold; `deck.reduceAt(kind, pos)` computes one.
//   · Tempo lives in the score, not the transport, so a client cannot derive
//     "where are we now" for itself and the server must tell it — the network
//     in the critical path of every beat. Compiled here ONCE into a beat↔ms map
//     the client owns.
//
// WHAT A CSOUND SCORE IS, in the three statements that matter:
//
//     t 0 120  30 90        tempo: 120 bpm at beat 0, ramping to 90 at beat 30
//     i 1  0.0  2.0  8000 440
//       │   │    │    └────┴── p4, p5: whatever that instrument reads
//       │   │    └── p3: duration, IN BEATS
//       │   └── p2: start, IN BEATS, absolute within its section
//       └── p1: which instrument
//     s                     end of a section — and the start of a new clock
//
// P2 AND P3 ARE BEATS, NOT SECONDS. That is the whole reason this is a compiler
// and not a parser: with a `t` statement the beat→second map is the integral of
// 60/tempo(beat). Csound interpolates SECONDS PER BEAT linearly in beat, so
// that integral is a TRAPEZOID of 60/tempo — not the logarithmic integral a
// linear-in-tempo reading gives. Getting it wrong is silent: every note lands,
// slightly late, and only an accelerando shows it. The default when a score
// carries no `t` is 60 bpm, which is why so many scores read as if p2 were
// seconds — at 60 bpm it is.
//
// AND A SECTION IS A NEW CLOCK. `s` does not merely restart p2 at zero: it
// throws the tempo away. Everything below about sections is MEASURED against
// csound 6.18 (`timeline/lab/csound-oracle.mjs`), because this file was 22/22
// green for months with two real defects that only the reference could see —
// a test that derives its expected value from the same formula the compiler
// implements can catch a typo and can never catch a misreading (LESSONS #43).
// What the reference says, at every onset of a three-section score:
//
//   1. The next section starts at the previous section's END TIME, in seconds.
//   2. A section ENDS at the furthest of: every `i` statement's p2 + p3 (a
//      negative p3 means "until turned off" and contributes only its p2),
//      every `f` statement's p2, and the `s` statement's own argument if it
//      has one — all of them in that section's beats, warped by that
//      section's tempo. An empty section takes no time at all.
//   3. Each section has its OWN tempo map, and it RESETS TO 60 BPM unless the
//      section declares its own `t`. A `t` governs the whole section wherever
//      in it it sits, and where a section has more than one, the last wins.
//   4. A `t` whose first pair is not at beat 0 is ignored ENTIRELY — the
//      section stays at 60 bpm. It is not held back to beat 0.
//   5. `b`, the clock base, resets to 0 at `s`. It offsets in BEATS, and it
//      offsets `f` statements as well as notes — but NOT the `s` argument.
//   6. The `+` time carry resets at `s`, and so does `^`. The P-FIELD carry
//      does not: `.` still carries p2 and p3 across the boundary, while p4
//      and everything after it come back as 0. Nobody would guess that; it is
//      what csound does.
//
// BEATS REPORTED HERE ARE GLOBAL. Sections are laid end to end on one beat
// axis (`payload.beat`, `sections[i].fromBeat`), because a score document
// carries one beat axis and a deck needs one position. The beat as the
// musician WROTE it — section-local, starting again at zero — is
// `payload.sectionBeat`. `compiled.tempo` is a single map over the global axis
// that reproduces every row's millisecond, spelling each section boundary as
// two points at the same beat: a piecewise-linear map's way of writing a jump.

/** Tempo when a score declares none. At 60 bpm one beat is one second. */
export const DEFAULT_BPM = 60;

// ---------------------------------------------------------------------------
// 1a. MACROS — `#define` / `$NAME`, because real scores do not start without it
// ---------------------------------------------------------------------------
//
// 🔴 EVERY REAL vCLICK SCORE THREW HERE UNTIL 2026-09-14, AT LINE 12 OF LINE 12.
// Both scores published in `tarmoj/vclick` open with `t 0 $REPTEMPO`, so the
// tempo came back NaN and `tempoMap` threw before a single note was read. The
// compiler had been 42/42 green for a week against fixtures written to please
// it, and could not compile the only two real files in existence.
//
// ⚠️ EVERY RULE BELOW WAS MEASURED AGAINST `scsort` (csound 6.18.1), NOT READ
// OFF THE MANUAL — that is this repo's rule about implementing somebody else's
// format, and it is why several things the plan said to REFUSE are supported
// here instead. `scsort` reads a score on stdin and prints it sorted and
// tempo-warped, with p2 and p3 each as a (beats, seconds) pair, which makes it
// a far better oracle than an orchestra that has to `prints` its own p-fields.
//
//   $NAME            ✅ 3          plain substitution
//   $NAME.           ✅ 3          the dot TERMINATES the name and is consumed
//   $M(5'99)         ✅ 5 … 99     arguments, separated by an apostrophe
//   #define A #3# twice            ✅ the LAST definition wins
//   a body over two lines          ✅ works, so the body is not line-bounded
//   [$N/2] with N 4  ✅ 2          macros expand BEFORE brackets are evaluated
//
// 🔴 AND THE ONE THAT DECIDES THE ERROR HANDLING. An undefined `$NOPE` does not
// leave itself in place and does not stop the score: MEASURED, `i 1 $NOPE 1 100`
// sorts to a bare `i 1` — the macro AND THE REST OF THE LINE are gone — and
// then csound's p-field carry refills p2/p3/p4 from the previous note. So a
// mistyped macro name presents as a DUPLICATE NOTE, which is the worst
// available shape: no gap, no throw, a plausible row in the right place. We
// refuse it by name instead, because a compiler that reproduces that bug
// faithfully is not being faithful to anything anyone wants.
//
// `#include` is recognised and NOT supported: it needs a filesystem, this runs
// in a browser, and inventing a search path would be inventing semantics.

const MACRO_PASS_LIMIT = 50;

/**
 * Expand `#define` macros. Returns the expanded text and any warnings.
 *
 * Expansion REPEATS TO A FIXED POINT because a macro body may name another
 * macro — `#define REPTEMPO #$TEMPO1#` is in both real scores, and a
 * single-pass substituter leaves `$TEMPO1` standing, which is exactly the
 * NaN that started this. The pass limit turns a cyclic definition into a named
 * failure rather than a hang.
 */
export function expandMacros(text) {
  const warnings = [];
  const macros = new Map();                 // NAME -> { params, body }
  let src = String(text);

  // `#define` bodies are delimited by `#`, so they have to come off the text
  // before anything else looks at it. Walk rather than regex: a body may span
  // lines, and a regex that spans lines cannot also respect line numbers.
  let out = '';
  let i = 0;
  let line = 1;
  const lineAt = (idx) => {
    let n = 1;
    for (let k = 0; k < idx; k++) if (src[k] === '\n') n++;
    return n;
  };
  while (i < src.length) {
    if (src.startsWith('#define', i) && /\s/.test(src[i + 7] || ' ')) {
      const at = lineAt(i);
      let j = i + 7;
      while (j < src.length && /[ \t]/.test(src[j])) j++;
      let name = '';
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) name += src[j++];
      let params = null;
      if (src[j] === '(') {
        j++;
        let raw = '';
        while (j < src.length && src[j] !== ')') raw += src[j++];
        j++;                                     // the ')'
        params = raw.split("'").map((s) => s.trim()).filter(Boolean);
      }
      while (j < src.length && /[ \t]/.test(src[j])) j++;
      if (src[j] !== '#') {
        warnings.push(`line ${at}: '#define ${name}' has no # body, ignored`);
        i = j;
        continue;
      }
      j++;                                       // the opening '#'
      let body = '';
      while (j < src.length && src[j] !== '#') body += src[j++];
      if (src[j] !== '#') {
        warnings.push(`line ${at}: '#define ${name}' body is never closed with #`);
        i = src.length;
        break;
      }
      j++;                                       // the closing '#'
      // ⚠️ A REDEFINITION IS NOT AN ERROR AND THE LAST ONE WINS — measured, and
      // it matters because vClick's server REWRITES `#define REPTEMPO` by hand
      // to start from a bar, which would otherwise collide with the original.
      macros.set(name, { params, body });
      // keep the newlines the definition spanned, so every later line number
      // still names the line the musician typed
      out += src.slice(i, j).replace(/[^\n]/g, '');
      i = j;
      continue;
    }
    if (src.startsWith('#undef', i) && /\s/.test(src[i + 6] || ' ')) {
      let j = i + 6;
      while (j < src.length && /[ \t]/.test(src[j])) j++;
      let name = '';
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) name += src[j++];
      macros.delete(name);
      i = j;
      continue;
    }
    if (src.startsWith('#include', i)) {
      const at = lineAt(i);
      let j = i;
      while (j < src.length && src[j] !== '\n') j++;
      warnings.push(`line ${at}: '#include' is recognised and NOT supported — `
        + 'this compiler has no filesystem, so the file cannot be read');
      out += src.slice(i, j).replace(/[^\n]/g, '');
      i = j;
      continue;
    }
    out += src[i++];
  }
  src = out;

  // Now substitute, to a fixed point.
  const USE = /\$([A-Za-z0-9_]+)(\.)?(\()?/;
  for (let pass = 0; ; pass++) {
    const m = USE.exec(src);
    if (!m) break;
    if (pass >= MACRO_PASS_LIMIT * 20) {
      warnings.push(`macro expansion did not settle after ${pass} substitutions `
        + '— a macro almost certainly names itself');
      break;
    }
    const at = lineAt(m.index);
    const name = m[1];
    const def = macros.get(name);
    if (!def) {
      // 🔴 Refused BY NAME rather than reproduced. See the block above: csound
      // drops the rest of the line and the carry refills it, so the score plays
      // a convincing wrong note instead of failing.
      warnings.push(`line ${at}: '${name}' is not defined — csound would drop `
        + 'the rest of this line and carry the previous note into it');
      src = src.slice(0, m.index) + src.slice(m.index + m[0].length - (m[3] ? 1 : 0));
      continue;
    }
    let end = m.index + 1 + name.length + (m[2] ? 1 : 0);
    let body = def.body;
    if (def.params && m[3]) {
      // arguments: `$M(5'99)`, apostrophe-separated, positional
      let j = m.index + m[0].length;
      let depth = 1;
      let raw = '';
      while (j < src.length && depth > 0) {
        if (src[j] === '(') depth++;
        else if (src[j] === ')') { depth--; if (!depth) break; }
        raw += src[j++];
      }
      end = j + 1;
      const args = raw.split("'");
      if (args.length !== def.params.length) {
        warnings.push(`line ${at}: '${name}' takes ${def.params.length} `
          + `argument(s) and was given ${args.length}`);
      }
      def.params.forEach((p, k) => {
        body = body.split(`${p}`).join(args[k] ?? '');
      });
    } else if (def.params) {
      warnings.push(`line ${at}: '${name}' is defined with arguments and used without them`);
    }
    src = src.slice(0, m.index) + body + src.slice(end);
  }

  return { text: src, warnings };
}

// ---------------------------------------------------------------------------
// 1b. SCORE EXPRESSIONS — `[8/3]`, and the silent zero they used to become
// ---------------------------------------------------------------------------
//
// 🔴 A BRACKET IN p2 OR p3 WAS SILENTLY WRONG, WITH ZERO WARNINGS. `Number('[4/2]')`
// is NaN, the p-field fell through to a string, and `Number(p[1]) || 0` made it
// beat 0 — so a note landed at the top of the section and the run stayed green.
// In the two real scores the brackets sit in p4 and p5, where they were carried
// through verbatim and nothing was mistimed. That is LUCK, not a property:
// `test.sco` writes `[16/3]` as a NUMBER OF BEATS (p4) in two bars, and one
// edit moving that idea into p3 would have been a silent retime.
//
// ✅ MEASURED against scsort, all of them: `[1+2]` 3 · `[6-4]` 2 · `[2*3]` 6 ·
// `[8/4]` 2 · `[2^3]` 8 · `[7%4]` 3 · `[[1+1]*[3-1]]` 4 · `[0-1]` -1 ·
// `[-2+3]` 1. So nesting, both unary and binary minus, power and modulo are all
// real, and `^` is POWER here even though it means something else entirely in
// p2 outside brackets.
//
// ⚠️ `~` (a random number) is recognised and REFUSED: it is deliberately not
// reproducible, and a compiler whose output changes between two runs of the
// same score cannot be graded against anything, including itself.

/**
 * Evaluate a Csound score expression. Returns a number, or `null` when the
 * expression is not one we will stand behind — the caller warns and keeps the
 * raw text, so nothing becomes a confident zero.
 */
export function evalScoreExpr(raw) {
  const s = String(raw);
  if (!s.startsWith('[') || !s.endsWith(']')) return null;
  if (s.includes('~')) return null;                // random: refused, see above
  if (!/^[\[\]0-9.+\-*/^%\s]+$/.test(s)) return null;
  let i = 0;
  const src = s;
  const ws = () => { while (i < src.length && /\s/.test(src[i])) i++; };
  let expr;                                        // forward declaration
  const primary = () => {
    ws();
    if (src[i] === '[') { i++; const v = expr(); ws(); if (src[i] !== ']') return NaN; i++; return v; }
    if (src[i] === '-') { i++; return -primary(); }
    if (src[i] === '+') { i++; return primary(); }
    let n = '';
    while (i < src.length && /[0-9.]/.test(src[i])) n += src[i++];
    return n === '' ? NaN : Number(n);
  };
  // `^` binds tighter than `*`, and right to left, as everywhere else it exists
  const power = () => {
    let a = primary();
    ws();
    if (src[i] === '^') { i++; return a ** power(); }
    return a;
  };
  const term = () => {
    let a = power();
    for (;;) {
      ws();
      const op = src[i];
      if (op !== '*' && op !== '/' && op !== '%') return a;
      i++;
      const b = power();
      a = op === '*' ? a * b : op === '/' ? a / b : a % b;
    }
  };
  expr = () => {
    let a = term();
    for (;;) {
      ws();
      const op = src[i];
      if (op !== '+' && op !== '-') return a;
      i++;
      const b = term();
      a = op === '+' ? a + b : a - b;
    }
  };
  const v = expr();
  ws();
  return (i === src.length && Number.isFinite(v)) ? v : null;
}

// ---------------------------------------------------------------------------
// 1. PARSE — statements, in order, with their line numbers kept for messages.
// ---------------------------------------------------------------------------

/**
 * Split a score into statements. Comments (`;` to end of line, and `/* … *\/`)
 * are stripped; blank lines vanish; everything else keeps its line number so a
 * failure can name the line a musician typed.
 */
export function parseCsoundScore(text) {
  const out = [];
  const src = String(text).replace(/\/\*[\s\S]*?\*\//g, ' ');
  const lines = src.split(/\r?\n/);
  for (let n = 0; n < lines.length; n++) {
    const line = lines[n].replace(/;.*$/, '').trim();
    if (!line) continue;
    const parts = line.split(/[\s,]+/).filter(Boolean);
    const op = parts[0][0];
    // `i1 0 1` is as legal as `i 1 0 1`: the opcode letter can be glued to its
    // first p-field, and real scores are written both ways.
    const rest = parts[0].length > 1 ? [parts[0].slice(1), ...parts.slice(1)] : parts.slice(1);
    out.push({ op, args: rest, line: n + 1, text: line });
  }
  return out;
}

// ---------------------------------------------------------------------------
// 2. TEMPO — the beat↔time map, and its exact integral.
// ---------------------------------------------------------------------------

/**
 * Build a tempo map from (beat, bpm) pairs.
 *
 * Before the first point and after the last, the tempo HOLDS — Csound does not
 * extrapolate a ramp past its end, and a score that ends mid-accelerando would
 * otherwise run away. TWO POINTS AT THE SAME BEAT are legal and mean a JUMP:
 * the second one wins from that beat on. That is how `csoundPart` writes a
 * section boundary onto one axis, and the sort below is stable (ES2019
 * guarantees it), so their written order is the order they take effect in.
 *
 * A map handed here is already valid. The rule that a `t` STATEMENT whose
 * first pair is not at beat 0 is ignored outright belongs to the statement,
 * not to the map, and lives in `compileCsound`.
 */
export function tempoMap(pairs) {
  const pts = (pairs && pairs.length ? pairs : [[0, DEFAULT_BPM]])
    .map(([b, m]) => [Number(b), Number(m)])
    .sort((a, b) => a[0] - b[0]);
  for (const [b, m] of pts) {
    if (!Number.isFinite(b) || !Number.isFinite(m)) throw new Error(`tempoMap: non-finite point ${b},${m}`);
    if (!(m > 0)) throw new Error(`tempoMap: tempo must be positive (got ${m} bpm at beat ${b})`);
  }
  if (pts[0][0] > 0) pts.unshift([0, pts[0][1]]);   // hold the first tempo back to zero

  /** seconds elapsed from beat 0 to `beat` */
  const secondsAt = (beat) => {
    let t = 0;
    for (let i = 0; i < pts.length; i++) {
      const [b0, m0] = pts[i];
      if (beat <= b0) break;
      const next = pts[i + 1];
      const b1 = next ? Math.min(next[0], beat) : beat;
      const span = b1 - b0;
      if (span <= 0) continue;
      // SECONDS PER BEAT is what Csound interpolates linearly in beat — not the
      // TEMPO. So elapsed time is the trapezoid of 60/tempo, not the logarithmic
      // integral a linear-in-beat tempo would give. This is measured against the
      // reference implementation (csound 6.18), not derived: on `t 0 120 30 90`
      // Csound puts beat 30 at 17.500 s where the log form gives 17.261, and on
      // `t 0 60 20 180` it puts beat 20 at 13.333 s against the log form's
      // 10.986. Trapezoid matches all 15 onsets and durations of the oracle,
      // including a four-point map, to nine decimal places.
      const s0 = 60 / m0;
      const s1 = next ? s0 + ((60 / next[1]) - s0) * (span / (next[0] - b0)) : s0;
      t += (span * (s0 + s1)) / 2;
      if (next && beat <= next[0]) break;
    }
    return t;
  };

  /**
   * Seconds per beat AT a beat — the same interpolation `secondsAt` integrates,
   * evaluated instead of summed. Needed to cut a map at a section boundary that
   * falls in the middle of a ramp: the tempo carried across the join is the
   * interpolated one, not the last written point.
   */
  const spbAt = (beat) => {
    let s = 60 / pts[0][1];
    for (let i = 0; i < pts.length; i++) {
      const [b0, m0] = pts[i];
      const next = pts[i + 1];
      if (beat < b0) break;               // before this point: keep what we had
      s = 60 / m0;                        // at or past it: this point is in force
      if (next && next[0] > b0 && beat < next[0]) {
        s += ((60 / next[1]) - s) * ((beat - b0) / (next[0] - b0));
        break;
      }
    }
    return s;
  };

  // Inversion by bisection: the map is strictly increasing (tempo > 0), so a
  // plain binary search is exact to the tolerance and needs no closed form for
  // the inverse of a piecewise trapezoid.
  const beatAt = (seconds) => {
    if (!(seconds > 0)) return 0;
    let lo = 0, hi = 1;
    while (secondsAt(hi) < seconds && hi < 1e9) hi *= 2;
    for (let i = 0; i < 80; i++) {
      const mid = (lo + hi) / 2;
      if (secondsAt(mid) < seconds) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  };

  return {
    points: pts,
    secondsAt, msAt: (b) => secondsAt(b) * 1000,
    beatAt, beatAtMs: (ms) => beatAt(ms / 1000),
    spbAt, bpmAt: (b) => 60 / spbAt(b),
  };
}

/**
 * A tempo map's points restricted to `[0, endBeat]`, with the tempo PINNED at
 * the end — the value `spbAt` interpolates there, so cutting mid-ramp carries
 * the tempo that was actually in force and not the last point written.
 */
function pointsThrough(tempo, endBeat) {
  const out = tempo.points.filter(([b]) => b < endBeat).map(([b, m]) => [b, m]);
  out.push([endBeat, tempo.bpmAt(endBeat)]);
  return out;
}

/**
 * Every section's map, shifted onto ONE beat axis and joined.
 *
 * Each join is TWO POINTS AT THE SAME BEAT — the outgoing tempo and the
 * incoming one — because that is how a piecewise-linear map writes a
 * discontinuity, and a section boundary is exactly that. A single-section
 * score gets its own points back unchanged, which is why every existing
 * document is byte-identical after this.
 */
function globalTempoPoints(sections) {
  const points = [];
  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    const last = i === sections.length - 1;
    const pts = last
      ? sec.tempo.points.map(([b, m]) => [b, m])
      : pointsThrough(sec.tempo, sec.toBeat - sec.fromBeat);
    for (const [b, m] of pts) points.push([sec.fromBeat + b, m]);
  }
  return points.length ? points : [[0, DEFAULT_BPM]];
}

/**
 * The tempo map ONE section declares, from the `t` statements inside it.
 *
 * Measured rules, all four of them counter-intuitive enough to have cost a
 * probe each: a section with no `t` is 60 bpm even when the section before it
 * had one; a `t` governs its whole section wherever it sits; the last `t` in
 * a section wins; and a `t` whose first pair is not at beat 0 is discarded
 * whole rather than held back to zero.
 */
function sectionTempo(sts, warnings) {
  const ts = sts.filter((s) => s.op === 't');
  if (!ts.length) return tempoMap([]);
  if (ts.length > 1) {
    warnings.push(`line ${ts[ts.length - 1].line}: this section has ${ts.length} 't' statements — `
      + 'csound sorts by the last one and then re-warps at play time, which is not a map anything '
      + 'can hold; the last one is used here');
  }
  const s = ts[ts.length - 1];
  const nums = s.args.map(Number);
  if (nums.length % 2) warnings.push(`line ${s.line}: t statement has an odd number of values`);
  const pairs = [];
  for (let i = 0; i + 1 < nums.length; i += 2) pairs.push([nums[i], nums[i + 1]]);
  if (!pairs.length) {
    warnings.push(`line ${s.line}: 't' with no beat/tempo pair — this section stays at ${DEFAULT_BPM} bpm`);
    return tempoMap([]);
  }
  if (pairs[0][0] !== 0) {
    warnings.push(`line ${s.line}: a 't' must start at beat 0; csound ignores this one outright, `
      + `so this section stays at ${DEFAULT_BPM} bpm`);
    return tempoMap([]);
  }
  return tempoMap(pairs);
}

// ---------------------------------------------------------------------------
// 3. COMPILE — statements + tempo into rows a deck can hold.
// ---------------------------------------------------------------------------

/**
 * @param text  a Csound score
 * @param opts.kind    deck kind for the emitted rows (default 'note')
 * @param opts.expand  expand `n` repeats into rows as well as reporting them
 *                     (default true — a deck needs rows; the quotations are
 *                     reported either way so a SCORE can carry structure)
 *
 * @returns {{tempo, items, sections, repeats, warnings, durationMs}}
 *   `items[].at` and `durationMs` are milliseconds from the start of the score.
 *   `items[].payload.beat` is on the GLOBAL beat axis, `payload.sectionBeat` is
 *   the beat as written, `payload.section` the section's index.
 *   `sections[i]` is `{ index, fromBeat, toBeat, startMs, endMs, points, tempo }`
 *   — `fromBeat`/`toBeat` global, `points`/`tempo` that section's own map, and
 *   `startMs`/`endMs` the thing a global beat cannot give you, since the clock
 *   restarts at every `s`.
 */
export function compileCsound(text, { kind = 'note', expand = true } = {}) {
  // ⚠️ MACROS FIRST, AND THE ORDER IS MEASURED, NOT CHOSEN: `[$N/2]` with N 4
  // evaluates to 2, so a macro can be an OPERAND of a bracket and expansion has
  // to have finished before any expression is looked at.
  const expanded = expandMacros(text);
  const sts = parseCsoundScore(expanded.text);
  const warnings = [...expanded.warnings];

  // ── Pass 1: cut into SECTIONS. This has to happen before any p2 becomes a
  // time, because a `t` governs its whole section from wherever it appears in
  // it — including from after the notes it governs.
  const groups = [];
  let group = { sts: [], lenBeats: null };
  for (const s of sts) {
    if (s.op === 'e') break;                       // `e` ends the score; the rest is dropped
    if (s.op === 's') {
      // `s 10` sets this section's length to beat 10. It is a floor, not an
      // override — a note that runs past it still holds the section open — and
      // unlike an `f` it is NOT shifted by `b`.
      if (s.args.length) {
        const n = Number(s.args[0]);
        if (Number.isFinite(n)) group.lenBeats = n;
        else warnings.push(`line ${s.line}: 's ${s.args[0]}' — a section length must be a number, ignored`);
      }
      groups.push(group);
      group = { sts: [], lenBeats: null };
      continue;
    }
    group.sts.push(s);
  }
  groups.push(group);

  const items = [];
  const sections = [];
  const repeats = [];

  // The P-FIELD carry SURVIVES a section boundary for p2 and p3 and is zeroed
  // for p4 and everything after it — measured, twice, because it reads like a
  // bug in the reference and is not. So it lives out here, while `+`, `^` and
  // `b` are declared per section and therefore reset.
  //
  // `carryLen` is separate and DOES reset at `s`, because the two carries are
  // not the same mechanism. A p-field simply LEFT OFF the end of a statement
  // is carried too — `i 1 0 1 777 888` then `i 1 2 1` gives the second note
  // p4 777 and p5 888 — but that implicit carry stops dead at a section, where
  // an explicit `.` in p2 or p3 still crosses. Measured both ways.
  const carry = new Map();          // p1 -> that instrument's last p-field array
  const carryLen = new Map();       // p1 -> how many p-fields it wrote
  let startMs = 0;                  // where this section begins, in ms
  let fromBeat = 0;                 // and on the global beat axis

  for (let si = 0; si < groups.length; si++) {
    const g = groups[si];
    const tempo = sectionTempo(g.sts, warnings);
    const marks = new Map();        // name -> LOCAL beat; marks are section-local
    const prevEnd = new Map();      // p1 -> where its last note ended, for `+`
    const secItems = [];
    let prevAny = null;             // the previous i statement IN THIS SECTION, for `^`
    let base = 0;                   // `b` — an offset added to every p2, in beats
    let endBeat = 0;                // furthest the written material reaches, LOCAL beats

    const push = (p, atBeat, durBeats, line) => {
      const dur = Math.max(0, durBeats);
      const at = startMs + tempo.msAt(atBeat);
      const end = startMs + tempo.msAt(atBeat + dur);
      secItems.push({
        at, kind,
        payload: {
          instr: p[0],
          beat: fromBeat + atBeat,          // global — what a document and a deck read
          sectionBeat: atBeat,              // local — what the musician wrote
          section: si,
          durBeats,
          durMs: end - at,
          p: p.slice(),
          line,
        },
      });
      // A note with a NEGATIVE p3 is held until something turns it off; it
      // reaches only its own onset, which is what csound uses for the section
      // length too.
      endBeat = Math.max(endBeat, atBeat + dur);
    };

    for (const s of g.sts) {
      switch (s.op) {
        case 'i': {
          const p1 = String(s.args[0]);
          const carried = carry.get(p1) || [];
          const p = s.args.map((raw, idx) => {
            // `.` carries the same p-field from the previous note OF THIS
            // INSTRUMENT — not the previous line, which is what makes a carried
            // score readable when two instruments interleave.
            if (raw === '.') {
              if (carried[idx] === undefined) {
                warnings.push(`line ${s.line}: '.' in p${idx + 1} with nothing to carry`);
                return 0;
              }
              return carried[idx];
            }
            if (idx === 1) {
              // p2 shorthands, and the three do NOT share a reference note —
              // measured against csound 6.18 rather than assumed. `+` is
              // "where the previous note OF THIS INSTRUMENT ended"; `^+x` /
              // `^-x` are relative to where the IMMEDIATELY PRECEDING
              // STATEMENT started, whatever instrument that was. On
              //     i 1 0 2 / i 2 5 2 / i 1 ^+0.5 .
              // Csound answers 5.5, not 0.5. Both reset at `s`, where `.`
              // does not.
              if (raw === '+') return prevEnd.get(p1) ?? 0;
              const rel = /^\^([+-])?([\d.]+)$/.exec(raw);
              if (rel) {
                const delta = Number(rel[2]) * (rel[1] === '-' ? -1 : 1);
                return (prevAny?.[1] ?? 0) + delta;
              }
            }
            // A SCORE EXPRESSION, `[8/3]`. Until 2026-09-14 this fell straight
            // through to the string below and `Number(p[1]) || 0` turned it into
            // beat 0 with no warning — see §1b. Evaluated here so p2 and p3 are
            // right; a form we will not stand behind returns null and is warned
            // about rather than guessed at.
            if (raw.startsWith('[')) {
              const v = evalScoreExpr(raw);
              if (v !== null) return v;
              warnings.push(`line ${s.line}: '${raw}' is a score expression this `
                + 'compiler will not evaluate, so it is carried through as text '
                + (idx <= 2 ? '— AND IT IS IN p2 OR p3, SO THIS ROW IS MISTIMED' : ''));
              return raw;
            }
            const n = Number(raw);
            return Number.isFinite(n) ? n : raw;      // named instruments stay strings
          });
          // p-fields left off the end are carried from this instrument's
          // previous note IN THIS SECTION — `carryLen` is 0 after an `s`, so
          // nothing crosses.
          for (let idx = p.length; idx < (carryLen.get(p1) || 0); idx++) p[idx] = carried[idx];
          carry.set(p1, p);
          carryLen.set(p1, p.length);
          prevAny = p;
          const p2 = Number(p[1]) || 0;
          const p3 = Number(p[2]) || 0;
          prevEnd.set(p1, p2 + Math.max(0, p3));
          push(p, base + p2, p3, s.line);
          break;
        }
        case 't': break;                                    // handled by sectionTempo
        case 'b': base = Number(s.args[0]) || 0; break;     // clock base offset, in beats
        // A mark names WHERE THE WRITTEN MATERIAL HAS REACHED, which is the end
        // of the last note so far — not the parse position, and not the section
        // start. `endBeat` already tracks exactly that.
        case 'm': marks.set(s.args[0], endBeat); break;
        case 'n': {
          // THE QUOTATION. `n name` replays the span from the mark to HERE. That
          // is a reference, not a copy, and reporting it as one is the whole
          // argument: a repeat that is a value can be seeked into, counted, and
          // rewritten without touching the notes it quotes.
          //
          // KNOWN DIVERGENCE, reported by the oracle rather than hidden: csound
          // 6.18's `n` is not this. It is a REWIND OF THE SOURCE — it re-reads
          // the statements from the mark, and it only fires when the `n` sits
          // at a section boundary, so `m … i … n` inside one section replays
          // NOTHING there (and trips an internal error in its backtrace). The
          // span this reports is the span a musician means; matching csound
          // would mean giving up the quotation, so the difference is stated
          // instead of split.
          const from = marks.get(s.args[0]);
          if (from === undefined) {
            warnings.push(`line ${s.line}: n '${s.args[0]}' has no matching m`);
            break;
          }
          const to = endBeat;                 // the span runs mark → here
          const atBeat = endBeat;             // and lands where the score has got to
          const spanBeats = to - from;
          if (!(spanBeats > 0)) { warnings.push(`line ${s.line}: n '${s.args[0]}' spans nothing`); break; }
          repeats.push({
            name: s.args[0], section: si,
            inMs: startMs + tempo.msAt(from),
            outMs: startMs + tempo.msAt(to),
            atMs: startMs + tempo.msAt(atBeat),
            // global beats, to match `payload.beat` and a document's one axis
            inBeat: fromBeat + from, outBeat: fromBeat + to, atBeat: fromBeat + atBeat,
            line: s.line,
          });
          if (expand) {
            // A quotation played, rather than quoted: same rows, shifted. Note the
            // shift is in BEATS and re-mapped through the tempo — shifting the
            // MILLISECONDS would silently transpose the passage into whatever
            // tempo happens to be in force where it lands.
            const src = secItems.filter((it) => it.payload.sectionBeat >= from && it.payload.sectionBeat < to);
            for (const it of src) {
              push(it.payload.p, it.payload.sectionBeat - from + atBeat, it.payload.durBeats, it.payload.line);
            }
          }
          break;
        }
        case 'f': {
          // An f-table is ORCHESTRA-side and carries no timeline row — but its
          // p2 HOLDS THE SECTION OPEN to that beat, which is the whole point of
          // the `f 0 <n>` idiom, and `b` shifts it exactly like a note's p2.
          // Measured: any p1, not only `f 0`.
          const at = Number(s.args[1]);
          if (Number.isFinite(at) && base + at > endBeat) {
            endBeat = base + at;
            warnings.push(`line ${s.line}: 'f' carries no timeline row, but its p2 holds this `
              + `section open to beat ${base + at}`);
          } else {
            warnings.push(`line ${s.line}: 'f' statement ignored (no timeline row)`);
          }
          break;
        }
        case 'a': case 'v': case 'r': case '}': case '{':
          // Time warps and macro loops are authoring sugar; they carry no
          // timeline row. Recorded as warnings rather than dropped in silence,
          // because a score that leans on them compiles to something quietly
          // shorter than it reads.
          warnings.push(`line ${s.line}: '${s.op}' statement ignored (no timeline row)`);
          break;
        default:
          warnings.push(`line ${s.line}: unknown statement '${s.op}'`);
      }
    }

    if (g.lenBeats !== null) endBeat = Math.max(endBeat, g.lenBeats);
    const endMs = startMs + tempo.msAt(endBeat);
    sections.push({
      index: si,
      fromBeat, toBeat: fromBeat + endBeat,
      startMs, endMs,
      points: tempo.points.map(([b, m]) => [b, m]),
      tempo,
    });
    items.push(...secItems);

    startMs = endMs;
    fromBeat += endBeat;
    // The carry across the boundary: p2 and p3 survive an explicit `.`, p4 and
    // after come back as 0, and a field left off the end carries nothing at all
    // (`carryLen` to 0). `prevEnd`, `prevAny` and `base` are per-section and
    // reset with the loop.
    for (const [k, p] of carry) carry.set(k, p.map((v, i) => (i <= 2 ? v : 0)));
    carryLen.clear();
  }

  items.sort((a, b) => a.at - b.at || a.payload.line - b.payload.line);
  // The last section's end is at or past every note's end, so this is the same
  // number as before for a score that ends on a note — and the right one for a
  // score held open by `f 0` or by `s <n>`.
  const durationMs = Math.max(
    sections[sections.length - 1]?.endMs || 0,
    ...items.map((it) => it.at + (it.payload.durMs || 0)),
    0,
  );

  return { tempo: tempoMap(globalTempoPoints(sections)), items, sections, repeats, warnings, durationMs };
}

/**
 * The repeats as SCORE VALUES — one quotation per `n`, naming the deck the
 * quoted span lives in. This is the half of the mapping that a stored score
 * carries: `score({ quotations })` round-trips to JSON, `nest.add()` plays it,
 * and neither has to see the notes.
 *
 * In MILLISECONDS, because `score()` is an arrangement and an arrangement runs
 * in ms — `scoreDoc()` is the one that is in beats, and vclick builds its
 * `uses` from `repeats[].inBeat/outBeat/atBeat` for that reason.
 *
 * Takes the quotation constructor rather than importing score.mjs, so this
 * module stays a pure compiler with no dependency on the score format's
 * version — pass `quotation` from timeline/score.mjs.
 */
export function repeatsAsQuotations(compiled, { ref, quotation }) {
  if (!ref) throw new Error('repeatsAsQuotations: `ref` names the deck the span lives in');
  if (typeof quotation !== 'function') throw new Error('repeatsAsQuotations: pass quotation from timeline/score.mjs');
  return compiled.repeats.map((r, i) => quotation({
    id: `${r.name}-${i + 1}`,
    ref,
    at: Math.round(r.atMs),
    in: Math.round(r.inMs),
    out: Math.round(r.outMs),
    rate: 1,
  }));
}

/**
 * A Csound score as a score-document PART (plans/plan-score.md P1).
 *
 * `compileCsound` already computes everything this needs; the only work here is
 * re-shaping it into the container's envelope, which is deliberately narrow:
 * when, how long, what kind, which line. The p-fields go under `payload`
 * VERBATIM. There is no attempt to name p5 "frequency" or p4 "amplitude" —
 * only the instrument knows, and a container that guessed would be lying in a
 * field a reader would trust.
 *
 * IN BEATS, because that is what the document stores and what a Csound score
 * is written in. A document has ONE beat axis and csound's sections each start
 * again at zero, so `at` is the GLOBAL beat and the tempo it comes back with
 * carries a doubled point at every section boundary to spell the reset. The
 * self-test asserts that `partItems` on this document reproduces
 * `compileCsound`'s milliseconds exactly, rather than assuming it.
 *
 * `expand: false` on purpose: a repeat belongs in `uses` as one entry with a
 * count, and expanding it into rows here would throw away the only thing this
 * format has over a flat event list.
 *
 * @returns {{part, tempo, sections, repeats, durationMs}} — `tempo` is the
 *          [beat, bpm] pair list the document carries, `repeats` the `n`
 *          statements ready for `repeatsAsQuotations`.
 */
export function csoundPart(text, { kind = 'note' } = {}) {
  const compiled = compileCsound(text, { kind, expand: false });
  const rows = compiled.items.map((it, i) => ({
    id: `n${i + 1}`,
    at: it.payload.beat,
    dur: it.payload.durBeats,
    kind: it.kind,
    line: it.payload.line,
    // verbatim, and tagged by the part's `lang` rather than translated
    payload: { instr: it.payload.instr, p: it.payload.p },
  }));
  return {
    part: { lang: 'csound', rows, warnings: compiled.warnings },
    tempo: compiled.tempo.points.map(([b, m]) => [b, m]),
    sections: compiled.sections,
    repeats: compiled.repeats,
    durationMs: compiled.durationMs,
  };
}
