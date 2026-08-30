// proto/looper/mobile-verify.mjs — the looper on a phone-shaped surface, with
// REAL touch streams.
//
//   node proto/looper/mobile-verify.mjs
//
// Follows timeline/lab/mobile-verify.mjs's rules exactly, because they were paid
// for once already (research/mobile-2026-08.md):
//   · device metrics + touch emulation, NEVER a resized window — a resized
//     window is a small desktop, which is a different thing from a phone;
//   · `Input.dispatchTouchEvent`, not synthesised mouse;
//   · `pointer: coarse` is the test, not a viewport width.
//
// ⚠ WHAT THIS CANNOT TEST, stated so the pass is not over-read:
//   1. Safari is not emulated at all. This is Blink with a small viewport.
//   2. The AUDIO UNLOCK is dead code here — headless Chrome runs with
//      `--autoplay-policy=no-user-gesture-required`, so the suspended-context
//      branch never executes. mobile-2026-08 §9.2 calls this the single largest
//      untested surface in the mobile work, and the looper has not changed that.
//   3. Real finger physics: contact drift, palm rejection, a rolling release.

import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, PORT } from './server.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9343;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const DEVICES = [
  { name: 'iPhone-class', width: 390, height: 844, dpr: 3 },
  { name: 'small-Android', width: 360, height: 800, dpr: 2 },
];

let fails = 0, checks = 0;
function ok(label, cond, detail) {
  checks++;
  if (!cond) { fails++; console.error(`FAIL [${label}] ${detail}`); }
  else console.log(`  ok  ${label}  ${detail}`);
}
const f = (x, n = 2) => (x == null || Number.isNaN(x) ? '—' : (+x).toFixed(n));

const server = await serve();
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${DEBUG_PORT}`,
  `--user-data-dir=${join(HERE, '.chrome-mobile')}`, '--no-first-run', '--disable-gpu',
  '--autoplay-policy=no-user-gesture-required', '--window-size=1200,900', 'about:blank'],
  { stdio: 'ignore', detached: true });
await sleep(2500);

let ws, id = 0; const waits = new Map(); const errors = [];
{
  const list = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
  ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r) => { ws.onopen = r; });
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && waits.has(m.id)) { waits.get(m.id)(m); waits.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      const msg = (d.exception && (d.exception.description || d.exception.value)) || d.text;
      if (!errors.includes(msg)) errors.push(msg);      // distinct messages only
    }
  };
}
const send = (method, params = {}) => new Promise((r) => { const i = ++id; waits.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJs = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.result && r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
  return r.result && r.result.result && r.result.result.value;
};
const shot = async (path) => {
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(path, Buffer.from(r.result.data, 'base64'));
};
await send('Runtime.enable'); await send('Page.enable');

async function setDevice(d) {
  await send('Emulation.setDeviceMetricsOverride', {
    width: d.width, height: d.height, deviceScaleFactor: d.dpr, mobile: true,
  });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await send('Emulation.setEmitTouchEventsForMouse', { enabled: false }).catch(() => {});
}

/** a real touch stream — down, hold, up — for N simultaneous points */
const touch = async (type, pts) => send('Input.dispatchTouchEvent', { type, touchPoints: pts });

await setDevice(DEVICES[0]);
await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/proto/looper/` });
await sleep(1800);

// --- L1: the layout is a phone layout, not a scaled-down desktop -------------
const layout = await evalJs(`(() => {
  const vp = document.querySelector('meta[name=viewport]');
  const kb = document.querySelector('#kb, .kb');
  const whites = [...document.querySelectorAll('.k:not(.blk)')];
  const rec = document.querySelector('#rec');
  const cs = getComputedStyle(kb);
  return {
    viewport: vp && vp.content,
    coarse: matchMedia('(pointer: coarse)').matches,
    docW: document.documentElement.scrollWidth, innerW: innerWidth,
    kbW: kb.getBoundingClientRect().width,
    whiteW: whites.length ? whites[0].getBoundingClientRect().width : 0,
    whiteH: whites.length ? whites[0].getBoundingClientRect().height : 0,
    whites: whites.length,
    touchAction: cs.touchAction,
    recH: rec.getBoundingClientRect().height,
    recW: rec.getBoundingClientRect().width,
    canvasH: document.querySelector('#loop').getBoundingClientRect().height,
  }; })()`);
console.log(`\n  ${DEVICES[0].name} (${DEVICES[0].width}x${DEVICES[0].height}@${DEVICES[0].dpr}x):`);
console.log(`     white key ${f(layout.whiteW)} x ${f(layout.whiteH)} px · REC ${f(layout.recW)} x ${f(layout.recH)} px · canvas ${f(layout.canvasH)} px`);
ok('L1', /width=device-width/.test(layout.viewport || '') && layout.coarse,
  `viewport meta present and \`pointer: coarse\` matches — the repo's own findings call a missing viewport meta "the single biggest bug on three of the four public surfaces"`);
ok('L1', layout.docW <= layout.innerW + 1,
  `no horizontal overflow: document ${layout.docW} px in a ${layout.innerW} px viewport — the page does not scroll sideways`);
ok('L2', layout.whiteW >= 38 && layout.whiteH >= 120,
  `the keys are thumb-sized: ${f(layout.whiteW)} x ${f(layout.whiteH)} px per white key, ${layout.whites} of them filling ${f(layout.kbW)} px`);
ok('L2', layout.recH >= 44,
  `THE PEDAL IS REACHABLE: REC is ${f(layout.recW)} x ${f(layout.recH)} px. There is no space bar on a phone, so the gesture the instrument is named for needs a target of its own`);
ok('L2', layout.touchAction === 'none',
  `the keybed declares \`touch-action: none\` (${layout.touchAction}) so a drag across the keys plays instead of scrolling — and only the keybed does, so the page around it keeps its scroll`);

// --- L3: audio, then real touch ---------------------------------------------
await evalJs(`document.querySelector('#start').click()`);
await sleep(1000);
const booted = await evalJs(`(() => ({ state: window.__L && window.__L.ctx.state, sr: window.__L && window.__L.ctx.sampleRate }))()`);
ok('L3', booted.state === 'running', `audio running at ${booted.sr} Hz after a tap`);

/** centre of a key, in CSS px */
const keyBox = async (k) => evalJs(`(() => { const e = document.querySelector('.k[data-key="${k}"]');
  const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height * 0.7 }; })()`);

// --- T1: POLYPHONY. Three fingers down, one lifts, the others must hold ------
const [a, d, g] = await Promise.all([keyBox('a'), keyBox('d'), keyBox('g')]);
const pt = (p, id2) => ({ x: p.x, y: p.y, id: id2, radiusX: 12, radiusY: 12, force: 1 });
await touch('touchStart', [pt(a, 1)]);
await sleep(60);
await touch('touchStart', [pt(a, 1), pt(d, 2)]);
await sleep(60);
await touch('touchStart', [pt(a, 1), pt(d, 2), pt(g, 3)]);
await sleep(120);
const three = await evalJs(`window.__L.voices.voiceCount()`);
// Lift ONE finger. NOTE: for `touchEnd`, CDP's `touchPoints` is the set being
// RELEASED, not the set remaining — sending the survivors here ends them
// instead, which is how this assert first "failed" against a correct page.
await touch('touchEnd', [pt(a, 1)]);
await sleep(150);
const afterOne = await evalJs(`(() => ({ voices: window.__L.voices.voiceCount(),
  down: [...document.querySelectorAll('.k.down')].map(e => e.dataset.key) }))()`);
await touch('touchEnd', [pt(d, 2)]);
await touch('touchEnd', [pt(g, 3)]);
await sleep(200);
const afterAll = await evalJs(`(() => ({ voices: window.__L.voices.voiceCount(),
  down: [...document.querySelectorAll('.k.down')].length }))()`);
console.log(`\n  polyphony: 3 fingers -> ${three} voices · lift one -> ${afterOne.voices} (${afterOne.down.join(',')}) · lift all -> ${afterAll.voices}`);
ok('T1', three >= 3,
  `three fingers sound three notes (${three} voices) — real touchStart events, not synthesised mouse`);
ok('T1', afterOne.down.length === 2 && afterOne.down.includes('d') && afterOne.down.includes('g'),
  `LIFTING ONE FINGER DOES NOT SILENCE THE CHORD: keys still held = ${JSON.stringify(afterOne.down)}. ` +
  `The window-level "release everything on pointerup" that is correct for a mouse is wrong for fingers, and this is the assert that keeps it fixed`);
ok('T1', afterAll.down === 0,
  `and lifting them all releases them all (${afterAll.down} keys down)`);

// --- T2: a pointercancel must not strand a note -----------------------------
const h = await keyBox('h');
await touch('touchStart', [pt(h, 7)]);
await sleep(80);
await touch('touchCancel', []);
await sleep(200);
const cancelled = await evalJs(`(() => ({ down: [...document.querySelectorAll('.k.down')].length,
  held: window.__L.looper.trace.filter(r => r.type === 'note-on').length -
        window.__L.looper.trace.filter(r => r.type === 'note-off').length }))()`);
ok('T2', cancelled.down === 0 && cancelled.held === 0,
  `a touchCancel releases the note (${cancelled.down} keys down, ${cancelled.held} unmatched note-ons) — ` +
  `the browser sends cancel when it decides a gesture was really a scroll, and ignoring it is a stuck note`);

// --- T3: the whole gesture, by touch alone ----------------------------------
// pedal -> play a figure with fingers -> pedal. No keyboard anywhere.
const tapEl = async (sel) => {
  const b = await evalJs(`(() => { const r = document.querySelector('${sel}').getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  await touch('touchStart', [{ x: b.x, y: b.y, id: 9, radiusX: 12, radiusY: 12, force: 1 }]);
  await sleep(40);
  await touch('touchEnd', []);
};
await tapEl('#rec');
const FIG = ['a', 'd', 'g', 'j', 'h'];
const t0 = Date.now();
for (let i = 0; i < FIG.length; i++) {
  const b = await keyBox(FIG[i]);
  const wait = t0 + i * 330 - Date.now(); if (wait > 0) await sleep(wait);
  await touch('touchStart', [pt(b, 20 + i)]);
  await sleep(170);
  await touch('touchEnd', []);
}
{ const wait = t0 + 2000 - Date.now(); if (wait > 0) await sleep(wait); }
await tapEl('#rec');
await sleep(900);
const rec = await evalJs(`(() => { const L = window.__L; const s = L.looper.stats();
  return { ...s, sources: [...new Set(L.looper.trace.map(r => r.source))] }; })()`);
console.log(`\n  recorded by touch alone: ${rec.notes} notes, ${f(rec.loopMs, 0)} ms loop, sources ${JSON.stringify(rec.sources)}`);
ok('T3', rec.layers === 1 && rec.notes === FIG.length && rec.lengthSetByPlaying,
  `A LOOP RECORDED ENTIRELY BY TOUCH: ${rec.notes} notes over ${f(rec.loopMs, 0)} ms, the length set by the two REC taps — the whole instrument is reachable without a keyboard`);

await sleep(4500);
const playing = await evalJs(`(() => { const on = window.__L.onsets.filter(o => o.path === 'loop');
  return { n: on.length, heard: window.__L.earOnsets.length, wraps: window.__L.looper.nest.loop('L0').wraps }; })()`);
ok('T3', playing.n > FIG.length && playing.heard > FIG.length,
  `and it loops and sounds: ${playing.n} onsets over ${playing.wraps} wraps, ${playing.heard} detected in the OUTPUT SAMPLES`);
await shot(join(HERE, 'shot-mobile-iphone.png'));

// --- L4: the second device, layout only -------------------------------------
await setDevice(DEVICES[1]);
await sleep(500);
await evalJs(`window.dispatchEvent(new Event('resize'))`);
await sleep(400);
const small = await evalJs(`(() => {
  const whites = [...document.querySelectorAll('.k:not(.blk)')];
  const blk = document.querySelector('.k.blk').getBoundingClientRect();
  return { docW: document.documentElement.scrollWidth, innerW: innerWidth,
           whiteW: whites[0].getBoundingClientRect().width,
           blackW: blk.width, blackInside: blk.x >= -1 && blk.right <= innerWidth + 1,
           canvasH: document.querySelector('#loop').getBoundingClientRect().height }; })()`);
console.log(`\n  ${DEVICES[1].name} (${DEVICES[1].width}x${DEVICES[1].height}@${DEVICES[1].dpr}x): white ${f(small.whiteW)} px · black ${f(small.blackW)} px · canvas ${f(small.canvasH)} px`);
ok('L4', small.docW <= small.innerW + 1 && small.whiteW >= 34 && small.blackInside,
  `the narrower device still fits: ${small.docW} px document in ${small.innerW} px, white keys ${f(small.whiteW)} px, black keys inside the bed`);
ok('L4', small.canvasH >= 90 && small.canvasH <= 200,
  `and the loop display is sized to CONTENT with a floor: ${f(small.canvasH)} px for one layer (header + one lane + padding), where the desktop constant was 300. ` +
  `On a phone 200 px of empty lane is not free — it pushes the keybed off the screen`);
await shot(join(HERE, 'shot-mobile-android.png'));

ok('L5', errors.length === 0, `no page exceptions${errors.length ? `: ${errors.join(' | ')}` : ''}`);
console.log(`\n  screenshots: proto/looper/shot-mobile-iphone.png · shot-mobile-android.png`);

ws.close();
try { process.kill(-chrome.pid, 'SIGKILL'); } catch { chrome.kill('SIGKILL'); }
server.close();
console.log(`\n${fails ? `${fails} VIOLATION(S)` : 'OK'} — ${checks} checks`);
process.exit(fails ? 1 : 0);
