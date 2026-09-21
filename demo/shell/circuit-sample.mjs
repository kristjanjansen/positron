// demo/shell/circuit-sample.mjs
// The SAMPLE half of a Novation Circuit pack: one RIFF/WAVE file read by
// walking its chunks, and the numbers a table can sort on.
//
// 🔴 NOTHING HERE SENDS ANYTHING ANYWHERE. There is no Web MIDI, no
// `requestMIDIAccess`, no output port, no SysEx frame and no network call, and
// that is a safety property rather than an omission. `New Pack.circuitpack` is
// the only backup of an instrument with no factory reset, and the three
// operations that replace its contents are all one press away in Components.
// This module reads bytes that are already in memory and returns numbers.
// `circuit-sample-test.mjs` asserts the absence TWICE, the way
// `circuit-session-test.mjs` does: once over the exported names, and once over
// this file's own source text with the comments stripped, because a name test
// cannot see a call inside a function.
// 🔴 AND IT OPENS NO AUDIO DEVICE EITHER. There is no `AudioContext`, no
// `decodeAudioData` and no worklet in here. `toMono()` hands back a
// `Float32Array` and the page decides whether anything is ever heard, which
// keeps the decoder testable in node with no browser at all.
//
// 🔴 THE CHUNKS ARE WALKED, NOT ASSUMED, AND THE CORPUS WOULD NEVER CATCH THE
// DIFFERENCE. MEASURED 2026-09-21 on all 64 samples in `New Pack.circuitpack`:
// every one is `fmt ` then `data` and nothing else, so the audio starts at
// offset 44 in 64 of 64 and a hard-coded 44 byte header would read this pack
// perfectly. It would also read a file carrying a `LIST` or a `fact` chunk as
// noise, silently, which is the shape of defect this repository keeps paying
// for. The walker is graded on a synthetic file with an extra chunk in it and
// an odd length one that needs its pad byte, because the real pack cannot grade
// it.
//
// 🔴 THE DURATION IS DERIVED FROM THE DATA LENGTH AND FROM NOTHING THAT CLAIMS
// IT. `byteRate` in the header is a claim, and so is a `fact` chunk's frame
// count. Both are believed by most players and both can lie. What is counted
// here is bytes actually present divided by `blockAlign`, so a truncated file
// reports the length it really has and says that it was truncated.
//
// ⚖️ WHAT A FIELD MEANS IS NOT GUESSED, THE SAME STANCE `circuit-session.mjs`
// TAKES. Everything decoded below is defined by the RIFF/WAVE specification.
// 🔴 THERE IS NO PAD MAPPING IN HERE BECAUSE NOTHING CORROBORATES ONE. The only
// thing a second source confirms is which FILE is which SLOT: `index.json` in
// the pack lists 64 samples named `Sample1` to `Sample64` against
// `samples/sample_0.wav` to `samples/sample_63.wav`, in order, measured. Which
// of the Circuit's drum pads ends up playing slot 37 is a property of a SESSION
// and not of the sample, it is not in any WAV header, and the experiment that
// would settle it is one assignment on the instrument, one export and a diff.
//
// 🔴 AND SINCE 2026-09-21 IT READS A SECOND CONTAINER, BECAUSE ELEVEN FILES IN
// THE ARCHIVE DOWNLOAD CARRY SIXTY FOUR SAMPLES EACH AND NEITHER `/tom/` NOR
// `/pack/` COULD OPEN ONE. A `.circuitpack` that is not a zip is a bulk SysEx
// transfer, and `research/dump-samples-2026-09-21.md` measured the whole layout.
// The instruction was three words: *"one line reading byte 0 - do it"*.
// `containerOf()` is that line. **`50 4b` is a zip and `f0` is a stream**, and
// everything below it exists because the second answer used to be a refusal.
// 🔴 THE RESTORATION IS PROVED RATHER THAN PLAUSIBLE, WHICH IS THE ONLY REASON
// ANY OF IT IS HERE. The stream end carries a **CRC32 of the unpacked payload**
// and **36 of 36 streams on this disk verify**, 24 sample and 12 session, over
// 145 MB of somebody else's packing. A single wrong bit breaks it, and
// `streamsIn()` REFUSES a stream that fails rather than handing back audio that
// merely looks like audio.
// 🔴 AND IT STILL BUILDS NOTHING AND STILL SENDS NOTHING. `unpack7()` is
// imported from `circuit-syx.mjs`; there is no packer here, no message builder
// and no stream writer, and a complete bulk sample transfer is exactly the file
// that would replace every sample slot on an instrument with no factory reset.
// The test builds the corrupt streams it needs and they cannot leave that file.

import { messages, unpack7 } from './circuit-syx.mjs';

/** The whole pack carries this many, measured on `New Pack.circuitpack`. */
export const SAMPLE_SLOTS = 64;

/** `RIFF`, a size, then the form. Twelve bytes before the first chunk header. */
export const HEADER_BYTES = 12;
/** A PCM `fmt ` chunk is at least this long. All 64 in the pack are exactly 16. */
export const FMT_MIN = 16;
/** Where `fmt ` then `data` with no other chunk puts the audio. NOT assumed. */
export const PLAIN_DATA_AT = 44;

/** The only format tag decoded here. */
export const FORMAT_PCM = 1;
/**
 * Tags a refusal can name rather than printing a bare number. The list is for
 * the MESSAGE and not for a decision: anything that is not `FORMAT_PCM` is
 * refused, named or not.
 */
export const FORMAT_NAMES = {
  1: 'PCM', 2: 'Microsoft ADPCM', 3: 'IEEE float', 6: 'A-law', 7: 'mu-law',
  17: 'IMA ADPCM', 20: 'G.723 ADPCM', 49: 'GSM 6.10', 85: 'MP3',
  0xfffe: 'WAVE_FORMAT_EXTENSIBLE',
};

/**
 * The bit depths `toMono()` knows how to turn into floats.
 * 🔴 ONE ENTRY, AND THAT IS A DELIBERATE REFUSAL RATHER THAN AN OVERSIGHT.
 * MEASURED: all 64 samples in the pack are 16 bit signed and mono, so an 8 bit
 * unsigned branch or a 24 bit branch would be code nothing in this repository
 * could grade. Untested arithmetic that silently produces plausible audio is
 * worse than a refusal a caller can read out.
 */
export const DEPTHS = [16];
/** Divisor for 16 bit signed, which runs -32768 to 32767. */
export const FULL_SCALE_16 = 32768;

const ascii = new TextDecoder('latin1');

function bytesOf(buf) {
  return buf instanceof Uint8Array ? buf : new Uint8Array(buf);
}

function tag(u8, at) {
  return ascii.decode(u8.subarray(at, at + 4));
}

/** A refusal is a value a caller can show. Nothing here throws a string. */
function no(why, extra = {}) {
  return { ok: false, why, ...extra };
}

/**
 * Every chunk in the file, in file order, with what it CLAIMS and what is
 * actually there.
 *
 * A chunk header is a four character id and a little endian size, the body
 * follows it, and an odd body is followed by one pad byte that is not counted
 * in the size. A size that runs past the end of the file is kept as `declared`
 * and clipped in `size`, because a reader that trusted it would hand a page a
 * view over memory that is not there.
 *
 * @param {ArrayBuffer|Uint8Array} buf
 * @returns {{id:string, at:number, size:number, declared:number, truncated:boolean}[]}
 */
export function chunks(buf) {
  const u8 = bytesOf(buf);
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const out = [];
  let p = HEADER_BYTES;
  while (p + 8 <= u8.length) {
    const id = tag(u8, p);
    const declared = dv.getUint32(p + 4, true);
    const at = p + 8;
    const size = Math.max(0, Math.min(declared, u8.length - at));
    out.push({ id, at, size, declared, truncated: size < declared });
    // The pad byte belongs to the container, not to the body.
    p = at + declared + (declared & 1);
  }
  return out;
}

/**
 * Read one WAV file.
 *
 * On success every number below is measured from the bytes. `duration` comes
 * from the data that is present, so it is the length a player would actually
 * hear rather than the length the header advertises.
 *
 * @param {ArrayBuffer|Uint8Array} buf
 * @returns {{ok:false, why:string}|{ok:true, [k:string]:any}}
 */
export function readWave(buf) {
  const u8 = bytesOf(buf);
  if (u8.length < HEADER_BYTES) {
    return no(`not a WAVE: ${u8.length} bytes, and a RIFF header alone is ${HEADER_BYTES}`);
  }
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const magic = tag(u8, 0);
  if (magic !== 'RIFF') {
    return no(`not a WAVE: the file starts ${JSON.stringify(magic)} rather than "RIFF"`);
  }
  const form = tag(u8, 8);
  if (form !== 'WAVE') {
    return no(`not a WAVE: the RIFF form is ${JSON.stringify(form)} rather than "WAVE"`);
  }
  const riffSize = dv.getUint32(4, true);
  const list = chunks(u8);
  const fmt = list.find((c) => c.id === 'fmt ');
  const data = list.find((c) => c.id === 'data');
  if (!fmt) return no('no fmt chunk, so nothing in the file says what the samples are');
  if (fmt.size < FMT_MIN) {
    return no(`the fmt chunk carries ${fmt.size} bytes and a PCM one is at least ${FMT_MIN}`);
  }
  if (!data) return no('no data chunk, so there is no audio in it');

  const format = dv.getUint16(fmt.at, true);
  if (format !== FORMAT_PCM) {
    const named = FORMAT_NAMES[format];
    return no(`format tag ${format}${named ? `, ${named},` : ''} is not decoded here, and only ${FORMAT_PCM}, PCM, is`,
      { format });
  }
  const channels = dv.getUint16(fmt.at + 2, true);
  const rate = dv.getUint32(fmt.at + 4, true);
  const byteRate = dv.getUint32(fmt.at + 8, true);
  const blockAlign = dv.getUint16(fmt.at + 12, true);
  const bits = dv.getUint16(fmt.at + 14, true);
  if (!channels) return no('the fmt chunk says 0 channels, so there is nothing to play');
  if (!rate) return no('the fmt chunk says 0 Hz, so no duration can be worked out');
  if (!blockAlign) return no('block align is 0, so a frame has no length and frames cannot be counted');

  // ⚠️ `frames` USES THE DECLARED BLOCK ALIGN RATHER THAN channels x bits / 8.
  // They agree in all 64 files here and `blockAlignOk` says whether they agree
  // in the file in hand. Deriving the frame length instead of reading it would
  // hide exactly the disagreement a caller wants to be told about.
  const frames = Math.floor(data.size / blockAlign);
  return {
    ok: true,
    length: u8.length,
    riffSize,
    // `RIFF` and its own size field are not counted in that size, so a whole
    // file is riffSize + 8. It is a claim like any other and is reported, not
    // trusted.
    riffSizeOk: riffSize + 8 === u8.length,
    chunks: list,
    chunkIds: list.map((c) => c.id),
    fmtAt: fmt.at,
    fmtSize: fmt.size,
    format,
    formatName: FORMAT_NAMES[format] || `tag ${format}`,
    channels,
    rate,
    byteRate,
    blockAlign,
    bits,
    byteRateOk: byteRate === rate * blockAlign,
    blockAlignOk: blockAlign === channels * (bits / 8),
    dataAt: data.at,
    dataBytes: data.size,
    dataDeclared: data.declared,
    truncated: data.truncated || riffSize + 8 !== u8.length,
    frames,
    // A partial frame at the end is bytes that cannot be played. Counted rather
    // than rounded away, because a non-zero value here means the file is cut.
    partialFrameBytes: data.size - frames * blockAlign,
    duration: frames / rate,
    decodable: bits === 16 && channels === 1,
    data: u8.slice(data.at, data.at + data.size),
  };
}

/**
 * The PCM as plain mono floats in -1 to 1, ready for
 * `AudioBuffer.copyToChannel`, with no round trip through a decoder.
 *
 * 🔴 IT READS THE MODEL AND NOT THE FILE. `readWave()` copied the data chunk,
 * so a caller that overwrites the buffer it parsed still gets the right audio,
 * and the test proves that by scribbling over the source.
 *
 * @param {object} wave  what `readWave()` returned
 * @returns {{ok:false, why:string}|{ok:true, samples:Float32Array, frames:number, rate:number}}
 */
export function toMono(wave) {
  if (!wave || !wave.ok) return no(wave && wave.why ? wave.why : 'that is not a parsed WAVE');
  if (!DEPTHS.includes(wave.bits)) {
    return no(`${wave.bits} bit is not decoded here, and ${DEPTHS.join(' and ')} bit is: every sample in the pack is 16 bit and no other depth has ever been graded against a real file`);
  }
  if (wave.channels !== 1) {
    return no(`${wave.channels} channels are not mixed down here, and 1 is: all 64 samples in the pack are mono, so a mixdown would be arithmetic nothing could grade`);
  }
  const n = wave.frames;
  const out = new Float32Array(n);
  const dv = new DataView(wave.data.buffer, wave.data.byteOffset, wave.data.byteLength);
  for (let i = 0; i < n; i++) out[i] = dv.getInt16(i * 2, true) / FULL_SCALE_16;
  return { ok: true, samples: out, frames: n, rate: wave.rate };
}

/**
 * What is actually in the audio, as numbers a table can sort on.
 *
 * `peak` and `rms` are fractions of full scale rather than dBFS, because a
 * column of negative decibels reads worse than a column of 0 to 1 and the page
 * can convert. `leadingZeros` and `trailingZeros` are counted in FRAMES, and
 * they are how a page says how much of a 2 second sample is sound.
 *
 * ⚠️ A FILE OF NOTHING BUT ZEROS COUNTS AS ALL LEADING AND NO TRAILING. Counting
 * it both ways would make `sound` negative, and the honest reading of a silent
 * file is that it never started rather than that it ended twice.
 *
 * @param {object} wave  what `readWave()` returned
 */
export function content(wave) {
  const mono = toMono(wave);
  if (!mono.ok) return mono;
  const s = mono.samples;
  const n = s.length;
  let peak = 0, peakAt = -1, sumsq = 0, clipped = 0;
  for (let i = 0; i < n; i++) {
    const a = Math.abs(s[i]);
    if (a > peak) { peak = a; peakAt = i; }
    sumsq += s[i] * s[i];
    // -32768 and 32767 both land within one step of full scale.
    if (a >= 32767 / FULL_SCALE_16) clipped++;
  }
  let leadingZeros = 0;
  while (leadingZeros < n && s[leadingZeros] === 0) leadingZeros++;
  let trailingZeros = 0;
  if (leadingZeros < n) {
    while (trailingZeros < n && s[n - 1 - trailingZeros] === 0) trailingZeros++;
  }
  const sound = n - leadingZeros - trailingZeros;
  return {
    ok: true,
    frames: n,
    peak,
    peakAt,
    rms: n ? Math.sqrt(sumsq / n) : 0,
    silent: peak === 0,
    clipped,
    leadingZeros,
    trailingZeros,
    sound,
    soundShare: n ? sound / n : 0,
  };
}

/**
 * One row for a table: the header facts and the content facts side by side.
 *
 * The floats are rounded HERE, because this is the readout facing function and
 * a cell reading `0.12497916666666667` is not a measurement anybody can read
 * down a column. `readWave()` and `content()` keep the full precision.
 *
 * @param {object} wave  what `readWave()` returned
 * @param {string} [name]  whatever the caller calls it, `index.json`'s name or
 *   a file name. The module does not know and does not invent one.
 */
export function summarise(wave, name = '') {
  if (!wave || !wave.ok) {
    return { name, ok: false, why: wave && wave.why ? wave.why : 'not a parsed WAVE' };
  }
  const c = content(wave);
  const round = (x, p) => Math.round(x * 10 ** p) / 10 ** p;
  return {
    name,
    ok: true,
    format: wave.formatName,
    rate: wave.rate,
    bits: wave.bits,
    channels: wave.channels,
    frames: wave.frames,
    seconds: round(wave.duration, 3),
    bytes: wave.length,
    dataBytes: wave.dataBytes,
    chunks: wave.chunkIds.join(' '),
    truncated: wave.truncated,
    peak: c.ok ? round(c.peak, 4) : null,
    rms: c.ok ? round(c.rms, 4) : null,
    silent: c.ok ? c.silent : null,
    lead: c.ok ? c.leadingZeros : null,
    trail: c.ok ? c.trailingZeros : null,
    sound: c.ok ? round(c.soundShare * 100, 1) : null,
    why: c.ok ? '' : c.why,
  };
}

/**
 * The totals a page shows above a table of 64 rows.
 * ⚠️ A REFUSED FILE IS COUNTED, NOT DROPPED. `refused` is the number that says
 * a pack is not what it looks like, so a total taken over the ones that parsed
 * would hide the only thing worth seeing.
 */
export function summariseAll(waves) {
  const good = waves.filter((w) => w && w.ok);
  const secs = good.map((w) => w.duration);
  const uniq = (k) => [...new Set(good.map((w) => w[k]))];
  const sorted = secs.slice().sort((a, b) => a - b);
  const median = sorted.length
    ? (sorted.length % 2 ? sorted[(sorted.length - 1) / 2]
      : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2)
    : 0;
  return {
    count: waves.length,
    parsed: good.length,
    refused: waves.length - good.length,
    rates: uniq('rate'),
    depths: uniq('bits'),
    channels: uniq('channels'),
    frames: good.reduce((n, w) => n + w.frames, 0),
    seconds: secs.reduce((n, s) => n + s, 0),
    shortest: sorted[0] ?? 0,
    longest: sorted[sorted.length - 1] ?? 0,
    median,
    bytes: good.reduce((n, w) => n + w.length, 0),
    truncated: good.filter((w) => w.truncated).length,
  };
}

/**
 * 🔴 THE SAMPLES OUT OF AN OPEN PACK, IN ONE PLACE, BECAUSE TWO PAGES WANT
 * THEM. Instructed 2026-09-21: *"use shared code to get samples"*, while a
 * second page that opens a `.circuitpack` was being started. `/pack/` had this
 * loop inline and the new page would have had a second copy of it, which is
 * exactly the shape CLAUDE.md names: a control that exists in one page and
 * nowhere else is a component nobody has noticed yet, and the version that
 * arrives second is always subtly different.
 *
 * ⚠️ IT TAKES THE ENTRY LIST `unzip.mjs` RETURNS, NOT THE PACK'S BYTES. A page
 * opening a pack wants its patches and its sessions out of the same list, so
 * reading the zip twice to get two halves of one file would be the waste that
 * is easy not to notice. The caller unzips once and hands the list round.
 *
 * ⚠️ AND THE ORDER IS THE PACK'S OWN, BY NUMBER RATHER THAN BY NAME.
 * `sample_10.wav` sorts before `sample_2.wav` as text, and the owner's
 * `index.json` names them `Sample1` to `Sample64` against `sample_0.wav` to
 * `sample_63.wav` IN ORDER, 64 of 64. A page showing slot 10 where slot 2 lives
 * would be wrong in a way nobody would spot by looking.
 *
 * 🔴 A FILE THAT WILL NOT PARSE KEEPS ITS PLACE AND CARRIES ITS REASON. It is
 * the rule the patch reader already follows: a reader that silently drops one
 * leaves a pack looking smaller than it is, which is a wrong answer wearing an
 * empty one's clothes. `summariseAll` counts them as `refused` for the same
 * reason.
 * ⚠️ AND A MANIFEST IS A PROMISE WHILE THE ARCHIVE IS THE INVENTORY, which was
 * MEASURED 2026-09-21 on the two packs in `purchased/`: their `index.json`
 * lists 128 samples between them, every one with an empty name, pointing at
 * `samples/sample_0.wav` onward, and **neither zip holds a single `.wav`**. A
 * page building its table from the index would show sixty four rows of audio
 * that is not in the file. So this reads the ENTRIES and never the index.
 *
 * @param {{name:string,size:number,read:()=>Promise<Uint8Array>}[]} entries
 *   whatever `readZip()` returned
 * @returns {Promise<{name:string,size:number,wave:object,row:object}[]>}
 */
export async function samplesIn(entries) {
  const wav = (entries || [])
    .filter((e) => /\.wav$/i.test(e.name))
    .sort((a, b) => num(a.name) - num(b.name));
  const out = [];
  for (const e of wav) {
    const name = e.name.split('/').pop();
    const bytes = await e.read();
    const wave = readWave(bytes);
    out.push({ name, size: e.size, wave, row: summarise(wave, name) });
  }
  return out;
}

/** The first run of digits in a name, or -1 when there is none to sort on. */
function num(name) {
  const m = String(name).match(/(\d+)(?!.*\d)/);
  return m ? +m[1] : -1;
}

// ── the other container ───────────────────────────────────────────────────
//
// 🔴 ONE LINE READING BYTE 0, AND IT IS WORTH ELEVEN FILES AND 336 SAMPLES.
// Instructed 2026-09-21. Both pages used to hand a non-zip `.circuitpack` to
// `readZip()`, catch the throw, and tell the visitor it was not a pack. It is a
// pack. It is simply not a zip.

/** A zip local header, and every `.zip` and every zipped `.circuitpack`. */
export const ZIP_HEAD = [0x50, 0x4b];
/** A SysEx message, and every stream, bank and loose patch in the archive. */
export const SYSEX_START = 0xf0;

/**
 * What `containerOf()` can answer. `sysex` is not the same as *a bulk
 * transfer*: a 350 byte patch message starts `f0` too, so this says which
 * READER to reach for and `streamsIn()` decides what is really in it.
 */
export const CONTAINER = { zip: 'zip', sysex: 'sysex', unknown: 'unknown' };

/**
 * The first two bytes, and nothing else.
 *
 * ⚠️ AN EXTENSION IS NOT EVIDENCE AND THAT IS WHY THIS EXISTS. `CLAUDE.md`
 * records a `.circuitpack` off a public archive that is a raw SysEx stream of
 * 6,930 messages, and the archive download holds eleven more. The name says
 * pack on all of them, Components opens six of the seventeen, and the byte at
 * offset 0 separates them in one comparison.
 *
 * @param {ArrayBuffer|Uint8Array} buf
 * @returns {{kind:string, head:string, why:string}}
 */
export function containerOf(buf) {
  const u8 = bytesOf(buf);
  const head = [...u8.subarray(0, 2)].map((b) => b.toString(16).padStart(2, '0')).join(' ');
  if (u8.length < 2) {
    return { kind: CONTAINER.unknown, head, why: `it is ${u8.length} byte(s), which is not enough to tell what it is` };
  }
  if (u8[0] === ZIP_HEAD[0] && u8[1] === ZIP_HEAD[1]) {
    return { kind: CONTAINER.zip, head, why: 'it starts 50 4b, so it is a zip' };
  }
  if (u8[0] === SYSEX_START) {
    return { kind: CONTAINER.sysex, head, why: 'it starts f0, so it is a sysex stream' };
  }
  return {
    kind: CONTAINER.unknown,
    head,
    why: `it starts ${head}, and a zip starts 50 4b and a sysex stream starts f0`,
  };
}

// ── the checksum the stream carries about itself ──────────────────────────

/**
 * 🔴 THIS IS WHAT MAKES THE RESTORATION EXACT RATHER THAN PLAUSIBLE. The stream
 * end declares a CRC32 of the unpacked payload and 36 of 36 streams on this disk
 * verify, over 145 MB packed by four unrelated authors. One wrong bit in
 * 5,763,072 breaks it.
 *
 * ⚠️ IT IS PLAIN JAVASCRIPT ON PURPOSE. `node:zlib` has `crc32` and a browser
 * has nothing, and this module runs in both. The test grades this function
 * against `zlib.crc32`, which is the independent second source the rule about
 * two-numbers-from-one-field asks for.
 */
const CRC_POLY = 0xedb88320;
let CRC_TABLE = null;
function crcTable() {
  if (CRC_TABLE) return CRC_TABLE;
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (CRC_POLY ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  CRC_TABLE = t;
  return t;
}

/**
 * CRC32, the reflected IEEE one, as an unsigned 32 bit number.
 * @param {ArrayBuffer|Uint8Array} buf
 */
export function crc32(buf) {
  const u8 = bytesOf(buf);
  const t = crcTable();
  let c = 0xffffffff;
  for (let i = 0; i < u8.length; i++) c = t[(c ^ u8[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ── a bulk transfer, split into its streams ───────────────────────────────

/** Byte 5 of a stream message. `circuit-syx.mjs` names the same three. */
export const STREAM_START = 0x77;
export const STREAM_CARRIER = 0x79;
export const STREAM_END = 0x7a;
/** `F0` then Novation, then the product byte a stream uses. A patch uses `01 60`. */
export const STREAM_PREFIX = [0xf0, 0x00, 0x20, 0x29, 0x00];

/**
 * ✅ The six nibble field at bytes 8 to 13 of a stream start, MEASURED at
 * `0x23B000` on all 24 sample streams and `0x2E000` on all 12 session streams on
 * this disk, by four unrelated authors.
 * ⚖️ **WHAT IT MEANS IS A READING AND STAYS ONE.** A destination address, a
 * capacity and a type tag that happens to look numeric are all consistent with
 * what is measured. Nothing here decides a stream's kind from it: the slot
 * walker decides, because the walker can be wrong in a way a reader can see.
 */
export const REGION_SAMPLES = 0x23b000;
export const REGION_SESSIONS = 0x2e000;

/** Six nibbles most significant first, or `null` when a byte is not a nibble. */
function nibbles(data, at, count) {
  let n = 0;
  for (let i = 0; i < count; i++) {
    const v = data[at + i];
    if (v === undefined || v > 0x0f) return null;
    n = n * 16 + v;
  }
  return n >>> 0;
}

function headOk(data) {
  for (let i = 0; i < STREAM_PREFIX.length; i++) if (data[i] !== STREAM_PREFIX[i]) return false;
  return true;
}

function hex(v) {
  return `0x${(v === undefined ? 0 : v).toString(16).padStart(2, '0')}`;
}

/**
 * Every logical stream in a file, verified against its own declared length and
 * its own checksum.
 *
 * 🔴 IT SPLITS ON `0x77` AND `0x7a` BEFORE IT UNPACKS ANYTHING, AND THAT IS THE
 * WHOLE DIFFERENCE. A `.circuitpack` that is not a zip is TWO streams back to
 * back, 33 sessions of 53,248 bytes then a 64 slot sample table, and
 * concatenating all 29,376 carriers first makes one 7,520,256 byte run that is
 * neither. `research/dump-samples-2026-09-21.md` §7.3 measured the existing
 * reader doing exactly that and answering `sessions: 141` where the answer is
 * 33.
 *
 * 🔴 AND A STREAM THAT FAILS ITS CHECKSUM IS REFUSED, NOT RETURNED WITH A
 * WARNING. Audio that decodes is not audio that decoded correctly, and the
 * stream carries the answer.
 *
 * ⚠️ A CARRIER'S LENGTH IS NOT ASSERTED. All 29,376 measured are 300 bytes and a
 * short final one would be legal; the declared length and the checksum catch
 * anything the carrier walk got wrong, which is a stronger test than the shape.
 *
 * @param {ArrayBuffer|Uint8Array} buf
 */
export function streamsIn(buf) {
  const u8 = bytesOf(buf);
  const all = messages(u8);
  const out = [];
  let cur = null;
  let orphanCarriers = 0, orphanEnds = 0, other = 0;

  const settle = (s, why) => {
    if (!s) return;
    let total = 0;
    for (const p of s.parts) total += p.length;
    const plain = new Uint8Array(total);
    let at = 0;
    for (const p of s.parts) { plain.set(p, at); at += p.length; }
    s.plain = plain;
    delete s.parts;
    s.crc = crc32(plain);
    s.lengthOk = s.declared !== null && s.declared === plain.length;
    s.crcOk = s.crcDeclared !== null && s.crcDeclared === s.crc;
    if (why) { s.ok = false; s.why = why; return; }
    if (s.declared === null) {
      s.ok = false;
      s.why = `the stream start at ${s.at} declares no unpacked length, so there is nothing to check ${plain.length} bytes against`;
      return;
    }
    if (!s.lengthOk) {
      s.ok = false;
      s.why = `the stream start declares ${s.declared.toLocaleString()} unpacked bytes and its `
        + `${s.carriers.toLocaleString()} carriers restore to ${plain.length.toLocaleString()}`;
      return;
    }
    if (!s.crcOk) {
      s.ok = false;
      s.why = `the stream end declares a checksum of 0x${s.crcDeclared === null ? '?' : s.crcDeclared.toString(16)} `
        + `and the ${plain.length.toLocaleString()} unpacked bytes are 0x${s.crc.toString(16)}, `
        + 'so at least one byte in it is wrong';
      return;
    }
    s.ok = true;
    s.why = '';
  };

  for (const m of all) {
    if (!headOk(m.data)) { other++; continue; }
    const kind = m.data[5];
    if (kind === STREAM_START) {
      settle(cur, cur ? `the stream at ${cur.at} never ends: another one starts at ${m.at} before a 0x7a message arrived` : null);
      cur = {
        at: m.at,
        startBytes: m.length,
        declared: nibbles(m.data, 16, 6),
        region: nibbles(m.data, 8, 6),
        crcDeclared: null,
        carriers: 0,
        parts: [],
        plainSizes: new Set(),
      };
      out.push(cur);
      continue;
    }
    if (kind === STREAM_CARRIER) {
      if (!cur) { orphanCarriers++; continue; }
      const plain = unpack7(m.data.subarray(6, m.length - 1));
      cur.parts.push(plain);
      cur.plainSizes.add(plain.length);
      cur.carriers++;
      continue;
    }
    if (kind === STREAM_END) {
      if (!cur) { orphanEnds++; continue; }
      cur.crcDeclared = nibbles(m.data, 6, 8);
      settle(cur, null);
      cur = null;
      continue;
    }
    other++;
  }
  settle(cur, cur ? `the stream at ${cur.at} never ends: the file runs out before a 0x7a message` : null);

  for (const s of out) s.plainSizes = [...s.plainSizes].sort((a, b) => a - b);
  return { streams: out, messages: all.length, other, orphanCarriers, orphanEnds };
}

// ── the 64 slot sample table inside a verified stream ─────────────────────

/** A slot header is ten bytes, then the audio. MEASURED on 1,536 slots. */
export const SLOT_HEADER_BYTES = 10;
/** Byte 1 of a slot header, `0x01` on all 1,536 measured. */
export const SLOT_MARK = 0x01;
/**
 * The rates a slot walk accepts, and it is one entry for the same reason
 * `DEPTHS` is: every slot measured is 48,000 Hz, and a Circuit slot is 48 kHz.
 * It is also the sync check that stops the walker finding a table in noise.
 */
export const SLOT_RATES = [48000];
/**
 * 🔴 THE CHANNEL COUNT IS NOT IN THE SLOT HEADER AND THIS IS AN ASSUMPTION
 * WEARING A CONSTANT'S CLOTHES, SO IT IS NAMED. Ten bytes carry a flags byte, a
 * marker, a depth, a rate and a length, and no field anywhere says how many
 * channels. `positron-hardware` records the rule this sits under: **a channel
 * count cannot be inferred from a payload**, and guessing wrong plays an octave
 * out, which sounds like a broken instrument rather than a broken header.
 * ✅ What corroborates 1 is a different corpus: all 64 samples in
 * `New Pack.circuitpack` are 48 kHz 16 bit MONO with a real `fmt ` chunk saying
 * so, and every recovered slot lands in the same length range as those.
 * ⚠️ IT WOULD TAKE A STEREO SLOT TO PROVE THIS WRONG AND NONE HAS BEEN SEEN.
 * A slot wave carries `channelsFromHeader: false` so a page can say so.
 */
export const SLOT_CHANNELS = 1;
/** What `slotWave()` puts in `from`, so a slot model is never mistaken for a file. */
export const SLOT_SOURCE = 'sample slot';

/**
 * Walk the unpacked image as 64 variable length records.
 *
 * ✅ CONFIRMED THREE WAYS in `research/dump-samples-2026-09-21.md` §3.3 and
 * reproduced here: `80 bb 00 00` occurs exactly 64 times in the image and
 * nowhere else, the gap from one header to the next minus the declared length is
 * exactly 10 on all 63 gaps, and a slot of length 0 advances 10 bytes and lands
 * on the next valid header.
 *
 * 🔴 IT REFUSES THE WHOLE IMAGE RATHER THAN RETURNING WHAT IT GOT. A walk that
 * has lost the table produces records at arbitrary offsets whose audio is
 * plausible noise, which is the worst thing a decoder can hand a page. The
 * reason names the slot and the byte.
 *
 * @param {ArrayBuffer|Uint8Array} plain  a VERIFIED stream's unpacked payload
 */
export function slotsIn(plain) {
  const u8 = bytesOf(plain);
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const slots = [];
  let p = 0;
  while (slots.length < SAMPLE_SLOTS) {
    const i = slots.length;
    if (p + SLOT_HEADER_BYTES > u8.length) {
      return no(`slot ${i} would start at ${p} and the image is ${u8.length.toLocaleString()} bytes, `
        + `so its ${SLOT_HEADER_BYTES} byte header is not there`, { slots, read: i });
    }
    const mark = u8[p + 1];
    if (mark !== SLOT_MARK) {
      return no(`slot ${i} at offset ${p} carries ${hex(mark)} where every one of the 1,536 slots `
        + `measured carries ${hex(SLOT_MARK)}, so there is no sample table here`, { slots, read: i });
    }
    const bits = u8[p + 2];
    if (!DEPTHS.includes(bits)) {
      return no(`slot ${i} at offset ${p} declares ${bits} bit and ${DEPTHS.join(' and ')} is the only `
        + 'depth decoded here', { slots, read: i });
    }
    const rate = dv.getUint32(p + 3, true);
    if (!SLOT_RATES.includes(rate)) {
      return no(`slot ${i} at offset ${p} declares ${rate} Hz and a Circuit slot is `
        + `${SLOT_RATES.join(' or ')} Hz`, { slots, read: i });
    }
    const pcmBytes = u8[p + 7] | (u8[p + 8] << 8) | (u8[p + 9] << 16);
    const align = SLOT_CHANNELS * (bits / 8);
    if (pcmBytes % align) {
      return no(`slot ${i} declares ${pcmBytes.toLocaleString()} bytes of ${bits} bit audio, which is `
        + 'not a whole number of frames', { slots, read: i });
    }
    const at = p + SLOT_HEADER_BYTES;
    if (at + pcmBytes > u8.length) {
      return no(`slot ${i} declares ${pcmBytes.toLocaleString()} bytes of audio and only `
        + `${(u8.length - at).toLocaleString()} are left in the image`, { slots, read: i });
    }
    slots.push({
      index: i, at: p, flags: u8[p], bits, rate,
      pcmAt: at, pcmBytes, empty: pcmBytes === 0,
    });
    p = at + pcmBytes;
  }
  // ⚠️ THE TAIL IS REPORTED AND NOT REFUSED. A sample transfer is a fixed size
  // image of the whole sample memory, so 3,743,408 of `80S Drums_sampleset.syx`
  // are zero fill after the last slot. That is normal and it is also 70.3 blocks
  // of 53,248, which is where the `141 sessions` in the research came from.
  let tailNonZero = 0;
  for (let i = p; i < u8.length; i++) if (u8[i]) tailNonZero++;
  return {
    ok: true,
    slots,
    read: slots.length,
    used: p,
    filled: slots.filter((s) => !s.empty).length,
    empty: slots.filter((s) => s.empty).length,
    pcmBytes: slots.reduce((n, s) => n + s.pcmBytes, 0),
    tail: u8.length - p,
    tailNonZero,
  };
}

/**
 * One slot as the model `readWave()` returns, so `toMono()`, `content()` and
 * `summarise()` read it with no special case.
 *
 * 🔴 IT BUILDS A MODEL AND NOT A FILE, WHICH IS DELIBERATE. Wrapping the PCM in
 * a 44 byte RIFF header would be the obvious route and it would put a byte
 * WRITER in this module, and this module's whole arrangement is that the test
 * builds bytes and the module does not. Nothing downstream needs the container:
 * every consumer reads the model.
 * ⚠️ THE FIELDS A RIFF FILE HAS AND A SLOT DOES NOT ARE `null`, NEVER INVENTED.
 * `riffSizeOk`, `byteRateOk` and `blockAlignOk` are agreements between two
 * header fields, and a slot header has only one of each, so reporting `true`
 * would be a check that never looked at anything.
 *
 * @param {ArrayBuffer|Uint8Array} plain  the image the slot was walked out of
 * @param {object} slot  one entry from `slotsIn().slots`
 */
export function slotWave(plain, slot) {
  const u8 = bytesOf(plain);
  const blockAlign = SLOT_CHANNELS * (slot.bits / 8);
  const frames = Math.floor(slot.pcmBytes / blockAlign);
  return {
    ok: true,
    from: SLOT_SOURCE,
    slot: slot.index,
    // ⚖️ BYTE 0 IS UNEXPLAINED. 35 distinct values across 64 slots, present on
    // empty slots too, with no correlation found to length, position or
    // content. A gain, a loop point and leftover memory are all consistent.
    flags: slot.flags,
    length: SLOT_HEADER_BYTES + slot.pcmBytes,
    format: FORMAT_PCM,
    formatName: FORMAT_NAMES[FORMAT_PCM],
    channels: SLOT_CHANNELS,
    channelsFromHeader: false,
    rate: slot.rate,
    bits: slot.bits,
    blockAlign,
    frames,
    duration: frames / slot.rate,
    dataAt: slot.pcmAt,
    dataBytes: slot.pcmBytes,
    dataDeclared: slot.pcmBytes,
    truncated: false,
    partialFrameBytes: slot.pcmBytes - frames * blockAlign,
    decodable: slot.bits === 16 && SLOT_CHANNELS === 1,
    // A copy, exactly as `readWave()` takes one, so a caller that drops the
    // image still has the audio.
    data: u8.slice(slot.pcmAt, slot.pcmAt + slot.pcmBytes),
    chunks: [],
    chunkIds: [],
    riffSize: null,
    riffSizeOk: null,
    byteRate: null,
    byteRateOk: null,
    blockAlignOk: null,
    fmtAt: null,
    fmtSize: null,
  };
}

/**
 * 🔴 THE WHOLE JOURNEY, FOR A PAGE: bytes in, the same
 * `{name, size, wave, row}` rows `samplesIn()` hands back out.
 *
 * It answers in the order a reader needs: what container is this, what streams
 * are in it, did each one verify, and only then what audio came out. A file with
 * no sample table is not an error and says what it is instead.
 *
 * ⚠️ THE UNPACKED IMAGES ARE DROPPED FROM THE RESULT. Two streams of a
 * `.circuitpack` are 7.5 MB of payload and a page that only wants the audio
 * would hold it for nothing. The slot data is already copied into each wave.
 *
 * @param {ArrayBuffer|Uint8Array} buf  a whole file
 */
export function sampleSetIn(buf) {
  const u8 = bytesOf(buf);
  const container = containerOf(u8);
  const read = streamsIn(u8);
  const rows = [];
  const samples = [];
  let sampleStreams = 0;

  for (const s of read.streams) {
    const row = {
      at: s.at, ok: s.ok, why: s.why,
      carriers: s.carriers, plainBytes: s.plain.length, declared: s.declared,
      region: s.region, crc: s.crc, crcDeclared: s.crcDeclared,
      crcOk: s.crcOk, lengthOk: s.lengthOk,
      holds: '', slots: 0, filled: 0, empty: 0, seconds: 0,
    };
    rows.push(row);
    if (!s.ok) { row.holds = 'nothing, because the stream did not verify'; continue; }
    const walk = slotsIn(s.plain);
    if (!walk.ok) {
      row.holds = 'no sample table';
      row.whyNoTable = walk.why;
      continue;
    }
    sampleStreams++;
    row.holds = 'a 64 slot sample table';
    row.slots = walk.read;
    row.filled = walk.filled;
    row.empty = walk.empty;
    row.tail = walk.tail;
    row.tailNonZero = walk.tailNonZero;
    row.waves = walk.slots.map((slot) => slotWave(s.plain, slot));
    row.seconds = row.waves.reduce((n, w) => n + w.duration, 0);
  }

  // ⚠️ THE NAME CARRIES THE STREAM ONLY WHEN THERE IS MORE THAN ONE, because
  // sixty four rows reading `stream 1 slot 0` on a file with one table is noise
  // in every cell of a column.
  const many = sampleStreams > 1;
  let k = 0;
  for (const row of rows) {
    if (!row.waves) continue;
    const prefix = many ? `stream ${k + 1} ` : '';
    for (const wave of row.waves) {
      const name = `${prefix}slot ${wave.slot}`;
      samples.push({ name, size: wave.length, wave, row: summarise(wave, name) });
    }
    delete row.waves;
    k++;
  }

  let why = '';
  if (!samples.length) {
    if (container.kind !== CONTAINER.sysex) {
      why = container.kind === CONTAINER.zip
        ? 'it starts 50 4b, so it is a zip rather than a sysex stream'
        : `${container.why}, so there is no stream in it to read`;
    }
    else if (!read.streams.length) why = `it holds ${read.messages} sysex message(s) and not one stream start, so it carries no bulk transfer`;
    else {
      const bad = rows.find((r) => !r.ok);
      why = bad ? bad.why
        : `it carries ${rows.length} verified stream(s) and no sample table in any of them`
          + `${rows[0] && rows[0].whyNoTable ? `: ${rows[0].whyNoTable}` : ''}`;
    }
  }

  return {
    ok: samples.length > 0,
    why,
    container: container.kind,
    head: container.head,
    messages: read.messages,
    other: read.other,
    orphanCarriers: read.orphanCarriers,
    orphanEnds: read.orphanEnds,
    streams: rows,
    sampleStreams,
    otherStreams: rows.length - sampleStreams,
    verified: rows.filter((r) => r.ok).length,
    samples,
  };
}
