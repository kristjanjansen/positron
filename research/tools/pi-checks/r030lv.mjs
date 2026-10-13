// remote/040 (was rhythm/030) against the REAL Pi (studio-1), via the dev server on :8890. One headless Chrome, closed on every path.
// node pi030.mjs relay|direct
import { spawn, execSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const PATH = process.argv[2] === 'direct' ? 'direct' : 'relay';
const ONLY_CHOKE = process.argv.includes('choke');
const OUTF = `/private/tmp/claude-501/-Users-s32863-personal-positron/0f3a0353-ddeb-41fa-a915-9abf8aa2d34d/scratchpad/r030lv-${process.argv[3] ?? 'before'}.json`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const routeOk = () => /interface: en0/.test(execSync('route -n get <pi>').toString());
const out = { path: PATH, phases: {} };
const save = () => writeFile(OUTF, JSON.stringify(out, null, 1));
const PROFILE = await mkdtemp(join(tmpdir(), 'positron-pi030-'));
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--remote-debugging-port=0',
  `--user-data-dir=${PROFILE}`, '--no-first-run', '--no-default-browser-check', '--mute-audio', '--autoplay-policy=no-user-gesture-required'], { stdio: ['ignore', 'pipe', 'pipe'] });
chrome.stderr.on('data', () => {});
const kill = () => { try { chrome.kill('SIGKILL'); } catch {} try { rmSync(PROFILE, { recursive: true, force: true }); } catch {} };
process.on('exit', kill);
process.on('SIGINT', () => process.exit(130));
let ev;
const leaveAll = async () => { try { await ev('__rhythm.stop()'); await ev(`(() => { if (__demo.drums.pi.joined()) document.querySelector('button[data-id=pi]').click(); return 1; })()`); await sleep(500); } catch {} };
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
  const guard = (name) => { if (!routeOk()) { out.stopped = `route not en0 before ${name}`; throw new Error(out.stopped); } };
  const check = () => ev('__demo.drums.check()');
  const join = async () => {
    await ev(`document.querySelector('button[data-id=pi]').click()`);
    for (let i = 0; i < 300; i++) { await sleep(100); const md = await ev('__demo.drums.pi.mode()'); if (md !== 'checking' && md !== 'idle') break; }
    return ev('({ mode: __demo.drums.pi.mode(), loaded: __demo.drums.pi.loaded(), offset: __demo.drums.pi.kit()?.offset(), rtt: __demo.drums.pi.kit()?.rtt(), via: __demo.drums.pi.board()?.stats().via })');
  };
  const cells = () => ev(`[...document.querySelectorAll('.pos-readout > *')].map(c => c.innerText.replace(/\\s+/g,' ')).join(' | ')`);
  const log = () => ev(`[...document.querySelectorAll('.pos-log *')].map(x => x.innerText).filter(Boolean).slice(-25)`);
  /** Play `ms`, stop, settle, and return the deltas over it. */
  const play = async (ms) => {
    const a = await check();
    await ev('__rhythm.start()'); await sleep(ms); await ev('__rhythm.stop()'); await sleep(2500);
    const b = await check();
    return { handed: b.handed - a.handed, started: b.started - a.started, late: b.late - a.late, droppedLate: b.droppedLate - a.droppedLate,
      refused: b.refused - a.refused, chokes: b.chokes - a.chokes, ahead: b.ahead };
  };

  guard('open');
  await S('Page.navigate', { url: `http://127.0.0.1:8890/drums/remote/` });
  await sleep(2500);
  out.join = await join();
  if (!['relay', 'direct', 'turn'].includes(out.join.mode)) throw new Error(`not on the board: ${out.join.mode}`);
  await ev(`(() => { window.__lv = []; window.__lvT = setInterval(() => { const l = __demo.drums.levels(); __lv.push([l.here, l.pi]); }, 5); return 1; })()`);
  await sleep(1500);
  out.idle = await ev(`(() => { const a = __lv.splice(0); const db = (x) => +(20*Math.log10(x||1e-12)).toFixed(1); return { here: db(Math.max(...a.map(x=>x[0]))), pi: db(Math.max(...a.map(x=>x[1]))) }; })()`);
  // Each voice alone: one row on, every 4th step.
  out.voices = {};
  for (let r = 0; r < 4; r++) {
    guard('voice ' + r);
    await ev(`(() => { const g = __rhythm.grid; for (let rr = 0; rr < 4; rr++) for (let s = 0; s < 16; s++) g.set(rr, s, rr === ${r} && s % 4 === 0, 'quiet'); return 1; })()`);
    await ev('__lv.splice(0)');
    await ev('__rhythm.start()'); await sleep(6000); await ev('__rhythm.stop()'); await sleep(1500);
    out.voices[r] = await ev(`(() => { const a = __lv.splice(0); const db = (x) => +(20*Math.log10(x||1e-12)).toFixed(1); const q = (k) => { const v = a.map(x=>x[k]).sort((p,q)=>p-q); return { max: db(v[v.length-1]), p99: db(v[Math.floor(v.length*0.99)]), p90: db(v[Math.floor(v.length*0.9)]) }; }; return { here: q(0), pi: q(1) }; })()`);
  }
  out.errors = errs;
} catch (e) {
  out.error = String(e?.message ?? e);
} finally {
  if (ev) await leaveAll();
  await save();
  kill();
  console.log(JSON.stringify(out, null, 1).slice(0, 6000));
  process.exit(0);
}
