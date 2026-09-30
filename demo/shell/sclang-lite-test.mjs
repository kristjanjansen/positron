// demo/shell/sclang-lite-test.mjs: the SuperCollider subset, with no browser.
//
//   node demo/shell/sclang-lite-test.mjs
//
// 🔴 WHAT THIS CAN AND CANNOT GRADE. It reads every compile back through
// `readSynthDef`, which is a SEPARATE pass over the bytes, and compares the
// graph it finds against numbers written out by hand from SuperCollider's own
// class files. That grades the structure: which block, which input, which
// constant, which operator index. It CANNOT say the bytes play. There is no
// scsynth on this machine and SuperSonic needs an AudioWorklet, so the engine
// half is graded on `/collide/` under `?selfcheck=1`: `/d_recv` answered
// `/done` and a non-silent output, beside a meter reading zero with nothing
// playing. A green run here with a red page means the file is well formed and
// wrong, which is exactly the case this file cannot see.
//
// 🔴 A NAMED PROPORTION OF THESE ARE NEGATIVE CONTROLS, per the convention in
// this directory: each is written so the defect it names would fail it. They
// are marked `NEGATIVE CONTROL` and they were PROVED by sabotaging the module,
// not argued. `SCL_MODULE=<path>` runs this file against another copy of the
// compiler, which is how the sabotaged copies were graded without touching the
// real one. MEASURED 2026-09-30, 50 ok on the real module, then eight
// sabotaged copies:
//
//   operators read right to left (so 1 + 2 * 3 is 7)       49/50, precedence
//   keywords bound by position                              42/50, eight red
//   `*` written as opcode 0, which ADDS                     48/50, both mul checks
//   Env.adsr without its release node                       49/50, the adsr array
//   one channel sent to the left speaker only              49/50, the Out check
//   the filter rate rule removed                            48/50, both filter refusals
//   the wire ceiling not checked                            49/50, the 65 refusal
//   an unknown keyword dropped instead of refused           49/50, `mull:`
//
// ⚠️ WHAT NONE OF THEM CAN SEE: whether scsynth agrees. Opcode 0 for `*` is a
// well formed file that loads and plays, louder; only the page's own meter
// under a changed `amp` can tell a multiply from an add
// (`research/supercollider-browser-2026-09.md` §9.3b measured exactly that).

import { readSynthDef, sameBytes } from './synthdef.mjs';
import { PRESETS } from '../collide/presets.mjs';

const M = await import(process.env.SCL_MODULE || './sclang-lite.mjs');
const { compile, WIRE_CEILING } = M;

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? `  (${detail})` : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? `  (${detail})` : ''}`); }
};

/** Compile, read the bytes back, and hand over the one definition. */
function def(src) {
  const r = compile(src);
  if (!r.ok) return { r, d: null };
  const d = readSynthDef(r.bytes).defs[0];
  return { r, d };
}
/** An input's value: a constant's number, or `block:out` for a wire. */
const inp = (d, i) => (i.from === -1 ? d.constants[i.out] : `${d.blocks[i.from].name}:${i.out}`);
const ins = (d, b) => b.inputs.map((i) => inp(d, i));
const byName = (d, n) => d.blocks.filter((b) => b.name === n);
const close = (a, b) => Math.abs(a - b) < 1e-5;
const f32 = (x) => Math.fround(x);

// ── the presets the page ships ────────────────────────────────────────────────

for (const p of PRESETS) {
  const { r, d } = def(p.code);
  ok(`the ${p.label} preset compiles, and reads back as version 2 to the byte`,
    r.ok && readSynthDef(r.bytes).version === 2 && d.name === 'collide',
    r.ok ? `${r.bytes.length} B, ${r.blocks} blocks, ${r.channels} channel${r.channels > 1 ? 's' : ''}` : r.message);
}
{
  const pad = def(PRESETS[0].code);
  ok('the Pad is two channels because its freq is multiplied by a two element array',
    pad.r.ok && byName(pad.d, 'Saw').length === 2 && byName(pad.d, 'LPF').length === 2 && pad.r.channels === 2,
    `${byName(pad.d, 'Saw').length} Saw, ${byName(pad.d, 'LPF').length} LPF`);
  const hat = def(PRESETS[2].code);
  const out = byName(hat.d, 'Out')[0];
  ok('the Hat reaches the speakers through Pan2, output 0 left and output 1 right',
    ins(hat.d, out).join(' ') === '0 Pan2:0 Pan2:1', ins(hat.d, out).join(' '));
}

// ── the language, against numbers read off SuperCollider's class files ────────

{
  const { d } = def('{ SinOsc.ar(1 + 2 * 3) }');
  const s = byName(d, 'SinOsc')[0];
  ok('NEGATIVE CONTROL: operators run left to right with no precedence, so 1 + 2 * 3 is 9',
    s && inp(d, s.inputs[0]) === 9, s ? `freq ${inp(d, s.inputs[0])}` : 'no SinOsc');
}
{
  const { d } = def('{ |freq = 440, amp = 0.1| SinOsc.ar(freq, mul: amp) }');
  const s = byName(d, 'SinOsc')[0];
  const m = byName(d, 'BinaryOpUGen');
  ok('NEGATIVE CONTROL: a keyword argument lands on its name, so mul: multiplies and the phase keeps its default of 0',
    s && ins(d, s).join(' ') === 'Control:0 0' && m.length === 1 && m[0].special === 2
      && ins(d, m[0]).join(' ') === 'SinOsc:0 Control:1',
    `SinOsc(${s ? ins(d, s).join(', ') : ''}), ${m.map((b) => `op ${b.special}(${ins(d, b).join(', ')})`).join(' ')}`);
  const pos = compile('{ |freq = 440, amp = 0.1| SinOsc.ar(freq, 0, amp) }');
  const key = compile('{ |freq = 440, amp = 0.1| SinOsc.ar(freq, mul: amp) }');
  ok('and the same call written positionally is the same file, byte for byte',
    pos.ok && key.ok && sameBytes(pos.bytes, key.bytes), `${pos.bytes?.length} B and ${key.bytes?.length} B`);
}
{
  const { d } = def('{ SinOsc.ar(300, mul: 0.2, add: 0.1) }');
  const ops = byName(d, 'BinaryOpUGen').map((b) => `${b.special}:${ins(d, b).join(',')}`);
  ok('mul and add become a multiply then an add, the operator indices from BinaryOpUGens.cpp',
    ops.join(' ') === `2:SinOsc:0,${f32(0.2)} 0:BinaryOpUGen:0,${f32(0.1)}`, ops.join(' '));
}
{
  const a = def('{ SinOsc.ar * 1 }'), b = def('{ 0 + SinOsc.ar(200) }');
  ok('sclang folds x * 1 and 0 + x away, and so does this, from BinaryOpUGen.new1',
    byName(a.d, 'BinaryOpUGen').length === 0 && byName(b.d, 'BinaryOpUGen').length === 0);
  const n = def('{ 0 - SinOsc.ar }');
  ok('and 0 - x is x.neg, a UnaryOpUGen with index 0',
    byName(n.d, 'UnaryOpUGen').length === 1 && byName(n.d, 'UnaryOpUGen')[0].special === 0);
}
{
  const { d } = def('{ SinOsc.ar(69.midicps, 2pi) }');
  const s = byName(d, 'SinOsc')[0];
  ok('69.midicps is folded to 440 and 2pi to 6.283, the way sclang does arithmetic on numbers',
    close(inp(d, s.inputs[0]), 440) && close(inp(d, s.inputs[1]), f32(2 * Math.PI)), ins(d, s).join(', '));
}
{
  const { d } = def('{ |freq = 440| SinOsc.ar(freq.midicps.neg) }');
  const u = byName(d, 'UnaryOpUGen').map((b) => b.special);
  ok('.midicps and .neg on a signal are UnaryOpUGens 17 and 0, from UnaryOpUGens.cpp', u.join(' ') === '17 0', u.join(' '));
}
{
  // Env.adsr(0.02, 0.2, 0.6, 0.9), laid out by hand from Env.sc's `adsr` and `prAsArray`:
  // levels [0, 1, 0.6, 0], times [0.02, 0.2, 0.9], curve -4 (shape 5), release node 2.
  const { d } = def('{ |gate = 1| SinOsc.ar * EnvGen.kr(Env.adsr(0.02, 0.2, 0.6, 0.9), gate, doneAction: 2) }');
  const e = byName(d, 'EnvGen')[0];
  const want = ['Control:0', 1, 0, 1, 2, 0, 3, 2, -99, 1, f32(0.02), 5, -4, f32(0.6), f32(0.2), 5, -4, 0, f32(0.9), 5, -4];
  const got = ins(d, e);
  ok('NEGATIVE CONTROL: Env.adsr is the array Env.sc builds, release node 2 and all, after EnvGen\'s five inputs',
    got.length === want.length && got.every((x, i) => (typeof x === 'number' ? close(x, want[i]) : x === want[i])),
    got.map((x) => (typeof x === 'number' ? +x.toFixed(3) : x)).join(' '));
  ok('EnvGen runs at control rate when it is .kr', e.rate === 1);
}
{
  const { d } = def('{ SinOsc.ar * EnvGen.kr(Env.perc(0.01, 0.5), doneAction: 2) }');
  const got = ins(d, byName(d, 'EnvGen')[0]);
  ok('Env.perc has no release node, so -99, and its gate is the default 1',
    got[0] === 1 && got[7] === -99 && got[6] === 2, got.map((x) => (typeof x === 'number' ? +x.toFixed(3) : x)).join(' '));
}
{
  const { d } = def('{ SinOsc.ar * EnvGen.kr(Env([0, 1, 0.5, 0], [0.1, 0.2], \\exp)) }');
  const got = ins(d, byName(d, 'EnvGen')[0]);
  ok('Env(...) wraps three levels\' times from two, and \\exp is shape 2 with a curve value of 0',
    got[6] === 3 && got[11] === 2 && got[12] === 0 && close(got[10], 0.1) && close(got[14], 0.2) && close(got[18], 0.1),
    got.slice(5).map((x) => (typeof x === 'number' ? +x.toFixed(3) : x)).join(' '));
}
{
  const { d } = def('{ SinOsc.ar(300) }');
  ok('NEGATIVE CONTROL: one channel goes to both speakers, Out.ar(0, [x, x])',
    ins(d, byName(d, 'Out')[0]).join(' ') === '0 SinOsc:0 SinOsc:0', ins(d, byName(d, 'Out')[0]).join(' '));
  const st = def('{ [SinOsc.ar(300), Saw.ar(200)] }');
  ok('and a two element array is left and right', ins(st.d, byName(st.d, 'Out')[0]).join(' ') === '0 SinOsc:0 Saw:0');
}
{
  const { d } = def('{ LFTri.ar(LFSaw.kr(2, 0, 100, 300)) * 0.1 }');
  const kr = byName(d, 'LFSaw')[0], ar = byName(d, 'LFTri')[0];
  const ops = byName(d, 'BinaryOpUGen').map((b) => b.rate).join(' ');
  ok('.kr is control rate, .ar is audio rate, and an operator takes the faster of its two inputs',
    kr.rate === 1 && ar.rate === 2 && ops === '1 1 2', `LFSaw ${kr.rate}, LFTri ${ar.rate}, operators ${ops}`);
}
{
  const a = compile('{ |freq = 300, amp = 0.1| SinOsc.ar(freq, mul: amp) }');
  const b = compile('{ arg freq = 300, amp = 0.1; SinOsc.ar(freq, mul: amp) }');
  ok('arg lines and |bars| are the same arguments', a.ok && b.ok && sameBytes(a.bytes, b.bytes));
  const c = compile('/* a /* nested */ comment */ { SinOsc.ar(300) } // trailing');
  ok('block comments nest, the way sclang reads them', c.ok, c.message ?? '');
  const x = compile('{ Mix(Saw.ar([100, 150, 200])) * 0.1 }');
  ok('Mix sums three saws into one channel', x.ok && x.channels === 1, x.message ?? `${x.channels} channel`);
  const y = compile('{ SinOsc.ar(300) ! 2 }');
  const yy = y.ok && readSynthDef(y.bytes).defs[0];
  ok('! 2 is the same signal twice, one SinOsc in both channels',
    y.ok && y.channels === 2 && byName(yy, 'SinOsc').length === 1);
}
{
  const r = compile(PRESETS[0].code);
  ok('the report says the Pad reads its gate and frees itself, so a key up is a gate of 0',
    r.gate && r.gateUsed && r.freesItself && r.warnings.length === 0, JSON.stringify(r.warnings));
  const s = compile('{ |freq = 440, gate = 1| SinOsc.ar(freq) * 0.1 }');
  ok('and a synth that never frees itself is reported, so the page knows to cut it off',
    s.ok && !s.freesItself && s.warnings.some((w) => w.includes('doneAction')) && s.warnings.some((w) => w.includes('gate')),
    JSON.stringify(s.warnings));
}

// ── the wire buffers, the one ceiling that is not about bytes ─────────────────

{
  const freqs = (n) => `[${Array.from({ length: n }, (_, i) => 100 + i).join(', ')}]`;
  const at = compile(`{ Mix(SinOsc.ar(${freqs(WIRE_CEILING)})) * 0.01 }`);
  ok(`${WIRE_CEILING} oscillators alive at once compiles, which is the most the engine measured taking`,
    at.ok && at.wires === WIRE_CEILING, at.ok ? `${at.wires} wires, ${at.bytes.length} B` : at.message);
  const over = compile(`{ Mix(SinOsc.ar(${freqs(WIRE_CEILING + 1)})) * 0.01 }`);
  ok(`NEGATIVE CONTROL: ${WIRE_CEILING + 1} alive at once is refused before it is sent, because the engine says nothing`,
    !over.ok && /audio signals alive/.test(over.error), over.message ?? 'compiled');
}

// ── refusals, each with a line and a column ───────────────────────────────────

const REFUSE = [
  ['a UGen outside the subset, named', '{ |freq = 440|\n  var x = Blip.ar(freq);\n  x }', 2, 11, /Blip is not in this subset/],
  ['NEGATIVE CONTROL: a misspelled keyword, which sclang only warns about', '{ SinOsc.ar(300, mull: 0.1) }', 1, 18, /no argument called mull/],
  ['a positional argument after a keyword one', '{ SinOsc.ar(freq: 300, 0.1) }', 1, 24, /positional argument after a keyword/],
  ['.play, because the page plays it', '{ SinOsc.ar(300) }.play', 1, 20, /leave off \.play/],
  ['Out, because the page adds it', '{ Out.ar(0, SinOsc.ar(300)) }', 1, 3, /leave Out out/],
  ['a variable nobody declared', '{ SinOsc.ar(fre) }', 1, 13, /fre is not declared/],
  ['a variable with no value yet', '{ var x; SinOsc.ar(x) }', 1, 20, /x has no value here yet/],
  ['a var line after a statement', '{ var a = 1; SinOsc.ar(a); var b = 2; SinOsc.ar(b) }', 1, 28, /var lines come first/],
  ['NEGATIVE CONTROL: an .ar filter on a control rate signal, sclang\'s checkSameRateAsFirstInput', '{ LPF.ar(LFNoise1.kr(3)) }', 1, 3, /first input is control rate/],
  ['an .ar filter with nothing in it, which is a scalar 0', '{ LPF.ar() }', 1, 3, /first input is scalar rate/],
  ['Pan2 with no input', '{ Pan2.ar() }', 1, 3, /needs its in argument/],
  ['a last line at control rate', '{ LFNoise1.kr(3) }', 1, 3, /control rate and Out\.ar needs audio rate/],
  ['a last line that is a number', '{ 0.5 }', 1, 3, /is a number/],
  ['three channels', '{ SinOsc.ar([100, 200, 300]) }', 1, 3, /3 channels/],
  ['an operator outside the five', '{ SinOsc.ar(300) ** 2 }', 1, 18, /operator \*\* is not in this subset/],
  ['a comparison', '{ SinOsc.ar(300) > 0 }', 1, 18, /operator > is not in this subset/],
  ['a string', '{ SinOsc.ar("300") }', 1, 13, /strings are not/],
  ['a function inside the function', '{ Mix.fill(3, { SinOsc.ar }) }', 1, 3, /Mix\.fill is not in this subset/],
  ['a default that is not a number', '{ |freq = x| SinOsc.ar(freq) }', 1, 11, /has to be a number/],
  ['a brace that never closes', '{ SinOsc.ar(300)\n', 1, 1, /never closed/],
  ['an Env shape that does not exist', '{ SinOsc.ar * EnvGen.kr(Env([0, 1, 0], [1, 1], \\wobble)) }', 1, 48, /wobble is not one of Env's shapes/],
  ['a method outside the subset', '{ SinOsc.ar(300).range(1, 2) }', 1, 18, /\.range is not in this subset/],
];
for (const [name, src, line, col, re] of REFUSE) {
  const r = compile(src);
  ok(`refused: ${name}, at line ${line} column ${col}`,
    !r.ok && r.line === line && r.col === col && re.test(r.error) && !('bytes' in r),
    r.ok ? 'it compiled' : r.message);
}

console.log(`\n${pass} ok, ${fail} failed`);
process.exit(fail ? 1 : 0);
