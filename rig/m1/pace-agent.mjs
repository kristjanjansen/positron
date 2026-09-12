// pace-agent.mjs — a rack agent with no network in it, so "the sound is bad"
// can be told from "the PATH to the sound is bad".
//
//   node rig/m1/pace-agent.mjs                    perfect 20 ms pacing
//   node rig/m1/pace-agent.mjs --jitter 25        the relay's jitter, reproduced
//   node rig/m1/pace-agent.mjs --channels 2       dual-mono stereo, like Live's
//
// then open  http://127.0.0.1:8890/rack/?relay=ws://127.0.0.1:8899
//
// 🔴 WHY THIS EXISTS. `rack` sounded noisy, six measurements said the stream was
// perfect, and the defect turned out to be a cushion downstream of every one of
// them (LESSONS #52). The cushion was resized from a measurement of the real
// path — p50 20.4 / p95 32.6 / p99 45.0 ms apart, worst gap 108.6 ms — and the
// report came back noisy again. At that point there are two live hypotheses
// with opposite fixes:
//
//   the ARRIVAL TRAIN is still too rough  -> a bigger cushion, or a better path
//   something AFTER the socket is wrong   -> a bigger cushion changes nothing
//
// and they are indistinguishable from inside the page. This is the instrument
// that separates them. It sends a tone this file generates, at exactly one
// frame every 20 ms, over a socket on loopback: no relay, no edge, no Wi-Fi, no
// Core Audio tap, no Ableton. If the page still sounds wrong here, nothing left
// in the chain is the network.
//
// ⚠️ AND IT HAS A NEGATIVE CONTROL, which is the half that makes it evidence.
// `--jitter N` delays each send by a random 0..N ms, reproducing what the relay
// does. Run it at 0 and at 40: if 0 is clean and 40 is not, jitter is
// sufficient to explain the complaint. If 0 is ALSO bad, it is not the network
// and the cushion was never the whole story. A test that can only pass tells
// you nothing — see LESSONS #27 and the `--self-test` in verify-quest.mjs.
//
// ⚠️ NO DEPENDENCIES. Node has no WebSocket *server*, and this repo has no
// package.json — the handshake and a text/binary frame writer are about sixty
// lines and are house style already (demo/verify.mjs speaks raw CDP the same
// way). Only what a browser client actually needs is implemented: server ->
// client frames are never masked, and the one client frame this cares about is
// a small masked text frame.

import { createServer } from 'node:http';
import { createHash, randomInt } from 'node:crypto';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const PORT = Number(arg('port', 8899));
const JITTER = Number(arg('jitter', 0));
const CH = Math.min(2, Math.max(1, Number(arg('channels', 1))));
const RATE = 48000;
const FRAME = RATE / 50;               // 960 sample frames = 20 ms
const FRAME_MS = 1000 * FRAME / RATE;

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

// ── the tone ──────────────────────────────────────────────────────────────
// A steady sine at the note being held, because a STEADY source is the one that
// makes a discontinuity audible. A pad or a noise source hides exactly the
// defect this is looking for.
let hz = 0, phase = 0, held = new Set();
const noteHz = (n) => 440 * Math.pow(2, (n - 69) / 12);

function frame() {
  const out = Buffer.allocUnsafe(12 + FRAME * CH * 2);
  out.writeUInt32LE(seq++, 0);
  out.writeDoubleLE(performance.now(), 4);
  for (let i = 0; i < FRAME; i++) {
    // A gentle fade to and from silence, so switching notes is not a step —
    // a step is a click, and a click is the thing being hunted.
    const target = hz ? 0.25 : 0;
    amp += (target - amp) * 0.0008;
    const v = hz ? Math.sin(phase) * amp : 0;
    if (hz) { phase += 2 * Math.PI * hz / RATE; if (phase > 2 * Math.PI) phase -= 2 * Math.PI; }
    const s = Math.max(-1, Math.min(1, v)) * 32767 | 0;
    for (let c = 0; c < CH; c++) out.writeInt16LE(s, 12 + (i * CH + c) * 2);
  }
  return out;
}
let seq = 0, amp = 0;

// ── the socket, by hand ───────────────────────────────────────────────────
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const clients = new Set();

function writeFrame(sock, payload, opcode) {
  const len = payload.length;
  const head = len < 126 ? Buffer.from([0x80 | opcode, len])
    : len < 65536 ? Buffer.concat([Buffer.from([0x80 | opcode, 126]), (() => { const b = Buffer.alloc(2); b.writeUInt16BE(len); return b; })()])
    : Buffer.concat([Buffer.from([0x80 | opcode, 127]), (() => { const b = Buffer.alloc(8); b.writeBigUInt64BE(BigInt(len)); return b; })()]);
  sock.write(Buffer.concat([head, payload]));
}
const sendText = (sock, obj) => writeFrame(sock, Buffer.from(JSON.stringify(obj)), 0x1);
const sendBin = (sock, buf) => writeFrame(sock, buf, 0x2);

const describe = () => ({
  instrument: 'a paced test tone', rate: RATE, audioChannels: CH,
  frameMs: FRAME_MS, msgPerSec: 1000 / FRAME_MS, tap: true, midi: true, frames: seq,
});

const server = createServer((req, res) => { res.writeHead(426); res.end('websocket only'); });

server.on('upgrade', (req, sock) => {
  const key = req.headers['sec-websocket-key'];
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n'
    + `Sec-WebSocket-Accept: ${createHash('sha1').update(key + GUID).digest('base64')}\r\n\r\n`);
  sock.setNoDelay(true);
  clients.add(sock);
  log(`client joined ${req.url} — ${clients.size} here`);
  sendText(sock, { type: 'rack.hello', ...describe(), from: 'pace', at: Date.now(), seq: 0 });

  let buf = Buffer.alloc(0);
  sock.on('data', (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    // Only small masked text frames arrive here; anything else is dropped
    // rather than half-parsed.
    while (buf.length >= 2) {
      const len0 = buf[1] & 0x7f, masked = buf[1] & 0x80;
      let off = 2, len = len0;
      if (len0 === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
      else if (len0 === 127) { buf = Buffer.alloc(0); return; }
      const maskLen = masked ? 4 : 0;
      if (buf.length < off + maskLen + len) return;
      const mask = masked ? buf.subarray(off, off + 4) : null;
      const body = Buffer.from(buf.subarray(off + maskLen, off + maskLen + len));
      if (mask) for (let i = 0; i < body.length; i++) body[i] ^= mask[i % 4];
      const opcode = buf[0] & 0x0f;
      buf = buf.subarray(off + maskLen + len);
      if (opcode === 0x8) { sock.end(); return; }
      if (opcode !== 0x1) continue;
      let m; try { m = JSON.parse(body.toString()); } catch { continue; }
      onMessage(sock, m);
    }
  });
  const bye = () => { clients.delete(sock); log(`client left — ${clients.size} here`); };
  sock.on('close', bye); sock.on('error', bye);
});

function onMessage(sock, m) {
  switch (m.type) {
    case 'rack.status':
      return sendText(sock, { type: 'rack.state', ok: true, ...describe(), held: held.size, from: 'pace', at: Date.now(), seq: 0 });
    case 'note.on':
      if (!Number.isInteger(m.note)) return;
      held.add(m.note); hz = noteHz(m.note);
      return;
    case 'note.off':
      held.delete(m.note);
      hz = held.size ? noteHz([...held].pop()) : 0;
      return;
    case 'note.panic':
      held.clear(); hz = 0;
      return sendText(sock, { type: 'note.panic', ok: true, from: 'pace', at: Date.now(), seq: 0 });
  }
}

// ── the pacing ────────────────────────────────────────────────────────────
// 🔴 A DRIFT-FREE SCHEDULER, NOT `setInterval(fn, 20)`. setInterval accumulates
// its own lateness, so a "20 ms" tick drifts against the sample clock and the
// listener's cushion slowly empties or fills — which would be this instrument
// producing the very defect it is meant to rule out.
let due = performance.now();
function tick() {
  const now = performance.now();
  while (due <= now) {
    const f = frame();
    const send = () => { for (const c of clients) sendBin(c, f); };
    if (JITTER > 0) setTimeout(send, randomInt(0, JITTER + 1)); else send();
    due += FRAME_MS;
  }
  // Never more than one frame behind: if this process was descheduled for
  // 200 ms, catching up by sending ten frames at once is a burst the page would
  // read as the network misbehaving.
  if (now - due > 200) due = now;
  setTimeout(tick, Math.max(0, Math.min(5, due - performance.now())));
}

server.listen(PORT, '127.0.0.1', () => {
  log(`paced agent on ws://127.0.0.1:${PORT}  ·  ${CH === 1 ? 'mono' : 'stereo'} · ${FRAME_MS} ms frames · jitter ${JITTER} ms`);
  log(`open  http://127.0.0.1:8890/rack/?relay=ws://127.0.0.1:${PORT}`);
  if (!JITTER) log('⚠️  jitter 0 — run again with --jitter 40 as the negative control');
  tick();
});
