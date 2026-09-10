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
import { createSynth, createMoogSynth, MOOG_PATCHES, alsaNotes, FRAME, RATE } from './synth.mjs';
import { startFluid, fluidAvailable, soundfontAt, VOICES, DEFAULT_SF } from './fluid.mjs';
import { startJackSynth, jackSynthAvailable, JACK_SYNTHS,
         pappusFx, pappusAvailable, pappusRandomise, stopPappus } from './jacksynth.mjs';
import { spawn, execFileSync } from 'node:child_process';
import { readdirSync, statSync, realpathSync } from 'node:fs';

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
let synth = null, stopSynth = null, midiIn = null, fluid = null, jsyn = null;
// ⚠️ Set BEFORE any await in startAudio. Raising a JACK chain takes ~13 s,
// and during that window jsyn is still null — so a note.on arriving mid-start
// saw 'nothing running' and started FluidSynth alongside it. Two instruments,
// interleaved samples, 100 msg/s into a 60 msg/s relay. Measured twice.
let starting = null;
let fxOn = false;          // pappus inserted between the instrument and the capture
let lastHeard = Date.now();

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

async function startAudio(source = 'synth', msg = null) {
  // ⚠️ REPLACE, do not refuse. This used to return {already:true} when
  // anything was running, so picking a second instrument left the first one
  // ALSO streaming: two sources into one socket at 50 msg/s each, interleaved
  // samples, and 100 msg/s against the relay's 60 — measured 60 frames/s
  // arriving and 5,495 dropped at the relay. It sounds like corruption and it
  // is two instruments talking over each other.
  if (starting) return { ok: false, reason: `already starting ${starting}`, starting };
  const running = jsyn ? jsyn.source : fluid ? 'fluidsynth' : stopSynth ? 'synth' : audio ? 'capture' : null;
  if (running) {
    if (running === source && source !== 'fluidsynth') return { ok: true, already: true, source: running };
    log(`switching ${running} -> ${source}`);
    stopAudio();
    await new Promise((r) => setTimeout(r, 600));   // let the old one actually die
  }

  // JACK-client instruments: hexter (the real DX7, factory cartridges) and
  // yoshimi. They cannot write to a pipe, so jacksynth.mjs raises jackd, the
  // synth and an ffmpeg capture, and plays them by writing raw MIDI bytes to
  // a snd-virmidi device that aconnect routes to their sequencer port.
  if (JACK_SYNTHS[source]) {
    if (!jackSynthAvailable(source)) return { ok: false, reason: `${source} is not installed on this box` };
    starting = source;
    log(`starting ${source} (jack chain) ...`);
    let r;
    try { r = await startJackSynth(source, { onFrame: sendPcm, onLog: (l) => log(`${source}:`, l) }); }
    finally { starting = null; }
    if (!r.ok) { log(`${source} failed: ${r.reason}`); return r; }
    jsyn = r;
    log(`${source} up · port ${r.port} · midi ${r.midi ? 'in' : 'NONE'}`);
    // An instrument change re-patches the graph, so a switched-on insert has to
    // be put back or it silently drops out from under the new instrument.
    if (fxOn) await pappusFx(true, { instrumentPort: r.port, onLog: (l) => log('pappus:', l) });
    return { ok: true, source, port: r.port, midi: r.midi, rate: r.rate, msgPerSec: r.msgPerSec, fx: fxOn ? 'pappus' : null };
  }


  // A real multitimbral instrument: 16 channels, 16 GM programs, one process.
  // Its `file` audio driver is realtime-paced, so its stdout IS the stream —
  // no soundcard, no ALSA, nothing to mix.
  if (source === 'fluidsynth') {
    if (!fluidAvailable()) return { ok: false, reason: 'fluidsynth is not installed (apt: fluidsynth fluid-soundfont-gm)' };
    // A client may name the soundfont, so instruments can be A/B'd live rather
    // than by restarting the box. Resolved against the filesystem either way —
    // a missing soundfont is the silent failure here.
    const sf = soundfontAt(msg?.soundfont ?? arg('soundfont', DEFAULT_SF));
    // A missing soundfont is the silent failure here: fluidsynth starts happily
    // and plays nothing at all, which reads as a broken stream.
    if (!sf) return { ok: false, reason: `no soundfont at ${DEFAULT_SF} (apt: fluid-soundfont-gm)` };
    fluid = startFluid({ soundfont: sf, onFrame: sendPcm, onLog: (l) => log('fluidsynth:', l) });
    fluid.proc.on('exit', (code) => { log(`fluidsynth exited ${code}`); fluid = null; });
    log(`fluidsynth up · ${sf} · 16 channels`);
    return { ok: true, source: 'fluidsynth', soundfont: sf, channels: 16,
             rate: RATE, msgPerSec: RATE / FRAME, voices: Object.keys(VOICES) };
  }

  // ⚠️ 'synth' (the FM Rhodes) and 'moog' are NO LONGER OFFERED as instruments.
  // Both were written to find out what a box can do with plain arithmetic, and
  // both were beaten by things already packaged: hexter plays the real DX7
  // factory cartridges, and SuperCollider's MoogFF is a correct ladder where
  // this one's resonance measurably does nothing (loop gain 0.001 at fc 900).
  // The code stays in demo/shell for /carry/ and for the microcontroller path
  // where no plugin can follow — see README, "the two we wrote and removed".
  // Kept reachable with an explicit source name so the measurements can be
  // reproduced; not listed, not the default, not on the page.
  if (source === 'moog') {
    synth = createMoogSynth({ patch: msg?.patch ?? 'bass' });
    stopSynth = synth.startRealtime(sendPcm);
    log(`moog up · patch ${msg?.patch ?? 'bass'}`);
    return { ok: true, source: 'moog', patch: msg?.patch ?? 'bass', patches: Object.keys(MOOG_PATCHES),
             rate: RATE, msgPerSec: RATE / FRAME, needs: 'nothing plugged in' };
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
  const was = jsyn ? jsyn.source : fluid ? 'fluidsynth' : stopSynth ? 'synth' : audio ? 'capture' : null;
  aseq = 0;                       // a new source restarts the sequence
  if (jsyn) { jsyn.stop(); jsyn = null; }
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
async function handle(msg) {
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
    case 'audio.start':
      startAudio(msg.source ?? 'fluidsynth', msg).then((r) => reply('audio.started', r));
      return true;
    // Notes from anywhere: a browser keyboard, a phone, `ask.mjs`. The box does
    // not care which, and does not need one to exist.
    case 'note.on':
      // Whichever instrument is running takes the note.
      // If something is mid-start, do NOT start a second instrument — drop the
      // note. One missed note is nothing; two instruments is a broken stream.
      if (starting) return reply('note.ack', { note: msg.note, dropped: true, starting });
      if (!synth && !fluid && !jsyn) await startAudio('fluidsynth', {});
      if (jsyn) jsyn.noteOn(msg.channel ?? 0, msg.note, msg.vel ?? 100);
      else if (fluid) fluid.noteOn(msg.channel ?? 0, msg.note, msg.vel ?? 100);
      else synth?.noteOn(msg.note, msg.vel ?? 100);
      return reply('note.ack', { note: msg.note, channel: msg.channel ?? 0,
        on: jsyn ? jsyn.source : fluid ? 'fluidsynth' : 'synth' });
    case 'note.off':
      if (jsyn) jsyn.noteOff(msg.channel ?? 0, msg.note);
      else if (fluid) fluid.noteOff(msg.channel ?? 0, msg.note);
      else if (synth) synth.noteOff(msg.note);
      return reply('note.ack', { note: msg.note });
    case 'note.panic':
      if (jsyn) jsyn.panic();
      if (fluid) fluid.panic();
      if (synth) synth.allOff();
      return reply('note.ack', { panic: true });
    // The multitimbral surface: one call per channel, then sixteen channels are
    // sixteen instruments. Names so a client need not memorise GM numbers.
    case 'voice.select': {
      // Every instrument here answers program change; only the MEANING of the
      // number differs. FluidSynth's are General MIDI, hexter's index the
      // loaded DX7 cartridge, Yoshimi's index its current bank — so a client
      // sends either a GM name (fluidsynth) or a program number (anything).
      if (jsyn) {
        const prog = typeof msg.voice === 'string' ? VOICES[msg.voice] : msg.program;
        if (prog === undefined) return reply('voice.selected', { ok: false, reason: 'send {program:<0-127>} to this instrument', on: jsyn.source });
        jsyn.program(msg.channel ?? 0, prog);
        return reply('voice.selected', { ok: true, on: jsyn.source, channel: msg.channel ?? 0, program: prog, name: msg.name ?? null });
      }
      if (!fluid) return reply('voice.selected', { ok: false, reason: 'no instrument running' });
      const prog = typeof msg.voice === 'string' ? VOICES[msg.voice] : msg.program;
      if (prog === undefined) return reply('voice.selected', { ok: false, reason: `unknown voice ${JSON.stringify(msg.voice)}`, known: Object.keys(VOICES) });
      fluid.select(msg.channel ?? 0, prog);
      return reply('voice.selected', { ok: true, channel: msg.channel ?? 0, voice: msg.voice ?? null, program: prog });
    }
    case 'cc': {
      // Yoshimi answers CC 74 (cutoff) and 71 (resonance) for real; hexter has
      // no filter at all but takes CC 16/17/18/19/80/81 as operator coarse
      // frequency, effective on notes ALREADY SOUNDING.
      if (jsyn) { jsyn.cc(msg.channel ?? 0, msg.ctrl, msg.value); return reply('cc.ack', { ok: true, on: jsyn.source }); }
      if (fluid) { fluid.cc(msg.channel ?? 0, msg.ctrl, msg.value); return reply('cc.ack', { ok: true, on: 'fluidsynth' }); }
      // 74 and 71 are the conventional cutoff and resonance, so a hardware knob
      // maps onto them with no translation anywhere.
      const k = msg.ctrl === 74 ? 'cutoff' : msg.ctrl === 71 ? 'resonance' : msg.ctrl === 79 ? 'envAmount' : null;
      const ok = !!(k && synth?.set?.(k, msg.value));
      return reply('cc.ack', { ok, on: ok ? 'moog' : null, control: k, value: msg.value, patch: ok ? synth.patch : null });
    }
    case 'moog.patch':
      return reply('moog.patched', { ok: !!synth?.setPatch?.(msg.patch), patch: msg.patch, patches: Object.keys(MOOG_PATCHES) });
    case 'audio.stop':  return reply('audio.stopped', stopAudio());
    case 'sf.list': {
      const dirs = (process.env.BOX_SF_DIRS || '/sf:/usr/share/sounds/sf2').split(':');
      const out = [], seen = new Set();
      for (const d of dirs) {
        try {
          for (const f of readdirSync(d)) if (/\.sf[23]$/i.test(f)) {
            const p = `${d}/${f}`;
            // Debian ships default-GM.sf2 as an ALTERNATIVES SYMLINK to
            // FluidR3_GM.sf2, so a naive listing offers one 141 MB file twice
            // under two names. Dedupe on the resolved path.
            let real; try { real = realpathSync(p); } catch { continue; }
            if (seen.has(real)) continue;
            seen.add(real);
            out.push({ path: real, name: f.replace(/\.sf[23]$/i, ''), mb: +(statSync(real).size / 1048576).toFixed(1) });
          }
        } catch { /* a directory that is not there is not an error, it is empty */ }
      }
      return reply('sf.listed', { soundfonts: out });
    }
    // What is sounding RIGHT NOW. A page that joins mid-session has clicked
    // nothing, so without this it shows no selection while the box plays on —
    // a readout that contradicts the thing it is describing.
    // Roll the granular parameters. A program change means nothing to Pappus —
    // it has no patches, it has 106 knobs — so "random" has to mean something
    // different here, and this is it.
    // Pappus is an INSERT, not an instrument: it wraps whatever is playing.
    // It only reaches JACK instruments — fluidsynth writes to a pipe and never
    // appears on the JACK graph at all, which is worth saying rather than
    // failing quietly.
    case 'fx.pappus': {
      const want = msg.on !== false;
      if (want && !jsyn) return reply('fx.pappus', { ok: false, reason: 'pappus can only wrap hexter or yoshimi — fluidsynth does not go through JACK' });
      const r = await pappusFx(want, { instrumentPort: jsyn?.port, onLog: (l) => log('pappus:', l) });
      if (r.ok) fxOn = want;
      return reply('fx.pappus', { ...r, instrument: jsyn?.source ?? null });
    }
    case 'params.random':
      if (!fxOn) return reply('params.rolled', { ok: false, reason: 'pappus is not switched on' });
      return reply('params.rolled', { ok: true, on: 'pappus', params: pappusRandomise() });
    case 'params.set':
      return reply('params.set', { ok: fxOn });
    case 'audio.status':
      return reply('audio.started', jsyn ? { ok: true, source: jsyn.source, fx: fxOn ? 'pappus' : null }
        : fluid ? { ok: true, source: 'fluidsynth', soundfont: fluid.soundfont ?? null }
        : stopSynth ? { ok: true, source: 'synth' }
        : audio ? { ok: true, source: 'capture' }
        : { ok: false, reason: 'nothing playing' });
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
    lastHeard = Date.now();
    const s = state();
    log(`joined ${ROOM} · backend ${s.backend} · ${s.ports.length} ports${DRY ? ' · DRY' : ''}`);
    if (s.error) log(`  ALSA: ${s.error}${s.hint ? `\n  -> ${s.hint}` : ''}`);
    send({ type: 'box.hello', name: NAME, backend: s.backend, ports: s.ports.length, dry: DRY, since,
                 instruments: { synth: true, fluidsynth: fluidAvailable() && !!soundfontAt(), pappusFx: pappusAvailable(),
                                ...Object.fromEntries(Object.keys(JACK_SYNTHS).map((k) => [k, jackSynthAvailable(k)])) },
                 ...(s.error ? { error: s.error, hint: s.hint } : {}) });
    if (ONCE) { console.log(JSON.stringify(s, null, 2)); setTimeout(() => process.exit(0), 400); }
  };
  ws.onmessage = (e) => {
    lastHeard = Date.now();                               // ANY frame proves the socket lives
    if (typeof e.data !== 'string') return;               // audio is ours, outbound only
    const { kind, msg } = parse(e.data);
    if (kind !== 'json' || msg.from === FROM) return;      // never answer yourself
    // handle() is async now (raising a JACK chain takes seconds), so a throw
    // arrives as a rejection — an unhandled one would take the service down.
    Promise.resolve().then(() => handle(msg)).catch((err) => {
      log('handler threw:', err.message);
      send({ type: 'box.error', re: msg.id, error: err.message });
    });
  };
  ws.onclose = (e) => {
    clearInterval(ws.__watchdog);
    log(`closed ${e.code} — retrying in ${backoff} ms`);
    stopAudio();
    if (!ONCE) setTimeout(connect, backoff);
    backoff = Math.min(backoff * 2, 30_000);
  };
  // A close always follows an error here, so retrying on both would double the
  // reconnects and halve the backoff.
  ws.onerror = () => {};

  /**
   * A DEAD SOCKET DOES NOT ALWAYS CLOSE. Measured 2026-09-10: the Durable
   * Object hibernated, the relay reported `sockets: 0`, and this process
   * carried on with `readyState === 1` sending into nothing. No error, no
   * close, no reconnect -- the box looked healthy and answered nobody, which
   * is the exact failure mode a service in another room cannot afford.
   *
   * The fix uses a property the relay documents: it echoes every message back
   * to the SENDER too. So the 5 s heartbeat is self-addressed proof of life --
   * if it has not come back for three beats the socket is gone whatever it
   * claims, and we reconnect rather than believe it.
   */
  ws.__watchdog = setInterval(() => {
    if (ws.readyState !== 1) return;
    if (Date.now() - lastHeard < 16000) return;
    log('no echo in 16 s -- socket dead but not closed. reconnecting.');
    try { ws.close(); } catch { /* already gone, which is the point */ }
  }, 4000);
  ws.__watchdog.unref?.();
}

// Alive before you need it: a heartbeat means "the box is fine, the question is
// elsewhere" can be answered without going to the room.
setInterval(() => send({ type: 'box.alive', name: NAME, upSec: Math.round((Date.now() - since) / 1000), audio: fluid ? 'fluidsynth' : stopSynth ? 'synth' : audio ? 'capture' : null, voices: synth?.voices ?? 0, frames: sentFrames }), 5000).unref?.();

/**
 * ⚠️ Sweep orphans at startup. Audio children (jackd, a synth, an ffmpeg
 * capture) outlive a restarted service — systemd replaces the node process but
 * nothing reaps what it spawned. They then collide with the new chain: a stale
 * scsynth holding 33% of a core, two jack-dssi-hosts, and a capture whose jackd
 * somebody else killed, which presents as a box that answers pings and makes no
 * sound. Measured on the board twice.
 *
 * pkill -x, NEVER -f: the -f pattern would match this process's own command
 * line and kill the service being started.
 */
function sweepOrphans() {
  for (const name of ['fluidsynth', 'jack-dssi-host', 'yoshimi', 'sclang', 'scsynth', 'ffmpeg', 'jackd']) {
    try { execFileSync('pkill', ['-9', '-x', name], { stdio: 'pipe' }); log(`swept a stray ${name}`); }
    catch { /* nothing of that name, which is the normal case */ }
  }
}
if (backend() === 'alsa') sweepOrphans();

for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { stopAudio(); try { ws?.close(); } catch {} process.exit(0); });
connect();
