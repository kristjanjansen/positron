// rig/box/ask.mjs — a client, so the box can be driven from a terminal.
//
// The point of §8.7 is that a browser is one client among several, not the
// interface. This is the proof: curl-shaped, no page, same room, same envelope.
//
//   node ask.mjs --room studio-1 ports.get
//   node ask.mjs --room studio-1 patch.plan  '{"v":1,"links":[{"from":"circuit","to":"microfreak"}]}'
//   node ask.mjs --room studio-1 patch.apply '{"v":1,"links":[{"from":"digitakt","to":"microfreak"}]}'
//   node ask.mjs --room studio-1 listen 5            watch everything for 5 s
import { format, parse, randomId, RELAY_BASE } from '../../demo/shell/wire.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const rest = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--room');
const ROOM = arg('room', 'box-dev');
const VERB = rest[0] ?? 'ports.get';
const BODY = rest[1];

const FROM = `ask-${randomId(6)}`;
let seq = 0, bytes = 0, frames = 0;
const RELAY = arg('relay', RELAY_BASE);
const ws = new WebSocket(`${RELAY}/room/${ROOM}/ws`);
ws.binaryType = 'arraybuffer';

const timeout = setTimeout(() => {
  console.error(`no reply in 5 s — is a box joined to "${ROOM}"?`);
  process.exit(1);
}, (VERB === 'listen' ? Number(BODY ?? 5) * 1000 + 500 : 5000));

ws.onopen = () => {
  if (VERB === 'listen') { console.error(`listening on ${ROOM} for ${BODY ?? 5}s ...`); return; }
  let body;
  if (BODY) { try { body = JSON.parse(BODY); } catch (e) { console.error('body is not JSON:', e.message); process.exit(1); } }
  // A patch verb takes a DOCUMENT and everything else takes FIELDS. Nesting
  // both under `patch` meant `audio.start {"source":"yoshimi"}` arrived with
  // no source at all and fell back to the built-in synth, reporting ok:true for
  // an instrument nobody asked for, which is the worst kind of wrong.
  const wrap = body ? (VERB.startsWith('patch.') ? { patch: body } : body) : {};
  ws.send(format({ type: VERB, ...wrap }, { from: FROM, seq: seq++ }));
};

ws.onmessage = (e) => {
  if (typeof e.data !== 'string') { frames++; bytes += e.data.byteLength; return; }
  const { kind, msg } = parse(e.data);
  if (kind !== 'json' || msg.from === FROM) return;
  if (VERB === 'listen') { console.log(`${msg.type.padEnd(16)} ${msg.from}  ${JSON.stringify(msg).slice(0, 150)}`); return; }
  if (msg.type === 'box.hello' || msg.type === 'box.alive') return;   // ambient, not a reply
  clearTimeout(timeout);
  const { id, from, at, seq: _s, re, ...body } = msg;
  console.log(JSON.stringify(body, null, 2));
  ws.close(); process.exit(0);
};

if (VERB === 'listen') setTimeout(() => {
  if (frames) console.error(`\n${frames} binary frames, ${(bytes / 1024).toFixed(1)} KiB`);
  process.exit(0);
}, Number(BODY ?? 5) * 1000);
