// live-agent.mjs — play Ableton Live from a browser.
//
//   node rig/m1/live-agent.mjs --room m1-1
//
// The same shape as `rig/box/box.mjs`, on a different machine: notes arrive over
// the relay, an instrument somewhere else makes the sound, and the samples come
// back down the same socket. The page does not know or care which machine is at
// the far end — `demo/rack` and `/box/` are the same page with a different room.
//
// Two native tools do the actual work, both in ~/positron-rack/bin:
//   midisend  — notes out over CoreMIDI to IAC Driver Bus 1, which Live listens on
//   audiotap  — a copy of what Live is rendering, WITHOUT a loopback device
//
// 🔴 NO BlackHole AND NO Multi-Output DEVICE. A Core Audio process tap takes a
// copy of one process's output while that audio carries on to the speakers, so
// none of the old routing exists: not the virtual cable, not the stacked output
// device, not Live's own output setting — which is the one thing in this rig the
// Live Object Model cannot script. MEASURED: Live holding a chord reads
// -5.2 dBFS through the tap, the same figure the old BlackHole chain reads.

import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const ROOM = arg('room', 'm1-1');
const RELAY = arg('relay', 'wss://ws.positron.studio');
const BIN = arg('bin', join(homedir(), 'positron-rack', 'bin'));
const RATE = 48000;
// 20 ms of mono audio. 50 frames a second against the relay's MEASURED ceiling
// of 60 msg/s for EVERYTHING on it — which is why notes are cheap and nothing
// else chats. The box runs the same cadence for the same reason.
const FRAME = RATE / 50;

const FROM = `m1-${Math.random().toString(36).slice(2, 8)}`;
let ws = null, seq = 0, aseq = 0, sent = 0, held = new Set();
let midi = null, tap = null, backoff = 500;

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const send = (m) => { if (ws?.readyState === 1) { ws.send(JSON.stringify({ ...m, from: FROM, at: Date.now(), seq: seq++ })); return true; } return false; };

// ── the instrument ───────────────────────────────────────────────────────
function startMidi() {
  if (midi) return midi;
  midi = spawn(join(BIN, 'midisend'), ['IAC'], { stdio: ['pipe', 'ignore', 'pipe'] });
  midi.stderr.on('data', (d) => log('midisend:', String(d).trim().split('\n')[0]));
  midi.on('exit', (c) => { log(`midisend exited (${c})`); midi = null; });
  return midi;
}

/**
 * ⚠️ ONE PROCESS, HELD OPEN. A tool that sends one note and exits pays CoreMIDI
 * client setup per note — and worse, a note-off can be lost to a process that
 * has already gone, leaving a note sounding on an instrument in another
 * building. midisend.c's own header makes the same argument.
 */
const note = (line) => { try { startMidi().stdin.write(line + '\n'); return true; } catch { return false; } };

// ── the sound coming back ────────────────────────────────────────────────
function startTap() {
  if (tap) return;
  tap = spawn(join(BIN, 'audiotap'), ['Live'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let carry = Buffer.alloc(0);
  tap.stdout.on('data', (chunk) => {
    carry = carry.length ? Buffer.concat([carry, chunk]) : chunk;
    // float32 stereo in, int16 mono out: 8 bytes per input frame, 2 per output.
    const per = FRAME * 8;
    while (carry.length >= per) {
      const block = carry.subarray(0, per);
      carry = carry.subarray(per);
      const out = new Int16Array(FRAME);
      for (let i = 0; i < FRAME; i++) {
        // ⚠️ MIX, DO NOT DROP A CHANNEL. Taking the left only halves a hard-
        // panned instrument to silence, which reads as the tap having failed.
        const l = block.readFloatLE(i * 8), r = block.readFloatLE(i * 8 + 4);
        let v = (l + r) * 0.5;
        v = v > 1 ? 1 : v < -1 ? -1 : v;         // clip rather than wrap
        out[i] = (v * 32767) | 0;
      }
      sendPcm(out);
    }
  });
  tap.stderr.on('data', (d) => {
    const t = String(d).trim();
    if (/allowed|tapping|format|dBFS|silent/.test(t)) log('tap:', t.split('\n')[0]);
    // 🔴 REFUSED IS NOT A HICCUP. Without the audio-capture grant the tap emits
    // correctly-clocked SILENCE and every layer above reports success, so this
    // is the one line that must reach a human.
    if (/refus|denied|not permitted/i.test(t)) log('🔴 tap refused — run it once in a terminal and click Allow');
  });
  tap.on('exit', (c) => { log(`audiotap exited (${c})`); tap = null; });
}

function sendPcm(int16) {
  if (ws?.readyState !== 1) return;
  const out = Buffer.allocUnsafe(12 + int16.byteLength);
  out.writeUInt32LE(aseq++, 0);
  out.writeDoubleLE(performance.now(), 4);
  Buffer.from(int16.buffer, int16.byteOffset, int16.byteLength).copy(out, 12);
  ws.send(out);
  sent++;
}

// ── the socket ───────────────────────────────────────────────────────────
function connect() {
  ws = new WebSocket(`${RELAY}/room/${ROOM}/ws`);
  ws.binaryType = 'arraybuffer';
  ws.onopen = () => {
    backoff = 500;
    log(`joined ${ROOM} as ${FROM}`);
    send({ type: 'rack.hello', instrument: 'Ableton Live', rate: RATE, msgPerSec: 50 });
    startTap();
  };
  ws.onmessage = (e) => {
    if (typeof e.data !== 'string') return;
    let m; try { m = JSON.parse(e.data); } catch { return; }
    if (m.from === FROM) return;
    switch (m.type) {
      case 'note.on':
        if (!Number.isInteger(m.note)) return;
        held.add(m.note);
        note(`on ${m.note} ${Math.max(1, Math.min(127, m.vel ?? 100))}`);
        return;
      case 'note.off':
        held.delete(m.note);
        note(`off ${m.note}`);
        return;
      case 'note.panic':
        held.clear(); note('panic');
        return send({ type: 'note.panic', ok: true });
      case 'rack.status':
        return send({ type: 'rack.state', ok: true, instrument: 'Ableton Live',
                      tap: !!tap, midi: !!midi, frames: sent, held: held.size, rate: RATE });
    }
  };
  ws.onclose = () => { log(`socket closed — back in ${backoff} ms`); setTimeout(connect, backoff); backoff = Math.min(8000, backoff * 2); };
  ws.onerror = (e) => log('socket error', e.message || e.type || '');
}

process.on('SIGINT', () => { note('panic'); setTimeout(() => process.exit(0), 150); });
log(`bin ${BIN}`);
connect();
