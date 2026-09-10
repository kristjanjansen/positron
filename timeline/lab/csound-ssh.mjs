#!/usr/bin/env node
// timeline/lab/csound-ssh.mjs — run csound on ANOTHER MACHINE, as if it were here.
//
//   CSOUND=timeline/lab/csound-ssh.mjs node timeline/lab/csound-oracle.mjs
//
// WHY. The oracle is the only check that can catch a MISREADING of the score
// format, and it is worthless on a machine with no csound. This machine has
// none; a Mac on the LAN does. So this stands in for the binary: it takes the
// same argv, ships any argument that names a LOCAL FILE over ssh, runs the real
// csound there, and prints its stdout and stderr back.
//
//   CSOUND_SSH_HOST   ssh destination           (default: mbp)
//   CSOUND_SSH_BIN    csound path ON THAT HOST  (default: /opt/homebrew/bin/csound)
//
// The remote path must be ABSOLUTE: a non-interactive ssh shell gets a minimal
// PATH with no /opt/homebrew/bin in it, so a bare `csound` is "command not
// found" — which reads as "csound is broken" rather than "the PATH is short".
//
// Files travel base64 INSIDE the one ssh command rather than by scp, so a probe
// costs one round trip and leaves nothing behind on either machine.

import { spawnSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { basename } from 'node:path';

const HOST = process.env.CSOUND_SSH_HOST || 'mbp';
const BIN = process.env.CSOUND_SSH_BIN || '/opt/homebrew/bin/csound';
const q = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;

const writes = [];
const seen = new Map();
const argv = process.argv.slice(2).map((a) => {
  let st = null;
  try { st = statSync(a); } catch { /* not a path */ }
  if (!st || !st.isFile()) return q(a);
  // basenames can collide across two temp dirs; number them so they cannot
  let name = basename(a);
  if (seen.has(name)) name = `${seen.get(name)}-${name}`;
  seen.set(name, (seen.get(name) || 0) + 1);
  writes.push(`printf %s ${q(readFileSync(a).toString('base64'))} | base64 -d > "$D"/${q(name)}`);
  return `"$D"/${q(name)}`;
});

const script = [
  'D=$(mktemp -d)',
  ...writes,
  `${q(BIN)} ${argv.join(' ')}`,
  'rc=$?',
  'rm -rf "$D"',
  'exit $rc',
].join('\n');

const r = spawnSync('ssh', ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=8', HOST, 'sh -s'], {
  input: script, encoding: 'utf8',
});
if (r.error || r.status === 255) {
  process.stderr.write(`csound-ssh: cannot reach ${HOST}: ${r.error?.message || r.stderr || 'ssh failed'}\n`);
  process.exit(127);
}
process.stdout.write(r.stdout || '');
process.stderr.write(r.stderr || '');
process.exit(r.status ?? 1);
