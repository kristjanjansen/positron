// demo/shell/selfcheck.mjs: is a harness watching, or a person? Default off; verify.mjs appends
// ?selfcheck=1. Anything that opens a file, makes a sound, presses a control or moves the
// picture goes behind it; asserts over numbers already in hand run for everybody.
// why: lessons/kit-selfcheck.md#header

/**
 * True when a harness opened this page, read once at load. selfcheck=1 is the ordinary run,
 * selfcheck=2 (DEMO_DEEP=1) adds the long-running checks; a skipped deep check says so in the log.
 * why: lessons/kit-selfcheck.md#selfcheck
 */
const LEVEL = new URLSearchParams(location.search).get('selfcheck');
export const SELFCHECK = LEVEL === '1' || LEVEL === '2';
export const DEEP = LEVEL === '2';

/** Run `fn` on a deep run only; on an ordinary one, log what was left out. */
export function ifDeep(fn, { log, say } = {}) {
  if (DEEP) return fn();
  if (SELFCHECK && log && say) log(`left for the deep run: ${say}`);
  return undefined;
}

/**
 * Run `fn` only under a harness, and say so in the log when a person is watching instead,
 * so an empty readout cell has an account of why.
 * @param {() => any} fn the costly half: opens a file, makes a sound, presses a
 *   control, or moves the picture.
 * @param {{ log?: (s: string) => void, say?: string }} [opts] `log` is the
 *   page's logger (`d.log`), `say` the line to write when it is skipped.
 * @returns {any} whatever `fn` returned, or `undefined` when it did not run.
 * why: lessons/kit-selfcheck.md#if-selfcheck
 */
export function ifSelfcheck(fn, opts = {}) {
  if (SELFCHECK) return fn();
  if (opts.log && opts.say) opts.log(opts.say);
  return undefined;
}
