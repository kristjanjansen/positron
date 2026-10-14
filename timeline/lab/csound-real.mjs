#!/usr/bin/env node
// node timeline/lab/csound-real.mjs <score.sco> ...: our compiler against the reference on real
// composers' scores, which exercise what nobody chose (both real vClick scores once threw at line
// 12).
// why: lessons/timeline-lab.md#cr-header

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { compileCsound } from '../csound.mjs';

// The reference is `csound -n -t 0 <orc> <sco>`, which writes score.srt (Debian ships no scsort).
// Remote via CSOUND_HOST or PI_HOST=<user>@<pi>; with neither and no local csound, it skips.
// why: lessons/timeline-lab.md#cr-reference
const HOST = process.env.CSOUND_HOST || process.env.PI_HOST || '';
const BIN = process.env.CSOUND_BIN || 'csound';

// An orchestra is required though nothing renders; unknown instruments still sort.
// why: lessons/timeline-lab.md#cr-orc
const ORC_B64 = Buffer.from(
  ['sr=44100', 'ksmps=128', 'nchnls=1', '0dbfs=1', 'instr 1', 'endin', ''].join('\n'),
  'utf8').toString('base64');

function sortedScore(text) {
  // The score travels base64 inside the script: `sh -s` reads its script from stdin.
  // why: lessons/timeline-lab.md#cr-b64
  const b64 = Buffer.from(text, 'utf8').toString('base64');
  const script = [
    'D=$(mktemp -d)',
    'cd "$D"',
    `printf %s '${ORC_B64}' | base64 -d > a.orc`,
    `printf %s '${b64}' | base64 -d > a.sco`,
    `${BIN} -n -t 0 a.orc a.sco >/dev/null 2>&1`,
    'cat score.srt 2>/dev/null',
    'cd /; rm -rf "$D"',
  ].join('\n');
  const local = spawnSync('sh', ['-c', 'command -v csound'], { encoding: 'utf8' });
  const r = local.status === 0
    ? spawnSync('sh', ['-s'], { input: script, encoding: 'utf8' })
    : !HOST ? { status: 255 }
    : spawnSync('ssh', ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=8', HOST, 'sh -s'],
      { input: script, encoding: 'utf8' });
  if (r.error || r.status === 255) return null;
  return r.stdout || '';
}

// The probe needs a row only a working reference could print; empty output is not "available".
// why: lessons/timeline-lab.md#cr-probe
function referenceWorks() {
  const out = sortedScore('t 0 120\ni 1 2 1 100\ne\n');
  return out !== null && /^i\s/m.test(out);
}

// Numbers are C99 hex floats (`0x1.8p+1`): Number() rejects them and parseFloat reads 0.
// why: lessons/timeline-lab.md#cr-hex
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

// Same-beat statements have no defined order, so both sides get one tiebreak.
// why: lessons/timeline-lab.md#cr-ties
const name = (r) => String(r.p1).replace(/"/g, '');
const byPlace = (a, b) => a.section - b.section || a.beat - b.beat
  || name(a).localeCompare(name(b));

const files = process.argv.slice(2);
if (!files.length) {
  console.log('usage: node timeline/lab/csound-real.mjs <score.sco> […]');
  process.exit(2);
}

if (!referenceWorks()) {
  console.log(HOST ? `SKIPPED: no csound here and ${HOST} is not answering`
    : 'SKIPPED: no csound here and no Pi named. Set PI_HOST=<user>@<pi> (or CSOUND_HOST) to use one.');
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

  // Compare p-fields too (the real scores use brackets only in p4 and p5), over the overlapping
  // prefix;
  // a length difference is reported, not failed.
  // why: lessons/timeline-lab.md#cr-pfields
  let worstBeat = 0, worstMs = 0, wrongInstr = 0, wrongP = 0, lenDiff = 0;
  for (let k = 0; k < refSorted.length; k++) {
    const r = refSorted[k], m = mineRows[k];
    // Compare instrument names unquoted.
    // why: lessons/timeline-lab.md#cr-unquoted
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
