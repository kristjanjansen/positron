// node demo/fake-board.mjs [--relay ws://...] [--listening] [--skew ms] [--hand] The board's own
// beat.mjs, inputs.mjs, scollide.mjs and plaits.mjs on a loopback relay, with fake arecord, MIDI
// port, scsynth and posplaits and a 220/330 Hz pulsing tone. Page: ?relay=ws://127.0.0.1:8897&board=1.
// why: lessons/harness.md#fake-board

import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { EventEmitter } from 'node:events';
import { format, parse, randomId } from './shell/wire.mjs';
import { helloMsg, aliveMsg } from '../rig/board/beat.mjs';
import { createInputs, parseInputs } from '../rig/board/inputs.mjs';
import { startRelay } from './fake-relay.mjs';
import { createCollideService, ENGINES, PAGE_BUS } from '../rig/board/scollide.mjs';
import { readOsc } from '../rig/board/pappus.mjs';
import { createPlaitsService, PLAITS_PARAMS } from '../rig/board/plaits.mjs';
import { createSequencerService } from '../rig/board/sequencer.mjs';
import { graphOf } from '../rig/board/beat.mjs';
import { DRUM_MAPS } from './shell/drum-maps.mjs';

export const RATE = 48000;
export const FRAME = 960;                 // 20 ms, the board's relay frame
export const FRAME_MS = 1000 * FRAME / RATE;
export const LOW_HZ = 220, HIGH_HZ = 330;
/** The 330 is on for the first PULSE_ON_S of every PULSE_S. */
export const PULSE_S = 0.5, PULSE_ON_S = 0.25;
const AMP = 0.3;                          // each tone, so the pair peaks near 0.6
const RAMP_S = 0.004;                     // a 4 ms edge on the gate, so it does not click

// The signal at absolute sample `i`, pure. `silent` is the sabotage: every sample zero.
// why: lessons/harness.md#tone-at
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

// Calls onSamples(start, n) with the samples owed since start, every tickMs: timers fire late.
// why: lessons/harness.md#board-paced
function paced(rate, tickMs, onSamples, unit = 1) {
  const t0 = performance.now();
  let sent = 0;
  const timer = setInterval(() => {
    const owed = Math.floor(((performance.now() - t0) / 1000) * rate / unit) * unit;
    if (owed > sent) { onSamples(sent, owed - sent); sent = owed; }
  }, tickMs);
  return () => clearInterval(timer);
}

// A fake `arecord`: stdout is S16LE of the tone at the device's channel count, paced by the clock.
// why: lessons/harness.md#fake-spawn
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

// A fake raw MIDI port: writes are kept (the far side's count); `inbox` is the Circuit's MIDI out,
// read non-blocking (EAGAIN when empty), one reader at a time (EBUSY).
// why: lessons/harness.md#fake-fs
function fakeFs(written, inbox, writtenAt = []) {
  let reading = false;
  return {
    readlinkSync: () => 'card9',
    openSync: (pth, fl) => {
      if ((fl & 3) !== 0) return 9;                        // write
      if (reading) { const e = new Error('EBUSY: the stand-in input is open'); e.code = 'EBUSY'; throw e; }
      reading = true; return 10;
    },
    closeSync: (fd) => { if (fd === 10) { reading = false; inbox.length = 0; } },
    writeSync: (fd, buf) => { written.push([...buf]); writtenAt.push(performance.now()); return buf.length; },
    readSync: (fd, buf) => {
      const c = fd === 10 ? inbox.shift() : null;
      if (!c) { const e = new Error('EAGAIN'); e.code = 'EAGAIN'; throw e; }
      buf.set(c); return c.length;
    },
  };
}

// Takes /d_recv at once, decodes every bundle, counts on its own side how early each timetag
// arrived; a started node ends 300 ms after its time with /n_end. `now` is the skewed clock.
// why: lessons/harness.md#fake-scsynth
export function fakeScsynth({ now }) {
  const readers = new Set();
  const c = { bundles: 0, started: 0, timed: 0, immediate: 0, lateAtServer: 0, minLeadMs: null, maxLeadMs: null, recv: 0 };
  const timers = new Set();
  const end = (id, inMs) => {
    const t = setTimeout(() => { timers.delete(t); for (const fn of readers) fn({ addr: '/n_end', args: [id] }); }, Math.max(0, inMs));
    timers.add(t);
  };
  return {
    ok: true, mode: 'own', port: ENGINES.own.port, bus: PAGE_BUS,
    send(buf) {
      if (buf.subarray(0, 8).toString('latin1') !== '#bundle\0') return;
      c.bundles++;
      const sec = buf.readUInt32BE(8), frac = buf.readUInt32BE(12);
      const immediate = sec === 0 && frac === 1;
      const t = now();
      const atMs = immediate ? t : (sec - 2208988800) * 1000 + (frac / 4294967296) * 1000;
      if (immediate) c.immediate++;
      else {
        c.timed++;
        const lead = atMs - t;
        if (lead < 0) c.lateAtServer++;
        c.minLeadMs = c.minLeadMs == null ? lead : Math.min(c.minLeadMs, lead);
        c.maxLeadMs = c.maxLeadMs == null ? lead : Math.max(c.maxLeadMs, lead);
      }
      for (let i = 16; i + 4 <= buf.length;) {
        const n = buf.readInt32BE(i);
        const m = readOsc(buf.subarray(i + 4, i + 4 + n));
        i += 4 + n;
        if (m.addr === '/s_new') { c.started++; end(m.args[1], atMs - t + 300); }
      }
    },
    recv: async () => { c.recv++; return { ok: true }; },
    onReply: (fn) => { readers.add(fn); return () => readers.delete(fn); },
    cpu: async () => ({ ugens: 0, synths: 0, avg: 4, peak: 6 }),
    stop: () => { for (const t of timers) clearTimeout(t); timers.clear(); return true; },
    status: () => ({ standIn: true }),
    counts: () => ({ ...c }),
  };
}

// startBoard({ relay, port, room, listening, silent, portGone, quiet, beatMs, skewMs, hand })
// -> { relay, room, ready, stats(), close() }. silent and portGone are sabotages; hand sweeps
// M1 to M8 (CC 80 to 87) every 3 s while a lease is held.
// why: lessons/harness.md#start-board
export function startBoard({ relay = null, port = 8897, room = 'studio-1', listening = false,
  silent = false, portGone = false, quiet = false, beatMs = 5000, skewMs = 0, hand = false } = {}) {
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
  const writtenAt = [];                    // performance.now() of each write, for the sequencer's timing
  const since = Date.now();
  const NAME = 'fake-board', ID = 'stand-in';
  const INPUTS = parseInputs(JSON.stringify({
    circuit: { device: 'hw:CARD=Fake,DEV=0', channels: 2, take: 1, midi: { port: 'Circuit', channels: [1, 2, 10] } },
  }));
  const graphFacts = {
    // `collide`: the collide verbs ARE answered here, by the board's own service
    // (above), so its two nodes (`collide`, `drums`) are announced as the Pi does.
    room, instruments: { synth: true, collide: true, plaits: true }, inputs: INPUTS.inputs, ports: [],
    frameMs: FRAME_MS, gpu: false, midiPresent: () => true, plaitsParams: PLAITS_PARAMS,
    drums: { circuit: DRUM_MAPS.circuit, drums: DRUM_MAPS.gm }, sequencer: true,
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

  // The collide engine: the board's own service over a fake scsynth, on a
  // clock `skewMs` away from this machine's.
  const boardNow = () => performance.timeOrigin + performance.now() + skewMs;
  let scsynth = null;
  const collide = createCollideService({
    now: boardNow, log: (l) => say('collide', l),
    start: async () => {
      const s = fakeScsynth({ now: boardNow });
      const stopIt = s.stop;
      // The tone stops with the collide engine only when no other source holds it.
      s.stop = () => { stopIt(); if (!source) { stopTone?.(); stopTone = null; } return true; };
      scsynth = s; startTone();
      return s;
    },
  });

  // Plaits: the board's own service over a fake posplaits that keeps every command line it is
  // handed (the far side's count) and plays the tone while it is up.
  const plaitsLines = [];
  const plaits = createPlaitsService({
    log: (l) => say('plaits', l),
    start: async ({ voices }) => {
      startTone();
      let quit = false;
      return {
        ok: true, ready: { standIn: true, voices }, send: (line) => { if (!quit) plaitsLines.push(line); },
        onExit: () => {},
        stats: async () => ({ standIn: true, cmds: plaitsLines.length, loadPct: 0, xruns: 0 }),
        stop: () => { quit = true; if (!source) { stopTone?.(); stopTone = null; } return true; },
        status: () => ({ standIn: true }),
      };
    },
  });

  // The board's own sequencer, into the stand-in Circuit through the same input code and gate.
  const seqRefusals = [];
  const drumSeq = createSequencerService({
    graph: () => graphOf(graphFacts), log: (l) => say(l),
    midiSend: (bytes, refused) => inputs?.get('circuit')?.handle({ type: 'midi.send', bytes },
      (type, body) => { if (type === 'midi.refused') { seqRefusals.push(body?.why); refused(body?.why || 'refused'); } }),
  });

  function handle(msg) {
    const reply = (type, body) => send({ type, re: msg.id, ...body });
    if (drumSeq.handles(msg)) { drumSeq.handle(msg, reply).catch((e) => say('sequencer threw', e.message)); return undefined; }
    if (collide.handles(msg)) { collide.handle(msg, reply).catch((e) => say('collide threw', e.message)); return undefined; }
    if (plaits.handles(msg)) { plaits.handle(msg, reply).catch((e) => say('plaits threw', e.message)); return undefined; }
    switch (msg.type) {
      case 'graph.ask': counts.asked++; send(alive()); return;
      case 'board.ping': counts.pings++; return reply('board.pong', { pongAt: Date.now() });
      case 'audio.status':
        return reply('audio.started', { ...(source ? { ok: true, source, jack: false, fx: false, standIn: true }
          : { ok: false, reason: 'nothing playing', fx: false, standIn: true }), inputs: inputs.status(), plaits: plaits.status() });
      case 'audio.start': {
        // No source is refused in words; there is no default.
        // why: lessons/harness.md#no-source
        if (!msg.source) return reply('audio.started', { ok: false, reason: 'say which instrument to start: audio.start {source: "synth"}', standIn: true });
        const want = msg.source;
        if (want !== 'synth') return reply('audio.started', { ok: false, reason: `${want} is not installed on this board`, standIn: true });
        const already = source === want;
        source = want; counts.audioStarts++;
        startTone();
        return reply('audio.started', { ok: true, source, jack: false, already, port: null, fx: false, standIn: true });
      }
      case 'audio.stop': return reply('audio.stopped', stopAudio());
      case 'note.on':
        // A note to an idle board starts nothing.
        // why: lessons/harness.md#idle-note
        if (!source) return reply('note.ack', { note: msg.note, dropped: true, reason: 'nothing is playing on this board, send audio.start {source: "synth"} first' });
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
  const inbox = [];                        // what the stand-in Circuit "sends", read by the board's own code
  const fs = fakeFs(written, inbox, writtenAt);
  const macroAt = new Map();
  /** Turn a macro knob on the stand-in Circuit, as a hand does: one CC per
   *  step from where it was to `v`, clock bytes between. Returns the steps. */
  function turnMacro(cc, v, { ch = 1, steps = 8 } = {}) {
    const from = macroAt.get(`${ch}:${cc}`) ?? 64;
    const bytes = [];
    for (let i = 1; i <= steps; i++) bytes.push(0xF8, 0xB0 | (ch - 1), cc, Math.round(from + (v - from) * i / steps));
    macroAt.set(`${ch}:${cc}`, v);
    inbox.push(Uint8Array.from(bytes));
    return steps;
  }
  let handTimer = null, handAt = 0;
  if (hand) {
    handTimer = setInterval(() => {
      const cc = 80 + (handAt % 8);
      turnMacro(cc, 16 + Math.floor(Math.random() * 96));
      handAt++;
    }, 3000);
    handTimer.unref?.();
  }
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
    turnMacro,
    stats: () => ({ ...counts, midiWritten: written.length, midi: written.slice(-16),
      seq: { ...drumSeq.status(), refusals: seqRefusals.slice(-4) },
      /** Every byte message the gate let through with when it was written, from `since` (performance.now()). */
      midiSince: (since = 0) => written.map((b, i) => ({ b, at: writtenAt[i] })).filter((x) => x.at >= since),
      collide: { ...(collide.core()?.stats() ?? {}), scsynth: scsynth ? scsynth.counts() : null, skewMs },
      plaits: { ...(plaits.core()?.stats() ?? {}), lines: plaitsLines.length, last: plaitsLines.slice(-8) },
      inputs: inputs ? inputs.status() : null, relay: ownRelay?.stats?.() ?? null }),
    close() {
      closed = true;
      drumSeq.stop();
      collide.stop();
      plaits.stop();
      clearInterval(beat); clearInterval(listener); clearInterval(handTimer);
      stopAudio();
      try { ws?.close(); } catch { /* gone */ }
      inputs?.close();
      ownRelay?.close();
    },
  };
}

if (resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const arg = (k) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : null; };
  const b = startBoard({ relay: arg('relay'), port: Number(arg('port')) || 8897, listening: process.argv.includes('--listening'),
    skewMs: Number(arg('skew')) || 0, hand: process.argv.includes('--hand') });
  b.ready.then((url) => {
    console.log(`[fake-board] ready in ${url}/room/studio-1 and studio-1-circuit (nobody's board)`);
    console.log(`[fake-board] open http://127.0.0.1:8890/away/?relay=${url}&board=1`);
    console.log(`[fake-board] or http://127.0.0.1:8890/devices/drums/?relay=${url}&board=1&target=circuit`);
  });
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { b.close(); process.exit(0); });
}
