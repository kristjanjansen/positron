// node demo/shell/glsl-writer-test.mjs: the writer's loop with a stub model and a stub compiler,
// no browser. NEGATIVE CONTROL lines must refuse something; a loop that ran anything would pass
// the rest.

import { adaptGlsl, bodyError, firstLine, checkPicture, hashOf, writeProgram, ATTEMPTS } from './glsl-writer.mjs';
import { UNIFORMS, UNIFORM_MEANING, glslContract } from './mirror-shader.mjs';

let ok = 0;
const bad = [];
const check = (what, pass, detail = '') => { if (pass) ok++; else bad.push(`${what}${detail ? `: ${detail}` : ''}`); };

// ── the contract comes from the shader module ──
check('the uniforms are read off the running program, four of them', UNIFORMS.map((u) => u.name).join(' ') === 'uT uRes uPrev uSegments',
  UNIFORMS.map((u) => u.name).join(' '));
check('every uniform has a meaning', UNIFORMS.every((u) => UNIFORM_MEANING[u.name]));
const contract = glslContract();
check('the contract names every uniform with its type', UNIFORMS.every((u) => contract.includes(`uniform ${u.type} ${u.name};`)));
check('the contract says no #version and out vec4 o', /no|not/i.test(contract) && contract.includes('#version') && contract.includes('out vec4 o;'));

// ── adapt ──
const toy = `#version 300 es
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  fragColor = vec4(uv, 0.5 + 0.5 * sin(iTime), 1.0);
}`;
const a = adaptGlsl(toy);
check('a Shadertoy program is mapped onto ours', !/#version|iTime|iResolution/.test(a.source) && /void main\(\) \{ mainImage\(o, gl_FragCoord\.xy\); \}/.test(a.source)
  && /uniform float uT;/.test(a.source) && /uniform vec2 uRes;/.test(a.source) && /^precision highp float;/.test(a.source), a.source);
check('each rewrite is reported', ['removed the #version line', 'iTime read as uT', 'iResolution read as uRes', 'wrapped Shadertoy\'s mainImage in a main', 'declared out vec4 o', 'declared uT', 'declared uRes', 'added precision highp float']
  .every((f) => a.fixed.includes(f)), a.fixed.join('; '));
const clean = 'precision highp float;\nuniform float uT;\nout vec4 o;\nvoid main() { o = vec4(sin(uT)); }\n';
const c2 = adaptGlsl(clean);
check('NEGATIVE CONTROL: a program already to the contract is left alone and nothing is reported', c2.source === clean && c2.fixed.length === 0, c2.fixed.join('; '));
check('NEGATIVE CONTROL: uRes is not declared when the program never reads it', !/uRes/.test(c2.source));

// ── the compiler's line, moved back onto the body ──
check('a line number in the log is the body\'s, one less than the compiled text', bodyError("ERROR: 0:5: 'iTime' : undeclared identifier") === "ERROR: 0:4: 'iTime' : undeclared identifier");
check('the first ERROR line is the one said', firstLine('WARNING: 0:1: x\nERROR: 0:3: y\nERROR: 0:4: z') === 'ERROR: 0:3: y');

// ── the picture check, per channel ──
const W = 64, H = 32;
const img = (f) => { const px = new Uint8Array(W * H * 4); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; const [r, g, b] = f(x, y); px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255; } return px; };
const moving = checkPicture(img((x) => [x * 4, 0, 0]), img((x) => [255 - x * 4, 0, 0]));
check('a gradient that moves is neither flat nor still', !moving.flat && !moving.still, JSON.stringify(moving));
const grey = checkPicture(img(() => [40, 40, 40]), img(() => [40, 40, 40]));
check('NEGATIVE CONTROL: one flat colour is flat', grey.flat, JSON.stringify(grey));
const frozen = checkPicture(img((x) => [x * 4, x, 0]), img((x) => [x * 4, x, 0]));
check('NEGATIVE CONTROL: a pattern that did not move is still', frozen.still && !frozen.flat, JSON.stringify(frozen));
// Hue at constant brightness: the sum of the channels is the same in both frames, the channels are not.
const hueA = img(() => [100, 200, 50]), hueB = img(() => [100, 50, 200]);
const hue = checkPicture(hueA, hueB);
check('a hue change at constant brightness counts as change, because the check is per channel', !hue.still && !hue.flat, JSON.stringify(hue));

// ── the loop ──
const GOOD = 'precision highp float;\nuniform float uT;\nout vec4 o;\nvoid main(){ o = vec4(sin(uT)); }\n';
const BROKEN = 'precision highp float;\nout vec4 o;\nvoid main(){ o = vec4(nope); }\n';
const trial = (body) => (body.includes('nope') ? { ok: false, error: "ERROR: 0:3: 'nope' : undeclared identifier" }
  : body.includes('FLAT') ? { ok: true, flat: true, still: false } : body.includes('STILL') ? { ok: true, flat: false, still: true } : { ok: true, flat: false, still: false });
const scripted = (answers) => { const asked = []; return { asked, ask: async (q) => { asked.push(q); const a1 = answers[Math.min(asked.length - 1, answers.length - 1)]; return { code: a1, ms: 10, model: 'stub', usage: { total_tokens: 100 } }; } }; };

let s = scripted([GOOD]);
let r = await writeProgram({ text: 'slow waves', ask: s.ask, trial });
check('a good first answer runs in one try', r.verdict === 'ran' && r.tries.length === 1 && r.source === GOOD && s.asked.length === 1, JSON.stringify(r));

s = scripted([BROKEN, GOOD]);
r = await writeProgram({ text: 'slow waves', ask: s.ask, trial });
check('a refused answer is asked again with its program and the compiler\'s words', r.verdict === 'ran' && r.tries.length === 2
  && s.asked[1].previous?.includes('nope') && /undeclared identifier/.test(s.asked[1].error || ''), JSON.stringify(s.asked[1]));
check('tokens add up across tries', r.tokens === 200, `${r.tokens}`);

s = scripted([BROKEN]);
r = await writeProgram({ text: 'slow waves', ask: s.ask, trial });
check('NEGATIVE CONTROL: three refusals run nothing and say the compiler\'s line', r.verdict === 'refused' && r.source === null && s.asked.length === ATTEMPTS
  && /'nope' : undeclared identifier/.test(r.error), r.error);

s = scripted([GOOD.replace('sin(uT)', 'sin(uT) /*FLAT*/')]);
r = await writeProgram({ text: 'slow waves', ask: s.ask, trial });
check('NEGATIVE CONTROL: a flat picture is never run', r.verdict === 'refused' && r.source === null, r.verdict);

s = scripted([GOOD.replace('sin(uT)', 'sin(uT) /*STILL*/')]);
r = await writeProgram({ text: 'slow waves', ask: s.ask, trial });
check('a picture that never moves is asked for motion, and runs as still when the tries run out', r.verdict === 'ran still' && r.source && /move with uT/.test(s.asked[1]?.error || ''), JSON.stringify(s.asked[1]));

s = scripted(['']);
r = await writeProgram({ text: 'slow waves', ask: s.ask, trial });
check('NEGATIVE CONTROL: an empty answer is a refusal, not a program', r.verdict === 'refused' && /held no program/.test(r.error), r.error);

// The budget: a clock that jumps 20 s per ask stops after the first.
let clock = 0;
s = scripted([BROKEN]);
const slowAsk = async (q) => { clock += 20000; return s.ask(q); };
r = await writeProgram({ text: 'x', ask: slowAsk, trial, now: () => clock });
check('NEGATIVE CONTROL: no new try starts once 15 s have gone', r.verdict === 'refused' && s.asked.length === 1 && /15 s went by/.test(r.error), `${s.asked.length} asks, ${r.error}`);

r = await writeProgram({ text: 'x', ask: async () => { throw new Error('HTTP 502'); }, trial });
check('NEGATIVE CONTROL: a model that does not answer runs nothing and is asked once', r.verdict === 'failed' && r.tries.length === 1 && /HTTP 502/.test(r.error), r.error);

check('a hash is 8 hex and tells two programs apart', /^[0-9a-f]{8}$/.test(hashOf(GOOD)) && hashOf(GOOD) !== hashOf(BROKEN));

for (const b of bad) console.log(`FAIL  ${b}`);
console.log(`${ok} ok, ${bad.length} failed`);
process.exit(bad.length ? 1 : 0);
