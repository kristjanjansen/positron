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

// Page-side transport verification, run on peer A after the duet. Everything
// below talks ONLY to the library's deck API (jam-timeline.js → transport.mjs):
// seek / pause / setRate / position / drift channel / audit.
const TRANSPORT_VERIFY = `(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const med = (xs) => xs.length ? +[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)].toFixed(2) : null;
  const d = window.jamDeck();
  const out = { host: d.hostName, durationMs: +d.durationMs.toFixed(1), events: d.items.length, seek: [] };

  // ---- SEEK ×3: held-note set must equal reduce(events <= t); then play a
  // window and prove nothing behind the playhead rings (orphans) and nothing
  // fires twice (double-fires).
  for (const f of [0.2, 0.5, 0.8]) {
    const p = d.durationMs * f;
    // setRate() no longer starts playback (library seam 2), so this order is
    // now merely conventional: arm the rate, park, seek.
    d.setRate(1); d.pause(); d.seek(p); await sleep(90);
    const expected = d.expectedHeld(p), sounding = window.jamSounding();
    d.resetDrift(); d.play(); await sleep(1200); d.pause(); await sleep(80);
    const rows = d.drift(), ids = rows.map((r) => r.id);
    out.seek.push({
      posMs: +p.toFixed(1), expectedHeld: expected, soundingAfterSeek: sounding,
      heldMatch: eq(expected, sounding), firedInWindow: rows.length,
      orphans: rows.filter((r) => r.at < p).length,
      doubleFires: ids.length - new Set(ids).size,
      atRange: rows.length ? [+rows[0].at.toFixed(0), +rows[rows.length-1].at.toFixed(0)] : null,
    });
  }

  // ---- PAUSE: position must hold exactly, nothing may fire
  d.setRate(1); d.pause(); d.seek(d.durationMs * 0.3); await sleep(60);
  d.play(); await sleep(500); d.pause();
  const p1 = d.position(); d.resetDrift(); await sleep(900);
  out.pause = { posDeltaMs: +(d.position() - p1).toFixed(5), firesWhilePaused: d.drift().length, heldAtPause: window.jamSounding().length };

  // ---- RATE: the SAME timeline window at 1x and 2x; measured median
  // inter-fire interval must halve.
  async function window_(rate, ms) {
    d.setRate(rate); d.pause(); d.seek(d.durationMs * 0.3); await sleep(60);
    d.resetDrift(); d.play(); await sleep(ms); d.pause(); await sleep(80);
    const rows = d.drift().sort((a, b) => a.firedUs - b.firedUs);
    const gaps = [];
    for (let i = 1; i < rows.length; i++) { const g = (rows[i].firedUs - rows[i-1].firedUs) / 1000; if (g > 0.5) gaps.push(g); }
    return { rate, fired: rows.length, gapN: gaps.length, medianGapMs: med(gaps),
             timelineSpanMs: rows.length ? +(rows[rows.length-1].at - rows[0].at).toFixed(0) : 0 };
  }
  const r1 = await window_(1, 5000), r2 = await window_(2, 2500);   // same 5 s of timeline
  out.rate = { r1, r2, ratio: (r1.medianGapMs && r2.medianGapMs) ? +(r2.medianGapMs / r1.medianGapMs).toFixed(3) : null };
  const rHalf = await window_(0.5, 4000);
  out.rate.rHalf = rHalf;
  out.rate.ratioHalf = (r1.medianGapMs && rHalf.medianGapMs) ? +(rHalf.medianGapMs / r1.medianGapMs).toFixed(3) : null;

  // ---- BASELINE: the hand-rolled replay loop this replaced, measured on a
  // 10 s slice of the same log. It had no drift channel; this reproduces its
  // exact shape (25 ms tick, everything inside a 120 ms horizon fired at the
  // tick) to get the number it never reported. Note: it fired the WALL/visual
  // side early and leaned on WebAudio's acT for the audio side.
  const log = window.jamLog().slice().sort((a, b) => a.at - b.at);
  const t0 = log[0].at, slice = log.filter((e) => e.at - t0 < 10000000);
  const nowUs = window.jam.nowUs;
  const baseErrs = await new Promise((res) => {
    const startUs = nowUs() + 300000;
    const pending = slice.map((e) => ({ fireUs: startUs + (e.at - t0) }));
    const errs = [];
    const iv = setInterval(() => {
      const horizon = nowUs() + 120000;
      for (let i = pending.length - 1; i >= 0; i--) {
        if (pending[i].fireUs <= horizon) { const p = pending.splice(i, 1)[0]; errs.push((nowUs() - p.fireUs) / 1000); }
      }
      if (!pending.length) { clearInterval(iv); res(errs); }
    }, 25);
  });
  const q = (xs, f) => { const s = [...xs].sort((a,b)=>a-b); return s.length ? +s[Math.min(s.length-1, Math.floor(s.length*f))].toFixed(2) : null; };
  out.baselineHandRolled = { n: baseErrs.length, p50: q(baseErrs, 0.5), p95: q(baseErrs, 0.95),
    absP50: q(baseErrs.map(Math.abs), 0.5), absP95: q(baseErrs.map(Math.abs), 0.95),
    min: q(baseErrs, 0), max: q(baseErrs, 0.999) };

  d.setRate(1); d.pause(); d.seek(d.durationMs * 0.45); window.jam.drawHud('TRANSPORT VERIFY DONE');
  out.finalStats = d.stats();
  return out;
})()`;

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

  // replay through the same render path — now driven by timeline/transport.mjs;
  // count must match the log and the log must not grow (overdub rule)
  console.log('replaying both sessions through the timeline library…');
  const [ra, rb] = await Promise.all([
    cdpA.eval('window.jamReplay()'),
    cdpB.eval('window.jamReplay()'),
  ]);
  console.log('replay a:', JSON.stringify(ra), '\nreplay b:', JSON.stringify(rb));

  // transport asserts (peer A): seek / pause / rate + the hand-rolled baseline
  console.log('transport asserts (seek ×3, pause, rate 0.5/1/2, baseline)…');
  const tv = await cdpA.eval(TRANSPORT_VERIFY);
  console.log('transport:', JSON.stringify(tv, null, 1));

  await cdpA.screenshot(join(JAM, 'results', `jam-${PAGE}-a.png`));
  await cdpB.screenshot(join(JAM, 'results', `jam-${PAGE}-b.png`));

  const rateOK = tv.rate.r2.medianGapMs !== null && tv.rate.r1.medianGapMs !== null &&
    Math.abs(tv.rate.ratio - 0.5) < 0.12;
  const verdict = {
    page: PAGE, transport: TRANSPORT, session: SESSION, secs: SECS,
    a: statsA, b: statsB, replayA: ra, replayB: rb, transportVerify: tv,
    pageErrors: { a: cdpA.errors, b: cdpB.errors },
    checks: {
      bothDirections: statsA.recvRemote > 0 && statsB.recvRemote > 0,
      replayCountA: ra.fired === ra.logged,
      replayCountB: rb.fired === rb.logged,
      logDidNotGrowA: ra.logGrewBy === 0,
      logDidNotGrowB: rb.logGrewBy === 0,
      firedExactlyOnceA: Object.keys(ra.audit).length === 1 && ra.audit['1'] === ra.scheduled,
      armedAfterReplayA: ra.armedAfter,
      seekHeldMatch: tv.seek.every((s) => s.heldMatch),
      seekNoOrphans: tv.seek.every((s) => s.orphans === 0),
      seekNoDoubleFires: tv.seek.every((s) => s.doubleFires === 0),
      pauseHolds: Math.abs(tv.pause.posDeltaMs) < 0.001 && tv.pause.firesWhilePaused === 0,
      rateHalvesIntervals: rateOK,
      lossA: statsB.sentLocal - statsA.recvRemote,
      lossB: statsA.sentLocal - statsB.recvRemote,
      pageErrors: cdpA.errors.length + cdpB.errors.length,
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
