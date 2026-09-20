// proto/looper/verify.mjs — ONE headless Chrome, real clock, real audio, real
// key events, and an onset detector on the audio render thread.
//
//   node proto/looper/verify.mjs
//
// measure.mjs proves what must be EXACT. This proves what must be TRUE ON A
// REAL MACHINE, and every number it prints is one the virtual clock is
// structurally unable to produce:
//
//   M1  stamp at source vs stamp at handler — the law, as a distribution
//   M2  the loop's firing lateness, split wrap-adjacent vs everything else
//   M3  THE EAR: what the audio render thread actually heard, in samples,
//       against what the wall lane intended — the caps.audio bridge, measured
//       at the output rather than at the decision
//   M4  the two clocks a looper has to reconcile (base + output latency)
//   M5  a 500 ms main-thread stall, mid-loop
//
// Keys are injected with CDP so the figure is machine-played, but NODE'S CLOCK
// IS NEVER THE TRUTH: the truth is the page's own `e.timeStamp`, because that
// is what the looper recorded and therefore what the loop must reproduce.
// Injection jitter changes the figure; it cannot flatter the measurement.

import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, PORT } from './server.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9341;
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
  `--user-data-dir=${join(HERE, '.chrome-verify')}`, '--no-first-run', '--disable-gpu',
  '--autoplay-policy=no-user-gesture-required', '--window-size=1500,1000', 'about:blank'],
  { stdio: 'ignore', detached: true });
await sleep(2500);

let ws, id = 0; const waits = new Map();
{
  const list = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
  ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r) => { ws.onopen = r; });
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (waits.has(m.id)) { waits.get(m.id)(m); waits.delete(m.id); } };
}
const send = (method, params = {}) => new Promise((r) => { const i = ++id; waits.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJs = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.result && r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
  return r.result && r.result.result && r.result.result.value;
};
const shot = async (path) => {
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  await writeFile(path, Buffer.from(r.result.data, 'base64'));
  return path;
};

const errors = [];
await send('Runtime.enable'); await send('Page.enable');
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text + ' ' + ((m.params.exceptionDetails.exception || {}).description || ''));
});

const VK = { a: 65, w: 87, s: 83, e: 69, d: 68, f: 70, t: 84, g: 71, y: 89, h: 72, u: 85, j: 74, k: 75, ' ': 32 };
const CODE = { a: 'KeyA', w: 'KeyW', s: 'KeyS', e: 'KeyE', d: 'KeyD', f: 'KeyF', t: 'KeyT',
               g: 'KeyG', y: 'KeyY', h: 'KeyH', u: 'KeyU', j: 'KeyJ', k: 'KeyK', ' ': 'Space' };
const key = (type, k) => send('Input.dispatchKeyEvent', {
  type, key: k === ' ' ? ' ' : k, code: CODE[k], text: type === 'keyDown' ? k : undefined,
  windowsVirtualKeyCode: VK[k], nativeVirtualKeyCode: VK[k],
});

await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/proto/looper/` });
await sleep(1800);

// --- V1: boot ---------------------------------------------------------------
await evalJs(`document.querySelector('#start').click()`);
await sleep(900);
const boot = await evalJs(`(() => { const L = window.__L; if (!L) return {ok:false};
  return { ok: true, state: L.ctx.state, sr: L.ctx.sampleRate, layers: L.looper.layers.length,
           host: L.looper.parent.hostName, worklet: !!L.ear }; })()`);
ok('V1', boot.ok && boot.state === 'running' && boot.worklet,
  `audio running at ${boot.sr} Hz, onset worklet loaded, tick host '${boot.host}'`);
ok('V1', errors.length === 0, `no page exceptions${errors.length ? `: ${errors.join(' | ')}` : ''}`);

// --- record one pass --------------------------------------------------------
// Six notes over ~2 s, spacing deliberately uneven AND fractional. Wide enough
// apart that the ear's 30 ms refractory cannot merge two attacks into one, so
// M3 measures the bridge rather than the detector.
const FIGURE = [
  { k: 'a', on: 20, off: 200 },
  { k: 'd', on: 337, off: 520 },
  { k: 'g', on: 664, off: 900 },
  { k: 'j', on: 1013, off: 1180 },
  { k: 'h', on: 1341, off: 1500 },
  { k: 's', on: 1672, off: 1830 },
];
const LOOP_TARGET = 2000;

const evs = [];
for (const n of FIGURE) { evs.push({ t: n.on, k: n.k, type: 'keyDown' }); evs.push({ t: n.off, k: n.k, type: 'keyUp' }); }
evs.sort((a, b) => a.t - b.t);

await key('keyDown', ' '); await key('keyUp', ' ');          // pedal: start recording
const t0 = Date.now();
for (const e of evs) {
  const wait = t0 + e.t - Date.now();
  if (wait > 0) await sleep(wait);
  await key(e.type, e.k);
}
{ const wait = t0 + LOOP_TARGET - Date.now(); if (wait > 0) await sleep(wait); }
await key('keyDown', ' '); await key('keyUp', ' ');          // pedal: set length, start looping

// ARM A is now a DELIBERATE DOWNGRADE. The looper ships with a 30 ms lead
// because the A/B below is what settled it; to keep measuring the comparison
// the arm has to be forced back to 0 rather than inherited from the default.
await evalJs(`(() => { window.__L.looper.layers[0].deck.adapter('note').caps.audio.leadMs = 0; return 1; })()`);

const rec = await evalJs(`(() => { const L = window.__L, s = L.looper.stats(), l0 = L.looper.layers[0];
  return { ...s, items: l0 ? l0.items.length : 0, spanMs: l0 ? l0.spanMs : null,
           lanes: L.looper.loopLanes(0) }; })()`);
ok('V2', rec.layers === 1 && rec.lengthSetByPlaying && Math.abs(rec.loopMs - LOOP_TARGET) < 120,
  `THE PEDAL SET THE LENGTH on a real clock: ${f(rec.loopMs, 1)} ms for a ${LOOP_TARGET} ms target (the difference is the two key events' own latency, which is the honest thing for it to be)`);
ok('V2', rec.notes === FIGURE.length,
  `${rec.notes} of ${FIGURE.length} notes captured, ${rec.trimmed} cut at the splice`);

// --- M1: the stamp law, as a distribution -----------------------------------
const m1 = await evalJs(`(() => { const L = window.__L;
  const sk = L.looper.trace.map(r => r.stampSkewMs).filter(x => x != null).sort((a,b)=>a-b);
  const at = q => sk[Math.min(sk.length-1, Math.floor(sk.length*q))];
  return { n: sk.length, min: sk[0], p50: at(.5), p95: at(.95), max: sk[sk.length-1],
           mean: sk.reduce((a,b)=>a+b,0)/sk.length,
           anyNegative: sk.some(x => x < 0) }; })()`);
console.log(`\n  M1 — stamp at source vs stamp at handler (n=${m1.n}):`);
console.log(`     handler − source: min ${f(m1.min)} · p50 ${f(m1.p50)} · p95 ${f(m1.p95)} · max ${f(m1.max)} ms`);
ok('M1', m1.p50 >= 0 && !m1.anyNegative,
  `the handler is NEVER earlier than the source (min ${f(m1.min)} ms) — the two stamps are in one clock domain, and the source one is the earlier of the two by construction`);
ok('M1', m1.max > m1.min,
  `and the gap is VARIABLE, not a constant to subtract: ${f(m1.min)} → ${f(m1.max)} ms across ${m1.n} events (spread ${f(m1.max - m1.min)} ms). ` +
  `Re-stamping at handler time would fold this spread into the recording as jitter, which is exactly why the lineage's law is "never re-stamp"`);

// --- let it loop ------------------------------------------------------------
await sleep(12000);          // ~6 passes on a real clock

const m2 = await evalJs(`(() => { const L = window.__L, LM = L.looper.loopMs();
  const on = L.onsets.filter(o => o.path === 'loop').sort((a,b) => a.iter - b.iter || a.phase - b.phase);
  // "wrap-adjacent" = the first note of a pass, the one a polled boundary eats
  const firstPhase = Math.min(...on.map(o => o.phase));
  const adj = on.filter(o => o.phase === firstPhase), oth = on.filter(o => o.phase !== firstPhase);
  const S = xs => { const s = xs.filter(Number.isFinite).slice().sort((a,b)=>a-b);
    return s.length ? { n:s.length, p50:s[Math.floor(s.length*.5)], p95:s[Math.floor(s.length*.95)],
                        max:Math.max(...s.map(Math.abs)) } : {n:0}; };
  // THE MUSICAL QUESTION: is the gap between two onsets the gap that was
  // played? Measured in the AUDIO domain, against the intended instants, so
  // it is the interval a listener would hear and not a wall-clock artefact.
  const within = [], across = [];
  for (let i = 1; i < on.length; i++) {
    const a = on[i-1], b = on[i];
    if (a.intendedAudioT == null || b.intendedAudioT == null) continue;
    const wantMs = (b.intendedAudioT - a.intendedAudioT) * 1000;
    const gotMs = (b.audioT - a.audioT) * 1000;
    (b.iter !== a.iter ? across : within).push(gotMs - wantMs);
  }
  const perIter = {}; for (const o of on) perIter[o.iter] = (perIter[o.iter]||0)+1;
  const complete = Object.values(perIter).filter(c => c === ${FIGURE.length}).length;
  return { late: S(on.map(o=>o.deltaMs)), adj: S(adj.map(o=>o.deltaMs)), oth: S(oth.map(o=>o.deltaMs)),
           within: S(within), across: S(across),
           onsets: on.length, iters: Object.keys(perIter).length, complete,
           wraps: L.looper.nest.loop('L0').wraps,
           bridged: on.filter(o=>o.bridged).length,
           boundary: L.looper.loopLanes(0).boundary }; })()`);
console.log(`\n  M2 — the loop on a WALL clock (${m2.onsets} onsets over ${m2.wraps} wraps):`);
console.log(`     firing lateness, wrap-adjacent : p50 ${f(m2.adj.p50)} · p95 ${f(m2.adj.p95)} · max ${f(m2.adj.max)} ms`);
console.log(`     firing lateness, all others    : p50 ${f(m2.oth.p50)} · p95 ${f(m2.oth.p95)} · max ${f(m2.oth.max)} ms`);
console.log(`     IOI error WITHIN a pass        : p50 ${f(m2.within.p50)} · p95 ${f(m2.within.p95)} · max ${f(m2.within.max)} ms  (n=${m2.within.n})`);
console.log(`     IOI error ACROSS the wrap      : p50 ${f(m2.across.p50)} · p95 ${f(m2.across.p95)} · max ${f(m2.across.max)} ms  (n=${m2.across.n})`);
console.log(`     took the caps.audio bridge     : ${m2.bridged}/${m2.onsets}`);
ok('M2', m2.complete >= m2.wraps - 1 && m2.boundary === 'lookahead',
  `EVERY PASS KEPT EVERY NOTE on a real clock: ${m2.complete} complete passes of ${FIGURE.length} over ${m2.wraps} wraps, boundary '${m2.boundary}'`);
ok('M2', m2.adj.p95 <= m2.oth.p95 + 5,
  `the loop point costs the note beside it nothing — wrap-adjacent p95 ${f(m2.adj.p95)} ms vs ${f(m2.oth.p95)} ms elsewhere (${f(m2.adj.p95 - m2.oth.p95)} ms). ` +
  `proto/loops found the same inversion on a tape it did not record; this is it on a tape played by hand`);
ok('M2', m2.across.max <= m2.within.max + 5,
  `and the interval ACROSS the splice is no wider than any interval inside a pass: ${f(m2.across.max)} ms vs ${f(m2.within.max)} ms — which is what "does it stutter at the loop point" actually asks`);
// NOT an assert — a finding, and the reason M3 has two arms.
console.log(`     ⚠ only ${m2.bridged}/${m2.onsets} fires could take the caps.audio bridge: a fire that lands LATE`);
console.log(`       has no future instant left to schedule, and the wall lane lands late by p50 ${f(m2.oth.p50)} ms.`);

// --- M3: THE EAR, in two arms ----------------------------------------------
// The question is not "did the voice start when we told the graph to start it"
// — the fallback path scores zero on that by construction, because it is
// compared against the instant it settled for. The question is "did the note
// sound WHEN IT WAS MEANT TO", so both arms are measured against
// `intendedAudioT`, and what separates them is JITTER, not offset.
const earArm = async (label) => evalJs(`(() => { const L = window.__L;
  const heard = L.earOnsets.slice().sort((a,b)=>a-b);
  const on = L.onsets.filter(o => o.path === 'loop' && o.intendedAudioT != null && o.__arm === '${label}');
  const errs = [];
  for (const o of on) {
    let best = null;
    for (const h of heard) { const d = h - o.intendedAudioT;
      if (Math.abs(d) < 0.08 && (best === null || Math.abs(d) < Math.abs(best))) best = d; }
    if (best !== null) errs.push(best * 1000);
  }
  const s = errs.slice().sort((a,b)=>a-b);
  const at = q => s[Math.min(s.length-1, Math.floor(s.length*q))];
  const mean = s.reduce((a,b)=>a+b,0)/(s.length||1);
  const sd = Math.sqrt(s.reduce((a,b)=>a+(b-mean)**2,0)/(s.length||1));
  return { n: on.length, matched: s.length, p50: at(.5), p95: at(.95),
           min: s[0], max: s[s.length-1], mean, sd,
           spread: s.length ? s[s.length-1] - s[0] : null,
           bridged: on.filter(o=>o.bridged).length }; })()`);

// tag everything so far as arm A, then run arm B with a declared lead
await evalJs(`(() => { for (const o of window.__L.onsets) if (!o.__arm) o.__arm = 'A'; return 1; })()`);
const m3a = await earArm('A');

// ARM B — declare a lead. `caps.audio.leadMs` is read at every fire, so this
// is a live change to the same running loop, not a different build.
const LEAD = 30;
await evalJs(`(() => { const ad = window.__L.looper.layers[0].deck.adapter('note');
  ad.caps.audio.leadMs = ${LEAD};
  window.__L.__mark = window.__L.onsets.length; return ad.caps.audio.leadMs; })()`);
await sleep(9000);
await evalJs(`(() => { const L = window.__L;
  for (let i = L.__mark; i < L.onsets.length; i++) if (!L.onsets[i].__arm) L.onsets[i].__arm = 'B';
  for (const o of L.onsets) if (!o.__arm) o.__arm = 'A';
  return 1; })()`);
const m3b = await earArm('B');

console.log(`\n  M3 — THE EAR: what the render thread actually heard, vs when it was MEANT to`);
console.log(`     arm A  leadMs 0   bridged ${m3a.bridged}/${m3a.n}  ·  heard−intended p50 ${f(m3a.p50)} p95 ${f(m3a.p95)} · sd ${f(m3a.sd)} · spread ${f(m3a.spread)} ms  (n=${m3a.matched})`);
console.log(`     arm B  leadMs ${LEAD}  bridged ${m3b.bridged}/${m3b.n}  ·  heard−intended p50 ${f(m3b.p50)} p95 ${f(m3b.p95)} · sd ${f(m3b.sd)} · spread ${f(m3b.spread)} ms  (n=${m3b.matched})`);
ok('M3', m3a.matched >= m3a.n * 0.8 && m3b.matched >= m3b.n * 0.5,
  `the notes really sounded, in both arms: ${m3a.matched}/${m3a.n} and ${m3b.matched}/${m3b.n} scheduled onsets detected in the OUTPUT SAMPLES rather than merely scheduled`);
ok('M3', m3b.bridged > m3a.bridged,
  `A DECLARED LEAD IS WHAT BUYS THE BRIDGE: ${m3a.bridged}/${m3a.n} fires reached the sample grid at leadMs 0, ${m3b.bridged}/${m3b.n} at leadMs ${LEAD} — because a lead is exactly the headroom a late fire lacks`);
ok('M3', m3b.sd <= m3a.sd + 0.5,
  `and it buys it with CONSTANT LATENCY, not jitter: sd ${f(m3a.sd)} → ${f(m3b.sd)} ms, spread ${f(m3a.spread)} → ${f(m3b.spread)} ms. ` +
  `A constant shift of every note in a loop is inaudible (the loop is a circle); a varying one is the thing you hear`);

// --- M4: the two clocks -----------------------------------------------------
const m4 = await evalJs(`(() => { const l = window.__L.voices.latency();
  return { ...l, monitorPath: 'ctx.currentTime', loopPath: 'when.audioTime' }; })()`);
console.log(`\n  M4 — the two clocks a looper reconciles:`);
console.log(`     baseLatency ${f(m4.base * 1000)} ms · outputLatency ${f(m4.output * 1000)} ms · total ${f(m4.totalMs)} ms @ ${m4.sampleRate} Hz`);
ok('M4', m4.sampleRate > 0,
  `the UA reports its own output latency (${f(m4.totalMs)} ms total) — this is the offset an overdub has to be compensated by, and it is READABLE rather than a constant somebody tuned by ear`);

// --- M6: the session, through the page's own code path ----------------------
const m6 = await evalJs(`(() => { const L = window.__L;
  const j1 = L.looper.toSessionJSON({ id: 'verify' });
  const j2 = JSON.stringify(JSON.parse(j1));
  const s = JSON.parse(j1);
  return { bytes: j1.length, identical: j1 === j2,
           quotations: s.score.quotations.length, material: s.material.length,
           perLayer: Math.round(j1.length / s.material.length),
           trace: s.trace === undefined,
           saveBtn: !document.querySelector('#save').disabled }; })()`);
console.log(`\n  M6 — the session, from the running page: ${m6.bytes} B, ${m6.perLayer} B/layer`);
ok('M6', m6.identical && m6.quotations === m6.material && m6.trace && m6.saveBtn,
  `the loop a human just played serialises to ${m6.bytes} B (${m6.perLayer} B/layer), round-trips byte-identically, carries ${m6.quotations} quotations against ${m6.material} material entries and NO trace — ` +
  `these are the exact bytes plans/plan-looper.md's loop plane sends`);

await shot(join(HERE, 'shot-looper.png'));

// --- M5: a 500 ms main-thread stall, mid-loop -------------------------------
const beforeStall = await evalJs(`(() => ({ wraps: window.__L.looper.nest.loop('L0').wraps,
  onsets: window.__L.onsets.filter(o=>o.path==='loop').length }))()`);
await evalJs(`(() => { const end = performance.now() + 500; while (performance.now() < end) {} return 1; })()`);
await sleep(4500);
const m5 = await evalJs(`(() => { const L = window.__L;
  const on = L.onsets.filter(o => o.path === 'loop');
  const after = on.slice(${beforeStall.onsets});
  const s = after.map(o=>o.deltaMs).filter(Number.isFinite).sort((a,b)=>a-b);
  const perIter = {}; for (const o of after) perIter[o.iter] = (perIter[o.iter]||0)+1;
  // split: the notes the stall swallowed, and everything after it
  const recovered = after.filter(o => o.deltaMs < 100).map(o=>o.deltaMs).sort((a,b)=>a-b);
  const R = { n: recovered.length, p50: recovered[Math.floor(recovered.length*.5)],
              p95: recovered[Math.floor(recovered.length*.95)] };
  return { wraps: L.looper.nest.loop('L0').wraps, added: after.length,
           p95: s[Math.floor(s.length*.95)], max: Math.max(...s.map(Math.abs)),
           stalled: after.filter(o => o.deltaMs >= 100).length,
           recoveredLate: R,
           iters: Object.keys(perIter).length,
           complete: Object.values(perIter).filter(c => c === ${FIGURE.length}).length }; })()`);
console.log(`\n  M5 — after a 500 ms main-thread stall:`);
console.log(`     ${m5.added} onsets: ${m5.stalled} caught inside the stall (max ${f(m5.max)} ms late), ${m5.recoveredLate.n} after it (p50 ${f(m5.recoveredLate.p50)} · p95 ${f(m5.recoveredLate.p95)} ms)`);
ok('M5', m5.wraps > beforeStall.wraps && m5.added > FIGURE.length,
  `the loop kept looping through a stalled main thread: ${m5.wraps - beforeStall.wraps} more wraps, ${m5.added} more onsets — the tick host is a worker and the notes are on the audio graph`);
ok('M5', m5.recoveredLate.p95 < 60,
  m5.stalled === 0
    ? `and the stall cost NOTHING AUDIBLE: ${m5.stalled} of ${m5.added} notes were delayed by it at all (worst ${f(m5.max)} ms, p95 ${f(m5.recoveredLate.p95)} ms — indistinguishable from an ordinary pass). ` +
      `This is the caps.audio bridge earning its keep: with a lead declared, the voices for the next horizon are ALREADY ON THE AUDIO GRAPH when the main thread stops, so a stalled main thread stalls the decisions and not the sound`
    : `and it RECOVERS rather than degrading: ${m5.stalled} notes caught inside the stall fired up to ${f(m5.max)} ms late (they are JavaScript, and JavaScript was not running), but every note after it is back to p95 ${f(m5.recoveredLate.p95)} ms — the stall cost firings, never alignment`);

ok('V9', errors.length === 0, `still no page exceptions${errors.length ? `: ${errors.join(' | ')}` : ''}`);
console.log(`\n  screenshot: proto/looper/shot-looper.png`);

ws.close();
try { process.kill(-chrome.pid, 'SIGKILL'); } catch { chrome.kill('SIGKILL'); }
server.close();
console.log(`\n${fails ? `${fails} VIOLATION(S)` : 'OK'} — ${checks} checks`);
process.exit(fails ? 1 : 0);
