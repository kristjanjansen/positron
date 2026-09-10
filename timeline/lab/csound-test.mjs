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

import { compileCsound, csoundPart, tempoMap, parseCsoundScore, repeatsAsQuotations, DEFAULT_BPM } from '../csound.mjs';
import { createDeck } from '../transport.mjs';
import { quotation, score, parseScore, scoreToJSON, scoreDoc, partItems } from '../score.mjs';

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

// ── 3. THE RAMP. Seconds-per-beat is linear in beat ⇒ time is a TRAPEZOID. ──
// MEASURED against csound 6.18, not derived. `t 0 120 30 90` puts beat 30 at
// 17.500 s. Three models disagree and only one is Csound's:
//     trapezoid on 60/tempo   17.500 s   <- Csound
//     linear-in-tempo (log)   17.261 s   <- what this file shipped until 09-09
//     mean tempo              17.143 s
// The old comment warned that the mean-tempo shortcut lands notes "118 ms
// early". That 118 ms was the gap between two WRONG answers; the real error was
// 239 ms, and on `t 0 60 20 180` it was 2.35 s by beat 20.
{
  const t = tempoMap([[0, 120], [30, 90]]);
  const CSOUND_BEAT30 = 17.5;                       // csound 6.18, measured
  ok('ramp matches Csound (trapezoid on seconds-per-beat)',
    near(t.secondsAt(30), CSOUND_BEAT30, 1e-9), `${t.secondsAt(30).toFixed(9)} s`);
  const meanTempoWrong = (60 * 30) / ((120 + 90) / 2);
  ok('and is NOT the mean-tempo answer', !near(t.secondsAt(30), meanTempoWrong, 1e-3),
    `${t.secondsAt(30).toFixed(3)} s vs the naive ${meanTempoWrong.toFixed(3)} s`);
  const logFormWrong = (60 / ((90 - 120) / 30)) * Math.log(90 / 120);
  ok('and is NOT the linear-in-tempo log integral', !near(t.secondsAt(30), logFormWrong, 1e-6),
    `${t.secondsAt(30).toFixed(6)} s vs the log form ${logFormWrong.toFixed(6)} s`);

  // A steeper ramp, chosen because the three models predict 13.333 / 10.986 /
  // 10.000 — so one run separates them.
  const t2 = tempoMap([[0, 60], [20, 180]]);
  ok('a steep ramp matches Csound', near(t2.secondsAt(20), 20 * (1 + 1 / 3) / 2, 1e-9),
    `${t2.secondsAt(20).toFixed(9)} s`);
  ok('and its midpoint does too', near(t2.secondsAt(10), 8.333333333333334, 1e-9),
    `${t2.secondsAt(10).toFixed(9)} s`);

  // A four-point map, every value measured.
  const t3 = tempoMap([[0, 60], [10, 120], [20, 60], [30, 180]]);
  const want = [[5, 4.375], [10, 7.5], [15, 10.625], [20, 15],
                [25, 19.166666666666668], [30, 21.666666666666668], [35, 23.333333333333336]];
  ok('a four-point map matches Csound at every point',
    want.every(([b, sec]) => near(t3.secondsAt(b), sec, 1e-9)),
    want.map(([b]) => t3.secondsAt(b).toFixed(4)).join(', '));

  ok('tempo holds past the last point', near(t.secondsAt(40) - t.secondsAt(30), (60 * 10) / 90, 1e-9),
    `${(t.secondsAt(40) - t.secondsAt(30)).toFixed(6)} s for 10 beats at 90 bpm`);
  ok('beatAt inverts secondsAt', near(t.beatAt(t.secondsAt(17.5)), 17.5, 1e-6),
    `${t.beatAt(t.secondsAt(17.5)).toFixed(9)}`);
}

// ── 4. carry and the p2 shorthands ─────────────────────────────
// Every number here is csound 6.18's answer for this exact score, and the point
// is that the three shorthands do NOT share a reference note:
//     +    the previous note OF THIS INSTRUMENT, its end
//     .    the same p-field of the previous note OF THIS INSTRUMENT
//     ^+x  the IMMEDIATELY PRECEDING STATEMENT's start, any instrument
// Selected by p5 rather than by index, because the rows are sorted by time and
// an index assert silently follows whichever note moved.
{
  const c = compileCsound([
    'i 1 0 1 8000 440',
    'i 1 + . . 550',          // + → 1.0 s   (end of instr 1's note, not instr 2's)
    'i 2 0 2 9000 220',       // a different instrument, interleaved
    'i 1 ^+0.5 . . 660',      // ^+0.5 → 0.5 s (0.5 after the PRECEDING statement)
  ].join('\n'));
  const byP5 = (v) => c.items.find((i) => i.payload.p[4] === v);
  ok("'+' is the previous note of the SAME instrument", byP5(550).at === 1000, `${byP5(550).at} ms`);
  ok("'.' carries p4 from the same instrument", byP5(550).payload.p[3] === 8000, String(byP5(550).payload.p[3]));
  ok("'^+x' is relative to the PRECEDING STATEMENT", byP5(660).at === 500, `${byP5(660).at} ms`);
  ok("and '.' still carries per instrument on that line",
    byP5(660).payload.p[2] === 1 && byP5(660).payload.p[3] === 8000,
    `dur ${byP5(660).payload.p[2]}, p4 ${byP5(660).payload.p[3]}`);
  ok('instrument 2 is untouched by either', byP5(220).at === 0 && byP5(220).payload.p[2] === 2,
    `${byP5(220).at} ms, dur ${byP5(220).payload.p[2]}`);
}

// ── 5. SECTIONS. `s` is a new clock, not just a new zero. ──────────────────
// Every number below is csound 6.18's own answer for that exact score, read
// off `timeline/lab/csound-oracle.mjs`. The defect these replace was two
// seconds wide and shipped green for months, because one global tempo map
// across a score that resets its tempo is wrong in a way no self-consistent
// test can see.
{
  const c = compileCsound('i 1 0 2\ni 1 2 2\ns\ni 1 0 1');
  ok('a section restarts p2 at its own zero', c.items[2].at === 4000, `${c.items[2].at} ms`);
  ok('sections are reported', c.sections.length === 2, `${c.sections.length}`);

  // THE RESET. 120 bpm through section 1 (beats 0 and 4 -> 0 s and 2 s, ending
  // at beat 5 = 2.5 s), then 60 bpm because section 2 declares no tempo of its
  // own: 2.5 s and 6.5 s. A global map would put them at 2.5 s and 4.5 s.
  const r = compileCsound('t 0 120\ni 1 0 1\ni 1 4 1\ns\ni 1 0 1\ni 1 4 1');
  ok('a section with no tempo of its own is 60 bpm, not the last one in force',
    [0, 2000, 2500, 6500].every((ms, i) => near(r.items[i].at, ms, 1e-9)),
    r.items.map((i) => i.at.toFixed(1)).join(', '));
  ok('and the section carries a start TIME, which a start beat cannot give',
    near(r.sections[1].startMs, 2500, 1e-9) && r.sections[1].points[0][1] === DEFAULT_BPM,
    `starts at ${r.sections[1].startMs} ms, at ${r.sections[1].points[0][1]} bpm`);

  // A LATER tempo does not reach back either — section 1 stays at 60.
  const back = compileCsound('i 1 0 1\ni 1 4 1\ns\nt 0 240\ni 1 0 1\ni 1 4 1');
  ok('a later section\'s tempo does not leak backwards',
    [0, 4000, 5000, 6000].every((ms, i) => near(back.items[i].at, ms, 1e-9)),
    back.items.map((i) => i.at.toFixed(1)).join(', '));

  // A `t` whose first pair is not beat 0 is DISCARDED, not held back to zero.
  // Held back, these four notes would land at 0/2/4/6 s.
  const t4 = compileCsound('t 4 120\ni 1 0 1\ni 1 4 1\ni 1 8 1\ni 1 12 1');
  ok('a t that does not start at beat 0 is discarded whole',
    [0, 4000, 8000, 12000].every((ms, i) => near(t4.items[i].at, ms, 1e-9)),
    t4.items.map((i) => i.at.toFixed(1)).join(', '));
  ok('and says so', t4.warnings.some((w) => /must start at beat 0/.test(w)),
    t4.warnings[0] || 'no warning');

  // A section is as long as its longest note ENDS, in warped seconds — 4 s at
  // 120 bpm for eight beats, not 8, and not the 0.5 s where its last note starts.
  const len = compileCsound('t 0 120\ni 1 0 8\ni 1 1 0.25\ns\ni 1 0 1');
  ok('a section runs until its longest note ends, in warped seconds',
    near(len.items[2].at, 4000, 1e-9), `${len.items[2].at} ms`);
  // and an `f` holds it open past that — `b` shifting the f as well as the note
  const held = compileCsound('b 5\ni 1 0 1\nf 0 10\ns\ni 1 0 1');
  ok('an f holds its section open, and b shifts the f too',
    near(held.items[1].at, 15000, 1e-9), `${held.items[1].at} ms`);
  const sArg = compileCsound('t 0 120\ni 1 0 1\ns 10\ni 1 0 1');
  ok('so does the length on the s statement itself', near(sArg.items[1].at, 5000, 1e-9),
    `${sArg.items[1].at} ms`);

  // THE CARRY, which does not all reset together: `.` still carries p2 and p3
  // across the boundary while p4 comes back 0, and `+` and `^` start again.
  const cr = compileCsound('i 1 5 1 777\ns\ni 1 . . .');
  ok("'.' crosses a section for p2 and p3, and comes back 0 for p4",
    near(cr.items[1].at, 11000, 1e-9) && cr.items[1].payload.p[3] === 0,
    `${cr.items[1].at} ms, p4 ${cr.items[1].payload.p[3]}`);
  const pm = compileCsound('i 1 0 2 111\ns\ni 1 + . 333\ni 1 ^+1 .');
  ok("but '+' and '^' do not", near(pm.items[1].at, 2000, 1e-9) && near(pm.items[2].at, 3000, 1e-9),
    pm.items.map((i) => i.at.toFixed(1)).join(', '));
  // a p-field simply left off the end is carried too — but only within a section
  const tail = compileCsound('i 1 0 1 777 888\ni 1 2 1\ns\ni 1 4 1');
  ok('a p-field left off the end is carried, and stops at the section',
    tail.items[1].payload.p[3] === 777 && tail.items[2].payload.p[3] === undefined,
    `p4 ${tail.items[1].payload.p[3]} then ${tail.items[2].payload.p[3]}`);
}

// ── 5b. THE SECTION CLOCK, and the one axis a document has ────────────────
// Three sections, two ramps, a base and an f. Csound's answer at every onset.
{
  const SCORE = ['t 0 120 4 60', 'i 1 0 1', 'i 1 2 1', 'i 1 4 1',
    's', 'i 1 0 1', 'i 1 3 1',
    's', 't 0 90', 'b 2', 'i 1 0 1', 'i 1 2 2', 'f 0 12'].join('\n');
  const CSOUND = [0, 1250, 3000, 4000, 7000, 9333.333333333334, 10666.666666666668];
  const c = compileCsound(SCORE);
  ok('three sections, two ramps and a base match Csound at every onset',
    c.items.length === CSOUND.length && CSOUND.every((ms, i) => near(c.items[i].at, ms, 1e-6)),
    c.items.map((i) => i.at.toFixed(3)).join(', '));

  // THE MECHANISM, not a downstream effect: a score document carries ONE beat
  // axis and one tempo map, and csound's sections each start again at beat 0.
  // `csoundPart` lays them end to end and spells each boundary as two points at
  // the same beat. If that is wrong, `partItems` puts the rows somewhere else —
  // so assert THAT, rather than re-reading the numbers above.
  const cp = csoundPart(SCORE);
  const doc = scoreDoc({ id: 'sections', tempo: cp.tempo, parts: { tune: cp.part }, uses: [] });
  const back = partItems(doc, 'tune', { tempoMap });
  ok('and the document reproduces every one of them through its own tempo map',
    back.length === CSOUND.length && CSOUND.every((ms, i) => near(back[i].at, ms, 1e-6)),
    back.map((i) => i.at.toFixed(3)).join(', '));
  ok('the boundaries are doubled points, which is how a map spells a jump',
    cp.tempo.filter(([b], i) => i && b === cp.tempo[i - 1][0]).length === 2,
    JSON.stringify(cp.tempo));
  // and a ONE-section score is untouched by any of it
  const one = csoundPart('t 0 120 8 60\ni 1 0 1');
  ok('a single-section score gets exactly the map it wrote',
    JSON.stringify(one.tempo) === JSON.stringify([[0, 120], [8, 60]]), JSON.stringify(one.tempo));
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
