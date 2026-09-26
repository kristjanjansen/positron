// demo/shot.mjs — LOOK AT A PAGE AT A WIDTH. One command, one picture per width.
//
//   node demo/shot.mjs kit                      # 375, 768 and 1280: an iPhone mini, an iPad, the desk
//   node demo/shot.mjs kit 375                  # just the phone
//   node demo/shot.mjs kit --hash instrument-panel
//   node demo/shot.mjs kit --base https://positron.studio
//   node demo/shot.mjs kit --clip 2400          # stop the capture 2400 px down
//
// 🔴 IT EXISTS BECAUSE THIS PROJECT CANNOT SEE ITS OWN PHONE LAYOUTS, AND THAT
// IS WRITTEN DOWN IN THREE PLACES AS A KNOWN HOLE RATHER THAN AS A THING
// ANYBODY FIXED. `positron-ui`: *"demo/verify.mjs runs at 756 px with no
// viewport override, so EVERY assert on a page passes without ever entering its
// media query"*. `shell.css`: `.pos-pick`'s entire phone arrangement sat dead
// for weeks with every line of it correct. `local-remote.mjs` decides its
// arrangement in JavaScript instead of in CSS, and says in its own header that
// it does so because no harness here can enter a media query.
//
// 🔴 **AND IT EXISTS BECAUSE THE OBVIOUS WAYS DO NOT WORK. MEASURED 2026-09-26.**
// Resizing the browser window through the extension reported `Successfully
// resized window to 400x860` and the page rendered at **1429 px** anyway, so
// the one thing that looked like it would answer this question answers it
// wrongly and says nothing. `--window-size` on a headless launch has the same
// weakness: it is the OS window, not the viewport the page lays out in, and it
// does not set `devicePixelRatio` or the mobile flag at all.
//
// ✅ **`Emulation.setDeviceMetricsOverride` IS THE ONE THAT IS REAL.** It sets
// the layout viewport the page actually uses, so `@media (max-width: 560px)`
// enters, `@container` resolves against a real box, `100vw` is the phone's, and
// `window.innerWidth` agrees with all of them until something overflows, and
// then it does not (see the overflow line below). `mobile: true` also makes the
// page honour `<meta name=viewport>` the way a phone does, which is the
// difference between a narrow desktop and a phone and is exactly where this
// project's layouts break.
//
// ⚠️ **A SHOT IS A LOOK, NOT A GRADE, AND IT DOES NOT ASK FOR A SELF-CHECK.**
// `?selfcheck=1` is the harness's business. A picture taken with the checks
// running is a picture of a page doing extra work, and this project's standing
// rule is that a self-check never runs for a visitor. What a shot shows is what
// a visitor sees.
//
// ⚠️ **AND IT OPENS NOTHING BY ITSELF.** It takes a slug and visits that page
// once per width, which is the same traffic a person opening the page three
// times would make. It is NOT pointed at anybody else's server: use it on
// `127.0.0.1` or on `positron.studio`, and read the rules in CLAUDE.md before
// pointing anything at an external source.

import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * 🔴 THREE WIDTHS, AND THEY ARE MEASUREMENTS OF REAL SCREENS RATHER THAN ROUND
 * NUMBERS. **The phone is an iPhone mini: 375 by 812 CSS px at 3x.** Instructed
 * 2026-09-26: *"use iphone mini size for mob testing"*. It is the narrowest
 * current iPhone, so a layout that fits it fits every iPhone, and it is narrower
 * than the 390 this file shipped with, which is the 12 through 16 and which the
 * first six shots were taken at. 768 is an iPad portrait, where a two column
 * layout has to decide what it is. 1280 is the desk.
 * ⚠️ **AND 375 IS NOT THE NARROWEST THING THAT EXISTS.** 360 is, an ordinary
 * Android, and `shell.css` records a defect that showed at exactly that width.
 * This file takes any width as an argument so a report can be reproduced at the
 * width it was reported at rather than at the nearest one this list has.
 */
const WIDTHS = [375, 768, 1280];
/** The mini's own height and density, so a phone shot is a shot of a phone. */
const PHONE = { height: 812, dpr: 3 };

const argv = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : fallback;
};
// ⚠️ A NUMBER AFTER A FLAG IS THAT FLAG'S VALUE, NOT A WIDTH. The first run of
// this file took `--clip 2600` as a fourth width and shot the page at 2600 px.
const bare = argv.filter((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--'));
const slug = bare.find((a) => !/^\d+$/.test(a));
const widths = bare.filter((a) => /^\d+$/.test(a)).map(Number);
const BASE = flag('base', process.env.DEMO_BASE || 'http://127.0.0.1:8890');
const HASH = flag('hash', '');
const CLIP = Number(flag('clip', 0)) || 0;
const WAIT = Number(flag('wait', 2500));
const OUT = flag('out', 'tmp/shots');

if (!slug) {
  console.error('usage: node demo/shot.mjs <slug> [width ...] [--base URL] [--hash id] [--clip px] [--wait ms] [--out dir]');
  process.exit(2);
}

const PROFILE = await mkdtemp(join(tmpdir(), 'positron-shot-'));
const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${PROFILE}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu',
  // ⚠️ MUTED AND WITHOUT AN AUTOPLAY GESTURE, because a shot must not start a
  // sound on somebody's desk and must not be a page that has begun playing.
  '--mute-audio',
], { stdio: ['ignore', 'pipe', 'pipe'] });
chrome.stderr.on('data', () => {});
// ⚠️ CHROME DIES WITH THIS PROCESS, WHATEVER KILLED IT. A run that threw
// after launch left a headless Chrome alive, and the next verify run marked
// itself as not evidence because of it. `exit` fires on a normal end, an
// uncaught throw and a SIGTERM; SIGINT is turned into an exit so it fires too.
process.on('exit', () => { try { chrome.kill(); } catch { /* already gone */ } });
process.on('SIGINT', () => process.exit(130));

let wsUrl = null, port = null;
for (let i = 0; i < 60 && !wsUrl; i++) {
  await sleep(250);
  try {
    // ⚠️ THE PORT WE ACTUALLY GOT, READ FROM OUR OWN PROFILE, NEVER GUESSED.
    // `verify.mjs` pays for this lesson at length: a guessed port can attach to
    // somebody else's browser.
    if (!port) port = Number((await readFile(`${PROFILE}/DevToolsActivePort`, 'utf8')).split('\n')[0]);
    if (!Number.isFinite(port) || !port) { port = null; continue; }
    wsUrl = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).webSocketDebuggerUrl;
  } catch { /* not up yet */ }
}
if (!wsUrl) { chrome.kill(); throw new Error('chrome did not come up'); }

const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let msgId = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
  }
};
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const id = ++msgId;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params, sessionId }));
});

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const S = (m, p) => send(m, p, sessionId);
await S('Page.enable');
await S('Runtime.enable');

await mkdir(OUT, { recursive: true });
const shots = [];

for (const w of (widths.length ? widths : WIDTHS)) {
  /**
   * 🔴 `mobile` IS DERIVED FROM THE WIDTH AND IS NOT A SEPARATE ARGUMENT,
   * because the question a narrow shot answers is *what does a phone see*, and
   * a phone is not a small desktop: it honours `<meta name=viewport>`, it has a
   * visual viewport that can differ from the layout one, and it reports touch.
   * A narrow window on a desk is a different rendering and has never been the
   * thing being asked about.
   * ⚠️ **AND `deviceScaleFactor` IS 3 ON THE PHONE, THE MINI'S OWN**, so a
   * hairline seam is captured at the density it is actually drawn at. A 1 px
   * line on a 1x shot of a 3x screen is the one thing a picture cannot show
   * honestly, and the line-width snapping rule is different at 3 (exact) from
   * 1.5 (rounds down), so the density is part of the measurement.
   */
  const mobile = w <= 560;
  await S('Emulation.setDeviceMetricsOverride', {
    width: w, height: mobile ? PHONE.height : 900, deviceScaleFactor: mobile ? PHONE.dpr : 1, mobile,
  });
  // ⚠️ `maxTouchPoints` ONLY WHEN ENABLING. CDP refuses 0 with "Touch points must
  // be between 1 and 16", so a desktop pass that sends it dies after the phone
  // pass succeeded. MEASURED on the first run of this file.
  await S('Emulation.setTouchEmulationEnabled', mobile ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });

  const url = `${BASE}/${slug}/${HASH ? `#${HASH}` : ''}`;
  await S('Page.navigate', { url });
  await sleep(WAIT);
  if (HASH) {
    // ⚠️ THE HASH AGAIN AFTER THE WAIT. A tabbed page writes the opening part's
    // id over the address on its first `go`, so a fragment naming a block is
    // gone by the time anybody looks. `/kit/` does exactly this.
    await S('Runtime.evaluate', {
      expression: `location.hash = ${JSON.stringify(`#${HASH}`)};
        document.getElementById(${JSON.stringify(HASH)})?.scrollIntoView({block:'start'});`,
    });
    await sleep(400);
  }

  const { result } = await S('Runtime.evaluate', {
    expression: `JSON.stringify({
      w: innerWidth, h: Math.min(document.documentElement.scrollHeight, 6000),
      // 🔴 AGAINST clientWidth, NOT innerWidth. MEASURED 2026-09-26 on /eccm/ at
      // 375: a title with no break opportunity ran the page to 404 px, and
      // mobile Chrome widened the LAYOUT viewport to match, so innerWidth read
      // 404 as well and this line printed no overflow on a page that had 29 px
      // of it. clientWidth is the initial containing block and stays 375.
      dpr: devicePixelRatio, overflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      top: ${JSON.stringify(HASH)} ? Math.max(0, Math.floor((document.getElementById(${JSON.stringify(HASH)}) || document.body).getBoundingClientRect().top + scrollY) - 8) : 0,
    })`, returnByValue: true,
  });
  const page = JSON.parse(result.value);
  // with --hash the capture starts AT the block, not at the top of the page
  const height = Math.min(CLIP || page.h, page.h - page.top);

  const { data } = await S('Page.captureScreenshot', {
    format: 'png', captureBeyondViewport: true,
    clip: { x: 0, y: page.top, width: w, height, scale: 1 },
  });
  const file = join(OUT, `${slug}-${w}${HASH ? `-${HASH}` : ''}.png`);
  await writeFile(file, Buffer.from(data, 'base64'));
  shots.push({ w, file, page, height });

  /**
   * 🔴 SIDEWAYS OVERFLOW IS PRINTED WITH EVERY SHOT, BECAUSE IT IS THE ONE
   * PHONE DEFECT A PICTURE CANNOT SHOW. A document that is wider than the
   * screen looks perfectly normal in a capture clipped to the screen's width,
   * and the reader only finds out by dragging. This repository has measured
   * **141 px of page overflow** from `tabs.mjs` and **65 px** from a pad grid,
   * both at 390, and both times the page looked fine in every screenshot
   * anybody took of it.
   */
  console.log(`  ${String(w).padStart(4)} px  ${page.overflow ? `⚠ ${page.overflow} px OF SIDEWAYS OVERFLOW  ` : ''}${height} px tall  ${file}`);
}

await S('Emulation.clearDeviceMetricsOverride').catch(() => {});
ws.close();
chrome.kill();
await sleep(200);
await rm(PROFILE, { recursive: true, force: true }).catch(() => {});

const bad = shots.filter((s) => s.page.overflow > 0);
console.log(`\n${shots.length} shot(s) of /${slug}/${bad.length ? `, ${bad.length} with sideways overflow` : ', none dragging the page sideways'}`);
process.exit(bad.length ? 1 : 0);
