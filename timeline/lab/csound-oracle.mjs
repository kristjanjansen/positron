// timeline/lab/csound-oracle.mjs — our compiler against the REFERENCE one.
//
//   node timeline/lab/csound-oracle.mjs          # skips cleanly if csound is absent
//   CSOUND=/opt/homebrew/bin/csound node timeline/lab/csound-oracle.mjs
//   CSOUND=timeline/lab/csound-ssh.mjs node timeline/lab/csound-oracle.mjs
//
// WHY THIS EXISTS. `csound-test.mjs` checks the compiler against numbers a human
// derived from the same formula the compiler implements. That catches a typo and
// cannot catch a MISREADING — and on 2026-09-09 it was hiding two real defects
// for the whole life of the file:
//
//   · the tempo ramp. We interpolated TEMPO linearly in beat, making time the
//     logarithmic integral. Csound interpolates SECONDS PER BEAT linearly in
//     beat, making time a trapezoid. On `t 0 120 30 90` that is 17.500 s against
//     our 17.261 — 239 ms — and on `t 0 60 20 180` it is 2.35 s by beat 20.
//   · `^+x`. We resolved it against the previous note of the SAME INSTRUMENT.
//     Csound resolves it against the IMMEDIATELY PRECEDING STATEMENT, whatever
//     instrument that was. `+` and `.` really are per-instrument, so the three
//     shorthands do NOT share a reference note — exactly the sort of thing that
//     has to be measured rather than reasoned about (LESSONS #26).
//
// and on 2026-09-10 three more, all of them about SECTIONS (`s`), which reset
// the clock AND the tempo AND most of the carry. Those are the cases below
// from `sections reset the tempo` down.
//
// HOW, AND WHAT EACH HALF CAN SEE. Csound converts p2/p3 from beats to seconds
// during score sorting, so an instrument that `prints` its own p2 reports the
// reference answer — but that answer is SECTION-LOCAL, and it stays 0.000 for
// the first note of every section however far into the piece that section is.
// A multi-section score therefore needs both:
//
//   · p2 and p3, which are EXACT and grade the tempo map, the carry, `b` and
//     everything else that happens inside one section; and
//   · `times`, the absolute performance clock, which is the only thing that can
//     see the section OFFSET — and which is quantised to one k-period, because
//     csound starts a section on a k-boundary. `ksmps = 1` makes that 1/48000 s
//     (20.8 µs), and the run prints the worst error it actually saw, so
//     "exact" and "within tolerance" do not read the same.
//
// `-n` means no audio, so this is a compiler comparison and never a render.
//
// TRAP, and it cost a round: csound writes ANSI escapes, so a `^EVT` match drops
// most lines — a partial result that looks like a finding rather than like a
// broken filter (LESSONS #45). The escape is written `\\u001b` below and not as
// the raw byte it used to be: a raw control character in source does not
// survive being read out of the file and pasted into a probe, which is how the
// same trap caught the same filter a second time.

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compileCsound } from '../csound.mjs';

const SR = 48000;
const KSMPS = 1;                     // the absolute clock's resolution: 1/48000 s
const KPERIOD = KSMPS / SR;

const ORC = `sr = ${SR}
ksmps = ${KSMPS}
nchnls = 1
0dbfs = 1
instr 1, 2
  itim times
  prints "EVT %.9f %.9f %.9f %.9f %.9f\\n", p1, p2, p3, itim, p4
endin
`;

/** Every case is a real question about semantics, not a smoke test. */
const CASES = [
  ['default tempo is 60 bpm', 'i 1 0 1\ni 1 2 0.5'],
  ['flat tempo', 't 0 120\ni 1 4 1'],
  ['THE RAMP', 't 0 120 30 90\ni 1 0 1\ni 1 10 1\ni 1 20 1\ni 1 30 1\ni 1 40 1'],
  // chosen because trapezoid / log / mean-tempo predict 13.333 / 10.986 / 10.000,
  // so one run separates all three rather than merely failing one
  ['a steep ramp', 't 0 60 20 180\ni 1 0 1\ni 1 10 1\ni 1 20 1'],
  ['a four-point map', `t 0 60 10 120 20 60 30 180\n${
    [0, 5, 10, 15, 20, 25, 30, 35].map((b) => `i 1 ${b} 1`).join('\n')}`],
  ['the ramp the score demo asserts', 't 0 120 8 60\ni 1 0 1\ni 1 4 1\ni 1 8 1'],
  ['+ is per instrument', 'i 1 0 2\ni 2 5 3\ni 1 + .'],
  ['. is per instrument', 'i 1 0 2 111\ni 2 5 3 222\ni 1 8 . .'],
  ['^ is per STATEMENT', 'i 1 0 2\ni 2 5 2\ni 1 ^+0.5 .'],
  ['all three shorthands at once',
    'i 1 0 1 8000 440\ni 1 + . . 550\ni 2 0 2 9000 220\ni 1 ^+0.5 . . 660'],
  ['a p-field left off the end is carried', 'i 1 0 1 777 888\ni 1 2 1\ni 1 4 1 999'],

  // ── SECTIONS. `s` restarts p2 at zero, and five other things besides. ────
  // Each of these separates two models that predict numbers seconds apart, and
  // confirms the winner at every onset rather than at one.
  ['sections reset the tempo to 60',
    't 0 120\ni 1 0 1\ni 1 4 1\ns\ni 1 0 1\ni 1 4 1'],
  // 8 s if a section is as long as its longest note ENDS, 1 s if it is as long
  // as its last note STARTS
  ['a section runs until its longest note ENDS',
    'i 1 0 8\ni 1 1 0.25\ns\ni 1 0 1'],
  // the same shape at 120 bpm: 4 s if that length is in warped seconds, 8 if beats
  ['and that length is in warped seconds',
    't 0 120\ni 1 0 8\ni 1 1 0.25\ns\ni 1 0 1'],
  ['a later section\'s tempo does not leak backwards',
    'i 1 0 1\ni 1 4 1\ns\nt 0 240\ni 1 0 1\ni 1 4 1'],
  // 0/4/8/12 s if the statement is discarded, 0/2/4/6 if it is held back to beat 0
  ['a t that does not start at beat 0 is discarded whole',
    't 4 120\ni 1 0 1\ni 1 4 1\ni 1 8 1\ni 1 12 1'],
  ['an f holds its section open past the last note',
    't 0 120\ni 1 0 1\nf 0 10\ns\ni 1 0 1'],
  ['and so does the length on the s statement itself',
    't 0 120\ni 1 0 1\ns 10\ni 1 0 1'],
  // 15 s if `b` shifts the f as well as the note, 10 s if only the note
  ['b shifts an f too, and resets at s',
    'b 5\ni 1 0 1\nf 0 10\ns\ni 1 0 1'],
  ['. crosses a section for p2 and p3, and comes back 0 for p4',
    'i 1 5 1 777\ns\ni 1 . . .'],
  // ...while a p-field merely LEFT OFF does not cross at all. Two carries, two
  // rules, and the only way to know that is to ask. It has to be p3 that is
  // left off: p4 is zeroed by the OTHER rule, so a p4 probe here reads green
  // whichever way this one is wired and would prove nothing.
  ['a p-field left off the end does not cross a section',
    'i 1 0 3\ns\ni 1 4'],
  ['but + and ^ do not cross one',
    'i 1 0 2 111\ns\ni 1 + . 333\ni 1 ^+1 .'],
  ['THE SECTION CLOCK — three sections, two ramps, a base and an f',
    ['t 0 120 4 60', 'i 1 0 1', 'i 1 2 1', 'i 1 4 1',
      's', 'i 1 0 1', 'i 1 3 1',
      's', 't 0 90', 'b 2', 'i 1 0 1', 'i 1 2 2', 'f 0 12'].join('\n')],
];

// Known, OPEN divergences — reported rather than omitted, because a suite that
// quietly drops a failing case is how a defect becomes permanent.
const KNOWN_OPEN = [
  // Ours: `n name` replays the span from the mark to HERE, in place. Csound's:
  // `n` REWINDS THE SOURCE and re-reads from the mark, and it only fires when
  // the `n` sits at a section boundary — so this score replays nothing there
  // (and trips an internal error inside csound's own backtrace printer).
  // Matching it would mean giving up the quotation, which is the reason this
  // compiler exists, so the difference is stated instead of split.
  ['n is a span here and a source rewind there (KNOWN OPEN)',
    'm theme\ni 1 0 1\ni 1 1 1\nn theme'],
  // p3 < 0 means "hold until something turns it off". A timeline row has no
  // such length, so ours is 0 where csound reports the negative p3 verbatim.
  // The ONSET matches, and so does the section length it implies.
  ['a held note has no duration a row can hold (KNOWN OPEN)',
    'i 1 0 -1\ni 1 2 1\ns\ni 1 0 1'],
  // Two `t` in one section: csound sorts by the last one and then emits the
  // first as a runtime `t`, which re-warps at play time — the two answers it
  // gives are not consistent with each other. Ours takes the last, which is
  // what the sorted score says.
  ['two t statements in one section (KNOWN OPEN)',
    't 0 60\ni 1 0 1\nt 0 240\ni 1 4 1'],
];

const ANSI = /\u001b\[[0-9;]*m/g;
const strip = (s) => s.replace(ANSI, '').replace(/\u001b/g, '');

// Every candidate has to ANSWER, `CSOUND` included. A csound that is named but
// cannot run — a stale path, or `csound-ssh.mjs` pointed at a machine that is
// asleep — would otherwise return zero events for every case, and a whole suite
// of "EVENT COUNT DIFFERS" reads like a compiler that has fallen over rather
// than like a reference nobody could reach.
function csoundPath() {
  const tried = process.env.CSOUND
    ? [process.env.CSOUND]
    : ['csound', '/opt/homebrew/bin/csound', '/usr/local/bin/csound'];
  for (const p of tried) {
    try { execFileSync(p, ['--version'], { stdio: 'ignore' }); return p; } catch { /* try next */ }
  }
  return null;
}

const bin = csoundPath();
if (!bin) {
  console.log(`\ncsound oracle — SKIPPED: ${process.env.CSOUND
    ? `CSOUND=${process.env.CSOUND} did not answer \`--version\`.`
    : 'no `csound` on PATH.'}`);
  console.log('  This is the only check that can catch a MISREADING of the score format;');
  console.log('  csound-test.mjs compares the compiler against its own formula.');
  console.log('  `brew install csound`, or set CSOUND=/path/to/csound.');
  console.log('  A csound on another machine works too — see timeline/lab/csound-ssh.mjs.');
  process.exit(0);
}

const dir = mkdtempSync(join(tmpdir(), 'csound-oracle-'));
writeFileSync(join(dir, 't.orc'), ORC);

// csound writes `prints` output to STDERR, not stdout — which cost a run,
// because execFileSync returns only stdout unless the process throws, so every
// case read back as "csound produced 0 events" and looked like a finding.
// spawnSync hands over both streams whatever the exit code.
function run(bin2, args) {
  const r = spawnSync(bin2, args, { encoding: 'utf8' });
  return `${r.stdout || ''}${r.stderr || ''}`;
}

/**
 * Csound's own answer for a score, in performance order:
 *   at, dur  — SECTION-LOCAL seconds, exact
 *   p4       — the fourth p-field, which is where the carry rules show
 *   abs      — the absolute clock, quantised to one k-period
 */
function reference(score) {
  const f = join(dir, 'case.sco');
  writeFileSync(f, `${score}\ne\n`);
  return strip(run(bin, ['-n', '-d', join(dir, 't.orc'), f]))
    .split('\n')
    .filter((l) => l.startsWith('EVT'))
    .map((l) => {
      const c = l.split(/\s+/);
      return { at: +c[2], dur: +c[3], abs: +c[4], p4: +c[5] };
    })
    .sort((a, b) => a.abs - b.abs);
}

/** The same four numbers from our compiler, read the same way round. */
function ours(score) {
  const c = compileCsound(score);
  return {
    sections: c.sections.length,
    rows: c.items.map((it) => {
      const sec = c.sections[it.payload.section];
      return {
        at: sec.tempo.secondsAt(it.payload.sectionBeat),
        dur: (it.payload.durMs || 0) / 1000,
        abs: it.at / 1000,
        p4: Number(it.payload.p[3] ?? 0),
      };
    }).sort((a, b) => a.abs - b.abs),
  };
}

let pass = 0; let fail = 0; let open = 0;

function check(label, score, isKnownOpen) {
  const want = reference(score);
  const got = ours(score);
  const sameShape = want.length === got.rows.length;
  // The absolute clock is rounded UP to a k-boundary once per section and once
  // per event, so the slack is a k-period per section crossed. Everything else
  // is exact.
  const tolAbs = (got.sections + 1) * KPERIOD;
  let worst = { at: 0, dur: 0, abs: 0, p4: 0 };
  if (sameShape) {
    for (let i = 0; i < want.length; i++) {
      for (const k of ['at', 'dur', 'abs', 'p4']) {
        worst[k] = Math.max(worst[k], Math.abs(want[i][k] - got.rows[i][k]));
      }
    }
  }
  const green = sameShape && worst.at < 1e-9 && worst.dur < 1e-9 && worst.p4 < 1e-9
    && worst.abs <= tolAbs;
  const detail = sameShape
    ? `${want.length} events · in-section ${(worst.at * 1000).toFixed(3)} ms, `
      + `dur ${(worst.dur * 1000).toFixed(3)} ms, clock ${(worst.abs * 1000).toFixed(3)} ms`
      + `${worst.p4 ? `, p4 off by ${worst.p4}` : ''}`
    : `EVENT COUNT DIFFERS — csound ${want.length}, ours ${got.rows.length}`;

  if (isKnownOpen) {
    open++;
    console.log(`  ${green ? 'ok  ' : 'OPEN'} ${label}  — ${detail}`);
    return;
  }
  if (green) { pass++; console.log(`  ok   ${label}  — ${detail}`); return; }
  fail++;
  console.log(`  FAIL ${label}  — ${detail}`);
  want.forEach((w, i) => {
    const g = got.rows[i];
    if (!g || Math.abs(w.abs - g.abs) > tolAbs || Math.abs(w.at - g.at) > 1e-9
      || Math.abs(w.dur - g.dur) > 1e-9 || Math.abs(w.p4 - g.p4) > 1e-9) {
      console.log(`        [${i}] csound  in-section ${w.at.toFixed(9)} dur ${w.dur.toFixed(9)}`
        + ` clock ${w.abs.toFixed(9)} p4 ${w.p4}`);
      console.log(`             ours    in-section ${g ? g.at.toFixed(9) : '(missing)'}`
        + `${g ? ` dur ${g.dur.toFixed(9)} clock ${g.abs.toFixed(9)} p4 ${g.p4}` : ''}`);
    }
  });
}

const version = strip(run(bin, ['--version'])).match(/Csound version [^\n]*/)?.[0] || bin;
console.log(`\ncsound oracle — our compiler against ${version.trim()}`);
console.log(`  in-section times are exact; the absolute clock is good to ${(KPERIOD * 1000).toFixed(3)} ms`
  + ' per section, which is where csound starts one.');
for (const [label, score] of CASES) check(label, score, false);
for (const [label, score] of KNOWN_OPEN) check(label, score, true);
rmSync(dir, { recursive: true, force: true });

console.log(`\n${pass}/${pass + fail} green${open ? `  · ${open} known-open divergence${open === 1 ? '' : 's'} reported` : ''}`);
process.exit(fail ? 1 : 0);
