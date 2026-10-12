// node drive.mjs '<query>' <out.json> [--noiso]
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { serve } from './serve.mjs';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const [query, dest] = process.argv.slice(2);
const iso = !process.argv.includes('--noiso');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = mkdtempSync(join(tmpdir(), 'btx-'));
let chrome, server;
const cleanup = () => { try { chrome?.kill('SIGKILL'); } catch {} try { server?.close(); } catch {} try { rmSync(profile, { recursive: true, force: true }); } catch {} };
process.on('exit', cleanup); process.on('SIGINT', () => process.exit(130)); process.on('SIGTERM', () => process.exit(143));
try {
  server = await serve(iso);
  const port = server.address().port;
  chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', ...(process.argv.includes('--gpu') ? ['--enable-unsafe-webgpu', '--enable-features=Vulkan'] : ['--disable-gpu']), '--enable-precise-memory-info', 'about:blank'], { stdio: 'ignore' });
  let dp; for (let i = 0; i < 100 && !dp; i++) { await sleep(100); const f = join(profile, 'DevToolsActivePort'); if (existsSync(f)) dp = readFileSync(f, 'utf8').split('\n'); }
  const browserWs = new WebSocket(`ws://127.0.0.1:${dp[0]}${dp[1]}`);
  await new Promise((r) => browserWs.onopen = r);
  let id = 0; const pend = new Map(); const events = [];
  browserWs.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } else if (d.method) events.push(d); };
  const send = (method, params = {}, sessionId) => new Promise((r) => { const i = ++id; pend.set(i, r); browserWs.send(JSON.stringify({ id: i, method, params, sessionId })); });
  const { result: { targetId } } = await send('Target.createTarget', { url: 'about:blank' });
  const { result: { sessionId } } = await send('Target.attachToTarget', { targetId, flatten: true });
  const S = (m, p) => send(m, p, sessionId);
  await S('Network.enable'); await S('Runtime.enable'); await S('Performance.enable');
  const procCpu = async () => { const r = await send('SystemInfo.getProcessInfo'); return (r.result?.processInfo || []).filter((p) => p.type === 'renderer').reduce((s, p) => s + p.cpuTime, 0); };
  const cpu0 = await procCpu();
  const tNav = Date.now();
  await S('Page.navigate', { url: `http://127.0.0.1:${port}/btx/page.html?${query}` });
  let res;
  for (let i = 0; i < 3600; i++) {
    await sleep(500);
    const r = await S('Runtime.evaluate', { expression: 'JSON.stringify(window.__result || null)', returnByValue: true });
    const v = r.result?.result?.value && JSON.parse(r.result.result.value);
    if (v?.done) { res = v; break; }
    if (i % 20 === 0) process.stderr.write(`${v?.progress || '...'}\n`);
  }
  const cpu1 = await procCpu();
  const metrics = (await S('Performance.getMetrics')).result.metrics;
  // bytes over the wire per URL
  const urls = {}, sizes = {};
  for (const e of events) {
    if (e.method === 'Network.requestWillBeSent') urls[e.params.requestId] = e.params.request.url;
    if (e.method === 'Network.loadingFinished') sizes[urls[e.params.requestId]] = (sizes[urls[e.params.requestId]] || 0) + e.params.encodedDataLength;
  }
  const errs = events.filter((e) => e.method === 'Runtime.exceptionThrown').map((e) => e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text);
  res = { ...(res || { done: false }), wallMs: Date.now() - tNav, rendererCpuS: cpu1 - cpu0, metrics: Object.fromEntries(metrics.map((m) => [m.name, m.value])), bytes: sizes, errors: errs };
  writeFileSync(dest, JSON.stringify(res));
  console.log(JSON.stringify({ ...res, runs: undefined, metrics: { JSHeapUsedSize: res.metrics.JSHeapUsedSize, JSHeapTotalSize: res.metrics.JSHeapTotalSize } }, null, 1).slice(0, 4000));
} finally { cleanup(); }
process.exit(0);
