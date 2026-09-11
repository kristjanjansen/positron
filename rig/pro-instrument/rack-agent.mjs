// rack-agent.mjs — answer "is the studio instrument set up?" over the relay, so
// a browser anywhere can ask without ssh, without OSC and without being on the
// LAN.
//
//   node rig/pro-instrument/rack-agent.mjs --room pro-1
//
// ⚠️ RUN IT FROM A TERMINAL ON THE STUDIO MAC, not over ssh. live-check.mjs's
// last two arms capture audio, and a capture started over ssh is deaf — the
// same device and the same ffmpeg read -91.0 dB over ssh and a real room in the
// login session. The agent reaches the session by AppleEvent to iTerm2, which
// only works when there is a session to reach.
//
// ⚠️ AND IT DOES NOT RE-RUN THE CHECK ON EVERY ASK. The full check takes ~25 s
// because two of its arms are real 2-3 second recordings, and a page that asked
// for it would sit there looking broken. `rack.status` answers instantly from
// the last run and SAYS HOW OLD IT IS; `rack.check` starts a fresh one. A
// cached answer presented as a live one is the defect this repo keeps naming —
// so the age is part of the payload, never omitted.

// Node's own WebSocket — no `ws` dependency, the same choice rig/box/box.mjs
// made. This repo has no build step and adding one module to run one socket is
// not the way to start having one.
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const ROOM = arg('room', 'pro-1');
const RELAY = arg('relay', 'wss://ws.positron.studio');
const HERE = dirname(fileURLToPath(import.meta.url));
const FROM = `rack-${Math.random().toString(36).slice(2, 8)}`;

let seq = 0, ws = null;
let last = null, lastAt = 0, running = null;

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const send = (msg) => {
  if (ws?.readyState !== 1) return false;
  ws.send(JSON.stringify({ ...msg, from: FROM, at: Date.now(), seq: seq++ }));
  return true;
};

/** One check at a time. A second ask while one is in flight joins the first. */
function check() {
  if (running) return running;
  running = new Promise((resolve) => {
    execFile('node', [join(HERE, 'live-check.mjs'), '--json'],
      { timeout: 120000, maxBuffer: 1 << 20, env: { ...process.env, LIVE_HOST: process.env.LIVE_HOST || '127.0.0.1' } },
      (err, stdout) => {
        // ⚠️ A NON-ZERO EXIT IS A RESULT, NOT AN ERROR. live-check exits 1 when
        // any link fails, which is the most interesting case there is — reading
        // that as "the check crashed" would throw away every useful answer.
        let parsed = null;
        try { parsed = JSON.parse(stdout); } catch { /* genuinely broken */ }
        if (parsed) { last = parsed; lastAt = Date.now(); }
        else log('check produced no JSON', err?.message || '');
        running = null;
        resolve(parsed);
      });
  });
  return running;
}

const payload = () => ({
  room: ROOM,
  results: last?.results || null,
  // How stale, in words the page can print without doing arithmetic on a clock
  // it does not share. Null when nothing has ever run.
  ageSec: last ? Math.round((Date.now() - lastAt) / 1000) : null,
  pass: last ? last.results.filter((r) => r.ok).length : null,
  total: last ? last.results.length : null,
  checking: !!running,
});

function connect() {
  ws = new WebSocket(`${RELAY}/room/${ROOM}/ws`);
  ws.onopen = () => { log(`joined ${ROOM} as ${FROM}`); send({ type: 'rack.up', ...payload() }); };
  ws.onmessage = async (e) => {
    if (typeof e.data !== 'string') return;
    let m; try { m = JSON.parse(e.data); } catch { return; }
    if (m.from === FROM) return;                   // the relay echoes the sender back
    if (m.type === 'rack.status') { send({ type: 'rack.state', ...payload() }); return; }
    if (m.type === 'rack.check') {
      send({ type: 'rack.state', ...payload(), checking: true });
      await check();
      send({ type: 'rack.state', ...payload() });
    }
  };
  ws.onclose = () => { log('socket closed — back in 3 s'); setTimeout(connect, 3000); };
  ws.onerror = (e) => log('socket error', e.message || e.type);
}

log(`checking the rig once before anyone asks (~25 s)…`);
await check();
log(`${payload().pass}/${payload().total}`);
connect();
