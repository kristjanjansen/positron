// rig/box/jacksynth.mjs — instruments that are JACK clients.
//
// FluidSynth is easy: its `file` driver writes realtime-paced PCM to a FIFO and
// the box reads it. hexter and Yoshimi cannot do that — they are JACK clients —
// so this module builds the chain the container proved out:
//
//   jackd -d dummy          a clock, no hardware
//     -> the synth          hexter (via jack-dssi-host) or yoshimi
//     -> ffmpeg -f jack     capture, raw s16 on stdout, straight into the box
//
// MIDI IN is the other half, and it uses something setup.sh already loads.
// snd-virmidi gives four virtual ports that are BOTH an ALSA sequencer client
// and a raw character device: writing three bytes to /dev/snd/midiC<n>D0 emits
// them on sequencer port <client>:0, which `aconnect` then routes to the synth.
// So the box plays a JACK synth by writing raw MIDI bytes to a file.
import { spawn, execFileSync, execSync } from 'node:child_process';
import { createSocket } from 'node:dgram';
import { openSync, writeSync, closeSync, existsSync, mkdirSync, readFileSync } from 'node:fs';

export const RATE = 48000, FRAME = 960;

/**
 * A minimal OSC encoder. sclang listens on 57120 and run-pappus.scd installs an
 * OSCdef at /pappus/cmd, so this is the whole control channel for an engine
 * with 106 parameters — no library needed.
 *
 * OSC is: address, then a typetag string beginning with a comma, then the
 * arguments — every part null-terminated and padded to a multiple of four.
 */
function oscPad(buf) {
  const pad = 4 - (buf.length % 4 || 4);
  return pad === 4 ? buf : Buffer.concat([buf, Buffer.alloc(pad)]);
}
function oscStr(str) { return oscPad(Buffer.concat([Buffer.from(str, 'ascii'), Buffer.alloc(1)])); }
export function oscMessage(address, args = []) {
  const tags = ',' + args.map((a) => (typeof a === 'string' ? 's' : Number.isInteger(a) ? 'i' : 'f')).join('');
  const parts = [oscStr(address), oscStr(tags)];
  for (const a of args) {
    if (typeof a === 'string') { parts.push(oscStr(a)); continue; }
    const b = Buffer.alloc(4);
    if (Number.isInteger(a)) b.writeInt32BE(a); else b.writeFloatBE(a);
    parts.push(b);
  }
  return Buffer.concat(parts);
}


const sh = (cmd) => { try { return execSync(cmd, { encoding: 'utf8', stdio: ['ignore','pipe','pipe'] }); } catch { return ''; } };
const have = (bin) => { try { execFileSync('which', [bin], { stdio: 'pipe' }); return true; } catch { return false; } };

/** The instruments this module knows how to raise. */
export const JACK_SYNTHS = {
  hexter: {
    needs: ['jack-dssi-host', 'jackd', 'ffmpeg'],
    // -n: no plugin GUIs. Without it the host tries to start an X client.
    spawn: () => spawn('jack-dssi-host', ['-n', 'hexter.so'],
      { env: { ...process.env, DSSI_PATH: '/usr/lib/dssi' }, stdio: ['ignore','pipe','pipe'] }),
    portMatch: /hexter/i,
    alsaMatch: /hexter/i,
    // The DX7 factory cartridges, shipped in Debian main: ROM1A/1B/2A/2B.
    // Program 10 is ROM1A voice 11 — E.PIANO 1.
    after: (osc) => osc && [['-C', 'load', '/usr/share/hexter/dx7_roms.dx7'], ['-p', '0', '10']],
    osc: true,
  },
  // ⚠️ The two INSERTS — pappus and space — are deliberately not keys here.
  // Everything in this table is offered to clients as an instrument. They live
  // further down, by the code that raises them: `pappusFx()` and `spaceFx()`.
  //
  // ⚠️ Pappus is NOT an instrument and is not in this table any more. It
  // granulates its INPUT, so as an instrument it faithfully processed silence,
  // and shipping it beside hexter and yoshimi made it look like a third sound
  // source that happened to be identical to the second. It is an EFFECT — see
  // pappusFx() below, which inserts it between whatever is playing and the
  // capture, and can be switched on and off under a running instrument.
  _pappus_removed: {
    needs: ['sclang', 'jackd', 'ffmpeg', 'jack-dssi-host'],
    spawn: () => {
      // ⚠️ The unit sets PrivateTmp=true, so the service has its OWN /tmp. A
      // runtime dir created from an ssh session is not the one this process
      // sees, and Qt fails on a missing XDG_RUNTIME_DIR. Make it here.
      const rt = '/tmp/rt';
      try { mkdirSync(rt, { recursive: true, mode: 0o700 }); } catch { /* already there */ }
      return spawn('sclang', ['/opt/positron-box/rig/box/norns/run-pappus.scd'], {
        env: { ...process.env, XDG_RUNTIME_DIR: rt,
               QT_QPA_PLATFORM: 'offscreen', QTWEBENGINE_DISABLE_SANDBOX: '1' },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    },
    portMatch: /^SuperCollider:out_1/,
    alsaMatch: /hexter/i,          // notes go to the synth FEEDING it
    feeder: 'hexter',              // raised first, then patched into its inputs
    warmup: 30000,                 // sclang compiles a 2,030-line class library
    oscCmd: true,                  // driven by parameters, not by notes
    osc: false,
  },
  // FluidSynth again, but as a JACK CLIENT rather than writing to a FIFO.
  // The FIFO path is cheaper — one process, no jackd — and is what plays
  // normally. This variant exists so the sampler can be wrapped by an insert:
  // an effect can only reach what is on the JACK graph, and the FIFO never is.
  // The box swaps between the two transparently when the effect is toggled.
  /**
   * FluidSynth ON JACK, and this is now what `fluidsynth` means.
   *
   * It used to write realtime PCM to a FIFO — one process, no jackd — and that
   * was kept for efficiency. MEASURED on the board, same binary, same
   * soundfont, same note: the pipe costs 12.8% of 400 against JACK's 12.3%, and
   * 84 ms to the ear against 74 ms. The efficiency argument was not a CPU
   * argument and JACK is the FASTER of the two; the FIFO's buffering costs more
   * than jackd's period does.
   *
   * What it buys is the whole reason to move: the granular insert is a JACK
   * insert, so on a pipe the 128 General MIDI instruments and the drum bank
   * could not be granulated at all. The pipe path is still here as `fluidpipe`,
   * because it is what let the whole of rig/box run in a container with no
   * sound hardware in existence — a claim that would need re-testing before
   * anything removed it.
   */
  fluidsynth: {
    needs: ['fluidsynth', 'jackd', 'ffmpeg'],
    // ⚠️ `-s` (SERVER), OR IT LOADS THE SOUNDFONT AND EXITS 0. `-i` means "do
    // not read commands from stdin", and without a shell to sit in and no MIDI
    // file to play, fluidsynth has nothing left to do and quits — registering
    // no JACK port, which is what the caller sees and is three steps from the
    // cause. Measured on the board: with `-s` it registers fluidsynth:left and
    // fluidsynth:right in under five seconds. The pipe path avoids this a
    // different way, by keeping its shell open on stdin, which is also how it
    // receives notes.
    spawn: (opt = {}) => spawn('fluidsynth', [
      '-a', 'jack', '-m', 'alsa_seq', '-i', '-s',
      '-o', 'audio.jack.id=fluidsynth',
      '-o', 'audio.jack.autoconnect=0',
      '-o', 'synth.lock-memory=0',
      '-o', `synth.sample-rate=${RATE}`,
      '-o', 'synth.gain=0.6',
      opt.soundfont || '/usr/share/sounds/sf2/FluidR3_GM.sf2',
    ], { stdio: ['ignore', 'pipe', 'pipe'] }),
    portMatch: /^fluidsynth:left/i,
    portMatch2: /^fluidsynth:right/i,
    alsaMatch: /fluid/i,
    osc: false,
  },
  yoshimi: {
    needs: ['yoshimi', 'jackd', 'ffmpeg'],
    // -i no GUI, -a ALSA MIDI (so virmidi can reach it), -J JACK audio
    spawn: () => spawn('yoshimi', ['-i', '-a', '-J', '-b=256'], { stdio: ['ignore','pipe','pipe'] }),
    portMatch: /^yoshimi:left/i,
    portMatch2: /^yoshimi:right/i,
    // It appears on the graph well before it has read 911 instruments off the
    // disk, so this is waited AFTER the port is there rather than instead of it.
    settle: 6000,
    alsaMatch: /yoshimi/i,
    osc: false,
  },

  /**
   * 1965, AS A SOURCE RATHER THAN AS A FEATURE OF THE GRANULATOR.
   *
   * It sits beside the synths because that is what it is: something that makes
   * sound into the JACK graph. Pappus is an INSERT over whatever is playing, so
   * with pappus off you hear the broadcast raw, and with pappus on you hear it
   * granulated — and neither case needs a line of its own anywhere downstream.
   * That is the whole reason to do it this way instead of as a second kind of
   * thing.
   *
   * ⚠️ TWO PROCESSES, BECAUSE FFMPEG HAS NO JACK MUXER. `ffmpeg -devices` lists
   * jack as `D` — a demuxer only — so it can READ the graph (that is how the
   * capture works) and cannot write to it. The way across is the loopback card
   * `snd-aloop`, which `setup.sh` already loads for exactly this class of
   * problem: ffmpeg plays into its playback side, `alsa_in` reads its capture
   * side and registers an ordinary JACK client.
   *
   * The cost is one resampling between two unsynchronised clocks, inside
   * `alsa_in`. A granulator could not care less; for raw playback it is a
   * correction every few minutes, and the honest alternative — a player with a
   * native JACK output — is not installed on this board (no mpv, no sox).
   *
   * ⚠️ `-re` IS A PER-INPUT OPTION and there is one input, so it belongs where
   * it is. Without it ffmpeg pulls the whole broadcast as fast as the network
   * allows and the loopback card's buffer is the only thing pacing it.
   */
  archive: {
    needs: ['jackd', 'ffmpeg', 'alsa_in'],
    // ffmpeg has to open the network stream, and alsa_in has to see a running
    // playback side before it reports a sane rate. Four seconds covers both on
    // this board; the port check below is what actually decides.
    warmup: 5000,
    portMatch: /^err1965:capture_1$/,
    portMatch2: /^err1965:capture_2$/,
    spawnAll: ({ hls, atSec = 0 } = {}) => [
      // ⚠️ `-stream_loop -1`, BECAUSE A BROADCAST ENDS. Measured: the source
      // went silent about six minutes in and everything downstream looked
      // healthy — ffmpeg had simply reached the end of a fifteen-minute sports
      // diary and exited normally. `alsa_in` keeps its JACK port either way, so
      // the graph still had `err1965:capture_1` on it, streaming silence. The
      // box is an OBJECT rather than a SESSION (plan-hardware §8.7): it is
      // supposed to still be playing at three in the morning.
      spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error',
                       '-stream_loop', '-1',
                       '-re', '-ss', String(atSec), '-i', String(hls),
                       '-ac', '2', '-ar', String(RATE),
                       '-f', 'alsa', 'plughw:Loopback,0'],
            { stdio: ['ignore', 'pipe', 'pipe'] }),
      // `-j` names the JACK client, which is what portMatch above looks for.
      // Device 1 is the other end of device 0 on snd-aloop: what is written to
      // one is readable on the other.
      spawn('alsa_in', ['-j', 'err1965', '-d', 'plughw:Loopback,1',
                        '-r', String(RATE), '-c', '2'],
            { stdio: ['ignore', 'pipe', 'pipe'] }),
    ],
  },
};

/**
 * Pappus as an INSERT, not an instrument.
 *
 * Off:  instrument -> posbox (the capture)
 * On:   instrument -> SuperCollider:in_1 ... SuperCollider:out_1 -> posbox
 *
 * The engine keeps running while it is bypassed, because it takes half a
 * minute to compile a 2,030-line class library and nobody wants that between
 * two presses of a button. Bypassing is a re-patch, which is instant.
 */
let pappusProc = null;
/**
 * ⚠️ A JACK PORT IS NOT A READY ENGINE, AND THE GAP IS SEVEN SECONDS.
 *
 * `SuperCollider:out_1` appears as soon as scsynth boots; the 2,030-line engine
 * class is compiled and its 106 commands registered several seconds LATER, and
 * sclang answers an unknown command with nothing at all. So waiting on the port
 * returned ok while every command sent afterwards fell into a void — measured
 * from the board's own log: `pappus inserted` at 05:38:59.8, a minute of 1965
 * loaded at 05:39:03.5, and `PAPPUS READY` only at 05:39:06.0. The load, the
 * buffer lock and the gates were all sent 2.6 s before anything could receive
 * them, with no error anywhere, and the page said the material was loaded.
 *
 * The engine prints `PAPPUS READY` when it means it. That is the signal.
 */
let pappusReady = false;

export function pappusAvailable() {
  return ['sclang', 'jackd'].every(have) && existsSync('/opt/positron-box/rig/box/norns/run-pappus.scd');
}

export async function pappusFx(on, { instrumentPort, onLog } = {}) {
  const CAP = 'posbox:input_1', SCIN = 'SuperCollider:in_1', SCOUT = 'SuperCollider:out_1';
  if (!on) {
    if (instrumentPort) {
      sh(`jack_disconnect "${instrumentPort}" ${SCIN} 2>/dev/null`);
      sh(`jack_disconnect ${SCOUT} ${CAP} 2>/dev/null`);
      sh(`jack_connect "${instrumentPort}" ${CAP} 2>/dev/null`);
    }
    onLog?.('pappus bypassed');
    return { ok: true, on: false };
  }
  if (!pappusAvailable()) return { ok: false, reason: 'supercollider or the engine is not installed' };

  if (!sh('jack_lsp 2>/dev/null').includes('SuperCollider')) {
    const rt = '/tmp/rt';
    try { mkdirSync(rt, { recursive: true, mode: 0o700 }); } catch { /* there already */ }
    pappusProc = spawn('sclang', ['/opt/positron-box/rig/box/norns/run-pappus.scd'], {
      env: { ...process.env, XDG_RUNTIME_DIR: rt, QT_QPA_PLATFORM: 'offscreen', QTWEBENGINE_DISABLE_SANDBOX: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    pappusReady = false;
    pappusProc.stdout?.on('data', (d) => {
      for (const l of String(d).split('\n')) {
        const t = l.trim();
        if (!t || /^(sc3>|->)/.test(t)) continue;
        // Guard on the exact line the engine prints, not on a substring of it.
        if (/^PAPPUS READY\b/.test(t)) pappusReady = true;
        onLog?.(t);
      }
    });
    pappusProc.stderr?.on('data', (d) => onLog?.(String(d).trim()));
    let up = false;
    for (let i = 0; i < 80 && !up; i++) { await wait(500); up = sh('jack_lsp 2>/dev/null').includes('SuperCollider:out_1'); }
    if (!up) { pappusProc?.kill(); pappusProc = null; return { ok: false, reason: 'the pappus engine did not come up' }; }
    // ...and now wait for the engine itself. 60 s: a Pi 4 takes about seven
    // from the port appearing, and the cost of waiting too long is a slow
    // switch while the cost of not waiting is a silent one.
    for (let i = 0; i < 120 && !pappusReady; i++) await wait(500);
    if (!pappusReady) { stopPappus(); return { ok: false, reason: 'the engine came up but never reported READY' }; }
  } else {
    // Somebody else's sclang, or one this process started before a restart:
    // its stdout is not ours to read, and it has been up long enough to have
    // finished compiling. Treat that as ready rather than waiting forever for
    // a line that will never arrive on this pipe.
    pappusReady = true;
  }

  // Insert it: the instrument stops feeding the capture directly and feeds
  // Pappus instead, and Pappus feeds the capture.
  if (instrumentPort) {
    sh(`jack_disconnect "${instrumentPort}" ${CAP} 2>/dev/null`);
    sh(`jack_connect "${instrumentPort}" ${SCIN} 2>/dev/null`);
  }
  sh(`jack_connect ${SCOUT} ${CAP} 2>/dev/null`);
  onLog?.(instrumentPort ? 'pappus inserted' : 'pappus running, nothing feeding it');
  return { ok: true, on: true, fed: !!instrumentPort, ready: pappusReady };
}

export function pappusOsc(cmdName, ...args) {
  const m = oscMessage('/pappus/cmd', [cmdName, ...args]);
  const u = createSocket('udp4');
  u.send(m, 0, m.length, 57120, '127.0.0.1', () => u.close());
  return true;
}


/**
 * The granular roll and the drift moved to `pappus.mjs` — one implementation,
 * seeded, in named characters, and with four mode ranges corrected against the
 * engine. The version that lived here rolled `scanmode`, `spraymode` and
 * `swarmmode` 0..2 where the engine indexes `mode - 1` over four-element
 * arrays, so mode 4 was unreachable on all three; `contour` 1..8 of 17; and its
 * chord selector was always-true, so the major chord was dead code.
 *
 * `pappusOsc` below stays: it is the panic path, which has nothing to do with
 * rolling anything.
 */

/**
 * Silence the insert as well as the instrument.
 *
 * A MIDI all-notes-off reaches the synth and nothing else — but Pappus holds a
 * ring buffer of captured audio, eight delay taps and a reverb tail, all of
 * which keep sounding after every note has stopped. `bufclear` and `delayclear`
 * are its own commands for exactly this.
 */
export function pappusPanic() {
  pappusOsc('bufclear', 1);
  pappusOsc('delayclear', 1);
  // The reverb has no clear, so collapse its time and let it fall silent, then
  // restore it — dropping `amp` instead would mute the instrument as well.
  pappusOsc('rtime', 0.2);
  setTimeout(() => pappusOsc('rtime', 2.5), 900);
  return true;
}

export function stopPappus() {
  pappusReady = false;
  if (pappusProc) { try { pappusProc.kill('SIGTERM'); } catch { /* gone */ } pappusProc = null; }
  sh('pkill -9 -x scsynth 2>/dev/null'); sh('pkill -9 -x sclang 2>/dev/null');
}

export function jackSynthAvailable(name) {
  const d = JACK_SYNTHS[name];
  return !!d && d.needs.every(have);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────────────────────
// SPACE — a reverb, as an insert. The opposite kind of insert to pappus.
//
// Pappus REPLACES the signal with a grain cloud, and a cloud has no note-off,
// so every instrument's envelope died inside it. This one PASSES the dry signal
// and adds a tail: let go of the key and the note still stops.
//
//   off:  instrument -> posbox (the capture)
//   on:   instrument -> positron-space:in_1/in_2 ... out_1/out_2 -> posbox
//
// It is Csound, and it is NOT a key in JACK_SYNTHS above — for the same reason
// `_pappus_removed` is not: everything in that table is offered to clients as
// an instrument (box.mjs puts `Object.keys(JACK_SYNTHS)` straight into
// `box.hello`), and an effect listed beside hexter and yoshimi reads as a third
// sound source. The descriptor below carries the same fields that table uses so
// it reads the same, and lives here with the code that raises it.
// ─────────────────────────────────────────────────────────────────────────────

const SPACE = {
  needs: ['csound', 'jackd'],
  client: 'positron-space',
  // Beside this module, not an /opt path typed out again: the service runs from
  // /opt/positron-box/rig/box and a checkout runs from anywhere, and the
  // orchestra is always the one next to the code that spawns it.
  csd: new URL('./csd/space.csd', import.meta.url).pathname,
  portMatch: /^positron-space:out_1$/,
  portMatch2: /^positron-space:out_2$/,
  inMatch: /^positron-space:in_1$/,
  // ⚠️ NOT pappus's 30000. sclang compiles a 2,030-line class library; Csound
  // compiles this orchestra in 5 ms and had all four JACK ports registered
  // 222 ms after spawn, with the performance loop answering 381 ms after spawn
  // (measured on the board, three runs). This is a CEILING for the port poll,
  // not a sleep — twenty times the measurement, so a cold board still fits.
  warmup: 8000,
  // ⚠️ NOT OSC, unlike pappus, and the difference is a dependency. `OSClisten`
  // needs Csound's liblo plugin; `--port=N` is in the core binary, takes
  // `@<channel> <value>` in one datagram with no compilation, and is therefore
  // the cheapest thing to drive from node — see spaceSend().
  oscCmd: false,
};

/** What a client may ask for, and the far end of every clamp. */
export const SPACE_RANGE = { mix: [0, 1], room: [0, 1], damp: [1000, 12000], chorus: [0, 1] };

let spaceProc = null;          // the csound we started, and whose stdout we read
let spacePort = 0;             // its UDP control port
let spaceUdp = null;
let spaceOn = false;           // patched into the capture, rather than merely running
let spaceNonce = 0;
let spaceHeard = null;         // the last audio measurement, kept so a reply can quote it
let spaceFed = null;           // the instrument ports it is wrapping, for the death path
let spaceStopping = false;     // so an orderly teardown is not reported as a death
const spaceWaiters = new Map();
const spaceSaid = new Map();   // how often the engine has said each thing, for the throttle
// Defaults that match the orchestra's own init block, so the first reply and
// the first k-cycle cannot disagree about what is set.
const spaceParams = { mix: 0.35, room: 0.5, damp: 5000, chorus: 0 };

export function spaceAvailable() { return SPACE.needs.every(have) && existsSync(SPACE.csd); }

/**
 * Every JACK connection, parsed once.
 *
 * `jack_lsp -c <name>` takes its argument as a SUBSTRING over every port, so
 * asking about one port can print several and "is a connected to b" gets the
 * wrong answer from the wrong block. The whole graph is one exec and is not
 * ambiguous: a flush-left line is a port, an indented line is one of its
 * connections.
 */
function jackLinks() {
  const map = new Map();
  let cur = null;
  for (const raw of sh('jack_lsp -c 2>/dev/null').split('\n')) {
    if (!raw.trim()) continue;
    if (/^\s/.test(raw)) { if (cur) map.get(cur).push(raw.trim()); }
    else { cur = raw.trim(); if (!map.has(cur)) map.set(cur, []); }
  }
  return map;
}
const jackLinked = (a, b, links = jackLinks()) => (links.get(a) || []).includes(b);

/**
 * Patch, then CHECK. `jack_connect` failing is invisible from here — it writes
 * its complaint to stderr and exits non-zero, `execSync` throws, and sh()
 * returns an empty string that reads exactly like success. That is how the
 * first run of this probe measured silence through a working reverb and
 * reported "connected": the ports are `out_1`/`in_1` only because the orchestra
 * asks for the trailing underscore, and Csound's default naming is `out1`.
 */
function jackPatch(a, b, onLog) {
  if (!a || !b) return false;
  sh(`jack_connect "${a}" "${b}" 2>&1`);
  const ok = jackLinked(a, b);
  if (!ok) onLog?.(`could not patch ${a} -> ${b}`);
  return ok;
}

/**
 * Several links, then ONE look at the graph.
 *
 * ⚠️ AN EXEC IS NOT FREE ON THIS BOARD. `jack_lsp -c` connects to the server,
 * enumerates every port and exits, and under a loaded Pi that is 150-200 ms.
 * Checking each link as it was made put two and a half seconds into switching
 * the insert on — more than the engine, the probe and the measurement
 * together. Make them all, look once, and report the ones that did not take.
 */
function jackPatchAll(pairs, onLog, drop = []) {
  const real = pairs.filter(([a, b]) => a && b);
  // ⚠️ ONE SHELL FOR ALL OF IT. Measured on the board: `jack_connect` costs
  // 43 ms and `jack_lsp -c` 118 ms — each of them opens a JACK client of its
  // own — so a re-patch made one call at a time cost 750 ms of a switch that
  // has to feel like a switch. The disconnects are not asked about first:
  // dropping a link that is not there fails harmlessly and asking costs more
  // than doing.
  const cmds = [
    ...drop.filter(([a, b]) => a && b).map(([a, b]) => `jack_disconnect "${a}" "${b}" 2>/dev/null`),
    ...real.map(([a, b]) => `jack_connect "${a}" "${b}" 2>/dev/null`),
    'true',
  ];
  sh(cmds.join('; '));
  const links = jackLinks();
  const missed = real.filter(([a, b]) => !jackLinked(a, b, links));
  for (const [a, b] of missed) onLog?.(`could not patch ${a} -> ${b}`);
  return { ok: missed.length === 0, missed };
}

/**
 * One line to the running engine, over Csound's own UDP server.
 *
 * ⚠️ WHY THIS ROUTE. Three were available and this is the cheapest to drive
 * from node. `--port=N` is in the core binary (no plugin, no liblo, no npm),
 * and one datagram of `@<channel> <value>` sets a named channel that `chnget`
 * reads on the next k-cycle — 750 of those a second here, so a knob lands
 * within 1.3 ms of arrival and costs NOTHING on the graph. Measured on the
 * board, all three work on Csound 6.18: `@mix 0.42` set the channel, `$i2 0
 * 0.1` fired an instrument, and bare orchestra text (`chnset 0.77, "mix"`) also
 * worked but recompiles a line of orchestra per knob turn. OSC (`OSClisten`)
 * needs the liblo plugin, which is a package this box does not have to have.
 * A re-patch — pappus's route for anything structural — costs a gap in the
 * sound, which is exactly what this insert exists to avoid.
 */
function spaceSend(line) {
  if (!spaceUdp || !spacePort) return false;
  const b = Buffer.from(line);
  spaceUdp.send(b, 0, b.length, spacePort, '127.0.0.1');
  return true;
}

/**
 * 🔴 PROOF THAT A KNOB REACHED A RUNNING ENGINE.
 *
 * A datagram that has been SENT is not a datagram that has been HEARD, and a
 * UDP server that is listening is not an orchestra that is performing. So the
 * box writes a fresh number to the `echo` channel and waits for the engine's
 * own performance loop to print it back (`printf` under `changed`, in
 * space.csd's instr 1). The number comes off csound's stdout — the far side of
 * the wire — so nothing here can fake it.
 *
 * A FRESH number every time, because `changed` fires on a change: re-sending
 * the same value proves nothing and would hang.
 */
function spaceConfirm(ms = 400) {
  if (!spaceUdp || !spaceProc) return Promise.resolve(false);
  const n = ++spaceNonce;
  const got = new Promise((res) => {
    spaceWaiters.set(n, res);
    setTimeout(() => { if (spaceWaiters.delete(n)) res(false); }, ms).unref?.();
  });
  spaceSend(`@echo ${n}`);
  return got;
}

/** Clamp at the far end — video.mjs's `set()`, with this engine's ranges. */
export function spaceClamp(patch = {}) {
  const out = {};
  for (const [k, [lo, hi]] of Object.entries(SPACE_RANGE)) {
    if (!Number.isFinite(patch[k])) continue;
    out[k] = Math.max(lo, Math.min(hi, patch[k]));
  }
  return out;
}

/**
 * Set any of mix/room/damp/chorus on the RUNNING engine, and prove it landed.
 *
 * No re-patch, no restart, no gap in the sound: four datagrams and a nonce.
 * `ok` here means the engine answered AFTER the values went out, not that a
 * socket accepted them.
 */
export async function spaceSet(patch = {}, { onLog } = {}) {
  const wanted = spaceClamp(patch);
  const named = Object.keys(wanted);     // which of the four the caller actually asked for
  if (!spaceProc) {
    Object.assign(spaceParams, wanted);        // remembered for the next start
    return { ok: false, reason: 'the reverb is not running — nothing to set it on', params: { ...spaceParams }, named };
  }
  Object.assign(spaceParams, wanted);
  for (const k of Object.keys(SPACE_RANGE)) spaceSend(`@${k} ${spaceParams[k]}`);
  // One retry: a lost datagram on loopback is rare and a lost ANSWER is not
  // worth reporting a working engine as broken over.
  const heard = (await spaceConfirm()) || (await spaceConfirm(600));
  if (!heard) onLog?.('space: the engine did not answer after a parameter change');
  return { ok: heard, params: { ...spaceParams }, named, confirmed: heard,
           ...(heard ? {} : { reason: 'the values were sent and the engine did not answer' }) };
}

/**
 * 🔴 PROOF THAT AUDIO IS PASSING, which is the whole point of this function.
 *
 * `fx.pappus` answered ok when a JACK PORT APPEARED — about seven seconds
 * before its engine could be heard — and everything sent in that gap vanished
 * with no error anywhere. A port is a registration; it says nothing about
 * whether the process callback is running or whether anything comes out.
 *
 * So this pushes a real signal in and listens for it coming out, on the far
 * side of the insert:
 *
 *   jack_metro -> positron-space:in_1 ... positron-space:out_1 -> a private
 *   ffmpeg JACK client, whose s16 bytes are summed here into an RMS.
 *
 * That is the product's own claim — signal in, signal out — rather than a
 * proxy for it. MEASURED on the board: silence baseline rms 0.00000 / peak
 * 0.0000, tone through the insert rms 0.04591 / peak 0.1589. The threshold
 * below sits an order of magnitude under the signal and above the floor.
 *
 * It runs BEFORE the insert is patched into the capture, on a subgraph nobody
 * is listening to, so the probe tone never reaches the stream.
 *
 * Where `jack_metro` is missing it falls back to the orchestra's own burst
 * (instr 2, fired over the control port), which proves the engine is producing
 * sound but NOT that its input reaches its output. The reply says which claim
 * was made; it does not quietly present the weaker one as the stronger.
 */
const SPACE_FLOOR = { rms: 0.005, peak: 0.02 };

async function spaceProbe({ onLog } = {}) {
  // A fresh client name per run. A leftover probe from a crashed one would
  // otherwise take the name, JACK would rename ours, and this would report
  // silence about a working reverb.
  const tag = `spcheck${process.pid}${Math.floor(Math.random() * 1000)}`;
  const t0 = Date.now();
  // ⚠️ BOTH AT ONCE. These two have nothing to do with each other and each
  // takes about half a second to appear on the graph; starting them in
  // sequence put a second on every press of the button, and this whole probe
  // sits between a client's request and its reply.
  const cap = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'jack', '-i', tag,
    '-f', 's16le', '-ar', String(RATE), '-ac', '1', '-'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let tone = have('jack_metro')
    // ⚠️ TEN CLICKS A SECOND, not four. The window below is a fifth of a
    // second, and at four a second how many clicks land inside it is luck —
    // measured, the same working chain read rms 0.028 one run and 0.048 the
    // next, which is a third of the way to a threshold. At ten a second the
    // window always holds two or three and the number stops wobbling.
    // (`-D` must stay under the click period or jack_metro refuses to start:
    // `invalid duration (tone length = 4800, wave length = 4800)`.)
    ? spawn('jack_metro', ['-b', '600', '-D', '40', '-f', '660', '-A', '0.3', '-n', `${tag}tone`], { stdio: ['ignore', 'pipe', 'pipe'] })
    : null;
  const done = (r) => {
    try { cap.kill('SIGKILL'); } catch { /* gone */ }
    if (tone) { try { tone.kill('SIGKILL'); } catch { /* gone */ } }
    return { ...r, ms: Date.now() - t0 };
  };
  let up = false, tonePort = null;
  for (let i = 0; i < 80 && !(up && (tonePort || !tone)); i++) {
    const l = sh('jack_lsp 2>/dev/null').split('\n');
    up = l.some((p) => p === `${tag}:input_1`);
    tonePort = l.find((p) => p.startsWith(`${tag}tone:`)) || null;
    if (!(up && (tonePort || !tone))) await wait(100);
  }
  if (!up) return done({ ok: false, reason: 'the listener could not attach to JACK, so nothing was measured' });
  if (!jackPatch(`${SPACE.client}:out_1`, `${tag}:input_1`, onLog)) {
    return done({ ok: false, reason: 'could not listen to the reverb output, so nothing was measured' });
  }
  // ⚠️ That one IS verified, because a probe that cannot hear reads exactly
  // like an engine that makes no sound. The tone's own connection below is
  // NOT checked first — the measurement checks it far better than jack_lsp
  // does, and the graph is only consulted if nothing arrives, where it turns
  // "no sound" into "the tone never reached the input".

  const listen = (ms) => new Promise((res) => {
    let sum = 0, n = 0, peak = 0;
    const on = (b) => {
      for (let i = 0; i + 1 < b.length; i += 2) {
        const v = b.readInt16LE(i) / 32768;
        sum += v * v; n++;
        if (Math.abs(v) > peak) peak = Math.abs(v);
      }
    };
    cap.stdout.on('data', on);
    setTimeout(() => { cap.stdout.off('data', on); res({ rms: +(n ? Math.sqrt(sum / n) : 0).toFixed(5), peak: +peak.toFixed(4), samples: n }); }, ms);
  });

  const floor = await listen(200);        // what the insert puts out with nothing going in

  let how = 'the orchestra\'s own burst — the input leg is NOT covered by this';
  if (tone && tonePort) {
    sh(`jack_connect "${tonePort}" "${SPACE.client}:in_1" 2>&1`);
    how = 'a tone pushed through in_1 and heard on out_1';
  } else if (tone) { try { tone.kill('SIGKILL'); } catch { /* gone */ } tone = null; }
  if (!tone) spaceSend('$i2 0 0.5');
  await wait(150);
  const heard = await listen(250);

  const ok = heard.rms > SPACE_FLOOR.rms && heard.peak > SPACE_FLOOR.peak && heard.rms > floor.rms;
  // Only when it failed is it worth an exec to find out which leg was missing.
  const why = ok ? null
    : (tone && tonePort && !jackLinked(tonePort, `${SPACE.client}:in_1`))
      ? 'the probe tone never reached in_1, so this says nothing about the engine'
      : `nothing came out of the reverb: rms ${heard.rms} against a floor of ${floor.rms}`;

  // ⚠️ AND CLEAR UP AFTER THE MEASUREMENT, WHICH IS NOT FREE. `reverbsc` is a
  // feedback delay network: the probe tone is still circulating inside it after
  // the tone has gone, and `mix` only decides how much of that reaches the
  // output. Patch the insert in while that is still ringing and the first thing
  // a listener hears is a 660 Hz swell — the measurement arriving on air.
  //
  // So: drop the tail (room 0 shortens it, mix 0 mutes it while it dies), let
  // it die, then put `mix` back and LISTEN AGAIN. The reply carries what that
  // second listen heard, because "the probe left nothing behind" is a claim
  // like any other and belongs with a number rather than with a sleep.
  if (tone) { try { tone.kill('SIGKILL'); } catch { /* gone */ } tone = null; }
  spaceSend('@mix 0'); spaceSend('@room 0');
  await wait(250);
  spaceSend(`@mix ${spaceParams.mix}`); spaceSend(`@room ${spaceParams.room}`);
  let tail = await listen(150);
  if (tail.rms > 0.002) { spaceSend('@mix 0'); await wait(700); spaceSend(`@mix ${spaceParams.mix}`); tail = await listen(250); }
  onLog?.(`space: ${how} — rms ${heard.rms} peak ${heard.peak} against a floor of ${floor.rms}; tail left behind ${tail.rms}`);
  return done({
    ok, how, heard, floor, tail, at: Date.now(),
    ...(ok ? {} : { reason: why }),
  });
}

/** Any csound of OURS still holding the graph — an orphan from a restart. */
function spaceOrphans() {
  return sh('pgrep -x csound 2>/dev/null').split('\n').map((s) => s.trim()).filter(Boolean).filter((pid) => {
    // ⚠️ /proc, not `pkill -f`. `pkill -f csound.*space.csd` matches the very
    // `sh -c` that runs it and kills its own shell — LESSONS' `-x, never -f`
    // in another costume.
    try { return readFileSync(`/proc/${pid}/cmdline`, 'utf8').includes('space.csd'); } catch { return false; }
  });
}

/**
 * Raise the engine, and do not return until it has been heard.
 *
 * ⚠️ AN ORPHAN IS KILLED RATHER THAN ADOPTED. `pappusFx` adopts a running
 * sclang because starting one costs thirty seconds — it pays for that with a
 * branch where nothing can be proved, since the engine's stdout belongs to a
 * process that has gone. Csound is ready in under half a second, so the honest
 * thing is cheaper here: kill what we cannot hear and start something we can.
 */
async function spaceStart({ onLog } = {}) {
  const orphans = spaceOrphans();
  if (orphans.length) {
    onLog?.(`space: killing ${orphans.length} orphaned csound — its answers would not reach this process`);
    for (const pid of orphans) { try { process.kill(+pid, 'SIGKILL'); } catch { /* gone already */ } }
    await wait(400);
  }
  // The JACK server's period decides the floor for -B: rtjack refuses to start
  // with a software buffer under twice it, and refusing looks exactly like a
  // broken orchestra from the outside. Read it rather than repeat it.
  const period = parseInt(sh('jack_bufsize 2>/dev/null').trim(), 10) || 1024;
  const B = Math.max(2048, period * 2);
  // A port nobody else holds. If the pick collides the engine simply never
  // answers the nonce below, which is reported rather than assumed away.
  spacePort = 41000 + Math.floor(Math.random() * 8000);
  const t0 = Date.now();
  spaceStopping = false;
  spaceProc = spawn('csound', [`--port=${spacePort}`, '-B', String(B), SPACE.csd],
    { stdio: ['ignore', 'pipe', 'pipe'] });
  spaceUdp = createSocket('udp4');
  spaceHeard = null;
  const line = (raw) => {
    for (const l of String(raw).split('\n')) {
      // Csound colours its output; the escapes would hide the match.
      const t = l.replace(/\x1b\[[0-9;]*m/g, '').trim();
      if (!t) continue;
      const m = t.match(/^SPACE ECHO (\d+)/);
      if (m) { const w = spaceWaiters.get(+m[1]); if (w) { spaceWaiters.delete(+m[1]); w(true); } continue; }
      // ⚠️ THROTTLED. A loaded board emits `rtjack: xrun` several times a
      // second, and forwarding each one buried every other line in the
      // journal — 400 identical lines in one insert. Say it once, then say
      // how many more there were, which is the number that actually means
      // something.
      if (/error|rtjack|overall samples out of range/i.test(t)) {
        const key = t.replace(/[0-9.]+/g, '#');
        const seen = spaceSaid.get(key) || { n: 0, at: 0 };
        seen.n++;
        if (Date.now() - seen.at > 10000) {
          onLog?.(`csound: ${t}${seen.n > 1 ? ` (${seen.n} of these so far)` : ''}`);
          seen.at = Date.now();
        }
        spaceSaid.set(key, seen);
      }
    }
  };
  spaceProc.stdout?.on('data', line);
  spaceProc.stderr?.on('data', line);
  spaceProc.on('exit', (code, sig) => {
    if (spaceStopping) { spaceProc = null; return; }        // an orderly teardown is not news
    onLog?.(`⚠ the reverb exited (${sig ?? code}) — anything it was wrapping is no longer reaching the stream`);
    spaceProc = null;
    // Put the instrument back on the capture, or the death of an EFFECT is
    // silence rather than a dry signal. jacksynth already learned this shape
    // from `alsa_in`: the graph looks healthy and carries nothing.
    if (spaceOn && spaceFed?.port) {
      jackPatch(spaceFed.port, spaceCapture, onLog);
      if (spaceFed.portR) jackPatch(spaceFed.portR, spaceCapture, onLog);
    }
    spaceOn = false;
  });

  let ports = false;
  while (!ports && Date.now() - t0 < SPACE.warmup) {
    const l = sh('jack_lsp 2>/dev/null').split('\n');
    // Every port that is about to be patched, not just the first one: the
    // right channel and the input arrive in the same breath as the left, and
    // waiting for one of three is waiting for none of them if that changes.
    ports = [SPACE.portMatch, SPACE.portMatch2, SPACE.inMatch].every((re) => l.some((p) => re.test(p)));
    if (!ports) await wait(50);
  }
  if (!ports) { stopSpace(); return { ok: false, reason: `csound registered no JACK port in ${SPACE.warmup} ms` }; }
  const portMs = Date.now() - t0;

  // ...and now wait for the PERFORMANCE, which the port cannot tell you about.
  // A fresh nonce each try, because the first ones land before instr 1 has run
  // a single k-cycle and nothing prints them back: measured, the answer came on
  // the third try, 381 ms after spawn.
  let alive = false;
  while (!alive && Date.now() - t0 < SPACE.warmup) alive = await spaceConfirm(150);
  if (!alive) { stopSpace(); return { ok: false, reason: 'csound came up and its performance loop never answered' }; }
  onLog?.(`space: ports in ${portMs} ms, performing in ${Date.now() - t0} ms`);
  // ⚠️ Csound's rtjack AUTO-CONNECTS its adc to the first physical capture it
  // finds. On the dummy driver that is silence, but on a board with a real
  // soundcard it would mix a microphone into every instrument, which nobody
  // asked for and nobody would look for. Undo it.
  sh(`jack_disconnect system:capture_1 ${SPACE.client}:in_1 2>/dev/null; ` +
     `jack_disconnect system:capture_2 ${SPACE.client}:in_2 2>/dev/null; true`);
  return { ok: true, portMs, readyMs: Date.now() - t0, udp: spacePort };
}

// Where the box listens. A PARAMETER with a default rather than a constant
// spelled into four places: it is what `startJackSynth` raises, and taking it
// as an argument is what lets the insert be exercised end to end — probe tone,
// patch, bypass — against a private listener while the board is on air.
const CAPTURE = 'posbox:input_1';
let spaceCapture = CAPTURE;

/**
 * Put the reverb in, or take it out.
 *
 * `on` is answered `ok: true` only after a real signal has been measured coming
 * out of the engine — see spaceProbe(). `on: false` is answered `ok: true` only
 * after the instrument is verified back on the capture, because the failure
 * that matters when bypassing is silence.
 */
export async function spaceFx(on, { instrumentPort, instrumentPortR, capture = CAPTURE, onLog } = {}) {
  spaceCapture = capture;
  const IN = [`${SPACE.client}:in_1`, `${SPACE.client}:in_2`];
  const OUT = [`${SPACE.client}:out_1`, `${SPACE.client}:out_2`];
  if (!on) {
    const port = instrumentPort ?? spaceFed?.port, portR = instrumentPortR ?? spaceFed?.portR;
    // ⚠️ AND CHECK IT. The failure that matters when bypassing is SILENCE — the
    // instrument taken out of the chain and not put back — so `ok` here means
    // the graph was looked at afterwards.
    const back = jackPatchAll([[port, capture], [portR, capture]], onLog,
      [...OUT.map((o) => [o, capture]), ...IN.flatMap((i) => [[port, i], [portR, i]])]).ok;
    spaceOn = false; spaceFed = null;
    onLog?.('space bypassed');
    // The engine is left RUNNING on purpose — it is 25 MB and a switch back
    // costs nothing, where killing it makes the next press pay the start again.
    return { ok: back, on: false, running: !!spaceProc,
             ...(back ? {} : { reason: 'could not put the instrument back on the capture — check jack_lsp' }) };
  }

  if (!spaceAvailable()) return { ok: false, on: false, reason: 'csound or the orchestra is not installed on this box' };
  if (!sh('jack_lsp 2>/dev/null').trim()) return { ok: false, on: false, reason: 'no JACK server — start an instrument first' };

  const t0 = Date.now();
  const took = { start: 0, probe: 0, patch: 0, set: 0 };
  if (!spaceProc) {
    const r = await spaceStart({ onLog });
    took.start = Date.now() - t0;
    if (!r.ok) return { ...r, on: false };
    spaceHeard = null;
  }

  // The measurement, on a subgraph nothing is listening to. Skipped only when
  // the insert is ALREADY carrying the stream, where firing a probe tone would
  // put it on air.
  const already = jackLinked(OUT[0], capture);
  if (!already) {
    const tP = Date.now();
    const p = await spaceProbe({ onLog });
    took.probe = Date.now() - tP;
    spaceHeard = p;
    if (!p.ok) return { ok: false, on: false, reason: `the reverb is running and nothing came out of it — ${p.reason}`, probe: p };
  }

  // Only now, with the engine proven audible, does anything downstream move.
  // A mono instrument feeds BOTH sides, or half the reverb has nothing to work
  // with and the tail arrives on one side of a stereo field. And both output
  // channels go into the one mono capture input — many ports into one input SUM
  // in JACK, the same reason startJackSynth patches a stereo instrument's right
  // channel in as well.
  const tPatch = Date.now();
  const { ok: patched, missed } = jackPatchAll([
    [instrumentPort, IN[0]],
    [instrumentPort ? (instrumentPortR || instrumentPort) : null, IN[1]],
    [OUT[0], capture], [OUT[1], capture],
  ], onLog, [[instrumentPort, capture], [instrumentPortR, capture]]);
  spaceOn = patched;
  spaceFed = instrumentPort ? { port: instrumentPort, portR: instrumentPortR ?? null } : spaceFed;

  took.patch = Date.now() - tPatch;
  // Restore the parameters the probe muted, and prove they landed.
  const tSet = Date.now();
  const set = await spaceSet({}, { onLog });
  took.set = Date.now() - tSet;
  took.total = Date.now() - t0;
  onLog?.(patched ? `space inserted${instrumentPort ? '' : ', with nothing feeding it'}` : 'space could not be patched in');
  return {
    ok: patched && set.ok, on: patched, fed: !!instrumentPort,
    params: { ...spaceParams },
    // What the claim above is actually made of, so nobody has to take it on
    // trust: how it was proved, and the numbers.
    heard: spaceHeard
      ? { how: spaceHeard.how, rms: spaceHeard.heard?.rms, peak: spaceHeard.heard?.peak,
          floor: spaceHeard.floor?.rms, tail: spaceHeard.tail?.rms, ms: spaceHeard.ms,
          // ⚠️ HOW OLD THE PROOF IS. Re-inserting something already inserted
          // does not re-measure — a probe tone would go out on the stream —
          // so the age is printed rather than letting a minutes-old
          // measurement read as one taken just now.
          agoMs: Date.now() - spaceHeard.at }
      : 'not measured on this call',
    confirmed: set.confirmed ?? false,
    // Where the wait went. A client is held for all of this — `ok` cannot be
    // sent before the sound has been heard — so the breakdown is the thing
    // anyone shortening it would need, and it is measured rather than guessed.
    took,
    // NAME the link that did not take. "check jack_lsp" is a chore handed to
    // somebody in another city; `hexter:out -> positron-space:in_1` is the
    // answer they would have gone and looked up.
    ...(patched && set.ok ? {} : {
      reason: patched ? set.reason
        : `the JACK graph would not take ${missed.map(([a, b]) => `${a} -> ${b}`).join(', ')}`,
    }),
  };
}

/**
 * What the box knows about the reverb, for a status reply.
 *
 * ⚠️ `on` IS READ OFF THE GRAPH, not off a variable. A variable saying "the
 * insert is in" goes stale the moment anything else re-patches: stopping the
 * instrument takes the capture client down with it, and every link into it goes
 * with it — so a remembered `true` would describe a chain that no longer
 * exists. The link either is there or it is not, and asking costs one exec.
 */
export function spaceState() {
  return {
    available: spaceAvailable(), running: !!spaceProc, udp: spacePort || null,
    on: !!spaceProc && jackLinked(`${SPACE.client}:out_1`, spaceCapture),
    params: { ...spaceParams },
    heard: spaceHeard ? { how: spaceHeard.how, rms: spaceHeard.heard?.rms, peak: spaceHeard.heard?.peak,
                          agoMs: Date.now() - spaceHeard.at } : null,
    range: SPACE_RANGE,
  };
}

export function stopSpace() {
  spaceOn = false; spaceFed = null; spaceStopping = true;
  for (const [n, res] of spaceWaiters) { spaceWaiters.delete(n); res(false); }
  if (spaceProc) { try { spaceProc.kill('SIGTERM'); } catch { /* gone */ } spaceProc = null; }
  if (spaceUdp) { try { spaceUdp.close(); } catch { /* already */ } spaceUdp = null; }
  for (const pid of spaceOrphans()) { try { process.kill(+pid, 'SIGKILL'); } catch { /* gone */ } }
}

/** snd-virmidi's raw device, and the sequencer client that mirrors it. */
function findVirmidi() {
  const l = sh('aconnect -l');
  const m = l.match(/client (\d+): 'Virtual Raw MIDI (\d+)-0'/);
  if (!m) return null;
  const dev = `/dev/snd/midiC${m[2]}D0`;
  return existsSync(dev) ? { client: m[1], dev } : null;
}

export async function startJackSynth(name, { onFrame, onLog, ...opts } = {}) {
  const def = JACK_SYNTHS[name];
  if (!def) return { ok: false, reason: `unknown jack synth ${name}` };
  const missing = def.needs.filter((b) => !have(b));
  if (missing.length) return { ok: false, reason: `not installed: ${missing.join(', ')}` };

  const procs = [];
  let stopping = false;               // so an orderly teardown is not reported as a death
  // 1. a clock with no hardware
  // Ask JACK, not the process table. `pgrep -x jackd` reports a server this
  // process may not be able to REACH — a different mount namespace, a different
  // user — and skipping the start on that basis leaves every client unable to
  // connect. jack_lsp answers the question actually being asked.
  // ⚠️ jackd is NOT in `procs`. It is a shared server that outlives any one
  // instrument, and having it in the teardown list meant every instrument
  // switch killed the server the next instrument was about to need — which
  // presented as "registered no JACK port", three processes downstream.
  //
  // And ask JACK, not the process table: `pgrep -x jackd` reports a server this
  // process may not be able to REACH, and skipping the start on that basis
  // leaves every client unable to connect.
  if (!sh('jack_lsp 2>/dev/null').trim()) {
    sh('pkill -9 -x jackd 2>/dev/null');            // a server we cannot reach is worse than none
    await wait(400);
    spawn('jackd', ['-r', '-d', 'dummy', '-r', String(RATE), '-p', '1024'],
      { stdio: 'ignore', detached: true }).unref();
    // Poll rather than sleep a guessed amount: 2.5 s was enough on a warm board
    // and not on a cold one, which is the worst kind of timing constant.
    let up = false;
    for (let i = 0; i < 20 && !up; i++) { await wait(500); up = !!sh('jack_lsp 2>/dev/null').trim(); }
    if (!up) return { ok: false, reason: 'jackd would not start' };
    onLog?.('jackd up');
  }

  // 2. a feeder, for instruments that process rather than generate
  let feeder = null;
  if (def.feeder) {
    const fd = JACK_SYNTHS[def.feeder];
    feeder = fd.spawn();
    procs.push(feeder);
    await wait(6000);
    if (fd.after) {
      const oscPort = sh("ss -ulnp 2>/dev/null | grep jack-dssi-host | grep -oE ':[0-9]+' | tr -d ':' | head -1").trim();
      const url = oscPort && `osc.udp://localhost:${oscPort}/dssi/hexter/chan00`;
      for (const args of (fd.after(url) || [])) { sh(`dssi_osc_send ${args[0]} ${url} ${args.slice(1).join(' ')}`); await wait(300); }
    }
  }

  // 3. the instrument
  //
  // `spawnAll` rather than `spawn` for a source that is more than one process.
  // The archive needs two — ffmpeg decoding into the loopback card, and
  // `alsa_in` bridging that card into JACK — because ffmpeg has NO JACK MUXER
  // (`ffmpeg -devices` lists jack as `D`, a demuxer, only), so the loopback hop
  // is not avoidable. Everything downstream is unchanged: whichever of them
  // registers the JACK port `portMatch` finds is the thing that gets patched,
  // exactly like a synth's output.
  const spawned = def.spawnAll ? def.spawnAll(opts) : [def.spawn(opts)];
  procs.push(...spawned);
  const synth = spawned[spawned.length - 1];
  let log = '';
  // ⚠️ FORWARD STDOUT TOO. sclang reports through `postln`, which is stdout —
  // so "PAPPUS READY" and every engine error were being collected into a
  // variable nobody read, and the box looked like it had started something
  // that silently did nothing.
  // ⚠️ STRIP THE PROMPT, DO NOT MATCH ON IT. Yoshimi's CLI writes `yoshimi> `
  // continuously and PREFIXES its real output with it, so a filter that only
  // dropped `@ Top` left thousands of bare prompts in the journal — and the
  // lines worth having were hiding behind one:
  //     yoshimi> Main Part 1 loaded 0001-DX Rhodes 1
  //     yoshimi> Main Part 1 load FAILED No instrument at 6 in this bank
  // which is Yoshimi saying exactly whether a patch change landed. Peel the
  // prompts off, then drop what is left only if it is empty or a context line.
  const say = (raw) => {
    const t = String(raw).replace(/^(?:yoshimi>\s*)+/, '').trim();
    if (!t || /^@ \w+/.test(t) || /^(sc3>|->)/.test(t)) return;
    onLog?.(t);
  };
  for (const pr of spawned) {
    pr.stdout?.on('data', (d) => { log += d; for (const line of String(d).split('\n')) say(line); });
    pr.stderr?.on('data', (d) => { log += d; for (const line of String(d).split('\n')) say(line); });
    // ⚠️ SAY WHEN ONE OF THEM DIES. A source is more than one process now, and
    // the one that makes the sound is not the one that holds the JACK port:
    // `alsa_in` keeps `err1965:capture_1` registered whether or not anything is
    // being written to the loopback card, so a dead feeder presents as a
    // perfectly healthy graph carrying digital silence. That is this project's
    // oldest failure shape and the only defence is to report the fact.
    pr.on('exit', (code, sig) => {
      if (stopping) return;               // an orderly teardown is not news
      onLog?.(`⚠ ${pr.spawnfile} exited (${sig ?? code}) — this source is no longer making sound`);
    });
  }
  // ⚠️ POLL FOR THE PORT; DO NOT SLEEP A GUESSED AMOUNT. This line used to be
  // `await wait(def.warmup ?? 6000)` — and twenty lines above, about jackd,
  // this same file already says why that is wrong: "2.5 s was enough on a warm
  // board and not on a cold one, which is the worst kind of timing constant."
  // The lesson was written down and not applied to the line below it.
  //
  // It cost nine and a half seconds on every switch to an instrument that was
  // ready in one. MEASURED: a warm switch to fluidjack took 9540 ms against the
  // pipe path's 725 ms, and almost all of it was 6000 + 2500 + 600 of sleeping.
  // The warmup is now a CEILING rather than a duration.
  //
  // `settle` is for an instrument that registers its port before it can play —
  // yoshimi loads 911 instruments across 24 banks after it appears on the graph
  // — and it is waited only after the port is actually there.
  const ceiling = def.warmup ?? (name === 'yoshimi' ? 13000 : 6000);
  const t0port = Date.now();
  let ready = false;
  while (!ready && Date.now() - t0port < ceiling) {
    ready = sh('jack_lsp 2>/dev/null').split('\n').some((p) => def.portMatch.test(p));
    if (!ready) await wait(250);
  }
  onLog?.(ready ? `port up in ${Date.now() - t0port} ms` : `no port after ${ceiling} ms — carrying on so the failure is reported below`);
  if (ready && def.settle) await wait(def.settle);

  // 3. capture — raw s16 on stdout, read straight into the frame pump
  const cap = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'jack', '-i', 'posbox',
    '-f', 's16le', '-ar', String(RATE), '-ac', '1', '-'], { stdio: ['ignore', 'pipe', 'pipe'] });
  procs.push(cap);
  // Same again for the capture's own client, rather than 2.5 s of hoping.
  const t0cap = Date.now();
  while (Date.now() - t0cap < 8000) {
    if (sh('jack_lsp 2>/dev/null').includes('posbox:input_1')) break;
    await wait(200);
  }

  // 4. wire the instrument's output into the capture client
  const port = sh('jack_lsp').split('\n').find((p) => def.portMatch.test(p));
  if (!port) { procs.forEach((p) => p.kill()); return { ok: false, reason: `${name} registered no JACK port`, log: log.slice(-300) }; }
  sh(`jack_connect "${port}" posbox:input_1`);
  // ⚠️ AND THE RIGHT CHANNEL, WHICH WAS GOING NOWHERE. `portMatch` finds ONE
  // port, and for a stereo instrument that is the left one — so the capture was
  // mono-LEFT rather than mono-SUM and everything panned right was silently
  // absent. Measured on the same note through the same soundfont: the pipe path
  // (which averages the two channels) read 2029 Hz, the JACK path 1661 Hz, an
  // apparent 0.29-octave difference that was not the transport at all. Many
  // ports into one input SUM in JACK, which is what mono-sum means.
  let portR = null;
  if (def.portMatch2) {
    portR = sh('jack_lsp').split('\n').find((p) => def.portMatch2.test(p));
    if (portR) sh(`jack_connect "${portR}" posbox:input_1`);
    else onLog?.(`${name}: no right channel found — the capture is one channel of a stereo source`);
  }

  // and patch the feeder into it. Pappus reads In.ar on the HARDWARE inputs,
  // which is what SuperCollider:in_1 is — private busses would have it
  // granulating silence, which is exactly how it failed the first time.
  if (feeder) {
    const fp = sh('jack_lsp').split('\n').find((p) => JACK_SYNTHS[def.feeder].portMatch.test(p));
    if (!fp) onLog?.(`FEEDER ${def.feeder} registered no port — nothing to granulate`);
    else {
      const out = sh(`jack_connect "${fp}" SuperCollider:in_1 2>&1`);
      onLog?.(out.trim() ? `feeder patch said: ${out.trim().slice(0, 120)}` : `patched ${def.feeder} -> pappus`);
    }
  }

  // 5. MIDI in, through virmidi
  const vm = findVirmidi();
  // A source need not have MIDI at all — the archive is a recording, not an
  // instrument — so `alsaMatch` is optional rather than assumed.
  const alsa = def.alsaMatch
    ? sh('aconnect -l').split('\n').find((l) => /^client \d+:/.test(l) && def.alsaMatch.test(l))
    : null;
  const alsaClient = alsa?.match(/client (\d+):/)?.[1];
  let midiFd = null;
  if (vm && alsaClient) {
    sh(`aconnect ${vm.client}:0 ${alsaClient}:0`);
    try { midiFd = openSync(vm.dev, 'w'); } catch (e) { onLog?.(`virmidi open failed: ${e.message}`); }
  }

  // 6. the capture's bytes, cut into 20 ms frames
  const BYTES = FRAME * 2;
  let carry = Buffer.alloc(0);
  cap.stdout.on('data', (chunk) => {
    carry = carry.length ? Buffer.concat([carry, chunk]) : chunk;
    while (carry.length >= BYTES) {
      onFrame?.(new Int16Array(carry.buffer.slice(carry.byteOffset, carry.byteOffset + BYTES)));
      carry = carry.subarray(BYTES);
    }
  });
  cap.stderr?.on('data', (d) => onLog?.(`ffmpeg: ${String(d).trim()}`));

  // 7. anything the instrument wants said once it is up (hexter's ROM bank)
  if (def.osc) {
    const oscPort = sh("ss -ulnp 2>/dev/null | grep jack-dssi-host | grep -oE ':[0-9]+' | tr -d ':' | head -1").trim();
    const url = oscPort && `osc.udp://localhost:${oscPort}/dssi/hexter/chan00`;
    for (const args of (def.after?.(url) || [])) {
      // ⚠️ dssi_osc_send wants <option> <URL> <values> — URL second, not first.
      sh(`dssi_osc_send ${args[0]} ${url} ${args.slice(1).join(' ')}`);
      await wait(400);
    }
  }

  const midi = (bytes) => { if (midiFd !== null) { try { writeSync(midiFd, Buffer.from(bytes)); } catch { /* gone */ } } };

  // The OSC channel, for engines that are driven by parameters rather than notes.
  const udp = def.oscCmd ? createSocket('udp4') : null;
  const osc = (cmdName, ...args) => {
    if (!udp) return false;
    const m = oscMessage('/pappus/cmd', [cmdName, ...args]);
    udp.send(m, 0, m.length, 57120, '127.0.0.1');
    return true;
  };
  return {
    // ⚠️ `jack: true` IS LOAD-BEARING. The caller gates the granular insert on
    // it, and so does the page. Leaving it to be inferred from which variable
    // happened to be set is exactly the coupling this refactor removed.
    ok: true, source: name, jack: true, port, portR, channels: portR ? 2 : 1, alsaClient, midi: !!midiFd,
    rate: RATE, msgPerSec: RATE / FRAME,
    noteOn: (ch, n, v) => midi([0x90 | (ch & 15), n & 127, v & 127]),
    noteOff: (ch, n) => midi([0x80 | (ch & 15), n & 127, 0]),
    cc: (ch, c, v) => midi([0xb0 | (ch & 15), c & 127, v & 127]),
    program: (ch, p) => midi([0xc0 | (ch & 15), p & 127]),
    panic: () => { for (let c = 0; c < 16; c++) midi([0xb0 | c, 123, 0]); },
    osc,
    stop: () => {
      stopping = true;                // an orderly teardown is not a death
      try { udp?.close(); } catch { /* already closed */ }
      if (midiFd !== null) { try { closeSync(midiFd); } catch {} }
      for (const p of procs) { try { p.kill('SIGTERM'); } catch {} }
    },
  };
}
