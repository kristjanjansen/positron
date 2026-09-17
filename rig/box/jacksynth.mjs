// rig/box/jacksynth.mjs — instruments that are JACK clients.
//
// Yoshimi is a JACK client and cannot write to a pipe, so this module builds
// the chain the container proved out:
//
//   jackd -d dummy          a clock, no hardware
//     -> yoshimi            the instrument
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

/**
 * The instruments this module knows how to raise.
 *
 * 🔴 ONE INSTRUMENT, SINCE 2026-09-16. FluidSynth and hexter stood here and are
 * at `archive/box-fluidsynth-hexter/`. The reason is the graph rather than the
 * code: there is ONE jackd, ONE capture and ONE room on this board, so whatever
 * is up is what every listener on every page hears, and a second instrument is
 * a way to take the sound away from somebody in another building. `/knobs/`
 * cannot work at all without yoshimi's filter, and it was found refusing to
 * start because somebody had pressed a button on another page.
 *
 * ⚠️ The INSERT — pappus — is deliberately not a key here.
 * Everything in this table is offered to clients as an instrument. They live
 * further down, by the code that raises it: `pappusFx()`.
 *
 * ⚠️ Pappus is NOT an instrument and is not in this table any more. It
 * granulates its INPUT, so as an instrument it faithfully processed silence,
 * and shipping it beside yoshimi made it look like a second sound source that
 * happened to be identical to the first. It is an EFFECT — see `pappusFx()`
 * below, which inserts it between whatever is playing and the capture, and can
 * be switched on and off under a running instrument.
 */
export const JACK_SYNTHS = {
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

  // 🔴 AN `archive` SOURCE STOOD HERE AND LEFT ON 2026-09-16. It played ERR's
  // 1965 radio archive into the JACK graph: ffmpeg into `snd-aloop`, `alsa_in`
  // out the other side as `err1965`, on `-stream_loop -1`, so it never ended.
  // No page offered it, and every connection this repo opens to ERR appears in
  // a public broadcaster's audience measurement. `archive/box-pappus/` has it.
};

/**
 * Pappus as an INSERT, not an instrument.
 *
 * Off:  instrument L+R -> posbox (the capture)
 * On:   instrument L+R -> SuperCollider:in_1/in_2 ... out_1/out_2 -> posbox
 *
 * The engine keeps running while it is bypassed, because it takes half a
 * minute to compile a 2,030-line class library and nobody wants that between
 * two presses of a button. Bypassing is a re-patch, which is instant.
 *
 * 🔴 BOTH CHANNELS, AND THE RIGHT ONE WAS BYPASSING THE INSERT ENTIRELY UNTIL
 * 2026-09-13. `startJackSynth` connects an instrument's LEFT AND RIGHT ports to
 * `posbox:input_1`, deliberately — many ports into one input sum in JACK, and
 * that mono-SUM is what makes a capture of a stereo instrument honest (see the
 * comment there: mono-left read a note as 1661 Hz where mono-sum read 2029 Hz).
 * This function then disconnected only the LEFT one and inserted only the LEFT
 * one, so with the granulator switched on a page heard
 *
 *     the granulator's left output  +  the instrument's right channel, DRY
 *
 * MEASURED on the board, `jack_lsp -c`: `posbox:input_1` had two sources,
 * `yoshimi:right` and `SuperCollider:out_1`. Two things follow. The insert
 * could never be heard on its own — every measurement of "what does this
 * granulator do" taken through this capture had the dry instrument summed into
 * it — and the granulator was being FED in mono-left, which is the exact defect
 * the capture comment was written about, one stage upstream.
 *
 * ⚠️ It also fits the open puzzle of 2026-09-12, recorded in `grains`: no
 * granulator parameter could be shown to change the returned audio, and "the
 * envelope NEVER dropped below a quarter of its own median at any setting". A
 * dry instrument summed under a grain cloud is exactly that shape. That is a
 * consistent explanation and not a proof, and it is written here as the first
 * thing to re-run rather than as a finding.
 *
 * The reverb insert that used to live below had this right all along: it
 * patched `port` AND `portR`, which is why the two inserts disagreed about what
 * a page could hear.
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
 *
 * ⚠️ AND IT PRINTS IT LAST, since 2026-09-13 — because "it means it" turned out
 * to need one more thing. The line used to go out at the TOP of the engine
 * callback, and `run-pappus.scd`'s own startup Routine then waited a second and
 * set `mrate 0.5`, `msrc 2`, `amp`, `ingain` and `run` on top of whatever the
 * client had sent in that second, since the client had been told it could start.
 * MEASURED: `grains` asked for 2.2 grains a second on a cold board and the
 * engine reported 0.5, which is that file's own default arriving late. It failed
 * only on the FIRST visit after a restart, which is the visit nobody is
 * watching. Anything moved into that Routine has to stay above the line.
 */
let pappusReady = false;

export function pappusAvailable() {
  return ['sclang', 'jackd'].every(have) && existsSync('/opt/positron-box/rig/box/norns/run-pappus.scd');
}

export async function pappusFx(on, { instrumentPort, instrumentPortR, onLog } = {}) {
  const CAP = 'posbox:input_1';
  const SCIN = 'SuperCollider:in_1', SCIN2 = 'SuperCollider:in_2';
  const SCOUT = 'SuperCollider:out_1', SCOUT2 = 'SuperCollider:out_2';
  if (!on) {
    if (instrumentPort) {
      sh(`jack_disconnect "${instrumentPort}" ${SCIN} 2>/dev/null`);
      if (instrumentPortR) sh(`jack_disconnect "${instrumentPortR}" ${SCIN2} 2>/dev/null`);
      sh(`jack_disconnect ${SCOUT} ${CAP} 2>/dev/null`);
      sh(`jack_disconnect ${SCOUT2} ${CAP} 2>/dev/null`);
      sh(`jack_connect "${instrumentPort}" ${CAP} 2>/dev/null`);
      if (instrumentPortR) sh(`jack_connect "${instrumentPortR}" ${CAP} 2>/dev/null`);
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
  // Pappus instead, and Pappus feeds the capture. ⚠️ BOTH CHANNELS EACH WAY —
  // see the header. A right channel left on the capture is a dry instrument
  // under everything the insert does; a right channel not patched to `in_2` is
  // a granulator fed in mono-left.
  if (instrumentPort) {
    sh(`jack_disconnect "${instrumentPort}" ${CAP} 2>/dev/null`);
    sh(`jack_connect "${instrumentPort}" ${SCIN} 2>/dev/null`);
  }
  if (instrumentPortR) {
    sh(`jack_disconnect "${instrumentPortR}" ${CAP} 2>/dev/null`);
    sh(`jack_connect "${instrumentPortR}" ${SCIN2} 2>/dev/null`);
  }
  sh(`jack_connect ${SCOUT} ${CAP} 2>/dev/null`);
  // ⚠️ AND THE GRANULATOR'S OWN RIGHT CHANNEL, for the same reason one stage
  // down: Pappus pans — SPRAY, TILT and the delay taps all place things in the
  // stereo field — so capturing only `out_1` drops whatever it put on the right.
  // Many ports into one input sum in JACK, so this is the mono-SUM the capture
  // comment in `startJackSynth` argues for, applied to the thing that is
  // actually playing.
  sh(`jack_connect ${SCOUT2} ${CAP} 2>/dev/null`);
  onLog?.(instrumentPort
    ? `pappus inserted${instrumentPortR ? '' : ' (mono source — no right channel)'}`
    : 'pappus running, nothing feeding it');
  return { ok: true, on: true, fed: !!instrumentPort, stereo: !!instrumentPortR, ready: pappusReady };
}

/**
 * Take the instrument OUT of the granulator's input, or put it back.
 *
 * 🔴 THE SOURCE AND THE INSTRUMENT CANNOT BOTH BE IN THERE. `PosSource.sc`
 * writes to scsynth's own input bus, and scsynth fills that bus from JACK at the
 * top of every block — so with `<instrument> -> SuperCollider:in_1` still
 * patched, the granulator chews the SUM of the two. That is not "the same input
 * at both ends" (plan-twins §4a), it is a third material neither end can
 * describe, and it would read as the comparison being noisy rather than as the
 * wiring being wrong.
 *
 * ⚠️ AND THE INSTRUMENT IS NOT STOPPED, IT IS UNPLUGGED. `posbox` — the ffmpeg
 * capture whose frames are the audio a page hears — is raised as part of the
 * instrument's own chain, so `audio.stop` would take the sound of the result
 * away along with the material. Disconnecting one JACK link leaves the capture
 * where it is, and `pappusFx` still owns the other end of the insert.
 */
export function sourceFeed(on, { instrumentPort, instrumentPortR, onLog } = {}) {
  const SCIN = 'SuperCollider:in_1', SCIN2 = 'SuperCollider:in_2';
  if (!instrumentPort) return { ok: true, instrument: null, fed: false };
  // `on` here means "the generated source is the material", so the INSTRUMENT
  // is disconnected. Named for what is being asked for rather than for what is
  // done to the wire, because every caller is asking the first question.
  // ⚠️ BOTH CHANNELS. Unplugging only the left one leaves the right one in the
  // granulator's buffer, which is not "the same input at both ends" — it is the
  // page's material plus half an instrument, and it would read as the
  // comparison being noisy rather than as the wiring being wrong.
  const said = [];
  for (const [port, bus] of [[instrumentPort, SCIN], [instrumentPortR, SCIN2]]) {
    if (!port) continue;
    said.push(on ? sh(`jack_disconnect "${port}" ${bus} 2>&1`) : sh(`jack_connect "${port}" ${bus} 2>&1`));
  }
  onLog?.(on ? `${instrumentPort} unplugged from the granulator` : `${instrumentPort} feeding the granulator again`);
  // jack_connect answers non-empty on failure AND on "already connected"; the
  // second is not an error, so the text travels rather than a boolean nobody
  // can interpret.
  return { ok: true, instrument: instrumentPort, fed: !on, said: said.join(' ').trim() || null };
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

// 🔴 THE REVERB INSERT IS GONE, 2026-09-17, ON INSTRUCTION: *"Rm chorus reverb
// from keys ui and board"*. What stood here was `positron-space`, a Csound
// insert on the JACK graph that passed the dry signal and added a tail, driven
// from `/keys/` by `fx.space`. It and its orchestra are at
// `archive/keys-space/`.
//
// ⚠️ PAPPUS IS NOT AFFECTED and is deliberately still here. The two were
// opposite kinds of insert on one graph and only ever one at a time; what is
// left is the grain cloud that `/grains/` drives, along with `sweepInsert()`,
// which is what stops an insert outliving the page that asked for it.

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

  // ⚠️ STEP 2 WAS A FEEDER AND IT LEFT WITH hexter, 2026-09-16. A def could
  // declare `feeder: '<another key>'`, which raised that instrument first and
  // patched it into this one's inputs, for a source that PROCESSES rather than
  // generates. Exactly one def ever declared one and its feeder was hexter, so
  // the mechanism had no second user and no way to be exercised.
  // `archive/box-fluidsynth-hexter/board-half.js` has it.

  // 3. the instrument
  //
  // `spawnAll` rather than `spawn` for a source that is more than one process.
  // ⚠️ NOTHING IN THE TABLE USES IT TODAY. The source that did was the ERR
  // archive, which needed ffmpeg decoding into a loopback card and `alsa_in`
  // bridging that card into JACK, because ffmpeg has NO JACK MUXER (`ffmpeg
  // -devices` lists jack as `D`, a demuxer, only). It is kept because the shape
  // is right for anything played from a file or a network: whichever process
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
    // the one that makes the sound is not the one that holds the JACK port. A
    // bridge such as `alsa_in` keeps its port registered whether or not
    // anything is being written to the card behind it, so a dead writer
    // presents as a perfectly healthy graph carrying digital silence. That is
    // this project's oldest failure shape and the only defence is to report it.
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
  // ready in one. MEASURED while there were three instruments: a warm switch
  // took 9540 ms against a pipe path's 725 ms, and almost all of it was
  // 6000 + 2500 + 600 of sleeping.
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

  // ⚠️ THE FEEDER'S OWN PATCH WAS HERE and left with step 2 above. It joined
  // the feeding instrument to `SuperCollider:in_1`, which is a HARDWARE input:
  // Pappus reads `In.ar` there, and a private bus would have had it granulating
  // silence. `pappusFx()` further down does that join for the running
  // instrument and is untouched.

  // 5. MIDI in, through virmidi
  const vm = findVirmidi();
  // A source need not have MIDI at all, because a recording played into the
  // graph has no notes, so `alsaMatch` is optional rather than assumed.
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

  // ⚠️ STEP 7 WAS `def.osc` AND IT LEFT WITH hexter TOO. It sent DSSI OSC to a
  // plugin host once the instrument was up, which is how hexter loaded its four
  // factory DX7 cartridges and chose a program. Yoshimi is not a plugin and
  // reads its own banks off the disk, so nothing is left to say afterwards.
  // ⚠️ `def.oscCmd` BELOW IS A DIFFERENT CHANNEL and stays: that is the running
  // parameter socket a SuperCollider engine is driven on, not a one-off setup
  // message to a plugin host.

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
