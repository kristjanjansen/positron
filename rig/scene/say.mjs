// node rig/scene/say.mjs <text> | --shader <glsl> | --module <n> | --reload <sha>: a panel message
// to whoever wears the headset (the 2D page is invisible in an immersive session).
// One message, never a stream: the relay rate cap drops silently.
// why: lessons/rig-misc.md#say-header
import { readFileSync } from 'node:fs';

const arg = (k, d = null) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const ROOM = arg('room', 'scene-demo');
const RELAY = arg('relay', 'wss://ws.positron.studio');
const ID = `say-${Math.random().toString(36).slice(2, 8)}`;

let msg;
if (arg('shader')) msg = { type: 'dev.shader', sky: readFileSync(arg('shader'), 'utf8') };
else if (arg('module')) msg = { type: 'dev.module', v: arg('module') };
else if (arg('reload')) msg = { type: 'dev.reload', build: arg('reload') };
else {
  const words = [];
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i].startsWith('--')) { i++; continue; }
    words.push(process.argv[i]);
  }
  if (!words.length) { console.error('say what?'); process.exit(1); }
  msg = { type: 'dev.status', text: words.join(' ') };
}

const ws = new WebSocket(`${RELAY}/room/${ROOM}/ws`);
ws.onopen = () => {
  ws.send(JSON.stringify({ ...msg, from: ID, sent: Date.now(), seq: 0 }));
  console.log(`-> ${ROOM}: ${msg.type}${msg.text ? ` "${msg.text}"` : ''}`);
  // Wait a beat before closing: an immediate close has dropped the message.
  // why: lessons/rig-misc.md#say-close
  setTimeout(() => { ws.close(); process.exit(0); }, 400);
};
ws.onerror = (e) => { console.error('relay:', e.message || 'refused'); process.exit(1); };
