// Launch the synth page with its permissions. `--auto-accept-camera-and-microphone-capture`
// (the fake-ui flag hangs), plus Browser.grantPermissions on the BROWSER target for device labels.
// node launch-synth.mjs [--ableton] [--relay <url>] [--relay-for <url>] [--cert <sha256>]
// why: lessons/rig-m1.md#launch-synth-header
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
for (const k of ['latencyMax', 'groupMs', 'frameUs']) if (arg('--' + k)) q.set(k, arg('--' + k));
const url = `http://127.0.0.1:8890/rig/m1/synth.html?${q}`;

spawn('pkill', ['-f', UDD]);
await sleep(1500);
// Headful, launched with `open -na`: headless Chrome and ssh-spawned GUI apps get no audio input.
// why: lessons/rig-m1.md#launch-synth-open
spawn('open', ['-na', 'Google Chrome', '--args',
  `--user-data-dir=${UDD}`, '--no-first-run',
  '--autoplay-policy=no-user-gesture-required',
  '--auto-accept-camera-and-microphone-capture',
  `--remote-debugging-port=${PORT}`,
  'about:blank'], { stdio: 'ignore' });
await sleep(4000);

// The BROWSER target from /json/version, not a page from /json/list.
// why: lessons/rig-m1.md#launch-synth-target
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

// Stay alive: the grant lasts only while this CDP client is connected.
// why: lessons/rig-m1.md#launch-synth-hold
console.log('\nholding the permission grant open — Ctrl-C to stop the bridge');
process.stdin.resume();
