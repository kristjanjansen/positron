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

// ── a revision: the first ask carries the program running now and no error ──
s = scripted([GOOD]);
r = await writeProgram({ text: 'slower', base: BROKEN.replace('nope', 'uT'), ask: s.ask, trial });
check('a revision\'s first ask carries the program running now as previous, and no error', r.verdict === 'ran' && s.asked[0].previous?.includes('vec4(uT)')
  && s.asked[0].error === null, JSON.stringify(s.asked[0]));
s = scripted([BROKEN, GOOD]);
r = await writeProgram({ text: 'slower', base: GOOD, ask: s.ask, trial });
check('a revision that fails is retried with the failed program and a reason, so the worker reads it as a fix', s.asked[1]?.previous?.includes('nope') && !!s.asked[1]?.error,
  JSON.stringify(s.asked[1]));
s = scripted([GOOD]);
await writeProgram({ text: 'slower', ask: s.ask, trial });
check('NEGATIVE CONTROL: with no base the first ask carries no previous', s.asked[0].previous === null);
r = await writeProgram({ text: 'x', ask: async () => { throw Object.assign(new Error('too many requests from here: at most 6 in 10 s, try again in 4 s'), { plain: true }); }, trial });
check('a refusal for asking too often is said in its own words', r.verdict === 'failed' && /^too many requests/.test(r.error), r.error);

// ── the examples the worker puts in its prompt keep to the contract ──
const { GLSL_EXAMPLES, glslExamples } = await import('./glsl-examples.mjs');
/** What a body must be (glslContract), as a list of what it breaks. */
function breaks(body) {
  const out = [];
  if (!/^precision highp float;/.test(body)) out.push('does not start with precision highp float');
  if (/#version/.test(body)) out.push('carries #version');
  for (const u of UNIFORMS) if (!new RegExp(`\\buniform\\s+${u.type}\\s+${u.name}\\s*;`).test(body)) out.push(`does not declare ${u.name}`);
  if (!/\bout\s+vec4\s+o\s*;/.test(body)) out.push('no out vec4 o');
  if (!/\bvoid\s+main\s*\(\s*\)/.test(body)) out.push('no main');
  if (/\b(iTime|iResolution|mainImage|fragColor)\b/.test(body)) out.push('Shadertoy names');
  for (const m of body.matchAll(/<\s*(\d+)\s*;/g)) if (Number(m[1]) > 64) out.push(`a loop of ${m[1]}`);
  if (body.length >= 3000) out.push(`${body.length} chars`);
  if (!/\buT\b/.test(body.replace(/uniform float uT;/, ''))) out.push('never reads uT');
  if (adaptGlsl(body).fixed.length) out.push(`needed fixing: ${adaptGlsl(body).fixed.join(', ')}`);
  return out;
}
check('two examples, each named and saying what it teaches', GLSL_EXAMPLES.length === 2 && GLSL_EXAMPLES.every((e) => e.name && e.teaches && e.body));
for (const e of GLSL_EXAMPLES) check(`the example "${e.name}" keeps to the contract`, breaks(e.body).length === 0, breaks(e.body).join('; '));
check('one example feeds back through uPrev, one layers noise with a palette, and both draw soft edges with smoothstep',
  GLSL_EXAMPLES.some((e) => /texture\(uPrev/.test(e.body)) && GLSL_EXAMPLES.some((e) => /fbm/.test(e.body) && /cos\(6\.2831/.test(e.body))
    && GLSL_EXAMPLES.every((e) => /smoothstep/.test(e.body)));
check('one hash signature across the examples, since two made the model mix their arguments',
  new Set(GLSL_EXAMPLES.flatMap((e) => [...e.body.matchAll(/float hash\(([^)]*)\)/g)].map((m) => m[1]))).size === 1);
check('NEGATIVE CONTROL: the contract check refuses a body with #version and one missing uPrev',
  breaks(`#version 300 es\n${GLSL_EXAMPLES[0].body}`).length > 0 && breaks(GLSL_EXAMPLES[0].body.replace(' uniform sampler2D uPrev;', '')).some((b) => /uPrev/.test(b)));
check('NEGATIVE CONTROL: none of the examples is rain, so a measurement on rain grades no copy', !GLSL_EXAMPLES.some((e) => /rain|drop/i.test(e.name + e.body)));
check('the prompt block carries every example whole', GLSL_EXAMPLES.every((e) => glslExamples().includes(e.body)));

for (const b of bad) console.log(`FAIL  ${b}`);
console.log(`${ok} ok, ${bad.length} failed`);
process.exit(bad.length ? 1 : 0);
