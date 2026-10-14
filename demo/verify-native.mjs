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
import { serve } from './server.mjs';
import { launchChrome } from './chrome.mjs';

// 🔴 RETIRED 2026-10-13, AND IT WOULD NOW PASS ABOUT NOTHING. This harness
// drives /llhls/, whose live input (positron-demo) and publisher (pub's /watch)
// were deleted that day. /llhls/ now answers a press with "this leg was retired
// 2026-10-13" and builds no player, so the native branch of
// src/low-latency-player.js never runs and a run here would read PASS with zero
// coverage. It refuses instead. The player's one live caller left is
// /video/llhls/ (LL-HLS loopback, a camera on its own input), which this
// file does not drive; re-pointing it there is open in BACKLOG.md.
if (!process.argv.includes('--anyway')) {
  console.log('demo/verify-native.mjs is retired (2026-10-13): /llhls/ has no stream behind it, so nothing would be graded. See the header.');
  process.exit(2);
}

// Chrome's port and per-run profile come from demo/chrome.mjs. This file once
// pointed its profile at a dead session's scratchpad, and two runs shared it.

// Its own server, on whatever port the OS gives, read back from the socket.
const server = process.env.DEMO_BASE ? null : await serve(8890);
const BASE = process.env.DEMO_BASE || `http://127.0.0.1:${server.address().port}`;
console.log(`base ${BASE}`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let browser = null;
try {
  browser = await launchChrome({
    prefix: 'demo-verify-native-udd', tries: 40, every: 500,
    args: ['--autoplay-policy=no-user-gesture-required'],
  });
} catch {
  console.log('FAIL could not reach Chrome'); server?.close(); process.exit(1);
}
const ws = browser.wsUrl;

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

sock.close(); await browser.close(); server?.close();
process.exit(tdz.length ? 1 : 0);
