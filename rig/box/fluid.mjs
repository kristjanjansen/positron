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
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

export const RATE = 48000;
export const FRAME = 960;                    // 20 ms -> 50 messages a second

// Debian and Pi OS put the GM soundfont here (package: fluid-soundfont-gm).
// 141 MB on disk and 141 MB in RAM — fluidsynth has NO mmap and no disk
// streaming anywhere in fluid_defsfont.c / fluid_samplecache.c, so a soundfont
// is loaded whole or not at all. That is the ceiling on this box: a library
// bigger than RAM cannot be used, however much card you put in it.
export const DEFAULT_SF = '/usr/share/sounds/sf2/FluidR3_GM.sf2';

/** General MIDI program numbers worth naming, so a client need not know GM. */
export const VOICES = {
  piano: 0, rhodes: 4, clav: 7, vibes: 11, organ: 16, guitar: 24, nylon: 24,
  bass: 33, fretless: 35, strings: 48, choir: 52, trumpet: 56, sax: 65,
  flute: 73, square: 80, saw: 81, pad: 89, bells: 98, kalimba: 108,
};

/**
 * ⚠️ `startFluid` WAS HERE AND IS GONE, 2026-09-11.
 *
 * It ran FluidSynth with the `file` audio driver writing realtime PCM into a
 * FIFO — one process, no jackd — and it was kept for two reasons that both
 * turned out to be wrong when measured:
 *
 *   EFFICIENCY. It is not cheaper. 12.8% of 400 against the JACK path's 12.3%,
 *   and 84 ms to the ear against 74 ms. The FIFO's buffering costs more than
 *   jackd's period does.
 *
 *   NO KERNEL NEEDED. True, and not exclusive. In an arm64 container with no
 *   /dev/snd and no realtime privileges, `jackd -r -d dummy` came up and the
 *   graph carried 144,021 samples at peak 0.1096 in three seconds. jackd's
 *   dummy driver is software timing for the same reason the `file` driver was.
 *
 * What the pipe cost was the thing that mattered: the granular insert is a JACK
 * insert, so General MIDI could not be granulated at all. `git show 0ca0d67^`.
 *
 * What stays below is the part that was never about the transport — the General
 * MIDI name table, the default soundfont, and the two checks that answer
 * whether this board can play sampled instruments at all.
 */

export function fluidAvailable() {
  try { execFileSync('which', ['fluidsynth'], { stdio: 'pipe' }); return true; }
  catch { return false; }
}

/** And is there a soundfont? Without one fluidsynth starts and plays silence. */
export function soundfontAt(path = DEFAULT_SF) {
  return existsSync(path) ? path : null;
}
