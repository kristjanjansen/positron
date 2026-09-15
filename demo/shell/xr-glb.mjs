// demo/shell/xr-glb.mjs — enough of glTF 2.0 to draw the two controller models
// this repo vendors, and nothing else.
//
// 🔴 NOT A glTF LIBRARY, AND THAT IS THE POINT. The same argument that keeps a
// markdown library out of this repo for two asterisks: three.js is 600 KB to
// draw boxes, and a general loader would carry sparse accessors, Draco, KTX2,
// skins, animation samplers, morph targets and a scene graph — none of which
// these two files contain. What they DO contain was measured before a line was
// written (`node demo/shell/xr-glb-test.mjs` re-measures it):
//
//   glTF 2.0 · NO extensionsUsed, NO extensionsRequired
//   31 nodes · 6 meshes · 23 accessors · 1 material · 1 texture · 1 PNG
//   attributes POSITION / NORMAL / TEXCOORD_0 · indexed triangles
//   no skins, no animations, no cameras, no sparse accessors
//
// 🔴 SO IT REFUSES WHAT IT CANNOT READ RATHER THAN DRAWING SOMETHING
// APPROXIMATE. `synthdef-audio.mjs` already sets that rule here: a reader that
// silently skips the part it does not understand produces a picture that is
// WRONG in a way nobody can see, and a wrong picture of a real object is worse
// than an obvious stand-in. Every refusal below names the thing it met.
//
// ⚠️ AND A REFUSAL IS NOT FATAL TO THE PAGE. The caller falls back to the
// primitive stand-in and says on the tablet's own footer which one you are
// looking at. A headset we have never seen still gets a controller.
//
// ⚠️ IT RUNS UNDER NODE. Nothing here touches WebGL, the DOM or `fetch` — it
// takes an ArrayBuffer and returns plain arrays — so the whole parser is graded
// on a laptop against the real 217,984 bytes rather than on a head.
//
// ── what this cost, against what it was predicted to cost ─────────────────
//
// 🔴 THE ESTIMATE THAT ARGUED AGAINST DOING THIS AT ALL CARRIED A FREE ITEM.
// It read: "a container parser AND an accessor decoder AND a node walk AND a
// PNG DECODE AND a third program". **The PNG decode is not work.** The image is
// a byte range inside the file; it goes to `createImageBitmap` as a Blob and
// the browser decodes it — one `await` and one `texImage2D`, which this repo
// already does for every panel it hangs in a room. Carrying a free item made
// the rejection look more expensive than it was, and an argument that does that
// is wrong even when its conclusion happens to be defensible.
//
// MEASURED, after the fact: **181 lines of code here** (272 with the comments)
// and 106 in the test beside it. That is roughly what four of those five items
// should cost and it is not close to a library.
//
// 🔴 WHEN TO STOP DEFENDING THIS AND TAKE A LIBRARY — a decision with no stated
// expiry is how a hand-rolled thing quietly becomes a project. The trigger is
// any ONE of:
//
//   · animated parts — a trigger that tilts when you pull it. That needs the
//     node hierarchy kept LIVE rather than baked, plus the profile's
//     `visualResponses`, and the baking below is most of why this is short.
//   · skinning, morph targets, or more than one material.
//   · real PBR — metallic-roughness with its own maps, IBL, KHR extensions.
//   · a second family of models that needs Draco or KTX2, both of which arrive
//     through `extensionsRequired` and are refused by name below.
//
// ⚠️ AND THE RULE BEHIND THAT, WHICH IS WORTH MORE THAN THIS FILE: a library is
// right when the thing is a DEPENDENCY of the work, hand-writing is right when
// it is the SUBJECT. The timeline, the strip and the diagram engine are the
// subject — writing them is how this repo came to know that `gl.clear` ignores
// the viewport. Controller meshes are a dependency; nobody learns anything from
// the four-hundredth glTF parser. That points at a library, and three.js is
// still the wrong one: it is not a loader, it is a whole renderer, and adopting
// it means rewriting both XR pages and throwing away the per-eye loop, the
// blend modes and the four measured GL traps that live in their comments. Large
// price, small problem. `LAYOUT.md` carries the rule.

// ── the container, and the two tables ─────────────────────────────────────
// 🔴 CHECKED AGAINST three.js `examples/jsm/loaders/GLTFLoader.js`, **v0.186.0,
// MIT** (Copyright © 2010-2025 three.js authors), read 2026-09-13. The code
// here was written from the specification first and then diffed against that
// file; everything below matched it exactly, which is the point of saying so —
// a table that agrees with the reference implementation is a different kind of
// claim from a table somebody transcribed carefully.
//
// What was compared, and what came of it:
//
//   `GLTFBinaryExtension`      the container. three.js keeps the magic as the
//                              STRING 'glTF'; this keeps it as the little-
//                              endian uint32 0x46546c67, which is the same four
//                              bytes and one fewer decode. Its chunk loop and
//                              this one agree, INCLUDING that an unknown chunk
//                              type is skipped rather than refused — the spec
//                              says clients must ignore them.
//                              ⚠️ AND IT CORRECTED A BUG HERE. This file used
//                              to round each chunk length UP to the next
//                              multiple of four before advancing. three.js does
//                              not, because the spec requires the length to be
//                              padded ALREADY — so the round-up was a second,
//                              silent padding that would have walked past the
//                              binary chunk of any file whose JSON chunk was
//                              not a multiple of four. Both vendored files
//                              happen to be aligned (10,768 bytes), so every
//                              test passed and the bug was invisible. It now
//                              advances by exactly the length and REFUSES an
//                              unaligned one by name.
//   `WEBGL_COMPONENT_TYPES`    identical, all six entries. There is no 5124 in
//   `WEBGL_TYPE_SIZES`         either — Int32 is not a glTF component type —
//                              and MAT2/MAT3 were missing here and are not now.
//                              🔴 COPIED EXACTLY, because a wrong entry parses
//                              cleanly and draws garbage: a table bug wearing a
//                              rendering bug's clothes, which is the thing
//                              `synthdef.mjs`'s OP table has a comment about.
//   `loadAccessor`             its `byteStride` handling is the same rule this
//                              uses. Its SPARSE path was read and then
//                              DELIBERATELY NOT IMPLEMENTED — see the refusal
//                              below. Its `normalized` handling likewise.
//
// ⚠️ AND THE GRADER IS THE FILE, NOT THE READING. `xr-glb-test.mjs` parses the
// real vendored bytes and checks the result is controller-SHAPED — 6.8 x 6.0 x
// 12.3 cm, unit normals, texture coordinates inside the picture, a PNG that
// starts with a PNG signature. A table can only be called right when the file
// it parses comes out looking like the object it is of.
const MAGIC = 0x46546c67;      // 'glTF', little-endian
const JSON_CHUNK = 0x4e4f534a; // 'JSON'
const BIN_CHUNK = 0x004e4942;  // 'BIN\0'

/** componentType -> [TypedArray, bytes]. Anything else is a refusal. */
const COMPONENT = {
  5120: [Int8Array, 1], 5121: [Uint8Array, 1],
  5122: [Int16Array, 2], 5123: [Uint16Array, 2],
  5125: [Uint32Array, 4], 5126: [Float32Array, 4],
};
/** accessor type -> how many components. */
const NUMS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };

const refuse = (why) => { throw new Error(`this model uses something the reader does not implement: ${why}`); };

/** Column-major 4x4 multiply, the same convention xr-room.mjs uses. */
const mul4 = (a, b) => {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
    o[c * 4 + r] = s;
  }
  return o;
};

/** A node's own transform: `matrix`, or translation/rotation/scale composed. */
function localM(n) {
  if (n.matrix) {
    if (n.matrix.length !== 16) refuse('a node matrix that is not 16 numbers');
    return new Float32Array(n.matrix);
  }
  const [tx, ty, tz] = n.translation || [0, 0, 0];
  const [qx, qy, qz, qw] = n.rotation || [0, 0, 0, 1];
  const [sx, sy, sz] = n.scale || [1, 1, 1];
  // quaternion -> rotation, written out because it is nine lines and the
  // alternative is a dependency. glTF stores (x, y, z, w), w LAST.
  const x2 = qx + qx, y2 = qy + qy, z2 = qz + qz;
  const xx = qx * x2, xy = qx * y2, xz = qx * z2;
  const yy = qy * y2, yz = qy * z2, zz = qz * z2;
  const wx = qw * x2, wy = qw * y2, wz = qw * z2;
  return new Float32Array([
    (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
    (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
    (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
    tx, ty, tz, 1,
  ]);
}

/**
 * Read a `.glb`.
 *
 * @param {ArrayBuffer} buf
 * @returns {{positions:Float32Array, normals:Float32Array, uvs:Float32Array,
 *            count:number, image:{bytes:Uint8Array, mime:string}|null,
 *            baseColor:number[], stats:object}}
 *
 * 🔴 EVERY PRIMITIVE IS BAKED INTO ONE FLAT TRIANGLE LIST, IN SCENE SPACE.
 * These models are 6 meshes across 31 nodes and ONE material, so the
 * alternative — a VAO and a draw call per primitive, with the node hierarchy
 * kept live — buys exactly one thing: moving parts, a trigger that tilts when
 * you pull it. That is not what a controller in this room is for; it is here to
 * answer "where is my hand", which a rigid model answers completely. ⚠️ Say so
 * rather than leave it to be discovered: THE TRIGGER AND THE THUMBSTICK DO NOT
 * MOVE, and making them move means keeping `nodes` and walking the profile's
 * `visualResponses`, which is a different piece of work and a bigger one.
 *
 * Indices are resolved here too, so the caller gets `drawArrays` and never
 * needs an element buffer — 27k vertices against 9k is a few hundred kilobytes
 * of GPU memory, once, for two models, and it removes a whole class of
 * index-type bug from the drawing.
 */
export function readGLB(buf) {
  if (!(buf instanceof ArrayBuffer)) refuse('something that is not an ArrayBuffer');
  if (buf.byteLength < 20) refuse(`a file of only ${buf.byteLength} bytes`);
  const dv = new DataView(buf);
  if (dv.getUint32(0, true) !== MAGIC) refuse('a file that does not start with the glTF magic');
  const version = dv.getUint32(4, true);
  if (version !== 2) refuse(`glTF version ${version}; this reads version 2`);
  const total = dv.getUint32(8, true);
  if (total > buf.byteLength) refuse(`a header claiming ${total} bytes in a file of ${buf.byteLength}`);

  let json = null, bin = null, at = 12;
  while (at + 8 <= total) {
    const len = dv.getUint32(at, true), kind = dv.getUint32(at + 4, true);
    const start = at + 8;
    if (start + len > total) refuse('a chunk that runs off the end of the file');
    // 🔴 THE LENGTH IS ALREADY PADDED, so nothing is added to it here. See the
    // note on `GLTFBinaryExtension` at the top of this file: rounding up was a
    // second padding, and it was invisible because both vendored files happen
    // to be aligned.
    if (len % 4) refuse(`a chunk of ${len} bytes, which the spec requires to be padded to a multiple of four`);
    if (kind === JSON_CHUNK) json = new TextDecoder().decode(new Uint8Array(buf, start, len));
    else if (kind === BIN_CHUNK) bin = new Uint8Array(buf, start, len);
    // any other chunk type is allowed by the spec to be ignored
    at = start + len;
  }
  if (!json) refuse('no JSON chunk');
  let g;
  try { g = JSON.parse(json); } catch (e) { refuse(`a JSON chunk that will not parse: ${e.message}`); }
  if (!bin) refuse('no binary chunk; only self-contained .glb files are read');

  // 🔴 REFUSE ON `extensionsRequired` BEFORE ANYTHING ELSE. That array is the
  // file telling you, in the spec's own words, that it cannot be drawn
  // correctly without them — Draco geometry and KTX2 textures both arrive this
  // way, and both would otherwise parse into a plausible-looking nothing.
  if (g.extensionsRequired?.length) refuse(`extensions it requires: ${g.extensionsRequired.join(', ')}`);
  if ((g.buffers || []).length !== 1) refuse(`${(g.buffers || []).length} buffers; a .glb has exactly one`);
  if (g.skins?.length) refuse('a skin (skinned meshes are not drawn here)');
  if (g.animations?.length) refuse('animations');

  const view = (i) => {
    const v = g.bufferViews?.[i];
    if (!v) refuse(`a missing bufferView ${i}`);
    if ((v.buffer ?? 0) !== 0) refuse('a bufferView pointing at a buffer other than the binary chunk');
    return v;
  };

  /** One accessor, as a flat array of numbers. */
  function read(i) {
    const a = g.accessors?.[i];
    if (!a) refuse(`a missing accessor ${i}`);
    // 🔴 READ IN three.js AND DELIBERATELY NOT IMPLEMENTED. A sparse accessor
    // is a base array plus a list of (index, value) overrides; ignoring the
    // overrides parses cleanly and draws the UN-overridden mesh, which is a
    // model that is present, plausible and wrong. Neither vendored file uses
    // one — checked, 0 of 23 accessors — so this is a refusal rather than a
    // gap, and it names itself if a future model needs it.
    if (a.sparse) refuse('a sparse accessor (read in three.js, deliberately not implemented here)');
    // Likewise `normalized`: an integer attribute that means a fraction. 0 of
    // 23 here, and silently reading the raw integers would put positions
    // thousands of times too large.
    if (a.normalized) refuse('a normalized integer accessor');
    const comp = COMPONENT[a.componentType];
    if (!comp) refuse(`component type ${a.componentType}`);
    const [TA, size] = comp;
    const nums = NUMS[a.type];
    if (!nums) refuse(`accessor type ${a.type}`);
    if (a.bufferView === undefined) {
      // legal, and it means all zeros — but for geometry it is never what you
      // want, so it is named rather than quietly filled in
      refuse('an accessor with no bufferView (zero-filled geometry)');
    }
    const v = view(a.bufferView);
    const base = (v.byteOffset || 0) + (a.byteOffset || 0);
    const stride = v.byteStride || nums * size;
    const out = new Float64Array(a.count * nums);
    for (let e = 0; e < a.count; e++) {
      const off = bin.byteOffset + base + e * stride;
      if (off + nums * size > bin.byteOffset + bin.byteLength) refuse('an accessor that reads past the binary chunk');
      const t = new TA(bin.buffer, off, nums);
      for (let k = 0; k < nums; k++) out[e * nums + k] = t[k];
    }
    return out;
  }

  // ── the node hierarchy, flattened ───────────────────────────────────────
  const scene = g.scenes?.[g.scene ?? 0];
  if (!scene) refuse('no scene');
  const P = [], N = [], UV = [];
  const seen = new Set();
  let prims = 0, meshes = 0;

  function walk(idx, parent) {
    if (seen.has(idx)) refuse('a node that is its own ancestor');
    seen.add(idx);
    const node = g.nodes?.[idx];
    if (!node) refuse(`a missing node ${idx}`);
    const world = mul4(parent, localM(node));
    if (node.mesh !== undefined) {
      const m = g.meshes?.[node.mesh];
      if (!m) refuse(`a missing mesh ${node.mesh}`);
      meshes++;
      for (const p of m.primitives || []) {
        // mode 4 is TRIANGLES; strips, fans, lines and points would all draw
        // as nonsense through a triangle pipeline
        if ((p.mode ?? 4) !== 4) refuse(`primitive mode ${p.mode} (only triangles)`);
        if (p.attributes?.POSITION === undefined) refuse('a primitive with no POSITION');
        const pos = read(p.attributes.POSITION);
        const nrm = p.attributes.NORMAL !== undefined ? read(p.attributes.NORMAL) : null;
        const uv = p.attributes.TEXCOORD_0 !== undefined ? read(p.attributes.TEXCOORD_0) : null;
        const idxs = p.indices !== undefined ? read(p.indices) : null;
        const n = idxs ? idxs.length : pos.length / 3;
        if (n % 3) refuse('a triangle list whose length is not a multiple of three');
        for (let k = 0; k < n; k++) {
          const v = idxs ? idxs[k] : k;
          const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
          // into scene space, by the node's own world matrix
          P.push(world[0] * x + world[4] * y + world[8] * z + world[12],
                 world[1] * x + world[5] * y + world[9] * z + world[13],
                 world[2] * x + world[6] * y + world[10] * z + world[14]);
          if (nrm) {
            const nx = nrm[v * 3], ny = nrm[v * 3 + 1], nz = nrm[v * 3 + 2];
            // ⚠️ ROTATED, NOT TRANSLATED. A normal is a direction: putting it
            // through the full matrix drags it away from the surface by the
            // node's position, which lights the model from a place that moves
            // with the geometry — it looks like a shading bug rather than a
            // matrix one. (These nodes carry no shear or non-uniform scale, so
            // the inverse-transpose the general case wants is the same matrix.)
            const l = Math.hypot(world[0] * nx + world[4] * ny + world[8] * nz,
                                 world[1] * nx + world[5] * ny + world[9] * nz,
                                 world[2] * nx + world[6] * ny + world[10] * nz) || 1;
            N.push((world[0] * nx + world[4] * ny + world[8] * nz) / l,
                   (world[1] * nx + world[5] * ny + world[9] * nz) / l,
                   (world[2] * nx + world[6] * ny + world[10] * nz) / l);
          } else N.push(0, 1, 0);
          if (uv) UV.push(uv[v * 2], uv[v * 2 + 1]);
          else UV.push(0, 0);
        }
        prims++;
      }
    }
    for (const c of node.children || []) walk(c, world);
    seen.delete(idx);
  }
  const I4 = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  for (const r of scene.nodes || []) walk(r, I4);
  if (!P.length) refuse('a scene with no triangles in it');

  // ── the one material ────────────────────────────────────────────────────
  const mat = g.materials?.[0];
  const pbr = mat?.pbrMetallicRoughness || {};
  const baseColor = pbr.baseColorFactor || [1, 1, 1, 1];
  let image = null;
  const texIdx = pbr.baseColorTexture?.index;
  if (texIdx !== undefined) {
    const tex = g.textures?.[texIdx];
    const img = tex && g.images?.[tex.source];
    if (img?.bufferView !== undefined) {
      const v = view(img.bufferView);
      image = {
        bytes: new Uint8Array(bin.buffer, bin.byteOffset + (v.byteOffset || 0), v.byteLength),
        mime: img.mimeType || 'image/png',
      };
    } else if (img?.uri) {
      // a .glb with an external image is a second fetch this never makes
      refuse('a texture stored outside the file (uri)');
    }
  }

  return {
    positions: new Float32Array(P),
    normals: new Float32Array(N),
    uvs: new Float32Array(UV),
    count: P.length / 3,
    image,
    baseColor,
    stats: {
      bytes: buf.byteLength,
      nodes: (g.nodes || []).length,
      meshes,
      primitives: prims,
      accessors: (g.accessors || []).length,
      materials: (g.materials || []).length,
      textured: !!image,
      imageBytes: image ? image.bytes.byteLength : 0,
    },
  };
}
