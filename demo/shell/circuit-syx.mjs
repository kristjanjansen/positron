// demo/shell/circuit-syx.mjs
// A Novation Circuit SysEx stream, read: the 7 to 8 packing that carries whole
// sessions over MIDI, and the command byte that says whether a file would write
// flash.
//
// 🔴 NOTHING HERE SENDS ANYTHING ANYWHERE, AND NOTHING HERE PACKS. There is no
// Web MIDI, no output port, no network call, and no function that turns bytes
// INTO a SysEx stream. Reading one is safe. Building one is the first half of
// sending one, so it does not exist. `circuit-syx-test.mjs` asserts the absence
// over the exported names and over this file's own source text.
//
// 🔴 AND THE REASON THIS EXISTS IS A FILE THAT LIES ABOUT WHAT IT IS.
// `on_the_run.circuitpack`, off archive.org, is NOT a zip. It is a bare SysEx
// stream, and MEASURED it carries 64 patch messages whose command byte is `01`
// on every one, at locations 0 through 63, all distinct. `01` is `Replace
// Patch`, the one that writes FLASH, and those locations are every synth slot on
// an instrument with no factory reset. `CLAUDE.md` says the 128 loose `.syx`
// files in `purchased/` are safe because byte 6 is `00` on every one. That is
// true of `purchased/` and it is NOT true of the wider archive.
// ✅ SO `survey()` ANSWERS THE SAFETY QUESTION FIRST, before anything else about
// the file, and a page that opens one of these should show that answer before it
// shows a single patch name.
//
// ✅ THE SESSION TRANSPORT IS GRADED, NOT ASSUMED. Decoded this way, **66 of 66
// sessions** out of `on_the_run.circuitpack` and `factory_16.syx` parse AND
// round trip byte identical through `demo/shell/circuit-session.mjs`. Those are
// 66 session images from two sources that have nothing to do with the owner's
// instrument, which is a far harder grade than the owner's own 32.
//
// ⚠️ 33 SESSIONS PER FILE AND NOT 32, in both files measured. The Circuit has 32
// slots. What the 33rd is, is NOT KNOWN. A scratch slot or the currently loaded
// one are both readings and neither is measured.

import { COMMANDS, PATCH_BYTES } from './circuit-patch.mjs';

/** `F0` then Novation, then the product bytes this stream uses. */
export const STREAM_HEAD = [0xf0, 0x00, 0x20, 0x29, 0x00];
/** A patch message carries the other product number, the one `circuit-patch.mjs` reads. */
export const PATCH_HEAD = [0xf0, 0x00, 0x20, 0x29, 0x01, 0x60];

/** Byte 5 of a stream message says what kind it is. MEASURED on two files. */
export const KIND = {
  0x77: 'stream start',
  0x79: 'carrier',
  0x7a: 'stream end',
};

/** A carrier is 300 bytes: F0, five header, 293 payload, F7. */
export const CARRIER_BYTES = 300;
export const CARRIER_PAYLOAD = 293;
/** 293 packed bytes restore to exactly 256, and 208 carriers make one session. */
export const CARRIER_PLAIN = 256;
export const CARRIERS_PER_SESSION = 208;
/** One mask byte then seven data bytes. */
export const GROUP = 8;

/**
 * Every `F0 ... F7` message in a stream, as views into the input.
 * ⚠️ Bytes outside a message are skipped rather than refused, because these
 * files are concatenations and a stray byte between messages is not a reason to
 * refuse the 6,930 that parse.
 */
export function messages(buf) {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  const out = [];
  let i = 0;
  while (i < u8.length) {
    if (u8[i] !== 0xf0) { i++; continue; }
    let j = i + 1;
    while (j < u8.length && u8[j] !== 0xf7) j++;
    if (j >= u8.length) break;              // an unterminated tail is not a message
    out.push({ at: i, length: j - i + 1, data: u8.subarray(i, j + 1) });
    i = j + 1;
  }
  return out;
}

/**
 * MSB first 7 to 8: one mask byte then up to seven data bytes, bit k of the mask
 * restoring bit 7 of data byte k. This is how seven bit MIDI carries eight bit
 * content and it is the whole trick.
 */
export function unpack7(payload) {
  const out = [];
  for (let g = 0; g < payload.length; g += GROUP) {
    const mask = payload[g];
    for (let k = 0; k < GROUP - 1 && g + 1 + k < payload.length; k++) {
      out.push(payload[g + 1 + k] | (((mask >> k) & 1) << 7));
    }
  }
  return Uint8Array.from(out);
}

/**
 * The 53,248 byte session images a stream carries, in order.
 * ⚠️ A trailing partial session is DROPPED and counted rather than returned
 * half built, and `survey()` reports the count, because a short last session
 * returned silently is a wrong answer that looks like an empty one.
 */
export function sessionsIn(buf, sessionLength = 53248) {
  const carriers = messages(buf).filter((m) => m.length === CARRIER_BYTES);
  const parts = [];
  let total = 0;
  for (const m of carriers) {
    const plain = unpack7(m.data.subarray(6, m.data.length - 1));
    parts.push(plain);
    total += plain.length;
  }
  const flat = new Uint8Array(total);
  let at = 0;
  for (const p of parts) { flat.set(p, at); at += p.length; }
  const out = [];
  for (let i = 0; i + sessionLength <= flat.length; i += sessionLength) {
    out.push(flat.slice(i, i + sessionLength));
  }
  return { sessions: out, carriers: carriers.length, plainBytes: total, leftover: total % sessionLength };
}

/**
 * The 350 byte patch messages in a stream, with the safety reading first.
 * `writesFlash` is the only thing about one of these files that matters before
 * anything else.
 */
export function patchesIn(buf) {
  return messages(buf)
    .filter((m) => m.length === PATCH_BYTES)
    .map((m) => {
      const command = m.data[6];
      const c = COMMANDS[command];
      return {
        at: m.at,
        command,
        commandName: c ? c.name : `undocumented command ${command}`,
        writesFlash: c ? c.flash : null,
        location: m.data[7],
      };
    });
}

/**
 * What a file is, answered safety first.
 * A page opening one of these shows `writesFlash` before it shows a patch name.
 */
export function survey(buf) {
  const all = messages(buf);
  const patches = patchesIn(buf);
  const { sessions, carriers, plainBytes, leftover } = sessionsIn(buf);
  const flash = patches.filter((p) => p.writesFlash === true);
  const kinds = {};
  for (const m of all) {
    const k = m.data[5] !== undefined && KIND[m.data[5]] ? KIND[m.data[5]] : `byte 5 = ${m.data[5]}`;
    kinds[k] = (kinds[k] || 0) + 1;
  }
  return {
    // 🔴 FIRST, AND IT IS FIRST ON PURPOSE.
    writesFlash: flash.length > 0,
    flashMessages: flash.length,
    flashLocations: [...new Set(flash.map((p) => p.location))].sort((a, b) => a - b),
    messages: all.length,
    lengths: all.reduce((m, x) => ({ ...m, [x.length]: (m[x.length] || 0) + 1 }), {}),
    kinds,
    patches: patches.length,
    carriers,
    plainBytes,
    leftover,
    sessions,
  };
}
