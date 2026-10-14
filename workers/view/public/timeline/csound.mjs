// A Csound/vClick score compiled to timeline rows: `m`/`n` become quotations, seek gets a fold, and
// tempo becomes a beat-to-ms map the client owns. p2/p3 are beats; seconds per beat ramp linearly.
// Sections (`s`) start new clocks; rules measured against csound 6.18 (lab/csound-oracle.mjs).
// why: lessons/timeline-csound.md#header

/** Tempo when a score declares none. At 60 bpm one beat is one second. */
export const DEFAULT_BPM = 60;

// 1a. Macros, measured against `scsort`: $NAME, $NAME. (dot consumed), $M(a'b) arguments, the last
// #define wins, bodies may span lines, macros expand before brackets. An undefined $NAME is refused
// by name (csound drops the line and duplicates a note). #include is not supported.
// why: lessons/timeline-csound.md#macros

const MACRO_PASS_LIMIT = 50;

// Expand #define macros to a fixed point (a body may name another macro), with a pass limit
// so a cycle fails by name. Returns text and warnings.
// why: lessons/timeline-csound.md#expand-macros
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
      // A redefinition is not an error; the last wins (vClick rewrites REPTEMPO to start from a
      // bar).
      // why: lessons/timeline-csound.md#redefine
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
      // Refused by name rather than reproduced: csound would play a convincing wrong note.
      // why: lessons/timeline-csound.md#undefined
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

// 1b. Score expressions `[..]`, measured against scsort: + - * / ^ (power) % with nesting and unary
// minus. `~` (random) is refused: unreproducible.
// why: lessons/timeline-csound.md#expressions

// Evaluate a score expression, or null when we will not stand behind it; the caller warns.
// why: lessons/timeline-csound.md#eval-expr
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

// 1. Parse: statements in order, with line numbers.
// why: lessons/timeline-csound.md#parse-banner

// Split into statements; `;` and block comments stripped; each keeps its line number.
// why: lessons/timeline-csound.md#parse
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

// 2. Tempo: the beat-to-time map and its exact integral.
// why: lessons/timeline-csound.md#tempo-banner

// A tempo map from (beat, bpm) pairs; tempo holds past either end. Two points at one beat are a
// jump,
// the later wins (stable sort). The rule ignoring a `t` not at beat 0 lives in compileCsound.
// why: lessons/timeline-csound.md#tempo-map
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
      // Csound ramps seconds per beat linearly, so elapsed time is a trapezoid of 60/tempo: on
      // `t 0 120 30 90` beat 30 is at 17.500 s (the log form says 17.261). Matches the oracle to 9
      // places.
      // why: lessons/timeline-csound.md#trapezoid
      const s0 = 60 / m0;
      const s1 = next ? s0 + ((60 / next[1]) - s0) * (span / (next[0] - b0)) : s0;
      t += (span * (s0 + s1)) / 2;
      if (next && beat <= next[0]) break;
    }
    return t;
  };

  // Seconds per beat at a beat, for cutting a map mid-ramp.
  // why: lessons/timeline-csound.md#spb-at
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

// A map's points in [0, endBeat], pinned at the end to the interpolated tempo.
// why: lessons/timeline-csound.md#points-through
function pointsThrough(tempo, endBeat) {
  const out = tempo.points.filter(([b]) => b < endBeat).map(([b, m]) => [b, m]);
  out.push([endBeat, tempo.bpmAt(endBeat)]);
  return out;
}

// Every section's map on one beat axis, each join two points at one beat; one section is unchanged.
// why: lessons/timeline-csound.md#global-tempo
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

// One section's map: 60 bpm without its own `t`; a `t` governs its whole section; the last wins;
// a `t` whose first pair is not at beat 0 is discarded whole.
// why: lessons/timeline-csound.md#section-tempo
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

// 3. Compile: statements and tempo into rows.
// why: lessons/timeline-csound.md#compile-banner

// compileCsound(text, { kind = 'note', expand = true }) -> {tempo, items, sections, repeats,
// warnings, durationMs}. `at` and durationMs in ms; payload.beat global, sectionBeat as written;
// sections[i] = { index, fromBeat, toBeat, startMs, endMs, points, tempo }.
// why: lessons/timeline-csound.md#compile
export function compileCsound(text, { kind = 'note', expand = true } = {}) {
  // Macros first: `[$N/2]` with N 4 is 2, so expansion finishes before brackets.
  // why: lessons/timeline-csound.md#macros-first
  const expanded = expandMacros(text);
  const sts = parseCsoundScore(expanded.text);
  const warnings = [...expanded.warnings];

  // Pass 1: cut into sections before any p2 becomes a time; a `t` governs from anywhere in its
  // section.
  // why: lessons/timeline-csound.md#pass-1
  const groups = [];
  let group = { sts: [], lenBeats: null };
  for (const s of sts) {
    if (s.op === 'e') break;                       // `e` ends the score; the rest is dropped
    if (s.op === 's') {
      // `s 10` sets a floor on the section's length, not shifted by `b`.
      // why: lessons/timeline-csound.md#s-arg
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

  // The p-field carry crosses a section for p2 and p3 and zeroes p4 onward (measured). `carryLen`,
  // the
  // implicit carry of fields left off the end, resets at `s`.
  // why: lessons/timeline-csound.md#carry
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
    let base = 0;                   // `b`, an offset added to every p2, in beats; why: lessons/timeline-csound.md#base
    let endBeat = 0;                // furthest the written material reaches, LOCAL beats

    const push = (p, atBeat, durBeats, line) => {
      const dur = Math.max(0, durBeats);
      const at = startMs + tempo.msAt(atBeat);
      const end = startMs + tempo.msAt(atBeat + dur);
      secItems.push({
        at, kind,
        payload: {
          instr: p[0],
          beat: fromBeat + atBeat,          // global, what a document and a deck read; why: lessons/timeline-csound.md#beat
          sectionBeat: atBeat,              // local, what the musician wrote; why: lessons/timeline-csound.md#section-beat
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
            // `.` carries from the previous note of this instrument, not the previous line.
            // why: lessons/timeline-csound.md#dot
            if (raw === '.') {
              if (carried[idx] === undefined) {
                warnings.push(`line ${s.line}: '.' in p${idx + 1} with nothing to carry`);
                return 0;
              }
              return carried[idx];
            }
            if (idx === 1) {
              // `+` is where this instrument's previous note ended; `^+x` is relative to the
              // previous statement's start, any instrument (i 1 0 2 / i 2 5 2 / i 1 ^+0.5 . gives
              // 5.5). Both reset at `s`.
              // why: lessons/timeline-csound.md#plus-caret
              if (raw === '+') return prevEnd.get(p1) ?? 0;
              const rel = /^\^([+-])?([\d.]+)$/.exec(raw);
              if (rel) {
                const delta = Number(rel[2]) * (rel[1] === '-' ? -1 : 1);
                return (prevAny?.[1] ?? 0) + delta;
              }
            }
            // A score expression in p2/p3, evaluated; an unsupported form returns null and is
            // warned about.
            // why: lessons/timeline-csound.md#bracket
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
          // Fields left off the end carry from this instrument's previous note in this section
          // only.
          // why: lessons/timeline-csound.md#trailing-carry
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
        // A mark names where the written material has reached: the end of the last note so far.
        // why: lessons/timeline-csound.md#mark
        case 'm': marks.set(s.args[0], endBeat); break;
        case 'n': {
          // `n name` is a quotation from the mark to here, reported as a reference. csound 6.18's
          // `n` rewinds
          // the source and only fires at a section boundary; the difference is stated, not split.
          // why: lessons/timeline-csound.md#quotation
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
            // A played quotation shifts in beats and re-maps through the tempo, never in
            // milliseconds.
            // why: lessons/timeline-csound.md#shift
            const src = secItems.filter((it) => it.payload.sectionBeat >= from && it.payload.sectionBeat < to);
            for (const it of src) {
              push(it.payload.p, it.payload.sectionBeat - from + atBeat, it.payload.durBeats, it.payload.line);
            }
          }
          break;
        }
        case 'f': {
          // An f statement makes no row but holds the section open to its p2, shifted by `b`; any
          // p1.
          // why: lessons/timeline-csound.md#f-table
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
          // Time warps and loops are warned about, not dropped silently.
          // why: lessons/timeline-csound.md#ignored
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
    // Across the boundary p2 and p3 carry, p4 onward reset to 0, implicit carry stops; per-section
    // state resets.
    // why: lessons/timeline-csound.md#boundary-carry
    for (const [k, p] of carry) carry.set(k, p.map((v, i) => (i <= 2 ? v : 0)));
    carryLen.clear();
  }

  items.sort((a, b) => a.at - b.at || a.payload.line - b.payload.line);
  // The last section's end, so `f 0` and `s <n>` holds count.
  // why: lessons/timeline-csound.md#duration
  const durationMs = Math.max(
    sections[sections.length - 1]?.endMs || 0,
    ...items.map((it) => it.at + (it.payload.durMs || 0)),
    0,
  );

  return { tempo: tempoMap(globalTempoPoints(sections)), items, sections, repeats, warnings, durationMs };
}

// The repeats as score quotations, in ms (an arrangement runs in ms). Takes `quotation` from
// timeline/score.mjs as an argument, so this module stays a pure compiler.
// why: lessons/timeline-csound.md#repeats
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

// A score as a document part in global beats -> {part, tempo, sections, repeats, durationMs}.
// p-fields verbatim under `payload`, a doubled tempo point per section start, and `expand: false`
// so a repeat stays one `uses` entry. The self-test checks its ms against compileCsound.
// why: lessons/timeline-csound.md#csound-part
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
