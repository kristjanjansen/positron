// node demo/shell/sclang-writer-test.mjs: the SuperCollider writer with a stub model and a stub render,
// no browser. The render itself (sclang-trial.mjs) is graded by /code/write/'s ?selfcheck=1.
// NEGATIVE CONTROL lines must refuse something; a writer that ran anything would pass the rest.

import { compile, UGENS } from './sclang-lite.mjs';
import { sclangContract, SHAPE, copiesShape, ugenLines, NOT_FOR_KEYS, SCLANG_EXAMPLES, sclangExamples, adaptSclang, checkSound, judgeSclang,
  writeSclang, SCLANG_MAX, PEAK_MAX } from './sclang-writer.mjs';
import { ATTEMPTS } from './code-writer.mjs';

let ok = 0;
const bad = [];
const check = (what, pass, detail = '') => { if (pass) ok++; else bad.push(`${what}${detail ? `: ${detail}` : ''}`); };

// ── the contract is the compiler's own tables ──
const contract = sclangContract();
const listed = ugenLines().map((l) => /^\s*(\w+)\./.exec(l)[1]);
check('every UGen in the subset is offered or named as not for keys, and none is both',
  Object.keys(UGENS).every((n) => listed.includes(n) !== NOT_FOR_KEYS.includes(n)), Object.keys(UGENS).filter((n) => listed.includes(n) === NOT_FOR_KEYS.includes(n)).join(' '));
check('NEGATIVE CONTROL: nothing is excluded that the subset does not have', NOT_FOR_KEYS.every((n) => UGENS[n]));
check('the contract names .range and .exprange with UGen.sc\'s defaults', /\.range\(lo: 0, hi: 1\)/.test(contract) && /\.exprange\(lo: 0\.01, hi: 1\)/.test(contract));
check('the contract says the no precedence rule and the full scale rule', /NO PRECEDENCE/.test(contract) && /between -1 and 1/.test(contract));
const sr = compile(SHAPE);
check('the shape in the contract compiles, reads its gate and frees itself', sr.ok && sr.gateUsed && sr.freesItself, sr.ok ? '' : sr.message);
const knobLine = /var cutoff = .*;/.exec(contract)[0];
const kr = compile(`{ |freq = 220, amp = 0.2, gate = 1| ${knobLine} RLPF.ar(Saw.ar(freq), cutoff, 0.3) * amp * EnvGen.kr(Env.adsr, gate, doneAction: 2) }`);
check('the knob line in the contract compiles into a knob', kr.ok && kr.knobs?.some((k) => k.name === 'cutoff'), kr.ok ? '' : kr.message);

// ── the examples said on a retry or a revision ──
for (const e of SCLANG_EXAMPLES) {
  const r = compile(e.body);
  check(`the example "${e.name}" compiles, frees itself and is short`, r.ok && r.freesItself && e.body.length < SCLANG_MAX && adaptSclang(e.body).fixed.length === 0,
    r.ok ? `${e.body.length} chars` : r.message);
}
check('one example uses .range, so the gap the plan measured is taught', SCLANG_EXAMPLES.some((e) => /\.range\(/.test(e.body)));
check('the prompt block carries every example whole', SCLANG_EXAMPLES.every((e) => sclangExamples().includes(e.body)));

// ── adapt: ordinary SuperCollider into the subset ──
const ordinary = `(
SynthDef(\\pad, { |out = 0, freq = 440, amp = 0.1, gate = 1|
  var env = EnvGen.kr(Env.adsr(0.5, 0.2, 0.7, 1), gate, doneAction: Done.freeSelf);
  var sig = Saw.ar(freq * [1, 1.01]) * env * amp;
  Out.ar(out, LPF.ar(sig, 1200));
}).add;
)`;
const a = adaptSclang(ordinary);
check('a SynthDef with Out.ar and Done.freeSelf comes out as the subset\'s function, and compiles', compile(a.source).ok && !/SynthDef|Out\.ar|Done|\bout\b/.test(a.source),
  `${compile(a.source).message || ''} ${a.source}`);
check('each rewrite is reported', ['took off the ( ) round the whole program', 'took the function out of its SynthDef', 'took the signal out of Out.ar',
  'removed the out argument only Out.ar used', 'Done.freeSelf read as 2'].every((f) => a.fixed.includes(f)), a.fixed.join('; '));
const before = compile(ordinary);
check('NEGATIVE CONTROL: without the adapter the same text is refused, as the plan measured', !before.ok, before.message);
const played = adaptSclang('{ arg out = 0, freq = 440, gate = 1; Out.ar(out, SinOsc.ar(freq) * 0.1 * EnvGen.kr(Env.adsr, gate, doneAction: 2)) }.play;');
check('an arg line and .play are handled too', compile(played.source).ok && played.fixed.includes('left off .play'), `${played.source} ${compile(played.source).message || ''}`);
const kept = adaptSclang('{ |out = 0, freq = 440| Out.ar(out, SinOsc.ar(freq + out) * 0.1) }');
check('NEGATIVE CONTROL: an out argument the program reads elsewhere is kept', /\|out = 0, freq = 440\|/.test(kept.source), kept.source);
const kick = adaptSclang('{ |freq = 60.midicps, amp = 0.2, gate = 1| SinOsc.ar(freq) * amp * EnvGen.kr(Env.perc, doneAction: 2) }');
check('a note number in an argument\'s default is folded to Hz, as qwen2.5-coder wrote it three times for a kick', compile(kick.source).ok && /freq = 261\.626/.test(kick.source)
  && kick.fixed.includes('60.midicps written as 261.626'), kick.source);
const clean = `${SCLANG_EXAMPLES[0].body}\n`;
check('NEGATIVE CONTROL: a program already in the subset is left alone and nothing is reported', adaptSclang(clean).source === clean && adaptSclang(clean).fixed.length === 0);
const fenced = adaptSclang(`\`\`\`supercollider\n${SCLANG_EXAMPLES[1].body}\n\`\`\``);
check('a code fence is taken off', fenced.source === `${SCLANG_EXAMPLES[1].body}\n` && fenced.fixed.length === 1);

// ── the sound check ──
const sine = (amp, n = 24000) => Float32Array.from({ length: n }, (_, i) => amp * Math.sin(i * 0.05));
const fine = checkSound(sine(0.3));
check('a held note at 0.3 is neither clipped, silent nor NaN', !fine.clipped && !fine.silent && !fine.nan && Math.abs(fine.peak - 0.3) < 0.001, JSON.stringify(fine));
const loud = checkSound(sine(29.9));
check('NEGATIVE CONTROL: the plan\'s pluck at 29.9 times full scale is clipped', loud.clipped && loud.peak > 29, JSON.stringify(loud));
check('NEGATIVE CONTROL: silence is silent', checkSound(new Float32Array(24000)).silent);
const nan = sine(0.3); nan[500] = NaN;
check('NEGATIVE CONTROL: one NaN is found among 24000 samples', checkSound(nan).nan);
check('full scale itself is allowed, and a hair over is not', !checkSound([PEAK_MAX]).clipped && checkSound([PEAK_MAX + 0.001]).clipped);

// ── the judge ──
check('a compiler refusal is said with its line and the subset\'s list, and told to the model', (() => {
  const c = compile('{ Pluck.ar(WhiteNoise.ar, 1, 0.01, 0.01, 2) }');
  const j = judgeSclang({ ok: false, error: c.message });
  return !j.pass && /line 1, column 3/.test(j.say) && /which knows SinOsc/.test(j.retry);
})());
const jl = judgeSclang({ ok: true, peak: 29.92, rms: 28.25, nan: false, silent: false });
check('NEGATIVE CONTROL: a clipping program is refused, never kept, and the model is told the number', !jl.pass && !jl.keep && /29\.92 times full scale/.test(jl.say) && /29\.92/.test(jl.retry), jl.say);
check('NEGATIVE CONTROL: a NaN program and a silent one are refused', !judgeSclang({ ok: true, nan: true, peak: 0 }).pass && !judgeSclang({ ok: true, silent: true, peak: 0 }).pass);
check('NEGATIVE CONTROL: a program whose sound could not be checked is not run', !judgeSclang({ ok: true, unchecked: 'no audio here', peak: 0 }).pass);
check('a program inside full scale passes', judgeSclang({ ok: true, peak: 0.4, rms: 0.1, nan: false, silent: false }).pass === true);

// ── the loop, with the shared code-writer.mjs underneath ──
const GOOD = SCLANG_EXAMPLES[0].body;
const LOUD = GOOD.replace('/ 1.75', '* 40');
const BROKEN = '{ |freq = 220, gate = 1| Pluck.ar(WhiteNoise.ar, gate, 0.01, freq.reciprocal, 2) }';
const trial = (src) => {
  const c = compile(src);
  if (!c.ok) return { ok: false, error: c.message };
  return { ok: true, ...checkSound(sine(src.includes('* 40') ? 8 : 0.3)) };
};
const scripted = (answers) => { const asked = []; return { asked, ask: async (q) => { asked.push(q); return { code: answers[Math.min(asked.length - 1, answers.length - 1)], ms: 5, model: 'stub', usage: { total_tokens: 50 } }; } }; };
let s = scripted([GOOD]);
let r = await writeSclang({ text: 'a bell', ask: s.ask, trial });
check('a good first answer runs in one try', r.verdict === 'ran' && r.source === `${GOOD}\n` && r.tries.length === 1 && r.tries[0].peak > 0.2, JSON.stringify(r.tries[0]));
s = scripted([BROKEN, GOOD]);
r = await writeSclang({ text: 'a pluck', ask: s.ask, trial });
check('a refused answer is asked again with its program and the compiler\'s list of what the subset knows', r.verdict === 'ran' && r.tries.length === 2
  && s.asked[1].previous?.includes('Pluck') && /Pluck is not in this subset, which knows SinOsc/.test(s.asked[1].error || ''), s.asked[1].error);
s = scripted([LOUD]);
r = await writeSclang({ text: 'a loud bell', ask: s.ask, trial });
check('NEGATIVE CONTROL: three loud answers run nothing, and the reason is the peak', r.verdict === 'refused' && r.source === null && s.asked.length === ATTEMPTS
  && /8\.00 times full scale/.test(r.error) && /Keep the last line between -1 and 1/.test(s.asked[1].error), r.error);
s = scripted([LOUD, GOOD]);
r = await writeSclang({ text: 'a loud bell', ask: s.ask, trial });
check('a loud answer then a quiet one runs the quiet one', r.verdict === 'ran' && r.source === `${GOOD}\n` && r.tries[0].peak === 8, `${r.tries[0].peak}`);
s = scripted([GOOD]);
await writeSclang({ text: 'slower', base: GOOD, ask: s.ask, trial });
check('a revision\'s first ask carries the program running now and no error', s.asked[0].previous === GOOD && s.asked[0].error === null);

// ── the shape copied back is not a sound (qwen3-30b answered it for 9 of 10 sentences, measured 2026-10-15) ──
s = scripted([SHAPE, GOOD]);
r = await writeSclang({ text: 'a bell', ask: s.ask, trial });
check('the contract\'s shape answered back is refused without a render, and the retry says why', r.verdict === 'ran' && r.tries.length === 2
  && /shape from the instructions/.test(r.tries[0].error) && /shape from the instructions, unchanged/.test(s.asked[1].error) && r.tries[0].peak === null, JSON.stringify(r.tries[0]));
check('NEGATIVE CONTROL: a copy with other spacing and a comment is still a copy, and a changed number is not',
  copiesShape(`// mine\n${SHAPE.replace(/\n\s+/g, ' ')}`) && !copiesShape(SHAPE.replace('freq * 4', 'freq * 5')));
check('the shape is in the contract whole', contract.includes(SHAPE));

for (const b of bad) console.log(`FAIL  ${b}`);
console.log(`${ok} ok, ${bad.length} failed`);
process.exit(bad.length ? 1 : 0);
