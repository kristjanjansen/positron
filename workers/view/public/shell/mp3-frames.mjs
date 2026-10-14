// demo/shell/mp3-frames.mjs: where one audio frame ends and the next begins, for MPEG Layer III
// and ADTS (AAC). The layer bits tell them apart: 00 is ADTS, never MPEG. A scanner, not a
// decoder: iOS WebKit feeds an element's audio to an analyser as 0.0000, so pages decode frames.
// why: lessons/kit-mp3-frames.md#header

// Layer III only — that is what every Icecast `audio/mpeg` mount is.
const BITRATES_V1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
const BITRATES_V2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0];
const RATES = {
  3: [44100, 48000, 32000, 0],   // MPEG 1
  2: [22050, 24000, 16000, 0],   // MPEG 2
  0: [11025, 12000, 8000, 0],    // MPEG 2.5
};

/**
 * Read an MPEG audio frame header at `i`, or null. A sync word occurs by chance about once
 * every 2 KB, so every field is validated and callers confirm the next header (`frameStarts`).
 * why: lessons/kit-mp3-frames.md#read-header
 */
export function readHeader(b, i) {
  if (i + 4 > b.length) return null;
  if (b[i] !== 0xff || (b[i + 1] & 0xe0) !== 0xe0) return null;
  const versionBits = (b[i + 1] >> 3) & 0x03;        // 3 = MPEG1, 2 = MPEG2, 0 = MPEG2.5
  const layerBits = (b[i + 1] >> 1) & 0x03;          // 1 = Layer III
  if (versionBits === 1 || layerBits !== 1) return null;
  const rateIdx = (b[i + 2] >> 2) & 0x03;
  const brIdx = (b[i + 2] >> 4) & 0x0f;
  if (brIdx === 0 || brIdx === 15 || rateIdx === 3) return null;
  const sampleRate = RATES[versionBits][rateIdx];
  if (!sampleRate) return null;
  const mpeg1 = versionBits === 3;
  const bitrate = (mpeg1 ? BITRATES_V1 : BITRATES_V2)[brIdx] * 1000;
  const padding = (b[i + 2] >> 1) & 0x01;
  const channelMode = (b[i + 3] >> 6) & 0x03;        // 3 = single channel
  // MPEG1 carries 1152 samples a frame, MPEG2/2.5 576, and the length formula follows; getting
  // the pair wrong desynchronises after one frame, so both come from one branch.
  // why: lessons/kit-mp3-frames.md#samples-per-frame
  const samplesPerFrame = mpeg1 ? 1152 : 576;
  const length = Math.floor((samplesPerFrame / 8) * bitrate / sampleRate) + padding;
  if (length < 24) return null;
  return {
    length, sampleRate, bitrate, samplesPerFrame,
    channels: channelMode === 3 ? 1 : 2,
    // What WebCodecs should be configured with. It comes off the BYTES rather
    // than off a `content-type`, because the header is the thing that knows.
    codec: 'mp3',
    mpeg1, padding,
  };
}

/**
 * Sampling frequency index -> Hz. 13 and 14 are reserved, and 15 means "the
 * rate is written out longhand", which an ADTS header has nowhere to put. All
 * three mean this was not a header.
 */
const ADTS_RATES = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050,
                    16000, 12000, 11025, 8000, 7350, 0, 0, 0];
/**
 * `channel_configuration` -> channels. Index 0 (count in the AudioSpecificConfig) is rejected,
 * never guessed: stereo guessed for mono plays an octave down.
 * why: lessons/kit-mp3-frames.md#adts-channels
 */
const ADTS_CHANNELS = [0, 1, 2, 3, 4, 5, 6, 8];

/**
 * Read an ADTS frame header at `i`, or null; same shape as `readHeader`. Twelve set bits occur
 * by chance about once every 4 KB, so every field is checked and callers confirm the next header.
 * Bits, 0 the top bit of byte 0: 0..11 sync, 12 version, 13..14 layer (always 00),
 * 15 protection_absent (0: 2-byte CRC follows), 16..17 profile, 18..21 sampling_frequency_index,
 * 22 private, 23..25 channel_configuration, 26..29 flags, 30..42 aac_frame_length (incl. header
 * and CRC), 43..53 adts_buffer_fullness, 54..55 raw data blocks minus one.
 * why: lessons/kit-mp3-frames.md#read-adts-header
 */
export function readAdtsHeader(b, i) {
  // Seven bytes, because `number_of_raw_data_blocks` lives in the last of them
  // and the sample count depends on it.
  if (i + 7 > b.length) return null;
  // `0xf6` masks the top sync bits and the two layer bits; requiring 00 here and 01 in
  // `readHeader` is the whole format discrimination.
  // why: lessons/kit-mp3-frames.md#sync-layer-mask
  if (b[i] !== 0xff || (b[i + 1] & 0xf6) !== 0xf0) return null;
  const protectionAbsent = b[i + 1] & 0x01;
  const profile = (b[i + 2] >> 6) & 0x03;             // 1 = LC, which is mp4a.40.2
  const rateIdx = (b[i + 2] >> 2) & 0x0f;
  const chanCfg = ((b[i + 2] & 0x01) << 2) | ((b[i + 3] >> 6) & 0x03);
  const sampleRate = ADTS_RATES[rateIdx];
  const channels = ADTS_CHANNELS[chanCfg];
  if (!sampleRate || !channels) return null;
  const length = ((b[i + 3] & 0x03) << 11) | (b[i + 4] << 3) | ((b[i + 5] >> 5) & 0x07);
  // A frame cannot be shorter than its own header, and a zero length would
  // never advance — `frameStarts` would sit on one offset for ever.
  if (length < (protectionAbsent ? 7 : 9)) return null;
  // One to four raw data blocks, 1024 samples each. Almost every encoder writes
  // one, and reading the field is cheaper than assuming it: get this wrong and
  // the decoder's timestamps drift by a factor of four.
  const samplesPerFrame = 1024 * ((b[i + 6] & 0x03) + 1);
  return {
    length, sampleRate, samplesPerFrame, channels,
    // AAC has no bitrate field: this is this frame's rate, meaningful only averaged; callers log it.
    // why: lessons/kit-mp3-frames.md#adts-bitrate
    bitrate: Math.round((length * 8 * sampleRate) / samplesPerFrame),
    // `mp4a.40.2` for LC, which is what every Icecast AAC mount measured here
    // sends. Derived rather than hard-coded: a Main or LTP stream configures a
    // decoder differently and must not be quietly told it is LC.
    codec: `mp4a.40.${profile + 1}`,
    crc: !protectionAbsent,
  };
}

/**
 * The two framings: `read` the parser, `min` the bytes it needs, `types` Icecast content-types.
 * `min` bounds the walk; a hard-coded 4 made ADTS on one-byte chunks yield 0 frames from 120 KB.
 * why: lessons/kit-mp3-frames.md#framings
 */
export const FRAMINGS = {
  mpeg: { read: readHeader, min: 4, types: ['audio/mpeg', 'audio/mp3', 'audio/mpeg3', 'audio/x-mpeg'] },
  adts: { read: readAdtsHeader, min: 7, types: ['audio/aac', 'audio/aacp', 'audio/x-aac', 'audio/x-hx-aac-adts'] },
};

/**
 * Which framing a `content-type` names, or null. Never branch on a URL; null makes
 * `createFrameSplitter` look at the bytes rather than default.
 * why: lessons/kit-mp3-frames.md#framing-for
 */
export function framingFor(contentType) {
  const t = String(contentType || '').split(';')[0].trim().toLowerCase();
  if (!t) return null;
  for (const [name, f] of Object.entries(FRAMINGS)) if (f.types.includes(t)) return name;
  return null;
}

/**
 * Walk `bytes` from `from`; `end` is the first byte not consumed, kept by a socket caller.
 * `confirm` accepts a header only if another sits one frame later (without it: 67 false MPEG
 * frames in 1 MB of AAC). `framing` picks the reader, `mpeg` by default.
 * why: lessons/kit-mp3-frames.md#frame-starts
 */
export function frameStarts(bytes, from = 0, { confirm = true, final = false, framing = 'mpeg' } = {}) {
  const { read, min } = FRAMINGS[framing] || FRAMINGS.mpeg;
  const frames = [];
  let i = from;
  // `min`, never a constant: see FRAMINGS.
  // why: lessons/kit-mp3-frames.md#min-not-constant
  while (i + min <= bytes.length) {
    const h = read(bytes, i);
    if (!h) { i++; continue; }
    if (confirm) {
      const next = i + h.length;
      // Not enough bytes to confirm: a socket caller brings more; `final` lets a complete buffer keep
      // its last frame. Only the caller can tell a short read from the end of a file.
      // why: lessons/kit-mp3-frames.md#final
      if (next + min > bytes.length) {
        if (final && i + h.length <= bytes.length) { frames.push({ at: i, ...h }); i += h.length; }
        break;
      }
      if (!read(bytes, next)) { i++; continue; }
    }
    if (i + h.length > bytes.length) break;
    frames.push({ at: i, ...h });
    i += h.length;
  }
  return { frames, end: i };
}

/**
 * A stateful splitter for a socket: feed chunks, get whole frames; it keeps the straddling tail.
 * @param {{framing?: 'mpeg'|'adts'|null}} opts from the content-type; null sniffs both readers
 *   and latches the one that syncs (a fallback, never the policy).
 * why: lessons/kit-mp3-frames.md#create-frame-splitter
 */
export function createFrameSplitter({ framing = null } = {}) {
  let tail = new Uint8Array(0);
  let synced = false;
  let kind = FRAMINGS[framing] ? framing : null;
  return {
    /** @returns {Array<{bytes: Uint8Array, sampleRate: number, samplesPerFrame: number, channels: number, codec: string}>} */
    push(chunk) {
      const buf = new Uint8Array(tail.length + chunk.length);
      buf.set(tail, 0); buf.set(chunk, tail.length);
      // Once in sync, frames are back to back, so confirmation is only needed
      // while hunting for the first one. Keeping it on for ever would stall the
      // last frame of every read waiting for a successor that has not arrived.
      let got = null;
      if (kind) {
        got = frameStarts(buf, 0, { confirm: !synced, framing: kind });
      } else {
        // Confirmed frames only, and the reader that found more of them rather than the first.
        // why: lessons/kit-mp3-frames.md#sniff-best
        for (const name of Object.keys(FRAMINGS)) {
          const r = frameStarts(buf, 0, { confirm: true, framing: name });
          if (!got || r.frames.length > got.frames.length) { got = r; kind = r.frames.length ? name : null; }
        }
        if (!kind) {
          // Bring more bytes, bounded: the longest frame is 8191 bytes, so 32 KiB holds four plus a fifth.
          // why: lessons/kit-mp3-frames.md#sniff-bound
          tail = buf.length > 32768 ? buf.slice(buf.length - 32768) : buf;
          return [];
        }
      }
      if (got.frames.length) synced = true;
      tail = buf.slice(got.end);
      return got.frames.map((f) => ({
        bytes: buf.subarray(f.at, f.at + f.length),
        sampleRate: f.sampleRate,
        samplesPerFrame: f.samplesPerFrame,
        channels: f.channels,
        bitrate: f.bitrate,
        codec: f.codec,
      }));
    },
    get pending() { return tail.length; },
    get synced() { return synced; },
    /** Which framing is being read — 'mpeg', 'adts', or null before the first frame. */
    get framing() { return kind; },
  };
}

/**
 * The bytes from their first confirmed frame on, for `decodeAudioData`: Safari refuses a file
 * that starts mid-frame, which a recording joined mid-stream does. Framing is read off the
 * bytes; an unsyncable buffer and an ID3 tag are returned as they came.
 * @param {ArrayBuffer} ab
 * @param {number} [scan] how far into the file to look for the first frame
 * @returns {{ buffer: ArrayBuffer, skipped: number, framing: string|null }}
 * why: lessons/kit-mp3-frames.md#from-first-frame
 */
export function fromFirstFrame(ab, scan = 65536) {
  const u = new Uint8Array(ab);
  if (u[0] === 0x49 && u[1] === 0x44 && u[2] === 0x33) return { buffer: ab, skipped: 0, framing: 'mpeg' };
  const head = u.subarray(0, Math.min(u.length, scan));
  let best = null;
  for (const framing of ['mpeg', 'adts']) {
    const { frames } = frameStarts(head, 0, { framing });
    // Two frames in a row, so a lone header-shaped run of payload is not a start.
    if (frames.length >= 2 && (!best || frames[0].at < best.at)) best = { at: frames[0].at, framing };
  }
  if (!best) return { buffer: ab, skipped: 0, framing: null };
  return { buffer: best.at ? ab.slice(best.at) : ab, skipped: best.at, framing: best.framing };
}
