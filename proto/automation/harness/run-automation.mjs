// proto/automation/harness/run-automation.mjs — verification of the CONTINUOUS
// (cc) kind in ONE headless Chrome with two tabs on :8888:
//
//   tab 1  xy.html          the XY pad -> CC -> WebAudio voice
//   tab 2  automation.html  the automation lane over a media clip
//
// Node does the exhaustive 14-bit / pitch-bend round-trips against the SAME
// cc-core.js module the pages import, and computes every expected controller
// value independently (its own fold, its own analytic curve) so the assertions
// are not the library grading its own homework.
//
//   node harness/run-automation.mjs
//
// Kills only its own: the auto-udd profile and proto/automation/server.mjs.

import { spawn, execSync } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import { openSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CDP } from '../../jam/harness/cdp.mjs';      // reused verbatim, not copied
import * as CC from '../cc-core.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const SCRATCH = '/private/tmp/claude-501/-Users-s32863-personal-elektron/596385e3-9b74-4f17-837f-b4eb2eb5a254/scratchpad';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 8888, DBG = 9251;
const BASE = `http://127.0.0.1:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sh = (c) => { try { return execSync(c, { encoding: 'utf8' }); } catch (e) { return (e.stdout || '') + ''; } };
const q = JSON.stringify;
const kids = [];
function spawnLogged(cmd, argv, name) {
  const fd = openSync(join(SCRATCH, `auto-${name}.log`), 'a');
  const p = spawn(cmd, argv, { stdio: ['ignore', fd, fd] });
  kids.push(p); console.log(`spawned ${name} pid=${p.pid}`);
  return p;
}
const CHECKS = [], REPORT = {};
function check(name, ok, detail) {
  CHECKS.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined ? '  — ' + (typeof detail === 'string' ? detail : q(detail)) : ''}`);
}

// ---------------------------------------------------------------------------
// the analytic gesture — DUPLICATED here on purpose. If the harness imported
// the page's curves the test would only prove the page agrees with itself.
// ---------------------------------------------------------------------------
const CURVES = {
  74: (ms) => Math.round(63.5 + 63 * Math.sin((2 * Math.PI * ms) / 2500)),
  71: (ms) => Math.round(63.5 + 63 * Math.sin((2 * Math.PI * ms) / 1700 + 1)),
  1: (ms) => Math.round(8191.5 + 8191 * Math.sin((2 * Math.PI * ms) / 3300)),
  pb: (ms) => Math.round(8191.5 + 8191 * Math.sin((2 * Math.PI * ms) / 4100 + 0.6)),
};
const analytic14 = { 'cc:0:74': (ms) => CURVES[74](ms) * 128, 'cc:0:71': (ms) => CURVES[71](ms) * 128,
                     'cc:0:1': (ms) => CURVES[1](ms), 'pb:0': (ms) => CURVES.pb(ms) };

let cdpX, cdpA;
async function newTab(url) {
  const r = await (await fetch(`http://127.0.0.1:${DBG}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' })).json();
  return r.url;
}

async function main() {
  await mkdir(join(ROOT, 'results'), { recursive: true });
  sh(`pkill -f 'auto-udd' 2>/dev/null`);
  sh(`pkill -f 'proto/automation/server.mjs' 2>/dev/null`);
  await sleep(300);
  spawnLogged('node', [join(ROOT, 'server.mjs')], 'server');
  for (let i = 0; i < 40; i++) { try { await fetch(BASE + '/time-local'); break; } catch { await sleep(250); } }

  // ---------------------------------------------------------------------
  // 0. node-side exhaustive wire round-trips (all 16384 values, both forms)
  // ---------------------------------------------------------------------
  let bad14 = 0, firstBad14 = null;
  for (let v = 0; v <= 16383; v++) {
    const raws = CC.enc14(0, 1, v);
    const rows = raws.map((r) => CC.frameToRow(CC.decodeFrame(CC.encodeFrame({ status: r[0], d1: r[1], d2: r[2], tUs: 0 }))));
    const got = CC.foldRows(rows).get('cc:0:1').value14;
    if (got !== v) { bad14++; if (firstBad14 === null) firstBad14 = { v, got }; }
  }
  check('14-bit CC pair round-trips exactly (all 16384)', bad14 === 0, bad14 ? { bad: bad14, first: firstBad14 } : '16384/16384 exact, MSB=CC1 LSB=CC33');
  let badPB = 0, firstBadPB = null;
  for (let v = 0; v <= 16383; v++) {
    const raw = CC.encPB(0, v)[0];
    const got = CC.decodeFrame(CC.encodeFrame({ status: raw[0], d1: raw[1], d2: raw[2], tUs: 0 })).value14;
    if (got !== v) { badPB++; if (firstBadPB === null) firstBadPB = { v, got }; }
  }
  check('pitch bend round-trips exactly (all 16384)', badPB === 0, badPB ? { bad: badPB, first: firstBadPB } : '16384/16384 exact, 0xE0 lsb-first, centre 8192');
  // and the raw bytes really are verbatim through the frame
  const vb = [[0xb0, 74, 99], [0xb0, 33, 7], [0xe0, 3, 64], [0xb0, 64, 127]].every((r) => {
    const f = CC.decodeFrame(CC.encodeFrame({ status: r[0], d1: r[1], d2: r[2], tUs: 1234567 }));
    return f.raw[0] === r[0] && f.raw[1] === r[1] && f.raw[2] === r[2] && f.tUs === 1234567;
  });
  check('raw MIDI bytes travel verbatim in the 16-B frame', vb, 'status|d1|d2|src|u32 seq|f64 tUs — same layout as jam-core');
  REPORT.wire = { bad14, badPB, frameBytes: CC.FRAME_BYTES };

  // ---------------------------------------------------------------------
  // 1. one browser, two tabs
  // ---------------------------------------------------------------------
  const flags = [
    '--headless=new', `--user-data-dir=${SCRATCH}/auto-udd`, `--remote-debugging-port=${DBG}`,
    '--no-first-run', '--no-default-browser-check',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--disable-features=IntensiveWakeUpThrottling,CalculateNativeWinOcclusion',
    '--autoplay-policy=no-user-gesture-required',
    '--window-size=1500,1150',
  ];
  spawnLogged(CHROME, [...flags, `${BASE}/xy.html`], 'chrome');
  cdpX = await new CDP().connect(DBG, 'xy.html');
  await newTab(`${BASE}/automation.html`);
  cdpA = await new CDP().connect(DBG, 'automation.html');
  await cdpX.send('Page.enable').catch(() => {});
  await cdpA.send('Page.enable').catch(() => {});
  await sleep(600);

  // =====================================================================
  // XY PAD
  // =====================================================================
  await cdpX.eval('AUTO.ready()');
  const synth = await cdpX.eval(`JSON.stringify(AUTO.synth({durMs:8000, stepMs:5}))`).then(JSON.parse);
  const built = await cdpX.eval(`JSON.stringify(AUTO.build())`).then(JSON.parse);
  console.log('  synth', q(synth), '\n  deck ', q(built));
  REPORT.xy = { synth, built };

  const rows = await cdpX.eval('JSON.stringify(AUTO.rows())').then(JSON.parse);
  const capsRaw = await cdpX.eval('JSON.stringify(AUTO.caps())').then(JSON.parse);
  REPORT.caps = capsRaw;
  check('cc caps declare the continuous contract', capsRaw.continuous === true && capsRaw.interpolate === true && capsRaw.catchUp === 'reduce',
        { continuous: capsRaw.continuous, interpolate: capsRaw.interpolate, catchUp: capsRaw.catchUp, resolution: capsRaw.resolution, repair: capsRaw.repair });

  // throttle actually thinned the stream
  const ratio = +(synth.raw / synth.rows).toFixed(2);
  check('capture throttle thinned the sweep', synth.rows < synth.raw / 3, `${synth.raw} raw samples -> ${synth.rows} logged rows (${ratio}:1)`);

  // browser-side spot round-trip through the page's own module instance
  const spot = [0, 1, 127, 128, 8191, 8192, 12345, 16383];
  const rt = await cdpX.eval(`JSON.stringify(${q(spot)}.map(v => [AUTO.rt14(1,v), AUTO.rtPB(v)]))`).then(JSON.parse);
  const rtOk = rt.every((p, i) => p[0] === spot[i] && p[1] === spot[i]);
  check('browser round-trips the same values', rtOk, rtOk ? `${spot.length} spot values, 14-bit + bend, exact` : q(rt));

  // ---- play the whole thing at x1: replay count must match the log --------
  await cdpX.eval('AUTO.seek(0), AUTO.setRate(1), AUTO.play(), true');
  const [lo, hi] = built.range;
  for (let i = 0; i < 260 && (await cdpX.eval('AUTO.position()')) < hi - 30; i++) await sleep(80);
  await sleep(400);
  const counts = await cdpX.eval('JSON.stringify(AUTO.counts())').then(JSON.parse);
  const stats = await cdpX.eval('JSON.stringify(AUTO.stats())').then(JSON.parse);
  await cdpX.eval('AUTO.pause()');
  check('replay count matches the log', counts.replay === synth.rows,
        { actuated: counts.replay, rows: synth.rows, fired: stats.counts.fired, reduced: stats.counts.reduced, dropped: stats.counts.dropped });
  REPORT.replay = { counts, stats: stats.counts };

  // ---- pause holds --------------------------------------------------------
  const p1 = await cdpX.eval('AUTO.position()');
  await sleep(500);
  const p2 = await cdpX.eval('AUTO.position()');
  check('pause holds the playhead', Math.abs(p2 - p1) < 1 && (await cdpX.eval('AUTO.playing()')) === false, `${p1.toFixed(2)} -> ${p2.toFixed(2)} ms over 500 ms`);

  // ---- rate 2x -----------------------------------------------------------
  await cdpX.eval('AUTO.seek(1000), AUTO.setRate(2), AUTO.play(), true');
  const r0 = await cdpX.eval('AUTO.position()'); const w0 = Date.now();
  await sleep(1200);
  const r1 = await cdpX.eval('AUTO.position()'); const w1 = Date.now();
  await cdpX.eval('AUTO.pause()');
  const meas = (r1 - r0) / (w1 - w0);
  check('rate 2x advances the position at 2x', Math.abs(meas - 2) < 0.12, `measured ${meas.toFixed(3)}x over ${(w1 - w0)}ms`);
  REPORT.rate = { measured: +meas.toFixed(3) };

  // ---- SEEK x3: does the controller map land where it must? --------------
  // node's own fold of the log prefix, and node's own analytic curve.
  const leadIn = built.leadInMs;
  const seeks = [1234, 5678, 3210];
  const seekReport = [];
  for (const pos of seeks) {
    await cdpX.eval(`AUTO.seek(${pos})`);
    await sleep(120);
    const gotFold = await cdpX.eval(`JSON.stringify(AUTO.reduceAt(${pos}))`).then(JSON.parse);
    const gotWire = await cdpX.eval(`JSON.stringify(AUTO.assertedMap())`).then(JSON.parse);
    const voice = await cdpX.eval('JSON.stringify(AUTO.voiceState())').then(JSON.parse);
    // node's independent fold of every row at or before this position
    const prefix = rows.filter((r) => (r.at - built.originUs) / 1000 + leadIn <= pos);
    const mine = CC.foldRows(prefix);
    const gestureMs = pos - leadIn;
    const per = {};
    for (const [key, e] of mine) {
      const g = gotFold.find((x) => x.key === key);
      const w = gotWire.find((x) => x.key === key);
      const an = analytic14[key] ? analytic14[key](gestureMs) : null;
      per[key] = {
        fold: e.value14, libFold: g ? g.value14 : null, wire: w ? w.value14 : null,
        analytic: an,
        errFoldVsLib: g ? Math.abs(e.value14 - g.value14) : null,
        errFoldVsAnalytic: an === null ? null : Math.abs(e.value14 - an),
        errWireVsAnalytic: an === null || !w ? null : Math.abs(w.value14 - an),
      };
    }
    seekReport.push({ pos, gestureMs, n: mine.size, per, voice });
    // NB: sustain (CC64) is first pressed at gesture ms 1500, so a seek to
    // 1234 ms legitimately has 4 controllers and not 5. Asserting ">= 5"
    // everywhere was the harness being wrong, not the reducer.
    const exact = Object.values(per).every((x) => x.errFoldVsLib === 0);
    const worstFold = Math.max(...Object.values(per).map((x) => x.errFoldVsAnalytic ?? 0));
    const worstWire = Math.max(...Object.values(per).map((x) => x.errWireVsAnalytic ?? 0));
    check(`seek -> ${pos}ms restores the controller map`, exact && Object.keys(per).length >= (gestureMs >= 1500 ? 5 : 4),
          `${mine.size} controllers, library fold === node fold (err 0); vs analytic curve: knot-only max ${worstFold} lsb (${(worstFold / 163.83).toFixed(2)}%), interpolated-assert max ${worstWire} lsb (${(worstWire / 163.83).toFixed(2)}%)`);
    for (const [k, v] of Object.entries(per)) {
      console.log(`      ${k.padEnd(9)} fold=${String(v.fold).padStart(5)} wire=${String(v.wire).padStart(5)} analytic=${String(v.analytic).padStart(5)}  errKnot=${v.errFoldVsAnalytic} errInterp=${v.errWireVsAnalytic}`);
    }
  }
  REPORT.seeks = seekReport;
  // sustain (CC64) must survive a seek — the switch case
  // sustain is pressed at 1500 and released at 3000, pressed again at 4500:
  // the fold must be ABSENT before 1500, and 127 at 3210 and 5678.
  const susAt = seekReport.map((s) => ({ pos: s.pos, gestureMs: s.gestureMs, sus: (s.per['cc:0:64'] || {}).fold }));
  const susOk = susAt.every((s) => (s.gestureMs < 1500 ? s.sus === undefined : s.sus === 127 * 128));
  check('switch state (sustain CC64) survives seek — and is absent before it was pressed', susOk, q(susAt));

  const dev = await cdpX.eval('JSON.stringify(AUTO.deviation())').then(JSON.parse);
  REPORT.deviation = dev;
  console.log('  throttle cost (reconstruction vs full-rate evidence):');
  for (const [k, d] of Object.entries(dev)) console.log(`      ${k.padEnd(9)} mean ${String(d.meanLsb).padStart(6)}  p95 ${String(d.p95Lsb).padStart(5)}  max ${String(d.maxLsb).padStart(5)} lsb (${d.maxPct}%)`);

  // paint a nice final frame for the screenshot
  await cdpX.eval('AUTO.seek(3400), AUTO.setRate(1), true');
  await sleep(300);

  // =====================================================================
  // AUTOMATION LANE over the media clip
  // =====================================================================
  const ready = await cdpA.eval('AUTO.ready().then(r => JSON.stringify(r))').then(JSON.parse);
  console.log('  media', q(ready));
  const curve = await cdpA.eval('JSON.stringify(AUTO.synthCurve({stepMs:5}))').then(JSON.parse);
  REPORT.automation = { ready, curve };
  check('media clip prepared and the lane is bound to it', ready.mediaDurMs > 1000 && curve.rows > 20,
        `clip ${(ready.mediaDurMs / 1000).toFixed(2)}s, lead-in ${ready.leadIn}ms, ${curve.rows} lane rows from ${curve.raw} raw`);

  await cdpA.eval('AUTO.resetDrift(), AUTO.seek(500), AUTO.play(), true');
  await sleep(1500);
  const mid = await cdpA.eval('JSON.stringify({pos:AUTO.position(), media:AUTO.mediaTime(), present:AUTO.mediaPresent()})').then(JSON.parse);
  check('media element is running as the clock master', !mid.media.paused && mid.media.ct > 0.4 && mid.present === 1,
        `pos ${mid.pos.toFixed(0)}ms  media ct ${mid.media.ct.toFixed(3)}s  clips present ${mid.present}`);

  // ---- the scrub: transport and media must stay welded ------------------
  const scrubs = [8000, 2500, 14000, 6000, 11500];
  const scrubRows = [];
  for (const s of scrubs) {
    await cdpA.eval(`AUTO.seek(${s})`);
    await sleep(700);
    const r = await cdpA.eval('JSON.stringify({pos:AUTO.position(), m:AUTO.mediaTime(), v:AUTO.valueAt(AUTO.position()), e:AUTO.expected(AUTO.position())})').then(JSON.parse);
    const lagMs = r.pos - (500 + r.m.ct * 1000);
    scrubRows.push({ seekTo: s, pos: +r.pos.toFixed(1), mediaPos: +(500 + r.m.ct * 1000).toFixed(1), lagMs: +lagMs.toFixed(2),
                     laneValue: r.v === null ? null : +r.v.toFixed(1), expected: r.e, valueErr: r.v === null ? null : +Math.abs(r.v - r.e).toFixed(2) });
  }
  const dstats = await cdpA.eval('JSON.stringify(AUTO.drift())').then(JSON.parse);
  const acounts = await cdpA.eval('JSON.stringify(AUTO.counts())').then(JSON.parse);
  await cdpA.eval('AUTO.pause()');
  REPORT.automation.scrubs = scrubRows;
  REPORT.automation.drift = dstats;
  REPORT.automation.counts = acounts;
  console.log('  scrub sequence:'); for (const r of scrubRows) console.log('      ' + q(r));
  const maxLag = Math.max(...scrubRows.map((r) => Math.abs(r.lagMs)));
  check('automation lane stays aligned to the media across a scrub',
        dstats.maxEst < 100 && maxLag < 100,
        `continuous drift |max| ${dstats.maxEst} ms, p95 ${dstats.p95Est} ms (edge-extrapolated media clock; raw-currentTime max ${dstats.maxRaw} ms), ${dstats.n} samples, ${dstats.corrections} sync corrections; post-scrub settle |max| ${maxLag.toFixed(2)} ms over ${scrubs.length} scrubs`);
  const vErr = Math.max(...scrubRows.map((r) => r.valueErr ?? 0));
  check('the control value under the playhead follows the scrub', vErr < 4,
        `max |lane value - analytic curve| = ${vErr.toFixed(2)} of 127 across ${scrubs.length} scrub targets`);

  // =====================================================================
  // console cleanliness + screenshots
  // =====================================================================
  check('0 console errors on xy.html', cdpX.errors.length === 0, cdpX.errors.slice(0, 3).join(' | ') || 'clean');
  check('0 console errors on automation.html', cdpA.errors.length === 0, cdpA.errors.slice(0, 3).join(' | ') || 'clean');

  await cdpX.send('Target.activateTarget', { targetId: (await targetId('xy.html')) }).catch(() => {});
  await sleep(250); await cdpX.screenshot(join(ROOT, 'results', 'xy.png'));
  await cdpA.send('Target.activateTarget', { targetId: (await targetId('automation.html')) }).catch(() => {});
  await sleep(250); await cdpA.screenshot(join(ROOT, 'results', 'automation.png'));
  console.log('screenshots -> proto/automation/results/{xy,automation}.png');

  REPORT.checks = CHECKS;
  REPORT.at = new Date().toISOString();
  await writeFile(join(ROOT, 'results', 'verify.json'), JSON.stringify(REPORT, null, 2));
}

async function targetId(match) {
  const list = await (await fetch(`http://127.0.0.1:${DBG}/json/list`)).json();
  const t = list.find((x) => x.type === 'page' && x.url.includes(match));
  return t && t.id;
}

main().catch((e) => { console.error('HARNESS ERROR', e); check('harness completed', false, String(e && e.message)); })
  .finally(async () => {
    const pass = CHECKS.filter((c) => c.ok).length;
    console.log(`\n${pass}/${CHECKS.length} checks passed`);
    try { cdpX && cdpX.close(); cdpA && cdpA.close(); } catch {}
    for (const k of kids) { try { k.kill(); } catch {} }
    sh(`pkill -f 'auto-udd' 2>/dev/null`);
    sh(`pkill -f 'proto/automation/server.mjs' 2>/dev/null`);
    process.exit(pass === CHECKS.length ? 0 : 1);
  });
