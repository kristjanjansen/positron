#!/usr/bin/env node
// ============================================================================
// L4b MEASUREMENT — requestVideoFrameCallback.mediaTime vs HTMLMediaElement
// .currentTime, as the media servo's sensor.
//
//   node timeline/lab/run-sensor.mjs [--fps 30,60] [--secs 18]
//
// One real headless-Chrome playback per fps; FOUR mediaMaster instances over
// the same <video> ({rvfc, currentTime} x {tol 20 ms, 40 ms}). Reports the
// disagreement distribution (p50/p95/max of |mediaTime - currentTime|) and the
// servo correction counts per arm. House rules: port 8894, one Chrome,
// tl-sensor-udd pattern, plain node ESM.
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
const MEDIA = `${SCRATCH}/media`;
const UDD = `${SCRATCH}/tl-sensor-udd`;
const PORT = 8894;
const args = process.argv.slice(2);
const argv = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const FPSLIST = String(argv('--fps', '30,60')).split(',').map(Number);
const SECS = +argv('--secs', 18);
const OUT = `${ROOT}/timeline/lab/results/sensor-rvfc.json`;

const MIME = { '.mjs': 'text/javascript', '.js': 'text/javascript', '.html': 'text/html',
               '.json': 'application/json', '.mp4': 'video/mp4', '.css': 'text/css' };

function serve() {
  return new Promise((res) => {
    const srv = http.createServer((req, rq) => {
      const u = new URL(req.url, `http://127.0.0.1:${PORT}`);
      const p = u.pathname.startsWith('/media/')
        ? path.join(MEDIA, u.pathname.slice(7))
        : path.join(ROOT, u.pathname);
      if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { rq.writeHead(404); return rq.end('no'); }
      const st = fs.statSync(p), type = MIME[path.extname(p)] || 'application/octet-stream';
      const range = req.headers.range;
      if (range && /^bytes=(\d*)-(\d*)$/.test(range)) {
        const [, a, b] = range.match(/^bytes=(\d*)-(\d*)$/);
        const start = a === '' ? st.size - Number(b) : Number(a);
        const end = a === '' || b === '' ? st.size - 1 : Number(b);
        rq.writeHead(206, { 'content-type': type, 'accept-ranges': 'bytes',
          'content-range': `bytes ${start}-${end}/${st.size}`, 'content-length': end - start + 1 });
        return fs.createReadStream(p, { start, end }).pipe(rq);
      }
      rq.writeHead(200, { 'content-type': type, 'accept-ranges': 'bytes', 'content-length': st.size });
      fs.createReadStream(p).pipe(rq);
    }).listen(PORT, '127.0.0.1', () => res(srv));
  });
}

function killMine() {
  try {
    const o = execSync(`ps -Ao pid,command | grep -F "tl-sensor-udd" | grep -v grep || true`).toString();
    const pids = o.split('\n').filter(Boolean).map((l) => parseInt(l.trim().split(/\s+/)[0], 10));
    if (pids.length) execSync(`kill -9 ${pids.join(' ')} 2>/dev/null || true`);
  } catch {}
}

const q = (a, p) => a[Math.min(a.length - 1, Math.floor(p * a.length))];

(async () => {
  killMine();
  const srv = await serve();
  const browser = await chromium.launchPersistentContext(UDD, {
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio',
           '--use-gl=swiftshader', '--enable-features=SharedArrayBuffer'],
  });
  const all = {};
  try {
    for (const fps of FPSLIST) {
      const page = await browser.newPage();
      page.on('console', (m) => { if (m.type() === 'error') console.log('  page-error:', m.text().slice(0, 200)); });
      await page.goto(`http://127.0.0.1:${PORT}/timeline/lab/sensor.html?fps=${fps}&secs=${SECS}`);
      const res = await page.waitForFunction('window.__done', null, { timeout: (SECS + 30) * 1000 })
        .then((h) => h.jsonValue());
      await page.close();
      if (res.error) { console.error(`fps=${fps} FAILED: ${res.error}`); continue; }

      const s = res.samples.map(Math.abs).sort((a, b) => a - b);
      const sr = res.samplesRaw.map(Math.abs).sort((a, b) => a - b);
      const frameMs = 1000 / fps;
      const hist = { '<=0.5f': 0, '<=1f': 0, '<=1.5f': 0, '>1.5f': 0 };
      for (const x of s) {
        if (x <= 0.5 * frameMs) hist['<=0.5f']++;
        else if (x <= frameMs) hist['<=1f']++;
        else if (x <= 1.5 * frameMs) hist['<=1.5f']++;
        else hist['>1.5f']++;
      }
      res.frameMs = +frameMs.toFixed(3);
      res.hist = hist;
      res.disagreeInFrames = s.length
        ? { p50: +(q(s, 0.5) / frameMs).toFixed(3), p95: +(q(s, 0.95) / frameMs).toFixed(3),
            max: +(s[s.length - 1] / frameMs).toFixed(3) }
        : null;
      res.rawInFrames = sr.length
        ? { p50: +(q(sr, 0.5) / frameMs).toFixed(3), p95: +(q(sr, 0.95) / frameMs).toFixed(3),
            max: +(sr[sr.length - 1] / frameMs).toFixed(3) }
        : null;
      delete res.samples; delete res.samplesRaw;
      all[fps] = res;

      console.log(`\n=== fps ${fps} (frame = ${frameMs.toFixed(2)} ms), ${res.ticks} rAF ticks, ${res.rvfc.frames} presented frames`);
      const R = res.disagreementMs.raw, C = res.disagreementMs.carried;
      console.log(`  RAW  |mediaTime - currentTime|          n=${R.n}  p50 ${R.p50}  p95 ${R.p95}  max ${R.max} ms  (signed mean ${R.mean}, ${R.signedMin}..${R.signedMax})  = ${res.rawInFrames.p50}f/${res.rawInFrames.p95}f/${res.rawInFrames.max}f`);
      console.log(`  CARRIED via expectedDisplayTime        n=${C.n}  p50 ${C.p50}  p95 ${C.p95}  max ${C.max} ms  (signed mean ${C.mean}, ${C.signedMin}..${C.signedMax})  = ${res.disagreeInFrames.p50}f/${res.disagreeInFrames.p95}f/${res.disagreeInFrames.max}f`);
      console.log(`  carried hist ${JSON.stringify(hist)}`);
      console.log(`  rvfc: supported=${res.rvfc.supported} frames=${res.rvfc.frames} used=${res.rvfc.used} stale=${res.rvfc.stale} rejected=${res.rvfc.rejected}`);
      console.log('  arm        tol  syncs  corr  |err| p50   p95    max     |corr| p50   p95   fires');
      for (const a of res.arms) {
        console.log(`  ${a.name.padEnd(10)} ${String(a.toleranceMs).padStart(3)}  ${String(a.syncs).padStart(5)}  ${String(a.corrections).padStart(4)}`
          + `  ${String(a.err.p50).padStart(8)} ${String(a.err.p95).padStart(6)} ${String(a.err.max).padStart(7)}`
          + `  ${String(a.correctionAbs.p50 ?? '-').padStart(10)} ${String(a.correctionAbs.p95 ?? '-').padStart(6)}  ${a.fires}/${a.uniqueFires}`);
      }
      const byName = Object.fromEntries(res.arms.map((a) => [a.name, a]));
      for (const tol of [5, 10, 20, 40]) {
        const r = byName[`rvfc/${tol}`], c = byName[`ct/${tol}`];
        const d = c.corrections ? (100 * (c.corrections - r.corrections) / c.corrections).toFixed(1) : 'n/a';
        console.log(`  => tol ${tol}: corrections ${c.corrections} (currentTime) -> ${r.corrections} (rvfc)  = ${d}%   |err| p95 ${c.err.p95} -> ${r.err.p95} ms`);
      }
    }
  } finally {
    await browser.close();
    srv.close();
    killMine();
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(all, null, 2));
  console.log(`\nwrote ${OUT}`);
})();
