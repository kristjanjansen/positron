// Drive the board from a terminal: node ask.mjs --room studio-1 <verb> ['<json>'], or `listen 5`.
// why: lessons/rig-board-io.md#ask-header
import { format, parse, randomId, RELAY_BASE } from '../../demo/shell/wire.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const rest = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--room');
const ROOM = arg('room', 'board-dev');
const VERB = rest[0] ?? 'ports.get';
const BODY = rest[1];

const FROM = `ask-${randomId(6)}`;
let seq = 0, bytes = 0, frames = 0;
const RELAY = arg('relay', RELAY_BASE);
const ws = new WebSocket(`${RELAY}/room/${ROOM}/ws`);
ws.binaryType = 'arraybuffer';

const timeout = setTimeout(() => {
  console.error(`no reply in 5 s — is a board joined to "${ROOM}"?`);
  process.exit(1);
}, (VERB === 'listen' ? Number(BODY ?? 5) * 1000 + 500 : 5000));

ws.onopen = () => {
  if (VERB === 'listen') { console.error(`listening on ${ROOM} for ${BODY ?? 5}s ...`); return; }
  let body;
  if (BODY) { try { body = JSON.parse(BODY); } catch (e) { console.error('body is not JSON:', e.message); process.exit(1); } }
  // patch.* and jack.plan/apply take a DOCUMENT; every other verb takes fields at the top level.
  // why: lessons/rig-board-io.md#ask-doc
  const takesDoc = VERB.startsWith('patch.') || VERB === 'jack.plan' || VERB === 'jack.apply';
  const wrap = body ? (takesDoc ? { patch: body } : body) : {};
  ws.send(format({ type: VERB, ...wrap }, { from: FROM, seq: seq++, by: 'tool' }));
};

ws.onmessage = (e) => {
  if (typeof e.data !== 'string') { frames++; bytes += e.data.byteLength; return; }
  const { kind, msg } = parse(e.data);
  if (kind !== 'json' || msg.from === FROM) return;
  if (VERB === 'listen') { console.log(`${msg.type.padEnd(16)} ${msg.from}  ${JSON.stringify(msg).slice(0, 150)}`); return; }
  if (msg.type === 'board.hello' || msg.type === 'board.alive') return;   // ambient, not a reply
  clearTimeout(timeout);
  // Strip the envelope; `at` is the payload's own event time and stays in the body.
  // why: lessons/rig-board-io.md#ask-envelope
  const { id, from, sent, seq: _s, re, ...body } = msg;
  console.log(JSON.stringify(body, null, 2));
  ws.close(); process.exit(0);
};

if (VERB === 'listen') setTimeout(() => {
  if (frames) console.error(`\n${frames} binary frames, ${(bytes / 1024).toFixed(1)} KiB`);
  process.exit(0);
}, Number(BODY ?? 5) * 1000);
