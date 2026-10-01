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
// ⚠️ 2026-09-30, THE WIRE COUNT WAS WRONG AND FOUR CHECKS WERE ADDED FOR IT.
// An output nobody reads was counted as given straight back; scsynth keeps it.
// MEASURED, 63 ok on the real module, then three sabotaged copies:
//
//   the old line back, an unread output given straight back  60/63, the unread
//                                                            oscillator, Pan2
//                                                            and the 63 and 64
//   inputs never given back                                  59/63, and the
//                                                            forty deep chain
//   outputs taken BEFORE the inputs are given back           60/63, the chain
//                                                            reads 2 and both
//                                                            ceilings move
//
// ⚠️ 2026-09-30, NAMED CONTROLS (`\rel.kr(1.5, spec: [0.05, 6, \exp])`), AND
// BELL, GLASS AND BREATH LEFT THE PRESETS (*"keep pad growl wah"*), which took
// six preset checks with them. MEASURED, 84 ok on the real module, then six
// sabotaged copies (both files copied, since `control()` is in synthdef.mjs):
//
//   a lag written as a plain Control                        83/84, the LagControl
//   every named control given special index 0               82/84, rel's wiring
//                                                            and the slot check
//   the spec's default ignored when no value is given        83/84, the defaults
//   \exp across zero not refused                            83/84, that refusal
//   freq, amp and gate not left out of the knobs             81/84, three
//   a lag of 0 kept as a lag                                 83/84, the 0 is nil
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
  // No preset pans since the Hat went (2026-09-30), so Pan2 is graded on a
  // program of its own rather than dropped with it.
  const pan = def('{ Pan2.ar(WhiteNoise.ar * 0.1, 0.3) }');
  const out = byName(pan.d, 'Out')[0];
  ok('Pan2 reaches the speakers as output 0 left and output 1 right',
    ins(pan.d, out).join(' ') === '0 Pan2:0 Pan2:1', ins(pan.d, out).join(' '));
}
for (const p of PRESETS) {
  const r = compile(p.code);
  ok(`the ${p.label} preset reads its gate and frees itself, so letting a key go releases it`,
    r.ok && r.gate && r.gateUsed && r.freesItself && r.warnings.length === 0,
    r.ok ? (JSON.stringify(r.warnings) === '[]' ? 'no warnings' : JSON.stringify(r.warnings)) : r.message);
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

{
  // 🔴 READ IN SC_GraphDef.cpp's DoBufferColoring, THEN MEASURED ON THE ENGINE,
  // 2026-09-30: an audio output nobody reads is allocated with a count of 0
  // and never goes back on the free stack, so it holds its buffer to the end.
  const unread = compile('{ var a = SinOsc.ar(300); SinOsc.ar(200) }');
  ok('NEGATIVE CONTROL: an oscillator nobody reads keeps its wire, so this is 2 and not 1',
    unread.ok && unread.wires === 2, unread.ok ? `${unread.wires} wires` : unread.message);
  const pan = compile('{ var a = Pan2.ar(SinOsc.ar(300)); SinOsc.ar(200) }');
  ok('and an unread Pan2 keeps both its outputs: its input goes back, its two outputs stay, and the heard one takes a third',
    pan.ok && pan.wires === 3, pan.ok ? `${pan.wires} wires` : pan.message);
  const chain = compile(`{ ${'SinOsc.ar('.repeat(40)}300${')'.repeat(40)} * 0.1 }`);
  ok('NEGATIVE CONTROL the other way: forty oscillators each read by the next reuse one wire, because inputs are given back first',
    chain.ok && chain.wires === 1, chain.ok ? `${chain.wires} wire, ${chain.blocks} blocks` : chain.message);
  const freqs = (n) => `[${Array.from({ length: n }, (_, i) => 100 + i).join(', ')}]`;
  const fits = compile(`{ var a = SinOsc.ar(${freqs(WIRE_CEILING - 1)}); SinOsc.ar(300, mul: 0.1) }`);
  const over = compile(`{ var a = SinOsc.ar(${freqs(WIRE_CEILING)}); SinOsc.ar(300, mul: 0.1) }`);
  ok(`${WIRE_CEILING - 1} unread oscillators and one heard compile and ${WIRE_CEILING} and one are refused, which is where the engine drew the line`,
    fits.ok && fits.wires === WIRE_CEILING && !over.ok && /audio signals alive/.test(over.error),
    `${fits.ok ? fits.wires : fits.message}, then ${over.ok ? `${over.wires} compiled` : 'refused'}`);
}

// ── named controls, the knobs under the text ──────────────────────────────────
//
// 🔴 WHAT sclang BUILDS, READ IN `NamedControl.new` (GraphBuilder.sc) AND
// `Control.init` / `LagControl.kr` (InOut.sc) at 19954900: one Control block
// per name whose special index is its slot in the value array, and a
// LagControl, with the lag as its input, for any lag that is a plain number.

const { KEYED } = M;
{
  const pad = def(PRESETS[0].code);
  const knobs = pad.r.knobs ?? [];
  // Every preset has a knob since 2026-09-30 (*"add knobs to all patches what
  // mak sense"*), so the Pad is read by name: rel first, then cutoff and detune.
  ok('the Pad has three knobs, rel, cutoff and detune, and rel runs 0.05 to 6 on an exponential warp from 1.5',
    knobs.map((k) => k.name).join(' ') === 'rel cutoff detune' && knobs[0].from === 'named' && knobs[0].value === 1.5
      && knobs[0].spec.min === 0.05 && knobs[0].spec.max === 6 && knobs[0].spec.warp === 'exp' && !knobs[0].spec.guessed,
    JSON.stringify(knobs));
  const slot = pad.d.paramNames.find((x) => x.name === 'rel')?.at;
  const ctl = pad.d.blocks.find((b) => b.name === 'Control' && b.special === slot);
  const env = byName(pad.d, 'EnvGen')[0];
  // EnvGen's inputs: gate, levelScale, levelBias, timeScale, doneAction, then
  // Env.adsr's array, whose third segment time is at 5 + 4 + 2 * 4 + 1 = 18.
  const relIn = env && env.inputs[18];
  ok('NEGATIVE CONTROL: rel is a Control of its own in the definition, 1.5 in the value array, and it is what the release reads',
    slot === 3 && close(pad.d.paramValues[slot], 1.5) && !!ctl && relIn?.from === pad.d.blocks.indexOf(ctl),
    `slot ${slot}, value ${pad.d.paramValues[slot]}, release input ${relIn ? inp(pad.d, relIn) : 'none'}`);
  const others = PRESETS.slice(1).map((p) => `${p.label} ${(compile(p.code).knobs ?? []).map((k) => k.name).join(' ')}`);
  // ⚠️ AND EVERY KNOB IN EVERY PRESET HAS A SPEC WRITTEN IN THE CODE, because
  // an argument's or a bare control's range is a guess.
  ok('and every other preset has one to four knobs, each with a spec written in the code',
    PRESETS.slice(1).every((p) => { const k = compile(p.code).knobs ?? []; return k.length >= 1 && k.length <= 4 && k.every((x) => !x.spec.guessed); }), others.join(', '));
}
{
  const { r, d } = def(String.raw`{ |a = 0.2, b = 3| SinOsc.ar(\x.kr(300) + \y.kr(0.5), mul: a * b * 0.01) }`);
  const cx = d.blocks.filter((q) => q.name === 'Control').map((q) => `${q.special}:${q.outputs.length}`);
  ok('NEGATIVE CONTROL: after two arguments, each named control is its own Control block whose special index is its slot, 2 then 3',
    r.ok && cx.join(' ') === '0:2 2:1 3:1' && d.paramNames.map((x) => `${x.name}${x.at}`).join(' ') === 'a0 b1 x2 y3',
    `${cx.join(' ')}, ${d.paramNames.map((x) => `${x.name}${x.at}`).join(' ')}`);
}
{
  const lag = def(String.raw`{ SinOsc.ar(\f.kr(300, 0.2)) * 0.1 }`);
  const lc = byName(lag.d, 'LagControl')[0];
  ok('NEGATIVE CONTROL: a lag that is a number is a LagControl whose input is the lag, and no Lag block, which is what sclang builds',
    !!lc && lc.rate === 1 && ins(lag.d, lc).length === 1 && close(ins(lag.d, lc)[0], 0.2)
      && byName(lag.d, 'Lag').length === 0 && byName(lag.d, 'Control').length === 0,
    lag.d.blocks.map((b) => b.name).join(' '));
  const none = compile(String.raw`{ SinOsc.ar(\f.kr(300, 0)) * 0.1 }`);
  const bare = compile(String.raw`{ SinOsc.ar(\f.kr(300)) * 0.1 }`);
  ok('and a lag of 0 is no lag at all, byte for byte the same as leaving it out, because sclang turns 0 into nil',
    none.ok && bare.ok && sameBytes(none.bytes, bare.bytes));
}
{
  const d0 = compile(String.raw`{ SinOsc.ar(\f.kr) * 0.1 }`).controls?.[0];
  const d1 = compile(String.raw`{ SinOsc.ar(\f.kr(spec: [200, 800])) * 0.1 }`).controls?.[0];
  const d2 = compile(String.raw`{ SinOsc.ar(\f.kr(spec: [200, 800, \lin, 1, 440])) * 0.1 }`).controls?.[0];
  const d3 = compile(String.raw`{ SinOsc.ar(\f.kr(spec: \freq)) * 0.1 }`).controls?.[0];
  ok('NEGATIVE CONTROL: with no value the spec gives it, ControlSpec\'s default ? minval: nothing is 0, [200, 800] is 200, a fifth element is the default, \\freq is 440',
    d0?.value === 0 && d1?.value === 200 && d2?.value === 440 && d2?.spec.step === 1
      && d3?.value === 440 && d3?.spec.min === 20 && d3?.spec.max === 20000 && d3?.spec.warp === 'exp',
    [d0, d1, d2, d3].map((c) => c && `${c.value} ${c.spec.min}..${c.spec.max} ${c.spec.warp}`).join(', '));
  const c = compile(String.raw`{ SinOsc.ar(\f.kr(300, spec: [20, 600, -3])) * 0.1 }`).controls?.[0];
  ok('a curve number is kept as the warp, and one under 0.001 is linear, which is CurveWarp.new',
    c?.spec.warp === -3 && compile(String.raw`{ SinOsc.ar(\f.kr(300, spec: [20, 600, 0.0001])) * 0.1 }`).controls?.[0].spec.warp === 'lin');
}
{
  const r = compile(String.raw`{ SinOsc.ar(\x.kr(300) + \x.kr) * 0.1 }`);
  const d = r.ok && readSynthDef(r.bytes).defs[0];
  ok('the same name twice is one control, and the second use without a value takes the first one\'s, as NamedControl does',
    r.ok && d.paramNames.length === 1 && byName(d, 'Control').length === 1 && r.controls.length === 1,
    r.ok ? `${d.paramNames.length} name, ${byName(d, 'Control').length} block` : r.message);
}
{
  const r = compile(String.raw`{ |freq = 440, amp = 0.1, gate = 1, cut = 1200, rate = 1| SinOsc.ar(freq * rate, mul: amp * \amp2.kr(0.5)) * EnvGen.kr(Env.perc, gate, doneAction: 2) * (cut / 1200) }`);
  const k = r.knobs ?? [];
  ok(`NEGATIVE CONTROL: every argument but ${KEYED.join(', ')} is a knob, in the order written, arguments then named`,
    k.map((x) => x.name).join(' ') === 'cut rate amp2', k.map((x) => x.name).join(' ') || r.message);
  const cut = k.find((x) => x.name === 'cut'), rate = k.find((x) => x.name === 'rate');
  ok('an argument named in Spec.specs takes that spec, and one that is not gets a guess that says it is one',
    rate?.spec.warp === 'exp' && rate.spec.min === 0.125 && rate.spec.max === 8 && !rate.spec.guessed
      && cut?.spec.guessed === true && cut.spec.min === 0 && cut.spec.max === 2400,
    `rate ${rate?.spec.min}..${rate?.spec.max} ${rate?.spec.warp}, cut ${cut?.spec.min}..${cut?.spec.max}${cut?.spec.guessed ? ' guessed' : ''}`);
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
  // Named controls. The values under `String.raw` are what a person types.
  ['NEGATIVE CONTROL: an audio rate named control', String.raw`{ SinOsc.ar(\x.ar(300)) }`, 1, 16, /\\x\.ar is an audio rate control/],
  ['a named control read once at the start', String.raw`{ SinOsc.ar(\x.ir(300)) }`, 1, 16, /\\x\.ir is a control read once/],
  ['a named control whose value is a symbol', String.raw`{ SinOsc.ar(\x.kr(\y)) }`, 1, 19, /has to be a number, not the symbol/],
  ['a named control whose value is an array, which is several controls', String.raw`{ SinOsc.ar(\x.kr([300, 400])) }`, 1, 19, /makes several controls/],
  ['NEGATIVE CONTROL: an exponential spec that touches zero', String.raw`{ SinOsc.ar(\x.kr(300, spec: [0, 600, \exp])) }`, 1, 24, /both ends on one side of zero/],
  ['a spec with no range', String.raw`{ SinOsc.ar(\x.kr(300, spec: [300, 300])) }`, 1, 24, /is no range/],
  ['a fader warp', String.raw`{ SinOsc.ar(\x.kr(0.5, spec: [0, 1, \amp])) }`, 1, 37, /fader warps/],
  ['a warp that does not exist', String.raw`{ SinOsc.ar(\x.kr(0.5, spec: [0, 1, \wobble])) }`, 1, 37, /\\wobble is not a warp/],
  ['a named spec this subset does not have', String.raw`{ SinOsc.ar(\x.kr(300, spec: \wat)) }`, 1, 30, /\\wat is not a spec/],
  ['NEGATIVE CONTROL: a default outside its own spec', String.raw`{ SinOsc.ar(\x.kr(900, spec: [20, 600])) }`, 1, 19, /starts at 900, outside/],
  ['fixedLag', String.raw`{ SinOsc.ar(\x.kr(300, 0.1, true)) }`, 1, 29, /fixedLag is not in this subset/],
  ['a lag below nothing', String.raw`{ SinOsc.ar(\x.kr(300, -1)) }`, 1, 24, /less than none/],
  ['a lag that is a signal', String.raw`{ SinOsc.ar(\x.kr(300, LFNoise1.kr(1))) }`, 1, 24, /lag of \\x has to be a number/],
  ['a named control with an argument\'s name', String.raw`{ |x = 1| SinOsc.ar(\x.kr(300)) }`, 1, 21, /already an argument/],
  ['NEGATIVE CONTROL: one name with two values, which is sclang\'s own error', String.raw`{ SinOsc.ar(\x.kr(300) + \x.kr(400)) }`, 1, 26, /more than one set of default values/],
  ['a keyword a named control does not take', String.raw`{ SinOsc.ar(\x.kr(300, 0.1, spec: [20, 600], mull: 2)) }`, 1, 46, /no argument called mull/],
];
for (const [name, src, line, col, re] of REFUSE) {
  const r = compile(src);
  ok(`refused: ${name}, at line ${line} column ${col}`,
    !r.ok && r.line === line && r.col === col && re.test(r.error) && !('bytes' in r),
    r.ok ? 'it compiled' : r.message);
}

console.log(`\n${pass} ok, ${fail} failed`);
process.exit(fail ? 1 : 0);
