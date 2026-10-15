// demo/shell/rt-writer.mjs: runtime of a `writer` node, a sentence that comes out of program-out as a
// fragment shader. The model is the wish worker's /code; each answer is compiled and looked at in a
// sandbox GL of its own, so the picture on screen changes only when a program has passed.

import { createMirrorShader, glslContract } from './mirror-shader.mjs';
import { writeProgram, checkPicture, TRIAL_TIMES, VERSION, bodyError } from './glsl-writer.mjs';

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
 */
export function make({ log, send, api = WISH_API, model = '', ask = null }) {
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
        body: JSON.stringify({ text, lang: 'glsl', contract: glslContract(), previous, error, ...(model ? { model } : {}) }) });
    } catch (e) {
      throw new Error(e?.name === 'TimeoutError' ? `no answer in ${ASK_TIMEOUT_MS / 1000} s` : `nothing answered at ${api}`);
    }
    const out = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`the agent said: ${out.error || `HTTP ${r.status}`}`);
    return out;
  }
  /** Write a program for `text`; a program that passed leaves on program-out, anything else leaves nothing. */
  async function write(text, { onTry } = {}) {
    if (busy) return null;
    busy = true; writes++;
    try {
      last = await writeProgram({ text, ask: ask || askWorker, trial, onTry });
      if (last.source) send('program-out', { of: 'program', source: last.source, at: Date.now() });
      return last;
    } finally { busy = false; }
  }
  return {
    write,
    trial,
    busy: () => busy,
    last: () => last,
    heard: () => writes,
    asked: () => asked,
    close() { sandbox?.gl?.getExtension('WEBGL_lose_context')?.loseContext(); sandbox = null; },
  };
}
