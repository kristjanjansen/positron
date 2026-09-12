// rig/scene/say.mjs — tell whoever is wearing the headset what is going on.
//
//   node rig/scene/say.mjs working on the ray, then the panel
//   node rig/scene/say.mjs --shader /path/sky.glsl   # tier 2, session survives
//   node rig/scene/say.mjs --module 3                # tier 3, session survives
//   node rig/scene/say.mjs --reload e146cc5          # tier 4, THEY choose when
//
// 🔴 THE 2D PAGE IS INVISIBLE INSIDE AN IMMERSIVE SESSION, so a `d.log` line or
// a readout cell reaches nobody who is actually wearing the thing. This is the
// only channel that does: the page draws what arrives here on a panel in the
// room. It exists so that watching somebody's code get written does not require
// taking the headset off.
//
// ⚠️ AND IT IS ONE MESSAGE, NOT A STREAM. The relay's MEASURED ceiling is 60
// msg/s and it drops silently past that, so a build log piped through here
// would be indistinguishable from a broken socket. Say the state, not the
// output.
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
  ws.send(JSON.stringify({ ...msg, from: ID, at: Date.now(), seq: 0 }));
  console.log(`-> ${ROOM}: ${msg.type}${msg.text ? ` "${msg.text}"` : ''}`);
  // ⚠️ A CLOSE CAN OUTRUN THE FRAME. Closing straight after send has dropped
  // the message before now — the relay is a hop away and the socket does not
  // wait for it. A short beat, then go.
  setTimeout(() => { ws.close(); process.exit(0); }, 400);
};
ws.onerror = (e) => { console.error('relay:', e.message || 'refused'); process.exit(1); };
