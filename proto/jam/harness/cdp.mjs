// Minimal CDP client over node's built-in WebSocket (node >=22).
import { writeFile } from 'node:fs/promises';

export class CDP {
  constructor() { this.id = 0; this.pending = new Map(); }
  async connect(port, urlMatch) {
    for (let i = 0; i < 60; i++) {
      try {
        const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
        const page = list.find((t) => t.type === 'page' && t.url.includes(urlMatch));
        if (page) {
          this.ws = new WebSocket(page.webSocketDebuggerUrl);
          await new Promise((res, rej) => { this.ws.onopen = res; this.ws.onerror = rej; });
          this.ws.onmessage = (e) => {
            const m = JSON.parse(e.data);
            if (m.id && this.pending.has(m.id)) { this.pending.get(m.id)(m); this.pending.delete(m.id); }
          };
          return this;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error('CDP connect failed :' + port);
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((res, rej) => {
      this.pending.set(id, (m) => m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result));
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expr, { awaitPromise = true } = {}) {
    const r = await this.send('Runtime.evaluate', { expression: expr, awaitPromise, returnByValue: true });
    if (r.exceptionDetails) throw new Error('eval failed: ' + JSON.stringify(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 300));
    return r.result.value;
  }
  async screenshot(file) {
    const r = await this.send('Page.captureScreenshot', { format: 'png' });
    await writeFile(file, Buffer.from(r.data, 'base64'));
  }
  close() { try { this.ws.close(); } catch {} }
}
