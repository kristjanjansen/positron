// timeline/lab/midi-recv.mjs — virtual MIDI destination (the ~/personal/midi
// pattern) timestamping arrivals on the truth clock. Writes JSONL rows
// {note, vel, tUs} to the file given as argv[2]. Calibrates its own epoch-µs
// clock against the lab server's /time-local (min-RTT), so page-send stamps
// and arrival stamps share one base.
//   node midi-recv.mjs /path/out.jsonl
import midi from 'midi';
import { appendFileSync } from 'node:fs';

const OUT = process.argv[2];
const t0wall = Date.now() * 1000;
const t0hr = process.hrtime.bigint();
const rawUs = () => t0wall + Number(process.hrtime.bigint() - t0hr) / 1000;

let offUs = 0;
async function calibrate() {
  let best = { rtt: Infinity, off: 0 };
  for (let i = 0; i < 40; i++) {
    const a = rawUs();
    const j = await (await fetch('http://127.0.0.1:8896/time-local')).json();
    const b = rawUs();
    if (b - a < best.rtt) best = { rtt: b - a, off: j.us + (b - a) / 2 - b };
  }
  offUs = best.off;
  console.log(`midi-recv calibrated: off=${best.off.toFixed(1)} us minRtt=${best.rtt.toFixed(0)} us`);
}
const nowUs = () => rawUs() + offUs;

await calibrate();
const input = new midi.Input();
input.ignoreTypes(false, false, false);
input.on('message', (_dt, msg) => {
  const tUs = Math.round(nowUs());
  appendFileSync(OUT, JSON.stringify({ status: msg[0], note: msg[1], vel: msg[2], tUs }) + '\n');
});
input.openVirtualPort('tlab-midi');
console.log('midi-recv: virtual port "tlab-midi" open');
setInterval(() => {}, 1 << 30); // hold process
