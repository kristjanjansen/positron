// demo/shell/selfcheck.mjs — is a harness watching, or is a person?
//
// 🔴 A SELF-CHECK NEVER RUNS FOR A VISITOR. NOT ONE, NOT EVER, ON ANY PAGE.
// Instructed 2026-09-16: *"rip those selfchecks out of user experience and make
// rule about it"*. `demo/verify.mjs` appends `selfcheck=1` to every page it
// opens, and the DEFAULT IS OFF, so a page reads this and puts anything that
// costs a visitor something behind it.
//
// ⚠️ IT IS A STRICT SUBSET, NOT A SWITCH. Everything gradable from data the
// page already holds still runs for everybody, because an assert over numbers
// in hand costs a visitor nothing and is the thing that catches drift. What
// moves behind the gate is anything that OPENS A FILE, MAKES A SOUND, PRESSES A
// CONTROL, OR MOVES THE PICTURE. The test is: if a person were watching this
// page, would they see it happen?
//
// ⚠️ AND THE GATE COVERS THE WHOLE COST, NOT THE AUDIBLE PART. `/tapes/` was
// repaired twice before this was understood: once by shutting its sound gate,
// once by stopping it asking archive.org for durations. It was still spending a
// visitor's bandwidth on a 12 MB recording and running its transport in front
// of them, silently, and the third report was *"omg you still do not get it"*.
//
// ⚠️ WHY THIS IS A MODULE AND NOT ONE LINE PER PAGE. It was one line per page
// for four pages, and the other forty-one never grew it. One import is
// greppable: `grep -L selfcheck demo/*/index.html` answers which pages have
// never been swept, and a page that reads the flag some other way does not show
// up in that answer.

/**
 * True when a harness opened this page, false when a person did.
 *
 * Read once at module load, because the flag cannot change without a
 * navigation and a page that re-reads it per assert invites a check that is
 * gated in one place and not in another.
 */
export const SELFCHECK = new URLSearchParams(location.search).get('selfcheck') === '1';

/**
 * Run `fn` only under a harness, and say so in the log when a person is
 * watching instead.
 *
 * ⚠️ THE `say` HALF IS THE POINT. A check that simply vanishes for a visitor
 * leaves a page whose readout has empty cells and no account of why, which
 * reads as a measurement that went missing. One line in the log is the
 * difference between "we did not look" and "we looked and it was fine".
 *
 * @param {() => any} fn the costly half: opens a file, makes a sound, presses a
 *   control, or moves the picture.
 * @param {{ log?: (s: string) => void, say?: string }} [opts] `log` is the
 *   page's logger (`d.log`), `say` the line to write when it is skipped.
 * @returns {any} whatever `fn` returned, or `undefined` when it did not run.
 */
export function ifSelfcheck(fn, opts = {}) {
  if (SELFCHECK) return fn();
  if (opts.log && opts.say) opts.log(opts.say);
  return undefined;
}
