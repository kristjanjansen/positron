// timeline/lab/run-midi.mjs — arm F: Web MIDI timestamped send -> node virtual
// port, arrival stamped on the truth clock. Two modes: 'queue' (browser MIDI
// stack does the timing from one batch of timestamped sends) vs 'fire'
// (setTimeout-per-event immediate sends — the JS-timer baseline).
// Run AFTER run-lab.mjs (reuses port 8896 + CDP 9321, tlab patterns).
import { spawn, execSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { openSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CDP } from './cdp.mjs';

const LAB = dirname(fileURLToPath(import.meta.url));
const SCRATCH = '/private/tmp/claude-501/-Users-s32863-personal-elektron/596385e3-9b74-4f17-837f-b4eb2eb5a254/scratchpad';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sh = (cmd) => { try { return execSync(cmd, { encoding: 'utf8' }); } catch (e) { return e.stdout || ''; } };
const kids = [];
function run(cmd, argv, name) {
  const fd = openSync(join(SCRATCH, `tlab-${name}.log`), 'a');
  const p = spawn(cmd, argv, { stdio: ['ignore', fd, fd] });
  kids.push(p);
  return p;
}
const q = (s, p) => s.length ? s[Math.min(s.length - 1, Math.floor(p / 100 * s.length))] : null;
const stats = (a) => {
  const s = a.slice().sort((x, y) => x - y);
  return { n: s.length, p50: +q(s, 50)?.toFixed(3), p95: +q(s, 95)?.toFixed(3), p99: +q(s, 99)?.toFixed(3), min: +s[0]?.toFixed(3), max: +s[s.length - 1]?.toFixed(3) };
};

async function main() {
  sh(`pkill -f 'tlab-udd' 2>/dev/null`); sh(`pkill -f 'timeline/lab/server.mjs' 2>/dev/null`); sh(`pkill -f 'timeline/lab/midi-recv' 2>/dev/null`);
  await sleep(500);
  await mkdir(join(LAB, 'results'), { recursive: true });
  run('node', [join(LAB, 'server.mjs')], 'server');
  for (let i = 0; i < 40; i++) { try { await fetch('http://127.0.0.1:8896/time-local'); break; } catch { await sleep(250); } }

  const recvOut = join(LAB, 'results', 'midi-arrivals.jsonl');
  await writeFile(recvOut, '');
  run('node', [join(LAB, 'midi-recv.mjs'), recvOut], 'midi-recv');
  await sleep(1500);

  run(CHROME, [
    '--headless=new', `--user-data-dir=${SCRATCH}/tlab-udd`, '--remote-debugging-port=9321',
    '--no-first-run', '--no-default-browser-check', '--autoplay-policy=no-user-gesture-required',
    'http://127.0.0.1:8896/lab/midi.html',
  ], 'chrome-midi');

  const browser = await new CDP().connectBrowser(9321);
  await browser.send('Browser.grantPermissions', { origin: 'http://127.0.0.1:8896', permissions: ['midi', 'midiSysex'] })
    .catch(async (e) => {
      console.log('grant midi+sysex failed (' + e.message + '), retrying midi only');
      await browser.send('Browser.grantPermissions', { origin: 'http://127.0.0.1:8896', permissions: ['midi'] }).catch((e2) => console.log('grant midi:', e2.message));
    });
  const page = await new CDP().connect(9321, 'midi.html');

  const summary = {};
  for (const mode of ['queue', 'fire']) {
    const before = (await readFile(recvOut, 'utf8')).trim().split('\n').filter(Boolean).length;
    console.log(`[F] midi ${mode}: 600 notes @20 ms…`);
    const r = await page.eval(`tmidi.runMidi({mode:${JSON.stringify(mode)}})`);
    if (r.error) { console.log('  SKIP:', r.error, JSON.stringify(r.ports || [])); summary[mode] = { error: r.error }; continue; }
    await sleep(1000);
    const lines = (await readFile(recvOut, 'utf8')).trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)).slice(before);
    // join by seq: note = seq%128, vel = floor(seq/128)%128
    const bySeq = new Map();
    for (const a of lines) if (a.status === 0x90) bySeq.set(a.vel * 128 + a.note, a);
    const deltas = [];
    let missing = 0;
    for (const s of r.sends) {
      const a = bySeq.get(s.seq);
      if (!a) { missing++; continue; }
      deltas.push((a.tUs - s.intendedUs) / 1000);
    }
    summary[mode] = { sent: r.sends.length, received: lines.length, missing, cal: r.cal, deltaMs: stats(deltas) };
    console.log(`  ${mode}: recv ${lines.length}/${r.sends.length}, delta p50=${summary[mode].deltaMs.p50} p95=${summary[mode].deltaMs.p95} p99=${summary[mode].deltaMs.p99} ms`);
  }
  await writeFile(join(LAB, 'artifacts', 'midi-2026-08-27.json'), JSON.stringify(summary, null, 2));
  console.log('midi summary -> artifacts/midi-2026-08-27.json');
}

async function cleanup() {
  for (const p of kids) { try { p.kill(); } catch {} }
  sh(`pkill -f 'tlab-udd' 2>/dev/null`); sh(`pkill -f 'timeline/lab/server.mjs' 2>/dev/null`); sh(`pkill -f 'timeline/lab/midi-recv' 2>/dev/null`);
}
main().then(cleanup, async (e) => { console.error('FATAL', e); await cleanup(); process.exit(1); });
