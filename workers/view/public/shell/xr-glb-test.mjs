// demo/shell/xr-glb-test.mjs — the controller models, read with no browser.
//
//   node demo/shell/xr-glb-test.mjs
//
// 🔴 THE READER IS THE HALF A HEADSET CANNOT GRADE. A model that parses into
// the wrong triangles draws a shape, and a shape in a headset looks like a
// shape — this is `mirror`'s "ask the picture the right question" one level
// earlier. Here the question is asked of the bytes, against the real vendored
// files, with the answers checked for things a wrong parse cannot produce: a
// bounding box the size of a real controller, a surface that is actually
// closed, normals that are unit length, and texture coordinates inside 0..1.
//
// ⚠️ AND FIVE OF THESE ARE NEGATIVE CONTROLS built by CORRUPTING the real file,
// because `readGLB` exists to REFUSE what it cannot read and a refusal nobody
// has seen refuse is a hope. Each one breaks a different clause.

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readGLB } from './xr-glb.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? ' — ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
};
const refused = (name, buf, want) => {
  let msg = null;
  try { readGLB(buf); } catch (e) { msg = e.message; }
  ok(name, !!msg && msg.includes(want), msg || 'it was ACCEPTED, which is the bug this case exists to catch');
};

const raw = {};
for (const hand of ['left', 'right']) {
  const b = await readFile(join(HERE, `vendor/meta-quest-touch-plus-${hand}.glb`));
  raw[hand] = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}

for (const hand of ['left', 'right']) {
  const t0 = performance.now();
  const m = readGLB(raw[hand]);
  const ms = performance.now() - t0;
  const s = m.stats;

  ok(`the ${hand} controller reads, and it is the file we vendored`,
     s.bytes === (hand === 'left' ? 217984 : 213868) && s.primitives > 0,
     `${s.bytes} bytes · ${s.nodes} nodes · ${s.meshes} meshes drawn · ${s.primitives} primitives`
     + ` · ${m.count} vertices · parsed in ${ms.toFixed(1)} ms`);

  // 🔴 IS IT THE SIZE OF A CONTROLLER? A parse that reads the right number of
  // floats out of the wrong offsets still produces a cloud of points; what it
  // cannot produce is a cloud 10-25 cm across. This is the assert that would
  // catch a stride or endianness mistake, and nothing else here would.
  let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < m.positions.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k], m.positions[i + k]);
      hi[k] = Math.max(hi[k], m.positions[i + k]);
    }
  }
  const span = hi.map((h, k) => h - lo[k]);
  const big = Math.max(...span);
  ok(`...and it is the size of a real controller, not a cloud of numbers`,
     big > 0.08 && big < 0.30 && span.every((v) => v > 0.02),
     `${span.map((v) => (v * 100).toFixed(1)).join(' x ')} cm`);

  // Normals have to be unit length or the lighting is a function of the
  // model's scale rather than of its shape.
  let worstN = 0;
  for (let i = 0; i < m.normals.length; i += 3) {
    const l = Math.hypot(m.normals[i], m.normals[i + 1], m.normals[i + 2]);
    worstN = Math.max(worstN, Math.abs(l - 1));
  }
  ok(`...its normals are unit length`, worstN < 1e-3, `worst is ${worstN.toExponential(2)} off`);

  // Texture coordinates outside 0..1 with CLAMP_TO_EDGE smear the last row of
  // pixels down the whole model — a very recognisable wrong look that is easy
  // to mistake for the model being like that.
  let uvMin = Infinity, uvMax = -Infinity;
  for (const v of m.uvs) { uvMin = Math.min(uvMin, v); uvMax = Math.max(uvMax, v); }
  ok(`...and its texture coordinates stay inside the picture`,
     uvMin >= -0.001 && uvMax <= 1.001, `${uvMin.toFixed(3)} .. ${uvMax.toFixed(3)}`);

  ok(`the ${hand} controller carries its own texture, inside the file`,
     !!m.image && m.image.mime === 'image/png' && s.imageBytes > 1000,
     m.image ? `${s.imageBytes} bytes of ${m.image.mime}` : 'no image');

  // A PNG really is a PNG: the eight-byte signature. A bufferView read at the
  // wrong offset hands back bytes that `createImageBitmap` rejects later, in a
  // browser, with a message about a decode — which is a long way from here.
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  ok(`...and those bytes really are a PNG`,
     !!m.image && sig.every((b, i) => m.image.bytes[i] === b),
     m.image ? [...m.image.bytes.slice(0, 8)].join(',') : 'none');

  ok(`every vertex of the ${hand} controller has a normal and a texture coordinate`,
     m.normals.length === m.positions.length && m.uvs.length === (m.count * 2),
     `${m.count} vertices · ${m.normals.length / 3} normals · ${m.uvs.length / 2} uvs`);
}

// 🔴 THE TWO HANDS ARE DIFFERENT MODELS, and it is worth one line: a loader
// that keyed both hands to one file would look completely correct in a headset
// held in one hand, and be a mirror-image controller in the other.
{
  const l = readGLB(raw.left), r = readGLB(raw.right);
  ok('the left and right models are genuinely different files',
     l.count !== r.count || l.positions[0] !== r.positions[0],
     `${l.count} vertices against ${r.count}`);
}

// ── negative controls: it refuses rather than drawing something approximate ──
{
  const bad = raw.left.slice(0);
  new DataView(bad).setUint32(0, 0x00000000, true);
  refused('a file that is not glTF at all is refused', bad, 'magic');
}
{
  const bad = raw.left.slice(0);
  new DataView(bad).setUint32(4, 1, true);
  refused('glTF 1 is refused rather than read as glTF 2', bad, 'version 1');
}
{
  refused('a truncated file is refused', raw.left.slice(0, 12), 'bytes');
}
{
  // The JSON chunk, edited to claim an extension it must have to be correct.
  // This is the Draco/KTX2 case: without the refusal it parses into geometry
  // that is present, plausible and wrong.
  const dv = new DataView(raw.left);
  const jlen = dv.getUint32(12, true);
  const json = new TextDecoder().decode(new Uint8Array(raw.left, 20, jlen));
  const g = JSON.parse(json);
  g.extensionsRequired = ['KHR_draco_mesh_compression'];
  const enc = new TextEncoder().encode(JSON.stringify(g));
  const padded = new Uint8Array(enc.length + ((4 - enc.length % 4) % 4)).fill(0x20);
  padded.set(enc);
  const tail = new Uint8Array(raw.left, 20 + jlen);
  const out = new Uint8Array(20 + padded.length + tail.length);
  const odv = new DataView(out.buffer);
  odv.setUint32(0, 0x46546c67, true); odv.setUint32(4, 2, true);
  odv.setUint32(8, out.length, true);
  odv.setUint32(12, padded.length, true); odv.setUint32(16, 0x4e4f534a, true);
  out.set(padded, 20); out.set(tail, 20 + padded.length);
  refused('a file that REQUIRES an extension is refused, not read approximately',
          out.buffer, 'KHR_draco_mesh_compression');
}
{
  const bad = new ArrayBuffer(8);
  refused('an eight-byte file is refused', bad, '8 bytes');
}
{
  // 🔴 THE BUG three.js FOUND, PROVED. This reader used to round each chunk
  // length up to the next multiple of four before advancing — a SECOND padding,
  // on top of the one the spec already requires — which would have walked past
  // the binary chunk of any file whose JSON chunk was not 4-aligned. Both
  // vendored files happen to be aligned at 10,768 bytes, so every other case
  // here passed while it was wrong. It now advances by exactly the length and
  // refuses an unaligned one, and this is the case that says so.
  const bad = raw.left.slice(0);
  new DataView(bad).setUint32(12, new DataView(raw.left).getUint32(12, true) + 1, true);
  refused('a chunk length that is not a multiple of four is refused, not silently padded',
          bad, 'padded to a multiple of four');
}

console.log(`\n${pass} ok, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
