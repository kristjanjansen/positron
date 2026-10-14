// demo/shell/circuit-session.mjs: a `.circuitsession` as a fixed grid of fifty regions, and a rebuild
// that must come back byte identical. Sends nothing; the test asserts the absence. A green round
// trip proves the partition complete, not that these are the format's boundaries.
// why: lessons/kit-circuit-session.md#header

/** Every session file measured on this machine, 96 of them, is this long. */
export const SESSION_BYTES = 53248;
/** Erased flash. The owner's sessions pad with it and the purchased blanks do not. */
export const ERASED = 0xff;

/**
 * The fixed grid, measured across all 32 of the owner's sessions.
 * Kinds are named for their stride (`wide` 1,508 bytes, `narrow` 720), not synth or drum:
 * that reading is unconfirmed and a Circuit has two synth parts.
 * why: lessons/kit-circuit-session.md#grid
 */
export const HEADER_LEN = 76;
export const WIDE_SLOTS = 16;
export const WIDE_SLOT_LEN = 1508;
export const NARROW_SLOTS = 32;
export const NARROW_SLOT_LEN = 720;
export const TAIL_LEN = 6004;

// 76 is derived: the first block is 528 and the rest 452, and 76 + 16 x 1508 = 24204 where the
// 720 stride begins. A place to draw a line, not a documented header length.
// why: lessons/kit-circuit-session.md#narrow-at
export const NARROW_AT = HEADER_LEN + WIDE_SLOTS * WIDE_SLOT_LEN;   // 24204
export const TAIL_AT = NARROW_AT + NARROW_SLOTS * NARROW_SLOT_LEN;  // 47244

/**
 * The fifty regions, in file order, contiguous and covering every byte.
 * @type {{index:number, kind:'header'|'wide'|'narrow'|'tail', at:number, size:number}[]}
 */
export const SLOTS = (() => {
  const out = [{ kind: 'header', at: 0, size: HEADER_LEN }];
  for (let i = 0; i < WIDE_SLOTS; i++) {
    out.push({ kind: 'wide', at: HEADER_LEN + i * WIDE_SLOT_LEN, size: WIDE_SLOT_LEN });
  }
  for (let k = 0; k < NARROW_SLOTS; k++) {
    out.push({ kind: 'narrow', at: NARROW_AT + k * NARROW_SLOT_LEN, size: NARROW_SLOT_LEN });
  }
  out.push({ kind: 'tail', at: TAIL_AT, size: TAIL_LEN });
  return out.map((s, index) => ({ index, ...s }));
})();

// ---------------------------------------------------------------- the header

/** The first four bytes, read as text. All 96 files here carry one of these. */
export const TAGS = ['USER', 'DEMO', 'INIT'];
/**
 * The tag does not tell a backup from a blank: `INIT` is on both sides.
 * why: lessons/kit-circuit-session.md#tag-at
 */
export const TAG_AT = 0;
export const TAG_LEN = 4;
/**
 * `DC BB` in all 32 owner sessions, `00 00` in all 64 blanks (96 files measured).
 * What it means is a reading; that it separates the two sets is a fact.
 * why: lessons/kit-circuit-session.md#magic-at
 */
export const MAGIC_AT = 4;
export const MAGIC = [0xdc, 0xbb];
/**
 * The session name, 32 bytes of space padded ASCII; agrees with `index.json` in 32 of 32.
 * why: lessons/kit-circuit-session.md#name-at
 */
export const NAME_AT = 16;
export const NAME_LEN = 32;

// ------------------------------------------------------------- the last slot

/**
 * The final region holds two synth patch payloads in the 340 byte layout `circuit-patch.mjs`
 * decodes, at these offsets. 10 of 64 are byte identical to a pack `.syx`; their order is a reading.
 * why: lessons/kit-circuit-session.md#patch-at
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
 * Put a session back together out of the model: each region's `data` then `pad` bytes of erasure.
 * It never reads the parsed buffer.
 * @param {{slots:{data:Uint8Array, pad:number}[]}} session
 * @returns {Uint8Array}
 * why: lessons/kit-circuit-session.md#rebuild
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
 * The byte census, over the whole file. Four fifths is erased flash, so use `payload` as the
 * denominator for a statement about content.
 * why: lessons/kit-circuit-session.md#census
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
 * The published run length reading: every run of `ERASED` at least `min` long is padding.
 * Data dependent (49 blocks in 21 of 32, up to 332); kept to reproduce figures, not the model.
 * why: lessons/kit-circuit-session.md#runs
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
    // Named for the stride, not for a part of an instrument. See the grid.
    // why: lessons/kit-circuit-session.md#wideslots
    wideSlots: kind('wide').length,
    wideUsed: sum(kind('wide')),
    narrowSlots: kind('narrow').length,
    narrowUsed: sum(kind('narrow')),
    tailUsed: kind('tail')[0].used,
    patchNames: patches.map((p) => p.name),
  };
}

// ------------------------------------------------------- the note data

/**
 * A `wide` region holds sequencer note data in 28 byte records: 5,095 events over the owner's 32,
 * 0 over 64 blanks, two implementations agreeing. The claim rests on yield against controls
 * (random 11.08 per cent, shuffled 18.99, real 99.62), not on a consistency score.
 * why: lessons/kit-circuit-session.md#note-data
 */
export const STEPS = 16;
export const STEP_LEN = 28;
export const STEP_SLOTS = 6;
export const SLOT_LEN = 4;

/**
 * Header byte 8 selects where velocity lives (`0xFF` or `0x07`): two files with the same music
 * decode to 31 of 31 equal events either way. A reading of what it selects, not what it means.
 * why: lessons/kit-circuit-session.md#velocity-at
 */
export const VELOCITY_AT = 8;
export const VELOCITY_PER_STEP = 0x07;

/**
 * Every note event in a session, in region then step then slot order.
 * Reads the mask, never the note bytes: 31 of 8,192 records keep a stale note in a freed slot.
 * Decodes only; there is deliberately no writer.
 * @param {ArrayBuffer|Uint8Array} buf  a whole session
 * @returns {{region:number, step:number, slot:number, at:number, note:number, gate:number, velocity:number}[]}
 * why: lessons/kit-circuit-session.md#notesin
 */
export function notesIn(buf) {
  const u8 = bytesOf(buf);
  const perNote = u8[VELOCITY_AT] !== VELOCITY_PER_STEP;
  const out = [];
  for (let w = 0; w < WIDE_SLOTS; w++) {
    const base = HEADER_LEN + w * WIDE_SLOT_LEN;
    for (let st = 0; st < STEPS; st++) {
      const r = base + st * STEP_LEN;
      const mask = u8[r];
      if (!mask) continue;
      for (let k = 0; k < STEP_SLOTS; k++) {
        if (!(mask & (1 << k))) continue;
        const at = r + 4 + k * SLOT_LEN;
        out.push({
          region: w,
          step: st,
          slot: k,
          at,
          note: u8[at],
          gate: u8[at + 1],
          velocity: perNote ? u8[at + 3] : u8[r + 1],
        });
      }
    }
  }
  return out;
}

/** How many note events each of the sixteen wide regions holds. */
export function notesPerRegion(buf) {
  const n = new Array(WIDE_SLOTS).fill(0);
  for (const e of notesIn(buf)) n[e.region]++;
  return n;
}

/**
 * Shape check so a caller can refuse a file: bytes 2 and 3 of every step record are zero in all
 * real and blank records and in 0 of 2,048 random ones.
 * why: lessons/kit-circuit-session.md#stepgrid
 */
export function stepGridLooksRight(buf) {
  const u8 = bytesOf(buf);
  let ok = 0, seen = 0;
  for (let w = 0; w < WIDE_SLOTS; w++) {
    const base = HEADER_LEN + w * WIDE_SLOT_LEN;
    for (let st = 0; st < STEPS; st++) {
      const r = base + st * STEP_LEN;
      seen++;
      if (u8[r + 2] === 0 && u8[r + 3] === 0 && !(u8[r] & 0xc0)) ok++;
    }
  }
  return { records: seen, ok, share: seen ? ok / seen : 0 };
}
