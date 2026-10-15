// demo/shell/glsl-wish.mjs: the GLSL half of wish-loop.mjs's loop, a sentence into a running
// fragment shader (plans/plan-text-to-code.md section 3): the adapter, the picture check and the
// judge. Pure; graded in node by glsl-wish-test.mjs. The old picture is never touched here.

import { UNIFORMS } from './mirror-shader.mjs';
import { writeLoop, hashOf, ATTEMPTS, BUDGET_MS } from './wish-loop.mjs';

export { hashOf, ATTEMPTS, BUDGET_MS };
/** Each end adds its own version line; a body carries none. */
export const VERSION = '#version 300 es\n';
/** Two moments that share no short period, so a pattern repeating every 0.25 or 1.0 still differs. */
export const TRIAL_TIMES = [1.37, 3.11];
/** Below these (0 to 255, per channel) a picture is one colour, or did not move. */
export const FLAT_SD = 2;
export const STILL_CHANGE = 0.5;

/**
 * Cheap rewrites before the compiler, each one reported, never silent.
 * @returns {{ source: string, fixed: string[] }}
 */
export function adaptGlsl(text) {
  const fixed = [];
  let s = String(text ?? '').replace(/\r\n/g, '\n');
  const fence = /^\s*```[a-z]*\n([\s\S]*?)```\s*$/.exec(s);
  if (fence) { s = fence[1]; fixed.push('took the program out of its code fence'); }
  if (/^\s*#version[^\n]*\n?/m.test(s)) { s = s.replace(/^\s*#version[^\n]*\n?/m, ''); fixed.push('removed the #version line'); }
  const swap = (re, to, what) => { if (re.test(s)) { s = s.replace(re, to); fixed.push(what); } };
  swap(/\biTime\b/g, 'uT', 'iTime read as uT');
  swap(/\biResolution\b/g, 'uRes', 'iResolution read as uRes');
  swap(/\btexture2D\s*\(/g, 'texture(', 'texture2D read as texture');
  swap(/\bgl_FragColor\b/g, 'o', 'gl_FragColor read as o');
  if (/\bvoid\s+mainImage\s*\(/.test(s) && !/\bvoid\s+main\s*\(\s*(void)?\s*\)/.test(s)) {
    s += '\nvoid main() { mainImage(o, gl_FragCoord.xy); }\n';
    fixed.push('wrapped Shadertoy\'s mainImage in a main');
  }
  if (!/\bout\s+(?:highp\s+|mediump\s+|lowp\s+)?vec4\s+o\s*;/.test(s)) {
    s = `out vec4 o;\n${s}`; fixed.push('declared out vec4 o');
  }
  for (const u of [...UNIFORMS].reverse()) {
    const used = new RegExp(`\\b${u.name}\\b`).test(s);
    const declared = new RegExp(`\\buniform\\s+\\w+\\s+${u.name}\\b`).test(s);
    if (used && !declared) { s = `uniform ${u.type} ${u.name};\n${s}`; fixed.push(`declared ${u.name}`); }
  }
  if (!/\bprecision\s+\w+\s+float\s*;/.test(s)) { s = `precision highp float;\n${s}`; fixed.push('added precision highp float'); }
  return { source: s.trim() + '\n', fixed };
}

/** A compiler log about VERSION + body, with its line numbers moved back onto the body. */
export function bodyError(error) {
  return String(error ?? '').replace(/\b0:(\d+):/g, (_, n) => `0:${Math.max(1, Number(n) - 1)}:`);
}

/** The compiler's first line that names a place, the one a person reads. */
export function firstLine(error) {
  const lines = String(error ?? '').split('\n').map((l) => l.trim()).filter(Boolean);
  return lines.find((l) => /ERROR/i.test(l)) || lines[0] || '';
}

/**
 * Two frames of RGBA, compared per colour channel (a hue change at constant brightness counts).
 * Every pixel by default: a star field of one-pixel stars falls between the samples of a stride.
 * @returns {{ sd: number[], change: number[], flat: boolean, still: boolean }}
 */
export function checkPicture(a, b, step = 1) {
  const sd = [0, 1, 2].map((c) => Math.max(sdOf(a, c, step), sdOf(b, c, step)));
  const change = [0, 1, 2].map((c) => {
    let sum = 0, n = 0;
    for (let i = c; i < a.length; i += 4 * step) { sum += Math.abs(a[i] - b[i]); n++; }
    return n ? sum / n : 0;
  });
  const flat = Math.max(...sd) < FLAT_SD && Math.max(...change) < FLAT_SD;
  return { sd, change, flat, still: !flat && Math.max(...change) < STILL_CHANGE };
}
function sdOf(px, c, step) {
  let s = 0, s2 = 0, n = 0;
  for (let i = c; i < px.length; i += 4 * step) { s += px[i]; s2 += px[i] * px[i]; n++; }
  if (!n) return 0;
  const m = s / n;
  return Math.sqrt(Math.max(0, s2 / n - m * m));
}

/**
 * The GLSL half of the loop: a compile failure says the compiler's first line, a flat picture is
 * refused, and a still one is kept as a last resort ('ran still').
 */
export function judgeGlsl(r) {
  const fields = { flat: !!r.flat, still: !!r.still, change: r.change };
  if (!r.ok) return { say: firstLine(r.error), retry: String(r.error || 'it did not compile'), fields };
  if (!r.flat && !r.still) return { pass: true, fields };
  const say = r.still ? 'it compiled and the picture did not change between two moments' : 'it compiled and drew one flat colour';
  return { keep: !!r.still, say, retry: `${say}. Make it vary across the screen and move with uT.`, fields };
}

/**
 * Ask, adapt, compile and look, at most `attempts` times or until `budgetMs` has gone.
 * @param {object} o
 * @param {string} o.text  the sentence
 * @param {string} [o.base]  the program running now: the first ask revises it as `text` says
 * @param {(q: { text: string, previous: string|null, error: string|null }) => Promise<{ code: string, ms?: number, model?: string, usage?: object }>} o.ask
 * @param {(body: string) => { ok: boolean, error?: string, flat?: boolean, still?: boolean }} o.trial  compiles in a sandbox
 * @returns {Promise<{ verdict: 'ran'|'ran still'|'refused'|'failed', source: string|null, error: string, tries: object[], ms: number, tokens: number, model: string }>}
 */
export function writeProgram({ text, base = null, ask, trial, attempts = ATTEMPTS, budgetMs = BUDGET_MS, now = () => Date.now(), onTry = () => {} }) {
  return writeLoop({ text, base, ask, trial, adapt: adaptGlsl, judge: judgeGlsl, kept: 'ran still',
    keptWhy: 'it runs, and did not move between the two moments it was checked at', attempts, budgetMs, now, onTry });
}
