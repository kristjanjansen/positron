// Launch the synth page on the instrument machine with the permissions it needs.
//
// WHY A LAUNCHER, and two traps inside it:
//
//  1. `--use-fake-ui-for-media-devices` DOES NOT WORK -- not headless, and
//     measured here, not headful either. It left Chrome's own bubble sitting on
//     screen as a window ("wants to: Use your microphones") while getUserMedia
//     hung forever. `--auto-accept-camera-and-microphone-capture` is the flag
//     that actually answers it.
//  2. Browser.grantPermissions MUST go to the BROWSER target, from
//     /json/version. Sent to a page target it returns "ok" and does nothing:
//     permission stayed "prompt", and enumerateDevices returned ONE anonymous
//     input where CoreAudio had five. On the browser target the same call gives
//     "granted" and BlackHole appears by name.
//
// The flag alone is not enough either: it auto-accepts each REQUEST without
// persisting a GRANT, and enumerateDevices needs the grant to reveal labels --
// so a device chosen BY NAME is unfindable while audio still records.
//
//   node launch-synth.mjs [--ableton] [--relay <url>] [--relay-for <url>] [--cert <sha256>]
import { spawn } from 'node:child_process';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9224, UDD = '/tmp/pro-synth-udd';
const arg = (k, d = null) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const q = new URLSearchParams({ room: arg('--room', 'proinst') });
if (process.argv.includes('--ableton')) q.set('instrument', 'ableton');
if (arg('--relay')) q.set('moqRelay', arg('--relay'));
if (arg('--relay-for')) q.set('moqRelayFor', arg('--relay-for'));
if (arg('--cert')) q.set('moqCert', arg('--cert'));
const url = `http://127.0.0.1:8890/rig/pro-instrument/synth.html?${q}`;

spawn('pkill', ['-f', UDD]);
await sleep(1500);
const ch = spawn(CHROME, ['--headless=new', `--user-data-dir=${UDD}`, '--no-first-run',
  '--autoplay-policy=no-user-gesture-required',
  '--auto-accept-camera-and-microphone-capture',
  `--remote-debugging-port=${PORT}`,
  'about:blank'], { stdio: 'ignore', detached: true });
ch.unref();
await sleep(4000);

// The BROWSER target — /json/version, not a page from /json/list.
const ver = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
const bws = await new Promise((r) => { const s = new WebSocket(ver.webSocketDebuggerUrl); s.onopen = () => r(s); });
let bid = 1; const bpend = new Map();
bws.onmessage = (m) => { const d = JSON.parse(m.data); if (bpend.has(d.id)) { bpend.get(d.id)(d); bpend.delete(d.id); } };
const bcmd = (method, params) => new Promise((r) => { const i = bid++; bpend.set(i, r); bws.send(JSON.stringify({ id: i, method, params })); });

const grant = await bcmd('Browser.grantPermissions', {
  origin: 'http://127.0.0.1:8890',
  permissions: ['midi', 'midiSysex', 'audioCapture'],
});
if (grant.error) { console.log('GRANT FAILED:', grant.error.message); process.exit(1); }
console.log('granted: midi, midiSysex, audioCapture (browser target)');

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find((t) => t.type === 'page');
const ws = await new Promise((r) => { const s = new WebSocket(page.webSocketDebuggerUrl); s.onopen = () => r(s); });
let id = 1; const pend = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (pend.has(d.id)) { pend.get(d.id)(d.result); pend.delete(d.id); } };
const cmd = (method, params) => new Promise((r) => { const i = id++; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await cmd('Page.navigate', { url });
console.log('opened :', url);

await sleep(7000);
const r = await cmd('Runtime.evaluate', { expression: 'document.querySelector("pre").textContent', returnByValue: true });
console.log('--- page log ---');
console.log(r?.result?.value ?? '(no log)');
process.exit(0);
