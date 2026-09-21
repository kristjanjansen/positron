// demo/shell/circuit-session.mjs
// The container of a Novation Circuit session: the fifty regions a
// `.circuitsession` is made of, and a rebuild that has to come back byte
// identical.
//
// 🔴 NOTHING HERE SENDS ANYTHING ANYWHERE. There is no Web MIDI, no
// `requestMIDIAccess`, no output port, no SysEx frame and no network call, and
// that is a safety property rather than an omission. Putting a session back on
// the Circuit is one of the three operations that replace an instrument with no
// factory reset, and `New Pack.circuitpack` is the backup of that instrument.
// `rebuild()` returns an array in memory and the only thing that can be done
// with it here is to compare it against the array that came in.
// `circuit-session-test.mjs` asserts the absence twice: once over the exported
// names, the way `circuit-patch-test.mjs` does, and once over this file's own
// source text, because a name test cannot see a call inside a function.
//
// 🔴 THE MODEL IS A FIXED GRID, NOT A RUN LENGTH SCAN, AND THAT IS A CORRECTION.
// `research/circuit-session-format-2026-09-21.md` §1 maps the file by finding
// every run of `0xFF` sixteen bytes or longer and calling what is between them a
// data block. That is a true description of `session_0` and it gives **49 blocks
// of 1 x 528, 15 x 452, 32 x 32 and 1 x 848**. MEASURED here: it gives 49 blocks
// in **21 of the 32 sessions** and anything from 50 to 332 in the other eleven,
// because a scan keyed on the absence of data moves when there is more data.
// ✅ The grid below does not move. It is the same fifty regions at the same
// offsets in all 32, and in all 64 sessions of the two purchased packs as well.
// `runs()` still exists, because the published figures are reproduced against it.
//
// 🔴 AND THE ROUND TRIP PROVES LESS THAN IT LOOKS LIKE IT PROVES. Any partition
// of a file into regions, where each region is stored as its leading data plus a
// count of trailing erasure, rebuilds byte identically whatever the boundaries
// are. So a green round trip says the partition is COMPLETE and the rebuild is
// FAITHFUL. It says nothing about whether these boundaries are the format's
// boundaries. The evidence for the boundaries is separate and is in the test:
// the offsets are constant across all 32, two independent derivations of the
// stride agree, the last region's length is the same in all 32, and the two
// synth patch payloads land exactly where the grid says they do.
//
// ⚖️ WHAT A FIELD MEANS IS NOT KNOWN AND IS NOT GUESSED HERE. Two things are
// decoded by name and both are corroborated against a second source: the four
// byte tag and the 32 byte session name, which agrees with `index.json` in
// 32 of 32. Everything else is offered as bytes at an offset. The experiment
// that would settle a field is one export, one change on the Circuit, a second
// export and a diff, and it needs a person at the instrument.

/** Every session file measured on this machine, 96 of them, is this long. */
export const SESSION_BYTES = 53248;
/** Erased flash. The owner's sessions pad with it and the purchased blanks do not. */
export const ERASED = 0xff;

/** The fixed grid, measured across all 32 of the owner's sessions. */
export const HEADER_LEN = 76;
export const SYNTH_SLOTS = 16;
export const SYNTH_SLOT_LEN = 1508;
export const DRUM_SLOTS = 32;
export const DRUM_SLOT_LEN = 720;
export const TAIL_LEN = 6004;

// ⚖️ THE 76 IS DERIVED, NOT CHOSEN. The first data block of a clean session is
// 528 bytes and every other one is 452, and 528 less 452 is 76. That is the only
// offset which makes the first record the same length as all the others, and
// 76 + 16 x 1508 lands on 24204, which is exactly where the 720 stride begins.
// ⚠️ It is still a place to draw a line rather than a documented header length.
// The same bytes partition identically if you call the first region 1584 long
// and have fifteen records after it. Nothing here depends on which reading is
// right, because the bytes are the same either way.
export const DRUM_AT = HEADER_LEN + SYNTH_SLOTS * SYNTH_SLOT_LEN;   // 24204
export const TAIL_AT = DRUM_AT + DRUM_SLOTS * DRUM_SLOT_LEN;        // 47244

/**
 * The fifty regions, in file order, contiguous and covering every byte.
 * @type {{index:number, kind:'header'|'synth'|'drum'|'tail', at:number, size:number}[]}
 */
export const SLOTS = (() => {
  const out = [{ kind: 'header', at: 0, size: HEADER_LEN }];
  for (let i = 0; i < SYNTH_SLOTS; i++) {
    out.push({ kind: 'synth', at: HEADER_LEN + i * SYNTH_SLOT_LEN, size: SYNTH_SLOT_LEN });
  }
  for (let k = 0; k < DRUM_SLOTS; k++) {
    out.push({ kind: 'drum', at: DRUM_AT + k * DRUM_SLOT_LEN, size: DRUM_SLOT_LEN });
  }
  out.push({ kind: 'tail', at: TAIL_AT, size: TAIL_LEN });
  return out.map((s, index) => ({ index, ...s }));
})();

// ---------------------------------------------------------------- the header

/** The first four bytes, read as text. All 96 files here carry one of these. */
export const TAGS = ['USER', 'DEMO', 'INIT'];
/**
 * 🔴 A TAG DOES NOT TELL A BACKUP FROM A BLANK AND IT WAS PUBLISHED AS IF IT
 * DID. `INIT` is on both sides: three of the owner's own sessions say `INIT`
 * and so do all 64 purchased blanks. `circuit-patch-test.mjs` already carries
 * that correction and this module inherits it.
 */
export const TAG_AT = 0;
export const TAG_LEN = 4;
/**
 * ⚖️ TWO BYTES THAT ARE `DC BB` IN ALL 32 OF THE OWNER'S SESSIONS AND `00 00`
 * IN ALL 64 BLANKS. MEASURED, on 96 files. Calling it a signature or a format
 * version is a reading, and what is a fact is that it separates the two sets
 * cleanly where the tag does not.
 */
export const MAGIC_AT = 4;
export const MAGIC = [0xdc, 0xbb];
/**
 * The session name, 32 bytes of space padded ASCII.
 * ✅ CORROBORATED AGAINST A SECOND SOURCE: decoded from the bytes it agrees with
 * the name `index.json` gives for the same file in 32 of 32.
 */
export const NAME_AT = 16;
export const NAME_LEN = 32;

// ------------------------------------------------------------- the last slot

/**
 * The final region holds two synth patch payloads in the same 340 byte layout
 * `circuit-patch.mjs` decodes, at these offsets inside it.
 * ✅ MEASURED rather than assumed: the two names sit 340 apart, every one of the
 * 64 payloads has its reserved block 18 to 31 zero and not one byte above 0x7F,
 * and **10 of the 64 are byte identical to a `patches/patch_*.syx` payload in
 * the same pack**.
 * ⚖️ That they are synth 1 and synth 2 in that order is a reading. What is
 * measured is that there are two of them and that they decode.
 */
export const PATCH_AT = 56;
export const PATCH_LEN = 340;
export const PATCH_SLOTS = 2;
/** Addresses 0..15 of a patch are its name, space padded. */
export const PATCH_NAME_LEN = 16;

/** The published run length scan uses this threshold and so does `runs()`. */
export const MIN_ERASED_RUN = 16;

// ------------------------------------------------------------------ the read

const latin1 = new TextDecoder('latin1');

function bytesOf(buf) {
  return buf instanceof Uint8Array ? buf : new Uint8Array(buf);
}

/** Where the trailing erasure starts inside a region, as a length. */
function usedIn(u8, at, size) {
  let j = at + size - 1;
  while (j >= at && u8[j] === ERASED) j--;
  return j - at + 1;
}

function text(u8, at, len) {
  return latin1.decode(u8.subarray(at, at + len));
}

/**
 * Read a session into the fifty regions it is made of.
 *
 * Each region carries its leading `data` as a copy and the length of the
 * erasure that follows it, so `rebuild()` can put the file back together from
 * the model alone without looking at the buffer again.
 *
 * @param {ArrayBuffer|Uint8Array} buf
 * @returns {{length:number, header:object, slots:object[]}}
 */
export function readSession(buf) {
  const u8 = bytesOf(buf);
  if (u8.length !== SESSION_BYTES) {
    throw new Error(`not a Circuit session: ${u8.length} bytes, and one is ${SESSION_BYTES}`);
  }
  const slots = SLOTS.map((s) => {
    const used = usedIn(u8, s.at, s.size);
    return {
      index: s.index,
      kind: s.kind,
      at: s.at,
      size: s.size,
      used,
      pad: s.size - used,
      data: u8.slice(s.at, s.at + used),
    };
  });
  const rawTag = text(u8, TAG_AT, TAG_LEN);
  const rawName = text(u8, NAME_AT, NAME_LEN);
  return {
    length: u8.length,
    header: {
      tag: rawTag,
      known: TAGS.includes(rawTag),
      magic: [u8[MAGIC_AT], u8[MAGIC_AT + 1]],
      magicOk: u8[MAGIC_AT] === MAGIC[0] && u8[MAGIC_AT + 1] === MAGIC[1],
      rawName,
      name: rawName.replace(/[\s\0]+$/, ''),
      raw: u8.slice(0, HEADER_LEN),
    },
    slots,
  };
}

/**
 * Put a session back together out of the model.
 *
 * 🔴 IT REBUILDS RATHER THAN COPIES, WHICH IS THE WHOLE POINT. Nothing in here
 * reads the buffer that was parsed: the output is each region's `data` followed
 * by `pad` bytes of erasure, in the order the model holds them. A region moved,
 * a `pad` wrong by one or a byte changed in `data` all come out as a different
 * file, and the test proves each of those three by doing it.
 *
 * @param {{slots:{data:Uint8Array, pad:number}[]}} session
 * @returns {Uint8Array}
 */
export function rebuild(session) {
  let total = 0;
  for (const s of session.slots) total += s.data.length + s.pad;
  const out = new Uint8Array(total);
  let at = 0;
  for (const s of session.slots) {
    out.set(s.data, at);
    at += s.data.length;
    out.fill(ERASED, at, at + s.pad);
    at += s.pad;
  }
  return out;
}

// ------------------------------------------------------- what is in the file

/**
 * The byte census, over the WHOLE file.
 * ⚠️ AND THAT IS THE TRAP THIS FILE WAS CAUGHT BY ONCE. Four fifths of a session
 * is erased flash, so any share taken over `length` measures the erasure and not
 * the session. `payload` is the denominator for a statement about content.
 */
export function census(buf) {
  const u8 = bytesOf(buf);
  const hist = new Uint32Array(256);
  for (const b of u8) hist[b]++;
  let entropy = 0;
  for (const n of hist) {
    if (!n) continue;
    const p = n / u8.length;
    entropy -= p * Math.log2(p);
  }
  let distinct = 0;
  for (const n of hist) if (n) distinct++;
  let commonNonZero = 0, best = -1;
  for (let b = 1; b < 256; b++) {
    if (b === ERASED) continue;
    if (hist[b] > best) { best = hist[b]; commonNonZero = b; }
  }
  return {
    length: u8.length,
    hist,
    distinct,
    entropy,
    erased: hist[ERASED],
    zero: hist[0],
    notErased: u8.length - hist[ERASED],
    payload: u8.length - hist[ERASED] - hist[0],
    commonNonZero,
    highBytes: (() => { let n = 0; for (let b = 0x80; b < 256; b++) n += hist[b]; return n; })(),
  };
}

/**
 * The run length reading the research published: every run of `ERASED` at least
 * `min` long is padding, everything between two of them is a block.
 * ⚠️ IT IS DATA DEPENDENT. 49 blocks in 21 of the owner's 32 sessions, one block
 * in a purchased blank, 332 in the busiest one. Kept so the published figures
 * can be reproduced, and not used as the model.
 */
export function runs(buf, min = MIN_ERASED_RUN) {
  const u8 = bytesOf(buf);
  const blocks = [];
  const pads = [];
  let i = 0;
  while (i < u8.length) {
    if (u8[i] === ERASED) {
      let j = i;
      while (j < u8.length && u8[j] === ERASED) j++;
      if (j - i >= min) { pads.push({ at: i, length: j - i }); i = j; continue; }
    }
    let j = i;
    while (j < u8.length) {
      if (u8[j] === ERASED) {
        let k = j;
        while (k < u8.length && u8[k] === ERASED) k++;
        if (k - j >= min) break;
        j = k;
        continue;
      }
      j++;
    }
    blocks.push({ at: i, length: j - i });
    i = j;
  }
  return { blocks, pads };
}

/**
 * The two synth patch payloads out of the final region, as 340 byte copies in
 * the layout `circuit-patch.mjs` reads. Nothing here decodes a parameter: use
 * that module's `ADDRESSES` and `addressOf` against `data`.
 */
export function patchPayloads(session) {
  const tail = session.slots[session.slots.length - 1];
  const out = [];
  for (let k = 0; k < PATCH_SLOTS; k++) {
    const from = PATCH_AT + k * PATCH_LEN;
    const data = tail.data.slice(from, from + PATCH_LEN);
    const rawName = latin1.decode(data.subarray(0, PATCH_NAME_LEN));
    out.push({
      index: k,
      at: tail.at + from,
      data,
      rawName,
      name: rawName.replace(/[\s\0]+$/, ''),
      empty: data.length === 0 || data.every((b) => b === 0),
    });
  }
  return out;
}

/**
 * Where two arrays first part company, and how far apart they are.
 * The sabotage checks read `first`, because "it differs" is a much weaker claim
 * than "it differs at the byte I changed and nowhere else".
 */
export function compare(a, b) {
  const x = bytesOf(a);
  const y = bytesOf(b);
  const n = Math.min(x.length, y.length);
  let first = -1;
  let count = Math.abs(x.length - y.length);
  for (let i = 0; i < n; i++) {
    if (x[i] !== y[i]) { if (first < 0) first = i; count++; }
  }
  return { same: first < 0 && x.length === y.length, first, count, lengths: [x.length, y.length] };
}

/** SHA-256, hex, so a round trip is compared by content and not by length. */
export async function fingerprint(buf) {
  const u8 = bytesOf(buf);
  const src = u8.byteOffset === 0 && u8.byteLength === u8.buffer.byteLength
    ? u8.buffer
    : u8.slice().buffer;
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', src));
  let s = '';
  for (const b of d) s += b.toString(16).padStart(2, '0');
  return s;
}

/**
 * What a page can put in a readout. Every value is measured, and the ones that
 * would be a reading of what a field MEANS are not here.
 */
export function summarise(session) {
  const kind = (k) => session.slots.filter((s) => s.kind === k);
  const sum = (a) => a.reduce((n, s) => n + s.used, 0);
  const patches = patchPayloads(session);
  return {
    tag: session.header.tag,
    name: session.header.name,
    magicOk: session.header.magicOk,
    length: session.length,
    used: sum(session.slots),
    synthSlots: kind('synth').length,
    synthUsed: sum(kind('synth')),
    drumSlots: kind('drum').length,
    drumUsed: sum(kind('drum')),
    tailUsed: kind('tail')[0].used,
    patchNames: patches.map((p) => p.name),
  };
}
