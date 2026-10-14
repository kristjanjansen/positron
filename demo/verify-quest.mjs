// node demo/verify-quest.mjs [slug | --all | --self-test]: the Meta Quest Browser over adb and CDP,
// `WebXR`-tagged demos. Refuses to grade until real hardware is shown four ways (getprop, a native
// navigator.xr, immersive-vr supported, VrApi logcat); no emulator. Skips cleanly with no device.
// why: lessons/harness.md#quest

import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { serve } from './server.mjs';
import { DEMOS } from './manifest.mjs';
import { launchChrome } from './chrome.mjs';

const ADB = process.env.ADB || 'adb';
// Not 8890 or 8892, since all three harnesses may run; the bound port is read back anyway.
// why: lessons/harness.md#quest-port
const HTTP_PORT = 8894;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const argv = process.argv.slice(2);
const SELF_TEST = argv.includes('--self-test');
const RUN_ALL = argv.includes('--all');
const want = argv.filter((a) => !a.startsWith('--'));
// Two tiers as in verify.mjs: DEMO_DEEP=1 or --deep is selfcheck=2 with the full settleMs.
// why: lessons/harness.md#quest-tiers
const DEEP = process.env.DEMO_DEEP === '1' || argv.includes('--deep');
const settleOf = (t) => (DEEP || t.lightSettleMs == null ? t.settleMs : t.lightSettleMs);

// The probe, defined once and parameterised so the self-test runs the same source. It reads
// descriptors: reading a prototype accessor on the prototype throws "Illegal invocation".
// why: lessons/harness.md#native-probe
const NATIVE_PROBE = (prop) => `(() => {
  const name = ${JSON.stringify(prop)};
  const own = Object.prototype.hasOwnProperty.call(navigator, name);
  const d = Object.getOwnPropertyDescriptor(Navigator.prototype, name);
  const proto = !d ? 'none' : typeof d.get === 'function' ? 'accessor' : 'data';
  let obj = null;
  try { obj = navigator[name] || null; } catch { obj = null; }
  const methods = [], jsSourced = [];
  if (obj) {
    const p = Object.getPrototypeOf(obj) || obj;
    for (const k of Object.getOwnPropertyNames(p)) {
      if (k === 'constructor') continue;
      const md = Object.getOwnPropertyDescriptor(p, k);
      if (!md || typeof md.value !== 'function') continue;   // skip accessors
      methods.push(k);
      if (!String(md.value).includes('[native code]')) jsSourced.push(k);
    }
  }
  return {
    prop: name,
    present: !!obj,
    own, proto,
    ctor: obj && obj.constructor ? obj.constructor.name : null,
    methods, jsSourced,
    secure: !!self.isSecureContext,
    origin: location.origin,
    ua: navigator.userAgent,
  };
})()`;

// Is this object the browser's or script's? A JavaScript method stringifies to its own source.
// Returns { real, why }; `why` is printed either way.
// why: lessons/harness.md#native-verdict
function nativeVerdict(p) {
  if (!p.present) {
    return {
      real: false,
      why: p.secure
        ? `navigator.${p.prop} is absent`
        : `navigator.${p.prop} is absent — and ${p.origin} is NOT a secure context, which is reason enough on its own (WebXR is [SecureContext]; use http://localhost, not a LAN IP)`,
    };
  }
  if (p.jsSourced.length) {
    return {
      real: false,
      why: `${p.jsSourced.join(', ')} ${p.jsSourced.length > 1 ? 'are' : 'is'} JavaScript source, not [native code]`
        + ` — something installed a polyfill over navigator.${p.prop}, which is exactly what the Immersive Web Emulator (IWER) does`,
    };
  }
  if (p.own) {
    return {
      real: false,
      why: `navigator owns \`${p.prop}\` as its own property; a browser with it compiled in puts it on Navigator.prototype`,
    };
  }
  if (p.proto !== 'accessor') {
    return { real: false, why: `Navigator.prototype.${p.prop} is '${p.proto}', not an accessor` };
  }
  return {
    real: true,
    why: `${p.ctor || '?'} · ${p.methods.length} method${p.methods.length === 1 ? '' : 's'}, all [native code] · accessor on Navigator.prototype`,
  };
}

// Is a headset behind this browser? Two gates, and `gate` names which refused: a fake object and a
// real one with no headset are different findings.
// why: lessons/harness.md#headset-verdict
function headsetVerdict(native, vrSupported) {
  if (!native.real) return { real: false, gate: 'native', why: native.why };
  if (vrSupported !== true) {
    return {
      real: false,
      gate: 'device',
      why: `navigator.xr is the browser's own, but isSessionSupported('immersive-vr') is ${vrSupported}`
        + ' — a real browser with no headset behind it, which is what desktop Chrome answers',
    };
  }
  return { real: true, gate: null, why: `${native.why} · immersive-vr supported` };
}

// ── reporting, identical to verify.mjs's ────────────────────────────────────
let pass = 0, fail = 0;
const ok = (label, cond, detail) => {
  if (cond) { pass++; console.log(`  ok    ${label}${detail !== undefined ? `  — ${detail}` : ''}`); }
  else { fail++; console.log(`  FAIL  ${label}${detail !== undefined ? `  — ${detail}` : ''}`); }
};

// --self-test proves the guard fires, no device needed: desktop Chrome's xr must pass as native
// (A1)
// and fail the headset gate (A2); an IWER-shaped JS xr claiming immersive-vr must fail native (B).
// why: lessons/harness.md#self-test
if (SELF_TEST) {
  const server = await serve(HTTP_PORT);
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await launchChrome({ prefix: 'verify-quest-selftest-udd', args: ['--mute-audio'] })
    .catch((e) => { server.close(); throw e; });
  const wsUrl = browser.wsUrl;

  const cdp = await connect(wsUrl);
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const S = (m, p) => cdp.send(m, p, sessionId);
  await S('Page.enable'); await S('Runtime.enable');
  const ev = async (expr) => {
    const r = await S('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  // A real origin, so `isSecureContext` is true and the probe runs the same path
  // it runs on the headset rather than an about:blank special case.
  await S('Page.navigate', { url: `${base}/` });
  await sleep(900);

  console.log('\n[self-test — the headset guard, broken on purpose]');
  console.log(`  browser  ${(await ev('navigator.userAgent')).replace(/^Mozilla\/5\.0 /, '')}`);
  console.log(`  origin   ${await ev('location.origin')}  secure=${await ev('!!self.isSecureContext')}`);

  // A: a genuine browser with no headset behind it.
  // why: lessons/harness.md#case-a
  const aNative = nativeVerdict(await ev(NATIVE_PROBE('xr')));
  const aVr = await ev(`navigator.xr ? navigator.xr.isSessionSupported('immersive-vr').catch(() => null) : null`);
  const a = headsetVerdict(aNative, aVr);
  ok('A1 · desktop Chrome\'s own navigator.xr is ACCEPTED as native', aNative.real === true, aNative.why);
  ok('A2 · ...and the browser is still REFUSED as a headset, at the device gate',
     a.real === false && a.gate === 'device', a.why);

  // B: a JavaScript XRSystem on the navigator answering immersive-vr true, which gate 3 believes.
  // why: lessons/harness.md#case-b
  await ev(`(() => {
    class XRSystem extends EventTarget {
      async isSessionSupported(mode) { return mode === 'immersive-vr' || mode === 'immersive-ar'; }
      async requestSession() { return { fake: true }; }
    }
    Object.defineProperty(navigator, 'xr', { value: new XRSystem(), configurable: true });
    globalThis.XRSystem = XRSystem;
  })()`);
  const bVr = await ev(`navigator.xr.isSessionSupported('immersive-vr')`);
  const b = headsetVerdict(nativeVerdict(await ev(NATIVE_PROBE('xr'))), bVr);
  ok('B · a JavaScript navigator.xr is REFUSED at the native gate, though it claims immersive-vr',
     b.real === false && b.gate === 'native' && bVr === true && /polyfill|IWER/.test(b.why), b.why);

  console.log(`\n${pass}/${pass + fail} green${fail ? `  (${fail} FAILED)` : ''}`);
  console.log('(this proves the guard discriminates; it says nothing about any headset)\n');
  cdp.close(); await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}

// The real run.
// why: lessons/harness.md#real-run

/** adb, with the exit status handed back rather than thrown. */
function adb(args) {
  const r = spawnSync(ADB, args, { encoding: 'utf8', timeout: 30000 });
  return {
    ok: !r.error && r.status === 0,
    missing: !!(r.error && r.error.code === 'ENOENT'),
    out: (r.stdout || '').trim(),
    err: (r.error ? r.error.message : r.stderr || '').trim(),
  };
}

function skip(lines) {
  console.log('\nquest harness — SKIPPED');
  for (const l of lines) console.log(`  ${l}`);
  console.log('');
  process.exit(0);
}

// ── is there an adb at all? ─────────────────────────────────────────────────
if (adb(['version']).missing) {
  skip([
    `no \`${ADB}\` on PATH. This is the only harness that can reach the Quest Browser;`,
    'demo/verify.mjs runs desktop Chrome, which has no navigator.xr at all.',
    '',
    '  brew install --cask android-platform-tools',
    '  (or set ADB=/path/to/adb — Meta Quest Developer Hub bundles one, and two',
    '   adb servers on one machine fight over the device)',
    '',
    'You can still exercise this file\'s headset guard with no device at all:',
    '  node demo/verify-quest.mjs --self-test',
  ]);
}

// ── is there a device? ──────────────────────────────────────────────────────
adb(['start-server']);
const devLines = adb(['devices', '-l']).out.split('\n').slice(1)
  .map((l) => l.trim()).filter(Boolean)
  .map((l) => { const [serial, state] = l.split(/\s+/); return { serial, state, raw: l }; });

const usable = devLines.filter((d) => d.state === 'device');
const unauthorized = devLines.filter((d) => d.state === 'unauthorized');

if (!devLines.length) {
  skip([
    'no device attached. Plug the headset in over USB and, the first time:',
    '',
    '  1. Meta Horizon phone app -> headset icon -> your headset ->',
    '     Headset Settings -> Developer Mode -> ON.',
    '     (Needs a Meta developer account in a team. A one-person org is enough;',
    '      organisation verification is only for publishing to the Store.)',
    '  2. In the headset: Settings -> Developer -> enable MTP Notification.',
    '  3. Plug in USB, put the headset ON, and accept "Always allow from this',
    '     computer" on the prompt. It appears INSIDE the headset, not on the Mac.',
    '  4. adb devices   ->  the serial must read `device`, not `unauthorized`.',
    '',
    'Then: node demo/verify-quest.mjs',
  ]);
}
if (!usable.length && unauthorized.length) {
  console.log('\nquest harness — REFUSING TO GRADE ANYTHING.');
  console.log(`  ${unauthorized.length} device(s) attached but UNAUTHORIZED:`);
  for (const d of unauthorized) console.log(`    ${d.raw}`);
  console.log('  Put the headset on and accept "Always allow from this computer".');
  console.log('  The prompt is inside the headset; there is nothing to click on the Mac.\n');
  process.exit(1);
}
if (!usable.length) {
  console.log('\nquest harness — REFUSING TO GRADE ANYTHING.');
  console.log(`  device(s) attached but not ready:`);
  for (const d of devLines) console.log(`    ${d.raw}`);
  console.log('  `adb kill-server && adb start-server`, then re-plug.\n');
  process.exit(1);
}
if (usable.length > 1 && !process.env.ANDROID_SERIAL) {
  // NOT a skip: there IS hardware here, and grading the wrong one silently is
  // the same class of mistake as attaching to a leftover browser on a fixed
  // port. Name the ambiguity and stop.
  console.log('\nquest harness — REFUSING TO GRADE ANYTHING.');
  console.log('  more than one device is attached and adb would pick for us:');
  for (const d of usable) console.log(`    ${d.raw}`);
  console.log(`  ANDROID_SERIAL=${usable[0].serial} node demo/verify-quest.mjs\n`);
  process.exit(1);
}

// ── teardown, registered before anything is allocated ───────────────────────
const toRemove = [];              // [['forward'|'reverse', spec], …]
let logcat = null, server = null, cdp = null;
let cleaned = false;
function cleanup() {
  if (cleaned) return;
  cleaned = true;
  for (const [kind, spec] of toRemove) adb([kind, '--remove', spec]);
  try { logcat?.kill(); } catch { /* already gone */ }
  try { cdp?.close(); } catch { /* already closed */ }
  try { server?.close(); } catch { /* already closed */ }
}
process.on('exit', cleanup);
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { cleanup(); process.exit(130); });

// Assert 1, before any page: real hardware, read off the device with one full `getprop`.
// why: lessons/harness.md#assert-1
const props = new Map();
for (const line of adb(['shell', 'getprop']).out.split('\n')) {
  const m = /^\[([^\]]+)\]:\s*\[(.*)\]\s*$/.exec(line.trim());
  if (m) props.set(m[1], m[2]);
}
const prop = (k) => props.get(k) || '';
const oculusProps = [...props.keys()].filter((k) => /^ro\.(oculus|vros)\./.test(k));
const packages = adb(['shell', 'pm', 'list', 'packages']).out;
const hasBrowser = /package:com\.oculus\.browser\b/.test(packages);

const brandish = `${prop('ro.product.manufacturer')} ${prop('ro.product.brand')} ${prop('ro.product.vendor.manufacturer')}`;
const isHeadset = /oculus|meta/i.test(brandish) || oculusProps.length > 0 || hasBrowser;

console.log('\n[device]');
console.log(`  serial   ${process.env.ANDROID_SERIAL || usable[0].serial}`);
ok('this is Quest hardware, read off the device and not out of a user agent',
   isHeadset,
   isHeadset
     ? `${prop('ro.product.manufacturer') || '?'} · ${oculusProps.length} ro.oculus/ro.vros properties · com.oculus.browser ${hasBrowser ? 'installed' : 'ABSENT'}`
     : `manufacturer "${prop('ro.product.manufacturer')}", model "${prop('ro.product.model')}", no Oculus properties, no com.oculus.browser`);
// Printed, never asserted: a Quest 3S reports the user-agent token `Quest 3`.
// why: lessons/harness.md#model
console.log(`  model    ${prop('ro.product.model') || '(unset)'}   device ${prop('ro.product.device') || '(unset)'}`);
console.log(`  os       Horizon ${prop('ro.vros.build.version') || '(no ro.vros.build.version)'} · on Android ${prop('ro.build.version.release') || '?'} · build ${prop('ro.build.id') || prop('ro.build.version.incremental') || '?'}`);
console.log('  (the model string is reported, not asserted on: a Quest 3S and a Quest 3');
console.log('   are not distinguishable by user agent, so no line here claims which it is)');

if (!isHeadset) {
  // Refuse to grade the rest: a run on anything but the headset is about a machine nobody wears.
  // why: lessons/harness.md#quest-refuse
  console.log('\n  ⚠ REFUSING TO GRADE ANYTHING ELSE.');
  console.log('    Whatever is on the other end of this adb connection is not a Quest.');
  console.log('    This harness exists to reach the real compositor; nothing else it could');
  console.log('    report would be evidence about one.\n');
  process.exit(1);
}
if (!hasBrowser) {
  console.log('\n  ⚠ REFUSING TO GRADE ANYTHING ELSE.');
  console.log('    com.oculus.browser is not installed, so there is no Quest Browser to drive.\n');
  process.exit(1);
}

// `adb reverse` makes the page's origin http://localhost:<port>, where WebXR runs without TLS.
// A LAN IP is not a secure context.
// why: lessons/harness.md#reverse
let BASE = process.env.DEMO_BASE || null;
if (!BASE) {
  server = await serve(HTTP_PORT);
  const hostPort = server.address().port;      // what was ACTUALLY bound
  // Let the far end choose too. `tcp:0` is documented for `adb forward`, which
  // prints the port it took; for `adb reverse` it is UNCONFIRMED, so the answer
  // is parsed and a free port is picked here when it does not come back.
  let devicePort = null;
  const rev = adb(['reverse', 'tcp:0', `tcp:${hostPort}`]);
  if (rev.ok && /^\d+$/.test(rev.out)) devicePort = Number(rev.out);
  if (!devicePort) {
    devicePort = await freePort();
    const rev2 = adb(['reverse', `tcp:${devicePort}`, `tcp:${hostPort}`]);
    if (!rev2.ok) { console.log(`\nadb reverse failed: ${rev2.err || rev2.out}\n`); process.exit(1); }
  }
  toRemove.push(['reverse', `tcp:${devicePort}`]);
  BASE = `http://localhost:${devicePort}`;
  console.log(`\nbase ${BASE}  (device loopback -> this Mac's :${hostPort})`);
} else {
  console.log(`\nbase ${BASE}`);
}
console.log(DEEP ? 'tier: DEEP, the long-running checks included'
  : 'tier: ordinary (DEMO_DEEP=1 node demo/verify-quest.mjs ... adds the long-running checks)');

// Assert 2: the devtools socket, discovered from /proc/net/unix (three names exist), preferring
// com.oculus.browser's, and said which. Grepped here, not on the device.
// why: lessons/harness.md#sockets
function findSockets() {
  const unix = adb(['shell', 'cat', '/proc/net/unix']).out;
  const names = new Set();
  for (const m of unix.matchAll(/@([\w.\-]*devtools_remote[\w.\-]*)/g)) names.add(m[1]);
  return [...names];
}
function rankSocket(n) {
  if (n.startsWith('com.oculus.browser')) return 0;
  if (n === 'chrome_devtools_remote') return 1;
  return 2;                                     // weblayer_… and anything new
}

let sockets = findSockets();
if (!sockets.length) {
  // Start the Browser on the page we want; also how to open a URL without wearing the headset.
  // why: lessons/harness.md#start-browser
  console.log('  no devtools socket yet — starting com.oculus.browser');
  adb(['shell', 'am', 'start', '-a', 'android.intent.action.VIEW',
       '-d', `${BASE}/`, '-p', 'com.oculus.browser']);
  for (let i = 0; i < 30 && !sockets.length; i++) { await sleep(1000); sockets = findSockets(); }
}

console.log('\n[browser]');
ok('a devtools socket was DISCOVERED (never hard-coded)', sockets.length > 0,
   sockets.length ? sockets.join(', ') : 'none in /proc/net/unix — is Developer Mode on?');
if (!sockets.length) {
  console.log('\n  ⚠ REFUSING TO GRADE ANYTHING ELSE. No socket, no CDP, no evidence.\n');
  process.exit(1);
}

const socket = sockets.sort((a, b) => rankSocket(a) - rankSocket(b))[0];
if (rankSocket(socket) === 2) {
  console.log(`  ⚠ using ${socket}, which looks like the system WebLayer rather than Browser.`);
  console.log('    WebLayer does not fully plumb controller input sources through, so an');
  console.log('    input assert here may be about WebLayer and not about Quest Browser.');
}

// Let the OS choose the local port: `adb forward tcp:0` prints it.
// why: lessons/harness.md#local-port
let localPort = null;
const fwd = adb(['forward', 'tcp:0', `localabstract:${socket}`]);
if (fwd.ok && /^\d+$/.test(fwd.out)) localPort = Number(fwd.out);
if (!localPort) {
  localPort = await freePort();
  const fwd2 = adb(['forward', `tcp:${localPort}`, `localabstract:${socket}`]);
  if (!fwd2.ok) { console.log(`\nadb forward failed: ${fwd2.err || fwd2.out}\n`); process.exit(1); }
}
toRemove.push(['forward', `tcp:${localPort}`]);
console.log(`  socket   ${socket}  ->  127.0.0.1:${localPort}`);

let version = null;
for (let i = 0; i < 40 && !version; i++) {
  try { version = await (await fetch(`http://127.0.0.1:${localPort}/json/version`)).json(); }
  catch { await sleep(250); }
}
if (!version?.webSocketDebuggerUrl) {
  console.log('\n  ⚠ the forwarded port never answered /json/version.\n');
  process.exit(1);
}
// The Browser build from the browser itself; OculusBrowser and Chrome versions both printed.
// why: lessons/harness.md#build
const uaLine = version['User-Agent'] || '';
const browserBuild = /OculusBrowser\/([\d.]+)/.exec(uaLine)?.[1] || null;
const chromeBuild = /Chrome\/([\d.]+)/.exec(uaLine)?.[1] || version.Browser || '?';
ok('it is the Quest Browser (an OculusBrowser build)', !!browserBuild,
   browserBuild ? `OculusBrowser/${browserBuild} · Chrome/${chromeBuild}` : uaLine || '(no user agent reported)');
if (!browserBuild) {
  console.log('\n  ⚠ REFUSING TO GRADE ANYTHING ELSE.');
  console.log('    This socket belongs to some other Chromium on the device.\n');
  process.exit(1);
}

// Attach to an existing page target and navigate it; never create a tab.
// why: lessons/harness.md#targets
async function pageTargets() {
  const list = await (await fetch(`http://127.0.0.1:${localPort}/json/list`)).json();
  return list.filter((t) => t.type === 'page' && !/^devtools:|^chrome:/.test(t.url || ''));
}
let pages = await pageTargets();
if (!pages.length) {
  adb(['shell', 'am', 'start', '-a', 'android.intent.action.VIEW',
       '-d', `${BASE}/`, '-p', 'com.oculus.browser']);
  for (let i = 0; i < 20 && !pages.length; i++) { await sleep(1000); pages = await pageTargets(); }
}
if (!pages.length) {
  console.log('\n  ⚠ no page target to drive, and starting Browser did not make one.\n');
  process.exit(1);
}
const target = pages[0];
console.log(`  tab      ${(target.title || '(untitled)').slice(0, 40)}  ${String(target.url).slice(0, 60)}`);
console.log(`  (reusing this tab — this harness never opens one, and never closes yours)`);

cdp = await connect(version.webSocketDebuggerUrl);
const { sessionId } = await cdp.send('Target.attachToTarget', { targetId: target.id, flatten: true });
const S = (m, p) => cdp.send(m, p, sessionId);
await S('Page.enable'); await S('Runtime.enable'); await S('Log.enable'); await S('Network.enable');
// WebXR requires the page to be VISIBLE (IsaacTeleop). Do it before anything XR
// is asked for, not after a session request has already been refused.
await S('Page.bringToFront').catch(() => {});

// `userGesture` on every press: immersive-vr needs a transient activation (enough for plain
// listeners).
// why: lessons/harness.md#quest-gesture
async function ev(expr, { gesture = false } = {}) {
  const r = await S('Runtime.evaluate', {
    expression: expr, awaitPromise: true, returnByValue: true, userGesture: gesture,
  });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
}

// Asserts 3 and 4 on a page from BASE: about:blank is a different security context.
// why: lessons/harness.md#assert-3
await S('Page.navigate', { url: `${BASE}/` });
await sleep(1200);
const xrProbe = await ev(NATIVE_PROBE('xr'));
const xr = nativeVerdict(xrProbe);

let vrSupported = null, arSupported = null;
if (xr.real) {
  const sup = await ev(`(async () => ({
    vr: await navigator.xr.isSessionSupported('immersive-vr').catch(() => null),
    ar: await navigator.xr.isSessionSupported('immersive-ar').catch(() => null),
  }))()`);
  vrSupported = sup.vr; arSupported = sup.ar;
}
const headset = headsetVerdict(xr, vrSupported);

console.log('\n[webxr]');
console.log(`  origin   ${xrProbe.origin}  secure=${xrProbe.secure}`);
// Two asserts, never one: they fail for different reasons with different fixes.
// why: lessons/harness.md#two-asserts
ok('navigator.xr is the BROWSER\'S, not an emulator polyfill', xr.real, xr.why);
ok('immersive-vr is supported — something is actually on your head', vrSupported === true,
   xr.real ? `immersive-vr ${vrSupported} · immersive-ar ${arSupported}` : 'not asked: there is no genuine navigator.xr to ask');

if (!headset.real) {
  console.log('\n  ⚠ REFUSING TO GRADE ANYTHING ELSE.');
  if (headset.gate === 'device') {
    console.log('    The browser is genuine and it reports no immersive device behind it, so');
    console.log('    nothing below would be about one. Desktop Chrome answers exactly this.');
    console.log('    On a headset the thing to check first is that the page is VISIBLE and');
    console.log('    frontmost — bringToFront was called, but a system dialog can still be over it.');
  } else {
    console.log('    A fake XR device answers every question and measures nothing:');
    console.log('    no compositor, no reprojection, no real frame budget, no hands.');
    console.log('    Meta says the Immersive Web Emulator is "on par with the Meta Quest Browser".');
    console.log('    That is a marketing claim, and it is "desktop Chrome covers the iPhone path"');
    console.log('    in a new accent. Run this against the headset, not against the emulator.');
  }
  console.log('');
  process.exit(1);
}

// The compositor's FPS= and Stale= from `adb logcat -s VrApi`, outside the page.
// why: lessons/harness.md#vrapi
const vrapi = [];                       // { t, fps, stale }
adb(['logcat', '-c']);
logcat = spawn(ADB, ['logcat', '-s', 'VrApi'], { stdio: ['ignore', 'pipe', 'ignore'] });
let logBuf = '';
logcat.stdout.on('data', (chunk) => {
  logBuf += chunk;
  const lines = logBuf.split('\n');
  logBuf = lines.pop();
  for (const l of lines) {
    const fps = /FPS=(\d+(?:\.\d+)?)/.exec(l);
    if (!fps) continue;
    const stale = /Stale=(\d+)/.exec(l);
    vrapi.push({ t: Date.now(), fps: Number(fps[1]), stale: stale ? Number(stale[1]) : null });
  }
});
logcat.on('error', () => { /* no logcat: reported as "cannot tell", never as 0 */ });

// ── page errors, the same buckets verify.mjs keeps ──────────────────────────
let errors = [], failedReqs = [], abortedReqs = [], edgeMisses = [], probed = [];
const reqUrl = new Map();
cdp.listeners.push((m) => {
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
    // LL-HLS part 404s and ERR rights 403s are recorded separately and capped, as in verify.mjs.
    // why: lessons/harness.md#edge-404
    if (/seg_\d+_part|_part_all\.mp4|\.m4s(\?|$)/.test(e.url || '') && /\b404\b/.test(e.text || '')) edgeMisses.push(e.url);
    else if (/live\.err\.ee/.test(`${e.url || ''} ${e.text || ''}`) && /\b403\b|CORS|ERR_FAILED/.test(e.text || '')) probed.push(e.url);
    else errors.push(e.text);
  }
  if (m.method === 'Network.loadingFailed') {
    const url = reqUrl.get(m.params.requestId) || '';
    if (m.params.errorText === 'net::ERR_ABORTED') abortedReqs.push(m.params.errorText);
    else if (m.params.corsErrorStatus && /live\.err\.ee/.test(url)) probed.push(url);
    else failedReqs.push(`${m.params.errorText}${url ? ` ${url.slice(0, 70)}` : ''}`);
  }
});

// Checked after the headset; selected by the manifest's own `WebXR` tag, not a second list.
// why: lessons/harness.md#which-demos
const isXr = (d) => (d.tags || []).includes('WebXR');
const built = DEMOS.filter((d) => d.built);
const targets = want.length
  ? built.filter((d) => want.includes(d.name))
  : RUN_ALL ? built : built.filter(isXr);

if (!targets.length) {
  console.log(`\n${want.length
    ? `no built demo named ${want.join(', ')}`
    : 'no built demo is tagged `WebXR` in manifest.mjs yet — but this headset can grade one when there is.'}`);
  if (!want.length) console.log('(`node demo/verify-quest.mjs --all` runs every built demo on the headset instead.)');
  console.log(`\n${pass}/${pass + fail} green${fail ? `  (${fail} FAILED)` : ''}`);
  console.log(`device: ${prop('ro.product.model') || '?'} · OculusBrowser/${browserBuild} · Chrome/${chromeBuild}\n`);
  cleanup();
  process.exit(fail ? 1 : 0);
}

// ── the pages, on the same __demo contract verify.mjs uses ──────────────────
for (const t of targets) {
  console.log(`\n[${t.name}]`);
  errors = []; failedReqs = []; abortedReqs = []; edgeMisses = []; probed = []; reqUrl.clear();
  const sinceT = Date.now();
  // selfcheck=1 as in verify.mjs; DEMO_QUERY first so an override wins.
  // why: lessons/harness.md#quest-selfcheck
  const q = [process.env.DEMO_QUERY, DEEP ? 'selfcheck=2' : 'selfcheck=1'].filter(Boolean).join('&');
  const query = `?${q}`;
  await S('Page.navigate', { url: `${BASE}/${t.name}/${query}` });
  // A headset over USB is slower to first paint than a local Chrome; the wait
  // is bounded below anyway, this is just the floor.
  await sleep(2000);
  await S('Page.bringToFront').catch(() => {});

  let ready = false;
  for (let i = 0; i < 60 && !ready; i++) {
    ready = await ev('!!(window.__demo && window.__demo.ready)');
    if (!ready) await sleep(250);
  }
  ok('__demo.ready', ready);
  if (!ready) { console.log(`        failed: ${await ev('window.__demo && window.__demo.failed')}`); continue; }

  const meta = await ev('({ name: __demo.name, keys: Object.keys(__demo.readout), readoutOptOut: !!__demo.readoutOptOut })');
  ok('identity matches manifest', meta.name === t.name, meta.name);
  // The same `readout: null` opt-out verify.mjs reads.
  // why: lessons/harness.md#quest-readout
  ok(meta.readoutOptOut ? 'declares that it has no readout, on purpose' : 'declares a readout',
    meta.readoutOptOut || meta.keys.length > 0,
    meta.readoutOptOut ? 'the page itself is the readout' : meta.keys.join(','));

  // Every control in order with a user gesture, `.tbar-x` too.
  // why: lessons/harness.md#quest-controls
  const SEL = '.pos-controls button, .tbar-x';
  const labels = await ev(`[...document.querySelectorAll(${JSON.stringify(SEL)})].map(b => b.textContent)`);
  for (let i = 0; i < (labels || []).length; i++) {
    await ev(`document.querySelectorAll(${JSON.stringify(SEL)})[${i}].click()`, { gesture: true });
    await sleep(i === 0 && settleOf(t) ? settleOf(t) : 900);
  }
  if (labels?.length) console.log(`        (pressed ${labels.map((l) => JSON.stringify(l)).join(', ')})`);

  // Wait while the count is zero, capped separately, then stop when it stops growing.
  // why: lessons/harness.md#quest-first-assert
  const FIRST_ASSERT_CEIL = 30000;
  const countAsserts = () => ev('(window.__demo && __demo.asserts.length) || 0');
  let n = await countAsserts();
  const firstBudget = Math.ceil(Math.min(settleOf(t) || 0, FIRST_ASSERT_CEIL) / 400);
  for (let i = 0; i < firstBudget && n === 0; i++) { await sleep(400); n = await countAsserts(); }
  let prev = -1;
  for (let i = 0; i < 12 && n !== prev; i++) { prev = n; await sleep(400); n = await countAsserts(); }

  const asserts = await ev('__demo.asserts');
  ok('page asserted something', (asserts || []).length > 0, String((asserts || []).length));
  for (const a of asserts || []) ok(`page: ${a.label}`, a.pass, a.detail ?? undefined);

  // A page that does not publish `__demo.xr` gets a sentence, not a zero. Contract:
  // __demo.xr = { presenting, mode: 'immersive-vr', frames }; compare `frames` with VrApi's.
  // why: lessons/harness.md#page-xr
  const pageXr = await ev('window.__demo && window.__demo.xr ? __demo.xr : null');
  const seen = vrapi.filter((s) => s.t >= sinceT);
  const fpsList = seen.map((s) => s.fps).sort((a, b) => a - b);
  const median = fpsList.length ? fpsList[fpsList.length >> 1] : null;
  const stale = seen.reduce((a, s) => a + (s.stale || 0), 0);
  if (pageXr && pageXr.presenting) {
    ok('the compositor was running while the page presented', seen.length > 0,
       seen.length
         ? `VrApi median ${median} fps over ${seen.length} s, ${stale} stale`
         : 'VrApi printed nothing — the page says it presented and the compositor disagrees');
    if (typeof pageXr.frames === 'number' && seen.length) {
      console.log(`        (page counted ${pageXr.frames} frames; the compositor's own number is above — compare them, do not average)`);
    }
  } else if (seen.length) {
    console.log(`        (VrApi: median ${median} fps over ${seen.length} s, ${stale} stale — no page said it presented, so this is context, not a verdict)`);
  } else {
    console.log(`        (no way to check the compositor: ${pageXr ? 'the page did not present' : 'this page does not publish __demo.xr'})`);
  }

  // Same ceilings and the same wording as verify.mjs, folded into one assert so
  // the suite total does not vary run to run.
  const EDGE_CEILING = 25, PROBE_CEILING = 60;
  const edgeOk = edgeMisses.length <= EDGE_CEILING;
  const probedOk = probed.length <= PROBE_CEILING;
  ok('no console errors', errors.length === 0 && edgeOk && probedOk,
    (errors.slice(0, 2).join(' | ') || '0')
    + (edgeMisses.length ? `  (+${edgeMisses.length} live-edge part 404${edgeMisses.length > 1 ? 's' : ''}${edgeOk ? ', normal' : ` — OVER the ceiling of ${EDGE_CEILING}`})` : '')
    + (probed.length ? `  (+${probed.length} upstream refusal${probed.length > 1 ? 's' : ''} the demos probe for${probedOk ? ', expected' : ` — OVER the ceiling of ${PROBE_CEILING}`})` : ''));
  ok('no failed requests', failedReqs.length === 0, failedReqs.slice(0, 2).join(' | ') || '0');
  if (abortedReqs.length) console.log(`        (${abortedReqs.length} aborted on teardown — expected for a media page)`);
}

console.log(`\n${pass}/${pass + fail} green${fail ? `  (${fail} FAILED)` : ''}`);
console.log(`device: ${prop('ro.product.model') || '?'} · OculusBrowser/${browserBuild} · Chrome/${chromeBuild}`);
console.log('(the model is what the device reports; a 3 and a 3S are not distinguishable by user agent)\n');
cleanup();
process.exit(fail ? 1 : 0);

// ── plumbing ────────────────────────────────────────────────────────────────

/** One raw-CDP connection. Same shape verify.mjs speaks, extracted so the
 *  self-test and the real run cannot drift apart. */
async function connect(url) {
  const ws = new WebSocket(url);
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
  return {
    listeners,
    close: () => ws.close(),
    send: (method, params = {}, sessionId) => new Promise((resolve, reject) => {
      const id = ++msgId;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
      setTimeout(() => { if (pending.delete(id)) reject(new Error('cdp timeout: ' + method)); }, 30000);
    }),
  };
}

// A port the OS picked, only where `tcp:0` was not honoured; racy, still better than a constant.
// why: lessons/harness.md#quest-free-port
function freePort() {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.on('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

// Written with no headset attached; what is unconfirmed (native gate on a real Quest, IWER's real
// extension, getprop keys, VrApi format, reverse tcp:0) is listed in the lessons.
// why: lessons/harness.md#unconfirmed
