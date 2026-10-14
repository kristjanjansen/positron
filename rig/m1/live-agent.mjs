// node rig/m1/live-agent.mjs --room m1-1: play Ableton Live from a browser, like board.mjs.
// midisend sends notes to IAC Bus 1; audiotap (a Core Audio process tap) copies Live's output,
// so no BlackHole or Multi-Output device. A held chord reads -5.2 dBFS through the tap.
// why: lessons/rig-m1.md#live-agent-header

import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const ROOM = arg('room', 'm1-1');
const RELAY = arg('relay', 'wss://ws.positron.studio');
const BIN = arg('bin', join(homedir(), 'positron-rack', 'bin'));
const RATE = 48000;
// Mono by default: the Live patch is dual mono (L and R measured bit-identical).
// `--channels 2` when the patch has width; the count is announced and checked against frameMs.
// why: lessons/rig-m1.md#live-agent-mono
const CH = Math.min(2, Math.max(1, Number(arg('channels', '1')) || 1));
// 20 ms frames, 50 a second: the relay caps messages, not bytes, so stereo costs bytes only.
// why: lessons/rig-m1.md#live-agent-frame
const FRAME = RATE / 50;
const FRAME_MS = 1000 * FRAME / RATE;

const FROM = `m1-${Math.random().toString(36).slice(2, 8)}`;
let ws = null, seq = 0, aseq = 0, sent = 0, held = new Set();
let midi = null, tap = null, backoff = 500;

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const send = (m) => { if (ws?.readyState === 1) { ws.send(JSON.stringify({ ...m, from: FROM, sent: Date.now(), seq: seq++ })); return true; } return false; };

// ── the instrument ───────────────────────────────────────────────────────
function startMidi() {
  if (midi) return midi;
  midi = spawn(join(BIN, 'midisend'), ['IAC'], { stdio: ['pipe', 'ignore', 'pipe'] });
  midi.stderr.on('data', (d) => log('midisend:', String(d).trim().split('\n')[0]));
  midi.on('exit', (c) => { log(`midisend exited (${c})`); midi = null; });
  return midi;
}

// One midisend process held open: per-note processes pay CoreMIDI setup and can lose a note-off.
// why: lessons/rig-m1.md#live-agent-midi
const note = (line) => { try { startMidi().stdin.write(line + '\n'); return true; } catch { return false; } };

// ── the sound coming back ────────────────────────────────────────────────
function startTap() {
  if (tap) return;
  tap = spawn(join(BIN, 'audiotap'), ['Live'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let carry = Buffer.alloc(0);
  tap.stdout.on('data', (chunk) => {
    carry = carry.length ? Buffer.concat([carry, chunk]) : chunk;
    // float32 stereo in, int16 mono out: 8 bytes per input frame, 2 per output.
    const per = FRAME * CH * 4;   // float32 bytes for one outgoing frame
    while (carry.length >= per) {
      const block = carry.subarray(0, per);
      carry = carry.subarray(per);
      const out = new Int16Array(FRAME * CH);
      for (let i = 0; i < FRAME * CH; i++) {
        // At CH=1 the tap still hands interleaved stereo: take the left of each pair, not every
        // float.
        // why: lessons/rig-m1.md#live-agent-left
        let v = block.readFloatLE((CH === 1 ? i * 2 : i) * 4);
        // Clip before int16: `(v * 32767) | 0` above 1.0 wraps to full-scale noise.
        // why: lessons/rig-m1.md#live-agent-clip
        v = v > 1 ? 1 : v < -1 ? -1 : v;
        out[i] = (v * 32767) | 0;
      }
      sendPcm(out);
    }
  });
  tap.stderr.on('data', (d) => {
    const t = String(d).trim();
    if (/allowed|tapping|format|dBFS|silent/.test(t)) log('tap:', t.split('\n')[0]);
    // Without the capture grant the tap emits clocked silence, so a refusal must reach a human.
    // why: lessons/rig-m1.md#live-agent-refused
    if (/refus|denied|not permitted/i.test(t)) log('🔴 tap refused — run it once in a terminal and click Allow');
  });
  tap.on('exit', (c) => { log(`audiotap exited (${c})`); tap = null; });
}

// `audioChannels` is announced and `frameMs` lets the receiver check it: a payload cannot say.
// Not `channels`, which board.mjs uses for MIDI channels.
// why: lessons/rig-m1.md#live-agent-describe
const describe = () => ({ instrument: 'Ableton Live', rate: RATE, audioChannels: CH,
                          frameMs: FRAME_MS, msgPerSec: 1000 / FRAME_MS });

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
    send({ type: 'rack.hello', ...describe() });
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
        return send({ type: 'rack.state', ok: true, ...describe(),
                      tap: !!tap, midi: !!midi, frames: sent, held: held.size });
    }
  };
  ws.onclose = () => { log(`socket closed — back in ${backoff} ms`); setTimeout(connect, backoff); backoff = Math.min(8000, backoff * 2); };
  ws.onerror = (e) => log('socket error', e.message || e.type || '');
}

process.on('SIGINT', () => { note('panic'); setTimeout(() => process.exit(0), 150); });
log(`bin ${BIN}`);
connect();
