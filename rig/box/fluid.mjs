// rig/box/fluid.mjs — a real multitimbral instrument on the box.
//
// FluidSynth has an audio driver called `file`, and the useful discovery is
// that it is REALTIME-PACED: it writes samples at wall-clock speed to a file
// or a pipe, rather than rendering as fast as it can. Measured in an arm64
// Linux container 2026-09-10 — 4.14 s of wall clock produced 3.92 s of audio.
//
// So the soundcard becomes a PIPE into this process, and the box needs:
//   no /dev/snd · no ALSA · no mixer · no snd-aloop · no audio server
// which also means the whole thing is testable in Docker, where none of those
// exist. `-n` disables the MIDI driver, because notes arrive on stdin and
// without it fluidsynth prints ALSA sequencer errors nobody should have to read.
//
// 16 channels, 16 different instruments, one process. Measured cost on an M2,
// startup subtracted out: 0.088 s of CPU per second of audio with 24 notes
// sounding across six parts — about 9% of one core. The Pi 4 figure needs the
// board; `bench.mjs` there.
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, openSync, createReadStream, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const RATE = 48000;
export const FRAME = 960;                    // 20 ms -> 50 messages a second

// Debian and Pi OS put the GM soundfont here (package: fluid-soundfont-gm).
export const DEFAULT_SF = '/usr/share/sounds/sf2/FluidR3_GM.sf2';

/** General MIDI program numbers worth naming, so a client need not know GM. */
export const VOICES = {
  piano: 0, rhodes: 4, clav: 7, vibes: 11, organ: 16, guitar: 24, nylon: 24,
  bass: 33, fretless: 35, strings: 48, choir: 52, trumpet: 56, sax: 65,
  flute: 73, square: 80, saw: 81, pad: 89, bells: 98, kalimba: 108,
};

export function startFluid({ soundfont = DEFAULT_SF, gain = 0.6, polyphony = 64, onFrame, onLog } = {}) {
  // ⚠️ A FIFO, not /dev/stdout. fluidsynth's file driver writes fine to a shell
  // pipe, but under `spawn` it cannot re-open the inherited descriptor:
  //   Failed to open audio file '/dev/stdout' for writing
  // and /dev/fd/1 fails identically. Both measured on arm64 Linux 2026-09-10.
  // A named pipe has none of that ambiguity — it is opened by PATH, by both
  // ends, like any file.
  const fifo = join(tmpdir(), `fluid-${process.pid}-${Date.now() % 100000}.raw`);
  try { unlinkSync(fifo); } catch { /* not there, which is the normal case */ }
  execFileSync('mkfifo', [fifo]);
  // O_RDWR ('r+'), NOT read-only: opening a FIFO for reading BLOCKS until a
  // writer attaches, and fluidsynth has not started yet. That deadlock cost a
  // whole container run before it was understood.
  const rfd = openSync(fifo, 'r+');

  const args = [
    '-n',                                    // no MIDI driver: notes come on stdin
    '-a', 'file',
    '-o', `audio.file.name=${fifo}`,
    '-o', 'audio.file.type=raw',
    '-o', 'audio.file.format=s16',
    '-o', `synth.sample-rate=${RATE}`,
    '-o', `synth.gain=${gain}`,
    '-o', `synth.polyphony=${polyphony}`,
    soundfont,
  ];
  const p = spawn('fluidsynth', args, { stdio: ['pipe', 'pipe', 'pipe'] });

  // fluidsynth writes INTERLEAVED STEREO. The relay framing is mono, matching
  // demo/carry, so the two channels are averaged rather than one being taken:
  // dropping a channel loses half of anything panned.
  const STEREO_BYTES = FRAME * 2 * 2;        // 960 frames x 2 ch x 2 bytes
  let carry = Buffer.alloc(0);
  const audioIn = createReadStream(null, { fd: rfd, autoClose: false });
  audioIn.on('data', (chunk) => {
    carry = carry.length ? Buffer.concat([carry, chunk]) : chunk;
    while (carry.length >= STEREO_BYTES) {
      const mono = new Int16Array(FRAME);
      for (let i = 0; i < FRAME; i++) {
        mono[i] = (carry.readInt16LE(i * 4) + carry.readInt16LE(i * 4 + 2)) >> 1;
      }
      carry = carry.subarray(STEREO_BYTES);
      onFrame?.(mono);
    }
  });

  // Its complaints are the only clue when a soundfont path is wrong, and a
  // missing soundfont is silent otherwise — it starts, and plays nothing.
  p.stderr.on('data', (d) => {
    const s = String(d).trim();
    if (s && !/^>/.test(s)) onLog?.(s);
  });

  const cmd = (line) => { if (!p.killed && p.stdin.writable) p.stdin.write(line + '\n'); };

  return {
    proc: p,
    // `select <chan> <sfont> <bank> <prog>` — sfont 1 is the first one loaded.
    // This is the whole multitimbral surface: one call per channel, and the
    // sixteen channels are then sixteen instruments.
    select: (channel, program) => cmd(`select ${channel} 1 0 ${program}`),
    noteOn: (channel, note, vel = 100) => cmd(`noteon ${channel} ${note} ${vel}`),
    noteOff: (channel, note) => cmd(`noteoff ${channel} ${note}`),
    cc: (channel, ctrl, val) => cmd(`cc ${channel} ${ctrl} ${val}`),
    panic: () => { for (let c = 0; c < 16; c++) cmd(`cc ${c} 123 0`); },
    stop: () => {
      try { cmd('quit'); } catch { /* already gone */ }
      setTimeout(() => {
        p.kill('SIGTERM');
        try { audioIn.destroy(); } catch { /* already closed */ }
        try { unlinkSync(fifo); } catch { /* already gone */ }
      }, 150);
    },
  };
}

/** Is it installed? A clear answer beats a spawn that fails asynchronously. */
export function fluidAvailable() {
  try { execFileSync('which', ['fluidsynth'], { stdio: 'pipe' }); return true; }
  catch { return false; }
}

/** And is there a soundfont? Without one fluidsynth starts and plays silence. */
export function soundfontAt(path = DEFAULT_SF) {
  return existsSync(path) ? path : null;
}
