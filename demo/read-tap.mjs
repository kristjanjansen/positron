#!/usr/bin/env node
// node demo/read-tap.mjs [--raw | --clear]: what /dump/ posted to the dev server's /_tap
// (.tap/midi.jsonl), decoded with the page's own midi-decode.mjs. Dev server only.
// why: lessons/harness.md#read-tap

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { classifyEncoder, classifyBend, ccName, noteName } from './shell/midi-decode.mjs';

const FILE = new URL('../.tap/midi.jsonl', import.meta.url);
const arg = process.argv.slice(2);

if (arg.includes('--clear')) {
  writeFileSync(FILE, '');
  console.log('capture cleared. Press something.');
  process.exit(0);
}
if (!existsSync(FILE)) {
  console.log('nothing captured yet. Is `node demo/server.mjs` running and /dump/ open?');
  process.exit(0);
}

const rows = [];
for (const line of readFileSync(FILE, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  // A half-written last line is normal while the page appends; skip it.
  // why: lessons/harness.md#half-line
  try { rows.push(...(JSON.parse(line).rows || [])); } catch { /* still arriving */ }
}
if (!rows.length) { console.log('the file is there and holds nothing.'); process.exit(0); }

if (arg.includes('--raw')) {
  for (const r of rows) console.log(`${String(r.from).padEnd(28)} ${r.bytes}`);
  console.log(`\n${rows.length} messages`);
  process.exit(0);
}

// One bucket per (port, channel, what), which is what a control IS.
const by = new Map();
for (const r of rows) {
  const b = r.bytes.split(' ').map((h) => parseInt(h, 16));
  const st = b[0] & 0xf0;
  const what = st === 0xb0 ? `CC ${b[1]}` : st === 0x90 ? 'note on' : st === 0x80 ? 'note off'
    : st === 0xe0 ? 'pitch bend' : st === 0xc0 ? 'program' : st === 0xd0 ? 'ch touch'
    : st === 0xa0 ? 'poly touch' : b[0] >= 0xf0 ? `system 0x${b[0].toString(16)}` : '?';
  const key = `${r.from} ${r.ch ?? '-'} ${what}`;
  const e = by.get(key) || { port: r.from, ch: r.ch, what, n: 0, d1: new Set(), vals: [], msgs: [] };
  e.n++;
  if (b[0] < 0xf0) { e.d1.add(b[1]); if (b[2] !== undefined) e.vals.push(b[2]); }
  e.msgs.push(b);
  by.set(key, e);
}

const W = [28, 4, 12, 7, 34];
const line = (c) => c.map((s, i) => String(s).slice(0, W[i]).padEnd(W[i])).join(' ');
const rule = () => line(W.map((w) => '-'.repeat(w)));

console.log('');
console.log(line(['port', 'ch', 'what', 'count', 'by convention, NOT what it does']));
console.log(rule());
for (const e of [...by.values()].sort((a, b) => b.n - a.n)) {
  const cc = Number(e.what.match(/CC (\d+)/)?.[1] ?? NaN);
  console.log(line([e.port, e.ch ?? '-', e.what, e.n,
    Number.isNaN(cc) ? '' : (ccName(cc) || 'no standard meaning')]));
}

// Verdicts go under the table, not in a column: they carry reasoning and counts.
// why: lessons/harness.md#verdicts
console.log('');
console.log('what each control IS');
console.log(rule());
for (const e of [...by.values()].sort((a, b) => b.n - a.n)) {
  const head = `${e.port} ch${e.ch ?? '-'} ${e.what}`;
  if (e.what.startsWith('CC ') && e.vals.length) {
    const v = classifyEncoder(e.vals);
    console.log(`${head}\n    ${v.verdict.toUpperCase()} — ${v.why}`);
  } else if (e.what === 'pitch bend') {
    const v = classifyBend(e.msgs);
    console.log(`${head}\n    ${v.bits ? `${v.bits} BIT` : 'NO VERDICT'} — ${v.why}`
      + (v.positions ? `, ${v.positions} positions seen` : ''));
  } else if (e.what.startsWith('note')) {
    const ns = [...e.d1].sort((a, b) => a - b);
    console.log(`${head}\n    notes ${ns.slice(0, 10).map((n) => `${n} (${noteName(n)})`).join(', ')}`
      + (ns.length > 10 ? ` and ${ns.length - 10} more` : ''));
  }
}

console.log(`\n${rows.length} messages, ${by.size} distinct controls`);
