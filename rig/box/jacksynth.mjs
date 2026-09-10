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
import { openSync, writeSync, closeSync, existsSync } from 'node:fs';

export const RATE = 48000, FRAME = 960;

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
  yoshimi: {
    needs: ['yoshimi', 'jackd', 'ffmpeg'],
    // -i no GUI, -a ALSA MIDI (so virmidi can reach it), -J JACK audio
    spawn: () => spawn('yoshimi', ['-i', '-a', '-J', '-b=256'], { stdio: ['ignore','pipe','pipe'] }),
    portMatch: /^yoshimi:left/i,
    alsaMatch: /yoshimi/i,
    osc: false,
  },
};

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
  if (!sh('pgrep -x jackd').trim()) {
    procs.push(spawn('jackd', ['-r', '-d', 'dummy', '-r', String(RATE), '-p', '1024'], { stdio: 'ignore' }));
    await wait(2500);
  }

  // 2. the instrument
  const synth = def.spawn();
  procs.push(synth);
  let log = '';
  synth.stdout?.on('data', (d) => { log += d; });
  // Yoshimi's CLI prints its prompt continuously; forwarding it floods the
  // journal with thousands of "@ Top" lines and buries anything real.
  synth.stderr?.on('data', (d) => {
    log += d;
    const t = String(d).trim();
    if (t && !/^(yoshimi>\s*)?@ \w+$/.test(t)) onLog?.(t);
  });
  await wait(name === 'yoshimi' ? 13000 : 6000);

  // 3. capture — raw s16 on stdout, read straight into the frame pump
  const cap = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'jack', '-i', 'posbox',
    '-f', 's16le', '-ar', String(RATE), '-ac', '1', '-'], { stdio: ['ignore', 'pipe', 'pipe'] });
  procs.push(cap);
  await wait(2500);

  // 4. wire the instrument's output into the capture client
  const port = sh('jack_lsp').split('\n').find((p) => def.portMatch.test(p));
  if (!port) { procs.forEach((p) => p.kill()); return { ok: false, reason: `${name} registered no JACK port`, log: log.slice(-300) }; }
  sh(`jack_connect "${port}" posbox:input_1`);

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
  return {
    ok: true, source: name, port, alsaClient, midi: !!midiFd,
    rate: RATE, msgPerSec: RATE / FRAME,
    noteOn: (ch, n, v) => midi([0x90 | (ch & 15), n & 127, v & 127]),
    noteOff: (ch, n) => midi([0x80 | (ch & 15), n & 127, 0]),
    cc: (ch, c, v) => midi([0xb0 | (ch & 15), c & 127, v & 127]),
    program: (ch, p) => midi([0xc0 | (ch & 15), p & 127]),
    panic: () => { for (let c = 0; c < 16; c++) midi([0xb0 | c, 123, 0]); },
    stop: () => {
      if (midiFd !== null) { try { closeSync(midiFd); } catch {} }
      for (const p of procs) { try { p.kill('SIGTERM'); } catch {} }
    },
  };
}
