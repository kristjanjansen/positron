// demo/shell/glsl-writer.mjs: the loop that turns a sentence into a running fragment shader
// (plans/plan-text-to-code.md section 3). Pure: the model and the GL are handed in, so the loop
// is graded in node by glsl-writer-test.mjs. The old picture is never touched here.

import { UNIFORMS } from './mirror-shader.mjs';

/** Each end adds its own version line; a body carries none. */
export const VERSION = '#version 300 es\n';
export const ATTEMPTS = 3;
export const BUDGET_MS = 15000;
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

/** FNV-1a, 8 hex: lets a log line be matched to a program without carrying it. */
export function hashOf(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

/**
 * Ask, adapt, compile and look, at most `attempts` times or until `budgetMs` has gone.
 * @param {object} o
 * @param {string} o.text  the sentence
 * @param {(q: { text: string, previous: string|null, error: string|null }) => Promise<{ code: string, ms?: number, model?: string, usage?: object }>} o.ask
 * @param {(body: string) => { ok: boolean, error?: string, flat?: boolean, still?: boolean }} o.trial  compiles in a sandbox
 * @returns {Promise<{ verdict: 'ran'|'ran still'|'refused'|'failed', source: string|null, error: string, tries: object[], ms: number, tokens: number, model: string }>}
 */
export async function writeProgram({ text, ask, trial, attempts = ATTEMPTS, budgetMs = BUDGET_MS, now = () => Date.now(), onTry = () => {} }) {
  const t0 = now();
  const tries = [];
  let previous = null, error = null, still = null, model = '', tokens = 0;
  const done = (verdict, source, why) => ({ verdict, source, error: why, tries, ms: now() - t0, tokens, model });
  for (let i = 0; i < attempts; i++) {
    if (i > 0 && now() - t0 >= budgetMs) break;
    let out;
    try { out = await ask({ text, previous, error }); } catch (e) {
      tries.push({ attempt: i + 1, stage: 'ask', error: e.message });
      onTry(tries.at(-1));
      return done('failed', still, `nothing answered: ${e.message}`);
    }
    model = out.model || model;
    tokens += out.usage?.total_tokens ?? 0;
    const { source, fixed } = adaptGlsl(out.code);
    const t = { attempt: i + 1, ms: out.ms ?? null, fixed, chars: source.length, source };
    if (!String(out.code ?? '').trim()) {
      Object.assign(t, { ok: false, error: 'the answer held no program' });
    } else {
      const r = trial(source);
      Object.assign(t, { ok: r.ok, error: r.ok ? '' : firstLine(r.error), flat: !!r.flat, still: !!r.still, change: r.change });
      if (r.ok && !r.flat && !r.still) { tries.push(t); onTry(t); return done('ran', source, ''); }
      if (r.ok && r.still) { still = source; t.error = 'it compiled and the picture did not change between two moments'; }
      if (r.ok && r.flat) t.error = 'it compiled and drew one flat colour';
      error = r.ok ? `${t.error}. Make it vary across the screen and move with uT.` : String(r.error || '');
    }
    if (!t.ok) error = error || t.error;
    tries.push(t); onTry(t);
    previous = source;
  }
  if (still) return done('ran still', still, 'it runs, and did not move between the two moments it was checked at');
  const last = tries.at(-1);
  const why = now() - t0 >= budgetMs && tries.length < attempts ? `${BUDGET_MS / 1000} s went by` : `${tries.length} tries did not run`;
  return done('refused', null, `${why}, the last said: ${last?.error || 'nothing'}`);
}
