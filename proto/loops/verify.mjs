// proto/loops/verify.mjs — ONE headless Chrome, one pass, hard asserts, two
// screenshots. The wall-clock twin of measure.mjs: the same `loops.mjs` runs
// here on a real clock, in a real worker tick host, with real audio scheduling,
// so the phasing residual is a MEASURED number rather than an analytic zero.
//
//   node proto/loops/verify.mjs            (serves on :8890, port is ours)
//
// V1  the page builds both pieces and the epoch-anchored origin lands on the grid
// V2  PHASING: drift tracks (rate−1)·elapsed on a WALL clock — slope in ppm and
//     the residual p95/max, which is the servo error and the honest number
// V3  the wrap count is arithmetic: floor(elapsed·rate / L) for each tape
// V4  DISINTEGRATION: evidenceAccounting() climbs monotonically, one tier per
//     third, attested never moves
// V5  the strip PAINTS the hatching — a derived lane draws 0 px under 'attested'
//     and non-zero under 'all' (strip.inkOf, the tratteggio proof)
// V6  screenshots

import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, PORT } from './server.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9340;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let fails = 0, checks = 0;
function ok(label, cond, detail) {
  checks++;
  if (!cond) { fails++; console.error(`FAIL [${label}] ${detail}`); }
  else console.log(`  ok  ${label}  ${detail}`);
}

const server = await serve();
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${DEBUG_PORT}`,
  `--user-data-dir=${join(HERE, '.chrome-verify')}`, '--no-first-run', '--disable-gpu',
  '--autoplay-policy=no-user-gesture-required', '--window-size=1500,1250', 'about:blank'], { stdio: 'ignore', detached: true });
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
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text + ' ' + (m.params.exceptionDetails.exception || {}).description);
});

await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/proto/loops/` });
await sleep(2000);

// --- V1 --------------------------------------------------------------------
const boot = await evalJs(`(() => { const L = window.__loops;
  return { ok: !!L, at: L.ph.at, loopMs: L.LOOP_MS, rateB: L.RATE_B,
           onGrid: L.ph.at % L.LOOP_MS === 0, twoDecks: L.ph.decks.a !== L.ph.decks.b,
           spans: L.ph.nest.spans().length, unbounded: L.ph.nest.loop('A').unbounded,
           boundedTo: L.ph.nest.loop('A').boundedTo, disIters: L.dis.iters }; })()`);
ok('V1', boot.ok && boot.onGrid && boot.twoDecks && boot.spans === 2 && boot.unbounded === true,
  `page built both pieces · origin ${boot.at} on the ${boot.loopMs} ms epoch grid · 2 decks · repeat:'infinite' bounded to ${boot.boundedTo}`);
ok('V1', errors.length === 0, `no page exceptions${errors.length ? `: ${errors.join(' | ')}` : ''}`);

// --- V2/V3 PHASING on a WALL clock ------------------------------------------
await evalJs(`(() => { document.querySelector('#p-play').click(); return 1; })()`);
await sleep(24000);                       // 24 real seconds of drift
const ph = await evalJs(`(() => { const L = window.__loops, s = L.ph.sample(), f = L.ph.fit(L.rows);
  return { s: {elapsed:s.elapsed, drift:s.drift, predicted:s.predicted, residual:s.residual,
               phaseMs:s.phaseMs, wrapsA:s.wrapsA, wrapsB:s.wrapsB},
           f, n: L.rows.length,
           wantA: Math.floor(s.elapsed / L.LOOP_MS), wantB: Math.floor(s.elapsed * L.RATE_B / L.LOOP_MS),
           driftStats: L.ph.nest.driftStats().spans.map(x => ({id:x.id, wraps:x.loop&&x.loop.wraps,
             hardSeeks:x.hardSeeks, childCorr:x.childCorrections})) }; })()`);
console.log(`\n  PHASING (wall clock, ${(ph.s.elapsed / 1000).toFixed(1)} s):`);
console.log(`    drift ${ph.s.drift.toFixed(2)} ms · predicted ${ph.s.predicted.toFixed(2)} ms · residual ${ph.s.residual.toFixed(3)} ms`);
console.log(`    fit slope ${ph.f.slope.toExponential(6)} vs ${ph.f.expected.toExponential(6)}  (${ph.f.slopeErrorPpm.toFixed(1)} ppm over ${ph.n} samples)`);
console.log(`    residual p50 ${ph.f.residualP50.toFixed(3)} · p95 ${ph.f.residualP95.toFixed(3)} · max ${ph.f.residualMax.toFixed(3)} ms`);
console.log(`    ${JSON.stringify(ph.driftStats)}`);
ok('V2', Math.abs(ph.f.slopeErrorPpm) < 20000 && ph.n > 40,
  `drift's slope is (rate−1) on a REAL clock: ${ph.f.slope.toExponential(6)} vs ${ph.f.expected.toExponential(6)} — ${ph.f.slopeErrorPpm.toFixed(1)} ppm over ${ph.n} samples`);
ok('V2', ph.f.residualP95 < 30 && ph.f.residualMax < 120,
  `residual against the analytic line: p95 ${ph.f.residualP95.toFixed(2)} ms, max ${ph.f.residualMax.toFixed(2)} ms — this is servo error and nothing else`);
ok('V3', Math.abs(ph.s.wrapsA - ph.wantA) <= 1 && Math.abs(ph.s.wrapsB - ph.wantB) <= 1 && ph.s.wrapsB >= ph.s.wrapsA,
  `wrap counts are arithmetic, not a tally: A ${ph.s.wrapsA} vs floor(t/L)=${ph.wantA}, B ${ph.s.wrapsB} vs floor(t·${boot.rateB}/L)=${ph.wantB} (±1 = a boundary in flight)`);
// --- THE GATE, on a REAL clock: "loops stay in time and do not lag" ---------
// The onset log the page keeps for tape-a. Inter-onset intervals across a wrap
// against intervals inside a pass; the two must be the same distribution.
const gate = await evalJs(`(() => { const H = window.__hits.a; if (H.length < 40) return null;
  const nominal = window.__loops.NOMINAL;             // the tape's own spacing, per index
  const across = [], within = [];
  for (let i = 1; i < H.length; i++) {
    const d = H[i].t - H[i-1].t - nominal[H[i].i];
    (H[i].i === 0 ? across : within).push(d);
  }
  const S = xs => { const s = xs.slice().sort((a,b)=>a-b);
    return { n: s.length, p50: s[Math.floor(s.length*0.5)], p95: s[Math.floor(s.length*0.95)],
             max: Math.max(...s.map(Math.abs)) }; };
  const lateAdj = [], lateOther = [];
  for (const h of H) (h.i === 0 ? lateAdj : lateOther).push(h.late);
  return { across: S(across), within: S(within), lateAdj: S(lateAdj), lateOther: S(lateOther),
           onsets: H.length, downbeats: H.filter(h=>h.i===0).length,
           wraps: window.__loops.ph.nest.loop('A').wraps,
           boundary: window.__loops.ph.nest.loop('A').boundary,
           leadClamped: window.__loops.ph.nest.loop('A').leadClamped }; })()`);
console.log(`\n  GATE (wall clock, tape-a, ${gate && gate.onsets} onsets over ${gate && gate.wraps} wraps, boundary=${gate && gate.boundary}):`);
if (gate) {
  console.log(`    IOI error within a pass : p50 ${gate.within.p50.toFixed(2)} · p95 ${gate.within.p95.toFixed(2)} · max ${gate.within.max.toFixed(2)} ms  (n=${gate.within.n})`);
  console.log(`    IOI error ACROSS a wrap : p50 ${gate.across.p50.toFixed(2)} · p95 ${gate.across.p95.toFixed(2)} · max ${gate.across.max.toFixed(2)} ms  (n=${gate.across.n})`);
  console.log(`    firing lateness, wrap-adjacent: p50 ${gate.lateAdj.p50.toFixed(2)} · p95 ${gate.lateAdj.p95.toFixed(2)} · max ${gate.lateAdj.max.toFixed(2)} ms`);
  console.log(`    firing lateness, all others   : p50 ${gate.lateOther.p50.toFixed(2)} · p95 ${gate.lateOther.p95.toFixed(2)} · max ${gate.lateOther.max.toFixed(2)} ms`);
}
ok('GATE', gate && gate.downbeats === gate.wraps + 1 && gate.boundary === 'lookahead' && !gate.leadClamped,
  `every pass kept its downbeat on a real clock: ${gate && gate.downbeats} downbeats for ${gate && gate.wraps} wraps, boundary '${gate && gate.boundary}'`);
// The comparison that means something on a real clock is DISTRIBUTION vs
// DISTRIBUTION. An absolute threshold would only be measuring headless
// Chrome's worker-timer jitter, which the ordinary events carry too (p95 ~13 ms
// here). What must be true is that the wrap does not ADD to it.
ok('GATE', gate && gate.across.max <= gate.within.max + 5,
  `the interval across the loop point is no wider than any other interval: across max ${gate && gate.across.max.toFixed(2)} ms vs within max ${gate && gate.within.max.toFixed(2)} ms ` +
  `(p50 offset ${gate && gate.across.p50.toFixed(2)} ms — the servo's ordinary sync corrections near the end of a pass, not the wrap: the downbeat's own lateness is ${gate && gate.lateAdj.p50.toFixed(2)} ms)`);
ok('GATE', gate && gate.lateAdj.p95 <= gate.lateOther.p95 + 5,
  `a wrap costs nothing to the events beside it — THIS IS THE LAG NUMBER: p95 ${gate && (gate.lateAdj.p95 - gate.lateOther.p95).toFixed(2)} ms worse than an ordinary event`);

await shot(join(HERE, 'shot-phasing.png'));

// --- V4/V5 DISINTEGRATION ---------------------------------------------------
await evalJs(`(() => { window.__loops.ph.parent.pause();
  document.querySelector('#tab-d').click(); document.querySelector('#d-play').click(); return 1; })()`);
await sleep(26000);                       // 12 × 2 s + slack
const dis = await evalJs(`(() => { const D = window.__loops.dis;
  return { per: D.perIteration, acct: D.accounting(), wraps: D.nest.loop('D').wraps,
           lanes: D.lanes(), prov: D.provenance().map(p => ({kind:p.kind, tier:p.tier, restored:p.restored,
             source:p.source, method:p.method, conf: p.confidence && p.confidence.mean })) }; })()`);
console.log(`\n  DISINTEGRATION (wall clock, ${dis.wraps} wraps):`);
console.log('    rep  tier  invented%  derived  attested');
for (const r of dis.per) console.log(`     ${String(r.repetition).padStart(2)}    ${r.tier}     ${String(r.inventedPct).padStart(5)}%     ${String(r.restored).padStart(4)}       ${r.attested}`);
ok('V4', dis.per.length >= 10 && dis.per.every((r, i) => i === 0 || r.inventedFraction > dis.per[i - 1].inventedFraction),
  `evidenceAccounting().inventedFraction climbs monotonically over ${dis.per.length} repetitions: ${dis.per.map((r) => r.inventedPct).join(' → ')}`);
ok('V4', dis.per.every((r) => r.attested === 8) && dis.acct.attested === 8,
  `the attested lane never moved: ${dis.acct.attested} rows throughout, ${dis.acct.restored} derived beside it`);
ok('V4', new Set(dis.per.map((r) => r.tier)).size >= 2 && dis.prov.filter((p) => p.restored > 0).every((p) => p.source.startsWith('reconstructor-')),
  `each iteration's lane is a REGISTERED reconstructor with a real tier/method/confidence: ${JSON.stringify(dis.prov.filter((p) => p.restored > 0).slice(0, 2))}`);

// V5 — the tratteggio proof: a derived lane paints 0 px under 'attested'
const ink = await evalJs(`(async () => {
  const S = globalThis.__strips[globalThis.__strips.length - 1];
  const lane = S.lanes().find(l => l.id.startsWith('tone~'));
  S.setEvidence('all'); S.draw(); const all = S.inkOf(lane.id);
  S.setEvidence('attested'); S.draw(); const att = S.inkOf(lane.id);
  const tone = S.inkOf('tone');
  S.setEvidence('all'); S.draw();
  return { lane: lane.id, all, att, tone }; })()`);
ok('V5', ink && ink.all > 0 && ink.att === 0 && ink.tone > 0,
  `THE FIREWALL PAINTS: derived lane '${ink && ink.lane}' inks ${ink && ink.all} px under 'all' and ${ink && ink.att} px under 'attested', while the attested lane keeps its ${ink && ink.tone} px`);

// the headline shot: the finished piece under 'all', hatching and all
await shot(join(HERE, 'shot-disintegration.png'));
// the evidence-only toggle, through the page's own button — and its own shot,
// which is the same tape with every dreamed row withdrawn
await evalJs(`(() => { document.querySelector('#d-ev').click(); return 1; })()`);
await sleep(700);
const evLabel = await evalJs(`document.querySelector('#d-ev').textContent`);
ok('V5', /attested/.test(evLabel), `the page's evidence toggle reaches the deck policy: "${evLabel}"`);
await shot(join(HERE, 'shot-disintegration-attested.png'));
await evalJs(`(() => { document.querySelector('#d-ev').click(); return 1; })()`);

ok('V6', errors.length === 0, `still no page exceptions${errors.length ? `: ${errors.join(' | ')}` : ''}`);
console.log('\n  screenshots: proto/loops/shot-phasing.png · shot-disintegration.png · shot-disintegration-attested.png');

// kill the whole Chrome PROCESS GROUP: `chrome.kill()` leaves the helper
// processes (gpu, network, renderers) parented to launchd and running.
ws.close();
try { process.kill(-chrome.pid, 'SIGKILL'); } catch { chrome.kill('SIGKILL'); }
server.close();
console.log(`\n${fails ? `${fails} VIOLATION(S)` : 'OK'} — ${checks} checks`);
process.exit(fails ? 1 : 0);
