// demo/verify.mjs — drives every BUILT demo through the __demo contract.
//
//   node demo/verify.mjs            # all built demos
//   node demo/verify.mjs transport loops   # just these, by slug
//
// This file is what replaces the ~25 harness pages: it asserts on
// window.__demo, never on DOM ids, so it does not care how any page is built.
// Raw CDP over node's global WebSocket, no deps — house harness style.

import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { serve, PORT as HTTP_PORT } from './server.mjs';
import { DEMOS } from './manifest.mjs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const CDP_PORT = 9333;
const PROFILE = '/private/tmp/claude-501/demo-verify-udd';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const want = process.argv.slice(2);
// ⚠️ A `gl: true` DEMO IS NOT THIS HARNESS'S SUBJECT, AND FAILING IT HERE WOULD
// BE A LIE. This file launches Chrome with `--disable-gpu` (see the flags
// below), where `getContext('webgl2')` returns null — so a visual demo reports
// `__demo.ready` false and the suite goes red for a page that is perfectly
// fine. Hand them to demo/verify-gl.mjs and SAY SO, rather than counting a
// subject this harness cannot reach as a failure.
const all = DEMOS.filter((d) => d.built && (!want.length || want.includes(d.name)));
const handedOff = all.filter((d) => d.gl);
const targets = all.filter((d) => !d.gl);
if (handedOff.length) {
  const n = handedOff.length;
  console.log(`(${handedOff.map((d) => d.name).join(', ')} ${n === 1 ? 'needs' : 'need'} a GPU — this harness runs --disable-gpu; use node demo/verify-gl.mjs)`);
}
if (!targets.length) { console.error('nothing for this harness to verify'); process.exit(handedOff.length ? 0 : 1); }

// DEMO_BASE=https://positron.studio node demo/verify.mjs  -> verify the DEPLOY
const server = process.env.DEMO_BASE ? null : await serve(HTTP_PORT);
// The port ACTUALLY bound, which may not be the one asked for — see
// serve()'s comment about a dev server already holding it.
const BASE = process.env.DEMO_BASE || `http://127.0.0.1:${server.address().port}`;
// (`server` is null only when DEMO_BASE is set, and then it is not read.)
console.log(`base ${BASE}`);

// EMPTY CACHE EVERY RUN. A media element loading `video.src = <m3u8>` stores a
// no-cors (opaque) entry for that URL; when a demo later switches to hls.js,
// its XHR for the SAME url is served from that entry and rejected as a CORS
// failure — on a URL that answers 200 with `access-control-allow-origin: *`.
// Two demos read red for exactly that reason and nothing in the page was wrong.
await rm(`${PROFILE}/Default/Cache`, { recursive: true, force: true }).catch(() => {});

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
let abortedReqs = [];
let edgeMisses = [];   // LL-HLS live-edge part 404s: expected churn, capped
// Upstream refusals a demo asks for ON PURPOSE — today that is ERR's
// rights-blocked segments, which `flipper` sweeps for. Counted and capped,
// never ignored: the label has to name what they are, or the next reader
// believes a refusal was a radio station.
//
// The WHEP single-track branch below is kept but has no caller since `tracks`
// was removed on 2026-09-08. Cloudflare still refuses such an offer, so the
// allowance stays correct for whatever asks next.
let probed = [];
const reqUrl = new Map();   // requestId -> url, so a failure can be attributed
listeners.push((m) => {
  if (m.sessionId !== sessionId) return;
  if (m.method === 'Network.requestWillBeSent') reqUrl.set(m.params.requestId, m.params.request?.url || '');
  if (m.method === 'Runtime.exceptionThrown') {
    errors.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text);
  }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    errors.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
  }
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
    const e = m.params.entry;
    // A 404 on an LL-HLS PART is normal at the live edge — players request
    // parts as they are born and hls.js retries; src/low-latency-player.js
    // says so where it sets fragLoadingMaxRetry. Same treatment as
    // ERR_ABORTED above: recorded separately, NOT ignored. The assert below
    // still fails past a ceiling, because silence here would hide a real
    // outage as "normal churn".
    if (/seg_\d+_part|_part_all\.mp4|\.m4s(\?|$)/.test(e.url || '') && /\b404\b/.test(e.text || '')) {
      edgeMisses.push(e.url);
    } else if (/webRTC\/play/.test(e.url || '') && /\b400\b/.test(e.text || '')) {
      // Cloudflare WHEP refuses a single-track offer with a 400, both ways.
      // `tracks` used to assert on that refusal; it is gone, so nothing sends
      // one today. Kept because the fact has not changed and the next page to
      // probe it should not read as broken. Capped like the others.
      probed.push(e.url);
    } else if (/live\.err\.ee/.test(`${e.url || ''} ${e.text || ''}`)
               && /\b403\b|CORS|ERR_FAILED/.test(e.text || '')) {
      // ERR refuses segments by PROGRAMME rights — 403 with no ACAO, so the
      // browser reports CORS. 19 flipper probes for this deliberately and says
      // in its readout how much was refused, so the requests are expected.
      // Capped, not ignored: past the ceiling this is an outage, not rights.
      probed.push(e.url);
    } else errors.push(e.text);
  }
  if (m.method === 'Network.loadingFailed') {
    // ERR_ABORTED is what a media element's in-flight segment requests do
    // when the page unloads — it means WE navigated, not that the page
    // failed. Every page that plays media produces these on teardown, so
    // counting them made a working demo look broken. Recorded separately
    // rather than ignored.
    const url = reqUrl.get(m.params.requestId) || '';
    if (m.params.errorText === 'net::ERR_ABORTED') abortedReqs.push(m.params.errorText);
    else if (m.params.corsErrorStatus && /live\.err\.ee/.test(url)) probed.push(url);
    else failedReqs.push(`${m.params.errorText}${url ? ` ${url.slice(0, 70)}` : ''}`);
  }
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
  console.log(`\n[${t.name}]`);
  errors = []; failedReqs = []; abortedReqs = []; edgeMisses = []; probed = []; reqUrl.clear();
  // DEMO_QUERY appends to every page, so a BRANCH can be verified rather than
  // only the default. Added when moq's publisher started PROBING for a codec:
  // the probe picks AV1, every recorded MoQ number was taken on VP8, and a
  // fallback the harness cannot select is a fallback nobody has run.
  //   DEMO_QUERY='codec=vp8' node demo/verify.mjs moq
  const query = process.env.DEMO_QUERY ? `?${process.env.DEMO_QUERY}` : '';
  await S('Page.navigate', { url: `${BASE}/${t.name}/${query}` });
  await sleep(1400);

  // ready, with a bounded wait — never a bare sleep
  let ready = false;
  for (let i = 0; i < 40 && !ready; i++) {
    ready = await ev('!!(window.__demo && window.__demo.ready)');
    if (!ready) await sleep(150);
  }
  ok('__demo.ready', ready);
  if (!ready) { console.log(`        failed: ${await ev('window.__demo && window.__demo.failed')}`); continue; }

  const meta = await ev('({ name: __demo.name, keys: Object.keys(__demo.readout), hasT: !!__demo.transport })');
  ok('identity matches manifest', meta.name === t.name, meta.name);
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
    // SAMPLE AFTER A FRAME, and more than once. `resize()` in strip.mjs assigns
    // canvas.width, which CLEARS the canvas, and only then schedules a redraw —
    // so there is a real window in which a working strip is blank, and a
    // ResizeObserver can open it at any time (a readout value getting wider, a
    // log line wrapping). Sampling one instant caught that window about one run
    // in ten and reported `0 lit samples`, which reads as a dead page.
    //
    // This is a retry, not a tolerance: a strip that never draws still fails,
    // because every try lands after a fresh frame. The count is in the detail
    // so a strip that needs several tries is visible rather than silently
    // passing.
    const sample = () => ev(`(async () => {
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const c = document.querySelector('canvas.d-strip');
      const g = c.getContext('2d');
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let lit = 0;
      for (let i = 0; i < d.length; i += 4 * 53) if (d[i] + d[i+1] + d[i+2] > 90) lit++;
      return lit;
    })()`);
    let ink = 0, tries = 0;
    for (; tries < 3 && !ink; tries++) ink = await sample();
    ok('strip has ink', ink > 0, `${ink} lit samples${tries > 1 ? ` (${tries} tries)` : ''}`);
  }

  // exercise every control the demo declared, in order — a multi-step demo
  // (arm, then measure) does not put its asserts behind the first button.
  //
  // `.tbar-x` too: a page may put a control INSIDE the transport bar when it is
  // a transport verb rather than a side action (`take` puts Record there). A
  // control the harness cannot press is a subject the suite cannot reach, which
  // is how three pages stayed green while never playing a frame.
  const SEL = '.d-controls button, .tbar-x';
  const labels = await ev(`[...document.querySelectorAll(${JSON.stringify(SEL)})].map(b => b.textContent)`);
  for (let i = 0; i < (labels || []).length; i++) {
    await ev(`document.querySelectorAll(${JSON.stringify(SEL)})[${i}].click()`);
    // A demo whose first control brings up LIVE infrastructure needs that to
    // finish before the later controls mean anything. settleMs is declared per
    // demo in the manifest rather than guessed here. Note it lands on control 0
    // ONLY — and that it now does a second job further down, sizing the wait for
    // a page's first assert. A demo whose slow control is not the first gets
    // nothing from it here and is carried entirely by that second use.
    await sleep(i === 0 && t.settleMs ? t.settleMs : 650);
  }
  if (labels?.length) console.log(`        (pressed ${labels.map((l) => JSON.stringify(l)).join(', ')})`);

  // Some checks are async (`replay` fetches the manifest before asserting), so
  // a fixed sleep either flakes or wastes time. Wait for the assert count to
  // stop growing instead.
  //
  // BUT ZERO NEVER GROWS. The loop below used to exit the moment the count
  // stopped changing, and a count of 0 stops changing immediately — so a demo
  // whose FIRST assert sits behind a wait reported "asserted nothing", which
  // reads as a broken page rather than a slow one. CLAUDE.md records the trap;
  // the loop did not honour it. `take` made it concrete: recording runs to a
  // 10 s cap and every assert is behind it.
  //
  // So there are two phases. While the count is still zero, wait — then fall
  // back to the cheap "stop when it stops growing" once anything has landed.
  //
  // CAPPED, and not at `settleMs`. That number sizes a COLD CONTAINER (`tracks`
  // declares 125 s), which is a control-0 concern and has already been waited
  // out above. Reusing it here makes a page that will never assert — because
  // its live leg is down — burn the whole budget a SECOND time, turning one
  // demo into four minutes of a run. What this phase covers is a first assert
  // sitting behind work the PAGE does (`take` records to a 10 s cap), which is
  // a much smaller quantity, so it gets its own ceiling.
  const FIRST_ASSERT_CEIL = 30000;
  const countAsserts = () => ev('(window.__demo && __demo.asserts.length) || 0');
  let n = await countAsserts();
  const firstBudget = Math.ceil(Math.min(t.settleMs || 0, FIRST_ASSERT_CEIL) / 400);
  for (let i = 0; i < firstBudget && n === 0; i++) {
    await sleep(400);
    n = await countAsserts();
  }
  let prev = -1;
  for (let i = 0; i < 12 && n !== prev; i++) {
    prev = n;
    await sleep(400);
    n = await countAsserts();
  }

  const asserts = await ev('__demo.asserts');
  ok('page asserted something', (asserts || []).length > 0, String((asserts || []).length));
  for (const a of asserts || []) ok(`page: ${a.label}`, a.pass, a.detail ?? undefined);

  // Folded into this one assert rather than added as a new one: a conditional
  // assert would make the suite total vary run to run, and a shrinking total
  // is exactly how four asserts went missing unnoticed earlier.
  const EDGE_CEILING = 25;
  // TWO DEMOS ASK ERR FOR SEGMENTS ON PURPOSE, and an unexplained ceiling is
  // how the next reader mistakes a real outage for expected churn:
  //   flipper  sweeps 8 points per probe, twice
  //   now      sweeps 13 points across the window, once, capped at 30 in-page
  // plus hls.js's own retries on whatever comes back refused.
  const PROBE_CEILING = 60;
  const edgeOk = edgeMisses.length <= EDGE_CEILING;
  const probedOk = probed.length <= PROBE_CEILING;
  ok('no console errors', errors.length === 0 && edgeOk && probedOk,
    (errors.slice(0, 2).join(' | ') || '0')
    + (edgeMisses.length ? `  (+${edgeMisses.length} live-edge part 404${edgeMisses.length > 1 ? 's' : ''}`
      + `${edgeOk ? ', normal' : ` — OVER the ceiling of ${EDGE_CEILING}`})` : '')
    + (probed.length ? `  (+${probed.length} upstream refusal${probed.length > 1 ? 's' : ''} the demos probe for`
      + `${probedOk ? ', expected' : ` — OVER the ceiling of ${PROBE_CEILING}`})` : ''));
  ok('no failed requests', failedReqs.length === 0, failedReqs.slice(0, 2).join(' | ') || '0');
  if (abortedReqs.length) {
    console.log(`        (${abortedReqs.length} aborted on teardown — expected for a media page)`);
  }
}

console.log(`\n${pass}/${pass + fail} green${fail ? `  (${fail} FAILED)` : ''}`);
ws.close(); chrome.kill(); server?.close();
process.exit(fail ? 1 : 0);
