#!/usr/bin/env node
// timeline/lab/csound-real.mjs — our compiler against the reference, on
// SOMEBODY ELSE'S REAL SCORES.
//
//   node timeline/lab/csound-real.mjs <score.sco> [<score.sco> …]
//   SCSORT_HOST=mbp SCSORT_BIN=/opt/homebrew/bin/scsort node … 
//
// WHY THIS AND NOT `csound-oracle.mjs`. The oracle grades SEMANTICS against
// cases we wrote: each one is a question about the format, and the score exists
// to ask it. This grades a file a composer wrote for a performance, where
// nobody chose what it would exercise. Those catch different things — 42/42
// green here meant nothing while both of the only two real scores in existence
// THREW at line 12.
//
// 🔴 THE REFERENCE IS `scsort`, NOT `csound`, AND IT IS A BETTER ONE. It is the
// score preprocessor on its own: it reads a score and prints it sorted and
// tempo-warped, with NO orchestra, no audio and no `prints` to filter ANSI
// escapes out of. With a `w` (warp) statement in force it writes p2 and p3 each
// as a PAIR — beats first, then seconds — so one run grades the beat arithmetic
// and the tempo map separately, which the orchestra trick cannot do.
//
// ⚠️ AND IT READS STDIN ONLY. MEASURED 2026-09-14: `scsort file.sco` with stdin
// closed prints `f0 800000000000.0 / e` — an EMPTY SCORE, not an error. So
// calling it the obvious way reports that the composer's score has no notes in
// it. That is why this file does not reuse `csound-ssh.mjs`, which ships its
// arguments as files.

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { compileCsound } from '../csound.mjs';

// 🔴 THE REFERENCE IS PLAIN `csound`, NOT `scsort`, AND THE DIFFERENCE MATTERS.
// `scsort` is the obvious tool and it is a Homebrew-only artefact: Debian's
// csound package ships `cs`, `csbeats`, `csdebugger` and `csound` and NOTHING
// else, so a check built on it cannot run on the Raspberry Pi — the machine that
// is actually always on. MEASURED 2026-09-14: `csound -n -t 0 <orc> <sco>`
// writes the same sorted score to `score.srt` in the working directory, and the
// two outputs are identical on both machines.
//
// ⚠️ `-n` is no audio, so this is a compiler comparison and never a render.
const HOST = process.env.CSOUND_HOST || 'positron@192.168.1.213';
const BIN = process.env.CSOUND_BIN || 'csound';

// An orchestra is required even though nothing is rendered. Sorting happens
// before performance, so an `i` naming an instrument this file does not declare
// still sorts — which is what lets a real score full of `i "countdown"` be
// graded without reimplementing the composer's orchestra.
const ORC_B64 = Buffer.from(
  ['sr=44100', 'ksmps=128', 'nchnls=1', '0dbfs=1', 'instr 1', 'endin', ''].join('\n'),
  'utf8').toString('base64');

function sortedScore(text) {
  // ⚠️ THE SCORE TRAVELS INSIDE THE SCRIPT, base64, NOT ON STDIN. A remote shell
  // reads its own script from stdin, so a `cat > a.sco` inside it consumes the
  // script rather than the score — and csound then sorts an empty file and
  // prints a score with no notes in it. This exact collision produced the first
  // run of this harness: two real scores, '0 events' each, no error anywhere.
  const b64 = Buffer.from(text, 'utf8').toString('base64');
  const script = [
    'D=/var/folders/b2/thzz8sln00l74dgk6vtnfhjm0000gn/T/tmp.OZ0H2UGQ9c',
    'cd "\"',
    `printf %s '${ORC_B64}' | base64 -d > a.orc`,
    `printf %s '${b64}' | base64 -d > a.sco`,
    `${BIN} -n -t 0 a.orc a.sco >/dev/null 2>&1`,
    'cat score.srt 2>/dev/null',
    'cd /; rm -rf "\"',
  ].join('\n');
  const local = spawnSync('sh', ['-c', 'command -v csound'], { encoding: 'utf8' });
  const r = local.status === 0
    ? spawnSync('sh', ['-s'], { input: script, encoding: 'utf8' })
    : spawnSync('ssh', ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=8', HOST, 'sh -s'],
      { input: script, encoding: 'utf8' });
  if (r.error || r.status === 255) return null;
  return r.stdout || '';
}

// 🔴 A PROBE THAT ACCEPTS EMPTY OUTPUT IS NOT A PROBE. The first version of this
// file treated any non-null answer as "the reference is available", so a wrong
// binary path — `/usr/bin/scsort`, which does not exist on the Pi — reported
// "0 events" for both of the composer's scores and read as a compiler that
// emits nothing. Require a row that could only come from a working reference.
function referenceWorks() {
  const out = sortedScore('t 0 120\ni 1 2 1 100\ne\n');
  return out !== null && /^i\s/m.test(out);
}

/**
 * Read scsort's sorted score.
 *
 * ⚠️ Numbers come back as C99 HEX FLOATS (`0x1.8p+1`), which `Number()` does
 * not parse and `parseFloat` reads as 0 — silently, and 0 is a plausible beat.
 */
function hex(s) {
  if (!/^[+-]?0x/i.test(s)) return Number(s);
  const m = /^([+-]?)0x([0-9a-f]*)(?:\.([0-9a-f]*))?p([+-]?\d+)$/i.exec(s);
  if (!m) return NaN;
  const sign = m[1] === '-' ? -1 : 1;
  let mant = parseInt(m[2] || '0', 16);
  const frac = m[3] || '';
  for (let k = 0; k < frac.length; k++) mant += parseInt(frac[k], 16) / 16 ** (k + 1);
  return sign * mant * 2 ** Number(m[4]);
}

function readSorted(out) {
  const sections = [];
  let cur = { warped: false, rows: [] };
  for (const raw of String(out).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('w ')) { cur.warped = true; continue; }
    if (line === 'e' || line.startsWith('s')) {
      if (cur.rows.length) sections.push(cur);
      cur = { warped: false, rows: [] };
      continue;
    }
    if (!line.startsWith('i')) continue;
    const f = line.split(/\s+/).slice(1);
    // with a warp in force each of p2 and p3 is (beats, seconds)
    const row = cur.warped
      ? { p1: f[0], beat: hex(f[1]), sec: hex(f[2]), durBeats: hex(f[3]), durSec: hex(f[4]), rest: f.slice(5) }
      : { p1: f[0], beat: hex(f[1]), sec: hex(f[1]), durBeats: hex(f[2]), durSec: hex(f[2]), rest: f.slice(3) };
    cur.rows.push(row);
  }
  if (cur.rows.length) sections.push(cur);
  return sections;
}

// ⚠️ TWO STATEMENTS AT THE SAME BEAT ARE NOT IN A DEFINED ORDER, and neither
// side is claiming one — csound sorts by time and so do we, and a tie keeps
// whatever order the file had. Comparing them needs a tiebreak BOTH sides can
// apply, or every tie pairs the wrong rows and reports itself as a defect.
const name = (r) => String(r.p1).replace(/"/g, '');
const byPlace = (a, b) => a.section - b.section || a.beat - b.beat
  || name(a).localeCompare(name(b));

const files = process.argv.slice(2);
if (!files.length) {
  console.log('usage: node timeline/lab/csound-real.mjs <score.sco> […]');
  process.exit(2);
}

if (!referenceWorks()) {
  console.log(`SKIPPED: no csound here and ${HOST} is not answering`);
  process.exit(0);                 // a check nobody can run is a check nobody runs
}

let pass = 0, fail = 0;
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  console.log(`\n=== ${file} ===`);

  let mine;
  try { mine = compileCsound(text); }
  catch (e) { console.log(`  THREW: ${e.message}`); fail++; continue; }

  const ref = readSorted(sortedScore(text));
  const refRows = ref.flatMap((s) => s.rows);
  // ours, section-local, in the order csound sorts them (by time within section)
  const mineRows = mine.items.map((it) => ({
    p1: String(it.payload.instr),
    beat: it.payload.sectionBeat,
    ms: it.at - mine.sections[it.payload.section].startMs,
    section: it.payload.section,
    p: it.payload.p,
  })).sort(byPlace);
  const refSorted = ref.flatMap((s, i) => s.rows.map((r) => ({ ...r, section: i })))
    .sort(byPlace);

  if (refRows.length !== mine.items.length) {
    console.log(`  EVENT COUNT DIFFERS — scsort ${refRows.length}, ours ${mine.items.length}`);
    fail++;
    continue;
  }

  // 🔴 THE P-FIELDS HAVE TO BE COMPARED TOO, AND THIS IS NOT A NICETY.
  // `test.sco` puts its score expressions in p4 and p5 — `[8/3]` as a beat
  // count, `[16/3]` as a note value — and NOWHERE in p2 or p3. A check that
  // grades only onset and duration is therefore blind in exactly the place the
  // composer actually used the feature: measured, with bracket evaluation
  // switched off this file still read 2/2 green.
  // ⚠️ Compare the OVERLAPPING prefix only. csound writes a trailing 0 after
  // some string p-fields and not others, and padding it back is inventing a
  // rule; a length difference is reported and does not fail.
  let worstBeat = 0, worstMs = 0, wrongInstr = 0, wrongP = 0, lenDiff = 0;
  for (let k = 0; k < refSorted.length; k++) {
    const r = refSorted[k], m = mineRows[k];
    // 🔴 A named instrument is `"countdown"` on one side and countdown on the
    // other; compare unquoted, or every string row reads as a mismatch and the
    // real ones get lost in them.
    if (String(r.p1).replace(/"/g, '') !== String(m.p1).replace(/"/g, '')) wrongInstr++;
    worstBeat = Math.max(worstBeat, Math.abs(r.beat - m.beat));
    worstMs = Math.max(worstMs, Math.abs(r.sec * 1000 - m.ms));
    const rp = r.rest, mp = m.p.slice(3);
    if (rp.length !== mp.length) lenDiff++;
    for (let q = 0; q < Math.min(rp.length, mp.length); q++) {
      const a = hex(rp[q]), b = Number(mp[q]);
      const both = Number.isFinite(a) && Number.isFinite(b);
      if (both ? Math.abs(a - b) > 1e-9
        : String(rp[q]).replace(/"/g, '') !== String(mp[q]).replace(/"/g, '')) {
        if (process.env.SHOW) console.log('      p' + (q + 4), JSON.stringify(rp[q]), 'vs', JSON.stringify(mp[q]));
        wrongP++;
      }
    }
  }
  const ok = worstBeat < 1e-6 && worstMs < 0.5 && !wrongInstr && !wrongP;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${refRows.length} events · worst beat `
    + `${worstBeat.toFixed(9)} · worst time ${worstMs.toFixed(3)} ms`
    + (wrongInstr ? ` · ${wrongInstr} instrument name(s) differ` : '')
    + (wrongP ? ` · ${wrongP} p-field(s) differ` : '')
    + (lenDiff ? ` · ${lenDiff} row(s) differ in p-field COUNT (reported, not failed)` : ''));
  if (mine.warnings.length) for (const w of mine.warnings) console.log(`        warning: ${w}`);
  ok ? pass++ : fail++;
}

console.log(`\n${pass}/${pass + fail} real scores agree with scsort`);
process.exit(fail ? 1 : 0);
