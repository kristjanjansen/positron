// rig/board/jacksynth.mjs — instruments that are JACK clients.
//
// Yoshimi is a JACK client and cannot write to a pipe, so this module builds
// the chain the container proved out:
//
//   jackd -d dummy          a clock, no hardware
//     -> yoshimi            the instrument
//     -> ffmpeg -f jack     capture, raw s16 on stdout, straight into the board
//
// MIDI IN is the other half, and it uses something setup.sh already loads.
// snd-virmidi gives four virtual ports that are BOTH an ALSA sequencer client
// and a raw character device: writing three bytes to /dev/snd/midiC<n>D0 emits
// them on sequencer port <client>:0, which `aconnect` then routes to the synth.
// So the board plays a JACK synth by writing raw MIDI bytes to a file.
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
 * The ports of this board's audio path, named ONCE.
 *
 * They were typed in three places: `startJackSynth` wired `posboard:input_1` as a
 * literal, `pappusFx` declared its own copies, and `sourceFeed` a third pair. A
 * port name typed twice is a report and a re-patch that can describe different
 * graphs, which is exactly the failure `jackGraph()` below exists to catch, so
 * the report and the wiring now read the same five strings.
 *
 * `posboard` is the ffmpeg capture's JACK client name: the frames a page HEARS
 * are whatever is summed into `posboard:input_1`, so that port is the end of the
 * chain and the one thing every question here is really about.
 */
const CAP_CLIENT = 'posboard';
const CAP = `${CAP_CLIENT}:input_1`;
const SCIN = 'SuperCollider:in_1', SCIN2 = 'SuperCollider:in_2';
const SCOUT = 'SuperCollider:out_1', SCOUT2 = 'SuperCollider:out_2';

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
 * Off:  instrument L+R -> posboard (the capture)
 * On:   instrument L+R -> SuperCollider:in_1/in_2 ... out_1/out_2 -> posboard
 *
 * The engine keeps running while it is bypassed, because it takes half a
 * minute to compile a 2,030-line class library and nobody wants that between
 * two presses of a button. Bypassing is a re-patch, which is instant.
 *
 * 🔴 BOTH CHANNELS, AND THE RIGHT ONE WAS BYPASSING THE INSERT ENTIRELY UNTIL
 * 2026-09-13. `startJackSynth` connects an instrument's LEFT AND RIGHT ports to
 * `posboard:input_1`, deliberately — many ports into one input sum in JACK, and
 * that mono-SUM is what makes a capture of a stereo instrument honest (see the
 * comment there: mono-left read a note as 1661 Hz where mono-sum read 2029 Hz).
 * This function then disconnected only the LEFT one and inserted only the LEFT
 * one, so with the granulator switched on a page heard
 *
 *     the granulator's left output  +  the instrument's right channel, DRY
 *
 * MEASURED on the board, `jack_lsp -c`: `posboard:input_1` had two sources,
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
  return ['sclang', 'jackd'].every(have) && existsSync('/opt/positron-board/rig/board/norns/run-pappus.scd');
}

export async function pappusFx(on, { instrumentPort, instrumentPortR, onLog } = {}) {
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
    pappusProc = spawn('sclang', ['/opt/positron-board/rig/board/norns/run-pappus.scd'], {
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
 * ⚠️ AND THE INSTRUMENT IS NOT STOPPED, IT IS UNPLUGGED. `posboard` — the ffmpeg
 * capture whose frames are the audio a page hears — is raised as part of the
 * instrument's own chain, so `audio.stop` would take the sound of the result
 * away along with the material. Disconnecting one JACK link leaves the capture
 * where it is, and `pappusFx` still owns the other end of the insert.
 */
export function sourceFeed(on, { instrumentPort, instrumentPortR, onLog } = {}) {
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

// ── looking at the graph, and putting it back ────────────────────────────────
//
// 🔴 NOTHING ON THIS BOARD EVER REPORTED THE JACK AUDIO GRAPH, AND THAT IS
// WHERE ITS LEVEL FAULTS LIVE. `ports.get` answers with the ALSA SEQUENCER,
// which is MIDI, so the audio path was visible only over ssh. The board dials
// OUT to the relay and answers verbs from any network; `ssh positron@…` needs
// the studio LAN. So on 2026-09-17 the output peak fell from 0.0445 to 0.0010,
// about 40x, with the page, the MIDI level and the instrument each ruled out by
// measurement, and the one remaining suspect was the one thing nobody outside
// the building could look at.
//
// ⚠️ THE REPORT COMES FIRST AND IT CHANGES NOTHING. `jackGraph` and `jackChain`
// only read. `jackRebuild` is the only thing here that writes, and it writes
// the DIFF rather than re-running a sequence of commands: see its own comment
// for why that is what makes it safe to send at a board somebody else is
// listening to.
// ⚠️ NONE OF IT HAS RUN ON THE BOARD. Written 2026-09-18 from a laptop that
// cannot reach it, against `jack_lsp -c` output as this file's existing code
// already parses it. The parse is graded by `node rig/board/test.mjs`, on
// captured text rather than on a server.

/**
 * `jack_lsp -c` as structure: a port on its own line, each of its connections
 * indented under it.
 *
 * ⚠️ EXPORTED SO IT CAN BE GRADED WITHOUT A BOARD. It is the only part of this
 * section that is pure, the indentation is the whole of the format, and a
 * parser that silently drops a line would report a healthy graph about a broken
 * one, which is the exact shape of failure this board keeps producing.
 * `fixtures/jack-lsp-c.txt` and `node rig/board/test.mjs` grade it.
 *
 * A connection list is SYMMETRIC: both ends name each other. So a SINK's entry
 * is the list of everything feeding it, which is the question every answer
 * below is built out of.
 */
export function parseJackLsp(text) {
  const rows = [];
  for (const line of String(text).split('\n')) {
    if (!line.trim()) continue;
    // An indented line belongs to the port above it. A leading-space line with
    // no port above it is malformed output rather than a connection, so it is
    // dropped rather than given an invented parent.
    if (/^\s/.test(line)) rows.at(-1)?.connected.push(line.trim());
    else rows.push({ port: line.trim(), connected: [] });
  }
  return rows;
}

/** `jack_lsp -c` and what can be read beside it, as an object. */
export function jackGraph() {
  if (!have('jack_lsp')) {
    return { ok: false, server: 'unknown', reason: 'jack_lsp is not installed on this board',
             ports: [], graph: [], procs: null, jackd: null };
  }
  const graph = parseJackLsp(sh('jack_lsp -c 2>/dev/null'));
  // An empty listing means NO SERVER rather than no ports, and that is this
  // file's own established reading: `startJackSynth` decides whether to raise
  // jackd on exactly this test, and its comment says why it asks JACK rather
  // than the process table.
  const server = graph.length ? 'up' : 'down';

  /**
   * How many of each, so a graph that looks right can still be shown to be the
   * wrong one. Two yoshimis and the capture is patched to whichever registered
   * its port first; a scsynth that outlived a service restart keeps its ports
   * and answers nobody. `sweepOrphans()` in board.mjs exists for that and runs
   * only at startup, so a board that has been up for a week has never swept.
   *
   * ⚠️ `pgrep -cx`, NEVER `-f`. CLAUDE.md, and it cost twenty minutes twice:
   * `pgrep -f <pattern>` matches the asking command's own line and answers
   * about itself.
   */
  const procs = {};
  for (const n of ['jackd', 'yoshimi', 'sclang', 'scsynth', 'ffmpeg']) {
    const c = sh(`pgrep -cx ${n} 2>/dev/null`).trim();
    procs[n] = c === '' ? 0 : Number(c) || 0;
  }
  // ⚠️ `-a` ADDS THE COMMAND LINE; THE MATCH IS STILL `-x`, on the name. Worth
  // having because the rate and the period the server was started with are in
  // it, and everything downstream assumes them: the capture asks ffmpeg for
  // `-ar 48000` whatever jackd is actually running at.
  // ⚠️ DECLARED, NOT MEASURED. This is what jackd was ASKED for on its command
  // line, which is not necessarily what it settled on, and a server somebody
  // else started is in this string too. Anything wanting the truth has to ask
  // the server.
  const jackd = sh('pgrep -ax jackd 2>/dev/null').split('\n')[0]?.trim() || null;
  const rateArgs = jackd ? [...jackd.matchAll(/-r\s+(\d+)/g)].map((m) => Number(m[1])) : [];
  return {
    ok: server === 'up',
    server,
    ports: graph.map((p) => p.port),
    graph,
    procs,
    jackd,
    declaredRate: rateArgs.at(-1) ?? null,
    declaredPeriod: jackd ? Number(jackd.match(/-p\s+(\d+)/)?.[1]) || null : null,
    ...(server === 'down' ? { reason: 'jack_lsp lists no ports at all, so there is no server to look at' } : {}),
  };
}

/**
 * What the graph SHOULD be for the thing that is playing, and what it is.
 *
 * 🔴 THE WIRING WRITTEN AS A FACT, ONCE, RATHER THAN AS TWO SEQUENCES OF
 * COMMANDS. `startJackSynth` step 4 and `pappusFx` each build this chain by
 * running connects in an order; neither can answer "is it still like that?"
 * afterwards, and until now nothing could. The edge list below is the same
 * wiring stated as what must be true, so the report and the repair share one
 * description and a third copy cannot drift.
 *
 * The scope is deliberately narrow: the edges into the two SINKS this board's
 * audio path has, the capture and the granulator's inputs. `system:playback_*`,
 * a monitor, anything a person patched by hand elsewhere on the graph, are none
 * of this function's business and are neither reported as wrong nor touched.
 */
export function jackChain({ instrumentPort, instrumentPortR, insert = false, source = false, graph = null } = {}) {
  const g = graph ?? jackGraph();
  const rows = g.graph ?? [];
  const sourcesOf = (port) => rows.find((p) => p.port === port)?.connected ?? [];
  const present = (port) => rows.some((p) => p.port === port);

  const want = [];
  if (instrumentPort) {
    if (!insert) {
      // Both channels into one input, which SUMS in JACK. That is deliberate
      // and measured: mono-left read a note at 1661 Hz where mono-sum read
      // 2029 Hz, an apparent 0.29-octave difference that was the wiring.
      want.push([instrumentPort, CAP]);
      if (instrumentPortR) want.push([instrumentPortR, CAP]);
    } else {
      // ⚠️ WITH GENERATED MATERIAL THE INSTRUMENT IS DELIBERATELY UNPLUGGED,
      // so a rebuild must not put it back. scsynth fills its input bus from
      // JACK at the top of every block, so an instrument still patched to
      // `SuperCollider:in_1` is SUMMED with `PosSource`'s output and the
      // granulator chews a third material neither end can describe. That is
      // what `sourceFeed` exists to prevent.
      if (!source) {
        want.push([instrumentPort, SCIN]);
        if (instrumentPortR) want.push([instrumentPortR, SCIN2]);
      }
      want.push([SCOUT, CAP], [SCOUT2, CAP]);
    }
  }
  const has = ([from, to]) => sourcesOf(to).includes(from);
  const missing = want.filter((e) => !has(e));

  // Anything ELSE feeding those sinks. This is the half that re-running the
  // connect commands can never find: a link that should not be there sums into
  // the capture, and nothing downstream can tell it from the instrument. The
  // granulator's inputs are swept whenever its ports exist at all, insert on or
  // off, because `pappusFx(false)` disconnects them for the same reason.
  const sinks = [CAP, ...(present(SCIN) ? [SCIN, SCIN2] : [])];
  const extra = [];
  for (const sink of sinks) {
    for (const src of sourcesOf(sink)) {
      if (!want.some(([f, t]) => f === src && t === sink)) extra.push([src, sink]);
    }
  }
  return {
    want, missing, extra,
    intact: !!instrumentPort && missing.length === 0 && extra.length === 0,
    // Named separately because they are three different faults with three
    // different repairs, and a caller reading one boolean cannot tell them
    // apart: no instrument at all, a capture that has gone, a graph that drifted.
    capture: { port: CAP, present: present(CAP), sources: sourcesOf(CAP) },
    insert: { port: SCIN, present: present(SCIN), on: !!insert,
              sources: sourcesOf(SCIN), out: sourcesOf(CAP).filter((s) => s.startsWith('SuperCollider:')) },
    instrumentPort: instrumentPort ?? null,
    instrumentPortR: instrumentPortR ?? null,
    material: source ? 'generated' : null,
  };
}

/**
 * Put the graph back, and nothing else.
 *
 * 🔴 IT IS A DIFF, NOT A TEARDOWN, AND THAT IS THE WHOLE SAFETY ARGUMENT. This
 * board has ONE jackd, ONE capture and ONE room, and the relay forwards
 * verbatim, so a recovery verb is heard by whoever is listening in another
 * building. A graph that is already right therefore runs ZERO commands and
 * nobody hears anything; the only thing this can ever cut is a link that should
 * not be there, and the only thing it can ever add is a link that should.
 *
 * ⚠️ IT KILLS NOTHING. No `pkill`, no restart of jackd, yoshimi or sclang, and
 * no service restart. Every step is one `jack_connect` or `jack_disconnect`,
 * which this file already relies on being instant: bypassing the insert under a
 * playing instrument is the same operation and is a re-patch rather than a
 * rebuild of anything. An instrument picker was removed from this board for
 * being a control that took the sound away from somebody else, and a verb that
 * killed a process to recover a patchbay would be that control wearing a
 * recovery label.
 *
 * ⚠️ DISCONNECT FIRST, THEN CONNECT, WHICH IS THE ORDER `pappusFx` ALREADY
 * USES. It costs a gap of a few milliseconds in the capture where a wrong
 * source is removed before the right one lands, and the alternative is a moment
 * with both live, which is the louder wrong and is the shape of the mono-sum
 * bug this file has already paid for once.
 *
 * ⚠️ `plan: true` RUNS NOTHING and returns the same steps. Every verb that
 * changes this rig has a twin that changes nothing (`patch.plan` against
 * `patch.apply`), because a wrong patch is SILENT and a plan is not.
 */
export function jackRebuild({ instrumentPort, instrumentPortR, insert = false, source = false,
                              plan = false, graph = null, onLog } = {}) {
  const at = { instrumentPort, instrumentPortR, insert, source };
  // ⚠️ `graph` IS FOR THE PLAN PATH AND FOR THE TESTS. The APPLIED path reads
  // the graph back itself below, because the whole value of `after` is that it
  // was measured after the commands ran rather than predicted before them.
  const before = jackChain({ ...at, graph });
  if (!instrumentPort) {
    return { ok: false, plan, changed: 0, steps: [], before, after: before,
             reason: 'nothing is playing on the JACK graph, so there is no chain to rebuild. Send audio.start first' };
  }
  if (!before.capture.present) {
    // The capture is an ffmpeg inside `startJackSynth`'s closure, so no amount
    // of patching brings it back. Say which verbs do, rather than running a
    // list of connects against a port that is not there and reporting failure.
    return { ok: false, plan, changed: 0, steps: [], before, after: before,
             reason: `${CAP} is not on the graph: the capture process is gone, and only audio.stop then audio.start raises it again` };
  }
  const steps = [
    ...before.extra.map(([f, t]) => ({ act: 'disconnect', from: f, to: t, cmd: `jack_disconnect "${f}" "${t}"` })),
    ...before.missing.map(([f, t]) => ({ act: 'connect', from: f, to: t, cmd: `jack_connect "${f}" "${t}"` })),
  ];
  if (plan) {
    onLog?.(steps.length ? `${steps.length} step${steps.length === 1 ? '' : 's'} would run, nothing did` : 'the graph is already what it should be');
    return { ok: true, plan: true, changed: 0, steps, before, after: before };
  }
  for (const s of steps) {
    // ⚠️ THE TEXT TRAVELS, NOT A BOOLEAN. `jack_connect` answers non-empty on
    // failure AND on "already connected", and those are opposite facts that no
    // exit status here tells apart.
    s.said = sh(`${s.cmd} 2>&1`).trim() || null;
    onLog?.(`${s.act} ${s.from} -> ${s.to}${s.said ? ` (${s.said})` : ''}`);
  }
  // 🔴 `ok` IS THE GRAPH READ BACK, NOT THE COMMANDS HAVING RUN. Printing "ok"
  // is not evidence (CLAUDE.md); a `jack_connect` to a port that vanished
  // between the read and the write answers on stderr and changes nothing.
  const after = jackChain(at);
  return { ok: after.intact, plan: false, changed: steps.length, steps, before, after };
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
  // variable nobody read, and the board looked like it had started something
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
  const cap = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'jack', '-i', CAP_CLIENT,
    '-f', 's16le', '-ar', String(RATE), '-ac', '1', '-'], { stdio: ['ignore', 'pipe', 'pipe'] });
  procs.push(cap);
  // Same again for the capture's own client, rather than 2.5 s of hoping.
  const t0cap = Date.now();
  while (Date.now() - t0cap < 8000) {
    if (sh('jack_lsp 2>/dev/null').includes(CAP)) break;
    await wait(200);
  }

  // 4. wire the instrument's output into the capture client
  const port = sh('jack_lsp').split('\n').find((p) => def.portMatch.test(p));
  if (!port) { procs.forEach((p) => p.kill()); return { ok: false, reason: `${name} registered no JACK port`, log: log.slice(-300) }; }
  sh(`jack_connect "${port}" ${CAP}`);
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
    if (portR) sh(`jack_connect "${portR}" ${CAP}`);
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
