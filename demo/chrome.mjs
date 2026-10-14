// demo/chrome.mjs: one headless Chrome for a harness, and the CDP socket to it.
//
// Every path out kills Chrome and removes its profile: close() on the normal
// path, and an `exit` listener for the rest (an early process.exit, an uncaught
// throw or rejection, and SIGINT, SIGTERM or SIGHUP, which are turned into an
// exit here). why: lessons in CLAUDE.md "How a session is run", and
// .claude/skills/positron-verify "Close every Chrome you start".

import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { rm, readFile } from 'node:fs/promises';
import { claimProfile } from './harness-profile.mjs';

export const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const live = new Set();
let hooked = false;
function hookExit() {
  if (hooked) return;
  hooked = true;
  // Synchronous on purpose: an `exit` listener cannot await. SIGKILL comes
  // first so a Chrome still shutting down cannot recreate the profile.
  process.on('exit', () => { for (const b of live) b.killNow(); });
  const codes = { SIGINT: 130, SIGTERM: 143, SIGHUP: 129 };
  for (const [sig, code] of Object.entries(codes)) process.on(sig, () => process.exit(code));
}

/**
 * Start headless Chrome on a per-run profile and wait for its CDP endpoint.
 * The port is 0 and read back from the profile's DevToolsActivePort, never guessed.
 *
 * @param {object} o
 * @param {string} o.prefix  profile name prefix, `<prefix>-<pid>` under harness-profile's ROOT
 * @param {string[]} [o.args]  flags after the common five
 * @param {boolean} [o.clearCache]  remove the profile's HTTP cache before the spawn
 * @param {number} [o.tries]  polls of DevToolsActivePort
 * @param {number} [o.every]  ms between polls
 * @returns {Promise<{proc, port: number, wsUrl: string, profile: string, swept: number, close: () => Promise<void>}>}
 *   throws `chrome did not come up` after killing it and removing the profile.
 */
export async function launchChrome({ prefix, args = [], clearCache = false, tries = 60, every = 250 } = {}) {
  hookExit();
  const claimed = claimProfile(prefix);
  const profile = claimed.dir;
  if (clearCache) await rm(`${profile}/Default/Cache`, { recursive: true, force: true }).catch(() => {});
  // before the spawn: Chrome writes it as it starts
  await rm(`${profile}/DevToolsActivePort`, { force: true }).catch(() => {});

  const proc = spawn(CHROME, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', ...args,
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  proc.stderr.on('data', () => {});
  let exited = false;
  const gone = new Promise((r) => proc.once('exit', () => { exited = true; r(); }));

  const b = {
    proc, profile, port: null, wsUrl: null, swept: claimed.swept,
    killNow() {
      if (!exited) { try { proc.kill('SIGKILL'); } catch { /* already gone */ } }
      try { rmSync(profile, { recursive: true, force: true }); } catch { /* best effort */ }
      live.delete(b);
    },
    // SIGKILL and wait for the process's own exit before removing the profile,
    // capped at 3 s so a wedged browser cannot hang the run.
    async close() {
      if (!exited) { try { proc.kill('SIGKILL'); } catch { /* already gone */ } }
      await Promise.race([gone, sleep(3000)]);
      b.killNow();
    },
  };
  live.add(b);

  for (let i = 0; i < tries && !b.wsUrl; i++) {
    await sleep(every);
    try {
      if (!b.port) b.port = Number((await readFile(`${profile}/DevToolsActivePort`, 'utf8')).split('\n')[0]);
      if (!Number.isFinite(b.port) || !b.port) { b.port = null; continue; }
      b.wsUrl = (await (await fetch(`http://127.0.0.1:${b.port}/json/version`)).json()).webSocketDebuggerUrl;
    } catch { /* not up yet */ }
  }
  if (!b.wsUrl) { await b.close(); throw new Error('chrome did not come up'); }
  return b;
}

/**
 * A CDP socket on the browser endpoint. Events go to every `on()` listener.
 * `page()` makes a blank target and returns a sender bound to its session,
 * because the browser endpoint has no Page domain.
 * @param {string} wsUrl
 * @param {{timeout?: number}} [o]  reject a call after this many ms; 0 waits for ever
 */
export async function connectCdp(wsUrl, { timeout = 0 } = {}) {
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
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
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    if (timeout) setTimeout(() => { if (pending.delete(id)) reject(new Error('cdp timeout: ' + method)); }, timeout);
  });
  const page = async () => {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    return { targetId, sessionId, S: (m, p) => send(m, p, sessionId) };
  };
  return { ws, send, page, on: (fn) => listeners.push(fn), close: () => ws.close() };
}
