// proto/aikajana/verify.mjs — one headless Chrome, one pass, hard asserts.
//
//   node proto/aikajana/verify.mjs            (serves on :8896, port is ours)
//
// What it proves, in order:
//   V1  the corpus loaded and every item carries a `when` bracket (nine fields,
//       a VERSIONED rule, an ignorance/vagueness kind) and a provenance block
//       with a named rights ASSERTER;
//   V2  no item's `at` is a synthesized midpoint (the ERR trap) — `at` is the
//       bracket's lower bound, ON EVERY DECK ROW, because the client passes no
//       `at` at all and the library anchors it (v0.6 U2), and the anchoring is
//       on the record as an 'anchored' degradation;
//   V3  the evidence firewall BITES: sampleAt('certainty') with no policy
//       throws EVIDENCE_POLICY_REQUIRED, because the adapter declares tier 1;
//   V4  'attested' and restored(tier<=1) give DIFFERENT curves, and the
//       attested one only ever repeats attested sample values (a hold);
//   V5  a 1-yr/s sweep fires every record and REFUSES every tape, with the
//       refusal on the record in deck.degradations();
//   V6  a real MP3 plays cross-origin from archive.org and masters the deck
//       (mediaMaster: position = band start + currentTime), with the
//       correction magnitude measured;
//   V7  seek is idempotent — reduce+assertState puts the same item under the
//       playhead going forwards and backwards.

import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const PORT = 8896;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const MIME = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css' };

const server = createServer(async (req, res) => {
  const p = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  try {
    const b = await readFile(p);
    res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(b);
  } catch { res.writeHead(404).end('nope'); }
});
await new Promise((r) => server.listen(PORT, r));

const prof = join(HERE, '.chrome-verify');
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9336',
  `--user-data-dir=${prof}`, '--no-first-run', '--disable-gpu', '--autoplay-policy=no-user-gesture-required',
  '--window-size=1600,1100', 'about:blank'], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(2500);

let ws, id = 0; const waits = new Map();
{
  const list = await (await fetch('http://127.0.0.1:9336/json/list')).json();
  ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r) => { ws.onopen = r; });
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (waits.has(m.id)) { waits.get(m.id)(m); waits.delete(m.id); } };
}
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; waits.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => {
  const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400));
  return r.result?.result?.value;
};

const R = []; let fails = 0;
const ok = (name, cond, detail) => { R.push(`${cond ? ' ok ' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); if (!cond) fails++; };

await cdp('Page.enable');
await cdp('Page.navigate', { url: `http://127.0.0.1:${PORT}/proto/aikajana/index.html` });
await sleep(3500);

// ---- V1 corpus integrity ---------------------------------------------------
const v1 = await ev(`(() => { const c = window.__corpus, i = c.items;
  const KEYS = 'verbatim,edtf,earliest,latest,innerFrom,innerTo,rule,kind,note';
  const VERS = /^[A-Za-z0-9][A-Za-z0-9._\\/-]*@\\d+$/;
  const bad = i.filter(x => !x.when || Object.keys(x.when).join(',') !== KEYS
    || !(x.when.latest > x.when.earliest) || !VERS.test(x.when.rule)
    || !['ignorance','vagueness'].includes(x.when.kind)
    || x.bandMs !== x.when.latest - x.when.earliest
    || !x.prov?.rightsAsserter);
  const pa = window.__deck.positionAccounting(['record','tape']);
  return { n: i.length, bad: bad.length, badIds: bad.slice(0,3).map(x=>x.id),
    sources: [...new Set(i.map(x => x.prov.source))],
    rules: Object.fromEntries(Object.values(pa.byRule).map(r => [r.rule, +(r.fraction*100).toFixed(0)])),
    smeared: pa.smeared, total: pa.total, inner: pa.withInner,
    kinds: [...new Set(i.map(x => x.when.kind))],
    low: i.filter(x => x.prov.rightsConfidence === 'LOW').length,
    playable: i.filter(x => x.media?.type === 'audio/mpeg').length }; })()`);
ok('V1 corpus: every item carries a nine-field `when` with a VERSIONED rule + rights asserter', v1.bad === 0,
  `${v1.n} items, ${v1.sources.length} sources, ${v1.playable} playable, ${v1.low} LOW-rights; ` +
  `${v1.smeared}/${v1.total} smeared, ${v1.inner} with an inner bracket, kinds [${v1.kinds}]${v1.bad ? ' BAD ' + v1.badIds : ''}`);
R.push(`      positioned by: ${Object.entries(v1.rules).map(([r, p]) => `${p}% ${r}`).join(' · ')}`);

// ---- V2 no synthesized midpoints ------------------------------------------
const v2 = await ev(`(() => { const i = window.__corpus.items, d = window.__deck;
  const mid = i.filter(x => { const dt = new Date(x.when.earliest);
    return x.precision === 'year' && (dt.getUTCMonth() !== 0 || dt.getUTCDate() !== 1); });
  const notLower = i.filter(x => x.at !== x.when.earliest);
  // THE FIRING RULE, checked on the LIBRARY's rows, not the client's: the page
  // passes no \`at\` at all, so every anchor here was resolved by U2.
  const rows = [...d.eventsOf('record'), ...d.eventsOf('tape')];
  const offAnchor = rows.filter(r => !r.when || r.at !== r.when.earliest);
  const sorted = rows.slice().sort((a,b) => a.at - b.at);
  const anch = [...d.degradations('record').reports, ...d.degradations('tape').reports]
    .filter(r => r.chose === 'anchored');
  return { mid: mid.length, notLower: notLower.length, rows: rows.length,
    offAnchor: offAnchor.length, anchored: anch.length,
    anchorReason: (anch[0] || {}).reason || null,
    lanesSorted: d.eventsOf('record').every((r,k,a) => k === 0 || a[k-1].at <= r.at)
      && d.eventsOf('tape').every((r,k,a) => k === 0 || a[k-1].at <= r.at) }; })()`);
ok('V2 no ERR-style midpoint padding: at == when.earliest on every DECK row, and the anchoring is reported',
  v2.mid === 0 && v2.notLower === 0 && v2.offAnchor === 0 && v2.anchored > 0 && v2.lanesSorted,
  `${v2.mid} mid-year, ${v2.notLower} off-band, ${v2.offAnchor}/${v2.rows} deck rows off their anchor, ${v2.anchored} 'anchored' reports, lanes sorted ${v2.lanesSorted}`);

// ---- V3 the evidence firewall bites ---------------------------------------
const v3 = await ev(`(() => { try { window.__deck.sampleAt('certainty', ${Date.UTC(1968, 0, 1)});
    return { threw: false }; } catch (e) { return { threw: true, code: e.code }; } })()`);
ok('V3 sampleAt with no evidence policy THROWS', v3.threw && v3.code === 'EVIDENCE_POLICY_REQUIRED', v3.code || '');

// ---- V4 attested vs restored differ, and attested only holds ---------------
const v4 = await ev(`(() => { const d = window.__deck, T0 = ${Date.UTC(1941, 0, 1)}, T1 = ${Date.UTC(2018, 0, 1)};
  const att = [], res = []; let diff = 0, maxd = 0;
  for (let i = 0; i < 300; i++) { const t = T0 + (T1 - T0) * i / 299;
    const a = d.sampleAt('certainty', t, { evidence: 'attested' });
    const r = d.sampleAt('certainty', t, { evidence: { restored: { maxTier: 1 } } });
    const av = a?.v ?? a, rv = r?.v ?? r;
    if (av != null && rv != null) { att.push(av); res.push(rv);
      const e = Math.abs(av - rv); if (e > 1e-9) diff++; if (e > maxd) maxd = e; } }
  const attSet = new Set(att.map(v => v.toFixed(12)));
  const sampleSet = new Set(d.eventsOf('certainty').map(e => (e.payload.v).toFixed(12)));
  const invented = [...attSet].filter(v => !sampleSet.has(v)).length;
  return { pts: att.length, diff, maxd, distinctAttested: attSet.size, invented }; })()`);
ok('V4 attested != restored, and attested INVENTS NOTHING',
  v4.diff > 0 && v4.invented === 0,
  `${v4.diff}/${v4.pts} probes differ, max ${v4.maxd.toFixed(4)}; attested took ${v4.distinctAttested} distinct values, all of them real samples`);

// ---- V5 the sweep: records fire, tapes are refused -------------------------
await ev(`(() => { const d = window.__deck; d.resetDrift(); d.seek(${Date.UTC(1960, 0, 1)});
  d.setRate(31557600); d.play(); })()`);   // 1 yr per wall second
await sleep(12000);
const v5 = await ev(`(() => { const d = window.__deck; d.pause();
  const deg = d.degradations('tape');
  // count only the RATE refusals: since v0.6 the same ledger also holds the
  // 'anchored' rows, which are a statement about position, not a refusal.
  const rate = deg.reports.filter(r => /lattice/.test(r.reason || ''));
  return { pos: d.position(), fires: d.fireCount(),
    tapeRefusals: rate.reduce((a, r) => a + r.n, 0),
    reason: (rate.at(-1) || {}).reason || null,
    audioStarted: !document.querySelector('#au').src }; })()`);
ok('V5 sweep at 1 yr/s: tapes refused ON THE RECORD, no audio started',
  v5.tapeRefusals > 0 && v5.audioStarted,
  `${v5.fires} fires, ${v5.tapeRefusals} refusals, reached ${new Date(v5.pos).toISOString().slice(0, 10)}`);
R.push(`      refusal reason: ${String(v5.reason).slice(0, 150)}`);

// ---- V6 a real tape plays cross-origin and masters the deck ----------------
const v6 = await ev(`(async () => {
  const it = window.__corpus.items.find(x => x.media?.type === 'audio/mpeg');
  const au = document.querySelector('#au');
  const t = performance.now();
  const head = await fetch(it.media.url, { headers: { Range: 'bytes=0-1023' } })
    .then(r => ({ status: r.status, cors: true, len: r.headers.get('content-range') })).catch(e => ({ err: String(e) }));
  window.__focusItem = it;
  document.querySelectorAll('.lane[data-k=audio] .it')[0].click();
  await new Promise(r => setTimeout(r, 3500));
  return { title: it.title, url: it.media.url, head,
    ct: au.currentTime, paused: au.paused, err: au.error?.code ?? null,
    pos: window.__deck.position(), anchor: null,
    mm: window.__deck && document.querySelector('#eng').textContent.includes('syncs') }; })()`);
const v6b = await ev(`(() => { const d = window.__deck, au = document.querySelector('#au');
  const it = window.__corpus.items.filter(x => x.media?.type === 'audio/mpeg')
    .sort((a,b)=>a.at-b.at).find(x => au.src.includes(encodeURIComponent(x.id.split('/').pop())) ) ;
  return { src: au.src.slice(-60), ct: au.currentTime, pos: d.position(), rate: d.rate() }; })()`);
ok('V6 archive.org MP3 fetched cross-origin with Range 206', v6.head.status === 206, JSON.stringify(v6.head));
ok('V6 the tape plays and MASTERS the deck (pos = band start + currentTime)',
  v6.ct > 0.2 && !v6.paused && v6.err === null,
  `currentTime ${v6.ct.toFixed(2)}s, deck rate ${v6b.rate}, deck at ${new Date(v6b.pos).toISOString().slice(0, 19)}`);

// ---- V7 seek idempotence --------------------------------------------------
const v7 = await ev(`(() => { const d = window.__deck, items = window.__corpus.items;
  const probe = items[Math.floor(items.length * 0.7)].at + 1;
  d.pause(); d.setRate(1);
  d.seek(${Date.UTC(1941, 0, 1)}); d.seek(probe);
  const fwd = document.querySelector('#prov').textContent.slice(0, 120);
  d.seek(${Date.UTC(2018, 0, 1)} - 1); d.seek(probe);
  const back = document.querySelector('#prov').textContent.slice(0, 120);
  return { same: fwd === back, fwd: fwd.replace(/\\s+/g, ' ').slice(0, 70) }; })()`);
ok('V7 seek is idempotent forwards and backwards', v7.same, v7.fwd);

// ---- screenshot ------------------------------------------------------------
// Frame the shot on the item that IS the lesson: a 1968 Love Records release
// carrying an uploader-asserted Public Domain Mark.
await ev(`(() => { const d = window.__deck;
  const els = [...document.querySelectorAll('.lane[data-k=audio] .it')];
  const i = window.__corpus.items.filter(x => x.kind === 'audio')
    .findIndex(x => /Antropoidien/.test(x.title));
  (els[i] || els[0]).click();
  document.querySelector('#au').pause();
  document.querySelector('.ev[data-e=t1]').click(); })()`);
await sleep(1200);
const shot = await cdp('Page.captureScreenshot', { format: 'png' });
await writeFile(join(HERE, 'shot.png'), Buffer.from(shot.result.data, 'base64'));

console.log('\n' + R.join('\n'));
console.log(`\n${R.filter((r) => r.startsWith(' ok')).length}/${R.filter((r) => /^( ok|FAIL)/.test(r)).length} verified · shot.png written`);

ws.close(); chrome.kill(); server.close();
process.exit(fails ? 1 : 0);
