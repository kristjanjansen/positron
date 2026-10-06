// demo/fake-relay.mjs: a relay room server that is nobody's relay.
//
//   node demo/fake-relay.mjs                  # :8897
//   node demo/fake-relay.mjs --port 9101
//
// It speaks what `workers/relay/src/index.js` speaks and nothing more:
//
//   ws://127.0.0.1:<port>/room/<name>/ws      join a room
//   GET  /room/<name>/stats                   the relay's own stats shape
//
// and a page reaches it through wire.mjs's `?relay=`:
//
//   http://127.0.0.1:8890/away/?relay=ws://127.0.0.1:8897
//
// 🔴 WHY THIS EXISTS. plans/plan-routing-migration.md §3.8: every opener that
// matters talks to the Raspberry Pi in another building through the production
// relay, so a harness either drove shared hardware or graded nothing. This and
// `demo/fake-board.mjs` together are a room and a board on this machine.
//
// ⚠️ WHAT IT COPIES, BECAUSE A PAGE CAN SEE IT:
//   - VERBATIM to every socket in the room, THE SENDER INCLUDED. `wire.mjs`
//     counts its own echo, and a relay that skipped the sender would read as a
//     relay dropping every message.
//   - the text frame `ping` is answered `pong` to that socket only and reaches
//     nobody else, which is what the runtime's autoresponse does there.
//   - the same message roof, the same two token buckets and the same strikes,
//     so a stand-in is not more generous than the relay. A dropped message is
//     dropped silently and counted only here, which is the relay's behaviour
//     and the reason `seq` exists.
//   - a full room refuses the upgrade with the relay's `503 room full (N)`,
//     and `/stats` says so, which is how `openWire` tells a full room from a
//     dead relay. ANY ROOM WHOSE NAME ENDS `-full` IS FULL HERE, so a page can
//     be pointed at a refusal by its own `?room=`.
// ⚠️ WHAT IT DOES NOT: hibernation, idle reclaim and the per-socket attachment.
// Nothing here lives long enough for them to matter, and they are said rather
// than pretended.
//
// 🔴 LOOPBACK ONLY. It listens on 127.0.0.1, because a room server reachable
// from the network is a tokenless relay somebody else can use.

import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// The relay's own numbers, `workers/relay/src/index.js:77-83`. Copied, and
// `/stats` reports them the same way, so a page that reads them off `/stats`
// gets the same answer from both.
export const LIMITS = {
  maxBytes: 1000 * 1024,
  maxSockets: 128,
  bytesPerSec: 8 * 1024 * 1024,
  msgPerSec: 1000,
};
const BYTE_BURST = 16 * 1024 * 1024;
const MSG_BURST = 2000;
const STRIKES = 50;
const ROOM_RE = /^\/room\/([a-zA-Z0-9_-]{1,64})\/(ws|stats)$/;
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

/** A socket's frames, encoded. Server frames are never masked. */
export function encodeFrame(data, opcode) {
  const body = typeof data === 'string' ? Buffer.from(data) : Buffer.from(data);
  const n = body.length;
  const head = n < 126 ? Buffer.alloc(2) : n < 65536 ? Buffer.alloc(4) : Buffer.alloc(10);
  head[0] = 0x80 | opcode;
  if (n < 126) head[1] = n;
  else if (n < 65536) { head[1] = 126; head.writeUInt16BE(n, 2); }
  else { head[1] = 127; head.writeBigUInt64BE(BigInt(n), 2); }
  return Buffer.concat([head, body]);
}

/**
 * Reads frames off a byte stream. Fragmented messages are joined; control
 * frames come out on their own. `onFrame(opcode, payload)` gets whole messages.
 * Returns `{ push(chunk) }`.
 */
export function createFrameReader(onFrame) {
  let buf = Buffer.alloc(0);
  let frag = null, fragOp = 0;
  return {
    push(chunk) {
      buf = buf.length ? Buffer.concat([buf, chunk]) : chunk;
      for (;;) {
        if (buf.length < 2) return;
        const fin = (buf[0] & 0x80) !== 0, op = buf[0] & 0x0F;
        const masked = (buf[1] & 0x80) !== 0;
        let len = buf[1] & 0x7F, at = 2;
        if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); at = 4; }
        else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); at = 10; }
        const need = at + (masked ? 4 : 0) + len;
        if (buf.length < need) return;
        let payload = Buffer.from(buf.subarray(at + (masked ? 4 : 0), need));
        if (masked) {
          const key = buf.subarray(at, at + 4);
          for (let i = 0; i < payload.length; i++) payload[i] ^= key[i & 3];
        }
        buf = buf.subarray(need);
        if (op >= 0x8) { onFrame(op, payload); continue; }
        if (op !== 0) { frag = [payload]; fragOp = op; } else if (frag) frag.push(payload); else continue;
        if (fin) { const whole = Buffer.concat(frag); frag = null; onFrame(fragOp, whole); }
      }
    },
  };
}

/**
 * Start a room server. Returns the `http.Server`, already listening (wait for
 * `listening` before reading `address()`), with `stats()` for a test.
 * @param {object} [o]
 * @param {number} [o.port]         0 lets the OS choose, which a harness wants
 * @param {boolean} [o.quiet]
 * @param {number} [o.maxSockets]   per room, the relay's 128 unless a test asks
 * @param {(room: string) => boolean} [o.full] rooms that refuse every upgrade
 */
export function startRelay({ port = 8897, quiet = false, maxSockets = LIMITS.maxSockets,
  full = (room) => room.endsWith('-full') } = {}) {
  const say = (...a) => { if (!quiet) console.log('[fake-relay]', ...a); };
  /** room -> Set of sockets */
  const rooms = new Map();
  const totals = { relayed: 0, dropped: 0, closedForAbuse: 0, refusedFull: 0, joined: 0, pongs: 0 };
  const startedAt = Date.now();

  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    const cors = { 'content-type': 'application/json', 'access-control-allow-origin': '*' };
    if (url.pathname === '/' || url.pathname === '') {
      res.writeHead(200, cors);
      res.end(JSON.stringify({ relay: 'fake-relay', standIn: true, usage: 'ws://<this>/room/<name>/ws', limits: { ...LIMITS, maxSockets } }));
      return;
    }
    const m = url.pathname.match(ROOM_RE);
    if (!m) { res.writeHead(404, { 'access-control-allow-origin': '*' }); res.end('use /room/<name>/ws or /room/<name>/stats'); return; }
    if (m[2] === 'stats') {
      const set = rooms.get(m[1]);
      res.writeHead(200, cors);
      res.end(JSON.stringify({
        sockets: full(m[1]) ? maxSockets : (set?.size ?? 0),
        sinceWakeMs: Date.now() - startedAt,
        relayedSinceWake: totals.relayed,
        droppedSinceWake: totals.dropped,
        closedForAbuseSinceWake: totals.closedForAbuse,
        evictedIdleSinceWake: 0,
        limits: { ...LIMITS, maxSockets },
        standIn: true,
      }));
      return;
    }
    res.writeHead(426, { 'access-control-allow-origin': '*' });
    res.end('expected websocket');
  });

  server.on('upgrade', (req, socket) => {
    const m = new URL(req.url, 'http://x').pathname.match(ROOM_RE);
    const refuse = (status, text) => {
      socket.end(`HTTP/1.1 ${status}\r\ncontent-type: text/plain\r\ncontent-length: ${Buffer.byteLength(text)}\r\nconnection: close\r\n\r\n${text}`);
    };
    if (!m || m[2] !== 'ws') return refuse('404 Not Found', 'use /room/<name>/ws or /room/<name>/stats');
    const key = req.headers['sec-websocket-key'];
    if (String(req.headers.upgrade).toLowerCase() !== 'websocket' || !key) return refuse('426 Upgrade Required', 'expected websocket');
    const name = m[1];
    const set = rooms.get(name) || new Set();
    if (full(name) || set.size >= maxSockets) {
      totals.refusedFull++;
      say(`refused a socket: ${name} is full`);
      return refuse('503 Service Unavailable', `room full (${maxSockets})`);
    }
    const accept = createHash('sha1').update(key + GUID).digest('base64');
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nupgrade: websocket\r\nconnection: Upgrade\r\nsec-websocket-accept: ${accept}\r\n\r\n`);
    socket.setNoDelay(true);
    rooms.set(name, set);
    const peer = { socket, bucket: { bytes: BYTE_BURST, msgs: MSG_BURST, last: Date.now(), strikes: 0 }, open: true };
    set.add(peer);
    totals.joined++;
    say(`joined ${name} (${set.size})`);

    const sendTo = (p, data, binary) => {
      if (!p.open) return;
      try { p.socket.write(encodeFrame(data, binary ? 0x2 : 0x1)); } catch { /* peer vanished mid-send */ }
    };
    const leave = () => {
      if (!peer.open) return;
      peer.open = false;
      set.delete(peer);
      if (!set.size) rooms.delete(name);
      try { socket.destroy(); } catch { /* gone */ }
    };
    // The relay's two buckets, refilled by elapsed time. `workers/relay` `#allow`.
    const allow = (size) => {
      const b = peer.bucket, now = Date.now(), dt = (now - b.last) / 1000;
      b.bytes = Math.min(BYTE_BURST, b.bytes + dt * LIMITS.bytesPerSec);
      b.msgs = Math.min(MSG_BURST, b.msgs + dt * LIMITS.msgPerSec);
      b.last = now;
      if (b.bytes < size || b.msgs < 1) { b.strikes++; return b.strikes < STRIKES ? false : 'close'; }
      b.bytes -= size; b.msgs -= 1; b.strikes = 0;
      return true;
    };

    const reader = createFrameReader((op, payload) => {
      if (op === 0x8) {                         // close: answer it and go
        try { socket.write(encodeFrame(payload.subarray(0, 2), 0x8)); } catch { /* gone */ }
        leave();
        return;
      }
      if (op === 0x9) { try { socket.write(encodeFrame(payload, 0xA)); } catch { /* gone */ } return; }
      if (op === 0xA) return;
      const binary = op === 0x2;
      const text = binary ? null : payload.toString('utf8');
      if (!binary && text === 'ping') { totals.pongs++; sendTo(peer, 'pong', false); return; }
      if (payload.length > LIMITS.maxBytes) { totals.dropped++; return; }
      const verdict = allow(payload.length);
      if (verdict === 'close') {
        totals.closedForAbuse++;
        try { socket.write(encodeFrame(Buffer.from([0x03, 0xF0, ...Buffer.from('rate limit')]), 0x8)); } catch { /* gone */ }
        leave();
        return;
      }
      if (!verdict) { totals.dropped++; return; }
      // VERBATIM, to everyone, the sender included.
      for (const p of set) sendTo(p, binary ? payload : text, binary);
      totals.relayed++;
    });
    socket.on('data', (c) => reader.push(c));
    socket.on('close', leave);
    socket.on('error', leave);
  });

  server.stats = () => ({ ...totals, rooms: Object.fromEntries([...rooms].map(([k, v]) => [k, v.size])) });
  const close = server.close.bind(server);
  server.close = (cb) => {
    for (const set of rooms.values()) for (const p of set) { p.open = false; try { p.socket.destroy(); } catch { /* gone */ } }
    rooms.clear();
    return close(cb);
  };
  server.listen(port, '127.0.0.1', () => say(`ws://127.0.0.1:${server.address().port} (nobody's relay)`));
  return server;
}

if (resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf('--port');
  startRelay({ port: i > 0 ? Number(process.argv[i + 1]) : 8897 });
}
