// demo/verify-safari.mjs — drive DESKTOP SAFARI over WebDriver.
//
//   node demo/verify-safari.mjs               # both engines (starts its own server)
//   node demo/verify-safari.mjs native        # just one
//   DEMO_BASE=https://positron.studio node demo/verify-safari.mjs
//
// WHY THIS EXISTS. demo/verify.mjs speaks CDP, which Safari does not, so the
// whole WebKit family was untested — and macOS Safari is the ONE platform with
// both a plain MediaSource AND native HLS, which means it is the only place the
// choice between the two engines is a real judgement rather than forced. It also
// shares an engine family with the iPhone, so it catches WebKit-specific
// breakage without a phone in hand.
//
// Requires "Develop > Allow Remote Automation" in Safari, once. safaridriver
// answers /status with {ready:true} when it is on.
//
// No dependencies: WebDriver is plain HTTP+JSON.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { serve } from './server.mjs';

/** A port the OS picked, released immediately — lifted from verify-quest.mjs,
 *  where its comment is also the honest one: there is a race between the close
 *  and safaridriver's bind, and it is still better than a constant. */
const freePort = () => new Promise((resolve, reject) => {
  const s = createServer();
  s.on('error', reject);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
});

// ⚠️ THE PORT WAS 4577 AND THE SERVER WAS ASSUMED TO BE ON 8890. Both are the
// shared-mutable-global rule this repo already applies three files over: a
// second run of this harness died on the bind, and the base URL pointed at
// whatever happened to be on 8890 once `serve()` learned to move.
//
// 🔴 BUT THE PORT WAS NEVER THE REAL LIMIT HERE, AND FIXING IT DOES NOT MAKE
// THIS CONCURRENT. `safaridriver` drives the one Safari on this machine, and
// Remote Automation is a single global switch, so two of these at once is still
// two harnesses fighting over one browser — it will just now fail somewhere
// honest instead of on a port collision that looked like a code fault.
const PORT = await freePort();
const server = process.env.DEMO_BASE ? null : await serve(8895);
const BASE = process.env.DEMO_BASE || `http://127.0.0.1:${server.address().port}`;
console.log(`base ${BASE} · safaridriver on ${PORT}`);
const only = process.argv[2];
const ENGINES = only ? [only] : ['hlsjs', 'native'];
const SETTLE_MS = Number(process.env.SAFARI_SETTLE_MS || 45000);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const driver = spawn('safaridriver', ['--port', String(PORT)], { stdio: 'ignore' });
process.on('exit', () => { try { driver.kill(); } catch {} try { server?.close(); } catch {} });

async function wd(method, path, body) {
  const r = await fetch(`http://127.0.0.1:${PORT}${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* safaridriver can answer plain text */ }
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status} ${text.slice(0, 200)}`);
  return json?.value;
}

// wait for the driver to come up
let ready = false;
for (let i = 0; i < 30; i++) {
  try { const v = await wd('GET', '/status'); if (v?.ready) { ready = true; break; } }
  catch { /* not listening yet */ }
  await sleep(500);
}
if (!ready) {
  console.log('safaridriver never became ready.');
  console.log('Enable Safari > Settings > Advanced > "Show features for web developers",');
  console.log('then Develop > Allow Remote Automation.');
  process.exit(1);
}

let failures = 0;

for (const engine of ENGINES) {
  const url = `${BASE}/llhls/?player=${engine}`;
  console.log(`\n=== desktop Safari, player=${engine} ===`);
  console.log(`    ${url}`);

  let session = null;
  try {
    const v = await wd('POST', '/session', {
      capabilities: { alwaysMatch: { browserName: 'safari' } },
    });
    session = v.sessionId;
    const S = (m, p, b) => wd(m, `/session/${session}${p}`, b);
    const exec = async (script) => (await S('POST', '/execute/sync', { script, args: [] }));

    await S('POST', '/url', { url });
    // the shell sets window.__demo once it is mounted
    let up = false;
    for (let i = 0; i < 40; i++) {
      if (await exec('return !!(window.__demo && window.__demo.ready)')) { up = true; break; }
      await sleep(500);
    }
    if (!up) { console.log('  FAIL  __demo never became ready'); failures++; continue; }
    console.log('  ok    __demo.ready');

    // press the primary control, the same way verify.mjs does
    await exec("document.querySelectorAll('.pos-controls button')[0].click()");
    console.log(`  ...   started; settling ${SETTLE_MS / 1000}s`);
    await sleep(SETTLE_MS);

    const snap = JSON.parse(await exec(`
      const d = window.__demo;
      const vals = {};
      document.querySelectorAll('.pos-readout .pos-cell').forEach((c) => {
        const k = c.querySelector('.pos-k'); const v = c.querySelector('.pos-v');
        if (k && v) vals[k.textContent.trim().toLowerCase()] = v.textContent.trim();
      });
      return JSON.stringify({
        readout: vals,
        logs: (d.logs || []).map((l) => [Math.round(l.t), l.kind, l.msg]),
        engineFacts: {
          mms: typeof self.ManagedMediaSource !== 'undefined',
          mse: typeof self.MediaSource !== 'undefined',
          nativeHls: !!document.createElement('video').canPlayType('application/vnd.apple.mpegurl'),
        },
        // The element's own state. The first run reported an empty readout with
        // no explanation, because the native telemetry loop gated EVERYTHING
        // behind getStartDate() being available. Ask the element directly.
        video: (() => {
          const v = document.querySelector('video');
          if (!v) return null;
          const b = [];
          for (let i = 0; i < v.buffered.length; i++) b.push([+v.buffered.start(i).toFixed(2), +v.buffered.end(i).toFixed(2)]);
          let sd = null;
          try { const d = v.getStartDate && v.getStartDate(); sd = d && !isNaN(d) ? d.toISOString() : String(d); } catch (e) { sd = 'threw: ' + e.message; }
          return {
            paused: v.paused, readyState: v.readyState, networkState: v.networkState,
            currentTime: +v.currentTime.toFixed(2), duration: String(v.duration),
            buffered: b, seekableEnd: v.seekable.length ? +v.seekable.end(v.seekable.length - 1).toFixed(2) : null,
            videoWidth: v.videoWidth, getStartDate: sd,
            hasSrc: !!v.src, srcTail: v.src ? v.src.slice(-48) : null,
            error: v.error ? { code: v.error.code, message: v.error.message } : null,
          };
        })(),
      });
    `));

    if (snap.video) console.log(`  video  ${JSON.stringify(snap.video)}`);
    console.log(`  facts  MediaSource=${snap.engineFacts.mse} ManagedMediaSource=${snap.engineFacts.mms} nativeHLS=${snap.engineFacts.nativeHls}`);
    const r = snap.readout;
    console.log(`  readout  ${Object.entries(r).map(([k, v]) => `${k}=${v}`).join('  ')}`);

    // Dump the whole page log. The first run of this showed an empty readout on
    // both engines and only the 'bad' lines were being printed, which hid WHY.
    console.log('  --- page log ---');
    for (const [t, kind, msg] of snap.logs.slice(-18)) {
      console.log(`    ${String(t).padStart(6)}ms ${(kind || 'info').padEnd(4)} ${msg.slice(0, 130)}`);
    }

    const engineLine = snap.logs.find((l) => /^engine /.test(l[2]));
    const buildLine = snap.logs.find((l) => /^build /.test(l[2]));
    if (buildLine) console.log(`  ${buildLine[2]}`);
    console.log(`  ${engineLine ? engineLine[2] : 'NO engine line'}`);

    // ── the asserts ────────────────────────────────────────────────────────
    const ok = (name, cond, detail) => {
      console.log(`  ${cond ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
      if (!cond) failures++;
    };
    const num = (k) => {
      const v = r[k];
      if (v == null || v === '—') return null;
      const f = parseFloat(String(v).replace(/[^\d.-]/g, ''));
      return Number.isFinite(f) ? f : null;
    };

    ok('engine reported', !!engineLine, engineLine?.[2]);
    const adv = num('advance');
    ok('playhead keeps up with wall time', adv != null && adv > 0.9,
      adv == null ? 'no advance sample' : `${adv}x`);
    // Under native HLS, currentTime does not share a timeline with buffered
    // (Safari: currentTime 58.44 against buffered [[20,30]] while playing at
    // 0.961x), so bufferReport deliberately reports null — "cannot tell", not
    // "empty". Demanding a number there would fail a healthy player.
    const buf = num('buffer');
    const nativeEngine = /engine native/.test(engineLine?.[2] || '');
    ok('buffer stays ahead', nativeEngine ? true : (buf != null && buf > 0.5),
      nativeEngine
        ? (buf == null ? 'n/a on native — currentTime is on another timeline' : `${buf}s`)
        : (buf == null ? 'no buffer sample' : `${buf}s`));
    const lat = num('latency');
    ok('latency is seconds, not tens of seconds', lat != null && lat > 0 && lat < 20,
      lat == null ? 'no latency sample' : `${lat}s`);
    const bad = snap.logs.filter((l) => l[1] === 'bad');
    ok('no failures logged by the page', bad.length === 0,
      bad.slice(0, 3).map((l) => `${l[0]}ms ${l[2]}`).join(' | ') || '0');
  } catch (e) {
    console.log(`  FAIL  ${String(e.message || e).slice(0, 200)}`);
    failures++;
  } finally {
    if (session) { try { await wd('DELETE', `/session/${session}`); } catch {} }
  }
}

console.log(failures ? `\n${failures} failure(s)` : '\nall green');
try { driver.kill(); } catch {}
process.exit(failures ? 1 : 0);
