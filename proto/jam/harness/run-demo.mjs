// proto/jam/harness/run-demo.mjs — headless verification of the two demos.
//   node harness/run-demo.mjs [--page jam|jam-interval] [--transport dc|do|moq] [--secs 60]
// Launches the jam pair, runs a 60 s auto-duet (both directions), screenshots
// with the HUD visible, writes the event logs to results/jam-<page>-<role>.jsonl,
// then replays each page's session through the same render path and checks the
// fired-note count matches the log.

import { spawn, execSync } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import { openSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CDP } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const JAM = join(HERE, '..');
const SCRATCH = '/private/tmp/claude-501/-Users-s32863-personal-elektron/596385e3-9b74-4f17-837f-b4eb2eb5a254/scratchpad';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = 'http://127.0.0.1:8893';

const args = process.argv.slice(2);
const opt = (name, dflt) => args.includes('--' + name) ? args[args.indexOf('--' + name) + 1] : dflt;
const PAGE = opt('page', 'jam');
const TRANSPORT = opt('transport', 'dc');
const SECS = +opt('secs', 60);
const SESSION = Math.random().toString(36).slice(2, 8);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const kids = [];
function run(cmd, argv, name) {
  const fd = openSync(join(SCRATCH, `jam-demo-${name}.log`), 'a');
  const p = spawn(cmd, argv, { stdio: ['ignore', fd, fd] });
  kids.push(p);
  return p;
}
const sh = (c) => { try { return execSync(c, { encoding: 'utf8' }); } catch (e) { return e.stdout || ''; } };

async function main() {
  await mkdir(join(JAM, 'results'), { recursive: true });
  sh(`pkill -f 'jam-udd' 2>/dev/null`); sh(`pkill -f 'proto/jam/server.mjs' 2>/dev/null`);
  await sleep(700);
  run('node', [join(JAM, 'server.mjs')], 'server');
  for (let i = 0; i < 40; i++) { try { await fetch(BASE + '/time-local'); break; } catch { await sleep(250); } }

  const flags = (udd, port) => [
    '--headless=new', `--user-data-dir=${SCRATCH}/${udd}`, `--remote-debugging-port=${port}`,
    '--no-first-run', '--no-default-browser-check', '--mute-audio',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-features=IntensiveWakeUpThrottling,WebRtcHideLocalIpsWithMdns',
    '--autoplay-policy=no-user-gesture-required', '--window-size=1200,900',
  ];
  const url = (peer) => `${BASE}/${PAGE}.html?peer=${peer}&session=${SESSION}&transport=${TRANSPORT}`;
  run(CHROME, [...flags('jam-udd-a', 9231), url('a')], 'chrome-a');
  run(CHROME, [...flags('jam-udd-b', 9232), url('b')], 'chrome-b');

  const cdpA = await new CDP().connect(9231, PAGE + '.html');
  const cdpB = await new CDP().connect(9232, PAGE + '.html');
  for (const c of [cdpA, cdpB]) {
    let ok = false;
    for (let i = 0; i < 80; i++) {
      ok = await c.eval('window.jamReady === true', { awaitPromise: false }).catch(() => false);
      if (ok) break;
      await sleep(500);
    }
    if (!ok) throw new Error('page did not become jamReady (transport setup failed?)');
  }
  console.log(`duet ${PAGE} transport=${TRANSPORT} session=${SESSION} — playing ${SECS}s both directions…`);
  const [sa, sb] = await Promise.all([
    cdpA.eval(`window.jamAuto(${SECS * 1000})`),
    cdpB.eval(`window.jamAuto(${SECS * 1000})`),
  ]);
  await sleep(2500); // in-flight notes + interval-mode quantized tails
  const statsA = await cdpA.eval('window.jamStats()', { awaitPromise: false });
  const statsB = await cdpB.eval('window.jamStats()', { awaitPromise: false });
  console.log('a:', JSON.stringify(statsA));
  console.log('b:', JSON.stringify(statsB));

  // event logs -> results/jam-<page>-<role>.jsonl (flat {at,kind,source,raw} lines)
  for (const [role, cdp] of [['a', cdpA], ['b', cdpB]]) {
    const log = await cdp.eval('window.jamLog()', { awaitPromise: false });
    await writeFile(join(JAM, 'results', `jam-${PAGE}-${role}.jsonl`), log.map((e) => JSON.stringify(e)).join('\n') + '\n');
  }

  // replay through the same render path; count must match the log
  console.log('replaying both sessions…');
  const [ra, rb] = await Promise.all([
    cdpA.eval('window.jamReplay()'),
    cdpB.eval('window.jamReplay()'),
  ]);
  console.log('replay a:', JSON.stringify(ra), ' b:', JSON.stringify(rb));

  await cdpA.screenshot(join(JAM, 'results', `jam-${PAGE}-a.png`));
  await cdpB.screenshot(join(JAM, 'results', `jam-${PAGE}-b.png`));

  const verdict = {
    page: PAGE, transport: TRANSPORT, session: SESSION, secs: SECS,
    a: statsA, b: statsB, replayA: ra, replayB: rb,
    checks: {
      bothDirections: statsA.recvRemote > 0 && statsB.recvRemote > 0,
      replayCountA: ra.fired === ra.logged,
      replayCountB: rb.fired === rb.logged,
      lossA: statsB.sentLocal - statsA.recvRemote,
      lossB: statsA.sentLocal - statsB.recvRemote,
    },
  };
  await writeFile(join(JAM, 'results', `demo-verify-${PAGE}-${TRANSPORT}.json`), JSON.stringify(verdict, null, 2));
  console.log('VERDICT', JSON.stringify(verdict.checks));
}

async function cleanup() {
  for (const p of kids) { try { p.kill(); } catch {} }
  sh(`pkill -f 'jam-udd' 2>/dev/null`); sh(`pkill -f 'proto/jam/server.mjs' 2>/dev/null`);
}
main().then(cleanup, async (e) => { console.error('FATAL', e); await cleanup(); process.exit(1); });
