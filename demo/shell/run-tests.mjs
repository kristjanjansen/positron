// demo/shell/run-tests.mjs: every demo/shell/*-test.mjs that needs no network,
// one after another, as a pass/fail table. Exits 1 when any test fails.
//
//   node demo/shell/run-tests.mjs              all of them
//   node demo/shell/run-tests.mjs bay diagram  only these, by name without -test.mjs
//
// A test that exits 77 measured nothing (a fixture is absent) and reads SKIP,
// never pass. Each test gets 60 s; a timeout is a failure.

import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const TIMEOUT = 60000;
const SKIP_CODE = 77;

// They open sockets: to the relay, and to shout and a station behind it.
const NETWORK = {
  'board-collide-test.mjs': 'opens a socket to the relay',
  'mp3-frames-test.mjs': 'opens a socket to shout and the station behind it',
};

const want = process.argv.slice(2);
const files = readdirSync(HERE).filter((f) => f.endsWith('-test.mjs')).sort()
  .filter((f) => !want.length || want.includes(f.replace(/-test\.mjs$/, '')));
if (!files.length) { console.error(`no test matches ${want.join(' ')}`); process.exit(2); }

function run(file) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const child = spawn(process.execPath, [join(HERE, file)], { cwd: join(HERE, '..', '..'), stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (c) => { out += c; });
    child.stderr.on('data', (c) => { out += c; });
    const timer = setTimeout(() => child.kill('SIGKILL'), TIMEOUT);
    child.on('exit', (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal, out, ms: Date.now() - t0 });
    });
  });
}

// the test's own last word: a "N ok, M failed" or "N/M green" line, else its last line
const summary = (out) => {
  const lines = out.split('\n').map((l) => l.trim()).filter(Boolean);
  const tally = lines.filter((l) => /\d+ ok\b|\d+\/\d+ green|\bpassed\b|SKIP/i.test(l)).at(-1);
  return (tally || lines.at(-1) || '(no output)').slice(0, 90);
};

const rows = [];
for (const f of files) {
  const name = f.replace(/-test\.mjs$/, '');
  if (NETWORK[f]) { rows.push({ name, result: 'SKIP', ms: 0, note: NETWORK[f] }); continue; }
  const r = await run(f);
  const result = r.signal ? 'FAIL' : r.code === 0 ? 'pass' : r.code === SKIP_CODE ? 'SKIP' : 'FAIL';
  const note = r.signal ? `killed after ${TIMEOUT / 1000} s` : summary(r.out);
  rows.push({ name, result, ms: r.ms, note, out: r.out, code: r.code });
}

const w = Math.max(...rows.map((r) => r.name.length));
console.log(`${'test'.padEnd(w)}  result  time    last word`);
for (const r of rows) {
  console.log(`${r.name.padEnd(w)}  ${r.result.padEnd(6)}  ${(r.ms / 1000).toFixed(1).padStart(5)} s  ${r.note}`);
}
const n = (k) => rows.filter((r) => r.result === k).length;
console.log(`\n${n('pass')} passed, ${n('FAIL')} failed, ${n('SKIP')} skipped, of ${rows.length}`);

const failed = rows.filter((r) => r.result === 'FAIL');
for (const r of failed) {
  console.log(`\n── ${r.name} (exit ${r.code}) ──`);
  console.log(r.out.split('\n').filter((l) => /FAIL|Error|error/.test(l)).slice(0, 15).join('\n') || r.out.slice(-1500));
}
process.exit(failed.length ? 1 : 0);
