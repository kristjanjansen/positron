// demo/shell/worklet.mjs. Getting your own code into an AudioWorkletGlobalScope.
//
// 🔴 A WORKLET HAS NO MODULE LOADER, AND THAT IS THE WHOLE PROBLEM THIS FILE
// EXISTS FOR. `demo/muta/muta-worklet.js` says it in its own words: an
// `AudioWorkletGlobalScope` has *"no `fetch`, no `document`, no
// `XMLHttpRequest` and no module loader"*. `audioWorklet.addModule(url)` takes
// a URL and nothing inside that file may `import` anything. So a page with
// arithmetic in `demo/shell/` and a worklet that needs it has had two bad
// answers available and no good one:
//   - keep a SECOND COPY of the arithmetic in the worklet file, which is the
//     drift `/kit/` exists to catch, and
//   - run the arithmetic on the main thread instead, which for
//     `demo/shell/rhodes.mjs` MEASURED **36.4 ms at note 21** to render one
//     voice to its end, on a page whose whole readout is press to sound.
// Both are recorded in `BACKLOG.md` as what stopped `plans/plan-nola.md` §6.1
// item 6.
//
// ✅ THERE IS A THIRD ANSWER AND IT NEEDS NO DEPENDENCY, NO COMPILER AND NO
// BUILD STEP. `Function.prototype.toString()` returns the source of a function
// as it was written. So the main thread, which already has the module loaded,
// stringifies the functions the worklet needs, joins them into one piece of
// text, wraps that in a `Blob`, and hands `addModule` the object URL. One copy
// of the arithmetic, in one file, reaching both threads.
//
// 🔴 IT IS NOT AN IDEA. IT IS WHAT `@grame/faustwasm` DOES, READ OUT OF ITS OWN
// SOURCE at `src/FaustDspGenerator.ts` lines 386 to 428 while
// `plans/plan-fau.md` §2.4 was being written, and `/fau/` ships it in
// production today. Their version emits eight classes and a `faustData` object
// exactly this way. This is that technique with the guards this project needs.
//
// ── THE THREE LIMITS, WHICH GO HERE AND NOT IN A COMMIT MESSAGE ─────────────
//
// 🔴 1. THE COPY LOSES ITS CLOSURE, AND THIS IS THE ONE THAT WILL BITE.
// `toString()` returns the TEXT of a function and nothing it referred to.
// `rhodesVoice` in `demo/shell/rhodes.mjs` reads `TAU`, a module-level const,
// so a blob holding only `rhodesVoice` defines it fine and throws
// `ReferenceError: TAU is not defined` the first time a note is played, on the
// audio thread, where an exception stops the processor and the page goes silent
// with nothing in the console a reader would connect to a missing constant.
// ⚠️ SO EVERY NAME A CARRIED FUNCTION USES IS PASSED IN `values` TOO, and
// `demo/shell/worklet-test.mjs` proves both halves: the copy computes the same
// numbers as the original, and leaving one name out throws with that name in
// the message.
//
// ⚠️ 2. A BLOB URL NEEDS A SECURE ORIGIN. `addModule` on a `blob:` URL is
// refused on an insecure one, which `faustwasm`'s own source notes in a
// comment. `localhost` and `127.0.0.1` count as secure, so `demo/server.mjs` is
// fine and so is the deploy.
//
// ⚠️ 3. A STRICT `script-src` CONTENT-SECURITY-POLICY BLOCKS `blob:`. Grepped
// across `workers/view/src/` and `workers/view/*.mjs` 2026-09-23: this site
// sets none. That is a negative from a search rather than a reading of the
// deployed headers, so it is worth one `curl -I` the day anything here stops
// working for no reason.
//
// ⚠️ AND IT HAS NO CALLER YET, WHICH IS SAID HERE RATHER THAN LEFT TO BE
// NOTICED. `plans/plan-fau.md` §9.4 step 2 asks for exactly this module, on its
// own, before the page that prompted it, because it is true whether or not
// anything else in that plan is ever built. The caller it was written for is
// `demo/shell/rhodes.mjs` into a worklet on `/nola/`. `/kit/`'s own rule is
// that a control living in one page is a component nobody has noticed yet; this
// is the opposite case and it is the riskier one, so: **if this file still has
// no caller when `plan-nola.md` §6.1 item 6 is closed, delete it.**

/** A JavaScript identifier, which is what a name in `values` has to be. */
const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/**
 * Refuse anything JSON would quietly change on the way across.
 *
 * 🔴 `JSON.stringify` DOES NOT ANSWER `undefined` FOR THE CASES THAT MATTER,
 * WHICH IS WHY THIS EXISTS AND WHY THE FIRST VERSION OF IT WAS WRONG. MEASURED
 * by its own test 2026-09-23: a `Map` stringifies to `{}` and a `Set` to `{}`,
 * so the guard that tested for `undefined` accepted both and a worklet would
 * have received an EMPTY OBJECT where a page had passed a filled table. That is
 * the worst shape this project knows: nothing throws, nothing 404s, and the
 * thing on the audio thread is quietly not the thing that was sent.
 * ⚠️ `NaN` AND `Infinity` ARE THE SAME DEFECT WITH NUMBERS. Both become `null`.
 * A sample rate that arrived as `null` would read as a missing option rather
 * than as a bad number.
 * ⚠️ AND IT WALKS, because a Map nested three deep inside a plain object is the
 * same silent `{}` one level down.
 */
function carryable(v, name) {
  if (v === null) return;
  const t = typeof v;
  if (t === 'string' || t === 'boolean') return;
  if (t === 'number') {
    if (!Number.isFinite(v)) {
      throw new Error(`worklet: ${name} is ${v}, and JSON turns that into null`);
    }
    return;
  }
  if (t !== 'object') {
    throw new Error(`worklet: ${name} is a ${t}, which cannot cross into a worklet`);
  }
  if (Array.isArray(v)) {
    v.forEach((x, i) => carryable(x, `${name}[${i}]`));
    return;
  }
  const proto = Object.getPrototypeOf(v);
  if (proto !== Object.prototype && proto !== null) {
    throw new Error(`worklet: ${name} is a ${v.constructor?.name || 'class instance'}, `
      + 'which JSON flattens to an empty object rather than refusing');
  }
  for (const [k, x] of Object.entries(v)) carryable(x, `${name}.${k}`);
}

/**
 * Turn named functions, classes and constants into one piece of source that an
 * `AudioWorkletGlobalScope` can run.
 *
 * @param {object} o
 * @param {Record<string, any>} [o.values] name -> function, class, or a plain
 *   value JSON carries without changing it. Emitted as `const <name> = …` in
 *   the order given. ⚠️ A CARRIED FUNCTION MAY REFER TO ANY NAME IN THE SET,
 *   whatever the order, because a name inside a function body is read when the
 *   function RUNS and every declaration has landed by then. MEASURED by this
 *   module's own test, which expected the opposite and was wrong. What a
 *   function may never refer to is a name that was not passed at all, which is
 *   the lost closure in the header.
 * @param {string} [o.body] source appended last, where `registerProcessor(…)`
 *   goes. It sees every name in `values`.
 * @returns {string}
 */
export function workletSource({ values = {}, body = '' } = {}) {
  const out = [];
  for (const [name, v] of Object.entries(values)) {
    if (!IDENT.test(name)) {
      throw new Error(`worklet: "${name}" is not a name a const can have`);
    }
    if (typeof v === 'function') {
      const src = Function.prototype.toString.call(v);
      /* 🔴 A NATIVE OR BOUND FUNCTION HAS NO SOURCE TO CARRY, and the failure
         without this check is the worst shape there is: `[native code]` is
         emitted verbatim, the blob is a SyntaxError, `addModule` rejects, and
         the message names the blob URL rather than the function. */
      if (/\{\s*\[native code\]\s*\}/.test(src)) {
        throw new Error(`worklet: ${name} is native or bound, so it has no source to carry`);
      }
      out.push(`const ${name} = ${src};`);
      continue;
    }
    carryable(v, name);
    out.push(`const ${name} = ${JSON.stringify(v)};`);
  }
  if (body) out.push(body);
  return `${out.join('\n\n')}\n`;
}

/**
 * The same source, as a `blob:` URL `addModule` will take.
 *
 * ⚠️ THE CALLER REVOKES. `URL.revokeObjectURL` immediately after `addModule`
 * resolves is correct and is what `addWorklet` below does; a page that builds
 * the URL itself and never revokes leaks the string for the life of the
 * document.
 */
export function workletBlobURL(source) {
  return URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
}

/**
 * Build the source, register it on a context, and clean up the URL.
 *
 * ⚠️ IT RETURNS THE SOURCE IT REGISTERED, which is the only way a page or a
 * check can say what actually reached the audio thread. A page asserting on the
 * source it INTENDED is asserting on its own arithmetic.
 *
 * @param {BaseAudioContext} context
 * @param {{values?: Record<string, any>, body?: string}} spec
 * @returns {Promise<{source: string, url: string}>}
 */
export async function addWorklet(context, spec) {
  const source = workletSource(spec);
  const url = workletBlobURL(source);
  try {
    await context.audioWorklet.addModule(url);
  } finally {
    URL.revokeObjectURL(url);
  }
  return { source, url };
}
