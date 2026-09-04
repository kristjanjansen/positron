#!/usr/bin/env node
// ============================================================================
// The BROWSER half of the offline-render determinism proof: renderDeckAudio()
// through a REAL OfflineAudioContext, twice, comparing the event-trace bytes
// AND the rendered PCM hash.
//
//   node timeline/lab/run-render.mjs
//
// House rules: port 8894, one Chrome, tl-render-udd pattern, plain node ESM.
// ============================================================================
import { createRequire } from 'module';
const require = createRequire('/Users/s32863/.npm/_npx/705bc6b22212b352/node_modules/');
const { chromium } = require('playwright');
import http from 'http';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT = '/Users/s32863/personal/positron';
const SCRATCH = '/private/tmp/claude-501/-Users-s32863-personal-positron/596385e3-9b74-4f17-837f-b4eb2eb5a254/scratchpad';
const UDD = `${SCRATCH}/tl-render-udd`;
const PORT = +(process.env.TL_RENDER_PORT || 8885);
const OUT = `${ROOT}/timeline/lab/results/render-determinism.json`;
const MIME = { '.mjs': 'text/javascript', '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json' };

const serve = () => new Promise((res) => {
  const s = http.createServer((req, rq) => {
    const p = path.join(ROOT, new URL(req.url, `http://x`).pathname);
    if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { rq.writeHead(404); return rq.end('no'); }
    rq.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(rq);
  }).listen(PORT, '127.0.0.1', () => res(s));
});
function killMine() {
  try {
    const o = execSync('ps -Ao pid,command | grep -F "tl-render-udd" | grep -v grep || true').toString();
    const pids = o.split('\n').filter(Boolean).map((l) => parseInt(l.trim().split(/\s+/)[0], 10));
    if (pids.length) execSync(`kill -9 ${pids.join(' ')} 2>/dev/null || true`);
  } catch {}
}

let bad = 0;
const check = (n, ok, d) => { if (!ok) bad++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  ${d || ''}`); };

(async () => {
  killMine();
  const srv = await serve();
  const br = await chromium.launchPersistentContext(UDD, { headless: true, args: ['--mute-audio'] });
  let r;
  try {
    const page = await br.newPage();
    page.on('console', (m) => { if (m.type() === 'error') console.log('  page-error:', m.text().slice(0, 300)); });
    await page.goto(`http://127.0.0.1:${PORT}/timeline/lab/render.html`);
    r = await page.waitForFunction('window.__done', null, { timeout: 90000 }).then((h) => h.jsonValue());
    await page.close();
  } finally { await br.close(); srv.close(); killMine(); }

  if (r.error) { console.error('RENDER FAILED:', r.error, r.stack); process.exit(1); }
  const a = r.run1, b = r.run2;
  console.log(`\noffline render, real OfflineAudioContext @ ${r.sampleRate} Hz, ${r.fps} fps, ${r.span} ms`);
  console.log(`  frames ${a.frames}  events ${a.events}  reduces ${a.reduces}  byKind ${JSON.stringify(a.byKind)}  endPos ${a.endPos}`);
  console.log(`  trace   ${a.traceBytes} bytes  hash ${a.traceHash}   |   ${b.traceBytes} bytes  hash ${b.traceHash}`);
  console.log(`  audio   ${a.audio.length} frames x ${a.audio.channels} ch  hash ${a.audio.hash}  peak ${a.audio.peak}  nonzero ${a.audio.nonzero}`);
  console.log(`          run2 hash ${b.audio.hash}  peak ${b.audio.peak}  nonzero ${b.audio.nonzero}`);
  console.log(`  frameDigest hash ${a.frameDigestHash} | ${b.frameDigestHash}`);
  console.log(`  impulses want ${JSON.stringify(r.clicksWantSamples)}`);
  console.log(`           got  ${JSON.stringify(r.clicksGotSamples)}`);
  console.log(`  audit   ok=${a.audit.ok} kinds=${a.audit.kinds} undeclared=${JSON.stringify(a.audit.undeclared)}\n`);

  check('trace-byte-identical', r.identicalTrace && r.identicalTraceHash, `${a.traceBytes} bytes, hash ${a.traceHash}`);
  check('audio-buffer-hash-identical', r.identicalAudioHash, `${a.audio.hash} (${a.audio.length} samples, ${a.audio.nonzero} nonzero)`);
  check('per-frame-output-identical', r.identicalFrames, `frameDigest hash ${a.frameDigestHash}`);
  check('clicks-land-on-exact-samples', r.clicksExact, `${r.clicksGotSamples.length}/${r.clicksWantSamples.length} impulses on the exact expected sample index`);
  check('audit-clean', a.audit.ok === true, `no adapter declared or suspected nondeterministic`);
  console.log(`  DSP graph (saw -> swept biquad -> exp env, 2ch): hash ${r.dsp1.hash} | ${r.dsp2.hash}  nonzero ${r.dsp1.nonzero} peak ${r.dsp1.peak} rms ${r.dsp1.rmsish}`);
  check('dsp-audio-hash-identical', r.dspIdentical, `a REAL DSP graph must also render bit-identically: ${r.dsp1.hash} vs ${r.dsp2.hash} (rms ${r.dsp1.rmsish} vs ${r.dsp2.rmsish})`);
  check('dsp-audio-nontrivial', r.dsp1.nonzero > 40000 && r.dsp1.peak > 0.05, `the DSP arm must actually produce signal (${r.dsp1.nonzero} nonzero, peak ${r.dsp1.peak})`);
  check('same-events-both-runs', a.events === b.events && JSON.stringify(a.byKind) === JSON.stringify(b.byKind), `${a.events} events`);

  // --- THE NEST (plan-timeline §8.8's last seam), through the real renderer ---
  const n = r.nest, n1 = n.run1;
  console.log(`\nNESTED render — a quotation [${0}, ${n.loopMs}) looped x${n.passes}, its own audio lane, one OfflineAudioContext`);
  console.log(`  window [${n1.from}, ${n1.to}]  boundary ${n1.boundary}  wraps ${n1.wraps} ${JSON.stringify(n1.wrapsByReason)}  servo ${JSON.stringify(n1.servo)}`);
  console.log(`  parent events ${n1.parentEvents}  child events ${n1.childEvents} ${JSON.stringify(n1.childByKind)}  child fired [${n1.fired}]`);
  console.log(`  trace ${n1.traceBytes} bytes hash ${n1.traceHash} | ${n.run2.traceHash}   wraps hash ${n1.wrapsHash} | ${n.run2.wrapsHash}   render hash ${n1.renderHash}`);
  console.log(`  audio ${n1.audio.length} frames hash ${n1.audio.hash} | ${n.run2.audio.hash}  nonzero ${n1.audio.nonzero} peak ${n1.audio.peak}`);
  console.log(`  impulses want ${JSON.stringify(n.impulsesWant)}`);
  console.log(`           got  ${JSON.stringify(n.impulsesGot)}`);
  check('nest-trace-byte-identical', n.identicalTrace && n.identicalRenderHash && n.identicalWraps,
    `trace ${n1.traceHash}, wrap set ${n1.wrapsHash}, render ${n1.renderHash}`);
  check('nest-audio-hash-identical', n.identicalAudioHash,
    `a LOOPED composition's PCM must be bit-identical across renders: ${n1.audio.hash} (${n1.audio.nonzero} nonzero)`);
  check('nest-child-positions-identical', n.identicalChildPos, `childPos digest ${n1.childPosDigestHash}`);
  check('nest-loop-repeats-its-audio', n.impulsesExact,
    `${n.passes} passes must put the same pass at the same samples, ${n.loopMs} ms apart: ${n.impulsesGot.length}/${n.impulsesWant.length} exact`);
  // THE NEGATIVE CONTROL, and the reason renderDeckAudio EXPANDS a loop instead
  // of replaying it: bind the child lane to the CHILD's transport and every
  // wrap's `child.seek()` fires createAudioLane's cancelCommitted(), which
  // stop()s and disconnect()s nodes that have not sounded yet — because
  // offline, NOTHING has sounded until startRendering().
  console.log(`  mode:'lane' NEGATIVE CONTROL — impulses ${JSON.stringify(n.laneMode.impulses)} (want ${JSON.stringify(n.impulsesWant)}), nonzero ${n.laneMode.audio.nonzero}, lane ${JSON.stringify(n.laneMode.childLane)}`);
  check('nest-lane-mode-is-the-control', n.laneMode.impulses.length < n.impulsesWant.length && n.laneMode.audio.nonzero < n1.audio.nonzero,
    `a child lane bound to the CHILD's transport renders ${n.laneMode.audio.nonzero}/${n1.audio.nonzero} nonzero samples — reproducibly, and nearly silent`);
  check('nest-wraps-committed', n1.boundary === 'lookahead' && n1.wraps === n.passes - 1 &&
        n1.wrapsByReason.boundary === n.passes - 1 && n1.servo.corrections === 0,
    `${n1.wraps} wraps, all committed at the instant, ${n1.servo.corrections} servo corrections in ${n1.servo.calls} calls`);
  check('nest-fragment-is-a-fragment', n1.fired === '1,2,1,2,1,2',
    `nothing past \`out\` may sound: child fired [${n1.fired}] (expected 1,2 per pass, never the TAIL at out+5)`);
  check('nest-dsp-audio-identical', n.dspIdentical,
    `a REAL DSP graph inside a LOOP must render bit-identically: ${n.dsp1.hash} vs ${n.dsp2.hash} (rms ${n.dsp1.rmsish})`);
  check('nest-dsp-nontrivial', n.dsp1.nonzero > 20000 && n.dsp1.peak > 0.05,
    `${n.dsp1.nonzero} nonzero samples, peak ${n.dsp1.peak}`);

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(r, null, 2));
  console.log(`\nwrote ${OUT}`);
  if (bad) { console.error(`${bad} FAILURE(S)`); process.exit(1); }
  console.log(`run-render: ${17 - bad}/17`);
})();
