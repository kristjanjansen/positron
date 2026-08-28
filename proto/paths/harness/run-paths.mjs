// proto/paths/harness/run-paths.mjs — headless verification of the continuous
// pointer client. ONE Chrome, one tab.
//
//   node proto/paths/harness/run-paths.mjs
//
// Asserts:
//   A  sample count: stored lane == deck items == scheduler items
//   B  seek x3 puts the pointer at the ANALYTICALLY correct position (px error)
//   C  pause holds the position
//   D  rate 2x halves the wall duration of a fixed span
//   E  all four lanes actually paint (per-lane offscreen ink probe)
//   F  deviation numbers computed, and ordered hold > linear > catmull
//   G  zero console errors / exceptions
//
// Machine rules: port 8887 only, CDP 9327, chrome user-data-dir prefix
// paths-udd, kills only its own processes.

import { spawn, execSync } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import { openSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CDP } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const SCRATCH = '/private/tmp/claude-501/-Users-s32863-personal-elektron/596385e3-9b74-4f17-837f-b4eb2eb5a254/scratchpad';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 8887;
const BASE = `http://127.0.0.1:${PORT}`;
const DBG = 9327;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sh = (c) => { try { return execSync(c, { encoding: 'utf8' }); } catch (e) { return (e && e.stdout) || ''; } };
const kids = [];
function run(cmd, argv, name) {
  const fd = openSync(join(SCRATCH, `paths-${name}.log`), 'a');
  const p = spawn(cmd, argv, { stdio: ['ignore', fd, fd] });
  kids.push(p);
  return p;
}

const R = { at: new Date().toISOString(), node: process.version, asserts: [], numbers: {} };
let pass = 0, fail = 0;
function check(name, ok, detail) {
  R.asserts.push({ name, ok: !!ok, detail });
  if (ok) { pass++; console.log(`  PASS ${name} — ${detail}`); }
  else { fail++; console.log(`  FAIL ${name} — ${detail}`); }
}

let chrome, page;

async function main() {
  await mkdir(join(ROOT, 'results'), { recursive: true });
  sh(`pkill -f 'paths-udd' 2>/dev/null`);
  sh(`pkill -f 'proto/paths/server.mjs' 2>/dev/null`);
  await sleep(400);

  run('node', [join(ROOT, 'server.mjs')], 'server');
  for (let i = 0; i < 40; i++) { try { await fetch(BASE + '/time-local'); break; } catch { await sleep(250); } }
  console.log(`server up :${PORT}`);

  chrome = run(CHROME, [
    '--headless=new', `--user-data-dir=${SCRATCH}/paths-udd`, `--remote-debugging-port=${DBG}`,
    '--no-first-run', '--no-default-browser-check', '--window-size=1400,1160',
    '--force-device-scale-factor=1', '--hide-scrollbars',
    `${BASE}/paths.html`,
  ], 'chrome');

  page = await new CDP().connect(DBG, 'paths.html');
  const consoleErrors = [];
  page.on('Runtime.exceptionThrown', (p) => consoleErrors.push('exception: ' +
    String(p?.exceptionDetails?.exception?.description || p?.exceptionDetails?.text).slice(0, 300)));
  page.on('Runtime.consoleAPICalled', (p) => { if (p.type === 'error') consoleErrors.push('console.error: ' + JSON.stringify(p.args?.[0]?.value ?? '').slice(0, 300)); });
  page.on('Log.entryAdded', (p) => { if (p.entry?.level === 'error') consoleErrors.push('log: ' + String(p.entry.text).slice(0, 300)); });
  await page.send('Runtime.enable');
  await page.send('Log.enable');
  await page.send('Page.enable');

  for (let i = 0; i < 60; i++) { if (await page.eval('!!window.paths')) break; await sleep(250); }
  console.log('page ready\n');

  // ---------------- record the synthetic path ----------------
  const synth = await page.eval('paths.synthesize({durationMs:6000, hz:120, jitterMs:2})');
  const st0 = await page.eval('paths.state()');
  R.numbers.capture = { ...synth, ...{ lane: st0.laneItems, deckItems: st0.deckItems, schedTotal: st0.schedTotal, durationMs: st0.durationMs } };
  console.log(`[capture] evidence=${synth.evidence} stored=${synth.stored} duration=${st0.durationMs} ms`);
  R.numbers.caps = st0.caps;

  // A — sample count
  check('A sample-count', st0.stored === st0.laneItems && st0.laneItems === st0.deckItems && st0.deckItems === st0.schedTotal,
    `stored=${st0.stored} lanePayloads=${st0.laneItems} deckItems=${st0.deckItems} schedulerTotal=${st0.schedTotal}`);

  // B — seek x3 against analytic ground truth
  const probes = [];
  for (const frac of [0.23, 0.5, 0.77]) {
    const pos = +(st0.durationMs * frac).toFixed(2);
    probes.push(await page.eval(`JSON.stringify(paths.seekProbe(${pos}))`).then(JSON.parse));
  }
  R.numbers.seek = probes.map((p) => ({
    pos: p.pos, method: p.method, errReducedPx: p.errReducedPx,
    errLinearPx: p.errLinearPx, errHoldPx: p.errHoldPx,
    truth: { x: +p.truth.x.toFixed(2), y: +p.truth.y.toFixed(2) },
    reduced: { x: +p.reduced.x.toFixed(2), y: +p.reduced.y.toFixed(2) },
  }));
  const worst = Math.max(...probes.map((p) => p.errReducedPx));
  for (const p of R.numbers.seek) console.log(`[seek] pos=${p.pos} method=${p.method} reduced err=${p.errReducedPx} px (linear ${p.errLinearPx}, hold ${p.errHoldPx})`);
  check('B seek-accuracy', worst < 2.0 && probes.every((p) => p.method === 'catmull-rom'),
    `worst reduce() error ${worst.toFixed(3)} px vs analytic truth; method=${probes[0].method}`);
  check('B2 interpolated-beats-hold', probes.every((p) => p.errReducedPx < p.errHoldPx),
    `reduce() interpolates: ${probes.map((p) => `${p.errReducedPx}<${p.errHoldPx}`).join(' ')}`);

  // C — pause holds
  const hold = await page.eval('paths.pauseHolds(400)');
  R.numbers.pause = hold;
  check('C pause-holds', Math.abs(hold.driftMs) < 0.001 && hold.rate === 0,
    `position ${hold.before.toFixed(3)} -> ${hold.after.toFixed(3)} after 400 ms (drift ${hold.driftMs} ms), rate=${hold.rate}`);

  // D — rate 2x halves the wall duration
  const t1 = await page.eval('paths.traverse(300, 1800, 1)');
  const t2 = await page.eval('paths.traverse(300, 1800, 2)');
  const ratio = t1.wallMs / t2.wallMs;
  R.numbers.rate = { rate1: t1, rate2: t2, ratio: +ratio.toFixed(3) };
  console.log(`[rate] 1x ${t1.wallMs} ms (observed ${t1.observedRate}x) · 2x ${t2.wallMs} ms (observed ${t2.observedRate}x) · ratio ${ratio.toFixed(3)}`);
  check('D rate-2x', ratio > 1.85 && ratio < 2.15,
    `1500 ms span: ${t1.wallMs} ms @1x vs ${t2.wallMs} ms @2x -> ${ratio.toFixed(3)}x`);

  // E — four lanes render
  await page.eval(`paths.S.deck.seek(${(st0.durationMs * 0.62).toFixed(2)})`);
  await sleep(200);
  const ink = await page.eval('paths.laneInk()');
  R.numbers.ink = ink;
  check('E four-lanes-render', Object.values(ink).every((n) => n > 500),
    `painted px — evidence=${ink.evidence} stored=${ink.stored} linear=${ink.linear} smooth=${ink.smooth}`);

  // F — deviation numbers
  const st = await page.eval('paths.state()');
  const d = st.dev;
  R.numbers.deviation = d;
  R.numbers.geometry = { flatSmooth: st.flatSmooth, flatLinear: st.flatLinear, attested: st.laneItems, evidence: st.evidence };
  console.log(`[deviation] hold mean=${d.hold.mean.toFixed(2)} max=${d.hold.max.toFixed(2)} · linear mean=${d.linear.mean.toFixed(3)} max=${d.linear.max.toFixed(3)} · catmull mean=${d.catmull.mean.toFixed(4)} max=${d.catmull.max.toFixed(4)} px`);
  check('F deviation-computed', d.hold.n > 0 && d.hold.mean > d.linear.mean && d.linear.mean > d.catmull.mean,
    `mean px error: hold ${d.hold.mean.toFixed(2)} > linear ${d.linear.mean.toFixed(3)} > catmull ${d.catmull.mean.toFixed(4)} (n=${d.hold.n})`);

  R.numbers.adapter = { fires: st.fires, reduceCalls: st.reduceCalls, interpCalls: st.interpCalls, renderAtMs: +st.renderAtMs.toFixed(4) };
  // v0.4: what the LIBRARY served — the ask it answered, what it had to refuse,
  // and the cursor's cost for every continuous read this session made.
  R.numbers.continuous = { ask: st.ask, degradations: st.degradations, cursor: st.cursor };
  const cur = st.cursor && st.cursor.cursor;
  if (cur) console.log(`[cursor] sampleAt calls=${st.cursor.sampleCalls} bracket=${st.cursor.bracketCalls} · comparisons=${cur.comparisons} (${(cur.comparisons / Math.max(1, st.cursor.bracketCalls)).toFixed(2)}/call) · hits=${cur.hits} advances=${cur.advances} searches=${cur.searches}`);
  console.log(`[request] ${st.ask && st.ask.degraded ? 'DEGRADED' : 'granted in full'} :: ${JSON.stringify(st.ask && st.ask.per)}`);
  check('F2 adapter-actuated', st.fires > 0 && st.interpCalls > st.fires,
    `attested fires=${st.fires}, interpolate() calls=${st.interpCalls}, reduce() calls=${st.reduceCalls}`);

  // H — THE EVIDENCE FIREWALL (v0.5, plan-timeline §5b). The evidence-only
  // toggle is a LIBRARY query now, not client filtering: under 'attested' the
  // deck refuses to serve the derived lanes at all, so the strokes have nothing
  // to draw and the per-lane ink for both reconstructions goes to zero while the
  // attested lanes are untouched.
  const wRestored = await page.eval('JSON.stringify(paths.probeWindow("smooth","restored"))').then(JSON.parse);
  const wAttested = await page.eval('JSON.stringify(paths.probeWindow("smooth","attested"))').then(JSON.parse);
  R.numbers.firewall = { restored: wRestored, attested: wAttested, accounting: st.accounting, policy: st.policy, provenance: st.provenance };
  console.log(`[firewall] window(smooth) restored=${wRestored.n} rows (${wRestored.derived} derived) · attested=${wAttested.n} rows (${wAttested.derived} derived)`);
  check('H evidence-firewall', wRestored.derived > 0 && wAttested.derived === 0 && wAttested.n === st.laneItems,
    `attested serves ONLY the ${wAttested.n} attested rows; restored adds ${wRestored.derived} derived ones`);
  await page.eval('paths.setPolicy("attested")');
  await sleep(150);
  const inkAtt = await page.eval('paths.laneInk()');
  await page.eval('paths.setPolicy("restored")');
  await sleep(150);
  const inkBack = await page.eval('paths.laneInk()');
  R.numbers.inkAttested = inkAtt;
  console.log(`[firewall] evidence-only ink — evidence=${inkAtt.evidence} stored=${inkAtt.stored} linear=${inkAtt.linear} smooth=${inkAtt.smooth}`);
  check('H2 evidence-only-collapses', inkAtt.linear === 0 && inkAtt.smooth === 0 &&
    inkAtt.evidence === ink.evidence && inkAtt.stored === ink.stored &&
    inkBack.linear === ink.linear && inkBack.smooth === ink.smooth,
    `under 'attested' both reconstruction lanes paint 0 px (was ${ink.linear}/${ink.smooth}) and the attested lanes are unchanged; switching back restores them exactly`);

  // I — provenance is a real field on real rows
  const pv = wRestored.prov;
  R.numbers.provenance = pv;
  console.log(`[provenance] ${JSON.stringify(pv)}`);
  check('I provenance-fields', pv && pv.source === 'reconstructor-catmull' && pv.method === 'catmull-rom' &&
    pv.tier === 1 && typeof pv.confidence === 'number' && Array.isArray(pv.refs) && pv.refs.length === 2,
    `derived rows carry {source, method, confidence, tier, refs}: ${JSON.stringify(pv)}`);
  const acct = st.accounting;
  check('I2 invented-fraction', acct && acct.attested === st.laneItems && acct.restored > 0 &&
    Math.abs(acct.inventedFraction - acct.restored / acct.total) < 1e-12,
    `the invented fraction is the FIREWALL's accounting: ${acct.restored}/${acct.total} = ${(100 * acct.inventedFraction).toFixed(1)}% invented (attested ${acct.attested}, tiers ${JSON.stringify(acct.byTier)})`);

  // J — reversibility: deleting a restoration is dropping its lane
  const rev = await page.eval('JSON.stringify(paths.dropRestorations())').then(JSON.parse);
  R.numbers.reversibility = rev;
  check('J reversibility', rev.masterIdentical && rev.derivedAfterDrop === 0 && rev.attestedAfterDrop === st.laneItems,
    `dropping both derived lanes (${rev.dropped} rows) leaves the master trace BIT-IDENTICAL (${rev.attestedAfterDrop} attested, ${rev.derivedAfterDrop} derived)`);

  // G — console errors
  const pageErrors = await page.eval('paths.state()').then((s) => s.errors);
  R.numbers.errors = { cdp: consoleErrors, page: pageErrors };
  check('G zero-console-errors', consoleErrors.length === 0 && pageErrors.length === 0,
    `cdp=${consoleErrors.length} page=${pageErrors.length}${consoleErrors.length ? ' :: ' + consoleErrors[0] : ''}`);

  // ---------------- screenshot: four paths + transport ----------------
  await page.eval(`paths.S.deck.seek(${(st0.durationMs * 0.62).toFixed(2)}); paths.S.deck.setRate(1)`);
  await sleep(350);
  const png = await page.screenshot();
  const shot = join(ROOT, 'results', 'paths-verify.png');
  await writeFile(shot, png);
  R.screenshot = shot;
  console.log(`\nscreenshot -> ${shot}`);

  R.summary = { pass, fail };
  await writeFile(join(ROOT, 'results', 'verify.json'), JSON.stringify(R, null, 2));
  console.log(`\n${pass} pass / ${fail} fail`);
}

main().catch((e) => { console.error('HARNESS ERROR', e); fail++; })
  .finally(async () => {
    try { page && page.close(); } catch {}
    for (const k of kids) { try { process.kill(k.pid, 'SIGTERM'); } catch {} }
    await sleep(400);
    sh(`pkill -f 'paths-udd' 2>/dev/null`);
    sh(`pkill -f 'proto/paths/server.mjs' 2>/dev/null`);
    process.exit(fail ? 1 : 0);
  });
