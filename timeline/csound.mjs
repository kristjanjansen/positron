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
// WHAT A CSOUND SCORE IS, in the two statements that matter:
//
//     t 0 120  30 90        tempo: 120 bpm at beat 0, ramping to 90 at beat 30
//     i 1  0.0  2.0  8000 440
//       │   │    │    └────┴── p4, p5: whatever that instrument reads
//       │   │    └── p3: duration, IN BEATS
//       │   └── p2: start, IN BEATS, absolute within its section
//       └── p1: which instrument
//
// P2 AND P3 ARE BEATS, NOT SECONDS. That is the whole reason this is a compiler
// and not a parser: with a `t` statement the beat→second map is the integral of
// 60/tempo(beat), and Csound interpolates tempo LINEARLY IN BEAT between the
// points of the map. For a ramp from m0 to m1 over beats b0→b1 that integral is
// closed-form and logarithmic:
//
//     Δt = (60 / k)·ln(m1 / m0),   k = (m1 − m0)/(b1 − b0)
//
// and degenerates to 60·Δb/m when the tempo is flat. Getting this wrong is
// silent: every note lands, slightly late, and only an accelerando shows it.
// The default when a score carries no `t` at all is 60 bpm, which is why so
// many scores read as if p2 were seconds — at 60 bpm it is.

/** Tempo when a score declares none. At 60 bpm one beat is one second. */
export const DEFAULT_BPM = 60;

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
 * Build a tempo map from the `t` statement's (beat, bpm) pairs.
 * Before the first point and after the last, the tempo HOLDS — Csound does not
 * extrapolate a ramp past its end, and a score that ends mid-accelerando would
 * otherwise run away.
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
      // linear-in-beat tempo ⇒ logarithmic time. The flat case is not a special
      // case for elegance: k → 0 makes the log form 0/0.
      const m1 = next ? m0 + ((next[1] - m0) * span) / (next[0] - b0) : m0;
      t += Math.abs(m1 - m0) < 1e-12
        ? (60 * span) / m0
        : (60 * span) / (m1 - m0) * Math.log(m1 / m0);
      if (next && beat <= next[0]) break;
    }
    return t;
  };

  // Inversion by bisection: the map is strictly increasing (tempo > 0), so a
  // plain binary search is exact to the tolerance and needs no closed form for
  // the inverse of a piecewise logarithm.
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

  return { points: pts, secondsAt, msAt: (b) => secondsAt(b) * 1000, beatAt, beatAtMs: (ms) => beatAt(ms / 1000) };
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
 */
export function compileCsound(text, { kind = 'note', expand = true } = {}) {
  const sts = parseCsoundScore(text);
  const warnings = [];

  // Pass 1: the tempo map has to exist before any p2 can be turned into time,
  // and `t` may appear after the notes it governs.
  const tPairs = [];
  for (const s of sts) {
    if (s.op !== 't') continue;
    const nums = s.args.map(Number);
    if (nums.length % 2) warnings.push(`line ${s.line}: t statement has an odd number of values`);
    for (let i = 0; i + 1 < nums.length; i += 2) tPairs.push([nums[i], nums[i + 1]]);
  }
  const tempo = tempoMap(tPairs);

  const items = [];
  const sections = [];
  const repeats = [];
  const marks = new Map();          // name -> beat, within the current section
  const prev = new Map();           // p1 -> the previous i statement's p-fields
  let sectionStartBeat = 0;         // where this section begins, in GLOBAL beats
  let sectionEndBeat = 0;           // furthest note end seen in this section
  let base = 0;                     // `b` — an offset added to every p2
  let ended = false;

  const push = (p, atBeat, durBeats, line) => {
    const at = tempo.msAt(atBeat);
    const end = tempo.msAt(atBeat + Math.max(0, durBeats));
    items.push({
      at, kind,
      payload: {
        instr: p[0], beat: atBeat, durBeats,
        durMs: end - at,
        p: p.slice(),
        line,
      },
    });
    sectionEndBeat = Math.max(sectionEndBeat, atBeat + Math.max(0, durBeats));
  };

  for (const s of sts) {
    if (ended) break;
    switch (s.op) {
      case 'i': {
        const p1 = s.args[0];
        const carried = prev.get(String(p1)) || [];
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
            // p2 shorthands: `+` is "where the previous note of this instrument
            // ended", `^+x` / `^-x` are relative to where it STARTED.
            if (raw === '+') {
              const st = carried[1] ?? 0, du = carried[2] ?? 0;
              return st + Math.max(0, du);
            }
            const rel = /^\^([+-])?([\d.]+)$/.exec(raw);
            if (rel) {
              const delta = Number(rel[2]) * (rel[1] === '-' ? -1 : 1);
              return (carried[1] ?? 0) + delta;
            }
          }
          const n = Number(raw);
          return Number.isFinite(n) ? n : raw;      // named instruments stay strings
        });
        prev.set(String(p1), p);
        const p2 = Number(p[1]) || 0;
        const p3 = Number(p[2]) || 0;
        push(p, sectionStartBeat + base + p2, p3, s.line);
        break;
      }
      case 't': break;                                    // handled in pass 1
      case 'b': base = Number(s.args[0]) || 0; break;     // clock base offset
      case 's': {
        sections.push({ fromBeat: sectionStartBeat, toBeat: sectionEndBeat });
        sectionStartBeat = sectionEndBeat;                // the next section starts where this one ended
        base = 0;
        marks.clear();                                    // marks are section-local
        prev.clear();                                     // and so is the carry
        break;
      }
      // A mark names WHERE THE WRITTEN MATERIAL HAS REACHED, which is the end
      // of the last note so far — not the parse position, and not the section
      // start. `sectionEndBeat` already tracks exactly that.
      case 'm': marks.set(s.args[0], sectionEndBeat); break;
      case 'n': {
        // THE QUOTATION. `n name` replays the span from the mark to HERE. That
        // is a reference, not a copy, and reporting it as one is the whole
        // argument: a repeat that is a value can be seeked into, counted, and
        // rewritten without touching the notes it quotes.
        const from = marks.get(s.args[0]);
        if (from === undefined) {
          warnings.push(`line ${s.line}: n '${s.args[0]}' has no matching m`);
          break;
        }
        const to = sectionEndBeat;          // the span runs mark → here
        const atBeat = sectionEndBeat;      // and lands where the score has got to
        const spanBeats = to - from;
        if (!(spanBeats > 0)) { warnings.push(`line ${s.line}: n '${s.args[0]}' spans nothing`); break; }
        repeats.push({
          name: s.args[0],
          inMs: tempo.msAt(from), outMs: tempo.msAt(to),
          atMs: tempo.msAt(atBeat),
          inBeat: from, outBeat: to, atBeat, line: s.line,
        });
        if (expand) {
          // A quotation played, rather than quoted: same rows, shifted. Note the
          // shift is in BEATS and re-mapped through the tempo — shifting the
          // MILLISECONDS would silently transpose the passage into whatever
          // tempo happens to be in force where it lands.
          const src = items.filter((it) => it.payload.beat >= from && it.payload.beat < to);
          for (const it of src) {
            const b = it.payload.beat - from + atBeat;
            push(it.payload.p, b, it.payload.durBeats, it.payload.line);
          }
        }
        break;
      }
      case 'e': ended = true; break;
      case 'f': case 'a': case 'v': case 'r': case '}': case '{':
        // f-tables, time warps and macro loops are ORCHESTRA-side or authoring
        // sugar; they carry no timeline row. Recorded as warnings rather than
        // dropped in silence, because a score that leans on them compiles to
        // something quietly shorter than it reads.
        warnings.push(`line ${s.line}: '${s.op}' statement ignored (no timeline row)`);
        break;
      default:
        warnings.push(`line ${s.line}: unknown statement '${s.op}'`);
    }
  }
  sections.push({ fromBeat: sectionStartBeat, toBeat: sectionEndBeat });

  items.sort((a, b) => a.at - b.at || a.payload.line - b.payload.line);
  const durationMs = items.length
    ? Math.max(...items.map((it) => it.at + (it.payload.durMs || 0)))
    : 0;

  return { tempo, items, sections, repeats, warnings, durationMs };
}

/**
 * The repeats as SCORE VALUES — one quotation per `n`, naming the deck the
 * quoted span lives in. This is the half of the mapping that a stored score
 * carries: `score({ quotations })` round-trips to JSON, `nest.add()` plays it,
 * and neither has to see the notes.
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
 * A Csound score as a score-document PART (plan-score.md P1).
 *
 * `compileCsound` already computes everything this needs; the only work here is
 * re-shaping it into the container's envelope, which is deliberately narrow:
 * when, how long, what kind, which line. The p-fields go under `payload`
 * VERBATIM. There is no attempt to name p5 "frequency" or p4 "amplitude" —
 * only the instrument knows, and a container that guessed would be lying in a
 * field a reader would trust.
 *
 * IN BEATS, because that is what the document stores and what a Csound score
 * is written in. `expand: false` on purpose: a repeat belongs in `uses` as one
 * entry with a count, and expanding it into rows here would throw away the only
 * thing this format has over a flat event list.
 *
 * @returns {{part, tempo, repeats, durationMs}} — `tempo` is the [beat, bpm]
 *          pair list the document carries, `repeats` the `n` statements ready
 *          for `repeatsAsQuotations`.
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
    repeats: compiled.repeats,
    durationMs: compiled.durationMs,
  };
}
