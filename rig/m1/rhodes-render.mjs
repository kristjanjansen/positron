// Render the FM Rhodes to a WAV and measure what it costs per sample.
//
//   node rhodes-render.mjs [out.wav]
//
// The cost number is the point: it decides whether a SINGLE-core board can carry
// the synth and the network at once, which is the difference between an ESP32-C6
// in a Tallinn shop today and an S3 ordered from abroad. Measured here as a
// realtime factor on this machine, then scaled to the microcontroller — and the
// scaling is an ESTIMATE, labelled as one, because a 240 MHz Xtensa is not a
// slower M-series and no benchmark here has ever run on that chip.
import { writeFileSync } from 'node:fs';
import { rhodesVoice, mixVoices } from '../../demo/shell/rhodes.mjs';

const RATE = 48000;
const OUT = process.argv[2] || 'rhodes.wav';

// A phrase rather than a scale: a chord, an arpeggio, then a hard-then-soft pair
// so the velocity response is audible instead of asserted.
const NOTES = [
  [0.00, 65, 100], [0.00, 69, 96], [0.00, 72, 96], [0.00, 76, 92],       // Fmaj7
  [1.20, 60, 100], [1.35, 64, 100], [1.50, 67, 100], [1.65, 71, 100],
  [1.80, 72, 100], [1.95, 76, 100],
  [2.80, 53, 118], [2.80, 60, 118], [2.80, 64, 118],                      // struck hard
  [4.00, 53, 34],  [4.00, 60, 34],  [4.00, 64, 34],                       // struck soft
  [5.30, 41, 110], [5.30, 48, 100], [5.30, 55, 96], [5.30, 59, 92], [5.30, 64, 88],
];
const SECS = 8;
const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);

const voices = NOTES.map(([t0, note, vel]) => ({ v: rhodesVoice(hz(note), vel), t0 }));
const n = RATE * SECS;
const pcm = new Int16Array(n);

const t0 = process.hrtime.bigint();
for (let i = 0; i < n; i++) {
  const s = mixVoices(voices, i / RATE);
  pcm[i] = Math.max(-32768, Math.min(32767, Math.round(s * 32767)));
}
const ms = Number(process.hrtime.bigint() - t0) / 1e6;

// --- WAV, 16-bit mono ------------------------------------------------------
const hdr = Buffer.alloc(44);
hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + pcm.byteLength, 4); hdr.write('WAVE', 8);
hdr.write('fmt ', 12); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(1, 22);
hdr.writeUInt32LE(RATE, 24); hdr.writeUInt32LE(RATE * 2, 28); hdr.writeUInt16LE(2, 32); hdr.writeUInt16LE(16, 34);
hdr.write('data', 36); hdr.writeUInt32LE(pcm.byteLength, 40);
writeFileSync(OUT, Buffer.concat([hdr, Buffer.from(pcm.buffer)]));

const realtime = (SECS * 1000) / ms;
const perSampleNs = (ms * 1e6) / n;
console.log(`wrote ${OUT} — ${SECS}s, ${RATE} Hz mono, ${NOTES.length} notes`);
console.log(`rendered in ${ms.toFixed(0)} ms  =  ${realtime.toFixed(0)}x realtime on this Mac`);
console.log(`per sample: ${perSampleNs.toFixed(1)} ns with ${NOTES.length} voices allocated`);
console.log(`\nBudget at 48 kHz: one sample every 20.8 us.`);
console.log(`  this machine uses ${(perSampleNs / 1000).toFixed(2)} us of it — ${(perSampleNs / 20833 * 100).toFixed(2)}% of one core`);
console.log(`\nESTIMATE, not a measurement: an ESP32 core at 240 MHz is roughly`);
console.log(`50x slower single-thread than this one, so ~${(perSampleNs / 20833 * 100 * 50).toFixed(0)}% of one ESP32 core`);
console.log(`for ${NOTES.length} voices — and 8 simultaneous voices is the realistic case, not 21.`);
console.log(`Settle it on the chip; this only says whether it is close.`);
