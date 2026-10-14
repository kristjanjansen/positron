#!/usr/bin/env node
// CSOUND=timeline/lab/csound-ssh.mjs node timeline/lab/csound-oracle.mjs: csound on another machine
// (CSOUND_SSH_HOST, CSOUND_SSH_BIN as an absolute path, since ssh's PATH is minimal). Local files
// travel base64 inside the one ssh command, so nothing is left behind.
// why: lessons/timeline-lab.md#cs-header

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
