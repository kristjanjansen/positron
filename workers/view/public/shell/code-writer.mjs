// demo/shell/code-writer.mjs: the loop that turns a sentence into a running program, for any language
// (plans/plan-text-to-code.md section 3): ask, adapt, try, judge, retry with the refusal. Pure: the
// model, the adapter, the trial and the judge are handed in, one set per language (glsl-writer.mjs,
// sclang-writer.mjs). Nothing here touches what is running now.

export const ATTEMPTS = 3;
export const BUDGET_MS = 15000;

/** FNV-1a, 8 hex: lets a log line be matched to a program without carrying it. */
export function hashOf(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

/**
 * Ask, adapt, try and judge, at most `attempts` times or until `budgetMs` has gone.
 * @param {object} o
 * @param {string} o.text  the sentence
 * @param {string} [o.base]  the program running now: the first ask revises it as `text` says
 * @param {(q: { text: string, previous: string|null, error: string|null }) => Promise<{ code: string, ms?: number, model?: string, usage?: object }>} o.ask
 * @param {(code: string) => { source: string, fixed: string[] }} o.adapt  reported rewrites
 * @param {(source: string) => object|Promise<object>} o.trial  compiles and checks, off the running program
 * @param {(r: object) => { pass?: boolean, keep?: boolean, say?: string, retry?: string, fields?: object }} o.judge
 *   `pass` runs it; `keep` holds it as a last resort; `say` is the try's line; `retry` what the model is told
 * @param {string} [o.kept]  the verdict when only a kept program is left, and `keptWhy` what it says
 * @returns {Promise<{ verdict: string, source: string|null, error: string, tries: object[], ms: number, tokens: number, model: string }>}
 */
export async function writeLoop({ text, base = null, ask, adapt, trial, judge, kept = 'ran kept', keptWhy = '',
  attempts = ATTEMPTS, budgetMs = BUDGET_MS, now = () => Date.now(), onTry = () => {} }) {
  const t0 = now();
  const tries = [];
  let previous = base || null, error = null, keep = null, model = '', tokens = 0;
  const done = (verdict, source, why) => ({ verdict, source, error: why, tries, ms: now() - t0, tokens, model });
  for (let i = 0; i < attempts; i++) {
    if (i > 0 && now() - t0 >= budgetMs) break;
    let out;
    try { out = await ask({ text, previous, error }); } catch (e) {
      tries.push({ attempt: i + 1, stage: 'ask', error: e.message });
      onTry(tries.at(-1));
      return done('failed', keep, e.plain ? e.message : `nothing answered: ${e.message}`);
    }
    model = out.model || model;
    tokens += out.usage?.total_tokens ?? 0;
    const { source, fixed } = adapt(out.code);
    const t = { attempt: i + 1, ms: out.ms ?? null, fixed, chars: source.length, source };
    if (!String(out.code ?? '').trim()) {
      Object.assign(t, { ok: false, error: 'the answer held no program' });
    } else {
      const r = await trial(source);
      const j = judge(r);
      Object.assign(t, { ok: !!r.ok, error: j.say || '', ...(j.fields || {}) });
      if (j.pass) { tries.push(t); onTry(t); return done('ran', source, ''); }
      if (j.keep) keep = source;
      error = j.retry || t.error || 'it did not work';
    }
    if (!t.ok) error = error || t.error || 'it did not work';
    tries.push(t); onTry(t);
    previous = source;
  }
  if (keep) return done(kept, keep, keptWhy);
  const last = tries.at(-1);
  const why = now() - t0 >= budgetMs && tries.length < attempts ? `${budgetMs / 1000} s went by` : `${tries.length} tries did not run`;
  return done('refused', null, `${why}, the last said: ${last?.error || 'nothing'}`);
}
