// demo/shell/circuit-sample.mjs: Circuit pack samples, as RIFF/WAVE walked by chunk or a bulk SysEx
// stream verified by CRC32. Sends nothing, opens no audio device; the test asserts the absence.
// Duration comes from bytes present; 16 and 24 bit, mono or stereo mixed down; nothing throws.
// why: lessons/kit-circuit-sample.md#header

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
 * The bit depths `toMono()` turns into floats: the two the real corpus holds (100 of 901 are 24 bit).
 * 8 bit (unsigned, 128 bias) and 32 bit integer are refused by name: zero of either in 965 files.
 * why: lessons/kit-circuit-sample.md#depths
 */
export const DEPTHS = [16, 24];
/** Divisor for 16 bit signed, which runs -32768 to 32767. */
export const FULL_SCALE_16 = 32768;
/**
 * Divisor for 24 bit signed, which runs -8388608 to 8388607.
 * Three bytes little endian, sign in the top one; `DataView` has no `getInt24`.
 * why: lessons/kit-circuit-sample.md#full-scale-24
 */
export const FULL_SCALE_24 = 8388608;

/** The divisor for a depth, so the scaling and the clip test cannot drift. */
export const FULL_SCALE = { 16: FULL_SCALE_16, 24: FULL_SCALE_24 };

/**
 * At most two channels are mixed: a plain average is a guess for 5.1, and there are
 * zero files above 2 channels in the 965 here.
 * why: lessons/kit-circuit-sample.md#mix-channels-max
 */
export const MIX_CHANNELS_MAX = 2;

/**
 * The mixdown is the mean: it stays in -1 to 1, so `clipped` means the file touches the rail.
 * Mixed peak over the louder channel's peak runs 0.46642 to 1 (median 0.99996) on 150 stereo
 * files, so `content()` reports both; `cancelled` flags anti phase silence.
 * why: lessons/kit-circuit-sample.md#mix
 */
export const MIX = 'mean of the channels';

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
 * One sample at a byte offset, as a float in -1 to 1.
 * 24 bit sign is extended by subtracting 2^24 when bit 23 is set. Total over `DEPTHS` only.
 * why: lessons/kit-circuit-sample.md#readsample
 */
function readSample(u8, at, bits) {
  if (bits === 16) {
    const v = u8[at] | (u8[at + 1] << 8);
    return (v & 0x8000 ? v - 0x10000 : v) / FULL_SCALE_16;
  }
  // 24
  const v = u8[at] | (u8[at + 1] << 8) | (u8[at + 2] << 16);
  return (v & 0x800000 ? v - 0x1000000 : v) / FULL_SCALE_24;
}

/**
 * Whether this wave's shape can be turned into floats, and the reason when not.
 * One predicate for `readWave`, `slotWave` and `toMono`, so `decodable` and a refusal agree.
 * why: lessons/kit-circuit-sample.md#shapefault
 */
function shapeFault(bits, channels) {
  if (!DEPTHS.includes(bits)) {
    return `${bits} bit is not decoded here, and ${DEPTHS.join(' and ')} bit are: `
      + 'those two are the depths measured on real files on this disk, and there is not one '
      + `${bits} bit file among the 965 to grade a third branch against`;
  }
  if (channels > MIX_CHANNELS_MAX) {
    return `${channels} channels are not mixed down here, and ${MIX_CHANNELS_MAX} are: `
      + 'a plain average is right for a stereo pair and is a guess for a surround set, '
      + 'where a centre, a surround pair and an LFE do not weigh the same';
  }
  if (channels < 1) return 'the file says it has no channels, so there is nothing to mix down';
  return '';
}

/** The bytes one frame of this shape really occupies, whatever the header says. */
function frameBytes(bits, channels) {
  return channels * (bits / 8);
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
    // IEEE float and WAVE_FORMAT_EXTENSIBLE are refused by name: zero of either in 965 files, and
    // float may run past 1.0, which changes what `peak` and `clipped` mean.
    // why: lessons/kit-circuit-sample.md#format-gate
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

  // `frames` uses the declared block align, so `blockAlignOk` can report a disagreement, then is
  // clamped to what the data supplies (`framesClamped`); a block align of 1 on 16 bit mono threw.
  // why: lessons/kit-circuit-sample.md#frames
  const claimed = Math.floor(data.size / blockAlign);
  const stride = frameBytes(bits, channels);
  const holdable = stride ? Math.floor(data.size / stride) : 0;
  const frames = Math.min(claimed, holdable);
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
    framesDeclared: claimed,
    framesClamped: frames < claimed,
    // A partial frame at the end is bytes that cannot be played. Counted rather
    // than rounded away, because a non-zero value here means the file is cut.
    partialFrameBytes: data.size - claimed * blockAlign,
    duration: frames / rate,
    decodable: shapeFault(bits, channels) === '',
    data: u8.slice(data.at, data.at + data.size),
  };
}

/**
 * The PCM as plain mono floats in -1 to 1, ready for `AudioBuffer.copyToChannel`.
 * Reads the model, not the source buffer. Stereo is mixed by `MIX`; `mixed` and `mix` say so.
 * @param {object} wave  what `readWave()` returned
 * @returns {{ok:false, why:string}|{ok:true, samples:Float32Array, frames:number, rate:number, mixed:boolean, mix:string}}
 * why: lessons/kit-circuit-sample.md#tomono
 */
export function toMono(wave) {
  if (!wave || !wave.ok) return no(wave && wave.why ? wave.why : 'that is not a parsed WAVE');
  const fault = shapeFault(wave.bits, wave.channels);
  if (fault) return no(fault);
  const n = wave.frames;
  const ch = wave.channels;
  const step = wave.bits / 8;
  const stride = frameBytes(wave.bits, ch);
  const u8 = wave.data;
  const out = new Float32Array(n);
  if (ch === 1) {
    for (let i = 0; i < n; i++) out[i] = readSample(u8, i * stride, wave.bits);
  } else {
    for (let i = 0; i < n; i++) {
      const at = i * stride;
      let sum = 0;
      for (let c = 0; c < ch; c++) sum += readSample(u8, at + c * step, wave.bits);
      out[i] = sum / ch;
    }
  }
  return { ok: true, samples: out, frames: n, rate: wave.rate, mixed: ch > 1, mix: MIX };
}

/**
 * Every channel's own peak, taken from the bytes before anything is mixed: an independent
 * reading that tells a wide file from a quiet one.
 * @param {object} wave  what `readWave()` returned
 * @returns {{ok:false, why:string}|{ok:true, peaks:number[]}}
 * why: lessons/kit-circuit-sample.md#channelpeaks
 */
export function channelPeaks(wave) {
  if (!wave || !wave.ok) return no(wave && wave.why ? wave.why : 'that is not a parsed WAVE');
  const fault = shapeFault(wave.bits, wave.channels);
  if (fault) return no(fault);
  const ch = wave.channels;
  const step = wave.bits / 8;
  const stride = frameBytes(wave.bits, ch);
  const u8 = wave.data;
  const peaks = new Array(ch).fill(0);
  for (let i = 0; i < wave.frames; i++) {
    const at = i * stride;
    for (let c = 0; c < ch; c++) {
      const a = Math.abs(readSample(u8, at + c * step, wave.bits));
      if (a > peaks[c]) peaks[c] = a;
    }
  }
  return { ok: true, peaks };
}

/**
 * What is in the audio as sortable numbers: `peak` and `rms` as fractions of full scale,
 * leading and trailing zeros in frames. An all-zero file counts as all leading.
 * @param {object} wave  what `readWave()` returned
 * why: lessons/kit-circuit-sample.md#content
 */
export function content(wave) {
  const mono = toMono(wave);
  if (!mono.ok) return mono;
  const s = mono.samples;
  const n = s.length;
  // The rail is one step of the file's own depth (24 bit: 0.00000012), not 32767/32768.
  // No sample in the 100 real 24 bit files sits at either rail.
  // why: lessons/kit-circuit-sample.md#rail
  const scale = FULL_SCALE[wave.bits];
  const rail = (scale - 1) / scale;
  let peak = 0, peakAt = -1, sumsq = 0, clipped = 0;
  for (let i = 0; i < n; i++) {
    const a = Math.abs(s[i]);
    if (a > peak) { peak = a; peakAt = i; }
    sumsq += s[i] * s[i];
    // The most negative code and the most positive both land within one step.
    if (a >= rail) clipped++;
  }
  let leadingZeros = 0;
  while (leadingZeros < n && s[leadingZeros] === 0) leadingZeros++;
  let trailingZeros = 0;
  if (leadingZeros < n) {
    while (trailingZeros < n && s[n - 1 - trailingZeros] === 0) trailingZeros++;
  }
  const sound = n - leadingZeros - trailingZeros;
  const chans = channelPeaks(wave);
  const peaks = chans.ok ? chans.peaks : [];
  const widest = peaks.length ? Math.max(...peaks) : peak;
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
    // ── the file beside the mixdown ──────────────────────────────────────
    mixed: mono.mixed,
    mix: mono.mix,
    channels: wave.channels,
    /** Every channel's own peak, before the mix. One entry on a mono file. */
    channelPeaks: peaks,
    /** The loudest channel, which is what `peak` is compared against. */
    channelPeak: widest,
    /**
     * Anti phase channels average to silence: `peak` 0 on a loud file. This says the mix cancelled.
     * why: lessons/kit-circuit-sample.md#cancelled
     */
    cancelled: peak === 0 && widest > 0,
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
    // The loudest channel's peak beside the mix peak; equal on mono, different on a wide file.
    // why: lessons/kit-circuit-sample.md#chanpeak
    chanPeak: c.ok ? round(c.channelPeak, 4) : null,
    mixed: c.ok ? c.mixed : null,
    cancelled: c.ok ? c.cancelled : null,
    rms: c.ok ? round(c.rms, 4) : null,
    silent: c.ok ? c.silent : null,
    lead: c.ok ? c.leadingZeros : null,
    trail: c.ok ? c.trailingZeros : null,
    sound: c.ok ? round(c.soundShare * 100, 1) : null,
    why: c.ok ? '' : c.why,
  };
}

/**
 * The totals a page shows above a table of 64 rows. A refused file is counted, not dropped.
 * why: lessons/kit-circuit-sample.md#summariseall
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
    // How many had to be mixed down.
    // why: lessons/kit-circuit-sample.md#mixed
    mixed: good.filter((w) => w.channels > 1).length,
  };
}

/**
 * The samples out of an open pack's zip entries, shared by the pages that open packs.
 * Ordered by slot number, not name. Unparsable files keep their place with a reason.
 * Reads the entries, never `index.json`: a manifest can list 128 samples a zip does not hold.
 * @param {{name:string,size:number,read:()=>Promise<Uint8Array>}[]} entries whatever `readZip()` returned
 * @returns {Promise<{name:string,size:number,wave:object,row:object}[]>}
 * why: lessons/kit-circuit-sample.md#samplesin
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

// The other container: a `.circuitpack` that is not a zip is a SysEx stream, told by byte 0.
// why: lessons/kit-circuit-sample.md#other-container

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
 * The first two bytes, and nothing else. An extension is not evidence: `50 4b` is a zip,
 * `f0` is a SysEx stream.
 * @param {ArrayBuffer|Uint8Array} buf
 * @returns {{kind:string, head:string, why:string}}
 * why: lessons/kit-circuit-sample.md#containerof
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
 * CRC32 over the unpacked payload: 36 of 36 streams here verify, 145 MB by four authors.
 * Plain JavaScript so it runs in a browser; the test grades it against `zlib.crc32`.
 * why: lessons/kit-circuit-sample.md#crc32
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
 * The six nibble field at bytes 8 to 13 of a stream start: `0x23B000` on all 24 sample streams,
 * `0x2E000` on all 12 session streams. What it means is unknown; the slot walker decides kind.
 * why: lessons/kit-circuit-sample.md#region-samples
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
 * Every logical stream in a file, verified against its declared length and checksum.
 * Splits on `0x77`/`0x7a` before unpacking (one run read 141 sessions where there are 33).
 * A stream failing its checksum is refused. Carrier length is not asserted.
 * @param {ArrayBuffer|Uint8Array} buf
 * why: lessons/kit-circuit-sample.md#streamsin
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
 * The rates a slot walk accepts. Every slot measured is 48,000 Hz, and a
 * Circuit slot is 48 kHz. It is also the sync check that stops the walker
 * finding a table in noise.
 */
export const SLOT_RATES = [48000];
/**
 * The slot walker's own depth list, apart from `DEPTHS`: it is a sync check, 16 bit on all
 * 1,536 Circuit slots measured, and widening it would find tables in noise.
 * why: lessons/kit-circuit-sample.md#slot-depths
 */
export const SLOT_DEPTHS = [16];
/**
 * The slot header has no channel count; 1 is an assumption, corroborated by 64 of 64 pack WAVs
 * being 48 kHz 16 bit mono. A slot wave carries `channelsFromHeader: false`.
 * why: lessons/kit-circuit-sample.md#slot-channels
 */
export const SLOT_CHANNELS = 1;
/** What `slotWave()` puts in `from`, so a slot model is never mistaken for a file. */
export const SLOT_SOURCE = 'sample slot';

/**
 * Walk the unpacked image as 64 variable length records (`80 bb 00 00` occurs exactly 64 times,
 * every gap is length + 10). Refuses the whole image on a lost table, naming slot and byte.
 * @param {ArrayBuffer|Uint8Array} plain  a VERIFIED stream's unpacked payload
 * why: lessons/kit-circuit-sample.md#slotsin
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
    if (!SLOT_DEPTHS.includes(bits)) {
      return no(`slot ${i} at offset ${p} declares ${bits} bit and ${SLOT_DEPTHS.join(' and ')} is the only `
        + 'depth a Circuit slot has ever been measured at', { slots, read: i });
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
  // The zero tail after the last slot is reported, not refused: the image is fixed size.
  // why: lessons/kit-circuit-sample.md#tail
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
 * One slot as the model `readWave()` returns, so `toMono()`, `content()` and `summarise()` read it.
 * Builds a model, not a RIFF file, so this module writes no bytes. Header agreements are `null`.
 * @param {ArrayBuffer|Uint8Array} plain  the image the slot was walked out of
 * @param {object} slot  one entry from `slotsIn().slots`
 * why: lessons/kit-circuit-sample.md#slotwave
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
    framesDeclared: frames,
    framesClamped: false,
    decodable: shapeFault(slot.bits, SLOT_CHANNELS) === '',
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
 * Bytes in, the same `{name, size, wave, row}` rows `samplesIn()` returns: container, streams,
 * verification, then audio. Unpacked images (7.5 MB) are dropped from the result.
 * @param {ArrayBuffer|Uint8Array} buf  a whole file
 * why: lessons/kit-circuit-sample.md#samplesetin
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

  // The name carries the stream only when there is more than one.
  // why: lessons/kit-circuit-sample.md#names
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
