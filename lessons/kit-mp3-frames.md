# Kit lessons: mp3-frames.mjs, mp3-frames-test.mjs

The long comments cut from `demo/shell/mp3-frames.mjs` and `demo/shell/mp3-frames-test.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-mp3-frames.md#<anchor>`.

<a id="header"></a>

## mp3-frames.mjs, file header

demo/shell/mp3-frames.mjs — where one audio frame ends and the next begins.

TWO FRAMINGS, ONE JOB. MPEG audio (Layer III, every Icecast `audio/mpeg`
mount) and ADTS (every Icecast `audio/aac` mount). They share a sync word and
nothing else, and the ONE bit that separates them is the pair of layer bits:
MPEG audio never writes `00` there because it is the reserved layer, and ADTS
always writes `00` because AAC has no layers. Everything below hangs off that.

🔴 WHY A PAGE HERE NEEDS THIS AT ALL. `/archive/radio/` played an Icecast mount
through an `<audio>` element and tapped it with `createMediaElementSource`.
MEASURED on an iPhone (iOS 18.7, Safari 26.6.1): the element plays, the
AudioContext runs, and the analyser reads **0.0000 on every line for the whole
run** — while a 440 Hz oscillator through the SAME analyser reads 0.33–0.80.
The graph can hear; WebKit simply does not route that element into it. So the
bytes have to be decoded by the page instead of by the element, and every way
of doing that wants frames:

  - `AudioDecoder` (WebCodecs) takes ONE `EncodedAudioChunk` per frame.
  - `decodeAudioData` will only accept a buffer that STARTS on a frame sync,
    so chunking a stream for it means knowing where the syncs are.

⚠️ IT IS A SCANNER, NOT A DECODER. It reads headers and reports lengths; it
never touches the audio payload. That is the whole reason it can be written
here rather than vendored — the subject is "where are the boundaries", which
is forty lines of table lookup, not "turn MPEG audio into samples", which is
somebody else's life's work. If this file ever starts wanting to decode, that
is the signal to take a library instead (LAYOUT.md).

<a id="read-header"></a>

## mp3-frames.mjs, readHeader

Read a frame header at `i`, or return null when there is not one there.

⚠️ A SYNC WORD IS NOT A FRAME. Eleven set bits occur in ordinary audio data
about once every 2 KB by chance, so every field is validated — a reserved
version, a non-Layer-III layer, a `free` or `bad` bitrate index and a reserved
sample rate all mean this was not a header. Callers confirm a candidate by
checking that a header also sits at `i + length` (see `frameStarts`), which is
what makes a false positive vanishingly unlikely rather than merely unlikely.

<a id="samples-per-frame"></a>

## mp3-frames.mjs, readHeader, samplesPerFrame

MPEG1 Layer III carries 1152 samples a frame, MPEG2/2.5 carry 576 — and the
frame LENGTH formula halves with it. Getting this pair wrong desynchronises
after one frame rather than failing outright, which is why both come from
the same branch.

<a id="adts-channels"></a>

## mp3-frames.mjs, ADTS_CHANNELS

`channel_configuration` -> channels. Index 0 means "the channel count is in
the AudioSpecificConfig", which an ADTS frame does not carry — so it is
REJECTED rather than guessed at.

🔴 A CHANNEL COUNT CANNOT BE INFERRED FROM A PAYLOAD (CLAUDE.md). Guessing
stereo for a mono stream plays it an octave down, which sounds like a broken
instrument rather than a broken header. If the frame will not say, this is
not a frame we can use.

<a id="read-adts-header"></a>

## mp3-frames.mjs, readAdtsHeader

Read an ADTS (AAC) frame header at `i`, or return null when there is not one
there. Same shape as `readHeader` above, so one caller can hold either.

⚠️ THE SAME SYNC WORD AS MPEG AUDIO, AND THE SAME WARNING APPLIES. Twelve set
bits occur in arbitrary data about once every 4 KB, so every field is checked
— a reserved sample rate, a channel configuration of 0, a length shorter than
the header itself — and callers confirm a candidate by checking that another
header sits at `i + length` (see `frameStarts`).

The layout, which is why the shifts below are what they are. Bit 0 is the top
bit of byte 0:

 0..11   syncword, all ones
 12      MPEG version, 0 = MPEG-4, 1 = MPEG-2. Not validated: both are legal.
 13..14  layer, ALWAYS 00. This is what distinguishes ADTS from MPEG audio.
 15      protection_absent. 0 means a 2-byte CRC follows the 7-byte header.
 16..17  profile, the audio object type minus one
 18..21  sampling_frequency_index
 22      private
 23..25  channel_configuration
 26..29  original, home, copyright id, copyright start
 30..42  aac_frame_length, INCLUDING the header and any CRC
 43..53  adts_buffer_fullness
 54..55  number_of_raw_data_blocks_in_frame, minus one

<a id="sync-layer-mask"></a>

## mp3-frames.mjs, readAdtsHeader, the sync and layer mask

🔴 ONE MASK FOR SYNC AND LAYER TOGETHER. `0xf6` is the top four sync bits
plus the two layer bits; the version bit at `0x08` and `protection_absent`
at `0x01` are left free because both values are legal. Requiring the layer
bits to be 00 here is the whole of the format discrimination: `readHeader`
above requires them to be 01, so no byte pair can satisfy both.

<a id="adts-bitrate"></a>

## mp3-frames.mjs, readAdtsHeader, bitrate

⚠️ AAC HAS NO BITRATE FIELD, so this is THIS FRAME's rate rather than the
stream's. AAC is variable rate by nature, so it wobbles frame to frame
and only means something averaged. It is here because callers log it.

<a id="framings"></a>

## mp3-frames.mjs, FRAMINGS

The two framings, by name. `read` is the header parser, `min` is how many
bytes it needs before it can say anything, and `types` are the `content-type`
values an Icecast mount serves them under.

🔴 `min` IS NOT DECORATION AND LEAVING IT OUT COST A WHOLE STREAM. `frameStarts`
used to bound its walk at a hard-coded 4, which is the MPEG header size, and
it advances by ONE BYTE whenever the reader says no. An ADTS reader says no to
anything under seven bytes — so on a socket delivering small chunks the walk
chewed through the sync byte three bytes before it could have been read, every
time, and the splitter returned **0 frames from 120 KB of a stream it had
correctly identified**. MEASURED at one-byte chunks, which is where it is
total; at seven it was 82 frames of a possible 129, which is the same bug
quietly losing a third of the audio.

<a id="framing-for"></a>

## mp3-frames.mjs, framingFor

Which framing a `content-type` names, or null when it names neither.

🔴 A URL IS THE WRONG THING TO BRANCH ON and this project has paid for that
twice — `canPlayType` answering "maybe" in two browsers, and an `.mp3` suffix
on a path that carried something else. The response says what it is sending.
A null answer is an honest "this header did not say", which `createFrameSplitter`
turns into a look at the bytes rather than into a default.

<a id="frame-starts"></a>

## mp3-frames.mjs, frameStarts

Walk `bytes` from `from`, returning every frame found and where it stopped.

`end` is the offset of the first byte NOT consumed — a caller streaming from
a socket keeps the tail and prepends it to the next read, because a frame
almost always straddles a chunk boundary. (`icy.mjs` carries the same caveat
for the same reason, and its test drives one-byte chunks to prove it.)

⚠️ `confirm` IS WHAT MAKES THIS RELIABLE ON A RESYNC. A lone valid-looking
header is accepted only if another header sits exactly one frame later, so
random audio bytes that happen to look like a sync are rejected. It costs one
extra header read per frame and it is the difference between joining a live
stream cleanly and emitting one burst of noise. MEASURED over real captures:
without it the MPEG reader finds 67 frames in a megabyte of AAC and the ADTS
reader finds 32 in 300 KB of MP3. With it both find zero.

`framing` picks the reader. It defaults to `mpeg`, which is what every caller
wanted before there was a choice.

<a id="min-not-constant"></a>

## mp3-frames.mjs, frameStarts, the walk bound

⚠️ `min`, NEVER A CONSTANT. See the note on FRAMINGS: a walk that steps past
bytes its own reader was never given enough of cannot find the frame that
starts in them, and it looks exactly like a stream with no frames in it.

<a id="final"></a>

## mp3-frames.mjs, frameStarts, final

Not enough bytes to confirm yet. A SOCKET caller must stop and bring
more — guessing here is a click in the output — but a caller holding a
COMPLETE buffer has no more to bring, and refusing its last frame would
silently drop one frame from every finite decode. `final` is that
distinction, and it has to be the caller's to make: this function
cannot tell a short read from the end of a file.

<a id="create-frame-splitter"></a>

## mp3-frames.mjs, createFrameSplitter

A stateful splitter for a socket: feed it chunks, get whole frames out.
Keeps the straddling tail itself so no caller has to remember to.

@param {{framing?: 'mpeg'|'adts'|null}} opts
 `framing` is what the response's `content-type` said. Leave it out, or pass
 null, when the header said nothing recognisable: the splitter then tries
 both readers on the arriving bytes and LATCHES the one that syncs.

⚠️ THE SNIFF IS A FALLBACK, NOT THE POLICY. When a `content-type` is present
and understood it decides, because that is the sender answering the question.
The sniff exists so that an unlabelled mount plays rather than silently
producing nothing, which is what a default would do — and a default is the
worse failure, because the page goes on reporting bytes arriving while not
one sample comes out.

<a id="sniff-best"></a>

## mp3-frames.mjs, createFrameSplitter, sniff

⚠️ CONFIRMED FRAMES ONLY, AND THE BEST OF THE TWO RATHER THAN THE
FIRST. A single confirmed hit is already vanishingly unlikely to be
chance, but taking whichever reader found MORE of them costs nothing
and cannot be fooled by one coincidence in a stream of the other kind.

<a id="sniff-bound"></a>

## mp3-frames.mjs, createFrameSplitter, bounded tail

Nothing recognisable yet, so bring more bytes — but BOUNDED. An
endless stream of something neither reader understands would
otherwise be held in memory in its entirety, for ever. The longest
frame either format can write is 8191 bytes, so 32 KiB is four of
them plus room to confirm a fifth.

<a id="from-first-frame"></a>

## mp3-frames.mjs, fromFirstFrame

The same bytes from their first confirmed frame on, for `decodeAudioData`.

🔴 SAFARI REFUSES A FILE THAT DOES NOT START ON A FRAME, AND A RECORDING CUT
FROM A LIVE MOUNT NEVER DOES. Reported 2026-10-13 from an iPhone on the
granulator: *"Raadio 2 recording did not open: Decoding failed"*. MEASURED
the same day in desktop Safari 27 against our own bucket: Raadio 2 starts
with 127 bytes of the middle of a frame and Raadio 4 with 120, because both
were captured by joining an Icecast mount mid stream; `decodeAudioData`
answered `Decoding failed` on both as fetched and decoded both whole once cut
at the first frame (183.20 s and 183.04 s). Chrome and ffmpeg skip the junk
themselves, which is why nothing here ever saw it. The Ida ADTS file starts
on a frame and is handed back untouched.
⚠️ THE FRAMING IS READ OFF THE BYTES, NOT THE URL OR THE TYPE, which is the
rule at `framingFor`: whichever reader confirms a frame first wins, and a
buffer neither reader can sync on is returned as it came, so a WAV, an Ogg
or an MP4 still reaches the decoder and gets its own answer.
⚠️ AN ID3 TAG IS NOT JUNK AND IS KEPT. A file that opens `ID3` is a tagged
MP3 every decoder knows how to skip, and cutting into it would be cutting
into a file that was never broken.

@param {ArrayBuffer} ab
@param {number} [scan] how far into the file to look for the first frame
@returns {{ buffer: ArrayBuffer, skipped: number, framing: string|null }}

<a id="test-header"></a>

## mp3-frames-test.mjs, file header

demo/shell/mp3-frames-test.mjs — node demo/shell/mp3-frames-test.mjs

Frame boundaries are the one thing the whole decode path stands on: get a
length wrong by a byte and every later frame is garbage, which presents as
"the stream is broken" rather than "the scanner is". So this drives the
splitter at fourteen chunk sizes down to ONE BYTE — the case where a header
straddles two reads and a naive scanner silently drops a frame — the way
`icy-test.mjs` does for the metadata demuxer, and for the same reason.

⚠️ THE FIXTURE IS SYNTHESISED, NOT A RECORDING. No media is stored in this
repo (LAYOUT.md), and a real MP3 would make this test about one file. Headers
are built from the spec and the payload is filler — this scanner never reads
the payload, so filler exercises it exactly as real audio does, with one
exception that is tested on purpose: filler that happens to contain a sync
word.

There is also a LIVE arm against the relay, which SKIPS cleanly when the
network is not there — a check nobody can run is a check nobody runs.

<a id="test-chunked"></a>

## mp3-frames-test.mjs, chunked, down to one byte

── 🔴 CHUNKED, DOWN TO ONE BYTE ──────────────────────────────────────────
The case a naive scanner drops silently: a four-byte header split across two
reads. If any size loses a frame, the arithmetic downstream is wrong for ever
after and the sound is noise.

<a id="test-streaming-defers"></a>

## mp3-frames-test.mjs, the streaming path defers its last frame

...and the STREAMING path has to do it too, which is the one a listener uses.
⚠️ AND THE STREAMING PATH DEFERS ITS LAST FRAME RATHER THAN LOSING IT, which
is worth pinning because the two numbers look like a bug. `synced` is only set
AFTER the first scan returns, so that whole first push still runs with
confirmation on and holds the trailing frame back for want of a successor. It
is not dropped — it is in the tail, and the next push emits it. Over a socket
this is invisible; in a single-shot test it is the difference between 8 and 9.

<a id="test-sabotage"></a>

## mp3-frames-test.mjs, sabotage, filler with a sync word

── 🔴 SABOTAGE, or the checks above are decoration ───────────────────────
Filler that CONTAINS a sync word. `confirm` is the only thing standing
between this and a frame invented inside the audio payload.

<a id="test-crc"></a>

## mp3-frames-test.mjs, the CRC minimum length

🔴 THE CRC CASE CHANGES THE MINIMUM LENGTH, so a frame shorter than its own
header must be refused whichever of the two headers it claims to have.

<a id="test-control"></a>

## mp3-frames-test.mjs, the control

── 🔴 THE CONTROL, AND IT IS THE POINT ───────────────────────────────────
Two scanners that both accept both streams have said nothing. Each must find
its own framing and find NOTHING in the other's.

<a id="test-adts-chunked"></a>

## mp3-frames-test.mjs, ADTS chunked down to one byte

🔴 CHUNKED DOWN TO ONE BYTE, AND THIS ONE CAUGHT A REAL BUG. `frameStarts`
bounded its walk at a hard-coded 4 — the MPEG header size — and steps forward
one byte whenever the reader says no. An ADTS reader says no to anything under
seven bytes, so the walk ate the sync byte three bytes before it could be
read: 0 frames out of a stream it had correctly identified, at one-byte
chunks, and a third of them lost at seven.

<a id="test-live"></a>

## mp3-frames-test.mjs, the live arm

── the live arm, skipped when the network is not there ───────────────────
⚠️ A LIST, NOT ONE MOUNT. A single hard-coded station makes this arm skip for
a reason that is about that station rather than about the network, and a skip
is indistinguishable from a pass at a glance. MEASURED 2026-09-15: three of
ERR's five mounts answered the relay 502 while two served 200.

<a id="test-live-other"></a>

## mp3-frames-test.mjs, the live arm, the other scanner

🔴 AND THE OTHER SCANNER MUST FIND NOTHING IN IT. This is the control that
an A/B sharing one bug cannot give: both arms are real bytes off a real
station, and each is refused by the reader that is not for it.
