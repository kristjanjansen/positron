// demo/verify.mjs — drives every BUILT demo through the __demo contract.
//
//   node demo/verify.mjs            # all built demos
//   node demo/verify.mjs 01 03      # just these
//
// This file is what replaces the ~25 harness pages: it asserts on
// window.__demo, never on DOM ids, so it does not care how any page is built.
// Raw CDP over node's global WebSocket, no deps — house harness style.

import { spawn } from 'node:child_process';
import { serve, PORT as HTTP_PORT } from './server.mjs';
import { DEMOS } from './manifest.mjs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const CDP_PORT = 9333;
const PROFILE = '/private/tmp/claude-501/demo-verify-udd';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const want = process.argv.slice(2);
const targets = DEMOS.filter((d) => d.built && (!want.length || want.includes(d.n)));
if (!targets.length) { console.error('nothing to verify'); process.exit(1); }

// DEMO_BASE=https://positron.studio node demo/verify.mjs  -> verify the DEPLOY
const server = process.env.DEMO_BASE ? null : await serve(HTTP_PORT);
const BASE = process.env.DEMO_BASE || `http://127.0.0.1:${HTTP_PORT}`;
console.log(`base ${BASE}`);

const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${PROFILE}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu',
  '--autoplay-policy=no-user-gesture-required', '--mute-audio',
], { stdio: ['ignore', 'pipe', 'pipe'] });
chrome.stderr.on('data', () => {});

let wsUrl = null;
for (let i = 0; i < 60 && !wsUrl; i++) {
  await sleep(250);
  try { wsUrl = (await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json()).webSocketDebuggerUrl; } catch {}
}
if (!wsUrl) { chrome.kill(); server?.close(); throw new Error('chrome did not come up'); }

const ws = new WebSocket(wsUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let msgId = 0;
const pending = new Map();
const listeners = [];
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
  } else if (m.method) for (const fn of listeners) fn(m);
};
const send = (method, params = {}, sessionId) =>
  new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    setTimeout(() => { if (pending.delete(id)) reject(new Error('cdp timeout: ' + method)); }, 30000);
  });

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const S = (m, p) => send(m, p, sessionId);
await S('Page.enable'); await S('Runtime.enable'); await S('Log.enable'); await S('Network.enable');

let errors = [];
let failedReqs = [];
listeners.push((m) => {
  if (m.sessionId !== sessionId) return;
  if (m.method === 'Runtime.exceptionThrown') {
    errors.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text);
  }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    errors.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
  }
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
    errors.push(m.params.entry.text);
  }
  if (m.method === 'Network.loadingFailed') failedReqs.push(m.params.errorText);
});

async function ev(expr) {
  const r = await S('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
}

// ── run ─────────────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
const ok = (label, cond, detail) => {
  if (cond) { pass++; console.log(`  ok    ${label}${detail !== undefined ? `  — ${detail}` : ''}`); }
  else { fail++; console.log(`  FAIL  ${label}${detail !== undefined ? `  — ${detail}` : ''}`); }
};

for (const t of targets) {
  console.log(`\n[${t.n}] ${t.name}`);
  errors = []; failedReqs = [];
  await S('Page.navigate', { url: `${BASE}/demo/${t.n}-${t.name}/` });
  await sleep(1400);

  // ready, with a bounded wait — never a bare sleep
  let ready = false;
  for (let i = 0; i < 40 && !ready; i++) {
    ready = await ev('!!(window.__demo && window.__demo.ready)');
    if (!ready) await sleep(150);
  }
  ok('__demo.ready', ready);
  if (!ready) { console.log(`        failed: ${await ev('window.__demo && window.__demo.failed')}`); continue; }

  const meta = await ev('({ n: __demo.n, name: __demo.name, keys: Object.keys(__demo.readout), hasT: !!__demo.transport })');
  ok('identity matches manifest', meta.n === t.n && meta.name === t.name, `${meta.n} ${meta.name}`);
  ok('declares a readout', meta.keys.length > 0, meta.keys.join(','));

  if (meta.hasT) {
    const t0 = await ev('({ pos: __demo.transport.position, playing: __demo.transport.playing, seekable: __demo.transport.seekable, lattice: __demo.transport.lattice, rate: __demo.transport.rate })');
    ok('transport published', typeof t0.pos === 'number', `pos ${t0.pos}`);
    ok('rate lattice from caps', t0.lattice === null || Array.isArray(t0.lattice), JSON.stringify(t0.lattice));

    // play advances position
    await ev('document.querySelector(".tbar-toggle").click()');
    await sleep(500);
    const t1 = await ev('({ pos: __demo.transport.position, playing: __demo.transport.playing })');
    ok('play advances position', t1.playing && t1.pos > t0.pos, `${t0.pos.toFixed(0)} -> ${t1.pos.toFixed(0)}`);

    // pause holds it
    await ev('document.querySelector(".tbar-toggle").click()');
    await sleep(300);
    const a = await ev('__demo.transport.position');
    await sleep(300);
    const b = await ev('__demo.transport.position');
    ok('pause holds position', !(await ev('__demo.transport.playing')) && Math.abs(b - a) < 1, `${a.toFixed(1)} == ${b.toFixed(1)}`);

    // seek via the keyboard table the component owns
    if (t0.seekable) {
      await ev('document.body.focus(); window.dispatchEvent(new KeyboardEvent("keydown",{key:"5",bubbles:true}))');
      await sleep(250);
      const mid = await ev('__demo.transport.position');
      const rng = await ev('__demo.transport.range');
      const target = rng[0] + (rng[1] - rng[0]) * 0.5;
      ok('keyboard seek lands', Math.abs(mid - target) < (rng[1] - rng[0]) * 0.02, `${mid.toFixed(0)} ~ ${target.toFixed(0)}`);
    }
  }

  const strip = await ev('!!document.querySelector("canvas.d-strip")');
  if (strip) {
    const ink = await ev(`(() => {
      const c = document.querySelector('canvas.d-strip');
      const g = c.getContext('2d');
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let lit = 0;
      for (let i = 0; i < d.length; i += 4 * 53) if (d[i] + d[i+1] + d[i+2] > 90) lit++;
      return lit;
    })()`);
    ok('strip has ink', ink > 0, `${ink} lit samples`);
  }

  // exercise every control the demo declared, in order — a multi-step demo
  // (arm, then measure) does not put its asserts behind the first button
  const labels = await ev('[...document.querySelectorAll(".d-controls button")].map(b => b.textContent)');
  for (let i = 0; i < (labels || []).length; i++) {
    await ev(`document.querySelectorAll(".d-controls button")[${i}].click()`);
    await sleep(650);
  }
  if (labels?.length) console.log(`        (pressed ${labels.map((l) => JSON.stringify(l)).join(', ')})`);

  const asserts = await ev('__demo.asserts');
  ok('page asserted something', (asserts || []).length > 0, String((asserts || []).length));
  for (const a of asserts || []) ok(`page: ${a.label}`, a.pass, a.detail ?? undefined);

  ok('no console errors', errors.length === 0, errors.slice(0, 2).join(' | ') || '0');
  ok('no failed requests', failedReqs.length === 0, failedReqs.slice(0, 2).join(' | ') || '0');
}

console.log(`\n${pass}/${pass + fail} green${fail ? `  (${fail} FAILED)` : ''}`);
ws.close(); chrome.kill(); server?.close();
process.exit(fail ? 1 : 0);
