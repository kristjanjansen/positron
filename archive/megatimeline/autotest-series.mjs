// megatimeline SERIES-TRACKS autotest — ONE headless Chrome via raw CDP.
// Verifies the "tracks are queries" feature (plan-megatimeline §4, pulled into
// v0): switch to series view, dive into 1965, and prove that the series lanes
// derive ENTIRELY from the local search-cache.jsonl — zero new upstream ERR
// calls. Asserts: >=6 named series lanes, items distributed across them, card
// LRU cap respected, zero console errors, frame p50 near the 8 ms baseline.
// Screenshot: autotest-1965-series.png. Report: autotest-series-report.json.
// Kills its own Chrome + server at the end.

import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = 8892;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PROFILE = process.env.MT_CHROME_PROFILE ||
  '/private/tmp/claude-501/-Users-s32863-personal-positron/596385e3-9b74-4f17-837f-b4eb2eb5a254/scratchpad/mt-series-chrome-profile';
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
    ws.onerror = () => reject(new Error('ws error'));
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

  const stats0 = await (await fetch(`http://localhost:${PORT}/api/stats`)).json();
  report.statsBefore = stats0;

  await send('Page.navigate', { url: `http://localhost:${PORT}/` });

  // 1. wait ready
  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await evaluate('!!(window.__mt && __mt.ready)').catch(() => false);
    if (ready) break;
    await sleep(250);
  }
  if (!ready) throw new Error('page never became ready');
  await sleep(700);

  // 2. switch to series view at decades tier (census must stay untouched)
  await evaluate('__mt.setView("series")');
  await sleep(300);
  report.steps.decadesInSeriesView = await evaluate('__mt.snapshot()');

  // 3. dive into 1965 — series lanes derive on settle from cached pages
  console.log('dive 1965 (series view)…');
  report.steps.dive = await evaluate('__mt.dive(1965)');
  let snap = null;
  for (let i = 0; i < 120; i++) {
    snap = await evaluate('__mt.snapshot()');
    if (snap.imgsLoaded > 0 && snap.imgsLoaded === snap.imgsTotal) break;
    await sleep(500);
  }
  report.steps.series1965 = snap;
  report.laneReport = await evaluate('__mt.laneReport()');
  console.log('lanes:', JSON.stringify(report.laneReport.lanes.map((l) => `${l.label}:${l.count}/${l.inView}`)));

  // 4. frame-time spot check: scripted zoom flight WHILE in series view
  console.log('series-view flight…');
  report.steps.flight = await evaluate('__mt.flight(4000)');
  console.log('flight:', JSON.stringify(report.steps.flight));

  // 5. back to the 1965 year view for the screenshot
  report.steps.dive2 = await evaluate('__mt.dive(1965)');
  for (let i = 0; i < 40; i++) {
    snap = await evaluate('__mt.snapshot()');
    if (snap.imgsLoaded > 0 && snap.imgsLoaded === snap.imgsTotal) break;
    await sleep(500);
  }
  report.steps.final = snap;
  report.laneReportFinal = await evaluate('__mt.laneReport()');
  await sleep(600);
  await shot('autotest-1965-series.png');

  // 5b. panel toggles: hide Päevakaja via its real checkbox, verify the lane
  // disappears, the hide survives a zoom (state outlives re-derive), restore
  // it; then master-switch round-trip series → type → series
  report.steps.toggleHide = await evaluate(`(() => {
    const rows = [...document.querySelectorAll('#panelBody .laneRow')];
    const i = rows.findIndex((r) => r.textContent.includes('Päevakaja'));
    if (i < 0) return { err: 'row not found' };
    rows[i].querySelector('input').click();
    const lanes = __mt.laneReport().lanes.map((l) => l.key);
    return { hidden: !lanes.includes('series:Päevakaja'), laneCount: lanes.length };
  })()`);
  await evaluate('__mt.dive(1965, 6)');
  report.steps.toggleAfterZoom = await evaluate(`(() => {
    const lanes = __mt.laneReport().lanes.map((l) => l.key);
    return { stillHidden: !lanes.includes('series:Päevakaja'), laneCount: lanes.length };
  })()`);
  report.steps.toggleRestore = await evaluate(`(() => {
    const rows = [...document.querySelectorAll('#panelBody .laneRow')];
    const i = rows.findIndex((r) => r.textContent.includes('Päevakaja'));
    if (i >= 0) rows[i].querySelector('input').click();
    return { restored: __mt.laneReport().lanes.some((l) => l.key === 'series:Päevakaja') };
  })()`);
  report.steps.viewSwitch = await evaluate(`(() => {
    __mt.setView('type');
    const t = __mt.laneReport();
    __mt.setView('series');
    const s = __mt.laneReport();
    return { typeMode: t.mode, typeLanes: t.lanes.length, backMode: s.mode, backLanes: s.lanes.length };
  })()`);

  // 6. politeness + integrity asserts
  const stats1 = await (await fetch(`http://localhost:${PORT}/api/stats`)).json();
  report.statsAfter = stats1;
  const upstreamDelta = stats1.upstreamTotal - stats0.upstreamTotal;
  report.upstreamDelta = upstreamDelta;
  const lanes = report.laneReportFinal.lanes;
  const seriesLanes = lanes.filter((l) => l.kind === 'series' && l.key !== 'series:__muu');
  const distributed = lanes.filter((l) => l.kind === 'series' && l.inView > 0);
  report.asserts = {
    censusLoaded: !!snap.censusLoaded && snap.censusYears === 119,
    seriesMode: report.laneReportFinal.mode === 'series',
    namedSeriesLanes6plus: seriesLanes.length >= 6,
    itemsDistributed: distributed.length >= 6,
    thumbsLoaded: snap.imgsLoaded > 0,
    cardsWithinCap: snap.liveCards <= 300,
    zeroUpstream: upstreamDelta === 0,
    consoleClean: report.consoleErrors.length === 0,
    frameP50Sane: report.steps.flight.p50 != null && report.steps.flight.p50 <= 14,
    togglesWork: report.steps.toggleHide.hidden === true &&
      report.steps.toggleAfterZoom.stillHidden === true &&
      report.steps.toggleRestore.restored === true,
    viewSwitchWorks: report.steps.viewSwitch.typeMode === 'type' &&
      report.steps.viewSwitch.typeLanes === 3 &&
      report.steps.viewSwitch.backMode === 'series' &&
      report.steps.viewSwitch.backLanes >= 7,
  };
  report.ok = Object.values(report.asserts).every(Boolean);
  console.log('asserts:', JSON.stringify(report.asserts));
  console.log('upstream delta:', upstreamDelta, '(search', stats1.upstreamSearch - stats0.upstreamSearch,
    '· content', stats1.upstreamContent - stats0.upstreamContent, '· cacheHits',
    stats1.cacheHitSearch - stats0.cacheHitSearch, ')');
  if (!report.ok) exitCode = 1;
} catch (e) {
  report.fatal = String(e && e.stack || e);
  console.error('FATAL:', e);
  exitCode = 1;
} finally {
  await writeFile(join(ROOT, 'autotest-series-report.json'), JSON.stringify(report, null, 1));
  try { chromeProc?.kill(); } catch {}
  try { serverProc.kill(); } catch {}
  await sleep(300);
  console.log('report → autotest-series-report.json; chrome+server killed');
  process.exit(exitCode);
}
