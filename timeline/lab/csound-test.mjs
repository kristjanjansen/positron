// timeline/lab/csound-test.mjs — the compiler, and the claim it exists to make.
//
//   node timeline/lab/csound-test.mjs
//
// The claim (demo/notes/uuu-positron.md §3) is not "we can parse Csound". It is
// that a vClick score compiled into rows gains the two things the format does
// not have: a repeat that is a REFERENCE, and a fold at any position — so
// "start at bar 47" is a computation rather than a rehearsal discipline.
// The last two tests are that claim; the ones before it are the arithmetic it
// stands on, and the ramp is the one that would fail silently.

import { compileCsound, tempoMap, parseCsoundScore, repeatsAsQuotations, DEFAULT_BPM } from '../csound.mjs';
import { createDeck } from '../transport.mjs';
import { quotation, score, parseScore, scoreToJSON } from '../score.mjs';

let pass = 0, fail = 0;
const ok = (label, cond, detail = '') => {
  cond ? pass++ : fail++;
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${label}${detail ? `  — ${detail}` : ''}`);
};
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

console.log('\ncsound compiler');

// ── 1. no tempo statement: one beat is one second ──────────────────────────
{
  const c = compileCsound('i 1 0 1 8000 440\ni 1 2 0.5 8000 660');
  ok('default tempo is 60 bpm', tempoMap([]).points[0][1] === DEFAULT_BPM, `${DEFAULT_BPM} bpm`);
  ok('beats are seconds at 60 bpm', c.items[0].at === 0 && c.items[1].at === 2000,
    `${c.items.map((i) => i.at).join(', ')} ms`);
  ok('duration comes from p3', c.items[0].payload.durMs === 1000, `${c.items[0].payload.durMs} ms`);
  ok('p-fields survive', c.items[0].payload.p[4] === 440, String(c.items[0].payload.p[4]));
}

// ── 2. flat tempo ──────────────────────────────────────────────────────────
{
  const c = compileCsound('t 0 120\ni 1 4 1');
  ok('120 bpm puts beat 4 at 2 s', near(c.items[0].at, 2000, 1e-9), `${c.items[0].at} ms`);
}

// ── 3. THE RAMP. Linear in beat, logarithmic in time. ──────────────────────
// t 0 120 30 90: k = (90−120)/30 = −1, so Δt = (60/k)·ln(90/120) = 17.2609…s.
// A compiler that treats the ramp as a mean tempo lands every later note early
// by ~0.6 s here and by more the longer the accelerando runs — and nothing in
// the output looks wrong.
{
  const t = tempoMap([[0, 120], [30, 90]]);
  const closed = (60 / ((90 - 120) / 30)) * Math.log(90 / 120);
  ok('ramp matches the closed-form integral', near(t.secondsAt(30), closed, 1e-9),
    `${t.secondsAt(30).toFixed(6)} s vs ${closed.toFixed(6)} s`);
  const meanTempoWrong = (60 * 30) / ((120 + 90) / 2);
  ok('and is NOT the mean-tempo answer', !near(t.secondsAt(30), meanTempoWrong, 1e-3),
    `${t.secondsAt(30).toFixed(3)} s vs the naive ${meanTempoWrong.toFixed(3)} s`);
  ok('tempo holds past the last point', near(t.secondsAt(40) - t.secondsAt(30), (60 * 10) / 90, 1e-9),
    `${(t.secondsAt(40) - t.secondsAt(30)).toFixed(6)} s for 10 beats at 90 bpm`);
  ok('beatAt inverts secondsAt', near(t.beatAt(t.secondsAt(17.5)), 17.5, 1e-6),
    `${t.beatAt(t.secondsAt(17.5)).toFixed(9)}`);
}

// ── 4. carry and the p2 shorthands ─────────────────────────────────────────
{
  const c = compileCsound([
    'i 1 0 1 8000 440',
    'i 1 + . . 550',          // + = where the previous note of THIS instr ended
    'i 2 0 2 9000 220',       // a different instrument, interleaved
    'i 1 ^+0.5 . . 660',      // ^+x = relative to the previous START
  ].join('\n'));
  const one = c.items.filter((i) => i.payload.instr === 1);
  ok("'+' starts at the previous note's end", one[1].at === 1000, `${one[1].at} ms`);
  ok("'.' carries p4 from the same instrument", one[1].payload.p[3] === 8000, String(one[1].payload.p[3]));
  ok("'^+x' is relative to the previous start", one[2].at === 1500, `${one[2].at} ms`);
  ok('the carry is per instrument, not per line', one[1].payload.p[3] === 8000 && one[1].payload.p[2] === 1,
    `dur ${one[1].payload.p[2]}`);
}

// ── 5. sections ────────────────────────────────────────────────────────────
{
  const c = compileCsound('i 1 0 2\ni 1 2 2\ns\ni 1 0 1');
  ok('a section restarts p2 at its own zero', c.items[2].at === 4000, `${c.items[2].at} ms`);
  ok('sections are reported', c.sections.length === 2, `${c.sections.length}`);
}

// ── 6. m/n: the repeat, as a reference ─────────────────────────────────────
{
  const c = compileCsound([
    'm theme',
    'i 1 0 1 8000 440',
    'i 1 1 1 8000 550',
    'n theme',
  ].join('\n'));
  ok('the repeat is reported as a span', c.repeats.length === 1
    && c.repeats[0].inMs === 0 && c.repeats[0].outMs === 2000 && c.repeats[0].atMs === 2000,
    c.repeats.length ? `in ${c.repeats[0].inMs} out ${c.repeats[0].outMs} at ${c.repeats[0].atMs}` : 'none');
  ok('expanded rows land after the original', c.items.length === 4
    && c.items[2].at === 2000 && c.items[3].at === 3000,
    c.items.map((i) => i.at).join(', '));
  const structural = compileCsound('m theme\ni 1 0 1\ni 1 1 1\nn theme', { expand: false });
  ok('expand:false keeps the structure and drops the copies',
    structural.items.length === 2 && structural.repeats.length === 1,
    `${structural.items.length} rows, ${structural.repeats.length} repeats`);
}

// ── 7. a repeat becomes a QUOTATION VALUE that round-trips ─────────────────
{
  const c = compileCsound('m theme\ni 1 0 1\ni 1 1 1\nn theme', { expand: false });
  const qs = repeatsAsQuotations(c, { ref: 'vclick-piece-1', quotation });
  const s = score({ id: 'piece-1', quotations: qs });
  const back = parseScore(scoreToJSON(s));
  ok('the repeat survives as a quotation', qs.length === 1 && qs[0].ref === 'vclick-piece-1',
    JSON.stringify({ at: qs[0].at, in: qs[0].in, out: qs[0].out }));
  ok('and the score round-trips byte-identically',
    scoreToJSON(back) === scoreToJSON(s), `${scoreToJSON(s).length} bytes`);
}

// ── 8. THE FOLD. Seek-from-anywhere, on a compiled score. ──────────────────
// This is the one the note argues for: the score itself carries no state, so
// "what is in force at bar 47" is unanswerable from the file. Compiled into
// rows, it is deck.reduceAt(kind, pos) — and it is exact at every probe, not
// only where a cue happens to sit.
{
  const c = compileCsound('t 0 120\n' + Array.from({ length: 16 }, (_, i) => `i 1 ${i} 0.5 8000 ${400 + i}`).join('\n'));
  const deck = createDeck({
    items: c.items,
    adapters: { note: { caps: { rates: [1] }, actuate() {}, reduce: (rows) => ({ count: rows.length }) } },
    range: [0, Math.ceil(c.durationMs)],
    tickHost: 'main',
    autoStart: false,
  });
  let wrong = 0, probes = 0;
  for (let ms = 0; ms <= c.durationMs; ms += 137) {
    probes++;
    const want = c.items.filter((it) => it.at <= ms).length;
    const got = deck.reduceAt('note', ms)?.count ?? -1;
    if (got !== want) { wrong++; if (wrong < 4) console.log(`      fold@${ms} want ${want} got ${got}`); }
  }
  ok('the fold is exact at every probe', wrong === 0, `${probes} probes, ${wrong} wrong`);
  // and at the boundaries, where an off-by-one lives
  let edge = 0;
  for (const it of c.items) {
    for (const probe of [it.at - 1, it.at, it.at + 1]) {
      const want = c.items.filter((x) => x.at <= probe).length;
      if ((deck.reduceAt('note', probe)?.count ?? -1) !== want) edge++;
    }
  }
  ok('and exact either side of every note', edge === 0, `${c.items.length * 3} boundary probes, ${edge} wrong`);
  deck.dispose?.();
}

console.log(`\n${pass}/${pass + fail} green${fail ? `  (${fail} FAILED)` : ''}`);
process.exit(fail ? 1 : 0);
