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
import { openSync, writeSync, closeSync, existsSync, mkdirSync } from 'node:fs';

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
