// timeline/lab/run-lab.mjs — measurement orchestrator for the transport core.
//   node timeline/lab/run-lab.mjs [--only A,B,D,E,BG]
// Arms:
//   A  firing precision, mechanisms (main|worker|raf|fanout) x mixed densities
//   B  seek/pause/rate/cancel correctness asserts per mechanism
//   D  SIGSTOP 3 s freeze -> catch-up per policy (burst/drop/reduce) + fanout
//   E  audio lane sample accuracy (AudioWorklet truth) incl. 500 ms main busy
//   BG background-tab throttling probe (second tab activated via CDP)
// Machine rules: port 8896, CDP 9321, chrome pattern tlab-udd; kills only own.
// Raw rows -> timeline/lab/results/*.jsonl (gitignored); summary -> artifacts/.

import { spawn, execSync } from 'node:child_process';
import { writeFile, mkdir, appendFile } from 'node:fs/promises';
import { openSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CDP } from './cdp.mjs';

const LAB = dirname(fileURLToPath(import.meta.url));
const SCRATCH = '/private/tmp/claude-501/-Users-s32863-personal-elektron/596385e3-9b74-4f17-837f-b4eb2eb5a254/scratchpad';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = 'http://127.0.0.1:8896';
const CDP_PORT = 9321;
const args = process.argv.slice(2);
const ONLY = (args.includes('--only') ? args[args.indexOf('--only') + 1] : '').split(',').filter(Boolean);
const want = (a) => !ONLY.length || ONLY.includes(a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sh = (cmd) => { try { return execSync(cmd, { encoding: 'utf8' }); } catch (e) { return e.stdout || ''; } };

const kids = [];
function run(cmd, argv, name) {
  const fd = openSync(join(SCRATCH, `tlab-${name}.log`), 'a');
  const p = spawn(cmd, argv, { stdio: ['ignore', fd, fd] });
  kids.push(p);
  console.log(`spawned ${name} pid=${p.pid}`);
  return p;
}

// ---------- stats ----------
const q = (sorted, p) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p / 100 * sorted.length))] : null;
function deltaStats(deltas) {
  const s = deltas.filter((d) => d !== null).sort((a, b) => a - b);
  return {
    n: s.length,
    p50: +(q(s, 50) ?? NaN).toFixed(2), p95: +(q(s, 95) ?? NaN).toFixed(2),
    p99: +(q(s, 99) ?? NaN).toFixed(2), min: s.length ? +s[0].toFixed(2) : null, max: s.length ? +s[s.length - 1].toFixed(2) : null,
  };
}

// ---------- process tree (renderer pids for SIGSTOP / CPU) ----------
function descendants(rootPid) {
  const rows = sh('ps -axo pid,ppid,command').trim().split('\n').slice(1).map((l) => {
    const m = l.trim().match(/^(\d+)\s+(\d+)\s+(.*)$/);
    return m ? { pid: +m[1], ppid: +m[2], cmd: m[3] } : null;
  }).filter(Boolean);
  const out = [];
  const walk = (pid) => {
    for (const r of rows) if (r.ppid === pid) { out.push(r); walk(r.pid); }
  };
  walk(rootPid);
  return out;
}
const rendererPids = (rootPid) => descendants(rootPid).filter((r) => r.cmd.includes('--type=renderer')).map((r) => r.pid);

function cpuSampler(pids) {
  const samples = [];
  const iv = setInterval(() => {
    for (const pid of pids) {
      const v = parseFloat(sh(`ps -o %cpu= -p ${pid}`));
      if (!isNaN(v)) samples.push(v);
    }
  }, 1000);
  return { stop() { clearInterval(iv); const s = samples.sort((a, b) => a - b); return { n: s.length, mean: s.length ? +(s.reduce((x, y) => x + y, 0) / s.length).toFixed(1) : null, max: s.length ? s[s.length - 1] : null }; } };
}

async function writeJsonl(file, rows) {
  await appendFile(file, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
}

// ---------- main ----------
const summary = { at: new Date().toISOString(), node: process.version, arms: {} };
let chrome, page, browserCdp;

async function main() {
  await mkdir(join(LAB, 'results'), { recursive: true });
  await mkdir(join(LAB, 'artifacts'), { recursive: true });
  sh(`pkill -f 'tlab-udd' 2>/dev/null`); sh(`pkill -f 'timeline/lab/server.mjs' 2>/dev/null`);
  await sleep(500);

  run('node', [join(LAB, 'server.mjs')], 'server');
  for (let i = 0; i < 40; i++) { try { await fetch(BASE + '/time-local'); break; } catch { await sleep(250); } }

  // NOTE: deliberately NOT passing --disable-background-timer-throttling etc —
  // the BG arm wants honest throttling; foreground arms are unaffected.
  // No --mute-audio: jam lesson — headless audio output must stay real.
  chrome = run(CHROME, [
    '--headless=new', `--user-data-dir=${SCRATCH}/tlab-udd`, `--remote-debugging-port=${CDP_PORT}`,
    '--no-first-run', '--no-default-browser-check',
    '--autoplay-policy=no-user-gesture-required', '--window-size=1200,800',
    `${BASE}/lab/lab.html`,
  ], 'chrome');

  page = await new CDP().connect(CDP_PORT, 'lab.html');
  browserCdp = await new CDP().connectBrowser(CDP_PORT);
  const cal = await page.eval('tlab.calibrate()');
  console.log('truth clock:', JSON.stringify(cal));
  summary.clock = cal;
  const rpids = rendererPids(chrome.pid);
  console.log('renderer pids:', rpids.join(','));

  const MECHS = ['main', 'worker', 'raf', 'fanout'];

  // ---------------- A: firing precision ----------------
  if (want('A')) {
    summary.arms.A = {};
    for (const mech of MECHS) {
      try {
        console.log(`\n[A] precision ${mech} (60 s mixed trace)…`);
        const cpu = cpuSampler(rendererPids(chrome.pid));
        const r = await page.eval(`tlab.runPrecision(${JSON.stringify(mech)})`);
        const cpuStats = cpu.stop();
        await writeJsonl(join(LAB, 'results', `precision-${mech}.jsonl`), r.rows.map((row) => ({ mech, ...row })));
        const byTag = {};
        for (const tag of ['sparse', 'dense', 'cluster']) byTag[tag] = deltaStats(r.rows.filter((x) => x.tag === tag).map((x) => x.deltaMs));
        const all = deltaStats(r.rows.map((x) => x.deltaMs));
        const origins = {};
        for (const row of r.rows) origins[row.origin] = (origins[row.origin] || 0) + 1;
        summary.arms.A[mech] = { n: r.n, scheduled: r.scheduled, all, byTag, origins, cpu: cpuStats, obsHz: r.obs, schedStats: r.stats };
        console.log(`  n=${r.n}/${r.scheduled} all p50=${all.p50} p95=${all.p95} p99=${all.p99} max=${all.max} ms; cpu mean=${cpuStats.mean}% obs p50=${r.obs.p50 && r.obs.p50.toFixed(1)} ms`);
      } catch (e) { console.log(`  ARM A ${mech} FAIL: ${e.message}`); summary.arms.A[mech] = { error: e.message }; }
    }
  }

  // ---------------- B: correctness asserts ----------------
  if (want('B')) {
    summary.arms.B = {};
    for (const mech of MECHS) {
      try {
        console.log(`\n[B] asserts ${mech} (~17 s)…`);
        const r = await page.eval(`tlab.runAsserts(${JSON.stringify(mech)})`);
        summary.arms.B[mech] = r;
        for (const c of r.checks) console.log(`  ${c.pass ? 'PASS' : 'FAIL'} ${c.name}: ${c.detail}`);
        await writeJsonl(join(LAB, 'results', 'asserts.jsonl'), [r]);
      } catch (e) { console.log(`  ARM B ${mech} FAIL: ${e.message}`); summary.arms.B[mech] = { error: e.message }; }
    }
  }

  // ---------------- D: freeze / catch-up ----------------
  if (want('D')) {
    summary.arms.D = {};
    for (const mode of ['policies', 'fanout']) {
      try {
        console.log(`\n[D] freeze ${mode}: play 30 s, SIGSTOP@~10 s for 3 s…`);
        await page.eval(`tlab.startFreeze(${JSON.stringify(mode)})`);
        await sleep(10000);
        const pids = rendererPids(chrome.pid);
        const stopUs = Date.now() * 1000;
        for (const pid of pids) sh(`kill -STOP ${pid}`);
        await sleep(3000);
        for (const pid of pids) sh(`kill -CONT ${pid}`);
        const contUs = Date.now() * 1000;
        console.log(`  froze pids [${pids}] for ${((contUs - stopUs) / 1e6).toFixed(2)} s`);
        for (let i = 0; i < 200; i++) { if (await page.eval('tlab.freezeDone()', { awaitPromise: false })) break; await sleep(500); }
        const rep = await page.eval('tlab.freezeReport()');
        await writeJsonl(join(LAB, 'results', `freeze-${mode}.jsonl`), [rep]);
        const wake = rep.wakes[0];
        const out = { mode, stopUs, contUs, wakes: rep.wakes, byKind: rep.byKind, stats: rep.stats };
        if (wake) {
          const inWin = (k, win) => rep.fires.filter((f) => (!k || f.kind === k) && f.tUs >= wake.wakeUs && f.tUs <= wake.wakeUs + win * 1000).length;
          if (mode === 'policies') {
            out.burstIn100ms = inWin('b', 100); out.burstIn500ms = inWin('b', 500);
            out.dropLost = rep.byKind.d ? rep.byKind.d.dropped : null;
            out.dropFiredIn100ms = inWin('d', 100);
            out.reduceCalls = rep.policyEvents;
            out.reduceState = rep.reduceState;
            out.reduceExpected = rep.byKind.r ? rep.byKind.r.total : null;
            out.reduceConsistentMs = rep.policyEvents.length ? +((rep.policyEvents[0].tUs - wake.wakeUs) / 1000).toFixed(1) : null;
          } else {
            out.fanoutIn100ms = inWin(null, 100); out.fanoutIn500ms = inWin(null, 500);
          }
        }
        summary.arms.D[mode] = out;
        console.log('  ' + JSON.stringify({ ...out, reduceCalls: undefined, wakes: rep.wakes.length }));
      } catch (e) { console.log(`  ARM D ${mode} FAIL: ${e.message}`); summary.arms.D[mode] = { error: e.message }; }
    }
  }

  // ---------------- E: audio lane ----------------
  if (want('E')) {
    summary.arms.E = {};
    for (const horizonMs of [100, 500]) {
      try {
        console.log(`\n[E] audio lane horizon=${horizonMs} ms (20 s, 200 clicks, busy-loop 500 ms @10 s)…`);
        const r = await page.eval(`tlab.runAudio({horizonMs: ${horizonMs}})`);
        await writeJsonl(join(LAB, 'results', `audio-h${horizonMs}.jsonl`), r.pairs.map((p) => ({ horizonMs, ...p })));
        const render = deltaStats(r.pairs.map((p) => p.renderDeltaUs === null ? null : p.renderDeltaUs / 1000));
        const wallMap = deltaStats(r.pairs.map((p) => p.wallDeltaUs == null ? null : p.wallDeltaUs / 1000));
        const busyWin = r.busyLog.startUs ? r.pairs.filter((p) => {
          const t = r.pairs.indexOf(p); return p.at >= 9900 && p.at <= 11000;
        }) : [];
        const busyRender = deltaStats(busyWin.map((p) => p.renderDeltaUs === null ? null : p.renderDeltaUs / 1000));
        const wallDuringBusy = deltaStats(r.wallFires.filter((f) => f.at >= 9900 && f.at <= 11000).map((f) => f.deltaMs));
        const wallOverall = deltaStats(r.wallFires.map((f) => f.deltaMs));
        summary.arms.E[`h${horizonMs}`] = {
          nScheduled: r.nScheduled, nDetected: r.nDetected, missedDetections: r.missed,
          laneStats: r.laneStats, driftPpm: r.driftPpm,
          renderDeltaMs: render, wallMappedDeltaMs: wallMap,
          busyWindow: { clicks: busyWin.length, missing: busyWin.filter((p) => p.renderDeltaUs === null).length, renderDeltaMs: busyRender },
          wallLane: { overall: wallOverall, duringBusy: wallDuringBusy },
        };
        console.log(`  clicks ${r.nDetected}/${r.nScheduled} rendered; render delta p50=${render.p50} ms p95=${render.p95}; lane counts=${JSON.stringify(r.laneStats)}; audio-vs-wall drift ${r.driftPpm} ppm`);
        console.log(`  busy window: ${busyWin.filter((p) => p.renderDeltaUs === null).length}/${busyWin.length} clicks missing; wall lane during busy p95=${wallDuringBusy.p95} ms (overall p95=${wallOverall.p95})`);
      } catch (e) { console.log(`  ARM E h${horizonMs} FAIL: ${e.message}`); summary.arms.E[`h${horizonMs}`] = { error: e.message }; }
    }
  }

  // ---------------- BG: background-tab throttling probe ----------------
  if (want('BG')) {
    summary.arms.BG = {};
    for (const mech of ['main', 'worker', 'raf']) {
      try {
        console.log(`\n[BG] background probe ${mech} (25 s, hidden 5-15 s)…`);
        await page.eval(`tlab.startBackground(${JSON.stringify(mech)})`);
        await sleep(5000);
        const t = await browserCdp.send('Target.createTarget', { url: 'about:blank' });
        await browserCdp.send('Target.activateTarget', { targetId: t.targetId });
        await sleep(10000);
        await browserCdp.send('Target.activateTarget', { targetId: page.targetId });
        await browserCdp.send('Target.closeTarget', { targetId: t.targetId }).catch(() => {});
        for (let i = 0; i < 120; i++) { if (await page.eval('tlab.bgDone()', { awaitPromise: false })) break; await sleep(500); }
        const rep = await page.eval('tlab.bgReport()');
        await writeJsonl(join(LAB, 'results', `background-${mech}.jsonl`), [rep]);
        const hiddenSeen = rep.visLog.some((v) => v.state === 'hidden');
        const hiddenRows = rep.rows.filter((r) => r.at >= 5500 && r.at <= 14500);
        const fgRows = rep.rows.filter((r) => r.at < 4500 || r.at > 16000);
        summary.arms.BG[mech] = {
          hiddenSeen, visLog: rep.visLog,
          hiddenWindowDelta: deltaStats(hiddenRows.map((r) => r.deltaMs)),
          foregroundDelta: deltaStats(fgRows.map((r) => r.deltaMs)),
        };
        console.log(`  visibility hidden seen: ${hiddenSeen}; hidden-window p95=${summary.arms.BG[mech].hiddenWindowDelta.p95} ms vs fg p95=${summary.arms.BG[mech].foregroundDelta.p95} ms`);
      } catch (e) { console.log(`  ARM BG ${mech} FAIL: ${e.message}`); summary.arms.BG[mech] = { error: e.message }; }
    }
  }

  const file = join(LAB, 'artifacts', 'summary-2026-08-27.json');
  await writeFile(file, JSON.stringify(summary, null, 2));
  console.log('\nsummary -> ' + file);
}

async function cleanup() {
  try { page && page.close(); } catch {}
  try { browserCdp && browserCdp.close(); } catch {}
  for (const p of kids) { try { p.kill(); } catch {} }
  sh(`pkill -f 'tlab-udd' 2>/dev/null`);
  sh(`pkill -f 'timeline/lab/server.mjs' 2>/dev/null`);
}
main().then(cleanup, async (e) => { console.error('FATAL', e); await cleanup(); process.exit(1); });
