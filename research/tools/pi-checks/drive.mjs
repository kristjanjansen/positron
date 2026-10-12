// A minimal CDP driver: open a URL in headless Chrome (GPU allowed), run a
// script module exporting `run(ev, sleep, log)`, close Chrome on every path.
// usage: node drive.mjs <url> <steps.mjs>
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const [url, stepsPath] = process.argv.slice(2);
const profile = mkdtempSync(join(tmpdir(), 'drive-'));
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--mute-audio', '--autoplay-policy=no-user-gesture-required',
  '--enable-gpu', '--use-angle=metal', '--window-size=1280,1600', 'about:blank'], { stdio: 'ignore' });
let done = false;
const cleanup = () => { if (done) return; done = true; try { chrome.kill('SIGKILL'); } catch {} try { rmSync(profile, { recursive: true, force: true }); } catch {} };
process.on('exit', cleanup);
process.on('SIGINT', () => process.exit(130));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  let port = null;
  for (let i = 0; i < 100 && !port; i++) {
    const f = join(profile, 'DevToolsActivePort');
    if (existsSync(f)) port = readFileSync(f, 'utf8').split('\n')[0];
    else await sleep(100);
  }
  if (!port) throw new Error('chrome did not come up');
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = targets.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0; const pend = new Map(); const logs = [];
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
    if (m.method === 'Runtime.consoleAPICalled') logs.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
    if (m.method === 'Runtime.exceptionThrown') logs.push('EXC ' + JSON.stringify(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text));
  });
  const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await cdp('Runtime.enable'); await cdp('Page.enable');
  await cdp('Page.navigate', { url });
  const ev = async (expr) => {
    const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) return { error: r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text };
    return r.result?.result?.value;
  };
  for (let i = 0; i < 100; i++) { if (await ev('!!(window.__demo && window.__demo.ready)')) break; await sleep(100); }
  const { run } = await import(pathToFileURL(stepsPath).href);
  await run(ev, sleep, (...a) => console.log(...a));
  const pageLog = await ev('(window.__demo?.logs ?? []).slice(-30)'); console.log('--- page log ---'); for (const l of pageLog ?? []) console.log(typeof l === 'string' ? l : JSON.stringify(l));
  console.log('--- console ---'); for (const l of logs.slice(-40)) console.log(l);
  ws.close();
} catch (e) { console.error('DRIVER', e.message); process.exitCode = 1; } finally { cleanup(); }
