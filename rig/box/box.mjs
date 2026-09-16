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
import { VOICES, DEFAULT_SF, fluidAvailable, soundfontAt } from './fluid.mjs';
import { startJackSynth, jackSynthAvailable, JACK_SYNTHS,
         pappusFx, pappusAvailable, pappusPanic, stopPappus, sourceFeed,
         spaceFx, spaceSet, spaceClamp, spaceState, stopSpace } from './jacksynth.mjs';
import { yoshimiPatches, YOSHIMI_DIR } from './yoshimi.mjs';
import { openPappus, CHARACTER_NAMES } from './pappus.mjs';
import { startVideo, videoAvailable, sweepStrayEncoders, V3DPIPE } from './video.mjs';
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
// ONE variable for whatever is making sound. There used to be two — `fluid`
// for the pipe path and `jsyn` for the JACK ones — and fourteen sites branched
// on which was set, so every new source meant remembering both halves and every
// reviewer had to check both. They are two implementations of one interface
// now; `inst.jack` is the only thing anyone downstream actually needs to know,
// because the granular insert can only wrap what is on the JACK graph.
let synth = null, stopSynth = null, midiIn = null, inst = null;
// ⚠️ Set BEFORE any await in startAudio. Raising a JACK chain takes ~13 s,
// and during that window jsyn is still null — so a note.on arriving mid-start
// saw 'nothing running' and started FluidSynth alongside it. Two instruments,
// interleaved samples, 100 msg/s into a 60 msg/s relay. Measured twice.
let starting = null;
let fxOn = false;          // pappus inserted between the instrument and the capture

/**
 * 🔴 WHO ASKED FOR THE INSERT, AND WHEN — because two pages fight over one
 * Raspberry Pi and until 2026-09-14 neither of them could see it happening.
 *
 * `/grains/` switches the granulator ON, because the granulator is its entire
 * subject. `/box/` used to switch it OFF on load, so whichever page you opened
 * last won, SILENTLY, and the other one went on drawing a picture that was no
 * longer true.
 *
 * ⚠️ `/box/` SENDS NOTHING ABOUT THE INSERT SINCE 2026-09-16 and has no
 * granulator on it at all. What its message was protecting against is real. An
 * insert left in by a `grains` tab that was simply CLOSED goes on wrapping
 * whatever the next page plays and feeds its own delay, MEASURED 2026-09-12 at
 * a steady -6.1 dBFS subsonic drone while `box.alive` reported `voices: 0`.
 * `sweepInsert()` below is where that guarantee lives now. ⚠️ That is the worst shape there
 * is, and it is the reason the first half of this is REPORTING rather than
 * arbitration: arbitration that hides a conflict converts a visible problem
 * into an invisible one. The board knows the truth about its own insert; the
 * pages were guessing. Now it says so — in `fx.pappus`, in `audio.status` and
 * in the five-second `box.alive`, so a page learns about a change it did not
 * make without polling for it.
 *
 * ⚠️ A CLIENT ID IS PER CONNECTION (`openWire` mints a new `from` every time),
 * so this is never a claim that outlives the tab that made it.
 */
let fxAsked = null;        // { by, at, on } — the last client to change it

/**
 * When each client was last heard from, so "is anybody still there" can be
 * answered without a lease.
 *
 * 🔴 NO TTL, NO RELEASE, NOTHING TO LEAK. A lease nobody can clear is how
 * `studio-1` sat full for hours (CLAUDE.md). The relay solves the same problem
 * by DATING each socket — `getWebSocketAutoResponseTimestamp` — and reclaiming
 * the idle ones; this is that idea in a smaller costume, on the only evidence
 * the box actually has: a client that is still there keeps talking. `/grains/`
 * asks `params.state` and re-asks `grain.report` every four seconds, so a live
 * tab is three messages inside this window and a closed one is zero.
 */
const clientSeen = new Map();          // from -> ms
/**
 * How long a client may be silent before the board stops counting it as there.
 *
 * 🔴 CHECKED AGAINST `/grains/` RATHER THAN CHOSEN. That page has ONE
 * `setInterval(…, 4000)` and the first thing in it is `hello()`, which sends
 * `params.state` unconditionally whenever the socket is open. So a tab that is
 * merely sitting there with nobody touching it is a message every 4 s. With
 * the insert in it also re-sends `grain.report {on:true}` on the same tick, and
 * `source.set` until the board has answered once. So a live tab is at least 3
 * and usually 7 messages inside this window and a CLOSED one is exactly zero,
 * which is the only difference this board can actually see.
 *
 * 15 s is 3.75 of those polls. One poll lost to the relay's own caps therefore
 * costs nothing, and two do not either. ⚠️ The margin is what the number is
 * FOR: a window of 4 or 5 s would be arithmetically enough and would drop the
 * insert out from under a live page the first time a poll went missing.
 */
const INSERT_HELD_MS = 15000;          // 3.75 of `/grains/`'s 4 s polls
const stillHere = (who) => !!who && (Date.now() - (clientSeen.get(who) ?? 0)) < INSERT_HELD_MS;
/** What the box will say about its own insert, to anybody who asks or listens. */
function insertState() {
  const by = fxAsked?.by ?? null;
  return {
    fx: fxOn ? 'pappus' : null,
    fxBy: by,
    fxAgoSec: fxAsked ? Math.round((Date.now() - fxAsked.at) / 1000) : null,
    fxHeld: fxOn && !!fxAsked?.on && stillHere(by),
  };
}

/**
 * 🔴 THE BOARD CLEANS UP AFTER ITSELF, BECAUSE SINCE 2026-09-16 NOTHING ELSE
 * DOES.
 *
 * `/box/` used to send `fx.pappus {on:false, onlyIfIdle:true}` on connect, and
 * that one message was the whole guarantee: an insert left behind by a
 * `/grains/` tab that was simply CLOSED goes on wrapping whatever the next page
 * plays and feeds its own delay. MEASURED 2026-09-12, a steady -6.1 dBFS
 * subsonic drone while `box.alive` reported `voices: 0`, true about notes and
 * false about sound. The page has no granulator on it at all now, so it no
 * longer sends that message, and a guarantee that depended on somebody opening
 * a second page was never a guarantee anyway: nobody had to open one.
 *
 * ⚠️ AND THERE IS NO "A PEER LEFT" SIGNAL TO PREFER TO A TIMER. Looked for
 * rather than assumed: `workers/relay/src/index.js` forwards every frame
 * VERBATIM and never parses one, so the Durable Object does not know any
 * client's `from`; its `webSocketClose()` is an empty method and emits nothing;
 * and `openWire` in `demo/shell/wire.mjs` sends no farewell on unload. The
 * relay's `/room/<name>/stats` does report a per-socket idle time, but the
 * array is anonymous and sorted, so it cannot say WHICH socket stopped. Making
 * the relay announce a departure means teaching it to read messages, which is
 * the one thing that file refuses to do.
 *
 * So it is an idle rule, on the only evidence the board has: a client that is
 * still there keeps talking. See `INSERT_HELD_MS` for where 15 s comes from.
 *
 * ⚠️ IT NEVER FIGHTS A LIVE PAGE. A granulator nobody is talking to is still
 * one somebody is listening to, and `/grains/` polls every 4 s whether or not
 * anyone touches it, so a page that is open and quiet is indistinguishable from
 * one being played, which is correct.
 */
let sweeping = false;
async function sweepInsert(why) {
  if (!fxOn || sweeping) return null;
  const by = fxAsked?.by ?? null;
  if (stillHere(by)) return null;
  const quietMs = by && clientSeen.has(by) ? Date.now() - clientSeen.get(by) : null;
  sweeping = true;
  try {
    const r = await pappusFx(false, { instrumentPort: inst?.port, instrumentPortR: inst?.portR,
                                      onLog: (l) => log('pappus:', l) });
    if (!r.ok) { log(`the insert would not come out: ${r.reason}`); return null; }
    // ⚠️ THE SAME THREE ASSIGNMENTS AS THE `fx.pappus` HANDLER'S OFF PATH, and
    // they have to stay the same three. A sweep that cleared the patching and
    // left `fxOn` true would put the insert straight back on the next
    // instrument change, which is the failure wearing a new hat.
    fxOn = false;
    fxAsked = null;
    madeSource = null;
    log(`insert dropped: ${by ?? 'nobody'} ${quietMs === null ? 'never spoke' : `went quiet ${Math.round(quietMs / 1000)} s ago`}`
      + `. the board waits ${INSERT_HELD_MS / 1000} s. ${why}`);
    // 🔴 SAID ON THE HEARTBEAT, NOT ON A VERB OF ITS OWN. Every page in this
    // room already reads `box.alive` for exactly this, because it carries
    // `insertState()`, and a new message type would be a second authority on
    // one fact. Sending the beat NOW rather than waiting up to 5 s for the next
    // one is the whole difference.
    send(alive());
    return r;
  } finally { sweeping = false; }
}

/**
 * The generated material, when a page has asked for one.
 *
 * A sound BUILT on the board, right now, from the same description a browser is
 * building it from (plan-twins §4a). `/grains/` sends the spec and both ends
 * make the same sines, which is the whole comparison that page exists for.
 *
 * ⚠️ THERE USED TO BE A SECOND THING CALLED A SOURCE HERE, and it was a minute
 * of ERR's 1965 archive pulled to disk and written into the grain buffers. It
 * left on 2026-09-16 with the rest of the archive path; `archive/box-pappus/`
 * has it. Two things called "source" in one file is how a rename costs an
 * afternoon, so the one that is left says what it is.
 */
let madeSource = null;     // { spec, partials, top } while PosSource is feeding pappus
let lastHeard = Date.now();
// The granulator's own surface — the die, the drift and the grain buffers. Its
// OSC socket is opened once and kept, separately from `pappusFx`'s patching,
// because the engine keeps running while it is bypassed and a drift that
// stopped when the insert was switched off would be a drift you could hear stop.
let pap = null;
const pappus = () => (pap ||= openPappus({ onLog: (l) => log('pappus:', l) }));

// ── the picture, on its own socket ───────────────────────────────────────────
//
// ⚠️ A SECOND SOCKET, AND IT IS FORCED BY A MEASUREMENT RATHER THAN CHOSEN. The
// relay allows 60 messages a second PER SOCKET and the audio stream is already
// 50 of them. Thirty video frames on the same socket is 80 against a cap of 60,
// and the bucket drops the excess silently — no error, no close, no
// backpressure. A picture sharing the audio socket would quietly cost a quarter
// of both. It also keeps the binary framing unambiguous: every page here treats
// an incoming binary frame as PCM.
//
// Room `<room>-video`, so a page that wants the picture opens a second socket
// to a name it can derive, and a page that does not is unaffected.
let video = null, vws = null, vseq = 0, vsent = 0;
const VIDEO_ROOM = `${ROOM}-video`;

/** What a client needs to render it, plus what only this end can count. */
function videoShape() {
  const st = video?.stats() ?? {};
  return {
    w: video?.w, h: video?.h, fps: video?.fps, bitrate: video?.bitrate, gop: video?.gop,
    codec: 'avc1.42E01E',        // baseline 3.0 — what h264_v4l2m2m emits here
    mirrors: video?.params().seg, grain: video?.params().scale, hue: video?.params().hue,
    // What actually drew it, read off the renderer rather than declared here.
    renderer: st.renderer ?? null,
    // ⚠️ SENT, not delivered. This is the near side of the wire and the relay
    // drops silently, so a client MUST compare it against the counter in the
    // payload. A number counted here is not evidence about the far end.
    sent: vsent, ...st,
  };
}

function videoConnect() {
  if (vws && (vws.readyState === 0 || vws.readyState === 1)) return;
  vws = new WebSocket(`${RELAY}/room/${VIDEO_ROOM}/ws`);
  vws.binaryType = 'arraybuffer';
  vws.onopen = () => log(`video socket joined ${VIDEO_ROOM}`);
  vws.onclose = () => { log('video socket closed'); vws = null; if (video) setTimeout(videoConnect, 1000); };
  vws.onerror = () => { /* close follows; one report is enough */ };
}

/**
 * One frame out.
 *
 * ⚠️ THE SEQUENCE NUMBER GOES IN THE PAYLOAD. A binary frame carries no
 * envelope, so `wire.mjs`'s `seq` cannot ride along — and the relay's caps drop
 * frames with no error at all, which is exactly what a counter exists to see.
 * MEASURED: at 8 Mbit/s the relay lost 101 of 361 frames and NOTHING else on
 * the path reported it. 8 bytes: a uint32 counter and a uint32 flag word whose
 * low bit says this frame is a keyframe, so a joiner knows what to wait for
 * without parsing NAL types.
 */
function sendFrame(unit, key) {
  if (vws?.readyState !== 1) return;
  const out = Buffer.allocUnsafe(8 + unit.byteLength);
  out.writeUInt32LE(vseq++, 0);
  out.writeUInt32LE(key ? 1 : 0, 4);
  Buffer.from(unit.buffer, unit.byteOffset, unit.byteLength).copy(out, 8);
  vws.send(out);
  vsent++;
}

/**
 * 🔴 THE ARCHIVE SOURCE THIS IDLE STOP WAS WRITTEN FOR IS GONE, 2026-09-16.
 *
 * It played ERR's 1965 radio archive into the JACK graph on `-stream_loop -1`,
 * so it never ended, and this stopped it once the room had been empty for five
 * minutes: about 28 MB an hour, continuously, out of a public broadcaster, for
 * nobody. The whole path went instead. `archive/box-pappus/` has it and says
 * why. The picture's idle stop below is the same idea and is still live.
 */
// ⚠️ THE PICTURE NEEDS THIS MORE THAN THE ARCHIVE DID, and it did not have it.
// The mirror page asks the box to draw AS SOON AS IT LOADS, so one visit leaves
// the renderer and the hardware encoder running for ever — measured: 25% of the
// machine and 2 Mbit/s into an empty room, hours after the last viewer closed
// the tab. The same reasoning was written out in full for ERR's archive this
// morning and not applied one file over. Shorter here because nobody is
// listening to a picture nobody is watching, where a broadcast might reasonably
// play on.
const VIDEO_IDLE_MS = 2 * 60e3;
let videoWatch = null, videoAloneSince = null;

/** How many sockets are in a room, or null when the relay will not say. */
async function roomSockets(room) {
  try {
    const r = await fetch(`${RELAY.replace(/^ws/, 'http')}/room/${room}/stats`, { cache: 'no-store' });
    if (!r.ok) return null;
    return (await r.json()).sockets ?? null;
  } catch { return null; }
}

/**
 * ⚠️ A SOCKET IS NOT A VIEWER, AND COUNTING SOCKETS DOES NOT WORK.
 *
 * The first version of this asked the relay how many sockets were in the video
 * room and treated anything above one as somebody watching. MEASURED: the room
 * reported SEVEN while nothing on earth was watching — stale connections left
 * by test runs that exited without a clean close. The guard could never fire,
 * and the renderer ran for 231,300 frames, about two and a quarter hours, for
 * nobody.
 *
 * That is this repo's own rule, ignored one more time: a count is only evidence
 * on the far side of the boundary. The relay's socket count is a PROXY for a
 * viewer. The quantity in question is whether anyone is watching, and the only
 * thing that knows is the page — so it says so, every ten seconds, and a viewer
 * that has stopped saying it has stopped watching. It also, for free, covers
 * the case a socket count never could: a tab that is open but hidden.
 */
let lastWatchAt = 0;

function watchVideoViewers() {
  if (videoWatch) return;
  videoAloneSince = null;
  lastWatchAt = Date.now();          // grace: nobody has had a chance to say yet
  videoWatch = setInterval(() => {
    if (!video) return stopVideoWatch();
    if (Date.now() - lastWatchAt < VIDEO_IDLE_MS) { videoAloneSince = null; return; }
    videoAloneSince ??= lastWatchAt;
    log(`video: nobody has said they are watching for ${Math.round(VIDEO_IDLE_MS / 60000)} min — stopping the renderer`);
    const st = video.stats();
    video.stop(); video = null;
    try { vws?.close(); } catch { /* already */ }
    vws = null;
    stopVideoWatch();
    send({ type: 'video.stopped', ok: true, reason: 'nobody watching', ...st });
  }, 30e3);
  videoWatch.unref?.();
}
function stopVideoWatch() { if (videoWatch) { clearInterval(videoWatch); videoWatch = null; videoAloneSince = null; } }

/**
 * Yoshimi's bank map, read once and re-read when Yoshimi rewrites it.
 *
 * The file is 660 KB of gzipped XML and a patch step asks for the bank number
 * every time, so re-reading it per keystroke would be silly — but caching it
 * forever would make an instrument added on the box invisible until a restart.
 * The mtime is the cheap way to have both.
 */
let yoshimiMemo = null, yoshimiMemoAt = 0;
function yoshimiList() {
  let mtime = 0;
  try { mtime = statSync(`${YOSHIMI_DIR}/yoshimi.banks`).mtimeMs; } catch { /* answered below */ }
  if (!yoshimiMemo || mtime !== yoshimiMemoAt) { yoshimiMemo = yoshimiPatches(); yoshimiMemoAt = mtime; }
  return yoshimiMemo;
}
/**
 * Which controller selects a bank, for the instrument that is running.
 *
 * 32 is the MIDI standard (bank select LSB) and is the right answer for any
 * synth that has banks at all; Yoshimi's is read from Yoshimi rather than
 * assumed, because it is settable there and a page cannot see the setting.
 */
const bankCC = (source) => (source === 'yoshimi' ? yoshimiList().bankCC ?? 32 : 32);

const log = (...a) => console.log(new Date().toISOString().slice(11, 23), ...a);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const send = (msg) => { if (ws?.readyState === 1) { ws.send(format(msg, { from: FROM, seq: seq++ })); return true; } return false; };

// ── shipping the grains ──────────────────────────────────────────────────────
//
// FOUR A SECOND, WHATEVER THE GRAIN RATE. sclang already batches at 250 ms;
// this matches that cadence rather than inventing a second one, because two
// buffers at different rates is a queue with a delay nobody chose.
//
// ⚠️ THE RELAY DROPS EVERYTHING PAST 60 msg/s AND TELLS THE SENDER NOTHING —
// measured, twice, exactly 298 messages delivered in three seconds at both 120
// and 300 msg/s. One message per grain would arrive as a sparse cloud that
// reads as a quiet granulator rather than as a dropped message, so the count of
// grains in the window travels WITH the list and a reader can tell the two
// apart.
const GRAIN_TTL = 30000;        // how long one `grain.report` keeps it shipping
let grainUntil = 0, grainPump = null;
function startGrainPump() {
  if (grainPump) return;
  grainPump = setInterval(() => {
    if (Date.now() > grainUntil) { stopGrainPump(); pap?.report(false); return; }
    const g = pap?.takeGrains?.();
    if (!g || (!g.list.length && !g.seen)) return;
    // ⚠️ `heardAt`, NOT `at`. `at` is an ENVELOPE field and `format()` THROWS
    // on the collision — which it did, here, and took the whole box down with
    // it until systemd restarted it. That throw is LESSONS #45: `at` once ate
    // a payload field silently and ffmpeg was asked to seek to second
    // 1,789,103,743,118, so session 18 made the collision loud on purpose. It
    // worked exactly as intended on the first person to hit it since.
    send({ type: 'grain.marks', seen: g.seen, marks: g.list, heardAt: g.at });
  }, 250);
  grainPump.unref?.();
}
function stopGrainPump() { if (grainPump) { clearInterval(grainPump); grainPump = null; } }

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

let spaceWas = false;     // an insert that was on before an instrument change
async function startAudio(source = 'synth', msg = null) {
  // ⚠️ REPLACE, do not refuse. This used to return {already:true} when
  // anything was running, so picking a second instrument left the first one
  // ALSO streaming: two sources into one socket at 50 msg/s each, interleaved
  // samples, and 100 msg/s against the relay's 60 — measured 60 frames/s
  // arriving and 5,495 dropped at the relay. It sounds like corruption and it
  // is two instruments talking over each other.
  if (starting) return { ok: false, reason: `already starting ${starting}`, starting };
  // 🔴 A NEW INSTRUMENT DOES NOT INHERIT AN INSERT NOBODY IS HOLDING. The line
  // further down re-patches a switched-on insert onto whatever comes up, which
  // is right for the page that asked for it and wrong for everyone else: it is
  // how a granulator left behind by a closed tab ends up wrapping the next
  // person's yoshimi. The heartbeat's sweep would catch it within five seconds
  // anyway; doing it HERE means those five seconds are not audible.
  // ⚠️ IT DROPS A STALE INSERT, NEVER A LIVE ONE. A `/grains/` tab that is open
  // and quiet keeps its insert across an instrument change somebody else
  // started, which is the stomp `onlyIfIdle` exists to prevent. The board says
  // so in this call's own reply, in `fx` and `fxBy`.
  await sweepInsert('an instrument was asked for');
  const running = inst ? inst.source : stopSynth ? 'synth' : audio ? 'capture' : null;
  if (running) {
    // ⚠️ AND SAY WHAT IT IS PLAYING. This early return used to answer
    // `{ok, already, source}` and nothing else, so a client that asked to start
    // something already running got a reply with no port and no title — which
    // reads as "started, and playing nothing". A reply about a running source
    // must describe it as fully as the reply that started it.
    if (running === source && source !== 'fluidsynth') {
      return { ok: true, already: true, source: running, jack: !!inst?.jack, port: inst?.port ?? null,
               ...insertState() };
    }
    log(`switching ${running} -> ${source}`);
    // 🔴 REMEMBER THE INSERT BEFORE STOPPING, because stopAudio() switches it
    // off — correctly, since nothing is playing between the two instruments.
    // Reading `spaceState()` afterwards therefore always answers "off", and the
    // carry-over below silently did nothing. Caught by testing it: yoshimi ->
    // hexter reported `on=false` with the reverb armed a second earlier. Two
    // fixes in one edit that each work alone and cancel each other.
    spaceWas = spaceState().on;
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
    try { r = await startJackSynth(source, { onFrame: sendPcm, onLog: (l) => log(`${source}:`, l), soundfont: msg?.soundfont }); }
    finally { starting = null; }
    if (!r.ok) { log(`${source} failed: ${r.reason}`); return r; }
    inst = r;
    log(`${source} up · port ${r.port} · midi ${r.midi ? 'in' : 'NONE'}`);
    // An instrument change re-patches the graph, so a switched-on insert has to
    // be put back or it silently drops out from under the new instrument.
    if (fxOn) await pappusFx(true, { instrumentPort: r.port, instrumentPortR: r.portR, onLog: (l) => log('pappus:', l) });
    // ⚠️ AND THE GENERATED MATERIAL, for the same reason and it is not
    // automatic: `pappusFx(true)` patches the NEW instrument into the
    // granulator's input, which is the one thing a generated source needs not
    // to happen. Without this, choosing an instrument silently puts it back in
    // the buffer beside the sines, and the two panes stop being comparable
    // while every readout still says they are.
    if (fxOn && madeSource) sourceFeed(true, { instrumentPort: r.port, instrumentPortR: r.portR, onLog: (l) => log('source:', l) });
    // ⚠️ AND THE REVERB, for the same reason and it is not automatic. A
    // switched-on insert that silently drops out from under a new instrument is
    // worse than one that was never on: the page still shows it armed.
    // `spaceState()` reads the GRAPH rather than a variable, so this asks what
    // is true rather than what was last requested.
    if (spaceWas || spaceState().on) {
      const sr = await spaceFx(true, { instrumentPort: r.port, instrumentPortR: r.portR, onLog: (l) => log('space:', l) });
      if (!sr?.ok) log(`space did not survive the instrument change — ${sr?.reason}`);
      spaceWas = false;
    }
    return { ok: true, source, jack: true, port: r.port, midi: r.midi, rate: r.rate, msgPerSec: r.msgPerSec,
             channels: r.channels, ...insertState() };
  }


  // A real multitimbral instrument: 16 channels, 16 GM programs, one process.
  // Its `file` audio driver is realtime-paced, so its stdout IS the stream —
  // no soundcard, no ALSA, nothing to mix.
  // ⚠️ `fluidpipe` WAS HERE AND IS GONE, 2026-09-11, on a measurement.
  //
  // It wrote realtime PCM to a FIFO — one process, no jackd — and the one thing
  // keeping it alive was a platform fact: the whole of rig/box once ran in an
  // arm64 container with no sound hardware in existence, BECAUSE FluidSynth's
  // `file` driver needs no kernel. That argument is transferable and nobody had
  // checked. Now checked: in a `debian:trixie` arm64 container with no /dev/snd
  // at all and `ulimit -r` 0, `jackd -r -d dummy` came up, fluidsynth
  // registered left and right, the ffmpeg capture client attached, and three
  // seconds of the graph came back as 144,021 samples at peak 0.1096 — real
  // audio, not silence. jackd's dummy driver is pure software timing, which is
  // the same reason the `file` driver worked.
  //
  // So the pipe path bought nothing the JACK path does not, and cost the one
  // thing that mattered: pappus is a JACK insert, so on a pipe the 128 General
  // MIDI instruments could not be granulated at all. `git show 0ca0d67^` has it
  // if it is ever wanted back.

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

  // ⚠️ CAPTURE IS ASKED FOR BY NAME, NOT FALLEN INTO. Everything that did not
  // match above used to arrive here and become a MICROPHONE — so a typo, or a
  // source removed from the table, started `arecord` and answered
  // `{ok: true, source: 'capture'}`. It even made sound, because a capture
  // device usually has something on it. Measured after `fluidpipe` was deleted:
  // asking for it still "worked", peak 0.0391, which is the deletion silently
  // not taking effect. A name nobody recognises is an error, not a default.
  if (source !== 'capture') {
    return { ok: false, reason: `unknown source ${JSON.stringify(source)}`,
             known: [...Object.keys(JACK_SYNTHS), 'synth', 'moog', 'capture'] };
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
  const was = inst ? inst.source : stopSynth ? 'synth' : audio ? 'capture' : null;
  aseq = 0;                       // a new source restarts the sequence
  if (inst) { inst.stop(); inst = null; }
  if (stopSynth) { stopSynth(); stopSynth = null; synth = null; }
  if (midiIn) { midiIn.kill('SIGTERM'); midiIn = null; }
  if (audio) { audio.kill('SIGTERM'); audio = null; }
  // The insert has nothing to wrap once nothing is playing, and an engine left
  // running holds its JACK ports and a little CPU for no reason.
  try { if (spaceState().on) spaceFx(false, { onLog: (l) => log('space:', l) }); } catch { /* never started */ }
  return { ok: true, was, frames: sentFrames };
}

// ------------------------------------------------------------- control plane
//
// 🔴 COALESCE, DO NOT QUEUE. A backlog of note messages has to be played out,
// because every one of them is an event that happened. A backlog of CONTROLLER
// messages is a stack of statements about where one knob is, and all but the
// last are already wrong. Queueing them would walk the filter through positions
// the hand has left, late, which is worse than skipping them.
//
// The drain is a timer rather than a write per message so that a burst arriving
// in one tick costs ONE MIDI write per controller. `DRAIN_MS` is well under the
// 20 ms audio frame, so a value that matters is never held long enough to be
// heard as lateness.
const DRAIN_MS = 5;
const ctl = { pending: new Map(), timer: null, ch: 0, in: 0, out: 0, folded: 0, since: Date.now() };

function ctlDrain() {
  if (ctl.timer) return;                         // one drain in flight is enough
  ctl.timer = setTimeout(() => {
    ctl.timer = null;
    if (!ctl.pending.size) return;
    // ⚠️ NO INSTRUMENT IS NOT AN ERROR AND IS NOT A BACKLOG EITHER. Holding
    // values for an instrument that may never start is how a knob turned before
    // `audio.start` arrives at the synth ten minutes later.
    if (!inst) { ctl.pending.clear(); return; }
    for (const [c, v] of ctl.pending) { inst.cc(ctl.ch, c, v); ctl.out++; }
    ctl.pending.clear();
  }, DRAIN_MS);
  ctl.timer.unref?.();
}

/** What the page displays: what arrived, what was written, what was overtaken. */
function ctlMeter() {
  const forMs = Date.now() - ctl.since;
  return { in: ctl.in, out: ctl.out, folded: ctl.folded, forMs,
           on: inst ? inst.source : null, channel: ctl.ch };
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
      if (!synth && !inst) await startAudio('fluidsynth', {});
      if (inst) inst.noteOn(msg.channel ?? 0, msg.note, msg.vel ?? 100);
      else synth?.noteOn(msg.note, msg.vel ?? 100);
      // ⚠️ A KEY NO LONGER PITCHES A GRAIN VOICE, AND THAT WENT WITH THE
      // ARCHIVE. It did so only with material LOADED into the buffers, which
      // was the ERR excerpt path and nothing else: with the granulator merely
      // recording its input, a key press is one sound already. The voices are
      // still there and `params.set gates` still opens them.
      return reply('note.ack', { note: msg.note, channel: msg.channel ?? 0,
        on: inst ? inst.source : 'synth' });
    case 'note.off':
      if (inst) inst.noteOff(msg.channel ?? 0, msg.note);
      else if (synth) synth.noteOff(msg.note);
      return reply('note.ack', { note: msg.note });
    case 'note.panic':
      if (inst) inst.panic();
      if (synth) synth.allOff();
      // An insert keeps sounding after every note has stopped — a captured
      // ring buffer, eight delay taps and a reverb tail. Silence it too, or
      // "all notes off" is only true of the instrument.
      if (fxOn) pappusPanic();
      // ...and close the grain voices, or eight gates stay open and the buffer
      // keeps sounding through a panic that said it had stopped everything.
      if (pap) pap.notes.panic();
      return reply('note.ack', { panic: true, fx: fxOn ? 'pappus cleared' : null });
    // What patches this box HAS, read off the box rather than guessed in a
    // browser. Which instruments exist is a property of the machine the synth
    // runs on — a page cannot see /usr/share/yoshimi/banks and should not
    // pretend to — so the box enumerates and the page renders what it is told.
    case 'voices.list': {
      const src = msg.source ?? inst?.source ?? null;
      if (src === 'yoshimi') {
        const list = yoshimiList();
        log(`voices.list: ${list.count} patches in ${list.bankCount} banks, root ${list.root}${list.stale ? ' (STALE — the bank map disagrees with the disk)' : ''}`);
        // ⚠️ `source` names the INSTRUMENT and must survive the spread. The
        // list carried its own `source` (the file it was read from) for one
        // revision, the spread overwrote this one with a path, and every
        // client waiting for "the yoshimi list" waited forever — with the
        // reply sitting right there. The file is `file`.
        return reply('voices.listed', { ...list, source: 'yoshimi' });
      }
      // hexter's programs index a cartridge this box loaded and fluidsynth's
      // are General MIDI: both are fixed tables the page already carries, and
      // inventing a second copy here is a second thing to keep in step.
      // `fixed` is the difference between "this instrument has no library to
      // read" and "something went wrong reading one" — a client that cannot
      // tell them apart has to log both, and then it logs a non-event every
      // time an instrument starts.
      return reply('voices.listed', {
        source: src, ok: false, fixed: !!src, banks: [], count: 0,
        reason: src ? `${src}'s programs are a fixed table, not a library on this box` : 'nothing is playing',
      });
    }
    // The multitimbral surface: one call per channel, then sixteen channels are
    // sixteen instruments. Names so a client need not memorise GM numbers.
    case 'voice.select': {
      // Every instrument here answers program change; only the MEANING of the
      // number differs. FluidSynth's are General MIDI, hexter's index the
      // loaded DX7 cartridge, Yoshimi's index its current bank — so a client
      // sends either a GM name (fluidsynth) or a program number (anything).
      if (inst) {
        const prog = typeof msg.voice === 'string' ? VOICES[msg.voice] : msg.program;
        if (prog === undefined) {
          // Two different mistakes, two different answers. A NAME that is not
          // in the GM table is worth listing the table for; no name and no
          // number is worth saying what to send instead. The pipe path used to
          // give the first and the JACK path the second, which meant the help
          // you got depended on which transport happened to be running.
          return reply('voice.selected', typeof msg.voice === 'string'
            ? { ok: false, reason: `unknown voice ${JSON.stringify(msg.voice)}`, known: Object.keys(VOICES), on: inst.source }
            : { ok: false, reason: 'send {program:<0-127>} or {voice:"<general midi name>"}', on: inst.source });
        }
        // ⚠️ BANK SELECT IS CC 32, AND THE NUMBER IS READ FROM YOSHIMI'S OWN
        // CONFIG (`midi_bank_C`), never typed here. CC 0 is `midi_bank_root`:
        // sending a bank on it moves Yoshimi's ROOT DIRECTORY instead, at which
        // point every program change afterwards lands nowhere. One wrong guess
        // about this cost an hour.
        //
        // Bank and program go out back to back on ONE byte stream, so they
        // cannot arrive out of order and no delay is needed between them.
        const bank = Number.isInteger(msg.bank) ? msg.bank : null;
        if (bank !== null) inst.cc(msg.channel ?? 0, bankCC(inst.source), bank);
        inst.program(msg.channel ?? 0, prog);
        return reply('voice.selected', { ok: true, on: inst.source, channel: msg.channel ?? 0,
                                         bank, bankCC: bank === null ? null : bankCC(inst.source), program: prog, name: msg.name ?? null });
      }
      return reply('voice.selected', { ok: false, reason: 'no instrument running' });
    }
    /**
     * 🔴 THE CONTROL PLANE, WHICH IS A DIFFERENT KIND OF TRAFFIC FROM `cc`.
     *
     * `cc` below is EDGE-shaped in practice: one verb, one write, one ack, and
     * a page that sends fifty of them a second gets fifty acks back. A hand on
     * a slider is LEVEL-shaped: every message is a complete statement of where
     * the controller is, the last one is the only one that stays true, and an
     * ack per value is fifty messages a second spent telling a page something
     * it can see by listening.
     *
     * So this verb takes a BATCH, folds it, and writes at most one value per
     * controller per drain. `folded` is the number that was overtaken on the
     * way, and it is reported rather than hidden: a control plane that silently
     * drops is the shape every failure here takes.
     *
     * ⚠️ THE EXISTING `cc` VERB IS UNTOUCHED, so `/box/` cannot regress. Two
     * verbs, two disciplines, one instrument.
     * ⚠️ AND THE LAST VALUE SENT IS THE LAST VALUE WRITTEN. A fold that kept
     * the FIRST of a burst would leave the filter behind the finger for as long
     * as the burst lasted, which is the bug that reads as latency.
     */
    case 'ctl.set': {
      if (!Array.isArray(msg.set)) return reply('ctl.ack', { ok: false, reason: 'ctl.set wants set: [[controller, value], ...]' });
      ctl.ch = msg.channel ?? ctl.ch;
      for (const pair of msg.set) {
        if (!Array.isArray(pair) || pair.length < 2) continue;
        const c = pair[0] | 0, v = Math.max(0, Math.min(127, pair[1] | 0));
        ctl.in++;
        if (ctl.pending.has(c)) ctl.folded++;      // this one overtook another
        ctl.pending.set(c, v);
      }
      ctlDrain();
      // NO ACK PER VALUE. `ctl.meter` says what happened, once a second.
      return;
    }
    case 'ctl.meter':
      return reply('ctl.meter', ctlMeter());
    case 'cc': {
      // Yoshimi answers CC 74 (cutoff) and 71 (resonance) for real; hexter has
      // no filter at all but takes CC 16/17/18/19/80/81 as operator coarse
      // frequency, effective on notes ALREADY SOUNDING.
      if (inst) { inst.cc(msg.channel ?? 0, msg.ctrl, msg.value); return reply('cc.ack', { ok: true, on: inst.source }); }
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
      // ⚠️ An insert can only reach what is ON THE JACK GRAPH. FluidSynth
      // normally writes to a FIFO and never appears there, so pappus cannot
      // wrap it. A `fluidjack` variant exists in jacksynth.mjs and swapping to
      // it was tried — it works in principle and was flaky in practice, so the
      // honest thing is to say no rather than half-swap under the user. The
      // page disables the switch on fluidsynth for the same reason.
      // ⚠️ THE GATE IS `inst.jack`, NOT AN INSTRUMENT NAME. It used to read
      // `!jsyn`, which meant "is it one of the JACK ones" by which variable
      // happened to be set — so adding a source meant remembering this line.
      // The insert can wrap anything on the JACK graph, and that is a property
      // the source reports about itself.
      if (want && !inst?.jack) return reply('fx.pappus', {
        ok: false,
        ...insertState(),
        reason: inst ? `${inst.source} writes to a pipe, not to JACK — the insert can only wrap what is on the JACK graph`
                      : 'nothing is playing for an insert to wrap',
      });
      // 🔴 `onlyIfIdle` — "take it out, UNLESS somebody is still using it".
      //
      // ⚠️ NOTHING IN THIS REPO SENDS IT ANY MORE. `/box/` did, on load, and
      // that page has no granulator on it since 2026-09-16; `sweepInsert()`
      // applies the same liveness rule on the board's own clock, so the message
      // is no longer how an orphaned insert gets cleared. It is kept because it
      // is still a correct thing for a person or another program to ask, and
      // because it reads the liveness verdict OUT LOUD, which the sweep cannot
      // do for a caller that wants an answer now.
      //
      // ⚠️ IT REFUSES OUT LOUD. `ok: true, on: true, kept: true` with the
      // holder and the ages in the reply, so the page can say "another tab
      // asked for this 4 s ago" rather than quietly showing the wrong picture.
      // An arbitration nobody can see is worse than none.
      //
      // ⚠️ AND IT IS OPT-IN. A caller that does not send it gets the old
      // behaviour exactly, which is what keeps `fx.pappus {on:false}` a thing a
      // person can type to fix a wedged board.
      if (!want && msg.onlyIfIdle === true && fxOn && fxAsked?.on
          && fxAsked.by !== msg.from && stillHere(fxAsked.by)) {
        const heldFor = Math.round((Date.now() - fxAsked.at) / 1000);
        const heardAgo = Math.round((Date.now() - clientSeen.get(fxAsked.by)) / 1000);
        return reply('fx.pappus', {
          // ⚠️ `on: true` EXPLICITLY. Every page reads `m.on` off this reply to
          // set its own idea of the insert, and `insertState()` reports `fx`
          // rather than `on` — so a refusal without this would answer "ok" and
          // then tell the page the granulator is off, which is the silent wrong
          // picture this whole change exists to stop.
          ok: true, on: true, kept: true, ...insertState(), instrument: inst?.source ?? null,
          reason: `another page asked for the granulator ${heldFor} s ago and was heard from ${heardAgo} s ago`,
        });
      }
      const r = await pappusFx(want, { instrumentPort: inst?.port, instrumentPortR: inst?.portR, onLog: (l) => log('pappus:', l) });
      // ⚠️ RECORDED ONLY WHEN IT ACTUALLY CHANGED. A request that failed leaves
      // the previous holder in place, or the page that got a refusal would be
      // recorded as the owner of an insert it never raised.
      if (r.ok) { fxOn = want; fxAsked = { by: msg.from ?? null, at: Date.now(), on: want }; }
      // ⚠️ `pappusFx(true)` RE-PATCHES THE INSTRUMENT INTO THE GRANULATOR, which
      // is right for every other caller and is exactly what a generated source
      // had disconnected. Put it back the way the source wants it, in the one
      // place that knows both.
      // And when there is no source: ask sclang to drop any synth it is still
      // holding. sclang OUTLIVES this process — `pappusFx` adopts a running one
      // rather than compiling a 2,030-line class again — so a restarted box can
      // inherit a source synth it never started, playing into a granulator that
      // now has the instrument patched in as well.
      if (r.ok && want) {
        if (madeSource) sourceFeed(true, { instrumentPort: inst?.port, instrumentPortR: inst?.portR, onLog: (l) => log('source:', l) });
        else pappus().sourceOff();
      }
      if (r.ok && !want) madeSource = null;
      // Switching off returns the sampler to its cheap path: one process, no
      // jackd, no capture.
      return reply('fx.pappus', { ...r, ...insertState(), instrument: inst?.source ?? null });
    }

    // ── the reverb, as an insert ─────────────────────────────────────────
    //
    // The OPPOSITE kind of insert to pappus. A grain cloud has no note-off, so
    // wrapping an instrument in one washed out its envelope and the patch
    // selector stopped doing anything audible. This one passes the dry signal
    // and adds a tail: let go of the key and the note still stops.
    //
    //   fx.space {"on":true}                    put it in
    //   fx.space {"mix":0.6,"room":0.8}         turn a knob, with no gap in the sound
    //   fx.space {"on":false}                   take it out
    //
    // `on` LEFT OUT means "leave it as it is". A knob must not be able to
    // switch an effect on: a page with four sliders would otherwise insert a
    // reverb the first time anyone touched one.
    //
    // 🔴 `ok: true` FOR `on: true` MEANS AUDIO WAS HEARD COMING OUT OF IT, not
    // that a process started or a port appeared. `fx.pappus` answered ok on the
    // port and was seven seconds early, and everything sent into that gap went
    // nowhere with no error. spaceFx() pushes a real tone through the insert on
    // a subgraph nobody is listening to and measures what comes out; the
    // numbers it measured come back in `heard`.
    case 'fx.space': {
      // A boolean or nothing — `msg.on !== false` would make every knob turn a
      // switch, which is the bug the paragraph above is about.
      const want = typeof msg.on === 'boolean' ? msg.on : null;
      const onLog = (l) => log('space:', l);
      const asked = spaceClamp(msg);            // 0..1, and damp in Hz — clamped in
                                                // three places: here, and again in
                                                // the orchestra, which is the only
                                                // end that can be sure.
      const st = () => spaceState();
      if (want === true) {
        // Same gate as pappus, and for the same reason: an insert can only
        // reach what is ON THE JACK GRAPH.
        if (!inst?.jack) return reply('fx.space.applied', {
          ok: false, on: false, params: st().params,
          reason: inst ? `${inst.source} writes to a pipe, not to JACK — the insert can only wrap what is on the JACK graph`
                       : 'nothing is playing for an insert to wrap',
        });
        // ⚠️ TWO INSERTS, ONE GRAPH. Pappus has already taken the instrument
        // off the capture and put itself there; adding this one would leave
        // both feeding it, so you would hear a grain cloud AND a reverb at
        // once. Refusing is loud, and switching the other one off under
        // somebody is not this verb's business.
        if (fxOn) return reply('fx.space.applied', {
          ok: false, on: false, params: st().params,
          reason: 'pappus is in the chain — send fx.pappus {"on":false} first, or you would hear both',
        });
      }
      // Knobs only: one send, and wait to be told it landed.
      if (want === null) {
        const r = await spaceSet(asked, { onLog });
        return reply('fx.space.applied', { ...r, on: st().on, instrument: inst?.source ?? null });
      }
      // Values BEFORE the switch, so a call carrying both inserts with the
      // values the caller asked for rather than with the previous ones.
      if (Object.keys(asked).length) await spaceSet(asked, { onLog });
      const r = await spaceFx(want, { instrumentPort: inst?.port, instrumentPortR: inst?.portR, onLog });
      log(`space ${want ? 'in' : 'out'}: ${r.ok ? 'ok' : r.reason}`);
      return reply('fx.space.applied', { ...r, params: st().params, instrument: inst?.source ?? null });
    }
    // Everything the box knows about the reverb, including WHEN it last heard
    // sound come out of it. Separate from `params.state`, which is the
    // granulator's.
    case 'fx.space.status':
      return reply('fx.space.state', { ok: true, ...spaceState(), instrument: inst?.source ?? null });

    // A SEEDED roll, in one of six named characters.
    //
    // The old roll drew nine parameters uniformly and independently, which
    // lands in the middle of all nine nearly every time — one sound wearing
    // different numbers — and threw the numbers away, so a roll that landed on
    // something good could not be got back. Both are fixed in `pappus.mjs`:
    // the character is drawn first and narrows the ranges, and the seed comes
    // back with the roll so the same roll can be asked for again.
    case 'params.random': {
      if (!fxOn) return reply('params.rolled', { ok: false, reason: 'pappus is not switched on' });
      // With material loaded the keyboard owns the eight grain voices, so the
      // roll leaves `pitches`/`gates` alone rather than pulling the instrument
      // out from under whoever is playing it.
      const r = pappus().roll(Number.isInteger(msg.seed) ? msg.seed : undefined, { voices: true });
      // Movement is on by default once there is something to move. It is not a
      // control the page offers — see `params.drift` for why it exists at all.
      //
      // ⚠️ SO `params.drift {on:false}` FOLLOWED BY A ROLL IS A NO-OP, and that
      // cost a whole measurement run. `pappus-live.mjs` switched the drift off,
      // rolled ten seeds, and took every capture believing nothing was moving
      // while `DRIFT` walked scan · spray · swarm · tilt · size · sos at 8 Hz
      // underneath — which is why two DIFFERENT seeds measured ten times closer
      // together than one seed measured to itself.
      //
      // It is deliberate and it stays: a page that rolls wants the movement.
      // The reply below carries `drift: driftStats()` so a caller can SEE it
      // came back on, and anything measuring must switch it off AFTER the roll,
      // not before. The harness does that in one place now.
      pappus().startDrift();
      log(`rolled ${r.character.m}/${r.character.n} · seed ${r.seed} · ${r.m.rate}/${r.n.rate} grains per second`);
      return reply('params.rolled', { ok: true, on: 'pappus', ...r, characters: CHARACTER_NAMES, drift: pappus().driftStats() });
    }
    // The slow movement, which has no slider on purpose.
    //
    // It lives in the box rather than in the page because the box is an OBJECT
    // and not a SESSION: the sound goes on moving with nobody connected, which
    // is the whole of plan-hardware §8.7. The page can turn it off; it cannot
    // steer it, because a steerable drift is just a slider with extra steps.
    case 'params.drift': {
      if (!fxOn) return reply('params.drifted', { ok: false, reason: 'pappus is not switched on' });
      const want = msg.on !== false;
      const changed = want ? pappus().startDrift(msg.hz) : pappus().stopDrift();
      return reply('params.drifted', { ok: true, on: want, changed, ...pappus().driftStats() });
    }
    // ── the grains, as they fire ──────────────────────────────────────────
    //
    // 🔴 THE ONE THING AUDIO CANNOT CARRY. A page drawing this granulator
    // beside one in a browser can mark every grain on the browser's side and
    // none on this one, because a bump in an envelope might be a note, a delay
    // tap or a reverb swell. The engine reports each grain as `GrainBuf` is
    // triggered; this is the door it leaves by.
    //
    // ⚠️ ASKED FOR, AND IT STOPS ASKING ITSELF. Reporting costs the engine
    // sixteen live SendReply UGens and this room four messages a second, and a
    // page that is closed cannot tell anybody. So a request expires: the box
    // keeps shipping for GRAIN_TTL after the last `grain.report`, and a page
    // that wants the picture re-asks while it is open. A board still shouting
    // at an empty room a week later is the shape of failure this avoids.
    // ── the material, built here from the page's own description ─────────
    //
    // 🔴 THE POINT OF THE WHOLE PATH (plan-twins §4a). `grains` draws this
    // granulator beside one in a browser and calls them comparable. They were
    // not, and the biggest reason by a distance was not the granulator: the
    // page chewed a table of sine partials and this board chewed whatever
    // instrument happened to be running. One spec, expanded by ONE function
    // (`partialsOf`, imported by both ends), rendered here by `PosSource.sc`.
    //
    // ⚠️ THIS ONE GENERATES. There used to be a second verb here that wrote a
    // minute of ERR's 1965 archive into the grain buffer from disk; it left on
    // 2026-09-16 and this is the only material path now.
    //
    // ⚠️ AND THE INSTRUMENT COMES OUT OF THE INPUT, RATHER THAN BEING STOPPED.
    // scsynth fills its input bus from JACK before any synth runs, so an
    // instrument still patched to `SuperCollider:in_1` is summed with the
    // generated material and the granulator chews a third thing neither end can
    // describe. Stopping it is not the fix: `posbox`, the capture whose frames
    // are the audio a page HEARS, is raised as part of the instrument's own
    // chain, so `audio.stop` would take the result away with the material.
    case 'source.set': {
      const onLog = (l) => log('source:', l);
      if (msg.on === false) {
        pap?.sourceOff();
        madeSource = null;
        const back = sourceFeed(false, { instrumentPort: inst?.port, instrumentPortR: inst?.portR, onLog });
        return reply('source.applied', { ok: true, on: false, instrument: inst?.source ?? null, fed: back.fed });
      }
      if (!fxOn) return reply('source.applied', { ok: false, on: false, reason: 'pappus is not switched on, so there is nothing to feed' });
      const r = pappus().source(msg.spec ?? {});
      if (!r.ok) return reply('source.applied', { ok: false, on: !!madeSource, reason: r.reason });
      madeSource = { spec: r.spec, partials: r.partials, top: r.top };
      const feed = sourceFeed(true, { instrumentPort: inst?.port, instrumentPortR: inst?.portR, onLog });
      // 🔴 `ok` MEANS THE ENGINE HAS IT, not that this process sent it — the
      // same standard `fx.space` holds itself to, and the one this handler
      // failed on its first run. scsynth answers `/s_get` only for a node that
      // really exists, with the value it really holds, so the wait is for THAT
      // and the reply carries it. Three seconds because a first `/s_new` after
      // a def load is the slow case and a fixed one-beat sleep answered before
      // the server had spoken.
      let st = pappus().sourceState();
      for (let i = 0; i < 30 && !st.on; i++) { await wait(100); st = pappus().sourceState(); }
      // ⚠️ AND THE VALUES ARE COMPARED, not merely present. A node that exists
      // holding the def's DEFAULTS is a node that never received the spec, and
      // it would sound almost right — `hz` within a tenth of a hertz and the
      // voice count exact is what says the table arrived with it.
      const holds = st.on && st.voices === r.spec.chord.length && Math.abs(st.hz - r.spec.hz) < 0.1;
      if (!holds) {
        log(`source: the engine did not confirm it — node ${st.node}, ${st.voices} voices, ${st.hz} Hz`);
        return reply('source.applied', {
          ok: false, on: false, reason: st.on
            ? `the engine holds ${st.voices} voices at ${st.hz} Hz, not ${r.spec.chord.length} at ${r.spec.hz}`
            : 'the engine never answered — the synth was not built',
          node: st.node, partials: r.partials,
        });
      }
      log(`source: ${r.partials} sine partials, top ${Math.round(r.top)} Hz, engine node ${st.node}`);
      return reply('source.applied', {
        ok: true, on: true, partials: r.partials, spec: r.spec, topHz: Math.round(r.top),
        // What the ENGINE answered, which is the only part of this that is
        // evidence rather than intent.
        engine: { node: st.node, voices: st.voices, hz: st.hz, saidMs: st.ms },
        instrument: inst?.source ?? null, fed: feed.fed,
      });
    }
    case 'grain.report': {
      if (!fxOn) return reply('grain.reported', { ok: false, reason: 'pappus is not switched on' });
      const want = msg.on !== false;
      grainUntil = want ? Date.now() + GRAIN_TTL : 0;
      pappus().report(want);
      if (want) startGrainPump(); else stopGrainPump();
      return reply('grain.reported', { ok: true, on: want, forMs: want ? GRAIN_TTL : 0 });
    }
    case 'params.state':
      return reply('params.state', {
        ok: fxOn, roll: pap?.current() ?? null, drift: pap?.driftStats() ?? null,
        // 🔴 WHAT IT IS CHEWING, for a page that joined after somebody else set
        // it. ⚠️ There used to be a second answer beside this one, `source`,
        // which was the minute of ERR's archive loaded into the buffers. That
        // path left on 2026-09-16, so `made` is now the only material the board
        // can be given and the ambiguity is gone with it.
        made: madeSource ? { ...madeSource, engine: pap?.sourceState() ?? null } : null,
        // Which voice slots are open and at what interval. ⚠️ This is what the
        // box SENT, not what the engine did with it — a count on this side of
        // the wire is not evidence about the far side (CLAUDE.md). It is here
        // so a sweep can tell "the box never sent it" apart from "the engine
        // took it and made no sound", which are opposite bugs.
        notes: pap?.notes.state() ?? null,
      });
    // One named engine command, forwarded. Pappus has 106 of them and the roll
    // reaches a chosen subset, so without this the only way to ask the engine a
    // question is to edit the box and redeploy it — which is how an afternoon
    // went on a question that takes four seconds to answer.
    //
    // This is the MEASUREMENT surface, not a control surface: it is what lets a
    // harness sweep one parameter and grade the sound, which is the only way to
    // tell "the engine ignores this" from "the capture cannot see it".
    //
    // Same posture as every other verb here: the relay is tokenless, so anyone
    // in the room can send it. The blast radius is one granulator's parameters
    // on one board — strictly smaller than `patch.apply` or `audio.start`,
    // which have been open all along.
    case 'params.set': {
      if (!fxOn) return reply('params.set', { ok: false, reason: 'pappus is not switched on' });
      // A command NAME, not arbitrary text: this becomes an OSC address on a
      // socket, and the engine takes any string without complaint.
      const cmd = typeof msg.cmd === 'string' && /^[a-z][a-z0-9_]{0,23}$/.test(msg.cmd) ? msg.cmd : null;
      if (!cmd) return reply('params.set', { ok: false, reason: 'send {cmd:"<name>", args:[<numbers>]}' });
      const args = (Array.isArray(msg.args) ? msg.args : [msg.value])
        .filter((v) => typeof v === 'number' && Number.isFinite(v));
      // 48 because the resonator bank takes 48 frequencies in one message, and
      // nothing here takes more.
      if (!args.length || args.length > 48) return reply('params.set', { ok: false, reason: 'args must be 1..48 finite numbers' });
      // ⚠️ `.set`, NOT `.send`. A parameter a person chose becomes the centre
      // the slow movement circles, so a page that sets its sound directly —
      // `grains` has six named patches and no die — has something for the
      // drift to move around. `.send` is the raw door and stays raw, because
      // the drift's own nudges go out through it.
      const centred = pappus().set(cmd, ...args);
      // 🔴 AND IF IT WAS THE VOICE GATES, THE KEYBOARD'S MIRROR FOLLOWS IT.
      // `notes.gate` in `params.state` is what a page reads to find out whether
      // this granulator can fire at all — and it was the KEYBOARD's model, so a
      // page that opened the gates through this raw door left the board
      // reporting every voice shut about a granulator making grains. One
      // authority, and this is the line that keeps it one.
      if (cmd === 'gates') pappus().notes.adopt(args);
      // It does NOT switch the movement on. `params.set` is the MEASUREMENT
      // surface: a sweep that turned the drift on under itself would be
      // grading a moving target, and `pappus-live.mjs` opens by turning it off
      // for exactly that reason. Movement is asked for, by `params.drift`.
      return reply('params.set', { ok: true, cmd, args, centred: centred ? centred.join(' ') : null });
    }

    // 🔴 THE THREE VERBS THAT PUT ERR'S 1965 ARCHIVE IN THE GRAIN BUFFERS
    // LEFT ON 2026-09-16: `source.search`, `source.load`, `source.clear`.
    // No page in `demo/` sent any of them, and every connection this repo opens
    // to ERR appears in a public broadcaster's audience measurement, so an
    // unused path to their archive from a board nobody is watching was exposure
    // with no benefit. `archive/box-pappus/` has the code and the reasoning.
    // ⚠️ `source.set` BELOW IS NOT THAT and did not go: it is the sound BUILT
    // on the board from a spec, which is what `/grains/` feeds the granulator.

    // ── the picture ──────────────────────────────────────────────────────
    case 'video.start': {
      if (video) return reply('video.started', { ok: true, already: true, room: VIDEO_ROOM, ...videoShape() });
      videoConnect();
      const r = startVideo({
        w: Math.min(msg.w ?? 1280, 1920), h: Math.min(msg.h ?? 720, 1080),
        fps: Math.min(msg.fps ?? 30, 60),
        // ⚠️ CAPPED AT 4 Mbit/s, MEASURED. 2 and 4 arrive byte-identical
        // through the relay; 8 loses 28% of frames silently. Letting a client
        // ask for 8 would hand it a stream that looks like it is working.
        bitrate: Math.min(msg.bitrate ?? 2_000_000, 4_000_000),
        gop: Math.min(msg.gop ?? 30, 120),
        passes: Math.min(msg.passes ?? 1, 4),
        onFrame: sendFrame,
        onLog: (l) => log('video:', l),
      });
      if (!r.ok) return reply('video.started', { ok: false, reason: r.reason });
      video = r; vseq = 0; vsent = 0;
      watchVideoViewers();
      log(`video up · ${r.w}x${r.h} @${r.fps} · ${(r.bitrate / 1e6).toFixed(1)} Mbit/s · room ${VIDEO_ROOM}`);
      return reply('video.started', { ok: true, room: VIDEO_ROOM, ...videoShape() });
    }
    // The two knobs the picture has. Named rather than numbered, because a
    // client should not have to know that the mirror count is a uniform.
    // The same shader body the page just compiled for itself, compiled here as
    // 310 es. That is the whole of "the same shader on two GPUs" — one text,
    // two compilers, rather than two copies kept in step by hand.
    case 'video.shader': {
      if (!video) return reply('video.shader.applied', { ok: false, reason: 'no picture running' });
      const r = await video.shader(msg.body);
      log(r.ok ? `new shader sent to the renderer — ${r.bytes} bytes` : `shader refused — ${r.reason}`);
      return reply('video.shader.applied', r);
    }
    case 'video.params': {
      if (!video) return reply('video.params', { ok: false, reason: 'no picture running' });
      // The page's names on the left, the renderer's uniforms on the right — a
      // client should not have to know that `grain` is a noise frequency.
      const MAP = { mirrors: ['seg', 2, 64], grain: ['scale', 0.5, 40], hue: ['hue', 0, 3] };
      let n = 0;
      for (const [name, [key, lo, hi]] of Object.entries(MAP)) {
        if (!Number.isFinite(msg[name])) continue;
        n += video.set(key, Math.max(lo, Math.min(hi, msg[name]))) ? 1 : 0;
      }
      const p = video.params();
      log(`video params: ${p.seg} mirrors · grain ${p.scale} · hue ${p.hue}`);
      // ⚠️ REPORTED AS SENT, NOT AS APPLIED. The control channel is one-way —
      // the renderer has no way to answer — so this is what went down the pipe.
      return reply('video.params', { ok: n > 0, sent: n, mirrors: p.seg, grain: p.scale, hue: p.hue });
    }
    // ⚠️ A VIEWER SAYING IT IS WATCHING. Cheap on purpose: no reply, so a room
    // of viewers costs the relay one message each per ten seconds and nothing
    // comes back. Without this the box cannot tell a watched picture from an
    // abandoned one — see `watchVideoViewers`.
    case 'video.watching':
      lastWatchAt = Date.now();
      return true;
    case 'video.stop': {
      if (!video) return reply('video.stopped', { ok: true, was: null });
      const st = video.stats();
      video.stop(); video = null;
      stopVideoWatch();
      try { vws?.close(); } catch { /* already */ }
      vws = null;
      log(`video stopped after ${st.frames} frames`);
      return reply('video.stopped', { ok: true, ...st });
    }
    case 'video.status':
      return reply('video.started', video
        ? { ok: true, room: VIDEO_ROOM, ...videoShape() }
        : { ok: false, reason: 'no picture running', available: videoAvailable(), renderer: V3DPIPE });

    // ⚠️ `insertState()` RATHER THAN `fx:` ALONE, AND IT WAS THE THIRD PLACE
    // THIS LINE IS WRITTEN. Two pages share this board and neither could see
    // the other change the insert; a page that asks what is playing is asking
    // the question the answer belongs to, so it gets the holder and the ages
    // here as well as in `fx.pappus` and the heartbeat.
    case 'audio.status':
      return reply('audio.started', inst ? { ok: true, source: inst.source, jack: !!inst.jack, ...insertState(),
                                            soundfont: inst.soundfont ?? null }
        : stopSynth ? { ok: true, source: 'synth', ...insertState() }
        : audio ? { ok: true, source: 'capture', ...insertState() }
        : { ok: false, reason: 'nothing playing', ...insertState() });
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
    // ⚠️ `audioChannels` is NOT `channels` three lines down — that one is MIDI
    // channels (16, multitimbral). The board captures `arecord -c 1`, so it says
    // ONE, and `demo/rack`'s Mac says two: both counts are on the relay at once
    // and no page is left inferring which it is holding.
    send({ type: 'box.hello', name: NAME, backend: s.backend, ports: s.ports.length, dry: DRY, since,
           audioChannels: 1, frameMs: 1000 * FRAME / RATE,
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
    // ⚠️ EVERY MESSAGE, NOT JUST THE ONES WITH A HANDLER. This is the only
    // evidence the box has that a client is still at the other end, and a page
    // that is merely LISTENING still polls. Dating it here rather than inside
    // `handle()` means a verb nobody implements still proves somebody is there.
    if (typeof msg.from === 'string') {
      clientSeen.set(msg.from, Date.now());
      // Bounded, so a long-lived box does not accumulate every tab that ever
      // visited. Anything this old cannot hold an insert anyway.
      if (clientSeen.size > 64) {
        const cut = Date.now() - INSERT_HELD_MS;
        for (const [k, t] of clientSeen) if (t < cut) clientSeen.delete(k);
      }
    }
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
// ⚠️ AND IT CARRIES THE INSERT NOW. Two pages share this board and neither
// could see the other change it; a heartbeat that already says what is playing
// is the cheapest place to say who the granulator belongs to, because a page
// learns about a change it did not make without asking for anything.
// ⚠️ ONE SHAPE, ONE PLACE. `sweepInsert()` sends this too, the moment it drops
// an insert, so a page does not wait up to five seconds to be told. Two copies
// of this object is how a field ends up on one of them.
function alive() {
  return { type: 'box.alive', name: NAME, upSec: Math.round((Date.now() - since) / 1000),
           audio: inst ? inst.source : stopSynth ? 'synth' : audio ? 'capture' : null,
           voices: synth?.voices ?? 0, frames: sentFrames, ...insertState() };
}
setInterval(() => {
  // 🔴 SWEEP BEFORE THE BEAT, NOT AFTER IT. `sweepInsert` is async and sends
  // its own beat when it drops something, so ordering it first means the room
  // never gets a heartbeat announcing an insert the board has already decided
  // is orphaned. It returns immediately when there is nothing to do, which is
  // every beat but one.
  // ⚠️ `.catch` IS NOT DECORATION HERE. This one is not awaited, so a throw out
  // of `pappusFx` would be an UNHANDLED rejection on a timer, and an unhandled
  // rejection takes the whole service down. Same reason `handle()` is wrapped.
  sweepInsert('the page that asked for it stopped talking')
    .catch((e) => log('the insert sweep threw:', e.message));
  send(alive());
}, 5000).unref?.();

// The control plane's own report, once a second and ONLY while something is
// moving. A page can hear the filter and cannot see what the board wrote, so
// `in` against `out` is the only place a fold is visible from the outside, and
// a report on a silent plane is a message a second spent saying nothing.
let ctlSaid = { in: 0, out: 0 };
setInterval(() => {
  if (ctl.in === ctlSaid.in && ctl.out === ctlSaid.out) return;
  ctlSaid = { in: ctl.in, out: ctl.out };
  send({ type: 'ctl.meter', ...ctlMeter() });
}, 1000).unref?.();

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
  // ⚠️ `csound` IS IN THIS LIST BECAUSE THE REVERB INSERT IS ONE. Without it an
  // orphaned engine survives a service restart still holding `positron-space`'s
  // JACK ports, so the next insert finds the names taken and patches into a
  // process nobody is talking to — audible, uncontrollable, and indisting-
  // uishable from the new one having failed.
  for (const name of ['fluidsynth', 'jack-dssi-host', 'yoshimi', 'sclang', 'scsynth', 'csound', 'ffmpeg', 'jackd']) {
    try { execFileSync('pkill', ['-9', '-x', name], { stdio: 'pipe' }); log(`swept a stray ${name}`); }
    catch { /* nothing of that name, which is the normal case */ }
  }
}
if (backend() === 'alsa') sweepOrphans();
// ⚠️ AND THE VIDEO ENCODER, WHICH `sweepOrphans` CANNOT SAFELY REACH LATER.
// It runs `pkill -9 -x ffmpeg`, which at startup is fine because nothing is
// running — but the box's own audio capture is also an ffmpeg, so the same
// sweep during operation would silence the instrument. The video encoder is
// told apart by reading raw frames on stdin. An orphan here holds an exclusive
// device and makes the picture permanently unavailable.
sweepStrayEncoders((l) => log('video:', l));

for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { stopAudio(); try { ws?.close(); } catch {} process.exit(0); });
connect();
