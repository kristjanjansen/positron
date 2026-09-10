// rig/box/box.mjs — the instrument in a box, as a SERVICE.
//
// plan-hardware §8.7: the box is not a peer. It dials OUT to the relay and does
// its job whether or not anyone is watching; a browser, `curl` and a phone are
// all equally clients of it. Nothing here opens a listening port, so there is no
// inbound firewall hole and it works from any network that allows outbound TLS.
//
// No browser on the box. Every permission failure this month — a grant that
// expired with its CDP client, a GUI app with no GUI session, a crash-recovery
// dialog nobody could click — came from running a browser unattended. This is a
// node process reading two ordinary Linux tools.
//
//   node box.mjs --room studio-1
//   node box.mjs --room studio-1 --dry        plan, never apply
//   node box.mjs --once                       join, say hello, report, leave
//
// The envelope is `demo/shell/wire.mjs`, imported rather than copied: the same
// file the pages use, so a change to the shape cannot reach only one end.
import { format, parse, randomId, RELAY_BASE, LIMITS } from '../../demo/shell/wire.mjs';
import { listPorts, addressable, plan, apply, clearAll, backend } from './alsa.mjs';
import { createSynth, alsaNotes, FRAME, RATE } from './synth.mjs';
import { startFluid, fluidAvailable, soundfontAt, VOICES, DEFAULT_SF } from './fluid.mjs';
import { spawn } from 'node:child_process';

const arg = (k, dflt) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : dflt;
};
const flag = (k) => process.argv.includes(`--${k}`);

const ROOM = arg('room', 'box-dev');
const NAME = arg('name', process.env.BOX_NAME || 'positron-box');
const DRY = flag('dry');
const ONCE = flag('once');
const AUDIO_DEV = arg('audio', process.env.BOX_AUDIO || 'default');
// Which relay is a PARAMETER, not a constant. A hop over the LAN and a hop
// over the internet are the same protocol, and cost 6 ms against 69 ms
// (measured, this repo). Choosing per hop is the point.
const RELAY = arg('relay', RELAY_BASE);
const URL_ = `${RELAY}/room/${ROOM}/ws`;

const FROM = `box-${randomId(6)}`;   // per SOCKET, per wire.mjs: `seq` counts a connection
let seq = 0, ws = null, audio = null, since = Date.now();
let synth = null, stopSynth = null, midiIn = null, fluid = null;

const log = (...a) => console.log(new Date().toISOString().slice(11, 23), ...a);
const send = (msg) => { if (ws?.readyState === 1) { ws.send(format(msg, { from: FROM, seq: seq++ })); return true; } return false; };

const state = () => {
  // `error` and `hint` ride along rather than being logged and dropped: the box
  // is in another room, so "ALSA is not working, and here is what to do" has to
  // be sayable OVER THE RELAY. Zero ports on its own cannot distinguish a
  // broken sequencer from an empty rig.
  const { backend: be, clients, error, hint } = listPorts();
  return { backend: be, ports: addressable(clients), error: error ?? null, hint: hint ?? null };
};

// ---------------------------------------------------------------- audio out
//
// Two sources, and the difference is the whole hardware story.
//
//   synth    the box makes the sound itself, from demo/shell/rhodes.mjs. Needs
//            NOTHING plugged in: no instrument, no interface, no soundcard.
//   capture  `arecord` reads a real device. Needs the board and an input.
//
// Both leave by the same 12-byte header and the same 20 ms framing as
// demo/carry, so the browser that plays this already exists and is deployed.
const BYTES = FRAME * 2;
let aseq = 0, sentFrames = 0;

function sendPcm(int16) {
  if (ws?.readyState !== 1) return;
  const out = Buffer.allocUnsafe(12 + int16.byteLength);
  out.writeUInt32LE(aseq++, 0);
  out.writeDoubleLE(performance.now(), 4);
  Buffer.from(int16.buffer, int16.byteOffset, int16.byteLength).copy(out, 12);
  ws.send(out);
  sentFrames++;
}

function startAudio(source = 'synth') {
  if (audio || stopSynth || fluid) return { ok: true, already: true, source: fluid ? 'fluidsynth' : stopSynth ? 'synth' : 'capture' };

  // A real multitimbral instrument: 16 channels, 16 GM programs, one process.
  // Its `file` audio driver is realtime-paced, so its stdout IS the stream —
  // no soundcard, no ALSA, nothing to mix.
  if (source === 'fluidsynth') {
    if (!fluidAvailable()) return { ok: false, reason: 'fluidsynth is not installed (apt: fluidsynth fluid-soundfont-gm)' };
    const sf = soundfontAt(arg('soundfont', DEFAULT_SF));
    // A missing soundfont is the silent failure here: fluidsynth starts happily
    // and plays nothing at all, which reads as a broken stream.
    if (!sf) return { ok: false, reason: `no soundfont at ${DEFAULT_SF} (apt: fluid-soundfont-gm)` };
    fluid = startFluid({ soundfont: sf, onFrame: sendPcm, onLog: (l) => log('fluidsynth:', l) });
    fluid.proc.on('exit', (code) => { log(`fluidsynth exited ${code}`); fluid = null; });
    log(`fluidsynth up · ${sf} · 16 channels`);
    return { ok: true, source: 'fluidsynth', soundfont: sf, channels: 16,
             rate: RATE, msgPerSec: RATE / FRAME, voices: Object.keys(VOICES) };
  }

  if (source === 'synth') {
    synth = createSynth();
    stopSynth = synth.startRealtime(sendPcm);
    // On the board, a real keyboard patched in with `aconnect` plays it too —
    // the synth is just another sequencer port, so the patchbay needs no
    // special case for it.
    if (backend() === 'alsa') {
      try {
        midiIn = alsaNotes(spawn, (kind, note, vel) => kind === 'on' ? synth.noteOn(note, vel) : synth.noteOff(note));
        midiIn.on('exit', () => { midiIn = null; });
      } catch (e) { log('aseqdump unavailable:', e.message); }
    }
    log(`synth up · ${RATE} Hz · ${FRAME}-sample frames · 50 msg/s (cap ${LIMITS.msgPerSec})`);
    return { ok: true, source: 'synth', rate: RATE, frameMs: 1000 * FRAME / RATE, msgPerSec: RATE / FRAME,
             midi: !!midiIn, needs: 'nothing plugged in' };
  }

  if (backend() !== 'alsa') return { ok: false, reason: 'no arecord here — capture needs the board' };
  const p = spawn('arecord', ['-D', AUDIO_DEV, '-f', 'S16_LE', '-r', String(RATE), '-c', '1', '-t', 'raw', '-q'],
    { stdio: ['ignore', 'pipe', 'pipe'] });
  let carry = Buffer.alloc(0);
  p.stdout.on('data', (chunk) => {
    carry = carry.length ? Buffer.concat([carry, chunk]) : chunk;
    while (carry.length >= BYTES) {
      sendPcm(new Int16Array(carry.buffer.slice(carry.byteOffset, carry.byteOffset + BYTES)));
      carry = carry.subarray(BYTES);
    }
  });
  // arecord's complaints go to stderr and are the only clue when a device name
  // is wrong. Silence here is what made three "BlackHole is silent" readings.
  p.stderr.on('data', (d) => log('arecord:', String(d).trim()));
  p.on('exit', (code) => { log(`arecord exited ${code} after ${sentFrames} frames`); audio = null; });
  audio = p;
  return { ok: true, source: 'capture', device: AUDIO_DEV, rate: RATE };
}

function stopAudio() {
  const was = fluid ? 'fluidsynth' : stopSynth ? 'synth' : audio ? 'capture' : null;
  if (fluid) { fluid.stop(); fluid = null; }
  if (stopSynth) { stopSynth(); stopSynth = null; synth = null; }
  if (midiIn) { midiIn.kill('SIGTERM'); midiIn = null; }
  if (audio) { audio.kill('SIGTERM'); audio = null; }
  return { ok: true, was, frames: sentFrames };
}

// ---------------------------------------------------------------- requests
//
// Every verb that changes the rig has a PLAN twin that changes nothing, so a
// client can always ask "what would this do" first. A wrong MIDI patch is
// silent; a plan is not.
function handle(msg) {
  const reply = (type, body) => send({ type, re: msg.id, ...body });
  switch (msg.type) {
    case 'ports.get': {
      const s = state();
      return reply('ports.list', { backend: s.backend, ports: s.ports });
    }
    case 'patch.plan': {
      const s = state();
      return reply('patch.planned', { ...plan(msg.patch, s.ports), backend: s.backend });
    }
    case 'patch.apply': {
      const s = state();
      const planned = plan(msg.patch, s.ports);
      if (!planned.ok) return reply('patch.applied', { ok: false, ...planned, applied: false });
      const res = apply(planned, { dry: DRY });
      log(`patch: ${res.ran.map((r) => `${r.label} ${r.result}`).join(', ') || 'nothing to do'}`);
      return reply('patch.applied', { ...res, applied: !DRY, steps: planned.steps });
    }
    case 'patch.clear':
      log('clearing every subscription');
      return reply('patch.cleared', clearAll({ dry: DRY }));
    case 'audio.start': return reply('audio.started', startAudio(msg.source ?? 'synth'));
    // Notes from anywhere: a browser keyboard, a phone, `ask.mjs`. The box does
    // not care which, and does not need one to exist.
    case 'note.on':
      // Whichever instrument is running takes the note. Nothing running starts
      // the built-in one, so a client never has to sequence two calls.
      if (!synth && !fluid) startAudio('synth');
      if (fluid) fluid.noteOn(msg.channel ?? 0, msg.note, msg.vel ?? 100);
      else synth.noteOn(msg.note, msg.vel ?? 100);
      return reply('note.ack', { note: msg.note, channel: msg.channel ?? 0, on: fluid ? 'fluidsynth' : 'synth', voices: synth?.voices ?? null });
    case 'note.off':
      if (fluid) fluid.noteOff(msg.channel ?? 0, msg.note);
      else if (synth) synth.noteOff(msg.note);
      return reply('note.ack', { note: msg.note, voices: synth?.voices ?? null });
    case 'note.panic':
      if (fluid) fluid.panic();
      if (synth) synth.allOff();
      return reply('note.ack', { panic: true, voices: synth?.voices ?? 0 });
    // The multitimbral surface: one call per channel, then sixteen channels are
    // sixteen instruments. Names so a client need not memorise GM numbers.
    case 'voice.select': {
      if (!fluid) return reply('voice.selected', { ok: false, reason: 'voice.select needs the fluidsynth source' });
      const prog = typeof msg.voice === 'string' ? VOICES[msg.voice] : msg.program;
      if (prog === undefined) return reply('voice.selected', { ok: false, reason: `unknown voice ${JSON.stringify(msg.voice)}`, known: Object.keys(VOICES) });
      fluid.select(msg.channel ?? 0, prog);
      return reply('voice.selected', { ok: true, channel: msg.channel ?? 0, voice: msg.voice ?? null, program: prog });
    }
    case 'cc':
      if (fluid) fluid.cc(msg.channel ?? 0, msg.ctrl, msg.value);
      return reply('cc.ack', { ok: !!fluid });
    case 'audio.stop':  return reply('audio.stopped', stopAudio());
    case 'box.ping':    return reply('box.pong', { at: Date.now() });
    default: return false;      // another client's traffic; the relay is verbatim
  }
}

// ---------------------------------------------------------------- the socket
//
// Reconnect forever. Nobody is in that room, so "it gave up after five tries"
// is the same as "it is dead" — but a tight retry loop against an edge that is
// down is a self-inflicted outage, so back off and cap.
let backoff = 500;
function connect() {
  log(`dialing ${URL_} as ${FROM}`);
  ws = new WebSocket(URL_);
  ws.binaryType = 'arraybuffer';

  ws.onopen = () => {
    backoff = 500;
    const s = state();
    log(`joined ${ROOM} · backend ${s.backend} · ${s.ports.length} ports${DRY ? ' · DRY' : ''}`);
    if (s.error) log(`  ALSA: ${s.error}${s.hint ? `\n  -> ${s.hint}` : ''}`);
    send({ type: 'box.hello', name: NAME, backend: s.backend, ports: s.ports.length, dry: DRY, since,
                 instruments: { synth: true, fluidsynth: fluidAvailable() && !!soundfontAt() },
                 ...(s.error ? { error: s.error, hint: s.hint } : {}) });
    if (ONCE) { console.log(JSON.stringify(s, null, 2)); setTimeout(() => process.exit(0), 400); }
  };
  ws.onmessage = (e) => {
    if (typeof e.data !== 'string') return;               // audio is ours, outbound only
    const { kind, msg } = parse(e.data);
    if (kind !== 'json' || msg.from === FROM) return;      // never answer yourself
    try { handle(msg); }
    catch (err) { log('handler threw:', err.message); send({ type: 'box.error', re: msg.id, error: err.message }); }
  };
  ws.onclose = (e) => {
    log(`closed ${e.code} — retrying in ${backoff} ms`);
    stopAudio();
    if (!ONCE) setTimeout(connect, backoff);
    backoff = Math.min(backoff * 2, 30_000);
  };
  // A close always follows an error here, so retrying on both would double the
  // reconnects and halve the backoff.
  ws.onerror = () => {};
}

// Alive before you need it: a heartbeat means "the box is fine, the question is
// elsewhere" can be answered without going to the room.
setInterval(() => send({ type: 'box.alive', name: NAME, upSec: Math.round((Date.now() - since) / 1000), audio: fluid ? 'fluidsynth' : stopSynth ? 'synth' : audio ? 'capture' : null, voices: synth?.voices ?? 0, frames: sentFrames }), 5000).unref?.();

for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { stopAudio(); try { ws?.close(); } catch {} process.exit(0); });
connect();
