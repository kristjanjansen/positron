import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { launchChrome } from '../../demo/chrome.mjs';
const html = readFileSync(new URL('./page.html', import.meta.url));
const srv = createServer((q, r) => { r.setHeader('content-type', 'text/html'); r.end(html); }).listen(0, '127.0.0.1');
await new Promise((r) => srv.once('listening', r));
const url = `http://127.0.0.1:${srv.address().port}/`;
const sets = { none: [], WebMCP: ['--enable-features=WebMCP'], WebMCPTesting: ['--enable-features=WebMCPTesting'], both: ['--enable-features=WebMCP,WebMCPTesting'], experimental: ['--enable-experimental-web-platform-features'] };
for (const [k, args] of Object.entries(sets)) {
  const b = await launchChrome({ prefix: 'webmcp-probe', args: ['--disable-gpu', ...args] });
  try {
    const t = await (await fetch(`http://127.0.0.1:${b.port}/json/new?${url}`, { method: 'PUT' })).json();
    const proto = await (await fetch(`http://127.0.0.1:${b.port}/json/protocol`)).json().catch(() => null);
    const domains = proto ? proto.domains.map((d) => d.domain).filter((d) => /mcp|model/i.test(d)) : 'n/a';
    const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => ws.onopen = r);
    let id = 0; const pend = new Map(); const events = [];
    ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id) pend.get(d.id)?.(d); else if (/mcp/i.test(d.method)) events.push(d); };
    const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
    await new Promise((r) => setTimeout(r, 1500));
    const ev = await send('Runtime.evaluate', { expression: 'JSON.stringify(window.__probe)', returnByValue: true });
    const en = await send('WebMCP.enable');
    await new Promise((r) => setTimeout(r, 500));
    console.log(k, 'domains', JSON.stringify(domains), '\n  probe', ev.result?.result?.value, '\n  WebMCP.enable', JSON.stringify(en.error || en.result), '\n  events', JSON.stringify(events).slice(0, 900));
    ws.close();
  } finally { await b.close(); }
}
srv.close();
