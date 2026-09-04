// proto/jam/harness/run-synth.mjs — orchestrates the PLAY-A-SYNTH CASE.
//
//   node harness/run-synth.mjs [--scale 1] [--only local,p2p-av,p2p-audio,sfu-av]
//
// Two headless Chromes (jam-udd-a player / jam-udd-b synth host) on
// remote-synth.html, REAL AudioContext (no --mute-audio). Driven over CDP;
// pages signal each other through server.mjs mailboxes (:8893, never on a
// measured path). Per-run per-note joins -> results/jam-synth-<runId>.jsonl,
// summary -> results/jam-synth-summary.json. Kills only its own (jam-udd).

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
const BASE = 'http://127.0.0.1:8893';

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes('--' + n) ? args[args.indexOf('--' + n) + 1] : d);
const SCALE = +opt('scale', 1);
const ONLY = String(opt('only', '')).split(',').filter(Boolean);
const SUMMARY = String(opt('summary', 'jam-synth-summary.json'));
const FLOOR0 = +opt('floor', 10);          // moq playout prebuffer start (ms)
const SWEEP = String(opt('sweep', '20,40,80')).split(',').filter(Boolean).map(Number);
const FLOORAV = +opt('floorav', 20);       // floor for the av/hybrid arms
const SESSION = Math.random().toString(36).slice(2, 8);
const want = (x) => !ONLY.length || ONLY.includes(x);
const q = JSON.stringify;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const kids = [];
function run(cmd, argv, name) {
  const fd = openSync(join(SCRATCH, `jam-synth-${name}.log`), 'a');
  const p = spawn(cmd, argv, { stdio: ['ignore', fd, fd] });
  kids.push(p);
  console.log(`spawned ${name} pid=${p.pid}`);
  return p;
}
const sh = (c) => { try { return execSync(c, { encoding: 'utf8' }); } catch (e) { return e.stdout || ''; } };

let cdpA, cdpB;
async function ev(cdp, expr, timeoutMs = 300000) {
  return Promise.race([
    cdp.eval(expr),
    new Promise((_, rej) => setTimeout(() => rej(new Error('eval timeout: ' + expr.slice(0, 60))), timeoutMs)),
  ]);
}

// ---------- stats ----------
function pct(sorted, p) {
  if (!sorted.length) return null;
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}
function dist(vals) {
  if (!vals.length) return null;
  const s = [...vals].sort((a, b) => a - b);
  const f = (x) => (x === null ? null : +x.toFixed(2));
  return { n: s.length, p50: f(pct(s, 50)), p95: f(pct(s, 95)), p99: f(pct(s, 99)), min: f(s[0]), max: f(s[s.length - 1]) };
}

function joinRun(runId, aRes, bRes) {
  const bBySeq = new Map((bRes && bRes.recs || []).map((r) => [r.seq, r]));
  return aRes.recs.sort((x, y) => x.seq - y.seq).map((r) => {
    const b = bBySeq.get(r.seq);
    const row = { run: runId, seq: r.seq, phase: r.phase, tUs: Math.round(r.tUs), aStatus: r.aStatus };
    if (b) {
      row.leg1Ms = +((b.recvUs - r.tUs) / 1000).toFixed(2);
      row.bStatus = b.bStatus;
      if (b.onsetBUs) row.leg2Ms = +((b.onsetBUs - b.recvUs) / 1000).toFixed(2);
    } else if (bRes) row.midiLost = true;
    if (r.onsetAUs) {
      row.totalMs = +((r.onsetAUs - r.tUs) / 1000).toFixed(2);
      if (b && b.onsetBUs) row.leg3Ms = +((r.onsetAUs - b.onsetBUs) / 1000).toFixed(2);
    }
    if (r.videoUs) {
      row.eyeMs = +((r.videoUs - r.tUs) / 1000).toFixed(2);
      if (r.onsetAUs) row.avSkewMs = +((r.videoUs - r.onsetAUs) / 1000).toFixed(2);
    }
    return row;
  });
}

function jbDelta(before, after, kind) {
  const b = before && before[kind], a = after && after[kind];
  if (!b || !a || a.jbEmitted === b.jbEmitted) return null;
  const out = { avgJbMs: +(((a.jbDelay - b.jbDelay) / (a.jbEmitted - b.jbEmitted)) * 1000).toFixed(2) };
  if (a.jbTarget !== undefined && a.jbTarget !== null) {
    out.avgJbTargetMs = +(((a.jbTarget - (b.jbTarget || 0)) / (a.jbEmitted - b.jbEmitted)) * 1000).toFixed(2);
  }
  if (kind === 'audio') {
    out.concealedPct = a.totalSamplesReceived > (b.totalSamplesReceived || 0)
      ? +(((a.concealedSamples - (b.concealedSamples || 0)) / (a.totalSamplesReceived - (b.totalSamplesReceived || 0))) * 100).toFixed(2) : null;
    out.packetsLost = (a.packetsLost || 0) - (b.packetsLost || 0);
  }
  return out;
}

const summary = [];
async function measureRun({ runId, arm, cfg, hint, shots, sched = 'mixed' }) {
  await ev(cdpB, `window.rig.beginRun(${q(runId)})`, 15000);
  const p = ev(cdpA, `window.rig.runRemote({runId:${q(runId)}, hint:${hint === null ? 'null' : hint}, scale:${SCALE}, sched:${q(sched)}})`);
  if (shots && SCALE >= 0.5) {
    setTimeout(() => {
      cdpA.screenshot(join(JAM, 'results', `jam-synth-${shots}-a.png`)).catch(() => {});
      cdpB.screenshot(join(JAM, 'results', `jam-synth-${shots}-b.png`)).catch(() => {});
    }, 22000);
  }
  const aRes = await p;
  const bRes = await ev(cdpB, 'window.rig.endRun()', 15000);
  const rows = joinRun(runId, aRes, bRes);
  await writeFile(join(JAM, 'results', `jam-synth-${runId}.jsonl`), rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  const met = (k) => rows.map((r) => r[k]).filter((v) => v !== undefined);
  const row = {
    runId, arm, cfg,
    sent: aRes.sent,
    midiRecv: rows.filter((r) => r.leg1Ms !== undefined).length,
    earMatched: rows.filter((r) => r.aStatus === 'matched').length,
    merged: rows.filter((r) => r.aStatus === 'merged').length,
    unmatched: rows.filter((r) => r.aStatus === 'unmatched').length,
    spuriousA: aRes.spuriousOnsets, spuriousB: bRes && bRes.spuriousOnsets,
    eyeMatched: rows.filter((r) => r.eyeMs !== undefined).length,
    leg1: dist(met('leg1Ms')), leg2: dist(met('leg2Ms')), leg3: dist(met('leg3Ms')),
    total: dist(met('totalMs')), eye: dist(met('eyeMs')), avSkew: dist(met('avSkewMs')),
    burnedOw: dist(aRes.burnedOwMs || []),
    jbAudio: jbDelta(aRes.statsBefore, aRes.statsAfter, 'audio'),
    jbVideo: jbDelta(aRes.statsBefore, aRes.statsAfter, 'video'),
    hintApplied: aRes.hintApplied || null,
    moq: aRes.moq || null,
    moqPub: (bRes && bRes.moqPub) || null,
    moqPubRun: (bRes && bRes.moqPubRun) || null,
    audioA: aRes.audio, audioB: bRes && bRes.audio,
    videoStats: aRes.video,
  };
  summary.push(row);
  console.log(`  ${runId}: n=${row.earMatched}/${row.sent} total p50=${row.total?.p50} (1:${row.leg1?.p50} 2:${row.leg2?.p50} 3:${row.leg3?.p50}) eye p50=${row.eye?.p50} av=${row.avSkew?.p50} jb=${row.jbAudio?.avgJbMs}`
    + (row.moq ? `\n    moq: loss=${row.moq.lostPct}% (${row.moq.lostChunks}/${row.moq.expectedChunks}) transit=${row.moq.transitMs?.p50}/${row.moq.transitMs?.p95} dec=${row.moq.decodeMs?.p50} ring=${row.moq.ringBufferedMs?.p50} floorEnd=${row.moq.floorMsEnd} underruns=${row.moq.underruns} (${row.moq.underrunMs}ms) gapIns=${row.moq.gapInsertMs}ms disc=${row.moq.discontinuities}` : '')
    + (row.moq && row.moq.video && row.moqPubRun ? `\n    video: pub=${row.moqPubRun.vPublished} recv=${row.moq.video.recv} dec=${row.moq.video.decoded} (${row.moqPubRun.vPublished ? (100 * row.moq.video.recv / row.moqPubRun.vPublished).toFixed(1) : '—'}% delivered) groups=${row.moq.video.groups} decErr=${row.moq.video.decErrors} stalls=${row.moq.video.stalls} heals=${row.moq.video.resubs} vDrop=${row.moqPubRun.vDropped}` : ''));
  return row;
}

async function setupBoth(arm, opts) {
  const [ia, ib] = await Promise.all([
    ev(cdpA, `window.rig.setup(${q(arm)}, ${q(opts)})`, 90000),
    ev(cdpB, `window.rig.setup(${q(arm)}, ${q(opts)})`, 90000),
  ]);
  console.log(`setup ${arm} ${opts.tag}: a="${ia.label}" b="${ib.label}"`);
  return { ia, ib };
}
async function teardownBoth() {
  await ev(cdpA, 'window.rig.teardown()', 10000).catch(() => {});
  await ev(cdpB, 'window.rig.teardown()', 10000).catch(() => {});
  await sleep(500);
}

async function main() {
  await mkdir(join(JAM, 'results'), { recursive: true });
  sh(`pkill -f 'jam-udd' 2>/dev/null`);
  sh(`pkill -f 'proto/jam/server.mjs' 2>/dev/null`);
  await sleep(700);
  run('node', [join(JAM, 'server.mjs')], 'server');
  for (let i = 0; i < 40; i++) { try { await fetch(BASE + '/time-local'); break; } catch { await sleep(250); } }

  // REAL AudioContext: no --mute-audio (headless output may be fake/silent —
  // fine, we measure at the decoded-track level).
  const flags = (udd, port) => [
    '--headless=new', `--user-data-dir=${SCRATCH}/${udd}`, `--remote-debugging-port=${port}`,
    '--no-first-run', '--no-default-browser-check',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-features=IntensiveWakeUpThrottling,WebRtcHideLocalIpsWithMdns',
    '--autoplay-policy=no-user-gesture-required',
    '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-devices',
    '--window-size=1400,900',
  ];
  const url = (peer) => `${BASE}/remote-synth.html?peer=${peer}&session=${SESSION}`;
  run(CHROME, [...flags('jam-udd-a', 9231), url('a')], 'chrome-a');
  run(CHROME, [...flags('jam-udd-b', 9232), url('b')], 'chrome-b');
  cdpA = await new CDP().connect(9231, 'remote-synth.html');
  cdpB = await new CDP().connect(9232, 'remote-synth.html');
  for (const [n, c] of [['a', cdpA], ['b', cdpB]]) {
    let ok = false;
    for (let i = 0; i < 60; i++) {
      ok = await c.eval('window.rigReady === true', { awaitPromise: false }).catch(() => false);
      if (ok) break;
      await sleep(500);
    }
    if (!ok) throw new Error(`page ${n} never became rigReady`);
  }
  const acA = await ev(cdpA, 'window.rig.acInfo()', 10000);
  const acB = await ev(cdpB, 'window.rig.acInfo()', 10000);
  console.log('ac a:', JSON.stringify(acA));
  console.log('ac b:', JSON.stringify(acB));
  if (!(acA.currentTime > 0)) throw new Error('A AudioContext is not running (currentTime stuck at 0)');
  const clocks = {
    a: await ev(cdpA, 'window.rig.clock()', 10000),
    b: await ev(cdpB, 'window.rig.clock()', 10000),
  };
  console.log('clocks:', JSON.stringify(clocks));

  // ---------- LOCAL BASELINE: A key -> A local WebAudio onset ----------
  if (want('local')) {
    const aRes = await ev(cdpA, `window.rig.runLocal({runId:'local', scale:${SCALE}})`);
    const rows = aRes.recs.sort((x, y) => x.seq - y.seq).map((r) => ({
      run: 'local', seq: r.seq, phase: r.phase, tUs: Math.round(r.tUs), aStatus: r.aStatus,
      ...(r.onsetAUs ? { totalMs: +((r.onsetAUs - r.tUs) / 1000).toFixed(2) } : {}),
    }));
    await writeFile(join(JAM, 'results', 'jam-synth-local.jsonl'), rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
    const row = {
      runId: 'local', arm: 'local', cfg: 'baseline', sent: aRes.sent,
      earMatched: rows.filter((r) => r.aStatus === 'matched').length,
      merged: rows.filter((r) => r.aStatus === 'merged').length,
      unmatched: rows.filter((r) => r.aStatus === 'unmatched').length,
      spuriousA: aRes.spuriousOnsets,
      total: dist(rows.map((r) => r.totalMs).filter((v) => v !== undefined)),
      audioA: aRes.audio,
    };
    summary.push(row);
    console.log(`  local: n=${row.earMatched}/${row.sent} key->local-onset p50=${row.total?.p50} p95=${row.total?.p95}`);
  }

  // ---------- (a) P2P: DC midi up + WebRTC A/V back, one PC ----------
  if (want('p2p-av')) {
    try {
      await setupBoth('p2p', { withVideo: true, tag: 'p2p-av' });
      await sleep(1500); // first audio/video frames through, jitter buffer settles
      await measureRun({ runId: 'p2p-av-default', arm: 'p2p', cfg: 'av-default', hint: null, shots: 'p2p' });
      await measureRun({ runId: 'p2p-av-hint0', arm: 'p2p', cfg: 'av-hint0', hint: 0 });
    } catch (e) { console.log('ARM FAIL p2p-av:', e.message); summary.push({ arm: 'p2p-av', error: e.message }); }
    await teardownBoth();
  }
  if (want('p2p-audio')) {
    try {
      await setupBoth('p2p', { withVideo: false, tag: 'p2p-audio' });
      await sleep(1500);
      await measureRun({ runId: 'p2p-audio-default', arm: 'p2p', cfg: 'audio-default', hint: null });
      await measureRun({ runId: 'p2p-audio-hint0', arm: 'p2p', cfg: 'audio-hint0', hint: 0 });
    } catch (e) { console.log('ARM FAIL p2p-audio:', e.message); summary.push({ arm: 'p2p-audio', error: e.message }); }
    await teardownBoth();
  }

  // ---------- (b) CF SFU both ways: SFU-DC midi + SFU-pulled A/V ----------
  if (want('sfu-av')) {
    try {
      await setupBoth('sfu', { withVideo: true, tag: 'sfu-av' });
      await sleep(1500);
      await measureRun({ runId: 'sfu-av-default', arm: 'sfu', cfg: 'av-default', hint: null, shots: 'sfu' });
      await measureRun({ runId: 'sfu-av-hint0', arm: 'sfu', cfg: 'av-hint0', hint: 0 });
    } catch (e) { console.log('ARM FAIL sfu-av:', e.message); summary.push({ arm: 'sfu-av', error: e.message }); }
    await teardownBoth();
  }

  // (b') SFU sparse-only: singles at 240 ms — burst concealment through the
  // SFU merges attacks and poisons per-note burst matching; this gives the
  // SFU headline a clean n>=300
  if (want('sfu-sparse')) {
    try {
      await setupBoth('sfu', { withVideo: true, tag: 'sfu-sparse' });
      await sleep(1500);
      await measureRun({ runId: 'sfu-sparse-default', arm: 'sfu', cfg: 'sparse-default', hint: null, sched: 'sparse', shots: 'sfu-sparse' });
      await measureRun({ runId: 'sfu-sparse-hint0', arm: 'sfu', cfg: 'sparse-hint0', hint: 0, sched: 'sparse' });
    } catch (e) { console.log('ARM FAIL sfu-sparse:', e.message); summary.push({ arm: 'sfu-sparse', error: e.message }); }
    await teardownBoth();
  }

  // ---------- (c) MoQ d14 return: DC-direct midi up + MoQ Opus audio back ----------
  // C8 arms. Same-session WebRTC anchor first (direct A/B on the same rig).
  if (want('p2p-anchor')) {
    try {
      await setupBoth('p2p', { withVideo: true, tag: 'anchor' });
      await sleep(1500);
      await measureRun({ runId: 'moq-anchor-p2p-av', arm: 'p2p', cfg: 'av-default same-session anchor', hint: null });
    } catch (e) { console.log('ARM FAIL p2p-anchor:', e.message); summary.push({ arm: 'p2p-anchor', error: e.message }); }
    await teardownBoth();
  }

  const setFloor = async (ms, adaptive = false) => {
    await ev(cdpA, `window.rig.setFloor(${ms}, ${adaptive})`, 10000);
    await sleep(1500); // ring re-arms at the new floor
  };
  const moqInfo = async () => {
    const [ia, ib] = await Promise.all([ev(cdpA, 'window.rig.moqInfo()', 10000), ev(cdpB, 'window.rig.moqInfo()', 10000)]);
    return { a: ia, b: ib };
  };

  if (want('moq-audio')) {
    try {
      await setupBoth('moq', { video: 'none', floorMs: FLOOR0, groupMs: 1000, tag: 'moq-audio' });
      await sleep(2500); // stream + prebuffer settle
      console.log('moq state:', JSON.stringify(await moqInfo()));
      await measureRun({ runId: `moq-audio-mixed-f${FLOOR0}`, arm: 'moq-audio', cfg: `floor${FLOOR0} groupMs1000`, hint: null, shots: 'moq-audio' });
      await measureRun({ runId: `moq-audio-sparse-f${FLOOR0}`, arm: 'moq-audio', cfg: `floor${FLOOR0} groupMs1000 sparse`, hint: null, sched: 'sparse' });
      // latency-vs-underrun curve: same session, same stream, floor swept
      for (const f of SWEEP) {
        await setFloor(f);
        await measureRun({ runId: `moq-audio-sparse-f${f}`, arm: 'moq-audio', cfg: `floor${f} groupMs1000 sparse (curve)`, hint: null, sched: 'sparse' });
      }
      // adaptive floor: start back at the minimum, let underruns grow it
      await setFloor(FLOOR0, true);
      await measureRun({ runId: 'moq-audio-mixed-adaptive', arm: 'moq-audio', cfg: `adaptive from ${FLOOR0}ms`, hint: null });
    } catch (e) { console.log('ARM FAIL moq-audio:', e.message); summary.push({ arm: 'moq-audio', error: e.message }); }
    await teardownBoth();
  }

  // single-frame-group probe: does the jam-matrix 2.9% group race bite a
  // continuous evenly-spaced audio stream?
  if (want('moq-gpc')) {
    try {
      await setupBoth('moq', { video: 'none', floorMs: FLOORAV, groupMs: 0, frameUs: 20000, tag: 'moq-gpc' });
      await sleep(2500);
      await measureRun({ runId: `moq-gpc-sparse-f${FLOORAV}`, arm: 'moq-gpc', cfg: `group-per-chunk floor${FLOORAV} sparse`, hint: null, sched: 'sparse' });
    } catch (e) { console.log('ARM FAIL moq-gpc:', e.message); summary.push({ arm: 'moq-gpc', error: e.message }); }
    await teardownBoth();
  }

  if (want('moq-av')) {
    try {
      await setupBoth('moq', { video: 'moq', floorMs: FLOORAV, groupMs: 1000, tag: 'moq-av' });
      await sleep(2500);
      console.log('moq state:', JSON.stringify(await moqInfo()));
      await measureRun({ runId: `moq-av-mixed-f${FLOORAV}`, arm: 'moq-av', cfg: `moq video + audio floor${FLOORAV}`, hint: null, shots: 'moq-av' });
      await measureRun({ runId: `moq-av-sparse-f${FLOORAV}`, arm: 'moq-av', cfg: `moq video + audio floor${FLOORAV} sparse`, hint: null, sched: 'sparse' });
    } catch (e) { console.log('ARM FAIL moq-av:', e.message); summary.push({ arm: 'moq-av', error: e.message }); }
    await teardownBoth();
  }

  if (want('moq-hybrid')) {
    try {
      await setupBoth('moq', { video: 'webrtc', floorMs: FLOORAV, groupMs: 1000, tag: 'moq-hyb' });
      await sleep(2500);
      await measureRun({ runId: `moq-hybrid-mixed-f${FLOORAV}`, arm: 'moq-hybrid', cfg: `webrtc video + moq audio floor${FLOORAV}`, hint: null, shots: 'moq-hybrid' });
      await measureRun({ runId: `moq-hybrid-sparse-f${FLOORAV}`, arm: 'moq-hybrid', cfg: `webrtc video + moq audio floor${FLOORAV} sparse`, hint: null, sched: 'sparse' });
    } catch (e) { console.log('ARM FAIL moq-hybrid:', e.message); summary.push({ arm: 'moq-hybrid', error: e.message }); }
    await teardownBoth();
  }

  // final screenshots (HUD with cumulative stats)
  const shotSuffix = SUMMARY.includes('moq') ? 'moq-final-' : '';
  await cdpA.screenshot(join(JAM, 'results', `jam-synth-${shotSuffix}a.png`)).catch(() => {});
  await cdpB.screenshot(join(JAM, 'results', `jam-synth-${shotSuffix}b.png`)).catch(() => {});

  const out = { session: SESSION, at: new Date().toISOString(), scale: SCALE, clocks, ac: { a: acA, b: acB }, runs: summary };
  await writeFile(join(JAM, 'results', SUMMARY), JSON.stringify(out, null, 2));

  console.log('\n=== PLAY-A-SYNTH (ms, truth clock; audio at decoded-track level) ===');
  console.log('run                  n    key->ear        leg1   leg2   leg3    key->eye      avSkew   jb-avg');
  for (const r of summary) {
    if (r.error) { console.log(`${(r.runId || r.arm).padEnd(20)} ERROR ${r.error}`); continue; }
    const f = (d) => (d ? `${String(d.p50).padStart(6)}/${String(d.p95).padEnd(6)}` : '      —      ');
    console.log(`${r.runId.padEnd(20)} ${String(r.earMatched).padStart(4)} ${f(r.total)} ${String(r.leg1?.p50 ?? '—').padStart(6)} ${String(r.leg2?.p50 ?? '—').padStart(6)} ${String(r.leg3?.p50 ?? '—').padStart(6)} ${f(r.eye)} ${String(r.avSkew?.p50 ?? '—').padStart(7)} ${String(r.jbAudio?.avgJbMs ?? '—').padStart(7)}`);
  }
}

async function cleanup() {
  for (const p of kids) { try { p.kill(); } catch {} }
  sh(`pkill -f 'jam-udd' 2>/dev/null`);
  sh(`pkill -f 'proto/jam/server.mjs' 2>/dev/null`);
}
main().then(cleanup, async (e) => { console.error('FATAL', e); await cleanup(); process.exit(1); });
