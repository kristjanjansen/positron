// rig/board/bench.mjs — how much of this board one instrument costs.
//
// synth.mjs claims a Pi 4 runs 8 voices at 3-4x realtime, derived from 41x on
// an M1 and a guess at the ratio between the chips. A guess in a comment is a
// claim nobody can check, so: run this on the board and the measured number
// replaces it.
//
//   node bench.mjs
import { createSynth, RATE } from './synth.mjs';
import { cpus, loadavg } from 'node:os';

console.log(`${cpus()[0]?.model?.trim() ?? 'unknown cpu'} x${cpus().length}, load ${loadavg()[0].toFixed(2)}\n`);
console.log('voices   render      realtime   one core');

for (const n of [1, 4, 8, 16]) {
  const s = createSynth({ maxVoices: 64 });
  // Held, not struck-and-released: the worst case a realtime budget must
  // survive is every voice sounding at once, not the average.
  for (let i = 0; i < n; i++) s.noteOn(48 + i * 3, 110);
  const SECS = 5, chunks = Math.round(SECS * RATE / 960);
  const t0 = performance.now();
  for (let c = 0; c < chunks; c++) s.render(960);
  const ms = performance.now() - t0;
  const x = SECS * 1000 / ms;
  console.log(`${String(n).padStart(6)}   ${ms.toFixed(0).padStart(5)} ms   ${x.toFixed(1).padStart(6)}x   ${(100 / x).toFixed(0).padStart(6)}%`);
}
console.log('\n"one core" is the share of a single core one instrument needs.');
console.log('Under ~50% leaves room for the socket, the OS and a second voice bank.');
