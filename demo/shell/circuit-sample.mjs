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
