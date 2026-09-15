// demo/shell/mp3-frames.mjs — where one MP3 frame ends and the next begins.
//
// 🔴 WHY A PAGE HERE NEEDS THIS AT ALL. `/radio1965/` played an Icecast mount
// through an `<audio>` element and tapped it with `createMediaElementSource`.
// MEASURED on an iPhone (iOS 18.7, Safari 26.6.1): the element plays, the
// AudioContext runs, and the analyser reads **0.0000 on every line for the whole
// run** — while a 440 Hz oscillator through the SAME analyser reads 0.33–0.80.
// The graph can hear; WebKit simply does not route that element into it. So the
// bytes have to be decoded by the page instead of by the element, and every way
// of doing that wants frames:
//
//   - `AudioDecoder` (WebCodecs) takes ONE `EncodedAudioChunk` per frame.
//   - `decodeAudioData` will only accept a buffer that STARTS on a frame sync,
//     so chunking a stream for it means knowing where the syncs are.
//
// ⚠️ IT IS A SCANNER, NOT A DECODER. It reads headers and reports lengths; it
// never touches the audio payload. That is the whole reason it can be written
// here rather than vendored — the subject is "where are the boundaries", which
// is forty lines of table lookup, not "turn MPEG audio into samples", which is
// somebody else's life's work. If this file ever starts wanting to decode, that
// is the signal to take a library instead (LAYOUT.md).

// Layer III only — that is what every Icecast MP3 mount is.
const BITRATES_V1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
const BITRATES_V2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0];
const RATES = {
  3: [44100, 48000, 32000, 0],   // MPEG 1
  2: [22050, 24000, 16000, 0],   // MPEG 2
  0: [11025, 12000, 8000, 0],    // MPEG 2.5
};

/**
 * Read a frame header at `i`, or return null when there is not one there.
 *
 * ⚠️ A SYNC WORD IS NOT A FRAME. Eleven set bits occur in ordinary audio data
 * about once every 2 KB by chance, so every field is validated — a reserved
 * version, a non-Layer-III layer, a `free` or `bad` bitrate index and a reserved
 * sample rate all mean this was not a header. Callers confirm a candidate by
 * checking that a header also sits at `i + length` (see `frameStarts`), which is
 * what makes a false positive vanishingly unlikely rather than merely unlikely.
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
  // MPEG1 Layer III carries 1152 samples a frame, MPEG2/2.5 carry 576 — and the
  // frame LENGTH formula halves with it. Getting this pair wrong desynchronises
  // after one frame rather than failing outright, which is why both come from
  // the same branch.
  const samplesPerFrame = mpeg1 ? 1152 : 576;
  const length = Math.floor((samplesPerFrame / 8) * bitrate / sampleRate) + padding;
  if (length < 24) return null;
  return {
    length, sampleRate, bitrate, samplesPerFrame,
    channels: channelMode === 3 ? 1 : 2,
    mpeg1, padding,
  };
}

/**
 * Walk `bytes` from `from`, returning every frame found and where it stopped.
 *
 * `end` is the offset of the first byte NOT consumed — a caller streaming from
 * a socket keeps the tail and prepends it to the next read, because a frame
 * almost always straddles a chunk boundary. (`icy.mjs` carries the same caveat
 * for the same reason, and its test drives one-byte chunks to prove it.)
 *
 * ⚠️ `confirm` IS WHAT MAKES THIS RELIABLE ON A RESYNC. A lone valid-looking
 * header is accepted only if another header sits exactly one frame later, so
 * random audio bytes that happen to look like a sync are rejected. It costs one
 * extra header read per frame and it is the difference between joining a live
 * stream cleanly and emitting one burst of noise.
 */
export function frameStarts(bytes, from = 0, { confirm = true, final = false } = {}) {
  const frames = [];
  let i = from;
  while (i + 4 <= bytes.length) {
    const h = readHeader(bytes, i);
    if (!h) { i++; continue; }
    if (confirm) {
      const next = i + h.length;
      // Not enough bytes to confirm yet. A SOCKET caller must stop and bring
      // more — guessing here is a click in the output — but a caller holding a
      // COMPLETE buffer has no more to bring, and refusing its last frame would
      // silently drop one frame from every finite decode. `final` is that
      // distinction, and it has to be the caller's to make: this function
      // cannot tell a short read from the end of a file.
      if (next + 4 > bytes.length) {
        if (final && i + h.length <= bytes.length) { frames.push({ at: i, ...h }); i += h.length; }
        break;
      }
      if (!readHeader(bytes, next)) { i++; continue; }
    }
    if (i + h.length > bytes.length) break;
    frames.push({ at: i, ...h });
    i += h.length;
  }
  return { frames, end: i };
}

/**
 * A stateful splitter for a socket: feed it chunks, get whole frames out.
 * Keeps the straddling tail itself so no caller has to remember to.
 */
export function createFrameSplitter() {
  let tail = new Uint8Array(0);
  let synced = false;
  return {
    /** @returns {Array<{bytes: Uint8Array, sampleRate: number, samplesPerFrame: number, channels: number}>} */
    push(chunk) {
      const buf = new Uint8Array(tail.length + chunk.length);
      buf.set(tail, 0); buf.set(chunk, tail.length);
      // Once in sync, frames are back to back, so confirmation is only needed
      // while hunting for the first one. Keeping it on for ever would stall the
      // last frame of every read waiting for a successor that has not arrived.
      const { frames, end } = frameStarts(buf, 0, { confirm: !synced });
      if (frames.length) synced = true;
      tail = buf.slice(end);
      return frames.map((f) => ({
        bytes: buf.subarray(f.at, f.at + f.length),
        sampleRate: f.sampleRate,
        samplesPerFrame: f.samplesPerFrame,
        channels: f.channels,
        bitrate: f.bitrate,
      }));
    },
    get pending() { return tail.length; },
    get synced() { return synced; },
  };
}
