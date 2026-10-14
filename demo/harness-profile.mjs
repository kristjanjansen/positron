// Per-run Chrome profiles (`<prefix>-<pid>`) are removed when the run ends, and profiles of dead
// pids are swept: a killed run runs no handler, and 229 leftovers once filled the disk (about 20
// GB).
// why: lessons/harness.md#profiles

import { rmSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const ROOT = '/private/tmp/claude-501';

// Is this pid running? `EPERM` means alive and not ours.
// why: lessons/harness.md#alive
function alive(pid) {
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
}

// Delete `<prefix>-<pid>` directories whose pid is dead; returns {removed} so a caller can say so.
// why: lessons/harness.md#sweep
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

// Claim a profile for this run and remove it on exit. `rmSync`: an async unlink in an `exit`
// handler never completes. `exit` covers an uncaught throw; signals get their own listener.
// why: lessons/harness.md#claim
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
  // It stringifies to the path: `[object Object]` is a valid relative path, so Chrome would make a
  // profile by that name in the cwd, which the sweep cannot find (no pid in the name).
  // why: lessons/harness.md#to-string
  const out = { dir, clean, swept: removed };
  Object.defineProperty(out, 'toString', { value: () => dir, enumerable: false });
  Object.defineProperty(out, Symbol.toPrimitive, { value: () => dir, enumerable: false });
  return out;
}
