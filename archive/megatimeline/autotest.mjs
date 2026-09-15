// megatimeline autotest — ONE headless Chrome via raw CDP (node 25 global
// WebSocket, no deps). Spawns server.mjs (:8892), drives the surface:
//   1. decades view screenshot (census histograms)
//   2. scripted 5 s zoom flight (rAF deltas → p50/p95)
//   3. animate-dive into 1965 (months/days tier), wait for thumbnails
//   4. months view screenshot
// Asserts: census loaded; >=1 thumbnail <img> naturalWidth>0; live cards <=
// LRU cap (300); total upstream ERR API requests this run <= 15 (politeness —
// census pre-cached, JSONL caches absorbing); zero console errors.
// Writes autotest-report.json. Kills Chrome + server at the end.

import { spawn } from 'node:child_process';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = 8892;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PROFILE = process.env.MT_CHROME_PROFILE ||
  '/private/tmp/claude-501/-Users-s32863-personal-positron/596385e3-9b74-4f17-837f-b4eb2eb5a254/scratchpad/mt-chrome-profile';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── spawn server ───────────────────────────────────────────────────────────
const serverProc = spawn(process.execPath, [join(ROOT, 'server.mjs')], { stdio: ['ignore', 'pipe', 'pipe'] });
let serverLog = '';
serverProc.stdout.on('data', (c) => (serverLog += c));
serverProc.stderr.on('data', (c) => (serverLog += c));

async function waitServer() {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`http://localhost:${PORT}/api/stats`);
      if (r.ok) return;
    } catch {}
    await sleep(100);
  }
  throw new Error('server did not come up: ' + serverLog);
}

// ─── launch Chrome (the ONE headless instance) ──────────────────────────────
let chromeProc = null;
async function launchChrome() {
  await mkdir(PROFILE, { recursive: true });
  chromeProc = spawn(CHROME, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${PROFILE}`,
    '--no-first-run', '--no-default-browser-check', '--window-size=1600,1000',
    '--disable-gpu-sandbox', 'about:blank',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  let err = '';
  chromeProc.stderr.on('data', (c) => (err += c));
  for (let i = 0; i < 100; i++) {
    const m = err.match(/DevTools listening on (ws:\/\/[^\s]+)/);
    if (m) return m[1];
    await sleep(100);
  }
  throw new Error('chrome did not expose DevTools: ' + err.slice(0, 500));
}

// ─── minimal CDP client ─────────────────────────────────────────────────────
function cdp(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0;
    const pending = new Map();
    const listeners = [];
    ws.onopen = () => resolve({
      send: (method, params = {}, sessionId) => new Promise((res, rej) => {
        const mid = ++id;
        pending.set(mid, { res, rej });
        ws.send(JSON.stringify({ id: mid, method, params, ...(sessionId ? { sessionId } : {}) }));
      }),
      on: (fn) => listeners.push(fn),
      close: () => ws.close(),
    });
    ws.onerror = (e) => reject(new Error('ws error'));
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
      } else if (msg.method) {
        listeners.forEach((fn) => fn(msg));
      }
    };
  });
}

// ─── run ────────────────────────────────────────────────────────────────────
const report = { at: new Date().toISOString(), steps: {}, consoleErrors: [], asserts: {} };
let exitCode = 0;

try {
  await waitServer();
  console.log('server up');
  const wsUrl = await launchChrome();
  const c = await cdp(wsUrl);
  const { targetId } = await c.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await c.send('Target.attachToTarget', { targetId, flatten: true });
  const send = (m, p) => c.send(m, p, sessionId);

  c.on((msg) => {
    if (msg.sessionId !== sessionId) return;
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      report.consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      report.consoleErrors.push('EXCEPTION: ' + (msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text));
    }
  });
  await send('Page.enable');
  await send('Runtime.enable');

  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error('eval failed: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result.value;
  };
  const shot = async (file) => {
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile(join(ROOT, file), Buffer.from(data, 'base64'));
    console.log('screenshot →', file);
  };

  await send('Page.navigate', { url: `http://localhost:${PORT}/` });

  // 1. wait ready (census + initial fit-all)
  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await evaluate('!!(window.__mt && __mt.ready)').catch(() => false);
    if (ready) break;
    await sleep(250);
  }
  if (!ready) throw new Error('page never became ready');
  await sleep(700);                                   // let the first settle pass
  report.steps.boot = await evaluate('__mt.snapshot()');
  await shot('autotest-decades.png');

  // 2. the 5 s scripted zoom flight (decades → one month of 1965)
  console.log('flight…');
  report.steps.flight = await evaluate('__mt.flight(5000)');
  console.log('flight:', JSON.stringify(report.steps.flight));

  // 3. dive into 1965 months view, wait for thumbnails
  await evaluate('__mt.fitAll()');
  await sleep(500);
  console.log('dive 1965…');
  report.steps.dive = await evaluate('__mt.dive(1965)');
  let snap = null;
  for (let i = 0; i < 120; i++) {                     // wait for >=1 real thumb pixel
    snap = await evaluate('__mt.snapshot()');
    if (snap.imgsLoaded > 0) break;
    await sleep(500);
  }
  report.steps.months = snap;
  await sleep(400);
  await shot('autotest-1965.png');

  // 3b. deeper dive (3 months of 1965, all data already cached client-side):
  // measures tile-mount latency after settle without any new API traffic
  console.log('deep dive Q1 1965…');
  report.steps.deep = await evaluate('__mt.dive(1965, 3)');
  await sleep(1500);
  report.steps.deepAfter = await evaluate('__mt.snapshot()');

  // 3c. THE AGGREGATE IS A STATISTIC, not an alpha. The lane sum used to be
  // `globalAlpha = min(0.4, 0.05 + 0.02*n)` — +1 per item regardless of span,
  // clipped at n=18. It is now timeline/strip.mjs' aoristic(): one bin per pixel
  // column, mass 1/(b−a), drawn as height, with its population and bin width
  // readable. Assert the numbers exist and are sane rather than trusting a pixel.
  report.steps.aoristic = await evaluate('__mt.aoristic()');
  console.log('aoristic:', JSON.stringify(report.steps.aoristic));
  const ao = report.steps.aoristic || [];
  // A lane with n=0 is an HONEST ABSENCE (Q1 1965 holds ~3 photos in the whole
  // archive), so the assert is: every lane that summed anything reports a
  // fractional peak — a MASS, which a +1-per-item count can never be.
  const live_ = ao.filter((a) => a.n > 0);
  const aoOk = live_.length > 0 && live_.every((a) => a.peak > 0 && a.colDays > 0 && a.peak !== Math.round(a.peak));

  // 4. politeness + integrity asserts
  const stats = await (await fetch(`http://localhost:${PORT}/api/stats`)).json();
  report.serverStats = stats;
  const deep = report.steps.deepAfter || snap;
  report.asserts = {
    censusLoaded: !!snap.censusLoaded && snap.censusYears === 119,
    thumbLoaded: snap.imgsLoaded > 0 && deep.imgsLoaded > 0,
    cardsWithinCap: snap.liveCards <= 300 && deep.liveCards <= 300,
    apiBudget: stats.upstreamTotal <= 15,
    consoleClean: report.consoleErrors.length === 0,
    aoristicIsAStatistic: aoOk,
  };
  report.ok = Object.values(report.asserts).every(Boolean);
  console.log('asserts:', JSON.stringify(report.asserts));
  console.log('server stats:', JSON.stringify(stats));
  if (!report.ok) exitCode = 1;
} catch (e) {
  report.fatal = String(e && e.stack || e);
  console.error('FATAL:', e);
  exitCode = 1;
} finally {
  await writeFile(join(ROOT, 'autotest-report.json'), JSON.stringify(report, null, 1));
  try { chromeProc?.kill(); } catch {}
  try { serverProc.kill(); } catch {}
  await sleep(300);
  console.log('report → autotest-report.json; chrome+server killed');
  process.exit(exitCode);
}
