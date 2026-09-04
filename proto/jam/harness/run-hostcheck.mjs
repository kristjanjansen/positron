// proto/jam/harness/run-hostcheck.mjs — headless verification of host-check.html.
//
// ONE Chrome (hostcheck-udd), its OWN server on :8898 (8893 belongs to a
// sibling MoQ run). No real hardware exists here, so the page runs its
// stand-in path: --use-fake-device-for-media-stream satisfies getUserMedia (so
// the CONSTRAINT CHECKS are exercised for real), while the measured chain uses
// the built-in percussive voice -> MediaStreamAudioDestination as the synth.
//
// Asserts: A/B/C produce numbers, the constraint checks render, the distance
// slider moves the MEASURED return latency by the amount set (±5 ms at 30/60),
// zero console errors. Screenshots the completed report.

import { spawn, execSync } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import { openSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CDP } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const JAM = join(HERE, '..');
const SCRATCH = '/private/tmp/claude-501/-Users-s32863-personal-positron/596385e3-9b74-4f17-837f-b4eb2eb5a254/scratchpad';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 8898;
const BASE = `http://127.0.0.1:${PORT}`;

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes('--' + n) ? args[args.indexOf('--' + n) + 1] : d);
const SOAK = +opt('soak', 8);
const KEEP = args.includes('--keep');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sh = (c) => { try { return execSync(c, { encoding: 'utf8' }); } catch (e) { return (e.stdout || '') + (e.stderr || ''); } };
const kids = [];
function run(cmd, argv, name) {
  const fd = openSync(join(SCRATCH, `hostcheck-${name}.log`), 'a');
  const p = spawn(cmd, argv, { stdio: ['ignore', fd, fd] });
  kids.push(p);
  console.log(`spawned ${name} pid=${p.pid}`);
  return p;
}

const consoleErrs = [];
function attachEvents(cdp) {
  cdp.ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && cdp.pending.has(m.id)) { cdp.pending.get(m.id)(m); cdp.pending.delete(m.id); return; }
    if (m.method === 'Runtime.exceptionThrown') {
      consoleErrs.push('exception: ' + (m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '').slice(0, 200));
    }
    if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'assert')) {
      consoleErrs.push('console.' + m.params.type + ': ' + (m.params.args || []).map((a) => a.value ?? a.description).join(' ').slice(0, 200));
    }
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
      consoleErrs.push('log: ' + String(m.params.entry.text).slice(0, 160) + ' <' + (m.params.entry.url || '?') + '>');
    }
  };
}

const checks = [];
function assert(name, ok, detail) {
  checks.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined ? '  — ' + detail : ''}`);
}

async function main() {
  await mkdir(join(JAM, 'results'), { recursive: true });
  sh(`pkill -f 'hostcheck-udd' 2>/dev/null`);
  await sleep(500);
  if (sh(`lsof -ti :${PORT}`).trim()) throw new Error(`:${PORT} is occupied — refusing to collide`);

  // server.mjs honours PORT — same file, our own instance on 8898 (8893 is the
  // sibling MoQ run's; never start a default-port instance here).
  const fd = openSync(join(SCRATCH, 'hostcheck-server.log'), 'a');
  const srv = spawn('node', [join(JAM, 'server.mjs')], {
    stdio: ['ignore', fd, fd], env: { ...process.env, PORT: String(PORT) },
  });
  kids.push(srv);
  console.log('server pid=' + srv.pid + ' on :' + PORT);
  for (let i = 0; i < 40; i++) { try { await fetch(BASE + '/time-local'); break; } catch { await sleep(250); } }

  const flags = [
    '--headless=new', `--user-data-dir=${SCRATCH}/hostcheck-udd`, '--remote-debugging-port=9241',
    '--no-first-run', '--no-default-browser-check',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--disable-features=IntensiveWakeUpThrottling,WebRtcHideLocalIpsWithMdns',
    '--autoplay-policy=no-user-gesture-required',
    '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-devices',
    '--window-size=1200,1400',
  ];
  const url = `${BASE}/host-check.html?src=loopback&soak=${SOAK}`;
  run(CHROME, [...flags, url], 'chrome');
  const cdp = await new CDP().connect(9241, 'host-check.html');
  attachEvents(cdp);
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Page.enable');
  // headless=new has no permission UI, so --use-fake-ui-for-media-devices is not
  // enough: grant explicitly, otherwise getUserMedia is denied and the
  // constraint checks have nothing real to report.
  await cdp.send('Browser.grantPermissions', {
    origin: BASE, permissions: ['audioCapture', 'midi', 'midiSysex'],
  }).catch((e) => console.log('grantPermissions: ' + e.message));

  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await cdp.eval('!!(window.__hc && window.__hc.ready)', { awaitPromise: false }).catch(() => false);
    if (ready) break;
    await sleep(500);
  }
  assert('page module loaded', ready);
  if (!ready) throw new Error('page never became ready');

  console.log('running the full self-test sequence (~60 s)…');
  const t0 = Date.now();
  const auto = await Promise.race([
    cdp.eval(`window.__hcAuto({ na: 30, nb: 20, nc: 40, dist: [0,1,2,3], soak: ${SOAK} })`),
    sleep(300000).then(() => { throw new Error('auto timeout'); }),
  ]);
  console.log(`auto finished in ${((Date.now() - t0) / 1000).toFixed(1)} s`, JSON.stringify(auto));

  const R = await cdp.eval('window.__hcReport', { awaitPromise: false });
  await writeFile(join(JAM, 'results', 'hostcheck-report.json'), JSON.stringify(R, null, 2));

  // ---------------- assertions ----------------
  const A = R.A, B = R.B, C = R.C, D = R.D || [];
  assert('A · hardware floor produced a distribution',
    !!(A && A.keyToSound && A.keyToSound.n > 5),
    A && A.keyToSound ? `p50 ${A.keyToSound.p50} p95 ${A.keyToSound.p95} n=${A.keyToSound.n} dropped=${A.dropped}` : 'none');
  assert('A · MIDI/send jitter reported', !!(A && A.sendJitter),
    A && A.sendJitter ? `p50 ${A.sendJitter.p50} p95 ${A.sendJitter.p95}` : 'none');
  assert('B · network echo RTT produced', !!(B && B.rtt && B.rtt.n > 3),
    B ? `rtt p50 ${B.rtt && B.rtt.p50} p95 ${B.rtt && B.rtt.p95} one-way ${B.oneWay && B.oneWay.p50} lost ${B.lost}` : 'not run');
  assert('C · full loop total produced', !!(C && C.total && C.total.n > 5),
    C && C.total ? `total p50 ${C.total.p50} p95 ${C.total.p95} n=${C.total.n}` : 'none');
  assert('C · per-leg decomposition present',
    !!(C && C.leg1_midi && C.leg2_hardware && C.leg3_return),
    C ? `leg1 ${C.leg1_midi && C.leg1_midi.p50} · leg2 ${C.leg2_hardware && C.leg2_hardware.p50} · leg3 ${C.leg3_return && C.leg3_return.p50} · buffer ${C.bufferMs}` : 'none');
  assert('C · jitter buffer share measured from getStats', C && C.bufferMs !== null, C ? `${C.bufferMs} ms` : '');

  const base = D.find((x) => x.addedMs === 0);
  for (const want of [30, 60]) {
    const p = D.find((x) => x.addedMs === want);
    const delta = p && base && p.keyToSound && base.keyToSound ? p.keyToSound.p50 - base.keyToSound.p50 : null;
    assert(`D · ${want} ms of simulated distance shows up in the measurement (±5 ms)`,
      delta !== null && Math.abs(delta - want) <= 5,
      delta === null ? 'missing' : `measured delta ${delta.toFixed(2)} ms (base ${base.keyToSound.p50}, at ${want}: ${p.keyToSound.p50})`);
  }

  const chks = (R.env && R.env.checks) || [];
  const needed = ['echo cancellation', 'auto gain control', 'noise suppression', 'sample rate'];
  const got = needed.filter((n) => chks.some((c) => c.label === n));
  assert('constraint checks rendered (EC / AGC / NS / sample rate)', got.length === needed.length,
    chks.filter((c) => needed.includes(c.label)).map((c) => `${c.label}=${c.value}[${c.state}]`).join(' · '));
  assert('audio env reported (sampleRate / baseLatency / outputLatency)',
    !!(R.env && R.env.sampleRate && R.env.baseLatencyMs !== null),
    R.env ? `sr ${R.env.sampleRate} base ${R.env.baseLatencyMs} out ${R.env.outputLatencyMs} in ${R.env.inputLatencyMs}` : '');
  assert('verdict band computed', !!(R.headline && R.headline.band),
    R.headline ? `${R.headline.keyToEarMs} ms → ${R.headline.bandLabel}` : '');
  assert('remedy names the dominant leg', !!(R.remedy && R.remedy.text),
    R.remedy ? R.remedy.dominant.name + ' @ ' + R.remedy.dominant.ms + ' ms' : '');
  assert('playout floor→latency curve present', !!(R.playoutCurve && R.playoutCurve.points.length),
    R.playoutCurve ? R.playoutCurve.points.map((p) => `${p.floorMs}→${p.keyToEarMs}`).join(' ') : '');
  assert('stuck-note soak ran', !!(R.soak && R.soak.notes > 3),
    R.soak ? `${R.soak.notes} notes / ${R.soak.seconds}s · stuck ${R.soak.stuck} · dropped ${R.soak.dropped} · silent-after-panic ${R.soak.silentAfterPanic}` : '');
  assert('monitoring defaults to the return path', R.env && R.env.monitorsReturnPath === true);

  const pageErrs = await cdp.eval('window.__hc.errors()', { awaitPromise: false });
  assert('zero page errors', (pageErrs || []).length === 0, JSON.stringify(pageErrs));
  assert('zero console errors', consoleErrs.length === 0, JSON.stringify(consoleErrs.slice(0, 5)));

  // ---------------- screenshot ----------------
  const h = await cdp.eval('Math.min(9000, document.documentElement.scrollHeight)', { awaitPromise: false });
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1200, height: h, deviceScaleFactor: 1, mobile: false });
  await sleep(400);
  await cdp.screenshot(join(JAM, 'results', 'hostcheck-report.png'));
  await cdp.send('Emulation.clearDeviceMetricsOverride');
  console.log('screenshot -> results/hostcheck-report.png');

  await writeFile(join(JAM, 'results', 'hostcheck-verify.json'),
    JSON.stringify({ at: new Date().toISOString(), checks, consoleErrs, pageErrs, report: R }, null, 2));

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} assertions passed`);
  if (failed.length) console.log('FAILED: ' + failed.map((f) => f.name).join(' | '));
  cdp.close();
  return failed.length;
}

let code = 1;
try { code = await main(); } catch (e) { console.error('RUN FAILED:', e.message); code = 1; }
finally {
  if (!KEEP) {
    for (const k of kids) { try { k.kill('SIGKILL'); } catch {} }
    await sleep(400);
    sh(`pkill -f 'hostcheck-udd' 2>/dev/null`);
    await sleep(400);
    console.log('cleanup: ' + (sh(`lsof -i :${PORT} | tail -n +2`) || `:${PORT} free`));
  }
  process.exit(code);
}
