#!/usr/bin/env node
// node timeline/lab/run-freeze.mjs [--freeze 300] [--keepalive] [--natural]: Chrome 133's Energy
// Saver freeze at 5-minute scale: does the worker tick survive, and what do reduce, burst and drop
// land on afterwards. Port 8894, one Chrome.
// why: lessons/timeline-lab.md#rf-header
import { createRequire } from 'module';
import os from "node:os";
const require = createRequire(path.join(os.homedir(), ".npm/_npx/705bc6b22212b352/node_modules/"));
const { chromium } = require('playwright');
import http from 'http';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { CDP } from './cdp.mjs';

const ROOT = path.resolve(import.meta.dirname, "../..");
const SCRATCH = (process.env.SCRATCH || os.tmpdir());
const UDD = `${SCRATCH}/tl-freeze-udd`;
const PORT = 8894;
const args = process.argv.slice(2);
const FREEZE_S = +(args.includes('--freeze') ? args[args.indexOf('--freeze') + 1] : 300);
const KEEPALIVE = args.includes('--keepalive');
// --natural: let Chrome freeze the tab itself, hidden via Target.createTarget + activateTarget, to
// see
// whether a held Web Lock exempts it.
// why: lessons/timeline-lab.md#rf-natural
const NATURAL = args.includes('--natural');
const DBG_PORT = 9322;
const OUT = `${ROOT}/timeline/lab/results/freeze-chrome133.json`;
const MIME = { '.mjs': 'text/javascript', '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json' };

const serve = () => new Promise((res) => {
  const s = http.createServer((req, rq) => {
    const p = path.join(ROOT, new URL(req.url, 'http://x').pathname);
    if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { rq.writeHead(404); return rq.end('no'); }
    rq.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(rq);
  }).listen(PORT, '127.0.0.1', () => res(s));
});
function killMine() {
  try {
    const o = execSync('ps -Ao pid,command | grep -F "tl-freeze-udd" | grep -v grep || true').toString();
    const pids = o.split('\n').filter(Boolean).map((l) => parseInt(l.trim().split(/\s+/)[0], 10));
    if (pids.length) execSync(`kill -9 ${pids.join(' ')} 2>/dev/null || true`);
  } catch {}
}
function renderersOfMine() {
  // Renderer processes do NOT carry --user-data-dir, so find the BROWSER
  // process by our UDD pattern and take its --type=renderer children.
  try {
    const rows = execSync('ps -Ao pid,ppid,command').toString().split('\n').filter(Boolean).map((l) => {
      const m = l.trim().match(/^(\d+)\s+(\d+)\s+(.*)$/);
      return m ? { pid: +m[1], ppid: +m[2], cmd: m[3] } : null;
    }).filter(Boolean);
    const browser = rows.find((r) => r.cmd.includes('tl-freeze-udd') && !r.cmd.includes('--type='));
    if (!browser) return [];
    return rows.filter((r) => r.ppid === browser.pid && r.cmd.includes('--type=renderer')).map((r) => r.pid);
  } catch { return []; }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

(async () => {
  killMine();
  const srv = await serve();
  const br = await chromium.launchPersistentContext(UDD, {
    headless: true, args: ['--mute-audio', '--autoplay-policy=no-user-gesture-required',
      ...(NATURAL ? [`--remote-debugging-port=${DBG_PORT}`,
                     '--enable-features=FreezingOnEnergySaver,FreezingOnEnergySaverTesting'] : [])],
  });
  let report = null, meta = {};
  try {
    const page = await br.newPage();
    page.on('console', (m) => { if (m.type() === 'error') say('  page-error:', m.text().slice(0, 200)); });
    await page.goto(`http://127.0.0.1:${PORT}/timeline/lab/freeze.html?keepalive=${KEEPALIVE ? 1 : 0}&burn=${NATURAL ? 1 : 0}`);
    await page.waitForFunction('window.__ready', null, { timeout: 20000 });
    const cdp = await br.newCDPSession(page);
    await page.evaluate('window.__start()');
    say(`playing; ${KEEPALIVE ? 'keepalive ON' : 'no keepalive'} — 6 s of baseline`);
    await sleep(6000);
    const before = await page.evaluate('window.__report()');
    say(`baseline: pos ${before.pos} reduce=${before.state.reduce} correct=${before.correct} burst=${before.fires.burst} host=${before.hostName}`);

    // Hide the tab, then freeze. Page.setWebLifecycleState 'frozen' changed nothing in headless, so
    // the renderer is SIGSTOPped: that stops the main thread and the worker tick, as a real freeze
    // does.
    // why: lessons/timeline-lab.md#rf-freeze
    let frozenMs = 0;
    if (NATURAL) {
      // Chrome's own path (hidden > 5 min, silent, CPU-intensive, FreezingOnEnergySaverTesting); a
      // held Web
      // Lock exempts it, which is what --keepalive holds.
      // why: lessons/timeline-lab.md#rf-own-path
      const bcdp = new CDP();
      await bcdp.connectBrowser(DBG_PORT);
      const blank = await bcdp.send('Target.createTarget', { url: 'about:blank' });
      await bcdp.send('Target.activateTarget', { targetId: blank.targetId });
      await sleep(1500);
      const list = await (await fetch(`http://127.0.0.1:${DBG_PORT}/json/list`)).json();
      const mine = list.find((t) => t.url.includes('freeze.html'));
      meta.visibilityWhenHidden = 'see page report';
      say(`hidden via Target.activateTarget; waiting ${FREEZE_S} s for Chrome to freeze it on its own…`);
      const tF = Date.now();
      await sleep(FREEZE_S * 1000);
      await bcdp.send('Target.activateTarget', { targetId: mine.id });
      bcdp.close();
      frozenMs = Date.now() - tF;
      meta.mode = 'natural'; meta.cdpFreezeAccepted = null; meta.rendererPids = [];
    } else {
      const other = await br.newPage();
      await other.goto('about:blank');
      await other.bringToFront();
      await sleep(500);
      meta.visibilityWhenHidden = await page.evaluate('document.visibilityState').catch(() => '?');
      let cdpOk = true;
      try { await cdp.send('Page.setWebLifecycleState', { state: 'frozen' }); }
      catch (e) { cdpOk = false; say('  CDP freeze refused:', e.message.slice(0, 120)); }
      const rendererPids = renderersOfMine();
      say(`freezing for ${FREEZE_S} s… (visibility=${meta.visibilityWhenHidden}, cdpFrozen=${cdpOk}, SIGSTOP on renderers ${rendererPids.join(',')})`);
      const tFreeze = Date.now();
      if (rendererPids.length) execSync(`kill -STOP ${rendererPids.join(' ')}`);
      await sleep(FREEZE_S * 1000);
      if (rendererPids.length) execSync(`kill -CONT ${rendererPids.join(' ')}`);
      try { await cdp.send('Page.setWebLifecycleState', { state: 'active' }); } catch {}
      await page.bringToFront();
      frozenMs = Date.now() - tFreeze;
      meta.rendererPids = rendererPids; meta.cdpFreezeAccepted = cdpOk; meta.mode = 'sigstop';
      await other.close();
    }
    say(`resumed after ${(frozenMs / 1000).toFixed(1)} s`);

    await sleep(2500);                       // let catch-up happen and be observed
    await page.evaluate('window.__dumpProbe()');
    await sleep(500);
    report = await page.evaluate('window.__report()');
    meta = { ...meta, frozenMs, freezeRequestedS: FREEZE_S, keepalive: KEEPALIVE, before };
    await page.close();
  } finally { await br.close(); srv.close(); killMine(); }

  const r = report;
  console.log('\n=== ' + (meta.mode || '?').toUpperCase() + ' freeze attempt, '  + (meta.frozenMs / 1000).toFixed(1) + ' s  keepalive=' + KEEPALIVE + ' ===');
  console.log(`  main-thread gaps > 500 ms: ${JSON.stringify(r.mainThreadGaps.map((g) => Math.round(g.gapMs)))}`);
  console.log(`  probe WORKER: ${r.probeTicks} ticks at 250 ms; gaps > 1 s: ${JSON.stringify(r.probeGapsMs.map(Math.round))}`);
  console.log(`  scheduler maxTickGapMs ${r.sched.maxTickGapMs}   busyMs ${r.sched.busyMs}`);
  console.log(`  position after resume ${r.pos} ms   playing=${r.playing} rate=${r.rate}`);
  console.log(`  reduce lane: state ${r.state.reduce}  expected ${r.expected}  CORRECT=${r.correct}`);
  console.log(`  recovery: ${r.recoveryMs} ms after the first main-thread task post-resume  (${r.assertsAfterResume} asserts)`);
  console.log(`  burst lane fired ${r.fires.burst} / drop lane fired ${r.fires.drop} / reduce lane actuate() fired ${r.fires.reduce}`);
  console.log(`  events: ${JSON.stringify(r.sched.counts)}  total ${r.sched.total}`);
  console.log(`  keepalive: ${JSON.stringify(r.keep)}`);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  let all = {};
  try { all = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch {}
  all[`${meta.mode}-${KEEPALIVE ? 'keepalive' : 'plain'}-${FREEZE_S}s`] = { ...meta, report: r };
  fs.writeFileSync(OUT, JSON.stringify(all, null, 2));
  console.log(`\nwrote ${OUT}`);
  console.log(`  FROZEN? mainThread ${r.mainThreadGaps.length ? 'YES' : 'no'} / worker ${r.probeGapsMs.length ? 'YES' : 'no'}`);
  process.exit(r.correct ? 0 : 1);
})();
