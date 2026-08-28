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

const ROOT = '/Users/s32863/personal/elektron';
const SCRATCH = '/private/tmp/claude-501/-Users-s32863-personal-elektron/596385e3-9b74-4f17-837f-b4eb2eb5a254/scratchpad';
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

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(r, null, 2));
  console.log(`\nwrote ${OUT}`);
  if (bad) { console.error(`${bad} FAILURE(S)`); process.exit(1); }
  console.log(`run-render: ${8 - bad}/8`);
})();
