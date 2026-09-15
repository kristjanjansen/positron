// demo/shell/mp3-frames.mjs — where one audio frame ends and the next begins.
//
// TWO FRAMINGS, ONE JOB. MPEG audio (Layer III, every Icecast `audio/mpeg`
// mount) and ADTS (every Icecast `audio/aac` mount). They share a sync word and
// nothing else, and the ONE bit that separates them is the pair of layer bits:
// MPEG audio never writes `00` there because it is the reserved layer, and ADTS
// always writes `00` because AAC has no layers. Everything below hangs off that.
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

// Layer III only — that is what every Icecast `audio/mpeg` mount is.
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
 * `channel_configuration` -> channels. Index 0 means "the channel count is in
 * the AudioSpecificConfig", which an ADTS frame does not carry — so it is
 * REJECTED rather than guessed at.
 *
 * 🔴 A CHANNEL COUNT CANNOT BE INFERRED FROM A PAYLOAD (CLAUDE.md). Guessing
 * stereo for a mono stream plays it an octave down, which sounds like a broken
 * instrument rather than a broken header. If the frame will not say, this is
 * not a frame we can use.
 */
const ADTS_CHANNELS = [0, 1, 2, 3, 4, 5, 6, 8];

/**
 * Read an ADTS (AAC) frame header at `i`, or return null when there is not one
 * there. Same shape as `readHeader` above, so one caller can hold either.
 *
 * ⚠️ THE SAME SYNC WORD AS MPEG AUDIO, AND THE SAME WARNING APPLIES. Twelve set
 * bits occur in arbitrary data about once every 4 KB, so every field is checked
 * — a reserved sample rate, a channel configuration of 0, a length shorter than
 * the header itself — and callers confirm a candidate by checking that another
 * header sits at `i + length` (see `frameStarts`).
 *
 * The layout, which is why the shifts below are what they are. Bit 0 is the top
 * bit of byte 0:
 *
 *   0..11   syncword, all ones
 *   12      MPEG version, 0 = MPEG-4, 1 = MPEG-2. Not validated: both are legal.
 *   13..14  layer, ALWAYS 00. This is what distinguishes ADTS from MPEG audio.
 *   15      protection_absent. 0 means a 2-byte CRC follows the 7-byte header.
 *   16..17  profile, the audio object type minus one
 *   18..21  sampling_frequency_index
 *   22      private
 *   23..25  channel_configuration
 *   26..29  original, home, copyright id, copyright start
 *   30..42  aac_frame_length, INCLUDING the header and any CRC
 *   43..53  adts_buffer_fullness
 *   54..55  number_of_raw_data_blocks_in_frame, minus one
 */
export function readAdtsHeader(b, i) {
  // Seven bytes, because `number_of_raw_data_blocks` lives in the last of them
  // and the sample count depends on it.
  if (i + 7 > b.length) return null;
  // 🔴 ONE MASK FOR SYNC AND LAYER TOGETHER. `0xf6` is the top four sync bits
  // plus the two layer bits; the version bit at `0x08` and `protection_absent`
  // at `0x01` are left free because both values are legal. Requiring the layer
  // bits to be 00 here is the whole of the format discrimination: `readHeader`
  // above requires them to be 01, so no byte pair can satisfy both.
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
    // ⚠️ AAC HAS NO BITRATE FIELD, so this is THIS FRAME's rate rather than the
    // stream's. AAC is variable rate by nature, so it wobbles frame to frame
    // and only means something averaged. It is here because callers log it.
    bitrate: Math.round((length * 8 * sampleRate) / samplesPerFrame),
    // `mp4a.40.2` for LC, which is what every Icecast AAC mount measured here
    // sends. Derived rather than hard-coded: a Main or LTP stream configures a
    // decoder differently and must not be quietly told it is LC.
    codec: `mp4a.40.${profile + 1}`,
    crc: !protectionAbsent,
  };
}

/**
 * The two framings, by name. `read` is the header parser, `min` is how many
 * bytes it needs before it can say anything, and `types` are the `content-type`
 * values an Icecast mount serves them under.
 *
 * 🔴 `min` IS NOT DECORATION AND LEAVING IT OUT COST A WHOLE STREAM. `frameStarts`
 * used to bound its walk at a hard-coded 4, which is the MPEG header size, and
 * it advances by ONE BYTE whenever the reader says no. An ADTS reader says no to
 * anything under seven bytes — so on a socket delivering small chunks the walk
 * chewed through the sync byte three bytes before it could have been read, every
 * time, and the splitter returned **0 frames from 120 KB of a stream it had
 * correctly identified**. MEASURED at one-byte chunks, which is where it is
 * total; at seven it was 82 frames of a possible 129, which is the same bug
 * quietly losing a third of the audio.
 */
export const FRAMINGS = {
  mpeg: { read: readHeader, min: 4, types: ['audio/mpeg', 'audio/mp3', 'audio/mpeg3', 'audio/x-mpeg'] },
  adts: { read: readAdtsHeader, min: 7, types: ['audio/aac', 'audio/aacp', 'audio/x-aac', 'audio/x-hx-aac-adts'] },
};

/**
 * Which framing a `content-type` names, or null when it names neither.
 *
 * 🔴 A URL IS THE WRONG THING TO BRANCH ON and this project has paid for that
 * twice — `canPlayType` answering "maybe" in two browsers, and an `.mp3` suffix
 * on a path that carried something else. The response says what it is sending.
 * A null answer is an honest "this header did not say", which `createFrameSplitter`
 * turns into a look at the bytes rather than into a default.
 */
export function framingFor(contentType) {
  const t = String(contentType || '').split(';')[0].trim().toLowerCase();
  if (!t) return null;
  for (const [name, f] of Object.entries(FRAMINGS)) if (f.types.includes(t)) return name;
  return null;
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
 * stream cleanly and emitting one burst of noise. MEASURED over real captures:
 * without it the MPEG reader finds 67 frames in a megabyte of AAC and the ADTS
 * reader finds 32 in 300 KB of MP3. With it both find zero.
 *
 * `framing` picks the reader. It defaults to `mpeg`, which is what every caller
 * wanted before there was a choice.
 */
export function frameStarts(bytes, from = 0, { confirm = true, final = false, framing = 'mpeg' } = {}) {
  const { read, min } = FRAMINGS[framing] || FRAMINGS.mpeg;
  const frames = [];
  let i = from;
  // ⚠️ `min`, NEVER A CONSTANT. See the note on FRAMINGS: a walk that steps past
  // bytes its own reader was never given enough of cannot find the frame that
  // starts in them, and it looks exactly like a stream with no frames in it.
  while (i + min <= bytes.length) {
    const h = read(bytes, i);
    if (!h) { i++; continue; }
    if (confirm) {
      const next = i + h.length;
      // Not enough bytes to confirm yet. A SOCKET caller must stop and bring
      // more — guessing here is a click in the output — but a caller holding a
      // COMPLETE buffer has no more to bring, and refusing its last frame would
      // silently drop one frame from every finite decode. `final` is that
      // distinction, and it has to be the caller's to make: this function
      // cannot tell a short read from the end of a file.
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
 * A stateful splitter for a socket: feed it chunks, get whole frames out.
 * Keeps the straddling tail itself so no caller has to remember to.
 *
 * @param {{framing?: 'mpeg'|'adts'|null}} opts
 *   `framing` is what the response's `content-type` said. Leave it out, or pass
 *   null, when the header said nothing recognisable: the splitter then tries
 *   both readers on the arriving bytes and LATCHES the one that syncs.
 *
 * ⚠️ THE SNIFF IS A FALLBACK, NOT THE POLICY. When a `content-type` is present
 * and understood it decides, because that is the sender answering the question.
 * The sniff exists so that an unlabelled mount plays rather than silently
 * producing nothing, which is what a default would do — and a default is the
 * worse failure, because the page goes on reporting bytes arriving while not
 * one sample comes out.
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
        // ⚠️ CONFIRMED FRAMES ONLY, AND THE BEST OF THE TWO RATHER THAN THE
        // FIRST. A single confirmed hit is already vanishingly unlikely to be
        // chance, but taking whichever reader found MORE of them costs nothing
        // and cannot be fooled by one coincidence in a stream of the other kind.
        for (const name of Object.keys(FRAMINGS)) {
          const r = frameStarts(buf, 0, { confirm: true, framing: name });
          if (!got || r.frames.length > got.frames.length) { got = r; kind = r.frames.length ? name : null; }
        }
        if (!kind) {
          // Nothing recognisable yet, so bring more bytes — but BOUNDED. An
          // endless stream of something neither reader understands would
          // otherwise be held in memory in its entirety, for ever. The longest
          // frame either format can write is 8191 bytes, so 32 KiB is four of
          // them plus room to confirm a fifth.
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
