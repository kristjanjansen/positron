// demo/fake-board.mjs: a Raspberry Pi board that is nobody's board.
//
//   node demo/fake-board.mjs                                  # its own relay on :8897
//   node demo/fake-board.mjs --relay ws://127.0.0.1:9101      # join one already running
//   node demo/fake-board.mjs --listening                      # as if somebody else held the Circuit's lease
//
// Then open a board page against it:
//   http://127.0.0.1:8890/away/?relay=ws://127.0.0.1:8897&board=1
//   http://127.0.0.1:8890/knobs/?relay=ws://127.0.0.1:8897&board=1
//
// 🔴 WHY THIS EXISTS. plans/plan-routing-migration.md §3.8: every page that
// plays the board talks to one Raspberry Pi in another building, with one JACK
// graph and maybe a listener, so `createBoard` refuses every send under a
// harness and the suite grades nothing the page sends. This answers in the
// board's place, in the board's rooms, with the board's verbs, on a relay on
// this machine (`demo/fake-relay.mjs`), so a page can be driven for real.
//
// WHAT IT IS, AND WHERE EACH HALF COMES FROM:
//   - the MAIN ROOM (`studio-1`): `board.hello` and `board.alive` built by the
//     board's own `rig/board/beat.mjs`, so the graph a page draws is the graph
//     `boardGraph` makes; `graph.ask` answered with a beat, as the board does;
//     `audio.status`, `audio.start`, `audio.stop`, `note.on`, `note.off`,
//     `note.panic`, `voice.select`, `voices.list`, `ctl.set`, `ctl.meter`,
//     `cc` and `board.ping`, each answered in the name the board answers in.
//   - the INPUT ROOM (`studio-1-circuit`): the board's own `createInputs` from
//     `rig/board/inputs.mjs`, run with a fake `arecord` and a fake raw MIDI
//     port. So the lease, `input.want`, `audio.status`, the `midi.send` gate
//     (`midiVerdict`, which REFUSES SysEx, the `never` class on that port) and
//     the status a page reads are the board's code rather than a copy of it.
//
// 🔴 NOT SILENCE AND NOT WHITE NOISE, THE SAME RULE AS THE OTHER THREE STAND-INS.
// Every frame is 220 Hz and 330 Hz a fifth apart, the 330 gated on for the
// first quarter second of every half second. A frame count passes on silence;
// a peak does not, and the PULSE means a check can tell which way time runs.
// `toneFrame` is pure and exported so a test grades the same samples a page hears.
//
// 🔴 A COUNT FROM THE FAR SIDE. Every `midi.send` the gate lets through is
// WRITTEN to the fake port and counted there, and the board's own status
// carries it back to a page as `midi.out` in `audio.started`. A page that
// reads that number is reading the board's side of the boundary, never its own
// queue (positron-verify, `createMidiLane`'s `scheduled()`).
//
// ⚠️ WHAT IT IS NOT: H.264 (no GPU node is announced, so no page is offered a
// picture that cannot come), Yoshimi (the tone is fixed and a note changes
// nothing in it), and the direct WebRTC path (`direct: false`, so a page never
// fetches ICE for a board that cannot answer). A stand-in grades OUR code; a
// page green here can still meet a board that is off.
//
// 🔴 LOOPBACK ONLY. It refuses to join any relay that is not on this machine,
// because a fake board in the real `studio-1` would announce a Raspberry Pi
// that does not exist onto the owner's patchbay.

import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { EventEmitter } from 'node:events';
import { format, parse, randomId } from './shell/wire.mjs';
import { helloMsg, aliveMsg } from '../rig/board/beat.mjs';
import { createInputs, parseInputs } from '../rig/board/inputs.mjs';
import { startRelay } from './fake-relay.mjs';

export const RATE = 48000;
export const FRAME = 960;                 // 20 ms, the board's relay frame
export const FRAME_MS = 1000 * FRAME / RATE;
export const LOW_HZ = 220, HIGH_HZ = 330;
/** The 330 is on for the first PULSE_ON_S of every PULSE_S. */
export const PULSE_S = 0.5, PULSE_ON_S = 0.25;
const AMP = 0.3;                          // each tone, so the pair peaks near 0.6
const RAMP_S = 0.004;                     // a 4 ms edge on the gate, so it does not click

/**
 * The stand-in's signal at absolute sample `i`, as a float. Pure.
 * `silent` is the sabotage: the same frames, every sample zero.
 */
export function toneAt(i, rate = RATE, { silent = false } = {}) {
  if (silent) return 0;
  const t = i / rate;
  const ph = t % PULSE_S;
  const gate = ph >= PULSE_ON_S ? 0
    : Math.min(1, ph / RAMP_S, (PULSE_ON_S - ph) / RAMP_S);
  return AMP * Math.sin(2 * Math.PI * LOW_HZ * t) + gate * AMP * Math.sin(2 * Math.PI * HIGH_HZ * t);
}

/** `n` samples from absolute sample `start`, as int16, `channels` interleaved
 *  with the tone on channel `take` (1-based) and the others zero. */
export function toneFrame(start, n = FRAME, { rate = RATE, channels = 1, take = 1, silent = false } = {}) {
  const out = new Int16Array(n * channels);
  for (let k = 0; k < n; k++) {
    const v = toneAt(start + k, rate, { silent });
    out[k * channels + take - 1] = Math.max(-32768, Math.min(32767, Math.round(v * 32767)));
  }
  return out;
}

/** The 12 byte header every board frame carries: seq, then the sender's clock. */
export function pcmFrame(seq, int16) {
  const out = Buffer.allocUnsafe(12 + int16.byteLength);
  out.writeUInt32LE(seq >>> 0, 0);
  out.writeDoubleLE(performance.now(), 4);
  Buffer.from(int16.buffer, int16.byteOffset, int16.byteLength).copy(out, 12);
  return out;
}

/** Is this a relay on this machine. A fake board joins nothing else. */
export function loopbackRelay(url) {
  try {
    const u = new URL(url);
    return /^wss?:$/.test(u.protocol) && ['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname);
  } catch { return false; }
}

/**
 * A clock paced source: calls `onSamples(start, n)` with however many samples
 * are OWED since it started, every `tickMs`. Owed against the clock and not
 * per tick, because node's timers fire late and a stand-in that sends at the
 * timer's rate runs slow (positron-verify, `fake-station.mjs`).
 */
function paced(rate, tickMs, onSamples, unit = 1) {
  const t0 = performance.now();
  let sent = 0;
  const timer = setInterval(() => {
    const owed = Math.floor(((performance.now() - t0) / 1000) * rate / unit) * unit;
    if (owed > sent) { onSamples(sent, owed - sent); sent = owed; }
  }, tickMs);
  return () => clearInterval(timer);
}

/**
 * A fake `arecord`: an object shaped like a child process whose stdout is S16LE
 * of the tone at the device's channel count, paced by the clock.
 */
function fakeSpawn(opts) {
  return (cmd, args) => {
    const p = new EventEmitter();
    p.stdout = new EventEmitter();
    p.stderr = new EventEmitter();
    if (cmd !== 'arecord') { setImmediate(() => p.emit('exit', 127)); p.kill = () => {}; return p; }
    const channels = Number(args[args.indexOf('-c') + 1]) || 1;
    const stop = paced(RATE, 10, (start, n) => {
      const i16 = toneFrame(start, n, { channels, take: opts.take, silent: opts.silent });
      p.stdout.emit('data', Buffer.from(i16.buffer, i16.byteOffset, i16.byteLength));
    });
    p.kill = () => { stop(); setImmediate(() => p.emit('exit', null)); };
    return p;
  };
}

/** A fake ALSA raw MIDI port: every write is kept, so the count is the far side's. */
function fakeFs(written) {
  return {
    readlinkSync: () => 'card9',
    openSync: () => 9,
    closeSync: () => {},
    writeSync: (fd, buf) => { written.push([...buf]); return buf.length; },
  };
}

/**
 * Start a board.
 * @param {object} [o]
 * @param {string} [o.relay]      a loopback ws:// relay. Left out, one is started.
 * @param {number} [o.port]       the relay's port when one is started here
 * @param {string} [o.room]       the board's main room, `studio-1` like the Pi
 * @param {boolean} [o.listening] hold the Circuit's lease as another listener would
 * @param {boolean} [o.silent]    SABOTAGE: every frame zero
 * @param {boolean} [o.portGone]  SABOTAGE: the raw MIDI port refuses every write,
 *                               as an unplugged Circuit does, so nothing is counted
 * @param {boolean} [o.quiet]
 * @param {number} [o.beatMs]
 * Returns `{ relay, room, ready, stats(), close() }`; `ready` resolves when
 * both rooms are joined and the hellos are out.
 */
export function startBoard({ relay = null, port = 8897, room = 'studio-1', listening = false,
  silent = false, portGone = false, quiet = false, beatMs = 5000 } = {}) {
  const say = (...a) => { if (!quiet) console.log('[fake-board]', ...a); };
  let ownRelay = null;
  let resolveUrl;
  const urlReady = new Promise((r) => { resolveUrl = r; });
  if (!relay) {
    ownRelay = startRelay({ port, quiet });
    ownRelay.on('listening', () => resolveUrl(`ws://127.0.0.1:${ownRelay.address().port}`));
  } else {
    if (!loopbackRelay(relay)) throw new Error(`fake-board: ${relay} is not a relay on this machine, and a fake board joins nothing else`);
    resolveUrl(relay.replace(/\/$/, ''));
  }

  const counts = { hello: 0, alive: 0, asked: 0, audioStarts: 0, framesOut: 0, notesOn: 0, notesOff: 0, panics: 0,
    ctlIn: 0, ctlOut: 0, ctlFolded: 0, pings: 0 };
  const written = [];                      // MIDI bytes the input board WROTE, far side
  const since = Date.now();
  const NAME = 'fake-board', ID = 'stand-in';
  const INPUTS = parseInputs(JSON.stringify({
    circuit: { device: 'hw:CARD=Fake,DEV=0', channels: 2, take: 1, midi: { port: 'Circuit', channels: [1, 2, 10] } },
  }));
  const graphFacts = {
    room, instruments: { yoshimi: true }, inputs: INPUTS.inputs, ports: [],
    frameMs: FRAME_MS, gpu: false, midiPresent: () => true,
  };

  // ── the main room ─────────────────────────────────────────────────────────
  const FROM = `board-${randomId(6)}`;
  let ws = null, seq = 0, aseq = 0, source = null, stopTone = null, closed = false, beat = null;
  const ctl = { ch: 0, last: new Map() };
  const send = (msg) => { if (ws?.readyState === 1) { ws.send(format(msg, { from: FROM, seq: seq++ })); return true; } return false; };
  const alive = () => aliveMsg({ name: NAME, id: ID, upSec: Math.round((Date.now() - since) / 1000), audio: source,
    voices: 0, frames: counts.framesOut, insert: { fx: false }, graphFacts });

  function startTone() {
    if (stopTone) return;
    stopTone = paced(RATE, 10, (start, n) => {
      // Whole frames only: `paced` is asked in units of FRAME.
      for (let k = 0; k < n; k += FRAME) {
        if (ws?.readyState !== 1) return;
        ws.send(pcmFrame(aseq++, toneFrame(start + k, FRAME, { silent })));
        counts.framesOut++;
      }
    }, FRAME);
  }
  function stopAudio() {
    const was = source;
    stopTone?.(); stopTone = null; source = null;
    return { ok: !!was, stopped: was };
  }

  function handle(msg) {
    const reply = (type, body) => send({ type, re: msg.id, ...body });
    switch (msg.type) {
      case 'graph.ask': counts.asked++; send(alive()); return;
      case 'board.ping': counts.pings++; return reply('board.pong', { pongAt: Date.now() });
      case 'audio.status':
        return reply('audio.started', source ? { ok: true, source, jack: false, fx: false, standIn: true, inputs: inputs.status() }
          : { ok: false, reason: 'nothing playing', fx: false, standIn: true, inputs: inputs.status() });
      case 'audio.start': {
        const want = msg.source ?? 'yoshimi';
        if (want !== 'yoshimi' && want !== 'synth') return reply('audio.started', { ok: false, reason: `${want} is not installed on this board`, standIn: true });
        const already = source === want;
        source = want; counts.audioStarts++;
        startTone();
        return reply('audio.started', { ok: true, source, jack: false, already, port: null, fx: false, standIn: true });
      }
      case 'audio.stop': return reply('audio.stopped', stopAudio());
      case 'note.on':
        if (!source) { source = 'yoshimi'; startTone(); }
        counts.notesOn++;
        return reply('note.ack', { note: msg.note, channel: msg.channel ?? 0, on: source });
      case 'note.off': counts.notesOff++; return reply('note.ack', { note: msg.note });
      case 'note.panic': counts.panics++; return reply('note.ack', { panic: true, fx: null });
      case 'voices.list':
        return reply('voices.listed', { source: msg.source ?? source, ok: false, fixed: false, banks: [], count: 0,
          reason: 'this is a stand-in board and it has no library' });
      case 'voice.select':
        if (!source) return reply('voice.selected', { ok: false, reason: 'no instrument running' });
        if (!Number.isInteger(msg.program)) return reply('voice.selected', { ok: false, reason: 'send {program:<0-127>}', on: source });
        return reply('voice.selected', { ok: true, on: source, channel: msg.channel ?? 0,
          bank: Number.isInteger(msg.bank) ? msg.bank : null, program: msg.program, name: msg.name ?? null });
      case 'ctl.set': {
        if (!Array.isArray(msg.set)) return reply('ctl.ack', { ok: false, reason: 'ctl.set wants set: [[controller, value], ...]' });
        ctl.ch = msg.channel ?? ctl.ch;
        // Folded per message rather than per drain: a batch's later value for
        // the same controller overtakes its earlier one, and is counted.
        const seen = new Set();
        for (const pair of msg.set) {
          if (!Array.isArray(pair) || pair.length < 2) continue;
          const c = pair[0] | 0, v = Math.max(0, Math.min(127, pair[1] | 0));
          counts.ctlIn++;
          if (seen.has(c)) counts.ctlFolded++; else counts.ctlOut++;
          seen.add(c);
          ctl.last.set(c, { v, at: Date.now(), by: msg.from ?? null });
        }
        return;
      }
      case 'ctl.meter': {
        const now = Date.now();
        return reply('ctl.meter', { in: counts.ctlIn, out: counts.ctlOut, folded: counts.ctlFolded, forMs: now - since,
          on: source, channel: ctl.ch,
          set: [...ctl.last].map(([c, r]) => ({ ctrl: c, value: r.v, agoMs: now - r.at, by: r.by, name: null }))
            .sort((a, b) => a.agoMs - b.agoMs),
          volume: ctl.last.has(7) ? ctl.last.get(7).v : null });
      }
      case 'cc': return reply('cc.ack', { ok: !!source, on: source, standIn: true });
      default: return undefined;           // another client's traffic: the relay is verbatim
    }
  }

  function connect(url) {
    if (closed) return;
    ws = new WebSocket(`${url}/room/${room}/ws`);
    ws.binaryType = 'arraybuffer';
    ws.onopen = () => {
      counts.hello++;
      send(helloMsg({ name: NAME, id: ID, backend: 'stand-in', ports: [], dry: false, since, frameMs: FRAME_MS,
        instruments: graphFacts.instruments, graphFacts }));
      say(`joined ${room}`);
      opened.main?.();
    };
    ws.onmessage = (e) => {
      if (typeof e.data !== 'string' || e.data === 'pong') return;
      const { kind, msg } = parse(e.data);
      if (kind !== 'json' || msg.from === FROM) return;
      try { handle(msg); } catch (err) { send({ type: 'board.error', re: msg.id, error: err.message }); }
    };
    ws.onclose = () => { stopAudio(); if (!closed) setTimeout(() => connect(url), 500); };
    ws.onerror = () => {};
  }

  // ── the input room, through the board's own code ──────────────────────────
  const opened = {};
  const fs = fakeFs(written);
  const countingFs = portGone ? { ...fs, writeSync: () => { throw new Error('EBUSY: the stand-in port is gone'); } } : fs;
  let inputs = null;
  let listener = null;

  const ready = urlReady.then((url) => {
    const mainOpen = new Promise((r) => { opened.main = r; });
    connect(url);
    inputs = createInputs({
      inputs: INPUTS.inputs, room, relay: url, frame: FRAME, rate: RATE, name: NAME, id: ID,
      spawn: fakeSpawn({ take: 1, silent }), WebSocket, format, parse, randomId, fs: countingFs,
      log: (...a) => say('input', ...a), beatMs,
    });
    inputs.start();
    beat = setInterval(() => { counts.alive++; send(alive()); }, beatMs);
    beat.unref?.();
    const circuit = inputs.get('circuit');
    const inputOpen = new Promise((r) => {
      const t = setInterval(() => { if (circuit.s.ws?.readyState === 1) { clearInterval(t); r(); } }, 20);
    });
    if (listening) {
      // As if another page were listening: the board's own lease, renewed.
      const want = () => circuit.handle({ type: 'input.want', id: `stand-in-listener-${randomId(4)}` });
      inputOpen.then(want);
      listener = setInterval(want, 20_000);
    }
    return Promise.all([mainOpen, inputOpen]).then(() => url);
  });

  return {
    ready,
    room,
    get relay() { return ownRelay?.listening ? `ws://127.0.0.1:${ownRelay.address().port}` : relay; },
    relayServer: ownRelay,
    /** What the far side did, for a test. `midiWritten` is every message the gate let through. */
    stats: () => ({ ...counts, midiWritten: written.length, midi: written.slice(-16),
      inputs: inputs ? inputs.status() : null, relay: ownRelay?.stats?.() ?? null }),
    close() {
      closed = true;
      clearInterval(beat); clearInterval(listener);
      stopAudio();
      try { ws?.close(); } catch { /* gone */ }
      inputs?.close();
      ownRelay?.close();
    },
  };
}

if (resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const arg = (k) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : null; };
  const b = startBoard({ relay: arg('relay'), port: Number(arg('port')) || 8897, listening: process.argv.includes('--listening') });
  b.ready.then((url) => {
    console.log(`[fake-board] ready in ${url}/room/studio-1 and studio-1-circuit (nobody's board)`);
    console.log(`[fake-board] open http://127.0.0.1:8890/away/?relay=${url}&board=1`);
  });
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { b.close(); process.exit(0); });
}
