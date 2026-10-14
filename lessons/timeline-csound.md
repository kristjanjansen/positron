# timeline-csound

Comments cut from the code on 2026-10-14 and kept here verbatim, so the code can say in one to three lines what it cannot say itself. Each `why:` pointer in the code names one heading below.

## `timeline/csound.mjs`

### header

Above `/** Tempo when a score declares none. At 60 bpm one beat is one second. */`, lines 1 to 71 before the cut.

~~~js
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
~~~

### macros

Above `const MACRO_PASS_LIMIT = 50;`, lines 76 to 110 before the cut.

~~~js
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
~~~

### expand-macros

Above `export function expandMacros(text) {`, lines 114 to 122 before the cut.

~~~js
/**
 * Expand `#define` macros. Returns the expanded text and any warnings.
 *
 * Expansion REPEATS TO A FIXED POINT because a macro body may name another
 * macro — `#define REPTEMPO #$TEMPO1#` is in both real scores, and a
 * single-pass substituter leaves `$TEMPO1` standing, which is exactly the
 * NaN that started this. The pass limit turns a cyclic definition into a named
 * failure rather than a hang.
 */
~~~

### redefine

Above `macros.set(name, { params, body });`, lines 169 to 171 before the cut.

~~~js
// ⚠️ A REDEFINITION IS NOT AN ERROR AND THE LAST ONE WINS — measured, and
// it matters because vClick's server REWRITES `#define REPTEMPO` by hand
// to start from a bar, which would otherwise collide with the original.
~~~

### undefined

Above `warnings.push('line ${at}: '${name}' is not defined — csound would drop '`, lines 216 to 218 before the cut.

~~~js
// 🔴 Refused BY NAME rather than reproduced. See the block above: csound
// drops the rest of the line and the carry refills it, so the score plays
// a convincing wrong note instead of failing.
~~~

### expressions

Above `/**`, lines 254 to 274 before the cut.

~~~js
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
~~~

### eval-expr

Above `export function evalScoreExpr(raw) {`, lines 276 to 280 before the cut.

~~~js
/**
 * Evaluate a Csound score expression. Returns a number, or `null` when the
 * expression is not one we will stand behind — the caller warns and keeps the
 * raw text, so nothing becomes a confident zero.
 */
~~~

### parse-banner

Above `/**`, lines 333 to 335 before the cut.

~~~js
// ---------------------------------------------------------------------------
// 1. PARSE — statements, in order, with their line numbers kept for messages.
// ---------------------------------------------------------------------------
~~~

### parse

Above `export function parseCsoundScore(text) {`, lines 337 to 341 before the cut.

~~~js
/**
 * Split a score into statements. Comments (`;` to end of line, and `/* … *\/`)
 * are stripped; blank lines vanish; everything else keeps its line number so a
 * failure can name the line a musician typed.
 */
~~~

### tempo-banner

Above `/**`, lines 359 to 361 before the cut.

~~~js
// ---------------------------------------------------------------------------
// 2. TEMPO — the beat↔time map, and its exact integral.
// ---------------------------------------------------------------------------
~~~

### tempo-map

Above `export function tempoMap(pairs) {`, lines 363 to 376 before the cut.

~~~js
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
~~~

### trapezoid

Above `const s0 = 60 / m0;`, lines 397 to 404 before the cut.

~~~js
// SECONDS PER BEAT is what Csound interpolates linearly in beat — not the
// TEMPO. So elapsed time is the trapezoid of 60/tempo, not the logarithmic
// integral a linear-in-beat tempo would give. This is measured against the
// reference implementation (csound 6.18), not derived: on `t 0 120 30 90`
// Csound puts beat 30 at 17.500 s where the log form gives 17.261, and on
// `t 0 60 20 180` it puts beat 20 at 13.333 s against the log form's
// 10.986. Trapezoid matches all 15 onsets and durations of the oracle,
// including a four-point map, to nine decimal places.
~~~

### spb-at

Above `const spbAt = (beat) => {`, lines 413 to 418 before the cut.

~~~js
/**
 * Seconds per beat AT a beat — the same interpolation `secondsAt` integrates,
 * evaluated instead of summed. Needed to cut a map at a section boundary that
 * falls in the middle of a ramp: the tempo carried across the join is the
 * interpolated one, not the last written point.
 */
~~~

### points-through

Above `function pointsThrough(tempo, endBeat) {`, lines 456 to 460 before the cut.

~~~js
/**
 * A tempo map's points restricted to `[0, endBeat]`, with the tempo PINNED at
 * the end — the value `spbAt` interpolates there, so cutting mid-ramp carries
 * the tempo that was actually in force and not the last point written.
 */
~~~

### global-tempo

Above `function globalTempoPoints(sections) {`, lines 467 to 475 before the cut.

~~~js
/**
 * Every section's map, shifted onto ONE beat axis and joined.
 *
 * Each join is TWO POINTS AT THE SAME BEAT — the outgoing tempo and the
 * incoming one — because that is how a piecewise-linear map writes a
 * discontinuity, and a section boundary is exactly that. A single-section
 * score gets its own points back unchanged, which is why every existing
 * document is byte-identical after this.
 */
~~~

### section-tempo

Above `function sectionTempo(sts, warnings) {`, lines 489 to 497 before the cut.

~~~js
/**
 * The tempo map ONE section declares, from the `t` statements inside it.
 *
 * Measured rules, all four of them counter-intuitive enough to have cost a
 * probe each: a section with no `t` is 60 bpm even when the section before it
 * had one; a `t` governs its whole section wherever it sits; the last `t` in
 * a section wins; and a `t` whose first pair is not at beat 0 is discarded
 * whole rather than held back to zero.
 */
~~~

### compile-banner

Above `/**`, lines 523 to 525 before the cut.

~~~js
// ---------------------------------------------------------------------------
// 3. COMPILE — statements + tempo into rows a deck can hold.
// ---------------------------------------------------------------------------
~~~

### compile

Above `export function compileCsound(text, { kind = 'note', expand = true } = {}) {`, lines 527 to 542 before the cut.

~~~js
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
~~~

### macros-first

Above `const expanded = expandMacros(text);`, lines 544 to 546 before the cut.

~~~js
// ⚠️ MACROS FIRST, AND THE ORDER IS MEASURED, NOT CHOSEN: `[$N/2]` with N 4
// evaluates to 2, so a macro can be an OPERAND of a bracket and expansion has
// to have finished before any expression is looked at.
~~~

### pass-1

Above `const groups = [];`, lines 551 to 553 before the cut.

~~~js
// ── Pass 1: cut into SECTIONS. This has to happen before any p2 becomes a
// time, because a `t` governs its whole section from wherever it appears in
// it — including from after the notes it governs.
~~~

### s-arg

Above `if (s.args.length) {`, lines 559 to 561 before the cut.

~~~js
// `s 10` sets this section's length to beat 10. It is a floor, not an
// override — a note that runs past it still holds the section open — and
// unlike an `f` it is NOT shifted by `b`.
~~~

### carry

Above `const carry = new Map();          // p1 -> that instrument's last p-field array`, lines 579 to 588 before the cut.

~~~js
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
~~~

### base

Trailing comment on line 601 before the cut.

~~~js
let base = 0;                   // `b` — an offset added to every p2, in beats
~~~

### beat

Trailing comment on line 612 before the cut.

~~~js
beat: fromBeat + atBeat,          // global — what a document and a deck read
~~~

### section-beat

Trailing comment on line 613 before the cut.

~~~js
sectionBeat: atBeat,              // local — what the musician wrote
~~~

### dot

Above `if (raw === '.') {`, lines 633 to 635 before the cut.

~~~js
// `.` carries the same p-field from the previous note OF THIS
// INSTRUMENT — not the previous line, which is what makes a carried
// score readable when two instruments interleave.
~~~

### plus-caret

Above `if (raw === '+') return prevEnd.get(p1) ?? 0;`, lines 644 to 651 before the cut.

~~~js
// p2 shorthands, and the three do NOT share a reference note —
// measured against csound 6.18 rather than assumed. `+` is
// "where the previous note OF THIS INSTRUMENT ended"; `^+x` /
// `^-x` are relative to where the IMMEDIATELY PRECEDING
// STATEMENT started, whatever instrument that was. On
//     i 1 0 2 / i 2 5 2 / i 1 ^+0.5 .
// Csound answers 5.5, not 0.5. Both reset at `s`, where `.`
// does not.
~~~

### bracket

Above `if (raw.startsWith('[')) {`, lines 659 to 663 before the cut.

~~~js
// A SCORE EXPRESSION, `[8/3]`. Until 2026-09-14 this fell straight
// through to the string below and `Number(p[1]) || 0` turned it into
// beat 0 with no warning — see §1b. Evaluated here so p2 and p3 are
// right; a form we will not stand behind returns null and is warned
// about rather than guessed at.
~~~

### trailing-carry

Above `for (let idx = p.length; idx < (carryLen.get(p1) || 0); idx++) p[idx] = carried[`..., lines 675 to 677 before the cut.

~~~js
// p-fields left off the end are carried from this instrument's
// previous note IN THIS SECTION — `carryLen` is 0 after an `s`, so
// nothing crosses.
~~~

### mark

Above `case 'm': marks.set(s.args[0], endBeat); break;`, lines 690 to 692 before the cut.

~~~js
// A mark names WHERE THE WRITTEN MATERIAL HAS REACHED, which is the end
// of the last note so far — not the parse position, and not the section
// start. `endBeat` already tracks exactly that.
~~~

### quotation

Above `const from = marks.get(s.args[0]);`, lines 695 to 707 before the cut.

~~~js
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
~~~

### shift

Above `const src = secItems.filter((it) => it.payload.sectionBeat >= from && it.payload`..., lines 727 to 730 before the cut.

~~~js
// A quotation played, rather than quoted: same rows, shifted. Note the
// shift is in BEATS and re-mapped through the tempo — shifting the
// MILLISECONDS would silently transpose the passage into whatever
// tempo happens to be in force where it lands.
~~~

### f-table

Above `const at = Number(s.args[1]);`, lines 739 to 742 before the cut.

~~~js
// An f-table is ORCHESTRA-side and carries no timeline row — but its
// p2 HOLDS THE SECTION OPEN to that beat, which is the whole point of
// the `f 0 <n>` idiom, and `b` shifts it exactly like a note's p2.
// Measured: any p1, not only `f 0`.
~~~

### ignored

Above `warnings.push('line ${s.line}: '${s.op}' statement ignored (no timeline row)');`, lines 754 to 757 before the cut.

~~~js
// Time warps and macro loops are authoring sugar; they carry no
// timeline row. Recorded as warnings rather than dropped in silence,
// because a score that leans on them compiles to something quietly
// shorter than it reads.
~~~

### boundary-carry

Above `for (const [k, p] of carry) carry.set(k, p.map((v, i) => (i <= 2 ? v : 0)));`, lines 778 to 781 before the cut.

~~~js
// The carry across the boundary: p2 and p3 survive an explicit `.`, p4 and
// after come back as 0, and a field left off the end carries nothing at all
// (`carryLen` to 0). `prevEnd`, `prevAny` and `base` are per-section and
// reset with the loop.
~~~

### duration

Above `const durationMs = Math.max(`, lines 787 to 789 before the cut.

~~~js
// The last section's end is at or past every note's end, so this is the same
// number as before for a score that ends on a note — and the right one for a
// score held open by `f 0` or by `s <n>`.
~~~

### repeats

Above `export function repeatsAsQuotations(compiled, { ref, quotation }) {`, lines 799 to 812 before the cut.

~~~js
/**
 * The repeats as SCORE VALUES — one quotation per `n`, naming the deck the
 * quoted span lives in. This is the half of the mapping that a stored score
 * carries: `score({ quotations })` round-trips to JSON, `nest.add()` plays it,
 * and neither has to see the notes.
 *
 * In MILLISECONDS, because `score()` is an arrangement and an arrangement runs
 * in ms — `scoreDoc()` is the one that is in beats, and sound builds its
 * `uses` from `repeats[].inBeat/outBeat/atBeat` for that reason.
 *
 * Takes the quotation constructor rather than importing score.mjs, so this
 * module stays a pure compiler with no dependency on the score format's
 * version — pass `quotation` from timeline/score.mjs.
 */
~~~

### csound-part

Above `export function csoundPart(text, { kind = 'note' } = {}) {`, lines 826 to 850 before the cut.

~~~js
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
~~~
