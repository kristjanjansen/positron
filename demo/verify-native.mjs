// demo/verify-native.mjs — exercise the NATIVE-HLS branch of the player.
//
//   node demo/verify-native.mjs       # exits 1 on any scope/init error
//   DEMO_BASE=https://positron.studio node demo/verify-native.mjs
//
// It starts its own server. It used to require `node demo/server.mjs &` on
// :8890 and then hardcode that number — which stopped being true the moment
// `serve()` learned to take the next free port, because then the URL points at
// whatever else is on 8890, or at nothing.
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
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import { serve } from './server.mjs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// ⚠️ A FIXED CDP PORT MEANS YOU MAY BE TALKING TO THE PREVIOUS BROWSER, and
// with two agents in one checkout it means the OTHER ONE'S. `verify-gl.mjs`
// carries this warning and acts on it; this file carried the bug. 0 is "pick
// one", read back from the profile — never guessed.
const CDP_PORT = 0;

// 🔴 AND THE PROFILE IS PER-PROCESS. This line used to read
//
//   /private/tmp/claude-501/-Users-s32863-personal-elektron/
//   d558ee42-19e7-4e7e-b95a-63e51b4c5e37/scratchpad/native-udd
//
// — a dead session's scratchpad, under the repo's PRE-RENAME name. Chrome
// creates whatever path it is handed, so nothing ever said otherwise: the
// third surviving artifact of elektron→positron, on the one harness that
// reaches the iPhone code path. Two agents running this at once shared one
// profile and one lock, and that is the same rule as the port above.
const PROFILE = `/private/tmp/claude-501/demo-verify-native-udd-${process.pid}`;

// Its own server, on whatever port the OS gives, read back from the socket.
const server = process.env.DEMO_BASE ? null : await serve(8890);
const BASE = process.env.DEMO_BASE || `http://127.0.0.1:${server.address().port}`;
console.log(`base ${BASE}`);

const chrome = spawn(CHROME, [
  `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${PROFILE}`,
  '--headless=new', '--no-first-run', '--autoplay-policy=no-user-gesture-required',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let cdpPort = null;
const get = (path) => new Promise((res, rej) => {
  http.get({ host: '127.0.0.1', port: cdpPort, path }, (r) => {
    let b = ''; r.on('data', (c) => (b += c)); r.on('end', () => res(JSON.parse(b)));
  }).on('error', rej);
});

let ws = null;
for (let i = 0; i < 40 && !ws; i++) {
  await sleep(500);
  try {
    // the port we ACTUALLY got, from our own profile
    if (!cdpPort) cdpPort = Number((await readFile(`${PROFILE}/DevToolsActivePort`, 'utf8')).split('\n')[0]);
    if (!Number.isFinite(cdpPort) || !cdpPort) { cdpPort = null; continue; }
    ws = (await get('/json/version')).webSocketDebuggerUrl;
  } catch {}
}
if (!ws) { console.log('FAIL could not reach Chrome'); chrome.kill(); server?.close(); process.exit(1); }

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

await send('Page.navigate', { url: `${BASE}/llhls/?player=native` }, sessionId);
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

sock.close(); chrome.kill(); server?.close();
process.exit(tdz.length ? 1 : 0);
