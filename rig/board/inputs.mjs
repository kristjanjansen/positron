// rig/board/inputs.mjs — hardware audio inputs, each streamed into a room of its own.
//
// Asked 2026-09-30: *"can we support both yoshimi and circuit? current setup
// does not scale"*. Until then the board had ONE audio slot and ONE room, so
// starting Yoshimi took the Circuit off the air and the other way round. The
// single slot was right about one thing and it stays right: two sources
// interleaved into ONE socket is corruption (board.mjs `startAudio` records
// the 5,495 dropped frames). What this file changes is the unit. An input is
// not a source in the instrument slot, it is a stream of its own, on a socket
// of its own, in a room of its own: `<room>-<name>`, the same shape the video
// already uses with `<room>-video`.
//
// 🔴 A PAGE ASKS FOR A NAME, NEVER A DEVICE. What `circuit` means on this
// board is configuration (`BOARD_INPUTS` in /etc/default/positron-board), so
// nothing that arrives over the relay can make this process open an arbitrary
// ALSA device.
//
// 🔴 AN INPUT RUNS ONLY WHILE SOMEBODY IS ASKING FOR IT. The board cannot see a
// listener: the relay forwards frames verbatim and never says who is there. So
// a listening page renews a lease with `input.want`, and the capture stops
// `LEASE_MS` after the last renewal. Streaming 50 frames a second into an empty
// room all day costs relay time for nothing.
//
// ⚠️ THE ROOM IS JOINED FOR GOOD, THE DEVICE IS NOT. The socket stays open and
// says `board.alive` every beat, so a page's presence badge reads `online`
// before anything is playing; only `arecord` comes and goes with the lease.

import { CIRCUIT_CC } from '../../demo/shell/circuit-cc.mjs';
import { kindOf } from '../../demo/shell/midi-kinds.mjs';
import { createRtc } from './rtc.mjs';
import { constants as FS } from 'node:fs';

export const LEASE_MS = 60_000;

/**
 * 🔴 THE SYNTH CONTROLLERS, READ FROM THE ONE TABLE `/shape/` SENDS FROM, AND
 * ONLY ITS `1/2` ROWS. Asked 2026-09-30: *"make it work with pi circuit"*, so
 * the gate below widened from note on, note off and CC 123 to those plus the
 * 52 control changes Novation's Programmer's Reference documents for Synth 1
 * and Synth 2. Imported rather than copied, because a second list is a second
 * list that disagrees; `setup.sh` already carries every `../../demo/shell`
 * import onto the board.
 * 📄 READ, NOT MEASURED, AND THE SOURCE IS `plans/plan-circuit-patches.md` §5
 * and its list of what destroys work: the Circuit's whole published SysEx
 * surface is three messages and only `Replace Patch` writes flash; a program
 * change and a `Replace Current Patch` replace the sound in RAM; a control
 * change is on neither list. What it changes is the patch a synth is holding,
 * which reloading the session puts back.
 * ⚠️ AND THE DRUM AND SESSION ROWS STAY OUT ON PURPOSE. CC 8, 18, 44 and 50 on
 * channel 10 are `drum N patch select`, and channel 16 holds the session's
 * levels; neither was asked for, and a gate that grows with the table's other
 * rows grows by accident.
 */
export const SYNTH_CC = new Set(CIRCUIT_CC.filter((p) => p.ch === '1/2').map((p) => p.cc));
export const SYNTH_CHANNELS = [1, 2];

/**
 * 🔴 THE ONE SysEx THE GATE LETS OUT, SINCE 2026-10-11, AND IT IS A READ.
 * Asked as *"show initial patch name on selector"* for `/concepts/synth/070/`,
 * option 1 chosen verbatim. 📄 Circuit Programmer's Reference Guide 1.3, p13,
 * read off the table rather than the plans (which disagree, 9 against 10):
 *   F0 00 20 29 01 60 40 <00|01> F7, "9 bytes in total"
 * The Circuit answers with a 350 byte Replace Current Patch on its USB port,
 * which is a message FROM the instrument and is never written back to it.
 * ⚠️ MATCHED BYTE FOR BYTE AND BY LENGTH, NEVER BY PREFIX. A Replace Current
 * Patch (command 00) and a Replace Patch (01, which writes flash) share this
 * header and differ from the request in byte 6 and in length, so a prefix test
 * on the header is exactly the gate that lets the dangerous ones through.
 * `test.mjs` sabotages this and counts the reds.
 * Returns the location, 0 for Synth 1 and 1 for Synth 2, or null.
 */
export const DUMP_REQUEST_HEAD = Object.freeze([0xF0, 0x00, 0x20, 0x29, 0x01, 0x60, 0x40]);
export function dumpRequestSynth(bytes) {
  if (!Array.isArray(bytes) || bytes.length !== 9) return null;
  for (let i = 0; i < DUMP_REQUEST_HEAD.length; i++) if (bytes[i] !== DUMP_REQUEST_HEAD[i]) return null;
  if (bytes[7] !== 0x00 && bytes[7] !== 0x01) return null;
  if (bytes[8] !== 0xF7) return null;
  return bytes[7];
}

/**
 * 🔴 AND THE SECOND, THE UNIVERSAL DEVICE INQUIRY, SINCE 2026-10-11. Asked
 * *"Add it and test"*, after the dump request went unanswered on this desk,
 * to learn whether this Circuit answers SysEx at all. 📄 MIDI 1.0 General
 * Information, Identity Request: F0 7E <device> 06 01 F7. Device 7F is the
 * all call, and nothing documented says the Circuit needs 00, so 7F only. It
 * asks a device to say who it is and changes nothing. Exact bytes, exact length:
 * 06 02 is the REPLY and must never leave this board.
 */
export const DEVICE_INQUIRY = Object.freeze([0xF0, 0x7E, 0x7F, 0x06, 0x01, 0xF7]);
export function isDeviceInquiry(bytes) {
  return Array.isArray(bytes) && bytes.length === DEVICE_INQUIRY.length && DEVICE_INQUIRY.every((b, i) => bytes[i] === b);
}
/**
 * An Identity Reply from Novation: F0 7E <device> 06 02 00 20 29, then family,
 * model and version, then F7. 📄 That is 17 bytes for a three byte manufacturer
 * id; a little slack either way is allowed, because the point of asking is to
 * learn what this unit sends, and a reply refused for its length would read as
 * no reply at all.
 */
export function isIdentityReply(msg) {
  if (!msg || msg.length < 15 || msg.length > 24) return false;
  const want = [0xF0, 0x7E, null, 0x06, 0x02, 0x00, 0x20, 0x29];
  if (!want.every((b, i) => b === null || msg[i] === b)) return false;
  return msg[msg.length - 1] === 0xF7;
}

/**
 * The reply, recognised by its whole shape: 350 bytes, Novation's Circuit
 * header, command 00 (Replace Current Patch, which is what the Circuit sends
 * back), the location that was asked for, a reserved 00, 340 seven bit data
 * bytes and F7. Anything else the Circuit says is not passed on.
 */
export function isPatchReply(msg, loc) {
  if (!msg || msg.length !== 350) return false;
  for (let i = 0; i < 6; i++) if (msg[i] !== DUMP_REQUEST_HEAD[i]) return false;
  if (msg[6] !== 0x00 || msg[7] !== loc || msg[349] !== 0xF7) return false;
  for (let i = 1; i < 349; i++) if (msg[i] > 0x7F) return false;
  return true;
}

/**
 * SysEx messages out of a raw MIDI byte stream. Real time bytes (F8 to FF) may
 * sit anywhere, inside a SysEx too, and are dropped; any other status byte ends
 * a SysEx that never closed and it is thrown away. A message longer than `max`
 * is abandoned rather than grown, so the Circuit cannot fill this with clock.
 */
export function createSysexCatcher(max = 400) {
  let cur = null;
  return {
    feed(chunk) {
      const done = [];
      for (const b of chunk) {
        if (b >= 0xF8) continue;
        if (b === 0xF0) { cur = [b]; continue; }
        if (!cur) continue;
        if (b === 0xF7) { cur.push(b); done.push(cur); cur = null; continue; }
        if (b > 0x7F) { cur = null; continue; }
        cur.push(b);
        if (cur.length > max) cur = null;
      }
      return done;
    },
  };
}

/** How long the board listens for the Circuit's answer before saying none came. */
export const DUMP_MS = 1000;

/**
 * 🔴 WHAT A PAGE MAY SEND AN INSTRUMENT, AND IT IS AN ALLOWLIST.
 * Note on, note off and CC 123 all notes off, on the channels the config
 * names, and since 2026-09-30 the synth control changes in `SYNTH_CC` on
 * channels 1 and 2 only. Everything else is REFUSED, and the reason is the
 * instrument on the desk: a factory reset brings back none of the owner's sessions, a SysEx `Replace
 * Patch` writes flash, and a program change on channel 16 selects a session
 * over whatever is being worked on (CLAUDE.md, `plans/plan-circuit-patches.md`).
 * No SysEx, no bank select, no NRPN or RPN (CC 98 to 101 and data entry 6
 * and 38 are not in the table), no channel mode message but 123. A relay room
 * is reachable by anybody who knows its name, so what arrives over it is
 * decided here and not by the page that sent it.
 * ⚠️ AND SINCE 2026-09-30 ONE PROGRAM CHANGE: patches 0 to 63 on channels 1
 * and 2, asked for as a patch selector on `/away/` (*"ok go"*). 📄 The
 * Circuit's own table (`plans/plan-circuit-model12.md` §3.7): on 1 and 2 it
 * selects a synth patch, into RAM; on 16 it selects a SESSION, instantly from
 * 0 to 31 and queued from 64 to 95, over whatever is being worked on. So it is
 * the synth channels only and never 16, and 64 to 127 are refused as well,
 * because they are not patches on 1 and 2 and ARE sessions on 16.
 * ⚠️ AND SINCE 2026-10-11 TWO SysEx, both reads: the nine byte Current Patch
 * Dump Request (`dumpRequestSynth` above, a pass carries `dump`, the location)
 * and the six byte Device Inquiry (`isDeviceInquiry`, a pass carries
 * `identity`). Nothing else. The handler listens for the answer to either.
 */
export function midiVerdict(bytes, channels) {
  const v = verdict(bytes, channels);
  // A refusal names its kind in the vocabulary `bay.mjs` and `alsa.mjs` use,
  // so a log line and a patch talk about the same thing (2026-10-03).
  return v.ok ? v : { ...v, kind: Array.isArray(bytes) ? kindOf(bytes) : 'other' };
}

function verdict(bytes, channels) {
  if (!Array.isArray(bytes) || !bytes.every((b) => Number.isInteger(b) && b >= 0 && b <= 255)) return { ok: false, why: 'bytes are 0 to 255' };
  if (isDeviceInquiry(bytes)) return { ok: true, identity: true };
  const loc = dumpRequestSynth(bytes);
  if (loc !== null) {
    const ch = loc + 1;
    if (!channels.includes(ch)) return { ok: false, why: `a patch dump request for synth ${ch} and channel ${ch} is not one this input plays` };
    return { ok: true, dump: loc };
  }
  if (bytes.length === 2 && (bytes[0] & 0xF0) === 0xC0) {
    const ch = (bytes[0] & 0x0F) + 1, p = bytes[1];
    if (!SYNTH_CHANNELS.includes(ch) || !channels.includes(ch)) return { ok: false, why: `a program change on channel ${ch} is not a synth patch` };
    if (p > 63) return { ok: false, why: 'a synth patch is 0 to 63' };
    return { ok: true };
  }
  if (bytes.length !== 3) return { ok: false, why: 'three bytes, a channel voice message' };
  const [st, a, b] = bytes;
  if (a > 127 || b > 127) return { ok: false, why: 'data bytes are 0 to 127' };
  const kind = st & 0xF0, ch = (st & 0x0F) + 1;
  const note = kind === 0x80 || kind === 0x90;
  const allNotesOff = kind === 0xB0 && a === 123 && b === 0;
  const synthCc = kind === 0xB0 && SYNTH_CC.has(a);
  if (!note && !allNotesOff && !synthCc) {
    return { ok: false, why: `${kindOf(bytes)} is refused, only notes, all notes off and the synth control changes reach the instrument` };
  }
  if (!channels.includes(ch)) return { ok: false, why: `channel ${ch} is not one this input plays (${channels.join(', ')})` };
  if (synthCc && !SYNTH_CHANNELS.includes(ch)) {
    return { ok: false, why: `CC ${a} is a synth control and channel ${ch} is not a synth` };
  }
  return { ok: true };
}
export const BEAT_MS = 5_000;
const NAME_RE = /^[a-z0-9]{1,24}$/;

/**
 * `BOARD_INPUTS` is JSON: `{"circuit":{"device":"hw:CARD=Pro,DEV=0","channels":2,"take":1}}`.
 * JSON rather than a delimited string because an ALSA device name already
 * contains `:` and `,`, which is where a hand-rolled format goes wrong.
 * Returns every valid input and a reason for every refused one; a bad entry
 * never takes the good ones down with it.
 */
export function parseInputs(text) {
  const inputs = new Map();
  const problems = [];
  if (!text || !String(text).trim()) return { inputs, problems };
  let raw;
  try { raw = JSON.parse(text); } catch (e) { return { inputs, problems: [`BOARD_INPUTS is not JSON: ${e.message}`] }; }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { inputs, problems: ['BOARD_INPUTS is an object of name to input'] };
  }
  for (const [name, v] of Object.entries(raw)) {
    if (!NAME_RE.test(name)) { problems.push(`${JSON.stringify(name)}: a name is 1 to 24 of a-z and 0-9`); continue; }
    const device = v?.device;
    if (typeof device !== 'string' || !device || /\s/.test(device)) { problems.push(`${name}: device is an ALSA name with no spaces`); continue; }
    const channels = Number(v.channels ?? 1);
    if (!Number.isInteger(channels) || channels < 1 || channels > 8) { problems.push(`${name}: channels is 1 to 8`); continue; }
    const take = Number(v.take ?? 1);
    if (!Number.isInteger(take) || take < 1 || take > channels) { problems.push(`${name}: take is 1 to ${channels}`); continue; }
    let midi = null;
    if (v.midi != null) {
      const port = v.midi?.port;
      const mch = v.midi?.channels;
      if (typeof port !== 'string' || !/^[A-Za-z0-9_]{1,32}$/.test(port)) { problems.push(`${name}: midi.port is an ALSA card id`); continue; }
      if (!Array.isArray(mch) || !mch.length || !mch.every((c) => Number.isInteger(c) && c >= 1 && c <= 16)) {
        problems.push(`${name}: midi.channels is a list of 1 to 16`); continue;
      }
      midi = { port, channels: mch };
    }
    // 🔴 `via`, SINCE 2026-10-11: `arecord` (the default, and what every board
    // provisioned before this does) or `jack`, which puts the input on the
    // board's JACK graph as `<name>:capture_N` so a bay link can patch it
    // inside the Pi. See `createInputs` for what changes and what does not.
    const via = v.via ?? 'arecord';
    if (via !== 'arecord' && via !== 'jack') { problems.push(`${name}: via is arecord or jack, not ${JSON.stringify(via)}`); continue; }
    inputs.set(name, { name, device, channels, take, midi, via });
  }
  return { inputs, problems };
}

/**
 * One channel out of an interleaved frame. `take` is 1-based.
 * ⚠️ Not a downmix: an input with nothing patched still has its gain up and
 * its own noise, and summing it in would put that under the instrument.
 */
export function takeChannel(all, channels, take, frame) {
  if (channels === 1) return all;
  const one = new Int16Array(frame);
  for (let i = 0; i < frame; i++) one[i] = all[i * channels + take - 1];
  return one;
}

/**
 * How far the high byte moves from one sample to the next, read as the device
 * says (`le`) and byte swapped (`be`), summed over one interleaved block.
 *
 * 🔴 THE FAST TRACK PRO SENT BIG ENDIAN WHILE ALSA SAID S16_LE. MEASURED
 * 2026-09-30 on the Pi, with a bare `arecord` and no board code: every sample's
 * low byte was 0x00 or 0xFF, a quiet Circuit read -17 to -32 dBFS of hiss, and
 * the same bytes swapped read -65 to -80 dBFS with a peak of 18. It had been
 * little endian that morning, and a USB re-authorize did not bring it back.
 * ⚠️ WHY THE HIGH BYTE: in audio read the right way round it is the slow part
 * of a sample, so its steps are small at any level. Read the wrong way round it
 * is the fast part. Lag-1 correlation of the whole sample could not tell them
 * apart (0.986 both ways), because the sign byte dominates either reading.
 */
export function byteOrderSteps(all, channels) {
  let le = 0, be = 0;
  for (let i = channels; i < all.length; i++) {
    const a = all[i], b = all[i - channels];
    le += Math.abs((a >> 8) - (b >> 8));
    be += Math.abs(((a << 24) >> 24) - ((b << 24) >> 24));
  }
  return { le, be };
}

/**
 * Decides, and keeps deciding, whether a capture needs its bytes swapped. A
 * verdict needs a quarter second of evidence and one reading at least twice as
 * steady as the other, so digital silence and a close call change nothing.
 * `fix(all)` swaps in place when it has decided so, and says when it changes.
 */
export function createByteOrder({ channels, windowSamples = 12_000, onChange = () => {} } = {}) {
  let swap = false, le = 0, be = 0, n = 0;
  return {
    get swapped() { return swap; },
    fix(all) {
      const s = byteOrderSteps(all, channels);
      le += s.le; be += s.be; n += all.length / channels;
      if (n >= windowSamples) {
        const was = swap;
        if (!swap && be * 2 < le) swap = true;
        else if (swap && le * 2 < be) swap = false;
        if (swap !== was) onChange(swap, { le, be });
        le = be = n = 0;
      }
      if (swap) for (let i = 0; i < all.length; i++) { const v = all[i]; all[i] = ((v & 0xFF) << 8) | ((v >> 8) & 0xFF); }
      return all;
    },
  };
}

/** Has the lease run out. Pure, so the sweep's one decision is graded. */
export function leaseExpired(lease, now) {
  return !(Number.isFinite(lease) && now < lease);
}

/**
 * The live half. Everything that touches a socket or a process comes in as an
 * argument, so a test can run it against fakes.
 */
export function createInputs({
  inputs, room, relay, frame, rate, name: boardName, id: boardId,
  spawn, WebSocket, format, parse, randomId, log = () => {}, now = () => Date.now(), fs = null,
  // node-datachannel's PeerConnection, or null. Null is a board with no npm
  // install, and it is a board with the relay only, never a broken one.
  PeerConnection = null,
  leaseMs = LEASE_MS, beatMs = BEAT_MS,
  // 10 ms a period, four periods of buffer. See the capture below.
  periodFrames = 480, bufferFrames = 1920,
  // `{ ensure(), wire(doc, what) }` from `jacksynth.mjs`, or null on a board
  // with no JACK. Only an input configured `via: "jack"` uses it.
  jack = null, setTimer = setTimeout,
}) {
  const live = new Map();
  // The capture's unit: half a frame when a frame halves, so the direct path
  // can send 10 ms of a 20 ms frame. The relay's frame is unchanged.
  const UNIT = frame % 2 === 0 ? frame / 2 : frame;

  function one(cfg) {
    const s = {
      cfg, room: `${room}-${cfg.name}`, from: `board-${cfg.name}-${randomId(6)}`,
      ws: null, seq: 0, aseq: 0, proc: null, lease: 0, frames: 0, startedAt: null, lastHeard: now(),
      backoff: 500, closed: false, midiFd: null, held: new Set(), notesOut: 0, refused: 0, rtc: null,
      bridge: null, bridgeAt: 0, bridgeBackoff: 2000, bridgeStarts: 0, fed: null, dump: null,
    };
    // 🔴 AN INPUT ON JACK, SINCE 2026-10-11 (plans/plan-nodes-revisited.md §5
    // item 9; the owner: *"Ciruit is on now, do via jack"*). Two processes
    // instead of one:
    //   alsa_in -j <name>     the device onto the graph as `<name>:capture_N`.
    //                         ALWAYS ON while the board runs, because a bay link
    //                         into the granulator has to work with nobody
    //                         listening to the input's room. It costs 3.4 per
    //                         cent of one core steady (MEASURED with `top` on the
    //                         Pi 4) and no relay time at all.
    //   ffmpeg -f jack        the room's stream, read back OFF the graph from
    //                         `pos<name>:input_1`, which is fed `<name>:capture_N`
    //                         through `jack.mjs`. LEASED exactly as `arecord` was,
    //                         so a room nobody is in still costs nothing.
    // 🔴 `plughw:`, NOT `hw:`, AND IT IS A MEASUREMENT. `alsa_in -d hw:CARD=Pro`
    // on the Fast Track Pro read the input 48.2 dB HOT, which is a factor of 256:
    // a floor of -48 dBFS where `arecord` reads -93.1 on the same card the same
    // minute, and a Circuit note clipped flat at 32512. Through `plughw:` the
    // floor is -93.1 with a peak of 1, the same as `arecord`. alsa_in's own S16
    // path is the suspect and was not chased further.
    // ⚠️ AND THE BYTE ORDER FIX DOES NOT RUN ON THIS PATH. `createByteOrder`
    // repairs a device that sends big endian S16 under an S16_LE label, which
    // this card did on 2026-09-30 and 2026-10-01. alsa_in resamples before
    // anything here sees a sample, and a resampled swap cannot be swapped back.
    // Not seen since 2026-10-01 in the journal; if it comes back, `via:
    // "arecord"` is the one line that restores the repaired path.
    const onJack = cfg.via === 'jack' && !!jack;
    const reader = `pos${cfg.name}`;
    const jackPort = `${cfg.name}:capture_${cfg.take}`;
    const send = (msg) => {
      if (s.ws?.readyState !== 1) return false;
      s.ws.send(format(msg, { from: s.from, seq: s.seq++ }));
      return true;
    };
    // `direct` tells a page whether to offer at all, so a board without the
    // library costs a page nothing rather than a three second wait.
    const shape = () => ({ name: boardName, id: boardId, input: cfg.name, audioChannels: 1, frameMs: 1000 * frame / rate,
                           direct: !!s.rtc });
    const alive = () => ({ type: 'board.alive', ...shape(), audio: s.proc ? cfg.name : null, frames: s.frames,
                           leaseLeftMs: s.proc ? Math.max(0, s.lease - now()) : 0 });
    const status = () => ({ ok: !!s.proc, source: cfg.name, room: s.room, device: cfg.device, via: onJack ? 'jack' : 'arecord',
                            ...(onJack ? { jack: { port: jackPort, bridge: !!s.bridge, bridgeStarts: s.bridgeStarts, reader: `${reader}:input_1`, fed: s.fed } } : {}),
                            frames: s.frames, midi: cfg.midi ? { port: cfg.midi.port, channels: cfg.midi.channels, out: s.notesOut, held: s.held.size, refused: s.refused } : null,
                            leaseLeftMs: s.proc ? Math.max(0, s.lease - now()) : 0,
                            direct: s.rtc ? s.rtc.status() : null,
                            ...(s.proc ? {} : { reason: 'nothing playing' }) });

    function sendPcm(int16) {
      if (s.ws?.readyState !== 1) return;
      const out = Buffer.allocUnsafe(12 + int16.byteLength);
      out.writeUInt32LE(s.aseq++, 0);
      out.writeDoubleLE(performance.now(), 4);
      Buffer.from(int16.buffer, int16.byteOffset, int16.byteLength).copy(out, 12);
      s.ws.send(out);
      s.frames++;
    }

    // ── the JACK half: the bridge, always on, and the leased reader ─────────
    const quiet = (d) => String(d).split('\n').map((x) => x.trim())
      .filter((x) => x && !/^Cannot lock down \d+ byte memory area/.test(x)).join(' ');
    function startBridge() {
      if (!onJack || s.bridge || s.closed) return;
      Promise.resolve(jack.ensure?.()).then((j) => {
        if (s.bridge || s.closed) return;
        if (j && j.ok === false) {
          log(`${cfg.name}: no JACK server (${j.reason}), trying again in ${s.bridgeBackoff / 1000} s`);
          setTimer(startBridge, s.bridgeBackoff); s.bridgeBackoff = Math.min(s.bridgeBackoff * 2, 60_000);
          return;
        }
        const dev = cfg.device.replace(/^hw:/, 'plughw:');
        const p = spawn('alsa_in', ['-j', cfg.name, '-d', dev, '-c', String(cfg.channels), '-r', String(rate),
          '-p', '256', '-n', '2'], { stdio: ['ignore', 'pipe', 'pipe'] });
        s.bridge = p; s.bridgeAt = now(); s.bridgeStarts++;
        log(`${cfg.name}: ${dev} onto JACK as ${cfg.name}:capture_1..${cfg.channels}`);
        p.stdout?.on('data', () => {});
        p.stderr?.on('data', (d) => { const t = quiet(d); if (t) log(`${cfg.name} alsa_in: ${t.slice(0, 200)}`); });
        p.on('exit', (code, sig) => {
          if (s.bridge === p) s.bridge = null;
          if (s.closed) return;
          // A bridge that ran a while is a fresh fault, not the same one again.
          if (now() - s.bridgeAt > 30_000) s.bridgeBackoff = 2000;
          log(`${cfg.name}: alsa_in exited (${sig ?? code}), so ${jackPort} is gone; again in ${s.bridgeBackoff / 1000} s`);
          setTimer(startBridge, s.bridgeBackoff); s.bridgeBackoff = Math.min(s.bridgeBackoff * 2, 60_000);
        });
      });
    }
    /** Feed the reader from the device, owning its input. Retried until both ports are up. */
    function feedReader(p, tries = 0) {
      if (s.proc !== p) return;
      const w = jack.wire?.({ v: 1, links: [{ from: jackPort, to: `${reader}:input_1` }], own: [`${reader}:input_1`] },
        `${cfg.name} into its room`);
      if (w?.ok) { s.fed = true; log(`${cfg.name}: ${jackPort} feeds ${reader}:input_1, read back`); return; }
      s.fed = false;
      if (tries < 40) { setTimer(() => feedReader(p, tries + 1), 200); return; }
      log(`${cfg.name}: ${jackPort} could not be patched into ${reader}:input_1 in 8 s${w?.reason ? `, ${w.reason}` : ''}`);
    }

    function startCapture() {
      if (s.proc) return;
      if (onJack) { startReader(); return; }
      // 🔴 A SHORT PERIOD, OR THE AUDIO LEAVES IN 125 ms LUMPS. MEASURED
      // 2026-09-30 on the Fast Track Pro: with no period asked for, ALSA gave
      // arecord 6000 frames a period in a 24000 frame buffer, so a note waited
      // up to 125 ms before this process saw it, the frames reached a browser
      // in bursts (p90 gap 117 ms), and the page needed a 160 ms cushion to
      // ride them. Press to arrival read 151 to 180 ms.
      const p = spawn('arecord', ['-D', cfg.device, '-f', 'S16_LE', '-r', String(rate),
        '-c', String(cfg.channels), '-t', 'raw', '-q',
        `--period-size=${periodFrames}`, `--buffer-size=${bufferFrames}`], { stdio: ['ignore', 'pipe', 'pipe'] });
      // ⚠️ READ IN HALF FRAMES WHEN A FRAME HALVES. The direct path sends 10 ms
      // as soon as 10 ms exists, which is the point of it; the relay still gets
      // its 20 ms frame, at the same moment it always did, out of two halves.
      const IN = UNIT * 2 * cfg.channels;
      let carry = Buffer.alloc(0), halves = [];
      const order = createByteOrder({ channels: cfg.channels, onChange: (swapped, s) =>
        log(`${cfg.name}: ${swapped ? 'the device is sending big endian, swapping its bytes' : 'the device is little endian again'} (high byte steps ${s.le} as sent, ${s.be} swapped)`) });
      p.stdout.on('data', (chunk) => {
        carry = carry.length ? Buffer.concat([carry, chunk]) : chunk;
        while (carry.length >= IN) {
          const all = order.fix(new Int16Array(carry.buffer.slice(carry.byteOffset, carry.byteOffset + IN)));
          const one = takeChannel(all, cfg.channels, cfg.take, UNIT);
          carry = carry.subarray(IN);
          s.rtc?.pcm(one);
          if (UNIT === frame) { sendPcm(one); continue; }
          halves.push(one);
          if (halves.length < frame / UNIT) continue;
          const whole = new Int16Array(frame);
          halves.forEach((h, i) => whole.set(h, i * UNIT));
          halves = [];
          sendPcm(whole);
        }
      });
      // arecord's stderr is the only clue when a device is busy or gone.
      p.stderr.on('data', (d) => log(`${cfg.name} arecord:`, String(d).trim()));
      p.on('exit', (code) => {
        log(`${cfg.name}: arecord exited ${code} after ${s.frames} frames`);
        if (s.proc === p) s.proc = null;
        send(alive());
      });
      s.proc = p; s.startedAt = now();
      log(`${cfg.name}: capturing ${cfg.device} channel ${cfg.take} of ${cfg.channels} into ${s.room}`);
    }

    // The leased half on JACK. Same frames, same pump, same relay and direct
    // path as `arecord`: one mono channel out of ffmpeg, so `takeChannel` is a
    // pass and the byte order fix is skipped (see the header of this block).
    function startReader() {
      startBridge();
      const p = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'jack', '-channels', '1', '-i', reader,
        '-f', 's16le', '-ar', String(rate), '-ac', '1', '-'], { stdio: ['ignore', 'pipe', 'pipe'] });
      const IN = UNIT * 2;
      let carry = Buffer.alloc(0), halves = [];
      p.stdout.on('data', (chunk) => {
        carry = carry.length ? Buffer.concat([carry, chunk]) : chunk;
        while (carry.length >= IN) {
          const one = new Int16Array(carry.buffer.slice(carry.byteOffset, carry.byteOffset + IN));
          carry = carry.subarray(IN);
          s.rtc?.pcm(one);
          if (UNIT === frame) { sendPcm(one); continue; }
          halves.push(one);
          if (halves.length < frame / UNIT) continue;
          const whole = new Int16Array(frame);
          halves.forEach((h, i) => whole.set(h, i * UNIT));
          halves = [];
          sendPcm(whole);
        }
      });
      p.stderr.on('data', (d) => { const t = quiet(d); if (t) log(`${cfg.name} ffmpeg:`, t.slice(0, 200)); });
      p.on('exit', (code) => {
        log(`${cfg.name}: the JACK reader exited ${code} after ${s.frames} frames`);
        if (s.proc === p) { s.proc = null; s.fed = null; }
        send(alive());
      });
      s.proc = p; s.startedAt = now(); s.fed = false;
      log(`${cfg.name}: reading ${jackPort} off JACK into ${s.room}`);
      setTimer(() => feedReader(p), 300);
    }

    function stopCapture(why) {
      if (!s.proc) return false;
      const p = s.proc; s.proc = null;
      try { p.kill('SIGTERM'); } catch { /* already gone */ }
      log(`${cfg.name}: stopped, ${why}`);
      send(alive());
      return true;
    }

    // ── notes out, to the instrument's own raw MIDI port ────────────────────
    // ⚠️ THE CARD IS RESOLVED BY NAME EVERY TIME IT IS OPENED. A card number is a
    // position in a list that moves when anything is plugged in, which is the
    // avfoundation-index lesson from rig/m1 in its ALSA costume.
    function midiDev() {
      const card = fs.readlinkSync(`/proc/asound/${cfg.midi.port}`);   // 'card7'
      const n = /^card(\d+)$/.exec(card)?.[1];
      if (n == null) throw new Error(`/proc/asound/${cfg.midi.port} is ${card}`);
      return n;
    }
    function midiOpen() {
      if (s.midiFd !== null) return s.midiFd;
      const n = midiDev();
      // 🔴 NON-BLOCKING, MEASURED 2026-10-03 ON THIS BOARD: while any ALSA
      // sequencer subscription into the Circuit exists, a plain open of its raw
      // device for write does not fail, it WAITS, and a synchronous open here
      // would freeze the whole board on its first note. With O_NONBLOCK a busy
      // device is EBUSY at once, which the catch in `midiWrite` logs by name.
      // ⚠️ It makes writes non-blocking too, so a full output buffer is EAGAIN
      // and that message is dropped and logged rather than waited for. The
      // buffer is 4 KB, about 1,300 note offs, so a panic still fits.
      s.midiFd = fs.openSync(`/dev/snd/midiC${n}D0`, FS.O_WRONLY | FS.O_NONBLOCK);
      log(`${cfg.name}: notes go to /dev/snd/midiC${n}D0 (${cfg.midi.port})`);
      return s.midiFd;
    }
    function midiWrite(bytes) {
      try { fs.writeSync(midiOpen(), Buffer.from(bytes)); }
      catch (e) {
        log(`${cfg.name}: midi write failed, ${e.message}`);
        if (s.midiFd !== null) { try { fs.closeSync(s.midiFd); } catch {} s.midiFd = null; }
        return false;
      }
      const [st, a, b] = bytes, kind = st & 0xF0, key = `${st & 0x0F}:${a}`;
      if (kind === 0x90 && b > 0) s.held.add(key); else if (kind === 0x80 || kind === 0x90) s.held.delete(key);
      // ⚠️ ONLY CC 123 LETS GO OF A CHANNEL'S NOTES. Every control change used
      // to, which was harmless while 123 was the only one allowed; with the
      // synth controls through, a filter sweep under a held note would have
      // emptied this set and the lease's panic would have left the note on.
      else if (kind === 0xB0 && a === 123) for (const k of [...s.held]) if (k.startsWith(`${st & 0x0F}:`)) s.held.delete(k);
      s.notesOut++;
      return true;
    }
    // ── the one thing read back: the patch a dump request asks for ──────────
    // 🔴 THE INPUT IS OPENED ONLY WHILE AN ANSWER IS EXPECTED, AND BEFORE THE
    // REQUEST IS WRITTEN. A raw MIDI input buffers nothing until it is open, so
    // opening it after the write could miss an answer that came back fast; and
    // holding it open between requests would keep a device somebody else may
    // want. MEASURED 2026-10-11 on the board: `/proc/asound/Circuit/midi0`
    // showed Input 0 with no owner and the Circuit sending (Rx 130,660 bytes,
    // its clock), so the input is free and has to be filtered.
    // ⚠️ NON-BLOCKING AND POLLED every 10 ms, for the same reason as the write
    // side: a blocking read with nothing to read never returns, and a thread
    // parked in one cannot be taken back.
    function finishDump(d, body) {
      if (s.dump !== d) return;
      s.dump = null;
      try { fs.closeSync(d.fd); } catch { /* gone */ }
      d.reply(d.type, { ...d.extra, ...body });
    }
    function pollDump(d) {
      if (s.dump !== d) return;
      const chunk = Buffer.alloc(1024);
      for (;;) {
        let n = 0;
        try { n = fs.readSync(d.fd, chunk, 0, chunk.length, null); }
        catch (e) {
          if (e.code === 'EAGAIN' || e.code === 'EWOULDBLOCK') break;
          log(`${cfg.name}: reading the patch failed, ${e.message}`);
          return finishDump(d, { ok: false, why: `the instrument input could not be read, ${e.code || e.message}` });
        }
        if (!n) break;
        d.seen += n;
        for (const b of chunk.subarray(0, n)) {
          if (b >= 0xF8) d.realtime++;
          else if (d.head.length < 24) d.head.push(b.toString(16).padStart(2, '0'));
        }
        for (const m of d.catcher.feed(chunk.subarray(0, n))) {
          if (d.match(m)) {
            log(`${cfg.name}: ${d.what} read back, ${now() - d.at} ms, ${m.length} bytes${d.type === 'midi.identity' ? `: ${m.map((b) => b.toString(16).padStart(2, '0')).join(' ')}` : ''}`);
            return finishDump(d, { ok: true, bytes: m });
          }
          d.other++;
          if (d.others.length < 3) d.others.push(m.slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join(' '));
        }
      }
      if (now() >= d.until) {
        log(`${cfg.name}: no ${d.what} came back in ${DUMP_MS} ms (${d.seen} bytes heard, ${d.realtime} of them real time, ${d.other} other SysEx${d.others.length ? ` [${d.others.join('] [')}]` : ''}${d.head.length ? `, the rest began ${d.head.join(' ')}` : ''})`);
        return finishDump(d, { ok: false, why: `no ${d.short} came back from the instrument in ${DUMP_MS} ms` });
      }
      setTimer(() => pollDump(d), 10);
    }
    // `want` names what is listened for: the reply type, how to recognise it,
    // and the words a log line uses. One question open at a time, of either kind.
    const wantPatch = (loc) => ({ type: 'midi.patch', extra: { synth: loc + 1 }, what: `patch for synth ${loc + 1}`, short: 'patch', match: (m) => isPatchReply(m, loc) });
    const WANT_IDENTITY = { type: 'midi.identity', extra: {}, what: 'identity', short: 'identity', match: isIdentityReply };
    function askBack(bytes, want, reply) {
      const { type, extra } = want;
      if (s.dump) return reply(type, { ok: false, ...extra, why: `the ${s.dump.what} is already being read, one question at a time` });
      let fd;
      try { fd = fs.openSync(`/dev/snd/midiC${midiDev()}D0`, FS.O_RDONLY | FS.O_NONBLOCK); }
      catch (e) {
        log(`${cfg.name}: the instrument input could not be opened, ${e.message}`);
        return reply(type, { ok: false, ...extra, why: `the instrument input could not be opened, ${e.code || e.message}` });
      }
      const d = { ...want, fd, reply, others: [], at: now(), until: now() + DUMP_MS, catcher: createSysexCatcher(), seen: 0, other: 0, realtime: 0, head: [] };
      s.dump = d;
      if (!midiWrite(bytes)) return finishDump(d, { ok: false, why: 'the instrument port could not be written' });
      setTimer(() => pollDump(d), 10);
      return undefined;
    }

    /** Every note this board started and nobody ended, ended. */
    function midiPanic(why) {
      if (!cfg.midi || !s.held.size) return 0;
      const n = s.held.size;
      for (const k of [...s.held]) {
        const [ch, note] = k.split(':').map(Number);
        midiWrite([0x80 | ch, note, 0]);
      }
      log(`${cfg.name}: released ${n} held note${n === 1 ? '' : 's'}, ${why}`);
      return n;
    }

    // `answer` is how a reply leaves: the relay room by default, the peer's own
    // `ctl` channel when the message came over one.
    function handle(msg, answer = null) {
      const reply = answer || ((type, body) => send({ type, re: msg.id, ...body }));
      if (msg.type === 'input.want') {
        s.lease = now() + leaseMs;
        const was = !!s.proc;
        startCapture();
        return reply('input.wanted', { ...status(), started: !was });
      }
      if (msg.type === 'input.stop') {
        s.lease = 0;
        return reply('input.stopped', { ok: stopCapture('asked'), source: cfg.name });
      }
      if (msg.type === 'audio.status') return reply('audio.started', status());
      if (msg.type === 'midi.send') {
        if (!cfg.midi || !fs) return reply('midi.refused', { why: `${cfg.name} has no MIDI port configured` });
        const v = midiVerdict(msg.bytes, cfg.midi.channels);
        if (!v.ok) { s.refused++; return reply('midi.refused', { why: v.why }); }
        if (v.dump != null) return askBack(msg.bytes, wantPatch(v.dump), reply);
        if (v.identity) return askBack(msg.bytes, WANT_IDENTITY, reply);
        if (!midiWrite(msg.bytes)) return reply('midi.refused', { why: 'the instrument port could not be written' });
        return undefined;   // no reply per note: a keyboard is not a request/response
      }
      if (msg.type === 'midi.panic') return reply('midi.released', { n: midiPanic('asked') });
      return undefined;
    }

    function connect() {
      if (s.closed) return;
      const ws = new WebSocket(`${relay}/room/${s.room}/ws`);
      ws.binaryType = 'arraybuffer';
      s.ws = ws;
      ws.onopen = () => {
        s.backoff = 500; s.lastHeard = now();
        log(`${cfg.name}: joined ${s.room}`);
        send({ type: 'board.hello', ...shape() });
      };
      ws.onmessage = (e) => {
        s.lastHeard = now();
        if (typeof e.data !== 'string') return;
        const { kind, msg } = parse(e.data);
        if (kind !== 'json' || msg.from === s.from) return;
        // Signalling for the direct path arrives here and ONLY here: a `ctl`
        // channel cannot open another peer.
        if (msg.type === 'rtc.offer') {
          if (!s.rtc) return send({ type: 'rtc.refused', peer: msg.peer, why: 'this board has no direct path, use the relay' });
          try { s.rtc.offer(msg); } catch (err) { log(`${cfg.name}: offer threw`, err.message); }
          return;
        }
        if (msg.type === 'rtc.candidate') { try { s.rtc?.candidate(msg); } catch {} return; }
        try { handle(msg); } catch (err) { log(`${cfg.name}: handler threw`, err.message); }
      };
      ws.onclose = () => {
        if (s.ws === ws) s.ws = null;
        if (s.closed) return;
        log(`${cfg.name}: socket closed, retrying in ${s.backoff} ms`);
        setTimeout(connect, s.backoff);
        s.backoff = Math.min(s.backoff * 2, 30_000);
      };
      ws.onerror = () => {};
    }

    // The beat: proof of life for the page, the lease sweep, and the same
    // self-echo watchdog the main socket uses, because a dead socket does not
    // always close.
    function beat() {
      if (s.proc && leaseExpired(s.lease, now())) { stopCapture('nobody renewed the lease'); midiPanic('the lease ran out'); }
      s.rtc?.sweep();
      if (s.ws?.readyState === 1 && now() - s.lastHeard > 3 * beatMs + 1000) {
        log(`${cfg.name}: no echo, reconnecting`);
        try { s.ws.close(); } catch { /* the point */ }
        return;
      }
      send(alive());
    }

    if (PeerConnection) {
      s.rtc = createRtc({
        PeerConnection, signal: send, handle, now, rate, unitMs: 1000 * UNIT / rate,
        log: (...a) => log(`${cfg.name}:`, ...a),
        // A direct listener that goes away lets go of the notes IT started.
        // Everybody else's stay, which is why this is not `midiPanic`.
        onGone: (p) => {
          if (!cfg.midi || !fs) return;
          for (const k of p.held) {
            if (!s.held.has(k)) continue;
            const [ch, note] = k.split(':').map(Number);
            midiWrite([0x80 | ch, note, 0]);
          }
        },
      });
    }

    return {
      s, connect, beat, handle, status, stopCapture, startBridge, onJack, jackPort,
      close() {
        s.closed = true; midiPanic('shutting down'); stopCapture('shutting down'); s.rtc?.close();
        if (s.bridge) { try { s.bridge.kill('SIGTERM'); } catch { /* gone */ } s.bridge = null; }
        if (s.dump) { try { fs.closeSync(s.dump.fd); } catch {} s.dump = null; }
        if (s.midiFd !== null) { try { fs.closeSync(s.midiFd); } catch {} s.midiFd = null; }
        try { s.ws?.close(); } catch {}
      },
    };
  }

  for (const cfg of inputs.values()) live.set(cfg.name, one(cfg));
  let timer = null;

  return {
    start() {
      for (const x of live.values()) { x.connect(); x.startBridge(); }
      timer = setInterval(() => { for (const x of live.values()) x.beat(); }, beatMs);
      timer.unref?.();
    },
    status: () => Object.fromEntries([...live].map(([k, x]) => [k, x.status()])),
    get: (name) => live.get(name),
    close() { clearInterval(timer); for (const x of live.values()) x.close(); },
  };
}
