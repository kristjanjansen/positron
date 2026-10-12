// What essentia.js (the wasm build, npm essentia.js 0.1.3) costs per window, in
// node on this laptop, as a stand in for a browser tab. Nothing native.
//   npm i --prefix <dir> essentia.js@0.1.3
//   NODE_PATH=<dir>/node_modules node research/tools/tempo-key/essentia-js-cost.cjs <in.f32>
// <in.f32> as for our-tempo.mjs. The windows are 100 to 112 s and 70 to 100 s of it.
const { Essentia, EssentiaWASM } = require('essentia.js');
const fs = require('fs');
const e = new Essentia(EssentiaWASM);
const raw = fs.readFileSync(process.argv[2]);
const x = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength >> 2);
const SR = 44100;
const seg = (a, b) => e.arrayToVector(x.subarray(a * SR, b * SR));
let t = performance.now();
const r = e.RhythmExtractor2013(seg(100, 112), 208, 'multifeature', 40);
console.log('RhythmExtractor2013 multifeature 12 s:', r.bpm.toFixed(1), (performance.now() - t).toFixed(0), 'ms');
t = performance.now();
const r2 = e.RhythmExtractor2013(seg(100, 112), 208, 'degara', 40);
console.log('RhythmExtractor2013 degara 12 s:', r2.bpm.toFixed(1), (performance.now() - t).toFixed(0), 'ms');
t = performance.now();
const p = e.PercivalBpmEstimator(seg(100, 112));
console.log('PercivalBpmEstimator 12 s:', p.bpm.toFixed(1), (performance.now() - t).toFixed(0), 'ms');
t = performance.now();
const k = e.KeyExtractor(seg(70, 100), true, 4096, 4096, 12, 3500, 60, 25, 0.2, 'edma', 44100, 0.0001, 440, 'cosine', 'hann');
console.log('KeyExtractor edma 30 s:', k.key, k.scale, k.strength.toFixed(2), (performance.now() - t).toFixed(0), 'ms');
console.log('version', e.version);
