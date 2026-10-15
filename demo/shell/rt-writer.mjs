// demo/shell/rt-writer.mjs: runtime of a `writer` node, a sentence that comes out of program-out as a
// program. The model is the wish worker's /code; each answer is tried off the running program (a GLSL
// shader in a sandbox GL of its own, a SuperCollider synth by the trial a page hands in), so what runs
// changes only when a program has passed.

import { createMirrorShader, glslContract } from './mirror-shader.mjs';
import { writeProgram, checkPicture, TRIAL_TIMES, VERSION, bodyError } from './glsl-writer.mjs';
import { writeSclang, sclangContract } from './sclang-writer.mjs';

/** Per language: the contract the page sends and the loop. A trial for `sclang` comes from the page. */
const LANGS = {
  glsl: { contract: glslContract, loop: writeProgram },
  sclang: { contract: sclangContract, loop: writeSclang },
};

export const WISH_API = 'https://wish.positron.studio';
/** One model call may take this long before it counts as not answering. */
export const ASK_TIMEOUT_MS = 30000;

/**
 * @param {object} o
 * @param {(line: string, kind?: string) => void} o.log
 * @param {(port: string, ev: object) => void} o.send  onto this node's own ports
 * @param {string} [o.api]  the wish worker
 * @param {string} [o.model]  one of the worker's CODE models, or its default
 * @param {Function} [o.ask]  stands in for the worker (the self-check's canned programs)
 * @param {'glsl'|'sclang'} [o.lang]
 * @param {(source: string) => Promise<object>} [o.trial]  the language's own trial, where it is not GLSL's sandbox
 */
export function make({ log, send, api = WISH_API, model = '', ask = null, lang = 'glsl', trial: given = null }) {
  if (!LANGS[lang]) throw new Error(`rt-writer: no language ${lang}`);
  if (lang !== 'glsl' && !given) throw new Error(`rt-writer: ${lang} needs a trial from the page`);
  let sandbox = null, writes = 0, asked = 0, busy = false, last = null;
  function trial(body) {
    sandbox ??= createMirrorShader({ w: 160, h: 90 });
    if (!sandbox.gl) return { ok: false, error: 'this browser has no WebGL2 to try the program in' };
    const out = sandbox.build(VERSION + body);
    if (!out.ok) return { ok: false, error: bodyError(out.error) };
    sandbox.render(8, { t: TRIAL_TIMES[0] });
    const a = sandbox.pixels();
    sandbox.render(8, { t: TRIAL_TIMES[1] });
    return { ok: true, ...checkPicture(a, sandbox.pixels()) };
  }
  async function askWorker({ text, previous, error }) {
    asked++;
    let r;
    try {
      r = await fetch(`${api}/code`, { method: 'POST', headers: { 'content-type': 'application/json' },
        signal: AbortSignal.timeout(ASK_TIMEOUT_MS),
        body: JSON.stringify({ text, lang, contract: LANGS[lang].contract(), previous, error, ...(model ? { model } : {}) }) });
    } catch (e) {
      throw new Error(e?.name === 'TimeoutError' ? `no answer in ${ASK_TIMEOUT_MS / 1000} s` : `nothing answered at ${api}`);
    }
    const out = await r.json().catch(() => ({}));
    // A refusal for asking too often is said as the worker wrote it, so the page can show it plainly.
    if (r.status === 429) throw Object.assign(new Error(out.error || 'too many requests from here, wait a minute'), { plain: true });
    if (!r.ok) throw new Error(`the agent said: ${out.error || `HTTP ${r.status}`}`);
    return out;
  }
  /** Write a program for `text` (with `base`, a revision of that program); a program that passed
   *  leaves on program-out, anything else leaves nothing. */
  async function write(text, { onTry, base = null } = {}) {
    if (busy) return null;
    busy = true; writes++;
    try {
      last = await LANGS[lang].loop({ text, base, ask: ask || askWorker, trial: given || trial, onTry });
      if (last.source) send('program-out', { of: 'program', source: last.source, at: Date.now() });
      return last;
    } finally { busy = false; }
  }
  return {
    write,
    lang,
    trial: given || trial,
    busy: () => busy,
    last: () => last,
    heard: () => writes,
    asked: () => asked,
    close() { sandbox?.gl?.getExtension('WEBGL_lose_context')?.loseContext(); sandbox = null; },
  };
}
