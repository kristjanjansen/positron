// rig/route-core/vectors-to-lines.mjs: the route vectors as numbered lines a C
// runner can read with `fgets` and `strtol`, so the core never meets JSON.
//
//   node rig/route-core/vectors-to-lines.mjs > lines.txt
//
// This is L2's job from `plans/plan-route-core.md` §7, done the dumb way: a
// port name becomes its index, a link id becomes a number, an op name becomes
// its opcode, a kind becomes its bit. 🔴 IT RESOLVES NAMES AND NOTHING ELSE. It
// never checks a range, a direction or a cycle, because then the C would be
// graded on what this file already refused. An op it does not know is written
// as opcode 255, a value that is not an integer as `?`, a port nobody declared
// as 255, and the C is left to refuse each of them.
//
// ⚠️ THE NUMBERS MUST MEAN WHAT `route_core.h` SAYS. The op and kind lists below
// are checked against `route-core.mjs` and `midi-kinds.mjs` on every run, and a
// drift exits 1 before a line is written.
//
// ⚠️ ONE PLACE THIS IS NOT A COPY OF THE JS: a policy key is read through
// `canonKind`, so `{ pitchbend: 'deny' }` means bend. The JS looks the key up
// verbatim and silently ignores the older spelling. No vector uses one.
//
// The format, one record a line, fields split by spaces:
//   V file name...                       a vector starts
//   P index name dir accepts v0..v7      a port; verbs 0 allow 1 confirm 2 deny 3 unset
//   R port verb len b0 b1 ...            a rule on that port; `xx` is any byte
//   L id from to nops (code a0..a4)*     a link to make; `-` absent, `?` not an integer
//   I port t hex...                      an input
//   U id t | C port t | D port           unlink, confirm, deny
//   X id code                            an expected refusal, code as in route_status
//   O port t hex...                      an expected output
//   H port n                             expected held at the end
//   E                                    the vector ends

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { OP_NAMES, REFUSALS } from '../../demo/shell/route-core.mjs';
import { KINDS, canonKind } from '../../demo/shell/midi-kinds.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIR = join(HERE, '../../demo/shell/route-vectors');

// route_core.h's route_opcode, and which authored field goes in which slot.
const ARGS = {
  channel: ['to', 'from'], transpose: ['by'], velocity: ['scale'], only: ['cls'], drop: ['cls'],
  range: ['lo', 'hi'], vrange: ['lo', 'hi'], fixed: ['to'], cc: ['from', 'to', 'ch'],
  scale: ['lo', 'hi', 'lo2', 'hi2', 'cc'], toggle: ['note', 'cc', 'on', 'off'], thin: ['hz'],
};
const OPCODES = Object.keys(ARGS);
const C_KINDS = ['note', 'cc', 'bend', 'touch', 'program', 'clock', 'transport', 'sysex'];

if (JSON.stringify(OPCODES) !== JSON.stringify(OP_NAMES) || JSON.stringify(C_KINDS) !== JSON.stringify(KINDS)) {
  console.error(`vectors-to-lines: the vocabulary moved. JS ops ${OP_NAMES.join(',')} kinds ${KINDS.join(',')}; route_core.h has ops ${OPCODES.join(',')} kinds ${C_KINDS.join(',')}`);
  process.exit(1);
}

const VERB = { allow: 0, confirm: 1, deny: 2 };
const DIR_CODE = { in: 1, out: 2, both: 3 };
const ABSENT = '-', INVALID = '?';

const int32 = (v) => (Number.isInteger(v) && Math.abs(v) < 2 ** 31 - 2 ? String(v) : INVALID);
function arg(op, field, v) {
  if (v === undefined) return ABSENT;
  if (field === 'cls') { const k = canonKind(v); return k === null ? INVALID : String(KINDS.indexOf(k)); }
  // ⚠️ velocity's scale is a fraction. The C takes it in THOUSANDTHS, so 0.5 is
  // 500, a scale finer than 1/2000 rounds to 0 and is refused where the JS takes
  // it, and a fourth decimal is lost. Why thousandths: `route_core.c`, the op.
  if (op === 'velocity' && field === 'scale') return typeof v === 'number' ? int32(Math.round(v * 1000)) : INVALID;
  return int32(v);
}

const hex = (s) => String(s).trim().split(/\s+/).filter(Boolean).map((h) => h.toUpperCase()).join(' ');

const index = JSON.parse(readFileSync(join(DIR, 'index.json'), 'utf8'));
const out = [];
for (const file of index) {
  const v = JSON.parse(readFileSync(join(DIR, file), 'utf8'));
  const portIx = new Map(v.ports.map((p, i) => [p.id, i]));
  const P = (name) => (portIx.has(name) ? portIx.get(name) : 255);
  const linkIx = new Map();
  const L = (id) => { if (!linkIx.has(id)) linkIx.set(id, linkIx.size); return linkIx.get(id); };

  out.push(`V ${file} ${v.name}`);
  v.ports.forEach((p, i) => {
    let accepts = 255;
    if (p.accepts) {
      accepts = 0;
      for (const k of p.accepts) accepts |= canonKind(k) === null ? 1 << 15 : 1 << KINDS.indexOf(canonKind(k));
    }
    const pol = KINDS.map(() => 3);
    for (const [k, verb] of Object.entries(p.policy || {})) {
      const ck = canonKind(k);
      if (ck !== null) pol[KINDS.indexOf(ck)] = VERB[verb] ?? 9;
    }
    out.push(`P ${i} ${p.id} ${DIR_CODE[p.dir] ?? 0} ${accepts} ${pol.join(' ')}`);
    for (const r of p.rules || []) {
      const m = String(r.match).trim().split(/\s+/);
      out.push(`R ${i} ${VERB[r.do] ?? 9} ${m.length} ${m.join(' ')}`);
    }
  });
  for (const l of v.links) {
    const ops = (l.ops || []).map((o) => {
      const code = OPCODES.indexOf(o.op);
      const fields = ARGS[o.op] || [];
      const a = [0, 1, 2, 3, 4].map((i) => (fields[i] ? arg(o.op, fields[i], o[fields[i]]) : ABSENT));
      return `${code < 0 ? 255 : code} ${a.join(' ')}`;
    });
    out.push(`L ${L(l.id)} ${P(l.from)} ${P(l.to)} ${ops.length}${ops.length ? ' ' + ops.join(' ') : ''}`);
  }
  for (const s of v.in) {
    const t = s.t ?? 0;
    if (s.unlink !== undefined) out.push(`U ${L(s.unlink)} ${t}`);
    else if (s.confirm !== undefined) out.push(`C ${P(s.confirm)} ${t}`);
    else if (s.deny !== undefined) out.push(`D ${P(s.deny)}`);
    else out.push(`I ${P(s.port)} ${t} ${hex(s.bytes)}`);
  }
  for (const r of v.refused || []) out.push(`X ${L(r.link)} ${REFUSALS.indexOf(r.reason) + 1}`);
  for (const e of v.out) out.push(`O ${P(e.port)} ${e.t ?? 0} ${hex(e.bytes)}`);
  for (const [k, n] of Object.entries(v.held || {})) out.push(`H ${P(k)} ${n}`);
  out.push('E');
}
process.stdout.write(out.join('\n') + '\n');
