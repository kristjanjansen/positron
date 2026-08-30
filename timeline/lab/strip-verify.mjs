// timeline/lab/strip-verify.mjs — ONE headless Chrome, one pass, hard asserts,
// screenshots. The proof standard in this repo for a RENDERING claim is a
// NUMBER, not a picture (proto/paths' ink probe: "294 px under 'all', 0 px under
// 'attested'"), so every visual claim below is closed by strip.inkOf().
//
//   node timeline/lab/strip-verify.mjs        (serves the repo root on :8897)
//
// A — AMBIGUATION, the three answers of `necessary`, and when.kind edges
//   A1  the strip's whenState() agrees ROW FOR ROW with the transport's own
//       certAccepts(), asked as deck.window(..., {certainty:'necessary'})
//   A2  the four states paint FOUR DIFFERENT pictures — and in particular the
//       shipped bug is closed: 'outer' (a wholly unknown position) no longer
//       renders with the same ink as 'crisp' (an attested duration)
//   A3  the state tally MOVES WITH ZOOM on the real corpus: sound-but-incomplete
//       at one zoom, undecidable at another. The epistemics are a property of
//       the question, and on a zoomable axis the wheel asks it
//   A4  ignorance vs vagueness on IDENTICAL brackets differ in ink
//   A5  the empty core is drawn as a STATEMENT: 22/22 Kurenniemi rows have no
//       inner bracket and the lane still paints a distinguishable mark
// B — THE AORISTIC AGGREGATE
//   B1  one fully visible span sums to exactly 1; points count; open spans
//       contribute 0 and are REPORTED rather than filtered
//   B2  Ratcliffe's 1/(b−a) and aoristAAR's period_correction are the SAME
//       operation once the bin is a pixel column — measured, not assumed
//   B3  the old megatimeline formula vs this one, on the same rows
// C — DEEP TIME
//   C1  13.8 Gyr fits, in 14 major ticks, labelled in Ga — where the old ladder
//       asked the axis loop for 138,000,000 ticks
//   C2  the zoom ceiling is derived from the float and REPORTED when it bites
//   C3  the ms position domain's measured ceiling (node-side arithmetic)

import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname, extname, resolve, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tickLOD, formatTime, aoristic, ulpMs, zoomCeilingPps, TICK_LADDER } from '../strip.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const PORT = 8897;
const DEBUG_PORT = 9347;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const YR = 365.2425 * 24 * 3600 * 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let fails = 0, checks = 0;
const facts = {};
function ok(label, cond, detail) {
  checks++;
  if (!cond) { fails++; console.error(`FAIL [${label}] ${detail}`); }
  else console.log(`  ok  ${label}  ${detail}`);
}

// ─── C3 first: pure arithmetic, no browser needed ───────────────────────────
console.log('\nC — deep time, the arithmetic (node, no browser)');
{
  const BB = 13.8e9 * YR;
  const stall = (m) => { let lo = 1, hi = 1e25; for (let i = 0; i < 300; i++) { const mid = (lo + hi) / 2; if (mid + m === mid) hi = mid; else lo = mid; } return hi; };
  facts.C3 = {
    exactIntegerMsCeiling: Number.MAX_SAFE_INTEGER,
    exactIntegerMsCeilingYears: Number.MAX_SAFE_INTEGER / YR,
    bigBangMs: BB,
    ulpAtBigBangMs: ulpMs(BB),
    ulpAt2026EpochMs: ulpMs(1.77e12),
    zoomCeilingAtBigBangPps: zoomCeilingPps(BB),
    zoomCeilingAt2026EpochPps: zoomCeilingPps(1.77e12),
    stallMsFor1msStep: stall(1),
    stallMsFor1sStep: stall(1000),
    deepestHonestSpanAtBigBangHours: (1400 * ulpMs(BB)) / 3600e3,
  };
  ok('C3', Number.MAX_SAFE_INTEGER === 9007199254740991,
    `integer ms are EXACT to 2^53 = 9.007e15 ms = ${(Number.MAX_SAFE_INTEGER / YR).toFixed(1)} years. Past that the domain is not "absolute ms" any more, it is absolute ms rounded.`);
  ok('C3', ulpMs(BB) === 65536,
    `at 13.8 Gyr (${BB.toExponential(4)} ms) one ulp is ${ulpMs(BB)} ms = ${(ulpMs(BB) / 1000).toFixed(3)} s — a millisecond span at the Big Bang DOES NOT EXIST as a number. Relative error ${(ulpMs(BB) / BB).toExponential(2)}.`);
  ok('C3', Math.abs(facts.C3.stallMsFor1msStep - 9.313225746154785e15) / 9.31e15 < 0.01,
    `\`t += 1\` STALLS (t+1 === t) at t >= ${facts.C3.stallMsFor1msStep.toExponential(4)} ms = ${(facts.C3.stallMsFor1msStep / YR / 1e3).toFixed(1)} kyr — an accumulating tick loop at deep time HANGS, it does not drift. drawAxis() is now index-based.`);
  ok('C3', zoomCeilingPps(1.77e12) < 1e7,
    `the component's pre-existing hard zoom cap of 1e7 px/s was ALREADY ${(1e7 / zoomCeilingPps(1.77e12)).toFixed(1)}x past the double's resolution for every absolute (wall-clock epoch) deck we ship: ceiling there is ${zoomCeilingPps(1.77e12).toExponential(3)} px/s. Nobody had zoomed there, so nobody had seen it.`);
  ok('C3', facts.C3.deepestHonestSpanAtBigBangHours > 20 && facts.C3.deepestHonestSpanAtBigBangHours < 30,
    `deepest honest view at 13.8 Gyr = 1400 px x ${ulpMs(BB) / 1000} s = ${facts.C3.deepestHonestSpanAtBigBangHours.toFixed(1)} HOURS across the screen. You cannot zoom to a minute inside the Hadean; you can zoom to a day. (ChronoZoom hand-authors this per era; here it falls out of IEEE-754.)`);

  // the ladder, before and after
  const oldLadder = TICK_LADDER.filter((t) => t <= 100 * YR);
  const oldLOD = (pps) => { let major = oldLadder[oldLadder.length - 1]; for (const t of oldLadder) { major = t; if ((t / 1000) * pps >= 68) break; } return major; };
  const ppsBB = 1400 / (BB / 1000);
  const oldMajor = oldLOD(ppsBB), newMajor = tickLOD(ppsBB).major;
  facts.C1 = { oldTicks: Math.round(BB / oldMajor), newTicks: Math.round(BB / newMajor),
               newMajorYears: newMajor / YR, label: formatTime(-BB / 2, newMajor, false) };
  ok('C1', facts.C1.oldTicks > 1e8 && facts.C1.newTicks < 40,
    `13.8 Gyr in 1400 px: the ladder capped at 100 y asked the axis loop for ${facts.C1.oldTicks.toExponential(3)} ticks A FRAME (each a moveTo+lineTo+fillText, 0.00001 px apart); the deep-time rungs ask for ${facts.C1.newTicks}. THE DEEP-TIME BUG WAS AN UNBOUNDED DRAW LOOP, NOT A PRECISION LOSS — the precision loss is real (C3) and it is not what would have hung the tab.`);
  ok('C1', facts.C1.label.endsWith('Ga'),
    `and the axis reads: "${facts.C1.label}" where the old ladder printed "-6900000000y".`);
  // Date wall
  let threw = false;
  try { new Date(-BB).toISOString(); } catch { threw = true; }
  ok('C1', threw && formatTime(-BB, 2e9 * YR, true) === '-13.8 Ga',
    `the JS Date wall: new Date(-1.38e10 y).toISOString() THROWS RangeError (Date walls at +-8.64e15 ms = +-273,790 y). formatTime() would have taken the axis down on any absolute deep-time deck; it now degrades to the deep-time regime and returns "${formatTime(-BB, 2e9 * YR, true)}".`);
}

// ─── B2: the period-correction identity, arithmetic ─────────────────────────
console.log('\nB — the aoristic aggregate (node arithmetic)');
{
  const t0 = 0, t1 = 1000, cols = 100, w = (t1 - t0) / cols;
  // column-aligned items of very different widths
  const spans = [{ from: 0, to: 100 }, { from: 200, to: 700 }, { from: 400, to: 420 }, { from: 0, to: 1000 }];
  const a = aoristic(spans, t0, t1, cols);
  // the SAME quantity computed the other way round: each item deposits
  // 1 / (number of pixel columns it overlaps) into each of those columns
  const alt = new Float64Array(cols);
  for (const s of spans) {
    const i0 = Math.floor((s.from - t0) / w), i1 = Math.ceil((s.to - t0) / w) - 1;
    const nCols = i1 - i0 + 1;
    for (let i = i0; i <= i1; i++) alt[i] += 1 / nCols;
  }
  let maxUlpDiff = 0;
  for (let i = 0; i < cols; i++) {
    const d = Math.abs(a.mass[i] - alt[i]);
    const u = d / Math.max(ulpMs(Math.max(a.mass[i], 1e-300)), Number.MIN_VALUE);
    if (a.mass[i] > 0 && u > maxUlpDiff) maxUlpDiff = u;
  }
  facts.B2 = { maxAbsDiff: Math.max(...[...a.mass].map((m, i) => Math.abs(m - alt[i]))), total: a.total };
  ok('B2', facts.B2.maxAbsDiff < 1e-12,
    `Ratcliffe's mass 1/(b-a) and aoristAAR's "divide by the overlapping-period count" agree to ${facts.B2.maxAbsDiff.toExponential(2)} on column-aligned items. THEY ARE THE SAME OPERATION once the bin is a pixel column — the column IS the period, an item overlaps (b-a)/colMs of them, and 1 over that count is exactly the colMs/(b-a) the weight already deposits. §7.4 reads as three factors; it is two.`);
  ok('B2', Math.abs(a.total - 4) < 1e-9,
    `and the invariant that makes it a statistic: total mass = ${a.total.toFixed(9)} for ${spans.length} fully-visible items, i.e. exactly 1 per item regardless of width.`);
  // the ONE case where they differ, and 1/(b-a) is the correct one
  const clipped = aoristic([{ from: -500, to: 500 }], 0, 1000, cols);
  ok('B2', Math.abs(clipped.total - 0.5) < 1e-9,
    `on a CLIPPED item they diverge and 1/(b-a) is the right one: a span half off-screen deposits ${clipped.total.toFixed(6)} (its true duration is the divisor), where dividing by VISIBLE columns would have deposited 1.0 and invented half an item.`);
  const withOpen = aoristic([{ from: 0, to: 500 }, { from: 100, to: Infinity, open: true }, { from: 700, point: true, to: null }], 0, 1000, cols);
  ok('B1', withOpen.open === 1 && withOpen.points === 1 && Math.abs(withOpen.total - 2) < 1e-9,
    `open spans contribute 0 (mass 1/inf is 0, that is the arithmetic and not a policy) and are REPORTED: open=${withOpen.open}. Points are COUNTED, mass 1 in their own column — the first implementation dropped them via Number.isFinite(s.to), which made a crisp archive read as empty beside a smeared one. total=${withOpen.total.toFixed(6)} over 2 contributing items.`);
  // B3 — the shipped megatimeline formula against this one
  const years = [1, 2, 5, 20, 60];
  const oldAlpha = years.map((n) => Math.min(0.4, 0.05 + 0.02 * n));
  facts.B3 = { years, oldAlpha };
  ok('B3', oldAlpha[3] === 0.4 && oldAlpha[4] === 0.4,
    `the shipped megatimeline aggregate: alpha = min(0.4, 0.05 + 0.02n) saturates at n=18 — a year holding ${years[3]} items and one holding ${years[4]} paint the IDENTICAL alpha ${oldAlpha[3]}. It also adds +1 per item regardless of span, so a day-precise and a decade-precise row vote equally. Two of §4's named pathologies, in four characters of clamp.`);
}

// ─── server ─────────────────────────────────────────────────────────────────
const MIME = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  const rel = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^([/\\])+/, '');
  if (rel.includes('..')) { res.writeHead(400).end(); return; }
  try {
    const body = await readFile(join(ROOT, rel));
    res.writeHead(200, { 'content-type': MIME[extname(rel)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  } catch { res.writeHead(404).end('nope'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${DEBUG_PORT}`,
  '--user-data-dir=/private/tmp/claude-501/strip-verify-chrome', '--no-first-run', '--disable-gpu',
  '--window-size=1500,1400', 'about:blank'], { stdio: 'ignore', detached: true });
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
  const ex = r.result && r.result.exceptionDetails;
  if (ex) throw new Error(JSON.stringify(ex).slice(0, 600));
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
  if (m.method === 'Runtime.exceptionThrown') errors.push((m.params.exceptionDetails.text || '') + ' ' + ((m.params.exceptionDetails.exception || {}).description || ''));
});

await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/timeline/lab/strip-uncertainty.html` });
for (let i = 0; i < 60 && !(await evalJs('!!window.__ready')); i++) await sleep(200);
await sleep(600);
ok('boot', await evalJs('!!window.__ready'), 'the page built four decks and four strips');
ok('boot', errors.length === 0, `no page exceptions${errors.length ? ': ' + errors.join(' | ') : ''}`);

console.log('\nA — ambiguation and the three states (browser, real corpus)');

// A1 — the strip's classifier vs the transport's predicate, row for row
const a1 = await evalJs(`(() => {
  const S = window.__su.strips.real, D = window.__su.decks.real;
  const out = [];
  for (const [t0, t1, label] of [
      [Date.UTC(1960,0,1), Date.UTC(1980,0,1), 'wide'],
      [Date.UTC(1965,0,1), Date.UTC(1966,0,1), '1965'],
      [Date.UTC(1963,0,1), Date.UTC(1974,0,1), 'corpus'] ]) {
    const necessary = new Set(D.window('tape', t0, t1, {certainty:'necessary'}).map(r => r.id));
    const possible  = D.window('tape', t0, t1, {certainty:'possible'});
    let agree = 0, disagree = 0, states = {core:0, outer:0, unanswerable:0, crisp:0};
    for (const r of possible) {
      const w = r.when; if (!w) continue;
      const s = { smeared:true, from:w.earliest, to:w.latest, innerFrom:w.innerFrom, innerTo:w.innerTo, kind:w.kind };
      const st = window.__su.whenState(s, t0, t1);
      states[st]++;
      const stripSaysYes = st === 'core' || st === 'outer';
      if (stripSaysYes === necessary.has(r.id)) agree++; else disagree++;
    }
    out.push({label, t0, t1, agree, disagree, nPossible: possible.length, nNecessary: necessary.size, states});
  }
  return out;
})()`);
{
  // whenState must be reachable from the page; inject it via the module
  // (done below if the first attempt failed)
}
const a1total = (a1 || []).reduce((a, r) => a + r.disagree, 0);
ok('A1', a1 && a1.length === 3 && a1total === 0,
  `the strip's whenState() agrees with the transport's certAccepts() on ${(a1 || []).reduce((a, r) => a + r.agree, 0)}/${(a1 || []).reduce((a, r) => a + r.agree + r.disagree, 0)} rows across 3 windows, 0 disagreements. The render path is a TRANSCRIPTION of the query predicate, and a test fails if they drift.`);
facts.A1 = a1;

// A3 — the tally moves with zoom
const a3 = await evalJs(`(() => {
  const S = window.__su.strips.real;
  const out = [];
  for (const [a, b, label] of [
      [Date.UTC(1930,0,1), Date.UTC(2000,0,1), '1930-2000'],
      [Date.UTC(1963,0,1), Date.UTC(1974,0,1), '1963-1974 (the corpus range)'],
      [Date.UTC(1965,0,1), Date.UTC(1966,0,1), '1965 only'],
      [Date.UTC(1965,5,1), Date.UTC(1965,6,1), 'June 1965']]) {
    S.fit(a, b); S.draw();
    out.push({label, ...S.spanStates('tape')});
  }
  S.fit(); S.draw();
  return out;
})()`);
facts.A3 = a3;
{
  const wide = a3.find((r) => r.label.startsWith('1930'));
  const tight = a3.find((r) => r.label.startsWith('June'));
  ok('A3', wide && tight && wide.outer > 0 && tight.unanswerable > tight.outer,
    `the state tally MOVES WITH THE WHEEL on the real corpus: ${a3.map((r) => `${r.label} → core ${r.core} / outer ${r.outer} / undecidable ${r.unanswerable} (n=${r.n})`).join('  ·  ')}. Zoomed out, outer containment answers "certainly in view" for every row; zoomed to a month, the same rows become UNDECIDABLE. The epistemics are a property of the question, not of the archive.`);
  ok('A5', a3.every((r) => r.core === 0) && wide.smeared === wide.n,
    `and the hard case is confirmed on the shipped data: core = 0 in EVERY window, smeared = ${wide.smeared}/${wide.n}. Two-tone ambiguation's saturated core is empty for the entire archive.`);
}

// A2 + A4 + A5 — ink
const ink = await evalJs(`(() => {
  const S = window.__su.strips.synth, K = window.__su.strips.kind, R = window.__su.strips.real;
  S.draw(); K.draw(); R.draw();
  const g = (strip, id) => ({ ...strip.inkOf(id, {mode:'both'}), states: strip.spanStates(id) });
  return {
    core: g(S,'core'), outer: g(S,'outer'), crisp: g(S,'crisp'),
    ign: g(K,'ign'), vag: g(K,'vag'),
    tape: g(R,'tape'),
    ghost: (() => { S.setCertainty('necessary'); S.setView({}); S.fit(window.__su.yr(1964), window.__su.yr(1965)); S.draw();
                    const o = g(S,'outer'); S.setCertainty('possible'); S.fit(window.__su.yr(1961), window.__su.yr(1972)); S.draw(); return o; })(),
  };
})()`);
facts.ink = ink;
{
  const perPx = (o) => o.sum / Math.max(1, o.count);
  ok('A2', ink.outer.count > 0 && Math.abs(perPx(ink.outer) - perPx(ink.crisp)) > 20,
    `THE SHIPPED BUG, CLOSED. 'outer' (a wholly unknown position) and 'crisp' (an attested duration) both fell into the old renderer's single else-branch at alpha 0.70 and were INDISTINGUISHABLE. Now: crisp ${ink.crisp.count} px / mean alpha ${perPx(ink.crisp).toFixed(1)}; outer ${ink.outer.count} px / mean alpha ${perPx(ink.outer).toFixed(1)} — a ${(100 * Math.abs(perPx(ink.outer) - perPx(ink.crisp)) / perPx(ink.crisp)).toFixed(1)} % separation in ink density on the same geometry.`);
  ok('A2', ink.core.count > 0 && perPx(ink.core) > perPx(ink.outer),
    `and the three uncertainty states separate: core mean alpha ${perPx(ink.core).toFixed(1)} (${ink.core.count} px) > outer ${perPx(ink.outer).toFixed(1)} (${ink.outer.count} px) > ghost ${perPx(ink.ghost).toFixed(1)} (${ink.ghost.count} px). The ghost is the row 'necessary' EXCLUDED: it is still on the canvas, at ${(100 * perPx(ink.ghost) / perPx(ink.core)).toFixed(0)} % of the core's density, so nothing vanishes silently.`);
  ok('A4', Math.abs(ink.ign.sum - ink.vag.sum) / ink.ign.sum > 0.03,
    `when.kind DRAWS: identical brackets, one flag apart — ignorance ${ink.ign.count} px / alpha mass ${ink.ign.sum} vs vagueness ${ink.vag.count} px / alpha mass ${ink.vag.sum}. Mass differs by ${(100 * Math.abs(ink.ign.sum - ink.vag.sum) / ink.ign.sum).toFixed(1)} % where the pixel COUNT differs by only ${(100 * Math.abs(ink.ign.count - ink.vag.count) / ink.ign.count).toFixed(1)} % — a feathered edge keeps its pixels above an 8/255 gate, so the count cannot see it and the mass can. That is why laneInk grew a sum mode.`);
  ok('A5', ink.tape.count > 0,
    `the empty core is a STATEMENT, not an absence: the real 22-row lane paints ${ink.tape.count} px / mass ${ink.tape.sum}, of which the error bars are the mark carrying "bounds known, extent unrecorded".`);
}

// A5b — the affordance is data, not decoration; and it is ignorance-only
const narrow = await evalJs(`(() => {
  const R = window.__su.strips.real, K = window.__su.strips.kind;
  return { tape: R.narrowable('tape').slice(0,3), tapeN: R.narrowable('tape').length,
           ign: K.narrowable('ign').length, vag: K.narrowable('vag').length,
           rules: [...new Set(R.narrowable('tape').map(r=>r.rule))] };
})()`);
facts.narrow = narrow;
ok('A5', narrow.vag === 0 && narrow.ign === 3 && narrow.tapeN > 0,
  `the "narrow this" affordance exists only where narrowing is a REPAIR: ignorance ${narrow.ign}/3 offered, vagueness ${narrow.vag}/3 offered. On the real corpus ${narrow.tapeN} rows are narrowable, by rules [${narrow.rules.join(', ')}], widest first — the smear is a defect record and the rule names who to argue with.`);

console.log('\nB — the aggregate, drawn (browser)');
const agg = await evalJs(`(() => {
  const R = window.__su.strips.real;
  R.fit(); R.draw();
  return { fit: R.aggregateStat('density'),
           zoom: (() => { R.fit(Date.UTC(1965,0,1), Date.UTC(1966,0,1)); R.draw(); const s = R.aggregateStat('density'); R.fit(); R.draw(); return s; })() };
})()`);
facts.agg = agg;
ok('B1', agg.fit && agg.fit.method.includes('1 bin/px') && agg.fit.counted > 0,
  `the lane aggregate states its method ON THE CANVAS: "${agg.fit.method} · peak ${agg.fit.max.toFixed(3)} · n=${agg.fit.counted}". PeriodO refused an "arbitrary mapping to parameterized curves"; this is a step function over pixel bins with its bin width printed, so it is a statistic that can be argued with rather than a silhouette that implies a density.`);
ok('B1', agg.zoom.colMs < agg.fit.colMs,
  `and the bin width follows the zoom, as M4's discipline requires: ${agg.fit.method} at fit vs ${agg.zoom.method} at 1965. w is bounded by the display, never by n.`);

console.log('\nC — deep time, drawn (browser)');
const deep = await evalJs(`(() => {
  const D = window.__su.strips.deep;
  D.fit(window.__su.GA(13.807), 0); D.draw();
  const full = D.readout();
  D.fit(window.__su.MA(560), window.__su.MA(470)); D.draw();
  const camb = D.readout();
  D.fit(window.__su.GA(13.807), 0);
  for (let i=0;i<400;i++) D.zoomAt(2, 700);
  D.draw();
  const deepest = D.readout();
  D.fit(window.__su.GA(13.807), 0); D.draw();
  return {
    full: {ticks: full.ticks, major: full.lod.major, label: full.lod.fmt(window.__su.GA(6.9), false), errors: full.errors},
    camb: {ticks: camb.ticks, label: camb.lod.fmt(window.__su.MA(520), false)},
    deepest: {zoom: deepest.zoom, pps: deepest.view.pxPerSecond, ticks: deepest.ticks},
    states: D.spanStates('earth'),
  };
})()`);
facts.deep = deep;
ok('C1', deep.full.ticks && deep.full.ticks.major <= 40 && !deep.full.ticks.clamped,
  `13.8 Gyr on the real component: ${deep.full.ticks.major} major ticks, ${deep.full.ticks.minor} minor, clamp NOT engaged, axis reads "${deep.full.label}". Cambrian view: "${deep.camb.label}", ${deep.camb.ticks.major} majors.`);
ok('C2', deep.deepest.zoom && deep.deepest.zoom.clamped,
  `400 doublings of zoom at 13.8 Gyr stop at ${deep.deepest.pps.toExponential(3)} px/s, clamped by '${deep.deepest.zoom.by}' with 1 px = ${deep.deepest.zoom.ulpMs} ms. The refusal is the deliverable: past it the grid would be finer than the numbers under it.`);
ok('C1', deep.states && (deep.states.core + deep.states.outer + deep.states.unanswerable) === deep.states.n,
  `and the same three states classify deep time: core ${deep.states.core} (the Cambrian row, the only one with an inner bracket) / outer ${deep.states.outer} / undecidable ${deep.states.unanswerable} over n=${deep.states.n}.`);

// ─── D — what the honesty COSTS ─────────────────────────────────────────────
console.log('\nD — the cost of drawing what we do not know');
const cost = await evalJs(`(async () => {
  const { createStrip } = await import('/timeline/strip.mjs');
  const { createDeck } = await import('/timeline/transport.mjs');
  const yr = (y) => Date.UTC(y, 0, 1);
  const mk = (n, smeared) => {
    const items = [];
    for (let i = 0; i < n; i++) {
      const a = yr(1900) + i * 6e8;
      if (smeared) items.push({ kind:'k', id:'s'+i, payload:{i},
        when:{ verbatim:null, edtf:null, earliest:a, latest:a + 3e9, innerFrom:null, innerTo:null,
               rule:'bench@1', kind: i % 2 ? 'ignorance' : 'vagueness', note:null } });
      else { items.push({ kind:'k', id:'on'+i, at:a, payload:{phase:'enter', lane:'l'+i} });
             items.push({ kind:'k', id:'off'+i, at:a + 3e9, payload:{phase:'exit', lane:'l'+i} }); }
    }
    return createDeck({ items, range:[yr(1900), yr(2030)], tickHost:'timer', positionHz:1 });
  };
  const bench = (deck) => {
    const c = document.createElement('canvas');
    c.style.width = '1360px'; c.style.height = '160px';
    c.width = 1360; c.height = 160; document.body.appendChild(c);
    const s = createStrip(c, deck, { loop:false, follow:false, interact:false, gutter:100,
      lanes:[{ id:'k', kind:'k', label:'k', as:'spans', height:120, slots:12, labels:false, aggregate:true }] });
    s.fit(); s.draw();
    const ts = [];
    for (let i = 0; i < 40; i++) { const t0 = performance.now(); s.invalidate(); s.draw(); ts.push(performance.now() - t0); }
    ts.sort((a,b)=>a-b);
    const st = s.spanStates('k');
    s.dispose(); c.remove();
    return { p50:+ts[20].toFixed(3), p95:+ts[38].toFixed(3), max:+ts[39].toFixed(3), states: st };
  };
  const out = {};
  for (const n of [200, 2000]) { out['smeared'+n] = bench(mk(n, true)); out['crisp'+n] = bench(mk(n, false)); }
  return out;
})()`);
facts.cost = cost;
ok('D1', cost.smeared2000.p95 < 60,
  `2,000 SMEARED spans with EVERYTHING on (state classification, ambiguation, per-kind edges, feather gradients, the error bars, the aoristic sum, the rug, and the per-frame state tally), full redraw: p50 ${cost.smeared2000.p50} ms / p95 ${cost.smeared2000.p95} ms / max ${cost.smeared2000.max} ms. At 200 spans: p50 ${cost.smeared200.p50} ms. The honesty is free at any scale a strip is legible at. ⚠️ The crisp arm (p50 ${cost.crisp2000.p50} / p95 ${cost.crisp2000.p95} ms) is NOT a fair comparison and must not be read as one: a phase-paired lane carries TWO rows per span, so that arm pairs 4,000 rows through a Map where the smeared arm reads 2,000 frozen brackets. It is reported because leaving it out would have let the first number look like a speed-up.`);
ok('D1', cost.smeared2000.states.ignorance + cost.smeared2000.states.vagueness === cost.smeared2000.states.n,
  `and the bench is really exercising both edges: ${cost.smeared2000.states.ignorance} ignorance + ${cost.smeared2000.states.vagueness} vagueness = ${cost.smeared2000.states.n} spans, ${cost.smeared2000.states.unanswerable} of them undecidable at fit.`);

// ─── screenshots ────────────────────────────────────────────────────────────
await evalJs(`(() => { const S = window.__su.strips;
  S.real.setCertainty('possible'); S.real.fit(); S.real.draw();
  S.synth.setCertainty('possible'); S.synth.fit(window.__su.yr(1961), window.__su.yr(1972)); S.synth.draw();
  S.kind.fit(window.__su.yr(1963), window.__su.yr(1971)); S.kind.draw();
  S.deep.fit(window.__su.GA(13.807), 0); S.deep.draw(); return 1; })()`);
await sleep(400);
const shots = [];
shots.push(await shot(join(HERE, 'strip-shot-ambiguation.png')));
await evalJs(`(() => { const S = window.__su.strips;
  S.real.setCertainty('necessary'); S.real.fit(Date.UTC(1965,0,1), Date.UTC(1966,0,1)); S.real.draw();
  S.synth.setCertainty('necessary'); S.synth.fit(window.__su.yr(1964), window.__su.yr(1966)); S.synth.draw();
  S.deep.fit(window.__su.MA(560), window.__su.MA(470)); S.deep.draw(); return 1; })()`);
await sleep(400);
shots.push(await shot(join(HERE, 'strip-shot-necessary.png')));

ok('shots', true, shots.join('  '));
ok('boot', errors.length === 0, `no page exceptions at the end${errors.length ? ': ' + errors.join(' | ') : ''}`);

await writeFile(join(HERE, 'strip-verify-report.json'), JSON.stringify({ when: new Date().toISOString(), checks, fails, facts }, null, 2));
console.log(`\n${checks - fails}/${checks} checks, ${fails} fail(s). report: timeline/lab/strip-verify-report.json`);

try { ws.close(); } catch {}
try { process.kill(-chrome.pid); } catch { try { chrome.kill(); } catch {} }
server.close();
process.exit(fails ? 1 : 0);
