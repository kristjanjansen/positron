// Bench jariseon's 2019 Yoshimi WAM build in node: same patches, same measures as zyn-bench.
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const D = path.resolve(__dirname, '../jy/wam/dist/worklet/');
const quiet = process.env.V ? console.error : () => {};
globalThis.AudioWorkletGlobalScope = { WAM: { YOSHIMI: { wasmBinary: new Uint8Array(fs.readFileSync(D + '/yoshimi.wasm')), print: quiet, printErr: quiet } } };
let t0 = performance.now();
(0, eval)(fs.readFileSync(D + '/yoshimi.js', 'utf8'));
const W = AudioWorkletGlobalScope.WAM.YOSHIMI;
function go() {
  const tInst = performance.now() - t0;
  const SR = 48000;
  const inst = W._createModule();
  t0 = performance.now();
  W.cwrap('wam_init', null, ['number','number','number','string'])(inst, 128, SR, '');
  const tInit = performance.now() - t0;
  const mem = () => (W.HEAPU8.buffer.byteLength / 1048576).toFixed(0) + ' MiB';
  console.log(`instantiate ${tInst.toFixed(0)} ms, init ${tInit.toFixed(0)} ms, heap ${mem()}`);
  const obufs = W._malloc(8), bus = W._malloc(8), L = W._malloc(512), R = W._malloc(512);
  W.setValue(obufs, L, 'i32'); W.setValue(obufs + 4, R, 'i32'); W.setValue(bus, 0, 'i32'); W.setValue(bus + 4, obufs, 'i32');
  const midi = (s, a, b) => W._wam_onmidi(inst, s, a, b);
  const render = (blocks) => { let s = 0, n = 0; const t = performance.now(); for (let i = 0; i < blocks; i++) { W._wam_onprocess(inst, bus, 0); const h = W.HEAPF32; for (let j = 0; j < 128; j++) { s += h[(L >> 2) + j] ** 2 + h[(R >> 2) + j] ** 2; n += 2; } } return { ms: performance.now() - t, rms: Math.sqrt(s / n) }; };
  const load = (xml) => { const t = performance.now(); W.cwrap('wam_onmessageS', null, ['number','string','string','string'])(inst, 'set', 'patch', xml); return performance.now() - t; };
  const sweep = process.argv[2] === '--sweep';
  const files = sweep ? [] : process.argv.slice(2);
  if (sweep) { const root = path.resolve(__dirname, '../jy/banks'); for (const b of fs.readdirSync(root)) { const d = path.join(root, b); if (fs.statSync(d).isDirectory()) for (const f of fs.readdirSync(d)) if (f.endsWith('.xiz')) files.push(path.join(d, f)); } }
  const rows = []; const bs = Math.round(SR / 128);
  for (const f of files) {
    let raw = fs.readFileSync(f); try { raw = zlib.gunzipSync(raw); } catch {}
    const xml = raw.toString('utf8'); const pad = /PADsynth_used" value="yes/.test(xml);
    const before = mem(); const tl = load(xml); render(10);
    let one = { ms: 0, rms: 0 };
    if (!sweep) { midi(0x90, 57, 100); one = render(bs * 2); midi(0x80, 57, 0); render(bs * 3); }
    const chord = [48, 52, 55, 59, 60, 64, 67, 71]; chord.forEach((n) => midi(0x90, n, 100));
    const eight = render(sweep ? 375 : bs * 2); chord.forEach((n) => midi(0x80, n, 0)); render(sweep ? 750 : bs * 3);
    const secs = sweep ? 1 : 2;
    rows.push({ name: f, pad, load: tl, cpu8: eight.ms / (secs * 10) });
    if (!sweep) console.log(`${path.basename(f)}: load ${tl.toFixed(0)} ms, heap ${before} -> ${mem()}; 1 voice ${(one.ms / 20).toFixed(1)}% rms ${one.rms.toFixed(3)}; 8 voices ${(eight.ms / 20).toFixed(1)}% rms ${eight.rms.toFixed(3)}`);
  }
  if (sweep) {
    const q = (a, k) => { const s = a.map((r) => r[k]).sort((x, y) => x - y); return [0.5, 0.95, 1].map((p) => s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(1)).join(' / '); };
    for (const [label, set] of [['all', rows], ['PADsynth', rows.filter((r) => r.pad)], ['no PAD', rows.filter((r) => !r.pad)]]) console.log(`${label} n=${set.length}: load ms p50/p95/max ${q(set, 'load')}; 8 voices % p50/p95/max ${q(set, 'cpu8')}`);
    console.log('final heap', mem());
  }
}
if (W.calledRun || W.asm) setTimeout(go, 0); else W.onRuntimeInitialized = go;
