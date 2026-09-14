#!/usr/bin/env node
// timeline/lab/mobile-verify.mjs — the VIEWING surfaces, driven by a FINGER.
//
//   node timeline/lab/mobile-verify.mjs [surface…] [--shots]
//
// Every page in this repo was built and verified on a 1400x900 headless desktop
// with a mouse. This harness is the other half: CDP device emulation
// (Emulation.setDeviceMetricsOverride + setTouchEmulationEnabled) and REAL
// touch streams (Input.dispatchTouchEvent) — never a resized window, because a
// resized window still has a mouse, `hover:hover`, `pointer:fine`, dpr 1 and no
// visual viewport, and it is exactly those four that break a phone.
//
// Devices: iPhone-class 390x844 @3x and small-Android 360x800 @2x, both
// orientations. ONE Chrome, one tab, per-surface server on that surface's own
// assigned port, killed on the way out.
//
// Asserts, per surface:
//   M1  no horizontal PAGE overflow (scrollWidth <= clientWidth) in all 4 modes
//   M2  every primary control is >= 44 px on its short axis
//   M3  a real two-finger PINCH changes pxPerSecond about the MIDPOINT
//       (the time under the midpoint must not move)
//   M4  a one-finger DRAG pans the strip and does NOT scroll the page
//   M5  a TAP seeks to the tapped time (px error, not ms error)
//   M6  zero console errors / page exceptions
import { spawn, execSync } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import { openSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CDP } from './cdp-ev.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const SCRATCH = '/private/tmp/claude-501/-Users-s32863-personal-positron/596385e3-9b74-4f17-837f-b4eb2eb5a254/scratchpad';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DBG = 9345;
const UDD = `${SCRATCH}/mobile-udd`;
const SHOTS = join(REPO, 'results', 'mobile');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sh = (c) => { try { return execSync(c, { encoding: 'utf8' }); } catch (e) { return (e.stdout || '') + ''; } };

// ---------------------------------------------------------------------------
// devices. `mobile:true` is what flips `pointer:coarse` / `hover:none` and the
// visual-viewport model — a width override alone does none of that.
// ---------------------------------------------------------------------------
const DEVICES = [
  { name: 'iphone-390x844@3',  width: 390, height: 844, dpr: 3, orient: 'portraitPrimary',  angle: 0 },
  { name: 'iphone-844x390@3',  width: 844, height: 390, dpr: 3, orient: 'landscapePrimary', angle: 90 },
  { name: 'android-360x800@2', width: 360, height: 800, dpr: 2, orient: 'portraitPrimary',  angle: 0 },
  { name: 'android-800x360@2', width: 800, height: 360, dpr: 2, orient: 'landscapePrimary', angle: 90 },
];

// ---------------------------------------------------------------------------
// surfaces
// ---------------------------------------------------------------------------
const SURFACES = {
  // the shared COMPONENT, on its own bench (its two real clients are owned by
  // other machines and their page CSS is not ours to restyle)
  strip:       { port: 8887, static: REPO, path: '/timeline/lab/strip-touch.html', settle: 1400 },
  // the real client, gestures only — proves the component behaves the same when
  // it is mounted by somebody else's page
  paths:       { port: 8887, server: 'proto/paths/server.mjs', path: '/paths.html', settle: 3000, layout: false,
                 prep: `document.getElementById('synth').click()`, prepWait: 2000 },
  // the replay is loaded with the SAME archive artifacts the measured gate uses
  // (R2 + the deployed worker; zero ERR calls), so the phone screenshot is of a
  // page that is actually playing, with a real cue on the glass.
  replay:      { port: 8885, static: REPO, path: replayPath(), settle: 22000 },
  megatimeline:{ port: 8892, server: 'proto/megatimeline/server.mjs',path: '/?trickle=0',            settle: 2600 },
  remixer:     { port: 8891, server: 'proto/remixer/server.mjs',    path: '/?trickle=0',             settle: 2200 },
  aikajana:    { port: 8894, static: REPO,                          path: '/proto/aikajana/index.html', settle: 2000 },
  console:     { port: 8899, static: REPO,                          path: '/studio/console.html',    settle: 1200 },
};

/** the replay page needs a src to be anything at all; build it from the archive
 *  artifacts exactly as proto/archive/run-measure-archive.mjs does. */
function replayPath() {
  try {
    const meta = JSON.parse(readFileSync(join(REPO, 'proto/archive/artifacts/archive-meta.json'), 'utf8'));
    const env = readFileSync(join(REPO, '.env'), 'utf8').split('\n').find((l) => l.startsWith('ROOM_TOKEN='));
    const qp = new URLSearchParams({
      src: meta.hlsUrl, room: meta.room, token: env ? env.slice('ROOM_TOKEN='.length).trim() : '',
      remote: 'https://rtc.positron.studio',
      anchor: 'stamp', t0: String(meta.T0native), startAt: '0',
    });
    return '/proto/replay/replay.html?' + qp;
  } catch { return '/proto/replay/replay.html'; }
}

const wanted = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const LIST = wanted.length ? wanted : Object.keys(SURFACES).filter((k) => k !== 'paths');

// ---------------------------------------------------------------------------
// a static server with no deps, for the surfaces that have no server of their
// own. Serves the repo root so `/timeline/*` resolves the shared library.
// ---------------------------------------------------------------------------
const STATIC_SRC = `
import http from 'node:http'; import { readFile } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';
const ROOT = process.argv[2], PORT = +process.argv[3];
const MIME = { '.html':'text/html', '.mjs':'text/javascript', '.js':'text/javascript',
  '.json':'application/json', '.css':'text/css', '.png':'image/png', '.svg':'image/svg+xml',
  '.mp3':'audio/mpeg', '.m4a':'audio/mp4', '.wav':'audio/wav', '.jsonl':'application/x-ndjson' };
http.createServer(async (req, res) => {
  const p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\\.\\.[/\\\\])+/, '');
  try {
    const buf = await readFile(join(ROOT, p));
    res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream',
      'access-control-allow-origin': '*', 'cache-control': 'no-store' });
    res.end(buf);
  } catch { res.writeHead(404); res.end('404 ' + p); }
}).listen(PORT, '127.0.0.1', () => console.log('static ' + PORT + ' ' + ROOT));
`;

// ---------------------------------------------------------------------------
// touch primitives — REAL streams, not synthetic JS events. A synthesized
// TouchEvent would bypass touch-action, hit-testing and pointer capture, which
// are precisely the three things under test.
// ---------------------------------------------------------------------------
const tp = (x, y, id) => ({ x: Math.round(x), y: Math.round(y), id, radiusX: 12, radiusY: 12, force: 1 });

async function touchStart(cdp, pts) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts });
}
async function touchMove(cdp, pts) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts });
}
async function touchEnd(cdp, pts = []) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: pts });
}

/** a tap that a HAND could produce: contact, a couple of px of tremor, lift. */
async function tap(cdp, x, y) {
  await touchStart(cdp, [tp(x, y, 1)]);
  await sleep(40);
  await touchMove(cdp, [tp(x + 1, y + 1, 1)]);
  await sleep(40);
  await touchEnd(cdp);
  await sleep(90);
}

/** a one-finger drag, interpolated over `steps` so the strip sees the same
 *  stream a real finger makes (slop crossing, then continuous motion). */
async function drag(cdp, x0, y0, x1, y1, steps = 14) {
  await touchStart(cdp, [tp(x0, y0, 1)]);
  await sleep(20);
  for (let i = 1; i <= steps; i++) {
    const u = i / steps;
    await touchMove(cdp, [tp(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, 1)]);
    await sleep(12);
  }
  await sleep(30);
  await touchEnd(cdp);
  await sleep(90);
}

/** a two-finger pinch about (cx, cy): both fingers move, the midpoint does not. */
async function pinch(cdp, cx, cy, from, to, steps = 14) {
  const at = (half, id) => tp(cx + (id === 1 ? -half : half), cy, id);
  await touchStart(cdp, [at(from / 2, 1), at(from / 2, 2)]);
  await sleep(30);
  for (let i = 1; i <= steps; i++) {
    const half = (from + (to - from) * (i / steps)) / 2;
    await touchMove(cdp, [at(half, 1), at(half, 2)]);
    await sleep(14);
  }
  await sleep(30);
  // BOTH fingers lift in one event. CDP's contract is explicit — "TouchEnd and
  // TouchCancel must not contain any touch points" — and a touchEnd carrying a
  // point is silently dropped, which leaves that pointer id LIVE in the page's
  // pointer map. The next one-finger drag then arrives as pointers.size === 2
  // and is interpreted as a pinch with a stale anchor: the pan appears to do
  // nothing at all. This was a harness bug that read exactly like a product bug.
  await touchEnd(cdp);
  await sleep(120);
}

/** Chrome keeps ONE touch state machine per target, and it survives
 *  Page.navigate. After a gesture battery on page A, the first touchStart
 *  dispatched on page C is swallowed — the events are delivered, the page's
 *  listeners never run, and every assert reads "touch does nothing". Cycling
 *  touch emulation resets that machine; the throwaway contact proves it took. */
async function resetTouch(cdp, x, y) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }).catch(() => {});
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false });
  await sleep(80);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await sleep(120);
  await touchStart(cdp, [tp(x, y, 9)]);
  await sleep(40);
  await touchEnd(cdp);
  await sleep(150);
}

// ---------------------------------------------------------------------------
const results = [];
function check(surface, device, name, ok, detail) {
  results.push({ surface, device, name, ok: !!ok, detail });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${surface}/${device || '-'}  ${name}  ${detail ?? ''}`);
}

const kids = [];
function spawnLogged(cmd, argv, name, cwd) {
  const fd = openSync(join(SCRATCH, `mobile-${name}.log`), 'a');
  const p = spawn(cmd, argv, { stdio: ['ignore', fd, fd], cwd });
  kids.push(p);
  return p;
}

async function setDevice(cdp, d) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: d.width, height: d.height, deviceScaleFactor: d.dpr, mobile: true,
    screenOrientation: { type: d.orient, angle: d.angle },
  });
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: false }).catch(() => {});
  await sleep(450);          // let ResizeObserver / rAF settle at the new size
}

// ---------------------------------------------------------------------------
// per-device, layout-only assertions that every surface gets
// ---------------------------------------------------------------------------
const OVERFLOW_JS = `(() => {
  const de = document.documentElement, b = document.body;
  const over = [];
  const vw = de.clientWidth;
  // an element sticking out to the right is only a BUG if nothing between it and
  // the root clips it. A ruler tick at x=1200 inside an overflow:hidden ruler is
  // correct rendering, not a broken layout, and flagging it hides real ones.
  const clipped = (el) => {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.overflowX !== 'visible' || cs.overflow === 'hidden' || cs.overflow === 'auto' || cs.overflow === 'scroll') return true;
    }
    return false;
  };
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.right <= vw + 1.5) continue;
    if (clipped(el)) continue;
    over.push((el.id ? '#'+el.id : el.tagName.toLowerCase()+(el.className && typeof el.className==='string' ? '.'+el.className.trim().split(/\s+/)[0] : ''))
      + ' right=' + Math.round(r.right));
  }
  return { docSW: de.scrollWidth, docCW: de.clientWidth,
           bodySW: b ? b.scrollWidth : 0, bodyCW: b ? b.clientWidth : 0,
           innerW: innerWidth, over: over.slice(0, 6) };
})()`;

const TARGETS_JS = `(() => {
  const sel = 'button, [role=button], input:not([type=hidden]), select, a[href], summary, .laneRow, .tlab, .it, .row';
  const bad = [], all = [];
  // THE TAP TARGET IS THE THING A FINGER ACTIVATES, not the thing it can see.
  // A 22 px checkbox inside a 44 px row that toggles it IS a 44 px target, and
  // a rule that cannot say so forces controls to be uglier than they need to be.
  const activator = (el) => {
    let best = el;
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      const cs = getComputedStyle(p);
      const tag = p.tagName.toLowerCase();
      const acts = tag === 'label' || tag === 'button' || tag === 'a' ||
                   (p.id && document.querySelector('label[for="' + p.id + '"]')) ||
                   p.classList.contains('laneRow') || p.classList.contains('row') ||
                   p.onclick != null || cs.cursor === 'pointer';
      if (!acts) continue;
      const r = p.getBoundingClientRect();
      if (Math.min(r.width, r.height) > Math.min(best.getBoundingClientRect().width, best.getBoundingClientRect().height)) best = p;
    }
    return best;
  };
  for (const el of document.querySelectorAll(sel)) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    if (cs.pointerEvents === 'none') continue;   // a MARK, not a control — it cannot be tapped at all
    if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;  // off-screen
    // a checkbox whose <label for=…> is 44 px tall IS a 44 px target: the label
    // activates it. Look sideways to the label, not only up the ancestor chain.
    let act = activator(el);
    if (el.id) {
      const lab = document.querySelector('label[for="' + el.id + '"]');
      if (lab) {
        const lr = lab.getBoundingClientRect(), ar = act.getBoundingClientRect();
        if (Math.min(lr.width, lr.height) > Math.min(ar.width, ar.height)) act = lab;
      }
    }
    const a = act.getBoundingClientRect();
    const short = Math.min(a.width, a.height);
    all.push(short);
    if (short < 43.5) bad.push((el.id ? '#'+el.id : el.tagName.toLowerCase()+(el.className && typeof el.className==='string' && el.className.trim() ? '.'+el.className.trim().split(/\s+/)[0] : '')) + ' ' + Math.round(a.width) + 'x' + Math.round(a.height));
  }
  return { n: all.length, min: all.length ? Math.min(...all).toFixed(1) : null, bad: bad.slice(0, 8), nbad: bad.length };
})()`;

// ---------------------------------------------------------------------------
async function runSurface(key, cdp, opts) {
  const S = SURFACES[key];
  const url = `http://127.0.0.1:${S.port}${S.path}`;
  console.log(`\n=== ${key} — ${url}`);

  const errs = cdp.errors || (cdp.errors = []);

  await cdp.send('Page.navigate', { url });
  await sleep(S.settle);
  if (S.prep) { try { await cdp.eval(S.prep); } catch (e) { console.log('  prep: ' + e.message.slice(0, 120)); } await sleep(S.prepWait || 800); }

  for (const d of (S.layout === false ? [] : DEVICES)) {
    await setDevice(cdp, d);
    await sleep(350);
    const ov = await cdp.eval(OVERFLOW_JS);
    check(key, d.name, 'M1 no-h-overflow',
      ov.docSW <= ov.docCW + 1 && ov.bodySW <= ov.bodyCW + 1 && ov.over.length === 0,
      `doc ${ov.docSW}/${ov.docCW} body ${ov.bodySW}/${ov.bodyCW}${ov.over.length ? ' :: ' + ov.over.join(' | ') : ''}`);
    const tg = await cdp.eval(TARGETS_JS);
    check(key, d.name, 'M2 tap-targets>=44',
      tg.nbad === 0, `${tg.n} controls, min short-axis ${tg.min}px${tg.nbad ? ` :: ${tg.nbad} under — ` + tg.bad.join(' | ') : ''}`);
  }

  // back to the phone-portrait mode for the gesture asserts + the screenshot
  await setDevice(cdp, DEVICES[0]);
  await sleep(300);

  // the screenshot is the LANDING state — what a viewer sees on arrival — so it
  // is taken before the gesture battery drags the view somewhere arbitrary.
  const png = await cdp.screenshot();
  await writeFile(join(SHOTS, `${key}-390x844.png`), png);
  console.log(`  shot -> results/mobile/${key}-390x844.png`);

  if (opts && opts.gestures) await opts.gestures(cdp, key);

  const pageErrs = await cdp.eval(`(window.__mobileErrors||[]).slice(0,6)`).catch(() => []);
  check(key, null, 'M6 zero-console-errors', errs.length === 0 && (!pageErrs || pageErrs.length === 0),
    `cdp=${errs.length} page=${pageErrs ? pageErrs.length : 0}${errs.length ? ' :: ' + errs.slice(0, 4).join(' | ') : ''}${pageErrs && pageErrs.length ? ' :: ' + pageErrs.join(' | ') : ''}`);
}

// ---------------------------------------------------------------------------
// the STRIP gesture battery (proto/paths hosts the shared component)
// ---------------------------------------------------------------------------
async function stripGestures(cdp, key) {
  const H = `window.__strips[0]`;
  const ready = await cdp.eval(`!!(window.__strips && window.__strips[0])`);
  if (!ready) { check(key, 'iphone', 'strip-handle', false, 'window.__strips missing'); return; }

  // the canvas must be ON SCREEN before a finger can reach it — CDP dispatches
  // at viewport coordinates, so an off-screen target silently swallows every
  // gesture and every assert reads "nothing happened".
  await cdp.eval(`${H}.canvas.scrollIntoView({ block: 'center' })`);
  await sleep(400);
  await resetTouch(cdp, 4, 4);          // see resetTouch: touch state survives navigation

  // geometry, in CSS px, from the strip itself
  const geo = await cdp.eval(`(() => {
    const s = ${H}, r = s.canvas.getBoundingClientRect();
    return { left: r.left, top: r.top, w: r.width, h: r.height,
             gutter: s.state.gutterPx, pps: s.view().pxPerSecond, scrollX: s.view().scrollX };
  })()`);
  if (geo.w < 80) {
    // the HOST page collapsed the canvas, not the component. Say which, because
    // "gestures do nothing" and "there is nothing to gesture on" look identical
    // from the outside and only one of them is the strip's fault.
    check(key, 'iphone-390x844@3', 'strip-canvas-has-width', false,
      `host page laid the canvas out at ${geo.w.toFixed(0)} px wide at 390 px viewport — the component cannot be exercised here`);
    return;
  }
  const cx = geo.left + geo.gutter + (geo.w - geo.gutter) / 2;
  const cy = geo.top + geo.h * 0.55;

  // --- M3 PINCH -------------------------------------------------------------
  const before = await cdp.eval(`(() => { const s=${H}; const v=s.view();
    return { pps: v.pxPerSecond, tMid: s.xToTime(${cx} - ${geo.left} - ${geo.gutter}) }; })()`);
  await pinch(cdp, cx, cy, 90, 300);
  const after = await cdp.eval(`(() => { const s=${H}; const v=s.view();
    return { pps: v.pxPerSecond, tMid: s.xToTime(${cx} - ${geo.left} - ${geo.gutter}), g: s.gesture() }; })()`);
  const ratio = after.pps / before.pps;
  // the midpoint invariant, expressed where it is meaningful: in PIXELS at the
  // NEW zoom. A ms drift is unreadable across a 3.3x zoom change.
  const midDriftPx = Math.abs((after.tMid - before.tMid) / 1000) * after.pps;
  check(key, 'iphone-390x844@3', 'M3 pinch-zooms', ratio > 2.4 && ratio < 4.6,
    `pxPerSecond ${before.pps.toFixed(2)} -> ${after.pps.toFixed(2)} (x${ratio.toFixed(2)}, finger spread 90->300px = x3.33)`);
  check(key, 'iphone-390x844@3', 'M3b pinch-about-midpoint', midDriftPx < 3,
    `time under the midpoint moved ${midDriftPx.toFixed(2)} px at the new zoom`);

  // --- M4 one-finger DRAG pans, page does not scroll -------------------------
  await cdp.eval(`${H}.canvas.scrollIntoView({ block: 'center' })`);
  await sleep(300);
  const pre = await cdp.eval(`({ scrollX: ${H}.view().scrollX, pageY: scrollY, pos: ${H}.state.pos })`);
  const g1 = await cdp.eval(`(() => { const r = ${H}.canvas.getBoundingClientRect();
    return { left: r.left, top: r.top, w: r.width, h: r.height, gutter: ${H}.state.gutterPx }; })()`);
  const dx = g1.left + g1.gutter + (g1.w - g1.gutter) / 2, dy = g1.top + g1.h * 0.55;
  await drag(cdp, dx + 110, dy, dx - 110, dy);
  const post = await cdp.eval(`({ scrollX: ${H}.view().scrollX, pageY: scrollY, pos: ${H}.state.pos, g: ${H}.gesture() })`);
  const panned = post.scrollX - pre.scrollX;
  check(key, 'iphone-390x844@3', 'M4 drag-pans', Math.abs(panned - 220) < 26,
    `scrollX ${pre.scrollX.toFixed(1)} -> ${post.scrollX.toFixed(1)} (+${panned.toFixed(1)} px for a 220 px finger travel)`);
  check(key, 'iphone-390x844@3', 'M4b drag-did-not-scroll-page', post.pageY === pre.pageY,
    `window.scrollY ${pre.pageY} -> ${post.pageY}`);
  check(key, 'iphone-390x844@3', 'M4c drag-did-not-seek', post.pos === pre.pos,
    `deck position ${pre.pos} -> ${post.pos} (a pan must never be a seek)`);

  // --- M4d a VERTICAL swipe still scrolls the PAGE ---------------------------
  await sleep(120);
  const vpre = await cdp.eval(`({ pageY: scrollY, scrollX: ${H}.view().scrollX })`);
  await drag(cdp, dx, dy, dx, dy - 150);
  const vpost = await cdp.eval(`({ pageY: scrollY, scrollX: ${H}.view().scrollX })`);
  check(key, 'iphone-390x844@3', 'M4d vertical-swipe-scrolls-page',
    vpost.pageY > vpre.pageY && Math.abs(vpost.scrollX - vpre.scrollX) < 2,
    `scrollY ${vpre.pageY} -> ${vpost.pageY} while the strip stayed put (scrollX ${vpre.scrollX.toFixed(1)} -> ${vpost.scrollX.toFixed(1)})`);

  // --- M5 TAP seeks ---------------------------------------------------------
  await cdp.eval(`${H}.canvas.scrollIntoView({ block: 'center' })`);
  await sleep(350);
  const g2 = await cdp.eval(`(() => { const s=${H}, r=s.canvas.getBoundingClientRect();
    return { left:r.left, top:r.top, w:r.width, h:r.height, gutter:s.state.gutterPx }; })()`);
  const tapX = g2.left + g2.gutter + (g2.w - g2.gutter) * 0.42;
  const tapY = g2.top + g2.h * 0.5;
  const want = await cdp.eval(`${H}.xToTime(${tapX - g2.left - g2.gutter})`);
  await tap(cdp, tapX, tapY);
  const got = await cdp.eval(`({ pos: ${H}.state.pos, px: ${H}.timeToX(${H}.state.pos), hover: !!${H}.hover() })`);
  const errPx = Math.abs(got.px - (tapX - g2.left - g2.gutter));
  check(key, 'iphone-390x844@3', 'M5 tap-seeks', errPx < 3,
    `tapped t=${want.toFixed(0)} ms, playhead landed ${errPx.toFixed(2)} px away`);
  check(key, 'iphone-390x844@3', 'M5b tap-opens-inspector', got.hover === true,
    `hover-only tooltip has a tap equivalent (sticky): ${got.hover}`);

  // --- touch-action discipline is DECLARED, not emergent ---------------------
  const ta = await cdp.eval(`getComputedStyle(${H}.canvas).touchAction`);
  check(key, 'iphone-390x844@3', 'M0 touch-action=pan-y', ta === 'pan-y',
    `canvas touch-action: ${ta} (page keeps vertical, strip owns horizontal + pinch)`);
}

// ---------------------------------------------------------------------------
// the megatimeline gesture battery (its own gesture.mjs, not the strip)
// ---------------------------------------------------------------------------
async function megaGestures(cdp, key) {
  // WAIT FOR ready, do not guess with a sleep: the census fetch finishes with
  // fitX(), which overwrites panX/zx wholesale. A gesture dispatched before that
  // is real, lands correctly, and is then erased — which reads as "touch does
  // nothing" and is the single most misleading failure this harness can produce.
  let ok = false;
  for (let i = 0; i < 60; i++) {
    ok = await cdp.eval(`!!(window.__mt && window.__mt.viewport && window.__mt.ready)`);
    if (ok) break;
    await sleep(500);
  }
  if (!ok) { check(key, 'iphone', 'mega-handle', false, 'window.__mt never became ready'); return; }
  await sleep(600);
  const W = await cdp.eval(`innerWidth`), Hh = await cdp.eval(`innerHeight`);
  const cx = W / 2, cy = Hh * 0.55;

  // WHAT IS UNDER THE FINGER — asserted, not assumed. Every "touch does
  // nothing" failure in this harness turned out to be either a stale pointer or
  // a target that was not where the arithmetic said it was, and both are
  // invisible unless you ask the page directly. Asking also costs a round trip,
  // which is the settle the freshly-resized stage needed anyway.
  const hitEl = await cdp.eval(`(() => { const e = document.elementFromPoint(${cx}, ${cy});
    return e ? (e.id || e.tagName.toLowerCase()) : 'none'; })()`);
  await resetTouch(cdp, cx, cy);
  await cdp.eval(`(() => { window.__pc = { down: 0, move: 0, up: 0 };
    for (const t of ['pointerdown','pointermove','pointerup'])
      document.getElementById('stage').addEventListener(t, () => window.__pc[t.slice(7)]++, true);
    return 1; })()`);
  check(key, 'iphone-390x844@3', 'M2b finger-lands-on-stage',
    ['stage', 'field', 'cards', 'furniture'].includes(hitEl),
    `element under (${Math.round(cx)},${Math.round(cy)}) is #${hitEl}`);
  const b = await cdp.eval(`({ zx: window.__mt.viewport.zx, panX: window.__mt.viewport.panX })`);
  await pinch(cdp, cx, cy, 80, 260);
  const a = await cdp.eval(`({ zx: window.__mt.viewport.zx, panX: window.__mt.viewport.panX })`);
  const pc = await cdp.eval('window.__pc');
  check(key, 'iphone-390x844@3', 'M2c stage-receives-touch', pc && pc.down > 0 && pc.move > 0,
    `#stage saw pointerdown x${pc ? pc.down : '?'} / pointermove x${pc ? pc.move : '?'} during the pinch`);
  const r = a.zx / b.zx;
  check(key, 'iphone-390x844@3', 'M3 pinch-zooms', r > 2.4 && r < 4.2,
    `zx ${b.zx.toExponential(2)} -> ${a.zx.toExponential(2)} (x${r.toFixed(2)} for a x3.25 spread)`);

  const p0 = await cdp.eval(`window.__mt.viewport.panX`);
  await drag(cdp, cx + 100, cy, cx - 100, cy);
  const p1 = await cdp.eval(`window.__mt.viewport.panX`);
  check(key, 'iphone-390x844@3', 'M4 drag-pans', Math.abs(p1 - p0) > 1e-9,
    `panX ${p0.toFixed(3)} -> ${p1.toFixed(3)}`);
}

// ---------------------------------------------------------------------------
async function main() {
  await mkdir(SCRATCH, { recursive: true });
  await mkdir(SHOTS, { recursive: true });
  sh(`pkill -f 'mobile-udd' 2>/dev/null`);
  for (const k of LIST) {
    const S = SURFACES[k];
    if (S) sh(`lsof -ti tcp:${S.port} | xargs kill -9 2>/dev/null`);
  }
  await sleep(400);

  // one static-server source file, reused by every static surface
  const staticFile = join(SCRATCH, 'mobile-static.mjs');
  await writeFile(staticFile, STATIC_SRC);

  // servers (one per surface; they are all tiny and all on their own port)
  for (const k of LIST) {
    const S = SURFACES[k];
    if (!S) { console.log(`?? unknown surface ${k}`); continue; }
    if (S.server) spawnLogged(process.execPath, [join(REPO, S.server)], k, join(REPO, dirname(S.server)));
    else spawnLogged(process.execPath, [staticFile, S.static, String(S.port)], k);
  }
  await sleep(1400);

  const chrome = spawnLogged(CHROME, [
    '--headless=new', `--remote-debugging-port=${DBG}`, `--user-data-dir=${UDD}`,
    '--no-first-run', '--no-default-browser-check', '--window-size=1400,900',
    '--autoplay-policy=no-user-gesture-required', '--mute-audio',
    'about:blank',
  ], 'chrome');
  await sleep(1800);

  const cdp = new CDP();
  await cdp.connect(DBG, 'about:blank');
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable').catch(() => {});
  cdp.errors = [];
  cdp.on('Runtime.consoleAPICalled', (p) => {
    if (p.type === 'error') cdp.errors.push((p.args || []).map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 200));
  });
  cdp.on('Runtime.exceptionThrown', (p) => {
    cdp.errors.push(String(p.exceptionDetails?.exception?.description || p.exceptionDetails?.text || 'exception').slice(0, 200));
  });

  const GEST = { strip: stripGestures, paths: stripGestures, megatimeline: megaGestures };
  for (const k of LIST) {
    if (!SURFACES[k]) continue;
    // ONE TAB PER SURFACE. Chrome's input router lives on the render widget and
    // it does not reliably follow a same-tab navigation: after a gesture
    // battery on surface A, Input.dispatchTouchEvent on surface B is accepted
    // and acknowledged and delivered NOWHERE — the page's own pointerdown
    // listener counts zero, and every gesture assert reads as a product bug.
    // about:blank between them is not enough; a fresh target is. Still one
    // Chrome, and the tab is closed on the way out.
    let tab = null, sess = null;
    try {
      tab = await (await fetch(`http://127.0.0.1:${DBG}/json/new?about:blank`, { method: 'PUT' })).json();
      sess = new CDP();
      await sess._open(tab.webSocketDebuggerUrl);
      sess.targetId = tab.id;
      await sess.send('Page.enable'); await sess.send('Runtime.enable');
      sess.errors = [];
      sess.on('Runtime.consoleAPICalled', (p) => {
        if (p.type === 'error') sess.errors.push((p.args || []).map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 200));
      });
      sess.on('Runtime.exceptionThrown', (p) => {
        sess.errors.push(String(p.exceptionDetails?.exception?.description || p.exceptionDetails?.text || 'exception').slice(0, 200));
      });
      await runSurface(k, sess, { gestures: GEST[k] });
    } catch (e) { check(k, null, 'surface-ran', false, String(e.message).slice(0, 220)); }
    finally {
      if (sess) sess.close();
      if (tab) await fetch(`http://127.0.0.1:${DBG}/json/close/${tab.id}`).catch(() => {});
      await sleep(400);
    }
  }

  cdp.close();
  const pass = results.filter((r) => r.ok).length;
  console.log(`\n${pass} pass / ${results.length - pass} fail  (${results.length} asserts)`);
  await writeFile(join(SHOTS, 'report.json'), JSON.stringify({ at: Date.now(), devices: DEVICES, results }, null, 2));
  cleanup();
  process.exit(results.length - pass ? 1 : 0);
}

function cleanup() {
  for (const p of kids) { try { p.kill('SIGKILL'); } catch {} }
  sh(`pkill -f 'mobile-udd' 2>/dev/null`);
  for (const k of LIST) { const S = SURFACES[k]; if (S) sh(`lsof -ti tcp:${S.port} | xargs kill -9 2>/dev/null`); }
}
process.on('SIGINT', () => { cleanup(); process.exit(130); });
main().catch((e) => { console.error(e); cleanup(); process.exit(1); });
