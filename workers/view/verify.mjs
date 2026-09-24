// verify.mjs — ONE headless Chrome at 390x844 with touch emulation, against
// the DEPLOYED worker (not a local server). Raw CDP over node's global
// WebSocket, no deps — the house harness style (proto/megatimeline/autotest.mjs).
//
// Per page: loads, zero console errors, zero horizontal overflow, and the
// page's own proof-of-data. Reads /api/stats before and after so the exact
// number of upstream ERR calls the whole run cost is a measured number, not a
// claim.

import { spawn } from 'node:child_process';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The row count comes from the manifest, not from a number typed here: this
// file has now been stale twice (four cards when there were five, 23 rows when
// there were 25), each time reporting green against a page it had stopped
// describing. A generated list deserves a generated assert.
const { DEMOS, NOTES } = await import(new URL('../../demo/manifest.mjs', import.meta.url));

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.VIEW_BASE || 'https://positron.studio';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
// ⚠️ BOTH OF THESE WERE FIXED AND BOTH ARE THE SAME RULE. A constant CDP port
// attaches to whatever browser is already on it — another agent's, or the
// previous run's — and a constant profile is a lock two runs fight over. The
// path this PROFILE held was a dead session's scratchpad that no longer exists
// on disk; Chrome creates whatever it is handed, so nothing ever said so.
const PORT = 0;                       // pick one, read it back from the profile
const PROFILE = `/private/tmp/claude-501/view-chrome-profile-${process.pid}`;
const SHOTS = join(HERE, 'shots');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
const asserts = { pass: 0, fail: 0 };
function ok(page, name, cond, detail = '') {
  (cond ? asserts.pass++ : asserts.fail++);
  results.push({ page, name, ok: !!cond, detail: String(detail).slice(0, 300) });
  console.log(`  ${cond ? 'ok  ' : 'FAIL'}  ${page} · ${name}${detail ? '  — ' + String(detail).slice(0, 160) : ''}`);
}

const statsBefore = await (await fetch(BASE + '/api/stats')).json();

// ── chrome ──────────────────────────────────────────────────────────────────
await mkdir(SHOTS, { recursive: true });
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu',
  '--autoplay-policy=no-user-gesture-required',
  '--use-fake-ui-for-media-stream', '--mute-audio',
], { stdio: ['ignore', 'pipe', 'pipe'] });
chrome.stderr.on('data', () => {});

// The port Chrome ACTUALLY took, read out of our own profile — never guessed.
let wsUrl = null, cdpPort = null;
for (let i = 0; i < 60 && !wsUrl; i++) {
  await sleep(250);
  try {
    if (!cdpPort) cdpPort = Number((await readFile(`${PROFILE}/DevToolsActivePort`, 'utf8')).split('\n')[0]);
    if (!Number.isFinite(cdpPort) || !cdpPort) { cdpPort = null; continue; }
    wsUrl = (await (await fetch(`http://127.0.0.1:${cdpPort}/json/version`)).json()).webSocketDebuggerUrl;
  } catch {}
}
if (!wsUrl) { chrome.kill(); throw new Error('chrome did not come up'); }

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
  } else if (m.method) {
    for (const fn of listeners) fn(m);
  }
};
const send = (method, params = {}, sessionId) =>
  new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    setTimeout(() => { if (pending.delete(id)) reject(new Error('cdp timeout: ' + method)); }, 45000);
  });

// ── one tab, reused for every page ──────────────────────────────────────────
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const S = (m, p) => send(m, p, sessionId);

await S('Page.enable'); await S('Runtime.enable'); await S('Log.enable'); await S('Network.enable');

// 390x844 = iPhone 14/15/16 CSS viewport, the size the mobile pass measured at
await S('Emulation.setDeviceMetricsOverride', {
  width: 390, height: 844, deviceScaleFactor: 3, mobile: true,
  screenWidth: 390, screenHeight: 844,
});
await S('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
// each page asks `pointer: coarse` (not a width) to decide touch vs mouse UI —
// force it, or a headless Chrome gets the desktop branch at phone width
await S('Emulation.setEmulatedMedia', {
  features: [
    { name: 'pointer', value: 'coarse' }, { name: 'any-pointer', value: 'coarse' },
    { name: 'hover', value: 'none' }, { name: 'any-hover', value: 'none' },
  ],
});

let errors = [];
let netlog = [];
listeners.push((m) => {
  if (m.sessionId !== sessionId) return;
  if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails;
    errors.push('exception: ' + (d.exception?.description || d.text));
  } else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    errors.push('console.error: ' + m.params.args.map((a) => a.description ?? a.value).join(' '));
  } else if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
    errors.push(`log(${m.params.entry.source}): ${m.params.entry.text} ${m.params.entry.url ?? ''}`);
  } else if (m.method === 'Network.responseReceived') {
    netlog.push({ url: m.params.response.url, status: m.params.response.status, headers: m.params.response.headers });
  }
});

const evaluate = async (expr, awaitPromise = false) => {
  const r = await S('Runtime.evaluate', { expression: expr, awaitPromise, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};

async function goto(path, { settle = 2500 } = {}) {
  errors = []; netlog = [];
  await S('Page.navigate', { url: BASE + path });
  await new Promise((r) => {
    const off = (m) => { if (m.sessionId === sessionId && m.method === 'Page.loadEventFired') { r(); } };
    listeners.push(off);
    setTimeout(r, 25000);
  });
  await sleep(settle);
}

// documentElement.scrollWidth > clientWidth is the honest horizontal-overflow
// test; also name the widest offender so a failure is actionable
const OVERFLOW = `(() => {
  const de = document.documentElement;
  const over = de.scrollWidth - de.clientWidth;
  let worst = null;
  if (over > 1) {
    for (const el of document.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.right > de.clientWidth + 1 && (!worst || r.right > worst.right))
        worst = { tag: el.tagName + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''), right: Math.round(r.right) };
    }
  }
  return { scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, innerWidth: innerWidth, over, worst };
})()`;

async function shot(name) {
  const { data } = await S('Page.captureScreenshot', { format: 'png' });
  await writeFile(join(SHOTS, name + '.png'), Buffer.from(data, 'base64'));
}

// live.err.ee's edge answers some live segment requests 403/404 WITHOUT an
// access-control-allow-origin header, which the browser can only report as a
// CORS error. That is a property of ERR's live CDN seen from any origin that
// is not ERR's own, not of this deployment, and the only "fix" would be
// proxying live video through the Worker — exactly the media-shaped proxying
// this deployment refuses. Counted and named, never silently swallowed.
const isLiveEdge = (e) => e.includes('live.err.ee');

async function common(page) {
  const o = await evaluate(OVERFLOW);
  ok(page, 'no horizontal overflow', o.over <= 1, `scrollWidth ${o.scrollWidth} vs clientWidth ${o.clientWidth}${o.worst ? ' worst ' + o.worst.tag + ' @' + o.worst.right : ''}`);
  ok(page, 'viewport is 390x844', o.innerWidth === 390, `innerWidth ${o.innerWidth}`);
  const own = errors.filter((e) => !isLiveEdge(e));
  const upstreamErr = errors.filter(isLiveEdge);
  ok(page, 'zero page console errors', own.length === 0, own.slice(0, 3).join(' | '));
  if (upstreamErr.length) {
    results.push({ page, name: 'note: live.err.ee segment CORS/HTTP failures (upstream)', ok: true, detail: `${upstreamErr.length}× — ${upstreamErr[0].slice(0, 200)}` });
    console.log(`  note  ${page} · ${upstreamErr.length}× live.err.ee segment failure (ERR's CDN, not this deploy)`);
  }
  return o;
}

// ── 0. index menu ───────────────────────────────────────────────────────────
console.log('\n[0] index menu');
await goto('/', { settle: 600 });
// ⚠️ THE TAB IS `positron`, LOWER CASE, AND DELIBERATELY NOT THE NAME ON THE
// PAGE. `menu.html` carries `<title>positron</title>` and the `h1` carries
// `positron: <n> media art experiments`, counted at build time (2026-09-24).
// This asserted `POSITRON` while the tab read `positron: media art
// experiments`, so it was red on a correct page before this line was touched.
ok('index', 'served 200 html', await evaluate(`document.title`) === 'positron', await evaluate(`document.title`));
// The menu is the DEMO LIST, generated from demo/manifest.mjs. Assert what the
// generator promises: one row per manifest entry, and every LINKED row pointing
// at a real target. Deployed demos live at /<nn>-<name>/ — build.mjs strips the
// `demo/` prefix — so the old `/demo/` check could not have passed either.
const rows = await evaluate(`[...document.querySelectorAll('li.pos-row')].length`);
const links = await evaluate(`[...document.querySelectorAll('li.pos-row a[href]')].map(a => a.getAttribute('href'))`);
// Notes render as `li.pos-row` too, so the expected count is both lists — which
// is exactly the kind of detail a typed-in number gets wrong the first time.
ok('index', 'lists every demo and note row', rows === DEMOS.length + NOTES.length,
   `${rows} rows, manifest has ${DEMOS.length} demos + ${NOTES.length} notes`);
// 🔴 THE SLUG HAS NO NUMBER IN IT, AND THIS CHECK DEMANDED ONE. It tested
// `/^\/\d\d-[a-z]+\/$/` — the PRE-RENAME url shape. CLAUDE.md: *"A demo's
// identity is its slug and its ORDER is its position in `DEMOS` — there is no
// number in the directory, the URL, or the page."* So this assert could not
// pass and had not been passing: MEASURED 2026-09-14, **0 of 44 linked targets
// matched it while all 44 answered 200**. A permanently red assert is worse
// than no assert — it is the thing that teaches a reader a red run means
// nothing. Another rename that moved a URL living in a harness, which is the
// one place nothing type-checks.
//
// A demo row links `/<slug>/`, optionally carrying the `?xr=1` the index adds
// to scroll a headset page's Run control under your hand.
const linkOk = (h) => /^\/[a-z][a-z0-9-]*\/(?:\?[a-z0-9=&-]*)?$/.test(h)
  || h.startsWith('/proto/') || h.startsWith('/notes/');
ok('index', 'linked rows point at a demo, a proto or a note',
   links.length > 0 && links.every(linkOk),
   `${links.length} linked, ${links.filter((h) => !linkOk(h)).length} bad`
   + `${links.filter((h) => !linkOk(h)).length ? ': ' + links.filter((h) => !linkOk(h)).join(' ') : ''}`);
const tap = await evaluate(`(() => { const r = document.querySelector('li.pos-row a').getBoundingClientRect(); return Math.round(r.height); })()`);
ok('index', 'tap targets >= 44px', tap >= 44, `${tap}px`);
await common('index');
await shot('0-index');

// ── 1. megatimeline ─────────────────────────────────────────────────────────
console.log('\n[1] megatimeline');
await goto('/proto/megatimeline/', { settle: 1200 });
for (let i = 0; i < 40 && !(await evaluate('!!(window.__mt && window.__mt.ready)')); i++) await sleep(250);
ok('megatimeline', 'boot completed (__mt.ready)', await evaluate('!!(window.__mt && window.__mt.ready)'));
const census = await evaluate(`(() => { const s = window.__mt.S; return { years: s.census ? Object.keys(s.census.years).length : 0, audio: s.censusTotal.audio, video: s.censusTotal.video, photo: s.censusTotal.photo, max: s.censusMax.audio }; })()`);
ok('megatimeline', 'census.json loaded from /census.json', census.years > 100, `${census.years} years`);
ok('megatimeline', 'census totals non-zero', census.audio > 0 && census.video > 0 && census.photo > 0, `audio ${census.audio} video ${census.video} photo ${census.photo}`);
// census BARS: the field canvas must actually have ink on it, not just data
const ink = await evaluate(`(() => {
  const c = document.getElementById('field');
  const g = c.getContext('2d');
  const d = g.getImageData(0, 0, c.width, c.height).data;
  const seen = new Set(); let lit = 0;
  for (let i = 0; i < d.length; i += 4 * 97) {
    const k = (d[i] >> 4) + ',' + (d[i+1] >> 4) + ',' + (d[i+2] >> 4);
    seen.add(k); if (d[i] + d[i+1] + d[i+2] > 90) lit++;
  }
  return { w: c.width, h: c.height, distinctColors: seen.size, litSamples: lit };
})()`);
ok('megatimeline', 'census bars drawn on canvas', ink.distinctColors > 3 && ink.litSamples > 50, `${ink.w}x${ink.h}, ${ink.distinctColors} colours, ${ink.litSamples} lit samples`);
ok('megatimeline', 'touch help shown (pointer:coarse branch)', await evaluate(`getComputedStyle(document.getElementById('helpTouch')).display !== 'none'`));
ok('megatimeline', 'remixer hand-off is same-origin (no localhost)', !(await evaluate(`document.documentElement.innerHTML.includes('localhost:8891')`)));
ok('megatimeline', 'zero upstream ERR calls on load', (await evaluate('window.__mt.S.apiSearch + window.__mt.S.apiItem')) === 0, `apiSearch+apiItem = ${await evaluate('window.__mt.S.apiSearch + window.__mt.S.apiItem')}`);
await common('megatimeline');
await shot('1-megatimeline');

// dive into 1965 — the committed cache must absorb it (0 upstream)
await evaluate(`window.__mt.dive(1965)`, true).catch((e) => ok('megatimeline', 'dive callable', false, String(e)));
await sleep(1500);
const dived = await evaluate(`(() => { const s = window.__mt.S; let items = 0; for (const [, yd] of s.yearData) items += yd.items.length; return { tier: window.__mt.tier(), apiSearch: s.apiSearch, items }; })()`);
ok('megatimeline', 'dive loads items from committed cache', dived.items > 0, `tier ${dived.tier}, ${dived.items} items over ${dived.apiSearch} search calls`);
// The committed cache covers 1965 page 1 for the three types; a dive also asks
// for neighbouring years, which it does not have. The politeness claim is not
// "never goes upstream" — it is "nothing bypasses the gate and nothing is
// refused", so measure that, and report the split honestly.
const mtSearch = netlog.filter((n) => n.url.includes('/api/search'));
const mtCached = mtSearch.map((n) => n.headers['x-positron-cache']);
const nCached = mtCached.filter((c) => c !== 'miss').length;
ok('megatimeline', 'every dive search answered 200 (none gate-refused)',
  mtSearch.length > 0 && mtSearch.every((n) => n.status === 200),
  `${nCached}/${mtSearch.length} from cache, ${mtSearch.length - nCached} gated upstream`);
await shot('1b-megatimeline-1965');

// ── 2. remixer ──────────────────────────────────────────────────────────────
console.log('\n[2] remixer');
await goto('/proto/remixer/?trickle=0', { settle: 2500 });
ok('remixer', 'shared timeline lib loaded from /timeline/', await evaluate(`!!(window.__remix && window.__remix.S)`));
ok('remixer', 'hls.js loaded', await evaluate(`typeof Hls !== 'undefined'`));
// a real search down the page's own path, through the proxy
let searched = null;
try {
  await evaluate(`(async () => { await window.__remix.dialYear(1965); })()`, true);
} catch (e) { searched = String(e); }
await sleep(4000);
const searchResponses = netlog.filter((n) => n.url.includes('/api/search'));
ok('remixer', 'search round-trips through the proxy', searchResponses.length > 0 && searchResponses.every((r) => r.status === 200),
  searchResponses.map((r) => `${r.status} cache=${r.headers['x-positron-cache']} upstream=${r.headers['x-positron-upstream']}`).join(' | ') || 'no /api/search seen ' + (searched ?? ''));
const remixState = await evaluate(`(() => { const s = window.__remix.S; return { year: s.year, layers: window.__remix.layers().length, apiCalls: window.__remix.apiLog().length, errors: window.__remix.errors().length }; })()`);
ok('remixer', 'search produced state', remixState.apiCalls > 0, JSON.stringify(remixState));
await common('remixer');
await shot('2-remixer');

// ── 3. aikajana ─────────────────────────────────────────────────────────────
console.log('\n[3] aikajana');
await goto('/proto/aikajana/', { settle: 2500 });
const corpus = await evaluate(`(() => ({ items: (window.__corpus && window.__corpus.items || []).length, deck: !!window.__deck, lanes: document.querySelectorAll('.lane').length, rows: document.querySelectorAll('.it').length }))()`);
ok('aikajana', 'corpus.json loaded', corpus.items > 0, `${corpus.items} items`);
ok('aikajana', 'corpus rows rendered', corpus.lanes > 0 && corpus.rows > 0, `${corpus.lanes} lanes, ${corpus.rows} item blocks`);
ok('aikajana', 'timeline deck constructed (../../timeline resolved)', corpus.deck);
await common('aikajana');
await shot('3-aikajana');

// ── 4. flipper ──────────────────────────────────────────────────────────────
console.log('\n[4] flipper');
await goto('/proto/flipper/', { settle: 5000 });
const flip = await evaluate(`(() => ({ tiles: document.getElementById('tiles').children.length, hls: typeof Hls !== 'undefined', videos: document.querySelectorAll('video').length, ready: [...document.querySelectorAll('video')].filter(v => v.readyState > 0).length }))()`);
ok('flipper', 'hls.js loaded', flip.hls);
ok('flipper', 'channel tiles rendered', flip.tiles > 0, `${flip.tiles} tiles, ${flip.videos} video elements`);
ok('flipper', 'a live stream reached readyState>0', flip.ready > 0, `${flip.ready}/${flip.videos} ready`);
const icy = netlog.filter((n) => n.url.includes('/icy/'));
ok('flipper', 'icy stub answers 200 (no console noise)', icy.length === 0 || icy.every((r) => r.status === 200), icy.map((r) => r.status).join(',') || 'not requested');
await common('flipper');
await shot('4-flipper');

// ── verdict ─────────────────────────────────────────────────────────────────
const statsAfter = await (await fetch(BASE + '/api/stats')).json();
const upstreamCost = (statsAfter.upstreamTotal ?? 0) - (statsBefore.upstreamTotal ?? 0);
console.log(`\n──────── ${asserts.pass}/${asserts.pass + asserts.fail} asserts pass`);
console.log(`upstream ERR archive-API calls for this entire run: ${upstreamCost}`);
console.log('gate:', JSON.stringify(statsAfter));

await writeFile(join(HERE, 'verify-report.json'), JSON.stringify({
  base: BASE, at: new Date().toISOString(), asserts, upstreamCost,
  gateBefore: statsBefore, gateAfter: statsAfter, results,
}, null, 1));

try { await send('Target.closeTarget', { targetId }); } catch {}
ws.close(); chrome.kill();
await sleep(300);
process.exit(asserts.fail === 0 ? 0 : 1);
