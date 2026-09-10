// ARCHIVED 2026-09-09 — superseded before it ever shipped, and kept only as the
// record of a measurement.
//
// This was written for plan-uuu-local P3 ("a local relay does not exist"), then
// A/B'd against the REAL worker running under `wrangler dev --local`. Both
// passed all seven checks identically — echo-to-sender, fan-out, verbatim
// binary, a 200 KiB message intact, stats — at p50 1.71 ms (this file) against
// 2.08 ms (the worker). 0.37 ms apart, which is noise on loopback.
//
// So it lost on the only argument that mattered: `wrangler dev` runs the
// ACTUAL DEPLOYED CODE, and a second implementation of a contract is surface
// area that can drift from it. Use instead:
//
//     cd workers/relay && npx wrangler dev --local --ip 0.0.0.0 --port 8891
//
// One caveat found while testing it, which applies to that command and not to
// this file: wrangler warned that the worker's compatibility_date 2026-08-01
// exceeds the installed runtime's maximum 2026-03-17 and SILENTLY FELL BACK, so
// local dev is an older runtime than production. Upgrade wrangler (4.75.0 here,
// 4.130.0 available) before trusting local numbers as edge-comparable.
//
// Kept because the framing code is correct and measured, and because the next
// person to think "we need a local relay" should find the answer already here.
// ---------------------------------------------------------------------------

// proto/looper/relay.mjs — the same relay as `ws.positron.studio`, on a laptop.
//
// plan-uuu-local §4 names this as the one thing missing for P3: "a local relay
// does not exist … `ws.positron.studio` is a Durable Object and cannot run on a
// laptop." Two devices in a hall with no uplink need somewhere to meet, and the
// whole point of the compiled-score design is that this relay is used ONCE PER
// LAYER, never per beat — so it may be as dumb as it likes.
//
// It is deliberately the SAME CONTRACT as the deployed worker, because P3's
// number has to be comparable with the numbers already measured against that
// worker. Same routes, same echo, same caps, same constants:
//
//   ws://<host>:<port>/room/<name>/ws        join
//   GET   http://<host>:<port>/room/<name>/stats
//
//   · VERBATIM. No parse, no storage, no envelope. Text or binary, relayed
//     as-is — the property the whole positron relay design rests on.
//   · The echo INCLUDES THE SENDER, so every member sees one order. That is
//     what makes a delivery time honest, and `createPeer` already drops its own
//     (`m.from === id`), so it costs the client nothing.
//
// Zero dependencies: node ships a WebSocket *client* but no server, and this
// repo has no package.json, so the RFC 6455 handshake and framing are here
// rather than a dependency. That is why this is ~200 lines and not the ~40 the
// plan estimated — the estimate assumed `ws` was available.
//
// NOT the same as the worker in two ways, both stated rather than hidden:
// there is no hibernation (a laptop process is always awake, so an idle room is
// free anyway), and there is no cap on how many DISTINCT rooms a client opens —
// which is the one gap the deployed relay's own header also admits to.

import { createHash } from 'node:crypto';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

// The deployed relay's constants, copied so a LAN measurement is comparable
// with an edge one. Changing them here makes the two incomparable — which is
// fine, as long as whatever quotes the number says so.
export const LIMITS = {
  MAX_BYTES: 256 * 1024,          // per message
  MAX_SOCKETS: 16,                // per room
  BYTES_PER_SEC: 512 * 1024,      // per socket, steady
  BYTE_BURST: 2 * 1024 * 1024,
  MSG_PER_SEC: 60,                // a separate bucket, for tiny-message floods
  MSG_BURST: 120,
  STRIKES: 20,                    // overruns tolerated before the socket closes
};

const ROOM_RE = /^\/room\/([a-zA-Z0-9_-]{1,64})\/ws$/;
const STATS_RE = /^\/room\/([a-zA-Z0-9_-]{1,64})\/stats$/;

// ── RFC 6455 framing ───────────────────────────────────────────────────────
const OP = { CONT: 0x0, TEXT: 0x1, BIN: 0x2, CLOSE: 0x8, PING: 0x9, PONG: 0xa };

function frame(opcode, payload) {
  const len = payload.length;
  let head;
  if (len < 126) { head = Buffer.alloc(2); head[1] = len; }
  else if (len < 65536) { head = Buffer.alloc(4); head[1] = 126; head.writeUInt16BE(len, 2); }
  else { head = Buffer.alloc(10); head[1] = 127; head.writeBigUInt64BE(BigInt(len), 2); }
  head[0] = 0x80 | opcode;                       // FIN, never fragment on send
  return Buffer.concat([head, payload]);
}

/**
 * Parse whole frames out of `buf`, returning how many bytes were consumed.
 * A partial frame consumes nothing and waits for more TCP — which is the whole
 * reason this cannot be written as "one message per data event".
 */
function eachFrame(buf, onFrame) {
  let off = 0;
  for (;;) {
    if (buf.length - off < 2) break;
    const b0 = buf[off], b1 = buf[off + 1];
    const masked = (b1 & 0x80) !== 0;
    let len = b1 & 0x7f;
    let p = off + 2;
    if (len === 126) { if (buf.length - p < 2) break; len = buf.readUInt16BE(p); p += 2; }
    else if (len === 127) {
      if (buf.length - p < 8) break;
      const big = buf.readBigUInt64BE(p);
      if (big > BigInt(Number.MAX_SAFE_INTEGER)) return { consumed: off, fatal: 'length' };
      len = Number(big); p += 8;
    }
    let mask = null;
    if (masked) { if (buf.length - p < 4) break; mask = buf.subarray(p, p + 4); p += 4; }
    if (buf.length - p < len) break;
    const payload = Buffer.from(buf.subarray(p, p + len));      // copy: we unmask in place
    if (mask) for (let i = 0; i < len; i++) payload[i] ^= mask[i & 3];
    p += len;
    onFrame({ fin: (b0 & 0x80) !== 0, opcode: b0 & 0x0f, payload });
    off = p;
  }
  return { consumed: off, fatal: null };
}

// ── the relay ──────────────────────────────────────────────────────────────
export function createRelay({ limits = LIMITS, log = () => {} } = {}) {
  const rooms = new Map();                       // name -> Set<conn>

  const roomOf = (name) => {
    let r = rooms.get(name);
    if (!r) { r = new Set(); rooms.set(name, r); }
    return r;
  };

  /** Token buckets, exactly the worker's: refill by elapsed time, then spend. */
  function allow(conn, bytes) {
    const now = Date.now();
    const dt = Math.max(0, (now - conn.bucket.last) / 1000);
    conn.bucket.last = now;
    conn.bucket.bytes = Math.min(limits.BYTE_BURST, conn.bucket.bytes + dt * limits.BYTES_PER_SEC);
    conn.bucket.msgs = Math.min(limits.MSG_BURST, conn.bucket.msgs + dt * limits.MSG_PER_SEC);
    if (conn.bucket.bytes < bytes || conn.bucket.msgs < 1) {
      conn.bucket.strikes++;
      conn.dropped++;
      return conn.bucket.strikes < limits.STRIKES ? 'drop' : 'close';
    }
    conn.bucket.bytes -= bytes;
    conn.bucket.msgs -= 1;
    return 'ok';
  }

  function fanout(room, opcode, payload) {
    const f = frame(opcode, payload);
    for (const c of room) { try { c.socket.write(f); } catch { /* peer vanished mid-send */ } }
  }

  function close(conn, code = 1000, reason = '') {
    if (conn.closed) return;
    conn.closed = true;
    const body = Buffer.alloc(2 + Buffer.byteLength(reason));
    body.writeUInt16BE(code, 0); body.write(reason, 2);
    try { conn.socket.write(frame(OP.CLOSE, body)); } catch {}
    try { conn.socket.end(); } catch {}
    conn.room.delete(conn);
    if (conn.room.size === 0) rooms.delete(conn.name);
  }

  function handleUpgrade(req, socket, head) {
    const url = new URL(req.url, 'http://localhost');
    const m = ROOM_RE.exec(url.pathname);
    const key = req.headers['sec-websocket-key'];
    if (!m || !key) { socket.end('HTTP/1.1 404 Not Found\r\n\r\n'); return; }

    const name = m[1];
    const room = roomOf(name);
    if (room.size >= limits.MAX_SOCKETS) {
      socket.end(`HTTP/1.1 503 Service Unavailable\r\n\r\nroom full (${limits.MAX_SOCKETS})`);
      return;
    }

    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${createHash('sha1').update(key + GUID).digest('base64')}\r\n\r\n`);
    socket.setNoDelay(true);                     // this is a latency instrument

    const conn = {
      socket, room, name, closed: false, dropped: 0, sent: 0,
      bucket: { bytes: limits.BYTE_BURST, msgs: limits.MSG_BURST, last: Date.now(), strikes: 0 },
      frag: null,                                // {opcode, chunks[]} across CONT frames
    };
    room.add(conn);
    log(`join ${name} (${room.size}/${limits.MAX_SOCKETS})`);

    let buf = head && head.length ? Buffer.from(head) : Buffer.alloc(0);

    socket.on('data', (chunk) => {
      buf = buf.length ? Buffer.concat([buf, chunk]) : chunk;
      const { consumed, fatal } = eachFrame(buf, (f) => {
        if (conn.closed) return;
        if (f.opcode === OP.CLOSE) { close(conn, 1000); return; }
        // ping/pong is answered HERE and never fanned out, so an RTT probe
        // measures the network and not the room — the same property the
        // worker gets from the runtime's hibernation autoresponse.
        if (f.opcode === OP.PING) { try { socket.write(frame(OP.PONG, f.payload)); } catch {} return; }
        if (f.opcode === OP.PONG) return;

        // Reassemble fragments before applying any cap, or a big message
        // split across frames is measured as several small ones.
        if (f.opcode === OP.CONT) {
          if (!conn.frag) return;                // continuation with nothing to continue
          conn.frag.chunks.push(f.payload);
        } else {
          conn.frag = { opcode: f.opcode, chunks: [f.payload] };
        }
        if (!f.fin) return;

        const payload = conn.frag.chunks.length === 1
          ? conn.frag.chunks[0] : Buffer.concat(conn.frag.chunks);
        const opcode = conn.frag.opcode;
        conn.frag = null;

        if (payload.length > limits.MAX_BYTES) { close(conn, 1009, 'message too big'); return; }
        const verdict = allow(conn, payload.length);
        if (verdict === 'close') { close(conn, 1008, 'rate'); return; }
        if (verdict === 'drop') return;          // silently, exactly like the worker
        conn.sent++;
        fanout(room, opcode, payload);           // INCLUDING the sender
      });
      if (fatal) { close(conn, 1009, fatal); return; }
      buf = consumed ? buf.subarray(consumed) : buf;
    });

    const bye = () => {
      if (conn.closed) return;
      conn.closed = true;
      room.delete(conn);
      if (room.size === 0) rooms.delete(name);
      log(`leave ${name} (${room.size})`);
    };
    socket.on('close', bye);
    socket.on('error', bye);
  }

  /** `GET /room/<name>/stats` — returns true if it handled the request. */
  function handleRequest(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const m = STATS_RE.exec(url.pathname);
    if (!m) return false;
    const room = rooms.get(m[1]);
    const conns = room ? [...room] : [];
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify({
      room: m[1],
      sockets: conns.length,
      sent: conns.reduce((n, c) => n + c.sent, 0),
      dropped: conns.reduce((n, c) => n + c.dropped, 0),
      limits,
    }));
    return true;
  }

  return { handleUpgrade, handleRequest, rooms };
}
