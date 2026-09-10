// Launch the synth page on the instrument machine with the permissions it needs.
//
// WHY A LAUNCHER: headless Chrome will not enumerate a MIDI port or an audio
// input from a command-line flag. `--use-fake-ui-for-media-devices` is
// INSUFFICIENT under headless=new (already paid for, CLAUDE.md), so the grants
// have to come over CDP -- Browser.grantPermissions -- BEFORE the page asks.
// Navigate first and the page's requestMIDIAccess has already been refused.
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
  '--autoplay-policy=no-user-gesture-required', `--remote-debugging-port=${PORT}`,
  'about:blank'], { stdio: 'ignore', detached: true });
ch.unref();
await sleep(4000);

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find((t) => t.type === 'page');
const ws = await new Promise((r) => { const s = new WebSocket(page.webSocketDebuggerUrl); s.onopen = () => r(s); });
let id = 1; const pend = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (pend.has(d.id)) { pend.get(d.id)(d.result); pend.delete(d.id); } };
const cmd = (method, params) => new Promise((r) => { const i = id++; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });

await cmd('Browser.grantPermissions', {
  origin: 'http://127.0.0.1:8890',
  permissions: ['midi', 'midiSysex', 'audioCapture'],
});
console.log('granted: midi, midiSysex, audioCapture');
await cmd('Page.navigate', { url });
console.log('opened :', url);

await sleep(7000);
const r = await cmd('Runtime.evaluate', { expression: 'document.querySelector("pre").textContent', returnByValue: true });
console.log('--- page log ---');
console.log(r?.result?.value ?? '(no log)');
process.exit(0);
