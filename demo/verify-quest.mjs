// demo/verify-quest.mjs — drives the META QUEST BROWSER on a real headset,
// over adb + CDP, the way demo/verify.mjs drives desktop Chrome.
//
//   node demo/verify-quest.mjs                # every built demo tagged `WebXR`
//                                             # in demo/manifest.mjs — the tag
//                                             # IS the list; there is no second one
//   node demo/verify-quest.mjs blocks         # just this one, by slug
//   node demo/verify-quest.mjs --all          # every built demo, on the headset
//   node demo/verify-quest.mjs --self-test    # the negative control; NO DEVICE NEEDED
//   DEMO_BASE=https://positron.studio node demo/verify-quest.mjs
//
// It skips cleanly — exit 0, with instructions — when there is no `adb` and
// when no device is attached. A check nobody can run is a check nobody runs.
//
// ⚠️ WHY THIS EXISTS. `verify.mjs` runs desktop Chrome. Measured on this Mac
// 2026-09-11, Chrome 152 headless, on a secure `http://127.0.0.1:<port>` origin:
//
//     navigator.xr                       present, a NATIVE XRSystem
//     isSessionSupported('inline')       true
//     isSessionSupported('immersive-vr') FALSE
//     isSessionSupported('immersive-ar') FALSE
//     (and on a fresh about:blank target, isSecureContext is false and
//      navigator.xr is absent entirely — so WHERE you ask changes the answer)
//
// So a headset demo's immersive branch is unreachable there, and per CLAUDE.md a
// page whose first assert sits behind that reports "asserted nothing" — which
// reads as broken — or asserts its own fallback and reads as fine. That is this
// project's most expensive recurring failure: 261/261 green while a demo was
// fatally broken on iPhone; 291 asserts across three pages that had never played
// a frame of HLS. XR would reproduce it exactly.
//
// ⚠️ AND THE CHEAP FIX IS THE SAME TRAP IN A NEW ACCENT. Meta ships the
// Immersive Web Emulator (a Chrome extension, and the runtime behind their MCP
// tooling) and says its coverage is "on par with the WebXR support in the Meta
// Quest Browser". That is a marketing claim, not a measurement — it is "desktop
// Chrome covers the iPhone path" with a different logo. The emulator supplies a
// FAKE XR device: no compositor, no real reprojection, no real frame budget, no
// real hand tracking. A suite graded on it is green about a machine nobody
// wears. So the first thing this file does is refuse to grade anything until it
// has established, four independent ways, that it is talking to real hardware
// — exactly the shape of verify-gl.mjs's SwiftShader refusal, for the same
// reason: without it every number below is unattributable.
//
// HOW IT SEPARATES A HEADSET FROM THE EMULATOR — four channels, two of them
// outside the browser entirely. ⚠️ THE TWO IN-PAGE ONES EACH CATCH EXACTLY WHAT
// THE OTHER CANNOT, which is why neither is used alone:
//
//   1. DEVICE IDENTITY, read over adb with `getprop`. A Chrome extension on a
//      laptop cannot put an Oculus/Meta hardware identity on the far end of an
//      adb connection. This is the far side of the boundary, and it is the one
//      that cannot be faked from page script. (CLAUDE.md: "a count is only
//      evidence on the far side of the boundary".)
//   2. THE XR OBJECT IS NATIVE, not a polyfill. Every method on `navigator.xr`'s
//      prototype must stringify as `[native code]`, `navigator` must not own the
//      property, and it must be an accessor on `Navigator.prototype`. IWER
//      installs a JavaScript XRSystem; JavaScript methods stringify to their
//      source. → catches a FAKE DEVICE. Passed by any real browser, headset or
//      not, so it cannot say "headset" on its own.
//   3. `isSessionSupported('immersive-vr')` IS TRUE. → catches a REAL BROWSER
//      WITH NO HEADSET (desktop Chrome answers false, measured above). Defeated
//      by a fake device, which answers true to everything — which is the whole
//      reason 2 exists. Neither gate is sufficient; together they are.
//   4. THE COMPOSITOR, via `adb logcat -s VrApi`, which prints `FPS=` and
//      `Stale=` once a second from OUTSIDE the page while a session presents.
//      An emulator has no compositor to print them.
//
// ⚠️ 2 AND 3 WERE ONE CHECK IN THE FIRST DRAFT, AND THAT WAS THE BUG THIS FILE
// IS ABOUT. "Is it a headset" was being answered by "is the XR object real",
// which is a question next to it and not it — CLAUDE.md's first rule. The
// negative control below is what caught it, on a machine with no headset in the
// building, which is the only reason it is not still in here.
//
// What it deliberately does NOT claim: **which Quest this is.** §1.7 of
// research/quest-xr-2026-09.md measured that a Quest 3S reports the user-agent
// device token `Quest 3`, same as a Quest 3 and same as the Xbox Edition. The
// model is PRINTED, from `getprop`, and never asserted on — and no line here
// says "Quest 3" on the strength of a user agent.
//
// Five adaptations somebody else already paid for (research §3.3):
//   · Do not create a tab. Quest Browser keeps launched intents around
//     aggressively; belowjs's harness refuses to add tabs. This attaches to an
//     EXISTING page target and navigates it.
//   · `Page.bringToFront` before anything XR — WebXR needs the page visible.
//   · `Runtime.evaluate` with `userGesture: true` for every control press;
//     `immersive-vr` needs a transient user activation.
//   · `Page.captureScreenshot` cannot see the immersive view, only the 2D panel.
//     Nothing here looks at ink, so that costs us nothing.
//   · The devtools socket name is NOT stable — three are in the wild. Discover
//     it from /proc/net/unix; never hard-code it.
//
// NOT DONE ON PURPOSE: Meta's Scriptable Testing Services can hold the device
// awake for an unattended run
// (`adb shell content call --uri content://com.oculus.rc --method SET_PROPERTY
// --extra … disable_autosleep`). Leaving that on drains the battery and risks
// burn-in — Meta says so. If you want it, set it by hand and restore it by
// hand; a harness that can crash is the wrong owner for that flag.
//
// Raw CDP over node's global WebSocket, no deps — house harness style, same as
// verify.mjs.

import { spawn, spawnSync } from 'node:child_process';
import { readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { serve } from './server.mjs';
import { DEMOS } from './manifest.mjs';

const ADB = process.env.ADB || 'adb';
// ⚠️ NOT verify.mjs's 8890 and not verify-gl.mjs's 8892: all three may be
// running. serve() takes the next free port anyway and says so, and the port
// ACTUALLY bound is read back below — a fixed port is a shared mutable global.
const HTTP_PORT = 8894;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const argv = process.argv.slice(2);
const SELF_TEST = argv.includes('--self-test');
const RUN_ALL = argv.includes('--all');
const want = argv.filter((a) => !a.startsWith('--'));

// ── the probe, defined ONCE ─────────────────────────────────────────────────
// Parameterised over the property name so the self-test below can run the very
// same source against a property whose nativeness is already known. A guard
// tested by a paraphrase of itself is not tested.
//
// It reads descriptors rather than values: touching an accessor on a prototype
// with the prototype as receiver throws "Illegal invocation" in Chromium, and a
// probe that throws reports "absent" about something that is present.
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

/**
 * Is this object supplied by the BROWSER, or installed by script?
 *
 * Every clause is a thing a JavaScript polyfill cannot have and a compiled-in
 * Web IDL attribute always has. `jsSourced` is the load-bearing one: IWER's
 * XRSystem is a JavaScript class, and a JavaScript method stringifies to its
 * own source.
 *
 * Returns { real, why } — `why` is printed either way, so a pass says what
 * convinced it rather than just saying yes.
 */
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

/**
 * Is a HEADSET on the other end of this browser?
 *
 * Two gates, and `gate` names which one refused — because "the XR object is
 * fake" and "the XR object is real and there is no headset behind it" are
 * different findings with different fixes, and a single boolean collapses them
 * into one message that is wrong half the time.
 */
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

// ─────────────────────────────────────────────────────────────────────────────
// THE NEGATIVE CONTROL
//
// ⚠️ PROVE A GUARD FIRES. The refusal above is the whole value of this file, and
// a refusal nobody has seen refuse is a hope. `--self-test` breaks it on purpose
// in a real browser, against the same NATIVE_PROBE source and the same
// nativeVerdict/headsetVerdict the real run uses — not a paraphrase of them.
//
//   A1  desktop Chrome's own navigator.xr   -> nativeVerdict must ACCEPT
//   A2  ...and the same browser             -> headsetVerdict must REFUSE, at
//                                              the `device` gate
//   B   an IWER-shaped JavaScript xr that
//       CLAIMS immersive-vr                 -> headsetVerdict must REFUSE, at
//                                              the `native` gate
//
// A1 is the positive control, and it is on the property actually in question
// rather than a stand-in: a guard that refuses everything would pass A2 and B
// and be worthless. A2 and B are the two halves that each catch what the other
// misses — B's fake answers `immersive-vr: true`, so gate 3 alone would wave it
// through; A2's browser is entirely genuine, so gate 2 alone would too.
//
// VERIFIED: run today, no headset in the building. The FIRST version of this
// self-test FAILED its own case A, and it was right to — the guard was asking
// "is the XR object real" where the question was "is there a headset". That is
// how these three cases came to exist in this shape.
// ─────────────────────────────────────────────────────────────────────────────
if (SELF_TEST) {
  const CHROME = process.env.CHROME
    || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const PROFILE = '/private/tmp/claude-501/verify-quest-selftest-udd';
  const server = await serve(HTTP_PORT);
  const base = `http://127.0.0.1:${server.address().port}`;

  // Chrome writes DevToolsActivePort as it starts, so clear it BEFORE the spawn
  // — removing it afterwards deletes the thing being waited for.
  await rm(`${PROFILE}/DevToolsActivePort`, { force: true }).catch(() => {});
  // Port 0 means "pick one", read back from the profile. A FIXED CDP PORT MEANS
  // YOU MAY BE TALKING TO THE PREVIOUS BROWSER — verify-gl.mjs's SwiftShader
  // test reported ANGLE Metal for exactly that reason.
  const chrome = spawn(CHROME, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${PROFILE}`,
    '--no-first-run', '--no-default-browser-check', '--mute-audio',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  chrome.stderr.on('data', () => {});

  let wsUrl = null;
  for (let i = 0; i < 60 && !wsUrl; i++) {
    await sleep(250);
    try {
      const port = (await readFile(`${PROFILE}/DevToolsActivePort`, 'utf8')).split('\n')[0].trim();
      if (!port) continue;
      wsUrl = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).webSocketDebuggerUrl;
    } catch { /* not up yet */ }
  }
  if (!wsUrl) { chrome.kill(); server.close(); throw new Error('chrome did not come up'); }

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

  // ── A · a genuine browser with no headset behind it ───────────────────────
  const aNative = nativeVerdict(await ev(NATIVE_PROBE('xr')));
  const aVr = await ev(`navigator.xr ? navigator.xr.isSessionSupported('immersive-vr').catch(() => null) : null`);
  const a = headsetVerdict(aNative, aVr);
  ok('A1 · desktop Chrome\'s own navigator.xr is ACCEPTED as native', aNative.real === true, aNative.why);
  ok('A2 · ...and the browser is still REFUSED as a headset, at the device gate',
     a.real === false && a.gate === 'device', a.why);

  // ── B · an IWER-shaped injection that says all the right things ───────────
  // A JavaScript XRSystem defined straight onto the navigator instance,
  // answering isSessionSupported('immersive-vr') with TRUE. That last part is
  // the whole point: it is a liar, and gate 3 believes it.
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
  cdp.close(); chrome.kill(); server.close();
  process.exit(fail ? 1 : 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// THE REAL RUN
// ─────────────────────────────────────────────────────────────────────────────

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

// ── ASSERT 1, BEFORE ANY PAGE: is this real hardware? ───────────────────────
// Read off the DEVICE, not out of the browser. A Chrome extension on a laptop
// cannot put an Oculus hardware identity on the far end of an adb connection,
// which is the whole reason this check is here and not in page script.
//
// One `getprop` with no argument returns the entire table, so there is no
// guessing which property name this build happens to carry — a guessed name
// that is absent reads as "not a Quest", which is a broken instrument reported
// as a finding.
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
// ⚠️ PRINTED, NEVER ASSERTED ON. §1.7: a Quest 3S reports the user-agent device
// token `Quest 3`, same as a Quest 3 and same as the Xbox Edition — so nothing
// here may say which one this is on the strength of a string. `getprop` MAY be
// more specific than the user agent; that is UNCONFIRMED and it is reported raw
// either way rather than interpreted.
console.log(`  model    ${prop('ro.product.model') || '(unset)'}   device ${prop('ro.product.device') || '(unset)'}`);
console.log(`  os       Horizon ${prop('ro.vros.build.version') || '(no ro.vros.build.version)'} · on Android ${prop('ro.build.version.release') || '?'} · build ${prop('ro.build.id') || prop('ro.build.version.incremental') || '?'}`);
console.log('  (the model string is reported, not asserted on: a Quest 3S and a Quest 3');
console.log('   are not distinguishable by user agent, so no line here claims which it is)');

if (!isHeadset) {
  // ⚠️ REFUSE, do not carry on — verify-gl.mjs's rule. A run graded on
  // something that is not the headset is a run about a machine nobody wears,
  // and burying that as "1 failure among 40 passes" is how it gets missed.
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

// ── the local server, reversed onto the device ──────────────────────────────
// `adb reverse` binds the listener on the DEVICE's loopback, so the page's
// origin really is http://localhost:<port> — which Meta blesses explicitly:
// "Browser allows WebXR on localhost servers without a secure connection or SSL
// certificate". A LAN IP is NOT a secure context and will not run WebXR.
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

// ── ASSERT 2: reach the Quest Browser's devtools socket ─────────────────────
// ⚠️ THE SOCKET NAME IS NOT STABLE. Three are in the wild:
//   com.oculus.browser_devtools_remote   Quest Browser's own
//   chrome_devtools_remote               the Android default
//   weblayer_devtools_remote_<pid>       when the system WebLayer took the URL
// IsaacTeleop forces `-p com.oculus.browser` specifically because WebLayer
// "does not fully plumb controller input sources through". So: discover the
// name, prefer the Browser's, and SAY which one was used.
//
// The grep is done here rather than on the device: BusyBox's `grep -o` is not
// the same tool everywhere, and shell quoting through `adb shell` is one more
// thing that can silently return nothing (LESSONS: a partial result that is too
// tidy is a broken collector, not a finding).
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
  // The Browser is not running, or not running debuggable. Start it ON the page
  // we want — this is also how you open a URL without wearing the headset.
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

// ⚠️ AND LET THE OS CHOOSE THE LOCAL PORT. A fixed one is a shared mutable
// global: verify-gl.mjs attached to a Chrome left over from the previous run and
// reported that run's flags. `adb forward tcp:0` prints the port it took.
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
// The Browser BUILD, from the browser itself. §1.7: the token is still
// `OculusBrowser/`, there is no `MetaQuestBrowser/`, and since the re-base the
// OculusBrowser major has equalled the Chrome major — OBSERVED, never
// announced, so both are printed and neither is derived from the other.
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

// ── attach to an EXISTING page; never create one ────────────────────────────
// Quest Browser keeps launched intents around aggressively, and belowjs's
// harness refuses to add tabs for that reason. verify.mjs's
// `Target.createTarget` is exactly the wrong move here.
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

// `userGesture` matters for every control press: immersive-vr needs a transient
// user activation. Our shell uses plain addEventListener('click'), so this
// should be enough on its own — ESTIMATED; IsaacTeleop needed a synthetic
// Input.dispatchMouseEvent as well, but only because React's onClick ignores
// the synthesised activation on Quest's touch-first routing.
async function ev(expr, { gesture = false } = {}) {
  const r = await S('Runtime.evaluate', {
    expression: expr, awaitPromise: true, returnByValue: true, userGesture: gesture,
  });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
}

// ── ASSERTS 3 AND 4: a real XR object, and a real device behind it ──────────
// This runs on a page from BASE, so the origin is the one the demos will use —
// asking on about:blank would answer about a different security context.
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
// Two asserts, never one. They fail for different reasons and the reasons have
// different fixes — see headsetVerdict.
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

// ── the compositor channel, from OUTSIDE the page ───────────────────────────
// `adb logcat -s VrApi` prints FPS= and Stale= once a second, from the
// compositor. That is the far side of the boundary: the page's own opinion of
// its frame rate and this number disagreeing is exactly the kind of thing this
// project exists to notice — and an emulator has no compositor to print them.
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
    // A 404 on an LL-HLS PART is normal at the live edge; ERR refuses segments
    // by programme rights with a 403 that reaches the page as CORS. Both are
    // recorded separately and CAPPED, never ignored — silence here would hide a
    // real outage as "normal churn". Same table as verify.mjs so a number means
    // the same thing in both.
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

// ── which demos ─────────────────────────────────────────────────────────────
// ⚠️ CHECKED AFTER THE HEADSET, NOT BEFORE IT — verify-gl.mjs's rule. Exiting
// early on "no XR demos yet" would mean this file could not answer the question
// it exists for, and it would read `0 green` on a desk with no headset on it,
// which is what it reads on a desk with one.
// ⚠️ SELECTED BY THE MANIFEST'S OWN `tags`, NOT BY A SECOND LIST. manifest.mjs
// already says `tags — the tech it actually uses; demo/shell/caps.mjs reads
// REQUIREMENTS off these, so there is no second needs: list to forget`. A
// `quest: true` flag alongside it would be exactly that second list, and this
// repo has already paid for keeping one identity in five places.
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
  // `selfcheck=1` for the same reason verify.mjs appends it: a page keeps
  // anything that opens a file, makes a sound, presses a control or moves the
  // picture behind that flag, so a harness that does not set it grades a page
  // with its checks switched off. ⚠️ DEMO_QUERY goes first, so an override wins.
  const q = [process.env.DEMO_QUERY, 'selfcheck=1'].filter(Boolean).join('&');
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
  // ⚠️ THE SAME OPT-OUT `demo/verify.mjs` HAS, AND THIS FILE DID NOT GROW IT.
  // A page may declare that it has nothing to put in a readout, and it says so
  // with `readout: null` rather than by omitting the field, so "this page's
  // subject is visible rather than numeric" cannot be confused with somebody
  // forgetting. `verify.mjs` has read that flag since `/typist/` shipped; this
  // harness went on asserting a readout, so `/floor/` dropping its four cells
  // on 2026-09-19 would have taken this file red on a page where nothing is
  // wrong. Two harnesses grading one rule two ways is the defect, not the page.
  ok(meta.readoutOptOut ? 'declares that it has no readout, on purpose' : 'declares a readout',
    meta.readoutOptOut || meta.keys.length > 0,
    meta.readoutOptOut ? 'the page itself is the readout' : meta.keys.join(','));

  // Every control, in order, WITH A USER GESTURE — a multi-step demo does not
  // put its asserts behind the first button, and an XR demo cannot enter a
  // session without an activation. `.tbar-x` too: a page may put a control
  // inside the transport bar, and a control the harness cannot press is a
  // subject the suite cannot reach.
  const SEL = '.pos-controls button, .tbar-x';
  const labels = await ev(`[...document.querySelectorAll(${JSON.stringify(SEL)})].map(b => b.textContent)`);
  for (let i = 0; i < (labels || []).length; i++) {
    await ev(`document.querySelectorAll(${JSON.stringify(SEL)})[${i}].click()`, { gesture: true });
    await sleep(i === 0 && t.settleMs ? t.settleMs : 900);
  }
  if (labels?.length) console.log(`        (pressed ${labels.map((l) => JSON.stringify(l)).join(', ')})`);

  // ⚠️ ZERO NEVER GROWS. Wait while the count is still 0 (a demo whose FIRST
  // assert sits behind work would otherwise report "asserted nothing", which
  // reads as broken rather than slow), then fall back to "stop when it stops
  // growing". Capped separately from settleMs, which sizes control 0.
  const FIRST_ASSERT_CEIL = 30000;
  const countAsserts = () => ev('(window.__demo && __demo.asserts.length) || 0');
  let n = await countAsserts();
  const firstBudget = Math.ceil(Math.min(t.settleMs || 0, FIRST_ASSERT_CEIL) / 400);
  for (let i = 0; i < firstBudget && n === 0; i++) { await sleep(400); n = await countAsserts(); }
  let prev = -1;
  for (let i = 0; i < 12 && n !== prev; i++) { prev = n; await sleep(400); n = await countAsserts(); }

  const asserts = await ev('__demo.asserts');
  ok('page asserted something', (asserts || []).length > 0, String((asserts || []).length));
  for (const a of asserts || []) ok(`page: ${a.label}`, a.pass, a.detail ?? undefined);

  // ── the compositor, for a page that says it presented ────────────────────
  // ⚠️ A LANE WITH NOTHING TO SAY MUST SAY SO IN WORDS. A page that does not
  // publish `__demo.xr` gets a sentence, not a zero: a blank cell collapses "we
  // did not look" and "we looked and it was fine", and a zero here would look
  // like a dropped-frame finding.
  //
  // FORWARD CONTRACT for an XR demo: publish
  //   __demo.xr = { presenting: <bool>, mode: 'immersive-vr', frames: <n> }
  // and this reads it. `frames` is the PAGE's count; `vrapi` below is the
  // compositor's. They are meant to be compared, not averaged.
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

/** A port the OS picked, released immediately. Only used where `tcp:0` was not
 *  honoured — there is a race here, and it is still better than a constant. */
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

// ─────────────────────────────────────────────────────────────────────────────
// WHAT IS UNCONFIRMED IN THIS FILE, because no headset was attached when it was
// written (2026-09-11). Everything below is reasoned or read out of
// research/quest-xr-2026-09.md, and NONE of it has been run against hardware:
//
//   · that a real Quest Browser's `navigator.xr` reads native by the test in
//     nativeVerdict(). It was verified against desktop Chrome 152's OWN native
//     XRSystem — the same class, on a secure origin — which is as close as this
//     gets without hardware. Quest Browser is Chromium and builds Web IDL
//     attributes the same way, but that is an argument, not a measurement. If a
//     genuine headset is REFUSED at the `native` gate, this line is why.
//   · that the Immersive Web Emulator's injection is caught. The self-test
//     catches an IWER-SHAPED stub written here; the real extension was never
//     installed and run against it. If IWER ever shadows `toString`, the
//     `native` gate is defeated and the adb `getprop` gate is what is left —
//     which is the reason that one is first and is read off the device.
//   · that `isSessionSupported('immersive-vr')` is true on a Quest whose wearer
//     has taken it off. §1.8 says a doff does not end or hide a session, so it
//     probably is — but nothing here depends on it, and the refusal message says
//     what to check rather than asserting a cause.
//   · `adb reverse tcp:0` printing the allocated device port. Documented for
//     `adb forward`; assumed for `reverse`, with a fallback either way.
//   · the exact `getprop` keys on Horizon OS. Nothing depends on one key — the
//     whole table is read and the test is "any ro.oculus/ro.vros property, or
//     an Oculus/Meta manufacturer, or com.oculus.browser installed".
//   · whether `getprop ro.product.model` distinguishes a 3 from a 3S. The user
//     agent does not (§1.7, measured). The model is printed raw and never
//     interpreted, so this cannot become a wrong claim.
//   · `adb logcat -s VrApi` line format. `FPS=` and `Stale=` are what §3.3
//     records; the parser takes them anywhere in the line and reports "no way
//     to check" rather than 0 when it finds none.
//   · that `userGesture: true` alone grants activation for `requestSession`.
//     Enough for belowjs; IsaacTeleop needed a synthetic mouse event too, but
//     for a React-specific reason our shell does not have.
//
// One layout note that is NOT a harness problem but will look like one: Quest
// Browser's default window is 1280 x 670 CSS pixels and `<meta viewport>` is
// ignored, so a demo's paragraph, readout, controls and log will not be on
// screen together for a human. Nothing here reads the DOM for numbers — every
// assert is on `window.__demo` — so the suite is unaffected either way.
// ─────────────────────────────────────────────────────────────────────────────
