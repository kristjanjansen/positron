import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { launchChrome } from '../../demo/chrome.mjs';
const html = readFileSync(new URL('./page2.html', import.meta.url));
const srv = createServer((q, r) => { r.setHeader('content-type', 'text/html'); r.end(html); }).listen(0, '127.0.0.1');
await new Promise((r) => srv.once('listening', r));
const url = `http://127.0.0.1:${srv.address().port}/`;
const b = await launchChrome({ prefix: 'webmcp-probe', args: ['--disable-gpu', '--enable-features=WebMCP', '--autoplay-policy=user-gesture-required'] });
try {
  const t = await (await fetch(`http://127.0.0.1:${b.port}/json/new?${url}`, { method: 'PUT' })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => ws.onopen = r);
  let id = 0; const pend = new Map(); const events = [];
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id) pend.get(d.id)?.(d); else if (/WebMCP/.test(d.method)) events.push(d); };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await new Promise((r) => setTimeout(r, 1200));
  await send('WebMCP.enable');
  await new Promise((r) => setTimeout(r, 300));
  const frameId = events[0].params.tools[0].frameId;
  for (const [toolName, input] of [['start_audio', {}], ['boom', {}], ['say_hello', { who: 'pi' }], ['nope', {}]]) {
    const r = await send('WebMCP.invokeTool', { frameId, toolName, input });
    await new Promise((r) => setTimeout(r, 1500));
    const resp = events.filter((e) => e.method === 'WebMCP.toolResponded' && e.params.invocationId === r.result?.invocationId);
    console.log(toolName, JSON.stringify(r.error || r.result), JSON.stringify(resp.map(e => e.params)));
  }
  const fe = await send('Runtime.evaluate', { expression: 'JSON.stringify(window.__formEv)', returnByValue: true });
  console.log('form event', fe.result.result.value);
  ws.close();
} finally { await b.close(); srv.close(); }
