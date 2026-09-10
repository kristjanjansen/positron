// proto/jam/relay-local.mjs — raw local WS relay on :8895 (arm f).
// Verbatim broadcast (text or binary) to every socket in ?room=, sender
// included — the same contract as elektron-jam, minus the DO and the WAN.
// Run plain (node relay-local.mjs) or inside Docker with netem loss to
// demonstrate WS-over-TCP behavior under packet loss (see NOTES.md).
import { WebSocketServer } from 'ws';

const PORT = +(process.env.PORT || 8895);
const wss = new WebSocketServer({ port: PORT, host: '0.0.0.0' });
const rooms = new Map();

wss.on('connection', (ws, req) => {
  // TWO URL SHAPES, one contract. `?room=` is what arm f has always used; the
  // path form is what ws.positron.studio uses, and accepting both is what lets
  // the SAME client code point at either relay with only the base URL changed.
  // That is the whole of "mix and match LAN and internet": the protocol above
  // the socket never learns which one it got.
  const u = new URL(req.url, 'http://x');
  const path = u.pathname.match(/^\/room\/([A-Za-z0-9._-]{1,64})\/ws$/);
  const room = path ? path[1] : (u.searchParams.get('room') || 'default');
  if (!rooms.has(room)) rooms.set(room, new Set());
  const set = rooms.get(room);
  set.add(ws);
  ws.on('message', (data, isBinary) => {
    if (!isBinary && data.toString() === 'ping') { ws.send('pong'); return; }
    for (const s of set) if (s.readyState === 1) s.send(data, { binary: isBinary });
  });
  ws.on('close', () => { set.delete(ws); if (!set.size) rooms.delete(room); });
  ws.on('error', () => {});
});
console.log('relay-local on :' + PORT);
