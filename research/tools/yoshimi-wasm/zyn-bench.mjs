// Bench the gboddin ZynAddSubFX wasm (v0.2.0) in node: boot, patch load time, render cost.
import fs from 'node:fs';
import zlib from 'node:zlib';
const W = '../zrel/web/';
const { default: createZynModule } = await import(W + 'zyn_wasm.js');
const wasmBinary = fs.readFileSync(W + 'zyn_wasm.wasm');
const quiet = process.env.V ? console.error : () => {};
let t0 = performance.now();
const z = await createZynModule({ wasmBinary, print: quiet, printErr: quiet });
const tInst = performance.now() - t0;
const SR = 48000;
t0 = performance.now(); z._zyn_init(SR); const tInit = performance.now() - t0;
const mem = () => (z.HEAPU8.buffer.byteLength / 1048576).toFixed(0) + ' MiB';
console.log(`instantiate ${tInst.toFixed(0)} ms, zyn_init ${tInit.toFixed(0)} ms, heap ${mem()}`);
const out = z._zyn_get_output_buffer_ptr();
function load(xml) {
  const b = Buffer.from(xml + '\0', 'utf8'); const p = z._malloc(b.length); z.HEAPU8.set(b, p);
  const t = performance.now(); z._zyn_load_part_patch(0, p); const dt = performance.now() - t; z._free(p); return dt;
}
function render(blocks) { // returns {ms, rms}
  let s = 0, n = 0; const t = performance.now();
  for (let i = 0; i < blocks; i++) { z._zyn_process(out, 128, 2); const h = z.HEAPF32; const o = out >> 2; for (let j = 0; j < 256; j++) { s += h[o + j] ** 2; n++; } }
  return { ms: performance.now() - t, rms: Math.sqrt(s / n) };
}
const midi = (st, a, b) => z._zyn_midi_event(((st << 24) | (a << 16) | (b << 8)) >>> 0);
const files = process.argv.slice(2);
for (const f of files) {
  let raw = fs.readFileSync(f); try { raw = zlib.gunzipSync(raw); } catch {}
  const before = mem(); const tl = load(raw.toString('utf8'));
  render(10);
  const blocks1s = Math.round(SR / 128);
  // one note
  midi(0x90, 57, 100); const one = render(blocks1s * 2); midi(0x80, 57, 0); render(blocks1s * 3);
  // eight-note chord
  const chord = [48, 52, 55, 59, 60, 64, 67, 71]; chord.forEach((n) => midi(0x90, n, 100));
  const eight = render(blocks1s * 2); chord.forEach((n) => midi(0x80, n, 0)); render(blocks1s * 3);
  const idle = render(blocks1s);
  const rt = (r, secs) => ((r.ms / (secs * 1000)) * 100).toFixed(1) + '%';
  console.log(`${f.split('/').pop()}: load ${tl.toFixed(0)} ms, heap ${before} -> ${mem()}; 1 voice ${rt(one, 2)} of one core rms ${one.rms.toFixed(3)}; 8 voices ${rt(eight, 2)} rms ${eight.rms.toFixed(3)}; idle ${rt(idle, 1)}`);
}
