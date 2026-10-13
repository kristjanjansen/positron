// Serve scratchpad/site, open each test page in headless Chrome, read window.__r. Chrome is killed on every exit path.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process';
import { mkdtemp, rm, readFile } from 'node:fs/promises'; import { tmpdir } from 'node:os';
const ROOT = path.resolve('site'); const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.json': 'application/json', '.xml': 'text/xml' };
const srv = http.createServer((q, s) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); s.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const base = `http://127.0.0.1:${srv.address().port}`;
const PROFILE = await mkdtemp(path.join(tmpdir(), 'zyn-test-'));
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${PROFILE}`, '--no-first-run', '--mute-audio', '--autoplay-policy=no-user-gesture-required'], { stdio: 'ignore' });
const cleanup = () => { try { chrome.kill(); } catch {} try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch {} try { srv.close(); } catch {} };
process.on('exit', cleanup); process.on('SIGINT', () => process.exit(130));
try {
  let port; for (let i = 0; i < 60 && !port; i++) { await new Promise((r) => setTimeout(r, 250)); try { port = Number((await readFile(`${PROFILE}/DevToolsActivePort`, 'utf8')).split('\n')[0]); } catch {} }
  const ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); console.log('chrome', ver.Browser);
  const ws = new WebSocket(ver.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
  let id = 0; const pend = new Map(); const logs = [];
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') logs.push(m.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 160)); if (m.method === 'Runtime.exceptionThrown') logs.push('EXC ' + JSON.stringify(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 200)); };
  const send = (method, params = {}, sessionId) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
  for (const page of process.argv.slice(2)) {
    logs.length = 0;
    const { result: { targetId } } = await send('Target.createTarget', { url: 'about:blank' });
    const { result: { sessionId } } = await send('Target.attachToTarget', { targetId, flatten: true });
    await send('Runtime.enable', {}, sessionId); await send('Page.enable', {}, sessionId);
    await send('Page.navigate', { url: `${base}/${page}` }, sessionId);
    let r; for (let i = 0; i < 60; i++) { await new Promise((s) => setTimeout(s, 500)); const v = await send('Runtime.evaluate', { expression: 'JSON.stringify(window.__r||null)', returnByValue: true }, sessionId); r = JSON.parse(v.result.result.value); if (r && r.stage !== 'start') break; }
    console.log(page, JSON.stringify(r), 'console errors:', logs.filter((l) => !/\[WASM stderr\]/.test(l)).slice(0, 4), 'stderr lines:', logs.filter((l) => /\[WASM stderr\]/.test(l)).length);
    await send('Target.closeTarget', { targetId });
  }
} finally { cleanup(); }
