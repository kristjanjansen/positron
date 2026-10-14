// demo/shell/xr-glb.mjs: enough of glTF 2.0 to draw the two vendored controller models,
// runnable under node. It refuses by name what it cannot read, and the caller falls back
// to the primitive stand-in. Take a library for animated parts, skins, PBR, Draco or KTX2.
// why: lessons/kit-xr-glb.md#header

// Checked against three.js GLTFLoader v0.186.0 (MIT): chunk loop, component types and
// type sizes copied exactly, since a wrong entry parses cleanly and draws garbage.
// xr-glb-test.mjs grades the parse on the real bytes (6.8 x 6.0 x 12.3 cm).
// why: lessons/kit-xr-glb.md#container
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
 * @param {ArrayBuffer} buf
 * @returns {{positions:Float32Array, normals:Float32Array, uvs:Float32Array,
 *            count:number, image:{bytes:Uint8Array, mime:string}|null,
 *            baseColor:number[], stats:object}}
 * Every primitive is baked into one flat, de-indexed triangle list in scene space,
 * so the trigger and thumbstick do not move.
 * why: lessons/kit-xr-glb.md#read-glb
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
    // The length is already padded by the spec; an unaligned one is refused, never rounded up.
    // why: lessons/kit-xr-glb.md#chunk-length
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

  // Refuse on extensionsRequired first: Draco and KTX2 would parse into plausible nothing.
  // why: lessons/kit-xr-glb.md#extensions-required
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
    // A sparse accessor is refused: ignoring its overrides draws a plausible wrong mesh.
    // Neither vendored file uses one (0 of 23 accessors).
    // why: lessons/kit-xr-glb.md#sparse
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
            // Normals are rotated, not translated; no shear here, so no inverse-transpose is needed.
            // why: lessons/kit-xr-glb.md#normals
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
