// demo/verify-native.mjs — exercise the NATIVE-HLS branch of the player.
//
//   node demo/server.mjs &            # :8890
//   node demo/verify-native.mjs       # exits 1 on any scope/init error
//
// WHY THIS EXISTS. demo/verify.mjs reported 261/261 green while 06 was
// completely broken on an iPhone: the native branch threw "Cannot access
// 'lastAdvT' before initialization" on every tick and the page showed nothing.
// The suite could not see it, because desktop Chrome resolves useNative to
// false and never enters that branch — so a whole code path had zero coverage
// while appearing fully tested.
//
// Chrome cannot PLAY native HLS (canPlayType returns ''), so ?player=native
// forces the branch and playback does not work. That is fine and deliberate:
// what is asserted here is "this path runs without throwing", not "video
// plays". A TDZ, a typo or a missing hoist all surface anyway.
//
// Run it after ANY change to src/low-latency-player.js. The iPhone takes a path
// the main suite cannot reach.
// Chrome cannot PLAY native HLS, so playback will not work — but the branch
// still executes, and executing it is what catches a TDZ or a typo. This is the
// gap that let "Cannot access 'lastAdvT' before initialization" reach a phone:
// verify only ever ran the hls.js path, because desktop Chrome never picks
// native. What is asserted here is "the code path runs without throwing", not
// "video plays".
import { spawn } from 'node:child_process';
import http from 'node:http';

const PORT = 9333;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const udd = '/private/tmp/claude-501/-Users-s32863-personal-elektron/d558ee42-19e7-4e7e-b95a-63e51b4c5e37/scratchpad/native-udd';

const chrome = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${udd}`,
  '--headless=new', '--no-first-run', '--autoplay-policy=no-user-gesture-required',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = (path) => new Promise((res, rej) => {
  http.get({ host: '127.0.0.1', port: PORT, path }, (r) => {
    let b = ''; r.on('data', (c) => (b += c)); r.on('end', () => res(JSON.parse(b)));
  }).on('error', rej);
});

let ws = null;
for (let i = 0; i < 40; i++) {
  try { const v = await get('/json/version'); ws = v.webSocketDebuggerUrl; break; }
  catch { await sleep(500); }
}
if (!ws) { console.log('FAIL could not reach Chrome'); chrome.kill(); process.exit(1); }

const sock = new WebSocket(ws);
await new Promise((r, j) => { sock.onopen = r; sock.onerror = j; });
let id = 0;
const pending = new Map();
const errors = [];
sock.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  if (msg.method === 'Runtime.exceptionThrown') {
    errors.push(msg.params.exceptionDetails?.exception?.description
      || msg.params.exceptionDetails?.text || 'unknown');
  }
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
    errors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '));
  }
};
const send = (method, params = {}, sessionId) => new Promise((res) => {
  const n = ++id;
  pending.set(n, res);
  sock.send(JSON.stringify({ id: n, method, params, ...(sessionId ? { sessionId } : {}) }));
});

const { result: { targetId } } = await send('Target.createTarget', { url: 'about:blank' });
const { result: { sessionId } } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Runtime.enable', {}, sessionId);
await send('Page.enable', {}, sessionId);

const url = process.env.DEMO_BASE
  ? `${process.env.DEMO_BASE}/llhls/?player=native`
  : 'http://127.0.0.1:8890/demo/llhls/?player=native';
await send('Page.navigate', { url }, sessionId);
await sleep(4000);

// press Start, then let the native branch run its interval a few times
const ev = async (expr) => {
  const r = await send('Runtime.evaluate',
    { expression: expr, awaitPromise: true, returnByValue: true }, sessionId);
  if (r.result?.exceptionDetails) return { err: r.result.exceptionDetails.exception?.description };
  return r.result?.result?.value;
};
console.log('ready:', await ev('!!window.__demo'));
console.log('press:', await ev(`document.querySelectorAll('.pos-controls button')[0].click()`));
await sleep(14000);

const state = await ev(`JSON.stringify({
  player: window.__demo?.player?.player ?? null,
  logs: (window.__demo?.logs ?? []).slice(-6),
})`);
console.log('state:', state);

const tdz = errors.filter((e) => /before initialization|is not defined|Cannot access/.test(e));
console.log(`\nconsole errors: ${errors.length}`);
for (const e of errors.slice(0, 6)) console.log('   ' + String(e).slice(0, 150));
console.log(tdz.length
  ? `\nFAIL — ${tdz.length} initialization/scope error(s): the native path is broken`
  : '\nPASS — the native path executed with no initialization or scope errors');

sock.close(); chrome.kill();
process.exit(tdz.length ? 1 : 0);
