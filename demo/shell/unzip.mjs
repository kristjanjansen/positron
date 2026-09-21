// demo/shell/unzip.mjs — a zip file, read in the browser, with nothing vendored.
//
// 🔴 WHY THIS IS NOT A LIBRARY. `DecompressionStream('deflate-raw')` is in every
// browser this project targets and in node, so the only thing a zip library
// would add here is the container: a central directory, a local header and an
// offset. That is about a hundred lines and it is READ ONCE, which is exactly
// `LAYOUT.md`'s test for when to write rather than take. A 40 KB dependency for
// a hundred lines of structure is the trade this repository already refused for
// glTF.
//
// 🔴 AND IT WAS MEASURED BEFORE IT WAS WRITTEN. `New Pack.circuitpack` holds
// **164 entries, 161 deflated and 3 stored, no zip64**, so those are the two
// cases that have to work and the one that does not have to.
//
// ⚠️ IT REFUSES WHAT IT CANNOT DO, BY NAME. Zip64, encryption and any
// compression method other than stored or deflate throw with the method number
// in the message. A reader that silently returned nothing for an encrypted entry
// would be the `moq.mjs` 404 again: a wrong answer that looks like an empty one.

const EOCD = 0x06054b50;          // end of central directory
const CEN  = 0x02014b50;          // central directory file header
const LOC  = 0x04034b50;          // local file header

/**
 * @param {ArrayBuffer|Uint8Array} buf  the whole file
 * @returns {{name:string, size:number, compressed:number, method:number,
 *            offset:number, read:()=>Promise<Uint8Array>}[]}
 */
export function readZip(buf) {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);

  // The end of central directory is at the end, after a comment of unknown
  // length, so it is found by scanning backwards for its signature.
  let eocd = -1;
  for (let i = u8.length - 22; i >= 0 && i > u8.length - 22 - 0xffff; i--) {
    if (dv.getUint32(i, true) === EOCD) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('not a zip: no end of central directory');

  const count = dv.getUint16(eocd + 10, true);
  const start = dv.getUint32(eocd + 16, true);
  if (start === 0xffffffff || count === 0xffff) {
    throw new Error('zip64 archives are not read here, and this one is zip64');
  }

  const out = [];
  let p = start;
  for (let i = 0; i < count; i++) {
    if (dv.getUint32(p, true) !== CEN) throw new Error(`central directory entry ${i} has no signature`);
    const flag = dv.getUint16(p + 8, true);
    const method = dv.getUint16(p + 10, true);
    const compressed = dv.getUint32(p + 20, true);
    const size = dv.getUint32(p + 24, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const offset = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nameLen));
    // Bit 0 is the encryption flag. An encrypted entry decompresses to noise,
    // which is worse than an error.
    if (flag & 1) throw new Error(`${name} is encrypted`);
    out.push({
      name, size, compressed, method, offset,
      read: () => readEntry(u8, dv, offset, method, compressed, size, name),
    });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

async function readEntry(u8, dv, offset, method, compressed, size, name) {
  if (dv.getUint32(offset, true) !== LOC) throw new Error(`${name} has no local header`);
  // ⚠️ THE LOCAL HEADER'S NAME AND EXTRA LENGTHS ARE NOT THE CENTRAL ONES. They
  // are routinely different, because the extra field carries different things in
  // the two places. Reading the central directory's lengths here gives a stream
  // that starts a few bytes off, which inflates to noise rather than to an error.
  const nameLen = dv.getUint16(offset + 26, true);
  const extraLen = dv.getUint16(offset + 28, true);
  const at = offset + 30 + nameLen + extraLen;
  const raw = u8.subarray(at, at + compressed);
  if (method === 0) return raw.slice();
  if (method !== 8) throw new Error(`${name} uses compression method ${method}, and this reads 0 and 8`);
  const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  const parts = [];
  let total = 0;
  for await (const chunk of stream) { parts.push(chunk); total += chunk.length; }
  const outBuf = new Uint8Array(total);
  let o = 0;
  for (const c of parts) { outBuf.set(c, o); o += c.length; }
  if (size && outBuf.length !== size) {
    throw new Error(`${name} inflated to ${outBuf.length} bytes and the directory says ${size}`);
  }
  return outBuf;
}

/** Convenience: the entry with that exact name, or null. */
export function entry(list, name) {
  return list.find((e) => e.name === name) || null;
}
