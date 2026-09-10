// proto/looper/remote-verify.mjs — TWO REAL TABS, one room, one loop.
//
//   node proto/looper/remote-verify.mjs
//
// remote-measure.mjs proves the architecture on a channel whose delay, loss and
// clock skew this project chose. This proves the PLUMBING: two independent
// browsing contexts, two AudioContexts, two synths, a real BroadcastChannel
// between them, and a layer that crosses it and plays.
//
// ⚠ WHAT THIS CANNOT PROVE, stated up front so the numbers are not over-read:
// two tabs of one browser share a SYSTEM CLOCK, so the skew estimator has
// nothing to find here and will report ~0. That the correction works is
// remote-measure.mjs R1/R5's job, where the skew is injected. What this run
// shows is that the protocol, the clock plumbing, the session envelope and the
// gate all survive contact with two real documents.

import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, PORT } from './server.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9342;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let fails = 0, checks = 0;
function ok(label, cond, detail) {
  checks++;
  if (!cond) { fails++; console.error(`FAIL [${label}] ${detail}`); }
  else console.log(`  ok  ${label}  ${detail}`);
}
const f = (x, n = 2) => (x == null || Number.isNaN(x) ? '—' : (+x).toFixed(n));

const server = await serve();
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${DEBUG_PORT}`,
  `--user-data-dir=${join(HERE, '.chrome-remote')}`, '--no-first-run', '--disable-gpu',
  '--autoplay-policy=no-user-gesture-required', '--window-size=1500,1000', 'about:blank'],
  { stdio: 'ignore', detached: true });
await sleep(2500);

/** one CDP session per tab */
async function attach(url) {
  const r = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  const t = await r.json();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((res) => { ws.onopen = res; });
  let id = 0; const waits = new Map(); const errors = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && waits.has(m.id)) { waits.get(m.id)(m); waits.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text);
  };
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; waits.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Page.enable');
  const evalJs = async (expr) => {
    const r2 = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r2.result && r2.result.exceptionDetails) throw new Error(JSON.stringify(r2.result.exceptionDetails));
    return r2.result && r2.result.result && r2.result.result.value;
  };
  const shot = async (path) => {
    const r2 = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    await writeFile(path, Buffer.from(r2.result.data, 'base64'));
  };
  const VK = { a: 65, s: 83, d: 68, f: 70, g: 71, h: 72, j: 74, k: 75, ' ': 32 };
  const CODE = { a: 'KeyA', s: 'KeyS', d: 'KeyD', f: 'KeyF', g: 'KeyG', h: 'KeyH', j: 'KeyJ', k: 'KeyK', ' ': 'Space' };
  const key = (type, k) => send('Input.dispatchKeyEvent', {
    type, key: k === ' ' ? ' ' : k, code: CODE[k], text: type === 'keyDown' ? k : undefined,
    windowsVirtualKeyCode: VK[k], nativeVirtualKeyCode: VK[k],
  });
  return { send, evalJs, shot, key, errors, close: () => ws.close(), targetId: t.id };
}

const ROOM = 'verify';
const A = await attach(`http://127.0.0.1:${PORT}/proto/looper/?room=${ROOM}&me=alice`);
const B = await attach(`http://127.0.0.1:${PORT}/proto/looper/?room=${ROOM}&me=bob`);
await sleep(1600);

// --- boot both ---------------------------------------------------------------
await A.evalJs(`document.querySelector('#start').click()`);
await B.evalJs(`document.querySelector('#start').click()`);
await sleep(1400);

const boots = await Promise.all([A, B].map((t) => t.evalJs(`(() => { const L = window.__L;
  return { ok: !!L, id: L && L.id, room: L && L.room, peers: L && L.peer ? L.peer.peers().length : -1,
           state: L && L.ctx.state, domain: L && L.looper.parent.transport.clock.domain }; })()`)));
ok('P1', boots.every((b) => b.ok && b.state === 'running' && b.room === ROOM),
  `two independent documents, two AudioContexts, one room '${ROOM}' — ids ${boots.map((b) => b.id).join(' + ')}`);
ok('P1', boots.every((b) => b.domain === 'shared-epoch'),
  `and both loopers are built on the SHARED-EPOCH clock, not on their own private performance.now() — two documents cannot compare those at all`);

// --- the skew estimator, over a real BroadcastChannel ------------------------
await sleep(2500);
const skew = await Promise.all([A, B].map((t) => t.evalJs(`(() => { const p = window.__L.peer;
  const st = p.stats();
  return { id: p.id, offset: p.offsetMs(), peers: st.peers, minRtt: st.minRttMs, samples: st.skewSamples }; })()`)));
console.log(`\n  skew estimation over a real BroadcastChannel:`);
for (const s of skew) console.log(`     ${s.id}: ${s.peers} peer(s) · min RTT ${f(s.minRtt, 3)} ms · offset ${f(s.offset, 3)} ms · ${s.samples} samples`);
ok('P2', skew.every((s) => s.peers === 1 && s.samples > 0),
  `each peer found the other and exchanged skew samples (min RTT ${skew.map((s) => f(s.minRtt, 2)).join(' / ')} ms over a BroadcastChannel)`);
ok('P2', Math.abs(skew[1].offset) < 5,
  `and the offset is ~0 (${f(skew[1].offset, 3)} ms) — WHICH IS THE EXPECTED RESULT AND NOT A MEASUREMENT OF SUCCESS: ` +
  `two tabs share a system clock, so there is no skew here to find. The correction is proven where skew is injected (remote-measure R1/R5)`);

// --- alice records a loop ----------------------------------------------------
const FIGURE = [
  { k: 'a', on: 20, off: 210 },
  { k: 'd', on: 341, off: 520 },
  { k: 'g', on: 667, off: 910 },
  { k: 'j', on: 1018, off: 1190 },
  { k: 'h', on: 1344, off: 1510 },
];
const LOOP_TARGET = 2000;
const evs = [];
for (const n of FIGURE) { evs.push({ t: n.on, k: n.k, type: 'keyDown' }); evs.push({ t: n.off, k: n.k, type: 'keyUp' }); }
evs.sort((a, b) => a.t - b.t);

await A.key('keyDown', ' '); await A.key('keyUp', ' ');
const t0 = Date.now();
for (const e of evs) {
  const wait = t0 + e.t - Date.now();
  if (wait > 0) await sleep(wait);
  await A.key(e.type, e.k);
}
{ const wait = t0 + LOOP_TARGET - Date.now(); if (wait > 0) await sleep(wait); }
await A.key('keyDown', ' '); await A.key('keyUp', ' ');       // pedal: commit + publish
await sleep(1200);

const aState = await A.evalJs(`(() => { const L = window.__L;
  return { ...L.looper.stats(), sent: L.peer.log.filter(x => x.type === 'layer-sent') }; })()`);
ok('P3', aState.layers === 1 && aState.sent.length === 1,
  `alice committed a layer of ${aState.notes} notes and published it ONCE — ${aState.sent[0].bytes} B on the wire, for a ${f(aState.loopMs, 0)} ms loop`);

const bState = await B.evalJs(`(() => { const L = window.__L;
  const r = L.remote[0];
  return { got: L.remote.length, from: r && r.from, bytes: r && r.rec.bytes,
           deliveryMs: r && r.rec.deliveryMs, entry: r && r.entry,
           layers: r ? r.looper.layers.length : 0,
           notes: r ? r.looper.stats().notes : 0,
           loopMs: r ? r.looper.loopMs() : null,
           origin: r ? r.looper.origin() : null }; })()`);
console.log(`\n  the loop plane, across two documents:`);
console.log(`     ${bState.bytes} B delivered in ${f(bState.deliveryMs, 2)} ms · joins on pass ${bState.entry && bState.entry.iteration}`);
ok('P4', bState.got === 1 && bState.notes === aState.notes && Math.abs(bState.loopMs - aState.loopMs) < 0.001,
  `bob received it and rebuilt the SAME loop from bytes alone: ${bState.notes} notes, ${f(bState.loopMs, 3)} ms, origin ${bState.origin} — bob's page has never seen alice's performance, only her score`);
ok('P4', bState.deliveryMs >= 0 && bState.deliveryMs < 500,
  `delivery took ${f(bState.deliveryMs, 2)} ms — a number that, per remote-measure R2, could have been a hundred times larger without moving a single onset`);

// --- both play ---------------------------------------------------------------
await sleep(9000);
const play = await Promise.all([
  A.evalJs(`(() => { const on = window.__L.onsets.filter(o => o.path === 'loop');
    return { n: on.length, phases: [...new Set(on.map(o => +o.phase.toFixed(3)))].sort((a,b)=>a-b),
             intended: on.map(o => ({ i: o.iter, n: o.note, t: o.intendedUs })) }; })()`),
  // bob recorded nothing, so every loop onset in HIS page belongs to the layer
  // that crossed the channel. (The loaded session does not keep its own onset
  // log — it shares bob's voice engine, so its onsets are in bob's log.)
  B.evalJs(`(() => { const on = window.__L.onsets.filter(o => o.path === 'loop');
    return { n: on.length, phases: [...new Set(on.map(o => +o.phase.toFixed(3)))].sort((a,b)=>a-b),
             intended: on.map(o => ({ i: o.iter, n: o.note, t: o.intendedUs })),
             heard: window.__L.earOnsets.length }; })()`),
]);
console.log(`     alice played ${play[0].n} onsets · bob played ${play[1].n} · bob's ear heard ${play[1].heard}`);
ok('P5', play[1].n > FIGURE.length * 2 && JSON.stringify(play[0].phases) === JSON.stringify(play[1].phases),
  `BOTH TABS ARE PLAYING THE SAME LOOP: identical phase sets ${JSON.stringify(play[1].phases.map((p) => +p.toFixed(1)))} — ` +
  `and after the layer crossed, the two documents have exchanged nothing but skew pings`);

// the alignment both tabs actually achieved, in shared time
const byKey = new Map();
for (const r of play[0].intended) if (r.t != null) byKey.set(`${r.i}:${r.n}`, r.t);
const errs = [];
for (const r of play[1].intended) { const a = byKey.get(`${r.i}:${r.n}`); if (a != null && r.t != null) errs.push((r.t - a) / 1000); }
errs.sort((a, b) => a - b);
const p50 = errs[Math.floor(errs.length * 0.5)], p95 = errs[Math.floor(errs.length * 0.95)];
const maxAbs = errs.length ? Math.max(...errs.map(Math.abs)) : null;
console.log(`\n  cross-tab alignment of the INTENDED instants (n=${errs.length}): p50 ${f(p50, 3)} · p95 ${f(p95, 3)} · max ${f(maxAbs, 3)} ms`);
ok('P6', errs.length > FIGURE.length && Math.abs(p95) < 10,
  `the two tabs INTEND the same notes at the same instants: p50 ${f(p50, 3)} · p95 ${f(p95, 3)} ms across ${errs.length} paired onsets. ` +
  `(Max is ${f(maxAbs, 2)} ms and that is expected: each peer re-derives its child's anchor at every wrap, so this quantity carries each servo's dead band. ` +
  `It is a measure of two independent scheduling decisions agreeing, not of what a listener hears — for that, see the ears below.)`);

// --- THE NUMBER THAT ACTUALLY MATTERS: ear to ear ---------------------------
// An onset detector reports in its own document's AudioContext seconds. Anchor
// each to shared time and the two pages' OUTPUTS become comparable — which is
// the only cross-peer alignment a listener could ever notice.
const ears = await Promise.all([A, B].map((t) => t.evalJs(`(async () => {
  const L = window.__L; L.drainEar(); await new Promise(r => setTimeout(r, 250));
  const a = L.audioAnchor();
  return { anchor: a, onsets: L.earOnsets.map(x => a.shared + (x - a.audio) * 1000) }; })()`)));
// MUTUAL nearest, not just nearest: a one-sided match will happily pair one
// page's extra detection with a neighbour of the other's and report the gap
// between two different notes as a flam.
const nearest = (x, ys) => ys.reduce((b, y) => (Math.abs(y - x) < Math.abs(b - x) ? y : b), Infinity);
const pairs = []; let unpaired = 0;
for (const x of ears[0].onsets) {
  const y = nearest(x, ears[1].onsets);
  if (!Number.isFinite(y) || Math.abs(y - x) > 80) { unpaired++; continue; }
  if (nearest(y, ears[0].onsets) !== x) { unpaired++; continue; }   // must agree both ways
  pairs.push(y - x);
}
pairs.sort((a, b) => a - b);
const eP50 = pairs[Math.floor(pairs.length * 0.5)], eP95 = pairs[Math.floor(pairs.length * 0.95)];
const eMax = pairs.length ? Math.max(...pairs.map(Math.abs)) : null;
const eMean = pairs.length ? pairs.reduce((a, b) => a + b, 0) / pairs.length : null;
const sd = pairs.length ? Math.sqrt(pairs.reduce((a, b) => a + (b - eMean) ** 2, 0) / pairs.length) : null;
console.log(`\n  EAR TO EAR — what the two render threads actually produced, in shared time (n=${pairs.length}):`);
console.log(`     bob − alice: p50 ${f(eP50, 2)} · p95 ${f(eP95, 2)} · max ${f(eMax, 2)} ms · mean ${f(eMean, 2)} · sd ${f(sd, 2)}`);
ok('P6b', pairs.length > FIGURE.length && Math.abs(eP50) < 10 && Math.abs(eP95) < 20,
  `THE TWO INSTRUMENTS SOUND TOGETHER: ${pairs.length} mutually-paired onsets (${unpaired} unpaired), bob − alice p50 ${f(eP50, 2)} · p95 ${f(eP95, 2)} ms, sd ${f(sd, 2)} ms — ` +
  `measured at the two audio render threads and anchored into one shared clock, with no messages exchanged after the layer crossed. ` +
  `⚠ max is ${f(eMax, 2)} ms: the tail is NOT explained and is the first thing to chase (tightening the servo dead band 5 -> 1 ms moved p50 from -8.24 to here, so part of it is the dead band and part of it is not)`);
ok('P6', play[1].heard > FIGURE.length,
  `and bob's audio render thread really heard ${play[1].heard} onsets — the loop is sounding in a second document, not merely scheduled there`);

await A.shot(join(HERE, 'shot-remote-alice.png'));
await B.shot(join(HERE, 'shot-remote-bob.png'));
ok('P7', A.errors.length === 0 && B.errors.length === 0,
  `no page exceptions in either tab${A.errors.length || B.errors.length ? `: ${[...A.errors, ...B.errors].join(' | ')}` : ''}`);

console.log(`\n  screenshots: proto/looper/shot-remote-alice.png · shot-remote-bob.png`);
A.close(); B.close();
try { process.kill(-chrome.pid, 'SIGKILL'); } catch { chrome.kill('SIGKILL'); }
server.close();
console.log(`\n${fails ? `${fails} VIOLATION(S)` : 'OK'} — ${checks} checks`);
process.exit(fails ? 1 : 0);
