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

/**
 * The granular parameters worth moving, with honest ranges. Pappus exposes 106
 * commands; most are structure. These are the ones that change what you HEAR,
 * and both granulators get the same surface one letter apart (m… and n…).
 */
export const PAPPUS_RANDOM = [
  ['rate', 0.5, 24],      // grains per second
  ['size', 0.02, 0.4],    // grain length, seconds
  ['scan', 0, 1],         // where in the buffer the playhead sits
  ['spray', 0, 0.6],      // scatter around it
  ['swarm', 0, 0.9],      // duplicate grains, detuned
  ['tilt', -1, 1],        // spectral tilt
  ['delay', 0, 0.8],
  ['sos', 0, 0.7],        // sound-on-sound feedback
  ['strum', 0, 0.5],
];

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
  yoshimi: {
    needs: ['yoshimi', 'jackd', 'ffmpeg'],
    // -i no GUI, -a ALSA MIDI (so virmidi can reach it), -J JACK audio
    spawn: () => spawn('yoshimi', ['-i', '-a', '-J', '-b=256'], { stdio: ['ignore','pipe','pipe'] }),
    portMatch: /^yoshimi:left/i,
    alsaMatch: /yoshimi/i,
    osc: false,
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
    pappusProc.stdout?.on('data', (d) => { for (const l of String(d).split('\n')) { const t = l.trim(); if (t && !/^(sc3>|->)/.test(t)) onLog?.(t); } });
    pappusProc.stderr?.on('data', (d) => onLog?.(String(d).trim()));
    let up = false;
    for (let i = 0; i < 80 && !up; i++) { await wait(500); up = sh('jack_lsp 2>/dev/null').includes('SuperCollider:out_1'); }
    if (!up) { pappusProc?.kill(); pappusProc = null; return { ok: false, reason: 'the pappus engine did not come up' }; }
  }

  // Insert it: the instrument stops feeding the capture directly and feeds
  // Pappus instead, and Pappus feeds the capture.
  if (instrumentPort) {
    sh(`jack_disconnect "${instrumentPort}" ${CAP} 2>/dev/null`);
    sh(`jack_connect "${instrumentPort}" ${SCIN} 2>/dev/null`);
  }
  sh(`jack_connect ${SCOUT} ${CAP} 2>/dev/null`);
  onLog?.(instrumentPort ? 'pappus inserted' : 'pappus running, nothing feeding it');
  return { ok: true, on: true, fed: !!instrumentPort };
}

export function pappusOsc(cmdName, ...args) {
  const m = oscMessage('/pappus/cmd', [cmdName, ...args]);
  const u = createSocket('udp4');
  u.send(m, 0, m.length, 57120, '127.0.0.1', () => u.close());
  return true;
}

export function pappusRandomise() {
  const out = {};
  for (const pre of ['m', 'n']) {
    for (const [name, lo, hi] of PAPPUS_RANDOM) {
      const v = +(lo + Math.random() * (hi - lo)).toFixed(3);
      pappusOsc(pre + name, v); out[pre + name] = v;
    }
    pappusOsc(pre + 'contour', 1 + Math.floor(Math.random() * 8));
    pappusOsc(pre + 'scanmode', Math.floor(Math.random() * 3));
  }
  pappusOsc('loss', +(Math.random() * 0.5).toFixed(3));
  return out;
}

export function stopPappus() {
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

export async function startJackSynth(name, { onFrame, onLog } = {}) {
  const def = JACK_SYNTHS[name];
  if (!def) return { ok: false, reason: `unknown jack synth ${name}` };
  const missing = def.needs.filter((b) => !have(b));
  if (missing.length) return { ok: false, reason: `not installed: ${missing.join(', ')}` };

  const procs = [];
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
  const synth = def.spawn();
  procs.push(synth);
  let log = '';
  // ⚠️ FORWARD STDOUT TOO. sclang reports through `postln`, which is stdout —
  // so "PAPPUS READY" and every engine error were being collected into a
  // variable nobody read, and the box looked like it had started something
  // that silently did nothing.
  synth.stdout?.on('data', (d) => {
    log += d;
    for (const line of String(d).split('\n')) {
      const t = line.trim();
      if (t && !/^(sc3>|->|\s*$)/.test(t) && !/^(yoshimi>\s*)?@ \w+$/.test(t)) onLog?.(t);
    }
  });
  // Yoshimi's CLI prints its prompt continuously; forwarding it floods the
  // journal with thousands of "@ Top" lines and buries anything real.
  synth.stderr?.on('data', (d) => {
    log += d;
    const t = String(d).trim();
    if (t && !/^(yoshimi>\s*)?@ \w+$/.test(t)) onLog?.(t);
  });
  await wait(def.warmup ?? (name === 'yoshimi' ? 13000 : 6000));

  // 3. capture — raw s16 on stdout, read straight into the frame pump
  const cap = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'jack', '-i', 'posbox',
    '-f', 's16le', '-ar', String(RATE), '-ac', '1', '-'], { stdio: ['ignore', 'pipe', 'pipe'] });
  procs.push(cap);
  await wait(2500);

  // 4. wire the instrument's output into the capture client
  const port = sh('jack_lsp').split('\n').find((p) => def.portMatch.test(p));
  if (!port) { procs.forEach((p) => p.kill()); return { ok: false, reason: `${name} registered no JACK port`, log: log.slice(-300) }; }
  sh(`jack_connect "${port}" posbox:input_1`);

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
  const alsa = sh('aconnect -l').split('\n').find((l) => /^client \d+:/.test(l) && def.alsaMatch.test(l));
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
    ok: true, source: name, port, alsaClient, midi: !!midiFd,
    rate: RATE, msgPerSec: RATE / FRAME,
    noteOn: (ch, n, v) => midi([0x90 | (ch & 15), n & 127, v & 127]),
    noteOff: (ch, n) => midi([0x80 | (ch & 15), n & 127, 0]),
    cc: (ch, c, v) => midi([0xb0 | (ch & 15), c & 127, v & 127]),
    program: (ch, p) => midi([0xc0 | (ch & 15), p & 127]),
    panic: () => { for (let c = 0; c < 16; c++) midi([0xb0 | c, 123, 0]); },
    osc,
    /** Roll every audible granular parameter, on both granulators. */
    randomise: () => {
      if (!udp) return null;
      const out = {};
      for (const pre of ['m', 'n']) {
        for (const [name, lo, hi] of PAPPUS_RANDOM) {
          const v = +(lo + Math.random() * (hi - lo)).toFixed(3);
          osc(pre + name, v);
          out[pre + name] = v;
        }
        osc(pre + 'contour', 1 + Math.floor(Math.random() * 8));
        osc(pre + 'scanmode', Math.floor(Math.random() * 3));
      }
      osc('loss', +(Math.random() * 0.5).toFixed(3));
      return out;
    },
    stop: () => {
      try { udp?.close(); } catch { /* already closed */ }
      if (midiFd !== null) { try { closeSync(midiFd); } catch {} }
      for (const p of procs) { try { p.kill('SIGTERM'); } catch {} }
    },
  };
}
