// demo/harness-profile.mjs — a harness cleans up after itself.
//
// 🔴 WHY THIS EXISTS, AND THE NUMBER IS THE ARGUMENT. Every harness here
// launches Chrome with a per-run `--user-data-dir`, for good reasons written
// down in `verify.mjs`: a shared profile is a shared HTTP cache (the opaque
// response bug), and Chrome writes its real CDP port INSIDE the profile, so two
// runs sharing one directory drive each other's browser.
//
// Nothing ever deleted them. MEASURED 2026-09-14: **229 leftover profiles,
// about 20 GB**, and the volume was down to **119 MB free** — at which point
// `find` itself failed with ENOSPC and the session could not run a shell
// command at all. A fresh Chrome profile is ~250 MB and this suite gets run
// dozens of times in a working day, so the leak is roughly a gigabyte an hour
// of ordinary use.
//
// ⚠️ IT IS NOT ENOUGH TO CLEAN UP ON THE WAY OUT. A harness that is Ctrl-C'd,
// `kill -9`'d, or dies on ENOSPC runs no handler at all — and those are exactly
// the runs that happen when something is already wrong. So there are two
// halves, and the second is what actually recovers a machine:
//
//   1. remove OUR directory when this process ends, however it ends
//   2. SWEEP directories belonging to processes that are no longer alive
//
// The sweep is the one that matters, and it is safe because the pid is in the
// name: a directory is only removed when its owner is gone. A run in progress
// in another terminal keeps its profile.

import { rmSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const ROOT = '/private/tmp/claude-501';

/** Is this pid still running? `EPERM` means alive and not ours — leave it. */
function alive(pid) {
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
}

/**
 * Delete profile directories named `<prefix>-<pid>` whose pid is dead.
 * @returns {{removed: number}} so a caller can SAY it happened — a cleanup
 *   nobody is told about is one nobody can tell apart from a leak.
 */
export function sweepStale(prefix) {
  let names = [];
  try { names = readdirSync(ROOT); } catch { return { removed: 0 }; }
  const re = new RegExp(`^${prefix}-(\\d+)$`);
  let removed = 0;
  for (const name of names) {
    const m = name.match(re);
    if (!m) continue;
    const pid = Number(m[1]);
    if (pid === process.pid || alive(pid)) continue;
    try { rmSync(join(ROOT, name), { recursive: true, force: true }); removed++; } catch { /* racing another sweep */ }
  }
  return { removed };
}

/**
 * Claim a profile directory for this run and arrange for it to go away.
 *
 * ⚠️ `rmSync`, NOT the promise API. `process.on('exit')` runs synchronously and
 * an async unlink scheduled there never completes — the handler would look
 * correct and delete nothing, which is the shape of leak this file is about.
 *
 * ⚠️ AND `exit` COVERS AN UNCAUGHT THROW. Node emits it after printing the
 * stack, so a harness that dies mid-run still tidies up; only a signal needs
 * its own listener, and only because the default action is to terminate without
 * emitting `exit`.
 */
export function claimProfile(prefix) {
  const { removed } = sweepStale(prefix);
  const dir = join(ROOT, `${prefix}-${process.pid}`);
  let done = false;
  const clean = () => {
    if (done) return;
    done = true;
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ }
  };
  process.on('exit', clean);
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    process.on(sig, () => { clean(); process.exit(130); });
  }
  return { dir, clean, swept: removed };
}
