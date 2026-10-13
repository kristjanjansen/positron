// remote/020 (was synth/100) levels, here against the REAL Pi. One headless Chrome, closed on every path.
// node s100lv.mjs [tag] [query]
import { spawn, execSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const TAG = process.argv[2] ?? 'before';
const QUERY = process.argv[3] ?? '';
const PAGE = process.env.PAGE ?? 'remote/collide-on-pi/';
const OUTF = `/private/tmp/claude-501/-Users-s32863-personal-positron/0f3a0353-ddeb-41fa-a915-9abf8aa2d34d/scratchpad/s100-${TAG}.json`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const routeOk = () => /interface: en0/.test(execSync('route -n get <pi>').toString());
const out = { tag: TAG };
const PROFILE = await mkdtemp(join(tmpdir(), 'positron-s100-'));
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--remote-debugging-port=0',
  `--user-data-dir=${PROFILE}`, '--no-first-run', '--no-default-browser-check', '--mute-audio', '--autoplay-policy=no-user-gesture-required'], { stdio: ['ignore', 'pipe', 'pipe'] });
chrome.stderr.on('data', () => {});
const kill = () => { try { chrome.kill('SIGKILL'); } catch {} try { rmSync(PROFILE, { recursive: true, force: true }); } catch {} };
process.on('exit', kill);
process.on('SIGINT', () => process.exit(130));
let ev;
// In-page helpers: rms/peak/dc and the top spectral peaks of 2048 samples of a side.
const HELP = `(() => {
  window.__an = (samples) => {
    const n = samples.length; let q = 0, pk = 0, dc = 0;
    for (const v of samples) { q += v * v; pk = Math.max(pk, Math.abs(v)); dc += v; }
    dc /= n; const rms = Math.sqrt(q / n);
    const N = 2048, s = samples.slice(0, N), mags = [];
    for (let k = 1; k < 400; k++) { let re = 0, im = 0; for (let i = 0; i < N; i++) { const w = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1)); const a = 2 * Math.PI * k * i / N; re += s[i] * w * Math.cos(a); im -= s[i] * w * Math.sin(a); } mags.push([k * 48000 / N, Math.hypot(re, im) / (N / 4)]); }
    const peaks = mags.filter((m, i) => i > 0 && i < mags.length - 1 && m[1] > mags[i - 1][1] && m[1] >= mags[i + 1][1]).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([f, m]) => [Math.round(f), +(20 * Math.log10(m || 1e-12)).toFixed(1)]);
    const db = (x) => +(20 * Math.log10(x || 1e-12)).toFixed(1);
    return { rmsDb: db(rms), peakDb: db(pk), dc: +dc.toFixed(5), peaks };
  };
  window.__env = { local: [], pi: [] };
  setInterval(() => { const c = __demo.collide; for (const [k, f] of [['local', c.samples], ['pi', c.piSamples]]) { const s = f(); if (!s.length) continue; let q = 0, pk = 0; for (const v of s) { q += v * v; pk = Math.max(pk, Math.abs(v)); } __env[k].push([performance.now(), Math.sqrt(q / s.length), pk]); } }, 10);
  return 1; })()`;
try {
  let wsUrl = null, port = null;
  for (let i = 0; i < 60 && !wsUrl; i++) {
    await sleep(250);
    try {
      if (!port) port = Number((await readFile(`${PROFILE}/DevToolsActivePort`, 'utf8')).split('\n')[0]);
      wsUrl = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).webSocketDebuggerUrl;
    } catch {}
  }
  const ws = new WebSocket(wsUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const pend = new Map(); const errs = [];
  ws.onmessage = (e) => { const m = JSON.parse(e.data);
    if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.j(new Error(JSON.stringify(m.error))) : p.r(m.result); }
    if (m.method === 'Runtime.exceptionThrown') errs.push('EXC ' + (m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text).slice(0, 300));
  };
  const send = (method, params = {}, sessionId) => new Promise((r, j) => { const i = ++id; pend.set(i, { r, j }); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const S = (m, p) => send(m, p, sessionId);
  await S('Page.enable'); await S('Runtime.enable');
  ev = async (expr) => { const r = await S('Runtime.evaluate', { expression: `(async () => (${expr}))()`, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text); return r.result.value; };
  if (!routeOk()) throw new Error('route not en0');
  await S('Page.navigate', { url: `http://127.0.0.1:8890/${PAGE}${QUERY}` });
  await sleep(2500);
  // Wake with one key (C3 = key index 0 at base 48), released at once.
  const key = (note) => `(() => { const kb = __demo.keyboard; return kb.keyOf(${note}); })()`;
  out.keyFor60 = await ev(key(60));
  const press = (note) => ev(`(() => { const kb = __demo.keyboard; const k = kb.keyOf(${note}); kb.press(k, 'pointer'); return k; })()`);
  const release = (note) => ev(`(() => { const kb = __demo.keyboard; const k = kb.keyOf(${note}); kb.release(k, 'pointer'); return k; })()`);
  await press(48); await sleep(100); await release(48);
  for (let i = 0; i < 200; i++) { await sleep(100); const md = await ev('__demo.collide.piMode()'); if (md !== 'checking' && md !== 'idle') break; }
  out.mode = await ev('__demo.collide.piMode()');
  out.loaded = await ev('__demo.collide.piLoaded()');
  await ev(HELP);
  const KN = JSON.parse(process.env.KNOBS ?? '{}');
  for (const [k, v] of Object.entries(KN)) await ev(`(__demo.collide.bay.send('web:knob-${k}:value-out', { of: 'param', name: '${k}', v: ${v} }), 1)`);
  out.knobs = KN; out.piValues = await ev('[...__demo.collide.pi.values?.entries?.() ?? []]');
  await sleep(4000);
  // 1. No note, both sides, three snapshots.
  out.idle = [];
  for (let i = 0; i < 3; i++) { out.idle.push(await ev('({ local: __an(__demo.collide.samples()), pi: __an(__demo.collide.piSamples()) })')); await sleep(400); }
  // 2. A held note, 60 (C4), 2.5 s, then released; spectra early in each side's note.
  for (const note of [60, 57]) {
    if (!routeOk()) throw new Error('route not en0 before note');
    await ev('(__env.local.length = 0, __env.pi.length = 0, 1)');
    const t0 = await ev('performance.now()');
    await press(note);
    await sleep(120);
    const localEarly = await ev('__an(__demo.collide.samples())');
    // wait for the Pi onset
    let piOn = null;
    for (let i = 0; i < 100 && !piOn; i++) { await sleep(10); piOn = await ev(`(() => { const e = __env.pi.find(([t, r]) => t > ${t0} && r > 0.003); return e ? e[0] : null; })()`); }
    await sleep(100);
    const piEarly = await ev('__an(__demo.collide.piSamples())');
    await sleep(1800);
    const localLate = await ev('__an(__demo.collide.samples())');
    const piLate = await ev('__an(__demo.collide.piSamples())');
    await release(note);
    await sleep(1500);
    const env = await ev(`(() => { const db = (x) => +(20 * Math.log10(x || 1e-12)).toFixed(1); const r = {}; for (const k of ['local', 'pi']) { const e = __env[k]; const mx = e.reduce((a, b) => (b[1] > a[1] ? b : a), [0, 0, 0]); const pk = Math.max(...e.map((x) => x[2])); r[k] = { maxRmsDb: db(mx[1]), at: +(mx[0] - ${t0}).toFixed(0), maxPeakDb: db(pk) }; } return r; })()`);
    out[`note${note}`] = { piOnsetMs: piOn ? +(piOn - t0).toFixed(0) : null, localEarly, piEarly, localLate, piLate, env };
  }
  out.board = await ev('__demo.collide.piBoard()');
  out.log = await ev(`[...document.querySelectorAll('.pos-log *')].map(x => x.innerText).filter(Boolean).slice(-15)`);
  out.errors = errs;
} catch (e) {
  out.error = String(e?.message ?? e);
} finally {
  await writeFile(OUTF, JSON.stringify(out, null, 1));
  kill();
  console.log(JSON.stringify(out, null, 1).slice(0, 9000));
  process.exit(0);
}
